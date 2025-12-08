/**
 * LRU Cache Unit Tests
 * ISO/IEC 25010 compliant test coverage
 */

import { jest } from '@jest/globals';
import { LruCache } from './LruCache.js';

describe('LruCache', () => {
  describe('basic operations', () => {
    it('should store and retrieve a value', () => {
      const cache = new LruCache<string, number>();

      cache.set('key1', 42);
      const value = cache.get('key1');

      expect(value).toBe(42);
    });

    it('should return undefined for non-existent key', () => {
      const cache = new LruCache<string, number>();

      const value = cache.get('nonexistent');

      expect(value).toBeUndefined();
    });

    it('should overwrite existing value', () => {
      const cache = new LruCache<string, number>();

      cache.set('key1', 42);
      cache.set('key1', 100);
      const value = cache.get('key1');

      expect(value).toBe(100);
    });

    it('should delete a key', () => {
      const cache = new LruCache<string, number>();

      cache.set('key1', 42);
      const deleted = cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      const cache = new LruCache<string, number>();

      const deleted = cache.delete('nonexistent');

      expect(deleted).toBe(false);
    });

    it('should clear all entries', () => {
      const cache = new LruCache<string, number>();

      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for existing key', () => {
      const cache = new LruCache<string, number>();

      cache.set('key1', 42);

      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      const cache = new LruCache<string, number>();

      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const cache = new LruCache<string, number>(100, 50); // 50ms TTL

      cache.set('key1', 42);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', async () => {
      const cache = new LruCache<string, number>(100, 1000); // 1s TTL

      cache.set('key1', 42);

      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(cache.get('key1')).toBe(42);
    });

    it('should support custom TTL per entry', async () => {
      const cache = new LruCache<string, number>(100, 1000);

      cache.set('key1', 42, 50); // Custom 50ms TTL

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should remove expired entries on has() check', async () => {
      const cache = new LruCache<string, number>(100, 50);

      cache.set('key1', 42);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when at capacity', () => {
      const cache = new LruCache<string, number>(3, 60000);

      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.set('key3', 3);
      cache.set('key4', 4); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe(2);
      expect(cache.get('key3')).toBe(3);
      expect(cache.get('key4')).toBe(4);
    });

    it('should update access order on get()', () => {
      const cache = new LruCache<string, number>(3, 60000);

      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.set('key3', 3);

      // Access key1, making it most recently used
      cache.get('key1');

      cache.set('key4', 4); // Should evict key2 (least recently used)

      expect(cache.get('key1')).toBe(1);
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe(3);
      expect(cache.get('key4')).toBe(4);
    });

    it('should evict expired entries first', async () => {
      const cache = new LruCache<string, number>(3, 50);

      cache.set('key1', 1);

      // Wait for first entry to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      cache.set('key2', 2, 60000); // Long TTL
      cache.set('key3', 3, 60000);
      cache.set('key4', 4, 60000); // Should evict expired key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe(2);
      expect(cache.get('key3')).toBe(3);
      expect(cache.get('key4')).toBe(4);
    });
  });

  describe('prune()', () => {
    it('should remove expired entries', async () => {
      const cache = new LruCache<string, number>(100, 50);

      cache.set('key1', 1);
      cache.set('key2', 2);

      await new Promise(resolve => setTimeout(resolve, 100));

      cache.set('key3', 3, 60000); // Long TTL

      const pruned = cache.prune();

      expect(pruned).toBe(2);
      expect(cache.size).toBe(1);
      expect(cache.get('key3')).toBe(3);
    });

    it('should return 0 when no expired entries', () => {
      const cache = new LruCache<string, number>(100, 60000);

      cache.set('key1', 1);

      const pruned = cache.prune();

      expect(pruned).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', async () => {
      const cache = new LruCache<string, number>(10, 50);

      cache.set('key1', 1);
      cache.set('key2', 2, 60000); // Long TTL

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(1);
      expect(stats.validEntries).toBe(1);
      expect(stats.maxSize).toBe(10);
      expect(stats.ttlMs).toBe(50);
    });
  });

  describe('getOrCompute()', () => {
    it('should return cached value if exists', async () => {
      const cache = new LruCache<string, number>();
      cache.set('key1', 42);

      const factory = jest.fn(() => Promise.resolve(100));
      const value = await cache.getOrCompute('key1', factory);

      expect(value).toBe(42);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should compute and cache value if not exists', async () => {
      const cache = new LruCache<string, number>();

      const factory = jest.fn(() => Promise.resolve(100));
      const value = await cache.getOrCompute('key1', factory);

      expect(value).toBe(100);
      expect(factory).toHaveBeenCalled();
      expect(cache.get('key1')).toBe(100);
    });
  });

  describe('getOrComputeSync()', () => {
    it('should return cached value if exists', () => {
      const cache = new LruCache<string, number>();
      cache.set('key1', 42);

      const factory = jest.fn(() => 100);
      const value = cache.getOrComputeSync('key1', factory);

      expect(value).toBe(42);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should compute and cache value if not exists', () => {
      const cache = new LruCache<string, number>();

      const factory = jest.fn(() => 100);
      const value = cache.getOrComputeSync('key1', factory);

      expect(value).toBe(100);
      expect(factory).toHaveBeenCalled();
      expect(cache.get('key1')).toBe(100);
    });
  });
});
