import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Users, BookOpen, AlertTriangle, CheckCircle2, Lock, Unlock, RefreshCw, Calendar, Search, X } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetworkFence } from '../context/NetworkFenceContext.jsx';
import { StatusBadge } from '../components/common/Badge.jsx';
import { formatTimeRange, formatOpeningNotice } from '../utils/timeUtils.js';

export const TeacherDashboard = ({ onSelectSlotForMarking }) => {
  const { user } = useAuth();
  const { socket } = useNetworkFence();
  const [scheduleData, setScheduleData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'history'
  const [selectedDay, setSelectedDay] = useState('TODAY'); // 'TODAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'ALL'
  const [classSearch, setClassSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Request HOD Unlock modal state
  const [requestModalSlot, setRequestModalSlot] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [notification, setNotification] = useState('');

  const handleSendOverrideRequest = async (e) => {
    e.preventDefault();
    if (!requestModalSlot || !requestReason.trim()) return;

    setSubmittingRequest(true);
    try {
      const res = await api.post('/attendance/request-override', {
        slotId: requestModalSlot.id,
        reason: requestReason.trim(),
      });
      if (res.data.success) {
        setNotification('Request successfully sent to HOD! You will be notified when approved.');
        setRequestModalSlot(null);
        setRequestReason('');
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const fetchSchedule = async (day = selectedDay) => {
    setLoading(true);
    try {
      const url = day === 'TODAY' ? '/timetable/today' : `/timetable/today?day=${day}`;
      const res = await api.get(url);
      if (res.data.success) {
        setScheduleData(res.data);
      }
    } catch (err) {
      console.error('Failed to load schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/attendance/history');
      if (res.data.success) {
        setHistoryData(res.data.history);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchHistory();

    // Listen for instant admin override unlock via WebSocket!
    if (socket) {
      const handleOverride = (data) => {
        console.log('[WebSocket] Slot unlocked by admin:', data);
        fetchSchedule();
      };
      socket.on('SLOT_OVERRIDE_GRANTED', handleOverride);
      return () => socket.off('SLOT_OVERRIDE_GRANTED', handleOverride);
    }
  }, [socket]);

  // Filter classes by search query
  const filteredSlots = (scheduleData?.slots || []).filter((slot) => {
    if (!classSearch.trim()) return true;
    const q = classSearch.toLowerCase();
    const courseTitle = (slot.course?.title || '').toLowerCase();
    const courseCode = (slot.course?.code || '').toLowerCase();
    const sectionName = (slot.section?.name || '').toLowerCase();
    const roomNumber = (slot.room?.roomNumber || '').toLowerCase();
    const building = (slot.room?.building || '').toLowerCase();
    return (
      courseTitle.includes(q) ||
      courseCode.includes(q) ||
      sectionName.includes(q) ||
      roomNumber.includes(q) ||
      building.includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Profile Section */}
      <div className="glass-panel rounded-2xl p-6 mb-8 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Instructor Portal
            </span>
            <span className="text-xs text-slate-400">ID: {user?.employeeOrRollId}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome, {user?.fullName}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {user?.department?.name || user?.department || 'Department of Physics'} • University of Sahiwal
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-300 font-medium">
            {scheduleData?.currentDay || 'TODAY'}
          </span>
          <button
            onClick={fetchSchedule}
            title="Refresh Schedule"
            className="p-1 text-slate-400 hover:text-white transition ml-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {notification && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between animate-fade-in">
          <span>{notification}</span>
          <button onClick={() => setNotification('')} className="text-amber-300 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Modal: Request HOD to Unlock Attendance */}
      {requestModalSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-slate-800 animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-1">Request HOD Attendance Unlock</h3>
            <p className="text-xs text-slate-400 mb-4">
              Class: <span className="text-white font-semibold">{requestModalSlot.course.code} - {requestModalSlot.course.title}</span> ({requestModalSlot.section.name})
            </p>

            <form onSubmit={handleSendOverrideRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Justification / Reason for HOD Approval *
                </label>
                <textarea
                  required
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. Lab experiment ran 10 minutes over, or Internet connection issue in Academic Block."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalSlot(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submittingRequest ? 'Sending...' : 'Submit Request to HOD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-2">
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('today')}
            className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 ${
              activeTab === 'today'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Scheduled Classes ({scheduleData?.slots?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-sm font-semibold transition border-b-2 -mb-2.5 ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Attendance History
          </button>
        </div>

        {activeTab === 'today' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span>Server Today:</span>
            <strong className="text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              {scheduleData?.systemDay || 'TODAY'}
            </strong>
          </div>
        )}
      </div>

      {activeTab === 'today' ? (
        <div>
          {/* Day of Week Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-6 p-2 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider px-2">View Day:</span>
            {[
              { key: 'TODAY', label: `Today (${scheduleData?.systemDay || 'Live'})` },
              { key: 'MONDAY', label: 'Monday' },
              { key: 'TUESDAY', label: 'Tuesday' },
              { key: 'WEDNESDAY', label: 'Wednesday' },
              { key: 'THURSDAY', label: 'Thursday' },
              { key: 'FRIDAY', label: 'Friday' },
              { key: 'SATURDAY', label: 'Saturday' },
              { key: 'ALL', label: 'Full Week Schedule' },
            ].map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  setSelectedDay(d.key);
                  fetchSchedule(d.key);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedDay === d.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Quick Search Bar for Faculty Classes */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder="Search classes by course title, code (e.g. PHY-101), section, or room..."
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              {classSearch && (
                <button
                  onClick={() => setClassSearch('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {classSearch && (
              <span className="text-xs text-blue-400 font-mono whitespace-nowrap">
                {filteredSlots.length} found
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span>Loading faculty schedule...</span>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 border border-dashed border-slate-800">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">
                {classSearch ? `No classes found matching "${classSearch}".` : `No classes scheduled for ${selectedDay === 'TODAY' ? 'today' : selectedDay}.`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {classSearch ? 'Try a different course title, room or code.' : 'Select another day from the buttons above to preview other scheduled lectures.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSlots.map((slot) => {
                const evalInfo = slot.lockEvaluation;
                const canMark = evalInfo.canMark;

                return (
                  <div
                    key={slot.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Day, Time and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-bold text-blue-300 mr-1">{slot.dayOfWeek}</span>
                          <span>{formatTimeRange(slot.startTime, slot.endTime)}</span>
                        </div>
                        <StatusBadge status={evalInfo.status} />
                      </div>

                      {/* Prominent Classroom / Venue Badge directly from timetable */}
                      <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Classroom / Room: <strong className="text-white text-sm">{slot.room.roomNumber}</strong></span>
                        <span className="text-[10px] text-emerald-400/70">({slot.room.building})</span>
                      </div>

                      {/* Course Details */}
                      <h3 className="font-bold text-white text-base leading-snug">
                        {slot.course.title}
                      </h3>
                      <p className="text-xs text-blue-400 font-mono mt-0.5 font-medium">
                        {slot.course.code}
                      </p>

                      {/* Section Metadata */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>Student Section: <strong className="text-white">{slot.section.name}</strong> ({slot.section.studentCount} enrolled)</span>
                        </div>
                      </div>

                      {/* Lock reason callout if locked */}
                      {evalInfo.status === 'LOCKED_LATE' && (
                        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                          <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Late Entry Lockout</span>
                            <span>{evalInfo.lockReason}</span>
                          </div>
                        </div>
                      )}

                      {/* Admin Override Alert */}
                      {evalInfo.status === 'UNLOCKED_OVERRIDE' && (
                        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                          <Unlock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Unlocked by Admin Override</span>
                            <span>Reason: {evalInfo.overrideReason}</span>
                          </div>
                        </div>
                      )}

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
                          onClick={() => onSelectSlotForMarking(slot.id)}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                        >
                          <BookOpen className="w-4 h-4" />
                          Mark Student Attendance
                        </button>
                      ) : evalInfo.status === 'COMPLETED' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onSelectSlotForMarking(slot.id)}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                          >
                            View Attendance
                          </button>
                          <button
                            onClick={() => setRequestModalSlot(slot)}
                            className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition"
                            title="Request HOD to alter past attendance"
                          >
                            Request Edit
                          </button>
                        </div>
                      ) : (evalInfo.status === 'LOCKED_LATE' || evalInfo.status === 'LOCKED_EXPIRED') ? (
                        <div className="space-y-2">
                          <div className="text-center py-1 text-xs text-rose-400 font-semibold">
                            Attendance Locked
                          </div>
                          <button
                            onClick={() => setRequestModalSlot(slot)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Request HOD to Unlock
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
                            onClick={() => onSelectSlotForMarking(slot.id)}
                            className="w-full py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            View Enrolled Students (Roster)
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

      ) : (
        /* History Tab */
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3">Date & Time</th>
                <th className="pb-3">Course</th>
                <th className="pb-3">Section</th>
                <th className="pb-3">Teacher Status</th>
                <th className="pb-3">Room IP Recorded</th>
                <th className="pb-3">Student Stats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No past sessions recorded yet.
                  </td>
                </tr>
              ) : (
                historyData.map((h) => (
                  <tr key={h.id}>
                    <td className="py-3 font-mono">{new Date(h.markedAt).toLocaleString()}</td>
                    <td className="py-3 font-semibold text-white">{h.courseCode} - {h.courseTitle}</td>
                    <td className="py-3">{h.sectionName} ({h.roomNumber})</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.teacherStatus === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {h.teacherStatus}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">{h.clientIp}</td>
                    <td className="py-3">
                      <span className="text-emerald-400 font-semibold">{h.stats.present} P</span> / <span className="text-rose-400 font-semibold">{h.stats.absent} A</span> (Total {h.stats.totalStudents})
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
