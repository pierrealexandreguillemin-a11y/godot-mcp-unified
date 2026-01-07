/**
 * Zod Schemas for MCP Tool Validation
 * ISO/IEC 5055 compliant - centralized validation
 * ISO/IEC 25010 compliant - data integrity
 *
 * Compatible with Zod 4.x
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// Base Schemas (reusables)
// ============================================================================

/** Valid filesystem path (no path traversal) */
export const PathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .refine(
    (path) => !path.includes('..'),
    { message: 'Path cannot contain ".." (path traversal)' }
  );

/** Project path - must point to a Godot project */
export const ProjectPathSchema = PathSchema.describe('Path to the Godot project directory');

/** Scene path - relative to project */
export const ScenePathSchema = PathSchema.describe('Path to the scene file (relative to project)');

/** Script path - relative to project */
export const ScriptPathSchema = PathSchema.describe('Path to the GDScript file (relative to project)');

/** Node path - path within scene tree */
export const NodePathSchema = z.string()
  .min(1, 'Node path cannot be empty')
  .describe('Path to the node within the scene tree');

// ============================================================================
// Vector Schemas
// ============================================================================

export const Vector2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const ColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1).default(1),
});

// ============================================================================
// Base Tool Schemas
// ============================================================================

/** Base schema for all tools requiring a project path */
export const ProjectToolSchema = z.object({
  projectPath: ProjectPathSchema,
});

/** Base schema for tools working with scenes */
export const SceneToolSchema = ProjectToolSchema.extend({
  scenePath: ScenePathSchema,
});

/** Base schema for tools working with nodes */
export const NodeToolSchema = SceneToolSchema.extend({
  nodePath: NodePathSchema,
});

/** Base schema for tools working with scripts */
export const ScriptToolSchema = ProjectToolSchema.extend({
  scriptPath: ScriptPathSchema,
});

// ============================================================================
// Scene Tool Schemas
// ============================================================================

export const CreateSceneSchema = ProjectToolSchema.extend({
  scenePath: ScenePathSchema,
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
// Script Tool Schemas
// ============================================================================

export const ListScriptsSchema = ProjectToolSchema.extend({
  directory: z.string().optional().describe('Subdirectory to search in'),
});

export const ReadScriptSchema = ScriptToolSchema;

export const WriteScriptSchema = ScriptToolSchema.extend({
  content: z.string().describe('GDScript content to write'),
  overwrite: z.boolean().default(false).describe('Overwrite if exists'),
});

export const DeleteScriptSchema = ScriptToolSchema.extend({
  force: z.boolean().default(false).describe('Force deletion without confirmation'),
});

export const AttachScriptSchema = SceneToolSchema.extend({
  nodePath: NodePathSchema,
  scriptPath: ScriptPathSchema,
});

export const DetachScriptSchema = SceneToolSchema.extend({
  nodePath: NodePathSchema,
});

export const GetScriptErrorsSchema = ProjectToolSchema.extend({
  scriptPath: z.string().optional().describe('Path to specific script to check (all if not provided)'),
});

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
// TileMap Tool Schemas
// ============================================================================

export const CreateTileSetSchema = ProjectToolSchema.extend({
  tilesetPath: PathSchema,
  tileSize: Vector2Schema,
  texturePath: PathSchema.optional(),
});

export const CreateTileMapLayerSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the TileMapLayer node'),
  parentNodePath: z.string().optional().describe('Path to the parent node (optional)'),
  tilesetPath: PathSchema.describe('Path to the TileSet resource'),
  zIndex: z.number().int().default(0).describe('Z-index for rendering order'),
});

export const SetTileSchema = SceneToolSchema.extend({
  tilemapNodePath: NodePathSchema,
  layer: z.number().int().min(0).default(0),
  position: Vector2Schema,
  sourceId: z.number().int().min(0),
  atlasCoords: Vector2Schema,
  alternativeTile: z.number().int().optional(),
});

export const TilePlacementSchema = z.object({
  position: Vector2Schema,
  sourceId: z.number().int().min(0),
  atlasCoords: Vector2Schema,
  alternativeTile: z.number().int().optional(),
});

