import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n.js'
import axios from 'axios';

const LOCAL_API_URL = 'http://127.0.0.1:5080';

function normalizeApiUrl(rawUrl) {
  const fallbackUrl = LOCAL_API_URL;

  if (!rawUrl || rawUrl === 'undefined') {
    return fallbackUrl;
  }

  let url = String(rawUrl).trim();
  url = url.replace(/:(5060|5050)(?=\/|$)/g, ':5080');

  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Ensure API requests in electron correctly hit the localhost server instead of file:///
axios.interceptors.request.use(config => {
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined;
  const baseUrl = normalizeApiUrl(import.meta.env.VITE_API_URL || LOCAL_API_URL);

  // Only process requests that target the API.
  if (config.url && config.url.startsWith('/api')) {
    const resolvedBaseUrl = isElectron ? LOCAL_API_URL : baseUrl;

    // Prevent duplicated /api/api/ if the base already ends with /api
    if (resolvedBaseUrl.endsWith('/api')) {
      config.url = resolvedBaseUrl + config.url.substring(4);
    } else {
      config.url = resolvedBaseUrl + config.url;
    }
  }

  // Fix cases where developers manually hardcoded full VITE_API_URL + /api.
  if (config.url && config.url.includes('/api/api/')) {
    config.url = config.url.replace('/api/api/', '/api/');
  }

  if (isElectron && config.url && /^https?:\/\//i.test(config.url)) {
    try {
      const parsed = new URL(config.url);
      if (parsed.pathname.includes('/api/')) {
        config.url = `${LOCAL_API_URL}${parsed.pathname}${parsed.search}`
          .replace(/127\.0\.0\.1:(5060|5050)/g, '127.0.0.1:5080')
          .replace(/localhost:(5060|5050)/g, 'localhost:5080');
      }
    } catch {
      config.url = config.url
        .replace(/127\.0\.0\.1:(5060|5050)/g, '127.0.0.1:5080')
        .replace(/localhost:(5060|5050)/g, 'localhost:5080');
    }
  }

  return config;
});
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
