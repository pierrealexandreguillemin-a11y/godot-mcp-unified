/**
 * Validate Project Tool
 * Comprehensive validation of a Godot project
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
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug } from '../../utils/Logger.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import {
  ValidateProjectSchema,
  ValidateProjectInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
  projectInfo: {
    name: string;
    version?: string;
    godotVersion?: string;
    sceneCount: number;
    scriptCount: number;
    resourceCount: number;
    assetCount: number;
  };
}

export const validateProjectDefinition: ToolDefinition = {
  name: 'validate_project',
  description: 'Comprehensive validation of a Godot project (scripts, scenes, resources)',
  inputSchema: toMcpSchema(ValidateProjectSchema),
};

export const handleValidateProject = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ValidateProjectSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide the path to the Godot project',
    ]);
  }

  const typedArgs: ValidateProjectInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const checkScripts = typedArgs.checkScripts !== false;
  const checkScenes = typedArgs.checkScenes !== false;
  const checkResources = typedArgs.checkResources !== false;

  const issues: ValidationIssue[] = [];

  try {
    logDebug(`Validating project at: ${typedArgs.projectPath}`);

    // Parse project.godot
    const projectGodotPath = join(typedArgs.projectPath, 'project.godot');
    const projectContent = readFileSync(projectGodotPath, 'utf-8');

    const projectName = extractProjectSetting(projectContent, 'config/name') || 'Unknown';
    const godotVersion = extractProjectSetting(projectContent, 'config/features');

    // Scan project files
    const files = scanProjectFiles(typedArgs.projectPath);

    // Validate scripts with Godot
    if (checkScripts && files.scripts.length > 0) {
      const scriptIssues = await validateScripts(typedArgs.projectPath);
      issues.push(...scriptIssues);
    }

    // Validate scenes
    if (checkScenes) {
      const sceneIssues = validateScenes(typedArgs.projectPath, files.scenes);
      issues.push(...sceneIssues);
    }

    // Validate resources
    if (checkResources) {
      const resourceIssues = validateResources(typedArgs.projectPath, files);
      issues.push(...resourceIssues);
    }

    // Check for common issues
    const commonIssues = checkCommonIssues(typedArgs.projectPath, projectContent);
    issues.push(...commonIssues);

    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const infoCount = issues.filter(i => i.type === 'info').length;

    const result: ValidationResult = {
      valid: errorCount === 0,
      errorCount,
      warningCount,
      infoCount,
      issues,
      projectInfo: {
        name: projectName,
        godotVersion: godotVersion || undefined,
        sceneCount: files.scenes.length,
        scriptCount: files.scripts.length,
        resourceCount: files.resources.length,
        assetCount: files.assets.length,
      },
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to validate project: ${errorMessage}`, [
      'Ensure the project path is correct',
      'Check project.godot exists',
    ]);
  }
};

/**
 * Extract a setting from project.godot content
 */
function extractProjectSetting(content: string, key: string): string | null {
  const regex = new RegExp(`${key.replace('/', '\\/')}="([^"]*)"`, 'm');
  const match = content.match(regex);
  return match ? match[1] : null;
}

interface ProjectFiles {
  scenes: string[];
  scripts: string[];
  resources: string[];
  assets: string[];
}

/**
 * Scan project directory for files
 */
function scanProjectFiles(projectPath: string): ProjectFiles {
  const files: ProjectFiles = {
    scenes: [],
    scripts: [],
    resources: [],
    assets: [],
  };

  function scan(dir: string) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Skip hidden directories and .godot folder
      if (entry.startsWith('.') || entry === 'addons') {
        continue;
      }

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else {
        const ext = extname(entry).toLowerCase();
        const relativePath = fullPath.slice(projectPath.length + 1);

        switch (ext) {
          case '.tscn':
          case '.scn':
            files.scenes.push(relativePath);
            break;
          case '.gd':
            files.scripts.push(relativePath);
            break;
          case '.tres':
          case '.res':
            files.resources.push(relativePath);
            break;
          case '.png':
          case '.jpg':
          case '.jpeg':
          case '.svg':
          case '.wav':
          case '.ogg':
          case '.mp3':
          case '.ttf':
          case '.otf':
          case '.obj':
          case '.gltf':
          case '.glb':
          case '.fbx':
            files.assets.push(relativePath);
            break;
        }
      }
    }
  }

  scan(projectPath);
  return files;
}

/**
 * Validate scripts using Godot's --check-only via ProcessPool
 */
