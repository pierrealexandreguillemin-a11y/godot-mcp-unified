/**
 * Get Debug Output Tool
 * Retrieves debug output from the currently running Godot process
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse } from '../../server/types.js';
import { createJsonResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { getActiveProcess } from '../../core/ProcessManager.js';
import { GetDebugOutputSchema, toMcpSchema } from '../../core/ZodSchemas.js';

export const getDebugOutputDefinition: ToolDefinition = {
  name: 'get_debug_output',
  description: 'Get the current debug output and errors',
  inputSchema: toMcpSchema(GetDebugOutputSchema),
};

export const handleGetDebugOutput = async (): Promise<ToolResponse> => {
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
