/**
 * 站点隔离中间件
 * 
 * 需求 1.3：当 Site-Id 请求头缺失时，系统应拒绝请求并返回认证错误
 * 
 * 功能：
 * 1. 从 Site-Id 头提取 site_id
 * 2. 验证 site_id 存在且有效
 * 3. 将 SiteContext 附加到请求上下文
 */

import type { Context, MiddlewareHandler } from 'hono'
import { AuthenticationError } from '../errors'
import type { SiteContext } from '../types'

/**
 * 站点隔离中间件
 * 
 * 从请求头中提取 Site-Id 并验证，将站点上下文附加到请求
 * 
 * @returns Hono 中间件处理函数
 */
export const siteMiddleware: MiddlewareHandler = async (c: Context, next) => {
  // 从请求头提取 Site-Id
  const siteIdHeader = c.req.header('Site-Id')

  // 验证 Site-Id 头是否存在（包括空字符串）
  if (!siteIdHeader || siteIdHeader.trim() === '') {
    throw new AuthenticationError('缺少 Site-Id 头')
  }

  // 解析 site_id 为数字
  const siteId = parseInt(siteIdHeader, 10)

  // 验证 site_id 是否为有效数字
  if (isNaN(siteId) || siteId <= 0) {
    throw new AuthenticationError('Site-Id 必须是有效的正整数')
  }

  // 构建站点上下文
  const siteContext: SiteContext = {
    siteId
  }

  // 将站点上下文存储到请求上下文
  c.set('siteContext', siteContext)

  // 继续处理请求
  await next()
}

/**
 * 从请求上下文中获取站点上下文
 * 
 * @param c Hono 上下文
 * @returns 站点上下文
 * @throws AuthenticationError 如果站点上下文不存在
 */
export function getSiteContext(c: Context): SiteContext {
  const siteContext = c.get('siteContext') as SiteContext | undefined
  
  if (!siteContext) {
    throw new AuthenticationError('未找到站点上下文')
  }
  
  return siteContext
}
