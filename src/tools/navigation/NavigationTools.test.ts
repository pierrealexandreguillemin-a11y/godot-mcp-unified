/**
 * Navigation Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateNavigationRegion } from './CreateNavigationRegionTool';
import { handleBakeNavigationMesh } from './BakeNavigationMeshTool';

describe('Navigation Tools', () => {
  describe('CreateNavigationRegion', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateNavigationRegion({
        scenePath: 'scenes/main.tscn',
        nodeName: 'NavRegion',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when scenePath is missing', async () => {
      const result = await handleCreateNavigationRegion({
        projectPath: '/path/to/project',
        nodeName: 'NavRegion',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scenePath');
    });

    it('should return error when nodeName is missing', async () => {
      const result = await handleCreateNavigationRegion({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nodeName');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleCreateNavigationRegion({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'NavRegion',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('BakeNavigationMesh', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleBakeNavigationMesh({
        meshPath: 'navigation/nav_mesh.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when meshPath is missing', async () => {
      const result = await handleBakeNavigationMesh({
        projectPath: '/path/to/project',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('meshPath');
    });

    it('should return error for invalid mesh extension', async () => {
      const result = await handleBakeNavigationMesh({
        projectPath: '/non/existent/path',
        meshPath: 'navigation/nav_mesh.mesh',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('.tres');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleBakeNavigationMesh({
        projectPath: '/non/existent/path',
        meshPath: 'navigation/nav_mesh.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });
});
