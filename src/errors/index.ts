/**
 * 错误类定义
 * 每个错误类包含对应的 HTTP 状态码
 */

/**
 * 基础错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 验证错误 - 400
 * 用于请求参数验证失败
 * 需求：18.1
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

/**
 * 认证错误 - 401
 * 用于 JWT 令牌无效或缺失
 * 需求：18.2
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '未授权访问') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

/**
 * 授权错误 - 403
 * 用于用户权限不足
 * 需求：18.3
 */
export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

/**
 * 资源未找到错误 - 404
 * 用于请求的资源不存在
 * 需求：18.4
 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源未找到') {
    super(message, 404, 'NOT_FOUND_ERROR')
  }
}

/**
 * 冲突错误 - 409
 * 用于唯一性约束冲突（如用户名已存在）
 * 需求：18.5
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR')
  }
}

/**
 * 内部服务器错误 - 500
 * 用于服务器内部错误
 * 需求：18.5
 */
export class InternalError extends AppError {
  constructor(message: string = '服务器内部错误') {
    super(message, 500, 'INTERNAL_ERROR')
  }
}

/**
 * 将错误转换为错误响应对象
 * 用于统一错误响应格式
 */
export function toErrorResponse(error: AppError) {
  const response: any = {
    success: false,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message
    }
  }

  // 如果是 ValidationError，添加 details 字段
  if (error instanceof ValidationError && error.details) {
    response.error.details = error.details
  }

  return response
}
