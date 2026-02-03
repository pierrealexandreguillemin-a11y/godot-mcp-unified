/**
 * TSCN Parser - Facade for TSCN operations
 * Robust parser for Godot scene files (.tscn)
 *
 * Refactored from monolithic (CC 111) to modular design.
 * Uses dedicated modules for value parsing, serialization, queries, and mutations.
 * ISO/IEC 25010 compliant - maintainable, reliable, efficient.
 */

// Re-export types for backward compatibility
export type {
  TscnHeader,
  TscnExtResource,
  TscnSubResource,
  TscnNode,
  TscnConnection,
  TscnEditableInstance,
  TscnPrimitive,
  TscnValue,
  TscnArray,
  TscnRecord,
  TscnFunctionCall,
  TscnDocument,
} from './tscn/types.js';

export { TscnParseError } from './tscn/types.js';

// Re-export serialization
export { serializeTscn } from './tscn/TscnSerializer.js';

// Re-export queries for backward compatibility
export { findNodeByPath, findExtResourceById } from './tscn/TscnQueries.js';

// Re-export mutations for backward compatibility
export { addExtResource, attachScriptToNode, detachScriptFromNode } from './tscn/TscnMutations.js';

// Import types and functions needed for parsing
import type { TscnDocument, TscnValue, TscnNode, TscnSubResource } from './tscn/types.js';
import { TscnParseError } from './tscn/types.js';
import { parseValue, parseArray } from './tscn/TscnValueParser.js';

// ============================================================================
// Parser State Machine (Core parsing logic)
// ============================================================================

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
  // Clean up state for next section
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
      handleGdSceneSection(context, attributes);
      break;
    case 'ext_resource':
      handleExtResourceSection(context, attributes);
      break;
    case 'sub_resource':
      handleSubResourceSection(context, attributes);
      break;
    case 'node':
      handleNodeSection(context, attributes);
      break;
    case 'connection':
      handleConnectionSection(context, attributes);
      break;
    case 'editable':
      handleEditableSection(context, attributes);
      break;
    default:
      throw new TscnParseError(`Unknown section type at line ${context.lineNumber}: ${sectionType}`);
  }
}

function handleGdSceneSection(context: ParserContext, attributes: Record<string, string>): void {
  context.state = ParserState.IN_HEADER;
  context.document.header = {
    format: parseInt(attributes.format || '0', 10),
    uidType: attributes.uid_type || '',
    uid: attributes.uid || '',
    loadSteps: attributes.load_steps ? parseInt(attributes.load_steps, 10) : undefined,
  };
}

function handleExtResourceSection(context: ParserContext, attributes: Record<string, string>): void {
  context.state = ParserState.IN_EXT_RESOURCE;
  context.document.extResources.push({
    type: attributes.type || '',
    path: attributes.path || '',
    id: attributes.id || '',
    uid: attributes.uid,
  });
}

function handleSubResourceSection(context: ParserContext, attributes: Record<string, string>): void {
  context.state = ParserState.IN_SUB_RESOURCE;
  const subResource: TscnSubResource = {
    type: attributes.type || '',
    id: attributes.id || '',
    properties: {},
  };
  context.document.subResources.push(subResource);
  context.currentProperties = subResource.properties;
}

function handleNodeSection(context: ParserContext, attributes: Record<string, string>): void {
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
}

function handleConnectionSection(context: ParserContext, attributes: Record<string, string>): void {
  context.state = ParserState.IN_CONNECTION;
  context.document.connections.push({
    signal: attributes.signal || '',
    from: attributes.from || '',
    to: attributes.to || '',
    method: attributes.method || '',
    flags: attributes.flags ? parseInt(attributes.flags, 10) : undefined,
    binds: attributes.binds ? parseArray(attributes.binds) : undefined,
  });
}

function handleEditableSection(context: ParserContext, attributes: Record<string, string>): void {
  context.state = ParserState.IN_EDITABLE;
  context.document.editableInstances.push({
    path: attributes.path || '',
  });
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
    const value = parseAttributeValue(str, i);
    attributes[key] = value.value;
    i = value.endIndex;
  }

  return attributes;
}

interface AttributeValueResult {
  value: string;
  endIndex: number;
}

/**
 * Parse an attribute value - dispatches to type-specific parsers
 * ISO/IEC 5055: CC reduced through delegation
 */
function parseAttributeValue(str: string, startIndex: number): AttributeValueResult {
  const char = str[startIndex];

  if (char === '"') {
    return parseQuotedString(str, startIndex);
  }
  if (char === '[') {
    return parseArrayValue(str, startIndex);
  }
  return parseUnquotedValue(str, startIndex);
}

function parseQuotedString(str: string, startIndex: number): AttributeValueResult {
  let i = startIndex + 1; // Skip opening quote
  const valueStart = i;
  while (i < str.length && str[i] !== '"') i++;
  const value = str.slice(valueStart, i);
  i++; // Skip closing quote
  return { value, endIndex: i };
}

function parseArrayValue(str: string, startIndex: number): AttributeValueResult {
  let i = startIndex;
  let depth = 0;

  while (i < str.length) {
    const char = str[i];
    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    } else if (char === '"') {
      i = skipQuotedString(str, i);
      continue;
    }
    i++;
  }

  return { value: str.slice(startIndex, i), endIndex: i };
}

function parseUnquotedValue(str: string, startIndex: number): AttributeValueResult {
  let i = startIndex;
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
      i = skipQuotedString(str, i);
      continue;
    } else if (parenDepth === 0 && /\s/.test(ch)) {
      break;
    }
    i++;
  }

  return { value: str.slice(startIndex, i), endIndex: i };
}

function skipQuotedString(str: string, startIndex: number): number {
  let i = startIndex + 1; // Skip opening quote
  while (i < str.length && str[i] !== '"') i++;
  return i + 1; // Return position after closing quote
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
