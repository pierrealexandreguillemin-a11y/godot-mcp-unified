/**
 * Base tool handler functionality
 * Provides common utilities for all tool handlers
 */
import { ToolResponse } from '../server/types';
/**
 * Validate basic tool arguments
 */
export declare const validateBasicArgs: (args: any, requiredFields: string[]) => string | null;
/**
 * Validate and normalize tool arguments
 */
export declare const prepareToolArgs: (args: any) => any;
/**
 * Validate project path and check if it's a valid Godot project
 */
export declare const validateProjectPath: (projectPath: string) => ToolResponse | null;
/**
 * Validate scene path exists in project
 */
export declare const validateScenePath: (projectPath: string, scenePath: string) => ToolResponse | null;
/**
 * Validate file path exists in project
 */
export declare const validateFilePath: (projectPath: string, filePath: string) => ToolResponse | null;
/**
 * Create a success response with text content
 */
export declare const createSuccessResponse: (text: string) => ToolResponse;
/**
 * Create a JSON response
 */
export declare const createJsonResponse: (data: any) => ToolResponse;
//# sourceMappingURL=BaseToolHandler.d.ts.map