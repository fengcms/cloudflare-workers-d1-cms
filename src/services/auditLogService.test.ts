/**
 * Audit Log Service Unit Tests
 *
 * Tests the audit logging functionality including:
 * - Creating log entries
 * - Querying logs with various filters
 * - Pagination
 * - Immutability (no update/delete methods)
 */

import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type CreateLogInput, LogTypeEnum, ModuleEnum } from '../types'
import { AuditLogService } from './auditLogService'

// Mock D1 database for testing
const mockD1 = {
  prepare: () => ({
    bind: () => ({
      all: () => Promise.resolve({ results: [] }),
      run: () => Promise.resolve({ success: true }),
    }),
  }),
} as any

describe('AuditLogService', () => {
  let service: AuditLogService
  let db: any

  beforeEach(() => {
    db = drizzle(mockD1)
    service = new AuditLogService(db)
  })

  describe('log()', () => {
    it('should create a log entry with all required fields', async () => {
      const logData: CreateLogInput = {
        user_id: 1,
        username: 'testuser',
        type: LogTypeEnum.POST,
        module: ModuleEnum.ARTICLE,
        content: 'Created article: Test Article',
        ip: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        site_id: 1,
      }

      // Mock the insert operation
      const mockInsert = vi.fn().mockResolvedValue([
        {
          id: 1,
          ...logData,
          created_at: new Date(),
        },
      ])

      db.insert = () => ({
        values: () => ({
          returning: mockInsert,
        }),
      })

      const result = await service.log(logData)

      expect(result).toBeDefined()
      expect(result.user_id).toBe(1)
      expect(result.username).toBe('testuser')
      expect(result.type).toBe(LogTypeEnum.POST)
      expect(result.module).toBe(ModuleEnum.ARTICLE)
      expect(result.content).toBe('Created article: Test Article')
      expect(result.ip).toBe('192.168.1.1')
      expect(result.user_agent).toBe('Mozilla/5.0')
      expect(result.site_id).toBe(1)
      expect(result.created_at).toBeInstanceOf(Date)
    })

    it('should handle optional fields with defaults', async () => {
      const logData: CreateLogInput = {
        type: LogTypeEnum.DELETE,
        module: ModuleEnum.USER,
        content: 'Deleted user',
      }

      const mockInsert = vi.fn().mockResolvedValue([
        {
          id: 2,
          user_id: null,
          username: '',
          type: LogTypeEnum.DELETE,
          module: ModuleEnum.USER,
          content: 'Deleted user',
          ip: '',
          user_agent: '',
          site_id: null,
          created_at: new Date(),
        },
      ])

      db.insert = () => ({
        values: () => ({
          returning: mockInsert,
        }),
      })

      const result = await service.log(logData)

      expect(result.user_id).toBeNull()
      expect(result.username).toBe('')
      expect(result.ip).toBe('')
      expect(result.user_agent).toBe('')
      expect(result.site_id).toBeNull()
    })

    it('should record timestamp automatically', async () => {
      const beforeLog = new Date()

      const logData: CreateLogInput = {
        type: LogTypeEnum.PUT,
        module: ModuleEnum.CHANNEL,
        content: 'Updated channel',
      }

      const mockInsert = vi.fn().mockResolvedValue([
        {
          id: 3,
          user_id: null,
          username: '',
          type: LogTypeEnum.PUT,
          module: ModuleEnum.CHANNEL,
          content: 'Updated channel',
          ip: '',
          user_agent: '',
          site_id: null,
          created_at: new Date(),
        },
      ])

      db.insert = () => ({
        values: () => ({
          returning: mockInsert,
        }),
      })

      const result = await service.log(logData)
      const afterLog = new Date()

      expect(result.created_at).toBeInstanceOf(Date)
      expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime())
      expect(result.created_at.getTime()).toBeLessThanOrEqual(afterLog.getTime())
    })
  })

  describe('query()', () => {
    it('should query all logs without filters', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.POST,
          module: ModuleEnum.ARTICLE,
          content: 'Created article',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 1,
          created_at: new Date(),
        },
        {
          id: 2,
          user_id: 2,
          username: 'user2',
          type: LogTypeEnum.PUT,
          module: ModuleEnum.CHANNEL,
          content: 'Updated channel',
          ip: '192.168.1.2',
          user_agent: 'Chrome',
          site_id: 1,
          created_at: new Date(),
        },
      ]

      db.select = () => ({
        from: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue(mockLogs),
            orderBy: () => ({
              limit: () => ({
                offset: () => ({
                  all: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.query({})

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
    })

    it('should filter logs by userId', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.POST,
          module: ModuleEnum.ARTICLE,
          content: 'Created article',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 1,
          created_at: new Date(),
        },
      ]

      db.select = () => ({
        from: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue(mockLogs),
            orderBy: () => ({
              limit: () => ({
                offset: () => ({
                  all: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.query({ userId: 1 })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].user_id).toBe(1)
    })

    it('should filter logs by action type', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.DELETE,
          module: ModuleEnum.ARTICLE,
          content: 'Deleted article',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 1,
          created_at: new Date(),
        },
      ]

      db.select = () => ({
        from: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue(mockLogs),
            orderBy: () => ({
              limit: () => ({
                offset: () => ({
                  all: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.query({ type: LogTypeEnum.DELETE })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].type).toBe(LogTypeEnum.DELETE)
    })

    it('should filter logs by module (resourceType)', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.POST,
          module: ModuleEnum.USER,
          content: 'Created user',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 1,
          created_at: new Date(),
        },
      ]

      db.select = () => ({
        from: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue(mockLogs),
            orderBy: () => ({
              limit: () => ({
                offset: () => ({
                  all: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.query({ module: ModuleEnum.USER })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].module).toBe(ModuleEnum.USER)
    })

    it('should filter logs by date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.POST,
          module: ModuleEnum.ARTICLE,
          content: 'Created article',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 1,
          created_at: new Date('2024-06-15'),
        },
      ]

      db.select = () => ({
        from: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue(mockLogs),
            orderBy: () => ({
              limit: () => ({
                offset: () => ({
                  all: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.query({ startDate, endDate })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].created_at.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
      expect(result.data[0].created_at.getTime()).toBeLessThanOrEqual(endDate.getTime())
    })

    it('should filter logs by siteId', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.POST,
          module: ModuleEnum.ARTICLE,
          content: 'Created article',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 2,
          created_at: new Date(),
        },
      ]

      db.select = () => ({
        from: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue(mockLogs),
            orderBy: () => ({
              limit: () => ({
                offset: () => ({
                  all: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.query({ filters: { site_id: 2 } })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].site_id).toBe(2)
    })

    it('should support pagination', async () => {
      const mockLogs = [
        {
          id: 3,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.POST,
          module: ModuleEnum.ARTICLE,
          content: 'Log 3',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 1,
          created_at: new Date(),
        },
        {
          id: 4,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.POST,
          module: ModuleEnum.ARTICLE,
          content: 'Log 4',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 1,
          created_at: new Date(),
        },
      ]

      // Mock count query
      db.select = vi
        .fn()
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              all: vi.fn().mockResolvedValue(Array(25).fill({ count: 1 })),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => ({
                    all: vi.fn().mockResolvedValue(mockLogs),
                  }),
                }),
              }),
            }),
          }),
        })

      const result = await service.query({ page: 2, pageSize: 10 })

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(10)
      expect(result.total).toBe(25)
      expect(result.totalPages).toBe(3)
    })

    it('should combine multiple filters', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 1,
          username: 'user1',
          type: LogTypeEnum.DELETE,
          module: ModuleEnum.ARTICLE,
          content: 'Deleted article',
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          site_id: 1,
          created_at: new Date('2024-06-15'),
        },
      ]

      db.select = () => ({
        from: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue(mockLogs),
            orderBy: () => ({
              limit: () => ({
                offset: () => ({
                  all: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.query({
        userId: 1,
        type: LogTypeEnum.DELETE,
        module: ModuleEnum.ARTICLE,
        filters: { site_id: 1 },
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].user_id).toBe(1)
      expect(result.data[0].type).toBe(LogTypeEnum.DELETE)
      expect(result.data[0].module).toBe(ModuleEnum.ARTICLE)
      expect(result.data[0].site_id).toBe(1)
    })
  })

  describe('immutability', () => {
    it('should not have update method', () => {
      expect(service).not.toHaveProperty('update')
    })

    it('should not have delete method', () => {
      expect(service).not.toHaveProperty('delete')
    })

    it('should only have log and query methods', () => {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(
        (name) => name !== 'constructor'
      )

      expect(methods).toContain('log')
      expect(methods).toContain('query')
      expect(methods).toHaveLength(2)
    })
  })
})
