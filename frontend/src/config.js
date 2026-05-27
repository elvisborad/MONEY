// Dynamic API Base URL configuration for local vs production deployment
export const API_BASE = import.meta.env.VITE_API_URL || '';

// Retrieve authorization headers for API requests
export const getAuthHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem('moneyvision_token');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};
