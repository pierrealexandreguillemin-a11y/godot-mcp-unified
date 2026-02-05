# Architecture Plugin Godot MCP

> Architecture de communication entre Claude/BMAD et Godot via plugin éditeur

## Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Claude (ou BMAD agents)                                                │
│   ════════════════════════                                               │
│   L'IA qui fait les requêtes. BMAD = orchestration de prompts Claude.    │
│   Pour le MCP, BMAD et Claude direct sont identiques.                    │
│                                                                          │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ MCP Protocol (stdio)
                                  │ JSON-RPC 2.0
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   godot-mcp-unified (Node.js MCP Server)                                 │
│   ══════════════════════════════════════                                 │
│                                                                          │
│   Responsabilités:                                                       │
│   - Exposer les tools/resources/prompts via MCP                         │
│   - Valider les paramètres (Zod schemas)                                │
│   - Router les commandes vers le plugin Godot                           │
│   - Fallback sur TscnParser si plugin non connecté                      │
│                                                                          │
│   Composants:                                                            │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│   │  ToolRegistry   │  │ ResourceProviders│ │ PromptProviders │         │
│   │   (82 tools)    │  │  (20 resources)  │ │  (20 prompts)   │         │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│            └────────────────────┼────────────────────┘                  │
│                                 │                                        │
│                    ┌────────────┴────────────┐                          │
│                    │    GodotBridge.ts       │                          │
│                    │  (WebSocket client)     │                          │
│                    └────────────┬────────────┘                          │
│                                 │                                        │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
                                  │ WebSocket (ws://localhost:6505)
                                  │ JSON messages
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Plugin Godot (GDScript dans l'éditeur)                                │
│   ══════════════════════════════════════                                 │
│                                                                          │
│   Chemin: addons/godot_mcp/plugin.gd                                    │
│                                                                          │
│   Responsabilités:                                                       │
│   - Écouter sur WebSocket port 6505                                     │
│   - Parser les commandes JSON                                           │
│   - Exécuter via APIs Godot (EditorInterface, EditorFileSystem...)     │
│   - Renvoyer résultats + erreurs                                        │
│   - Émettre événements temps réel (scene changed, node added...)       │
│                                                                          │
│   APIs utilisées:                                                        │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│   │EditorInterface  │  │EditorFileSystem │  │ EditorPlugin    │         │
│   │ - get_editor_*  │  │ - scan()        │  │ - add_control() │         │
│   │ - open_scene()  │  │ - get_file_*()  │  │ - _enter_tree() │         │
│   │ - save_scene()  │  │ - update_file() │  │ - _exit_tree()  │         │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Protocole WebSocket

### Format des messages

**Requête (MCP Server → Plugin):**
```json
{
  "id": "uuid-123",
  "action": "create_scene",
  "params": {
    "scene_path": "res://scenes/player.tscn",
    "root_type": "CharacterBody2D",
    "root_name": "Player"
  }
}
```

**Réponse (Plugin → MCP Server):**
```json
{
  "id": "uuid-123",
  "success": true,
  "result": {
    "path": "res://scenes/player.tscn",
    "nodes_created": 1
  }
}
```

**Erreur:**
```json
{
  "id": "uuid-123",
  "success": false,
  "error": {
    "code": "INVALID_NODE_TYPE",
    "message": "Node type 'InvalidType' does not exist"
  }
}
```

**Événement temps réel (Plugin → MCP Server):**
```json
{
  "event": "scene_changed",
  "data": {
    "path": "res://scenes/player.tscn",
    "action": "node_added",
    "node": "CollisionShape2D"
  }
}
```

## Actions supportées

| Action | Description | Params |
|--------|-------------|--------|
| `create_scene` | Créer nouvelle scène | scene_path, root_type, root_name |
| `open_scene` | Ouvrir scène existante | scene_path |
| `save_scene` | Sauvegarder scène | scene_path (optionnel) |
| `add_node` | Ajouter noeud | scene_path, parent, type, name, properties |
| `edit_node` | Modifier noeud | scene_path, node_path, properties |
| `remove_node` | Supprimer noeud | scene_path, node_path |
| `get_scene_tree` | Récupérer arbre | scene_path |
| `run_project` | Lancer le jeu | scene (optionnel) |
| `stop_project` | Arrêter le jeu | - |
| `get_editor_state` | État éditeur | - |

## Fallback sans plugin

Si le plugin n'est pas connecté, godot-mcp utilise :

1. **TscnParser** - Manipulation directe des fichiers .tscn
2. **GDScript --headless** - Pour opérations nécessitant Godot

```
Plugin connecté?
     │
     ├─ OUI → WebSocket → Plugin → Éditeur Godot
     │
     └─ NON → TscnParser (fichiers) ou --headless (validation)
```

## Structure du plugin

```
addons/godot_mcp/
├── plugin.cfg                    # Métadonnées plugin
├── plugin.gd                     # Point d'entrée EditorPlugin (@tool)
├── mcp_websocket_server.gd       # WebSocket server (TCPServer + WebSocketPeer)
├── mcp_command_handler.gd        # Dispatch des commandes
├── commands/
│   ├── base_command.gd           # Classe de base MCPBaseCommand
│   ├── scene_commands.gd         # create_scene, open_scene, save_scene, etc.
│   ├── node_commands.gd          # add_node, edit_node, remove_node, etc.
│   ├── script_commands.gd        # write_script, attach_script, etc.
│   └── project_commands.gd       # run_project, stop_project, get_project_info
└── utils/
    ├── json_utils.gd             # Serialization JSON Godot types
    └── path_utils.gd             # Normalisation chemins res://
```

## Structure TypeScript Bridge

```
src/bridge/
├── BridgeProtocol.ts             # Types du protocole (BridgeRequest, BridgeResponse, etc.)
├── GodotPluginBridge.ts          # Client WebSocket avec CircuitBreaker
├── GodotPluginBridge.test.ts     # Tests unitaires
├── BridgeExecutor.ts             # Helper executeWithBridge() avec fallback
└── index.ts                      # Exports
```

## Configuration

### Port WebSocket

```gdscript
# Dans plugin.gd
const MCP_PORT = 6505
```

### Côté MCP Server

```typescript
// Dans GodotBridge.ts
const PLUGIN_URL = 'ws://localhost:6505';
```

### Variable d'environnement (optionnel)

```bash
export GODOT_MCP_PORT=6505
```

## Sécurité

- WebSocket écoute uniquement sur `localhost` (127.0.0.1)
- Pas d'authentification nécessaire (communication locale)
- Validation des paramètres côté MCP ET côté plugin

## Comparaison avec autres approches

| Approche | Fiabilité | Temps réel | Sans éditeur | Complexité |
|----------|-----------|------------|--------------|------------|
| **Plugin WebSocket** | ✅ Haute | ✅ Oui | ❌ Non | Moyenne |
| TscnParser direct | ✅ Haute | ❌ Non | ✅ Oui | Basse |
| GDScript --headless | ⚠️ Variable | ❌ Non | ✅ Oui | Basse |
| Debug Protocol 6007 | ⚠️ Lecture seule | ✅ Oui | ❌ Non | Haute |

## Implémentation

### Phase 1: Plugin de base ✅
- [x] WebSocket server GDScript (mcp_websocket_server.gd)
- [x] Actions CRUD scènes/noeuds (commands/*.gd)
- [x] Réponses JSON avec success/error

### Phase 2: Intégration MCP ✅
- [x] GodotPluginBridge.ts (WebSocket client avec CircuitBreaker)
- [x] BridgeExecutor.ts (executeWithBridge avec fallback)
- [x] Tests unitaires GodotPluginBridge.test.ts

### Phase 3: Temps réel
- [x] Événements scene_modified (send_event dans plugin)
- [ ] Sync état éditeur (à implémenter si nécessaire)
- [ ] Notifications erreurs (à implémenter si nécessaire)

## Usage

### Installation du plugin Godot

1. Copier le dossier `addons/godot_mcp/` dans votre projet Godot
2. Aller dans Project > Project Settings > Plugins
3. Activer "Godot MCP"
4. Vérifier dans la console: `[MCP] Plugin started on ws://localhost:6505`

### Connexion automatique

Le serveur MCP tente de se connecter au plugin automatiquement au démarrage.
Si le plugin n'est pas disponible, les outils utilisent le fallback GodotExecutor.

```typescript
// Côté MCP Server (automatique)
import { tryInitializeBridge } from './bridge/BridgeExecutor';

// Au démarrage
const connected = await tryInitializeBridge();
// connected: true si plugin actif, false sinon
```

### Utilisation manuelle

```typescript
import { getGodotPluginBridge } from './bridge/GodotPluginBridge';

const bridge = getGodotPluginBridge();
if (await bridge.tryConnect()) {
  // Plugin connecté, utiliser les APIs
  const scene = await bridge.createScene('res://new_scene.tscn', 'Node2D');
  await bridge.addNode('Sprite2D', 'Player', '.');
  await bridge.saveScene();
}
```

---

*Document créé le 4 février 2026*
*Mis à jour le 5 février 2026*
*godot-mcp-unified v0.9.3*
