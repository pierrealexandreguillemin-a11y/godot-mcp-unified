/**
 * Create Control Tool
 * Creates UI Control nodes (Button, Label, LineEdit, TextureRect, etc.)
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

export interface CreateControlArgs extends BaseToolArgs {
  projectPath: string;
  scenePath: string;
  nodeName: string;
  parentNodePath?: string;
  controlType: 'button' | 'label' | 'line_edit' | 'text_edit' | 'rich_text' | 'texture_rect' | 'color_rect' | 'progress_bar' | 'slider_h' | 'slider_v' | 'spin_box' | 'check_box' | 'check_button' | 'option_button' | 'menu_button';
  text?: string;
  placeholderText?: string;
  texturePath?: string;
  color?: { r: number; g: number; b: number; a?: number };
  minValue?: number;
  maxValue?: number;
  value?: number;
}

export const createControlDefinition: ToolDefinition = {
  name: 'create_control',
  description: 'Create a UI Control node (Button, Label, LineEdit, etc.)',
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
        description: 'Name for the Control node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to parent node (default: root)',
      },
      controlType: {
        type: 'string',
        description: 'Type of control',
        enum: ['button', 'label', 'line_edit', 'text_edit', 'rich_text', 'texture_rect', 'color_rect', 'progress_bar', 'slider_h', 'slider_v', 'spin_box', 'check_box', 'check_button', 'option_button', 'menu_button'],
      },
      text: {
        type: 'string',
        description: 'Text content (for Button, Label, etc.)',
      },
      placeholderText: {
        type: 'string',
        description: 'Placeholder text (for LineEdit, TextEdit)',
      },
      texturePath: {
        type: 'string',
        description: 'Path to texture (for TextureRect)',
      },
      color: {
        type: 'object',
        description: 'Color { r, g, b, a } (for ColorRect)',
      },
      minValue: {
        type: 'number',
        description: 'Minimum value (for ProgressBar, Slider, SpinBox)',
      },
      maxValue: {
        type: 'number',
        description: 'Maximum value (for ProgressBar, Slider, SpinBox)',
      },
      value: {
        type: 'number',
        description: 'Current value (for ProgressBar, Slider, SpinBox)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName', 'controlType'],
  },
};

// Map control type to Godot class name
const controlTypeToClass: Record<string, string> = {
  button: 'Button',
  label: 'Label',
  line_edit: 'LineEdit',
  text_edit: 'TextEdit',
  rich_text: 'RichTextLabel',
  texture_rect: 'TextureRect',
  color_rect: 'ColorRect',
  progress_bar: 'ProgressBar',
  slider_h: 'HSlider',
  slider_v: 'VSlider',
  spin_box: 'SpinBox',
  check_box: 'CheckBox',
  check_button: 'CheckButton',
  option_button: 'OptionButton',
  menu_button: 'MenuButton',
};

export const handleCreateControl = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeName',
    'controlType',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodeName, and controlType',
    ]);
  }

  const typedArgs = preparedArgs as CreateControlArgs;

  // Validate control type
  if (!controlTypeToClass[typedArgs.controlType]) {
    return createErrorResponse(`Invalid control type: ${typedArgs.controlType}`, [
      'Valid types: button, label, line_edit, text_edit, rich_text, texture_rect, color_rect, progress_bar, slider_h, slider_v, spin_box, check_box, check_button, option_button, menu_button',
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

    const nodeType = controlTypeToClass[typedArgs.controlType];
    logDebug(`Creating ${nodeType}: ${typedArgs.nodeName}`);

    const params: BaseToolArgs = {
      scene_path: typedArgs.scenePath,
      node_type: nodeType,
      node_name: typedArgs.nodeName,
      parent_node_path: typedArgs.parentNodePath ?? '',
    };

    if (typedArgs.text !== undefined) {
      params.text = typedArgs.text;
    }

    if (typedArgs.placeholderText !== undefined) {
      params.placeholder_text = typedArgs.placeholderText;
    }

    if (typedArgs.texturePath !== undefined) {
      params.texture_path = typedArgs.texturePath;
    }

    if (typedArgs.color !== undefined) {
      params.color = typedArgs.color;
    }

    if (typedArgs.minValue !== undefined) {
      params.min_value = typedArgs.minValue;
    }

    if (typedArgs.maxValue !== undefined) {
      params.max_value = typedArgs.maxValue;
    }

    if (typedArgs.value !== undefined) {
      params.value = typedArgs.value;
    }

    const { stdout, stderr } = await executeOperation(
      'create_control',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create control: ${stderr}`, [
        'Check if the parent node exists',
        'Verify the scene path is correct',
      ]);
    }

    return createSuccessResponse(
      `Control created successfully: ${typedArgs.nodeName} (${nodeType})\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create control: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
    ]);
  }
};
