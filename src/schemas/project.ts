/**
 * Project Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, PathSchema } from './common.js';

// ============================================================================
// Project Management Tool Schemas
// ============================================================================

export const GetProjectInfoSchema = ProjectToolSchema.extend({});

export const GetProjectSettingsSchema = ProjectToolSchema.extend({
  section: z.string().optional().describe('Filter by section name'),
  key: z.string().optional().describe('Filter by specific key path'),
});

export const SetProjectSettingSchema = ProjectToolSchema.extend({
  key: z.string().min(1).describe('Setting key'),
  value: z.string().describe('Value to set'),
  section: z.string().optional().describe('Section name'),
});

export const RunProjectSchema = ProjectToolSchema.extend({
  scene: z.string().optional().describe('Specific scene to run'),
});

export const LaunchEditorSchema = ProjectToolSchema.extend({});

export const ListProjectsSchema = z.object({
  directory: z.string().min(1).describe('Directory to search for Godot projects'),
  recursive: z.boolean().default(false).describe('Search recursively'),
});

export const ExportModeSchema = z.enum(['release', 'debug']);

export const ExportProjectSchema = ProjectToolSchema.extend({
  preset: z.string().min(1).describe('Export preset name'),
  outputPath: z.string().min(1).describe('Output path for the exported project'),
  mode: ExportModeSchema.default('release').describe('Export mode'),
});

export const AutoloadActionSchema = z.enum(['add', 'remove', 'list']);

export const ManageAutoloadsSchema = ProjectToolSchema.extend({
  action: AutoloadActionSchema.describe('Action to perform'),
  name: z.string().optional().describe('Autoload name (required for add/remove)'),
  path: z.string().optional().describe('Path to the script or scene (required for add)'),
});

export const InputActionTypeSchema = z.enum(['key', 'mouse_button', 'joypad_button', 'joypad_axis']);

export const InputEventSchema = z.object({
  type: InputActionTypeSchema,
  keycode: z.string().optional().describe('Key code (e.g., "KEY_SPACE")'),
  button: z.number().optional().describe('Mouse or joypad button index'),
  axis: z.number().optional().describe('Joypad axis index'),
  axisValue: z.number().optional().describe('Axis value (-1 or 1)'),
});

export const ManageInputActionsSchema = ProjectToolSchema.extend({
  action: AutoloadActionSchema.describe('Action to perform'),
  name: z.string().optional().describe('Input action name (required for add/remove)'),
  events: z.array(InputEventSchema).optional().describe('Input events for add action'),
  deadzone: z.number().min(0).max(1).default(0.5).describe('Deadzone for the action'),
});

export const ValidateProjectSchema = ProjectToolSchema.extend({
  checkScripts: z.boolean().default(true).describe('Validate GDScript files'),
  checkScenes: z.boolean().default(true).describe('Check scene file integrity'),
  checkResources: z.boolean().default(true).describe('Verify resource references'),
});

export const DocsFormatSchema = z.enum(['xml', 'rst']);

export const GenerateDocsSchema = ProjectToolSchema.extend({
  outputPath: z.string().optional().describe('Output directory for documentation'),
  format: DocsFormatSchema.default('xml').describe('Documentation format'),
});

export const ConvertProjectSchema = z.object({
  sourcePath: z.string().min(1).describe('Path to the Godot 3.x project directory'),
  targetPath: z.string().optional().describe('Optional output path for converted project'),
  noConvertSign: z.boolean().default(false).describe('Skip conversion signature'),
});

export const ValidateConversionSchema = z.object({
  sourcePath: z.string().min(1).describe('Path to the Godot 3.x project directory'),
});

export const ExportPackSchema = ProjectToolSchema.extend({
  preset: z.string().min(1).describe('Export preset name'),
  outputPath: z.string().min(1).describe('Output path for the pack file (.pck or .zip)'),
});

export const ListExportPresetsSchema = ProjectToolSchema.extend({});

// ============================================================================
// Type exports
// ============================================================================

export type GetProjectInfoInput = z.infer<typeof GetProjectInfoSchema>;
export type GetProjectSettingsInput = z.infer<typeof GetProjectSettingsSchema>;
export type SetProjectSettingInput = z.infer<typeof SetProjectSettingSchema>;
export type RunProjectInput = z.infer<typeof RunProjectSchema>;
export type LaunchEditorInput = z.infer<typeof LaunchEditorSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>;
export type ExportProjectInput = z.infer<typeof ExportProjectSchema>;
export type ManageAutoloadsInput = z.infer<typeof ManageAutoloadsSchema>;
export type ManageInputActionsInput = z.infer<typeof ManageInputActionsSchema>;
export type ValidateProjectInput = z.infer<typeof ValidateProjectSchema>;
export type GenerateDocsInput = z.infer<typeof GenerateDocsSchema>;
export type ConvertProjectInput = z.infer<typeof ConvertProjectSchema>;
export type ValidateConversionInput = z.infer<typeof ValidateConversionSchema>;
export type ExportPackInput = z.infer<typeof ExportPackSchema>;
export type ListExportPresetsInput = z.infer<typeof ListExportPresetsSchema>;
