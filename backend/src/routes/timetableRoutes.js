import { Router } from 'express';
import { getTeacherTodaySchedule, getSlotRosterForMarking } from '../controllers/timetableController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// Routes for teacher to view timetable and roster
router.get('/today', requireAuth, getTeacherTodaySchedule);
router.get('/slot/:slotId/roster', requireAuth, getSlotRosterForMarking);

export default router;
