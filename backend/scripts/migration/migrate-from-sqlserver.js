/**
 * 数据迁移脚本：从 SQL Server 迁移到新系统
 *
 * 使用方法：
 * 1. 确保安装了 mssql: npm install mssql
 * 2. 运行: node scripts/migration/migrate-from-sqlserver.js
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
  '朋友介绍': 'friend',    // 匹配前端的 friend
  '携程': 'other',         // 归类到其他
  '美团': 'other',         // 归类到其他
  '电话': 'other',
  '网站': 'other'
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
  let skipped = 0;

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

      const phone = old.手机 || `unknown_${old.idkehu}`;

      // 检查手机号是否已存在
      const existing = await prisma.customer.findUnique({
        where: { phone }
      });

      if (existing) {
        console.log(`   ⚠️ 跳过重复客户: ${old.姓名} (${phone})`);
        skipped++;
        continue;
      }

      await prisma.customer.create({
        data: {
          name: old.姓名 || '未知',
          phone: phone,
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

  console.log(`   ✅ 客户迁移完成: 成功 ${success}, 跳过 ${skipped}, 失败 ${failed}`);
  return { success, failed, skipped };
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
  let skipped = 0;

  for (const old of orders) {
    try {
      // 生成预约编码
      const bookingCode = `BK${old.iddingdan.toString().padStart(8, '0')}`;

      // 检查是否已存在
      const existing = await prisma.booking.findUnique({
        where: { bookingCode }
      });

      if (existing) {
        console.log(`   ⚠️ 跳过重复订单: ${bookingCode}`);
        skipped++;
        continue;
      }

      // 查找关联客户
      let customerId = null;
      const customerPhone = old.客户手机 || old.手机;
      if (customerPhone) {
        const customer = await prisma.customer.findUnique({
          where: { phone: customerPhone }
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
      if (old.尾款结算人) operatorNotes.push(`尾款结算人: ${old.尾款结算人}`);
      if (old.已收尾款) operatorNotes.push(`已收尾款: ${old.已收尾款}`);

      await prisma.booking.create({
        data: {
          bookingCode: bookingCode,
          customerName: old.姓名 || '未知',
          customerPhone: old.手机 || customerPhone || 'unknown',
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
          source: 'migration',
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

  console.log(`   ✅ 订单迁移完成: 成功 ${success}, 跳过 ${skipped}, 失败 ${failed}`);
  return { success, failed, skipped };
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
  let skipped = 0;

  for (const old of users) {
    try {
      const username = old.用户名 || old.name;
      if (!username) {
        console.log(`   ⚠️ 跳过无用户名记录`);
        skipped++;
        continue;
      }

      // 检查用户名是否已存在
      const existing = await prisma.user.findUnique({
        where: { username }
      });

      if (existing) {
        console.log(`   ⚠️ 跳过已存在用户: ${username}`);
        skipped++;
        continue;
      }

      // 角色映射
      let role = 'operator';
      if (old.type === 1 || old.岗位 === '管理员') role = 'admin';
      else if (old.岗位 === '司机') role = 'driver';
      else if (old.岗位 === '教练') role = 'coach';

      // 密码加密
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
      console.log(`   ✅ 用户 ${username} 创建成功 (角色: ${role})`);
    } catch (err) {
      console.error(`   ❌ 迁移失败: ${old.name} - ${err.message}`);
      failed++;
    }
  }

  console.log(`   ✅ 用户迁移完成: 成功 ${success}, 跳过 ${skipped}, 失败 ${failed}`);
  return { success, failed, skipped };
}

// ========== 主函数 ==========
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          数据迁移工具 - SQL Server → 新营地系统           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n⏰ 开始时间: ${new Date().toLocaleString('zh-CN')}`);

  let pool;

  try {
    // 连接 SQL Server
    console.log('\n🔌 正在连接 SQL Server...');
    console.log(`   服务器: ${sqlServerConfig.server}:${sqlServerConfig.port}`);
    console.log(`   数据库: ${sqlServerConfig.database}`);

    pool = await sql.connect(sqlServerConfig);
    console.log('   ✅ SQL Server 连接成功');

    // 测试连接并获取数据概览
    console.log('\n📊 旧数据库概览:');
    const counts = await Promise.all([
      pool.request().query('SELECT COUNT(*) as count FROM table_kehu'),
      pool.request().query('SELECT COUNT(*) as count FROM table_dingdan'),
      pool.request().query('SELECT COUNT(*) as count FROM table_xianlu'),
      pool.request().query('SELECT COUNT(*) as count FROM table_sysuser')
    ]);

    console.log(`   - 客户记录: ${counts[0].recordset[0].count} 条`);
    console.log(`   - 订单记录: ${counts[1].recordset[0].count} 条`);
    console.log(`   - 线路记录: ${counts[2].recordset[0].count} 条`);
    console.log(`   - 用户记录: ${counts[3].recordset[0].count} 条`);

    // 开始迁移
    console.log('\n' + '═'.repeat(60));
    console.log('                    开始数据迁移');
    console.log('═'.repeat(60));

    const results = {
      customers: await migrateCustomers(pool),
      packages: await migratePackages(pool),
      orders: await migrateOrders(pool),
      users: await migrateUsers(pool)
    };

    // 汇总报告
    console.log('\n' + '═'.repeat(60));
    console.log('                    迁移完成报告');
    console.log('═'.repeat(60));
    console.log(`
┌──────────────┬──────────┬──────────┬──────────┐
│     类型     │   成功   │   跳过   │   失败   │
├──────────────┼──────────┼──────────┼──────────┤
│ 📋 客户数据  │ ${String(results.customers.success).padStart(6)} │ ${String(results.customers.skipped || 0).padStart(6)} │ ${String(results.customers.failed).padStart(6)} │
│ 📦 套餐数据  │ ${String(results.packages.success).padStart(6)} │ ${String(results.packages.skipped || 0).padStart(6)} │ ${String(results.packages.failed).padStart(6)} │
│ 📝 订单数据  │ ${String(results.orders.success).padStart(6)} │ ${String(results.orders.skipped || 0).padStart(6)} │ ${String(results.orders.failed).padStart(6)} │
│ 👥 用户数据  │ ${String(results.users.success).padStart(6)} │ ${String(results.users.skipped || 0).padStart(6)} │ ${String(results.users.failed).padStart(6)} │
└──────────────┴──────────┴──────────┴──────────┘
`);
    console.log('═'.repeat(60));
    console.log(`\n⏰ 完成时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('\n✨ 数据迁移完成！请登录系统检查数据。');

  } catch (err) {
    console.error('\n❌ 迁移过程出错:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    // 关闭连接
    if (pool) {
      await pool.close();
      console.log('\n🔌 SQL Server 连接已关闭');
    }
    await prisma.$disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行迁移
main().catch(console.error);
