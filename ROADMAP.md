# Roadmap godot-mcp-unified

> Analyse des fonctionnalites manquantes et ameliorations possibles

## Etat actuel : 17 outils

### Outils existants

| Categorie | Outil | Description |
|-----------|-------|-------------|
| **System** | `get_godot_version` | Version Godot |
| **Debug** | `get_debug_output` | Sortie console |
| | `stop_project` | Arreter projet |
| **Project** | `launch_editor` | Ouvrir editeur |
| | `run_project` | Lancer projet |
| | `list_projects` | Lister projets |
| | `get_project_info` | Info projet |
| **Scene** | `create_scene` | Creer scene |
| | `add_node` | Ajouter node |
| | `edit_node` | Modifier node |
| | `remove_node` | Supprimer node |
| | `load_sprite` | Charger texture |
| | `save_scene` | Sauvegarder scene |
| | `export_mesh_library` | Export MeshLibrary |
| **UID** | `get_uid` | Obtenir UID |
| | `update_project_uids` | Maj references |

---

## Fonctionnalites MANQUANTES (Priorite Haute)

### 1. Scripts GDScript (CRITIQUE - absent!)

Le serveur ne gere PAS les scripts GDScript directement.

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `list_scripts` | Lister tous les .gd du projet | P0 |
| `read_script` | Lire contenu d'un script | P0 |
| `write_script` | Creer/modifier un script | P0 |
| `delete_script` | Supprimer un script | P1 |
| `attach_script` | Attacher script a un node | P0 |
| `detach_script` | Detacher script d'un node | P1 |
| `get_script_errors` | Erreurs de compilation | P0 |

