# 数据库设计文档

## 数据库选择

- **开发环境**: SQLite（轻量、无需安装、适合单机）
- **生产环境**: PostgreSQL（可选，性能更好、功能更强）

---

## ER 图（实体关系图）

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Customer   │────┬───>│    Order     │<───┬────│   Project    │
│  (客户表)    │    │    │  (订单表)    │    │    │  (项目表)    │
└──────────────┘    │    └──────────────┘    │    └──────────────┘
                    │            │            │
                    │            │            │
                    │            v            │
                    │    ┌──────────────┐    │
                    └───>│  OrderItem   │<───┘
                         │ (订单项表)   │
                         └──────────────┘

┌──────────────┐         ┌──────────────┐
│     User     │         │XiaohongshuNote│
│  (用户表)    │         │(小红书笔记表) │
└──────────────┘         └──────────────┘
```

---

## 数据表设计

### 1. users（用户表）

管理后台登录用户

| 字段名 | 类型 | 长度 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|------|
| id | INT | - | √ | PRIMARY | 用户ID（自增） |
| username | VARCHAR | 50 | √ | UNIQUE | 用户名 |
| password_hash | VARCHAR | 255 | √ | - | 密码哈希值 |
| role | VARCHAR | 20 | √ | - | 角色（admin/staff） |
| created_at | DATETIME | - | √ | - | 创建时间 |
| updated_at | DATETIME | - | √ | - | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE (username)

---

### 2. customers（客户表）

存储客户基本信息

| 字段名 | 类型 | 长度 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|------|
| id | INT | - | √ | PRIMARY | 客户ID（自增） |
| name | VARCHAR | 50 | √ | INDEX | 客户姓名 |
| phone | VARCHAR | 20 | √ | UNIQUE | 手机号码 |
| wechat | VARCHAR | 50 | × | - | 微信号 |
| source | VARCHAR | 20 | √ | INDEX | 客户来源（xiaohongshu/wechat/other） |
| tags | TEXT | - | × | - | 标签（JSON数组格式） |
| notes | TEXT | - | × | - | 备注信息 |
| first_visit_date | DATE | - | × | - | 首次访问日期 |
| last_visit_date | DATE | - | × | INDEX | 最后访问日期 |
| total_spent | DECIMAL | 10,2 | √ | - | 总消费金额 |
| visit_count | INT | - | √ | - | 访问次数 |
| created_at | DATETIME | - | √ | INDEX | 创建时间 |
| updated_at | DATETIME | - | √ | - | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE (phone)
- INDEX (name)
- INDEX (source)
- INDEX (last_visit_date)
- INDEX (created_at)

**示例数据**:
```json
{
  "id": 1,
  "name": "张三",
  "phone": "13800138000",
  "wechat": "zhangsan_wx",
  "source": "xiaohongshu",
  "tags": ["VIP", "复购客户", "喜欢冰钓"],
  "notes": "对冰钓项目特别感兴趣，建议冬季发送优惠信息",
  "first_visit_date": "2025-12-01",
  "last_visit_date": "2026-01-05",
  "total_spent": 1280.00,
  "visit_count": 3,
  "created_at": "2025-12-01 10:30:00",
  "updated_at": "2026-01-05 15:20:00"
}
```

---

### 3. projects（项目表）

营地提供的各种活动项目

| 字段名 | 类型 | 长度 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|------|
| id | INT | - | √ | PRIMARY | 项目ID（自增） |
| name | VARCHAR | 100 | √ | - | 项目名称 |
| description | TEXT | - | × | - | 项目描述 |
| price | DECIMAL | 10,2 | √ | - | 基础价格 |
| unit | VARCHAR | 20 | √ | - | 计价单位（per_person/per_group） |
| season | VARCHAR | 20 | × | INDEX | 适用季节（winter/summer/all） |
| is_active | BOOLEAN | - | √ | INDEX | 是否启用 |
| sort_order | INT | - | √ | - | 排序顺序 |
| created_at | DATETIME | - | √ | - | 创建时间 |
| updated_at | DATETIME | - | √ | - | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- INDEX (season)
- INDEX (is_active)

**示例数据**:
```json
[
  {
    "id": 1,
    "name": "冰钓体验",
    "description": "专业教练指导，提供冰钓工具和热饮",
    "price": 198.00,
    "unit": "per_person",
    "season": "winter",
    "is_active": true,
    "sort_order": 1
  },
  {
    "id": 2,
    "name": "野餐套餐",
    "description": "包含野餐垫、食物篮、饮料等",
    "price": 299.00,
    "unit": "per_group",
    "season": "all",
    "is_active": true,
    "sort_order": 2
  },
  {
    "id": 3,
    "name": "叫花鸡制作",
    "description": "亲手制作传统叫花鸡，体验野外烹饪乐趣",
    "price": 128.00,
    "unit": "per_person",
    "season": "all",
    "is_active": true,
    "sort_order": 3
  }
]
```

---

### 4. orders（订单表）

客户订单主表

| 字段名 | 类型 | 长度 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|------|
| id | INT | - | √ | PRIMARY | 订单ID（自增） |
| order_number | VARCHAR | 30 | √ | UNIQUE | 订单号（自动生成） |
| customer_id | INT | - | √ | INDEX | 客户ID（外键） |
| order_date | DATETIME | - | √ | INDEX | 下单日期 |
| visit_date | DATE | - | √ | INDEX | 到访日期 |
| people_count | INT | - | √ | - | 人数 |
| total_amount | DECIMAL | 10,2 | √ | - | 订单总金额 |
| status | VARCHAR | 20 | √ | INDEX | 订单状态 |
| payment_status | VARCHAR | 20 | √ | INDEX | 支付状态 |
| notes | TEXT | - | × | - | 订单备注 |
| created_at | DATETIME | - | √ | INDEX | 创建时间 |
| updated_at | DATETIME | - | √ | - | 更新时间 |

**订单状态枚举值**:
- `pending` - 待确认
- `confirmed` - 已确认
- `completed` - 已完成
- `cancelled` - 已取消

**支付状态枚举值**:
- `unpaid` - 未支付
- `paid` - 已支付
- `refunded` - 已退款

**索引**:
- PRIMARY KEY (id)
- UNIQUE (order_number)
- FOREIGN KEY (customer_id) REFERENCES customers(id)
- INDEX (customer_id)
- INDEX (order_date)
- INDEX (visit_date)
- INDEX (status)
- INDEX (payment_status)
- INDEX (created_at)

**订单号生成规则**:
- 格式: `ORD{YYYYMMDD}{序号}`
- 示例: `ORD202601090001`

**示例数据**:
```json
{
  "id": 1,
  "order_number": "ORD202601050001",
  "customer_id": 1,
  "order_date": "2026-01-05 14:30:00",
  "visit_date": "2026-01-10",
  "people_count": 4,
  "total_amount": 980.00,
  "status": "confirmed",
  "payment_status": "paid",
  "notes": "客户要求安排靠近湖边的位置",
  "created_at": "2026-01-05 14:30:00",
  "updated_at": "2026-01-05 15:00:00"
}
```

---

### 5. order_items（订单项目表）

订单包含的具体项目

| 字段名 | 类型 | 长度 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|------|
| id | INT | - | √ | PRIMARY | 订单项ID（自增） |
| order_id | INT | - | √ | INDEX | 订单ID（外键） |
| project_id | INT | - | √ | INDEX | 项目ID（外键） |
| quantity | INT | - | √ | - | 数量 |
| unit_price | DECIMAL | 10,2 | √ | - | 单价（记录当时价格） |
| subtotal | DECIMAL | 10,2 | √ | - | 小计金额 |
| created_at | DATETIME | - | √ | - | 创建时间 |

**索引**:
- PRIMARY KEY (id)
- FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
- FOREIGN KEY (project_id) REFERENCES projects(id)
- INDEX (order_id)
- INDEX (project_id)

**示例数据**:
```json
[
  {
    "id": 1,
    "order_id": 1,
    "project_id": 1,
    "quantity": 4,
    "unit_price": 198.00,
    "subtotal": 792.00
  },
  {
    "id": 2,
    "order_id": 1,
    "project_id": 3,
    "quantity": 2,
    "unit_price": 128.00,
    "subtotal": 256.00
  }
]
```

---

### 6. xiaohongshu_notes（小红书笔记表）

小红书内容管理

| 字段名 | 类型 | 长度 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|------|
| id | INT | - | √ | PRIMARY | 笔记ID（自增） |
| title | VARCHAR | 200 | √ | - | 笔记标题 |
| content | TEXT | - | √ | - | 笔记内容 |
| status | VARCHAR | 20 | √ | INDEX | 状态（draft/published/deleted） |
| publish_date | DATE | - | × | INDEX | 发布日期 |
| views | INT | - | √ | - | 浏览量 |
| likes | INT | - | √ | - | 点赞数 |
| comments | INT | - | √ | - | 评论数 |
| collects | INT | - | √ | - | 收藏数 |
| tags | TEXT | - | × | - | 标签（JSON数组） |
| images | TEXT | - | × | - | 图片URL（JSON数组） |
| xiaohongshu_url | VARCHAR | 500 | × | - | 小红书链接 |
| created_at | DATETIME | - | √ | INDEX | 创建时间 |
| updated_at | DATETIME | - | √ | - | 更新时间 |

**状态枚举值**:
- `draft` - 草稿
- `published` - 已发布
- `deleted` - 已删除

**索引**:
- PRIMARY KEY (id)
- INDEX (status)
- INDEX (publish_date)
- INDEX (created_at)

**示例数据**:
```json
{
  "id": 1,
  "title": "冬日营地｜冰钓+叫花鸡，带你体验不一样的冬天🎣",
  "content": "今天要给大家分享一个超棒的冬季营地体验...",
  "status": "published",
  "publish_date": "2026-01-05",
  "views": 2580,
  "likes": 356,
  "comments": 42,
  "collects": 198,
  "tags": ["冰钓", "野餐", "户外体验", "家庭出游"],
  "images": [
    "/uploads/notes/2026/01/img1.jpg",
    "/uploads/notes/2026/01/img2.jpg"
  ],
  "xiaohongshu_url": "https://www.xiaohongshu.com/explore/xxxxx",
  "created_at": "2026-01-04 10:00:00",
  "updated_at": "2026-01-08 09:30:00"
}
```

---

## Prisma Schema 文件

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // 开发环境使用 sqlite，生产可改为 postgresql
  url      = env("DATABASE_URL")
}

model User {
  id            Int      @id @default(autoincrement())
  username      String   @unique
  passwordHash  String   @map("password_hash")
  role          String   @default("admin")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Customer {
  id              Int       @id @default(autoincrement())
  name            String
  phone           String    @unique
  wechat          String?
  source          String    // xiaohongshu, wechat, other
  tags            String?   // JSON array
  notes           String?
  firstVisitDate  DateTime? @map("first_visit_date")
  lastVisitDate   DateTime? @map("last_visit_date")
  totalSpent      Decimal   @default(0) @map("total_spent") @db.Decimal(10, 2)
  visitCount      Int       @default(0) @map("visit_count")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  orders Order[]

  @@index([name])
  @@index([source])
  @@index([lastVisitDate])
  @@index([createdAt])
  @@map("customers")
}

model Project {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  price       Decimal   @db.Decimal(10, 2)
  unit        String    // per_person, per_group
  season      String?   // winter, summer, all
  isActive    Boolean   @default(true) @map("is_active")
  sortOrder   Int       @default(0) @map("sort_order")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  orderItems OrderItem[]

  @@index([season])
  @@index([isActive])
  @@map("projects")
}

model Order {
  id            Int         @id @default(autoincrement())
  orderNumber   String      @unique @map("order_number")
  customerId    Int         @map("customer_id")
  orderDate     DateTime    @map("order_date")
  visitDate     DateTime    @map("visit_date")
  peopleCount   Int         @map("people_count")
  totalAmount   Decimal     @map("total_amount") @db.Decimal(10, 2)
  status        String      // pending, confirmed, completed, cancelled
  paymentStatus String      @map("payment_status") // unpaid, paid, refunded
  notes         String?
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  customer   Customer    @relation(fields: [customerId], references: [id])
  orderItems OrderItem[]

  @@index([customerId])
  @@index([orderDate])
  @@index([visitDate])
  @@index([status])
  @@index([paymentStatus])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id        Int      @id @default(autoincrement())
  orderId   Int      @map("order_id")
  projectId Int      @map("project_id")
  quantity  Int
  unitPrice Decimal  @map("unit_price") @db.Decimal(10, 2)
  subtotal  Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now()) @map("created_at")

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id])

  @@index([orderId])
  @@index([projectId])
  @@map("order_items")
}

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

---

## 数据库初始化 SQL

```sql
-- 插入默认管理员用户（密码: admin123，需要加密后再插入）
INSERT INTO users (username, password_hash, role, created_at, updated_at)
VALUES ('admin', '$2b$10$...', 'admin', datetime('now'), datetime('now'));

