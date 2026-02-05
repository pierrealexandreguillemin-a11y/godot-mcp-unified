/**
 * Create Shader Material Tool
 * Creates a ShaderMaterial resource file (.tres) that references a shader
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
  CreateShaderMaterialSchema,
  CreateShaderMaterialInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createShaderMaterialDefinition: ToolDefinition = {
  name: 'create_shader_material',
  description: 'Create a ShaderMaterial resource that references a shader file',
  inputSchema: toMcpSchema(CreateShaderMaterialSchema),
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

  // Zod validation
  const validation = safeValidateInput(CreateShaderMaterialSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, materialPath, and shaderPath',
    ]);
  }

  const typedArgs: CreateShaderMaterialInput = validation.data;

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
