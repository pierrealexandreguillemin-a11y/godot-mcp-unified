/**
 * Get Debug Stream Status Tool
 * Returns the current status of the debug stream WebSocket server
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import { createJsonResponse } from '../BaseToolHandler.js';
import { debugStreamServer, DebugStreamStatus } from '../../debug/DebugStreamServer.js';
import { GetDebugStreamStatusSchema, toMcpSchema } from '../../core/ZodSchemas.js';

export interface GetDebugStreamStatusResult extends DebugStreamStatus {
  url?: string;
}

export const getDebugStreamStatusDefinition: ToolDefinition = {
  name: 'get_debug_stream_status',
  description: 'Get the current status of the debug stream WebSocket server',
  inputSchema: toMcpSchema(GetDebugStreamStatusSchema),
};

export const handleGetDebugStreamStatus = async (_args: BaseToolArgs): Promise<ToolResponse> => {
  const status = debugStreamServer.getStatus();

  const result: GetDebugStreamStatusResult = {
    ...status,
    url: status.running && status.port ? `ws://localhost:${status.port}` : undefined,
  };

  return createJsonResponse(result);
};
