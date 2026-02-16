/**
 * 本地测试认证功能
 * 
 * 测试用户注册和登录流程，验证 SHA256 + bcrypt 双重哈希
 * 
 * 使用方法：
 * 1. 启动本地开发服务器: npm run dev
 * 2. 在另一个终端运行: node scripts/test-local-auth.js
 */

import crypto from 'crypto';

const API_BASE_URL = 'http://localhost:8787/api/v1';
const SITE_ID = 1;

// 生成 SHA256 哈希
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// 测试用户数据
const testUser = {
  username: 'fungleo',
  password: 'pJjeEm38Fk',  // 原始密码
  nickname: '超级管理员'
};

// 计算密码的 SHA256 哈希
const passwordHash = sha256(testUser.password);

console.log('='.repeat(80));
console.log('本地认证测试');
console.log('='.repeat(80));
console.log('原始密码:', testUser.password);
console.log('SHA256 哈希:', passwordHash);
console.log('');

async function testRegister() {
  console.log('步骤 1: 测试用户注册');
  console.log('-'.repeat(80));
  
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Site-Id': SITE_ID.toString()
      },
      body: JSON.stringify({
        username: testUser.username,
        password: passwordHash,  // 传递 SHA256 哈希
        nickname: testUser.nickname
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ 注册成功！');
      console.log('Token:', result.data.token.substring(0, 50) + '...');
      console.log('用户信息:', {
        id: result.data.user.id,
        username: result.data.user.username,
        nickname: result.data.user.nickname,
        type: result.data.user.type
      });
      return result.data.token;
    } else {
      console.log('❌ 注册失败:', result);
      return null;
    }
  } catch (error) {
    console.log('❌ 注册请求失败:', error.message);
    return null;
  }
}

async function testLogin() {
  console.log('');
  console.log('步骤 2: 测试用户登录');
  console.log('-'.repeat(80));
  
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Site-Id': SITE_ID.toString()
      },
      body: JSON.stringify({
        username: testUser.username,
        password: passwordHash  // 传递 SHA256 哈希
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ 登录成功！');
      console.log('Token:', result.data.token.substring(0, 50) + '...');
      console.log('用户信息:', {
        id: result.data.user.id,
        username: result.data.user.username,
        nickname: result.data.user.nickname,
        type: result.data.user.type
      });
      return result.data.token;
    } else {
      console.log('❌ 登录失败:', result);
      return null;
    }
  } catch (error) {
    console.log('❌ 登录请求失败:', error.message);
    return null;
  }
}

async function testWithWrongPassword() {
  console.log('');
  console.log('步骤 3: 测试错误密码');
  console.log('-'.repeat(80));
  
  const wrongPasswordHash = sha256('wrongpassword');
  
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Site-Id': SITE_ID.toString()
      },
      body: JSON.stringify({
        username: testUser.username,
        password: wrongPasswordHash
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.log('✅ 正确拒绝了错误密码');
      console.log('错误信息:', result.error?.message || result.msg);
    } else {
      console.log('❌ 不应该允许错误密码登录！');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

async function runTests() {
  console.log('开始测试...');
  console.log('');
  
  // 测试注册
  const registerToken = await testRegister();
  
  // 等待一秒
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试登录
  const loginToken = await testLogin();
  
  // 等待一秒
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试错误密码
  await testWithWrongPassword();
  
  console.log('');
  console.log('='.repeat(80));
  console.log('测试完成！');
  console.log('='.repeat(80));
  
  if (registerToken && loginToken) {
    console.log('✅ 所有测试通过');
    console.log('');
    console.log('密码处理流程：');
    console.log('1. 前端：原始密码 → SHA256 哈希');
    console.log('2. 网络传输：SHA256 哈希');
    console.log('3. 后端：SHA256 哈希 → bcrypt 哈希 → 存储');
    console.log('4. 验证：SHA256 哈希 → 与存储的 bcrypt 哈希比对');
  } else {
    console.log('❌ 部分测试失败');
  }
}

// 运行测试
runTests().catch(console.error);
