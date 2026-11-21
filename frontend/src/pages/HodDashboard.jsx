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
  ShieldCheck,
  Send,
  Radio,
  Download,
  Calendar,
  Filter,
  Printer,
  ChevronRight,
  GraduationCap,
  Copy,
  Check,
  BookOpen,
  Search,
  X,
} from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetworkFence } from '../context/NetworkFenceContext.jsx';
import { StatusBadge } from '../components/common/Badge.jsx';
import { AttendanceReportModal } from '../components/reports/AttendanceReportModal.jsx';
import { formatTimeRange, formatOpeningNotice } from '../utils/timeUtils.js';

export const HodDashboard = ({ onSelectSlotForMarking }) => {
  const { user } = useAuth();
  const { socket } = useNetworkFence();

  const [activeTab, setActiveTab] = useState('my_classes'); // 'my_classes' | 'requests' | 'live' | 'faculty' | 'reports'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Search states
  const [facultySearch, setFacultySearch] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [liveSearch, setLiveSearch] = useState('');

  // HOD's Own Teaching Schedule state
  const [hodSchedule, setHodSchedule] = useState(null);
  const [selectedDay, setSelectedDay] = useState('TODAY');
  const [loadingHodSchedule, setLoadingHodSchedule] = useState(false);

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [overrideRequests, setOverrideRequests] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [delinquencyData, setDelinquencyData] = useState([]);

  // Review Modal state
  const [reviewModalRequest, setReviewModalRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED'); // 'APPROVED' | 'REJECTED'
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Manual Instant Override Modal state
  const [overrideModalSlot, setOverrideModalSlot] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const departmentName = user?.department?.name || user?.department || 'Department of Physics';
  const departmentCode = user?.department?.code || 'PHY';

  // Report Filter states
  const [reportDateRange, setReportDateRange] = useState('today');
  const [reportSectionFilter, setReportSectionFilter] = useState('');
  const [notification, setNotification] = useState('');
  const [copiedTeacherId, setCopiedTeacherId] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 5000);
  };

  const handleCopyCredentials = (teacher) => {
    const password = teacher.generatedPassword || '••••••••';
    const username = teacher.username || teacher.email.split('@')[0];
    const text = `UOS Faculty Official Login\nName: ${teacher.fullName}\nUsername: ${username}\nEmail: ${teacher.email}\nPassword: ${password}\nEmployee ID: ${teacher.employeeOrRollId || 'N/A'}\nDepartment: ${departmentName}`;
    navigator.clipboard.writeText(text);
    setCopiedTeacherId(teacher.id);
    showNotification(`✅ Copied official credentials for ${teacher.fullName}!`);
    setTimeout(() => setCopiedTeacherId(null), 3000);
  };

  const handleExportFacultyLogins = () => {
    if (facultyList.length === 0) {
      showNotification('No faculty accounts to export.');
      return;
    }

    const sortedFaculty = [...facultyList].sort((a, b) => a.fullName.localeCompare(b.fullName));
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const headers = [
      'Sr #',
      'Teacher Name',
      'Username',
      'Official Email',
      'Official Password',
      'Employee ID',
      'Department',
      'Scheduled Classes'
    ];

    const rows = sortedFaculty.map((t, index) => [
      index + 1,
      escapeCsv(t.fullName),
      escapeCsv(t.username || t.email.split('@')[0]),
      escapeCsv(t.email),
      escapeCsv(t.generatedPassword || '••••••••'),
      escapeCsv(t.employeeOrRollId || ''),
      escapeCsv(departmentName),
      t._count?.timetableSlots || 0,
    ]);

    // Prepend UTF-8 BOM (\uFEFF) so Excel natively detects UTF-8 columns
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${departmentCode}_Faculty_Login_Credentials.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`✅ Downloaded ${departmentCode}_Faculty_Login_Credentials.csv`);
  };

  // 1. Fetch Today's Live Department Dashboard
  const fetchLiveDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load live department dashboard:', err);
    }
  };

  // 2. Fetch Override Requests
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

  // 3. Fetch Department Faculty
  const fetchFaculty = async () => {
    try {
      const res = await api.get('/admin/users', {
        params: { role: 'TEACHER', departmentId: user?.departmentId },
      });
      if (res.data.success) {
        setFacultyList(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load faculty list:', err);
    }
  };

  // 4. Fetch Delinquency / Punctuality Report
  const fetchDelinquency = async () => {
    try {
      const res = await api.get('/admin/delinquency-report');
      if (res.data.success) {
        setDelinquencyData(res.data.facultyAudit || res.data.report || []);
      }
    } catch (err) {
      console.error('Failed to load delinquency report:', err);
    }
  };

  // 5. Fetch HOD's Own Teaching Schedule
  const fetchHodSchedule = async (day = selectedDay) => {
    setLoadingHodSchedule(true);
    try {
      const url = day === 'TODAY' ? '/timetable/today' : `/timetable/today?day=${day}`;
      const res = await api.get(url);
      if (res.data.success) {
        setHodSchedule(res.data);
      }
    } catch (err) {
      console.error('Failed to load HOD personal schedule:', err);
    } finally {
      setLoadingHodSchedule(false);
    }
  };

  const loadAllData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchLiveDashboard(),
      fetchOverrideRequests(),
      fetchFaculty(),
      fetchDelinquency(),
      fetchHodSchedule(selectedDay),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHodSchedule(selectedDay);
  }, [selectedDay]);

  useEffect(() => {
    loadAllData();

    // Listen to real-time WebSocket events
    if (socket) {
      socket.on('LIVE_ATTENDANCE_UPDATE', () => {
        fetchLiveDashboard();
      });

      socket.on('SLOT_OVERRIDE_GRANTED', () => {
        fetchLiveDashboard();
        fetchOverrideRequests();
      });

      return () => {
        socket.off('LIVE_ATTENDANCE_UPDATE');
        socket.off('SLOT_OVERRIDE_GRANTED');
      };
    }
  }, [socket]);

  // Handle HOD Review of Teacher Request
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModalRequest) return;

    try {
      setSubmittingReview(true);
      const res = await api.post('/admin/override-requests/review', {
        requestId: reviewModalRequest.id,
        status: reviewAction,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      if (res.data.success) {
        showNotification(`Request successfully ${reviewAction.toLowerCase()} for ${reviewModalRequest.teacher?.fullName}.`);
        setReviewModalRequest(null);
        setReviewNotes('');
        await Promise.all([fetchOverrideRequests(), fetchLiveDashboard()]);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to review request.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle Direct HOD Emergency Override
  const handleDirectOverride = async (e) => {
    e.preventDefault();
    if (!overrideModalSlot || !overrideReason.trim()) return;

    try {
      setOverrideSubmitting(true);
      const res = await api.post('/admin/override', {
        slotId: overrideModalSlot.id,
        reason: `HOD Direct Unlock: ${overrideReason.trim()}`,
      });

      if (res.data.success) {
        showNotification(`Lecture slot unlocked for ${overrideModalSlot.teacher?.fullName}.`);
        setOverrideModalSlot(null);
        setOverrideReason('');
        await fetchLiveDashboard();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to unlock slot.');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // Export CSV of Attendance / Delinquency
  const handleExportCsv = () => {
    if (!delinquencyData || delinquencyData.length === 0) {
      showNotification('No data available to export.');
      return;
    }

    const sortedData = [...delinquencyData].sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const headers = [
      'Sr #',
      'Teacher Name',
      'Employee ID',
      'Official Email',
      'Department',
      'Scheduled Classes',
      'Conducted Sessions',
      'Missed/Unmarked',
      'Punctuality Rate'
    ];

    const rows = sortedData.map((d, index) => [
      index + 1,
      escapeCsv(d.teacherName),
      escapeCsv(d.employeeId),
      escapeCsv(d.email),
      escapeCsv(departmentName),
      d.scheduledSlotsCount ?? 0,
      d.conductedSessionsCount ?? 0,
      d.missedCount ?? 0,
      escapeCsv(`${d.completionRate ?? 100}%`),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${departmentCode}_Faculty_Attendance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pendingRequests = (overrideRequests || []).filter((r) => r.status === 'PENDING');
  const reviewedRequests = (overrideRequests || []).filter((r) => r.status !== 'PENDING');

  // Filtered HOD's own classes
  const filteredHodSlots = (hodSchedule?.slots || []).filter((slot) => {
    if (!slotSearch.trim()) return true;
    const q = slotSearch.toLowerCase();
    const courseTitle = (slot.course?.title || '').toLowerCase();
    const courseCode = (slot.course?.code || '').toLowerCase();
    const sectionName = (slot.section?.name || '').toLowerCase();
    const roomNumber = (slot.room?.roomNumber || '').toLowerCase();
    return (
      courseTitle.includes(q) ||
      courseCode.includes(q) ||
      sectionName.includes(q) ||
      roomNumber.includes(q)
    );
  });

  // Filtered live department lectures
  const filteredLiveSlots = (dashboardData?.slots || []).filter((slot) => {
    if (!liveSearch.trim()) return true;
    const q = liveSearch.toLowerCase();
    const courseTitle = (slot.courseTitle || '').toLowerCase();
    const courseCode = (slot.courseCode || '').toLowerCase();
    const teacherName = (slot.teacher?.fullName || '').toLowerCase();
    const sectionName = (slot.sectionName || '').toLowerCase();
    const roomNumber = (slot.roomNumber || '').toLowerCase();
    return (
      courseTitle.includes(q) ||
      courseCode.includes(q) ||
      teacherName.includes(q) ||
      sectionName.includes(q) ||
      roomNumber.includes(q)
    );
  });

  // Filtered department faculty members
  const filteredFaculty = (facultyList || []).filter((teacher) => {
    if (!facultySearch.trim()) return true;
    const q = facultySearch.toLowerCase();
    const name = (teacher.fullName || '').toLowerCase();
    const email = (teacher.email || '').toLowerCase();
    const id = (teacher.employeeOrRollId || '').toLowerCase();
    return name.includes(q) || email.includes(q) || id.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm">Loading HOD Department Management Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-8 p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950 border border-emerald-500/20 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                HOD Portal
              </span>
              <span className="px-3 py-1 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full text-xs font-mono">
                {departmentCode}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {departmentName}
            </h1>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
              <span>Head of Department: <strong className="text-slate-200">{user?.fullName}</strong></span>
              <span>•</span>
              <span>{user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium border border-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-600/20 transition"
            >
              <FileText className="w-4 h-4" />
              Academic Reports
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Pending Requests Alert */}
        <div
          onClick={() => setActiveTab('requests')}
          className={`cursor-pointer p-5 rounded-xl border transition relative overflow-hidden ${
            pendingRequests.length > 0
              ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70 shadow-lg shadow-amber-950/30'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
        >
          {pendingRequests.length > 0 && (
            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Pending Unlock Requests</div>
            <Clock className={`w-5 h-5 ${pendingRequests.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${pendingRequests.length > 0 ? 'text-amber-400' : 'text-white'}`}>
              {pendingRequests.length}
            </span>
            <span className="text-xs text-slate-400">require HOD decision</span>
          </div>
        </div>

        {/* Today's Lectures */}
        <div
          onClick={() => setActiveTab('live')}
          className="cursor-pointer p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Today's Lectures</div>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {dashboardData?.metrics?.totalSlots ?? dashboardData?.stats?.totalToday ?? (dashboardData?.slots?.length ?? 0)}
            </span>
            <span className="text-xs text-slate-400">scheduled today</span>
          </div>
        </div>

        {/* Conducted / Completed */}
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Conducted Classes</div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">
              {dashboardData?.metrics?.completedCount ?? dashboardData?.stats?.completed ?? 0}
            </span>
            <span className="text-xs text-slate-400">attendance marked</span>
          </div>
        </div>

        {/* Department Faculty */}
        <div
          onClick={() => setActiveTab('faculty')}
          className="cursor-pointer p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Department Faculty</div>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{facultyList.length}</span>
            <span className="text-xs text-slate-400">active professors/lecturers</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-800 mb-6 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('my_classes')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'my_classes'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          My Teaching Classes {hodSchedule?.slots?.length ? `(${hodSchedule.slots.length})` : ''}
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'requests'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Unlock Requests
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded-full text-xs">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'live'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          Live Today Monitor
        </button>

        <button
          onClick={() => setActiveTab('faculty')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'faculty'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Faculty Roster ({facultyList.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Department Attendance Reports
        </button>
      </div>

      {/* TAB CONTENT: 0. HOD's Own Teaching Classes */}
      {activeTab === 'my_classes' && (
        <div className="space-y-6 animate-fade-in">
          {/* Day Selector Pill Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                {user?.fullName || 'Dr. M. Asif Nawaz'} — My Teaching Lectures
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mark student attendance and manage course rosters for your assigned classes
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {['TODAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'ALL'].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedDay === d
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {d}
                </button>
              ))}
              <button
                onClick={fetchHodSchedule}
                title="Refresh schedule"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHodSchedule ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Search Bar for My Lectures */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={slotSearch}
                onChange={(e) => setSlotSearch(e.target.value)}
                placeholder="Search lectures by course title, code (e.g. PHY-101, PHD-805), section, or room..."
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {slotSearch && (
                <button
                  onClick={() => setSlotSearch('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {slotSearch && (
              <span className="text-xs text-indigo-400 font-mono whitespace-nowrap">
                {filteredHodSlots.length} found
              </span>
            )}
          </div>

          {/* Classes Grid */}
          {loadingHodSchedule ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span>Loading assigned lectures...</span>
            </div>
          ) : filteredHodSlots.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 border border-dashed border-slate-800">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">
                {slotSearch ? `No lectures found matching "${slotSearch}".` : `No classes scheduled for ${selectedDay === 'TODAY' ? 'today' : selectedDay}.`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {slotSearch ? 'Try a different course title, room or code.' : 'Select another day from the buttons above to preview or conduct your other scheduled lectures.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHodSlots.map((slot) => {
                const evalInfo = slot.lockEvaluation || {};
                const canMark = evalInfo.canMark || evalInfo.status === 'ACTIVE_OPEN' || evalInfo.status === 'ACTIVE_LATE' || evalInfo.isEvaluationTestMode;

                return (
                  <div
                    key={slot.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Day, Time and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-bold text-indigo-300 mr-1">{slot.dayOfWeek}</span>
                          <span>{formatTimeRange(slot.startTime, slot.endTime)}</span>
                        </div>
                        <StatusBadge status={evalInfo.status} />
                      </div>

                      {/* Room Badge */}
                      <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Classroom: <strong className="text-white text-sm">{slot.room.roomNumber}</strong></span>
                        <span className="text-[10px] text-emerald-400/70">({slot.room.building})</span>
                      </div>

                      {/* Course Details */}
                      <h3 className="font-bold text-white text-base leading-snug">
                        {slot.course.title}
                      </h3>
                      <p className="text-xs text-indigo-400 font-mono mt-0.5 font-medium">
                        {slot.course.code}
                      </p>

                      {/* Section Metadata */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>Section: <strong className="text-white">{slot.section.name}</strong> ({slot.section.studentCount} enrolled)</span>
                        </div>
                      </div>

                      {/* Completed Details */}
                      {evalInfo.status === 'COMPLETED' && (
                        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Dual Attendance Recorded
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Teacher Status: {slot.session?.teacherStatus} • IP: {slot.session?.clientIp}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-slate-800 space-y-2">
                      {canMark ? (
                        <button
                          onClick={() => onSelectSlotForMarking ? onSelectSlotForMarking(slot.id) : null}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                          <BookOpen className="w-4 h-4" />
                          Mark Student Attendance
                        </button>
                      ) : evalInfo.status === 'COMPLETED' ? (
                        <button
                          onClick={() => onSelectSlotForMarking ? onSelectSlotForMarking(slot.id) : null}
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          View Attendance
                        </button>
                      ) : (evalInfo.status === 'LOCKED_LATE' || evalInfo.status === 'LOCKED_EXPIRED') ? (
                        <div className="space-y-2">
                          <div className="text-center py-1 text-xs text-rose-400 font-semibold">
                            {evalInfo.lockReason || 'Attendance Locked (30-min window concluded)'}
                          </div>
                          <button
                            onClick={() => onSelectSlotForMarking ? onSelectSlotForMarking(slot.id) : null}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Instant HOD Unlock &amp; Mark
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-center py-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                            <span className="text-indigo-300 font-medium">
                              {formatOpeningNotice(slot.startTime, evalInfo.minutesUntilOpen)}
                            </span>
                          </div>
                          <button
                            onClick={() => onSelectSlotForMarking ? onSelectSlotForMarking(slot.id) : null}
                            className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Open Attendance Roster (HOD Preview)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 1. Unlock Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Pending Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Pending Review Requests
                </h2>
                <p className="text-xs text-slate-400">
                  Teachers requesting attendance unlock for locked/late lecture sessions
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-semibold">
                {pendingRequests.length} Pending
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm text-slate-300 font-medium">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No pending override requests from your faculty at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 hover:border-amber-500/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{req.teacher?.fullName}</span>
                        <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                          {req.teacher?.employeeOrRollId || req.teacher?.email}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-amber-400 font-mono">
                          Requested: {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-emerald-400">
                          {req.timetableSlot?.course?.code}: {req.timetableSlot?.course?.title}
                        </span>
                        <span>• Section: <strong>{req.timetableSlot?.section?.name}</strong></span>
                        <span>• Room: <strong>{req.timetableSlot?.room?.roomNumber}</strong></span>
                        <span>• Slot: <strong>{formatTimeRange(req.timetableSlot?.startTime, req.timetableSlot?.endTime)}</strong></span>
                      </div>

                      <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200">
                        <strong className="text-amber-300">Teacher's Reason: </strong>
                        {req.reason}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setReviewModalRequest(req);
                          setReviewAction('APPROVED');
                          setReviewNotes('');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Approve & Unlock
                      </button>
                      <button
                        onClick={() => {
                          setReviewModalRequest(req);
                          setReviewAction('REJECTED');
                          setReviewNotes('');
                        }}
                        className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Decisions History */}
          {reviewedRequests.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Previous Override Decisions History
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Teacher</th>
                      <th className="p-3">Course / Section</th>
                      <th className="p-3">Stated Reason</th>
                      <th className="p-3">Decision</th>
                      <th className="p-3">Decision Date</th>
                      <th className="p-3">HOD Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {reviewedRequests.slice(0, 15).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/20">
                        <td className="p-3 font-medium text-white">{r.teacher?.fullName}</td>
                        <td className="p-3">
                          {r.timetableSlot?.course?.code} ({r.timetableSlot?.section?.name})
                        </td>
                        <td className="p-3 max-w-xs truncate text-slate-400">{r.reason}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">
                          {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3 text-slate-400 italic">{r.reviewNotes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 2. Live Today Monitor */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              Live Lecture Monitor — {departmentName}
            </h2>
            <div className="text-xs text-slate-400">
              Showing classes scheduled for today ({new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })})
            </div>
          </div>

          {/* Live Classes Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={liveSearch}
                onChange={(e) => setLiveSearch(e.target.value)}
                placeholder="Search live classes by course title, code (e.g. PHY-101), teacher name, room, or section..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              {liveSearch && (
                <button
                  onClick={() => setLiveSearch('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {liveSearch && (
              <span className="text-xs text-emerald-400 font-mono whitespace-nowrap">
                {filteredLiveSlots.length} matching
              </span>
            )}
          </div>

          {!dashboardData?.slots || dashboardData.slots.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No Lectures Scheduled Today</p>
              <p className="text-xs text-slate-500 mt-1">There are no classes scheduled for {departmentCode} on this day of the week.</p>
            </div>
          ) : filteredLiveSlots.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No classes match &quot;{liveSearch}&quot;</p>
              <p className="text-xs text-slate-500 mt-1">Try searching by a different teacher name, course, or classroom.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLiveSlots.map((slot) => {
                const status = slot.lockEvaluation?.status || 'UPCOMING';
                const isCompleted = status === 'COMPLETED';
                const isLate = status === 'LOCKED_LATE' || status === 'LOCKED_EXPIRED';
                const isOpen = status === 'ACTIVE_OPEN' || status === 'UNLOCKED_OVERRIDE';

                return (
                  <div
                    key={slot.id}
                    className={`p-5 rounded-2xl border transition relative flex flex-col justify-between ${
                      isCompleted
                        ? 'bg-slate-900/40 border-slate-800'
                        : isLate
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : isOpen
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                        : 'bg-slate-900/50 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {formatTimeRange(slot.startTime, slot.endTime)}
                        </span>
                        <StatusBadge status={status} />
                      </div>

                      <h3 className="text-base font-bold text-white mt-2 leading-snug">
                        {slot.courseCode}: {slot.courseTitle}
                      </h3>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Teacher: <strong className="text-white">{slot.teacher?.fullName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Section: <strong className="text-slate-200">{slot.sectionName}</strong> ({slot.studentCount} students)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Room: <strong className="text-slate-200">{slot.roomNumber}</strong> ({slot.building})</span>
                        </div>
                      </div>

                      {/* Attendance stats if completed */}
                      {slot.session && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Marked:</span>
                          <span className="font-semibold text-emerald-400">
                            {(slot.session.totalMarkedCount ?? ((slot.session.presentCount || 0) + (slot.session.absentCount || 0) + (slot.session.lateCount || 0)) ?? slot.session.studentRecords?.length ?? 0)} students recorded
                            {slot.session.presentCount !== undefined && (
                              <span className="text-[11px] text-slate-400 ml-1.5 font-normal">
                                ({slot.session.presentCount} Present{slot.session.absentCount ? `, ${slot.session.absentCount} Absent` : ''}{slot.session.lateCount ? `, ${slot.session.lateCount} Late` : ''})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 font-mono truncate">
                        {slot.lockEvaluation?.reason || 'Scheduled slot'}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onSelectSlotForMarking ? onSelectSlotForMarking(slot.id) : null}
                          className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          Roster
                        </button>
                        {/* If locked, give HOD direct unlock option */}
                        {(isLate || status === 'LOCKED_LATE') && (
                          <button
                            onClick={() => {
                              setOverrideModalSlot(slot);
                              setOverrideReason('HOD manual authorization');
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. Faculty Roster */}
      {activeTab === 'faculty' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                {departmentName} — Faculty Members
              </h2>
              <p className="text-xs text-slate-400">List of teaching faculty assigned to this academic department</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportFacultyLogins}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export Faculty Logins (CSV)
              </button>
              <span className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold">
                {facultyList.length} Teachers
              </span>
            </div>
          </div>

          {/* Faculty Search Bar */}
          <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                placeholder="Search teacher by name, email, employee ID (e.g. FAC-PHY-116)..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {facultySearch && (
                <button
                  onClick={() => setFacultySearch('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">
                Showing: <strong className="text-indigo-400">{filteredFaculty.length}</strong> of {facultyList.length}
              </span>
              {facultySearch && (
                <button
                  type="button"
                  onClick={() => setFacultySearch('')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Faculty Name</th>
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Login Email</th>
                  <th className="p-3">Scheduled Classes</th>
                  <th className="p-3">Official Password</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Credentials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No faculty members found matching &quot;{facultySearch}&quot;.
                    </td>
                  </tr>
                ) : filteredFaculty.map((teacher) => {
                  return (
                    <tr key={teacher.id} className="hover:bg-slate-800/20">
                      <td className="p-3 font-semibold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-200">
                          {teacher.fullName.charAt(0)}
                        </div>
                        {teacher.fullName}
                      </td>
                      <td className="p-3 font-mono text-slate-400">{teacher.employeeOrRollId || '—'}</td>
                      <td className="p-3 text-slate-300 font-mono select-all">{teacher.email}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-semibold text-[10px]">
                          {teacher._count?.timetableSlots || 0} Lectures
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-emerald-300 font-bold select-all">
                          {teacher.generatedPassword || '••••••••'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(teacher)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 ml-auto transition ${
                            copiedTeacherId === teacher.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700'
                          }`}
                        >
                          {copiedTeacherId === teacher.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedTeacherId === teacher.id ? 'Copied!' : 'Copy Login'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. Department Attendance Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Department Academic Audit & Punctuality
                </h2>
                <p className="text-xs text-slate-400">Class conduction metrics and delivery tracking across faculty</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Report
                </button>
                <button
                  onClick={handleExportCsv}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export to CSV
                </button>
              </div>
            </div>

            {delinquencyData.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                No attendance statistics recorded yet. Once teachers mark attendance, the metrics will populate here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Faculty Member</th>
                      <th className="p-3">Scheduled Slots</th>
                      <th className="p-3">Conducted Sessions</th>
                      <th className="p-3">Missed / Locked</th>
                      <th className="p-3">Completion Rate</th>
                      <th className="p-3">Performance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {delinquencyData.map((d) => {
                      const rate = typeof d.completionRate === 'number' && !isNaN(d.completionRate) ? d.completionRate : 100;
                      return (
                        <tr key={d.teacherId || d.id} className="hover:bg-slate-800/20">
                          <td className="p-3">
                            <div className="font-semibold text-white">{d.teacherName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{d.email || d.employeeId}</div>
                          </td>
                          <td className="p-3 font-semibold">{d.scheduledSlotsCount ?? 0}</td>
                          <td className="p-3 text-emerald-400 font-semibold">{d.conductedSessionsCount ?? 0}</td>
                          <td className="p-3 text-rose-400 font-semibold">{d.missedCount ?? 0}</td>
                          <td className="p-3 font-bold text-sm">
                            <span
                              className={
                                rate >= 90
                                  ? 'text-emerald-400'
                                  : rate >= 75
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }
                            >
                              {rate}%
                            </span>
                          </td>
                          <td className="p-3">
                            {rate >= 90 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                EXCELLENT
                              </span>
                            ) : rate >= 75 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                SATISFACTORY
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                NEEDS REVIEW
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {reviewAction === 'APPROVED' ? (
                  <Unlock className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Lock className="w-5 h-5 text-rose-400" />
                )}
                {reviewAction === 'APPROVED' ? 'Approve Override Request' : 'Reject Override Request'}
              </h3>
              <button
                onClick={() => setReviewModalRequest(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1 mb-4">
              <div><strong className="text-slate-400">Teacher:</strong> {reviewModalRequest.teacher?.fullName}</div>
              <div><strong className="text-slate-400">Course:</strong> {reviewModalRequest.timetableSlot?.course?.code} - {reviewModalRequest.timetableSlot?.course?.title}</div>
              <div><strong className="text-slate-400">Section:</strong> {reviewModalRequest.timetableSlot?.section?.name}</div>
              <div className="mt-2 text-amber-300 font-medium">"{reviewModalRequest.reason}"</div>
            </div>

            <form onSubmit={handleReviewSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  HOD Notes / Instructions (Optional):
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVED'
                      ? 'e.g., Authorized due to approved conference leave.'
                      : 'e.g., Request rejected because session ended more than 2 hours ago.'
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalRequest(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition flex items-center gap-1.5 ${
                    reviewAction === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  }`}
                >
                  {submittingReview ? 'Processing...' : `Confirm ${reviewAction === 'APPROVED' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Emergency Override Modal */}
      {overrideModalSlot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <Unlock className="w-5 h-5 text-amber-400" />
              Direct Emergency Unlock
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Unlock class session for <strong>{overrideModalSlot.teacher?.fullName}</strong> ({overrideModalSlot.courseCode} - {overrideModalSlot.sectionName}).
            </p>

            <form onSubmit={handleDirectOverride}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for HOD Override:
                </label>
                <input
                  type="text"
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Campus network connectivity delay"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalSlot(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-600/20"
                >
                  {overrideSubmitting ? 'Unlocking...' : 'Authorize Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Audit & Reports Modal */}
      <AttendanceReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        defaultDepartmentId={user?.departmentId}
      />
    </div>
  );
};
