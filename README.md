# Godot MCP Unified - Architecture IA + Godot

> Documentation pour mon futur moi - Configuration complete pour coder en langage naturel dans Godot

[Read in English](README.en.md)

## Architecture Globale

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
+----------------+  |   (ce serveur)   |  +------------------+
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
     +--------+---------+          +--------+---------+
     |  Godot CLI       |          |  Plugin WebSocket|
     |  (--headless)    |          |  (addons/godot_  |
     |  Fallback mode   |          |   mcp/) Port 6505|
     +------------------+          +------------------+
              |                             |
              +-------------+---------------+
                            |
                            v
                   +--------+---------+
                   |  Godot Engine    |
                   |    4.5.1         |
                   +------------------+
```

### Communication avec Godot

| Mode | Quand | Avantages |
|------|-------|-----------|
| **Plugin WebSocket** | Plugin actif dans l'editeur | Temps reel, acces EditorInterface |
| **CLI Fallback** | Plugin non disponible | Fonctionne sans editeur ouvert |

Le serveur detecte automatiquement si le plugin est connecte et utilise le mode optimal.

## Ce que ce serveur permet de faire

**TOUT faire dans Godot en langage naturel (82 outils + 20 resources + 20 prompts) :**

| Fonctionnalite | Description | Exemple |
|----------------|-------------|---------|
| Scripts CRUD | Creer/lire/modifier/supprimer des scripts GDScript | "Cree un script de mouvement pour le joueur" |
| Scenes | Creer et modifier des scenes .tscn | "Cree une scene Player avec CharacterBody2D" |
| Nodes | Ajouter/modifier/supprimer des nodes | "Ajoute un Sprite2D au Player" |
| Animation | AnimationPlayer, tracks, keyframes | "Cree une animation de marche avec 4 frames" |
| Physics | Collision shapes, rigidbody, layers | "Configure la physique du joueur" |
| TileMap | TileSet, TileMapLayer, placement tuiles | "Cree une tilemap avec les tuiles de terrain" |
| Audio | Bus audio, players, effets | "Ajoute un reverb au bus Master" |
| Shaders | Creer shaders et materials | "Cree un shader de dissolution" |
| Navigation | Regions et navmesh | "Configure la navigation pour l'IA" |
| Particles | GPU particles et materials | "Ajoute des particules de feu" |
| UI | Containers et controls | "Cree un menu principal" |
| Lighting | Lumieres 2D/3D et environment | "Configure l'eclairage du niveau" |
| Assets | Import, liste, reimport | "Importe les textures du dossier assets" |
| Export | Presets, export projet/PCK | "Liste les presets d'export" |
| Batch | Operations en sequence | "Execute ces 5 operations d'affilee" |
| Debug | Stream temps reel WebSocket | "Demarre le stream debug sur port 9999" |
| UID | Gestion des identifiants Godot 4.4+ | "Mets a jour les references UID" |
| 3D | Export MeshLibrary pour GridMap | "Exporte les meshes en MeshLibrary" |

## Installation (deja fait)

### Prerequis installes
- Node.js (pour le serveur MCP)
- Godot 4.5.1 : `C:\Dev\Godot_v4.5.1-stable_win64.exe\Godot_v4.5.1-stable_win64_console.exe`
- uv (gestionnaire Python moderne)
- ollmcp (bridge Ollama <-> MCP)

### Ce serveur
```bash
cd C:\Dev\godot-mcp-unified
npm install
npm run build
```

## Configuration

### Claude Desktop (C:\Users\pierr\AppData\Roaming\Claude\claude_desktop_config.json)

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["C:\\Dev\\godot-mcp-unified\\build\\index.js"],
      "env": {
        "GODOT_PATH": "C:\\Dev\\Godot_v4.5.1-stable_win64.exe\\Godot_v4.5.1-stable_win64_console.exe"
      }
    }
  }
}
```

### VS Code / Claude Code (.vscode/mcp.json dans ton projet Godot)

```json
{
  "servers": {
    "godot": {
      "command": "node",
      "args": ["C:\\Dev\\godot-mcp-unified\\build\\index.js"],
      "env": {
        "GODOT_PATH": "C:\\Dev\\Godot_v4.5.1-stable_win64.exe\\Godot_v4.5.1-stable_win64_console.exe"
      }
    }
  }
}
```

### Ollama (via ollmcp)

```bash
# Lancer le bridge
ollmcp --model qwen2.5-coder:7b C:\Dev\godot-mcp-unified\build\index.js

# Ou via ollama-gateway (port 3010)
```

## Modeles Ollama disponibles

