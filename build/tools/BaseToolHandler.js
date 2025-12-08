/**
 * Base tool handler functionality
 * Provides common utilities for all tool handlers
 */
import { validatePath, normalizeHandlerPaths } from '../core/PathManager.js';
import { normalizeParameters } from '../core/ParameterNormalizer.js';
import { createErrorResponse } from '../utils/ErrorHandler.js';
import { isGodotProject } from '../utils/FileUtils.js';
import { join } from 'path';
import { existsSync } from 'fs';
/**
 * Validate basic tool arguments
 */
export const validateBasicArgs = (args, requiredFields) => {
    for (const field of requiredFields) {
        if (!args[field]) {
            return `${field} is required`;
        }
    }
    return null;
};
/**
 * Validate and normalize tool arguments
 */
export const prepareToolArgs = (args) => {
    // Normalize parameters to camelCase
    args = normalizeParameters(args);
    // Normalize all path arguments
    args = normalizeHandlerPaths(args);
    return args;
};
/**
 * Validate project path and check if it's a valid Godot project
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