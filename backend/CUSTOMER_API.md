# 客户管理 API 文档

## 基础信息

- **Base URL**: `http://localhost:5000/api/customers`
- **认证**: 需要 JWT Bearer Token
- **权限**: 不同接口需要不同角色权限

---

## 接口列表

### 1. 获取客户列表

**接口**: `GET /api/customers`

**描述**: 获取客户列表，支持分页、搜索、筛选、排序

**权限**: `admin`, `operator`, `marketer`

**请求头**:
```
Authorization: Bearer {token}
```

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量（最大100） |
| search | string | 否 | - | 搜索关键词（姓名或手机号） |
| source | string | 否 | - | 客户来源筛选（xiaohongshu/wechat/other） |
| sortBy | string | 否 | createdAt | 排序字段（name/createdAt/lastVisitDate/totalSpent/visitCount） |
| order | string | 否 | desc | 排序方向（asc/desc） |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "张三",
        "phone": "13800138000",
        "wechat": "zhangsan",
        "source": "xiaohongshu",
        "tags": ["VIP", "冬季客户"],
        "notes": "喜欢冰雪项目",
        "firstVisitDate": "2026-01-01T00:00:00.000Z",
        "lastVisitDate": "2026-01-15T00:00:00.000Z",
        "totalSpent": 1580.00,
        "visitCount": 3,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-15T00:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

**示例**:
```bash
# 基础查询
curl -X GET "http://localhost:5000/api/customers" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 搜索客户
curl -X GET "http://localhost:5000/api/customers?search=张三" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 按来源筛选
curl -X GET "http://localhost:5000/api/customers?source=xiaohongshu" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 分页 + 排序
curl -X GET "http://localhost:5000/api/customers?page=2&pageSize=10&sortBy=totalSpent&order=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. 获取客户详情

**接口**: `GET /api/customers/:id`

**描述**: 获取单个客户的详细信息，包含订单历史

**权限**: `admin`, `operator`

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 客户ID |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "phone": "13800138000",
    "wechat": "zhangsan",
    "source": "xiaohongshu",
    "tags": ["VIP", "冬季客户"],
    "notes": "喜欢冰雪项目",
    "firstVisitDate": "2026-01-01T00:00:00.000Z",
    "lastVisitDate": "2026-01-15T00:00:00.000Z",
    "totalSpent": 1580.00,
    "visitCount": 3,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z",
    "orders": [
      {
        "id": 1,
        "orderNumber": "20260115001",
        "orderDate": "2026-01-10T00:00:00.000Z",
        "visitDate": "2026-01-15T00:00:00.000Z",
        "totalAmount": 580.00,
        "status": "completed",
        "paymentStatus": "paid"
      }
    ]
  }
}
```

**错误响应**:
- **404 Not Found** - 客户不存在

**示例**:
```bash
curl -X GET "http://localhost:5000/api/customers/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. 创建客户

**接口**: `POST /api/customers`

**描述**: 创建新客户

**权限**: `admin`, `operator`

**请求体**:
```json
{
  "name": "张三",
  "phone": "13800138000",
  "wechat": "zhangsan",
  "source": "xiaohongshu",
  "tags": ["VIP", "冬季客户"],
  "notes": "喜欢冰雪项目"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 客户姓名 |
| phone | string | 是 | 手机号（11位，格式验证） |
| wechat | string | 否 | 微信号 |
| source | string | 是 | 客户来源（xiaohongshu/wechat/other） |
| tags | array | 否 | 标签数组 |
| notes | string | 否 | 备注 |

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "phone": "13800138000",
    "wechat": "zhangsan",
    "source": "xiaohongshu",
    "tags": ["VIP", "冬季客户"],
    "notes": "喜欢冰雪项目",
    "firstVisitDate": null,
    "lastVisitDate": null,
    "totalSpent": 0.00,
    "visitCount": 0,
    "createdAt": "2026-01-09T00:00:00.000Z",
    "updatedAt": "2026-01-09T00:00:00.000Z"
  },
  "message": "客户创建成功"
}
```

**错误响应**:

- **400 Bad Request** - 参数验证失败
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "手机号格式不正确"
  }
}
```

- **409 Conflict** - 手机号已存在
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_PHONE",
    "message": "该手机号已存在"
  }
}
```

**示例**:
```bash
curl -X POST "http://localhost:5000/api/customers" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "phone": "13800138000",
    "source": "xiaohongshu",
    "tags": ["VIP"]
  }'
