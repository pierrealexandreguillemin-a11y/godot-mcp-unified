/**
 * Create GPU Particles Tool
 * Creates GPUParticles2D or GPUParticles3D nodes
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

export interface CreateGPUParticlesArgs extends BaseToolArgs {
  projectPath: string;
  scenePath: string;
  nodeName: string;
  parentNodePath?: string;
  is3D?: boolean;
  amount?: number;
  lifetime?: number;
  oneShot?: boolean;
  preprocess?: number;
  emitting?: boolean;
  materialPath?: string;
}

export const createGPUParticlesDefinition: ToolDefinition = {
  name: 'create_gpu_particles',
  description: 'Create a GPUParticles2D or GPUParticles3D node for particle effects',
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
        description: 'Name for the GPUParticles node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to parent node (default: root)',
      },
      is3D: {
        type: 'boolean',
        description: 'Create 3D particles (default: false for 2D)',
      },
      amount: {
        type: 'number',
        description: 'Number of particles (default: 8)',
      },
      lifetime: {
        type: 'number',
        description: 'Lifetime in seconds (default: 1.0)',
      },
      oneShot: {
        type: 'boolean',
        description: 'Emit only once (default: false)',
      },
      preprocess: {
        type: 'number',
        description: 'Preprocess time in seconds (default: 0)',
      },
      emitting: {
        type: 'boolean',
        description: 'Start emitting immediately (default: true)',
      },
      materialPath: {
        type: 'string',
        description: 'Path to ParticleProcessMaterial resource',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName'],
  },
};

export const handleCreateGPUParticles = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeName',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, and nodeName',
    ]);
  }

  const typedArgs = preparedArgs as CreateGPUParticlesArgs;

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create GPU particles: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
    ]);
  }
};
