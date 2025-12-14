import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

app.registerExtension({
    name: "MyUtils.TextJoiner",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "TextJoiner") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                // 1. Locate and setup data_payload widget (Hidden)
                let payloadWidget = node.widgets.find(w => w.name === "data_payload");
                
                const hidePayload = (w) => {
                     if (!w) return;
                     w.type = "converted-widget";
                     w.computeSize = () => [0, -4]; // No size
                     w.draw = () => {}; // No visual
                };

                if (payloadWidget) {
                    hidePayload(payloadWidget);
                }

                // 2. Sync Logic
                const updatePayload = () => {
                    // Re-find in case reference stale (though usually objects persist)
                    // But good to be safe if list re-ordered.
                    const pWidget = node.widgets.find(w => w.name === "data_payload");
                    const texts = [];
                    if (node.widgets) {
                        for (const w of node.widgets) {
                            if (w.name && w.name.startsWith("text_")) {
                                texts.push(w.value);
                            }
                        }
                    }
                    if (pWidget) {
                        pWidget.value = JSON.stringify(texts);
                    }
                };
                
                this.updatePayload = updatePayload;

                // 3. Helper to create a text widget
                const createTextWidget = (index) => {
                    const name = `text_${index}`;
                    const exists = node.widgets.find(w => w.name === name);
                    if (exists) return exists;

                    const config = ["STRING", { multiline: true }];
                    const { widget } = ComfyWidgets.STRING(node, name, config, app);
                    
                    const originalCallback = widget.callback;
                    widget.callback = function(v) {
                        if (originalCallback) originalCallback.apply(this, arguments);
                        updatePayload();
                    };
                    return widget;
                };

                // 4. Initial Setup
                for (let i = 0; i < 5; i++) {
                     createTextWidget(i);
                }

                // 5. Add Button
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
                    updatePayload(); 
                    
                    // Resize & Fix Order
                    node.onResize(node.size); // Trigger resize logic (custom or default)
                    const computed = node.computeSize();
                    node.setSize([Math.max(node.size[0], computed[0]), computed[1]]);
                    
                    // We must fix order immediately after adding to ensure new widget is in correct place (before payload)
                    // Actually payload is at end (999). Text is 3+index.
                    // This sort is stable-ish.
                    fixOrder(); 
                }, { serialize: false });

                // 6. Fix Order
                // Must expose this for usage in callback
                const fixOrder = () => {
                    node.widgets.sort((a, b) => {
                         const rank = (w) => {
                             if (w.name === "join_string") return 0;
                             if (w.name === "trim_whitespace") return 1;
                             if (w.name === "data_payload") return 9999; // Hidden at absolute end
                             if (w.label === "Add text box" || w.type === "button") return 2; // Below Trim
                             if (w.name && w.name.startsWith("text_")) {
                                 const parts = w.name.split("_");
                                 const idx = parseInt(parts[1]);
                                 return 100 + idx; // From 100 onwards
                             }
                             return 50; // Unknown
                         };
                         return rank(a) - rank(b);
                    });
                };
                
                fixOrder();
                // Recurring check because ComfyUI creation process might be async/incremental for some things
                setTimeout(fixOrder, 50);

                updatePayload();

                return r;
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(w) {
                if (onConfigure) onConfigure.apply(this, arguments);
                
                const node = this;
                let payloadWidget = node.widgets.find(w => w.name === "data_payload");
                if (payloadWidget) {
                    payloadWidget.type = "converted-widget";
                    payloadWidget.computeSize = () => [0, -4];
                    payloadWidget.draw = () => {};
                }

                if (w && w.widgets_values) {
                    // Logic to reconstruct extra widgets if they exist in source
                    // But since we use JSON payload, do we rely on widgets_values for display restoration?
                    // Yes. user expects to see what they saved.
                    // widgets_values contains [join, trim, text0, text1..., payload]
                    // We can infer count from it.
                    // or parse payload if initialized?
                    // widgets_values is just an array of values.
                    
                    const savedLength = w.widgets_values.length; 
                    // Expected min: join, trim, payload = 3.
                    // texts = length - 3.
                    
                    if (savedLength >= 3) {
                         const textCount = savedLength - 3; // Excluding join, trim, payload
                         // We start with 5.
                         if (textCount > 0) {
                             // Create up to textCount-1 (indices)
                             for (let i = 0; i < textCount; i++) {
                                 const name = `text_${i}`;
                                 if (!node.widgets.find(x => x.name === name)) {
                                     const config = ["STRING", { multiline: true }];
                                     const { widget } = ComfyWidgets.STRING(node, name, config, app);
                                 }
                             }
                         }
                    }
                }

                // Hook callbacks
                const updatePayload = this.updatePayload || (() => {
                     const pWidget = node.widgets.find(w => w.name === "data_payload");
                     const texts = [];
                     for (const widget of node.widgets) {
                        if (widget.name && widget.name.startsWith("text_")) {
                            texts.push(widget.value);
                        }
                     }
                     if (pWidget) pWidget.value = JSON.stringify(texts);
                });

                for (const widget of node.widgets) {
                    if (widget.name && widget.name.startsWith("text_")) {
                         // Hook
                         if (!widget.hasPayloadHook) {
                             const originalCallback = widget.callback;
                             widget.callback = function(v) {
                                 if(originalCallback) originalCallback.apply(this, arguments);
                                 updatePayload();
                             };
                             widget.hasPayloadHook = true;
                         }
                    }
                }
                
                // Sort
                const fixOrder = () => {
                    node.widgets.sort((a, b) => {
                         const rank = (w) => {
                             if (w.name === "join_string") return 0;
                             if (w.name === "trim_whitespace") return 1;
                             if (w.name === "data_payload") return 9999; 
                             if (w.label === "Add text box" || w.type === "button") return 2; 
                             if (w.name && w.name.startsWith("text_")) {
                                 const parts = w.name.split("_");
                                 const idx = parseInt(parts[1]);
                                 return 100 + idx;
                             }
                             return 50; 
                         };
                         return rank(a) - rank(b);
                    });
                };
                fixOrder();
            };
        }
    }
});
