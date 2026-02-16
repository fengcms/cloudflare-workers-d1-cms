/**
 * 生产环境 API 测试脚本
 * 测试生产环境的关键接口
 */

const crypto = require('crypto');

const BASE_URL = 'https://cms.bailashu.com/api/v1';
const SITE_ID = '1';

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

async function testProduction() {
  console.log('='.repeat(60));
  console.log('生产环境 API 测试');
  console.log('='.repeat(60));

  // 1. 测试健康检查
  console.log('\n🧪 测试健康检查接口...');
  const healthResponse = await fetch('https://cms.bailashu.com/health');
  const healthData = await healthResponse.json();
  console.log(healthResponse.status === 200 ? '✅ 通过' : '❌ 失败');
  console.log('响应:', healthData);

  // 2. 测试 API 版本
  console.log('\n🧪 测试 API 版本接口...');
  const versionResponse = await request('GET', '');
  console.log(versionResponse.status === 200 ? '✅ 通过' : '❌ 失败');
  console.log('响应:', versionResponse.data);

  // 3. 测试超级管理员登录
  console.log('\n🧪 测试超级管理员登录...');
  const loginResponse = await request('POST', '/login', {
    body: {
      username: 'fungleo',
      password: sha256('pJjeEm38Fk')
    }
  });
  console.log(loginResponse.status === 200 ? '✅ 通过' : '❌ 失败');
  if (loginResponse.data.success) {
    console.log('用户信息:', loginResponse.data.data.user);
    const token = loginResponse.data.data.token;

    // 4. 测试获取用户列表
    console.log('\n🧪 测试获取用户列表...');
    const usersResponse = await request('GET', '/user?page=1&pageSize=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(usersResponse.status === 200 ? '✅ 通过' : '❌ 失败');
    console.log('用户数量:', usersResponse.data.data?.total || 0);

    // 5. 测试获取频道树
    console.log('\n🧪 测试获取频道树...');
    const channelsResponse = await request('GET', '/channel/tree', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(channelsResponse.status === 200 ? '✅ 通过' : '❌ 失败');
    console.log('频道数量:', channelsResponse.data.data?.length || 0);

    // 6. 测试获取字典列表
    console.log('\n🧪 测试获取字典列表...');
    const dictsResponse = await request('GET', '/dict?type=AUTHOR', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(dictsResponse.status === 200 ? '✅ 通过' : '❌ 失败');
    console.log('字典数量:', dictsResponse.data.data?.length || 0);

    // 7. 测试获取文章列表
    console.log('\n🧪 测试获取文章列表...');
    const articlesResponse = await request('GET', '/article?page=1&pageSize=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(articlesResponse.status === 200 ? '✅ 通过' : '❌ 失败');
    console.log('文章数量:', articlesResponse.data.data?.total || 0);

    // 8. 测试获取活动推广
    console.log('\n🧪 测试获取活动推广...');
    const promosResponse = await request('GET', '/promo/active', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(promosResponse.status === 200 ? '✅ 通过' : '❌ 失败');
    console.log('推广数量:', promosResponse.data.data?.length || 0);

    // 9. 测试获取钱包登录 Nonce
    console.log('\n🧪 测试获取钱包登录 Nonce...');
    const nonceResponse = await request('GET', '/login/nonce');
    console.log(nonceResponse.status === 200 ? '✅ 通过' : '❌ 失败');
    if (nonceResponse.data.success) {
      console.log('Nonce 消息:', nonceResponse.data.data.message.substring(0, 50) + '...');
    }
  } else {
    console.log('❌ 登录失败，跳过后续测试');
    console.log('错误:', loginResponse.data);
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

testProduction().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
