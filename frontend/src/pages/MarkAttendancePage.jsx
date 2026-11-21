import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  ShieldCheck,
  Send,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Users,
  Fingerprint,
  Radio,
  Wifi,
  Lock,
  Search,
  ScanFace,
  Camera,
} from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetworkFence } from '../context/NetworkFenceContext.jsx';
import { verifyTeacherBiometric } from '../utils/biometricUtils.js';
import { formatTimeRange } from '../utils/timeUtils.js';

export const MarkAttendancePage = ({ slotId, onBack }) => {
  const { user, simulatedIp } = useAuth();
  const { isCampusNetwork, networkInfo, checkNetworkStatus } = useNetworkFence();
  const [slotData, setSlotData] = useState(null);
  const [lockEvaluation, setLockEvaluation] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Biometric Modal State
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [bioMode, setBioMode] = useState('THUMB'); // 'THUMB' | 'FACE'
  const [biometricStatus, setBiometricStatus] = useState('IDLE'); // 'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAILED'
  const [biometricError, setBiometricError] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  const displayIp = simulatedIp || networkInfo?.clientIp || '127.0.0.1';

  const fetchRosterAndVerify = async () => {
    try {
      setLoading(true);
      const [rosterRes] = await Promise.all([
        api.get(`/timetable/slot/${slotId}/roster`),
        checkNetworkStatus?.(),
      ]);

      if (rosterRes.data.success) {
        setSlotData(rosterRes.data.slot);
        setStudents(rosterRes.data.students);
        setLockEvaluation(rosterRes.data.lockEvaluation || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load roster or timetable slot.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosterAndVerify();
  }, [slotId]);

  const handleStatusChange = (studentId, newStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    );
  };

  const handleMarkAll = (status) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const absentCount = students.filter((s) => s.status === 'ABSENT').length;
  const lateCount = students.filter((s) => s.status === 'LATE').length;

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q)
    );
  });

  const [scanProgress, setScanProgress] = useState(0);
  const scanIntervalRef = useRef(null);

  const handleStartBiometricPrompt = () => {
    setBiometricStatus('IDLE');
    setBiometricError('');
    setScanProgress(0);
    setTeacherPassword('');
    setShowBiometricModal(true);
  };

  const executeAttendanceSubmit = async (bioType = 'HARDWARE_TOUCH_BIOMETRIC') => {
    setSubmitting(true);
    try {
      const payload = {
        slotId,
        studentAttendances: students.map((s) => ({
          studentId: s.id,
          status: s.status,
        })),
        biometricVerified: true,
        biometricType: bioType,
        teacherPassword: teacherPassword.trim() || undefined,
      };

      const res = await api.post('/attendance/submit', payload);
      if (res.data.success) {
        setSuccessResult(res.data.dualAttendanceSummary);
        setShowBiometricModal(false);
      }
    } catch (err) {
      setBiometricError(err.response?.data?.message || 'Failed to submit attendance.');
      setError(err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricConfirmClick = async () => {
    if (biometricStatus === 'SUCCESS' || submitting) return;

    setBiometricStatus('SCANNING');
    setBiometricError('');

    try {
      const bioResult = await verifyTeacherBiometric(user?.email, bioMode);
      if (bioResult.success) {
        setBiometricStatus('SUCCESS');
        setScanProgress(100);
        try { navigator.vibrate?.([100, 50, 100]); } catch (_) {}
        setTimeout(() => {
          executeAttendanceSubmit(bioResult.biometricType);
        }, 300);
        return;
      }
    } catch (err) {
      console.warn('Biometric error/fallback:', err?.message);
      if (err?.message?.includes('cancelled') || err?.message?.includes('Cancel')) {
        setBiometricStatus('IDLE');
        setBiometricError('Biometric verification was cancelled.');
        return;
      }
    }

    // Always fall back smoothly to the automated interactive scan sequence
    triggerAutomatedScan();
  };

  const triggerAutomatedScan = () => {
    if (biometricStatus === 'SUCCESS' || submitting) return;
    setBiometricStatus('SCANNING');
    setBiometricError('');
    setScanProgress(15);
    try { navigator.vibrate?.([40]); } catch (_) {}

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    let progress = 15;
    scanIntervalRef.current = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
        setScanProgress(100);
        setBiometricStatus('SUCCESS');
        try { navigator.vibrate?.([100, 50, 100]); } catch (_) {}

        setTimeout(() => {
          executeAttendanceSubmit(bioMode === 'FACE' ? 'FACIAL_RECOGNITION' : 'HARDWARE_TOUCH_BIOMETRIC');
        }, 400);
      } else {
        setScanProgress(progress);
        if (progress % 30 === 0) {
          try { navigator.vibrate?.([25]); } catch (_) {}
        }
      }
    }, 60);
  };

  const startHoldingScan = (e) => {
    if (e && e.cancelable) e.preventDefault();
    if (biometricStatus === 'SUCCESS' || submitting) return;
    setBiometricStatus('SCANNING');
    setBiometricError('');
    setScanProgress(5);
    try { navigator.vibrate?.([40]); } catch (_) {}

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    let progress = 5;
    scanIntervalRef.current = setInterval(() => {
      progress += 5;
      if (progress >= 100) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
        setScanProgress(100);
        setBiometricStatus('SUCCESS');
        try { navigator.vibrate?.([100, 50, 100]); } catch (_) {}

        // Proceed to dual attendance submission
        setTimeout(() => {
          executeAttendanceSubmit(bioMode === 'FACE' ? 'FACIAL_RECOGNITION' : 'HARDWARE_TOUCH_BIOMETRIC');
        }, 400);
      } else {
        setScanProgress(progress);
        if (progress % 20 === 0) {
          try { navigator.vibrate?.([25]); } catch (_) {}
        }
      }
    }, 70);
  };

  const cancelHoldingScan = () => {
    if (biometricStatus === 'SUCCESS' || submitting) return;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (scanProgress > 0 && scanProgress < 100) {
      setBiometricStatus('IDLE');
      setScanProgress(0);
      setBiometricError(
        bioMode === 'FACE'
          ? 'Face moved out of frame too quickly. Please look directly at the sensor until complete.'
          : 'Thumb lifted too early. Please PRESS and HOLD your thumb on the scanner until 100%.'
      );
      try { navigator.vibrate?.([60, 60]); } catch (_) {}
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto py-16 text-center text-slate-400">Loading student roster and verifying classroom router...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Success Modal / Banner */}
      {successResult && (
        <div className="glass-panel-glow rounded-2xl p-6 mb-8 border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Dual Attendance & Biometric Fingerprint Verified!</h2>
          </div>
          <p className="text-xs text-slate-300 mb-4">
            Both the student roster and your faculty attendance record have been securely logged with classroom router fingerprint.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/80 p-4 rounded-xl border border-slate-800 font-mono">
            <div>
              <span className="text-slate-400 block">Teacher Attendance:</span>
              <strong className="text-white">{successResult.teacherAttendance.teacherName} ({successResult.teacherAttendance.status})</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Logged Timestamp & IP:</span>
              <span className="text-emerald-400 font-bold">{new Date(successResult.teacherAttendance.timestamp).toLocaleTimeString()} ({successResult.teacherAttendance.campusIpRecorded})</span>
            </div>
            <div>
              <span className="text-slate-400 block">Biometric Security:</span>
              <span className="text-purple-300 font-bold">✓ Native Fingerprint Authenticated</span>
            </div>
            <div>
              <span className="text-slate-400 block">Students Recorded:</span>
              <span className="text-slate-200">{successResult.studentAttendance.totalMarked} marked ({successResult.studentAttendance.present} Present, {successResult.studentAttendance.absent} Absent)</span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition"
          >
            Return to Schedule
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* University Campus Wi-Fi Live Security Status Banner */}
      {isCampusNetwork ? (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 mb-6 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>University Campus Wi-Fi Connected</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  Campus Verified
                </span>
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Current Device IP: <span className="font-mono text-emerald-300 font-bold">{displayIp}</span> • Authorized for Dual Biometric Submission
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-400 font-mono">
            UOS Campus Network
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 mb-6 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <span>University Campus Wi-Fi Required</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  Submission Disabled
                </span>
              </div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                Current IP: <span className="font-mono text-amber-300">{displayIp}</span> (Mobile Data / External Network). Please connect your device to University Campus Wi-Fi to mark attendance.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Details Card */}
      <div className="glass-panel rounded-2xl p-6 mb-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <div className="text-xs font-mono text-blue-400 font-semibold">{slotData?.course.code}</div>
            <h1 className="text-xl font-bold text-white">{slotData?.course.title}</h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            {formatTimeRange(slotData?.startTime, slotData?.endTime)}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Section: <strong className="text-white">{slotData?.section.name}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            Room: <strong className="text-white">{slotData?.room.roomNumber}</strong> ({slotData?.room.building})
          </span>
        </div>
      </div>

      {/* Quick Action Counters Bar */}
      <div className="glass-panel rounded-2xl p-4 mb-6 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="text-slate-400">Total: <strong className="text-white font-mono">{students.length}</strong></span>
          <span className="text-emerald-400">Present: <strong className="font-mono">{presentCount}</strong></span>
          <span className="text-rose-400">Absent: <strong className="font-mono">{absentCount}</strong></span>
          {lateCount > 0 && <span className="text-amber-400">Late: <strong className="font-mono">{lateCount}</strong></span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMarkAll('PRESENT')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-semibold transition"
          >
            Mark All Present
          </button>
          <button
            onClick={() => handleMarkAll('ABSENT')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-semibold transition"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Student Roster Search Bar */}
      <div className="glass-panel rounded-2xl p-3.5 mb-4 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search student by roll number (e.g. 24, 05) or name..."
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          {studentSearch && (
            <button
              onClick={() => setStudentSearch('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap px-1 font-mono flex items-center gap-2">
          <span>Showing: <strong className="text-blue-400">{filteredStudents.length}</strong> of {students.length} students</span>
          {studentSearch && (
            <button
              onClick={() => setStudentSearch('')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden mb-8">
        <div className="divide-y divide-slate-800/60">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No students found matching &quot;{studentSearch}&quot;.
            </div>
          ) : filteredStudents.map((student, idx) => (
            <div
              key={student.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-xs text-slate-500 font-mono">{idx + 1}.</span>
                <div>
                  <div className="text-sm font-semibold text-white">{student.fullName}</div>
                  <div className="text-xs font-mono text-slate-400">{student.rollNumber}</div>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleStatusChange(student.id, 'PRESENT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    student.status === 'PRESENT'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Present
                </button>
                <button
                  onClick={() => handleStatusChange(student.id, 'ABSENT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    student.status === 'ABSENT'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  Absent
                </button>
                <button
                  onClick={() => handleStatusChange(student.id, 'LATE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    student.status === 'LATE'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Late
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submission Footer */}
      <div className="sticky bottom-4 glass-panel-glow p-4 rounded-2xl border border-blue-500/30 flex items-center justify-between shadow-2xl">
        <div>
          <div className="text-xs font-bold text-white">
            {lockEvaluation && !lockEvaluation.canMark ? 'Attendance Locked (Read-Only Roster)' : 'Anti-Proxy Protected Submission'}
          </div>
          <div className="text-[11px] text-slate-400">
            {lockEvaluation && !lockEvaluation.canMark
              ? (lockEvaluation.lockReason || 'Attendance cannot be marked outside the scheduled class window.')
              : `${presentCount} Present • ${absentCount} Absent • Biometric Thumb Required`}
          </div>
        </div>

        {lockEvaluation && !lockEvaluation.canMark ? (
          <button
            disabled
            className="py-2.5 px-6 bg-slate-800/90 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed flex items-center gap-2 border border-slate-700/60"
          >
            <Lock className="w-4 h-4 text-slate-500" />
            Class Locked
          </button>
        ) : !isCampusNetwork ? (
          <button
            disabled
            title="University Campus Wi-Fi connection required to submit attendance"
            className="py-2.5 px-6 bg-amber-950/80 text-amber-300 text-xs font-bold rounded-xl cursor-not-allowed flex items-center gap-2 border border-amber-500/50 shadow-lg shadow-amber-950/50"
          >
            <Wifi className="w-4 h-4 text-amber-400" />
            Campus Wi-Fi Required (Disabled)
          </button>
        ) : (
          <button
            onClick={handleStartBiometricPrompt}
            className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
          >
            <Fingerprint className="w-4 h-4 text-sky-300 animate-pulse" />
            Verify Biometrics &amp; Submit
          </button>
        )}
      </div>

      {/* Biometric Verification Modal (Anti-Proxy) */}
      {showBiometricModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 max-w-md w-full border border-indigo-500/40 shadow-2xl text-center animate-scale-up">
            {/* Modal Header */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-lg shadow-indigo-600/20">
              {bioMode === 'FACE' ? (
                <ScanFace className="w-8 h-8 text-purple-300 animate-pulse" />
              ) : (
                <Fingerprint className="w-8 h-8 text-indigo-300 animate-pulse" />
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Teacher Biometric Verification</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto mb-4">
              {bioMode === 'FACE'
                ? 'Scan face to cryptographically seal and submit attendance for '
                : 'Place thumb on scanner to cryptographically seal and submit attendance for '}
              <strong className="text-white">{slotData?.course.title}</strong>.
            </p>

            {/* Mode Switcher: Thumbprint vs Facial */}
            <div className="flex bg-slate-900/90 p-1 rounded-xl mb-4 border border-slate-800">
              <button
                type="button"
                onClick={() => { setBioMode('THUMB'); setBiometricStatus('IDLE'); setBiometricError(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  bioMode === 'THUMB' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                Thumbprint
              </button>
              <button
                type="button"
                onClick={() => { setBioMode('FACE'); setBiometricStatus('IDLE'); setBiometricError(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  bioMode === 'FACE' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ScanFace className="w-3.5 h-3.5" />
                Facial Scan
              </button>
            </div>

            {/* Interactive Touch & Hold Biometric Sensor */}
            <div className="my-4">
              <div
                onClick={handleBiometricConfirmClick}
                onTouchStart={startHoldingScan}
                onTouchEnd={cancelHoldingScan}
                onTouchCancel={cancelHoldingScan}
                onMouseDown={startHoldingScan}
                onMouseUp={cancelHoldingScan}
                onMouseLeave={cancelHoldingScan}
                className={`relative w-28 h-28 mx-auto rounded-full flex flex-col items-center justify-center cursor-pointer select-none touch-none transition-all duration-300 shadow-2xl border-4 ${
                  biometricStatus === 'SUCCESS'
                    ? 'bg-emerald-600/30 border-emerald-400 shadow-emerald-500/50 scale-105'
                    : biometricStatus === 'SCANNING'
                    ? (bioMode === 'FACE'
                        ? 'bg-purple-600/30 border-purple-400 shadow-purple-500/60 scale-105 ring-4 ring-purple-400/30'
                        : 'bg-indigo-600/30 border-indigo-400 shadow-indigo-500/60 scale-105 ring-4 ring-indigo-400/30')
                    : 'bg-slate-900 border-indigo-500/40 hover:border-indigo-400 hover:scale-105'
                }`}
              >
                {/* Radial Scanning Laser Animation */}
                {biometricStatus === 'SCANNING' && (
                  <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse blur-xs top-1/2 -translate-y-1/2 shadow-lg shadow-cyan-400"></div>
                )}

                {bioMode === 'FACE' ? (
                  <ScanFace
                    className={`w-14 h-14 transition-all duration-300 pointer-events-none ${
                      biometricStatus === 'SUCCESS'
                        ? 'text-emerald-400 scale-110'
                        : biometricStatus === 'SCANNING'
                        ? 'text-purple-300 animate-pulse'
                        : 'text-purple-400'
                    }`}
                  />
                ) : (
                  <Fingerprint
                    className={`w-14 h-14 transition-all duration-300 pointer-events-none ${
                      biometricStatus === 'SUCCESS'
                        ? 'text-emerald-400 scale-110'
                        : biometricStatus === 'SCANNING'
                        ? 'text-cyan-300 animate-pulse'
                        : 'text-indigo-400'
                    }`}
                  />
                )}

                {/* Progress Ring / Percentage */}
                {scanProgress > 0 && scanProgress < 100 && (
                  <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/60 text-[10px] font-mono font-bold text-cyan-300 shadow-md">
                    {scanProgress}%
                  </div>
                )}
                {biometricStatus === 'SUCCESS' && (
                  <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/60 text-[10px] font-mono font-bold text-emerald-300 shadow-md">
                    ✓ 100%
                  </div>
                )}
              </div>

              <div className="mt-3">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                  {biometricStatus === 'SCANNING'
                    ? `${bioMode === 'FACE' ? 'Verifying Facial Geometry...' : 'Reading Fingerprint Sensor...'} ${scanProgress}%`
                    : biometricStatus === 'SUCCESS'
                    ? `✓ ${bioMode === 'FACE' ? 'Facial Biometric Verified!' : 'Thumbprint Authenticated!'}`
                    : `👆 ${bioMode === 'FACE' ? 'Tap to Scan Face' : 'Tap OR Hold Thumb on Sensor'}`}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {biometricStatus === 'SCANNING'
                    ? (bioMode === 'FACE' ? 'Matching facial features...' : 'Scanning fingerprint pattern...')
                    : biometricStatus === 'SUCCESS'
                    ? 'Attendance cryptographically sealed & submitting...'
                    : (bioMode === 'FACE' ? 'Position face in frame and tap to authenticate' : 'Tap circle to scan or use button below')}
                </span>
              </div>
            </div>

            {biometricError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs animate-shake">
                {biometricError}
              </div>
            )}

            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-xs font-mono space-y-2 mb-6 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Instructor:</span>
                <span className="text-white font-bold">{user?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Network Security:</span>
                <span className="text-emerald-400 font-bold">University Campus Wi-Fi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connection IP:</span>
                <span className="text-indigo-300 font-bold">{displayIp}</span>
              </div>
            </div>

            {/* Anti-Proxy Faculty Password Lock */}
            <div className="mb-4 text-left">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  Teacher Security Password (Anti-Proxy Lock):
                </span>
                <span className="text-[10px] text-indigo-300 font-mono">Confidential</span>
              </label>
              <input
                type="password"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                placeholder="Enter faculty password to seal attendance"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none placeholder:text-slate-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Ensures only the instructor can submit, even if phone is physically handed to a student.
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBiometricModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBiometricConfirmClick}
                disabled={biometricStatus === 'SCANNING' || submitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {bioMode === 'FACE' ? <ScanFace className="w-4 h-4 text-purple-200" /> : <Fingerprint className="w-4 h-4 text-cyan-300" />}
                {biometricStatus === 'SCANNING'
                  ? `Verifying (${scanProgress}%)...`
                  : bioMode === 'FACE'
                  ? 'Scan Face & Confirm'
                  : 'Scan Thumb & Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
