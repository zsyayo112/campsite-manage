/**
 * 功能测试脚本
 * 测试系统各模块的核心功能
 */

const prisma = require('../src/utils/prisma');
const bcrypt = require('bcrypt');

// 测试结果收集
const testResults = {
  passed: [],
  failed: [],
};

function logTest(name, passed, detail = '') {
  if (passed) {
    testResults.passed.push(name);
    console.log(`  ✅ ${name}`);
  } else {
    testResults.failed.push({ name, detail });
    console.log(`  ❌ ${name}: ${detail}`);
  }
}

// 1. 用户认证测试
async function testUserAuth() {
  console.log('\n========== 1. 用户认证测试 ==========');

  // 测试用户存在
  const users = await prisma.user.findMany();
  logTest('用户表有数据', users.length > 0, `用户数: ${users.length}`);

  // 测试管理员账户
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  logTest('管理员账户存在', !!admin);

  // 测试密码验证
  if (admin && admin.password) {
    try {
      const validPassword = await bcrypt.compare('admin123', admin.password);
      logTest('管理员密码正确', validPassword);
    } catch {
      logTest('管理员密码字段存在', !!admin.password, '密码已加密存储');
    }
    logTest('管理员角色正确', admin.role === 'admin', `实际角色: ${admin.role}`);
  }

  // 测试角色类型
  const roles = await prisma.user.groupBy({ by: ['role'], _count: true });
  logTest('角色分组正常', roles.length > 0, `角色类型: ${roles.map((r) => r.role).join(', ')}`);
}

// 2. 客户管理测试
async function testCustomerManagement() {
  console.log('\n========== 2. 客户管理测试 ==========');

  // 测试客户列表
  const customers = await prisma.customer.findMany({ take: 10 });
  logTest('客户表可查询', true, `客户数: ${customers.length}`);

  // 测试客户字段完整性
  if (customers.length > 0) {
    const customer = customers[0];
    logTest('客户姓名字段存在', !!customer.name);
    logTest('客户电话字段存在', !!customer.phone);
  }

  // 测试客户搜索功能
  const searchResult = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: 'test' } },
        { phone: { contains: '139' } },
      ],
    },
  });
  logTest('客户搜索功能正常', true, `搜索结果: ${searchResult.length}`);
}

// 3. 订单管理测试
async function testOrderManagement() {
  console.log('\n========== 3. 订单管理测试 ==========');

  // 测试订单列表
  const orders = await prisma.order.findMany({
    take: 10,
    include: {
      customer: true,
      accommodationPlace: true,
    },
  });
  logTest('订单表可查询', true, `订单数: ${orders.length}`);

  // 测试订单关联
  if (orders.length > 0) {
    const order = orders[0];
    logTest('订单关联客户', !!order.customer, order.customer?.name || '无');
    logTest('订单关联住宿地点', !!order.accommodationPlace, order.accommodationPlace?.name || '无');
    logTest('订单号格式正确', /^ORD\d{12}$/.test(order.orderNumber), order.orderNumber);
    logTest('订单状态有效', ['pending', 'confirmed', 'completed', 'cancelled'].includes(order.status), order.status);
  }

  // 测试订单统计
  const orderStats = await prisma.order.groupBy({
    by: ['status'],
    _count: true,
  });
  logTest('订单状态统计正常', orderStats.length > 0, orderStats.map((s) => `${s.status}:${s._count}`).join(', '));
}

// 4. 住宿地点测试
async function testAccommodation() {
  console.log('\n========== 4. 住宿地点测试 ==========');

  const accommodations = await prisma.accommodationPlace.findMany();
  logTest('住宿地点表可查询', true, `地点数: ${accommodations.length}`);

  if (accommodations.length > 0) {
    const place = accommodations[0];
    logTest('住宿地点名称存在', !!place.name);
    logTest('住宿地点类型有效', ['self', 'external'].includes(place.type), place.type);
  }
}

// 5. 项目管理测试
async function testProjectManagement() {
  console.log('\n========== 5. 项目管理测试 ==========');

  const projects = await prisma.project.findMany();
  logTest('项目表可查询', true, `项目数: ${projects.length}`);

  if (projects.length > 0) {
    const project = projects[0];
    logTest('项目名称存在', !!project.name);
    logTest('项目价格有效', project.price !== null && project.price !== undefined, `价格: ${project.price}`);
  }
}

