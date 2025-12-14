import json

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
                "import_list": ("STRING_LIST",), # Custom type check? or just assume any
            }
        }
        
        # Start with 5 optional text widgets just for initial UI state
        # The frontend manages the actual state
        for i in range(5):
            inputs["optional"][f"text_{i}"] = ("STRING", {"default": "", "multiline": True})
            
        return inputs

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("string",)
    FUNCTION = "process_text"

    CATEGORY = "utils"

    def process_text(self, join_string, trim_whitespace, data_payload="[]", import_list=None, **kwargs):
        collected_texts = []
        
        # 1. Determine Source of Truth
        # If import_list is provided, it OVERRIDES the manual text box values.
        
        source_values = []
        
        # Determine number of slots by parsing payload or looking at kwargs
        # Ideally we want to fill the "Available Slots" that the user has added on the node.
        
        try:
            payload_data = json.loads(data_payload)
            if isinstance(payload_data, list):
                # This is the list of values currently in the UI
                # We use its LENGTH to know how many slots are "active"
                current_slot_count = len(payload_data)
            else:
                current_slot_count = 5 
        except:
            current_slot_count = 5

        # Ensure at least 5
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
                        # Final slot: take rest
                        rest = import_list[i:]
                        # Join remainder with the SAME join_string? Or just newline?
                        # Usually text boxes are independent. If we stuff multiple items into one box
                        # conceptually, they should be joined by the delimiter the user expects for the final output?
                        # Or joined by newline?
                        # Let's use the node's join_string for consistency with the final output structure.
                        source_values.append(join_string.join(rest))
                    else:
                        source_values.append(import_list[i])
                else:
                    # Run out of items
                    # source_values.append("") 
                    pass
        else:
            # Standard Manual Mode: Use payload or kwargs
            # We rely on payload as truth if available (from Step 314 fix)
            # But process_text receives kwargs from the execution engine which might
            # contain the primitive values if they are connected.
            # TextJoiner's text inputs are usually manual strings. Comfy passes them in kwargs.
            # Payload is just a string.
            
            # Implementation detail: payload is only visual sync.
            # Real execution values come from kwargs `text_0`, `text_1` etc IF they are standard inputs.
            # But here they are "optional" inputs.
            
            # If we rely on payload parsing for EXECUTION, we ignore node input slots?
            # Actually, `text_i` inputs CAN be connected to other nodes string outputs.
            # The JS syncs manual text to payload. But if input is connected, JS might not reflect it?
            # Step 1: Check kwargs for `text_X`.
            
            # Helper: construct list from kwargs
            input_dict = {}
            for k, v in kwargs.items():
                if k.startswith("text_"):
                    try:
                        idx = int(k.split("_")[1])
                        input_dict[idx] = v
                    except: pass
            
            # Just collect them in order
            sorted_indices = sorted(input_dict.keys())
            
            # Note: If we use payload as truth for Manual values, we should check it.
            # But if a slot is connected to another node, `text_X` in kwargs will be that node's output.
            # If it's not connected, `text_X` in kwargs is the widget value.
            # So kwargs is safer for execution.
            
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
