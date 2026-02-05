/**
 * Move Node Tool
 * Moves a node to a different parent in the scene tree
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity, bridge fallback
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseTscn, serializeTscn, findNodeByPath } from '../../core/TscnParser.js';
import {
  MoveNodeSchema,
  MoveNodeInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const moveNodeDefinition: ToolDefinition = {
  name: 'move_node',
  description: 'Move a node to a different parent in the scene tree',
  inputSchema: toMcpSchema(MoveNodeSchema),
};

export const handleMoveNode = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(MoveNodeSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodePath, and newParentPath',
    ]);
  }

  const typedArgs: MoveNodeInput = validation.data;

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

  logDebug(`Moving node ${typedArgs.nodePath} to parent ${typedArgs.newParentPath} in scene ${typedArgs.scenePath}`);

  // Try bridge first, fallback to file manipulation
  return executeWithBridge(
    'move_node',
    {
      node_path: typedArgs.nodePath,
      new_parent_path: typedArgs.newParentPath,
    },
    async () => {
      // Fallback: manual TSCN manipulation
      try {
        const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

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
    }
  );
};
