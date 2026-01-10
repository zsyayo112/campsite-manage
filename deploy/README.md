# 国内云服务器部署指南

## 第一步：购买云服务器

### 推荐配置
- **CPU**: 2核
- **内存**: 2GB+
- **硬盘**: 40GB+
- **系统**: Ubuntu 22.04 LTS
- **带宽**: 1-5Mbps

### 推荐服务商
| 服务商 | 新用户优惠 | 链接 |
|--------|----------|------|
| 阿里云 | 新人99元/年 | https://www.aliyun.com/product/ecs |
| 腾讯云 | 新人50元/年 | https://cloud.tencent.com/product/cvm |
| 华为云 | 新人优惠 | https://www.huaweicloud.com/product/ecs.html |

## 第二步：连接服务器

### Windows 用户
1. 下载 [MobaXterm](https://mobaxterm.mobatek.net/) 或使用 Windows Terminal
2. 打开终端，输入:
```bash
ssh root@你的服务器IP
```
3. 输入密码登录

### Mac/Linux 用户
```bash
ssh root@你的服务器IP
```

## 第三步：一键部署

登录服务器后，依次执行以下命令：

```bash
# 1. 下载部署脚本
curl -O https://raw.githubusercontent.com/zsyayo112/campsite-manage/master/deploy/install.sh

# 2. 添加执行权限
chmod +x install.sh

# 3. 运行部署脚本
sudo bash install.sh
```

等待约 5-10 分钟，部署完成后会显示访问地址和登录信息。

## 第四步：访问系统

部署完成后，在浏览器打开：
```
http://你的服务器IP
```

使用以下账号登录：
- 用户名: `admin`
- 密码: `admin123`

## 常用管理命令

```bash
# 查看后端状态
pm2 status

# 查看后端日志
pm2 logs campsite-backend

# 重启后端
pm2 restart campsite-backend

# 更新代码
cd /var/www/campsite-manage
git pull origin master
cd backend && npm install
pm2 restart campsite-backend
cd ../frontend && npm install && npm run build
```

## 配置域名（可选）

如果你有域名，可以配置：

1. 在域名服务商处添加 A 记录，指向服务器IP
2. 修改 Nginx 配置：
```bash
sudo nano /etc/nginx/sites-available/campsite
```
3. 将 `server_name` 改为你的域名
4. 重启 Nginx：
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 配置 HTTPS（可选）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书（将 your-domain.com 替换为你的域名）
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

## 常见问题

### Q: 无法访问网站
1. 检查防火墙是否开放 80 端口
2. 检查安全组规则（云服务商控制台）
3. 检查 Nginx 状态：`sudo systemctl status nginx`

### Q: API 请求失败
1. 检查后端是否运行：`pm2 status`
2. 查看后端日志：`pm2 logs campsite-backend`

### Q: 忘记数据库密码
查看后端环境变量文件：
```bash
cat /var/www/campsite-manage/backend/.env
```
