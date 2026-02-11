/**
 * File system utilities
 * Provides file and directory operations
 *
 * ISO/IEC 5055 compliant - proper error logging
 */

import { existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { logDebug } from './Logger.js';
import { RESOURCE_LIMITS } from '../core/config.js';

export interface GodotProject {
  path: string;
  name: string;
}

/**
 * Check if a directory is a valid Godot project
 */
export const isGodotProject = (projectPath: string): boolean => {
  const projectFile = join(projectPath, 'project.godot');
  return existsSync(projectFile);
};

/**
 * Find Godot projects in a directory
 */
export const findGodotProjects = (directory: string, recursive: boolean, _depth: number = 0): GodotProject[] => {
  const maxDepth = RESOURCE_LIMITS.MAX_SCAN_DEPTH;
  if (_depth >= maxDepth) {
    return [];
  }

  const projects: GodotProject[] = [];

  try {
    // Check if the directory itself is a Godot project
    if (isGodotProject(directory)) {
      projects.push({
        path: directory,
        name: basename(directory),
      });
    }

    // Search subdirectories
    const entries = readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subdir = join(directory, entry.name);

        if (isGodotProject(subdir)) {
          projects.push({
            path: subdir,
            name: entry.name,
          });
        } else if (recursive) {
          const subProjects = findGodotProjects(subdir, true, _depth + 1);
          projects.push(...subProjects);
        }
      }
    }
  } catch (error) {
    // Log error for debugging - ISO 5055 RE-1001 compliance
    logDebug(`Error scanning directory ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return projects;
};

/**
 * Get project structure with file counts
 */
export const getProjectStructure = (
  projectPath: string,
): {
  scenes: number;
  scripts: number;
  assets: number;
  other: number;
} => {
  try {
    const structure = {
      scenes: 0,
      scripts: 0,
      assets: 0,
      other: 0,
    };

    const maxDepth = RESOURCE_LIMITS.MAX_SCAN_DEPTH;

    const scanDirectory = (currentPath: string, depth: number = 0) => {
      if (depth >= maxDepth) {
        return;
      }
      const entries = readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = join(currentPath, entry.name);

        if (entry.name.startsWith('.')) {
          continue;
        }

        if (entry.isDirectory()) {
          scanDirectory(entryPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = entry.name.split('.').pop()?.toLowerCase();

          if (ext === 'tscn') {
            structure.scenes++;
          } else if (ext === 'gd' || ext === 'gdscript' || ext === 'cs') {
            structure.scripts++;
          } else if (
            ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ttf', 'wav', 'mp3', 'ogg'].includes(ext || '')
          ) {
            structure.assets++;
          } else {
            structure.other++;
          }
        }
      }
    };

    scanDirectory(projectPath);
    return structure;
  } catch (error) {
    // Log error for debugging - ISO 5055 RE-1001 compliance
    logDebug(`Error getting project structure for ${projectPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      scenes: 0,
      scripts: 0,
      assets: 0,
      other: 0,
    };
  }
};
