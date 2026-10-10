import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 for non-login endpoints
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config && error.config.url && error.config.url.includes('/auth/login');
    if (error.response && error.response.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Dispatch custom event or redirect
      window.dispatchEvent(new CustomEvent('auth:expired'));
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
