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
}

export interface ToolResponse {
  content: ToolResponseContent[];
  isError?: boolean;
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

/**
 * Error type for exec/execAsync failures
 * Contains stdout/stderr from the failed command
 */
export interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
  code?: number;
  killed?: boolean;
  signal?: string;
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

export interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
  code?: number;
}
