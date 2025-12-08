/**
 * Parameter normalization utilities
 * Handles conversion between snake_case and camelCase parameters
 * ISO/IEC 25010 compliant - strict typing
 */
import { BaseToolArgs } from '../server/types';
/**
 * Normalize parameters to camelCase format
 * @param params Object with either snake_case or camelCase keys
 * @returns Object with all keys in camelCase format
 */
export declare const normalizeParameters: <T extends BaseToolArgs>(params: T) => T;
/**
 * Convert camelCase keys to snake_case
 * @param params Object with camelCase keys
 * @returns Object with snake_case keys
 */
export declare const convertCamelToSnakeCase: <T extends BaseToolArgs>(params: T) => BaseToolArgs;
//# sourceMappingURL=ParameterNormalizer.d.ts.map