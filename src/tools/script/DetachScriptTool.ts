/**
 * Detach Script Tool
 * Detaches a GDScript from a node in a scene
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
import {
  DetachScriptSchema,
  DetachScriptInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const detachScriptDefinition: ToolDefinition = {
  name: 'detach_script',
  description: 'Detach a GDScript from a node in a scene (.tscn file)',
  inputSchema: toMcpSchema(DetachScriptSchema),
};

export const handleDetachScript = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(DetachScriptSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, and nodePath',
    ]);
  }

  const typedArgs: DetachScriptInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  logDebug(`Detaching script from node ${typedArgs.nodePath} in scene ${typedArgs.scenePath}`);

  // Try bridge first, fallback to file manipulation
  return executeWithBridge(
    'detach_script',
    {
      node_path: typedArgs.nodePath || '.',
    },
    async () => {
      // Fallback: manual TSCN manipulation
      try {
        const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

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
    }
  );
};
