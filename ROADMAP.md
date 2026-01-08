# Roadmap godot-mcp-unified

> Plan d'implementation MCP complet - Conforme ISO 25010/29119/5055/12207

**Version cible**: 1.0.0 | **Outils actuels**: 79 | **Resources**: 20 | **Prompts**: 8

---

## Table des matieres

1. [Etat actuel](#etat-actuel--79-outils-v090)
2. [Architecture MCP Complete](#architecture-mcp-complete)
3. [Phase A: MCP Resources](#phase-a-mcp-resources-priorite-haute)
4. [Phase B: MCP Prompts](#phase-b-mcp-prompts-priorite-haute)
5. [Analyse de Completion](#analyse-de-completion-mcpcdc)
6. [Conformite ISO](#conformite-aux-normes-iso)
7. [Annexe: Phases Tools Legacy](#annexe-phases-tools-legacy-8-20)

---

## Etat actuel : 79 outils (v0.9.0)

### Progression globale

```
Primitives MCP:
  Tools implementes:      79/79   ██████████████████████████████ 100%
  Resources implementees: 20/20   ██████████████████████████████ 100%
  Prompts implementes:     8/15   ████████████████░░░░░░░░░░░░░░  53%

Qualite:
  Tests:                 2141     ██████████████████████████████ 100% pass
  Coverage:               44%     █████████████░░░░░░░░░░░░░░░░░  44%
  ISO 5055 (Zod):        79/79   ██████████████████████████████ 100%
  ISO 29119 (Suites):   44/44   ██████████████████████████████ 100%
```

### Outils par categorie

| Categorie | Nb | Outils |
|-----------|:--:|--------|
| **Scene** | 15 | create_scene, add_node, edit_node, remove_node, rename_node, move_node, duplicate_node, get_node_tree, load_sprite, save_scene, instance_scene, list_scenes, export_mesh_library, connect_signal, manage_groups |
| **Script** | 7 | list_scripts, read_script, write_script, delete_script, attach_script, detach_script, get_script_errors |
| **Animation** | 7 | create_animation_player, add_animation, add_animation_track, set_keyframe, create_animation_tree, setup_state_machine, blend_animations |
| **Project** | 14 | launch_editor, run_project, stop_project, list_projects, get_project_info, get_project_settings, set_project_setting, manage_input_actions, validate_project, manage_autoloads, convert_project, validate_conversion, generate_docs, get_godot_version |
| **Physics** | 3 | create_collision_shape, setup_rigidbody, configure_physics_layers |
| **TileMap** | 4 | create_tileset, create_tilemap_layer, set_tile, paint_tiles |
| **Audio** | 3 | create_audio_bus, setup_audio_player, add_audio_effect |
| **Shader** | 2 | create_shader, create_shader_material |
| **Navigation** | 2 | create_navigation_region, bake_navigation_mesh |
| **Particles** | 2 | create_gpu_particles, create_particle_material |
| **UI** | 2 | create_ui_container, create_control |
| **Lighting** | 2 | create_light, setup_environment |
| **Assets** | 3 | list_assets, import_asset, reimport_assets |
| **Resource** | 2 | list_resources, create_resource |
| **Export** | 3 | export_project, export_pack, list_export_presets |
| **Debug** | 5 | get_debug_output, start_debug_stream, stop_debug_stream, get_debug_stream_status, take_screenshot |
| **UID** | 2 | get_uid, update_project_uids |
| **Batch** | 1 | batch_operations |

---

## Architecture MCP Complete

### Les 3 Primitives MCP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODEL CONTEXT PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   TOOLS (79 ✅)            RESOURCES (20 ✅)         PROMPTS (0 ❌)          │
│   ─────────────────        ─────────────────        ─────────────────       │
│   Actions executables      Donnees read-only        Templates reusables     │
│   Client → Server          Server → Client          Server → Client         │
│   create, edit, remove     get, list, read          /scaffold, /create      │
│                                                                             │
│   Ex: create_scene()       Ex: godot://project      Ex: /create-player      │
│       add_node()               godot://scenes           /setup-enemy-ai     │
│       write_script()           godot://debug            /scaffold-fps       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Synergie Tools + Resources + Prompts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW UTILISATEUR                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. LLM lit RESOURCES pour comprendre le contexte                          │
│     └─> godot://project/info, godot://scenes, godot://scripts              │
│                                                                             │
│  2. User invoque PROMPT pour workflow guide                                 │
│     └─> /create-player "avec double saut et dash"                          │
│                                                                             │
│  3. LLM execute TOOLS pour realiser les actions                            │
│     └─> create_scene → add_node → write_script → attach_script             │
│                                                                             │
│  4. RESOURCES se mettent a jour (subscriptions)                            │
│     └─> Client recoit notification de changement                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Impact sur le Roadmap

| Aspect | Avant (Tools only) | Apres (Tools + Resources + Prompts) |
|--------|-------------------|-------------------------------------|
| Outils lecture | 14 (get_*, list_*) | 0 (→ Resources) |
| Outils action | 65 | 65 (inchanges) |
| Scaffolding | 8 outils (Phase 19) | 0 (→ Prompts) |
| Templates | Code genere | Prompts dynamiques |
| Contexte LLM | Appels tools | Acces direct Resources |
| UX | Tool calls | Slash commands |

---

## Phase A: MCP Resources (PRIORITE HAUTE)

### A.1 Specification Resources

Les Resources exposent des donnees read-only via URI. Le LLM peut les lire pour obtenir du contexte sans executer de tool.

```typescript
// Capacites declarees par le serveur
{
  "capabilities": {
    "resources": {
      "subscribe": true,      // Notifications de changement
      "listChanged": true     // Liste dynamique
    }
  }
}
```

### A.2 Resources a Implementer (20)

#### Groupe 1: Project (5 resources)

| URI | Description | Remplace Tool |
|-----|-------------|---------------|
| `godot://project/info` | Infos projet (nom, version, config) | `get_project_info` |
| `godot://project/settings` | Parametres project.godot | `get_project_settings` |
| `godot://project/settings/{section}` | Section specifique | `get_project_settings` |
| `godot://export/presets` | Presets d'export | `list_export_presets` |
| `godot://system/version` | Version Godot installee | `get_godot_version` |

#### Groupe 2: Scenes & Scripts (6 resources)

| URI | Description | Remplace Tool |
|-----|-------------|---------------|
| `godot://scenes` | Liste des scenes .tscn | `list_scenes` |
| `godot://scene/{path}` | Contenu d'une scene | - |
| `godot://scene/{path}/tree` | Arbre de noeuds | `get_node_tree` |
| `godot://scripts` | Liste des scripts .gd | `list_scripts` |
| `godot://script/{path}` | Contenu d'un script | `read_script` |
| `godot://script/errors` | Erreurs de compilation | `get_script_errors` |

#### Groupe 3: Assets & Resources (4 resources)

| URI | Description | Remplace Tool |
|-----|-------------|---------------|
| `godot://assets` | Liste des assets | `list_assets` |
| `godot://assets/{category}` | Assets par categorie | `list_assets` |
| `godot://resources` | Liste des .tres/.res | `list_resources` |
| `godot://uid/{path}` | UID d'un fichier | `get_uid` |

#### Groupe 4: Debug & Runtime (5 resources)

| URI | Description | Remplace Tool |
|-----|-------------|---------------|
| `godot://debug/output` | Sortie console | `get_debug_output` |
| `godot://debug/stream` | Stream temps reel | `get_debug_stream_status` |
| `godot://debug/breakpoints` | Points d'arret actifs | - |
| `godot://debug/stack` | Call stack (si pause) | - |
| `godot://debug/variables` | Variables locales | - |

### A.3 Implementation Type Resource

```typescript
// src/resources/ResourceProvider.ts

import { Resource, ResourceTemplate } from '@modelcontextprotocol/sdk';

export interface GodotResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;

  // Methode pour recuperer le contenu
  read(params?: Record<string, string>): Promise<ResourceContent>;

  // Support subscriptions (optionnel)
  subscribe?(callback: (content: ResourceContent) => void): () => void;
}

// Exemple: ProjectInfoResource
export class ProjectInfoResource implements GodotResource {
  uri = 'godot://project/info';
  name = 'Project Information';
  description = 'Current Godot project metadata and configuration';
  mimeType = 'application/json';

  async read(): Promise<ResourceContent> {
    const projectPath = this.getActiveProjectPath();
    const projectGodot = await this.parseProjectGodot(projectPath);

    return {
      uri: this.uri,
      mimeType: this.mimeType,
      text: JSON.stringify({
        name: projectGodot.application?.config?.name,
        version: projectGodot.application?.config?.version,
        mainScene: projectGodot.application?.run?.main_scene,
        features: projectGodot.application?.config?.features,
        renderingMethod: projectGodot.rendering?.renderer?.rendering_method,
      }, null, 2)
    };
  }
}
```

### A.4 Outils Deprecies apres Resources

Une fois les Resources implementees, ces 14 outils deviennent **deprecated** :

```typescript
// Mapping Tool → Resource
const DEPRECATED_TOOLS = {
  'get_project_info':       'godot://project/info',
  'get_project_settings':   'godot://project/settings',
  'get_node_tree':          'godot://scene/{path}/tree',
  'get_godot_version':      'godot://system/version',
  'get_debug_output':       'godot://debug/output',
  'get_debug_stream_status':'godot://debug/stream',
  'get_script_errors':      'godot://script/errors',
  'get_uid':                'godot://uid/{path}',
  'list_scenes':            'godot://scenes',
  'list_scripts':           'godot://scripts',
  'list_assets':            'godot://assets',
  'list_resources':         'godot://resources',
  'list_export_presets':    'godot://export/presets',
  'read_script':            'godot://script/{path}',
};
```

---

## Phase B: MCP Prompts (PRIORITE HAUTE)

### B.1 Specification Prompts

Les Prompts sont des templates reutilisables que l'utilisateur peut invoquer (slash commands). Ils guident le LLM pour des workflows complexes.

```typescript
// Capacites declarees par le serveur
{
  "capabilities": {
    "prompts": {
      "listChanged": true
    }
  }
}
```

### B.2 Prompts a Implementer (15)

#### Groupe 1: Creation de Gameplay (5 prompts)

| Prompt | Description | Tools Utilises |
|--------|-------------|----------------|
| `/create-player` | Cree un player complet (2D/3D) | create_scene, add_node, write_script, attach_script, create_collision_shape |
| `/create-enemy` | Cree un ennemi avec IA basique | create_scene, add_node, write_script, setup_state_machine |
| `/create-npc` | Cree un NPC interactif | create_scene, add_node, write_script, connect_signal |
| `/create-collectible` | Cree un item ramassable | create_scene, add_node, create_collision_shape, connect_signal |
| `/create-projectile` | Cree un projectile (bullet, etc.) | create_scene, add_node, setup_rigidbody, write_script |

#### Groupe 2: Scaffolding (5 prompts)

| Prompt | Description | Genere |
|--------|-------------|--------|
| `/scaffold-platformer` | Structure projet platformer 2D | Scenes, scripts, tilemaps |
| `/scaffold-topdown` | Structure projet top-down RPG | Scenes, scripts, UI |
| `/scaffold-fps` | Structure projet FPS 3D | Scenes, scripts, weapons |
| `/scaffold-puzzle` | Structure projet puzzle game | Scenes, scripts, mechanics |
| `/scaffold-ui-system` | Systeme UI complet | Menus, HUD, transitions |

#### Groupe 3: Debug & Optimisation (3 prompts)

| Prompt | Description | Actions |
|--------|-------------|---------|
| `/debug-physics` | Diagnostic problemes physiques | Analyse collision layers, rigidbodies |
| `/debug-performance` | Analyse performance scene | Profile nodes, draw calls |
| `/optimize-scene` | Suggestions optimisation | Instancing, culling, LOD |

#### Groupe 4: Conversion & Migration (2 prompts)

| Prompt | Description | Actions |
|--------|-------------|---------|
| `/convert-3to4` | Guide migration Godot 3→4 | convert_project, validate_conversion |
| `/refactor-scene` | Refactoring structure scene | Reorganise nodes, extracts subscenes |

### B.3 Implementation Type Prompt

```typescript
// src/prompts/PromptProvider.ts

import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk';

export interface GodotPrompt {
  name: string;
  title: string;
  description: string;
  arguments: PromptArgument[];

  // Genere les messages du prompt
  getMessages(args: Record<string, string>): Promise<PromptMessage[]>;
}

// Exemple: CreatePlayerPrompt
export class CreatePlayerPrompt implements GodotPrompt {
  name = 'create-player';
  title = 'Create Player Character';
  description = 'Creates a complete player character with movement, collision, and basic script';

  arguments = [
    {
      name: 'type',
      description: '2D or 3D player',
      required: true,
    },
    {
      name: 'features',
      description: 'Features to include (jump, dash, crouch, etc.)',
      required: false,
    },
    {
      name: 'scene_path',
      description: 'Where to save the player scene',
      required: false,
    }
  ];

  async getMessages(args: Record<string, string>): Promise<PromptMessage[]> {
    const is3D = args.type?.toLowerCase() === '3d';
    const features = args.features?.split(',').map(f => f.trim()) || ['jump'];

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a ${is3D ? '3D' : '2D'} player character with the following features: ${features.join(', ')}.

Please use these tools in order:
1. create_scene - Create the player scene at ${args.scene_path || 'res://scenes/player.tscn'}
2. add_node - Add ${is3D ? 'CharacterBody3D' : 'CharacterBody2D'} as root
3. add_node - Add ${is3D ? 'CollisionShape3D' : 'CollisionShape2D'} for collision
4. add_node - Add ${is3D ? 'MeshInstance3D' : 'Sprite2D'} for visuals
5. write_script - Create movement script with ${features.join(', ')}
6. attach_script - Attach script to player root
7. save_scene - Save the completed scene

Include these movement features in the script:
${features.map(f => `- ${f}`).join('\n')}

Use proper Godot 4 syntax and best practices.`
        }
      }
    ];
  }
}
```

### B.4 Phases Legacy Remplacees par Prompts

| Phase Legacy | Outils Prevus | → Prompts |
|--------------|---------------|-----------|
| Phase 14: AI & Behavior | 4 outils | `/create-enemy`, `/setup-ai` |
| Phase 17: Dialogue | 6 outils | `/setup-dialogue` |
| Phase 19: Templates | 8 outils | `/scaffold-*` (5 prompts) |
| Phase 20: Debug Avance | 5 outils | `/debug-*` (3 prompts) |
| **Total** | **23 outils** | **~10 prompts** |

---

## Analyse de Completion MCP/CDC

### Checklist Specification MCP 2025-11-25

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| **Transport** | | |
| stdio transport | ✅ | index.ts |
| HTTP+SSE transport | ❌ | Non implemente |
| **Lifecycle** | | |
| initialize/initialized | ✅ | Via SDK |
| ping/pong | ✅ | Via SDK |
| **Tools** | | |
| tools/list | ✅ | ToolRegistry.ts |
| tools/call | ✅ | Handlers |
| Tool annotations | ⚠️ | Partiel (descriptions) |
| **Resources** | | |
| resources/list | ❌ | A implementer |
| resources/read | ❌ | A implementer |
| resources/subscribe | ❌ | A implementer |
| Resource templates | ❌ | A implementer |
| **Prompts** | | |
| prompts/list | ❌ | A implementer |
| prompts/get | ❌ | A implementer |
| **Sampling** | | |
| sampling/createMessage | ❌ | Non prevu |
| **Logging** | | |
| logging/setLevel | ⚠️ | Logger custom |
| **Roots** | | |
| roots/list | ❌ | Non implemente |

### Completion par Primitive

```
TOOLS:      ████████████████████████████████████████ 100% (79/79)
RESOURCES:  ████████████████████████████████████████ 100% (20/20)
PROMPTS:    ████████████████████░░░░░░░░░░░░░░░░░░░░  53% (8/15)

MCP GLOBAL: █████████████████████████████████░░░░░░░  84% (7 prompts restants)
```

### Gap Analysis

| Gap | Impact | Priorite | Effort |
|-----|--------|----------|--------|
| ~~Resources non implementees~~ | ~~LLM doit appeler tools pour lire~~ | ~~HAUTE~~ | ✅ FAIT |
| 7 Prompts restants | Workflows scaffolding incomplets | HAUTE | 1-2 jours |
| HTTP transport | Limitation stdio only | BASSE | 1 jour |
| Roots | Pas de workspace awareness | BASSE | 0.5 jour |
| Sampling | Pas de generation LLM | N/A | - |

### Plan de Completion

```
SEMAINE 1: Resources (Priorite HAUTE)
├── Jour 1-2: Infrastructure ResourceProvider
├── Jour 3-4: Implementer 20 resources
└── Jour 5: Tests + deprecation tools

SEMAINE 2: Prompts (Priorite HAUTE)
├── Jour 1-2: Infrastructure PromptProvider
├── Jour 3-4: Implementer 15 prompts
└── Jour 5: Tests + documentation

SEMAINE 3: Finalisation
├── Jour 1-2: HTTP transport (optionnel)
├── Jour 3: Roots support
├── Jour 4: Documentation complete
└── Jour 5: Release v1.0.0
```

---

## Conformite aux Normes ISO

### ISO/IEC 25010 - Modele qualite produit

| Caracteristique | Implementation | Mesure |
|-----------------|----------------|--------|
| **Fiabilite** | Tests Jest, error handling | 1757 tests, 100% pass |
| **Securite** | Validation Zod, path traversal | 79/79 outils valides |
| **Maintenabilite** | 1 fichier/outil, TypeScript strict | 100% modularite |
| **Portabilite** | Cross-platform | Win/Mac/Linux |

### ISO/IEC 29119 - Tests logiciels

| Type | Implementation | Couverture |
|------|----------------|------------|
| Unitaire | Jest + fixtures (1757 tests) | 32 suites |
| Integration | createTempProject mocks | 79 outils |
| Conformite | ISO 29119 (validation, limites, integration) | 100% |

### ISO/IEC 5055 - Qualite code

| Metrique | Cible | Actuel |
|----------|-------|--------|
| Validation inputs | 100% Zod | ✅ 100% |
| Path traversal | 0 vuln | ✅ 0 |
| TypeScript strict | 100% | ✅ 100% |
| Complexite < 10 | 100% | ~85% |

---

## Annexe: Phases Tools Legacy (8-20)

> **Note**: Ces phases sont conservees a titre de reference. Certains outils peuvent etre implementes comme Tools classiques si les Resources/Prompts ne couvrent pas le besoin.

### Phase 8: Physics Avancee (4 outils)

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_area` | `{ projectPath, scenePath, parentNode, name, is2D, monitorable?, monitoring?, collisionLayer?, collisionMask? }` | `{ success, nodePath }` | `Area2D`, `Area3D` |
| `setup_raycast` | `{ projectPath, scenePath, parentNode, name, is2D, targetPosition, enabled?, collideWithAreas?, collideWithBodies? }` | `{ success, nodePath }` | `RayCast2D`, `RayCast3D` |
| `create_physics_material` | `{ projectPath, resourcePath, friction?, rough?, bounce?, absorbent? }` | `{ success, resourcePath }` | `PhysicsMaterial` |
| `setup_joints` | `{ projectPath, scenePath, parentNode, jointType, nodeA, nodeB, is2D, params? }` | `{ success, nodePath }` | `Joint2D`, `Generic6DOFJoint3D` |

### Phase 9: TileMap Avance (3 outils)

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `setup_autotile` | `{ projectPath, tilesetPath, terrainSetIndex, terrainName, tiles[] }` | `{ success }` | `TileSet.add_terrain()` |
| `create_tile_collision` | `{ projectPath, tilesetPath, sourceId, atlasCoords, polygons[] }` | `{ success }` | `TileData.add_collision_polygon()` |
| `create_tile_navigation` | `{ projectPath, tilesetPath, sourceId, atlasCoords, polygon }` | `{ success }` | `TileData.set_navigation_polygon()` |

### Phase 10: UI Avancee (5 outils)

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_ui_theme` | `{ projectPath, themePath, baseTheme?, styleboxes?, fonts?, colors? }` | `{ success, themePath }` | `Theme` |
| `setup_control_anchors` | `{ projectPath, scenePath, nodePath, preset?, customAnchors? }` | `{ success }` | `Control.set_anchors_preset()` |
| `setup_focus_navigation` | `{ projectPath, scenePath, nodePath, neighbors: { top?, bottom?, left?, right? } }` | `{ success }` | `Control.focus_neighbor_*` |
| `create_popup` | `{ projectPath, scenePath, parentNode, type, title?, size? }` | `{ success, nodePath }` | `PopupMenu`, `ConfirmationDialog` |
| `setup_responsive_ui` | `{ projectPath, scenePath, nodePath, minSize?, stretchMode?, aspectRatio? }` | `{ success }` | `Container`, `AspectRatioContainer` |

### Phase 11: Multiplayer (5 outils)

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `setup_multiplayer_peer` | `{ projectPath, peerType: 'enet'\|'websocket'\|'webrtc', port?, maxClients? }` | `{ success, scriptPath }` | `ENetMultiplayerPeer` |
| `create_network_spawner` | `{ projectPath, scenePath, parentNode, spawnPath, spawnLimit? }` | `{ success, nodePath }` | `MultiplayerSpawner` |
| `setup_synchronizer` | `{ projectPath, scenePath, nodePath, properties[], replicationInterval? }` | `{ success, nodePath }` | `MultiplayerSynchronizer` |
| `define_rpc_functions` | `{ projectPath, scriptPath, functions: { name, mode, sync, transferMode }[] }` | `{ success }` | `@rpc` annotation |
| `create_lobby_system` | `{ projectPath, maxPlayers, autostart? }` | `{ success, scenePath, scriptPath }` | Template complet |

### Phase 12: Shaders Avances (5 outils)

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_particle_attractor` | `{ projectPath, scenePath, parentNode, is2D, strength, attenuation, radius }` | `{ success, nodePath }` | `GPUParticlesAttractor*` |
| `create_particle_collision` | `{ projectPath, scenePath, parentNode, collisionType, is2D }` | `{ success, nodePath }` | `GPUParticlesCollision*` |
| `create_visual_shader` | `{ projectPath, shaderPath, mode: 'spatial'\|'canvas_item'\|'particles', nodes[] }` | `{ success, shaderPath }` | `VisualShader` |
| `add_shader_parameter` | `{ projectPath, shaderPath, name, type, defaultValue?, hint? }` | `{ success }` | `uniform` |
| `create_shader_preset` | `{ projectPath, shaderPath, preset: 'outline'\|'dissolve'\|'pixelate'\|'blur', params? }` | `{ success, shaderPath }` | Templates shader |

### Phase 13: 3D Avance (6 outils)

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_mesh_instance` | `{ projectPath, scenePath, parentNode, meshType, size?, material? }` | `{ success, nodePath }` | `MeshInstance3D` |
| `setup_material` | `{ projectPath, materialPath, albedo?, metallic?, roughness?, emission? }` | `{ success, materialPath }` | `StandardMaterial3D` |
| `create_csg_shape` | `{ projectPath, scenePath, parentNode, shapeType, operation, params }` | `{ success, nodePath }` | `CSGBox3D`, etc. |
| `setup_lightmapper` | `{ projectPath, scenePath, quality, bounces?, useDenoiser? }` | `{ success }` | `LightmapGI` |
| `create_world_environment` | `{ projectPath, scenePath, sky?, ambient?, fog?, tonemap? }` | `{ success, nodePath }` | `WorldEnvironment` |
| `setup_post_processing` | `{ projectPath, scenePath, effects: { bloom?, dof?, ssao?, ssr? } }` | `{ success }` | `Environment` |

### Phase 14: AI & Behavior (4 outils) → Remplacable par Prompts

| Outil | Input Schema | Output | Alternative Prompt |
|-------|--------------|--------|-------------------|
| `create_behavior_tree` | `{ projectPath, resourcePath, nodes[] }` | `{ success, resourcePath }` | `/create-enemy` |
| `setup_finite_state_machine` | `{ projectPath, scriptPath, states[], transitions[] }` | `{ success, scriptPath }` | `/setup-ai` |
| `create_utility_ai` | `{ projectPath, resourcePath, actions[] }` | `{ success, resourcePath }` | `/setup-ai` |
| `setup_advanced_pathfinding` | `{ projectPath, scenePath, nodePath, params }` | `{ success }` | `/create-enemy` |

### Phase 15: Save/Load & Documentation (7 outils)

| Outil | Input Schema | Output | Godot API |
|-------|--------------|--------|-----------|
| `create_save_resource` | `{ projectPath, resourcePath, properties[] }` | `{ success, resourcePath }` | `Resource` custom |
| `serialize_scene` | `{ projectPath, scenePath, outputPath, format }` | `{ success, outputPath }` | Serialization |
| `deserialize_scene` | `{ projectPath, inputPath, scenePath }` | `{ success, scenePath }` | Deserialization |
| `get_class_documentation` | `{ className }` | `{ success, documentation }` | Godot docs API |
| `search_documentation` | `{ query, limit? }` | `{ success, results[] }` | Godot docs API |
| `get_node_types` | `{ filter?, category? }` | `{ success, types[] }` | ClassDB |
| `advanced_screenshot` | `{ projectPath, outputPath, viewport, format? }` | `{ success, imagePath }` | Viewport.get_texture() |

### Phase 16: GDExtension & C# (5 outils)

| Outil | Input Schema | Output | API |
|-------|--------------|--------|-----|
| `create_gdextension` | `{ projectPath, extensionName, language, classes[] }` | `{ success, extensionPath }` | godot-cpp template |
| `setup_csharp_project` | `{ projectPath }` | `{ success, csprojPath }` | .NET SDK |
| `convert_script_to_csharp` | `{ projectPath, gdScriptPath, outputPath }` | `{ success, csharpPath }` | Conversion auto |
| `register_custom_class` | `{ projectPath, className, baseClass, iconPath?, scriptPath }` | `{ success }` | `class_name` |
| `create_editor_tool` | `{ projectPath, scriptPath, toolName }` | `{ success, scriptPath }` | `@tool` |

### Phase 17: Dialogue & Localization (6 outils) → Remplacable par Prompts

| Outil | Input Schema | Output | Alternative Prompt |
|-------|--------------|--------|-------------------|
| `create_dialogue_resource` | `{ projectPath, resourcePath, format, dialogues[] }` | `{ success }` | `/setup-dialogue` |
| `import_dialogue_file` | `{ projectPath, inputPath, format }` | `{ success }` | `/setup-dialogue` |
| `setup_localization` | `{ projectPath, defaultLocale, locales[] }` | `{ success }` | `/setup-localization` |
| `add_translation` | `{ projectPath, locale, key, value }` | `{ success }` | - |
| `create_voice_line_resource` | `{ projectPath, resourcePath, lines[] }` | `{ success }` | `/setup-dialogue` |
| `export_localization` | `{ projectPath, outputPath, format }` | `{ success }` | - |

### Phase 18: Level Design (8 outils)

| Outil | Input Schema | Output | API |
|-------|--------------|--------|-----|
| `create_procedural_generator` | `{ projectPath, scriptPath, algorithm, params }` | `{ success }` | GDScript template |
| `setup_room_system` | `{ projectPath, scenePath, rooms[], connections[] }` | `{ success }` | Scene instancing |
| `create_spawn_point` | `{ projectPath, scenePath, position, spawnType, params }` | `{ success }` | Marker2D/3D |
| `setup_trigger_volume` | `{ projectPath, scenePath, parentNode, shape, signalName }` | `{ success }` | Area + signals |
| `create_checkpoint` | `{ projectPath, scenePath, position, checkpointId }` | `{ success }` | Custom node |
| `setup_camera_zone` | `{ projectPath, scenePath, bounds, cameraSettings }` | `{ success }` | Area + Camera |
| `create_secret_area` | `{ projectPath, scenePath, triggerArea, revealAnimation }` | `{ success }` | VisibilityNotifier |
| `import_ldtk_level` | `{ projectPath, ldtkPath, outputPath }` | `{ success }` | LDtk parser |

### Phase 19: Templates & Scaffolding (8 outils) → REMPLACE PAR PROMPTS

| Outil Legacy | → Prompt Equivalent |
|--------------|---------------------|
| `scaffold_platformer_2d` | `/scaffold-platformer` |
| `scaffold_topdown_rpg` | `/scaffold-topdown` |
| `scaffold_fps_3d` | `/scaffold-fps` |
| `scaffold_visual_novel` | `/scaffold-visual-novel` |
| `scaffold_puzzle_game` | `/scaffold-puzzle` |
| `scaffold_card_game` | `/scaffold-card-game` |
| `scaffold_rhythm_game` | `/scaffold-rhythm` |
| `create_custom_template` | `/scaffold-custom` |

### Phase 20: Analytics & Debug Avance (5 outils) → Remplacable par Prompts

| Outil | Input Schema | Output | Alternative Prompt |
|-------|--------------|--------|-------------------|
| `setup_performance_profiler` | `{ projectPath, metrics[], sampleRate? }` | `{ success }` | `/debug-performance` |
| `create_debug_overlay` | `{ projectPath, scenePath, elements[] }` | `{ success }` | `/debug-overlay` |
| `log_analytics_event` | `{ projectPath, eventName, properties }` | `{ success }` | - |
| `setup_crash_reporter` | `{ projectPath, webhookUrl?, localLog? }` | `{ success }` | - |
| `create_dev_console` | `{ projectPath, commands[] }` | `{ success }` | `/debug-console` |

---

## Sources et References

### Specifications MCP

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Resources](https://modelcontextprotocol.io/docs/concepts/resources)
- [MCP Prompts](https://modelcontextprotocol.io/docs/concepts/prompts)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Normes ISO

- [ISO/IEC 25010:2023](https://iso25000.com/en/iso-25000-standards/iso-25010) - Qualite produit
- [ISO/IEC 29119:2022](https://www.iso.org/standard/81291.html) - Tests logiciels
- [ISO/IEC 5055:2021](https://www.it-cisq.org/standards/code-quality-standards/) - Qualite code CISQ
- [ISO/IEC 12207:2017](https://www.iso.org/standard/63712.html) - Cycle de vie

### Documentation Godot

- [Godot 4.x Documentation](https://docs.godotengine.org/en/stable/)
- [GDScript Reference](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [EditorScript](https://docs.godotengine.org/en/stable/classes/class_editorscript.html)

---

*Document mis a jour le 8 janvier 2026*
*godot-mcp-unified v0.9.0 → v1.0.0 roadmap*
