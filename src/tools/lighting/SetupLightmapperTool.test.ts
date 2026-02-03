/**
 * SetupLightmapperTool Tests
 * ISO/IEC 29119 compliant - comprehensive test documentation
 *
 * Tests use actual TscnParser (not mocked) for integration verification
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock functions before mocking modules (typed properly for ESM)
const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
const mockValidatePath = jest.fn<() => boolean>();
const mockIsGodotProject = jest.fn<() => boolean>();
const mockExistsSync = jest.fn<() => boolean>();
const mockReadFile = jest.fn<(path: string, encoding: string) => Promise<string>>();
const mockWriteFile = jest.fn<(path: string, content: string, encoding: string) => Promise<void>>();
const mockExecute = jest.fn<(cmd: string, args: string[], opts: unknown) => Promise<{ stdout: string; stderr: string }>>();

// Mock modules using unstable_mockModule for ESM support
jest.unstable_mockModule('../../core/PathManager.js', () => ({
  detectGodotPath: mockDetectGodotPath,
  validatePath: mockValidatePath,
  normalizeHandlerPaths: jest.fn(<T>(args: T) => args),
  normalizePath: jest.fn((p: string) => p),
}));

jest.unstable_mockModule('../../core/ParameterNormalizer.js', () => ({
  normalizeParameters: jest.fn(<T>(args: T) => args),
  convertCamelToSnakeCase: jest.fn((s: string) => s),
}));

jest.unstable_mockModule('../../utils/Logger.js', () => ({
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

jest.unstable_mockModule('../../utils/FileUtils.js', () => ({
  isGodotProject: mockIsGodotProject,
}));

jest.unstable_mockModule('fs', () => ({
  existsSync: mockExistsSync,
}));

jest.unstable_mockModule('fs-extra', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

jest.unstable_mockModule('../../core/ProcessPool.js', () => ({
  getGodotPool: jest.fn(() => ({
    execute: mockExecute,
  })),
}));

// Dynamic import after mocking
const { handleSetupLightmapper } = await import('./SetupLightmapperTool.js');

// Minimal .tscn content - valid for TscnParser
const MINIMAL_TSCN = `[gd_scene format=3]

[node name="World" type="Node3D"]
`;

// TSCN with existing LightmapGI node
const TSCN_WITH_LIGHTMAP = `[gd_scene format=3]

[node name="World" type="Node3D"]

[node name="LightmapGI" type="LightmapGI" parent="."]
quality = 1
bounces = 3
`;

describe('SetupLightmapperTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // 1. Input Validation
  // ============================================================================
  describe('Input Validation', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleSetupLightmapper({
        scenePath: 'scenes/level.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when scenePath is missing', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scenePath');
    });

    it('should return error when all required parameters are missing', async () => {
      const result = await handleSetupLightmapper({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Validation failed/i);
    });

    it('should return error for invalid quality enum', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        quality: 'extreme' as 'low',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/quality|Validation failed/i);
    });

    it('should return error for bounces out of range (negative)', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bounces: -1,
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for bounces out of range (>16)', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bounces: 17,
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for bakeTimeout below minimum', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bakeTimeout: 5000,
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for bakeTimeout above maximum', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bakeTimeout: 4000000,
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for non-boolean useDenoiser', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        useDenoiser: 'yes' as unknown as boolean,
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for invalid environmentMode', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        environmentMode: 'invalid' as 'disabled',
      });
      expect(result.isError).toBe(true);
    });
  });

  // ============================================================================
  // 2. File Extension Validation
  // ============================================================================
  describe('File Extension Validation', () => {
    it('should return error for non-.tscn extension', async () => {
      mockValidatePath.mockReturnValue(true);
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('.tscn');
    });
  });

  // ============================================================================
  // 3. Path Security
  // ============================================================================
  describe('Path Security', () => {
    it('should return error for path traversal in projectPath', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/../../../etc',
        scenePath: 'scenes/level.tscn',
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for path traversal in scenePath', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: '../../../etc/level.tscn',
      });
      expect(result.isError).toBe(true);
    });
  });

  // ============================================================================
  // 4. Project/Scene Validation
  // ============================================================================
  describe('Project Validation', () => {
    it('should return error for invalid project path', async () => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(false);
      const result = await handleSetupLightmapper({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/level.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });

    it('should return error when scene file does not exist', async () => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(false);
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/missing.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('does not exist');
    });
  });

  // ============================================================================
  // 5. Happy Path - Create LightmapGI
  // ============================================================================
  describe('Happy Path - Create Node', () => {
    beforeEach(() => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(MINIMAL_TSCN);
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should create LightmapGI node with defaults', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('created');
      expect(result.content[0].text).toContain('Quality: medium');
      expect(result.content[0].text).toContain('Bounces: 3');
      expect(result.content[0].text).toContain('Denoiser: on');
    });

    it('should write LightmapGI properties to scene file', async () => {
      await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        quality: 'high',
        bounces: 5,
        useDenoiser: false,
        directional: true,
        interior: true,
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      expect(content).toContain('[node name="LightmapGI" type="LightmapGI" parent="."]');
      expect(content).toContain('quality = 2');
      expect(content).toContain('bounces = 5');
      expect(content).toContain('use_denoiser = false');
      expect(content).toContain('directional = true');
      expect(content).toContain('interior = true');
    });

    it('should include maxTextureSize when specified', async () => {
      await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        maxTextureSize: 4096,
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      expect(content).toContain('max_texture_size = 4096');
    });

    it('should include environment settings when specified', async () => {
      await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        environmentMode: 'custom_color',
        environmentColor: { r: 0.2, g: 0.3, b: 0.5 },
        environmentEnergy: 1.5,
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      expect(content).toContain('environment_mode = 3');
      expect(content).toContain('environment_custom_color = Color(0.2, 0.3, 0.5, 1)');
      expect(content).toContain('environment_custom_energy = 1.5');
    });

    it('should map all quality presets correctly', async () => {
      const qualityTests: [string, number][] = [
        ['low', 0],
        ['medium', 1],
        ['high', 2],
        ['ultra', 3],
      ];

      for (const [quality, expected] of qualityTests) {
        jest.clearAllMocks();
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(true);
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValue(MINIMAL_TSCN);
        mockWriteFile.mockResolvedValue(undefined);

        await handleSetupLightmapper({
          projectPath: '/path/to/project',
          scenePath: 'scenes/level.tscn',
          quality: quality as 'low',
        });

        const writeCall = mockWriteFile.mock.calls[0];
        const content = (writeCall as unknown[])[1] as string;
        expect(content).toContain(`quality = ${expected}`);
      }
    });
  });

  // ============================================================================
  // 6. Happy Path - Update existing node
  // ============================================================================
  describe('Happy Path - Update Existing Node', () => {
    beforeEach(() => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(TSCN_WITH_LIGHTMAP);
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should update existing LightmapGI node', async () => {
      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        quality: 'ultra',
        bounces: 8,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('updated');
      expect(result.content[0].text).toContain('Quality: ultra');
      expect(result.content[0].text).toContain('Bounces: 8');
    });

    it('should write updated properties', async () => {
      await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        quality: 'ultra',
        bounces: 8,
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      expect(content).toContain('quality = 3');
      expect(content).toContain('bounces = 8');
    });
  });

  // ============================================================================
  // 7. createNode=false behavior
  // ============================================================================
  describe('createNode=false', () => {
    beforeEach(() => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true);
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should skip if no existing node and createNode=false', async () => {
      mockReadFile.mockResolvedValue(MINIMAL_TSCN);

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        createNode: false,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('not found');
      expect(result.content[0].text).toContain('No changes made');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should still update if node exists and createNode=false', async () => {
      mockReadFile.mockResolvedValue(TSCN_WITH_LIGHTMAP);

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        createNode: false,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('updated');
    });
  });

  // ============================================================================
  // 8. Bake functionality
  // ============================================================================
  describe('Bake', () => {
    beforeEach(() => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(MINIMAL_TSCN);
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should attempt bake when bake=true', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecute.mockResolvedValue({ stdout: 'Baked OK', stderr: '' });

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bake: true,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Bake: completed');
      expect(mockExecute).toHaveBeenCalledWith(
        '/usr/bin/godot',
        expect.arrayContaining(['--headless', '--bake-lightmaps']),
        expect.objectContaining({ timeout: 300000 }),
      );
    });

    it('should warn when Godot executable not found for bake', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bake: true,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Bake skipped');
      expect(result.content[0].text).toContain('could not find Godot');
    });

    it('should warn when bake fails', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecute.mockRejectedValue(new Error('Timeout exceeded'));

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bake: true,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Bake failed');
      expect(result.content[0].text).toContain('Timeout exceeded');
    });

    it('should warn when bake stderr contains failure', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecute.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to bake: no meshes',
      });

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bake: true,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Bake warning');
    });

    it('should use custom bakeTimeout', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecute.mockResolvedValue({ stdout: 'OK', stderr: '' });

      await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
        bake: true,
        bakeTimeout: 600000,
      });

      expect(mockExecute).toHaveBeenCalledWith(
        '/usr/bin/godot',
        expect.any(Array),
        expect.objectContaining({ timeout: 600000 }),
      );
    });
  });

  // ============================================================================
  // 9. Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true);
    });

    it('should handle file read failure', async () => {
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Permission denied');
    });

    it('should handle file write failure', async () => {
      mockReadFile.mockResolvedValue(MINIMAL_TSCN);
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Disk full');
    });

    it('should handle non-Error thrown during execution', async () => {
      mockReadFile.mockRejectedValue('string error');

      const result = await handleSetupLightmapper({
        projectPath: '/path/to/project',
        scenePath: 'scenes/level.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error');
    });
  });
});
