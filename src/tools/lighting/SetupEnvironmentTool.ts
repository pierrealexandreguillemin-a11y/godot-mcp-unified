/**
 * Setup Environment Tool
 * Creates or configures WorldEnvironment with Environment resource
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
import * as fs from 'fs-extra';
import * as path from 'path';
import { logDebug } from '../../utils/Logger.js';
import {
  SetupEnvironmentSchema,
  SetupEnvironmentInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const setupEnvironmentDefinition: ToolDefinition = {
  name: 'setup_environment',
  description: 'Create an Environment resource for 3D scene settings (lighting, fog, post-processing)',
  inputSchema: toMcpSchema(SetupEnvironmentSchema),
};

// Map background mode to Godot enum
const backgroundModeMap: Record<string, number> = {
  clear_color: 0,
  custom_color: 1,
  sky: 2,
  canvas: 3,
  keep: 4,
  camera_feed: 5,
};

// Map tonemap mode to Godot enum
const tonemapModeMap: Record<string, number> = {
  linear: 0,
  reinhard: 1,
  filmic: 2,
  aces: 3,
};

export const handleSetupEnvironment = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(SetupEnvironmentSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and environmentPath',
    ]);
  }

  const typedArgs: SetupEnvironmentInput = validation.data;

  // Validate environment path extension
  if (!typedArgs.environmentPath.endsWith('.tres') && !typedArgs.environmentPath.endsWith('.res')) {
    return createErrorResponse('Environment path must end with .tres or .res', [
      'Example: environments/main_env.tres',
    ]);
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    // Build environment resource content
    let envContent = '[gd_resource type="Environment" format=3]\n\n';
    envContent += '[resource]\n';

    // Background
    if (typedArgs.backgroundMode) {
      envContent += `background_mode = ${backgroundModeMap[typedArgs.backgroundMode] ?? 0}\n`;
    }

    if (typedArgs.backgroundColor) {
      const c = typedArgs.backgroundColor;
      envContent += `background_color = Color(${c.r}, ${c.g}, ${c.b}, 1)\n`;
    }

    // Ambient light
    if (typedArgs.ambientLightColor) {
      const c = typedArgs.ambientLightColor;
      envContent += `ambient_light_color = Color(${c.r}, ${c.g}, ${c.b}, 1)\n`;
    }

    if (typedArgs.ambientLightEnergy !== undefined) {
      envContent += `ambient_light_energy = ${typedArgs.ambientLightEnergy}\n`;
    }

    // Tonemap
    if (typedArgs.tonemapMode) {
      envContent += `tonemap_mode = ${tonemapModeMap[typedArgs.tonemapMode] ?? 0}\n`;
    }

    // Glow
    if (typedArgs.glowEnabled !== undefined) {
      envContent += `glow_enabled = ${typedArgs.glowEnabled}\n`;
    }

    if (typedArgs.glowIntensity !== undefined) {
      envContent += `glow_intensity = ${typedArgs.glowIntensity}\n`;
    }

    // Fog
    if (typedArgs.fogEnabled !== undefined) {
      envContent += `fog_enabled = ${typedArgs.fogEnabled}\n`;
    }

    if (typedArgs.fogDensity !== undefined) {
      envContent += `fog_density = ${typedArgs.fogDensity}\n`;
    }

    if (typedArgs.fogColor) {
      const c = typedArgs.fogColor;
      envContent += `fog_light_color = Color(${c.r}, ${c.g}, ${c.b}, 1)\n`;
    }

    // SSAO
    if (typedArgs.ssaoEnabled !== undefined) {
      envContent += `ssao_enabled = ${typedArgs.ssaoEnabled}\n`;
    }

    // SSR
    if (typedArgs.ssrEnabled !== undefined) {
      envContent += `ssr_enabled = ${typedArgs.ssrEnabled}\n`;
    }

    // SDFGI
    if (typedArgs.sdfgiEnabled !== undefined) {
      envContent += `sdfgi_enabled = ${typedArgs.sdfgiEnabled}\n`;
    }

    // Write environment file
    const envFullPath = path.join(typedArgs.projectPath, typedArgs.environmentPath);
    const envDir = path.dirname(envFullPath);

    await fs.ensureDir(envDir);
    await fs.writeFile(envFullPath, envContent, 'utf-8');

    logDebug(`Created environment at ${typedArgs.environmentPath}`);

    const features: string[] = [];
    if (typedArgs.glowEnabled) features.push('Glow');
    if (typedArgs.fogEnabled) features.push('Fog');
    if (typedArgs.ssaoEnabled) features.push('SSAO');
    if (typedArgs.ssrEnabled) features.push('SSR');
    if (typedArgs.sdfgiEnabled) features.push('SDFGI');

    return createSuccessResponse(
      `Environment created successfully at ${typedArgs.environmentPath}\nBackground: ${typedArgs.backgroundMode ?? 'clear_color'}\nFeatures: ${features.length > 0 ? features.join(', ') : 'None'}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create environment: ${errorMessage}`, [
      'Ensure the project path is accessible',
    ]);
  }
};
