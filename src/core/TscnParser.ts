/**
 * TSCN Parser - State Machine Implementation
 * Robust parser for Godot scene files (.tscn)
 *
 * Replaces fragile regex-based parsing with proper state machine.
 * ISO/IEC 25010 compliant - maintainable, reliable, efficient.
 */

export interface TscnHeader {
  format: number;
  uidType: string;
  uid: string;
  loadSteps?: number;
}

export interface TscnExtResource {
  type: string;
  path: string;
  id: string;
  uid?: string;
}

export interface TscnSubResource {
  type: string;
  id: string;
  properties: Record<string, TscnValue>;
}

export interface TscnNode {
  name: string;
  type?: string;
  parent?: string;
  instance?: string;
  instancePlaceholder?: string;
  owner?: string;
  index?: number;
  groups?: string[];
  script?: string;
  properties: Record<string, TscnValue>;
}

export interface TscnConnection {
  signal: string;
  from: string;
  to: string;
  method: string;
  flags?: number;
  binds?: TscnValue[];
}

export interface TscnEditableInstance {
  path: string;
}

export type TscnPrimitive = string | number | boolean | null;
export type TscnValue = TscnPrimitive | TscnArray | TscnRecord | TscnFunctionCall;
export type TscnArray = TscnValue[];
export interface TscnRecord {
  [key: string]: TscnValue;
}

export interface TscnFunctionCall {
  name: string;
  args: TscnValue[];
}

export interface TscnDocument {
  header: TscnHeader;
  extResources: TscnExtResource[];
  subResources: TscnSubResource[];
  nodes: TscnNode[];
  connections: TscnConnection[];
  editableInstances: TscnEditableInstance[];
}

enum ParserState {
  INITIAL,
  IN_HEADER,
  IN_EXT_RESOURCE,
  IN_SUB_RESOURCE,
  IN_NODE,
  IN_CONNECTION,
  IN_EDITABLE,
  IN_PROPERTIES,
}

interface ParserContext {
  state: ParserState;
  lineNumber: number;
  currentSection: string;
  currentProperties: Record<string, TscnValue>;
  document: TscnDocument;
}

/**
 * Parse a TSCN file content into a structured document
 */
export function parseTscn(content: string): TscnDocument {
  const lines = content.split(/\r?\n/);

  const context: ParserContext = {
    state: ParserState.INITIAL,
    lineNumber: 0,
    currentSection: '',
    currentProperties: {},
    document: {
      header: { format: 0, uidType: '', uid: '' },
      extResources: [],
      subResources: [],
      nodes: [],
      connections: [],
      editableInstances: [],
    },
  };

  for (let i = 0; i < lines.length; i++) {
    context.lineNumber = i + 1;
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      continue;
    }

    // Check for section header
    if (line.startsWith('[')) {
      finalizePreviousSection(context);
      parseSectionHeader(line, context);
    } else {
      // Parse property within current section
      parseProperty(line, context);
    }
  }

  // Finalize last section
  finalizePreviousSection(context);

  return context.document;
}

/**
 * Finalize the previous section before starting a new one
 */
function finalizePreviousSection(context: ParserContext): void {
  switch (context.state) {
    case ParserState.IN_SUB_RESOURCE:
      // SubResource is already added during header parsing
      break;
    case ParserState.IN_NODE:
      // Node is already added during header parsing
      break;
    case ParserState.IN_CONNECTION:
      // Connection is already added during header parsing
      break;
    default:
      break;
  }
  context.currentProperties = {};
}

/**
 * Parse a section header line like [gd_scene], [ext_resource], [node], etc.
 */
