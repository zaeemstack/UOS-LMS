import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { LegalModal } from '../components/common/LegalModal.jsx';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [legalModalTab, setLegalModalTab] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Spam Protection: Honeypot check for bots
    if (honeypot) {
      console.warn('Bot submission blocked via honeypot.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your university email or roll/employee ID.');
      return;
    }
    if (!password) {
      setError('Please enter your portal password.');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel-glow rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle Decorative Gradient */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* University Header */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-2.5 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20 border border-slate-200/20 overflow-hidden">
            <img src="/logo.png" alt="University of Sahiwal Emblem" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">University of Sahiwal</h1>
          <p className="text-xs uppercase font-semibold tracking-wider text-blue-400 mt-1">
            Academic Attendance Management Portal
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mt-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Network-Fenced Campus Perimeter Active
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot anti-spam field */}
          <input
            type="text"
            name="_academic_hp_trap"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              University Email / Employee ID
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="zaeem@uosahiwal.edu.pk"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Primary Clear CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></span>
                Authenticating...
              </span>
            ) : (
              <>
                <span>Sign In to Academic Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Legal Links & Branding */}
        <div className="mt-5 text-center border-t border-slate-800/60 pt-4">
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 mb-2">
            <button
              type="button"
              onClick={() => setLegalModalTab('privacy')}
              className="hover:text-blue-400 underline transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLegalModalTab('terms')}
              className="hover:text-blue-400 underline transition cursor-pointer"
            >
              Terms & Conditions
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            © 2026 University of Sahiwal • All Rights Reserved
          </p>
          <p className="text-xs font-medium text-slate-300 mt-1">
            Powered by <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">Muhammad Zaeem and Muhammad Saif Ullah</span>
          </p>
        </div>
      </div>

      {/* Privacy Policy & Terms Modal */}
      <LegalModal
        isOpen={Boolean(legalModalTab)}
        onClose={() => setLegalModalTab(null)}
        initialTab={legalModalTab || 'privacy'}
      />
    </div>
  );
};

