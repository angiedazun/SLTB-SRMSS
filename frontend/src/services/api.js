import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach stored token
const token = localStorage.getItem('sltb_token');
if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Response interceptor — handle token expiry
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sltb_token');
      sessionStorage.removeItem('sltb_token');
      delete api.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
