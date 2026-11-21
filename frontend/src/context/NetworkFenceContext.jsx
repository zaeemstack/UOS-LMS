import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import api from '../api/client.js';

const NetworkFenceContext = createContext(null);

export const NetworkFenceProvider = ({ children }) => {
  const { user, simulatedIp } = useAuth();
  const [isCampusNetwork, setIsCampusNetwork] = useState(true);
  const [isPerimeterBlocked, setIsPerimeterBlocked] = useState(false);
  const [blockedDetails, setBlockedDetails] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const socketRef = useRef(null);

  // Initial network check
  const checkNetworkStatus = async () => {
    try {
      const res = await api.get('/network/status');
      if (res.data.success) {
        setNetworkInfo(res.data.diagnostics);
        const allowed = Boolean(res.data.diagnostics.isAllowed);
        setIsCampusNetwork(allowed);
        if (!allowed) {
          setBlockedDetails({
            clientIp: res.data.diagnostics.clientIp,
            message: 'You are connected to an external network. University Wi-Fi is required to mark attendance.',
          });
        } else {
          setBlockedDetails(null);
        }
      }
    } catch (err) {
      console.error('Network status check failed:', err);
    }
  };

  useEffect(() => {
    checkNetworkStatus();

    // Listen for axios 403 perimeter breach (informational for attendance marking)
    const handleBreachEvent = (e) => {
      setIsCampusNetwork(false);
      setBlockedDetails(e.detail);
    };

    window.addEventListener('uos:perimeter-breach', handleBreachEvent);
    return () => window.removeEventListener('uos:perimeter-breach', handleBreachEvent);
  }, [simulatedIp]);

  // WebSocket Heartbeat connection
  useEffect(() => {
    let socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
    if (typeof window !== 'undefined' && window.location.origin.includes('localhost') && !window.location.origin.includes(':5000')) {
      socketUrl = 'http://localhost:5000';
    }
    // If running on Native Android Device, connect to your PC's IP
    if (typeof window !== 'undefined' && (window.location.protocol === 'capacitor:' || window.location.origin === 'https://localhost')) {
      socketUrl = 'http://192.168.100.226:5000';
    }
    const socket = io(socketUrl, {
      auth: simulatedIp ? { simulatedIp } : {},
      query: simulatedIp ? { simulatedIp } : {},
      extraHeaders: simulatedIp ? { 'x-simulated-ip': simulatedIp } : {},
      reconnectionAttempts: 5,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setHeartbeatActive(true);
      if (user) {
        socket.emit('REGISTER_USER', {
          userId: user.id,
          role: user.role,
          name: user.fullName,
        });
      }
    });

    socket.on('disconnect', () => {
      setHeartbeatActive(false);
    });

    // Campus perimeter status updates
    socket.on('CAMPUS_STATUS', (data) => {
      setIsCampusNetwork(Boolean(data.isCampusNetwork));
    });

    // Heartbeat ping loop every 10 seconds
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('HEARTBEAT_PING', { simulatedIp });
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [user, simulatedIp]);

  const resetPerimeterBlock = () => {
    setIsPerimeterBlocked(false);
    setBlockedDetails(null);
    checkNetworkStatus();
  };

  return (
    <NetworkFenceContext.Provider
      value={{
        isCampusNetwork,
        isPerimeterBlocked: false, // Never block entire app globally
        blockedDetails,
        networkInfo,
        heartbeatActive,
        resetPerimeterBlock,
        checkNetworkStatus,
        socket: socketRef.current,
      }}
    >
      {children}
    </NetworkFenceContext.Provider>
  );
};

export const useNetworkFence = () => useContext(NetworkFenceContext);
