import { app } from "../../scripts/app.js";

// Utility to fetch wildcards from our python backend
async function fetchWildcards() {
    try {
        const response = await fetch("/my_utils/wildcards");
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Failed to fetch wildcards", e);
        return [];
    }
}

// Simple Autocomplete UI
class AutocompletePopup {
    constructor() {
        this.element = document.createElement("div");
        Object.assign(this.element.style, {
            position: "absolute",
            display: "none",
            backgroundColor: "#222",
            border: "1px solid #444",
            zIndex: "10000",
            maxHeight: "200px",
            overflowY: "auto",
            width: "400px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
        });
        document.body.appendChild(this.element);

        this.visible = false;
        this.selectedIndex = 0;
        this.items = [];
        this.targetWidget = null;
        this.triggerPos = 0;
    }

    show(items, x, y, widget, triggerPos) {
        this.items = items;
        this.targetWidget = widget;
        this.triggerPos = triggerPos;
        this.selectedIndex = 0;

        this.element.innerHTML = "";

        // Close Button
        const closeBtn = document.createElement("div");
        closeBtn.textContent = "×";
        Object.assign(closeBtn.style, {
            position: "absolute",
            top: "0",
            right: "0",
            color: "#888",
            cursor: "pointer",
            padding: "2px 6px",
            fontSize: "14px",
            fontWeight: "bold",
            zIndex: "10001",
            backgroundColor: "rgba(0,0,0,0.5)"
        });
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.hide();
        });
        closeBtn.addEventListener("mouseenter", () => closeBtn.style.color = "#fff");
        closeBtn.addEventListener("mouseleave", () => closeBtn.style.color = "#888");
        this.element.appendChild(closeBtn);

        items.forEach((item, idx) => {
            const div = document.createElement("div");
            div.textContent = item;
            div.style.padding = "4px 8px";
            div.style.cursor = "pointer";
            div.style.color = "#ddd";
            div.addEventListener("click", () => this.select(item));
            div.addEventListener("mouseenter", () => {
                this.selectedIndex = idx;
                this.render();
            });
            this.element.appendChild(div);
        });

        this.element.style.left = x + "px";
        this.element.style.top = y + "px";
        this.element.style.display = "block";
        this.visible = true;
        this.render();
    }

    hide() {
        this.element.style.display = "none";
        this.visible = false;
        this.targetWidget = null;
    }

    render() {
        Array.from(this.element.children).forEach((child, idx) => {
            child.style.backgroundColor = idx === this.selectedIndex ? "#444" : "transparent";
        });
    }

    select(value) {
        if (!this.targetWidget || !this.targetWidget.inputEl) return;

        const input = this.targetWidget.inputEl;
        const text = input.value;
        // const before = text.substring(0, this.triggerPos);
        const after = text.substring(input.selectionEnd);

        let endPos = input.selectionEnd;

        // Smart cleanup for comment syntax
        if (value.endsWith("*/")) {
            // If the user already typed "*/" after the cursor, consume it.
            if (after.trim().startsWith("*/")) {
                const offset = after.indexOf("*/");
                endPos += offset + 2;
            } else if (after.startsWith("*/")) {
                endPos += 2;
            }
        }

        // Append comma and space as requested, ensuring no double comma from source
        // const finalValue = value + ", "; // Conflict with AutocompletePlus Node
        input.setRangeText(value, this.triggerPos, endPos, "end");

        // Critical: Trigger updates
        input.dispatchEvent(new Event("input", { bubbles: true }));
        if (this.targetWidget.callback) {
            this.targetWidget.callback(input.value);
        }

        this.hide();
        input.focus();
    }
}

const autocomplete = new AutocompletePopup();
let wildcardsCache = [];

// Base Resolutions
const BASE_RESOLUTIONS = [
    [896, 1152],
    [832, 1216],
    [768, 1344],
    [640, 1536],
    [1024, 1536],
    [1024, 1024]
];

// Generate Presets (Forward + Reverses)
const SIZE_PRESETS = [];
BASE_RESOLUTIONS.forEach(([w, h]) => {
    SIZE_PRESETS.push(`/* size: ${w}x${h} */`);
    if (w !== h) {
        SIZE_PRESETS.push(`/* size: ${h}x${w} */`);
    }
});

app.registerExtension({
    name: "MyUtils.WildcardAutocomplete",
    async setup() {
        wildcardsCache = await fetchWildcards();
    },
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "TextJoiner") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                // Helper to attach to a widget
                const attachAutocomplete = (widget) => {
                    if (!widget.inputEl) return;

                    widget.inputEl.addEventListener("keydown", (e) => {
                        if (autocomplete.visible) {
                            if (e.key === "ArrowDown") {
                                e.preventDefault();
                                autocomplete.selectedIndex = (autocomplete.selectedIndex + 1) % autocomplete.items.length;
                                autocomplete.render();
                                return;
                            }
                            if (e.key === "ArrowUp") {
                                e.preventDefault();
                                autocomplete.selectedIndex = (autocomplete.selectedIndex - 1 + autocomplete.items.length) % autocomplete.items.length;
                                autocomplete.render();
                                return;
                            }
                            if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                const item = autocomplete.items[autocomplete.selectedIndex];
                                if (item) autocomplete.select(item);
                                return;
                            }
                            if (e.key === "Escape") {
                                e.preventDefault();
                                autocomplete.hide();
                                return;
                            }
                        }
                    });

                    widget.inputEl.addEventListener("input", (e) => {
                        const val = widget.inputEl.value;
                        const cursor = widget.inputEl.selectionStart;

                        // Check Triggers proximity
                        const lastWildcard = val.lastIndexOf("__", cursor);
                        const lastSize = val.lastIndexOf("/*", cursor);

                        // Pick the closest active trigger
                        let matches = [];
                        let triggerPos = -1;

                        // Check Size Trigger
                        // Must be closer than wildcard or wildcard not found
                        if (lastSize !== -1 && (lastWildcard === -1 || lastSize > lastWildcard) && (cursor - lastSize) < 20) {
                            // Size query logic
                            const query = val.substring(lastSize, cursor);
                            // Simple contains check or startswith based on query
                            // query starts with "/*", maybe "/* s", "/* size"...
                            matches = SIZE_PRESETS.filter(s => s.toLowerCase().startsWith(query.toLowerCase()));
                            triggerPos = lastSize;
                        }
                        // Check Wildcard Trigger
                        else if (lastWildcard !== -1 && (cursor - lastWildcard) < 50) {
                            const query = val.substring(lastWildcard, cursor);
                            matches = wildcardsCache.filter(w => w.toLowerCase().includes(query.toLowerCase()));
                            triggerPos = lastWildcard;
                        }

                        if (matches.length > 0) {
                            const rect = widget.inputEl.getBoundingClientRect();
                            autocomplete.show(
                                matches.slice(0, 20),
                                rect.left + 20,
                                rect.top + 20 + (widget.inputEl.clientHeight / 2),
                                widget,
                                triggerPos
                            );
                        } else {
                            autocomplete.hide();
                        }
                    });
                };

                node.attachAutocomplete = attachAutocomplete;

                if (node.widgets) {
                    node.widgets.forEach(w => {
                        if (w.name && w.name.startsWith("text_")) attachAutocomplete(w);
                    });
                }

                return r;
            }
        }
    }
});
