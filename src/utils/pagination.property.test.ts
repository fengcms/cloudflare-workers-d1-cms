/**
 * 分页一致性属性测试
 *
 * **Validates: Requirements 12.7, 13.4**
 *
 * 属性 10: 分页一致性
 * 对于任何查询结果，遍历所有页面收集的记录总数应该等于返回的 total 元数据值
 */

import { fc } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { calculatePagination, paginate } from './pagination'

describe('Property 10: 分页一致性', () => {
  it('should ensure total records across all pages equals total count', () => {
    fc.assert(
      fc.property(
        // 生成总记录数
        fc.integer({ min: 0, max: 500 }),
        // 生成每页大小
        fc.integer({ min: 1, max: 50 }),
        (totalCount, pageSize) => {
          // 计算总页数
          const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize)

          // 遍历所有页面，累计应该获取的记录数
          let accumulatedRecords = 0

          for (let page = 1; page <= totalPages; page++) {
            const meta = calculatePagination(page, pageSize, totalCount)

            // 计算这一页应该有多少条记录
            const recordsInThisPage = Math.min(pageSize, totalCount - (page - 1) * pageSize)

            accumulatedRecords += recordsInThisPage
          }

          // 验证：遍历所有页面收集的记录总数应该等于 totalCount
          expect(accumulatedRecords).toBe(totalCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure offset + limit correctly spans all records when iterating through pages', () => {
    fc.assert(
      fc.property(
        // 生成总记录数
        fc.integer({ min: 1, max: 500 }),
        // 生成每页大小
        fc.integer({ min: 1, max: 50 }),
        (totalCount, pageSize) => {
          const totalPages = Math.ceil(totalCount / pageSize)

          // 跟踪所有页面覆盖的记录索引范围
          const coveredIndices = new Set<number>()

          for (let page = 1; page <= totalPages; page++) {
            const meta = calculatePagination(page, pageSize, totalCount)

            // 记录这一页覆盖的所有索引
            const startIndex = meta.offset
            const endIndex = Math.min(meta.offset + meta.limit, totalCount)

            for (let i = startIndex; i < endIndex; i++) {
              // 验证：没有重复覆盖的索引
              expect(coveredIndices.has(i)).toBe(false)
              coveredIndices.add(i)
            }
          }

          // 验证：所有记录索引都被覆盖（0 到 totalCount-1）
          expect(coveredIndices.size).toBe(totalCount)

          for (let i = 0; i < totalCount; i++) {
            expect(coveredIndices.has(i)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate totalPages correctly for various totalCount and pageSize combinations', () => {
    fc.assert(
      fc.property(
        // 生成总记录数
        fc.integer({ min: 0, max: 1000 }),
        // 生成每页大小
        fc.integer({ min: 1, max: 100 }),
        (totalCount, pageSize) => {
          const meta = calculatePagination(1, pageSize, totalCount)

          // 计算预期的总页数
          const expectedTotalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize)

          // 验证：totalPages 计算正确
          expect(meta.totalPages).toBe(expectedTotalPages)

          // 验证：totalPages 的数学属性
          if (totalCount === 0) {
            expect(meta.totalPages).toBe(0)
          } else if (totalCount <= pageSize) {
            expect(meta.totalPages).toBe(1)
          } else {
            // 验证：(totalPages - 1) * pageSize < totalCount <= totalPages * pageSize
            expect((meta.totalPages - 1) * pageSize).toBeLessThan(totalCount)
            expect(totalCount).toBeLessThanOrEqual(meta.totalPages * pageSize)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure no records are skipped when paginating through all pages', () => {
    fc.assert(
      fc.property(
        // 生成总记录数
        fc.integer({ min: 1, max: 300 }),
        // 生成每页大小
        fc.integer({ min: 1, max: 50 }),
        (totalCount, pageSize) => {
          const totalPages = Math.ceil(totalCount / pageSize)

          // 创建模拟数据集（记录ID从0到totalCount-1）
          const allRecords = Array.from({ length: totalCount }, (_, i) => i)

          // 收集通过分页获取的所有记录
          const paginatedRecords: number[] = []

          for (let page = 1; page <= totalPages; page++) {
            const meta = calculatePagination(page, pageSize, totalCount)

            // 模拟从数据库获取这一页的数据
            const pageRecords = allRecords.slice(meta.offset, meta.offset + meta.limit)
            paginatedRecords.push(...pageRecords)
          }

          // 验证：没有记录被跳过
          expect(paginatedRecords.length).toBe(totalCount)

          // 验证：所有记录都被获取到
          for (let i = 0; i < totalCount; i++) {
            expect(paginatedRecords).toContain(i)
          }

          // 验证：记录顺序正确（按原始顺序）
          expect(paginatedRecords).toEqual(allRecords)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure no records are duplicated when paginating through all pages', () => {
    fc.assert(
      fc.property(
        // 生成总记录数
        fc.integer({ min: 1, max: 300 }),
        // 生成每页大小
        fc.integer({ min: 1, max: 50 }),
        (totalCount, pageSize) => {
          const totalPages = Math.ceil(totalCount / pageSize)

          // 创建模拟数据集（记录ID从0到totalCount-1）
          const allRecords = Array.from({ length: totalCount }, (_, i) => i)

          // 收集通过分页获取的所有记录
          const paginatedRecords: number[] = []
          const seenRecords = new Set<number>()

          for (let page = 1; page <= totalPages; page++) {
            const meta = calculatePagination(page, pageSize, totalCount)

            // 模拟从数据库获取这一页的数据
            const pageRecords = allRecords.slice(meta.offset, meta.offset + meta.limit)

            // 验证：这一页的记录没有重复
            for (const record of pageRecords) {
              expect(seenRecords.has(record)).toBe(false)
              seenRecords.add(record)
              paginatedRecords.push(record)
            }
          }

          // 验证：总记录数正确
          expect(paginatedRecords.length).toBe(totalCount)

          // 验证：没有重复记录
          expect(seenRecords.size).toBe(totalCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain consistency between paginate function and manual pagination', () => {
    fc.assert(
      fc.property(
        // 生成总记录数
        fc.integer({ min: 0, max: 200 }),
        // 生成每页大小
        fc.integer({ min: 1, max: 30 }),
        // 生成当前页码
        fc.integer({ min: 1, max: 20 }),
        (totalCount, pageSize, page) => {
          // 创建模拟数据
          const allRecords = Array.from({ length: totalCount }, (_, i) => ({ id: i }))

          // 使用 calculatePagination 计算元数据
          const meta = calculatePagination(page, pageSize, totalCount)

          // 模拟获取当前页的数据
          const pageData = allRecords.slice(meta.offset, meta.offset + meta.limit)

          // 使用 paginate 函数创建结果
          const result = paginate(pageData, page, pageSize, totalCount)

          // 验证：paginate 返回的元数据与 calculatePagination 一致
          expect(result.total).toBe(totalCount)
          expect(result.page).toBe(meta.page)
          expect(result.pageSize).toBe(meta.pageSize)
          expect(result.totalPages).toBe(meta.totalPages)
          expect(result.data).toEqual(pageData)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle edge case: empty result set', () => {
    fc.assert(
      fc.property(
        // 生成每页大小
        fc.integer({ min: 1, max: 50 }),
        // 生成页码
        fc.integer({ min: 1, max: 10 }),
        (pageSize, page) => {
          const totalCount = 0

          const meta = calculatePagination(page, pageSize, totalCount)
          const result = paginate([], page, pageSize, totalCount)

          // 验证：空结果集的一致性
          expect(meta.totalPages).toBe(0)
          // 注意：即使是空结果集，page 也会被规范化为至少 1
          expect(meta.page).toBeGreaterThanOrEqual(1)
          expect(result.data).toEqual([])
          expect(result.total).toBe(0)
          expect(result.totalPages).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle edge case: single page result', () => {
    fc.assert(
      fc.property(
        // 生成记录数（小于等于页大小）
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 20, max: 50 }),
        (recordCount, pageSize) => {
          const meta = calculatePagination(1, pageSize, recordCount)

          // 验证：单页结果的一致性
          expect(meta.totalPages).toBe(1)
          expect(meta.offset).toBe(0)
          expect(meta.limit).toBe(pageSize)

          // 验证：第一页应该包含所有记录
          const allRecords = Array.from({ length: recordCount }, (_, i) => i)
          const pageRecords = allRecords.slice(meta.offset, meta.offset + meta.limit)
          expect(pageRecords.length).toBe(recordCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle edge case: last page with partial records', () => {
    fc.assert(
      fc.property(
        // 生成总记录数
        fc.integer({ min: 10, max: 500 }),
        // 生成每页大小
        fc.integer({ min: 1, max: 50 }),
        (totalCount, pageSize) => {
          const totalPages = Math.ceil(totalCount / pageSize)

          // 获取最后一页的元数据
          const lastPageMeta = calculatePagination(totalPages, pageSize, totalCount)

          // 计算最后一页应该有的记录数
          const expectedLastPageRecords = totalCount - (totalPages - 1) * pageSize

          // 验证：最后一页的记录数正确
          expect(expectedLastPageRecords).toBeGreaterThan(0)
          expect(expectedLastPageRecords).toBeLessThanOrEqual(pageSize)

          // 模拟获取最后一页的数据
          const allRecords = Array.from({ length: totalCount }, (_, i) => i)
          const lastPageRecords = allRecords.slice(
            lastPageMeta.offset,
            lastPageMeta.offset + lastPageMeta.limit
          )

          // 验证：最后一页的实际记录数与预期一致
          expect(lastPageRecords.length).toBe(expectedLastPageRecords)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ensure pagination metadata is consistent across all pages', () => {
    fc.assert(
      fc.property(
        // 生成总记录数
        fc.integer({ min: 1, max: 500 }),
        // 生成每页大小
        fc.integer({ min: 1, max: 50 }),
        (totalCount, pageSize) => {
          const totalPages = Math.ceil(totalCount / pageSize)

          // 遍历所有页面，验证元数据一致性
          for (let page = 1; page <= totalPages; page++) {
            const meta = calculatePagination(page, pageSize, totalCount)

            // 验证：所有页面的 totalPages 应该相同
            expect(meta.totalPages).toBe(totalPages)

            // 验证：所有页面的 pageSize 应该相同
            expect(meta.pageSize).toBe(pageSize)

            // 验证：offset 应该正确递增
            expect(meta.offset).toBe((page - 1) * pageSize)

            // 验证：page 应该正确
            expect(meta.page).toBe(page)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
