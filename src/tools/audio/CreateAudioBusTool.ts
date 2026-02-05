/**
 * Create Audio Bus Tool
 * Creates an audio bus in the project's audio bus layout
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
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  CreateAudioBusSchema,
  CreateAudioBusInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createAudioBusDefinition: ToolDefinition = {
  name: 'create_audio_bus',
  description: 'Create a new audio bus in the project audio bus layout',
  inputSchema: toMcpSchema(CreateAudioBusSchema),
};

export const handleCreateAudioBus = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateAudioBusSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and busName',
    ]);
  }

  const typedArgs: CreateAudioBusInput = validation.data;

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

  logDebug(`Creating audio bus: ${typedArgs.busName}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'create_audio_bus',
    {
      bus_name: typedArgs.busName,
      parent_bus: typedArgs.parentBus ?? 'Master',
      volume: typedArgs.volume ?? 0.0,
      solo: typedArgs.solo ?? false,
      mute: typedArgs.mute ?? false,
    },
    async () => {
      // Fallback: traditional GodotExecutor method
      try {
        const godotPath = await detectGodotPath();
        if (!godotPath) {
          return createErrorResponse('Could not find a valid Godot executable path', [
            'Ensure Godot is installed correctly',
            'Set GODOT_PATH environment variable to specify the correct path',
          ]);
        }

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
    }
  );
};