function parseSectionHeader(line: string, context: ParserContext): void {
  const match = line.match(/^\[(\w+)(.*)?\]$/);
  if (!match) {
    throw new TscnParseError(`Invalid section header at line ${context.lineNumber}: ${line}`);
  }

  const sectionType = match[1];
  const attributesStr = match[2]?.trim() || '';
  const attributes = parseAttributes(attributesStr);

  context.currentSection = sectionType;

  switch (sectionType) {
    case 'gd_scene':
      context.state = ParserState.IN_HEADER;
      context.document.header = {
        format: parseInt(attributes.format || '0', 10),
        uidType: attributes.uid_type || '',
        uid: attributes.uid || '',
        loadSteps: attributes.load_steps ? parseInt(attributes.load_steps, 10) : undefined,
      };
      break;

    case 'ext_resource':
      context.state = ParserState.IN_EXT_RESOURCE;
      context.document.extResources.push({
        type: attributes.type || '',
        path: attributes.path || '',
        id: attributes.id || '',
        uid: attributes.uid,
      });
      break;

    case 'sub_resource':
      context.state = ParserState.IN_SUB_RESOURCE;
      const subResource: TscnSubResource = {
        type: attributes.type || '',
        id: attributes.id || '',
        properties: {},
      };
      context.document.subResources.push(subResource);
      context.currentProperties = subResource.properties;
      break;

    case 'node':
      context.state = ParserState.IN_NODE;
      const node: TscnNode = {
        name: attributes.name || '',
        type: attributes.type,
        parent: attributes.parent,
        instance: attributes.instance,
        instancePlaceholder: attributes.instance_placeholder,
        owner: attributes.owner,
        index: attributes.index ? parseInt(attributes.index, 10) : undefined,
        groups: attributes.groups ? parseArray(attributes.groups) as string[] : undefined,
        script: attributes.script,
        properties: {},
      };
      context.document.nodes.push(node);
      context.currentProperties = node.properties;
      break;

    case 'connection':
      context.state = ParserState.IN_CONNECTION;
      context.document.connections.push({
        signal: attributes.signal || '',
        from: attributes.from || '',
        to: attributes.to || '',
        method: attributes.method || '',
        flags: attributes.flags ? parseInt(attributes.flags, 10) : undefined,
        binds: attributes.binds ? parseArray(attributes.binds) : undefined,
      });
      break;

    case 'editable':
      context.state = ParserState.IN_EDITABLE;
      context.document.editableInstances.push({
        path: attributes.path || '',
      });
      break;

    default:
      throw new TscnParseError(`Unknown section type at line ${context.lineNumber}: ${sectionType}`);
  }
}

/**
 * Parse attributes from a section header
 * Handles complex values like ExtResource("1_script") and arrays ["a", "b"]
 */
function parseAttributes(str: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  let i = 0;

  while (i < str.length) {
    // Skip whitespace
    while (i < str.length && /\s/.test(str[i])) i++;
    if (i >= str.length) break;

    // Parse key
    const keyStart = i;
    while (i < str.length && /\w/.test(str[i])) i++;
    const key = str.slice(keyStart, i);

    if (!key) {
      i++;
      continue;
    }

    // Skip whitespace and =
    while (i < str.length && /\s/.test(str[i])) i++;
    if (str[i] !== '=') continue;
    i++;
    while (i < str.length && /\s/.test(str[i])) i++;

    // Parse value
    let value = '';
    if (str[i] === '"') {
      // Simple quoted string
      i++;
      const valueStart = i;
      while (i < str.length && str[i] !== '"') i++;
      value = str.slice(valueStart, i);
      i++;
    } else if (str[i] === '[') {
      // Array value - capture until matching ]
      const valueStart = i;
      let depth = 0;
      while (i < str.length) {
        if (str[i] === '[') depth++;
        else if (str[i] === ']') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        } else if (str[i] === '"') {
          // Skip quoted strings within array
          i++;
          while (i < str.length && str[i] !== '"') i++;
        }
        i++;
      }
      value = str.slice(valueStart, i);
    } else {
      // Unquoted value - handle function calls like ExtResource("id")
      const valueStart = i;
      let parenDepth = 0;
      while (i < str.length) {
        const ch = str[i];
        if (ch === '(') {
          parenDepth++;
        } else if (ch === ')') {
          parenDepth--;
          if (parenDepth === 0) {
            i++;
            break;
          }
        } else if (ch === '"') {
          // Skip quoted strings within function calls
          i++;
          while (i < str.length && str[i] !== '"') i++;
        } else if (parenDepth === 0 && /\s/.test(ch)) {
          break;
        }
        i++;
      }
      value = str.slice(valueStart, i);
    }

    attributes[key] = value;
  }

  return attributes;
}

