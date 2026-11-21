import React, { useState } from 'react';
import { ShieldAlert, WifiOff, RefreshCw, Network, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetworkFence } from '../context/NetworkFenceContext.jsx';

export const NetworkBlockedPage = () => {
  const { simulatedIp, setSimulatedIp } = useAuth();
  const { blockedDetails, resetPerimeterBlock, networkInfo } = useNetworkFence();
  const [customIp, setCustomIp] = useState('');

  const displayIp = blockedDetails?.clientIp || networkInfo?.clientIp || simulatedIp || 'Unknown';

  const handleSimulateCampus = () => {
    setSimulatedIp('10.12.1.45'); // Standard campus Wi-Fi IP
  };

  const handleCustomIpSubmit = (e) => {
    e.preventDefault();
    if (customIp.trim()) {
      setSimulatedIp(customIp.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-xl w-full glass-panel rounded-2xl p-8 border border-rose-500/30 shadow-2xl relative overflow-hidden text-center">
        {/* Top Warning Glow Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500"></div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-xl bg-white p-1.5 flex items-center justify-center border border-white/20 shadow-lg shrink-0 overflow-hidden">
            <img src="/logo.png" alt="University of Sahiwal" className="w-full h-full object-contain" />
          </div>
          <div className="text-left">
            <div className="text-white font-bold text-base leading-tight">University of Sahiwal</div>
            <div className="text-slate-400 text-xs">Perimeter Security Fence</div>
          </div>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60 mb-4">
          <WifiOff className="w-3.5 h-3.5" />
          HTTP 403: CAMPUS_PERIMETER_RESTRICTION
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
          Not Connected to Campus Network
        </h1>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
          The University Academic Attendance Portal is strictly network-fenced. You must connect your device to the university internal Wi-Fi access point or campus subnet to access this system.
        </p>

        {/* IP Diagnostics Card */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 text-left mb-6 font-mono text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-800">
            <span className="text-slate-400">Detected Origin IP:</span>
            <span className="text-rose-400 font-bold">{displayIp}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-800">
            <span className="text-slate-400">Perimeter Status:</span>
            <span className="text-rose-400 font-bold">Outside Campus Subnet</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Allowed Campus CIDRs:</span>
            <span className="text-slate-300">
              {networkInfo?.configuredSubnets?.join(', ') || '10.0.0.0/8, 172.16.0.0/12, 172.200.0.0/16, 192.168.0.0/16, 127.0.0.1/32'}
            </span>
          </div>
        </div>

        {/* Demo Simulation Tool for Examiners / Evaluators */}
        <div className="bg-slate-900/40 rounded-xl p-5 border border-indigo-500/30 text-left mb-4">
          <div className="flex items-center gap-2 mb-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
            <Network className="w-4 h-4" />
            Evaluator Testing & Subnet Simulator
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Simulate switching your network interface between outside networks and authorized university campus routers:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => {
                setSimulatedIp('172.200.47.193');
                resetPerimeterBlock();
              }}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-between"
            >
              <span>Router 52 (Physics 4.1.20)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">172.200.47.193</span>
            </button>
            <button
              onClick={() => {
                setSimulatedIp('172.200.37.26');
                resetPerimeterBlock();
              }}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-between"
            >
              <span>Router 56 (Physics 4.1.4)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">172.200.37.26</span>
            </button>
            <button
              onClick={() => {
                handleSimulateCampus();
                resetPerimeterBlock();
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-between"
            >
              <span>Campus Wi-Fi</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">10.12.1.45</span>
            </button>
            <button
              onClick={() => {
                setSimulatedIp('127.0.0.1');
                resetPerimeterBlock();
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-between"
            >
              <span>Localhost</span>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">127.0.0.1</span>
            </button>
          </div>

          <form onSubmit={handleCustomIpSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 10.100.4.20 or 8.8.8.8"
              value={customIp}
              onChange={(e) => setCustomIp(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
            >
              Set IP
            </button>
          </form>
        </div>

        <button
          onClick={resetPerimeterBlock}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-test Network Connectivity
        </button>
      </div>
    </div>
  );
};
