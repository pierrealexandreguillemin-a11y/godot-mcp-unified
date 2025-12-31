/**
 * Setup State Machine Tool
 * Configures an AnimationNodeStateMachine for animation state transitions
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import {
  ToolDefinition,
  ToolResponse,
  BaseToolArgs,
  StateMachineState,
  StateMachineTransition,
  SetupStateMachineArgs,
} from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';

// Re-export for consumers
export type { StateMachineState, StateMachineTransition, SetupStateMachineArgs };

export interface SetupStateMachineResult {
  animTreePath: string;
  statesAdded: number;
  transitionsAdded: number;
  startState?: string;
  message: string;
}

export const setupStateMachineDefinition: ToolDefinition = {
  name: 'setup_state_machine',
  description:
    'Configure an AnimationNodeStateMachine with states and transitions for animation control',
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
      animTreePath: {
        type: 'string',
        description: 'Path to the AnimationTree node in the scene',
      },
      states: {
        type: 'array',
        description:
          'Array of state definitions: {name: string, animation?: string, blendPosition?: number}',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'State name' },
            animation: { type: 'string', description: 'Animation name to play' },
            blendPosition: { type: 'number', description: 'Position in blend space' },
          },
        },
      },
      transitions: {
        type: 'array',
        description:
          'Array of transitions: {from: string, to: string, autoAdvance?: boolean, advanceCondition?: string, xfadeTime?: number, switchMode?: string}',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Source state name' },
            to: { type: 'string', description: 'Target state name' },
            autoAdvance: { type: 'boolean', description: 'Auto-advance when animation ends' },
            advanceCondition: { type: 'string', description: 'Condition expression' },
            xfadeTime: { type: 'number', description: 'Cross-fade duration in seconds' },
            switchMode: {
              type: 'string',
              description: 'immediate, sync, or at_end',
              enum: ['immediate', 'sync', 'at_end'],
            },
          },
        },
      },
      startState: {
        type: 'string',
        description: 'Initial state name (optional)',
      },
    },
    required: ['projectPath', 'scenePath', 'animTreePath', 'states'],
  },
};

export const handleSetupStateMachine = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'animTreePath',
    'states',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, animTreePath, and states',
    ]);
  }

  const typedArgs = preparedArgs as SetupStateMachineArgs;

  // Validate states array
  if (!Array.isArray(typedArgs.states) || typedArgs.states.length === 0) {
    return createErrorResponse('states must be a non-empty array', [
      'Provide at least one state: {name: "idle", animation: "idle_anim"}',
    ]);
  }

  // Validate each state
  for (let i = 0; i < typedArgs.states.length; i++) {
    const state = typedArgs.states[i];
    if (!state.name || typeof state.name !== 'string') {
      return createErrorResponse(`State ${i}: 'name' is required and must be a string`, [
        'Each state needs a name',
      ]);
    }
  }

  // Collect state names for validation
  const stateNames = new Set(typedArgs.states.map((s) => s.name));

  // Check for duplicate state names
  if (stateNames.size !== typedArgs.states.length) {
    return createErrorResponse('Duplicate state names detected', [
      'Each state must have a unique name',
    ]);
  }

  // Validate startState if provided
  if (typedArgs.startState && !stateNames.has(typedArgs.startState)) {
    return createErrorResponse(`Unknown start state: '${typedArgs.startState}'`, [
      'startState must reference an existing state name',
      `Available states: ${Array.from(stateNames).join(', ')}`,
    ]);
  }

  // Validate transitions if provided
  if (typedArgs.transitions) {
    if (!Array.isArray(typedArgs.transitions)) {
      return createErrorResponse('transitions must be an array', [
        'Provide transitions as: [{from: "idle", to: "walk"}]',
      ]);
    }

    for (let i = 0; i < typedArgs.transitions.length; i++) {
      const trans = typedArgs.transitions[i];
      if (!trans.from || !trans.to) {
        return createErrorResponse(`Transition ${i}: 'from' and 'to' are required`, [
          'Each transition needs from and to states',
        ]);
      }
      if (!stateNames.has(trans.from)) {
        return createErrorResponse(`Transition ${i}: unknown source state '${trans.from}'`, [
          'Ensure source state exists in states array',
        ]);
      }
      if (!stateNames.has(trans.to)) {
        return createErrorResponse(`Transition ${i}: unknown target state '${trans.to}'`, [
          'Ensure target state exists in states array',
        ]);
      }
      // Validate switchMode if provided
      if (trans.switchMode && !['immediate', 'sync', 'at_end'].includes(trans.switchMode)) {
        return createErrorResponse(`Transition ${i}: invalid switchMode '${trans.switchMode}'`, [
          'Use one of: immediate, sync, at_end',
        ]);
      }
      // Validate xfadeTime if provided
      if (trans.xfadeTime !== undefined) {
        if (typeof trans.xfadeTime !== 'number' || !Number.isFinite(trans.xfadeTime) || trans.xfadeTime < 0) {
          return createErrorResponse(`Transition ${i}: xfadeTime must be a non-negative number`, [
            'Provide xfadeTime as seconds (e.g., 0.2)',
          ]);
        }
      }
    }
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

    logDebug(
      `Setting up state machine at ${typedArgs.animTreePath} with ${typedArgs.states.length} states`,
    );

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      animTreePath: typedArgs.animTreePath,
      states: typedArgs.states,
    };

    if (typedArgs.transitions && typedArgs.transitions.length > 0) {
      params.transitions = typedArgs.transitions;
    }
    if (typedArgs.startState) {
      params.startState = typedArgs.startState;
    }

    const { stderr } = await executeOperation(
      'setup_state_machine',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to setup state machine: ${stderr}`, [
        'Check if the AnimationTree node exists',
        'Verify animation names are correct',
      ]);
    }

    const result: SetupStateMachineResult = {
      animTreePath: typedArgs.animTreePath,
      statesAdded: typedArgs.states.length,
      transitionsAdded: typedArgs.transitions?.length ?? 0,
      startState: typedArgs.startState,
      message: `State machine configured with ${typedArgs.states.length} states and ${typedArgs.transitions?.length ?? 0} transitions`,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to setup state machine: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the AnimationTree path is correct',
    ]);
  }
};
