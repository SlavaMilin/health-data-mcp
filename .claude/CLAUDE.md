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
Config → Repositories → Services → Handlers → Routes
```

### Layer Responsibilities

1. **Repositories** (`lib/repositories/*.repository.ts`)
   - Data access ONLY (files, Keyv, Map, Database)
   - Use closures for state management (no classes)
   - Export factory functions that return objects with methods

2. **Services** (`lib/services/*.service.ts`)
   - Business logic ONLY
   - Accept primitive types, DTOs, and domain objects
   - Orchestrate multiple repositories
   - No direct data access
   - **NEVER** accept framework objects (request, reply)

3. **Handlers** (`lib/handlers/*.handler.ts`)
   - HTTP layer - handle request/response
   - Accept FastifyRequest and FastifyReply
   - Parse request data (body, query, params, headers)
   - Call services with parsed data
   - Format responses and handle HTTP errors
   - Validation and error mapping

4. **Routes** (`lib/routes/*.routes.ts`)
   - Very thin layer - ONLY register routes
   - Pass handlers to Fastify route methods
   - No logic, no parsing, no formatting

5. **Middleware** (`lib/middleware/*.middleware.ts`)
   - Return factory functions for middleware
   - Injected dependencies via closures

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

The MCP server has two separate implementations:

### 1. Stdio Server (`lib/stdio-server.ts`)
- Used for local MCP client connections
- Implements health data query tools:
  - `list_metric_types`: List all available health metrics
  - `query_metrics`: Query metrics with filtering and aggregation
  - `list_workout_types`: List workout types
  - `execute_sql`: Run arbitrary SQL queries
- Registers MCP resources (database schema, query patterns)
- Reads from SQLite database in read-only mode

### 2. HTTP Server (`lib/http-server.ts`)
- Used for remote deployment via SSE transport
- Implements full OAuth flow for GitHub authentication
- Manages MCP transports via `mcp.service.ts`
- Includes migration endpoints for database updates
- Protected by auth middleware (requires `AUTH_TOKEN`)

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

Optional:
- `HEALTH_DB_PATH`: Path to SQLite database (default: `./data/health_data.db`)
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `BASE_URL`: Public base URL for OAuth redirects
- `GITHUB_CLIENT_ID`: GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret
- `OAUTH_TOKENS_FILE`: Path to OAuth tokens JSON file (default: `./data/oauth-tokens.json`)

## Database Schema

The database stores Apple Health data with the following structure:
- `metric_types`: Health metric type definitions (name, unit, schema)
- `health_metrics`: Individual metric measurements (linked to metric_types)
- `workout_types`: Workout type definitions (name, schema)
- `workouts`: Individual workout sessions (linked to workout_types)
- Views: `metrics_with_types`, `workouts_with_types` (pre-joined for queries)

### Schema Field Pattern
Each metric/workout type has a `schema` field containing a JSON array of field names. These field names can be used with `JSON_EXTRACT(data, '$.fieldName')` to access nested data in queries.

## Database Management

### Schema Migrations
Database schema migrations are managed through:
- SQL migration files in `migrations/*.sql`
- `createDbMigrationsService()` for running schema migrations

### Health Data Import
Health data is imported from Auto Export iOS app JSON format:
- CLI: `pnpm import-health /path/to/export.json` for local import
- HTTP: `POST /health/import` endpoint (requires auth token) for remote deployment
- `createHealthImportService()` handles the import logic

## File Naming Conventions

- `*.repository.ts` - Data access layer
- `*.service.ts` - Business logic layer
- `*.handler.ts` - HTTP request/response handlers
- `*.routes.ts` - Route registration (thin layer)
- `*.middleware.ts` - Middleware factories
- `*.types.ts` - TypeScript type definitions
- `*.test.js` - Unit tests (no server)
- `*.integration.test.js` - Integration tests (auto-start server)

## Development Workflow

### Test Coverage Requirements

**IMPORTANT**: Tests are required for ALL code changes and new files. Do not think about whether tests are needed - just write them.

#### When to Write Tests

1. **New files**: Write tests immediately after creating any new file
   - ✅ Repositories, Services, Handlers, Middleware
   - ❌ Skip only: Constants (`*.constants.ts`), Types (`*.types.ts`), Routes (`*.routes.ts` - too thin to test)

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
