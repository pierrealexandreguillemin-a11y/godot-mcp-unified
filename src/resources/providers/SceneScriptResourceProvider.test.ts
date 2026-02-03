/**
 * SceneScriptResourceProvider Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - URI handling
 * - Resource listing structure
 * - readResource: scenes list, scripts list, scene content, scene tree, script content, script errors
 * - Security (path validation)
 * - Error cases and edge cases
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK SETUP - Must be before dynamic imports
// ============================================================================

const mockReadFileSync = jest.fn<(path: string, encoding?: string) => string>();
const mockExistsSync = jest.fn<(path: string) => boolean>();
const mockStatSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  statSync: mockStatSync,
}));

const mockIsGodotProject = jest.fn<(path: string) => boolean>();

jest.unstable_mockModule('../../utils/FileUtils.js', () => ({
  isGodotProject: mockIsGodotProject,
}));

interface MockScannedFile {
  path: string;
  relativePath: string;
  ext: string;
  size: number;
  modified: Date;
}

const mockFindFiles = jest.fn<(dir: string, extensions: string[]) => MockScannedFile[]>();
const mockFindFilePaths = jest.fn<(dir: string, extensions: string[]) => string[]>();

jest.unstable_mockModule('../utils/fileScanner.js', () => ({
  findFiles: mockFindFiles,
  findFilePaths: mockFindFilePaths,
}));

interface MockTscnNode {
  name: string;
  type?: string;
  parent?: string;
  script?: string;
  properties: Record<string, unknown>;
}

interface MockTscnDocument {
  header: { format: number; uidType: string; uid: string };
  extResources: unknown[];
  subResources: unknown[];
  nodes: MockTscnNode[];
  connections: unknown[];
  editableInstances: unknown[];
}

const mockParseTscn = jest.fn<(content: string) => MockTscnDocument>();

jest.unstable_mockModule('../../core/TscnParser.js', () => ({
  parseTscn: mockParseTscn,
}));

// Dynamic import after all mocks are set up
const { SceneScriptResourceProvider } = await import('./SceneScriptResourceProvider.js');
const { RESOURCE_URIS } = await import('../types.js');

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_DATE = new Date('2025-01-15T10:30:00Z');

const MOCK_SCENE_FILES: MockScannedFile[] = [
  { path: '/mock/project/scenes/main.tscn', relativePath: 'scenes/main.tscn', ext: '.tscn', size: 2048, modified: MOCK_DATE },
  { path: '/mock/project/scenes/level1.tscn', relativePath: 'scenes/level1.tscn', ext: '.tscn', size: 4096, modified: MOCK_DATE },
];

const MOCK_SCRIPT_FILES: MockScannedFile[] = [
  { path: '/mock/project/scripts/player.gd', relativePath: 'scripts/player.gd', ext: '.gd', size: 1024, modified: MOCK_DATE },
  { path: '/mock/project/scripts/enemy.gd', relativePath: 'scripts/enemy.gd', ext: '.gd', size: 512, modified: MOCK_DATE },
];

const MOCK_TSCN_CONTENT = `[gd_scene load_steps=2 format=3 uid="uid://abc123"]

[ext_resource type="Script" path="res://scripts/player.gd" id="1"]

[node name="Root" type="Node2D"]

[node name="Player" type="CharacterBody2D" parent="."]
script = ExtResource("1")

[node name="Sprite" type="Sprite2D" parent="Player"]
`;

const MOCK_TSCN_DOC: MockTscnDocument = {
  header: { format: 3, uidType: 'uid', uid: 'uid://abc123' },
  extResources: [],
  subResources: [],
  nodes: [
    { name: 'Root', type: 'Node2D', properties: {} },
    { name: 'Player', type: 'CharacterBody2D', parent: '.', script: 'res://scripts/player.gd', properties: {} },
    { name: 'Sprite', type: 'Sprite2D', parent: 'Player', properties: {} },
  ],
  connections: [],
  editableInstances: [],
};

const MOCK_GD_CONTENT = `class_name Player
extends CharacterBody2D

@export var speed: float = 200.0

func _physics_process(delta: float) -> void:
    var velocity = Vector2.ZERO
    move_and_slide()
`;

const MOCK_ENEMY_GD_CONTENT = `extends Node2D

var health: int = 100

func _ready() -> void:
    pass
`;

describe('SceneScriptResourceProvider', () => {
  let provider: InstanceType<typeof SceneScriptResourceProvider>;
  const projectPath = '/mock/project';

  beforeEach(() => {
    provider = new SceneScriptResourceProvider();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // URI HANDLING
  // ==========================================================================
  describe('handlesUri', () => {
    const validUris = [
      RESOURCE_URIS.SCENES,
      RESOURCE_URIS.SCRIPTS,
      RESOURCE_URIS.SCRIPT_ERRORS,
      `${RESOURCE_URIS.SCENE}main.tscn`,
      `${RESOURCE_URIS.SCENE}levels/world1.tscn`,
      `${RESOURCE_URIS.SCENE}main.tscn/tree`,
      `${RESOURCE_URIS.SCRIPT}player.gd`,
      `${RESOURCE_URIS.SCRIPT}entities/enemy.gd`,
    ];

    const invalidUris = [
      'godot://project/info',
      'godot://assets',
      'godot://debug/output',
      'godot://unknown',
    ];

    for (const uri of validUris) {
      it(`handles ${uri}`, () => {
        expect(provider.handlesUri(uri)).toBe(true);
      });
    }

    for (const uri of invalidUris) {
      it(`does not handle ${uri}`, () => {
        expect(provider.handlesUri(uri)).toBe(false);
      });
    }
  });

  // ==========================================================================
  // PREFIX
  // ==========================================================================
  describe('prefix', () => {
    it('has correct prefix', () => {
      expect(provider.prefix).toBe('scene-script');
    });
  });

  // ==========================================================================
  // RESOURCE LISTING STRUCTURE
  // ==========================================================================
  describe('listResources', () => {
    it('returns array of resources', async () => {
      mockIsGodotProject.mockReturnValue(false);
      mockFindFilePaths.mockReturnValue([]);
      const resources = await provider.listResources('/non-existent-path');
      expect(Array.isArray(resources)).toBe(true);
    });

    it('includes base resources', async () => {
      mockIsGodotProject.mockReturnValue(false);
      mockFindFilePaths.mockReturnValue([]);
      const resources = await provider.listResources('/non-existent-path');

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.SCENES })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.SCRIPTS })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.SCRIPT_ERRORS })
      );
    });

    it('all resources have required properties', async () => {
      mockIsGodotProject.mockReturnValue(false);
      mockFindFilePaths.mockReturnValue([]);
      const resources = await provider.listResources('/non-existent-path');

      for (const resource of resources) {
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(resource.mimeType).toBeDefined();
      }
    });

    it('adds individual scene and tree resources for valid project', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFilePaths.mockImplementation((_dir: string, extensions: string[]) => {
        if (extensions.includes('.tscn')) {
          return ['/mock/project/scenes/main.tscn'];
        }
        if (extensions.includes('.gd')) {
          return [];
        }
        return [];
      });

      const resources = await provider.listResources(projectPath);

      // Should include scene content resource
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: `${RESOURCE_URIS.SCENE}scenes/main.tscn`,
          mimeType: 'text/x-godot-scene',
        })
      );
      // Should include scene tree resource
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: `${RESOURCE_URIS.SCENE}scenes/main.tscn/tree`,
          mimeType: 'application/json',
        })
      );
    });

    it('adds individual script resources for valid project', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFilePaths.mockImplementation((_dir: string, extensions: string[]) => {
        if (extensions.includes('.tscn')) {
          return [];
        }
        if (extensions.includes('.gd')) {
          return ['/mock/project/scripts/player.gd'];
        }
        return [];
      });

      const resources = await provider.listResources(projectPath);

      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: `${RESOURCE_URIS.SCRIPT}scripts/player.gd`,
          mimeType: 'text/x-gdscript',
        })
      );
    });

    it('returns only base resources for invalid project', async () => {
      mockIsGodotProject.mockReturnValue(false);
      mockFindFilePaths.mockReturnValue([]);

      const resources = await provider.listResources('/non-existent');

      // Should have exactly 3 base resources (scenes, scripts, script errors)
      expect(resources.length).toBe(3);
    });
  });

  // ==========================================================================
  // READ RESOURCE - LIST ALL SCENES
  // ==========================================================================
  describe('readResource - list all scenes', () => {
    it('returns error for invalid project', async () => {
      mockIsGodotProject.mockReturnValue(false);

      const result = await provider.readResource('/non-existent', RESOURCE_URIS.SCENES);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.scenes).toEqual([]);
    });

    it('returns error for empty project path', async () => {
      mockIsGodotProject.mockReturnValue(false);

      const result = await provider.readResource('', RESOURCE_URIS.SCENES);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
    });

    it('returns all scenes with correct format', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue(MOCK_SCENE_FILES);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SCENES);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.SCENES);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(2);
      expect(Array.isArray(data.scenes)).toBe(true);
      expect(data.scenes[0]).toEqual({
        path: 'res://scenes/main.tscn',
        relativePath: 'scenes/main.tscn',
        size: 2048,
        modified: MOCK_DATE.toISOString(),
      });
    });

    it('returns empty list for valid project with no scenes', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([]);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SCENES);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(0);
      expect(data.scenes).toEqual([]);
    });
  });

  // ==========================================================================
  // READ RESOURCE - LIST ALL SCRIPTS
  // ==========================================================================
  describe('readResource - list all scripts', () => {
    it('returns error for invalid project', async () => {
      mockIsGodotProject.mockReturnValue(false);

      const result = await provider.readResource('/non-existent', RESOURCE_URIS.SCRIPTS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.scripts).toEqual([]);
    });

    it('returns all scripts with extracted metadata', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue(MOCK_SCRIPT_FILES);
      mockReadFileSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.includes('player.gd')) {
          return MOCK_GD_CONTENT;
        }
        if (typeof path === 'string' && path.includes('enemy.gd')) {
          return MOCK_ENEMY_GD_CONTENT;
        }
        return '';
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SCRIPTS);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.SCRIPTS);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(2);
      expect(Array.isArray(data.scripts)).toBe(true);

      // Player script should have class_name and extends
      const playerScript = data.scripts.find(
        (s: { relativePath: string }) => s.relativePath === 'scripts/player.gd'
      );
      expect(playerScript).toBeDefined();
      expect(playerScript.className).toBe('Player');
      expect(playerScript.extends).toBe('CharacterBody2D');
      expect(playerScript.path).toBe('res://scripts/player.gd');

      // Enemy script should have extends but no class_name
      const enemyScript = data.scripts.find(
        (s: { relativePath: string }) => s.relativePath === 'scripts/enemy.gd'
      );
      expect(enemyScript).toBeDefined();
      expect(enemyScript.className).toBeNull();
      expect(enemyScript.extends).toBe('Node2D');
    });

    it('handles read errors for script files gracefully', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([MOCK_SCRIPT_FILES[0]]);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SCRIPTS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(1);
      // className and extends should be null due to read error
      expect(data.scripts[0].className).toBeNull();
      expect(data.scripts[0].extends).toBeNull();
    });

    it('returns empty list for valid project with no scripts', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([]);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SCRIPTS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(0);
      expect(data.scripts).toEqual([]);
    });
  });

  // ==========================================================================
  // READ RESOURCE - SCENE CONTENT
  // ==========================================================================
  describe('readResource - scene content', () => {
    it('returns scene file content', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_TSCN_CONTENT);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/main.tscn`
      );

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(`${RESOURCE_URIS.SCENE}scenes/main.tscn`);
      expect(result!.mimeType).toBe('text/x-godot-scene');
      expect(result!.text).toBe(MOCK_TSCN_CONTENT);
    });

    it('returns null when scene file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/missing.tscn`
      );

      expect(result).toBeNull();
    });

    it('returns null when readFileSync throws', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/main.tscn`
      );

      expect(result).toBeNull();
    });

    it('returns path traversal error for malicious path', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}../../etc/passwd`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
    });
  });

  // ==========================================================================
  // READ RESOURCE - SCENE TREE
  // ==========================================================================
  describe('readResource - scene tree', () => {
    it('returns parsed scene tree', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_TSCN_CONTENT);
      mockParseTscn.mockReturnValue(MOCK_TSCN_DOC);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/main.tscn/tree`
      );

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(`${RESOURCE_URIS.SCENE}scenes/main.tscn/tree`);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.scenePath).toBe('scenes/main.tscn');
      expect(data.nodeCount).toBe(3);
      expect(Array.isArray(data.tree)).toBe(true);
      expect(Array.isArray(data.flatList)).toBe(true);
      expect(data.flatList.length).toBe(3);
    });

    it('builds hierarchical tree structure', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_TSCN_CONTENT);
      mockParseTscn.mockReturnValue(MOCK_TSCN_DOC);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/main.tscn/tree`
      );

      const data = JSON.parse(result!.text!);

      // Root node should be at top level
      const rootNode = data.tree.find((n: { name: string }) => n.name === 'Root');
      expect(rootNode).toBeDefined();
      expect(rootNode.type).toBe('Node2D');
    });

    it('returns null when scene file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/missing.tscn/tree`
      );

      expect(result).toBeNull();
    });

    it('returns error when parseTscn throws', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid tscn content');
      mockParseTscn.mockImplementation(() => {
        throw new Error('Parse error: invalid TSCN format');
      });

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/broken.tscn/tree`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toContain('Parse error');
      expect(data.scenePath).toBe('scenes/broken.tscn');
    });

    it('returns path traversal error for malicious tree path', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}../../etc/passwd/tree`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
    });

    it('handles empty node list', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('[gd_scene format=3]');
      mockParseTscn.mockReturnValue({
        ...MOCK_TSCN_DOC,
        nodes: [],
      });

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/empty.tscn/tree`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.nodeCount).toBe(0);
      expect(data.tree).toEqual([]);
      expect(data.flatList).toEqual([]);
    });
  });

  // ==========================================================================
  // READ RESOURCE - SCRIPT CONTENT
  // ==========================================================================
  describe('readResource - script content', () => {
    it('returns script file content', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_GD_CONTENT);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCRIPT}scripts/player.gd`
      );

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(`${RESOURCE_URIS.SCRIPT}scripts/player.gd`);
      expect(result!.mimeType).toBe('text/x-gdscript');
      expect(result!.text).toBe(MOCK_GD_CONTENT);
    });

    it('returns null when script file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCRIPT}scripts/missing.gd`
      );

      expect(result).toBeNull();
    });

    it('returns null when readFileSync throws', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCRIPT}scripts/player.gd`
      );

      expect(result).toBeNull();
    });

    it('returns path traversal error for malicious path', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCRIPT}../../etc/passwd`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
    });

    it('returns correct MIME type for .gd files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('extends Node');

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCRIPT}scripts/test.gd`
      );

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('text/x-gdscript');
    });
  });

  // ==========================================================================
  // READ RESOURCE - SCRIPT ERRORS
  // ==========================================================================
  describe('readResource - script errors', () => {
    it('returns placeholder response', async () => {
      const result = await provider.readResource('/any', RESOURCE_URIS.SCRIPT_ERRORS);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.SCRIPT_ERRORS);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.note).toContain('--check-only');
      expect(data.errors).toEqual([]);
      expect(data.warnings).toEqual([]);
    });
  });

  // ==========================================================================
  // READ RESOURCE - UNKNOWN URI
  // ==========================================================================
  describe('readResource - unknown URI', () => {
    it('returns null for unknown URI', async () => {
      const result = await provider.readResource(projectPath, 'godot://unknown');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // SECURITY - PATH VALIDATION
  // ==========================================================================
  describe('security', () => {
    const traversalPatterns = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      'scenes/../../../secret',
    ];

    for (const pattern of traversalPatterns) {
      it(`blocks path traversal in scene: ${pattern}`, async () => {
        const result = await provider.readResource(
          projectPath,
          `${RESOURCE_URIS.SCENE}${pattern}`
        );

        expect(result).not.toBeNull();
        expect(result!.text).toBeDefined();
        const data = JSON.parse(result!.text!);
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
      });

      it(`blocks path traversal in script: ${pattern}`, async () => {
        const result = await provider.readResource(
          projectPath,
          `${RESOURCE_URIS.SCRIPT}${pattern}`
        );

        expect(result).not.toBeNull();
        expect(result!.text).toBeDefined();
        const data = JSON.parse(result!.text!);
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
      });

      it(`blocks path traversal in scene tree: ${pattern}/tree`, async () => {
        const result = await provider.readResource(
          projectPath,
          `${RESOURCE_URIS.SCENE}${pattern}/tree`
        );

        expect(result).not.toBeNull();
        expect(result!.text).toBeDefined();
        const data = JSON.parse(result!.text!);
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
      });
    }

    it('blocks null bytes in scene path', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/main\0.tscn`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('blocks null bytes in script path', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCRIPT}scripts/player\0.gd`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('accepts valid scene paths', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}main.tscn`
      );

      // Valid path: may return null (file not found) or content without security error
      if (result && result.text && result.mimeType === 'application/json') {
        const data = JSON.parse(result.text);
        if (data.error) {
          expect(data.error.toLowerCase()).not.toMatch(/traversal|parent|forbidden/);
        }
      }
      // null result is acceptable for non-existent files
    });

    it('accepts valid script paths', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCRIPT}player.gd`
      );

      // Valid path: may return null (file not found) or content without security error
      if (result && result.text && result.mimeType === 'application/json') {
        const data = JSON.parse(result.text);
        if (data.error) {
          expect(data.error.toLowerCase()).not.toMatch(/traversal|parent|forbidden/);
        }
      }
      // null result is acceptable for non-existent files
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('edge cases', () => {
    it('returns valid JSON from createErrorContent', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}../invalid`
      );

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('application/json');
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
      expect(data.uri).toBeDefined();
    });

    it('handles script without class_name or extends', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([
        {
          path: '/mock/project/scripts/util.gd',
          relativePath: 'scripts/util.gd',
          ext: '.gd',
          size: 64,
          modified: MOCK_DATE,
        },
      ]);
      mockReadFileSync.mockReturnValue('# utility script\nfunc helper():\n    pass\n');

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SCRIPTS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.scripts[0].className).toBeNull();
      expect(data.scripts[0].extends).toBeNull();
    });

    it('handles scene tree with deeply nested nodes', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('mock content');

      const deepDoc: MockTscnDocument = {
        ...MOCK_TSCN_DOC,
        nodes: [
          { name: 'Root', type: 'Node2D', properties: {} },
          { name: 'Level1', type: 'Node2D', parent: '.', properties: {} },
          { name: 'Level2', type: 'Sprite2D', parent: 'Level1', properties: {} },
        ],
      };
      mockParseTscn.mockReturnValue(deepDoc);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/deep.tscn/tree`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.nodeCount).toBe(3);
    });

    it('handles script errors URI correctly (not as script path)', async () => {
      // RESOURCE_URIS.SCRIPT_ERRORS is 'godot://script/errors'
      // RESOURCE_URIS.SCRIPT is 'godot://script/'
      // The readResource should dispatch to getScriptErrors, not readScriptContent
      const result = await provider.readResource(projectPath, RESOURCE_URIS.SCRIPT_ERRORS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.note).toBeDefined();
      expect(data.errors).toBeDefined();
    });

    it('handles scene with nodes that have scripts', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('mock');
      mockParseTscn.mockReturnValue({
        ...MOCK_TSCN_DOC,
        nodes: [
          { name: 'Root', type: 'Node2D', script: 'res://scripts/root.gd', properties: {} },
        ],
      });

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.SCENE}scenes/scripted.tscn/tree`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      const rootInTree = data.tree.find((n: { name: string }) => n.name === 'Root');
      expect(rootInTree.script).toBe('res://scripts/root.gd');
    });
  });
});
