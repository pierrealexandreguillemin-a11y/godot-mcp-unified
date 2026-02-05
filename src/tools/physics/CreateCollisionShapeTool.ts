/**
 * Create Collision Shape Tool
 * Creates a CollisionShape2D or CollisionShape3D node with a specified shape
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
  CreateCollisionShapeSchema,
  CreateCollisionShapeInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createCollisionShapeDefinition: ToolDefinition = {
  name: 'create_collision_shape',
  description: 'Create a CollisionShape2D or CollisionShape3D node with a specified shape type',
  inputSchema: toMcpSchema(CreateCollisionShapeSchema),
};

export const handleCreateCollisionShape = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateCollisionShapeSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodeName, parentNodePath, and shapeType',
    ]);
  }

  const typedArgs: CreateCollisionShapeInput = validation.data;

  // Validate shape type matches dimension (before project validation)
  const is3D = typedArgs.is3D ?? false;
  const shape2DTypes = ['rectangle', 'circle', 'capsule', 'polygon'];
  const shape3DTypes = ['box', 'sphere', 'capsule', 'cylinder', 'convex'];

  if (is3D && !shape3DTypes.includes(typedArgs.shapeType)) {
    return createErrorResponse(`Invalid 3D shape type: ${typedArgs.shapeType}`, [
      'Valid 3D shapes: box, sphere, capsule, cylinder, convex',
    ]);
  }

  if (!is3D && !shape2DTypes.includes(typedArgs.shapeType)) {
    return createErrorResponse(`Invalid 2D shape type: ${typedArgs.shapeType}`, [
      'Valid 2D shapes: rectangle, circle, capsule, polygon',
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

  const nodeType = is3D ? 'CollisionShape3D' : 'CollisionShape2D';
  logDebug(`Creating ${nodeType} with ${typedArgs.shapeType} shape in scene: ${typedArgs.scenePath}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'create_collision_shape',
    {
      node_name: typedArgs.nodeName,
      parent_path: typedArgs.parentNodePath,
      shape_type: typedArgs.shapeType,
      is_3d: is3D,
      shape_params: typedArgs.shapeParams,
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
      scenePath: typedArgs.scenePath,
      nodeType: nodeType,
      nodeName: typedArgs.nodeName,
      parentNodePath: typedArgs.parentNodePath,
      shapeType: typedArgs.shapeType,
      is3D: is3D,
    };

    if (typedArgs.shapeParams) {
      params.shapeParams = typedArgs.shapeParams;
    }

    const { stdout, stderr } = await executeOperation(
      'create_collision_shape',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create collision shape: ${stderr}`, [
        'Check if the parent node path exists',
        'Verify the parent is a physics body (RigidBody, CharacterBody, Area, StaticBody)',
        'Ensure shape parameters are valid',
      ]);
    }

        return createSuccessResponse(
          `CollisionShape created successfully: ${typedArgs.nodeName} (${nodeType} with ${typedArgs.shapeType})\n\nOutput: ${stdout}`,
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to create collision shape: ${errorMessage}`, [
          'Ensure Godot is installed correctly',
          'Verify the project path and scene path are accessible',
        ]);
      }
    }
  );
};
