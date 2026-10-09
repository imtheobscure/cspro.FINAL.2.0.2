"use client";

import React, { useState } from "react";
import { soundEffects } from "@/utils/audio";
import { mountLocalUnityBuild } from "@/lib/localUnity";
import type { ConsoleGame } from "@/data/catalog";
import { findGame } from "@/data/catalog";
import { detectProxy, resolvePlayable } from "@/lib/proxy";
import { X, Link2, FolderOpen, Play, Gamepad2, AlertCircle, Loader2, PlaySquare } from "lucide-react";

interface LoadUnityGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameLoaded: (game: ConsoleGame) => void;
}

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80";

export default function LoadUnityGameModal({ isOpen, onClose, onGameLoaded }: LoadUnityGameModalProps) {
  const [tab, setTab] = useState<"youtube" | "local" | "url">("youtube");
  const [ytInput, setYtInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const reset = () => {
    setError("");
    setBusy(false);
    setProgress(null);
  };

  /**
   * Add a Playable by ID or URL.
   *
   * The bundled catalog (1,649 games) already knows each game's build location, so
   * an ID found there costs nothing. Anything else has to be looked up on
   * youtube.com, which only the proxy can do — in the browser, YouTube's HTML is
   * unreadable (no CORS headers). When there is no proxy this says so instead of
   * pretending, and the game is still one click away on YouTube itself.
   */
  const submitYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setBusy(true);
    try {
      const raw = ytInput.trim();
      const idMatch = raw.match(/playables\/([A-Za-z0-9_-]{10,})/);
      const id = idMatch ? idMatch[1] : raw;
      if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) {
        setError("That doesn't look like a Playables ID or link. Try youtube.com/playables/<id>.");
        setBusy(false);
        return;
      }

      const info = await detectProxy();
      const resolved = await resolvePlayable(id, info);
      if (resolved.error || !resolved.buildHost) {
        setError(resolved.error || "Could not resolve that Playable.");
        setBusy(false);
        return;
      }

      onGameLoaded({
        id: resolved.id,
        title: titleInput.trim() || resolved.title || resolved.id,
        genre: resolved.genre || "Arcade",
        thumbnailUrl: resolved.thumbnailUrl || FALLBACK_THUMB,
        plays: "",
        playsNumeric: 0,
        developer: resolved.developer || "",
        publisher: "",
        publishDate: "",
        publishedAt: Date.now(),
        description: resolved.description || "Loaded from YouTube Playables",
        source: "youtube",
        youtubeUrl: `https://www.youtube.com/playables/${resolved.id}`,
        buildHost: resolved.buildHost,
        entryPath: resolved.entryPath,
        hash: resolved.hash,
      });
      soundEffects.playFanfare();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    let url = urlInput.trim();
    if (!url) return setError("Enter a URL.");
    if (/youtube\.com\/playables\//.test(url)) {
      // A catalog game needs no lookup at all.
      const known = findGame(url.match(/playables\/([A-Za-z0-9_-]{10,})/)?.[1] || "");
      if (known) {
        onGameLoaded(known);
        soundEffects.playFanfare();
        onClose();
        return;
      }
      setTab("youtube");
      setYtInput(url);
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    onGameLoaded({
      id: `url-${Date.now().toString(36)}`,
      title: titleInput.trim() || new URL(url).hostname,
      genre: "Arcade",
      thumbnailUrl: FALLBACK_THUMB,
      plays: "",
      playsNumeric: 0,
      developer: new URL(url).hostname,
      publisher: "",
      publishDate: "",
      publishedAt: Date.now(),
      description: `External Unity WebGL build hosted at ${new URL(url).hostname}`,
      source: "custom-url",
      directUrl: url,
    });
    soundEffects.playFanfare();
    onClose();
  };

  const onFolderPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    reset();
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      const mounted = await mountLocalUnityBuild(files, (done, total) => setProgress({ done, total }));
      const folderName =
        ((files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || "").split("/")[0] || "Local Unity Game";
      onGameLoaded({
        id: mounted.gameId,
        title: titleInput.trim() || folderName,
        genre: "Arcade",
        thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
        plays: "",
        playsNumeric: 0,
        developer: "Local build",
        publisher: "",
        publishDate: "",
        publishedAt: Date.now(),
        description: `Local Unity WebGL build (${mounted.fileCount} files, ${(mounted.totalBytes / 1048576).toFixed(1)} MB) served by the Tutorly service worker.`,
        source: "local",
        directUrl: mounted.entryUrl,
      });
      soundEffects.playFanfare();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">OPEN A UNITY GAME</h3>
              <p className="text-xs text-slate-400">Any YouTube Playable, a local Unity WebGL build folder, or a hosted URL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2 text-xs">
          {(
            [
              ["youtube", "YouTube Playable", PlaySquare, "bg-red-500 text-white"],
              ["local", "Local Unity Folder", FolderOpen, "bg-purple-500 text-white"],
              ["url", "Hosted WebGL URL", Link2, "bg-cyan-500 text-slate-950"],
            ] as const
          ).map(([key, label, Icon, active]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                reset();
              }}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                tab === key ? active : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {tab === "youtube" && (
          <form onSubmit={submitYouTube} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Playables URL or ID</label>
              <div className="flex gap-2">
                {/*
                  `min-w-0` is load-bearing: a flex item defaults to `min-width:auto`,
                  and an input's intrinsic width is its `size` attribute. Without it the
                  field refused to shrink, so on a phone it pushed the Example button
                  past the card's `overflow-hidden` edge and clipped its label.
                */}
                <input
                  value={ytInput}
                  onChange={(e) => setYtInput(e.target.value)}
                  placeholder="https://www.youtube.com/playables/Ugk… or just the Ugk… ID"
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-red-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setYtInput("https://www.youtube.com/playables/UgkxWYxG29y8GASEQHhWfPBFlUdwNwfCQEUK")}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-mono whitespace-nowrap"
                >
                  Example
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                The console fetches the page, finds the game&apos;s real Unity WebGL build on
                <span className="font-mono text-slate-400"> playables.usercontent.goog</span>, proxies it, and links the
                ytgame SDK so scores flow into your leaderboard automatically.
              </p>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Custom title (optional)</label>
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              {busy ? "RESOLVING UNITY BUILD…" : "INDEX & PLAY"}
            </button>
          </form>
        )}

        {tab === "local" && (
          <div className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Game title (optional)</label>
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="My Unity Prototype"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
            <label className="border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-950/60 rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition text-center">
              {busy ? (
                <Loader2 className="w-10 h-10 text-purple-400 mb-2 animate-spin" />
              ) : (
                <FolderOpen className="w-10 h-10 text-purple-400 mb-2" />
              )}
              <span className="text-white font-semibold text-sm">
                {busy && progress ? `Mounting ${progress.done}/${progress.total} files…` : "Select your Unity WebGL build folder"}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                The folder Unity exported: <span className="font-mono">index.html</span>, <span className="font-mono">Build/</span>,{" "}
                <span className="font-mono">TemplateData/</span>. Files never leave your browser.
              </span>
              <input
                type="file"
                multiple
                // @ts-expect-error – non-standard attributes for directory selection
                webkitdirectory=""
                directory=""
                onChange={onFolderPicked}
                className="hidden"
                disabled={busy}
              />
            </label>
            <p className="text-[11px] text-slate-500">
              Tip: uncompressed or “Decompression Fallback” (.unityweb) builds work best. Gzip (.gz) builds are inflated in
              your browser automatically.
            </p>
          </div>
        )}

        {tab === "url" && (
          <form onSubmit={submitUrl} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Hosted Unity WebGL URL</label>
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://itch.io/embed-upload/… or https://your-server/game/index.html"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Loaded directly in the console frame. Some hosts block embedding; YouTube Playables links are routed
                through the resolver automatically.
              </p>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Title (optional)</label>
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> LAUNCH IN CONSOLE
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
