import api from '../utils/api';

/**
 * 获取预约列表（需要认证）
 * @param {object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.status - 预约状态筛选
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {string} params.search - 搜索关键词
 * @param {string} params.sortBy - 排序字段
 * @param {string} params.order - 排序方向 (asc/desc)
 * @returns {Promise}
 */
export const getBookings = async (params = {}) => {
  const response = await api.get('/bookings', { params });
  return response.data;
};

/**
 * 获取预约详情（需要认证）
 * @param {number} id - 预约ID
 * @returns {Promise}
 */
export const getBookingById = async (id) => {
  const response = await api.get(`/bookings/${id}`);
  return response.data;
};

/**
 * 手动创建预约（需要认证）
 * @param {object} data - 预约数据
 * @returns {Promise}
 */
export const createBooking = async (data) => {
  const response = await api.post('/bookings', data);
  return response.data;
};

/**
 * 更新预约状态（需要认证）
 * @param {number} id - 预约ID
 * @param {object} data - 状态数据 { status, notes? }
 * @returns {Promise}
 */
export const updateBookingStatus = async (id, data) => {
  const response = await api.patch(`/bookings/${id}/status`, data);
  return response.data;
};

/**
 * 更新预约定金（需要认证）
 * @param {number} id - 预约ID
 * @param {object} data - 定金数据 { depositAmount }
 * @returns {Promise}
 */
export const updateBookingDeposit = async (id, data) => {
  const response = await api.patch(`/bookings/${id}/deposit`, data);
  return response.data;
};

/**
 * 将预约转为订单（需要认证）
 * @param {number} id - 预约ID
 * @returns {Promise}
 */
export const convertToOrder = async (id) => {
  const response = await api.post(`/bookings/${id}/convert`);
  return response.data;
};

/**
 * 删除预约（需要认证，仅管理员）
 * @param {number} id - 预约ID
 * @returns {Promise}
 */
export const deleteBooking = async (id) => {
  const response = await api.delete(`/bookings/${id}`);
  return response.data;
};

/**
 * 获取预约统计（需要认证）
 * @returns {Promise}
 */
export const getBookingStats = async () => {
  const response = await api.get('/bookings/stats');
  return response.data;
};

// ===== 公开 API（无需认证）=====

/**
 * 提交预约（公开，无需认证）
 * @param {object} data - 预约数据
 * @returns {Promise}
 */
export const submitPublicBooking = async (data) => {
  const response = await api.post('/public/bookings', data);
  return response.data;
};

/**
 * 获取可用套餐列表（公开，无需认证）
 * @returns {Promise}
 */
export const getPublicPackages = async () => {
  const response = await api.get('/public/packages');
  return response.data;
};

/**
 * 获取酒店列表（公开，无需认证）
 * @returns {Promise}
 */
export const getPublicHotels = async () => {
  const response = await api.get('/public/hotels');
  return response.data;
};

/**
 * 根据确认码查询预约状态（公开，无需认证）
 * @param {string} code - 预约确认码
 * @returns {Promise}
 */
export const getPublicBookingByCode = async (code) => {
  const response = await api.get(`/public/booking/${code}`);
  return response.data;
};

const bookingsApi = {
  // 认证 API
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  updateBookingDeposit,
  convertToOrder,
  deleteBooking,
  getBookingStats,
  // 公开 API
  submitPublicBooking,
  getPublicPackages,
  getPublicHotels,
  getPublicBookingByCode,
};

export default bookingsApi;
