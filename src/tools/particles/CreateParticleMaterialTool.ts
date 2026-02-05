/**
 * Create Particle Material Tool
 * Creates a ParticleProcessMaterial resource for GPU particles
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logDebug } from '../../utils/Logger.js';
import {
  CreateParticleMaterialSchema,
  CreateParticleMaterialInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createParticleMaterialDefinition: ToolDefinition = {
  name: 'create_particle_material',
  description: 'Create a ParticleProcessMaterial resource for configuring GPU particle behavior',
  inputSchema: toMcpSchema(CreateParticleMaterialSchema),
};

export const handleCreateParticleMaterial = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateParticleMaterialSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and materialPath',
    ]);
  }

  const typedArgs: CreateParticleMaterialInput = validation.data;

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
