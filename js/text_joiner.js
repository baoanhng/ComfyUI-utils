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

                // 1. Setup Payload
                let payloadWidget = node.widgets.find(w => w.name === "data_payload");
                if (payloadWidget) {
                    payloadWidget.type = "converted-widget";
                    payloadWidget.computeSize = () => [0, -4];
                    payloadWidget.draw = () => {}; 
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
                
                // 3. Create Widget Helper
                const createTextWidget = (index) => {
                    const name = `text_${index}`;
                    const exists = node.widgets.find(w => w.name === name);
                    if (exists) return exists;

                    const config = ["STRING", { multiline: true }];
                    const { widget } = ComfyWidgets.STRING(node, name, config, app);
                    
                    const originalCallback = widget.callback;
                    widget.callback = function(v) {
                        if (originalCallback) originalCallback.apply(this, arguments);
                        node.updatePayload();
                    };
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

                        // Remove from array
                        node.widgets.splice(maxWidgetIndex, 1);
                        node.updatePayload();
                        
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
                             if (w.name === "data_payload") return 9999; 
                             if (w.label === "Add text box" || w.type === "button") return 2; 
                             if (w.label === "Remove text box") return 3;
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
                
                this.fixOrder();
                setTimeout(() => this.fixOrder(), 50);
                this.updatePayload();

                return r;
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(w) {
                const node = this;
                
                // 1. SMART RECOVERY Logic from Payload
                if (w && w.widgets_values && w.widgets_values.length > 0) {
                    const savedValues = w.widgets_values;
                    const lastVal = savedValues[savedValues.length - 1];
                    let payloadTexts = [];
                    let isValidPayload = false;
                    
                    try {
                        const parsed = JSON.parse(lastVal);
                        if (Array.isArray(parsed)) {
                            payloadTexts = parsed;
                            isValidPayload = true;
                        }
                    } catch (e) { }

                    if (isValidPayload) {
                         const textCount = payloadTexts.length;
                         for (let i = 0; i < textCount; i++) {
                             const name = `text_${i}`;
                             if (!node.widgets.find(x => x.name === name)) {
                                 const config = ["STRING", { multiline: true }];
                                 const { widget } = ComfyWidgets.STRING(node, name, config, app);
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
                    
                    const lastIdx = savedValues.length - 1;
                    const payloadVal = savedValues[lastIdx];
                    
                    const payloadW = node.widgets.find(x => x.name === "data_payload");
                    if (payloadW) payloadW.value = payloadVal;
                    
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
                    } catch(e) { }
                }

                // 3. Cleanup & Hooks
                let payloadWidget = node.widgets.find(w => w.name === "data_payload");
                if (payloadWidget) {
                    payloadWidget.type = "converted-widget";
                    payloadWidget.computeSize = () => [0, -4];
                    payloadWidget.draw = () => {};
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

                for (const widget of node.widgets) {
                    if (widget.name && widget.name.startsWith("text_")) {
                         if (!widget.callback || !widget.toString().includes("updatePayload")) {
                             const originalCallback = widget.callback;
                             widget.callback = function(v) {
                                 if(originalCallback) originalCallback.apply(this, arguments);
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
                             if (w.name === "data_payload") return 9999;
                             if (w.label === "Add text box" || w.type === "button") return 2;
                             if (w.label === "Remove text box") return 3;
                             if (w.name && w.name.startsWith("text_")) {
                                 const parts = w.name.split("_");
                                 const idx = parseInt(parts[1]);
                                 return 100 + idx;
                             }
                             return 50; 
                         };
                         return rank(a) - rank(b);
                    });
                }
                
                setTimeout(() => {
                    node.updatePayload();
                }, 100);
            };
        }
    }
});
