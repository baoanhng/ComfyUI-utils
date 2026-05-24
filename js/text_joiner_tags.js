import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NUM_SECTIONS = 6;

// ─── CSS ────────────────────────────────────────────────────────────────
const STYLE_ID = "my-utils-tag-input-styles";
if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .mu-tag-section {
            position: relative;
            padding: 0 2px;
        }
        .mu-tag-label {
            font-size: 9px;
            color: #4a5068;
            margin-bottom: 2px;
            user-select: none;
            font-family: 'Segoe UI', Arial, sans-serif;
        }
        .mu-tag-container {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            gap: 4px;
            padding: 5px 7px;
            min-height: 30px;
            max-height: 100px;
            overflow-y: auto;
            background: #1a1a2e;
            border: 1px solid #3a3a5c;
            border-radius: 6px;
            cursor: text;
            box-sizing: border-box;
            width: 100%;
            font-family: 'Segoe UI', Arial, sans-serif;
            transition: border-color 0.2s;
        }
        .mu-tag-container::-webkit-scrollbar {
            width: 4px;
        }
        .mu-tag-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .mu-tag-container::-webkit-scrollbar-thumb {
            background: #3a3a5c;
            border-radius: 2px;
        }
        .mu-tag-container:focus-within {
            border-color: #6a7acc;
            box-shadow: 0 0 0 1px rgba(106,122,204,0.25);
        }
        .mu-tag-chip {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 1px 5px 1px 5px;
            background: linear-gradient(135deg, #2a3a52, #2d3448);
            border: 1px solid #4a5a7a;
            border-radius: 10px;
            color: #d0d8e8;
            font-size: 11px;
            line-height: 1.4;
            max-width: 100%;
            word-break: break-word;
            user-select: none;
            transition: background 0.15s, border-color 0.15s;
            cursor: grab;
        }
        .mu-tag-chip:active {
            cursor: grabbing;
        }
        .mu-tag-chip.dragging {
            opacity: 0.4;
            border-style: dashed;
            background: rgba(40, 50, 70, 0.5) !important;
        }
        .mu-tag-chip.weighted {
            background: linear-gradient(135deg, #3a3248, #3d2d40);
            border-color: #6a5a7a;
        }
        .mu-tag-chip:hover {
            background: linear-gradient(135deg, #354a66, #38405c);
            border-color: #6a7a9a;
        }
        .mu-tag-chip.weighted:hover {
            background: linear-gradient(135deg, #4a3a58, #4d3550);
            border-color: #7a6a8a;
        }
        .mu-tag-chip .mu-tag-text {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .mu-tag-chip .mu-tag-weight {
            font-size: 9px;
            color: #9a8aaa;
            margin-left: -1px;
        }
        .mu-tag-chip .mu-tag-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: transparent;
            border: none;
            color: #6a7a9a;
            font-size: 12px;
            line-height: 1;
            cursor: pointer;
            padding: 0;
            flex-shrink: 0;
            transition: background 0.15s, color 0.15s;
        }
        .mu-tag-chip .mu-tag-btn.plus:hover {
            background: rgba(80,200,120,0.2);
            color: #66cc88;
        }
        .mu-tag-chip .mu-tag-btn.minus:hover {
            background: rgba(200,160,80,0.2);
            color: #ccaa66;
        }
        .mu-tag-chip .mu-tag-btn.remove:hover {
            background: rgba(255,80,80,0.25);
            color: #ff6666;
        }
        .mu-tag-input {
            flex: 1;
            min-width: 60px;
            border: none;
            outline: none;
            background: transparent;
            color: #c8ccd4;
            font-size: 11.5px;
            font-family: inherit;
            padding: 1px 0;
            line-height: 1.4;
        }
        .mu-tag-input::placeholder {
            color: #555a6a;
            font-size: 10.5px;
        }

        /* Autocomplete popup */
        .mu-tag-ac-popup {
            position: absolute;
            display: none;
            z-index: 10001;
            background: #1e1e2e;
            border: 1px solid #3a3a5c;
            border-radius: 6px;
            max-height: 180px;
            overflow-y: auto;
            width: 320px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            font-size: 12px;
            font-family: 'Segoe UI', Arial, sans-serif;
        }
        .mu-tag-ac-item {
            padding: 5px 10px;
            cursor: pointer;
            color: #c8ccd4;
            border-bottom: 1px solid #2a2a3e;
        }
        .mu-tag-ac-item.selected {
            background: #2a3a5c;
        }
    `;
    document.head.appendChild(style);
}

// ─── Autocomplete Data ──────────────────────────────────────────────────
let wildcardsCache = null;
async function getWildcards() {
    if (wildcardsCache !== null) return wildcardsCache;
    try {
        const resp = await fetch("/my_utils/wildcards");
        if (!resp.ok) return [];
        wildcardsCache = await resp.json();
    } catch (e) { wildcardsCache = []; }
    return wildcardsCache;
}

const BASE_RESOLUTIONS = [
    [896, 1152], [832, 1216], [768, 1344],
    [640, 1536], [1024, 1024], [1024, 1536],
];
const SIZE_PRESETS = [];
BASE_RESOLUTIONS.forEach(([w, h]) => {
    SIZE_PRESETS.push(`/* size: ${w}x${h} */`);
    if (w !== h) SIZE_PRESETS.push(`/* size: ${h}x${w} */`);
});

// ─── Shared Autocomplete Popup ──────────────────────────────────────────
const acEl = document.createElement("div");
acEl.className = "mu-tag-ac-popup";
document.body.appendChild(acEl);

const acState = { items: [], selectedIndex: 0, onSelect: null, visible: false };

function acShow(items, rect, onSelect) {
    acState.items = items;
    acState.selectedIndex = 0;
    acState.onSelect = onSelect;
    acState.visible = true;
    acEl.innerHTML = "";
    items.forEach((item, i) => {
        const row = document.createElement("div");
        row.className = "mu-tag-ac-item" + (i === 0 ? " selected" : "");
        row.textContent = item;
        row.addEventListener("click", () => acPick(item));
        row.addEventListener("mouseenter", () => { acState.selectedIndex = i; acRender(); });
        acEl.appendChild(row);
    });
    acEl.style.left = rect.left + "px";
    acEl.style.top = (rect.bottom + 4) + "px";
    acEl.style.display = "block";
}
function acHide() { acEl.style.display = "none"; acState.visible = false; acState.onSelect = null; }
function acRender() {
    Array.from(acEl.children).forEach((ch, i) => {
        ch.className = "mu-tag-ac-item" + (i === acState.selectedIndex ? " selected" : "");
    });
}
function acMoveDown() { acState.selectedIndex = (acState.selectedIndex + 1) % acState.items.length; acRender(); }
function acMoveUp() { acState.selectedIndex = (acState.selectedIndex - 1 + acState.items.length) % acState.items.length; acRender(); }
function acPick(item) {
    if (acState.onSelect) acState.onSelect(item || acState.items[acState.selectedIndex]);
    acHide();
}
function acPickSelected() { if (acState.items.length > 0) acPick(acState.items[acState.selectedIndex]); }

document.addEventListener("click", (e) => {
    if (acState.visible && !acEl.contains(e.target)) acHide();
});

// ─── Read/Write data_payload on the node ────────────────────────────────

function readSections(node) {
    const pw = node.widgets?.find(w => w.name === "data_payload");
    if (!pw || !pw.value) return Array.from({ length: NUM_SECTIONS }, () => []);
    try {
        const parsed = JSON.parse(pw.value);
        if (Array.isArray(parsed)) {
            // Pad to NUM_SECTIONS
            while (parsed.length < NUM_SECTIONS) parsed.push([]);
            return parsed.map(s => Array.isArray(s) ? s : []);
        }
    } catch (e) { }
    return Array.from({ length: NUM_SECTIONS }, () => []);
}

function writeSections(node, allSections) {
    const pw = node.widgets?.find(w => w.name === "data_payload");
    if (pw) pw.value = JSON.stringify(allSections);
}

// ─── Weight Utilities ────────────────────────────────────────────────────

function parseWeight(tag) {
    // Match (content) or (content:weight)
    const m = tag.match(/^\((.+?)(?::(\d+\.?\d*))?\)$/);
    if (m) {
        return { content: m[1], weight: m[2] ? parseFloat(m[2]) : 1.1 };
    }
    return { content: tag, weight: 1.0 };
}

function formatWeighted(content, weight) {
    // Round to 1 decimal
    weight = Math.round(weight * 10) / 10;
    if (weight < 1.05) return content; // bare keyword
    if (Math.abs(weight - 1.1) < 0.001) return `(${content})`; // default = no number
    return `(${content}:${weight.toFixed(1)})`;
}

function increaseWeight(tag) {
    const { content, weight } = parseWeight(tag);
    return formatWeighted(content, weight + 0.1);
}

function decreaseWeight(tag) {
    const { content, weight } = parseWeight(tag);
    const newW = weight - 0.1;
    if (newW < 1.05) return content; // strip parens
    return formatWeighted(content, newW);
}

// ─── Drag & Drop Utilities ───────────────────────────────────────────────
let draggedChip = null;

function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll(".mu-tag-chip:not(.dragging)")];
    if (draggableElements.length === 0) return null;
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;
        const distance = Math.hypot(x - centerX, y - centerY);
        
        if (distance < closest.distance) {
            return { distance: distance, element: child };
        } else {
            return closest;
        }
    }, { distance: Infinity }).element;
}

// ─── Build one tag section ──────────────────────────────────────────────

function buildSection(node, sectionIndex, onChanged) {
    const wrapper = document.createElement("div");
    wrapper.className = "mu-tag-section";

    const label = document.createElement("div");
    label.className = "mu-tag-label";
    label.textContent = `Section ${sectionIndex + 1}`;
    wrapper.appendChild(label);

    const container = document.createElement("div");
    container.className = "mu-tag-container";
    container._node = node;
    wrapper.appendChild(container);

    // Prevent LiteGraph canvas panning/node dragging when clicking or interacting inside the container
    container.addEventListener("mousedown", (e) => {
        e.stopPropagation();
    });

    container.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (!draggedChip) return;
        
        e.dataTransfer.dropEffect = "move";
        
        // Find the chip element being hovered over (if any)
        const targetChip = e.target.closest(".mu-tag-chip");
        let target = null;
        
        if (targetChip) {
            if (targetChip === draggedChip) return; // Hovering over ourselves: do nothing
            
            const box = targetChip.getBoundingClientRect();
            const centerX = box.left + box.width / 2;
            const centerY = box.top + box.height / 2;
            const isAfter = (e.clientY > box.bottom) || (e.clientY >= box.top && e.clientX > centerX);
            
            target = isAfter ? targetChip.nextSibling : targetChip;
        } else {
            // Hovering over container background or input
            const closest = getDragAfterElement(container, e.clientX, e.clientY);
            if (closest) {
                const box = closest.getBoundingClientRect();
                const centerX = box.left + box.width / 2;
                const centerY = box.top + box.height / 2;
                const isAfter = (e.clientY > box.bottom) || (e.clientY >= box.top && e.clientX > centerX);
                
                target = isAfter ? closest.nextSibling : closest;
            } else {
                target = input;
            }
        }
        
        // Only insert if the target has actually changed and isn't already adjacent to the dragged chip.
        // This avoids layout flip-flopping (oscillations) that cause flashing.
        if (target && draggedChip !== target && draggedChip.nextSibling !== target) {
            container.insertBefore(draggedChip, target);
        }
    });

    container.addEventListener("drop", (e) => {
        e.preventDefault();
        const sourceNode = draggedChip?._node;
        const targetNode = container._node;
        if (sourceNode?.updateAllSectionsFromDOM) sourceNode.updateAllSectionsFromDOM();
        if (targetNode && targetNode !== sourceNode && targetNode.updateAllSectionsFromDOM) {
            targetNode.updateAllSectionsFromDOM();
        }
        draggedChip = null;
    });

    const input = document.createElement("textarea");
    input.className = "mu-tag-input comfy-multiline-input";
    input.placeholder = "Type tag, press Enter…";
    container.appendChild(input);

    // ── Render from source of truth ──
    function render() {
        container.querySelectorAll(".mu-tag-chip").forEach(c => c.remove());
        const sections = readSections(node);
        const tags = sections[sectionIndex] || [];

        tags.forEach((text, idx) => {
            const { content, weight } = parseWeight(text);
            const isWeighted = weight > 1.05;

            const chip = document.createElement("span");
            chip.className = "mu-tag-chip" + (isWeighted ? " weighted" : "");
            chip.setAttribute("draggable", "true");
            chip._tagValue = text;
            chip._node = node;

            chip.addEventListener("dragstart", (e) => {
                e.stopPropagation();
                chip.classList.add("dragging");
                draggedChip = chip;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", text);
            });

            chip.addEventListener("dragend", (e) => {
                e.stopPropagation();
                chip.classList.remove("dragging");
                const sourceNode = draggedChip?._node || node;
                const targetNode = chip.parentElement?._node;
                if (sourceNode?.updateAllSectionsFromDOM) sourceNode.updateAllSectionsFromDOM();
                if (targetNode && targetNode !== sourceNode && targetNode.updateAllSectionsFromDOM) {
                    targetNode.updateAllSectionsFromDOM();
                }
                draggedChip = null;
            });

            // [−] button
            const minusBtn = document.createElement("button");
            minusBtn.className = "mu-tag-btn minus";
            minusBtn.textContent = "−";
            minusBtn.setAttribute("draggable", "false");
            minusBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (weight <= 1.0) return; // already bare, no-op
                mutate(tags => { tags[idx] = decreaseWeight(tags[idx]); });
            });
            chip.appendChild(minusBtn);

            // Tag text (double-click to edit)
            const span = document.createElement("span");
            span.className = "mu-tag-text";
            span.textContent = content;
            span.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                chip.setAttribute("draggable", "false"); // Disable drag during edit
                
                // Replace chip internals with an inline edit input
                const editInput = document.createElement("input");
                editInput.type = "text";
                editInput.value = text; // raw value with weight syntax
                editInput.className = "mu-tag-edit";
                Object.assign(editInput.style, {
                    border: "none", outline: "none",
                    background: "rgba(255,255,255,0.08)",
                    color: "#e0e8f0", fontSize: "11px",
                    fontFamily: "inherit", borderRadius: "4px",
                    padding: "1px 4px", width: "100%",
                    minWidth: "40px", maxWidth: "200px",
                });

                // Hide all other chip children, show input
                Array.from(chip.children).forEach(ch => ch.style.display = "none");
                chip.insertBefore(editInput, chip.firstChild);
                editInput.focus();
                editInput.select();

                const finishEdit = (save) => {
                    if (editInput._done) return;
                    editInput._done = true;
                    if (save) {
                        const newVal = editInput.value.trim();
                        if (newVal && newVal !== text) {
                            mutate(tags => { tags[idx] = newVal; });
                            return; // mutate calls render(), chip is rebuilt
                        }
                    }
                    // Cancel: restore chip and re-enable drag
                    editInput.remove();
                    chip.setAttribute("draggable", "true");
                    Array.from(chip.children).forEach(ch => ch.style.display = "");
                };

                editInput.addEventListener("keydown", (ev) => {
                    ev.stopPropagation();
                    if (ev.key === "Enter") { ev.preventDefault(); finishEdit(true); }
                    if (ev.key === "Escape") { ev.preventDefault(); finishEdit(false); }
                });
                editInput.addEventListener("blur", () => finishEdit(true));
            });
            chip.appendChild(span);

            // Weight badge (only if weighted)
            if (isWeighted) {
                const badge = document.createElement("span");
                badge.className = "mu-tag-weight";
                badge.textContent = weight.toFixed(1);
                chip.appendChild(badge);
            }

            // [+] button
            const plusBtn = document.createElement("button");
            plusBtn.className = "mu-tag-btn plus";
            plusBtn.textContent = "+";
            plusBtn.setAttribute("draggable", "false");
            plusBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                mutate(tags => { tags[idx] = increaseWeight(tags[idx]); });
            });
            chip.appendChild(plusBtn);

            // [×] remove button
            const removeBtn = document.createElement("button");
            removeBtn.className = "mu-tag-btn remove";
            removeBtn.textContent = "×";
            removeBtn.setAttribute("draggable", "false");
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                removeTag(idx);
            });
            chip.appendChild(removeBtn);

            container.insertBefore(chip, input);
        });
    }

    function mutate(fn) {
        const sections = readSections(node);
        fn(sections[sectionIndex]);
        writeSections(node, sections);
        render();
        if (onChanged) onChanged();
    }

    function addTag(raw) {
        const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
        if (parts.length === 0) return;
        mutate(tags => parts.forEach(t => tags.push(t)));
    }

    function removeTag(idx) {
        mutate(tags => tags.splice(idx, 1));
    }

    function setTags(newTags) {
        const sections = readSections(node);
        sections[sectionIndex] = [...newTags];
        writeSections(node, sections);
        render();
    }

    // ── Autocomplete ──
    async function checkAutocomplete() {
        const val = input.value;
        const cursor = input.selectionStart;
        const lastWC = val.lastIndexOf("__", cursor - 1);
        const lastSZ = val.lastIndexOf("/*", cursor - 1);
        let matches = [];

        if (lastSZ !== -1 && cursor >= lastSZ + 2 && (lastWC === -1 || lastSZ > lastWC) && (cursor - lastSZ) < 25) {
            let q = val.substring(lastSZ + 2, cursor).trimStart().toLowerCase();
            if (q.startsWith("size:")) q = q.substring(5).trimStart();
            matches = SIZE_PRESETS.filter(s => {
                let c = s.slice(2, -2).trim().toLowerCase();
                if (c.startsWith("size:")) c = c.substring(5).trimStart();
                return c.includes(q);
            });
        } else if (lastWC !== -1 && cursor >= lastWC + 2 && (cursor - lastWC) < 50) {
            const q = val.substring(lastWC + 2, cursor).toLowerCase();
            const wc = await getWildcards();
            matches = wc.filter(w => w.slice(2, -2).toLowerCase().includes(q));
        }

        if (matches.length > 0) {
            const rect = input.getBoundingClientRect();
            acShow(matches.slice(0, 15), rect, (selected) => {
                input.value = "";
                addTag(selected);
                input.focus();
            });
        } else {
            acHide();
        }
    }

    // ── Input events ──
    input.addEventListener("keydown", (e) => {
        if (acState.visible) {
            if (e.key === "ArrowDown") { e.preventDefault(); acMoveDown(); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); acMoveUp(); return; }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); acPickSelected(); return; }
            if (e.key === "Escape") { e.preventDefault(); acHide(); return; }
        }
        if (e.key === "Enter") {
            e.preventDefault();
            const val = input.value.trim();
            if (val) { addTag(val); input.value = ""; acHide(); }
        }
        if (e.key === "Backspace" && input.value === "") {
            const sections = readSections(node);
            const tags = sections[sectionIndex] || [];
            if (tags.length > 0) removeTag(tags.length - 1);
        }
    });

    input.addEventListener("input", () => {
        const val = input.value;
        if (val.includes(",")) {
            const parts = val.split(",").map(s => s.trim()).filter(Boolean);
            if (parts.length > 0) {
                if (val.trimEnd().endsWith(",")) {
                    parts.forEach(t => addTag(t));
                    input.value = "";
                } else {
                    const complete = parts.slice(0, -1);
                    complete.forEach(t => addTag(t));
                    input.value = parts[parts.length - 1];
                }
            }
        }
        checkAutocomplete();
    });

    input.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text");
        if (text) { addTag(text); input.value = ""; }
    });

    container.addEventListener("click", (e) => {
        if (e.target === container) input.focus();
    });

    return { element: wrapper, render, setTags };
}

// ─── Extension ──────────────────────────────────────────────────────────

app.registerExtension({
    name: "MyUtils.TextJoinerTags",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "TextJoinerTags") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
            const node = this;

            // 1. Hide data_payload widget
            const payloadWidget = node.widgets.find(w => w.name === "data_payload");
            if (payloadWidget) {
                payloadWidget.type = "converted-widget";
                payloadWidget.computeSize = () => [0, -4];
                payloadWidget.draw = () => { };
            }

            // 2. Resize helper — only grows, never shrinks
            function resizeNode() {
                requestAnimationFrame(() => {
                    const sz = node.computeSize();
                    node.setSize([
                        Math.max(node.size[0], sz[0]),
                        Math.max(node.size[1], sz[1])
                    ]);
                    node.setDirtyCanvas?.(true, true);
                });
            }

            node.updateAllSectionsFromDOM = function () {
                const sections = [];
                node._sectionControllers.forEach((sc) => {
                    const chips = [...sc.element.querySelectorAll(".mu-tag-chip")];
                    sections.push(chips.map(c => c._tagValue).filter(Boolean));
                });
                writeSections(node, sections);
                node._sectionControllers.forEach(sc => sc.render());
                resizeNode();
            };

            // 3. Build sections
            const sectionControllers = [];
            for (let i = 0; i < NUM_SECTIONS; i++) {
                const section = buildSection(node, i, resizeNode);
                sectionControllers.push(section);
                node.addDOMWidget(`tags_${i}`, "custom", section.element, {
                    serialize: false,
                });
            }
            node._sectionControllers = sectionControllers;

            // 4. Backend → Frontend sync (splitter import)
            const onUpdate = (event) => {
                const data = event.detail;
                if (data && data.node_id == node.id && data.sections) {
                    const sections = data.sections;
                    writeSections(node, sections);
                    sectionControllers.forEach(sc => sc.render());
                    resizeNode();
                }
            };
            api.addEventListener("my_utils.text_joiner_tags.update", onUpdate);

            const origOnRemoved = node.onRemoved;
            node.onRemoved = function () {
                if (origOnRemoved) origOnRemoved.apply(this, arguments);
                api.removeEventListener("my_utils.text_joiner_tags.update", onUpdate);
            };

            // 5. Set minimum width
            if (node.size[0] < 340) node.setSize([340, node.size[1]]);

            return r;
        };

        // ── Save/Load ──
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (config) {
            if (onConfigure) onConfigure.apply(this, arguments);
            const node = this;

            // Remember the saved node size so we can restore it
            const savedSize = config?.size ? [...config.size] : null;

            // Restore data_payload from saved widgets_values
            if (config && config.widgets_values) {
                const vals = config.widgets_values;
                // data_payload is the last widget value
                const payloadStr = vals[vals.length - 1];
                if (payloadStr) {
                    const pw = node.widgets?.find(w => w.name === "data_payload");
                    if (pw) pw.value = payloadStr;
                }
            }

            // Re-hide payload widget
            const pw = node.widgets?.find(w => w.name === "data_payload");
            if (pw) {
                pw.type = "converted-widget";
                pw.computeSize = () => [0, -4];
                pw.draw = () => { };
            }

            // Re-render sections and restore node size
            // Multiple passes to handle DOM readiness timing
            const restoreSize = () => {
                if (node._sectionControllers) {
                    node._sectionControllers.forEach(sc => sc.render());
                }
                if (savedSize) {
                    node.setSize(savedSize);
                } else {
                    const sz = node.computeSize();
                    node.setSize([Math.max(node.size[0], sz[0]), sz[1]]);
                }
                node.setDirtyCanvas?.(true, true);
            };

            setTimeout(restoreSize, 50);
            setTimeout(restoreSize, 200);
        };
    }
});
