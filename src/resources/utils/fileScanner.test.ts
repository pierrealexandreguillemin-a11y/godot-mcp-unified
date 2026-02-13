/**
 * File Scanner Unit Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for findFiles and findFilePaths with mocked filesystem
 *
 * Uses jest.unstable_mockModule + dynamic import for ESM compatibility.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// Mock functions at module scope
const mockReaddirSync = jest.fn<(...args: unknown[]) => string[]>();
const mockStatSync = jest.fn<(...args: unknown[]) => unknown>();

// Register mocks at TOP LEVEL (synchronous, ESM-compatible)
jest.unstable_mockModule('fs', () => ({
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
}));

// Type declarations for dynamically imported functions
let findFiles: typeof import('./fileScanner.js')['findFiles'];
let findFilePaths: typeof import('./fileScanner.js')['findFilePaths'];

beforeAll(async () => {
  const mod = await import('./fileScanner.js');
  findFiles = mod.findFiles;
  findFilePaths = mod.findFilePaths;
});

// Helper to create a mock stat object
function createMockStat(isDir: boolean, size = 1024, mtime = new Date('2024-01-01')) {
  return {
    isDirectory: () => isDir,
    isFile: () => !isDir,
    size,
    mtime,
  };
}

describe('fileScanner', () => {
  beforeEach(() => {
    mockReaddirSync.mockReset();
    mockStatSync.mockReset();
  });

  describe('findFiles', () => {
    it('should return empty array for empty directory', () => {
      mockReaddirSync.mockReturnValue([]);

      const result = findFiles('/project', ['.gd']);

      expect(result).toEqual([]);
    });

    it('should find files with matching extensions', () => {
      mockReaddirSync.mockReturnValue(['player.gd', 'enemy.gd', 'readme.txt']);
      mockStatSync.mockImplementation((_path: unknown) => {
        return createMockStat(false, 512, new Date('2024-06-01'));
      });

      const result = findFiles('/project', ['.gd']);

      expect(result).toHaveLength(2);
      expect(result[0].ext).toBe('.gd');
      expect(result[1].ext).toBe('.gd');
    });

    it('should return all files when extensions array is empty', () => {
      mockReaddirSync.mockReturnValue(['player.gd', 'icon.png']);
      mockStatSync.mockImplementation(() => createMockStat(false, 256));

      const result = findFiles('/project', []);

      expect(result).toHaveLength(2);
    });

    it('should recurse into subdirectories', () => {
      mockReaddirSync.mockImplementation((dir: unknown) => {
        const d = String(dir);
        if (d === '/project') return ['src', 'main.gd'];
        if (d.endsWith('src')) return ['player.gd'];
        return [];
      });
      mockStatSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.endsWith('src')) return createMockStat(true);
        return createMockStat(false, 100);
      });

      const result = findFiles('/project', ['.gd']);

      expect(result).toHaveLength(2);
    });

    it('should exclude default directories (.godot, addons)', () => {
      mockReaddirSync.mockReturnValue(['.godot', 'addons', 'main.gd']);
      mockStatSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.endsWith('.godot') || p.endsWith('addons')) return createMockStat(true);
        return createMockStat(false);
      });

      const result = findFiles('/project', ['.gd']);

      // .godot and addons should be skipped, only main.gd returned
      expect(result).toHaveLength(1);
    });

    it('should exclude custom directories', () => {
      mockReaddirSync.mockReturnValue(['build', 'main.gd']);
      mockStatSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.endsWith('build')) return createMockStat(true);
        return createMockStat(false);
      });

      const result = findFiles('/project', ['.gd'], { excludeDirs: ['build'] });

      expect(result).toHaveLength(1);
    });

    it('should skip entries starting with dot', () => {
      mockReaddirSync.mockReturnValue(['.git', '.hidden_file', 'main.gd']);
      mockStatSync.mockImplementation(() => createMockStat(false));

      const result = findFiles('/project', ['.gd']);

      expect(result).toHaveLength(1);
      expect(result[0].relativePath).toContain('main.gd');
    });

    it('should respect maxDepth option', () => {
      let callCount = 0;
      mockReaddirSync.mockImplementation(() => {
        callCount++;
        if (callCount > 5) return [];
        return ['sub'];
      });
      mockStatSync.mockImplementation(() => createMockStat(true));

      findFiles('/project', ['.gd'], { maxDepth: 2 });

      // Should stop recursing after maxDepth
      expect(callCount).toBeLessThanOrEqual(4);
    });

    it('should handle filesystem errors gracefully', () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = findFiles('/protected', ['.gd']);

      expect(result).toEqual([]);
    });

    it('should produce correct relativePath with forward slashes', () => {
      mockReaddirSync.mockReturnValue(['test.gd']);
      mockStatSync.mockReturnValue(createMockStat(false, 200, new Date('2024-03-15')));

      const result = findFiles('/project', ['.gd']);

      expect(result).toHaveLength(1);
      expect(result[0].relativePath).not.toContain('\\');
    });

    it('should include correct file metadata', () => {
      const mtime = new Date('2024-06-15T12:00:00Z');
      mockReaddirSync.mockReturnValue(['script.gd']);
      mockStatSync.mockReturnValue(createMockStat(false, 4096, mtime));

      const result = findFiles('/project', ['.gd']);

      expect(result).toHaveLength(1);
      expect(result[0].size).toBe(4096);
      expect(result[0].modified).toEqual(mtime);
      expect(result[0].ext).toBe('.gd');
    });

    it('should handle case-insensitive extension matching', () => {
      mockReaddirSync.mockReturnValue(['Script.GD', 'other.Gd']);
      mockStatSync.mockImplementation(() => createMockStat(false));

      const result = findFiles('/project', ['.gd']);

      expect(result).toHaveLength(2);
    });

    it('should handle deeply nested directory structures', () => {
      const dirs = ['a', 'b', 'c', 'd', 'e'];
      let depth = 0;
      mockReaddirSync.mockImplementation(() => {
        if (depth < dirs.length) {
          const entry = dirs[depth];
          depth++;
          return [entry];
        }
        return ['deep.gd'];
      });
      mockStatSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.endsWith('.gd')) return createMockStat(false);
        return createMockStat(true);
      });

      const result = findFiles('/project', ['.gd'], { maxDepth: 10 });

      expect(result).toHaveLength(1);
    });
  });

  describe('findFilePaths', () => {
    it('should return empty array for empty directory', () => {
      mockReaddirSync.mockReturnValue([]);

      const result = findFilePaths('/project', ['.gd']);

      expect(result).toEqual([]);
    });

    it('should return only file paths (not full ScannedFile objects)', () => {
      mockReaddirSync.mockReturnValue(['player.gd', 'enemy.gd']);
      mockStatSync.mockImplementation(() => createMockStat(false));

      const result = findFilePaths('/project', ['.gd']);

      expect(result).toHaveLength(2);
      result.forEach((p: string) => {
        expect(typeof p).toBe('string');
      });
    });

    it('should recurse into subdirectories', () => {
      mockReaddirSync.mockImplementation((dir: unknown) => {
        const d = String(dir);
        if (d === '/project') return ['scripts', 'main.gd'];
        if (d.endsWith('scripts')) return ['player.gd'];
        return [];
      });
      mockStatSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.endsWith('scripts')) return createMockStat(true);
        return createMockStat(false);
      });

      const result = findFilePaths('/project', ['.gd']);

      expect(result).toHaveLength(2);
    });

    it('should exclude default directories (.godot, addons)', () => {
      mockReaddirSync.mockReturnValue(['.godot', 'addons', 'main.gd']);
      mockStatSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.endsWith('.godot') || p.endsWith('addons')) return createMockStat(true);
        return createMockStat(false);
      });

      const result = findFilePaths('/project', ['.gd']);

      expect(result).toHaveLength(1);
    });

    it('should exclude custom directories', () => {
      mockReaddirSync.mockReturnValue(['temp', 'main.gd']);
      mockStatSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.endsWith('temp')) return createMockStat(true);
        return createMockStat(false);
      });

      const result = findFilePaths('/project', ['.gd'], { excludeDirs: ['temp'] });

      expect(result).toHaveLength(1);
    });

    it('should skip entries starting with dot', () => {
      mockReaddirSync.mockReturnValue(['.hidden', 'main.gd']);
      mockStatSync.mockImplementation(() => createMockStat(false));

      const result = findFilePaths('/project', ['.gd']);

      expect(result).toHaveLength(1);
    });

    it('should respect maxDepth option', () => {
      let callCount = 0;
      mockReaddirSync.mockImplementation(() => {
        callCount++;
        if (callCount > 5) return [];
        return ['sub'];
      });
      mockStatSync.mockImplementation(() => createMockStat(true));

      findFilePaths('/project', ['.gd'], { maxDepth: 2 });

      expect(callCount).toBeLessThanOrEqual(4);
    });

    it('should handle filesystem errors gracefully', () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = findFilePaths('/protected', ['.gd']);

      expect(result).toEqual([]);
    });

    it('should only include files with matching extensions (not all files)', () => {
      mockReaddirSync.mockReturnValue(['player.gd', 'icon.png', 'readme.md']);
      mockStatSync.mockImplementation(() => createMockStat(false));

      const result = findFilePaths('/project', ['.gd']);

      expect(result).toHaveLength(1);
    });

    it('should match multiple extensions', () => {
      mockReaddirSync.mockReturnValue(['player.gd', 'main.tscn', 'icon.png']);
      mockStatSync.mockImplementation(() => createMockStat(false));

      const result = findFilePaths('/project', ['.gd', '.tscn']);

      expect(result).toHaveLength(2);
    });

    it('should handle case-insensitive extension matching', () => {
      mockReaddirSync.mockReturnValue(['Script.GD', 'OTHER.Gd']);
      mockStatSync.mockImplementation(() => createMockStat(false));

      const result = findFilePaths('/project', ['.gd']);

      expect(result).toHaveLength(2);
    });
  });
});
