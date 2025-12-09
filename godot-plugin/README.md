# MCP Bridge - Godot Plugin

Bidirectional communication bridge between Godot Editor and MCP Server for natural language coding workflows.

## Requirements

- Godot 4.x
- godot-mcp-unified MCP server running

## Installation

### Method 1: Copy Plugin

```bash
# Copy the plugin to your Godot project
cp -r addons/mcp_bridge your-project/addons/
```

### Method 2: Symlink (Development)

```bash
# Create symlink for development
ln -s /path/to/godot-mcp-unified/godot-plugin/addons/mcp_bridge your-project/addons/mcp_bridge
```

## Activation

1. Open your project in Godot Editor
2. Go to **Project > Project Settings > Plugins**
3. Find **MCP Bridge** and set Status to **Active**

You should see "MCP: Listening on port 6550" in the editor toolbar.

## Configuration

Default port: `6550`

To change the port, modify `mcp_bridge.gd`:

```gdscript
const DEFAULT_PORT: int = 6550  # Change this value
```

## Available Commands

| Command | Description | Parameters |
|---------|-------------|------------|
| `ping` | Test connection | - |
| `get_editor_info` | Godot version, editor state | - |
| `validate_script` | Validate GDScript via Godot parser | `path`: res:// path |
| `reload_script` | Reload modified script | `path`: res:// path |
| `get_open_scenes` | Currently open scenes | - |
| `reload_scene` | Reload scene from disk | `path`: res:// path |
| `get_selected_nodes` | Selected nodes in scene tree | - |
| `execute_code` | Execute GDScript (editor only) | `code`: GDScript code |
| `get_autoloads` | Project autoloads | - |
| `get_project_settings` | Project settings | `filter`: optional filter |

## Protocol

JSON over TCP, newline-delimited messages.

### Request Format

```json
{
  "id": "req_1",
  "command": "validate_script",
  "params": {
    "path": "res://scripts/player.gd"
  }
}
```

### Response Format

```json
{
  "id": "req_1",
  "success": true,
  "result": {
    "valid": true,
    "errors": []
  }
}
```

### Error Response

```json
{
  "id": "req_1",
  "success": false,
  "error": {
    "code": "not_found",
    "message": "Script not found: res://scripts/player.gd"
  }
}
```

## Usage with MCP Server

The MCP server connects automatically when tools require live validation:

```typescript
import { tryConnectToGodot, getGodotBridge } from './bridge/index.js';

// Check if Godot editor is running with plugin
if (await tryConnectToGodot()) {
  const bridge = getGodotBridge();

  // Validate script with real Godot parser
  const result = await bridge.validateScript('res://scripts/player.gd');
  console.log(result.errors);

  // Get editor state
  const info = await bridge.getEditorInfo();
  console.log(`Godot ${info.godot_version.major}.${info.godot_version.minor}`);
}
```

## LSP Mode (Alternative)

For real-time diagnostics, you can also use Godot's built-in LSP:

```bash
# Start Godot with LSP server
godot --lsp-port=6005
```

The MCP server will automatically use LSP when available for more accurate diagnostics.

## Troubleshooting

### Plugin not connecting

1. Verify plugin is activated in Project Settings
2. Check Godot Output panel for errors
3. Ensure port 6550 is not in use by another application

### "Script has errors" but no details

GDScript's API doesn't expose parse errors directly. Check:
- Godot's Output panel for error details
- Use LSP mode for better error messages

### Connection refused

1. Make sure Godot Editor is running
2. Verify the plugin is activated
3. Check firewall settings

## Security

- Plugin only accepts connections from localhost (127.0.0.1)
- `execute_code` command only works in editor mode
- No network exposure by default

## License

MIT - Same as godot-mcp-unified
