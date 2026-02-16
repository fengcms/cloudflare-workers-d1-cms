import { describe, expect, it } from 'vitest'
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  InternalError,
  NotFoundError,
  toErrorResponse,
  ValidationError,
} from './index'

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with message and status code', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR')

      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.name).toBe('AppError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should capture stack trace', () => {
      const error = new AppError('Test error', 400)

      expect(error.stack).toBeDefined()
    })
  })

  describe('ValidationError', () => {
    it('should create validation error with 400 status code', () => {
      const error = new ValidationError('验证失败')

      expect(error.message).toBe('验证失败')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.name).toBe('ValidationError')
    })

    it('should include validation details', () => {
      const details = {
        username: ['用户名不能为空', '用户名长度必须在3-50之间'],
        email: ['邮箱格式不正确'],
      }
      const error = new ValidationError('验证失败', details)

      expect(error.details).toEqual(details)
    })

    it('should work without details', () => {
      const error = new ValidationError('验证失败')

      expect(error.details).toBeUndefined()
    })
  })

  describe('AuthenticationError', () => {
    it('should create authentication error with 401 status code', () => {
      const error = new AuthenticationError()

      expect(error.message).toBe('未授权访问')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTHENTICATION_ERROR')
      expect(error.name).toBe('AuthenticationError')
    })

    it('should accept custom message', () => {
      const error = new AuthenticationError('Token 已过期')

      expect(error.message).toBe('Token 已过期')
      expect(error.statusCode).toBe(401)
    })
  })

  describe('AuthorizationError', () => {
    it('should create authorization error with 403 status code', () => {
      const error = new AuthorizationError()

      expect(error.message).toBe('权限不足')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('AUTHORIZATION_ERROR')
      expect(error.name).toBe('AuthorizationError')
    })

    it('should accept custom message', () => {
      const error = new AuthorizationError('需要管理员权限')

      expect(error.message).toBe('需要管理员权限')
      expect(error.statusCode).toBe(403)
    })
  })

  describe('NotFoundError', () => {
    it('should create not found error with 404 status code', () => {
      const error = new NotFoundError()

      expect(error.message).toBe('资源未找到')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND_ERROR')
      expect(error.name).toBe('NotFoundError')
    })

    it('should accept custom message', () => {
      const error = new NotFoundError('文章不存在')

      expect(error.message).toBe('文章不存在')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('ConflictError', () => {
    it('should create conflict error with 409 status code', () => {
      const error = new ConflictError('用户名已存在')

      expect(error.message).toBe('用户名已存在')
      expect(error.statusCode).toBe(409)
      expect(error.code).toBe('CONFLICT_ERROR')
      expect(error.name).toBe('ConflictError')
    })
  })

  describe('InternalError', () => {
    it('should create internal error with 500 status code', () => {
      const error = new InternalError()

      expect(error.message).toBe('服务器内部错误')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.name).toBe('InternalError')
    })

    it('should accept custom message', () => {
      const error = new InternalError('数据库连接失败')

      expect(error.message).toBe('数据库连接失败')
      expect(error.statusCode).toBe(500)
    })
  })

  describe('Error inheritance', () => {
    it('should all inherit from AppError', () => {
      expect(new ValidationError('test')).toBeInstanceOf(AppError)
      expect(new AuthenticationError()).toBeInstanceOf(AppError)
      expect(new AuthorizationError()).toBeInstanceOf(AppError)
      expect(new NotFoundError()).toBeInstanceOf(AppError)
      expect(new ConflictError('test')).toBeInstanceOf(AppError)
      expect(new InternalError()).toBeInstanceOf(AppError)
    })

    it('should all inherit from Error', () => {
      expect(new ValidationError('test')).toBeInstanceOf(Error)
      expect(new AuthenticationError()).toBeInstanceOf(Error)
      expect(new AuthorizationError()).toBeInstanceOf(Error)
      expect(new NotFoundError()).toBeInstanceOf(Error)
      expect(new ConflictError('test')).toBeInstanceOf(Error)
      expect(new InternalError()).toBeInstanceOf(Error)
    })
  })

  describe('Error status codes', () => {
    it('should have correct HTTP status codes', () => {
      expect(new ValidationError('test').statusCode).toBe(400)
      expect(new AuthenticationError().statusCode).toBe(401)
      expect(new AuthorizationError().statusCode).toBe(403)
      expect(new NotFoundError().statusCode).toBe(404)
      expect(new ConflictError('test').statusCode).toBe(409)
      expect(new InternalError().statusCode).toBe(500)
    })
  })

  describe('toErrorResponse', () => {
    it('should convert ValidationError to error response', () => {
      const details = {
        username: ['用户名不能为空'],
        email: ['邮箱格式不正确'],
      }
      const error = new ValidationError('验证失败', details)
      const response = toErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '验证失败',
          details,
        },
      })
    })

    it('should convert ValidationError without details', () => {
      const error = new ValidationError('验证失败')
      const response = toErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '验证失败',
        },
      })
    })

    it('should convert AuthenticationError to error response', () => {
      const error = new AuthenticationError('Token 已过期')
      const response = toErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Token 已过期',
        },
      })
    })

    it('should convert AuthorizationError to error response', () => {
      const error = new AuthorizationError('需要管理员权限')
      const response = toErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: '需要管理员权限',
        },
      })
    })

    it('should convert NotFoundError to error response', () => {
      const error = new NotFoundError('文章不存在')
      const response = toErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND_ERROR',
          message: '文章不存在',
        },
      })
    })

    it('should convert ConflictError to error response', () => {
      const error = new ConflictError('用户名已存在')
      const response = toErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: {
          code: 'CONFLICT_ERROR',
          message: '用户名已存在',
        },
      })
    })

    it('should convert InternalError to error response', () => {
      const error = new InternalError('数据库连接失败')
      const response = toErrorResponse(error)

      expect(response).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '数据库连接失败',
        },
      })
    })
  })
})
