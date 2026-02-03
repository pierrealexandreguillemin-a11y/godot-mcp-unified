/**
 * Physics Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, SceneToolSchema, NodePathSchema, PathSchema } from './common.js';

// ============================================================================
// Physics Tool Schemas
// ============================================================================

export const ShapeTypeSchema = z.enum([
  'rectangle', 'circle', 'capsule', 'polygon',
  'box', 'sphere', 'cylinder', 'convex'
]);

export const CollisionShapeParamsSchema = z.object({
  sizeX: z.number().optional(),
  sizeY: z.number().optional(),
  sizeZ: z.number().optional(),
  radius: z.number().positive().optional(),
  height: z.number().positive().optional(),
}).optional();

export const CreateCollisionShapeSchema = SceneToolSchema.extend({
  nodeName: z.string().default('CollisionShape'),
  parentNodePath: NodePathSchema,
  shapeType: ShapeTypeSchema,
  is3D: z.boolean().default(false),
  shapeParams: CollisionShapeParamsSchema,
});

export const BodyTypeSchema = z.enum(['dynamic', 'static', 'kinematic']);

export const SetupRigidBodySchema = SceneToolSchema.extend({
  nodePath: NodePathSchema,
  bodyType: BodyTypeSchema.default('dynamic'),
  mass: z.number().positive().default(1.0),
  gravity_scale: z.number().default(1.0),
  linear_damp: z.number().min(0).optional(),
  angular_damp: z.number().min(0).optional(),
  physics_material: PathSchema.optional(),
});

export const PhysicsDimensionSchema = z.enum(['2d', '3d']);

export const PhysicsLayerConfigSchema = z.object({
  layer: z.number().int().min(1).max(32).describe('Layer number (1-32)'),
  name: z.string().min(1).describe('Name for the layer'),
});

export const ConfigurePhysicsLayersSchema = ProjectToolSchema.extend({
  dimension: PhysicsDimensionSchema.describe('Physics dimension: 2d or 3d'),
  layers: z.array(PhysicsLayerConfigSchema).min(1).describe('Array of layer configurations'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateCollisionShapeInput = z.infer<typeof CreateCollisionShapeSchema>;
export type SetupRigidBodyInput = z.infer<typeof SetupRigidBodySchema>;
export type ConfigurePhysicsLayersInput = z.infer<typeof ConfigurePhysicsLayersSchema>;
