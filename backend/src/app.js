import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ipFenceMiddleware } from './middlewares/ipFenceMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import networkRoutes from './routes/networkRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

dotenv.config();

const app = express();

// Security Headers with Helmet (HSTS & Strict Perimeter)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: false,
    frameguard: { action: 'sameorigin' },
    dnsPrefetchControl: { allow: false },
    xContentTypeOptions: false,
  })
);

// Enforce HTTPS in production when behind reverse proxies (Nginx / Cloudflare)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });
}

// Rate Limiting for Auth & Sensitive Endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit login attempts to 20 per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

// Universal Domain & CORS Access Configuration:
// Allows access from Localhost, Campus Server IP (http://172.200.32.10:5000),
// and Mobile Biometric Domain (http://172.200.32.10.sslip.io:5000)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-simulated-ip'],
}));

app.use(express.json());
app.use('/api', apiLimiter);

// Public health & network diagnostics endpoint (doesn't block so client can check network state)
app.use('/api/network', networkRoutes);

// Core university academic endpoints
// Authentication and dashboards are publicly accessible (for mobile app users anywhere)
// Sensitive attendance submission is strictly perimeter-fenced to University Wi-Fi in attendanceRoutes.js
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const candidateDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../dist'),
  path.resolve(__dirname, '../public'),
];
const frontendDist = candidateDistPaths.find((p) => fs.existsSync(p));

// In production, serve the compiled React SPA directly
if (frontendDist) {
  console.log('[SPA] Serving frontend from:', frontendDist);
  app.use(express.static(frontendDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Fallback 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API Endpoint ${req.originalUrl} not found.` });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;

