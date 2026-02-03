/**
 * Tests for TscnQueries module
 * ISO/IEC 29119 compliant - comprehensive unit tests
 */

import {
  findNodeByPath,
  findExtResourceById,
  findNodesByType,
  findNodesByGroup,
  getNodePath,
  hasScript,
  getScriptPath,
} from './TscnQueries.js';
import type { TscnDocument, TscnNode } from './types.js';

describe('TscnQueries', () => {
  // Helper to create a minimal document
  function createDoc(nodes: TscnNode[] = [], extResources: TscnDocument['extResources'] = []): TscnDocument {
    return {
      header: { format: 3, uidType: '', uid: '' },
      extResources,
      subResources: [],
      nodes,
      connections: [],
      editableInstances: [],
    };
  }

  describe('findNodeByPath', () => {
    it('should find root node with "."', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Child', type: 'Sprite2D', parent: '.', properties: {} },
      ]);
      const node = findNodeByPath(doc, '.');
      expect(node?.name).toBe('Root');
    });

    it('should find root node with empty string', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
      ]);
      const node = findNodeByPath(doc, '');
      expect(node?.name).toBe('Root');
    });

    it('should find root node with "root"', () => {
      const doc = createDoc([
        { name: 'Main', type: 'Node2D', properties: {} },
      ]);
      const node = findNodeByPath(doc, 'root');
      expect(node?.name).toBe('Main');
    });

    it('should find child node by name', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Player', type: 'CharacterBody2D', parent: '.', properties: {} },
      ]);
      const node = findNodeByPath(doc, 'Player');
      expect(node?.name).toBe('Player');
    });

    it('should find nested node by path', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Level', type: 'Node2D', parent: '.', properties: {} },
        { name: 'Player', type: 'CharacterBody2D', parent: 'Level', properties: {} },
      ]);
      const node = findNodeByPath(doc, 'Level/Player');
      expect(node?.name).toBe('Player');
    });

    it('should return undefined for non-existent node', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
      ]);
      const node = findNodeByPath(doc, 'NonExistent');
      expect(node).toBeUndefined();
    });

    it('should strip "root/" prefix', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Player', type: 'CharacterBody2D', parent: '.', properties: {} },
      ]);
      const node = findNodeByPath(doc, 'root/Player');
      expect(node?.name).toBe('Player');
    });
  });

  describe('findExtResourceById', () => {
    it('should find resource by simple ID', () => {
      const doc = createDoc([], [
        { type: 'Script', path: 'res://player.gd', id: '"1_script"' },
      ]);
      const res = findExtResourceById(doc, '"1_script"');
      expect(res?.type).toBe('Script');
    });

    it('should find resource by ID without quotes', () => {
      const doc = createDoc([], [
        { type: 'Script', path: 'res://player.gd', id: '1_script' },
      ]);
      const res = findExtResourceById(doc, '1_script');
      expect(res?.type).toBe('Script');
    });

    it('should handle ExtResource wrapper', () => {
      const doc = createDoc([], [
        { type: 'Script', path: 'res://player.gd', id: '1_script' },
      ]);
      const res = findExtResourceById(doc, 'ExtResource("1_script")');
      expect(res?.type).toBe('Script');
    });

    it('should return undefined for non-existent ID', () => {
      const doc = createDoc([], [
        { type: 'Script', path: 'res://player.gd', id: '1_script' },
      ]);
      const res = findExtResourceById(doc, '999_unknown');
      expect(res).toBeUndefined();
    });
  });

  describe('findNodesByType', () => {
    it('should find all nodes of given type', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Player', type: 'CharacterBody2D', parent: '.', properties: {} },
        { name: 'Enemy1', type: 'CharacterBody2D', parent: '.', properties: {} },
        { name: 'Enemy2', type: 'CharacterBody2D', parent: '.', properties: {} },
        { name: 'Background', type: 'Sprite2D', parent: '.', properties: {} },
      ]);
      const nodes = findNodesByType(doc, 'CharacterBody2D');
      expect(nodes).toHaveLength(3);
      expect(nodes.map(n => n.name)).toEqual(['Player', 'Enemy1', 'Enemy2']);
    });

    it('should return empty array for non-existent type', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
      ]);
      const nodes = findNodesByType(doc, 'CharacterBody3D');
      expect(nodes).toHaveLength(0);
    });
  });

  describe('findNodesByGroup', () => {
    it('should find all nodes in given group', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Enemy1', type: 'Node2D', parent: '.', groups: ['enemies'], properties: {} },
        { name: 'Enemy2', type: 'Node2D', parent: '.', groups: ['enemies', 'bosses'], properties: {} },
        { name: 'Player', type: 'Node2D', parent: '.', properties: {} },
      ]);
      const nodes = findNodesByGroup(doc, 'enemies');
      expect(nodes).toHaveLength(2);
      expect(nodes.map(n => n.name)).toEqual(['Enemy1', 'Enemy2']);
    });

    it('should return empty array for non-existent group', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
      ]);
      const nodes = findNodesByGroup(doc, 'nonexistent');
      expect(nodes).toHaveLength(0);
    });

    it('should handle nodes without groups', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Child', type: 'Node2D', parent: '.', properties: {} },
      ]);
      const nodes = findNodesByGroup(doc, 'any');
      expect(nodes).toHaveLength(0);
    });
  });

  describe('getNodePath', () => {
    it('should return name for root node', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
      ]);
      const path = getNodePath(doc, doc.nodes[0]);
      expect(path).toBe('Root');
    });

    it('should return name for direct child of root', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Player', type: 'Node2D', parent: '.', properties: {} },
      ]);
      const path = getNodePath(doc, doc.nodes[1]);
      expect(path).toBe('Player');
    });

    it('should return full path for nested node', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Level', type: 'Node2D', parent: '.', properties: {} },
        { name: 'Player', type: 'Node2D', parent: 'Level', properties: {} },
      ]);
      const path = getNodePath(doc, doc.nodes[2]);
      expect(path).toBe('Level/Player');
    });

    it('should handle missing parent node gracefully', () => {
      const doc = createDoc([
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Orphan', type: 'Node2D', parent: 'MissingParent', properties: {} },
      ]);
      const path = getNodePath(doc, doc.nodes[1]);
      expect(path).toBe('MissingParent/Orphan');
    });
  });

  describe('hasScript', () => {
    it('should return true for node with script', () => {
      const node: TscnNode = {
        name: 'Player',
        type: 'CharacterBody2D',
        script: 'ExtResource("1_script")',
        properties: {},
      };
      expect(hasScript(node)).toBe(true);
    });

    it('should return false for node without script', () => {
      const node: TscnNode = {
        name: 'Player',
        type: 'CharacterBody2D',
        properties: {},
      };
      expect(hasScript(node)).toBe(false);
    });

    it('should return false for undefined script', () => {
      const node: TscnNode = {
        name: 'Player',
        type: 'CharacterBody2D',
        script: undefined,
        properties: {},
      };
      expect(hasScript(node)).toBe(false);
    });
  });

  describe('getScriptPath', () => {
    it('should return script path', () => {
      const doc = createDoc(
        [
          {
            name: 'Player',
            type: 'CharacterBody2D',
            script: 'ExtResource("1_script")',
            properties: {},
          },
        ],
        [{ type: 'Script', path: 'res://player.gd', id: '1_script' }]
      );
      const path = getScriptPath(doc, doc.nodes[0]);
      expect(path).toBe('res://player.gd');
    });

    it('should return undefined for node without script', () => {
      const doc = createDoc([
        { name: 'Player', type: 'CharacterBody2D', properties: {} },
      ]);
      const path = getScriptPath(doc, doc.nodes[0]);
      expect(path).toBeUndefined();
    });

    it('should return undefined for invalid script reference', () => {
      const doc = createDoc([
        {
          name: 'Player',
          type: 'CharacterBody2D',
          script: 'InvalidReference',
          properties: {},
        },
      ]);
      const path = getScriptPath(doc, doc.nodes[0]);
      expect(path).toBeUndefined();
    });

    it('should return undefined if resource not found', () => {
      const doc = createDoc([
        {
          name: 'Player',
          type: 'CharacterBody2D',
          script: 'ExtResource("999_missing")',
          properties: {},
        },
      ]);
      const path = getScriptPath(doc, doc.nodes[0]);
      expect(path).toBeUndefined();
    });
  });
});
