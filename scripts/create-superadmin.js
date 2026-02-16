/**
 * 创建超级管理员账号脚本
 *
 * 使用方法：
 * node scripts/create-superadmin.js
 */

import bcrypt from 'bcryptjs'

const username = 'fungleo'
const password = 'pJjeEm38Fk'
const nickname = '超级管理员'
const siteId = 1

async function generatePasswordHash() {
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)
  return passwordHash
}

async function generateSQL() {
  const passwordHash = await generatePasswordHash()
  const timestamp = Math.floor(Date.now() / 1000)

  const sql = `
-- 创建超级管理员账号
-- 用户名: ${username}
-- 密码: ${password}
-- 类型: SUPERMANAGE

INSERT INTO users (
  username,
  password,
  nickname,
  type,
  status,
  site_id,
  level,
  avatar,
  mark,
  gender,
  mobile,
  email,
  website,
  editor,
  created_at,
  update_at
) VALUES (
  '${username}',
  '${passwordHash}',
  '${nickname}',
  'SUPERMANAGE',
  'NORMAL',
  ${siteId},
  99,
  '',
  '系统超级管理员账号',
  'UNKNOWN',
  '',
  '',
  '',
  'MARKDOWN',
  ${timestamp},
  ${timestamp}
);
`

  console.log('='.repeat(80))
  console.log('超级管理员账号创建 SQL')
  console.log('='.repeat(80))
  console.log(sql)
  console.log('='.repeat(80))
  console.log('\n使用方法：')
  console.log('1. 复制上面的 SQL 语句')
  console.log('2. 执行以下命令：')
  console.log('   wrangler d1 execute cms_production --env production --command "上面的SQL"')
  console.log('\n或者保存到文件后执行：')
  console.log(
    '   wrangler d1 execute cms_production --env production --file=scripts/superadmin.sql'
  )
  console.log('='.repeat(80))

  return sql
}

// 执行
generateSQL().catch(console.error)
