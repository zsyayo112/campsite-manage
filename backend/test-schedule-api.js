/**
 * 行程排期 API 测试脚本
 * 测试所有排期相关的接口
 */

const API_BASE = 'http://localhost:5000/api';

let authToken = '';
let testScheduleId = null;
let testCoachId = null;
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

// 生成测试用的时间
function getTestDateTime(date, hour, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function runTests() {
  console.log('🧪 开始测试行程排期 API...\n');

  // 测试日期
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 1); // 明天
  const testDateStr = testDate.toISOString().split('T')[0];

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

  // ========== 获取项目（用于后续测试） ==========
  console.log('\n--- 获取项目信息 ---');

  const projectsRes = await request('GET', '/projects');
  test(
    '获取项目列表',
    projectsRes.status === 200 && projectsRes.data.success,
    JSON.stringify(projectsRes.data)
  );
  // 项目 API 返回格式可能是 list 或 items
  const projectList = projectsRes.data.data?.list || projectsRes.data.data?.items || [];
  if (projectList.length > 0) {
    testProjectId = projectList[0].id;
    console.log(`   使用项目ID: ${testProjectId}`);
  }

  // ========== 教练管理 ==========
  console.log('\n--- 教练管理 ---');

  // 获取教练列表
  const coachesRes = await request('GET', '/schedules/coaches');
  test(
    '获取教练列表',
    coachesRes.status === 200 && coachesRes.data.success,
    JSON.stringify(coachesRes.data)
  );

  // 创建教练
  const createCoachRes = await request('POST', '/schedules/coaches', {
    name: '测试教练',
    phone: '13800138000',
    specialties: ['冰钓', '滑雪'],
    status: 'on_duty',
  });
  test(
    '创建教练',
    createCoachRes.status === 201 && createCoachRes.data.success,
    JSON.stringify(createCoachRes.data)
  );
  testCoachId = createCoachRes.data.data?.id;
  console.log(`   创建的教练ID: ${testCoachId}`);

  // 更新教练
  if (testCoachId) {
    const updateCoachRes = await request('PUT', `/schedules/coaches/${testCoachId}`, {
      name: '更新后的教练',
      status: 'on_duty',
    });
    test(
      '更新教练',
      updateCoachRes.status === 200 && updateCoachRes.data.success,
      JSON.stringify(updateCoachRes.data)
    );
  }

  // ========== 每日排期 ==========
  console.log('\n--- 每日排期 ---');

  // 获取每日排期（空日期）
  const dailyRes = await request('GET', `/schedules/daily?date=${testDateStr}`);
  test(
    '获取每日排期',
    dailyRes.status === 200 && dailyRes.data.success && dailyRes.data.data?.timeline,
    JSON.stringify(dailyRes.data)
  );
  console.log(`   时间轴项目数: ${dailyRes.data.data?.timeline?.length || 0}`);

  // 缺少日期参数
  const noDailyRes = await request('GET', '/schedules/daily');
  test(
    '获取排期-缺少日期返回错误',
    noDailyRes.status === 400,
    JSON.stringify(noDailyRes.data)
  );

  // ========== 创建排期 ==========
  console.log('\n--- 创建排期 ---');

  if (testProjectId) {
    const createRes = await request('POST', '/schedules', {
      date: testDateStr,
      projectId: testProjectId,
      startTime: getTestDateTime(testDateStr, 10, 0),
      endTime: getTestDateTime(testDateStr, 12, 0),
      coachId: testCoachId,
      participantCount: 10,
      notes: 'API测试创建的排期',
    });
    test(
      '创建排期',
      createRes.status === 201 && createRes.data.success,
      JSON.stringify(createRes.data)
    );
    testScheduleId = createRes.data.data?.id;
    console.log(`   创建的排期ID: ${testScheduleId}`);

    // 缺少必填字段
    const missingRes = await request('POST', '/schedules', {
      date: testDateStr,
      projectId: testProjectId,
    });
    test(
      '创建排期-缺少必填字段返回错误',
      missingRes.status === 400,
      JSON.stringify(missingRes.data)
    );
  }

  // ========== 获取排期详情 ==========
  console.log('\n--- 排期详情 ---');

  if (testScheduleId) {
    const detailRes = await request('GET', `/schedules/${testScheduleId}`);
    test(
      '获取排期详情',
      detailRes.status === 200 && detailRes.data.success && detailRes.data.data?.id === testScheduleId,
      JSON.stringify(detailRes.data)
    );
  }

  // 不存在的排期
  const notFoundRes = await request('GET', '/schedules/99999');
  test(
    '获取不存在的排期返回404',
    notFoundRes.status === 404,
    JSON.stringify(notFoundRes.data)
  );

  // ========== 冲突检测 ==========
  console.log('\n--- 冲突检测 ---');

  if (testProjectId && testCoachId) {
    // 测试教练时间冲突
    const coachConflictRes = await request('POST', '/schedules/check-conflicts', {
      date: testDateStr,
      projectId: testProjectId,
      startTime: getTestDateTime(testDateStr, 10, 30), // 与之前排期重叠
      endTime: getTestDateTime(testDateStr, 11, 30),
      coachId: testCoachId,
      participantCount: 5,
    });
    test(
      '检测教练时间冲突',
      coachConflictRes.status === 200 && coachConflictRes.data.success,
      JSON.stringify(coachConflictRes.data)
    );
    const hasCoachConflict = coachConflictRes.data.data?.conflicts?.some(c => c.type === 'coach');
    test(
      '教练冲突被正确识别',
      hasCoachConflict,
      `冲突列表: ${JSON.stringify(coachConflictRes.data.data?.conflicts)}`
    );

    // 测试无冲突的时段
    const noConflictRes = await request('POST', '/schedules/check-conflicts', {
      date: testDateStr,
      projectId: testProjectId,
      startTime: getTestDateTime(testDateStr, 14, 0), // 不重叠
      endTime: getTestDateTime(testDateStr, 16, 0),
      coachId: testCoachId,
      participantCount: 5,
    });
    test(
      '无冲突时段检测',
      noConflictRes.status === 200 && !noConflictRes.data.data?.hasConflict,
      JSON.stringify(noConflictRes.data)
    );
  }

  // ========== 更新排期 ==========
  console.log('\n--- 更新排期 ---');

  if (testScheduleId) {
    // 更新时间（模拟拖拽）
    const updateRes = await request('PUT', `/schedules/${testScheduleId}`, {
      startTime: getTestDateTime(testDateStr, 9, 0),
      endTime: getTestDateTime(testDateStr, 11, 0),
      participantCount: 15,
    });
    test(
      '更新排期（拖拽调整时间）',
      updateRes.status === 200 && updateRes.data.success,
      JSON.stringify(updateRes.data)
    );

    // 更新状态
    const statusRes = await request('PUT', `/schedules/${testScheduleId}/status`, {
      status: 'in_progress',
    });
    test(
      '更新排期状态',
      statusRes.status === 200 && statusRes.data.success && statusRes.data.data?.status === 'in_progress',
      JSON.stringify(statusRes.data)
    );

    // 无效状态
    const invalidStatusRes = await request('PUT', `/schedules/${testScheduleId}/status`, {
      status: 'invalid_status',
    });
    test(
      '更新无效状态返回错误',
      invalidStatusRes.status === 400,
      JSON.stringify(invalidStatusRes.data)
    );
  }

  // ========== 教练可用时段 ==========
  console.log('\n--- 教练可用时段 ---');

  if (testCoachId) {
    const availRes = await request('GET', `/schedules/coaches/${testCoachId}/availability?date=${testDateStr}`);
    test(
      '获取教练可用时段',
      availRes.status === 200 && availRes.data.success && Array.isArray(availRes.data.data?.busySlots),
      JSON.stringify(availRes.data)
    );
    console.log(`   忙碌时段数: ${availRes.data.data?.busySlots?.length || 0}`);
  }

  // ========== 创建冲突排期测试 ==========
  console.log('\n--- 冲突排期创建 ---');

  if (testProjectId && testCoachId) {
    // 尝试创建与现有排期教练冲突的排期
    const conflictCreateRes = await request('POST', '/schedules', {
      date: testDateStr,
      projectId: testProjectId,
      startTime: getTestDateTime(testDateStr, 9, 30), // 与更新后的排期重叠
      endTime: getTestDateTime(testDateStr, 10, 30),
      coachId: testCoachId, // 同一教练
      participantCount: 5,
    });
    test(
      '创建冲突排期返回409',
      conflictCreateRes.status === 409,
      JSON.stringify(conflictCreateRes.data)
    );

    // 使用 skipConflictCheck 强制创建
    const forceCreateRes = await request('POST', '/schedules', {
      date: testDateStr,
      projectId: testProjectId,
      startTime: getTestDateTime(testDateStr, 9, 30),
      endTime: getTestDateTime(testDateStr, 10, 30),
      coachId: testCoachId,
      participantCount: 5,
      skipConflictCheck: true,
    });
    test(
      '强制创建排期（跳过冲突检测）',
      forceCreateRes.status === 201,
      JSON.stringify(forceCreateRes.data)
    );

    // 清理强制创建的排期
    if (forceCreateRes.data.data?.id) {
      await request('DELETE', `/schedules/${forceCreateRes.data.data.id}`);
    }
  }

  // ========== 删除排期 ==========
  console.log('\n--- 删除排期 ---');

  if (testScheduleId) {
    const deleteRes = await request('DELETE', `/schedules/${testScheduleId}`);
    test(
      '删除排期',
      deleteRes.status === 200 && deleteRes.data.success,
      JSON.stringify(deleteRes.data)
    );

    // 验证已删除
    const verifyRes = await request('GET', `/schedules/${testScheduleId}`);
    test(
      '验证排期已删除',
      verifyRes.status === 404,
      JSON.stringify(verifyRes.data)
    );
  }

  // 删除不存在的排期
  const deleteNotFoundRes = await request('DELETE', '/schedules/99999');
  test(
    '删除不存在的排期返回404',
    deleteNotFoundRes.status === 404,
    JSON.stringify(deleteNotFoundRes.data)
  );

  // ========== 权限测试 ==========
  console.log('\n--- 权限测试 ---');

  // 未认证访问
  const noAuthRes = await request('GET', `/schedules/daily?date=${testDateStr}`, null, null);
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
