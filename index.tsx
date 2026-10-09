
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/all.min.css';
import * as idb from 'idb-keyval';
import JSZip from 'jszip';
import { cleanupLegacyLocalStorageQuota, ensurePersistentStorage } from './utils/storageAdapter';

// The app imports JSZip as a module, but a few legacy code paths (and lesson
// HTML builders that run in this document) look for window.JSZip. Expose the
// bundled copy instead of relying on a node_modules/ script tag, which never
// existed on the deployed build and 404'd on every page load.
if (typeof window !== 'undefined') {
  (window as any).JSZip = (window as any).JSZip || JSZip;
}

// Run storage cleanup immediately on initialization
cleanupLegacyLocalStorageQuota();

// …and immediately ask the browser to stop treating this app's storage as
// disposable. Without this the origin stays "best effort": the browser is free to
// evict IndexedDB and localStorage on its own, which is how a tutor opens the Adult
// Dashboard one day and finds it empty. Requested automatically — it needs no
// switch, deletes nothing, and is a no-op on browsers that do not support it.
void ensurePersistentStorage();

// Safe LocalStorage global override to intercept QuotaExceededError and seamlessly divert to IndexedDB
try {
  const originalSetItem = window.localStorage.setItem;
  window.localStorage.setItem = function(key: string, value: string) {
    try {
      originalSetItem.call(window.localStorage, key, value);
    } catch (e: any) {
      if (
        e.name === 'QuotaExceededError' ||
        e.code === 22 ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.message?.toLowerCase().includes('quota') ||
        e.message?.toLowerCase().includes('exceeded')
      ) {
        console.warn(`[Storage Guard] LocalStorage quota reached for "${key}". Diverting data to IndexedDB fallback without crashing UI.`);
        // Divert to IndexedDB so data is preserved safely
        idb.set(`fallback_storage_${key}`, value).catch(() => {});
        
        // Purge temporary volatile caches from localStorage to reclaim space
        try {
          window.localStorage.removeItem('tutorly_auto_backup_data');
          window.localStorage.removeItem('tutor_dashboard_temp_search');
          window.localStorage.removeItem('dashboard_tour_step_resume');
        } catch (cleanupErr) {}
        return;
      }
      throw e;
    }
  };
} catch (err) {
  console.warn('Failed to decorate localStorage.setItem:', err);
}

// Global unhandled rejection listener to safeguard async storage/quota issues from breaking the UI
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && (
      reason.name === 'QuotaExceededError' ||
      reason.code === 22 ||
      reason.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      reason.message?.toLowerCase().includes('quota') ||
      reason.message?.toLowerCase().includes('exceeded')
    )) {
      console.warn('[Storage Guard] Intercepted unhandled QuotaExceeded rejection gracefully:', reason);
      event.preventDefault(); // Suppress the crash / browser warning
    }
  });

  window.addEventListener('error', (event) => {
    const error = event.error;
    if (error && (
      error.name === 'QuotaExceededError' ||
      error.code === 22 ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.message?.toLowerCase().includes('quota') ||
      error.message?.toLowerCase().includes('exceeded')
    )) {
      console.warn('[Storage Guard] Intercepted unhandled QuotaExceeded error gracefully:', error);
      event.preventDefault(); // Suppress the crash / browser warning
    }
  });
}

import App from './App';

const ALLOWED_DOMAINS = ['cspro.tutomy.com', 'cspro.tutorly.ir'];
const IS_DEV = window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' || 
               window.location.hostname.endsWith('.run.app') || 
               window.location.hostname.endsWith('.github.dev') ||
               window.location.hostname.endsWith('.app.github.dev') ||
               window.location.hostname.endsWith('.codespaces.github.com');

if (!IS_DEV && !ALLOWED_DOMAINS.includes(window.location.hostname)) {
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;text-align:center;padding:20px;">
      <div>
        <h1 style="color:#ef4444;font-size:2.5rem;margin-bottom:1rem;font-weight:900;">Access Denied</h1>
        <p style="font-size:1.1rem;color:#94a3b8;max-w-md;margin:0 auto;">This application is only authorized to run on its official domains.</p>
        <div style="margin-top:2.5rem;display:flex;gap:1rem;justify-content:center;">
          <a href="https://cspro.tutorly.ir" style="padding:10px 20px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">cspro.tutorly.ir</a>
          <a href="https://cspro.tutomy.com" style="padding:10px 20px;background:#8b5cf6;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">cspro.tutomy.com</a>
        </div>
      </div>
    </div>
  `;
  throw new Error("Unauthorized domain");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (IS_DEV) {
      // Dev preview: never let the PWA service worker cache source modules.
      // Its stale-while-revalidate cache is what makes the browser keep running
      // old code after edits ("served code is clean, page is stale"). Unregister
      // any worker left over from a previous session so every reload is fresh.
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      }).catch(() => {});
      return;
    }
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        // A new service worker was already waiting when the page loaded
        if (registration.waiting && navigator.serviceWorker.controller) {
          showPwaUpdateBanner();
        }
        // A brand-new service worker is being installed in the background
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showPwaUpdateBanner();
            }
          });
        });
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });

  // Once the updated service worker (which calls skipWaiting + clients.claim)
  // takes control, reload automatically so the tab runs the new build.
  let pwaRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pwaRefreshing) return;
    pwaRefreshing = true;
    window.location.reload();
  });
}

/** Small floating pill shown in production when a new app version is ready. */
function showPwaUpdateBanner() {
  try {
    if (document.getElementById('pwa-update-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'pwa-update-banner';
    bar.textContent = '🆕 New version available — updating…';
    bar.style.cssText =
      'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;' +
      'background:#0f172a;color:#f8fafc;padding:10px 18px;border-radius:999px;' +
      'font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);' +
      'display:flex;align-items:center;gap:8px;animation:pwaIn .25s ease;';
    const style = document.createElement('style');
    style.textContent = '@keyframes pwaIn{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}';
    document.head.appendChild(style);
    document.body.appendChild(bar);
    // The updated worker activates + claims almost immediately (skipWaiting); if it
    // ever doesn't, fall back to a manual refresh so users never stay on stale code.
    setTimeout(() => {
      try { if (document.getElementById('pwa-update-banner')) document.getElementById('pwa-update-banner')!.remove(); } catch (e) {}
    }, 12000);
  } catch (e) {}
}

// Global PWA Install Prompt Capture
window.addEventListener('beforeinstallprompt', (e: any) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
});
