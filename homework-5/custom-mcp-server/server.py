from pathlib import Path
from fastmcp import FastMCP

mcp = FastMCP("lorem-ipsum-server")

LOREM_FILE = Path(__file__).parent / "lorem-ipsum.md"


def _get_words(word_count: int = 30) -> str:
    text = LOREM_FILE.read_text(encoding="utf-8")
    words = text.split()
    return " ".join(words[:word_count])


@mcp.resource("lorem://ipsum/{word_count}")
def lorem_resource(word_count: int = 30) -> str:
    """Resource URI that returns the first `word_count` words from lorem-ipsum.md.

    Resources are URIs that Claude can read from (e.g., files, APIs).
    They expose data passively — Claude fetches them like reading a file or an API endpoint.
    """
    return _get_words(word_count)


@mcp.tool()
def read(word_count: int = 30) -> str:
    """Read the first `word_count` words from the lorem-ipsum resource.

    Tools are actions Claude can call to perform operations (e.g., reading a file,
    running a command). Unlike resources, tools are active — they execute logic and
    return a result.

    Args:
        word_count: Number of words to return (default: 30).
    """
    return _get_words(word_count)


if __name__ == "__main__":
    mcp.run()
