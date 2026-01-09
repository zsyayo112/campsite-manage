# 订单管理 API 文档

## 概述

订单管理模块提供完整的订单生命周期管理功能，包括订单创建、查询、状态更新、删除和统计分析。

**Base URL**: `http://localhost:5000/api/orders`

**认证方式**: 所有接口都需要 JWT Token 认证

**权限控制**:
- 创建/更新订单: `admin`, `operator`
- 查询订单: `admin`, `operator`, `marketer`
- 删除订单: `admin`
- 查看统计: `admin`, `operator`

---

## 核心功能

### 1. 订单号生成规则

订单号格式：`ORD{YYYYMMDD}{4位序号}`

- 示例：`ORD202601090001`
- 每天从 0001 开始递增
- 自动生成，无需手动指定

### 2. 订单状态流转

```
pending (待处理)
    ↓
confirmed (已确认)
    ↓
completed (已完成)

任意状态 → cancelled (已取消)
```

**状态流转规则**:
- 已取消的订单不能更改为其他状态
- 已完成的订单只能更改为已取消状态
- 正常流程: pending → confirmed → completed

### 3. 支付状态

- `unpaid`: 未支付
- `paid`: 已支付
- `refunded`: 已退款

### 4. 自动金额计算

- 系统自动根据项目价格和数量计算订单金额
- 支持套餐选择或自由组合项目
- 创建订单时自动更新客户消费统计

---

## API 端点

### 1. 创建订单

**POST** `/api/orders`

创建新订单，自动生成订单号并计算金额。

**权限**: `admin`, `operator`

**请求体**:
```json
{
  "customerId": 1,
  "accommodationPlaceId": 2,
  "roomNumber": "1001",
  "packageId": 3,
  "visitDate": "2026-01-15",
  "peopleCount": 4,
  "items": [
    {
      "projectId": 2,
      "quantity": 2
    },
    {
      "projectId": 3,
      "quantity": 1
    }
  ],
  "notes": "客户要求早上出发"
}
```

**字段说明**:
- `customerId` (必填): 客户ID
- `accommodationPlaceId` (必填): 住宿地点ID
- `roomNumber` (可选): 房间号
- `packageId` (可选): 套餐ID
- `visitDate` (必填): 访问日期 (YYYY-MM-DD)
- `peopleCount` (必填): 人数
- `items` (必填或使用套餐): 订单项目列表
  - `projectId`: 项目ID
  - `quantity`: 数量
- `notes` (可选): 备注

**注意**:
- 如果选择了套餐 (`packageId`)，可以不提供 `items`，系统会自动使用套餐中的项目
- 如果既提供套餐又提供 `items`，将使用 `items`

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD202601090001",
    "customerId": 1,
    "accommodationPlaceId": 2,
    "roomNumber": "1001",
    "packageId": 3,
    "orderDate": "2026-01-09T10:30:00.000Z",
    "visitDate": "2026-01-15T00:00:00.000Z",
    "peopleCount": 4,
    "totalAmount": 480.00,
    "status": "pending",
    "paymentStatus": "unpaid",
    "notes": "客户要求早上出发",
    "createdAt": "2026-01-09T10:30:00.000Z",
    "updatedAt": "2026-01-09T10:30:00.000Z",
    "customer": {
      "id": 1,
      "name": "张三",
      "phone": "13900139000"
    },
    "accommodationPlace": {
      "id": 2,
      "name": "长白山国际度假村"
    },
    "package": {
      "id": 3,
      "name": "冰雪套餐"
    },
    "orderItems": [
      {
        "id": 1,
        "projectId": 2,
        "quantity": 2,
        "unitPrice": 120.00,
        "subtotal": 240.00,
        "project": {
          "id": 2,
          "name": "滑雪体验"
        }
      }
    ]
  },
  "message": "订单创建成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "缺少必填字段：customerId, accommodationPlaceId, visitDate, peopleCount"
  }
}
```

---

### 2. 获取订单列表

**GET** `/api/orders`

获取订单列表，支持分页、筛选、搜索、排序。

**权限**: `admin`, `operator`, `marketer`

**查询参数**:
```
page=1                           # 页码（默认: 1）
pageSize=20                      # 每页数量（默认: 20）
status=pending                   # 订单状态筛选
paymentStatus=unpaid             # 支付状态筛选
customerId=1                     # 客户ID筛选
accommodationPlaceId=2           # 住宿地点ID筛选
startDate=2026-01-01             # 访问日期开始
endDate=2026-01-31               # 访问日期结束
search=张三                       # 搜索（订单号/客户名/手机号）
sortBy=createdAt                 # 排序字段
order=desc                       # 排序方式 (asc/desc)
```

**排序字段**:
- `createdAt`: 创建时间（默认）
- `orderDate`: 订单日期
- `visitDate`: 访问日期
- `totalAmount`: 订单金额
- `orderNumber`: 订单号

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "orderNumber": "ORD202601090001",
        "customerId": 1,
        "totalAmount": 480.00,
        "status": "confirmed",
        "paymentStatus": "paid",
        "visitDate": "2026-01-15T00:00:00.000Z",
        "customer": {
          "id": 1,
          "name": "张三",
          "phone": "13900139000"
        },
        "accommodationPlace": {
          "id": 2,
          "name": "长白山国际度假村"
        },
        "orderItems": [...]
      }
    ],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

---

### 3. 获取订单详情

**GET** `/api/orders/:id`

获取指定订单的详细信息，包含完整的客户、住宿、项目信息。

**权限**: `admin`, `operator`, `marketer`

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD202601090001",
    "customerId": 1,
    "accommodationPlaceId": 2,
    "roomNumber": "1001",
    "packageId": 3,
    "orderDate": "2026-01-09T10:30:00.000Z",
    "visitDate": "2026-01-15T00:00:00.000Z",
    "peopleCount": 4,
    "totalAmount": 480.00,
    "status": "confirmed",
    "paymentStatus": "paid",
    "notes": "客户要求早上出发",
    "createdAt": "2026-01-09T10:30:00.000Z",
    "updatedAt": "2026-01-09T10:35:00.000Z",
    "customer": {
      "id": 1,
      "name": "张三",
      "phone": "13900139000",
      "wechat": "zhangsan123",
      "source": "xiaohongshu"
    },
    "accommodationPlace": {
      "id": 2,
      "name": "长白山国际度假村",
      "type": "external",
      "address": "长白山景区南坡",
      "distance": 5.0,
      "duration": 15
    },
    "package": {
      "id": 3,
      "name": "冰雪套餐",
      "description": "滑雪+温泉体验",
      "price": 460.00
    },
    "orderItems": [
      {
        "id": 1,
        "projectId": 2,
        "quantity": 2,
        "unitPrice": 120.00,
        "subtotal": 240.00,
        "scheduledTimeStart": null,
        "scheduledTimeEnd": null,
        "coachId": null,
        "project": {
          "id": 2,
          "name": "滑雪体验",
          "description": "2小时滑雪指导",
          "category": "winter",
          "price": 120.00,
          "duration": 120
        },
        "coach": null
      }
    ]
  }
}
```

