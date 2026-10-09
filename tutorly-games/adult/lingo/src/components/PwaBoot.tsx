"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Offline support and installation for Lingo.
 *
 * `PwaBoot` lives in the root layout: it registers the service worker and shows a
 * slim banner while the device is offline. `PwaInstallCard` is the sidebar section
 * that installs the app in one tap (it hands the click straight to the browser's own
 * install prompt), and `PwaSettingsCard` is the Profile panel with the full status.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SW_URL = `${BASE_PATH}/sw.js`;

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
};

/** Set once per session, so a service-worker update reloads the page at most once. */
const RELOAD_FLAG = "tutolingo-sw-reloaded";

/* ------------------------------ install prompt ----------------------------- */
/**
 * One captured `beforeinstallprompt` event for the whole app.
 *
 * The event can only be used once, so it is kept outside React in a tiny store: the
 * sidebar card, the Profile card and any ribbon all read the same deferred prompt
 * instead of each holding their own copy (the second `prompt()` of a consumed event
 * throws `InvalidStateError`).
 */
let deferredPrompt: InstallPrompt | null = null;
const promptSubscribers = new Set<() => void>();

function notifyPrompt() {
  promptSubscribers.forEach((fn) => fn());
}

function subscribePrompt(onChange: () => void) {
  promptSubscribers.add(onChange);
  return () => {
    promptSubscribers.delete(onChange);
  };
}

const getPrompt = () => deferredPrompt;
const serverPrompt = () => null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the browser's own mini-infobar away; the app shows its own install button.
    event.preventDefault();
    deferredPrompt = event as InstallPrompt;
    notifyPrompt();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyPrompt();
  });
}

/* ------------------------------- environment ------------------------------- */

/**
 * Connection state as an external store: no setState-inside-an-effect, and the
 * server snapshot is "online" so the static export hydrates without a mismatch.
 */
const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/** Installed-app state (display-mode / legacy iOS flag / appinstalled event). */
const subscribeInstalled = (onChange: () => void) => {
  const mq = window.matchMedia("(display-mode: standalone)");
  window.addEventListener("appinstalled", onChange);
  mq.addEventListener?.("change", onChange);
  return () => {
    window.removeEventListener("appinstalled", onChange);
    mq.removeEventListener?.("change", onChange);
  };
};

const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Service-worker support never changes during a page's life, so nothing to subscribe to. */
const noopSubscribe = () => () => {};

/**
 * Register the worker exactly once, however many components ask for it.
 *
 * The install card, the offline ribbon and the Profile panel all need the worker,
 * and previously each of them registered it and attached its own
 * `controllerchange` listener — three registrations and three reload attempts for
 * one update. The promise (and the listener) are therefore created once per page.
 */
let swRegistration: Promise<boolean> | null = null;

function ensureServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(false);
  if (swRegistration) return swRegistration;

  swRegistration = (async () => {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // A fresh worker took over (content update) — reload once so the page and its
      // chunks match the worker that is now serving them.
      if (!hadController) return;
      try {
        if (sessionStorage.getItem(RELOAD_FLAG)) return;
        sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        /* storage can be unavailable in private modes */
      }
      window.location.reload();
    });
    try {
      await navigator.serviceWorker.register(SW_URL, { scope: BASE_PATH + "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      return true;
    } catch {
      return false;
    }
  })();

  return swRegistration;
}

export type Platform = "windows" | "macos" | "android" | "ios" | "other";

/** Which device the learner is on right now — decides the label and the steps. */
function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const touchPoints = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0;
  // iPadOS reports itself as a Mac, so the touch count is what gives it away.
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  return "other";
}

const getPlatform = (): Platform => detectPlatform();
const serverPlatform = (): Platform => "other";

