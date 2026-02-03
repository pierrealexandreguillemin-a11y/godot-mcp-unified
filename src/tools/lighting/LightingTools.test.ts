/**
 * Lighting Tools Tests
 * ISO/IEC 29119 compliant - comprehensive test documentation
 * ISO/IEC 25010 compliant - strict testing
 *
 * Test Coverage Target: 80%+
 *
 * Test Categories (ISO 29119-4):
 * 1. Input Validation Tests (Zod schema validation)
 * 2. Missing Required Parameters Tests
 * 3. Invalid Enum Values Tests
 * 4. Path Security Tests
 * 5. Edge Case Tests
 * 6. File Extension Validation Tests
 * 7. Happy Path / Success Scenario Tests (with mocked dependencies)
 * 8. Error Handling Tests
 */

import { handleCreateLight } from './CreateLightTool';
import { handleSetupEnvironment } from './SetupEnvironmentTool';

// Mock dependencies for happy path tests
jest.mock('../../core/PathManager.js', () => ({
  detectGodotPath: jest.fn(),
  validatePath: jest.fn(),
  normalizeHandlerPaths: jest.fn((args: Record<string, unknown>) => args),
  normalizePath: jest.fn((p: string) => p),
}));

jest.mock('../../core/GodotExecutor.js', () => ({
  executeOperation: jest.fn(),
}));

jest.mock('../../core/ParameterNormalizer.js', () => ({
  normalizeParameters: jest.fn((args: Record<string, unknown>) => args),
  convertCamelToSnakeCase: jest.fn((s: string) => s),
}));

