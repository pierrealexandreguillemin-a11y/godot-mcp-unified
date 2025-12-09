# Godot MCP Unified - Architecture & Documentation

## Objectif du Programme

**godot-mcp-unified** est un serveur MCP (Model Context Protocol) permettant le **codage en langage naturel dans Godot 4.x** via Claude Code, Ollama, ou tout client MCP compatible.

### Vision

Permettre aux développeurs de :
- Créer et modifier des scènes Godot par commandes naturelles
- Générer du GDScript à partir de descriptions textuelles
- Valider le code en temps réel via le parseur Godot natif
- Manipuler l'arbre de scènes, les signaux, et les ressources

### Cas d'usage

```
Utilisateur: "Crée une scène Player avec un CharacterBody2D,
             un CollisionShape2D et un Sprite2D"

Claude Code → MCP Server → Fichier player.tscn créé
```

---

## Historique de Développement

### Phase 1: Fondations (commits 9b5ce7e - c16fe3a)
- Structure initiale du serveur MCP
- Typage strict ISO/IEC 25010 (0 any, 0 errors)
- Documentation bilingue FR/EN

### Phase 2: Core Infrastructure (commits f1397ea - d422be5)
- `TscnParser`: Parseur state-machine pour fichiers .tscn
- `LruCache`: Cache avec TTL et éviction LRU
- `ProcessPool`: Pool de processus Godot concurrents
- `Logger`: Système de logs structurés

### Phase 3: Tools Implementation (commits fbe2b9a - 3dc72ef)
- **42 tools** implémentés couvrant :
  - Gestion de scènes (create, read, modify, list)
  - Gestion de scripts (attach, detach, list, validate)
  - Manipulation de noeuds (add, remove, rename, move)
  - Signaux et groupes
  - Paramètres projet
  - Export et documentation

### Phase 4: Quality & Testing (commits 7a05d9e - a1ef7e4)
- ESLint 9 avec flat config
- 133 tests d'intégration
- Coverage 44% (tools Godot-dépendants exclus)

