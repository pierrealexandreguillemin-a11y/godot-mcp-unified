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
 * MCP-compatible JSON Schema structure
 * @interface McpJsonSchema
 */
interface McpJsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
}

/**
 * Internal type for zodToJsonSchema result with definitions
 */
interface ZodJsonSchemaResult {
  definitions?: { schema?: McpJsonSchema };
  properties?: Record<string, unknown>;
  required?: string[];
}

/**
 * Convert Zod schema to MCP-compatible JSON Schema
 *
 * @param schema - Zod object schema to convert
 * @returns MCP-compatible JSON Schema with properties and required fields
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * const mcpSchema = toMcpSchema(schema);
 * // { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
 * ```
 */
export function toMcpSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>): McpJsonSchema {
  // Cast through unknown for library type compatibility between Zod 4 and zod-to-json-schema
  // This is safe as zodToJsonSchema accepts any Zod schema type
  const zodSchema = schema as unknown;
  const result = zodToJsonSchema(zodSchema as Parameters<typeof zodToJsonSchema>[0], {
    name: 'schema',
    target: 'jsonSchema7',
  }) as ZodJsonSchemaResult;

  // Handle the wrapper structure from zodToJsonSchema
  const jsonSchema = result.definitions?.schema || result;

  return {
    type: 'object',
    properties: jsonSchema.properties || {},
    required: jsonSchema.required || [],
  };
}

/**
 * Validate input against schema and return typed result
 *
 * @param schema - Zod schema to validate against
 * @param input - Unknown input to validate
 * @returns Validated and typed data
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * const data = validateInput(MySchema, { name: 'test' });
 * ```
 */
export function validateInput<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  input: unknown
): z.infer<z.ZodObject<T>> {
  return schema.parse(input);
}

/**
 * Validation result type for safeValidateInput
 */
type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Safe validation that returns result object instead of throwing
 *
 * @param schema - Zod schema to validate against
 * @param input - Unknown input to validate
 * @returns Success with data or failure with error message
 *
 * @example
 * ```typescript
 * const result = safeValidateInput(MySchema, input);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function safeValidateInput<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  input: unknown
): ValidationResult<z.infer<z.ZodObject<T>>> {
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
