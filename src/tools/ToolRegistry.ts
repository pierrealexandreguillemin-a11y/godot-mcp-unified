/**
 * Tool Registry
 * Central registry for all available tools with their definitions and handlers
 * ISO/IEC 25010 compliant - strict typing
 */

import {
  ToolDefinition,
  BaseToolArgs,
  ToolHandler,
} from '../server/types';
import { READ_ONLY_MODE } from '../config/config';

// System tools
import { getGodotVersionDefinition, handleGetGodotVersion } from './system/GetGodotVersionTool';

// Debug tools
import { stopProjectDefinition, handleStopProject } from './debug/StopProjectTool';
import { getDebugOutputDefinition, handleGetDebugOutput } from './debug/GetDebugOutputTool';
import { startDebugStreamDefinition, handleStartDebugStream } from './debug/StartDebugStreamTool';
import { stopDebugStreamDefinition, handleStopDebugStream } from './debug/StopDebugStreamTool';
import { getDebugStreamStatusDefinition, handleGetDebugStreamStatus } from './debug/GetDebugStreamStatusTool';

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
import { getProjectSettingsDefinition, handleGetProjectSettings } from './project/GetProjectSettingsTool';
import { setProjectSettingDefinition, handleSetProjectSetting } from './project/SetProjectSettingTool';
import { validateConversionDefinition, handleValidateConversion } from './project/ValidateConversionTool';
import { exportPackDefinition, handleExportPack } from './project/ExportPackTool';
import { listExportPresetsDefinition, handleListExportPresets } from './project/ListExportPresetsTool';

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
import { listScenesDefinition, handleListScenes } from './scene/ListScenesTool';

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
import { listResourcesDefinition, handleListResources } from './resource/ListResourcesTool';

// Capture tools
import { takeScreenshotDefinition, handleTakeScreenshot } from './capture/TakeScreenshotTool';

// Animation tools
import { createAnimationPlayerDefinition, handleCreateAnimationPlayer } from './animation/CreateAnimationPlayerTool';
import { addAnimationDefinition, handleAddAnimation } from './animation/AddAnimationTool';
import { addAnimationTrackDefinition, handleAddAnimationTrack } from './animation/AddAnimationTrackTool';
import { createAnimationTreeDefinition, handleCreateAnimationTree } from './animation/CreateAnimationTreeTool';
import { setupStateMachineDefinition, handleSetupStateMachine } from './animation/SetupStateMachineTool';
import { blendAnimationsDefinition, handleBlendAnimations } from './animation/BlendAnimationsTool';
import { setKeyframeDefinition, handleSetKeyframe } from './animation/SetKeyframeTool';

// Physics tools
import { createCollisionShapeDefinition, handleCreateCollisionShape } from './physics/CreateCollisionShapeTool';
import { setupRigidBodyDefinition, handleSetupRigidBody } from './physics/SetupRigidBodyTool';
import { configurePhysicsLayersDefinition, handleConfigurePhysicsLayers } from './physics/ConfigurePhysicsLayersTool';

// TileMap tools
import { createTileSetDefinition, handleCreateTileSet } from './tilemap/CreateTileSetTool';
import { createTileMapLayerDefinition, handleCreateTileMapLayer } from './tilemap/CreateTileMapLayerTool';
import { setTileDefinition, handleSetTile } from './tilemap/SetTileTool';
import { paintTilesDefinition, handlePaintTiles } from './tilemap/PaintTilesTool';

// Audio tools
import { createAudioBusDefinition, handleCreateAudioBus } from './audio/CreateAudioBusTool';
import { setupAudioPlayerDefinition, handleSetupAudioPlayer } from './audio/SetupAudioPlayerTool';
import { addAudioEffectDefinition, handleAddAudioEffect } from './audio/AddAudioEffectTool';

// Shader tools
import { createShaderDefinition, handleCreateShader } from './shader/CreateShaderTool';
import { createShaderMaterialDefinition, handleCreateShaderMaterial } from './shader/CreateShaderMaterialTool';

