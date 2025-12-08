/**
 * Parameter normalization utilities
 * Handles conversion between snake_case and camelCase parameters
 * ISO/IEC 25010 compliant - strict typing
 */

import { PARAMETER_MAPPINGS, REVERSE_PARAMETER_MAPPINGS } from '../config/config';
import { BaseToolArgs } from '../server/types';

/**
 * Normalize parameters to camelCase format
 * @param params Object with either snake_case or camelCase keys
 * @returns Object with all keys in camelCase format
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
 * Convert camelCase keys to snake_case
 * @param params Object with camelCase keys
 * @returns Object with snake_case keys
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
