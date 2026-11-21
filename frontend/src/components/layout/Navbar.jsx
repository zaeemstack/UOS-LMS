import React, { useState } from 'react';
import { ShieldCheck, Wifi, WifiOff, LogOut, User, ChevronDown, Network } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNetworkFence } from '../../context/NetworkFenceContext.jsx';

export const Navbar = () => {
  const { user, logout, simulatedIp, setSimulatedIp } = useAuth();
  const { networkInfo, heartbeatActive } = useNetworkFence();
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);

  const displayIp = simulatedIp || networkInfo?.clientIp || '127.0.0.1';
  const isAllowed = networkInfo?.isAllowed ?? true;
  const isSimulatorEnabled = import.meta.env.DEV || user?.role === 'ADMIN';

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Brand & Perimeter Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 shadow-md shadow-blue-500/10 shrink-0 overflow-hidden">
            <img src="/logo.png" alt="University of Sahiwal Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base sm:text-lg">
                University of Sahiwal
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Perimeter Guard
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Academic Attendance Management Portal
            </p>
          </div>
        </div>
      </div>

      {/* Center/Right Status Badges & User Controls */}
      <div className="flex items-center gap-3">
        {/* Network Subnet Status Widget */}
        <div className="relative">
          <button
            onClick={() => isSimulatorEnabled && setShowNetworkMenu(!showNetworkMenu)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
              isSimulatorEnabled ? 'cursor-pointer' : 'cursor-default'
            } ${
              isAllowed
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/40'
            }`}
          >
            {isAllowed ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="hidden sm:inline">
              {isAllowed ? 'Campus Wi-Fi' : 'Outside Perimeter'}
            </span>
            <span className="font-mono text-[11px] opacity-80">({displayIp})</span>
            {isSimulatorEnabled && <ChevronDown className="w-3 h-3 opacity-60" />}
          </button>

          {/* Network Simulator Dropdown (Only in Dev or for Admin) */}
          {isSimulatorEnabled && showNetworkMenu && (
            <div className="absolute right-0 mt-2 w-72 glass-panel-glow rounded-xl p-3 shadow-2xl z-50 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-2 pb-2 border-b border-slate-800">
                <Network className="w-3.5 h-3.5 text-blue-400" />
                Network Perimeter Simulator
              </div>
              <p className="text-slate-400 text-[11px] mb-3">
                Select a network state to test the campus fence gatekeeper and auto-logout:
              </p>
              <div className="space-y-1.5 mb-3">
                <button
                  onClick={() => {
                    setSimulatedIp('172.200.47.193');
                    setShowNetworkMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md transition flex items-center justify-between ${
                    displayIp === '172.200.47.193' ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <div>
                    <span className="font-semibold">Router 52</span>
                    <span className="text-[10px] text-slate-400 block font-mono">172.200.47.193 (Rooms 4.1.20, 21)</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold uppercase">Physics AP 1</span>
                </button>
                <button
                  onClick={() => {
                    setSimulatedIp('172.200.37.26');
                    setShowNetworkMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md transition flex items-center justify-between ${
                    displayIp === '172.200.37.26' ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <div>
                    <span className="font-semibold">Router 56</span>
                    <span className="text-[10px] text-slate-400 block font-mono">172.200.37.26 (Room 4.1.4)</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold uppercase">Physics AP 2</span>
                </button>
                <button
                  onClick={() => {
                    setSimulatedIp('10.12.1.45');
                    setShowNetworkMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md transition flex items-center justify-between ${
                    displayIp === '10.12.1.45' ? 'bg-emerald-600 text-white' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span>General Campus Wi-Fi (10.12.1.45)</span>
                  <span className="text-[10px] text-emerald-300 font-bold uppercase">Allowed</span>
                </button>
                <button
                  onClick={() => {
                    setSimulatedIp('8.8.8.8');
                    setShowNetworkMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md transition flex items-center justify-between ${
                    displayIp === '8.8.8.8' ? 'bg-rose-600 text-white' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span>Public / Home (8.8.8.8)</span>
                  <span className="text-[10px] text-rose-300 font-bold uppercase">Blocked 403</span>
                </button>
              </div>
              <button
                onClick={() => {
                  setSimulatedIp('');
                  setShowNetworkMenu(false);
                }}
                className="w-full text-center py-1 text-[11px] text-slate-400 hover:text-white"
              >
                Reset to Real IP
              </button>
            </div>
          )}
        </div>

        {/* User profile & logout */}
        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{user.fullName}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{user.role}</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
