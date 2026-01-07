/**
 * Get Godot Version Tool
 * Retrieves the version of the installed Godot engine
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse } from '../../server/types.js';
import { createSuccessResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { getGodotVersion } from '../../core/GodotExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { GetGodotVersionSchema, toMcpSchema } from '../../core/ZodSchemas.js';

export const getGodotVersionDefinition: ToolDefinition = {
  name: 'get_godot_version',
  description: 'Get the installed Godot version',
  inputSchema: toMcpSchema(GetGodotVersionSchema),
};

export const handleGetGodotVersion = async (): Promise<ToolResponse> => {
  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    const version = await getGodotVersion(godotPath);
    return createSuccessResponse(version);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to get Godot version: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
    ]);
  }
};
