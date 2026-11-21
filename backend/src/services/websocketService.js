import { Server } from 'socket.io';
import { isIpInCampusSubnet, getClientIp } from '../utils/ipUtils.js';

let ioInstance = null;

// Track active authenticated clients: socketId -> { userId, role, ip, lastPing }
const activeSockets = new Map();

export function initWebSocketServer(server) {
  if (ioInstance) {
    try {
      ioInstance.attach(server);
      return ioInstance;
    } catch (err) {
      console.warn('[WebSocket] Error attaching additional server to WebSocket:', err.message);
      return ioInstance;
    }
  }

  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  ioInstance.on('connection', (socket) => {
    // Determine socket IP
    const handshake = socket.handshake;
    let clientIp = handshake.headers['x-forwarded-for']
      ? handshake.headers['x-forwarded-for'].split(',')[0].trim()
      : handshake.address;

    const simIp = handshake.headers['x-simulated-ip'] || handshake.auth?.simulatedIp || handshake.query?.simulatedIp;
    if (process.env.NODE_ENV !== 'production' && simIp) {
      clientIp = String(simIp).trim();
    }

    if (clientIp && clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }
    if (clientIp === '::1') clientIp = '127.0.0.1';

    // Check campus network status
    const isAllowed = isIpInCampusSubnet(clientIp) || process.env.BYPASS_NETWORK_FENCE === 'true';

    // Notify connected client of their campus perimeter status (does not kick them out)
    socket.emit('CAMPUS_STATUS', {
      isCampusNetwork: isAllowed,
      clientIp,
      message: isAllowed
        ? 'Connected to authorized University Campus Wi-Fi'
        : 'Connected via External Network / Mobile Data. (Campus Wi-Fi required only to mark attendance)',
    });

    // Register heartbeat
    activeSockets.set(socket.id, {
      socketId: socket.id,
      clientIp,
      connectedAt: new Date(),
      lastPing: Date.now(),
      userId: null,
      role: null,
    });

    // Handle authentication / identity registration
    socket.on('REGISTER_USER', (userData) => {
      const client = activeSockets.get(socket.id);
      if (client) {
        client.userId = userData.userId;
        client.role = userData.role;
        client.name = userData.name;
        activeSockets.set(socket.id, client);
      }
      socket.emit('REGISTERED', { status: 'OK', clientIp });
    });

    // Client heartbeat ping
    socket.on('HEARTBEAT_PING', (payload) => {
      const client = activeSockets.get(socket.id);
      if (client) {
        client.lastPing = Date.now();
        const currentIp = payload?.simulatedIp || client.clientIp;
        const isCampus = isIpInCampusSubnet(currentIp) || process.env.BYPASS_NETWORK_FENCE === 'true';

        socket.emit('CAMPUS_STATUS', {
          isCampusNetwork: isCampus,
          clientIp: currentIp,
        });

        socket.emit('HEARTBEAT_PONG', {
          timestamp: Date.now(),
          campusConnected: isCampus,
          clientIp: currentIp,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      activeSockets.delete(socket.id);
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function broadcastSlotUnlocked(slotId, overrideData) {
  if (ioInstance) {
    ioInstance.emit('SLOT_OVERRIDE_GRANTED', {
      slotId,
      ...overrideData,
      timestamp: new Date().toISOString(),
    });
  }
}

export function broadcastAttendanceSubmission(sessionData) {
  if (ioInstance) {
    ioInstance.emit('LIVE_ATTENDANCE_UPDATE', {
      ...sessionData,
      timestamp: new Date().toISOString(),
    });
  }
}
