/**
 * Stop Project Tool
 * Stops the currently running Godot project
 */
import { createJsonResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { stopActiveProcess, hasActiveProcess } from '../../core/ProcessManager.js';
export const stopProjectDefinition = {
    name: 'stop_project',
    description: 'Stop the currently running Godot project',
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
};
export const handleStopProject = async () => {
    if (!hasActiveProcess()) {
        return createErrorResponse('No active Godot process to stop.', [
            'Use run_project to start a Godot project first',
            'The process may have already terminated',
        ]);
    }
    const result = stopActiveProcess();
    if (!result) {
        return createErrorResponse('Failed to stop Godot process', [
            'The process may have already terminated',
        ]);
    }
    return createJsonResponse({
        message: 'Godot project stopped',
        finalOutput: result.output,
        finalErrors: result.errors,
    });
};
//# sourceMappingURL=StopProjectTool.js.map