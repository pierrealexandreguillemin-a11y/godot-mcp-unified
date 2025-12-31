/**
 * Add Audio Effect Tool
 * Adds an audio effect to an audio bus
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, AddAudioEffectArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { executeOperation } from '../../core/GodotExecutor';
import { logDebug } from '../../utils/Logger';

export const addAudioEffectDefinition: ToolDefinition = {
  name: 'add_audio_effect',
  description: 'Add an audio effect to an audio bus',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      busName: {
        type: 'string',
        description: 'Name of the audio bus to add the effect to',
      },
      effectType: {
        type: 'string',
        description: 'Type of audio effect to add',
        enum: [
          'amplify',
          'bandlimit',
          'bandpass',
          'chorus',
          'compressor',
          'delay',
          'distortion',
          'eq6',
          'eq10',
          'eq21',
          'filter',
          'highpass',
          'highshelf',
          'limiter',
          'lowpass',
          'lowshelf',
          'notch',
          'panner',
          'phaser',
          'pitch_shift',
          'record',
          'reverb',
          'spectrum_analyzer',
          'stereo_enhance',
        ],
      },
      effectParams: {
        type: 'object',
        description: 'Optional parameters for the effect (varies by effect type)',
      },
    },
    required: ['projectPath', 'busName', 'effectType'],
  },
};

// Map effect type to Godot class name
const effectTypeToClass: Record<string, string> = {
  amplify: 'AudioEffectAmplify',
  bandlimit: 'AudioEffectBandLimitFilter',
  bandpass: 'AudioEffectBandPassFilter',
  chorus: 'AudioEffectChorus',
  compressor: 'AudioEffectCompressor',
  delay: 'AudioEffectDelay',
  distortion: 'AudioEffectDistortion',
  eq6: 'AudioEffectEQ6',
  eq10: 'AudioEffectEQ10',
  eq21: 'AudioEffectEQ21',
  filter: 'AudioEffectFilter',
  highpass: 'AudioEffectHighPassFilter',
  highshelf: 'AudioEffectHighShelfFilter',
  limiter: 'AudioEffectLimiter',
  lowpass: 'AudioEffectLowPassFilter',
  lowshelf: 'AudioEffectLowShelfFilter',
  notch: 'AudioEffectNotchFilter',
  panner: 'AudioEffectPanner',
  phaser: 'AudioEffectPhaser',
  pitch_shift: 'AudioEffectPitchShift',
  record: 'AudioEffectRecord',
  reverb: 'AudioEffectReverb',
  spectrum_analyzer: 'AudioEffectSpectrumAnalyzer',
  stereo_enhance: 'AudioEffectStereoEnhance',
};

export const handleAddAudioEffect = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'busName',
    'effectType',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, busName, and effectType',
    ]);
  }

  const typedArgs = preparedArgs as AddAudioEffectArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Validate effect type
  const effectClass = effectTypeToClass[typedArgs.effectType];
  if (!effectClass) {
    return createErrorResponse(`Unknown effect type: ${typedArgs.effectType}`, [
      'Valid effect types: amplify, bandlimit, bandpass, chorus, compressor, delay, distortion, eq, filter, highpass, highshelf, limiter, lowpass, lowshelf, notch, panner, phaser, pitch_shift, record, reverb, spectrum_analyzer, stereo_enhance',
    ]);
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Adding ${effectClass} effect to bus: ${typedArgs.busName}`);

    const params: BaseToolArgs = {
      busName: typedArgs.busName,
      effectClass: effectClass,
    };

    if (typedArgs.effectParams) {
      params.effectParams = typedArgs.effectParams;
    }

    const { stdout, stderr } = await executeOperation(
      'add_audio_effect',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to add audio effect: ${stderr}`, [
        'Check if the audio bus exists',
        'Verify the effect parameters are valid',
        'Ensure the project has write permissions',
      ]);
    }

    return createSuccessResponse(
      `Audio effect added successfully: ${effectClass} to bus "${typedArgs.busName}"\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to add audio effect: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the audio bus exists',
    ]);
  }
};
