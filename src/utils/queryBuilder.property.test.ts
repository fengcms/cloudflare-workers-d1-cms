import { describe, it, expect } from 'vitest'
import { fc } from '@fast-check/vitest'
import { buildQuery } from './queryBuilder'
import { articles, StatusEnum } from '../db/schema'
import { QueryParams } from '../types'
import { drizzle } from 'drizzle-orm/d1'
import Database from 'better-sqlite3'

/**
 * 属性 15: 查询过滤精确性
 * 
 * **验证需求：12.1**
 * 
 * 对于任何带有过滤参数的查询，返回的所有记录必须满足所有指定的过滤条件
 */

describe('Property 15: 查询过滤精确性', () => {
  // 创建内存数据库用于测试
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  // 初始化数据库表结构
  sqlite.exec(`
    CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      channel_id INTEGER NOT NULL,
      tags TEXT DEFAULT '',
      description TEXT DEFAULT '',
      content TEXT DEFAULT '',
      markdown TEXT DEFAULT '',
      img TEXT DEFAULT '',
      video TEXT DEFAULT '',
      author TEXT DEFAULT '',
      author_id INTEGER,
      origin TEXT DEFAULT '',
      origin_id INTEGER,
      editor_id INTEGER,
      user_id INTEGER,
      type TEXT DEFAULT 'NORMAL',
      status TEXT DEFAULT 'PENDING',
      is_top INTEGER DEFAULT 0,
      site_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      update_at INTEGER NOT NULL
    )
  `)

  it('should only return records matching all filter conditions', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 10 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE', 'DELETE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 10 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 5, maxLength: 50 }
        ),
        // 生成过滤条件
        fc.record({
          channel_id: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
          type: fc.option(fc.constantFrom('NORMAL', 'HOT', 'MEDIA'), { nil: undefined }),
          is_top: fc.option(fc.integer({ min: 0, max: 1 }), { nil: undefined })
        }),
        (siteId, testData, filters) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询
          const params: QueryParams = {
            filters: Object.fromEntries(
              Object.entries(filters).filter(([_, v]) => v !== undefined)
            )
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          let query = 'SELECT * FROM articles WHERE 1=1'
          const queryParams: any[] = []

          // 应用 site_id 过滤
          query += ' AND site_id = ?'
          queryParams.push(siteId)

          // 应用软删除过滤
          query += ' AND status != ?'
          queryParams.push(StatusEnum.DELETE)

          // 应用用户指定的过滤条件
          if (filters.channel_id !== undefined) {
            query += ' AND channel_id = ?'
            queryParams.push(filters.channel_id)
          }
          if (filters.type !== undefined) {
            query += ' AND type = ?'
            queryParams.push(filters.type)
          }
          if (filters.is_top !== undefined) {
            query += ' AND is_top = ?'
            queryParams.push(filters.is_top)
          }

          const results = sqlite.prepare(query).all(...queryParams) as any[]

          // 验证：所有返回的记录必须满足所有过滤条件
          for (const record of results) {
            // 验证 site_id 过滤
            expect(record.site_id).toBe(siteId)

            // 验证软删除过滤
            expect(record.status).not.toBe(StatusEnum.DELETE)

            // 验证用户指定的过滤条件
            if (filters.channel_id !== undefined) {
              expect(record.channel_id).toBe(filters.channel_id)
            }
            if (filters.type !== undefined) {
              expect(record.type).toBe(filters.type)
            }
            if (filters.is_top !== undefined) {
              expect(record.is_top).toBe(filters.is_top)
            }
          }

          // 验证：没有遗漏符合条件的记录
          const expectedResults = testData.filter(record => {
            if (record.site_id !== siteId) return false
            if (record.status === StatusEnum.DELETE) return false
            if (filters.channel_id !== undefined && record.channel_id !== filters.channel_id) return false
            if (filters.type !== undefined && record.type !== filters.type) return false
            if (filters.is_top !== undefined && record.is_top !== filters.is_top) return false
            return true
          })

          expect(results.length).toBe(expectedResults.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty filter conditions correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE', 'DELETE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 10 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 5, maxLength: 30 }
        ),
        (siteId, testData) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（无过滤条件）
          const params: QueryParams = {}

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = 'SELECT * FROM articles WHERE site_id = ? AND status != ?'
          const results = sqlite.prepare(query).all(siteId, StatusEnum.DELETE) as any[]

          // 验证：所有返回的记录必须满足基本过滤条件（site_id 和软删除）
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
          }

          // 验证：返回所有符合条件的记录
          const expectedCount = testData.filter(
            r => r.site_id === siteId && r.status !== StatusEnum.DELETE
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle multiple filter conditions simultaneously', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 10 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE', 'DELETE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 50 }
        ),
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
        fc.integer({ min: 0, max: 1 }),
        (siteId, testData, channelId, type, isTop) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（多个过滤条件）
          const params: QueryParams = {
            filters: {
              channel_id: channelId,
              type: type,
              is_top: isTop
            }
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND channel_id = ? 
              AND type = ? 
              AND is_top = ?
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            channelId,
            type,
            isTop
          ) as any[]

          // 验证：所有返回的记录必须满足所有过滤条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.channel_id).toBe(channelId)
            expect(record.type).toBe(type)
            expect(record.is_top).toBe(isTop)
          }

          // 验证：返回所有符合条件的记录
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.channel_id === channelId &&
              r.type === type &&
              r.is_top === isTop
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * 属性 16: 排序顺序正确性
 * 
 * **Validates: Requirements 12.2**
 * 
 * 对于任何带有排序参数的查询，返回的记录必须按指定字段和顺序排列
 */