**错误响应** (404):
```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "订单不存在"
  }
}
```

---

### 4. 更新订单状态

**PATCH** `/api/orders/:id/status`

更新订单的状态或支付状态。

**权限**: `admin`, `operator`

**请求体**:
```json
{
  "status": "confirmed",
  "paymentStatus": "paid"
}
```

**字段说明**:
- `status` (可选): 订单状态
  - `pending`: 待处理
  - `confirmed`: 已确认
  - `completed`: 已完成
  - `cancelled`: 已取消
- `paymentStatus` (可选): 支付状态
  - `unpaid`: 未支付
  - `paid`: 已支付
  - `refunded`: 已退款

**注意**: 至少提供一个字段

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD202601090001",
    "status": "confirmed",
    "paymentStatus": "paid",
    "customer": {
      "id": 1,
      "name": "张三",
      "phone": "13900139000"
    },
    "accommodationPlace": {
      "id": 2,
      "name": "长白山国际度假村"
    }
  },
  "message": "订单状态更新成功"
}
```

**错误响应** (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "已完成的订单不能更改状态"
  }
}
```

---

### 5. 删除订单

**DELETE** `/api/orders/:id`

删除订单。只能删除待处理或已取消的订单。

**权限**: `admin`

**限制**:
- 只能删除状态为 `pending` 或 `cancelled` 的订单
- 删除订单会级联删除关联的订单项
- 删除订单会更新客户的消费统计

**成功响应** (200):
```json
{
  "success": true,
  "message": "订单删除成功"
}
```

