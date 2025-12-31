/**
 * Bake Navigation Mesh Tool
 * Creates NavigationPolygon (2D) or NavigationMesh (3D) resources
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logDebug } from '../../utils/Logger';

export interface BakeNavigationMeshArgs extends BaseToolArgs {
  projectPath: string;
  meshPath: string;
  is3D?: boolean;
  agentRadius?: number;
  agentHeight?: number;
  agentMaxClimb?: number;
  agentMaxSlope?: number;
}

export const bakeNavigationMeshDefinition: ToolDefinition = {
  name: 'bake_navigation_mesh',
  description: 'Create a NavigationPolygon (2D) or NavigationMesh (3D) resource',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      meshPath: {
        type: 'string',
        description: 'Path for the navigation mesh resource (e.g., "navigation/nav_mesh.tres")',
      },
      is3D: {
        type: 'boolean',
        description: 'Create 3D navigation mesh (default: false for 2D)',
      },
      agentRadius: {
        type: 'number',
        description: 'Agent radius for pathfinding (default: 0.5)',
      },
      agentHeight: {
        type: 'number',
        description: 'Agent height for 3D pathfinding (default: 1.5)',
      },
      agentMaxClimb: {
        type: 'number',
        description: 'Maximum climb height for 3D (default: 0.25)',
      },
      agentMaxSlope: {
        type: 'number',
        description: 'Maximum slope angle in degrees for 3D (default: 45)',
      },
    },
    required: ['projectPath', 'meshPath'],
  },
};

export const handleBakeNavigationMesh = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'meshPath',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath and meshPath',
    ]);
  }

  const typedArgs = preparedArgs as BakeNavigationMeshArgs;

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
