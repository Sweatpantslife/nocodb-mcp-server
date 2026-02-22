# NocoDB MCP Server

A standalone Model Context Protocol (MCP) server that provides full integration with a self-hosted [NocoDB](https://github.com/nocodb/nocodb) instance. This server exposes NocoDB's Meta API and Data API as MCP tools, enabling LLMs like Claude to create, update, and delete bases, tables, connections, fields, views, and records.

## Features

**24 MCP tools** covering the full NocoDB API surface:

| Category | Tools |
|----------|-------|
| **Bases** | list, get, create, update, delete |
| **Sources** | list, create, update, delete |
| **Tables** | list, get, create, update, delete |
| **Fields** | list, create, update, delete |
| **Views** | list, create, delete |
| **Records** | list (with filtering/sorting), create, update, delete |

## Prerequisites

- Node.js 18+ (for native `fetch`)
- A running NocoDB instance
- A NocoDB API token (generate from **Team & Settings > Tokens**)

## Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (for testing)
NOCODB_URL=http://localhost:8080 NOCODB_API_TOKEN=your-token npm start
```

## Claude Desktop Configuration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nocodb": {
      "command": "node",
      "args": ["/Users/youruser/Local Apps/nocodb-mcp-server/dist/index.js"],
      "env": {
        "NOCODB_URL": "http://localhost:8080",
        "NOCODB_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

## Development

```bash
# Run in dev mode (no build step needed)
NOCODB_URL=http://localhost:8080 NOCODB_API_TOKEN=your-token npm run dev
```

## Architecture

- **Zero NocoDB forking** — communicates entirely via REST API
- **Safe for NocoDB updates** — upgrade NocoDB independently
- **stdio transport** — compatible with Claude Desktop and other MCP clients
