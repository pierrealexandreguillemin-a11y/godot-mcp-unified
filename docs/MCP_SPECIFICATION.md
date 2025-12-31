# MCP (Model Context Protocol) Specification Reference

This document summarizes the MCP specification as implemented in godot-mcp-unified.

## Sources

- [MCP Tools Specification](https://modelcontextprotocol.io/docs/concepts/tools)
- [Anthropic Claude Code Documentation](https://docs.anthropic.com/claude/docs/claude-code)

## Tool Definition Schema

### Required Fields

```typescript
interface ToolDefinition {
  name: string;           // Unique identifier (snake_case)
  description: string;    // Human-readable description
  inputSchema: {
    type: 'object';
    properties: Record<string, JsonSchemaProperty>;
    required: string[];
  };
}
```

### Optional Fields

```typescript
interface ToolDefinition {
  title?: string;         // Human-readable display name
  outputSchema?: object;  // JSON Schema for structured output
  annotations?: object;   // Behavior metadata
}
```

## Tool Response Format

### Success Response

```typescript
interface ToolResponse {
  content: [{
    type: 'text';
    text: string;
  }];
  isError?: false;
  structuredContent?: object;  // If outputSchema defined
}
```

### Error Response

```typescript
interface ToolResponse {
  content: [{
    type: 'text';
    text: string;  // Error message
  }];
  isError: true;
}
```

## Best Practices (ISO/IEC 25010 Compliance)

### Server Implementation

1. **MUST** validate all tool inputs against inputSchema
2. **MUST** implement proper access controls
3. **MUST** rate limit tool invocations
4. **MUST** sanitize tool outputs
5. **SHOULD** provide clear, actionable error messages
6. **SHOULD** use structured output schemas when appropriate

### Tool Design

1. **Single Responsibility**: One tool = one operation
2. **Idempotency**: Same inputs should produce same outputs
3. **Validation First**: Validate all inputs before execution
4. **Graceful Degradation**: Handle partial failures
5. **Logging**: Log all operations for debugging

### Error Handling

1. Return `isError: true` for tool execution failures
2. Include actionable hints in error messages
3. Never expose internal system details
4. Use consistent error message format

## Content Types

### Supported Types

| Type | Description |
|------|-------------|
| `text` | Plain text content |
| `image` | Base64-encoded image |
| `audio` | Base64-encoded audio |
| `resource_link` | URI to external resource |
| `resource` | Embedded resource content |

## Server Capabilities Declaration

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "resources": {},
    "prompts": {},
    "logging": {}
  }
}
```

## Protocol Messages

### List Tools

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

### Call Tool

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "id": 2,
  "params": {
    "name": "tool_name",
    "arguments": {}
  }
}
```

## Godot-MCP Specific Conventions

### Tool Naming

- Use `snake_case` for tool names
- Prefix with verb: `create_`, `add_`, `set_`, `get_`, `remove_`, `list_`
- Be specific: `create_animation_player` not `create_anim`

### Required Parameters

All scene-modifying tools require:
- `projectPath`: Absolute path to Godot project
- `scenePath`: Relative path to scene file

### Read-Only Mode

Tools marked `readOnly: true` are safe operations (queries, exports).
Tools marked `readOnly: false` modify project files.

When `READ_ONLY_MODE=true`, write tools are filtered from listings.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.3.0 | 2024 | Added Resources, Prompts, Logging capabilities |
| 0.4.0 | 2024 | Added Animation, Physics, TileMap, Audio tools |
