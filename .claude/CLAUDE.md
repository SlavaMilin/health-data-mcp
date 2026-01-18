# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server for Apple Health data stored in SQLite. It supports two transport modes:
- **Stdio transport**: For local use with MCP clients (e.g., Claude Desktop)
- **SSE/HTTP transport**: For remote server deployment with OAuth authentication

## Development Commands

### Package Management
```bash
pnpm install                    # Install dependencies
```

### Running the Server
```bash
pnpm start                      # Start stdio transport (default, for local use)
pnpm start:stdio                # Start stdio transport explicitly
pnpm start:server               # Start HTTP server (for remote deployment)
pnpm dev                        # Start HTTP server with auto-reload
```

### Testing
```bash
pnpm test                       # Run unit tests only
pnpm test:unit                  # Run unit tests explicitly
pnpm test:integration           # Run integration tests only
pnpm test:all                   # Run both unit and integration tests
pnpm test:watch                 # Run tests in watch mode
pnpm typecheck                  # Run TypeScript type checking
```

### Data Import
```bash
pnpm import-health /path/to/export.json    # Import Auto Export JSON to SQLite
```

## Architecture

This project follows a **layered architecture with Go-style dependency injection**. All dependencies are created in entry points (`bin/server.ts`) and injected explicitly through function parameters.

### Dependency Flow (Top to Bottom)
```
Config → Repositories → Clients → Services → Handlers → Routes
```

### Layer Responsibilities

1. **Repositories** (`lib/repositories/*.repository.ts`)
   - Data access ONLY (files, Keyv, Map, Database)
   - Use closures for state management (no classes)
   - Export factory functions that return objects with methods

2. **Clients** (`lib/clients/*.client.ts`)
   - HTTP access to external APIs (Telegram, Gemini, etc.)
   - Thin wrappers around API calls
   - No business logic - just API communication

3. **Services** (`lib/services/*.service.ts`)
   - Business logic ONLY
   - Accept primitive types, DTOs, and domain objects
   - Orchestrate multiple repositories and clients
   - No direct data access
   - **NEVER** accept framework objects (request, reply)

4. **Handlers** (`lib/handlers/*.handler.ts`)
   - Transport layer - handle request/response formatting
   - **HTTP handlers**: Accept FastifyRequest and FastifyReply
   - **MCP handlers**: Accept tool args, return McpToolResponse
   - Parse request data, call services, format responses
   - Validation and error mapping

5. **Schemas** (`lib/schemas/*.schemas.ts`)
   - Zod schemas for validation
   - Tool/endpoint descriptions and metadata
   - Kept separate from routes for cleaner code

6. **Routes** (`lib/routes/*.routes.ts`)
   - Very thin layer - ONLY register routes/tools
   - **HTTP routes**: `fastify.get('/path', handler)`
   - **MCP routes**: `server.registerTool('name', schema, handler)`
   - No logic, no parsing, no formatting

7. **Middleware** (`lib/middleware/*.middleware.ts`)
   - Return factory functions for middleware
   - Injected dependencies via closures

8. **Infrastructure** (`lib/infrastructure/*.ts`)
   - Low-level utilities (database migrations, MCP client setup, logger)
   - Not business logic, not services
   - Simple functions with explicit dependencies

9. **Utils** (`lib/utils/*.utils.ts`)
   - Pure utility functions (text splitting, date calculations)
   - No side effects, no dependencies
   - Easily testable

### Key Architectural Patterns

#### Factory Functions (NO Classes)
```typescript
// ✅ Correct pattern
export const createService = (deps) => ({
  method: () => { ... }
});

// ❌ Don't use classes
class Service { ... }
```

#### Direct Imports (NO index.js files)
```typescript
// ✅ Correct
import { createOAuthService } from '../lib/services/oauth.service.ts';

// ❌ Don't use index files
import { createOAuthService } from '../lib/services/index.ts';
```

#### Dependency Injection Container
All dependencies are wired together in `lib/http-server.ts` following this pattern:
1. Load config
2. Create repositories with their dependencies
3. Create services with repository dependencies
4. Create handlers with service dependencies
5. Create middleware with service/repo dependencies
6. Register routes with handler dependencies

