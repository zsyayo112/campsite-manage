# 快速参考手册

## 常用命令

### 开发环境

```bash
# 启动后端
cd backend && npm run dev

# 启动前端
cd frontend && npm start

# 数据库管理
npx prisma studio          # 打开数据库浏览器
npx prisma migrate dev     # 创建迁移
npx prisma db seed         # 填充数据

# 测试
cd backend && node tests/functional-test.js
```

### 生产构建

```bash
# 构建前端
cd frontend && npm run build

# 启动生产服务器
cd backend && npm start
```

## 项目结构速览

```
campsite-manage/
├── backend/
│   ├── src/
│   │   ├── controllers/    # 业务逻辑
│   │   ├── routes/         # API 路由
│   │   ├── middleware/     # 中间件
│   │   └── utils/          # 工具函数
│   └── prisma/             # 数据库模型
├── frontend/
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 可复用组件
│   │   ├── api/            # API 请求
│   │   └── store/          # 状态管理
│   └── public/             # 静态资源
└── docs/                   # 文档
```

## API 端点速查

| 模块 | 端点 | 方法 |
|------|------|------|
| 认证 | /api/auth/login | POST |
| 客户 | /api/customers | GET, POST |
| 订单 | /api/orders | GET, POST |
| 项目 | /api/projects | GET, POST |
| 套餐 | /api/packages | GET, POST |
| 接送 | /api/shuttle/daily-stats | GET |
| 用户 | /api/users | GET, POST |

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| operator1 | password123 | 运营 |

## 数据库模型关系

```
Customer ─┬─< Order ─┬─< OrderItem ─── Project
          │          └─── Package
          │
AccommodationPlace ─< Order
                   └─< ShuttleStop

Vehicle ──< ShuttleSchedule >── Driver
                  └─< ShuttleStop

Coach ──< DailySchedule ─── Project
```

## 状态值参考

### 订单状态 (Order.status)
- `pending` - 待确认
- `confirmed` - 已确认
- `completed` - 已完成
- `cancelled` - 已取消

### 支付状态 (Order.paymentStatus)
- `unpaid` - 未支付
- `paid` - 已支付
- `refunded` - 已退款

### 调度状态 (ShuttleSchedule.status)
- `pending` - 待出发
- `in_progress` - 进行中
- `completed` - 已完成

### 用户角色 (User.role)
- `admin` - 管理员
- `operator` - 运营人员
- `driver` - 司机
- `coach` - 教练
- `marketer` - 营销人员

## 快速添加功能清单

### 添加新 API

1. [ ] 创建 Controller: `backend/src/controllers/xxxController.js`
2. [ ] 创建 Route: `backend/src/routes/xxx.js`
3. [ ] 注册路由: `backend/src/server.js`
4. [ ] 重启后端

### 添加新页面

1. [ ] 创建页面组件: `frontend/src/pages/xxx/XxxList.jsx`
2. [ ] 创建 API 模块: `frontend/src/api/xxx.js`
3. [ ] 添加路由: `frontend/src/App.js`
4. [ ] 添加菜单: `frontend/src/components/layout/Layout.jsx`

### 修改数据库

1. [ ] 修改模型: `backend/prisma/schema.prisma`
2. [ ] 创建迁移: `npx prisma migrate dev --name xxx`
3. [ ] 更新种子数据: `backend/prisma/seed.js`
4. [ ] 重新生成客户端: `npx prisma generate`

## 联系方式

- 问题反馈: 提交 GitHub Issue
- 文档: 查看 `docs/` 目录
