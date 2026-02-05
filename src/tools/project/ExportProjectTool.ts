/**
 * Export Project Tool
 * Exports a Godot project to various platforms
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug } from '../../utils/Logger.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import {
  ExportProjectSchema,
  ExportProjectInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const exportProjectDefinition: ToolDefinition = {
  name: 'export_project',
  description: 'Export a Godot project to a specified platform preset',
  inputSchema: toMcpSchema(ExportProjectSchema),
};

export const handleExportProject = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ExportProjectSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, preset, and outputPath',
      'Preset must match a name in export_presets.cfg',
    ]);
  }

  const typedArgs: ExportProjectInput = validation.data;

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

    // Build export arguments
    const args = [
      '--headless',
      '--path',
      typedArgs.projectPath,
      exportFlag,
      typedArgs.preset,
      outputPath,
    ];

    logDebug(`Executing via ProcessPool: ${godotPath} ${args.join(' ')}`);

    const pool = getGodotPool();
    const result = await pool.execute(godotPath, args, {
      cwd: typedArgs.projectPath,
      timeout: 300000, // 5 minute timeout for exports
    });

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';

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

    // Non-zero exit code indicates failure
    if (result.exitCode !== 0) {
      return createErrorResponse(`Export failed: ${stderr || stdout}`, [
        'Check the Godot console output for details',
        'Verify export preset configuration',
        'Ensure export templates are installed',
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
