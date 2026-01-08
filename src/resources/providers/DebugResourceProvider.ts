/**
 * Debug Resource Provider
 * Provides MCP Resources for Godot debug information
 *
 * Resources:
 * - godot://debug/output - Console output (requires debug stream)
 * - godot://debug/stream - Debug stream status
 * - godot://debug/breakpoints - Active breakpoints
 * - godot://debug/stack - Call stack (when paused)
 * - godot://debug/variables - Local variables (when paused)
 */

import { ResourceProvider, GodotResource, ResourceContent, RESOURCE_URIS } from '../types.js';

// Simple in-memory debug buffer (shared state)
let debugBuffer: string[] = [];
let streamActive = false;
let streamStartTime: Date | null = null;

/**
 * Add debug output to buffer (called externally)
 */
export function addDebugOutput(line: string): void {
  debugBuffer.push(line);
  if (debugBuffer.length > 1000) {
    debugBuffer = debugBuffer.slice(-500); // Keep last 500 lines
  }
}

/**
 * Set stream status
 */
export function setDebugStreamActive(active: boolean): void {
  streamActive = active;
  if (active) {
    streamStartTime = new Date();
    debugBuffer = [];
  } else {
    streamStartTime = null;
  }
}

/**
 * Get current debug buffer
 */
export function getDebugBuffer(): string[] {
  return [...debugBuffer];
}

/**
 * Get stream status
 */
export function getDebugStreamStatus(): { isActive: boolean; startTime: Date | null } {
  return { isActive: streamActive, startTime: streamStartTime };
}

export class DebugResourceProvider implements ResourceProvider {
  prefix = 'debug';

  handlesUri(uri: string): boolean {
    return (
      uri === RESOURCE_URIS.DEBUG_OUTPUT ||
      uri === RESOURCE_URIS.DEBUG_STREAM ||
      uri === RESOURCE_URIS.DEBUG_BREAKPOINTS ||
      uri === RESOURCE_URIS.DEBUG_STACK ||
      uri === RESOURCE_URIS.DEBUG_VARIABLES
    );
  }

  async listResources(_projectPath: string): Promise<GodotResource[]> {
    return [
      {
        uri: RESOURCE_URIS.DEBUG_OUTPUT,
        name: 'Debug Output',
        description: 'Console output from running Godot project',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.DEBUG_STREAM,
        name: 'Debug Stream Status',
        description: 'Status of the debug output stream',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.DEBUG_BREAKPOINTS,
        name: 'Breakpoints',
        description: 'Active breakpoints (requires debugger connection)',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.DEBUG_STACK,
        name: 'Call Stack',
        description: 'Current call stack when paused at breakpoint',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.DEBUG_VARIABLES,
        name: 'Local Variables',
        description: 'Local variables in current scope when paused',
        mimeType: 'application/json',
      },
    ];
  }

  async readResource(_projectPath: string, uri: string): Promise<ResourceContent | null> {
    switch (uri) {
      case RESOURCE_URIS.DEBUG_OUTPUT:
        return this.getDebugOutput();

      case RESOURCE_URIS.DEBUG_STREAM:
        return this.getStreamStatus();

      case RESOURCE_URIS.DEBUG_BREAKPOINTS:
        return this.getBreakpoints();

      case RESOURCE_URIS.DEBUG_STACK:
        return this.getCallStack();

      case RESOURCE_URIS.DEBUG_VARIABLES:
        return this.getVariables();

      default:
        return null;
    }
  }

  private async getDebugOutput(): Promise<ResourceContent> {
    const status = getDebugStreamStatus();
    const buffer = getDebugBuffer();

    return {
      uri: RESOURCE_URIS.DEBUG_OUTPUT,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          isActive: status.isActive,
          lineCount: buffer.length,
          output: buffer,
          ...(status.startTime && {
            startTime: status.startTime.toISOString(),
            durationMs: Date.now() - status.startTime.getTime(),
          }),
        },
        null,
        2
      ),
    };
  }

  private async getStreamStatus(): Promise<ResourceContent> {
    const status = getDebugStreamStatus();

    return {
      uri: RESOURCE_URIS.DEBUG_STREAM,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          isActive: status.isActive,
          startTime: status.startTime?.toISOString() || null,
          bufferSize: getDebugBuffer().length,
        },
        null,
        2
      ),
    };
  }

  private async getBreakpoints(): Promise<ResourceContent> {
    return {
      uri: RESOURCE_URIS.DEBUG_BREAKPOINTS,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          note: 'Breakpoint management requires Godot remote debugger connection',
          supported: false,
          breakpoints: [],
        },
        null,
        2
      ),
    };
  }

  private async getCallStack(): Promise<ResourceContent> {
    return {
      uri: RESOURCE_URIS.DEBUG_STACK,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          note: 'Call stack requires paused state via Godot remote debugger',
          supported: false,
          isPaused: false,
          stack: [],
        },
        null,
        2
      ),
    };
  }

  private async getVariables(): Promise<ResourceContent> {
    return {
      uri: RESOURCE_URIS.DEBUG_VARIABLES,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          note: 'Variables require paused state via Godot remote debugger',
          supported: false,
          isPaused: false,
          locals: [],
          members: [],
          globals: [],
        },
        null,
        2
      ),
    };
  }
}
