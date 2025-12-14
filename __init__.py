import json
import os
import glob
import yaml
import folder_paths
from server import PromptServer
from aiohttp import web

# Define utility function to scan wildcards
def get_wildcards():
    wildcards = []
    
    # Locate ComfyUI-Impact-Pack/custom_wildcards
    # Base path is custom_nodes
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    impact_pack_path = os.path.join(base_path, "ComfyUI-Impact-Pack", "custom_wildcards")
    
    if not os.path.exists(impact_pack_path):
        # Fallback search if folder name is different?
        # For now, just return empty if not found
        return []

    # 1. Scan .txt files
    txt_files = glob.glob(os.path.join(impact_pack_path, "*.txt"))
    for f in txt_files:
        filename = os.path.basename(f)
        name, ext = os.path.splitext(filename)
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
            # It's a leaf node list of values, so the prefix itself is the wildcard key
            # e.g. Sex/Expressions/disgusted
            items.append(f"__{prefix}__")
        return items

    for f in yaml_files:
        try:
            with open(f, 'r', encoding='utf-8') as file:
                data = yaml.safe_load(file)
                if data:
                    # YAML files in Impact Pack act as the root. 
                    # If filename is "my_wildcards.yaml" containing "Sex: ...",
                    # the wildcard is usually just __Sex/...__ not __my_wildcards/Sex/...__
                    # Based on user example "Sex: Variables", it seems the top keys are the start.
                    wildcards.extend(parse_yaml_node(data))
        except Exception as e:
            print(f"[TextJoiner] Error parsing YAML {f}: {e}")
            
    return sorted(list(set(wildcards)))

# Register API Route
@PromptServer.instance.routes.get("/my_utils/wildcards")
async def get_wildcards_endpoint(request):
    data = get_wildcards()
    return web.json_response(data)

class TextJoinerNode:
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "join_string": ("STRING", {"default": "\n", "multiline": False}),
                "trim_whitespace": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                # Hidden input to receive JSON list from frontend
                "data_payload": ("STRING", {"default": "[]", "multiline": False, "hidden": True}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("concatenated_text",)
    FUNCTION = "process_text"
    CATEGORY = "Custom/Text"

    def process_text(self, join_string, trim_whitespace, data_payload="[]", **kwargs):
        collected_texts = []
        
        # Try processing payload
        try:
            payload_data = json.loads(data_payload)
            if isinstance(payload_data, list):
                for text in payload_data:
                    if isinstance(text, str):
                        collected_texts.append(text)
        except json.JSONDecodeError:
            print(f"[TextJoiner] Failed to decode payload: {data_payload}")

        # Fallback for unconnected payload or if user connects manually (unlikely for hidden)
        # Or if we decide to mix visual + connected inputs later. For now, rely on payload.

        final_texts = []
        for text_value in collected_texts:
            if text_value:
                if trim_whitespace:
                    text_value = text_value.strip()
                
                # Trim leading/trailing commas as requested
                text_value = text_value.strip(',')
                
                if trim_whitespace:
                    # Strip again in case comma removal exposed more whitespace
                    # e.g. ", value" -> " value" -> "value"
                    text_value = text_value.strip()
                
                if text_value:
                    final_texts.append(text_value)

        result_string = join_string.join(final_texts)
        return (result_string,)

NODE_CLASS_MAPPINGS = {
    "TextJoiner": TextJoinerNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TextJoiner": "Text Joiner"
}

WEB_DIRECTORY = "./js"
