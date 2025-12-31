/**
 * Setup Audio Player Tool
 * Creates and configures an AudioStreamPlayer, AudioStreamPlayer2D, or AudioStreamPlayer3D node
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, SetupAudioPlayerArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { executeOperation } from '../../core/GodotExecutor';
import { logDebug } from '../../utils/Logger';

export const setupAudioPlayerDefinition: ToolDefinition = {
  name: 'setup_audio_player',
  description: 'Create and configure an AudioStreamPlayer node (2D or 3D)',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      scenePath: {
        type: 'string',
        description: 'Path to the scene file (relative to project)',
      },
      nodeName: {
        type: 'string',
        description: 'Name for the AudioStreamPlayer node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to the parent node (optional, defaults to root)',
      },
      is3D: {
        type: 'boolean',
        description: 'Create AudioStreamPlayer3D instead of 2D (default: false for non-positional AudioStreamPlayer)',
      },
      streamPath: {
        type: 'string',
        description: 'Path to the audio stream resource (optional, relative to project)',
      },
      bus: {
        type: 'string',
        description: 'Audio bus to use (default: "Master")',
      },
      autoplay: {
        type: 'boolean',
        description: 'Whether to autoplay the stream (default: false)',
      },
      volumeDb: {
        type: 'number',
        description: 'Volume in decibels (default: 0.0)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName'],
  },
};

export const handleSetupAudioPlayer = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeName',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, and nodeName',
    ]);
  }

  const typedArgs = preparedArgs as SetupAudioPlayerArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    // Determine node type
    let nodeType = 'AudioStreamPlayer';
    if (typedArgs.is3D === true) {
      nodeType = 'AudioStreamPlayer3D';
    } else if (typedArgs.is3D === false) {
      nodeType = 'AudioStreamPlayer2D';
    }

    logDebug(`Creating ${nodeType}: ${typedArgs.nodeName} in scene: ${typedArgs.scenePath}`);

    // Build properties
    const properties: Record<string, unknown> = {};

    if (typedArgs.streamPath) {
      properties.stream = typedArgs.streamPath;
    }

    if (typedArgs.bus) {
      properties.bus = typedArgs.bus;
    }

    if (typedArgs.autoplay !== undefined) {
      properties.autoplay = typedArgs.autoplay;
    }

    if (typedArgs.volumeDb !== undefined) {
      properties.volume_db = typedArgs.volumeDb;
    }

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      nodeType: nodeType,
      nodeName: typedArgs.nodeName,
      properties: properties,
    };

    if (typedArgs.parentNodePath) {
      params.parentNodePath = typedArgs.parentNodePath;
    }

    const { stdout, stderr } = await executeOperation(
      'add_node',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to setup audio player: ${stderr}`, [
        'Check if the parent node path exists',
        'Verify the audio stream path is correct (if provided)',
        'Ensure the bus name exists',
      ]);
    }

    const streamInfo = typedArgs.streamPath ? `\nStream: ${typedArgs.streamPath}` : '';
    const busInfo = typedArgs.bus ? `\nBus: ${typedArgs.bus}` : '';
    const autoplayInfo = typedArgs.autoplay ? '\nAutoplay: enabled' : '';
    const volumeInfo = typedArgs.volumeDb !== undefined ? `\nVolume: ${typedArgs.volumeDb} dB` : '';

    return createSuccessResponse(
      `AudioStreamPlayer created successfully: ${typedArgs.nodeName} (${nodeType})${streamInfo}${busInfo}${autoplayInfo}${volumeInfo}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to setup audio player: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project path and scene path are accessible',
    ]);
  }
};