export const PaintTilesSchema = SceneToolSchema.extend({
  tilemapNodePath: NodePathSchema,
  layer: z.number().int().min(0).default(0),
  tiles: z.array(TilePlacementSchema).min(1),
});

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
// Project Management Tool Schemas
// ============================================================================

export const GetProjectInfoSchema = ProjectToolSchema.extend({});

export const GetProjectSettingsSchema = ProjectToolSchema.extend({
  section: z.string().optional().describe('Filter by section name'),
  key: z.string().optional().describe('Filter by specific key path'),
});

export const SetProjectSettingSchema = ProjectToolSchema.extend({
  key: z.string().min(1).describe('Setting key'),
  value: z.string().describe('Value to set'),
  section: z.string().optional().describe('Section name'),
});

export const RunProjectSchema = ProjectToolSchema.extend({
  scene: z.string().optional().describe('Specific scene to run'),
});

export const LaunchEditorSchema = ProjectToolSchema.extend({});

export const ListProjectsSchema = z.object({
  directory: z.string().min(1).describe('Directory to search for Godot projects'),
  recursive: z.boolean().default(false).describe('Search recursively'),
});

export const ExportModeSchema = z.enum(['release', 'debug']);

export const ExportProjectSchema = ProjectToolSchema.extend({
  preset: z.string().min(1).describe('Export preset name'),
  outputPath: z.string().min(1).describe('Output path for the exported project'),
  mode: ExportModeSchema.default('release').describe('Export mode'),
});

export const AutoloadActionSchema = z.enum(['add', 'remove', 'list']);

export const ManageAutoloadsSchema = ProjectToolSchema.extend({
  action: AutoloadActionSchema.describe('Action to perform'),
  name: z.string().optional().describe('Autoload name (required for add/remove)'),
  path: z.string().optional().describe('Path to the script or scene (required for add)'),
});

export const InputActionTypeSchema = z.enum(['key', 'mouse_button', 'joypad_button', 'joypad_axis']);

export const InputEventSchema = z.object({
  type: InputActionTypeSchema,
  keycode: z.string().optional().describe('Key code (e.g., "KEY_SPACE")'),
  button: z.number().optional().describe('Mouse or joypad button index'),
  axis: z.number().optional().describe('Joypad axis index'),
  axisValue: z.number().optional().describe('Axis value (-1 or 1)'),
});

export const ManageInputActionsSchema = ProjectToolSchema.extend({
  action: AutoloadActionSchema.describe('Action to perform'),
  name: z.string().optional().describe('Input action name (required for add/remove)'),
  events: z.array(InputEventSchema).optional().describe('Input events for add action'),
  deadzone: z.number().min(0).max(1).default(0.5).describe('Deadzone for the action'),
});

export const ValidateProjectSchema = ProjectToolSchema.extend({
  checkScripts: z.boolean().default(true).describe('Validate GDScript files'),
  checkScenes: z.boolean().default(true).describe('Check scene file integrity'),
  checkResources: z.boolean().default(true).describe('Verify resource references'),
});

export const DocsFormatSchema = z.enum(['xml', 'rst']);

export const GenerateDocsSchema = ProjectToolSchema.extend({
  outputPath: z.string().optional().describe('Output directory for documentation'),
  format: DocsFormatSchema.default('xml').describe('Documentation format'),
});

export const ConvertProjectSchema = z.object({
  sourcePath: z.string().min(1).describe('Path to the Godot 3.x project directory'),
  targetPath: z.string().optional().describe('Optional output path for converted project'),
  noConvertSign: z.boolean().default(false).describe('Skip conversion signature'),
});

export const ValidateConversionSchema = z.object({
  sourcePath: z.string().min(1).describe('Path to the Godot 3.x project directory'),
});

export const ExportPackSchema = ProjectToolSchema.extend({
  preset: z.string().min(1).describe('Export preset name'),
  outputPath: z.string().min(1).describe('Output path for the pack file (.pck or .zip)'),
});

export const ListExportPresetsSchema = ProjectToolSchema.extend({});

// ============================================================================
// System Tool Schemas
// ============================================================================

/** No input required */
export const GetGodotVersionSchema = z.object({});

// ============================================================================
// Debug Tool Schemas
// ============================================================================

