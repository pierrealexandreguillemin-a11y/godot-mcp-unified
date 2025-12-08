/**
 * Base tool handler functionality
 * Provides common utilities for all tool handlers
 * ISO/IEC 25010 compliant - strict typing
 */
import { ToolResponse, BaseToolArgs } from '../server/types';
/**
 * Validate basic tool arguments
 * @param args - Tool arguments to validate
 * @param requiredFields - List of required field names
 * @returns Error message if validation fails, null otherwise
 */
export declare const validateBasicArgs: <T extends BaseToolArgs>(args: T, requiredFields: (keyof T)[]) => string | null;
/**
 * Validate and normalize tool arguments
 * @param args - Raw tool arguments
 * @returns Normalized arguments with proper casing and paths
 */
export declare const prepareToolArgs: <T extends BaseToolArgs>(args: T) => T;
/**
 * Validate project path and check if it's a valid Godot project
 * @param projectPath - Path to validate
 * @returns Error response if invalid, null if valid
 */
export declare const validateProjectPath: (projectPath: string) => ToolResponse | null;
/**
 * Validate scene path exists in project
 * @param projectPath - Path to the project
 * @param scenePath - Relative path to the scene
 * @returns Error response if invalid, null if valid
 */
export declare const validateScenePath: (projectPath: string, scenePath: string) => ToolResponse | null;
/**
 * Validate file path exists in project
 * @param projectPath - Path to the project
 * @param filePath - Relative path to the file
 * @returns Error response if invalid, null if valid
 */
export declare const validateFilePath: (projectPath: string, filePath: string) => ToolResponse | null;
/**
 * Create a success response with text content
 * @param text - Success message text
 * @returns Formatted tool response
 */
export declare const createSuccessResponse: (text: string) => ToolResponse;
/**
 * Create a JSON response
 * @param data - Data to serialize as JSON
 * @returns Formatted tool response with JSON content
 */
export declare const createJsonResponse: <T>(data: T) => ToolResponse;
//# sourceMappingURL=BaseToolHandler.d.ts.map