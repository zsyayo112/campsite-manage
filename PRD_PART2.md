# 长白山营地旅游管理系统 - 产品需求文档 (Part 2)

> 📌 本文档是[Part 1](./PRD_PART1.md)的补充，包含完整的数据库Schema、开发规范、部署指南和附录。

---

## 16. 完整数据库Schema

### 16.1 Prisma Schema 文件

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // 开发环境
  // provider = "postgresql"  // 生产环境
  url      = env("DATABASE_URL")
}

// ==================== 用户认证 ====================

model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String   @map("password_hash")
  role         String   // admin, operator, driver, coach, marketer
  realName     String?  @map("real_name")
  phone        String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}

// ==================== 客户管理 ====================

model Customer {
  id             Int       @id @default(autoincrement())
  name           String
  phone          String    @unique
  wechat         String?
  source         String    // xiaohongshu, wechat, other
  tags           String?   // JSON array
  notes          String?
  firstVisitDate DateTime? @map("first_visit_date")
  lastVisitDate  DateTime? @map("last_visit_date")
  totalSpent     Decimal   @default(0) @map("total_spent") @db.Decimal(10, 2)
  visitCount     Int       @default(0) @map("visit_count")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  orders Order[]

  @@index([name])
  @@index([source])
  @@index([lastVisitDate])
  @@index([createdAt])
  @@map("customers")
}

// ==================== 住宿管理 ====================

model AccommodationPlace {
  id        Int      @id @default(autoincrement())
  name      String
  type      String   // self, external
  address   String?
  phone     String?
  distance  Decimal? @db.Decimal(5, 2)
  duration  Int?     // 分钟
  notes     String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  orders       Order[]
  shuttleStops ShuttleStop[]

  @@index([type])
  @@map("accommodation_places")
}

// ==================== 项目管理 ====================

model Project {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  price       Decimal   @db.Decimal(10, 2)
  unit        String    // per_person, per_group
  season      String?   // winter, summer, all
  duration    Int       // 分钟
  capacity    Int?      // 场地容量
  isActive    Boolean   @default(true) @map("is_active")
  sortOrder   Int       @default(0) @map("sort_order")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  orderItems     OrderItem[]
  packageItems   PackageItem[]
  dailySchedules DailySchedule[]

  @@index([season])
  @@index([isActive])
  @@map("projects")
}

// ==================== 套餐管理 ====================

model Package {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  minPeople   Int?     @map("min_people")
  isActive    Boolean  @default(true) @map("is_active")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  packageItems PackageItem[]
  orders       Order[]

  @@map("packages")
}

model PackageItem {
  id        Int      @id @default(autoincrement())
  packageId Int      @map("package_id")
  projectId Int      @map("project_id")
  createdAt DateTime @default(now()) @map("created_at")

  package Package @relation(fields: [packageId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id])

  @@index([packageId])
  @@index([projectId])
  @@map("package_items")
}

// ==================== 订单管理 ====================

model Order {
  id                   Int       @id @default(autoincrement())
  orderNumber          String    @unique @map("order_number")
  customerId           Int       @map("customer_id")
  accommodationPlaceId Int       @map("accommodation_place_id")
  roomNumber           String?   @map("room_number")
  packageId            Int?      @map("package_id")
  orderDate            DateTime  @map("order_date")
  visitDate            DateTime  @map("visit_date")
  peopleCount          Int       @map("people_count")
  totalAmount          Decimal   @map("total_amount") @db.Decimal(10, 2)
  status               String    // pending, confirmed, completed, cancelled
  paymentStatus        String    @map("payment_status") // unpaid, paid, refunded
  notes                String?
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  customer           Customer           @relation(fields: [customerId], references: [id])
  accommodationPlace AccommodationPlace @relation(fields: [accommodationPlaceId], references: [id])
  package            Package?           @relation(fields: [packageId], references: [id])
  orderItems         OrderItem[]

  @@index([customerId])
  @@index([accommodationPlaceId])
  @@index([packageId])
  @@index([orderDate])
  @@index([visitDate])
  @@index([status])
  @@index([paymentStatus])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id                 Int       @id @default(autoincrement())
  orderId            Int       @map("order_id")
  projectId          Int       @map("project_id")
  quantity           Int
  unitPrice          Decimal   @map("unit_price") @db.Decimal(10, 2)
  subtotal           Decimal   @db.Decimal(10, 2)
  scheduledTimeStart DateTime? @map("scheduled_time_start")
  scheduledTimeEnd   DateTime? @map("scheduled_time_end")
  coachId            Int?      @map("coach_id")
  createdAt          DateTime  @default(now()) @map("created_at")

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id])
  coach   Coach?  @relation(fields: [coachId], references: [id])

  @@index([orderId])
  @@index([projectId])
  @@index([coachId])
  @@map("order_items")
}

