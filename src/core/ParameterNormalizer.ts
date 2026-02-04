/**
 * Parameter normalization utilities for cross-platform API compatibility.
 *
 * This module provides bidirectional conversion between snake_case and camelCase
 * parameter naming conventions. This is essential for interfacing between JavaScript/TypeScript
 * conventions (camelCase) and GDScript conventions (snake_case).
 *
 * @module ParameterNormalizer
 * @author Godot MCP Unified Team
 * @version 1.0.0
 *
 * @description
 * Implements ISO/IEC 25010 quality characteristics:
 * - **Interoperability**: Seamless parameter conversion between naming conventions
 * - **Maintainability**: Centralized conversion logic with predefined mappings
 * - **Reliability**: Recursive handling of nested objects with type safety
 * - **Usability**: Accepts both naming conventions for developer convenience
 *
 * @example
 * ```typescript
 * import { normalizeParameters, convertCamelToSnakeCase } from './ParameterNormalizer';
 *
 * // Convert incoming snake_case API params to internal camelCase
 * const params = normalizeParameters({ node_path: 'Player', is_active: true });
 * // Result: { nodePath: 'Player', isActive: true }
 *
 * // Convert internal camelCase to snake_case for Godot
 * const godotParams = convertCamelToSnakeCase({ nodePath: 'Player', isActive: true });
 * // Result: { node_path: 'Player', is_active: true }
 * ```
 */

import { PARAMETER_MAPPINGS, REVERSE_PARAMETER_MAPPINGS } from '../config/config';
import { BaseToolArgs } from '../server/types';

/**
 * Normalizes parameters from snake_case to camelCase format.
 *
 * This function converts API parameters that may use snake_case naming (common in
 * Python/GDScript) to camelCase (standard in JavaScript/TypeScript). It uses predefined
 * mappings from the configuration and handles nested objects recursively.
 *
 * @function normalizeParameters
 * @template T - Type extending BaseToolArgs for type-safe parameter handling
 * @param {T} params - Object with either snake_case or camelCase keys
 * @returns {T} Object with all keys converted to camelCase format
 *
 * @example
 * ```typescript
 * // Simple parameter conversion
 * const result = normalizeParameters({
 *   project_path: '/path/to/project',
 *   node_name: 'Player'
 * });
 * // Result: { projectPath: '/path/to/project', nodeName: 'Player' }
 * ```
 *
 * @example
 * ```typescript
 * // Nested object conversion
 * const result = normalizeParameters({
 *   scene_config: {
 *     root_node: 'Main',
 *     auto_load: true
 *   }
 * });
 * // Result: { sceneConfig: { rootNode: 'Main', autoLoad: true } }
 * ```
 *
 * @example
 * ```typescript
 * // Already camelCase params pass through unchanged
 * const result = normalizeParameters({ projectPath: '/path' });
 * // Result: { projectPath: '/path' }
 * ```
 *
 * @remarks
 * - Returns input unchanged if it's not an object or is null
 * - Arrays are not recursively processed (passed through as-is)
 * - Uses PARAMETER_MAPPINGS for known conversions, unknown snake_case keys remain unchanged
 *
 * @see {@link convertCamelToSnakeCase} for the reverse conversion
 * @see {@link PARAMETER_MAPPINGS} for the mapping configuration
 */
export const normalizeParameters = <T extends BaseToolArgs>(params: T): T => {
  if (!params || typeof params !== 'object') {
    return params;
  }

  const result: BaseToolArgs = {};

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      let normalizedKey: string = key;

      // If the key is in snake_case, convert it to camelCase using our mapping
      if (key.includes('_')) {
        const mappedKey = PARAMETER_MAPPINGS[key];
        if (mappedKey) {
          normalizedKey = mappedKey;
        }
      }

      const value = params[key];

      // Handle nested objects recursively
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[normalizedKey] = normalizeParameters(value as BaseToolArgs);
      } else {
        result[normalizedKey] = value;
      }
    }
  }

  return result as T;
};

/**
 * Converts camelCase parameter keys to snake_case format for Godot compatibility.
 *
 * This function transforms JavaScript/TypeScript style camelCase parameters to
 * snake_case format expected by GDScript and Godot APIs. It uses predefined reverse
 * mappings and falls back to algorithmic conversion for unmapped keys.
 *
 * @function convertCamelToSnakeCase
 * @template T - Type extending BaseToolArgs for type-safe parameter handling
 * @param {T} params - Object with camelCase keys
 * @returns {BaseToolArgs} Object with all keys converted to snake_case format
 *
 * @example
 * ```typescript
 * // Simple parameter conversion
 * const result = convertCamelToSnakeCase({
 *   projectPath: '/path/to/project',
 *   nodeName: 'Player'
 * });
 * // Result: { project_path: '/path/to/project', node_name: 'Player' }
 * ```
 *
 * @example
 * ```typescript
 * // Nested object conversion
 * const result = convertCamelToSnakeCase({
 *   sceneConfig: {
 *     rootNode: 'Main',
 *     autoLoad: true
 *   }
 * });
 * // Result: { scene_config: { root_node: 'Main', auto_load: true } }
 * ```
 *
 * @example
 * ```typescript
 * // Algorithmic conversion for unmapped keys
 * const result = convertCamelToSnakeCase({
 *   myCustomParameter: 'value'
 * });
 * // Result: { my_custom_parameter: 'value' }
 * ```
 *
 * @remarks
 * - Uses REVERSE_PARAMETER_MAPPINGS for known conversions first
 * - Falls back to regex-based conversion (inserting underscore before capitals)
 * - Handles nested objects recursively
 * - Arrays are not recursively processed (passed through as-is)
 * - Values are preserved as-is, only keys are transformed
 *
 * @see {@link normalizeParameters} for the reverse conversion
 * @see {@link REVERSE_PARAMETER_MAPPINGS} for the mapping configuration
 */
export const convertCamelToSnakeCase = <T extends BaseToolArgs>(params: T): BaseToolArgs => {
  const result: BaseToolArgs = {};

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      // Convert camelCase to snake_case
      const snakeKey =
        REVERSE_PARAMETER_MAPPINGS[key] ||
        key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

      const value = params[key];

      // Handle nested objects recursively
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[snakeKey] = convertCamelToSnakeCase(value as BaseToolArgs);
      } else {
        result[snakeKey] = value;
      }
    }
  }

  return result;
};
