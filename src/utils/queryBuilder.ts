import { SQL, sql, and, or, eq, gt, lt, gte, lte, like, asc, desc } from 'drizzle-orm'
import { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { QueryParams } from '../types'
import { StatusEnum } from '../db/schema'

/**
 * 查询构建器 - 处理通用查询参数
 * 
 * 功能：
 * - 过滤：精确匹配
 * - 排序：按指定字段升序/降序
 * - 分页：page 和 pageSize
 * - 搜索：模糊匹配文本字段
 * - 比较运算符：gt, lt, gte, lte
 * - 自动应用 site_id 过滤
 * - 自动应用 status != DELETE 过滤（软删除）
 */

export interface BuildQueryOptions {
  siteId: number
  tableColumns: Record<string, SQLiteColumn>
  hasSiteId?: boolean // 表是否有 site_id 字段（默认 true）
  hasStatus?: boolean // 表是否有 status 字段（默认 true）
}

/**
 * 构建查询条件
 */
export function buildQuery(
  params: QueryParams,
  options: BuildQueryOptions
): {
  where: SQL | undefined
  orderBy: SQL | undefined
  limit: number | undefined
  offset: number | undefined
} {
  const { siteId, tableColumns, hasSiteId = true, hasStatus = true } = options
  const conditions: SQL[] = []

  // 1. 自动应用 site_id 过滤（多站点隔离）
  if (hasSiteId && tableColumns.site_id) {
    conditions.push(eq(tableColumns.site_id, siteId))
  }

  // 2. 自动应用软删除过滤（status != DELETE）
  if (hasStatus && tableColumns.status) {
    conditions.push(sql`${tableColumns.status} != ${StatusEnum.DELETE}`)
  }

  // 3. 应用过滤参数（精确匹配）
  if (params.filters) {
    for (const [field, value] of Object.entries(params.filters)) {
      const column = tableColumns[field]
      if (column && value !== undefined && value !== null) {
        conditions.push(eq(column, value))
      }
    }
  }

  // 4. 应用比较运算符
  if (params.comparisons && params.comparisons.length > 0) {
    for (const comparison of params.comparisons) {
      const column = tableColumns[comparison.field]
      if (!column) continue

      switch (comparison.operator) {
        case 'gt':
          conditions.push(gt(column, comparison.value))
          break
        case 'lt':
          conditions.push(lt(column, comparison.value))
          break
        case 'gte':
          conditions.push(gte(column, comparison.value))
          break
        case 'lte':
          conditions.push(lte(column, comparison.value))
          break
      }
    }
  }

  // 5. 应用搜索参数（模糊匹配）
  if (params.search && params.searchFields && params.searchFields.length > 0) {
    const searchConditions: SQL[] = []
    const searchPattern = `%${params.search}%`

    for (const field of params.searchFields) {
      const column = tableColumns[field]
      if (column) {
        searchConditions.push(like(column, searchPattern))
      }
    }

    if (searchConditions.length > 0) {
      conditions.push(or(...searchConditions)!)
    }
  }

  // 6. 构建 WHERE 子句
  const where = conditions.length > 0 ? and(...conditions) : undefined

  // 7. 构建 ORDER BY 子句
  let orderBy: SQL | undefined
  if (params.sort && tableColumns[params.sort]) {
    const column = tableColumns[params.sort]
    orderBy = params.sortOrder === 'desc' ? desc(column) : asc(column)
  }

  // 8. 构建分页参数
  const page = params.page && params.page > 0 ? params.page : 1
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10
  const limit = pageSize
  const offset = (page - 1) * pageSize

  return {
    where,
    orderBy,
    limit,
    offset
  }
}

/**
 * 应用站点过滤（用于手动查询）
 */
export function applySiteFilter(
  column: SQLiteColumn,
  siteId: number
): SQL {
  return eq(column, siteId)
}

/**
 * 应用软删除过滤（用于手动查询）
 */
export function applySoftDeleteFilter(
  column: SQLiteColumn
): SQL {
  return sql`${column} != ${StatusEnum.DELETE}`
}
