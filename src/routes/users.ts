/**
 * 用户路由
 * 
 * 实现用户管理相关的 API 端点：
 * - POST /api/v1/register - 用户注册（公开端点）
 * - POST /api/v1/user - 创建用户（需要 MANAGE 或更高权限）
 * - PUT /api/v1/user/:id - 更新用户（需要 MANAGE 或更高权限，或用户本人）
 * - DELETE /api/v1/user/:id - 删除用户（需要 MANAGE 或更高权限）
 * - GET /api/v1/user - 查询用户列表（需要认证，支持分页和过滤）
 * - POST /api/v1/login - 用户登录（公开端点，不需要认证）
 * - GET /api/v1/login/nonce - 获取钱包登录 nonce（公开端点）
 * - POST /api/v1/login/evm - EVM 钱包签名登录（公开端点）
 * 
 * **验证需求**: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 21.1, 21.2, 21.3, 21.4, 21.5
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { UserService } from '../services/userService'
import { authMiddleware, getAuthContext } from '../middleware/auth'
import { siteMiddleware, getSiteContext } from '../middleware/site'
import { checkPermission } from '../utils/authorization'
import { successResponse } from '../utils/response'
import { 
  AuthorizationError, 
  ValidationError, 
  NotFoundError 
} from '../errors'
import { 
  UserTypeEnum, 
  CreateUserInput, 
  UpdateUserInput 
} from '../types'

const users = new Hono()

/**
 * POST /api/v1/register
 * 用户注册（公开端点）
 * 
 * 请求体：
 * - username: string - 用户名
 * - password: string - 密码
 * - nickname: string - 昵称
 * - email?: string - 邮箱（可选）
 * - evm_address?: string - EVM 地址（可选）
 * 
 * 响应：
 * - token: string - JWT 令牌
 * - user: UserWithoutPassword - 用户信息（不含密码）
 * 
 * **验证需求**: 5.1, 5.2
 */
users.post('/register', siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)
  
  // 获取请求体
  const body = await c.req.json() as CreateUserInput

  // 验证必填字段
  if (!body.username || !body.password || !body.nickname) {
    throw new ValidationError('用户名、密码和昵称不能为空')
  }

  // 创建用户服务实例
  const userService = new UserService(
    c.env.DB,
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRATION || '7d'
  )

  // 注册用户（默认为 USER 类型）
  const user = await userService.create({
    ...body,
    type: UserTypeEnum.USER // 注册的用户默认为普通用户
  }, siteId)

  // 自动登录，生成 token
  const token = await userService.generateToken({
    userId: user.id,
    username: user.username,
    type: user.type,
    siteId: user.site_id
  })

  return c.json(successResponse({
    token,
    user
  }), 201)
})

/**
 * POST /api/v1/login
 * 用户登录（公开端点）
 * 
 * 请求体：
 * - username: string - 用户名
 * - password: string - 密码
 * 
 * 响应：
 * - token: string - JWT 令牌
 * - user: UserWithoutPassword - 用户信息（不含密码）
 * 
 * **验证需求**: 9.1
 */
users.post('/login', siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)
  
  // 获取请求体
  const body = await c.req.json()
  const { username, password } = body

  // 验证必填字段
  if (!username || !password) {
    throw new ValidationError('用户名和密码不能为空')
  }

  // 创建用户服务实例
  const userService = new UserService(
    c.env.DB,
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRATION || '7d'
  )

  // 执行登录
  const result = await userService.login(username, password, siteId)

  return c.json(successResponse(result))
})

/**
 * GET /api/v1/login/nonce
 * 获取钱包登录的 nonce 消息（公开端点）
 * 
 * 响应：
 * - message: string - 需要签名的消息
 * - timestamp: number - 时间戳
 * 
 * **验证需求**: 21.1, 21.2
 */
