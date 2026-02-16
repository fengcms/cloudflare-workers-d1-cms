# API 使用示例

本文档提供了 Cloudflare CMS API 的常见使用场景和示例代码。

## 基础配置

```javascript
const API_BASE_URL = 'https://your-worker-domain.workers.dev/api/v1';
const SITE_ID = 1; // 你的站点 ID

// 设置请求头
const headers = {
  'Content-Type': 'application/json',
  'Site-Id': SITE_ID.toString()
};

// 带认证的请求头
const authHeaders = (token) => ({
  ...headers,
  'Authorization': `Bearer ${token}`
});
```

## 用户认证

### 1. 用户注册

```javascript
async function register(userData) {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      username: userData.username,
      password: userData.password,
      nickname: userData.nickname,
      email: userData.email,
      evm_address: userData.evmAddress // 可选
    })
  });
  
  const result = await response.json();
  if (result.code === 201) {
    // 保存 token
    localStorage.setItem('token', result.data.token);
    return result.data;
  }
  throw new Error(result.msg);
}
```

### 2. 普通登录

```javascript
async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, password })
  });
  
  const result = await response.json();
  if (result.code === 200) {
    localStorage.setItem('token', result.data.token);
    return result.data;
  }
  throw new Error(result.msg);
}
```

### 3. EVM 钱包登录

```javascript
// 使用 ethers.js 或 viem
import { BrowserProvider } from 'ethers';

async function walletLogin() {
  // 连接 MetaMask
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  // 获取 nonce
  const nonceResponse = await fetch(`${API_BASE_URL}/login/nonce`);
  const nonceResult = await nonceResponse.json();
  const message = nonceResult.data.message;
  
  // 签名
  const signature = await signer.signMessage(message);
  
  // 登录
  const loginResponse = await fetch(`${API_BASE_URL}/login/evm`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      signature,
      message
    })
  });
  
  const loginResult = await loginResponse.json();
  if (loginResult.code === 200) {
    localStorage.setItem('token', loginResult.data.token);
    return loginResult.data;
  }
  throw new Error(loginResult.msg);
}
```

## 文章管理

### 1. 创建文章

```javascript
async function createArticle(articleData) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/article`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      title: articleData.title,
      channel_id: articleData.channelId,
      content: articleData.content,
      markdown: articleData.markdown, // 可选
      tags: articleData.tags,
      description: articleData.description,
      img: articleData.coverImage,
      type: 'NORMAL',
      status: 'PENDING'
    })
  });
  
  return await response.json();
}
```

### 2. 查询文章列表

```javascript
async function getArticles(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    pageSize: params.pageSize || 20,
    status: params.status || 'NORMAL',
    sort: params.sort || '-id'
  });
  
  // 添加可选参数
  if (params.channelId) {
    queryParams.append('channel_id', params.channelId);
  }
  if (params.keyword) {
    queryParams.append('title-like', params.keyword);
  }
  if (params.tag) {
    queryParams.append('tags-like', params.tag);
  }
  
  const response = await fetch(
    `${API_BASE_URL}/article?${queryParams}`,
    { headers }
  );
  
  return await response.json();
}
```

### 3. 获取单篇文章

```javascript
async function getArticle(id) {
  const response = await fetch(`${API_BASE_URL}/article/${id}`, {
    headers
  });
  
  return await response.json();
}
```

### 4. 更新文章

```javascript
async function updateArticle(id, updates) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/article/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(updates)
  });
  
  return await response.json();
}
```

### 5. 删除文章（软删除）

```javascript
async function deleteArticle(id) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/article/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  
  return await response.json();
}
```

## 频道管理

### 1. 获取频道树

```javascript
async function getChannelTree() {
  const response = await fetch(`${API_BASE_URL}/channel/tree`, {
    headers
  });
  
  return await response.json();
}
```

### 2. 创建频道

```javascript
async function createChannel(channelData) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/channel`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      name: channelData.name,
      pid: channelData.parentId || 0,
      sort: channelData.sort || 0,
      keywords: channelData.keywords,
      description: channelData.description,
      type: 'ARTICLE',
      status: 'NORMAL'
    })
  });
  
  return await response.json();
}
```

## 图片上传

```javascript
async function uploadImage(file) {
  const token = localStorage.getItem('token');
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Site-Id': SITE_ID.toString()
    },
    body: formData
  });
  
  const result = await response.json();
  if (result.code === 201) {
    return result.data.url; // 返回图片 URL
  }
  throw new Error(result.msg);
}
```

## 字典管理

### 1. 获取字典列表

