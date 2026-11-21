import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Dynamic API URL for Local Development, Native Android App, & Production Server
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('uos_api_url');
    if (saved) return saved;
    if (Capacitor.isNativePlatform()) {
      // Connects to your PC's IP over local Wi-Fi or adb reverse
      return 'http://192.168.100.226:5000/api';
    }
  }
  return import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
});

// Request interceptor: Attach Auth Token and Simulated IP header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('uos_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Optional simulated IP for testing perimeter gatekeeper
    const simulatedIp = localStorage.getItem('uos_simulated_ip');
    if (simulatedIp) {
      config.headers['x-simulated-ip'] = simulatedIp;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Detect Campus Perimeter Breach (403 CAMPUS_PERIMETER_RESTRICTION)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'CAMPUS_PERIMETER_RESTRICTION') {
      window.dispatchEvent(
        new CustomEvent('uos:perimeter-breach', {
          detail: error.response.data,
        })
      );
    }
    return Promise.reject(error);
  }
);

export default api;
