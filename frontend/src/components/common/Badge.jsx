import React from 'react';

export const StatusBadge = ({ status }) => {
  switch (status) {
    case 'ACTIVE_OPEN':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Window Active (Open)
        </span>
      );
    case 'UNLOCKED_OVERRIDE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Admin Override (Unlocked)
        </span>
      );
    case 'LOCKED_LATE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          Locked (Late Entry &gt;15m)
        </span>
      );
    case 'LOCKED_EXPIRED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          Locked (Period Expired)
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          Attendance Submitted
        </span>
      );
    case 'UPCOMING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          Upcoming Slot
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
          {status}
        </span>
      );
  }
};
