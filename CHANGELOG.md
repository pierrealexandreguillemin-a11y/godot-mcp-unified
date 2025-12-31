# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2024-12-31

### Added
- **Export Tools** (1 tool):
  - `list_export_presets`: List all export presets from export_presets.cfg

- Unit tests for export tool

### Changed
- Tool count increased from 71 to 72

## [0.6.0] - 2024-12-31

### Added
- **Asset Tools** (3 tools):
  - `list_assets`: List all assets (images, audio, 3D models, fonts) in a Godot project
  - `import_asset`: Copy external asset file into project (auto-imported by Godot)
  - `reimport_assets`: Force reimport via touch or .import deletion

- Unit tests for all 3 new tools
- Asset category filtering (texture, audio, model, font)
- .import file detection for assets

### Changed
- Tool count increased from 68 to 71
- Updated ROADMAP.md with Phase 4 status

### Fixed
- Corrected tool count (was documented as 66, actual was 68)

## [0.5.0] - 2024-12-31

### Added
- **Shader Tools** (2 tools):
  - `create_shader`: Create .gdshader files with shader_type, render_mode, vertex/fragment/light code
  - `create_shader_material`: Create ShaderMaterial resource with shader reference and parameters

- **Navigation Tools** (2 tools):
  - `create_navigation_region`: Create NavigationRegion2D/3D node for pathfinding
  - `bake_navigation_mesh`: Create NavigationPolygon (2D) or NavigationMesh (3D) resource

- **Particles Tools** (2 tools):
  - `create_gpu_particles`: Create GPUParticles2D/3D node with amount, lifetime, preprocess
  - `create_particle_material`: Create ParticleProcessMaterial with emission shape, direction, gravity

- **UI Tools** (2 tools):
  - `create_ui_container`: Create Container nodes (VBox, HBox, Grid, Center, Margin, Panel, Scroll, Split, Tab, Flow)
  - `create_control`: Create Control nodes (Button, Label, LineEdit, TextEdit, TextureRect, ColorRect, Slider, SpinBox, CheckBox)

- **Lighting Tools** (2 tools):
  - `create_light`: Create Light2D/3D nodes (Directional, Omni, Spot, Point)
  - `setup_environment`: Create Environment resource with background, ambient light, fog, glow, SSAO, SSR, SDFGI

- GDScript operations for create_navigation_region, create_gpu_particles, create_ui_container, create_control, create_light
- Unit tests for all 10 new tools (303 total tests)
- @types/fs-extra for TypeScript compatibility

### Changed
- Tool count increased from 54 to 68 (10 new tools + 4 previously undocumented)
- Updated ROADMAP.md with Phase 3 status

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
