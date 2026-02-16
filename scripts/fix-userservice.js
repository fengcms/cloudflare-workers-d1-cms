const fs = require('fs');

const path = 'src/routes/users.ts';
let content = fs.readFileSync(path, 'utf8');

// 添加 drizzle 导入
if (!content.includes('import { drizzle }')) {
  content = content.replace(
    "import { Hono } from 'hono'",
    "import { Hono } from 'hono'\nimport { drizzle } from 'drizzle-orm/d1'"
  );
}

// 替换所有 UserService 实例化
content = content.replace(
  /const userService = new UserService\(\s*c\.env\.DB,/g,
  'const db = drizzle(c.env.DB); const userService = new UserService(db,'
);

fs.writeFileSync(path, content);
console.log('✅ 文件已更新');
