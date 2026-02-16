# 创建超级管理员账号

## 方法一：通过 API + SQL（推荐，最简单）

### 步骤 1: 通过注册接口创建账号

```bash
curl -X POST https://cms.bailashu.com/api/v1/register \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "username": "fungleo",
    "password": "pJjeEm38Fk",
    "nickname": "超级管理员"
  }'
```

这会返回类似这样的响应：
```json
{
  "code": 201,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "fungleo",
      "nickname": "超级管理员",
      "type": "USER",
      ...
    }
  }
}
```

记下返回的 `user.id`（假设是 1）。

### 步骤 2: 升级为超级管理员

```bash
# 将用户升级为超级管理员
wrangler d1 execute cms_production --env production \
  --command "UPDATE users SET type = 'SUPERMANAGE', level = 99 WHERE username = 'fungleo'"
```

### 步骤 3: 验证

```bash
# 登录测试
curl -X POST https://cms.bailashu.com/api/v1/login \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "username": "fungleo",
    "password": "pJjeEm38Fk"
  }'
```

应该返回 `"type": "SUPERMANAGE"` 的用户信息。

---

## 方法二：直接通过 SQL 插入（需要密码哈希）

### 步骤 1: 生成密码哈希

```bash
# 运行脚本生成 SQL
node scripts/create-superadmin.js
```

### 步骤 2: 执行生成的 SQL

复制脚本输出的 SQL，然后执行：

```bash
wrangler d1 execute cms_production --env production \
  --command "INSERT INTO users (...) VALUES (...);"
```

---

## 方法三：使用 Shell 脚本（自动化）

```bash
# 给脚本执行权限
chmod +x scripts/create-superadmin.sh

# 运行脚本
bash scripts/create-superadmin.sh
```

---

## 验证超级管理员权限

创建完成后，使用以下命令验证：

```bash
# 查询用户信息
wrangler d1 execute cms_production --env production \
  --command "SELECT id, username, nickname, type, level, status FROM users WHERE username = 'fungleo'"
```

应该看到：
- `type`: SUPERMANAGE
- `level`: 99
- `status`: NORMAL

---

## 超级管理员权限说明

SUPERMANAGE 类型的用户拥有：
- ✅ 访问所有站点的数据
- ✅ 创建、修改、删除任何用户
- ✅ 管理所有文章、频道、字典、推广
- ✅ 查看和管理所有审计日志
- ✅ 不受站点隔离限制

---

## 安全建议

1. **妥善保管密码**：超级管理员密码应该使用密码管理器保存
2. **定期更换密码**：建议每 3-6 个月更换一次
3. **限制使用**：日常操作使用普通管理员账号，只在必要时使用超级管理员
4. **启用审计**：所有超级管理员操作都会记录在 logs 表中
5. **备份账号**：建议创建至少 2 个超级管理员账号作为备份

---

## 修改密码

如果需要修改超级管理员密码：

```bash
# 方法 1: 通过 API（需要先登录获取 token）
curl -X PUT https://cms.bailashu.com/api/v1/user/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Site-Id: 1" \
  -d '{
    "password": "新密码"
  }'

# 方法 2: 通过 SQL（需要先生成新密码的哈希）
# 使用 node scripts/create-superadmin.js 生成新密码哈希
# 然后执行：
wrangler d1 execute cms_production --env production \
  --command "UPDATE users SET password = '新密码哈希' WHERE username = 'fungleo'"
```

---

**创建时间**: 2026-02-16  
**账号信息**:
- 用户名: fungleo
- 密码: pJjeEm38Fk
- 类型: SUPERMANAGE
- 等级: 99
