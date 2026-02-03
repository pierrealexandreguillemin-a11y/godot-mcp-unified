/**
 * Audio Tools Tests
 * ISO/IEC 29119 compliant - comprehensive test documentation
 * ISO/IEC 25010 compliant - strict testing
 *
 * Test Coverage Target: 80%+
 *
 * Test Categories (ISO 29119-4):
 * 1. Validation - Zod schema and input validation
 * 2. Security - path traversal protection
 * 3. Happy Path - success scenarios with mocked Godot executor
 * 4. Error Handling - catch blocks and failure scenarios
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Define mock functions with proper types BEFORE mock module declarations
const mockDetectGodotPath = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockExecuteOperation = jest.fn<(...args: unknown[]) => Promise<{ stdout: string; stderr: string }>>();

// Mock the Godot-dependent modules using unstable_mockModule for ESM
jest.unstable_mockModule('../../core/PathManager.js', () => ({
  detectGodotPath: mockDetectGodotPath,
  validatePath: jest.fn(() => true),
  normalizePath: jest.fn((p: string) => p),
  normalizeHandlerPaths: jest.fn((args: Record<string, unknown>) => args),
}));

jest.unstable_mockModule('../../core/GodotExecutor.js', () => ({
  executeOperation: mockExecuteOperation,
}));

// Dynamic imports AFTER mocks are set up
const { createTempProject, getResponseText, isErrorResponse } = await import('../test-utils.js');
const { handleCreateAudioBus } = await import('./CreateAudioBusTool.js');
const { handleSetupAudioPlayer } = await import('./SetupAudioPlayerTool.js');
const { handleAddAudioEffect } = await import('./AddAudioEffectTool.js');

describe('Audio Tools', () => {
  let projectPath: string;
  let cleanup: () => void;

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================================================
  // CreateAudioBus Tests
  // ============================================================================
  describe('CreateAudioBus', () => {
    describe('Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateAudioBus({ busName: 'Music' });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('projectPath');
      });

      it('should return error when busName is missing', async () => {
        const result = await handleCreateAudioBus({ projectPath: '/path/to/project' });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('busName');
      });

      it('should return error when all params are missing', async () => {
        const result = await handleCreateAudioBus({});
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/projectPath|busName|Validation failed/i);
      });

      it('should return error for empty busName (whitespace)', async () => {
        const result = await handleCreateAudioBus({
          projectPath,
          busName: '   ',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('cannot be empty');
      });

      it('should return error for empty string busName', async () => {
        const result = await handleCreateAudioBus({
          projectPath: '/non/existent',
          busName: '',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for non-string busName', async () => {
        const result = await handleCreateAudioBus({
          projectPath: '/path/to/project',
          busName: 123 as unknown as string,
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for non-number volume', async () => {
        const result = await handleCreateAudioBus({
          projectPath: '/path/to/project',
          busName: 'Music',
          volume: 'loud' as unknown as number,
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for non-boolean solo', async () => {
        const result = await handleCreateAudioBus({
          projectPath: '/path/to/project',
          busName: 'Music',
          solo: 'yes' as unknown as boolean,
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('Security', () => {
      it('should reject path traversal in projectPath', async () => {
        const result = await handleCreateAudioBus({
          projectPath: '/path/to/../../../etc/passwd',
          busName: 'Music',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should reject invalid project path (no project.godot)', async () => {
        const result = await handleCreateAudioBus({
          projectPath: '/non/existent/path',
          busName: 'Music',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Not a valid Godot project');
      });
    });

    describe('Happy Path', () => {
      it('should create audio bus successfully with defaults', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Bus created', stderr: '' });

        const result = await handleCreateAudioBus({
          projectPath,
          busName: 'Music',
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Audio bus created successfully');
        expect(getResponseText(result)).toContain('Music');
        expect(getResponseText(result)).toContain('Master');
      });

      it('should create audio bus with custom params', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Bus created', stderr: '' });

        const result = await handleCreateAudioBus({
          projectPath,
          busName: 'SFX',
          parentBus: 'Master',
          volume: -6.0,
          solo: true,
          mute: false,
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Audio bus created successfully');
        expect(getResponseText(result)).toContain('SFX');
        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'create_audio_bus',
          expect.objectContaining({
            busName: 'SFX',
            parentBus: 'Master',
            volume: -6.0,
            solo: true,
            mute: false,
          }),
          projectPath,
          '/usr/bin/godot',
        );
      });

      it('should return error when godotPath is not found', async () => {
        mockDetectGodotPath.mockResolvedValue(null);

        const result = await handleCreateAudioBus({
          projectPath,
          busName: 'Music',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
      });

      it('should return error when stderr contains "Failed to"', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({
          stdout: '',
          stderr: 'Failed to create bus: Bus already exists',
        });

        const result = await handleCreateAudioBus({
          projectPath,
          busName: 'Music',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Failed to create audio bus');
      });
    });

    describe('Error Handling', () => {
      it('should handle Error thrown by executeOperation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockRejectedValue(new Error('Connection refused'));

        const result = await handleCreateAudioBus({
          projectPath,
          busName: 'Music',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Failed to create audio bus');
        expect(getResponseText(result)).toContain('Connection refused');
      });

      it('should handle non-Error thrown by executeOperation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockRejectedValue('string error');

        const result = await handleCreateAudioBus({
          projectPath,
          busName: 'Music',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Unknown error');
      });

      it('should handle detectGodotPath rejection', async () => {
        mockDetectGodotPath.mockRejectedValue(new Error('Path detection failed'));

        const result = await handleCreateAudioBus({
          projectPath,
          busName: 'Music',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Path detection failed');
      });
    });
  });

  // ============================================================================
  // SetupAudioPlayer Tests
  // ============================================================================
  describe('SetupAudioPlayer', () => {
    describe('Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleSetupAudioPlayer({
          scenePath: 'scenes/main.tscn',
          nodeName: 'MusicPlayer',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleSetupAudioPlayer({
          projectPath: '/path/to/project',
          nodeName: 'MusicPlayer',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when nodeName is missing', async () => {
        const result = await handleSetupAudioPlayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when all params are missing', async () => {
        const result = await handleSetupAudioPlayer({});
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for empty nodeName', async () => {
        const result = await handleSetupAudioPlayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: '',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for non-boolean is3D', async () => {
        const result = await handleSetupAudioPlayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MusicPlayer',
          is3D: 'true' as unknown as boolean,
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for non-number volumeDb', async () => {
        const result = await handleSetupAudioPlayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MusicPlayer',
          volumeDb: 'loud' as unknown as number,
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('Security', () => {
      it('should reject path traversal in projectPath', async () => {
        const result = await handleSetupAudioPlayer({
          projectPath: '../../../etc/passwd',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MusicPlayer',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should reject path traversal in scenePath', async () => {
        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: '../../etc/passwd.tscn',
          nodeName: 'MusicPlayer',
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('Happy Path', () => {
      it('should create AudioStreamPlayer2D when is3D=false (default)', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Node added', stderr: '' });

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'BGMusic',
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('AudioStreamPlayer created successfully');
        expect(getResponseText(result)).toContain('BGMusic');
        expect(getResponseText(result)).toContain('AudioStreamPlayer2D');
      });

      it('should create AudioStreamPlayer3D when is3D=true', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Node added', stderr: '' });

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'SpatialAudio',
          is3D: true,
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('AudioStreamPlayer3D');
      });

      it('should include streamPath in output', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
          streamPath: 'audio/music.ogg',
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Stream: audio/music.ogg');
      });

      it('should include bus in output', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
          bus: 'Music',
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Bus: Music');
      });

      it('should include autoplay in output when enabled', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
          autoplay: true,
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Autoplay: enabled');
      });

      it('should include volumeDb in output when set', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
          volumeDb: -12.0,
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Volume: -12 dB');
      });

      it('should pass parentNodePath to executeOperation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
          parentNodePath: 'GameManager',
        });

        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'add_node',
          expect.objectContaining({ parentNodePath: 'GameManager' }),
          projectPath,
          '/usr/bin/godot',
        );
      });

      it('should pass all properties to executeOperation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
          streamPath: 'audio/sfx.wav',
          bus: 'SFX',
          autoplay: false,
          volumeDb: 0,
        });

        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'add_node',
          expect.objectContaining({
            properties: expect.objectContaining({
              stream: 'audio/sfx.wav',
              bus: 'SFX',
              autoplay: false,
              volume_db: 0,
            }),
          }),
          projectPath,
          '/usr/bin/godot',
        );
      });

      it('should handle all optional params together', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'All good', stderr: '' });

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'FullPlayer',
          parentNodePath: 'AudioNode',
          is3D: true,
          streamPath: 'audio/theme.ogg',
          bus: 'Music',
          autoplay: true,
          volumeDb: -6.0,
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('AudioStreamPlayer3D');
        expect(getResponseText(result)).toContain('Stream: audio/theme.ogg');
        expect(getResponseText(result)).toContain('Bus: Music');
        expect(getResponseText(result)).toContain('Autoplay: enabled');
        expect(getResponseText(result)).toContain('Volume: -6 dB');
      });

      it('should return error when godotPath is not found', async () => {
        mockDetectGodotPath.mockResolvedValue(null);

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
      });

      it('should return error when stderr contains "Failed to"', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({
          stdout: '',
          stderr: 'Failed to add node: parent not found',
        });

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Failed to setup audio player');
      });
    });

    describe('Error Handling', () => {
      it('should handle Error thrown by executeOperation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockRejectedValue(new Error('Execution failed'));

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Execution failed');
      });

      it('should handle non-Error thrown by executeOperation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockRejectedValue(42);

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Unknown error');
      });

      it('should handle detectGodotPath rejection', async () => {
        mockDetectGodotPath.mockRejectedValue(new Error('Cannot detect'));

        const result = await handleSetupAudioPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Player',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Cannot detect');
      });
    });
  });

  // ============================================================================
  // AddAudioEffect Tests
  // ============================================================================
  describe('AddAudioEffect', () => {
    describe('Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleAddAudioEffect({ busName: 'Music', effectType: 'reverb' });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when busName is missing', async () => {
        const result = await handleAddAudioEffect({ projectPath: '/path', effectType: 'reverb' });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when effectType is missing', async () => {
        const result = await handleAddAudioEffect({ projectPath: '/path', busName: 'Music' });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for invalid effectType', async () => {
        const result = await handleAddAudioEffect({
          projectPath: '/non/existent',
          busName: 'Music',
          effectType: 'invalid_effect' as 'reverb',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for effectType with wrong case', async () => {
        const result = await handleAddAudioEffect({
          projectPath: '/non/existent',
          busName: 'Music',
          effectType: 'REVERB' as 'reverb',
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('Security', () => {
      it('should reject path traversal in projectPath', async () => {
        const result = await handleAddAudioEffect({
          projectPath: '../../../etc/passwd',
          busName: 'Music',
          effectType: 'reverb',
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('Happy Path', () => {
      it('should add reverb effect successfully', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'Effect added', stderr: '' });

        const result = await handleAddAudioEffect({
          projectPath,
          busName: 'Music',
          effectType: 'reverb',
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Audio effect added successfully');
        expect(getResponseText(result)).toContain('AudioEffectReverb');
        expect(getResponseText(result)).toContain('Music');
      });

      it('should add amplify effect successfully', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleAddAudioEffect({
          projectPath,
          busName: 'Master',
          effectType: 'amplify',
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('AudioEffectAmplify');
      });

      it('should add effect with effectParams', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        const result = await handleAddAudioEffect({
          projectPath,
          busName: 'Music',
          effectType: 'compressor',
          effectParams: { threshold: -20, ratio: 4 },
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('AudioEffectCompressor');
        expect(mockExecuteOperation).toHaveBeenCalledWith(
          'add_audio_effect',
          expect.objectContaining({
            effectParams: { threshold: -20, ratio: 4 },
          }),
          projectPath,
          '/usr/bin/godot',
        );
      });

      it('should not pass effectParams when not provided', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

        await handleAddAudioEffect({
          projectPath,
          busName: 'Music',
          effectType: 'delay',
        });

        const callArgs = mockExecuteOperation.mock.calls[0][1];
        expect(callArgs).not.toHaveProperty('effectParams');
      });

      it('should return error when godotPath is not found', async () => {
        mockDetectGodotPath.mockResolvedValue(null);

        const result = await handleAddAudioEffect({
          projectPath,
          busName: 'Music',
          effectType: 'reverb',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
      });

      it('should return error when stderr contains "Failed to"', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockResolvedValue({
          stdout: '',
          stderr: 'Failed to add effect: Bus not found',
        });

        const result = await handleAddAudioEffect({
          projectPath,
          busName: 'NonExistent',
          effectType: 'reverb',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Failed to add audio effect');
      });

      it('should map all effect types correctly', async () => {
        const mappings: Record<string, string> = {
          amplify: 'AudioEffectAmplify',
          chorus: 'AudioEffectChorus',
          delay: 'AudioEffectDelay',
          distortion: 'AudioEffectDistortion',
          eq6: 'AudioEffectEQ6',
          limiter: 'AudioEffectLimiter',
          reverb: 'AudioEffectReverb',
          panner: 'AudioEffectPanner',
          phaser: 'AudioEffectPhaser',
          stereo_enhance: 'AudioEffectStereoEnhance',
        };

        for (const [effectType, expectedClass] of Object.entries(mappings)) {
          jest.clearAllMocks();
          mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
          mockExecuteOperation.mockResolvedValue({ stdout: 'ok', stderr: '' });

          const result = await handleAddAudioEffect({
            projectPath,
            busName: 'Music',
            effectType: effectType as 'reverb',
          });
          expect(isErrorResponse(result)).toBe(false);
          expect(getResponseText(result)).toContain(expectedClass);
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle Error thrown by executeOperation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockRejectedValue(new Error('Process crashed'));

        const result = await handleAddAudioEffect({
          projectPath,
          busName: 'Music',
          effectType: 'reverb',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Process crashed');
      });

      it('should handle non-Error thrown by executeOperation', async () => {
        mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
        mockExecuteOperation.mockRejectedValue(null);

        const result = await handleAddAudioEffect({
          projectPath,
          busName: 'Music',
          effectType: 'reverb',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Unknown error');
      });

      it('should handle detectGodotPath rejection', async () => {
        mockDetectGodotPath.mockRejectedValue(new Error('Godot not found'));

        const result = await handleAddAudioEffect({
          projectPath,
          busName: 'Music',
          effectType: 'reverb',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Godot not found');
      });
    });
  });
});