users.get('/login/nonce', async (c: Context) => {
  // 创建用户服务实例
  const userService = new UserService(
    c.env.DB,
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRATION || '7d'
  )

  // 生成 nonce 消息
  const message = userService.generateWalletLoginMessage()
  
  // 提取时间戳
  const timestampMatch = message.match(/Timestamp: (\d+)/)
  const timestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : Math.floor(Date.now() / 1000)

  return c.json(successResponse({
    message,
    timestamp
  }))
})

/**
 * POST /api/v1/login/evm
 * EVM 钱包签名登录（公开端点）
 * 
 * 请求体：
 * - signature: string - 签名字符串（0x 开头）
 * - message: string - 被签名的消息（从 /login/nonce 获取）
 * 
 * 响应：
 * - token: string - JWT 令牌
 * - user: UserWithoutPassword - 用户信息（不含密码）
 * 
 * **验证需求**: 21.1, 21.3, 21.4, 21.5
 */
users.post('/login/evm', siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)
  
  // 获取请求体
  const body = await c.req.json()
  const { signature, message } = body

  // 验证必填字段
  if (!signature || !message) {
    throw new ValidationError('签名和消息不能为空')
  }

  // 验证签名格式
  if (!signature.startsWith('0x') || signature.length !== 132) {
    throw new ValidationError('无效的签名格式')
  }

  // 验证消息时间戳（可选，防止重放攻击）
  const { validateMessageTimestamp } = await import('../utils/evmSignature')
  if (!validateMessageTimestamp(message)) {
    throw new ValidationError('消息已过期，请重新获取 nonce')
  }

  // 创建用户服务实例
  const userService = new UserService(
    c.env.DB,
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRATION || '7d'
  )

  // 执行钱包登录
  const result = await userService.loginWithWallet(signature, message, siteId)

  return c.json(successResponse(result))
})

/**
 * POST /api/v1/user
 * 创建用户（需要 MANAGE 或更高权限）
 * 
 * 请求体：CreateUserInput
 * 
 * 响应：UserWithoutPassword
 * 
 * **验证需求**: 5.1, 5.2
 */
users.post('/', authMiddleware, siteMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取请求体
  const body = await c.req.json() as CreateUserInput

  // 验证必填字段
  if (!body.username || !body.password) {
    throw new ValidationError('用户名和密码不能为空')
  }

  // 创建用户服务实例
  const userService = new UserService(
    c.env.DB,
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRATION || '7d'
  )

  // 创建用户
  const user = await userService.create(body, siteId)

  return c.json(successResponse(user), 201)
})

/**
 * PUT /api/v1/user/:id
 * 更新用户（需要 MANAGE 或更高权限，或用户本人）
 * 
 * 路径参数：
 * - id: number - 用户ID
 * 
 * 请求体：UpdateUserInput
 * 
 * 响应：UserWithoutPassword
 * 
 * **验证需求**: 5.3, 5.4
 */
users.put('/:id', authMiddleware, siteMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 获取用户ID
  const userId = parseInt(c.req.param('id'), 10)
  if (isNaN(userId) || userId <= 0) {
    throw new ValidationError('无效的用户ID')
  }

  // 检查权限：需要 MANAGE 或更高权限，或者是用户本人
  const isOwnProfile = authContext.userId === userId
  const hasManagePermission = checkPermission(authContext.type, UserTypeEnum.MANAGE)

  if (!isOwnProfile && !hasManagePermission) {
    throw new AuthorizationError('权限不足，只能修改自己的信息或需要 MANAGE 权限')
  }

  // 获取请求体
  const body = await c.req.json() as UpdateUserInput

  // 如果是普通用户修改自己的信息，不允许修改 type 和 status
  if (isOwnProfile && !hasManagePermission) {
    if (body.type !== undefined || body.status !== undefined) {
      throw new AuthorizationError('普通用户不能修改自己的角色或状态')
    }
  }

  // 创建用户服务实例
  const userService = new UserService(
    c.env.DB,
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRATION || '7d'
  )

  // 更新用户
  const user = await userService.update(userId, body, siteId)

  return c.json(successResponse(user))
})

