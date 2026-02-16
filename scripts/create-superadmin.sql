-- 创建超级管理员账号
-- 用户名: fungleo
-- 密码: pJjeEm38Fk (将被 bcrypt 哈希)
-- 类型: SUPERMANAGE

-- 注意：密码哈希需要在应用层生成，这里提供占位符
-- 实际密码哈希: $2a$10$... (需要通过 bcryptjs 生成)

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
  '$2a$10$PLACEHOLDER',  -- 这个需要替换为实际的密码哈希
  '超级管理员',
  'SUPERMANAGE',
  'NORMAL',
  1,  -- 站点 ID，超级管理员可以访问所有站点
  99,  -- 最高等级
  '',
  '系统超级管理员账号',
  'UNKNOWN',
  '',
  '',
  '',
  'MARKDOWN',
  strftime('%s', 'now'),
  strftime('%s', 'now')
);
