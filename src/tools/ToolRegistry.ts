/**
 * Tool Registry
 * Central registry for all available tools with their definitions and handlers
 * ISO/IEC 25010 compliant - strict typing
 */

import {
  ToolDefinition,
  ToolResponse,
  BaseToolArgs,
  ToolHandler,
} from '../server/types';
import { READ_ONLY_MODE } from '../config/config';

// System tools
import { getGodotVersionDefinition, handleGetGodotVersion } from './system/GetGodotVersionTool';

// Debug tools
import { stopProjectDefinition, handleStopProject } from './debug/StopProjectTool';
import { getDebugOutputDefinition, handleGetDebugOutput } from './debug/GetDebugOutputTool';

// Project tools
import { launchEditorDefinition, handleLaunchEditor } from './project/LaunchEditorTool';
import { runProjectDefinition, handleRunProject } from './project/RunProjectTool';
import { listProjectsDefinition, handleListProjects } from './project/ListProjectsTool';
import { getProjectInfoDefinition, handleGetProjectInfo } from './project/GetProjectInfoTool';
import { exportProjectDefinition, handleExportProject } from './project/ExportProjectTool';
import { manageAutoloadsDefinition, handleManageAutoloads } from './project/ManageAutoloadsTool';
import { manageInputActionsDefinition, handleManageInputActions } from './project/ManageInputActionsTool';
import { convertProjectDefinition, handleConvertProject } from './project/ConvertProjectTool';
import { generateDocsDefinition, handleGenerateDocs } from './project/GenerateDocsTool';
import { validateProjectDefinition, handleValidateProject } from './project/ValidateProjectTool';

// Scene tools
import { createSceneDefinition, handleCreateScene } from './scene/CreateSceneTool';
import { addNodeDefinition, handleAddNode } from './scene/AddNodeTool';
import { editNodeDefinition, handleEditNode } from './scene/EditNodeTool';
import { removeNodeDefinition, handleRemoveNode } from './scene/RemoveNodeTool';
import { loadSpriteDefinition, handleLoadSprite } from './scene/LoadSpriteTool';
import {
  exportMeshLibraryDefinition,
  handleExportMeshLibrary,
} from './scene/ExportMeshLibraryTool';
import { saveSceneDefinition, handleSaveScene } from './scene/SaveSceneTool';
import { getNodeTreeDefinition, handleGetNodeTree } from './scene/GetNodeTreeTool';
import { duplicateNodeDefinition, handleDuplicateNode } from './scene/DuplicateNodeTool';
import { renameNodeDefinition, handleRenameNode } from './scene/RenameNodeTool';
import { moveNodeDefinition, handleMoveNode } from './scene/MoveNodeTool';
import { instanceSceneDefinition, handleInstanceScene } from './scene/InstanceSceneTool';
import { connectSignalDefinition, handleConnectSignal } from './scene/ConnectSignalTool';
import { manageGroupsDefinition, handleManageGroups } from './scene/ManageGroupsTool';

// UID tools
import { getUidDefinition, handleGetUid } from './uid/GetUidTool';
import { updateProjectUidsDefinition, handleUpdateProjectUids } from './uid/UpdateProjectUidsTool';

// Script tools
import { listScriptsDefinition, handleListScripts } from './script/ListScriptsTool';
import { readScriptDefinition, handleReadScript } from './script/ReadScriptTool';
import { writeScriptDefinition, handleWriteScript } from './script/WriteScriptTool';
import { deleteScriptDefinition, handleDeleteScript } from './script/DeleteScriptTool';
import { attachScriptDefinition, handleAttachScript } from './script/AttachScriptTool';
import { detachScriptDefinition, handleDetachScript } from './script/DetachScriptTool';
import { getScriptErrorsDefinition, handleGetScriptErrors } from './script/GetScriptErrorsTool';

// Resource tools
import { createResourceDefinition, handleCreateResource } from './resource/CreateResourceTool';

// Capture tools
import { takeScreenshotDefinition, handleTakeScreenshot } from './capture/TakeScreenshotTool';

export interface ToolRegistration {
  definition: ToolDefinition;
  handler: ToolHandler<BaseToolArgs>;
  readOnly: boolean;
}

/**
 * Registry of all available tools
 */
