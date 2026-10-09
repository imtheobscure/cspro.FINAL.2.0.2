import React, { useState, useEffect } from "react";
import { cn } from "../utils/cn";
import type {
  AppSettings,
  SpeakerConfig,
  AudioDevice,
  RecordingConfig,
} from "../types";
import type { VoiceInfo } from "../hooks/useSpeechSynthesis";
import { getSourceLangCode } from "../utils/languages";
import {
  X,
  Mic,
  Monitor,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sliders,
  Palette,
  Eye,
  Type,
  Wifi,
  Video,
  Languages,
  Volume2,
  Settings2,
  Subtitles,
  Timer,
  Wand2,
  FolderOpen,
} from "lucide-react";

interface SettingsPanelProps {
  settings: AppSettings;
  speakers: SpeakerConfig[];
  onSettingsChange: (s: AppSettings) => void;
  onSpeakerChange: (speakers: SpeakerConfig[]) => void;
  onClose: () => void;

  onTestSource: (
    role: "tutor" | "learner",
  ) => Promise<{ level: number; working: boolean } | null>;
  onAcquireMic: (
    role: "tutor" | "learner",
    deviceId: string | null,
  ) => Promise<void>;
  onAcquireSystem: (role: "tutor" | "learner") => Promise<void>;

  recordingConfig: RecordingConfig;
  onRecordingConfigChange: (r: RecordingConfig) => void;

  isDark: boolean;
  audioDevices: AudioDevice[];
  onRefreshDevices: () => void;

  activeRole: "tutor" | "learner";
  onSetActiveRole: (role: "tutor" | "learner") => void;
  sourceErrors: { tutor?: string; learner?: string };

  voices: VoiceInfo[];
  recognitionLanguages: { code: string; name: string }[];
  translationLanguages: { code: string; name: string }[];
  onVerifyResult?: (success: boolean) => void;

  // File backup (auto-save to local .txt)
  pickBackupDirectory?: () => Promise<{ ok: boolean; error?: string }>;
  clearBackup?: () => Promise<void>;
  isFileBackupReady?: boolean;
  backupDirName?: string;
}

type Tab =
  | "audio"
  | "language"
  | "subtitles"
  | "display"
  | "recording"
  | "automation"
  | "hotkeys"
  | "offline";

