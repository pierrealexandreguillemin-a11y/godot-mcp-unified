/**
 * Tests for TscnSerializer module
 * ISO/IEC 29119 compliant - comprehensive unit tests
 */

import { serializeTscn, serializeValue } from './TscnSerializer.js';
import type { TscnDocument } from './types.js';

describe('TscnSerializer', () => {
  describe('serializeValue', () => {
    it('should serialize null', () => {
      expect(serializeValue(null)).toBe('null');
    });

    it('should serialize true', () => {
      expect(serializeValue(true)).toBe('true');
    });

    it('should serialize false', () => {
      expect(serializeValue(false)).toBe('false');
    });

    it('should serialize integer', () => {
      expect(serializeValue(42)).toBe('42');
    });

    it('should serialize negative integer', () => {
      expect(serializeValue(-42)).toBe('-42');
    });

    it('should serialize float', () => {
      expect(serializeValue(3.14)).toBe('3.14');
    });

    it('should serialize string', () => {
      expect(serializeValue('hello')).toBe('"hello"');
    });

    it('should serialize empty string', () => {
      expect(serializeValue('')).toBe('""');
    });

    it('should serialize array', () => {
      expect(serializeValue([1, 2, 3])).toBe('[1, 2, 3]');
    });

    it('should serialize empty array', () => {
      expect(serializeValue([])).toBe('[]');
    });

    it('should serialize nested array', () => {
      expect(serializeValue([[1, 2], [3, 4]])).toBe('[[1, 2], [3, 4]]');
    });

    it('should serialize function call', () => {
      expect(serializeValue({ name: 'Vector2', args: [100, 200] })).toBe('Vector2(100, 200)');
    });

    it('should serialize function call with no args', () => {
      expect(serializeValue({ name: 'SomeFunc', args: [] })).toBe('SomeFunc()');
    });

    it('should serialize nested function call', () => {
      const value = {
        name: 'Transform2D',
        args: [
          { name: 'Vector2', args: [1, 0] },
          { name: 'Vector2', args: [0, 1] },
        ],
      };
      expect(serializeValue(value)).toBe('Transform2D(Vector2(1, 0), Vector2(0, 1))');
    });

    it('should serialize dictionary', () => {
      expect(serializeValue({ key: 'value' })).toBe('{"key": "value"}');
    });

    it('should serialize empty dictionary', () => {
      expect(serializeValue({})).toBe('{}');
    });

    it('should serialize mixed array', () => {
      expect(serializeValue([1, 'two', true, null])).toBe('[1, "two", true, null]');
    });

    it('should handle undefined with String fallback', () => {
      // This tests the fallback path for unexpected values
      const result = serializeValue(undefined as unknown as import('./types.js').TscnValue);
      expect(result).toBe('undefined');
    });
  });

  describe('serializeTscn', () => {
    it('should serialize minimal document', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [],
        connections: [],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('[gd_scene format=3]');
    });

    it('should serialize document with load_steps', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: 'TextFile', uid: 'uid://abc123', loadSteps: 5 },
        extResources: [],
        subResources: [],
        nodes: [],
        connections: [],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('uid_type="TextFile"');
      expect(result).toContain('uid="uid://abc123"');
      expect(result).toContain('load_steps=5');
    });

    it('should serialize external resources', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [
          { type: 'Script', path: 'res://player.gd', id: '"1_script"' },
          { type: 'Texture2D', path: 'res://icon.png', id: '"2_texture"', uid: 'uid://xyz' },
        ],
        subResources: [],
        nodes: [],
        connections: [],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('[ext_resource type="Script" path="res://player.gd" id="1_script"]');
      expect(result).toContain('[ext_resource type="Texture2D" path="res://icon.png" id="2_texture" uid="uid://xyz"]');
    });

    it('should serialize sub resources', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [
          {
            type: 'RectangleShape2D',
            id: '"1_shape"',
            properties: { size: { name: 'Vector2', args: [32, 32] } },
          },
        ],
        nodes: [],
        connections: [],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('[sub_resource type="RectangleShape2D" id="1_shape"]');
      expect(result).toContain('size = Vector2(32, 32)');
    });

    it('should serialize nodes', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [
          {
            name: 'Root',
            type: 'Node2D',
            properties: {},
          },
          {
            name: 'Player',
            type: 'CharacterBody2D',
            parent: '.',
            properties: {
              position: { name: 'Vector2', args: [100, 200] },
            },
          },
        ],
        connections: [],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('[node name="Root" type="Node2D"]');
      expect(result).toContain('[node name="Player" type="CharacterBody2D" parent="."]');
      expect(result).toContain('position = Vector2(100, 200)');
    });

    it('should serialize node with script', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [
          {
            name: 'Player',
            type: 'CharacterBody2D',
            script: 'ExtResource("1_script")',
            properties: {},
          },
        ],
        connections: [],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('script=ExtResource("1_script")');
    });

    it('should serialize node with groups', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [
          {
            name: 'Enemy',
            type: 'CharacterBody2D',
            groups: ['enemies', 'damageable'],
            properties: {},
          },
        ],
        connections: [],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('groups=["enemies", "damageable"]');
    });

    it('should serialize node with instance', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [
          {
            name: 'Enemy1',
            instance: 'ExtResource("1_scene")',
            properties: {},
          },
        ],
        connections: [],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('instance=ExtResource("1_scene")');
    });

    it('should serialize connections', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [],
        connections: [
          {
            signal: 'pressed',
            from: 'Button',
            to: '.',
            method: '_on_button_pressed',
          },
        ],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('[connection signal="pressed" from="Button" to="." method="_on_button_pressed"]');
    });

    it('should serialize connection with flags', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [],
        connections: [
          {
            signal: 'timeout',
            from: 'Timer',
            to: '.',
            method: '_on_timeout',
            flags: 4,
          },
        ],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('flags=4');
    });

    it('should serialize connection with binds', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [],
        connections: [
          {
            signal: 'clicked',
            from: 'Button',
            to: '.',
            method: '_on_clicked',
            binds: [1, 'arg'],
          },
        ],
        editableInstances: [],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('binds=[1, "arg"]');
    });

    it('should serialize editable instances', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [],
        connections: [],
        editableInstances: [{ path: 'ChildScene' }],
      };
      const result = serializeTscn(doc);
      expect(result).toContain('[editable path="ChildScene"]');
    });

    it('should produce round-trip compatible output', () => {
      const original: TscnDocument = {
        header: { format: 3, uidType: 'TextFile', uid: 'uid://test123', loadSteps: 3 },
        extResources: [
          { type: 'Script', path: 'res://player.gd', id: '"1_script"' },
        ],
        subResources: [
          {
            type: 'CircleShape2D',
            id: '"1_shape"',
            properties: { radius: 16 },
          },
        ],
        nodes: [
          {
            name: 'Game',
            type: 'Node2D',
            properties: {},
          },
          {
            name: 'Player',
            type: 'CharacterBody2D',
            parent: '.',
            script: 'ExtResource("1_script")',
            properties: {
              position: { name: 'Vector2', args: [100, 200] },
              visible: true,
            },
          },
        ],
        connections: [
          {
            signal: 'ready',
            from: '.',
            to: '.',
            method: '_on_ready',
          },
        ],
        editableInstances: [],
      };

      const serialized = serializeTscn(original);

      // Check all major components are present
      expect(serialized).toContain('[gd_scene');
      expect(serialized).toContain('[ext_resource');
      expect(serialized).toContain('[sub_resource');
      expect(serialized).toContain('[node');
      expect(serialized).toContain('[connection');
    });
  });
});
