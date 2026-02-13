/**
 * List Projects Tool
 * Lists Godot projects in a directory
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import { prepareToolArgs } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { ToolContext, defaultToolContext } from '../ToolContext.js';
import {
  ListProjectsSchema,
  ListProjectsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const listProjectsDefinition: ToolDefinition = {
  name: 'list_projects',
  description: 'List Godot projects in a directory',
  inputSchema: toMcpSchema(ListProjectsSchema),
};

export const handleListProjects = async (args: BaseToolArgs, ctx: ToolContext = defaultToolContext): Promise<ToolResponse> => {
  // Check for path traversal on raw input before normalization resolves ".."
  const rawDirectory = typeof args.directory === 'string' ? args.directory : '';
  if (rawDirectory.includes('..')) {
    return createErrorResponse('Path traversal not allowed in directory', [
      'Provide a valid directory path without ".." references',
    ]);
  }

  const preparedArgs = prepareToolArgs(args, ctx);

  // Zod validation
  const validation = safeValidateInput(ListProjectsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid directory path to search for Godot projects',
    ]);
  }

  const typedArgs: ListProjectsInput = validation.data;

  try {
    ctx.logDebug(`Listing Godot projects in directory: ${typedArgs.directory}`);

    if (!ctx.existsSync(typedArgs.directory)) {
      return createErrorResponse(`Directory does not exist: ${typedArgs.directory}`, [
        'Provide a valid directory path that exists on the system',
      ]);
    }

    const recursive = typedArgs.recursive === true;
    const projects = ctx.findGodotProjects(typedArgs.directory, recursive);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to list projects: ${errorMessage}`, [
      'Ensure the directory exists and is accessible',
      'Check if you have permission to read the directory',
    ]);
  }
};
