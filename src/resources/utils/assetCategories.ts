/**
 * Asset Categories
 * Shared asset category definitions and helpers
 *
 * @module resources/utils/assetCategories
 */

/**
 * Asset categories and their file extensions
 */
export const ASSET_CATEGORIES: Record<string, string[]> = {
  images: ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.bmp', '.tga'],
  audio: ['.wav', '.ogg', '.mp3', '.flac'],
  models: ['.glb', '.gltf', '.obj', '.fbx', '.dae', '.blend'],
  fonts: ['.ttf', '.otf', '.woff', '.woff2', '.fnt'],
  shaders: ['.gdshader', '.shader'],
  resources: ['.tres', '.res'],
  scenes: ['.tscn', '.scn'],
  scripts: ['.gd'],
  data: ['.json', '.xml', '.csv', '.txt'],
};

/**
 * Get all asset extensions
 */
export function getAllAssetExtensions(): string[] {
  return Object.values(ASSET_CATEGORIES).flat();
}

/**
 * Get category for a file extension
 */
export function getCategoryForExtension(ext: string): string {
  const lowerExt = ext.toLowerCase();
  for (const [category, extensions] of Object.entries(ASSET_CATEGORIES)) {
    if (extensions.includes(lowerExt)) {
      return category;
    }
  }
  return 'other';
}

/**
 * Get extensions for a category
 */
export function getExtensionsForCategory(category: string): string[] | undefined {
  return ASSET_CATEGORIES[category];
}

/**
 * Check if category exists
 */
export function isValidCategory(category: string): boolean {
  return category in ASSET_CATEGORIES;
}

/**
 * Get all category names
 */
export function getCategoryNames(): string[] {
  return Object.keys(ASSET_CATEGORIES);
}
