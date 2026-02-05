/**
 * Create Light Tool
 * Creates Light2D or Light3D nodes (DirectionalLight, OmniLight, SpotLight, PointLight)
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  CreateLightSchema,
  CreateLightInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createLightDefinition: ToolDefinition = {
  name: 'create_light',
  description: 'Create a Light2D or Light3D node for scene lighting',
  inputSchema: toMcpSchema(CreateLightSchema),
};

// Map light type to Godot class name
const lightTypeToClass: Record<string, string> = {
  directional_3d: 'DirectionalLight3D',
  omni_3d: 'OmniLight3D',
  spot_3d: 'SpotLight3D',
  point_2d: 'PointLight2D',
  directional_2d: 'DirectionalLight2D',
};

export const handleCreateLight = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateLightSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodeName, and lightType',
    ]);
  }

  const typedArgs: CreateLightInput = validation.data;

  // Validate light type
  if (!lightTypeToClass[typedArgs.lightType]) {
    return createErrorResponse(`Invalid light type: ${typedArgs.lightType}`, [
      'Valid types: directional_3d, omni_3d, spot_3d, point_2d, directional_2d',
    ]);
  }

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
        'Set GODOT_PATH environment variable',
      ]);
    }

    const nodeType = lightTypeToClass[typedArgs.lightType];
    logDebug(`Creating ${nodeType}: ${typedArgs.nodeName}`);

    const params: BaseToolArgs = {
      scene_path: typedArgs.scenePath,
      node_type: nodeType,
      node_name: typedArgs.nodeName,
      parent_node_path: typedArgs.parentNodePath ?? '',
    };

    if (typedArgs.color) {
      params.color = typedArgs.color;
    }

    if (typedArgs.energy !== undefined) {
      params.energy = typedArgs.energy;
    }

    if (typedArgs.range !== undefined) {
      params.range = typedArgs.range;
    }

    if (typedArgs.spotAngle !== undefined) {
      params.spot_angle = typedArgs.spotAngle;
    }

    if (typedArgs.shadowEnabled !== undefined) {
      params.shadow_enabled = typedArgs.shadowEnabled;
    }

    if (typedArgs.texturePath) {
      params.texture_path = typedArgs.texturePath;
    }

    const { stdout, stderr } = await executeOperation(
      'create_light',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create light: ${stderr}`, [
        'Check if the parent node exists',
        'Verify the scene path is correct',
      ]);
    }

    return createSuccessResponse(
      `Light created successfully: ${typedArgs.nodeName} (${nodeType})\nEnergy: ${typedArgs.energy ?? 1.0}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create light: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
    ]);
  }
};
