/**
 * Channel Service
 *
 * 管理频道的 CRUD 操作和层级树结构。
 * 实现父频道验证、软删除和缓存功能。
 *
 * **验证需求**: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { and, eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { ChannelTypeEnum, channels, StatusEnum } from '../db/schema'
import { NotFoundError, ValidationError } from '../errors'
import type { Channel, ChannelTree, CreateChannelInput, UpdateChannelInput } from '../types'
import type { CacheManager } from './cacheManager'

export class ChannelService {
  constructor(
    private db: DrizzleD1Database,
    private cacheManager: CacheManager
  ) {}

  /**
   * 创建频道
   *
   * 如果提供 pid，验证父频道存在且未被删除。
   * 创建后使缓存失效。
   *
   * @param data - 频道创建数据
   * @param siteId - 站点ID
   * @returns 创建的频道
   *
   * **验证需求**: 3.1, 3.2
   */
  async create(data: CreateChannelInput, siteId: number): Promise<Channel> {
    // 如果提供了父频道ID，验证父频道存在
    if (data.pid && data.pid !== 0) {
      const isValidParent = await this.validateParent(data.pid, siteId)
      if (!isValidParent) {
        throw new ValidationError('父频道不存在或已被删除')
      }
    }

    const now = new Date()

    // 插入频道记录
    const [result] = await this.db
      .insert(channels)
      .values({
        name: data.name,
        pid: data.pid ?? 0,
        sort: data.sort ?? 0,
        keywords: data.keywords ?? '',
        description: data.description ?? '',
        type: data.type ?? ChannelTypeEnum.ARTICLE,
        status: StatusEnum.NORMAL,
        img: data.img ?? '',
        site_id: siteId,
        created_at: now,
        update_at: now,
      })
      .returning()

    // 使缓存失效
    await this.invalidateCache(siteId)

    return result as Channel
  }

  /**
   * 更新频道
   *
   * 如果更新 pid，验证父频道存在。
   * 不更新已删除的频道。
   * 更新后使缓存失效。
   *
   * @param id - 频道ID
   * @param data - 频道更新数据
   * @param siteId - 站点ID
   * @returns 更新后的频道
   *
   * **验证需求**: 3.2, 3.4
   */
  async update(id: number, data: UpdateChannelInput, siteId: number): Promise<Channel> {
    // 检查频道是否存在且未被删除
    const existingChannel = await this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.id, id),
          eq(channels.site_id, siteId),
          eq(channels.status, StatusEnum.NORMAL)
        )
      )
      .get()

    if (!existingChannel) {
      throw new NotFoundError('频道不存在或已被删除')
    }

    // 如果更新父频道ID，验证父频道存在
    if (data.pid !== undefined && data.pid !== 0 && data.pid !== existingChannel.pid) {
      // 防止将频道设置为自己的子频道
      if (data.pid === id) {
        throw new ValidationError('频道不能设置为自己的子频道')
      }

      const isValidParent = await this.validateParent(data.pid, siteId)
      if (!isValidParent) {
        throw new ValidationError('父频道不存在或已被删除')
      }
    }

    // 准备更新数据
    const updateData: any = {
      update_at: new Date(),
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.pid !== undefined) updateData.pid = data.pid
    if (data.sort !== undefined) updateData.sort = data.sort
    if (data.keywords !== undefined) updateData.keywords = data.keywords
    if (data.description !== undefined) updateData.description = data.description
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (data.img !== undefined) updateData.img = data.img

    // 更新频道记录
    const [result] = await this.db
      .update(channels)
      .set(updateData)
      .where(eq(channels.id, id))
      .returning()

    // 使缓存失效
    await this.invalidateCache(siteId)

    return result as Channel
  }

  /**
   * 软删除频道
   *
   * 将 status 设置为 StatusEnum.DELETE，更新 update_at。
   * 删除后使缓存失效。
   *
   * @param id - 频道ID
   * @param siteId - 站点ID
   *
   * **验证需求**: 3.4
   */
  async delete(id: number, siteId: number): Promise<void> {
    const now = new Date()

    const result = await this.db
      .update(channels)
      .set({
        status: StatusEnum.DELETE,
        update_at: now,
      })
      .where(and(eq(channels.id, id), eq(channels.site_id, siteId)))
      .returning()

    if (result.length === 0) {
      throw new NotFoundError('频道不存在')
    }

    // 使缓存失效
    await this.invalidateCache(siteId)
  }

  /**
   * 获取频道树
   *
   * 构建层级树结构，按 sort 字段升序排列。
   * 使用缓存（缓存键：site:{siteId}:channels:tree）。
   * 如果缓存不存在，从数据库查询并构建树。
   *
   * @param siteId - 站点ID
   * @returns 频道树数组
   *
   * **验证需求**: 3.3, 3.5, 3.6
   */
  async getTree(siteId: number): Promise<ChannelTree[]> {
    // 生成缓存键
    const cacheKey = this.cacheManager.generateKey('site', siteId.toString(), 'channels', 'tree')

    // 尝试从缓存获取
    const cachedTree = await this.cacheManager.get<ChannelTree[]>(cacheKey)
    if (cachedTree) {
      return cachedTree
    }

    // 从数据库查询所有未删除的频道
    const allChannels = await this.db
      .select()
      .from(channels)
      .where(and(eq(channels.site_id, siteId), eq(channels.status, StatusEnum.NORMAL)))
      .orderBy(channels.sort)
      .all()

    // 构建树结构
    const tree = this.buildTree(allChannels as Channel[], 0)

    // 缓存树结构（TTL: 5分钟 = 300秒）
    await this.cacheManager.set(cacheKey, tree, 300)

    return tree
  }

  /**
   * 验证父频道是否存在
   *
   * 检查父频道在指定站点内是否存在且未被删除。
   *
   * @param pid - 父频道ID
   * @param siteId - 站点ID
   * @returns true 表示父频道有效，false 表示不存在或已删除
   *
   * **验证需求**: 3.2
   */
  async validateParent(pid: number, siteId: number): Promise<boolean> {
    const parentChannel = await this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.id, pid),
          eq(channels.site_id, siteId),
          eq(channels.status, StatusEnum.NORMAL)
        )
      )
      .get()

    return !!parentChannel
  }

  /**
   * 构建层级树结构
   *
   * 递归构建频道树，支持无限嵌套深度。
   *
   * @param allChannels - 所有频道列表
   * @param parentId - 父频道ID
   * @returns 频道树数组
   *
   * **验证需求**: 3.3, 3.5
   */
  private buildTree(allChannels: Channel[], parentId: number): ChannelTree[] {
    const tree: ChannelTree[] = []

    for (const channel of allChannels) {
      if (channel.pid === parentId) {
        const node: ChannelTree = {
          ...channel,
          children: this.buildTree(allChannels, channel.id),
        }
        tree.push(node)
      }
    }

    return tree
  }

  /**
   * 使频道缓存失效
   *
   * 删除指定站点的频道树缓存。
   *
   * @param siteId - 站点ID
   */
  private async invalidateCache(siteId: number): Promise<void> {
    const cacheKey = this.cacheManager.generateKey('site', siteId.toString(), 'channels', 'tree')
    await this.cacheManager.delete(cacheKey)
  }
}
