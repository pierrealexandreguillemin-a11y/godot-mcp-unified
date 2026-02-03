/**
 * GetProjectInfoTool Unit Tests
 * ISO/IEC 29119 compliant - covers uncovered lines 53, 64-91
 *
 * These tests mock the Godot detection and ProcessPool to exercise:
 * - Godot path not found (line 53)
 * - ProcessPool version execution (lines 62-64)
 * - Project structure retrieval (lines 67)
 * - Project name extraction from project.godot (lines 70-82)
 * - Successful response building (lines 84-98)
 * - Error handling catch block (lines 99-106)
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  getResponseText,
  parseJsonResponse,
  isErrorResponse,
} from '../test-utils.js';
import { handleGetProjectInfo } from './GetProjectInfoTool.js';

// Mock the Godot-dependent modules
jest.mock('../../core/PathManager', () => ({
  detectGodotPath: jest.fn(),
}));

jest.mock('../../core/ProcessPool', () => ({
  getGodotPool: jest.fn(),
}));

jest.mock('../../utils/FileUtils', () => ({
  getProjectStructure: jest.fn(),
}));

import { detectGodotPath } from '../../core/PathManager';
import { getGodotPool } from '../../core/ProcessPool';
import { getProjectStructure } from '../../utils/FileUtils';

const mockDetectGodotPath = detectGodotPath as jest.MockedFunction<typeof detectGodotPath>;
const mockGetGodotPool = getGodotPool as jest.MockedFunction<typeof getGodotPool>;
const mockGetProjectStructure = getProjectStructure as jest.MockedFunction<typeof getProjectStructure>;

describe('GetProjectInfoTool', () => {
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
      const result = await handleGetProjectInfo({});
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/Validation failed|projectPath/i);
    });

    it('should reject empty projectPath', async () => {
      const result = await handleGetProjectInfo({ projectPath: '' });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/Validation failed/i);
    });

    it('should reject non-existent project path', async () => {
      const result = await handleGetProjectInfo({ projectPath: '/non/existent/path' });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|Not a valid/i);
    });
  });

  describe('Security', () => {
    it('should reject path traversal in projectPath', async () => {
      const result = await handleGetProjectInfo({ projectPath: '../../../etc' });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
    });

    it('should reject embedded path traversal', async () => {
      const result = await handleGetProjectInfo({
        projectPath: '/home/user/../../../etc',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toMatch(/path traversal|invalid|Not a valid/i);
    });
  });

  describe('Happy Path', () => {
    it('should return error when Godot path not found (line 53)', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleGetProjectInfo({ projectPath });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should return project info successfully (lines 62-98)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: jest.fn().mockResolvedValue({
          stdout: '4.2.stable.official\n',
          stderr: '',
          exitCode: 0,
          duration: 100,
        }),
      };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      mockGetProjectStructure.mockReturnValue({
        scenes: ['scenes/main.tscn'],
        scripts: ['scripts/player.gd'],
        resources: ['resources/theme.tres'],
      });

      const result = await handleGetProjectInfo({ projectPath });

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse<{
        name: string;
        path: string;
        godotVersion: string;
        structure: unknown;
      }>(result);

      expect(data.name).toBe('Test Project');
      expect(data.path).toBe(projectPath);
      expect(data.godotVersion).toBe('4.2.stable.official');
      expect(data.structure).toBeDefined();
    });

    it('should extract project name from project.godot config (lines 70-78)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: jest.fn().mockResolvedValue({
          stdout: '4.2.stable\n',
          stderr: '',
          exitCode: 0,
          duration: 50,
        }),
      };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);
      mockGetProjectStructure.mockReturnValue({});

      // The default test project has config/name="Test Project"
      const result = await handleGetProjectInfo({ projectPath });

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse<{ name: string }>(result);
      expect(data.name).toBe('Test Project');
    });

    it('should use directory basename when project name extraction fails (lines 79-82)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: jest.fn().mockResolvedValue({
          stdout: '4.2.stable\n',
          stderr: '',
          exitCode: 0,
          duration: 50,
        }),
      };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);
      mockGetProjectStructure.mockReturnValue({});

      // Overwrite project.godot without config/name
      writeFileSync(
        join(projectPath, 'project.godot'),
        `; Engine configuration file.\nconfig_version=5\n\n[application]\n`
      );

      const result = await handleGetProjectInfo({ projectPath });

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse<{ name: string }>(result);
      // Should use the directory basename since config/name is missing
      expect(data.name).toBeDefined();
      expect(typeof data.name).toBe('string');
      expect(data.name.length).toBeGreaterThan(0);
    });

    it('should call pool.execute with correct arguments (line 63)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockExecute = jest.fn().mockResolvedValue({
        stdout: '4.2\n',
        stderr: '',
        exitCode: 0,
        duration: 50,
      });
      const mockPool = { execute: mockExecute };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);
      mockGetProjectStructure.mockReturnValue({});

      await handleGetProjectInfo({ projectPath });

      expect(mockExecute).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        { timeout: 10000 },
      );
    });

    it('should include structure from getProjectStructure (line 67)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: jest.fn().mockResolvedValue({
          stdout: '4.2\n',
          stderr: '',
          exitCode: 0,
          duration: 50,
        }),
      };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const expectedStructure = {
        scenes: ['a.tscn', 'b.tscn'],
        scripts: ['c.gd'],
        resources: [],
      };
      mockGetProjectStructure.mockReturnValue(expectedStructure);

      const result = await handleGetProjectInfo({ projectPath });

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse<{ structure: typeof expectedStructure }>(result);
      expect(data.structure).toEqual(expectedStructure);
    });
  });

  describe('Error Handling', () => {
    it('should handle Error thrown by pool.execute (lines 99-106)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: jest.fn().mockRejectedValue(new Error('Godot process crashed')),
      };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const result = await handleGetProjectInfo({ projectPath });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to get project info');
      expect(getResponseText(result)).toContain('Godot process crashed');
    });

    it('should handle non-Error thrown (line 100)', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');

      const mockPool = {
        execute: jest.fn().mockRejectedValue('string error'),
      };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const result = await handleGetProjectInfo({ projectPath });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to get project info');
      expect(getResponseText(result)).toContain('Unknown error');
    });

    it('should handle detectGodotPath throwing', async () => {
      mockDetectGodotPath.mockRejectedValue(new Error('Detection failed'));

      const result = await handleGetProjectInfo({ projectPath });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to get project info');
      expect(getResponseText(result)).toContain('Detection failed');
    });
  });
});
