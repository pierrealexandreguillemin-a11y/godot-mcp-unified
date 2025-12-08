/**
 * Manage Autoloads Tool
 * Add, remove, or list autoload singletons in project.godot
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ProjectToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export type AutoloadAction = 'add' | 'remove' | 'list';

export interface ManageAutoloadsArgs extends ProjectToolArgs {
  action: AutoloadAction;
  name?: string;
  path?: string;
}

export interface AutoloadEntry {
  name: string;
  path: string;
  enabled: boolean;
}

export const manageAutoloadsDefinition: ToolDefinition = {
  name: 'manage_autoloads',
  description: 'Add, remove, or list autoload singletons in project.godot',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      action: {
        type: 'string',
        enum: ['add', 'remove', 'list'],
        description: 'Action to perform',
      },
      name: {
        type: 'string',
        description: 'Autoload name (required for add/remove)',
      },
      path: {
        type: 'string',
        description: 'Path to the script or scene (required for add, relative to project)',
      },
    },
    required: ['projectPath', 'action'],
  },
};

/**
 * Parse project.godot file into sections
 */
function parseProjectGodot(content: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>();
  let currentSection = '';

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(';')) {
      continue;
    }

    // Section header
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1);
      if (!sections.has(currentSection)) {
        sections.set(currentSection, new Map());
      }
      continue;
    }

    // Key-value pair
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0 && currentSection) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      sections.get(currentSection)!.set(key, value);
    }
  }

  return sections;
}

/**
 * Serialize sections back to project.godot format
 */
function serializeProjectGodot(sections: Map<string, Map<string, string>>): string {
  const lines: string[] = [];

  for (const [sectionName, entries] of sections) {
    lines.push(`[${sectionName}]`);
    lines.push('');
    for (const [key, value] of entries) {
      lines.push(`${key}=${value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse autoloads from the autoload section
 */
function parseAutoloads(autoloadSection: Map<string, string> | undefined): AutoloadEntry[] {
  if (!autoloadSection) {
    return [];
  }

  const autoloads: AutoloadEntry[] = [];

  for (const [name, value] of autoloadSection) {
    // Format: "*res://path/to/script.gd" or "res://path/to/script.gd"
    // * prefix means enabled
    const enabled = value.startsWith('"*') || value.startsWith('*');
    const path = value.replace(/^["*]+|["]+$/g, '').replace(/^\*/, '');

    autoloads.push({ name, path, enabled });
  }

  return autoloads;
}

export const handleManageAutoloads = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'action']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath and action (add, remove, or list)',
    ]);
  }

  const typedArgs = preparedArgs as ManageAutoloadsArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const projectGodotPath = join(typedArgs.projectPath, 'project.godot');

  try {
    const content = readFileSync(projectGodotPath, 'utf-8');
    const sections = parseProjectGodot(content);

    // Ensure autoload section exists
    if (!sections.has('autoload')) {
      sections.set('autoload', new Map());
    }

    const autoloadSection = sections.get('autoload')!;
    const autoloads = parseAutoloads(autoloadSection);

    switch (typedArgs.action) {
      case 'list': {
        return createJsonResponse({
          projectPath: typedArgs.projectPath,
          autoloadCount: autoloads.length,
          autoloads,
        });
      }

      case 'add': {
        if (!typedArgs.name) {
          return createErrorResponse('Name is required for add action', [
            'Provide a unique autoload name',
          ]);
        }
        if (!typedArgs.path) {
          return createErrorResponse('Path is required for add action', [
            'Provide the path to the script or scene',
          ]);
        }

        // Check if name already exists
        if (autoloads.some(a => a.name === typedArgs.name)) {
          return createErrorResponse(`Autoload "${typedArgs.name}" already exists`, [
            'Use a different name',
            'Remove the existing autoload first',
          ]);
        }

        // Verify file exists
        const autoloadFullPath = join(typedArgs.projectPath, typedArgs.path);
        if (!existsSync(autoloadFullPath)) {
          return createErrorResponse(`File not found: ${typedArgs.path}`, [
            'Check the path is correct',
            'Create the script or scene first',
          ]);
        }

        // Add autoload (enabled by default)
        const resPath = typedArgs.path.startsWith('res://')
          ? typedArgs.path
          : `res://${typedArgs.path.replace(/\\/g, '/')}`;
        autoloadSection.set(typedArgs.name, `"*${resPath}"`);

        // Write back
        const serialized = serializeProjectGodot(sections);
        writeFileSync(projectGodotPath, serialized, 'utf-8');

        logDebug(`Added autoload: ${typedArgs.name} -> ${resPath}`);

        return createSuccessResponse(
          `Autoload added successfully!\n` +
          `Name: ${typedArgs.name}\n` +
          `Path: ${resPath}`
        );
      }

      case 'remove': {
        if (!typedArgs.name) {
          return createErrorResponse('Name is required for remove action', [
            'Provide the autoload name to remove',
          ]);
        }

        // Check if autoload exists
        if (!autoloads.some(a => a.name === typedArgs.name)) {
          return createErrorResponse(`Autoload "${typedArgs.name}" not found`, [
            'Check the autoload name',
            'Use action "list" to see available autoloads',
          ]);
        }

        // Remove autoload
        autoloadSection.delete(typedArgs.name);

        // Write back
        const serialized = serializeProjectGodot(sections);
        writeFileSync(projectGodotPath, serialized, 'utf-8');

        logDebug(`Removed autoload: ${typedArgs.name}`);

        return createSuccessResponse(
          `Autoload removed successfully!\n` +
          `Name: ${typedArgs.name}`
        );
      }

      default:
        return createErrorResponse(`Unknown action: ${typedArgs.action}`, [
          'Use "add", "remove", or "list"',
        ]);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to manage autoloads: ${errorMessage}`, [
      'Check project.godot exists and is readable',
      'Verify the project path is correct',
    ]);
  }
};
