# FEATURES - godot-mcp-unified

> Comparatif exhaustif et liste complete des fonctionnalites

**Version**: 0.9.0 | **Outils actuels**: 79 | **Cible**: 150+

---

## Table des matieres

1. [Vue d'ensemble](#vue-densemble)
2. [Comparatif avec MCP existants](#comparatif-avec-mcp-existants)
3. [Liste complete des outils](#liste-complete-des-outils)
4. [Conformite aux normes](#conformite-aux-normes)
5. [Architecture MCP](#architecture-mcp)
6. [Roadmap vers 150 outils](#roadmap-vers-150-outils)

---

## Vue d'ensemble

### Positionnement

```
godot-mcp-unified = GDAI MCP + ee0pdt + bradypp + Coding-Solo + EXCLUSIVITES

Le MCP Godot le plus complet, open-source, conforme aux normes ISO.
```

### Points forts uniques

| Avantage | Description |
|----------|-------------|
| **79 outils** | Plus que tout autre MCP Godot open-source |
| **AnimationTree** | Seul MCP avec state machines animation |
| **TileMap complet** | TileSet + TileMapLayer + painting batch |
| **WebSocket Debug** | Stream temps reel unique |
| **Batch Operations** | Operations en sequence atomique |
| **Normes ISO** | Conforme 25010, 29119, 5055, 12207 |

---

## Comparatif avec MCP existants

### Tableau comparatif complet

| Fonctionnalite | godot-mcp-unified | [GDAI MCP](https://github.com/3ddelano/gdai-mcp-plugin-godot) | [ee0pdt](https://github.com/ee0pdt/Godot-MCP) | [bradypp](https://github.com/bradypp/godot-mcp) | [Coding-Solo](https://github.com/Coding-Solo/godot-mcp) |
|----------------|:-----------------:|:--------:|:------:|:-------:|:-----------:|
| **Licence** | MIT | MIT | MIT | MIT | MIT |
| **Prix** | Gratuit | Gratuit | Gratuit | Gratuit | Gratuit |
| **Outils totaux** | **79** | ~40 | ~25 | ~20 | ~15 |
| **Godot 4.x** | 4.1+ | 4.1+ | 4.x | 4.x | 4.x |
| **TypeScript** | Oui | Oui | Oui | Oui | Oui |
| **Tests** | Oui | Partiel | Non | Non | Non |

### Fonctionnalites par categorie

#### Gestion Projet

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| launch_editor | Yes | Yes | Yes | Yes | Yes |
| run_project | Yes | Yes | Yes | Yes | Yes |
| stop_project | Yes | Yes | Yes | Yes | Yes |
| get_debug_output | Yes | Yes | Yes | Yes | Yes |
| list_projects | Yes | No | No | No | No |
| get_project_info | Yes | Yes | No | No | No |
| get_godot_version | Yes | No | No | No | No |
| get_project_settings | Yes | Yes | Yes | No | No |
| set_project_setting | Yes | Yes | Yes | No | No |
| manage_input_actions | Yes | No | No | No | No |
| validate_project | Yes | No | No | No | No |
| manage_autoloads | Yes | No | No | No | No |

#### Scripts GDScript

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| list_scripts | Yes | Yes | Yes | No | No |
| read_script | Yes | Yes | Yes | No | No |
| write_script | Yes | Yes | Yes | No | No |
| attach_script | Yes | Yes | Yes | No | No |
| detach_script | Yes | Yes | No | No | No |
| get_script_errors | Yes | Yes | Yes | No | No |

#### Scenes & Nodes

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| create_scene | Yes | Yes | Yes | Yes | No |
| add_node | Yes | Yes | Yes | Yes | No |
| edit_node | Yes | Yes | Yes | Yes | No |
| remove_node | Yes | Yes | Yes | Yes | No |
| rename_node | Yes | Yes | No | No | No |
| move_node | Yes | Yes | No | No | No |
| duplicate_node | Yes | Yes | No | No | No |
| get_scene_tree | Yes | Yes | Yes | Yes | No |
| load_sprite | Yes | No | No | Yes | No |
| save_scene | Yes | Yes | Yes | Yes | No |
| instance_scene | Yes | Yes | No | No | No |
| list_scenes | Yes | Yes | Yes | No | No |

#### Animation

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| create_animation_player | Yes | Yes | No | No | No |
| add_animation | Yes | Yes | No | No | No |
| add_animation_track | Yes | No | No | No | No |
| set_keyframe | Yes | No | No | No | No |
| **create_animation_tree** | **Yes** | No | No | No | No |
| **setup_state_machine** | **Yes** | No | No | No | No |
| **blend_animations** | **Yes** | No | No | No | No |

#### Physics

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| create_collision_shape | Yes | Yes | No | No | No |
| setup_rigidbody | Yes | No | No | No | No |
| configure_physics_layers | Yes | No | No | No | No |

#### TileMap

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| **create_tileset** | **Yes** | No | No | No | No |
| **create_tilemap_layer** | **Yes** | No | No | No | No |
| **set_tile** | **Yes** | No | No | No | No |
| **paint_tiles** | **Yes** | No | No | No | No |

#### Audio

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| **create_audio_bus** | **Yes** | No | No | No | No |
| **setup_audio_player** | **Yes** | No | No | No | No |
| **add_audio_effect** | **Yes** | No | No | No | No |

#### Shaders

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| **create_shader** | **Yes** | No | No | No | No |
| **create_shader_material** | **Yes** | No | No | No | No |

#### Navigation

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| **create_navigation_region** | **Yes** | No | No | No | No |
| **bake_navigation_mesh** | **Yes** | No | No | No | No |

#### Particles

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| **create_gpu_particles** | **Yes** | No | No | No | No |
| **create_particle_material** | **Yes** | No | No | No | No |

#### UI

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| **create_ui_container** | **Yes** | No | No | No | No |
| **create_control** | **Yes** | No | No | No | No |

#### Lighting

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| **create_light** | **Yes** | No | No | No | No |
| **setup_environment** | **Yes** | No | No | No | No |

#### Assets & Resources

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| list_assets | Yes | Yes | No | No | No |
| import_asset | Yes | Yes | No | No | No |
| reimport_assets | Yes | No | No | No | No |
| list_resources | Yes | Yes | Yes | No | No |
| create_resource | Yes | Yes | No | No | No |
| read_resource | Yes | Yes | No | No | No |
| modify_resource | Yes | No | No | No | No |

#### Export

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| export_project | Yes | Yes | No | No | No |
| export_pack | Yes | No | No | No | No |
| list_export_presets | Yes | No | No | No | No |

#### Signals & Groups

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| connect_signal | Yes | Yes | Yes | No | No |
| disconnect_signal | Yes | No | No | No | No |
| list_signals | Yes | No | No | No | No |
| add_to_group | Yes | Yes | No | No | No |
| remove_from_group | Yes | No | No | No | No |
| list_groups | Yes | No | No | No | No |

#### Operations Avancees

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| **batch_operations** | **Yes** | No | No | No | No |
| **start_debug_stream** | **Yes** | No | No | No | No |
| **stop_debug_stream** | **Yes** | No | No | No | No |
| **get_debug_stream_status** | **Yes** | No | No | No | No |
| get_uid | Yes | No | No | Yes | No |
| update_project_uids | Yes | No | No | Yes | No |
| export_mesh_library | Yes | No | No | No | No |

#### Screenshots (MANQUANT)

| Outil | Nous | GDAI | ee0pdt | bradypp | Solo |
|-------|:----:|:----:|:------:|:-------:|:----:|
| take_screenshot | No | **Yes** | No | No | No |
| take_viewport_screenshot | No | **Yes** | No | No | No |

### Resume comparatif

```
FONCTIONNALITES EXCLUSIVES godot-mcp-unified:
+------------------------------------------+
| AnimationTree & State Machines           |
| TileMap complet (4 outils)               |
| Audio Bus & Effects (3 outils)           |
| Shaders (2 outils)                       |
| Navigation (2 outils)                    |
| Particles (2 outils)                     |
| UI Containers (2 outils)                 |
| Lighting (2 outils)                      |
| Batch Operations                         |
| WebSocket Debug Stream                   |
+------------------------------------------+

FONCTIONNALITES MANQUANTES (vs GDAI MCP):
+------------------------------------------+
| Screenshots editeur/jeu                  |
+------------------------------------------+
```

---

## Liste complete des outils

### Outils implementes (79)

#### 1. Project (12 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 1 | `launch_editor` | Ouvrir l'editeur Godot | `LaunchEditorTool.ts` |
| 2 | `run_project` | Lancer un projet | `RunProjectTool.ts` |
| 3 | `stop_project` | Arreter le projet | `StopProjectTool.ts` |
| 4 | `get_debug_output` | Recuperer la sortie console | `GetDebugOutputTool.ts` |
| 5 | `list_projects` | Lister les projets | `ListProjectsTool.ts` |
| 6 | `get_project_info` | Info sur un projet | `GetProjectInfoTool.ts` |
| 7 | `get_godot_version` | Version de Godot | `GetGodotVersionTool.ts` |
| 8 | `get_project_settings` | Lire les settings | `GetProjectSettingsTool.ts` |
| 9 | `set_project_setting` | Modifier un setting | `SetProjectSettingTool.ts` |
| 10 | `manage_input_actions` | Gerer les input actions | `ManageInputActionsTool.ts` |
| 11 | `validate_project` | Valider la structure | `ValidateProjectTool.ts` |
| 12 | `manage_autoloads` | Gerer autoloads | `ManageAutoloadsTool.ts` |

#### 2. Scene (13 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 13 | `create_scene` | Creer une scene | `CreateSceneTool.ts` |
| 14 | `add_node` | Ajouter un node | `AddNodeTool.ts` |
| 15 | `edit_node` | Modifier proprietes | `EditNodeTool.ts` |
| 16 | `remove_node` | Supprimer un node | `RemoveNodeTool.ts` |
| 17 | `rename_node` | Renommer un node | `RenameNodeTool.ts` |
| 18 | `move_node` | Deplacer (reparent) | `MoveNodeTool.ts` |
| 19 | `duplicate_node` | Dupliquer un node | `DuplicateNodeTool.ts` |
| 20 | `get_scene_tree` | Obtenir l'arbre | `GetNodeTreeTool.ts` |
| 21 | `load_sprite` | Charger texture | `LoadSpriteTool.ts` |
| 22 | `save_scene` | Sauvegarder scene | `SaveSceneTool.ts` |
| 23 | `instance_scene` | Instancier scene | `InstanceSceneTool.ts` |
| 24 | `list_scenes` | Lister scenes | `ListScenesTool.ts` |
| 25 | `export_mesh_library` | Exporter MeshLibrary | `ExportMeshLibraryTool.ts` |

#### 3. Script (6 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 26 | `list_scripts` | Lister scripts .gd | `ListScriptsTool.ts` |
| 27 | `read_script` | Lire contenu | `ReadScriptTool.ts` |
| 28 | `write_script` | Creer/modifier | `WriteScriptTool.ts` |
| 29 | `delete_script` | Supprimer script | `DeleteScriptTool.ts` |
| 30 | `attach_script` | Attacher a node | `AttachScriptTool.ts` |
| 31 | `detach_script` | Detacher de node | `DetachScriptTool.ts` |

#### 4. Animation (7 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 32 | `create_animation_player` | Creer AnimationPlayer | `CreateAnimationPlayerTool.ts` |
| 33 | `add_animation` | Ajouter animation | `AddAnimationTool.ts` |
| 34 | `add_animation_track` | Ajouter track | `AddAnimationTrackTool.ts` |
| 35 | `set_keyframe` | Definir keyframe | `SetKeyframeTool.ts` |
| 36 | `create_animation_tree` | Creer AnimationTree | `CreateAnimationTreeTool.ts` |
| 37 | `setup_state_machine` | Configurer state machine | `SetupStateMachineTool.ts` |
| 38 | `blend_animations` | Configurer blend | `BlendAnimationsTool.ts` |

#### 5. Physics (3 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 39 | `create_collision_shape` | Creer CollisionShape | `CreateCollisionShapeTool.ts` |
| 40 | `setup_rigidbody` | Configurer RigidBody | `SetupRigidBodyTool.ts` |
| 41 | `configure_physics_layers` | Nommer layers | `ConfigurePhysicsLayersTool.ts` |

#### 6. TileMap (4 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 42 | `create_tileset` | Creer TileSet | `CreateTileSetTool.ts` |
| 43 | `create_tilemap_layer` | Creer TileMapLayer | `CreateTileMapLayerTool.ts` |
| 44 | `set_tile` | Placer une tuile | `SetTileTool.ts` |
| 45 | `paint_tiles` | Peindre en batch | `PaintTilesTool.ts` |

#### 7. Audio (3 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 46 | `create_audio_bus` | Creer bus audio | `CreateAudioBusTool.ts` |
| 47 | `setup_audio_player` | Configurer player | `SetupAudioPlayerTool.ts` |
| 48 | `add_audio_effect` | Ajouter effet | `AddAudioEffectTool.ts` |

#### 8. Shader (2 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 49 | `create_shader` | Creer .gdshader | `CreateShaderTool.ts` |
| 50 | `create_shader_material` | Creer ShaderMaterial | `CreateShaderMaterialTool.ts` |

#### 9. Navigation (2 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 51 | `create_navigation_region` | Creer region | `CreateNavigationRegionTool.ts` |
| 52 | `bake_navigation_mesh` | Cuire navmesh | `BakeNavigationMeshTool.ts` |

#### 10. Particles (2 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 53 | `create_gpu_particles` | Creer GPUParticles | `CreateGPUParticlesTool.ts` |
| 54 | `create_particle_material` | Creer material | `CreateParticleMaterialTool.ts` |

#### 11. UI (2 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 55 | `create_ui_container` | Creer Container | `CreateUIContainerTool.ts` |
| 56 | `create_control` | Creer Control | `CreateControlTool.ts` |

#### 12. Lighting (2 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 57 | `create_light` | Creer Light2D/3D | `CreateLightTool.ts` |
| 58 | `setup_environment` | Configurer Environment | `SetupEnvironmentTool.ts` |

#### 13. Assets (3 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 59 | `list_assets` | Lister assets | `ListAssetsTool.ts` |
| 60 | `import_asset` | Importer fichier | `ImportAssetTool.ts` |
| 61 | `reimport_assets` | Forcer reimport | `ReimportAssetsTool.ts` |

#### 14. Resource (4 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 62 | `list_resources` | Lister ressources | `ListResourcesTool.ts` |
| 63 | `create_resource` | Creer ressource | `CreateResourceTool.ts` |
| 64 | `read_resource` | Lire ressource | (integre) |
| 65 | `modify_resource` | Modifier ressource | (integre) |

#### 15. Export (3 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 66 | `export_project` | Exporter projet | `ExportProjectTool.ts` |
| 67 | `export_pack` | Exporter PCK | `ExportPackTool.ts` |
| 68 | `list_export_presets` | Lister presets | `ListExportPresetsTool.ts` |

#### 16. Signals (3 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 69 | `connect_signal` | Connecter signal | `ConnectSignalTool.ts` |
| 70 | `disconnect_signal` | Deconnecter | (integre) |
| 71 | `list_signals` | Lister signaux | (integre) |

#### 17. Groups (3 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 72 | `add_to_group` | Ajouter au groupe | `ManageGroupsTool.ts` |
| 73 | `remove_from_group` | Retirer du groupe | `ManageGroupsTool.ts` |
| 74 | `list_groups` | Lister groupes | `ManageGroupsTool.ts` |

#### 18. Debug Stream (3 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 75 | `start_debug_stream` | Demarrer WebSocket | `StartDebugStreamTool.ts` |
| 76 | `stop_debug_stream` | Arreter WebSocket | `StopDebugStreamTool.ts` |
| 77 | `get_debug_stream_status` | Statut serveur | `GetDebugStreamStatusTool.ts` |

#### 19. UID (2 outils)

| # | Outil | Description | Fichier |
|---|-------|-------------|---------|
| 78 | `get_uid` | Obtenir UID | `GetUidTool.ts` |
| 79 | `update_project_uids` | Mettre a jour refs | `UpdateProjectUidsTool.ts` |

---

## Conformite aux normes

### ISO/IEC 25010 - Qualite produit

| Caracteristique | Implementation | Status |
|-----------------|----------------|--------|
| **Fiabilite** | | |
| - Maturite | Tests unitaires (Jest) | Yes |
| - Disponibilite | Gestion erreurs robuste | Yes |
| - Tolerance pannes | Try/catch systematique | Yes |
| - Recuperabilite | Rollback operations | Partiel |
| **Maintenabilite** | | |
| - Modularite | Un fichier = un outil | Yes |
| - Reutilisabilite | BaseToolHandler abstrait | Yes |
| - Analysabilite | Logging structure | Yes |
| - Modifiabilite | Architecture plugin | Yes |
| - Testabilite | Injection dependances | Yes |
| **Securite** | | |
| - Confidentialite | Pas de donnees sensibles | Yes |
| - Integrite | Validation inputs | Yes |
| - Non-repudiation | Logging operations | Yes |
| - Authenticite | N/A (local) | N/A |
| - Responsabilite | Tracabilite actions | Yes |

### ISO/IEC 29119 - Tests logiciels

| Pratique | Implementation | Status |
|----------|----------------|--------|
| **Pyramide de tests** | | |
| - Tests unitaires | Jest + mocks | Yes |
| - Tests integration | Tests outils complets | Yes |
| - Tests E2E | Tests manuels | Partiel |
| **TDD** | | |
| - Test-first | Pour nouveaux outils | Recommande |
| - Red-Green-Refactor | Workflow standard | Recommande |
| **Documentation tests** | | |
| - Cas de test documentes | Dans *.test.ts | Yes |
| - Resultats traces | npm test output | Yes |

### ISO/IEC 5055 - Qualite code

| Mesure | Cible | Implementation |
|--------|-------|----------------|
| **Fiabilite** | | |
| - Gestion null/undefined | Strict TypeScript | Yes |
| - Gestion exceptions | Try/catch | Yes |
| - Fuite ressources | Cleanup explicite | Yes |
| **Securite** | | |
| - Injection | Validation paths | Yes |
| - Buffer overflow | TypeScript safe | N/A |
| - Path traversal | Validation chemins | Yes |
| **Performance** | | |
| - Complexite cyclomatique | < 10 par fonction | Cible |
| - Boucles infinies | Timeouts | Yes |
| **Maintenabilite** | | |
| - Code duplique | DRY via BaseHandler | Yes |
| - Taille fichiers | < 300 lignes | Cible |
| - Couplage | Faible (DI) | Yes |

### ISO/IEC 12207 - Cycle de vie

| Phase | Activites | Status |
|-------|-----------|--------|
| **Developpement** | | |
| - Analyse besoins | ROADMAP.md | Yes |
| - Conception | Architecture MCP | Yes |
| - Implementation | src/tools/ | Yes |
| - Integration | ToolRegistry | Yes |
| - Tests | *.test.ts | Yes |
| **Maintenance** | | |
| - Corrective | Issues GitHub | Yes |
| - Adaptive | Godot 4.x updates | Yes |
| - Perfective | Nouvelles phases | En cours |
| - Preventive | Refactoring | Continu |

---

## Architecture MCP

### Specification MCP 2025-11-25

Reference: [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-11-25)

#### Composants implementes

```
+------------------+     +------------------+     +------------------+
|     Client       |     |     Serveur      |     |     Godot        |
|  (Claude/Cursor) |<--->| godot-mcp-unified|<--->|    Engine        |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
   JSON-RPC 2.0            Tool Handlers           CLI / EditorScript
```

#### Primitives MCP

| Primitive | Usage | Implemente |
|-----------|-------|------------|
| **Tools** | Actions executables | Yes (79) |
| **Resources** | Donnees read-only | Partiel |
| **Prompts** | Templates reusables | Non |

#### Best Practices MCP appliquees

| Pratique | Description | Status |
|----------|-------------|--------|
| Consentement utilisateur | Confirmation avant action | Yes |
| Validation inputs | Schemas Zod | Yes |
| Gestion erreurs | Codes erreur standard | Yes |
| Logging | Tracabilite operations | Yes |
| Timeout | Eviter blocages | Yes |
| Idempotence | Operations repetables | Partiel |

### Structure du code

```
src/
├── core/                    # Noyau MCP
│   ├── GodotBridge.ts       # Communication Godot
│   ├── GodotLSPClient.ts    # Integration LSP
│   ├── LruCache.ts          # Cache LRU
│   └── types.ts             # Types communs
├── tools/                   # Outils MCP (1 fichier = 1 outil)
│   ├── BaseToolHandler.ts   # Classe abstraite
│   ├── ToolRegistry.ts      # Registre outils
│   ├── animation/           # 7 outils
│   ├── asset/               # 3 outils
│   ├── audio/               # 3 outils
│   ├── batch/               # 1 outil
│   ├── capture/             # 1 outil (TODO)
│   ├── debug/               # 5 outils
│   ├── lighting/            # 2 outils
│   ├── navigation/          # 2 outils
│   ├── particles/           # 2 outils
│   ├── physics/             # 3 outils
│   ├── project/             # 12 outils
│   ├── resource/            # 4 outils
│   ├── scene/               # 13 outils
│   ├── script/              # 6 outils
│   ├── shader/              # 2 outils
│   ├── tilemap/             # 4 outils
│   ├── ui/                  # 2 outils
│   └── uid/                 # 2 outils
├── index.ts                 # Point d'entree
└── godot_operations.gd      # EditorScript Godot
```

---

## Roadmap vers 150 outils

### Progression

```
Phase 7 (actuel): 79 outils   ████████████████░░░░░░░░░░░░░░ 53%
Phase 15:        118 outils   ████████████████████████░░░░░░ 79%
Phase 20:        150 outils   ██████████████████████████████ 100%
```

### Phases planifiees

| Phase | Outils | Categorie | Total |
|-------|--------|-----------|-------|
| 8 | +4 | Physics Avancee | 83 |
| 9 | +3 | TileMap Avance | 86 |
| 10 | +5 | UI Avancee | 91 |
| 11 | +5 | **Multiplayer** | 96 |
| 12 | +5 | Shaders Avances | 101 |
| 13 | +6 | 3D Avance | 107 |
| 14 | +4 | **AI & Behavior** | 111 |
| 15 | +7 | Save/Load & Screenshots | 118 |
| 16 | +5 | GDExtension & C# | 123 |
| 17 | +6 | **Dialogue & Localization** | 129 |
| 18 | +8 | **Level Design** | 137 |
| 19 | +8 | **Templates** | 145 |
| 20 | +5 | Analytics & Debug | 150 |

### Fonctionnalites cles a venir

| Fonctionnalite | Phase | Impact |
|----------------|-------|--------|
| **Screenshots** | 15 | Critique (vs GDAI) |
| **Multiplayer** | 11 | Jeux online |
| **Behavior Trees** | 14 | AI ennemis |
| **Dialogue System** | 17 | Narratif |
| **Level Design** | 18 | Workflow complet |
| **Templates** | 19 | Demarrage rapide |

---

## Sources et references

### MCP Concurrents

- [GDAI MCP](https://github.com/3ddelano/gdai-mcp-plugin-godot) - Reference pour screenshots
- [ee0pdt/Godot-MCP](https://github.com/ee0pdt/Godot-MCP) - Scripts et scenes
- [bradypp/godot-mcp](https://github.com/bradypp/godot-mcp) - UID et 3D
- [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp) - Launch et debug

### Specifications

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Normes ISO

- [ISO/IEC 25010](https://iso25000.com/en/iso-25000-standards/iso-25010) - Qualite produit
- [ISO/IEC 29119](https://www.iso.org/standard/81291.html) - Tests logiciels
- [ISO/IEC 5055](https://www.it-cisq.org/standards/code-quality-standards/) - Qualite code
- [ISO/IEC 12207](https://www.iso.org/standard/63712.html) - Cycle de vie

---

*Document genere le 1er janvier 2026*
*godot-mcp-unified v0.9.0*
