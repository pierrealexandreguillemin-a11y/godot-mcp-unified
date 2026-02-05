/**
 * Get Node Tree Tool
 * Returns the complete node hierarchy of a scene
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity, bridge fallback
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseTscn, TscnDocument, TscnNode } from '../../core/TscnParser.js';
import {
  GetNodeTreeSchema,
  GetNodeTreeInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface NodeTreeNode {
  name: string;
  type: string;
  path: string;
  hasScript: boolean;
  scriptPath?: string;
  children: NodeTreeNode[];
  properties: string[];
}

export const getNodeTreeDefinition: ToolDefinition = {
  name: 'get_node_tree',
  description: 'Get the complete node hierarchy of a scene (.tscn file)',
  inputSchema: toMcpSchema(GetNodeTreeSchema),
};

/**
 * Build tree structure from flat TSCN nodes
 */
function buildNodeTree(doc: TscnDocument, maxDepth: number = Infinity): NodeTreeNode | null {
  if (doc.nodes.length === 0) {
    return null;
  }

  // Find root node (node without parent)
  const rootTscnNode = doc.nodes.find(n => !n.parent);
  if (!rootTscnNode) {
    return null;
  }

  // Create a map for quick lookup
  const nodeMap = new Map<string, TscnNode>();
  const childrenMap = new Map<string, TscnNode[]>();

  // Build the maps
  for (const node of doc.nodes) {
    const nodePath = buildNodePath(node, doc);
    nodeMap.set(nodePath, node);

    const parentPath = node.parent === '.' ? '' : (node.parent || '');
    if (!childrenMap.has(parentPath)) {
      childrenMap.set(parentPath, []);
    }
    if (node.parent) {
      childrenMap.get(parentPath)!.push(node);
    }
  }

  // Recursively build tree
  function buildNode(tscnNode: TscnNode, path: string, depth: number): NodeTreeNode {
    const scriptPath = extractScriptPath(tscnNode.script, doc);
    const children: NodeTreeNode[] = [];

    if (depth < maxDepth) {
      // Find children (nodes that have this node as parent)
      const childNodes = doc.nodes.filter(n => {
        if (!n.parent) return false;
        if (n.parent === '.' && path === '') return true;
        return n.parent === tscnNode.name || n.parent === path.split('/').pop();
      });

      for (const child of childNodes) {
        const childPath = path ? `${path}/${child.name}` : child.name;
        children.push(buildNode(child, childPath, depth + 1));
      }
    }

    return {
      name: tscnNode.name,
      type: tscnNode.type || 'Node',
      path: path || '.',
      hasScript: !!tscnNode.script,
      scriptPath,
      children,
      properties: Object.keys(tscnNode.properties),
    };
  }

  return buildNode(rootTscnNode, '', 0);
}

/**
 * Build node path from node and document
 */
function buildNodePath(node: TscnNode, doc: TscnDocument): string {
  if (!node.parent) {
    return '';
  }

  const parts: string[] = [node.name];
  let currentParent: string | undefined = node.parent;

  while (currentParent && currentParent !== '.') {
    const parentNode = doc.nodes.find(n => n.name === currentParent);
    if (!parentNode) break;
    parts.unshift(parentNode.name);
    currentParent = parentNode.parent;
  }

  return parts.join('/');
}

/**
 * Extract script path from ExtResource reference
 */
function extractScriptPath(scriptRef: string | undefined, doc: TscnDocument): string | undefined {
  if (!scriptRef) return undefined;

  // Parse ExtResource("id")
  const match = scriptRef.match(/ExtResource\(["']?([^)"']+)["']?\)/);
  if (!match) return undefined;

  const resourceId = match[1];
  const resource = doc.extResources.find(r =>
    r.id === resourceId || r.id === `"${resourceId}"` || r.id.includes(resourceId)
  );

  return resource?.path?.replace(/^res:\/\//, '');
}

/**
 * Format tree as ASCII art for text display
 */
function formatTreeAsAscii(node: NodeTreeNode, prefix: string = '', isLast: boolean = true): string {
  const lines: string[] = [];
  const connector = isLast ? '└── ' : '├── ';
  const extension = isLast ? '    ' : '│   ';

  let nodeStr = `${prefix}${connector}${node.name} (${node.type})`;
  if (node.hasScript) {
    nodeStr += ` [script: ${node.scriptPath || 'attached'}]`;
  }
  lines.push(nodeStr);

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const isChildLast = i === node.children.length - 1;
    lines.push(formatTreeAsAscii(child, prefix + extension, isChildLast));
  }

  return lines.join('\n');
}

export const handleGetNodeTree = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(GetNodeTreeSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and scenePath',
    ]);
  }

  const typedArgs: GetNodeTreeInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  logDebug(`Reading node tree from: ${typedArgs.scenePath}`);

  // Try bridge first, fallback to file parsing
  return executeWithBridge(
    'get_scene_tree',
    {
      scene_path: `res://${typedArgs.scenePath.replace(/\\/g, '/')}`,
      max_depth: typedArgs.maxDepth ?? 50,
    },
    async () => {
      // Fallback: parse TSCN file directly
      try {
        const sceneFullPath = join(typedArgs.projectPath, typedArgs.scenePath);

        // Read and parse scene file
        const content = readFileSync(sceneFullPath, 'utf-8');
        const doc = parseTscn(content);

        // Build tree structure
        const maxDepth = typedArgs.maxDepth ?? Infinity;
        const tree = buildNodeTree(doc, maxDepth);

        if (!tree) {
          return createErrorResponse('Could not parse scene tree', [
            'Check the scene file format',
            'Ensure the scene has at least one node',
          ]);
        }

        // Create ASCII representation for easy reading
        const asciiTree = formatTreeAsAscii(tree, '', true).replace(/^ {4}/, '');

        return createJsonResponse({
          scenePath: typedArgs.scenePath,
          nodeCount: countNodes(tree),
          tree,
          display: asciiTree,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to read node tree: ${errorMessage}`, [
          'Check the scene file format',
          'Verify the scene path is correct',
        ]);
      }
    }
  );
};

/**
 * Count total nodes in tree
 */
function countNodes(node: NodeTreeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}
