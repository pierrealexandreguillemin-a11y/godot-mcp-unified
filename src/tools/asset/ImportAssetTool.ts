/**
 * Import Asset Tool
 * Copies an external file into the Godot project
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
import { logDebug } from '../../utils/Logger.js';
import { existsSync, copyFileSync, mkdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import {
  ImportAssetSchema,
  ImportAssetInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

// Supported asset extensions for import validation
const SUPPORTED_EXTENSIONS = new Set([
  // Textures
  '.png', '.jpg', '.jpeg', '.bmp', '.svg', '.webp', '.tga', '.exr', '.hdr',
  // Audio
  '.wav', '.ogg', '.mp3', '.flac',
  // 3D Models
  '.glb', '.gltf', '.obj', '.fbx', '.dae',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2',
]);

export const importAssetDefinition: ToolDefinition = {
  name: 'import_asset',
  description: 'Copy an external asset file into a Godot project. Godot will automatically import it on next scan.',
  inputSchema: toMcpSchema(ImportAssetSchema),
};

export const handleImportAsset = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ImportAssetSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, sourcePath, and destinationPath',
    ]);
  }

  const typedArgs: ImportAssetInput = validation.data;

  // Validate source file exists
  if (!existsSync(typedArgs.sourcePath)) {
    return createErrorResponse(`Source file not found: ${typedArgs.sourcePath}`, [
      'Ensure the source file path is correct and the file exists',
      'Use an absolute path for the source file',
    ]);
  }

  // Validate source is a file, not a directory
  const sourceStat = statSync(typedArgs.sourcePath);
  if (!sourceStat.isFile()) {
    return createErrorResponse('Source path must be a file, not a directory', [
      'Provide a path to a single file',
      'For multiple files, call import_asset multiple times',
    ]);
  }

  // Validate file extension is supported
  const ext = extname(typedArgs.sourcePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return createErrorResponse(`Unsupported file type: ${ext}`, [
      'Supported types: png, jpg, jpeg, bmp, svg, webp, tga, exr, hdr (textures)',
      'wav, ogg, mp3, flac (audio)',
      'glb, gltf, obj, fbx, dae (3D models)',
      'ttf, otf, woff, woff2 (fonts)',
    ]);
  }

  // Validate project path
  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Normalize destination path (remove leading res:// if present)
  let destPath = typedArgs.destinationPath;
  if (destPath.startsWith('res://')) {
    destPath = destPath.substring(6);
  }

  // Validate destination path doesn't escape project
  if (destPath.includes('..')) {
    return createErrorResponse('Destination path cannot contain ".."', [
      'Use a path relative to the project root',
      'Example: assets/sprites/player.png',
    ]);
  }

  const fullDestPath = join(typedArgs.projectPath, destPath);

  // Check if destination already exists
  if (existsSync(fullDestPath) && !typedArgs.overwrite) {
    return createErrorResponse(`Destination file already exists: ${destPath}`, [
      'Set overwrite: true to replace the existing file',
      'Or choose a different destination path',
    ]);
  }

  try {
    // Create destination directory if it doesn't exist
    const destDir = dirname(fullDestPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
      logDebug(`Created directory: ${destDir}`);
    }

    // Copy the file
    copyFileSync(typedArgs.sourcePath, fullDestPath);
    logDebug(`Copied ${typedArgs.sourcePath} to ${fullDestPath}`);

    return createSuccessResponse(
      `Asset imported: ${basename(typedArgs.sourcePath)} -> ${destPath} (${sourceStat.size} bytes). Godot will automatically import it on next project scan.`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to import asset: ${errorMessage}`, [
      'Check that you have write permissions to the destination',
      'Ensure there is enough disk space',
    ]);
  }
};
