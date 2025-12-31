/**
 * Get Debug Stream Status Tool
 * Returns the current status of the debug stream WebSocket server
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import { createJsonResponse } from '../BaseToolHandler.js';
import { debugStreamServer, DebugStreamStatus } from '../../debug/DebugStreamServer.js';

export interface GetDebugStreamStatusResult extends DebugStreamStatus {
  url?: string;
}

export const getDebugStreamStatusDefinition: ToolDefinition = {
  name: 'get_debug_stream_status',
  description: 'Get the current status of the debug stream WebSocket server',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const handleGetDebugStreamStatus = async (_args: BaseToolArgs): Promise<ToolResponse> => {
  const status = debugStreamServer.getStatus();

  const result: GetDebugStreamStatusResult = {
    ...status,
    url: status.running && status.port ? `ws://localhost:${status.port}` : undefined,
  };

  return createJsonResponse(result);
};
