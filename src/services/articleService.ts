/**
 * Article Service
 * 
 * 管理文章的 CRUD 操作和查询功能。
 * 实现频道验证、软删除、完整查询规范（过滤、排序、分页、搜索）。
 * 
 * **验证需求**: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { eq, and } from 'drizzle-orm'
import { DrizzleD1Database } from 'drizzle-orm/d1'
import { articles, channels, StatusEnum, ArticleTypeEnum } from '../db/schema'
import { 
  Article, 
  CreateArticleInput, 
  UpdateArticleInput,
  QueryParams,
  PaginatedResult
} from '../types'
import { buildQuery } from '../utils/queryBuilder'
import { NotFoundError, ValidationError } from '../errors'

export class ArticleService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * 创建文章
   * 
   * 验证关联的频道在相同 site_id 下存在且未被删除。
   * 自动设置 status 为 PENDING，记录创建时间。
   * 
   * @param data - 文章创建数据
   * @param siteId - 站点ID
   * @param userId - 创建用户ID
   * @returns 创建的文章
   * 
   * **验证需求**: 2.1, 2.2
   */
  async create(data: CreateArticleInput, siteId: number, userId: number): Promise<Article> {
    // 验证频道存在且属于相同站点
    const channel = await this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.id, data.channel_id),
          eq(channels.site_id, siteId),
          eq(channels.status, StatusEnum.NORMAL)
        )
      )
      .get()

    if (!channel) {
      throw new ValidationError('频道不存在或已被删除')
    }

    const now = new Date()

    // 插入文章记录
    const [result] = await this.db
      .insert(articles)
      .values({
        title: data.title,
        channel_id: data.channel_id,
        tags: data.tags ?? '',
        description: data.description ?? '',
        content: data.content ?? '',
        markdown: data.markdown ?? '',
        img: data.img ?? '',
        video: data.video ?? '',
        author: data.author ?? '',
        author_id: data.author_id ?? null,
        origin: data.origin ?? '',
        origin_id: data.origin_id ?? null,
        editor_id: data.editor_id ?? null,
        user_id: userId,
        type: data.type ?? ArticleTypeEnum.NORMAL,
        status: StatusEnum.PENDING,
        is_top: data.is_top ?? 0,
        site_id: siteId,
        created_at: now,
        update_at: now
      })
      .returning()

    return result as Article
  }

  /**
   * 更新文章
   * 
   * 如果更新 channel_id，验证新频道存在且属于相同站点。
   * 不更新已删除的文章。
   * 
   * @param id - 文章ID
   * @param data - 文章更新数据
   * @param siteId - 站点ID
   * @returns 更新后的文章
   * 
   * **验证需求**: 2.3
   */
  async update(id: number, data: UpdateArticleInput, siteId: number): Promise<Article> {
    // 检查文章是否存在且未被删除
    const existingArticle = await this.db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.id, id),
          eq(articles.site_id, siteId),
          eq(articles.status, StatusEnum.NORMAL)
        )
      )
      .get()

    if (!existingArticle) {
      throw new NotFoundError('文章不存在或已被删除')
    }

    // 如果更新频道ID，验证新频道存在
    if (data.channel_id !== undefined && data.channel_id !== existingArticle.channel_id) {
      const channel = await this.db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.id, data.channel_id),
            eq(channels.site_id, siteId),
            eq(channels.status, StatusEnum.NORMAL)
          )
        )
        .get()

      if (!channel) {
        throw new ValidationError('频道不存在或已被删除')
      }
    }

    // 准备更新数据
    const updateData: any = {
      update_at: new Date()
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.channel_id !== undefined) updateData.channel_id = data.channel_id
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.description !== undefined) updateData.description = data.description
    if (data.content !== undefined) updateData.content = data.content
    if (data.markdown !== undefined) updateData.markdown = data.markdown
    if (data.img !== undefined) updateData.img = data.img
    if (data.video !== undefined) updateData.video = data.video
    if (data.author !== undefined) updateData.author = data.author
    if (data.author_id !== undefined) updateData.author_id = data.author_id
    if (data.origin !== undefined) updateData.origin = data.origin
    if (data.origin_id !== undefined) updateData.origin_id = data.origin_id
    if (data.editor_id !== undefined) updateData.editor_id = data.editor_id
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (data.is_top !== undefined) updateData.is_top = data.is_top

    // 更新文章记录
    const [result] = await this.db
      .update(articles)
      .set(updateData)
      .where(eq(articles.id, id))
      .returning()

    return result as Article
  }

  /**
   * 软删除文章
   * 
   * 将 status 设置为 StatusEnum.DELETE，更新 update_at。
   * 
   * @param id - 文章ID
   * @param siteId - 站点ID
   * 
   * **验证需求**: 2.4
   */
  async delete(id: number, siteId: number): Promise<void> {
    const now = new Date()

    const result = await this.db
      .update(articles)
      .set({
        status: StatusEnum.DELETE,
        update_at: now
      })
      .where(
        and(
          eq(articles.id, id),
          eq(articles.site_id, siteId)
        )
      )
      .returning()

    if (result.length === 0) {
      throw new NotFoundError('文章不存在')
    }
  }

  /**
   * 查询文章列表
   * 
   * 支持完整查询规范：
   * - 过滤：精确匹配（filters）
   * - 排序：按指定字段升序/降序（sort, sortOrder）
   * - 分页：page 和 pageSize
   * - 搜索：模糊匹配文本字段（search, searchFields）
   * - 比较运算符：gt, lt, gte, lte（comparisons）
   * 
   * 自动过滤 site_id 和软删除记录。
   * 
   * @param params - 查询参数
   * @param siteId - 站点ID
   * @returns 分页结果
   * 
   * **验证需求**: 2.5, 2.6
   */
  async query(params: QueryParams, siteId: number): Promise<PaginatedResult<Article>> {
    // 构建查询条件
    const { where, orderBy, limit, offset } = buildQuery(params, {
      siteId,
      tableColumns: articles as any
    })

    // 查询数据
    let query = this.db
      .select()
      .from(articles)
      .where(where)
    
    if (orderBy) {
      query = query.orderBy(orderBy) as any
    }
    
    const data = await query
      .limit(limit!)
      .offset(offset!)
      .all()

    // 查询总数
    const countResult = await this.db
      .select()
      .from(articles)
      .where(where)
      .all()
    
    const total = countResult.length

    // 计算分页信息
    const page = params.page && params.page > 0 ? params.page : 1
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10
    const totalPages = Math.ceil(total / pageSize)

    return {
      data: data as Article[],
      total,
      page,
      pageSize,
      totalPages
    }
  }

  /**
   * 获取单个文章
   * 
   * 根据 ID 获取文章详情。
   * 自动过滤 site_id 和软删除记录。
   * 
   * @param id - 文章ID
   * @param siteId - 站点ID
   * @returns 文章详情
   * 
   * **验证需求**: 2.7
   */
  async getById(id: number, siteId: number): Promise<Article> {
    const article = await this.db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.id, id),
          eq(articles.site_id, siteId),
          eq(articles.status, StatusEnum.NORMAL)
        )
      )
      .get()

    if (!article) {
      throw new NotFoundError('文章不存在或已被删除')
    }

    return article as Article
  }
}
