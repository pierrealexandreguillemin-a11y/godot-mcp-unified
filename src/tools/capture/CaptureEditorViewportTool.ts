/**
 * Capture Editor Viewport Tool
 * Captures a screenshot of the Godot editor's 2D or 3D viewport via the WebSocket plugin.
 * This is an editor-only tool with no CLI fallback.
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  CaptureEditorViewportSchema,
  CaptureEditorViewportInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const captureEditorViewportDefinition: ToolDefinition = {
  name: 'capture_editor_viewport',
  description:
    'Capture a screenshot of the Godot editor viewport (2D or 3D). ' +
    'Requires the Godot editor plugin to be running via WebSocket bridge.',
  inputSchema: toMcpSchema(CaptureEditorViewportSchema),
};

export const handleCaptureEditorViewport = async (
  args: BaseToolArgs,
): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validation = safeValidateInput(CaptureEditorViewportSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
      'viewport must be "2d" or "3d"',
    ]);
  }

  const typedArgs: CaptureEditorViewportInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Zod schema provides defaults: viewport='2d', outputPath='screenshots/editor_viewport.png'
  const { viewport, outputPath } = typedArgs;

  logDebug(
    `Capturing editor ${viewport} viewport for project: ${typedArgs.projectPath}`,
  );

  return executeWithBridge(
    'capture_viewport',
    {
      viewport,
      output_path: outputPath,
    },
    async () => {
      // No CLI fallback - this tool requires the editor plugin
      return createErrorResponse(
        'This tool requires the Godot editor plugin to be running. ' +
          'The WebSocket bridge is not connected.',
        [
          'Open the Godot editor with the MCP plugin enabled',
          'Ensure the WebSocket server is running (check Output panel)',
          'Use take_screenshot for runtime screenshots without the editor',
        ],
      );
    },
  );
};
