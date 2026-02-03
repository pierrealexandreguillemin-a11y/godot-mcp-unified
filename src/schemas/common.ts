/**
 * Common Zod Schemas - Reusable base types
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';

// ============================================================================
// Path Schemas
// ============================================================================

/** Valid filesystem path (no path traversal) */
export const PathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .refine(
    (path) => !path.includes('..'),
    { message: 'Path cannot contain ".." (path traversal)' }
  );

/** Project path - must point to a Godot project */
export const ProjectPathSchema = PathSchema.describe('Path to the Godot project directory');

/** Scene path - relative to project */
export const ScenePathSchema = PathSchema.describe('Path to the scene file (relative to project)');

/** Script path - relative to project */
export const ScriptPathSchema = PathSchema.describe('Path to the GDScript file (relative to project)');

/** Node path - path within scene tree */
export const NodePathSchema = z.string()
  .min(1, 'Node path cannot be empty')
  .describe('Path to the node within the scene tree');

// ============================================================================
// Vector Schemas
// ============================================================================

export const Vector2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const ColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1).default(1),
});

/** Simple RGB color without alpha for property schemas */
export const RGBColorSchema = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
});

/** RGBA color with optional alpha */
export const RGBAColorSchema = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
  a: z.number().optional(),
});

// ============================================================================
// Base Tool Schemas
// ============================================================================

/** Base schema for all tools requiring a project path */
export const ProjectToolSchema = z.object({
  projectPath: ProjectPathSchema,
});

/** Base schema for tools working with scenes */
export const SceneToolSchema = ProjectToolSchema.extend({
  scenePath: ScenePathSchema,
});

/** Base schema for tools working with nodes */
export const NodeToolSchema = SceneToolSchema.extend({
  nodePath: NodePathSchema,
});

/** Base schema for tools working with scripts */
export const ScriptToolSchema = ProjectToolSchema.extend({
  scriptPath: ScriptPathSchema,
});

// ============================================================================
// Type exports
// ============================================================================

export type Vector2 = z.infer<typeof Vector2Schema>;
export type Vector3 = z.infer<typeof Vector3Schema>;
export type Color = z.infer<typeof ColorSchema>;
