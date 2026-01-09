# 数据库设置说明

## 📦 已完成的工作

### 1. Prisma Schema 配置
- ✅ 完整的数据库模型已配置在 `prisma/schema.prisma`
- ✅ 使用 SQLite 作为开发数据库
- ✅ 包含 15 个数据表模型

### 2. 数据库结构

#### 核心模块：
- **用户认证** (`users`)
- **客户管理** (`customers`)
- **住宿管理** (`accommodation_places`)
- **项目管理** (`projects`)
- **套餐管理** (`packages`, `package_items`)
- **订单管理** (`orders`, `order_items`)
- **接送调度** (`vehicles`, `drivers`, `shuttle_schedules`, `shuttle_stops`)
- **行程排期** (`coaches`, `daily_schedules`)
- **内容管理** (`xiaohongshu_notes`)

### 3. 初始化数据

种子数据已自动创建：
- ✅ 1 个管理员用户
  - 用户名: `admin`
  - 密码: `admin123`
- ✅ 4 个住宿地点
- ✅ 6 个项目（石板烧烤、雪上滑梯、冰钓、丛林穿越等）
- ✅ 6 个套餐
- ✅ 套餐项目关联

## 🚀 常用命令

### Prisma 命令

```bash
# 进入 backend 目录
cd backend

# 生成 Prisma Client（修改 schema 后需要运行）
npm run prisma:generate

# 创建并应用数据库迁移
npm run prisma:migrate

# 重置数据库（清空所有数据）
npx prisma migrate reset

# 运行种子脚本（初始化数据）
npm run prisma:seed

# 打开 Prisma Studio（可视化数据库管理工具）
npm run prisma:studio
```

### 数据库位置
```
backend/prisma/dev.db
```

## 📊 数据库结构图

```
users (用户)
customers (客户) → orders (订单)
accommodation_places (住宿地点) → orders, shuttle_stops
projects (项目) → order_items, package_items, daily_schedules
packages (套餐) → package_items, orders
vehicles (车辆) → shuttle_schedules
drivers (司机) → shuttle_schedules
coaches (教练) → order_items, daily_schedules
xiaohongshu_notes (小红书笔记)
```

## 🔐 默认登录信息

- **用户名**: `admin`
- **密码**: `admin123`
- **角色**: `admin`

⚠️ **重要**: 生产环境部署前请修改默认密码！

## 📝 数据库配置文件

### `.env` 文件
```env
# 数据库配置
DATABASE_URL="file:./dev.db"

# 服务器配置
PORT=5000
NODE_ENV=development

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d
```

## 🔄 切换到 PostgreSQL

如果需要在生产环境使用 PostgreSQL：

1. 修改 `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. 修改 `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/campsite_db?schema=public"
```

3. 运行迁移:
```bash
npx prisma migrate dev
```

## 📚 相关文档

- [Prisma 官方文档](https://www.prisma.io/docs)
- [SQLite 文档](https://www.sqlite.org/docs.html)
- [项目 PRD 文档](../PRD_PART2.md)

## 🛠️ 故障排除

### 问题：Prisma Client 未生成
**解决方案**: 运行 `npm run prisma:generate`

### 问题：数据库连接失败
**解决方案**: 检查 `.env` 文件中的 `DATABASE_URL` 配置

### 问题：迁移失败
**解决方案**:
1. 删除 `prisma/dev.db`
2. 删除 `prisma/migrations` 目录
3. 重新运行 `npm run prisma:migrate`

### 问题：需要重置数据库
**解决方案**: `npx prisma migrate reset` (会清空所有数据并重新运行种子脚本)

---

**创建日期**: 2026-01-09
**数据库版本**: v1.0 (init migration)
