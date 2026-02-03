/**
 * Asset Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, PathSchema } from './common.js';

// ============================================================================
// Asset Tool Schemas
// ============================================================================

export const ImportAssetSchema = ProjectToolSchema.extend({
  sourcePath: z.string().min(1).describe('Absolute path to the source file to import'),
  destinationPath: PathSchema.describe('Destination path relative to project'),
  overwrite: z.boolean().default(false).describe('Overwrite if destination already exists'),
});

export const AssetCategorySchema = z.enum(['all', 'texture', 'audio', 'model', 'font']);

export const ListAssetsSchema = ProjectToolSchema.extend({
  directory: z.string().optional().describe('Subdirectory to search'),
  recursive: z.boolean().default(true).describe('Search recursively'),
  category: AssetCategorySchema.default('all').describe('Filter by asset category'),
});

export const ReimportMethodSchema = z.enum(['touch', 'delete_import']);

export const ReimportAssetsSchema = ProjectToolSchema.extend({
  assetPaths: z.array(z.string()).min(1).describe('Array of asset paths relative to project'),
  method: ReimportMethodSchema.default('touch').describe('Reimport method'),
});

// ============================================================================
// Type exports
// ============================================================================

export type ImportAssetInput = z.infer<typeof ImportAssetSchema>;
export type ListAssetsInput = z.infer<typeof ListAssetsSchema>;
export type ReimportAssetsInput = z.infer<typeof ReimportAssetsSchema>;
