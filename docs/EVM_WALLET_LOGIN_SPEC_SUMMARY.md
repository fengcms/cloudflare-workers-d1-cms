# EVM 钱包登录功能 - 规范文档更新总结

## 概述

本文档总结了为支持 EVM 钱包登录功能而对规范文档进行的所有更新。

## 更新的文档

### 1. 需求文档 (requirements.md)

#### 新增术语
- **EVM地址（EVM_Address）**: 以太坊虚拟机兼容的钱包地址（如 Ethereum、Polygon 等）
- **钱包签名（Wallet_Signature）**: 使用私钥对消息进行的加密签名，用于验证钱包所有权

#### 更新的需求

**需求 5: 用户管理** - 新增验收标准：
- 5.3: 允许修改 EVM 钱包地址
- 5.8: 支持配置 EVM 钱包地址并使用钱包签名登录
- 5.9: 强制执行 EVM 地址唯一性

**需求 21: EVM 钱包登录** - 全新需求：
- 支持两种登录方式：传统用户名+密码和 EVM 钱包签名
- 生成随机 nonce 消息供用户签名
- 验证签名有效性并恢复签名者地址
- 通过恢复的地址查找用户并生成 JWT
- 使用 EIP-191 标准格式化签名消息
- 验证 EVM 地址格式（0x 开头的 42 字符十六进制字符串）
- 以小写形式存储 EVM 地址

### 2. 设计文档 (design.md)

#### 数据库架构更新
- User 表新增 `evm_address` 字段（EVM 钱包地址）

#### 核心设计原则更新
- 新增：EVM 钱包签名认证
- 新增：多种登录方式支持

#### 新增流程图
添加了 "EVM 钱包登录流程" 序列图，展示完整的钱包登录流程：
1. 客户端请求 nonce
2. 服务器生成并返回 nonce
3. 客户端使用钱包签名
4. 服务器验证签名并返回 JWT

#### User 接口更新
```typescript
interface User {
  // ... 其他字段
  evm_address: string | null  // 新增：EVM 钱包地址（可选）
}
```

#### UserService 接口扩展
新增方法：
- `loginWithWallet()` - EVM 钱包登录
- `generateWalletLoginMessage()` - 生成登录 nonce
- `verifySignature()` - 验证签名并恢复地址
- `validateEvmAddress()` - 验证 EVM 地址唯一性
- `validateEvmAddressFormat()` - 验证地址格式
- `findByEvmAddress()` - 通过 EVM 地址查找用户

#### 数据库表结构更新
```typescript
const users = sqliteTable('users', {
  // ... 其他字段
  evm_address: text('evm_address', { length: 42 }),  // 新增字段
  // ... 其他字段
}, (table) => ({
  // ... 其他索引
  evmAddressIdx: index('idx_user_evm_address').on(table.evm_address)  // 新增索引
}))
```

### 3. 任务列表 (tasks.md)

#### 新增任务

**任务 2.3: 添加 EVM 地址字段到用户表**
- 在 users 表中添加 evm_address 字段
- 添加 evm_address 索引
- 生成并应用数据库迁移
- 验证需求：5.8, 5.9, 21.1, 21.2, 21.3

**任务 10.7: EVM 钱包登录功能**

**子任务 10.7.1: 实现 EVM 签名验证工具**
- 创建 `src/utils/evmSignature.ts`
- 实现签名验证和地址恢复
- 实现 nonce 消息生成
- 实现 EVM 地址格式验证
- 使用 EIP-191 标准
- 验证需求：21.2, 21.3, 21.7, 21.9, 21.10

**子任务 10.7.2: 更新用户服务支持 EVM 登录**
- 添加 `loginWithWallet()` 方法
- 添加 `findByEvmAddress()` 方法
- 添加 `validateEvmAddress()` 方法
- 更新 `create()` 和 `update()` 方法
- 确保 EVM 地址唯一性
- 验证需求：5.8, 5.9, 21.4, 21.5, 21.6, 21.8

