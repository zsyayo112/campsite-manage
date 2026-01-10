# 营地管理系统 - 部署指南

本文档详细介绍如何将系统部署到生产环境。

## 目录

1. [部署方式选择](#部署方式选择)
2. [本地部署](#本地部署)
3. [云服务器部署](#云服务器部署)
4. [Docker 部署](#docker-部署)
5. [Vercel + Railway 部署](#vercel--railway-部署)
6. [环境变量配置](#环境变量配置)
7. [数据库迁移](#数据库迁移)
8. [Nginx 配置](#nginx-配置)
9. [SSL 证书配置](#ssl-证书配置)
10. [监控和日志](#监控和日志)

---

## 部署方式选择

| 方式 | 适用场景 | 成本 | 难度 |
|------|----------|------|------|
| 本地部署 | 开发测试 | 免费 | 简单 |6
| 云服务器 | 生产环境 | $$$ | 中等 |
| Docker | 统一部署 | $$ | 中等 |
| Vercel + Railway | 快速上线 | 免费/$ | 简单 |

---

## 本地部署

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- SQLite (开发) 或 PostgreSQL (生产)

### 步骤

```bash
# 1. 安装后端依赖
cd backend
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 初始化数据库
npx prisma migrate deploy
npx prisma db seed

# 4. 启动后端
npm start

# 5. 安装前端依赖
cd ../frontend
npm install

# 6. 构建前端
npm run build

# 7. 使用静态服务器托管 build 目录
npx serve -s build -l 3000
```

---

## 云服务器部署

### 推荐云服务商

- 阿里云 ECS
- 腾讯云 CVM
- 华为云 ECS
- AWS EC2

### 服务器配置要求

- CPU: 2核+
- 内存: 4GB+
- 硬盘: 40GB+
- 系统: Ubuntu 22.04 LTS

### 部署步骤

#### 1. 服务器初始化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y git curl wget

# 安装 Node.js (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 安装 PM2
npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx
```

#### 2. 安装 PostgreSQL

```bash
# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
```

```sql
CREATE USER campsite WITH PASSWORD 'your_secure_password';
CREATE DATABASE campsite_db OWNER campsite;
GRANT ALL PRIVILEGES ON DATABASE campsite_db TO campsite;
\q
```

#### 3. 克隆项目

```bash
cd /var/www
sudo git clone <your-repo-url> campsite-manage
sudo chown -R $USER:$USER campsite-manage
cd campsite-manage
```

#### 4. 配置后端

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
nano .env
```

**.env 内容:**
```env
DATABASE_URL="postgresql://campsite:your_secure_password@localhost:5432/campsite_db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3001
NODE_ENV=production
```

```bash
# 修改 Prisma 配置使用 PostgreSQL
# 编辑 prisma/schema.prisma，将 provider 改为 "postgresql"

# 运行迁移
npx prisma migrate deploy

# 填充初始数据
npx prisma db seed
```

#### 5. 配置前端

```bash
cd ../frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
nano .env
```

**.env 内容:**
```env
REACT_APP_API_URL=https://your-domain.com/api
```

```bash
# 构建
npm run build
```

#### 6. PM2 配置

创建 **ecosystem.config.js**:

```javascript
module.exports = {
  apps: [
    {
      name: 'campsite-backend',
      cwd: '/var/www/campsite-manage/backend',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

启动服务:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 7. Nginx 配置

```bash
sudo nano /etc/nginx/sites-available/campsite
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/campsite-manage/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/campsite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Docker 部署

### Dockerfile (后端)

**backend/Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

EXPOSE 3001

CMD ["node", "src/server.js"]
```

### Dockerfile (前端)

**frontend/Dockerfile:**
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: campsite
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: campsite_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - campsite-network

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://campsite:your_secure_password@postgres:5432/campsite_db
      JWT_SECRET: your-jwt-secret
      PORT: 3001
    depends_on:
      - postgres
    networks:
      - campsite-network

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - campsite-network

volumes:
  postgres_data:

networks:
  campsite-network:
    driver: bridge
```

### 启动

```bash
docker-compose up -d
```

---

## Vercel + Railway 部署

这是最简单的部署方式，适合快速上线。

### 后端部署到 Railway

1. 访问 https://railway.app
2. 使用 GitHub 登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择仓库，配置 Root Directory 为 `backend`
5. 添加 PostgreSQL 数据库服务
6. 配置环境变量:
   - `DATABASE_URL`: Railway 自动提供
   - `JWT_SECRET`: 设置一个安全的密钥
   - `PORT`: 3001

### 前端部署到 Vercel

1. 访问 https://vercel.com
2. 使用 GitHub 登录
3. 点击 "New Project" → 导入仓库
4. 配置 Root Directory 为 `frontend`
5. 配置环境变量:
   - `REACT_APP_API_URL`: Railway 提供的后端 URL

---

## 环境变量配置

### 后端环境变量

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| DATABASE_URL | 是 | 数据库连接字符串 | postgresql://user:pass@host:5432/db |
| JWT_SECRET | 是 | JWT 签名密钥 | 至少32位随机字符串 |
| PORT | 否 | 服务端口 | 3001 |
| NODE_ENV | 否 | 运行环境 | production |

### 前端环境变量

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| REACT_APP_API_URL | 是 | 后端 API 地址 | https://api.example.com/api |

### 生成安全密钥

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32
```

---

## 数据库迁移

### 生产环境迁移

```bash
# 部署迁移（不会重置数据）
npx prisma migrate deploy

# 如果需要初始数据
npx prisma db seed
```

### 数据库备份

```bash
# PostgreSQL 备份
pg_dump -U campsite -d campsite_db > backup_$(date +%Y%m%d).sql

# 恢复
psql -U campsite -d campsite_db < backup_20240110.sql
```

### 定时备份脚本

```bash
#!/bin/bash
# /opt/scripts/backup.sh

BACKUP_DIR="/var/backups/campsite"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="campsite_${DATE}.sql"

mkdir -p $BACKUP_DIR
pg_dump -U campsite campsite_db > "$BACKUP_DIR/$FILENAME"

# 保留最近7天的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

添加到 crontab:
```bash
crontab -e
# 每天凌晨3点备份
0 3 * * * /opt/scripts/backup.sh
```

---

## Nginx 配置

### 完整生产配置

```nginx
# /etc/nginx/sites-available/campsite

upstream backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 前端静态文件
    location / {
        root /var/www/campsite-manage/frontend/build;
        try_files $uri $uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # 健康检查
    location /health {
        proxy_pass http://backend/api/health;
    }
}
```

---

## SSL 证书配置

### Let's Encrypt (免费)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 监控和日志

### PM2 监控

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs campsite-backend

# 监控面板
pm2 monit

# 重启
pm2 restart campsite-backend

# 重载（零停机）
pm2 reload campsite-backend
```

### 日志配置

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'campsite-backend',
    script: 'src/server.js',
    error_file: '/var/log/campsite/error.log',
    out_file: '/var/log/campsite/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
```

### 日志轮转

```bash
sudo nano /etc/logrotate.d/campsite
```

```
/var/log/campsite/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 更新部署

### 手动更新

```bash
cd /var/www/campsite-manage

# 拉取最新代码
git pull origin master

# 更新后端
cd backend
npm install
npx prisma migrate deploy
pm2 reload campsite-backend

# 更新前端
cd ../frontend
npm install
npm run build
```

### 自动化脚本

**/opt/scripts/deploy.sh:**
```bash
#!/bin/bash
set -e

PROJECT_DIR="/var/www/campsite-manage"
cd $PROJECT_DIR

echo "Pulling latest code..."
git pull origin master

echo "Updating backend..."
cd backend
npm install
npx prisma migrate deploy
pm2 reload campsite-backend

echo "Updating frontend..."
cd ../frontend
npm install
npm run build

echo "Deployment completed!"
```

---

## 故障排查

### 常见问题

**1. 502 Bad Gateway**
- 检查后端是否运行: `pm2 status`
- 检查端口: `netstat -tlnp | grep 3001`

**2. 数据库连接失败**
- 检查 PostgreSQL 状态: `systemctl status postgresql`
- 检查连接字符串
- 检查防火墙

**3. 静态文件404**
- 检查 build 目录是否存在
- 检查 Nginx 配置路径

### 有用命令

```bash
# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 查看 PM2 日志
pm2 logs --lines 100

# 检查端口占用
sudo lsof -i :3001

# 检查磁盘空间
df -h

# 检查内存
free -m
```

---

## 安全建议

1. **定期更新系统和依赖包**
2. **使用强密码和 JWT 密钥**
3. **配置防火墙只开放必要端口**
4. **启用 HTTPS**
5. **定期备份数据库**
6. **监控异常访问**
7. **限制 API 请求频率**

```bash
# UFW 防火墙配置
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

如有问题，请查看项目的 Issue 或提交新的 Issue。
