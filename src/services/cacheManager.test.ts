import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CacheManager } from './cacheManager'

/**
 * Mock KV Namespace for testing
 */
class MockKVNamespace {
  private store = new Map<string, { value: string; expiration?: number }>()

  async get(key: string, type?: 'text'): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null

    // Check expiration
    if (entry.expiration && Date.now() > entry.expiration) {
      this.store.delete(key)
      return null
    }

    return entry.value
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: KVNamespacePutOptions
  ): Promise<void> {
    const stringValue = typeof value === 'string' ? value : String(value)
    const expiration = options?.expirationTtl
      ? Date.now() + options.expirationTtl * 1000
      : undefined

    this.store.set(key, { value: stringValue, expiration })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async list(options?: {
    prefix?: string
    cursor?: string
  }): Promise<{ keys: { name: string }[]; cursor?: string }> {
    const keys = Array.from(this.store.keys())
      .filter((k) => !options?.prefix || k.startsWith(options.prefix))
      .map((name) => ({ name }))

    return { keys, cursor: undefined }
  }

  // Unused methods for interface compliance
  getWithMetadata(): Promise<any> {
    throw new Error('Not implemented')
  }
}

describe('CacheManager', () => {
  let mockKV: KVNamespace
  let cacheManager: CacheManager

  beforeEach(() => {
    mockKV = new MockKVNamespace() as unknown as KVNamespace
    cacheManager = new CacheManager(mockKV)
  })

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await cacheManager.get('non-existent')
      expect(result).toBeNull()
    })

    it('should retrieve and parse cached value', async () => {
      const testData = { id: 1, name: 'Test' }
      await mockKV.put('test-key', JSON.stringify(testData))

      const result = await cacheManager.get<typeof testData>('test-key')
      expect(result).toEqual(testData)
    })

    it('should handle complex nested objects', async () => {
      const complexData = {
        channels: [{ id: 1, name: 'Channel 1', children: [{ id: 2, name: 'Child' }] }],
        metadata: { total: 1 },
      }
      await mockKV.put('complex-key', JSON.stringify(complexData))

      const result = await cacheManager.get('complex-key')
      expect(result).toEqual(complexData)
    })

    it('should return null on parse error', async () => {
      await mockKV.put('invalid-json', 'not valid json{')

      const result = await cacheManager.get('invalid-json')
      expect(result).toBeNull()
    })

    it('should handle arrays', async () => {
      const arrayData = [1, 2, 3, 4, 5]
      await mockKV.put('array-key', JSON.stringify(arrayData))

      const result = await cacheManager.get<number[]>('array-key')
      expect(result).toEqual(arrayData)
    })
  })

  describe('set', () => {
    it('should store value without TTL', async () => {
      const testData = { id: 1, name: 'Test' }
      await cacheManager.set('test-key', testData)

      const stored = await mockKV.get('test-key', 'text')
      expect(JSON.parse(stored!)).toEqual(testData)
    })

    it('should store value with TTL', async () => {
      const testData = { id: 1, name: 'Test' }
      await cacheManager.set('test-key', testData, 300)

      const stored = await mockKV.get('test-key', 'text')
      expect(JSON.parse(stored!)).toEqual(testData)
    })

    it('should handle primitive values', async () => {
      await cacheManager.set('string-key', 'test string')
      await cacheManager.set('number-key', 42)
      await cacheManager.set('boolean-key', true)

      expect(await cacheManager.get('string-key')).toBe('test string')
      expect(await cacheManager.get('number-key')).toBe(42)
      expect(await cacheManager.get('boolean-key')).toBe(true)
    })

    it('should handle null value', async () => {
      await cacheManager.set('null-key', null)

      expect(await cacheManager.get('null-key')).toBeNull()
    })

    it('should overwrite existing value', async () => {
      await cacheManager.set('test-key', { version: 1 })
      await cacheManager.set('test-key', { version: 2 })

      const result = await cacheManager.get('test-key')
      expect(result).toEqual({ version: 2 })
    })
  })

  describe('delete', () => {
    it('should delete existing key', async () => {
      await cacheManager.set('test-key', { data: 'test' })
      await cacheManager.delete('test-key')

      const result = await cacheManager.get('test-key')
      expect(result).toBeNull()
    })

    it('should not throw error when deleting non-existent key', async () => {
      await expect(cacheManager.delete('non-existent')).resolves.not.toThrow()
    })

    it('should delete multiple keys independently', async () => {
      await cacheManager.set('key1', 'value1')
      await cacheManager.set('key2', 'value2')

      await cacheManager.delete('key1')

      expect(await cacheManager.get('key1')).toBeNull()
      expect(await cacheManager.get('key2')).toBe('value2')
    })
  })

  describe('deleteByPrefix', () => {
    it('should delete all keys with matching prefix', async () => {
      await cacheManager.set('site:1:channels', [])
      await cacheManager.set('site:1:promos', [])
      await cacheManager.set('site:2:channels', [])

      await cacheManager.deleteByPrefix('site:1:')

      expect(await cacheManager.get('site:1:channels')).toBeNull()
      expect(await cacheManager.get('site:1:promos')).toBeNull()
      expect(await cacheManager.get('site:2:channels')).toEqual([])
    })

    it('should handle empty prefix match', async () => {
      await cacheManager.set('key1', 'value1')
      await cacheManager.deleteByPrefix('nonexistent:')

      expect(await cacheManager.get('key1')).toBe('value1')
    })

    it('should delete exact prefix match', async () => {
      await cacheManager.set('prefix', 'value')
      await cacheManager.set('prefix:key', 'value')

      await cacheManager.deleteByPrefix('prefix:')

      expect(await cacheManager.get('prefix')).toBe('value')
      expect(await cacheManager.get('prefix:key')).toBeNull()
    })

    it('should handle multiple levels of nesting', async () => {
      await cacheManager.set('app:site:1:channel:tree', {})
      await cacheManager.set('app:site:1:channel:list', [])
      await cacheManager.set('app:site:1:promo:active', [])
      await cacheManager.set('app:site:2:channel:tree', {})

      await cacheManager.deleteByPrefix('app:site:1:channel:')

      expect(await cacheManager.get('app:site:1:channel:tree')).toBeNull()
      expect(await cacheManager.get('app:site:1:channel:list')).toBeNull()
      expect(await cacheManager.get('app:site:1:promo:active')).toEqual([])
      expect(await cacheManager.get('app:site:2:channel:tree')).toEqual({})
    })
  })

  describe('generateKey', () => {
    it('should join parts with colon separator', () => {
      const key = cacheManager.generateKey('site', '1', 'channels')
      expect(key).toBe('site:1:channels')
    })

    it('should handle single part', () => {
      const key = cacheManager.generateKey('global')
      expect(key).toBe('global')
    })

    it('should handle many parts', () => {
      const key = cacheManager.generateKey('app', 'site', '1', 'channel', 'tree', 'v1')
      expect(key).toBe('app:site:1:channel:tree:v1')
    })

    it('should filter out empty strings', () => {
      const key = cacheManager.generateKey('site', '', '1', 'channels')
      expect(key).toBe('site:1:channels')
    })

    it('should filter out null and undefined', () => {
      const key = cacheManager.generateKey('site', null as any, '1', undefined as any, 'channels')
      expect(key).toBe('site:1:channels')
    })

    it('should handle numeric parts', () => {
      const key = cacheManager.generateKey('site', String(123), 'data')
      expect(key).toBe('site:123:data')
    })
  })

  describe('integration scenarios', () => {
    it('should handle cache invalidation workflow', async () => {
      // Set initial cache
      await cacheManager.set('site:1:channels', [{ id: 1, name: 'Channel 1' }])

      // Verify cache exists
      expect(await cacheManager.get('site:1:channels')).toHaveLength(1)

      // Invalidate cache
      await cacheManager.delete('site:1:channels')

      // Verify cache is cleared
      expect(await cacheManager.get('site:1:channels')).toBeNull()
    })

    it('should handle multi-site cache isolation', async () => {
      const site1Data = { channels: [{ id: 1 }] }
      const site2Data = { channels: [{ id: 2 }] }

      await cacheManager.set(cacheManager.generateKey('site', '1', 'channels'), site1Data)
      await cacheManager.set(cacheManager.generateKey('site', '2', 'channels'), site2Data)

      expect(await cacheManager.get('site:1:channels')).toEqual(site1Data)
      expect(await cacheManager.get('site:2:channels')).toEqual(site2Data)
    })

    it('should handle bulk invalidation for site', async () => {
      await cacheManager.set('site:1:channels', [])
      await cacheManager.set('site:1:promos', [])
      await cacheManager.set('site:1:articles', [])

      await cacheManager.deleteByPrefix('site:1:')

      expect(await cacheManager.get('site:1:channels')).toBeNull()
      expect(await cacheManager.get('site:1:promos')).toBeNull()
      expect(await cacheManager.get('site:1:articles')).toBeNull()
    })
  })
})
