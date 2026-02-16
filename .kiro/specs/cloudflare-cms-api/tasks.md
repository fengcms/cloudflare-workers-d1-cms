# 实施计划：Cloudflare CMS API

## 概述

本实施计划将 Cloudflare CMS API 分解为增量开发步骤。每个任务都建立在前面的任务之上，确保核心功能尽早通过代码验证。实施使用 TypeScript、Hono 框架、Drizzle ORM 和 Cloudflare Workers 平台。

## 任务

- [x] 1. 项目初始化和核心基础设施
  - 初始化 Cloudflare Workers 项目，配置 TypeScript
  - 安装依赖：hono、drizzle-orm、drizzle-kit、jose（JWT）、bcryptjs
  - 配置 wrangler.toml，绑定 D1、R2、KV
  - 设置 Drizzle 配置文件
  - _需求：所有模块的基础_

- [ ] 2. 数据库模式和迁移
  - [x] 2.1 定义 Drizzle 表模式
    - 创建 src/db/schema.ts
    - 定义所有表：sites、articles、channels、users、dicts、promos、logs
    - 添加索引：site_id、status、外键、时间戳
    - _需求：1.5, 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 2.2 生成并应用数据库迁移
    - 使用 drizzle-kit 生成迁移文件
    - 创建本地 D1 数据库用于开发
    - 应用迁移
    - _需求：所有数据模型_
  
  - [x] 2.3 添加 EVM 地址字段到用户表
    - 在 src/db/schema.ts 的 users 表中添加 evm_address 字段
    - 添加 evm_address 索引用于钱包登录查询
    - 生成新的数据库迁移
    - 应用迁移到本地数据库
    - _需求：5.8, 5.9, 21.1, 21.2, 21.3_

- [x] 3. 核心类型和接口
  - 创建 src/types/index.ts
  - 定义所有 TypeScript 接口：Site、Article、Channel、User、Dict、Promo、Log
  - 定义枚举：StatusEnum、UserTypeEnum、GenderEnum、EditorEnum、DictTypeEnum、ChannelTypeEnum、ArticleTypeEnum、LogTypeEnum、BusinessCode、ModuleEnum
  - 定义请求/响应类型：QueryParams、PaginatedResult、ErrorResponse
  - 定义上下文类型：AuthContext、SiteContext
  - _需求：所有模块的类型定义_

- [ ] 4. 统一响应和错误处理
  - [x] 4.1 实现响应格式化工具
    - 创建 src/utils/response.ts
    - 实现 successResponse() 和 errorResponse() 函数
    - 确保一致的 JSON 结构
    - _需求：13.1, 13.2, 13.3_
  
  - [x] 4.2 实现错误类
    - 创建 src/errors/index.ts
    - 定义错误类：ValidationError、AuthenticationError、AuthorizationError、NotFoundError、ConflictError
    - 每个错误类包含 HTTP 状态码
    - _需求：18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [x] 4.3 实现全局错误处理中间件
    - 创建 src/middleware/errorHandler.ts
    - 捕获所有错误并转换为统一响应格式
    - 记录错误详情（不暴露敏感信息）
    - _需求：18.6_

- [ ] 5. 认证和授权
  - [x] 5.1 实现密码哈希工具
    - 创建 src/utils/password.ts
    - 实现 hashPassword() 使用 bcryptjs
    - 实现 verifyPassword() 比较密码和哈希
    - _需求：10.1, 10.2, 10.3_
  
  - [x] 5.2 编写密码哈希属性测试
    - **属性 19: 密码哈希验证对称性**
    - **验证需求：10.1, 10.2**
  
  - [x] 5.3 实现 JWT 工具
    - 创建 src/utils/jwt.ts
    - 实现 generateToken() 使用 jose 库
    - 实现 verifyToken() 验证和解码令牌
    - 在载荷中包含 userId、username、role、siteId
    - _需求：9.1, 9.2, 9.5, 9.6_
  
  - [x] 5.4 编写 JWT 往返属性测试
    - **属性 5: JWT 令牌往返一致性**
    - **验证需求：9.2, 9.6**
  
  - [x] 5.5 实现认证中间件
    - 创建 src/middleware/auth.ts
    - 从 Authorization 头提取 JWT
    - 验证令牌并提取用户上下文
    - 将 AuthContext 附加到请求上下文
    - _需求：9.3, 9.4_
  
  - [x] 5.6 实现站点隔离中间件
    - 创建 src/middleware/site.ts
    - 从 Site-Id 头提取 site_id
    - 验证 site_id 存在
    - 将 SiteContext 附加到请求上下文
    - _需求：1.3_
  
  - [x] 5.7 实现角色授权工具
    - 创建 src/utils/authorization.ts
    - 实现 checkPermission() 验证角色权限
    - 定义角色层级：SUPERMANAGE > MANAGE > EDITOR > USER
    - _需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
  
  - [x] 5.8 编写角色权限属性测试
    - **属性 8: 角色权限层级**
    - **验证需求：4.2, 4.3, 4.4, 4.5**

