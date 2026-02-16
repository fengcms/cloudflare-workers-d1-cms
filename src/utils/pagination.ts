/**
 * 分页工具模块
 * 提供分页计算和结果格式化功能
 */

import type { PaginatedResult } from '../types'

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page: number
  pageSize: number
  totalCount: number
}

/**
 * 分页计算结果接口
 */
export interface PaginationMeta {
  offset: number
  limit: number
  totalPages: number
  page: number
  pageSize: number
}

/**
 * 默认分页大小
 */
export const DEFAULT_PAGE_SIZE = 20

/**
 * 计算分页元数据
 *
 * @param page - 页码（从1开始）
 * @param pageSize - 每页大小
 * @param totalCount - 总记录数
 * @returns 分页元数据，包含 offset、limit、totalPages 等
 *
 * @example
 * const meta = calculatePagination(2, 10, 45)
 * // { offset: 10, limit: 10, totalPages: 5, page: 2, pageSize: 10 }
 */
export function calculatePagination(
  page: number,
  pageSize: number,
  totalCount: number
): PaginationMeta {
  // 处理边界情况：page < 1 时设为 1
  const normalizedPage = Math.max(1, page)

  // 处理边界情况：pageSize < 1 时使用默认值
  const normalizedPageSize = pageSize < 1 ? DEFAULT_PAGE_SIZE : pageSize

  // 计算总页数（向上取整）
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / normalizedPageSize)

  // 计算数据库查询的偏移量
  const offset = (normalizedPage - 1) * normalizedPageSize

  return {
    offset,
    limit: normalizedPageSize,
    totalPages,
    page: normalizedPage,
    pageSize: normalizedPageSize,
  }
}

/**
 * 创建分页结果
 *
 * @param data - 数据数组
 * @param page - 页码
 * @param pageSize - 每页大小
 * @param totalCount - 总记录数
 * @returns 格式化的分页结果
 *
 * @example
 * const result = paginate([...items], 1, 10, 45)
 * // { data: [...], total: 45, page: 1, pageSize: 10, totalPages: 5 }
 */
export function paginate<T>(
  data: T[],
  page: number,
  pageSize: number,
  totalCount: number
): PaginatedResult<T> {
  const meta = calculatePagination(page, pageSize, totalCount)

  return {
    data,
    total: totalCount,
    page: meta.page,
    pageSize: meta.pageSize,
    totalPages: meta.totalPages,
  }
}
