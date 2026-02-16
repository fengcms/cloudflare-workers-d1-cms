# 需求文档

## 简介

Cloudflare CMS API 是一个基于 Cloudflare Workers 构建的多站点文章管理系统后端 API。系统提供完整的内容管理能力，包括文章、频道、用户、字典、推广和审计日志。每个站点的数据完全隔离，系统通过 JWT 认证实施基于角色的访问控制。

## 术语表

- **系统（System）**: Cloudflare CMS API
- **站点（Site）**: 多站点系统中的逻辑租户，通过 site_id 标识
- **文章（Article）**: 包含富文本或 Markdown 正文的内容项
- **频道（Channel）**: 用于组织文章的层级分类
- **用户（User）**: 具有特定角色的认证账户
- **字典（Dictionary）**: 元数据条目集合（作者、来源、标签、友情链接）
- **推广（Promo）**: 基于时间的推广内容项（使用 promo 命名以避免广告屏蔽插件拦截）
- **审计日志（Audit_Log）**: 用于合规和调试的系统操作记录
- **JWT令牌（JWT_Token）**: 用于认证的 JSON Web Token
- **EVM地址（EVM_Address）**: 以太坊虚拟机兼容的钱包地址（如 Ethereum、Polygon 等）
- **钱包签名（Wallet_Signature）**: 使用私钥对消息进行的加密签名，用于验证钱包所有权
- **R2**: Cloudflare 的对象存储服务
- **D1**: Cloudflare 的 SQLite 兼容数据库
- **KV**: Cloudflare 的键值存储服务

## 需求

### 需求 1: 多站点隔离

**用户故事：** 作为平台管理员，我希望站点之间的数据完全隔离，以便每个租户的数据保持私密和安全。

#### 验收标准

1. WHEN 执行任何数据查询时，THE 系统 SHALL 根据 Site-Id 请求头中的 site_id 过滤结果
2. WHEN 用户创建任何资源时，THE 系统 SHALL 将其与 Site-Id 请求头中的 site_id 关联
3. WHEN Site-Id 请求头缺失时，THE 系统 SHALL 拒绝请求并返回认证错误
4. WHEN 用户尝试访问不同站点的资源时，THE 系统 SHALL 返回空结果集
5. THE 系统 SHALL 在数据库查询层面对所有表强制执行 site_id 过滤

### 需求 2: 文章管理

**用户故事：** 作为内容编辑，我希望创建和管理包含丰富内容的文章，以便向我的站点发布内容。

#### 验收标准

1. WHEN 用户创建文章时，THE 系统 SHALL 存储标题、内容、频道ID、作者、来源、标签和元数据
2. WHEN 文章被创建时，THE 系统 SHALL 将 status 设置为 StatusEnum.PENDING 并记录 created_at 时间戳
3. WHEN 用户更新文章时，THE 系统 SHALL 修改指定字段并更新 update_at 时间戳
4. WHEN 用户删除文章时，THE 系统 SHALL 将 status 设置为 StatusEnum.DELETE 而不删除记录
5. WHEN 查询文章时，THE 系统 SHALL 排除 status 为 StatusEnum.DELETE 的记录
6. THE 系统 SHALL 支持富文本和 Markdown 两种内容格式
7. WHEN 文章发布时，THE 系统 SHALL 验证关联的频道在相同 site_id 下存在

### 需求 3: 层级频道系统

**用户故事：** 作为内容管理员，我希望将文章组织到层级频道中，以便内容得到适当分类。

#### 验收标准

1. WHEN 用户创建频道时，THE 系统 SHALL 存储名称、父级ID、排序顺序和站点ID
2. WHEN 提供 parent_id 时，THE 系统 SHALL 验证父频道在相同 site_id 下存在
3. WHEN 查询频道时，THE 系统 SHALL 支持检索完整的层级树
4. WHEN 频道被删除时，THE 系统 SHALL 将 status 设置为 StatusEnum.DELETE 而不删除记录
5. THE 系统 SHALL 允许频道具有无限嵌套深度
6. WHEN 排序频道时，THE 系统 SHALL 按 sort_order 字段升序排列

### 需求 4: 基于角色的访问控制

**用户故事：** 作为系统管理员，我希望通过角色控制用户权限，以便用户只能执行授权的操作。

#### 验收标准

1. THE 系统 SHALL 支持四种角色：SUPERMANAGE、MANAGE、EDITOR 和 USER
2. WHEN 具有 SUPERMANAGE 角色的用户执行任何操作时，THE 系统 SHALL 允许该操作
3. WHEN 具有 MANAGE 角色的用户尝试站点级操作时，THE 系统 SHALL 允许该操作
4. WHEN 具有 EDITOR 角色的用户尝试内容操作时，THE 系统 SHALL 允许该操作
5. WHEN 具有 USER 角色的用户尝试管理操作时，THE 系统 SHALL 拒绝该请求
6. WHEN 验证 JWT 令牌时，THE 系统 SHALL 提取用户角色并强制执行权限
7. THE 系统 SHALL 在执行任何状态变更操作之前验证角色权限

