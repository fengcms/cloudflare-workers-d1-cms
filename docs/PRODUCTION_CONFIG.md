# 生产环境配置

## 🚀 部署信息

- **生产域名**: https://cms.bailashu.com
- **API 基础路径**: https://cms.bailashu.com/api/v1
- **部署时间**: 2026-02-16
- **部署状态**: ✅ 已成功部署

## 📦 Cloudflare 资源配置

### D1 数据库
- **名称**: cms_production
- **Database ID**: `1fcc9f4c-1c2b-4f3d-9f99-3ef03a722b32`
- **绑定名称**: `DB`
- **迁移目录**: `drizzle/migrations`

### R2 存储桶
- **Bucket 名称**: `cms-images`
- **绑定名称**: `IMAGES`
- **用途**: 图片文件存储

### KV 命名空间
- **Namespace**: `cms-cache`
- **Namespace ID**: `75e3b34e431d4154b26fe728db111b36`
- **绑定名称**: `CACHE`
- **用途**: 缓存数据

## 🔧 环境变量

生产环境需要配置以下环境变量（通过 Cloudflare Dashboard 或 wrangler.toml）：

```toml
[env.production.vars]
ENVIRONMENT = "production"
JWT_SECRET = "your-jwt-secret-here"  # 需要配置
JWT_EXPIRATION = "7d"
PUBLIC_DOMAIN = "https://cms.bailashu.com"
MAX_UPLOAD_SIZE = 5242880  # 5MB
CACHE_TTL = 3600  # 1小时
```

⚠️ **重要**: `JWT_SECRET` 需要在 Cloudflare Dashboard 中配置为加密的环境变量。

## 📝 快速测试

### 1. 健康检查
```bash
curl https://cms.bailashu.com/health
```

预期响应：
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2026-02-16T..."
}
```

### 2. API 版本信息
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

### 3. 用户注册测试
```bash
curl -X POST https://cms.bailashu.com/api/v1/register \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "username": "testuser",
    "password": "Test123456!",
    "nickname": "测试用户",
    "email": "test@example.com"
  }'
```

### 4. 用户登录测试
```bash
curl -X POST https://cms.bailashu.com/api/v1/login \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "username": "testuser",
    "password": "Test123456!"
  }'
```

## 🔄 部署流程

### 更新代码并部署
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install

# 3. 运行测试
npm test

# 4. 部署到生产环境
npm run deploy:production
```

### 数据库迁移
```bash
# 应用新的数据库迁移
wrangler d1 migrations apply cms_production --env production

# 查看迁移历史
wrangler d1 migrations list cms_production --env production
```

### 查看日志
```bash
# 实时查看 Worker 日志
wrangler tail --env production

# 查看最近的日志
wrangler tail --env production --format pretty
```

## 📊 监控和维护

### 数据库操作
```bash
# 查看数据库信息
wrangler d1 info cms_production

# 执行 SQL 查询
wrangler d1 execute cms_production --env production \
  --command "SELECT COUNT(*) as user_count FROM users"

# 导出数据库备份
wrangler d1 export cms_production --output=backup-$(date +%Y%m%d).sql
```

### R2 存储管理
```bash
# 列出 bucket 中的文件
wrangler r2 object list cms-images

# 查看 bucket 信息
wrangler r2 bucket info cms-images
```

### KV 缓存管理
```bash
# 列出 KV 中的键
wrangler kv:key list --namespace-id=75e3b34e431d4154b26fe728db111b36

# 获取特定键的值
wrangler kv:key get "cache-key" --namespace-id=75e3b34e431d4154b26fe728db111b36

# 清空缓存（谨慎使用）
# 需要手动删除或通过 API 清理
```

## 🔐 安全配置

### 1. JWT Secret 配置
在 Cloudflare Dashboard 中配置：
1. 进入 Workers & Pages
2. 选择 `cloudflare-cms-api`
3. 进入 Settings > Variables
4. 添加环境变量：
   - Name: `JWT_SECRET`
   - Value: 生成一个强随机字符串
   - Type: Encrypted

### 2. CORS 配置
如果需要跨域访问，在代码中配置 CORS 中间件。

### 3. 速率限制
建议在 Cloudflare Dashboard 中配置 Rate Limiting 规则。

## 📈 性能优化

### 缓存策略
- 静态资源：使用 R2 + Cloudflare CDN
- API 响应：使用 KV 缓存热点数据
- 数据库查询：合理使用索引

### 监控指标
- 请求响应时间
- 错误率
- 数据库查询性能
- R2 存储使用量
- KV 读写次数

## 🆘 故障排查

### 常见问题

1. **502 Bad Gateway**
   - 检查 Worker 是否正常运行
   - 查看 wrangler tail 日志

2. **数据库连接失败**
   - 确认 database_id 配置正确
   - 检查迁移是否已应用

3. **图片上传失败**
   - 确认 R2 bucket 绑定正确
   - 检查文件大小限制

4. **认证失败**
   - 确认 JWT_SECRET 已配置
   - 检查 token 是否过期

## 📞 联系方式

如有问题，请查看：
- API 文档: `docs/API_REFERENCE.md`
- 示例代码: `docs/API_EXAMPLES.md`
- 更新日志: `docs/CHANGELOG.md`

---

**最后更新**: 2026-02-16
**维护者**: fungleo
