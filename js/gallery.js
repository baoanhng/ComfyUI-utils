import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Inject CSS Styles for Gallery Panel & Components
const galleryStyles = `
#my-utils-gallery-panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 350px;
    background: #18181b;
    color: #f4f4f5;
    z-index: 9999;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transform: translateX(-350px);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    border-right: 1px solid #27272a;
}

#my-utils-gallery-panel.open {
    transform: translateX(0);
}

#my-utils-gallery-panel.drag-file-over {
    border-right: 2px dashed #6366f1;
    background: #1e1e24;
}

.gallery-dock-btn {
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    font-weight: 500 !important;
    transition: all 0.15s ease !important;
}

.gallery-dock-btn:hover {
    filter: brightness(1.2);
}

.gallery-header {
    padding: 12px 14px;
    background: #202023;
    border-bottom: 1px solid #27272a;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.gallery-header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.gallery-title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3px;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
}

.gallery-close-btn {
    background: transparent;
    border: none;
    color: #a1a1aa;
    font-size: 18px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
}

.gallery-close-btn:hover {
    color: #ffffff;
    background: #3f3f46;
}

.gallery-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.gallery-input-group {
    display: flex;
    gap: 6px;
}

.gallery-folder-input {
    flex: 1;
    background: #18181b;
    color: #e4e4e7;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
    outline: none;
}

.gallery-folder-input:focus {
    border-color: #6366f1;
}

.gallery-subfolder-select {
    background: #18181b;
    color: #e4e4e7;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
    outline: none;
    max-width: 140px;
}

.gallery-subfolder-select:focus {
    border-color: #6366f1;
}

.gallery-toolbar-row {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: space-between;
}

.gallery-import-btn {
    background: #4f46e5;
    border: 1px solid #6366f1;
    color: #ffffff;
    border-radius: 6px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: background 0.15s;
}

.gallery-import-btn:hover {
    background: #6366f1;
}

.gallery-btn-group {
    display: flex;
    background: #18181b;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    overflow: hidden;
}

.gallery-mode-btn {
    background: transparent;
    border: none;
    color: #a1a1aa;
    padding: 5px 8px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.15s, color 0.15s;
}

.gallery-mode-btn.active {
    background: #3f3f46;
    color: #ffffff;
    font-weight: 600;
}

.gallery-refresh-btn {
    background: #27272a;
    border: 1px solid #3f3f46;
    color: #a1a1aa;
    border-radius: 6px;
    padding: 5px 8px;
    cursor: pointer;
}

.gallery-refresh-btn:hover {
    color: #ffffff;
    background: #3f3f46;
}

.gallery-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
}

.gallery-content::-webkit-scrollbar {
    width: 6px;
}

.gallery-content::-webkit-scrollbar-track {
    background: #18181b;
}

.gallery-content::-webkit-scrollbar-thumb {
    background: #3f3f46;
    border-radius: 3px;
}

/* View Mode: Thumbnail (3 columns, max-width 100px) */
.gallery-grid.mode-thumbnail {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}

.gallery-grid.mode-thumbnail .gallery-card {
    max-width: 100px;
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    background: #27272a;
    border: 1px solid #3f3f46;
    cursor: grab;
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.gallery-grid.mode-thumbnail .gallery-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
}

/* View Mode: List (1 big image per row, max-width 300px) */
.gallery-grid.mode-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
}

.gallery-grid.mode-list .gallery-card {
    width: 100%;
    max-width: 300px;
    border-radius: 8px;
    overflow: hidden;
    background: #202023;
    border: 1px solid #3f3f46;
    cursor: grab;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: transform 0.15s, box-shadow 0.15s;
}

.gallery-grid.mode-list .gallery-card img {
    width: 100%;
    max-width: 300px;
    height: auto;
    max-height: 300px;
    object-fit: contain;
    display: block;
    background: #18181b;
    pointer-events: none;
}

.gallery-grid.mode-list .gallery-card-info {
    padding: 6px 10px;
    font-size: 11px;
    color: #a1a1aa;
    background: #202023;
    border-top: 1px solid #27272a;
    word-break: break-all;
}

.gallery-card:hover {
    border-color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.gallery-card.dragging {
    opacity: 0.4;
    border: 2px dashed #6366f1;
}

.gallery-card.drag-over {
    border: 2px solid #818cf8;
    transform: scale(1.02);
}

.gallery-empty {
    text-align: center;
    padding: 40px 10px;
    color: #71717a;
    font-size: 13px;
    line-height: 1.5;
}

/* Custom Context Menu */
#my-utils-gallery-contextmenu {
    position: fixed;
    z-index: 10005;
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    padding: 4px;
    min-width: 140px;
    display: none;
}

.gallery-menu-item {
    padding: 8px 12px;
    font-size: 12px;
    color: #f4f4f5;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.gallery-menu-item:hover {
    background: #3f3f46;
}

.gallery-menu-item.danger {
    color: #f87171;
}

.gallery-menu-item.danger:hover {
    background: #451a1a;
}

/* Lightbox Modal */
#my-utils-gallery-modal {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 10010;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
}

#my-utils-gallery-modal.show {
    opacity: 1;
    pointer-events: auto;
}

#my-utils-gallery-modal img {
    max-width: 90vw;
    max-height: 90vh;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.8);
}
`;

