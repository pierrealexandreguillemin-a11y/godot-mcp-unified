/**
 * Get Godot Version Tool
 * Retrieves the version of the installed Godot engine
 */
import { createSuccessResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { getGodotVersion } from '../../core/GodotExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
export const getGodotVersionDefinition = {
    name: 'get_godot_version',
    description: 'Get the installed Godot version',
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
};
export const handleGetGodotVersion = async () => {
    try {
        const godotPath = await detectGodotPath();
        if (!godotPath) {
            return createErrorResponse('Could not find a valid Godot executable path', [
                'Ensure Godot is installed correctly',
                'Set GODOT_PATH environment variable to specify the correct path',
            ]);
        }
        const version = await getGodotVersion(godotPath);
        return createSuccessResponse(version);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to get Godot version: ${errorMessage}`, [
            'Ensure Godot is installed correctly',
            'Check if the GODOT_PATH environment variable is set correctly',
        ]);
    }
};
//# sourceMappingURL=GetGodotVersionTool.js.map