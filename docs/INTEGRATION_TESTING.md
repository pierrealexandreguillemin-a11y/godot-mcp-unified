# Tests d'Intégration avec Godot

> Guide pour tester godot-mcp-unified avec une installation Godot réelle

**Date**: 4 février 2026
**Godot testé**: 4.5.1 stable
**Plateforme**: Windows 11

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Configuration](#configuration)
3. [Approches de modification](#approches-de-modification)
4. [Tests manuels](#tests-manuels)
5. [Tests automatisés](#tests-automatisés)
6. [Problèmes connus](#problèmes-connus)
7. [Comparaison avec autres MCP](#comparaison-avec-autres-mcp)

---

## Prérequis

### Installation Godot

```bash
# Windows - Télécharger depuis godotengine.org
# Exemple: C:\Dev\Godot_v4.5.1-stable_win64.exe\Godot_v4.5.1-stable_win64_console.exe

# Vérifier l'installation
"C:\Dev\Godot_v4.5.1-stable_win64.exe\Godot_v4.5.1-stable_win64_console.exe" --version
# Output: 4.5.1.stable.official.f62fdbde1
```

### Variable d'environnement

```bash
# Windows (PowerShell)
$env:GODOT_PATH = "C:\Dev\Godot_v4.5.1-stable_win64.exe\Godot_v4.5.1-stable_win64_console.exe"

# Windows (CMD)
set GODOT_PATH=C:\Dev\Godot_v4.5.1-stable_win64.exe\Godot_v4.5.1-stable_win64_console.exe

# Linux/macOS
export GODOT_PATH=/usr/bin/godot
```

### Projet de test

```bash
# Créer un projet minimal
mkdir -p test-project
cat > test-project/project.godot << 'EOF'
config_version=5

[application]
config/name="MCP Test Project"
config/features=PackedStringArray("4.5", "Forward Plus")

[rendering]
renderer/rendering_method="forward_plus"
EOF
```

---

## Approches de modification

### 1. TscnParser (Manipulation directe)

**Avantages:**
- Rapide (pas de spawn de process)
- Pas besoin de Godot installé pour les opérations basiques
- Contrôle total sur le format

**Inconvénients:**
- Doit maintenir la compatibilité avec le format .tscn
- Ne peut pas valider les types de noeuds

**Utilisé par:** [bradypp/godot-mcp](https://github.com/bradypp/godot-mcp)

```typescript
import { serializeTscn, addNode, TscnDocument } from './core/tscn';
import { writeFileSync } from 'fs';

// Créer un document
const doc: TscnDocument = {
  header: { format: 3, uidType: "uid", uid: "uid://test123" },
  extResources: [],
  subResources: [],
  nodes: [
    { name: "Player", type: "CharacterBody2D", properties: {} }
  ],
  connections: [],
  editableInstances: []
};

// Ajouter un noeud
addNode(doc, {
  name: "CollisionShape2D",
  type: "CollisionShape2D",
  parent: ".",
  properties: {}
});

// Sauvegarder
writeFileSync("scene.tscn", serializeTscn(doc));
```

### 2. GDScript via --headless --script

**Avantages:**
- Accès aux APIs internes de Godot
- Validation des types de noeuds
- Peut exécuter du code GDScript

**Inconvénients:**
- Plus lent (spawn de process)
- Nécessite Godot installé
- Chemins absolus requis pour le script

**Utilisé par:** godot-mcp-unified (actuel)

```bash
godot --headless \
  --path "./test-project" \
  --script "/absolute/path/to/godot_operations.gd" \
  create_scene '{"scene_path":"scenes/player.tscn","root_node_type":"CharacterBody2D"}'
```

### 3. Plugin Godot (Communication réseau)

**Avantages:**
- Accès complet à l'éditeur
- Temps réel
- Feedback visuel

**Inconvénients:**
- Nécessite l'éditeur ouvert
- Plus complexe à configurer
- Dépendance au plugin

**Utilisé par:** [ee0pdt/Godot-MCP](https://github.com/ee0pdt/Godot-MCP), [Dokujaa/Godot-MCP](https://github.com/Dokujaa/Godot-MCP)

---

## Tests manuels

### Test 1: Détection Godot

```bash
cd godot-mcp-unified
npm run build

node -e "
const { detectGodotPath } = require('./build/core/PathManager.js');
detectGodotPath().then(p => console.log('Godot path:', p));
"
```

**Résultat attendu:** Chemin vers l'exécutable Godot

### Test 2: Créer une scène (TscnParser)

```bash
node -e "
const { serializeTscn, addNode } = require('./build/core/tscn/index.js');
const fs = require('fs');

const doc = {
  header: { format: 3, uidType: 'uid', uid: 'uid://test' },
  extResources: [],
  subResources: [],
  nodes: [{ name: 'Root', type: 'Node2D', properties: {} }],
  connections: [],
  editableInstances: []
};

fs.writeFileSync('test-project/scenes/test.tscn', serializeTscn(doc));
console.log('Scene created');
"
```

**Vérification:**
```bash
cat test-project/scenes/test.tscn
# Doit contenir: [node name="Root" type="Node2D"]
```

### Test 3: Créer une scène (GDScript)

```bash
godot --headless \
  --path "./test-project" \
  --script "$(pwd)/build/scripts/godot_operations.gd" \
  create_scene '{"scene_path":"scenes/player.tscn","root_node_type":"CharacterBody2D"}'
```

**Résultat attendu:** "Scene created successfully"

### Test 4: Ajouter un noeud (GDScript)

```bash
godot --headless \
  --path "./test-project" \
  --script "$(pwd)/build/scripts/godot_operations.gd" \
  add_node '{"scene_path":"scenes/player.tscn","parent_path":".","node_type":"Sprite2D","node_name":"Sprite"}'
```

**Vérification:**
```bash
cat test-project/scenes/player.tscn
# Doit contenir: [node name="Sprite" type="Sprite2D" parent="."]
```

### Test 5: Tool MCP complet

```bash
node -e "
const { toolRegistry } = require('./build/tools/ToolRegistry.js');

async function test() {
  const tool = toolRegistry.get('get_project_info');
  const result = await tool.handler({
    projectPath: 'C:/Dev/godot-mcp-unified/test-project'
  });
  console.log(JSON.stringify(result, null, 2));
}

test();
"
```

**Résultat attendu:** JSON avec nom du projet, version Godot, structure

---

## Tests automatisés

### Script de test d'intégration

```bash
# Exécuter tous les tests d'intégration
npm run test:integration

# Ou manuellement
node tests/integration/godot-integration.test.js
```

### Configuration Jest pour tests d'intégration

```javascript
// jest.integration.config.js
module.exports = {
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testTimeout: 60000, // 60s pour les opérations Godot
  setupFilesAfterEnv: ['./tests/integration/setup.ts'],
};
```

---

## Problèmes connus

### 1. ResourceSaver ne sauvegarde pas toujours

**Symptôme:** Le script dit "success" mais le fichier n'est pas modifié.

**Cause:** Problème de timing ou de flush dans certaines versions de Godot.

**Solution:** Vérifier que le chemin du script est absolu, pas relatif.

### 2. Chemins Windows avec backslashes

**Symptôme:** `C:\path` devient `C:path` (tab au lieu de backslash)

**Solution:** Utiliser des forward slashes `/` ou échapper `\\\\`

### 3. res:// vs chemins absolus

**Symptôme:** "File not found" pour les scènes

**Solution:**
- Pour les tools MCP: utiliser chemins relatifs au projet (`scenes/player.tscn`)
- Pour GDScript direct: le script ajoute automatiquement `res://`

### 4. Memory leaks à la sortie

**Symptôme:** Warnings "RID allocations leaked at exit"

**Cause:** Normal en mode headless, Godot ne nettoie pas tout.

**Impact:** Aucun, les opérations fonctionnent correctement.

---

## Comparaison avec autres MCP

| Fonctionnalité | godot-mcp-unified | bradypp/godot-mcp | ee0pdt/Godot-MCP |
|----------------|-------------------|-------------------|------------------|
| Approche | Hybride (TscnParser + GDScript) | TscnParser seul | Plugin éditeur |
| Nécessite Godot | Pour certaines ops | Non | Oui (éditeur) |
| Validation types | Oui (via Godot) | Non | Oui |
| Temps réel | Non | Non | Oui |
| Nombre d'outils | 82 | ~20 | ~15 |
| Resources MCP | 20 | Non | Non |
| Prompts MCP | 20 | Non | Non |

### Avantages de notre approche hybride

1. **Flexibilité**: TscnParser pour ops rapides, GDScript pour ops complexes
2. **Validation**: Godot valide les types de noeuds
3. **Complétude**: 82 tools vs ~20 pour les autres
4. **Standards MCP**: Resources et Prompts implémentés

---

## Matrice de compatibilité

| Godot Version | Status | Notes |
|---------------|--------|-------|
| 4.5.x | ✅ Testé | Version recommandée |
| 4.4.x | ✅ Supporté | Fonctionnel |
| 4.3.x | ⚠️ Partiel | Certaines APIs manquantes |
| 4.2.x | ⚠️ Partiel | Format .tscn compatible |
| 4.1.x | ❌ Non testé | Potentiels problèmes |
| 3.x | ❌ Non supporté | Format incompatible |

---

## Ressources

- [Godot Command Line Tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
- [TSCN File Format](https://docs.godotengine.org/en/stable/contributing/development/file_formats/tscn.html)
- [bradypp/godot-mcp](https://github.com/bradypp/godot-mcp) - Référence pour manipulation directe
- [ee0pdt/Godot-MCP](https://github.com/ee0pdt/Godot-MCP) - Référence pour plugin éditeur

---

*Document créé le 4 février 2026*
*godot-mcp-unified v0.9.2*