class CustomGalleryPanel {
    constructor() {
        this.currentFolder = ""; // Empty string defaults to ComfyUI base output directory out of the box
        this.viewMode = "thumbnail"; // "thumbnail" or "list"
        this.images = [];
        this.draggedIndex = null;

        this.initCSS();
        this.initDOM();
        this.initEvents();

        // Inject dock button near Manager button
        this.tryInjectDockButton();
    }

    initCSS() {
        const style = document.createElement("style");
        style.textContent = galleryStyles;
        document.head.appendChild(style);
    }

    initDOM() {
        // Main Floating/Docked Panel
        this.panel = document.createElement("div");
        this.panel.id = "my-utils-gallery-panel";
        this.panel.innerHTML = `
            <div class="gallery-header">
                <div class="gallery-header-top">
                    <h3 class="gallery-title">🖼️ Output Gallery</h3>
                    <button class="gallery-close-btn" id="gallery-close-btn" title="Close Panel">✕</button>
                </div>
                <div class="gallery-controls">
                    <div class="gallery-input-group">
                        <input type="text" class="gallery-folder-input" id="gallery-folder-input" placeholder="Folder path (default: ComfyUI output)" title="Folder path to scan (relative to output or absolute)" />
                        <select class="gallery-subfolder-select" id="gallery-subfolder-select" title="Quick subfolder picker"></select>
                    </div>
                    <div class="gallery-toolbar-row">
                        <button class="gallery-import-btn" id="gallery-import-btn" title="Import/Upload Images to Folder">📥 Import</button>
                        <input type="file" id="gallery-file-input" accept="image/*" multiple style="display: none;" />
                        <div class="gallery-btn-group">
                            <button class="gallery-mode-btn active" id="mode-btn-thumb" title="Thumbnail View (3 cols, max 100px)">▦</button>
                            <button class="gallery-mode-btn" id="mode-btn-list" title="List View (1 col, max 300px)">☰</button>
                        </div>
                        <button class="gallery-refresh-btn" id="gallery-refresh-btn" title="Refresh Images">🔄</button>
                    </div>
                </div>
            </div>
            <div class="gallery-content">
                <div class="gallery-grid mode-thumbnail" id="gallery-grid"></div>
            </div>
        `;
        document.body.appendChild(this.panel);

        // Context Menu DOM
        this.contextMenu = document.createElement("div");
        this.contextMenu.id = "my-utils-gallery-contextmenu";
        this.contextMenu.innerHTML = `
            <div class="gallery-menu-item" id="ctx-view">🔍 View Fullsize</div>
            <div class="gallery-menu-item" id="ctx-copy">📋 Copy Filename</div>
            <div class="gallery-menu-item danger" id="ctx-delete">🗑️ Delete Image</div>
        `;
        document.body.appendChild(this.contextMenu);

        // Lightbox Modal DOM
        this.modal = document.createElement("div");
        this.modal.id = "my-utils-gallery-modal";
        this.modal.innerHTML = `<img id="modal-img" src="" alt="Full view" />`;
        document.body.appendChild(this.modal);

        this.grid = this.panel.querySelector("#gallery-grid");
        this.folderInput = this.panel.querySelector("#gallery-folder-input");
        this.select = this.panel.querySelector("#gallery-subfolder-select");
        this.fileInput = this.panel.querySelector("#gallery-file-input");
        this.activeContextItem = null;
    }

