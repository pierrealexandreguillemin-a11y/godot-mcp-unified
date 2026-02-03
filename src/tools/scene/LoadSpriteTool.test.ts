/**
 * LoadSpriteTool Unit Tests
 * ISO/IEC 29119 compliant - covers uncovered lines 49, 62-104
 *
 * These tests mock the Godot executor and path detection to exercise
 * the project/scene/file validation paths (line 49), the try block
 * (lines 62-101), and error handling (lines 102-104).
 */

import { jest } from '@jest/globals';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';

// Get the real modules, then override only the functions we need to mock
const realPathManager = await import('../../core/PathManager.js');
const mockDetectGodotPath = jest.fn<typeof realPathManager.detectGodotPath>();

jest.unstable_mockModule('../../core/PathManager', () => ({
  ...realPathManager,
  detectGodotPath: mockDetectGodotPath,
}));

const realGodotExecutor = await import('../../core/GodotExecutor.js');
const mockExecuteOperation = jest.fn<typeof realGodotExecutor.executeOperation>();

jest.unstable_mockModule('../../core/GodotExecutor', () => ({
  ...realGodotExecutor,
  executeOperation: mockExecuteOperation,
}));

// Must import after mocks are set up
const { handleLoadSprite } = await import('./LoadSpriteTool.js');

/**
 * Simple PNG header for texture tests (1x1 transparent PNG)
 */
const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

describe('LoadSpriteTool', () => {
  let projectPath: string;
  let cleanup: () => void;

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;

    // Create assets directory with texture
    mkdirSync(join(projectPath, 'assets'), { recursive: true });
    writeFileSync(join(projectPath, 'assets', 'icon.png'), MINIMAL_PNG);

    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Validation', () => {
    it('should reject missing projectPath', async () => {
      const result = await handleLoadSprite({
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject missing scenePath', async () => {
      const result = await handleLoadSprite({
        projectPath,
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject missing nodePath', async () => {
      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        texturePath: 'assets/icon.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject missing texturePath', async () => {
      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject empty texturePath', async () => {
      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: '',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject empty nodePath', async () => {
      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: '',
        texturePath: 'assets/icon.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });
  });

  describe('Security', () => {
    it('should reject path traversal in projectPath', async () => {
      const result = await handleLoadSprite({
        projectPath: '../../../etc',
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|Validation failed/i);
    });

    it('should reject path traversal in scenePath', async () => {
      const result = await handleLoadSprite({
        projectPath,
        scenePath: '../../etc/passwd',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|Validation failed/i);
    });

    it('should reject path traversal in texturePath', async () => {
      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: '../../../etc/passwd',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|Validation failed/i);
    });
  });

  describe('Happy Path', () => {
    it('should return error when project path is invalid (line 49)', async () => {
      const result = await handleLoadSprite({
        projectPath: '/non/existent/project',
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|not a valid/i);
    });

    it('should return error when scene path is invalid', async () => {
      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/nonexistent.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/not found|does not exist/i);
    });

    it('should return error when texture file not found', async () => {
      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/nonexistent.png',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/not found|does not exist/i);
    });

    it('should return error when Godot path is not found (lines 64-70)', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should successfully load sprite (lines 72-101)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Sprite loaded OK',
        stderr: '',
      });

      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player/Sprite',
        texturePath: 'assets/icon.png',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Sprite loaded successfully');
      expect(getResponseText(result)).toContain('icon.png');
      expect(getResponseText(result)).toContain('Sprite');
      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'load_sprite',
        expect.any(Object),
        projectPath,
        '/usr/bin/godot',
      );
      // Verify params contain expected fields (paths may be normalized on Windows)
      const callArgs = mockExecuteOperation.mock.calls[0];
      const params = callArgs[1] as Record<string, unknown>;
      expect(String(params.nodePath)).toMatch(/Player[/\\]Sprite/);
      expect(String(params.scenePath)).toMatch(/scenes[/\\]main\.tscn/);
      expect(String(params.texturePath)).toMatch(/assets[/\\]icon\.png/);
    });

    it('should handle stderr with "Failed to" message (lines 91-97)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to load sprite: node is not a Sprite2D',
      });

      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
        texturePath: 'assets/icon.png',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to load sprite');
      expect(getResponseText(result)).toContain('node is not a Sprite2D');
    });

    it('should handle stderr without "Failed to" (success with warnings)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Loaded',
        stderr: 'WARNING: Image format may not be optimal',
      });

      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Sprite loaded successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle Error thrown by executeOperation (lines 102-109)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Execution timeout'));

      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to load sprite');
      expect(getResponseText(result)).toContain('Execution timeout');
    });

    it('should handle non-Error thrown by executeOperation (line 103)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(42);

      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to load sprite');
      expect(getResponseText(result)).toContain('Unknown error');
    });

    it('should handle detectGodotPath throwing an error', async () => {
      mockDetectGodotPath.mockRejectedValue(new Error('Cannot detect Godot'));

      const result = await handleLoadSprite({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Sprite',
        texturePath: 'assets/icon.png',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to load sprite');
      expect(getResponseText(result)).toContain('Cannot detect Godot');
    });
  });
});
