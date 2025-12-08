/**
 * Export Pack Tool
 * Exports a Godot project as PCK or ZIP file (data only, no executable)
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ProjectToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug } from '../../utils/Logger.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import { existsSync, mkdirSync, statSync } from 'fs';
import { dirname, join, extname } from 'path';

export interface ExportPackArgs extends ProjectToolArgs {
  preset: string;
  outputPath: string;
}

export const exportPackDefinition: ToolDefinition = {
  name: 'export_pack',
  description: 'Export a Godot project as PCK or ZIP file (data only, faster than full export)',
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
        description: 'Output path for the pack file (.pck or .zip)',
      },
    },
    required: ['projectPath', 'preset', 'outputPath'],
  },
};

export const handleExportPack = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'preset', 'outputPath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, preset, and outputPath',
      'Output should end with .pck or .zip',
    ]);
  }

  const typedArgs = preparedArgs as ExportPackArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Validate output extension
  const ext = extname(typedArgs.outputPath).toLowerCase();
  if (ext !== '.pck' && ext !== '.zip') {
    return createErrorResponse('Output path must end with .pck or .zip', [
      'Use .pck for Godot pack file format',
      'Use .zip for zip archive format',
    ]);
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

    logDebug(`Exporting pack to: ${outputPath}`);
    logDebug(`Using preset: ${typedArgs.preset}`);

    // Build export arguments
    const cmdArgs = [
      '--headless',
      '--path',
      typedArgs.projectPath,
      '--export-pack',
      typedArgs.preset,
      outputPath,
    ];

    logDebug(`Executing via ProcessPool: ${godotPath} ${cmdArgs.join(' ')}`);

    const pool = getGodotPool();
    const result = await pool.execute(godotPath, cmdArgs, {
      cwd: typedArgs.projectPath,
      timeout: 180000, // 3 minute timeout (faster than full export)
    });

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';

    // Check for common errors
    if (stderr.includes('Invalid export preset') || stdout.includes('Invalid export preset')) {
      return createErrorResponse(`Export preset not found: ${typedArgs.preset}`, [
        'Check the preset name matches exactly (case-sensitive)',
        'Open export_presets.cfg to see available presets',
        'Create the preset in Godot editor if it does not exist',
      ]);
    }

    if (result.exitCode !== 0) {
      return createErrorResponse(`Pack export failed: ${stderr || stdout}`, [
        'Check the Godot console output for details',
        'Verify export preset configuration',
      ]);
    }

    // Verify export was created
    if (!existsSync(outputPath)) {
      return createErrorResponse('Export completed but output file not found', [
        'Check the output path is writable',
        'Verify the export preset is configured correctly',
        `Expected output at: ${outputPath}`,
      ]);
    }

    // Get file size
    const stats = statSync(outputPath);
    const sizeKB = Math.round(stats.size / 1024);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    return createSuccessResponse(
      `Pack exported successfully!\n` +
      `Preset: ${typedArgs.preset}\n` +
      `Output: ${outputPath}\n` +
      `Format: ${ext.slice(1).toUpperCase()}\n` +
      `Size: ${sizeKB > 1024 ? `${sizeMB} MB` : `${sizeKB} KB`}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to export pack: ${errorMessage}`, [
      'Check Godot is installed correctly',
      'Verify export preset exists',
    ]);
  }
};
