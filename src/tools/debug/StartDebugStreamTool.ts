/**
 * Start Debug Stream Tool
 * Starts the WebSocket server for real-time debug output streaming
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import { prepareToolArgs, createJsonResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { debugStreamServer, DEFAULT_DEBUG_STREAM_PORT } from '../../debug/DebugStreamServer.js';
import {
  StartDebugStreamSchema,
  StartDebugStreamInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface StartDebugStreamResult {
  url: string;
  port: number;
  message: string;
}

export const startDebugStreamDefinition: ToolDefinition = {
  name: 'start_debug_stream',
  description:
    'Start a WebSocket server for real-time debug output streaming. Connect with any WebSocket client to receive live Godot debug messages.',
  inputSchema: toMcpSchema(StartDebugStreamSchema),
};

export const handleStartDebugStream = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(StartDebugStreamSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Port must be between 1 and 65535',
      'Poll interval must be between 10ms and 10000ms',
    ]);
  }

  const typedArgs: StartDebugStreamInput = validation.data;

  const port = typedArgs.port ?? DEFAULT_DEBUG_STREAM_PORT;
  const pollIntervalMs = typedArgs.pollIntervalMs ?? 100;

  // Validate port number
  if (port < 1 || port > 65535) {
    return createErrorResponse('Invalid port number', [
      'Port must be between 1 and 65535',
      `Default port is ${DEFAULT_DEBUG_STREAM_PORT}`,
    ]);
  }

  // Validate poll interval
  if (pollIntervalMs < 10 || pollIntervalMs > 10000) {
    return createErrorResponse('Invalid poll interval', [
      'Poll interval must be between 10ms and 10000ms',
      'Default is 100ms',
    ]);
  }

  try {
    debugStreamServer.start(port, pollIntervalMs);

    const result: StartDebugStreamResult = {
      url: `ws://localhost:${port}`,
      port,
      message: 'Debug stream server started. Connect with a WebSocket client to receive live debug output.',
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('already running')) {
      const status = debugStreamServer.getStatus();
      return createErrorResponse('Debug stream server is already running', [
        `Current port: ${status.port}`,
        `Connected clients: ${status.clientCount}`,
        'Use stop_debug_stream to stop the current server first',
      ]);
    }

    return createErrorResponse(`Failed to start debug stream: ${errorMessage}`, [
      'Check if the port is available',
      `Try a different port (default: ${DEFAULT_DEBUG_STREAM_PORT})`,
    ]);
  }
};
