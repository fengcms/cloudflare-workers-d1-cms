/**
 * Promo Service
 *
 * 管理推广的 CRUD 操作和时间范围查询。
 * 实现软删除、状态切换和缓存功能。
 *
 * **验证需求**: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { and, eq, gte, lte } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { promos, StatusEnum } from '../db/schema'
import { NotFoundError } from '../errors'
import type { CreatePromoInput, Promo, UpdatePromoInput } from '../types'
import type { CacheManager } from './cacheManager'

export class PromoService {
  constructor(
    private db: DrizzleD1Database,
    private cacheManager: CacheManager
  ) {}

  /**
   * 创建推广
   *
   * 创建新的推广记录，设置默认状态为 NORMAL。
   * 创建后使缓存失效。
   *
   * @param data - 推广创建数据
   * @param siteId - 站点ID
   * @returns 创建的推广
   *
   * **验证需求**: 7.1
   */
  async create(data: CreatePromoInput, siteId: number): Promise<Promo> {
    const now = new Date()

    // 转换时间戳为 Date 对象（如果是数字）
    let startTime: Date | null = null
    let endTime: Date | null = null

    if (data.start_time !== undefined && data.start_time !== null) {
      startTime =
        typeof data.start_time === 'number' ? new Date(data.start_time * 1000) : data.start_time
    }

    if (data.end_time !== undefined && data.end_time !== null) {
      endTime = typeof data.end_time === 'number' ? new Date(data.end_time * 1000) : data.end_time
    }

    // 插入推广记录
    const [result] = await this.db
      .insert(promos)
      .values({
        title: data.title,
        img: data.img ?? '',
        url: data.url ?? '',
        position: data.position ?? '',
        content: data.content ?? '',
        start_time: startTime,
        end_time: endTime,
        sort: data.sort ?? 0,
        status: StatusEnum.NORMAL,
        site_id: siteId,
        created_at: now,
        update_at: now,
      })
      .returning()

    // 使缓存失效
    await this.invalidateCache(siteId)

    return result as Promo
  }

  /**
   * 更新推广
   *
   * 更新指定推广的字段。
   * 不更新已删除的推广。
   * 更新后使缓存失效。
   *
   * @param id - 推广ID
   * @param data - 推广更新数据
   * @param siteId - 站点ID
   * @returns 更新后的推广
   *
   * **验证需求**: 7.2
   */
  async update(id: number, data: UpdatePromoInput, siteId: number): Promise<Promo> {
    // 检查推广是否存在且未被删除
    const existingPromo = await this.db
      .select()
      .from(promos)
      .where(
        and(eq(promos.id, id), eq(promos.site_id, siteId), eq(promos.status, StatusEnum.NORMAL))
      )
      .get()

    if (!existingPromo) {
      throw new NotFoundError('推广不存在或已被删除')
    }

    // 准备更新数据
    const updateData: any = {
      update_at: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.img !== undefined) updateData.img = data.img
    if (data.url !== undefined) updateData.url = data.url
    if (data.position !== undefined) updateData.position = data.position
    if (data.content !== undefined) updateData.content = data.content
    if (data.start_time !== undefined) {
      updateData.start_time =
        typeof data.start_time === 'number' ? new Date(data.start_time * 1000) : data.start_time
    }
    if (data.end_time !== undefined) {
      updateData.end_time =
        typeof data.end_time === 'number' ? new Date(data.end_time * 1000) : data.end_time
    }
    if (data.sort !== undefined) updateData.sort = data.sort
    if (data.status !== undefined) updateData.status = data.status

    // 更新推广记录
    const [result] = await this.db
      .update(promos)
      .set(updateData)
      .where(eq(promos.id, id))
      .returning()

    // 使缓存失效
    await this.invalidateCache(siteId)

    return result as Promo
  }

  /**
   * 软删除推广
   *
   * 将 status 设置为 StatusEnum.DELETE，更新 update_at。
   * 删除后使缓存失效。
   *
   * @param id - 推广ID
   * @param siteId - 站点ID
   *
   * **验证需求**: 7.3, 7.4
   */
  async delete(id: number, siteId: number): Promise<void> {
    const now = new Date()

    const result = await this.db
      .update(promos)
      .set({
        status: StatusEnum.DELETE,
        update_at: now,
      })
      .where(and(eq(promos.id, id), eq(promos.site_id, siteId)))
      .returning()

    if (result.length === 0) {
      throw new NotFoundError('推广不存在')
    }

    // 使缓存失效
    await this.invalidateCache(siteId)
  }

  /**
   * 获取当前活动的推广
   *
   * 查询当前时间在 start_time 和 end_time 之间的推广。
   * 排除已删除的推广，按 sort 字段升序排列。
   * 使用缓存（缓存键：site:{siteId}:promos:active）。
   *
   * @param siteId - 站点ID
   * @returns 活动推广数组
   *
   * **验证需求**: 7.2, 7.3, 7.5
   */
  async getActive(siteId: number): Promise<Promo[]> {
    // 生成缓存键
    const cacheKey = this.cacheManager.generateKey('site', siteId.toString(), 'promos', 'active')

    // 尝试从缓存获取
    const cachedPromos = await this.cacheManager.get<Promo[]>(cacheKey)
    if (cachedPromos) {
      return cachedPromos
    }

    const now = new Date()

    // 从数据库查询当前活动的推广
    const activePromos = await this.db
      .select()
      .from(promos)
      .where(
        and(
          eq(promos.site_id, siteId),
          eq(promos.status, StatusEnum.NORMAL),
          lte(promos.start_time, now),
          gte(promos.end_time, now)
        )
      )
      .orderBy(promos.sort)
      .all()

    // 缓存结果（TTL: 5分钟 = 300秒）
    await this.cacheManager.set(cacheKey, activePromos, 300)

    return activePromos as Promo[]
  }

  /**
   * 切换推广状态
   *
   * 在 NORMAL 和 PENDING 状态之间切换。
   * 不能切换已删除的推广。
   * 切换后使缓存失效。
   *
   * @param id - 推广ID
   * @param siteId - 站点ID
   * @returns 更新后的推广
   *
   * **验证需求**: 7.6
   */
  async toggleStatus(id: number, siteId: number): Promise<Promo> {
    // 获取当前推广
    const existingPromo = await this.db
      .select()
      .from(promos)
      .where(and(eq(promos.id, id), eq(promos.site_id, siteId)))
      .get()

    if (!existingPromo) {
      throw new NotFoundError('推广不存在')
    }

    // 不能切换已删除的推广
    if (existingPromo.status === StatusEnum.DELETE) {
      throw new NotFoundError('推广已被删除')
    }

    // 切换状态：NORMAL <-> PENDING
    const newStatus =
      existingPromo.status === StatusEnum.NORMAL ? StatusEnum.PENDING : StatusEnum.NORMAL

    // 更新状态
    const [result] = await this.db
      .update(promos)
      .set({
        status: newStatus,
        update_at: new Date(),
      })
      .where(eq(promos.id, id))
      .returning()

    // 使缓存失效
    await this.invalidateCache(siteId)

    return result as Promo
  }

  /**
   * 使推广缓存失效
   *
   * 删除指定站点的活动推广缓存。
   *
   * @param siteId - 站点ID
   */
  private async invalidateCache(siteId: number): Promise<void> {
    const cacheKey = this.cacheManager.generateKey('site', siteId.toString(), 'promos', 'active')
    await this.cacheManager.delete(cacheKey)
  }
}
