/**
 * Create Particle Material Tool
 * Creates a ParticleProcessMaterial resource for GPU particles
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logDebug } from '../../utils/Logger';

export interface CreateParticleMaterialArgs extends BaseToolArgs {
  projectPath: string;
  materialPath: string;
  emissionShape?: 'point' | 'sphere' | 'sphere_surface' | 'box' | 'ring';
  direction?: { x: number; y: number; z: number };
  spread?: number;
  gravity?: { x: number; y: number; z: number };
  initialVelocityMin?: number;
  initialVelocityMax?: number;
  angularVelocityMin?: number;
  angularVelocityMax?: number;
  scaleMin?: number;
  scaleMax?: number;
  color?: { r: number; g: number; b: number; a?: number };
}

export const createParticleMaterialDefinition: ToolDefinition = {
  name: 'create_particle_material',
  description: 'Create a ParticleProcessMaterial resource for configuring GPU particle behavior',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      materialPath: {
        type: 'string',
        description: 'Path for the material file (e.g., "particles/fire_mat.tres")',
      },
      emissionShape: {
        type: 'string',
        description: 'Emission shape: point, sphere, sphere_surface, box, ring',
        enum: ['point', 'sphere', 'sphere_surface', 'box', 'ring'],
      },
      direction: {
        type: 'object',
        description: 'Emission direction (default: { x: 0, y: -1, z: 0 } for upward)',
      },
      spread: {
        type: 'number',
        description: 'Spread angle in degrees (default: 45)',
      },
      gravity: {
        type: 'object',
        description: 'Gravity vector (default: { x: 0, y: 98, z: 0 })',
      },
      initialVelocityMin: {
        type: 'number',
        description: 'Minimum initial velocity (default: 0)',
      },
      initialVelocityMax: {
        type: 'number',
        description: 'Maximum initial velocity (default: 0)',
      },
      angularVelocityMin: {
        type: 'number',
        description: 'Minimum angular velocity in degrees/sec',
      },
      angularVelocityMax: {
        type: 'number',
        description: 'Maximum angular velocity in degrees/sec',
      },
      scaleMin: {
        type: 'number',
        description: 'Minimum particle scale (default: 1)',
      },
      scaleMax: {
        type: 'number',
        description: 'Maximum particle scale (default: 1)',
      },
      color: {
        type: 'object',
        description: 'Particle color { r, g, b, a }',
      },
    },
    required: ['projectPath', 'materialPath'],
  },
};

export const handleCreateParticleMaterial = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'materialPath',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath and materialPath',
    ]);
  }

  const typedArgs = preparedArgs as CreateParticleMaterialArgs;

  // Validate material path extension
  if (!typedArgs.materialPath.endsWith('.tres') && !typedArgs.materialPath.endsWith('.res')) {
    return createErrorResponse('Material path must end with .tres or .res', [
      'Example: particles/fire_mat.tres',
    ]);
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    // Map emission shape to Godot enum
    const emissionShapeMap: Record<string, number> = {
      point: 0,
      sphere: 1,
      sphere_surface: 2,
      box: 3,
      ring: 4,
    };

    // Build material resource content
    let materialContent = '[gd_resource type="ParticleProcessMaterial" format=3]\n\n';
    materialContent += '[resource]\n';

    // Emission shape
    if (typedArgs.emissionShape) {
      materialContent += `emission_shape = ${emissionShapeMap[typedArgs.emissionShape] ?? 0}\n`;
    }

    // Direction
    const dir = typedArgs.direction ?? { x: 0, y: -1, z: 0 };
    materialContent += `direction = Vector3(${dir.x}, ${dir.y}, ${dir.z})\n`;

    // Spread
    materialContent += `spread = ${typedArgs.spread ?? 45.0}\n`;

    // Gravity
    const grav = typedArgs.gravity ?? { x: 0, y: 98, z: 0 };
    materialContent += `gravity = Vector3(${grav.x}, ${grav.y}, ${grav.z})\n`;

    // Initial velocity
    if (typedArgs.initialVelocityMin !== undefined) {
      materialContent += `initial_velocity_min = ${typedArgs.initialVelocityMin}\n`;
    }
    if (typedArgs.initialVelocityMax !== undefined) {
      materialContent += `initial_velocity_max = ${typedArgs.initialVelocityMax}\n`;
    }

    // Angular velocity
    if (typedArgs.angularVelocityMin !== undefined) {
      materialContent += `angular_velocity_min = ${typedArgs.angularVelocityMin}\n`;
    }
    if (typedArgs.angularVelocityMax !== undefined) {
      materialContent += `angular_velocity_max = ${typedArgs.angularVelocityMax}\n`;
    }

    // Scale
    if (typedArgs.scaleMin !== undefined) {
      materialContent += `scale_min = ${typedArgs.scaleMin}\n`;
    }
    if (typedArgs.scaleMax !== undefined) {
      materialContent += `scale_max = ${typedArgs.scaleMax}\n`;
    }

    // Color
    if (typedArgs.color) {
      const c = typedArgs.color;
      const a = c.a ?? 1.0;
      materialContent += `color = Color(${c.r}, ${c.g}, ${c.b}, ${a})\n`;
    }

    // Write material file
    const materialFullPath = path.join(typedArgs.projectPath, typedArgs.materialPath);
    const materialDir = path.dirname(materialFullPath);

    await fs.ensureDir(materialDir);
    await fs.writeFile(materialFullPath, materialContent, 'utf-8');

    logDebug(`Created particle material at ${typedArgs.materialPath}`);

    return createSuccessResponse(
      `ParticleProcessMaterial created successfully at ${typedArgs.materialPath}\nEmission shape: ${typedArgs.emissionShape ?? 'point'}\nSpread: ${typedArgs.spread ?? 45}°`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create particle material: ${errorMessage}`, [
      'Ensure the project path is accessible',
    ]);
  }
};