jest.mock('../../utils/Logger.js', () => ({
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock('../../utils/FileUtils.js', () => ({
  isGodotProject: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

import { detectGodotPath, validatePath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { isGodotProject } from '../../utils/FileUtils.js';
import { existsSync } from 'fs';
import * as fsExtra from 'fs-extra';

const mockedDetectGodotPath = detectGodotPath as jest.MockedFunction<typeof detectGodotPath>;
const mockedExecuteOperation = executeOperation as jest.MockedFunction<typeof executeOperation>;
const mockedValidatePath = validatePath as jest.MockedFunction<typeof validatePath>;
const mockedIsGodotProject = isGodotProject as jest.MockedFunction<typeof isGodotProject>;
const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockedEnsureDir = fsExtra.ensureDir as jest.MockedFunction<typeof fsExtra.ensureDir>;
const mockedWriteFile = fsExtra.writeFile as jest.MockedFunction<typeof fsExtra.writeFile>;

describe('Lighting Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CreateLight Tests
  // ============================================================================
  describe('CreateLight', () => {
    describe('Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateLight({
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when nodeName is missing', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('nodeName');
      });

      it('should return error when lightType is missing', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('lightType');
      });

      it('should return error when all required parameters are missing', async () => {
        const result = await handleCreateLight({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed/i);
      });

      it('should return error for empty nodeName', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: '',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/nodeName|cannot be empty|Validation failed/i);
      });

      it('should return error for invalid lightType', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'invalid',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed|Invalid|lightType/i);
      });

      it('should return error for lightType with wrong case', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'DIRECTIONAL_3D' as 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed|lightType/i);
      });

      it('should return error for non-string nodeName', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 123 as unknown as string,
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/nodeName|string|Validation failed/i);
      });

      it('should return error for non-number energy', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          energy: 'high' as unknown as number,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/energy|number|Validation failed/i);
      });

      it('should return error for non-boolean shadowEnabled', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          shadowEnabled: 'yes' as unknown as boolean,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shadowEnabled|boolean|Validation failed/i);
      });

      it('should return error for invalid color object', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          color: { red: 1.0, green: 0.9 } as unknown as { r: number; g: number; b: number },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/color|Validation failed/i);
      });
    });

    describe('Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        mockedValidatePath.mockReturnValue(false);
        const result = await handleCreateLight({
          projectPath: '/path/../../../etc/passwd',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for path traversal in scenePath', async () => {
        mockedValidatePath.mockReturnValueOnce(true);
        mockedIsGodotProject.mockReturnValue(true);
        mockedValidatePath.mockReturnValueOnce(false);
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for invalid project path', async () => {
        mockedValidatePath.mockReturnValue(true);
        mockedIsGodotProject.mockReturnValue(false);
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Happy Path', () => {
      beforeEach(() => {
        mockedValidatePath.mockReturnValue(true);
        mockedIsGodotProject.mockReturnValue(true);
        mockedExistsSync.mockReturnValue(true);
      });

      it('should create DirectionalLight3D successfully', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Light created successfully');
        expect(result.content[0].text).toContain('Sun');
        expect(result.content[0].text).toContain('DirectionalLight3D');
      });

      it('should create OmniLight3D successfully', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'PointLight',
          lightType: 'omni_3d',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('OmniLight3D');
      });

      it('should create SpotLight3D successfully', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Spot',
          lightType: 'spot_3d',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('SpotLight3D');
      });

      it('should create PointLight2D successfully', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Torch',
          lightType: 'point_2d',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('PointLight2D');
      });

      it('should create DirectionalLight2D successfully', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'DirLight2D',
          lightType: 'directional_2d',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('DirectionalLight2D');
      });

      it('should pass color parameter to operation', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          color: { r: 1.0, g: 0.9, b: 0.8 },
        });

        expect(mockedExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            color: { r: 1.0, g: 0.9, b: 0.8 },
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass energy parameter to operation', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          energy: 2.5,
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Energy: 2.5');

        expect(mockedExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            energy: 2.5,
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass range parameter to operation', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'OmniLight',
          lightType: 'omni_3d',
          range: 10.0,
        });

        expect(mockedExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            range: 10.0,
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass spotAngle parameter to operation', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Spot',
          lightType: 'spot_3d',
          spotAngle: 45.0,
        });

        expect(mockedExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            spot_angle: 45.0,
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass shadowEnabled parameter to operation', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          shadowEnabled: true,
        });

        expect(mockedExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            shadow_enabled: true,
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass texturePath parameter to operation', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'PointLight',
          lightType: 'point_2d',
          texturePath: 'textures/light_gradient.png',
        });

        expect(mockedExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            texture_path: 'textures/light_gradient.png',
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass all optional parameters together', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'SpotLight',
          lightType: 'spot_3d',
          parentNodePath: 'World/Lighting',
          color: { r: 1.0, g: 0.95, b: 0.9 },
          energy: 2.0,
          range: 15.0,
          spotAngle: 30.0,
          shadowEnabled: true,
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('SpotLight3D');
        expect(result.content[0].text).toContain('Energy: 2');
      });

      it('should return error when godotPath is not found', async () => {
        mockedDetectGodotPath.mockResolvedValue(null);

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Could not find a valid Godot executable path');
      });

      it('should return error when stderr contains failure message', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({
          stdout: '',
          stderr: 'Failed to create light: parent node not found',
        });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create light');
      });

      it('should display default energy when none specified', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Energy: 1');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockedValidatePath.mockReturnValue(true);
        mockedIsGodotProject.mockReturnValue(true);
        mockedExistsSync.mockReturnValue(true);
      });

      it('should handle Error thrown during execution', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockRejectedValue(new Error('Process failed'));

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create light');
        expect(result.content[0].text).toContain('Process failed');
      });

      it('should handle non-Error thrown during execution', async () => {
        mockedDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockedExecuteOperation.mockRejectedValue('unexpected');

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unknown error');
      });

      it('should handle detectGodotPath rejection', async () => {
        mockedDetectGodotPath.mockRejectedValue(new Error('Detection error'));

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Detection error');
      });
    });
  });

  // ============================================================================
  // SetupEnvironment Tests
  // ============================================================================
  describe('SetupEnvironment', () => {
    describe('Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleSetupEnvironment({
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when environmentPath is missing', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('environmentPath');
      });

      it('should return error when all required parameters are missing', async () => {
        const result = await handleSetupEnvironment({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed/i);
      });

      it('should return error for invalid extension (.env)', async () => {
        mockedValidatePath.mockReturnValue(true);
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.env',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.tres');
      });

      it('should return error for .tscn extension', async () => {
        mockedValidatePath.mockReturnValue(true);
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tscn',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should return error for no extension', async () => {
        mockedValidatePath.mockReturnValue(true);
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should return error for non-string environmentPath', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 123 as unknown as string,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/environmentPath|string|Validation failed/i);
      });

      it('should return error for non-boolean glowEnabled', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          glowEnabled: 'true' as unknown as boolean,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/glowEnabled|boolean|Validation failed/i);
      });

      it('should return error for non-number fogDensity', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          fogDensity: 'thick' as unknown as number,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/fogDensity|number|Validation failed/i);
      });

      it('should return error for invalid backgroundMode', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          backgroundMode: 'invalid_mode' as 'clear_color',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/backgroundMode|Validation failed/i);
      });

      it('should return error for invalid tonemapMode', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          tonemapMode: 'invalid_tonemap' as 'linear',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/tonemapMode|Validation failed/i);
      });

      it('should return error for invalid color object in backgroundColor', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          backgroundColor: { red: 0.5, blue: 0.5 } as unknown as { r: number; g: number; b: number },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/backgroundColor|Validation failed/i);
      });
    });

    describe('Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        mockedValidatePath.mockReturnValue(false);
        const result = await handleSetupEnvironment({
          projectPath: '/path/../../../etc/passwd',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for invalid project path', async () => {
        mockedValidatePath.mockReturnValue(true);
        mockedIsGodotProject.mockReturnValue(false);
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Happy Path', () => {
      beforeEach(() => {
        mockedValidatePath.mockReturnValue(true);
        mockedIsGodotProject.mockReturnValue(true);
        (fsExtra.ensureDir as jest.Mock).mockResolvedValue(undefined);
        (fsExtra.writeFile as jest.Mock).mockResolvedValue(undefined);
      });

      it('should create basic environment successfully', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Environment created successfully');
        expect(result.content[0].text).toContain('environments/main_env.tres');
        expect(result.content[0].text).toContain('clear_color');
        expect(result.content[0].text).toContain('Features: None');
      });

      it('should accept .res extension', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.res',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Environment created successfully');
      });

      it('should write environment file with backgroundMode', async () => {
        await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          backgroundMode: 'sky',
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('background_mode = 2');
      });

      it('should write environment file with backgroundColor', async () => {
        await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          backgroundColor: { r: 0.2, g: 0.3, b: 0.4 },
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('background_color = Color(0.2, 0.3, 0.4, 1)');
      });

      it('should write environment file with ambientLightColor', async () => {
        await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          ambientLightColor: { r: 0.5, g: 0.5, b: 0.5 },
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('ambient_light_color = Color(0.5, 0.5, 0.5, 1)');
      });

      it('should write environment file with ambientLightEnergy', async () => {
        await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          ambientLightEnergy: 1.5,
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('ambient_light_energy = 1.5');
      });

      it('should write environment file with tonemapMode', async () => {
        await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          tonemapMode: 'aces',
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('tonemap_mode = 3');
      });

      it('should write environment file with glow settings', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          glowEnabled: true,
          glowIntensity: 0.8,
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('glow_enabled = true');
        expect(content).toContain('glow_intensity = 0.8');
        expect(result.content[0].text).toContain('Glow');
      });

      it('should write environment file with fog settings', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          fogEnabled: true,
          fogDensity: 0.05,
          fogColor: { r: 0.8, g: 0.8, b: 0.9 },
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('fog_enabled = true');
        expect(content).toContain('fog_density = 0.05');
        expect(content).toContain('fog_light_color = Color(0.8, 0.8, 0.9, 1)');
        expect(result.content[0].text).toContain('Fog');
      });

      it('should write environment file with SSAO enabled', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          ssaoEnabled: true,
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('ssao_enabled = true');
        expect(result.content[0].text).toContain('SSAO');
      });

      it('should write environment file with SSR enabled', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          ssrEnabled: true,
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('ssr_enabled = true');
        expect(result.content[0].text).toContain('SSR');
      });

      it('should write environment file with SDFGI enabled', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          sdfgiEnabled: true,
        });

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('sdfgi_enabled = true');
        expect(result.content[0].text).toContain('SDFGI');
      });

      it('should write all features and display them in response', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/full_env.tres',
          backgroundMode: 'sky',
          backgroundColor: { r: 0.2, g: 0.3, b: 0.5 },
          ambientLightColor: { r: 0.4, g: 0.4, b: 0.5 },
          ambientLightEnergy: 1.2,
          tonemapMode: 'aces',
          glowEnabled: true,
          glowIntensity: 0.7,
          fogEnabled: true,
          fogDensity: 0.02,
          fogColor: { r: 0.6, g: 0.6, b: 0.7 },
          ssaoEnabled: true,
          ssrEnabled: true,
          sdfgiEnabled: true,
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('sky');
        expect(result.content[0].text).toContain('Glow');
        expect(result.content[0].text).toContain('Fog');
        expect(result.content[0].text).toContain('SSAO');
        expect(result.content[0].text).toContain('SSR');
        expect(result.content[0].text).toContain('SDFGI');

        // Verify content has all expected lines
        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('[gd_resource type="Environment" format=3]');
        expect(content).toContain('[resource]');
        expect(content).toContain('background_mode = 2');
        expect(content).toContain('background_color = Color(0.2, 0.3, 0.5, 1)');
        expect(content).toContain('ambient_light_color = Color(0.4, 0.4, 0.5, 1)');
        expect(content).toContain('ambient_light_energy = 1.2');
        expect(content).toContain('tonemap_mode = 3');
        expect(content).toContain('glow_enabled = true');
        expect(content).toContain('glow_intensity = 0.7');
        expect(content).toContain('fog_enabled = true');
        expect(content).toContain('fog_density = 0.02');
        expect(content).toContain('fog_light_color = Color(0.6, 0.6, 0.7, 1)');
        expect(content).toContain('ssao_enabled = true');
        expect(content).toContain('ssr_enabled = true');
        expect(content).toContain('sdfgi_enabled = true');
      });

      it('should call ensureDir and writeFile with correct paths', async () => {
        await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
        });

        expect(fsExtra.ensureDir).toHaveBeenCalled();
        expect(fsExtra.writeFile).toHaveBeenCalled();

        const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
        expect(writeCall[2]).toBe('utf-8');
      });

      it('should map all background modes correctly', async () => {
        const modeMap: Record<string, number> = {
          clear_color: 0,
          custom_color: 1,
          sky: 2,
          canvas: 3,
          keep: 4,
          camera_feed: 5,
        };

        for (const [mode, expectedValue] of Object.entries(modeMap)) {
          jest.clearAllMocks();
          mockedValidatePath.mockReturnValue(true);
          mockedIsGodotProject.mockReturnValue(true);
          (fsExtra.ensureDir as jest.Mock).mockResolvedValue(undefined);
          (fsExtra.writeFile as jest.Mock).mockResolvedValue(undefined);

          await handleSetupEnvironment({
            projectPath: '/path/to/project',
            environmentPath: 'environments/test.tres',
            backgroundMode: mode as 'clear_color',
          });

          const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
          const content = writeCall[1] as string;
          expect(content).toContain(`background_mode = ${expectedValue}`);
        }
      });

      it('should map all tonemap modes correctly', async () => {
        const modeMap: Record<string, number> = {
          linear: 0,
          reinhard: 1,
          filmic: 2,
          aces: 3,
        };

        for (const [mode, expectedValue] of Object.entries(modeMap)) {
          jest.clearAllMocks();
          mockedValidatePath.mockReturnValue(true);
          mockedIsGodotProject.mockReturnValue(true);
          (fsExtra.ensureDir as jest.Mock).mockResolvedValue(undefined);
          (fsExtra.writeFile as jest.Mock).mockResolvedValue(undefined);

          await handleSetupEnvironment({
            projectPath: '/path/to/project',
            environmentPath: 'environments/test.tres',
            tonemapMode: mode as 'linear',
          });

          const writeCall = (fsExtra.writeFile as jest.Mock).mock.calls[0];
          const content = writeCall[1] as string;
          expect(content).toContain(`tonemap_mode = ${expectedValue}`);
        }
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockedValidatePath.mockReturnValue(true);
        mockedIsGodotProject.mockReturnValue(true);
      });

      it('should handle fs.ensureDir failure', async () => {
        (fsExtra.ensureDir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create environment');
        expect(result.content[0].text).toContain('Permission denied');
      });

      it('should handle fs.writeFile failure', async () => {
        (fsExtra.ensureDir as jest.Mock).mockResolvedValue(undefined);
        (fsExtra.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create environment');
        expect(result.content[0].text).toContain('Disk full');
      });

      it('should handle non-Error thrown during execution', async () => {
        (fsExtra.ensureDir as jest.Mock).mockRejectedValue('string error');

        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unknown error');
      });
    });
  });
});