**子任务 10.7.3: 添加 EVM 钱包登录路由**
- 新增端点：`GET /api/v1/auth/wallet/nonce` - 获取登录 nonce
- 新增端点：`POST /api/v1/auth/wallet/login` - 钱包签名登录
- 验证签名并返回 JWT
- 验证需求：21.1, 21.2, 21.3, 21.4, 21.5

### 4. 类型定义 (src/types/index.ts)

#### User 接口更新
```typescript
export interface User {
  // ... 其他字段
  evm_address: string | null  // 新增：EVM 钱包地址（可选）
}
```

#### CreateUserInput 接口更新
```typescript
export interface CreateUserInput {
  // ... 其他字段
  evm_address?: string  // 新增：EVM 钱包地址（可选）
}
```

#### UpdateUserInput 接口更新
```typescript
export interface UpdateUserInput {
  // ... 其他字段
  evm_address?: string  // 新增：EVM 钱包地址（可选）
}
```

#### 新增接口

**WalletLoginRequest** - 钱包登录请求
```typescript
export interface WalletLoginRequest {
  evmAddress: string    // EVM 钱包地址
  signature: string     // 签名
  message: string       // 被签名的消息（nonce）
}
```

**WalletNonceResponse** - 钱包登录 nonce 响应
```typescript
export interface WalletNonceResponse {
  message: string       // 需要签名的消息
  timestamp: number     // 时间戳
}
```

## 技术实现要点

### 1. EVM 地址格式
- 格式：`0x` + 40 个十六进制字符（共 42 字符）
- 存储：统一转换为小写
- 验证：正则表达式 `/^0x[a-fA-F0-9]{40}$/`

### 2. 签名验证流程
1. 使用 EIP-191 标准格式化消息
2. 从签名中恢复签名者地址
3. 将恢复的地址与用户存储的 evm_address 比对
4. 验证通过后生成 JWT 令牌

### 3. Nonce 消息格式
建议格式：
```
Sign this message to login to [App Name]

Nonce: [random-string]
Timestamp: [unix-timestamp]
```

### 4. 数据库索引
- 在 `evm_address` 字段上创建索引以优化钱包登录查询性能

### 5. 唯一性约束
- 在同一 site_id 内，evm_address 必须唯一（如果已配置）
- 允许 evm_address 为 null（用户可选择不配置钱包）

## 依赖库建议

实现 EVM 签名验证需要以下库：
- `ethers` 或 `viem` - 用于签名验证和地址恢复
- 或使用 Web3.js 的轻量级替代方案

## API 端点总结

### 新增端点

1. **GET /api/v1/auth/wallet/nonce**
   - 功能：获取钱包登录的 nonce 消息
   - 响应：`WalletNonceResponse`

2. **POST /api/v1/auth/wallet/login**
   - 功能：使用钱包签名登录
   - 请求体：`WalletLoginRequest`
   - 响应：JWT 令牌和用户信息

### 更新端点

1. **POST /api/v1/users**
   - 新增字段：`evm_address`（可选）

2. **PUT /api/v1/users/:id**
   - 新增字段：`evm_address`（可选）

## 下一步行动

文档更新已完成，可以开始实现：

1. **数据库迁移** (任务 2.3)
   - 添加 evm_address 字段
   - 创建索引

2. **EVM 签名验证工具** (任务 10.7.1)
   - 实现签名验证逻辑
   - 实现地址格式验证

3. **用户服务更新** (任务 10.7.2)
   - 添加钱包登录方法
   - 更新 CRUD 方法

4. **路由实现** (任务 10.7.3)
   - 添加钱包登录端点
   - 集成到现有路由

## 注意事项

1. **安全性**
   - Nonce 消息应包含时间戳，防止重放攻击
   - 签名验证失败应返回通用错误，不暴露具体原因
   - EVM 地址应以小写存储，查询时也转换为小写

2. **用户体验**
   - 用户可以同时配置密码和 EVM 地址
   - 两种登录方式互不影响
   - 用户可以随时添加或移除 EVM 地址

3. **兼容性**
   - 现有用户无需配置 EVM 地址即可继续使用
   - 新功能完全向后兼容

4. **测试**
   - 需要测试签名验证的正确性
   - 需要测试地址唯一性约束
   - 需要测试两种登录方式的独立性
