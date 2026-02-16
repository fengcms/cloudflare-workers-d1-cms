/**
 * 测试文章状态逻辑
 * 验证不同权限用户创建文章时的默认状态
 */

const crypto = require('crypto')

const BASE_URL = 'http://localhost:8787/api/v1'
const SITE_ID = '1'

// 超级管理员凭据
const SUPER_ADMIN = {
  username: 'fungleo',
  password: crypto.createHash('sha256').update('pJjeEm38Fk').digest('hex'),
}

// SHA256 哈希函数
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

// HTTP 请求封装
async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
    'Site-Id': SITE_ID,
    ...options.headers,
  }

  const config = {
    method,
    headers,
  }

  if (options.body) {
    config.body = JSON.stringify(options.body)
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()
    return {
      status: response.status,
      data,
      ok: response.ok,
    }
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false,
    }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('测试文章状态逻辑')
  console.log('='.repeat(60))

  // 1. 登录超级管理员
  console.log('\n1. 登录超级管理员...')
  const adminLoginResponse = await request('POST', '/login', {
    body: {
      username: SUPER_ADMIN.username,
      password: SUPER_ADMIN.password,
    },
  })

  if (adminLoginResponse.status !== 200) {
    console.error('❌ 超级管理员登录失败')
    return
  }

  const adminToken = adminLoginResponse.data.data.token
  console.log('✅ 超级管理员登录成功')

  // 2. 创建测试频道
  console.log('\n2. 创建测试频道...')
  const channelResponse = await request('POST', '/channel', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: {
      name: '文章状态测试频道',
      pid: 0,
      sort: 0,
      type: 'ARTICLE',
    },
  })

  if (channelResponse.status !== 201) {
    console.error('❌ 创建频道失败')
    return
  }

  const channelId = channelResponse.data.data.id
  console.log(`✅ 创建频道成功，ID: ${channelId}`)

  // 3. 创建不同权限的测试用户
  console.log('\n3. 创建测试用户...')

  // 创建 USER 权限用户
  const userResponse = await request('POST', '/user', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: {
      username: `test_user_${Date.now()}`,
      password: sha256('test123'),
      nickname: '测试普通用户',
      type: 'USER',
    },
  })

  if (userResponse.status !== 201) {
    console.error('❌ 创建 USER 用户失败')
    return
  }

  const testUser = userResponse.data.data
  console.log(`✅ 创建 USER 用户成功，ID: ${testUser.id}`)

  // 创建 EDITOR 权限用户
  const editorResponse = await request('POST', '/user', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: {
      username: `test_editor_${Date.now()}`,
      password: sha256('test123'),
      nickname: '测试编辑',
      type: 'EDITOR',
    },
  })

  if (editorResponse.status !== 201) {
    console.error('❌ 创建 EDITOR 用户失败')
    return
  }

  const testEditor = editorResponse.data.data
  console.log(`✅ 创建 EDITOR 用户成功，ID: ${testEditor.id}`)

  // 4. 登录 USER 用户并创建文章
  console.log('\n4. 测试 USER 用户创建文章...')
  const userLoginResponse = await request('POST', '/login', {
    body: {
      username: testUser.username,
      password: sha256('test123'),
    },
  })

  if (userLoginResponse.status !== 200) {
    console.error('❌ USER 用户登录失败')
    return
  }

  const userToken = userLoginResponse.data.data.token
  console.log('✅ USER 用户登录成功')

  const userArticleResponse = await request('POST', '/article', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    body: {
      title: 'USER 用户创建的文章',
      channel_id: channelId,
      content: '这是 USER 用户创建的文章内容',
      type: 'NORMAL',
    },
  })

  if (userArticleResponse.status !== 201) {
    console.error('❌ USER 用户创建文章失败')
    console.error('响应:', userArticleResponse.data)
    return
  }

  const userArticle = userArticleResponse.data.data
  console.log(`✅ USER 用户创建文章成功，ID: ${userArticle.id}`)
  console.log(`   文章状态: ${userArticle.status}`)

  if (userArticle.status === 'PENDING') {
    console.log('✅ 验证通过：USER 用户创建的文章状态为 PENDING')
  } else {
    console.log(`❌ 验证失败：USER 用户创建的文章状态应为 PENDING，实际为 ${userArticle.status}`)
  }

  // 5. 登录 EDITOR 用户并创建文章
  console.log('\n5. 测试 EDITOR 用户创建文章...')
  const editorLoginResponse = await request('POST', '/login', {
    body: {
      username: testEditor.username,
      password: sha256('test123'),
    },
  })

  if (editorLoginResponse.status !== 200) {
    console.error('❌ EDITOR 用户登录失败')
    return
  }

  const editorToken = editorLoginResponse.data.data.token
  console.log('✅ EDITOR 用户登录成功')

  const editorArticleResponse = await request('POST', '/article', {
    headers: {
      Authorization: `Bearer ${editorToken}`,
    },
    body: {
      title: 'EDITOR 用户创建的文章',
      channel_id: channelId,
      content: '这是 EDITOR 用户创建的文章内容',
      type: 'NORMAL',
    },
  })

  if (editorArticleResponse.status !== 201) {
    console.error('❌ EDITOR 用户创建文章失败')
    console.error('响应:', editorArticleResponse.data)
    return
  }

  const editorArticle = editorArticleResponse.data.data
  console.log(`✅ EDITOR 用户创建文章成功，ID: ${editorArticle.id}`)
  console.log(`   文章状态: ${editorArticle.status}`)

  if (editorArticle.status === 'NORMAL') {
    console.log('✅ 验证通过：EDITOR 用户创建的文章状态为 NORMAL')
  } else {
    console.log(`❌ 验证失败：EDITOR 用户创建的文章状态应为 NORMAL，实际为 ${editorArticle.status}`)
  }

  // 6. 测试超级管理员创建文章
  console.log('\n6. 测试 SUPERMANAGE 用户创建文章...')
  const adminArticleResponse = await request('POST', '/article', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: {
      title: 'SUPERMANAGE 用户创建的文章',
      channel_id: channelId,
      content: '这是 SUPERMANAGE 用户创建的文章内容',
      type: 'NORMAL',
    },
  })

  if (adminArticleResponse.status !== 201) {
    console.error('❌ SUPERMANAGE 用户创建文章失败')
    console.error('响应:', adminArticleResponse.data)
    return
  }

  const adminArticle = adminArticleResponse.data.data
  console.log(`✅ SUPERMANAGE 用户创建文章成功，ID: ${adminArticle.id}`)
  console.log(`   文章状态: ${adminArticle.status}`)

  if (adminArticle.status === 'NORMAL') {
    console.log('✅ 验证通过：SUPERMANAGE 用户创建的文章状态为 NORMAL')
  } else {
    console.log(
      `❌ 验证失败：SUPERMANAGE 用户创建的文章状态应为 NORMAL，实际为 ${adminArticle.status}`
    )
  }

  // 7. 清理测试数据
  console.log('\n7. 清理测试数据...')

  // 删除文章
  await request('DELETE', `/article/${userArticle.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  await request('DELETE', `/article/${editorArticle.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  await request('DELETE', `/article/${adminArticle.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })

  // 删除频道
  await request('DELETE', `/channel/${channelId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })

  // 删除用户
  await request('DELETE', `/user/${testUser.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  await request('DELETE', `/user/${testEditor.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })

  console.log('✅ 测试数据清理完成')

  console.log('\n' + '='.repeat(60))
  console.log('测试完成')
  console.log('='.repeat(60))
}

main().catch((error) => {
  console.error('测试运行失败:', error)
  process.exit(1)
})
