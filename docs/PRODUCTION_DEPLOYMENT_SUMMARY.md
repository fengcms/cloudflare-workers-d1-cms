# 生产环境部署总结

## 部署时间
2026-02-16

## 部署域名
https://cms.bailashu.com

## 已完成的配置

### 1. Cloudflare 资源配置
- **D1 Database**: `cms_production` (ID: `1fcc9f4c-1c2b-4f3d-9f99-3ef03a722b32`)
- **R2 Bucket**: `cms-images`
- **KV Namespace**: `cms-cache` (ID: `75e3b34e431d4154b26fe728db111b36`)

### 2. 数据库迁移
已成功运行所有数据库迁移：
- `0000_youthful_outlaw_kid.sql` ✅
- `0001_last_stellaris.sql` ✅

### 3. 站点配置
- **站点 ID**: 1
- **站点名称**: 百拉书
- **站点标题**: cms.bailashu.com
- **状态**: NORMAL

### 4. 环境变量配置
- **JWT_SECRET**: 已通过 wrangler secret 设置（64 字符十六进制字符串）
- **ENVIRONMENT**: production

### 5. 超级管理员账号
- **用户名**: fungleo
- **密码**: pJjeEm38Fk（前端需要先 SHA256 哈希后传输）
- **密码 SHA256**: `e414bddbb67b4d22e63e20bcfa2249f1978a55711fe5546e6eb73a9506dbcdc0`
- **用户类型**: SUPERMANAGE
- **用户 ID**: 3
- **站点 ID**: 1

## 密码安全机制

### 双重哈希流程
1. **前端**: 用户输入密码 → SHA256 哈希 → 通过 HTTPS 传输
2. **后端**: 接收 SHA256 哈希 → bcrypt 加密 → 存储到数据库

### 安全优势
- 密码明文永不在网络上传输
- 后端和数据库永远不知道原始密码
- 即使数据库泄露，攻击者也无法获取原始密码
- 即使 HTTPS 被破解，攻击者也只能获取 SHA256 哈希，无法获取原始密码

详细说明请参考：[docs/PASSWORD_SECURITY.md](./PASSWORD_SECURITY.md)

## API 测试结果

### 1. 注册接口测试 ✅
```bash
curl -X POST https://cms.bailashu.com/api/v1/register \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "username": "newuser",
    "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    "nickname": "新用户"
  }'
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 2,
      "username": "newuser",
      "nickname": "新用户",
      "type": "USER",
      "site_id": 1,
      "status": "NORMAL"
    }
  }
}
```

### 2. 登录接口测试 ✅
```bash
curl -X POST https://cms.bailashu.com/api/v1/login \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "username": "fungleo",
    "password": "e414bddbb67b4d22e63e20bcfa2249f1978a55711fe5546e6eb73a9506dbcdc0"
  }'
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 3,
      "username": "fungleo",
      "nickname": "超级管理员",
      "type": "SUPERMANAGE",
      "site_id": 1,
      "status": "NORMAL"
    }
  }
}
```

## 前端集成说明

### 密码处理示例（JavaScript）
```javascript
// 用户输入密码
const password = "pJjeEm38Fk";

// 前端进行 SHA256 哈希
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 登录请求
const hashedPassword = await hashPassword(password);
const response = await fetch('https://cms.bailashu.com/api/v1/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Site-Id': '1'
  },
  body: JSON.stringify({
    username: 'fungleo',
    password: hashedPassword
  })
});
```

## 部署命令记录

### 部署到生产环境
```bash
npx wrangler deploy --env production
```

### 运行数据库迁移
```bash
npx wrangler d1 migrations apply cms_production --remote
```

### 设置环境变量
```bash
npx wrangler secret put JWT_SECRET --env production
```

### 查看环境变量列表
```bash
npx wrangler secret list --env production
```

### 执行数据库命令
```bash
npx wrangler d1 execute cms_production --remote --command "SQL_COMMAND"
```

## 注意事项

1. **密码格式**: 所有 API 请求中的 password 字段必须是 SHA256 哈希值（64 个十六进制字符）
2. **Site-Id 头**: 所有请求必须包含 `Site-Id` 头，值为站点 ID（当前为 1）
3. **JWT Token**: 登录成功后返回的 token 有效期为 7 天，需要在后续请求的 Authorization 头中携带
4. **HTTPS**: 生产环境必须使用 HTTPS，确保传输安全

## 相关文档

- [API 参考文档](./API_REFERENCE.md)
- [API 示例](./API_EXAMPLES.md)
- [密码安全说明](./PASSWORD_SECURITY.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
- [生产环境配置](./PRODUCTION_CONFIG.md)