- [x] 6. 检查点 - 确保认证和授权测试通过
  - 确保所有测试通过，如有问题请询问用户

- [ ] 7. 查询构建器
  - [x] 7.1 实现通用查询构建器
    - 创建 src/utils/queryBuilder.ts
    - 实现 buildQuery() 处理 QueryParams
    - 支持过滤、排序、分页、搜索、比较运算符
    - 自动应用 site_id 过滤
    - 自动应用 status != StatusEnum.DELETE 过滤（软删除）
    - _需求：12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 1.1_
  
  - [x] 7.2 编写查询过滤属性测试
    - **属性 15: 查询过滤精确性**
    - **验证需求：12.1**
  
  - [x] 7.3 编写排序顺序属性测试
    - **属性 16: 排序顺序正确性**
    - **验证需求：12.2**
  
  - [x] 7.4 编写搜索结果属性测试
    - **属性 17: 搜索结果相关性**
    - **验证需求：12.4**
  
  - [x] 7.5 编写比较运算符属性测试
    - **属性 18: 比较运算符正确性**
    - **验证需求：12.5**
  
  - [x] 7.6 实现分页工具
    - 创建 src/utils/pagination.ts
    - 实现 paginate() 计算偏移量和总页数
    - 返回 PaginatedResult 格式
    - _需求：12.7, 13.4_
  
  - [x] 7.7 编写分页一致性属性测试
    - **属性 10: 分页一致性**
    - **验证需求：12.7, 13.4**

- [ ] 8. 缓存管理器
  - [x] 8.1 实现缓存管理器
    - 创建 src/services/cacheManager.ts
    - 实现 get()、set()、delete()、deleteByPrefix()
    - 实现 generateKey() 生成缓存键
    - 使用 KV 绑定
    - _需求：15.1, 15.2, 15.4_
  
  - [x] 8.2 编写缓存失效属性测试
    - **属性 14: 缓存失效一致性**
    - **验证需求：15.3**

- [ ] 9. 审计日志服务
  - [x] 9.1 实现审计日志服务
    - 创建 src/services/auditLogService.ts
    - 实现 log() 创建审计日志条目
    - 实现 query() 查询日志（支持过滤）
    - 记录 userId、action、resourceType、resourceId、siteId、timestamp
    - _需求：8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 9.2 编写审计日志不可变性属性测试
    - **属性 9: 审计日志不可变性**
    - **验证需求：8.6**
  
  - [x] 9.3 实现审计日志中间件
    - 创建 src/middleware/audit.ts
    - 拦截所有状态变更操作（CREATE、UPDATE、DELETE）
    - 自动记录审计日志
    - _需求：8.4_

