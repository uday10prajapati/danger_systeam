import axios from 'axios';

let viteApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
if (viteApiUrl.endsWith('/')) viteApiUrl = viteApiUrl.slice(0, -1);
const API_BASE_URL = viteApiUrl.endsWith('/api') ? viteApiUrl : viteApiUrl + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Products
export const productAPI = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Sales
export const salesAPI = {
  getAll: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get('/sales', { params });
  },
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
};

// Reports
export const reportsAPI = {
  getDailySales: (date) => api.get(`/reports/daily-sales?date=${date}`),
  getInventory: () => api.get('/reports/inventory'),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
