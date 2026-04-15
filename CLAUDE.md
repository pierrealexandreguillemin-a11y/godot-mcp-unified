# CLAUDE.md - godot-mcp-unified

## Project Overview

MCP server (Model Context Protocol) for Godot 4.x game engine. Enables natural language coding in Godot via Claude Code, Claude Desktop, or any MCP client. 83 tools, 20 resources, 20 prompts.

TypeScript + Node.js ESM. Communicates with Godot via WebSocket plugin bridge (preferred) or CLI fallback.

## Build & Run

```bash
npm run build          # Clean + compile TS + fix imports
npm run lint           # ESLint 9 (0 warnings allowed)
npm run typecheck      # tsc --noEmit
npm test               # Jest with ESM support
npm run test:coverage  # With coverage thresholds (80% lines/stmts, 75% branches/functions)
npm run inspector      # MCP Inspector for manual testing
```

## Code Conventions

- **Strict TypeScript**: `no-explicit-any` is an error. Zero `any` types allowed.
- **ESM only**: All imports use `.js` extensions (compiled from `.ts`). No CommonJS.
- **MCP protocol**: ALL log output goes to `stderr` (`console.error`). `stdout` is reserved for MCP protocol communication.
- **Tool pattern**: Each tool is a file in `src/tools/<domain>/`, exports a handler function. Uses `ToolContext` for dependency injection (testability).
- **Schemas**: Zod schemas in `src/schemas/` define tool input validation.
- **Tests**: Co-located `*.test.ts` files. Jest with `ts-jest` ESM preset. `--experimental-vm-modules` required.
- **Error handling**: Use `createErrorResponse()` from `src/utils/ErrorHandler.ts`. Never throw in tool handlers.
- **Unused vars**: Prefix with `_` (e.g., `_unused`).

## Architecture

```
src/
  index.ts              # Entry point (stdio MCP transport)
  server/               # GodotMCPServer, types
  core/                 # TscnParser, LruCache, ProcessPool, PathManager
  tools/                # 83 tools organized by domain (scene, script, project, etc.)
  bridge/               # WebSocket bridge to Godot editor plugin, LSP client
  schemas/              # Zod input schemas per domain
  prompts/              # MCP prompt definitions
  utils/                # StructuredLogger, ErrorHandler, FileUtils
```

## Key Patterns

- **ToolContext DI**: All tool handlers accept a `ToolContext` parameter for dependency injection. Tests pass mock contexts.
- **TscnParser**: State-machine parser for Godot `.tscn` files. Mutations via `TscnMutations`, queries via `TscnQueries`.
- **Bridge priority**: WebSocket plugin (port 6550) > LSP (port 6005) > CLI `--check-only` fallback.
- **Singleton debug server**: `DebugStreamServer` is a singleton WebSocket server for real-time debug streaming.

## Testing Notes

- WebSocket tests use `127.0.0.1` (not `localhost`) to avoid IPv4/IPv6 ambiguity on Linux CI.
- Coverage excludes Godot-runtime-dependent tools (see `jest.config.js` exclusion list).
- Test files named `*.test.enhanced.ts` are also excluded from coverage.

## CI/CD

GitHub Actions on push/PR to `master`. Matrix: Ubuntu + Windows, Node 20 + 22. Steps: build, lint, typecheck, test:coverage, security audit.


## Wiki

Syntheses wiki : `C:\Dev\wiki\topics\game-dev\` et `C:\Dev\wiki\entities\godot-mcp-unified.md`