- [ ] 10. 用户服务和端点
  - [x] 10.1 实现用户服务
    - 创建 src/services/userService.ts
    - 实现 create() - 自动哈希密码
    - 实现 update() - 更新时哈希新密码
    - 实现 delete() - 软删除
    - 实现 login() - 验证密码并生成 JWT
    - 实现 validateUsername() 和 validateEmail()
    - 确保响应中永不返回 passwordHash
    - _需求：5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 10.4, 10.5_
  
  - [x] 10.2 编写用户名唯一性属性测试
    - **属性 11: 用户名唯一性**
    - **验证需求：5.6**
  
  - [x] 10.3 编写邮箱唯一性属性测试
    - **属性 12: 邮箱唯一性**
    - **验证需求：5.7**
  
  - [x] 10.4 编写密码哈希不可逆性属性测试
    - **属性 4: 密码哈希不可逆性**
    - **验证需求：10.4**
  
  - [x] 10.5 实现用户路由
    - 创建 src/routes/users.ts
    - POST /api/v1/users - 创建用户
    - PUT /api/v1/users/:id - 更新用户
    - DELETE /api/v1/users/:id - 删除用户
    - GET /api/v1/users - 查询用户
    - POST /api/v1/auth/login - 用户登录
    - 应用认证和授权中间件
    - _需求：5.1, 5.2, 5.3, 5.4, 5.5, 9.1_
  
  - [x] 10.6 编写用户端点单元测试
    - 测试创建、更新、删除、查询、登录
    - 测试权限控制
    - 测试验证错误

- [x] 10.7 EVM 钱包登录功能
  - [x] 10.7.1 实现 EVM 签名验证工具
    - 创建 src/utils/evmSignature.ts
    - 实现 verifySignature() - 验证签名并恢复地址
    - 实现 generateLoginMessage() - 生成登录 nonce 消息
    - 实现 validateEvmAddress() - 验证 EVM 地址格式
    - 使用 EIP-191 标准格式化消息
    - _需求：21.2, 21.3, 21.7, 21.9, 21.10_
  
  - [x] 10.7.2 更新用户服务支持 EVM 登录
    - 在 src/services/userService.ts 中添加 loginWithWallet() 方法
    - 添加 findByEvmAddress() 方法
    - 添加 validateEvmAddress() 方法
    - 更新 create() 和 update() 方法支持 evm_address 字段
    - 确保 EVM 地址唯一性验证
    - _需求：5.8, 5.9, 21.4, 21.5, 21.6, 21.8_
  
  - [x] 10.7.3 添加 EVM 钱包登录路由
    - 在 src/routes/users.ts 中添加新端点
    - GET /api/v1/auth/wallet/nonce - 获取登录 nonce
    - POST /api/v1/auth/wallet/login - 钱包签名登录
    - 验证签名并返回 JWT 令牌
    - _需求：21.1, 21.2, 21.3, 21.4, 21.5_

- [x] 11. 检查点 - 确保用户模块测试通过
  - 确保所有测试通过，如有问题请询问用户

- [ ] 12. 频道服务和端点
  - [x] 12.1 实现频道服务
    - 创建 src/services/channelService.ts
    - 实现 create() - 验证父频道存在
    - 实现 update()
    - 实现 delete() - 软删除
    - 实现 getTree() - 构建层级树结构，使用缓存
    - 实现 validateParent() - 验证父频道
    - _需求：3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [~] 12.2 编写频道层级完整性属性测试
    - **属性 6: 频道层级完整性**
    - **验证需求：3.2**
  
  - [x] 12.3 实现频道路由
    - 创建 src/routes/channels.ts
    - POST /api/v1/channels - 创建频道
    - PUT /api/v1/channels/:id - 更新频道
    - DELETE /api/v1/channels/:id - 删除频道
    - GET /api/v1/channels/tree - 获取频道树
    - 应用认证和授权中间件
    - _需求：3.1, 3.2, 3.3, 3.4_
  
  - [~] 12.4 编写频道端点单元测试
    - 测试创建、更新、删除、获取树
    - 测试父频道验证
    - 测试缓存行为

- [ ] 13. 字典服务和端点
  - [x] 13.1 实现字典服务
    - 创建 src/services/dictionaryService.ts
    - 实现 create()
    - 实现 update()
    - 实现 delete() - 软删除
    - 实现 queryByType() - 按类型过滤
    - _需求：6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 13.2 实现字典路由
    - 创建 src/routes/dictionaries.ts
    - POST /api/v1/dictionaries - 创建字典条目
    - PUT /api/v1/dictionaries/:id - 更新字典条目
    - DELETE /api/v1/dictionaries/:id - 删除字典条目
    - GET /api/v1/dictionaries - 查询字典条目（支持类型过滤）
    - 应用认证和授权中间件
    - _需求：6.1, 6.2, 6.3, 6.4_
  
  - [~] 13.3 编写字典端点单元测试
    - 测试创建、更新、删除、查询
    - 测试类型过滤
    - 测试友情链接 URL 存储

