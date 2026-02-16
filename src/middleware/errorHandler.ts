/**
 * 全局错误处理中间件
 * 
 * 需求 18.6：系统永不在错误消息中暴露敏感信息
 * 
 * 功能：
 * 1. 捕获所有错误并转换为统一响应格式
 * 2. 记录错误详情（不暴露敏感信息）
 * 3. 根据错误类型返回适当的 HTTP 状态码
 */

import type { Context, ErrorHandler } from 'hono'
import { AppError, ValidationError } from '../errors'
import { errorResponse } from '../utils/response'

/**
 * 全局错误处理函数
 * 
 * 捕获所有抛出的错误，转换为统一的错误响应格式
 * 
 * @param err - 错误对象
 * @param c - Hono 上下文对象
 */
export const errorHandler: ErrorHandler = (err: Error, c: Context) => {
  // 记录错误详情（用于调试，不暴露给客户端）
  console.error(err)

  // 处理已知的应用错误
  if (err instanceof AppError) {
    const response = errorResponse(
      err.code || 'UNKNOWN_ERROR',
      err.message,
      err instanceof ValidationError ? err.details : undefined
    )
    
    return c.json(response, err.statusCode)
  }

  // 处理未知错误（不暴露敏感信息）
  const response = errorResponse(
    'INTERNAL_ERROR',
    '服务器内部错误'
  )
  
  return c.json(response, 500)
}
