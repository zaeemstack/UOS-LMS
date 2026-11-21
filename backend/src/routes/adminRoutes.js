import { Router } from 'express';
import {
  getLiveAdminDashboard,
  overrideSlotLock,
  getDelinquencyReport,
  getPerimeterAuditLogs,
  getTimetableMetadata,
  createTimetableSlot,
  deleteTimetableSlot,
  handleBulkImport,
  downloadTemplate,
  getOverrideRequests,
  reviewOverrideRequest,
  getAllUsers,
  resetUserPassword,
  getDepartments,
  createUser,
  deleteUser,
  createDepartment,
  createCourse,
  createSection,
  getAttendanceResetSummary,
  purgeAttendanceRecords,
  getTeacherAttendanceRecordsForAdmin,
  importTimetablePasteAndSmartUpdate,
  getTimetableVersions,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import multer from 'multer';
import fs from 'fs';

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Accept CSV, PDF, and Word (.doc / .docx) files up to 25 MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/csv',
      'application/pdf',
      'application/msword',                                          // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/octet-stream',                                   // generic binary (fallback)
    ];
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    const allowedExts = ['csv', 'pdf', 'doc', 'docx'];

    if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only CSV, PDF, and Word documents are allowed.`));
    }
  },
});

const router = Router();

// Allow template download
router.get('/import/template/:type', downloadTemplate);

// Restrict all remaining admin routes to ADMIN or HOD
router.use(requireAuth, requireRole('ADMIN', 'HOD'));

router.get('/dashboard', getLiveAdminDashboard);
router.post('/override', overrideSlotLock);
router.get('/delinquency-report', getDelinquencyReport);
router.get('/audit-logs', getPerimeterAuditLogs);

// Override Requests from Teachers
router.get('/override-requests', getOverrideRequests);
router.post('/override-requests/review', reviewOverrideRequest);

// User & HOD Password Management
router.get('/users', getAllUsers);
router.get('/teachers/:teacherId/attendance', getTeacherAttendanceRecordsForAdmin);
router.post('/users', requireRole('ADMIN'), createUser);
router.delete('/users/:userId', requireRole('ADMIN'), deleteUser);
router.post('/users/reset-password', requireRole('ADMIN'), resetUserPassword);
router.get('/departments', getDepartments);
router.post('/departments', requireRole('ADMIN'), createDepartment);
router.post('/courses', requireRole('ADMIN', 'HOD'), createCourse);
router.post('/sections', requireRole('ADMIN', 'HOD'), createSection);

// Timetable & Class Schedule Management
router.get('/timetable/manage', getTimetableMetadata);
router.post('/timetable/slot', createTimetableSlot);
router.delete('/timetable/slot/:slotId', deleteTimetableSlot);
router.post('/timetable/paste-import', importTimetablePasteAndSmartUpdate);
router.get('/timetable/versions', getTimetableVersions);

// Bulk CSV Upload Routes
router.post('/import/:type', upload.single('file'), handleBulkImport);

// Academic Reset & Fresh Start (Semester / Post-Pilot Purge)
router.get('/reset-attendance/summary', getAttendanceResetSummary);
router.post('/reset-attendance/purge', purgeAttendanceRecords);

export default router;

