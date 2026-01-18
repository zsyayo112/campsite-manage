import api from '../utils/api';

/**
 * 获取订单列表
 * @param {object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.status - 订单状态筛选
 * @param {string} params.paymentStatus - 支付状态筛选
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {string} params.search - 搜索关键词
 * @param {string} params.sortBy - 排序字段
 * @param {string} params.order - 排序方向 (asc/desc)
 * @returns {Promise}
 */
export const getOrders = async (params = {}) => {
  const response = await api.get('/orders', { params });
  return response.data;
};

/**
 * 获取订单详情
 * @param {number} id - 订单ID
 * @returns {Promise}
 */
export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

/**
 * 创建订单
 * @param {object} data - 订单数据
 * @returns {Promise}
 */
export const createOrder = async (data) => {
  const response = await api.post('/orders', data);
  return response.data;
};

/**
 * 更新订单状态
 * @param {number} id - 订单ID
 * @param {object} data - 状态数据 { status?, paymentStatus? }
 * @returns {Promise}
 */
export const updateOrderStatus = async (id, data) => {
  const response = await api.patch(`/orders/${id}/status`, data);
  return response.data;
};

/**
 * 删除订单
 * @param {number} id - 订单ID
 * @returns {Promise}
 */
export const deleteOrder = async (id) => {
  const response = await api.delete(`/orders/${id}`);
  return response.data;
};

/**
 * 更新订单付款金额（收款）
 * @param {number} id - 订单ID
 * @param {object} data - 收款数据 { amount, action: 'add' | 'set' }
 * @returns {Promise}
 */
export const updateOrderPayment = async (id, data) => {
  const response = await api.patch(`/orders/${id}/payment`, data);
  return response.data;
};

/**
 * 获取订单统计
 * @param {object} params - 查询参数
 * @returns {Promise}
 */
export const getOrderStats = async (params = {}) => {
  const response = await api.get('/orders/stats/summary', { params });
  return response.data;
};

/**
 * 获取住宿地点列表
 * @returns {Promise}
 */
export const getAccommodations = async () => {
  const response = await api.get('/accommodations');
  return response.data;
};

/**
 * 获取项目列表
 * @returns {Promise}
 */
export const getProjects = async () => {
  const response = await api.get('/projects');
  return response.data;
};

/**
 * 获取套餐列表
 * @returns {Promise}
 */
export const getPackages = async () => {
  const response = await api.get('/packages');
  return response.data;
};

/**
 * 搜索客户
 * @param {string} search - 搜索关键词
 * @returns {Promise}
 */
export const searchCustomers = async (search) => {
  const response = await api.get('/customers', { params: { search, pageSize: 20 } });
  return response.data;
};

/**
 * 导出订单到 Excel
 * @param {object} params - 筛选参数
 * @param {string} params.status - 订单状态
 * @param {string} params.paymentStatus - 支付状态
 * @param {string} params.startDate - 开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 结束日期 (YYYY-MM-DD)
 * @param {string} params.search - 搜索关键词
 * @returns {Promise} - 返回 blob 响应
 */
export const exportOrders = async (params = {}) => {
  const response = await api.get('/orders/export', {
    params,
    responseType: 'blob',
  });
  return response;
};

const ordersApi = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrderPayment,
  deleteOrder,
  getOrderStats,
  getAccommodations,
  getProjects,
  getPackages,
  searchCustomers,
  exportOrders,
};

export default ordersApi;
