/**
 * Lighting Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, SceneToolSchema, PathSchema, RGBColorSchema } from './common.js';

// ============================================================================
// Lighting Tool Schemas
// ============================================================================

export const LightTypeSchema = z.enum([
  'directional_3d', 'omni_3d', 'spot_3d', 'point_2d', 'directional_2d',
]);

export const CreateLightSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the Light node'),
  parentNodePath: z.string().optional().describe('Path to parent node'),
  lightType: LightTypeSchema.describe('Type of light'),
  color: RGBColorSchema.optional().describe('Light color'),
  energy: z.number().optional().describe('Light energy/intensity'),
  range: z.number().optional().describe('Light range'),
  spotAngle: z.number().optional().describe('Spot angle in degrees'),
  shadowEnabled: z.boolean().optional().describe('Enable shadows'),
  texturePath: z.string().optional().describe('Path to light texture'),
});

export const BackgroundModeSchema = z.enum([
  'clear_color', 'custom_color', 'sky', 'canvas', 'keep', 'camera_feed',
]);

export const TonemapModeSchema = z.enum(['linear', 'reinhard', 'filmic', 'aces']);

export const SetupEnvironmentSchema = ProjectToolSchema.extend({
  environmentPath: PathSchema.describe('Path for the environment resource'),
  backgroundMode: BackgroundModeSchema.optional().describe('Background mode'),
  backgroundColor: RGBColorSchema.optional().describe('Background color'),
  ambientLightColor: RGBColorSchema.optional().describe('Ambient light color'),
  ambientLightEnergy: z.number().optional().describe('Ambient light energy'),
  tonemapMode: TonemapModeSchema.optional().describe('Tonemap mode'),
  glowEnabled: z.boolean().optional().describe('Enable glow effect'),
  glowIntensity: z.number().optional().describe('Glow intensity'),
  fogEnabled: z.boolean().optional().describe('Enable volumetric fog'),
  fogDensity: z.number().optional().describe('Fog density'),
  fogColor: RGBColorSchema.optional().describe('Fog color'),
  ssaoEnabled: z.boolean().optional().describe('Enable SSAO'),
  ssrEnabled: z.boolean().optional().describe('Enable SSR'),
  sdfgiEnabled: z.boolean().optional().describe('Enable SDFGI'),
});

// ============================================================================
// Lightmapper Schemas
// ============================================================================

export const LightmapQualitySchema = z.enum(['low', 'medium', 'high', 'ultra']);

export const EnvironmentModeSchema = z.enum(['disabled', 'scene', 'custom_sky', 'custom_color']);

export const SetupLightmapperSchema = SceneToolSchema.extend({
  quality: LightmapQualitySchema.default('medium').describe('Lightmap bake quality'),
  bounces: z.number().int().min(0).max(16).default(3).describe('Number of light bounces'),
  useDenoiser: z.boolean().default(true).describe('Enable lightmap denoiser'),
  createNode: z.boolean().default(true).describe('Create LightmapGI node if not present'),
  bake: z.boolean().default(false).describe('Trigger lightmap bake via headless Godot'),
  bakeTimeout: z.number().int().min(10000).max(3600000).default(300000).describe('Bake timeout in milliseconds'),
  directional: z.boolean().default(false).describe('Enable directional lightmaps'),
  interior: z.boolean().default(false).describe('Mark as interior (no sky contribution)'),
  maxTextureSize: z.number().int().min(128).max(16384).optional().describe('Maximum lightmap texture size'),
  environmentMode: EnvironmentModeSchema.optional().describe('Environment lighting mode'),
  environmentColor: RGBColorSchema.optional().describe('Custom environment color'),
  environmentEnergy: z.number().min(0).optional().describe('Environment energy multiplier'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateLightInput = z.infer<typeof CreateLightSchema>;
export type SetupEnvironmentInput = z.infer<typeof SetupEnvironmentSchema>;
export type SetupLightmapperInput = z.infer<typeof SetupLightmapperSchema>;
