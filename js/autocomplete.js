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
            backgroundColor: "rgba(34, 34, 34, 0.9)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            zIndex: "10000",
            maxHeight: "200px",
            overflowY: "auto",
            width: "400px",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
        });
        document.body.appendChild(this.element);

        // Prevent the textarea from losing focus/selection when clicking on the popup
        this.element.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });

        this.visible = false;
        this.selectedIndex = 0;
        this.items = [];
        this.targetWidget = null;
        this.triggerPos = 0;
        this.triggerEndPos = null;
        this.mode = "normal"; // "normal" or "weight"
    }

    show(items, x, y, widget, triggerPos, mode = "normal", triggerEndPos = null) {
        this.items = items;
        this.targetWidget = widget;
        this.triggerPos = triggerPos;
        this.triggerEndPos = triggerEndPos;
        this.mode = mode;
        this.selectedIndex = 0;

        this.element.innerHTML = "";

        if (mode === "weight") {
            this.element.style.width = "100px";
        } else {
            this.element.style.width = "400px";
        }

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
            backgroundColor: "rgba(0,0,0,0.5)",
            borderBottomLeftRadius: "4px",
            borderTopRightRadius: "6px"
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
            Object.assign(div.style, {
                padding: "6px 12px",
                cursor: "pointer",
                color: "#ddd",
                transition: "background-color 0.1s ease, color 0.1s ease",
                fontFamily: "sans-serif",
                fontSize: "12px"
            });
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
        this.mode = "normal";
        this.triggerEndPos = null;
    }

    render() {
        // Skip the close button which is element.children[0]
        Array.from(this.element.children).forEach((child, idx) => {
            if (idx === 0) return; // skip closeBtn
            const itemIdx = idx - 1;
            child.style.backgroundColor = itemIdx === this.selectedIndex ? "rgba(255, 255, 255, 0.15)" : "transparent";
            child.style.color = itemIdx === this.selectedIndex ? "#fff" : "#ddd";
        });
    }

    select(value) {
        if (!this.targetWidget || !this.targetWidget.inputEl) return;

        const input = this.targetWidget.inputEl;
        const text = input.value;
        const startPos = this.triggerPos;
        let endPos = this.triggerEndPos !== null ? this.triggerEndPos : input.selectionEnd;

        if (this.mode === "weight") {
            const selectedText = text.substring(startPos, endPos);
            const leadingSpaces = selectedText.match(/^\s*/)[0];
            const trailingSpaces = selectedText.match(/\s*$/)[0];
            const trimmed = selectedText.trim();
            const match = trimmed.match(/^\((.+):([0-9.]+)\)$/);
            
            let baseText = trimmed;
            if (match) {
                baseText = match[1];
            }
            
            let replacement = "";
            if (value === "0") {
                replacement = leadingSpaces + baseText + trailingSpaces;
            } else {
                replacement = leadingSpaces + `(${baseText}:${value})` + trailingSpaces;
            }
            
            input.setRangeText(replacement, startPos, endPos, "end");
        } else {
            const after = text.substring(endPos);

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
            // Smart cleanup for wildcards
            else if (value.endsWith("__")) {
                // If the user already typed "__" after the cursor, consume it.
                if (after.startsWith("__")) {
                    endPos += 2;
                }
            }

            input.setRangeText(value, startPos, endPos, "end");
        }

        // Critical: Trigger updates
        input.dispatchEvent(new Event("input", { bubbles: true }));
        if (this.targetWidget && this.targetWidget.callback) {
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
    [1024, 1024],
    [1024, 1536],
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
                        const lastWildcard = val.lastIndexOf("__", cursor - 1);
                        const lastSize = val.lastIndexOf("/*", cursor - 1);

                        // Pick the closest active trigger
                        let matches = [];
                        let triggerPos = -1;

                        // Check Size Trigger
                        // Must be closer than wildcard or wildcard not found
                        if (lastSize !== -1 && cursor >= lastSize + 2 && (lastWildcard === -1 || lastSize > lastWildcard) && (cursor - lastSize) < 20) {
                            // Size query logic
                            let query = val.substring(lastSize + 2, cursor).trimStart().toLowerCase();
                            // If user types "size: 1024", treat it as "1024" for broader matching
                            if (query.startsWith("size:")) query = query.substring(5).trimStart();

                            matches = SIZE_PRESETS.filter(s => {
                                let content = s.slice(2, -2).trim().toLowerCase(); // Strip "/*" and "*/"
                                if (content.startsWith("size:")) content = content.substring(5).trimStart();
                                return content.includes(query);
                            });
                            triggerPos = lastSize;
                        }
                        // Check Wildcard Trigger
                        else if (lastWildcard !== -1 && cursor >= lastWildcard + 2 && (cursor - lastWildcard) < 50) {
                            const query = val.substring(lastWildcard + 2, cursor).toLowerCase();
                            matches = wildcardsCache.filter(w => {
                                const name = w.slice(2, -2).toLowerCase();
                                return name.includes(query);
                            });
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

                    const checkSelection = (e) => {
                        const input = widget.inputEl;
                        if (!input) return;

                        const start = input.selectionStart;
                        const end = input.selectionEnd;

                        if (start === end) {
                            if (autocomplete.visible && autocomplete.mode === "weight") {
                                autocomplete.hide();
                            }
                            return;
                        }

                        const selectedText = input.value.substring(start, end);
                        if (!selectedText.trim()) return;

                        // Predefined weight values: 0.4, 0.5, 1.1, 1.2, 0
                        const items = ["0.4", "0.5", "1.1", "1.2", "0"];

                        const rect = input.getBoundingClientRect();
                        autocomplete.show(
                            items,
                            rect.left + 20,
                            rect.top + 20 + (input.clientHeight / 2),
                            widget,
                            start,
                            "weight",
                            end
                        );
                    };

                    widget.inputEl.addEventListener("mouseup", checkSelection);
                    widget.inputEl.addEventListener("keyup", checkSelection);

                    widget.inputEl.addEventListener("blur", () => {
                        setTimeout(() => {
                            if (document.activeElement !== widget.inputEl) {
                                autocomplete.hide();
                            }
                        }, 150);
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
