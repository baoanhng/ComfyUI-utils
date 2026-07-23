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

.gallery-clear-btn {
    background: #27272a;
    border: 1px solid #3f3f46;
    color: #a1a1aa;
    border-radius: 6px;
    padding: 5px 8px;
    cursor: pointer;
    font-size: 12px;
}

.gallery-clear-btn:hover {
    color: #f87171;
    background: #451a1a;
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
    min-width: 170px;
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

.gallery-menu-item.disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.gallery-menu-item.disabled:hover {
    background: transparent;
}

/* Lightbox Modal */
#my-utils-gallery-modal {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 10010;
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    user-select: none;
}

#my-utils-gallery-modal.show {
    opacity: 1;
    pointer-events: auto;
}

.modal-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: calc(100vw - 160px);
    max-height: 90vh;
}

#my-utils-gallery-modal img#modal-img {
    max-width: calc(100vw - 160px);
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.8);
}

.modal-caption {
    margin-top: 12px;
    font-size: 13px;
    color: #e4e4e7;
    background: rgba(24, 24, 27, 0.85);
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid #3f3f46;
    text-align: center;
    word-break: break-all;
}

.modal-nav-btn {
    background: rgba(39, 39, 42, 0.7);
    border: 1px solid #3f3f46;
    color: #f4f4f5;
    font-size: 22px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    z-index: 10012;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.modal-nav-btn:hover {
    background: #4f46e5;
    border-color: #6366f1;
    transform: scale(1.1);
    color: #ffffff;
}

.modal-close-btn {
    position: absolute;
    top: 20px;
    right: 24px;
    background: rgba(39, 39, 42, 0.7);
    border: 1px solid #3f3f46;
    color: #f4f4f5;
    font-size: 18px;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10012;
    transition: all 0.15s ease;
}

.modal-close-btn:hover {
    background: #ef4444;
    border-color: #f87171;
}
`;

function isFolderMatch(imgSubfolder, activeFolder) {
    if (!activeFolder) return true;
    
    const normalize = (path) => {
        if (!path) return "";
        let s = path.trim().replace(/\\/g, "/").replace(/\/+$/, "");
        if (s.toLowerCase() === "output" || s.toLowerCase().endsWith("/output")) return "";
        return s.toLowerCase();
    };

    const s1 = normalize(imgSubfolder);
    const s2 = normalize(activeFolder);
    return s1 === s2;
}

class CustomGalleryPanel {
    constructor() {
        this.currentFolder = ""; // Default folder path relative to ComfyUI output
        this.viewMode = "thumbnail"; // "thumbnail" or "list"
        this.images = []; // Pure in-memory display array (retains all imported & generated images)
        this.draggedIndex = null;
        this.currentModalIndex = -1;

        this.initCSS();
        this.initDOM();

        // Restore lightweight path metadata state from localStorage across page reloads (F5)
        this.loadStateFromLocalStorage();

        // Sync restored settings to UI elements
        if (this.folderInput) this.folderInput.value = this.currentFolder;
        const thumbBtn = this.panel.querySelector("#mode-btn-thumb");
        const listBtn = this.panel.querySelector("#mode-btn-list");
        if (this.viewMode === "list") {
            if (listBtn) listBtn.classList.add("active");
            if (thumbBtn) thumbBtn.classList.remove("active");
            if (this.grid) this.grid.className = "gallery-grid mode-list";
        } else {
            if (thumbBtn) thumbBtn.classList.add("active");
            if (listBtn) listBtn.classList.remove("active");
            if (this.grid) this.grid.className = "gallery-grid mode-thumbnail";
        }

        if (this.images.length > 0) {
            this.renderGrid();
        }

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
                        <input type="text" class="gallery-folder-input" id="gallery-folder-input" placeholder="Folder path (default: ComfyUI output)" title="Folder path inside output directory" />
                        <select class="gallery-subfolder-select" id="gallery-subfolder-select" title="Quick subfolder picker"></select>
                    </div>
                    <div class="gallery-toolbar-row">
                        <button class="gallery-import-btn" id="gallery-import-btn" title="Import subset image files from ComfyUI output/">📥 Import</button>
                        <input type="file" id="gallery-file-input" accept="image/*" multiple style="display: none;" />
                        <div class="gallery-btn-group">
                            <button class="gallery-mode-btn active" id="mode-btn-thumb" title="Thumbnail View (3 cols, max 100px)">▦</button>
                            <button class="gallery-mode-btn" id="mode-btn-list" title="List View (1 col, max 300px)">☰</button>
                        </div>
                        <button class="gallery-refresh-btn" id="gallery-refresh-btn" title="Merge & Refresh Folder Images">🔄</button>
                        <button class="gallery-clear-btn" id="gallery-clear-btn" title="Clear View (Reset Gallery)">🧹</button>
                    </div>
                </div>
            </div>
            <div class="gallery-content">
                <div class="gallery-grid mode-thumbnail" id="gallery-grid"></div>
            </div>
        `;
        document.body.appendChild(this.panel);

        // Context Menu DOM with Physical Delete Guard Label
        this.contextMenu = document.createElement("div");
        this.contextMenu.id = "my-utils-gallery-contextmenu";
        this.contextMenu.innerHTML = `
            <div class="gallery-menu-item" id="ctx-view">🔍 View Fullsize</div>
            <div class="gallery-menu-item" id="ctx-open-workflow">📂 Open as Workflow</div>
            <div class="gallery-menu-item" id="ctx-copy">📋 Copy Filename</div>
            <div class="gallery-menu-item" id="ctx-remove">❌ Remove from Gallery</div>
            <div class="gallery-menu-item danger" id="ctx-delete">🗑️ Send to Recycle Bin</div>
        `;
        document.body.appendChild(this.contextMenu);

        // Lightbox Modal DOM with Prev/Next Navigation
        this.modal = document.createElement("div");
        this.modal.id = "my-utils-gallery-modal";
        this.modal.innerHTML = `
            <button class="modal-nav-btn prev" id="modal-prev-btn" title="Previous Image (Left Arrow)">❮</button>
            <div class="modal-container">
                <img id="modal-img" src="" alt="Full view" />
                <div class="modal-caption" id="modal-caption"></div>
            </div>
            <button class="modal-nav-btn next" id="modal-next-btn" title="Next Image (Right Arrow)">❯</button>
            <button class="modal-close-btn" id="modal-close-btn" title="Close (Esc)">✕</button>
        `;
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
                this.saveStateToLocalStorage();
                this.fetchImages();
            }
        });

        this.folderInput.addEventListener("blur", () => {
            const val = this.folderInput.value.trim();
            if (val !== this.currentFolder) {
                this.currentFolder = val;
                this.saveStateToLocalStorage();
                this.fetchImages();
            }
        });

        // Quick Subfolder Pick Dropdown
        this.select.addEventListener("change", (e) => {
            this.currentFolder = e.target.value;
            this.folderInput.value = e.target.value;
            this.saveStateToLocalStorage();
            this.fetchImages();
        });

        // Import Button & File Input for subset file selection
        const importBtn = this.panel.querySelector("#gallery-import-btn");
        importBtn.addEventListener("click", () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener("change", async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            const items = Array.from(files).map(f => f.name);
            await this.importSubsetFiles(items);
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
                const items = Array.from(e.dataTransfer.files).map(f => f.name);
                await this.importSubsetFiles(items);
            }
        });

        // Refresh Button
        this.panel.querySelector("#gallery-refresh-btn").addEventListener("click", () => {
            this.fetchImages();
        });

        // Clear View Button
        this.panel.querySelector("#gallery-clear-btn").addEventListener("click", () => {
            if (confirm("Reset in-memory gallery view?")) {
                this.images = [];
                try {
                    localStorage.removeItem("my_utils_gallery_paths_state");
                } catch (err) {}
                this.renderGrid();
            }
        });

        // View Mode Toggle Buttons
        const thumbBtn = this.panel.querySelector("#mode-btn-thumb");
        const listBtn = this.panel.querySelector("#mode-btn-list");

        thumbBtn.addEventListener("click", () => {
            this.viewMode = "thumbnail";
            thumbBtn.classList.add("active");
            listBtn.classList.remove("active");
            this.grid.className = "gallery-grid mode-thumbnail";
            this.saveStateToLocalStorage();
            this.renderGrid();
        });

        listBtn.addEventListener("click", () => {
            this.viewMode = "list";
            listBtn.classList.add("active");
            thumbBtn.classList.remove("active");
            this.grid.className = "gallery-grid mode-list";
            this.saveStateToLocalStorage();
            this.renderGrid();
        });

        // Global Context Menu dismiss
        document.addEventListener("click", () => {
            this.contextMenu.style.display = "none";
        });

        // Modal Controls & Event Handlers
        const prevBtn = this.modal.querySelector("#modal-prev-btn");
        const nextBtn = this.modal.querySelector("#modal-next-btn");
        const closeBtn = this.modal.querySelector("#modal-close-btn");

        prevBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.showPrevImage();
        });

        nextBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.showNextImage();
        });

        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.closeModal();
        });

        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal || e.target.classList.contains("modal-container")) {
                this.closeModal();
            }
        });

        // Keyboard Arrow & Esc listener for Modal Navigation
        document.addEventListener("keydown", (e) => {
            if (this.modal.classList.contains("show")) {
                if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    this.showPrevImage();
                } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    this.showNextImage();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    this.closeModal();
                }
            }
        });

        // Context Menu Action Handlers
        this.contextMenu.querySelector("#ctx-view").addEventListener("click", () => {
            if (this.activeContextItem) {
                const idx = this.images.indexOf(this.activeContextItem);
                this.openModal(idx >= 0 ? idx : this.activeContextItem);
            }
        });

        this.contextMenu.querySelector("#ctx-copy").addEventListener("click", () => {
            if (this.activeContextItem) {
                navigator.clipboard.writeText(this.activeContextItem.filename);
            }
        });

        this.contextMenu.querySelector("#ctx-open-workflow").addEventListener("click", async () => {
            if (this.activeContextItem) {
                await this.openAsWorkflow(this.activeContextItem);
            }
        });

        this.contextMenu.querySelector("#ctx-remove").addEventListener("click", () => {
            if (this.activeContextItem) {
                this.removeFromGallery(this.activeContextItem);
            }
        });

        this.contextMenu.querySelector("#ctx-delete").addEventListener("click", () => {
            if (this.activeContextItem) {
                this.deleteImage(this.activeContextItem);
            }
        });

        // 1. Listen for "executed" event (fires when node finishes generating images)
        api.addEventListener("executed", (event) => {
            const output = event.detail?.output;
            if (output) {
                const imgList = output.images || output.animated || output.gifs || [];
                let addedAny = false;

                for (const img of imgList) {
                    if (!img.type || img.type === "output") {
                        const imgSubfolder = img.subfolder || "";
                        const key = img.full_path || (imgSubfolder ? imgSubfolder + "/" + img.filename : img.filename);
                        const exists = this.images.some(i => (i.full_path || (i.subfolder ? i.subfolder + "/" + i.filename : i.filename)) === key);

                        if (!exists) {
                            // Prepend newly generated image path metadata to top of array
                            this.images.unshift({
                                filename: img.filename,
                                subfolder: imgSubfolder,
                                full_path: img.full_path || "",
                                is_in_output: true,
                                mtime: Date.now() / 1000,
                                size: 0
                            });
                            addedAny = true;
                        }
                    }
                }
                if (addedAny) {
                    this.saveStateToLocalStorage();
                    this.renderGrid();
                }
            }
        });
    }

    async importSubsetFiles(items) {
        try {
            const res = await fetch("/my_utils/gallery/verify_import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folder: this.currentFolder,
                    items: items
                })
            });

            if (!res.ok) {
                alert(`Import verification failed: HTTP ${res.status}`);
                return;
            }

            const data = await res.json();
            if (data.error) {
                alert(`Import error: ${data.error}`);
                return;
            }

            const validImages = data.images || [];

            if (validImages.length === 0) {
                alert("Import Guard: Selected files are outside the ComfyUI output directory or do not exist on disk.");
                return;
            }

            const existingMap = new Map();
            this.images.forEach(img => {
                const key = img.full_path || (img.subfolder ? img.subfolder + "/" + img.filename : img.filename);
                existingMap.set(key, img);
            });

            let addedCount = 0;
            validImages.forEach(img => {
                const key = img.full_path || (img.subfolder ? img.subfolder + "/" + img.filename : img.filename);
                this.removedKeys.delete(key); // User explicitly re-importing overrides prior removal
                if (!existingMap.has(key)) {
                    this.images.unshift(img);
                    existingMap.set(key, img);
                    addedCount++;
                }
            });

            if (data.invalid_count > 0) {
                alert(`Import Warning: ${addedCount} file(s) imported from output/. ${data.invalid_count} file(s) were rejected because their path is outside ComfyUI output/ directory.`);
            }

            this.saveStateToLocalStorage();
            this.renderGrid();
        } catch (e) {
            console.error("[Gallery] Import subset files error:", e);
            alert("Error verifying subset file imports.");
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

            // Replace gallery state with server-scanned images
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

            this.saveStateToLocalStorage();
            this.renderGrid();
        } catch (e) {
            console.error("[Gallery] Failed to fetch images:", e);
        }
    }

    saveStateToLocalStorage() {
        try {
            const state = {
                currentFolder: this.currentFolder || "",
                viewMode: this.viewMode || "thumbnail",
                images: this.images.map(img => ({
                    filename: img.filename,
                    subfolder: img.subfolder || "",
                    full_path: img.full_path || "",
                    is_in_output: true,
                    mtime: img.mtime || 0,
                    size: img.size || 0
                }))
            };
            localStorage.setItem("my_utils_gallery_paths_state", JSON.stringify(state));
        } catch (e) {
            console.warn("[Gallery] Failed to save path state to localStorage:", e);
        }
    }

    loadStateFromLocalStorage() {
        try {
            const saved = localStorage.getItem("my_utils_gallery_paths_state");
            if (!saved) return false;
            const state = JSON.parse(saved);
            if (state) {
                if (typeof state.currentFolder === "string") {
                    this.currentFolder = state.currentFolder;
                }
                if (state.viewMode === "thumbnail" || state.viewMode === "list") {
                    this.viewMode = state.viewMode;
                }
                if (Array.isArray(state.images) && state.images.length > 0) {
                    // Ensure only path metadata objects exist
                    this.images = state.images.map(img => ({
                        filename: img.filename,
                        subfolder: img.subfolder || "",
                        full_path: img.full_path || "",
                        is_in_output: true,
                        mtime: img.mtime || 0,
                        size: img.size || 0
                    }));
                }
                return true;
            }
        } catch (e) {
            console.warn("[Gallery] Failed to load path state from localStorage:", e);
        }
        return false;
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
                    this.openModal(idx);
                }
            });

            // Right click context menu
            card.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                this.activeContextItem = img;
                this.showContextMenu(e.clientX, e.clientY);
            });

            // Drag and drop events for pure in-memory reordering (no file renaming on disk!)
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
        const deleteItem = this.contextMenu.querySelector("#ctx-delete");

        if (this.activeContextItem && !this.activeContextItem.is_in_output) {
            deleteItem.classList.add("disabled");
            deleteItem.title = "Security Guard: Physical delete is restricted to files inside ComfyUI output folder.";
        } else {
            deleteItem.classList.remove("disabled");
            deleteItem.title = "Physically delete file from disk";
        }

        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = "block";
    }

    openModal(target) {
        if (!this.images || this.images.length === 0) return;

        let index = -1;
        if (typeof target === "number") {
            index = target;
        } else if (target && typeof target === "object") {
            index = this.images.indexOf(target);
        }

        if (index < 0 || index >= this.images.length) return;

        this.currentModalIndex = index;
        const img = this.images[index];
        const imageUrl = this.getImageUrl(img);

        const modalImg = this.modal.querySelector("#modal-img");
        const modalCaption = this.modal.querySelector("#modal-caption");

        modalImg.src = imageUrl;
        modalCaption.textContent = `${img.filename} (${index + 1} / ${this.images.length})`;
        this.modal.classList.add("show");
    }

    showPrevImage() {
        if (!this.images || this.images.length === 0) return;
        let prevIndex = this.currentModalIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.images.length - 1;
        }
        this.openModal(prevIndex);
    }

    showNextImage() {
        if (!this.images || this.images.length === 0) return;
        let nextIndex = this.currentModalIndex + 1;
        if (nextIndex >= this.images.length) {
            nextIndex = 0;
        }
        this.openModal(nextIndex);
    }

    closeModal() {
        this.modal.classList.remove("show");
        this.currentModalIndex = -1;
    }

    async deleteImage(img) {
        // STRICT SAFETY GUARD: Verify file is in output folder
        if (!img.is_in_output) {
            alert("Security Guard: Physical deletion is strictly restricted to files inside the ComfyUI output folder.");
            return;
        }

        if (!confirm(`Are you sure you want to physically delete "${img.filename}" from disk?`)) {
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
                const errData = await res.json().catch(() => ({}));
                alert(`Delete failed: ${errData.error || res.statusText}`);
                return;
            }

            const data = await res.json();
            if (data.success) {
                this.images = this.images.filter(i => i.filename !== img.filename && i.full_path !== img.full_path);
                if (this.currentModalIndex >= 0) {
                    if (this.images.length === 0) {
                        this.closeModal();
                    } else {
                        const nextIdx = Math.min(this.currentModalIndex, this.images.length - 1);
                        this.openModal(nextIdx);
                    }
                }
                this.saveStateToLocalStorage();
                this.renderGrid();
            } else {
                alert(`Delete failed: ${data.error || "Unknown error"}`);
            }
        } catch (e) {
            console.error("[Gallery] Delete error:", e);
            alert("Error deleting image file.");
        }
    }

    async openAsWorkflow(img) {
        try {
            const imageUrl = this.getImageUrl(img);
            const res = await fetch(imageUrl);
            if (!res.ok) {
                alert(`Failed to fetch image: HTTP ${res.status}`);
                return;
            }
            const blob = await res.blob();
            const file = new File([blob], img.filename, { type: blob.type || "image/png" });
            if (app.handleFile) {
                app.handleFile(file);
            } else {
                alert("app.handleFile is not available in this version of ComfyUI.");
            }
        } catch (e) {
            console.error("[Gallery] Open as workflow error:", e);
            alert("Error loading workflow from image.");
        }
    }

    removeFromGallery(img) {
        const key = img.full_path || (img.subfolder ? img.subfolder + "/" + img.filename : img.filename);
        this.images = this.images.filter(i => {
            const k = i.full_path || (i.subfolder ? i.subfolder + "/" + i.filename : i.filename);
            return k !== key;
        });
        this.saveStateToLocalStorage();
        this.renderGrid();
    }

    reorderImages(fromIdx, toIdx) {
        // Reorder strictly in memory (no file renaming on disk!)
        const movedItem = this.images.splice(fromIdx, 1)[0];
        this.images.splice(toIdx, 0, movedItem);
        this.saveStateToLocalStorage();
        this.renderGrid();
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
