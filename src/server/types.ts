/**
 * Shared types and interfaces for the Godot MCP Server
 * ISO/IEC 25010 compliant - strict typing, no any
 */

// ============================================================================
// Core MCP Types
// ============================================================================

export interface ToolResponseContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export interface ToolResponse {
  content: ToolResponseContent[];
  isError?: boolean;
  [key: string]: unknown;
}

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, JsonSchemaProperty>;
    required: string[];
  };
}

export type ToolHandler<T extends BaseToolArgs = BaseToolArgs> = (
  args: T
) => Promise<ToolResponse>;

export interface ToolRegistryEntry<T extends BaseToolArgs = BaseToolArgs> {
  definition: ToolDefinition;
  handler: ToolHandler<T>;
  readOnly: boolean;
}

// ============================================================================
// Base Tool Arguments
// ============================================================================

export interface BaseToolArgs {
  [key: string]: unknown;
}

export interface ProjectToolArgs extends BaseToolArgs {
  projectPath: string;
}

export interface SceneToolArgs extends ProjectToolArgs {
  scenePath: string;
}

export interface NodeToolArgs extends SceneToolArgs {
  nodePath: string;
}

export interface ScriptToolArgs extends ProjectToolArgs {
  scriptPath: string;
}

// ============================================================================
// Project Tool Arguments
// ============================================================================

export interface LaunchEditorArgs extends ProjectToolArgs {}

export interface RunProjectArgs extends ProjectToolArgs {
  scene?: string;
}

export interface ListProjectsArgs extends BaseToolArgs {
  directory: string;
  recursive?: boolean;
}

export interface GetProjectInfoArgs extends ProjectToolArgs {}

// ============================================================================
// Scene Tool Arguments
// ============================================================================

export interface CreateSceneArgs extends ProjectToolArgs {
  scenePath: string;
  rootNodeType?: string;
}

export interface AddNodeArgs extends SceneToolArgs {
  nodeType: string;
  nodeName: string;
  parentNodePath?: string;
  properties?: NodeProperties;
}

export interface EditNodeArgs extends NodeToolArgs {
  properties: NodeProperties;
}

export interface RemoveNodeArgs extends NodeToolArgs {}

export interface LoadSpriteArgs extends NodeToolArgs {
  texturePath: string;
}

export interface SaveSceneArgs extends SceneToolArgs {
  newPath?: string;
}

export interface ExportMeshLibraryArgs extends SceneToolArgs {
  outputPath: string;
}

// ============================================================================
// Script Tool Arguments
// ============================================================================

export interface ListScriptsArgs extends ProjectToolArgs {
  directory?: string;
}

export interface ReadScriptArgs extends ScriptToolArgs {}

export interface WriteScriptArgs extends ScriptToolArgs {
  content: string;
  overwrite?: boolean;
}

export interface DeleteScriptArgs extends ScriptToolArgs {
  force?: boolean;
}

export interface AttachScriptArgs extends SceneToolArgs {
  nodePath: string;
  scriptPath: string;
}

export interface DetachScriptArgs extends SceneToolArgs {
  nodePath: string;
}

export interface GetScriptErrorsArgs extends ProjectToolArgs {
  scriptPath?: string;
}

// ============================================================================
// UID Tool Arguments
// ============================================================================

export interface GetUidArgs extends ProjectToolArgs {
  filePath: string;
}

export interface UpdateProjectUidsArgs extends ProjectToolArgs {}

// ============================================================================
// Capture Tool Arguments
// ============================================================================

export interface TakeScreenshotArgs extends ProjectToolArgs {
  scenePath?: string;
  outputPath?: string;
  delay?: number;
}

// ============================================================================
// Debug Tool Arguments
// ============================================================================

export interface GetDebugOutputArgs extends BaseToolArgs {}

export interface StopProjectArgs extends BaseToolArgs {}

// ============================================================================
// System Tool Arguments
// ============================================================================

export interface GetGodotVersionArgs extends BaseToolArgs {}

// ============================================================================
// Node Properties Types
// ============================================================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface NodeProperties {
  position?: Vector2;
  position3D?: Vector3;
  rotation?: number;
  rotation3D?: Vector3;
  scale?: Vector2;
  scale3D?: Vector3;
  visible?: boolean;
  modulate?: Color;
  texture?: string;
  [key: string]: unknown;
}

// ============================================================================
// Script Error Types
// ============================================================================

export interface ScriptError {
  file: string;
  line: number;
  column?: number;
  message: string;
  type: 'error' | 'warning';
}

export interface ScriptValidationResult {
  projectPath: string;
  scriptPath: string;
  errorCount: number;
  warningCount: number;
  valid: boolean;
  errors: ScriptError[];
  rawOutput: string;
}

// ============================================================================
// Script Info Types
// ============================================================================

export interface ScriptInfo {
  path: string;
  name: string;
  size: number;
  modified: string;
}

export interface ListScriptsResult {
  projectPath: string;
  directory: string;
  count: number;
  scripts: ScriptInfo[];
}

// ============================================================================
// Project Info Types
// ============================================================================

export interface ProjectStructure {
  scenes: number;
  scripts: number;
  assets: number;
  other: number;
}

export interface ProjectInfo {
  name: string;
  path: string;
  godotVersion: string;
  structure: ProjectStructure;
}

// ============================================================================
// Process Types
// ============================================================================

export interface RunningProcess {
  process: import('child_process').ChildProcess;
  projectPath: string;
  startTime: Date;
  output: string[];
}

// ============================================================================
// Exec Result Types
// ============================================================================

