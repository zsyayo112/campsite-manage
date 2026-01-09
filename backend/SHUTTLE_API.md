# 接送调度 API 文档

## 概述

接送调度模块提供完整的车辆调度管理功能，包括每日接送人数统计、调度创建、车辆管理、司机管理等。

**Base URL**: `http://localhost:5000/api/shuttle`

**认证方式**: 所有接口都需要 JWT Token 认证

**权限控制**:
- 查看统计/调度: `admin`, `operator`, `driver`
- 创建/管理调度: `admin`, `operator`
- 更新调度状态: `admin`, `operator`, `driver`
- 车辆/司机管理: `admin`

---

## 核心功能

### 1. 每日接送统计

根据指定日期的已确认订单，按住宿地点统计需要接送的人数，帮助运营人员合理安排车辆和司机。

### 2. 接送调度管理

- **创建调度**: 分配车辆、司机，设置接送路线（多个住宿地点站点）
- **状态流转**: pending → in_progress → completed
- **站点管理**: 每个调度包含多个接送站点，按顺序排列

### 3. 车辆管理

- 管理车队车辆信息
- 支持车辆类型分类（大巴、中巴、商务车）
- 车辆状态管理（可用、维护中、已分配）

### 4. 司机管理

- 管理司机信息
- 司机状态管理（在岗、休息）
- 可关联系统用户账号

---

## API 端点

### 一、统计相关

#### 1. 获取每日接送统计

**GET** `/api/shuttle/daily-stats`

获取指定日期的接送人数统计，按住宿地点分组。

**权限**: `admin`, `operator`, `driver`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date | string | 是 | 日期 (YYYY-MM-DD) |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "date": "2026-01-16",
    "totalOrders": 15,
    "totalPeople": 45,
    "assignedPeople": 30,
    "unassignedPeople": 15,
    "accommodationStats": [
      {
        "accommodationPlace": {
          "id": 1,
          "name": "营地自营宾馆",
          "type": "self",
          "distance": 0,
          "duration": 0
        },
        "orderCount": 8,
        "totalPeople": 25,
        "customers": [
          {
            "orderId": 1,
            "orderNumber": "ORD202601160001",
            "customer": {
              "id": 1,
              "name": "张三",
              "phone": "13900139000"
            },
            "peopleCount": 3,
            "roomNumber": "1001"
          }
        ]
      },
      {
        "accommodationPlace": {
          "id": 2,
          "name": "长白山国际度假村",
          "type": "external",
          "distance": 5,
          "duration": 15
        },
        "orderCount": 7,
        "totalPeople": 20,
        "customers": [...]
      }
    ],
    "existingSchedules": [
      {
        "id": 1,
        "batchName": "上午第一批",
        "status": "pending",
        "vehicle": {...},
        "driver": {...},
        "shuttleStops": [...]
      }
    ]
  }
}
```

---

### 二、接送调度管理

#### 2. 创建接送调度

**POST** `/api/shuttle/schedules`

创建新的接送调度，分配车辆和司机，设置接送路线。

**权限**: `admin`, `operator`

**请求体**:
```json
{
  "date": "2026-01-16",
  "batchName": "上午第一批",
  "vehicleId": 1,
  "driverId": 1,
  "departureTime": "2026-01-16T08:00:00.000Z",
  "returnTime": "2026-01-16T12:00:00.000Z",
  "stops": [
    {
      "accommodationPlaceId": 2,
      "stopOrder": 1,
      "passengerCount": 10
    },
    {
      "accommodationPlaceId": 3,
      "stopOrder": 2,
      "passengerCount": 8
    }
  ],
  "notes": "备注信息"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date | string | 是 | 接送日期 (YYYY-MM-DD) |
| batchName | string | 是 | 批次名称 |
| vehicleId | number | 是 | 车辆ID |
| driverId | number | 是 | 司机ID |
| departureTime | string | 是 | 出发时间 (ISO 8601) |
| returnTime | string | 否 | 预计返回时间 |
| stops | array | 是 | 接送站点列表 |
| notes | string | 否 | 备注 |

**stops 数组元素**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| accommodationPlaceId | number | 是 | 住宿地点ID |
| stopOrder | number | 是 | 站点顺序 |
| passengerCount | number | 是 | 乘客数量 |

**验证规则**:
- 车辆必须存在且状态不是维护中
- 司机必须存在且在岗
- 同一日期车辆或司机不能有未完成的调度
- 总乘客数不能超过车辆座位数
- 所有住宿地点必须存在

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2026-01-16T00:00:00.000Z",
    "batchName": "上午第一批",
    "vehicleId": 1,
    "driverId": 1,
    "departureTime": "2026-01-16T08:00:00.000Z",
    "returnTime": "2026-01-16T12:00:00.000Z",
    "status": "pending",
    "notes": "备注信息",
    "createdAt": "2026-01-09T10:00:00.000Z",
    "updatedAt": "2026-01-09T10:00:00.000Z",
    "vehicle": {
      "id": 1,
      "plateNumber": "吉A12345",
      "vehicleType": "商务车",
      "seats": 7
    },
    "driver": {
      "id": 1,
      "name": "张师傅",
      "phone": "13800138000"
    },
    "shuttleStops": [
      {
        "id": 1,
        "accommodationPlaceId": 2,
        "stopOrder": 1,
        "passengerCount": 10,
        "accommodationPlace": {
          "id": 2,
          "name": "长白山国际度假村"
        }
      }
    ]
  },
  "message": "接送调度创建成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "message": "乘客总数 (20) 超过车辆座位数 (7)"
  }
}
```

---

#### 3. 获取接送调度列表

**GET** `/api/shuttle/schedules`

获取接送调度列表，支持分页和筛选。

**权限**: `admin`, `operator`, `driver`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码（默认: 1） |
| pageSize | number | 否 | 每页数量（默认: 20） |
| date | string | 否 | 日期筛选 (YYYY-MM-DD) |
| status | string | 否 | 状态筛选 (pending/in_progress/completed) |
| vehicleId | number | 否 | 车辆ID筛选 |
| driverId | number | 否 | 司机ID筛选 |
| sortBy | string | 否 | 排序字段（默认: date） |
| order | string | 否 | 排序方式（asc/desc，默认: desc） |

**排序字段**:
- `date`: 接送日期
- `departureTime`: 出发时间
- `createdAt`: 创建时间
- `batchName`: 批次名称

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

---

#### 4. 获取调度详情

**GET** `/api/shuttle/schedules/:id`

获取指定调度的详细信息。

**权限**: `admin`, `operator`, `driver`

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2026-01-16T00:00:00.000Z",
    "batchName": "上午第一批",
    "departureTime": "2026-01-16T08:00:00.000Z",
    "returnTime": null,
    "status": "pending",
    "notes": null,
    "vehicle": {...},
    "driver": {...},
    "shuttleStops": [...]
  }
}
```

