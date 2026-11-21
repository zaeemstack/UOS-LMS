import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NetworkFenceProvider, useNetworkFence } from './context/NetworkFenceContext.jsx';
import { Navbar } from './components/layout/Navbar.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { TeacherDashboard } from './pages/TeacherDashboard.jsx';
import { MarkAttendancePage } from './pages/MarkAttendancePage.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { HodDashboard } from './pages/HodDashboard.jsx';
import { NetworkBlockedPage } from './pages/NetworkBlockedPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { CookieConsentBanner } from './components/common/CookieConsentBanner.jsx';
import { LegalModal } from './components/common/LegalModal.jsx';
import { initAnalytics } from './utils/analytics.js';

const MainApp = () => {
  const { user, loading } = useAuth();
  const { isPerimeterBlocked } = useNetworkFence();
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [legalModalTab, setLegalModalTab] = useState(null);

  useEffect(() => {
    initAnalytics();
  }, []);

  // 1. Custom 404 Page for unmatched URL paths
  const isInvalidPath = typeof window !== 'undefined' && 
    window.location.pathname !== '/' && 
    window.location.pathname !== '/index.html' &&
    !window.location.pathname.startsWith('/api');

  if (isInvalidPath) {
    return <NotFoundPage onHome={() => { window.location.href = '/'; }} />;
  }

  // 2. Initial Auth loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        Connecting to Academic Perimeter Portal...
      </div>
    );
  }

  // 4. User Login Screen
  if (!user) {
    return (
      <>
        <LoginPage />
        <CookieConsentBanner onOpenPrivacy={() => setLegalModalTab('privacy')} />
        <LegalModal
          isOpen={Boolean(legalModalTab)}
          onClose={() => setLegalModalTab(null)}
          initialTab={legalModalTab || 'privacy'}
        />
      </>
    );
  }

  // 5. Authenticated Teacher, HOD, and Admin Views
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {selectedSlotId ? (
          <MarkAttendancePage
            slotId={selectedSlotId}
            onBack={() => setSelectedSlotId(null)}
          />
        ) : user.role === 'ADMIN' ? (
          <AdminDashboard onSelectSlotForMarking={(slotId) => setSelectedSlotId(slotId)} />
        ) : user.role === 'HOD' ? (
          <HodDashboard onSelectSlotForMarking={(slotId) => setSelectedSlotId(slotId)} />
        ) : (
          <TeacherDashboard
            onSelectSlotForMarking={(slotId) => setSelectedSlotId(slotId)}
          />
        )}
      </main>

      <footer className="py-5 px-6 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div>
              <span className="font-semibold text-slate-300">University of Sahiwal</span> • Network-Fenced Academic Attendance Management System • v1.0.0
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
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
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Powered by</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 tracking-wide">
              Muhammad Zaeem and Muhammad Saif Ullah
            </span>
          </div>
        </div>
      </footer>

      {/* Institutional Cookie Consent Banner */}
      <CookieConsentBanner onOpenPrivacy={() => setLegalModalTab('privacy')} />

      {/* Global Legal Modal */}
      <LegalModal
        isOpen={Boolean(legalModalTab)}
        onClose={() => setLegalModalTab(null)}
        initialTab={legalModalTab || 'privacy'}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NetworkFenceProvider>
        <MainApp />
      </NetworkFenceProvider>
    </AuthProvider>
  );
}
