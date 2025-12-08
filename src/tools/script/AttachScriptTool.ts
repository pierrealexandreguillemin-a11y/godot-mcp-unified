/**
 * Attach Script Tool
 * Attaches a GDScript to a node in a scene
 *
 * TECHNICAL DEBT: Uses regex-based .tscn parsing which is fragile.
 * TODO: Consider using a proper TSCN parser library or implementing
 * a state-machine parser for more robust scene file manipulation.
 * Current approach may fail on edge cases with complex node structures.
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, AttachScriptArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { logDebug } from '../../utils/Logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export const attachScriptDefinition: ToolDefinition = {
  name: 'attach_script',
  description: 'Attach a GDScript to a node in a scene (.tscn file)',
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
      scriptPath: {
        type: 'string',
        description: 'Path to the script file (relative to project)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodePath', 'scriptPath'],
  },
};

export const handleAttachScript = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scenePath', 'nodePath', 'scriptPath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodePath, and scriptPath',
    ]);
  }

  const typedArgs = preparedArgs as AttachScriptArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    const scriptFullPath = join(typedArgs.projectPath, typedArgs.scriptPath);

    // Verify script exists
    if (!existsSync(scriptFullPath)) {
      return createErrorResponse(`Script file not found: ${typedArgs.scriptPath}`, [
        'Use write_script to create the script first',
        'Check the script path is correct',
      ]);
    }

    const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

    logDebug(`Attaching script ${typedArgs.scriptPath} to node ${typedArgs.nodePath} in scene ${typedArgs.scenePath}`);

    // Read the scene file
    let sceneContent = readFileSync(sceneFullPath, 'utf-8');

    // Convert script path to res:// format
    const resScriptPath = `res://${typedArgs.scriptPath.replace(/\\/g, '/')}`;

    // Check if script is already loaded as external resource
    const extResourceRegex = /\[ext_resource[^\]]*path="([^"]*)"[^\]]*type="Script"[^\]]*id="([^"]*)"/g;
    let scriptResourceId: string | null = null;
    let match;
    let maxId = 0;

    while ((match = extResourceRegex.exec(sceneContent)) !== null) {
      const id = match[2];
      const numId = parseInt(id.replace(/\D/g, ''), 10);
      if (numId > maxId) maxId = numId;
      if (match[1] === resScriptPath) {
        scriptResourceId = id;
      }
    }

    // Also check other ext_resources for max ID
    const allExtResourceRegex = /\[ext_resource[^\]]*id="([^"]*)"/g;
    while ((match = allExtResourceRegex.exec(sceneContent)) !== null) {
      const numId = parseInt(match[1].replace(/\D/g, ''), 10);
      if (numId > maxId) maxId = numId;
    }

    // If script not found as resource, add it
    if (!scriptResourceId) {
      scriptResourceId = `"${maxId + 1}_script"`;
      const newExtResource = `[ext_resource type="Script" path="${resScriptPath}" id=${scriptResourceId}]\n`;

      // Find where to insert (after gd_scene line or after last ext_resource)
      const gdSceneMatch = sceneContent.match(/\[gd_scene[^\]]*\]\n/);
      if (gdSceneMatch) {
        const insertPos = gdSceneMatch.index! + gdSceneMatch[0].length;
        sceneContent = sceneContent.slice(0, insertPos) + newExtResource + sceneContent.slice(insertPos);
      }
    }

    // Now attach script to the node
    // For root node (nodePath is "." or empty)
    const isRootNode = typedArgs.nodePath === '.' || typedArgs.nodePath === '';

    if (isRootNode) {
      // Find the root node definition [node name="..." type="..."]
      const rootNodeRegex = /(\[node name="[^"]*" type="[^"]*")(\])/;
      const rootMatch = sceneContent.match(rootNodeRegex);

      if (rootMatch) {
        // Check if script is already attached
        if (rootMatch[0].includes('script=')) {
          // Replace existing script
          sceneContent = sceneContent.replace(
            /(\[node name="[^"]*" type="[^"]*"[^\]]*script=)ExtResource\("[^"]*"\)/,
            `$1ExtResource(${scriptResourceId})`
          );
        } else {
          // Add script property
          sceneContent = sceneContent.replace(
            rootNodeRegex,
            `$1 script=ExtResource(${scriptResourceId})$2`
          );
        }
      }
    } else {
      // Find the specific node by path
      const nodeName = typedArgs.nodePath.split('/').pop();
      const nodeRegex = new RegExp(
        `(\\[node name="${nodeName}"[^\\]]*)(\\])`,
        'g'
      );

      let found = false;
      sceneContent = sceneContent.replace(nodeRegex, (match, p1, p2) => {
        found = true;
        if (match.includes('script=')) {
          // Replace existing script
          return match.replace(
            /script=ExtResource\("[^"]*"\)/,
            `script=ExtResource(${scriptResourceId})`
          );
        } else {
          // Add script property
          return `${p1} script=ExtResource(${scriptResourceId})${p2}`;
        }
      });

      if (!found) {
        return createErrorResponse(`Node not found in scene: ${typedArgs.nodePath}`, [
          'Check the node path is correct',
          'Use "." for the root node',
        ]);
      }
    }

    // Write the modified scene
    writeFileSync(sceneFullPath, sceneContent, 'utf-8');

    return createSuccessResponse(
      `Script attached successfully!\n` +
      `Scene: ${typedArgs.scenePath}\n` +
      `Node: ${typedArgs.nodePath || '(root)'}\n` +
      `Script: ${typedArgs.scriptPath}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to attach script: ${errorMessage}`, [
      'Check the scene file format',
      'Verify paths are correct',
    ]);
  }
};
