/**
 * 全局错误处理中间件测试
 */

import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  InternalError,
  NotFoundError,
  ValidationError,
} from '../errors'
import { errorHandler } from './errorHandler'

describe('errorHandler middleware', () => {
  it('should handle ValidationError with 400 status', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new ValidationError('验证失败', { username: ['用户名不能为空'] })
    })

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '验证失败',
        details: { username: ['用户名不能为空'] },
      },
    })
  })

  it('should handle AuthenticationError with 401 status', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new AuthenticationError('未授权访问')
    })

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: '未授权访问',
      },
    })
  })

  it('should handle AuthorizationError with 403 status', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new AuthorizationError('权限不足')
    })

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: '权限不足',
      },
    })
  })

  it('should handle NotFoundError with 404 status', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new NotFoundError('资源未找到')
    })

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND_ERROR',
        message: '资源未找到',
      },
    })
  })

  it('should handle ConflictError with 409 status', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new ConflictError('用户名已存在')
    })

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'CONFLICT_ERROR',
        message: '用户名已存在',
      },
    })
  })

  it('should handle InternalError with 500 status', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new InternalError('服务器内部错误')
    })

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    })
  })

  it('should handle unknown errors with 500 status and generic message', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new Error('Database connection failed')
    })

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    })
    // 确保不暴露敏感信息
    expect(body.error.message).not.toContain('Database')
  })

  it('should log error details without exposing them to client', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new Error('Sensitive database error')
    })

    await app.request('/test')

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Sensitive database error',
      })
    )

    consoleSpy.mockRestore()
  })

  it('should pass through successful requests', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', (c) => c.json({ success: true, data: 'ok' }))

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true, data: 'ok' })
  })

  it('should handle ValidationError without details', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/test', () => {
      throw new ValidationError('验证失败')
    })

    const res = await app.request('/test')
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '验证失败',
      },
    })
    expect(body.error).not.toHaveProperty('details')
  })
})
