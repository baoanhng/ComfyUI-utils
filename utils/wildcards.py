import os
import glob
import yaml
from server import PromptServer
from aiohttp import web

def scan_wildcard_dir(wildcard_path):
    wildcards = []
    if not os.path.exists(wildcard_path):
        return wildcards

    # 1. Scan .txt files
    txt_files = glob.glob(os.path.join(wildcard_path, "**", "*.txt"), recursive=True)
    for f in txt_files:
        filename = os.path.relpath(f, wildcard_path)
        name, _ = os.path.splitext(filename)
        # Normalize path separators for wildcard name
        name = name.replace("\\", "/")
        wildcards.append(f"__{name}__")

    # 2. Scan .yaml files
    yaml_files = glob.glob(os.path.join(wildcard_path, "**", "*.yaml"), recursive=True)
    
    def parse_yaml_node(node, prefix=""):
        items = []
        if isinstance(node, dict):
            for k, v in node.items():
                current_key = f"{prefix}/{k}" if prefix else k
                items.extend(parse_yaml_node(v, current_key))
        elif isinstance(node, list):
            items.append(f"__{prefix}__")
        return items

    for f in yaml_files:
        try:
            with open(f, 'r', encoding='utf-8') as file:
                data = yaml.safe_load(file)
                if data:
                    # Get relative path of the yaml file to use as prefix if needed
                    # Actually Impact Pack usually treats the key in YAML as the wildcard name
                    # but some implementations might use the filename.
                    # Looking at the original code, it didn't use the filename for YAML.
                    wildcards.extend(parse_yaml_node(data))
        except Exception as e:
            print(f"[TextJoiner] Error parsing YAML {f}: {e}")
            
    return wildcards

def get_wildcards():
    all_wildcards = []
    
    # Locate paths relative to this file
    # This file is in .../custom_nodes/my-utils/utils/wildcards.py
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # 1. Prioritize ComfyUI-Easy-Use
    easy_use_path = os.path.join(base_path, "ComfyUI-Easy-Use", "wildcards")
    all_wildcards.extend(scan_wildcard_dir(easy_use_path))
    
    # 2. ComfyUI-Impact-Pack
    impact_pack_path = os.path.join(base_path, "ComfyUI-Impact-Pack", "custom_wildcards")
    all_wildcards.extend(scan_wildcard_dir(impact_pack_path))
    
    return sorted(list(set(all_wildcards)))

def setup_wildcard_api():
    @PromptServer.instance.routes.get("/my_utils/wildcards")
    async def get_wildcards_endpoint(request):
        data = get_wildcards()
        return web.json_response(data)
