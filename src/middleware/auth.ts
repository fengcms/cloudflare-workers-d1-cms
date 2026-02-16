/**
 * 认证中间件
 *
 * 需求 9.3：当请求包含 Authorization 请求头时，系统应验证 JWT 令牌
 * 需求 9.4：当 JWT 令牌无效或过期时，系统应拒绝请求并返回认证错误
 *
 * 功能：
 * 1. 从 Authorization 头提取 JWT 令牌
 * 2. 验证令牌并提取用户上下文
 * 3. 将 AuthContext 附加到请求上下文
 */

import type { Context, MiddlewareHandler } from 'hono'
import { AuthenticationError } from '../errors'
import type { AuthContext } from '../types'
import { verifyToken } from '../utils/jwt'

/**
 * 认证中间件
 *
 * 从请求头中提取 JWT 令牌并验证，将认证上下文附加到请求
 *
 * @returns Hono 中间件处理函数
 */
export const authMiddleware: MiddlewareHandler = async (c: Context, next) => {
  // 从环境变量获取 JWT 密钥
  const secret = c.env?.JWT_SECRET
  if (!secret) {
    throw new AuthenticationError('JWT 密钥未配置')
  }

  // 从请求头提取 Authorization
  const authHeader = c.req.header('Authorization')

  // 验证 Authorization 头是否存在
  if (!authHeader) {
    throw new AuthenticationError('缺少 Authorization 头')
  }

  // 验证 Authorization 头格式（Bearer <token>）
  const parts = authHeader.trim().split(/\s+/) // Split by one or more whitespace characters

  // 检查基本格式
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AuthenticationError('Authorization 头格式无效')
  }

  const token = parts[1]

  // 检查令牌是否为空
  if (!token || token.trim() === '') {
    throw new AuthenticationError('令牌为空')
  }

  try {
    // 验证并解码 JWT 令牌
    const payload = await verifyToken(token, secret)

    // 构建认证上下文
    const authContext: AuthContext = {
      userId: payload.userId,
      username: payload.username,
      type: payload.type,
      siteId: payload.siteId,
    }

    // 将认证上下文存储到请求上下文
    c.set('authContext', authContext)

    // 继续处理请求
    await next()
  } catch (error) {
    // JWT 验证失败（无效或过期）
    if (error instanceof Error) {
      throw new AuthenticationError(`令牌验证失败: ${error.message}`)
    }
    throw new AuthenticationError('令牌验证失败')
  }
}

/**
 * 从请求上下文中获取认证上下文
 *
 * @param c Hono 上下文
 * @returns 认证上下文
 * @throws AuthenticationError 如果认证上下文不存在
 */
export function getAuthContext(c: Context): AuthContext {
  const authContext = c.get('authContext') as AuthContext | undefined

  if (!authContext) {
    throw new AuthenticationError('未找到认证上下文')
  }

  return authContext
}
