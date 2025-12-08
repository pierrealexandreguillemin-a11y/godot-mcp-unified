/**
 * Duplicate Node Tool
 * Duplicates an existing node in a scene
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
import { parseTscn, serializeTscn, findNodeByPath, TscnNode } from '../../core/TscnParser.js';

export interface DuplicateNodeArgs extends NodeToolArgs {
  newName?: string;
}

export const duplicateNodeDefinition: ToolDefinition = {
  name: 'duplicate_node',
  description: 'Duplicate an existing node in a scene (.tscn file)',
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
        description: 'Path to the node to duplicate (e.g., "Player/Sprite2D")',
      },
      newName: {
        type: 'string',
        description: 'Name for the duplicated node (default: original_name + "2")',
      },
    },
    required: ['projectPath', 'scenePath', 'nodePath'],
  },
};

export const handleDuplicateNode = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scenePath', 'nodePath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, and nodePath',
    ]);
  }

  const typedArgs = preparedArgs as DuplicateNodeArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  // Cannot duplicate root node
  if (typedArgs.nodePath === '.' || typedArgs.nodePath === '' || typedArgs.nodePath === 'root') {
    return createErrorResponse('Cannot duplicate the root node', [
      'Use create_scene to create a new scene',
      'Or add_node to add a new child',
    ]);
  }

  try {
    const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

    logDebug(`Duplicating node ${typedArgs.nodePath} in scene ${typedArgs.scenePath}`);

    // Read and parse scene file
    const content = readFileSync(sceneFullPath, 'utf-8');
    const doc = parseTscn(content);

    // Find the source node
    const sourceNode = findNodeByPath(doc, typedArgs.nodePath);
    if (!sourceNode) {
      return createErrorResponse(`Node not found: ${typedArgs.nodePath}`, [
        'Check the node path is correct',
        'Use get_node_tree to see available nodes',
      ]);
    }

    // Generate new name
    const baseName = sourceNode.name;
    let newName = typedArgs.newName || `${baseName}2`;

    // Ensure name is unique
    let counter = 2;
    while (doc.nodes.some(n => n.name === newName && n.parent === sourceNode.parent)) {
      newName = `${baseName}${counter}`;
      counter++;
    }

    // Clone the node
    const clonedNode: TscnNode = {
      name: newName,
      type: sourceNode.type,
      parent: sourceNode.parent,
      instance: sourceNode.instance,
      script: sourceNode.script,
      groups: sourceNode.groups ? [...sourceNode.groups] : undefined,
      properties: { ...sourceNode.properties },
    };

    // Find the index to insert after the source node
    const sourceIndex = doc.nodes.findIndex(n => n.name === sourceNode.name && n.parent === sourceNode.parent);
    if (sourceIndex === -1) {
      return createErrorResponse('Failed to locate source node in document', [
        'The scene file may be corrupted',
        'Try opening and saving the scene in Godot editor',
      ]);
    }

    // Also duplicate child nodes
    const childNodes = findChildNodes(doc, sourceNode.name, sourceNode.parent);
    const clonedChildren: TscnNode[] = [];

    for (const child of childNodes) {
      const clonedChild: TscnNode = {
        name: child.name,
        type: child.type,
        parent: child.parent?.replace(baseName, newName),
        instance: child.instance,
        script: child.script,
        groups: child.groups ? [...child.groups] : undefined,
        properties: { ...child.properties },
      };
      clonedChildren.push(clonedChild);
    }

    // Insert cloned node and children after source and its children
    const insertIndex = sourceIndex + childNodes.length + 1;
    doc.nodes.splice(insertIndex, 0, clonedNode, ...clonedChildren);

    // Serialize and write back
    const serialized = serializeTscn(doc);
    writeFileSync(sceneFullPath, serialized, 'utf-8');

    const totalDuplicatedNodes = 1 + clonedChildren.length;

    return createSuccessResponse(
      `Node duplicated successfully!\n` +
      `Scene: ${typedArgs.scenePath}\n` +
      `Original: ${typedArgs.nodePath}\n` +
      `Duplicate: ${newName}\n` +
      `Nodes duplicated: ${totalDuplicatedNodes}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to duplicate node: ${errorMessage}`, [
      'Check the scene file format',
      'Verify paths are correct',
    ]);
  }
};

/**
 * Find all child nodes of a given node
 */
function findChildNodes(doc: { nodes: TscnNode[] }, nodeName: string, nodeParent: string | undefined): TscnNode[] {
  const children: TscnNode[] = [];

  // Direct children
  for (const node of doc.nodes) {
    if (node.parent === nodeName || (nodeParent === '.' && node.parent === nodeName)) {
      children.push(node);
      // Recursively find grandchildren
      children.push(...findChildNodes(doc, node.name, node.parent));
    }
  }

  return children;
}
