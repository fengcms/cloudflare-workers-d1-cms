# 部署检查清单

## 开发环境准备

- [x] 安装依赖：`npm install`
- [x] 配置环境变量：复制 `.dev.vars.example` 到 `.dev.vars` 并填写实际值
- [x] 生成数据库迁移：`npm run db:generate`
- [x] 应用数据库迁移：`npm run db:migrate`
- [x] 启动开发服务器：`npm run dev`

## 预发布环境部署

### 1. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库
wrangler d1 create cms_staging

# 创建 R2 存储桶
wrangler r2 bucket create cms-images-staging

# 创建 KV 命名空间
wrangler kv:namespace create CACHE --env staging
```

### 2. 更新 wrangler.toml

将创建的资源 ID 填入 `wrangler.toml` 的 `[env.staging]` 部分：
- `database_id`: D1 数据库 ID
- `id`: KV 命名空间 ID

### 3. 配置环境变量

在 Cloudflare Dashboard 中为 staging 环境配置以下环境变量：
- `JWT_SECRET`: JWT 密钥（生产环境使用强随机字符串）
- `JWT_EXPIRATION`: JWT 过期时间（如 "7d"）
- `MAX_UPLOAD_SIZE`: 最大上传文件大小（字节，可选）
- `CACHE_TTL`: 缓存过期时间（秒，可选）
- `PUBLIC_DOMAIN`: 公共域名（可选）

### 4. 应用数据库迁移

```bash
npm run db:migrate:staging
```

### 5. 部署应用

```bash
npm run deploy:staging
```

## 生产环境部署

### 1. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库
wrangler d1 create cms_production

# 创建 R2 存储桶
wrangler r2 bucket create cms-images-production

# 创建 KV 命名空间
wrangler kv:namespace create CACHE --env production
```

### 2. 更新 wrangler.toml

将创建的资源 ID 填入 `wrangler.toml` 的 `[env.production]` 部分。

### 3. 配置环境变量

在 Cloudflare Dashboard 中为 production 环境配置环境变量（同预发布环境）。

### 4. 应用数据库迁移

```bash
npm run db:migrate:production
```

### 5. 部署应用

```bash
npm run deploy:production
```

## 部署后验证

### 1. 健康检查

```bash
curl https://cms.bailashu.com/health
```

预期响应：
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. API 版本检查

```bash
curl https://cms.bailashu.com/api/v1
```

预期响应：
```json
{
  "version": "v1",
  "name": "Cloudflare CMS API",
  "description": "Multi-site content management system API"
}
```

### 3. 创建测试用户

```bash
curl -X POST https://your-worker-domain.workers.dev/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "name": "测试用户",
    "account": "testuser",
    "password": "test123456",
    "email": "test@example.com",
    "type": "USER"
  }'
```

### 4. 测试登录

```bash
curl -X POST https://cms.bailashu.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "account": "testuser",
    "password": "test123456"
  }'
```

### 5. 测试 EVM 钱包登录

```bash
# 获取 nonce
curl "https://cms.bailashu.com/api/v1/auth/wallet/nonce?address=0x1234...&siteId=1"

# 使用 MetaMask 签名后登录
curl -X POST https://cms.bailashu.com/api/v1/auth/wallet/login \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1234...",
    "signature": "0xabcd...",
    "message": "Sign this message to login: nonce_xxx_timestamp_xxx",
    "siteId": 1
  }'
```

## 监控和维护

### 日志查看

```bash
# 查看实时日志
wrangler tail

# 查看特定环境的日志
wrangler tail --env production
```

### 数据库管理

```bash
# 查看数据库列表
wrangler d1 list

# 执行 SQL 查询
wrangler d1 execute cms_production --command "SELECT * FROM users LIMIT 10"

# 导出数据库
wrangler d1 export cms_production --output backup.sql
```

### 性能监控

在 Cloudflare Dashboard 中查看：
- Workers Analytics：请求量、错误率、延迟
- D1 Analytics：查询性能、数据库大小
- R2 Analytics：存储使用量、带宽
- KV Analytics：读写操作、存储使用

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查 wrangler.toml 中的 database_id 是否正确
   - 确认数据库迁移已应用

2. **JWT 验证失败**
   - 检查 JWT_SECRET 环境变量是否配置
   - 确认 token 未过期

3. **图片上传失败**
   - 检查 R2 bucket 绑定是否正确
   - 确认文件大小未超过限制

4. **缓存问题**
   - 检查 KV 命名空间绑定是否正确
   - 可以手动清除缓存进行测试

## 安全建议

1. **JWT_SECRET**: 使用强随机字符串，至少 32 字符
2. **密码策略**: 建议前端实施密码强度验证
3. **速率限制**: 考虑添加 Cloudflare Rate Limiting 规则
4. **CORS 配置**: 根据实际需求配置允许的域名
5. **日志审计**: 定期检查审计日志，发现异常行为
6. **备份策略**: 定期备份 D1 数据库
7. **访问控制**: 限制 Cloudflare Dashboard 访问权限

## 回滚流程

如果部署出现问题，可以快速回滚：

```bash
# 查看部署历史
wrangler deployments list

# 回滚到上一个版本
wrangler rollback
```
