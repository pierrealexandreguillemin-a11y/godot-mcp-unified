/**
 * Instance Scene Tool
 * Adds a scene instance as a child node in another scene
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, SceneToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { parseTscn, serializeTscn, findNodeByPath, addExtResource, TscnNode } from '../../core/TscnParser.js';

export interface InstanceSceneArgs extends SceneToolArgs {
  instancePath: string;
  parentNodePath?: string;
  instanceName?: string;
}

export const instanceSceneDefinition: ToolDefinition = {
  name: 'instance_scene',
  description: 'Add a scene instance as a child node in another scene',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      scenePath: {
        type: 'string',
        description: 'Path to the parent scene file (relative to project)',
      },
      instancePath: {
        type: 'string',
        description: 'Path to the scene to instance (relative to project)',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to the parent node (default: root node ".")',
      },
      instanceName: {
        type: 'string',
        description: 'Name for the instance node (default: scene filename without extension)',
      },
    },
    required: ['projectPath', 'scenePath', 'instancePath'],
  },
};

export const handleInstanceScene = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scenePath', 'instancePath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, and instancePath',
    ]);
  }

  const typedArgs = preparedArgs as InstanceSceneArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  // Verify instance scene exists
  const instanceFullPath = join(typedArgs.projectPath, typedArgs.instancePath);
  if (!existsSync(instanceFullPath)) {
    return createErrorResponse(`Instance scene not found: ${typedArgs.instancePath}`, [
      'Check the instance path is correct',
      'Create the scene first using create_scene',
    ]);
  }

  // Prevent self-instancing
  if (typedArgs.scenePath === typedArgs.instancePath) {
    return createErrorResponse('Cannot instance a scene into itself', [
      'Choose a different target scene',
    ]);
  }

  try {
    const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

    logDebug(`Instancing ${typedArgs.instancePath} into ${typedArgs.scenePath}`);

    // Read and parse parent scene
    const content = readFileSync(sceneFullPath, 'utf-8');
    const doc = parseTscn(content);

    // Determine parent node
    const parentPath = typedArgs.parentNodePath || '.';
    const isRootParent = parentPath === '.' || parentPath === '' || parentPath === 'root';

    if (!isRootParent) {
      const parentNode = findNodeByPath(doc, parentPath);
      if (!parentNode) {
        return createErrorResponse(`Parent node not found: ${parentPath}`, [
          'Check the parent path is correct',
          'Use get_node_tree to see available nodes',
        ]);
      }
    }

    // Determine instance name
    const defaultName = basename(typedArgs.instancePath, '.tscn');
    let instanceName = typedArgs.instanceName || defaultName;

    // Ensure unique name
    const targetParent = isRootParent ? '.' : parentPath.split('/').pop();
    let counter = 2;
    const originalName = instanceName;
    while (doc.nodes.some(n => n.name === instanceName && n.parent === targetParent)) {
      instanceName = `${originalName}${counter}`;
      counter++;
    }

    // Add external resource for the scene
    const resPath = typedArgs.instancePath.startsWith('res://')
      ? typedArgs.instancePath
      : `res://${typedArgs.instancePath.replace(/\\/g, '/')}`;

    // Check if scene already referenced
    let resourceId: string | undefined;
    const existingRes = doc.extResources.find(r => r.path === resPath && r.type === 'PackedScene');
    if (existingRes) {
      resourceId = existingRes.id;
    } else {
      resourceId = addExtResource(doc, 'PackedScene', resPath);
    }

    // Create instance node
    const instanceNode: TscnNode = {
      name: instanceName,
      parent: isRootParent ? '.' : targetParent,
      instance: `ExtResource(${resourceId})`,
      properties: {},
    };

    // Find insertion point (after parent's children)
    let insertIndex = doc.nodes.length;
    if (!isRootParent) {
      // Find last child of parent
      for (let i = doc.nodes.length - 1; i >= 0; i--) {
        if (doc.nodes[i].parent === targetParent) {
          insertIndex = i + 1;
          break;
        }
      }
    }

    doc.nodes.splice(insertIndex, 0, instanceNode);

    // Serialize and write back
    const serialized = serializeTscn(doc);
    writeFileSync(sceneFullPath, serialized, 'utf-8');

    return createSuccessResponse(
      `Scene instanced successfully!\n` +
      `Parent scene: ${typedArgs.scenePath}\n` +
      `Instanced scene: ${typedArgs.instancePath}\n` +
      `Instance name: ${instanceName}\n` +
      `Parent node: ${isRootParent ? '(root)' : parentPath}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to instance scene: ${errorMessage}`, [
      'Check the scene file format',
      'Verify paths are correct',
    ]);
  }
};
