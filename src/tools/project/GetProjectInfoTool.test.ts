/**
 * GetProjectInfoTool Unit Tests
 * ISO/IEC 29119 compliant - covers uncovered lines 53, 64-91
 *
 * Uses Dependency Injection via createMockContext instead of jest.mock().
 *
 * These tests exercise:
 * - Godot path not found (line 53)
 * - ProcessPool version execution (lines 62-64)
 * - Project structure retrieval (lines 67)
 * - Project name extraction from project.godot (lines 70-82)
 * - Successful response building (lines 84-98)
 * - Error handling catch block (lines 99-106)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, readFileSync as realReadFileSync } from 'fs';
import { join } from 'path';

import { createMockContext } from '../ToolContext.js';
import { createTempProject, getResponseText, parseJsonResponse, isErrorResponse } from '../test-utils.js';
import { handleGetProjectInfo } from './GetProjectInfoTool.js';

// Helper to create a typed mock execute function
type ExecuteResult = { stdout: string; stderr: string; exitCode: number; duration: number };
const createMockExecute = (resolveValue?: ExecuteResult, rejectValue?: unknown) => {
  if (rejectValue !== undefined) {
    return jest.fn<(...args: unknown[]) => Promise<ExecuteResult>>().mockRejectedValue(rejectValue);
  }
  return jest.fn<(...args: unknown[]) => Promise<ExecuteResult>>().mockResolvedValue(resolveValue!);
};

describe('GetProjectInfoTool', () => {
  let projectPath: string;
  let cleanup: () => void;

  // Re-usable mock functions
  const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockGetGodotPool = jest.fn<() => any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockGetProjectStructure = jest.fn<(projectPath: string) => any>();
  const mockReadFileSync = jest.fn<(path: string, encoding: BufferEncoding) => string>();
  const mockValidatePath = jest.fn<() => boolean>();
  const mockIsGodotProject = jest.fn<() => boolean>();

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;

    // Reset all mocks to avoid stale mockReturnValueOnce leaking between tests
    mockDetectGodotPath.mockReset();
    mockGetGodotPool.mockReset();
    mockGetProjectStructure.mockReset();
    mockReadFileSync.mockReset();
    mockValidatePath.mockReset();
    mockIsGodotProject.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Build a ctx with the shared mocks. Tests can further configure mocks
   * before calling the handler.
   */
  function buildCtx() {
    return createMockContext({
      detectGodotPath: mockDetectGodotPath,
      getGodotPool: mockGetGodotPool,
      getProjectStructure: mockGetProjectStructure,
      readFileSync: mockReadFileSync,
      validatePath: mockValidatePath,
      isGodotProject: mockIsGodotProject,
      // executeWithBridge must call fallback so handler main logic runs
      executeWithBridge: async (_action, _params, fallback) => fallback(),
    });
  }

  describe('Validation', () => {
    it('should reject missing projectPath', async () => {
      const ctx = buildCtx();
      const result = await handleGetProjectInfo({}, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/Validation failed|projectPath/i);
    });

    it('should reject empty projectPath', async () => {
      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath: '' }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/Validation failed/i);
    });

    it('should reject non-existent project path', async () => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(false);

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath: '/non/existent/path' }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|Not a valid|Could not find/i);
    });
  });

  describe('Security', () => {
    it('should reject path traversal in projectPath', async () => {
      mockValidatePath.mockReturnValue(false);

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath: '../../../etc' }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
    });

    it('should reject embedded path traversal', async () => {
      mockValidatePath.mockReturnValue(false);

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({
        projectPath: '/home/user/../../../etc',
      }, ctx);
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|invalid|Not a valid/i);
    });
  });

  describe('Happy Path', () => {
    /**
     * Helper to configure mocks for happy-path scenarios.
     * Sets validatePath and isGodotProject to true by default.
     */
    function setupHappyPath() {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
    }

    it('should return error when Godot path not found (line 53)', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockResolvedValue(null);

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should return project info successfully (lines 62-98)', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: createMockExecute({
          stdout: '4.2.stable.official\n',
          stderr: '',
          exitCode: 0,
          duration: 100,
        }),
      };
      mockGetGodotPool.mockReturnValue(mockPool);

      mockGetProjectStructure.mockReturnValue({
        scenes: ['scenes/main.tscn'],
        scripts: ['scripts/player.gd'],
        resources: ['resources/theme.tres'],
      });

      // readFileSync reads the real project.godot fixture with config/name="Test Project"
      mockReadFileSync.mockImplementation((filePath: string) => {
        // Use the real file system for this test
        return realReadFileSync(filePath, 'utf8') as string;
      });

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath }, ctx);

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse(result) as {
        name: string;
        path: string;
        godotVersion: string;
        structure: unknown;
      };

      expect(data.name).toBe('Test Project');
      expect(data.path).toBe(projectPath);
      expect(data.godotVersion).toBe('4.2.stable.official');
      expect(data.structure).toBeDefined();
    });

    it('should extract project name from project.godot config (lines 70-78)', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: createMockExecute({
          stdout: '4.2.stable\n',
          stderr: '',
          exitCode: 0,
          duration: 50,
        }),
      };
      mockGetGodotPool.mockReturnValue(mockPool);
      mockGetProjectStructure.mockReturnValue({});

      // Return project.godot content with config/name
      mockReadFileSync.mockImplementation((filePath: string) => {
        return realReadFileSync(filePath, 'utf8') as string;
      });

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath }, ctx);

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse(result) as { name: string };
      expect(data.name).toBe('Test Project');
    });

    it('should use directory basename when project name extraction fails (lines 79-82)', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: createMockExecute({
          stdout: '4.2.stable\n',
          stderr: '',
          exitCode: 0,
          duration: 50,
        }),
      };
      mockGetGodotPool.mockReturnValue(mockPool);
      mockGetProjectStructure.mockReturnValue({});

      // Overwrite project.godot without config/name
      writeFileSync(
        join(projectPath, 'project.godot'),
        `; Engine configuration file.\nconfig_version=5\n\n[application]\n`
      );

      // Return the updated file content (no config/name)
      mockReadFileSync.mockImplementation((filePath: string) => {
        return realReadFileSync(filePath, 'utf8') as string;
      });

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath }, ctx);

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse(result) as { name: string };
      // Should use the directory basename since config/name is missing
      expect(data.name).toBeDefined();
      expect(typeof data.name).toBe('string');
      expect(data.name.length).toBeGreaterThan(0);
    });

    it('should call pool.execute with correct arguments (line 63)', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockExecute = createMockExecute({
        stdout: '4.2\n',
        stderr: '',
        exitCode: 0,
        duration: 50,
      });
      const mockPool = { execute: mockExecute };
      mockGetGodotPool.mockReturnValue(mockPool);
      mockGetProjectStructure.mockReturnValue({});

      // readFileSync can return empty — basename fallback is fine
      mockReadFileSync.mockReturnValue('');

      const ctx = buildCtx();
      await handleGetProjectInfo({ projectPath }, ctx);

      expect(mockExecute).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        { timeout: 10000 },
      );
    });

    it('should include structure from getProjectStructure (line 67)', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: createMockExecute({
          stdout: '4.2\n',
          stderr: '',
          exitCode: 0,
          duration: 50,
        }),
      };
      mockGetGodotPool.mockReturnValue(mockPool);

      const expectedStructure = {
        scenes: ['a.tscn', 'b.tscn'],
        scripts: ['c.gd'],
        resources: [],
      };
      mockGetProjectStructure.mockReturnValue(expectedStructure);

      // readFileSync can return empty
      mockReadFileSync.mockReturnValue('');

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath }, ctx);

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse(result) as { structure: typeof expectedStructure };
      expect(data.structure).toEqual(expectedStructure);
    });
  });

  describe('Error Handling', () => {
    function setupHappyPath() {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
    }

    it('should handle Error thrown by pool.execute (lines 99-106)', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: createMockExecute(undefined, new Error('Godot process crashed')),
      };
      mockGetGodotPool.mockReturnValue(mockPool);

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to get project info');
      expect(getResponseText(result)).toContain('Godot process crashed');
    });

    it('should handle non-Error thrown (line 100)', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: createMockExecute(undefined, 'string error'),
      };
      mockGetGodotPool.mockReturnValue(mockPool);

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to get project info');
      expect(getResponseText(result)).toContain('Unknown error');
    });

    it('should handle detectGodotPath throwing', async () => {
      setupHappyPath();
      mockDetectGodotPath.mockRejectedValue(new Error('Detection failed'));

      const ctx = buildCtx();
      const result = await handleGetProjectInfo({ projectPath }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to get project info');
      expect(getResponseText(result)).toContain('Detection failed');
    });
  });
});
