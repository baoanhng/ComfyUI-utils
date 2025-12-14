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

                // Initially, hide widgets beyond text_5
                if (node.widgets) {
                    for (let i = node.widgets.length - 1; i >= 0; i--) {
                        const w = node.widgets[i];
                        if (w.name && w.name.startsWith("text_")) {
                            const parts = w.name.split("_");
                            if (parts.length > 1) {
                                const idx = parseInt(parts[1]);
                                if (idx > 5) {
                                    node.widgets.splice(i, 1);
                                }
                            }
                        }
                    }
                }

                // Function to add a new text widget
                const addTextWidget = () => {
                    // Find the current highest text index among visible widgets
                    let maxIndex = 0;
                    if (node.widgets) {
                        for (const w of node.widgets) {
                            if (w.name && w.name.startsWith("text_")) {
                                const parts = w.name.split("_");
                                if (parts.length > 1) {
                                    const idx = parseInt(parts[1]);
                                    if (!isNaN(idx) && idx > maxIndex) {
                                        maxIndex = idx;
                                    }
                                }
                            }
                        }
                    }
                    
                    if (maxIndex >= 25) {
                        alert("Maximum 25 text boxes reached.");
                        return;
                    }

                    const nextIndex = maxIndex + 1;
                    const widgetName = `text_${nextIndex}`;

                    // Re-create the widget using ComfyWidgets factory
                    const config = ["STRING", { multiline: true }];
                    const result = ComfyWidgets.STRING(node, widgetName, config, app);
                    const w = result.widget;
                    
                    // Resize node to fit, preserving width
                    const computedSize = node.computeSize();
                    node.setSize([Math.max(node.size[0], computedSize[0]), computedSize[1]]);
                    node.setDirtyCanvas(true, true);
                };

                // Add the button widget
				const addBtn = node.addWidget("button", "Add text box (Max 25)", null, addTextWidget, { serialize: false });

                // Move button to be below "trim_whitespace"
                if (node.widgets) {
                    const trimIdx = node.widgets.findIndex(w => w.name === "trim_whitespace");
                    if (trimIdx !== -1) {
                         // We want to insert AFTER trim_whitespace
                         const btnIdx = node.widgets.indexOf(addBtn);
                         if (btnIdx > trimIdx + 1) {
                             node.widgets.splice(btnIdx, 1);
                             node.widgets.splice(trimIdx + 1, 0, addBtn);
                         }
                    }
                }

				return r;
			};

            // Handle restoration from save state
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(w) {
                if (onConfigure) {
                    onConfigure.apply(this, arguments);
                }
                
                // w is the widget values dictionary from the save file
                // format implies it's an object or array match?
                // actually in ComfyUI onConfigure, w might be the serialized object or data
                // Standard: onConfigure(w) where w is the node data object
                
                // But wait, standard widgets might load automatically if they exist.
                // Since we removed them in onNodeCreated, we need to put them back if they have data.
                
                if (w && w.widgets_values) {
                     // Check if we have values for indices > 5
                     // widgets_values is an array of values corresponding to widgets order usually
                     // or sometimes it's mapped.
                     // The backend inputs are defined, so ComfyUI knows about them.
                     
                     // If we removed widgets, the widgets_values array might still contain data for them?
                     // Actually, if we remove them, how does ComfyUI map the values?
                     // ComfyUI maps by order or name? Usually order for standard widgets.
                     
                     // Strategy: Calculate how many text widgets we expect based on widgets_values length.
                     // Fixed widgets: join_string (1), trim_whitespace (1).
                     // Input types defined 25 text widgets.
                     // On load, widgets_values will contain values for ALL saved widgets.
                     
                     // If the save was made with 7 text widgets, widgets_values length might be 1+1+7 = 9?
                     // No, "Add text box" button is usually not serialized.
                     
                     // Let's rely on the fact that we can infer count from data.
                     // But simpler: just restore any widget that matches the definition if we can.
                     // Actually, since we defined 25 in Python, and simple removed them in JS.
                     // We should check if we need to restore them.
                     
                     // Better approach:
                     // Just rely on the user to click add? No, data would be lost.
                     
                     // Let's assume standard behavior:
                     // 1. Python define 25 inputs.
                     // 2. JS onNodeCreated removes 6..25.
                     // 3. JS onConfigure checks if saved data has more than 5 texts.
                     
                     // We need to count how many string values are in widgets_values?
                     // Or just blindly add them back if the array is long enough?
                     
                     // widgets_values length = number of widgets saved.
                     // initial widgets = 2 (join, trim) + 5 (text) = 7.
                     // if length > 7, we have extra texts.
                     const savedLength = w.widgets_values.length;
                     // We have 1 button, but it is not serialized.
                     // So saved data purely contains the value widgets.
                     
                     // Current widgets (after onNodeCreated deletion):
                     // join, trim, button, text1..5. (Total 8 widgets in memory).
                     // But button is not saved.
                     
                     // If saving 7 texts: 1(join)+1(trim)+7(text) = 9 values.
                     const expectedMin = 2 + 5; // 7
                     if (savedLength > expectedMin) {
                         const extraCount = savedLength - expectedMin;
                         for (let i = 0; i < extraCount; i++) {
                             // trigger addTextWidget?
                             // We need to access the function.
                             // But addTextWidget is inside onNodeCreated.
                             // We can manually add them here.
                             
                             // Which index?
                             // existing is 5.
                             const nextIndex = 5 + i + 1;
                             if (nextIndex > 25) break; 
                             
                             const widgetName = `text_${nextIndex}`;
                             
                             // We need to check if it already exists? 
                             // onConfigure runs after onNodeCreated.
                             // onNodeCreated removed them.
                             
                             // Add it.
                             const config = ["STRING", { multiline: true }];
                             const result = ComfyWidgets.STRING(this, widgetName, config, app);
                         }
                     }
                }
            }
		}
	},
});
