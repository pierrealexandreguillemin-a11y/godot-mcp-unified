/**
 * Manage Input Actions Tool
 * Add, remove, or list input actions in project.godot
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  ManageInputActionsSchema,
  ManageInputActionsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export type InputActionType = 'key' | 'mouse_button' | 'joypad_button' | 'joypad_axis';

export interface InputEvent {
  type: InputActionType;
  keycode?: string;
  button?: number;
  axis?: number;
  axisValue?: number;
}

export interface InputAction {
  name: string;
  deadzone: number;
  events: InputEvent[];
}

export const manageInputActionsDefinition: ToolDefinition = {
  name: 'manage_input_actions',
  description: 'Add, remove, or list input actions in project.godot',
  inputSchema: toMcpSchema(ManageInputActionsSchema),
};

/**
 * Parse input section from project.godot
 */
function parseInputSection(content: string): Map<string, string> {
  const inputs = new Map<string, string>();
  const lines = content.split(/\r?\n/);

  let inInputSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '[input]') {
      inInputSection = true;
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (inInputSection) break;
      continue;
    }

    if (inInputSection && trimmed && !trimmed.startsWith(';')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        inputs.set(key, value);
      }
    }
  }

  return inputs;
}

/**
 * Parse input actions from the input section values
 */
function parseInputActions(inputs: Map<string, string>): InputAction[] {
  const actions: InputAction[] = [];

  for (const [name, value] of inputs) {
    try {
      // Parse the Godot dictionary format
      // Example: {"deadzone": 0.5, "events": [Object(InputEventKey,"resource_local_to_scene":false,...,"keycode":32,...)]}
      const deadzoneMatch = value.match(/"deadzone":\s*([\d.]+)/);
      const deadzone = deadzoneMatch ? parseFloat(deadzoneMatch[1]) : 0.5;

      const events: InputEvent[] = [];

      // Parse key events
      const keyMatches = value.matchAll(/InputEventKey[^)]*"keycode":\s*(\d+)/g);
      for (const match of keyMatches) {
        events.push({
          type: 'key',
          keycode: `KEY_${match[1]}`,
        });
      }

      // Parse mouse button events
      const mouseMatches = value.matchAll(/InputEventMouseButton[^)]*"button_index":\s*(\d+)/g);
      for (const match of mouseMatches) {
        events.push({
          type: 'mouse_button',
          button: parseInt(match[1], 10),
        });
      }

      // Parse joypad button events
      const joyButtonMatches = value.matchAll(/InputEventJoypadButton[^)]*"button_index":\s*(\d+)/g);
      for (const match of joyButtonMatches) {
        events.push({
          type: 'joypad_button',
          button: parseInt(match[1], 10),
        });
      }

      // Parse joypad axis events
      const joyAxisMatches = value.matchAll(/InputEventJoypadMotion[^)]*"axis":\s*(\d+)[^)]*"axis_value":\s*([-\d.]+)/g);
      for (const match of joyAxisMatches) {
        events.push({
          type: 'joypad_axis',
          axis: parseInt(match[1], 10),
          axisValue: parseFloat(match[2]),
        });
      }

      actions.push({ name, deadzone, events });
    } catch {
      // Skip malformed entries
      actions.push({ name, deadzone: 0.5, events: [] });
    }
  }

  return actions;
}

/**
 * Serialize an input event to Godot format
 */
function serializeInputEvent(event: InputEvent): string {
  switch (event.type) {
    case 'key':
      // Convert KEY_SPACE to keycode
      const keycode = event.keycode?.replace('KEY_', '') || '0';
      return `Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":${keycode},"physical_keycode":0,"key_label":0,"unicode":0,"location":0,"echo":false)`;

    case 'mouse_button':
      return `Object(InputEventMouseButton,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"button_mask":0,"position":Vector2(0,0),"global_position":Vector2(0,0),"factor":1.0,"button_index":${event.button || 1},"canceled":false,"pressed":false,"double_click":false)`;

    case 'joypad_button':
      return `Object(InputEventJoypadButton,"resource_local_to_scene":false,"resource_name":"","device":-1,"button_index":${event.button || 0},"pressure":0.0,"pressed":false)`;

    case 'joypad_axis':
      return `Object(InputEventJoypadMotion,"resource_local_to_scene":false,"resource_name":"","device":-1,"axis":${event.axis || 0},"axis_value":${event.axisValue || 1.0})`;

    default:
      return '';
  }
}

