/**
 * TSCN Value Parser
 * Handles parsing of TSCN value types (primitives, arrays, dictionaries, function calls)
 * ISO/IEC 25010 compliant - Single Responsibility Principle
 */

import type { TscnValue, TscnFunctionCall } from './types.js';

/**
 * Parse a value string into appropriate type
 */
export function parseValue(str: string): TscnValue {
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
export function parseArray(str: string): TscnValue[] {
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
export function parseDictionary(str: string): Record<string, TscnValue> {
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
export function parseArguments(str: string): TscnValue[] {
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
export function splitTopLevel(str: string, delimiter: string): string[] {
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
export function findTopLevelChar(str: string, char: string): number {
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
 * Check if a value is a function call (type guard)
 * Accepts unknown for runtime validation of external data
 * ISO/IEC 5055: Defensive programming - validate before use
 */
export function isFunctionCall(value: unknown): value is TscnFunctionCall {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'name' in value &&
    'args' in value
  );
}
