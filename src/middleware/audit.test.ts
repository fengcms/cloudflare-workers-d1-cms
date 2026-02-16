/**
 * 审计日志中间件单元测试
 *
 * 测试审计日志中间件的功能：
 * 1. 拦截状态变更操作（POST、PUT、DELETE）
 * 2. 提取用户和站点上下文
 * 3. 提取资源信息
 * 4. 记录审计日志
 * 5. 错误处理（不阻塞请求）
 */

import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogTypeEnum, ModuleEnum } from '../types'
import { auditMiddleware } from './audit'

describe('审计日志中间件', () => {
  let app: Hono
  let mockDb: any
  let loggedEntries: any[]

  beforeEach(() => {
    // 重置日志记录
    loggedEntries = []

    // 创建模拟数据库
    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: any) => {
          // 捕获传入的数据
          const entry = {
            id: 1,
            ...data,
            created_at: data.created_at || new Date(),
          }
          loggedEntries.push(entry)

          return {
            returning: vi.fn().mockResolvedValue([entry]),
          }
        }),
      }),
    }

    // 创建新的 Hono 应用
    app = new Hono()

    // 设置环境变量
    app.use('*', async (c, next) => {
      c.env = { DB: mockDb }
      await next()
    })

    // 应用审计中间件
    app.use('*', auditMiddleware)
  })

  describe('状态变更操作拦截', () => {
    it('应该拦截 POST 请求', async () => {
      // 设置认证和站点上下文（必须在路由之前）
      app.use('/api/v1/articles', async (c, next) => {
        c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
        c.set('siteContext', { siteId: 1 })
        await next()
      })

      app.post('/api/v1/articles', (c) => c.json({ success: true }))

      const res = await app.request('/api/v1/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(200)

      // 等待异步日志记录完成
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].type).toBe(LogTypeEnum.POST)
    })

    it('应该拦截 PUT 请求', async () => {
      app.use('/api/v1/articles/:id', async (c, next) => {
        c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
        c.set('siteContext', { siteId: 1 })
        await next()
      })

      app.put('/api/v1/articles/123', (c) => c.json({ success: true }))

      const res = await app.request('/api/v1/articles/123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(200)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].type).toBe(LogTypeEnum.PUT)
    })

    it('应该拦截 DELETE 请求', async () => {
      app.use('/api/v1/articles/:id', async (c, next) => {
        c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
        c.set('siteContext', { siteId: 1 })
        await next()
      })

      app.delete('/api/v1/articles/123', (c) => c.json({ success: true }))

      const res = await app.request('/api/v1/articles/123', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].type).toBe(LogTypeEnum.DELETE)
    })

    it('不应该拦截 GET 请求', async () => {
      app.get('/api/v1/articles', (c) => c.json({ success: true }))

      const res = await app.request('/api/v1/articles', {
        method: 'GET',
      })

      expect(res.status).toBe(200)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBe(0)
    })
  })

  describe('用户上下文提取', () => {
    it('应该提取认证用户信息', async () => {
      app.post(
        '/api/v1/articles',
        async (c, next) => {
          c.set('authContext', { userId: 42, username: 'john', type: 'EDITOR', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/articles', {
        method: 'POST',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].user_id).toBe(42)
      expect(loggedEntries[0].username).toBe('john')
    })

    it('应该处理未认证请求（匿名用户）', async () => {
      app.post('/api/v1/public', (c) => c.json({ success: true }))

      await app.request('/api/v1/public', {
        method: 'POST',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].user_id).toBeNull()
      expect(loggedEntries[0].username).toBe('anonymous')
    })
  })

  describe('站点上下文提取', () => {
    it('应该提取站点ID', async () => {
      app.post(
        '/api/v1/articles',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 5 })
          c.set('siteContext', { siteId: 5 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/articles', {
        method: 'POST',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].site_id).toBe(5)
    })

    it('应该处理缺少站点上下文的情况', async () => {
      app.post(
        '/api/v1/system',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'admin', type: 'SUPERMANAGE', siteId: null })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/system', {
        method: 'POST',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].site_id).toBeNull()
    })
  })

  describe('资源信息提取', () => {
    it('应该识别文章模块', async () => {
      app.post(
        '/api/v1/articles',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/articles', {
        method: 'POST',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].module).toBe(ModuleEnum.ARTICLE)
    })

    it('应该识别频道模块', async () => {
      app.post(
        '/api/v1/channels',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/channels', {
        method: 'POST',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].module).toBe(ModuleEnum.CHANNEL)
    })

    it('应该提取资源ID', async () => {
      app.put(
        '/api/v1/articles/456',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/articles/456', {
        method: 'PUT',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].content).toContain('#456')
    })

    it('应该处理未知模块（使用 SYSTEM）', async () => {
      app.post(
        '/api/v1/unknown',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/unknown', {
        method: 'POST',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].module).toBe(ModuleEnum.SYSTEM)
    })
  })

  describe('请求元数据提取', () => {
    it('应该提取 IP 地址（CF-Connecting-IP）', async () => {
      app.post(
        '/api/v1/articles',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/articles', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].ip).toBe('192.168.1.1')
    })

    it('应该提取 User-Agent', async () => {
      app.post(
        '/api/v1/articles',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/articles', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].user_agent).toBe('Mozilla/5.0')
    })
  })

  describe('错误处理', () => {
    it('不应该阻塞请求（即使日志记录失败）', async () => {
      // 创建会失败的数据库
      const failingDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('数据库错误')),
          }),
        }),
      }

      const failApp = new Hono()
      failApp.use('*', async (c, next) => {
        c.env = { DB: failingDb }
        await next()
      })
      failApp.use('*', auditMiddleware)
      failApp.post(
        '/api/v1/articles',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      const res = await failApp.request('/api/v1/articles', {
        method: 'POST',
      })

      // 请求应该成功，即使日志记录失败
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('应该处理缺少数据库的情况', async () => {
      const noDbApp = new Hono()
      noDbApp.use('*', async (c, next) => {
        c.env = {} // 没有 DB
        await next()
      })
      noDbApp.use('*', auditMiddleware)
      noDbApp.post(
        '/api/v1/articles',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      const res = await noDbApp.request('/api/v1/articles', {
        method: 'POST',
      })

      // 请求应该成功
      expect(res.status).toBe(200)
    })
  })

  describe('日志内容格式', () => {
    it('应该生成正确的日志内容（带资源ID）', async () => {
      app.put(
        '/api/v1/articles/789',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/articles/789', {
        method: 'PUT',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].content).toBe('PUT ARTICLE #789')
    })

    it('应该生成正确的日志内容（不带资源ID）', async () => {
      app.post(
        '/api/v1/users',
        async (c, next) => {
          c.set('authContext', { userId: 1, username: 'testuser', type: 'USER', siteId: 1 })
          c.set('siteContext', { siteId: 1 })
          await next()
        },
        (c) => c.json({ success: true })
      )

      await app.request('/api/v1/users', {
        method: 'POST',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(loggedEntries.length).toBeGreaterThan(0)
      expect(loggedEntries[0].content).toBe('POST USER')
    })
  })
})
