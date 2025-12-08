/**
 * List Projects Tool
 * Lists Godot projects in a directory
 */

import { existsSync } from 'fs';

import { ToolDefinition, ToolResponse, BaseToolArgs, ListProjectsArgs } from '../../server/types';
import { prepareToolArgs, validateBasicArgs } from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { findGodotProjects } from '../../utils/FileUtils';
import { logDebug } from '../../utils/Logger';

export const listProjectsDefinition: ToolDefinition = {
  name: 'list_projects',
  description: 'List Godot projects in a directory',
  inputSchema: {
    type: 'object',
    properties: {
      directory: {
        type: 'string',
        description: 'Directory to search for Godot projects',
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to search recursively (default: false)',
      },
    },
    required: ['directory'],
  },
};

export const handleListProjects = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['directory']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide a valid directory path to search for Godot projects',
    ]);
  }

  const typedArgs = preparedArgs as ListProjectsArgs;

  try {
    logDebug(`Listing Godot projects in directory: ${typedArgs.directory}`);

    if (!existsSync(typedArgs.directory)) {
      return createErrorResponse(`Directory does not exist: ${typedArgs.directory}`, [
        'Provide a valid directory path that exists on the system',
      ]);
    }

    const recursive = typedArgs.recursive === true;
    const projects = findGodotProjects(typedArgs.directory, recursive);

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
