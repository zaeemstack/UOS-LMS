import { Router } from 'express';
import {
  submitDualAttendance,
  getTeacherAttendanceHistory,
  createOverrideRequest,
  getTeacherOverrideRequests,
  importStudentsForClass,
} from '../controllers/attendanceController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { ipFenceMiddleware } from '../middlewares/ipFenceMiddleware.js';
import multer from 'multer';
import fs from 'fs';

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max
});

const router = Router();

// Strict Security: Attendance submission can ONLY be executed when connected to University Wi-Fi!
router.post('/submit', requireAuth, ipFenceMiddleware({ logViolations: true }), submitDualAttendance);
router.get('/history', requireAuth, getTeacherAttendanceHistory);
router.post('/request-override', requireAuth, createOverrideRequest);
router.get('/override-requests', requireAuth, getTeacherOverrideRequests);

// Teacher Class Student Roster Import (CSV, TXT, Excel-CSV list)
router.post('/import-students', requireAuth, upload.single('file'), importStudentsForClass);

export default router;