- [ ] 14. 推广服务和端点
  - [x] 14.1 实现推广服务
    - 创建 src/services/promoService.ts
    - 实现 create()
    - 实现 update()
    - 实现 delete() - 软删除
    - 实现 getActive() - 查询当前时间范围内的推广，使用缓存
    - 实现 toggleStatus() - 切换推广状态
    - _需求：7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [~] 14.2 编写活动推广时间范围属性测试
    - **属性 13: 活动推广时间范围**
    - **验证需求：7.2**
  
  - [x] 14.3 实现推广路由
    - 创建 src/routes/promos.ts
    - POST /api/v1/promos - 创建推广
    - PUT /api/v1/promos/:id - 更新推广
    - DELETE /api/v1/promos/:id - 删除推广
    - GET /api/v1/promos/active - 获取活动推广
    - PUT /api/v1/promos/:id/toggle - 切换推广状态
    - 应用认证和授权中间件
    - _需求：7.1, 7.2, 7.3, 7.4, 7.6_
  
  - [~] 14.4 编写推广端点单元测试
    - 测试创建、更新、删除、获取活动推广
    - 测试时间范围过滤
    - 测试缓存行为
    - 测试状态切换

- [ ] 15. 文章服务和端点
  - [x] 15.1 实现文章服务
    - 创建 src/services/articleService.ts
    - 实现 create() - 验证频道存在
    - 实现 update()
    - 实现 delete() - 软删除
    - 实现 query() - 支持完整查询规范
    - 实现 getById()
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [~] 15.2 编写文章频道引用完整性属性测试
    - **属性 7: 文章频道引用完整性**
    - **验证需求：2.7**
  
  - [x] 15.3 实现文章路由
    - 创建 src/routes/articles.ts
    - POST /api/v1/articles - 创建文章
    - PUT /api/v1/articles/:id - 更新文章
    - DELETE /api/v1/articles/:id - 删除文章
    - GET /api/v1/articles - 查询文章
    - GET /api/v1/articles/:id - 获取单个文章
    - 应用认证和授权中间件
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [~] 15.4 编写文章端点单元测试
    - 测试创建、更新、删除、查询、获取
    - 测试频道验证
    - 测试内容格式支持

- [ ] 16. 图片上传服务和端点
  - [x] 16.1 实现图片上传服务
    - 创建 src/services/imageUploadService.ts
    - 实现 upload() - 上传到 R2
    - 实现 generateFilename() - 使用 SHA256 hash 生成唯一文件名，实现自动去重
    - 实现 validateImageType() - 验证 MIME 类型
    - 使用文件内容的 SHA256 hash 作为文件名，避免同一张图片重复占用存储空间
    - 上传前检查文件是否已存在，如已存在则直接返回 URL
    - _需求：11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [~] 16.2 编写图片文件名唯一性属性测试
    - **属性 20: 图片文件名唯一性**
    - **验证需求：11.2**
  
  - [x] 16.3 实现图片上传路由
    - 创建 src/routes/images.ts
    - POST /api/v1/images/upload - 上传图片
    - 处理 multipart/form-data
    - 返回公共 URL
    - 应用认证中间件
    - _需求：11.1, 11.3, 11.5_
  
  - [~] 16.4 编写图片上传单元测试
    - 测试成功上传
    - 测试文件类型验证
    - 测试错误处理

- [~] 17. 检查点 - 确保所有服务模块测试通过
  - 确保所有测试通过，如有问题请询问用户

- [ ] 18. 请求验证
  - [~] 18.1 实现验证工具
    - 创建 src/utils/validation.ts
    - 实现字段验证函数：required、type、length、email、format
    - 实现 validate() 收集所有验证错误
    - 实现输入清理防止注入攻击
    - _需求：19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  
  - [~] 18.2 为每个端点添加验证
    - 在所有路由中应用验证
    - 验证请求体和查询参数
    - 返回详细的验证错误
    - _需求：19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [~] 18.3 编写验证错误完整性属性测试
    - **属性 23: 验证错误完整性**
    - **验证需求：19.5**

