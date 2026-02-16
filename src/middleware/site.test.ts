/**
 * 站点隔离中间件单元测试
 */

import { type Context, Hono } from 'hono'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthenticationError } from '../errors'
import { errorHandler } from './errorHandler'
import { getSiteContext, siteMiddleware } from './site'

describe('站点隔离中间件', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()

    // 注册错误处理器
    app.onError(errorHandler)
  })

  describe('siteMiddleware', () => {
    it('应该成功提取有效的 Site-Id', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => {
        const site = getSiteContext(c)
        return c.json({ success: true, site })
      })

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '123',
        },
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.success).toBe(true)
      expect(data.site).toEqual({
        siteId: 123,
      })
    })

    it('应该拒绝缺少 Site-Id 头的请求', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => c.json({ success: true }))

      const res = await app.request('/test')
      const body = (await res.json()) as any

      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toBe('缺少 Site-Id 头')
    })

    it('应该拒绝非数字的 Site-Id', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => c.json({ success: true }))

      const res = await app.request('/test', {
        headers: {
          'Site-Id': 'invalid',
        },
      })
      const body = (await res.json()) as any

      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toBe('Site-Id 必须是有效的正整数')
    })

    it('应该拒绝零值的 Site-Id', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => c.json({ success: true }))

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '0',
        },
      })
      const body = (await res.json()) as any

      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toBe('Site-Id 必须是有效的正整数')
    })

    it('应该拒绝负数的 Site-Id', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => c.json({ success: true }))

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '-5',
        },
      })
      const body = (await res.json()) as any

      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toBe('Site-Id 必须是有效的正整数')
    })

    it('应该接受小数的 Site-Id（parseInt 会截断）', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => {
        const site = getSiteContext(c)
        return c.json({ success: true, site })
      })

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '3.14',
        },
      })

      const data = (await res.json()) as any
      // parseInt('3.14', 10) returns 3, which is valid
      expect(res.status).toBe(200)
      expect(data.site.siteId).toBe(3)
    })

    it('应该拒绝空字符串的 Site-Id', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => c.json({ success: true }))

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '',
        },
      })
      const body = (await res.json()) as any

      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toBe('缺少 Site-Id 头')
    })

    it('应该正确处理大数值的 Site-Id', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => {
        const site = getSiteContext(c)
        return c.json({ siteId: site.siteId })
      })

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '999999999',
        },
      })

      const data = (await res.json()) as any
      expect(data.siteId).toBe(999999999)
    })

    it('应该正确处理带前导零的 Site-Id', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => {
        const site = getSiteContext(c)
        return c.json({ siteId: site.siteId })
      })

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '00123',
        },
      })

      const data = (await res.json()) as any
      expect(data.siteId).toBe(123)
    })

    it('应该正确处理带空格的 Site-Id', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => {
        const site = getSiteContext(c)
        return c.json({ siteId: site.siteId })
      })

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '  456  ',
        },
      })

      const data = (await res.json()) as any
      expect(data.siteId).toBe(456)
    })
  })

  describe('getSiteContext', () => {
    it('应该返回已设置的站点上下文', async () => {
      app.use('*', siteMiddleware)
      app.get('/test', (c) => {
        const site = getSiteContext(c)
        expect(site).toBeDefined()
        expect(site.siteId).toBe(42)
        return c.json({ success: true })
      })

      await app.request('/test', {
        headers: {
          'Site-Id': '42',
        },
      })
    })

    it('应该在站点上下文不存在时抛出错误', () => {
      app.get('/test', (c) => {
        expect(() => getSiteContext(c)).toThrow(AuthenticationError)
        expect(() => getSiteContext(c)).toThrow('未找到站点上下文')
        return c.json({ success: true })
      })

      app.request('/test')
    })
  })

  describe('与认证中间件集成', () => {
    it('应该能够与其他中间件一起工作', async () => {
      // 模拟认证中间件
      const mockAuthMiddleware = async (c: Context, next: () => Promise<void>) => {
        c.set('authContext' as any, { userId: 1, username: 'test', type: 'USER', siteId: null })
        await next()
      }

      app.use('*', mockAuthMiddleware)
      app.use('*', siteMiddleware)
      app.get('/test', (c) => {
        const auth = c.get('authContext' as any)
        const site = getSiteContext(c)
        return c.json({ auth, site })
      })

      const res = await app.request('/test', {
        headers: {
          'Site-Id': '789',
        },
      })

      const data = (await res.json()) as any
      expect(data.auth).toBeDefined()
      expect(data.site.siteId).toBe(789)
    })
  })
})
