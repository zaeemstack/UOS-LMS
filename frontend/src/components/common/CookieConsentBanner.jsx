import React, { useState, useEffect } from 'react';
import { Shield, Cookie, X, Check } from 'lucide-react';

export const CookieConsentBanner = ({ onOpenPrivacy }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('uos_cookie_consent');
    if (!consent) {
      // Delay slightly for smooth entrance animation
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (type) => {
    localStorage.setItem('uos_cookie_consent', JSON.stringify({ type, date: new Date().toISOString() }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slideUp">
      <div className="glass-panel-glow bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white mb-1">
              Institutional Session & Cookie Notice
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              We use strictly essential cookies and local storage tokens to maintain your academic session, enforce
              network perimeter security, and support device passkey authentication.{' '}
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="text-blue-400 hover:text-blue-300 underline font-medium"
              >
                Privacy Policy
              </button>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAccept('ALL')}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Accept All
              </button>
              <button
                type="button"
                onClick={() => handleAccept('ESSENTIAL')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
              >
                Essential Only
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
            aria-label="Dismiss cookie notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