```javascript
async function getDictionaries(type) {
  const response = await fetch(
    `${API_BASE_URL}/dict?type=${type}&status=NORMAL`,
    { headers }
  );
  
  return await response.json();
}

// 使用示例
const authors = await getDictionaries('AUTHOR');
const tags = await getDictionaries('TAG');
const friendLinks = await getDictionaries('FRIENDLINK');
```

### 2. 创建字典项

```javascript
async function createDictionary(dictData) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/dict`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      name: dictData.name,
      type: dictData.type, // AUTHOR | ORIGIN | TAG | FRIENDLINK
      link: dictData.link, // 友情链接 URL
      status: 'NORMAL'
    })
  });
  
  return await response.json();
}
```

## 推广管理

### 1. 获取活动推广

```javascript
async function getActivePromos() {
  const response = await fetch(`${API_BASE_URL}/promo/active`, {
    headers
  });
  
  return await response.json();
}
```

### 2. 创建推广

```javascript
async function createPromo(promoData) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/promo`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      name: promoData.name,
      url: promoData.url,
      img: promoData.image,
      content: promoData.content,
      start_time: promoData.startTime, // Unix 时间戳（秒）
      end_time: promoData.endTime,
      status: 'NORMAL'
    })
  });
  
  return await response.json();
}
```

## 高级查询

### 1. 复杂过滤查询

```javascript
async function advancedArticleQuery() {
  const params = new URLSearchParams({
    // 基础分页
    page: 1,
    pageSize: 20,
    
    // 精确匹配
    status: 'NORMAL',
    type: 'HOT',
    
    // 模糊搜索
    'title-like': '技术',
    
    // 范围查询
    'id-gt': 100,        // id > 100
    'id-lte': 1000,      // id <= 1000
    
    // IN 查询
    'channel_id-in': '1,2,3',
    
    // 排序
    sort: '-created_at,id',  // 按创建时间降序，id 升序
    
    // 时间范围（Unix 时间戳）
    'created_at-gte': Math.floor(Date.now() / 1000) - 86400 * 7  // 最近 7 天
  });
  
  const response = await fetch(
    `${API_BASE_URL}/article?${params}`,
    { headers }
  );
  
  return await response.json();
}
```

### 2. 搜索功能

```javascript
async function searchArticles(keyword) {
  const params = new URLSearchParams({
    'title-like': keyword,
    'description-like': keyword,
    status: 'NORMAL',
    sort: '-created_at',
    page: 1,
    pageSize: 20
  });
  
  const response = await fetch(
    `${API_BASE_URL}/article?${params}`,
    { headers }
  );
  
  return await response.json();
}
```

## 错误处理

```javascript
async function apiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (result.code === 200) {
      return result.data;
    }
    
    // 处理业务错误
    switch (result.code) {
      case 401:
        // 未授权，跳转到登录页
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        // 权限不足
        alert('权限不足');
        break;
      case 404:
        // 资源不存在
        alert('资源不存在');
        break;
      default:
        alert(result.msg || '请求失败');
    }
    
    throw new Error(result.msg);
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}
```

## React 集成示例

```javascript
import { useState, useEffect } from 'react';

// 自定义 Hook
function useArticles(params) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);
        const data = await getArticles(params);
        setArticles(data.data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchArticles();
  }, [JSON.stringify(params)]);
  
  return { articles, loading, error };
}

// 使用示例
function ArticleList() {
  const { articles, loading, error } = useArticles({
    page: 1,
    pageSize: 20,
    status: 'NORMAL'
  });
  
  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  
  return (
    <div>
      {articles.map(article => (
        <div key={article.id}>
          <h2>{article.title}</h2>
          <p>{article.description}</p>
        </div>
      ))}
    </div>
  );
}
```

## Vue 集成示例

```javascript
import { ref, onMounted } from 'vue';

export function useArticles(params) {
  const articles = ref([]);
  const loading = ref(true);
  const error = ref(null);
  
  async function fetchArticles() {
    try {
      loading.value = true;
      const data = await getArticles(params);
      articles.value = data.data.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }
  
  onMounted(fetchArticles);
  
  return { articles, loading, error, refetch: fetchArticles };
}
```

## 注意事项

1. **Site-Id 头部**: 所有请求都需要包含 `Site-Id` 头部
2. **认证**: 需要认证的接口必须在 `Authorization` 头部包含 JWT token
3. **分页**: 默认 `page=0` 表示第一页，`pagesize` 默认为 20
4. **软删除**: 删除操作是软删除，数据不会真正从数据库中删除
5. **时间戳**: 所有时间戳使用 Unix 时间戳（秒）
6. **图片上传**: 使用 SHA256 hash 作为文件名，自动去重
7. **EVM 地址**: 存储为小写格式，查询时会自动转换