export const toolRegistry: Map<string, ToolRegistration> = new Map([
  // System tools
  [
    'get_godot_version',
    {
      definition: getGodotVersionDefinition,
      handler: handleGetGodotVersion,
      readOnly: true,
    },
  ],

  // Debug tools
  [
    'stop_project',
    {
      definition: stopProjectDefinition,
      handler: handleStopProject,
      readOnly: true,
    },
  ],
  [
    'get_debug_output',
    {
      definition: getDebugOutputDefinition,
      handler: handleGetDebugOutput,
      readOnly: true,
    },
  ],

  // Project tools
  [
    'launch_editor',
    {
      definition: launchEditorDefinition,
      handler: handleLaunchEditor,
      readOnly: true,
    },
  ],
  [
    'run_project',
    {
      definition: runProjectDefinition,
      handler: handleRunProject,
      readOnly: true,
    },
  ],
  [
    'list_projects',
    {
      definition: listProjectsDefinition,
      handler: handleListProjects,
      readOnly: true,
    },
  ],
  [
    'get_project_info',
    {
      definition: getProjectInfoDefinition,
      handler: handleGetProjectInfo,
      readOnly: true,
    },
  ],
  [
    'export_project',
    {
      definition: exportProjectDefinition,
      handler: handleExportProject,
      readOnly: false,
    },
  ],
  [
    'manage_autoloads',
    {
      definition: manageAutoloadsDefinition,
      handler: handleManageAutoloads,
      readOnly: false,
    },
  ],
  [
    'manage_input_actions',
    {
      definition: manageInputActionsDefinition,
      handler: handleManageInputActions,
      readOnly: false,
    },
  ],
  [
    'convert_3to4',
    {
      definition: convertProjectDefinition,
      handler: handleConvertProject,
      readOnly: false,
    },
  ],
  [
    'generate_docs',
    {
      definition: generateDocsDefinition,
      handler: handleGenerateDocs,
      readOnly: false,
    },
  ],
  [
    'validate_project',
    {
      definition: validateProjectDefinition,
      handler: handleValidateProject,
      readOnly: true,
    },
  ],

  // Scene tools
  [
    'create_scene',
    {
      definition: createSceneDefinition,
      handler: handleCreateScene,
      readOnly: false,
    },
  ],
  [
    'add_node',
    {
      definition: addNodeDefinition,
      handler: handleAddNode,
      readOnly: false,
    },
  ],
  [
    'edit_node',
    {
      definition: editNodeDefinition,
      handler: handleEditNode,
      readOnly: false,
    },
  ],
  [
    'remove_node',
    {
      definition: removeNodeDefinition,
      handler: handleRemoveNode,
      readOnly: false,
    },
  ],
  [
    'load_sprite',
    {
      definition: loadSpriteDefinition,
      handler: handleLoadSprite,
      readOnly: false,
    },
  ],
  [
    'export_mesh_library',
    {
      definition: exportMeshLibraryDefinition,
      handler: handleExportMeshLibrary,
      readOnly: false,
    },
  ],
  [
    'save_scene',
    {
      definition: saveSceneDefinition,
      handler: handleSaveScene,
      readOnly: false,
    },
  ],
  [
    'get_node_tree',
    {
      definition: getNodeTreeDefinition,
      handler: handleGetNodeTree,
      readOnly: true,
    },
  ],
  [
    'duplicate_node',
    {
      definition: duplicateNodeDefinition,
      handler: handleDuplicateNode,
      readOnly: false,
    },
  ],
  [
    'rename_node',
    {
      definition: renameNodeDefinition,
      handler: handleRenameNode,
      readOnly: false,
    },
  ],
  [
    'move_node',
    {
      definition: moveNodeDefinition,
      handler: handleMoveNode,
      readOnly: false,
    },
  ],
  [
    'instance_scene',
    {
      definition: instanceSceneDefinition,
      handler: handleInstanceScene,
      readOnly: false,
    },
  ],
  [
    'connect_signal',
    {
      definition: connectSignalDefinition,
      handler: handleConnectSignal,
      readOnly: false,
    },
  ],
  [
    'manage_groups',
    {
      definition: manageGroupsDefinition,
      handler: handleManageGroups,
      readOnly: false,
    },
  ],

  // UID tools
  [
    'get_uid',
    {
      definition: getUidDefinition,
      handler: handleGetUid,
      readOnly: true,
    },
  ],
  [
    'update_project_uids',
    {
      definition: updateProjectUidsDefinition,
      handler: handleUpdateProjectUids,
      readOnly: false,
    },
  ],

  // Script tools
  [
    'list_scripts',
    {
      definition: listScriptsDefinition,
      handler: handleListScripts,
      readOnly: true,
    },
  ],
  [
    'read_script',
    {
      definition: readScriptDefinition,
      handler: handleReadScript,
      readOnly: true,
    },
  ],
  [
    'write_script',
    {
      definition: writeScriptDefinition,
      handler: handleWriteScript,
      readOnly: false,
    },
  ],
  [
    'delete_script',
    {
      definition: deleteScriptDefinition,
      handler: handleDeleteScript,
      readOnly: false,
    },
  ],
  [
    'attach_script',
    {
      definition: attachScriptDefinition,
      handler: handleAttachScript,
      readOnly: false,
    },
  ],
  [
    'detach_script',
    {
      definition: detachScriptDefinition,
      handler: handleDetachScript,
      readOnly: false,
    },
  ],
  [
    'get_script_errors',
    {
      definition: getScriptErrorsDefinition,
      handler: handleGetScriptErrors,
      readOnly: true,
    },
  ],

  // Resource tools
  [
    'create_resource',
    {
      definition: createResourceDefinition,
      handler: handleCreateResource,
      readOnly: false,
    },
  ],

  // Capture tools
  [
    'take_screenshot',
    {
      definition: takeScreenshotDefinition,
      handler: handleTakeScreenshot,
      readOnly: true,
    },
  ],
]);

/**
 * Get all tool definitions for MCP server registration
 * Filters tools based on READ_ONLY_MODE
 */
export const getAllToolDefinitions = (): ToolDefinition[] => {
  const allTools = Array.from(toolRegistry.values());

  if (!READ_ONLY_MODE) {
    return allTools.map((tool) => tool.definition);
  }

  // In read-only mode, filter out tools that are not read-only
  const filteredTools = allTools.filter((tool) => tool.readOnly);

  console.log(`[READ_ONLY_MODE] Filtered ${allTools.length - filteredTools.length} write tools`);

  return filteredTools.map((tool) => tool.definition);
};

/**
 * Get a tool handler by name
 */
export const getToolHandler = (
  toolName: string,
): ToolHandler<BaseToolArgs> | undefined => {
  const tool = toolRegistry.get(toolName);
  return tool?.handler;
};

/**
 * Check if a tool is registered
 */
export const isToolRegistered = (toolName: string): boolean => {
  return toolRegistry.has(toolName);
};

/**
 * Get all registered tool names
 */
export const getRegisteredToolNames = (): string[] => {
  return Array.from(toolRegistry.keys());
};
