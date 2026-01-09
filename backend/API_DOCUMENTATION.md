# API 文档 - 营地管理系统

## 基础信息

- **Base URL**: `http://localhost:5000/api`
- **环境**: Development
- **认证方式**: JWT Bearer Token

---

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { ... }
  }
}
```

### 常见错误码
- `VALIDATION_ERROR` - 数据验证错误
- `UNAUTHORIZED` - 未授权（未登录或 token 无效）
- `FORBIDDEN` - 权限不足
- `NOT_FOUND` - 资源不存在
- `SERVER_ERROR` - 服务器内部错误
- `INVALID_CREDENTIALS` - 用户名或密码错误
- `TOKEN_EXPIRED` - Token 已过期
- `INVALID_TOKEN` - 无效的 Token

---

## 认证接口

### 1. 用户登录

**接口**: `POST /api/auth/login`

**描述**: 用户登录，返回 JWT token

**请求头**: 无需认证

**请求体**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "realName": "系统管理员",
      "phone": "13800138000"
    }
  },
  "message": "登录成功"
}
```

**错误响应**:

- **400 Bad Request** - 参数缺失
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "用户名和密码不能为空",
    "details": {
      "username": "用户名不能为空"
    }
  }
}
```

- **401 Unauthorized** - 用户名或密码错误
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "用户名或密码错误"
  }
}
```

**示例代码**:

```bash
# cURL
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

```javascript
// JavaScript (Fetch API)
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123',
  }),
});

const data = await response.json();
console.log(data.data.token); // 保存 token
```

```javascript
// Axios
import axios from 'axios';

const response = await axios.post('http://localhost:5000/api/auth/login', {
  username: 'admin',
  password: 'admin123',
});

const { token, user } = response.data.data;
localStorage.setItem('token', token);
```

---

### 2. 用户登出

**接口**: `POST /api/auth/logout`

**描述**: 用户登出（前端需删除存储的 token）

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**: 无

**成功响应** (200):
```json
{
  "success": true,
  "message": "登出成功"
}
```

**错误响应**:

- **401 Unauthorized** - 未提供 token 或 token 无效
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供认证令牌"
  }
}
```

**示例代码**:

```bash
# cURL
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

```javascript
// JavaScript (Fetch API)
const token = localStorage.getItem('token');

await fetch('http://localhost:5000/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// 删除本地存储的 token
localStorage.removeItem('token');
```

---

### 3. 获取当前用户信息

**接口**: `GET /api/auth/me`

**描述**: 获取当前登录用户的详细信息

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**: 无

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "realName": "系统管理员",
    "phone": "13800138000",
    "createdAt": "2026-01-09T02:00:00.000Z",
    "updatedAt": "2026-01-09T02:00:00.000Z"
  }
}
```

**错误响应**:

- **401 Unauthorized** - token 无效或已过期
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "认证令牌已过期"
  }
}
```

- **404 Not Found** - 用户不存在
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在"
  }
}
```

**示例代码**:

```bash
# cURL
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

```javascript
// JavaScript (Fetch API)
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(data.data); // 用户信息
```

---

### 4. 修改密码

**接口**: `PUT /api/auth/password`

**描述**: 修改当前用户密码

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "oldPassword": "admin123",
  "newPassword": "newPassword123"
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 旧密码 |
| newPassword | string | 是 | 新密码（最少6位） |

**成功响应** (200):
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

**错误响应**:

- **400 Bad Request** - 参数验证失败
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "新密码长度不能少于 6 位"
  }
}
```

- **401 Unauthorized** - 旧密码错误
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "旧密码错误"
  }
}
```

**示例代码**:

```bash
# cURL
curl -X PUT http://localhost:5000/api/auth/password \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "admin123",
    "newPassword": "newPassword123"
  }'
```

```javascript
// JavaScript (Fetch API)
const token = localStorage.getItem('token');

await fetch('http://localhost:5000/api/auth/password', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    oldPassword: 'admin123',
    newPassword: 'newPassword123',
  }),
});
```

---

## 其他接口

### 健康检查

**接口**: `GET /api/health`

**描述**: 检查 API 服务状态

**请求头**: 无需认证

**成功响应** (200):
```json
{
  "status": "ok",
  "message": "Campsite Management System API is running",
  "timestamp": "2026-01-09T02:00:00.000Z"
}
```

---

## 认证流程

### 1. 登录流程

```
用户 -> POST /api/auth/login
     <- { token, user }
     -> 保存 token 到 localStorage
```

### 2. 访问受保护资源

```
用户 -> GET /api/resource
     -> 携带 Header: Authorization: Bearer {token}
服务器 -> 验证 token
      <- 返回数据 或 401 错误
```

### 3. Token 过期处理

```
用户 -> 请求受保护资源
服务器 <- 401 TOKEN_EXPIRED
用户 -> 清除本地 token
     -> 跳转到登录页
```

---

## 角色权限

### 用户角色
- `admin` - 管理员（所有权限）
- `operator` - 操作员（订单、客户管理）
- `driver` - 司机（查看接送排班）
- `coach` - 教练（查看行程安排）
- `marketer` - 营销人员（内容管理）

### 权限控制

使用 `requireRole` 中间件限制特定角色访问：

```javascript
// 示例：只允许管理员访问
router.get('/admin-only',
  authMiddleware,
  requireRole(['admin']),
  controller
);

// 示例：允许管理员和操作员访问
router.post('/orders',
  authMiddleware,
  requireRole(['admin', 'operator']),
  controller
);
```

---

## 环境变量配置

在 `.env` 文件中配置：

```env
# JWT 配置
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=24h

# 数据库配置
DATABASE_URL="file:./dev.db"

# 服务器配置
PORT=5000
NODE_ENV=development
```

---

## 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | admin | 系统管理员 |

⚠️ **安全提示**: 生产环境部署前务必修改默认密码！

---

## Postman 集合

可以导入以下 Postman 集合快速测试 API：

```json
{
  "info": {
    "name": "Campsite Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\"username\":\"admin\",\"password\":\"admin123\"}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

---

## 错误处理建议

### 前端错误处理

```javascript
// Axios 拦截器示例
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效，跳转登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

**文档版本**: v1.0
**最后更新**: 2026-01-09
**维护者**: 开发团队
