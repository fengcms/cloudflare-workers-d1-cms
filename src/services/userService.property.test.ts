/**
 * 用户服务属性测试
 * 
 * 使用 fast-check 进行属性测试，验证用户服务的通用正确性属性
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { fc } from '@fast-check/vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { users } from '../db/schema'
import { UserService } from './userService'
import { StatusEnum, UserTypeEnum, GenderEnum, EditorEnum } from '../types'
import { eq, and } from 'drizzle-orm'

describe('用户服务属性测试', () => {
  let db: ReturnType<typeof drizzle>
  let sqlite: Database.Database
  let userService: UserService

  beforeEach(() => {
    // 创建内存数据库
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // 创建用户表
    sqlite.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        gender TEXT DEFAULT 'UNKNOWN',
        type TEXT NOT NULL,
        site_id INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING',
        last_login_time INTEGER,
        evm_address TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        update_at INTEGER NOT NULL
      )
    `)

    // 创建索引
    sqlite.exec(`
      CREATE INDEX idx_user_username ON users(username, site_id);
      CREATE INDEX idx_user_email ON users(email, site_id);
      CREATE INDEX idx_user_status ON users(status);
      CREATE INDEX idx_user_evm_address ON users(evm_address, site_id);
    `)

    userService = new UserService(db as any)
  })

  /**
   * 属性 11: 用户名唯一性
   * 验证需求：5.6
   * 
   * 在同一个站点内，用户名必须唯一
   */
  describe('属性 11: 用户名唯一性', () => {
    it('同一站点内不能创建重复用户名的用户', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 6, maxLength: 20 }),
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            siteId: fc.integer({ min: 1, max: 100 })
          }),
          async (userData) => {
            // 创建第一个用户
            const user1 = await userService.create({
              username: userData.username,
              password: userData.password,
              nickname: userData.nickname,
              email: userData.email,
              type: UserTypeEnum.USER
            }, userData.siteId)

            expect(user1).toBeDefined()
            expect(user1.username).toBe(userData.username)

            // 尝试创建相同用户名的用户应该失败
            await expect(
              userService.create({
                username: userData.username,
                password: 'different_password',
                nickname: 'Different Nickname',
                email: 'different@example.com',
                type: UserTypeEnum.USER
              }, userData.siteId)
            ).rejects.toThrow('用户名已存在')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('不同站点可以有相同的用户名', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 6, maxLength: 20 }),
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            siteId1: fc.integer({ min: 1, max: 100 }),
            siteId2: fc.integer({ min: 101, max: 200 })
          }),
          async (userData) => {
            // 在站点1创建用户
            const user1 = await userService.create({
              username: userData.username,
              password: userData.password,
              nickname: userData.nickname,
              email: `user1@site${userData.siteId1}.com`,
              type: UserTypeEnum.USER
            }, userData.siteId1)

            // 在站点2创建相同用户名的用户应该成功
            const user2 = await userService.create({
              username: userData.username,
              password: userData.password,
              nickname: userData.nickname,
              email: `user2@site${userData.siteId2}.com`,
              type: UserTypeEnum.USER
            }, userData.siteId2)

            expect(user1.username).toBe(user2.username)
            expect(user1.site_id).not.toBe(user2.site_id)
            expect(user1.id).not.toBe(user2.id)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * 属性 12: 邮箱唯一性
   * 验证需求：5.7
   * 
   * 在同一个站点内，邮箱必须唯一（如果提供）
   */
  describe('属性 12: 邮箱唯一性', () => {
    it('同一站点内不能创建重复邮箱的用户', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username1: fc.string({ minLength: 3, maxLength: 20 }),
            username2: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 6, maxLength: 20 }),
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            siteId: fc.integer({ min: 1, max: 100 })
          }).filter(data => data.username1 !== data.username2),
          async (userData) => {
            // 创建第一个用户
            const user1 = await userService.create({
              username: userData.username1,
              password: userData.password,
              nickname: userData.nickname,
              email: userData.email,
              type: UserTypeEnum.USER
            }, userData.siteId)

            expect(user1).toBeDefined()
            expect(user1.email).toBe(userData.email)

            // 尝试创建相同邮箱的用户应该失败
            await expect(
              userService.create({
                username: userData.username2,
                password: userData.password,
                nickname: 'Different Nickname',
                email: userData.email,
                type: UserTypeEnum.USER
              }, userData.siteId)
            ).rejects.toThrow('邮箱已存在')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('不同站点可以有相同的邮箱', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username1: fc.string({ minLength: 3, maxLength: 20 }),
            username2: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 6, maxLength: 20 }),
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            siteId1: fc.integer({ min: 1, max: 100 }),
            siteId2: fc.integer({ min: 101, max: 200 })
          }).filter(data => data.username1 !== data.username2),
          async (userData) => {
            // 在站点1创建用户
            const user1 = await userService.create({
              username: userData.username1,
              password: userData.password,
              nickname: userData.nickname,
              email: userData.email,
              type: UserTypeEnum.USER
            }, userData.siteId1)

            // 在站点2创建相同邮箱的用户应该成功
            const user2 = await userService.create({
              username: userData.username2,
              password: userData.password,
              nickname: userData.nickname,
              email: userData.email,
              type: UserTypeEnum.USER
            }, userData.siteId2)

            expect(user1.email).toBe(user2.email)
            expect(user1.site_id).not.toBe(user2.site_id)
            expect(user1.id).not.toBe(user2.id)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('空邮箱不受唯一性约束', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username1: fc.string({ minLength: 3, maxLength: 20 }),
            username2: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 6, maxLength: 20 }),
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            siteId: fc.integer({ min: 1, max: 100 })
          }).filter(data => data.username1 !== data.username2),
          async (userData) => {
            // 创建第一个用户（空邮箱）
            const user1 = await userService.create({
              username: userData.username1,
              password: userData.password,
              nickname: userData.nickname,
              email: '',
              type: UserTypeEnum.USER
            }, userData.siteId)

            // 创建第二个用户（空邮箱）应该成功
            const user2 = await userService.create({
              username: userData.username2,
              password: userData.password,
              nickname: userData.nickname,
              email: '',
              type: UserTypeEnum.USER
            }, userData.siteId)

            expect(user1.email).toBe('')
            expect(user2.email).toBe('')
            expect(user1.id).not.toBe(user2.id)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * 属性 4: 密码哈希不可逆性
   * 验证需求：10.4
   * 
   * 存储的密码哈希不应该暴露原始密码
   */
  describe('属性 4: 密码哈希不可逆性', () => {
    it('创建用户后，数据库中存储的是哈希值而非明文密码', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 6, maxLength: 20 }),
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            siteId: fc.integer({ min: 1, max: 100 })
          }),
          async (userData) => {
            // 创建用户
            const user = await userService.create({
              username: userData.username,
              password: userData.password,
              nickname: userData.nickname,
              email: `${userData.username}@example.com`,
              type: UserTypeEnum.USER
            }, userData.siteId)

            // 从数据库直接查询
            const dbUser = db
              .select()
              .from(users)
              .where(eq(users.id, user.id))
              .get()

            // 验证密码已被哈希
            expect(dbUser?.password).toBeDefined()
            expect(dbUser?.password).not.toBe(userData.password)
            expect(dbUser?.password.length).toBeGreaterThan(userData.password.length)
            
            // 验证返回的用户对象不包含密码
            expect((user as any).password).toBeUndefined()
            expect((user as any).passwordHash).toBeUndefined()
          }
        ),
        { numRuns: 20 }
      )
    }, 30000)

    it('相同密码在不同用户中产生不同的哈希值', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username1: fc.string({ minLength: 3, maxLength: 20 }),
            username2: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 6, maxLength: 20 }),
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            siteId: fc.integer({ min: 1, max: 100 })
          }).filter(data => data.username1 !== data.username2),
          async (userData) => {
            // 创建两个用户，使用相同密码
            const user1 = await userService.create({
              username: userData.username1,
              password: userData.password,
              nickname: userData.nickname,
              email: `${userData.username1}@example.com`,
              type: UserTypeEnum.USER
            }, userData.siteId)

            const user2 = await userService.create({
              username: userData.username2,
              password: userData.password,
              nickname: userData.nickname,
              email: `${userData.username2}@example.com`,
              type: UserTypeEnum.USER
            }, userData.siteId)

            // 从数据库查询
            const dbUser1 = db
              .select()
              .from(users)
              .where(eq(users.id, user1.id))
              .get()

            const dbUser2 = db
              .select()
              .from(users)
              .where(eq(users.id, user2.id))
              .get()

            // 验证哈希值不同（bcrypt 使用随机盐）
            expect(dbUser1?.password).not.toBe(dbUser2?.password)
          }
        ),
        { numRuns: 10 }
      )
    }, 30000)
  })
})
