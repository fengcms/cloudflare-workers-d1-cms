# 更新日志

## 2024-02-16 - API 路径重构

### 新增功能
- ✅ 添加用户注册接口 `POST /api/v1/register`
- ✅ 注册后自动登录，返回 JWT token

### API 路径变更

#### 认证相关
- ❌ ~~`POST /api/v1/auth/login`~~ → ✅ `POST /api/v1/login`
- ❌ ~~`GET /api/v1/auth/wallet/nonce`~~ → ✅ `GET /api/v1/login/nonce`
- ❌ ~~`POST /api/v1/auth/wallet/login`~~ → ✅ `POST /api/v1/login/evm`

#### 用户管理
- ❌ ~~`/api/v1/users`~~ → ✅ `/api/v1/user`
- ❌ ~~`/api/v1/users/:id`~~ → ✅ `/api/v1/user/:id`

#### 文章管理
- ❌ ~~`/api/v1/articles`~~ → ✅ `/api/v1/article`
- ❌ ~~`/api/v1/articles/:id`~~ → ✅ `/api/v1/article/:id`

#### 频道管理
- ❌ ~~`/api/v1/channels`~~ → ✅ `/api/v1/channel`
- ❌ ~~`/api/v1/channels/:id`~~ → ✅ `/api/v1/channel/:id`
- ❌ ~~`/api/v1/channels/tree`~~ → ✅ `/api/v1/channel/tree`

#### 字典管理
- ❌ ~~`/api/v1/dictionaries`~~ → ✅ `/api/v1/dict`
- ❌ ~~`/api/v1/dictionaries/:id`~~ → ✅ `/api/v1/dict/:id`

#### 推广管理
- ❌ ~~`/api/v1/promos`~~ → ✅ `/api/v1/promo`
- ❌ ~~`/api/v1/promos/:id`~~ → ✅ `/api/v1/promo/:id`
- ❌ ~~`/api/v1/promos/active`~~ → ✅ `/api/v1/promo/active`
- ❌ ~~`/api/v1/promos/:id/toggle`~~ → ✅ `/api/v1/promo/:id/toggle`

#### 图片上传
- ❌ ~~`POST /api/v1/images/upload`~~ → ✅ `POST /api/v1/upload`

### 文档组织
- ✅ 所有文档移动到 `/docs` 目录
- ✅ 创建新的 API 参考文档 `docs/API_REFERENCE.md`
- ✅ 创建更新日志 `docs/CHANGELOG.md`

### 迁移指南

如果你正在使用旧的 API 路径，请按照以下步骤迁移：

#### 1. 更新认证相关接口

**旧代码**:
```javascript
// 登录
await fetch('/api/v1/auth/login', { ... })

// EVM 钱包登录
await fetch('/api/v1/auth/wallet/nonce', { ... })
await fetch('/api/v1/auth/wallet/login', { ... })
```

**新代码**:
```javascript
// 注册
await fetch('/api/v1/register', { ... })

// 登录
await fetch('/api/v1/login', { ... })

// EVM 钱包登录
await fetch('/api/v1/login/nonce', { ... })
await fetch('/api/v1/login/evm', { ... })
```

#### 2. 更新资源路径（复数改为单数）

**旧代码**:
```javascript
// 用户
await fetch('/api/v1/users', { ... })
await fetch('/api/v1/users/123', { ... })

// 文章
await fetch('/api/v1/articles', { ... })
await fetch('/api/v1/articles/123', { ... })

// 频道
await fetch('/api/v1/channels', { ... })
await fetch('/api/v1/channels/tree', { ... })

// 字典
await fetch('/api/v1/dictionaries', { ... })

// 推广
await fetch('/api/v1/promos', { ... })
await fetch('/api/v1/promos/active', { ... })

// 图片上传
await fetch('/api/v1/images/upload', { ... })
```

**新代码**:
```javascript
// 用户
await fetch('/api/v1/user', { ... })
await fetch('/api/v1/user/123', { ... })

// 文章
await fetch('/api/v1/article', { ... })
await fetch('/api/v1/article/123', { ... })

// 频道
await fetch('/api/v1/channel', { ... })
await fetch('/api/v1/channel/tree', { ... })

// 字典
await fetch('/api/v1/dict', { ... })

// 推广
await fetch('/api/v1/promo', { ... })
await fetch('/api/v1/promo/active', { ... })

// 图片上传
await fetch('/api/v1/upload', { ... })
```

#### 3. 使用查找替换工具

你可以使用以下正则表达式批量替换：

```bash
# 认证相关
/api/v1/auth/login → /api/v1/login
/api/v1/auth/wallet/nonce → /api/v1/login/nonce
/api/v1/auth/wallet/login → /api/v1/login/evm

# 资源路径
/api/v1/users → /api/v1/user
/api/v1/articles → /api/v1/article
/api/v1/channels → /api/v1/channel
/api/v1/dictionaries → /api/v1/dict
/api/v1/promos → /api/v1/promo
/api/v1/images/upload → /api/v1/upload
```

### 破坏性变更

⚠️ **重要**: 这是一个破坏性变更，旧的 API 路径将不再工作。

如果你需要保持向后兼容，可以在代码中添加路由别名，但建议尽快迁移到新的 API 路径。

### 新功能说明

#### 用户注册接口

新增的注册接口 `/api/v1/register` 提供以下功能：

1. **自动创建用户**: 默认创建 `USER` 类型的用户
2. **自动登录**: 注册成功后自动返回 JWT token
3. **支持 EVM 地址**: 注册时可以绑定 EVM 钱包地址

**示例**:
```javascript
const response = await fetch('/api/v1/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Site-Id': '1'
  },
  body: JSON.stringify({
    username: 'newuser',
    password: 'password123',
    nickname: '新用户',
    email: 'user@example.com',
    evm_address: '0x1234...' // 可选
  })
})

const { data } = await response.json()
// data.token - JWT token
// data.user - 用户信息
```

### 文档更新

所有文档已更新并移动到 `/docs` 目录：

- `docs/API_REFERENCE.md` - 完整的 API 参考文档
- `docs/API_EXAMPLES.md` - API 使用示例
- `docs/DEPLOYMENT_CHECKLIST.md` - 部署检查清单
- `docs/PROJECT_COMPLETION_SUMMARY.md` - 项目完成总结
- `docs/TESTING_SUMMARY.md` - 测试总结
- `docs/CHANGELOG.md` - 更新日志（本文件）

### 下一步

1. 更新你的前端代码，使用新的 API 路径
2. 测试所有功能，确保正常工作
3. 更新 API 文档和示例代码
4. 通知团队成员关于 API 变更

### 支持

如果你在迁移过程中遇到问题，请查看：
- `docs/API_REFERENCE.md` - 完整的 API 文档
- `docs/API_EXAMPLES.md` - 使用示例
- 或者提交 Issue