/**
 * DELETE /api/v1/user/:id
 * 删除用户（需要 MANAGE 或更高权限）
 * 
 * 路径参数：
 * - id: number - 用户ID
 * 
 * 响应：成功消息
 * 
 * **验证需求**: 5.5
 */
users.delete('/:id', authMiddleware, siteMiddleware, async (c: Context) => {
  const authContext = getAuthContext(c)
  const { siteId } = getSiteContext(c)

  // 检查权限：需要 MANAGE 或更高权限
  if (!checkPermission(authContext.type, UserTypeEnum.MANAGE)) {
    throw new AuthorizationError('权限不足，需要 MANAGE 或更高权限')
  }

  // 获取用户ID
  const userId = parseInt(c.req.param('id'), 10)
  if (isNaN(userId) || userId <= 0) {
    throw new ValidationError('无效的用户ID')
  }

  // 不允许删除自己
  if (authContext.userId === userId) {
    throw new ValidationError('不能删除自己的账户')
  }

  // 创建用户服务实例
  const userService = new UserService(
    c.env.DB,
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRATION || '7d'
  )

  // 删除用户（软删除）
  await userService.delete(userId, siteId)

  return c.json(successResponse({ message: '用户已删除' }))
})

/**
 * GET /api/v1/user
 * 查询用户列表（需要认证，支持分页和过滤）
 * 
 * 查询参数：
 * - page: number - 页码（默认 1）
 * - pageSize: number - 每页数量（默认 10）
 * - username: string - 用户名过滤（模糊匹配）
 * - type: UserTypeEnum - 用户类型过滤
 * - status: StatusEnum - 状态过滤
 * 
 * 响应：PaginatedResult<UserWithoutPassword>
 * 
 * **验证需求**: 5.4
 */
users.get('/', authMiddleware, siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)

  // 获取查询参数
  const page = parseInt(c.req.query('page') || '1', 10)
  const pageSize = parseInt(c.req.query('pageSize') || '10', 10)
  const username = c.req.query('username')
  const type = c.req.query('type') as UserTypeEnum | undefined
  const status = c.req.query('status')

  // 验证分页参数
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    throw new ValidationError('无效的分页参数')
  }

  // 创建用户服务实例
  const userService = new UserService(
    c.env.DB,
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRATION || '7d'
  )

  // 构建查询（这里简化实现，实际应该在 UserService 中实现 query 方法）
  // 由于 UserService 没有 query 方法，我们直接使用数据库查询
  const { users: usersTable, StatusEnum } = await import('../db/schema')
  const { eq, and, like } = await import('drizzle-orm')

  // 构建查询条件
  const conditions = [eq(usersTable.site_id, siteId)]

  // 默认排除已删除的用户
  if (!status) {
    conditions.push(eq(usersTable.status, StatusEnum.NORMAL))
  } else {
    conditions.push(eq(usersTable.status, status as any))
  }

  if (username) {
    conditions.push(like(usersTable.username, `%${username}%`))
  }

  if (type) {
    conditions.push(eq(usersTable.type, type))
  }

  // 查询总数
  const totalResult = await c.env.DB
    .select({ count: usersTable.id })
    .from(usersTable)
    .where(and(...conditions))
    .all()

  const total = totalResult.length

  // 查询数据
  const offset = (page - 1) * pageSize
  const results = await c.env.DB
    .select()
    .from(usersTable)
    .where(and(...conditions))
    .limit(pageSize)
    .offset(offset)
    .all()

  // 排除密码字段
  const usersWithoutPassword = results.map((user: any) => {
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  })

  // 构建分页结果
  const paginatedResult = {
    data: usersWithoutPassword,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }

  return c.json(successResponse(paginatedResult))
})

export default users
