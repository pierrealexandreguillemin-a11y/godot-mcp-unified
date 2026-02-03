/**
 * Navigation Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, SceneToolSchema, PathSchema } from './common.js';

// ============================================================================
// Navigation Tool Schemas
// ============================================================================

export const CreateNavigationRegionSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the NavigationRegion node'),
  parentNodePath: z.string().optional().describe('Path to parent node'),
  is3D: z.boolean().default(false).describe('Create 3D navigation region'),
  navigationMeshPath: z.string().optional().describe('Path to NavigationMesh/NavigationPolygon resource'),
});

export const BakeNavigationMeshSchema = ProjectToolSchema.extend({
  meshPath: PathSchema.describe('Path for the navigation mesh resource'),
  is3D: z.boolean().default(false).describe('Create 3D navigation mesh'),
  agentRadius: z.number().optional().describe('Agent radius for pathfinding'),
  agentHeight: z.number().optional().describe('Agent height for 3D pathfinding'),
  agentMaxClimb: z.number().optional().describe('Maximum climb height for 3D'),
  agentMaxSlope: z.number().optional().describe('Maximum slope angle in degrees'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateNavigationRegionInput = z.infer<typeof CreateNavigationRegionSchema>;
export type BakeNavigationMeshInput = z.infer<typeof BakeNavigationMeshSchema>;
