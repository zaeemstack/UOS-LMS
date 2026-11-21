import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulatedIp, setSimulatedIpState] = useState(localStorage.getItem('uos_simulated_ip') || '');

  useEffect(() => {
    const token = localStorage.getItem('uos_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.user);
          }
        })
        .catch(() => {
          localStorage.removeItem('uos_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('uos_token', res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('uos_token');
    setUser(null);
  };

  const setSimulatedIp = (ip) => {
    if (ip) {
      localStorage.setItem('uos_simulated_ip', ip);
      setSimulatedIpState(ip);
    } else {
      localStorage.removeItem('uos_simulated_ip');
      setSimulatedIpState('');
    }
    // Refresh page or trigger re-check
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, simulatedIp, setSimulatedIp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
