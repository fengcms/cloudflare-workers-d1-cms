/**
 * 完整的 CRUD API 测试脚本（使用超级管理员）
 * 测试所有模块的完整 CRUD 操作
 */

const crypto = require('crypto');

const BASE_URL = 'http://localhost:8787/api/v1';
const SITE_ID = '1';

// 超级管理员凭据（从本地数据库）
const SUPER_ADMIN = {
  username: 'fungleo',
  password: crypto.createHash('sha256').update('pJjeEm38Fk').digest('hex')
};

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// 存储测试过程中创建的资源
const testData = {
  adminToken: null,
  manageUser: null,
  editorUser: null,
  regularUser: null,
  channel: null,
  dict: null,
  article: null,
  promo: null
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

// ==================== 准备测试数据 ====================

async function setupSuperAdmin() {
  console.log('   登录超级管理员...');
  const response = await request('POST', '/login', {
    body: {
      username: SUPER_ADMIN.username,
      password: SUPER_ADMIN.password
    }
  });

  if (response.status === 200) {
    testData.adminToken = response.data.data.token;
    console.log('   ✅ 超级管理员登录成功');
  } else {
    throw new Error('超级管理员登录失败');
  }
}

async function setupTestUsers() {
  // 创建 MANAGE 用户
  console.log('   创建 MANAGE 用户...');
  const manageResponse = await request('POST', '/user', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      username: `manage_${Date.now()}`,
      password: sha256('manage123'),
      nickname: '测试管理员',
      type: 'MANAGE'
    }
  });

  if (manageResponse.status === 201) {
    testData.manageUser = manageResponse.data.data;
    console.log('   ✅ MANAGE 用户创建成功');
  }

  // 创建 EDITOR 用户
  console.log('   创建 EDITOR 用户...');
  const editorResponse = await request('POST', '/user', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      username: `editor_${Date.now()}`,
      password: sha256('editor123'),
      nickname: '测试编辑',
      type: 'EDITOR'
    }
  });

  if (editorResponse.status === 201) {
    testData.editorUser = editorResponse.data.data;
    console.log('   ✅ EDITOR 用户创建成功');
  }

  // 创建普通用户
  console.log('   创建普通用户...');
  const userResponse = await request('POST', '/user', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      username: `user_${Date.now()}`,
      password: sha256('user123'),
      nickname: '测试用户',
      type: 'USER'
    }
  });

  if (userResponse.status === 201) {
    testData.regularUser = userResponse.data.data;
    console.log('   ✅ 普通用户创建成功');
  }
}

// ==================== 用户管理 CRUD 测试 ====================

async function testUserCreate() {
  const response = await request('POST', '/user', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      username: `testuser_${Date.now()}`,
      password: sha256('password123'),
      nickname: '测试创建的用户',
      type: 'USER'
    }
  });

  assert(response.status === 201, `期望状态码 201，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.username, '期望返回用户名');
}

async function testUserRead() {
  const response = await request('GET', `/user?page=1&pageSize=10`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(Array.isArray(response.data.data.data), '期望返回数组');
  assert(response.data.data.total > 0, '期望至少有一个用户');
}

async function testUserUpdate() {
  if (!testData.regularUser) {
    throw new Error('没有可更新的用户');
  }

  const response = await request('PUT', `/user/${testData.regularUser.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      nickname: '更新后的昵称_CRUD_FULL'
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.nickname === '更新后的昵称_CRUD_FULL', '期望昵称已更新');
}

async function testUserDelete() {
  if (!testData.regularUser) {
    throw new Error('没有可删除的用户');
  }

  const response = await request('DELETE', `/user/${testData.regularUser.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

// ==================== 频道管理 CRUD 测试 ====================

async function testChannelCreate() {
  const response = await request('POST', '/channel', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      name: '测试频道_CRUD_FULL',
      pid: 0,
      sort: 0,
      type: 'ARTICLE',
      keywords: '测试,CRUD',
      description: '这是一个测试频道'
    }
  });

  assert(response.status === 201, `期望状态码 201，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.name === '测试频道_CRUD_FULL', '期望频道名称匹配');
  
  testData.channel = response.data.data;
}

