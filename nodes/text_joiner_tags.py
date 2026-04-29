import json
import re
from server import PromptServer

NUM_SECTIONS = 6

class TextJoinerTagsNode:
    """
    A tag-based text joiner with 5 persistent sections.
    Each section is a Select2-style tag input for organizing prompt parts.
    data_payload stores a nested array: [["sect0_tags"], ["sect1_tags"], ...]
    """
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(s):
        default_payload = json.dumps([[] for _ in range(NUM_SECTIONS)])
        return {
            "required": {
                "join_string": ("STRING", {"default": ", ", "multiline": False}),
                "trim_whitespace": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                # Hidden input: JSON nested array from frontend
                "data_payload": ("STRING", {"default": default_payload, "multiline": False, "hidden": True}),
                # Optional list from Splitter
                "import_list": ("STRING_LIST",), 
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("STRING", "INT", "INT")
    RETURN_NAMES = ("concatenated_text", "width", "height")
    FUNCTION = "process_text"

    CATEGORY = "utils"

    def process_text(self, join_string, trim_whitespace, unique_id=None, data_payload="[[]]", import_list=None, **kwargs):
        all_tags = []

        if import_list and isinstance(import_list, list) and len(import_list) > 0:
            # --- SPLITTER MODE: put all imported items into section 0 ---
            all_tags = [str(item) for item in import_list]

            # Build sections array for UI sync (imports go to section 0)
            sections_for_ui = [all_tags] + [[] for _ in range(NUM_SECTIONS - 1)]
            if unique_id:
                PromptServer.instance.send_sync("my_utils.text_joiner_tags.update", {
                    "node_id": unique_id,
                    "sections": sections_for_ui
                })
        else:
            # --- MANUAL/PAYLOAD MODE ---
            try:
                sections = json.loads(data_payload)
                if isinstance(sections, list):
                    for section in sections:
                        if isinstance(section, list):
                            all_tags.extend([str(t) for t in section if isinstance(t, str)])
                        elif isinstance(section, str):
                            # Backward compat: flat array of strings
                            all_tags.append(section)
            except:
                all_tags = []

        # Process tags
        final_tags = []
        for tag in all_tags:
            if trim_whitespace:
                tag = tag.strip()
            tag = tag.strip(',')
            if trim_whitespace:
                tag = tag.strip()
            if tag:
                final_tags.append(tag)

        result_string = join_string.join(final_tags)
        
        # Extract size
        width = 0
        height = 0
        size_matches = re.findall(r"/\*\s*size:\s*(\d+)\s*x\s*(\d+)\s*\*/", result_string, re.IGNORECASE)
        if size_matches:
            last_match = size_matches[-1]
            try:
                width = int(last_match[0])
                height = int(last_match[1])
            except:
                pass

        return (result_string, width, height)