/** No input required */
export const GetDebugOutputSchema = z.object({});

/** No input required */
export const StopProjectSchema = z.object({});

export const StartDebugStreamSchema = z.object({
  port: z.number().int().min(1).max(65535).optional().describe('Port number for the WebSocket server'),
  pollIntervalMs: z.number().int().min(10).max(10000).optional().describe('Polling interval in milliseconds'),
});

/** No input required */
export const StopDebugStreamSchema = z.object({});

/** No input required */
export const GetDebugStreamStatusSchema = z.object({});

// ============================================================================
// UID Tool Schemas
// ============================================================================

export const GetUidSchema = ProjectToolSchema.extend({
  filePath: PathSchema.describe('Path to the file (relative to project) for which to get the UID'),
});

export const UpdateProjectUidsSchema = ProjectToolSchema.extend({});

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
// Capture Tool Schemas
// ============================================================================

export const TakeScreenshotSchema = ProjectToolSchema.extend({
  scenePath: z.string().optional().describe('Specific scene to screenshot'),
  outputPath: z.string().optional().describe('Where to save the screenshot (relative to project)'),
  delay: z.number().optional().describe('Delay in seconds before taking screenshot'),
});

// ============================================================================
// Shader Tool Schemas
// ============================================================================

export const ShaderTypeSchema = z.enum(['spatial', 'canvas_item', 'particles', 'sky', 'fog']);

export const CreateShaderSchema = ProjectToolSchema.extend({
  shaderPath: PathSchema.describe('Path for the shader file'),
  shaderType: ShaderTypeSchema.describe('Type of shader'),
  renderMode: z.array(z.string()).optional().describe('Render modes'),
  vertexCode: z.string().optional().describe('Code for vertex() function'),
  fragmentCode: z.string().optional().describe('Code for fragment() function'),
  lightCode: z.string().optional().describe('Code for light() function'),
});

export const CreateShaderMaterialSchema = ProjectToolSchema.extend({
  materialPath: PathSchema.describe('Path for the material file'),
  shaderPath: PathSchema.describe('Path to the shader file'),
  parameters: z.record(z.string(), z.unknown()).optional().describe('Shader parameters to set'),
});

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
  color: z.object({
    r: z.number(),
    g: z.number(),
    b: z.number(),
    a: z.number().optional(),
  }).optional().describe('Particle color'),
});

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
  color: z.object({
    r: z.number(),
    g: z.number(),
    b: z.number(),
    a: z.number().optional(),
  }).optional().describe('Color'),
  minValue: z.number().optional().describe('Minimum value'),
  maxValue: z.number().optional().describe('Maximum value'),
  value: z.number().optional().describe('Current value'),
});

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
  color: z.object({
    r: z.number(),
    g: z.number(),
    b: z.number(),
  }).optional().describe('Light color'),
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
  backgroundColor: z.object({ r: z.number(), g: z.number(), b: z.number() }).optional().describe('Background color'),
  ambientLightColor: z.object({ r: z.number(), g: z.number(), b: z.number() }).optional().describe('Ambient light color'),
  ambientLightEnergy: z.number().optional().describe('Ambient light energy'),
  tonemapMode: TonemapModeSchema.optional().describe('Tonemap mode'),
  glowEnabled: z.boolean().optional().describe('Enable glow effect'),
  glowIntensity: z.number().optional().describe('Glow intensity'),
  fogEnabled: z.boolean().optional().describe('Enable volumetric fog'),
  fogDensity: z.number().optional().describe('Fog density'),
  fogColor: z.object({ r: z.number(), g: z.number(), b: z.number() }).optional().describe('Fog color'),
  ssaoEnabled: z.boolean().optional().describe('Enable SSAO'),
  ssrEnabled: z.boolean().optional().describe('Enable SSR'),
  sdfgiEnabled: z.boolean().optional().describe('Enable SDFGI'),
});

// ============================================================================
// Asset Tool Schemas
// ============================================================================

export const ImportAssetSchema = ProjectToolSchema.extend({
  sourcePath: z.string().min(1).describe('Absolute path to the source file to import'),
  destinationPath: PathSchema.describe('Destination path relative to project'),
  overwrite: z.boolean().default(false).describe('Overwrite if destination already exists'),
});

