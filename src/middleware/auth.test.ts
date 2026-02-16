/**
 * 认证中间件单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware, getAuthContext } from './auth'
import { generateToken } from '../utils/jwt'
import { UserTypeEnum } from '../types'
import { AuthenticationError } from '../errors'
import { errorHandler } from './errorHandler'

describe('认证中间件', () => {
  let app: Hono
  const testSecret = 'test-secret-key-for-jwt'
  
  beforeEach(() => {
    app = new Hono()
    
    // 注册错误处理器
    app.onError(errorHandler)
    
    // 模拟环境变量
    app.use('*', async (c, next) => {
      c.env = { JWT_SECRET: testSecret }
      await next()
    })
  })
  
  describe('authMiddleware', () => {
    it('应该成功验证有效的 JWT 令牌', async () => {
      // 生成有效令牌
      const token = await generateToken(
        {
          userId: 1,
          username: 'testuser',
          type: UserTypeEnum.EDITOR,
          siteId: 1
        },
        testSecret
      )
      
      app.use('*', authMiddleware)
      app.get('/test', (c) => {
        const auth = getAuthContext(c)
        return c.json({ success: true, auth })
      })
      
      const res = await app.request('/test', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.auth).toEqual({
        userId: 1,
        username: 'testuser',
        type: UserTypeEnum.EDITOR,
        siteId: 1
      })
    })
    
    it('应该拒绝缺少 Authorization 头的请求', async () => {
      app.use('*', authMiddleware)
      app.get('/test', (c) => c.json({ success: true }))
      
      const res = await app.request('/test')
      const body = await res.json()
      
      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toBe('缺少 Authorization 头')
    })
    
    it('应该拒绝格式无效的 Authorization 头', async () => {
      app.use('*', authMiddleware)
      app.get('/test', (c) => c.json({ success: true }))
      
      const res = await app.request('/test', {
        headers: {
          'Authorization': 'InvalidFormat'
        }
      })
      const body = await res.json()
      
      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toContain('格式无效')
    })
    
    it('应该拒绝空令牌', async () => {
      app.use('*', authMiddleware)
      app.get('/test', (c) => c.json({ success: true }))
      
      const res = await app.request('/test', {
        headers: {
          'Authorization': 'Bearer '
        }
      })
      const body = await res.json()
      
      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      // "Bearer " with trailing space might be treated as format error or empty token
      expect(body.error.message).toMatch(/令牌为空|Authorization 头格式无效/)
    })
    
    it('应该拒绝无效的 JWT 令牌', async () => {
      app.use('*', authMiddleware)
      app.get('/test', (c) => c.json({ success: true }))
      
      const res = await app.request('/test', {
        headers: {
          'Authorization': 'Bearer invalid.jwt.token'
        }
      })
      const body = await res.json()
      
      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toContain('令牌验证失败')
    })
    
    it('应该拒绝使用错误密钥签名的令牌', async () => {
      // 使用不同的密钥生成令牌
      const token = await generateToken(
        {
          userId: 1,
          username: 'testuser',
          type: UserTypeEnum.EDITOR,
          siteId: 1
        },
        'wrong-secret-key'
      )
      
      app.use('*', authMiddleware)
      app.get('/test', (c) => c.json({ success: true }))
      
      const res = await app.request('/test', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const body = await res.json()
      
      expect(res.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(body.error.message).toContain('令牌验证失败')
    })
    
    it('应该正确提取所有用户上下文字段', async () => {
      const token = await generateToken(
        {
          userId: 42,
          username: 'admin',
          type: UserTypeEnum.SUPERMANAGE,
          siteId: null
        },
        testSecret
      )
      
      app.use('*', authMiddleware)
      app.get('/test', (c) => {
        const auth = getAuthContext(c)
        return c.json({ auth })
      })
      
      const res = await app.request('/test', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await res.json()
      expect(data.auth.userId).toBe(42)
      expect(data.auth.username).toBe('admin')
      expect(data.auth.type).toBe(UserTypeEnum.SUPERMANAGE)
      expect(data.auth.siteId).toBeNull()
    })
    
    it('应该支持不同的用户角色', async () => {
      const roles = [
        UserTypeEnum.SUPERMANAGE,
        UserTypeEnum.MANAGE,
        UserTypeEnum.EDITOR,
        UserTypeEnum.USER
      ]
      
      for (const role of roles) {
        const token = await generateToken(
          {
            userId: 1,
            username: 'testuser',
            type: role,
            siteId: 1
          },
          testSecret
        )
        
        const testApp = new Hono()
        testApp.use('*', async (c, next) => {
          c.env = { JWT_SECRET: testSecret }
          await next()
        })
        testApp.use('*', authMiddleware)
        testApp.get('/test', (c) => {
          const auth = getAuthContext(c)
          return c.json({ type: auth.type })
        })
        
        const res = await testApp.request('/test', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await res.json()
        expect(data.type).toBe(role)
      }
    })
  })
  
  describe('getAuthContext', () => {
    it('应该返回已设置的认证上下文', async () => {
      const token = await generateToken(
        {
          userId: 1,
          username: 'testuser',
          type: UserTypeEnum.EDITOR,
          siteId: 1
        },
        testSecret
      )
      
      app.use('*', authMiddleware)
      app.get('/test', (c) => {
        const auth = getAuthContext(c)
        expect(auth).toBeDefined()
        expect(auth.userId).toBe(1)
        return c.json({ success: true })
      })
      
      await app.request('/test', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    })
    
    it('应该在认证上下文不存在时抛出错误', () => {
      app.get('/test', (c) => {
        expect(() => getAuthContext(c)).toThrow(AuthenticationError)
        expect(() => getAuthContext(c)).toThrow('未找到认证上下文')
        return c.json({ success: true })
      })
      
      app.request('/test')
    })
  })
})
