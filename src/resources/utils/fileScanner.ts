/**
 * File Scanner Utility
 * Shared file scanning functions for resource providers
 *
 * @module resources/utils/fileScanner
 */

import { readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

/**
 * File info returned by scanner
 */
export interface ScannedFile {
  path: string;
  relativePath: string;
  ext: string;
  size: number;
  modified: Date;
}

/**
 * Scanner options
 */
export interface ScannerOptions {
  maxDepth?: number;
  excludeDirs?: string[];
}

const DEFAULT_EXCLUDE_DIRS = ['.godot', 'addons'];

/**
 * Recursively find files with specific extensions
 */
export function findFiles(
  dir: string,
  extensions: string[],
  options: ScannerOptions = {}
): ScannedFile[] {
  const { maxDepth = 10, excludeDirs = DEFAULT_EXCLUDE_DIRS } = options;
  const files: ScannedFile[] = [];

  function scan(currentDir: string, depth: number): void {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        if (entry.startsWith('.') || excludeDirs.includes(entry)) continue;

        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath, depth + 1);
        } else {
          const ext = extname(entry).toLowerCase();
          if (extensions.length === 0 || extensions.includes(ext)) {
            files.push({
              path: fullPath,
              relativePath: relative(dir, fullPath).replace(/\\/g, '/'),
              ext,
              size: stat.size,
              modified: stat.mtime,
            });
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  scan(dir, 0);
  return files;
}

/**
 * Find files and return only paths (lighter version)
 */
export function findFilePaths(
  dir: string,
  extensions: string[],
  options: ScannerOptions = {}
): string[] {
  const { maxDepth = 10, excludeDirs = DEFAULT_EXCLUDE_DIRS } = options;
  const files: string[] = [];

  function scan(currentDir: string, depth: number): void {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        if (entry.startsWith('.') || excludeDirs.includes(entry)) continue;

        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath, depth + 1);
        } else if (extensions.includes(extname(entry).toLowerCase())) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  scan(dir, 0);
  return files;
}