### Anti-Patterns to Avoid
- ❌ Global variables (use DI instead)
- ❌ Classes (use factory functions)
- ❌ Index files (use direct imports)
- ❌ Business logic in routes (belongs in services)
- ❌ Business logic in handlers (belongs in services)
- ❌ HTTP logic in services (belongs in handlers)
- ❌ Services accepting request/reply (use handlers)
- ❌ Direct data access in services (use repositories)
- ❌ Circular dependencies (follow layer hierarchy)

## MCP Server Architecture

The MCP server has two transport modes, both following the layered architecture:

### Transport Layer Analogy
MCP is analogous to HTTP - both are transport layers with their own adapters:

| HTTP (Fastify) | MCP (McpServer) |
|----------------|-----------------|
| `fastify.get()` | `server.registerTool()` |
| HTTP handlers | MCP handlers |
| HTTP routes | MCP routes |

### 1. Stdio Server (`lib/stdio-server.ts`)
Entry point for local MCP client connections. Follows the same DI pattern as HTTP server:

```
Database → Repository → Service → Handler → Routes → McpServer
```

Components:
- `health-query.repository.ts` - SQL queries for health data
- `health-query.service.ts` - Business logic (enrichment, aggregation)
- `mcp-tools.handler.ts` - MCP response formatting
- `mcp-tools.schemas.ts` - Zod schemas and descriptions
- `mcp-tools.routes.ts` - Tool registration
- `mcp-resources.routes.ts` - Resource registration

Available tools:
- `list_metric_types`: List all available health metrics
- `query_metrics`: Query metrics with filtering and aggregation
- `list_workout_types`: List workout types
- `execute_sql`: Run arbitrary SQL queries

### 2. HTTP Server (`lib/http-server.ts`)
- Used for remote deployment via SSE transport
- Implements full OAuth flow for GitHub authentication
- Manages MCP transports via `mcp.service.ts`
- Includes migration endpoints for database updates
- Protected by auth middleware (requires `AUTH_TOKEN`)
- Runs scheduled health analysis via cron

### 3. Scheduled Health Analysis
Automated AI-powered health analysis sent to Telegram on schedule.

Architecture:
```
Scheduler (cron) / HTTP endpoint
        ↓
health-analysis.service.ts
        ↓
┌───────┴───────┐
↓               ↓
Gemini API      Telegram API
(via MCP)       (send message)
```

Key components:
- `gemini.client.ts` - Gemini API with MCP tool support (`mcpToTool`)
- `telegram.client.ts` - Telegram Bot API client
- `health-analysis.service.ts` - Orchestration (AI analysis → save → send)
- `scheduler.service.ts` - node-cron wrapper for multiple schedules
- `instructions/ai-instructions.md` - System prompt for Gemini (read fresh each time)

MCP Integration:
- Gemini connects to MCP server via `InMemoryTransport`
- AI uses existing MCP tools (`query_metrics`, `list_metric_types`, etc.)
- No data duplication - AI queries what it needs

### Database Views
The server uses pre-joined views for efficient queries:
- `metrics_with_types`: Metrics joined with their type information (includes `qty`, `value`, `total_sleep`)
- `workouts_with_types`: Workouts joined with their type information (includes `duration`, `calories_burned`)

## TypeScript Configuration

- Uses `tsx` runtime (no build step required)
- Type checking with `pnpm typecheck`
- Direct `.ts` imports in all files
- Types in `lib/types/*.types.ts`
- Use `type` imports when importing only types
- Gradual typing is acceptable (can use `any` when needed)

## Environment Variables

Required:
- `AUTH_TOKEN`: Bearer token for protected endpoints (migration, etc.)

Optional - Database & Server:
- `HEALTH_DB_PATH`: Path to SQLite database (default: `./data/health_data.db`)
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `BASE_URL`: Public base URL for OAuth redirects

Optional - GitHub OAuth:
- `GITHUB_CLIENT_ID`: GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret

Optional - Scheduled Analysis:
- `GEMINI_API_KEY`: Google Gemini API key for AI analysis
- `TELEGRAM_BOT_TOKEN`: Telegram bot token for sending analysis
- `TELEGRAM_CHAT_ID`: Telegram chat ID to send analysis to
- `TIMEZONE`: Timezone for scheduler (default: `UTC`)
- `CRON_DAILY`: Cron expression for daily analysis (e.g., `0 9 * * *`)
- `CRON_WEEKLY`: Cron expression for weekly analysis (e.g., `0 10 * * 1`)
- `CRON_MONTHLY`: Cron expression for monthly analysis (e.g., `0 11 1 * *`)

