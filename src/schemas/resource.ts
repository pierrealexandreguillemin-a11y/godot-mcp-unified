/**
 * Resource Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, PathSchema } from './common.js';

// ============================================================================
// Resource Tool Schemas
// ============================================================================

export const ResourceTypeSchema = z.enum([
  'StandardMaterial3D',
  'ShaderMaterial',
  'StyleBoxFlat',
  'StyleBoxTexture',
  'Theme',
  'Environment',
  'Sky',
  'Gradient',
  'Curve',
  'AudioBusLayout',
  'Animation',
  'AnimationLibrary',
]);

export const CreateResourceSchema = ProjectToolSchema.extend({
  resourcePath: PathSchema.describe('Path for the resource file (relative to project)'),
  resourceType: ResourceTypeSchema.describe('Type of resource to create'),
  properties: z.record(z.string(), z.unknown()).optional().describe('Optional properties to set on the resource'),
});

export const ListResourcesSchema = ProjectToolSchema.extend({
  directory: z.string().optional().describe('Subdirectory to search (relative to project)'),
  recursive: z.boolean().default(true).describe('Search recursively in subdirectories'),
  resourceType: z.string().optional().describe('Filter by resource type'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type ListResourcesInput = z.infer<typeof ListResourcesSchema>;
