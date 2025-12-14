import os
import glob
import yaml
from server import PromptServer
from aiohttp import web

def get_wildcards():
    wildcards = []
    
    # Locate ComfyUI-Impact-Pack/custom_wildcards relative to this file
    # This file is in .../custom_nodes/my-utils/utils/wildcards.py
    # We need to go up 3 levels to get to custom_nodes
    # custom_nodes/my-utils/utils -> .. -> my-utils -> .. -> custom_nodes
    
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    impact_pack_path = os.path.join(base_path, "ComfyUI-Impact-Pack", "custom_wildcards")
    
    if not os.path.exists(impact_pack_path):
        return []

    # 1. Scan .txt files
    txt_files = glob.glob(os.path.join(impact_pack_path, "*.txt"))
    for f in txt_files:
        filename = os.path.basename(f)
        name, _ = os.path.splitext(filename)
        wildcards.append(f"__{name}__")

    # 2. Scan .yaml files
    yaml_files = glob.glob(os.path.join(impact_pack_path, "*.yaml"))
    
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
                    wildcards.extend(parse_yaml_node(data))
        except Exception as e:
            print(f"[TextJoiner] Error parsing YAML {f}: {e}")
            
    return sorted(list(set(wildcards)))

def setup_wildcard_api():
    @PromptServer.instance.routes.get("/my_utils/wildcards")
    async def get_wildcards_endpoint(request):
        data = get_wildcards()
        return web.json_response(data)