**Source:** [ee0pdt/Godot-MCP](https://github.com/ee0pdt/Godot-MCP) a ces fonctions

### 2. Screenshots / Capture visuelle

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `take_screenshot` | Capture ecran editeur/jeu | P0 |
| `take_viewport_screenshot` | Capture viewport specifique | P1 |

**Source:** [GDAI MCP](https://github.com/3ddelano/gdai-mcp-plugin-godot) - "Automatically takes screenshots to visually understand the editor"

### 3. Ressources (.tres, .res)

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `list_resources` | Lister ressources projet | P1 |
| `create_resource` | Creer nouvelle ressource | P1 |
| `edit_resource` | Modifier ressource | P1 |
| `delete_resource` | Supprimer ressource | P2 |

### 4. Assets / Import

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `list_assets` | Lister images/sons/modeles | P1 |
| `import_asset` | Importer fichier externe | P1 |
| `reimport_assets` | Forcer reimport | P1 |
| `get_import_settings` | Parametres import | P2 |

### 5. Export / Build

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `list_export_presets` | Lister presets export | P1 |
| `export_project` | Exporter projet | P1 |
| `export_pck` | Exporter PCK seul | P2 |

**Commande Godot:** `godot --headless --export "preset" output_path`

---

## Fonctionnalites MANQUANTES (Priorite Moyenne)

### 6. Scene Tree avance

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `get_scene_tree` | Arbre complet de la scene | P1 |
| `duplicate_node` | Dupliquer node | P1 |
| `reparent_node` | Changer parent | P1 |
| `rename_node` | Renommer node | P1 |
| `get_node_properties` | Toutes proprietes node | P1 |
| `instantiate_scene` | Instancier scene dans scene | P1 |

### 7. Signaux

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `list_signals` | Lister signaux d'un node | P1 |
| `connect_signal` | Connecter signal | P1 |
| `disconnect_signal` | Deconnecter signal | P2 |

### 8. Animations

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `list_animations` | Lister animations | P1 |
| `create_animation` | Creer animation | P2 |
| `add_animation_track` | Ajouter track | P2 |
| `play_animation` | Jouer animation (debug) | P2 |

### 9. Tilemap / Tileset

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `create_tileset` | Creer tileset | P2 |
| `edit_tilemap` | Modifier tilemap | P2 |
| `paint_tiles` | Peindre tuiles | P2 |

### 10. Audio

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `list_audio_buses` | Lister bus audio | P2 |
| `create_audio_bus` | Creer bus | P2 |
| `set_audio_effect` | Ajouter effet | P2 |

---

## Fonctionnalites MANQUANTES (Priorite Basse)

### 11. Shaders

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `create_shader` | Creer shader | P2 |
| `edit_shader` | Modifier shader | P2 |
| `create_shader_material` | Material depuis shader | P2 |

### 12. Physics

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `create_collision_shape` | Creer forme collision | P2 |
| `edit_physics_layer` | Modifier layers physique | P2 |

### 13. Navigation

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `create_navigation_region` | Region navigation | P2 |
| `bake_navigation` | Cuire navmesh | P2 |

### 14. Project Settings

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `get_project_settings` | Lire settings | P1 |
| `set_project_setting` | Modifier setting | P1 |
| `get_input_map` | Lire input map | P1 |
| `add_input_action` | Ajouter action input | P2 |

### 15. Autoload / Singletons

| Outil propose | Description | Priorite |
|---------------|-------------|----------|
| `list_autoloads` | Lister autoloads | P1 |
| `add_autoload` | Ajouter autoload | P2 |
| `remove_autoload` | Supprimer autoload | P2 |

---

## Ameliorations Performance

### 1. Mode Headless

Actuellement le serveur lance Godot avec GUI. Ajouter option `--headless` pour:
- Operations plus rapides
- CI/CD compatible
- Moins de RAM

```typescript
// Option a ajouter
env: {
  HEADLESS_MODE: "true"
}
```

### 2. Cache de projet

Eviter de relire project.godot a chaque operation.

```typescript
// Ajouter cache avec TTL
const projectCache = new Map<string, {data: ProjectInfo, expires: number}>();
```

### 3. Batch Operations

Permettre plusieurs operations en une seule commande:

```typescript
// Nouveau tool
batch_operations({
  operations: [
    { tool: "create_scene", args: {...} },
    { tool: "add_node", args: {...} },
    { tool: "attach_script", args: {...} }
  ]
})
```

### 4. WebSocket Live

Connexion persistante pour:
- Debug output en temps reel
- Notifications changements fichiers
- Etat du projet live

---

## Ameliorations Architecture

### 1. Plugin Godot Companion

Actuellement: MCP execute Godot via CLI (lent)
Propose: Plugin Godot qui ecoute sur port TCP

```
Claude <-> MCP Server <-> TCP <-> Plugin Godot (dans editeur)
```

Avantages:
- Operations instantanees
- Acces complet EditorInterface
- Pas besoin relancer Godot

**Reference:** [GDAI MCP](https://github.com/3ddelano/gdai-mcp-plugin-godot) utilise cette approche

### 2. GDScript LSP Integration

Integrer le Language Server Protocol de Godot pour:
- Autocompletion
- Diagnostics en temps reel
- Go to definition
- Refactoring

### 3. EditorScript Execution

Utiliser `EditorScript._run()` pour operations complexes:

```gdscript
@tool
extends EditorScript

func _run():
    # Operations editeur avancees
    var editor = EditorInterface.get_editor_main_screen()
    # ...
```

**Source:** [Godot Docs - EditorScript](https://docs.godotengine.org/en/stable/classes/class_editorscript.html)

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

### Phase 1 - Scripts (CRITIQUE)
1. `list_scripts`
2. `read_script`
3. `write_script`
4. `attach_script`
5. `get_script_errors`

### Phase 2 - Visual
6. `take_screenshot`
7. `get_scene_tree`

### Phase 3 - Ressources
8. `list_resources`
9. `create_resource`
10. `list_assets`

### Phase 4 - Export
11. `export_project`
12. `list_export_presets`

### Phase 5 - Avance
13. Plugin Godot companion (TCP)
14. Batch operations
15. WebSocket live debug

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

*Document genere le 8 decembre 2024*
