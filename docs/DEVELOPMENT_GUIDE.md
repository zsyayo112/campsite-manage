# 营地管理系统 - 开发指南

本文档详细介绍项目的架构、开发流程和最佳实践，帮助开发者快速上手并进行功能开发。

## 目录

1. [项目架构](#项目架构)
2. [目录结构](#目录结构)
3. [技术栈详解](#技术栈详解)
4. [开发环境设置](#开发环境设置)
5. [添加新功能指南](#添加新功能指南)
6. [API 开发规范](#api-开发规范)
7. [前端开发规范](#前端开发规范)
8. [数据库操作](#数据库操作)
9. [常见问题解决](#常见问题解决)

---

## 项目架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  Pages  │  │Components│  │  Store  │  │   API   │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP (REST API)
┌─────────────────────────┴───────────────────────────────┐
│                    Backend (Express)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Routes  │──│Controller│──│ Prisma  │──│Database │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 数据流

1. **用户操作** → 前端组件
2. **前端组件** → API 模块 (axios)
3. **API 请求** → 后端路由
4. **路由** → 控制器 (业务逻辑)
5. **控制器** → Prisma ORM
6. **Prisma** → 数据库
7. **响应** → 原路返回

---

## 目录结构

### 后端 (backend/)

```
backend/
├── prisma/
│   ├── schema.prisma      # 数据库模型定义
│   ├── migrations/        # 数据库迁移文件
│   └── seed.js           # 种子数据
├── src/
│   ├── controllers/       # 业务逻辑控制器
│   │   ├── authController.js
│   │   ├── customerController.js
│   │   ├── orderController.js
│   │   ├── shuttleController.js
│   │   └── ...
│   ├── routes/           # API 路由定义
│   │   ├── auth.js
│   │   ├── customers.js
│   │   ├── orders.js
│   │   └── ...
│   ├── middleware/       # 中间件
│   │   └── auth.js       # JWT 认证中间件
│   ├── utils/           # 工具函数
│   │   ├── prisma.js    # Prisma 客户端实例
│   │   └── validators.js # 数据验证
│   └── server.js        # 服务器入口
├── tests/               # 测试文件
└── package.json
```

### 前端 (frontend/)

```
frontend/
├── public/              # 静态资源
├── src/
│   ├── api/            # API 请求模块
│   │   ├── auth.js
│   │   ├── customers.js
│   │   ├── orders.js
│   │   └── ...
│   ├── components/     # 可复用组件
│   │   ├── common/     # 通用组件
│   │   │   ├── Modal.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── ConfirmDialog.jsx
│   │   ├── layout/     # 布局组件
│   │   │   └── Layout.jsx
│   │   └── customers/  # 业务组件
│   ├── pages/          # 页面组件
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── shuttle/
│   │   └── ...
│   ├── store/          # 状态管理 (Zustand)
│   │   └── authStore.js
│   ├── utils/          # 工具函数
│   │   └── api.js      # Axios 配置
│   ├── App.js          # 路由配置
│   └── index.js        # 入口文件
├── tailwind.config.js  # Tailwind 配置
└── package.json
```

---

## 技术栈详解

### 后端技术

| 技术 | 用途 | 文档 |
|------|------|------|
| Express.js | Web 框架 | https://expressjs.com/ |
| Prisma | ORM | https://www.prisma.io/docs |
| JWT | 认证 | https://jwt.io/ |
| bcrypt | 密码加密 | - |
| xlsx | Excel 导出 | https://sheetjs.com/ |
| SQLite/PostgreSQL | 数据库 | - |

### 前端技术

| 技术 | 用途 | 文档 |
|------|------|------|
| React 18 | UI 框架 | https://react.dev/ |
| React Router 6 | 路由 | https://reactrouter.com/ |
| Zustand | 状态管理 | https://zustand-demo.pmnd.rs/ |
| TailwindCSS | 样式 | https://tailwindcss.com/ |
| Axios | HTTP 客户端 | https://axios-http.com/ |
| Heroicons | 图标 | https://heroicons.com/ |

---

## 开发环境设置

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd campsite-manage
```

### 2. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 3. 环境配置

**后端 (.env)**
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
PORT=3001
```

**前端 (.env)**
```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 4. 初始化数据库

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 5. 启动开发服务器

```bash
# 终端1 - 后端
cd backend
npm run dev

# 终端2 - 前端
cd frontend
npm start
```

---

## 添加新功能指南

### 示例：添加"教练管理"模块

#### 步骤 1: 数据库模型 (已存在于 schema.prisma)

```prisma
model Coach {
  id          Int      @id @default(autoincrement())
  name        String
  phone       String
  specialties String?  // JSON array
  status      String   // on_duty, off_duty
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("coaches")
}
```

#### 步骤 2: 创建后端控制器

**backend/src/controllers/coachController.js**
```javascript
const prisma = require('../utils/prisma');

// 获取教练列表
exports.getCoaches = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [coaches, total] = await Promise.all([
      prisma.coach.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coach.count({ where }),
    ]);

    res.json({
      data: coaches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: '获取教练列表失败', error: error.message });
  }
};

// 创建教练
exports.createCoach = async (req, res) => {
  try {
    const { name, phone, specialties, status = 'on_duty' } = req.body;

    const coach = await prisma.coach.create({
      data: {
        name,
        phone,
        specialties: specialties ? JSON.stringify(specialties) : null,
        status,
      },
    });

    res.status(201).json(coach);
  } catch (error) {
    res.status(500).json({ message: '创建教练失败', error: error.message });
  }
};

// 更新教练
exports.updateCoach = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, specialties, status } = req.body;

    const coach = await prisma.coach.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phone,
        specialties: specialties ? JSON.stringify(specialties) : undefined,
        status,
      },
    });

    res.json(coach);
  } catch (error) {
    res.status(500).json({ message: '更新教练失败', error: error.message });
  }
};

// 删除教练
exports.deleteCoach = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.coach.delete({ where: { id: parseInt(id) } });
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除教练失败', error: error.message });
  }
};
```

#### 步骤 3: 创建后端路由

**backend/src/routes/coaches.js**
```javascript
const express = require('express');
const router = express.Router();
const coachController = require('../controllers/coachController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate); // 所有路由需要认证

router.get('/', coachController.getCoaches);
router.post('/', coachController.createCoach);
router.put('/:id', coachController.updateCoach);
router.delete('/:id', coachController.deleteCoach);

module.exports = router;
```

#### 步骤 4: 注册路由

**backend/src/server.js** (添加)
```javascript
const coachRoutes = require('./routes/coaches');
app.use('/api/coaches', coachRoutes);
```

#### 步骤 5: 创建前端 API

**frontend/src/api/coaches.js**
```javascript
import api from '../utils/api';

export const getCoaches = (params) => api.get('/coaches', { params });
export const createCoach = (data) => api.post('/coaches', data);
export const updateCoach = (id, data) => api.put(`/coaches/${id}`, data);
export const deleteCoach = (id) => api.delete(`/coaches/${id}`);
```

#### 步骤 6: 创建前端页面

**frontend/src/pages/coaches/CoachList.jsx**
```jsx
import { useState, useEffect } from 'react';
import { getCoaches, createCoach, updateCoach, deleteCoach } from '../../api/coaches';
import { useToast } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';

export default function CoachList() {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      const response = await getCoaches();
      setCoaches(response.data.data);
    } catch (error) {
      toast.error('获取教练列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingCoach) {
        await updateCoach(editingCoach.id, formData);
        toast.success('更新成功');
      } else {
        await createCoach(formData);
        toast.success('创建成功');
      }
      setShowModal(false);
      fetchCoaches();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // ... 渲染逻辑
}
```

#### 步骤 7: 添加路由

**frontend/src/App.js** (添加)
```jsx
const CoachList = lazy(() => import('./pages/coaches/CoachList'));

// 在 Routes 中添加
<Route
  path="/coaches"
  element={
    <PrivateLayoutRoute>
      <CoachList />
    </PrivateLayoutRoute>
  }
/>
```

#### 步骤 8: 添加导航菜单

**frontend/src/components/layout/Layout.jsx** (添加菜单项)
```jsx
{ name: '教练管理', path: '/coaches', icon: UserGroupIcon }
```

---

## API 开发规范

### 请求格式

```javascript
// GET 请求带分页
GET /api/customers?page=1&limit=20&search=张三

// POST 请求
POST /api/customers
Content-Type: application/json
{
  "name": "张三",
  "phone": "13912345678"
}
```

### 响应格式

**成功响应 (列表)**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**成功响应 (单条)**
```json
{
  "id": 1,
  "name": "张三",
  "phone": "13912345678"
}
```

**错误响应**
```json
{
  "message": "操作失败",
  "error": "详细错误信息"
}
```

### 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 前端开发规范

### 组件结构

```jsx
import { useState, useEffect } from 'react';
import { useToast } from '../components/common/Toast';

export default function ComponentName() {
  // 1. 状态定义
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // 2. 副作用
  useEffect(() => {
    fetchData();
  }, []);

  // 3. 数据获取函数
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.getData();
      setData(response.data);
    } catch (error) {
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 4. 事件处理函数
  const handleSubmit = async (formData) => {
    // ...
  };

  // 5. 渲染
  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### TailwindCSS 常用类

```jsx
// 卡片
<div className="bg-white rounded-lg shadow p-6">

// 表格
<table className="min-w-full divide-y divide-gray-200">

// 按钮
<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">

// 输入框
<input className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">

// 响应式
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## 数据库操作

### Prisma 常用操作

```javascript
const prisma = require('../utils/prisma');

// 查询所有
const users = await prisma.user.findMany();

// 条件查询
const users = await prisma.user.findMany({
  where: { role: 'admin' },
  orderBy: { createdAt: 'desc' },
});

// 分页查询
const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
});

