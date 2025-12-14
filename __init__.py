from .nodes.text_joiner import TextJoinerNode
from .nodes.text_splitter import TextSplitterNode
from .utils.wildcards import setup_wildcard_api

# Initialize API Routes
setup_wildcard_api()

NODE_CLASS_MAPPINGS = {
    "TextJoiner": TextJoinerNode,
    "TextSplitter": TextSplitterNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TextJoiner": "Text Joiner",
    "TextSplitter": "Text Splitter"
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
