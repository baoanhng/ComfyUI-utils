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
                // It comes from optional inputs, so it should be in node.widgets
                let payloadWidget = node.widgets.find(w => w.name === "data_payload");
                if (payloadWidget) {
                    // Hide it visually
                    payloadWidget.type = "converted-widget"; 
                    payloadWidget.computeSize = () => [0, -4]; 
                }

                // 2. Sync Logic
                const updatePayload = () => {
                    const texts = [];
                    if (node.widgets) {
                        for (const w of node.widgets) {
                            if (w.name && w.name.startsWith("text_")) {
                                texts.push(w.value);
                            }
                        }
                    }
                    if (payloadWidget) {
                        // We serialize the array of strings
                        payloadWidget.value = JSON.stringify(texts);
                    }
                };
                
                // Attach updatePayload to instance so onConfigure can use it
                this.updatePayload = updatePayload;

                // 3. Helper to create a text widget
                const createTextWidget = (index) => {
                    const name = `text_${index}`;
                    // Check if exists
                    const exists = node.widgets.find(w => w.name === name);
                    if (exists) return exists;

                    const config = ["STRING", { multiline: true }];
                    const { widget } = ComfyWidgets.STRING(node, name, config, app);
                    
                    // Hook callback
                    const originalCallback = widget.callback;
                    widget.callback = function(v) {
                        if (originalCallback) originalCallback.apply(this, arguments);
                        updatePayload();
                    };
                    return widget;
                };

                // 4. Initial Setup (if new)
                // Check if we already have text widgets (reloading?)
                // Actually onNodeCreated runs before config.
                // If new, just add 5.
                // If loading, onConfigure will handle addition?
                // ComfyUI calls onNodeCreated -> onConfigure.
                // We should add default 5 here. If onConfigure has more, it adds more.
                // If onConfigure has fewer (e.g. user deleted some? not supported yet), we might have extra.
                // But for now, ensuring at least 5 is good.
                
                for (let i = 0; i < 5; i++) {
                     createTextWidget(i);
                }

                // 5. Add Button
                const addButton = node.addWidget("button", "Add text box", null, () => {
                    // Determine next index
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
                    
                    // Resize
                    const computed = node.computeSize();
                    node.setSize([Math.max(node.size[0], computed[0]), computed[1]]);
                }, { serialize: false });

                // 6. Fix Order
                const fixOrder = () => {
                    const order = ["join_string", "trim_whitespace", "data_payload", "Add text box"];
                    node.widgets.sort((a, b) => {
                         const rank = (w) => {
                             if (w.name === "join_string") return 0;
                             if (w.name === "trim_whitespace") return 1;
                             if (w.name === "data_payload") return 999; // Hidden at end
                             if (w.label === "Add text box") return 2;
                             if (w.name && w.name.startsWith("text_")) {
                                 const parts = w.name.split("_");
                                 return 3 + parseInt(parts[1]);
                             }
                             return 500;
                         };
                         return rank(a) - rank(b);
                    });
                };
                fixOrder();
                setTimeout(fixOrder, 20); 

                // Initial sync
                updatePayload();

                return r;
            };

            // Restore logic
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(w) {
                if (onConfigure) onConfigure.apply(this, arguments);
                
                const node = this;
                // Re-find payload widget as reference might have changed or been lost if we didn't attach it?
                // node.widgets is the source of truth.
                let payloadWidget = node.widgets.find(w => w.name === "data_payload");
                if (payloadWidget) {
                    payloadWidget.computeSize = () => [0, -4];
                }

                if (w && w.widgets_values) {
                    // Logic to reconstruct widgets.
                    // widgets_values is array of values.
                    // We need to infer how many text boxes there are.
                    // Known non-texts: join(0), trim(1), payload(2? or last).
                    // The payload is serializable, so it is in widgets_values.
                    // Order in widgets_values matches order in node.widgets AT SAVE TIME.
                    // Our sort function puts payload at 999 (end).
                    // So save order: join, trim, text0, text1... textN, payload.
                    // Wait, Add Button is not serialized.
                    
                    // So: [join, trim, text0...textN, payload]
                    // We can just iterate and see how many we have?
                    // Or simply: calculated length.
                    // min = 3 (join, trim, payload).
                    // text_count = length - 3.
                    
                    const savedLength = w.widgets_values.length;
                    const min = 3; 
                    if (savedLength >= min) {
                        const textCount = savedLength - min;
                        // Since we saved them in order text_0...text_N
                        // We can just create them up to N.
                        // Existing code created 0..4 (5 items).
                        // If textCount > 5, create the rest.
                        
                        for (let i = 0; i < textCount; i++) {
                             // helper to create if missing
                             // We duplicate create logic here or strictly use helper?
                             // Can't access onNodeCreated helper easily unless attached to instance.
                             // But we can replicate:
                             const name = `text_${i}`;
                             if (!node.widgets.find(x => x.name === name)) {
                                 const config = ["STRING", { multiline: true }];
                                 const { widget } = ComfyWidgets.STRING(node, name, config, app);
                             }
                        }
                    }
                }
                
                // Re-hook callbacks (crucial because onConfigure might replace widgets? No, it usually just sets values)
                // But just in case:
                const updatePayload = this.updatePayload || (() => {
                     // Fallback re-definition if instances are tricky
                     const texts = [];
                     for (const widget of node.widgets) {
                        if (widget.name && widget.name.startsWith("text_")) {
                            texts.push(widget.value);
                        }
                     }
                     if (payloadWidget) payloadWidget.value = JSON.stringify(texts);
                });

                for (const widget of node.widgets) {
                    if (widget.name && widget.name.startsWith("text_")) {
                         // Check if already hooked?
                         // Hard to check. Just wrap.
                         // But avoid double wrapping.
                         // We can mark it.
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
                
                // One last re-sort to be safe
                const fixOrder = () => {
                    const order = ["join_string", "trim_whitespace", "data_payload", "Add text box"];
                    node.widgets.sort((a, b) => {
                         const rank = (w) => {
                             if (w.name === "join_string") return 0;
                             if (w.name === "trim_whitespace") return 1;
                             if (w.name === "data_payload") return 999; 
                             if (w.label === "Add text box") return 2;
                             if (w.name && w.name.startsWith("text_")) {
                                 const parts = w.name.split("_");
                                 return 3 + parseInt(parts[1]);
                             }
                             return 500;
                         };
                         return rank(a) - rank(b);
                    });
                };
                fixOrder();
            };
        }
    }
});
