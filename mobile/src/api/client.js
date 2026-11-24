import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default PC Wi-Fi IP for local testing (University Network)
export const DEFAULT_API_URL = 'http://172.200.63.13:5000/api';

const api = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 10000,
});

// Load custom API URL if saved
AsyncStorage.getItem('uos_server_url').then((savedUrl) => {
  if (savedUrl) {
    api.defaults.baseURL = savedUrl;
  }
}).catch(() => {});

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('uos_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const customUrl = await AsyncStorage.getItem('uos_server_url');
      if (customUrl) {
        config.baseURL = customUrl;
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

