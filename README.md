# 长白山营地旅游管理系统

> 🏔️ 一个专为长白山营地旅游项目设计的一体化运营管理系统

[![Status](https://img.shields.io/badge/Status-In_Development-yellow)]()
[![Version](https://img.shields.io/badge/Version-V2.0-blue)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

---

## 📖 项目简介

本系统是为长白山营地旅游项目量身定制的管理系统，支持：

- 🏨 **住宿管理** - 区分自营宾馆和外部住宿
- 🚌 **接送调度** - 智能统计人数，安排车辆接送
- 🎁 **套餐管理** - 灵活组合项目，多种定价策略
- 📅 **行程排期** - 时间表可视化，冲突自动检测
- 👥 **客户管理** - CRM系统，标签分类，消费统计
- 📋 **订单管理** - 全流程管理，状态追踪
- 📝 **内容管理** - 小红书笔记，数据统计
- 📊 **统计分析** - 多维度报表，数据导出

---

## 🚀 快速开始

### 环境要求

- Node.js 18.x+
- npm 或 pnpm
- Git

### 安装步骤

```bash
# 1. 克隆项目
git clone <your-repo>
cd camp-management-system

# 2. 安装后端依赖
cd backend
npm install
cp .env.example .env  # 配置环境变量

# 3. 初始化数据库
npx prisma migrate dev --name init
npx prisma generate

# 4. 启动后端
npm run dev  # http://localhost:3000

# 5. 安装前端依赖
cd ../frontend
npm install

# 6. 启动前端
npm run dev  # http://localhost:5173
```

### 数据库管理

```bash
# 打开Prisma Studio
npx prisma studio  # http://localhost:5555
```

---

## 📚 文档导航

| 文档 | 说明 | 状态 |
|------|------|------|
| [PRD Part 1](./PRD_PART1.md) | 产品需求文档 - 核心功能 | ✅ 完成 |
| [PRD Part 2](./PRD_PART2.md) | 产品需求文档 - 数据库和附录 | ✅ 完成 |
| [TODO](./TODO.md) | 开发任务清单 | ✅ 完成 |
| [PROJECT_PLAN](./PROJECT_PLAN.md) | 项目计划 | ✅ 完成 |
| [DATABASE_DESIGN](./DATABASE_DESIGN.md) | 数据库设计 | ✅ 完成 |

---

## 🏗️ 技术架构

### 前端

```
React 18 + Tailwind CSS + React Router v6
Zustand + Axios + Recharts + date-fns
```

### 后端

```
Node.js 18 + Express.js + Prisma ORM
SQLite (dev) / PostgreSQL (prod)
JWT + bcrypt
```

### 目录结构

```
camp-management-system/
├── frontend/          # 前端代码
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── api/
│   └── package.json
├── backend/           # 后端代码
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/
│   │   └── controllers/
│   └── package.json
└── docs/              # 文档
```

---

## 🎯 开发进度

### Phase 1: MVP (Week 1-2) ⏳

- [ ] 用户认证
- [ ] 客户管理
- [ ] 订单管理(基础)
- [ ] 住宿管理
- [ ] 套餐管理(基础)

### Phase 2: 核心功能 (Week 3-4) ⏳

- [ ] 接送调度
- [ ] 车辆管理
- [ ] 套餐管理(完整)
- [ ] 行程排期(基础)

### Phase 3: 完善优化 (Week 5-6) ⏳

- [ ] 行程排期(完整)
- [ ] 教练管理
- [ ] 统计分析
- [ ] 内容管理

### Phase 4: 移动端 (Week 7-9) 📱

- [ ] 司机端App
- [ ] 教练端App
- [ ] 小程序对接

**当前进度**: 0% (文档完成，准备开发)

---

## 🎨 核心功能预览

### 接送调度系统

```
每日统计 → 车辆分配 → 路线规划 → 接送单生成
   │          │          │           │
   ↓          ↓          ↓           ↓
 按住宿地点   智能推荐    优化路径    导出PDF
  分组统计    车辆方案    避免绕路    司机查看
```

### 行程排期系统

```
时间轴视图
8:00                    12:00                   18:00
│────────────────────────│────────────────────────│
│ 冰钓区 [团队A 20人] ────────────────→
│                         │ 烧烤区 [团队A] ────────→
│         │ 滑梯 [团队B] ────────→
│                         │
└─────────────────────────┴────────────────────────┘
实时冲突检测 | 教练分配 | 容量控制
```

---

## 🤝 贡献指南

### 开发流程

1. Fork 项目
2. 创建feature分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

### 提交规范

```bash
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

---

## 📝 开发注意事项

### 代码规范

- 使用ESLint + Prettier
- 组件命名: PascalCase
- 函数命名: camelCase
- 常量命名: UPPER_SNAKE_CASE

### 提交前检查

- [ ] 代码通过ESLint检查
- [ ] 功能测试通过
- [ ] 添加必要注释
- [ ] 更新相关文档

---

## 📞 联系方式

- **产品负责人**: [待填写]
- **技术负责人**: [待填写]
- **营地负责人**: [待填写]

---

## 📄 许可证

[MIT License](./LICENSE)

---

## 🙏 致谢

感谢所有为这个项目做出贡献的人！

---

**最后更新**: 2026-01-09  
**项目状态**: 🚧 开发中
