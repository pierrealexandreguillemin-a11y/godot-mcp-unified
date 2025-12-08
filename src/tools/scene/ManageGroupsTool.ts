/**
 * Manage Groups Tool
 * Add or remove nodes from groups in a scene
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
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseTscn, serializeTscn, findNodeByPath } from '../../core/TscnParser.js';

export interface ManageGroupsArgs extends NodeToolArgs {
  action: 'add' | 'remove' | 'list';
  groups?: string[];
}

export const manageGroupsDefinition: ToolDefinition = {
  name: 'manage_groups',
  description: 'Add or remove nodes from groups in a scene',
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
        description: 'Path to the node',
      },
      action: {
        type: 'string',
        enum: ['add', 'remove', 'list'],
        description: 'Action to perform',
      },
      groups: {
        type: 'array',
        items: { type: 'string' },
        description: 'Group names (required for add/remove)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodePath', 'action'],
  },
};

export const handleManageGroups = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scenePath', 'nodePath', 'action']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodePath, and action',
    ]);
  }

  const typedArgs = preparedArgs as ManageGroupsArgs;

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

    logDebug(`Managing groups for ${typedArgs.nodePath} in scene ${typedArgs.scenePath}`);

    // Read and parse scene file
    const content = readFileSync(sceneFullPath, 'utf-8');
    const doc = parseTscn(content);

    // Find the node
    const node = findNodeByPath(doc, typedArgs.nodePath);
    if (!node) {
      return createErrorResponse(`Node not found: ${typedArgs.nodePath}`, [
        'Check the node path is correct',
        'Use get_node_tree to see available nodes',
      ]);
    }

    // Initialize groups array if needed
    if (!node.groups) {
      node.groups = [];
    }

    switch (typedArgs.action) {
      case 'list': {
        return createJsonResponse({
          scenePath: typedArgs.scenePath,
          nodePath: typedArgs.nodePath,
          nodeName: node.name,
          groups: node.groups,
          groupCount: node.groups.length,
        });
      }

      case 'add': {
        if (!typedArgs.groups || typedArgs.groups.length === 0) {
          return createErrorResponse('Groups are required for add action', [
            'Provide at least one group name',
          ]);
        }

        let addedCount = 0;
        for (const group of typedArgs.groups) {
          if (!node.groups.includes(group)) {
            node.groups.push(group);
            addedCount++;
          }
        }

        if (addedCount === 0) {
          return createErrorResponse('Node is already in all specified groups', [
            'Specify different groups',
          ]);
        }

        // Serialize and write back
        const serialized = serializeTscn(doc);
        writeFileSync(sceneFullPath, serialized, 'utf-8');

        logDebug(`Added ${addedCount} groups to ${typedArgs.nodePath}`);

        return createSuccessResponse(
          `Groups added successfully!\n` +
          `Scene: ${typedArgs.scenePath}\n` +
          `Node: ${typedArgs.nodePath}\n` +
          `Added: ${addedCount} groups\n` +
          `Current groups: ${node.groups.join(', ')}`
        );
      }

      case 'remove': {
        if (!typedArgs.groups || typedArgs.groups.length === 0) {
          return createErrorResponse('Groups are required for remove action', [
            'Provide at least one group name',
          ]);
        }

        let removedCount = 0;
        for (const group of typedArgs.groups) {
          const index = node.groups.indexOf(group);
          if (index !== -1) {
            node.groups.splice(index, 1);
            removedCount++;
          }
        }

        if (removedCount === 0) {
          return createErrorResponse('Node is not in any of the specified groups', [
            'Check the group names',
            'Use action "list" to see current groups',
          ]);
        }

        // Serialize and write back
        const serialized = serializeTscn(doc);
        writeFileSync(sceneFullPath, serialized, 'utf-8');

        logDebug(`Removed ${removedCount} groups from ${typedArgs.nodePath}`);

        return createSuccessResponse(
          `Groups removed successfully!\n` +
          `Scene: ${typedArgs.scenePath}\n` +
          `Node: ${typedArgs.nodePath}\n` +
          `Removed: ${removedCount} groups\n` +
          `Current groups: ${node.groups.length > 0 ? node.groups.join(', ') : '(none)'}`
        );
      }

      default:
        return createErrorResponse(`Unknown action: ${typedArgs.action}`, [
          'Use "add", "remove", or "list"',
        ]);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to manage groups: ${errorMessage}`, [
      'Check the scene file format',
      'Verify paths are correct',
    ]);
  }
};
