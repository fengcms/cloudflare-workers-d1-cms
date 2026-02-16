# 文章状态逻辑说明

## 概述

文章创建时的默认状态根据用户权限自动设置，实现内容审核机制。

## 状态规则

### USER 权限
- **默认状态**: `PENDING`（待审核）
- **说明**: 普通用户创建的文章需要经过审核才能发布
- **权限**: 可以创建文章，但文章默认不可见

### EDITOR 权限
- **默认状态**: `NORMAL`（正常）
- **说明**: 编辑创建的文章直接发布，无需审核
- **权限**: 可以创建、编辑、删除文章

### MANAGE 权限
- **默认状态**: `NORMAL`（正常）
- **说明**: 管理员创建的文章直接发布，无需审核
- **权限**: 可以创建、编辑、删除文章和频道

### SUPERMANAGE 权限
- **默认状态**: `NORMAL`（正常）
- **说明**: 超级管理员创建的文章直接发布，无需审核
- **权限**: 拥有所有权限

## 实现细节

### 代码位置
- **服务层**: `src/services/articleService.ts`
- **路由层**: `src/routes/articles.ts`

### 核心逻辑

```typescript
// 在 ArticleService.create 方法中
const defaultStatus = userType === 'USER' ? StatusEnum.PENDING : StatusEnum.NORMAL
```

### 方法签名

```typescript
async create(
  data: CreateArticleInput, 
  siteId: number, 
  userId: number, 
  userType: string  // 新增参数：用户权限类型
): Promise<Article>
```

## 状态枚举

```typescript
export enum StatusEnum {
  NORMAL = 'NORMAL',    // 正常状态，文章可见
  PENDING = 'PENDING',  // 待审核状态，文章不可见
  DELETE = 'DELETE'     // 已删除状态，软删除
}
```

## API 行为

### POST /api/v1/article

**权限要求**: 所有认证用户

**请求示例**:
```json
{
  "title": "文章标题",
  "channel_id": 1,
  "content": "文章内容",
  "type": "NORMAL"
}
```

**响应示例（USER 权限）**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "文章标题",
    "status": "PENDING",  // USER 权限默认 PENDING
    ...
  }
}
```

**响应示例（EDITOR 及以上权限）**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "文章标题",
    "status": "NORMAL",  // EDITOR 及以上默认 NORMAL
    ...
  }
}
```

## 审核流程

### 1. USER 用户创建文章
1. 用户创建文章
2. 文章状态自动设置为 `PENDING`
3. 文章在列表中不可见（查询时过滤 PENDING 状态）
4. 管理员审核后将状态改为 `NORMAL`
5. 文章变为可见

### 2. EDITOR 及以上权限创建文章
1. 用户创建文章
2. 文章状态自动设置为 `NORMAL`
3. 文章立即可见，无需审核

## 查询行为

### 文章列表查询
- 默认只返回 `status = 'NORMAL'` 的文章
- 可以通过 `filters` 参数查询特定状态的文章

**查询 PENDING 状态文章**:
```
GET /api/v1/article?filters={"status":"PENDING"}
```

### 单篇文章查询
- 只能查询 `status = 'NORMAL'` 的文章
- PENDING 和 DELETE 状态的文章返回 404

## 测试验证

### 本地环境测试
```bash
node scripts/test-article-status.js
```

### 生产环境测试
```bash
node scripts/test-article-status-production.js
```

### 测试结果
- ✅ USER 用户创建文章 → 状态为 PENDING
- ✅ EDITOR 用户创建文章 → 状态为 NORMAL
- ✅ MANAGE 用户创建文章 → 状态为 NORMAL
- ✅ SUPERMANAGE 用户创建文章 → 状态为 NORMAL

## 注意事项

1. **频道管理不受影响**: 频道的创建和管理权限保持不变，只有 MANAGE 和 SUPERMANAGE 可以管理频道

2. **状态转换**: 管理员可以通过更新接口修改文章状态：
   ```
   PUT /api/v1/article/:id
   {
     "status": "NORMAL"  // 将 PENDING 改为 NORMAL
   }
   ```

3. **软删除**: 删除文章时状态变为 `DELETE`，不会真正删除数据

4. **权限检查**: 
   - 创建文章：所有认证用户
   - 更新文章：EDITOR 及以上
   - 删除文章：MANAGE 及以上

## 相关文档

- [API 接口文档](./API_REFERENCE.md)
- [权限系统说明](./PROJECT_COMPLETION_SUMMARY.md#权限管理)
- [测试总结](./API_TESTING_SUMMARY.md)
