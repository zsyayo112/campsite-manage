# SQL Server 双写同步功能说明

## 功能概述

该功能实现了将客户预约数据同时写入两个数据库：
1. **主数据库**：当前系统的 SQLite 数据库
2. **同步数据库**：父亲的 SQL Server 数据库（有赞系统）

## 同步规则

### 1. 预约提交时
当客户通过微信表单提交预约时：
- 数据首先保存到本地 SQLite 数据库（主流程）
- 然后异步同步到 SQL Server（不阻塞主流程）
- 同步失败不影响预约提交成功

### 2. 预约转订单时
当管理员将预约转换为订单时：
- 订单状态更新同步到 SQL Server
- 记录订单号便于追溯

## SQL Server 数据库信息

```
服务器：43.138.38.143,1433
数据库：zclyingdi
用户名：sa
密码：!Zcl5719233
```

### 目标表结构

**table_kehu（客户表）**
- idkehu: 主键ID
- 姓名: 客户姓名
- 手机: 手机号（唯一标识）
- 备用手机: 微信号
- 渠道: 来源渠道
- 备注: 备注信息

**table_dingdan（订单表）**
需要根据实际表结构调整，当前假设字段：
- 姓名, 手机, 日期, 人数, 套餐
- 总金额, 定金, 状态, 备注, 创建时间

## 部署步骤

### 1. 安装依赖

在服务器上执行：
```bash
cd /var/www/campsite-manage/backend
npm install mssql
```

### 2. 测试连接

部署后，使用管理员账号登录，访问以下接口测试 SQL Server 连接：
```
GET /api/dashboard/test-sqlserver
```

该接口会返回 SQL Server 的表结构，确认连接正常。

### 3. 根据实际表结构调整

如果 `table_dingdan` 的字段名与代码中不一致，需要修改：
- 文件：`backend/src/utils/sqlServerSync.js`
- 函数：`syncBooking`

根据实际字段名调整 INSERT 语句。

### 4. 重启后端服务

```bash
pm2 restart campsite-backend
```

## 日志查看

同步操作会在后端日志中输出：
```
[双写] 预约 BK20260120001 同步到 SQL Server 成功
[双写] 预约 BK20260120001 同步到 SQL Server 失败: <错误信息>
```

查看日志：
```bash
pm2 logs campsite-backend
```

## 注意事项

1. **异步执行**：同步操作是异步执行的，不会影响主流程响应速度
2. **失败容忍**：SQL Server 同步失败不会导致预约提交失败
3. **去重机制**：同步时会检查客户和订单是否已存在，避免重复插入
4. **过渡方案**：这是临时过渡方案，待系统稳定后可关闭

## 关闭双写

如需关闭双写功能，注释掉以下文件中的双写代码块：
- `backend/src/controllers/publicController.js` 中的 `submitBooking` 函数
- `backend/src/controllers/bookingController.js` 中的 `convertToOrder` 函数

查找标记：`// ============ 双写逻辑 ============`
