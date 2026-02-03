/**
 * Setup Lightmapper Tool
 * Configures LightmapGI node in a scene and optionally bakes lightmaps
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity via TscnParser (parse → modify → serialize)
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logDebug } from '../../utils/Logger.js';
import {
  SetupLightmapperSchema,
  SetupLightmapperInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import {
  parseTscn,
  serializeTscn,
  TscnDocument,
  TscnNode,
  TscnValue,
  TscnFunctionCall,
} from '../../core/TscnParser.js';

export const setupLightmapperDefinition: ToolDefinition = {
  name: 'setup_lightmapper',
  description: 'Configure LightmapGI node in a scene for baked lighting, optionally trigger lightmap baking',
  inputSchema: toMcpSchema(SetupLightmapperSchema),
};

// Quality presets mapped to Godot LightmapGI quality enum values
const qualityMap: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  ultra: 3,
};

// Environment mode mapped to Godot LightmapGI environment_mode enum
const environmentModeMap: Record<string, number> = {
  disabled: 0,
  scene: 1,
  custom_sky: 2,
  custom_color: 3,
};

/**
 * Find LightmapGI node in parsed TSCN document
 */
function findLightmapGINode(doc: TscnDocument): TscnNode | undefined {
  return doc.nodes.find(n => n.type === 'LightmapGI');
}

/**
 * Build properties object for the LightmapGI node
 */
function buildLightmapProperties(args: SetupLightmapperInput): Record<string, TscnValue> {
  const props: Record<string, TscnValue> = {};

  props['quality'] = qualityMap[args.quality] ?? 1;
  props['bounces'] = args.bounces;
  props['use_denoiser'] = args.useDenoiser;
  props['directional'] = args.directional;
  props['interior'] = args.interior;

  if (args.maxTextureSize !== undefined) {
    props['max_texture_size'] = args.maxTextureSize;
  }

  if (args.environmentMode) {
    props['environment_mode'] = environmentModeMap[args.environmentMode] ?? 1;
  }

  if (args.environmentColor) {
    const c = args.environmentColor;
    const colorCall: TscnFunctionCall = {
      name: 'Color',
      args: [c.r, c.g, c.b, 1],
    };
    props['environment_custom_color'] = colorCall;
  }

  if (args.environmentEnergy !== undefined) {
    props['environment_custom_energy'] = args.environmentEnergy;
  }

  return props;
}

/**
 * Update or create LightmapGI node in parsed TSCN document
 * Uses proper AST manipulation instead of string parsing
 */
function updateDocumentWithLightmapGI(
  doc: TscnDocument,
  properties: Record<string, TscnValue>,
  createNode: boolean,
): { action: 'created' | 'updated' | 'skipped' } {
  const existingNode = findLightmapGINode(doc);

  if (existingNode) {
    // Update existing node properties (merge with existing)
    for (const [key, value] of Object.entries(properties)) {
      existingNode.properties[key] = value;
    }
    return { action: 'updated' };
  }

  if (!createNode) {
    return { action: 'skipped' };
  }

  // Create new LightmapGI node as child of root
  const newNode: TscnNode = {
    name: 'LightmapGI',
    type: 'LightmapGI',
    parent: '.',
    properties: properties,
  };

  doc.nodes.push(newNode);
  return { action: 'created' };
}

export const handleSetupLightmapper = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(SetupLightmapperSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and scenePath',
    ]);
  }

  const typedArgs: SetupLightmapperInput = validation.data;

  // Validate scene extension
  if (!typedArgs.scenePath.endsWith('.tscn')) {
    return createErrorResponse('Scene path must end with .tscn', [
      'Example: scenes/level.tscn',
    ]);
  }

  // Validate project path
  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Validate scene path
  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    // Read scene file
    const sceneFullPath = path.join(typedArgs.projectPath, typedArgs.scenePath);
    const tscnContent = await fs.readFile(sceneFullPath, 'utf-8');

    // Parse TSCN using proper parser (ISO/IEC 25010: parse → modify → serialize)
    const doc = parseTscn(tscnContent);

    // Build LightmapGI properties
    const properties = buildLightmapProperties(typedArgs);

    // Update document structure
    const { action } = updateDocumentWithLightmapGI(
      doc,
      properties,
      typedArgs.createNode,
    );

    if (action === 'skipped') {
      return createSuccessResponse(
        `LightmapGI node not found in ${typedArgs.scenePath} and createNode is false. No changes made.`,
      );
    }

    // Serialize back to TSCN format
    const updatedContent = serializeTscn(doc);

    // Write updated scene
    await fs.writeFile(sceneFullPath, updatedContent, 'utf-8');

    logDebug(`${action === 'created' ? 'Created' : 'Updated'} LightmapGI in ${typedArgs.scenePath}`);

    const configSummary = [
      `Quality: ${typedArgs.quality}`,
      `Bounces: ${typedArgs.bounces}`,
      `Denoiser: ${typedArgs.useDenoiser ? 'on' : 'off'}`,
      `Directional: ${typedArgs.directional ? 'on' : 'off'}`,
      `Interior: ${typedArgs.interior ? 'on' : 'off'}`,
    ];

    const warnings: string[] = [];

    // Phase 2: Bake lightmaps if requested
    if (typedArgs.bake) {
      const godotPath = await detectGodotPath();
      if (!godotPath) {
        warnings.push('Bake skipped: could not find Godot executable');
      } else {
        try {
          const pool = getGodotPool();
          const bakeArgs = [
            '--headless',
            '--path',
            typedArgs.projectPath,
            '--bake-lightmaps',
            typedArgs.scenePath,
          ];

          logDebug(`Baking lightmaps: ${godotPath} ${bakeArgs.join(' ')}`);

          const bakeResult = await pool.execute(godotPath, bakeArgs, {
            cwd: typedArgs.projectPath,
            timeout: typedArgs.bakeTimeout,
          });

          if (bakeResult.stderr && bakeResult.stderr.includes('Failed')) {
            warnings.push(`Bake warning: ${bakeResult.stderr.substring(0, 200)}`);
          } else {
            configSummary.push('Bake: completed');
          }
        } catch (bakeError: unknown) {
          const msg = bakeError instanceof Error ? bakeError.message : 'Unknown error';
          warnings.push(`Bake failed: ${msg}`);
        }
      }
    }

    let response = `LightmapGI ${action} in ${typedArgs.scenePath}\n${configSummary.join(', ')}`;

    if (warnings.length > 0) {
      response += `\nWarnings: ${warnings.join('; ')}`;
    }

    return createSuccessResponse(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to setup lightmapper: ${errorMessage}`, [
      'Ensure the scene file exists and is readable',
      'Check file permissions',
    ]);
  }
};
