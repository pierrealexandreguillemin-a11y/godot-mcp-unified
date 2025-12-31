/**
 * Physics Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateCollisionShape } from './CreateCollisionShapeTool';
import { handleSetupRigidBody } from './SetupRigidBodyTool';
import { handleConfigurePhysicsLayers } from './ConfigurePhysicsLayersTool';

describe('Physics Tools', () => {
  describe('CreateCollisionShape', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateCollisionShape({
        scenePath: 'scenes/main.tscn',
        nodeName: 'Collision',
        parentNodePath: 'Player',
        shapeType: 'rectangle',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when shapeType is missing', async () => {
      const result = await handleCreateCollisionShape({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        nodeName: 'Collision',
        parentNodePath: 'Player',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('shapeType');
    });

    it('should return error for invalid 2D shape type', async () => {
      const result = await handleCreateCollisionShape({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'Collision',
        parentNodePath: 'Player',
        shapeType: 'box', // 3D shape for 2D
        is3D: false,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid 2D shape');
    });

    it('should return error for invalid 3D shape type', async () => {
      const result = await handleCreateCollisionShape({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'Collision',
        parentNodePath: 'Player',
        shapeType: 'rectangle', // 2D shape for 3D
        is3D: true,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid 3D shape');
    });
  });

  describe('SetupRigidBody', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleSetupRigidBody({
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when nodePath is missing', async () => {
      const result = await handleSetupRigidBody({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nodePath');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleSetupRigidBody({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodePath: 'Player',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('ConfigurePhysicsLayers', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleConfigurePhysicsLayers({
        dimension: '2d',
        layers: [{ layer: 1, name: 'Player' }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when dimension is missing', async () => {
      const result = await handleConfigurePhysicsLayers({
        projectPath: '/path/to/project',
        layers: [{ layer: 1, name: 'Player' }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('dimension');
    });

    it('should return error for empty layers array', async () => {
      const result = await handleConfigurePhysicsLayers({
        projectPath: '/non/existent/path',
        dimension: '2d',
        layers: [],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('non-empty array');
    });

    it('should return error for invalid layer number', async () => {
      const result = await handleConfigurePhysicsLayers({
        projectPath: '/non/existent/path',
        dimension: '2d',
        layers: [{ layer: 33, name: 'Invalid' }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid layer number');
    });

    it('should return error for layer without name', async () => {
      const result = await handleConfigurePhysicsLayers({
        projectPath: '/non/existent/path',
        dimension: '2d',
        layers: [{ layer: 1, name: '' }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must have a name');
    });
  });
});
