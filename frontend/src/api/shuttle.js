import api from '../utils/api';

// 每日统计
export const getDailyStats = (date) => api.get('/shuttle/daily-stats', { params: { date } });

// 导出每日统计
export const exportDailyStats = (date) => api.get('/shuttle/daily-stats/export', {
  params: { date },
  responseType: 'blob',
});

// 调度管理
export const getSchedules = (params) => api.get('/shuttle/schedules', { params });
export const getScheduleById = (id) => api.get(`/shuttle/schedules/${id}`);
export const getScheduleStops = (id) => api.get(`/shuttle/schedules/${id}/stops`);
export const createSchedule = (data) => api.post('/shuttle/schedules', data);
export const updateScheduleStatus = (id, data) => api.patch(`/shuttle/schedules/${id}/status`, data);
export const deleteSchedule = (id) => api.delete(`/shuttle/schedules/${id}`);

// 车辆管理
export const getVehicles = (params) => api.get('/shuttle/vehicles', { params });
export const createVehicle = (data) => api.post('/shuttle/vehicles', data);
export const updateVehicle = (id, data) => api.put(`/shuttle/vehicles/${id}`, data);

// 司机管理
export const getDrivers = (params) => api.get('/shuttle/drivers', { params });
export const createDriver = (data) => api.post('/shuttle/drivers', data);
export const updateDriver = (id, data) => api.put(`/shuttle/drivers/${id}`, data);

// 住宿地点
export const getAccommodations = () => api.get('/accommodations');

const shuttleApi = {
  getDailyStats,
  exportDailyStats,
  getSchedules,
  getScheduleById,
  getScheduleStops,
  createSchedule,
  updateScheduleStatus,
  deleteSchedule,
  getVehicles,
  createVehicle,
  updateVehicle,
  getDrivers,
  createDriver,
  updateDriver,
  getAccommodations,
};

export default shuttleApi;
