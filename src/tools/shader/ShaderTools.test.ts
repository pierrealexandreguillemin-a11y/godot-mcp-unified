/**
 * Shader Tools Tests
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
 * 5. File Extension Validation Tests
 * 6. Edge Case Tests
 * 7. Happy Path / Success Scenario Tests (with mocked dependencies)
 * 8. Error Handling Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock functions with proper types BEFORE mock module declarations
const mockDetectGodotPath = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockValidatePath = jest.fn<(...args: unknown[]) => boolean>();
const mockNormalizeHandlerPaths = jest.fn((args: Record<string, unknown>) => args);
const mockNormalizePath = jest.fn((p: string) => p);
const mockNormalizeParameters = jest.fn((args: Record<string, unknown>) => args);
const mockConvertCamelToSnakeCase = jest.fn((s: string) => s);
const mockLogDebug = jest.fn();
const mockLogError = jest.fn();
const mockLogInfo = jest.fn();
const mockIsGodotProject = jest.fn<(...args: unknown[]) => boolean>();
const mockExistsSync = jest.fn<(...args: unknown[]) => boolean>();
const mockEnsureDir = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockWriteFile = jest.fn<(...args: unknown[]) => Promise<void>>();

// Mock all dependencies using unstable_mockModule for ESM
jest.unstable_mockModule('../../core/PathManager.js', () => ({
  detectGodotPath: mockDetectGodotPath,
  validatePath: mockValidatePath,
  normalizeHandlerPaths: mockNormalizeHandlerPaths,
  normalizePath: mockNormalizePath,
}));

jest.unstable_mockModule('../../core/ParameterNormalizer.js', () => ({
  normalizeParameters: mockNormalizeParameters,
  convertCamelToSnakeCase: mockConvertCamelToSnakeCase,
}));

jest.unstable_mockModule('../../utils/Logger.js', () => ({
  logDebug: mockLogDebug,
  logError: mockLogError,
  logInfo: mockLogInfo,
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

// Dynamic imports AFTER mocks are set up
const { handleCreateShader } = await import('./CreateShaderTool.js');
const { handleCreateShaderMaterial } = await import('./CreateShaderMaterialTool.js');

describe('Shader Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CreateShader Tests
  // ============================================================================
  describe('CreateShader', () => {
    describe('Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateShader({
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when shaderPath is missing', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('shaderPath');
      });

      it('should return error when shaderType is missing', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('shaderType');
      });

      it('should return error when all required parameters are missing', async () => {
        const result = await handleCreateShader({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed/i);
      });

      it('should return error for empty shaderPath', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: '',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderPath|cannot be empty|Validation failed/i);
      });

      it('should return error for invalid shader extension (.shader)', async () => {
        mockValidatePath.mockReturnValue(true);
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.shader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.gdshader');
      });

      it('should return error for .glsl extension', async () => {
        mockValidatePath.mockReturnValue(true);
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.glsl',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.gdshader');
      });

      it('should return error for no extension', async () => {
        mockValidatePath.mockReturnValue(true);
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.gdshader');
      });

      it('should return error for invalid shaderType', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'invalid',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderType|Validation failed/i);
      });

      it('should return error for shaderType with wrong case', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'SPATIAL' as 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderType|Validation failed/i);
      });

      it('should return error for non-string shaderPath', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 123 as unknown as string,
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderPath|string|Validation failed/i);
      });

      it('should return error for non-array renderMode', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          renderMode: 'unshaded' as unknown as string[],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/renderMode|array|Validation failed/i);
      });
    });

    describe('Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        mockValidatePath.mockReturnValue(false);
        const result = await handleCreateShader({
          projectPath: '/path/../../../etc/passwd',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for invalid project path', async () => {
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(false);
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
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

      it('should create basic spatial shader successfully', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Shader created successfully');
        expect(result.content[0].text).toContain('shaders/test.gdshader');
        expect(result.content[0].text).toContain('spatial');
      });

      it('should write shader_type line in file', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_type spatial;');
      });

      it('should create canvas_item shader', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/ui.gdshader',
          shaderType: 'canvas_item',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('canvas_item');

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_type canvas_item;');
      });

      it('should create particles shader', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/particles.gdshader',
          shaderType: 'particles',
        });
        expect(result.isError).toBeUndefined();

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_type particles;');
      });

      it('should create sky shader', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/sky.gdshader',
          shaderType: 'sky',
        });
        expect(result.isError).toBeUndefined();

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_type sky;');
      });

      it('should create fog shader', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/fog.gdshader',
          shaderType: 'fog',
        });
        expect(result.isError).toBeUndefined();

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_type fog;');
      });

      it('should include render_mode when provided', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          renderMode: ['unshaded', 'cull_disabled'],
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('render_mode unshaded, cull_disabled;');
      });

      it('should not include render_mode when array is empty', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          renderMode: [],
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).not.toContain('render_mode');
      });

      it('should include vertex function when vertexCode is provided', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          vertexCode: 'VERTEX.y += sin(TIME);',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('void vertex() {');
        expect(content).toContain('VERTEX.y += sin(TIME);');
        expect(content).toContain('}');
      });

      it('should include fragment function when fragmentCode is provided', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          fragmentCode: 'ALBEDO = vec3(1.0, 0.0, 0.0);',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('void fragment() {');
        expect(content).toContain('ALBEDO = vec3(1.0, 0.0, 0.0);');
        expect(content).toContain('}');
      });

      it('should include light function when lightCode is provided', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          lightCode: 'DIFFUSE_LIGHT = LIGHT_COLOR * ATTENUATION;',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('void light() {');
        expect(content).toContain('DIFFUSE_LIGHT = LIGHT_COLOR * ATTENUATION;');
        expect(content).toContain('}');
      });

      it('should include all code sections when provided together', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/full.gdshader',
          shaderType: 'spatial',
          renderMode: ['unshaded'],
          vertexCode: 'VERTEX.y += sin(TIME);',
          fragmentCode: 'ALBEDO = vec3(1.0, 0.0, 0.0);',
          lightCode: 'DIFFUSE_LIGHT = LIGHT_COLOR;',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_type spatial;');
        expect(content).toContain('render_mode unshaded;');
        expect(content).toContain('void vertex()');
        expect(content).toContain('void fragment()');
        expect(content).toContain('void light()');
      });

      it('should handle multiline vertexCode', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          vertexCode: 'float wave = sin(TIME);\nVERTEX.y += wave;',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('void vertex()');
        expect(content).toContain('float wave = sin(TIME);');
        expect(content).toContain('VERTEX.y += wave;');
      });

      it('should handle multiline fragmentCode', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          fragmentCode: 'vec3 color = vec3(1.0);\nALBEDO = color;',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('void fragment()');
        expect(content).toContain('vec3 color = vec3(1.0);');
        expect(content).toContain('ALBEDO = color;');
      });

      it('should call ensureDir and writeFile with correct args', async () => {
        await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });

        expect(mockEnsureDir).toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalled();

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        expect(writeCall[2]).toBe('utf-8');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(true);
      });

      it('should handle fs.ensureDir failure', async () => {
        mockEnsureDir.mockRejectedValue(new Error('Permission denied'));

        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create shader');
        expect(result.content[0].text).toContain('Permission denied');
      });

      it('should handle fs.writeFile failure', async () => {
        mockEnsureDir.mockResolvedValue(undefined);
        mockWriteFile.mockRejectedValue(new Error('Disk full'));

        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create shader');
        expect(result.content[0].text).toContain('Disk full');
      });

      it('should handle non-Error thrown during execution', async () => {
        mockEnsureDir.mockRejectedValue('some error');

        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unknown error');
      });
    });
  });

  // ============================================================================
  // CreateShaderMaterial Tests
  // ============================================================================
  describe('CreateShaderMaterial', () => {
    describe('Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateShaderMaterial({
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when materialPath is missing', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('materialPath');
      });

      it('should return error when shaderPath is missing', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('shaderPath');
      });

      it('should return error when all required parameters are missing', async () => {
        const result = await handleCreateShaderMaterial({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed/i);
      });

      it('should return error for invalid material extension (.mat)', async () => {
        mockValidatePath.mockReturnValue(true);
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.mat',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.tres');
      });

      it('should return error for .tscn extension on materialPath', async () => {
        mockValidatePath.mockReturnValue(true);
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tscn',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should return error for no extension on materialPath', async () => {
        mockValidatePath.mockReturnValue(true);
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should return error for non-string materialPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 123 as unknown as string,
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/materialPath|string|Validation failed/i);
      });

      it('should return error for non-object parameters', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: 'invalid' as unknown as Record<string, unknown>,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/parameters|object|Validation failed/i);
      });
    });

    describe('Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        mockValidatePath.mockReturnValue(false);
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/../../../etc/passwd',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for invalid project path', async () => {
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(false);
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
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

      it('should create basic shader material successfully', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('ShaderMaterial created successfully');
        expect(result.content[0].text).toContain('materials/test.tres');
        expect(result.content[0].text).toContain('shaders/test.gdshader');
      });

      it('should accept .res extension for materialPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.res',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('ShaderMaterial created successfully');
      });

      it('should write ShaderMaterial resource content', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('[gd_resource type="ShaderMaterial" load_steps=2 format=3]');
        expect(content).toContain('[ext_resource type="Shader" path="res://shaders/test.gdshader" id="1"]');
        expect(content).toContain('[resource]');
        expect(content).toContain('shader = ExtResource("1")');
      });

      it('should handle shaderPath that already has res:// prefix', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'res://shaders/test.gdshader',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        // Should NOT double the res:// prefix
        expect(content).toContain('path="res://shaders/test.gdshader"');
        expect(content).not.toContain('res://res://');
      });

      it('should write number parameters correctly', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            speed: 1.5,
            amplitude: 0.3,
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/speed = 1.5');
        expect(content).toContain('shader_parameter/amplitude = 0.3');
      });

      it('should write boolean parameters correctly', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            use_texture: true,
            invert: false,
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/use_texture = true');
        expect(content).toContain('shader_parameter/invert = false');
      });

      it('should write string parameters correctly', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            texture_path: 'res://textures/albedo.png',
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/texture_path = "res://textures/albedo.png"');
      });

      it('should write Vector2 parameters correctly', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            uv_offset: { x: 0.5, y: 0.5 },
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/uv_offset = Vector2(0.5, 0.5)');
      });

      it('should write Vector3 parameters correctly', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            direction: { x: 1.0, y: 0.0, z: 0.0 },
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/direction = Vector3(1, 0, 0)');
      });

      it('should write Vector4 parameters correctly', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            custom_vector: { x: 1.0, y: 2.0, z: 3.0, w: 4.0 },
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/custom_vector = Vector4(1, 2, 3, 4)');
      });

      it('should write Color parameters correctly (without alpha)', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            albedo_color: { r: 1.0, g: 0.5, b: 0.0 },
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/albedo_color = Color(1, 0.5, 0, 1)');
      });

      it('should write Color parameters correctly (with alpha)', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            emission_color: { r: 0.0, g: 1.0, b: 1.0, a: 0.5 },
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/emission_color = Color(0, 1, 1, 0.5)');
      });

      it('should handle mixed parameter types', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            speed: 1.5,
            use_texture: true,
            uv_scale: { x: 2.0, y: 2.0 },
            color: { r: 1.0, g: 0.8, b: 0.6 },
            name: 'my_shader',
          },
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).toContain('shader_parameter/speed = 1.5');
        expect(content).toContain('shader_parameter/use_texture = true');
        expect(content).toContain('shader_parameter/uv_scale = Vector2(2, 2)');
        expect(content).toContain('shader_parameter/color = Color(1, 0.8, 0.6, 1)');
        expect(content).toContain('shader_parameter/name = "my_shader"');
      });

      it('should not write parameters section when no parameters provided', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).not.toContain('shader_parameter/');
      });

      it('should not write parameters section when empty object', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {},
        });

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        const content = writeCall[1] as string;
        expect(content).not.toContain('shader_parameter/');
      });

      it('should call ensureDir and writeFile with correct args', async () => {
        await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });

        expect(mockEnsureDir).toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalled();

        const writeCall = mockWriteFile.mock.calls[0] as unknown[];
        expect(writeCall[2]).toBe('utf-8');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockValidatePath.mockReturnValue(true);
        mockIsGodotProject.mockReturnValue(true);
      });

      it('should handle fs.ensureDir failure', async () => {
        mockEnsureDir.mockRejectedValue(new Error('Permission denied'));

        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create shader material');
        expect(result.content[0].text).toContain('Permission denied');
      });

      it('should handle fs.writeFile failure', async () => {
        mockEnsureDir.mockResolvedValue(undefined);
        mockWriteFile.mockRejectedValue(new Error('Disk full'));

        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to create shader material');
        expect(result.content[0].text).toContain('Disk full');
      });

      it('should handle non-Error thrown during execution', async () => {
        mockEnsureDir.mockRejectedValue(undefined);

        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unknown error');
      });
    });
  });
});
