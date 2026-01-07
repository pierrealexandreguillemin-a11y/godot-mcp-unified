/**
 * Get Project Settings Tool
 * Reads and parses project.godot settings
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  GetProjectSettingsSchema,
  GetProjectSettingsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface ProjectSetting {
  section: string;
  key: string;
  value: string;
  rawValue: string;
}

export interface ProjectSettingsResult {
  projectPath: string;
  configVersion: number;
  settings: ProjectSetting[];
  sections: string[];
}

export const getProjectSettingsDefinition: ToolDefinition = {
  name: 'get_project_settings',
  description: 'Read and parse project.godot settings. Can filter by section or specific key.',
  inputSchema: toMcpSchema(GetProjectSettingsSchema),
};

/**
 * Parse a project.godot file into structured settings
 */
function parseProjectGodot(content: string): { settings: ProjectSetting[]; configVersion: number } {
  const lines = content.split(/\r?\n/);
  const settings: ProjectSetting[] = [];
  let currentSection = '';
  let configVersion = 4; // Default for Godot 4

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(';')) {
      continue;
    }

    // Section header [section_name]
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Key-value pair: key=value or key="value"
    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const rawValue = kvMatch[2].trim();

      // Parse the value (remove quotes, handle special types)
      let value = rawValue;
      if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        value = rawValue.slice(1, -1);
      }

      // Check for config_version
      if (currentSection === '' && key === 'config_version') {
        configVersion = parseInt(value, 10) || 4;
      }

      settings.push({
        section: currentSection || 'root',
        key: currentSection ? `${currentSection}/${key}` : key,
        value,
        rawValue,
      });
    }
  }

  return { settings, configVersion };
}

export const handleGetProjectSettings = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(GetProjectSettingsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: GetProjectSettingsInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const projectGodotPath = join(typedArgs.projectPath, 'project.godot');
    logDebug(`Reading project settings from: ${projectGodotPath}`);

    const content = readFileSync(projectGodotPath, 'utf-8');
    const { settings, configVersion } = parseProjectGodot(content);

    // Filter by section if provided
    let filteredSettings = settings;
    if (typedArgs.section) {
      filteredSettings = settings.filter(
        (s) => s.section === typedArgs.section || s.key.startsWith(`${typedArgs.section}/`)
      );
    }

    // Filter by specific key if provided
    if (typedArgs.key) {
      filteredSettings = filteredSettings.filter(
        (s) => s.key === typedArgs.key || s.key.endsWith(`/${typedArgs.key}`)
      );
    }

    // Extract unique sections
    const sections = [...new Set(settings.map((s) => s.section))];

    const result: ProjectSettingsResult = {
      projectPath: typedArgs.projectPath,
      configVersion,
      settings: filteredSettings,
      sections,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to read project settings: ${errorMessage}`, [
      'Ensure the project path is correct',
      'Check project.godot exists and is readable',
    ]);
  }
};
