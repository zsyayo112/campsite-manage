# 长白山双溪森林营地管理系统

> 一个专为长白山营地旅游项目设计的一体化运营管理系统

[![Status](https://img.shields.io/badge/Status-Production-green)]()
[![Version](https://img.shields.io/badge/Version-V2.3-blue)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

---

## 项目简介

本系统是为长白山双溪森林营地量身定制的管理系统，包含后台管理系统和客户公开展示页面。

### 功能特性

**后台管理**
- 客户管理 - CRM系统，客户档案管理
- 订单管理 - 订单全流程追踪
- 预约管理 - 客户自助预约处理
- 接送调度 - 车辆调度、司机管理
- 行程排期 - 时间表管理
- 项目管理 - 活动项目配置（含图片/视频）
- 套餐管理 - 灵活组合项目、定价策略
- 用户管理 - 后台用户权限控制
- 系统设置 - 营地信息配置

**公开展示页面**
- 营地介绍 - 图文展示营地信息
- 活动列表 - 季节筛选、详情查看
- 套餐展示 - 精选套餐详情
- 在线预约 - 客户自助预约表单
- 订单查询 - 通过手机号查询订单

---

## 技术栈

### 前端
- React 18 + React Router v6
- Tailwind CSS（响应式设计）
- Zustand（状态管理）
- Axios

### 后端
- Node.js 18 + Express.js
- Prisma ORM
- SQLite (开发) / PostgreSQL (生产)
- JWT 认证

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/campsite-manage.git
cd campsite-manage

# 2. 安装后端依赖
cd backend
npm install
cp .env.example .env

# 3. 初始化数据库
npx prisma migrate dev
npx prisma db seed

# 4. 启动后端
npm run dev  # http://localhost:5000

# 5. 安装前端依赖（新终端）
cd ../frontend
npm install
cp .env.example .env

# 6. 启动前端
npm start  # http://localhost:3000
```

### 默认账号

- 管理员：admin / admin123
- 操作员：operator / operator123

---

## 目录结构

```
campsite-manage/
├── backend/               # 后端代码
│   ├── prisma/            # 数据库模型
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── routes/        # 路由
│   │   ├── middleware/    # 中间件
│   │   └── server.js      # 入口文件
│   └── uploads/           # 上传文件目录
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── components/    # 公共组件
│   │   ├── pages/         # 页面组件
│   │   │   ├── booking/   # 预约相关
│   │   │   ├── customers/ # 客户管理
│   │   │   ├── orders/    # 订单管理
│   │   │   ├── packages/  # 套餐管理
│   │   │   ├── projects/  # 项目管理
│   │   │   ├── public/    # 公开展示页面
│   │   │   └── ...
│   │   ├── store/         # 状态管理
│   │   └── utils/         # 工具函数
│   └── build/             # 构建输出
├── docs/                  # 文档
│   ├── DEPLOYMENT_GUIDE.md
│   └── DEVELOPMENT_GUIDE.md
├── scripts/               # 脚本
│   └── update.sh          # 更新脚本
└── deploy/                # 部署配置
```

---

## 部署指南

详细部署文档请参考 [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)

### 快速更新部署

如果服务器已配置好 Git SSH，执行以下命令即可更新：

```bash
cd /var/www/campsite-manage
./scripts/update.sh
```

### 手动更新步骤

```bash
cd /var/www/campsite-manage

# 1. 拉取最新代码
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

# 4. 检查状态
pm2 status
```

---

## 公开页面路由

| 路径 | 说明 |
|------|------|
| `/about` | 营地介绍 |
| `/activities` | 活动列表 |
| `/activities/:id` | 活动详情 |
| `/packages` | 套餐列表 |
| `/packages/:id` | 套餐详情 |
| `/book` | 在线预约 |
| `/order-query` | 订单查询 |

---

## 后台管理路由

| 路径 | 说明 |
|------|------|
| `/login` | 登录 |
| `/dashboard` | 仪表盘 |
| `/customers` | 客户管理 |
| `/orders` | 订单管理 |
| `/bookings` | 预约管理 |
| `/shuttle/*` | 接送调度 |
| `/schedules` | 行程排期 |
| `/projects` | 项目管理 |
| `/admin/packages` | 套餐管理 |
| `/users` | 用户管理 |
| `/settings/*` | 系统设置 |

---

## 更新日志

### V2.3 (2026-01)
- 新增项目管理图片/视频上传功能
- 新增套餐管理多媒体支持
- 优化移动端响应式布局
- 添加公开页面统一导航

### V2.2 (2026-01)
- 新增客户自助预约功能
- 新增订单查询页面
- 完善公开展示页面

### V2.1 (2026-01)
- 新增套餐公开展示页面
- 新增活动公开展示页面
- 优化后台管理界面

---

## 许可证

[MIT License](./LICENSE)

---

**最后更新**: 2026-01-14
