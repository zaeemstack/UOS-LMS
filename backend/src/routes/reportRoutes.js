import { Router } from 'express';
import {
  getAttendanceSummaryReport,
  exportAttendanceReportCsv,
  getFacultyAttendanceAuditLedger,
  getFacultySemesterSummary,
  exportSingleTeacherSemesterCsv,
} from '../controllers/reportController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// HOD and ADMIN can view and export reports
router.use(requireAuth, requireRole('ADMIN', 'HOD'));

router.get('/summary', getAttendanceSummaryReport);
router.get('/export/csv', exportAttendanceReportCsv);
router.get('/faculty-audit-ledger', getFacultyAttendanceAuditLedger);
router.get('/faculty-semester-summary', getFacultySemesterSummary);
router.get('/teacher/:teacherId/export-semester-csv', exportSingleTeacherSemesterCsv);

export default router;
