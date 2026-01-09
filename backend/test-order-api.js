/**
 * 订单管理 API 测试脚本
 * 测试所有订单相关的 API 端点
 */

const BASE_URL = 'http://localhost:5000/api';

let authToken = '';
let testCustomerId = null;
let testAccommodationId = null;
let testProjectId = null;
let testOrderId = null;

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

  console.log('🚀 开始测试订单管理 API...\n');
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

  // 2. 创建测试客户
  await test('创建测试客户', async () => {
    const { status, data } = await request(`${BASE_URL}/customers`, {
      method: 'POST',
      body: JSON.stringify({
        name: '订单测试客户',
        phone: '13900000001',
        source: 'xiaohongshu',
        tags: ['测试'],
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '创建客户失败');
    }

    testCustomerId = data.data.id;
    console.log(`✅ 测试客户创建成功 (ID: ${testCustomerId})`);
  });

  // 3. 获取住宿地点ID
  await test('获取住宿地点', async () => {
    const { status, data } = await request(`${BASE_URL}/accommodations?pageSize=1`);

    if (!data.success || data.data.items.length === 0) {
      throw new Error('没有可用的住宿地点');
    }

    testAccommodationId = data.data.items[0].id;
    console.log(`✅ 获取住宿地点成功 (ID: ${testAccommodationId})`);
  });

  // 4. 获取项目ID
  await test('获取项目', async () => {
    const { status, data } = await request(`${BASE_URL}/projects?pageSize=1`);

    if (!data.success || data.data.items.length === 0) {
      throw new Error('没有可用的项目');
    }

    testProjectId = data.data.items[0].id;
    console.log(`✅ 获取项目成功 (ID: ${testProjectId})`);
  });

  // ==================== 订单 API 测试 ====================
  console.log('\n' + '='.repeat(60) + '\n');

  // 测试 1: 创建订单
  await test('创建订单', async () => {
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + 7); // 7天后

    const { status, data } = await request(`${BASE_URL}/orders`, {
      method: 'POST',
      body: JSON.stringify({
        customerId: testCustomerId,
        accommodationPlaceId: testAccommodationId,
        roomNumber: '1001',
        visitDate: visitDate.toISOString().split('T')[0],
        peopleCount: 2,
        items: [
          { projectId: testProjectId, quantity: 2 },
        ],
        notes: '测试订单',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '创建订单失败');
    }

    testOrderId = data.data.id;
    console.log('✅ 订单创建成功');
    console.log(`  订单号: ${data.data.orderNumber}`);
    console.log(`  总金额: ${data.data.totalAmount}`);
    console.log(`  客户: ${data.data.customer.name}`);
    console.log(`  住宿: ${data.data.accommodationPlace.name}`);
  });

  // 测试 2: 获取订单列表
  await test('获取订单列表', async () => {
    const { status, data } = await request(`${BASE_URL}/orders?page=1&pageSize=10`);

    if (!data.success) {
      throw new Error('获取订单列表失败');
    }

    console.log('✅ 获取列表成功');
    console.log(`  总订单数: ${data.data.total}`);
    console.log(`  当前页订单: ${data.data.items.length}`);
  });

  // 测试 3: 按状态筛选订单
  await test('按状态筛选订单', async () => {
    const { status, data } = await request(`${BASE_URL}/orders?status=pending`);

    if (!data.success) {
      throw new Error('筛选订单失败');
    }

    console.log('✅ 筛选成功');
    console.log(`  待处理订单: ${data.data.total} 个`);
  });

  // 测试 4: 搜索订单
  await test('搜索订单', async () => {
    const { status, data } = await request(
      `${BASE_URL}/orders?search=${encodeURIComponent('订单测试客户')}`
    );

    if (!data.success) {
      throw new Error('搜索订单失败');
    }

    console.log('✅ 搜索成功');
    console.log(`  搜索结果: ${data.data.items.length} 个`);
  });

  // 测试 5: 获取订单详情
  await test('获取订单详情', async () => {
    const { status, data } = await request(`${BASE_URL}/orders/${testOrderId}`);

    if (!data.success) {
      throw new Error('获取订单详情失败');
    }

    console.log('✅ 获取详情成功');
    console.log(`  订单号: ${data.data.orderNumber}`);
    console.log(`  状态: ${data.data.status}`);
    console.log(`  支付状态: ${data.data.paymentStatus}`);
    console.log(`  项目数: ${data.data.orderItems.length}`);
  });

  // 测试 6: 更新订单状态为已确认
  await test('更新订单状态为已确认', async () => {
    const { status, data } = await request(`${BASE_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'confirmed',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '更新状态失败');
    }

    console.log('✅ 状态更新成功');
    console.log(`  新状态: ${data.data.status}`);
  });

  // 测试 7: 更新支付状态
  await test('更新支付状态为已支付', async () => {
    const { status, data } = await request(`${BASE_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        paymentStatus: 'paid',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '更新支付状态失败');
    }

    console.log('✅ 支付状态更新成功');
    console.log(`  新支付状态: ${data.data.paymentStatus}`);
  });

  // 测试 8: 更新订单状态为已完成
  await test('更新订单状态为已完成', async () => {
    const { status, data } = await request(`${BASE_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
      }),
    });

    if (!data.success) {
      throw new Error(data.error?.message || '更新状态失败');
    }

    console.log('✅ 订单完成成功');
    console.log(`  最终状态: ${data.data.status}`);
  });

  // 测试 9: 获取订单统计
  await test('获取订单统计', async () => {
    const { status, data } = await request(`${BASE_URL}/orders/stats/summary`);

    if (!data.success) {
      throw new Error('获取统计失败');
    }

    console.log('✅ 获取统计成功');
    console.log(`  总订单数: ${data.data.totalOrders}`);
    console.log(`  总收入: ${data.data.totalRevenue}`);
    console.log('  状态分布:');
    data.data.statusDistribution.forEach((item) => {
      console.log(`    ${item.status}: ${item.count}`);
    });
  });

  // 测试 10: 尝试删除已完成的订单（应失败）
  await test('尝试删除已完成的订单（应失败）', async () => {
    const { status, data } = await request(`${BASE_URL}/orders/${testOrderId}`, {
      method: 'DELETE',
    });

    if (data.success) {
      throw new Error('不应该能删除已完成的订单');
    }

    console.log('✅ 正确拒绝删除已完成的订单');
    console.log(`  错误信息: ${data.error.message}`);
  });

  // 测试 11: 创建待删除的订单并删除
  await test('创建并删除待处理订单', async () => {
    // 创建新订单
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + 10);

    const createResult = await request(`${BASE_URL}/orders`, {
      method: 'POST',
      body: JSON.stringify({
        customerId: testCustomerId,
        accommodationPlaceId: testAccommodationId,
        visitDate: visitDate.toISOString().split('T')[0],
        peopleCount: 1,
        items: [{ projectId: testProjectId, quantity: 1 }],
      }),
    });

    if (!createResult.data.success) {
      throw new Error('创建订单失败');
    }

    const newOrderId = createResult.data.data.id;

    // 删除订单
    const deleteResult = await request(`${BASE_URL}/orders/${newOrderId}`, {
      method: 'DELETE',
    });

    if (!deleteResult.data.success) {
      throw new Error(deleteResult.data.error?.message || '删除订单失败');
    }

    console.log('✅ 订单删除成功');
  });

  // 测试 12: 无效状态转换（尝试将已完成改为待处理）
  await test('无效状态转换测试', async () => {
    const { status, data } = await request(`${BASE_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'pending',
      }),
    });

    if (data.success) {
      throw new Error('不应该能将已完成订单改为待处理');
    }

    console.log('✅ 正确拒绝无效状态转换');
    console.log(`  错误信息: ${data.error.message}`);
  });

  // ==================== 清理测试数据 ====================
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🧹 清理测试数据...');

  // 清理测试客户
  await test('清理测试客户', async () => {
    const { status, data } = await request(`${BASE_URL}/customers/${testCustomerId}`, {
      method: 'DELETE',
    });

    // 因为有订单关联，删除可能失败，这是正常的
    if (data.success) {
      console.log('✅ 测试客户已删除');
    } else {
      console.log('ℹ️  测试客户有关联订单，无法删除（这是正常的）');
      passedTests++; // 计为通过
    }
  });

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
