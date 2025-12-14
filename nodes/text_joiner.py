import json
from server import PromptServer

class TextJoinerNode:
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(s):
        inputs = {
            "required": {
                "join_string": ("STRING", {"default": "\n", "multiline": False}),
                "trim_whitespace": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                "data_payload": ("STRING", {"default": "[]", "multiline": False, "hidden": True}),
                # New Input for Splitter
                "import_list": ("STRING_LIST",), 
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }
        
        for i in range(5):
            inputs["optional"][f"text_{i}"] = ("STRING", {"default": "", "multiline": True})
            
        return inputs

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("string",)
    FUNCTION = "process_text"

    CATEGORY = "utils"

    def process_text(self, join_string, trim_whitespace, unique_id=None, data_payload="[]", import_list=None, **kwargs):
        collected_texts = []
        source_values = []
        
        try:
            payload_data = json.loads(data_payload)
            if isinstance(payload_data, list):
                current_slot_count = len(payload_data)
            else:
                current_slot_count = 5 
        except:
            current_slot_count = 5

        if current_slot_count < 5: 
            current_slot_count = 5
            
        if import_list and isinstance(import_list, list) and len(import_list) > 0:
            # We have imported data!
            # Distribute into slots.
            
            # Map import_list to [0...current_slot_count-1]
            # Overflow goes to last slot.
            
            # Example: 3 slots, 5 items.
            # Slot 0 = Item 0
            # Slot 1 = Item 1
            # Slot 2 (Last) = Item 2, Item 3, Item 4 joined.
            for i in range(current_slot_count):
                if i < len(import_list):
                    if i == current_slot_count - 1:
                        rest = import_list[i:]
                        source_values.append(join_string.join(rest))
                    else:
                        source_values.append(import_list[i])
                else:
                    pass
            
            # Sync back to UI if using import_list
            if unique_id:
                PromptServer.instance.send_sync("my_utils.text_joiner.update", {
                    "node_id": unique_id,
                    "values": source_values
                })

        else:
            # Manual Mode
            input_dict = {}
            for k, v in kwargs.items():
                if k.startswith("text_"):
                    try:
                        idx = int(k.split("_")[1])
                        input_dict[idx] = v
                    except: pass
            
            sorted_indices = sorted(input_dict.keys())
            for idx in sorted_indices:
                source_values.append(input_dict[idx])

        # 2. Process
        for text_value in source_values:
            if text_value:
                # Standard Trim
                if trim_whitespace:
                    text_value = text_value.strip()
                
                # Comma Strip
                text_value = text_value.strip(',')
                
                # Re-Trim
                if trim_whitespace:
                    text_value = text_value.strip()
                
                if text_value:
                    collected_texts.append(text_value)

        result_string = join_string.join(collected_texts)

        return (result_string,)
