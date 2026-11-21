import React from 'react';
import { X, ShieldCheck, FileText, Lock, Building2, CheckCircle2 } from 'lucide-react';

export const LegalModal = ({ isOpen, onClose, initialTab = 'privacy' }) => {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              {activeTab === 'privacy' ? <Lock className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {activeTab === 'privacy' ? 'University Privacy Policy' : 'Terms & Academic Conditions'}
              </h2>
              <p className="text-xs text-slate-400">University of Sahiwal • Academic Attendance Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'privacy'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Privacy & Biometric Governance
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'terms'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Terms of Authorized Academic Use
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed font-normal">
          {activeTab === 'privacy' ? (
            <>
              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  1. Institutional Data Controller
                </h3>
                <p>
                  This portal is owned, maintained, and operated strictly by the{' '}
                  <strong className="text-white">University of Sahiwal</strong>. Student and faculty attendance records,
                  institutional IDs, and departmental rosters are processed solely for academic record keeping,
                  HEC statutory audits, and semester examination eligibility calculations.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  2. Biometric Privacy & Hardware-Bound WebAuthn
                </h3>
                <p>
                  Teacher biometric verification utilizes the W3C WebAuthn biometric passkey standard.
                  <strong className="text-white">
                    {' '}No raw biometric data, fingerprint images, or facial geometry are ever transmitted to or stored on University servers.
                  </strong>{' '}
                  Biometric matching takes place on-device via secure cryptographic enclave hardware, and only digital cryptographic signatures are validated.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  3. Network Perimeter Fence Telemetry
                </h3>
                <p>
                  To verify that attendance is conducted physically within designated classrooms, the system logs the
                  client IP address, gateway router BSSID, and network timestamp. No personal device browsing history or outside
                  traffic is ever monitored or stored.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  4. Data Retention & Academic Rights
                </h3>
                <p>
                  Attendance logs are archived per University of Sahiwal Academic Regulations for the degree duration.
                  Students and faculty may review their attendance history and petition discrepancies through formal HOD override requests.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  1. Authorized Academic Personnel Only
                </h3>
                <p>
                  Access to this portal is restricted to active students, recognized teaching faculty, Head of Departments (HOD),
                  and authorized system administrators of the University of Sahiwal. Unauthorized access attempts are logged and subject to disciplinary action.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  2. Zero-Tolerance Anti-Proxy Policy
                </h3>
                <p>
                  Marking attendance on behalf of another individual, sharing authentication tokens, or attempting to spoof
                  Wi-Fi BSSID/IP coordinates constitutes academic malpractice under the University of Sahiwal Student Disciplinary Regulations (2023).
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  3. Automated Session Locking & Auditability
                </h3>
                <p>
                  Timetable slots unlock automatically when classroom router proximity is established and lock after lecture conclusion.
                  Any modification outside this window requires institutional HOD override approval accompanied by a justified audit reason.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  4. Service Availability & Campus Perimeter
                </h3>
                <p>
                  The system enforces strict geofencing. Access from outside campus subnets is routed to the Network Blocked portal
                  unless verified via administrative bypass or official academic VPN credentials.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Effective: Fall Semester 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition"
          >
            I Understand & Close
          </button>
        </div>
      </div>
    </div>
  );
};
