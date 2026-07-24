import os
import sys
import glob
import folder_paths
from server import PromptServer
from aiohttp import web

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif'}

def send_to_recycle_bin(path):
    """Send a file to the OS recycle bin instead of permanently deleting it.
    Uses Windows SHFileOperationW on Windows, falls back to os.remove otherwise."""
    path = os.path.abspath(path)
    if sys.platform == "win32":
        try:
            import ctypes
            from ctypes import wintypes

            class SHFILEOPSTRUCTW(ctypes.Structure):
                _fields_ = [
                    ("hwnd", wintypes.HWND),
                    ("wFunc", ctypes.c_uint),
                    ("pFrom", wintypes.LPCWSTR),
                    ("pTo", wintypes.LPCWSTR),
                    ("fFlags", ctypes.c_ushort),
                    ("fAnyOperationsAborted", wintypes.BOOL),
                    ("hNameMappings", ctypes.c_void_p),
                    ("lpszProgressTitle", wintypes.LPCWSTR),
                ]

            FO_DELETE = 0x0003
            FOF_ALLOWUNDO = 0x0040
            FOF_NOCONFIRMATION = 0x0010
            FOF_SILENT = 0x0004

            # pFrom must be double-null terminated
            fileop = SHFILEOPSTRUCTW()
            fileop.hwnd = None
            fileop.wFunc = FO_DELETE
            fileop.pFrom = path + "\0"
            fileop.pTo = None
            fileop.fFlags = FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT
            fileop.fAnyOperationsAborted = False
            fileop.hNameMappings = None
            fileop.lpszProgressTitle = None

            result = ctypes.windll.shell32.SHFileOperationW(ctypes.byref(fileop))
            if result != 0:
                raise OSError(f"SHFileOperationW failed with code {result}")
            return
        except Exception as e:
            print(f"[Gallery] Recycle bin failed, falling back to permanent delete: {e}")
    # Fallback for non-Windows or if shell API fails
    os.remove(path)

def is_safe_subpath(path, base_dir):
    try:
        resolved_base = os.path.realpath(base_dir)
        resolved_path = os.path.realpath(path)
        return os.path.commonpath([resolved_path, resolved_base]) == resolved_base
    except Exception:
        return False

def get_subfolders(base_dir):
    subfolders = [""]
    try:
        if os.path.exists(base_dir):
            for entry in os.scandir(base_dir):
                if entry.is_dir() and not entry.name.startswith('.'):
                    rel_path = entry.name
                    subfolders.append(rel_path)
                    try:
                        for subentry in os.scandir(entry.path):
                            if subentry.is_dir() and not subentry.name.startswith('.'):
                                subfolders.append(os.path.join(rel_path, subentry.name).replace("\\", "/"))
                    except Exception:
                        pass
    except Exception as e:
        print(f"[Gallery] Error scanning subfolders: {e}")
    return sorted(list(set(subfolders)))

def scan_folder_images(folder_input=""):
    output_dir = folder_paths.get_output_directory()

    # Determine target directory (Default to ComfyUI output_dir)
    folder_input = (folder_input or "").strip()
    if not folder_input:
        target_dir = output_dir
    elif os.path.isabs(folder_input):
        target_dir = os.path.normpath(folder_input)
    else:
        target_dir = os.path.normpath(os.path.join(output_dir, folder_input))

    subfolders = get_subfolders(output_dir)

    if not os.path.exists(target_dir) or not os.path.isdir(target_dir):
        return {
            "current_folder": folder_input,
            "target_dir": target_dir,
            "output_dir": output_dir,
            "subfolders": subfolders,
            "images": [],
            "error": f"Folder does not exist: {target_dir}"
        }

    # Read image file paths without moving or copying any files
    images = []
    try:
        for entry in os.scandir(target_dir):
            if entry.is_file():
                ext = os.path.splitext(entry.name)[1].lower()
                if ext in IMAGE_EXTENSIONS:
                    stat = entry.stat()
                    full_path = os.path.join(target_dir, entry.name)

                    # Check if file is physically inside output_dir (for deletion guard)
                    in_output = is_safe_subpath(full_path, output_dir)
                    subfolder = ""
                    if in_output:
                        rel = os.path.relpath(os.path.dirname(full_path), output_dir)
                        subfolder = "" if rel == "." else rel.replace("\\", "/")

                    images.append({
                        "filename": entry.name,
                        "subfolder": subfolder,
                        "full_path": full_path.replace("\\", "/"),
                        "is_in_output": in_output,
                        "mtime": stat.st_mtime,
                        "size": stat.st_size
                    })
    except Exception as e:
        print(f"[Gallery] Error scanning folder {target_dir}: {e}")

    # Initial sort by filename descending (names desc)
    images.sort(key=lambda x: x["filename"].lower(), reverse=True)

    return {
        "current_folder": folder_input,
        "target_dir": target_dir.replace("\\", "/"),
        "output_dir": output_dir.replace("\\", "/"),
        "subfolders": subfolders,
        "images": images
    }

