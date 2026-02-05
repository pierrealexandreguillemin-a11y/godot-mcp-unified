/**
 * Get Script Errors Tool
 * Validates GDScript files and returns compilation errors
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
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug, logInfo } from '../../utils/Logger.js';
import { validateScript } from '../../bridge/index.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import {
  GetScriptErrorsSchema,
  GetScriptErrorsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

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
  inputSchema: toMcpSchema(GetScriptErrorsSchema),
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

  // Zod validation
  const validation = safeValidateInput(GetScriptErrorsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: GetScriptErrorsInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    // Try real-time validation via LSP/Bridge first (if a specific script is provided)
    if (typedArgs.scriptPath) {
      logDebug('Attempting real-time validation via LSP/Bridge...');
      const bridgeResult = await validateScript(typedArgs.projectPath, typedArgs.scriptPath);
      if (bridgeResult) {
        logInfo(`Script validated via ${bridgeResult.source}`);
        const errorCount = bridgeResult.errors.filter(e => e.type === 'error').length;
        const warningCount = bridgeResult.errors.filter(e => e.type === 'warning').length;
        return createJsonResponse({
          projectPath: typedArgs.projectPath,
          scriptPath: typedArgs.scriptPath,
          source: bridgeResult.source,
          errorCount,
          warningCount,
          valid: errorCount === 0,
          errors: bridgeResult.errors,
        });
      }
      logDebug('Real-time validation unavailable, falling back to CLI...');
    }

    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable',
        'For real-time validation: Run Godot with --lsp-port=6005 or enable MCP Bridge plugin',
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
    const args = ['--path', typedArgs.projectPath, '--headless', '--check-only', '--quit'];

    logDebug(`Executing via ProcessPool: ${godotPath} ${args.join(' ')}`);

    const pool = getGodotPool();
    const result = await pool.execute(godotPath, args, {
      cwd: typedArgs.projectPath,
      timeout: 30000,
    });

    // Godot returns non-zero exit code if there are errors, but we still want the output
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';

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
      source: 'cli',
      errorCount,
      warningCount,
      valid: errorCount === 0,
      errors: filteredErrors,
      rawOutput: combinedOutput.slice(0, 2000),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to check script errors: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check the project path is valid',
    ]);
  }
};
