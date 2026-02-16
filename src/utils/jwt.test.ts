import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { UserTypeEnum } from '../types'
import { generateToken, verifyToken } from './jwt'

describe('JWT Utils', () => {
  const testSecret = 'test-secret-key-for-jwt'

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        type: UserTypeEnum.EDITOR,
        siteId: 1,
      }

      const token = await generateToken(payload, testSecret)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should generate token with null siteId for SUPERMANAGE', async () => {
      const payload = {
        userId: 1,
        username: 'admin',
        type: UserTypeEnum.SUPERMANAGE,
        siteId: null,
      }

      const token = await generateToken(payload, testSecret)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('should generate different tokens for different payloads', async () => {
      const payload1 = {
        userId: 1,
        username: 'user1',
        type: UserTypeEnum.USER,
        siteId: 1,
      }

      const payload2 = {
        userId: 2,
        username: 'user2',
        type: UserTypeEnum.USER,
        siteId: 1,
      }

      const token1 = await generateToken(payload1, testSecret)
      const token2 = await generateToken(payload2, testSecret)

      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode a valid token', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        type: UserTypeEnum.EDITOR,
        siteId: 1,
      }

      const token = await generateToken(payload, testSecret)
      const decoded = await verifyToken(token, testSecret)

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.username).toBe(payload.username)
      expect(decoded.type).toBe(payload.type)
      expect(decoded.siteId).toBe(payload.siteId)
      expect(decoded.iat).toBeDefined()
      expect(decoded.exp).toBeDefined()
    })

    it('should verify token with null siteId', async () => {
      const payload = {
        userId: 1,
        username: 'admin',
        type: UserTypeEnum.SUPERMANAGE,
        siteId: null,
      }

      const token = await generateToken(payload, testSecret)
      const decoded = await verifyToken(token, testSecret)

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.username).toBe(payload.username)
      expect(decoded.type).toBe(payload.type)
      expect(decoded.siteId).toBeNull()
    })

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.token.here'

      await expect(verifyToken(invalidToken, testSecret)).rejects.toThrow()
    })

    it('should throw error for token with wrong secret', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        type: UserTypeEnum.USER,
        siteId: 1,
      }

      const token = await generateToken(payload, testSecret)

      await expect(verifyToken(token, 'wrong-secret')).rejects.toThrow()
    })

    it('should throw error for expired token', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        type: UserTypeEnum.USER,
        siteId: 1,
      }

      // Generate token that expires in 1 second
      const token = await generateToken(payload, testSecret, '1s')

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1100))

      await expect(verifyToken(token, testSecret)).rejects.toThrow()
    })
  })

  describe('roundtrip consistency', () => {
    it('should maintain data consistency through generate and verify cycle', async () => {
      const testCases = [
        {
          userId: 1,
          username: 'user1',
          type: UserTypeEnum.USER,
          siteId: 1,
        },
        {
          userId: 2,
          username: 'editor1',
          type: UserTypeEnum.EDITOR,
          siteId: 2,
        },
        {
          userId: 3,
          username: 'manager1',
          type: UserTypeEnum.MANAGE,
          siteId: 3,
        },
        {
          userId: 4,
          username: 'admin',
          type: UserTypeEnum.SUPERMANAGE,
          siteId: null,
        },
      ]

      for (const payload of testCases) {
        const token = await generateToken(payload, testSecret)
        const decoded = await verifyToken(token, testSecret)

        expect(decoded.userId).toBe(payload.userId)
        expect(decoded.username).toBe(payload.username)
        expect(decoded.type).toBe(payload.type)
        expect(decoded.siteId).toBe(payload.siteId)
      }
    })

    /**
     * 属性 5: JWT 令牌往返一致性
     * **Validates: Requirements 9.2, 9.6**
     *
     * 对于任何有效的用户上下文，生成 JWT 令牌然后解码应该产生等效的用户信息
     * （userId、username、type、siteId）
     */
    it('property: JWT token roundtrip consistency', async () => {
      // 定义用户类型枚举值数组
      const userTypes = [
        UserTypeEnum.USER,
        UserTypeEnum.EDITOR,
        UserTypeEnum.MANAGE,
        UserTypeEnum.SUPERMANAGE,
      ]

      // 定义 JWT 载荷生成器
      const jwtPayloadArbitrary = fc.record({
        userId: fc.integer({ min: 1, max: 1000000 }),
        username: fc.string({ minLength: 1, maxLength: 50 }),
        type: fc.constantFrom(...userTypes),
        siteId: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
      })

      await fc.assert(
        fc.asyncProperty(jwtPayloadArbitrary, async (payload) => {
          // 生成 JWT 令牌
          const token = await generateToken(payload, testSecret)

          // 验证并解码令牌
          const decoded = await verifyToken(token, testSecret)

          // 验证往返一致性：解码后的数据应该与原始载荷匹配
          expect(decoded.userId).toBe(payload.userId)
          expect(decoded.username).toBe(payload.username)
          expect(decoded.type).toBe(payload.type)
          expect(decoded.siteId).toBe(payload.siteId)

          // 验证额外的 JWT 字段存在
          expect(decoded.iat).toBeDefined()
          expect(decoded.exp).toBeDefined()
          expect(typeof decoded.iat).toBe('number')
          expect(typeof decoded.exp).toBe('number')

          // 验证过期时间在未来
          expect(decoded.exp!).toBeGreaterThan(decoded.iat!)
        }),
        { numRuns: 100 }
      )
    })
  })
})
