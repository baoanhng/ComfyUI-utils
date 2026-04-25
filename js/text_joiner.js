import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

app.registerExtension({
    name: "MyUtils.TextJoiner",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "TextJoiner") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                // --- UI Sync (Backend -> Frontend) ---
                const onUpdate = (event) => {
                    const data = event.detail;
                    // console.log("TextJoiner Event:", data, "Node ID:", node.id);
                    if (data && data.node_id == node.id && data.values) {
                        const values = data.values;
                        const textWidgets = node.widgets.filter(w => w.name && w.name.startsWith("text_"));
                        textWidgets.sort((a, b) => {
                            const idxA = parseInt(a.name.split("_")[1]);
                            const idxB = parseInt(b.name.split("_")[1]);
                            return idxA - idxB;
                        });

                        textWidgets.forEach((w, i) => {
                            if (i < values.length) {
                                if (w.value !== values[i]) {
                                    w.value = values[i];
                                    if (w.callback) w.callback(w.value);
                                }
                            } else {
                                if (w.value !== "") {
                                    w.value = "";
                                    if (w.callback) w.callback("");
                                }
                            }
                        });
                        if (node.updatePayload) node.updatePayload();
                    }
                };
                api.addEventListener("my_utils.text_joiner.update", onUpdate);

                const onRemoved = node.onRemoved;
                node.onRemoved = function () {
                    if (onRemoved) onRemoved.apply(this, arguments);
                    api.removeEventListener("my_utils.text_joiner.update", onUpdate);
                };
                // -------------------------------------

                // 1. Setup Payload
                let payloadWidget = node.widgets.find(w => w.name === "data_payload");
                if (payloadWidget) {
                    payloadWidget.type = "converted-widget";
                    payloadWidget.computeSize = () => [0, -4];
                    payloadWidget.draw = () => { };
                }

                // 1b. Setup Disabled Payload
                let disabledPayloadWidget = node.widgets.find(w => w.name === "disabled_payload");
                if (disabledPayloadWidget) {
                    disabledPayloadWidget.type = "converted-widget";
                    disabledPayloadWidget.computeSize = () => [0, -4];
                    disabledPayloadWidget.draw = () => { };
                }

                // 2. Sync Logic
                this.updatePayload = () => {
                    const texts = [];
                    if (this.widgets) {
                        for (const w of this.widgets) {
                            if (w.name && w.name.startsWith("text_")) {
                                texts.push(w.value);
                            }
                        }
                    }
                    const pWidget = this.widgets.find(w => w.name === "data_payload");
                    if (pWidget) {
                        pWidget.value = JSON.stringify(texts);
                    }
                };

                // 2b. Disabled Payload Sync
                this.updateDisabledPayload = () => {
                    const flags = [];
                    if (this.widgets) {
                        const textWidgets = this.widgets
                            .filter(w => w.name && w.name.startsWith("text_"))
                            .sort((a, b) => parseInt(a.name.split("_")[1]) - parseInt(b.name.split("_")[1]));
                        for (const tw of textWidgets) {
                            const idx = parseInt(tw.name.split("_")[1]);
                            const toggleW = this.widgets.find(w => w.name === `enabled_${idx}`);
                            // disabled = !enabled
                            flags.push(toggleW ? !toggleW.value : false);
                        }
                    }
                    const dpWidget = this.widgets.find(w => w.name === "disabled_payload");
                    if (dpWidget) dpWidget.value = JSON.stringify(flags);
                };

                // Helper: apply visual style for enabled/disabled
                const applyToggleStyle = (textWidget, enabled) => {
                    if (textWidget && textWidget.inputEl) {
                        textWidget.inputEl.style.opacity = enabled ? "1" : "0.35";
                        textWidget.inputEl.style.textDecoration = enabled ? "none" : "line-through";
                    }
                };

                // 3. Create Widget Helpers
                const createToggleWidget = (index) => {
                    const name = `enabled_${index}`;
                    const exists = node.widgets.find(w => w.name === name);
                    if (exists) return exists;

                    const toggle = node.addWidget("toggle", name, true, (v) => {
                        const textWidget = node.widgets.find(w => w.name === `text_${index}`);
                        applyToggleStyle(textWidget, v);
                        node.updateDisabledPayload();
                        node.setDirtyCanvas(true, true);
                    }, { serialize: false });

                    return toggle;
                };

                const createTextWidget = (index) => {
                    const name = `text_${index}`;
                    const exists = node.widgets.find(w => w.name === name);
                    if (exists) return exists;

                    const config = ["STRING", { multiline: true }];
                    const { widget } = ComfyWidgets.STRING(node, name, config, app);

                    const originalCallback = widget.callback;
                    widget.callback = function (v) {
                        if (originalCallback) originalCallback.apply(this, arguments);
                        node.updatePayload();
                    };

                    // Attach Autocomplete if available (from autocomplete.js)
                    if (node.attachAutocomplete) {
                        node.attachAutocomplete(widget);
                    }

                    // Create matching toggle
                    createToggleWidget(index);

                    return widget;
                };

                // 4. Initial Defaults
                for (let i = 0; i < 5; i++) {
                    createTextWidget(i);
                }

                // 5. Buttons
                const addButton = node.addWidget("button", "Add text box", null, () => {
                    let maxIndex = -1;
                    for (const w of node.widgets) {
                        if (w.name && w.name.startsWith("text_")) {
                            const parts = w.name.split("_");
                            if (parts.length > 1) {
                                const idx = parseInt(parts[1]);
                                if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
                            }
                        }
                    }
                    createTextWidget(maxIndex + 1);
                    node.updatePayload();
                    node.updateDisabledPayload();

                    if (node.onResize) node.onResize(node.size);
                    const computed = node.computeSize();
                    node.setSize([Math.max(node.size[0], computed[0]), computed[1]]);

                    if (node.fixOrder) node.fixOrder();
                }, { serialize: false });

                const removeButton = node.addWidget("button", "Remove text box", null, () => {
                    let maxIndex = -1;
                    let maxWidgetIndex = -1;

                    for (let i = 0; i < node.widgets.length; i++) {
                        const w = node.widgets[i];
                        if (w.name && w.name.startsWith("text_")) {
                            const parts = w.name.split("_");
                            if (parts.length > 1) {
                                const idx = parseInt(parts[1]);
                                if (!isNaN(idx) && idx > maxIndex) {
                                    maxIndex = idx;
                                    maxWidgetIndex = i;
                                }
                            }
                        }
                    }

                    // Keep 0-4 (5 items)
                    if (maxIndex > 4 && maxWidgetIndex !== -1) {
                        const widgetToRemove = node.widgets[maxWidgetIndex];

                        // CLEANUP: Manually remove DOM elements if they exist
                        if (widgetToRemove.onRemove) {
                            widgetToRemove.onRemove();
                        }
                        // Check for common DOM properties on Comfy widgets
                        if (widgetToRemove.element && widgetToRemove.element.parentNode) {
                            widgetToRemove.element.parentNode.removeChild(widgetToRemove.element);
                        }
                        if (widgetToRemove.inputEl && widgetToRemove.inputEl.parentNode) {
                            widgetToRemove.inputEl.parentNode.removeChild(widgetToRemove.inputEl);
                        }

                        // Remove text widget from array
                        node.widgets.splice(maxWidgetIndex, 1);

                        // Also remove the matching toggle widget
                        const toggleIdx = node.widgets.findIndex(w => w.name === `enabled_${maxIndex}`);
                        if (toggleIdx !== -1) {
                            node.widgets.splice(toggleIdx, 1);
                        }

                        node.updatePayload();
                        node.updateDisabledPayload();

                        if (node.onResize) node.onResize(node.size);
                        const computed = node.computeSize();
                        node.setSize([Math.max(node.size[0], computed[0]), computed[1]]);

                        if (node.fixOrder) node.fixOrder();
                        node.setDirtyCanvas(true, true);
                    }
                }, { serialize: false });

                // 6. Fix Order
                this.fixOrder = () => {
                    if (!node.widgets) return;
                    node.widgets.sort((a, b) => {
                        const rank = (w) => {
                            if (w.name === "join_string") return 0;
                            if (w.name === "trim_whitespace") return 1;
                            if (w.name === "data_payload") return 9998;
                            if (w.name === "disabled_payload") return 9999;
                            if (w.label === "Add text box" || w.type === "button") return 2;
                            if (w.label === "Remove text box") return 3;
                            if (w.name && w.name.startsWith("text_")) {
                                const parts = w.name.split("_");
                                const idx = parseInt(parts[1]);
                                return 100 + idx * 2;
                            }
                            if (w.name && w.name.startsWith("enabled_")) {
                                const parts = w.name.split("_");
                                const idx = parseInt(parts[1]);
                                return 100 + idx * 2 + 1;
                            }
                            return 50;
                        };
                        return rank(a) - rank(b);
                    });
                };

                this.fixOrder();
                setTimeout(() => this.fixOrder(), 50);
                this.updatePayload();
                this.updateDisabledPayload();

                return r;
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function (w) {
                const node = this;

                // 1. SMART RECOVERY Logic from Payload
                if (w && w.widgets_values && w.widgets_values.length > 0) {
                    const savedValues = w.widgets_values;
                    const lastVal = savedValues[savedValues.length - 1];
                    // data_payload is second-to-last when disabled_payload exists
                    const secondLastVal = savedValues.length > 1 ? savedValues[savedValues.length - 2] : null;

                    // Try last value as data_payload first (backward compat)
                    let payloadTexts = [];
                    let isValidPayload = false;
                    let payloadSource = lastVal;

                    // If second-to-last is a valid text array, it's the new format
                    // (data_payload at second-to-last, disabled_payload at last)
                    if (secondLastVal) {
                        try {
                            const parsed2 = JSON.parse(secondLastVal);
                            if (Array.isArray(parsed2) && parsed2.length > 0 && typeof parsed2[0] === "string") {
                                payloadTexts = parsed2;
                                isValidPayload = true;
                                payloadSource = secondLastVal;
                            }
                        } catch (e) { }
                    }

                    // Fallback: try last value (old format without disabled_payload)
                    if (!isValidPayload) {
                        try {
                            const parsed = JSON.parse(lastVal);
                            if (Array.isArray(parsed)) {
                                payloadTexts = parsed;
                                isValidPayload = true;
                            }
                        } catch (e) { }
                    }

                    if (isValidPayload) {
                        const textCount = payloadTexts.length;
                        for (let i = 0; i < textCount; i++) {
                            const name = `text_${i}`;
                            if (!node.widgets.find(x => x.name === name)) {
                                const config = ["STRING", { multiline: true }];
                                const { widget } = ComfyWidgets.STRING(node, name, config, app);
                                if (node.attachAutocomplete) {
                                    node.attachAutocomplete(widget);
                                }
                            }
                            // Ensure toggle exists for each text widget
                            const toggleName = `enabled_${i}`;
                            if (!node.widgets.find(x => x.name === toggleName)) {
                                node.addWidget("toggle", toggleName, true, (v) => {
                                    const tw = node.widgets.find(x => x.name === `text_${i}`);
                                    if (tw && tw.inputEl) {
                                        tw.inputEl.style.opacity = v ? "1" : "0.35";
                                        tw.inputEl.style.textDecoration = v ? "none" : "line-through";
                                    }
                                    if (node.updateDisabledPayload) node.updateDisabledPayload();
                                    node.setDirtyCanvas(true, true);
                                }, { serialize: false });
                            }
                        }
                    }
                }

                if (onConfigure) onConfigure.apply(this, arguments);

                // 2. Repair Values
                if (w && w.widgets_values && w.widgets_values.length > 0) {
                    const savedValues = w.widgets_values;

                    const joinW = node.widgets.find(x => x.name === "join_string");
                    if (joinW) joinW.value = savedValues[0];

                    const trimW = node.widgets.find(x => x.name === "trim_whitespace");
                    if (trimW) trimW.value = savedValues[1];

                    // Detect format: new (data_payload, disabled_payload) or old (data_payload only)
                    const lastIdx = savedValues.length - 1;
                    let payloadVal = savedValues[lastIdx];
                    let disabledVal = "[]";

                    // Check if second-to-last is data_payload (new format)
                    if (lastIdx >= 1) {
                        try {
                            const candidate = JSON.parse(savedValues[lastIdx - 1]);
                            const lastParsed = JSON.parse(savedValues[lastIdx]);
                            if (Array.isArray(candidate) && candidate.length > 0 && typeof candidate[0] === "string"
                                && Array.isArray(lastParsed) && (lastParsed.length === 0 || typeof lastParsed[0] === "boolean")) {
                                payloadVal = savedValues[lastIdx - 1];
                                disabledVal = savedValues[lastIdx];
                            }
                        } catch (e) { }
                    }

                    const payloadW = node.widgets.find(x => x.name === "data_payload");
                    if (payloadW) payloadW.value = payloadVal;

                    const disabledW = node.widgets.find(x => x.name === "disabled_payload");
                    if (disabledW) disabledW.value = disabledVal;

                    // Recover text values
                    try {
                        const texts = JSON.parse(payloadVal);
                        if (Array.isArray(texts)) {
                            texts.forEach((txt, i) => {
                                const widgetName = `text_${i}`;
                                const widget = node.widgets.find(x => x.name === widgetName);
                                if (widget) {
                                    widget.value = txt;
                                }
                            });
                        }
                    } catch (e) { }

                    // Recover disabled states
                    try {
                        const flags = JSON.parse(disabledVal);
                        if (Array.isArray(flags)) {
                            flags.forEach((disabled, i) => {
                                const toggleW = node.widgets.find(x => x.name === `enabled_${i}`);
                                if (toggleW) {
                                    toggleW.value = !disabled;
                                }
                            });
                        }
                    } catch (e) { }
                }

                // 3. Cleanup & Hooks
                let payloadWidget = node.widgets.find(w => w.name === "data_payload");
                if (payloadWidget) {
                    payloadWidget.type = "converted-widget";
                    payloadWidget.computeSize = () => [0, -4];
                    payloadWidget.draw = () => { };
                }

                let disPayloadWidget = node.widgets.find(w => w.name === "disabled_payload");
                if (disPayloadWidget) {
                    disPayloadWidget.type = "converted-widget";
                    disPayloadWidget.computeSize = () => [0, -4];
                    disPayloadWidget.draw = () => { };
                }

                if (!this.updatePayload) {
                    this.updatePayload = () => {
                        const texts = [];
                        if (node.widgets) {
                            for (const w of node.widgets) {
                                if (w.name && w.name.startsWith("text_")) {
                                    texts.push(w.value);
                                }
                            }
                        }
                        const pWidget = node.widgets.find(w => w.name === "data_payload");
                        if (pWidget) pWidget.value = JSON.stringify(texts);
                    };
                }

                if (!this.updateDisabledPayload) {
                    this.updateDisabledPayload = () => {
                        const flags = [];
                        if (node.widgets) {
                            const textWidgets = node.widgets
                                .filter(w => w.name && w.name.startsWith("text_"))
                                .sort((a, b) => parseInt(a.name.split("_")[1]) - parseInt(b.name.split("_")[1]));
                            for (const tw of textWidgets) {
                                const idx = parseInt(tw.name.split("_")[1]);
                                const toggleW = node.widgets.find(w => w.name === `enabled_${idx}`);
                                flags.push(toggleW ? !toggleW.value : false);
                            }
                        }
                        const dpWidget = node.widgets.find(w => w.name === "disabled_payload");
                        if (dpWidget) dpWidget.value = JSON.stringify(flags);
                    };
                }

                for (const widget of node.widgets) {
                    if (widget.name && widget.name.startsWith("text_")) {
                        if (!widget.callback || !widget.toString().includes("updatePayload")) {
                            const originalCallback = widget.callback;
                            widget.callback = function (v) {
                                if (originalCallback) originalCallback.apply(this, arguments);
                                node.updatePayload();
                            };
                        }
                    }
                }

                if (this.fixOrder) this.fixOrder();
                else {
                    node.widgets.sort((a, b) => {
                        const rank = (w) => {
                            if (w.name === "join_string") return 0;
                            if (w.name === "trim_whitespace") return 1;
                            if (w.name === "data_payload") return 9998;
                            if (w.name === "disabled_payload") return 9999;
                            if (w.label === "Add text box" || w.type === "button") return 2;
                            if (w.label === "Remove text box") return 3;
                            if (w.name && w.name.startsWith("text_")) {
                                const parts = w.name.split("_");
                                const idx = parseInt(parts[1]);
                                return 100 + idx * 2;
                            }
                            if (w.name && w.name.startsWith("enabled_")) {
                                const parts = w.name.split("_");
                                const idx = parseInt(parts[1]);
                                return 100 + idx * 2 + 1;
                            }
                            return 50;
                        };
                        return rank(a) - rank(b);
                    });
                }

                // Apply visual styles for disabled toggles after DOM is ready
                setTimeout(() => {
                    node.updatePayload();
                    if (node.updateDisabledPayload) node.updateDisabledPayload();
                    // Apply visual feedback
                    for (const w of node.widgets) {
                        if (w.name && w.name.startsWith("enabled_")) {
                            const idx = parseInt(w.name.split("_")[1]);
                            const tw = node.widgets.find(x => x.name === `text_${idx}`);
                            if (tw && tw.inputEl) {
                                tw.inputEl.style.opacity = w.value ? "1" : "0.35";
                                tw.inputEl.style.textDecoration = w.value ? "none" : "line-through";
                            }
                        }
                    }
                }, 100);
            };
        }
    }
});
