/**
 * Detach Script Tool
 * Detaches a GDScript from a node in a scene
 *
 * TECHNICAL DEBT: Uses regex-based .tscn parsing which is fragile.
 * TODO: Consider using a proper TSCN parser library or implementing
 * a state-machine parser for more robust scene file manipulation.
 * Current approach may fail on edge cases with complex node structures.
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, DetachScriptArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { logDebug } from '../../utils/Logger';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const detachScriptDefinition: ToolDefinition = {
  name: 'detach_script',
  description: 'Detach a GDScript from a node in a scene (.tscn file)',
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
      nodePath: {
        type: 'string',
        description: 'Path to the node in the scene (e.g., "." for root, "Player/Sprite2D")',
      },
    },
    required: ['projectPath', 'scenePath', 'nodePath'],
  },
};

export const handleDetachScript = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scenePath', 'nodePath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, and nodePath',
    ]);
  }

  const typedArgs = preparedArgs as DetachScriptArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

    logDebug(`Detaching script from node ${typedArgs.nodePath} in scene ${typedArgs.scenePath}`);

    // Read the scene file
    let sceneContent = readFileSync(sceneFullPath, 'utf-8');

    // For root node (nodePath is "." or empty)
    const isRootNode = typedArgs.nodePath === '.' || typedArgs.nodePath === '';

    let modified = false;

    if (isRootNode) {
      // Find the root node definition and remove script attribute
      const rootNodeWithScriptRegex = /(\[node name="[^"]*" type="[^"]*")(\s+script=ExtResource\([^)]+\))(\])/;
      if (rootNodeWithScriptRegex.test(sceneContent)) {
        sceneContent = sceneContent.replace(rootNodeWithScriptRegex, '$1$3');
        modified = true;
      }
    } else {
      // Find the specific node by name and remove script attribute
      const nodeName = typedArgs.nodePath.split('/').pop();
      const nodeWithScriptRegex = new RegExp(
        `(\\[node name="${nodeName}"[^\\]]*)\\s+script=ExtResource\\([^)]+\\)([^\\]]*\\])`,
        'g'
      );

      if (nodeWithScriptRegex.test(sceneContent)) {
        sceneContent = sceneContent.replace(nodeWithScriptRegex, '$1$2');
        modified = true;
      }
    }

    if (!modified) {
      return createErrorResponse(`No script found attached to node: ${typedArgs.nodePath}`, [
        'Check the node path is correct',
        'Verify the node has a script attached',
        'Use "." for the root node',
      ]);
    }

    // Write the modified scene
    writeFileSync(sceneFullPath, sceneContent, 'utf-8');

    return createSuccessResponse(
      `Script detached successfully!\n` +
      `Scene: ${typedArgs.scenePath}\n` +
      `Node: ${typedArgs.nodePath || '(root)'}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to detach script: ${errorMessage}`, [
      'Check the scene file format',
      'Verify paths are correct',
    ]);
  }
};
