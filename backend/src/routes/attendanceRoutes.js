import { Router } from 'express';
import {
  submitDualAttendance,
  getTeacherAttendanceHistory,
  createOverrideRequest,
  getTeacherOverrideRequests,
} from '../controllers/attendanceController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { ipFenceMiddleware } from '../middlewares/ipFenceMiddleware.js';

const router = Router();

// Strict Security: Attendance submission can ONLY be executed when connected to University Wi-Fi!
router.post('/submit', requireAuth, ipFenceMiddleware({ logViolations: true }), submitDualAttendance);
router.get('/history', requireAuth, getTeacherAttendanceHistory);
router.post('/request-override', requireAuth, createOverrideRequest);
router.get('/override-requests', requireAuth, getTeacherOverrideRequests);

export default router;

