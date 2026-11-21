import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  BookOpen,
} from 'lucide-react';
import api from '../../api/client.js';

export const AttendanceReportModal = ({ isOpen, onClose, defaultDepartmentId = null }) => {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(defaultDepartmentId || '');
  const [dateRange, setDateRange] = useState('30'); // '7' | '30' | '90' | 'all'
  const [reportData, setReportData] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchReport();
    }
  }, [isOpen, selectedDept, dateRange]);

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

  const fetchReport = async () => {
    try {
      setLoading(true);
      let startDate = '';
      const now = new Date();

      if (dateRange === '7') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().slice(0, 10);
      } else if (dateRange === '30') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().slice(0, 10);
      } else if (dateRange === '90') {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        startDate = d.toISOString().slice(0, 10);
      }

      const params = {};
      if (selectedDept) params.departmentId = selectedDept;
      if (startDate) {
        params.startDate = startDate;
        params.endDate = now.toISOString().slice(0, 10);
      }

      const res = await api.get('/reports/summary', { params });
      if (res.data.success) {
        setReportData(res.data.report || []);
      }
    } catch (err) {
      console.error('Failed to fetch attendance report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    let url = '/api/reports/export/csv';
    const params = new URLSearchParams();
    if (selectedDept) params.append('departmentId', selectedDept);

    if (dateRange !== 'all') {
      const now = new Date();
      const d = new Date();
      d.setDate(d.getDate() - parseInt(dateRange));
      params.append('startDate', d.toISOString().slice(0, 10));
      params.append('endDate', now.toISOString().slice(0, 10));
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Trigger download with auth token in URL or client
    api.get(url, { responseType: 'blob' })
      .then((res) => {
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `UOS_Academic_Attendance_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.error('Failed to download CSV:', err);
      });
  };

  if (!isOpen) return null;

  const filteredSlots = reportData.filter((r) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.courseCode?.toLowerCase().includes(q) ||
      r.courseTitle?.toLowerCase().includes(q) ||
      r.sectionName?.toLowerCase().includes(q) ||
      r.teacherName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 overflow-hidden">
              <img src="/logo.png" alt="University of Sahiwal" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">University of Sahiwal — Attendance Audit & Reports</h2>
              <p className="text-xs text-slate-400">Official student eligibility, lecture conduction counts, and 75% rule compliance</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              Download Excel / CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {departments.length > 0 && !defaultDepartmentId && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold">Department:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Departments (Campus-wide)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Timeline:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days (Current Month)</option>
                <option value="90">Last 90 Days (Full Semester)</option>
                <option value="all">All Records</option>
              </select>
            </div>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search course, section, or teacher..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3"></div>
              Compiling academic audit records...
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              No attendance records found for the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Course</th>
                      <th className="p-3">Section</th>
                      <th className="p-3">Instructor</th>
                      <th className="p-3 text-center">Conducted</th>
                      <th className="p-3 text-center">Enrolled</th>
                      <th className="p-3 text-center">Avg Attendance</th>
                      <th className="p-3 text-center">Short (&lt;75%)</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredSlots.map((item) => (
                      <tr key={item.slotId} className="hover:bg-slate-800/30 transition">
                        <td className="p-3">
                          <div className="font-bold text-white">{item.courseCode}</div>
                          <div className="text-slate-400 text-[11px] truncate max-w-xs">{item.courseTitle}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {item.sectionName}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">Sem {item.semester}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-white">{item.teacherName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.teacherId}</div>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-200">
                          {item.totalLecturesConducted} classes
                        </td>
                        <td className="p-3 text-center font-medium">
                          {item.totalEnrolledStudents}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              item.averageAttendanceRate >= 80
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.averageAttendanceRate >= 70
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {item.averageAttendanceRate}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {item.shortAttendanceCount > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-bold text-[10px]">
                              {item.shortAttendanceCount} students
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedSlotDetails(item)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                          >
                            View Students
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Student Breakdown Sub-modal */}
        {selectedSlotDetails && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl animate-scale-up">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedSlotDetails.courseCode} — {selectedSlotDetails.sectionName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Instructor: {selectedSlotDetails.teacherName} • Total Conducted: {selectedSlotDetails.totalLecturesConducted} lectures
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSlotDetails(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 my-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Roll Number</th>
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5 text-center">Present</th>
                      <th className="p-2.5 text-center">Absent</th>
                      <th className="p-2.5 text-center">Late</th>
                      <th className="p-2.5 text-center">Attendance %</th>
                      <th className="p-2.5 text-right">Exam Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {selectedSlotDetails.students.map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-mono text-slate-400">{st.rollNumber}</td>
                        <td className="p-2.5 font-medium text-white">{st.fullName}</td>
                        <td className="p-2.5 text-center text-emerald-400 font-semibold">{st.presentCount}</td>
                        <td className="p-2.5 text-center text-rose-400 font-semibold">{st.absentCount}</td>
                        <td className="p-2.5 text-center text-amber-400">{st.lateCount}</td>
                        <td className="p-2.5 text-center font-bold text-sm">
                          <span
                            className={
                              st.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {st.percentage}%
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          {st.isShortAttendance ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              DETAINED (&lt;75%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ELIGIBLE
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setSelectedSlotDetails(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
