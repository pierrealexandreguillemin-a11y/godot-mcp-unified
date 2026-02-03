/**
 * Script Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import {
  ProjectToolSchema,
  SceneToolSchema,
  ScriptToolSchema,
  NodePathSchema,
  ScriptPathSchema,
} from './common.js';

// ============================================================================
// Script Tool Schemas
// ============================================================================

export const ListScriptsSchema = ProjectToolSchema.extend({
  directory: z.string().optional().describe('Subdirectory to search in'),
});

export const ReadScriptSchema = ScriptToolSchema;

export const WriteScriptSchema = ScriptToolSchema.extend({
  content: z.string().describe('GDScript content to write'),
  overwrite: z.boolean().default(false).describe('Overwrite if exists'),
});

export const DeleteScriptSchema = ScriptToolSchema.extend({
  force: z.boolean().default(false).describe('Force deletion without confirmation'),
});

export const AttachScriptSchema = SceneToolSchema.extend({
  nodePath: NodePathSchema,
  scriptPath: ScriptPathSchema,
});

export const DetachScriptSchema = SceneToolSchema.extend({
  nodePath: NodePathSchema,
});

export const GetScriptErrorsSchema = ProjectToolSchema.extend({
  scriptPath: z.string().optional().describe('Path to specific script to check (all if not provided)'),
});

// ============================================================================
// Type exports
// ============================================================================

export type ListScriptsInput = z.infer<typeof ListScriptsSchema>;
export type ReadScriptInput = z.infer<typeof ReadScriptSchema>;
export type WriteScriptInput = z.infer<typeof WriteScriptSchema>;
export type DeleteScriptInput = z.infer<typeof DeleteScriptSchema>;
export type AttachScriptInput = z.infer<typeof AttachScriptSchema>;
export type DetachScriptInput = z.infer<typeof DetachScriptSchema>;
export type GetScriptErrorsInput = z.infer<typeof GetScriptErrorsSchema>;
