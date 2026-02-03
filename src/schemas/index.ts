/**
 * Zod Schemas for MCP Tool Validation
 * ISO/IEC 5055 compliant - centralized validation
 * ISO/IEC 25010 compliant - data integrity
 *
 * Re-exports all domain-specific schemas for convenient access.
 * Compatible with Zod 4.x
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Re-export all schemas from domain modules
export * from './common.js';
export * from './scene.js';
export * from './script.js';
export * from './animation.js';
export * from './physics.js';
export * from './tilemap.js';
export * from './audio.js';
export * from './project.js';
export * from './shader.js';
export * from './navigation.js';
export * from './particles.js';
export * from './ui.js';
export * from './lighting.js';
export * from './asset.js';
export * from './resource.js';
export * from './system.js';

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Convert Zod schema to MCP-compatible JSON Schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toMcpSchema(schema: z.ZodObject<any>): {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
} {
  // Use zodToJsonSchema with proper options for Zod 4
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = zodToJsonSchema(schema as any, {
    name: 'schema',
    target: 'jsonSchema7',
  });

  // Handle the wrapper structure from zodToJsonSchema
  const jsonSchema = (result as { definitions?: { schema?: unknown } })?.definitions?.schema || result;

  return {
    type: 'object',
    properties: (jsonSchema as { properties?: Record<string, unknown> }).properties || {},
    required: (jsonSchema as { required?: string[] }).required || [],
  };
}

/**
 * Validate input and return typed result or throw
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateInput<T extends z.ZodObject<any>>(
  schema: T,
  input: unknown
): z.infer<T> {
  return schema.parse(input);
}

/**
 * Safe validation that returns result object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeValidateInput<T extends z.ZodObject<any>>(
  schema: T,
  input: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format Zod errors nicely - handle Zod 4 issue structure
  const errors = result.error.issues
    .map((issue) => {
      const path = issue.path.map(String).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');

  return { success: false, error: errors };
}
