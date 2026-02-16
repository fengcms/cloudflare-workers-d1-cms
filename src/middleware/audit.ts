/**
 * 审计日志中间件
 * 
 * 需求 8.4：当发生任何状态变更操作时，系统应创建审计日志条目
 * 
 * 功能：
 * 1. 拦截所有状态变更操作（POST、PUT、DELETE 请求）
 * 2. 提取用户上下文（userId、username）
 * 3. 提取资源信息（resourceType、resourceId）
 * 4. 提取请求元数据（IP、User-Agent）
 * 5. 调用 auditLogService.log() 记录操作
 * 6. 不阻塞请求处理（即使日志记录失败）
 */

import type { Context, MiddlewareHandler } from 'hono'
import { AuditLogService } from '../services/auditLogService'
import { LogTypeEnum, ModuleEnum } from '../types'
import { getAuthContext } from './auth'
import { getSiteContext } from './site'

/**
 * 从请求路径提取模块和资源ID
 * 
 * 路径格式：/api/v1/{module}/{id?}
 * 
 * @param path 请求路径
 * @returns 模块和资源ID
 */
function extractResourceInfo(path: string): { module: ModuleEnum | null; resourceId: number | null } {
  // 移除查询参数
  const cleanPath = path.split('?')[0]
  
  // 分割路径
  const parts = cleanPath.split('/').filter(p => p !== '')
  
  // 路径格式：api/v1/{module}/{id?}
  if (parts.length < 3) {
    return { module: null, resourceId: null }
  }
  
  // 提取模块名称（第3部分）
  const moduleName = parts[2].toUpperCase()
  
  // 映射模块名称到 ModuleEnum
  let module: ModuleEnum | null = null
  
  // 处理复数形式到单数形式的映射
  switch (moduleName) {
    case 'ARTICLES':
      module = ModuleEnum.ARTICLE
      break
    case 'CHANNELS':
      module = ModuleEnum.CHANNEL
      break
    case 'USERS':
      module = ModuleEnum.USER
      break
    case 'SITES':
      module = ModuleEnum.SITE
      break
    case 'DICTS':
    case 'DICTIONARIES':
      module = ModuleEnum.DICTS
      break
    case 'PROMOS':
    case 'PROMOTIONS':
      module = ModuleEnum.PROMO
      break
    default:
      // 如果不匹配，尝试直接使用
      if (Object.values(ModuleEnum).includes(moduleName as ModuleEnum)) {
        module = moduleName as ModuleEnum
      }
  }
  
  // 提取资源ID（第4部分，如果存在）
  let resourceId: number | null = null
  if (parts.length >= 4) {
    const id = parseInt(parts[3], 10)
    if (!isNaN(id)) {
      resourceId = id
    }
  }
  
  return { module, resourceId }
}

/**
 * 从 HTTP 方法映射到日志类型
 * 
 * @param method HTTP 方法
 * @returns 日志类型
 */
function mapMethodToLogType(method: string): LogTypeEnum | null {
  switch (method.toUpperCase()) {
    case 'POST':
      return LogTypeEnum.POST
    case 'PUT':
    case 'PATCH':
      return LogTypeEnum.PUT
    case 'DELETE':
      return LogTypeEnum.DELETE
    default:
      return null
  }
}

/**
 * 审计日志中间件
 * 
 * 拦截所有状态变更操作并记录审计日志
 * 
 * @returns Hono 中间件处理函数
 */
export const auditMiddleware: MiddlewareHandler = async (c: Context, next) => {
  const method = c.req.method
  
  // 只拦截状态变更操作（POST、PUT、DELETE）
  const logType = mapMethodToLogType(method)
  if (!logType) {
    // 非状态变更操作，直接继续
    await next()
    return
  }
  
  // 执行请求处理
  await next()
  
  // 请求处理完成后，异步记录审计日志（不阻塞响应）
  // 使用 Promise 但不等待，确保日志记录失败不影响请求
  recordAuditLog(c, logType).catch(error => {
    // 日志记录失败，仅记录错误但不影响请求
    console.error('审计日志记录失败:', error)
  })
}

/**
 * 记录审计日志
 * 
 * @param c Hono 上下文
 * @param logType 日志类型
 */
async function recordAuditLog(c: Context, logType: LogTypeEnum): Promise<void> {
  try {
    // 提取用户上下文（可能不存在，如公开端点）
    let userId: number | undefined
    let username: string | undefined
    try {
      const authContext = getAuthContext(c)
      userId = authContext.userId
      username = authContext.username
    } catch {
      // 没有认证上下文，使用默认值
      userId = undefined
      username = 'anonymous'
    }
    
    // 提取站点上下文（可能不存在）
    let siteId: number | undefined
    try {
      const siteContext = getSiteContext(c)
      siteId = siteContext.siteId
    } catch {
      // 没有站点上下文
      siteId = undefined
    }
    
    // 提取资源信息
    const path = c.req.path
    const { module, resourceId } = extractResourceInfo(path)
    
    // 如果无法识别模块，使用 SYSTEM
    const finalModule = module || ModuleEnum.SYSTEM
    
    // 构建日志内容
    const content = resourceId 
      ? `${logType} ${finalModule} #${resourceId}`
      : `${logType} ${finalModule}`
    
    // 提取请求元数据
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || ''
    const userAgent = c.req.header('User-Agent') || ''
    
    // 获取数据库实例
    const db = c.env?.DB
    if (!db) {
      console.error('数据库未配置，无法记录审计日志')
      return
    }
    
    // 创建审计日志服务实例
    const auditLogService = new AuditLogService(db)
    
    // 记录审计日志
    await auditLogService.log({
      user_id: userId,
      username,
      type: logType,
      module: finalModule,
      content,
      ip,
      user_agent: userAgent,
      site_id: siteId
    })
  } catch (error) {
    // 记录错误但不抛出，确保不影响请求处理
    console.error('审计日志记录过程中发生错误:', error)
  }
}
