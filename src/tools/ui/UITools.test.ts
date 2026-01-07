/**
 * UI Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateUIContainer } from './CreateUIContainerTool';
import { handleCreateControl } from './CreateControlTool';

describe('UI Tools', () => {
  describe('CreateUIContainer', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateUIContainer({
        scenePath: 'scenes/main.tscn',
        nodeName: 'MainContainer',
        containerType: 'vbox',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when scenePath is missing', async () => {
      const result = await handleCreateUIContainer({
        projectPath: '/path/to/project',
        nodeName: 'MainContainer',
        containerType: 'vbox',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scenePath');
    });

    it('should return error when nodeName is missing', async () => {
      const result = await handleCreateUIContainer({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        containerType: 'vbox',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nodeName');
    });

    it('should return error when containerType is missing', async () => {
      const result = await handleCreateUIContainer({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        nodeName: 'MainContainer',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('containerType');
    });

    it('should return error for invalid container type', async () => {
      const result = await handleCreateUIContainer({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'MainContainer',
        containerType: 'invalid',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('containerType: Invalid option');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleCreateUIContainer({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'MainContainer',
        containerType: 'vbox',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('CreateControl', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateControl({
        scenePath: 'scenes/main.tscn',
        nodeName: 'StartButton',
        controlType: 'button',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when scenePath is missing', async () => {
      const result = await handleCreateControl({
        projectPath: '/path/to/project',
        nodeName: 'StartButton',
        controlType: 'button',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scenePath');
    });

    it('should return error when nodeName is missing', async () => {
      const result = await handleCreateControl({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        controlType: 'button',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nodeName');
    });

    it('should return error when controlType is missing', async () => {
      const result = await handleCreateControl({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        nodeName: 'StartButton',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('controlType');
    });

    it('should return error for invalid control type', async () => {
      const result = await handleCreateControl({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'StartButton',
        controlType: 'invalid',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('controlType: Invalid option');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleCreateControl({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'StartButton',
        controlType: 'button',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });
});