| Modele | Taille | Usage |
|--------|--------|-------|
| `qwen2.5-coder:7b` | 4.7 GB | **Principal pour GDScript** - 88.4% HumanEval |
| `mistral:latest` | 4.4 GB | Narration pour jdvlh-ia-game |
| `gemma2-chess:latest` | 5.4 GB | Expert FFE pour chess-app |
| `qwen2.5-chess:latest` | 4.7 GB | Tool calling pour chess-app |
| `llama3.2-chess:latest` | 2.0 GB | Tool calling leger pour chess-app |
| `deepseek-chess:latest` | 8.9 GB | Architecture pour chess-app |

**Note:** Les modeles `-chess` ne sont PAS pour jouer aux echecs mais des assistants personnalises pour le developpement de chess-app avec system prompts FFE.

## API Reference (82 outils + 20 resources + 20 prompts)

### Statistiques

```
Primitives MCP:
  Tools:     82/82   ████████████████████ 100%
  Resources: 20/20   ████████████████████ 100%
  Prompts:   20/20   ████████████████████ 100%

Qualite:
  Tests:    3081+    ████████████████████ 100% pass
  Coverage:  81%     ████████████████░░░░  81%

Bridge Plugin:
  Avec bridge:  47 outils (utilisent WebSocket si plugin actif)
  Sans bridge:  35 outils (CLI/file I/O uniquement)
```

### Gestion de projet (14 outils)
- `launch_editor` - Ouvrir l'editeur Godot
- `run_project` - Lancer un projet
- `stop_project` - Arreter le projet
- `list_projects` - Lister les projets dans un dossier
- `get_project_info` - Info sur un projet
- `get_godot_version` - Version de Godot
- `get_project_settings` - Lire les settings du projet
- `set_project_setting` - Modifier un setting
- `manage_input_actions` - Gerer les actions input
- `manage_autoloads` - Gerer les autoloads
- `validate_project` - Valider la structure projet
- `convert_project` - Convertir projet Godot 3 vers 4
- `validate_conversion` - Valider une conversion
- `generate_docs` - Generer documentation GDScript

### Gestion des scenes (15 outils)
- `create_scene` - Creer une nouvelle scene
- `add_node` - Ajouter un node
- `edit_node` - Modifier les proprietes d'un node
- `remove_node` - Supprimer un node
- `rename_node` - Renommer un node
- `move_node` - Deplacer un node (reparent)
- `duplicate_node` - Dupliquer un node
- `load_sprite` - Charger une texture
- `save_scene` - Sauvegarder une scene
- `instance_scene` - Instancier une scene
- `list_scenes` - Lister les scenes
- `get_node_tree` - Obtenir l'arbre de scene
- `connect_signal` - Connecter un signal
- `manage_groups` - Gerer les groupes de nodes
- `export_mesh_library` - Exporter en MeshLibrary

### Scripts GDScript (7 outils)
- `list_scripts` - Lister tous les .gd du projet
- `read_script` - Lire le contenu d'un script
- `write_script` - Creer/modifier un script
- `delete_script` - Supprimer un script
- `attach_script` - Attacher script a un node
- `detach_script` - Detacher script d'un node
- `get_script_errors` - Erreurs de compilation

### Animation (7 outils)
- `create_animation_player` - Creer AnimationPlayer
- `add_animation` - Ajouter animation
- `add_animation_track` - Ajouter track (value, position, rotation, etc.)
- `set_keyframe` - Definir keyframe avec transition/easing
- `create_animation_tree` - Creer AnimationTree
- `setup_state_machine` - Configurer state machine
- `blend_animations` - Configurer blend d'animations

### Physics (3 outils)
- `create_collision_shape` - Creer CollisionShape2D/3D
- `setup_rigidbody` - Configurer RigidBody (masse, gravite)
- `configure_physics_layers` - Nommer layers physique 2D/3D

### TileMap (5 outils)
- `create_tileset` - Creer TileSet avec tile size
- `create_tilemap_layer` - Creer TileMapLayer
- `set_tile` - Placer une tuile
- `paint_tiles` - Peindre tuiles en batch
- `import_ldtk_level` - Importer niveau LDtk

### Audio (3 outils)
- `create_audio_bus` - Creer bus audio
- `setup_audio_player` - Configurer AudioStreamPlayer
- `add_audio_effect` - Ajouter effet (reverb, delay, eq)

### Shader (2 outils)
- `create_shader` - Creer fichier .gdshader
- `create_shader_material` - Creer ShaderMaterial

### Navigation (2 outils)
- `create_navigation_region` - Creer NavigationRegion2D/3D
- `bake_navigation_mesh` - Cuire navmesh