    tryInjectDockButton(retries = 0) {
        if (document.getElementById("my-utils-gallery-dock-btn")) return;

        // 1. Locate Manager button specifically
        const buttons = Array.from(document.querySelectorAll("button"));
        const managerBtn = buttons.find(b => {
            const title = (b.getAttribute("title") || b.getAttribute("aria-label") || b.textContent || "").trim();
            return title.includes("Manager");
        });

        const dockBtn = document.createElement("button");
        dockBtn.id = "my-utils-gallery-dock-btn";
        dockBtn.title = "Output Gallery";
        dockBtn.setAttribute("aria-label", "Output Gallery");
        dockBtn.className = "comfyui-button gallery-dock-btn";
        dockBtn.innerHTML = `<i class="mdi mdi-image-multiple" style="font-size: 16px;"></i><span>Gallery</span>`;
        dockBtn.addEventListener("click", () => this.togglePanel());

        if (managerBtn) {
            const btnGroup = document.createElement("div");
            btnGroup.className = "comfyui-button-group";
            btnGroup.appendChild(dockBtn);

            const parentGroup = managerBtn.closest(".comfyui-button-group");
            if (parentGroup && parentGroup.parentNode) {
                parentGroup.parentNode.insertBefore(btnGroup, parentGroup.nextSibling);
            } else if (managerBtn.parentNode) {
                managerBtn.parentNode.insertBefore(dockBtn, managerBtn.nextSibling);
            }
            return;
        }

        // 2. Fallback: Search for actionbar containers or action-bar-buttons
        const actionBarButtons = document.querySelector('[data-testid="action-bar-buttons"], .actionbar-container, .legacy-topbar-container');
        if (actionBarButtons) {
            const btnGroup = document.createElement("div");
            btnGroup.className = "comfyui-button-group";
            btnGroup.appendChild(dockBtn);
            actionBarButtons.appendChild(btnGroup);
            return;
        }

        // 3. Fallback: Check standard ComfyUI menu dock containers
        const topDock = document.querySelector(".comfyui-menu-dock, .comfyui-menu, .comfy-menu, .side-tool-bar, .top-bar-right");
        if (topDock) {
            dockBtn.className = "comfy-btn gallery-dock-btn";
            topDock.appendChild(dockBtn);
            return;
        }

        // Retry if DOM elements are still rendering
        if (retries < 25) {
            setTimeout(() => this.tryInjectDockButton(retries + 1), 400);
        }
    }

