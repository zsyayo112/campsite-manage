import api from '../utils/api';

// 获取仪表盘统计数据
export const getDashboardStats = () => api.get('/dashboard/stats');

// 获取营收趋势（最近30天）
export const getRevenueTrend = (days = 30) => api.get('/dashboard/revenue-trend', { params: { days } });

// 获取订单状态分布
export const getOrderStatusDistribution = () => api.get('/dashboard/order-status');

// 获取项目热度排行
export const getProjectRanking = (limit = 10) => api.get('/dashboard/project-ranking', { params: { limit } });

// 获取客户来源分布
export const getCustomerSourceDistribution = () => api.get('/dashboard/customer-source');

const dashboardApi = {
  getDashboardStats,
  getRevenueTrend,
  getOrderStatusDistribution,
  getProjectRanking,
  getCustomerSourceDistribution,
};

export default dashboardApi;
