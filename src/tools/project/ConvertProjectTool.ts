/**
 * Convert Project Tool
 * Converts a Godot 3.x project to Godot 4.x format
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ExecError } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug } from '../../utils/Logger.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export interface ConvertProjectArgs extends BaseToolArgs {
  sourcePath: string;
  targetPath?: string;
  noConvertSign?: boolean;
}

export const convertProjectDefinition: ToolDefinition = {
  name: 'convert_3to4',
  description: 'Convert a Godot 3.x project to Godot 4.x format',
  inputSchema: {
    type: 'object',
    properties: {
      sourcePath: {
        type: 'string',
        description: 'Path to the Godot 3.x project directory',
      },
      targetPath: {
        type: 'string',
        description: 'Optional output path for converted project (default: converts in place)',
      },
      noConvertSign: {
        type: 'boolean',
        description: 'Skip conversion signature (default: false)',
      },
    },
    required: ['sourcePath'],
  },
};

export const handleConvertProject = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['sourcePath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide the path to the Godot 3.x project',
    ]);
  }

  const typedArgs = preparedArgs as ConvertProjectArgs;

  // Verify source project exists
  const projectGodotPath = join(typedArgs.sourcePath, 'project.godot');
  if (!existsSync(projectGodotPath)) {
    return createErrorResponse('Not a valid Godot project (project.godot not found)', [
      'Check the source path is correct',
      'Ensure it points to a Godot project directory',
    ]);
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find Godot 4.x executable', [
        'Ensure Godot 4.x is installed',
        'Set GODOT_PATH environment variable',
        'Note: Conversion requires Godot 4.x, not 3.x',
      ]);
    }

    logDebug(`Converting project at: ${typedArgs.sourcePath}`);

    // Build conversion command
    // Note: --convert-3to4 requires Godot 4.x and converts in place
    const cmdArgs: string[] = [
      `"${godotPath}"`,
      '--headless',
      '--path',
      `"${typedArgs.sourcePath}"`,
      '--convert-3to4',
    ];

    if (typedArgs.noConvertSign) {
      cmdArgs.push('--no-convert-sign');
    }

    const cmd = cmdArgs.join(' ') + ' 2>&1';

    logDebug(`Command: ${cmd}`);

    let stdout = '';
    let stderr = '';

    try {
      const result = await execAsync(cmd, {
        timeout: 600000, // 10 minute timeout for conversion
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer
      });
      stdout = result.stdout || '';
      stderr = result.stderr || '';
    } catch (execError: unknown) {
      const err = execError as ExecError;
      stdout = err.stdout || '';
      stderr = err.stderr || '';

      // Check for specific errors
      if (stdout.includes('already version 4') || stderr.includes('already version 4')) {
        return createErrorResponse('Project is already in Godot 4.x format', [
          'No conversion needed',
          'The project can be opened directly in Godot 4.x',
        ]);
      }

      if (err.code !== 0 && !stdout.includes('Conversion complete')) {
        return createErrorResponse(`Conversion failed: ${stderr || stdout}`, [
          'Check the project is a valid Godot 3.x project',
          'Review the error message for details',
          'Some manual fixes may be required after conversion',
        ]);
      }
    }

    // Check for conversion summary in output
    const conversionReport = extractConversionReport(stdout + '\n' + stderr);

    return createSuccessResponse(
      `Project conversion completed!\n` +
      `Source: ${typedArgs.sourcePath}\n` +
      `\n${conversionReport}\n\n` +
      `Note: Manual review recommended after conversion.\n` +
      `Some GDScript syntax and API changes may require manual fixes.`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to convert project: ${errorMessage}`, [
      'Ensure Godot 4.x is installed',
      'Check the source project is valid',
      'Try converting manually using Godot editor',
    ]);
  }
};

/**
 * Extract conversion report from Godot output
 */
function extractConversionReport(output: string): string {
  const lines: string[] = [];

  // Look for conversion statistics
  const fileMatch = output.match(/Converted (\d+) files?/i);
  if (fileMatch) {
    lines.push(`Files converted: ${fileMatch[1]}`);
  }

  const errorMatch = output.match(/(\d+) errors?/i);
  if (errorMatch) {
    lines.push(`Errors: ${errorMatch[1]}`);
  }

  const warningMatch = output.match(/(\d+) warnings?/i);
  if (warningMatch) {
    lines.push(`Warnings: ${warningMatch[1]}`);
  }

  // Look for specific conversion messages
  if (output.includes('GDScript')) {
    lines.push('GDScript files updated');
  }

  if (output.includes('tscn') || output.includes('scene')) {
    lines.push('Scene files updated');
  }

  if (output.includes('resource')) {
    lines.push('Resource files updated');
  }

  if (lines.length === 0) {
    return 'Conversion completed (no detailed report available)';
  }

  return lines.join('\n');
}
