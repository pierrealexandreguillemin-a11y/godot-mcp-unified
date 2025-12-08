/**
 * Connect Signal Tool
 * Connects signals between nodes in a scene
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
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseTscn, serializeTscn, findNodeByPath, TscnConnection } from '../../core/TscnParser.js';

export interface ConnectSignalArgs extends SceneToolArgs {
  fromNodePath: string;
  signal: string;
  toNodePath: string;
  method: string;
  flags?: number;
}

export const connectSignalDefinition: ToolDefinition = {
  name: 'connect_signal',
  description: 'Connect a signal between two nodes in a scene',
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
      fromNodePath: {
        type: 'string',
        description: 'Path to the source node (emits signal)',
      },
      signal: {
        type: 'string',
        description: 'Signal name to connect (e.g., "pressed", "body_entered")',
      },
      toNodePath: {
        type: 'string',
        description: 'Path to the target node (receives signal)',
      },
      method: {
        type: 'string',
        description: 'Method name to call on target (e.g., "_on_button_pressed")',
      },
      flags: {
        type: 'number',
        description: 'Connection flags (default: 0)',
      },
    },
    required: ['projectPath', 'scenePath', 'fromNodePath', 'signal', 'toNodePath', 'method'],
  },
};

export const handleConnectSignal = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath', 'scenePath', 'fromNodePath', 'signal', 'toNodePath', 'method'
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, fromNodePath, signal, toNodePath, and method',
    ]);
  }

  const typedArgs = preparedArgs as ConnectSignalArgs;

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

    logDebug(`Connecting signal ${typedArgs.signal} from ${typedArgs.fromNodePath} to ${typedArgs.toNodePath}::${typedArgs.method}`);

    // Read and parse scene file
    const content = readFileSync(sceneFullPath, 'utf-8');
    const doc = parseTscn(content);

    // Verify source node exists
    const fromNode = findNodeByPath(doc, typedArgs.fromNodePath);
    if (!fromNode) {
      return createErrorResponse(`Source node not found: ${typedArgs.fromNodePath}`, [
        'Check the node path is correct',
        'Use get_node_tree to see available nodes',
      ]);
    }

    // Verify target node exists
    const toNode = findNodeByPath(doc, typedArgs.toNodePath);
    if (!toNode) {
      return createErrorResponse(`Target node not found: ${typedArgs.toNodePath}`, [
        'Check the node path is correct',
        'Use get_node_tree to see available nodes',
      ]);
    }

    // Convert node paths to TSCN format
    const fromPath = convertToTscnPath(typedArgs.fromNodePath, doc);
    const toPath = convertToTscnPath(typedArgs.toNodePath, doc);

    // Check if connection already exists
    const connectionExists = doc.connections.some(c =>
      c.signal === typedArgs.signal &&
      c.from === fromPath &&
      c.to === toPath &&
      c.method === typedArgs.method
    );

    if (connectionExists) {
      return createErrorResponse('This signal connection already exists', [
        'Choose a different signal or method',
        'The connection is already configured',
      ]);
    }

    // Add connection
    const newConnection: TscnConnection = {
      signal: typedArgs.signal,
      from: fromPath,
      to: toPath,
      method: typedArgs.method,
      flags: typedArgs.flags,
    };

    doc.connections.push(newConnection);

    // Serialize and write back
    const serialized = serializeTscn(doc);
    writeFileSync(sceneFullPath, serialized, 'utf-8');

    return createSuccessResponse(
      `Signal connected successfully!\n` +
      `Scene: ${typedArgs.scenePath}\n` +
      `Signal: ${typedArgs.signal}\n` +
      `From: ${typedArgs.fromNodePath}\n` +
      `To: ${typedArgs.toNodePath}::${typedArgs.method}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to connect signal: ${errorMessage}`, [
      'Check the scene file format',
      'Verify paths are correct',
    ]);
  }
};

/**
 * Convert a node path to TSCN format
 * In TSCN, paths are relative to root using node names
 */
function convertToTscnPath(nodePath: string, _doc: { nodes: Array<{ name: string; parent?: string }> }): string {
  // Root node
  if (nodePath === '.' || nodePath === '' || nodePath === 'root') {
    return '.';
  }

  // Clean the path
  const cleanPath = nodePath.replace(/^root\//, '');
  const parts = cleanPath.split('/');

  // For direct children of root, just use the node name
  if (parts.length === 1) {
    return parts[0];
  }

  // For deeper nodes, use the full path
  return cleanPath;
}
