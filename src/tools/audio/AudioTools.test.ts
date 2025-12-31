/**
 * Audio Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateAudioBus } from './CreateAudioBusTool';
import { handleSetupAudioPlayer } from './SetupAudioPlayerTool';
import { handleAddAudioEffect } from './AddAudioEffectTool';

describe('Audio Tools', () => {
  describe('CreateAudioBus', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateAudioBus({
        busName: 'Music',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when busName is missing', async () => {
      const result = await handleCreateAudioBus({
        projectPath: '/path/to/project',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('busName');
    });

    it('should return error for empty busName', async () => {
      const result = await handleCreateAudioBus({
        projectPath: '/non/existent/path',
        busName: '   ',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('cannot be empty');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleCreateAudioBus({
        projectPath: '/non/existent/path',
        busName: 'Music',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('SetupAudioPlayer', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleSetupAudioPlayer({
        scenePath: 'scenes/main.tscn',
        nodeName: 'MusicPlayer',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when nodeName is missing', async () => {
      const result = await handleSetupAudioPlayer({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nodeName');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleSetupAudioPlayer({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'MusicPlayer',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('AddAudioEffect', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleAddAudioEffect({
        busName: 'Music',
        effectType: 'reverb',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when busName is missing', async () => {
      const result = await handleAddAudioEffect({
        projectPath: '/path/to/project',
        effectType: 'reverb',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('busName');
    });

    it('should return error when effectType is missing', async () => {
      const result = await handleAddAudioEffect({
        projectPath: '/path/to/project',
        busName: 'Music',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('effectType');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleAddAudioEffect({
        projectPath: '/non/existent/path',
        busName: 'Music',
        effectType: 'reverb',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });
});