```

---

### 4. 更新客户

**接口**: `PUT /api/customers/:id`

**描述**: 更新客户信息

**权限**: `admin`, `operator`

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 客户ID |

**请求体**:
```json
{
  "name": "张三",
  "phone": "13800138000",
  "wechat": "zhangsan_new",
  "source": "wechat",
  "tags": ["VIP", "常客"],
  "notes": "更新的备注信息"
}
```

**字段说明**: 所有字段都是可选的，只更新提供的字段

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "phone": "13800138000",
    "wechat": "zhangsan_new",
    "source": "wechat",
    "tags": ["VIP", "常客"],
    "notes": "更新的备注信息",
    "firstVisitDate": "2026-01-01T00:00:00.000Z",
    "lastVisitDate": "2026-01-15T00:00:00.000Z",
    "totalSpent": 1580.00,
    "visitCount": 3,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-09T00:00:00.000Z"
  },
  "message": "客户更新成功"
}
```

**错误响应**:
- **404 Not Found** - 客户不存在
- **409 Conflict** - 手机号与其他客户重复

**示例**:
```bash
curl -X PUT "http://localhost:5000/api/customers/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "更新的备注"
  }'
```

---

### 5. 删除客户

**接口**: `DELETE /api/customers/:id`

**描述**: 删除客户（仅当无关联订单时）

**权限**: `admin`

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 客户ID |

**成功响应** (200):
```json
{
  "success": true,
  "message": "客户删除成功"
}
```

**错误响应**:

- **404 Not Found** - 客户不存在
- **400 Bad Request** - 客户有关联订单
```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_HAS_ORDERS",
    "message": "该客户有关联订单，无法删除",
    "details": {
      "orderCount": 5
    }
  }
}
```

**示例**:
```bash
curl -X DELETE "http://localhost:5000/api/customers/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. 获取客户统计

**接口**: `GET /api/customers/stats`

**描述**: 获取客户统计信息

**权限**: `admin`, `operator`

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "totalCustomers": 150,
    "totalSpent": 98500.50,
    "averageSpent": 656.67,
    "sourceDistribution": [
      {
        "source": "xiaohongshu",
        "count": 80
      },
      {
        "source": "wechat",
        "count": 50
      },
      {
        "source": "other",
        "count": 20
      }
    ]
  }
}
```

**示例**:
```bash
curl -X GET "http://localhost:5000/api/customers/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 数据验证规则

### 手机号验证
- 格式：11位数字
- 规则：1[3-9]xxxxxxxxx
- 示例：13800138000 ✅ | 12345678901 ❌

### 微信号验证
- 格式：6-20位
- 规则：字母开头，可包含字母、数字、-、_
- 示例：zhangsan123 ✅ | 123abc ❌

### 客户来源
- 有效值：`xiaohongshu`, `wechat`, `other`

### 标签
- 类型：字符串数组
- 示例：`["VIP", "常客", "冬季"]`

---

## 权限说明

| 角色 | 查看列表 | 查看详情 | 创建 | 更新 | 删除 | 统计 |
|------|---------|---------|------|------|------|------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| operator | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| marketer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| driver | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| coach | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 前端集成示例

### 使用 Axios

```javascript
// src/api/customer.js
import api from './axios';

export const customerAPI = {
  // 获取客户列表
  getCustomers: async (params) => {
    const response = await api.get('/customers', { params });
    return response.data.data;
  },

  // 获取客户详情
  getCustomer: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },

  // 创建客户
  createCustomer: async (data) => {
    const response = await api.post('/customers', data);
    return response.data.data;
  },

  // 更新客户
  updateCustomer: async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data.data;
  },

  // 删除客户
  deleteCustomer: async (id) => {
    await api.delete(`/customers/${id}`);
  },

  // 获取统计
  getStats: async () => {
    const response = await api.get('/customers/stats');
    return response.data.data;
  },
};
```

### React Hook 示例

```javascript
// src/hooks/useCustomers.js
import { useState, useEffect } from 'react';
import { customerAPI } from '../api/customer';

export function useCustomers(params) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const data = await customerAPI.getCustomers(params);
        setCustomers(data.items);
        setPagination({
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
        });
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [JSON.stringify(params)]);

  return { customers, loading, pagination };
}
```

---

## 常见错误处理

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供认证令牌"
  }
}
```
**处理**: 检查是否已登录，token 是否有效

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足"
  }
}
```
**处理**: 当前用户角色无权访问该接口

### 400 Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "手机号格式不正确"
  }
}
```
**处理**: 修正请求参数

---

## 测试用例

```bash
# 1. 创建客户
curl -X POST "http://localhost:5000/api/customers" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试客户",
    "phone": "13900139000",
    "source": "xiaohongshu"
  }'

# 2. 获取客户列表
curl -X GET "http://localhost:5000/api/customers?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. 搜索客户
curl -X GET "http://localhost:5000/api/customers?search=测试" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. 更新客户
curl -X PUT "http://localhost:5000/api/customers/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "更新测试"}'

# 5. 获取统计
curl -X GET "http://localhost:5000/api/customers/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**文档版本**: v1.0
**最后更新**: 2026-01-09
**相关文档**: [认证 API](./API_DOCUMENTATION.md)
