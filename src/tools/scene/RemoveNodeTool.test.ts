/**
 * RemoveNodeTool Unit Tests
 * ISO/IEC 29119 compliant - covers uncovered lines 56-95
 *
 * These tests mock the Godot executor and path detection to exercise
 * the happy path (lines 56-92) and error handling (lines 93-95)
 * that require a running Godot instance in integration tests.
 */

import { jest } from '@jest/globals';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';

// Get the real PathManager exports, then override only detectGodotPath
const realPathManager = await import('../../core/PathManager.js');
const mockDetectGodotPath = jest.fn<typeof realPathManager.detectGodotPath>();

jest.unstable_mockModule('../../core/PathManager', () => ({
  ...realPathManager,
  detectGodotPath: mockDetectGodotPath,
}));

const realGodotExecutor = await import('../../core/GodotExecutor.js');
const mockExecuteOperationFn = jest.fn<typeof realGodotExecutor.executeOperation>();

jest.unstable_mockModule('../../core/GodotExecutor', () => ({
  ...realGodotExecutor,
  executeOperation: mockExecuteOperationFn,
}));

// Must import after mocks are set up
const { handleRemoveNode } = await import('./RemoveNodeTool.js');

const mockExecuteOperation = mockExecuteOperationFn;

describe('RemoveNodeTool', () => {
  let projectPath: string;
  let cleanup: () => void;

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Validation', () => {
    it('should reject missing projectPath', async () => {
      const result = await handleRemoveNode({
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject missing scenePath', async () => {
      const result = await handleRemoveNode({
        projectPath,
        nodePath: 'Player',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject missing nodePath', async () => {
      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject empty nodePath', async () => {
      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: '',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject empty scenePath', async () => {
      const result = await handleRemoveNode({
        projectPath,
        scenePath: '',
        nodePath: 'Player',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject empty projectPath', async () => {
      const result = await handleRemoveNode({
        projectPath: '',
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });
  });

  describe('Security', () => {
    it('should reject path traversal in projectPath', async () => {
      const result = await handleRemoveNode({
        projectPath: '../../../etc',
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|Validation failed/i);
    });

    it('should reject path traversal in scenePath', async () => {
      const result = await handleRemoveNode({
        projectPath,
        scenePath: '../../etc/passwd',
        nodePath: 'Player',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|Validation failed/i);
    });
  });

  describe('Happy Path', () => {
    it('should return error when Godot path is not found (line 59-64)', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should successfully remove a node (lines 66-92)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Node removed successfully',
        stderr: '',
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Node removed successfully');
      expect(getResponseText(result)).toContain('Player');
      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'remove_node',
        expect.objectContaining({
          nodePath: 'Player',
        }),
        projectPath,
        '/usr/bin/godot',
      );
      // scenePath may be normalized with backslashes on Windows
      const callArgs = mockExecuteOperation.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('scenePath');
      expect((callArgs[1] as Record<string, unknown>).scenePath).toMatch(/scenes[/\\]main\.tscn/);
    });

    it('should handle stderr with "Failed to" message (lines 82-88)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to remove node: node not found in scene tree',
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'NonExistent',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to remove node');
      expect(getResponseText(result)).toContain('node not found');
    });

    it('should handle stderr without "Failed to" (success with warnings)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: 'WARNING: Some deprecation warning',
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Node removed successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle Error thrown by executeOperation (lines 93-100)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Godot process crashed'));

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to remove node');
      expect(getResponseText(result)).toContain('Godot process crashed');
    });

    it('should handle non-Error thrown by executeOperation (line 94)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue('string error');

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to remove node');
      expect(getResponseText(result)).toContain('Unknown error');
    });

    it('should handle Error thrown by detectGodotPath', async () => {
      mockDetectGodotPath.mockRejectedValue(new Error('Path detection failed'));

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to remove node');
      expect(getResponseText(result)).toContain('Path detection failed');
    });
  });
});