// ==================== 接送调度 ====================

model Vehicle {
  id          Int      @id @default(autoincrement())
  plateNumber String   @unique @map("plate_number")
  vehicleType String   @map("vehicle_type") // 大巴, 中巴, 商务车
  seats       Int
  status      String   // available, maintenance, assigned
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  shuttleSchedules ShuttleSchedule[]

  @@map("vehicles")
}

model Driver {
  id        Int      @id @default(autoincrement())
  userId    Int?     @map("user_id")
  name      String
  phone     String
  status    String   // on_duty, off_duty
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  shuttleSchedules ShuttleSchedule[]

  @@map("drivers")
}

model ShuttleSchedule {
  id            Int       @id @default(autoincrement())
  date          DateTime
  batchName     String    @map("batch_name")
  vehicleId     Int       @map("vehicle_id")
  driverId      Int       @map("driver_id")
  departureTime DateTime  @map("departure_time")
  returnTime    DateTime? @map("return_time")
  status        String    // pending, in_progress, completed
  notes         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  vehicle      Vehicle       @relation(fields: [vehicleId], references: [id])
  driver       Driver        @relation(fields: [driverId], references: [id])
  shuttleStops ShuttleStop[]

  @@index([date])
  @@index([vehicleId])
  @@index([driverId])
  @@map("shuttle_schedules")
}

model ShuttleStop {
  id                   Int      @id @default(autoincrement())
  scheduleId           Int      @map("schedule_id")
  accommodationPlaceId Int      @map("accommodation_place_id")
  stopOrder            Int      @map("stop_order")
  passengerCount       Int      @map("passenger_count")
  createdAt            DateTime @default(now()) @map("created_at")

  schedule           ShuttleSchedule    @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  accommodationPlace AccommodationPlace @relation(fields: [accommodationPlaceId], references: [id])

  @@index([scheduleId])
  @@index([accommodationPlaceId])
  @@map("shuttle_stops")
}

// ==================== 行程排期 ====================

model Coach {
  id          Int      @id @default(autoincrement())
  userId      Int?     @map("user_id")
  name        String
  phone       String
  specialties String?  // JSON array
  status      String   // on_duty, off_duty
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  orderItems     OrderItem[]
  dailySchedules DailySchedule[]

  @@map("coaches")
}

model DailySchedule {
  id               Int       @id @default(autoincrement())
  date             DateTime
  orderItemId      Int       @map("order_item_id")
  projectId        Int       @map("project_id")
  startTime        DateTime  @map("start_time")
  endTime          DateTime  @map("end_time")
  coachId          Int?      @map("coach_id")
  participantCount Int       @map("participant_count")
  status           String    // scheduled, in_progress, completed
  notes            String?
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id])
  coach   Coach?  @relation(fields: [coachId], references: [id])

  @@index([date])
  @@index([projectId])
  @@index([coachId])
  @@map("daily_schedules")
}

// ==================== 内容管理 ====================

model XiaohongshuNote {
  id             Int       @id @default(autoincrement())
  title          String
  content        String
  status         String    // draft, published, deleted
  publishDate    DateTime? @map("publish_date")
  views          Int       @default(0)
  likes          Int       @default(0)
  comments       Int       @default(0)
  collects       Int       @default(0)
  tags           String?   // JSON array
  images         String?   // JSON array
  xiaohongshuUrl String?   @map("xiaohongshu_url")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([status])
  @@index([publishDate])
  @@index([createdAt])
  @@map("xiaohongshu_notes")
}
```

### 16.2 初始化数据SQL

```sql
-- 初始化用户
INSERT INTO users (username, password_hash, role, real_name, created_at, updated_at)
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'admin', '系统管理员', datetime('now'), datetime('now'));

-- 初始化住宿地点
INSERT INTO accommodation_places (name, type, address, distance, duration, is_active, created_at, updated_at)
VALUES
  ('营地自营宾馆', 'self', '长白山景区内', 0, 0, 1, datetime('now'), datetime('now')),
  ('长白山国际度假村', 'external', '长白山景区南坡', 5, 15, 1, datetime('now'), datetime('now')),
  ('二道白河镇中心酒店区', 'external', '二道白河镇中心街', 8, 20, 1, datetime('now'), datetime('now')),
  ('万达度假区', 'external', '长白山万达度假区', 12, 30, 1, datetime('now'), datetime('now'));