/**
 * Serialize input action to Godot format
 */
function serializeInputAction(action: InputAction): string {
  const events = action.events.map(serializeInputEvent).filter(e => e).join(', ');
  return `{"deadzone": ${action.deadzone}, "events": [${events}]}`;
}

export const handleManageInputActions = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ManageInputActionsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and action (add, remove, or list)',
    ]);
  }

  const typedArgs: ManageInputActionsInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const projectGodotPath = join(typedArgs.projectPath, 'project.godot');

  try {
    let content = readFileSync(projectGodotPath, 'utf-8');
    const inputs = parseInputSection(content);

    switch (typedArgs.action) {
      case 'list': {
        const actions = parseInputActions(inputs);
        return createJsonResponse({
          projectPath: typedArgs.projectPath,
          actionCount: actions.length,
          actions,
        });
      }

      case 'add': {
        if (!typedArgs.name) {
          return createErrorResponse('Name is required for add action', [
            'Provide a unique action name',
          ]);
        }

        // Check if action already exists
        if (inputs.has(typedArgs.name)) {
          return createErrorResponse(`Input action "${typedArgs.name}" already exists`, [
            'Use a different name',
            'Remove the existing action first',
          ]);
        }

        const newAction: InputAction = {
          name: typedArgs.name,
          deadzone: typedArgs.deadzone ?? 0.5,
          events: typedArgs.events || [],
        };

        const serializedAction = serializeInputAction(newAction);

        // Add to input section or create it
        if (!content.includes('[input]')) {
          content += '\n[input]\n\n';
        }

        // Insert before next section or at end of input section
        const inputSectionMatch = content.match(/\[input\]\n/);
        if (inputSectionMatch) {
          const insertPos = inputSectionMatch.index! + inputSectionMatch[0].length;
          content = content.slice(0, insertPos) +
            `${typedArgs.name}=${serializedAction}\n` +
            content.slice(insertPos);
        }

        writeFileSync(projectGodotPath, content, 'utf-8');

        logDebug(`Added input action: ${typedArgs.name}`);

        return createSuccessResponse(
          `Input action added successfully!\n` +
          `Name: ${typedArgs.name}\n` +
          `Deadzone: ${newAction.deadzone}\n` +
          `Events: ${newAction.events.length}`
        );
      }

      case 'remove': {
        if (!typedArgs.name) {
          return createErrorResponse('Name is required for remove action', [
            'Provide the action name to remove',
          ]);
        }

        if (!inputs.has(typedArgs.name)) {
          return createErrorResponse(`Input action "${typedArgs.name}" not found`, [
            'Check the action name',
            'Use action "list" to see available actions',
          ]);
        }

        // Remove the line from content
        const regex = new RegExp(`^${typedArgs.name}=.*$\\n?`, 'm');
        content = content.replace(regex, '');

        writeFileSync(projectGodotPath, content, 'utf-8');

        logDebug(`Removed input action: ${typedArgs.name}`);

        return createSuccessResponse(
          `Input action removed successfully!\n` +
          `Name: ${typedArgs.name}`
        );
      }

      default:
        return createErrorResponse(`Unknown action: ${typedArgs.action}`, [
          'Use "add", "remove", or "list"',
        ]);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to manage input actions: ${errorMessage}`, [
      'Check project.godot exists and is readable',
      'Verify the project path is correct',
    ]);
  }
};
