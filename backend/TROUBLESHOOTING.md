# 故障排查指南

## 问题：API 路由返回 404 错误

### 症状
- 服务器启动正常，没有错误信息
- 认证 API（`/api/auth/*`）工作正常
- 客户管理 API（`/api/customers/*`）返回 404 错误
- 路由代码语法正确，已在 server.js 中注册

### 根本原因
**旧的 Node.js 进程仍在运行旧版本的代码**

当你修改代码并重新启动服务器时，如果之前的 Node.js 进程没有被正确终止，系统可能会继续使用旧进程或出现端口冲突。

### 解决方案

#### Windows 系统

1. **终止所有 Node.js 进程**:
```bash
taskkill /F /IM node.exe
```

2. **启动新的服务器**:
```bash
cd backend
npm run dev
```

#### Linux/Mac 系统

1. **查找并终止 Node.js 进程**:
```bash
# 查找进程
ps aux | grep node

# 终止特定进程
kill -9 <PID>

# 或终止所有 node 进程
pkill -9 node
```

2. **启动新的服务器**:
```bash
cd backend
npm run dev
```

### 验证修复

运行测试脚本确认所有 API 正常工作:

```bash
cd backend
node test-customer-api.js
```

预期输出:
```
✅ 所有测试通过！
📊 测试结果: 10/10 通过
```

### 预防措施

1. **使用 nodemon 进行开发**（已配置）:
```bash
npm run dev  # 自动重启服务器
```

2. **确保在启动新服务器前终止旧进程**:
```bash
# Windows
taskkill /F /IM node.exe && npm run dev

# Linux/Mac
pkill node && npm run dev
```

3. **检查端口占用**:
```bash
# Windows
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000
```

### 常见错误

#### 错误 1: 端口已被占用
```
Error: listen EADDRINUSE: address already in use :::5000
```

**解决**: 终止占用端口的进程或更改 `.env` 中的 `PORT` 配置

#### 错误 2: 模块缓存问题
如果终止进程后仍有问题，清除 Node.js 模块缓存:

```bash
# 删除 node_modules 和重新安装
rm -rf node_modules package-lock.json
npm install
```

### 调试技巧

1. **启用详细日志**:
在 `.env` 中设置:
```env
NODE_ENV=development
```

2. **检查路由注册**:
在 `server.js` 中临时添加:
```javascript
console.log('Auth routes:', authRoutes);
console.log('Customer routes:', customerRoutes);
```

3. **测试单个端点**:
```bash
# 健康检查
curl http://localhost:5000/api/health

# 登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 客户统计（需要 token）
curl -X GET http://localhost:5000/api/customers/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**更新时间**: 2026-01-09
**状态**: 已解决 ✅
