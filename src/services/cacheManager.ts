/**
 * Cache Manager Service
 *
 * Manages caching operations using Cloudflare KV storage.
 * Provides methods for get, set, delete, and prefix-based deletion.
 *
 * **Validates Requirements**: 15.1, 15.2, 15.4
 */

export class CacheManager {
  constructor(private kv: KVNamespace) {}

  /**
   * Retrieve a cached value by key
   *
   * @param key - Cache key
   * @returns Parsed value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.kv) {
        console.warn('KV namespace not available, skipping cache get')
        return null
      }
      const value = await this.kv.get(key, 'text')
      if (value === null) {
        return null
      }
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Store a value in cache with optional TTL
   *
   * @param key - Cache key
   * @param value - Value to cache (will be JSON serialized)
   * @param ttl - Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (!this.kv) {
        console.warn('KV namespace not available, skipping cache set')
        return
      }
      const serialized = JSON.stringify(value)
      const options: KVNamespacePutOptions = {}

      if (ttl !== undefined && ttl > 0) {
        options.expirationTtl = ttl
      }

      await this.kv.put(key, serialized, options)
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      throw error
    }
  }

  /**
   * Delete a single cache entry
   *
   * @param key - Cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.kv) {
        console.warn('KV namespace not available, skipping cache delete')
        return
      }
      await this.kv.delete(key)
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
      throw error
    }
  }

  /**
   * Delete all cache entries with a given prefix
   *
   * @param prefix - Key prefix to match
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      if (!this.kv) {
        console.warn('KV namespace not available, skipping cache deleteByPrefix')
        return
      }
      const list = await this.kv.list({ prefix })

      // Delete all keys matching the prefix
      const deletePromises = list.keys.map((key) => this.kv.delete(key.name))
      await Promise.all(deletePromises)

      // Handle pagination if there are more keys
      let cursor = list.cursor
      while (cursor) {
        const nextList = await this.kv.list({ prefix, cursor })
        const nextDeletePromises = nextList.keys.map((key) => this.kv.delete(key.name))
        await Promise.all(nextDeletePromises)
        cursor = nextList.cursor
      }
    } catch (error) {
      console.error(`Cache deleteByPrefix error for prefix ${prefix}:`, error)
      throw error
    }
  }

  /**
   * Generate a consistent cache key from parts
   *
   * @param parts - Key components to join
   * @returns Generated cache key
   */
  generateKey(...parts: string[]): string {
    return parts.filter((p) => p !== undefined && p !== null && p !== '').join(':')
  }
}
