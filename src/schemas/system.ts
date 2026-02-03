/**
 * System and Debug Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, PathSchema } from './common.js';

// ============================================================================
// System Tool Schemas
// ============================================================================

/** No input required */
export const GetGodotVersionSchema = z.object({});

// ============================================================================
// Debug Tool Schemas
// ============================================================================

/** No input required */
export const GetDebugOutputSchema = z.object({});

/** No input required */
export const StopProjectSchema = z.object({});

export const StartDebugStreamSchema = z.object({
  port: z.number().int().min(1).max(65535).optional().describe('Port number for the WebSocket server'),
  pollIntervalMs: z.number().int().min(10).max(10000).optional().describe('Polling interval in milliseconds'),
});

/** No input required */
export const StopDebugStreamSchema = z.object({});

/** No input required */
export const GetDebugStreamStatusSchema = z.object({});

// ============================================================================
// UID Tool Schemas
// ============================================================================

export const GetUidSchema = ProjectToolSchema.extend({
  filePath: PathSchema.describe('Path to the file (relative to project) for which to get the UID'),
});

export const UpdateProjectUidsSchema = ProjectToolSchema.extend({});

// ============================================================================
// Capture Tool Schemas
// ============================================================================

export const TakeScreenshotSchema = ProjectToolSchema.extend({
  scenePath: z.string().optional().describe('Specific scene to screenshot'),
  outputPath: z.string().optional().describe('Where to save the screenshot (relative to project)'),
  delay: z.number().optional().describe('Delay in seconds before taking screenshot'),
});

// ============================================================================
// Batch Tool Schemas
// ============================================================================

export const BatchOperationSchema = z.object({
  tool: z.string().min(1).describe('Name of the MCP tool to execute'),
  args: z.record(z.string(), z.unknown()).describe('Arguments to pass to the tool'),
  id: z.string().optional().describe('Optional identifier for this operation'),
});

export const BatchOperationsSchema = ProjectToolSchema.extend({
  operations: z.array(BatchOperationSchema).min(1).max(100).describe('Array of tool operations to execute'),
  stopOnError: z.boolean().default(true).describe('Stop execution on first error'),
  maxOperations: z.number().int().min(1).max(100).optional().describe('Maximum number of operations'),
});

// ============================================================================
// Type exports
// ============================================================================

export type GetGodotVersionInput = z.infer<typeof GetGodotVersionSchema>;
export type GetDebugOutputInput = z.infer<typeof GetDebugOutputSchema>;
export type StopProjectInput = z.infer<typeof StopProjectSchema>;
export type StartDebugStreamInput = z.infer<typeof StartDebugStreamSchema>;
export type StopDebugStreamInput = z.infer<typeof StopDebugStreamSchema>;
export type GetDebugStreamStatusInput = z.infer<typeof GetDebugStreamStatusSchema>;
export type GetUidInput = z.infer<typeof GetUidSchema>;
export type UpdateProjectUidsInput = z.infer<typeof UpdateProjectUidsSchema>;
export type TakeScreenshotInput = z.infer<typeof TakeScreenshotSchema>;
export type BatchOperationsInput = z.infer<typeof BatchOperationsSchema>;