---

#### 5. 获取站点详情（含客人名单）

**GET** `/api/shuttle/schedules/:id/stops`

获取调度的站点详情，包含每个站点对应的客人名单。

**权限**: `admin`, `operator`, `driver`

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": 1,
      "date": "2026-01-16T00:00:00.000Z",
      "batchName": "上午第一批",
      "departureTime": "2026-01-16T08:00:00.000Z",
      "returnTime": null,
      "status": "pending",
      "notes": null,
      "vehicle": {
        "id": 1,
        "plateNumber": "吉A12345",
        "vehicleType": "商务车",
        "seats": 7,
        "status": "available"
      },
      "driver": {
        "id": 1,
        "name": "张师傅",
        "phone": "13800138000",
        "status": "on_duty"
      }
    },
    "stops": [
      {
        "id": 1,
        "accommodationPlaceId": 2,
        "stopOrder": 1,
        "passengerCount": 10,
        "accommodationPlace": {
          "id": 2,
          "name": "长白山国际度假村"
        },
        "customers": [
          {
            "orderId": 5,
            "orderNumber": "ORD202601160005",
            "customer": {
              "id": 3,
              "name": "李四",
              "phone": "13900139001"
            },
            "peopleCount": 4,
            "roomNumber": "302"
          },
          {
            "orderId": 8,
            "orderNumber": "ORD202601160008",
            "customer": {
              "id": 7,
              "name": "王五",
              "phone": "13900139002"
            },
            "peopleCount": 6,
            "roomNumber": "501"
          }
        ]
      }
    ]
  }
}
```

---

#### 6. 更新调度状态

**PATCH** `/api/shuttle/schedules/:id/status`

更新调度的状态。司机可以更新自己负责的调度状态。

**权限**: `admin`, `operator`, `driver`

**请求体**:
```json
{
  "status": "in_progress",
  "returnTime": "2026-01-16T12:30:00.000Z"
}
```

**状态说明**:
| 状态 | 说明 |
|------|------|
| pending | 待出发 |
| in_progress | 接送中 |
| completed | 已完成 |

**状态流转规则**:
- pending → in_progress → completed
- 已完成的调度不能更改状态
- 更新为 completed 时可同时更新 returnTime

**成功响应** (200):
```json
{
  "success": true,
  "data": {...},
  "message": "接送调度状态更新成功"
}
```

---

#### 7. 删除调度

**DELETE** `/api/shuttle/schedules/:id`

删除调度。只能删除待出发状态的调度。

**权限**: `admin`

**限制**:
- 只能删除状态为 `pending` 的调度
- 删除会级联删除所有站点

**成功响应** (200):
```json
{
  "success": true,
  "message": "接送调度删除成功"
}
```

---

### 三、车辆管理

#### 8. 获取车辆列表

**GET** `/api/shuttle/vehicles`

获取所有车辆列表。

**权限**: `admin`, `operator`, `driver`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选 (available/maintenance/assigned) |
| vehicleType | string | 否 | 车辆类型筛选 |

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "plateNumber": "吉A12345",
      "vehicleType": "商务车",
      "seats": 7,
      "status": "available",
      "notes": null,
      "createdAt": "2026-01-09T10:00:00.000Z",
      "updatedAt": "2026-01-09T10:00:00.000Z"
    },
    {
      "id": 2,
      "plateNumber": "吉A67890",
      "vehicleType": "中巴",
      "seats": 20,
      "status": "available",
      "notes": null
    }
  ]
}
```

