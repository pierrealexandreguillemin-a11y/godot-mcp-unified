/**
 * Particles Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, SceneToolSchema, PathSchema, Vector3Schema, RGBAColorSchema } from './common.js';

// ============================================================================
// Particles Tool Schemas
// ============================================================================

export const CreateGPUParticlesSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the GPUParticles node'),
  parentNodePath: z.string().optional().describe('Path to parent node'),
  is3D: z.boolean().default(false).describe('Create 3D particles'),
  amount: z.number().int().optional().describe('Number of particles'),
  lifetime: z.number().optional().describe('Lifetime in seconds'),
  oneShot: z.boolean().optional().describe('Emit only once'),
  preprocess: z.number().optional().describe('Preprocess time in seconds'),
  emitting: z.boolean().optional().describe('Start emitting immediately'),
  materialPath: z.string().optional().describe('Path to ParticleProcessMaterial resource'),
});

export const EmissionShapeSchema = z.enum(['point', 'sphere', 'sphere_surface', 'box', 'ring']);

export const CreateParticleMaterialSchema = ProjectToolSchema.extend({
  materialPath: PathSchema.describe('Path for the material file'),
  emissionShape: EmissionShapeSchema.optional().describe('Emission shape'),
  direction: Vector3Schema.optional().describe('Emission direction'),
  spread: z.number().optional().describe('Spread angle in degrees'),
  gravity: Vector3Schema.optional().describe('Gravity vector'),
  initialVelocityMin: z.number().optional().describe('Minimum initial velocity'),
  initialVelocityMax: z.number().optional().describe('Maximum initial velocity'),
  angularVelocityMin: z.number().optional().describe('Minimum angular velocity'),
  angularVelocityMax: z.number().optional().describe('Maximum angular velocity'),
  scaleMin: z.number().optional().describe('Minimum particle scale'),
  scaleMax: z.number().optional().describe('Maximum particle scale'),
  color: RGBAColorSchema.optional().describe('Particle color'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateGPUParticlesInput = z.infer<typeof CreateGPUParticlesSchema>;
export type CreateParticleMaterialInput = z.infer<typeof CreateParticleMaterialSchema>;