export const SettingsPanel: React.FC<SettingsPanelProps> = (props) => {
  const {
    settings,
    speakers,
    onSettingsChange,
    onSpeakerChange,
    onClose,
    onTestSource,
    onAcquireMic,
    onAcquireSystem,
    recordingConfig,
    onRecordingConfigChange,
    isDark,
    audioDevices,
    onRefreshDevices,
    activeRole,
    onSetActiveRole,
    sourceErrors,
    voices,
    recognitionLanguages,
    translationLanguages,
    pickBackupDirectory,
    clearBackup,
    isFileBackupReady,
    backupDirName,
  } = props;

  const [tab, setTab] = useState<Tab>("audio");
  const [testing, setTesting] = useState<{ tutor: boolean; learner: boolean }>({
    tutor: false,
    learner: false,
  });
  const [testResults, setTestResults] = useState<{
    tutor?: { level: number; working: boolean };
    learner?: { level: number; working: boolean };
  }>({});

  const tutor = speakers.find((s) => s.role === "tutor")!;
  const learner = speakers.find((s) => s.role === "learner")!;

  const upd = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    onSettingsChange({ ...settings, [key]: val });
  };

  const updSubtitle = <K extends keyof AppSettings["subtitle"]>(
    key: K,
    val: AppSettings["subtitle"][K],
  ) => {
    onSettingsChange({
      ...settings,
      subtitle: { ...settings.subtitle, [key]: val },
    });
  };

  const updAutomation = <K extends keyof AppSettings["automation"]>(
    key: K,
    val: AppSettings["automation"][K],
  ) => {
    onSettingsChange({
      ...settings,
      automation: { ...settings.automation, [key]: val },
    });
  };

  const updSpeaker = (
    role: "tutor" | "learner",
    changes: Partial<SpeakerConfig>,
  ) => {
    onSpeakerChange(
      speakers.map((s) => (s.role === role ? { ...s, ...changes } : s)),
    );
  };

  const handleTest = async (role: "tutor" | "learner") => {
    setTesting((t) => ({ ...t, [role]: true }));
    const result = await onTestSource(role);
    if (result) setTestResults((r) => ({ ...r, [role]: result }));
    setTesting((t) => ({ ...t, [role]: false }));
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).__deferredPWAPrompt);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsPwaInstalled(true);
      return;
    }
    // Listen for appinstalled event
    const installedHandler = () => { setIsPwaInstalled(true); };
    window.addEventListener("appinstalled", installedHandler);
    // Also listen for beforeinstallprompt (in case main.tsx missed it)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (window as any).__deferredPWAPrompt;
    if (isPwaInstalled) {
      setInstallStatus({ type: "ok", message: "App is already installed ✓" });
      setTimeout(() => setInstallStatus(null), 3000);
      return;
    }
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        (window as any).__deferredPWAPrompt = null;
        setIsPwaInstalled(true);
        setInstallStatus(null);
      } else {
        setInstallStatus({ type: "error", message: "Install cancelled. Click again to retry." });
        setTimeout(() => setInstallStatus(null), 3000);
      }
    } else {
      setInstallStatus({
        type: "error",
        message: "Browser install prompt not available. Open browser menu (⋮) → 'Install Tutorly Transcriber' or use the install icon in the address bar.",
      });
    }
  };

  const overlay = isDark
    ? "bg-slate-900 border-slate-700 text-white"
    : "bg-white border-slate-200 text-slate-900";
  const sectionCls = cn(
    "p-4 rounded-xl border",
    isDark
      ? "border-slate-700 bg-slate-800/50"
      : "border-slate-200 bg-slate-50",
  );
  const labelCls = cn(
    "text-xs font-semibold uppercase tracking-wider mb-1.5 block",
    isDark ? "text-slate-400" : "text-slate-500",
  );
  const inputCls = cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none",
    isDark
      ? "bg-slate-800 border-slate-600 text-white"
      : "bg-white border-slate-300 text-slate-900",
  );
  const selectCls = cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none appearance-none cursor-pointer",
    isDark
      ? "bg-slate-800 border-slate-600 text-white"
      : "bg-white border-slate-300 text-slate-900",
  );

  const tabBtn = (t: Tab, label: string, Icon: React.FC<{ size?: number }>) => (
    <button
      onClick={() => setTab(t)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
        tab === t
          ? "bg-indigo-600 text-white shadow"
          : isDark
            ? "text-slate-400 hover:text-white hover:bg-slate-800"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>("");
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [progressDetails, setProgressDetails] = useState<
    Record<
      string,
      { progress: number; loaded?: number; total?: number; status?: string }
    >
  >({} as Record<string, { progress: number; loaded?: number; total?: number; status?: string }>);
  const [modelsStatus, setModelsStatus] = useState<
    "checking" | "available" | "missing" | "error" | null
  >(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [offlineDir, setOfflineDir] = useState<any>(null);

  useEffect(() => {
    import("../utils/storage")
      .then((m) => m.loadOfflineModelsDir())
      .then((d) => {
        if (d) setOfflineDir(d);
      });
  }, []);

  useEffect(() => {
    if (tab === "offline") {
      checkModels();
    }
  }, [tab, offlineDir]);

  const checkModels = async () => {
    setModelsStatus("checking");
    setTestResult(null);
    try {
      let hasCache = false;
      if (offlineDir) {
        try {
          let perm = "granted";
          if (offlineDir.queryPermission) {
            perm = await offlineDir.queryPermission({ mode: "read" });
          }
          if (perm === "granted") {
            for await (const entry of offlineDir.values()) {
              if (entry.kind === "directory" || entry.kind === "file") {
                hasCache = true;
                break;
              }
            }
          } else {
            setModelsStatus("available");
            setTestResult({
              success: false,
              message:
                "Custom directory is linked. Click 'Verify Files & Make Available' below to grant directory access.",
            });
            return;
          }
        } catch {
          hasCache = false;
        }
      } else {
        const keys = await caches.keys();
        hasCache = keys.some((k) => k.includes("transformers"));
      }

      if (hasCache) {
        setModelsStatus("available");
        setTestResult({
          success: true,
          message:
            "Local offline files are ready. Click 'Verify Files & Make Available' to run diagnostics.",
        });
      } else {
        setModelsStatus("missing");
      }
    } catch (err: any) {
      setModelsStatus("error");
      setTestResult({
        success: false,
        message: `Error checking offline models: ${err.message}`,
      });
    }
  };

  const handleOfflineVerify = async () => {
    setModelsStatus("checking");
    setTestResult(null);
    setDownloadProgress(
      "Requesting folder permissions and establishing link...",
    );
    try {
      if (offlineDir) {
        if (offlineDir.requestPermission) {
          const perm = await offlineDir.requestPermission({
            mode: "readwrite",
          });
          if (perm !== "granted") {
            throw new Error("Local folder access permission denied.");
          }
        }
      }

      setDownloadProgress(
        "Initializing local engine components in background...",
      );
      console.log("handleOfflineVerify: Checking model status...");
      const { initAIWorker, testOfflineModels } =
        await import("../utils/translate");
      const { isTaskReady } = await import("../workers/aiWorkerClient");

      // Build the task list from whichever models the user has configured.
      // A user may have ONLY transcription (no translation) — that's valid.
      // We attempt both, but `initAIWorker` only fails if NEITHER loads.
      const tasks: ("translate" | "recognize")[] = ["recognize", "translate"];

      // Only reset + reload if neither model is already loaded.
      // If either is ready, just run the test directly to avoid destroying a
      // working worker.
      if (!isTaskReady('translate') && !isTaskReady('recognize')) {
        console.log("handleOfflineVerify: Models not loaded, resetting worker and loading...");
        const { resetWorker } = await import("../workers/aiWorkerClient");
        resetWorker();
        try {
          await initAIWorker(tasks);
        } catch (loadErr: any) {
          // If loading fails entirely (both models missing), surface a clear error.
          throw new Error(`Failed to load offline models. Make sure you have downloaded at least the transcription model. Detail: ${loadErr.message}`);
        }
      } else {
        console.log("handleOfflineVerify: Models already loaded, skipping re-init.");
      }

      console.log(
        "handleOfflineVerify: Models loaded. Running test...",
      );
      setDownloadProgress("Testing offline models...");
      const res = await testOfflineModels();
      console.log("handleOfflineVerify: testOfflineModels returned", res);

      if (res.success) {
        setModelsStatus("available");
        setTestResult(res);
        setDownloadProgress("Offline verification completed successfully!");
        onSettingsChange({ ...settings, offlineMode: true } as any);
        props.onVerifyResult?.(true);
        alert(
          "Offline Mode verified successfully! " + res.message,
        );
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setModelsStatus("error");
      setTestResult({
        success: false,
        message: `Offline diagnostics failed: ${err.message}`,
      });
      setDownloadProgress("");
      props.onVerifyResult?.(false);
      const hint =
        /network|fetch|CORS|Failed to/i.test(err.message || "")
          ? "\n\nThis is usually a network/CORS issue. Try switching the mirror (HF Mirror ↔ Hugging Face) and retry. First download is large — keep the tab open."
          : "\n\nPlease connect to the internet to download models first if they are not stored.";
      alert(`Offline verification failed: ${err.message}.${hint}`);
    } finally {
      setTimeout(() => setDownloadProgress(""), 8000);
    }
  };



  const handleOfflineDownload = async (
    tasks: ("translate" | "recognize")[],
  ) => {
    try {
      let hasCache = false;
      if (offlineDir) {
        try {
          if (offlineDir.requestPermission) {
            const perm = await offlineDir.requestPermission({
              mode: "readwrite",
            });
            if (perm !== "granted") throw new Error("Permission denied");
          }
          for await (const entry of offlineDir.values()) {
            if (entry.kind === "directory" || entry.kind === "file") {
              hasCache = true;
              break;
            }
          }
        } catch (e: any) {
          if (e.message === "Permission denied") return;
        }
      } else {
        const keys = await caches.keys();
        hasCache = keys.some((k) => k.includes("transformers"));
      }

      if (hasCache) {
        if (
          !window.confirm(
            `Download will cache files. Would you like to proceed with downloading the selected model components?`,
          )
        ) {
          return;
        }
      }
    } catch {}

    setDownloadingOffline(true);
    setDownloadProgress("Initializing download streams...");
    setProgressDetails({});
    try {
      const { initAIWorker, testOfflineModels } =
        await import("../utils/translate");
      // Reset any half-initialized worker so the download starts clean
      // (fixes "models don't download" after a previous failed attempt).
      const { resetWorker } = await import("../workers/aiWorkerClient");
      resetWorker();
      await initAIWorker(tasks, (info: any) => {
        if (info.status === "progress" && info.file) {
          setProgressDetails((prev) => {
            const fileKey: string = info.file;
            const next: Record<string, { progress: number; loaded?: number; total?: number; status?: string }> = {
              ...prev,
              [fileKey]: {
                progress: info.progress,
                loaded: info.loaded,
                total: info.total,
                status: "downloading",
              },
            };

            const fileKeys = Object.keys(next);
            let totalLoaded = 0;
            let totalBytes = 0;
            let hasSizes = true;
            for (const fk of fileKeys) {
              const fileObj = next[fk];
              if (fileObj.loaded && fileObj.total) {
                totalLoaded += fileObj.loaded;
                totalBytes += fileObj.total;
              } else {
                hasSizes = false;
              }
            }

            let percentStr = "";
            if (hasSizes && totalBytes > 0) {
              const overallPercent = Math.round(
                (totalLoaded / totalBytes) * 100,
              );
              const loadedMB = (totalLoaded / (1024 * 1024)).toFixed(1);
              const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
              percentStr = `${overallPercent}% (${loadedMB} MB / ${totalMB} MB)`;
            } else {
              const values = Object.values(next).map((x: { progress: number }) => x.progress);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              percentStr = `${Math.round(avg)}% (Averaged)`;
            }

            setDownloadProgress(`Downloading: ${percentStr}`);
            return next;
          });
        } else if (info.status === "done") {
          setProgressDetails((prev) => ({
            ...prev,
            [info.file || "Done"]: { progress: 100, status: "done" },
          }));
        } else if (info.status === "init") {
          setProgressDetails((prev) => ({
            ...prev,
            [info.file || "Initializing"]: { progress: 0, status: "init" },
          }));
        }
      });

      // If all models were requested (tasks.length === 2), verify them.
      // If single model, skip verification (it would trigger unwanted downloads).
      if (tasks.length === 2) {
        setDownloadProgress("Verifying offline model configurations...");
        const res = await testOfflineModels();
        if (res.success) {
          setDownloadProgress(`Verification successful! ${res.message}`);
          setTestResult(res);
        } else {
          setDownloadProgress(
            `Testing completed with warning or missing component: ${res.message}`,
          );
          setTestResult(res);
        }
      } else {
        setDownloadProgress("Download completed successfully!");
        setTestResult({
          success: true,
          message:
            "Component downloaded successfully! Translation will use online mode until translation model is also downloaded.",
        });
      }
      onSettingsChange({ ...settings, offlineMode: true } as any);
      setModelsStatus("available");
      setTimeout(() => setDownloadProgress(""), 8000);
    } catch (e: any) {
      const msg = e?.message || String(e);
      const hint =
        /network|fetch|CORS|Failed to|timed out/i.test(msg)
          ? "\n\nNetwork/CORS issue — switch the mirror (HF Mirror ↔ Hugging Face) in the dropdown above and retry. First download is large; keep this tab open."
          : "";
      alert(`Download failed: ${msg}${hint}`);
      setModelsStatus("error");
      setTestResult({ success: false, message: `Download failed: ${msg}` });
      setDownloadProgress("");
    }
    setDownloadingOffline(false);
  };

  const filteredRecog = recognitionLanguages;

  const speakerCard = (speaker: SpeakerConfig) => {
    const isTutor = speaker.role === "tutor";
    const accent = isTutor
      ? isDark
        ? "text-indigo-300"
        : "text-indigo-700"
      : isDark
        ? "text-emerald-300"
        : "text-emerald-700";

    return (
      <div className={cn(sectionCls, "mb-3")}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={cn("font-semibold flex items-center gap-2", accent)}>
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                isTutor ? "bg-indigo-500" : "bg-emerald-500",
              )}
            />
            {isTutor ? "🎓 Tutor" : "🧑‍🎓 Learner"}
          </h4>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              Active
            </span>
            <button
              onClick={() => onSetActiveRole(speaker.role)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                activeRole === speaker.role
                  ? "bg-indigo-600"
                  : isDark
                    ? "bg-slate-700"
                    : "bg-slate-300",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                  activeRole === speaker.role ? "left-5" : "left-0.5",
                )}
              />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className={labelCls}>Display Name</label>
          <input
            className={inputCls}
            value={speaker.label}
            onChange={(e) =>
              updSpeaker(speaker.role, { label: e.target.value })
            }
          />
        </div>

        <div className="mb-3">
          <label className={labelCls}>Audio Source</label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                updSpeaker(speaker.role, { audioSource: "microphone" });
                onAcquireMic(speaker.role, speaker.deviceId);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
                speaker.audioSource === "microphone"
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : isDark
                    ? "border-slate-600 text-slate-300"
                    : "border-slate-300 text-slate-700",
              )}
            >
              <Mic size={14} /> Mic
            </button>
            <button
              onClick={() => {
                updSpeaker(speaker.role, { audioSource: "system" });
                onAcquireSystem(speaker.role);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
                speaker.audioSource === "system"
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : isDark
                    ? "border-slate-600 text-slate-300"
                    : "border-slate-300 text-slate-700",
              )}
            >
              <Monitor size={14} /> System
            </button>
          </div>
        </div>

        {speaker.audioSource === "microphone" && (
          <div className="mb-3">
            <label className={labelCls}>Microphone Device</label>
            <div className="flex gap-2">
              <select
                className={cn(selectCls, "flex-1")}
                value={speaker.deviceId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  updSpeaker(speaker.role, { deviceId: id });
                  onAcquireMic(speaker.role, id);
                }}
              >
                <option value="">Default</option>
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                onClick={onRefreshDevices}
                className={cn(
                  "p-2 rounded-lg border",
                  isDark
                    ? "border-slate-600 hover:bg-slate-700"
                    : "border-slate-300 hover:bg-slate-100",
                )}
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        )}

        {sourceErrors[speaker.role] && (
          <div
            className={cn(
              "flex items-start gap-2 text-xs px-3 py-2 rounded-lg mb-3",
              isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700",
            )}
          >
            <AlertCircle size={12} className="mt-0.5" />
            {sourceErrors[speaker.role]}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleTest(speaker.role)}
            disabled={testing[speaker.role]}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border",
              isDark
                ? "border-slate-600 text-slate-300"
                : "border-slate-300 text-slate-700",
            )}
          >
            <Volume2
              size={14}
              className={testing[speaker.role] ? "animate-pulse" : ""}
            />
            {testing[speaker.role] ? "Testing..." : "Test"}
          </button>

          {testResults[speaker.role] && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                testResults[speaker.role]!.working
                  ? "text-green-500"
                  : "text-amber-500",
              )}
            >
              {testResults[speaker.role]!.working ? (
                <>
                  <CheckCircle size={12} />
                  OK
                </>
              ) : (
                <>
                  <AlertCircle size={12} />
                  No audio
                </>
              )}
            </span>
          )}

          <button
            onClick={() => updSpeaker(speaker.role, { muted: !speaker.muted })}
            className={cn(
              "ml-auto px-3 py-1.5 rounded-lg text-sm",
              speaker.muted
                ? "bg-red-600 text-white"
                : isDark
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-700",
            )}
          >
            {speaker.muted ? "🔇 Unmute" : "🔊 Mute"}
          </button>
        </div>
      </div>
    );
  };

  const speakerLanguageCard = (speaker: SpeakerConfig) => {
    const isTutor = speaker.role === "tutor";
    const accentBorder = isTutor
      ? isDark
        ? "border-indigo-800"
        : "border-indigo-200"
      : isDark
        ? "border-emerald-800"
        : "border-emerald-200";
    const accentText = isTutor
      ? isDark
        ? "text-indigo-300"
        : "text-indigo-700"
      : isDark
        ? "text-emerald-300"
        : "text-emerald-700";

    return (
      <div className={cn(sectionCls, "border-2", accentBorder)}>
        <div
          className={cn(
            "font-semibold mb-3 flex items-center gap-2",
            accentText,
          )}
        >
          <Languages size={16} />
          {isTutor ? "Tutor Language & Voices" : "Learner Language & Voices"}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={labelCls}>Translation API Provider</label>
            <div className="flex gap-2">
              <select
                className={cn(selectCls, "flex-1")}
                value={settings.translationApi || "auto"}
                onChange={(e) => upd("translationApi", e.target.value as any)}
              >
                <option value="auto">Auto (Recommended)</option>
                <option value="direct">Google Direct</option>
                <option value="lingva">Lingva Proxy</option>
              </select>
              <button
                onClick={async () => {
                  if (!speaker.translationLang) {
                    alert("Please select a Translation Language below first.");
                    return;
                  }
                  const btn = document.getElementById("test-api-btn-txt");
                  if (btn) btn.textContent = "Testing...";
                  try {
                    const { translateWithCache } =
                      await import("../utils/translate");
                    const res = await translateWithCache(
                      "Hello, how are you?",
                      speaker.translationLang,
                      getSourceLangCode(speaker.recognitionLang),
                      settings.translationApi,
                    );
                    if (btn) {
                      btn.textContent = res ? "✅ OK" : "❌ Failed";
                      btn.className = res
                        ? "text-xs text-green-500 font-bold"
                        : "text-xs text-red-500 font-bold";
                    }
                  } catch (e: any) {
                    if (btn) {
                      btn.textContent = "❌ Error";
                      btn.className = "text-xs text-red-500 font-bold";
                    }
                  }
                  setTimeout(() => {
                    if (btn) {
                      btn.textContent = "Test API";
                      btn.className = "text-xs text-slate-500";
                    }
                  }, 3000);
                }}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm",
                  isDark
                    ? "border-slate-600 hover:bg-slate-700"
                    : "border-slate-300 hover:bg-slate-100",
                )}
              >
                <span
                  id="test-api-btn-txt"
                  className={cn(
                    "text-xs",
                    isDark ? "text-slate-400" : "text-slate-600",
                  )}
                >
                  Test API
                </span>
              </button>
            </div>
            <div
              className={cn(
                "text-[10px] mt-1",
                isDark ? "text-slate-500" : "text-slate-400",
              )}
            >
              Uses server proxy to bypass strict browser CSP & firewalls.
            </div>
          </div>

          <div>
            <label className={labelCls}>Recognition Language</label>
            <select
              className={selectCls}
              value={speaker.recognitionLang}
              onChange={(e) =>
                updSpeaker(speaker.role, { recognitionLang: e.target.value })
              }
            >
              {filteredRecog.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Translation Language</label>
            <select
              className={selectCls}
              value={speaker.translationLang}
              onChange={(e) =>
                updSpeaker(speaker.role, { translationLang: e.target.value })
              }
            >
              <option value="">Off</option>
              {translationLanguages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <VoiceSelect
            label="Read Aloud Voice (Transcription)"
            value={speaker.ttsVoiceTranscription}
            onChange={(v) =>
              updSpeaker(speaker.role, { ttsVoiceTranscription: v })
            }
            voices={voices}
            isDark={isDark}
            labelCls={labelCls}
            inputCls={inputCls}
            selectCls={selectCls}
          />

          <VoiceSelect
            label="Read Aloud Voice (Translation)"
            value={speaker.ttsVoiceTranslation}
            onChange={(v) =>
              updSpeaker(speaker.role, { ttsVoiceTranslation: v })
            }
            voices={voices}
            isDark={isDark}
            labelCls={labelCls}
            inputCls={inputCls}
            selectCls={selectCls}
          />

          <div className="flex items-center justify-between">
            <div>
              <div
                className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-200" : "text-slate-800",
                )}
              >
                Auto-Translate
              </div>
              <div
                className={cn(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                Automatically translate new chunks
              </div>
            </div>
            <Toggle
              isOn={speaker.autoTranslate}
              onToggle={() =>
                updSpeaker(speaker.role, {
                  autoTranslate: !speaker.autoTranslate,
                })
              }
              isDark={isDark}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div
                className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-200" : "text-slate-800",
                )}
              >
                Auto Speak Translation
              </div>
              <div
                className={cn(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                After translation, read it aloud
              </div>
            </div>
            <Toggle
              isOn={speaker.autoSpeakTranslation}
              onToggle={() =>
                updSpeaker(speaker.role, {
                  autoSpeakTranslation: !speaker.autoSpeakTranslation,
                })
              }
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "fixed right-0 top-0 bottom-0 w-[540px] max-w-full z-30 flex flex-col border-l shadow-2xl overflow-hidden",
        overlay,
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 border-b shrink-0",
          isDark ? "border-slate-700" : "border-slate-200",
        )}
      >
        <Sliders
          size={18}
          className={isDark ? "text-indigo-400" : "text-indigo-600"}
        />
        <h3 className="font-bold text-base">Settings</h3>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/json";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const parsed = JSON.parse(ev.target?.result as string);
                    if (parsed.settings) onSettingsChange(parsed.settings);
                    if (parsed.speakers) onSpeakerChange(parsed.speakers);
                  } catch {
                    alert("Invalid settings file");
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            className={cn(
              "text-xs px-2 py-1 rounded transition-colors",
              isDark
                ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            Import
          </button>

          <button
            onClick={() => {
              const dataStr = JSON.stringify({ settings, speakers }, null, 2);
              const blob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "tutorly_transcriber_settings.json";
              link.click();
              URL.revokeObjectURL(url);
            }}
            className={cn(
              "text-xs px-2 py-1 rounded transition-colors",
              isDark
                ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            Export
          </button>

          <button
            onClick={onClose}
            className={cn(
              "p-1.5 rounded-xl transition-colors",
              isDark
                ? "hover:bg-slate-800 text-slate-400"
                : "hover:bg-slate-100 text-slate-500",
            )}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={cn(
          "flex gap-1 p-2 border-b shrink-0 overflow-x-auto",
          isDark ? "border-slate-700" : "border-slate-200",
        )}
        onWheel={(e) => {
          if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {tabBtn("audio", "Audio", Mic)}
        {tabBtn("language", "Language", Languages)}
        {tabBtn("subtitles", "Subtitles", Subtitles)}
        {tabBtn("display", "Display", Palette)}
        {tabBtn("recording", "Recording", Video)}
        {tabBtn("automation", "Automation", Wand2)}
        {tabBtn("hotkeys", "Hotkeys", Wifi)}
        {tabBtn("offline", "Offline Mode", CheckCircle)}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "offline" && (
          <>
            {/* Model selection */}
            <div className={sectionCls}>
              <div className={cn("text-sm font-semibold flex items-center gap-2 mb-3", isDark ? "text-slate-100" : "text-slate-900")}>
                <Sliders size={15} className="text-indigo-500" /> Offline AI Models
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={labelCls}>Transcription</label>
                  <select className={selectCls} value={(settings as any).transcriptionModel || "Xenova/whisper-tiny"} onChange={(e) => upd("transcriptionModel" as any, e.target.value)}>
                    <option value="Xenova/whisper-tiny">Whisper Tiny ~40 MB</option>
                    <option value="Xenova/whisper-tiny.en">Whisper Tiny EN ~40 MB</option>
                    <option value="Xenova/whisper-base">Whisper Base ~150 MB</option>
                    <option value="Xenova/whisper-base.en">Whisper Base EN ~150 MB</option>
                    <option value="Xenova/whisper-small">Whisper Small ~480 MB</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Translation</label>
                  <select className={selectCls} value={(settings as any).translationModel || "Xenova/m2m100_418M"} onChange={(e) => upd("translationModel" as any, e.target.value)}>
                    <option value="Xenova/m2m100_418M">M2M-100 ~300 MB</option>
                    <option value="Xenova/nllb-200-distilled-600M">NLLB-200 ~1.5 GB</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Download Mirror</label>
                  <select className={selectCls} value={(settings as any).modelMirror || "https://huggingface.co"} onChange={(e) => upd("modelMirror" as any, e.target.value)}>
                    <option value="https://huggingface.co">Hugging Face</option>
                    <option value="https://hf-mirror.com">HF-Mirror</option>
                  </select>
                </div>
              </div>

              {/* Status + Actions */}
              {modelsStatus && (
                <div className={cn("p-2.5 rounded-lg mb-3 text-xs font-medium flex items-center gap-2 border", modelsStatus === "checking" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : modelsStatus === "available" ? "bg-green-500/10 text-green-400 border-green-500/20" : modelsStatus === "missing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                  {modelsStatus === "checking" ? <RefreshCw size={13} className="animate-spin text-indigo-400" /> : modelsStatus === "available" ? <span className="text-green-400 font-bold">✓</span> : <span className="text-amber-400">⚠️</span>}
                  <span>
                    {modelsStatus === "checking" && "Checking..."}
                    {modelsStatus === "available" && "Models ready ✓"}
                    {modelsStatus === "missing" && "No models cached yet"}
                    {modelsStatus === "error" && "Error checking models"}
                  </span>
                </div>
              )}

              {testResult && (
                <div className={cn("p-2.5 rounded-lg mb-3 text-xs border", testResult.success ? "bg-green-500/5 text-green-400 border-green-500/20" : "bg-red-500/5 text-red-500 border-red-500/20")}>
                  {testResult.message}
                </div>
              )}

              {/* Step 1: Auto download */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => handleOfflineDownload(["recognize"])} disabled={downloadingOffline || modelsStatus === "checking"} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition", isDark ? "bg-slate-800 hover:bg-slate-755 border-slate-700 text-slate-100" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800", (downloadingOffline || modelsStatus === "checking") && "opacity-50 cursor-not-allowed")}>
                  🎙️ Download Transcription
                </button>
                <button onClick={() => handleOfflineDownload(["translate"])} disabled={downloadingOffline || modelsStatus === "checking"} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition", isDark ? "bg-slate-800 hover:bg-slate-755 border-slate-700 text-slate-100" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800", (downloadingOffline || modelsStatus === "checking") && "opacity-50 cursor-not-allowed")}>
                  🌐 Download Translation
                </button>
                <button onClick={() => handleOfflineDownload(["translate", "recognize"])} disabled={downloadingOffline || modelsStatus === "checking"} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600/30", (downloadingOffline || modelsStatus === "checking") && "opacity-50 cursor-not-allowed")}>
                  📥 Download Both
                </button>
              </div>

              {downloadProgress && (
                <div className="flex items-center gap-2 mb-3 p-2 px-3 bg-indigo-500/10 border border-indigo-500/10 rounded-lg text-[11px] font-mono">
                  <RefreshCw size={11} className="animate-spin text-indigo-400 shrink-0" />
                  <span className="text-slate-300 truncate font-semibold">{downloadProgress}</span>
                </div>
              )}

              {Object.keys(progressDetails).length > 0 && (
                <div className={cn("mb-3 p-2.5 rounded-lg border text-xs font-mono space-y-2 max-h-48 overflow-y-auto", isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-705")}>
                  <div className="font-semibold text-[10px] uppercase tracking-wider text-slate-500 mb-1 border-b pb-1 border-slate-800/80">Download Progress</div>
                  {Object.entries(progressDetails).map(([file, details]) => {
                    const pct = Math.round(details.progress ?? 0);
                    const isDone = details.status === "done" || pct === 100;
                    return (
                      <div key={file} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400 truncate">{file.split("/").pop()}</span>
                          <span className="font-bold">{isDone ? <span className="text-green-400">Done</span> : <span className="text-indigo-400">{pct}%</span>}</span>
                        </div>
                        <div className="w-full bg-slate-800/80 rounded-full h-1">
                          <div className={cn("h-1 rounded-full transition-all duration-300", isDone ? "bg-green-500" : "bg-indigo-500")} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 2: Manual download links */}
              <div className="border-t pt-3 border-slate-800/40">
                <button type="button" onClick={() => setShowManualGuide(!showManualGuide)} className={cn("w-full flex items-center justify-between text-xs font-semibold py-1 hover:text-indigo-400 transition-colors cursor-pointer", isDark ? "text-slate-300" : "text-slate-700")}>
                  <span>📥 Step 1: Download Files Manually</span>
                  <span>{showManualGuide ? "▲" : "▼"}</span>
                </button>
                {showManualGuide && (
                  <div className="mt-2 space-y-2">
                    <div className={cn("p-2.5 rounded-lg border", isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50")}>
                      <div className="text-xs font-semibold mb-1.5">🎙️ Transcription</div>
                      <div className="flex flex-wrap gap-1">
                        {["config.json","generation_config.json","preprocessor_config.json","tokenizer.json","tokenizer_config.json","onnx/encoder_model_quantized.onnx","onnx/decoder_model_merged_quantized.onnx"].map(file => {
                          const modelId = (settings as any).transcriptionModel || "Xenova/whisper-tiny";
                          return <a key={file} href={`https://huggingface.co/${modelId}/resolve/main/${file}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 underline hover:text-indigo-300 font-mono">{file.split("/").pop()}</a>;
                        })}
                      </div>
                    </div>
                    <div className={cn("p-2.5 rounded-lg border", isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50")}>
                      <div className="text-xs font-semibold mb-1.5">🌐 Translation</div>
                      <div className="flex flex-wrap gap-1">
                        {["config.json","generation_config.json","tokenizer.json","tokenizer_config.json","onnx/encoder_model_quantized.onnx","onnx/decoder_model_merged_quantized.onnx"].map(file => {
                          const modelId = (settings as any).translationModel || "Xenova/m2m100_418M";
                          return <a key={file} href={`https://huggingface.co/${modelId}/resolve/main/${file}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 underline hover:text-indigo-300 font-mono">{file.split("/").pop()}</a>;
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Import downloaded files */}
              <div className="border-t pt-3 border-slate-800/40 mt-1">
                <button type="button" onClick={() => setShowImportGuide(!showImportGuide)} className={cn("w-full flex items-center justify-between text-xs font-semibold py-1 hover:text-indigo-400 transition-colors cursor-pointer", isDark ? "text-slate-300" : "text-slate-700")}>
                  <span>📤 Step 2: Import Downloaded Files</span>
                  <span>{showImportGuide ? "▲" : "▼"}</span>
                </button>
                {showImportGuide && (
                  <div className="mt-2 space-y-2">
                    <div className={cn("flex items-center justify-between p-2.5 rounded-lg border", isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50")}>
                      <div>
                        <div className="text-xs font-semibold">🎙️ Transcription</div>
                        <div className="text-[10px] text-slate-500">{(settings as any).transcriptionModel || "Xenova/whisper-tiny"}</div>
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" multiple accept=".json,.onnx,.bin,.txt" style={{ display: "none" }} onChange={async (e) => {
                          const files = e.target.files; if (!files || files.length === 0) return;
                          setDownloadProgress("Importing transcription files...");
                          try {
                            const { getOrCreateModelsDir, writeModelFile } = await import("../utils/storage");
                            const dir = await getOrCreateModelsDir();
                            const modelShort = ((settings as any).transcriptionModel || "Xenova/whisper-tiny").split("/").pop();
                            for (const f of files) {
                              const subdir = f.name.includes(".onnx") ? "onnx/" : "";
                              await writeModelFile(dir, `Xenova/${modelShort}/${subdir}${f.name}`, f);
                            }
                            setDownloadProgress(`Imported ${files.length} transcription files ✓`);
                          } catch (err: any) { setDownloadProgress(`Import error: ${err.message}`); }
                        }} />
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-1 cursor-pointer">Select Files</span>
                      </label>
                    </div>
                    <div className={cn("flex items-center justify-between p-2.5 rounded-lg border", isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50")}>
                      <div>
                        <div className="text-xs font-semibold">🌐 Translation</div>
                        <div className="text-[10px] text-slate-500">{(settings as any).translationModel || "Xenova/m2m100_418M"}</div>
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" multiple accept=".json,.onnx,.bin,.txt" style={{ display: "none" }} onChange={async (e) => {
                          const files = e.target.files; if (!files || files.length === 0) return;
                          setDownloadProgress("Importing translation files...");
                          try {
                            const { getOrCreateModelsDir, writeModelFile } = await import("../utils/storage");
                            const dir = await getOrCreateModelsDir();
                            const modelShort = ((settings as any).translationModel || "Xenova/m2m100_418M").split("/").pop();
                            for (const f of files) {
                              const subdir = f.name.includes(".onnx") ? "onnx/" : "";
                              await writeModelFile(dir, `Xenova/${modelShort}/${subdir}${f.name}`, f);
                            }
                            setDownloadProgress(`Imported ${files.length} translation files ✓`);
                          } catch (err: any) { setDownloadProgress(`Import error: ${err.message}`); }
                        }} />
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-1 cursor-pointer">Select Files</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Verify */}
              <div className="border-t pt-3 border-slate-800/40 mt-1">
                <button onClick={handleOfflineVerify} disabled={downloadingOffline || modelsStatus === "checking"} className={cn("w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-605/30", (downloadingOffline || modelsStatus === "checking") && "opacity-50 cursor-not-allowed")}>
                  🔍 Step 3: Verify & Enable Offline
                </button>
              </div>
            </div>

            {/* Slide 4: Install PWA */}
            <div className={cn(sectionCls, "border-slate-700 bg-slate-800/30")}>
              <div className={cn("text-sm font-semibold flex items-center gap-2 mb-2", isDark ? "text-slate-200" : "text-slate-800")}>
                <Monitor size={14} /> Install App
              </div>
              <button
                onClick={handleInstallClick}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border shadow-sm cursor-pointer",
                  isPwaInstalled
                    ? "bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30"
                    : isDark
                      ? "bg-slate-705 border-slate-650 hover:bg-slate-600 text-white"
                      : "bg-slate-200 border-slate-300 hover:bg-slate-250 text-slate-800",
                )}
              >
                {isPwaInstalled ? "✓ Installed" : "Install Desktop Application"}
              </button>
              {installStatus && (
                <div className={cn("text-xs mt-2 text-center", installStatus.type === "error" ? "text-amber-400" : "text-green-400")}>
                  {installStatus.message}
                </div>
              )}
            </div>
          </>
        )}
        {tab === "audio" && (
          <>
            <div className={sectionCls}>
              <label className={labelCls}>
                <Timer size={12} className="inline mr-1" />
                Silence Threshold (chunking)
              </label>
              <select
                className={selectCls}
                value={settings.silenceGapMs}
                onChange={(e) => upd("silenceGapMs", Number(e.target.value))}
              >
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={15000}>15 seconds</option>
                <option value={20000}>20 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
              <div
                className={cn(
                  "text-xs mt-2",
                  isDark ? "text-slate-500" : "text-slate-500",
                )}
              >
                Longer thresholds reduce tiny chunks (better for learners with
                pauses).
              </div>
            </div>

            {speakerCard(tutor)}
            {speakerCard(learner)}
          </>
        )}

        {tab === "language" && (
          <>
            <div className="hidden">
              <div
                className={cn(
                  "text-xs mt-2",
                  isDark ? "text-slate-500" : "text-slate-500",
                )}
              >
                Tip: In Microsoft Edge, voices like “Microsoft Ava” usually
                sound best.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {speakerLanguageCard(tutor)}
              {speakerLanguageCard(learner)}
            </div>
          </>
        )}

        {tab === "subtitles" && (
          <>
            <div className={sectionCls}>
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium flex items-center gap-2",
                      isDark ? "text-slate-200" : "text-slate-800",
                    )}
                  >
                    <Subtitles size={14} /> Live Subtitles Overlay
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5",
                      isDark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Big, real-time interim subtitles while you speak
                  </div>
                </div>
                <Toggle
                  isOn={settings.subtitle.enabled}
                  onToggle={() =>
                    updSubtitle("enabled", !settings.subtitle.enabled)
                  }
                  isDark={isDark}
                />
              </div>
            </div>

            <div className={sectionCls}>
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isDark ? "text-slate-200" : "text-slate-800",
                    )}
                  >
                    Show subtitle translation line
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5",
                      isDark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Shows translated subtitle under original (if available)
                  </div>
                </div>
                <Toggle
                  isOn={settings.subtitle.showTranslation}
                  onToggle={() =>
                    updSubtitle(
                      "showTranslation",
                      !settings.subtitle.showTranslation,
                    )
                  }
                  isDark={isDark}
                />
              </div>
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>
                <Type size={12} className="inline mr-1" />
                Subtitle Font Size: {settings.subtitle.fontSize}px
              </label>
              <input
                type="range"
                min={22}
                max={72}
                step={2}
                value={settings.subtitle.fontSize}
                onChange={(e) =>
                  updSubtitle("fontSize", Number(e.target.value))
                }
                className="w-full accent-indigo-500"
              />
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>
                History Text Size: {settings.subtitle.historyFontSize}px
              </label>
              <input
                type="range"
                min={10}
                max={24}
                step={1}
                value={settings.subtitle.historyFontSize}
                onChange={(e) =>
                  updSubtitle("historyFontSize", Number(e.target.value))
                }
                className="w-full accent-indigo-500"
              />
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>
                Subtitle scrollback lines: {settings.subtitle.maxLines}
              </label>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={settings.subtitle.maxLines}
                onChange={(e) =>
                  updSubtitle("maxLines", Number(e.target.value))
                }
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Popout subtitle toggle removed – popout is on by default, button is in subtitle bar */}

            {/* Floating draggable / resizable overlay over a video call */}
            <div className={sectionCls}>
              <ToggleRow
                title="Floating Subtitle Overlay"
                desc="Show a draggable, resizable subtitle panel you can position over a Zoom/Meet call. (Hotkey: Ctrl+Shift+F)"
                value={!!settings.subtitle.floatingOverlay}
                onToggle={() =>
                  updSubtitle("floatingOverlay", !settings.subtitle.floatingOverlay)
                }
                isDark={isDark}
              />
            </div>

            {/* Document Picture-in-Picture */}
            <div className={sectionCls}>
              <ToggleRow
                title={
                  typeof document !== "undefined" &&
                  (document as any).pictureInPictureElement !== undefined &&
                  (window as any).documentPictureInPicture
                    ? "Picture-in-Picture over Calls"
                    : "Picture-in-Picture over Calls (Chrome/Edge only)"
                }
                desc={
                  (window as any).documentPictureInPicture
                    ? "Opens an always-on-top window with live subtitles — stays visible over Zoom, Meet and Teams."
                    : "Always-on-top window needs Chrome/Edge 116+. A normal pop-out window is used on other browsers."
                }
                value={!!settings.subtitle.documentPip}
                onToggle={() =>
                  updSubtitle("documentPip", !settings.subtitle.documentPip)
                }
                isDark={isDark}
              />
            </div>

            {/* Auto-save to .txt file */}
            <div className={sectionCls}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-800")}>
                    Auto-Save to .txt File
                  </div>
                  <div className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
                    New sessions auto-create a .txt file in your chosen folder
                  </div>
                </div>
              </div>
              {isFileBackupReady && backupDirName ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className={cn("text-xs truncate flex-1", isDark ? "text-green-400" : "text-green-600")}>
                    Saving to: {backupDirName}
                  </span>
                  <button onClick={async () => { if (clearBackup) await clearBackup(); }}
                    className={cn("text-xs px-2 py-1 rounded", isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-200 text-slate-600 hover:bg-slate-300")}>
                    Clear
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <button onClick={async () => {
                    if (!pickBackupDirectory) return;
                    const result = await pickBackupDirectory();
                    if (result.error) alert(result.error);
                  }}
                    className={cn("text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5",
                      isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-700 hover:bg-slate-100")}>
                    <FolderOpen size={14} />
                    Choose Directory
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "display" && (
          <>
            <div className={sectionCls}>
              <label className={labelCls}>
                <Palette size={12} className="inline mr-1" />
                Theme
              </label>
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => upd("theme", t)}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-sm font-medium capitalize",
                      settings.theme === t
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : isDark
                          ? "border-slate-600 text-slate-300"
                          : "border-slate-300 text-slate-700",
                    )}
                  >
                    {t === "dark" ? "🌙 Dark" : "☀️ Light"}
                  </button>
                ))}
              </div>
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>
                <Type size={12} className="inline mr-1" />
                Dialogue Font Size: {settings.fontSize}px
              </label>
              <input
                type="range"
                min={14}
                max={36}
                step={2}
                value={settings.fontSize}
                onChange={(e) => upd("fontSize", Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className={sectionCls}>
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium flex items-center gap-2",
                      isDark ? "text-slate-200" : "text-slate-800",
                    )}
                  >
                    <Eye size={14} /> Ghost Mode (Ultra-light)
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5",
                      isDark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Don’t render dialogue bubbles; keep subtitles + storage
                    only.
                  </div>
                </div>
                <Toggle
                  isOn={settings.ghostMode}
                  onToggle={() => upd("ghostMode", !settings.ghostMode)}
                  isDark={isDark}
                />
              </div>
            </div>

            <div className={sectionCls}>
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isDark ? "text-slate-200" : "text-slate-800",
                    )}
                  >
                    Auto-Save Transcript
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5",
                      isDark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Saves to IndexedDB in chunks (recommended for long lessons)
                  </div>
                </div>
                <Toggle
                  isOn={settings.autoSave}
                  onToggle={() => upd("autoSave", !settings.autoSave)}
                  isDark={isDark}
                />
              </div>
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>
                Speech rate: {settings.speechRate.toFixed(1)}x
              </label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={settings.speechRate}
                onChange={(e) => upd("speechRate", parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div
              className={cn(
                "text-xs px-3 py-2 rounded-lg",
                isDark
                  ? "bg-slate-800 text-slate-400"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              <strong>Best practice:</strong> For hours-long sessions, turn ON
              Auto-Save + Ghost Mode.
            </div>
          </>
        )}

        {tab === "recording" && (
          <>
            <div
              className={cn(
                "text-xs px-3 py-2 rounded-lg",
                isDark
                  ? "bg-blue-900/30 text-blue-300 border border-blue-800"
                  : "bg-blue-50 text-blue-700 border border-blue-200",
              )}
            >
              Screen + Audio is recommended. Use <strong>Low</strong> quality
              for tiny files.
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>Recording Type</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() =>
                    onRecordingConfigChange({
                      ...recordingConfig,
                      includeVideo: true,
                    })
                  }
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm",
                    recordingConfig.includeVideo
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : isDark
                        ? "border-slate-600 text-slate-300"
                        : "border-slate-300 text-slate-700",
                  )}
                >
                  <Video size={14} /> Screen + Audio
                </button>
                <button
                  onClick={() =>
                    onRecordingConfigChange({
                      ...recordingConfig,
                      includeVideo: false,
                    })
                  }
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm",
                    !recordingConfig.includeVideo
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : isDark
                        ? "border-slate-600 text-slate-300"
                        : "border-slate-300 text-slate-700",
                  )}
                >
                  <Mic size={14} /> Audio Only
                </button>
              </div>

              <label className={labelCls}>Format</label>
              <div className="flex gap-2 mb-3">
                {(["webm", "mp4"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() =>
                      onRecordingConfigChange({ ...recordingConfig, format: f })
                    }
                    className={cn(
                      "flex-1 py-1.5 rounded-lg border text-sm uppercase",
                      recordingConfig.format === f
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : isDark
                          ? "border-slate-600 text-slate-300"
                          : "border-slate-300 text-slate-700",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <label className={labelCls}>Quality</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() =>
                      onRecordingConfigChange({
                        ...recordingConfig,
                        quality: q,
                      })
                    }
                    className={cn(
                      "flex-1 py-1.5 rounded-lg border text-sm capitalize",
                      recordingConfig.quality === q
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : isDark
                          ? "border-slate-600 text-slate-300"
                          : "border-slate-300 text-slate-700",
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div
                className={cn(
                  "text-xs mt-3 p-2 rounded-lg",
                  isDark
                    ? "bg-slate-800 text-slate-400"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                Low = 360p + reduced FPS + lower bitrate (smallest).
              </div>
            </div>
          </>
        )}

        {tab === "automation" && (
          <>
            <div className={sectionCls}>
              <div
                className={cn(
                  "text-sm font-semibold flex items-center gap-2 mb-2",
                  isDark ? "text-slate-200" : "text-slate-800",
                )}
              >
                <Settings2 size={14} /> Selection Actions
              </div>
              <div
                className={cn(
                  "text-xs mb-3",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                Select text in dialogues or subtitles → opens Google/Bing with
                your prompt.
              </div>

              <div className="space-y-3">
                <div
                  className={cn(
                    "font-semibold text-xs uppercase tracking-wider",
                    isDark ? "text-indigo-300" : "text-indigo-700",
                  )}
                >
                  Dialogue Feedback
                </div>
                <ToggleRow
                  title="Google feedback"
                  desc="Select dialogue text → Google"
                  isDark={isDark}
                  value={settings.automation.selectionFeedbackGoogle}
                  onToggle={() =>
                    updAutomation(
                      "selectionFeedbackGoogle",
                      !settings.automation.selectionFeedbackGoogle,
                    )
                  }
                />
                <ToggleRow
                  title="Bing feedback"
                  desc="Select dialogue text → Bing"
                  isDark={isDark}
                  value={settings.automation.selectionFeedbackBing}
                  onToggle={() =>
                    updAutomation(
                      "selectionFeedbackBing",
                      !settings.automation.selectionFeedbackBing,
                    )
                  }
                />

                <div>
                  <label className={labelCls}>Feedback Prompt Template</label>
                  <textarea
                    className={cn(inputCls, "h-16 resize-none")}
                    value={settings.automation.feedbackPrompt}
                    onChange={(e) =>
                      updAutomation("feedbackPrompt", e.target.value)
                    }
                    placeholder="Give detailed feedback and improved version for:"
                  />
                  <div
                    className={cn(
                      "text-xs mt-1",
                      isDark ? "text-slate-500" : "text-slate-400",
                    )}
                  >
                    The selected text will be appended after your prompt.
                  </div>
                </div>

                <div
                  className={cn(
                    "border-t pt-3",
                    isDark ? "border-slate-700" : "border-slate-200",
                  )}
                />

                <div
                  className={cn(
                    "font-semibold text-xs uppercase tracking-wider",
                    isDark ? "text-emerald-300" : "text-emerald-700",
                  )}
                >
                  Subtitle Answers
                </div>
                <ToggleRow
                  title="Google answer"
                  desc="Select subtitle text → Google"
                  isDark={isDark}
                  value={settings.automation.selectionAnswerGoogle}
                  onToggle={() =>
                    updAutomation(
                      "selectionAnswerGoogle",
                      !settings.automation.selectionAnswerGoogle,
                    )
                  }
                />
                <ToggleRow
                  title="Bing answer"
                  desc="Select subtitle text → Bing"
                  isDark={isDark}
                  value={settings.automation.selectionAnswerBing}
                  onToggle={() =>
                    updAutomation(
                      "selectionAnswerBing",
                      !settings.automation.selectionAnswerBing,
                    )
                  }
                />

                <div>
                  <label className={labelCls}>Answer Prompt Template</label>
                  <textarea
                    className={cn(inputCls, "h-16 resize-none")}
                    value={settings.automation.answerPrompt}
                    onChange={(e) =>
                      updAutomation("answerPrompt", e.target.value)
                    }
                    placeholder="Answer this question clearly:"
                  />
                </div>

                <div
                  className={cn(
                    "border-t pt-3",
                    isDark ? "border-slate-700" : "border-slate-200",
                  )}
                />

                <ToggleRow
                  title="Open in popup window"
                  desc="Use smaller popup instead of new tab"
                  isDark={isDark}
                  value={settings.automation.openInPopup}
                  onToggle={() =>
                    updAutomation(
                      "openInPopup",
                      !settings.automation.openInPopup,
                    )
                  }
                />
              </div>
            </div>
          </>
        )}

        {tab === "hotkeys" && (
          <div className={sectionCls}>
            <h4
              className={cn(
                "font-semibold mb-3",
                isDark ? "text-white" : "text-slate-800",
              )}
            >
              Keyboard Shortcuts
            </h4>
            {[
              ["Ctrl+Shift+S", "Start/Stop Transcription"],
              ["Ctrl+Shift+Space", "Switch Speaker"],
              ["Ctrl+Shift+R", "Start/Stop Recording"],
              ["Ctrl+Shift+X", "Open/Close Settings"],
              ["Ctrl+Shift+H", "Open/Close History"],
              ["Ctrl+Shift+M", "Mute/Unmute Tutor"],
              ["Ctrl+Shift+L", "Mute/Unmute Learner"],
              ["Ctrl+Shift+G", "Toggle Ghost Mode"],
              ["Ctrl+Shift+N", "New Session"],
              ["Escape", "Close Panels"],
            ].map(([key, action]) => (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between py-2 border-b last:border-0",
                  isDark ? "border-slate-700" : "border-slate-200",
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    isDark ? "text-slate-300" : "text-slate-700",
                  )}
                >
                  {action}
                </span>
                <kbd
                  className={cn(
                    "px-2 py-1 rounded text-xs font-mono",
                    isDark
                      ? "bg-slate-700 text-slate-200"
                      : "bg-slate-100 text-slate-700",
                  )}
                >
                  {key}
                </kbd>
              </div>
            ))}

            <div
              className={cn(
                "mt-4 p-3 rounded-lg",
                isDark
                  ? "bg-amber-900/30 text-amber-300"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              <p className="text-xs">
                <strong>Browser support:</strong> Speech Recognition requires
                Chrome or Microsoft Edge. Firefox/Safari can still record.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function Toggle({
  isOn,
  onToggle,
  isDark,
}: {
  isOn: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        isOn ? "bg-indigo-600" : isDark ? "bg-slate-700" : "bg-slate-300",
      )}
      aria-pressed={isOn}
    >
      <span
        className={cn(
          "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
          isOn ? "left-5" : "left-0.5",
        )}
      />
    </button>
  );
}

function ToggleRow({
  title,
  desc,
  value,
  onToggle,
  isDark,
}: {
  title: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div
          className={cn(
            "text-sm font-medium",
            isDark ? "text-slate-200" : "text-slate-800",
          )}
        >
          {title}
        </div>
        <div
          className={cn(
            "text-xs mt-0.5",
            isDark ? "text-slate-400" : "text-slate-500",
          )}
        >
          {desc}
        </div>
      </div>
      <Toggle isOn={value} onToggle={onToggle} isDark={isDark} />
    </div>
  );
}

function VoiceSelect({
  label,
  value,
  onChange,
  voices,
  labelCls,
  inputCls,
  selectCls,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  voices: VoiceInfo[];
  isDark?: boolean;
  labelCls: string;
  inputCls: string;
  selectCls: string;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? voices.filter(
        (v) =>
          v.name.toLowerCase().includes(q.toLowerCase()) ||
          v.lang.toLowerCase().includes(q.toLowerCase()),
      )
    : voices;

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        className={cn(inputCls, "mb-1")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search voices…"
      />
      <select
        className={selectCls}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Auto</option>
        {filtered.map((v) => (
          <option key={`${v.name}_${v.lang}`} value={v.name}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
    </div>
  );
}
