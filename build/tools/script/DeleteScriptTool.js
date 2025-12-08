/**
 * Delete Script Tool
 * Deletes a GDScript file from the project
 */
import { prepareToolArgs, validateBasicArgs, validateProjectPath, createSuccessResponse, } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
export const deleteScriptDefinition = {
    name: 'delete_script',
    description: 'Delete a GDScript (.gd) file from the project',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
            },
            scriptPath: {
                type: 'string',
                description: 'Path to the script file (relative to project)',
            },
            force: {
                type: 'boolean',
                description: 'Skip confirmation (default: false)',
            },
        },
        required: ['projectPath', 'scriptPath'],
    },
};
export const handleDeleteScript = async (args) => {
    args = prepareToolArgs(args);
    const validationError = validateBasicArgs(args, ['projectPath', 'scriptPath']);
    if (validationError) {
        return createErrorResponse(validationError, [
            'Provide both projectPath and scriptPath',
        ]);
    }
    const projectValidationError = validateProjectPath(args.projectPath);
    if (projectValidationError) {
        return projectValidationError;
    }
    try {
        const fullPath = join(args.projectPath, args.scriptPath);
        logDebug(`Deleting script: ${fullPath}`);
        if (!existsSync(fullPath)) {
            return createErrorResponse(`Script file not found: ${args.scriptPath}`, [
                'Use list_scripts to find available scripts',
                'Check the script path is correct',
            ]);
        }
        if (!args.scriptPath.endsWith('.gd')) {
            return createErrorResponse('File is not a GDScript file (.gd)', [
                'Provide a path to a .gd file',
            ]);
        }
        // Delete the file
        unlinkSync(fullPath);
        return createSuccessResponse(`Script deleted successfully: ${args.scriptPath}\n` +
            `Note: Any scenes referencing this script may have broken references.`);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to delete script: ${errorMessage}`, [
            'Check file permissions',
            'Verify the script path is correct',
        ]);
    }
};
//# sourceMappingURL=DeleteScriptTool.js.map