---

#### 9. 创建车辆

**POST** `/api/shuttle/vehicles`

创建新车辆。

**权限**: `admin`

**请求体**:
```json
{
  "plateNumber": "吉A12345",
  "vehicleType": "商务车",
  "seats": 7,
  "status": "available",
  "notes": "备注信息"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| plateNumber | string | 是 | 车牌号（唯一） |
| vehicleType | string | 是 | 车辆类型（大巴/中巴/商务车） |
| seats | number | 是 | 座位数 |
| status | string | 否 | 状态（默认: available） |
| notes | string | 否 | 备注 |

**车辆状态**:
- `available`: 可用
- `maintenance`: 维护中
- `assigned`: 已分配

**成功响应** (201):
```json
{
  "success": true,
  "data": {...},
  "message": "车辆创建成功"
}
```

---

#### 10. 更新车辆

**PUT** `/api/shuttle/vehicles/:id`

更新车辆信息。

**权限**: `admin`

**请求体**: 同创建，所有字段可选

**成功响应** (200):
```json
{
  "success": true,
  "data": {...},
  "message": "车辆更新成功"
}
```

---

### 四、司机管理

#### 11. 获取司机列表

**GET** `/api/shuttle/drivers`

获取所有司机列表。

**权限**: `admin`, `operator`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选 (on_duty/off_duty) |

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": null,
      "name": "张师傅",
      "phone": "13800138000",
      "status": "on_duty",
      "createdAt": "2026-01-09T10:00:00.000Z",
      "updatedAt": "2026-01-09T10:00:00.000Z"
    }
  ]
}
```

---

#### 12. 创建司机

**POST** `/api/shuttle/drivers`

创建新司机。

**权限**: `admin`

