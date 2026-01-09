/**
 * 认证 API 测试脚本
 * 使用方法：node test-auth-api.js
 */

const API_BASE_URL = 'http://localhost:5000/api';

// 测试用例
const tests = {
  healthCheck: async () => {
    console.log('\n🧪 测试 1: Health Check');
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ 响应:', data);
    return data.status === 'ok';
  },

  login: async () => {
    console.log('\n🧪 测试 2: 用户登录');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });
    const data = await response.json();

    if (data.success) {
      console.log('✅ 登录成功');
      console.log('  Token:', data.data.token.substring(0, 50) + '...');
      console.log('  用户:', data.data.user);
      return data.data.token;
    } else {
      console.log('❌ 登录失败:', data.error);
      return null;
    }
  },

  loginWithWrongPassword: async () => {
    console.log('\n🧪 测试 3: 错误密码登录');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'wrongpassword',
      }),
    });
    const data = await response.json();

    if (!data.success && data.error.code === 'INVALID_CREDENTIALS') {
      console.log('✅ 正确返回错误:', data.error.message);
      return true;
    } else {
      console.log('❌ 未正确处理错误密码');
      return false;
    }
  },

  getCurrentUser: async (token) => {
    console.log('\n🧪 测试 4: 获取当前用户信息');
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();

    if (data.success) {
      console.log('✅ 获取用户信息成功');
      console.log('  用户:', data.data);
      return true;
    } else {
      console.log('❌ 获取用户信息失败:', data.error);
      return false;
    }
  },

  accessWithoutToken: async () => {
    console.log('\n🧪 测试 5: 无 Token 访问受保护接口');
    const response = await fetch(`${API_BASE_URL}/auth/me`);
    const data = await response.json();

    if (!data.success && data.error.code === 'UNAUTHORIZED') {
      console.log('✅ 正确拒绝未授权访问:', data.error.message);
      return true;
    } else {
      console.log('❌ 未正确处理未授权访问');
      return false;
    }
  },

  accessWithInvalidToken: async () => {
    console.log('\n🧪 测试 6: 无效 Token 访问');
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid_token_here' },
    });
    const data = await response.json();

    if (!data.success && data.error.code === 'INVALID_TOKEN') {
      console.log('✅ 正确拒绝无效 Token:', data.error.message);
      return true;
    } else {
      console.log('❌ 未正确处理无效 Token');
      return false;
    }
  },

  logout: async (token) => {
    console.log('\n🧪 测试 7: 用户登出');
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();

    if (data.success) {
      console.log('✅ 登出成功:', data.message);
      return true;
    } else {
      console.log('❌ 登出失败:', data.error);
      return false;
    }
  },
};

// 运行所有测试
async function runTests() {
  console.log('🚀 开始测试认证 API...\n');
  console.log('='.repeat(60));

  let passedTests = 0;
  let totalTests = 0;
  let token = null;

  try {
    // 测试 1: Health Check
    totalTests++;
    if (await tests.healthCheck()) passedTests++;

    // 测试 2: 正常登录
    totalTests++;
    token = await tests.login();
    if (token) passedTests++;

    // 测试 3: 错误密码
    totalTests++;
    if (await tests.loginWithWrongPassword()) passedTests++;

    // 测试 4: 获取当前用户 (需要 token)
    if (token) {
      totalTests++;
      if (await tests.getCurrentUser(token)) passedTests++;
    }

    // 测试 5: 无 Token 访问
    totalTests++;
    if (await tests.accessWithoutToken()) passedTests++;

    // 测试 6: 无效 Token 访问
    totalTests++;
    if (await tests.accessWithInvalidToken()) passedTests++;

    // 测试 7: 登出
    if (token) {
      totalTests++;
      if (await tests.logout(token)) passedTests++;
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
    console.log('请先运行: npm run dev');
    process.exit(1);
  }

  console.log('✅ 服务器正在运行\n');

  await runTests();
})();