// Navigation tools
import { createNavigationRegionDefinition, handleCreateNavigationRegion } from './navigation/CreateNavigationRegionTool';
import { bakeNavigationMeshDefinition, handleBakeNavigationMesh } from './navigation/BakeNavigationMeshTool';

// Particles tools
import { createGPUParticlesDefinition, handleCreateGPUParticles } from './particles/CreateGPUParticlesTool';
import { createParticleMaterialDefinition, handleCreateParticleMaterial } from './particles/CreateParticleMaterialTool';

// UI tools
import { createUIContainerDefinition, handleCreateUIContainer } from './ui/CreateUIContainerTool';
import { createControlDefinition, handleCreateControl } from './ui/CreateControlTool';

// Lighting tools
import { createLightDefinition, handleCreateLight } from './lighting/CreateLightTool';
import { setupEnvironmentDefinition, handleSetupEnvironment } from './lighting/SetupEnvironmentTool';

// Asset tools
import { listAssetsDefinition, handleListAssets } from './asset/ListAssetsTool';
import { importAssetDefinition, handleImportAsset } from './asset/ImportAssetTool';
import { reimportAssetsDefinition, handleReimportAssets } from './asset/ReimportAssetsTool';

// Batch tools
import { batchOperationsDefinition, handleBatchOperations } from './batch/BatchOperationsTool';

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
  [
    'start_debug_stream',
    {
      definition: startDebugStreamDefinition,
      handler: handleStartDebugStream,
      readOnly: false,
    },
  ],
  [
    'stop_debug_stream',
    {
      definition: stopDebugStreamDefinition,
      handler: handleStopDebugStream,
      readOnly: false,
    },
  ],
  [
    'get_debug_stream_status',
    {
      definition: getDebugStreamStatusDefinition,
      handler: handleGetDebugStreamStatus,
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
  [
    'get_project_settings',
    {
      definition: getProjectSettingsDefinition,
      handler: handleGetProjectSettings,
      readOnly: true,
    },
  ],
  [
    'set_project_setting',
    {
      definition: setProjectSettingDefinition,
      handler: handleSetProjectSetting,
      readOnly: false,
    },
  ],
  [
    'validate_conversion_3to4',
    {
      definition: validateConversionDefinition,
      handler: handleValidateConversion,
      readOnly: true,
    },
  ],
  [
    'export_pack',
    {
      definition: exportPackDefinition,
      handler: handleExportPack,
      readOnly: false,
    },
  ],
  [
    'list_export_presets',
    {
      definition: listExportPresetsDefinition,
      handler: handleListExportPresets,
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
  [
    'list_scenes',
    {
      definition: listScenesDefinition,
      handler: handleListScenes,
      readOnly: true,
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
  [
    'list_resources',
    {
      definition: listResourcesDefinition,
      handler: handleListResources,
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

  // Animation tools
  [
    'create_animation_player',
    {
      definition: createAnimationPlayerDefinition,
      handler: handleCreateAnimationPlayer,
      readOnly: false,
    },
  ],
  [
    'add_animation',
    {
      definition: addAnimationDefinition,
      handler: handleAddAnimation,
      readOnly: false,
    },
  ],
  [
    'add_animation_track',
    {
      definition: addAnimationTrackDefinition,
      handler: handleAddAnimationTrack,
      readOnly: false,
    },
  ],
  [
    'set_keyframe',
    {
      definition: setKeyframeDefinition,
      handler: handleSetKeyframe,
      readOnly: false,
    },
  ],
  [
    'create_animation_tree',
    {
      definition: createAnimationTreeDefinition,
      handler: handleCreateAnimationTree,
      readOnly: false,
    },
  ],
  [
    'setup_state_machine',
    {
      definition: setupStateMachineDefinition,
      handler: handleSetupStateMachine,
      readOnly: false,
    },
  ],
  [
    'blend_animations',
    {
      definition: blendAnimationsDefinition,
      handler: handleBlendAnimations,
      readOnly: false,
    },
  ],

  // Physics tools
  [
    'create_collision_shape',
    {
      definition: createCollisionShapeDefinition,
      handler: handleCreateCollisionShape,
      readOnly: false,
    },
  ],
  [
    'setup_rigidbody',
    {
      definition: setupRigidBodyDefinition,
      handler: handleSetupRigidBody,
      readOnly: false,
    },
  ],
  [
    'configure_physics_layers',
    {
      definition: configurePhysicsLayersDefinition,
      handler: handleConfigurePhysicsLayers,
      readOnly: false,
    },
  ],

  // TileMap tools
  [
    'create_tileset',
    {
      definition: createTileSetDefinition,
      handler: handleCreateTileSet,
      readOnly: false,
    },
  ],
  [
    'create_tilemap_layer',
    {
      definition: createTileMapLayerDefinition,
      handler: handleCreateTileMapLayer,
      readOnly: false,
    },
  ],
  [
    'set_tile',
    {
      definition: setTileDefinition,
      handler: handleSetTile,
      readOnly: false,
    },
  ],
  [
    'paint_tiles',
    {
      definition: paintTilesDefinition,
      handler: handlePaintTiles,
      readOnly: false,
    },
  ],

  // Audio tools
  [
    'create_audio_bus',
    {
      definition: createAudioBusDefinition,
      handler: handleCreateAudioBus,
      readOnly: false,
    },
  ],
  [
    'setup_audio_player',
    {
      definition: setupAudioPlayerDefinition,
      handler: handleSetupAudioPlayer,
      readOnly: false,
    },
  ],
  [
    'add_audio_effect',
    {
      definition: addAudioEffectDefinition,
      handler: handleAddAudioEffect,
      readOnly: false,
    },
  ],

  // Shader tools
  [
    'create_shader',
    {
      definition: createShaderDefinition,
      handler: handleCreateShader,
      readOnly: false,
    },
  ],
  [
    'create_shader_material',
    {
      definition: createShaderMaterialDefinition,
      handler: handleCreateShaderMaterial,
      readOnly: false,
    },
  ],

  // Navigation tools
  [
    'create_navigation_region',
    {
      definition: createNavigationRegionDefinition,
      handler: handleCreateNavigationRegion,
      readOnly: false,
    },
  ],
  [
    'bake_navigation_mesh',
    {
      definition: bakeNavigationMeshDefinition,
      handler: handleBakeNavigationMesh,
      readOnly: false,
    },
  ],

  // Particles tools
  [
    'create_gpu_particles',
    {
      definition: createGPUParticlesDefinition,
      handler: handleCreateGPUParticles,
      readOnly: false,
    },
  ],
  [
    'create_particle_material',
    {
      definition: createParticleMaterialDefinition,
      handler: handleCreateParticleMaterial,
      readOnly: false,
    },
  ],

  // UI tools
  [
    'create_ui_container',
    {
      definition: createUIContainerDefinition,
      handler: handleCreateUIContainer,
      readOnly: false,
    },
  ],
  [
    'create_control',
    {
      definition: createControlDefinition,
      handler: handleCreateControl,
      readOnly: false,
    },
  ],

  // Lighting tools
  [
    'create_light',
    {
      definition: createLightDefinition,
      handler: handleCreateLight,
      readOnly: false,
    },
  ],
  [
    'setup_environment',
    {
      definition: setupEnvironmentDefinition,
      handler: handleSetupEnvironment,
      readOnly: false,
    },
  ],

  // Asset tools
  [
    'list_assets',
    {
      definition: listAssetsDefinition,
      handler: handleListAssets,
      readOnly: true,
    },
  ],
  [
    'import_asset',
    {
      definition: importAssetDefinition,
      handler: handleImportAsset,
      readOnly: false,
    },
  ],
  [
    'reimport_assets',
    {
      definition: reimportAssetsDefinition,
      handler: handleReimportAssets,
      readOnly: false,
    },
  ],

  // Batch tools
  [
    'batch_operations',
    {
      definition: batchOperationsDefinition,
      handler: handleBatchOperations,
      readOnly: false,
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
