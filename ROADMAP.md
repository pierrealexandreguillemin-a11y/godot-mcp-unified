# Roadmap godot-mcp-unified

> Analyse des fonctionnalites manquantes et ameliorations possibles

## Etat actuel : 76 outils (v0.8.0)

### Outils implementes par categorie

| Categorie | Nb | Outils |
|-----------|:--:|--------|
| **Project** | 12 | launch_editor, run_project, stop_project, get_debug_output, list_projects, get_project_info, get_godot_version, get_project_settings, set_project_setting, get_input_map, add_input_action, validate_project |
| **Scene** | 10 | create_scene, add_node, edit_node, remove_node, rename_node, move_node, duplicate_node, load_sprite, save_scene, get_scene_tree |
| **Script** | 6 | list_scripts, read_script, write_script, attach_script, detach_script, get_script_errors |
| **Animation** | 4 | create_animation_player, add_animation, add_animation_track, set_keyframe |
| **Physics** | 3 | create_collision_shape, setup_rigidbody, configure_physics_layers |
| **TileMap** | 4 | create_tileset, create_tilemap_layer, set_tile, paint_tiles |
| **Audio** | 3 | create_audio_bus, setup_audio_player, add_audio_effect |
| **Shader** | 2 | create_shader, create_shader_material |
| **Navigation** | 2 | create_navigation_region, bake_navigation_mesh |
| **Particles** | 2 | create_gpu_particles, create_particle_material |
| **UI** | 2 | create_ui_container, create_control |
| **Lighting** | 2 | create_light, setup_environment |
| **Assets** | 3 | list_assets, import_asset, reimport_assets |
| **Export** | 3 | export_project, export_pack, list_export_presets |
| **Batch** | 1 | batch_operations |
| **Debug Stream** | 3 | start_debug_stream, stop_debug_stream, get_debug_stream_status |
| **UID** | 2 | get_uid, update_project_uids |
| **3D** | 1 | export_mesh_library |
| **Resource** | 4 | list_resources, read_resource, create_resource, modify_resource |
| **Signals** | 3 | list_signals, connect_signal, disconnect_signal |
| **Groups** | 3 | add_to_group, remove_from_group, list_groups |

---

## Fonctionnalites MANQUANTES (Priorite Haute)

### 1. Scripts GDScript ✅ COMPLETÉ (v0.2.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `list_scripts` | Lister tous les .gd du projet | ✅ |
| `read_script` | Lire contenu d'un script | ✅ |
| `write_script` | Creer/modifier un script | ✅ |
| `attach_script` | Attacher script a un node | ✅ |
| `detach_script` | Detacher script d'un node | ✅ |
| `get_script_errors` | Erreurs de compilation | ✅ |

### 2. Screenshots / Capture visuelle

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `take_screenshot` | Capture ecran editeur/jeu | P0 |
| `take_viewport_screenshot` | Capture viewport specifique | P1 |