### Particles (2 outils)
- `create_gpu_particles` - Creer GPUParticles2D/3D
- `create_particle_material` - Creer ParticleProcessMaterial

### UI (2 outils)
- `create_ui_container` - Creer Container (VBox, HBox, Grid, etc.)
- `create_control` - Creer Control (Button, Label, etc.)

### Lighting (3 outils)
- `create_light` - Creer Light2D/3D (Directional, Omni, Spot)
- `setup_environment` - Configurer Environment (fog, glow, SSAO)
- `setup_lightmapper` - Configurer LightmapGI et baking

### Assets (3 outils)
- `list_assets` - Lister assets (images, audio, modeles)
- `import_asset` - Importer fichier externe
- `reimport_assets` - Forcer reimport

### Export (3 outils)
- `export_project` - Exporter le projet
- `export_pack` - Exporter PCK seul
- `list_export_presets` - Lister presets export

### Batch Operations (1 outil)
- `batch_operations` - Executer plusieurs outils MCP en sequence

### Debug (5 outils)
- `get_debug_output` - Recuperer la sortie console
- `start_debug_stream` - Demarrer serveur WebSocket debug
- `stop_debug_stream` - Arreter serveur WebSocket
- `get_debug_stream_status` - Statut du serveur
- `take_screenshot` - Capturer une screenshot

### UID (Godot 4.4+) (2 outils)
- `get_uid` - Obtenir l'UID d'un fichier
- `update_project_uids` - Mettre a jour les references

### System (2 outils)
- `system_health` - Verification sante du systeme
- `get_godot_version` - Version de Godot

## Exemples d'utilisation

### Creer un personnage joueur
```
"Cree une scene Player.tscn avec un CharacterBody2D comme root,
ajoute un Sprite2D nomme 'Sprite' et un CollisionShape2D nomme 'Collision'"
```

### Debugger un projet
```
"Lance mon projet Godot et montre-moi les erreurs dans la console"
```

### Modifier une scene existante
```
"Dans la scene Player.tscn, change la position du Sprite a (100, 50)
et sa scale a 2x"
```

## Structure des projets Godot

```
C:\Dev\
├── jdvlh-godot-client\     <- Projet principal (pas de remote git configure!)
│   ├── project.godot
│   ├── .vscode\mcp.json    <- Config MCP pour ce projet
│   └── addons\godot_mcp\   <- Plugin MCP copie
│
├── jdvlh-godot\            <- Projet vide (a garder pour tests)
│
└── GodotDynamicDialog\     <- Fork de dynamic-dialog
```

## Origine du code

Ce serveur unifie les fonctionnalites de 3 projets open-source :

| Projet | Fonctionnalites | Repo |
|--------|-----------------|------|
| ee0pdt/Godot-MCP | Scripts CRUD | https://github.com/ee0pdt/Godot-MCP |
| bradypp/godot-mcp | **Base principale** - Scenes, nodes, UID, 3D | https://github.com/bradypp/godot-mcp |
| Coding-Solo/godot-mcp | Launch, run, debug | https://github.com/Coding-Solo/godot-mcp |

**Note:** GDAI MCP existe mais est payant ($19).

## Specs machine

- CPU: Ryzen 5 5600H
- RAM: 16 GB
- GPU: AMD Radeon (integre) - pas de CUDA
- Quantization optimale: Q4_K_M (sweet spot qualite/performance)

## Troubleshooting

### Le serveur ne demarre pas
```bash
cd C:\Dev\godot-mcp-unified
npm run build
```

### Godot non trouve
Verifier que GODOT_PATH pointe vers le bon executable (version console pour voir les logs).

### Claude Desktop ne voit pas les outils
Redemarrer Claude Desktop apres modification de la config.

## Commandes utiles

```bash
# Rebuild le serveur
cd C:\Dev\godot-mcp-unified && npm run build

# Tester avec l'inspecteur MCP
npm run inspector

# Lister les modeles Ollama
ollama list

# Supprimer un modele Ollama
ollama rm nom_modele
```

## TODO

- [ ] Configurer git remote pour jdvlh-godot-client
- [ ] Nettoyer les modeles Ollama redondants (qwen2.5, gemma2, llama3.2, deepseek-coder-v2)
- [ ] Tester l'integration complete avec un nouveau projet

---

*Derniere mise a jour: Fevrier 2026*
*godot-mcp-unified v0.9.3 - 82 outils + 20 resources + 20 prompts*
*Coverage: 81% | Tests: 3081+ | ISO 25010/29119/5055 compliant*