-- 初始化项目
INSERT INTO projects (name, description, price, unit, season, duration, capacity, is_active, sort_order, created_at, updated_at)
VALUES
  ('石板烧烤', '长白山特色石板烤肉', 98, 'per_person', 'all', 120, 50, 1, 1, datetime('now'), datetime('now')),
  ('雪上滑梯乐园', '多条滑道，适合全家', 68, 'per_person', 'winter', 90, NULL, 1, 2, datetime('now'), datetime('now')),
  ('冰钓体验', '专业教练指导，提供工具', 128, 'per_person', 'winter', 120, 30, 1, 3, datetime('now'), datetime('now')),
  ('冬日丛林穿越', '探索雪中森林，观赏雾凇', 88, 'per_person', 'winter', 60, 30, 1, 4, datetime('now'), datetime('now')),
  ('烤棉花糖', '篝火旁互动，温馨体验', 20, 'per_person', 'all', 30, NULL, 1, 5, datetime('now'), datetime('now')),
  ('烤地瓜', '冬日传统美食', 15, 'per_person', 'all', 30, NULL, 1, 6, datetime('now'), datetime('now'));

-- 初始化套餐
INSERT INTO packages (name, description, price, min_people, is_active, sort_order, created_at, updated_at)
VALUES
  ('单项体验', '任选1个项目', 98, 1, 1, 1, datetime('now'), datetime('now')),
  ('双项套餐', '任选2个项目', 168, 1, 1, 2, datetime('now'), datetime('now')),
  ('冰雪乐园套餐', '冰钓+雪上滑梯+烤棉花糖', 228, 1, 1, 3, datetime('now'), datetime('now')),
  ('美食体验套餐', '石板烧烤+烤地瓜+烤棉花糖', 198, 1, 1, 4, datetime('now'), datetime('now')),
  ('全景套餐', '全部6个项目', 358, 1, 1, 5, datetime('now'), datetime('now')),
  ('团队定制', '根据需求定制', 0, 10, 1, 6, datetime('now'), datetime('now'));

-- 冰雪乐园套餐项目关联
INSERT INTO package_items (package_id, project_id, created_at)
VALUES (3, 3, datetime('now')), (3, 2, datetime('now')), (3, 5, datetime('now'));

-- 美食体验套餐项目关联
INSERT INTO package_items (package_id, project_id, created_at)
VALUES (4, 1, datetime('now')), (4, 6, datetime('now')), (4, 5, datetime('now'));
```

---

## 17. 开发规范

### 17.1 代码规范

**命名规范**
```javascript
// 组件 - PascalCase
const CustomerList = () => {}
const OrderDetailPage = () => {}

// 函数 - camelCase
function calculateTotalAmount() {}
const fetchCustomerData = async () => {}

// 常量 - UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:3000'
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024

// 变量 - camelCase
const customerName = 'Zhang San'
let orderStatus = 'pending'
```

**Git提交规范**
```bash
feat: 添加客户管理列表页面
fix: 修复订单金额计算错误
docs: 更新README文档
style: 格式化代码
refactor: 重构订单创建逻辑
test: 添加客户管理单元测试
chore: 更新依赖包
```

### 17.2 API设计规范

**请求响应格式**
```javascript
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "手机号格式不正确",
    "details": { ... }
  }
}

// 列表响应
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 17.3 测试规范

**测试覆盖目标**
- 单元测试：核心业务逻辑 > 80%
- 集成测试：API接口 > 70%
- E2E测试：关键用户路径 100%

---

## 18. 部署指南

### 18.1 服务器配置

**推荐配置**
- CPU: 2核
- 内存: 4GB
- 硬盘: 50GB SSD
- 带宽: 5Mbps
- 操作系统: Ubuntu 20.04 LTS

### 18.2 部署步骤

