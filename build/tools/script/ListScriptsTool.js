/**
 * List Scripts Tool
 * Lists all GDScript files in a Godot project
 */
import { prepareToolArgs, validateBasicArgs, validateProjectPath, createJsonResponse, } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
export const listScriptsDefinition = {
    name: 'list_scripts',
    description: 'List all GDScript (.gd) files in a Godot project',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
            },
            directory: {
                type: 'string',
                description: 'Subdirectory to search (optional, defaults to entire project)',
            },
        },
        required: ['projectPath'],
    },
};
const findScripts = (basePath, currentPath, scripts) => {
    try {
        const entries = readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            // Skip hidden directories and .godot folder
            if (entry.name.startsWith('.') || entry.name === '.godot') {
                continue;
            }
            const fullPath = join(currentPath, entry.name);
            if (entry.isDirectory()) {
                findScripts(basePath, fullPath, scripts);
            }
            else if (entry.isFile() && entry.name.endsWith('.gd')) {
                const stats = statSync(fullPath);
                scripts.push({
                    path: relative(basePath, fullPath).replace(/\\/g, '/'),
                    name: entry.name,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                });
            }
        }
    }
    catch (error) {
        // Skip directories we can't read
    }
};
export const handleListScripts = async (args) => {
    args = prepareToolArgs(args);
    const validationError = validateBasicArgs(args, ['projectPath']);
    if (validationError) {
        return createErrorResponse(validationError, [
            'Provide a valid path to a Godot project directory',
        ]);
    }
    const projectValidationError = validateProjectPath(args.projectPath);
    if (projectValidationError) {
        return projectValidationError;
    }
    try {
        const searchPath = args.directory
            ? join(args.projectPath, args.directory)
            : args.projectPath;
        logDebug(`Listing scripts in: ${searchPath}`);
        const scripts = [];
        findScripts(args.projectPath, searchPath, scripts);
        // Sort by path
        scripts.sort((a, b) => a.path.localeCompare(b.path));
        return createJsonResponse({
            projectPath: args.projectPath,
            directory: args.directory || '/',
            count: scripts.length,
            scripts: scripts,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to list scripts: ${errorMessage}`, [
            'Verify the project path is accessible',
            'Check if the directory exists',
        ]);
    }
};
//# sourceMappingURL=ListScriptsTool.js.map