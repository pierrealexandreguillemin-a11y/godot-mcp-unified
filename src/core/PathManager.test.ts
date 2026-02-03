/**
 * PathManager Unit Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for path validation, normalization, and Godot executable detection
 */

import { jest } from '@jest/globals';

// Mock dependencies before imports
jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn(),
}));

jest.unstable_mockModule('../utils/Logger', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

jest.unstable_mockModule('./LruCache', () => {
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      totalEntries: 0,
      expiredEntries: 0,
      validEntries: 0,
      maxSize: 100,
      ttlMs: 600000,
    }),
  };
  return {
    LruCache: jest.fn().mockImplementation(() => mockCache),
    __mockCache: mockCache,
  };
});

jest.unstable_mockModule('./ProcessPool.js', () => ({
  getGodotPool: jest.fn().mockReturnValue({
    execute: jest.fn(),
  }),
}));

const { existsSync } = await import('fs');
const {
  validatePath,
  normalizePath,
  isValidGodotPathSync,
  isValidGodotPath,
  getPlatformGodotPaths,
  detectGodotPath,
  normalizeHandlerPaths,
  clearPathCache,
  getPathCacheStats,
} = await import('./PathManager.js');
const { getGodotPool } = await import('./ProcessPool.js');
const lruCacheModule = await import('./LruCache');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockGetGodotPool = getGodotPool as jest.MockedFunction<typeof getGodotPool>;
const mockCache = (lruCacheModule as unknown as { __mockCache: { get: jest.Mock; set: jest.Mock; clear: jest.Mock; getStats: jest.Mock } }).__mockCache;

