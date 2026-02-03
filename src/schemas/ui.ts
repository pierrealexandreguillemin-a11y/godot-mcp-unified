/**
 * UI Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { SceneToolSchema, Vector2Schema, RGBAColorSchema } from './common.js';

// ============================================================================
// UI Tool Schemas
// ============================================================================

export const ContainerTypeSchema = z.enum([
  'vbox', 'hbox', 'grid', 'center', 'margin', 'panel', 'scroll', 'split_h', 'split_v', 'tab', 'flow',
]);

export const AnchorsPresetSchema = z.enum([
  'full_rect', 'center', 'top_left', 'top_right', 'bottom_left', 'bottom_right',
]);

export const CreateUIContainerSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the Container node'),
  parentNodePath: z.string().optional().describe('Path to parent node'),
  containerType: ContainerTypeSchema.describe('Type of container'),
  columns: z.number().int().optional().describe('Number of columns (for GridContainer)'),
  customMinimumSize: Vector2Schema.optional().describe('Custom minimum size'),
  anchorsPreset: AnchorsPresetSchema.optional().describe('Anchors preset for positioning'),
});

export const ControlTypeSchema = z.enum([
  'button', 'label', 'line_edit', 'text_edit', 'rich_text', 'texture_rect', 'color_rect',
  'progress_bar', 'slider_h', 'slider_v', 'spin_box', 'check_box', 'check_button',
  'option_button', 'menu_button',
]);

export const CreateControlSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the Control node'),
  parentNodePath: z.string().optional().describe('Path to parent node'),
  controlType: ControlTypeSchema.describe('Type of control'),
  text: z.string().optional().describe('Text content'),
  placeholderText: z.string().optional().describe('Placeholder text'),
  texturePath: z.string().optional().describe('Path to texture'),
  color: RGBAColorSchema.optional().describe('Color'),
  minValue: z.number().optional().describe('Minimum value'),
  maxValue: z.number().optional().describe('Maximum value'),
  value: z.number().optional().describe('Current value'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateUIContainerInput = z.infer<typeof CreateUIContainerSchema>;
export type CreateControlInput = z.infer<typeof CreateControlSchema>;
