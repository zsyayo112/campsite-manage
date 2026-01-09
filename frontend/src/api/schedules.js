import api from '../utils/api';

// 获取每日排期（时间轴格式）
export const getDailySchedules = (date) => api.get('/schedules/daily', { params: { date } });

// 排期CRUD
export const getScheduleById = (id) => api.get(`/schedules/${id}`);
export const createSchedule = (data) => api.post('/schedules', data);
export const updateSchedule = (id, data) => api.put(`/schedules/${id}`, data);
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`);

// 冲突检测
export const checkConflicts = (data) => api.post('/schedules/check-conflicts', data);

// 获取项目列表
export const getProjects = () => api.get('/projects');

// 获取教练列表
export const getCoaches = (params) => api.get('/schedules/coaches', { params });

const schedulesApi = {
  getDailySchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  checkConflicts,
  getProjects,
  getCoaches,
};

export default schedulesApi;