- [ ] 19. 全局属性测试
  - [~] 19.1 编写站点隔离不变性属性测试
    - **属性 1: 站点隔离不变性**
    - **验证需求：1.1, 1.2, 1.4**
  
  - [~] 19.2 编写软删除过滤属性测试
    - **属性 2: 软删除过滤**
    - **验证需求：2.5, 3.4, 5.5, 6.4, 7.3, 16.3**
  
  - [~] 19.3 编写时间戳单调性属性测试
    - **属性 3: 时间戳单调性**
    - **验证需求：20.1, 20.2**
  
  - [~] 19.4 编写响应格式一致性属性测试
    - **属性 21: 响应格式一致性**
    - **验证需求：13.1, 13.2**
  
  - [~] 19.5 编写 HTTP 状态码匹配属性测试
    - **属性 22: HTTP 状态码匹配**
    - **验证需求：13.5**
  
  - [~] 19.6 编写时间戳 UTC 一致性属性测试
    - **属性 24: 时间戳 UTC 一致性**
    - **验证需求：20.3, 20.4**
  
  - [~] 19.7 编写软删除时间戳设置属性测试
    - **属性 25: 软删除时间戳设置**
    - **验证需求：20.5**

- [x] 20. 主应用和路由集成
  - [x] 20.1 创建主应用入口
    - 创建 src/index.ts
    - 初始化 Hono 应用
    - 注册全局中间件：错误处理、认证、站点隔离、审计日志
    - 注册所有路由：sites、users、channels、dicts、promos、articles、images
    - 配置 CORS
    - _需求：17.1_
  
  - [x] 20.2 实现健康检查端点
    - GET /health - 返回服务状态
    - 检查 D1、R2、KV 连接
    - _需求：监控_
  
  - [x] 20.3 实现 API 版本端点
    - GET /api/v1 - 返回 API 版本信息
    - _需求：17.1_

- [ ] 21. 集成测试
  - [~] 21.1 编写端到端集成测试
    - 测试完整的用户流程：注册、登录、创建内容
    - 测试多站点隔离
    - 测试权限控制
    - 测试审计日志记录
  
  - [~] 21.2 编写并发测试
    - 测试并发创建和更新
    - 测试缓存一致性
    - 测试数据库事务

- [ ] 22. 部署配置
  - [~] 22.1 配置生产环境
    - 更新 wrangler.toml 添加生产环境配置
    - 配置环境变量：JWT_SECRET、JWT_EXPIRATION
    - 配置 D1、R2、KV 绑定
    - _需求：部署_
  
  - [~] 22.2 创建数据库迁移脚本
    - 创建迁移应用脚本
    - 文档化迁移流程
    - _需求：数据库管理_
  
  - [~] 22.3 配置监控和日志
    - 配置 Cloudflare Analytics
    - 配置错误告警
    - 文档化日志查询方法
    - _需求：监控_

- [ ] 23. 文档
  - [~] 23.1 创建 API 文档
    - 文档化所有端点
    - 包含请求/响应示例
    - 文档化错误代码
    - _需求：开发者体验_
  
  - [~] 23.2 创建部署指南
    - 文档化部署步骤
    - 文档化环境配置
    - 文档化数据库迁移
    - _需求：运维_
  
  - [~] 23.3 创建开发指南
    - 文档化本地开发设置
    - 文档化测试运行
    - 文档化代码结构
    - _需求：开发者体验_

- [~] 24. 最终检查点 - 确保所有测试通过
  - 运行所有单元测试
  - 运行所有属性测试
  - 运行所有集成测试
  - 验证代码覆盖率 >80%
  - 确保所有测试通过，如有问题请询问用户

## 注意事项

- 标记为 `*` 的任务是可选的，可以跳过以加快 MVP 开发
- 每个任务都引用特定需求以实现可追溯性
- 检查点确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证特定示例和边缘情况
- 使用 fast-check 库进行属性测试，每个测试最少 100 次迭代
- 使用 Vitest 作为测试框架
