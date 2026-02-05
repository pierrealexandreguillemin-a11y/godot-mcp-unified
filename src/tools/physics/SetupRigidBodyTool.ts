/**
 * Setup RigidBody Tool
 * Configures physics properties for RigidBody2D or RigidBody3D nodes
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
  SetupRigidBodySchema,
  SetupRigidBodyInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const setupRigidBodyDefinition: ToolDefinition = {
  name: 'setup_rigidbody',
  description: 'Configure physics properties for a RigidBody2D or RigidBody3D node',
  inputSchema: toMcpSchema(SetupRigidBodySchema),
};

export const handleSetupRigidBody = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(SetupRigidBodySchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, and nodePath',
    ]);
  }

  const typedArgs: SetupRigidBodyInput = validation.data;

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
