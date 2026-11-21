import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Lock,
  Unlock,
  AlertOctagon,
  Clock,
  Users,
  MapPin,
  RefreshCw,
  FileText,
  ShieldAlert,
  Send,
  Radio,
  Plus,
  Trash2,
  Calendar,
  UploadCloud,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Copy,
  Search,
  Key,
  Check,
  Wifi,
  Edit2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetworkFence } from '../context/NetworkFenceContext.jsx';
import { StatusBadge } from '../components/common/Badge.jsx';
import { AttendanceReportModal } from '../components/reports/AttendanceReportModal.jsx';
import { formatTimeRange } from '../utils/timeUtils.js';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { socket } = useNetworkFence();
  const [dashboardData, setDashboardData] = useState(null);
  const [delinquencyData, setDelinquencyData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'requests' | 'users' | 'delinquency' | 'manage' | 'perimeter'
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  // New HOD & Security state
  const [overrideRequests, setOverrideRequests] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordResetting, setPasswordResetting] = useState(false);

  // Timetable Scheduler state
  const [timetableMeta, setTimetableMeta] = useState({ teachers: [], courses: [], sections: [], rooms: [] });
  const [masterSlots, setMasterSlots] = useState([]);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newSlotForm, setNewSlotForm] = useState({
    teacherId: '',
    courseId: '',
    sectionId: '',
    roomId: '',
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '10:30',
  });
  const [addingSlot, setAddingSlot] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({}); // { [type]: { state: 'uploading'|'success'|'error', fileName, message } }
  const [timetableDayFilter, setTimetableDayFilter] = useState('ALL');
  const [timetableSearchQuery, setTimetableSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [copiedUserId, setCopiedUserId] = useState(null);

  // Override Modal state
  const [overrideModalSlot, setOverrideModalSlot] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [notification, setNotification] = useState('');

  // Classroom Routers & Geofence state
  const [roomsList, setRoomsList] = useState([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [editRoomModal, setEditRoomModal] = useState(null);
  const [editRoomForm, setEditRoomForm] = useState({
    routerName: '',
    routerIp: '',
    routerMac: '',
    routerSsid: '',
    assignedSubnet: '',
  });
  const [savingRoomRouter, setSavingRoomRouter] = useState(false);
  const [autoLinkingId, setAutoLinkingId] = useState(null);

  // Semester Reset & Fresh Start state
  const [resetSummary, setResetSummary] = useState(null);
  const [loadingResetSummary, setLoadingResetSummary] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [purgingData, setPurgingData] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const fetchResetSummary = async () => {
    try {
      setLoadingResetSummary(true);
      const res = await api.get('/admin/reset-attendance/summary');
      if (res.data.success) {
        setResetSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch reset summary:', err);
    } finally {
      setLoadingResetSummary(false);
    }
  };

  const handlePurgeAttendanceData = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') {
      alert('Security Verification: Please type RESET to confirm data purge.');
      return;
    }

    setPurgingData(true);
    try {
      const res = await api.post('/admin/reset-attendance/purge', {
        confirmationCode: 'RESET',
      });
      if (res.data.success) {
        setResetSuccessMessage(res.data.message);
        setNotification(`✅ ${res.data.message}`);
        setShowResetConfirmModal(false);
        setResetConfirmInput('');
        fetchResetSummary();
        fetchLiveDashboard();
        fetchDelinquency();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to purge attendance data.');
    } finally {
      setPurgingData(false);
    }
  };

  // Faculty Attendance Ledger & Per-Teacher Export state
  const [facultyLedger, setFacultyLedger] = useState([]);
  const [facultySummary, setFacultySummary] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedLedgerTeacher, setSelectedLedgerTeacher] = useState('ALL');
  const [downloadingTeacherId, setDownloadingTeacherId] = useState(null);

  const fetchFacultyLedger = async () => {
    try {
      setLoadingLedger(true);
      const res = await api.get('/reports/faculty-audit-ledger', {
        params: {
          departmentId: selectedDeptFilter || undefined,
        },
      });
      if (res.data.success) {
        setFacultyLedger(res.data.records);
      }
    } catch (err) {
      console.error('Failed to fetch faculty audit ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchFacultySummary = async () => {
    try {
      const res = await api.get('/reports/faculty-semester-summary', {
        params: {
          departmentId: selectedDeptFilter || undefined,
        },
      });
      if (res.data.success) {
        setFacultySummary(res.data.teachers);
      }
    } catch (err) {
      console.error('Failed to fetch faculty summary:', err);
    }
  };

  const handleDownloadTeacherSemesterCsv = async (teacherId, teacherName) => {
    setDownloadingTeacherId(teacherId);
    try {
      const res = await api.get(`/reports/teacher/${teacherId}/export-semester-csv`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${teacherName.replace(/\s+/g, '_')}_Semester_Attendance_Ledger.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNotification(`✅ Downloaded semester attendance CSV for ${teacherName}`);
      setTimeout(() => setNotification(''), 5000);
    } catch (err) {
      alert('Failed to download teacher attendance CSV.');
    } finally {
      setDownloadingTeacherId(null);
    }
  };

  // Quick Entity Creation States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    employeeOrRollId: '',
    role: 'TEACHER',
    departmentId: '',
    password: 'password123',
  });
  const [addingUser, setAddingUser] = useState(false);

  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    roomNumber: '',
    building: 'Academic Block (Physics)',
    floor: 1,
    routerName: '',
    routerIp: '',
    routerMac: '',
    routerSsid: '',
    assignedSubnet: '',
  });
  const [addingRoom, setAddingRoom] = useState(false);

  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptForm, setNewDeptForm] = useState({ name: '', code: '' });
  const [addingDept, setAddingDept] = useState(false);

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({ code: '', title: '', creditHours: 3, departmentId: '' });
  const [addingCourse, setAddingCourse] = useState(false);

  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionForm, setNewSectionForm] = useState({ name: '', semester: 1, academicYear: '2025-2026', departmentId: '' });
  const [addingSection, setAddingSection] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      const res = await api.post('/admin/users', newUserForm);
      if (res.data.success) {
        setNotification(`✅ ${res.data.message}`);
        setShowAddUserModal(false);
        setNewUserForm({
          fullName: '',
          email: '',
          employeeOrRollId: '',
          role: 'TEACHER',
          departmentId: departments[0]?.id || '',
          password: 'password123',
        });
        fetchUsersList();
        fetchTimetableData();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This cannot be undone.`)) return;
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      if (res.data.success) {
        setNotification(`✅ User "${userName}" deleted.`);
        fetchUsersList();
        fetchTimetableData();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setAddingRoom(true);
    try {
      const res = await api.post('/network/rooms', newRoomForm);
      if (res.data.success) {
        setNotification(`✅ ${res.data.message}`);
        setShowAddRoomModal(false);
        setNewRoomForm({
          roomNumber: '',
          building: 'Academic Block (Physics)',
          floor: 1,
          routerName: '',
          routerIp: '',
          routerMac: '',
          routerSsid: '',
          assignedSubnet: '',
        });
        fetchRoomsList();
        fetchTimetableData();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create classroom.');
    } finally {
      setAddingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId, roomNumber) => {
    if (!window.confirm(`Are you sure you want to delete classroom "${roomNumber}"?`)) return;
    try {
      const res = await api.delete(`/network/rooms/${roomId}`);
      if (res.data.success) {
        setNotification(`✅ Classroom "${roomNumber}" deleted.`);
        fetchRoomsList();
        fetchTimetableData();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete room.');
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setAddingDept(true);
    try {
      const res = await api.post('/admin/departments', newDeptForm);
      if (res.data.success) {
        setNotification(`✅ ${res.data.message}`);
        setShowAddDeptModal(false);
        setNewDeptForm({ name: '', code: '' });
        fetchDepartments();
        fetchTimetableData();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create department.');
    } finally {
      setAddingDept(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setAddingCourse(true);
    try {
      const res = await api.post('/admin/courses', newCourseForm);
      if (res.data.success) {
        setNotification(`✅ ${res.data.message}`);
        setShowAddCourseModal(false);
        setNewCourseForm({ code: '', title: '', creditHours: 3, departmentId: departments[0]?.id || '' });
        fetchTimetableData();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create course.');
    } finally {
      setAddingCourse(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setAddingSection(true);
    try {
      const res = await api.post('/admin/sections', newSectionForm);
      if (res.data.success) {
        setNotification(`✅ ${res.data.message}`);
        setShowAddSectionModal(false);
        setNewSectionForm({ name: '', semester: 1, academicYear: '2025-2026', departmentId: departments[0]?.id || '' });
        fetchTimetableData();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create section.');
    } finally {
      setAddingSection(false);
    }
  };

  const fetchRoomsList = async () => {
    try {
      const res = await api.get('/network/rooms');
      if (res.data.success) {
        setRoomsList(res.data.rooms);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const handleOpenEditRoom = (room) => {
    setEditRoomModal(room);
    setEditRoomForm({
      routerName: room.routerName || '',
      routerIp: room.routerIp || '',
      routerMac: room.routerMac || '',
      routerSsid: room.routerSsid || '',
      assignedSubnet: room.assignedSubnet || '',
    });
  };

  const handleSaveRoomRouter = async (e) => {
    e.preventDefault();
    if (!editRoomModal) return;
    setSavingRoomRouter(true);
    try {
      const res = await api.put(`/network/rooms/${editRoomModal.id}`, editRoomForm);
      if (res.data.success) {
        setNotification(`✅ Room ${editRoomModal.roomNumber} router geofence updated!`);
        setEditRoomModal(null);
        fetchRoomsList();
        setTimeout(() => setNotification(''), 6000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update room router.');
    } finally {
      setSavingRoomRouter(false);
    }
  };

  const handleAutoLinkRoom = async (roomId, roomNumber) => {
    setAutoLinkingId(roomId);
    try {
      const res = await api.post(`/network/rooms/${roomId}/auto-link`);
      if (res.data.success) {
        setNotification(`📡 Room ${roomNumber} auto-linked to current Wi-Fi (${res.data.room.assignedSubnet})!`);
        fetchRoomsList();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to auto-link room to Wi-Fi.');
    } finally {
      setAutoLinkingId(null);
    }
  };

  const fetchOverrideRequests = async () => {
    try {
      const res = await api.get('/admin/override-requests');
      if (res.data.success) {
        setOverrideRequests(res.data.requests);
      }
    } catch (err) {
      console.error('Failed to load override requests:', err);
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load users list:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      if (res.data.success) {
        setDepartments(res.data.departments);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleReviewRequest = async (requestId, status) => {
    try {
      const res = await api.post('/admin/override-requests/review', { requestId, status });
      if (res.data.success) {
        setNotification(`Request ${status.toLowerCase()} by HOD!`);
        fetchOverrideRequests();
        fetchLiveDashboard();
        setTimeout(() => setNotification(''), 6000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review request.');
    }
  };

  const handleResetUserPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordModalUser || !newPasswordInput.trim()) return;

    setPasswordResetting(true);
    try {
      const res = await api.post('/admin/users/reset-password', {
        userId: resetPasswordModalUser.id,
        newPassword: newPasswordInput.trim(),
      });
      if (res.data.success) {
        setNotification(res.data.message);
        setResetPasswordModalUser(null);
        setNewPasswordInput('');
        fetchUsersList();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setPasswordResetting(false);
    }
  };

  const handleBulkUpload = async (type, file, inputElement) => {
    if (!file) return;
    setUploadingType(type);
    setUploadStatus((prev) => ({
      ...prev,
      [type]: { state: 'uploading', fileName: file.name, message: `Processing ${file.name}...` },
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/admin/import/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        const msg = res.data.message || 'Import completed successfully!';
        setUploadStatus((prev) => ({
          ...prev,
          [type]: { state: 'success', fileName: file.name, message: msg },
        }));
        setNotification(`✅ ${msg}`);
        fetchTimetableData();
        fetchLiveDashboard();
        setTimeout(() => setNotification(''), 10000);
      } else {
        throw new Error(res.data.message || 'Import failed.');
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Bulk import failed. Please check the file format.';
      setUploadStatus((prev) => ({
        ...prev,
        [type]: { state: 'error', fileName: file.name, message: errMsg },
      }));
      setNotification(`❌ Import Error: ${errMsg}`);
      setTimeout(() => setNotification(''), 12000);
    } finally {
      setUploadingType(null);
      if (inputElement) {
        inputElement.value = '';
      }
    }
  };

  const fetchLiveDashboard = async () => {
    try {
      const url = selectedDeptFilter ? `/admin/dashboard?departmentId=${selectedDeptFilter}` : '/admin/dashboard';
      const res = await api.get(url);
      if (res.data.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };


  const fetchTimetableData = async () => {
    try {
      const res = await api.get('/admin/timetable/manage');
      if (res.data.success) {
        setTimetableMeta(res.data.metadata);
        setMasterSlots(res.data.slots);
      }
    } catch (err) {
      console.error('Failed to load timetable management data:', err);
    }
  };

  const handleCopyTeacherCredentials = (u) => {
    const password = u.generatedPassword || '••••••••';
    const username = u.username || u.email.split('@')[0];
    const credText = `UOS Faculty Official Login\nName: ${u.fullName}\nUsername: ${username}\nEmail: ${u.email}\nPassword: ${password}\nEmployee ID: ${u.employeeOrRollId || 'N/A'}\nDepartment: ${u.department?.name || 'N/A'}`;
    navigator.clipboard.writeText(credText);
    setCopiedUserId(u.id);
    setNotification(`✅ Copied login credentials for ${u.fullName}!`);
    setTimeout(() => setCopiedUserId(null), 3000);
    setTimeout(() => setNotification(''), 6000);
  };

  const handleExportFacultyCredentials = () => {
    const faculty = usersList.filter((u) => u.role === 'TEACHER');
    if (faculty.length === 0) {
      alert('No faculty accounts found in the database.');
      return;
    }

    // Sort alphabetically by full name
    const sortedFaculty = [...faculty].sort((a, b) => a.fullName.localeCompare(b.fullName));
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const headers = [
      'Sr #',
      'Faculty Member Name',
      'Username',
      'Login Email',
      'Official Password',
      'Employee ID',
      'Department',
      'Scheduled Class Slots'
    ];

    const rows = sortedFaculty.map((f, index) => [
      index + 1,
      escapeCsv(f.fullName),
      escapeCsv(f.username || f.email.split('@')[0]),
      escapeCsv(f.email),
      escapeCsv(f.generatedPassword || '••••••••'),
      escapeCsv(f.employeeOrRollId || ''),
      escapeCsv(f.department?.name || 'Department of Physics'),
      f._count?.timetableSlots || 0,
    ]);

    // Prepend UTF-8 BOM (\uFEFF) so Excel natively detects UTF-8 columns
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'UOS_Faculty_Login_Credentials.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotification('✅ Downloaded UOS_Faculty_Login_Credentials.csv');
    setTimeout(() => setNotification(''), 6000);
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setAddingSlot(true);
    try {
      const res = await api.post('/admin/timetable/slot', newSlotForm);
      if (res.data.success) {
        setNotification('Class scheduled successfully!');
        setShowAddSlotModal(false);
        fetchTimetableData();
        fetchLiveDashboard();
        setTimeout(() => setNotification(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create slot.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to remove this scheduled class?')) return;
    try {
      const res = await api.delete(`/admin/timetable/slot/${slotId}`);
      if (res.data.success) {
        setNotification('Slot removed.');
        fetchTimetableData();
        fetchLiveDashboard();
        setTimeout(() => setNotification(''), 5000);
      }
    } catch (err) {
      alert('Failed to delete slot.');
    }
  };

  const fetchDelinquency = async () => {
    try {
      const res = await api.get('/admin/delinquency-report');
      if (res.data.success) {
        setDelinquencyData(res.data.report);
      }
    } catch (err) {
      console.error('Failed to load delinquency report:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data.success) {
        setAuditLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  useEffect(() => {
    fetchLiveDashboard();
    fetchDelinquency();
    fetchAuditLogs();
    fetchOverrideRequests();
    fetchUsersList();
    fetchDepartments();
    fetchRoomsList();
    fetchFacultyLedger();
    fetchFacultySummary();

    // Listen to real-time events via WebSocket
    if (socket) {
      const handleLiveAttendance = (data) => {
        setNotification(`Live Update: ${data.teacherName} submitted attendance for ${data.courseCode} (${data.studentStats.present} Present)`);
        fetchLiveDashboard();
        fetchDelinquency();
        fetchOverrideRequests();
        fetchFacultyLedger();
        fetchFacultySummary();
        setTimeout(() => setNotification(''), 6000);
      };

      const handleSlotUnlocked = () => {
        fetchLiveDashboard();
        fetchOverrideRequests();
      };

      socket.on('LIVE_ATTENDANCE_UPDATE', handleLiveAttendance);
      socket.on('SLOT_OVERRIDE_GRANTED', handleSlotUnlocked);

      return () => {
        socket.off('LIVE_ATTENDANCE_UPDATE', handleLiveAttendance);
        socket.off('SLOT_OVERRIDE_GRANTED', handleSlotUnlocked);
      };
    }
  }, [socket, selectedDeptFilter]);

  const handleGrantOverride = async (e) => {
    e.preventDefault();
    if (!overrideModalSlot || !overrideReason.trim()) return;

    setOverrideSubmitting(true);
    try {
      const res = await api.post('/admin/override', {
        slotId: overrideModalSlot.id,
        reason: overrideReason.trim(),
      });
      if (res.data.success) {
        setNotification(`Override Granted: ${overrideModalSlot.courseCode} has been unlocked for the instructor.`);
        setOverrideModalSlot(null);
        setOverrideReason('');
        fetchLiveDashboard();
        fetchOverrideRequests();
        setTimeout(() => setNotification(''), 6000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to grant override.');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const metrics = dashboardData?.metrics || {
    totalSlots: 0,
    activeOpenCount: 0,
    completedCount: 0,
    lockedCount: 0,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Profile Section */}
      <div className="glass-panel rounded-2xl p-6 mb-8 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {user?.role === 'ADMIN' ? 'Director of IT (System Admin)' : `HOD - ${user?.department || 'Department'}`}
            </span>
            <span className="text-xs text-slate-400">ID: {user?.employeeOrRollId}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Academic Attendance Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {user?.role === 'HOD' ? `Managing Department of ${user?.department || 'CS'} Roster & Timetable` : 'University-wide multi-department attendance monitoring & HOD control'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'ADMIN' && (
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Departments (10+)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>WebSocket Live</span>
          </div>
          <button
            onClick={() => {
              fetchLiveDashboard();
              fetchDelinquency();
              fetchAuditLogs();
              fetchOverrideRequests();
              fetchUsersList();
            }}
            title="Refresh All"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Academic Reports</span>
          </button>
        </div>
      </div>


      {/* Live Toast Notification */}
      {notification && (
        <div className="mb-6 p-4 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-between animate-fade-in">
          <span>{notification}</span>
          <button onClick={() => setNotification('')} className="text-blue-300 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total Classes Today</div>
          <div className="text-2xl font-bold text-white font-mono">{metrics.totalSlots}</div>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/10">
          <div className="text-xs text-emerald-300 mb-1">Active / Open Window</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{metrics.activeOpenCount}</div>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-blue-500/30 bg-blue-950/10">
          <div className="text-xs text-blue-300 mb-1">Attendance Submitted</div>
          <div className="text-2xl font-bold text-blue-400 font-mono">{metrics.completedCount}</div>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-rose-500/30 bg-rose-950/10">
          <div className="text-xs text-rose-300 mb-1">Late Lockouts / Expired</div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{metrics.lockedCount}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-3 mb-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('live')}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 ${
            activeTab === 'live'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Live Classes Stream ({dashboardData?.slots?.length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab('requests');
            fetchOverrideRequests();
          }}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 flex items-center gap-1.5 ${
            activeTab === 'requests'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Teacher Unlock Requests ({overrideRequests.filter((r) => r.status === 'PENDING').length})
        </button>
        <button
          onClick={() => {
            setActiveTab('users');
            fetchUsersList();
          }}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 ${
            activeTab === 'users'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          HOD &amp; Users Roster ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('delinquency')}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 ${
            activeTab === 'delinquency'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Daily Delinquency Report ({delinquencyData.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('manage');
            fetchTimetableData();
          }}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 ${
            activeTab === 'manage'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Timetable &amp; Scheduler ({masterSlots.length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab('perimeter');
            fetchRoomsList();
            fetchAuditLogs();
          }}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 flex items-center gap-1.5 ${
            activeTab === 'perimeter'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          Classroom Routers &amp; Geofence ({roomsList.length || '34+'})
        </button>
        <button
          onClick={() => {
            setActiveTab('ledger');
            fetchFacultyLedger();
            fetchFacultySummary();
          }}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          Faculty Attendance Records &amp; CSV ({facultyLedger.length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab('reset');
            fetchResetSummary();
          }}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 flex items-center gap-1.5 ${
            activeTab === 'reset'
              ? 'border-rose-500 text-rose-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          Semester Reset &amp; Fresh Start
        </button>
      </div>


      {/* Tab 1: Live Classes Grid */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardData?.slots?.map((slot) => {
            const evalInfo = slot.lockEvaluation;
            const isLocked = evalInfo.status === 'LOCKED_LATE' || evalInfo.status === 'LOCKED_EXPIRED';

            return (
              <div
                key={slot.id}
                className={`glass-panel rounded-2xl p-5 border transition flex flex-col justify-between ${
                  isLocked ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      {formatTimeRange(slot.startTime, slot.endTime)}
                    </div>
                    <StatusBadge status={evalInfo.status} />
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">
                    {slot.courseTitle}
                  </h3>
                  <p className="text-xs text-blue-400 font-mono mt-0.5">{slot.courseCode}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                    <div>
                      Instructor: <strong className="text-white">{slot.teacher.fullName}</strong>
                    </div>
                    <div>
                      Section: <strong className="text-white">{slot.sectionName}</strong> ({slot.studentCount} students)
                    </div>
                    <div>
                      Room: <strong className="text-white">{slot.roomNumber}</strong> ({slot.building})
                    </div>
                  </div>

                  {slot.session && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono space-y-1">
                      <div className="text-emerald-400 font-bold">
                        Attendance: {slot.session.presentCount} Present / {slot.session.absentCount} Absent
                      </div>
                      <div className="text-slate-400">
                        Teacher Status: {slot.session.teacherStatus} • IP: {slot.session.clientIp}
                      </div>
                      {slot.session.isOverridden && (
                        <div className="text-amber-400 text-[10px]">
                          Overridden by {slot.session.overrideBy}: "{slot.session.overrideReason}"
                        </div>
                      )}
                    </div>
                  )}

                  {isLocked && !slot.session?.isOverridden && (
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                      <span className="font-bold block">Class Locked</span>
                      <span className="text-[11px]">{evalInfo.lockReason}</span>
                    </div>
                  )}
                </div>

                {/* Admin Action: Unlock / Override */}
                {isLocked && (
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => setOverrideModalSlot(slot)}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Unlock Class (Admin Override)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: HOD Teacher Unlock Requests */}
      {activeTab === 'requests' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Teacher Attendance Unlock Requests</h2>
              <p className="text-xs text-slate-400">
                Submitted by instructors requesting HOD approval to unlock late or past attendance sessions
              </p>
            </div>
            <button
              onClick={fetchOverrideRequests}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3">Date Requested</th>
                  <th className="pb-3">Teacher</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Course &amp; Section</th>
                  <th className="pb-3">Reason / Justification</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">HOD Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {overrideRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      No override requests found for your department.
                    </td>
                  </tr>
                ) : (
                  overrideRequests.map((reqItem) => (
                    <tr key={reqItem.id}>
                      <td className="py-3 font-mono">{new Date(reqItem.requestedAt).toLocaleString()}</td>
                      <td className="py-3 font-semibold text-white">
                        {reqItem.teacher?.fullName}
                        <div className="text-[10px] text-slate-400 font-mono">{reqItem.teacher?.employeeOrRollId}</div>
                      </td>
                      <td className="py-3 font-bold text-purple-400">{reqItem.department?.code}</td>
                      <td className="py-3">
                        <span className="font-bold text-white">{reqItem.timetableSlot?.course?.code}</span>
                        <div className="text-[10px] text-slate-400">{reqItem.timetableSlot?.section?.name}</div>
                      </td>
                      <td className="py-3 text-slate-300 max-w-xs italic font-sans">
                        "{reqItem.reason}"
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            reqItem.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : reqItem.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {reqItem.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {reqItem.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleReviewRequest(reqItem.id, 'APPROVED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow"
                            >
                              Approve &amp; Unlock
                            </button>
                            <button
                              onClick={() => handleReviewRequest(reqItem.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-rose-300 text-[11px] transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">
                            Reviewed by {reqItem.hod?.fullName || 'HOD'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: HOD & Users Roster */}
      {activeTab === 'users' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">University Users &amp; HOD Management</h2>
              <p className="text-xs text-slate-400">
                View all registered HODs, Instructors, and Students across departments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewUserForm({
                    fullName: '',
                    email: '',
                    employeeOrRollId: '',
                    role: 'TEACHER',
                    departmentId: departments[0]?.id || '',
                    password: 'password123',
                  });
                  setShowAddUserModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Faculty / User
              </button>
              <button
                type="button"
                onClick={handleExportFacultyCredentials}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export Faculty Logins (CSV)
              </button>
              <button
                onClick={fetchUsersList}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[
              { key: 'ALL', label: `All Accounts (${usersList.length})` },
              { key: 'TEACHER', label: `Faculty / Teachers (${usersList.filter((u) => u.role === 'TEACHER').length})` },
              { key: 'HOD', label: `HODs (${usersList.filter((u) => u.role === 'HOD').length})` },
              { key: 'ADMIN', label: `Administrators (${usersList.filter((u) => u.role === 'ADMIN').length})` },
            ].map((rf) => (
              <button
                key={rf.key}
                type="button"
                onClick={() => setUserRoleFilter(rf.key)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  userRoleFilter === rf.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email / Username</th>
                  <th className="pb-3">Employee ID</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Classes Scheduled</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Login Password</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {usersList.filter((u) => userRoleFilter === 'ALL' || u.role === userRoleFilter).length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500">
                      No accounts found in this category.
                    </td>
                  </tr>
                ) : (
                  usersList
                    .filter((u) => userRoleFilter === 'ALL' || u.role === userRoleFilter)
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/30 transition">
                        <td className="py-3 font-semibold text-white">{u.fullName}</td>
                        <td className="py-3 text-slate-300 font-mono select-all">{u.email}</td>
                        <td className="py-3 font-mono text-slate-400">{u.employeeOrRollId || '—'}</td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : u.role === 'HOD'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : u.role === 'TEACHER'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3">
                          {u.role === 'TEACHER' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
                              {u._count?.timetableSlots || 0} Lectures
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 text-slate-300 font-medium">
                          {u.department ? `${u.department.code}` : 'All Depts'}
                        </td>
                        <td className="py-3 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-emerald-300 font-bold select-all">
                            {u.generatedPassword || '••••••••'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.role === 'TEACHER' && (
                              <button
                                type="button"
                                onClick={() => handleCopyTeacherCredentials(u)}
                                title="Copy login username & password"
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                                  copiedUserId === u.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700'
                                }`}
                              >
                                {copiedUserId === u.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedUserId === u.id ? 'Copied!' : 'Copy'}
                              </button>
                            )}
                            {user?.role === 'ADMIN' && (
                              <button
                                onClick={() => setResetPasswordModalUser(u)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-[11px] transition border border-slate-700 font-medium"
                              >
                                Reset
                              </button>
                            )}
                            {user?.role === 'ADMIN' && u.id !== user.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.fullName)}
                                title="Delete User"
                                className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition border border-slate-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetPasswordModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-slate-800 animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-1">Reset Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Resetting password for: <span className="text-white font-semibold">{resetPasswordModalUser.fullName}</span> ({resetPasswordModalUser.role})
            </p>

            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  New Temporary Password *
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="e.g. hod123 or newpass2026"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordResetting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {passwordResetting ? 'Saving...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Tab 2: Delinquency Report */}
      {activeTab === 'delinquency' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 overflow-x-auto">
          <h2 className="text-base font-bold text-white mb-2">Faculty Late Entry &amp; Delinquency Log</h2>
          <p className="text-xs text-slate-400 mb-4">
            Audited records of teachers who exceeded the 15-minute start window or required administrative override.
          </p>

          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3">Date</th>
                <th className="pb-3">Faculty Member</th>
                <th className="pb-3">Course &amp; Slot</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Campus IP Logged</th>
                <th className="pb-3">Admin Override Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {delinquencyData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No delinquency records detected today.
                  </td>
                </tr>
              ) : (
                delinquencyData.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 font-mono">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="py-3 font-semibold text-white">
                      {d.teacherName}
                      <span className="block text-[10px] text-slate-400 font-normal">{d.employeeId}</span>
                    </td>
                    <td className="py-3">
                      {d.course}
                      <span className="block text-[10px] text-slate-400 font-mono">{d.scheduledTime}</span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                        {d.teacherStatus}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">{d.clientIp}</td>
                    <td className="py-3">
                      {d.isOverridden ? (
                        <span className="text-amber-300">
                          <strong>By {d.overrideBy}:</strong> {d.overrideReason}
                        </span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Perimeter Security Logs */}
      {activeTab === 'perimeter' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-bold text-white">Perimeter Firewall Violation Audit Log</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Outside connection requests that attempted to access university academic endpoints without campus Wi-Fi connectivity.
          </p>

          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Origin IP Address</th>
                <th className="pb-3">Endpoint</th>
                <th className="pb-3">Device / User Agent</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 font-sans">
                    No perimeter breaches logged yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 text-rose-400 font-bold">{log.ipAddress}</td>
                    <td className="py-3 text-slate-300">{log.endpoint}</td>
                    <td className="py-3 text-[11px] text-slate-400 truncate max-w-xs">{log.userAgent}</td>
                    <td className="py-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                        BLOCKED 403
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Master Timetable Management */}
      {activeTab === 'manage' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Master Timetable &amp; Faculty Class Scheduler
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure real university courses, assign instructors, define rooms, and establish weekly time slots.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewDeptForm({ name: '', code: '' });
                  setShowAddDeptModal(true);
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                Add Department
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewCourseForm({ code: '', title: '', creditHours: 3, departmentId: departments[0]?.id || '' });
                  setShowAddCourseModal(true);
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Add Course
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewSectionForm({ name: '', semester: 1, academicYear: '2025-2026', departmentId: departments[0]?.id || '' });
                  setShowAddSectionModal(true);
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Add Section
              </button>
              <button
                onClick={() => {
                  if (timetableMeta.teachers.length === 0) fetchTimetableData();
                  setNewSlotForm({
                    teacherId: timetableMeta.teachers[0]?.id || '',
                    courseId: timetableMeta.courses[0]?.id || '',
                    sectionId: timetableMeta.sections[0]?.id || '',
                    roomId: timetableMeta.rooms[0]?.id || '',
                    dayOfWeek: 'MONDAY',
                    startTime: '09:00',
                    endTime: '10:30',
                  });
                  setShowAddSlotModal(true);
                }}
                className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule Slot
              </button>
            </div>
          </div>

          {/* University Bulk CSV / Excel Ingestion Cards */}
          <div className="mb-8 p-5 rounded-2xl bg-slate-900/60 border border-indigo-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Bulk Data Ingestion (University Scale: 1 Lakh+ Students)</h3>
              </div>
              <span className="text-[11px] text-slate-400">High-speed batch processor (~15s per 100k rows)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Teachers Import */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-white mb-1">1. Teachers List (300+ Faculty)</div>
                  <p className="text-[11px] text-slate-400 mb-3">Upload CSV with Name, Email, Employee ID, Department.</p>
                </div>
                <div>
                  <a
                    href="/api/admin/import/template/teachers"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium mb-3"
                  >
                    <Download className="w-3 h-3" />
                    Download Sample CSV
                  </a>
                  {uploadStatus['teachers']?.state === 'uploading' ? (
                    <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/50 flex items-center gap-2 text-xs text-indigo-300">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold">{uploadStatus['teachers']?.fileName}</div>
                        <div className="text-[10px] text-indigo-400">Importing faculty members...</div>
                      </div>
                    </div>
                  ) : uploadStatus['teachers']?.state === 'success' ? (
                    <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{uploadStatus['teachers']?.fileName}</span>
                      </div>
                      <p className="text-[10px] text-emerald-400 leading-tight mb-2">{uploadStatus['teachers']?.message}</p>
                      <button
                        type="button"
                        onClick={() => setUploadStatus((prev) => ({ ...prev, teachers: null }))}
                        className="text-[10px] text-emerald-300 hover:text-white underline font-semibold"
                      >
                        Upload another file
                      </button>
                    </div>
                  ) : uploadStatus['teachers']?.state === 'error' ? (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{uploadStatus['teachers']?.fileName}</span>
                      </div>
                      <p className="text-[10px] text-rose-400 leading-tight mb-2">{uploadStatus['teachers']?.message}</p>
                      <button
                        type="button"
                        onClick={() => setUploadStatus((prev) => ({ ...prev, teachers: null }))}
                        className="text-[10px] text-rose-300 hover:text-white underline font-semibold"
                      >
                        Dismiss & try again
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-2 px-3 rounded-lg border border-dashed flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition bg-slate-900 border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white">
                      <UploadCloud className="w-4 h-4 text-indigo-400" />
                      Upload Teachers CSV
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleBulkUpload('teachers', e.target.files[0], e.target);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 2. Students Import */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-white mb-1">2. Students Roster (1 Lakh Students)</div>
                  <p className="text-[11px] text-slate-400 mb-3">Upload CSV with Roll No, Name, Email, Section, Dept.</p>
                </div>
                <div>
                  <a
                    href="/api/admin/import/template/students"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium mb-3"
                  >
                    <Download className="w-3 h-3" />
                    Download Sample CSV
                  </a>
                  {uploadStatus['students']?.state === 'uploading' ? (
                    <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/50 flex items-center gap-2 text-xs text-indigo-300">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold">{uploadStatus['students']?.fileName}</div>
                        <div className="text-[10px] text-indigo-400">Importing students roster...</div>
                      </div>
                    </div>
                  ) : uploadStatus['students']?.state === 'success' ? (
                    <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{uploadStatus['students']?.fileName}</span>
                      </div>
                      <p className="text-[10px] text-emerald-400 leading-tight mb-2">{uploadStatus['students']?.message}</p>
                      <button
                        type="button"
                        onClick={() => setUploadStatus((prev) => ({ ...prev, students: null }))}
                        className="text-[10px] text-emerald-300 hover:text-white underline font-semibold"
                      >
                        Upload another file
                      </button>
                    </div>
                  ) : uploadStatus['students']?.state === 'error' ? (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{uploadStatus['students']?.fileName}</span>
                      </div>
                      <p className="text-[10px] text-rose-400 leading-tight mb-2">{uploadStatus['students']?.message}</p>
                      <button
                        type="button"
                        onClick={() => setUploadStatus((prev) => ({ ...prev, students: null }))}
                        className="text-[10px] text-rose-300 hover:text-white underline font-semibold"
                      >
                        Dismiss & try again
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-2 px-3 rounded-lg border border-dashed flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition bg-slate-900 border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white">
                      <UploadCloud className="w-4 h-4 text-indigo-400" />
                      Upload Students CSV
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleBulkUpload('students', e.target.files[0], e.target);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 3. Timetable Import */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-white mb-1">3. Master Timetable Schedule</div>
                  <p className="text-[11px] text-slate-400 mb-3">Upload CSV, PDF, or Word (.doc/.docx) with Day, Times, Course, Section, Teacher, Room.</p>
                </div>
                <div>
                  <a
                    href="/api/admin/import/template/timetable"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium mb-3"
                  >
                    <Download className="w-3 h-3" />
                    Download Sample CSV
                  </a>
                  {uploadStatus['timetable']?.state === 'uploading' ? (
                    <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/50 flex items-center gap-2 text-xs text-indigo-300">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold">{uploadStatus['timetable']?.fileName}</div>
                        <div className="text-[10px] text-indigo-400">Parsing schedule & mapping slots...</div>
                      </div>
                    </div>
                  ) : uploadStatus['timetable']?.state === 'success' ? (
                    <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{uploadStatus['timetable']?.fileName}</span>
                      </div>
                      <p className="text-[10px] text-emerald-400 leading-tight mb-2">{uploadStatus['timetable']?.message}</p>
                      <button
                        type="button"
                        onClick={() => setUploadStatus((prev) => ({ ...prev, timetable: null }))}
                        className="text-[10px] text-emerald-300 hover:text-white underline font-semibold"
                      >
                        Upload another timetable
                      </button>
                    </div>
                  ) : uploadStatus['timetable']?.state === 'error' ? (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{uploadStatus['timetable']?.fileName}</span>
                      </div>
                      <p className="text-[10px] text-rose-400 leading-tight mb-2">{uploadStatus['timetable']?.message}</p>
                      <button
                        type="button"
                        onClick={() => setUploadStatus((prev) => ({ ...prev, timetable: null }))}
                        className="text-[10px] text-rose-300 hover:text-white underline font-semibold"
                      >
                        Dismiss & try again
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-2 px-3 rounded-lg border border-dashed flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition bg-slate-900 border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white">
                      <UploadCloud className="w-4 h-4 text-indigo-400" />
                      Upload CSV / PDF / Word (.docx)
                      <input
                        type="file"
                        accept=".csv,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleBulkUpload('timetable', e.target.files[0], e.target);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timetable Organization Toolbar: Day Selector & Search */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: `All Days (${masterSlots.length})` },
                { key: 'MONDAY', label: `Mon (${masterSlots.filter((s) => s.dayOfWeek === 'MONDAY').length})` },
                { key: 'TUESDAY', label: `Tue (${masterSlots.filter((s) => s.dayOfWeek === 'TUESDAY').length})` },
                { key: 'WEDNESDAY', label: `Wed (${masterSlots.filter((s) => s.dayOfWeek === 'WEDNESDAY').length})` },
                { key: 'THURSDAY', label: `Thu (${masterSlots.filter((s) => s.dayOfWeek === 'THURSDAY').length})` },
                { key: 'FRIDAY', label: `Fri (${masterSlots.filter((s) => s.dayOfWeek === 'FRIDAY').length})` },
                { key: 'SATURDAY', label: `Sat (${masterSlots.filter((s) => s.dayOfWeek === 'SATURDAY').length})` },
              ].map((df) => (
                <button
                  key={df.key}
                  type="button"
                  onClick={() => setTimetableDayFilter(df.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    timetableDayFilter === df.key
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={timetableSearchQuery}
                onChange={(e) => setTimetableSearchQuery(e.target.value)}
                placeholder="Search teacher, room, course, section..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {timetableSearchQuery && (
                <button
                  onClick={() => setTimetableSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-2">Day</th>
                  <th className="py-3">Time Slot</th>
                  <th className="py-3">Classroom / Room</th>
                  <th className="py-3">Course</th>
                  <th className="py-3">Assigned Faculty</th>
                  <th className="py-3">Student Section</th>
                  <th className="py-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {(() => {
                  const DAY_MAP_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
                  const q = timetableSearchQuery.toLowerCase().trim();

                  const filtered = masterSlots
                    .filter((s) => {
                      if (timetableDayFilter !== 'ALL' && s.dayOfWeek !== timetableDayFilter) return false;
                      if (!q) return true;
                      const cCode = (s.course?.code || '').toLowerCase();
                      const cTitle = (s.course?.title || '').toLowerCase();
                      const tName = (s.teacher?.fullName || '').toLowerCase();
                      const sName = (s.section?.name || '').toLowerCase();
                      const rNum = (s.room?.roomNumber || '').toLowerCase();
                      return cCode.includes(q) || cTitle.includes(q) || tName.includes(q) || sName.includes(q) || rNum.includes(q);
                    })
                    .sort((a, b) => {
                      const dayDiff = DAY_MAP_ORDER.indexOf(a.dayOfWeek) - DAY_MAP_ORDER.indexOf(b.dayOfWeek);
                      if (dayDiff !== 0) return dayDiff;
                      return (a.startTime || '').localeCompare(b.startTime || '');
                    });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-500">
                          {masterSlots.length === 0
                            ? 'No timetable slots configured yet. Click "+ Schedule New Class Slot" or upload a file.'
                            : 'No classes matched the selected day or search filter.'}
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 px-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {s.dayOfWeek}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-300 font-semibold">
                        {formatTimeRange(s.startTime, s.endTime)}
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold font-mono inline-flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{s.room.roomNumber}</span>
                          <span className="text-[10px] font-normal text-slate-400">({s.room.building})</span>
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-white">
                        <div>{s.course.code}</div>
                        <div className="text-[11px] font-normal text-slate-400">{s.course.title}</div>
                      </td>
                      <td className="py-3">
                        <div className="text-blue-300 font-medium">{s.teacher.fullName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{s.teacher.email}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-medium">
                          {s.section.name}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(s.id)}
                          title="Delete slot"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Classroom Routers & Geofence Management */}
      {activeTab === 'perimeter' && (
        <div className="space-y-8 animate-fade-in">
          {/* Pilot Deployment Status Banner (Physics Department Test Zone) */}
          <div className="glass-panel-glow rounded-3xl p-6 border border-indigo-500/40 bg-indigo-950/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                  <Wifi className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Pilot Deployment: Physics Department &amp; Block 1</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Active Pilot Test Zone
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Micro-geofence testing for 3 classrooms across 2 core access points (Routers 52 &amp; 56).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewRoomForm({
                      roomNumber: '',
                      building: 'Academic Block (Physics)',
                      floor: 1,
                      routerName: '',
                      routerIp: '',
                      routerMac: '',
                      routerSsid: '',
                      assignedSubnet: '',
                    });
                    setShowAddRoomModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Classroom
                </button>
                <button
                  type="button"
                  onClick={fetchRoomsList}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Router Map
                </button>
              </div>
            </div>

            {/* Quick Pilot Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-indigo-500/30 font-mono text-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-indigo-400 font-bold">Physics AP 1 (b5c0 / 87f0)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">Rooms 4.1.20 &amp; 4.1.21</span>
                </div>
                <div className="text-slate-300 space-y-1 text-[11px]">
                  <div>Client Wi-Fi Pool: <span className="text-emerald-400 font-bold">172.200.62.0/24</span> (Auto-Linked)</div>
                  <div>AP Management Gateway: <span className="text-white font-bold">172.200.47.193</span></div>
                  <div>MAC / BSSID: <span className="text-cyan-400">18:E8:29:08:6D:65</span></div>
                  <div>Mapped Rooms: <strong className="text-white">4.1.20, 4.1.21</strong></div>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-4 border border-indigo-500/30 font-mono text-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-indigo-400 font-bold">Physics AP 2 (0880)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">Room 4.1.4</span>
                </div>
                <div className="text-slate-300 space-y-1 text-[11px]">
                  <div>Client Wi-Fi Pool: <span className="text-emerald-400 font-bold">172.200.62.0/24</span> (Auto-Linked)</div>
                  <div>AP Management Gateway: <span className="text-white font-bold">172.200.37.26</span></div>
                  <div>MAC / BSSID: <span className="text-cyan-400">18:E8:29:08:6D:5F</span></div>
                  <div>Mapped Rooms: <strong className="text-white">4.1.4</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Classroom Routers Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Classroom Router Geofence Mapping</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Link each university classroom to its specific corridor Wi-Fi router IP / MAC.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search room (e.g. 4.1.20)..."
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">Room / Classroom</th>
                    <th className="pb-3">Assigned Router Label</th>
                    <th className="pb-3">Subnet / Gateway IP</th>
                    <th className="pb-3">Physical MAC / BSSID</th>
                    <th className="pb-3">Wi-Fi SSID</th>
                    <th className="pb-3 text-right pr-2">Geofence Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {roomsList
                    .filter((r) => {
                      if (!roomSearchQuery.trim()) return true;
                      const q = roomSearchQuery.toLowerCase();
                      return (
                        r.roomNumber.toLowerCase().includes(q) ||
                        r.building.toLowerCase().includes(q) ||
                        (r.routerName && r.routerName.toLowerCase().includes(q)) ||
                        (r.routerIp && r.routerIp.includes(q))
                      );
                    })
                    .map((room) => {
                      const isPilot = ['4.1.20', '4.1.21', '4.1.4'].includes(room.roomNumber);

                      return (
                        <tr key={room.id} className={`hover:bg-slate-900/40 transition ${isPilot ? 'bg-indigo-950/20' : ''}`}>
                          <td className="py-3 pl-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{room.roomNumber}</span>
                              {isPilot && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  Pilot Room
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">{room.building} (Floor {room.floor})</div>
                          </td>
                          <td className="py-3 font-sans">
                            {room.routerName ? (
                              <span className="text-white font-medium">{room.routerName}</span>
                            ) : (
                              <span className="text-slate-500 italic">Unassigned (Campus Fallback)</span>
                            )}
                          </td>
                          <td className="py-3">
                            {room.assignedSubnet || room.routerIp ? (
                              <span className="text-emerald-400 font-bold">{room.assignedSubnet || room.routerIp}</span>
                            ) : (
                              <span className="text-slate-500">Any Campus Wi-Fi</span>
                            )}
                          </td>
                          <td className="py-3">
                            {room.routerMac ? (
                              <span className="text-sky-300 font-bold">{room.routerMac}</span>
                            ) : (
                              <span className="text-slate-600">Pending</span>
                            )}
                          </td>
                          <td className="py-3 font-sans">
                            {room.routerSsid ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px]">{room.routerSsid}</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 text-right pr-2 font-sans">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleAutoLinkRoom(room.id, room.roomNumber)}
                                disabled={autoLinkingId === room.id}
                                title="1-Click Auto-detect & Link Current Connected Wi-Fi"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                              >
                                <Radio className="w-3 h-3 animate-pulse" />
                                <span>{autoLinkingId === room.id ? 'Linking...' : 'Auto-Link'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditRoom(room)}
                                title="Edit Router IP & MAC"
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Configure</span>
                              </button>
                              {user?.role === 'ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                                  title="Delete Classroom"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6">
            <h3 className="text-base font-bold text-white mb-1">Campus Perimeter &amp; Audit Logs</h3>
            <p className="text-xs text-slate-400 mb-4">Historical attendance access attempts and router IP logs.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Teacher / User</th>
                    <th className="pb-2">Client IP</th>
                    <th className="pb-2">Action / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.slice(0, 10).map((log, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-2.5 text-slate-400">{new Date(log.timestamp || log.createdAt).toLocaleTimeString()}</td>
                      <td className="py-2.5 text-white font-sans">{log.userName || log.user?.fullName || 'Teacher'}</td>
                      <td className="py-2.5 text-emerald-400 font-bold">{log.clientIp}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {log.action || log.sessionStatus || 'ALLOWED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-500 font-sans">
                        No perimeter security logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Semester Reset & Fresh Start (Clean Slate Utility) */}
      {activeTab === 'reset' && (
        <div className="space-y-8 animate-fade-in">
          {/* Main Hero Card */}
          <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-rose-500/40 bg-gradient-to-br from-rose-950/20 via-slate-900/90 to-slate-950">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/20 text-rose-400">
                  <RotateCcw className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">Semester Reset &amp; Fresh Start</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                      Post-Pilot &amp; Semester Purge
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Use this tool after completing pilot testing in the Physics department or at the conclusion of an academic semester. It safely wipes all marked attendance logs, student attendance records, and unlock requests so the university starts completely fresh.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchResetSummary}
                  disabled={loadingResetSummary}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingResetSummary ? 'animate-spin' : ''}`} />
                  Refresh Counts
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Backup Report (CSV)
                </button>
              </div>
            </div>

            {/* Preserved vs Purged Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl p-5 bg-rose-950/30 border border-rose-500/30 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                  <Trash2 className="w-4 h-4" />
                  What Will Be Purged (Fresh Start):
                </div>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold">✕</span>
                    All submitted Student Attendance logs (Present/Absent/Late records)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold">✕</span>
                    All Teacher Marked Sessions &amp; biometric audit stamps
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold">✕</span>
                    All Teacher Unlock / Override requests
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold">✕</span>
                    Daily Delinquency and live tracking logs
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl p-5 bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  What Stays 100% Intact &amp; Untouched:
                </div>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <strong>All Faculty &amp; Teacher Accounts</strong> ({resetSummary?.preserved?.totalTeachers ?? 'All'} Teachers with passwords)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <strong>All Student Accounts &amp; Roster Enrollments</strong> ({resetSummary?.preserved?.totalStudents ?? 'All'} Students)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <strong>All Courses &amp; Degree Sections</strong> ({resetSummary?.preserved?.totalCourses ?? 'All'} Courses, {resetSummary?.preserved?.totalSections ?? 'All'} Sections)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <strong>Timetable Schedule &amp; Classroom Routers</strong> ({resetSummary?.preserved?.totalSlots ?? 'All'} Slots, {resetSummary?.preserved?.totalRooms ?? 'All'} Rooms)
                  </li>
                </ul>
              </div>
            </div>

            {/* Current Recorded Attendance Stats Card */}
            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 text-xs">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Current Recorded Attendance Data To Be Purged
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Marked Sessions</span>
                  <strong className="text-xl font-bold text-white">
                    {resetSummary?.totalSessions ?? 0}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Student Attendance Logs</span>
                  <strong className="text-xl font-bold text-rose-400">
                    {resetSummary?.totalStudentLogs ?? 0}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Earliest Session</span>
                  <span className="text-xs font-bold text-slate-300 block truncate">
                    {resetSummary?.earliestDate ? new Date(resetSummary.earliestDate).toLocaleDateString() : 'None'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Latest Session</span>
                  <span className="text-xs font-bold text-slate-300 block truncate">
                    {resetSummary?.latestDate ? new Date(resetSummary.latestDate).toLocaleDateString() : 'None'}
                  </span>
                </div>
              </div>

              {resetSuccessMessage && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-fade-in flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccessMessage}</span>
                </div>
              )}

              {/* Action Trigger Button */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-slate-400 text-[11px]">
                  Ready to start a new academic semester or clear test data? Type RESET to confirm.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setResetConfirmInput('');
                    setShowResetConfirmModal(true);
                  }}
                  disabled={resetSummary?.totalSessions === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {resetSummary?.totalSessions === 0 ? 'No Data To Reset (System Clean)' : 'Reset Attendance for Fresh Start'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Faculty Attendance Records & 1-Click CSV Ledger */}
      {activeTab === 'ledger' && (() => {
        const filteredRecords = facultyLedger.filter((rec) => {
          if (selectedLedgerTeacher !== 'ALL' && rec.teacher.id !== selectedLedgerTeacher) {
            return false;
          }
          if (!ledgerSearch.trim()) return true;
          const q = ledgerSearch.trim().toLowerCase();
          return (
            rec.teacher.name.toLowerCase().includes(q) ||
            rec.teacher.employeeId.toLowerCase().includes(q) ||
            rec.course.code.toLowerCase().includes(q) ||
            rec.course.title.toLowerCase().includes(q) ||
            rec.section.name.toLowerCase().includes(q) ||
            rec.room.roomNumber.toLowerCase().includes(q) ||
            (rec.clientIp && rec.clientIp.toLowerCase().includes(q))
          );
        });

        const totalMarkedSessions = facultyLedger.length;
        const totalLogs = facultyLedger.reduce((acc, r) => acc + (r.stats?.totalStudents || 0), 0);
        const totalPresent = facultyLedger.reduce((acc, r) => acc + (r.stats?.presentCount || 0) + (r.stats?.lateCount || 0), 0);
        const overallRate = totalLogs > 0 ? Math.round((totalPresent / totalLogs) * 100) : 0;

        return (
          <div className="space-y-8 animate-fade-in text-slate-200">
            {/* Header / Overview Card */}
            <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-slate-900/80">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Official University Ledger
                    </span>
                    <span className="text-xs text-slate-400">Department of Physics &amp; University Wide</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Faculty Attendance Submission Ledger &amp; Semester CSV
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                    Live verification showing which teacher submitted attendance, lecture timestamp, subject, classroom, student breakdown (Present / Absent / Late), and 1-Click Excel CSV download for every faculty member.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      fetchFacultyLedger();
                      fetchFacultySummary();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLedger ? 'animate-spin' : ''}`} />
                    <span>Refresh Records</span>
                  </button>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Academic Reports</span>
                  </button>
                </div>
              </div>

              {/* Quick Overall Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-800/80 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Faculty Members</span>
                  <strong className="text-xl font-bold text-white font-sans">{facultySummary.length} Teachers</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Submitted Classes</span>
                  <strong className="text-xl font-bold text-emerald-400 font-sans">{totalMarkedSessions} Lectures</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Student Attendance Logs</span>
                  <strong className="text-xl font-bold text-blue-400 font-sans">{totalLogs} Records</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Cumulative Attendance</span>
                  <strong className="text-xl font-bold text-purple-400 font-sans">{overallRate}% Rate</strong>
                </div>
              </div>
            </div>

            {/* Section 1: Per-Teacher 1-Click Semester CSV Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    Faculty Members &amp; 1-Click Semester CSV Export
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click the download button next to any teacher to export their entire semester attendance records into an Excel-ready CSV.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {facultySummary.map((t) => {
                  const isDownloading = downloadingTeacherId === t.id;
                  const hasClasses = t.totalSessions > 0;
                  return (
                    <div
                      key={t.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Name & Badges */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600/30 to-blue-600/30 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-sm">
                              {t.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm leading-tight">{t.name}</h4>
                              <span className="text-[11px] text-slate-400 font-mono">{t.employeeId || 'ID Pending'}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {t.department || 'Physics'}
                          </span>
                        </div>

                        {/* Middle: Metrics */}
                        <div className="grid grid-cols-2 gap-2 my-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Lectures Marked</span>
                            <strong className="text-white font-mono text-sm">{t.totalSessions}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Avg Attendance</span>
                            <strong className={`font-mono text-sm ${t.averageRate >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {t.averageRate}%
                            </strong>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Last Marked:</span>
                            <span className="text-slate-300 font-mono truncate ml-1">
                              {t.lastMarkedAt ? new Date(t.lastMarkedAt).toLocaleString() : 'No Classes Yet'}
                            </span>
                          </div>
                        </div>

                        {/* Courses list */}
                        {t.courses && t.courses.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {t.courses.map((c, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-950/50 text-blue-300 border border-blue-500/20"
                                title={`${c.title} (${c.section})`}
                              >
                                {c.code} ({c.section})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 1-Click CSV Button */}
                      <button
                        type="button"
                        onClick={() => handleDownloadTeacherSemesterCsv(t.id, t.name)}
                        disabled={!hasClasses || isDownloading}
                        className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Exporting Semester CSV...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>{hasClasses ? 'Download Semester CSV (Excel)' : 'No Records Yet'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Master Attendance Submission Audit Ledger */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Master Attendance Submission Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chronological verification of each teacher's attendance submission with room, Wi-Fi IP, and biometric authentication status.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder="Search teacher, course, room..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <select
                    value={selectedLedgerTeacher}
                    onChange={(e) => setSelectedLedgerTeacher(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Faculty Members</option>
                    {facultySummary.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.employeeId || 'ID Pending'})
                      </option>
                    ))}
                  </select>

                  {(ledgerSearch || selectedLedgerTeacher !== 'ALL') && (
                    <button
                      onClick={() => {
                        setLedgerSearch('');
                        setSelectedLedgerTeacher('ALL');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    >
                      Clear
                    </button>
                  )}

                  <span className="text-xs text-slate-400 font-mono">
                    Showing {filteredRecords.length} of {facultyLedger.length}
                  </span>
                </div>
              </div>

              {/* Audit Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-900/60 font-semibold">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Faculty Instructor</th>
                      <th className="py-3 px-3">Lecture Date &amp; Time</th>
                      <th className="py-3 px-3">Course &amp; Section</th>
                      <th className="py-3 px-3">Classroom</th>
                      <th className="py-3 px-3">Student Tally</th>
                      <th className="py-3 px-3">Attendance %</th>
                      <th className="py-3 px-3">Wi-Fi IP / Biometrics</th>
                      <th className="py-3 px-3 text-right">Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                          <p className="font-semibold text-slate-300">No Attendance Records Found</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {ledgerSearch || selectedLedgerTeacher !== 'ALL'
                              ? 'Try adjusting your search query or faculty filter.'
                              : 'No classes have submitted attendance records yet this semester.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r, idx) => {
                        const s = r.stats;
                        const isBio = r.biometricVerified;
                        return (
                          <tr key={r.id || idx} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 px-3 font-mono text-slate-500">{idx + 1}</td>

                            {/* Faculty Instructor */}
                            <td className="py-3 px-3">
                              <strong className="text-white font-semibold block">{r.teacher.name}</strong>
                              <span className="text-[11px] text-slate-400 font-mono">{r.teacher.employeeId}</span>
                            </td>

                            {/* Date & Time */}
                            <td className="py-3 px-3">
                              <span className="text-slate-200 block font-medium">
                                {new Date(r.date).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(r.markedAt).toLocaleTimeString()}</span>
                              </div>
                            </td>

                            {/* Course & Section */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-500/20 inline-block mb-0.5">
                                {r.course.code}
                              </span>
                              <span className="text-slate-300 block truncate max-w-[180px]" title={r.course.title}>
                                {r.course.title}
                              </span>
                              <span className="text-[10px] text-slate-400">Section: <strong>{r.section.name}</strong></span>
                            </td>

                            {/* Room */}
                            <td className="py-3 px-3">
                              <span className="font-bold text-white block">Room {r.room.roomNumber}</span>
                              <span className="text-[10px] text-slate-400">{r.room.building}</span>
                            </td>

                            {/* Student Tally */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold" title="Present">
                                  P: {s.presentCount}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-semibold" title="Absent">
                                  A: {s.absentCount}
                                </span>
                                {s.lateCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-semibold" title="Late">
                                    L: {s.lateCount}
                                  </span>
                                )}
                                <span className="text-slate-400 text-[11px] font-mono">
                                  / {s.totalStudents}
                                </span>
                              </div>
                            </td>

                            {/* Attendance % */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <strong className={`font-mono text-xs ${s.attendanceRate >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {s.attendanceRate}%
                                </strong>
                                <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${s.attendanceRate >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min(100, s.attendanceRate)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Wi-Fi & Biometrics */}
                            <td className="py-3 px-3">
                              <div className="space-y-0.5 font-mono text-[10px]">
                                <span className="text-slate-300 block truncate" title={`Client IP: ${r.clientIp}`}>
                                  IP: {r.clientIp || '172.200.47.193'}
                                </span>
                                <div className="flex items-center gap-1">
                                  {isBio ? (
                                    <span className="text-emerald-400 flex items-center gap-0.5">
                                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                      {r.biometricType || 'Thumbprint Verified'}
                                    </span>
                                  ) : (
                                    <span className="text-blue-300 flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                      Verified Session
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDownloadTeacherSemesterCsv(r.teacher.id, r.teacher.name)}
                                disabled={downloadingTeacherId === r.teacher.id}
                                title={`Download entire semester attendance for ${r.teacher.name}`}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 transition"
                              >
                                {downloadingTeacherId === r.teacher.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Purge Attendance Data Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 max-w-md w-full border border-rose-500/40 shadow-2xl text-left animate-scale-up">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Semester Data Reset</h3>
                <span className="text-[11px] text-rose-300">Irreversible Action</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              This will permanently delete all <strong className="text-white">{resetSummary?.totalSessions || 0} attendance sessions</strong> and <strong className="text-white">{resetSummary?.totalStudentLogs || 0} student attendance logs</strong>.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs mb-4">
              <strong>Tip:</strong> Download the Full Semester CSV Backup first if you need to keep archives for university records.
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Type <span className="font-mono text-rose-400 font-bold">RESET</span> to proceed:
              </label>
              <input
                type="text"
                autoFocus
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="RESET"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-center text-sm focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={purgingData}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeAttendanceData}
                disabled={resetConfirmInput.trim().toUpperCase() !== 'RESET' || purgingData}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {purgingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Purging Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm &amp; Reset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Timetable Slot Modal */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-lg w-full border border-blue-500/30 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-blue-400">
              <Plus className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Schedule New University Class</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Map faculty member, course, student section, room, and weekly timetable slot.
            </p>

            <form onSubmit={handleCreateSlot} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Faculty Member / Teacher *</label>
                <select
                  required
                  value={newSlotForm.teacherId}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, teacherId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Instructor --</option>
                  {timetableMeta.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeOrRollId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Course *</label>
                  <select
                    required
                    value={newSlotForm.courseId}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, courseId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Course --</option>
                    {timetableMeta.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Student Section *</label>
                  <select
                    required
                    value={newSlotForm.sectionId}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, sectionId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Section --</option>
                    {timetableMeta.sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} (Semester {sec.semester})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Room / Lab *</label>
                  <select
                    required
                    value={newSlotForm.roomId}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, roomId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Room --</option>
                    {timetableMeta.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} ({r.building})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Day of Week *</label>
                  <select
                    required
                    value={newSlotForm.dayOfWeek}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, dayOfWeek: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="MONDAY">MONDAY</option>
                    <option value="TUESDAY">TUESDAY</option>
                    <option value="WEDNESDAY">WEDNESDAY</option>
                    <option value="THURSDAY">THURSDAY</option>
                    <option value="FRIDAY">FRIDAY</option>
                    <option value="SATURDAY">SATURDAY</option>
                    <option value="SUNDAY">SUNDAY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time (24h e.g. 08:30) *</label>
                  <input
                    type="text"
                    required
                    placeholder="08:30"
                    pattern="[0-9]{2}:[0-9]{2}"
                    value={newSlotForm.startTime}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, startTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Time (24h e.g. 10:00) *</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00"
                    pattern="[0-9]{2}:[0-9]{2}"
                    value={newSlotForm.endTime}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, endTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSlot}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {addingSlot ? 'Saving...' : 'Save & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock Override Modal */}
      {overrideModalSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-amber-500/30 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-amber-400">
              <Unlock className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Unlock Class for Instructor</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              You are overriding the late-entry lock for <strong>{overrideModalSlot.courseTitle} ({overrideModalSlot.sectionName})</strong> taught by <strong>{overrideModalSlot.teacher.fullName}</strong>.
            </p>

            <form onSubmit={handleGrantOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Administrative Justification / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Authorized faculty meeting with Vice Chancellor delayed session start by 25 minutes."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalSlot(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {overrideSubmitting ? 'Granting...' : 'Approve & Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Room Router Geofence Modal */}
      {editRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-indigo-500/40 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-indigo-400">
              <Wifi className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Configure Classroom Router</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Set router IP subnet or MAC address for <strong>Room {editRoomModal.roomNumber} ({editRoomModal.building})</strong>.
            </p>

            <form onSubmit={handleSaveRoomRouter} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Router Friendly Name</label>
                <input
                  type="text"
                  placeholder="e.g. Router 52 (Physics AP - 4.1.20 / 4.1.21)"
                  value={editRoomForm.routerName}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, routerName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subnet CIDR</label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.52.0/24"
                    value={editRoomForm.assignedSubnet}
                    onChange={(e) => setEditRoomForm({ ...editRoomForm, assignedSubnet: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gateway / Router IP</label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.52.1"
                    value={editRoomForm.routerIp}
                    onChange={(e) => setEditRoomForm({ ...editRoomForm, routerIp: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Physical MAC (BSSID)</label>
                  <input
                    type="text"
                    placeholder="e.g. AA:BB:CC:52:00:01"
                    value={editRoomForm.routerMac}
                    onChange={(e) => setEditRoomForm({ ...editRoomForm, routerMac: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Wi-Fi SSID Name</label>
                  <input
                    type="text"
                    placeholder="e.g. UOS-Physics-52"
                    value={editRoomForm.routerSsid}
                    onChange={(e) => setEditRoomForm({ ...editRoomForm, routerSsid: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditRoomModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoomRouter}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingRoomRouter ? 'Saving...' : 'Save Geofence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User / Faculty Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-slate-800 animate-fade-in text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Add New University User
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Muhammad Bilal"
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">University Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="bilal@uosahiwal.edu.pk"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Employee / Roll ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PHY-01 or 2026-PHY-05"
                    value={newUserForm.employeeOrRollId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, employeeOrRollId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Role *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="TEACHER">TEACHER (Faculty)</option>
                    <option value="HOD">HOD (Head of Dept)</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="STUDENT">STUDENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department</label>
                  <select
                    value={newUserForm.departmentId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, departmentId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- No Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Password *</label>
                <input
                  type="text"
                  required
                  placeholder="password123"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50"
                >
                  {addingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Classroom Modal */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-lg w-full border border-slate-800 animate-fade-in text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                Add New Classroom &amp; Router Geofence
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRoomModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Room No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4.1.25"
                    value={newRoomForm.roomNumber}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, roomNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Building</label>
                  <input
                    type="text"
                    placeholder="e.g. Academic Block"
                    value={newRoomForm.building}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, building: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Floor</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newRoomForm.floor}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, floor: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Router Friendly Name</label>
                <input
                  type="text"
                  placeholder="e.g. Router 52 (Physics AP - Corridor)"
                  value={newRoomForm.routerName}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, routerName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Router Gateway IP</label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.52.1"
                    value={newRoomForm.routerIp}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, routerIp: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subnet Range</label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.52.0/24"
                    value={newRoomForm.assignedSubnet}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, assignedSubnet: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Physical MAC (BSSID)</label>
                  <input
                    type="text"
                    placeholder="e.g. AA:BB:CC:52:00:01"
                    value={newRoomForm.routerMac}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, routerMac: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Wi-Fi SSID Name</label>
                  <input
                    type="text"
                    placeholder="e.g. UOS-Physics-52"
                    value={newRoomForm.routerSsid}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, routerSsid: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRoom}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50"
                >
                  {addingRoom ? 'Adding...' : 'Add Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full border border-slate-800 animate-fade-in text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Department</h3>
              <button
                type="button"
                onClick={() => setShowAddDeptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department of Physics"
                  value={newDeptForm.name}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PHY or CS"
                  value={newDeptForm.code}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDept}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50"
                >
                  {addingDept ? 'Creating...' : 'Create Dept'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full border border-slate-800 animate-fade-in text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Course</h3>
              <button
                type="button"
                onClick={() => setShowAddCourseModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PHY-101"
                  value={newCourseForm.code}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mechanics &amp; Thermodynamics"
                  value={newCourseForm.title}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Credit Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={newCourseForm.creditHours}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, creditHours: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department *</label>
                  <select
                    required
                    value={newCourseForm.departmentId}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, departmentId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Dept --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCourse}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50"
                >
                  {addingCourse ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full border border-slate-800 animate-fade-in text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Student Section</h3>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSection} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Section Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BS-PHY-1A"
                  value={newSectionForm.name}
                  onChange={(e) => setNewSectionForm({ ...newSectionForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newSectionForm.semester}
                    onChange={(e) => setNewSectionForm({ ...newSectionForm, semester: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={newSectionForm.academicYear}
                    onChange={(e) => setNewSectionForm({ ...newSectionForm, academicYear: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Department *</label>
                <select
                  required
                  value={newSectionForm.departmentId}
                  onChange={(e) => setNewSectionForm({ ...newSectionForm, departmentId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Dept --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSection}
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition disabled:opacity-50"
                >
                  {addingSection ? 'Creating...' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AttendanceReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        defaultDepartmentId={selectedDeptFilter || null}
      />

      {/* Persistent Floating Toast (Always visible regardless of scroll position) */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900/95 border border-indigo-500/50 shadow-2xl text-slate-200 text-xs flex items-center gap-3 backdrop-blur-md animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
          <span className="flex-1 font-medium leading-relaxed">{notification}</span>
          <button
            onClick={() => setNotification('')}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white font-bold ml-2 transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
