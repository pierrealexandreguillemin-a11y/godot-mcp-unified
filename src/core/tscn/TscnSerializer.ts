/**
 * TSCN Serializer
 * Handles serialization of TSCN documents back to file format
 * ISO/IEC 25010 compliant - Single Responsibility Principle
 * ISO/IEC 5055 compliant - Cyclomatic Complexity < 15 per function
 */

import type {
  TscnDocument,
  TscnValue,
  TscnFunctionCall,
  TscnHeader,
  TscnExtResource,
  TscnSubResource,
  TscnNode,
  TscnConnection,
  TscnEditableInstance,
} from './types.js';

/**
 * Serialize a TSCN document back to string format
 */
export function serializeTscn(doc: TscnDocument): string {
  const lines: string[] = [];

  lines.push(serializeHeader(doc.header));
  lines.push('');

  serializeExtResources(doc.extResources, lines);
  serializeSubResources(doc.subResources, lines);
  serializeNodes(doc.nodes, lines);
  serializeConnections(doc.connections, lines);
  serializeEditableInstances(doc.editableInstances, lines);

  return lines.join('\n');
}

/**
 * Serialize the gd_scene header
 */
function serializeHeader(header: TscnHeader): string {
  const attrs: string[] = [`format=${header.format}`];

  if (header.uidType) {
    attrs.push(`uid_type="${header.uidType}"`);
  }
  if (header.uid) {
    attrs.push(`uid="${header.uid}"`);
  }
  if (header.loadSteps !== undefined) {
    attrs.push(`load_steps=${header.loadSteps}`);
  }

  return `[gd_scene ${attrs.join(' ')}]`;
}

/**
 * Serialize external resources
 */
function serializeExtResources(resources: TscnExtResource[], lines: string[]): void {
  for (const res of resources) {
    lines.push(serializeExtResource(res));
  }
  if (resources.length > 0) {
    lines.push('');
  }
}

function serializeExtResource(res: TscnExtResource): string {
  const attrs = [`type="${res.type}"`, `path="${res.path}"`, `id=${res.id}`];
  if (res.uid) {
    attrs.push(`uid="${res.uid}"`);
  }
  return `[ext_resource ${attrs.join(' ')}]`;
}

/**
 * Serialize sub resources
 */
function serializeSubResources(subResources: TscnSubResource[], lines: string[]): void {
  for (const sub of subResources) {
    lines.push(`[sub_resource type="${sub.type}" id=${sub.id}]`);
    serializeProperties(sub.properties, lines);
    lines.push('');
  }
}

/**
 * Serialize nodes
 */
function serializeNodes(nodes: TscnNode[], lines: string[]): void {
  for (const node of nodes) {
    lines.push(serializeNodeHeader(node));
    serializeProperties(node.properties, lines);
    lines.push('');
  }
}

function serializeNodeHeader(node: TscnNode): string {
  const attrs: string[] = [`name="${node.name}"`];

  if (node.type) attrs.push(`type="${node.type}"`);
  if (node.parent) attrs.push(`parent="${node.parent}"`);
  if (node.instance) attrs.push(`instance=${node.instance}`);
  if (node.script) attrs.push(`script=${node.script}`);
  if (node.groups && node.groups.length > 0) {
    attrs.push(`groups=[${node.groups.map(g => `"${g}"`).join(', ')}]`);
  }

  return `[node ${attrs.join(' ')}]`;
}

/**
 * Serialize properties
 */
function serializeProperties(properties: Record<string, TscnValue>, lines: string[]): void {
  for (const [key, value] of Object.entries(properties)) {
    lines.push(`${key} = ${serializeValue(value)}`);
  }
}

/**
 * Serialize connections
 */
function serializeConnections(connections: TscnConnection[], lines: string[]): void {
  for (const conn of connections) {
    lines.push(serializeConnection(conn));
  }
}

function serializeConnection(conn: TscnConnection): string {
  const attrs: string[] = [
    `signal="${conn.signal}"`,
    `from="${conn.from}"`,
    `to="${conn.to}"`,
    `method="${conn.method}"`,
  ];

  if (conn.flags !== undefined) {
    attrs.push(`flags=${conn.flags}`);
  }
  if (conn.binds && conn.binds.length > 0) {
    attrs.push(`binds=[${conn.binds.map(b => serializeValue(b)).join(', ')}]`);
  }

  return `[connection ${attrs.join(' ')}]`;
}

/**
 * Serialize editable instances
 */
function serializeEditableInstances(instances: TscnEditableInstance[], lines: string[]): void {
  for (const edit of instances) {
    lines.push(`[editable path="${edit.path}"]`);
  }
}

/**
 * Serialize a value back to TSCN format
 */
export function serializeValue(value: TscnValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return `"${value}"`;
  if (Array.isArray(value)) return serializeArray(value);
  if (isFunctionCall(value)) return serializeFunctionCall(value);
  if (typeof value === 'object') return serializeRecord(value as Record<string, TscnValue>);
  return String(value);
}

function serializeArray(arr: TscnValue[]): string {
  return `[${arr.map(v => serializeValue(v)).join(', ')}]`;
}

function serializeFunctionCall(func: TscnFunctionCall): string {
  return `${func.name}(${func.args.map(a => serializeValue(a)).join(', ')})`;
}

function serializeRecord(record: Record<string, TscnValue>): string {
  const entries = Object.entries(record);
  return `{${entries.map(([k, v]) => `"${k}": ${serializeValue(v)}`).join(', ')}}`;
}

function isFunctionCall(value: TscnValue): value is TscnFunctionCall {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'name' in value &&
    'args' in value
  );
}
