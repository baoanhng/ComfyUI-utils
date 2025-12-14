import json
from server import PromptServer

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
                # Optional list from Splitter
                "import_list": ("STRING_LIST",), 
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("concatenated_text",)
    FUNCTION = "process_text"

    CATEGORY = "utils"

    def process_text(self, join_string, trim_whitespace, unique_id=None, data_payload="[]", import_list=None, **kwargs):
        source_values = []
        
        # 1. Parse Payload to understand current UI state
        payload_data = []
        try:
            payload_data = json.loads(data_payload)
            if not isinstance(payload_data, list):
                payload_data = []
        except:
            payload_data = []
            
        current_slot_count = len(payload_data)
        if current_slot_count < 5: current_slot_count = 5

        # 2. Determine Source Values
        if import_list and isinstance(import_list, list) and len(import_list) > 0:
            # --- SPLITTER MODE ---
            # Using imported list to override payload
            
            for i in range(current_slot_count):
                if i < len(import_list):
                    if i == current_slot_count - 1:
                        # Overflow Logic: Join remaining items
                        rest = import_list[i:]
                        source_values.append(join_string.join(rest))
                    else:
                        source_values.append(import_list[i])
                else:
                    # Clear unused slots
                    # source_values.append("") 
                    pass
            
            # Sync back to UI
            if unique_id:
                PromptServer.instance.send_sync("my_utils.text_joiner.update", {
                    "node_id": unique_id,
                    "values": source_values
                })
        
        else:
            # --- MANUAL/PAYLOAD MODE ---
            # Use the payload data directly
            # This allows "unlimited" inputs as defined by frontend
            for text in payload_data:
                if isinstance(text, str):
                    source_values.append(text)

        # 3. Process Execution
        final_texts = []
        for text_value in source_values:
            if text_value:
                # Comma Strip logic (New Feature)
                if trim_whitespace:
                    text_value = text_value.strip()
                
                text_value = text_value.strip(',')
                
                if trim_whitespace:
                    text_value = text_value.strip()
                
                if text_value:
                    final_texts.append(text_value)

        result_string = join_string.join(final_texts)
        return (result_string,)
