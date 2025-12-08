/**
 * Get Script Errors Tool
 * Validates GDScript files and returns compilation errors
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ExecError, GetScriptErrorsArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createJsonResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { logDebug } from '../../utils/Logger';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface ScriptError {
  file: string;
  line: number;
  column?: number;
  message: string;
  type: 'error' | 'warning';
}

export const getScriptErrorsDefinition: ToolDefinition = {
  name: 'get_script_errors',
  description: 'Validate GDScript files and get compilation errors',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      scriptPath: {
        type: 'string',
        description: 'Path to a specific script to check (optional, checks all if not provided)',
      },
    },
    required: ['projectPath'],
  },
};

const parseGodotOutput = (output: string): ScriptError[] => {
  const errors: ScriptError[] = [];
  const lines = output.split('\n');

  // Patterns for Godot error messages
  // Format: res://path/script.gd:LINE - Error message
  // Format: ERROR: res://path/script.gd:LINE:COL - Error message
  const errorPatterns = [
    /(?:ERROR:|error:)\s*(?:res:\/\/)?([^:]+):(\d+)(?::(\d+))?\s*[-:]\s*(.+)/i,
    /(?:res:\/\/)?([^:]+\.gd):(\d+)(?::(\d+))?\s*[-:]\s*(.+)/i,
    /SCRIPT ERROR:\s*(.+)/i,
    /Parse Error:\s*(.+)/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const pattern of errorPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        if (match[2]) {
          // Has line number
          errors.push({
            file: match[1],
            line: parseInt(match[2], 10),
            column: match[3] ? parseInt(match[3], 10) : undefined,
            message: match[4] || match[1],
            type: trimmed.toLowerCase().includes('warning') ? 'warning' : 'error',
          });
        } else {
          // General error message
          errors.push({
            file: 'unknown',
            line: 0,
            message: match[1],
            type: 'error',
          });
        }
        break;
      }
    }
  }

  return errors;
};

export const handleGetScriptErrors = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs = preparedArgs as GetScriptErrorsArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable',
      ]);
    }

    logDebug(`Checking script errors in: ${typedArgs.projectPath}`);

    // Run Godot in headless mode to check for script errors
    // The --check-only flag validates scripts without running
    // --headless runs without GUI
    // --quit exits after initialization
    // NOTE: --check-only has known limitations (GitHub issue #78587):
    //   - May not discover autoloads correctly
    //   - Can produce false positives for autoload-dependent scripts
    //   - Each script requires a new Godot instance
    const cmd = `"${godotPath}" --path "${typedArgs.projectPath}" --headless --check-only --quit 2>&1`;

    let stdout = '';
    let stderr = '';

    try {
      const result = await execAsync(cmd, {
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });
      stdout = result.stdout || '';
      stderr = result.stderr || '';
    } catch (execError: unknown) {
      // Godot returns non-zero exit code if there are errors
      const err = execError as ExecError;
      stdout = err.stdout || '';
      stderr = err.stderr || '';
    }

    const combinedOutput = stdout + '\n' + stderr;
    const errors = parseGodotOutput(combinedOutput);

    // Filter by specific script if provided
    let filteredErrors = errors;
    if (typedArgs.scriptPath) {
      const scriptName = typedArgs.scriptPath.replace(/\\/g, '/');
      filteredErrors = errors.filter(e =>
        e.file.includes(scriptName) || e.file === scriptName
      );
    }

    const errorCount = filteredErrors.filter(e => e.type === 'error').length;
    const warningCount = filteredErrors.filter(e => e.type === 'warning').length;

    return createJsonResponse({
      projectPath: typedArgs.projectPath,
      scriptPath: typedArgs.scriptPath || '(all scripts)',
      errorCount,
      warningCount,
      valid: errorCount === 0,
      errors: filteredErrors,
      rawOutput: combinedOutput.slice(0, 2000), // First 2000 chars of raw output
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to check script errors: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check the project path is valid',
    ]);
  }
};