-- 插入初始项目数据
INSERT INTO projects (name, description, price, unit, season, is_active, sort_order, created_at, updated_at)
VALUES
  ('冰钓体验', '专业教练指导，提供冰钓工具和热饮', 198.00, 'per_person', 'winter', 1, 1, datetime('now'), datetime('now')),
  ('野餐套餐', '包含野餐垫、食物篮、饮料等', 299.00, 'per_group', 'all', 1, 2, datetime('now'), datetime('now')),
  ('叫花鸡制作', '亲手制作传统叫花鸡，体验野外烹饪乐趣', 128.00, 'per_person', 'all', 1, 3, datetime('now'), datetime('now')),
  ('玩雪体验', '堆雪人、打雪仗、滑雪圈等多种雪地游戏', 98.00, 'per_person', 'winter', 1, 4, datetime('now'), datetime('now')),
  ('森林探索', '专业向导带领，认识植物、观察动物', 158.00, 'per_person', 'summer', 1, 5, datetime('now'), datetime('now'));
```

---

## 数据库迁移命令

```bash
# 初始化 Prisma
npx prisma init

# 生成迁移文件
npx prisma migrate dev --name init

# 应用迁移
npx prisma migrate deploy

# 生成 Prisma Client
npx prisma generate

# 打开 Prisma Studio（数据库可视化工具）
npx prisma studio
```

---

## 数据库优化建议

### 索引优化
1. 高频查询字段添加索引（如 customer.name, order.visitDate）
2. 外键字段添加索引
3. 避免过多索引影响写入性能

### 查询优化
1. 使用 JOIN 代替多次查询
2. 使用分页减少数据量
3. 适当使用缓存

### 数据归档
1. 定期归档历史订单（如1年前的订单）
2. 保留统计数据的汇总表

---

**创建日期**: 2026-01-09  
**最后更新**: 2026-01-09