/**
 * Parse a property line like 'position = Vector2(100, 200)'
 */
function parseProperty(line: string, context: ParserContext): void {
  if (context.state === ParserState.INITIAL ||
      context.state === ParserState.IN_HEADER ||
      context.state === ParserState.IN_EXT_RESOURCE ||
      context.state === ParserState.IN_CONNECTION ||
      context.state === ParserState.IN_EDITABLE) {
    // These sections don't have property lines
    return;
  }

  const match = line.match(/^(\w+)\s*=\s*(.+)$/);
  if (!match) {
    return; // Skip malformed lines
  }

  const key = match[1];
  const valueStr = match[2];

  try {
    const value = parseValue(valueStr);
    context.currentProperties[key] = value;
  } catch {
    // If parsing fails, store as raw string
    context.currentProperties[key] = valueStr;
  }
}

/**
 * Parse a value string into appropriate type
 */
function parseValue(str: string): TscnValue {
  const trimmed = str.trim();

  // Null
  if (trimmed === 'null') {
    return null;
  }

  // Boolean
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // String
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  // Array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return parseArray(trimmed);
  }

  // Dictionary
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return parseDictionary(trimmed);
  }

  // Function call (Vector2, Color, ExtResource, SubResource, etc.)
  const funcMatch = trimmed.match(/^(\w+)\s*\((.*)\)$/s);
  if (funcMatch) {
    return {
      name: funcMatch[1],
      args: parseArguments(funcMatch[2]),
    };
  }

  // Raw string
  return trimmed;
}

/**
 * Parse array notation
 */
function parseArray(str: string): TscnValue[] {
  const inner = str.slice(1, -1).trim();
  if (inner === '') {
    return [];
  }

  const args = parseArguments(inner);
  return args;
}

/**
 * Parse dictionary notation
 */
function parseDictionary(str: string): Record<string, TscnValue> {
  const inner = str.slice(1, -1).trim();
  if (inner === '') {
    return {};
  }

  const result: Record<string, TscnValue> = {};
  const pairs = splitTopLevel(inner, ',');

  for (const pair of pairs) {
    const colonIdx = findTopLevelChar(pair, ':');
    if (colonIdx === -1) continue;

    const keyStr = pair.slice(0, colonIdx).trim();
    const valueStr = pair.slice(colonIdx + 1).trim();

    // Parse key (remove quotes if present)
    const key = keyStr.startsWith('"') && keyStr.endsWith('"')
      ? keyStr.slice(1, -1)
      : keyStr;

    result[key] = parseValue(valueStr);
  }

  return result;
}

/**
 * Parse function arguments
 */
function parseArguments(str: string): TscnValue[] {
  const trimmed = str.trim();
  if (trimmed === '') {
    return [];
  }

  const parts = splitTopLevel(trimmed, ',');
  return parts.map(part => parseValue(part.trim()));
}

/**
 * Split string by delimiter at top level (not inside brackets or quotes)
 */
function splitTopLevel(str: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      current += char;
      if (char === stringChar && str[i - 1] !== '\\') {
        inString = false;
      }
    } else if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      current += char;
    } else if (char === '(' || char === '[' || char === '{') {
      depth++;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      depth--;
      current += char;
    } else if (char === delimiter && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

/**
 * Find index of character at top level
 */
function findTopLevelChar(str: string, char: string): number {
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const c = str[i];

    if (inString) {
      if (c === stringChar && str[i - 1] !== '\\') {
        inString = false;
      }
    } else if (c === '"' || c === "'") {
      inString = true;
      stringChar = c;
    } else if (c === '(' || c === '[' || c === '{') {
      depth++;
    } else if (c === ')' || c === ']' || c === '}') {
      depth--;
    } else if (c === char && depth === 0) {
      return i;
    }
  }

  return -1;
}

/**
 * Serialize a TSCN document back to string format
 */
