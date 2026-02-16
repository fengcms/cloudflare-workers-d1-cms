import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

// ============================================================================
// 枚举定义（Enums）
// ============================================================================

// 状态枚举（所有表通用）
export enum StatusEnum {
  PENDING = 'PENDING',    // 待审核
  NORMAL = 'NORMAL',      // 审核通过
  FAILURE = 'FAILURE',    // 审核未通过
  DELETE = 'DELETE'       // 已删除（软删除）
}

// 用户类型枚举
export enum UserTypeEnum {
  SUPERMANAGE = 'SUPERMANAGE', // 超级管理员
  MANAGE = 'MANAGE',           // 站点管理员
  EDITOR = 'EDITOR',           // 文章编辑
  USER = 'USER'                // 普通用户
}

// 用户性别枚举
export enum GenderEnum {
  MALE = 'MALE',         // 男
  FEMALE = 'FEMALE',     // 女
  UNKNOWN = 'UNKNOWN'    // 未知
}

// 编辑器类型枚举
export enum EditorEnum {
  RICHTEXT = 'RICHTEXT', // 富文本编辑器
  MARKDOWN = 'MARKDOWN'  // Markdown编辑器
}

// 字典类型枚举
export enum DictTypeEnum {
  AUTHOR = 'AUTHOR',     // 作者字典
  ORIGIN = 'ORIGIN',     // 文章来源字典
  TAG = 'TAG',           // 标签字典
  FRIENDLINK = 'FRIENDLINK' // 友情链接字典
}

// 栏目类型枚举
export enum ChannelTypeEnum {
  ARTICLE = 'ARTICLE'    // 文章栏目（默认，后续可扩展）
}

// 文章类型枚举
export enum ArticleTypeEnum {
  NORMAL = 'NORMAL',     // 普通文章（默认）
  HOT = 'HOT',           // 热门文章
  MEDIA = 'MEDIA'        // 媒体文章（含视频等）
}

// 日志操作类型枚举
export enum LogTypeEnum {
  POST = 'POST',         // 新增操作
  PUT = 'PUT',           // 修改操作
  DELETE = 'DELETE'      // 删除操作
}

// 业务状态码枚举（前后端同步）
export enum BusinessCode {
  // 通用成功
  SUCCESS = 200,
  // 通用错误
  BAD_REQUEST = 400,    // 参数错误
  UNAUTHORIZED = 401,   // 未登录/Token失效
  FORBIDDEN = 403,      // 权限不足
  NOT_FOUND = 404,      // 资源不存在
  CONFLICT = 409,       // 数据冲突（如账号已存在）
  TOO_MANY_REQUESTS = 429, // 请求限流
  SERVER_ERROR = 500,   // 业务逻辑异常（如数据库操作失败）
  // 业务专属错误
  ARTICLE_STATUS_ERROR = 10001, // 文章状态异常
  USER_PASSWORD_ERROR = 10002,  // 密码错误
  FILE_UPLOAD_ERROR = 10003,    // 文件上传失败
  TOKEN_EXPIRED = 10004,        // Token过期
  SIGNATURE_ERROR = 10005       // 签名验证失败
}

// 模块枚举
export enum ModuleEnum {
  ARTICLE = 'ARTICLE',
  CHANNEL = 'CHANNEL',
  USER = 'USER',
  SITE = 'SITE',
  DICTS = 'DICTS',
  PROMO = 'PROMO',
  SYSTEM = 'SYSTEM'
}

// ============================================================================
// 数据表定义（Tables）
// ============================================================================

// 站点信息表
export const sites = sqliteTable('sites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 50 }).notNull(),
  title: text('title', { length: 100 }).default(''),
  logo: text('logo', { length: 255 }).default(''),
  keywords: text('keywords').default(''),
  description: text('description').default(''),
  copyright: text('copyright').default(''),
  status: text('status', { length: 20 }).default(StatusEnum.PENDING),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  update_at: integer('update_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  statusIdx: index('idx_site_status').on(table.status)
}))

