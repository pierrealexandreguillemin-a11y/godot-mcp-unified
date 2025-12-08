/**
 * TSCN Parser Unit Tests
 * ISO/IEC 25010 compliant test coverage
 */

import {
  parseTscn,
  serializeTscn,
  findNodeByPath,
  findExtResourceById,
  addExtResource,
  attachScriptToNode,
  detachScriptFromNode,
  TscnParseError,
  TscnDocument,
} from './TscnParser.js';

describe('TscnParser', () => {
  describe('parseTscn', () => {
    it('should parse a minimal scene with header', () => {
      const content = `[gd_scene format=3]

[node name="Root" type="Node2D"]
`;

      const doc = parseTscn(content);

      expect(doc.header.format).toBe(3);
      expect(doc.nodes).toHaveLength(1);
      expect(doc.nodes[0].name).toBe('Root');
      expect(doc.nodes[0].type).toBe('Node2D');
    });

    it('should parse external resources', () => {
      const content = `[gd_scene format=3 load_steps=2]

[ext_resource type="Script" path="res://player.gd" id="1_abc"]
[ext_resource type="Texture2D" path="res://icon.png" id="2_def"]

[node name="Player" type="CharacterBody2D"]
`;

      const doc = parseTscn(content);

      expect(doc.header.loadSteps).toBe(2);
      expect(doc.extResources).toHaveLength(2);
      expect(doc.extResources[0].type).toBe('Script');
      expect(doc.extResources[0].path).toBe('res://player.gd');
      expect(doc.extResources[1].type).toBe('Texture2D');
    });

    it('should parse node properties', () => {
      const content = `[gd_scene format=3]

[node name="Sprite" type="Sprite2D"]
position = Vector2(100, 200)
scale = Vector2(2, 2)
modulate = Color(1, 0.5, 0, 1)
visible = true
z_index = 5
`;

      const doc = parseTscn(content);
      const sprite = doc.nodes[0];

      expect(sprite.properties.position).toEqual({ name: 'Vector2', args: [100, 200] });
      expect(sprite.properties.scale).toEqual({ name: 'Vector2', args: [2, 2] });
      expect(sprite.properties.modulate).toEqual({ name: 'Color', args: [1, 0.5, 0, 1] });
      expect(sprite.properties.visible).toBe(true);
      expect(sprite.properties.z_index).toBe(5);
    });

    it('should parse node with parent reference', () => {
      const content = `[gd_scene format=3]

[node name="Root" type="Node2D"]

[node name="Child" type="Sprite2D" parent="."]

[node name="GrandChild" type="Node2D" parent="Child"]
`;

      const doc = parseTscn(content);

      expect(doc.nodes).toHaveLength(3);
      expect(doc.nodes[1].parent).toBe('.');
      expect(doc.nodes[2].parent).toBe('Child');
    });

    it('should parse node with script reference', () => {
      const content = `[gd_scene format=3 load_steps=2]

[ext_resource type="Script" path="res://player.gd" id="1_script"]

[node name="Player" type="CharacterBody2D" script=ExtResource("1_script")]
`;

      const doc = parseTscn(content);

      expect(doc.nodes[0].script).toBe('ExtResource("1_script")');
    });

    it('should parse connections', () => {
      const content = `[gd_scene format=3]

[node name="Root" type="Node2D"]

[node name="Button" type="Button" parent="."]

[connection signal="pressed" from="Button" to="." method="_on_button_pressed"]
`;

      const doc = parseTscn(content);

      expect(doc.connections).toHaveLength(1);
      expect(doc.connections[0].signal).toBe('pressed');
      expect(doc.connections[0].from).toBe('Button');
      expect(doc.connections[0].to).toBe('.');
      expect(doc.connections[0].method).toBe('_on_button_pressed');
    });

    it('should parse sub_resources', () => {
      const content = `[gd_scene format=3]

[sub_resource type="RectangleShape2D" id="1"]
size = Vector2(32, 32)

[node name="Area" type="Area2D"]
`;

      const doc = parseTscn(content);

      expect(doc.subResources).toHaveLength(1);
      expect(doc.subResources[0].type).toBe('RectangleShape2D');
      expect(doc.subResources[0].properties.size).toEqual({ name: 'Vector2', args: [32, 32] });
    });

    it('should parse arrays', () => {
      const content = `[gd_scene format=3]

[node name="Root" type="Node2D" groups=["enemies", "spawnable"]]
`;

      const doc = parseTscn(content);

      expect(doc.nodes[0].groups).toEqual(['enemies', 'spawnable']);
    });

    it('should throw on invalid section header', () => {
      const content = `[invalid_section_without_closing_bracket
`;

      expect(() => parseTscn(content)).toThrow(TscnParseError);
    });
  });

  describe('serializeTscn', () => {
    it('should serialize a document back to valid TSCN format', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [],
        subResources: [],
        nodes: [
          { name: 'Root', type: 'Node2D', properties: {} },
        ],
        connections: [],
        editableInstances: [],
      };

      const output = serializeTscn(doc);

      expect(output).toContain('[gd_scene format=3]');
      expect(output).toContain('[node name="Root" type="Node2D"]');
    });

    it('should serialize external resources', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '', loadSteps: 2 },
        extResources: [
          { type: 'Script', path: 'res://test.gd', id: '"1_script"' },
        ],
        subResources: [],
        nodes: [
          { name: 'Root', type: 'Node2D', properties: {} },
        ],
        connections: [],
        editableInstances: [],
      };

      const output = serializeTscn(doc);

      expect(output).toContain('[ext_resource type="Script" path="res://test.gd" id="1_script"]');
    });

    it('should preserve properties during round-trip', () => {
      const original = `[gd_scene format=3]

[node name="Sprite" type="Sprite2D"]
position = Vector2(100, 200)
visible = true

`;

      const doc = parseTscn(original);
      const output = serializeTscn(doc);
      const reparsed = parseTscn(output);

      expect(reparsed.nodes[0].properties.position).toEqual({ name: 'Vector2', args: [100, 200] });
      expect(reparsed.nodes[0].properties.visible).toBe(true);
    });
  });

  describe('findNodeByPath', () => {
    const doc = parseTscn(`[gd_scene format=3]

[node name="Root" type="Node2D"]

[node name="Player" type="CharacterBody2D" parent="."]

[node name="Sprite" type="Sprite2D" parent="Player"]
`);

    it('should find root node with "."', () => {
      const node = findNodeByPath(doc, '.');
      expect(node?.name).toBe('Root');
    });

    it('should find root node with empty string', () => {
      const node = findNodeByPath(doc, '');
      expect(node?.name).toBe('Root');
    });

    it('should find root node with "root"', () => {
      const node = findNodeByPath(doc, 'root');
      expect(node?.name).toBe('Root');
    });

    it('should find child node by name', () => {
      const node = findNodeByPath(doc, 'Player');
      expect(node?.name).toBe('Player');
    });

    it('should find nested node by path', () => {
      const node = findNodeByPath(doc, 'Player/Sprite');
      expect(node?.name).toBe('Sprite');
    });

    it('should return undefined for non-existent node', () => {
      const node = findNodeByPath(doc, 'NonExistent');
      expect(node).toBeUndefined();
    });
  });

  describe('findExtResourceById', () => {
    const doc = parseTscn(`[gd_scene format=3]

[ext_resource type="Script" path="res://player.gd" id="1_script"]

[node name="Root" type="Node2D"]
`);

    it('should find resource by ID', () => {
      const res = findExtResourceById(doc, '1_script');
      expect(res?.type).toBe('Script');
      expect(res?.path).toBe('res://player.gd');
    });

    it('should handle ExtResource() wrapper', () => {
      const res = findExtResourceById(doc, 'ExtResource("1_script")');
      expect(res?.type).toBe('Script');
    });

    it('should return undefined for non-existent ID', () => {
      const res = findExtResourceById(doc, 'nonexistent');
      expect(res).toBeUndefined();
    });
  });

  describe('addExtResource', () => {
    it('should add a new external resource', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '', loadSteps: 1 },
        extResources: [],
        subResources: [],
        nodes: [],
        connections: [],
        editableInstances: [],
      };

      const id = addExtResource(doc, 'Script', 'res://new_script.gd');

      expect(doc.extResources).toHaveLength(1);
      expect(doc.extResources[0].type).toBe('Script');
      expect(doc.extResources[0].path).toBe('res://new_script.gd');
      expect(id).toBe('"1_script"');
      expect(doc.header.loadSteps).toBe(2);
    });

    it('should increment ID for subsequent resources', () => {
      const doc: TscnDocument = {
        header: { format: 3, uidType: '', uid: '' },
        extResources: [
          { type: 'Script', path: 'res://existing.gd', id: '"1_script"' },
        ],
        subResources: [],
        nodes: [],
        connections: [],
        editableInstances: [],
      };

      const id = addExtResource(doc, 'Texture2D', 'res://icon.png');

      expect(id).toBe('"2_texture2d"');
    });
  });

  describe('attachScriptToNode', () => {
    it('should attach a script to a node', () => {
      const doc = parseTscn(`[gd_scene format=3]

[node name="Player" type="CharacterBody2D"]
`);

      const result = attachScriptToNode(doc, 'Player', 'res://player.gd');

      expect(result).toBe(true);
      expect(doc.extResources).toHaveLength(1);
      expect(doc.nodes[0].script).toContain('ExtResource');
    });

    it('should reuse existing script resource', () => {
      const doc = parseTscn(`[gd_scene format=3]

[ext_resource type="Script" path="res://player.gd" id="1_script"]

[node name="Player" type="CharacterBody2D"]
`);

      const result = attachScriptToNode(doc, 'Player', 'res://player.gd');

      expect(result).toBe(true);
      expect(doc.extResources).toHaveLength(1); // No new resource added
    });

    it('should return false for non-existent node', () => {
      const doc = parseTscn(`[gd_scene format=3]

[node name="Root" type="Node2D"]
`);

      const result = attachScriptToNode(doc, 'NonExistent', 'res://script.gd');

      expect(result).toBe(false);
    });
  });

  describe('detachScriptFromNode', () => {
    it('should detach a script from a node', () => {
      const doc = parseTscn(`[gd_scene format=3]

[ext_resource type="Script" path="res://player.gd" id="1_script"]

[node name="Player" type="CharacterBody2D" script=ExtResource("1_script")]
`);

      const result = detachScriptFromNode(doc, 'Player');

      expect(result).toBe(true);
      expect(doc.nodes[0].script).toBeUndefined();
    });

    it('should return false for node without script', () => {
      const doc = parseTscn(`[gd_scene format=3]

[node name="Player" type="CharacterBody2D"]
`);

      const result = detachScriptFromNode(doc, 'Player');

      expect(result).toBe(false);
    });

    it('should return false for non-existent node', () => {
      const doc = parseTscn(`[gd_scene format=3]

[node name="Root" type="Node2D"]
`);

      const result = detachScriptFromNode(doc, 'NonExistent');

      expect(result).toBe(false);
    });
  });
});
