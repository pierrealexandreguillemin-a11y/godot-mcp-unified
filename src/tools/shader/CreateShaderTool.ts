/**
 * Create Shader Tool
 * Creates a .gdshader file with specified shader type and content
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

export interface CreateShaderArgs extends BaseToolArgs {
  projectPath: string;
  shaderPath: string;
  shaderType: 'spatial' | 'canvas_item' | 'particles' | 'sky' | 'fog';
  renderMode?: string[];
  vertexCode?: string;
  fragmentCode?: string;
  lightCode?: string;
}

export const createShaderDefinition: ToolDefinition = {
  name: 'create_shader',
  description: 'Create a .gdshader file with specified shader type and code',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      shaderPath: {
        type: 'string',
        description: 'Path for the shader file (e.g., "shaders/my_shader.gdshader")',
      },
      shaderType: {
        type: 'string',
        description: 'Type of shader',
        enum: ['spatial', 'canvas_item', 'particles', 'sky', 'fog'],
      },
      renderMode: {
        type: 'array',
        description: 'Render modes (e.g., ["unshaded", "cull_disabled"])',
        items: { type: 'string' },
      },
      vertexCode: {
        type: 'string',
        description: 'Code for vertex() function',
      },
      fragmentCode: {
        type: 'string',
        description: 'Code for fragment() function',
      },
      lightCode: {
        type: 'string',
        description: 'Code for light() function',
      },
    },
    required: ['projectPath', 'shaderPath', 'shaderType'],
  },
};

export const handleCreateShader = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'shaderPath',
    'shaderType',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, shaderPath, and shaderType',
    ]);
  }

  const typedArgs = preparedArgs as CreateShaderArgs;

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
