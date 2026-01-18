# 营地管理系统 - 高级部署与上线指南

> 本文档涵盖域名配置、HTTPS安全设置、微信小程序对接、以及生产环境安全加固。

---

## 目录

1. [域名配置](#1-域名配置)
2. [HTTPS 安全证书](#2-https-安全证书)
3. [微信小程序对接](#3-微信小程序对接)
4. [安全性设置](#4-安全性设置)
5. [快速上线检查清单](#5-快速上线检查清单)
6. [常见问题](#6-常见问题)

---

## 1. 域名配置

### 1.1 购买域名

推荐域名服务商：
- 阿里云万网：https://wanwang.aliyun.com/
- 腾讯云：https://dnspod.cloud.tencent.com/
- Cloudflare：https://www.cloudflare.com/

### 1.2 域名备案（必须）

中国大陆服务器必须进行 ICP 备案：

1. 登录云服务商控制台（阿里云/腾讯云）
2. 进入「ICP 备案」模块
3. 填写网站信息、主体信息
4. 上传身份证、营业执照等材料
5. 等待管局审核（约 7-20 个工作日）

> ⚠️ **重要**：未备案域名无法在国内服务器使用，也无法配置微信小程序。

### 1.3 DNS 解析配置

在域名服务商控制台添加解析记录：

| 记录类型 | 主机记录 | 记录值 | 说明 |
|---------|---------|--------|------|
| A | @ | 118.195.179.34 | 主域名 |
| A | www | 118.195.179.34 | www子域名 |
| A | api | 118.195.179.34 | API子域名（可选） |

### 1.4 Nginx 域名配置

SSH 登录服务器后编辑 Nginx 配置：

```bash
sudo nano /etc/nginx/sites-available/campsite
```

配置内容（假设域名为 `example.com`）：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    # 前端静态文件
    location / {
        root /var/www/campsite/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件目录
    location /uploads {
        alias /var/www/campsite/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/campsite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 2. HTTPS 安全证书

### 2.1 使用 Let's Encrypt 免费证书（推荐）

```bash
# 安装 Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# 自动获取并配置证书
sudo certbot --nginx -d example.com -d www.example.com

# 按提示输入邮箱，同意条款
```

证书自动续期：

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 添加定时任务（通常 Certbot 会自动添加）
sudo crontab -e
# 添加以下行：
0 0 1 * * /usr/bin/certbot renew --quiet
```

### 2.2 使用云服务商证书

**阿里云免费证书：**
1. 登录阿里云控制台 → SSL证书服务
2. 申请免费证书（DV单域名）
3. 下载 Nginx 格式证书
4. 上传到服务器 `/etc/nginx/ssl/` 目录

**手动配置 HTTPS：**

```nginx
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/nginx/ssl/example.com.pem;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # ... 其他配置同上
}

# HTTP 自动跳转 HTTPS
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 3. 微信小程序对接

### 3.1 前置条件

1. ✅ 已完成域名备案
2. ✅ 已配置 HTTPS 证书
3. ✅ 拥有微信小程序账号

### 3.2 注册微信小程序

1. 访问 [微信公众平台](https://mp.weixin.qq.com/)
2. 点击「立即注册」→ 选择「小程序」
3. 完成邮箱验证、信息登记
4. 进行微信认证（企业需要，个人可选）

### 3.3 配置服务器域名

登录微信公众平台后台：

1. 进入「开发」→「开发管理」→「开发设置」
2. 找到「服务器域名」配置
3. 添加以下域名：

| 域名类型 | 域名地址 |
|---------|---------|
| request合法域名 | https://example.com |
| uploadFile合法域名 | https://example.com |
| downloadFile合法域名 | https://example.com |

> ⚠️ 微信小程序要求必须使用 HTTPS，且域名必须已备案。

### 3.4 生成小程序页面链接

微信小程序页面路径对应关系：

| 功能页面 | 小程序路径 | H5 对应地址 |
|---------|-----------|------------|
| 首页 | pages/index/index | https://example.com/ |
| 活动列表 | pages/activities/list | https://example.com/activities |
| 活动详情 | pages/activities/detail?id=xxx | https://example.com/activities/xxx |
| 套餐列表 | pages/packages/list | https://example.com/packages |
| 套餐详情 | pages/packages/detail?id=xxx | https://example.com/packages/xxx |
| 在线预约 | pages/book/index | https://example.com/book |
| 订单查询 | pages/order/query | https://example.com/order-query |

### 3.5 生成小程序码/链接

**方法一：微信公众平台生成**

1. 登录微信公众平台
2. 进入「工具」→「生成小程序码」
3. 输入页面路径，生成二维码图片

**方法二：API 生成（推荐）**

在后端添加生成小程序码的接口：

```javascript
// backend/src/routes/wechat.js
const axios = require('axios');

// 获取 access_token
async function getAccessToken() {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  const response = await axios.get(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
  );

  return response.data.access_token;
}

// 生成小程序码
router.post('/api/wechat/qrcode', async (req, res) => {
  const { path, width = 430 } = req.body;

  const accessToken = await getAccessToken();

  const response = await axios.post(
    `https://api.weixin.qq.com/wxa/getwxacode?access_token=${accessToken}`,
    {
      path: path,
      width: width,
      auto_color: false,
      line_color: { r: 0, g: 0, b: 0 }
    },
    { responseType: 'arraybuffer' }
  );

  res.set('Content-Type', 'image/png');
  res.send(response.data);
});
```

**方法三：生成 URL Scheme（跳转链接）**

```javascript
// 生成可从外部跳转到小程序的链接
router.post('/api/wechat/urlscheme', async (req, res) => {
  const { path, query } = req.body;

  const accessToken = await getAccessToken();

  const response = await axios.post(
    `https://api.weixin.qq.com/wxa/generatescheme?access_token=${accessToken}`,
    {
      jump_wxa: {
        path: path,
        query: query
      },
      expire_type: 0,  // 0: 失效时间为30天
      expire_interval: 30
    }
  );

  // 返回类似：weixin://dl/business/?t=xxxxx
  res.json(response.data);
});
```

### 3.6 配置环境变量

在 `backend/.env` 中添加：

```env
# 微信小程序配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=your_app_secret_here
```

### 3.7 Web 端跳转小程序

在网页中添加跳转按钮：

```html
<!-- 方式一：URL Scheme 跳转 -->
<a href="weixin://dl/business/?t=xxxxx">打开小程序</a>

<!-- 方式二：使用微信开放标签（需在微信浏览器内） -->
<wx-open-launch-weapp
  id="launch-btn"
  appid="wx1234567890abcdef"
  path="pages/index/index"
>
  <template>
    <button>打开小程序</button>
  </template>
</wx-open-launch-weapp>
```

---

## 4. 安全性设置

### 4.1 服务器安全

**修改 SSH 端口：**

```bash
sudo nano /etc/ssh/sshd_config
# 修改 Port 22 为其他端口，如 Port 2222

sudo systemctl restart sshd
```

**配置防火墙：**

```bash
# 使用 UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp    # SSH（修改后的端口）
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# 查看状态
sudo ufw status
```

**禁止 root 登录：**

```bash
sudo nano /etc/ssh/sshd_config
# 设置 PermitRootLogin no

sudo systemctl restart sshd
```

**安装 fail2ban 防暴力破解：**

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4.2 应用安全

**修改默认管理员密码：**

登录后台后立即修改默认密码 `admin123`。

**配置环境变量安全：**

```bash
# backend/.env 文件权限
chmod 600 backend/.env

# 确保 .env 不被提交到 Git
echo ".env" >> .gitignore
```

**JWT 密钥配置：**

```env
# backend/.env
JWT_SECRET=your-very-long-and-random-secret-key-at-least-32-characters
JWT_EXPIRES_IN=7d
```

生成随机密钥：

```bash
openssl rand -base64 32
```

**数据库安全：**

```bash
# 修改 PostgreSQL 默认密码
sudo -u postgres psql
ALTER USER campsite WITH PASSWORD 'new_strong_password_here';
\q

# 更新 .env 中的 DATABASE_URL
```

### 4.3 Nginx 安全配置

```nginx
# 在 server 块中添加安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

# 隐藏 Nginx 版本号
server_tokens off;

# 限制请求体大小（防止大文件攻击）
client_max_body_size 10M;

# 限制请求速率（防止 DDoS）
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api {
    limit_req zone=api burst=20 nodelay;
    # ... 其他配置
}
```

### 4.4 数据备份

**自动备份脚本：**

```bash
#!/bin/bash
# /opt/scripts/backup.sh

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="campsite_db"
DB_USER="campsite"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
PGPASSWORD="your_db_password" pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/campsite/backend/uploads

# 删除7天前的备份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

**添加定时任务：**

```bash
chmod +x /opt/scripts/backup.sh

crontab -e
# 添加：每天凌晨3点备份
0 3 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### 4.5 日志监控

**查看应用日志：**

```bash
# PM2 日志
pm2 logs campsite-backend

# Nginx 访问日志
tail -f /var/log/nginx/access.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log
```

**配置日志轮转：**

```bash
sudo nano /etc/logrotate.d/campsite

# 添加内容：
/var/www/campsite/backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
```

---

## 5. 快速上线检查清单

### 上线前检查

- [ ] **域名配置**
  - [ ] 域名已购买
  - [ ] ICP 备案已通过
  - [ ] DNS 解析已配置
  - [ ] Nginx 域名配置正确

- [ ] **HTTPS 配置**
  - [ ] SSL 证书已安装
  - [ ] HTTP 自动跳转 HTTPS
  - [ ] 证书自动续期已配置

- [ ] **安全设置**
  - [ ] 修改默认管理员密码
  - [ ] 修改数据库密码
  - [ ] 配置强 JWT 密钥
  - [ ] 防火墙已启用
  - [ ] SSH 端口已修改
  - [ ] fail2ban 已安装

- [ ] **微信小程序**（如需要）
  - [ ] 小程序已注册
  - [ ] 服务器域名已配置
  - [ ] HTTPS 已启用
  - [ ] 接口测试通过

- [ ] **备份与监控**
  - [ ] 自动备份已配置
  - [ ] 日志轮转已配置
  - [ ] PM2 监控正常

### 快速上线命令汇总

```bash
# 1. 更新代码
cd /var/www/campsite
git pull origin master

# 2. 更新后端
cd backend
npm install
npx prisma db push
pm2 reload campsite-backend

# 3. 更新前端
cd ../frontend
npm install
npm run build

# 4. 重载 Nginx
sudo nginx -t && sudo systemctl reload nginx

# 5. 检查服务状态
pm2 status
curl -I https://your-domain.com
```

---

## 6. 常见问题

### Q1: 域名解析不生效？

**解决方案：**
1. DNS 解析需要时间生效（通常 10 分钟 - 48 小时）
2. 检查解析记录是否正确
3. 使用 `ping your-domain.com` 测试
4. 清除本地 DNS 缓存：`ipconfig /flushdns`（Windows）

### Q2: HTTPS 证书申请失败？

**解决方案：**
1. 确保域名解析已生效
2. 确保 80 端口可访问
3. 检查防火墙设置
4. 查看 Certbot 错误日志：`sudo cat /var/log/letsencrypt/letsencrypt.log`

### Q3: 微信小程序无法请求接口？

**解决方案：**
1. 检查域名是否已在小程序后台配置
2. 确保使用 HTTPS
3. 确保域名已备案
4. 在开发者工具中打开「不校验合法域名」调试

### Q4: 服务器被攻击怎么办？

**解决方案：**
1. 检查 fail2ban 日志：`sudo fail2ban-client status`
2. 查看被封 IP：`sudo fail2ban-client status sshd`
3. 手动封禁 IP：`sudo ufw deny from xxx.xxx.xxx.xxx`
4. 考虑使用 CDN 服务（如 Cloudflare）

### Q5: 数据库连接失败？

**解决方案：**
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接
sudo -u postgres psql -c "SELECT 1"

# 重启数据库
sudo systemctl restart postgresql
```

---

## 附录：常用命令速查

```bash
# 服务管理
pm2 status                    # 查看进程状态
pm2 logs                      # 查看日志
pm2 reload all               # 重载所有应用
sudo systemctl reload nginx  # 重载 Nginx

# 证书管理
sudo certbot certificates    # 查看证书
sudo certbot renew          # 更新证书

# 防火墙
sudo ufw status             # 查看防火墙状态
sudo ufw allow 443/tcp      # 开放端口

# 数据库
sudo -u postgres psql       # 进入 PostgreSQL
\l                          # 列出数据库
\dt                         # 列出表

# 日志查看
tail -f /var/log/nginx/error.log        # Nginx 错误
pm2 logs campsite-backend --lines 100   # 应用日志
```

---

**文档版本**: v1.0
**更新日期**: 2026年1月14日
**适用版本**: 营地管理系统 V2.3+
