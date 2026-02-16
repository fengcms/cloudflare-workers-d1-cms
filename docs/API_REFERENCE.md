# API 参考文档

## 基础信息

- **基础 URL**: `https://your-domain.workers.dev/api/v1`
- **认证方式**: JWT Bearer Token
- **请求头**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {token}` (需要认证的接口)
  - `Site-Id: {siteId}` (必需，用于站点隔离)

## 响应格式

### 成功响应
```json
{
  "code": 200,
  "data": {
    // 响应数据
  }
}
```

### 错误响应
```json
{
  "code": 400,
  "msg": "错误信息"
}
```

### 分页响应
```json
{
  "code": 200,
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "data": [
      // 数据列表
    ]
  }
}
```

## 认证相关接口

### 用户注册
**POST** `/register`

注册新用户账号。

**请求体**:
```json
{
  "username": "string",      // 必需，用户名
  "password": "string",      // 必需，密码
  "nickname": "string",      // 必需，昵称
  "email": "string",         // 可选，邮箱
  "evm_address": "string"    // 可选，EVM 钱包地址
}
```

**响应**:
```json
{
  "code": 201,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "nickname": "测试用户",
      "type": "USER",
      "site_id": 1,
      // ... 其他用户信息（不含密码）
    }
  }
}
```

### 用户登录
**POST** `/login`

使用用户名和密码登录。

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      // ... 用户信息
    }
  }
}
```

### 获取 EVM 登录 Nonce
**GET** `/login/nonce`

获取用于 EVM 钱包签名的 nonce 消息。

**响应**:
```json
{
  "code": 200,
  "data": {
    "message": "Sign this message to login: nonce_abc123_timestamp_1234567890",
    "timestamp": 1234567890
  }
}
```

### EVM 钱包登录
**POST** `/login/evm`

使用 EVM 钱包签名登录。

**请求体**:
```json
{
  "signature": "0x...",      // 签名字符串
  "message": "Sign this message to login: nonce_abc123_timestamp_1234567890"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "evm_address": "0x1234...",
      // ... 用户信息
    }
  }
}
```

## 用户管理接口

### 创建用户
**POST** `/user`

创建新用户（需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "username": "string",
  "password": "string",
  "nickname": "string",
  "email": "string",
  "type": "USER|EDITOR|MANAGE|SUPERMANAGE"
}
```

### 查询用户列表
**GET** `/user`

查询用户列表（需要认证）。

**请求头**: `Authorization: Bearer {token}`

**查询参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 10）
- `username`: 用户名过滤（模糊匹配）
- `type`: 用户类型过滤
- `status`: 状态过滤

### 更新用户
**PUT** `/user/:id`

更新用户信息（需要 MANAGE 权限或用户本人）。

**请求头**: `Authorization: Bearer {token}`

### 删除用户
**DELETE** `/user/:id`

删除用户（软删除，需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

## 文章管理接口

### 创建文章
**POST** `/article`

创建新文章（需要 EDITOR 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "title": "string",
  "channel_id": 1,
  "content": "string",
  "markdown": "string",
  "tags": ["tag1", "tag2"],
  "description": "string",
  "img": "string",
  "type": "NORMAL|HOT|MEDIA"
}
```

### 查询文章列表
**GET** `/article`

查询文章列表（需要认证）。

**请求头**: `Authorization: Bearer {token}`

**查询参数**:
- `page`: 页码
- `pageSize`: 每页数量
- `title-like`: 标题模糊搜索
- `channel_id`: 频道ID过滤
- `tags-like`: 标签搜索
- `status`: 状态过滤
- `type`: 类型过滤
- `sort`: 排序（如 `-id` 表示ID降序）

### 获取单篇文章
**GET** `/article/:id`

获取文章详情（需要认证）。

**请求头**: `Authorization: Bearer {token}`

### 更新文章
**PUT** `/article/:id`

更新文章（需要 EDITOR 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

### 删除文章
**DELETE** `/article/:id`

删除文章（软删除，需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

## 频道管理接口

### 创建频道
**POST** `/channel`

创建新频道（需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "name": "string",
  "pid": 0,              // 父频道ID，0表示顶级频道
  "sort": 0,             // 排序
  "keywords": "string",
  "description": "string",
  "type": "ARTICLE"
}
```

### 获取频道树
**GET** `/channel/tree`

获取频道树形结构（需要认证）。

**请求头**: `Authorization: Bearer {token}`

**响应**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "新闻",
      "pid": 0,
      "children": [
        {
          "id": 2,
          "name": "国内新闻",
          "pid": 1,
          "children": []
        }
      ]
    }
  ]
}
```

