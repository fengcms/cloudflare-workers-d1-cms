/**
 * 频道路由
 * 
 * 实现频道管理相关的 API 端点：
 * - POST /api/v1/channel - 创建频道（需要 MANAGE 或更高权限）
 * - PUT /api/v1/channel/:id - 更新频道（需要 MANAGE 或更高权限）
 * - DELETE /api/v1/channel/:id - 删除频道（需要 MANAGE 或更高权限）
 * - GET /api/v1/channel/tree - 获取频道树（需要认证）
 * 
 * **验证需求**: 3.1, 3.2, 3.3, 3.4
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { ChannelService } from '../services/channelService'
import { CacheManager } from '../services/cacheManager'
import { authMiddleware, getAuthContext } from '../middleware/auth'
import { siteMiddleware, getSiteContext } from '../middleware/site'
import { auditMiddleware } from '../middleware/audit'
import { checkPermission } from '../utils/authorization'
import { successResponse } from '../utils/response'
import { 
  AuthorizationError, 
  ValidationError 
} from '../errors'
import { 
  UserTypeEnum, 
  CreateChannelInput, 
  UpdateChannelInput 
} from '../types'

const channels = new Hono()

/**
 * POST /api/v1/channels
 * 创建频道（需要 MANAGE 或更高权限）
 * 
 * 请求体：CreateChannelInput
 * 
 * 响应：Channel
 * 
 * **验证需求**: 3.1, 3.2
 */
channels.post('/', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取请求体
  const body = await c.req.json() as CreateChannelInput

  // 验证必填字段
  if (!body.name) {
    throw new ValidationError('频道名称不能为空')
  }

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建频道服务实例
  const channelService = new ChannelService(c.env.DB, cacheManager)

  // 创建频道
  const channel = await channelService.create(body, siteId)

  return c.json(successResponse(channel), 201)
})

/**
 * PUT /api/v1/channels/:id
 * 更新频道（需要 MANAGE 或更高权限）
 * 
 * 路径参数：
 * - id: number - 频道ID
 * 
 * 请求体：UpdateChannelInput
 * 
 * 响应：Channel
 * 
 * **验证需求**: 3.2, 3.4
 */
channels.put('/:id', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取频道ID
  const channelId = parseInt(c.req.param('id'), 10)
  if (isNaN(channelId) || channelId <= 0) {
    throw new ValidationError('无效的频道ID')
  }

  // 获取请求体
  const body = await c.req.json() as UpdateChannelInput

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建频道服务实例
  const channelService = new ChannelService(c.env.DB, cacheManager)

  // 更新频道
  const channel = await channelService.update(channelId, body, siteId)

  return c.json(successResponse(channel))
})

/**
 * DELETE /api/v1/channels/:id
 * 删除频道（需要 MANAGE 或更高权限）
 * 
 * 路径参数：
 * - id: number - 频道ID
 * 
 * 响应：成功消息
 * 
 * **验证需求**: 3.4
 */
channels.delete('/:id', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取频道ID
  const channelId = parseInt(c.req.param('id'), 10)
  if (isNaN(channelId) || channelId <= 0) {
    throw new ValidationError('无效的频道ID')
  }

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建频道服务实例
  const channelService = new ChannelService(c.env.DB, cacheManager)

  // 删除频道（软删除）
  await channelService.delete(channelId, siteId)

  return c.json(successResponse({ message: '频道已删除' }))
})

/**
 * GET /api/v1/channels/tree
 * 获取频道树（需要认证）
 * 
 * 响应：ChannelTree[]
 * 
 * **验证需求**: 3.3
 */
channels.get('/tree', authMiddleware, siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建频道服务实例
  const channelService = new ChannelService(c.env.DB, cacheManager)

  // 获取频道树
  const tree = await channelService.getTree(siteId)

  return c.json(successResponse(tree))
})

export default channels
