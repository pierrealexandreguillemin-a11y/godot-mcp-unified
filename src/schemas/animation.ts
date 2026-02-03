/**
 * Animation Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { SceneToolSchema, NodePathSchema } from './common.js';

// ============================================================================
// Animation Tool Schemas
// ============================================================================

export const CreateAnimationPlayerSchema = SceneToolSchema.extend({
  nodeName: z.string().default('AnimationPlayer').describe('Name for AnimationPlayer node'),
  parentNodePath: z.string().optional().describe('Path to parent node'),
});

export const AddAnimationSchema = SceneToolSchema.extend({
  playerNodePath: NodePathSchema.describe('Path to AnimationPlayer node'),
  animationName: z.string().min(1).describe('Name of the animation'),
  length: z.number().positive().default(1.0).describe('Animation length in seconds'),
  loop: z.boolean().default(false).describe('Whether animation loops'),
});

export const TrackTypeSchema = z.enum([
  'value', 'position_2d', 'position_3d', 'rotation_2d', 'rotation_3d',
  'scale_2d', 'scale_3d', 'method', 'bezier', 'audio', 'animation'
]);

export const AddAnimationTrackSchema = SceneToolSchema.extend({
  playerNodePath: NodePathSchema,
  animationName: z.string().min(1),
  trackType: TrackTypeSchema,
  nodePath: NodePathSchema.describe('Path to the node this track affects'),
  property: z.string().optional().describe('Property name for value tracks'),
});

export const SetKeyframeSchema = SceneToolSchema.extend({
  playerNodePath: NodePathSchema,
  animationName: z.string().min(1),
  trackIndex: z.number().int().min(0),
  time: z.number().min(0),
  value: z.unknown(),
  transition: z.number().optional().describe('Transition type (0-4)'),
  easing: z.number().optional().describe('Easing value'),
});

export const ProcessCallbackSchema = z.enum(['idle', 'physics', 'manual']);

export const CreateAnimationTreeSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the AnimationTree node'),
  parentNodePath: z.string().optional().describe('Path to parent node'),
  animPlayerPath: z.string().optional().describe('Path to AnimationPlayer to control'),
  rootMotionTrack: z.string().optional().describe('Track path for root motion'),
  processCallback: ProcessCallbackSchema.optional().describe('Process callback mode'),
});

export const StateMachineStateSchema = z.object({
  name: z.string().min(1).describe('State name'),
  animation: z.string().optional().describe('Animation name to play'),
  blendPosition: z.number().optional().describe('Position in blend space'),
});

export const SwitchModeSchema = z.enum(['immediate', 'sync', 'at_end']);

export const StateMachineTransitionSchema = z.object({
  from: z.string().min(1).describe('Source state name'),
  to: z.string().min(1).describe('Target state name'),
  autoAdvance: z.boolean().optional().describe('Auto-advance when animation ends'),
  advanceCondition: z.string().optional().describe('Condition expression'),
  xfadeTime: z.number().min(0).optional().describe('Cross-fade duration in seconds'),
  switchMode: SwitchModeSchema.optional().describe('Switch mode'),
});

export const SetupStateMachineSchema = SceneToolSchema.extend({
  animTreePath: NodePathSchema.describe('Path to AnimationTree node'),
  states: z.array(StateMachineStateSchema).min(1).describe('Array of state definitions'),
  transitions: z.array(StateMachineTransitionSchema).optional().describe('Array of transitions'),
  startState: z.string().optional().describe('Initial state name'),
});

export const BlendTypeSchema = z.enum(['1d', '2d']);

export const BlendPoint1DSchema = z.object({
  animation: z.string().min(1).describe('Animation name'),
  position: z.number().describe('1D position'),
});

export const BlendPoint2DSchema = z.object({
  animation: z.string().min(1).describe('Animation name'),
  positionX: z.number().describe('2D X position'),
  positionY: z.number().describe('2D Y position'),
});

export const BlendModeSchema = z.enum(['interpolated', 'discrete', 'carry']);

export const BlendAnimationsSchema = SceneToolSchema.extend({
  animTreePath: NodePathSchema.describe('Path to AnimationTree node'),
  blendSpaceName: z.string().min(1).describe('Name for the blend space node'),
  type: BlendTypeSchema.describe('Blend space type: 1d or 2d'),
  points: z.array(z.union([BlendPoint1DSchema, BlendPoint2DSchema])).min(1).describe('Blend points'),
  minSpace: z.number().optional().describe('Minimum value for blend parameter'),
  maxSpace: z.number().optional().describe('Maximum value for blend parameter'),
  minSpaceY: z.number().optional().describe('2D only: minimum Y value'),
  maxSpaceY: z.number().optional().describe('2D only: maximum Y value'),
  blendMode: BlendModeSchema.optional().describe('Blend mode'),
  sync: z.boolean().optional().describe('Synchronize animation lengths'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateAnimationPlayerInput = z.infer<typeof CreateAnimationPlayerSchema>;
export type AddAnimationInput = z.infer<typeof AddAnimationSchema>;
export type AddAnimationTrackInput = z.infer<typeof AddAnimationTrackSchema>;
export type SetKeyframeInput = z.infer<typeof SetKeyframeSchema>;
export type CreateAnimationTreeInput = z.infer<typeof CreateAnimationTreeSchema>;
export type SetupStateMachineInput = z.infer<typeof SetupStateMachineSchema>;
export type BlendAnimationsInput = z.infer<typeof BlendAnimationsSchema>;
