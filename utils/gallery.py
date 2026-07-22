import os
import re
import glob
import uuid
import folder_paths
from server import PromptServer
from aiohttp import web

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif'}

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

def get_images_in_folder(folder_input=""):
    output_dir = folder_paths.get_output_directory()

    # Determine target directory (Default to output_dir out of the box)
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

    # Collect image files in target_dir
    images = []
    try:
        for entry in os.scandir(target_dir):
            if entry.is_file():
                ext = os.path.splitext(entry.name)[1].lower()
                if ext in IMAGE_EXTENSIONS:
                    stat = entry.stat()
                    full_path = os.path.join(target_dir, entry.name)

                    # Compute subfolder relative to output_dir if applicable
                    subfolder = ""
                    if is_safe_subpath(full_path, output_dir):
                        rel = os.path.relpath(os.path.dirname(full_path), output_dir)
                        subfolder = "" if rel == "." else rel.replace("\\", "/")

                    images.append({
                        "filename": entry.name,
                        "subfolder": subfolder,
                        "full_path": full_path.replace("\\", "/"),
                        "mtime": stat.st_mtime,
                        "size": stat.st_size
                    })
    except Exception as e:
        print(f"[Gallery] Error reading folder {target_dir}: {e}")

    # Sort images by filename descending (names desc) as requested
    images.sort(key=lambda x: x["filename"].lower(), reverse=True)

    return {
        "current_folder": folder_input,
        "target_dir": target_dir.replace("\\", "/"),
        "output_dir": output_dir.replace("\\", "/"),
        "subfolders": subfolders,
        "images": images
    }

def setup_gallery_api():
    # Endpoint 1: Fetch images in folder (default output_dir, sorted by names desc)
    @PromptServer.instance.routes.get("/my_utils/gallery/images")
    async def get_gallery_images(request):
        folder_input = request.query.get("folder", "")
        data = get_images_in_folder(folder_input)
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

    # Endpoint 3: Reorder images (with safe multi-phase renaming)
    @PromptServer.instance.routes.post("/my_utils/gallery/reorder")
    async def reorder_gallery_images(request):
        try:
            body = await request.json()
            folder_input = body.get("folder", "")
            filenames = body.get("filenames", [])

            if not isinstance(filenames, list) or not filenames:
                return web.json_response({"error": "Invalid filenames list"}, status=400)

            output_dir = folder_paths.get_output_directory()
            if not folder_input:
                target_dir = output_dir
            elif os.path.isabs(folder_input):
                target_dir = os.path.normpath(folder_input)
            else:
                target_dir = os.path.normpath(os.path.join(output_dir, folder_input))

            if not os.path.exists(target_dir):
                return web.json_response({"error": "Invalid directory path"}, status=400)

            # Phase 1: Rename existing files to temporary names
            temp_map = {}
            batch_id = uuid.uuid4().hex[:8]

            for idx, fname in enumerate(filenames):
                src_path = os.path.join(target_dir, fname)
                if os.path.isfile(src_path):
                    ext = os.path.splitext(fname)[1]
                    clean_name = re.sub(r'^\d{4}_', '', fname)
                    temp_fname = f".tmp_reorder_{batch_id}_{idx}{ext}"
                    temp_path = os.path.join(target_dir, temp_fname)

                    try:
                        os.rename(src_path, temp_path)
                        temp_map[temp_path] = clean_name
                    except Exception as err:
                        print(f"[Gallery] Failed to temp-rename {fname}: {err}")

            # Phase 2: Apply ordered numerical prefix
            renamed_list = []
            for idx, (temp_path, clean_name) in enumerate(temp_map.items()):
                new_fname = f"{idx + 1:04d}_{clean_name}"
                new_path = os.path.join(target_dir, new_fname)
                try:
                    os.rename(temp_path, new_path)
                    renamed_list.append(new_fname)
                except Exception as err:
                    print(f"[Gallery] Failed final rename {temp_path} -> {new_fname}: {err}")

            return web.json_response({"success": True, "renamed": renamed_list})

        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    # Endpoint 4: Delete image file physically
    @PromptServer.instance.routes.post("/my_utils/gallery/delete")
    async def delete_gallery_image(request):
        try:
            body = await request.json()
            file_path = body.get("path", "")
            filename = body.get("filename", "")
            folder_input = body.get("folder", "")

            if not file_path:
                output_dir = folder_paths.get_output_directory()
                if not folder_input:
                    target_dir = output_dir
                elif os.path.isabs(folder_input):
                    target_dir = folder_input
                else:
                    target_dir = os.path.join(output_dir, folder_input)
                file_path = os.path.join(target_dir, filename)

            if not file_path or not os.path.exists(file_path):
                return web.json_response({"error": "File does not exist"}, status=404)

            os.remove(file_path)
            return web.json_response({"success": True, "filename": filename})

        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    # Endpoint 5: Upload/Import images into target directory
    @PromptServer.instance.routes.post("/my_utils/gallery/upload")
    async def upload_gallery_images(request):
        try:
            reader = await request.multipart()
            folder_input = ""
            uploaded_files = []
            output_dir = folder_paths.get_output_directory()

            while True:
                part = await reader.next()
                if part is None:
                    break

                if part.name == "folder":
                    folder_input = await part.text()
                    continue

                if part.filename:
                    clean_filename = os.path.basename(part.filename)
                    ext = os.path.splitext(clean_filename)[1].lower()
                    if ext not in IMAGE_EXTENSIONS:
                        continue

                    if not folder_input:
                        target_dir = output_dir
                    elif os.path.isabs(folder_input):
                        target_dir = os.path.normpath(folder_input)
                    else:
                        target_dir = os.path.normpath(os.path.join(output_dir, folder_input))

                    os.makedirs(target_dir, exist_ok=True)
                    file_path = os.path.join(target_dir, clean_filename)

                    base, extension = os.path.splitext(clean_filename)
                    counter = 1
                    while os.path.exists(file_path):
                        clean_filename = f"{base}_{counter}{extension}"
                        file_path = os.path.join(target_dir, clean_filename)
                        counter += 1

                    with open(file_path, "wb") as f:
                        while True:
                            chunk = await part.read_chunk()
                            if not chunk:
                                break
                            f.write(chunk)

                    uploaded_files.append(clean_filename)

            return web.json_response({"success": True, "uploaded": uploaded_files})

        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
