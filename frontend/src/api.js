import axios from 'axios';

// Detect if running in Electron (window.electron is exposed by preload.js)
const isElectron = typeof window !== 'undefined' && window.electron !== undefined;

// Use localhost:5000 for Electron app, otherwise use env variable
let viteApiUrl;
if (isElectron) {
  viteApiUrl = 'http://localhost:5000';
} else {
  viteApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
}

if (viteApiUrl.endsWith('/')) viteApiUrl = viteApiUrl.slice(0, -1);
const API_BASE_URL = viteApiUrl.endsWith('/api') ? viteApiUrl : viteApiUrl + '/api';

console.log('🔧 API Configuration:', {
  isElectron,
  apiUrl: viteApiUrl,
  baseUrl: API_BASE_URL
});

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the financial year and company headers
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user) {
    if (user.financial_year) {
      config.headers['X-Financial-Year'] = user.financial_year;
    }
    if (user.company_id) {
      config.headers['X-Company-Id'] = user.company_id;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Products (Items)
export const productAPI = {
  getAll: () => api.get('/items'),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
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

// Sabhasad Master (Members)
export const sabhasadMasterApi = {
  getAllSabhasad: () => api.get('/members'),
  getSabhasadById: (id) => api.get(`/members/${id}`),
  getSabhasadByCode: (code) => api.get(`/members/code/${code}`),
  getLastCode: () => api.get('/members/last-code'),
  createSabhasad: (data) => api.post('/members', data),
  updateSabhasad: (id, data) => api.put(`/members/${id}`, data),
  deleteSabhasad: (id) => api.delete(`/members/${id}`),
  getAllVillages: () => api.get('/village'),
};

// Dangar Entry
export const dangarEntryApi = {
  getAll: (companyId, startDate, endDate) => api.get('/dangar-entry', { params: { companyId, startDate, endDate } }),
  getById: (id) => api.get(`/dangar-entry/${id}`),
  create: (data) => api.post('/dangar-entry', data),
  delete: (id) => api.delete(`/dangar-entry/${id}`),
};

// Bardan Entry
export const bardanEntryApi = {
  getAllEntries: () => api.get('/bardan-entry'),
  getEntryById: (id) => api.get(`/bardan-entry/${id}`),
  createEntry: (data) => api.post('/bardan-entry', data),
  updateEntry: (id, data) => api.put(`/bardan-entry/${id}`, data),
  deleteEntry: (id) => api.delete(`/bardan-entry/${id}`),
};

// Jama Bardan Entry
export const jamaBardanEntryApi = {
  getAllEntries: () => api.get('/jama-bardan-entry'),
  getEntryById: (id) => api.get(`/jama-bardan-entry/${id}`),
  createEntry: (data) => api.post('/jama-bardan-entry', data),
  updateEntry: (id, data) => api.put(`/jama-bardan-entry/${id}`, data),
  deleteEntry: (id) => api.delete(`/jama-bardan-entry/${id}`),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
