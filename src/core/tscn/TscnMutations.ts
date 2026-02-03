/**
 * TSCN Mutations
 * Functions for modifying TSCN documents
 * ISO/IEC 25010 compliant - Single Responsibility Principle
 */

import type { TscnDocument, TscnNode, TscnConnection, TscnSubResource, TscnValue } from './types.js';
import { findNodeByPath } from './TscnQueries.js';

/**
 * Add an external resource and return its ID
 */
export function addExtResource(doc: TscnDocument, type: string, path: string): string {
  // Find max ID
  let maxId = 0;
  for (const res of doc.extResources) {
    const numMatch = res.id.match(/(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num > maxId) maxId = num;
    }
  }

  const newId = `"${maxId + 1}_${type.toLowerCase()}"`;
  doc.extResources.push({
    type,
    path,
    id: newId,
  });

  // Update load_steps
  if (doc.header.loadSteps !== undefined) {
    doc.header.loadSteps++;
  }

  return newId;
}

/**
 * Remove an external resource by ID
 */
export function removeExtResource(doc: TscnDocument, id: string): boolean {
  const index = doc.extResources.findIndex(r => r.id === id);
  if (index === -1) return false;

  doc.extResources.splice(index, 1);

  // Update load_steps
  if (doc.header.loadSteps !== undefined && doc.header.loadSteps > 0) {
    doc.header.loadSteps--;
  }

  return true;
}

/**
 * Attach script to a node
 */
export function attachScriptToNode(doc: TscnDocument, nodePath: string, scriptPath: string): boolean {
  const node = findNodeByPath(doc, nodePath);
  if (!node) return false;

  // Check if script already exists as ext_resource
  let scriptId: string | undefined;
  const resPath = scriptPath.startsWith('res://') ? scriptPath : `res://${scriptPath}`;

  const existingRes = doc.extResources.find(r => r.path === resPath && r.type === 'Script');
  if (existingRes) {
    scriptId = existingRes.id;
  } else {
    scriptId = addExtResource(doc, 'Script', resPath);
  }

  node.script = `ExtResource(${scriptId})`;
  return true;
}

/**
 * Detach script from a node
 */
export function detachScriptFromNode(doc: TscnDocument, nodePath: string): boolean {
  const node = findNodeByPath(doc, nodePath);
  if (!node || !node.script) return false;

  delete node.script;
  return true;
}

/**
 * Add a new node to the document
 */
export function addNode(doc: TscnDocument, node: TscnNode): void {
  doc.nodes.push(node);
}

/**
 * Remove a node by path
 */
export function removeNode(doc: TscnDocument, nodePath: string): boolean {
  const node = findNodeByPath(doc, nodePath);
  if (!node) return false;

  const index = doc.nodes.indexOf(node);
  if (index === -1) return false;

  doc.nodes.splice(index, 1);

  // Also remove any connections involving this node
  const nodeRef = node.parent ? `${node.parent}/${node.name}` : node.name;
  doc.connections = doc.connections.filter(
    c => c.from !== nodeRef && c.to !== nodeRef
  );

  return true;
}

/**
 * Add a signal connection
 */
export function addConnection(doc: TscnDocument, connection: TscnConnection): void {
  doc.connections.push(connection);
}

/**
 * Remove a signal connection
 */
export function removeConnection(
  doc: TscnDocument,
  signal: string,
  from: string,
  to: string,
  method: string
): boolean {
  const index = doc.connections.findIndex(
    c => c.signal === signal && c.from === from && c.to === to && c.method === method
  );

  if (index === -1) return false;

  doc.connections.splice(index, 1);
  return true;
}

/**
 * Add a sub-resource
 */
export function addSubResource(doc: TscnDocument, subResource: TscnSubResource): string {
  // Find max ID
  let maxId = 0;
  for (const sub of doc.subResources) {
    const numMatch = sub.id.match(/(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num > maxId) maxId = num;
    }
  }

  const newId = `"${maxId + 1}_${subResource.type.toLowerCase()}"`;
  const newSubResource: TscnSubResource = {
    ...subResource,
    id: newId,
  };

  doc.subResources.push(newSubResource);

  // Update load_steps
  if (doc.header.loadSteps !== undefined) {
    doc.header.loadSteps++;
  }

  return newId;
}

/**
 * Set a node property
 */
export function setNodeProperty(
  doc: TscnDocument,
  nodePath: string,
  propertyName: string,
  value: unknown
): boolean {
  const node = findNodeByPath(doc, nodePath);
  if (!node) return false;

  node.properties[propertyName] = value as TscnValue;
  return true;
}

/**
 * Remove a node property
 */
export function removeNodeProperty(
  doc: TscnDocument,
  nodePath: string,
  propertyName: string
): boolean {
  const node = findNodeByPath(doc, nodePath);
  if (!node) return false;

  if (!(propertyName in node.properties)) return false;

  delete node.properties[propertyName];
  return true;
}

/**
 * Add a node to a group
 */
export function addNodeToGroup(doc: TscnDocument, nodePath: string, group: string): boolean {
  const node = findNodeByPath(doc, nodePath);
  if (!node) return false;

  if (!node.groups) {
    node.groups = [];
  }

  if (!node.groups.includes(group)) {
    node.groups.push(group);
  }

  return true;
}

/**
 * Remove a node from a group
 */
export function removeNodeFromGroup(doc: TscnDocument, nodePath: string, group: string): boolean {
  const node = findNodeByPath(doc, nodePath);
  if (!node || !node.groups) return false;

  const index = node.groups.indexOf(group);
  if (index === -1) return false;

  node.groups.splice(index, 1);

  if (node.groups.length === 0) {
    delete node.groups;
  }

  return true;
}
