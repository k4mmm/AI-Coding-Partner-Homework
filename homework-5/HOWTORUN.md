# How to Run the Custom MCP Server

## 1. Install dependencies

```bash
cd custom-mcp-server
uv venv .venv
uv pip install -r requirements.txt
```

## 2. Run the server manually (for testing)

```bash
cd custom-mcp-server
.venv/bin/python server.py
```

The server starts in stdio mode and waits for MCP protocol messages.

## 3. Connect via MCP configuration

The server is already registered in `.mcp.json` at the project root:

```json
"lorem-ipsum": {
  "type": "stdio",
  "command": "python",
  "args": [
    "/Users/k.chaikivskyi/AI learning/AI-Coding-Partner-Homework/homework-5/custom-mcp-server/server.py"
  ]
}
```

Claude Code picks this up automatically when launched from the `homework-5/` directory.

## 4. Use / test the `read` tool

Once connected, ask Claude:

```
Call the read tool with word_count=50
```

Or access the resource directly:

```
Read the resource lorem://ipsum/50
```

Both return the first N words from `custom-mcp-server/lorem-ipsum.md`.

## Concepts

- **Resources** are URIs that Claude can read from (e.g., files, APIs). They expose data passively — Claude fetches them like reading a file or an API endpoint. URI pattern: `lorem://ipsum/{word_count}`.
- **Tools** are actions Claude can call to perform operations (e.g., reading a file, running a command). Unlike resources, tools are active — they execute logic and return a result. Tool name: `read`.
