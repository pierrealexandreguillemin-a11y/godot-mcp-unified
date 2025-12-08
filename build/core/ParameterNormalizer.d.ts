/**
 * Parameter normalization utilities
 * Handles conversion between snake_case and camelCase parameters
 */
export interface OperationParams {
    [key: string]: any;
}
/**
 * Normalize parameters to camelCase format
 * @param params Object with either snake_case or camelCase keys
 * @returns Object with all keys in camelCase format
 */
export declare const normalizeParameters: (params: OperationParams) => OperationParams;
/**
 * Convert camelCase keys to snake_case
 * @param params Object with camelCase keys
 * @returns Object with snake_case keys
 */
export declare const convertCamelToSnakeCase: (params: OperationParams) => OperationParams;
//# sourceMappingURL=ParameterNormalizer.d.ts.map