import axios from 'axios';
import API_CONFIG from '../config/api.config';

/**
 * API service for communicating with backend.
 * Handles all HTTP requests with proper error handling.
 */
const apiService = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiService.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiService.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server responded with error
      return Promise.reject({
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        message: 'No response from server. Please check if backend is running.',
        status: 0,
      });
    } else {
      // Error setting up request
      return Promise.reject({
        message: error.message || 'An error occurred',
        status: 0,
      });
    }
  }
);

export default apiService;
