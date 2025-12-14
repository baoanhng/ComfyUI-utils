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
                    node.updatePayload();
                    
                    if (node.onResize) node.onResize(node.size); 
                    const computed = node.computeSize();
                    node.setSize([Math.max(node.size[0], computed[0]), computed[1]]);
                    
                    if (node.fixOrder) node.fixOrder(); 
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
                
                // 1. SMART RECOVERY Logic
                // We use the last item in widgets_values (Expected Payload) as Source of Truth
                // because it contains the exact list of texts we saved.
                
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
                    } catch (e) {
                        // ignore error, maybe payload isn't last?
                    }

                    if (isValidPayload) {
                         // Payload tells us EXACTLY how many texts we expect
                         const textCount = payloadTexts.length;
                         
                         // Ensure we have correct number of widgets
                         // First, recreate up to textCount
                         for (let i = 0; i < textCount; i++) {
                             const name = `text_${i}`;
                             if (!node.widgets.find(x => x.name === name)) {
                                 // Recreate missing
                                 const config = ["STRING", { multiline: true }];
                                 const { widget } = ComfyWidgets.STRING(node, name, config, app);
                             }
                         }
                    }
                }

                // 2. Call Standard Configure
                if (onConfigure) onConfigure.apply(this, arguments);

                // 3. Manually Repair Values (Again, using Payload as anchor)
                if (w && w.widgets_values && w.widgets_values.length > 0) {
                    const savedValues = w.widgets_values;
                    
                    // Fixed: Join(0), Trim(1).
                    // Dynamic: Texts.
                    // Last: Payload.
                    // Unknown: Button? (Maybe inserted at 2?)
                    
                    const joinW = node.widgets.find(x => x.name === "join_string");
                    if (joinW) joinW.value = savedValues[0];

                    const trimW = node.widgets.find(x => x.name === "trim_whitespace");
                    if (trimW) trimW.value = savedValues[1];
                    
                    const lastIdx = savedValues.length - 1;
                    const payloadVal = savedValues[lastIdx];
                    
                    // Restore Payload Widget
                    const payloadW = node.widgets.find(x => x.name === "data_payload");
                    if (payloadW) payloadW.value = payloadVal;
                    
                    // Restore Texts
                    // We parse payload to know how many texts we SHOULD have
                    // And we map them 1-to-1.
                    // THIS IS SAFER than relying on index offsets in widgets_values
                    // because widgets_values might contain the button or not.
                    
                    try {
                        const texts = JSON.parse(payloadVal);
                        if (Array.isArray(texts)) {
                            texts.forEach((txt, i) => {
                                const widgetName = `text_${i}`;
                                const widget = node.widgets.find(x => x.name === widgetName);
                                if (widget) {
                                    widget.value = txt; // Assign correct text from Payload Truth
                                }
                            });
                        }
                    } catch(e) {
                         // Fallback? If payload parse fails, we are in trouble anyway.
                    }
                }

                // 4. Cleanup & Hooks
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
                
                // Force sync
                setTimeout(() => {
                    node.updatePayload();
                }, 100);
            };
        }
    }
});