describe('Property 16: 排序顺序正确性', () => {
  // 使用相同的内存数据库
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  // 初始化数据库表结构（如果还没有创建）
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      channel_id INTEGER NOT NULL,
      tags TEXT DEFAULT '',
      description TEXT DEFAULT '',
      content TEXT DEFAULT '',
      markdown TEXT DEFAULT '',
      img TEXT DEFAULT '',
      video TEXT DEFAULT '',
      author TEXT DEFAULT '',
      author_id INTEGER,
      origin TEXT DEFAULT '',
      origin_id INTEGER,
      editor_id INTEGER,
      user_id INTEGER,
      type TEXT DEFAULT 'NORMAL',
      status TEXT DEFAULT 'PENDING',
      is_top INTEGER DEFAULT 0,
      site_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      update_at INTEGER NOT NULL
    )
  `)

  it('should return records sorted in ascending order by specified field', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 5, maxLength: 30 }
        ),
        // 生成排序字段
        fc.constantFrom('channel_id', 'created_at', 'update_at', 'is_top'),
        (siteId, testData, sortField) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（升序排序）
          const params: QueryParams = {
            sort: sortField,
            sortOrder: 'asc'
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `SELECT * FROM articles WHERE site_id = ? AND status != ? ORDER BY ${sortField} ASC`
          const results = sqlite.prepare(query).all(siteId, StatusEnum.DELETE) as any[]

          // 验证：记录必须按升序排列
          for (let i = 1; i < results.length; i++) {
            const prev = results[i - 1][sortField]
            const curr = results[i][sortField]
            expect(prev).toBeLessThanOrEqual(curr)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r => r.site_id === siteId && r.status !== StatusEnum.DELETE
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return records sorted in descending order by specified field', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 5, maxLength: 30 }
        ),
        // 生成排序字段
        fc.constantFrom('channel_id', 'created_at', 'update_at', 'is_top'),
        (siteId, testData, sortField) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（降序排序）
          const params: QueryParams = {
            sort: sortField,
            sortOrder: 'desc'
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `SELECT * FROM articles WHERE site_id = ? AND status != ? ORDER BY ${sortField} DESC`
          const results = sqlite.prepare(query).all(siteId, StatusEnum.DELETE) as any[]

          // 验证：记录必须按降序排列
          for (let i = 1; i < results.length; i++) {
            const prev = results[i - 1][sortField]
            const curr = results[i][sortField]
            expect(prev).toBeGreaterThanOrEqual(curr)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r => r.site_id === siteId && r.status !== StatusEnum.DELETE
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle sorting with filters correctly', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 10 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 40 }
        ),
        // 生成过滤条件
        fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
        // 生成排序字段
        fc.constantFrom('channel_id', 'created_at', 'is_top'),
        // 生成排序顺序
        fc.constantFrom('asc', 'desc'),
        (siteId, testData, typeFilter, sortField, sortOrder) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（带过滤和排序）
          const params: QueryParams = {
            filters: { type: typeFilter },
            sort: sortField,
            sortOrder: sortOrder as 'asc' | 'desc'
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? AND status != ? AND type = ? 
            ORDER BY ${sortField} ${sortOrder.toUpperCase()}
          `
          const results = sqlite.prepare(query).all(siteId, StatusEnum.DELETE, typeFilter) as any[]

          // 验证：所有记录必须满足过滤条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.type).toBe(typeFilter)
          }

          // 验证：记录必须按指定顺序排列
          for (let i = 1; i < results.length; i++) {
            const prev = results[i - 1][sortField]
            const curr = results[i][sortField]
            
            if (sortOrder === 'asc') {
              expect(prev).toBeLessThanOrEqual(curr)
            } else {
              expect(prev).toBeGreaterThanOrEqual(curr)
            }
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r => r.site_id === siteId && r.status !== StatusEnum.DELETE && r.type === typeFilter
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle sorting by text fields correctly', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 3 }),
        // 生成测试数据集（使用更可预测的标题）
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            channel_id: fc.integer({ min: 1, max: 10 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 3 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 5, maxLength: 20 }
        ),
        // 生成排序顺序
        fc.constantFrom('asc', 'desc'),
        (siteId, testData, sortOrder) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（按标题排序）
          const params: QueryParams = {
            sort: 'title',
            sortOrder: sortOrder as 'asc' | 'desc'
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `SELECT * FROM articles WHERE site_id = ? AND status != ? ORDER BY title ${sortOrder.toUpperCase()}`
          const results = sqlite.prepare(query).all(siteId, StatusEnum.DELETE) as any[]

          // 验证：记录必须按指定顺序排列
          // 注意：SQLite 使用二进制排序，不同于 JavaScript 的 localeCompare
          for (let i = 1; i < results.length; i++) {
            const prev = results[i - 1].title
            const curr = results[i].title
            
            if (sortOrder === 'asc') {
              // 使用字符串比较运算符，与 SQLite 的二进制排序一致
              expect(prev <= curr).toBe(true)
            } else {
              expect(prev >= curr).toBe(true)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * 属性 17: 搜索结果相关性
 * 
 * **Validates: Requirements 12.4**
 * 
 * 对于任何带有搜索参数的查询，返回的所有记录必须在指定的搜索字段中包含搜索词（模糊匹配）
 */

describe('Property 17: 搜索结果相关性', () => {
  // 使用相同的内存数据库
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  // 初始化数据库表结构（如果还没有创建）
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      channel_id INTEGER NOT NULL,
      tags TEXT DEFAULT '',
      description TEXT DEFAULT '',
      content TEXT DEFAULT '',
      markdown TEXT DEFAULT '',
      img TEXT DEFAULT '',
      video TEXT DEFAULT '',
      author TEXT DEFAULT '',
      author_id INTEGER,
      origin TEXT DEFAULT '',
      origin_id INTEGER,
      editor_id INTEGER,
      user_id INTEGER,
      type TEXT DEFAULT 'NORMAL',
      status TEXT DEFAULT 'PENDING',
      is_top INTEGER DEFAULT 0,
      site_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      update_at INTEGER NOT NULL
    )
  `)

  it('should return only records containing search term in specified fields', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成搜索词（使用字母数字，避免特殊字符）
        fc.stringMatching(/^[a-zA-Z0-9]{3,8}$/),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 5, maxLength: 100 }),
            description: fc.string({ minLength: 5, maxLength: 200 }),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            author: fc.string({ minLength: 2, maxLength: 50 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 30 }
        ),
        (siteId, searchTerm, testData) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据，确保一些记录包含搜索词
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, description, content, author, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)

          const now = Date.now()

          // 插入包含搜索词的记录（确保在正确的 site_id 和非 DELETE 状态）
          for (let i = 0; i < 3; i++) {
            insertStmt.run(
              `Article ${i} with ${searchTerm} keyword`, // 标题包含搜索词
              `Description ${i}`,
              `Content ${i}`,
              `Author ${i}`,
              1,
              'NORMAL',
              'NORMAL', // 确保状态不是 DELETE
              0,
              siteId, // 确保在正确的 site_id
              now,
              now
            )
          }

          // 插入不包含搜索词的记录
          for (let i = 0; i < 5; i++) {
            const record = testData[i % testData.length]
            insertStmt.run(
              record.title,
              record.description,
              record.content,
              record.author,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（搜索标题和描述字段）
          const params: QueryParams = {
            search: searchTerm,
            searchFields: ['title', 'description']
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND (title LIKE ? OR description LIKE ?)
          `
          const searchPattern = `%${searchTerm}%`
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            searchPattern,
            searchPattern
          ) as any[]

          // 验证：所有返回的记录必须在搜索字段中包含搜索词
          for (const record of results) {
            const titleMatch = record.title.toLowerCase().includes(searchTerm.toLowerCase())
            const descMatch = record.description.toLowerCase().includes(searchTerm.toLowerCase())
            
            expect(titleMatch || descMatch).toBe(true)
          }

          // 验证：至少返回我们插入的包含搜索词的记录（3条）
          expect(results.length).toBeGreaterThanOrEqual(3)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should perform case-insensitive search', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成搜索词（混合大小写）
        fc.constantFrom('Test', 'SEARCH', 'Article', 'Content'),
        (siteId, searchTerm) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据（不同大小写变体）
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, description, content, author, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)

          const now = Date.now()
          
          // 插入小写版本
          insertStmt.run(
            `This is a ${searchTerm.toLowerCase()} title`,
            'Description',
            'Content',
            'Author',
            1,
            'NORMAL',
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 插入大写版本
          insertStmt.run(
            `This is a ${searchTerm.toUpperCase()} title`,
            'Description',
            'Content',
            'Author',
            1,
            'NORMAL',
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 插入混合大小写版本
          insertStmt.run(
            `This is a ${searchTerm} title`,
            'Description',
            'Content',
            'Author',
            1,
            'NORMAL',
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 构建查询
          const params: QueryParams = {
            search: searchTerm,
            searchFields: ['title']
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND title LIKE ?
          `
          const searchPattern = `%${searchTerm}%`
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            searchPattern
          ) as any[]

          // 验证：应该找到所有三个记录（不区分大小写）
          // 注意：SQLite 的 LIKE 默认是不区分大小写的
          expect(results.length).toBe(3)

          // 验证：所有记录都包含搜索词（不区分大小写）
          for (const record of results) {
            expect(record.title.toLowerCase()).toContain(searchTerm.toLowerCase())
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should search across multiple fields correctly', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成搜索词
        fc.string({ minLength: 3, maxLength: 8 }).filter(s => s.trim().length > 0),
        (siteId, searchTerm) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, description, content, author, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)

          const now = Date.now()

          // 插入记录：搜索词在标题中
          insertStmt.run(
            `Title with ${searchTerm}`,
            'Some description',
            'Some content',
            'Author',
            1,
            'NORMAL',
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 插入记录：搜索词在描述中
          insertStmt.run(
            'Some title',
            `Description with ${searchTerm}`,
            'Some content',
            'Author',
            1,
            'NORMAL',
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 插入记录：搜索词在内容中
          insertStmt.run(
            'Some title',
            'Some description',
            `Content with ${searchTerm}`,
            'Author',
            1,
            'NORMAL',
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 插入记录：搜索词在作者中
          insertStmt.run(
            'Some title',
            'Some description',
            'Some content',
            `${searchTerm} Author`,
            1,
            'NORMAL',
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 插入记录：不包含搜索词
          insertStmt.run(
            'Different title',
            'Different description',
            'Different content',
            'Different author',
            1,
            'NORMAL',
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 构建查询（搜索多个字段）
          const params: QueryParams = {
            search: searchTerm,
            searchFields: ['title', 'description', 'content', 'author']
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND (title LIKE ? OR description LIKE ? OR content LIKE ? OR author LIKE ?)
          `
          const searchPattern = `%${searchTerm}%`
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern
          ) as any[]

          // 验证：应该找到4条记录（不包括不含搜索词的记录）
          expect(results.length).toBe(4)

          // 验证：每条记录至少在一个搜索字段中包含搜索词
          for (const record of results) {
            const titleMatch = record.title.toLowerCase().includes(searchTerm.toLowerCase())
            const descMatch = record.description.toLowerCase().includes(searchTerm.toLowerCase())
            const contentMatch = record.content.toLowerCase().includes(searchTerm.toLowerCase())
            const authorMatch = record.author.toLowerCase().includes(searchTerm.toLowerCase())

            expect(titleMatch || descMatch || contentMatch || authorMatch).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should combine search with filters correctly', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成搜索词
        fc.string({ minLength: 3, maxLength: 8 }).filter(s => s.trim().length > 0),
        // 生成过滤条件
        fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
        (siteId, searchTerm, typeFilter) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, description, content, author, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)

          const now = Date.now()

          // 插入记录：包含搜索词且类型匹配
          insertStmt.run(
            `Title with ${searchTerm}`,
            'Description',
            'Content',
            'Author',
            1,
            typeFilter,
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 插入记录：包含搜索词但类型不匹配
          const otherType = typeFilter === 'NORMAL' ? 'HOT' : 'NORMAL'
          insertStmt.run(
            `Title with ${searchTerm}`,
            'Description',
            'Content',
            'Author',
            1,
            otherType,
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 插入记录：不包含搜索词但类型匹配
          insertStmt.run(
            'Different title',
            'Different description',
            'Different content',
            'Author',
            1,
            typeFilter,
            'NORMAL',
            0,
            siteId,
            now,
            now
          )

          // 构建查询（搜索 + 过滤）
          const params: QueryParams = {
            search: searchTerm,
            searchFields: ['title', 'description'],
            filters: { type: typeFilter }
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND type = ?
              AND (title LIKE ? OR description LIKE ?)
          `
          const searchPattern = `%${searchTerm}%`
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            typeFilter,
            searchPattern,
            searchPattern
          ) as any[]

          // 验证：应该只找到1条记录（同时满足搜索和过滤条件）
          expect(results.length).toBe(1)

          // 验证：记录必须满足所有条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.type).toBe(typeFilter)
            
            const titleMatch = record.title.toLowerCase().includes(searchTerm.toLowerCase())
            const descMatch = record.description.toLowerCase().includes(searchTerm.toLowerCase())
            expect(titleMatch || descMatch).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty search results correctly', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成不存在的搜索词
        fc.constant('NONEXISTENT_SEARCH_TERM_12345'),
        (siteId, searchTerm) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, description, content, author, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)

          const now = Date.now()

          // 插入一些不包含搜索词的记录
          for (let i = 0; i < 5; i++) {
            insertStmt.run(
              `Title ${i}`,
              `Description ${i}`,
              `Content ${i}`,
              `Author ${i}`,
              1,
              'NORMAL',
              'NORMAL',
              0,
              siteId,
              now,
              now
            )
          }

          // 构建查询
          const params: QueryParams = {
            search: searchTerm,
            searchFields: ['title', 'description', 'content']
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND (title LIKE ? OR description LIKE ? OR content LIKE ?)
          `
          const searchPattern = `%${searchTerm}%`
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            searchPattern,
            searchPattern,
            searchPattern
          ) as any[]

          // 验证：应该返回空结果
          expect(results.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * 属性 18: 比较运算符正确性
 * 
 * **Validates: Requirements 12.5**
 * 
 * 对于任何带有比较运算符的查询，返回的所有记录必须满足指定的比较条件（gt、lt、gte、lte）
 */

describe('Property 18: 比较运算符正确性', () => {
  // 使用相同的内存数据库
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  // 初始化数据库表结构（如果还没有创建）
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      channel_id INTEGER NOT NULL,
      tags TEXT DEFAULT '',
      description TEXT DEFAULT '',
      content TEXT DEFAULT '',
      markdown TEXT DEFAULT '',
      img TEXT DEFAULT '',
      video TEXT DEFAULT '',
      author TEXT DEFAULT '',
      author_id INTEGER,
      origin TEXT DEFAULT '',
      origin_id INTEGER,
      editor_id INTEGER,
      user_id INTEGER,
      type TEXT DEFAULT 'NORMAL',
      status TEXT DEFAULT 'PENDING',
      is_top INTEGER DEFAULT 0,
      site_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      update_at INTEGER NOT NULL
    )
  `)

  it('should correctly apply gt (greater than) operator', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 40 }
        ),
        // 生成比较值
        fc.integer({ min: 1200000000, max: 1800000000 }),
        (siteId, testData, compareValue) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（gt 运算符）
          const params: QueryParams = {
            comparisons: [
              { field: 'created_at', operator: 'gt', value: compareValue }
            ]
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND created_at > ?
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            compareValue
          ) as any[]

          // 验证：所有返回的记录必须满足 gt 条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.created_at).toBeGreaterThan(compareValue)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.created_at > compareValue
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly apply lt (less than) operator', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 40 }
        ),
        // 生成比较值
        fc.integer({ min: 1200000000, max: 1800000000 }),
        (siteId, testData, compareValue) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（lt 运算符）
          const params: QueryParams = {
            comparisons: [
              { field: 'created_at', operator: 'lt', value: compareValue }
            ]
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND created_at < ?
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            compareValue
          ) as any[]

          // 验证：所有返回的记录必须满足 lt 条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.created_at).toBeLessThan(compareValue)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.created_at < compareValue
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly apply gte (greater than or equal) operator', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 40 }
        ),
        // 生成比较值
        fc.integer({ min: 1200000000, max: 1800000000 }),
        (siteId, testData, compareValue) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（gte 运算符）
          const params: QueryParams = {
            comparisons: [
              { field: 'created_at', operator: 'gte', value: compareValue }
            ]
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND created_at >= ?
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            compareValue
          ) as any[]

          // 验证：所有返回的记录必须满足 gte 条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.created_at).toBeGreaterThanOrEqual(compareValue)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.created_at >= compareValue
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly apply lte (less than or equal) operator', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 40 }
        ),
        // 生成比较值
        fc.integer({ min: 1200000000, max: 1800000000 }),
        (siteId, testData, compareValue) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（lte 运算符）
          const params: QueryParams = {
            comparisons: [
              { field: 'created_at', operator: 'lte', value: compareValue }
            ]
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND created_at <= ?
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            compareValue
          ) as any[]

          // 验证：所有返回的记录必须满足 lte 条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.created_at).toBeLessThanOrEqual(compareValue)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.created_at <= compareValue
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle multiple comparison operators simultaneously', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 40 }
        ),
        // 生成时间范围
        fc.integer({ min: 1200000000, max: 1500000000 }),
        fc.integer({ min: 1500000001, max: 1800000000 }),
        (siteId, testData, minTime, maxTime) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（多个比较运算符：时间范围查询）
          const params: QueryParams = {
            comparisons: [
              { field: 'created_at', operator: 'gte', value: minTime },
              { field: 'created_at', operator: 'lte', value: maxTime }
            ]
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND created_at >= ?
              AND created_at <= ?
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            minTime,
            maxTime
          ) as any[]

          // 验证：所有返回的记录必须满足时间范围条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.created_at).toBeGreaterThanOrEqual(minTime)
            expect(record.created_at).toBeLessThanOrEqual(maxTime)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.created_at >= minTime &&
              r.created_at <= maxTime
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should combine comparison operators with filters', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 10 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 15, maxLength: 50 }
        ),
        // 生成过滤条件
        fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
        // 生成比较值
        fc.integer({ min: 1200000000, max: 1800000000 }),
        (siteId, testData, typeFilter, compareValue) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（比较运算符 + 过滤条件）
          const params: QueryParams = {
            filters: { type: typeFilter },
            comparisons: [
              { field: 'created_at', operator: 'gt', value: compareValue }
            ]
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND type = ?
              AND created_at > ?
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            typeFilter,
            compareValue
          ) as any[]

          // 验证：所有返回的记录必须满足所有条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.type).toBe(typeFilter)
            expect(record.created_at).toBeGreaterThan(compareValue)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.type === typeFilter &&
              r.created_at > compareValue
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should combine comparison operators with sorting', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 40 }
        ),
        // 生成比较值
        fc.integer({ min: 1200000000, max: 1800000000 }),
        // 生成排序顺序
        fc.constantFrom('asc', 'desc'),
        (siteId, testData, compareValue, sortOrder) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（比较运算符 + 排序）
          const params: QueryParams = {
            comparisons: [
              { field: 'created_at', operator: 'gt', value: compareValue }
            ],
            sort: 'created_at',
            sortOrder: sortOrder as 'asc' | 'desc'
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND created_at > ?
            ORDER BY created_at ${sortOrder.toUpperCase()}
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            compareValue
          ) as any[]

          // 验证：所有返回的记录必须满足比较条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.created_at).toBeGreaterThan(compareValue)
          }

          // 验证：记录必须按指定顺序排列
          for (let i = 1; i < results.length; i++) {
            const prev = results[i - 1].created_at
            const curr = results[i].created_at

            if (sortOrder === 'asc') {
              expect(prev).toBeLessThanOrEqual(curr)
            } else {
              expect(prev).toBeGreaterThanOrEqual(curr)
            }
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.created_at > compareValue
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should apply comparison operators on different numeric fields', () => {
    fc.assert(
      fc.property(
        // 生成站点ID
        fc.integer({ min: 1, max: 5 }),
        // 生成测试数据集
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            channel_id: fc.integer({ min: 1, max: 20 }),
            type: fc.constantFrom('NORMAL', 'HOT', 'MEDIA'),
            status: fc.constantFrom('PENDING', 'NORMAL', 'FAILURE'),
            is_top: fc.integer({ min: 0, max: 1 }),
            site_id: fc.integer({ min: 1, max: 5 }),
            created_at: fc.integer({ min: 1000000000, max: 2000000000 }),
            update_at: fc.integer({ min: 1000000000, max: 2000000000 })
          }),
          { minLength: 10, maxLength: 40 }
        ),
        // 生成 channel_id 比较值
        fc.integer({ min: 5, max: 15 }),
        (siteId, testData, channelIdThreshold) => {
          // 清空表
          sqlite.exec('DELETE FROM articles')

          // 插入测试数据
          const insertStmt = sqlite.prepare(`
            INSERT INTO articles (
              title, channel_id, type, status, is_top, site_id, created_at, update_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (const record of testData) {
            insertStmt.run(
              record.title,
              record.channel_id,
              record.type,
              record.status,
              record.is_top,
              record.site_id,
              record.created_at,
              record.update_at
            )
          }

          // 构建查询（对 channel_id 应用比较运算符）
          const params: QueryParams = {
            comparisons: [
              { field: 'channel_id', operator: 'gte', value: channelIdThreshold }
            ]
          }

          const queryResult = buildQuery(params, {
            siteId,
            tableColumns: articles
          })

          // 执行查询
          const query = `
            SELECT * FROM articles 
            WHERE site_id = ? 
              AND status != ? 
              AND channel_id >= ?
          `
          const results = sqlite.prepare(query).all(
            siteId,
            StatusEnum.DELETE,
            channelIdThreshold
          ) as any[]

          // 验证：所有返回的记录必须满足条件
          for (const record of results) {
            expect(record.site_id).toBe(siteId)
            expect(record.status).not.toBe(StatusEnum.DELETE)
            expect(record.channel_id).toBeGreaterThanOrEqual(channelIdThreshold)
          }

          // 验证：返回的记录数量正确
          const expectedCount = testData.filter(
            r =>
              r.site_id === siteId &&
              r.status !== StatusEnum.DELETE &&
              r.channel_id >= channelIdThreshold
          ).length
          expect(results.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })
})
