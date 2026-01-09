import api from '../utils/api';

/**
 * 获取用户列表
 * @param {object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.search - 搜索关键词
 * @param {string} params.role - 角色筛选
 * @returns {Promise}
 */
export const getUsers = async (params = {}) => {
  const response = await api.get('/users', { params });
  return response.data;
};

/**
 * 获取用户详情
 * @param {number} id - 用户ID
 * @returns {Promise}
 */
export const getUserById = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

/**
 * 创建用户
 * @param {object} data - 用户数据
 * @returns {Promise}
 */
export const createUser = async (data) => {
  const response = await api.post('/users', data);
  return response.data;
};

/**
 * 更新用户
 * @param {number} id - 用户ID
 * @param {object} data - 更新数据
 * @returns {Promise}
 */
export const updateUser = async (id, data) => {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
};

/**
 * 删除用户
 * @param {number} id - 用户ID
 * @returns {Promise}
 */
export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

/**
 * 重置用户密码
 * @param {number} id - 用户ID
 * @param {string} newPassword - 新密码
 * @returns {Promise}
 */
export const resetPassword = async (id, newPassword) => {
  const response = await api.put(`/users/${id}/reset-password`, { newPassword });
  return response.data;
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
};
