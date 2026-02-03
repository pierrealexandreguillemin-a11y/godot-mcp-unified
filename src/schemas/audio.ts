/**
 * Audio Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, SceneToolSchema, PathSchema } from './common.js';

// ============================================================================
// Audio Tool Schemas
// ============================================================================

export const CreateAudioBusSchema = ProjectToolSchema.extend({
  busName: z.string().min(1),
  parentBus: z.string().default('Master'),
  volume: z.number().default(0),
  solo: z.boolean().default(false),
  mute: z.boolean().default(false),
});

export const SetupAudioPlayerSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the AudioStreamPlayer node'),
  parentNodePath: z.string().optional().describe('Path to the parent node'),
  is3D: z.boolean().default(false).describe('Create 3D audio player'),
  streamPath: PathSchema.optional().describe('Path to the audio stream resource'),
  bus: z.string().default('Master').describe('Audio bus to use'),
  autoplay: z.boolean().default(false).describe('Autoplay the stream'),
  volumeDb: z.number().default(0).describe('Volume in decibels'),
});

export const AudioEffectTypeSchema = z.enum([
  'amplify', 'bandlimit', 'bandpass', 'chorus', 'compressor',
  'delay', 'distortion', 'eq6', 'eq10', 'eq21', 'filter', 'highpass', 'highshelf',
  'limiter', 'lowpass', 'lowshelf', 'notch', 'panner', 'phaser',
  'pitch_shift', 'record', 'reverb', 'spectrum_analyzer', 'stereo_enhance'
]);

export const AddAudioEffectSchema = ProjectToolSchema.extend({
  busName: z.string().min(1),
  effectType: AudioEffectTypeSchema,
  effectParams: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateAudioBusInput = z.infer<typeof CreateAudioBusSchema>;
export type SetupAudioPlayerInput = z.infer<typeof SetupAudioPlayerSchema>;
export type AddAudioEffectInput = z.infer<typeof AddAudioEffectSchema>;
