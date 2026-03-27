import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n.js'
import axios from 'axios';

// Ensure API requests in electron correctly hit the localhost server instead of file:///
axios.interceptors.request.use(config => {
  if (config.url && config.url.startsWith('/api')) {
    config.url = `${import.meta.env.VITE_API_URL}${config.url}`;
  }
  return config;
});
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