def setup_gallery_api():
    # Endpoint 1: Read image paths from folder (default output_dir, no copying)
    @PromptServer.instance.routes.get("/my_utils/gallery/images")
    async def get_gallery_images(request):
        folder_input = request.query.get("folder", "")
        data = scan_folder_images(folder_input)
        return web.json_response(data)

    # Endpoint 2: Serve image file safely
    @PromptServer.instance.routes.get("/my_utils/gallery/view_file")
    async def view_gallery_file(request):
        file_path = request.query.get("path", "")
        if not file_path or not os.path.exists(file_path) or not os.path.isfile(file_path):
            return web.Response(status=404, text="File not found")

        ext = os.path.splitext(file_path)[1].lower()
        mime_types = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".avif": "image/avif",
            ".bmp": "image/bmp"
        }
        content_type = mime_types.get(ext, "application/octet-stream")
        return web.FileResponse(file_path, headers={"Content-Type": content_type})

    # Endpoint 3: Physical Delete (STRICT GUARD: Only allows deleting files inside output folder)
    @PromptServer.instance.routes.post("/my_utils/gallery/delete")
    async def delete_gallery_image(request):
        try:
            body = await request.json()
            file_path = body.get("path", "")
            filename = body.get("filename", "")
            folder_input = body.get("folder", "")

            output_dir = folder_paths.get_output_directory()

            if not file_path:
                if not folder_input:
                    target_dir = output_dir
                elif os.path.isabs(folder_input):
                    target_dir = folder_input
                else:
                    target_dir = os.path.join(output_dir, folder_input)
                file_path = os.path.join(target_dir, filename)

            file_path = os.path.normpath(file_path)

            if not file_path or not os.path.exists(file_path):
                return web.json_response({"error": "File does not exist"}, status=404)

            # STRICT SAFETY GUARD: Verify file is inside ComfyUI output directory
            if not is_safe_subpath(file_path, output_dir):
                return web.json_response({
                    "error": "Deletion Guard: Physical deletion is strictly restricted to files inside the ComfyUI output folder."
                }, status=403)

            send_to_recycle_bin(file_path)
            return web.json_response({"success": True, "filename": filename})

        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    # Endpoint 4: Verify and import subset of file paths inside ComfyUI output directory
    @PromptServer.instance.routes.post("/my_utils/gallery/verify_import")
    async def verify_import_gallery_images(request):
        try:
            body = await request.json()
            folder_input = body.get("folder", "")
            items = body.get("items", [])

            output_dir = folder_paths.get_output_directory()
            valid_images = []
            invalid_count = 0

            if not isinstance(items, list):
                return web.json_response({"error": "Invalid items list"}, status=400)

            for item in items:
                item_str = str(item).strip()
                if not item_str:
                    continue

                if os.path.isabs(item_str):
                    file_path = os.path.normpath(item_str)
                else:
                    # 1. Try current folder first
                    target_dir = os.path.join(output_dir, folder_input) if folder_input else output_dir
                    file_path = os.path.normpath(os.path.join(target_dir, item_str))

                    # 2. Fallback: try output root
                    if not os.path.exists(file_path):
                        file_path = os.path.normpath(os.path.join(output_dir, item_str))

                    # 3. Fallback: search all subfolders inside output/ for the bare filename
                    if not os.path.exists(file_path):
                        found = glob.glob(os.path.join(output_dir, "**", item_str), recursive=True)
                        # Filter to only files inside output_dir
                        found = [f for f in found if os.path.isfile(f) and is_safe_subpath(f, output_dir)]
                        if found:
                            file_path = os.path.normpath(found[0])

                if os.path.exists(file_path) and os.path.isfile(file_path) and is_safe_subpath(file_path, output_dir):
                    ext = os.path.splitext(file_path)[1].lower()
                    if ext in IMAGE_EXTENSIONS:
                        stat = os.stat(file_path)
                        rel = os.path.relpath(os.path.dirname(file_path), output_dir)
                        subfolder = "" if rel == "." else rel.replace("\\", "/")
                        valid_images.append({
                            "filename": os.path.basename(file_path),
                            "subfolder": subfolder,
                            "full_path": file_path.replace("\\", "/"),
                            "is_in_output": True,
                            "mtime": stat.st_mtime,
                            "size": stat.st_size
                        })
                    else:
                        invalid_count += 1
                else:
                    invalid_count += 1

            return web.json_response({
                "success": True,
                "images": valid_images,
                "invalid_count": invalid_count
            })

        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    # Endpoint 5: Export gallery images to a subfolder with sequential naming
    @PromptServer.instance.routes.post("/my_utils/gallery/export")
    async def export_gallery_images(request):
        try:
            import shutil

            body = await request.json()
            folder_name = body.get("folder", "").strip()
            images = body.get("images", [])

            if not folder_name:
                return web.json_response({"error": "Folder name is required"}, status=400)

            if not isinstance(images, list) or len(images) == 0:
                return web.json_response({"error": "No images to export"}, status=400)

            output_dir = folder_paths.get_output_directory()

            # Support absolute paths or relative to output/
            if os.path.isabs(folder_name):
                export_dir = os.path.normpath(folder_name)
            else:
                export_dir = os.path.normpath(os.path.join(output_dir, folder_name))

            os.makedirs(export_dir, exist_ok=True)

            count = 0
            for idx, img in enumerate(images):
                # Resolve source path
                full_path = img.get("full_path", "")
                filename = img.get("filename", "")
                subfolder = img.get("subfolder", "")

                if full_path:
                    src = os.path.normpath(full_path)
                elif subfolder:
                    src = os.path.normpath(os.path.join(output_dir, subfolder, filename))
                else:
                    src = os.path.normpath(os.path.join(output_dir, filename))

                if not os.path.exists(src) or not os.path.isfile(src):
                    print(f"[Gallery Export] Skipping missing file: {src}")
                    continue

                if not is_safe_subpath(src, output_dir):
                    print(f"[Gallery Export] Skipping file outside output: {src}")
                    continue

                # Sequential name: 000001.ext, preserving original extension
                ext = os.path.splitext(src)[1].lower()
                seq_name = f"{idx + 1:06d}{ext}"
                dst = os.path.join(export_dir, seq_name)

                shutil.copy2(src, dst)
                count += 1

            return web.json_response({
                "success": True,
                "count": count,
                "export_dir": export_dir.replace("\\", "/")
            })

        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
