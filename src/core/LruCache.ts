/**
 * LRU Cache with TTL (Time-To-Live)
 * High-performance cache for path validation and resource lookups
 *
 * ISO/IEC 25010 compliant - efficient, reliable, maintainable
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * LRU (Least Recently Used) Cache with Time-To-Live support
 */
export class LruCache<K, V> {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly cache: Map<K, CacheEntry<V>>;
  private readonly accessOrder: Map<K, number>;
  private accessCounter: number;

  /**
   * Create a new LRU cache
   * @param maxSize Maximum number of entries (default: 1000)
   * @param ttlMs Time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(maxSize: number = 1000, ttlMs: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
    this.accessOrder = new Map();
    this.accessCounter = 0;
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return undefined;
    }

    // Update access order (most recently used)
    this.accessOrder.set(key, ++this.accessCounter);

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V, customTtlMs?: number): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    const ttl = customTtlMs ?? this.ttlMs;
    const entry: CacheEntry<V> = {
      value,
      expiresAt: Date.now() + ttl,
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: K): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  /**
   * Get the current size of the cache (may include expired entries)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let validCount = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const [, entry] of this.cache) {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Remove all expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get or compute a value with a factory function
   * If the key exists and is valid, returns the cached value
   * Otherwise, computes the value using the factory and caches it
   */
  async getOrCompute(key: K, factory: () => Promise<V>, customTtlMs?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, customTtlMs);
    return value;
  }

  /**
   * Synchronous version of getOrCompute
   */
  getOrComputeSync(key: K, factory: () => V, customTtlMs?: number): V {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();
    this.set(key, value, customTtlMs);
    return value;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    // First, try to evict expired entries
    const pruned = this.prune();
    if (pruned > 0) {
      return;
    }

    // Find the least recently used entry
    let lruKey: K | undefined;
    let lruOrder = Infinity;

    for (const [key, order] of this.accessOrder) {
      if (order < lruOrder) {
        lruOrder = order;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }
}

export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  maxSize: number;
  ttlMs: number;
}

/**
 * Singleton caches for common use cases
 */

// Path validation cache (valid for 5 minutes)
export const pathValidationCache = new LruCache<string, boolean>(500, 5 * 60 * 1000);

// Godot path detection cache (valid for 30 minutes - rarely changes)
export const godotPathCache = new LruCache<string, string>(10, 30 * 60 * 1000);

// Project info cache (valid for 1 minute)
export const projectInfoCache = new LruCache<string, unknown>(100, 60 * 1000);

// Scene content cache (valid for 30 seconds)
export const sceneContentCache = new LruCache<string, string>(50, 30 * 1000);