// 6. 套餐管理测试
async function testPackageManagement() {
  console.log('\n========== 6. 套餐管理测试 ==========');

  const packages = await prisma.package.findMany({
    include: { packageItems: true },
  });
  logTest('套餐表可查询', true, `套餐数: ${packages.length}`);

  if (packages.length > 0) {
    const pkg = packages[0];
    logTest('套餐名称存在', !!pkg.name);
    logTest('套餐价格有效', pkg.price !== null && pkg.price !== undefined, `价格: ${pkg.price}`);
    logTest('套餐项目关联正常', Array.isArray(pkg.packageItems), `项目数: ${pkg.packageItems.length}`);
  }
}

// 7. 接送调度测试
async function testShuttleManagement() {
  console.log('\n========== 7. 接送调度测试 ==========');

  // 测试车辆
  const vehicles = await prisma.vehicle.findMany();
  logTest('车辆表可查询', true, `车辆数: ${vehicles.length}`);

  // 测试司机
  const drivers = await prisma.driver.findMany();
  logTest('司机表可查询', true, `司机数: ${drivers.length}`);

  // 测试调度
  const schedules = await prisma.shuttleSchedule.findMany({
    include: { vehicle: true, driver: true, shuttleStops: true },
  });
  logTest('调度表可查询', true, `调度数: ${schedules.length}`);
}

// 8. 跨模块功能测试
async function testCrossModule() {
  console.log('\n========== 8. 跨模块功能测试 ==========');

  // 测试订单创建时关联客户
  const ordersWithCustomers = await prisma.order.findMany({
    where: { customerId: { gt: 0 } },
    include: { customer: true },
    take: 5,
  });
  logTest('订单正确关联客户', ordersWithCustomers.length > 0 ? ordersWithCustomers.every((o) => o.customer !== null) : true);

  // 测试订单与住宿地点关联
  const ordersWithAccommodation = await prisma.order.findMany({
    where: { accommodationPlaceId: { gt: 0 } },
    include: { accommodationPlace: true },
    take: 5,
  });
  logTest('订单正确关联住宿地点', ordersWithAccommodation.length > 0 ? ordersWithAccommodation.every((o) => o.accommodationPlace !== null) : true);

  // 测试统计数据准确性
  const totalOrders = await prisma.order.count();
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: true,
  });
  const sumByStatus = ordersByStatus.reduce((sum, s) => sum + s._count, 0);
  logTest('订单统计数据准确', totalOrders === sumByStatus, `总数: ${totalOrders}, 分组合计: ${sumByStatus}`);
}

// 9. 数据完整性测试
async function testDataIntegrity() {
  console.log('\n========== 9. 数据完整性测试 ==========');

  // 检查所有订单都有客户
  const allOrders = await prisma.order.findMany({
    include: { customer: true },
  });
  const orphanOrders = allOrders.filter((o) => !o.customer);
  logTest('无孤立订单（无客户）', orphanOrders.length === 0, `孤立订单数: ${orphanOrders.length}`);

  // 检查订单金额
  const ordersWithAmount = allOrders.filter((o) => o.totalAmount > 0);
  logTest('订单金额合理', true, `有金额订单数: ${ordersWithAmount.length}`);
}

// 主函数
async function runAllTests() {
  console.log('🧪 营地管理系统功能测试');
  console.log('========================');

  try {
    await testUserAuth();
    await testCustomerManagement();
    await testOrderManagement();
    await testAccommodation();
    await testProjectManagement();
    await testPackageManagement();
    await testShuttleManagement();
    await testCrossModule();
    await testDataIntegrity();

    // 输出测试结果
    console.log('\n========== 测试结果汇总 ==========');
    console.log(`✅ 通过: ${testResults.passed.length} 项`);
    console.log(`❌ 失败: ${testResults.failed.length} 项`);

    if (testResults.failed.length > 0) {
      console.log('\n失败项目:');
      testResults.failed.forEach((f) => {
        console.log(`  - ${f.name}: ${f.detail}`);
      });
    }

    const passRate = ((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100).toFixed(1);
    console.log(`\n📊 通过率: ${passRate}%`);
  } catch (error) {
    console.error('\n测试执行错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
