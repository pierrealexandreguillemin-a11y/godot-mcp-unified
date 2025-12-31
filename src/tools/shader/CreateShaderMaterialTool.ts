/**
 * Create Shader Material Tool
 * Creates a ShaderMaterial resource file (.tres) that references a shader
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

export interface CreateShaderMaterialArgs extends BaseToolArgs {
  projectPath: string;
  materialPath: string;
  shaderPath: string;
  parameters?: Record<string, unknown>;
}

export const createShaderMaterialDefinition: ToolDefinition = {
  name: 'create_shader_material',
  description: 'Create a ShaderMaterial resource that references a shader file',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      materialPath: {
        type: 'string',
        description: 'Path for the material file (e.g., "materials/my_mat.tres")',
      },
      shaderPath: {
        type: 'string',
        description: 'Path to the shader file (e.g., "shaders/my_shader.gdshader")',
      },
      parameters: {
        type: 'object',
        description: 'Shader parameters to set (uniform values)',
      },
    },
    required: ['projectPath', 'materialPath', 'shaderPath'],
  },
};

// Format value for Godot resource file
const formatValue = (value: unknown): string => {
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, number>;
    if ('x' in obj && 'y' in obj && 'z' in obj && 'w' in obj) {
      return `Vector4(${obj.x}, ${obj.y}, ${obj.z}, ${obj.w})`;
    }
    if ('x' in obj && 'y' in obj && 'z' in obj) {
      return `Vector3(${obj.x}, ${obj.y}, ${obj.z})`;
    }
    if ('x' in obj && 'y' in obj) {
      return `Vector2(${obj.x}, ${obj.y})`;
    }
    if ('r' in obj && 'g' in obj && 'b' in obj) {
      const a = 'a' in obj ? obj.a : 1;
      return `Color(${obj.r}, ${obj.g}, ${obj.b}, ${a})`;
    }
  }
  return String(value);
};

export const handleCreateShaderMaterial = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'materialPath',
    'shaderPath',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, materialPath, and shaderPath',
    ]);
  }

  const typedArgs = preparedArgs as CreateShaderMaterialArgs;

  // Validate material path extension
  if (!typedArgs.materialPath.endsWith('.tres') && !typedArgs.materialPath.endsWith('.res')) {
    return createErrorResponse('Material path must end with .tres or .res', [
      'Example: materials/my_mat.tres',
    ]);
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    // Build shader path for Godot (res:// format)
    let godotShaderPath = typedArgs.shaderPath;
    if (!godotShaderPath.startsWith('res://')) {
      godotShaderPath = `res://${godotShaderPath}`;
    }

    // Build material resource content
    let materialContent = '[gd_resource type="ShaderMaterial" load_steps=2 format=3]\n\n';
    materialContent += `[ext_resource type="Shader" path="${godotShaderPath}" id="1"]\n\n`;
    materialContent += '[resource]\n';
    materialContent += 'shader = ExtResource("1")\n';

    // Add parameters if provided
    if (typedArgs.parameters) {
      for (const [key, value] of Object.entries(typedArgs.parameters)) {
        materialContent += `shader_parameter/${key} = ${formatValue(value)}\n`;
      }
    }

    // Write material file
    const materialFullPath = path.join(typedArgs.projectPath, typedArgs.materialPath);
    const materialDir = path.dirname(materialFullPath);

    await fs.ensureDir(materialDir);
    await fs.writeFile(materialFullPath, materialContent, 'utf-8');

    logDebug(`Created shader material at ${typedArgs.materialPath}`);

    return createSuccessResponse(
      `ShaderMaterial created successfully at ${typedArgs.materialPath}\nShader: ${typedArgs.shaderPath}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create shader material: ${errorMessage}`, [
      'Ensure the project path is accessible',
    ]);
  }
};
