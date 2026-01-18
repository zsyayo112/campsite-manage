/**
 * SQL Server 同步工具
 * 用于将订单和客户数据同步到父亲的有赞数据库
 *
 * 数据库信息：
 * - Server: 43.138.38.143,1433
 * - Database: zclyingdi
 * - User: sa
 * - Password: !Zcl5719233
 *
 * 目标表结构：
 * - table_kehu (客户表):
 *   idkehu(整数), 姓名(20), 手机(11), 备用手机(16), 类别(10), 渠道(16),
 *   性别(逻辑型), 登录用户(16), 登录密码(16), 备注(text), 添加时间(日期),
 *   添加人(16), 人数备注(10), 季节(6), 需求类别(16)
 *
 * - table_dingdan (订单表):
 *   iddingdan(整数), 日期(日期), 时间(20), idkehu(整数), 姓名(32), 手机(32),
 *   组别(16), 返时(16), 车辆(16), 酒店(16), 产品(10), 状态(10), 单价(整数),
 *   人数(整数), 人数备注(16), 总金额(整数), 定金(整数), 收款日期(日期),
 *   收款人(16), 收款方式(16), 添加时间(日期), 添加人(16), 尾款结算人(16),
 *   结清时间(日期), 收款账户(16), 备注(text), 欠款(整数), 已收尾款(整数),
 *   预订回执备注(255), 特别备注(255), 通知(16), 排序1(16), 排序2(16), 标记(逻辑型)
 */

const sql = require('mssql');

// SQL Server 连接配置
const sqlServerConfig = {
  server: '43.138.38.143',
  port: 1433,
  database: 'zclyingdi',
  user: 'sa',
  password: '!Zcl5719233',
  options: {
    encrypt: false, // 如果是本地/私有服务器，通常不需要加密
    trustServerCertificate: true, // 信任服务器证书
    connectTimeout: 30000, // 连接超时 30 秒
    requestTimeout: 30000, // 请求超时 30 秒
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// 连接池
let pool = null;

/**
 * 获取数据库连接
 */
const getConnection = async () => {
  try {
    if (!pool) {
      pool = await sql.connect(sqlServerConfig);
      console.log('[SQL Server Sync] 连接成功');
    }
    return pool;
  } catch (error) {
    console.error('[SQL Server Sync] 连接失败:', error.message);
    throw error;
  }
};

/**
 * 关闭数据库连接
 */
const closeConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('[SQL Server Sync] 连接已关闭');
    }
  } catch (error) {
    console.error('[SQL Server Sync] 关闭连接失败:', error.message);
  }
};

/**
 * 同步客户信息到 table_kehu
 *
 * @param {Object} customer - 客户信息
 * @param {string} customer.name - 姓名
 * @param {string} customer.phone - 手机号
 * @param {string} customer.wechat - 微信号（可选）
 * @param {string} customer.source - 来源
 * @param {string} customer.notes - 备注
 * @returns {Promise<number|null>} - 返回插入的客户ID，失败返回null
 */
const syncCustomer = async (customer) => {
  try {
    const conn = await getConnection();

    // 先检查客户是否已存在（按手机号）
    const checkResult = await conn
      .request()
      .input('phone', sql.NVarChar, customer.phone)
      .query('SELECT idkehu FROM table_kehu WHERE 手机 = @phone');

    if (checkResult.recordset.length > 0) {
      // 客户已存在，返回现有ID
      console.log(`[SQL Server Sync] 客户已存在: ${customer.phone}`);
      return checkResult.recordset[0].idkehu;
    }

    // 插入新客户
    // 渠道映射
    const sourceMap = {
      xiaohongshu: '小红书',
      wechat: '微信',
      booking_form: '微信预约',
      wechat_form: '微信预约',
      manual: '手动录入',
      other: '其他',
    };

    const result = await conn
      .request()
      .input('name', sql.NVarChar(20), (customer.name || '').substring(0, 20))
      .input('phone', sql.NVarChar(11), (customer.phone || '').substring(0, 11))
      .input('wechat', sql.NVarChar(16), (customer.wechat || '').substring(0, 16))
      .input('source', sql.NVarChar(16), (sourceMap[customer.source] || '微信预约').substring(0, 16))
      .input('notes', sql.NVarChar(sql.MAX), customer.notes || '')
      .input('addTime', sql.DateTime, new Date())
      .input('addPerson', sql.NVarChar(16), '网站系统')
      .input('season', sql.NVarChar(6), '冬季')
      .query(`
        INSERT INTO table_kehu (姓名, 手机, 备用手机, 渠道, 备注, 添加时间, 添加人, 季节)
        OUTPUT INSERTED.idkehu
        VALUES (@name, @phone, @wechat, @source, @notes, @addTime, @addPerson, @season)
      `);

    const newId = result.recordset[0]?.idkehu;
    console.log(`[SQL Server Sync] 客户同步成功: ${customer.name}, ID: ${newId}`);
    return newId;
  } catch (error) {
    console.error('[SQL Server Sync] 同步客户失败:', error.message);
    // 不抛出异常，返回 null 表示失败
    return null;
  }
};

