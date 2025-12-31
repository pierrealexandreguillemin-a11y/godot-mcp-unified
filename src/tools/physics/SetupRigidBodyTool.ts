/**
 * Setup RigidBody Tool
 * Configures physics properties for RigidBody2D or RigidBody3D nodes
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, SetupRigidBodyArgs } from '../../server/types';
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

export const setupRigidBodyDefinition: ToolDefinition = {
  name: 'setup_rigidbody',
  description: 'Configure physics properties for a RigidBody2D or RigidBody3D node',
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
      nodePath: {
        type: 'string',
        description: 'Path to the RigidBody node in the scene',
      },
      bodyType: {
        type: 'string',
        description: 'Body type: dynamic (default), static, or kinematic',
        enum: ['dynamic', 'static', 'kinematic'],
      },
      mass: {
        type: 'number',
        description: 'Mass of the body in kg (default: 1.0)',
      },
      gravity_scale: {
        type: 'number',
        description: 'Gravity scale multiplier (default: 1.0, 0 = no gravity)',
      },
      linear_damp: {
        type: 'number',
        description: 'Linear damping to slow down linear velocity (default: 0.0)',
      },
      angular_damp: {
        type: 'number',
        description: 'Angular damping to slow down rotation (default: 0.0)',
      },
      physics_material: {
        type: 'string',
        description: 'Path to a PhysicsMaterial resource (optional)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodePath'],
  },
};

export const handleSetupRigidBody = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodePath',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, and nodePath',
    ]);
  }

  const typedArgs = preparedArgs as SetupRigidBodyArgs;

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

    logDebug(`Setting up RigidBody at ${typedArgs.nodePath} in scene: ${typedArgs.scenePath}`);

    // Build properties object for the edit_node operation
    const properties: Record<string, unknown> = {};

    if (typedArgs.bodyType) {
      // Map body type string to Godot freeze mode
      switch (typedArgs.bodyType) {
        case 'static':
          properties.freeze = true;
          properties.freeze_mode = 0; // FREEZE_MODE_STATIC
          break;
        case 'kinematic':
          properties.freeze = true;
          properties.freeze_mode = 1; // FREEZE_MODE_KINEMATIC
          break;
        case 'dynamic':
        default:
          properties.freeze = false;
          break;
      }
    }

    if (typedArgs.mass !== undefined) {
      properties.mass = typedArgs.mass;
    }

    if (typedArgs.gravity_scale !== undefined) {
      properties.gravity_scale = typedArgs.gravity_scale;
    }

    if (typedArgs.linear_damp !== undefined) {
      properties.linear_damp = typedArgs.linear_damp;
    }

    if (typedArgs.angular_damp !== undefined) {
      properties.angular_damp = typedArgs.angular_damp;
    }

    if (typedArgs.physics_material) {
      properties.physics_material_override = typedArgs.physics_material;
    }

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      nodePath: typedArgs.nodePath,
      properties: properties,
    };

    const { stdout, stderr } = await executeOperation(
      'edit_node',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to setup RigidBody: ${stderr}`, [
        'Check if the node path is correct',
        'Verify the node is a RigidBody2D or RigidBody3D',
        'Ensure the scene file is not corrupted',
      ]);
    }

    const configuredProps = Object.keys(properties).join(', ') || 'no changes';
    return createSuccessResponse(
      `RigidBody configured successfully at ${typedArgs.nodePath}\nProperties set: ${configuredProps}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to setup RigidBody: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the node is a RigidBody2D or RigidBody3D',
    ]);
  }
};
