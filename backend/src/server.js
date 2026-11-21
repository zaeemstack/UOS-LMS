import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import app from './app.js';
import { initWebSocketServer } from './services/websocketService.js';
import { getConfiguredCampusSubnets } from './utils/ipUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT, 10) || 443;
const HTTP_PORT = parseInt(process.env.HTTP_PORT, 10) || 80;
const SERVER_IP = process.env.SERVER_IP || '172.200.32.10';
const SERVER_DOMAIN = process.env.SERVER_DOMAIN || `${SERVER_IP}.sslip.io`;

// Load SSL Certificates
let sslOptions = null;
const keyPath = path.resolve(__dirname, '../certs/server.key');
const crtPath = path.resolve(__dirname, '../certs/server.crt');

if (fs.existsSync(keyPath) && fs.existsSync(crtPath)) {
  try {
    sslOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(crtPath),
    };
  } catch (err) {
    console.warn('[SSL] Could not load SSL certificates:', err.message);
  }
}

// 1. Primary HTTP Server (Port 5000)
const httpServer = http.createServer(app);
initWebSocketServer(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(` University Attendance System: Backend Server Running`);
  console.log(` Local HTTP:       http://localhost:${PORT}`);
  console.log(` Campus Server IP: http://${SERVER_IP}:${PORT}`);
  console.log(` Campus Subnets:  `, getConfiguredCampusSubnets().join(', '));
  console.log(` Perimeter Fence:  ${process.env.BYPASS_NETWORK_FENCE === 'true' ? 'DISABLED (Testing)' : 'ACTIVE'}`);
  console.log(` Room Geofencing:  ${process.env.BYPASS_ROOM_ROUTER === 'true' ? 'DISABLED (Testing)' : 'STRICT ENFORCEMENT'}`);
});

// 2. HTTPS Server (Port 443 for Mobile Fingerprint & WebAuthn)
if (sslOptions) {
  try {
    const httpsServer = https.createServer(sslOptions, app);
    initWebSocketServer(httpsServer);

    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(` HTTPS (SSL Live): https://${SERVER_DOMAIN} (Port ${HTTPS_PORT})`);
      console.log(` Mobile Biometric: https://${SERVER_DOMAIN} (WebAuthn Enabled)`);
      console.log(`=======================================================`);
    }).on('error', (err) => {
      console.warn(`[HTTPS Warning] Port ${HTTPS_PORT} unavailable (${err.message}). Trying fallback port 5443...`);
      try {
        const fallbackServer = https.createServer(sslOptions, app);
        initWebSocketServer(fallbackServer);
        fallbackServer.listen(5443, '0.0.0.0', () => {
          console.log(` HTTPS Fallback:   https://${SERVER_DOMAIN}:5443`);
          console.log(`=======================================================`);
        });
      } catch (_) { }
    });
  } catch (e) {
    console.warn('[HTTPS] Could not start HTTPS server:', e.message);
  }
}

// 3. Port 80 Redirector (automatically upgrades http:// to https://)
if (HTTP_PORT !== PORT) {
  try {
    const redirectApp = (req, res) => {
      const host = req.headers.host ? req.headers.host.split(':')[0] : SERVER_DOMAIN;
      res.writeHead(301, { Location: `https://${host}${req.url}` });
      res.end();
    };
    const p80Server = http.createServer(redirectApp);
    p80Server.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(` HTTP Auto-Redirect: Port 80 -> HTTPS (Port 443)`);
    }).on('error', () => {
      // Port 80 may be used by IIS or Apache, silently ignore
    });
  } catch (_) { }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
  httpServer.close(async () => {
    try {
      const { default: prisma } = await import('./config/db.js');
      await prisma.$disconnect();
      console.log('[Database] Disconnected cleanly.');
    } catch (_) { }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


