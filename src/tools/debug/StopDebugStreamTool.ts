/**
 * Stop Debug Stream Tool
 * Stops the WebSocket server for debug output streaming
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import { createJsonResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { debugStreamServer } from '../../debug/DebugStreamServer.js';
import { StopDebugStreamSchema, toMcpSchema } from '../../core/ZodSchemas.js';

export interface StopDebugStreamResult {
  message: string;
  disconnectedClients: number;
}

export const stopDebugStreamDefinition: ToolDefinition = {
  name: 'stop_debug_stream',
  description: 'Stop the WebSocket server for debug output streaming',
  inputSchema: toMcpSchema(StopDebugStreamSchema),
};

export const handleStopDebugStream = async (_args: BaseToolArgs): Promise<ToolResponse> => {
  try {
    const status = debugStreamServer.getStatus();
    const clientCount = status.clientCount;

    debugStreamServer.stop();

    const result: StopDebugStreamResult = {
      message: 'Debug stream server stopped',
      disconnectedClients: clientCount,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not running')) {
      return createErrorResponse('Debug stream server is not running', [
        'Use start_debug_stream to start the server first',
        'Use get_debug_stream_status to check current status',
      ]);
    }

    return createErrorResponse(`Failed to stop debug stream: ${errorMessage}`, [
      'Check get_debug_stream_status for current state',
    ]);
  }
};
