/**
 * 推广路由
 *
 * 实现推广管理相关的 API 端点：
 * - POST /api/v1/promo - 创建推广（需要 MANAGE 或更高权限）
 * - PUT /api/v1/promo/:id - 更新推广（需要 MANAGE 或更高权限）
 * - DELETE /api/v1/promo/:id - 删除推广（需要 MANAGE 或更高权限）
 * - GET /api/v1/promo/active - 获取活动推广（需要认证）
 * - PUT /api/v1/promo/:id/toggle - 切换推广状态（需要 MANAGE 或更高权限）
 *
 * **验证需求**: 7.1, 7.2, 7.3, 7.4, 7.6
 */

import { drizzle } from 'drizzle-orm/d1'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { AuthorizationError, ValidationError } from '../errors'
import { auditMiddleware } from '../middleware/audit'
import { authMiddleware, getAuthContext } from '../middleware/auth'
import { getSiteContext, siteMiddleware } from '../middleware/site'
import { CacheManager } from '../services/cacheManager'
import { PromoService } from '../services/promoService'
import { type CreatePromoInput, type UpdatePromoInput, UserTypeEnum } from '../types'
import { checkPermission } from '../utils/authorization'
import { successResponse } from '../utils/response'

const promos = new Hono()

/**
 * POST /api/v1/promos
 * 创建推广（需要 MANAGE 或更高权限）
 *
 * 请求体：CreatePromoInput
 *
 * 响应：Promo
 *
 * **验证需求**: 7.1
 */
promos.post('/', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取请求体
  const body = (await c.req.json()) as CreatePromoInput

  // 验证必填字段
  if (!body.title) {
    throw new ValidationError('推广标题不能为空')
  }

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建推广服务实例
  const db = drizzle(c.env.DB)
  const promoService = new PromoService(db, cacheManager)

  // 创建推广
  const promo = await promoService.create(body, siteId)

  return c.json(successResponse(promo), 201)
})

/**
 * PUT /api/v1/promos/:id
 * 更新推广（需要 MANAGE 或更高权限）
 *
 * 路径参数：
 * - id: number - 推广ID
 *
 * 请求体：UpdatePromoInput
 *
 * 响应：Promo
 *
 * **验证需求**: 7.2
 */
promos.put('/:id', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取推广ID
  const promoId = parseInt(c.req.param('id'), 10)
  if (isNaN(promoId) || promoId <= 0) {
    throw new ValidationError('无效的推广ID')
  }

  // 获取请求体
  const body = (await c.req.json()) as UpdatePromoInput

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建推广服务实例
  const db = drizzle(c.env.DB)
  const promoService = new PromoService(db, cacheManager)

  // 更新推广
  const promo = await promoService.update(promoId, body, siteId)

  return c.json(successResponse(promo))
})

/**
 * DELETE /api/v1/promos/:id
 * 删除推广（需要 MANAGE 或更高权限）
 *
 * 路径参数：
 * - id: number - 推广ID
 *
 * 响应：成功消息
 *
 * **验证需求**: 7.3, 7.4
 */
promos.delete('/:id', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取推广ID
  const promoId = parseInt(c.req.param('id'), 10)
  if (isNaN(promoId) || promoId <= 0) {
    throw new ValidationError('无效的推广ID')
  }

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建推广服务实例
  const db = drizzle(c.env.DB)
  const promoService = new PromoService(db, cacheManager)

  // 删除推广（软删除）
  await promoService.delete(promoId, siteId)

  return c.json(successResponse({ message: '推广已删除' }))
})

/**
 * GET /api/v1/promos/active
 * 获取活动推广（需要认证）
 *
 * 响应：Promo[]
 *
 * **验证需求**: 7.2, 7.3, 7.5
 */
promos.get('/active', authMiddleware, siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建推广服务实例
  const db = drizzle(c.env.DB)
  const promoService = new PromoService(db, cacheManager)

  // 获取活动推广
  const activePromos = await promoService.getActive(siteId)

  return c.json(successResponse(activePromos))
})

/**
 * PUT /api/v1/promos/:id/toggle
 * 切换推广状态（需要 MANAGE 或更高权限）
 *
 * 路径参数：
 * - id: number - 推广ID
 *
 * 响应：Promo
 *
 * **验证需求**: 7.6
 */
promos.put('/:id/toggle', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取推广ID
  const promoId = parseInt(c.req.param('id'), 10)
  if (isNaN(promoId) || promoId <= 0) {
    throw new ValidationError('无效的推广ID')
  }

  // 创建缓存管理器实例
  const cacheManager = new CacheManager(c.env.CACHE)

  // 创建推广服务实例
  const db = drizzle(c.env.DB)
  const promoService = new PromoService(db, cacheManager)

  // 切换推广状态
  const promo = await promoService.toggleStatus(promoId, siteId)

  return c.json(successResponse(promo))
})

export default promos
