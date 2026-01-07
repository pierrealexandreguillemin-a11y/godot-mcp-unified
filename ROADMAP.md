# Roadmap godot-mcp-unified

> Plan d'implementation vers 150 outils - Conforme ISO 25010/29119/5055/12207

**Version cible**: 1.0.0 | **Outils actuels**: 79 | **Objectif**: 150

---

## Table des matieres

1. [Etat actuel](#etat-actuel--79-outils-v090)
2. [Conformite ISO](#conformite-aux-normes-iso)
3. [Architecture MCP recommandee](#architecture-mcp-recommandee)
4. [Plan d'implementation detaille](#plan-dimplementation-detaille)
5. [Specifications techniques par phase](#specifications-techniques-par-phase)
6. [Metriques qualite](#metriques-qualite)

---

## Etat actuel : 79 outils (v0.9.0)

### Progression globale

```
Outils implementes:     79/150  ████████████████░░░░░░░░░░░░░░ 53%
Tests couverts:         65/79   ████████████████████░░░░░░░░░░ 82%
Documentation:          79/79   ██████████████████████████████ 100%
```

### Outils par categorie

| Categorie | Nb | Outils |
|-----------|:--:|--------|
| **Project** | 12 | launch_editor, run_project, stop_project, get_debug_output, list_projects, get_project_info, get_godot_version, get_project_settings, set_project_setting, manage_input_actions, validate_project, manage_autoloads |
| **Scene** | 13 | create_scene, add_node, edit_node, remove_node, rename_node, move_node, duplicate_node, get_scene_tree, load_sprite, save_scene, instance_scene, list_scenes, export_mesh_library |
| **Script** | 6 | list_scripts, read_script, write_script, delete_script, attach_script, detach_script |
| **Animation** | 7 | create_animation_player, add_animation, add_animation_track, set_keyframe, create_animation_tree, setup_state_machine, blend_animations |
| **Physics** | 3 | create_collision_shape, setup_rigidbody, configure_physics_layers |
| **TileMap** | 4 | create_tileset, create_tilemap_layer, set_tile, paint_tiles |
| **Audio** | 3 | create_audio_bus, setup_audio_player, add_audio_effect |
| **Shader** | 2 | create_shader, create_shader_material |
| **Navigation** | 2 | create_navigation_region, bake_navigation_mesh |
| **Particles** | 2 | create_gpu_particles, create_particle_material |
| **UI** | 2 | create_ui_container, create_control |
| **Lighting** | 2 | create_light, setup_environment |
| **Assets** | 3 | list_assets, import_asset, reimport_assets |
| **Resource** | 4 | list_resources, create_resource, read_resource, modify_resource |
| **Export** | 3 | export_project, export_pack, list_export_presets |
| **Signals** | 3 | connect_signal, disconnect_signal, list_signals |
| **Groups** | 3 | add_to_group, remove_from_group, list_groups |
| **Debug** | 5 | get_debug_output, start_debug_stream, stop_debug_stream, get_debug_stream_status, get_script_errors |
| **UID** | 2 | get_uid, update_project_uids |
| **Batch** | 1 | batch_operations |

---

## Conformite aux normes ISO

### ISO/IEC 25010 - Modele qualite produit

```
                    QUALITE PRODUIT
                          |
    +---------------------+---------------------+
    |         |           |           |         |
Fiabilite  Securite  Maintenabilite  Portabilite  ...
    |         |           |
    v         v           v
 Tests    Validation   Modularite
 Erreurs  Inputs       1 fichier = 1 outil
```

#### Exigences implementees

| Caracteristique | Sous-caracteristique | Implementation | Mesure |
|-----------------|---------------------|----------------|--------|
| **Fiabilite** | Maturite | Tests Jest pour chaque outil | > 80% coverage |
| | Disponibilite | Gestion gracieuse des erreurs | 0 crash non gere |
| | Tolerance pannes | Try/catch + fallback | 100% operations |
| | Recuperabilite | Rollback sur echec | Partiel |
| **Securite** | Confidentialite | Pas de secrets en clair | Audit manuel |
| | Integrite | Validation Zod des inputs | 100% outils |
| | Non-repudiation | Logging horodate | Tous les appels |
| **Maintenabilite** | Modularite | Un fichier TypeScript par outil | 100% |
| | Reutilisabilite | BaseToolHandler abstrait | Herite par tous |
| | Analysabilite | JSDoc + types TypeScript | 100% exports |
| | Testabilite | Injection de dependances | Mock possible |
| **Portabilite** | Adaptabilite | Cross-platform (Win/Mac/Linux) | Teste Windows |
| | Installabilite | npm install standard | 1 commande |

### ISO/IEC 29119 - Tests logiciels

#### Pyramide de tests

```
                    /\
                   /  \  E2E (manuel)
                  /----\
                 /      \  Integration
                /--------\
               /          \  Unitaires (Jest)
              /------------\
```

#### Standards de test

| Type | Outil | Pattern | Couverture cible |
|------|-------|---------|------------------|
| Unitaire | Jest | `*.test.ts` | > 80% |
| Integration | Jest + mocks | Scenarios complets | > 60% |
| E2E | Manuel + CI | Godot reel | Smoke tests |

#### Structure test recommandee (ISO 29119-3)

```typescript
// src/tools/example/ExampleTool.test.ts

describe('ExampleTool', () => {
  // ISO 29119-3: Test Case Specification
  describe('execute', () => {
    // Preconditions
    beforeEach(() => {
      // Setup
    });

    // Test cases
    it('should [expected behavior] when [condition]', async () => {
      // Arrange (Given)
      const input = { /* ... */ };

      // Act (When)
      const result = await tool.execute(input);

      // Assert (Then)
      expect(result.success).toBe(true);
    });

    // Error cases
    it('should throw [error] when [invalid condition]', async () => {
      // ...
    });
  });
});
```

### ISO/IEC 5055 - Qualite code automatisee

#### Metriques CISQ implementees

| Metrique | Cible | Verification |
|----------|-------|--------------|
| **Fiabilite** | | |
| Gestion null/undefined | 0 erreur | `strictNullChecks: true` |
| Gestion exceptions | 100% try/catch | ESLint rule |
| Fuite ressources | 0 fuite | Cleanup explicite |
| **Securite** | | |
| Path traversal | 0 vulnerabilite | Validation chemins |
| Injection commande | 0 vulnerabilite | Echappement args |
| Donnees sensibles | 0 exposition | Pas de secrets |
| **Performance** | | |
| Complexite cyclomatique | < 10/fonction | ESLint complexity |
| Taille fonction | < 50 lignes | Convention |
| Boucles infinies | 0 | Timeouts |
| **Maintenabilite** | | |
| Code duplique | < 5% | DRY via base class |
| Taille fichier | < 300 lignes | Convention |
| Profondeur heritage | < 3 | Architecture plate |

#### Configuration ESLint recommandee

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'complexity': ['error', { max: 10 }],
    'max-lines-per-function': ['warn', { max: 50 }],
    'max-depth': ['error', { max: 4 }],
    'no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'error',
  }
};
```

### ISO/IEC 12207 - Processus cycle de vie

#### Processus de developpement

```
┌─────────────────────────────────────────────────────────────────┐
│                    CYCLE DE VIE OUTIL MCP                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ANALYSE        2. CONCEPTION      3. IMPLEMENTATION         │
│  ┌─────────┐       ┌─────────┐        ┌─────────┐              │
│  │ Besoin  │──────>│ Schema  │───────>│ Code    │              │
│  │ ROADMAP │       │ Input/  │        │ Tool.ts │              │
│  └─────────┘       │ Output  │        └────┬────┘              │
│                    └─────────┘             │                    │
│                                            v                    │
│  6. DEPLOIEMENT    5. VALIDATION      4. TESTS                 │
│  ┌─────────┐       ┌─────────┐        ┌─────────┐              │
│  │ npm     │<──────│ Review  │<───────│ Jest    │              │
│  │ publish │       │ + CI    │        │ .test.ts│              │
│  └─────────┘       └─────────┘        └─────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Checklist par outil (ISO 12207 conforme)

- [ ] **Analyse**: Besoin documente dans ROADMAP.md
- [ ] **Conception**: Schema Zod input/output defini
- [ ] **Implementation**: Code TypeScript avec types stricts
- [ ] **Tests**: Fichier .test.ts avec > 80% coverage
- [ ] **Integration**: Enregistre dans ToolRegistry.ts
- [ ] **Documentation**: JSDoc + README mis a jour
- [ ] **Review**: Code review avant merge
- [ ] **Validation**: Tests CI passes

---

## Architecture MCP recommandee

### Specification MCP 2025-11-25

Reference officielle: [modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-11-25)

#### Primitives MCP

| Primitive | Description | Usage godot-mcp |
|-----------|-------------|-----------------|
| **Tools** | Actions executables par l'IA | 79 implementes |
| **Resources** | Donnees read-only exposees | A implementer |
| **Prompts** | Templates de prompts reusables | A implementer |

#### Structure outil MCP recommandee

```typescript
// src/tools/[category]/[ToolName]Tool.ts

import { z } from 'zod';
import { BaseToolHandler } from '../BaseToolHandler';
import type { ToolDefinition, ToolResult } from '../../core/types';

// 1. SCHEMA INPUT (ISO 5055: validation)
const InputSchema = z.object({
  projectPath: z.string().describe('Chemin vers le projet Godot'),
  requiredParam: z.string().describe('Description claire'),
  optionalParam: z.string().optional().describe('Parametre optionnel'),
}).strict(); // Refuse proprietes inconnues

type Input = z.infer<typeof InputSchema>;

// 2. SCHEMA OUTPUT (ISO 25010: fiabilite)
interface Output {
  success: boolean;
  data?: unknown;
  error?: string;
}

// 3. CLASSE OUTIL
export class ToolNameTool extends BaseToolHandler<Input, Output> {
  // ISO 5055: Nom descriptif
  readonly name = 'tool_name';

  // ISO 25010: Documentation
  readonly description = 'Description claire de ce que fait l\'outil';

  // MCP: Schema pour validation automatique
  readonly inputSchema = InputSchema;

  // ISO 29119: Methode testable
  async execute(input: Input): Promise<ToolResult<Output>> {
    // ISO 5055: Validation entree
    const validated = this.validateInput(input);
    if (!validated.success) {
      return this.error(validated.error);
    }

    try {
      // ISO 25010: Logique metier isolee
      const result = await this.performOperation(validated.data);

      // ISO 5055: Logging pour tracabilite
      this.logger.info(`Operation completed: ${this.name}`);

      return this.success(result);
    } catch (error) {
      // ISO 25010: Gestion erreurs robuste
      this.logger.error(`Operation failed: ${this.name}`, error);
      return this.error(this.formatError(error));
    }
  }

  // ISO 5055: Fonctions petites et focalisees
  private async performOperation(input: Input): Promise<Output> {
    // Implementation specifique
  }
}

// 4. EXPORT SINGLETON
export const toolNameTool = new ToolNameTool();
```

#### Tests associes

```typescript
// src/tools/[category]/[ToolName]Tool.test.ts

import { toolNameTool } from './ToolNameTool';
import { createMockGodotBridge } from '../test-utils';

describe('ToolNameTool', () => {
  let mockBridge: jest.Mocked<GodotBridge>;

  beforeEach(() => {
    mockBridge = createMockGodotBridge();
    toolNameTool.setBridge(mockBridge);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      expect(toolNameTool.name).toBe('tool_name');
      expect(toolNameTool.description).toBeDefined();
    });
  });

  describe('execute', () => {
    // Cas nominal
    it('should succeed with valid input', async () => {
      const input = {
        projectPath: '/valid/path',
        requiredParam: 'value',
      };

      const result = await toolNameTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    // Cas d'erreur
    it('should fail with invalid path', async () => {
      const input = {
        projectPath: '',
        requiredParam: 'value',
      };

      const result = await toolNameTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('path');
    });

    // Cas limite
    it('should handle edge case', async () => {
      // ...
    });
  });
});
```

---

## Plan d'implementation detaille

### Vue d'ensemble des phases

```
PHASE 1-7 ✅ COMPLETE (79 outils)
├── Scripts, Scenes, Animation, Physics, TileMap
├── Audio, Shader, Navigation, Particles, UI, Lighting
└── Assets, Export, Batch, Debug, UID

PHASE 8-15 (39 outils) → 118 total
├── Physics Avancee (4)
├── TileMap Avance (3)
├── UI Avancee (5)
├── Multiplayer (5)
├── Shaders Avances (5)
├── 3D Avance (6)
├── AI & Behavior (4)
└── Save/Load & Screenshots (7)

PHASE 16-20 (32 outils) → 150 total
├── GDExtension & C# (5)
├── Dialogue & Localization (6)
├── Level Design (8)
├── Templates & Scaffolding (8)
└── Analytics & Debug Avance (5)
```

---

## Specifications techniques par phase

### Phase 8: Physics Avancee (4 outils) → 83 total

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_area` | `{ projectPath, scenePath, parentNode, name, is2D, monitorable?, monitoring?, collisionLayer?, collisionMask? }` | `{ success, nodePath }` | `Area2D`, `Area3D` |
| `setup_raycast` | `{ projectPath, scenePath, parentNode, name, is2D, targetPosition, enabled?, collideWithAreas?, collideWithBodies? }` | `{ success, nodePath }` | `RayCast2D`, `RayCast3D` |
| `create_physics_material` | `{ projectPath, resourcePath, friction?, rough?, bounce?, absorbent? }` | `{ success, resourcePath }` | `PhysicsMaterial` |
| `setup_joints` | `{ projectPath, scenePath, parentNode, jointType, nodeA, nodeB, is2D, params? }` | `{ success, nodePath }` | `Joint2D`, `Generic6DOFJoint3D` |

#### Implementation recommandee: `create_area`

```typescript
// src/tools/physics/CreateAreaTool.ts

const InputSchema = z.object({
  projectPath: z.string(),
  scenePath: z.string(),
  parentNode: z.string(),
  name: z.string().default('Area'),
  is2D: z.boolean().default(true),
  monitorable: z.boolean().optional().default(true),
  monitoring: z.boolean().optional().default(true),
  collisionLayer: z.number().optional().default(1),
  collisionMask: z.number().optional().default(1),
});

// Godot EditorScript
const gdScript = `
@tool
extends EditorScript

func _run():
    var scene = load("${scenePath}")
    var root = scene.instantiate()
    var parent = root.get_node("${parentNode}")

    var area = ${is2D ? 'Area2D' : 'Area3D'}.new()
    area.name = "${name}"
    area.monitorable = ${monitorable}
    area.monitoring = ${monitoring}
    area.collision_layer = ${collisionLayer}
    area.collision_mask = ${collisionMask}

    parent.add_child(area)
    area.owner = root

    var packed = PackedScene.new()
    packed.pack(root)
    ResourceSaver.save(packed, "${scenePath}")
`;
```

---

### Phase 9: TileMap Avance (3 outils) → 86 total

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `setup_autotile` | `{ projectPath, tilesetPath, terrainSetIndex, terrainName, tiles[] }` | `{ success }` | `TileSet.add_terrain()` |
| `create_tile_collision` | `{ projectPath, tilesetPath, sourceId, atlasCoords, polygons[] }` | `{ success }` | `TileData.add_collision_polygon()` |
| `create_tile_navigation` | `{ projectPath, tilesetPath, sourceId, atlasCoords, polygon }` | `{ success }` | `TileData.set_navigation_polygon()` |

---

### Phase 10: UI Avancee (5 outils) → 91 total

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_ui_theme` | `{ projectPath, themePath, baseTheme?, styleboxes?, fonts?, colors? }` | `{ success, themePath }` | `Theme` |
| `setup_control_anchors` | `{ projectPath, scenePath, nodePath, preset?, customAnchors? }` | `{ success }` | `Control.set_anchors_preset()` |
| `setup_focus_navigation` | `{ projectPath, scenePath, nodePath, neighbors: { top?, bottom?, left?, right? } }` | `{ success }` | `Control.focus_neighbor_*` |
| `create_popup` | `{ projectPath, scenePath, parentNode, type, title?, size? }` | `{ success, nodePath }` | `PopupMenu`, `ConfirmationDialog` |
| `setup_responsive_ui` | `{ projectPath, scenePath, nodePath, minSize?, stretchMode?, aspectRatio? }` | `{ success }` | `Container`, `AspectRatioContainer` |

---

### Phase 11: Multiplayer (5 outils) → 96 total

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `setup_multiplayer_peer` | `{ projectPath, peerType: 'enet'|'websocket'|'webrtc', port?, maxClients? }` | `{ success, scriptPath }` | `ENetMultiplayerPeer` |
| `create_network_spawner` | `{ projectPath, scenePath, parentNode, spawnPath, spawnLimit? }` | `{ success, nodePath }` | `MultiplayerSpawner` |
| `setup_synchronizer` | `{ projectPath, scenePath, nodePath, properties[], replicationInterval? }` | `{ success, nodePath }` | `MultiplayerSynchronizer` |
| `define_rpc_functions` | `{ projectPath, scriptPath, functions: { name, mode, sync, transferMode }[] }` | `{ success }` | `@rpc` annotation |
| `create_lobby_system` | `{ projectPath, maxPlayers, autostart? }` | `{ success, scenePath, scriptPath }` | Template complet |

#### Implementation recommandee: `setup_synchronizer`

```typescript
// src/tools/multiplayer/SetupSynchronizerTool.ts

const InputSchema = z.object({
  projectPath: z.string(),
  scenePath: z.string(),
  nodePath: z.string(),
  properties: z.array(z.object({
    path: z.string(), // Ex: ":position", ":rotation"
    replicateOnSpawn: z.boolean().optional().default(true),
    watchOnce: z.boolean().optional().default(false),
  })),
  replicationInterval: z.number().optional().default(0.0), // 0 = every frame
  rootPath: z.string().optional(),
  publicVisibility: z.boolean().optional().default(true),
});

// Modification .tscn
const tscnModification = `
[node name="MultiplayerSynchronizer" type="MultiplayerSynchronizer" parent="${nodePath}"]
root_path = NodePath("${rootPath || '..'}")
replication_interval = ${replicationInterval}
public_visibility = ${publicVisibility}
replication_config = SubResource("SceneReplicationConfig_xxxxx")

[sub_resource type="SceneReplicationConfig" id="SceneReplicationConfig_xxxxx"]
${properties.map(p => `properties/${idx}/path = NodePath("${p.path}")
properties/${idx}/spawn = ${p.replicateOnSpawn}
properties/${idx}/watch = ${!p.watchOnce}`).join('\n')}
`;
```

---

### Phase 12: Shaders Avances (5 outils) → 101 total

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_particle_attractor` | `{ projectPath, scenePath, parentNode, is2D, strength, attenuation, radius }` | `{ success, nodePath }` | `GPUParticlesAttractor*` |
| `create_particle_collision` | `{ projectPath, scenePath, parentNode, collisionType, is2D }` | `{ success, nodePath }` | `GPUParticlesCollision*` |
| `create_visual_shader` | `{ projectPath, shaderPath, mode: 'spatial'|'canvas_item'|'particles', nodes[] }` | `{ success, shaderPath }` | `VisualShader` |
| `add_shader_parameter` | `{ projectPath, shaderPath, name, type, defaultValue?, hint? }` | `{ success }` | `uniform` |
| `create_shader_preset` | `{ projectPath, shaderPath, preset: 'outline'|'dissolve'|'pixelate'|'blur', params? }` | `{ success, shaderPath }` | Templates shader |

---

### Phase 13: 3D Avance (6 outils) → 107 total

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_mesh_instance` | `{ projectPath, scenePath, parentNode, meshType, size?, material? }` | `{ success, nodePath }` | `MeshInstance3D` |
| `setup_material` | `{ projectPath, materialPath, albedo?, metallic?, roughness?, emission? }` | `{ success, materialPath }` | `StandardMaterial3D` |
| `create_csg_shape` | `{ projectPath, scenePath, parentNode, shapeType, operation, params }` | `{ success, nodePath }` | `CSGBox3D`, etc. |
| `setup_lightmapper` | `{ projectPath, scenePath, quality, bounces?, useDenoiser? }` | `{ success }` | `LightmapGI` |
| `create_world_environment` | `{ projectPath, scenePath, sky?, ambient?, fog?, tonemap? }` | `{ success, nodePath }` | `WorldEnvironment` |
| `setup_post_processing` | `{ projectPath, scenePath, effects: { bloom?, dof?, ssao?, ssr? } }` | `{ success }` | `Environment` |

---

### Phase 14: AI & Behavior (4 outils) → 111 total

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_behavior_tree` | `{ projectPath, resourcePath, nodes: { type, name, children?, action? }[] }` | `{ success, resourcePath }` | Resource custom |
| `setup_finite_state_machine` | `{ projectPath, scriptPath, states[], transitions[] }` | `{ success, scriptPath }` | GDScript template |
| `create_utility_ai` | `{ projectPath, resourcePath, actions: { name, considerations[] }[] }` | `{ success, resourcePath }` | Resource custom |
| `setup_advanced_pathfinding` | `{ projectPath, scenePath, nodePath, avoidanceEnabled?, layers?, radius? }` | `{ success }` | `NavigationAgent*` |

#### Implementation recommandee: `setup_finite_state_machine`

```typescript
// Template GDScript genere
const fsmTemplate = `
class_name ${className}
extends Node

enum State { ${states.map(s => s.name.toUpperCase()).join(', ')} }

var current_state: State = State.${states[0].name.toUpperCase()}
var previous_state: State = current_state

signal state_changed(from_state: State, to_state: State)

func _ready() -> void:
    _enter_state(current_state)

func _process(delta: float) -> void:
    _update_state(delta)

func change_state(new_state: State) -> void:
    if new_state == current_state:
        return
    _exit_state(current_state)
    previous_state = current_state
    current_state = new_state
    _enter_state(new_state)
    state_changed.emit(previous_state, current_state)

func _enter_state(state: State) -> void:
    match state:
${states.map(s => `        State.${s.name.toUpperCase()}:
            _enter_${s.name.toLowerCase()}()`).join('\n')}

func _exit_state(state: State) -> void:
    match state:
${states.map(s => `        State.${s.name.toUpperCase()}:
            _exit_${s.name.toLowerCase()}()`).join('\n')}

func _update_state(delta: float) -> void:
    match current_state:
${states.map(s => `        State.${s.name.toUpperCase()}:
            _update_${s.name.toLowerCase()}(delta)`).join('\n')}

# State implementations
${states.map(s => `
func _enter_${s.name.toLowerCase()}() -> void:
    pass

func _exit_${s.name.toLowerCase()}() -> void:
    pass

func _update_${s.name.toLowerCase()}(delta: float) -> void:
    pass
`).join('\n')}
`;
```

---

### Phase 15: Save/Load & Screenshots (7 outils) → 118 total

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_save_resource` | `{ projectPath, resourcePath, properties: { name, type, defaultValue }[] }` | `{ success, resourcePath }` | `Resource` custom |
| `serialize_scene` | `{ projectPath, scenePath, outputPath, format: 'json'|'binary' }` | `{ success, outputPath }` | Serialization |
| `deserialize_scene` | `{ projectPath, inputPath, scenePath }` | `{ success, scenePath }` | Deserialization |
| `get_class_documentation` | `{ className }` | `{ success, documentation }` | Godot docs API |
| `search_documentation` | `{ query, limit? }` | `{ success, results[] }` | Godot docs API |
| `get_node_types` | `{ filter?, category? }` | `{ success, types[] }` | ClassDB |
| `take_screenshot` | `{ projectPath, outputPath, viewport?: 'editor'|'game', format? }` | `{ success, imagePath }` | Viewport.get_texture() |

#### Implementation recommandee: `take_screenshot`

```typescript
// src/tools/capture/TakeScreenshotTool.ts

const InputSchema = z.object({
  projectPath: z.string(),
  outputPath: z.string(),
  viewport: z.enum(['editor', 'game']).optional().default('editor'),
  format: z.enum(['png', 'jpg', 'webp']).optional().default('png'),
  quality: z.number().min(0).max(100).optional().default(90),
});

// Pour viewport editor: necessite plugin Godot
// Pour viewport game: via EditorScript pendant run_project

const editorPluginCode = `
@tool
extends EditorPlugin

func take_editor_screenshot(output_path: String) -> void:
    var viewport = EditorInterface.get_editor_viewport_2d() # ou 3d
    await RenderingServer.frame_post_draw
    var image = viewport.get_texture().get_image()
    image.save_png(output_path)
`;

const gameScreenshotCode = `
extends Node

func _ready():
    await RenderingServer.frame_post_draw
    var image = get_viewport().get_texture().get_image()
    image.save_png("${outputPath}")
    get_tree().quit()
`;
```

---

### Phase 16: GDExtension & C# (5 outils) → 123 total

| Outil | Input Schema | Output | API |
|-------|--------------|--------|-----|
| `create_gdextension` | `{ projectPath, extensionName, language: 'cpp'|'rust', classes[] }` | `{ success, extensionPath }` | godot-cpp template |
| `setup_csharp_project` | `{ projectPath }` | `{ success, csprojPath }` | .NET SDK |
| `convert_script_to_csharp` | `{ projectPath, gdScriptPath, outputPath }` | `{ success, csharpPath }` | Conversion automatique |
| `register_custom_class` | `{ projectPath, className, baseClass, iconPath?, scriptPath }` | `{ success }` | `class_name` |
| `create_editor_tool` | `{ projectPath, scriptPath, toolName }` | `{ success, scriptPath }` | `@tool` |

---

### Phase 17: Dialogue & Localization (6 outils) → 129 total

| Outil | Input Schema | Output | API |
|-------|--------------|--------|-----|
| `create_dialogue_resource` | `{ projectPath, resourcePath, format, dialogues[] }` | `{ success, resourcePath }` | Resource custom |
| `import_dialogue_file` | `{ projectPath, inputPath, format: 'yarn'|'ink'|'json' }` | `{ success, resourcePath }` | Parser |
| `setup_localization` | `{ projectPath, defaultLocale, locales[] }` | `{ success }` | TranslationServer |
| `add_translation` | `{ projectPath, locale, key, value }` | `{ success }` | Translation |
| `create_voice_line_resource` | `{ projectPath, resourcePath, lines: { key, audioPath, locale }[] }` | `{ success, resourcePath }` | Resource |
| `export_localization` | `{ projectPath, outputPath, format: 'csv'|'po'|'json' }` | `{ success, outputPath }` | Export |

---

### Phase 18: Level Design (8 outils) → 137 total

| Outil | Input Schema | Output | API |
|-------|--------------|--------|-----|
| `create_procedural_generator` | `{ projectPath, scriptPath, algorithm, params }` | `{ success, scriptPath }` | GDScript template |
| `setup_room_system` | `{ projectPath, scenePath, rooms[], connections[] }` | `{ success }` | Scene instancing |
| `create_spawn_point` | `{ projectPath, scenePath, position, spawnType, params }` | `{ success, nodePath }` | Marker2D/3D |
| `setup_trigger_volume` | `{ projectPath, scenePath, parentNode, shape, signalName }` | `{ success, nodePath }` | Area + signals |
| `create_checkpoint` | `{ projectPath, scenePath, position, checkpointId }` | `{ success, nodePath }` | Custom node |
| `setup_camera_zone` | `{ projectPath, scenePath, bounds, cameraSettings }` | `{ success, nodePath }` | Area + Camera |
| `create_secret_area` | `{ projectPath, scenePath, triggerArea, revealAnimation }` | `{ success, nodePath }` | VisibilityNotifier |
| `import_ldtk_level` | `{ projectPath, ldtkPath, outputPath }` | `{ success, scenePath }` | LDtk parser |

---

### Phase 19: Templates & Scaffolding (8 outils) → 145 total

| Outil | Input Schema | Output | Contenu |
|-------|--------------|--------|---------|
| `scaffold_platformer_2d` | `{ projectPath, playerPhysics?, tileSize? }` | `{ success, files[] }` | Player, Level, Camera |
| `scaffold_topdown_rpg` | `{ projectPath, gridBased?, combatType? }` | `{ success, files[] }` | Player, Enemies, UI |
| `scaffold_fps_3d` | `{ projectPath, weaponSystem? }` | `{ success, files[] }` | Player, Weapons, HUD |
| `scaffold_visual_novel` | `{ projectPath, dialogueFormat? }` | `{ success, files[] }` | DialogueManager, UI |
| `scaffold_puzzle_game` | `{ projectPath, puzzleType? }` | `{ success, files[] }` | Puzzle, Pieces, Win |
| `scaffold_card_game` | `{ projectPath, deckSize?, cardTypes? }` | `{ success, files[] }` | Deck, Hand, Table |
| `scaffold_rhythm_game` | `{ projectPath, inputType? }` | `{ success, files[] }` | Notes, Timing, Score |
| `create_custom_template` | `{ projectPath, templateName, files[] }` | `{ success, templatePath }` | Custom |

---

### Phase 20: Analytics & Debug Avance (5 outils) → 150 total

| Outil | Input Schema | Output | API |
|-------|--------------|--------|-----|
| `setup_performance_profiler` | `{ projectPath, metrics[], sampleRate? }` | `{ success, scriptPath }` | Performance singleton |
| `create_debug_overlay` | `{ projectPath, scenePath, elements[] }` | `{ success, nodePath }` | CanvasLayer + Labels |
| `log_analytics_event` | `{ projectPath, eventName, properties }` | `{ success }` | Custom logger |
| `setup_crash_reporter` | `{ projectPath, webhookUrl?, localLog? }` | `{ success, scriptPath }` | Error handling |
| `create_dev_console` | `{ projectPath, commands[] }` | `{ success, scenePath, scriptPath }` | Console UI + Parser |

---

## Metriques qualite

### Dashboard qualite projet

```
┌─────────────────────────────────────────────────────────────────┐
│                    METRIQUES QUALITE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tests Coverage          ████████████████████░░░░ 82%           │
│  Outils documentes       ██████████████████████████████ 100%    │
│  Complexite < 10         █████████████████████████░░░░░ 85%     │
│  TypeScript strict       ██████████████████████████████ 100%    │
│  ISO 25010 conforme      ████████████████████████░░░░░░ 80%     │
│                                                                 │
│  Derniere mise a jour: 2026-01-01                               │
│  Prochaine release: v0.10.0 (Phase 8)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### KPIs par release

| Version | Outils | Tests | Coverage | Release |
|---------|--------|-------|----------|---------|
| v0.9.0 | 79 | 65 | 82% | ✅ Actuel |
| v0.10.0 | 83 | 70 | 84% | Phase 8 |
| v0.11.0 | 86 | 73 | 85% | Phase 9 |
| v0.12.0 | 91 | 78 | 86% | Phase 10 |
| v0.13.0 | 96 | 84 | 87% | Phase 11 |
| v0.14.0 | 101 | 89 | 88% | Phase 12 |
| v0.15.0 | 107 | 95 | 89% | Phase 13 |
| v0.16.0 | 111 | 99 | 89% | Phase 14 |
| v0.17.0 | 118 | 106 | 90% | Phase 15 |
| v0.18.0 | 123 | 111 | 90% | Phase 16 |
| v0.19.0 | 129 | 117 | 91% | Phase 17 |
| v0.20.0 | 137 | 125 | 91% | Phase 18 |
| v0.21.0 | 145 | 132 | 91% | Phase 19 |
| **v1.0.0** | **150** | **137** | **91%** | **Phase 20** |

---

## Sources et references

### Specifications MCP

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Server Boilerplate](https://github.com/gpuente/mcp-server-boilerplate)

### Normes ISO

- [ISO/IEC 25010:2023](https://iso25000.com/en/iso-25000-standards/iso-25010) - Qualite produit
- [ISO/IEC 29119:2022](https://www.iso.org/standard/81291.html) - Tests logiciels
- [ISO/IEC 5055:2021](https://www.it-cisq.org/standards/code-quality-standards/) - Qualite code CISQ
- [ISO/IEC 12207:2017](https://www.iso.org/standard/63712.html) - Cycle de vie

### Documentation Godot

- [Godot 4.x Documentation](https://docs.godotengine.org/en/stable/)
- [GDScript Reference](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [EditorScript](https://docs.godotengine.org/en/stable/classes/class_editorscript.html)
- [EditorPlugin](https://docs.godotengine.org/en/stable/classes/class_editorplugin.html)

### MCP Godot existants (references)

- [GDAI MCP](https://github.com/3ddelano/gdai-mcp-plugin-godot) - Screenshots
- [ee0pdt/Godot-MCP](https://github.com/ee0pdt/Godot-MCP) - Scripts
- [bradypp/godot-mcp](https://github.com/bradypp/godot-mcp) - UID

---

*Document mis a jour le 1er janvier 2026*
*godot-mcp-unified v0.9.0 → v1.0.0 roadmap*
