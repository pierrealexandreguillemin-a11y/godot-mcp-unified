# Godot MCP Unified - AI + Godot Architecture

> Unified MCP server for AI-assisted Godot game development

[Lire en francais](README.md)

## Overview

```
                    +------------------+
                    |   Claude Code    |
                    |    (VS Code)     |
                    +--------+---------+
                             |
                             v
+----------------+  +--------+---------+  +------------------+
| Claude Desktop |->|                  |<-| ollmcp (Ollama)  |
|   (Anthropic)  |  | godot-mcp-unified|  | qwen2.5-coder:7b |
+----------------+  |   (this server)  |  +------------------+
                    +--------+---------+
                             |
                             v
                    +--------+---------+
                    |  Godot Engine    |
                    |    4.5.1         |
                    +------------------+
```

## Features

**Do EVERYTHING in Godot using natural language:**

| Feature | Description | Example |
|---------|-------------|---------|
| Scripts CRUD | Create/read/update/delete GDScript files | "Create a movement script for the player" |
| Scenes | Create and modify .tscn scenes | "Create a Player scene with CharacterBody2D" |
| Nodes | Add/modify/remove nodes | "Add a Sprite2D to the Player" |
| Assets | Load textures, sprites | "Load player.png into the sprite" |
| Debug | Launch, stop, capture output | "Run the project and show errors" |
| UID | Godot 4.4+ identifier management | "Update UID references" |
| 3D | Export MeshLibrary for GridMap | "Export meshes as MeshLibrary" |

## Installation

### Prerequisites
- Node.js
- Godot 4.x (4.4+ recommended for UID features)

### Build
```bash
git clone https://github.com/pierrealexandreguillemin-a11y/godot-mcp-unified.git
cd godot-mcp-unified
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/path/to/godot-mcp-unified/build/index.js"],
      "env": {
        "GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

### VS Code / Claude Code

Create `.vscode/mcp.json` in your Godot project:

```json
{
  "servers": {
    "godot": {
      "command": "node",
      "args": ["/path/to/godot-mcp-unified/build/index.js"],
      "env": {
        "GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

### Ollama (via ollmcp)

```bash
ollmcp --model qwen2.5-coder:7b /path/to/godot-mcp-unified/build/index.js
```

## Available Tools

### Project Management
- `launch_editor` - Open Godot editor
- `run_project` - Run a project
- `stop_project` - Stop running project
- `get_debug_output` - Get console output
- `list_projects` - List projects in directory
- `get_project_info` - Get project info
- `get_godot_version` - Get Godot version

### Scene Management
- `create_scene` - Create new scene
- `add_node` - Add a node
- `edit_node` - Edit node properties
- `remove_node` - Remove a node
- `load_sprite` - Load texture
- `save_scene` - Save scene
- `export_mesh_library` - Export as MeshLibrary

### UID (Godot 4.4+)
- `get_uid` - Get file UID
- `update_project_uids` - Update references

## Usage Examples

### Create a player character
```
"Create a Player.tscn scene with CharacterBody2D as root,
add a Sprite2D named 'Sprite' and CollisionShape2D named 'Collision'"
```

### Debug a project
```
"Run my Godot project and show me any console errors"
```

### Modify an existing scene
```
"In Player.tscn, change the Sprite position to (100, 50)
and scale to 2x"
```

## Credits

This project unifies features from:
- [ee0pdt/Godot-MCP](https://github.com/ee0pdt/Godot-MCP) - Scripts CRUD
- [bradypp/godot-mcp](https://github.com/bradypp/godot-mcp) - Main base (scenes, nodes, UID, 3D)
- [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp) - Launch, run, debug

## License

MIT License - See [LICENSE](LICENSE)
