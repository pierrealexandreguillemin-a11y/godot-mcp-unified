/**
 * Particles Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateGPUParticles } from './CreateGPUParticlesTool';
import { handleCreateParticleMaterial } from './CreateParticleMaterialTool';

describe('Particles Tools', () => {
  describe('CreateGPUParticles', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateGPUParticles({
        scenePath: 'scenes/main.tscn',
        nodeName: 'Particles',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when scenePath is missing', async () => {
      const result = await handleCreateGPUParticles({
        projectPath: '/path/to/project',
        nodeName: 'Particles',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scenePath');
    });

    it('should return error when nodeName is missing', async () => {
      const result = await handleCreateGPUParticles({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nodeName');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleCreateGPUParticles({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'Particles',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('CreateParticleMaterial', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateParticleMaterial({
        materialPath: 'particles/fire_mat.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when materialPath is missing', async () => {
      const result = await handleCreateParticleMaterial({
        projectPath: '/path/to/project',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('materialPath');
    });

    it('should return error for invalid material extension', async () => {
      const result = await handleCreateParticleMaterial({
        projectPath: '/non/existent/path',
        materialPath: 'particles/fire_mat.mat',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('.tres');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleCreateParticleMaterial({
        projectPath: '/non/existent/path',
        materialPath: 'particles/fire_mat.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });
});
