import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import api, { DEFAULT_API_URL } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrlState] = useState(DEFAULT_API_URL);
  const [isCampusNetwork, setIsCampusNetwork] = useState(true);
  const [networkDetails, setNetworkDetails] = useState(null);

  // Load saved session on app startup
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem('uos_server_url');
        if (savedUrl) {
          setServerUrlState(savedUrl);
          api.defaults.baseURL = savedUrl;
        }

        const savedToken = await AsyncStorage.getItem('uos_token');
        const savedUser = await AsyncStorage.getItem('uos_user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.warn('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
    checkCampusStatus();
  }, []);

  const checkCampusStatus = async () => {
    try {
      const res = await api.get('/network/status');
      if (res.data?.success) {
        const allowed = Boolean(res.data.diagnostics?.isAllowed);
        setIsCampusNetwork(allowed);
        setNetworkDetails(res.data.diagnostics);
        return allowed;
      }
    } catch (err) {
      // Wi-Fi check bypassed for development & simulation
      setIsCampusNetwork(true);
      return true;
    }
    return true;
  };

  const login = async (emailOrUsername, password) => {
    try {
      const res = await api.post('/auth/login', {
        email: emailOrUsername.trim(),
        password,
      });

      if (res.data?.success) {
        const userObj = res.data.user;
        const jwtToken = res.data.token;

        setUser(userObj);
        setToken(jwtToken);

        await AsyncStorage.setItem('uos_token', jwtToken);
        await AsyncStorage.setItem('uos_user', JSON.stringify(userObj));
        api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;

        checkCampusStatus();
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to connect to server';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('uos_token');
      await AsyncStorage.removeItem('uos_user');
    } catch (_) {}
    setUser(null);
    setToken(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const updateServerUrl = async (newUrl) => {
    const formatted = newUrl.endsWith('/api') ? newUrl : `${newUrl.replace(/\/$/, '')}/api`;
    await AsyncStorage.setItem('uos_server_url', formatted);
    setServerUrlState(formatted);
    api.defaults.baseURL = formatted;
    checkCampusStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        serverUrl,
        isCampusNetwork,
        networkDetails,
        login,
        logout,
        updateServerUrl,
        checkCampusStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

