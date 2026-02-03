/**
 * Tests for TscnMutations module
 * ISO/IEC 29119 compliant - comprehensive unit tests
 */

import {
  addExtResource,
  removeExtResource,
  attachScriptToNode,
  detachScriptFromNode,
  addNode,
  removeNode,
  addConnection,
  removeConnection,
  addSubResource,
  setNodeProperty,
  removeNodeProperty,
  addNodeToGroup,
  removeNodeFromGroup,
} from './TscnMutations.js';
import type { TscnDocument, TscnNode } from './types.js';

describe('TscnMutations', () => {
  // Helper to create a minimal document
  function createDoc(): TscnDocument {
    return {
      header: { format: 3, uidType: '', uid: '', loadSteps: 1 },
      extResources: [],
      subResources: [],
      nodes: [
        { name: 'Root', type: 'Node2D', properties: {} },
        { name: 'Player', type: 'CharacterBody2D', parent: '.', properties: { health: 100 } },
      ],
      connections: [],
      editableInstances: [],
    };
  }

  describe('addExtResource', () => {
    it('should add external resource with incremented ID', () => {
      const doc = createDoc();
      const id = addExtResource(doc, 'Script', 'res://player.gd');
      expect(doc.extResources).toHaveLength(1);
      expect(doc.extResources[0].type).toBe('Script');
      expect(doc.extResources[0].path).toBe('res://player.gd');
      expect(id).toBe('"1_script"');
    });

    it('should increment ID based on existing resources', () => {
      const doc = createDoc();
      doc.extResources.push({ type: 'Script', path: 'res://test.gd', id: '"1_script"' });
      const id = addExtResource(doc, 'Texture2D', 'res://icon.png');
      expect(id).toBe('"2_texture2d"');
    });

    it('should increment load_steps', () => {
      const doc = createDoc();
      expect(doc.header.loadSteps).toBe(1);
      addExtResource(doc, 'Script', 'res://test.gd');
      expect(doc.header.loadSteps).toBe(2);
    });
  });

  describe('removeExtResource', () => {
    it('should remove existing resource', () => {
      const doc = createDoc();
      doc.extResources.push({ type: 'Script', path: 'res://test.gd', id: '"1_script"' });
      const result = removeExtResource(doc, '"1_script"');
      expect(result).toBe(true);
      expect(doc.extResources).toHaveLength(0);
    });

    it('should return false for non-existent resource', () => {
      const doc = createDoc();
      const result = removeExtResource(doc, '"999_missing"');
      expect(result).toBe(false);
    });

    it('should decrement load_steps', () => {
      const doc = createDoc();
      doc.header.loadSteps = 3;
      doc.extResources.push({ type: 'Script', path: 'res://test.gd', id: '"1_script"' });
      removeExtResource(doc, '"1_script"');
      expect(doc.header.loadSteps).toBe(2);
    });
  });

  describe('attachScriptToNode', () => {
    it('should attach script to existing node', () => {
      const doc = createDoc();
      const result = attachScriptToNode(doc, 'Player', 'player.gd');
      expect(result).toBe(true);
      expect(doc.nodes[1].script).toContain('ExtResource');
      expect(doc.extResources).toHaveLength(1);
      expect(doc.extResources[0].path).toBe('res://player.gd');
    });

    it('should reuse existing script resource', () => {
      const doc = createDoc();
      doc.extResources.push({ type: 'Script', path: 'res://player.gd', id: '"1_script"' });
      const result = attachScriptToNode(doc, 'Player', 'res://player.gd');
      expect(result).toBe(true);
      expect(doc.extResources).toHaveLength(1);
    });

    it('should return false for non-existent node', () => {
      const doc = createDoc();
      const result = attachScriptToNode(doc, 'NonExistent', 'test.gd');
      expect(result).toBe(false);
    });

    it('should handle path without res:// prefix', () => {
      const doc = createDoc();
      attachScriptToNode(doc, 'Player', 'scripts/player.gd');
      expect(doc.extResources[0].path).toBe('res://scripts/player.gd');
    });
  });

  describe('detachScriptFromNode', () => {
    it('should detach script from node', () => {
      const doc = createDoc();
      doc.nodes[1].script = 'ExtResource("1_script")';
      const result = detachScriptFromNode(doc, 'Player');
      expect(result).toBe(true);
      expect(doc.nodes[1].script).toBeUndefined();
    });

    it('should return false for node without script', () => {
      const doc = createDoc();
      const result = detachScriptFromNode(doc, 'Player');
      expect(result).toBe(false);
    });

    it('should return false for non-existent node', () => {
      const doc = createDoc();
      const result = detachScriptFromNode(doc, 'NonExistent');
      expect(result).toBe(false);
    });
  });

  describe('addNode', () => {
    it('should add node to document', () => {
      const doc = createDoc();
      const newNode: TscnNode = {
        name: 'Enemy',
        type: 'CharacterBody2D',
        parent: '.',
        properties: {},
      };
      addNode(doc, newNode);
      expect(doc.nodes).toHaveLength(3);
      expect(doc.nodes[2].name).toBe('Enemy');
    });
  });

  describe('removeNode', () => {
    it('should remove existing node', () => {
      const doc = createDoc();
      const result = removeNode(doc, 'Player');
      expect(result).toBe(true);
      expect(doc.nodes).toHaveLength(1);
      expect(doc.nodes[0].name).toBe('Root');
    });

    it('should return false for non-existent node', () => {
      const doc = createDoc();
      const result = removeNode(doc, 'NonExistent');
      expect(result).toBe(false);
    });

    it('should remove connections involving the node', () => {
      const doc = createDoc();
      // Note: connection paths use "." for root and relative paths for children
      // When Player has parent=".", the nodeRef becomes "./Player"
      doc.connections.push({
        signal: 'ready',
        from: './Player',
        to: '.',
        method: '_on_ready',
      });
      doc.connections.push({
        signal: 'hit',
        from: '.',
        to: './Player',
        method: '_on_hit',
      });
      doc.connections.push({
        signal: 'other',
        from: 'Root',
        to: '.',
        method: '_other',
      });
      removeNode(doc, 'Player');
      expect(doc.connections).toHaveLength(1);
      expect(doc.connections[0].signal).toBe('other');
    });
  });

  describe('addConnection', () => {
    it('should add connection to document', () => {
      const doc = createDoc();
      addConnection(doc, {
        signal: 'pressed',
        from: 'Button',
        to: '.',
        method: '_on_pressed',
      });
      expect(doc.connections).toHaveLength(1);
      expect(doc.connections[0].signal).toBe('pressed');
    });
  });

  describe('removeConnection', () => {
    it('should remove existing connection', () => {
      const doc = createDoc();
      doc.connections.push({
        signal: 'pressed',
        from: 'Button',
        to: '.',
        method: '_on_pressed',
      });
      const result = removeConnection(doc, 'pressed', 'Button', '.', '_on_pressed');
      expect(result).toBe(true);
      expect(doc.connections).toHaveLength(0);
    });

    it('should return false for non-existent connection', () => {
      const doc = createDoc();
      const result = removeConnection(doc, 'pressed', 'Button', '.', '_on_pressed');
      expect(result).toBe(false);
    });
  });

  describe('addSubResource', () => {
    it('should add sub-resource with incremented ID', () => {
      const doc = createDoc();
      const id = addSubResource(doc, {
        type: 'RectangleShape2D',
        id: '',
        properties: { size: { name: 'Vector2', args: [32, 32] } },
      });
      expect(doc.subResources).toHaveLength(1);
      expect(doc.subResources[0].type).toBe('RectangleShape2D');
      expect(id).toBe('"1_rectangleshape2d"');
    });

    it('should increment load_steps', () => {
      const doc = createDoc();
      addSubResource(doc, { type: 'CircleShape2D', id: '', properties: {} });
      expect(doc.header.loadSteps).toBe(2);
    });

    it('should increment ID based on existing sub-resources', () => {
      const doc = createDoc();
      doc.subResources.push({ type: 'RectangleShape2D', id: '"1_shape"', properties: {} });
      doc.subResources.push({ type: 'CircleShape2D', id: '"2_circle"', properties: {} });
      const id = addSubResource(doc, { type: 'CapsuleShape2D', id: '', properties: {} });
      expect(id).toBe('"3_capsuleshape2d"');
    });

    it('should handle sub-resources with non-standard IDs', () => {
      const doc = createDoc();
      doc.subResources.push({ type: 'Shape', id: 'noid', properties: {} });
      const id = addSubResource(doc, { type: 'Shape2D', id: '', properties: {} });
      expect(id).toBe('"1_shape2d"');
    });
  });

  describe('setNodeProperty', () => {
    it('should set property on existing node', () => {
      const doc = createDoc();
      const result = setNodeProperty(doc, 'Player', 'speed', 200);
      expect(result).toBe(true);
      expect(doc.nodes[1].properties.speed).toBe(200);
    });

    it('should overwrite existing property', () => {
      const doc = createDoc();
      const result = setNodeProperty(doc, 'Player', 'health', 50);
      expect(result).toBe(true);
      expect(doc.nodes[1].properties.health).toBe(50);
    });

    it('should return false for non-existent node', () => {
      const doc = createDoc();
      const result = setNodeProperty(doc, 'NonExistent', 'prop', 'value');
      expect(result).toBe(false);
    });
  });

  describe('removeNodeProperty', () => {
    it('should remove existing property', () => {
      const doc = createDoc();
      const result = removeNodeProperty(doc, 'Player', 'health');
      expect(result).toBe(true);
      expect(doc.nodes[1].properties.health).toBeUndefined();
    });

    it('should return false for non-existent property', () => {
      const doc = createDoc();
      const result = removeNodeProperty(doc, 'Player', 'nonexistent');
      expect(result).toBe(false);
    });

    it('should return false for non-existent node', () => {
      const doc = createDoc();
      const result = removeNodeProperty(doc, 'NonExistent', 'health');
      expect(result).toBe(false);
    });
  });

  describe('addNodeToGroup', () => {
    it('should add node to group', () => {
      const doc = createDoc();
      const result = addNodeToGroup(doc, 'Player', 'players');
      expect(result).toBe(true);
      expect(doc.nodes[1].groups).toContain('players');
    });

    it('should create groups array if not exists', () => {
      const doc = createDoc();
      expect(doc.nodes[1].groups).toBeUndefined();
      addNodeToGroup(doc, 'Player', 'players');
      expect(doc.nodes[1].groups).toBeDefined();
    });

    it('should not add duplicate group', () => {
      const doc = createDoc();
      doc.nodes[1].groups = ['players'];
      addNodeToGroup(doc, 'Player', 'players');
      expect(doc.nodes[1].groups).toHaveLength(1);
    });

    it('should return false for non-existent node', () => {
      const doc = createDoc();
      const result = addNodeToGroup(doc, 'NonExistent', 'group');
      expect(result).toBe(false);
    });
  });

  describe('removeNodeFromGroup', () => {
    it('should remove node from group', () => {
      const doc = createDoc();
      doc.nodes[1].groups = ['players', 'allies'];
      const result = removeNodeFromGroup(doc, 'Player', 'players');
      expect(result).toBe(true);
      expect(doc.nodes[1].groups).not.toContain('players');
      expect(doc.nodes[1].groups).toContain('allies');
    });

    it('should delete groups array when empty', () => {
      const doc = createDoc();
      doc.nodes[1].groups = ['players'];
      removeNodeFromGroup(doc, 'Player', 'players');
      expect(doc.nodes[1].groups).toBeUndefined();
    });

    it('should return false for non-existent group', () => {
      const doc = createDoc();
      doc.nodes[1].groups = ['players'];
      const result = removeNodeFromGroup(doc, 'Player', 'nonexistent');
      expect(result).toBe(false);
    });

    it('should return false for node without groups', () => {
      const doc = createDoc();
      const result = removeNodeFromGroup(doc, 'Player', 'players');
      expect(result).toBe(false);
    });

    it('should return false for non-existent node', () => {
      const doc = createDoc();
      const result = removeNodeFromGroup(doc, 'NonExistent', 'group');
      expect(result).toBe(false);
    });
  });
});
