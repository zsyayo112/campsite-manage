# 行程排期 API 文档

## 概述

行程排期 API 提供每日行程安排、冲突检测、教练管理等功能，支持时间轴视图和拖拽调整。

**Base URL**: `/api/schedules`

**认证**: 所有端点均需要 JWT Token 认证

## 端点列表

### 排期管理

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /schedules/daily | 获取每日排期（时间轴） | admin, operator, coach |
| POST | /schedules | 创建排期 | admin, operator |
| GET | /schedules/:id | 获取排期详情 | admin, operator, coach |
| PUT | /schedules/:id | 更新排期（拖拽调整） | admin, operator |
| PUT | /schedules/:id/status | 更新排期状态 | admin, operator, coach |
| DELETE | /schedules/:id | 删除排期 | admin, operator |
| POST | /schedules/check-conflicts | 冲突检测（预检） | admin, operator |

### 教练管理

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /schedules/coaches | 获取教练列表 | admin, operator, coach |
| POST | /schedules/coaches | 创建教练 | admin |
| PUT | /schedules/coaches/:id | 更新教练 | admin |
| GET | /schedules/coaches/:id/availability | 获取教练可用时段 | admin, operator |

---

## 1. 获取每日排期（时间轴）

### 请求

```http
GET /api/schedules/daily?date=2026-01-15
```

### 查询参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| date | string | 是 | 日期 (YYYY-MM-DD) |

### 响应

```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "project": {
          "id": 1,
          "name": "冰钓体验",
          "duration": 120,
          "capacity": 30
        },
        "schedules": [
          {
            "id": 1,
            "startTime": "2026-01-15T10:00:00.000Z",
            "endTime": "2026-01-15T12:00:00.000Z",
            "participantCount": 15,
            "coach": {
              "id": 1,
              "name": "张教练",
              "phone": "13800138000"
            },
            "status": "scheduled",
            "notes": "游学团队",
            "orderItemId": 5
          }
        ],
        "totalParticipants": 15,
        "remainingCapacity": 15
      }
    ],
    "coaches": [
      {
        "id": 1,
        "name": "张教练",
        "phone": "13800138000",
        "specialties": "[\"冰钓\",\"滑雪\"]"
      }
    ],
    "summary": {
      "date": "2026-01-15T00:00:00.000Z",
      "totalSchedules": 5,
      "totalParticipants": 68,
      "projectsWithSchedules": 3,
      "coachesAssigned": 2
    }
  }
}
```

---

## 2. 创建排期

### 请求

```http
POST /api/schedules
Content-Type: application/json

{
  "date": "2026-01-15",
  "orderItemId": 5,
  "projectId": 1,
  "startTime": "2026-01-15T10:00:00.000Z",
  "endTime": "2026-01-15T12:00:00.000Z",
  "coachId": 1,
  "participantCount": 15,
  "notes": "游学团队",
  "skipConflictCheck": false
}
```

### 请求体参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| date | string | 是 | 日期 |
| projectId | number | 是 | 项目ID |
| startTime | string | 是 | 开始时间 (ISO8601) |
| endTime | string | 是 | 结束时间 (ISO8601) |
| participantCount | number | 是 | 参与人数 |
| orderItemId | number | 否 | 关联的订单项ID |
| coachId | number | 否 | 分配的教练ID |
| notes | string | 否 | 备注 |
| skipConflictCheck | boolean | 否 | 跳过冲突检测（默认: false） |

### 响应

```json
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2026-01-15T00:00:00.000Z",
    "orderItemId": 5,
    "projectId": 1,
    "startTime": "2026-01-15T10:00:00.000Z",
    "endTime": "2026-01-15T12:00:00.000Z",
    "coachId": 1,
    "participantCount": 15,
    "status": "scheduled",
    "notes": "游学团队",
    "project": {...},
    "coach": {...}
  },
  "message": "排期创建成功"
}
```

### 冲突响应 (409)

```json
{
  "success": false,
  "error": {
    "code": "SCHEDULE_CONFLICT",
    "message": "存在排期冲突",
    "conflicts": [
      {
        "type": "coach",
        "message": "教练时间冲突：张教练 在该时段已有其他安排",
        "details": {
          "coachId": 1,
          "coachName": "张教练",
          "conflictingSchedules": [...]
        }
      }
    ]
  }
}
```

---

## 3. 更新排期（支持拖拽）

### 请求

