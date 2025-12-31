/**
 * Create Collision Shape Tool
 * Creates a CollisionShape2D or CollisionShape3D node with a specified shape
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, CreateCollisionShapeArgs } from '../../server/types';
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

export const createCollisionShapeDefinition: ToolDefinition = {
  name: 'create_collision_shape',
  description: 'Create a CollisionShape2D or CollisionShape3D node with a specified shape type',
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
        description: 'Name for the CollisionShape node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to the parent node (should be a physics body like RigidBody2D, CharacterBody2D, etc.)',
      },
      shapeType: {
        type: 'string',
        description: '2D shapes: rectangle, circle, capsule, polygon. 3D shapes: box, sphere, capsule, cylinder, convex',
        enum: ['rectangle', 'circle', 'capsule', 'polygon', 'box', 'sphere', 'cylinder', 'convex'],
      },
      is3D: {
        type: 'boolean',
        description: 'Whether to create a 3D collision shape (default: false for 2D)',
      },
      shapeParams: {
        type: 'object',
        description: 'Shape parameters: size (Vector2/Vector3), radius (number), height (number), points (Vector2[] for polygon)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName', 'parentNodePath', 'shapeType'],
  },
};

export const handleCreateCollisionShape = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeName',
    'parentNodePath',
    'shapeType',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodeName, parentNodePath, and shapeType',
    ]);
  }

  const typedArgs = preparedArgs as CreateCollisionShapeArgs;

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

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    const nodeType = is3D ? 'CollisionShape3D' : 'CollisionShape2D';
    logDebug(`Creating ${nodeType} with ${typedArgs.shapeType} shape in scene: ${typedArgs.scenePath}`);

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
};
