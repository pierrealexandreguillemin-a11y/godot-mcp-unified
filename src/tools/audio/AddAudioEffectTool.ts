/**
 * Add Audio Effect Tool
 * Adds an audio effect to an audio bus
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  AddAudioEffectSchema,
  AddAudioEffectInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const addAudioEffectDefinition: ToolDefinition = {
  name: 'add_audio_effect',
  description: 'Add an audio effect to an audio bus',
  inputSchema: toMcpSchema(AddAudioEffectSchema),
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

  // Zod validation
  const validation = safeValidateInput(AddAudioEffectSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, busName, and effectType',
    ]);
  }

  const typedArgs: AddAudioEffectInput = validation.data;

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
