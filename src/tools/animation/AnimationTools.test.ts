/**
 * Animation Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateAnimationPlayer } from './CreateAnimationPlayerTool';
import { handleAddAnimation } from './AddAnimationTool';
import { handleAddAnimationTrack } from './AddAnimationTrackTool';
import { handleSetKeyframe } from './SetKeyframeTool';

describe('Animation Tools', () => {
  describe('CreateAnimationPlayer', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateAnimationPlayer({
        scenePath: 'scenes/main.tscn',
        nodeName: 'AnimPlayer',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when scenePath is missing', async () => {
      const result = await handleCreateAnimationPlayer({
        projectPath: '/path/to/project',
        nodeName: 'AnimPlayer',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scenePath');
    });

    it('should return error when nodeName is missing', async () => {
      const result = await handleCreateAnimationPlayer({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nodeName');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleCreateAnimationPlayer({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'AnimPlayer',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('AddAnimation', () => {
    it('should return error when required params are missing', async () => {
      const result = await handleAddAnimation({
        projectPath: '/path/to/project',
      });
      expect(result.isError).toBe(true);
    });

    it('should return error when playerNodePath is missing', async () => {
      const result = await handleAddAnimation({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        animationName: 'walk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('playerNodePath');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleAddAnimation({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        playerNodePath: 'AnimPlayer',
        animationName: 'walk',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('AddAnimationTrack', () => {
    it('should return error when required params are missing', async () => {
      const result = await handleAddAnimationTrack({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
    });

    it('should return error when trackType is missing', async () => {
      const result = await handleAddAnimationTrack({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        playerNodePath: 'AnimPlayer',
        animationName: 'walk',
        nodePath: 'Sprite2D',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('trackType');
    });

    it('should return error for value track without property', async () => {
      const result = await handleAddAnimationTrack({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        playerNodePath: 'AnimPlayer',
        animationName: 'walk',
        trackType: 'value',
        nodePath: 'Sprite2D',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Property is required');
    });
  });

  describe('SetKeyframe', () => {
    it('should return error when required params are missing', async () => {
      const result = await handleSetKeyframe({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for negative track index', async () => {
      const result = await handleSetKeyframe({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        playerNodePath: 'AnimPlayer',
        animationName: 'walk',
        trackIndex: -1,
        time: 0.5,
        value: { x: 100, y: 100 },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('non-negative');
    });

    it('should return error for negative time', async () => {
      const result = await handleSetKeyframe({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        playerNodePath: 'AnimPlayer',
        animationName: 'walk',
        trackIndex: 0,
        time: -1,
        value: { x: 100, y: 100 },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('non-negative');
    });
  });
});
