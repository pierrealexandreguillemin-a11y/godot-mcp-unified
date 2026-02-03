/**
 * Scene Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import {
  ProjectToolSchema,
  SceneToolSchema,
  NodeToolSchema,
  PathSchema,
  NodePathSchema,
} from './common.js';

// ============================================================================
// Scene Tool Schemas
// ============================================================================

export const CreateSceneSchema = ProjectToolSchema.extend({
  scenePath: PathSchema.describe('Path to the scene file (relative to project)'),
  rootNodeType: z.string().default('Node2D')
    .describe('Type of the root node (default: Node2D)'),
});

export const AddNodeSchema = SceneToolSchema.extend({
  nodeType: z.string().min(1).describe('Godot node type (e.g., Sprite2D, CharacterBody2D)'),
  nodeName: z.string().min(1).describe('Name for the new node'),
  parentNodePath: z.string().optional().describe('Path to parent node (default: root)'),
  properties: z.record(z.string(), z.unknown()).optional().describe('Initial properties for the node'),
});

export const EditNodeSchema = NodeToolSchema.extend({
  properties: z.record(z.string(), z.unknown()).describe('Properties to update on the node'),
});

export const RemoveNodeSchema = NodeToolSchema;

export const RenameNodeSchema = NodeToolSchema.extend({
  newName: z.string().min(1).describe('New name for the node'),
});

export const MoveNodeSchema = NodeToolSchema.extend({
  newParentPath: z.string().describe('Path to the new parent node'),
});

export const DuplicateNodeSchema = NodeToolSchema.extend({
  newName: z.string().optional().describe('Name for the duplicated node'),
});

export const LoadSpriteSchema = NodeToolSchema.extend({
  texturePath: PathSchema.describe('Path to the texture file'),
});

export const SaveSceneSchema = SceneToolSchema.extend({
  newPath: PathSchema.optional().describe('New path for the scene (save as)'),
});

export const ListScenesSchema = ProjectToolSchema.extend({
  directory: z.string().optional().describe('Subdirectory to search in'),
  recursive: z.boolean().default(true).describe('Search recursively in subdirectories'),
});

export const GetNodeTreeSchema = SceneToolSchema.extend({
  maxDepth: z.number().int().positive().optional().describe('Maximum depth to traverse'),
});

export const InstanceSceneSchema = SceneToolSchema.extend({
  instancePath: PathSchema.describe('Path to the scene to instance'),
  parentNodePath: z.string().optional().describe('Path to parent node (default: root)'),
  instanceName: z.string().optional().describe('Name for the instance node'),
});

export const GroupActionSchema = z.enum(['add', 'remove', 'list']);

export const ManageGroupsSchema = NodeToolSchema.extend({
  action: GroupActionSchema.describe('Action to perform (add, remove, list)'),
  groups: z.array(z.string()).optional().describe('Group names (required for add/remove)'),
});

export const ConnectSignalSchema = SceneToolSchema.extend({
  fromNodePath: NodePathSchema.describe('Path to the source node (emits signal)'),
  signal: z.string().min(1).describe('Signal name to connect'),
  toNodePath: NodePathSchema.describe('Path to the target node (receives signal)'),
  method: z.string().min(1).describe('Method name to call on target'),
  flags: z.number().int().optional().describe('Connection flags (default: 0)'),
});

export const ExportMeshLibrarySchema = SceneToolSchema.extend({
  outputPath: PathSchema.describe('Path for the output MeshLibrary resource'),
  meshItemNames: z.array(z.string()).optional().describe('Names of specific mesh items to include'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateSceneInput = z.infer<typeof CreateSceneSchema>;
export type AddNodeInput = z.infer<typeof AddNodeSchema>;
export type EditNodeInput = z.infer<typeof EditNodeSchema>;
export type RemoveNodeInput = z.infer<typeof RemoveNodeSchema>;
export type RenameNodeInput = z.infer<typeof RenameNodeSchema>;
export type MoveNodeInput = z.infer<typeof MoveNodeSchema>;
export type DuplicateNodeInput = z.infer<typeof DuplicateNodeSchema>;
export type LoadSpriteInput = z.infer<typeof LoadSpriteSchema>;
export type SaveSceneInput = z.infer<typeof SaveSceneSchema>;
export type ListScenesInput = z.infer<typeof ListScenesSchema>;
export type GetNodeTreeInput = z.infer<typeof GetNodeTreeSchema>;
export type InstanceSceneInput = z.infer<typeof InstanceSceneSchema>;
export type ManageGroupsInput = z.infer<typeof ManageGroupsSchema>;
export type ConnectSignalInput = z.infer<typeof ConnectSignalSchema>;
export type ExportMeshLibraryInput = z.infer<typeof ExportMeshLibrarySchema>;
