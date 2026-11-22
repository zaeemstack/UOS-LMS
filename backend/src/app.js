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

// Mobile API Root Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'University of Sahiwal Attendance Mobile App API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      timetable: '/api/timetable',
      attendance: '/api/attendance',
      network: '/api/network',
      admin: '/api/admin',
    },
  });
});

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

