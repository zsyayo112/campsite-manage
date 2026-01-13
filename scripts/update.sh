#!/bin/bash
set -e

# 修改为你的实际项目路径
PROJECT_DIR="/var/www/campsite-manage"

cd $PROJECT_DIR

echo "=== 拉取最新代码 ==="
git pull origin master

echo "=== 更新后端 ==="
cd backend
npm install
npx prisma db push

echo "=== 重启后端服务 ==="
pm2 reload campsite-backend

echo "=== 更新前端 ==="
cd ../frontend
npm install
npm run build

echo "=== 部署完成！==="
pm2 status
