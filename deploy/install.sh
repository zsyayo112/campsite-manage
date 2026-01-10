#!/bin/bash
# ============================================
# 营地管理系统 - 一键部署脚本 (Ubuntu 22.04)
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   营地管理系统 - 一键部署脚本${NC}"
echo -e "${GREEN}============================================${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 用户运行此脚本${NC}"
  echo "sudo bash install.sh"
  exit 1
fi

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo -e "${YELLOW}检测到服务器IP: ${SERVER_IP}${NC}"

# ============================================
# 1. 系统更新和基础工具安装
# ============================================
echo -e "\n${GREEN}[1/7] 更新系统并安装基础工具...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git nginx

# ============================================
# 2. 安装 Node.js 18
# ============================================
echo -e "\n${GREEN}[2/7] 安装 Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# ============================================
# 3. 安装 PostgreSQL
# ============================================
echo -e "\n${GREEN}[3/7] 安装 PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# 创建数据库和用户
DB_PASSWORD=$(openssl rand -base64 12)
sudo -u postgres psql -c "CREATE USER campsite WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE campsite_db OWNER campsite;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE campsite_db TO campsite;"

echo -e "${YELLOW}数据库密码: ${DB_PASSWORD}${NC}"

# ============================================
# 4. 安装 PM2
# ============================================
echo -e "\n${GREEN}[4/7] 安装 PM2...${NC}"
npm install -g pm2

# ============================================
# 5. 克隆项目
# ============================================
echo -e "\n${GREEN}[5/7] 克隆项目...${NC}"
PROJECT_DIR="/var/www/campsite-manage"

if [ -d "$PROJECT_DIR" ]; then
  echo "项目目录已存在，更新代码..."
  cd $PROJECT_DIR
  git pull origin master
else
  git clone https://github.com/zsyayo112/campsite-manage.git $PROJECT_DIR
  cd $PROJECT_DIR
fi

# ============================================
# 6. 配置后端
# ============================================
echo -e "\n${GREEN}[6/7] 配置后端...${NC}"
cd $PROJECT_DIR/backend

# 安装依赖
npm install

# 创建环境变量文件
JWT_SECRET=$(openssl rand -base64 32)
cat > .env << EOF
DATABASE_URL="postgresql://campsite:${DB_PASSWORD}@localhost:5432/campsite_db"
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=production
EOF

# 复制 PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# 生成 Prisma Client 并推送数据库
npx prisma generate
npx prisma db push --accept-data-loss

# 填充种子数据
node prisma/seed.js

# 使用 PM2 启动后端
pm2 delete campsite-backend 2>/dev/null || true
pm2 start src/server.js --name campsite-backend
pm2 save
pm2 startup

# ============================================
# 7. 配置前端
# ============================================
echo -e "\n${GREEN}[7/7] 配置前端...${NC}"
cd $PROJECT_DIR/frontend

# 创建环境变量
cat > .env << EOF
REACT_APP_API_URL=http://${SERVER_IP}/api
EOF

# 安装依赖并构建
npm install
npm run build

# ============================================
# 8. 配置 Nginx
# ============================================
echo -e "\n${GREEN}[8/8] 配置 Nginx...${NC}"
cat > /etc/nginx/sites-available/campsite << EOF
server {
    listen 80;
    server_name ${SERVER_IP};

    # 前端静态文件
    location / {
        root ${PROJECT_DIR}/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/campsite /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试并重启 Nginx
nginx -t
systemctl restart nginx

# ============================================
# 配置防火墙
# ============================================
echo -e "\n${GREEN}配置防火墙...${NC}"
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# ============================================
# 完成
# ============================================
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "访问地址: ${YELLOW}http://${SERVER_IP}${NC}"
echo ""
echo -e "登录信息:"
echo -e "  用户名: ${YELLOW}admin${NC}"
echo -e "  密码: ${YELLOW}admin123${NC}"
echo ""
echo -e "数据库信息 (请妥善保管):"
echo -e "  数据库: campsite_db"
echo -e "  用户名: campsite"
echo -e "  密码: ${YELLOW}${DB_PASSWORD}${NC}"
echo ""
echo -e "管理命令:"
echo -e "  查看后端状态: ${YELLOW}pm2 status${NC}"
echo -e "  查看后端日志: ${YELLOW}pm2 logs campsite-backend${NC}"
echo -e "  重启后端: ${YELLOW}pm2 restart campsite-backend${NC}"
echo ""
