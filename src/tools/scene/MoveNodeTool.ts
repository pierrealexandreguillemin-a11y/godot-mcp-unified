/**
 * Move Node Tool
 * Moves a node to a different parent in the scene tree
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

export interface MoveNodeArgs extends NodeToolArgs {
  newParentPath: string;
}

export const moveNodeDefinition: ToolDefinition = {
  name: 'move_node',
  description: 'Move a node to a different parent in the scene tree',
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
        description: 'Path to the node to move (e.g., "OldParent/MyNode")',
      },
      newParentPath: {
        type: 'string',
        description: 'Path to the new parent node (e.g., "NewParent" or "." for root)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodePath', 'newParentPath'],
  },
};

export const handleMoveNode = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scenePath', 'nodePath', 'newParentPath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodePath, and newParentPath',
    ]);
  }

  const typedArgs = preparedArgs as MoveNodeArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  // Cannot move root node
  if (typedArgs.nodePath === '.' || typedArgs.nodePath === '' || typedArgs.nodePath === 'root') {
    return createErrorResponse('Cannot move the root node', [
      'The root node cannot have a parent',
    ]);
  }

  try {
    const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

    logDebug(`Moving node ${typedArgs.nodePath} to parent ${typedArgs.newParentPath} in scene ${typedArgs.scenePath}`);

    // Read and parse scene file
    const content = readFileSync(sceneFullPath, 'utf-8');
    const doc = parseTscn(content);

    // Find the node to move
    const node = findNodeByPath(doc, typedArgs.nodePath);
    if (!node) {
      return createErrorResponse(`Node not found: ${typedArgs.nodePath}`, [
        'Check the node path is correct',
        'Use get_node_tree to see available nodes',
      ]);
    }

    // Find the new parent (if not root)
    const isNewParentRoot = typedArgs.newParentPath === '.' || typedArgs.newParentPath === '' || typedArgs.newParentPath === 'root';

    if (!isNewParentRoot) {
      const newParent = findNodeByPath(doc, typedArgs.newParentPath);
      if (!newParent) {
        return createErrorResponse(`New parent node not found: ${typedArgs.newParentPath}`, [
          'Check the parent path is correct',
          'Use get_node_tree to see available nodes',
        ]);
      }

      // Prevent moving node to its own descendant
      if (typedArgs.newParentPath.includes(node.name)) {
        return createErrorResponse('Cannot move a node to its own descendant', [
          'Choose a different parent',
        ]);
      }
    }

    // Check if node with same name already exists at new parent
    const targetParent = isNewParentRoot ? '.' : typedArgs.newParentPath.split('/').pop();
    const siblingExists = doc.nodes.some(n =>
      n.name === node.name &&
      n.parent === targetParent &&
      n !== node
    );

    if (siblingExists) {
      return createErrorResponse(`A node named "${node.name}" already exists under the new parent`, [
        'Rename the node first using rename_node',
        'Remove the existing node',
      ]);
    }

    const oldParent = node.parent;

    // Update the node's parent
    // In TSCN format, child references use node names, not paths, so no updates needed
    node.parent = isNewParentRoot ? '.' : typedArgs.newParentPath.split('/').pop();

    // Serialize and write back
    const serialized = serializeTscn(doc);
    writeFileSync(sceneFullPath, serialized, 'utf-8');

    return createSuccessResponse(
      `Node moved successfully!\n` +
      `Scene: ${typedArgs.scenePath}\n` +
      `Node: ${node.name}\n` +
      `Old parent: ${oldParent || '(root)'}\n` +
      `New parent: ${isNewParentRoot ? '(root)' : typedArgs.newParentPath}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to move node: ${errorMessage}`, [
      'Check the scene file format',
      'Verify paths are correct',
    ]);
  }
};
