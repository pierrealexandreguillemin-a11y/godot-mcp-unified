/**
 * Export Project Tool
 * Exports a Godot project to various platforms
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ProjectToolArgs, ExecError } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug } from '../../utils/Logger.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const execAsync = promisify(exec);

export type ExportMode = 'release' | 'debug';

export interface ExportProjectArgs extends ProjectToolArgs {
  preset: string;
  outputPath: string;
  mode?: ExportMode;
}

export const exportProjectDefinition: ToolDefinition = {
  name: 'export_project',
  description: 'Export a Godot project to a specified platform preset',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      preset: {
        type: 'string',
        description: 'Export preset name (must be configured in export_presets.cfg)',
      },
      outputPath: {
        type: 'string',
        description: 'Output path for the exported project (relative to project or absolute)',
      },
      mode: {
        type: 'string',
        enum: ['release', 'debug'],
        description: 'Export mode (default: release)',
      },
    },
    required: ['projectPath', 'preset', 'outputPath'],
  },
};

export const handleExportProject = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'preset', 'outputPath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, preset, and outputPath',
      'Preset must match a name in export_presets.cfg',
    ]);
  }

  const typedArgs = preparedArgs as ExportProjectArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Check if export_presets.cfg exists
  const presetsPath = join(typedArgs.projectPath, 'export_presets.cfg');
  if (!existsSync(presetsPath)) {
    return createErrorResponse('No export_presets.cfg found in project', [
      'Open the project in Godot editor',
      'Go to Project > Export and configure at least one preset',
      'Save the preset configuration',
    ]);
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find Godot executable', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable',
      ]);
    }

    const mode = typedArgs.mode || 'release';
    const exportFlag = mode === 'debug' ? '--export-debug' : '--export-release';

    // Determine output path
    let outputPath = typedArgs.outputPath;
    if (!outputPath.includes(':') && !outputPath.startsWith('/')) {
      // Relative path - make it relative to project
      outputPath = join(typedArgs.projectPath, outputPath);
    }

    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    logDebug(`Exporting project to: ${outputPath}`);
    logDebug(`Using preset: ${typedArgs.preset}`);
    logDebug(`Mode: ${mode}`);

    // Build export command
    const cmd = `"${godotPath}" --headless --path "${typedArgs.projectPath}" ${exportFlag} "${typedArgs.preset}" "${outputPath}" 2>&1`;

    logDebug(`Command: ${cmd}`);

    let stdout = '';
    let stderr = '';

    try {
      const result = await execAsync(cmd, {
        timeout: 300000, // 5 minute timeout for exports
        maxBuffer: 1024 * 1024 * 50, // 50MB buffer
      });
      stdout = result.stdout || '';
      stderr = result.stderr || '';
    } catch (execError: unknown) {
      const err = execError as ExecError;
      stdout = err.stdout || '';
      stderr = err.stderr || '';

      // Check for common export errors
      if (stderr.includes('Invalid export preset') || stdout.includes('Invalid export preset')) {
        return createErrorResponse(`Export preset not found: ${typedArgs.preset}`, [
          'Check the preset name matches exactly (case-sensitive)',
          'Open export_presets.cfg to see available presets',
          'Create the preset in Godot editor if it does not exist',
        ]);
      }

      if (stderr.includes('No export template found') || stdout.includes('No export template found')) {
        return createErrorResponse('Export templates not installed', [
          'Download export templates from Godot website',
          'In Godot editor: Editor > Manage Export Templates',
          'Or run: godot --install-export-templates',
        ]);
      }

      // If exit code is 0, it's not really an error
      if (err.code !== 0) {
        return createErrorResponse(`Export failed: ${stderr || stdout}`, [
          'Check the Godot console output for details',
          'Verify export preset configuration',
          'Ensure export templates are installed',
        ]);
      }
    }

    // Verify export was created
    if (!existsSync(outputPath)) {
      return createErrorResponse('Export completed but output file not found', [
        'Check the output path is writable',
        'Verify the export preset is configured correctly',
        `Expected output at: ${outputPath}`,
      ]);
    }

    return createSuccessResponse(
      `Project exported successfully!\n` +
      `Preset: ${typedArgs.preset}\n` +
      `Mode: ${mode}\n` +
      `Output: ${outputPath}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to export project: ${errorMessage}`, [
      'Check Godot is installed correctly',
      'Verify export preset exists',
      'Ensure export templates are installed',
    ]);
  }
};