export interface ExecResult {
  stdout: string;
  stderr: string;
}

// ============================================================================
// Animation Tool Arguments
// ============================================================================

export interface CreateAnimationPlayerArgs extends SceneToolArgs {
  nodeName: string;
  parentNodePath?: string;
}

export interface AddAnimationArgs extends SceneToolArgs {
  playerNodePath: string;
  animationName: string;
  length?: number;
  loop?: boolean;
}

export interface AddAnimationTrackArgs extends SceneToolArgs {
  playerNodePath: string;
  animationName: string;
  trackType: 'value' | 'position_2d' | 'position_3d' | 'rotation_2d' | 'rotation_3d' | 'scale_2d' | 'scale_3d' | 'method' | 'bezier' | 'audio' | 'animation';
  nodePath: string;
  property?: string;
}

export interface SetKeyframeArgs extends SceneToolArgs {
  playerNodePath: string;
  animationName: string;
  trackIndex: number;
  time: number;
  value: unknown;
  transition?: number;
  easing?: number;
}

export interface CreateAnimationTreeArgs extends SceneToolArgs {
  nodeName: string;
  parentNodePath?: string;
  animPlayerPath?: string;
  rootMotionTrack?: string;
  processCallback?: 'idle' | 'physics' | 'manual';
}

export interface StateMachineState {
  name: string;
  animation?: string;
  blendPosition?: number;
}

export interface StateMachineTransition {
  from: string;
  to: string;
  autoAdvance?: boolean;
  advanceCondition?: string;
  xfadeTime?: number;
  switchMode?: 'immediate' | 'sync' | 'at_end';
}

export interface SetupStateMachineArgs extends SceneToolArgs {
  animTreePath: string;
  states: StateMachineState[];
  transitions?: StateMachineTransition[];
  startState?: string;
}

export interface BlendPoint1D {
  animation: string;
  position: number;
}

export interface BlendPoint2D {
  animation: string;
  positionX: number;
  positionY: number;
}

export interface BlendAnimationsArgs extends SceneToolArgs {
  animTreePath: string;
  blendSpaceName: string;
  type: '1d' | '2d';
  points: BlendPoint1D[] | BlendPoint2D[];
  minSpace?: number;
  maxSpace?: number;
  minSpaceY?: number;
  maxSpaceY?: number;
  blendMode?: 'interpolated' | 'discrete' | 'carry';
  sync?: boolean;
}

// ============================================================================
// Physics Tool Arguments
// ============================================================================

export interface CreateCollisionShapeArgs extends SceneToolArgs {
  nodeName: string;
  parentNodePath: string;
  shapeType: 'rectangle' | 'circle' | 'capsule' | 'polygon' | 'box' | 'sphere' | 'cylinder' | 'convex';
  is3D?: boolean;
  shapeParams?: CollisionShapeParams;
}

export interface CollisionShapeParams {
  size?: Vector2 | Vector3;
  radius?: number;
  height?: number;
  points?: Vector2[];
}

export interface SetupRigidBodyArgs extends SceneToolArgs {
  nodePath: string;
  bodyType?: 'dynamic' | 'static' | 'kinematic';
  mass?: number;
  gravity_scale?: number;
  linear_damp?: number;
  angular_damp?: number;
  physics_material?: string;
}

export interface ConfigurePhysicsLayersArgs extends ProjectToolArgs {
  dimension: '2d' | '3d';
  layers: PhysicsLayerConfig[];
}

export interface PhysicsLayerConfig {
  layer: number;
  name: string;
}

// ============================================================================
// TileMap Tool Arguments
// ============================================================================

export interface CreateTileSetArgs extends ProjectToolArgs {
  tilesetPath: string;
  tileSize: Vector2;
  texturePath?: string;
}

export interface CreateTileMapLayerArgs extends SceneToolArgs {
  nodeName: string;
  parentNodePath?: string;
  tilesetPath: string;
  zIndex?: number;
}

export interface SetTileArgs extends SceneToolArgs {
  tilemapNodePath: string;
  layer?: number;
  position: Vector2;
  sourceId: number;
  atlasCoords: Vector2;
  alternativeTile?: number;
}

export interface PaintTilesArgs extends SceneToolArgs {
  tilemapNodePath: string;
  layer?: number;
  tiles: TilePlacement[];
}

export interface TilePlacement {
  position: Vector2;
  sourceId: number;
  atlasCoords: Vector2;
  alternativeTile?: number;
}

// ============================================================================
// Audio Tool Arguments
// ============================================================================

export interface CreateAudioBusArgs extends ProjectToolArgs {
  busName: string;
  parentBus?: string;
  volume?: number;
  solo?: boolean;
  mute?: boolean;
}

export interface SetupAudioPlayerArgs extends SceneToolArgs {
  nodeName: string;
  parentNodePath?: string;
  is3D?: boolean;
  streamPath?: string;
  bus?: string;
  autoplay?: boolean;
  volumeDb?: number;
}

export interface AddAudioEffectArgs extends ProjectToolArgs {
  busName: string;
  effectType: 'amplify' | 'bandlimit' | 'bandpass' | 'chorus' | 'compressor' | 'delay' | 'distortion' | 'eq' | 'filter' | 'highpass' | 'highshelf' | 'limiter' | 'lowpass' | 'lowshelf' | 'notch' | 'panner' | 'phaser' | 'pitch_shift' | 'record' | 'reverb' | 'spectrum_analyzer' | 'stereo_enhance';
  effectParams?: Record<string, unknown>;
}
