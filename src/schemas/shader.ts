/**
 * Shader Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, PathSchema } from './common.js';

// ============================================================================
// Shader Tool Schemas
// ============================================================================

export const ShaderTypeSchema = z.enum(['spatial', 'canvas_item', 'particles', 'sky', 'fog']);

export const CreateShaderSchema = ProjectToolSchema.extend({
  shaderPath: PathSchema.describe('Path for the shader file'),
  shaderType: ShaderTypeSchema.describe('Type of shader'),
  renderMode: z.array(z.string()).optional().describe('Render modes'),
  vertexCode: z.string().optional().describe('Code for vertex() function'),
  fragmentCode: z.string().optional().describe('Code for fragment() function'),
  lightCode: z.string().optional().describe('Code for light() function'),
});

export const CreateShaderMaterialSchema = ProjectToolSchema.extend({
  materialPath: PathSchema.describe('Path for the material file'),
  shaderPath: PathSchema.describe('Path to the shader file'),
  parameters: z.record(z.string(), z.unknown()).optional().describe('Shader parameters to set'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateShaderInput = z.infer<typeof CreateShaderSchema>;
export type CreateShaderMaterialInput = z.infer<typeof CreateShaderMaterialSchema>;