### 需求 5: 用户管理

**用户故事：** 作为站点管理员，我希望管理用户账户，以便控制谁可以访问系统。

#### 验收标准

1. WHEN 创建用户时，THE 系统 SHALL 使用安全算法对密码进行哈希处理
2. WHEN 创建用户时，THE 系统 SHALL 存储用户名、邮箱、角色、站点ID和哈希密码
3. WHEN 用户更新其个人资料时，THE 系统 SHALL 允许修改用户名、邮箱、密码和 EVM 钱包地址
4. WHEN 密码被更新时，THE 系统 SHALL 在存储前对新密码进行哈希处理
5. WHEN 用户被删除时，THE 系统 SHALL 将 status 设置为 StatusEnum.DELETE 而不删除记录
6. THE 系统 SHALL 在每个 site_id 内强制执行用户名唯一性
7. THE 系统 SHALL 在每个 site_id 内强制执行邮箱唯一性
8. WHEN 用户配置 EVM 钱包地址时，THE 系统 SHALL 存储该地址并允许用户使用钱包签名登录
9. THE 系统 SHALL 在每个 site_id 内强制执行 EVM 地址唯一性（如果已配置）

### 需求 6: 字典系统

**用户故事：** 作为内容编辑，我希望管理可重用的元数据（如作者和标签），以便保持内容归属的一致性。

#### 验收标准

1. THE 系统 SHALL 支持四种字典类型：author（作者）、source（来源）、tag（标签）和 friend_link（友情链接）
2. WHEN 创建字典条目时，THE 系统 SHALL 存储类型、名称、值和站点ID
3. WHEN 查询字典条目时，THE 系统 SHALL 按类型和站点ID过滤
4. WHEN 字典条目被删除时，THE 系统 SHALL 将 status 设置为 StatusEnum.DELETE 而不删除记录
5. THE 系统 SHALL 允许多个字典条目具有相同名称但不同类型
6. WHEN 创建 friend_link 字典条目时，THE 系统 SHALL 将 URL 存储在 value 字段中

### 需求 7: 推广管理

**用户故事：** 作为营销经理，我希望安排基于时间的推广内容展示，以便促销活动在正确的时间出现。

#### 验收标准

1. WHEN 创建推广时，THE 系统 SHALL 存储标题、内容、图片URL、链接URL、开始时间、结束时间和站点ID
2. WHEN 查询活动推广时，THE 系统 SHALL 仅返回当前时间在 start_time 和 end_time 之间的推广
3. WHEN 查询推广时，THE 系统 SHALL 排除 status 为 StatusEnum.DELETE 的记录
4. WHEN 推广被删除时，THE 系统 SHALL 将 status 设置为 StatusEnum.DELETE 而不删除记录
5. THE 系统 SHALL 支持按 sort 字段排序推广
6. THE 系统 SHALL 使用 promo 作为表名和接口路径以避免广告屏蔽插件拦截

### 需求 8: 审计日志

**用户故事：** 作为合规官，我希望记录所有操作的完整审计日志，以便跟踪系统使用情况并调查问题。

#### 验收标准

1. WHEN 发生任何状态变更操作时，THE 系统 SHALL 创建审计日志条目
2. WHEN 创建审计日志时，THE 系统 SHALL 记录用户ID、操作、资源类型、资源ID、站点ID和时间戳
3. WHEN 创建审计日志时，THE 系统 SHALL 存储请求详情和响应状态
4. THE 系统 SHALL 记录所有 CREATE、UPDATE 和 DELETE 操作
5. WHEN 查询审计日志时，THE 系统 SHALL 支持按用户ID、操作、资源类型和日期范围过滤
6. THE 系统 SHALL 永不删除审计日志条目

### 需求 9: JWT 认证

**用户故事：** 作为开发者，我希望使用安全的基于令牌的认证，以便保护 API 访问。

#### 验收标准

1. WHEN 用户使用有效凭据登录时，THE 系统 SHALL 生成 JWT 令牌
2. WHEN 生成 JWT 令牌时，THE 系统 SHALL 在载荷中包含用户ID、用户名、角色和站点ID
3. WHEN 请求包含 Authorization 请求头时，THE 系统 SHALL 验证 JWT 令牌
4. WHEN JWT 令牌无效或过期时，THE 系统 SHALL 拒绝请求并返回认证错误
5. THE 系统 SHALL 使用安全密钥对 JWT 令牌进行签名
6. WHEN 验证 JWT 令牌时，THE 系统 SHALL 验证签名和过期时间

