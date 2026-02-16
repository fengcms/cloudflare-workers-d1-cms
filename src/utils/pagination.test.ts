/**
 * 分页工具单元测试
 *
 * **Validates Requirements**: 12.7, 13.4
 */

import { describe, expect, it } from 'vitest'
import { calculatePagination, DEFAULT_PAGE_SIZE, paginate } from './pagination'

describe('calculatePagination', () => {
  it('should calculate correct pagination metadata for first page', () => {
    const result = calculatePagination(1, 10, 45)

    expect(result).toEqual({
      offset: 0,
      limit: 10,
      totalPages: 5,
      page: 1,
      pageSize: 10,
    })
  })

  it('should calculate correct pagination metadata for middle page', () => {
    const result = calculatePagination(3, 10, 45)

    expect(result).toEqual({
      offset: 20,
      limit: 10,
      totalPages: 5,
      page: 3,
      pageSize: 10,
    })
  })

  it('should calculate correct pagination metadata for last page', () => {
    const result = calculatePagination(5, 10, 45)

    expect(result).toEqual({
      offset: 40,
      limit: 10,
      totalPages: 5,
      page: 5,
      pageSize: 10,
    })
  })

  it('should handle page < 1 by normalizing to page 1', () => {
    const result = calculatePagination(0, 10, 45)

    expect(result.page).toBe(1)
    expect(result.offset).toBe(0)
  })

  it('should handle negative page by normalizing to page 1', () => {
    const result = calculatePagination(-5, 10, 45)

    expect(result.page).toBe(1)
    expect(result.offset).toBe(0)
  })

  it('should handle pageSize < 1 by using default page size', () => {
    const result = calculatePagination(1, 0, 45)

    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE)
    expect(result.limit).toBe(DEFAULT_PAGE_SIZE)
  })

  it('should handle negative pageSize by using default page size', () => {
    const result = calculatePagination(1, -10, 45)

    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE)
    expect(result.limit).toBe(DEFAULT_PAGE_SIZE)
  })

  it('should handle totalCount = 0 correctly', () => {
    const result = calculatePagination(1, 10, 0)

    expect(result).toEqual({
      offset: 0,
      limit: 10,
      totalPages: 0,
      page: 1,
      pageSize: 10,
    })
  })

  it('should calculate totalPages correctly when totalCount is exactly divisible', () => {
    const result = calculatePagination(1, 10, 50)

    expect(result.totalPages).toBe(5)
  })

  it('should calculate totalPages correctly when totalCount is not exactly divisible', () => {
    const result = calculatePagination(1, 10, 51)

    expect(result.totalPages).toBe(6)
  })

  it('should handle single item with page size 1', () => {
    const result = calculatePagination(1, 1, 1)

    expect(result).toEqual({
      offset: 0,
      limit: 1,
      totalPages: 1,
      page: 1,
      pageSize: 1,
    })
  })

  it('should handle large page numbers', () => {
    const result = calculatePagination(100, 10, 1000)

    expect(result).toEqual({
      offset: 990,
      limit: 10,
      totalPages: 100,
      page: 100,
      pageSize: 10,
    })
  })
})

describe('paginate', () => {
  it('should create paginated result with correct structure', () => {
    const data = [1, 2, 3, 4, 5]
    const result = paginate(data, 1, 10, 45)

    expect(result).toEqual({
      data: [1, 2, 3, 4, 5],
      total: 45,
      page: 1,
      pageSize: 10,
      totalPages: 5,
    })
  })

  it('should handle empty data array', () => {
    const result = paginate([], 1, 10, 0)

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    })
  })

  it('should normalize invalid page numbers', () => {
    const data = [1, 2, 3]
    const result = paginate(data, 0, 10, 45)

    expect(result.page).toBe(1)
  })

  it('should normalize invalid page sizes', () => {
    const data = [1, 2, 3]
    const result = paginate(data, 1, -5, 45)

    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE)
  })

  it('should work with object arrays', () => {
    const data = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]
    const result = paginate(data, 1, 10, 20)

    expect(result.data).toEqual(data)
    expect(result.total).toBe(20)
    expect(result.totalPages).toBe(2)
  })

  it('should calculate correct totalPages for last partial page', () => {
    const data = [1, 2, 3, 4, 5]
    const result = paginate(data, 5, 10, 45)

    expect(result.totalPages).toBe(5)
    expect(result.page).toBe(5)
  })

  it('should handle single page scenario', () => {
    const data = [1, 2, 3]
    const result = paginate(data, 1, 10, 3)

    expect(result).toEqual({
      data: [1, 2, 3],
      total: 3,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })
  })
})
