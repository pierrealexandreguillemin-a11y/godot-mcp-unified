/**
 * Manage Groups Tool
 * Add or remove nodes from groups in a scene
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
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
import {
  ManageGroupsSchema,
  ManageGroupsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const manageGroupsDefinition: ToolDefinition = {
  name: 'manage_groups',
  description: 'Add or remove nodes from groups in a scene',
  inputSchema: toMcpSchema(ManageGroupsSchema),
};

export const handleManageGroups = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ManageGroupsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodePath, and action',
    ]);
  }

  const typedArgs: ManageGroupsInput = validation.data;

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