**请求体**:
```json
{
  "name": "张师傅",
  "phone": "13800138000",
  "userId": 5,
  "status": "on_duty"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 姓名 |
| phone | string | 是 | 电话 |
| userId | number | 否 | 关联的系统用户ID |
| status | string | 否 | 状态（默认: on_duty） |

**司机状态**:
- `on_duty`: 在岗
- `off_duty`: 休息

**成功响应** (201):
```json
{
  "success": true,
  "data": {...},
  "message": "司机创建成功"
}
```

---

#### 13. 更新司机

**PUT** `/api/shuttle/drivers/:id`

更新司机信息。

**权限**: `admin`

**请求体**: 同创建，所有字段可选

**成功响应** (200):
```json
{
  "success": true,
  "data": {...},
  "message": "司机更新成功"
}
```

---

## 权限矩阵

| 操作 | admin | operator | driver | marketer | coach |
|-----|-------|----------|--------|----------|-------|
| 查看每日统计 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 查看调度列表 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 查看调度详情 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 查看站点客人 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 创建调度 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 更新调度状态 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 删除调度 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 查看车辆 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 管理车辆 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 查看司机 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 管理司机 | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 错误代码

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| VEHICLE_NOT_FOUND | 404 | 车辆不存在 |
| VEHICLE_UNAVAILABLE | 400 | 车辆不可用（维护中） |
| DRIVER_NOT_FOUND | 404 | 司机不存在 |
| DRIVER_UNAVAILABLE | 400 | 司机不在岗 |
| ACCOMMODATION_NOT_FOUND | 404 | 住宿地点不存在 |
| SCHEDULE_NOT_FOUND | 404 | 调度不存在 |
| SCHEDULE_CONFLICT | 400 | 车辆或司机已有调度冲突 |
| CAPACITY_EXCEEDED | 400 | 乘客数超过车辆座位数 |
| INVALID_STATUS | 400 | 无效的状态值 |
| INVALID_STATUS_TRANSITION | 400 | 无效的状态转换 |
| CANNOT_DELETE_SCHEDULE | 400 | 不能删除非待出发的调度 |
| DUPLICATE_PLATE_NUMBER | 400 | 车牌号已存在 |

---

## 前端集成示例

### React + Axios 示例

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 获取每日接送统计
export const getDailyStats = async (date) => {
  const response = await api.get('/shuttle/daily-stats', { params: { date } });
  return response.data;
};

// 创建接送调度
export const createSchedule = async (scheduleData) => {
  const response = await api.post('/shuttle/schedules', scheduleData);
  return response.data;
};

// 获取调度列表
export const getSchedules = async (params) => {
  const response = await api.get('/shuttle/schedules', { params });
  return response.data;
};

// 获取站点详情（含客人名单）
export const getScheduleStops = async (scheduleId) => {
  const response = await api.get(`/shuttle/schedules/${scheduleId}/stops`);
  return response.data;
};

// 更新调度状态
export const updateScheduleStatus = async (scheduleId, statusData) => {
  const response = await api.patch(`/shuttle/schedules/${scheduleId}/status`, statusData);
  return response.data;
};

// 使用示例: 每日调度面板
const DailySchedulePanel = ({ date }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getDailyStats(date);
      setStats(data.data);
    };
    fetchStats();
  }, [date]);

  if (!stats) return <div>加载中...</div>;

  return (
    <div>
      <h2>{stats.date} 接送统计</h2>
      <div>总人数: {stats.totalPeople}</div>
      <div>已分配: {stats.assignedPeople}</div>
      <div>未分配: {stats.unassignedPeople}</div>

      <h3>按住宿地点</h3>
      {stats.accommodationStats.map(item => (
        <div key={item.accommodationPlace.id}>
          {item.accommodationPlace.name}: {item.totalPeople}人
        </div>
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
node test-shuttle-api.js
```

测试覆盖 (22个测试):
- ✅ 登录认证
- ✅ 获取住宿地点和项目
- ✅ 创建测试客户和订单
- ✅ 创建车辆
- ✅ 获取车辆列表
- ✅ 更新车辆
- ✅ 创建司机
- ✅ 获取司机列表
- ✅ 更新司机
- ✅ 获取每日接送统计
- ✅ 创建接送调度
- ✅ 获取调度列表
- ✅ 获取调度详情
- ✅ 获取站点详情（含客人名单）
- ✅ 更新调度状态为进行中
- ✅ 更新调度状态为已完成
- ✅ 删除已完成调度验证（拒绝）
- ✅ 创建并删除待出发调度
- ✅ 重复车牌验证
- ✅ 车辆座位数验证

---

## 数据库关系

```
ShuttleSchedule (接送调度)
  ├── Vehicle (车辆) - 多对一
  ├── Driver (司机) - 多对一
  └── ShuttleStop (接送站点) - 一对多
        └── AccommodationPlace (住宿地点) - 多对一

Order (订单) [用于统计]
  ├── Customer (客户) - 多对一
  └── AccommodationPlace (住宿地点) - 多对一
```

---

## 更新日志

### v1.0.0 (2026-01-09)
- ✅ 初始版本发布
- ✅ 每日接送统计功能
- ✅ 接送调度 CRUD
- ✅ 站点客人名单查询
- ✅ 调度状态流转
- ✅ 车辆管理 CRUD
- ✅ 司机管理 CRUD
- ✅ 完整的验证和冲突检测
- ✅ 22个自动化测试用例

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-09
**维护者**: Campsite Management System Team
