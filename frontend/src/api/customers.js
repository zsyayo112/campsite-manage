import api from '../utils/api';

/**
 * 获取客户列表
 * @param {object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.search - 搜索关键词
 * @param {string} params.source - 来源筛选
 * @param {string} params.sortBy - 排序字段
 * @param {string} params.sortOrder - 排序方向 (asc/desc)
 * @returns {Promise}
 */
export const getCustomers = async (params = {}) => {
  const response = await api.get('/customers', { params });
  return response.data;
};

/**
 * 获取客户详情
 * @param {number} id - 客户ID
 * @returns {Promise}
 */
export const getCustomerById = async (id) => {
  const response = await api.get(`/customers/${id}`);
  return response.data;
};

/**
 * 创建客户
 * @param {object} data - 客户数据
 * @returns {Promise}
 */
export const createCustomer = async (data) => {
  const response = await api.post('/customers', data);
  return response.data;
};

/**
 * 更新客户
 * @param {number} id - 客户ID
 * @param {object} data - 更新数据
 * @returns {Promise}
 */
export const updateCustomer = async (id, data) => {
  const response = await api.put(`/customers/${id}`, data);
  return response.data;
};

/**
 * 删除客户
 * @param {number} id - 客户ID
 * @returns {Promise}
 */
export const deleteCustomer = async (id) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};

/**
 * 获取客户统计
 * @param {number} id - 客户ID
 * @returns {Promise}
 */
export const getCustomerStats = async (id) => {
  const response = await api.get(`/customers/${id}/stats`);
  return response.data;
};

/**
 * 导出客户列表到 Excel
 * @param {object} params - 筛选参数
 * @param {string} params.search - 搜索关键词
 * @param {string} params.source - 来源筛选
 * @param {string} params.startDate - 开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 结束日期 (YYYY-MM-DD)
 * @returns {Promise} - 返回 blob 响应
 */
export const exportCustomers = async (params = {}) => {
  const response = await api.get('/customers/export', {
    params,
    responseType: 'blob',
  });
  return response;
};

export default {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  exportCustomers,
};