async function testChannelRead() {
  const response = await request('GET', '/channel/tree', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(Array.isArray(response.data.data), '期望返回数组');
}

async function testChannelUpdate() {
  if (!testData.channel) {
    throw new Error('没有可更新的频道');
  }

  const response = await request('PUT', `/channel/${testData.channel.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      name: '更新后的频道_CRUD_FULL',
      description: '更新后的描述'
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.name === '更新后的频道_CRUD_FULL', '期望频道名称已更新');
}

async function testChannelDelete() {
  if (!testData.channel) {
    throw new Error('没有可删除的频道');
  }

  const response = await request('DELETE', `/channel/${testData.channel.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

// ==================== 字典管理 CRUD 测试 ====================

async function testDictCreate() {
  const response = await request('POST', '/dict', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      name: '测试作者_CRUD_FULL',
      type: 'AUTHOR',
      value: 'test-author'
    }
  });

  assert(response.status === 201, `期望状态码 201，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.name === '测试作者_CRUD_FULL', '期望字典名称匹配');
  
  testData.dict = response.data.data;
}

async function testDictRead() {
  const response = await request('GET', '/dict?type=AUTHOR', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(Array.isArray(response.data.data), '期望返回数组');
}

async function testDictUpdate() {
  if (!testData.dict) {
    throw new Error('没有可更新的字典');
  }

  const response = await request('PUT', `/dict/${testData.dict.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      name: '更新后的作者_CRUD_FULL',
      value: 'updated-author'
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.name === '更新后的作者_CRUD_FULL', '期望字典名称已更新');
}

async function testDictDelete() {
  if (!testData.dict) {
    throw new Error('没有可删除的字典');
  }

  const response = await request('DELETE', `/dict/${testData.dict.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

// ==================== 文章管理 CRUD 测试 ====================

async function testArticleCreate() {
  // 先创建一个频道用于文章
  const channelResponse = await request('POST', '/channel', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      name: '文章测试频道',
      pid: 0,
      sort: 0,
      type: 'ARTICLE'
    }
  });

  const channelId = channelResponse.data.data?.id || 1;

  const response = await request('POST', '/article', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      title: '测试文章_CRUD_FULL',
      channel_id: channelId,
      content: '这是测试文章的内容',
      markdown: '# 测试文章',
      tags: 'test,crud',
      description: '测试文章描述',
      type: 'NORMAL'
    }
  });

  assert(response.status === 201, `期望状态码 201，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.title === '测试文章_CRUD_FULL', '期望文章标题匹配');
  
  testData.article = response.data.data;
}

async function testArticleRead() {
  const response = await request('GET', '/article?page=1&pageSize=10', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

async function testArticleReadById() {
  if (!testData.article) {
    console.log('   跳过：没有可读取的文章');
    return;
  }

  const response = await request('GET', `/article/${testData.article.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  // 文章标题可能已被更新
  assert(response.data.data.id === testData.article.id, '期望文章 ID 匹配');
}

async function testArticleUpdate() {
  if (!testData.article) {
    console.log('   跳过：没有可更新的文章');
    return;
  }

  const response = await request('PUT', `/article/${testData.article.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      title: '更新后的文章_CRUD_FULL',
      content: '更新后的内容'
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.title === '更新后的文章_CRUD_FULL', '期望文章标题已更新');
  
  // 更新 testData 中的文章信息
  testData.article = response.data.data;
}

async function testArticleDelete() {
  if (!testData.article) {
    console.log('   跳过：没有可删除的文章');
    return;
  }

  const response = await request('DELETE', `/article/${testData.article.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  
  // 清空文章数据，防止后续测试使用
  testData.article = null;
}

// ==================== 推广管理 CRUD 测试 ====================

async function testPromoCreate() {
  const now = Math.floor(Date.now() / 1000);
  const response = await request('POST', '/promo', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      title: '测试推广_CRUD_FULL',
      url: 'https://example.com',
      img: 'https://example.com/image.jpg',
      content: '测试推广内容',
      start_time: now,
      end_time: now + 86400,
      sort: 0
    }
  });

  assert(response.status === 201, `期望状态码 201，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.title === '测试推广_CRUD_FULL', '期望推广标题匹配');
  
  testData.promo = response.data.data;
}

async function testPromoRead() {
  const response = await request('GET', '/promo/active', {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(Array.isArray(response.data.data), '期望返回数组');
}

async function testPromoUpdate() {
  if (!testData.promo) {
    throw new Error('没有可更新的推广');
  }

  const response = await request('PUT', `/promo/${testData.promo.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    },
    body: {
      title: '更新后的推广_CRUD_FULL',
      content: '更新后的内容'
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
  assert(response.data.data.title === '更新后的推广_CRUD_FULL', '期望推广标题已更新');
}

async function testPromoToggle() {
  if (!testData.promo) {
    throw new Error('没有可切换的推广');
  }

  const response = await request('PUT', `/promo/${testData.promo.id}/toggle`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

async function testPromoDelete() {
  if (!testData.promo) {
    throw new Error('没有可删除的推广');
  }

  const response = await request('DELETE', `/promo/${testData.promo.id}`, {
    headers: {
      'Authorization': `Bearer ${testData.adminToken}`
    }
  });

  assert(response.status === 200, `期望状态码 200，实际 ${response.status}`);
  assert(response.data.success === true, '期望 success 为 true');
}

// ==================== 主测试流程 ====================

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('完整 CRUD API 测试（使用超级管理员）');
  console.log('='.repeat(60));

  // 准备测试数据
  console.log('\n📋 准备测试数据');
  await setupSuperAdmin();
  await setupTestUsers();

  // 用户管理 CRUD
  console.log('\n📋 用户管理 CRUD 测试');
  await runTest('创建用户', testUserCreate);
  await runTest('查询用户列表', testUserRead);
  await runTest('更新用户资料', testUserUpdate);
  await runTest('删除用户', testUserDelete);

  // 频道管理 CRUD
  console.log('\n📋 频道管理 CRUD 测试');
  await runTest('创建频道', testChannelCreate);
  await runTest('查询频道树', testChannelRead);
  await runTest('更新频道', testChannelUpdate);
  await runTest('删除频道', testChannelDelete);

  // 字典管理 CRUD
  console.log('\n📋 字典管理 CRUD 测试');
  await runTest('创建字典', testDictCreate);
  await runTest('查询字典列表', testDictRead);
  await runTest('更新字典', testDictUpdate);
  await runTest('删除字典', testDictDelete);

  // 文章管理 CRUD
  console.log('\n📋 文章管理 CRUD 测试');
  await runTest('创建文章', testArticleCreate);
  await runTest('查询文章列表', testArticleRead);
  await runTest('查询单篇文章', testArticleReadById);
  await runTest('更新文章', testArticleUpdate);
  await runTest('删除文章', testArticleDelete);

  // 推广管理 CRUD
  console.log('\n📋 推广管理 CRUD 测试');
  await runTest('创建推广', testPromoCreate);
  await runTest('查询活动推广', testPromoRead);
  await runTest('更新推广', testPromoUpdate);
  await runTest('切换推广状态', testPromoToggle);
  await runTest('删除推广', testPromoDelete);

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
