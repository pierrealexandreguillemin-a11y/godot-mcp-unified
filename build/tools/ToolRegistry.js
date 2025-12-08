/**
 * Tool Registry
 * Central registry for all available tools with their definitions and handlers
 */
import { READ_ONLY_MODE } from '../config/config.js';
// System tools
import { getGodotVersionDefinition, handleGetGodotVersion } from './system/GetGodotVersionTool.js';
// Debug tools
import { stopProjectDefinition, handleStopProject } from './debug/StopProjectTool.js';
import { getDebugOutputDefinition, handleGetDebugOutput } from './debug/GetDebugOutputTool.js';
// Project tools
import { launchEditorDefinition, handleLaunchEditor } from './project/LaunchEditorTool.js';
import { runProjectDefinition, handleRunProject } from './project/RunProjectTool.js';
import { listProjectsDefinition, handleListProjects } from './project/ListProjectsTool.js';
import { getProjectInfoDefinition, handleGetProjectInfo } from './project/GetProjectInfoTool.js';
// Scene tools
import { createSceneDefinition, handleCreateScene } from './scene/CreateSceneTool.js';
import { addNodeDefinition, handleAddNode } from './scene/AddNodeTool.js';
import { editNodeDefinition, handleEditNode } from './scene/EditNodeTool.js';
import { removeNodeDefinition, handleRemoveNode } from './scene/RemoveNodeTool.js';
import { loadSpriteDefinition, handleLoadSprite } from './scene/LoadSpriteTool.js';
import { exportMeshLibraryDefinition, handleExportMeshLibrary, } from './scene/ExportMeshLibraryTool.js';
import { saveSceneDefinition, handleSaveScene } from './scene/SaveSceneTool.js';
// UID tools
import { getUidDefinition, handleGetUid } from './uid/GetUidTool.js';
import { updateProjectUidsDefinition, handleUpdateProjectUids } from './uid/UpdateProjectUidsTool.js';
// Script tools
import { listScriptsDefinition, handleListScripts } from './script/ListScriptsTool.js';
import { readScriptDefinition, handleReadScript } from './script/ReadScriptTool.js';
import { writeScriptDefinition, handleWriteScript } from './script/WriteScriptTool.js';
import { deleteScriptDefinition, handleDeleteScript } from './script/DeleteScriptTool.js';
import { attachScriptDefinition, handleAttachScript } from './script/AttachScriptTool.js';
import { getScriptErrorsDefinition, handleGetScriptErrors } from './script/GetScriptErrorsTool.js';
// Capture tools
import { takeScreenshotDefinition, handleTakeScreenshot } from './capture/TakeScreenshotTool.js';
/**
 * Registry of all available tools
 */
export const toolRegistry = new Map([
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
        'get_script_errors',
        {
            definition: getScriptErrorsDefinition,
            handler: handleGetScriptErrors,
            readOnly: true,
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
export const getAllToolDefinitions = () => {
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
export const getToolHandler = (toolName) => {
    const tool = toolRegistry.get(toolName);
    return tool?.handler;
};
/**
 * Check if a tool is registered
 */
export const isToolRegistered = (toolName) => {
    return toolRegistry.has(toolName);
};
/**
 * Get all registered tool names
 */
export const getRegisteredToolNames = () => {
    return Array.from(toolRegistry.keys());
};
//# sourceMappingURL=ToolRegistry.js.map