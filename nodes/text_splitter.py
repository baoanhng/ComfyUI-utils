class TextSplitterNode:
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": ("STRING", {"multiline": True, "default": ""}),
                "delimiter": ("STRING", {"default": "\n", "multiline": False}),
            }
        }

    RETURN_TYPES = ("STRING_LIST",)
    RETURN_NAMES = ("string_list",)
    FUNCTION = "split_text"

    CATEGORY = "utils"

    def split_text(self, text, delimiter="\n"):
        if not text:
            return ([],)
        
        # Handle "newline" string escape if user typed literal \n
        if delimiter == "\\n":
            delimiter = "\n"
            
        parts = text.split(delimiter)
        # Optional: trim parts? 
        # Usually split is raw. Joiner does trimming.
        return (parts,)
