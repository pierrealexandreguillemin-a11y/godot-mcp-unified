/**
 * Lighting Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateLight } from './CreateLightTool';
import { handleSetupEnvironment } from './SetupEnvironmentTool';

describe('Lighting Tools', () => {
  describe('CreateLight', () => {
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

    it('should return error for invalid light type', async () => {
      const result = await handleCreateLight({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'Sun',
        lightType: 'invalid',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid light type');
    });

    it('should return error for invalid project path', async () => {
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

  describe('SetupEnvironment', () => {
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

    it('should return error for invalid environment extension', async () => {
      const result = await handleSetupEnvironment({
        projectPath: '/non/existent/path',
        environmentPath: 'environments/main_env.env',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('.tres');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleSetupEnvironment({
        projectPath: '/non/existent/path',
        environmentPath: 'environments/main_env.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });
});
