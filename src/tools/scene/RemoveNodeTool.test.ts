/**
 * RemoveNodeTool Unit Tests
 * ISO/IEC 29119 compliant - covers uncovered lines 56-95
 *
 * Uses dependency injection via createMockContext instead of jest.mock().
 * The handler accepts (args, ctx) where ctx is a ToolContext.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';
import { createMockContext } from '../ToolContext.js';
import { handleRemoveNode } from './RemoveNodeTool.js';

describe('RemoveNodeTool', () => {
  let projectPath: string;
  let cleanup: () => void;

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Validation', () => {
    it('should reject missing projectPath', async () => {
      const ctx = createMockContext();
      const result = await handleRemoveNode({
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject missing scenePath', async () => {
      const ctx = createMockContext();
      const result = await handleRemoveNode({
        projectPath,
        nodePath: 'Player',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject missing nodePath', async () => {
      const ctx = createMockContext();
      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject empty nodePath', async () => {
      const ctx = createMockContext();
      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: '',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject empty scenePath', async () => {
      const ctx = createMockContext();
      const result = await handleRemoveNode({
        projectPath,
        scenePath: '',
        nodePath: 'Player',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });

    it('should reject empty projectPath', async () => {
      const ctx = createMockContext();
      const result = await handleRemoveNode({
        projectPath: '',
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Validation failed');
    });
  });

  describe('Security', () => {
    it('should reject path traversal in projectPath', async () => {
      const ctx = createMockContext({
        validatePath: () => false,
      });
      const result = await handleRemoveNode({
        projectPath: '../../../etc',
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|Validation failed/i);
    });

    it('should reject path traversal in scenePath', async () => {
      const ctx = createMockContext({
        validatePath: (p: string) => !p.includes('..'),
      });
      const result = await handleRemoveNode({
        projectPath,
        scenePath: '../../etc/passwd',
        nodePath: 'Player',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|Validation failed/i);
    });
  });

  describe('Happy Path', () => {
    it('should return error when Godot path is not found (line 59-64)', async () => {
      const ctx = createMockContext({
        detectGodotPath: async () => null,
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should successfully remove a node (lines 66-92)', async () => {
      const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
      const mockExecuteOperation = jest.fn<(...args: unknown[]) => Promise<{ stdout: string; stderr: string }>>();

      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Node removed successfully',
        stderr: '',
      });

      const ctx = createMockContext({
        detectGodotPath: mockDetectGodotPath,
        executeOperation: mockExecuteOperation,
        executeWithBridge: async (_action, _params, fallback) => fallback(),
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);

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
      const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
      const mockExecuteOperation = jest.fn<(...args: unknown[]) => Promise<{ stdout: string; stderr: string }>>();

      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to remove node: node not found in scene tree',
      });

      const ctx = createMockContext({
        detectGodotPath: mockDetectGodotPath,
        executeOperation: mockExecuteOperation,
        executeWithBridge: async (_action, _params, fallback) => fallback(),
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'NonExistent',
      }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to remove node');
      expect(getResponseText(result)).toContain('node not found');
    });

    it('should handle stderr without "Failed to" (success with warnings)', async () => {
      const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
      const mockExecuteOperation = jest.fn<(...args: unknown[]) => Promise<{ stdout: string; stderr: string }>>();

      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: 'WARNING: Some deprecation warning',
      });

      const ctx = createMockContext({
        detectGodotPath: mockDetectGodotPath,
        executeOperation: mockExecuteOperation,
        executeWithBridge: async (_action, _params, fallback) => fallback(),
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Node removed successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle Error thrown by executeOperation (lines 93-100)', async () => {
      const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
      const mockExecuteOperation = jest.fn<(...args: unknown[]) => Promise<{ stdout: string; stderr: string }>>();

      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Godot process crashed'));

      const ctx = createMockContext({
        detectGodotPath: mockDetectGodotPath,
        executeOperation: mockExecuteOperation,
        executeWithBridge: async (_action, _params, fallback) => fallback(),
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to remove node');
      expect(getResponseText(result)).toContain('Godot process crashed');
    });

    it('should handle non-Error thrown by executeOperation (line 94)', async () => {
      const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
      const mockExecuteOperation = jest.fn<(...args: unknown[]) => Promise<{ stdout: string; stderr: string }>>();

      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue('string error');

      const ctx = createMockContext({
        detectGodotPath: mockDetectGodotPath,
        executeOperation: mockExecuteOperation,
        executeWithBridge: async (_action, _params, fallback) => fallback(),
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to remove node');
      expect(getResponseText(result)).toContain('Unknown error');
    });

    it('should handle Error thrown by detectGodotPath', async () => {
      const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
      mockDetectGodotPath.mockRejectedValue(new Error('Path detection failed'));

      const ctx = createMockContext({
        detectGodotPath: mockDetectGodotPath,
        executeWithBridge: async (_action, _params, fallback) => fallback(),
      });

      const result = await handleRemoveNode({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to remove node');
      expect(getResponseText(result)).toContain('Path detection failed');
    });
  });
});
