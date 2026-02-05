/**
 * Create Shader Tool
 * Creates a .gdshader file with specified shader type and content
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
  CreateShaderSchema,
  CreateShaderInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createShaderDefinition: ToolDefinition = {
  name: 'create_shader',
  description: 'Create a .gdshader file with specified shader type and code',
  inputSchema: toMcpSchema(CreateShaderSchema),
};

export const handleCreateShader = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateShaderSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, shaderPath, and shaderType',
    ]);
  }

  const typedArgs: CreateShaderInput = validation.data;

  // Validate shader path extension
  if (!typedArgs.shaderPath.endsWith('.gdshader')) {
    return createErrorResponse('Shader path must end with .gdshader', [
      'Example: shaders/my_shader.gdshader',
    ]);
  }

  // Validate shader type
  const validShaderTypes = ['spatial', 'canvas_item', 'particles', 'sky', 'fog'];
  if (!validShaderTypes.includes(typedArgs.shaderType)) {
    return createErrorResponse(`Invalid shader type: ${typedArgs.shaderType}`, [
      'Valid types: spatial, canvas_item, particles, sky, fog',
    ]);
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    // Build shader content
    let shaderContent = `shader_type ${typedArgs.shaderType};\n`;

    // Add render modes if provided
    if (typedArgs.renderMode && typedArgs.renderMode.length > 0) {
      shaderContent += `render_mode ${typedArgs.renderMode.join(', ')};\n`;
    }

    shaderContent += '\n';

    // Add vertex function if provided
    if (typedArgs.vertexCode) {
      shaderContent += 'void vertex() {\n';
      shaderContent += `\t${typedArgs.vertexCode.replace(/\n/g, '\n\t')}\n`;
      shaderContent += '}\n\n';
    }

    // Add fragment function if provided
    if (typedArgs.fragmentCode) {
      shaderContent += 'void fragment() {\n';
      shaderContent += `\t${typedArgs.fragmentCode.replace(/\n/g, '\n\t')}\n`;
      shaderContent += '}\n\n';
    }

    // Add light function if provided
    if (typedArgs.lightCode) {
      shaderContent += 'void light() {\n';
      shaderContent += `\t${typedArgs.lightCode.replace(/\n/g, '\n\t')}\n`;
      shaderContent += '}\n';
    }

    // Write shader file
    const shaderFullPath = path.join(typedArgs.projectPath, typedArgs.shaderPath);
    const shaderDir = path.dirname(shaderFullPath);

    await fs.ensureDir(shaderDir);
    await fs.writeFile(shaderFullPath, shaderContent, 'utf-8');

    logDebug(`Created shader at ${typedArgs.shaderPath}`);

    return createSuccessResponse(
      `Shader created successfully at ${typedArgs.shaderPath}\nType: ${typedArgs.shaderType}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create shader: ${errorMessage}`, [
      'Ensure the project path is accessible',
    ]);
  }
};
