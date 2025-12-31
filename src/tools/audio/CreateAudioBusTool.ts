/**
 * Create Audio Bus Tool
 * Creates an audio bus in the project's audio bus layout
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, CreateAudioBusArgs } from '../../server/types';
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

export const createAudioBusDefinition: ToolDefinition = {
  name: 'create_audio_bus',
  description: 'Create a new audio bus in the project audio bus layout',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      busName: {
        type: 'string',
        description: 'Name for the new audio bus',
      },
      parentBus: {
        type: 'string',
        description: 'Name of the parent bus to route to (default: "Master")',
      },
      volume: {
        type: 'number',
        description: 'Initial volume in dB (default: 0.0)',
      },
      solo: {
        type: 'boolean',
        description: 'Whether the bus is soloed (default: false)',
      },
      mute: {
        type: 'boolean',
        description: 'Whether the bus is muted (default: false)',
      },
    },
    required: ['projectPath', 'busName'],
  },
};

export const handleCreateAudioBus = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'busName',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath and busName',
    ]);
  }

  const typedArgs = preparedArgs as CreateAudioBusArgs;

  // Validate bus name (before project validation)
  if (!typedArgs.busName || typedArgs.busName.trim() === '') {
    return createErrorResponse('Bus name cannot be empty', [
      'Provide a valid name for the audio bus',
    ]);
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Creating audio bus: ${typedArgs.busName}`);

    const params: BaseToolArgs = {
      busName: typedArgs.busName,
      parentBus: typedArgs.parentBus ?? 'Master',
      volume: typedArgs.volume ?? 0.0,
      solo: typedArgs.solo ?? false,
      mute: typedArgs.mute ?? false,
    };

    const { stdout, stderr } = await executeOperation(
      'create_audio_bus',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create audio bus: ${stderr}`, [
        'Check if the parent bus name is valid',
        'Ensure the bus name is unique',
        'Verify the project has write permissions',
      ]);
    }

    return createSuccessResponse(
      `Audio bus created successfully: ${typedArgs.busName}\nParent: ${typedArgs.parentBus ?? 'Master'}\nVolume: ${typedArgs.volume ?? 0.0} dB\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create audio bus: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project path is accessible',
    ]);
  }
};
