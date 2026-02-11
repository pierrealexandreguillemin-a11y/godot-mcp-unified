/**
 * BaseToolHandler Unit Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for base tool handler utility functions
 */

import { jest } from '@jest/globals';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Dynamic imports to avoid top-level await issue with import.meta in transitive deps
let validateBasicArgs: typeof import('./BaseToolHandler.js').validateBasicArgs;
let prepareToolArgs: typeof import('./BaseToolHandler.js').prepareToolArgs;
let validateProjectPath: typeof import('./BaseToolHandler.js').validateProjectPath;
let validateScenePath: typeof import('./BaseToolHandler.js').validateScenePath;
let validateFilePath: typeof import('./BaseToolHandler.js').validateFilePath;
let createSuccessResponse: typeof import('./BaseToolHandler.js').createSuccessResponse;
let createJsonResponse: typeof import('./BaseToolHandler.js').createJsonResponse;

describe('BaseToolHandler', () => {
  let tmpDir: string;

  beforeAll(async () => {
    const mod = await import('./BaseToolHandler.js');
    validateBasicArgs = mod.validateBasicArgs;
    prepareToolArgs = mod.prepareToolArgs;
    validateProjectPath = mod.validateProjectPath;
    validateScenePath = mod.validateScenePath;
    validateFilePath = mod.validateFilePath;
    createSuccessResponse = mod.createSuccessResponse;
    createJsonResponse = mod.createJsonResponse;
  });

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'base-tool-handler-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('validateBasicArgs', () => {
    it('should return null when all required fields are present', () => {
      const args = { projectPath: '/some/path', nodeName: 'Player' };
      const result = validateBasicArgs(args, ['projectPath', 'nodeName']);
      expect(result).toBeNull();
    });

    it('should return error message when a required field is missing (undefined)', () => {
      const args = { projectPath: '/some/path' } as Record<string, unknown>;
      const result = validateBasicArgs(args, ['projectPath', 'nodeName']);
      expect(result).toBe('nodeName is required');
    });

    it('should return error message when a required field is null', () => {
      const args = { projectPath: '/some/path', nodeName: null };
      const result = validateBasicArgs(args, ['projectPath', 'nodeName']);
      expect(result).toBe('nodeName is required');
    });

    it('should return error message when a required field is empty string', () => {
      const args = { projectPath: '', nodeName: 'Player' };
      const result = validateBasicArgs(args, ['projectPath', 'nodeName']);
      expect(result).toBe('projectPath is required');
    });

    it('should return null when no required fields are specified', () => {
      const args = { anything: 'value' };
      const result = validateBasicArgs(args, []);
      expect(result).toBeNull();
    });

    it('should return error for the first missing field', () => {
      const args = {} as Record<string, unknown>;
      const result = validateBasicArgs(args, ['alpha', 'beta']);
      expect(result).toBe('alpha is required');
    });
  });

  describe('prepareToolArgs', () => {
    it('should normalize snake_case parameters to camelCase', () => {
      const args = { project_path: '/some/path', node_name: 'Player' } as Record<string, unknown>;
      const result = prepareToolArgs(args);
      // Path values get normalized by the platform (e.g. forward slashes to backslashes on Windows)
      expect(result['projectPath']).toBe(join('/some', 'path'));
      expect(result['nodeName']).toBe('Player');
    });

    it('should pass through already camelCase parameters unchanged', () => {
      const args = { projectPath: '/some/path', nodeName: 'Player' };
      const result = prepareToolArgs(args);
      expect(result.projectPath).toBe(join('/some', 'path'));
      expect(result.nodeName).toBe('Player');
    });

    it('should normalize path values', () => {
      const args = { projectPath: '/some//double//path' };
      const result = prepareToolArgs(args);
      expect((result.projectPath as string)).not.toContain('//');
    });

    it('should handle empty args object', () => {
      const args = {};
      const result = prepareToolArgs(args);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('validateProjectPath', () => {
    it('should return error for paths containing ".."', () => {
      const result = validateProjectPath('/some/../etc');
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('Invalid project path');
    });

    it('should return error for non-existent project directory', () => {
      const fakePath = join(tmpDir, 'nonexistent');
      const result = validateProjectPath(fakePath);
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('Not a valid Godot project');
    });

    it('should return error for directory without project.godot', () => {
      const result = validateProjectPath(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('Not a valid Godot project');
    });

    it('should return null for valid Godot project directory', () => {
      writeFileSync(join(tmpDir, 'project.godot'), '[gd_project]\n');
      const result = validateProjectPath(tmpDir);
      expect(result).toBeNull();
    });
  });

  describe('validateScenePath', () => {
    it('should return error for scene paths containing ".."', () => {
      const result = validateScenePath(tmpDir, '../etc/passwd');
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('Invalid scene path');
    });

    it('should return error for non-existent scene file', () => {
      const result = validateScenePath(tmpDir, 'scenes/level1.tscn');
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('Scene file does not exist');
    });

    it('should return null for existing scene file', () => {
      writeFileSync(join(tmpDir, 'main.tscn'), '[gd_scene]');
      const result = validateScenePath(tmpDir, 'main.tscn');
      expect(result).toBeNull();
    });
  });

  describe('validateFilePath', () => {
    it('should return error for file paths containing ".."', () => {
      const result = validateFilePath(tmpDir, '../secret.gd');
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('Invalid file path');
    });

    it('should return error for non-existent file', () => {
      const result = validateFilePath(tmpDir, 'scripts/player.gd');
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('File does not exist');
    });

    it('should return null for existing file', () => {
      writeFileSync(join(tmpDir, 'player.gd'), 'extends Node');
      const result = validateFilePath(tmpDir, 'player.gd');
      expect(result).toBeNull();
    });
  });

  describe('createSuccessResponse', () => {
    it('should return a properly formatted ToolResponse', () => {
      const result = createSuccessResponse('Operation successful');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Operation successful');
    });

    it('should not include isError flag', () => {
      const result = createSuccessResponse('ok');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('createJsonResponse', () => {
    it('should serialize data as formatted JSON', () => {
      const data = { name: 'Player', health: 100 };
      const result = createJsonResponse(data);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(data);
    });

    it('should use 2-space indentation', () => {
      const data = { a: 1 };
      const result = createJsonResponse(data);
      expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const result = createJsonResponse(data);
      expect(JSON.parse(result.content[0].text)).toEqual([1, 2, 3]);
    });

    it('should handle null', () => {
      const result = createJsonResponse(null);
      expect(result.content[0].text).toBe('null');
    });

    it('should handle nested objects', () => {
      const data = { player: { stats: { health: 100, mana: 50 } } };
      const result = createJsonResponse(data);
      expect(JSON.parse(result.content[0].text)).toEqual(data);
    });
  });
});
