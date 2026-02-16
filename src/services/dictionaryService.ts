/**
 * Dictionary Service
 *
 * 管理可重用的元数据条目（作者、来源、标签、友情链接）。
 * 实现字典条目的创建、更新、软删除和按类型查询功能。
 *
 * **验证需求**: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { and, eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { type DictTypeEnum, dicts, StatusEnum } from '../db/schema'
import { NotFoundError } from '../errors'
import type { CreateDictInput, Dict, UpdateDictInput } from '../types'

export class DictionaryService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * 创建字典条目
   *
   * 存储类型、名称、值和站点ID。
   *
   * @param data - 字典条目创建数据
   * @param siteId - 站点ID
   * @returns 创建的字典条目
   *
   * **验证需求**: 6.1, 6.2
   */
  async create(data: CreateDictInput, siteId: number): Promise<Dict> {
    const now = new Date()

    // 插入字典条目记录
    const [result] = await this.db
      .insert(dicts)
      .values({
        name: data.name,
        type: data.type,
        value: data.value ?? '',
        sort: data.sort ?? 0,
        site_id: siteId,
        status: StatusEnum.NORMAL,
        created_at: now,
        update_at: now,
      })
      .returning()

    return result as Dict
  }

  /**
   * 更新字典条目
   *
   * 修改指定字段并更新 update_at 时间戳。
   * 不更新已删除的字典条目。
   *
   * @param id - 字典条目ID
   * @param data - 字典条目更新数据
   * @param siteId - 站点ID
   * @returns 更新后的字典条目
   *
   * **验证需求**: 6.3
   */
  async update(id: number, data: UpdateDictInput, siteId: number): Promise<Dict> {
    // 检查字典条目是否存在且未被删除
    const existingDict = await this.db
      .select()
      .from(dicts)
      .where(and(eq(dicts.id, id), eq(dicts.site_id, siteId), eq(dicts.status, StatusEnum.NORMAL)))
      .get()

    if (!existingDict) {
      throw new NotFoundError('字典条目不存在或已被删除')
    }

    // 准备更新数据
    const updateData: any = {
      update_at: new Date(),
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.value !== undefined) updateData.value = data.value
    if (data.sort !== undefined) updateData.sort = data.sort
    if (data.status !== undefined) updateData.status = data.status

    // 更新字典条目记录
    const [result] = await this.db.update(dicts).set(updateData).where(eq(dicts.id, id)).returning()

    return result as Dict
  }

  /**
   * 软删除字典条目
   *
   * 将 status 设置为 StatusEnum.DELETE，更新 update_at。
   *
   * @param id - 字典条目ID
   * @param siteId - 站点ID
   *
   * **验证需求**: 6.4
   */
  async delete(id: number, siteId: number): Promise<void> {
    const now = new Date()

    const result = await this.db
      .update(dicts)
      .set({
        status: StatusEnum.DELETE,
        update_at: now,
      })
      .where(and(eq(dicts.id, id), eq(dicts.site_id, siteId)))
      .returning()

    if (result.length === 0) {
      throw new NotFoundError('字典条目不存在')
    }
  }

  /**
   * 按类型查询字典条目
   *
   * 按类型和站点ID过滤，排除已删除的记录。
   * 按 sort 字段升序排列。
   *
   * @param type - 字典类型
   * @param siteId - 站点ID
   * @returns 字典条目数组
   *
   * **验证需求**: 6.3, 6.5
   */
  async queryByType(type: DictTypeEnum, siteId: number): Promise<Dict[]> {
    const results = await this.db
      .select()
      .from(dicts)
      .where(
        and(eq(dicts.type, type), eq(dicts.site_id, siteId), eq(dicts.status, StatusEnum.NORMAL))
      )
      .orderBy(dicts.sort)
      .all()

    return results as Dict[]
  }
}
