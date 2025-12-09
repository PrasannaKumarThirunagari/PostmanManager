/**
 * API configuration for backend communication.
 * Offline-first: All API calls go to local backend.
 */
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000',
  timeout: 30000,
  endpoints: {
    health: '/api/health',
    swagger: {
      list: '/api/swagger/files',
      get: (id) => `/api/swagger/files/${id}`,
      upload: '/api/swagger/upload',
      delete: (id) => `/api/swagger/files/${id}`,
    },
    collections: {
      list: '/api/collections',
      get: (id) => `/api/collections/${id}`,
      delete: (id) => `/api/collections/${id}`,
      download: (id) => `/api/collections/${id}/download`,
    },
    conversions: {
      convert: '/api/conversions/convert',
      list: '/api/conversions',
      get: (id) => `/api/conversions/${id}`,
    },
  },
};

export default API_CONFIG;