    initEvents() {
        // Close Button
        this.panel.querySelector("#gallery-close-btn").addEventListener("click", () => this.closePanel());

        // Folder Input Text Change
        this.folderInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.currentFolder = this.folderInput.value.trim();
                this.fetchImages();
            }
        });

        this.folderInput.addEventListener("blur", () => {
            const val = this.folderInput.value.trim();
            if (val !== this.currentFolder) {
                this.currentFolder = val;
                this.fetchImages();
            }
        });

        // Quick Subfolder Pick Dropdown
        this.select.addEventListener("change", (e) => {
            this.currentFolder = e.target.value;
            this.folderInput.value = e.target.value;
            this.fetchImages();
        });

        // Import Button & File Input
        const importBtn = this.panel.querySelector("#gallery-import-btn");
        importBtn.addEventListener("click", () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener("change", async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            await this.uploadFiles(files);
            this.fileInput.value = "";
        });

        // External File Drag and Drop onto Panel
        this.panel.addEventListener("dragover", (e) => {
            if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                this.panel.classList.add("drag-file-over");
            }
        });

        this.panel.addEventListener("dragleave", (e) => {
            if (!this.panel.contains(e.relatedTarget)) {
                this.panel.classList.remove("drag-file-over");
            }
        });

        this.panel.addEventListener("drop", async (e) => {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                e.preventDefault();
                this.panel.classList.remove("drag-file-over");
                await this.uploadFiles(e.dataTransfer.files);
            }
        });

        // Refresh Button
        this.panel.querySelector("#gallery-refresh-btn").addEventListener("click", () => {
            this.fetchImages();
        });

        // View Mode Toggle Buttons
        const thumbBtn = this.panel.querySelector("#mode-btn-thumb");
        const listBtn = this.panel.querySelector("#mode-btn-list");

        thumbBtn.addEventListener("click", () => {
            this.viewMode = "thumbnail";
            thumbBtn.classList.add("active");
            listBtn.classList.remove("active");
            this.grid.className = "gallery-grid mode-thumbnail";
            this.renderGrid();
        });

        listBtn.addEventListener("click", () => {
            this.viewMode = "list";
            listBtn.classList.add("active");
            thumbBtn.classList.remove("active");
            this.grid.className = "gallery-grid mode-list";
            this.renderGrid();
        });

        // Global Context Menu dismiss
        document.addEventListener("click", () => {
            this.contextMenu.style.display = "none";
        });

        // Modal Close
        this.modal.addEventListener("click", () => {
            this.modal.classList.remove("show");
        });

        // Context Menu Action Handlers
        this.contextMenu.querySelector("#ctx-view").addEventListener("click", () => {
            if (this.activeContextItem) {
                this.openModal(this.activeContextItem);
            }
        });

        this.contextMenu.querySelector("#ctx-copy").addEventListener("click", () => {
            if (this.activeContextItem) {
                navigator.clipboard.writeText(this.activeContextItem.filename);
            }
        });

        this.contextMenu.querySelector("#ctx-delete").addEventListener("click", () => {
            if (this.activeContextItem) {
                this.deleteImage(this.activeContextItem);
            }
        });

        // Listen for new images generated by ComfyUI
        api.addEventListener("executed", (event) => {
            const output = event.detail?.output;
            if (output && output.images) {
                let addedAny = false;
                for (const img of output.images) {
                    if (img.type === "output") {
                        const imgSubfolder = img.subfolder || "";
                        if (!this.currentFolder || imgSubfolder === this.currentFolder) {
                            // Insert newly generated image at top of list
                            this.images.unshift({
                                filename: img.filename,
                                subfolder: imgSubfolder,
                                full_path: "",
                                mtime: Date.now() / 1000,
                                size: 0
                            });
                            addedAny = true;
                        }
                    }
                }
                if (addedAny) {
                    this.images.sort((a, b) => b.filename.localeCompare(a.filename));
                    this.renderGrid();
                }
            }
        });
    }

    async uploadFiles(fileList) {
        const formData = new FormData();
        formData.append("folder", this.currentFolder);
        for (let i = 0; i < fileList.length; i++) {
            formData.append("images", fileList[i]);
        }

        try {
            const res = await fetch("/my_utils/gallery/upload", {
                method: "POST",
                body: formData
            });
            if (!res.ok) {
                alert(`Upload failed: HTTP ${res.status}`);
                return;
            }
            const data = await res.json();
            if (data.success) {
                this.fetchImages();
            } else {
                alert("Import failed: " + (data.error || "Unknown error"));
            }
        } catch (e) {
            console.error("[Gallery] Upload error:", e);
            alert("Error importing image files.");
        }
    }

    togglePanel() {
        if (this.panel.classList.contains("open")) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    openPanel() {
        this.panel.classList.add("open");
        if (this.images.length === 0) {
            this.fetchImages();
        }
    }

    closePanel() {
        this.panel.classList.remove("open");
    }

    async fetchImages() {
        try {
            const folderParam = encodeURIComponent(this.currentFolder || "");
            const res = await fetch(`/my_utils/gallery/images?folder=${folderParam}`);

            if (!res.ok) {
                console.error(`[Gallery] HTTP Error ${res.status}: ${res.statusText}`);
                return;
            }

            const data = await res.json();

            if (data.error) {
                console.error("[Gallery] Backend message:", data.error);
            }

            this.images = data.images || [];

            // Update subfolders dropdown
            this.select.innerHTML = "";
            const defaultOpt = document.createElement("option");
            defaultOpt.value = "";
            defaultOpt.textContent = "📁 output (Root)";
            this.select.appendChild(defaultOpt);

            (data.subfolders || []).forEach(sf => {
                if (sf) {
                    const opt = document.createElement("option");
                    opt.value = sf;
                    opt.textContent = `📁 ${sf}`;
                    if (sf === this.currentFolder) opt.selected = true;
                    this.select.appendChild(opt);
                }
            });

            this.renderGrid();
        } catch (e) {
            console.error("[Gallery] Failed to fetch images:", e);
        }
    }

    getImageUrl(img) {
        if (img.full_path) {
            return `/my_utils/gallery/view_file?path=${encodeURIComponent(img.full_path)}`;
        }
        return `/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=output`;
    }

    renderGrid() {
        this.grid.innerHTML = "";

        if (!this.images || this.images.length === 0) {
            this.grid.innerHTML = `<div class="gallery-empty">No images found.<br/><br/>Default folder: <code>ComfyUI/output</code>.<br/>Type a folder path above or click <b>📥 Import</b> to add files.</div>`;
            return;
        }

        this.images.forEach((img, idx) => {
            const card = document.createElement("div");
            card.className = "gallery-card";
            card.draggable = true;
            card.dataset.index = idx;

            const imageUrl = this.getImageUrl(img);

            if (this.viewMode === "thumbnail") {
                card.innerHTML = `<img src="${imageUrl}" loading="lazy" alt="${img.filename}" title="${img.filename}" />`;
            } else {
                card.innerHTML = `
                    <img src="${imageUrl}" loading="lazy" alt="${img.filename}" />
                    <div class="gallery-card-info">${img.filename}</div>
                `;
            }

            // Click to open fullsize preview
            card.addEventListener("click", (e) => {
                if (e.button === 0) { // Left click
                    this.openModal(img);
                }
            });

            // Right click context menu
            card.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                this.activeContextItem = img;
                this.showContextMenu(e.clientX, e.clientY);
            });

            // Drag and drop events for reordering
            card.addEventListener("dragstart", (e) => {
                this.draggedIndex = idx;
                card.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", idx);
            });

            card.addEventListener("dragend", () => {
                card.classList.remove("dragging");
                this.grid.querySelectorAll(".gallery-card").forEach(c => c.classList.remove("drag-over"));
            });

            card.addEventListener("dragover", (e) => {
                e.preventDefault();
                card.classList.add("drag-over");
            });

            card.addEventListener("dragleave", () => {
                card.classList.remove("drag-over");
            });

            card.addEventListener("drop", (e) => {
                e.preventDefault();
                card.classList.remove("drag-over");
                const fromIdx = this.draggedIndex;
                const toIdx = idx;

                if (fromIdx !== null && fromIdx !== toIdx) {
                    this.reorderImages(fromIdx, toIdx);
                }
            });

            this.grid.appendChild(card);
        });
    }

    showContextMenu(x, y) {
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = "block";
    }

    openModal(img) {
        const imageUrl = this.getImageUrl(img);
        const modalImg = this.modal.querySelector("#modal-img");
        modalImg.src = imageUrl;
        this.modal.classList.add("show");
    }

    async deleteImage(img) {
        if (!confirm(`Are you sure you want to physically delete "${img.filename}"?`)) {
            return;
        }

        try {
            const res = await fetch("/my_utils/gallery/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folder: this.currentFolder,
                    filename: img.filename,
                    path: img.full_path
                })
            });

            if (!res.ok) {
                alert(`Delete failed: HTTP ${res.status}`);
                return;
            }

            const data = await res.json();
            if (data.success) {
                this.images = this.images.filter(i => i.filename !== img.filename);
                this.renderGrid();
            } else {
                alert(`Delete failed: ${data.error || "Unknown error"}`);
            }
        } catch (e) {
            console.error("[Gallery] Delete error:", e);
            alert("Error deleting image file.");
        }
    }

    async reorderImages(fromIdx, toIdx) {
        // Reorder locally first for instant feedback
        const movedItem = this.images.splice(fromIdx, 1)[0];
        this.images.splice(toIdx, 0, movedItem);
        this.renderGrid();

        // Send new order to backend to physically rename files
        try {
            const filenames = this.images.map(img => img.filename);
            const res = await fetch("/my_utils/gallery/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folder: this.currentFolder,
                    filenames: filenames
                })
            });

            if (!res.ok) return;

            const data = await res.json();
            if (data.success) {
                this.fetchImages();
            }
        } catch (e) {
            console.error("[Gallery] Reorder error:", e);
        }
    }
}

let galleryPanelInstance = null;

app.registerExtension({
    name: "my_utils.Gallery",
    actionBarButtons: [
        {
            icon: "icon-[lucide--images] size-4",
            tooltip: "Output Gallery",
            onClick: () => {
                if (galleryPanelInstance) {
                    galleryPanelInstance.togglePanel();
                }
            }
        }
    ],
    async setup() {
        galleryPanelInstance = new CustomGalleryPanel();
        window.__myUtilsGalleryPanel = galleryPanelInstance;

        // Fallback for older frontend versions that do not render actionBarButtons automatically
        setTimeout(() => {
            const hasActionBarBtn = document.querySelector('button[aria-label="Output Gallery"], button[title="Output Gallery"]');
            if (!hasActionBarBtn) {
                galleryPanelInstance.tryInjectDockButton();
            }
        }, 800);
    }
});

