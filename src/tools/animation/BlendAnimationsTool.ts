/**
 * Blend Animations Tool
 * Configures blend spaces (BlendSpace1D/2D) for smooth animation transitions
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, SceneToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';

export interface BlendPoint1D {
  animation: string;
  position: number;
}

export interface BlendPoint2D {
  animation: string;
  positionX: number;
  positionY: number;
}

export interface BlendAnimationsArgs extends SceneToolArgs {
  animTreePath: string;
  blendSpaceName: string;
  type: '1d' | '2d';
  points: BlendPoint1D[] | BlendPoint2D[];
  minSpace?: number;
  maxSpace?: number;
  minSpaceY?: number;
  maxSpaceY?: number;
  blendMode?: 'interpolated' | 'discrete' | 'carry';
  sync?: boolean;
}

export interface BlendAnimationsResult {
  animTreePath: string;
  blendSpaceName: string;
  type: '1d' | '2d';
  pointsAdded: number;
  message: string;
}

export const blendAnimationsDefinition: ToolDefinition = {
  name: 'blend_animations',
  description:
    'Configure BlendSpace1D or BlendSpace2D for smooth animation blending based on parameters',
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
      animTreePath: {
        type: 'string',
        description: 'Path to the AnimationTree node in the scene',
      },
      blendSpaceName: {
        type: 'string',
        description: 'Name for the blend space node in the tree',
      },
      type: {
        type: 'string',
        description: 'Blend space type: 1d or 2d',
        enum: ['1d', '2d'],
      },
      points: {
        type: 'array',
        description:
          'Blend points: for 1D: {animation, position}, for 2D: {animation, positionX, positionY}',
        items: {
          type: 'object',
          properties: {
            animation: { type: 'string', description: 'Animation name' },
            position: { type: 'number', description: '1D position' },
            positionX: { type: 'number', description: '2D X position' },
            positionY: { type: 'number', description: '2D Y position' },
          },
        },
      },
      minSpace: {
        type: 'number',
        description: 'Minimum value for blend parameter (default: -1)',
      },
      maxSpace: {
        type: 'number',
        description: 'Maximum value for blend parameter (default: 1)',
      },
      minSpaceY: {
        type: 'number',
        description: '2D only: minimum Y value (default: -1)',
      },
      maxSpaceY: {
        type: 'number',
        description: '2D only: maximum Y value (default: 1)',
      },
      blendMode: {
        type: 'string',
        description: 'Blend mode: interpolated, discrete, or carry',
        enum: ['interpolated', 'discrete', 'carry'],
      },
      sync: {
        type: 'boolean',
        description: 'Synchronize animation lengths (default: false)',
      },
    },
    required: ['projectPath', 'scenePath', 'animTreePath', 'blendSpaceName', 'type', 'points'],
  },
};

export const handleBlendAnimations = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'animTreePath',
    'blendSpaceName',
    'type',
    'points',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, animTreePath, blendSpaceName, type, and points',
    ]);
  }

  const typedArgs = preparedArgs as BlendAnimationsArgs;

  // Validate type
  if (typedArgs.type !== '1d' && typedArgs.type !== '2d') {
    return createErrorResponse('Invalid blend space type', ['Use "1d" or "2d"']);
  }

  // Validate points array
  if (!Array.isArray(typedArgs.points) || typedArgs.points.length === 0) {
    return createErrorResponse('points must be a non-empty array', [
      'Provide at least one blend point',
    ]);
  }

  // Validate each point based on type
  for (let i = 0; i < typedArgs.points.length; i++) {
    const point = typedArgs.points[i];

    if (!point.animation || typeof point.animation !== 'string') {
      return createErrorResponse(`Point ${i}: 'animation' is required`, [
        'Each point needs an animation name',
      ]);
    }

    if (typedArgs.type === '1d') {
      const p = point as BlendPoint1D;
      if (typeof p.position !== 'number') {
        return createErrorResponse(`Point ${i}: 'position' is required for 1D blend space`, [
          'Provide position as a number for 1D points',
        ]);
      }
    } else {
      const p = point as BlendPoint2D;
      if (typeof p.positionX !== 'number' || typeof p.positionY !== 'number') {
        return createErrorResponse(
          `Point ${i}: 'positionX' and 'positionY' are required for 2D blend space`,
          ['Provide positionX and positionY for 2D points'],
        );
      }
    }
  }

  // Validate blendMode if provided
  if (
    typedArgs.blendMode &&
    !['interpolated', 'discrete', 'carry'].includes(typedArgs.blendMode)
  ) {
    return createErrorResponse('Invalid blendMode', [
      'Use one of: interpolated, discrete, carry',
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

    logDebug(
      `Creating BlendSpace${typedArgs.type.toUpperCase()} '${typedArgs.blendSpaceName}' with ${typedArgs.points.length} points`,
    );

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      animTreePath: typedArgs.animTreePath,
      blendSpaceName: typedArgs.blendSpaceName,
      type: typedArgs.type,
      points: typedArgs.points,
    };

    if (typedArgs.minSpace !== undefined) {
      params.minSpace = typedArgs.minSpace;
    }
    if (typedArgs.maxSpace !== undefined) {
      params.maxSpace = typedArgs.maxSpace;
    }
    if (typedArgs.type === '2d') {
      if (typedArgs.minSpaceY !== undefined) {
        params.minSpaceY = typedArgs.minSpaceY;
      }
      if (typedArgs.maxSpaceY !== undefined) {
        params.maxSpaceY = typedArgs.maxSpaceY;
      }
    }
    if (typedArgs.blendMode) {
      params.blendMode = typedArgs.blendMode;
    }
    if (typedArgs.sync !== undefined) {
      params.sync = typedArgs.sync;
    }

    const { stderr } = await executeOperation(
      'blend_animations',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to configure blend space: ${stderr}`, [
        'Check if the AnimationTree node exists',
        'Verify animation names are correct',
      ]);
    }

    const result: BlendAnimationsResult = {
      animTreePath: typedArgs.animTreePath,
      blendSpaceName: typedArgs.blendSpaceName,
      type: typedArgs.type,
      pointsAdded: typedArgs.points.length,
      message: `BlendSpace${typedArgs.type.toUpperCase()} '${typedArgs.blendSpaceName}' configured with ${typedArgs.points.length} blend points`,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to configure blend space: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the AnimationTree path is correct',
    ]);
  }
};
