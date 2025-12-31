/**
 * Setup Environment Tool
 * Creates or configures WorldEnvironment with Environment resource
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

export interface SetupEnvironmentArgs extends BaseToolArgs {
  projectPath: string;
  environmentPath: string;
  backgroundMode?: 'clear_color' | 'custom_color' | 'sky' | 'canvas' | 'keep' | 'camera_feed';
  backgroundColor?: { r: number; g: number; b: number };
  ambientLightColor?: { r: number; g: number; b: number };
  ambientLightEnergy?: number;
  tonemapMode?: 'linear' | 'reinhard' | 'filmic' | 'aces';
  glowEnabled?: boolean;
  glowIntensity?: number;
  fogEnabled?: boolean;
  fogDensity?: number;
  fogColor?: { r: number; g: number; b: number };
  ssaoEnabled?: boolean;
  ssrEnabled?: boolean;
  sdfgiEnabled?: boolean;
}

export const setupEnvironmentDefinition: ToolDefinition = {
  name: 'setup_environment',
  description: 'Create an Environment resource for 3D scene settings (lighting, fog, post-processing)',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      environmentPath: {
        type: 'string',
        description: 'Path for the environment resource (e.g., "environments/main_env.tres")',
      },
      backgroundMode: {
        type: 'string',
        description: 'Background mode',
        enum: ['clear_color', 'custom_color', 'sky', 'canvas', 'keep', 'camera_feed'],
      },
      backgroundColor: {
        type: 'object',
        description: 'Background color { r, g, b } (for custom_color mode)',
      },
      ambientLightColor: {
        type: 'object',
        description: 'Ambient light color { r, g, b }',
      },
      ambientLightEnergy: {
        type: 'number',
        description: 'Ambient light energy (default: 1.0)',
      },
      tonemapMode: {
        type: 'string',
        description: 'Tonemap mode',
        enum: ['linear', 'reinhard', 'filmic', 'aces'],
      },
      glowEnabled: {
        type: 'boolean',
        description: 'Enable glow effect',
      },
      glowIntensity: {
        type: 'number',
        description: 'Glow intensity (default: 0.8)',
      },
      fogEnabled: {
        type: 'boolean',
        description: 'Enable volumetric fog',
      },
      fogDensity: {
        type: 'number',
        description: 'Fog density (default: 0.01)',
      },
      fogColor: {
        type: 'object',
        description: 'Fog color { r, g, b }',
      },
      ssaoEnabled: {
        type: 'boolean',
        description: 'Enable SSAO (Screen Space Ambient Occlusion)',
      },
      ssrEnabled: {
        type: 'boolean',
        description: 'Enable SSR (Screen Space Reflections)',
      },
      sdfgiEnabled: {
        type: 'boolean',
        description: 'Enable SDFGI (Signed Distance Field Global Illumination)',
      },
    },
    required: ['projectPath', 'environmentPath'],
  },
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

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'environmentPath',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath and environmentPath',
    ]);
  }

  const typedArgs = preparedArgs as SetupEnvironmentArgs;

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
