/**
 * 套餐管理 API 测试脚本
 * 测试所有套餐相关的接口
 */

const API_BASE = 'http://localhost:5000/api';

let authToken = '';
let testPackageId = null;
let testProjectId = null;

// 测试统计
let passedTests = 0;
let failedTests = 0;

async function request(method, path, body = null, token = authToken) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

function test(name, passed, details = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    passedTests++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   详情: ${details}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('🧪 开始测试套餐管理 API...\n');

  // ========== 认证 ==========
  console.log('--- 认证 ---');

  const loginRes = await request('POST', '/auth/login', {
    username: 'admin',
    password: 'admin123',
  });
  test(
    '管理员登录',
    loginRes.status === 200 && loginRes.data.success,
    JSON.stringify(loginRes.data)
  );
  authToken = loginRes.data.data?.token;

  // ========== 获取项目列表（用于后续测试） ==========
  console.log('\n--- 获取项目信息 ---');

  const projectsRes = await request('GET', '/projects');
  test(
    '获取项目列表',
    projectsRes.status === 200 && projectsRes.data.success,
    JSON.stringify(projectsRes.data)
  );
  if (projectsRes.data.data?.list?.length > 0) {
    testProjectId = projectsRes.data.data.list[0].id;
    console.log(`   使用项目ID: ${testProjectId}`);
  }

  // ========== 套餐列表 ==========
  console.log('\n--- 套餐列表 ---');

  const listRes = await request('GET', '/packages');
  test(
    '获取套餐列表',
    listRes.status === 200 && listRes.data.success && Array.isArray(listRes.data.data?.items),
    JSON.stringify(listRes.data)
  );
  console.log(`   套餐数量: ${listRes.data.data?.items?.length || 0}`);

  // 测试分页
  const paginatedRes = await request('GET', '/packages?page=1&pageSize=2');
  test(
    '套餐列表分页',
    paginatedRes.status === 200 && paginatedRes.data.success,
    JSON.stringify(paginatedRes.data)
  );

  // 测试筛选
  const activeRes = await request('GET', '/packages?isActive=true');
  test(
    '筛选激活套餐',
    activeRes.status === 200 && activeRes.data.success,
    JSON.stringify(activeRes.data)
  );

  // ========== 创建套餐 ==========
  console.log('\n--- 创建套餐 ---');

  const createRes = await request('POST', '/packages', {
    name: '测试套餐',
    description: 'API测试创建的套餐',
    price: 299,
    minPeople: 2,
    isActive: true,
    sortOrder: 100,
    projectIds: testProjectId ? [testProjectId] : [],
  });
  test(
    '创建套餐',
    createRes.status === 201 && createRes.data.success,
    JSON.stringify(createRes.data)
  );
  testPackageId = createRes.data.data?.id;
  console.log(`   创建的套餐ID: ${testPackageId}`);

  // 测试缺少必填字段
  const missingNameRes = await request('POST', '/packages', {
    price: 100,
  });
  test(
    '创建套餐-缺少名称返回错误',
    missingNameRes.status === 400,
    JSON.stringify(missingNameRes.data)
  );

  const missingPriceRes = await request('POST', '/packages', {
    name: '无价格套餐',
  });
  test(
    '创建套餐-缺少价格返回错误',
    missingPriceRes.status === 400,
    JSON.stringify(missingPriceRes.data)
  );

  // ========== 获取套餐详情 ==========
  console.log('\n--- 套餐详情 ---');

  if (testPackageId) {
    const detailRes = await request('GET', `/packages/${testPackageId}`);
    test(
      '获取套餐详情',
      detailRes.status === 200 && detailRes.data.success && detailRes.data.data?.id === testPackageId,
      JSON.stringify(detailRes.data)
    );

    // 验证包含项目信息
    test(
      '套餐详情包含项目列表',
      Array.isArray(detailRes.data.data?.packageItems),
      JSON.stringify(detailRes.data.data?.packageItems)
    );
  }

  // 测试不存在的套餐
  const notFoundRes = await request('GET', '/packages/99999');
  test(
    '获取不存在的套餐返回404',
    notFoundRes.status === 404,
    JSON.stringify(notFoundRes.data)
  );

  // ========== 更新套餐 ==========
  console.log('\n--- 更新套餐 ---');

  if (testPackageId) {
    const updateRes = await request('PUT', `/packages/${testPackageId}`, {
      name: '更新后的测试套餐',
      price: 399,
      description: '已更新的描述',
    });
    test(
      '更新套餐',
      updateRes.status === 200 && updateRes.data.success && updateRes.data.data?.name === '更新后的测试套餐',
      JSON.stringify(updateRes.data)
    );

    // 验证价格更新
    test(
      '套餐价格已更新',
      parseFloat(updateRes.data.data?.price) === 399,
      `价格: ${updateRes.data.data?.price}`
    );
  }

  // 更新不存在的套餐
  const updateNotFoundRes = await request('PUT', '/packages/99999', {
    name: '不存在的套餐',
  });
  test(
    '更新不存在的套餐返回404',
    updateNotFoundRes.status === 404,
    JSON.stringify(updateNotFoundRes.data)
  );

  // ========== 套餐项目管理 ==========
  console.log('\n--- 套餐项目管理 ---');

  if (testPackageId && testProjectId) {
    // 先移除项目（如果存在）
    await request('DELETE', `/packages/${testPackageId}/items/${testProjectId}`);

    // 添加项目到套餐
    const addItemRes = await request('POST', `/packages/${testPackageId}/items`, {
      projectId: testProjectId,
    });
    test(
      '添加项目到套餐',
      addItemRes.status === 200 || addItemRes.status === 201,
      JSON.stringify(addItemRes.data)
    );

    // 重复添加应该返回错误
    const duplicateItemRes = await request('POST', `/packages/${testPackageId}/items`, {
      projectId: testProjectId,
    });
    test(
      '重复添加项目返回错误',
      duplicateItemRes.status === 400,
      JSON.stringify(duplicateItemRes.data)
    );

    // 移除项目
    const removeItemRes = await request('DELETE', `/packages/${testPackageId}/items/${testProjectId}`);
    test(
      '从套餐移除项目',
      removeItemRes.status === 200,
      JSON.stringify(removeItemRes.data)
    );

    // 移除不存在的项目
    const removeNotFoundRes = await request('DELETE', `/packages/${testPackageId}/items/99999`);
    test(
      '移除不存在的项目返回404',
      removeNotFoundRes.status === 404,
      JSON.stringify(removeNotFoundRes.data)
    );
  }

  // ========== 价格计算 ==========
  console.log('\n--- 价格计算 ---');

  // 使用现有套餐计算价格
  const existingPackages = listRes.data.data?.items || [];
  const packageWithItems = existingPackages.find(p => p.packageItems && p.packageItems.length > 0);

  if (packageWithItems) {
    const calcRes = await request('POST', '/packages/calculate-price', {
      packageId: packageWithItems.id,
      peopleCount: 3,
    });
    test(
      '计算套餐价格',
      calcRes.status === 200 && calcRes.data.success && calcRes.data.data?.summary?.totalAmount > 0,
      JSON.stringify(calcRes.data)
    );
    console.log(`   套餐: ${packageWithItems.name}, 人数: 3, 总价: ${calcRes.data.data?.summary?.totalAmount}`);
  }

  // 测试自由组合价格计算
  if (testProjectId) {
    const customCalcRes = await request('POST', '/packages/calculate-price', {
      customProjectIds: [testProjectId],
      peopleCount: 2,
    });
    test(
      '计算自由组合价格',
      customCalcRes.status === 200 && customCalcRes.data.success,
      JSON.stringify(customCalcRes.data)
    );
    console.log(`   自由组合项目数: 1, 人数: 2, 总价: ${customCalcRes.data.data?.summary?.totalAmount}`);
  }

  // 测试人数为0
  const zeroPeopleRes = await request('POST', '/packages/calculate-price', {
    packageId: 1,
    peopleCount: 0,
  });
  test(
    '计算价格-人数为0返回错误',
    zeroPeopleRes.status === 400,
    JSON.stringify(zeroPeopleRes.data)
  );

  // ========== 删除套餐 ==========
  console.log('\n--- 删除套餐 ---');

  if (testPackageId) {
    const deleteRes = await request('DELETE', `/packages/${testPackageId}`);
    test(
      '删除套餐',
      deleteRes.status === 200 && deleteRes.data.success,
      JSON.stringify(deleteRes.data)
    );

    // 验证已删除
    const verifyDeleteRes = await request('GET', `/packages/${testPackageId}`);
    test(
      '验证套餐已删除',
      verifyDeleteRes.status === 404,
      JSON.stringify(verifyDeleteRes.data)
    );
  }

  // 删除不存在的套餐
  const deleteNotFoundRes = await request('DELETE', '/packages/99999');
  test(
    '删除不存在的套餐返回404',
    deleteNotFoundRes.status === 404,
    JSON.stringify(deleteNotFoundRes.data)
  );

  // ========== 权限测试 ==========
  console.log('\n--- 权限测试 ---');

  // 未认证访问
  const noAuthRes = await request('GET', '/packages', null, null);
  test(
    '未认证访问返回401',
    noAuthRes.status === 401,
    JSON.stringify(noAuthRes.data)
  );

  // ========== 测试结果 ==========
  console.log('\n========================================');
  console.log(`📊 测试结果: ${passedTests}/${passedTests + failedTests} 通过`);
  console.log(`   ✅ 通过: ${passedTests}`);
  console.log(`   ❌ 失败: ${failedTests}`);
  console.log('========================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
