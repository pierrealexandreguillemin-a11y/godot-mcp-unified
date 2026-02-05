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

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock functions with proper types
const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
const mockValidatePath = jest.fn<(p: string) => boolean>();
const mockNormalizeHandlerPaths = jest.fn<(args: Record<string, unknown>) => Record<string, unknown>>();
const mockNormalizePath = jest.fn<(p: string) => string>();
const mockExecuteOperation = jest.fn<(op: string, params: Record<string, unknown>, projectPath: string, godotPath: string) => Promise<{ stdout: string; stderr: string }>>();
const mockNormalizeParameters = jest.fn<(args: Record<string, unknown>) => Record<string, unknown>>();
const mockConvertCamelToSnakeCase = jest.fn<(s: string) => string>();
const mockLogDebug = jest.fn();
const mockLogError = jest.fn();
const mockLogInfo = jest.fn();
const mockLogWarn = jest.fn();
const mockIsGodotProject = jest.fn<(p: string) => boolean>();
const mockExistsSync = jest.fn<(p: string) => boolean>();
const mockEnsureDir = jest.fn<() => Promise<void>>();
const mockWriteFile = jest.fn<() => Promise<void>>();

// Mock all dependencies using unstable_mockModule for ESM
jest.unstable_mockModule('../../core/PathManager.js', () => ({
  detectGodotPath: mockDetectGodotPath,
  validatePath: mockValidatePath,
  normalizeHandlerPaths: mockNormalizeHandlerPaths.mockImplementation((args) => args),
  normalizePath: mockNormalizePath.mockImplementation((p) => p),
}));

jest.unstable_mockModule('../../core/GodotExecutor.js', () => ({
  executeOperation: mockExecuteOperation,
}));

jest.unstable_mockModule('../../core/ParameterNormalizer.js', () => ({
  normalizeParameters: mockNormalizeParameters.mockImplementation((args) => args),
  convertCamelToSnakeCase: mockConvertCamelToSnakeCase.mockImplementation((s) => s),
}));

jest.unstable_mockModule('../../utils/Logger.js', () => ({
  logDebug: mockLogDebug,
  logError: mockLogError,
  logInfo: mockLogInfo,
  logWarn: mockLogWarn,
}));

// Mock BridgeExecutor to always use fallback (no bridge connected)
jest.unstable_mockModule('../../bridge/BridgeExecutor.js', () => ({
  executeWithBridge: async (
    _action: string,
    _params: Record<string, unknown>,
    fallback: () => Promise<unknown>,
  ) => fallback(),
}));

jest.unstable_mockModule('../../utils/FileUtils.js', () => ({
  isGodotProject: mockIsGodotProject,
}));

jest.unstable_mockModule('fs', () => ({
  existsSync: mockExistsSync,
}));

jest.unstable_mockModule('fs-extra', () => ({
  default: {
    ensureDir: mockEnsureDir,
    writeFile: mockWriteFile,
  },
  ensureDir: mockEnsureDir,
  writeFile: mockWriteFile,
}));

// Dynamic imports after mocks are set up
const { handleCreateLight } = await import('./CreateLightTool.js');
const { handleSetupEnvironment } = await import('./SetupEnvironmentTool.js');

describe('Lighting Tools', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Reset default implementations
    mockNormalizeHandlerPaths.mockImplementation((args) => args);
    mockNormalizePath.mockImplementation((p) => p);
    mockNormalizeParameters.mockImplementation((args) => args);
    mockConvertCamelToSnakeCase.mockImplementation((s) => s);
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
        mockValidatePath.mockReturnValue(false);
        const result = await handleCreateLight({
          projectPath: '/path/../../../etc/passwd',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for path traversal in scenePath', async () => {
        mockValidatePath.mockReturnValueOnce(true);
        mockIsGodotProject.mockReturnValue(true);
        mockValidatePath.mockReturnValueOnce(false);
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for invalid project path', async () => {
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(false);
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
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(true);
        mockExistsSync.mockReturnValue(true);
      });

      it('should create DirectionalLight3D successfully', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

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
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

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
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

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
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

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
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Light created', stderr: '' });

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
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          color: { r: 1.0, g: 0.9, b: 0.8 },
        });

        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            color: { r: 1.0, g: 0.9, b: 0.8 },
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass energy parameter to operation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          energy: 2.5,
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Energy: 2.5');

        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            energy: 2.5,
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass range parameter to operation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'OmniLight',
          lightType: 'omni_3d',
          range: 10.0,
        });

        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            range: 10.0,
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass spotAngle parameter to operation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Spot',
          lightType: 'spot_3d',
          spotAngle: 45.0,
        });

        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            spot_angle: 45.0,
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass shadowEnabled parameter to operation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          shadowEnabled: true,
        });

        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            shadow_enabled: true,
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass texturePath parameter to operation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'PointLight',
          lightType: 'point_2d',
          texturePath: 'textures/light_gradient.png',
        });

        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'create_light',
          expect.objectContaining({
            texture_path: 'textures/light_gradient.png',
          }),
          '/path/to/project',
          '/usr/bin/godot',
        );
      });

      it('should pass all optional parameters together', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

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
        mockDetectGodotPath.mockResolvedValue(null);

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
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({
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
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

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
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(true);
        mockExistsSync.mockReturnValue(true);
      });

      it('should handle Error thrown during execution', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockRejectedValue(new Error('Process failed'));

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
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockRejectedValue('unexpected');

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
        mockDetectGodotPath.mockRejectedValue(new Error('Detection error'));

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
        mockValidatePath.mockReturnValue(true);
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.env',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.tres');
      });

      it('should return error for .tscn extension', async () => {
        mockValidatePath.mockReturnValue(true);
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tscn',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should return error for no extension', async () => {
        mockValidatePath.mockReturnValue(true);
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
        mockValidatePath.mockReturnValue(false);
        const result = await handleSetupEnvironment({
          projectPath: '/path/../../../etc/passwd',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for invalid project path', async () => {
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(false);
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
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(true);
        mockEnsureDir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
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

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('background_mode = 2');
      });

      it('should write environment file with backgroundColor', async () => {
        await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          backgroundColor: { r: 0.2, g: 0.3, b: 0.4 },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('background_color = Color(0.2, 0.3, 0.4, 1)');
      });

      it('should write environment file with glow settings', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          glowEnabled: true,
          glowIntensity: 0.8,
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
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

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
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

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
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

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
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

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('sdfgi_enabled = true');
        expect(result.content[0].text).toContain('SDFGI');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(true);
      });

      it('should handle fs.ensureDir failure', async () => {
        mockEnsureDir.mockRejectedValue(new Error('Permission denied'));

        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create environment');
        expect(result.content[0].text).toContain('Permission denied');
      });

      it('should handle fs.writeFile failure', async () => {
        mockEnsureDir.mockResolvedValue(undefined);
        mockWriteFile.mockRejectedValue(new Error('Disk full'));

        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create environment');
        expect(result.content[0].text).toContain('Disk full');
      });

      it('should handle non-Error thrown during execution', async () => {
        mockEnsureDir.mockRejectedValue('string error');

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
