/**
 * TSCN Queries
 * Helper functions for querying and finding elements in TSCN documents
 * ISO/IEC 25010 compliant - Single Responsibility Principle
 */

import type { TscnDocument, TscnNode, TscnExtResource } from './types.js';

/**
 * Find a node by path in the document
 */
export function findNodeByPath(doc: TscnDocument, nodePath: string): TscnNode | undefined {
  if (nodePath === '.' || nodePath === '' || nodePath === 'root') {
    // Root node is the first node without a parent
    return doc.nodes.find(n => !n.parent);
  }

  // Remove leading "root/" if present
  const cleanPath = nodePath.replace(/^root\//, '');
  const parts = cleanPath.split('/');
  const targetName = parts[parts.length - 1];

  // For simple paths, find by name
  if (parts.length === 1) {
    return doc.nodes.find(n => n.name === targetName);
  }

  // For complex paths, match the parent chain
  return doc.nodes.find(n => {
    if (n.name !== targetName) return false;

    // Build the full path and compare
    let currentPath = n.name;
    let parentRef: string | undefined = n.parent;

    while (parentRef && parentRef !== '.') {
      const currentParentRef = parentRef; // Capture for closure
      const parentNode = doc.nodes.find(p =>
        (currentParentRef === '.' ? !p.parent : p.name === currentParentRef.split('/').pop())
      );
      if (!parentNode) break;
      currentPath = parentNode.name + '/' + currentPath;
      parentRef = parentNode.parent;
    }

    return currentPath === cleanPath || cleanPath.endsWith(currentPath);
  });
}

/**
 * Find external resource by ID
 */
export function findExtResourceById(doc: TscnDocument, id: string): TscnExtResource | undefined {
  // Handle both "1_abc" and ExtResource("1_abc") formats
  const cleanId = id.replace(/^ExtResource\(["']?|["']?\)$/g, '');
  return doc.extResources.find(r => r.id === cleanId || r.id === `"${cleanId}"`);
}

/**
 * Find all nodes by type
 */
export function findNodesByType(doc: TscnDocument, nodeType: string): TscnNode[] {
  return doc.nodes.filter(n => n.type === nodeType);
}

/**
 * Find all nodes with a specific group
 */
export function findNodesByGroup(doc: TscnDocument, group: string): TscnNode[] {
  return doc.nodes.filter(n => n.groups?.includes(group));
}

/**
 * Get the full path of a node
 */
export function getNodePath(doc: TscnDocument, node: TscnNode): string {
  if (!node.parent || node.parent === '.') {
    return node.name;
  }

  const parts: string[] = [node.name];
  let currentParent: string | undefined = node.parent;

  while (currentParent && currentParent !== '.') {
    const parentName: string = currentParent.split('/').pop() || currentParent;
    const parentNode: TscnNode | undefined = doc.nodes.find(n => n.name === parentName);

    if (!parentNode) {
      parts.unshift(parentName);
      break;
    }

    parts.unshift(parentNode.name);
    currentParent = parentNode.parent;
  }

  return parts.join('/');
}

/**
 * Check if a node has a script attached
 */
export function hasScript(node: TscnNode): boolean {
  return !!node.script;
}

/**
 * Get script path from node
 */
export function getScriptPath(doc: TscnDocument, node: TscnNode): string | undefined {
  if (!node.script) return undefined;

  const match = node.script.match(/ExtResource\(["']?(\d+_\w+)["']?\)/);
  if (!match) return undefined;

  const res = findExtResourceById(doc, match[1]);
  return res?.path;
}
