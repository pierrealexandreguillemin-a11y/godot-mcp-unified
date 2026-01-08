/**
 * MCP Resources Types Tests
 * ISO/IEC 29119 compliant - Security and Validation
 *
 * Test categories:
 * - Path traversal protection (OWASP A01:2021)
 * - Zod schema validation (ISO/IEC 5055)
 * - URI validation
 */

import {
  validatePathWithinProject,
  sanitizeUriPath,
  SectionNameSchema,
  FilePathSchema,
  AssetCategorySchema,
  validateSceneUri,
  validateScriptUri,
  validateAssetCategory,
  validateSectionName,
  validateUidPath,
  getMimeType,
  RESOURCE_URIS,
} from './types.js';

import { resolve } from 'path';

describe('types', () => {
  // ==========================================================================
  // PATH TRAVERSAL PROTECTION (OWASP A01:2021)
  // ==========================================================================
  describe('validatePathWithinProject', () => {
    // Use resolved path for cross-platform compatibility
    const projectPath = resolve('/mock/project');

    describe('valid paths', () => {
      it('accepts simple relative path', () => {
        const result = validatePathWithinProject(projectPath, 'main.tscn');
        expect(result).toBe(resolve(projectPath, 'main.tscn'));
      });

      it('accepts nested path', () => {
        const result = validatePathWithinProject(projectPath, 'scenes/level1.tscn');
        expect(result).toBe(resolve(projectPath, 'scenes/level1.tscn'));
      });

      it('accepts deeply nested path', () => {
        const result = validatePathWithinProject(projectPath, 'a/b/c/d/e.gd');
        expect(result).toBe(resolve(projectPath, 'a/b/c/d/e.gd'));
      });

      it('normalizes Windows-style path', () => {
        const result = validatePathWithinProject(projectPath, 'scenes\\level1.tscn');
        expect(result).toContain('scenes');
        expect(result).toContain('level1.tscn');
      });
    });

    describe('path traversal attacks', () => {
      it('rejects simple parent directory', () => {
        const result = validatePathWithinProject(projectPath, '../etc/passwd');
        expect(result).toBeNull();
      });

      it('rejects encoded parent directory', () => {
        const result = validatePathWithinProject(projectPath, '..%2F..%2Fetc%2Fpasswd');
        expect(result).toBeNull();
      });

      it('rejects nested parent traversal', () => {
        const result = validatePathWithinProject(projectPath, 'a/../../../etc/passwd');
        expect(result).toBeNull();
      });

      it('rejects parent in middle of path', () => {
        const result = validatePathWithinProject(projectPath, 'scenes/../../../secret');
        expect(result).toBeNull();
      });

      it('rejects null bytes', () => {
        const result = validatePathWithinProject(projectPath, 'test\x00.tscn');
        expect(result).toBeNull();
      });

      it('rejects double null bytes', () => {
        const result = validatePathWithinProject(projectPath, 'test\x00\x00.gd');
        expect(result).toBeNull();
      });

      it('rejects absolute path outside project', () => {
        const result = validatePathWithinProject(projectPath, '/etc/passwd');
        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('handles empty path', () => {
        const result = validatePathWithinProject(projectPath, '');
        expect(result).toBe(projectPath);
      });

      it('handles path with dots in filename', () => {
        const result = validatePathWithinProject(projectPath, 'file.backup.tscn');
        expect(result).toBe(resolve(projectPath, 'file.backup.tscn'));
      });

      it('handles single dot', () => {
        const result = validatePathWithinProject(projectPath, './test.gd');
        expect(result).toBe(resolve(projectPath, 'test.gd'));
      });
    });
  });

  describe('sanitizeUriPath', () => {
    it('removes leading slash', () => {
      expect(sanitizeUriPath('/test.tscn')).toBe('test.tscn');
    });

    it('normalizes backslashes to forward slashes', () => {
      expect(sanitizeUriPath('a\\b\\c.gd')).toBe('a/b/c.gd');
    });

    it('collapses multiple slashes', () => {
      expect(sanitizeUriPath('a//b///c.gd')).toBe('a/b/c.gd');
    });

    it('handles mixed separators', () => {
      expect(sanitizeUriPath('\\a//b\\\\c.gd')).toBe('a/b/c.gd');
    });

    it('handles empty string', () => {
      expect(sanitizeUriPath('')).toBe('');
    });
  });

  // ==========================================================================
  // ZOD SCHEMA VALIDATION (ISO/IEC 5055)
  // ==========================================================================
  describe('SectionNameSchema', () => {
    describe('valid sections', () => {
      it('accepts alphanumeric', () => {
        expect(SectionNameSchema.safeParse('application').success).toBe(true);
      });

      it('accepts with underscore', () => {
        expect(SectionNameSchema.safeParse('display_settings').success).toBe(true);
      });

      it('accepts numbers', () => {
        expect(SectionNameSchema.safeParse('layer2').success).toBe(true);
      });
    });

    describe('invalid sections', () => {
      it('rejects empty string', () => {
        expect(SectionNameSchema.safeParse('').success).toBe(false);
      });

      it('rejects special characters', () => {
        expect(SectionNameSchema.safeParse('test-section').success).toBe(false);
        expect(SectionNameSchema.safeParse('test.section').success).toBe(false);
        expect(SectionNameSchema.safeParse('test/section').success).toBe(false);
      });

      it('rejects too long', () => {
        expect(SectionNameSchema.safeParse('a'.repeat(101)).success).toBe(false);
      });

      it('rejects injection attempts', () => {
        expect(SectionNameSchema.safeParse('../etc').success).toBe(false);
        expect(SectionNameSchema.safeParse('<script>').success).toBe(false);
      });
    });
  });

  describe('FilePathSchema', () => {
    describe('valid paths', () => {
      it('accepts simple filename', () => {
        expect(FilePathSchema.safeParse('test.gd').success).toBe(true);
      });

      it('accepts nested path', () => {
        expect(FilePathSchema.safeParse('scenes/level1.tscn').success).toBe(true);
      });

      it('accepts path with dots', () => {
        expect(FilePathSchema.safeParse('file.backup.tres').success).toBe(true);
      });
    });

    describe('invalid paths', () => {
      it('rejects empty string', () => {
        expect(FilePathSchema.safeParse('').success).toBe(false);
      });

      it('rejects null bytes', () => {
        expect(FilePathSchema.safeParse('test\x00.gd').success).toBe(false);
      });

      it('rejects parent traversal', () => {
        expect(FilePathSchema.safeParse('../test.gd').success).toBe(false);
        expect(FilePathSchema.safeParse('a/../b.gd').success).toBe(false);
      });

      it('rejects too long path', () => {
        expect(FilePathSchema.safeParse('a'.repeat(501)).success).toBe(false);
      });
    });
  });

  describe('AssetCategorySchema', () => {
    const validCategories = [
      'images', 'audio', 'models', 'fonts', 'shaders',
      'resources', 'scenes', 'scripts', 'data',
    ];

    it('accepts all valid categories', () => {
      for (const category of validCategories) {
        expect(AssetCategorySchema.safeParse(category).success).toBe(true);
      }
    });

    it('rejects invalid categories', () => {
      expect(AssetCategorySchema.safeParse('invalid').success).toBe(false);
      expect(AssetCategorySchema.safeParse('').success).toBe(false);
      expect(AssetCategorySchema.safeParse('IMAGES').success).toBe(false);
    });
  });

  // ==========================================================================
  // URI VALIDATION FUNCTIONS
  // ==========================================================================
  describe('validateSceneUri', () => {
    describe('valid URIs', () => {
      it('validates scene path', () => {
        const result = validateSceneUri('godot://scene/main.tscn');
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.path).toBe('main.tscn');
          expect(result.isTree).toBe(false);
        }
      });

      it('validates scene tree path', () => {
        const result = validateSceneUri('godot://scene/main.tscn/tree');
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.path).toBe('main.tscn');
          expect(result.isTree).toBe(true);
        }
      });

      it('validates nested scene path', () => {
        const result = validateSceneUri('godot://scene/levels/world1/stage.tscn');
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.path).toBe('levels/world1/stage.tscn');
        }
      });
    });

    describe('invalid URIs', () => {
      it('rejects wrong prefix', () => {
        const result = validateSceneUri('godot://script/test.gd');
        expect(result.valid).toBe(false);
      });

      it('rejects path traversal', () => {
        const result = validateSceneUri('godot://scene/../etc/passwd');
        expect(result.valid).toBe(false);
      });

      it('rejects empty path', () => {
        const result = validateSceneUri('godot://scene/');
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateScriptUri', () => {
    describe('valid URIs', () => {
      it('validates script path', () => {
        const result = validateScriptUri('godot://script/player.gd');
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.path).toBe('player.gd');
        }
      });

      it('validates nested script path', () => {
        const result = validateScriptUri('godot://script/entities/enemy.gd');
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.path).toBe('entities/enemy.gd');
        }
      });
    });

    describe('invalid URIs', () => {
      it('rejects wrong prefix', () => {
        const result = validateScriptUri('godot://scene/test.tscn');
        expect(result.valid).toBe(false);
      });

      it('rejects path traversal', () => {
        const result = validateScriptUri('godot://script/../../../etc/passwd');
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateAssetCategory', () => {
    it('validates valid category', () => {
      const result = validateAssetCategory('images');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.category).toBe('images');
      }
    });

    it('rejects invalid category', () => {
      const result = validateAssetCategory('invalid');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('Invalid category');
      }
    });
  });

  describe('validateSectionName', () => {
    it('validates valid section', () => {
      const result = validateSectionName('application');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.section).toBe('application');
      }
    });

    it('rejects invalid section', () => {
      const result = validateSectionName('../etc');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUidPath', () => {
    describe('valid URIs', () => {
      it('validates UID path', () => {
        const result = validateUidPath('godot://uid/icon.png');
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.path).toBe('icon.png');
        }
      });

      it('validates nested UID path', () => {
        const result = validateUidPath('godot://uid/assets/sprites/player.png');
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.path).toBe('assets/sprites/player.png');
        }
      });
    });

    describe('invalid URIs', () => {
      it('rejects wrong prefix', () => {
        const result = validateUidPath('godot://scene/test.tscn');
        expect(result.valid).toBe(false);
      });

      it('rejects path traversal', () => {
        const result = validateUidPath('godot://uid/../../etc/passwd');
        expect(result.valid).toBe(false);
      });
    });
  });

  // ==========================================================================
  // MIME TYPES
  // ==========================================================================
  describe('getMimeType', () => {
    const testCases: [string, string][] = [
      ['test.gd', 'text/x-gdscript'],
      ['scene.tscn', 'text/x-godot-scene'],
      ['resource.tres', 'text/x-godot-resource'],
      ['resource.res', 'application/x-godot-resource'],
      ['project.godot', 'text/x-godot-project'],
      ['shader.gdshader', 'text/x-godot-shader'],
      ['image.png', 'image/png'],
      ['model.glb', 'model/gltf-binary'],
      ['unknown.xyz', 'application/octet-stream'],
    ];

    for (const [path, expected] of testCases) {
      it(`returns ${expected} for ${path}`, () => {
        expect(getMimeType(path)).toBe(expected);
      });
    }

    it('handles uppercase extensions', () => {
      expect(getMimeType('TEST.GD')).toBe('text/x-gdscript');
    });
  });

  // ==========================================================================
  // RESOURCE URI CONSTANTS
  // ==========================================================================
  describe('RESOURCE_URIS', () => {
    it('has project resources', () => {
      expect(RESOURCE_URIS.PROJECT_INFO).toBe('godot://project/info');
      expect(RESOURCE_URIS.PROJECT_SETTINGS).toBe('godot://project/settings');
    });

    it('has scene/script resources', () => {
      expect(RESOURCE_URIS.SCENES).toBe('godot://scenes');
      expect(RESOURCE_URIS.SCRIPTS).toBe('godot://scripts');
    });

    it('has asset resources', () => {
      expect(RESOURCE_URIS.ASSETS).toBe('godot://assets');
      expect(RESOURCE_URIS.RESOURCES).toBe('godot://resources');
    });

    it('has debug resources', () => {
      expect(RESOURCE_URIS.DEBUG_OUTPUT).toBe('godot://debug/output');
      expect(RESOURCE_URIS.DEBUG_STREAM).toBe('godot://debug/stream');
    });
  });
});