```bash
# 1. 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装Nginx
sudo apt-get install nginx

# 3. 安装PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 4. 安装PM2
sudo npm install -g pm2

# 5. 克隆代码
git clone <your-repo>
cd camp-management-system

# 6. 配置环境变量
cp backend/.env.example backend/.env
# 编辑.env文件

# 7. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 8. 数据库迁移
cd backend
npx prisma migrate deploy

# 9. 构建前端
cd ../frontend
npm run build

# 10. 启动应用
cd ../backend
pm2 start npm --name "camp-api" -- start
pm2 save
pm2 startup

# 11. 配置Nginx
sudo nano /etc/nginx/sites-available/camp
# 添加配置后
sudo ln -s /etc/nginx/sites-available/camp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 12. 配置SSL (Let's Encrypt)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 18.3 Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 18.4 备份脚本

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
DB_NAME="camp_db"

# 备份数据库
pg_dump $DB_NAME > "$BACKUP_DIR/db_$DATE.sql"

# 压缩
gzip "$BACKUP_DIR/db_$DATE.sql"

# 删除30天前的备份
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

**设置定时任务**
```bash
# 每天凌晨2点自动备份
crontab -e
0 2 * * * /path/to/backup.sh >> /var/log/camp-backup.log 2>&1
```

---

## 19. 常见问题FAQ

**Q1: 数据库选SQLite还是PostgreSQL?**
A: 开发环境用SQLite简单快速，生产环境建议PostgreSQL以获得更好的性能和并发支持。

**Q2: 如何处理图片上传?**
A: 小图片(<1MB)可以base64存数据库，大图片建议存服务器文件系统或OSS，数据库只存路径。

**Q3: 接送调度的智能推荐如何实现?**
A: Phase 1先实现手动调度，Phase 2再根据距离、容量等因素实现简单的贪心算法推荐。

**Q4: 行程排期的时间轴怎么做?**
A: 使用React + CSS Grid实现，横轴是时间(8:00-18:00)，纵轴是项目，每个活动是一个色块。

**Q5: 移动端是原生App还是小程序?**
A: 优先考虑H5适配，让司机/教练通过浏览器访问。后期可用Taro开发一次编译多端(微信小程序+H5)。

**Q6: 系统能支持多少并发?**
A: 目前设计支持10个并发用户，足够中小营地使用。如需扩展可以加Redis缓存、负载均衡等。

---

## 20. 附录

### 20.1 长白山旅游资源

**核心景点**
- 🏔️ 长白山天池：海拔2189m，中朝界湖
- 💧 长白瀑布：落差68m
- ♨️ 温泉群：地热温泉，可煮温泉蛋
- ❄️ 雾凇奇观：冬季树挂冰花

**最佳旅游时间**
- 冬季(12-3月): 滑雪、冰钓、雾凇 ⭐推荐
- 春季(4-5月): 徒步、赏花
- 夏季(6-8月): 避暑、森林探索
- 秋季(9-11月): 赏红叶、摄影

### 20.2 参考资料

**技术文档**
- React: https://react.dev/
- Tailwind: https://tailwindcss.com/
- Prisma: https://www.prisma.io/
- Express: https://expressjs.com/

**设计资源**
- Ant Design: https://ant.design/
- Shadcn UI: https://ui.shadcn.com/
- Heroicons: https://heroicons.com/

### 20.3 术语对照表

| 中文 | 英文 | 说明 |
|------|------|------|
| 自营宾馆 | Self-operated Hotel | 营地自己经营的住宿 |
| 外部住宿 | External Accommodation | 小镇其他酒店 |
| 接送批次 | Shuttle Batch | 按时间分组的接送计划 |
| 套餐 | Package | 多项目组合优惠 |
| 行程排期 | Schedule | 项目时间安排 |
| 场地容量 | Capacity | 最大接待人数 |
| 游学团队 | Study Tour Group | 学校研学旅行 |

---

## 📋 检查清单

### 开发前检查

- [ ] 阅读完整PRD文档
- [ ] 理解业务场景
- [ ] 熟悉技术栈
- [ ] 搭建开发环境
- [ ] 准备测试数据

### 开发中检查

- [ ] 代码符合规范
- [ ] 添加必要注释
- [ ] 完成单元测试
- [ ] Git提交规范
- [ ] 定期推送代码

### 部署前检查

- [ ] 所有功能测试通过
- [ ] 性能达标
- [ ] 安全检查完成
- [ ] 数据备份就绪
- [ ] 文档更新完整

---

## 🎉 结语

这是一份详尽的产品需求文档，涵盖了营地管理系统的方方面面。

**开发建议**
1. 📖 先通读文档，理解整体架构
2. 🎯 按优先级逐模块开发
3. ✅ 每完成一个功能点就打勾
4. 🔄 定期回顾和更新进度
5. 💬 遇到问题及时沟通

**记住**
- 代码质量 > 开发速度
- 用户体验 > 功能堆砌
- 持续迭代 > 一次完美

**祝开发顺利！🚀**

---

**返回**: [Part 1: 核心功能需求](./PRD_PART1.md)

**文档状态**: ✅ 已完成 | 📅 最后更新: 2026-01-09
