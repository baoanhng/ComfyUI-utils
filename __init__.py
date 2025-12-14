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
            "optional": {}
        }
        
        # Define 25 optional text widgets
        # The JS will hide those > 5 initially
        for i in range(1, 26):
            inputs["optional"][f"text_{i}"] = ("STRING", {"default": "", "multiline": True})
            
        return inputs

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("concatenated_text",)
    FUNCTION = "process_text"
    CATEGORY = "Custom/Text"

    def process_text(self, join_string, trim_whitespace, **kwargs):
        collected_texts = []

        # Filter and sort keys that start with "text_"
        # We assume the format is text_N where N is an integer
        text_keys = []
        for k in kwargs.keys():
            if k.startswith("text_"):
                try:
                    # Verify it has a number
                    int(k.split("_")[1])
                    text_keys.append(k)
                except:
                    pass
        
        text_keys.sort(key=lambda x: int(x.split("_")[1]))
        
        for key in text_keys:
            text_value = kwargs[key]
            
            # Logic: Handle trimming and empty strings
            if text_value:
                if trim_whitespace:
                    text_value = text_value.strip()
                
                # Check again if text exists after trimming
                if text_value:
                    collected_texts.append(text_value)

        # Join the collected list
        result_string = join_string.join(collected_texts)

        return (result_string,)

# Mappings
NODE_CLASS_MAPPINGS = {
    "TextJoiner": TextJoinerNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TextJoiner": "Text Joiner"
}

WEB_DIRECTORY = "./js"
