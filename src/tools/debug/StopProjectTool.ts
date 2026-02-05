/**
 * Stop Project Tool
 * Stops the currently running Godot project
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity, bridge fallback
 */

import { ToolDefinition, ToolResponse } from '../../server/types.js';
import { createJsonResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { stopActiveProcess, hasActiveProcess } from '../../core/ProcessManager.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { StopProjectSchema, toMcpSchema } from '../../core/ZodSchemas.js';

export const stopProjectDefinition: ToolDefinition = {
  name: 'stop_project',
  description: 'Stop the currently running Godot project',
  inputSchema: toMcpSchema(StopProjectSchema),
};

export const handleStopProject = async (): Promise<ToolResponse> => {
  // Try bridge first, fallback to process manager
  return executeWithBridge(
    'stop_project',
    {},
    async () => {
      // Fallback: use local process manager
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
    }
  );
};
