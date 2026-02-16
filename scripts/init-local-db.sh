#!/bin/bash

# 初始化本地开发数据库
# 创建站点记录，为测试做准备

echo "=========================================="
echo "初始化本地开发数据库"
echo "=========================================="
echo ""

echo "步骤 1: 应用数据库迁移..."
wrangler d1 migrations apply cms_production --local

echo ""
echo "步骤 2: 创建默认站点..."
wrangler d1 execute cms_production --local \
  --command "INSERT OR IGNORE INTO sites (id, name, title, status, created_at, update_at) VALUES (1, '本地测试站点', 'CMS 开发环境', 'NORMAL', strftime('%s', 'now'), strftime('%s', 'now'))"

echo ""
echo "步骤 3: 验证站点创建..."
wrangler d1 execute cms_production --local \
  --command "SELECT * FROM sites"

echo ""
echo "=========================================="
echo "初始化完成！"
echo "=========================================="
echo ""
echo "现在可以运行测试："
echo "1. 启动开发服务器: npm run dev"
echo "2. 运行测试脚本: node scripts/test-local-auth.js"
echo ""