export const AssetCategorySchema = z.enum(['all', 'texture', 'audio', 'model', 'font']);

export const ListAssetsSchema = ProjectToolSchema.extend({
  directory: z.string().optional().describe('Subdirectory to search'),
  recursive: z.boolean().default(true).describe('Search recursively'),
  category: AssetCategorySchema.default('all').describe('Filter by asset category'),
});

export const ReimportMethodSchema = z.enum(['touch', 'delete_import']);

export const ReimportAssetsSchema = ProjectToolSchema.extend({
  assetPaths: z.array(z.string()).min(1).describe('Array of asset paths relative to project'),
  method: ReimportMethodSchema.default('touch').describe('Reimport method'),
});

// ============================================================================
// Batch Tool Schemas
// ============================================================================

export const BatchOperationSchema = z.object({
  tool: z.string().min(1).describe('Name of the MCP tool to execute'),
  args: z.record(z.string(), z.unknown()).describe('Arguments to pass to the tool'),
  id: z.string().optional().describe('Optional identifier for this operation'),
});

export const BatchOperationsSchema = ProjectToolSchema.extend({
  operations: z.array(BatchOperationSchema).min(1).max(100).describe('Array of tool operations to execute'),
  stopOnError: z.boolean().default(true).describe('Stop execution on first error'),
  maxOperations: z.number().int().min(1).max(100).optional().describe('Maximum number of operations'),
});

// ============================================================================
// Export Types (inferred from schemas)
// ============================================================================

// Scene Types
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

// Script Types
export type WriteScriptInput = z.infer<typeof WriteScriptSchema>;
export type ReadScriptInput = z.infer<typeof ReadScriptSchema>;
export type DeleteScriptInput = z.infer<typeof DeleteScriptSchema>;
export type ListScriptsInput = z.infer<typeof ListScriptsSchema>;
export type AttachScriptInput = z.infer<typeof AttachScriptSchema>;
export type DetachScriptInput = z.infer<typeof DetachScriptSchema>;
export type GetScriptErrorsInput = z.infer<typeof GetScriptErrorsSchema>;

// Animation Types
export type CreateAnimationPlayerInput = z.infer<typeof CreateAnimationPlayerSchema>;
export type AddAnimationInput = z.infer<typeof AddAnimationSchema>;
export type AddAnimationTrackInput = z.infer<typeof AddAnimationTrackSchema>;
export type SetKeyframeInput = z.infer<typeof SetKeyframeSchema>;
export type CreateAnimationTreeInput = z.infer<typeof CreateAnimationTreeSchema>;
export type SetupStateMachineInput = z.infer<typeof SetupStateMachineSchema>;
export type BlendAnimationsInput = z.infer<typeof BlendAnimationsSchema>;

// Physics Types
export type CreateCollisionShapeInput = z.infer<typeof CreateCollisionShapeSchema>;
export type SetupRigidBodyInput = z.infer<typeof SetupRigidBodySchema>;
export type ConfigurePhysicsLayersInput = z.infer<typeof ConfigurePhysicsLayersSchema>;

// TileMap Types
export type CreateTileSetInput = z.infer<typeof CreateTileSetSchema>;
export type CreateTileMapLayerInput = z.infer<typeof CreateTileMapLayerSchema>;
export type SetTileInput = z.infer<typeof SetTileSchema>;
export type PaintTilesInput = z.infer<typeof PaintTilesSchema>;

// Audio Types
export type CreateAudioBusInput = z.infer<typeof CreateAudioBusSchema>;
export type SetupAudioPlayerInput = z.infer<typeof SetupAudioPlayerSchema>;
export type AddAudioEffectInput = z.infer<typeof AddAudioEffectSchema>;