describe('PathManager', () => {
  const originalPlatform = process.platform;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cache mock defaults
    mockCache.get.mockReturnValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    process.env = { ...originalEnv };
  });

  describe('validatePath', () => {
    it('should return false for empty string', () => {
      expect(validatePath('')).toBe(false);
    });

    it('should return false for null-like input', () => {
      expect(validatePath(null as unknown as string)).toBe(false);
      expect(validatePath(undefined as unknown as string)).toBe(false);
    });

    it('should return false for path containing ".."', () => {
      expect(validatePath('/project/../etc/passwd')).toBe(false);
      expect(validatePath('..\\secret')).toBe(false);
      expect(validatePath('a/b/../c')).toBe(false);
    });

    it('should return true for valid absolute path', () => {
      expect(validatePath('/home/user/project')).toBe(true);
      expect(validatePath('C:\\Users\\user\\project')).toBe(true);
    });

    it('should return true for valid relative path without traversal', () => {
      expect(validatePath('src/main.gd')).toBe(true);
      expect(validatePath('scenes/level1.tscn')).toBe(true);
    });

    it('should handle URL-encoded paths by decoding them', () => {
      expect(validatePath('/project/my%20file.gd')).toBe(true);
    });

    it('should handle paths where decoding fails gracefully', () => {
      // %ZZ is invalid percent-encoding and will throw on decodeURIComponent
      // The function should catch and continue
      expect(validatePath('/project/%ZZfile.gd')).toBe(true);
    });

    it('should return false for path traversal even with URL encoding', () => {
      // ".." before decoding
      expect(validatePath('/project/..%2Fetc')).toBe(false);
    });

    it('should return true for simple file names', () => {
      expect(validatePath('file.gd')).toBe(true);
    });

    it('should return true for paths with dots in filenames', () => {
      expect(validatePath('/project/my.file.name.gd')).toBe(true);
    });
  });

  describe('normalizePath', () => {
    it('should return empty string for empty input', () => {
      expect(normalizePath('')).toBe('');
    });

    it('should return falsy value for null-like input', () => {
      expect(normalizePath(null as unknown as string)).toBe(null);
      expect(normalizePath(undefined as unknown as string)).toBe(undefined);
    });

    it('should decode URL-encoded paths', () => {
      const result = normalizePath('/project/my%20file.gd');
      expect(result).toContain('my file.gd');
    });

    it('should handle failed decoding gracefully', () => {
      // %ZZ is invalid, should continue with original path
      const result = normalizePath('/project/%ZZfile.gd');
      expect(result).toBeDefined();
    });

    it('should handle Windows drive letter paths on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const result = normalizePath('C:/Users/test/project');
      expect(result).toContain('C:');
    });

    it('should fix URL-encoded colon in Windows paths', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const result = normalizePath('/c%3A/Users/test');
      // Should convert /c%3A/ -> c:/
      expect(result).toMatch(/[cC]:/);
    });

    it('should fix leading slash before Windows drive letter', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const result = normalizePath('/C:/Users/test');
      expect(result).toMatch(/^[cC]:/);
    });

    it('should convert forward slashes to backslashes for Windows drive paths', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const result = normalizePath('C:/Users/test/project');
      expect(result).toContain('\\');
    });

    it('should normalize paths using Node.js path.normalize', async () => {
      // On the actual platform, normalize will use native separators
      const { normalize } = await import('path');
      const result = normalizePath('/home/user/project');
      expect(result).toBe(normalize('/home/user/project'));
    });

    it('should normalize redundant separators', async () => {
      const { normalize } = await import('path');
      const result = normalizePath('/home//user///project');
      expect(result).toBe(normalize('/home/user/project'));
    });
  });

  describe('isValidGodotPathSync', () => {
    it('should return true for "godot" command (assumed in PATH)', () => {
      const result = isValidGodotPathSync('godot');
      expect(result).toBe(true);
    });

    it('should return true when file exists', () => {
      mockExistsSync.mockReturnValue(true);

      const result = isValidGodotPathSync('/usr/bin/godot');

      expect(result).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith('/usr/bin/godot');
    });

    it('should return false when file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = isValidGodotPathSync('/nonexistent/godot');

      expect(result).toBe(false);
    });

    it('should return false when existsSync throws', () => {
      mockExistsSync.mockImplementation(() => { throw new Error('Access denied'); });

      const result = isValidGodotPathSync('/protected/godot');

      expect(result).toBe(false);
    });
  });

  describe('isValidGodotPath', () => {
    it('should return cached result when available (true)', async () => {
      mockCache.get.mockReturnValue(true);

      const result = await isValidGodotPath('/usr/bin/godot');

      expect(result).toBe(true);
      expect(mockExistsSync).not.toHaveBeenCalled();
    });

    it('should return cached result when available (false)', async () => {
      mockCache.get.mockReturnValue(false);

      const result = await isValidGodotPath('/nonexistent/godot');

      expect(result).toBe(false);
    });

    it('should return false and cache when path does not exist', async () => {
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(false);

      const result = await isValidGodotPath('/nonexistent/godot');

      expect(result).toBe(false);
      expect(mockCache.set).toHaveBeenCalledWith('/nonexistent/godot', false);
    });

    it('should skip existence check for "godot" command', async () => {
      mockCache.get.mockReturnValue(undefined);
      const mockPool = { execute: jest.fn().mockResolvedValue({ stdout: '4.2.0' } as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const result = await isValidGodotPath('godot');

      expect(result).toBe(true);
      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith('godot', true);
    });

    it('should validate by executing --version via ProcessPool', async () => {
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(true);
      const mockPool = { execute: jest.fn().mockResolvedValue({ stdout: '4.2.0' } as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const result = await isValidGodotPath('/usr/bin/godot');

      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith('/usr/bin/godot', ['--version'], { timeout: 10000 });
      expect(mockCache.set).toHaveBeenCalledWith('/usr/bin/godot', true);
    });

    it('should return false and cache when execution fails', async () => {
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(true);
      const mockPool = { execute: jest.fn().mockRejectedValue(new Error('Command failed') as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const result = await isValidGodotPath('/invalid/binary');

      expect(result).toBe(false);
      expect(mockCache.set).toHaveBeenCalledWith('/invalid/binary', false);
    });
  });

  describe('getPlatformGodotPaths', () => {
    it('should always include "godot" as the first entry', () => {
      const paths = getPlatformGodotPaths();
      expect(paths[0]).toBe('godot');
    });

    it('should include macOS-specific paths on darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const paths = getPlatformGodotPaths();

      expect(paths.some(p => p.includes('/Applications/Godot.app'))).toBe(true);
      expect(paths.some(p => p.includes('Contents/MacOS/Godot'))).toBe(true);
    });

    it('should include Windows-specific paths on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const paths = getPlatformGodotPaths();

      expect(paths.some(p => p.includes('Program Files'))).toBe(true);
      expect(paths.some(p => p.includes('Godot.exe'))).toBe(true);
    });

    it('should include Linux-specific paths on linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const paths = getPlatformGodotPaths();

      expect(paths.some(p => p.includes('/usr/bin/godot'))).toBe(true);
      expect(paths.some(p => p.includes('/usr/local/bin/godot'))).toBe(true);
      expect(paths.some(p => p.includes('/snap/bin/godot'))).toBe(true);
    });

    it('should include HOME-based paths on darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env.HOME = '/Users/testuser';

      const paths = getPlatformGodotPaths();

      expect(paths.some(p => p.includes('/Users/testuser'))).toBe(true);
    });

    it('should include USERPROFILE-based paths on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.USERPROFILE = 'C:\\Users\\testuser';

      const paths = getPlatformGodotPaths();

      expect(paths.some(p => p.includes('C:\\Users\\testuser'))).toBe(true);
    });

    it('should include HOME-based paths on linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.HOME = '/home/testuser';

      const paths = getPlatformGodotPaths();

      expect(paths.some(p => p.includes('/home/testuser'))).toBe(true);
    });
  });

  describe('detectGodotPath', () => {
    it('should use custom path when valid', async () => {
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(true);
      const mockPool = { execute: jest.fn().mockResolvedValue({ stdout: '4.2.0' } as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const result = await detectGodotPath('/custom/godot');

      expect(result).toBeDefined();
      expect(result).toContain('godot');
    });

    it('should skip invalid custom path and try env variable', async () => {
      mockCache.get.mockReturnValue(undefined);
      // First call for custom path - not found; second for env var - found
      let callCount = 0;
      mockExistsSync.mockImplementation(() => {
        callCount++;
        return callCount > 1;
      });
      const mockPool = { execute: jest.fn().mockResolvedValue({ stdout: '4.2.0' } as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);
      process.env.GODOT_PATH = '/env/godot';

      const result = await detectGodotPath('/invalid/godot');

      expect(result).toBeDefined();
    });

    it('should check GODOT_PATH environment variable', async () => {
      mockCache.get.mockReturnValue(undefined);
      process.env.GODOT_PATH = '/env/godot';
      mockExistsSync.mockReturnValue(true);
      const mockPool = { execute: jest.fn().mockResolvedValue({ stdout: '4.2.0' } as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const result = await detectGodotPath();

      expect(result).toBeDefined();
    });

    it('should return null in strict mode when no valid path found', async () => {
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(false);
      delete process.env.GODOT_PATH;
      const mockPool = { execute: jest.fn().mockRejectedValue(new Error('not found') as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      // Suppress console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await detectGodotPath(undefined, true);

      expect(result).toBeNull();
      warnSpy.mockRestore();
    });

    it('should return default path in non-strict mode when no valid path found', async () => {
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(false);
      delete process.env.GODOT_PATH;
      const mockPool = { execute: jest.fn().mockRejectedValue(new Error('not found') as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await detectGodotPath(undefined, false);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      warnSpy.mockRestore();
    });

    it('should return platform-specific default path on win32', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(false);
      delete process.env.GODOT_PATH;
      const mockPool = { execute: jest.fn().mockRejectedValue(new Error('not found') as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await detectGodotPath(undefined, false);

      expect(result).toContain('Godot');
      warnSpy.mockRestore();
    });

    it('should return platform-specific default path on darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(false);
      delete process.env.GODOT_PATH;
      const mockPool = { execute: jest.fn().mockRejectedValue(new Error('not found') as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await detectGodotPath(undefined, false);

      expect(result).toContain('Godot');
      warnSpy.mockRestore();
    });

    it('should return platform-specific default path on linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      mockCache.get.mockReturnValue(undefined);
      mockExistsSync.mockReturnValue(false);
      delete process.env.GODOT_PATH;
      const mockPool = { execute: jest.fn().mockRejectedValue(new Error('not found') as never) };
      mockGetGodotPool.mockReturnValue(mockPool as unknown as ReturnType<typeof getGodotPool>);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await detectGodotPath(undefined, false);

      expect(result).toContain('godot');
      warnSpy.mockRestore();
    });
  });

  describe('normalizeHandlerPaths', () => {
    it('should return args unchanged when null', () => {
      const result = normalizeHandlerPaths(null as unknown as Record<string, unknown>);
      expect(result).toBeNull();
    });

    it('should return args unchanged when not an object', () => {
      const result = normalizeHandlerPaths('string' as unknown as Record<string, unknown>);
      expect(result).toBe('string');
    });

    it('should normalize projectPath', async () => {
      const { normalize } = await import('path');
      const args = { projectPath: '/home//user///project' };

      const result = normalizeHandlerPaths(args);

      expect(result.projectPath).toBe(normalize('/home/user/project'));
    });

    it('should normalize scenePath', async () => {
      const { normalize } = await import('path');
      const args = { scenePath: '/home//user///scene.tscn' };

      const result = normalizeHandlerPaths(args);

      expect(result.scenePath).toBe(normalize('/home/user/scene.tscn'));
    });

    it('should normalize all path keys', async () => {
      const { normalize } = await import('path');
      const pathKeys = [
        'projectPath', 'scenePath', 'nodePath', 'texturePath',
        'outputPath', 'newPath', 'filePath', 'directory', 'scriptPath',
      ];

      const args: Record<string, unknown> = {};
      for (const key of pathKeys) {
        args[key] = '/test//path';
      }

      const result = normalizeHandlerPaths(args);

      for (const key of pathKeys) {
        expect(result[key]).toBe(normalize('/test/path'));
      }
    });

    it('should not modify non-path keys', () => {
      const args = { projectPath: '/test//path', someOtherArg: 'unchanged', count: 42 };

      const result = normalizeHandlerPaths(args);

      expect(result.someOtherArg).toBe('unchanged');
      expect(result.count).toBe(42);
    });

    it('should skip non-string path values', () => {
      const args = { projectPath: 123, scenePath: null, nodePath: undefined };

      const result = normalizeHandlerPaths(args as unknown as Record<string, unknown>);

      expect(result.projectPath).toBe(123);
      expect(result.scenePath).toBeNull();
      expect(result.nodePath).toBeUndefined();
    });

    it('should skip falsy path values', () => {
      const args = { projectPath: '', scenePath: 'valid/path.tscn' };

      const result = normalizeHandlerPaths(args);

      expect(result.projectPath).toBe('');
    });

    it('should return a new object (not mutate input)', () => {
      const args = { projectPath: '/test//path' };

      const result = normalizeHandlerPaths(args);

      expect(result).not.toBe(args);
    });
  });

  describe('clearPathCache', () => {
    it('should call clear on the cache', () => {
      clearPathCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe('getPathCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = getPathCacheStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('expiredEntries');
      expect(stats).toHaveProperty('validEntries');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttlMs');
    });
  });
});
