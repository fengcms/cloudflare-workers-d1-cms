// ============================================================================
// 枚举类型（Enums）
// ============================================================================

// 状态枚举（所有表通用）
export enum StatusEnum {
  PENDING = 'PENDING', // 待审核
  NORMAL = 'NORMAL', // 审核通过
  FAILURE = 'FAILURE', // 审核未通过
  DELETE = 'DELETE', // 已删除（软删除）
}

// 用户类型枚举
export enum UserTypeEnum {
  SUPERMANAGE = 'SUPERMANAGE', // 超级管理员
  MANAGE = 'MANAGE', // 站点管理员
  EDITOR = 'EDITOR', // 文章编辑
  USER = 'USER', // 普通用户
}

// 用户性别枚举
export enum GenderEnum {
  MALE = 'MALE', // 男
  FEMALE = 'FEMALE', // 女
  UNKNOWN = 'UNKNOWN', // 未知
}

// 编辑器类型枚举
export enum EditorEnum {
  RICHTEXT = 'RICHTEXT', // 富文本编辑器
  MARKDOWN = 'MARKDOWN', // Markdown编辑器
}

// 字典类型枚举
export enum DictTypeEnum {
  AUTHOR = 'AUTHOR', // 作者字典
  ORIGIN = 'ORIGIN', // 文章来源字典
  TAG = 'TAG', // 标签字典
  FRIENDLINK = 'FRIENDLINK', // 友情链接字典
}

// 栏目类型枚举
export enum ChannelTypeEnum {
  ARTICLE = 'ARTICLE', // 文章栏目（默认，后续可扩展）
}

// 文章类型枚举
export enum ArticleTypeEnum {
  NORMAL = 'NORMAL', // 普通文章（默认）
  HOT = 'HOT', // 热门文章
  MEDIA = 'MEDIA', // 媒体文章（含视频等）
}

// 日志操作类型枚举
export enum LogTypeEnum {
  POST = 'POST', // 新增操作
  PUT = 'PUT', // 修改操作
  DELETE = 'DELETE', // 删除操作
}

// 业务状态码枚举（前后端同步）
export enum BusinessCode {
  // 通用成功
  SUCCESS = 200,
  // 通用错误
  BAD_REQUEST = 400, // 参数错误
  UNAUTHORIZED = 401, // 未登录/Token失效
  FORBIDDEN = 403, // 权限不足
  NOT_FOUND = 404, // 资源不存在
  CONFLICT = 409, // 数据冲突（如账号已存在）
  TOO_MANY_REQUESTS = 429, // 请求限流
  SERVER_ERROR = 500, // 业务逻辑异常（如数据库操作失败）
  // 业务专属错误
  ARTICLE_STATUS_ERROR = 10001, // 文章状态异常
  USER_PASSWORD_ERROR = 10002, // 密码错误
  FILE_UPLOAD_ERROR = 10003, // 文件上传失败
  TOKEN_EXPIRED = 10004, // Token过期
  SIGNATURE_ERROR = 10005, // 签名验证失败
}

// 模块枚举
export enum ModuleEnum {
  ARTICLE = 'ARTICLE',
  CHANNEL = 'CHANNEL',
  USER = 'USER',
  SITE = 'SITE',
  DICTS = 'DICTS',
  PROMO = 'PROMO',
  SYSTEM = 'SYSTEM',
}

// ============================================================================
// 核心实体接口（Core Entity Interfaces）
// ============================================================================

// 站点接口
export interface Site {
  id: number
  name: string
  title: string
  logo: string
  keywords: string
  description: string
  copyright: string
  status: StatusEnum
  created_at: Date
  update_at: Date
}

// 文章接口
export interface Article {
  id: number
  title: string
  channel_id: number
  tags: string
  description: string
  content: string
  markdown: string
  img: string
  video: string
  author: string
  author_id: number | null
  origin: string
  origin_id: number | null
  editor_id: number | null
  user_id: number | null
  type: ArticleTypeEnum
  status: StatusEnum
  is_top: number
  site_id: number
  created_at: Date
  update_at: Date
}

// 栏目接口
export interface Channel {
  id: number
  name: string
  pid: number
  sort: number
  keywords: string
  description: string
  type: ChannelTypeEnum
  status: StatusEnum
  img: string
  site_id: number
  created_at: Date
  update_at: Date
}

// 栏目树接口（带子节点）
export interface ChannelTree extends Channel {
  children: ChannelTree[]
}

// 用户接口
export interface User {
  id: number
  username: string
  password: string
  nickname: string
  avatar: string
  email: string
  phone: string
  gender: GenderEnum
  type: UserTypeEnum
  site_id: number | null
  status: StatusEnum
  last_login_time: Date | null
  evm_address: string | null // EVM 钱包地址（可选）
  created_at: Date
  update_at: Date
}

// 字典接口
export interface Dict {
  id: number
  name: string
  type: DictTypeEnum
  value: string
  sort: number
  site_id: number
  status: StatusEnum
  created_at: Date
  update_at: Date
}

// 推广接口
export interface Promo {
  id: number
  title: string
  img: string
  url: string
  position: string
  content: string
  start_time: Date | null
  end_time: Date | null
  sort: number
  site_id: number
  status: StatusEnum
  created_at: Date
  update_at: Date
}

// 日志接口
export interface Log {
  id: number
  user_id: number | null
  username: string
  type: LogTypeEnum
  module: ModuleEnum
  content: string
  ip: string
  user_agent: string
  site_id: number | null
  created_at: Date
}

// ============================================================================
// 请求/响应类型（Request/Response Types）
// ============================================================================

// 查询参数接口
export interface QueryParams {
  // 过滤参数
  filters?: Record<string, any>

