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
 */

import { handleCreateShader } from './CreateShaderTool';
import { handleCreateShaderMaterial } from './CreateShaderMaterialTool';

describe('Shader Tools', () => {
  // ============================================================================
  // CreateShader Tests
  // ============================================================================
  describe('CreateShader', () => {
    describe('Input Validation - Missing Required Parameters', () => {
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
    });

    describe('Input Validation - Empty Values', () => {
      it('should return error for empty shaderPath', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: '',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderPath|cannot be empty|Validation failed/i);
      });

      it('should return error for empty projectPath', async () => {
        const result = await handleCreateShader({
          projectPath: '',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/projectPath|cannot be empty|Validation failed/i);
      });
    });

    describe('File Extension Validation', () => {
      it('should return error for invalid shader extension', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.shader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.gdshader');
      });

      it('should return error for .glsl extension', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.glsl',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.gdshader');
      });

      it('should return error for no extension', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.gdshader');
      });

      it('should return error for .txt extension', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.txt',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.gdshader');
      });

      it('should accept .gdshader extension', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        // Should fail on project validation, not extension
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Invalid Enum Values - shaderType', () => {
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

      it('should return error for empty shaderType', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: '' as 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderType|Validation failed/i);
      });

      it('should return error for misspelled shaderType', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spartial' as 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderType|Validation failed/i);
      });
    });

    describe('Valid Shader Types', () => {
      const validShaderTypes = ['spatial', 'canvas_item', 'particles', 'sky', 'fog'] as const;

      validShaderTypes.forEach((shaderType) => {
        it(`should accept valid shaderType: ${shaderType}`, async () => {
          const result = await handleCreateShader({
            projectPath: '/non/existent/path',
            shaderPath: 'shaders/test.gdshader',
            shaderType: shaderType,
          });
          expect(result.isError).toBe(true);
          // Should fail on project validation, not on shaderType
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });
    });

    describe('Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/../../../etc/passwd',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        // On Windows, path may be normalized; either path traversal error or invalid path is acceptable
        expect(result.content[0].text).toMatch(/path traversal|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in shaderPath', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: '../../../etc/passwd.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|\.\./i);
      });

      it('should return error for invalid project path', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - Render Mode', () => {
      it('should accept renderMode as empty array', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          renderMode: [],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept renderMode with single value', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          renderMode: ['unshaded'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept renderMode with multiple values', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          renderMode: ['unshaded', 'cull_disabled', 'depth_test_disabled'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - Shader Code', () => {
      it('should accept vertexCode parameter', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          vertexCode: 'VERTEX.y += sin(TIME);',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept fragmentCode parameter', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          fragmentCode: 'ALBEDO = vec3(1.0, 0.0, 0.0);',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept lightCode parameter', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          lightCode: 'DIFFUSE_LIGHT = LIGHT_COLOR * ATTENUATION;',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept all shader code parameters together', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          vertexCode: 'VERTEX.y += sin(TIME);',
          fragmentCode: 'ALBEDO = vec3(1.0, 0.0, 0.0);',
          lightCode: 'DIFFUSE_LIGHT = LIGHT_COLOR * ATTENUATION;',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept multiline vertexCode', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          vertexCode: `float wave = sin(TIME + VERTEX.x);
VERTEX.y += wave * 0.5;
VERTEX.z += cos(TIME) * 0.2;`,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept multiline fragmentCode', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          fragmentCode: `vec3 color = texture(TEXTURE, UV).rgb;
float luminance = dot(color, vec3(0.299, 0.587, 0.114));
ALBEDO = vec3(luminance);`,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - All Together', () => {
      it('should accept all optional parameters together', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/advanced.gdshader',
          shaderType: 'spatial',
          renderMode: ['unshaded', 'cull_disabled'],
          vertexCode: 'VERTEX.y += sin(TIME);',
          fragmentCode: 'ALBEDO = vec3(1.0, 0.0, 0.0);',
          lightCode: 'DIFFUSE_LIGHT = LIGHT_COLOR * ATTENUATION;',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Type Validation', () => {
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

      it('should return error for non-string vertexCode', async () => {
        const result = await handleCreateShader({
          projectPath: '/path/to/project',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          vertexCode: 123 as unknown as string,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/vertexCode|string|Validation failed/i);
      });
    });

    describe('Edge Cases', () => {
      it('should handle shaderPath with deeply nested directories', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'assets/shaders/effects/water/ripple.gdshader',
          shaderType: 'spatial',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle empty vertexCode string', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          vertexCode: '',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle empty fragmentCode string', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          fragmentCode: '',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle shader code with special characters', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          fragmentCode: 'ALBEDO = vec3(UV.x * 2.0 - 1.0, UV.y, (UV.x + UV.y) / 2.0);',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle shader code with comments', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/test.gdshader',
          shaderType: 'spatial',
          fragmentCode: `// This is a red shader
ALBEDO = vec3(1.0, 0.0, 0.0); // red color`,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Shader Type Specific Tests', () => {
      it('should accept canvas_item shader with appropriate render modes', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/ui.gdshader',
          shaderType: 'canvas_item',
          renderMode: ['blend_mix'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept particles shader', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/particles.gdshader',
          shaderType: 'particles',
          vertexCode: 'VELOCITY.y -= 9.8 * DELTA;',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept sky shader', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/sky.gdshader',
          shaderType: 'sky',
          fragmentCode: 'COLOR = vec3(0.4, 0.6, 0.9);',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept fog shader', async () => {
        const result = await handleCreateShader({
          projectPath: '/non/existent/path',
          shaderPath: 'shaders/fog.gdshader',
          shaderType: 'fog',
          fragmentCode: 'DENSITY = 0.1;',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });

  // ============================================================================
  // CreateShaderMaterial Tests
  // ============================================================================
  describe('CreateShaderMaterial', () => {
    describe('Input Validation - Missing Required Parameters', () => {
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
    });

    describe('Input Validation - Empty Values', () => {
      it('should return error for empty materialPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: '',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/materialPath|cannot be empty|Validation failed/i);
      });

      it('should return error for empty shaderPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: '',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderPath|cannot be empty|Validation failed/i);
      });

      it('should return error for empty projectPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/projectPath|cannot be empty|Validation failed/i);
      });
    });

    describe('File Extension Validation - materialPath', () => {
      it('should return error for invalid material extension', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.mat',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.tres');
      });

      it('should return error for .tscn extension', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tscn',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should return error for no extension', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should accept .tres extension', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        // Should fail on project validation, not extension
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept .res extension', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.res',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/../../../etc/passwd',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        // On Windows, path may be normalized; either path traversal error or invalid path is acceptable
        expect(result.content[0].text).toMatch(/path traversal|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in materialPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: '../../../etc/passwd.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|\.\./i);
      });

      it('should return error for path traversal in shaderPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: '../../../etc/passwd.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|\.\./i);
      });

      it('should return error for invalid project path', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - parameters', () => {
      it('should accept parameters as empty object', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {},
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parameters with number values', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            speed: 1.5,
            amplitude: 0.3,
            frequency: 2.0,
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parameters with boolean values', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            use_texture: true,
            invert: false,
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parameters with string values', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            texture_path: 'res://textures/albedo.png',
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parameters with Vector2 values', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            uv_offset: { x: 0.5, y: 0.5 },
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parameters with Vector3 values', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            direction: { x: 1.0, y: 0.0, z: 0.0 },
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parameters with Vector4 values', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            custom_vector: { x: 1.0, y: 2.0, z: 3.0, w: 4.0 },
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parameters with Color values', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            albedo_color: { r: 1.0, g: 0.5, b: 0.0 },
            emission_color: { r: 0.0, g: 1.0, b: 1.0, a: 0.5 },
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parameters with mixed value types', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
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
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Shader Path Format', () => {
      it('should accept shaderPath without res:// prefix', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept shaderPath with res:// prefix', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'res://shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Type Validation', () => {
      it('should return error for non-string materialPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 123 as unknown as string,
          shaderPath: 'shaders/test.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/materialPath|string|Validation failed/i);
      });

      it('should return error for non-string shaderPath', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 123 as unknown as string,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shaderPath|string|Validation failed/i);
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

      it('should return error for array parameters', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/path/to/project',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: [1, 2, 3] as unknown as Record<string, unknown>,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/parameters|object|Validation failed/i);
      });
    });

    describe('Edge Cases', () => {
      it('should handle materialPath with deeply nested directories', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'assets/materials/effects/water/ripple_mat.tres',
          shaderPath: 'shaders/water.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle shaderPath with deeply nested directories', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'assets/shaders/effects/water/ripple.gdshader',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle parameter with zero value', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            intensity: 0,
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle parameter with negative value', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            offset: -10.5,
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle parameter with very large value', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            scale: 1000000,
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle parameter with special characters in name', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            my_param_01: 1.0,
            'another-param': 2.0,
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle many parameters', async () => {
        const result = await handleCreateShaderMaterial({
          projectPath: '/non/existent/path',
          materialPath: 'materials/test.tres',
          shaderPath: 'shaders/test.gdshader',
          parameters: {
            param1: 1,
            param2: 2,
            param3: 3,
            param4: 4,
            param5: 5,
            param6: true,
            param7: false,
            param8: { x: 1, y: 2 },
            param9: { r: 1, g: 0, b: 0 },
            param10: 'value',
          },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });
});
