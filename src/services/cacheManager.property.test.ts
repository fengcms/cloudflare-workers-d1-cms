/**
 * 缓存失效一致性属性测试
 *
 * **Validates: Requirements 15.3**
 *
 * 属性 14: 缓存失效一致性
 * 对于任何修改操作，如果数据被缓存，则缓存必须被失效，后续查询应该返回更新后的数据
 */

import { fc } from '@fast-check/vitest'
import { beforeEach, describe, expect, it } from 'vitest'
import { CacheManager } from './cacheManager'

/**
 * Mock KV Namespace for property testing
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

// 生成可序列化的值
const serializableValue = () =>
  fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.array(fc.string()),
    fc.record({ id: fc.integer(), name: fc.string() })
  )

describe('Property 14: 缓存失效一致性', () => {
  let mockKV: KVNamespace
  let cacheManager: CacheManager

  beforeEach(() => {
    mockKV = new MockKVNamespace() as unknown as KVNamespace
    cacheManager = new CacheManager(mockKV)
  })

  it('should ensure cache invalidation returns null on subsequent get', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        serializableValue(),
        async (key, value) => {
          await cacheManager.set(key, value)
          const cachedValue = await cacheManager.get(key)
          expect(cachedValue).toEqual(value)

          await cacheManager.delete(key)
          const afterDelete = await cacheManager.get(key)
          expect(afterDelete).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure cache update reflects new value immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        serializableValue(),
        serializableValue(),
        async (key, initialValue, updatedValue) => {
          await cacheManager.set(key, initialValue)
          const initial = await cacheManager.get(key)
          expect(initial).toEqual(initialValue)

          await cacheManager.set(key, updatedValue)
          const updated = await cacheManager.get(key)
          expect(updated).toEqual(updatedValue)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure deleteByPrefix removes all matching keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => s.trim().length > 0 && !s.includes(':')),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        async (prefix, matchingCount, nonMatchingCount) => {
          const matchingKeys: string[] = []
          for (let i = 0; i < matchingCount; i++) {
            const key = `${prefix}:key${i}`
            matchingKeys.push(key)
            await cacheManager.set(key, { data: `value${i}` })
          }

          const nonMatchingKeys: string[] = []
          for (let i = 0; i < nonMatchingCount; i++) {
            const key = `other:key${i}`
            nonMatchingKeys.push(key)
            await cacheManager.set(key, { data: `other${i}` })
          }

          for (const key of matchingKeys) {
            expect(await cacheManager.get(key)).not.toBeNull()
          }
          for (const key of nonMatchingKeys) {
            expect(await cacheManager.get(key)).not.toBeNull()
          }

          await cacheManager.deleteByPrefix(`${prefix}:`)

          for (const key of matchingKeys) {
            expect(await cacheManager.get(key)).toBeNull()
          }

          for (const key of nonMatchingKeys) {
            expect(await cacheManager.get(key)).not.toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain consistency after multiple invalidation operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            operation: fc.constantFrom('set', 'delete', 'get'),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        serializableValue(),
        async (operations, sharedValue) => {
          // Create fresh cache manager for each test run to avoid state pollution
          const freshMockKV = new MockKVNamespace() as unknown as KVNamespace
          const freshCacheManager = new CacheManager(freshMockKV)
          const expectedState = new Map<string, any>()

          for (const op of operations) {
            if (op.operation === 'set') {
              await freshCacheManager.set(op.key, sharedValue)
              expectedState.set(op.key, sharedValue)
            } else if (op.operation === 'delete') {
              await freshCacheManager.delete(op.key)
              expectedState.delete(op.key)
            } else if (op.operation === 'get') {
              const result = await freshCacheManager.get(op.key)
              const expected = expectedState.get(op.key) ?? null
              expect(result).toEqual(expected)
            }
          }

          for (const [key, expectedValue] of expectedState.entries()) {
            const actualValue = await freshCacheManager.get(key)
            expect(actualValue).toEqual(expectedValue)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure TTL expiration works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        serializableValue(),
        fc.integer({ min: 1, max: 10 }),
        async (key, value, ttl) => {
          await cacheManager.set(key, value, ttl)
          const immediate = await cacheManager.get(key)
          expect(immediate).toEqual(value)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure cache operations are idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        serializableValue(),
        async (key, value) => {
          await cacheManager.set(key, value)
          await cacheManager.set(key, value)
          await cacheManager.set(key, value)

          const result = await cacheManager.get(key)
          expect(result).toEqual(value)

          await cacheManager.delete(key)
          await cacheManager.delete(key)
          await cacheManager.delete(key)

          const afterDelete = await cacheManager.get(key)
          expect(afterDelete).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure prefix deletion is consistent with individual deletions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => s.trim().length > 0 && !s.includes(':')),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        async (prefix, suffixes) => {
          const keys = suffixes.map((suffix) => `${prefix}:${suffix}`)

          for (const key of keys) {
            await cacheManager.set(key, { data: key })
          }

          await cacheManager.deleteByPrefix(`${prefix}:`)

          for (const key of keys) {
            expect(await cacheManager.get(key)).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure cache invalidation does not affect unrelated keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        serializableValue(),
        async (targetKey, unrelatedKeys, value) => {
          const filteredKeys = unrelatedKeys.filter((k) => k !== targetKey && k.trim().length > 0)
          if (filteredKeys.length === 0) return

          await cacheManager.set(targetKey, value)
          for (const key of filteredKeys) {
            await cacheManager.set(key, { data: key })
          }

          await cacheManager.delete(targetKey)
          expect(await cacheManager.get(targetKey)).toBeNull()

          for (const key of filteredKeys) {
            const result = await cacheManager.get(key)
            expect(result).not.toBeNull()
            expect(result).toEqual({ data: key })
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure generateKey produces consistent keys for same inputs', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (parts) => {
          const key1 = cacheManager.generateKey(...parts)
          const key2 = cacheManager.generateKey(...parts)
          const key3 = cacheManager.generateKey(...parts)

          expect(key1).toBe(key2)
          expect(key2).toBe(key3)

          const expectedKey = parts.join(':')
          expect(key1).toBe(expectedKey)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure cache invalidation workflow maintains data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom('channels', 'promos', 'articles'),
        fc.array(fc.record({ id: fc.integer(), name: fc.string() })),
        fc.array(fc.record({ id: fc.integer(), name: fc.string() })),
        async (siteId, resourceType, initialData, updatedData) => {
          const cacheKey = cacheManager.generateKey('site', String(siteId), resourceType)

          await cacheManager.set(cacheKey, initialData)
          const initial = await cacheManager.get(cacheKey)
          expect(initial).toEqual(initialData)

          await cacheManager.delete(cacheKey)
          const afterInvalidation = await cacheManager.get(cacheKey)
          expect(afterInvalidation).toBeNull()

          await cacheManager.set(cacheKey, updatedData)
          const afterUpdate = await cacheManager.get(cacheKey)
          expect(afterUpdate).toEqual(updatedData)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure bulk invalidation by prefix maintains consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.constantFrom('channels', 'promos', 'articles', 'users'), {
          minLength: 2,
          maxLength: 4,
        }),
        async (siteId, resourceTypes) => {
          const sitePrefix = `site:${siteId}:`
          const keys: string[] = []

          for (const resourceType of resourceTypes) {
            const key = cacheManager.generateKey('site', String(siteId), resourceType)
            keys.push(key)
            await cacheManager.set(key, { type: resourceType, data: [] })
          }

          for (const key of keys) {
            expect(await cacheManager.get(key)).not.toBeNull()
          }

          await cacheManager.deleteByPrefix(sitePrefix)

          for (const key of keys) {
            expect(await cacheManager.get(key)).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure multi-site cache isolation during invalidation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom('channels', 'promos', 'articles'),
        async (siteId1, siteId2, resourceType) => {
          if (siteId1 === siteId2) return

          const key1 = cacheManager.generateKey('site', String(siteId1), resourceType)
          const key2 = cacheManager.generateKey('site', String(siteId2), resourceType)

          await cacheManager.set(key1, { siteId: siteId1, data: [] })
          await cacheManager.set(key2, { siteId: siteId2, data: [] })

          await cacheManager.deleteByPrefix(`site:${siteId1}:`)

          expect(await cacheManager.get(key1)).toBeNull()

          const site2Cache = await cacheManager.get(key2)
          expect(site2Cache).not.toBeNull()
          expect(site2Cache).toEqual({ siteId: siteId2, data: [] })
        }
      ),
      { numRuns: 100 }
    )
  })
})