```http
PUT /api/schedules/:id
Content-Type: application/json

{
  "startTime": "2026-01-15T09:00:00.000Z",
  "endTime": "2026-01-15T11:00:00.000Z",
  "coachId": 2,
  "participantCount": 20,
  "notes": "时间已调整",
  "skipConflictCheck": false
}
```

### 说明

- 所有字段均为可选，只更新提供的字段
- 更新时间或教练时会自动进行冲突检测
- 可使用 `skipConflictCheck: true` 强制更新

---

## 4. 更新排期状态

### 请求

```http
PUT /api/schedules/:id/status
Content-Type: application/json

{
  "status": "in_progress"
}
```

### 有效状态值

| 状态 | 描述 |
|------|------|
| scheduled | 已安排 |
| in_progress | 进行中 |
| completed | 已完成 |
| cancelled | 已取消 |

---

## 5. 冲突检测（预检）

在创建或更新排期前，预先检测是否存在冲突。

### 请求

```http
POST /api/schedules/check-conflicts
Content-Type: application/json

{
  "date": "2026-01-15",
  "projectId": 1,
  "startTime": "2026-01-15T10:00:00.000Z",
  "endTime": "2026-01-15T12:00:00.000Z",
  "coachId": 1,
  "participantCount": 20,
  "excludeScheduleId": 5
}
```

### 请求体参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| date | string | 是 | 日期 |
| projectId | number | 是 | 项目ID |
| startTime | string | 是 | 开始时间 |
| endTime | string | 是 | 结束时间 |
| participantCount | number | 是 | 参与人数 |
| coachId | number | 否 | 教练ID |
| excludeScheduleId | number | 否 | 排除的排期ID（更新时使用） |

### 响应

```json
{
  "success": true,
  "data": {
    "hasConflict": true,
    "conflicts": [
      {
        "type": "capacity",
        "message": "场地容量超限：当前时段已有 25 人，加上本次 20 人共 45 人，超过容量 30 人",
        "details": {
          "currentCount": 25,
          "newCount": 20,
          "totalCount": 45,
          "capacity": 30,
          "overlappingSchedules": [...]
        }
      },
      {
        "type": "coach",
        "message": "教练时间冲突：张教练 在该时段已有其他安排",
        "details": {
          "coachId": 1,
          "coachName": "张教练",
          "conflictingSchedules": [...]
        }
      }
    ]
  }
}
```

---

## 6. 教练管理

### 获取教练列表

```http
GET /api/schedules/coaches?status=on_duty&page=1&pageSize=20
```

### 创建教练

```http
POST /api/schedules/coaches
Content-Type: application/json

{
  "name": "张教练",
  "phone": "13800138000",
  "specialties": ["冰钓", "滑雪"],
  "status": "on_duty"
}
```

### 更新教练

```http
PUT /api/schedules/coaches/:id
Content-Type: application/json

{
  "name": "张教练（高级）",
  "status": "off_duty"
}
```

### 获取教练可用时段

```http
GET /api/schedules/coaches/:id/availability?date=2026-01-15
```

响应：

```json
{
  "success": true,
  "data": {
    "coach": {
      "id": 1,
      "name": "张教练",
      "status": "on_duty"
    },
    "date": "2026-01-15T00:00:00.000Z",
    "busySlots": [
      {
        "startTime": "2026-01-15T10:00:00.000Z",
        "endTime": "2026-01-15T12:00:00.000Z",
        "projectName": "冰钓体验",
        "scheduleId": 5
      }
    ],
    "totalSchedules": 2
  }
}
```

---

## 冲突检测规则

### 1. 场地容量冲突

检查同一项目在相同时段的总参与人数是否超过场地容量。

```
场地容量冲突 = (已有参与人数 + 新增参与人数) > 项目容量
```

### 2. 教练时间冲突

检查教练在相同时段是否已有其他安排。

时段重叠判断：
- 新时段开始时间在现有时段内
- 新时段结束时间在现有时段内
- 新时段完全包含现有时段

---

## 错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| SCHEDULE_CONFLICT | 409 | 存在排期冲突 |
| SCHEDULE_NOT_FOUND | 404 | 排期不存在 |
| PROJECT_NOT_FOUND | 404 | 项目不存在 |
| COACH_NOT_FOUND | 404 | 教练不存在 |

---

## 测试

运行测试脚本：

```bash
cd backend
node test-schedule-api.js
```

测试覆盖：
- 教练 CRUD 操作
- 排期 CRUD 操作
- 冲突检测（场地容量、教练时间）
- 排期状态更新
- 教练可用时段查询
- 强制创建（跳过冲突检测）
- 权限验证
