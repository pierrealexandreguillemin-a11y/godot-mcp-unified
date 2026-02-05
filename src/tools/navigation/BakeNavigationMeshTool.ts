/**
 * Bake Navigation Mesh Tool
 * Creates NavigationPolygon (2D) or NavigationMesh (3D) resources
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
import * as fs from 'fs-extra';
import * as path from 'path';
import { logDebug } from '../../utils/Logger.js';
import {
  BakeNavigationMeshSchema,
  BakeNavigationMeshInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const bakeNavigationMeshDefinition: ToolDefinition = {
  name: 'bake_navigation_mesh',
  description: 'Create a NavigationPolygon (2D) or NavigationMesh (3D) resource',
  inputSchema: toMcpSchema(BakeNavigationMeshSchema),
};

export const handleBakeNavigationMesh = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(BakeNavigationMeshSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and meshPath',
    ]);
  }

  const typedArgs: BakeNavigationMeshInput = validation.data;

  // Validate mesh path extension
  if (!typedArgs.meshPath.endsWith('.tres') && !typedArgs.meshPath.endsWith('.res')) {
    return createErrorResponse('Mesh path must end with .tres or .res', [
      'Example: navigation/nav_mesh.tres',
    ]);
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const is3D = typedArgs.is3D ?? false;
    const resourceType = is3D ? 'NavigationMesh' : 'NavigationPolygon';

    // Build resource content
    let meshContent = `[gd_resource type="${resourceType}" format=3]\n\n`;
    meshContent += '[resource]\n';

    if (is3D) {
      // NavigationMesh properties
      meshContent += `agent_radius = ${typedArgs.agentRadius ?? 0.5}\n`;
      meshContent += `agent_height = ${typedArgs.agentHeight ?? 1.5}\n`;
      meshContent += `agent_max_climb = ${typedArgs.agentMaxClimb ?? 0.25}\n`;
      meshContent += `agent_max_slope = ${typedArgs.agentMaxSlope ?? 45.0}\n`;
    } else {
      // NavigationPolygon properties - minimal default
      meshContent += 'vertices = PackedVector2Array()\n';
      meshContent += 'polygons = []\n';
      meshContent += 'outlines = []\n';
    }

    // Write mesh file
    const meshFullPath = path.join(typedArgs.projectPath, typedArgs.meshPath);
    const meshDir = path.dirname(meshFullPath);

    await fs.ensureDir(meshDir);
    await fs.writeFile(meshFullPath, meshContent, 'utf-8');

    logDebug(`Created ${resourceType} at ${typedArgs.meshPath}`);

    return createSuccessResponse(
      `${resourceType} created successfully at ${typedArgs.meshPath}\nAgent radius: ${typedArgs.agentRadius ?? 0.5}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create navigation mesh: ${errorMessage}`, [
      'Ensure the project path is accessible',
    ]);
  }
};