### Phase 5: Bridge Bidirectionnel (commits 5f06760 - ed58f40)
- Plugin Godot EditorPlugin (GDScript)
- Client TCP TypeScript
- Client LSP pour diagnostics temps réel
- 205 tests (dont 16 tests d'intégration avec mock server)

---

## Architecture Actuelle

### Stack Technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | 20+ |
| Langage | TypeScript | 5.x |
| Module System | ESM | native |
| MCP SDK | @modelcontextprotocol/sdk | 1.24.3 |
| Tests | Jest | 29.x |
| Linting | ESLint | 9.x |
| Godot | Godot Engine | 4.x |

### Structure des Répertoires

```
godot-mcp-unified/
├── src/
│   ├── index.ts              # Point d'entrée
│   ├── server/
│   │   ├── GodotMCPServer.ts # Serveur MCP principal
│   │   └── types.ts          # Définitions de types
│   ├── core/
│   │   ├── TscnParser.ts     # Parseur TSCN state-machine
│   │   ├── LruCache.ts       # Cache LRU avec TTL
│   │   ├── ProcessPool.ts    # Pool de processus Godot
│   │   └── PathManager.ts    # Détection chemins Godot
│   ├── tools/
│   │   ├── BaseToolHandler.ts
│   │   ├── scene/            # 10 tools scènes
│   │   ├── script/           # 6 tools scripts
│   │   ├── project/          # 12 tools projet
│   │   ├── resource/         # 4 tools ressources
│   │   └── ...
│   ├── bridge/
│   │   ├── GodotBridge.ts    # Client TCP vers plugin
│   │   ├── GodotLSPClient.ts # Client LSP Godot 4
│   │   └── ScriptValidator.ts # API validation unifiée
│   └── utils/
│       ├── Logger.ts
│       ├── ErrorHandler.ts
│       └── FileUtils.ts
├── godot-plugin/
│   └── addons/mcp_bridge/
│       ├── plugin.cfg
│       └── mcp_bridge.gd     # EditorPlugin GDScript
├── jest.config.js
├── tsconfig.json
├── eslint.config.js
└── package.json
```

---

## Diagrammes C4

### Niveau 1: Contexte Système

```
┌─────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                               │
│                    (Développeur Godot)                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Langage naturel
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE                                 │
│                   (ou autre client MCP)                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ MCP Protocol (stdio/SSE)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GODOT-MCP-UNIFIED                              │
│                    (Ce système)                                  │
└───────┬─────────────────────┬─────────────────────┬─────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌───────────────────┐
│  Fichiers     │   │  Godot Editor   │   │   Godot CLI       │
│  Projet       │   │  (Plugin)       │   │   (--check-only)  │
│  .tscn/.gd    │   │  Port 6550      │   │                   │
└───────────────┘   └─────────────────┘   └───────────────────┘
```

### Niveau 2: Conteneurs

```
┌─────────────────────────────────────────────────────────────────┐
│                     godot-mcp-unified                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   MCP        │    │    Tool      │    │    Bridge    │       │
│  │   Server     │───►│   Registry   │───►│    Module    │       │
│  │              │    │   (42 tools) │    │              │       │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         │            ┌──────┴───────┐    ┌──────┴───────┐       │
│         │            │              │    │              │       │
│         ▼            ▼              ▼    ▼              ▼       │
│  ┌──────────────────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │         Core             │  │   LSP       │  │   TCP      │  │
│  │  ┌────────┐ ┌─────────┐  │  │   Client    │  │   Client   │  │
│  │  │ TSCN   │ │ Process │  │  │   :6005     │  │   :6550    │  │
│  │  │ Parser │ │ Pool    │  │  └─────────────┘  └────────────┘  │
│  │  └────────┘ └─────────┘  │                                   │
│  │  ┌────────┐ ┌─────────┐  │                                   │
│  │  │ LRU    │ │ Path    │  │                                   │
│  │  │ Cache  │ │ Manager │  │                                   │
│  │  └────────┘ └─────────┘  │                                   │
│  └──────────────────────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Niveau 3: Composants (Tools)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tool Registry                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scene Tools          Script Tools        Project Tools          │
│  ┌─────────────┐      ┌─────────────┐     ┌─────────────┐       │
│  │create_scene │      │list_scripts │     │get_settings │       │
│  │read_scene   │      │attach_script│     │set_setting  │       │
│  │list_scenes  │      │detach_script│     │run_project  │       │
│  │add_node     │      │get_errors   │◄────│export_project│      │
│  │remove_node  │      │create_script│     │validate     │       │
│  │rename_node  │      │read_script  │     │generate_docs│       │
│  │move_node    │      └─────────────┘     │launch_editor│       │
│  │get_node_tree│                          └─────────────┘       │
│  │connect_signal                                                 │
│  │get_node_info│      Resource Tools      Debug Tools           │
│  └─────────────┘      ┌─────────────┐     ┌─────────────┐       │
│                       │list_resources│    │capture      │       │
│  Node Tools           │read_resource │    │get_logs     │       │
│  ┌─────────────┐      │create_resource    │profile      │       │
│  │add_to_group │      │modify_resource    └─────────────┘       │
│  │remove_group │      └─────────────┘                           │
│  │list_groups  │                                                 │
│  └─────────────┘                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Niveau 4: Code (Validation Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                    GetScriptErrorsTool                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  handleGetScriptErrors(args)                                     │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │ validateScript()│ ◄── ScriptValidator.ts                     │
│  └────────┬────────┘                                            │
│           │                                                      │
│     ┌─────┴─────┐                                               │
│     ▼           ▼                                               │
│  ┌──────┐   ┌──────┐                                            │
│  │ LSP  │   │Bridge│                                            │
│  │:6005 │   │:6550 │                                            │
│  └──┬───┘   └──┬───┘                                            │
│     │          │                                                 │
│     └────┬─────┘                                                │
│          │ Si disponible                                        │
│          ▼                                                       │
│  ┌─────────────────┐                                            │
│  │ return result   │ source: 'lsp' | 'bridge'                   │
│  └─────────────────┘                                            │
│          │                                                       │
│          │ Sinon fallback                                       │
│          ▼                                                       │
│  ┌─────────────────┐                                            │
│  │ CLI --check-only│ source: 'cli'                              │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prochaines Étapes Recommandées

### Priorité Haute (P0)

| Tâche | Effort | Impact |
|-------|--------|--------|
| **Test E2E avec Claude Code** | 2h | Validation réelle du workflow |
| **Extraction vraies erreurs LSP** | 4h | Diagnostics précis |
| **Auto-reconnexion bridge** | 2h | Robustesse connexion |

### Priorité Moyenne (P1)

| Tâche | Effort | Impact |
|-------|--------|--------|
| Configuration port bridge | 1h | Flexibilité déploiement |
| Events push Godot→MCP | 4h | Notifications temps réel |
| Support TLS/SSL | 3h | Sécurité production |
| Cache diagnostics LSP | 2h | Performance |

### Priorité Basse (P2)

| Tâche | Effort | Impact |
|-------|--------|--------|
| UI status dans Godot | 2h | UX développeur |
| Métriques/télémétrie | 3h | Observabilité |
| Support multi-projets | 4h | Workflows avancés |
| Plugin VSCode companion | 8h | Intégration IDE |

### Améliorations Architecture

```
1. Découpler complètement CLI fallback du bridge
   └── Permettre mode "bridge-only" sans Godot CLI

2. Implémenter pattern Observer pour events
   └── Godot push notifications → MCP → Claude

3. Ajouter layer d'abstraction pour backends validation
   └── Interface commune LSP/Bridge/CLI

4. Migrer vers Bun pour performances
   └── ~30% plus rapide que Node.js
```

---

## Métriques Actuelles

```
Tests:           205 passing
Coverage:        44% (tools Godot-dépendants exclus)
TypeScript:      0 errors
ESLint:          0 warnings
any types:       0
Tools:           42 registered
Commits:         35+
```

---

## Liens Utiles

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Godot 4 Documentation](https://docs.godotengine.org/en/stable/)
- [Godot LSP Implementation](https://github.com/godotengine/godot/tree/master/modules/gdscript/language_server)
- [GDAI MCP (référence)](https://github.com/3ddelano/gdai-mcp)

---

*Documentation générée le 2025-12-09*
*godot-mcp-unified v0.2.0*
