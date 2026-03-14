# Homework 5: Configure MCP Servers

**Author**: Kostiantyn Chaikivskyi

## Description

This homework demonstrates configuring and using four MCP (Model Context Protocol) servers with Claude Code:

1. **GitHub MCP** — connects Claude to GitHub to list pull requests, summarize commits, and interact with repositories.
2. **Filesystem MCP** — connects Claude to a local directory, enabling file listing and reading.
3. **Jira MCP** — connects Claude to Jira to query project tickets (e.g. last 5 bug tickets).
4. **Custom MCP Server (FastMCP)** — a custom-built server using FastMCP that exposes a `lorem-ipsum.md` resource and a `read` tool returning a configurable number of words.

## Project Structure

```
homework-5/
├── README.md
├── HOWTORUN.md
├── TASKS.md
├── .mcp.json
├── custom-mcp-server/
│   ├── server.py
│   ├── lorem-ipsum.md
│   └── requirements.txt
└── docs/
    └── screenshots/
        ├── github-mcp.png
        ├── localfiles.png
        ├── jira.png
        └── custom-mcp.png
```

## Quick Start

See [HOWTORUN.md](./HOWTORUN.md) for full setup and usage instructions.