/** The exact taps that install Lingo on each platform. */
export const INSTALL_STEPS: Record<Platform, { label: string; icon: string; steps: string[] }> = {
  windows: {
    label: "Windows",
    icon: "🪟",
    steps: [
      "In Chrome or Edge, open the ⋮ / … menu at the top right.",
      "Choose “Install Lingo”, or “Apps → Install this site as an app”.",
      "Confirm — Lingo then opens in its own window from the Start menu.",
    ],
  },
  macos: {
    label: "Mac",
    icon: "🍎",
    steps: [
      "In Chrome, click the install icon in the address bar (a screen with an arrow).",
      "Or open ⋮ → “Cast, save and share” → Install page as app.",
      "In Safari, use File → “Add to Dock”.",
    ],
  },
  android: {
    label: "Android",
    icon: "🤖",
    steps: [
      "Open the Chrome menu (⋮).",
      "Tap “Install app” (or “Add to Home screen”).",
      "Confirm — the owl icon appears on your home screen.",
    ],
  },
  ios: {
    label: "iPhone / iPad",
    icon: "📱",
    steps: [
      "Open Lingo in Safari (Chrome for iOS cannot install apps).",
      "Tap the Share button (the square with an arrow).",
      "Choose “Add to Home Screen”, then tap Add.",
    ],
  },
  other: {
    label: "This device",
    icon: "💻",
    steps: [
      "Desktop Chrome / Edge: use the install icon in the address bar.",
      "Android Chrome: menu ⋮ → Install app.",
      "iPhone / iPad Safari: Share → Add to Home Screen.",
    ],
  },
};

export interface PwaState {
  online: boolean;
  /** The offline copy is ready. */
  ready: boolean;
  installed: boolean;
  supported: boolean;
  platform: Platform;
  /** The browser is offering a one-tap install right now. */
  canInstall: boolean;
  /** Hand the click to the browser's own install window. */
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

/**
 * Everything the UI needs to know about installing and running offline.
 * `beforeinstallprompt` only exists in Chromium, so iOS falls back to instructions.
 */
export function usePwaState(): PwaState {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const installed = useSyncExternalStore(subscribeInstalled, isInstalled, () => false);
  const platform = useSyncExternalStore(noopSubscribe, getPlatform, serverPlatform);
  const installEvent = useSyncExternalStore(subscribePrompt, getPrompt, serverPrompt);
  const [ready, setReady] = useState(false);
  const [swFailed, setSwFailed] = useState(false);
  const canRegister = useSyncExternalStore(
    noopSubscribe,
    () => "serviceWorker" in navigator,
    () => false,
  );
  const supported = canRegister && !swFailed;

  useEffect(() => {
    if (!canRegister) return;
    let cancelled = false;
    void ensureServiceWorker().then((ok) => {
      if (cancelled) return;
      if (ok) setReady(true);
      else setSwFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [canRegister]);

  /** Hand the click to the browser: it shows its own install window. */
  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const event = deferredPrompt;
    if (!event) return "unavailable";
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice?.outcome === "accepted") {
        deferredPrompt = null;
        notifyPrompt();
      }
      return choice?.outcome === "accepted" ? "accepted" : "dismissed";
    } catch {
      // A consumed or stale event throws — treat it as “ask again later”.
      deferredPrompt = null;
      notifyPrompt();
      return "unavailable";
    }
  }, []);

  return { online, ready, installed, supported, platform, canInstall: !!installEvent, install };
}

/** Slim status ribbon — only visible while the device is offline. */
export function PwaBoot() {
  const { online, ready } = usePwaState();
  if (online || !ready) return null;
  return (
    <div className="sticky top-0 z-50 bg-amber-100 px-3 py-1.5 text-center text-[11px] font-black text-amber-800">
      📴 Offline — your course is on this device. Lessons, XP and streaks keep working and are saved locally.
    </div>
  );
}

/* --------------------------- install (sidebar) ----------------------------- */