// 关联查询
const orders = await prisma.order.findMany({
  include: {
    customer: true,
    orderItems: {
      include: { project: true }
    }
  }
});

// 创建
const user = await prisma.user.create({
  data: { name: '张三', email: 'zhang@example.com' }
});

// 更新
const user = await prisma.user.update({
  where: { id: 1 },
  data: { name: '李四' }
});

// 删除
await prisma.user.delete({ where: { id: 1 } });

// 统计
const count = await prisma.user.count({ where: { role: 'admin' } });

// 分组统计
const stats = await prisma.order.groupBy({
  by: ['status'],
  _count: true,
});

// 事务
await prisma.$transaction([
  prisma.order.update({ ... }),
  prisma.customer.update({ ... }),
]);
```

### 数据库迁移

```bash
# 创建迁移
npx prisma migrate dev --name add_new_field

# 重置数据库
npx prisma migrate reset

# 生成 Prisma Client
npx prisma generate

# 打开数据库浏览器
npx prisma studio
```

---

## 常见问题解决

### 1. 后端修改后不生效

**解决:** 重启后端服务器
```bash
# 停止当前服务 (Ctrl+C)
npm run dev
```

### 2. 数据库模型修改后报错

**解决:** 运行迁移命令
```bash
npx prisma migrate dev --name your_change_description
```

### 3. 前端 API 请求 401

**解决:** 检查 token 是否过期，重新登录
```javascript
// authStore.js 中的 logout 会清除 token
logout();
```

### 4. CORS 错误

**解决:** 后端已配置 CORS，检查请求 URL 是否正确
```javascript
// 确保 .env 中的 REACT_APP_API_URL 正确
REACT_APP_API_URL=http://localhost:3001/api
```

### 5. Prisma Client 未生成

**解决:**
```bash
npx prisma generate
```

### 6. 端口被占用

**解决:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3001
kill -9 <PID>
```

---

## 调试技巧

### 后端调试

```javascript
// 添加日志
console.log('Debug:', variable);

// 检查 Prisma 查询
const orders = await prisma.order.findMany({...});
console.log('Query result:', JSON.stringify(orders, null, 2));
```

### 前端调试

```javascript
// React DevTools
// 浏览器安装 React Developer Tools 扩展

// 网络请求
// 浏览器 F12 → Network 标签页

// 状态调试
console.log('State:', state);
```

---

## Git 工作流

### 功能开发

```bash
# 创建功能分支
git checkout -b feature/coach-management

# 开发并提交
git add .
git commit -m "feat: add coach management module"

# 推送到远程
git push origin feature/coach-management

# 合并到主分支
git checkout master
git merge feature/coach-management
git push origin master
```

### 提交信息规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

---

## 下一步

- 查看 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 了解如何部署
- 查看 [backend/API_DOCUMENTATION.md](../backend/API_DOCUMENTATION.md) 了解完整 API 文档
- 查看 [DATABASE_DESIGN.md](../DATABASE_DESIGN.md) 了解数据库设计