export function serializeTscn(doc: TscnDocument): string {
  const lines: string[] = [];

  // Header
  let headerAttrs = `format=${doc.header.format}`;
  if (doc.header.uidType) {
    headerAttrs += ` uid_type="${doc.header.uidType}"`;
  }
  if (doc.header.uid) {
    headerAttrs += ` uid="${doc.header.uid}"`;
  }
  if (doc.header.loadSteps !== undefined) {
    headerAttrs += ` load_steps=${doc.header.loadSteps}`;
  }
  lines.push(`[gd_scene ${headerAttrs}]`);
  lines.push('');

  // External resources
  for (const res of doc.extResources) {
    let attrs = `type="${res.type}" path="${res.path}" id=${res.id}`;
    if (res.uid) {
      attrs += ` uid="${res.uid}"`;
    }
    lines.push(`[ext_resource ${attrs}]`);
  }
  if (doc.extResources.length > 0) {
    lines.push('');
  }

  // Sub resources
  for (const sub of doc.subResources) {
    lines.push(`[sub_resource type="${sub.type}" id=${sub.id}]`);
    for (const [key, value] of Object.entries(sub.properties)) {
      lines.push(`${key} = ${serializeValue(value)}`);
    }
    lines.push('');
  }

  // Nodes
  for (const node of doc.nodes) {
    let attrs = `name="${node.name}"`;
    if (node.type) {
      attrs += ` type="${node.type}"`;
    }
    if (node.parent) {
      attrs += ` parent="${node.parent}"`;
    }
    if (node.instance) {
      attrs += ` instance=${node.instance}`;
    }
    if (node.script) {
      attrs += ` script=${node.script}`;
    }
    if (node.groups && node.groups.length > 0) {
      attrs += ` groups=[${node.groups.map(g => `"${g}"`).join(', ')}]`;
    }
    lines.push(`[node ${attrs}]`);

    for (const [key, value] of Object.entries(node.properties)) {
      lines.push(`${key} = ${serializeValue(value)}`);
    }
    lines.push('');
  }

  // Connections
  for (const conn of doc.connections) {
    let attrs = `signal="${conn.signal}" from="${conn.from}" to="${conn.to}" method="${conn.method}"`;
    if (conn.flags !== undefined) {
      attrs += ` flags=${conn.flags}`;
    }
    if (conn.binds && conn.binds.length > 0) {
      attrs += ` binds=[${conn.binds.map(b => serializeValue(b)).join(', ')}]`;
    }
    lines.push(`[connection ${attrs}]`);
  }

  // Editable instances
  for (const edit of doc.editableInstances) {
    lines.push(`[editable path="${edit.path}"]`);
  }

  return lines.join('\n');
}

/**
 * Serialize a value back to TSCN format
 */
function serializeValue(value: TscnValue): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(v => serializeValue(v)).join(', ')}]`;
  }
  if (typeof value === 'object' && 'name' in value && 'args' in value) {
    const funcCall = value as TscnFunctionCall;
    return `${funcCall.name}(${funcCall.args.map(a => serializeValue(a)).join(', ')})`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, TscnValue>);
    return `{${entries.map(([k, v]) => `"${k}": ${serializeValue(v)}`).join(', ')}}`;
  }
  return String(value);
}

/**
 * Custom error class for TSCN parsing errors
 */
export class TscnParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TscnParseError';
  }
}

/**
 * Helper: Find a node by path in the document
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
 * Helper: Find external resource by ID
 */
export function findExtResourceById(doc: TscnDocument, id: string): TscnExtResource | undefined {
  // Handle both "1_abc" and ExtResource("1_abc") formats
  const cleanId = id.replace(/^ExtResource\(["']?|["']?\)$/g, '');
  return doc.extResources.find(r => r.id === cleanId || r.id === `"${cleanId}"`);
}

/**
 * Helper: Add an external resource and return its ID
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
 * Helper: Attach script to a node
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
 * Helper: Detach script from a node
 */
export function detachScriptFromNode(doc: TscnDocument, nodePath: string): boolean {
  const node = findNodeByPath(doc, nodePath);
  if (!node || !node.script) return false;

  delete node.script;
  return true;
}