// 文章数据表
export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title', { length: 200 }).notNull(),
  channel_id: integer('channel_id').notNull(),
  tags: text('tags').default(''), // JSON字符串
  description: text('description').default(''),
  content: text('content').default(''),
  markdown: text('markdown').default(''),
  img: text('img', { length: 255 }).default(''),
  video: text('video', { length: 255 }).default(''),
  author: text('author', { length: 50 }).default(''),
  author_id: integer('author_id'),
  origin: text('origin', { length: 50 }).default(''),
  origin_id: integer('origin_id'),
  editor_id: integer('editor_id'),
  user_id: integer('user_id'),
  type: text('type', { length: 20 }).default(ArticleTypeEnum.NORMAL),
  status: text('status', { length: 20 }).default(StatusEnum.PENDING),
  is_top: integer('is_top').default(0),
  site_id: integer('site_id').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  update_at: integer('update_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  siteStatusIdx: index('idx_article_site_status').on(table.site_id, table.status),
  channelIdx: index('idx_article_channel').on(table.channel_id),
  tagsIdx: index('idx_article_tags').on(table.tags),
  userIdx: index('idx_article_user').on(table.user_id)
}))

// 栏目数据表
export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 50 }).notNull(),
  pid: integer('pid').default(0),
  sort: integer('sort').default(0),
  keywords: text('keywords', { length: 200 }).default(''),
  description: text('description').default(''),
  type: text('type', { length: 20 }).default(ChannelTypeEnum.ARTICLE),
  status: text('status', { length: 20 }).default(StatusEnum.PENDING),
  img: text('img', { length: 255 }).default(''),
  site_id: integer('site_id').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  update_at: integer('update_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  siteStatusIdx: index('idx_channel_site_status').on(table.site_id, table.status),
  pidIdx: index('idx_channel_pid').on(table.pid)
}))

// 用户信息表
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username', { length: 50 }).notNull(),
  password: text('password', { length: 255 }).notNull(),
  nickname: text('nickname', { length: 50 }).default(''),
  avatar: text('avatar', { length: 255 }).default(''),
  email: text('email', { length: 100 }).default(''),
  phone: text('phone', { length: 20 }).default(''),
  gender: text('gender', { length: 20 }).default(GenderEnum.UNKNOWN),
  type: text('type', { length: 20 }).default(UserTypeEnum.USER),
  site_id: integer('site_id'),
  status: text('status', { length: 20 }).default(StatusEnum.NORMAL),
  last_login_time: integer('last_login_time', { mode: 'timestamp' }),
  evm_address: text('evm_address', { length: 42 }), // EVM 钱包地址（可选，0x + 40 个十六进制字符）
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  update_at: integer('update_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  usernameIdx: index('idx_user_username').on(table.username),
  siteTypeIdx: index('idx_user_site_type').on(table.site_id, table.type),
  statusIdx: index('idx_user_status').on(table.status),
  evmAddressIdx: index('idx_user_evm_address').on(table.evm_address) // 索引用于钱包登录查询
}))

// 字典数据表
export const dicts = sqliteTable('dicts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 50 }).notNull(),
  type: text('type', { length: 20 }).notNull(),
  value: text('value', { length: 100 }).default(''),
  sort: integer('sort').default(0),
  site_id: integer('site_id').notNull(),
  status: text('status', { length: 20 }).default(StatusEnum.NORMAL),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  update_at: integer('update_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  siteTypeIdx: index('idx_dicts_site_type').on(table.site_id, table.type),
  statusIdx: index('idx_dicts_status').on(table.status)
}))

// 推广数据表（使用 promo 命名以避免广告屏蔽插件拦截）
export const promos = sqliteTable('promos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title', { length: 100 }).notNull(),
  img: text('img', { length: 255 }).default(''),
  url: text('url', { length: 255 }).default(''),
  position: text('position', { length: 50 }).default(''),
  content: text('content').default(''),
  start_time: integer('start_time', { mode: 'timestamp' }),
  end_time: integer('end_time', { mode: 'timestamp' }),
  sort: integer('sort').default(0),
  site_id: integer('site_id').notNull(),
  status: text('status', { length: 20 }).default(StatusEnum.NORMAL),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  update_at: integer('update_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  siteStatusIdx: index('idx_promo_site_status').on(table.site_id, table.status),
  positionIdx: index('idx_promo_position').on(table.position),
  timeIdx: index('idx_promo_time').on(table.start_time, table.end_time)
}))

// 日志数据表
export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id'),
  username: text('username', { length: 50 }).default(''),
  type: text('type', { length: 20 }).notNull(),
  module: text('module', { length: 50 }).notNull(),
  content: text('content').notNull(),
  ip: text('ip', { length: 50 }).default(''),
  user_agent: text('user_agent', { length: 255 }).default(''),
  site_id: integer('site_id'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  userIdIdx: index('idx_logs_user_id').on(table.user_id),
  siteModuleIdx: index('idx_logs_site_module').on(table.site_id, table.module),
  createdAtIdx: index('idx_logs_create_time').on(table.created_at)
}))