### 需求 10: 密码安全

**用户故事：** 作为安全官，我希望密码被安全存储，以便保护用户凭据。

#### 验收标准

1. WHEN 存储密码时，THE 系统 SHALL 使用 bcrypt 或等效算法对其进行哈希处理
2. WHEN 用户登录时，THE 系统 SHALL 将提供的密码与存储的哈希值进行比较
3. THE 系统 SHALL 永不以明文形式存储密码
4. THE 系统 SHALL 永不在 API 响应中返回密码哈希值
5. WHEN 密码哈希比较失败时，THE 系统 SHALL 拒绝登录尝试

### 需求 11: 图片上传到 R2

**用户故事：** 作为内容编辑，我希望为文章上传图片，以便包含视觉内容。同时，我希望系统能够自动去重，避免同一张图片重复占用存储空间。

#### 验收标准

1. WHEN 用户上传图片时，THE 系统 SHALL 将其存储在 Cloudflare R2 中
2. WHEN 存储图片时，THE 系统 SHALL 使用文件内容的 SHA256 hash 生成唯一文件名以防止冲突和实现自动去重
3. WHEN 图片上传成功时，THE 系统 SHALL 返回公共 URL
4. THE 系统 SHALL 验证上传的文件是图片类型
5. WHEN 图片上传失败时，THE 系统 SHALL 返回描述性错误消息
6. THE 系统 SHALL 将上传的图片与站点ID关联
7. WHEN 上传的图片内容与已存在的图片相同时，THE 系统 SHALL 直接返回已存在图片的 URL，不重复上传
8. THE 系统 SHALL 忽略 SHA256 hash 碰撞的可能性（碰撞几率极低，在小型系统中可以忽略）

### 需求 12: 通用查询规范

**用户故事：** 作为 API 使用者，我希望具有灵活的查询能力，以便检索我需要的确切数据。

#### 验收标准

1. WHEN 查询包含过滤参数时，THE 系统 SHALL 应用精确匹配过滤
2. WHEN 查询包含排序参数时，THE 系统 SHALL 按指定字段对结果排序
3. WHEN 查询包含 page 和 page_size 参数时，THE 系统 SHALL 返回分页结果
4. WHEN 查询包含搜索参数时，THE 系统 SHALL 对文本字段执行模糊匹配
5. WHEN 查询包含比较运算符（gt、lt、gte、lte）时，THE 系统 SHALL 应用相应的比较
6. THE 系统 SHALL 支持在单个请求中组合多个查询参数
7. WHEN 应用分页时，THE 系统 SHALL 返回总数元数据

### 需求 13: 统一响应格式

**用户故事：** 作为 API 使用者，我希望响应格式一致，以便可靠地解析响应。

#### 验收标准

1. WHEN 操作成功时，THE 系统 SHALL 返回包含成功状态和数据的 JSON 响应
2. WHEN 操作失败时，THE 系统 SHALL 返回包含错误状态和消息的 JSON 响应
3. THE 系统 SHALL 在所有端点使用一致的字段名称
4. WHEN 返回列表时，THE 系统 SHALL 包含分页元数据（总数、页码、页大小）
5. THE 系统 SHALL 使用与响应状态匹配的 HTTP 状态码（成功为 200，错误为 400/401/403/500）

### 需求 14: 数据库索引

**用户故事：** 作为系统管理员，我希望优化数据库查询，以便 API 在负载下表现良好。

#### 验收标准

1. THE 系统 SHALL 在所有多租户表的 site_id 上创建索引
2. THE 系统 SHALL 在所有软删除表的 status 上创建索引
3. THE 系统 SHALL 在外键列（channel_id、user_id、parent_id）上创建索引
4. THE 系统 SHALL 在用于过滤的时间戳列（created_at、start_time、end_time）上创建索引
5. THE 系统 SHALL 为常见查询模式创建复合索引（site_id + status）

### 需求 15: 缓存策略

**用户故事：** 作为系统管理员，我希望频繁访问的数据被缓存，以便最小化响应时间。

#### 验收标准

1. WHEN 查询频道层级时，THE 系统 SHALL 在 Cloudflare KV 中缓存结果
2. WHEN 查询活动广告时，THE 系统 SHALL 在 Cloudflare KV 中缓存结果
3. WHEN 缓存数据被修改时，THE 系统 SHALL 使相关缓存条目失效
4. THE 系统 SHALL 为缓存数据设置适当的 TTL 值
5. WHEN 发生缓存未命中时，THE 系统 SHALL 从 D1 获取数据并填充缓存

