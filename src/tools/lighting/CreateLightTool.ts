/**
 * Create Light Tool
 * Creates Light2D or Light3D nodes (DirectionalLight, OmniLight, SpotLight, PointLight)
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
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

export interface CreateLightArgs extends BaseToolArgs {
  projectPath: string;
  scenePath: string;
  nodeName: string;
  parentNodePath?: string;
  lightType: 'directional_3d' | 'omni_3d' | 'spot_3d' | 'point_2d' | 'directional_2d';
  color?: { r: number; g: number; b: number };
  energy?: number;
  range?: number;
  spotAngle?: number;
  shadowEnabled?: boolean;
  texturePath?: string;
}

export const createLightDefinition: ToolDefinition = {
  name: 'create_light',
  description: 'Create a Light2D or Light3D node for scene lighting',
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
        description: 'Name for the Light node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to parent node (default: root)',
      },
      lightType: {
        type: 'string',
        description: 'Type of light',
        enum: ['directional_3d', 'omni_3d', 'spot_3d', 'point_2d', 'directional_2d'],
      },
      color: {
        type: 'object',
        description: 'Light color { r, g, b } (default: white)',
      },
      energy: {
        type: 'number',
        description: 'Light energy/intensity (default: 1.0)',
      },
      range: {
        type: 'number',
        description: 'Light range (for OmniLight3D, SpotLight3D)',
      },
      spotAngle: {
        type: 'number',
        description: 'Spot angle in degrees (for SpotLight3D)',
      },
      shadowEnabled: {
        type: 'boolean',
        description: 'Enable shadows (default: false)',
      },
      texturePath: {
        type: 'string',
        description: 'Path to light texture (for PointLight2D)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName', 'lightType'],
  },
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

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeName',
    'lightType',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodeName, and lightType',
    ]);
  }

  const typedArgs = preparedArgs as CreateLightArgs;

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