**Source:** [GDAI MCP](https://github.com/3ddelano/gdai-mcp-plugin-godot) - "Automatically takes screenshots to visually understand the editor"

### 3. Ressources (.tres, .res) ✅ COMPLETÉ

| Outil | Description | Status |
|-------|-------------|--------|
| `list_resources` | Lister ressources projet | ✅ |
| `create_resource` | Creer nouvelle ressource | ✅ |
| `read_resource` | Lire ressource | ✅ |
| `modify_resource` | Modifier ressource | ✅ |

### 4. Assets / Import ✅ COMPLETÉ (v0.6.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `list_assets` | Lister images/sons/modeles | ✅ |
| `import_asset` | Importer fichier externe | ✅ |
| `reimport_assets` | Forcer reimport | ✅ |

### 5. Export / Build ✅ COMPLETÉ (v0.7.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `list_export_presets` | Lister presets export | ✅ |
| `export_project` | Exporter projet | ✅ |
| `export_pack` | Exporter PCK seul | ✅ |

---

## Fonctionnalites COMPLETÉES (Priorite Moyenne)

### 6. Scene Tree avance ✅ COMPLETÉ

| Outil | Description | Status |
|-------|-------------|--------|
| `get_scene_tree` | Arbre complet de la scene | ✅ |
| `duplicate_node` | Dupliquer node | ✅ |
| `move_node` | Changer parent (reparent) | ✅ |
| `rename_node` | Renommer node | ✅ |

### 7. Signaux ✅ COMPLETÉ

| Outil | Description | Status |
|-------|-------------|--------|
| `list_signals` | Lister signaux d'un node | ✅ |
| `connect_signal` | Connecter signal | ✅ |
| `disconnect_signal` | Deconnecter signal | ✅ |

### 8. Animations ✅ IMPLEMENTÉ (v0.4.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `create_animation_player` | Creer AnimationPlayer | ✅ |
| `add_animation` | Ajouter animation | ✅ |
| `add_animation_track` | Ajouter track (value, position, rotation, etc.) | ✅ |
| `set_keyframe` | Définir keyframe avec valeur/transition/easing | ✅ |

### 9. Tilemap / Tileset ✅ IMPLEMENTÉ (v0.4.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `create_tileset` | Creer TileSet avec tile size | ✅ |
| `create_tilemap_layer` | Creer TileMapLayer | ✅ |
| `set_tile` | Placer une tuile | ✅ |
| `paint_tiles` | Peindre tuiles en batch | ✅ |

### 10. Audio ✅ IMPLEMENTÉ (v0.4.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `create_audio_bus` | Creer bus audio | ✅ |
| `setup_audio_player` | Configurer AudioStreamPlayer | ✅ |
| `add_audio_effect` | Ajouter effet (reverb, delay, etc.) | ✅ |

---

## Fonctionnalites MANQUANTES (Priorite Basse)

### 11. Shaders ✅ COMPLETÉ (v0.5.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `create_shader` | Creer shader | ✅ |
| `create_shader_material` | Material depuis shader | ✅ |

### 12. Physics ✅ IMPLEMENTÉ (v0.4.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `create_collision_shape` | Creer CollisionShape2D/3D | ✅ |
| `setup_rigidbody` | Configurer RigidBody (masse, gravité) | ✅ |
| `configure_physics_layers` | Nommer layers physique 2D/3D | ✅ |

### 13. Navigation ✅ COMPLETÉ (v0.5.0)

| Outil | Description | Status |
|-------|-------------|--------|
| `create_navigation_region` | Region navigation | ✅ |
| `bake_navigation_mesh` | Cuire navmesh | ✅ |

### 14. Project Settings ✅ COMPLETÉ

| Outil | Description | Status |
|-------|-------------|--------|
| `get_project_settings` | Lire settings | ✅ |
| `set_project_setting` | Modifier setting | ✅ |
| `get_input_map` | Lire input map | ✅ |
| `add_input_action` | Ajouter action input | ✅ |

### 15. Autoload / Singletons ✅ COMPLETÉ

| Outil | Description | Status |
|-------|-------------|--------|
| `manage_autoloads` | Gérer autoloads | ✅ |

---

## Ameliorations Performance

### 1. Mode Headless (TODO)

Ajouter option `--headless` pour operations CI/CD.

### 2. Cache de projet ✅ COMPLETÉ

LRU Cache avec TTL implémenté (`src/core/LruCache.ts`).

### 3. Batch Operations ✅ COMPLETÉ (v0.8.0)

`batch_operations` permet d'exécuter plusieurs outils en séquence.

### 4. WebSocket Live ✅ COMPLETÉ (v0.8.0)

`start_debug_stream`, `stop_debug_stream`, `get_debug_stream_status`

---

## Ameliorations Architecture

### 1. Plugin Godot Companion ✅ COMPLETÉ (v0.2.0)

GodotBridge TCP client + EditorPlugin (`godot-plugin/addons/mcp_bridge/`).

### 2. GDScript LSP Integration ✅ COMPLETÉ (v0.2.0)

GodotLSPClient pour diagnostics temps réel.

### 3. EditorScript Execution ✅ COMPLETÉ

`godot_operations.gd` exécute les opérations via EditorScript.

---

## Modeles IA Specialises

### Godot-Dodo (Fine-tuned LLM)

Modeles fine-tunes specifiquement pour GDScript:

| Modele | Base | Performance |
|--------|------|-------------|
| godot_dodo_4x_60k_llama_13b | LLaMA 13B | > GPT-4 sur GDScript |

**Source:** [minosvasilias/godot-dodo](https://github.com/minosvasilias/godot-dodo)

### Dataset GDScript

Dataset Hugging Face avec 5k+ repos GitHub:
- [wallstoneai/godot-gdscript-dataset](https://huggingface.co/datasets/wallstoneai/godot-gdscript-dataset)

Potentiel: Fine-tuner qwen2.5-coder sur ce dataset

---

## Plan Implementation Suggere

### Phase 1 - Scripts ✅ COMPLETÉ (v0.2.0)
1. `list_scripts` ✅
2. `read_script` ✅
3. `write_script` ✅
4. `attach_script` ✅
5. `get_script_errors` ✅

### Phase 2 - Game Development ✅ COMPLETÉ (v0.4.0)
6. Animation tools (4 outils) ✅
7. Physics tools (3 outils) ✅
8. TileMap tools (4 outils) ✅
9. Audio tools (3 outils) ✅

### Phase 3 - Visual & Navigation ✅ COMPLETÉ (v0.5.0)
10. Shader tools (2 outils) ✅
    - `create_shader`, `create_shader_material`
11. Navigation tools (2 outils) ✅
    - `create_navigation_region`, `bake_navigation_mesh`
12. Particles tools (2 outils) ✅
    - `create_gpu_particles`, `create_particle_material`
13. UI tools (2 outils) ✅
    - `create_ui_container`, `create_control`
14. Lighting tools (2 outils) ✅
    - `create_light`, `setup_environment`

### Phase 4 - Resources & Assets ✅ COMPLETÉ (v0.6.0)
15. `list_assets` ✅
16. `import_asset` ✅
17. `reimport_assets` ✅

### Phase 5 - Export ✅ COMPLETÉ (v0.7.0)
18. `export_project` - existant ✅
19. `export_pack` - existant ✅
20. `list_export_presets` ✅

### Phase 6 - Advanced Operations ✅ COMPLETÉ (v0.8.0)
21. Plugin Godot companion (TCP) ✅ (GodotBridge)
22. `batch_operations` ✅
23. WebSocket live debug ✅
    - `start_debug_stream`, `stop_debug_stream`, `get_debug_stream_status`

---

## Prochaines Phases (vers 110 outils)

### Phase 7 - Animation Avancée (3 outils) → 79 total
| Outil | Description |
|-------|-------------|
| `create_animation_tree` | Créer AnimationTree |
| `setup_state_machine` | Configurer state machine animation |
| `blend_animations` | Configurer blend spaces |

### Phase 8 - Physics Avancée (4 outils) → 83 total
| Outil | Description |
|-------|-------------|
| `create_area` | Créer Area2D/3D avec détection |
| `setup_raycast` | Configurer RayCast |
| `create_physics_material` | Créer PhysicsMaterial |
| `setup_joints` | Configurer joints (hinge, slider, etc.) |

### Phase 9 - TileMap Avancé (3 outils) → 86 total
| Outil | Description |
|-------|-------------|
| `setup_autotile` | Configurer autotiling/terrain |
| `create_tile_collision` | Ajouter collision aux tuiles |
| `create_tile_navigation` | Ajouter navigation aux tuiles |

### Phase 10 - UI Avancée (5 outils) → 91 total
| Outil | Description |
|-------|-------------|
| `create_ui_theme` | Créer thème UI |
| `setup_control_anchors` | Configurer anchors et margins |
| `setup_focus_navigation` | Configurer navigation focus |
| `create_popup` | Créer popups et dialogs |
| `setup_responsive_ui` | Configurer UI responsive |

### Phase 11 - Multiplayer (5 outils) → 96 total
| Outil | Description |
|-------|-------------|
| `setup_multiplayer_peer` | Configurer ENet/WebSocket/WebRTC |
| `create_network_spawner` | Créer MultiplayerSpawner |
| `setup_synchronizer` | Configurer MultiplayerSynchronizer |
| `define_rpc_functions` | Définir fonctions RPC |
| `create_lobby_system` | Créer système lobby basique |

### Phase 12 - Particles & Shaders Avancés (5 outils) → 101 total
| Outil | Description |
|-------|-------------|
| `create_particle_attractor` | Créer attracteurs |
| `create_particle_collision` | Créer collision particules |
| `create_visual_shader` | Créer visual shader avec nodes |
| `add_shader_parameter` | Ajouter paramètres uniformes |
| `create_shader_preset` | Créer presets (outline, dissolve) |

### Phase 13 - 3D Avancé (6 outils) → 107 total
| Outil | Description |
|-------|-------------|
| `create_mesh_instance` | Créer MeshInstance3D |
| `setup_material` | Configurer StandardMaterial3D |
| `create_csg_shape` | Créer CSG shapes |
| `setup_lightmapper` | Configurer baking lumière |
| `create_world_environment` | Créer WorldEnvironment |
| `setup_post_processing` | Configurer post-processing |

### Phase 14 - AI & Behavior (4 outils) → 111 total
| Outil | Description |
|-------|-------------|
| `create_behavior_tree` | Créer arbre de comportement |
| `setup_finite_state_machine` | Configurer FSM |
| `create_utility_ai` | Créer système utility AI |
| `setup_advanced_pathfinding` | Configurer pathfinding avancé |

### Phase 15 - Save/Load & Docs (7 outils) → 118 total
| Outil | Description |
|-------|-------------|
| `create_save_resource` | Créer resource sauvegarde |
| `serialize_scene` | Sérialiser état scène |
| `deserialize_scene` | Restaurer état scène |
| `get_class_documentation` | Obtenir doc classe Godot |
| `search_documentation` | Rechercher dans docs |
| `get_node_types` | Lister types nodes disponibles |
| `take_screenshot` | Capture écran éditeur/jeu |

---

## Sources

- [Godot Command Line Tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
- [GDAI MCP Plugin](https://github.com/3ddelano/gdai-mcp-plugin-godot)
- [ee0pdt/Godot-MCP](https://github.com/ee0pdt/Godot-MCP)
- [bradypp/godot-mcp](https://github.com/bradypp/godot-mcp)
- [Godot EditorScript](https://docs.godotengine.org/en/stable/classes/class_editorscript.html)
- [Godot-Dodo LLM](https://github.com/minosvasilias/godot-dodo)
- [GDScript Dataset](https://huggingface.co/datasets/wallstoneai/godot-gdscript-dataset)

---

*Document mis à jour le 31 décembre 2024*
*Version actuelle: 0.8.0 - 76 tools*
