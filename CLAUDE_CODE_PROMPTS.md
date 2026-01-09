# Claude Code 交互 Prompt 集合

> 💡 这是一份精心设计的Prompt集合，帮助你在Claude Code中高效开发营地管理系统

---

## 📋 目录

- [项目初始化](#项目初始化)
- [后端开发](#后端开发)
- [前端开发](#前端开发)
- [数据库操作](#数据库操作)
- [调试和测试](#调试和测试)
- [代码审查和优化](#代码审查和优化)
- [部署相关](#部署相关)

---

## 🚀 项目初始化

### Prompt 1: 创建项目基础结构

```
参考 TODO.md 中的 Day 1 任务，帮我完成以下工作：

1. 创建 backend 和 frontend 两个目录
2. 在 backend 目录中初始化 Node.js 项目，安装必要依赖：
   - express
   - prisma
   - @prisma/client
   - jsonwebtoken
   - bcrypt
   - cors
   - dotenv
3. 在 frontend 目录中初始化 React + Vite 项目，安装依赖：
   - react-router-dom
   - axios
   - zustand
   - tailwindcss
   - recharts
   - date-fns
   - react-hook-form
   - zod

生成相应的 package.json 文件和基础目录结构。
```

### Prompt 2: 配置 Prisma

```
根据 PRD_PART2.md 中的完整 Prisma Schema，帮我：

1. 在 backend/prisma 目录创建 schema.prisma 文件
2. 复制完整的数据库 Schema 代码
3. 创建 .env 文件，配置 DATABASE_URL
4. 生成初始化迁移命令说明

我想先使用 SQLite 进行开发。
```

### Prompt 3: 配置 Tailwind CSS

```
帮我在 frontend 项目中配置 Tailwind CSS：

1. 创建 tailwind.config.js
2. 更新 postcss.config.js
3. 在 src/index.css 中添加 Tailwind 指令
4. 配置常用的颜色主题（蓝色主色调）
```

---

## 🔧 后端开发

### Prompt 4: 创建用户认证 API

```
根据 PRD_PART1.md 的用户认证模块需求，帮我实现：

1. POST /api/auth/login - 登录接口
   - 接收 username 和 password
   - 验证用户信息
   - 返回 JWT token
   
2. POST /api/auth/logout - 登出接口

3. GET /api/auth/me - 获取当前用户信息

4. 创建 JWT 中间件验证 token

参考 PRD 中的：
- 密码使用 bcrypt 加密
- Token 有效期 24 小时
- 错误统一返回格式

生成完整代码，包括：
- backend/src/routes/auth.js
- backend/src/controllers/authController.js
- backend/src/middleware/auth.js
```

### Prompt 5: 创建客户管理 API

```
参考 PRD_PART1.md 第5章"客户管理模块"的详细需求，实现客户管理的所有 API：

1. GET /api/customers - 获取客户列表（支持分页、搜索、筛选、排序）
2. GET /api/customers/:id - 获取客户详情
3. POST /api/customers - 创建客户
4. PUT /api/customers/:id - 更新客户
5. DELETE /api/customers/:id - 删除客户

需要包含：
- 参数验证（手机号格式、唯一性检查）
- 标签系统（JSON 数组存储）
- 自动计算 totalSpent 和 visitCount
- 统一的错误处理
- 统一的响应格式

生成：
- backend/src/routes/customers.js
- backend/src/controllers/customerController.js
```

### Prompt 6: 创建订单管理 API

```
根据 PRD_PART1.md 第6章"订单管理模块"，实现订单管理 API：

关键需求：
1. 订单号生成规则：ORD{YYYYMMDD}{序号}，例如 ORD202601090001
2. 订单状态流转：pending → confirmed → completed (或任意状态 → cancelled)
3. 订单创建时需要关联客户、住宿地点、项目
4. 支持套餐选择或自由组合项目
5. 自动计算订单金额

API 端点：
- POST /api/orders - 创建订单（含金额计算逻辑）
- GET /api/orders - 获取订单列表（支持筛选）
- GET /api/orders/:id - 获取订单详情（含客户、项目信息）
- PATCH /api/orders/:id/status - 更新订单状态
- DELETE /api/orders/:id - 删除订单

生成完整代码。
```

### Prompt 7: 创建接送调度 API

```
这是一个新增的核心功能！参考 PRD_PART1.md 第8章"接送调度模块"，实现：

1. GET /api/shuttle/daily-stats?date=2026-01-15
   - 统计指定日期的人数分布
   - 按住宿地点分组
   - 返回需要接送的总人数

2. POST /api/shuttle/schedules - 创建接送调度
   - 分配车辆和司机
   - 设置接送路线（多个住宿地点）
   - 生成接送批次

3. GET /api/shuttle/schedules/:id/stops - 获取接送站点详情
   - 返回每个站点的客人名单

4. PATCH /api/shuttle/schedules/:id/status - 更新接送状态

核心逻辑：
- 查询指定日期所有已确认订单
- 根据 accommodation_place_id 分组统计
- 支持手动调度（暂不实现智能推荐）

生成代码。
```

### Prompt 8: 创建套餐管理 API

```
参考 PRD_PART1.md 第9章"套餐管理模块"，实现：

1. GET /api/packages - 获取套餐列表
2. POST /api/packages - 创建套餐
   - 套餐包含多个项目（package_items 关联表）
   - 设置套餐价格
   
3. 订单创建时的价格计算逻辑：
   - 如果选择套餐：base = 套餐价格 × 人数
   - 如果添加额外项目：额外费用累加
   - 如果自由组合：各项目单价累加 × 人数

在 orderController 中添加价格计算函数。
```

### Prompt 9: 创建行程排期 API

```
参考 PRD_PART1.md 第10章"行程排期模块"，实现：

1. GET /api/schedules/daily?date=2026-01-15
   - 获取指定日期的所有排期
   - 以时间轴数据格式返回（项目、时间段、人数、教练）

2. POST /api/schedules - 创建排期
   - 为订单的项目分配时间段
   - 分配教练

3. 冲突检测逻辑：
   - 检查场地容量是否超限
   - 检查教练是否时间冲突
   - 返回冲突信息

4. PUT /api/schedules/:id - 更新排期（支持拖拽调整时间）

生成代码，包含冲突检测函数。
```

---

## 🎨 前端开发

### Prompt 10: 创建路由和布局

```
帮我创建前端的基础路由和布局结构：

1. 在 src/App.jsx 中设置 React Router
   - /login - 登录页
   - / - 重定向到 /dashboard
   - /dashboard - 仪表盘（需要认证）
   - /customers - 客户列表
   - /customers/:id - 客户详情
   - /orders - 订单列表
   - /shuttle - 接送调度
   - /schedules - 行程排期

2. 创建 Layout 组件（src/components/layout/Layout.jsx）
   - 包含侧边栏导航
   - 顶部栏（显示用户名、登出按钮）
   - 主内容区域

3. 创建路由守卫，检查 token

使用 Tailwind CSS 样式。
```

### Prompt 11: 创建登录页面

```
参考 PRD_PART1.md 第4章用户认证模块的界面设计，创建登录页面：

要求：
1. 居中布局，简洁大方
2. 包含 Logo（可以先用文字代替）、系统标题
3. 用户名输入框、密码输入框（支持显示/隐藏）
4. "记住我"复选框
5. 登录按钮（蓝色主按钮）
6. 错误提示（红色文字）
7. 加载状态（禁用按钮，显示 loading）

使用 React Hook Form + Zod 进行表单验证。
使用 Zustand 存储用户状态和 token。

生成：
- src/pages/Login.jsx
- src/store/authStore.js
- src/api/auth.js
```

### Prompt 12: 创建客户列表页面

```
根据 PRD_PART1.md 第5章客户管理模块的详细需求，创建客户列表页面：

功能要求：
1. 表格展示客户（姓名、手机、微信、来源、标签、总消费、访问次数、操作）
2. 搜索框（实时搜索姓名或手机号）
3. 筛选器（来源筛选、标签筛选）
4. 排序功能（总消费、访问次数、最后访问）
5. 分页器（每页20条，可选10/20/50/100）
6. "新建客户"按钮（打开弹窗）
7. 操作按钮（查看、编辑、删除）

使用 Tailwind CSS 组件风格。
可以使用 Headless UI 或 Radix UI 的对话框组件。

生成：
- src/pages/customers/CustomerList.jsx
- src/components/customers/CustomerForm.jsx（新建/编辑表单）
- src/api/customers.js
```

### Prompt 13: 创建订单列表和创建页面

```
参考 PRD_PART1.md 第6章订单管理模块，创建：

1. 订单列表页面（src/pages/orders/OrderList.jsx）
   - 表格展示订单
   - 筛选（状态、日期范围）
   - 搜索（订单号、客户）

2. 订单创建页面（src/pages/orders/CreateOrder.jsx）
   - 步骤1：选择客户（搜索下拉框）
   - 步骤2：选择住宿地点、房间号
   - 步骤3：选择套餐或自由选择项目（多选框）
   - 步骤4：填写到访日期、人数
   - 步骤5：确认订单（显示自动计算的金额）

3. 订单详情页面（src/pages/orders/OrderDetail.jsx）
   - 显示完整订单信息
   - 状态变更按钮

生成代码。
```

### Prompt 14: 创建接送调度页面

```
这是核心新功能！参考 PRD_PART1.md 第8章，创建接送调度管理页面：

1. 每日人数统计视图（src/pages/shuttle/DailyStats.jsx）
   - 日期选择器
   - 数据卡片：总人数、需接送人数、车辆需求（自动计算）
   - 住宿分布表格：地点、类型、人数、联系人列表

2. 车辆调度页面（src/pages/shuttle/ScheduleManagement.jsx）
   - 创建调度：选择车辆、司机、设置路线
   - 调度列表：显示所有批次
   - 接送单生成：显示详细路线和客人名单
w
3. 车辆管理页面（src/pages/shuttle/VehicleManagement.jsx）
   - 车辆列表：车牌号、类型、座位数、状态
   - 司机列表：姓名、电话、状态

使用卡片布局和表格组合。
```

### Prompt 15: 创建行程排期页面（时间轴视图）

```
这是最复杂的前端页面！参考 PRD_PART1.md 第10章，创建行程排期页面：

1. 时间轴视图（src/pages/schedules/ScheduleTimeline.jsx）
   - 横轴：时间（8:00-18:00，每小时一格）
   - 纵轴：项目类型（冰钓、烧烤、滑梯等）
   - 色块：每个活动时段（显示人数、教练、订单号）
   - 冲突高亮：红色边框

2. 实现方式：
   - 使用 CSS Grid 布局
   - 每个时段 1 小时为 1 个单元格
   - 活动色块根据时长跨越多个单元格（grid-column-span）
   
3. 交互：
   - 点击色块查看详情
   - 点击空白时段创建排期
   - 拖拽调整时间（可选，Phase 3 实现）

4. 冲突检测提示：
   - 实时显示冲突信息
   - 禁止保存有严重冲突的排期

先实现基础的时间轴展示，拖拽功能后续再加。
```

### Prompt 16: 创建统计分析仪表盘

```
参考 PRD_PART1.md 第12章，创建仪表盘页面（src/pages/Dashboard.jsx）：

1. 核心指标卡片（4个）
   - 今日营收
   - 本月营收
   - 订单总数
   - 客户总数
   - 每个卡片显示同比/环比

2. 可视化图表（使用 Recharts）
   - 营收趋势（折线图，最近30天）
   - 订单状态分布（饼图）
   - 项目热度排行（柱状图）
   - 客户来源分布（饼图）

3. 响应式布局
   - 卡片使用 Grid 布局
   - 图表自适应容器宽度

生成完整代码和样式。
```

---

## 🗄️ 数据库操作

### Prompt 17: 生成初始化数据脚本

```
根据 PRD_PART2.md 中的初始化数据 SQL，帮我创建一个 Prisma Seed 脚本：

1. 创建 backend/prisma/seed.js
2. 使用 Prisma Client 插入初始数据：
   - 1 个管理员用户（密码加密）
   - 4 个住宿地点
   - 6 个项目
   - 6 个套餐（含套餐项目关联）

3. 在 package.json 中配置 seed 命令

执行命令：npx prisma db seed
```

### Prompt 18: 创建数据库迁移

```
我已经修改了 schema.prisma，帮我：

1. 生成新的迁移文件
2. 应用迁移到数据库
3. 重新生成 Prisma Client

命令说明：
npx prisma migrate dev --name [迁移名称]
```

### Prompt 19: 数据库查询优化

```
检查我的代码，帮我优化数据库查询性能：

1. 找出 N+1 查询问题
2. 添加必要的 include 关联查询
3. 添加索引建议
4. 使用 Prisma 的 select 减少返回字段

重点检查：
- 客户列表查询
- 订单详情查询
- 接送调度统计查询
```

---

## 🐛 调试和测试

### Prompt 20: 生成 API 测试用例

```
使用 Jest + Supertest 为用户认证 API 生成测试用例：

1. POST /api/auth/login
   - 测试成功登录
   - 测试用户名错误
   - 测试密码错误
   - 测试缺少参数

2. GET /api/auth/me
   - 测试有效 token
   - 测试无效 token
   - 测试过期 token

生成：
- backend/tests/auth.test.js
- backend/tests/setup.js（测试环境配置）
```

### Prompt 21: 调试接送调度统计

```
我的接送调度人数统计功能有问题，帮我调试：

问题描述：
- 统计的人数不准确
- 某些住宿地点的客人没有被统计到

检查：
1. 查询条件是否正确（日期、订单状态）
2. JOIN 关联是否正确
3. 分组统计逻辑
4. 打印调试信息

相关文件：backend/src/controllers/shuttleController.js
```

### Prompt 22: 检查前端状态管理

```
检查我的前端状态管理代码，发现以下问题：

1. 用户登录后刷新页面，token 丢失
2. 列表数据更新后页面没有刷新

帮我：
1. 检查 Zustand store 的 persist 配置
2. 检查 API 调用后的状态更新逻辑
3. 给出修复方案

相关文件：
- src/store/authStore.js
- src/pages/customers/CustomerList.jsx
```

---

## ✨ 代码审查和优化

### Prompt 23: 代码审查

```
审查我的代码，重点关注：

1. 安全性
   - SQL 注入风险
   - XSS 攻击防护
   - 敏感信息泄露

2. 性能
   - 数据库查询优化
   - 不必要的渲染
   - 大列表性能

3. 代码质量
   - 重复代码
   - 命名规范
   - 错误处理

给出具体的改进建议和代码示例。

检查这些文件：
- backend/src/controllers/*.js
- frontend/src/pages/orders/*.jsx
```

### Prompt 24: 重构建议

```
我的 orderController.js 文件已经超过 500 行，代码重复很多，帮我重构：

1. 提取公共逻辑到 utils 函数
2. 拆分成多个小的 controller
3. 抽象订单金额计算逻辑
4. 改进错误处理

给出重构后的文件结构和代码。
```

### Prompt 25: 添加 TypeScript 类型

```
我想为项目添加 TypeScript 支持，帮我：

1. 后端添加 TypeScript 配置
2. 为 Prisma Schema 生成 TypeScript 类型
3. 为 API 接口定义类型（Request, Response）
4. 前端添加接口类型定义

先从认证和客户管理模块开始。

生成：
- backend/tsconfig.json
- backend/src/types/index.ts
- frontend/src/types/api.ts
```

---

## 📦 部署相关

### Prompt 26: 生成 Docker 配置

```
帮我创建 Docker 配置，方便部署：

1. Dockerfile（多阶段构建）
   - 阶段1：构建前端
   - 阶段2：配置后端
   - 阶段3：生产镜像（Nginx + Node.js）

2. docker-compose.yml
   - app 服务（应用）
   - db 服务（PostgreSQL）
   - nginx 服务

3. .dockerignore

生成完整配置文件。
```

### Prompt 27: 生成部署脚本

```
根据 PRD_PART2.md 的部署指南，创建自动化部署脚本：

1. deploy.sh（Linux）
   - 拉取最新代码
   - 安装依赖
   - 数据库迁移
   - 构建前端
   - 重启 PM2

2. backup.sh（数据库备份）
   - PostgreSQL 备份
   - 压缩
   - 上传到云存储（可选）

3. 添加详细的注释和错误处理

生成脚本文件。
```

### Prompt 28: 配置 CI/CD

```
使用 GitHub Actions 配置 CI/CD 流程：

1. .github/workflows/ci.yml
   - 代码提交时自动运行测试
   - ESLint 检查
   - 构建检查

2. .github/workflows/deploy.yml
   - main 分支更新时自动部署
   - 运行测试
   - 构建 Docker 镜像
   - 部署到服务器

生成 workflow 配置文件。
```

---

## 🎯 高级功能开发

### Prompt 29: 实现 Excel 导出

```
为客户列表添加 Excel 导出功能：

1. 后端创建导出 API：GET /api/customers/export
   - 支持筛选条件
   - 使用 xlsx 库生成 Excel
   - 返回文件流

2. 前端添加"导出"按钮
   - 下载生成的 Excel 文件
   - 显示导出进度

生成代码。
```

### Prompt 30: 实现实时通知

```
使用 WebSocket 实现实时通知功能：

1. 后端配置 Socket.io
   - 用户登录时建立连接
   - 订单状态变更时推送通知
   - 接送调度更新时通知司机

2. 前端接收通知
   - 显示 Toast 提示
   - 更新相关数据

生成完整的 WebSocket 集成代码。
```

### Prompt 31: 实现移动端适配

```
优化前端页面的移动端体验：

1. 检查所有页面的响应式设计
2. 为小屏幕调整布局：
   - 表格改为卡片视图
   - 侧边栏改为底部导航
   - 表单垂直排列

3. 添加移动端手势支持
   - 下拉刷新
   - 左滑删除

重点优化这些页面：
- 客户列表
- 订单列表
- 接送调度
```

---

## 💡 通用 Prompt 模板

### 模板 1: 功能开发

```
参考 [PRD 文档章节] 的详细需求，帮我实现 [功能名称]：

需求摘要：
- [需求1]
- [需求2]
- [需求3]

技术要求：
- [技术点1]
- [技术点2]

生成：
- [文件1路径]
- [文件2路径]

请提供完整的代码实现和必要的注释。
```

### 模板 2: Bug 修复

```
我遇到了一个问题：

问题描述：
[详细描述问题现象]

复现步骤：
1. [步骤1]
2. [步骤2]

期望结果：
[期望发生什么]

实际结果：
[实际发生了什么]

相关代码：
[贴上相关代码片段]

帮我分析原因并提供修复方案。
```

### 模板 3: 性能优化

```
优化 [功能/页面] 的性能：

当前问题：
- [问题1：如加载慢]
- [问题2：如内存占用高]

优化目标：
- [目标1]
- [目标2]

请分析瓶颈并提供优化方案，包括：
1. 具体的优化代码
2. 优化前后的对比
3. 需要注意的事项
```

---

## 📝 使用技巧

### 技巧 1: 逐步开发

不要一次性要求实现太多功能，建议：

```
第1步：先实现基础功能
第2步：添加验证和错误处理
第3步：优化性能和用户体验
第4步：添加测试
```

### 技巧 2: 提供上下文

在 Prompt 中明确引用文档：

```
✅ 好的 Prompt:
"参考 PRD_PART1.md 第8章接送调度模块的详细需求..."

❌ 不好的 Prompt:
"帮我做接送调度功能"
```

### 技巧 3: 要求代码注释

```
请在代码中添加详细注释，说明：
1. 函数的作用
2. 参数的含义
3. 复杂逻辑的解释
4. 注意事项
```

### 技巧 4: 要求测试

```
同时生成对应的测试代码，测试：
1. 正常情况
2. 边界情况
3. 异常情况
```

### 技巧 5: 分阶段迭代

```
Phase 1: 实现核心功能（MVP）
Phase 2: 添加高级特性
Phase 3: 性能优化
Phase 4: 完善细节
```

---

## 🎯 今日建议 Prompt 序列

如果你今天要开始开发，建议按以下顺序使用 Prompt：

```
1. Prompt 1 - 创建项目基础结构
2. Prompt 2 - 配置 Prisma
3. Prompt 3 - 配置 Tailwind CSS
4. Prompt 17 - 生成初始化数据脚本
5. Prompt 4 - 创建用户认证 API
6. Prompt 10 - 创建路由和布局
7. Prompt 11 - 创建登录页面

测试登录功能后，继续：
8. Prompt 5 - 创建客户管理 API
9. Prompt 12 - 创建客户列表页面

这样可以在第一天看到一个可运行的系统！
```

---

## 📚 相关文档

- [PRD Part 1](./PRD_PART1.md) - 核心功能需求
- [PRD Part 2](./PRD_PART2.md) - 技术细节和数据库
- [TODO](./TODO.md) - 开发任务清单
- [README](./README.md) - 项目概览

---

**提示**: 
- 使用这些 Prompt 时，可以根据实际情况调整细节
- 如果生成的代码不符合预期，提供更多上下文信息
- 善用"继续"、"完善"、"优化"等后续指令
- 保持与 Claude Code 的对话连贯性

**最后更新**: 2026-01-09
