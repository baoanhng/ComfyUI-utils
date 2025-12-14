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
            width: "200px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
        });
        document.body.appendChild(this.element);

        this.visible = false;
        this.selectedIndex = 0;
        this.items = [];
        this.targetInput = null;
        this.triggerPos = 0;
    }

    show(items, x, y, input, triggerPos) {
        this.items = items;
        this.targetInput = input;
        this.triggerPos = triggerPos;
        this.selectedIndex = 0;

        this.element.innerHTML = "";
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
        this.targetInput = null;
    }

    render() {
        Array.from(this.element.children).forEach((child, idx) => {
            child.style.backgroundColor = idx === this.selectedIndex ? "#444" : "transparent";
        });
    }

    select(value) {
        if (!this.targetInput) return;

        const text = this.targetInput.value;
        const before = text.substring(0, this.triggerPos);
        const after = text.substring(this.targetInput.selectionEnd);

        // We triggered on "__", so we replace from triggerPos
        // value contains the full tag e.g. "__Tag__"
        // But what if user typed "__S"? We need to replace "__S" with "__Sex__"
        // Let's assume user just typed expected prefix.

        // Better logic: replace the current partial word being typed?
        // For simplicity: Insert at triggerPos

        this.targetInput.setRangeText(value, this.triggerPos, this.targetInput.selectionEnd, "end");
        this.hide();
        this.targetInput.focus();
    }
}

const autocomplete = new AutocompletePopup();
let wildcardsCache = [];

app.registerExtension({
    name: "MyUtils.WildcardAutocomplete",
    async setup() {
        wildcardsCache = await fetchWildcards();

        // Global listener? Or attach to widgets?
        // Comfy widgets are dynamically created. A global listener on document body for 'input' 
        // delegated to textarea might be cleaner but risky.
        // Let's attach to widgets in node created, similar to logic in text_joiner.js 
        // But this extension is separate.
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

                        // Look backwards for "__"
                        // e.g. "Some text __Se"
                        const lastDoubleUnderscore = val.lastIndexOf("__", cursor);

                        if (lastDoubleUnderscore !== -1 && (cursor - lastDoubleUnderscore) < 50) { // Limit lookback
                            const query = val.substring(lastDoubleUnderscore, cursor); // e.g. "__Se"

                            // Filter cache
                            const matches = wildcardsCache.filter(w => w.toLowerCase().includes(query.toLowerCase()));

                            if (matches.length > 0) {
                                // Show popup
                                // Calculate position? 
                                // Simplest: Near the input element absolute position
                                const rect = widget.inputEl.getBoundingClientRect();
                                autocomplete.show(
                                    matches.slice(0, 10), // Limit 10
                                    rect.left + 20,
                                    rect.top + 20 + (widget.inputEl.clientHeight / 2), // Rough estimation
                                    widget.inputEl,
                                    lastDoubleUnderscore
                                );
                            } else {
                                autocomplete.hide();
                            }
                        } else {
                            autocomplete.hide();
                        }
                    });
                };

                // Attach to initial widgets
                // This runs ONCE on creation. But our text widgets are dynamic!
                // We need to hook into the creation logic in text_joiner.js? 
                // OR we just use a MutationObserver? 
                // OR we can export this attach function and call it from text_joiner.js?
                // Exporting is cleaner.

                node.attachAutocomplete = attachAutocomplete;

                // Attach to existing
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
