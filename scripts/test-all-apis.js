/**
 * 完整的 API 测试脚本
 * 测试所有接口的功能是否正常
 */

const crypto = require('crypto');

const BASE_URL = 'http://localhost:8787/api/v1';
const SITE_ID = '1';

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// 存储测试过程中创建的资源
const testData = {
  tokens: {},
  users: {},
  channels: {},
  articles: {},
  dicts: {},
  promos: {}
};

// SHA256 哈希函数
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// HTTP 请求封装
async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Site-Id': SITE_ID,
    ...options.headers
  };

  const config = {
    method,
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return {
      status: response.status,
      data,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false
    };
  }
}

// 测试断言
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// 运行单个测试
async function runTest(name, testFn) {
  console.log(`\n🧪 测试: ${name}`);
  try {
    await testFn();
    console.log(`✅ 通过: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log(`❌ 失败: ${name}`);
    console.log(`   错误: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

// ==================== 认证相关测试 ====================

async function testUserRegister() {
  const username = `testuser_${Date.now()}`;
  const password = sha256('password123');
  
  const response = await request('POST', '/register', {
    body: {
      username,
      password,
      nickname: '测试用户'
    }
  });

  assert(response.status === 201, `期望状态码 201，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.token, '期望返回 token');
  assert(response.data.data.user.username === username, '期望用户名匹配');

  testData.users.regular = {
    username,
    password,
    token: response.data.data.token,
    id: response.data.data.user.id
  };
}

async function testUserLogin() {
  const response = await request('POST', '/login', {
    body: {
      username: testData.users.regular.username,
      password: testData.users.regular.password
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.token, '期望返回 token');
}

async function testLoginWithWrongPassword() {
  const response = await request('POST', '/login', {
    body: {
      username: testData.users.regular.username,
      password: sha256('wrongpassword')
    }
  });

  assert(response.status === 401, `期望状态码 401，实际 ${response.status}`);
  assert(response.data.success === false, '期望 success 为 false');
}

async function testGetNonce() {
  const response = await request('GET', '/login/nonce');

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.message, '期望返回 message');
  assert(response.data.data.timestamp, '期望返回 timestamp');
}

// ==================== 用户管理测试 ====================

async function testCreateUserWithoutAuth() {
  const response = await request('POST', '/user', {
    body: {
      username: 'newuser',
      password: sha256('password123'),
      nickname: '新用户'
    }
  });

  assert(response.status === 401, `期望状态码 401，实际 ${response.status}`);
}

async function testGetUserList() {
  const response = await request('GET', '/user?page=1&pageSize=10', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(Array.isArray(response.data.data.data), '期望返回数组');
  assert(typeof response.data.data.total === 'number', '期望返回 total');
}

async function testUpdateOwnProfile() {
  const response = await request('PUT', `/user/${testData.users.regular.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    },
    body: {
      nickname: '更新后的昵称'
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.nickname === '更新后的昵称', '期望昵称已更新');
}

// ==================== 频道管理测试 ====================

async function testCreateChannel() {
  const response = await request('POST', '/channel', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    },
    body: {
      name: '测试频道',
      pid: 0,
      sort: 0,
      type: 'ARTICLE'
    }
  });

  // 普通用户没有权限创建频道，应该返回 403
  assert(response.status === 403, `期望状态码 403，实际 ${response.status}`);
}

async function testGetChannelTree() {
  const response = await request('GET', '/channel/tree', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(Array.isArray(response.data.data), '期望返回数组');
}

// ==================== 字典管理测试 ====================

async function testCreateDict() {
  const response = await request('POST', '/dict', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    },
    body: {
      name: '测试作者',
      type: 'AUTHOR'
    }
  });

  // 普通用户没有权限创建字典，应该返回 403
  assert(response.status === 403, `期望状态码 403，实际 ${response.status}`);
}

async function testGetDictList() {
  const response = await request('GET', '/dict?type=AUTHOR&page=1&pageSize=10', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

// ==================== 文章管理测试 ====================

async function testCreateArticle() {
  const response = await request('POST', '/article', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    },
    body: {
      title: '测试文章',
      channel_id: 1,
      content: '这是测试文章的内容',
      markdown: '# 测试文章',
      tags: 'test,article',
      description: '测试文章描述'
    }
  });

  // 普通用户没有权限创建文章，应该返回 403
  assert(response.status === 403, `期望状态码 403，实际 ${response.status}`);
}

async function testGetArticleList() {
  const response = await request('GET', '/article?page=1&pageSize=10', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

// ==================== 推广管理测试 ====================

async function testCreatePromo() {
  const response = await request('POST', '/promo', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    },
    body: {
      title: '测试推广',
      url: 'https://example.com',
      img: 'https://example.com/image.jpg',
      start_time: Math.floor(Date.now() / 1000),
      end_time: Math.floor(Date.now() / 1000) + 86400
    }
  });

  // 普通用户没有权限创建推广，应该返回 403
  assert(response.status === 403, `期望状态码 403，实际 ${response.status}`);
}

async function testGetActivePromos() {
  const response = await request('GET', '/promo/active', {
    headers: {
      'Authorization': `Bearer ${testData.users.regular.token}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

// ==================== 健康检查测试 ====================

async function testHealthCheck() {
  const response = await fetch('http://localhost:8787/health');
  const data = await response.json();

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(data.status === 'ok', '期望 status 为 ok');
}

async function testApiVersion() {
  const response = await request('GET', '');

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.version === 'v1', '期望 version 为 v1');
}

// ==================== 主测试流程 ====================

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('开始 API 测试');
  console.log('='.repeat(60));

  // 健康检查
  console.log('\n📋 健康检查测试');
  await runTest('健康检查接口', testHealthCheck);
  await runTest('API 版本接口', testApiVersion);

  // 认证相关
  console.log('\n📋 认证相关测试');
  await runTest('用户注册', testUserRegister);
  await runTest('用户登录', testUserLogin);
  await runTest('错误密码登录', testLoginWithWrongPassword);
  await runTest('获取钱包登录 Nonce', testGetNonce);

  // 用户管理
  console.log('\n📋 用户管理测试');
  await runTest('未认证创建用户', testCreateUserWithoutAuth);
  await runTest('查询用户列表', testGetUserList);
  await runTest('更新自己的资料', testUpdateOwnProfile);

  // 频道管理
  console.log('\n📋 频道管理测试');
  await runTest('创建频道（无权限）', testCreateChannel);
  await runTest('获取频道树', testGetChannelTree);

  // 字典管理
  console.log('\n📋 字典管理测试');
  await runTest('创建字典（无权限）', testCreateDict);
  await runTest('查询字典列表', testGetDictList);

  // 文章管理
  console.log('\n📋 文章管理测试');
  await runTest('创建文章（无权限）', testCreateArticle);
  await runTest('查询文章列表', testGetArticleList);

  // 推广管理
  console.log('\n📋 推广管理测试');
  await runTest('创建推广（无权限）', testCreatePromo);
  await runTest('获取活动推广', testGetActivePromos);

  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`📊 总计: ${results.passed + results.failed}`);
  console.log(`📈 通过率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);

  if (results.failed > 0) {
    console.log('\n失败的测试:');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  ❌ ${t.name}: ${t.error}`);
      });
  }

  console.log('\n' + '='.repeat(60));
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runAllTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