### 更新频道
**PUT** `/channel/:id`

更新频道（需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

### 删除频道
**DELETE** `/channel/:id`

删除频道（软删除，需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

## 字典管理接口

### 创建字典项
**POST** `/dict`

创建字典项（需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "name": "string",
  "type": "AUTHOR|ORIGIN|TAG|FRIENDLINK",
  "link": "string"       // 友情链接URL（type为FRIENDLINK时使用）
}
```

### 查询字典列表
**GET** `/dict`

查询字典列表（需要认证）。

**请求头**: `Authorization: Bearer {token}`

**查询参数**:
- `type`: 字典类型（必需）
- `page`: 页码
- `pageSize`: 每页数量

### 更新字典项
**PUT** `/dict/:id`

更新字典项（需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

### 删除字典项
**DELETE** `/dict/:id`

删除字典项（软删除，需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

## 推广管理接口

### 创建推广
**POST** `/promo`

创建推广（需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "name": "string",
  "url": "string",
  "img": "string",
  "content": "string",
  "start_time": 1234567890,  // Unix时间戳（秒）
  "end_time": 1234567890
}
```

### 获取活动推广
**GET** `/promo/active`

获取当前时间范围内的活动推广（需要认证）。

**请求头**: `Authorization: Bearer {token}`

### 更新推广
**PUT** `/promo/:id`

更新推广（需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

### 删除推广
**DELETE** `/promo/:id`

删除推广（软删除，需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

### 切换推广状态
**PUT** `/promo/:id/toggle`

切换推广的启用/禁用状态（需要 MANAGE 或更高权限）。

**请求头**: `Authorization: Bearer {token}`

## 图片上传接口

### 上传图片
**POST** `/upload`

上传图片文件（需要认证）。

**请求头**: 
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**请求体**: 
- `file`: 图片文件

**响应**:
```json
{
  "code": 201,
  "data": {
    "url": "https://images.example.com/abc123.jpg",
    "filename": "abc123.jpg"
  }
}
```

**说明**:
- 支持的图片格式：JPEG, PNG, GIF, WebP, SVG, BMP
- 文件名使用 SHA256 hash，自动去重
- 最大文件大小：5MB（可配置）

## 查询参数说明

### 通用查询参数
- `page`: 页码（从 1 开始）
- `pageSize`: 每页数量（默认 20，最大 100）
- `sort`: 排序字段（如 `id` 升序，`-id` 降序，支持多字段 `-id,created_at`）

### 过滤运算符
- `field=value`: 精确匹配
- `field-like=value`: 模糊匹配
- `field-gt=value`: 大于
- `field-gte=value`: 大于等于
- `field-lt=value`: 小于
- `field-lte=value`: 小于等于
- `field-neq=value`: 不等于
- `field-in=1,2,3`: IN 查询
- `field-nin=1,2,3`: NOT IN 查询
- `field-nil`: 为空
- `field-nnil`: 不为空

### 示例
```
GET /api/v1/article?page=1&pageSize=20&title-like=技术&status=NORMAL&sort=-created_at
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或 token 无效） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如用户名已存在） |
| 500 | 服务器内部错误 |

## 权限说明

### 用户类型
- `SUPERMANAGE`: 超级管理员，拥有所有权限
- `MANAGE`: 管理员，拥有所属站点的所有权限
- `EDITOR`: 编辑，可以管理文章和字典
- `USER`: 普通用户，只能管理自己的文章

### 权限层级
SUPERMANAGE > MANAGE > EDITOR > USER

高级别权限自动包含低级别权限的所有操作。

## 站点隔离

所有请求都需要在请求头中包含 `Site-Id`，用于多站点数据隔离。

```
Site-Id: 1
```

不同站点的数据完全隔离，用户只能访问所属站点的数据。

## 软删除

删除操作为软删除，数据不会真正从数据库中删除，而是将 `status` 字段设置为 `DELETE`。

查询时默认排除已删除的数据，除非明确指定 `status=DELETE`。

## 审计日志

所有状态变更操作（CREATE、UPDATE、DELETE）都会自动记录审计日志，包括：
- 操作用户
- 操作类型
- 资源类型和ID
- 操作时间
- IP 地址

## 速率限制

建议在 Cloudflare Dashboard 中配置速率限制规则，防止滥用。

## 示例代码

查看 `docs/API_EXAMPLES.md` 获取详细的使用示例和集成代码。
