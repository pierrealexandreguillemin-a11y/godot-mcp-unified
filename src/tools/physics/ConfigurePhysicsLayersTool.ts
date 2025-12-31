/**
 * Configure Physics Layers Tool
 * Configures physics layer names in project settings
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ConfigurePhysicsLayersArgs } from '../../server/types';
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

export const configurePhysicsLayersDefinition: ToolDefinition = {
  name: 'configure_physics_layers',
  description: 'Configure physics collision layer names in project settings for 2D or 3D',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      dimension: {
        type: 'string',
        description: 'Physics dimension: 2d or 3d',
        enum: ['2d', '3d'],
      },
      layers: {
        type: 'array',
        description: 'Array of layer configurations with layer number (1-32) and name',
        items: {
          type: 'object',
          properties: {
            layer: {
              type: 'number',
              description: 'Layer number (1-32)',
            },
            name: {
              type: 'string',
              description: 'Name for the layer',
            },
          },
        },
      },
    },
    required: ['projectPath', 'dimension', 'layers'],
  },
};

export const handleConfigurePhysicsLayers = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'dimension',
    'layers',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, dimension (2d/3d), and layers array',
    ]);
  }

  const typedArgs = preparedArgs as ConfigurePhysicsLayersArgs;

  // Validate layers (before project validation)
  if (!Array.isArray(typedArgs.layers) || typedArgs.layers.length === 0) {
    return createErrorResponse('Layers must be a non-empty array', [
      'Provide at least one layer configuration',
      'Example: [{ layer: 1, name: "Player" }, { layer: 2, name: "Enemies" }]',
    ]);
  }

  // Validate each layer
  for (const layerConfig of typedArgs.layers) {
    if (layerConfig.layer < 1 || layerConfig.layer > 32) {
      return createErrorResponse(`Invalid layer number: ${layerConfig.layer}`, [
        'Layer numbers must be between 1 and 32',
      ]);
    }
    if (!layerConfig.name || typeof layerConfig.name !== 'string') {
      return createErrorResponse('Each layer must have a name', [
        'Provide a string name for each layer',
      ]);
    }
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

    logDebug(`Configuring ${typedArgs.dimension} physics layers for project: ${typedArgs.projectPath}`);

    // Set each layer name via project settings
    const results: string[] = [];

    for (const layerConfig of typedArgs.layers) {
      const settingPath = `layer_names/${typedArgs.dimension}_physics/layer_${layerConfig.layer}`;

      const params: BaseToolArgs = {
        setting: settingPath,
        value: layerConfig.name,
      };

      const { stderr } = await executeOperation(
        'set_project_setting',
        params,
        typedArgs.projectPath,
        godotPath,
      );

      if (stderr && stderr.includes('Failed to')) {
        results.push(`Layer ${layerConfig.layer}: FAILED - ${stderr}`);
      } else {
        results.push(`Layer ${layerConfig.layer}: "${layerConfig.name}"`);
      }
    }

    return createSuccessResponse(
      `Physics layers configured for ${typedArgs.dimension.toUpperCase()}:\n${results.join('\n')}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to configure physics layers: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project path is accessible',
    ]);
  }
};
