/**
 * Read Script Tool
 * Reads the content of a GDScript file
 */
import { prepareToolArgs, validateBasicArgs, validateProjectPath, } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
export const readScriptDefinition = {
    name: 'read_script',
    description: 'Read the content of a GDScript (.gd) file',
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
        },
        required: ['projectPath', 'scriptPath'],
    },
};
export const handleReadScript = async (args) => {
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
        logDebug(`Reading script: ${fullPath}`);
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
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n').length;
        return {
            content: [
                {
                    type: 'text',
                    text: `# Script: ${args.scriptPath}\n# Lines: ${lines}\n\n${content}`,
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to read script: ${errorMessage}`, [
            'Verify the script path is correct',
            'Check file permissions',
        ]);
    }
};
//# sourceMappingURL=ReadScriptTool.js.map