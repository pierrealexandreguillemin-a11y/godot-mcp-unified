/**
 * Create GPU Particles Tool
 * Creates GPUParticles2D or GPUParticles3D nodes
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
  CreateGPUParticlesSchema,
  CreateGPUParticlesInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createGPUParticlesDefinition: ToolDefinition = {
  name: 'create_gpu_particles',
  description: 'Create a GPUParticles2D or GPUParticles3D node for particle effects',
  inputSchema: toMcpSchema(CreateGPUParticlesSchema),
};

export const handleCreateGPUParticles = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateGPUParticlesSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, and nodeName',
    ]);
  }

  const typedArgs: CreateGPUParticlesInput = validation.data;

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

    const is3D = typedArgs.is3D ?? false;
    const nodeType = is3D ? 'GPUParticles3D' : 'GPUParticles2D';
    logDebug(`Creating ${nodeType}: ${typedArgs.nodeName}`);

    const params: BaseToolArgs = {
      scene_path: typedArgs.scenePath,
      node_name: typedArgs.nodeName,
      parent_node_path: typedArgs.parentNodePath ?? '',
      is_3d: is3D,
    };

    if (typedArgs.amount !== undefined) {
      params.amount = typedArgs.amount;
    }

    if (typedArgs.lifetime !== undefined) {
      params.lifetime = typedArgs.lifetime;
    }

    if (typedArgs.oneShot !== undefined) {
      params.one_shot = typedArgs.oneShot;
    }

    if (typedArgs.preprocess !== undefined) {
      params.preprocess = typedArgs.preprocess;
    }

    if (typedArgs.emitting !== undefined) {
      params.emitting = typedArgs.emitting;
    }

    if (typedArgs.materialPath) {
      params.material_path = typedArgs.materialPath;
    }

    // Build properties for bridge
    const bridgeProperties: Record<string, unknown> = {};
    if (typedArgs.amount !== undefined) bridgeProperties.amount = typedArgs.amount;
    if (typedArgs.lifetime !== undefined) bridgeProperties.lifetime = typedArgs.lifetime;
    if (typedArgs.oneShot !== undefined) bridgeProperties.one_shot = typedArgs.oneShot;
    if (typedArgs.preprocess !== undefined) bridgeProperties.preprocess = typedArgs.preprocess;
    if (typedArgs.emitting !== undefined) bridgeProperties.emitting = typedArgs.emitting;
    if (typedArgs.materialPath) bridgeProperties.process_material = typedArgs.materialPath;

    // Use bridge if available, fallback to GodotExecutor
    return await executeWithBridge(
      'add_node',
      {
        scene_path: typedArgs.scenePath,
        node_type: nodeType,
        node_name: typedArgs.nodeName,
        parent_path: typedArgs.parentNodePath ?? '.',
        properties: bridgeProperties,
      },
      async () => {
        const { stdout, stderr } = await executeOperation(
          'create_gpu_particles',
          params,
          typedArgs.projectPath,
          godotPath,
        );

        if (stderr && stderr.includes('Failed to')) {
          return createErrorResponse(`Failed to create GPU particles: ${stderr}`, [
            'Check if the parent node exists',
            'Verify the scene path is correct',
          ]);
        }

        return createSuccessResponse(
          `GPUParticles created successfully: ${typedArgs.nodeName} (${nodeType})\nAmount: ${typedArgs.amount ?? 8}\n\nOutput: ${stdout}`,
        );
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create GPU particles: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
    ]);
  }
};
