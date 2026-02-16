# 超级管理员账号已创建

## ✅ 账号信息

- **用户名**: `fungleo`
- **密码**: `pJjeEm38Fk`
- **类型**: `SUPERMANAGE`
- **状态**: `NORMAL`
- **站点ID**: `1`
- **用户ID**: `1`

## 📋 创建时间

2026-02-16

## ⚠️ 当前问题

登录接口返回 500 错误，可能的原因：

1. **JWT_SECRET 未配置或配置错误**
   - 需要在 Cloudflare Dashboard 中检查环境变量
   - Workers & Pages > cloudflare-cms-api > Settings > Variables
   - 确认 `JWT_SECRET` 已添加且类型为 Encrypted

2. **数据库连接问题**
   - 已确认数据库表存在
   - 已确认用户记录已插入

## 🔧 排查步骤

### 1. 检查 JWT_SECRET 配置

在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages
2. 选择 `cloudflare-cms-api`
3. 点击 Settings > Variables
4. 检查是否有 `JWT_SECRET` 变量
5. 如果没有，添加一个：
   ```bash
   # 生成一个安全的 secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # 在 Dashboard 中添加：
   # Name: JWT_SECRET
   # Value: (粘贴生成的字符串)
   # Type: Encrypted
   # Environment: Production
   ```

### 2. 重新部署

配置完 JWT_SECRET 后，重新部署：
```bash
npm run deploy:production
```

### 3. 测试登录

```bash
curl -X POST https://cms.bailashu.com/api/v1/login \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "username": "fungleo",
    "password": "pJjeEm38Fk"
  }'
```

成功的响应应该类似：
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "fungleo",
      "nickname": "超级管理员",
      "type": "SUPERMANAGE",
      ...
    }
  }
}
```

### 4. 查看日志

如果还有问题，查看实时日志：
```bash
wrangler tail --env production --format pretty
```

然后在另一个终端执行登录请求，查看详细错误信息。

## 📝 数据库验证

确认用户已创建：
```bash
wrangler d1 execute cms_production --env production \
  --command "SELECT id, username, nickname, type, status FROM users WHERE username = 'fungleo'"
```

## 🔐 安全提醒

1. 请妥善保管超级管理员密码
2. 建议使用密码管理器存储
3. 定期更换密码（建议每 3-6 个月）
4. 不要在公共场所或不安全的网络环境下登录
5. 启用双因素认证（如果系统支持）

## 📞 下一步

1. 确认 JWT_SECRET 已正确配置
2. 重新部署应用
3. 测试登录功能
4. 如果成功，开始使用系统

---

**状态**: 账号已创建，等待 JWT_SECRET 配置完成后测试登录
