const fs = require('fs');
const path = require('path');

const files = [
  'src/routes/articles.ts',
  'src/routes/channels.ts',
  'src/routes/dictionaries.ts',
  'src/routes/promos.ts'
];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 替换所有的 Service 实例化
  content = content.replace(
    /const (articleService|channelService|dictionaryService|promoService) = new (\w+Service)\(c\.env\.DB(, cacheManager)?\)/g,
    'const db = drizzle(c.env.DB)\n  const $1 = new $2(db$3)'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ 已修复: ${filePath}`);
});

console.log('\n所有文件已修复！');
