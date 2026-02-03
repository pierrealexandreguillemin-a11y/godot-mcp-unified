# Godot MCP - Outils MCP Requis (Tool obligatoire)

**Document Version:** 1.0
**ISO/IEC 25010:2023 - Adequation fonctionnelle / Aptitude**
**Date:** 2026-02-02
**Status:** Approuve

> Objectif: Identifier les fonctionnalites qui necessitent imperativement une implementation
> en tant que MCP Tool (et non remplacables par un MCP Prompt).

---

## 1. Contexte et methodologie

### 1.1 Criteres de classification Tool vs Prompt

Conformement a la specification MCP (ISO/IEC 25010 - Adequation fonctionnelle), un **Tool**
est requis lorsque l'operation necessite :

| Critere | Tool | Prompt |
|---------|:----:|:------:|
| Transformation de format binaire/proprietaire | Oui | Non |
| Invocation d'un processus externe (Godot CLI) | Oui | Non |
| Generation de fichiers binaires non-textuels | Oui | Non |
| Generation de code/configuration textuelle | Non | Oui |
| Orchestration de tools existants | Non | Oui |
| Conseils architecturaux / patterns | Non | Oui |

### 1.2 Resultat de l'audit

Sur l'ensemble des 70+ fonctionnalites planifiees dans le
[MCP_COMPLETE_FEATURES_ROADMAP.md](./MCP_COMPLETE_FEATURES_ROADMAP.md), **seules 2 fonctionnalites**
necessitent imperativement une implementation Tool dediee. Toutes les autres peuvent etre
realisees via des Prompts orchestrant les outils existants (scene, script, resource, etc.).

### 1.3 References normatives

