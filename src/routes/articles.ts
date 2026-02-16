/**
 * 文章路由
 * 
 * 实现文章管理相关的 API 端点：
 * - POST /api/v1/article - 创建文章（需要 EDITOR 或更高权限）
 * - PUT /api/v1/article/:id - 更新文章（需要 EDITOR 或更高权限）
 * - DELETE /api/v1/article/:id - 删除文章（需要 MANAGE 或更高权限）
 * - GET /api/v1/article - 查询文章列表（需要认证）
 * - GET /api/v1/article/:id - 获取单个文章（需要认证）
 * 
 * **验证需求**: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { ArticleService } from '../services/articleService'
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
  CreateArticleInput, 
  UpdateArticleInput,
  QueryParams
} from '../types'

const articles = new Hono()

/**
 * POST /api/v1/articles
 * 创建文章（需要认证）
 * 
 * 权限说明：
 * - USER 权限：可以创建文章，默认状态为 PENDING（待审核）
 * - EDITOR、MANAGE、SUPERMANAGE 权限：可以创建文章，默认状态为 NORMAL（正常）
 * 
 * 请求体：CreateArticleInput
 * 
 * 响应：Article
 * 
 * **验证需求**: 2.1, 2.2
 */
articles.post('/', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 所有认证用户都可以创建文章
  // USER 权限创建的文章默认为 PENDING 状态
  // EDITOR 及以上权限创建的文章默认为 NORMAL 状态

  // 获取请求体
  const body = await c.req.json() as CreateArticleInput

  // 验证必填字段
  if (!body.title) {
    throw new ValidationError('文章标题不能为空')
  }

  if (!body.channel_id) {
    throw new ValidationError('频道ID不能为空')
  }

  // 创建文章服务实例
  const db = drizzle(c.env.DB)
  const articleService = new ArticleService(db)

  // 创建文章，传递用户权限类型
  const article = await articleService.create(body, siteId, authContext.userId, authContext.type)

  return c.json(successResponse(article), 201)
})

/**
 * PUT /api/v1/articles/:id
 * 更新文章（需要 EDITOR 或更高权限）
 * 
 * 路径参数：
 * - id: number - 文章ID
 * 
 * 请求体：UpdateArticleInput
 * 
 * 响应：Article
 * 
 * **验证需求**: 2.3
 */
articles.put('/:id', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 EDITOR 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.EDITOR)) {
    throw new AuthorizationError('权限不足，需要 EDITOR 或更高权限')
  }

  // 获取文章ID
  const articleId = parseInt(c.req.param('id'), 10)
  if (isNaN(articleId) || articleId <= 0) {
    throw new ValidationError('无效的文章ID')
  }

  // 获取请求体
  const body = await c.req.json() as UpdateArticleInput

  // 创建文章服务实例
  const db = drizzle(c.env.DB)
  const articleService = new ArticleService(db)

  // 更新文章
  const article = await articleService.update(articleId, body, siteId)

  return c.json(successResponse(article))
})

/**
 * DELETE /api/v1/articles/:id
 * 删除文章（需要 MANAGE 或更高权限）
 * 
 * 路径参数：
 * - id: number - 文章ID
 * 
 * 响应：成功消息
 * 
 * **验证需求**: 2.4
 */
articles.delete('/:id', authMiddleware, siteMiddleware, auditMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取文章ID
  const articleId = parseInt(c.req.param('id'), 10)
  if (isNaN(articleId) || articleId <= 0) {
    throw new ValidationError('无效的文章ID')
  }

  // 创建文章服务实例
  const db = drizzle(c.env.DB)
  const articleService = new ArticleService(db)

  // 删除文章（软删除）
  await articleService.delete(articleId, siteId)

  return c.json(successResponse({ message: '文章已删除' }))
})

/**
 * GET /api/v1/articles
 * 查询文章列表（需要认证，支持分页、过滤、排序和搜索）
 * 
 * 查询参数：
 * - page: number - 页码（默认 1）
 * - pageSize: number - 每页数量（默认 10）
 * - filters: object - 精确匹配过滤条件（如 channel_id, type, status）
 * - sort: string - 排序字段
 * - sortOrder: 'asc' | 'desc' - 排序方向
 * - search: string - 搜索关键词
 * - searchFields: string[] - 搜索字段（如 title, content）
 * - comparisons: object - 比较运算符过滤（如 gt, lt, gte, lte）
 * 
 * 响应：PaginatedResult<Article>
 * 
 * **验证需求**: 2.5
 */
articles.get('/', authMiddleware, siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)

  // 获取查询参数
  const page = parseInt(c.req.query('page') || '1', 10)
  const pageSize = parseInt(c.req.query('pageSize') || '10', 10)
  const sort = c.req.query('sort')
  const sortOrder = c.req.query('sortOrder') as 'asc' | 'desc' | undefined
  const search = c.req.query('search')
  const searchFields = c.req.query('searchFields')?.split(',')
  
  // 解析 filters 和 comparisons（如果作为 JSON 字符串传递）
  let filters: Record<string, any> | undefined
  let comparisons: { field: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: any }[] | undefined
  
  const filtersParam = c.req.query('filters')
  if (filtersParam) {
    try {
      filters = JSON.parse(filtersParam)
    } catch (e) {
      throw new ValidationError('无效的 filters 参数格式')
    }
  }
  
  const comparisonsParam = c.req.query('comparisons')
  if (comparisonsParam) {
    try {
      comparisons = JSON.parse(comparisonsParam)
    } catch (e) {
      throw new ValidationError('无效的 comparisons 参数格式')
    }
  }

  // 验证分页参数
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    throw new ValidationError('无效的分页参数')
  }

  // 构建查询参数
  const queryParams: QueryParams = {
    page,
    pageSize,
    filters,
    sort,
    sortOrder,
    search,
    searchFields,
    comparisons
  }

  // 创建文章服务实例
  const db = drizzle(c.env.DB)
  const articleService = new ArticleService(db)

  // 查询文章列表
  const result = await articleService.query(queryParams, siteId)

  return c.json(successResponse(result))
})

/**
 * GET /api/v1/articles/:id
 * 获取单个文章（需要认证）
 * 
 * 路径参数：
 * - id: number - 文章ID
 * 
 * 响应：Article
 * 
 * **验证需求**: 2.5
 */
articles.get('/:id', authMiddleware, siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)

  // 获取文章ID
  const articleId = parseInt(c.req.param('id'), 10)
  if (isNaN(articleId) || articleId <= 0) {
    throw new ValidationError('无效的文章ID')
  }

  // 创建文章服务实例
  const db = drizzle(c.env.DB)
  const articleService = new ArticleService(db)

  // 获取文章详情
  const article = await articleService.getById(articleId, siteId)

  return c.json(successResponse(article))
})

export default articles
