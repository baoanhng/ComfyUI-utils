import json

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
