/**
 * 接送调度 API 测试脚本
 * 测试所有接送调度相关的 API 端点
 */

const BASE_URL = 'http://localhost:5000/api';

let authToken = '';
let testCustomerId = null;
let testAccommodationId = null;
let testProjectId = null;
let testOrderId = null;
let testVehicleId = null;
let testDriverId = null;
let testScheduleId = null;

// 测试日期（7天后）
const testDate = new Date();
testDate.setDate(testDate.getDate() + 7);
const testDateStr = testDate.toISOString().split('T')[0];

// 测试结果统计
let passedTests = 0;
let totalTests = 0;

// 辅助函数：发送HTTP请求
async function request(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...options.headers,
      },
    });
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error('请求失败:', error.message);
    throw error;
  }
}

// 测试函数
async function test(name, fn) {
  totalTests++;
  console.log(`\n🧪 测试 ${totalTests}: ${name}`);
  try {
    await fn();
    passedTests++;
  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
  }
}

// 主测试流程
async function runTests() {
  console.log('🔍 检查服务器状态...');
  try {
    const healthCheck = await fetch(`${BASE_URL.replace('/api', '')}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('服务器未运行');
    }
    console.log('✅ 服务器正在运行\n');
  } catch (error) {
    console.error('❌ 无法连接到服务器，请确保后端服务已启动');
    console.error('   运行: cd backend && npm run dev');
    process.exit(1);
  }

  console.log('🚀 开始测试接送调度 API...\n');
  console.log('='.repeat(60));

  // ==================== 准备测试数据 ====================
  console.log('\n📝 准备测试数据...');

  // 1. 登录获取token
  await test('登录获取 Token', async () => {
    const { status, data } = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });

    if (!data.success || !data.data.token) {
      throw new Error('登录失败');
    }

    authToken = data.data.token;
    console.log('✅ 登录成功');
  });

  // 2. 获取住宿地点ID
  await test('获取住宿地点', async () => {
    const { status, data } = await request(`${BASE_URL}/accommodations?pageSize=1`);

    if (!data.success || data.data.items.length === 0) {
      throw new Error('没有可用的住宿地点');
    }

    testAccommodationId = data.data.items[0].id;
    console.log(`✅ 获取住宿地点成功 (ID: ${testAccommodationId})`);
  });

  // 3. 获取项目ID
  await test('获取项目', async () => {
    const { status, data } = await request(`${BASE_URL}/projects?pageSize=1`);

    if (!data.success || data.data.items.length === 0) {
      throw new Error('没有可用的项目');
    }

    testProjectId = data.data.items[0].id;
    console.log(`✅ 获取项目成功 (ID: ${testProjectId})`);
  });

  // 4. 创建测试客户
  await test('创建测试客户', async () => {
    const { status, data } = await request(`${BASE_URL}/customers`, {
      method: 'POST',
      body: JSON.stringify({
        name: '接送测试客户',
        phone: '13900000088',
        source: 'xiaohongshu',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '创建客户失败');
    }

    testCustomerId = data.data.id;
    console.log(`✅ 测试客户创建成功 (ID: ${testCustomerId})`);
  });

  // 5. 创建测试订单（用于接送统计）
  await test('创建测试订单', async () => {
    const { status, data } = await request(`${BASE_URL}/orders`, {
      method: 'POST',
      body: JSON.stringify({
        customerId: testCustomerId,
        accommodationPlaceId: testAccommodationId,
        roomNumber: '2001',
        visitDate: testDateStr,
        peopleCount: 3,
        items: [{ projectId: testProjectId, quantity: 1 }],
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '创建订单失败');
    }

    testOrderId = data.data.id;

    // 确认订单
    await request(`${BASE_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' }),
    });

    console.log(`✅ 测试订单创建并确认成功 (ID: ${testOrderId})`);
  });

  // ==================== 车辆管理测试 ====================
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🚌 车辆管理测试\n');

  // 测试: 创建车辆
  await test('创建车辆', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/vehicles`, {
      method: 'POST',
      body: JSON.stringify({
        plateNumber: '吉A12345',
        vehicleType: '商务车',
        seats: 7,
        status: 'available',
        notes: '测试车辆',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '创建车辆失败');
    }

    testVehicleId = data.data.id;
    console.log('✅ 车辆创建成功');
    console.log(`  ID: ${data.data.id}`);
    console.log(`  车牌: ${data.data.plateNumber}`);
    console.log(`  类型: ${data.data.vehicleType}`);
    console.log(`  座位: ${data.data.seats}`);
  });

  // 测试: 获取车辆列表
  await test('获取车辆列表', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/vehicles`);

    if (!data.success) {
      throw new Error('获取车辆列表失败');
    }

    console.log('✅ 获取车辆列表成功');
    console.log(`  车辆数: ${data.data.length}`);
  });

  // 测试: 更新车辆
  await test('更新车辆', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/vehicles/${testVehicleId}`, {
      method: 'PUT',
      body: JSON.stringify({
        notes: '更新后的备注',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '更新车辆失败');
    }

    console.log('✅ 车辆更新成功');
    console.log(`  备注: ${data.data.notes}`);
  });

  // ==================== 司机管理测试 ====================
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('👨‍✈️ 司机管理测试\n');

  // 测试: 创建司机
  await test('创建司机', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/drivers`, {
      method: 'POST',
      body: JSON.stringify({
        name: '测试司机',
        phone: '13800138888',
        status: 'on_duty',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '创建司机失败');
    }

    testDriverId = data.data.id;
    console.log('✅ 司机创建成功');
    console.log(`  ID: ${data.data.id}`);
    console.log(`  姓名: ${data.data.name}`);
    console.log(`  状态: ${data.data.status}`);
  });

  // 测试: 获取司机列表
  await test('获取司机列表', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/drivers`);

    if (!data.success) {
      throw new Error('获取司机列表失败');
    }

    console.log('✅ 获取司机列表成功');
    console.log(`  司机数: ${data.data.length}`);
  });

  // 测试: 更新司机
  await test('更新司机', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/drivers/${testDriverId}`, {
      method: 'PUT',
      body: JSON.stringify({
        phone: '13800139999',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '更新司机失败');
    }

    console.log('✅ 司机更新成功');
    console.log(`  新电话: ${data.data.phone}`);
  });

  // ==================== 接送调度测试 ====================
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🚐 接送调度测试\n');

  // 测试: 获取每日接送统计
  await test('获取每日接送统计', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/daily-stats?date=${testDateStr}`);

    if (!data.success) {
      throw new Error('获取每日统计失败');
    }

    console.log('✅ 获取每日统计成功');
    console.log(`  日期: ${data.data.date}`);
    console.log(`  订单数: ${data.data.totalOrders}`);
    console.log(`  总人数: ${data.data.totalPeople}`);
    console.log(`  已分配: ${data.data.assignedPeople}`);
    console.log(`  未分配: ${data.data.unassignedPeople}`);
    console.log(`  住宿点数: ${data.data.accommodationStats.length}`);
  });

  // 测试: 创建接送调度
  await test('创建接送调度', async () => {
    const departureTime = new Date(testDateStr);
    departureTime.setHours(8, 0, 0, 0);

    const { status, data } = await request(`${BASE_URL}/shuttle/schedules`, {
      method: 'POST',
      body: JSON.stringify({
        date: testDateStr,
        batchName: '上午第一批',
        vehicleId: testVehicleId,
        driverId: testDriverId,
        departureTime: departureTime.toISOString(),
        stops: [
          {
            accommodationPlaceId: testAccommodationId,
            stopOrder: 1,
            passengerCount: 3,
          },
        ],
        notes: '测试接送调度',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '创建调度失败');
    }

    testScheduleId = data.data.id;
    console.log('✅ 接送调度创建成功');
    console.log(`  ID: ${data.data.id}`);
    console.log(`  批次: ${data.data.batchName}`);
    console.log(`  车辆: ${data.data.vehicle.plateNumber}`);
    console.log(`  司机: ${data.data.driver.name}`);
    console.log(`  站点数: ${data.data.shuttleStops.length}`);
  });

  // 测试: 获取接送调度列表
  await test('获取接送调度列表', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/schedules?date=${testDateStr}`);

    if (!data.success) {
      throw new Error('获取调度列表失败');
    }

    console.log('✅ 获取调度列表成功');
    console.log(`  总数: ${data.data.total}`);
    console.log(`  当前页: ${data.data.items.length}`);
  });

  // 测试: 获取调度详情
  await test('获取调度详情', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/schedules/${testScheduleId}`);

    if (!data.success) {
      throw new Error('获取调度详情失败');
    }

    console.log('✅ 获取调度详情成功');
    console.log(`  状态: ${data.data.status}`);
    console.log(`  站点数: ${data.data.shuttleStops.length}`);
  });

  // 测试: 获取站点详情（含客人名单）
  await test('获取站点详情（含客人名单）', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/schedules/${testScheduleId}/stops`);

    if (!data.success) {
      throw new Error('获取站点详情失败');
    }

    console.log('✅ 获取站点详情成功');
    console.log(`  调度批次: ${data.data.schedule.batchName}`);
    console.log(`  站点数: ${data.data.stops.length}`);

    for (const stop of data.data.stops) {
      console.log(`  - ${stop.accommodationPlace.name}: ${stop.customers.length} 组客人`);
    }
  });

  // 测试: 更新调度状态为进行中
  await test('更新调度状态为进行中', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/schedules/${testScheduleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '更新状态失败');
    }

    console.log('✅ 调度状态更新成功');
    console.log(`  新状态: ${data.data.status}`);
  });

  // 测试: 更新调度状态为已完成
  await test('更新调度状态为已完成', async () => {
    const returnTime = new Date(testDateStr);
    returnTime.setHours(12, 0, 0, 0);

    const { status, data } = await request(`${BASE_URL}/shuttle/schedules/${testScheduleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        returnTime: returnTime.toISOString(),
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '更新状态失败');
    }

    console.log('✅ 调度完成成功');
    console.log(`  最终状态: ${data.data.status}`);
    console.log(`  返回时间: ${data.data.returnTime}`);
  });

  // 测试: 尝试删除已完成的调度（应失败）
  await test('尝试删除已完成的调度（应失败）', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/schedules/${testScheduleId}`, {
      method: 'DELETE',
    });

    if (data.success) {
      throw new Error('不应该能删除已完成的调度');
    }

    console.log('✅ 正确拒绝删除已完成的调度');
    console.log(`  错误信息: ${data.error.message}`);
  });

  // 测试: 创建并删除待出发的调度
  await test('创建并删除待出发的调度', async () => {
    const departureTime = new Date(testDateStr);
    departureTime.setHours(14, 0, 0, 0);

    // 先更新车辆和司机状态为可用
    await request(`${BASE_URL}/shuttle/vehicles/${testVehicleId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'available' }),
    });

    await request(`${BASE_URL}/shuttle/drivers/${testDriverId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'on_duty' }),
    });

    // 创建新调度（使用不同的日期避免冲突）
    const newTestDate = new Date(testDate);
    newTestDate.setDate(newTestDate.getDate() + 1);
    const newTestDateStr = newTestDate.toISOString().split('T')[0];

    const createResult = await request(`${BASE_URL}/shuttle/schedules`, {
      method: 'POST',
      body: JSON.stringify({
        date: newTestDateStr,
        batchName: '下午批次',
        vehicleId: testVehicleId,
        driverId: testDriverId,
        departureTime: departureTime.toISOString(),
        stops: [
          {
            accommodationPlaceId: testAccommodationId,
            stopOrder: 1,
            passengerCount: 2,
          },
        ],
      }),
    });

    if (!createResult.data.success) {
      throw new Error(createResult.data.error?.message || '创建调度失败');
    }

    const newScheduleId = createResult.data.data.id;

    // 删除调度
    const deleteResult = await request(`${BASE_URL}/shuttle/schedules/${newScheduleId}`, {
      method: 'DELETE',
    });

    if (!deleteResult.data.success) {
      throw new Error(deleteResult.data.error?.message || '删除调度失败');
    }

    console.log('✅ 调度创建并删除成功');
  });

  // 测试: 重复车牌验证
  await test('重复车牌验证', async () => {
    const { status, data } = await request(`${BASE_URL}/shuttle/vehicles`, {
      method: 'POST',
      body: JSON.stringify({
        plateNumber: '吉A12345', // 已存在的车牌
        vehicleType: '中巴',
        seats: 20,
      }),
    });

    if (data.success) {
      throw new Error('不应该能创建重复车牌的车辆');
    }

    console.log('✅ 正确拒绝重复车牌');
    console.log(`  错误信息: ${data.error.message}`);
  });

  // 测试: 车辆座位数验证
  await test('车辆座位数验证', async () => {
    const departureTime = new Date(testDateStr);
    departureTime.setHours(16, 0, 0, 0);

    // 使用新日期避免冲突
    const newTestDate = new Date(testDate);
    newTestDate.setDate(newTestDate.getDate() + 2);
    const newTestDateStr = newTestDate.toISOString().split('T')[0];

    const { status, data } = await request(`${BASE_URL}/shuttle/schedules`, {
      method: 'POST',
      body: JSON.stringify({
        date: newTestDateStr,
        batchName: '测试批次',
        vehicleId: testVehicleId,
        driverId: testDriverId,
        departureTime: departureTime.toISOString(),
        stops: [
          {
            accommodationPlaceId: testAccommodationId,
            stopOrder: 1,
            passengerCount: 100, // 超过座位数
          },
        ],
      }),
    });

    if (data.success) {
      throw new Error('不应该能创建超过座位数的调度');
    }

    console.log('✅ 正确拒绝超载调度');
    console.log(`  错误信息: ${data.error.message}`);
  });

  // ==================== 清理测试数据 ====================
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🧹 清理测试数据...');

  // 注意：由于有关联关系，某些数据可能无法删除，这是正常的
  console.log('ℹ️  测试数据保留用于后续验证');

  // ==================== 测试结果 ====================
  console.log('\n' + '='.repeat(60) + '\n');
  console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过`);

  if (passedTests === totalTests) {
    console.log('✅ 所有测试通过！');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} 个测试失败`);
    process.exit(1);
  }
}

// 运行测试
runTests().catch((error) => {
  console.error('\n❌ 测试执行出错:', error);
  process.exit(1);
});
