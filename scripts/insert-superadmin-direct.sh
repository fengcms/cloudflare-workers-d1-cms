#!/bin/bash

# 直接通过 SQL 插入超级管理员账号
# 密码: pJjeEm38Fk
# 密码哈希通过 bcryptjs 生成

# 使用 Node.js 生成密码哈希
PASSWORD_HASH=$(node -e "
const bcrypt = require('bcryptjs');
const password = 'pJjeEm38Fk';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);
console.log(hash);
")

echo "生成的密码哈希: $PASSWORD_HASH"
echo ""
echo "正在插入超级管理员账号..."

# 插入用户
wrangler d1 execute cms_production --env production --command "
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
  'fungleo',
  '$PASSWORD_HASH',
  '超级管理员',
  'SUPERMANAGE',
  'NORMAL',
  1,
  99,
  '',
  '系统超级管理员账号',
  'UNKNOWN',
  '',
  '',
  '',
  'MARKDOWN',
  strftime('%s', 'now'),
  strftime('%s', 'now')
)
"

echo ""
echo "超级管理员账号创建完成！"
echo "用户名: fungleo"
echo "密码: pJjeEm38Fk"
echo "类型: SUPERMANAGE"
