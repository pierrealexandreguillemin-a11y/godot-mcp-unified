/**
 * Rename Node Tool
 * Renames an existing node in a scene, updating all references
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, NodeToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseTscn, serializeTscn, findNodeByPath } from '../../core/TscnParser.js';

export interface RenameNodeArgs extends NodeToolArgs {
  newName: string;
}

export const renameNodeDefinition: ToolDefinition = {
  name: 'rename_node',
  description: 'Rename an existing node in a scene, updating all parent references',
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
        description: 'Path to the node to rename (e.g., "Player/Sprite2D")',
      },
      newName: {
        type: 'string',
        description: 'New name for the node',
      },
    },
    required: ['projectPath', 'scenePath', 'nodePath', 'newName'],
  },
};

export const handleRenameNode = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scenePath', 'nodePath', 'newName']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodePath, and newName',
    ]);
  }

  const typedArgs = preparedArgs as RenameNodeArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  // Validate new name
  if (!typedArgs.newName || typedArgs.newName.trim() === '') {
    return createErrorResponse('New name cannot be empty', [
      'Provide a valid node name',
    ]);
  }

  // Check for invalid characters in name
  if (/[\/\\:*?"<>|]/.test(typedArgs.newName)) {
    return createErrorResponse('Node name contains invalid characters', [
      'Avoid characters: / \\ : * ? " < > |',
    ]);
  }

  try {
    const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

    logDebug(`Renaming node ${typedArgs.nodePath} to ${typedArgs.newName} in scene ${typedArgs.scenePath}`);

    // Read and parse scene file
    const content = readFileSync(sceneFullPath, 'utf-8');
    const doc = parseTscn(content);

    // Find the node to rename
    const node = findNodeByPath(doc, typedArgs.nodePath);
    if (!node) {
      return createErrorResponse(`Node not found: ${typedArgs.nodePath}`, [
        'Check the node path is correct',
        'Use get_node_tree to see available nodes',
      ]);
    }

    const oldName = node.name;

    // Check if new name already exists at same level
    const siblingExists = doc.nodes.some(n =>
      n.name === typedArgs.newName &&
      n.parent === node.parent &&
      n !== node
    );

    if (siblingExists) {
      return createErrorResponse(`A sibling node named "${typedArgs.newName}" already exists`, [
        'Choose a different name',
        'Remove the existing node first',
      ]);
    }

    // Update the node name
    node.name = typedArgs.newName;

    // Update all child nodes that reference this node as parent
    let updatedReferences = 0;
    for (const childNode of doc.nodes) {
      if (childNode.parent === oldName) {
        childNode.parent = typedArgs.newName;
        updatedReferences++;
      }
      // Also handle nested paths
      if (childNode.parent && childNode.parent.includes(oldName + '/')) {
        childNode.parent = childNode.parent.replace(oldName + '/', typedArgs.newName + '/');
        updatedReferences++;
      }
    }

    // Update connections that reference this node
    for (const conn of doc.connections) {
      if (conn.from === oldName) {
        conn.from = typedArgs.newName;
        updatedReferences++;
      }
      if (conn.to === oldName) {
        conn.to = typedArgs.newName;
        updatedReferences++;
      }
      // Handle path references
      if (conn.from.startsWith(oldName + '/')) {
        conn.from = typedArgs.newName + conn.from.slice(oldName.length);
        updatedReferences++;
      }
      if (conn.to.startsWith(oldName + '/')) {
        conn.to = typedArgs.newName + conn.to.slice(oldName.length);
        updatedReferences++;
      }
    }

    // Serialize and write back
    const serialized = serializeTscn(doc);
    writeFileSync(sceneFullPath, serialized, 'utf-8');

    return createSuccessResponse(
      `Node renamed successfully!\n` +
      `Scene: ${typedArgs.scenePath}\n` +
      `Old name: ${oldName}\n` +
      `New name: ${typedArgs.newName}\n` +
      `References updated: ${updatedReferences}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to rename node: ${errorMessage}`, [
      'Check the scene file format',
      'Verify paths are correct',
    ]);
  }
};
