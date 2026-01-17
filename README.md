# Health Data MCP Server

MCP server for querying Apple Health data. Works with Claude Desktop, Claude Code, and other MCP clients.

Health data is imported from [Auto Export](https://www.healthexportapp.com/) iOS app.

## Features

- Query health metrics (steps, sleep, heart rate, etc.)
- Query workouts
- Execute SQL queries
- Aggregation and date filtering

## Local Use

### 1. Import data

```bash
npx --yes --package=github:SlavaMilin/health-data-mcp import-health ./export.json -o ~/.health-data/health.db
```

### 2. Configure MCP client

Add to Claude Desktop config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "health-data": {
      "command": "npx",
      "args": ["--yes", "github:SlavaMilin/health-data-mcp"],
      "env": {
        "HEALTH_DB_PATH": "/Users/YOUR_USERNAME/.health-data/health.db"
      }
    }
  }
}
```

**Note:** `HEALTH_DB_PATH` is required. Use the same path for import and server.

## Server Deployment

For remote access via SSE transport with OAuth.

### Docker

```bash
docker pull ghcr.io/slavamilin/health-data-mcp:latest

docker run -d \
  -p 3000:3000 \
  -v /path/to/data:/app/data \
  -e AUTH_TOKEN=your-secret-token \
  -e HEALTH_DB_PATH=/app/data/health_data.db \
  -e GITHUB_CLIENT_ID=your-client-id \
  -e GITHUB_CLIENT_SECRET=your-client-secret \
  -e BASE_URL=https://your-domain.com \
  ghcr.io/slavamilin/health-data-mcp:latest
```

### Client configuration

```json
{
  "mcpServers": {
    "health-data": {
      "type": "sse",
      "url": "https://your-server/sse"
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_metric_types` | List available health metrics |
| `list_workout_types` | List workout types |
| `query_metrics` | Query metrics with filtering |
| `execute_sql` | Run SQL queries |

## License

ISC
