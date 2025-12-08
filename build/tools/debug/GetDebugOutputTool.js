/**
 * Get Debug Output Tool
 * Retrieves debug output from the currently running Godot process
 */
import { createJsonResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { getActiveProcess } from '../../core/ProcessManager.js';
export const getDebugOutputDefinition = {
    name: 'get_debug_output',
    description: 'Get the current debug output and errors',
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
};
export const handleGetDebugOutput = async () => {
    const activeProcess = getActiveProcess();
    if (!activeProcess) {
        return createErrorResponse('No active Godot process.', [
            'Use run_project to start a Godot project first',
            'Check if the Godot process crashed unexpectedly',
        ]);
    }
    return createJsonResponse({
        output: activeProcess.output,
        errors: activeProcess.errors,
    });
};
//# sourceMappingURL=GetDebugOutputTool.js.map