import api from '../utils/api';

/**
 * 用户登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise} - 返回登录结果
 */
export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

/**
 * 获取当前用户信息
 * @returns {Promise} - 返回用户信息
 */
export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

/**
 * 修改密码
 * @param {string} oldPassword - 旧密码
 * @param {string} newPassword - 新密码
 * @returns {Promise} - 返回修改结果
 */
export const changePassword = async (oldPassword, newPassword) => {
  const response = await api.put('/auth/password', { oldPassword, newPassword });
  return response.data;
};

export default {
  login,
  getProfile,
  changePassword,
};
