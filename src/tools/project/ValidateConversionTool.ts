/**
 * Validate Conversion Tool
 * Validates if a Godot 3.x project can be converted to 4.x without actually converting
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug } from '../../utils/Logger.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  ValidateConversionSchema,
  ValidateConversionInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface ConversionIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

export interface ValidateConversionResult {
  sourcePath: string;
  canConvert: boolean;
  godotVersion: string;
  errorCount: number;
  warningCount: number;
  issues: ConversionIssue[];
  summary: string;
}

export const validateConversionDefinition: ToolDefinition = {
  name: 'validate_conversion_3to4',
  description: 'Validate if a Godot 3.x project can be converted to 4.x without actually converting',
  inputSchema: toMcpSchema(ValidateConversionSchema),
};

/**
 * Parse conversion validation output for issues
 */
function parseValidationOutput(output: string): ConversionIssue[] {
  const issues: ConversionIssue[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Look for error patterns
    const errorMatch = trimmed.match(/(?:ERROR|Error):\s*(.+)/i);
    if (errorMatch) {
      // Try to extract file/line info
      const fileMatch = errorMatch[1].match(/(?:res:\/\/)?([^:]+):(\d+)/);
      issues.push({
        type: 'error',
        message: errorMatch[1],
        file: fileMatch ? fileMatch[1] : undefined,
        line: fileMatch ? parseInt(fileMatch[2], 10) : undefined,
      });
      continue;
    }

    // Look for warning patterns
    const warningMatch = trimmed.match(/(?:WARNING|Warning):\s*(.+)/i);
    if (warningMatch) {
      const fileMatch = warningMatch[1].match(/(?:res:\/\/)?([^:]+):(\d+)/);
      issues.push({
        type: 'warning',
        message: warningMatch[1],
        file: fileMatch ? fileMatch[1] : undefined,
        line: fileMatch ? parseInt(fileMatch[2], 10) : undefined,
      });
      continue;
    }

    // Look for conversion-specific messages
    if (
      trimmed.includes('cannot be converted') ||
      trimmed.includes('not supported') ||
      trimmed.includes('deprecated')
    ) {
      issues.push({
        type: 'warning',
        message: trimmed,
      });
    }
  }

  return issues;
}

export const handleValidateConversion = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ValidateConversionSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide the path to the Godot 3.x project',
    ]);
  }

  const typedArgs: ValidateConversionInput = validation.data;

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
        'Note: Validation requires Godot 4.x',
      ]);
    }

    // Get Godot version
    const pool = getGodotPool();
    const versionResult = await pool.execute(godotPath, ['--version'], { timeout: 10000 });
    const godotVersion = versionResult.stdout.trim();

    logDebug(`Validating conversion for: ${typedArgs.sourcePath}`);

    // Run validation with --validate-conversion-3to4
    const args = [
      '--headless',
      '--path',
      typedArgs.sourcePath,
      '--validate-conversion-3to4',
    ];

    logDebug(`Executing via ProcessPool: ${godotPath} ${args.join(' ')}`);

    const result = await pool.execute(godotPath, args, {
      cwd: typedArgs.sourcePath,
      timeout: 300000, // 5 minute timeout
    });

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const combinedOutput = stdout + '\n' + stderr;

    // Parse issues from output
    const issues = parseValidationOutput(combinedOutput);
    const errorCount = issues.filter((i) => i.type === 'error').length;
    const warningCount = issues.filter((i) => i.type === 'warning').length;

    // Determine if conversion is possible
    const canConvert = result.exitCode === 0 && errorCount === 0;

    // Generate summary
    let summary: string;
    if (canConvert) {
      summary = warningCount > 0
        ? `Project can be converted with ${warningCount} warning(s). Review warnings before converting.`
        : 'Project can be converted to Godot 4.x without issues.';
    } else {
      summary = `Project has ${errorCount} error(s) that must be fixed before conversion.`;
    }

    const validationResult: ValidateConversionResult = {
      sourcePath: typedArgs.sourcePath,
      canConvert,
      godotVersion,
      errorCount,
      warningCount,
      issues,
      summary,
    };

    return createJsonResponse(validationResult);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to validate conversion: ${errorMessage}`, [
      'Ensure Godot 4.x is installed',
      'Check the source project is valid',
    ]);
  }
};
