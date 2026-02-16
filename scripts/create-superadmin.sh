#!/bin/bash

# 创建超级管理员账号脚本
# 使用方法: bash scripts/create-superadmin.sh

set -e

API_URL="https://cms.bailashu.com/api/v1"
USERNAME="fungleo"
PASSWORD="pJjeEm38Fk"
NICKNAME="超级管理员"
SITE_ID=1

echo "=========================================="
echo "创建超级管理员账号"
echo "=========================================="
echo "用户名: $USERNAME"
echo "站点ID: $SITE_ID"
echo ""

# 步骤 1: 通过注册接口创建账号
echo "步骤 1: 注册账号..."
RESPONSE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -H "Site-Id: $SITE_ID" \
  -d "{
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\",
    \"nickname\": \"$NICKNAME\"
  }")

echo "注册响应: $RESPONSE"
echo ""

# 提取用户 ID（需要 jq 工具）
if command -v jq &> /dev/null; then
  USER_ID=$(echo $RESPONSE | jq -r '.data.user.id')
  echo "用户 ID: $USER_ID"
  echo ""
  
  # 步骤 2: 升级为超级管理员
  echo "步骤 2: 升级为超级管理员..."
  echo "请执行以下 SQL 命令："
  echo ""
  echo "wrangler d1 execute cms_production --env production --command \"UPDATE users SET type = 'SUPERMANAGE', level = 99 WHERE id = $USER_ID\""
  echo ""
else
  echo "提示: 安装 jq 工具可以自动提取用户 ID"
  echo "手动查找用户 ID 并执行："
  echo "wrangler d1 execute cms_production --env production --command \"UPDATE users SET type = 'SUPERMANAGE', level = 99 WHERE username = '$USERNAME'\""
  echo ""
fi

echo "=========================================="
echo "完成！"
echo "=========================================="
