/**
 * Base tool handler functionality
 * Provides common utilities for all tool handlers
 * ISO/IEC 25010 compliant - strict typing
 */
import { validatePath, normalizeHandlerPaths } from '../core/PathManager.js';
import { normalizeParameters } from '../core/ParameterNormalizer.js';
import { createErrorResponse } from '../utils/ErrorHandler.js';
import { isGodotProject } from '../utils/FileUtils.js';
import { join } from 'path';
import { existsSync } from 'fs';
/**
 * Validate basic tool arguments
 * @param args - Tool arguments to validate
 * @param requiredFields - List of required field names
 * @returns Error message if validation fails, null otherwise
 */
export const validateBasicArgs = (args, requiredFields) => {
    for (const field of requiredFields) {
        if (args[field] === undefined || args[field] === null || args[field] === '') {
            return `${String(field)} is required`;
        }
    }
    return null;
};
/**
 * Validate and normalize tool arguments
 * @param args - Raw tool arguments
 * @returns Normalized arguments with proper casing and paths
 */
export const prepareToolArgs = (args) => {
    // Normalize parameters to camelCase
    let normalized = normalizeParameters(args);
    // Normalize all path arguments
    normalized = normalizeHandlerPaths(normalized);
    return normalized;
};
/**
 * Validate project path and check if it's a valid Godot project
 * @param projectPath - Path to validate
 * @returns Error response if invalid, null if valid
 */
export const validateProjectPath = (projectPath) => {
    if (!validatePath(projectPath)) {
        return createErrorResponse('Invalid project path', [
            'Provide a valid path without ".." or other potentially unsafe characters',
        ]);
    }
    // Check if the project directory exists and contains a project.godot file
    if (!isGodotProject(projectPath)) {
        return createErrorResponse(`Not a valid Godot project: ${projectPath}`, [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
        ]);
    }
    return null;
};
/**
 * Validate scene path exists in project
 * @param projectPath - Path to the project
 * @param scenePath - Relative path to the scene
 * @returns Error response if invalid, null if valid
 */
export const validateScenePath = (projectPath, scenePath) => {
    if (!validatePath(scenePath)) {
        return createErrorResponse('Invalid scene path', [
            'Provide a valid path without ".." or other potentially unsafe characters',
        ]);
    }
    // Check if the scene file exists
    const fullScenePath = join(projectPath, scenePath);
    if (!existsSync(fullScenePath)) {
        return createErrorResponse(`Scene file does not exist: ${scenePath}`, [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
        ]);
    }
    return null;
};
/**
 * Validate file path exists in project
 * @param projectPath - Path to the project
 * @param filePath - Relative path to the file
 * @returns Error response if invalid, null if valid
 */
export const validateFilePath = (projectPath, filePath) => {
    if (!validatePath(filePath)) {
        return createErrorResponse('Invalid file path', [
            'Provide a valid path without ".." or other potentially unsafe characters',
        ]);
    }
    // Check if the file exists
    const fullFilePath = join(projectPath, filePath);
    if (!existsSync(fullFilePath)) {
        return createErrorResponse(`File does not exist: ${filePath}`, [
            'Ensure the file path is correct',
        ]);
    }
    return null;
};
/**
 * Create a success response with text content
 * @param text - Success message text
 * @returns Formatted tool response
 */
export const createSuccessResponse = (text) => ({
    content: [
        {
            type: 'text',
            text: text,
        },
    ],
});
/**
 * Create a JSON response
 * @param data - Data to serialize as JSON
 * @returns Formatted tool response with JSON content
 */
export const createJsonResponse = (data) => ({
    content: [
        {
            type: 'text',
            text: JSON.stringify(data, null, 2),
        },
    ],
});
//# sourceMappingURL=BaseToolHandler.js.map