# 数据迁移指南：从旧系统迁移到新营地管理系统

> 本文档指导如何将原有 SQL Server 数据库的数据迁移到新的营地管理系统。

---

## 目录

1. [数据库结构对比](#1-数据库结构对比)
2. [迁移前准备](#2-迁移前准备)
3. [数据映射关系](#3-数据映射关系)
4. [迁移步骤](#4-迁移步骤)
5. [迁移脚本](#5-迁移脚本)
6. [数据验证](#6-数据验证)
7. [常见问题](#7-常见问题)

---

## 1. 数据库结构对比

### 1.1 旧系统数据库信息

| 项目 | 值 |
|------|-----|
| 数据库类型 | SQL Server |
| 服务器地址 | 43.138.38.143:1433 |
| 数据库名 | zclyingdi |
| 用户名 | sa |

### 1.2 表结构对照

| 旧系统表 | 新系统表 | 迁移说明 |
|---------|---------|---------|
| table_kehu | customers | 客户信息，字段需映射 |
| table_dingdan | bookings + orders | 订单拆分为预约和正式订单 |
| table_sysuser | users | 系统用户 |
| table_xianlu | packages | 线路→套餐 |
| table_changyongxuanxiang | site_configs | 下拉选项→系统配置 |
| 日汇总表 | 通过查询生成 | 不迁移，新系统自动统计 |

---

## 2. 迁移前准备

### 2.1 备份旧数据库

```sql
-- 在 SQL Server 中执行完整备份
BACKUP DATABASE zclyingdi
TO DISK = 'D:\backup\zclyingdi_backup.bak'
WITH FORMAT, INIT, NAME = 'Full Backup';
```

### 2.2 导出数据为 CSV

使用 SQL Server Management Studio 或命令行导出：

```sql
-- 导出客户表
SELECT * FROM table_kehu;

-- 导出订单表
SELECT * FROM table_dingdan;

-- 导出线路表
SELECT * FROM table_xianlu;

-- 导出系统用户
SELECT * FROM table_sysuser;
```

**推荐工具**：
- SQL Server Management Studio (SSMS) → 右键表 → 导出数据
- DBeaver（免费跨平台工具）
- 或使用下方 Node.js 脚本直接连接迁移

### 2.3 安装必要依赖

在服务器上的新系统目录执行：

```bash
cd /var/www/campsite/backend
npm install mssql --save-dev
```

---

## 3. 数据映射关系

### 3.1 客户表映射 (table_kehu → customers)

| 旧字段 | 新字段 | 转换规则 |
|-------|-------|---------|
| idkehu | id | 保持原ID |
| 姓名 | name | 直接映射 |
| 手机 | phone | 直接映射 |
| 备用手机 | - | 存入 notes |
| 类别 | tags | 转为 JSON 数组 |
| 渠道 | source | 映射到预设值 |
| 性别 | - | 存入 notes |
| 登录用户 | - | 不迁移（新系统不需要） |
| 登录密码 | - | 不迁移 |
| 备注 | notes | 合并备用手机、性别等 |
| 添加时间 | createdAt | 直接映射 |
| 人数备注 | notes | 合并到备注 |
| 季节 | tags | 合并到标签 |
| 需求类别 | tags | 合并到标签 |

**渠道映射规则**：
```javascript
const sourceMapping = {
  '小红书': 'xiaohongshu',
  '微信': 'wechat',
  '抖音': 'douyin',
  '朋友介绍': 'referral',
  '携程': 'ctrip',
  '美团': 'meituan',
  '': 'other',
  default: 'other'
};
```

### 3.2 订单表映射 (table_dingdan → bookings)

| 旧字段 | 新字段 | 转换规则 |
|-------|-------|---------|
| iddingdan | id | 保持原ID |
| 日期 | visitDate | 直接映射 |
| idkehu | customerId | 外键关联 |
| 姓名 | customerName | 直接映射 |
| 手机 | customerPhone | 直接映射 |
| 组别 | - | 存入 operatorNotes |
| 酒店 | hotelName | 直接映射 |
| 产品 | packageName | 直接映射 |
| 状态 | status | 状态映射 |
| 单价 | unitPrice | 直接映射 |
| 人数 | peopleCount / adultCount | 直接映射 |
| 总金额 | totalAmount | 直接映射 |
| 定金 | depositAmount | 直接映射 |
| 收款日期 | depositPaidAt | 直接映射 |
| 收款人 | depositCollector | 直接映射 |
| 添加时间 | createdAt | 直接映射 |
| 备注 | customerNotes | 直接映射 |
| 特别备注 | operatorNotes | 合并 |
| 欠款 | - | 新系统自动计算 |
| 已收尾款 | - | 需要转换逻辑 |

**状态映射规则**：
```javascript
const statusMapping = {
  '已确认': 'confirmed',
  '已完成': 'completed',
  '已取消': 'cancelled',
  '待确认': 'pending',
  '未确认': 'pending',
  '': 'pending',
  default: 'pending'
};
```

### 3.3 线路表映射 (table_xianlu → packages)

| 旧字段 | 新字段 | 转换规则 |
|-------|-------|---------|
| ID线路 | id | 保持原ID |
| 线路名称 | name | 直接映射 |
| 天数 | duration | 转为分钟（天数×480） |
| 门市价 | originalPrice | 直接映射 |
| 协议价 | price | 直接映射 |
| 团队价 | - | 存入 specialPricing JSON |
| 线路概述 | description | 直接映射 |
| 季节 | - | 存入 highlights |
| 备注 | longDescription | 直接映射 |

### 3.4 系统用户映射 (table_sysuser → users)

| 旧字段 | 新字段 | 转换规则 |
|-------|-------|---------|
| name | realName | 直接映射 |
| 用户名 | username | 直接映射 |
| password | passwordHash | 需要加密处理 |
| type | role | 角色映射 |
| 手机 | phone | 直接映射 |
| 岗位 | role | 合并考虑 |

**角色映射**：
```javascript
const roleMapping = {
  1: 'admin',      // 管理员
  2: 'operator',   // 操作员
  3: 'driver',     // 司机
  4: 'coach',      // 教练
  default: 'operator'
};
```

---

## 4. 迁移步骤

### 步骤 1：导出旧数据

```bash
# 使用 Node.js 脚本连接 SQL Server 并导出
cd /var/www/campsite/backend
node scripts/migration/export-old-data.js
```

### 步骤 2：数据转换

```bash
# 转换数据格式
node scripts/migration/transform-data.js
```

### 步骤 3：导入新数据库

```bash
# 导入到新系统
node scripts/migration/import-new-data.js
```

### 步骤 4：数据验证

```bash
# 验证数据完整性
node scripts/migration/verify-migration.js
```

---

## 5. 迁移脚本

### 5.1 完整迁移脚本

在 `backend/scripts/migration/` 目录下创建以下文件：

**migrate-from-sqlserver.js**:

```javascript
/**
 * 数据迁移脚本：从 SQL Server 迁移到新系统
 *
 * 使用方法：
 * 1. 确保安装了 mssql: npm install mssql
 * 2. 配置下方的连接信息
 * 3. 运行: node scripts/migration/migrate-from-sqlserver.js
 */

const sql = require('mssql');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ========== 配置 ==========
const sqlServerConfig = {
  user: 'sa',
  password: '!Zcl5719233',
  server: '43.138.38.143',
  port: 1433,
  database: 'zclyingdi',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// ========== 映射规则 ==========
const sourceMapping = {
  '小红书': 'xiaohongshu',
  '微信': 'wechat',
  '抖音': 'douyin',
  '朋友介绍': 'referral',
  '携程': 'ctrip',
  '美团': 'meituan'
};

const statusMapping = {
  '已确认': 'confirmed',
  '已完成': 'completed',
  '已取消': 'cancelled',
  '待确认': 'pending',
  '未确认': 'pending'
};

// ========== 迁移函数 ==========

/**
 * 迁移客户数据
 */
async function migrateCustomers(pool) {
  console.log('\n📋 开始迁移客户数据...');

  const result = await pool.request().query('SELECT * FROM table_kehu');
  const customers = result.recordset;

  console.log(`   找到 ${customers.length} 条客户记录`);

  let success = 0;
  let failed = 0;

  for (const old of customers) {
    try {
      // 构建标签
      const tags = [];
      if (old.类别) tags.push(old.类别);
      if (old.季节) tags.push(old.季节);
      if (old.需求类别) tags.push(old.需求类别);

      // 构建备注
      const notes = [];
      if (old.备用手机) notes.push(`备用手机: ${old.备用手机}`);
      if (old.性别 !== null) notes.push(`性别: ${old.性别 ? '男' : '女'}`);
      if (old.人数备注) notes.push(`人数备注: ${old.人数备注}`);
      if (old.备注) notes.push(old.备注);

      // 检查手机号是否已存在
      const existing = await prisma.customer.findUnique({
        where: { phone: old.手机 || `unknown_${old.idkehu}` }
      });

      if (existing) {
        console.log(`   ⚠️ 跳过重复客户: ${old.姓名} (${old.手机})`);
        continue;
      }

      await prisma.customer.create({
        data: {
          name: old.姓名 || '未知',
          phone: old.手机 || `unknown_${old.idkehu}`,
          source: sourceMapping[old.渠道] || 'other',
          tags: tags.length > 0 ? JSON.stringify(tags) : null,
          notes: notes.length > 0 ? notes.join('\n') : null,
          createdAt: old.添加时间 || new Date(),
          updatedAt: new Date()
        }
      });
      success++;
    } catch (err) {
      console.error(`   ❌ 迁移失败: ${old.姓名} - ${err.message}`);
      failed++;
    }
  }

  console.log(`   ✅ 客户迁移完成: 成功 ${success}, 失败 ${failed}`);
  return { success, failed };
}

/**
 * 迁移套餐/线路数据
 */
async function migratePackages(pool) {
  console.log('\n📦 开始迁移套餐/线路数据...');

  const result = await pool.request().query('SELECT * FROM table_xianlu');
  const routes = result.recordset;

  console.log(`   找到 ${routes.length} 条线路记录`);

  let success = 0;
  let failed = 0;

  for (const old of routes) {
    try {
      // 解析天数为分钟
      const days = parseInt(old.天数) || 1;
      const duration = days * 480; // 假设每天8小时活动

      // 团队价存入特殊定价
      let specialPricing = null;
      if (old.团队价) {
        specialPricing = JSON.stringify({
          team: { price: parseFloat(old.团队价) || 0, label: '团队价' }
        });
      }

      await prisma.package.create({
        data: {
          name: old.线路名称 || '未命名线路',
          description: old.线路概述 || null,
          longDescription: old.备注 || null,
          price: parseFloat(old.协议价) || 0,
          originalPrice: parseFloat(old.门市价) || null,
          duration: duration,
          specialPricing: specialPricing,
          highlights: old.季节 ? JSON.stringify([`适合季节: ${old.季节}`]) : null,
          isActive: true,
          showInPublic: true,
          showInBookingForm: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      success++;
    } catch (err) {
      console.error(`   ❌ 迁移失败: ${old.线路名称} - ${err.message}`);
      failed++;
    }
  }

  console.log(`   ✅ 套餐迁移完成: 成功 ${success}, 失败 ${failed}`);
  return { success, failed };
}

/**
 * 迁移订单数据到预约表
 */
async function migrateOrders(pool) {
  console.log('\n📝 开始迁移订单数据...');

  const result = await pool.request().query(`
    SELECT d.*, k.手机 as 客户手机
    FROM table_dingdan d
    LEFT JOIN table_kehu k ON d.idkehu = k.idkehu
    ORDER BY d.日期 DESC
  `);
  const orders = result.recordset;

  console.log(`   找到 ${orders.length} 条订单记录`);

  let success = 0;
  let failed = 0;

  for (const old of orders) {
    try {
      // 生成预约编码
      const bookingCode = `BK${old.iddingdan.toString().padStart(8, '0')}`;

      // 查找关联客户
      let customerId = null;
      if (old.客户手机) {
        const customer = await prisma.customer.findUnique({
          where: { phone: old.客户手机 }
        });
        if (customer) customerId = customer.id;
      }

      // 构建操作备注
      const operatorNotes = [];
      if (old.组别) operatorNotes.push(`组别: ${old.组别}`);
      if (old.返时) operatorNotes.push(`返时: ${old.返时}`);
      if (old.车辆) operatorNotes.push(`车辆: ${old.车辆}`);
      if (old.收款方式) operatorNotes.push(`收款方式: ${old.收款方式}`);
      if (old.收款账户) operatorNotes.push(`收款账户: ${old.收款账户}`);
      if (old.特别备注) operatorNotes.push(`特别备注: ${old.特别备注}`);
      if (old.预订回执备注) operatorNotes.push(`回执备注: ${old.预订回执备注}`);
      if (old.添加人) operatorNotes.push(`添加人: ${old.添加人}`);
      if (old.收款人) operatorNotes.push(`收款人: ${old.收款人}`);

      // 检查是否已存在
      const existing = await prisma.booking.findUnique({
        where: { bookingCode }
      });

      if (existing) {
        console.log(`   ⚠️ 跳过重复订单: ${bookingCode}`);
        continue;
      }

      await prisma.booking.create({
        data: {
          bookingCode: bookingCode,
          customerName: old.姓名 || '未知',
          customerPhone: old.手机 || old.客户手机 || 'unknown',
          customerId: customerId,
          visitDate: old.日期 || new Date(),
          adultCount: old.人数 || 1,
          childCount: 0,
          peopleCount: old.人数 || 1,
          hotelName: old.酒店 || null,
          packageName: old.产品 || null,
          unitPrice: old.单价 || 0,
          childPrice: 0,
          totalAmount: old.总金额 || 0,
          depositAmount: old.定金 || 0,
          depositPaidAt: old.收款日期 || null,
          depositCollector: old.收款人 || null,
          status: statusMapping[old.状态] || 'pending',
          customerNotes: old.备注 || null,
          operatorNotes: operatorNotes.length > 0 ? operatorNotes.join('\n') : null,
          source: 'migration', // 标记为迁移数据
          createdAt: old.添加时间 || new Date(),
          updatedAt: new Date()
        }
      });
      success++;
    } catch (err) {
      console.error(`   ❌ 迁移失败: 订单${old.iddingdan} - ${err.message}`);
      failed++;
    }
  }

  console.log(`   ✅ 订单迁移完成: 成功 ${success}, 失败 ${failed}`);
  return { success, failed };
}

/**
 * 迁移系统用户
 */
async function migrateUsers(pool) {
  console.log('\n👥 开始迁移系统用户...');

  const result = await pool.request().query('SELECT * FROM table_sysuser');
  const users = result.recordset;

  console.log(`   找到 ${users.length} 条用户记录`);

  let success = 0;
  let failed = 0;

  for (const old of users) {
    try {
      const username = old.用户名 || old.name;
      if (!username) continue;

      // 检查用户名是否已存在
      const existing = await prisma.user.findUnique({
        where: { username }
      });

      if (existing) {
        console.log(`   ⚠️ 跳过已存在用户: ${username}`);
        continue;
      }

      // 角色映射
      let role = 'operator';
      if (old.type === 1 || old.岗位 === '管理员') role = 'admin';
      else if (old.岗位 === '司机') role = 'driver';
      else if (old.岗位 === '教练') role = 'coach';

      // 密码加密（如果原密码存在则使用，否则设置默认密码）
      const password = old.password || '123456';
      const passwordHash = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          username: username,
          passwordHash: passwordHash,
          role: role,
          realName: old.name || username,
          phone: old.手机 || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      success++;
      console.log(`   ✅ 用户 ${username} 创建成功 (密码: ${password})`);
    } catch (err) {
      console.error(`   ❌ 迁移失败: ${old.name} - ${err.message}`);
      failed++;
    }
  }

  console.log(`   ✅ 用户迁移完成: 成功 ${success}, 失败 ${failed}`);
  return { success, failed };
}

// ========== 主函数 ==========
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          数据迁移工具 - SQL Server → 新营地系统           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let pool;

  try {
    // 连接 SQL Server
    console.log('\n🔌 正在连接 SQL Server...');
    pool = await sql.connect(sqlServerConfig);
    console.log('   ✅ SQL Server 连接成功');

    // 测试连接
    const testResult = await pool.request().query('SELECT COUNT(*) as count FROM table_kehu');
    console.log(`   📊 旧数据库客户数量: ${testResult.recordset[0].count}`);

    // 开始迁移
    console.log('\n' + '='.repeat(60));
    console.log('                    开始数据迁移');
    console.log('='.repeat(60));

    const results = {
      customers: await migrateCustomers(pool),
      packages: await migratePackages(pool),
      orders: await migrateOrders(pool),
      users: await migrateUsers(pool)
    };

    // 汇总报告
    console.log('\n' + '='.repeat(60));
    console.log('                    迁移完成报告');
    console.log('='.repeat(60));
    console.log(`
    📋 客户数据:  成功 ${results.customers.success}, 失败 ${results.customers.failed}
    📦 套餐数据:  成功 ${results.packages.success}, 失败 ${results.packages.failed}
    📝 订单数据:  成功 ${results.orders.success}, 失败 ${results.orders.failed}
    👥 用户数据:  成功 ${results.users.success}, 失败 ${results.users.failed}
    `);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\n❌ 迁移过程出错:', err.message);
    console.error(err.stack);
  } finally {
    // 关闭连接
    if (pool) {
      await pool.close();
      console.log('\n🔌 SQL Server 连接已关闭');
    }
    await prisma.$disconnect();
    console.log('🔌 PostgreSQL 连接已关闭');
  }
}

// 运行迁移
main().catch(console.error);
```

### 5.2 创建脚本目录和安装依赖

```bash
# 在服务器上执行
cd /var/www/campsite/backend

# 创建迁移脚本目录
mkdir -p scripts/migration

# 将上述脚本保存到 scripts/migration/migrate-from-sqlserver.js

# 安装 SQL Server 连接驱动
npm install mssql --save-dev

# 运行迁移
node scripts/migration/migrate-from-sqlserver.js
```

---

## 6. 数据验证

### 6.1 迁移后检查

```bash
# 进入 PostgreSQL
sudo -u postgres psql -d campsite_db

# 检查各表数据量
SELECT 'customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'packages', COUNT(*) FROM packages
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'users', COUNT(*) FROM users;

# 检查客户数据示例
SELECT id, name, phone, source, created_at FROM customers LIMIT 10;

# 检查订单数据示例
SELECT booking_code, customer_name, visit_date, total_amount, status FROM bookings LIMIT 10;
```

### 6.2 数据一致性验证

```sql
-- 检查客户关联
SELECT
  b.booking_code,
  b.customer_name,
  b.customer_id,
  c.name as linked_customer_name
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
WHERE b.customer_id IS NOT NULL
LIMIT 20;

-- 检查金额汇总
SELECT
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  SUM(deposit_amount) as total_deposit
FROM bookings;
```

---

## 7. 常见问题

### Q1: 连接 SQL Server 失败？

**解决方案**：
1. 检查服务器防火墙是否开放 1433 端口
2. 确认 SQL Server 允许远程连接
3. 检查用户名密码是否正确

```bash
# 测试端口连通性
telnet 43.138.38.143 1433
# 或
nc -zv 43.138.38.143 1433
```

### Q2: 数据乱码？

**解决方案**：
在连接配置中添加字符集设置：

```javascript
const sqlServerConfig = {
  // ... 其他配置
  options: {
    // ... 其他选项
    useUTC: false,
    charset: 'utf8'
  }
};
```

### Q3: 手机号重复冲突？

**解决方案**：
脚本已处理此情况，重复的手机号会跳过。如需合并，可在迁移后手动处理：

```sql
-- 查找重复手机号
SELECT phone, COUNT(*) as cnt
FROM customers
GROUP BY phone
HAVING COUNT(*) > 1;
```

### Q4: 如何回滚迁移？

**解决方案**：

```sql
-- ⚠️ 危险操作，请确认后执行
-- 删除迁移数据（保留 admin 用户）
DELETE FROM bookings WHERE source = 'migration';
DELETE FROM customers WHERE id > 0;
DELETE FROM packages WHERE id > 0;
DELETE FROM users WHERE username != 'admin';
```

### Q5: 迁移后旧系统还能用吗？

可以！迁移是**复制**数据，不会修改或删除旧数据库。建议：
1. 先在测试环境迁移验证
2. 确认无误后正式迁移
3. 并行运行一段时间
4. 完全切换后再停用旧系统

---

## 附录：快速迁移命令

```bash
# 一键迁移（在服务器执行）
cd /var/www/campsite/backend
npm install mssql --save-dev
node scripts/migration/migrate-from-sqlserver.js

# 验证迁移结果
sudo -u postgres psql -d campsite_db -c "SELECT 'customers', COUNT(*) FROM customers UNION ALL SELECT 'bookings', COUNT(*) FROM bookings;"

# 重启服务
pm2 reload campsite-backend
```

---

**文档版本**: v1.0
**创建日期**: 2026年1月
**适用场景**: SQL Server → PostgreSQL 数据迁移