  // 排序参数
  sort?: string
  sortOrder?: 'asc' | 'desc'

  // 分页参数
  page?: number
  pageSize?: number

  // 搜索参数
  search?: string
  searchFields?: string[]

  // 比较运算符
  comparisons?: {
    field: string
    operator: 'gt' | 'lt' | 'gte' | 'lte'
    value: any
  }[]
}

// 分页结果接口
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 成功响应接口
export interface SuccessResponse<T = any> {
  success: true
  data: T
}

// 错误响应接口
export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

// API 响应类型（成功或错误）
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

// ============================================================================
// 上下文类型（Context Types）
// ============================================================================

// 认证上下文接口
export interface AuthContext {
  userId: number
  username: string
  type: UserTypeEnum
  siteId: number | null
}

// 站点上下文接口
export interface SiteContext {
  siteId: number
}

// 完整请求上下文接口（合并认证和站点上下文）
export interface RequestContext {
  userId: number
  username: string
  type: UserTypeEnum
  siteId: number
}

// ============================================================================
// 创建/更新输入类型（Create/Update Input Types）
// ============================================================================

// 站点创建输入
export interface CreateSiteInput {
  name: string
  title?: string
  logo?: string
  keywords?: string
  description?: string
  copyright?: string
}

// 站点更新输入
export interface UpdateSiteInput {
  name?: string
  title?: string
  logo?: string
  keywords?: string
  description?: string
  copyright?: string
  status?: StatusEnum
}

// 文章创建输入
export interface CreateArticleInput {
  title: string
  channel_id: number
  tags?: string
  description?: string
  content?: string
  markdown?: string
  img?: string
  video?: string
  author?: string
  author_id?: number
  origin?: string
  origin_id?: number
  editor_id?: number
  type?: ArticleTypeEnum
  is_top?: number
}

// 文章更新输入
export interface UpdateArticleInput {
  title?: string
  channel_id?: number
  tags?: string
  description?: string
  content?: string
  markdown?: string
  img?: string
  video?: string
  author?: string
  author_id?: number
  origin?: string
  origin_id?: number
  editor_id?: number
  type?: ArticleTypeEnum
  status?: StatusEnum
  is_top?: number
}

// 栏目创建输入
export interface CreateChannelInput {
  name: string
  pid?: number
  sort?: number
  keywords?: string
  description?: string
  type?: ChannelTypeEnum
  img?: string
}

// 栏目更新输入
export interface UpdateChannelInput {
  name?: string
  pid?: number
  sort?: number
  keywords?: string
  description?: string
  type?: ChannelTypeEnum
  status?: StatusEnum
  img?: string
}

// 用户创建输入
export interface CreateUserInput {
  username: string
  password: string
  nickname?: string
  avatar?: string
  email?: string
  phone?: string
  gender?: GenderEnum
  type?: UserTypeEnum
  evm_address?: string // EVM 钱包地址（可选）
}

// 用户更新输入
export interface UpdateUserInput {
  username?: string
  password?: string
  nickname?: string
  avatar?: string
  email?: string
  phone?: string
  gender?: GenderEnum
  type?: UserTypeEnum
  status?: StatusEnum
  evm_address?: string // EVM 钱包地址（可选）
}

// EVM 钱包登录请求
export interface WalletLoginRequest {
  evmAddress: string // EVM 钱包地址
  signature: string // 签名
  message: string // 被签名的消息（nonce）
}

// 钱包登录 nonce 响应
export interface WalletNonceResponse {
  message: string // 需要签名的消息
  timestamp: number // 时间戳
}

// 字典创建输入
export interface CreateDictInput {
  name: string
  type: DictTypeEnum
  value?: string
  sort?: number
}

// 字典更新输入
export interface UpdateDictInput {
  name?: string
  type?: DictTypeEnum
  value?: string
  sort?: number
  status?: StatusEnum
}

// 推广创建输入
export interface CreatePromoInput {
  title: string
  img?: string
  url?: string
  position?: string
  content?: string
  start_time?: Date
  end_time?: Date
  sort?: number
}

// 推广更新输入
export interface UpdatePromoInput {
  title?: string
  img?: string
  url?: string
  position?: string
  content?: string
  start_time?: Date
  end_time?: Date
  sort?: number
  status?: StatusEnum
}

// 日志创建输入
export interface CreateLogInput {
  user_id?: number
  username?: string
  type: LogTypeEnum
  module: ModuleEnum
  content: string
  ip?: string
  user_agent?: string
  site_id?: number
}

// 日志查询参数
export interface LogQueryParams extends QueryParams {
  userId?: number
  type?: LogTypeEnum
  module?: ModuleEnum
  startDate?: Date
  endDate?: Date
}

// ============================================================================
// 认证相关类型（Authentication Types）
// ============================================================================

// 登录输入
export interface LoginInput {
  username: string
  password: string
  siteId: number
}

// 登录结果
export interface LoginResult {
  token: string
  user: Omit<User, 'password'>
}

// JWT 载荷
export interface JWTPayload {
  userId: number
  username: string
  type: UserTypeEnum
  siteId: number | null
  iat?: number
  exp?: number
}

// ============================================================================
// 图片上传类型（Image Upload Types）
// ============================================================================

// 图片上传结果
export interface ImageUploadResult {
  url: string
  filename: string
}

// ============================================================================
// 工具类型（Utility Types）
// ============================================================================

// 排除密码字段的用户类型
export type UserWithoutPassword = Omit<User, 'password'>

// 数据库记录类型（带时间戳）
export interface TimestampedRecord {
  created_at: Date
  update_at: Date
}

// 软删除记录类型
export interface SoftDeletableRecord {
  status: StatusEnum
}

// 多站点记录类型
export interface MultiTenantRecord {
  site_id: number
}
