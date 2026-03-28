import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n.js'
import axios from 'axios';

// Ensure API requests in electron correctly hit the localhost server instead of file:///
axios.interceptors.request.use(config => {
  // Only process relative paths starting with /api
  if (config.url && config.url.startsWith('/api')) {
    let baseUrl = import.meta.env.VITE_API_URL || '';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    // Prevent duplicated /api/api/ if VITE_API_URL ends with /api
    if (baseUrl.endsWith('/api')) {
      config.url = baseUrl + config.url.substring(4);
    } else {
      config.url = baseUrl + config.url;
    }
  }
  
  // Fix cases where developers manually hardcoded full VITE_API_URL + /api
  // which might result in https://domain.com/api/api/...
  if (config.url && config.url.includes('/api/api/')) {
    config.url = config.url.replace('/api/api/', '/api/');
  }

  return config;
});
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