// Project Types
export type GetProjectInfoInput = z.infer<typeof GetProjectInfoSchema>;
export type GetProjectSettingsInput = z.infer<typeof GetProjectSettingsSchema>;
export type SetProjectSettingInput = z.infer<typeof SetProjectSettingSchema>;
export type RunProjectInput = z.infer<typeof RunProjectSchema>;
export type LaunchEditorInput = z.infer<typeof LaunchEditorSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>;
export type ExportProjectInput = z.infer<typeof ExportProjectSchema>;
export type ManageAutoloadsInput = z.infer<typeof ManageAutoloadsSchema>;
export type ManageInputActionsInput = z.infer<typeof ManageInputActionsSchema>;
export type ValidateProjectInput = z.infer<typeof ValidateProjectSchema>;
export type GenerateDocsInput = z.infer<typeof GenerateDocsSchema>;
export type ConvertProjectInput = z.infer<typeof ConvertProjectSchema>;
export type ValidateConversionInput = z.infer<typeof ValidateConversionSchema>;
export type ExportPackInput = z.infer<typeof ExportPackSchema>;
export type ListExportPresetsInput = z.infer<typeof ListExportPresetsSchema>;

// System Types
export type GetGodotVersionInput = z.infer<typeof GetGodotVersionSchema>;

// Debug Types
export type GetDebugOutputInput = z.infer<typeof GetDebugOutputSchema>;
export type StopProjectInput = z.infer<typeof StopProjectSchema>;
export type StartDebugStreamInput = z.infer<typeof StartDebugStreamSchema>;
export type StopDebugStreamInput = z.infer<typeof StopDebugStreamSchema>;
export type GetDebugStreamStatusInput = z.infer<typeof GetDebugStreamStatusSchema>;

// UID Types
export type GetUidInput = z.infer<typeof GetUidSchema>;
export type UpdateProjectUidsInput = z.infer<typeof UpdateProjectUidsSchema>;

// Resource Types
export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type ListResourcesInput = z.infer<typeof ListResourcesSchema>;

// Capture Types
export type TakeScreenshotInput = z.infer<typeof TakeScreenshotSchema>;

// Shader Types
export type CreateShaderInput = z.infer<typeof CreateShaderSchema>;
export type CreateShaderMaterialInput = z.infer<typeof CreateShaderMaterialSchema>;

// Navigation Types
export type CreateNavigationRegionInput = z.infer<typeof CreateNavigationRegionSchema>;
export type BakeNavigationMeshInput = z.infer<typeof BakeNavigationMeshSchema>;

// Particles Types
export type CreateGPUParticlesInput = z.infer<typeof CreateGPUParticlesSchema>;
export type CreateParticleMaterialInput = z.infer<typeof CreateParticleMaterialSchema>;

// UI Types
export type CreateUIContainerInput = z.infer<typeof CreateUIContainerSchema>;
export type CreateControlInput = z.infer<typeof CreateControlSchema>;

// Lighting Types
export type CreateLightInput = z.infer<typeof CreateLightSchema>;
export type SetupEnvironmentInput = z.infer<typeof SetupEnvironmentSchema>;

// Asset Types
export type ImportAssetInput = z.infer<typeof ImportAssetSchema>;
export type ListAssetsInput = z.infer<typeof ListAssetsSchema>;
export type ReimportAssetsInput = z.infer<typeof ReimportAssetsSchema>;

// Batch Types
export type BatchOperationsInput = z.infer<typeof BatchOperationsSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Convert Zod schema to MCP-compatible JSON Schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toMcpSchema(schema: z.ZodObject<any>): {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
} {
  // Use zodToJsonSchema with proper options for Zod 4
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = zodToJsonSchema(schema as any, {
    name: 'schema',
    target: 'jsonSchema7',
  });

  // Handle the wrapper structure from zodToJsonSchema
  const jsonSchema = (result as { definitions?: { schema?: unknown } })?.definitions?.schema || result;

  return {
    type: 'object',
    properties: (jsonSchema as { properties?: Record<string, unknown> }).properties || {},
    required: (jsonSchema as { required?: string[] }).required || [],
  };
}

/**
 * Validate input and return typed result or throw
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateInput<T extends z.ZodObject<any>>(
  schema: T,
  input: unknown
): z.infer<T> {
  return schema.parse(input);
}

/**
 * Safe validation that returns result object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeValidateInput<T extends z.ZodObject<any>>(
  schema: T,
  input: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format Zod errors nicely - handle Zod 4 issue structure
  const errors = result.error.issues
    .map((issue) => {
      const path = issue.path.map(String).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');

  return { success: false, error: errors };
}