## Database Schema

The database stores Apple Health data with the following structure:
- `metric_types`: Health metric type definitions (name, unit, schema)
- `health_metrics`: Individual metric measurements (linked to metric_types)
- `workout_types`: Workout type definitions (name, schema)
- `workouts`: Individual workout sessions (linked to workout_types)
- `analysis_history`: AI-generated health analysis history (date, type, analysis)
- `goals`: User health goals with metric targets
- Views: `metrics_with_types`, `workouts_with_types` (pre-joined for queries)

### Analysis History
The `analysis_history` table uses `UNIQUE(date, type)` constraint with upsert pattern:
- `date`: Period end date (YYYY-MM-DD) - calculated based on type
- `type`: Analysis type (`daily`, `weekly`, `monthly`)
- Repeated analysis for same date+type overwrites previous entry

Date calculation by type:
| Type | date = | Period |
|------|--------|--------|
| daily | yesterday | 1 day |
| weekly | last Sunday | Mon-Sun (7 days) |
| monthly | last day of prev month | full month |

### Schema Field Pattern
Each metric/workout type has a `schema` field containing a JSON array of field names. These field names can be used with `JSON_EXTRACT(data, '$.fieldName')` to access nested data in queries.

## Database Management

### Schema Migrations
Database schema migrations are managed through:
- SQL migration files in `migrations/*.sql`
- `runMigrations()` from `lib/infrastructure/migrations.ts` for running schema migrations

### Health Data Import
Health data is imported from Auto Export iOS app JSON format:
- CLI: `pnpm import-health /path/to/export.json` for local import
- HTTP: `POST /health/import` endpoint (requires auth token) for remote deployment
- `createHealthImportService()` handles the import logic

## File Naming Conventions

- `*.repository.ts` - Data access layer (DB, files, cache)
- `*.client.ts` - External API clients (Telegram, Gemini)
- `*.service.ts` - Business logic layer
- `*.handler.ts` - Transport handlers (HTTP or MCP)
- `*.schemas.ts` - Zod schemas and metadata
- `*.routes.ts` - Route/tool registration (thin layer)
- `*.middleware.ts` - Middleware factories
- `*.constants.ts` - Constants and configuration
- `*.types.ts` - TypeScript type definitions
- `*.utils.ts` - Pure utility functions
- `*.test.ts` - Unit tests (no server)
- `*.integration.test.ts` - Integration tests (auto-start server)

## Development Workflow

### Test Coverage Requirements

**IMPORTANT**: Tests are required for ALL code changes and new files. Do not think about whether tests are needed - just write them.

#### When to Write Tests

1. **New files**: Write tests immediately after creating any new file
   - ✅ Repositories, Services, Handlers, Middleware, Utils
   - ❌ Skip: Constants, Types, Schemas, Routes, Clients (too thin to test)

2. **Modified files**: Update or add tests when changing code
   - Modified functions/methods: Update existing tests
   - Bug fixes: Add regression tests
   - Refactoring: Ensure existing tests pass and cover refactored code

#### How to Test Repositories

When testing repositories that use external libraries (Database, Keyv, etc.):
- ✅ Use **real libraries** with in-memory storage (SQLite `:memory:`, Keyv default)
- ✅ Test **integration** between your code and the library
- ❌ Do NOT mock libraries - test real behavior

Example:
```typescript
// ✅ Correct - test with real Keyv
const store = new Keyv();
const repo = createKeyvRepository<string>(store);
await repo.set('key', 'value');
expect(await repo.get('key')).toBe('value');

// ❌ Wrong - don't mock Keyv
const mockStore = { set: vi.fn(), get: vi.fn() };
```

#### Verification Checklist

Before completing ANY task:
1. ✅ Write/update tests for all code changes
2. ✅ Run `pnpm typecheck` - MUST pass
3. ✅ Run `pnpm test` - MUST pass
4. ✅ If integration tests affected, run `pnpm test:integration`
5. ✅ Check if CLAUDE.md needs updating (new patterns, renamed functions, new folders, etc.)

#### Example Workflow

```
1. Create/modify code file
2. Create/update corresponding test file
3. Write tests for all functions/methods
4. Run: pnpm typecheck
5. Run: pnpm test
6. Verify: All checks pass ✅
```

**Never skip tests** - untested code is not acceptable, regardless of how simple it seems.
