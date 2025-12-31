/**
 * Create UI Container Tool
 * Creates Container nodes (VBoxContainer, HBoxContainer, GridContainer, etc.)
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { executeOperation } from '../../core/GodotExecutor';
import { logDebug } from '../../utils/Logger';

export interface CreateUIContainerArgs extends BaseToolArgs {
  projectPath: string;
  scenePath: string;
  nodeName: string;
  parentNodePath?: string;
  containerType: 'vbox' | 'hbox' | 'grid' | 'center' | 'margin' | 'panel' | 'scroll' | 'split_h' | 'split_v' | 'tab' | 'flow';
  columns?: number;
  customMinimumSize?: { x: number; y: number };
  anchorsPreset?: 'full_rect' | 'center' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
}

export const createUIContainerDefinition: ToolDefinition = {
  name: 'create_ui_container',
  description: 'Create a Container node for UI layout (VBox, HBox, Grid, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      scenePath: {
        type: 'string',
        description: 'Path to the scene file (relative to project)',
      },
      nodeName: {
        type: 'string',
        description: 'Name for the Container node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to parent node (default: root)',
      },
      containerType: {
        type: 'string',
        description: 'Type of container',
        enum: ['vbox', 'hbox', 'grid', 'center', 'margin', 'panel', 'scroll', 'split_h', 'split_v', 'tab', 'flow'],
      },
      columns: {
        type: 'number',
        description: 'Number of columns (for GridContainer, default: 1)',
      },
      customMinimumSize: {
        type: 'object',
        description: 'Custom minimum size { x, y }',
      },
      anchorsPreset: {
        type: 'string',
        description: 'Anchors preset for positioning',
        enum: ['full_rect', 'center', 'top_left', 'top_right', 'bottom_left', 'bottom_right'],
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName', 'containerType'],
  },
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

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeName',
    'containerType',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodeName, and containerType',
    ]);
  }

  const typedArgs = preparedArgs as CreateUIContainerArgs;

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
