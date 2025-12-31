/**
 * Shader Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateShader } from './CreateShaderTool';
import { handleCreateShaderMaterial } from './CreateShaderMaterialTool';

describe('Shader Tools', () => {
  describe('CreateShader', () => {
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

    it('should return error for invalid shader extension', async () => {
      const result = await handleCreateShader({
        projectPath: '/non/existent/path',
        shaderPath: 'shaders/test.shader',
        shaderType: 'spatial',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('.gdshader');
    });

    it('should return error for invalid shader type', async () => {
      const result = await handleCreateShader({
        projectPath: '/non/existent/path',
        shaderPath: 'shaders/test.gdshader',
        shaderType: 'invalid',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid shader type');
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

  describe('CreateShaderMaterial', () => {
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

    it('should return error for invalid material extension', async () => {
      const result = await handleCreateShaderMaterial({
        projectPath: '/non/existent/path',
        materialPath: 'materials/test.mat',
        shaderPath: 'shaders/test.gdshader',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('.tres');
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
});