**错误响应** (400):
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_DELETE_ORDER",
    "message": "只能删除待处理或已取消的订单"
  }
}
```

---

### 6. 获取订单统计

**GET** `/api/orders/stats/summary`

获取订单统计摘要，包含订单总数、收入、状态分布等。

**权限**: `admin`, `operator`

**查询参数**:
```
startDate=2026-01-01             # 开始日期（可选）
endDate=2026-01-31               # 结束日期（可选）
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "totalOrders": 45,
    "totalRevenue": 21600.00,
    "statusDistribution": [
      {
        "status": "pending",
        "count": 5
      },
      {
        "status": "confirmed",
        "count": 20
      },
      {
        "status": "completed",
        "count": 18
      },
      {
        "status": "cancelled",
        "count": 2
      }
    ],
    "paymentDistribution": [
      {
        "paymentStatus": "unpaid",
        "count": 5
      },
      {
        "paymentStatus": "paid",
        "count": 38
      },
      {
        "paymentStatus": "refunded",
        "count": 2
      }
    ],
    "recentOrders": [
      {
        "id": 45,
        "orderNumber": "ORD202601090005",
        "totalAmount": 480.00,
        "status": "pending",
        "customer": {
          "id": 12,
          "name": "李四",
          "phone": "13900139001"
        }
      }
    ]
  }
}
```

---

## 数据验证

### 创建订单时的验证

1. **客户验证**:
   - 客户ID必须存在

2. **住宿地点验证**:
   - 住宿地点ID必须存在

3. **套餐验证**（如果选择套餐）:
   - 套餐ID必须存在
   - 套餐必须是激活状态 (`isActive = true`)

4. **项目验证**:
   - 所有项目ID必须存在
   - 所有项目必须是激活状态
   - 数量必须大于0

5. **金额计算**:
   - 根据项目单价和数量自动计算
   - 使用 Decimal 类型保证精度

### 状态转换验证

1. **从已取消状态**:
   - 不能更改为任何其他状态

2. **从已完成状态**:
   - 只能更改为已取消状态

3. **正常流程**:
   - pending → confirmed → completed
   - 任意状态 → cancelled

---

## 权限矩阵

| 操作 | admin | operator | marketer | driver | coach |
|-----|-------|----------|----------|--------|-------|
| 创建订单 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 查看订单列表 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 查看订单详情 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 更新订单状态 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 删除订单 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 查看统计 | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 错误代码

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| CUSTOMER_NOT_FOUND | 404 | 客户不存在 |
| ACCOMMODATION_NOT_FOUND | 404 | 住宿地点不存在 |
| PACKAGE_NOT_FOUND | 404 | 套餐不存在 |
| PACKAGE_INACTIVE | 400 | 套餐已停用 |
| ORDER_NOT_FOUND | 404 | 订单不存在 |
| INVALID_STATUS | 400 | 无效的订单状态 |
| INVALID_PAYMENT_STATUS | 400 | 无效的支付状态 |
| INVALID_STATUS_TRANSITION | 400 | 无效的状态转换 |
| CANNOT_DELETE_ORDER | 400 | 不能删除此订单 |
| CREATE_ORDER_ERROR | 500 | 创建订单失败 |
| GET_ORDERS_ERROR | 500 | 获取订单列表失败 |
| GET_ORDER_ERROR | 500 | 获取订单详情失败 |
| UPDATE_ORDER_STATUS_ERROR | 500 | 更新订单状态失败 |
| DELETE_ORDER_ERROR | 500 | 删除订单失败 |
| GET_ORDER_STATS_ERROR | 500 | 获取订单统计失败 |

---

## 前端集成示例

### React + Axios 示例

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加认证拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 创建订单
export const createOrder = async (orderData) => {
  const response = await api.post('/orders', orderData);
  return response.data;
};

// 获取订单列表
export const getOrders = async (params) => {
  const response = await api.get('/orders', { params });
  return response.data;
};

// 获取订单详情
export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

// 更新订单状态
export const updateOrderStatus = async (id, statusData) => {
  const response = await api.patch(`/orders/${id}/status`, statusData);
  return response.data;
};

// 删除订单
export const deleteOrder = async (id) => {
  const response = await api.delete(`/orders/${id}`);
  return response.data;
};

// 获取订单统计
export const getOrderStats = async (params) => {
  const response = await api.get('/orders/stats/summary', { params });
  return response.data;
};

// 使用示例
const OrderList = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getOrders({
          page: 1,
          pageSize: 10,
          status: 'pending'
        });
        setOrders(data.data.items);
      } catch (error) {
        console.error('获取订单失败:', error);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>{order.orderNumber}</div>
      ))}
    </div>
  );
};
```

---

## 测试

运行自动化测试脚本：

```bash
cd backend
node test-order-api.js
```

测试覆盖:
- ✅ 创建订单
- ✅ 获取订单列表
- ✅ 按状态筛选
- ✅ 搜索订单
- ✅ 获取订单详情
- ✅ 更新订单状态
- ✅ 更新支付状态
- ✅ 订单完成
- ✅ 获取订单统计
- ✅ 删除订单验证
- ✅ 无效状态转换验证

---

## 数据库关系

```
Order (订单)
  ├── Customer (客户) - 多对一
  ├── AccommodationPlace (住宿地点) - 多对一
  ├── Package (套餐) - 多对一，可选
  └── OrderItem (订单项) - 一对多
        ├── Project (项目) - 多对一
        └── Coach (教练) - 多对一，可选
```

---

## 更新日志

### v1.0.0 (2026-01-09)
- ✅ 初始版本发布
- ✅ 实现所有 CRUD 操作
- ✅ 订单号自动生成
- ✅ 订单金额自动计算
- ✅ 状态流转验证
- ✅ 客户统计自动更新
- ✅ 完整的权限控制
- ✅ 全面的数据验证
- ✅ 17个自动化测试用例

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-09
**维护者**: Campsite Management System Team
