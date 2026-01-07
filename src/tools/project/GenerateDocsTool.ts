/**
 * Generate Docs Tool
 * Generates documentation for a Godot project
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
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug } from '../../utils/Logger.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  GenerateDocsSchema,
  GenerateDocsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const generateDocsDefinition: ToolDefinition = {
  name: 'generate_docs',
  description: 'Generate documentation for a Godot project using --doctool',
  inputSchema: toMcpSchema(GenerateDocsSchema),
};

export const handleGenerateDocs = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(GenerateDocsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide the path to the Godot project',
    ]);
  }

  const typedArgs: GenerateDocsInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find Godot executable', [
        'Ensure Godot is installed',
        'Set GODOT_PATH environment variable',
      ]);
    }

    // Determine output path
    const outputPath = typedArgs.outputPath || join(typedArgs.projectPath, 'docs');

    // Ensure output directory exists
    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true });
    }

    logDebug(`Generating documentation at: ${outputPath}`);

    // Build arguments - --doctool generates XML class documentation
    const args = ['--headless', '--path', typedArgs.projectPath, '--doctool', outputPath];

    logDebug(`Executing via ProcessPool: ${godotPath} ${args.join(' ')}`);

    const pool = getGodotPool();
    const result = await pool.execute(godotPath, args, {
      cwd: typedArgs.projectPath,
      timeout: 120000, // 2 minute timeout
    });

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';

    // doctool may return non-zero even on partial success
    if (result.exitCode !== 0 && !stdout.includes('Generating') && !existsSync(join(outputPath, 'classes'))) {
      return createErrorResponse(`Documentation generation failed: ${stderr || stdout}`, [
        'Check the project has documented classes',
        'Ensure scripts use ## doc comments',
        'Try running Godot with --verbose for more details',
      ]);
    }

    // Check what was generated
    const generatedFiles: string[] = [];

    if (existsSync(join(outputPath, 'classes'))) {
      generatedFiles.push('classes/');
    }

    if (existsSync(join(outputPath, 'index.xml'))) {
      generatedFiles.push('index.xml');
    }

    // Count XML files if classes folder exists
    let classCount = 0;
    const classesPath = join(outputPath, 'classes');
    if (existsSync(classesPath)) {
      const { readdirSync } = await import('fs');
      const files = readdirSync(classesPath);
      classCount = files.filter(f => f.endsWith('.xml')).length;
    }

    return createSuccessResponse(
      `Documentation generated successfully!\n` +
      `Project: ${typedArgs.projectPath}\n` +
      `Output: ${outputPath}\n` +
      `Classes documented: ${classCount}\n` +
      `\nGenerated files:\n${generatedFiles.map(f => `  - ${f}`).join('\n') || '  (none)'}\n\n` +
      `Tip: Use ## comments in GDScript to document your classes and methods.`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to generate docs: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check the project path is valid',
    ]);
  }
};
