import axios from 'axios';

// Detect if running in Electron (window.electron is exposed by preload.js)
const isElectron = typeof window !== 'undefined' && window.electron !== undefined;
const LOCAL_API_URL = 'http://127.0.0.1:5080';

function normalizeApiUrl(rawUrl) {
  const fallbackUrl = LOCAL_API_URL;

  if (!rawUrl || rawUrl === 'undefined') {
    return fallbackUrl;
  }

  let url = String(rawUrl).trim();

  // Never allow the Chromium-blocked 5060 port in the desktop app. Force 5080.
  url = url.replace(/:(5060|5050)(?=\/|$)/g, ':5080');

  // Electron should always talk to the local backend.
  if (isElectron) {
    return fallbackUrl;
  }

  return url;
}

// Use localhost:5080 for Electron app, otherwise use env variable
let viteApiUrl;
if (isElectron) {
  viteApiUrl = LOCAL_API_URL;
} else {
  const envUrl = import.meta.env.VITE_API_URL;
  viteApiUrl = normalizeApiUrl(envUrl);
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
  try {
    if (config.url) {
      config.url = config.url
        .replace(/127\.0\.0\.1:(5060|5050)/g, '127.0.0.1:5080')
        .replace(/localhost:(5060|5050)/g, 'localhost:5080');
    }

    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined') {
      const user = JSON.parse(userStr);
      if (user) {
        if (user.financial_year) {
          config.headers['X-Financial-Year'] = user.financial_year;
        }
        if (user.company_id) {
          config.headers['X-Company-Id'] = user.company_id;
        } else {
          console.warn('⚠️ Missing company_id in user session');
        }
        if (user.id) {
          config.headers['X-User-Id'] = user.id;
        }
      }
    } else {
      console.warn('⚠️ No user session found in localStorage');
    }
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
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
  getNextPCode: (isNominal) => api.get(`/members/next-pcode?isNominal=${isNominal}`),
  createSabhasad: (data) => api.post('/members', data),
  updateSabhasad: (id, data) => api.put(`/members/${id}`, data),
  deleteSabhasad: (id) => api.delete(`/members/${id}`),
  getAllVillages: () => api.get('/village'),
  getMemberBalance: (accountId, memberId) => api.get(`/account-ledger/member-balance/${accountId}/${memberId}`),
};

// Dangar Entry
export const dangarEntryApi = {
  getAll: (companyId, startDate, endDate) => api.get('/dangar-entry', { params: { companyId, startDate, endDate } }),
  getById: (id) => api.get(`/dangar-entry/${id}`),
  create: (data) => api.post('/dangar-entry', data),
  update: (id, data) => api.put(`/dangar-entry/${id}`, data),
  delete: (id) => api.delete(`/dangar-entry/${id}`),
};

// Bardan Entry
export const bardanEntryApi = {
  getAllEntries: () => api.get('/bardan-entry'),
  getEntryById: (id) => api.get(`/bardan-entry/${id}`),
  getEntryByPavti: (pavti) => api.get(`/bardan-entry/by-pavti/${encodeURIComponent(pavti)}`),
  createEntry: (data) => api.post('/bardan-entry', data),
  updateEntry: (id, data) => api.put(`/bardan-entry/${id}`, data),
  deleteEntry: (id) => api.delete(`/bardan-entry/${id}`),
  getBalance: (code) => api.get(`/bardan-entry/balance/${code}`),
  getLedger: (code) => api.get(`/bardan-entry/ledger/${code}`),
};

// Jama Bardan Entry
export const jamaBardanEntryApi = {
  getAllEntries: () => api.get('/jama-bardan-entry'),
  getEntryById: (id) => api.get(`/jama-bardan-entry/${id}`),
  getEntryByPavti: (pavti) => api.get(`/jama-bardan-entry/by-pavti/${encodeURIComponent(pavti)}`),
  createEntry: (data) => api.post('/jama-bardan-entry', data),
  updateEntry: (id, data) => api.put(`/jama-bardan-entry/${id}`, data),
  deleteEntry: (id) => api.delete(`/jama-bardan-entry/${id}`),
};

// Bank Master
export const bankApi = {
  getAll: () => api.get('/banks'),
  create: (data) => api.post('/banks', data),
  delete: (id) => api.delete(`/banks/${id}`),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
