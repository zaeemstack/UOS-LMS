/**
 * University of Sahiwal Academic Portal - Client-Side Analytics & Diagnostics
 * Privacy-friendly: Does not store invasive user telemetry or third-party trackers.
 */

const GA_ID = import.meta.env.VITE_GA_ID || null;

export const initAnalytics = () => {
  if (GA_ID && typeof window !== 'undefined') {
    // Inject Google Analytics script safely if configured
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, {
      anonymize_ip: true,
      page_title: document.title,
    });
    console.log('[Analytics] Institutional Google Analytics initialized:', GA_ID);
  } else {
    // Development / Privacy-first local logger
    if (import.meta.env.DEV) {
      console.log('[Analytics] Academic Telemetry running in local privacy-first mode.');
    }
  }
};

export const trackEvent = (eventName, params = {}) => {
  if (typeof window !== 'undefined' && window.gtag && GA_ID) {
    window.gtag('event', eventName, params);
  }
  if (import.meta.env.DEV) {
    console.debug(`[Telemetry Event] ${eventName}:`, params);
  }
};

export const trackPageView = (pagePath, pageTitle) => {
  if (typeof window !== 'undefined' && window.gtag && GA_ID) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
  }
};
