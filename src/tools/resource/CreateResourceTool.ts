/**
 * Create Resource Tool
 * Creates .tres resource files (materials, styles, etc.)
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
import { logDebug } from '../../utils/Logger.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  CreateResourceSchema,
  CreateResourceInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export type ResourceType =
  | 'StandardMaterial3D'
  | 'ShaderMaterial'
  | 'StyleBoxFlat'
  | 'StyleBoxTexture'
  | 'Theme'
  | 'Environment'
  | 'Sky'
  | 'Gradient'
  | 'Curve'
  | 'AudioBusLayout'
  | 'Animation'
  | 'AnimationLibrary';

export const createResourceDefinition: ToolDefinition = {
  name: 'create_resource',
  description: 'Create a .tres resource file (materials, styles, etc.)',
  inputSchema: toMcpSchema(CreateResourceSchema),
};

/**
 * Get default properties for each resource type
 */
function getDefaultProperties(resourceType: ResourceType): Record<string, string> {
  switch (resourceType) {
    case 'StandardMaterial3D':
      return {
        albedo_color: 'Color(1, 1, 1, 1)',
        metallic: '0.0',
        roughness: '1.0',
      };

    case 'ShaderMaterial':
      return {};

    case 'StyleBoxFlat':
      return {
        bg_color: 'Color(0.6, 0.6, 0.6, 1)',
        border_width_left: '0',
        border_width_top: '0',
        border_width_right: '0',
        border_width_bottom: '0',
        corner_radius_top_left: '0',
        corner_radius_top_right: '0',
        corner_radius_bottom_right: '0',
        corner_radius_bottom_left: '0',
      };

    case 'StyleBoxTexture':
      return {
        texture: 'null',
      };

    case 'Theme':
      return {};

    case 'Environment':
      return {
        background_mode: '1',
        ambient_light_color: 'Color(0.2, 0.2, 0.2, 1)',
        ambient_light_energy: '1.0',
      };

    case 'Sky':
      return {
        sky_material: 'null',
      };

    case 'Gradient':
      return {
        colors: 'PackedColorArray(0, 0, 0, 1, 1, 1, 1, 1)',
        offsets: 'PackedFloat32Array(0, 1)',
      };

    case 'Curve':
      return {
        _data: '[Vector2(0, 0), 0.0, 0.0, 0, 0, Vector2(1, 1), 0.0, 0.0, 0, 0]',
        point_count: '2',
      };

    case 'AudioBusLayout':
      return {};

    case 'Animation':
      return {
        length: '1.0',
        loop_mode: '0',
        step: '0.1',
      };

    case 'AnimationLibrary':
      return {
        _data: '{}',
      };

    default:
      return {};
  }
}

/**
 * Serialize value to TRES format
 */
function serializeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    // Check if it's already a Godot type (Color, Vector2, etc.)
    if (/^(Color|Vector[23]|Packed|Rect2|Transform|AABB)\(/.test(value)) {
      return value;
    }
    return `"${value}"`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializeValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{${entries.map(([k, v]) => `"${k}": ${serializeValue(v)}`).join(', ')}}`;
  }
  return String(value);
}

/**
 * Generate TRES file content
 */
function generateTresContent(resourceType: ResourceType, properties: Record<string, unknown>): string {
  const defaultProps = getDefaultProperties(resourceType);
  const mergedProps = { ...defaultProps };

  // Merge custom properties
  for (const [key, value] of Object.entries(properties)) {
    mergedProps[key] = serializeValue(value);
  }

  const lines: string[] = [];

  // Header
  lines.push(`[gd_resource type="${resourceType}" format=3]`);
  lines.push('');

  // Resource section
  lines.push('[resource]');
  for (const [key, value] of Object.entries(mergedProps)) {
    lines.push(`${key} = ${value}`);
  }
  lines.push('');

  return lines.join('\n');
}

export const handleCreateResource = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateResourceSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, resourcePath, and resourceType',
    ]);
  }

  const typedArgs: CreateResourceInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Ensure .tres extension
  let resourcePath = typedArgs.resourcePath;
  if (!resourcePath.endsWith('.tres')) {
    resourcePath += '.tres';
  }

  const resourceFullPath = join(typedArgs.projectPath, resourcePath);

  // Check if file already exists
  if (existsSync(resourceFullPath)) {
    return createErrorResponse(`Resource already exists: ${resourcePath}`, [
      'Use a different path',
      'Delete the existing resource first',
    ]);
  }

  try {
    // Ensure directory exists
    const dir = dirname(resourceFullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    logDebug(`Creating ${typedArgs.resourceType} resource at: ${resourcePath}`);

    // Generate content
    const content = generateTresContent(typedArgs.resourceType, typedArgs.properties || {});

    // Write file
    writeFileSync(resourceFullPath, content, 'utf-8');

    return createSuccessResponse(
      `Resource created successfully!\n` +
      `Type: ${typedArgs.resourceType}\n` +
      `Path: ${resourcePath}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create resource: ${errorMessage}`, [
      'Check the project path is correct',
      'Verify write permissions',
    ]);
  }
};