- ISO/IEC 25010:2023 - Qualite des systemes et logiciels
- ISO/IEC 29119-2:2021 - Processus de test
- ISO/IEC 27001:2022 - Securite de l'information
- OWASP Testing Guide v4.2
- MCP Specification - [Tools](https://modelcontextprotocol.io/docs/concepts/tools) / [Prompts](https://modelcontextprotocol.io/docs/concepts/prompts)

---

## 2. Tool 1 : `import_ldtk_level`

### 2.1 Phase

**Phase 18 - Level Design** (Priorite 2 - Important)

### 2.2 Justification technique

LDtk (Level Design Toolkit) sauvegarde les niveaux dans un format JSON proprietaire avec
un schema specifique. La conversion vers les formats Godot `.tscn` / `.tres` necessite :

1. **Parsing du schema JSON LDtk** : layers, entities, tilesets, coordonnees de tuiles
2. **Mapping des coordonnees** : coordonnees/IDs de tuiles LDtk vers coordonnees atlas TileSet Godot
3. **Generation de fichiers .tscn** : scenes avec noeuds TileMapLayer, placeholders d'entites, CollisionShapes
4. **Resolution des references** : tilesets LDtk vers ressources TileSet Godot

> **Pourquoi un Prompt ne suffit pas :**
> Un Prompt peut generer du code GDScript ou des instructions, mais ne peut pas parser un
> fichier `.ldtk` binaire/JSON arbitraire, resoudre les references croisees entre layers,
> ni generer les fichiers `.tscn` valides avec les coordonnees atlas correctes. Cette
> operation requiert une logique de transformation de donnees deterministe.

### 2.3 Schema d'entree (Input)

```typescript
interface ImportLdtkLevelInput {
  /** Chemin absolu du projet Godot */
  projectPath: string;

  /** Chemin vers le fichier .ldtk (absolu ou relatif au projet) */
  ldtkPath: string;

  /** Chemin de sortie pour la scene generee (defaut: base sur le nom du fichier ldtk) */
  outputPath?: string;

  /** Identifiant du niveau specifique a importer (defaut: tous les niveaux) */
  levelIdentifier?: string;

  /** Generer des CollisionShape2D depuis les layers IntGrid (defaut: false) */
  createCollision?: boolean;

  /** Mapping des noms d'entites LDtk vers des chemins de scenes Godot */
  entityMapping?: Record<string, string>;
}
```

### 2.4 Schema de sortie (Output)

```typescript
interface ImportLdtkLevelOutput {
  /** Fichier(s) .tscn genere(s) */
  generatedScenes: string[];

  /** Ressources TileSet generees/mises a jour */
  tileSetResources: string[];

  /** Entites non mappees (avertissements) */
  unmappedEntities: string[];

  /** Statistiques d'import */
  stats: {
    levelsImported: number;
    layersProcessed: number;
    tilesPlaced: number;
    entitiesPlaced: number;
  };
}
```

### 2.5 Complexite estimee

| Critere | Valeur |
|---------|--------|
| Effort | **Eleve** (3-5 jours) |
| Lignes de code estimees | ~800-1200 |
| Risque technique | Moyen - schema LDtk bien documente |
| Complexite cyclomatique | Elevee (mapping multi-couches) |

### 2.6 Dependances sur les outils existants

| Outil existant | Utilisation |
|----------------|-------------|
| `create_tileset` | Creation des ressources TileSet Godot |
| `create_tilemap_layer` | Creation des noeuds TileMapLayer dans la scene |
| `set_tile` / `paint_tiles` | Placement des tuiles individuelles |
| `create_collision_shape` | Generation des formes de collision depuis IntGrid |
| `add_node` | Ajout des noeuds entites / placeholders |
| `create_scene` | Creation de la scene racine |

### 2.7 Algorithme de conversion

```
1. Lire et parser le fichier .ldtk (JSON)
2. Pour chaque tileset reference :
   a. Localiser l'image source
   b. Creer/mettre a jour la ressource TileSet Godot
   c. Construire la table de mapping (LDtk tileID -> atlas coords Godot)
3. Pour chaque niveau (ou le niveau specifie) :
   a. Creer une scene .tscn avec Node2D racine
   b. Pour chaque layer du niveau :
      - IntGrid : generer TileMapLayer + CollisionShapes optionnels
      - Tiles : generer TileMapLayer avec mapping atlas
      - Entities : generer nodes avec proprietes depuis entityMapping
      - AutoLayer : generer TileMapLayer avec regles auto
   c. Appliquer les offsets de position du niveau
4. Ecrire les fichiers .tscn et .tres generes
5. Retourner le rapport d'import
```

### 2.8 References techniques

- LDtk JSON Format : https://ldtk.io/docs/game-dev/json-overview/
- LDtk JSON Schema : https://github.com/deepnight/ldtk/blob/master/docs/JSON_SCHEMA.json
- Importeur Godot existant (reference) : https://github.com/heygleeson/godot-ldtk-importer
- Godot TileMapLayer API : https://docs.godotengine.org/en/stable/classes/class_tilemaplayer.html
- Godot TileSet API : https://docs.godotengine.org/en/stable/classes/class_tileset.html

---

## 3. Tool 2 : `setup_lightmapper`

### 3.1 Phase

**Phase 13 - 3D Avance** (Priorite 3 - Nice to have)

### 3.2 Justification technique

Le baking LightmapGI dans Godot 4 necessite l'editeur Godot en cours d'execution.
Le processus de bake produit des fichiers binaires `.lmbake` qui ne peuvent pas etre
generes de maniere externe. Cette limitation est une contrainte architecturale de Godot.

**Decomposition en deux parties :**

| Partie | Type | Justification |
|--------|------|---------------|
| Configuration du noeud LightmapGI | **Prompt** | Proprietes textuelles (quality, bounces, use_denoiser) configurables via `add_node` + `edit_node` |
| Execution du baking | **Tool** | Invocation de l'editeur Godot en mode headless (`--headless --bake-lightmaps`) |

> **Pourquoi un Prompt ne suffit pas (pour la partie baking) :**
> Le baking de lightmaps genere des donnees binaires (`.lmbake`) via le moteur de rendu
> interne de Godot. Aucune generation textuelle ne peut remplacer ce processus. Le Tool
> doit invoquer `godot --headless --bake-lightmaps` et monitorer la sortie du processus.

### 3.3 Schema d'entree (Input)

```typescript
interface SetupLightmapperInput {
  /** Chemin absolu du projet Godot */
  projectPath: string;

  /** Chemin de la scene contenant le noeud LightmapGI */
  scenePath: string;

  /** Qualite du bake (defaut: 'medium') */
  quality?: 'low' | 'medium' | 'high' | 'ultra';

  /** Nombre de rebonds lumineux (defaut: 3) */
  bounces?: number;

  /** Utiliser le denoiser OIDN (defaut: true) */
  useDenoiser?: boolean;

  /** Creer le noeud LightmapGI s'il n'existe pas (defaut: true) */
  createNode?: boolean;
}
```

### 3.4 Schema de sortie (Output)

```typescript
interface SetupLightmapperOutput {
  /** Noeud LightmapGI cree ou existant */
  lightmapNode: string;

  /** Fichier .lmbake genere */
  lmbakePath: string | null;

  /** Duree du baking en secondes */
  bakeDurationSeconds: number;

  /** Avertissements du processus de bake */
  warnings: string[];

  /** Statistiques du bake */
  stats: {
    meshesProcessed: number;
    lightmapResolution: string;
    textureSize: string;
  };
}
```

### 3.5 Complexite estimee

| Critere | Valeur |
|---------|--------|
| Effort | **Moyen** (2-3 jours) |
| Lignes de code estimees | ~400-600 |
| Risque technique | Eleve - dependance sur Godot headless mode |
| Complexite cyclomatique | Moyenne (orchestration processus) |

### 3.6 Dependances sur les outils existants

| Outil existant | Utilisation |
|----------------|-------------|
| `add_node` | Creation du noeud LightmapGI (si `createNode: true`) |
| `edit_node` | Configuration des proprietes du noeud (quality, bounces, etc.) |
| `run_project` / `launch_editor` | Base pour l'invocation de Godot en mode headless |
| `get_godot_version` | Verification de la compatibilite (Godot 4.0+) |
| `save_scene` | Sauvegarde de la scene apres configuration du noeud |

### 3.7 Processus d'execution

```
1. Valider que le projet Godot existe et est un projet 4.x
2. Si createNode == true :
   a. Verifier si un noeud LightmapGI existe deja dans la scene
   b. Sinon, creer le noeud via add_node avec les proprietes :
      - quality, bounces, use_denoiser, etc.
   c. Sauvegarder la scene
3. Construire la commande Godot headless :
   godot --headless --path <projectPath> --bake-lightmaps <scenePath>
4. Executer le processus via ProcessPool :
   a. Capturer stdout/stderr en temps reel
   b. Parser la progression du bake
   c. Detecter les erreurs et avertissements
5. Verifier la generation du fichier .lmbake
6. Retourner le rapport de bake
```

### 3.8 Contraintes et limitations

| Contrainte | Impact |
|------------|--------|
| Godot editor requis | L'executable Godot doit etre accessible dans le PATH ou configure |
| Mode headless | Requiert Godot 4.0+ compile avec support headless |
| Temps de bake | Peut etre long (minutes a heures selon la scene) - timeout configurable |
| GPU optionnel | Le bake GPU necessite un GPU compatible Vulkan |
| Pas de bake runtime | Limitation documentee : [godot-proposals#8656](https://github.com/godotengine/godot-proposals/issues/8656) |

### 3.9 References techniques

- Godot LightmapGI : https://docs.godotengine.org/en/stable/tutorials/3d/global_illumination/using_lightmap_gi.html
- Godot Mode Headless : https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html
- Proposition bake runtime : https://github.com/godotengine/godot-proposals/issues/8656
- Godot LightmapGI API : https://docs.godotengine.org/en/stable/classes/class_lightmapgi.html

---

## 4. Priorite d'implementation

### 4.1 Matrice de priorisation

| Tool | Phase | Priorite | Effort | Valeur utilisateur | Score |
|------|-------|----------|--------|-------------------|-------|
| `import_ldtk_level` | 18 | **P2** | Eleve | Elevee (level designers) | **8/10** |
| `setup_lightmapper` | 13 | **P3** | Moyen | Moyenne (3D uniquement) | **5/10** |

### 4.2 Ordre d'implementation recommande

1. **`import_ldtk_level`** - Priorite superieure car :
   - Concerne le 2D (majorite des utilisateurs Godot)
   - LDtk est un outil de level design tres repandu dans l'ecosysteme indie
   - Toutes les dependances (tilemap tools) sont deja implementees
   - Valeur immediate pour le workflow de creation de niveaux

2. **`setup_lightmapper`** - Priorite secondaire car :
   - Concerne uniquement le 3D avance
   - Dependance forte sur la configuration systeme (Godot headless)
   - La partie configuration (Prompt) couvre deja 60% du besoin
   - Le baking peut etre fait manuellement dans l'editeur Godot

### 4.3 Pre-requis

| Tool | Pre-requis |
|------|-----------|
| `import_ldtk_level` | TileMap tools (Phase 1.3) - **deja implementes** |
| `setup_lightmapper` | ProcessPool (infrastructure) - **deja implemente**, Godot headless mode disponible |

---

## 5. Tests requis (ISO/IEC 29119-2)

### 5.1 `import_ldtk_level`

| ID Test | Type | Description | Priorite |
|---------|------|-------------|----------|
| LDT-001 | Unitaire | Parser un fichier .ldtk minimal (1 niveau, 1 layer) | Critique |
| LDT-002 | Unitaire | Mapper les coordonnees de tuiles LDtk vers atlas Godot | Critique |
| LDT-003 | Unitaire | Generer un .tscn valide avec TileMapLayer | Critique |
| LDT-004 | Integration | Import complet d'un projet LDtk multi-niveaux | Eleve |
| LDT-005 | Unitaire | Gestion des layers IntGrid avec collision | Eleve |
| LDT-006 | Unitaire | Mapping d'entites vers des scenes Godot | Eleve |
| LDT-007 | Erreur | Fichier .ldtk invalide / corrompu | Critique |
| LDT-008 | Erreur | Tileset image manquante | Eleve |
| LDT-009 | Securite | Path traversal dans ldtkPath (OWASP A01:2021) | Critique |
| LDT-010 | Performance | Import d'un niveau de grande taille (>10000 tuiles) | Moyen |

### 5.2 `setup_lightmapper`

| ID Test | Type | Description | Priorite |
|---------|------|-------------|----------|
| LM-001 | Unitaire | Creation du noeud LightmapGI avec proprietes | Critique |
| LM-002 | Unitaire | Construction de la commande Godot headless | Critique |
| LM-003 | Integration | Bake complet sur une scene 3D minimale | Eleve |
| LM-004 | Unitaire | Parsing de la sortie du processus de bake | Eleve |
| LM-005 | Erreur | Godot non trouve dans le PATH | Critique |
| LM-006 | Erreur | Scene sans meshes bakeables | Eleve |
| LM-007 | Erreur | Timeout du processus de bake | Eleve |
| LM-008 | Securite | Path traversal dans scenePath (OWASP A01:2021) | Critique |
| LM-009 | Securite | Injection de commande dans les parametres (OWASP A03:2021) | Critique |
| LM-010 | Performance | Monitoring memoire pendant le bake | Moyen |

---

## 6. Resume

| Metrique | Valeur |
|----------|--------|
| Tools identifies comme requis | **2** |
| Fonctionnalites couvertes par Prompts | **68+** |
| Effort total estime | 5-8 jours |
| Lignes de code estimees | ~1200-1800 |
| Tests requis | 20 cas de test |
| Dependances non satisfaites | **0** (tous les pre-requis sont implementes) |

### Conclusion

L'architecture Prompt-first adoptee par godot-mcp-unified minimise le nombre de Tools
requis. Sur l'ensemble des fonctionnalites planifiees, seules `import_ldtk_level` et
`setup_lightmapper` (partie baking) necessitent une implementation Tool dediee en raison
de contraintes techniques irreductibles (transformation de format proprietaire et invocation
de processus binaire respectivement).

---

## References

- [MCP_COMPLETE_FEATURES_ROADMAP.md](./MCP_COMPLETE_FEATURES_ROADMAP.md) - Roadmap complet
- [MCP_SPECIFICATION.md](./MCP_SPECIFICATION.md) - Specification MCP implementee
- [TEST_PLAN_ISO_29119.md](./TEST_PLAN_ISO_29119.md) - Plan de test ISO 29119
- [MCP Tools Specification](https://modelcontextprotocol.io/docs/concepts/tools)
- [MCP Prompts Specification](https://modelcontextprotocol.io/docs/concepts/prompts)
- [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html) - Qualite des systemes
- [OWASP Top 10:2021](https://owasp.org/www-project-top-ten/)
