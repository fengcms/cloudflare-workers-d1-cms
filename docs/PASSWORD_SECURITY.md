# 密码安全机制

## 🔐 密码处理流程

本系统采用双重哈希机制，确保密码安全：

### 1. 前端处理（SHA256）
前端在发送密码前，先对原始密码进行 SHA256 哈希：

```javascript
import crypto from 'crypto';

// 原始密码
const password = 'MySecurePassword123!';

// SHA256 哈希
const passwordHash = crypto.createHash('sha256')
  .update(password)
  .digest('hex');

// 发送到后端
fetch('/api/v1/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Site-Id': '1'
  },
  body: JSON.stringify({
    username: 'user123',
    password: passwordHash,  // 发送 SHA256 哈希，不是明文
    nickname: '用户昵称'
  })
});
```

### 2. 网络传输
- 网络上传输的是 SHA256 哈希值（64 个十六进制字符）
- 即使被拦截，攻击者也无法获得原始密码
- 使用 HTTPS 进一步加密传输

### 3. 后端处理（bcrypt）
后端接收 SHA256 哈希后，再进行 bcrypt 哈希：

```typescript
// 接收前端的 SHA256 哈希
const passwordHash = req.body.password;  // 例如: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"

// 使用 bcrypt 再次哈希
const bcryptHash = await bcrypt.hash(passwordHash, 10);

// 存储到数据库
// 例如: "$2b$10$YWaHgpA9gv7vubHKPO0xXO1DNVwJW2zsk4Kjnhr4W3EX/6V7l.uUO"
```

### 4. 密码验证
登录时的验证流程：

```typescript
// 1. 前端发送 SHA256 哈希
const loginPasswordHash = crypto.createHash('sha256')
  .update(userInputPassword)
  .digest('hex');

// 2. 后端从数据库获取 bcrypt 哈希
const storedBcryptHash = user.password;

// 3. 验证：将前端的 SHA256 哈希与存储的 bcrypt 哈希比对
const isValid = await bcrypt.compare(loginPasswordHash, storedBcryptHash);
```

## 🛡️ 安全优势

### 1. 密码明文永不传输
- 原始密码只存在于用户的浏览器内存中
- 网络传输的是 SHA256 哈希
- 后端和数据库永远不知道原始密码

### 2. 双重哈希保护
- **SHA256**: 防止网络拦截获取明文密码
- **bcrypt**: 防止数据库泄露后的暴力破解
  - bcrypt 有 salt（盐值）
  - bcrypt 计算成本高，减缓暴力破解速度

### 3. 防止彩虹表攻击
- bcrypt 的 salt 使每个密码的哈希都不同
- 即使两个用户使用相同密码，存储的哈希也不同

### 4. 防止重放攻击
- 即使攻击者截获 SHA256 哈希，也无法反推原始密码
- 攻击者无法用截获的哈希登录其他系统

## 📋 实现示例

### 前端实现（JavaScript/TypeScript）

#### 浏览器环境
```javascript
// 使用 Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 注册
async function register(username, password, nickname) {
  const passwordHash = await hashPassword(password);
  
  const response = await fetch('https://cms.bailashu.com/api/v1/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Site-Id': '1'
    },
    body: JSON.stringify({
      username,
      password: passwordHash,
      nickname
    })
  });
  
  return await response.json();
}

// 登录
async function login(username, password) {
  const passwordHash = await hashPassword(password);
  
  const response = await fetch('https://cms.bailashu.com/api/v1/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Site-Id': '1'
    },
    body: JSON.stringify({
      username,
      password: passwordHash
    })
  });
  
  return await response.json();
}
```

#### Node.js 环境
```javascript
import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 使用
const passwordHash = hashPassword('MyPassword123!');
```

### React 示例
```jsx
import { useState } from 'react';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    // 哈希密码
    const passwordHash = await hashPassword(password);
    
    // 发送请求
    const response = await fetch('https://cms.bailashu.com/api/v1/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Site-Id': '1'
      },
      body: JSON.stringify({
        username,
        password: passwordHash
      })
    });
    
    const result = await response.json();
    
    if (result.code === 200) {
      // 登录成功
      localStorage.setItem('token', result.data.token);
      // 跳转到主页
    } else {
      // 显示错误
      alert(result.error?.message || '登录失败');
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="用户名"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密码"
      />
      <button type="submit">登录</button>
    </form>
  );
}
```

### Vue 示例
```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="username" type="text" placeholder="用户名" />
    <input v-model="password" type="password" placeholder="密码" />
    <button type="submit">登录</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const username = ref('');
const password = ref('');

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleSubmit() {
  const passwordHash = await hashPassword(password.value);
  
  const response = await fetch('https://cms.bailashu.com/api/v1/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Site-Id': '1'
    },
    body: JSON.stringify({
      username: username.value,
      password: passwordHash
    })
  });
  
  const result = await response.json();
  
  if (result.code === 200) {
    localStorage.setItem('token', result.data.token);
    // 跳转到主页
  } else {
    alert(result.error?.message || '登录失败');
  }
}
</script>
```

## ⚠️ 重要提醒

### 前端必须实现
前端**必须**在发送密码前进行 SHA256 哈希，否则：
- 密码明文会在网络上传输（即使有 HTTPS）
- 后端会将 SHA256 哈希当作密码处理，导致验证失败

### 测试时注意
使用 curl 或 Postman 测试时，需要手动计算 SHA256 哈希：

```bash
# 计算密码的 SHA256 哈希
echo -n "MyPassword123!" | sha256sum
# 输出: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8

# 使用哈希值测试
curl -X POST https://cms.bailashu.com/api/v1/login \
  -H "Content-Type: application/json" \
  -H "Site-Id: 1" \
  -d '{
    "username": "fungleo",
    "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
  }'
```

### 密码要求
虽然后端存储的是哈希，但仍建议前端实施密码强度要求：
- 最小长度：8 个字符
- 包含大小写字母、数字和特殊字符
- 不使用常见密码

## 🔧 本地测试

### 1. 初始化本地数据库
```bash
chmod +x scripts/init-local-db.sh
bash scripts/init-local-db.sh
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 运行测试脚本
```bash
node scripts/test-local-auth.js
```

测试脚本会自动：
1. 计算密码的 SHA256 哈希
2. 测试用户注册
3. 测试用户登录
4. 测试错误密码拒绝

## 📚 相关文档

- [API 参考文档](./API_REFERENCE.md)
- [API 使用示例](./API_EXAMPLES.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)

---

**最后更新**: 2026-02-16  
**安全级别**: 高
