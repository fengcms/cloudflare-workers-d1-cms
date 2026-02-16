import { describe, expect, it } from 'vitest'
import { articles, channels, StatusEnum, users } from '../db/schema'
import type { QueryParams } from '../types'
import { applySiteFilter, applySoftDeleteFilter, buildQuery } from './queryBuilder'

describe('queryBuilder', () => {
  describe('buildQuery', () => {
    it('should apply site_id filter automatically', () => {
      const params: QueryParams = {}
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.where).toBeDefined()
      expect(result.where?.toString()).toContain('site_id')
    })

    it('should apply soft delete filter automatically', () => {
      const params: QueryParams = {}
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.where).toBeDefined()
      expect(result.where?.toString()).toContain('status')
      expect(result.where?.toString()).toContain('DELETE')
    })

    it('should apply exact match filters', () => {
      const params: QueryParams = {
        filters: {
          channel_id: 5,
          type: 'NORMAL',
        },
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.where).toBeDefined()
      expect(result.where?.toString()).toContain('channel_id')
    })

    it('should apply comparison operators', () => {
      const params: QueryParams = {
        comparisons: [
          { field: 'id', operator: 'gt', value: 10 },
          { field: 'id', operator: 'lte', value: 100 },
        ],
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.where).toBeDefined()
    })

    it('should apply search with multiple fields', () => {
      const params: QueryParams = {
        search: 'test',
        searchFields: ['title', 'content'],
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.where).toBeDefined()
      expect(result.where?.toString()).toContain('LIKE')
    })

    it('should build ascending order by', () => {
      const params: QueryParams = {
        sort: 'created_at',
        sortOrder: 'asc',
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.orderBy).toBeDefined()
    })

    it('should build descending order by', () => {
      const params: QueryParams = {
        sort: 'created_at',
        sortOrder: 'desc',
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.orderBy).toBeDefined()
    })

    it('should calculate pagination correctly', () => {
      const params: QueryParams = {
        page: 2,
        pageSize: 20,
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.limit).toBe(20)
      expect(result.offset).toBe(20) // (2-1) * 20
    })

    it('should use default pagination when not provided', () => {
      const params: QueryParams = {}
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.limit).toBe(10) // default pageSize
      expect(result.offset).toBe(0) // default page 1
    })

    it('should handle tables without site_id', () => {
      const params: QueryParams = {}
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
        hasSiteId: false,
      })

      expect(result.where?.toString() || '').not.toContain('site_id')
    })

    it('should handle tables without status', () => {
      const params: QueryParams = {}
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
        hasStatus: false,
      })

      expect(result.where?.toString() || '').not.toContain('status')
    })

    it('should combine multiple query parameters', () => {
      const params: QueryParams = {
        filters: { channel_id: 5 },
        search: 'test',
        searchFields: ['title'],
        sort: 'created_at',
        sortOrder: 'desc',
        page: 2,
        pageSize: 15,
        comparisons: [{ field: 'is_top', operator: 'gte', value: 1 }],
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.where).toBeDefined()
      expect(result.orderBy).toBeDefined()
      expect(result.limit).toBe(15)
      expect(result.offset).toBe(15)
    })

    it('should ignore invalid field names in filters', () => {
      const params: QueryParams = {
        filters: {
          invalid_field: 'value',
          channel_id: 5,
        },
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.where).toBeDefined()
      // Should only include valid fields
    })

    it('should ignore null and undefined filter values', () => {
      const params: QueryParams = {
        filters: {
          channel_id: null,
          type: undefined,
          is_top: 1,
        },
      }
      const result = buildQuery(params, {
        siteId: 1,
        tableColumns: articles,
      })

      expect(result.where).toBeDefined()
    })
  })

  describe('applySiteFilter', () => {
    it('should create site_id filter condition', () => {
      const condition = applySiteFilter(articles.site_id, 1)
      expect(condition).toBeDefined()
      expect(condition.toString()).toContain('site_id')
    })
  })

  describe('applySoftDeleteFilter', () => {
    it('should create status != DELETE filter condition', () => {
      const condition = applySoftDeleteFilter(articles.status)
      expect(condition).toBeDefined()
      expect(condition.toString()).toContain('status')
      expect(condition.toString()).toContain('DELETE')
    })
  })
})
