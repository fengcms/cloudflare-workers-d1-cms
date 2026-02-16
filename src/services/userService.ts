/**
 * User Service
 *
 * 管理用户账户、认证和授权。
 * 实现密码哈希、用户验证、登录、EVM 钱包登录和软删除功能。
 *
 * **验证需求**: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 10.4, 10.5, 21.4, 21.5, 21.6, 21.8
 */

import { and, eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { StatusEnum, UserTypeEnum, users } from '../db/schema'
import { AuthenticationError, ConflictError, NotFoundError } from '../errors'
import type {
  CreateUserInput,
  LoginResult,
  UpdateUserInput,
  User,
  UserWithoutPassword,
} from '../types'
import {
  generateWalletLoginMessage,
  normalizeEvmAddress,
  validateEvmAddressFormat,
  verifySignatureAndRecoverAddress,
} from '../utils/evmSignature'
import { generateToken } from '../utils/jwt'
import { hashPassword, verifyPassword } from '../utils/password'

export class UserService {
  constructor(
    private db: DrizzleD1Database,
    private jwtSecret: string,
    private jwtExpiration: string = '7d'
  ) {}

  /**
   * 创建用户
   *
   * 接收前端传来的 SHA256 哈希密码，再进行 bcrypt 哈希存储。
   * 验证用户名、邮箱和 EVM 地址唯一性。
   * 响应中不包含密码哈希。
   *
   * @param data - 用户创建数据（password 应为 SHA256 哈希值）
   * @param siteId - 站点ID
   * @returns 创建的用户（不含密码）
   *
   * **验证需求**: 5.1, 5.2, 5.6, 5.7, 5.8, 5.9, 10.4
   */
  async create(data: CreateUserInput, siteId: number): Promise<UserWithoutPassword> {
    // 验证用户名唯一性
    const usernameExists = await this.validateUsername(data.username, siteId)
    if (!usernameExists) {
      throw new ConflictError(`用户名 "${data.username}" 已存在`)
    }

    // 验证邮箱唯一性（如果提供）
    if (data.email) {
      const emailExists = await this.validateEmail(data.email, siteId)
      if (!emailExists) {
        throw new ConflictError(`邮箱 "${data.email}" 已存在`)
      }
    }

    // 验证 EVM 地址（如果提供）
    let normalizedEvmAddress: string | null = null
    if (data.evm_address) {
      // 验证格式
      if (!validateEvmAddressFormat(data.evm_address)) {
        throw new ConflictError(`无效的 EVM 地址格式: ${data.evm_address}`)
      }

      // 规范化地址（转换为小写）
      normalizedEvmAddress = normalizeEvmAddress(data.evm_address)

      // 验证唯一性
      const evmAddressExists = await this.validateEvmAddress(normalizedEvmAddress, siteId)
      if (!evmAddressExists) {
        throw new ConflictError(`EVM 地址 "${normalizedEvmAddress}" 已存在`)
      }
    }

    // 对 SHA256 哈希后的密码再进行 bcrypt 哈希
    // 前端应该先对密码进行 SHA256 哈希，然后传递给后端
    const hashedPassword = await hashPassword(data.password)

    const now = new Date()

    // 插入用户记录
    const [result] = await this.db
      .insert(users)
      .values({
        username: data.username,
        password: hashedPassword,
        nickname: data.nickname ?? '',
        avatar: data.avatar ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        gender: data.gender ?? 'UNKNOWN',
        type: data.type ?? UserTypeEnum.USER,
        site_id: siteId,
        status: StatusEnum.NORMAL,
        last_login_time: null,
        evm_address: normalizedEvmAddress,
        created_at: now,
        update_at: now,
      })
      .returning()

    // 返回用户对象（不含密码）
    return this.excludePassword(result)
  }

  /**
   * 更新用户
   *
   * 如果提供新密码，自动哈希。
   * 如果提供 EVM 地址，验证格式和唯一性。
   * 不更新已删除的用户。
   * 响应中不包含密码哈希。
   *
   * @param id - 用户ID
   * @param data - 用户更新数据
   * @param siteId - 站点ID
   * @returns 更新后的用户（不含密码）
   *
   * **验证需求**: 5.3, 5.4, 5.8, 5.9, 10.4
   */
  async update(id: number, data: UpdateUserInput, siteId: number): Promise<UserWithoutPassword> {
    // 检查用户是否存在且未被删除
    const existingUser = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.site_id, siteId), eq(users.status, StatusEnum.NORMAL)))
      .get()

    if (!existingUser) {
      throw new NotFoundError('用户不存在或已被删除')
    }

    // 如果更新用户名，验证唯一性
    if (data.username && data.username !== existingUser.username) {
      const usernameExists = await this.validateUsername(data.username, siteId, id)
      if (!usernameExists) {
        throw new ConflictError(`用户名 "${data.username}" 已存在`)
      }
    }

    // 如果更新邮箱，验证唯一性
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.validateEmail(data.email, siteId, id)
      if (!emailExists) {
        throw new ConflictError(`邮箱 "${data.email}" 已存在`)
      }
    }

    // 如果更新 EVM 地址，验证格式和唯一性
    let normalizedEvmAddress: string | null | undefined
    if (data.evm_address !== undefined) {
      if (data.evm_address === null || data.evm_address === '') {
        // 允许清空 EVM 地址
        normalizedEvmAddress = null
      } else {
        // 验证格式
        if (!validateEvmAddressFormat(data.evm_address)) {
          throw new ConflictError(`无效的 EVM 地址格式: ${data.evm_address}`)
        }

        // 规范化地址（转换为小写）
        normalizedEvmAddress = normalizeEvmAddress(data.evm_address)

        // 如果地址与现有地址不同，验证唯一性
        if (normalizedEvmAddress !== existingUser.evm_address) {
          const evmAddressExists = await this.validateEvmAddress(normalizedEvmAddress, siteId, id)
          if (!evmAddressExists) {
            throw new ConflictError(`EVM 地址 "${normalizedEvmAddress}" 已存在`)
          }
        }
      }
    }

    // 准备更新数据
    const updateData: any = {
      update_at: new Date(),
    }

    if (data.username !== undefined) updateData.username = data.username
    if (data.nickname !== undefined) updateData.nickname = data.nickname
    if (data.avatar !== undefined) updateData.avatar = data.avatar
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.gender !== undefined) updateData.gender = data.gender
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (normalizedEvmAddress !== undefined) updateData.evm_address = normalizedEvmAddress

    // 如果提供新密码，对 SHA256 哈希再进行 bcrypt 哈希后更新
    if (data.password) {
      updateData.password = await hashPassword(data.password)
    }

    // 更新用户记录
    const [result] = await this.db.update(users).set(updateData).where(eq(users.id, id)).returning()

    // 返回用户对象（不含密码）
    return this.excludePassword(result)
  }

  /**
   * 软删除用户
   *
   * 将 status 设置为 StatusEnum.DELETE，更新 update_at。
   *
   * @param id - 用户ID
   * @param siteId - 站点ID
   *
   * **验证需求**: 5.5
   */
  async delete(id: number, siteId: number): Promise<void> {
    const now = new Date()

    const result = await this.db
      .update(users)
      .set({
        status: StatusEnum.DELETE,
        update_at: now,
      })
      .where(and(eq(users.id, id), eq(users.site_id, siteId)))
      .returning()

    if (result.length === 0) {
      throw new NotFoundError('用户不存在')
    }
  }

  /**
   * 用户登录
   *
   * 接收前端传来的 SHA256 哈希密码，验证用户名和密码，生成 JWT token。
   * 更新最后登录时间。
   *
   * @param username - 用户名
   * @param passwordHash - SHA256 哈希后的密码
   * @param siteId - 站点ID
   * @returns JWT token 和用户信息（不含密码）
   *
   * **验证需求**: 10.2, 10.5
   */
  async login(username: string, passwordHash: string, siteId: number): Promise<LoginResult> {
    // 查找用户
    const user = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.username, username),
          eq(users.site_id, siteId),
          eq(users.status, StatusEnum.NORMAL)
        )
      )
      .get()

    if (!user) {
      throw new AuthenticationError('用户名或密码错误')
    }

    // 验证密码（passwordHash 是前端传来的 SHA256 哈希）
    const isPasswordValid = await verifyPassword(passwordHash, user.password)
    if (!isPasswordValid) {
      throw new AuthenticationError('用户名或密码错误')
    }

    // 更新最后登录时间
    const now = new Date()
    await this.db
      .update(users)
      .set({
        last_login_time: now,
        update_at: now,
      })
      .where(eq(users.id, user.id))
      .run()

    // 生成 JWT token
    const token = await generateToken(
      {
        userId: user.id,
        username: user.username,
        type: user.type as UserTypeEnum,
        siteId: user.site_id,
      },
      this.jwtSecret,
      this.jwtExpiration
    )

    return {
      token,
      user: this.excludePassword(user),
    }
  }

  /**
   * 验证用户名唯一性
   *
   * 检查用户名在指定站点内是否已存在（排除已删除用户）。
   *
   * @param username - 用户名
   * @param siteId - 站点ID
   * @param excludeUserId - 排除的用户ID（用于更新时）
   * @returns true 表示用户名可用，false 表示已存在
   *
   * **验证需求**: 5.6
   */
  async validateUsername(
    username: string,
    siteId: number,
    excludeUserId?: number
  ): Promise<boolean> {
    const conditions = [
      eq(users.username, username),
      eq(users.site_id, siteId),
      eq(users.status, StatusEnum.NORMAL),
    ]

    const existingUser = await this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .get()

    // 如果没有找到用户，用户名可用
    if (!existingUser) {
      return true
    }

    // 如果找到的用户是当前用户（更新场景），用户名可用
    if (excludeUserId && existingUser.id === excludeUserId) {
      return true
    }

    // 用户名已被其他用户使用
    return false
  }

  /**
   * 验证邮箱唯一性
   *
   * 检查邮箱在指定站点内是否已存在（排除已删除用户）。
   *
   * @param email - 邮箱
   * @param siteId - 站点ID
   * @param excludeUserId - 排除的用户ID（用于更新时）
   * @returns true 表示邮箱可用，false 表示已存在
   *
   * **验证需求**: 5.7
   */
  async validateEmail(email: string, siteId: number, excludeUserId?: number): Promise<boolean> {
    const conditions = [
      eq(users.email, email),
      eq(users.site_id, siteId),
      eq(users.status, StatusEnum.NORMAL),
    ]

    const existingUser = await this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .get()

    // 如果没有找到用户，邮箱可用
    if (!existingUser) {
      return true
    }

    // 如果找到的用户是当前用户（更新场景），邮箱可用
    if (excludeUserId && existingUser.id === excludeUserId) {
      return true
    }

    // 邮箱已被其他用户使用
    return false
  }

  /**
   * 验证 EVM 地址唯一性
   *
   * 检查 EVM 地址在指定站点内是否已存在（排除已删除用户）。
   *
   * @param evmAddress - EVM 地址（已规范化为小写）
   * @param siteId - 站点ID
   * @param excludeUserId - 排除的用户ID（用于更新时）
   * @returns true 表示地址可用，false 表示已存在
   *
   * **验证需求**: 5.9, 21.8
   */
  async validateEvmAddress(
    evmAddress: string,
    siteId: number,
    excludeUserId?: number
  ): Promise<boolean> {
    const conditions = [
      eq(users.evm_address, evmAddress),
      eq(users.site_id, siteId),
      eq(users.status, StatusEnum.NORMAL),
    ]

    const existingUser = await this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .get()

    // 如果没有找到用户，地址可用
    if (!existingUser) {
      return true
    }

    // 如果找到的用户是当前用户（更新场景），地址可用
    if (excludeUserId && existingUser.id === excludeUserId) {
      return true
    }

    // 地址已被其他用户使用
    return false
  }

  /**
   * 通过 EVM 地址查找用户
   *
   * 查找指定站点内具有该 EVM 地址的用户（排除已删除用户）。
   *
   * @param evmAddress - EVM 地址（已规范化为小写）
   * @param siteId - 站点ID
   * @returns 用户对象或 null
   *
   * **验证需求**: 21.4, 21.5
   */
  async findByEvmAddress(evmAddress: string, siteId: number): Promise<User | null> {
    const user = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.evm_address, evmAddress),
          eq(users.site_id, siteId),
          eq(users.status, StatusEnum.NORMAL)
        )
      )
      .get()

    return user || null
  }

  /**
   * EVM 钱包登录
   *
   * 验证签名，恢复签名者地址，查找对应用户并生成 JWT token。
   * 更新最后登录时间。
   *
   * @param signature - 签名字符串
   * @param message - 被签名的消息
   * @param siteId - 站点ID
   * @returns JWT token 和用户信息（不含密码）
   *
   * **验证需求**: 21.3, 21.4, 21.5, 21.6, 21.8
   */
  async loginWithWallet(signature: string, message: string, siteId: number): Promise<LoginResult> {
    // 验证签名并恢复地址
    let recoveredAddress: string
    try {
      recoveredAddress = await verifySignatureAndRecoverAddress(message, signature as `0x${string}`)
    } catch (error) {
      throw new AuthenticationError('签名验证失败')
    }

    // 规范化地址（转换为小写）
    const normalizedAddress = normalizeEvmAddress(recoveredAddress)

    // 查找用户
    const user = await this.findByEvmAddress(normalizedAddress, siteId)

    if (!user) {
      throw new AuthenticationError('未找到关联的用户账户')
    }

    // 更新最后登录时间
    const now = new Date()
    await this.db
      .update(users)
      .set({
        last_login_time: now,
        update_at: now,
      })
      .where(eq(users.id, user.id))
      .run()

    // 生成 JWT token
    const token = await generateToken(
      {
        userId: user.id,
        username: user.username,
        type: user.type as UserTypeEnum,
        siteId: user.site_id,
      },
      this.jwtSecret,
      this.jwtExpiration
    )

    return {
      token,
      user: this.excludePassword(user),
    }
  }

  /**
   * 生成钱包登录消息
   *
   * 生成一个包含 nonce 和时间戳的消息供用户签名。
   *
   * @returns 格式化的登录消息
   *
   * **验证需求**: 21.2, 21.7
   */
  generateWalletLoginMessage(): string {
    return generateWalletLoginMessage()
  }

  /**
   * 从用户对象中排除密码字段
   *
   * @param user - 完整用户对象
   * @returns 不含密码的用户对象
   *
   * **验证需求**: 10.4
   */
  private excludePassword(user: any): UserWithoutPassword {
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword as UserWithoutPassword
  }
}
