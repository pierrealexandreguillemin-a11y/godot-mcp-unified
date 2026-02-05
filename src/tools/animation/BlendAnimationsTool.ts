/**
 * Blend Animations Tool
 * Configures blend spaces (BlendSpace1D/2D) for smooth animation transitions
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import {
  ToolDefinition,
  ToolResponse,
  BaseToolArgs,
  BlendPoint1D,
  BlendPoint2D,
} from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  BlendAnimationsSchema,
  BlendAnimationsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

// Re-export for consumers
export type { BlendPoint1D, BlendPoint2D };

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
  inputSchema: toMcpSchema(BlendAnimationsSchema),
};

export const handleBlendAnimations = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(BlendAnimationsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, animTreePath, blendSpaceName, type, and points',
    ]);
  }

  const typedArgs: BlendAnimationsInput = validation.data;

  // Validate scenePath extension
  if (!typedArgs.scenePath.endsWith('.tscn') && !typedArgs.scenePath.endsWith('.scn')) {
    return createErrorResponse('scenePath must be a scene file (.tscn or .scn)', [
      `Received: "${typedArgs.scenePath}"`,
    ]);
  }

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

  // Validate numeric parameters
  if (typedArgs.minSpace !== undefined) {
    if (typeof typedArgs.minSpace !== 'number' || !Number.isFinite(typedArgs.minSpace)) {
      return createErrorResponse('minSpace must be a finite number', [
        'Provide minSpace as a valid number',
      ]);
    }
  }
  if (typedArgs.maxSpace !== undefined) {
    if (typeof typedArgs.maxSpace !== 'number' || !Number.isFinite(typedArgs.maxSpace)) {
      return createErrorResponse('maxSpace must be a finite number', [
        'Provide maxSpace as a valid number',
      ]);
    }
  }
  if (typedArgs.minSpace !== undefined && typedArgs.maxSpace !== undefined) {
    if (typedArgs.minSpace >= typedArgs.maxSpace) {
      return createErrorResponse('minSpace must be less than maxSpace', [
        `Current: minSpace=${typedArgs.minSpace}, maxSpace=${typedArgs.maxSpace}`,
      ]);
    }
  }
  if (typedArgs.type === '2d') {
    if (typedArgs.minSpaceY !== undefined) {
      if (typeof typedArgs.minSpaceY !== 'number' || !Number.isFinite(typedArgs.minSpaceY)) {
        return createErrorResponse('minSpaceY must be a finite number', [
          'Provide minSpaceY as a valid number',
        ]);
      }
    }
    if (typedArgs.maxSpaceY !== undefined) {
      if (typeof typedArgs.maxSpaceY !== 'number' || !Number.isFinite(typedArgs.maxSpaceY)) {
        return createErrorResponse('maxSpaceY must be a finite number', [
          'Provide maxSpaceY as a valid number',
        ]);
      }
    }
    if (typedArgs.minSpaceY !== undefined && typedArgs.maxSpaceY !== undefined) {
      if (typedArgs.minSpaceY >= typedArgs.maxSpaceY) {
        return createErrorResponse('minSpaceY must be less than maxSpaceY', [
          `Current: minSpaceY=${typedArgs.minSpaceY}, maxSpaceY=${typedArgs.maxSpaceY}`,
        ]);
      }
    }
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