async function validateScripts(projectPath: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      issues.push({
        type: 'warning',
        category: 'scripts',
        message: 'Could not find Godot executable for script validation',
      });
      return issues;
    }

    const args = ['--headless', '--path', projectPath, '--check-only', '--quit'];
    logDebug(`Validating scripts via ProcessPool: ${godotPath} ${args.join(' ')}`);

    const pool = getGodotPool();
    const result = await pool.execute(godotPath, args, {
      cwd: projectPath,
      timeout: 60000,
    });

    const output = (result.stdout || '') + '\n' + (result.stderr || '');

    // Parse error output
    const errorLines = output.split('\n');
    for (const line of errorLines) {
      const errorMatch = line.match(/(?:ERROR|error):\s*(?:res:\/\/)?([^:]+):(\d+)(?::\d+)?\s*[-:]\s*(.+)/i);
      if (errorMatch) {
        issues.push({
          type: 'error',
          category: 'scripts',
          message: errorMatch[3].trim(),
          file: errorMatch[1],
          line: parseInt(errorMatch[2], 10),
        });
      }

      const warningMatch = line.match(/(?:WARNING|warning):\s*(?:res:\/\/)?([^:]+):(\d+)(?::\d+)?\s*[-:]\s*(.+)/i);
      if (warningMatch) {
        issues.push({
          type: 'warning',
          category: 'scripts',
          message: warningMatch[3].trim(),
          file: warningMatch[1],
          line: parseInt(warningMatch[2], 10),
        });
      }
    }
  } catch {
    issues.push({
      type: 'warning',
      category: 'scripts',
      message: 'Script validation failed',
    });
  }

  return issues;
}

/**
 * Validate scene files
 */
function validateScenes(projectPath: string, scenes: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const scenePath of scenes) {
    try {
      const fullPath = join(projectPath, scenePath);
      const content = readFileSync(fullPath, 'utf-8');

      // Check for broken resource references
      const extResMatches = content.matchAll(/path="(res:\/\/[^"]+)"/g);
      for (const match of extResMatches) {
        const resPath = match[1].replace('res://', '');
        const resFullPath = join(projectPath, resPath);

        if (!existsSync(resFullPath)) {
          issues.push({
            type: 'error',
            category: 'scenes',
            message: `Missing resource: ${resPath}`,
            file: scenePath,
          });
        }
      }

      // Check for empty scenes
      if (!content.includes('[node')) {
        issues.push({
          type: 'warning',
          category: 'scenes',
          message: 'Scene has no nodes',
          file: scenePath,
        });
      }
    } catch {
      issues.push({
        type: 'error',
        category: 'scenes',
        message: 'Failed to parse scene file',
        file: scenePath,
      });
    }
  }

  return issues;
}

/**
 * Validate resource references
 */
function validateResources(projectPath: string, files: ProjectFiles): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const resPath of files.resources) {
    try {
      const fullPath = join(projectPath, resPath);
      const content = readFileSync(fullPath, 'utf-8');

      // Check for external resource references
      const extResMatches = content.matchAll(/path="(res:\/\/[^"]+)"/g);
      for (const match of extResMatches) {
        const refPath = match[1].replace('res://', '');
        const refFullPath = join(projectPath, refPath);

        if (!existsSync(refFullPath)) {
          issues.push({
            type: 'error',
            category: 'resources',
            message: `Missing resource reference: ${refPath}`,
            file: resPath,
          });
        }
      }
    } catch {
      issues.push({
        type: 'warning',
        category: 'resources',
        message: 'Failed to parse resource file',
        file: resPath,
      });
    }
  }

  return issues;
}

/**
 * Check for common project issues
 */
function checkCommonIssues(projectPath: string, projectContent: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for main scene
  const mainScene = extractProjectSetting(projectContent, 'run/main_scene');
  if (!mainScene) {
    issues.push({
      type: 'warning',
      category: 'project',
      message: 'No main scene configured',
    });
  } else {
    const mainScenePath = join(projectPath, mainScene.replace('res://', ''));
    if (!existsSync(mainScenePath)) {
      issues.push({
        type: 'error',
        category: 'project',
        message: `Main scene not found: ${mainScene}`,
      });
    }
  }

  // Check for export presets
  const exportPresetsPath = join(projectPath, 'export_presets.cfg');
  if (!existsSync(exportPresetsPath)) {
    issues.push({
      type: 'info',
      category: 'project',
      message: 'No export presets configured',
    });
  }

  // Check for .gitignore
  const gitignorePath = join(projectPath, '.gitignore');
  if (!existsSync(gitignorePath)) {
    issues.push({
      type: 'info',
      category: 'project',
      message: 'No .gitignore file (recommended for version control)',
    });
  }

  return issues;
}
