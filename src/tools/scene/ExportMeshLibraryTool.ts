/**
 * Export Mesh Library Tool
 * Exports 3D scenes as MeshLibrary resources for GridMap usage
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  ExportMeshLibrarySchema,
  ExportMeshLibraryInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const exportMeshLibraryDefinition: ToolDefinition = {
  name: 'export_mesh_library',
  description: 'Export a 3D scene as a MeshLibrary resource for GridMap',
  inputSchema: toMcpSchema(ExportMeshLibrarySchema),
};

export const handleExportMeshLibrary = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ExportMeshLibrarySchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, and outputPath',
    ]);
  }

  const typedArgs: ExportMeshLibraryInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  logDebug(`Exporting MeshLibrary from scene: ${typedArgs.scenePath} to ${typedArgs.outputPath}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'export_mesh_library',
    {
      scene_path: typedArgs.scenePath.replace(/\\/g, '/'),
      output_path: typedArgs.outputPath.replace(/\\/g, '/'),
      mesh_item_names: (typedArgs as BaseToolArgs).meshItemNames,
    },
    async () => {
      // Fallback: traditional GodotExecutor method
      try {
        // Ensure Godot path is available
        const godotPath = await detectGodotPath();
        if (!godotPath) {
          return createErrorResponse('Could not find a valid Godot executable path', [
            'Ensure Godot is installed correctly',
            'Set GODOT_PATH environment variable to specify the correct path',
          ]);
        }

        // Prepare parameters for the operation
        const params: BaseToolArgs = {
          scenePath: typedArgs.scenePath,
          outputPath: typedArgs.outputPath,
        };

        // Add optional parameters
        const meshItemNames = (typedArgs as BaseToolArgs).meshItemNames;
        if (meshItemNames && Array.isArray(meshItemNames)) {
          params.meshItemNames = meshItemNames;
        }

        // Execute the operation
        const { stdout, stderr } = await executeOperation(
          'export_mesh_library',
          params,
          typedArgs.projectPath,
          godotPath,
        );

        if (stderr && stderr.includes('Failed to')) {
          return createErrorResponse(`Failed to export MeshLibrary: ${stderr}`, [
            'Check if the scene contains valid 3D meshes',
            'Ensure the output path is writable',
            'Verify the scene file is not corrupted',
          ]);
        }

        return createSuccessResponse(
          `MeshLibrary exported successfully: ${typedArgs.outputPath}\n\nOutput: ${stdout}`,
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to export MeshLibrary: ${errorMessage}`, [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]);
      }
    }
  );
};
