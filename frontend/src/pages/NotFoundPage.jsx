import React from 'react';
import { Compass, ArrowLeft, Home, ShieldAlert } from 'lucide-react';

export const NotFoundPage = ({ onHome }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full glass-panel-glow border border-slate-800 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/10">
          <Compass className="w-10 h-10 animate-spin-slow" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold mb-3">
          ERROR 404 • PAGE NOT FOUND
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Resource Out of Bounds
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          The requested classroom, attendance session, or administrative endpoint does not exist or has been relocated within the University of Sahiwal academic perimeter.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onHome || (() => window.location.href = '/')}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Return to Academic Portal
          </button>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          University of Sahiwal • System Perimeter ID: UOS-PHY-2026
        </div>
      </div>
    </div>
  );
};
