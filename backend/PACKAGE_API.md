# 套餐管理 API 文档

## 概述

套餐管理 API 提供套餐的创建、查询、更新、删除以及套餐项目关联管理和价格计算功能。

**Base URL**: `/api/packages`

**认证**: 所有端点均需要 JWT Token 认证

## 端点列表

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /packages | 获取套餐列表 | admin, operator, marketer |
| GET | /packages/:id | 获取套餐详情 | admin, operator, marketer |
| POST | /packages | 创建套餐 | admin |
| PUT | /packages/:id | 更新套餐 | admin |
| DELETE | /packages/:id | 删除套餐 | admin |
| POST | /packages/:id/items | 添加项目到套餐 | admin |
| DELETE | /packages/:id/items/:projectId | 从套餐移除项目 | admin |
| POST | /packages/calculate-price | 计算订单价格预览 | admin, operator |

---

## 1. 获取套餐列表

### 请求

```http
GET /api/packages?page=1&pageSize=20&isActive=true&includeItems=true
```

### 查询参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页数量 |
| isActive | boolean | - | 激活状态筛选 |
| includeItems | boolean | true | 是否包含项目详情 |

### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 3,
        "name": "冰雪乐园套餐",
        "description": "冰钓+雪上滑梯+烤棉花糖",
        "price": "228",
        "minPeople": 1,
        "isActive": true,
        "sortOrder": 3,
        "createdAt": "2026-01-08T15:01:02.273Z",
        "updatedAt": "2026-01-08T15:01:02.273Z",
        "packageItems": [
          {
            "id": 1,
            "packageId": 3,
            "projectId": 3,
            "project": {
              "id": 3,
              "name": "冰钓体验",
              "price": "128",
              "unit": "per_person"
            }
          }
        ],
        "totalProjectValue": 216,
        "savings": 0,
        "savingsPercent": 0
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

## 2. 获取套餐详情

### 请求

```http
GET /api/packages/:id
```

### 响应

```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "冰雪乐园套餐",
    "description": "冰钓+雪上滑梯+烤棉花糖",
    "price": "228",
    "minPeople": 1,
    "isActive": true,
    "sortOrder": 3,
    "createdAt": "2026-01-08T15:01:02.273Z",
    "updatedAt": "2026-01-08T15:01:02.273Z",
    "packageItems": [...],
    "_count": {
      "orders": 0
    },
    "totalProjectValue": 216,
    "totalDuration": 240,
    "savings": 0,
    "savingsPercent": 0
  }
}
```

---

## 3. 创建套餐

### 请求

```http
POST /api/packages
Content-Type: application/json

{
  "name": "冰雪乐园套餐",
  "description": "冰钓+雪上滑梯+烤棉花糖",
  "price": 228,
  "minPeople": 1,
  "isActive": true,
  "sortOrder": 3,
  "projectIds": [1, 2, 3]
}
```

### 请求体参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| name | string | 是 | 套餐名称 |
| description | string | 否 | 套餐描述 |
| price | number | 是 | 套餐价格 |
| minPeople | number | 否 | 最低人数要求 |
| isActive | boolean | 否 | 是否激活（默认: true）|
| sortOrder | number | 否 | 排序值（默认: 0）|
| projectIds | number[] | 否 | 包含的项目ID列表 |

### 响应

```json
{
  "success": true,
  "data": {
    "id": 13,
    "name": "冰雪乐园套餐",
    "price": "228",
    ...
  },
  "message": "套餐创建成功"
}
```

---

## 4. 更新套餐

### 请求

```http
PUT /api/packages/:id
Content-Type: application/json

{
  "name": "更新后的套餐名称",
  "price": 299,
  "projectIds": [1, 2, 4]
}
```

### 说明

- 所有字段均为可选，只更新提供的字段
- 如果提供 `projectIds`，将替换所有现有项目关联

### 响应

```json
{
  "success": true,
  "data": {...},
  "message": "套餐更新成功"
}
```

---

## 5. 删除套餐

### 请求

```http
DELETE /api/packages/:id
```

### 说明

- 如果套餐有关联订单，无法删除
- 删除套餐会级联删除所有项目关联

### 响应

```json
{
  "success": true,
  "message": "套餐删除成功"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "PACKAGE_HAS_ORDERS",
    "message": "该套餐有 5 个关联订单，无法删除。建议设置为停用状态。"
  }
}
```

---

## 6. 添加项目到套餐

### 请求

```http
POST /api/packages/:id/items
Content-Type: application/json

{
  "projectId": 5
}
```

### 响应

```json
{
  "success": true,
  "data": {...},
  "message": "项目添加成功"
}
```

---

## 7. 从套餐移除项目

### 请求

```http
DELETE /api/packages/:id/items/:projectId
```

### 响应

```json
{
  "success": true,
  "data": {...},
  "message": "项目移除成功"
}
```

---

## 8. 计算订单价格（预览）

用于在创建订单前预览价格计算结果。

### 请求

```http
POST /api/packages/calculate-price
Content-Type: application/json

{
  "packageId": 3,
  "extraProjectIds": [4, 5],
  "peopleCount": 3
}
```

### 请求体参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| packageId | number | 否 | 套餐ID |
| extraProjectIds | number[] | 否 | 额外项目ID（套餐外） |
| customProjectIds | number[] | 否 | 自由组合项目ID（不使用套餐时） |
| peopleCount | number | 是 | 人数（必须大于0） |

### 响应

```json
{
  "success": true,
  "data": {
    "package": {
      "id": 3,
      "name": "冰雪乐园套餐",
      "unitPrice": 228,
      "peopleCount": 3,
      "subtotal": 684,
      "projects": [
        {
          "id": 3,
          "name": "冰钓体验",
          "price": "128",
          "unit": "per_person"
        }
      ]
    },
    "extraProjects": [
      {
        "id": 4,
        "name": "烤棉花糖",
        "unitPrice": 20,
        "peopleCount": 3,
        "subtotal": 60
      }
    ],
    "customProjects": null,
    "summary": {
      "packagePrice": 684,
      "extraProjectsPrice": 60,
      "customProjectsPrice": 0,
      "totalAmount": 744,
      "peopleCount": 3
    }
  }
}
```

---

## 定价规则

### 1. 套餐定价
```
套餐价格 = 套餐单价 × 人数
```

### 2. 额外项目定价
```
额外项目价格 = Σ(项目单价 × 人数)
```

### 3. 自由组合定价
```
自由组合价格 = Σ(项目单价 × 人数)
```

### 4. 总价计算
```
总价 = 套餐价格 + 额外项目价格 + 自由组合价格
```

---

## 错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| INVALID_PROJECTS | 400 | 项目ID无效 |
| PACKAGE_INACTIVE | 400 | 套餐已停用 |
| MIN_PEOPLE_NOT_MET | 400 | 未达到最低人数要求 |
| PROJECT_INACTIVE | 400 | 项目已停用 |
| ITEM_EXISTS | 400 | 项目已在套餐中 |
| PACKAGE_HAS_ORDERS | 400 | 套餐有关联订单 |
| PACKAGE_NOT_FOUND | 404 | 套餐不存在 |
| PROJECT_NOT_FOUND | 404 | 项目不存在 |
| ITEM_NOT_FOUND | 404 | 项目不在套餐中 |

---

## 测试

运行测试脚本：

```bash
cd backend
node test-package-api.js
```

测试覆盖：
- 认证测试
- 套餐 CRUD 操作
- 套餐项目关联管理
- 价格计算（套餐、额外项目、自由组合）
- 权限验证
- 错误处理
