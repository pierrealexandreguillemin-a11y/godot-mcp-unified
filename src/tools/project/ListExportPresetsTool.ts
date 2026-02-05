/**
 * List Export Presets Tool
 * Lists all export presets configured in a Godot project
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
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  ListExportPresetsSchema,
  ListExportPresetsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface ExportPresetInfo {
  index: number;
  name: string;
  platform: string;
  runnable: boolean;
  exportPath?: string;
  exportFilter?: string;
}

export interface ListExportPresetsResult {
  projectPath: string;
  presetsFile: string;
  count: number;
  presets: ExportPresetInfo[];
}

export const listExportPresetsDefinition: ToolDefinition = {
  name: 'list_export_presets',
  description: 'List all export presets configured in a Godot project (from export_presets.cfg)',
  inputSchema: toMcpSchema(ListExportPresetsSchema),
};

/**
 * Save current preset to array if valid
 */
function savePreset(
  presets: ExportPresetInfo[],
  preset: Partial<ExportPresetInfo> | null,
  index: number
): void {
  if (preset && preset.name) {
    presets.push({
      index,
      name: preset.name,
      platform: preset.platform || 'Unknown',
      runnable: preset.runnable ?? false,
      exportPath: preset.exportPath,
      exportFilter: preset.exportFilter,
    });
  }
}

/**
 * Parse export_presets.cfg content into preset objects
 */
function parseExportPresets(content: string): ExportPresetInfo[] {
  const presets: ExportPresetInfo[] = [];
  const lines = content.split('\n');

  let currentPreset: Partial<ExportPresetInfo> | null = null;
  let currentIndex = -1;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for preset section header [preset.N]
    const presetMatch = trimmedLine.match(/^\[preset\.(\d+)\]$/);
    if (presetMatch) {
      savePreset(presets, currentPreset, currentIndex);
      currentIndex = parseInt(presetMatch[1], 10);
      currentPreset = {};
      continue;
    }

    // Skip if not in a preset section
    if (currentPreset === null) {
      continue;
    }

    // Skip options section [preset.N.options]
    if (trimmedLine.match(/^\[preset\.\d+\.options\]$/)) {
      savePreset(presets, currentPreset, currentIndex);
      currentPreset = null;
      continue;
    }

    // Parse key=value pairs
    const keyValueMatch = trimmedLine.match(/^(\w+)="?([^"]*)"?$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;

      switch (key) {
        case 'name':
          currentPreset.name = value;
          break;
        case 'platform':
          currentPreset.platform = value;
          break;
        case 'runnable':
          currentPreset.runnable = value === 'true';
          break;
        case 'export_path':
          currentPreset.exportPath = value;
          break;
        case 'export_filter':
          currentPreset.exportFilter = value;
          break;
      }
    }
  }

  // Don't forget the last preset if file doesn't end with options section
  savePreset(presets, currentPreset, currentIndex);

  return presets;
}

export const handleListExportPresets = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ListExportPresetsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: ListExportPresetsInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const presetsPath = join(typedArgs.projectPath, 'export_presets.cfg');

    // Check if export_presets.cfg exists
    if (!existsSync(presetsPath)) {
      return createJsonResponse({
        projectPath: typedArgs.projectPath,
        presetsFile: 'export_presets.cfg',
        count: 0,
        presets: [],
        message: 'No export_presets.cfg found. Configure export presets in Godot editor (Project > Export).',
      });
    }

    logDebug(`Reading export presets from: ${presetsPath}`);

    const content = readFileSync(presetsPath, 'utf-8');
    const presets = parseExportPresets(content);

    // Sort by index for consistent ordering
    presets.sort((a, b) => a.index - b.index);

    const result: ListExportPresetsResult = {
      projectPath: typedArgs.projectPath,
      presetsFile: 'export_presets.cfg',
      count: presets.length,
      presets,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to read export presets: ${errorMessage}`, [
      'Ensure the project path is correct',
      'Check that export_presets.cfg is readable',
    ]);
  }
};
