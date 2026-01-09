/**
 * 客户管理 API 测试脚本
 * 使用方法：node test-customer-api.js
 */

const API_BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let createdCustomerId = null;

// 辅助函数：登录获取 token
async function login() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123',
    }),
  });
  const data = await response.json();
  return data.data.token;
}

// 测试用例
const tests = {
  createCustomer: async () => {
    console.log('\n🧪 测试 1: 创建客户');
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: '测试客户',
        phone: '13900139999',
        wechat: 'test_customer',
        source: 'xiaohongshu',
        tags: ['测试', 'VIP'],
        notes: '这是一个测试客户',
      }),
    });
    const data = await response.json();

    if (data.success) {
      createdCustomerId = data.data.id;
      console.log('✅ 客户创建成功');
      console.log('  ID:', data.data.id);
      console.log('  姓名:', data.data.name);
      console.log('  手机:', data.data.phone);
      console.log('  标签:', data.data.tags);
      return true;
    } else {
      console.log('❌ 创建失败:', data.error);
      return false;
    }
  },

  createDuplicatePhone: async () => {
    console.log('\n🧪 测试 2: 重复手机号验证');
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: '另一个客户',
        phone: '13900139999', // 重复的手机号
        source: 'wechat',
      }),
    });
    const data = await response.json();

    if (!data.success && data.error.code === 'DUPLICATE_PHONE') {
      console.log('✅ 正确拒绝重复手机号');
      return true;
    } else {
      console.log('❌ 未正确处理重复手机号');
      return false;
    }
  },

  createWithInvalidPhone: async () => {
    console.log('\n🧪 测试 3: 无效手机号验证');
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: '测试客户2',
        phone: '12345', // 无效手机号
        source: 'wechat',
      }),
    });
    const data = await response.json();

    if (!data.success && data.error.code === 'VALIDATION_ERROR') {
      console.log('✅ 正确拒绝无效手机号');
      return true;
    } else {
      console.log('❌ 未正确验证手机号');
      return false;
    }
  },

  getCustomers: async () => {
    console.log('\n🧪 测试 4: 获取客户列表');
    const response = await fetch(
      `${API_BASE_URL}/customers?page=1&pageSize=10`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` },
      }
    );
    const data = await response.json();

    if (data.success) {
      console.log('✅ 获取列表成功');
      console.log('  总数:', data.data.total);
      console.log('  当前页:', data.data.page);
      console.log('  每页数量:', data.data.pageSize);
      console.log('  客户数:', data.data.items.length);
      return true;
    } else {
      console.log('❌ 获取列表失败:', data.error);
      return false;
    }
  },

  searchCustomers: async () => {
    console.log('\n🧪 测试 5: 搜索客户');
    const response = await fetch(
      `${API_BASE_URL}/customers?search=测试`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` },
      }
    );
    const data = await response.json();

    if (data.success) {
      console.log('✅ 搜索成功');
      console.log('  搜索结果:', data.data.items.length, '个');
      return true;
    } else {
      console.log('❌ 搜索失败:', data.error);
      return false;
    }
  },

  filterBySource: async () => {
    console.log('\n🧪 测试 6: 按来源筛选');
    const response = await fetch(
      `${API_BASE_URL}/customers?source=xiaohongshu`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` },
      }
    );
    const data = await response.json();

    if (data.success) {
      console.log('✅ 筛选成功');
      console.log('  小红书客户:', data.data.items.length, '个');
      return true;
    } else {
      console.log('❌ 筛选失败:', data.error);
      return false;
    }
  },

  getCustomerById: async () => {
    if (!createdCustomerId) {
      console.log('\n⚠️  测试 7: 跳过（未创建客户）');
      return true;
    }

    console.log('\n🧪 测试 7: 获取客户详情');
    const response = await fetch(
      `${API_BASE_URL}/customers/${createdCustomerId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` },
      }
    );
    const data = await response.json();

    if (data.success) {
      console.log('✅ 获取详情成功');
      console.log('  ID:', data.data.id);
      console.log('  姓名:', data.data.name);
      console.log('  订单数:', data.data.orders.length);
      return true;
    } else {
      console.log('❌ 获取详情失败:', data.error);
      return false;
    }
  },

  updateCustomer: async () => {
    if (!createdCustomerId) {
      console.log('\n⚠️  测试 8: 跳过（未创建客户）');
      return true;
    }

    console.log('\n🧪 测试 8: 更新客户');
    const response = await fetch(
      `${API_BASE_URL}/customers/${createdCustomerId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          notes: '更新后的备注信息',
          tags: ['测试', 'VIP', '常客'],
        }),
      }
    );
    const data = await response.json();

    if (data.success) {
      console.log('✅ 更新成功');
      console.log('  备注:', data.data.notes);
      console.log('  标签:', data.data.tags);
      return true;
    } else {
      console.log('❌ 更新失败:', data.error);
      return false;
    }
  },

  getStats: async () => {
    console.log('\n🧪 测试 9: 获取客户统计');
    const response = await fetch(`${API_BASE_URL}/customers/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      console.log('✅ 获取统计成功');
      console.log('  总客户数:', data.data.totalCustomers);
      console.log('  总消费:', data.data.totalSpent);
      console.log('  平均消费:', data.data.averageSpent.toFixed(2));
      console.log('  来源分布:');
      data.data.sourceDistribution.forEach(item => {
        console.log(`    ${item.source}: ${item.count}`);
      });
      return true;
    } else {
      console.log('❌ 获取统计失败:', data.error);
      return false;
    }
  },

  deleteCustomer: async () => {
    if (!createdCustomerId) {
      console.log('\n⚠️  测试 10: 跳过（未创建客户）');
      return true;
    }

    console.log('\n🧪 测试 10: 删除客户');
    const response = await fetch(
      `${API_BASE_URL}/customers/${createdCustomerId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      }
    );
    const data = await response.json();

    if (data.success) {
      console.log('✅ 删除成功');
      return true;
    } else {
      console.log('❌ 删除失败:', data.error);
      return false;
    }
  },
};

// 运行所有测试
async function runTests() {
  console.log('🚀 开始测试客户管理 API...\n');
  console.log('='.repeat(60));

  let passedTests = 0;
  let totalTests = 0;

  try {
    // 先登录获取 token
    console.log('\n🔐 正在登录...');
    authToken = await login();
    if (authToken) {
      console.log('✅ 登录成功');
    } else {
      console.log('❌ 登录失败');
      return;
    }

    // 运行所有测试
    for (const [name, testFn] of Object.entries(tests)) {
      totalTests++;
      const passed = await testFn();
      if (passed) passedTests++;

      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error.message);
  }

  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 测试结果: ${passedTests}/${totalTests} 通过`);

  if (passedTests === totalTests) {
    console.log('✅ 所有测试通过！\n');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} 个测试失败\n`);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// 主函数
(async () => {
  console.log('🔍 检查服务器状态...');

  const isServerRunning = await checkServer();

  if (!isServerRunning) {
    console.log('❌ 服务器未运行！');
    console.log('请先运行: cd backend && npm run dev');
    process.exit(1);
  }

  console.log('✅ 服务器正在运行\n');

  await runTests();
})();
