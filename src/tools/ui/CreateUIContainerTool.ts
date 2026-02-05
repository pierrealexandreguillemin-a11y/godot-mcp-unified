/**
 * Create UI Container Tool
 * Creates Container nodes (VBoxContainer, HBoxContainer, GridContainer, etc.)
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  CreateUIContainerSchema,
  CreateUIContainerInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createUIContainerDefinition: ToolDefinition = {
  name: 'create_ui_container',
  description: 'Create a Container node for UI layout (VBox, HBox, Grid, etc.)',
  inputSchema: toMcpSchema(CreateUIContainerSchema),
};

// Map container type to Godot class name
const containerTypeToClass: Record<string, string> = {
  vbox: 'VBoxContainer',
  hbox: 'HBoxContainer',
  grid: 'GridContainer',
  center: 'CenterContainer',
  margin: 'MarginContainer',
  panel: 'PanelContainer',
  scroll: 'ScrollContainer',
  split_h: 'HSplitContainer',
  split_v: 'VSplitContainer',
  tab: 'TabContainer',
  flow: 'FlowContainer',
};

export const handleCreateUIContainer = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateUIContainerSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodeName, and containerType',
    ]);
  }

  const typedArgs: CreateUIContainerInput = validation.data;

  // Validate container type
  if (!containerTypeToClass[typedArgs.containerType]) {
    return createErrorResponse(`Invalid container type: ${typedArgs.containerType}`, [
      'Valid types: vbox, hbox, grid, center, margin, panel, scroll, split_h, split_v, tab, flow',
    ]);
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable',
      ]);
    }

    const nodeType = containerTypeToClass[typedArgs.containerType];
    logDebug(`Creating ${nodeType}: ${typedArgs.nodeName}`);

    const params: BaseToolArgs = {
      scene_path: typedArgs.scenePath,
      node_type: nodeType,
      node_name: typedArgs.nodeName,
      parent_node_path: typedArgs.parentNodePath ?? '',
    };

    if (typedArgs.columns !== undefined && typedArgs.containerType === 'grid') {
      params.columns = typedArgs.columns;
    }

    if (typedArgs.customMinimumSize) {
      params.custom_minimum_size = typedArgs.customMinimumSize;
    }

    if (typedArgs.anchorsPreset) {
      params.anchors_preset = typedArgs.anchorsPreset;
    }

    const { stdout, stderr } = await executeOperation(
      'create_ui_container',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create UI container: ${stderr}`, [
        'Check if the parent node exists',
        'Verify the scene path is correct',
      ]);
    }

    return createSuccessResponse(
      `UI Container created successfully: ${typedArgs.nodeName} (${nodeType})\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create UI container: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
    ]);
  }
};
