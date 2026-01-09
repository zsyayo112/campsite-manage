import axios from 'axios';
import useAuthStore from '../store/authStore';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效，登出
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  getProfile: () => api.get('/auth/profile'),
};

// Customer API
export const customerAPI = {
  getList: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  export: (params) => api.get('/customers/export', {
    params,
    responseType: 'blob'
  }),
};

// Order API
export const orderAPI = {
  getList: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
};

// Shuttle API
export const shuttleAPI = {
  getDailyStats: (date) => api.get('/shuttle/daily-stats', { params: { date } }),
  getSchedules: (params) => api.get('/shuttle/schedules', { params }),
  createSchedule: (data) => api.post('/shuttle/schedules', data),
  updateScheduleStatus: (id, status) =>
    api.put(`/shuttle/schedules/${id}/status`, { status }),
  getVehicles: () => api.get('/shuttle/vehicles'),
  getDrivers: () => api.get('/shuttle/drivers'),
};

// Schedule API
export const scheduleAPI = {
  getDailySchedules: (date) => api.get('/schedules/daily', { params: { date } }),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
  checkConflicts: (data) => api.post('/schedules/check-conflicts', data),
  getCoaches: () => api.get('/schedules/coaches'),
};

// Package API
export const packageAPI = {
  getList: (params) => api.get('/packages', { params }),
  getById: (id) => api.get(`/packages/${id}`),
  calculatePrice: (data) => api.post('/packages/calculate-price', data),
};

// Project API
export const projectAPI = {
  getList: (params) => api.get('/projects', { params }),
};

// Accommodation API
export const accommodationAPI = {
  getList: (params) => api.get('/accommodations', { params }),
};
