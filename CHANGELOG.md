# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2024-12-31

### Added
- **Animation Tools** (4 tools):
  - `create_animation_player`: Create AnimationPlayer node in scene
  - `add_animation`: Add animation to AnimationPlayer via AnimationLibrary
  - `add_animation_track`: Add track (value, position, rotation, scale, method, bezier, audio, animation)
  - `set_keyframe`: Set keyframe with value, transition type, and easing

- **Physics Tools** (3 tools):
  - `create_collision_shape`: Create CollisionShape2D/3D with various shape types
  - `setup_rigidbody`: Configure RigidBody properties (mass, gravity, freeze, etc.)
  - `configure_physics_layers`: Name physics layers in project settings

- **TileMap Tools** (4 tools):
  - `create_tileset`: Create TileSet resource with tile size and optional texture
  - `create_tilemap_layer`: Create TileMapLayer node with tileset reference
  - `set_tile`: Set single tile at grid position
  - `paint_tiles`: Batch paint multiple tiles

- **Audio Tools** (3 tools):
  - `create_audio_bus`: Create audio bus with parent routing and volume
  - `setup_audio_player`: Configure AudioStreamPlayer node
  - `add_audio_effect`: Add audio effect (reverb, delay, eq6/10/21, compressor, etc.)

- GDScript operations in `godot_operations.gd` for all 14 new tools
- Unit tests for all new tools (254 total tests)
- MCP specification documentation (`docs/MCP_SPECIFICATION.md`)

### Changed
- Updated ARCHITECTURE.md with new tool categories
- Updated ROADMAP.md with Phase 2 completion status
- Tool count increased from 40 to 54

### Fixed
- Validation order in tool handlers (business logic before project path validation)
- AudioEffectEQ replaced with concrete classes (EQ6, EQ10, EQ21)

## [0.3.0] - 2024-12-09

### Added
- MCP Resources and Prompts capabilities
- MCP logging support
- Bridge integration tests with mock Godot server

## [0.2.0] - 2024-12-08

### Added
- Bidirectional bridge (GodotBridge TCP client)
- GodotLSPClient for real-time diagnostics
- EditorPlugin for Godot (mcp_bridge.gd)
- 205 tests including integration tests

## [0.1.0] - 2024-12-07

### Added
- Initial MCP server implementation
- 42 tools covering scenes, scripts, nodes, signals, resources
- TscnParser state-machine
- LruCache with TTL
- ProcessPool for concurrent Godot operations
- ESLint 9 flat config
- TypeScript strict mode (0 any, 0 errors)
