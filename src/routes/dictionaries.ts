/**
 * 字典路由
 * 
 * 实现字典管理相关的 API 端点：
 * - POST /api/v1/dict - 创建字典条目（需要 MANAGE 或更高权限）
 * - PUT /api/v1/dict/:id - 更新字典条目（需要 MANAGE 或更高权限）
 * - DELETE /api/v1/dict/:id - 删除字典条目（需要 MANAGE 或更高权限）
 * - GET /api/v1/dict - 查询字典条目（需要认证，支持类型过滤）
 * 
 * **验证需求**: 6.1, 6.2, 6.3, 6.4
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { DictionaryService } from '../services/dictionaryService'
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
  CreateDictInput, 
  UpdateDictInput,
  DictTypeEnum
} from '../types'

const dictionaries = new Hono()

/**
 * POST /api/v1/dictionaries
 * 创建字典条目（需要 MANAGE 或更高权限）
 * 
 * 请求体：CreateDictInput
 * 
 * 响应：Dict
 * 
 * **验证需求**: 6.1, 6.2
 */
dictionaries.post('/', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取请求体
  const body = await c.req.json() as CreateDictInput

  // 验证必填字段
  if (!body.name || !body.type) {
    throw new ValidationError('字典名称和类型不能为空')
  }

  // 创建字典服务实例
  const db = drizzle(c.env.DB)
  const dictionaryService = new DictionaryService(db)

  // 创建字典条目
  const dict = await dictionaryService.create(body, siteId)

  return c.json(successResponse(dict), 201)
})

/**
 * PUT /api/v1/dictionaries/:id
 * 更新字典条目（需要 MANAGE 或更高权限）
 * 
 * 路径参数：
 * - id: number - 字典条目ID
 * 
 * 请求体：UpdateDictInput
 * 
 * 响应：Dict
 * 
 * **验证需求**: 6.3
 */
dictionaries.put('/:id', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取字典条目ID
  const dictId = parseInt(c.req.param('id'), 10)
  if (isNaN(dictId) || dictId <= 0) {
    throw new ValidationError('无效的字典条目ID')
  }

  // 获取请求体
  const body = await c.req.json() as UpdateDictInput

  // 创建字典服务实例
  const db = drizzle(c.env.DB)
  const dictionaryService = new DictionaryService(db)

  // 更新字典条目
  const dict = await dictionaryService.update(dictId, body, siteId)

  return c.json(successResponse(dict))
})

/**
 * DELETE /api/v1/dictionaries/:id
 * 删除字典条目（需要 MANAGE 或更高权限）
 * 
 * 路径参数：
 * - id: number - 字典条目ID
 * 
 * 响应：成功消息
 * 
 * **验证需求**: 6.4
 */
dictionaries.delete('/:id', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取字典条目ID
  const dictId = parseInt(c.req.param('id'), 10)
  if (isNaN(dictId) || dictId <= 0) {
    throw new ValidationError('无效的字典条目ID')
  }

  // 创建字典服务实例
  const db = drizzle(c.env.DB)
  const dictionaryService = new DictionaryService(db)

  // 删除字典条目（软删除）
  await dictionaryService.delete(dictId, siteId)

  return c.json(successResponse({ message: '字典条目已删除' }))
})

/**
 * GET /api/v1/dictionaries
 * 查询字典条目（需要认证，支持类型过滤）
 * 
 * 查询参数：
 * - type: DictTypeEnum - 字典类型过滤（可选）
 * 
 * 响应：Dict[]
 * 
 * **验证需求**: 6.3
 */
dictionaries.get('/', authMiddleware, siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)

  // 获取查询参数
  const type = c.req.query('type') as DictTypeEnum | undefined

  // 验证类型参数（如果提供）
  if (type && !Object.values(DictTypeEnum).includes(type)) {
    throw new ValidationError('无效的字典类型')
  }

  // 创建字典服务实例
  const db = drizzle(c.env.DB)
  const dictionaryService = new DictionaryService(db)

  // 如果提供了类型参数，按类型查询；否则返回所有类型
  let dicts
  if (type) {
    dicts = await dictionaryService.queryByType(type, siteId)
  } else {
    // 查询所有类型的字典条目
    const allTypes = Object.values(DictTypeEnum)
    const results = await Promise.all(
      allTypes.map(t => dictionaryService.queryByType(t, siteId))
    )
    dicts = results.flat()
  }

  return c.json(successResponse(dicts))
})

export default dictionaries