/**
 * 同步预约/订单信息到 table_dingdan
 *
 * 你的系统：预约(pending待确认) -> 订单(confirmed已确认)
 * 父亲系统：直接显示状态（待确认/已确认）
 *
 * @param {Object} booking - 预约/订单信息
 * @param {string} booking.bookingCode - 预约确认码
 * @param {string} booking.customerName - 客户姓名
 * @param {string} booking.customerPhone - 客户手机
 * @param {Date} booking.visitDate - 游玩日期
 * @param {number} booking.peopleCount - 人数
 * @param {number} booking.adultCount - 成人数
 * @param {number} booking.childCount - 儿童数
 * @param {string} booking.hotelName - 酒店名称
 * @param {string} booking.roomNumber - 房间号
 * @param {string} booking.packageName - 套餐名称
 * @param {number} booking.totalAmount - 总金额
 * @param {number} booking.depositAmount - 定金
 * @param {string} booking.status - 状态
 * @param {string} booking.notes - 备注
 * @param {number} booking.unitPrice - 单价
 * @returns {Promise<boolean>} - 同步是否成功
 */
const syncBooking = async (booking) => {
  try {
    const conn = await getConnection();

    // 格式化日期 - table_dingdan.日期 是日期型
    const visitDate = new Date(booking.visitDate);

    // 状态映射 - 在父亲系统中显示
    const statusMap = {
      pending: '待确认',      // 客户提交预约 -> 待确认
      confirmed: '已确认',    // 管理员确认 -> 已确认
      converted: '已确认',    // 转为订单 -> 已确认
      completed: '已完成',
      cancelled: '已取消',
    };

    // 构建人数备注
    const peopleNotes = [];
    if (booking.adultCount) peopleNotes.push(`成人${booking.adultCount}`);
    if (booking.childCount) peopleNotes.push(`儿童${booking.childCount}`);
    const peopleRemark = peopleNotes.join('+') || '';

    // 构建备注信息
    const notesArr = [`预约码:${booking.bookingCode}`];
    if (booking.roomNumber) notesArr.push(`房间:${booking.roomNumber}`);
    if (booking.accommodationNotes) notesArr.push(booking.accommodationNotes);
    if (booking.notes) notesArr.push(booking.notes);
    const fullNotes = notesArr.join('，');

    // 先查找客户ID（通过手机号）
    let customerId = null;
    const customerResult = await conn
      .request()
      .input('phone', sql.NVarChar, booking.customerPhone)
      .query('SELECT idkehu FROM table_kehu WHERE 手机 = @phone');

    if (customerResult.recordset.length > 0) {
      customerId = customerResult.recordset[0].idkehu;
    }

    // 检查订单是否已存在（按预约码在备注中查找）
    const checkResult = await conn
      .request()
      .input('bookingCode', sql.NVarChar, booking.bookingCode)
      .query(`SELECT iddingdan, 状态 FROM table_dingdan WHERE 备注 LIKE '%' + @bookingCode + '%'`);

    if (checkResult.recordset.length > 0) {
      // 订单已存在，更新状态
      const existingId = checkResult.recordset[0].iddingdan;
      const newStatus = statusMap[booking.status] || '待确认';

      await conn
        .request()
        .input('id', sql.Int, existingId)
        .input('status', sql.NVarChar(10), newStatus)
        .input('deposit', sql.Int, Math.round(booking.depositAmount || 0))
        .query(`UPDATE table_dingdan SET 状态 = @status, 定金 = @deposit WHERE iddingdan = @id`);

      console.log(`[SQL Server Sync] 订单状态更新: ${booking.bookingCode} -> ${newStatus}`);
      return true;
    }

    // 计算单价
    const unitPrice = booking.unitPrice || (booking.peopleCount > 0 ? Math.round(booking.totalAmount / booking.peopleCount) : 0);

    // 确保 customerId 不为 null（table_dingdan.idkehu 是 NOT NULL）
    if (!customerId) {
      // 如果客户不存在，先创建
      customerId = await syncCustomer({
        name: booking.customerName,
        phone: booking.customerPhone,
        source: 'wechat_form',
        notes: '',
      });
    }

    // 如果仍然没有 customerId，使用默认值 0
    if (!customerId) {
      customerId = 0;
    }

    // 插入新订单 - 按照 table_dingdan 实际结构
    // 注意：table_dingdan 实际没有姓名、手机、欠款字段（通过 idkehu 关联客户）
    await conn
      .request()
      .input('visitDate', sql.SmallDateTime, visitDate)  // smalldatetime 类型
      .input('time', sql.NVarChar(20), '09:00')  // 默认接送时间
      .input('customerId', sql.Int, customerId)
      .input('group', sql.NVarChar(16), '')  // 组别
      .input('returnTime', sql.NVarChar(16), '16:00')  // 返回时间
      .input('vehicle', sql.NVarChar(16), '')  // 车辆
      .input('hotel', sql.NVarChar(16), (booking.hotelName || '').substring(0, 16))
      .input('product', sql.NChar(10), (booking.packageName || '冬季项目').substring(0, 10))
      .input('status', sql.NChar(10), (statusMap[booking.status] || '待确认').substring(0, 10))
      .input('unitPrice', sql.Int, Math.round(unitPrice))
      .input('peopleCount', sql.Int, booking.peopleCount || 1)
      .input('peopleRemark', sql.NVarChar(16), peopleRemark.substring(0, 16))
      .input('totalAmount', sql.Int, Math.round(booking.totalAmount || 0))
      .input('deposit', sql.Int, Math.round(booking.depositAmount || 0))
      .input('addTime', sql.DateTime, new Date())
      .input('addPerson', sql.NVarChar(16), '网站系统')
      .input('notes', sql.VarChar(sql.MAX), fullNotes)
      .input('paidBalance', sql.Int, 0)  // 已收尾款
      .query(`
        INSERT INTO table_dingdan (
          日期, 时间, idkehu,
          组别, 返时, 车辆, 酒店, 产品,
          状态, 单价, 人数, 人数备注, 总金额,
          定金, 添加时间, 添加人, 备注, 已收尾款
        )
        VALUES (
          @visitDate, @time, @customerId,
          @group, @returnTime, @vehicle, @hotel, @product,
          @status, @unitPrice, @peopleCount, @peopleRemark, @totalAmount,
          @deposit, @addTime, @addPerson, @notes, @paidBalance
        )
      `);

    console.log(`[SQL Server Sync] 预约同步成功: ${booking.bookingCode}, 状态: ${statusMap[booking.status]}`);
    return true;
  } catch (error) {
    console.error('[SQL Server Sync] 同步预约失败:', error.message);
    // 如果是表结构问题，记录详细错误
    if (error.message.includes('Invalid column')) {
      console.error('[SQL Server Sync] 表结构可能不匹配，请检查 table_dingdan 的字段');
    }
    return false;
  }
};

/**
 * 测试数据库连接
 */
const testConnection = async () => {
  try {
    const conn = await getConnection();

    // 查询表结构
    const result = await conn.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);

    console.log('[SQL Server Sync] 数据库表列表:');
    result.recordset.forEach((row) => {
      console.log(`  - ${row.TABLE_NAME}`);
    });

    return true;
  } catch (error) {
    console.error('[SQL Server Sync] 测试连接失败:', error.message);
    return false;
  }
};

/**
 * 查询 table_dingdan 表结构
 */
const getTableStructure = async (tableName = 'table_dingdan') => {
  try {
    const conn = await getConnection();

    const result = await conn.request().input('tableName', sql.NVarChar, tableName).query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `);

    console.log(`[SQL Server Sync] ${tableName} 表结构:`);
    result.recordset.forEach((col) => {
      console.log(
        `  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`
      );
    });

    return result.recordset;
  } catch (error) {
    console.error('[SQL Server Sync] 查询表结构失败:', error.message);
    return null;
  }
};

module.exports = {
  getConnection,
  closeConnection,
  syncCustomer,
  syncBooking,
  testConnection,
  getTableStructure,
};