/**
 * The sidebar section that installs the app.
 *
 * The main button always does the useful thing for the current device: on Chromium
 * it hands the click to the browser's own install window (no instructions to
 * follow), and on iOS — where no browser can install programmatically — it reveals
 * the three taps Safari needs. The Windows / Android / iOS rows carry the steps for
 * the other devices the learner owns.
 */
export function PwaInstallCard() {
  const { installed, canInstall, install, platform } = usePwaState();
  const [open, setOpen] = useState<Platform | null>(null);
  const [outcome, setOutcome] = useState<"accepted" | "dismissed" | null>(null);

  const mine = INSTALL_STEPS[platform];

  async function start() {
    const result = await install();
    setOutcome(result === "unavailable" ? null : result);
    if (result === "unavailable") setOpen(platform);
  }

  if (installed) {
    return (
      <div className="mb-2 rounded-2xl border-2 border-green-200 bg-green-50 p-3">
        <p className="text-sm font-black text-green-700">✅ App installed</p>
        <p className="mt-0.5 text-[11px] font-bold text-green-600">
          You are running Lingo as an app — lessons work offline.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-2xl border-2 border-[#1CB0F6] bg-[#F2FAFF] p-3">
      <p className="text-sm font-black text-slate-800">📲 Install the app</p>
      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
        Full screen, on your home screen, works offline.
      </p>

      <button
        onClick={() => void start()}
        className="btn-3d mt-2 w-full rounded-xl border-[#1899D6] bg-[#1CB0F6] py-2 text-xs font-black text-white"
      >
        {canInstall ? `⬇️ Install on ${mine.label}` : platform === "ios" ? "📱 Add to Home Screen" : "⬇️ Install on this device"}
      </button>

      {outcome === "accepted" && (
        <p className="mt-1.5 text-[11px] font-black text-green-600">Installing — look for the owl in your apps 🎉</p>
      )}
      {outcome === "dismissed" && (
        <p className="mt-1.5 text-[11px] font-bold text-slate-500">No problem — you can install any time.</p>
      )}
      {/* Only while nothing has happened yet: after an install (or a dismissal) this
          line would contradict the message above it. */}
      {!canInstall && !outcome && platform !== "ios" && (
        <p className="mt-1.5 text-[11px] font-bold text-slate-400">
          Your browser did not offer a one-tap install here — use the steps below.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {(["windows", "android", "ios"] as Platform[]).map((p) => (
          <button
            key={p}
            onClick={() => setOpen(open === p ? null : p)}
            aria-expanded={open === p}
            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
              open === p ? "bg-[#1CB0F6] text-white" : p === platform ? "bg-white text-[#1899D6] shadow-sm" : "bg-slate-100 text-slate-500"
            }`}
          >
            {INSTALL_STEPS[p].icon} {INSTALL_STEPS[p].label}
          </button>
        ))}
      </div>

      {open && (
        <ol className="animate-pop-in mt-2 list-decimal space-y-1 rounded-xl bg-white p-2.5 pl-6 text-[11px] font-bold text-slate-600">
          {INSTALL_STEPS[open].steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* --------------------------- install (mobile) ------------------------------- */

/**
 * The install section as a phone-friendly bottom sheet.
 *
 * The mobile bottom bar has no room for the card itself, so its install button
 * opens this: same one-tap behaviour, same platform steps, dismissed by the ✕, by
tapping the dimmed backdrop, or with Escape.
 */
export function PwaInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Install Lingo">
      <button
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 h-full w-full cursor-default bg-black/40"
      />
      <div className="animate-pop-in absolute bottom-0 left-0 right-0 rounded-t-3xl border-t-2 border-slate-200 bg-white p-4 pb-[calc(1rem+var(--safe-bottom))]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-black text-slate-800">📲 Take Lingo with you</p>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-500">
            ✕
          </button>
        </div>
        <PwaInstallCard />
        <p className="mt-1 text-center text-[11px] font-bold text-slate-400">
          Installed as an app, your lessons, XP and streaks keep working offline.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- install (home) ------------------------------ */

/**
 * The mobile entry point on Home.
 *
 * Phone learners never open the sidebar, so the install section also appears as a
 * card at the top of Home. It is dismissible (and stays dismissed across reloads),
 * hides itself once the app is installed, and reuses the sidebar card so there is
 * one behaviour — one tap hands the click to the browser's own install window.
 */
const DISMISS_KEY = "tutolingo-install-card-dismissed";
const dismissSubscribers = new Set<() => void>();

function subscribeDismissed(onChange: () => void) {
  dismissSubscribers.add(onChange);
  // Another tab may dismiss it; keep every open tab in step.
  window.addEventListener("storage", onChange);
  return () => {
    dismissSubscribers.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false; // private mode without storage — the card just keeps its ✕
  }
};

/** Server snapshot: hidden, so hydration never flashes the card. */
const serverDismissed = () => true;

function dismissInstallCard() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* nothing to persist — the state below still hides it for this visit */
  }
  dismissSubscribers.forEach((fn) => fn());
}

export function PwaHomeInstallCard() {
  const { installed } = usePwaState();
  const dismissed = useSyncExternalStore(subscribeDismissed, getDismissed, serverDismissed);
  if (installed || dismissed) return null;
  return (
    <div className="relative mb-4 lg:hidden">
      <button
        onClick={dismissInstallCard}
        aria-label="Hide the install tip"
        className="absolute -right-1.5 -top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full border-2 border-slate-200 bg-white text-xs font-black text-slate-400 shadow-sm"
      >
        ✕
      </button>
      <PwaInstallCard />
    </div>
  );
}

/* ---------------------------- status (profile) ----------------------------- */

/** Profile panel: install the app and confirm what works offline. */
export function PwaSettingsCard() {
  const { online, ready, installed, supported, canInstall, install, platform } = usePwaState();
  const [busy, setBusy] = useState(false);

  const rows = [
    {
      icon: online ? "🌐" : "📴",
      label: "Connection",
      value: online ? "Online — new content loads as you use it" : "Offline — running from this device",
    },
    {
      icon: ready ? "✅" : "⏳",
      label: "Offline lessons",
      value: ready
        ? "Ready — every lesson, reference and practice page is stored on this device"
        : supported
          ? "Preparing the offline copy…"
          : "Not available in this browser",
    },
    {
      icon: installed ? "📲" : "⬇️",
      label: "Home screen app",
      value: installed
        ? "Installed — opens full screen"
        : canInstall
          ? "Ready to install"
          : `Use the steps in the sidebar, or the instructions for ${INSTALL_STEPS[platform].label} below`,
    },
  ];

  return (
    <div className="card-light mb-4 rounded-3xl border-2 border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-800">📲 Install &amp; offline</p>
          <p className="text-xs text-slate-500">Practise on the bus: the whole course is cached after the first visit.</p>
        </div>
        {(canInstall || installed) && (
          <button
            onClick={async () => {
              setBusy(true);
              await install();
              setBusy(false);
            }}
            disabled={!canInstall || installed || busy}
            className="btn-3d shrink-0 rounded-xl border-[#46A302] bg-[#58CC02] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            {installed ? "Installed ✓" : "Install app"}
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3 rounded-2xl border-2 border-slate-100 p-3">
            <span className="text-xl">{r.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-700">{r.label}</p>
              <p className="text-[11px] font-bold text-slate-400">{r.value}</p>
            </div>
          </div>
        ))}
      </div>

      {!canInstall && !installed && (
        <div className="mt-2 rounded-2xl bg-slate-50 p-3 text-[11px] font-bold text-slate-500">
          <p className="mb-1 text-slate-600">
            <b>Install on {INSTALL_STEPS[platform].label} {INSTALL_STEPS[platform].icon}</b>
          </p>
          <ol className="list-decimal space-y-0.5 pl-5">
            {INSTALL_STEPS[platform].steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