### 需求 16: 软删除实现

**用户故事：** 作为合规官，我希望保留已删除的记录，以便在需要时可以恢复数据。

#### 验收标准

1. THE 系统 SHALL 在所有主表中使用 status 字段（StatusEnum）实现软删除
2. WHEN 请求删除操作时，THE 系统 SHALL 将 status 设置为 StatusEnum.DELETE
3. WHEN 查询记录时，THE 系统 SHALL 默认排除 status 为 StatusEnum.DELETE 的记录
4. THE 系统 SHALL 提供管理端点来查询已删除的记录
5. THE 系统 SHALL 永不从主表中物理删除记录

### 需求 17: API 版本控制

**用户故事：** 作为 API 使用者，我希望 API 版本稳定，以便我的集成不会意外中断。

#### 验收标准

1. THE 系统 SHALL 为所有 API 端点添加 /api/v1/ 前缀
2. WHEN 引入破坏性更改时，THE 系统 SHALL 创建新的版本前缀
3. THE 系统 SHALL 在主版本内保持向后兼容性
4. WHEN 调用已弃用的端点时，THE 系统 SHALL 在响应头中包含弃用警告

### 需求 18: 错误处理

**用户故事：** 作为开发者，我希望获得描述性的错误消息，以便快速诊断问题。

#### 验收标准

1. WHEN 发生验证错误时，THE 系统 SHALL 返回 400 状态码和字段特定的错误消息
2. WHEN 发生认证错误时，THE 系统 SHALL 返回 401 状态码和清晰的消息
3. WHEN 发生授权错误时，THE 系统 SHALL 返回 403 状态码和清晰的消息
4. WHEN 资源未找到时，THE 系统 SHALL 返回 404 状态码和清晰的消息
5. WHEN 发生内部错误时，THE 系统 SHALL 返回 500 状态码并记录错误详情
6. THE 系统 SHALL 永不在错误消息中暴露敏感信息

### 需求 19: 请求验证

**用户故事：** 作为系统管理员，我希望所有输入都经过验证，以便无效数据不会进入系统。

#### 验收标准

1. WHEN 收到请求时，THE 系统 SHALL 验证必填字段是否存在
2. WHEN 收到请求时，THE 系统 SHALL 验证字段类型是否与模式匹配
3. WHEN 收到请求时，THE 系统 SHALL 验证字段长度是否在限制内
4. WHEN 收到请求时，THE 系统 SHALL 验证邮箱地址是否符合有效格式
5. WHEN 验证失败时，THE 系统 SHALL 在单个响应中返回所有验证错误
6. THE 系统 SHALL 清理所有文本输入以防止注入攻击

### 需求 20: 时间戳管理

**用户故事：** 作为数据分析师，我希望所有记录都有准确的时间戳，以便跟踪数据生命周期。

#### 验收标准

1. WHEN 创建记录时，THE 系统 SHALL 将 created_at 设置为当前 UTC 时间戳
2. WHEN 更新记录时，THE 系统 SHALL 将 update_at 设置为当前 UTC 时间戳
3. THE 系统 SHALL 以 UTC 时区存储所有时间戳
4. THE 系统 SHALL 使用 ISO 8601 格式进行时间戳序列化
5. WHEN 记录被软删除时，THE 系统 SHALL 将 update_at 设置为当前 UTC 时间戳

### 需求 21: EVM 钱包登录

**用户故事：** 作为用户，我希望使用我的 EVM 钱包（如 MetaMask）登录系统，以便无需记住密码即可安全访问。

#### 验收标准

1. THE 系统 SHALL 支持两种登录方式：传统用户名+密码登录和 EVM 钱包签名登录
2. WHEN 用户请求钱包登录时，THE 系统 SHALL 生成一个随机 nonce（随机数）消息
3. WHEN 用户使用钱包对 nonce 进行签名时，THE 系统 SHALL 验证签名的有效性
4. WHEN 签名验证成功时，THE 系统 SHALL 通过签名恢复的地址查找对应的用户
5. WHEN 找到匹配的用户时，THE 系统 SHALL 生成 JWT 令牌并返回
6. WHEN EVM 地址未关联任何用户时，THE 系统 SHALL 返回认证错误
7. THE 系统 SHALL 使用 EIP-191 标准格式化签名消息
8. THE 系统 SHALL 验证恢复的地址与用户存储的 evm_address 匹配
9. WHEN 用户配置 EVM 地址时，THE 系统 SHALL 验证地址格式的有效性（0x 开头的 42 字符十六进制字符串）
10. THE 系统 SHALL 将 EVM 地址以小写形式存储以确保一致性
