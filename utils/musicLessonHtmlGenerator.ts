import { PremiumLesson } from "../pages/music/musicTypes";
import { normalizeLesson } from '../pages/music/lessonNormalizer';
import { musicTimingKey } from './musicTimingStore';

export { generateMusicLessonStandaloneHtml as generateMusicLessonHtml };

export interface MusicLessonHtmlOptions {
  /**
   * Relative path (inside the ZIP package) of a LOCAL media file that this lesson
   * plays. When set, the lesson points the media player at this path instead of
   * the lesson's remote `mediaUrl` — used for the "Open local file" workflow,
   * where the exported ZIP bundles the lesson HTML + the media file itself.
   */
  mediaPath?: string;
  /** Friendly label for the packaged local file (shown in the player). */
  mediaLabel?: string;
}

export function generateMusicLessonStandaloneHtml(
  lesson: PremiumLesson,
  allLessons?: PremiumLesson[],
  options?: MusicLessonHtmlOptions
): string {
  const rawList = (allLessons && allLessons.length > 0) ? allLessons : [lesson];
  const lessonsList = rawList.map(normalizeLesson);

  // Local-file packaging: the ZIP ships the media next to the HTML, so the player
  // must resolve the media by its relative path, not by the original remote URL.
  if (options?.mediaPath) {
    lessonsList[0] = { ...lessonsList[0], mediaUrl: options.mediaPath };
  }

  const lessonsJson = JSON.stringify(lessonsList).replace(/</g, '\\u003c');
  const initialMediaUrl = options?.mediaPath || lesson.mediaUrl || '';
  const initialMediaLabel = options?.mediaLabel || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Song Lesson Studio — ${escapeHtml(lesson.songTitle)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: { sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui'] }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
      background-color: #f6f7fb;
      color: #0f172a;
    }
    .dark body { background-color: #09090b; color: #fafafa; }
    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.05); border-radius: 999px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.2); border-radius: 999px; }
    .dark .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); }
    .glass-panel {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(15, 23, 42, 0.08);
    }
    .dark .glass-panel {
      background: rgba(24, 24, 27, 0.75);
      border-color: rgba(255, 255, 255, 0.1);
    }
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.92; transform: scale(1.01); }
    }
    .animate-pulse-subtle { animation: pulse-subtle 3s infinite ease-in-out; }
    .sync-row.is-active { outline: 2px solid #d946ef; outline-offset: 2px; }
    .hl-idiom { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .hl-phrasal_verb { background: #fce7f3; color: #9d174d; border-color: #f9a8d4; }
    .hl-vocab { background: #cffafe; color: #155e75; border-color: #67e8f9; }
    .hl-grammar { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
    .dark .hl-idiom { background: rgba(245,158,11,.22); color: #fcd34d; border-color: rgba(245,158,11,.4); }
    .dark .hl-phrasal_verb { background: rgba(236,72,153,.22); color: #f9a8d4; border-color: rgba(236,72,153,.4); }
    .dark .hl-vocab { background: rgba(6,182,212,.22); color: #67e8f9; border-color: rgba(6,182,212,.4); }
    .dark .hl-grammar { background: rgba(16,185,129,.22); color: #6ee7b7; border-color: rgba(16,185,129,.4); }
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:.4rem; font-weight:800; transition: all .15s ease; cursor:pointer; }
    .btn:active { transform: scale(.96); }
    #karaoke-lyrics-container .k-line { scroll-margin: 40% 0; }
    /* Readable long-form lesson cards */
    .mini-lesson-prose p { margin-bottom: .55rem; }
    .mini-lesson-prose p:last-child { margin-bottom: 0; }
    .mini-lesson-prose ul, .mini-lesson-prose ol { list-style: disc; padding-left: 1.35rem; margin: .5rem 0; }
    .mini-lesson-prose ol { list-style: decimal; }
    .mini-lesson-prose li { margin-bottom: .3rem; }
    .mini-lesson-prose strong { font-weight: 800; }
    .mini-lesson-prose code { background: rgba(99,102,241,.14); padding: .1rem .4rem; border-radius: .35rem; font-size: .92em; }
    .mini-lesson-prose h1, .mini-lesson-prose h2, .mini-lesson-prose h3 { font-weight: 900; font-size: 1.02em; margin: .7rem 0 .35rem; }
    .tap-pad { box-shadow: 0 12px 30px -10px rgba(217,70,239,.6); }

    /* ── Premium player chrome (YouTube-style) ─────────────────────────── */
    #yt-wrap iframe { width: 100%; height: 100%; border: 0; }
    .player-chrome { will-change: opacity; }
    .player-chrome.is-hidden { opacity: 0; pointer-events: none; }
    #big-play.is-hidden { opacity: 0; pointer-events: none; transform: translate(-50%, -50%) scale(.85); }

    /* ── Lyrics stage: the lyric line + its L1 translation are the hero ── */
    #lyric-panel { transition: opacity .2s ease; }
    #lyric-panel.is-hidden { opacity: 0; pointer-events: none; }
    #lyric-panel .lyric-line { font-size: 2.15rem; line-height: 1.24; font-weight: 900; color: #ffffff; text-shadow: 0 3px 24px rgba(0, 0, 0, .75); }
    #lyric-panel .lyric-l1 { font-size: 1.4rem; line-height: 1.45; font-weight: 800; color: #fde68a; margin-top: .7rem; }
    /* Audio-only stage: no artwork, no disc, no equaliser — just the lyrics. */
    #lyric-panel.mode-audio { background: radial-gradient(120% 120% at 50% 22%, rgba(112, 26, 117, .55), rgba(3, 3, 5, .95)); padding: 1.5rem 1.5rem 7rem; }
    #lyric-panel .lyric-word { cursor: pointer; transition: color .15s ease; }
    #lyric-panel .lyric-word:hover { color: #f0abfc; }
    #lyric-panel .lyric-hl { display: inline-block; padding: .05em .35em; margin: 0 .12em; border-radius: .45rem; border: 1px solid currentColor; font-weight: 800; cursor: pointer; }
    #lyric-panel .lyric-hl:hover { transform: translateY(-1px); }
    #lyric-panel .lyric-empty { font-size: 1.05rem; font-weight: 600; color: rgba(255, 255, 255, .55); }
    #lyric-panel.mode-video {
      justify-content: flex-end;
      padding-bottom: 6.5rem;
      background: linear-gradient(to top, rgba(0, 0, 0, .88), rgba(0, 0, 0, .35) 45%, transparent 72%);
    }
    #lyric-panel.mode-video .lyric-line { font-size: 1.5rem; }
    #lyric-panel.mode-video .lyric-l1 { font-size: 1.05rem; }
    @media (min-width: 1024px) {
      #lyric-panel .lyric-line { font-size: 3.15rem; }
      #lyric-panel .lyric-l1 { font-size: 1.8rem; }
      #lyric-panel.mode-video .lyric-line { font-size: 2rem; }
      #lyric-panel.mode-video .lyric-l1 { font-size: 1.2rem; }
    }
    #mini-lesson-markers > div { pointer-events: auto; }
    .speed-opt.is-active { background: rgba(217,70,239,.35); }
    input[type="range"] { height: 4px; border-radius: 999px; background: rgba(255,255,255,.28); -webkit-appearance: none; appearance: none; }
    input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 999px; background: #d946ef; box-shadow: 0 0 0 2px rgba(255,255,255,.65); }
    input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; border: 0; border-radius: 999px; background: #d946ef; }
    #premium-player:fullscreen { border-radius: 0; }
    #premium-player:fullscreen #media-stage { height: 100%; aspect-ratio: auto; }
    @keyframes caption-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    #subtitles-container { animation: caption-in .18s ease-out; }
  </style>
</head>
<body class="min-h-screen bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col selection:bg-fuchsia-500 selection:text-white">

  <!-- DATA STORAGE -->
  <script>
    window.LESSONS_DATA = ${lessonsJson};
    window.CURRENT_LESSON_INDEX = 0;
    window.INITIAL_MEDIA_URL = ${JSON.stringify(initialMediaUrl).replace(/</g, '\\u003c')};
    window.INITIAL_MEDIA_LABEL = ${JSON.stringify(initialMediaLabel).replace(/</g, '\\u003c')};
    // Shared with the Lesson Creator + React presenter: timings the tutor syncs
    // here are re-applied automatically the next time the lesson is rendered.
    window.MUSIC_SYNC_KEY = ${JSON.stringify(musicTimingKey(lessonsList[0] || lesson)).replace(/</g, '\\u003c')};
  </script>

  <!-- HEADER / NAVIGATION BAR -->
  <header class="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-zinc-800/80 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-indigo-600 flex items-center justify-center text-xl font-black shadow-lg shadow-fuchsia-500/20">
        🎤
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 font-bold dark:bg-fuchsia-500/20 dark:text-fuchsia-400 dark:border-fuchsia-500/30" id="header-level">
            ${escapeHtml(lesson.level || 'B2')}
          </span>
          <span class="text-xs text-slate-500 dark:text-zinc-400 font-medium" id="header-artist">${escapeHtml(lesson.artist)}</span>
        </div>
        <h1 class="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2" id="header-title">
          ${escapeHtml(lesson.songTitle)}
        </h1>
      </div>
    </div>

    <!-- Song Selector Dropdown (if multiple) -->
    <div id="song-selector-container" class="hidden items-center gap-2">
      <span class="text-xs font-semibold text-slate-500 dark:text-zinc-400">Song:</span>
      <select id="song-select" onchange="changeLesson(this.value)" class="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-900 dark:text-white rounded-xl px-3 py-1.5 outline-none focus:border-fuchsia-500">
      </select>
    </div>

    <!-- MAIN VIEW TABS: PLAYER vs KARAOKE (lyric syncing lives inside the player) -->
    <div class="flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 flex-wrap">
      <button id="tab-btn-player" onclick="switchView('player')" class="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white shadow-md">
        🎧 Player
      </button>
      <button id="tab-btn-karaoke" onclick="switchView('karaoke')" class="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800">
        🎤 Karaoke
      </button>
      <span class="hidden sm:inline text-[10px] font-mono text-slate-400 dark:text-zinc-500 ml-1">
        Lyric timing lives in the player’s 🎯 Sync button
      </span>
    </div>

    <!-- USER / AUDIO CONTROLS -->
    <div class="flex items-center gap-2.5">
      <button onclick="openSongSearch()" class="btn px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:from-fuchsia-400 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-fuchsia-500/20">
        🔎 <span class="hidden sm:inline">Find Song</span>
      </button>
      <div id="learner-info-pill" class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs font-semibold">
        <span class="text-indigo-500">👤</span>
        <span id="learner-info-text" class="text-slate-600 dark:text-zinc-300">Learner: Active</span>
      </div>
      <label class="btn px-3 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 cursor-pointer">
        📂 <span class="hidden sm:inline">Load Media</span>
        <input type="file" id="media-file-input" accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.ogg,.webm,.mov,.mkv" class="hidden" onchange="handleMediaUpload(event)" />
      </label>
      <button onclick="toggleTheme()" id="theme-toggle" title="Switch light / dark theme" class="btn px-3 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-bold">
        🌙 <span class="hidden sm:inline">Dark</span>
      </button>
    </div>
  </header>

  <!-- SONG SEARCH MODAL (free iTunes Search API — 30s previews, no key) -->
  <div id="song-search-modal" class="fixed inset-0 z-[120] hidden items-center justify-center p-4 bg-slate-900/60 dark:bg-zinc-950/85 backdrop-blur-xl">
    <div class="glass-panel max-w-2xl w-full rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[88vh]">
      <div class="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div>
          <span class="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 font-bold dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:border-fuchsia-500/30">Free Streaming</span>
          <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1">🔎 Find a Song</h3>
        </div>
        <button onclick="closeSongSearch()" class="text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg">✕</button>
      </div>
      <div class="flex gap-2 py-4">
        <input id="song-search-input" type="text" placeholder="Search any song, artist or album..." onkeydown="if(event.key==='Enter')searchSongs()"
          class="flex-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-sm text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-fuchsia-500" />
        <button onclick="searchSongs()" class="btn px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/20">
          Search
        </button>
      </div>
      <div id="song-search-results" class="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        <p class="text-xs text-slate-400 dark:text-zinc-500 text-center py-10">Search iTunes' free catalog — listen to 30-second previews, then load one as your lesson backing track.</p>
      </div>
    </div>
  </div>

  <!-- MAIN APP CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col gap-6">

    <!-- LEARNER PROFILE BANNER -->
    <div id="profile-banner" class="glass-panel p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 via-white to-fuchsia-50 dark:from-indigo-950/40 dark:via-zinc-900/60 dark:to-fuchsia-950/40">
      <div class="flex items-center gap-4">
        <div id="prof-avatar" class="w-12 h-12 rounded-2xl bg-fuchsia-100 dark:bg-fuchsia-500/20 border border-fuchsia-200 dark:border-fuchsia-500/40 flex items-center justify-center text-2xl">
          🎤
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 id="prof-name" class="text-base font-black text-slate-900 dark:text-white">Learner</h3>
            <span id="prof-level" class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">B2</span>
            <span id="prof-l1" class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">Native: Spanish</span>
          </div>
          <p id="prof-focus-goals" class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 max-w-2xl truncate">
            Goals &amp; Focus: Phrasal verbs, idioms &amp; natural fluency
          </p>
        </div>
      </div>
      <div class="flex items-center gap-4 text-xs font-mono">
        <div class="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
          XP Score: <span id="score-counter" class="font-black text-sm">0</span>
        </div>
      </div>
    </div>

    <!-- ============ VIEW 1: INTERACTIVE PLAYER ============ -->
    <section id="view-player" class="flex flex-col gap-6">

      <!-- ===== PREMIUM MEDIA PLAYER (YouTube-style chrome) ===== -->
      <div id="premium-player"
           class="premium-player group/player relative rounded-[22px] overflow-hidden bg-black ring-1 ring-black/40 shadow-[0_30px_70px_-25px_rgba(15,23,42,0.55)]">

        <div id="media-stage" class="relative w-full aspect-video bg-black overflow-hidden select-none"
             ondragover="event.preventDefault()" ondrop="handleMediaDrop(event)" onclick="handleStageClick(event)" ondblclick="toggleFullscreen()">

          <!-- Unified media element (plays BOTH audio and video files) -->
          <video id="media-el" class="absolute inset-0 w-full h-full object-contain" playsinline controlslist="nodownload noremoteplayback" disablepictureinpicture="false"></video>

          <!-- YouTube / direct embed host -->
          <div id="yt-wrap" class="absolute inset-0 hidden"></div>

          <!-- LYRICS STAGE — the lyric line and its L1 translation are the hero here -->
          <div id="lyric-panel" class="absolute inset-0 flex flex-col items-center justify-center px-5 sm:px-10 text-center">
            <div id="subtitles-container" class="w-full max-w-5xl space-y-3">
              <p class="text-white/55 text-lg font-semibold">Press ▶ Play — the synced lyric line appears here.</p>
            </div>
          </div>

          <!-- Empty state -->
          <div id="media-empty" class="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-slate-900 via-zinc-900 to-black">
            <div class="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-3xl mb-3">🎧</div>
            <p class="text-base font-black text-white">Load the song to start the lesson</p>
            <p class="text-xs text-white/60 mt-1">
              Paste a video/audio link, open a local file, or drop it anywhere on this player.
            </p>
            <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button id="empty-load-lesson" onclick="useLessonMedia()" class="btn hidden px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/25">
                ▶ Play lesson media
              </button>
              <label class="btn px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-black uppercase tracking-wider cursor-pointer">
                📂 Open local file
                <input type="file" accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.ogg,.webm,.mov,.mkv" class="hidden" onchange="handleMediaUpload(event)" />
              </label>
              <button onclick="openSyncDock()" class="btn px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-black uppercase tracking-wider">
                🎯 Edit &amp; sync lyrics
              </button>
            </div>
          </div>

          <!-- CENTER PLAY / REPLAY OVERLAY -->
          <button id="big-play" onclick="togglePlay()" aria-label="Play"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-black/55 hover:bg-fuchsia-600/90 backdrop-blur border border-white/25 text-white text-3xl flex items-center justify-center shadow-2xl transition-all duration-200">
            ▶
          </button>

          <!-- BOTTOM CONTROL BAR -->
          <div id="player-controls" class="player-chrome absolute bottom-0 inset-x-0 px-3 pb-2 pt-16 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300">

            <!-- SCRUBBER -->
            <div id="scrubber-track" class="relative h-6 flex items-center cursor-pointer"
                 onclick="handleSeek(event)" onmousemove="handleScrubHover(event)" onmouseleave="hideScrubTip()">
              <div class="pointer-events-none absolute inset-x-0 h-1 rounded-full bg-white/25 overflow-hidden group-hover/player:h-1.5 transition-all">
                <div id="scrubber-buffered" class="absolute inset-y-0 left-0 bg-white/30 w-0 transition-[width] duration-300"></div>
                <div id="scrubber-progress" class="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-500 to-indigo-500 w-0"></div>
              </div>
              <div id="mini-lesson-markers" class="pointer-events-none absolute inset-x-0 h-1 rounded-full group-hover/player:h-1.5"></div>
              <div id="scrubber-knob" class="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-fuchsia-500 ring-2 ring-white/70 shadow-lg scale-0 group-hover/player:scale-100 transition-transform" style="left:0%"></div>
              <div id="scrub-tip" class="pointer-events-none absolute hidden -top-9 -translate-x-1/2 px-2 py-1 rounded-lg bg-black/90 border border-white/20 text-[11px] text-white font-mono whitespace-nowrap shadow-xl">0:00</div>
            </div>

            <!-- BUTTON ROW -->
            <div class="flex items-center gap-1 sm:gap-1.5 text-white">
              <button id="btn-play-pause" onclick="togglePlay()" class="btn w-11 h-11 rounded-full hover:bg-white/15 text-2xl" title="Play / Pause (Space)">▶</button>
              <button onclick="goToPrevLine()" class="btn w-10 h-10 rounded-full hover:bg-white/15 text-base" title="Previous lyric line">⏮</button>
              <button onclick="goToNextLine()" class="btn w-10 h-10 rounded-full hover:bg-white/15 text-base" title="Next lyric line">⏭</button>
              <button onclick="rewind(5)" class="btn hidden sm:flex w-10 h-10 rounded-full hover:bg-white/15 text-[11px] font-black" title="Back 5 seconds (←)">↺5</button>
              <button onclick="forward(5)" class="btn hidden sm:flex w-10 h-10 rounded-full hover:bg-white/15 text-[11px] font-black" title="Forward 5 seconds (→)">↻5</button>
              <button id="btn-loop-line" onclick="toggleLineLoop()" class="btn h-10 px-3 rounded-full hover:bg-white/15 text-xs font-black" title="Repeat the current lyric line">🔁<span class="hidden sm:inline ml-1">Line</span></button>

              <!-- VOLUME -->
              <div class="flex items-center gap-1 pl-1">
                <button onclick="toggleMute()" id="btn-mute" class="btn w-10 h-10 rounded-full hover:bg-white/15 text-lg" title="Mute (M)">🔊</button>
                <input type="range" id="vol-slider" min="0" max="1" step="0.05" value="1" oninput="setVolume(this.value)"
                       class="w-16 sm:w-24 accent-fuchsia-500 cursor-pointer" title="Volume (↑ / ↓)" />
              </div>

              <div class="flex-1"></div>

              <span class="text-[11px] font-mono text-white/85 tabular-nums whitespace-nowrap">
                <span id="time-current">0:00</span><span class="text-white/40"> / </span><span id="time-duration">0:00</span>
              </span>

              <button id="btn-captions" onclick="toggleCaptions()" class="btn h-10 px-2.5 rounded-full hover:bg-white/15 text-[11px] font-black" title="Show / hide the lyrics (C)">CC</button>

              <button id="btn-pip" onclick="togglePiP()" class="btn hidden sm:flex w-10 h-10 rounded-full hover:bg-white/15 text-sm" title="Picture in picture">🖼️</button>

              <button id="btn-sync-dock" onclick="toggleSyncDock()" class="btn h-10 px-3 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-black" title="Sync the lyrics">🎯<span class="hidden sm:inline ml-1">Sync</span></button>

              <!-- SPEED MENU -->
              <div class="relative">
                <button onclick="toggleSpeedMenu(event)" class="btn h-10 px-3 rounded-full hover:bg-white/15 text-[11px] font-black" title="Playback speed">
                  <span id="speed-label">1x</span> ⚙
                </button>
                <div id="speed-menu" class="hidden absolute bottom-12 right-0 w-32 p-1.5 rounded-2xl bg-black/95 border border-white/15 shadow-2xl backdrop-blur">
                  <button onclick="setPlaybackSpeed('0.5')" data-speed="0.5" class="speed-opt w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15">0.5x</button>
                  <button onclick="setPlaybackSpeed('0.75')" data-speed="0.75" class="speed-opt w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15">0.75x</button>
                  <button onclick="setPlaybackSpeed('1')" data-speed="1" class="speed-opt w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15">Normal</button>
                  <button onclick="setPlaybackSpeed('1.25')" data-speed="1.25" class="speed-opt w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15">1.25x</button>
                  <button onclick="setPlaybackSpeed('1.5')" data-speed="1.5" class="speed-opt w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15">1.5x</button>
                  <button onclick="setPlaybackSpeed('2')" data-speed="2" class="speed-opt w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15">2x</button>
                </div>
              </div>

              <button onclick="toggleFullscreen()" id="btn-fullscreen" class="btn w-10 h-10 rounded-full hover:bg-white/15 text-base" title="Fullscreen (F)">⛶</button>
            </div>
          </div>

          <!-- ── SIMPLE IN-PLAYER LYRIC SYNC TOOLS ─────────────────────────── -->
          <div id="sync-dock" class="hidden absolute inset-0 z-30 overflow-y-auto custom-scrollbar bg-slate-950/96 backdrop-blur-xl text-white">
            <div class="p-4 sm:p-5">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-black">🎯 Sync the lyrics</span>
                  <span class="text-[11px] text-white/60">Play the song, then tap when each line starts — timings apply instantly.</span>
                </div>
                <button onclick="closeSyncDock()" class="btn px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-black">Close ✕</button>
              </div>

              <!-- TAP SYNC -->
              <div class="flex flex-wrap items-center gap-2 mt-3">
                <button id="btn-tap-toggle" onclick="toggleTapMode()" class="btn px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/25">
                  ▶ Start tap sync
                </button>
                <button id="btn-tap" onclick="tapStamp()" disabled class="tap-pad btn px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-black uppercase tracking-widest disabled:opacity-40">
                  ⏱ TAP
                </button>
                <span id="tap-status" class="text-[11px] text-white/70">Tap sync is off.</span>
                <span class="text-[11px] text-white/70">Next line: <strong id="tap-next-line" class="text-white">—</strong></span>
                <label class="flex items-center gap-1.5 text-[11px] font-bold text-white/70 ml-auto">
                  <input type="checkbox" id="tap-auto-advance" checked class="accent-fuchsia-500" onchange="refreshTapPanel()" />
                  Advance automatically
                </label>
              </div>

              <!-- QUICK TOOLS -->
              <div class="flex flex-wrap items-center gap-2 mt-3">
                <button onclick="goToPrevLine()" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">◀ Prev line</button>
                <button onclick="goToNextLine()" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">Next line ▶</button>
                <span class="w-px h-6 bg-white/15"></span>
                <button onclick="stampCurrent('start')" class="btn h-9 px-3 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/40 text-xs font-black">⏱ Set start = now</button>
                <button onclick="stampCurrent('end')" class="btn h-9 px-3 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-xs font-black">⏱ Set end = now</button>
                <button onclick="nudgeCurrent(-0.2)" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">−0.2s</button>
                <button onclick="nudgeCurrent(0.2)" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">+0.2s</button>
                <span class="w-px h-6 bg-white/15"></span>
                <button onclick="shiftAllSync(-offsetValue())" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">Shift all −</button>
                <input id="sync-offset" type="number" step="0.1" value="0.5" class="w-16 p-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-mono text-center text-white" />
                <button onclick="shiftAllSync(offsetValue())" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">Shift all +</button>
                <button onclick="autoFitSync()" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">⚖ Auto-fit</button>
                <button onclick="resetSyncFromLesson()" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">↩ Reset</button>
                <span class="w-px h-6 bg-white/15"></span>
                <button onclick="exportSyncedJson()" class="btn h-9 px-3 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-xs font-black">⬇ Export JSON</button>
                <button onclick="saveSyncToBrowser()" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">💾 Save</button>
              </div>

              <!-- LYRICS EDITOR -->
              <details class="mt-3 rounded-xl border border-white/15 bg-white/5 p-3">
                <summary class="cursor-pointer text-[11px] font-black uppercase tracking-wider text-white/80">📝 Paste / edit the lyrics</summary>
                <p class="text-[11px] text-white/55 mt-2">One lyric line per row. “Split into lines” rebuilds the timeline; the tap/copy tools above then fine-tune it.</p>
                <textarea id="lyrics-paste" rows="5" placeholder="One lyric line per row..." class="w-full mt-2 p-3 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none focus:border-fuchsia-500 custom-scrollbar"></textarea>
                <div class="flex flex-wrap gap-2 mt-2">
                  <button onclick="replaceLyricsFromPaste()" class="btn h-9 px-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-xs font-black">Split into lines</button>
                  <button onclick="fillPasteFromLesson()" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">Load current lines</button>
                  <button onclick="appendPasteToLyrics()" class="btn h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">Append to timeline</button>
                </div>
              </details>

              <!-- LINE LIST -->
              <div class="grid grid-cols-12 gap-2 px-2 mt-4 text-[10px] font-mono uppercase tracking-widest text-white/45 font-bold">
                <span class="col-span-1 text-center">#</span>
                <span class="col-span-2 text-center">Start (s)</span>
                <span class="col-span-2 text-center">End (s)</span>
                <span class="col-span-5">Lyric line</span>
                <span class="col-span-2 text-right">Tools</span>
              </div>
              <div id="sync-rows" class="flex flex-col gap-2 mt-2 max-h-52 overflow-y-auto custom-scrollbar pr-1"></div>
              <p id="sync-summary" class="text-[11px] font-mono text-white/60 mt-2"></p>
            </div>
          </div>
        </div>
      </div>

      <!-- SOURCE BAR -->
      <div class="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-4">

        <!-- MEDIA SOURCE BAR -->
        <div class="flex flex-wrap items-center gap-2">
          <label class="btn px-3 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200 cursor-pointer">
            📁 Local file
            <input type="file" accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.ogg,.webm,.mov,.mkv" class="hidden" onchange="handleMediaUpload(event)" />
          </label>
          <div class="flex-1 min-w-[240px] flex items-center gap-2">
            <input id="media-url-input" type="text" placeholder="Paste an audio / video link — MP3, MP4, M4A… or a YouTube link"
              onkeydown="if(event.key==='Enter')applyMediaUrl()"
              class="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 outline-none focus:border-fuchsia-500" />
            <button onclick="applyMediaUrl()" class="btn px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider">
              Load link
            </button>
          </div>
          <button onclick="useLessonMedia()" class="btn px-3 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200">
            ♻ Use lesson media
          </button>
          <span id="media-status" class="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate max-w-full">No media loaded</span>
        </div>

        <p class="text-[10px] text-slate-400 dark:text-zinc-500 font-mono text-center">
          Shortcuts — Space play/pause · ← / → 5s · ↑ / ↓ volume · M mute · C show/hide lyrics · F fullscreen · 🎯 Sync opens the lyric tools
        </p>
      </div>

      <!-- HIGHLIGHT LEGEND -->
      <div class="glass-panel rounded-3xl p-5 flex flex-col gap-3">
        <h4 class="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-bold">Vocabulary Legend</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center gap-2 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Idiom / Phrase
          </div>
          <div class="p-2.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 font-bold flex items-center gap-2 dark:bg-pink-500/15 dark:border-pink-500/30 dark:text-pink-300">
            <span class="w-2.5 h-2.5 rounded-full bg-pink-400"></span> Phrasal Verb
          </div>
          <div class="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 font-bold flex items-center gap-2 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Key Vocab
          </div>
          <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center gap-2 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Grammar Focus
          </div>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-zinc-400">Tap any highlighted word in the lyrics for its meaning, L1 translation and example.</p>
      </div>

      <!-- INTERACTIVE MINI-LESSONS (full width) -->
      <div class="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
        <div class="flex flex-wrap justify-between items-end gap-2">
          <div>
            <h4 class="text-sm font-black text-slate-900 dark:text-white">Interactive Mini-Lessons</h4>
            <p class="text-xs text-slate-500 dark:text-zinc-400">Pause the song, open a lesson and keep practising — every card comes with an easy native-language explanation.</p>
          </div>
          <span class="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Triggers automatically during playback</span>
        </div>
        <div id="mini-lessons-list" class="flex flex-col gap-3">
          <!-- Rendered dynamically -->
        </div>
      </div>
    </section>

    <!-- ============ VIEW 2: STUDIO KARAOKE ============ -->
    <section id="view-karaoke" class="hidden flex-col gap-6">
      <div class="glass-panel rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden">

        <!-- AUDIO SPECTRUM VISUALIZER CANVAS -->
        <div class="h-28 w-full bg-slate-50 dark:bg-zinc-950/90 rounded-2xl border border-slate-200 dark:border-zinc-800/80 relative overflow-hidden flex items-center justify-center">
          <canvas id="karaoke-canvas" class="w-full h-full"></canvas>
          <div class="absolute top-3 left-4 flex items-center gap-2 text-xs font-mono text-fuchsia-600 dark:text-fuchsia-400">
            <span class="w-2 h-2 rounded-full bg-fuchsia-500 animate-ping"></span> Live Audio Frequency
          </div>
        </div>

        <!-- SCROLLING KARAOKE LYRICS DISPLAY -->
        <div class="h-[420px] overflow-y-auto custom-scrollbar p-6 rounded-2xl bg-white dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 flex flex-col gap-3 text-center" id="karaoke-lyrics-container">
          <!-- Lyrics lines rendered dynamically -->
        </div>

        <!-- KARAOKE FOOTER CONTROLS -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-zinc-800">
          <div class="flex items-center gap-3">
            <button id="btn-karaoke-play" onclick="togglePlay()" class="btn px-6 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-fuchsia-500/20">
              ▶ Start Karaoke
            </button>
            <button onclick="toggleMicrophone()" id="btn-mic" class="btn px-5 py-3 rounded-2xl bg-white border border-slate-300 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800">
              🎙️ Mic Off
            </button>
          </div>

          <div class="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-zinc-400">
            <span>Score Multiplier: <strong class="text-emerald-600 dark:text-emerald-400 font-bold">2.5x XP</strong></span>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- DICTIONARY & HIGHLIGHT MODAL -->
  <div id="dict-modal" class="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-slate-900/50 dark:bg-zinc-950/80 backdrop-blur-md">
    <div class="glass-panel max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-4">
      <button onclick="closeDictModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg">✕</button>
      <div class="flex items-start justify-between gap-3">
        <div>
          <span id="dict-type" class="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 font-bold dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:border-fuchsia-500/30">
            Vocabulary
          </span>
          <h3 id="dict-word" class="text-2xl font-black text-slate-900 dark:text-white mt-1">Word</h3>
        </div>
        <button onclick="speakCurrentDictWord()" class="btn p-3 rounded-2xl bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-700 text-lg dark:bg-indigo-600/30 dark:hover:bg-indigo-600/50 dark:border-indigo-500/40 dark:text-indigo-300">
          🔊
        </button>
      </div>
      <div class="space-y-3 text-sm">
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800">
          <span class="text-xs font-mono uppercase text-slate-400 dark:text-zinc-500 font-bold block mb-1">Meaning &amp; Context</span>
          <p id="dict-meaning" class="text-slate-700 dark:text-zinc-200 leading-relaxed"></p>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800">
          <span class="text-xs font-mono uppercase text-slate-400 dark:text-zinc-500 font-bold block mb-1">Native L1 Translation</span>
          <p id="dict-translation" class="text-fuchsia-700 dark:text-fuchsia-300 font-medium"></p>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800">
          <span class="text-xs font-mono uppercase text-slate-400 dark:text-zinc-500 font-bold block mb-1">Example Sentence</span>
          <p id="dict-example" class="text-slate-600 dark:text-zinc-300 italic"></p>
        </div>
      </div>
      <button onclick="closeDictModal()" class="btn w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-2xl dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white">
        Close
      </button>
    </div>
  </div>

  <!-- CHALLENGE / MINI-LESSON MODAL (SECTIONED & COLOR CODED) -->
  <div id="challenge-modal" class="fixed inset-0 z-[110] hidden items-center justify-center p-4 bg-slate-900/60 dark:bg-zinc-950/90 backdrop-blur-xl overflow-y-auto">
    <div class="glass-panel max-w-5xl w-full rounded-3xl p-5 sm:p-7 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar">

      <!-- MODAL HEADER -->
      <div class="flex flex-wrap justify-between items-start gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 font-bold dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:border-fuchsia-500/30">
            Interactive Mini-Lesson
          </span>
          <span id="mini-title" class="text-lg sm:text-xl font-black text-slate-900 dark:text-white"></span>
        </div>
        <button onclick="closeChallengeModal()" class="btn px-4 py-1.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
          Resume Media ⏩
        </button>
      </div>

      <!-- NATIVE-LANGUAGE (L1) HEADLINE -->
      <div id="mini-l1-head" class="hidden rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 px-5 py-4">
        <p id="mini-l1-lang" class="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-300 font-bold mb-1">🗣 Easy version</p>
        <p id="mini-l1-title" class="text-base font-black text-amber-900 dark:text-amber-200"></p>
        <p id="mini-l1-summary" class="text-[15px] leading-7 text-amber-900/90 dark:text-amber-100/90 mt-1"></p>
      </div>

      <!-- SECTIONED & COLOR-CODED LESSON CARDS (full width) -->
      <div id="mini-cards-container" class="space-y-5">
        <!-- Rendered dynamically with clean callout boxes -->
      </div>

      <!-- CCQ / PRACTICE SECTION -->
      <div id="ccq-container" class="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 space-y-3">
        <h4 class="text-xs font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2">
          <span>🧠</span> Quick Concept Check
        </h4>
        <div id="ccq-questions" class="space-y-2"></div>
      </div>

      <!-- CAT MASCOT FEEDBACK BOX -->
      <div class="p-4 rounded-2xl bg-gradient-to-r from-fuchsia-50 to-indigo-50 border border-fuchsia-200 dark:from-fuchsia-950/40 dark:to-indigo-950/40 dark:border-fuchsia-500/30 flex items-center gap-4">
        <span class="text-3xl">😺</span>
        <div class="flex-1">
          <span class="text-[10px] font-mono uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400 font-bold block">Tutor Feedback</span>
          <p id="cat-feedback-text" class="text-[15px] leading-7 text-slate-700 dark:text-zinc-200 font-medium">Read through the key concepts above and test your understanding!</p>
          <p id="cat-feedback-l1" class="hidden text-[15px] leading-7 text-amber-800 dark:text-amber-200 mt-1.5"></p>
        </div>
      </div>

      <!-- ACTION FOOTER -->
      <div class="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
        <button onclick="finishMiniLesson()" class="btn px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20">
          Complete &amp; Resume Song (+50 XP)
        </button>
      </div>
    </div>
  </div>

  <!-- TRANSIENT TOAST -->
  <div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] hidden px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl dark:bg-white dark:text-slate-900"></div>

  <!-- STANDALONE JS ENGINE -->
  <script>
    // ── STATE ─────────────────────────────────────────────────────────────
    var currentView = 'player';
    var isPlaying = false;
    var score = 0;
    var mediaTime = 0;
    var mediaDuration = 0;
    var triggeredIds = [];
    var micActive = false;
    var currentDictWordText = '';
    var lineLoop = false;
    var mediaMode = 'none'; // 'none' | 'file' | 'youtube'
    var ytPlayer = null;
    var ytReady = false;
    var ytApiLoading = false;
    var ytApiCallbacks = [];
    var tickTimer = null;
    var tapMode = false;
    var tapCursor = 0;
    var captionsOn = true;
    var lastSubKey = '';
    var lastKaraokeIndex = -1;
    var chromeTimer = null;
    var speedRate = 1;
    var lastVolume = 1;

    var mediaEl = document.getElementById('media-el');

    // ── BOOT ──────────────────────────────────────────────────────────────
    window.addEventListener('DOMContentLoaded', function () {
      applyStoredTheme();
      bindMediaElement();
      initPlayerChrome();
      initSongSelector();
      loadCurrentLesson();
      restoreSyncFromBrowser();
      setupVisualizers();
      bindDelegatedEvents();
      document.addEventListener('keydown', onGlobalKey);
    });

    // ── PREMIUM PLAYER CHROME ─────────────────────────────────────────────
    function initPlayerChrome() {
      var player = document.getElementById('premium-player');
      if (!player) return;

      ['mousemove', 'mouseenter', 'pointerdown', 'touchstart'].forEach(function (evt) {
        player.addEventListener(evt, function () { showChrome(); }, { passive: true });
      });

      // Volume memory (plus captions preference) across visits.
      try {
        var savedVol = parseFloat(localStorage.getItem('tutorly-music-volume') || '');
        if (isFinite(savedVol) && savedVol >= 0 && savedVol <= 1) {
          lastVolume = savedVol;
          mediaEl.volume = savedVol;
          var slider = document.getElementById('vol-slider');
          if (slider) slider.value = String(savedVol);
        }
        captionsOn = localStorage.getItem('tutorly-music-captions') !== 'off';
      } catch (e) {}
      applyCaptionsState();
      markSpeedOption(speedRate);

      document.addEventListener('fullscreenchange', function () {
        var btn = document.getElementById('btn-fullscreen');
        if (btn) btn.innerText = document.fullscreenElement ? '⤡' : '⛶';
      });

      // Hide the chrome while a video plays and the learner is not interacting.
      hideChrome();
    }

    function showChrome() {
      var player = document.getElementById('premium-player');
      if (!player) return;
      document.querySelectorAll('.player-chrome').forEach(function (el) { el.classList.remove('is-hidden'); });
      var big = document.getElementById('big-play');
      if (big) big.classList.toggle('is-hidden', isPlaying || mediaMode === 'none');
      player.style.cursor = '';
      if (chromeTimer) clearTimeout(chromeTimer);
      if (isPlaying) {
        chromeTimer = setTimeout(hideChrome, 2800);
      }
    }

    function hideChrome() {
      if (!isPlaying) {
        // Always keep controls visible while paused / ended.
        document.querySelectorAll('.player-chrome').forEach(function (el) { el.classList.remove('is-hidden'); });
        var bigPaused = document.getElementById('big-play');
        if (bigPaused) bigPaused.classList.toggle('is-hidden', isPlaying || mediaMode === 'none');
        return;
      }
      document.querySelectorAll('.player-chrome').forEach(function (el) { el.classList.add('is-hidden'); });
      var big = document.getElementById('big-play');
      if (big) big.classList.add('is-hidden');
      var player = document.getElementById('premium-player');
      if (player) player.style.cursor = 'none';
    }

    function handleStageClick(e) {
      // Clicks on the chrome, buttons or inputs keep their own behaviour.
      if (e.target.closest('#player-controls, #sync-dock, #subtitles-container, button, a, label, input')) return;
      togglePlay();
    }

    function toggleFullscreen() {
      var player = document.getElementById('premium-player');
      if (!player) return;
      if (document.fullscreenElement) {
        document.exitFullscreen && document.exitFullscreen();
      } else if (player.requestFullscreen) {
        player.requestFullscreen().catch(function () {
          toast('Fullscreen is blocked in this embedded view — open the lesson in its own tab.');
        });
      }
    }

    function togglePiP() {
      if (mediaMode !== 'file' || mediaEl.videoWidth === 0) {
        toast('Picture-in-picture needs a video file (not an audio track or a YouTube embed).');
        return;
      }
      try {
        if (document.pictureInPictureElement) document.exitPictureInPicture();
        else mediaEl.requestPictureInPicture();
      } catch (e) {
        toast('Picture-in-picture is not available in this browser.');
      }
    }

    function toggleCaptions() {
      captionsOn = !captionsOn;
      try { localStorage.setItem('tutorly-music-captions', captionsOn ? 'on' : 'off'); } catch (e) {}
      applyCaptionsState();
      toast(captionsOn ? 'Lyrics shown' : 'Lyrics hidden');
    }

    function applyCaptionsState() {
      var panel = document.getElementById('lyric-panel');
      if (panel) panel.classList.toggle('is-hidden', !captionsOn || mediaMode === 'none');
      var btn = document.getElementById('btn-captions');
      if (btn) {
        btn.className = captionsOn
          ? 'btn h-10 px-3 rounded-full bg-fuchsia-600 text-white text-[11px] font-black'
          : 'btn h-10 px-3 rounded-full hover:bg-white/15 text-[11px] font-black text-white/70';
        btn.title = captionsOn ? 'Hide the lyrics (C)' : 'Show the lyrics (C)';
      }
    }

    function toggleSpeedMenu(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      var menu = document.getElementById('speed-menu');
      if (menu) menu.classList.toggle('hidden');
    }

    function markSpeedOption(rate) {
      var label = document.getElementById('speed-label');
      if (label) label.innerText = (rate === 1 ? '1' : String(rate)) + 'x';
      document.querySelectorAll('.speed-opt').forEach(function (btn) {
        btn.classList.toggle('is-active', parseFloat(btn.getAttribute('data-speed')) === rate);
      });
    }

    function handleScrubHover(e) {
      var tip = document.getElementById('scrub-tip');
      var track = document.getElementById('scrubber-track');
      if (!tip || !track) return;
      var rect = track.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      var t = ratio * effectiveDuration();
      var sub = findSubAt(t);
      tip.innerText = formatTime(t) + (sub && sub.text ? ' · ' + String(sub.text).slice(0, 42) : '');
      tip.style.left = (ratio * 100) + '%';
      tip.classList.remove('hidden');
    }

    function hideScrubTip() {
      var tip = document.getElementById('scrub-tip');
      if (tip) tip.classList.add('hidden');
    }

    function findSubAt(t) {
      var subs = getActiveLesson().subtitles || [];
      for (var i = 0; i < subs.length; i++) {
        var end = subs[i].end || subs[i].start + 5;
        if (t >= subs[i].start && t <= end) return subs[i];
        if (t < subs[i].start) return subs[i];
      }
      return subs[subs.length - 1] || null;
    }

    function goToNextLine() {
      goToLineByOffset(1);
    }

    function goToPrevLine() {
      goToLineByOffset(-1);
    }

    function goToLineByOffset(direction) {
      var subs = getActiveLesson().subtitles || [];
      if (!subs.length) return;
      var t = currentMediaTime();
      if (direction > 0) {
        for (var i = 0; i < subs.length; i++) {
          if (subs[i].start > t + 0.25) { seekTo(subs[i].start); return; }
        }
        seekTo(subs[subs.length - 1].end || subs[subs.length - 1].start);
        return;
      }
      for (var j = subs.length - 1; j >= 0; j--) {
        if (subs[j].start < t - 0.6) { seekTo(subs[j].start); return; }
      }
      seekTo(0);
    }

    function getActiveLesson() {
      return window.LESSONS_DATA[window.CURRENT_LESSON_INDEX] || window.LESSONS_DATA[0];
    }

    // ── THEME (LIGHT BY DEFAULT) ──────────────────────────────────────────
    function applyStoredTheme() {
      var stored = 'light';
      try { stored = localStorage.getItem('tutorly-music-theme') || 'light'; } catch (e) {}
      document.documentElement.classList.toggle('dark', stored === 'dark');
      updateThemeBtn();
    }

    function toggleTheme() {
      var nextDark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', nextDark);
      try { localStorage.setItem('tutorly-music-theme', nextDark ? 'dark' : 'light'); } catch (e) {}
      updateThemeBtn();
    }

    function updateThemeBtn() {
      var btn = document.getElementById('theme-toggle');
      if (!btn) return;
      var dark = document.documentElement.classList.contains('dark');
      btn.innerHTML = dark ? '☀️ <span class="hidden sm:inline">Light</span>' : '🌙 <span class="hidden sm:inline">Dark</span>';
    }

    function toast(msg) {
      var el = document.getElementById('toast');
      el.innerText = msg;
      el.classList.remove('hidden');
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.classList.add('hidden'); }, 2600);
    }

    // ── LESSON LOADING ────────────────────────────────────────────────────
    function initSongSelector() {
      var select = document.getElementById('song-select');
      var container = document.getElementById('song-selector-container');
      if (window.LESSONS_DATA.length > 1) {
        container.classList.remove('hidden');
        container.classList.add('flex');
        select.innerHTML = window.LESSONS_DATA.map(function (l, i) {
          return '<option value="' + i + '">' + escapeHtmlStr(l.songTitle) + ' - ' + escapeHtmlStr(l.artist) + '</option>';
        }).join('');
      }
    }

    function changeLesson(idx) {
      window.CURRENT_LESSON_INDEX = parseInt(idx, 10) || 0;
      loadCurrentLesson();
    }

    function loadCurrentLesson() {
      var l = getActiveLesson();
      document.getElementById('header-title').innerText = l.songTitle;
      document.getElementById('header-artist').innerText = l.artist;
      document.getElementById('header-level').innerText = l.level || 'B2';

      if (l.learnerProfile) {
        document.getElementById('prof-name').innerText = l.learnerProfile.name || 'Learner';
        document.getElementById('prof-level').innerText = l.learnerProfile.level || l.level || 'B2';
        document.getElementById('prof-l1').innerText = 'Native: ' + (l.learnerProfile.l1 || 'Spanish');
        document.getElementById('prof-focus-goals').innerText = 'Goals: ' + (l.learnerProfile.goals || 'Fluency') + ' | Focus: ' + (l.learnerProfile.focus || 'Idioms');
      }

      var lessonMediaBtn = document.getElementById('empty-load-lesson');
      if (lessonMediaBtn) lessonMediaBtn.classList.toggle('hidden', !l.mediaUrl);

      renderMiniLessonMarkers(l);
      renderMiniLessonsList(l);
      renderKaraokeLyrics(l);
      renderSyncStudio();
      renderSubtitles(0);
      updateDurationUi();

      // Auto-load the media the lesson was built around (link or packaged local
      // file) so the player is ready — playback itself waits for a user gesture.
      if (l.mediaUrl && mediaMode === 'none') {
        setMediaSource(l.mediaUrl, mediaLabelFor(l, l.mediaUrl), false);
      }
      applyStageMode(mediaMode === 'file' && mediaEl.videoWidth > 0);
    }

    function switchView(mode) {
      currentView = mode;
      var views = { player: 'view-player', karaoke: 'view-karaoke' };
      var tabs = { player: 'tab-btn-player', karaoke: 'tab-btn-karaoke' };
      Object.keys(views).forEach(function (key) {
        var box = document.getElementById(views[key]);
        var tab = document.getElementById(tabs[key]);
        if (!box || !tab) return;
        var active = key === mode;
        if (active) { box.classList.remove('hidden'); box.classList.add('flex'); }
        else { box.classList.add('hidden'); box.classList.remove('flex'); }
        tab.className = active
          ? 'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white shadow-md'
          : 'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800';
      });
    }

    // ── MEDIA HANDLING (audio + video, local file or link) ───────────────
    function bindMediaElement() {
      mediaEl.addEventListener('loadedmetadata', function () {
        mediaDuration = isFinite(mediaEl.duration) ? (mediaEl.duration || 0) : 0;
        applyStageMode(mediaEl.videoWidth > 0);
        updateDurationUi();
        renderMiniLessonMarkers(getActiveLesson());
        renderSyncStudio();
      });
      mediaEl.addEventListener('timeupdate', function () { onTimeUpdate(mediaEl.currentTime); });
      mediaEl.addEventListener('play', function () { isPlaying = true; startTicker(); updatePlayBtnState(); showChrome(); });
      mediaEl.addEventListener('pause', function () { isPlaying = false; updatePlayBtnState(); showChrome(); });
      mediaEl.addEventListener('ended', function () { isPlaying = false; updatePlayBtnState(); showChrome(); });
      mediaEl.addEventListener('error', function () {
        if (mediaMode === 'file' && mediaEl.getAttribute('src')) {
          document.getElementById('media-status').innerText = '⚠ Could not play that source — try another file or a direct audio/video link.';
        }
      });
    }

    function isYouTubeUrl(url) {
      return /(?:youtube\\.com\\/(?:watch\\?v=|embed\\/|shorts\\/|live\\/)|youtu\\.be\\/)/i.test(url || '');
    }

    function youTubeId(url) {
      var m = String(url || '').match(/(?:youtube\\.com\\/(?:watch\\?v=|embed\\/|shorts\\/|live\\/)|youtu\\.be\\/)([A-Za-z0-9_-]{6,})/i);
      return m ? m[1] : '';
    }

    function setMediaSource(src, label, shouldPlay) {
      if (!src) return;
      if (isYouTubeUrl(src)) { loadYouTube(youTubeId(src), label); return; }
      teardownYouTube();
      mediaMode = 'file';
      applyStageMode(false);
      mediaEl.src = src;
      mediaEl.load();
      if (shouldPlay !== false) {
        mediaEl.play().catch(function () { /* autoplay may be blocked — user can press play */ });
      }
      document.getElementById('media-status').innerText = (label || src).slice(0, 90);
      updatePlayBtnState();
    }

    function applyMediaUrl() {
      var input = document.getElementById('media-url-input');
      var url = (input.value || '').trim();
      if (!url) { toast('Paste an audio or video link first.'); return; }
      setMediaSource(url, url);
      input.value = '';
    }

    function useLessonMedia() {
      var l = getActiveLesson();
      if (!l.mediaUrl) { toast('This lesson has no linked media — load a file or paste a link.'); return; }
      setMediaSource(l.mediaUrl, mediaLabelFor(l, l.mediaUrl), true);
    }

    function mediaLabelFor(lesson, fallback) {
      if (window.INITIAL_MEDIA_LABEL) return window.INITIAL_MEDIA_LABEL;
      var parts = [lesson.songTitle, lesson.artist].filter(Boolean);
      return parts.length ? parts.join(' — ') : fallback;
    }

    function handleMediaUpload(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      setMediaSource(URL.createObjectURL(file), file.name);
      e.target.value = '';
    }

    function handleMediaDrop(e) {
      e.preventDefault();
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      setMediaSource(URL.createObjectURL(file), file.name);
    }

    function loadYouTube(id, label) {
      if (!id) { toast('That link is not a valid YouTube video.'); return; }
      mediaMode = 'youtube';
      try { mediaEl.pause(); } catch (e) {}
      mediaEl.removeAttribute('src');
      applyStageMode(true);
      var wrap = document.getElementById('yt-wrap');
      wrap.classList.remove('hidden');
      wrap.innerHTML = '<div id="yt-frame"></div>';
      document.getElementById('media-status').innerText = (label || 'YouTube video') + ' — loading player…';
      loadYouTubeApi(function () {
        ytPlayer = new YT.Player('yt-frame', {
          videoId: id,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: function (ev) {
              ytReady = true;
              mediaDuration = ev.target.getDuration() || 0;
              updateDurationUi();
              renderMiniLessonMarkers(getActiveLesson());
              renderSyncStudio();
              document.getElementById('media-status').innerText = label || 'YouTube video';
            },
            onStateChange: function (ev) {
              if (ev.data === 1) { isPlaying = true; startTicker(); updatePlayBtnState(); }
              else if (ev.data === 0 || ev.data === 2) { isPlaying = false; updatePlayBtnState(); }
            }
          }
        });
      });
    }

    // Stage visibility helpers — every overlay uses hidden OR flex, never both.
    function showBox(el) { if (!el) return; el.classList.remove('hidden'); el.classList.add('flex'); }
    function hideBox(el) { if (!el) return; el.classList.add('hidden'); el.classList.remove('flex'); }
    /**
     * One place decides what the stage shows. There is deliberately NO artwork,
     * spinning disc or equaliser: the lyric line and its L1 translation are the
     * only visuals — centred on the whole stage for audio, and docked at the
     * bottom (YouTube-caption style) when a video plays behind them.
     */
    function applyStageMode(isVideo) {
      var hasMedia = mediaMode !== 'none';
      var videoVisible = hasMedia && !!isVideo;
      mediaEl.classList.toggle('hidden', !videoVisible);

      var empty = document.getElementById('media-empty');
      if (hasMedia) hideBox(empty); else showBox(empty);

      var panel = document.getElementById('lyric-panel');
      if (panel) {
        panel.classList.toggle('mode-video', videoVisible);
        panel.classList.toggle('mode-audio', !videoVisible);
        panel.classList.toggle('is-hidden', !hasMedia || !captionsOn);
      }

      var controls = document.getElementById('player-controls');
      if (controls) controls.classList.toggle('hidden', !hasMedia);

      var big = document.getElementById('big-play');
      if (big) big.classList.toggle('is-hidden', !hasMedia || isPlaying);
    }

    function loadYouTubeApi(cb) {
      if (window.YT && window.YT.Player) { cb(); return; }
      ytApiCallbacks.push(cb);
      if (ytApiLoading) return;
      ytApiLoading = true;
      window.onYouTubeIframeAPIReady = function () {
        var pending = ytApiCallbacks.slice();
        ytApiCallbacks = [];
        pending.forEach(function (fn) { try { fn(); } catch (e) {} });
      };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }

    function teardownYouTube() {
      stopTicker();
      if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) {} }
      ytPlayer = null; ytReady = false;
      var wrap = document.getElementById('yt-wrap');
      wrap.innerHTML = '';
      wrap.classList.add('hidden');
    }

    function currentMediaTime() {
      if (mediaMode === 'youtube' && ytReady && ytPlayer && ytPlayer.getCurrentTime) {
        try { return ytPlayer.getCurrentTime() || 0; } catch (e) { return mediaTime; }
      }
      if (mediaMode === 'file') return mediaEl.currentTime || 0;
      return mediaTime;
    }

    function effectiveDuration() {
      if (mediaDuration && isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration;
      var subs = getActiveLesson().subtitles || [];
      if (subs.length) return (subs[subs.length - 1].end || 0) || 120;
      return 120;
    }

    function startTicker() {
      if (tickTimer) return;
      tickTimer = setInterval(function () { onTimeUpdate(currentMediaTime()); }, 120);
    }

    function stopTicker() {
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    }

    function togglePlay() {
      showChrome();
      if (mediaMode === 'none') {
        switchView('player');
        document.getElementById('media-stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('Load the song first — paste a link, open a local file or drop it on the player.');
        return;
      }
      if (mediaMode === 'youtube') {
        if (!ytReady || !ytPlayer) { toast('The video player is still loading…'); return; }
        if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
        return;
      }
      if (mediaEl.paused) {
        mediaEl.play().catch(function (err) { toast('Could not play: ' + (err && err.message ? err.message : 'unsupported source')); });
      } else {
        mediaEl.pause();
      }
    }

    function updatePlayBtnState() {
      var pBtn = document.getElementById('btn-play-pause');
      var kBtn = document.getElementById('btn-karaoke-play');
      if (pBtn) pBtn.innerText = isPlaying ? '⏸' : '▶';
      if (kBtn) kBtn.innerText = isPlaying ? '⏸ Pause Karaoke' : '▶ Start Karaoke';
      var big = document.getElementById('big-play');
      if (big) {
        big.innerText = isPlaying ? '' : '▶';
        big.classList.toggle('is-hidden', isPlaying);
        big.setAttribute('aria-label', isPlaying ? 'Playing' : 'Play');
      }
      if (isPlaying) showChrome(); else hideChrome();
    }

    function seekTo(target) {
      var dur = effectiveDuration();
      var t = Math.max(0, Math.min(target, dur));
      if (mediaMode === 'youtube' && ytReady && ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(t, true);
      else if (mediaMode === 'file') mediaEl.currentTime = t;
      onTimeUpdate(t);
    }

    function handleSeek(e) {
      var rect = e.currentTarget.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(ratio * effectiveDuration());
    }

    function updateBufferedBar() {
      var bar = document.getElementById('scrubber-buffered');
      if (!bar) return;
      var dur = effectiveDuration();
      if (mediaMode === 'file' && mediaEl.buffered && mediaEl.buffered.length && dur) {
        var end = mediaEl.buffered.end(mediaEl.buffered.length - 1);
        bar.style.width = Math.min(100, (end / dur) * 100) + '%';
      } else {
        bar.style.width = '100%';
      }
    }

    function rewind(s) { seekTo(currentMediaTime() - s); }
    function forward(s) { seekTo(currentMediaTime() + s); }

    function setPlaybackSpeed(s) {
      var rate = parseFloat(s) || 1;
      speedRate = rate;
      if (mediaMode === 'file') mediaEl.playbackRate = rate;
      if (mediaMode === 'youtube' && ytReady && ytPlayer && ytPlayer.setPlaybackRate) ytPlayer.setPlaybackRate(rate);
      markSpeedOption(rate);
      var menu = document.getElementById('speed-menu');
      if (menu) menu.classList.add('hidden');
      toast('Playback speed ' + (rate === 1 ? 'normal' : rate + 'x'));
    }

    function setVolume(v) {
      var vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
      if (mediaMode === 'file') mediaEl.volume = vol;
      if (mediaMode === 'youtube' && ytReady && ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(vol * 100);
      if (vol > 0) lastVolume = vol;
      if (vol > 0 && mediaEl.muted) { mediaEl.muted = false; if (mediaMode === 'youtube' && ytReady && ytPlayer) ytPlayer.unMute(); }
      updateMuteUi();
      try { localStorage.setItem('tutorly-music-volume', String(vol)); } catch (e) {}
    }

    function toggleMute() {
      var muted;
      if (mediaMode === 'file') { mediaEl.muted = !mediaEl.muted; muted = mediaEl.muted; }
      else if (mediaMode === 'youtube' && ytReady && ytPlayer) {
        muted = !ytPlayer.isMuted();
        if (muted) ytPlayer.mute(); else ytPlayer.unMute();
      } else {
        lastVolume = lastVolume > 0 ? lastVolume : 1;
        mediaEl.volume = mediaEl.volume > 0 ? 0 : lastVolume;
        mediaEl.muted = mediaEl.volume === 0;
        muted = mediaEl.muted;
      }
      var slider = document.getElementById('vol-slider');
      if (slider) slider.value = String(muted ? 0 : (lastVolume || 1));
      updateMuteUi(muted);
    }

    function updateMuteUi(forceMuted) {
      var btn = document.getElementById('btn-mute');
      if (!btn) return;
      var muted = typeof forceMuted === 'boolean'
        ? forceMuted
        : (mediaMode === 'file' ? (mediaEl.muted || mediaEl.volume === 0)
          : (mediaMode === 'youtube' && ytReady && ytPlayer && ytPlayer.isMuted ? ytPlayer.isMuted() : false));
      btn.innerText = muted ? '🔇' : '🔊';
    }

    function bumpVolume(delta) {
      var current = (mediaMode === 'file' ? mediaEl.volume : (parseFloat(document.getElementById('vol-slider').value) || 1));
      var next = Math.max(0, Math.min(1, Math.round((current + delta) * 100) / 100));
      var slider = document.getElementById('vol-slider');
      if (slider) slider.value = String(next);
      setVolume(next);
      toast('Volume ' + Math.round(next * 100) + '%');
    }

    function toggleLineLoop() {
      lineLoop = !lineLoop;
      var btn = document.getElementById('btn-loop-line');
      btn.className = lineLoop
        ? 'btn h-10 px-3 rounded-full bg-fuchsia-600 text-white text-xs font-black shadow-lg shadow-fuchsia-500/40'
        : 'btn h-10 px-3 rounded-full hover:bg-white/15 text-xs font-black text-white';
      toast(lineLoop ? '🔁 Line repeat ON — the current lyric line loops.' : 'Line repeat off.');
    }

    function updateDurationUi() {
      document.getElementById('time-duration').innerText = formatTime(effectiveDuration());
    }

    function onTimeUpdate(t) {
      mediaTime = t;
      document.getElementById('time-current').innerText = formatTime(t);
      var dur = effectiveDuration();
      var pct = dur ? Math.min(100, (t / dur) * 100) : 0;
      document.getElementById('scrubber-progress').style.width = pct + '%';
      document.getElementById('scrubber-knob').style.left = pct + '%';
      updateBufferedBar();

      var activeSub = findActiveSub(t);
      // Line repeat: rewind to the start of the current line once it ends.
      // (Guarded so a line with a missing/backwards end can never loop forever.)
      if (lineLoop && activeSub && isPlaying && activeSub.end > activeSub.start + 0.2 && t > activeSub.end - 0.05) {
        seekTo(activeSub.start);
        return;
      }

      renderSubtitles(t);
      highlightKaraokeLine(t);
      checkMiniLessonTriggers(t);
      highlightSyncRow(t);
    }

    function findActiveSub(t) {
      var subs = getActiveLesson().subtitles || [];
      for (var i = 0; i < subs.length; i++) {
        if (t >= subs[i].start && t <= (subs[i].end || subs[i].start + 5)) return subs[i];
      }
      return null;
    }

    // ── SUBTITLES & WORD HIGHLIGHTING ─────────────────────────────────────
    function renderSubtitles(t) {
      var l = getActiveLesson();
      var container = document.getElementById('subtitles-container');
      if (!container) return;
      var subs = l.subtitles || [];
      if (subs.length === 0) {
        if (lastSubKey !== 'empty') {
          lastSubKey = 'empty';
          container.innerHTML = '<p class="lyric-empty">No lyrics yet — open 🎯 Sync on the player to paste and sync them.</p>';
        }
        return;
      }

      var activeSub = findActiveSub(t) || subs[0];
      var subKey = (l.id || l.songTitle || '') + '|' + subs.indexOf(activeSub) + '|' + (activeSub.text || '') + '|' + (activeSub.translation || '');
      // Re-painting the stage ~8x/second would restart the animation and fight
      // the word-lookup clicks, so only redraw when the line actually changes.
      if (subKey === lastSubKey) return;
      lastSubKey = subKey;
      var highlights = activeSub.highlights || [];
      var words = String(activeSub.text || '').split(' ');
      var html = words.map(function (w) {
        var clean = w.replace(/[.,/#!$%^&*;:{}=\\-_'~()?"']/g, '').toLowerCase();
        var hlIndex = -1;
        for (var h = 0; h < highlights.length; h++) {
          if (String(highlights[h].word || '').toLowerCase() === clean) { hlIndex = h; break; }
        }
        if (hlIndex >= 0) {
          return '<span class="lyric-hl hl-' + escapeAttr(highlights[hlIndex].type) + '" data-hl="' + hlIndex + '">' + escapeHtmlStr(w) + '</span>';
        }
        return '<span class="lyric-word" data-word="' + escapeAttr(clean) + '">' + escapeHtmlStr(w) + '</span>';
      }).join(' ');

      container.innerHTML =
        '<p class="lyric-line">' + html + '</p>' +
        (activeSub.translation ? '<p class="lyric-l1">' + escapeHtmlStr(activeSub.translation) + '</p>' : '');
    }

    // ── MINI-LESSONS & MARKERS ────────────────────────────────────────────
    function renderMiniLessonMarkers(l) {
      var container = document.getElementById('mini-lesson-markers');
      if (!l.miniLessons) { container.innerHTML = ''; return; }
      var total = effectiveDuration();
      container.innerHTML = l.miniLessons.map(function (ml) {
        var pos = total ? (ml.timeMarker / total) * 100 : 0;
        return '<div data-mini="' + escapeAttr(ml.id) + '" style="left:' + pos + '%" class="absolute -top-1.5 -bottom-1.5 w-[3px] -ml-[1.5px] bg-indigo-400 rounded-full cursor-pointer hover:scale-y-125 hover:bg-indigo-300 transition-transform shadow-[0_0_8px_rgba(99,102,241,0.9)]" title="Mini-lesson: ' + escapeAttr(ml.title) + '"></div>';
      }).join('');
    }

    function renderMiniLessonsList(l) {
      var container = document.getElementById('mini-lessons-list');
      if (!l.miniLessons) { container.innerHTML = ''; return; }
      container.innerHTML = l.miniLessons.map(function (ml) {
        var l1Line = ml.l1Title || ml.l1Summary || '';
        return '<button type="button" data-mini="' + escapeAttr(ml.id) + '" class="w-full text-left rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/50 hover:shadow-lg transition-all p-4 sm:p-5 flex flex-wrap items-center gap-4 group">' +
            '<span class="w-16 shrink-0 text-center px-2 py-1.5 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-black font-mono">' + formatTime(ml.timeMarker) + '</span>' +
            '<span class="flex-1 min-w-[220px]">' +
              '<span class="block text-base font-black text-slate-900 dark:text-white leading-snug">' + escapeHtmlStr(ml.title) + '</span>' +
              (l1Line ? '<span class="block text-sm text-amber-700 dark:text-amber-300/90 mt-1 leading-snug">🗣 ' + escapeHtmlStr(l1Line) + '</span>' : '') +
            '</span>' +
            '<span class="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">Start lesson →</span>' +
          '</button>';
      }).join('');
    }

    function checkMiniLessonTriggers(t) {
      var l = getActiveLesson();
      if (!l.miniLessons || tapMode) return;
      var found = null;
      for (var i = 0; i < l.miniLessons.length; i++) {
        var m = l.miniLessons[i];
        if (Math.abs(m.timeMarker - t) < 0.6 && triggeredIds.indexOf(m.id) === -1) { found = m; break; }
      }
      if (found) {
        if (isPlaying) togglePlay();
        triggeredIds.push(found.id);
        openChallengeModal(found);
      }
    }

    function triggerMiniLessonById(id) {
      var l = getActiveLesson();
      var ml = null;
      (l.miniLessons || []).forEach(function (m) { if (m.id === id) ml = m; });
      if (ml) openChallengeModal(ml);
    }

    // ── MODAL HANDLERS ────────────────────────────────────────────────────
    function openHighlightModal(h) {
      currentDictWordText = h.word;
      document.getElementById('dict-type').innerText = String(h.type || 'vocab').replace('_', ' ').toUpperCase();
      document.getElementById('dict-word').innerText = h.word || '';
      document.getElementById('dict-meaning').innerText = h.definition || h.meaning || 'Core language feature in this lyric.';
      document.getElementById('dict-translation').innerText = h.translation || '';
      document.getElementById('dict-example').innerText = h.example || '';
      document.getElementById('dict-modal').classList.remove('hidden');
      document.getElementById('dict-modal').classList.add('flex');
    }

    function openWordDict(w) {
      currentDictWordText = w;
      document.getElementById('dict-type').innerText = 'DICTIONARY';
      document.getElementById('dict-word').innerText = w;
      document.getElementById('dict-meaning').innerText = 'Vocabulary term from the song lyrics.';
      document.getElementById('dict-translation').innerText = 'Contextual translation available in the full lesson.';
      document.getElementById('dict-example').innerText = 'Usage: ' + w;
      document.getElementById('dict-modal').classList.remove('hidden');
      document.getElementById('dict-modal').classList.add('flex');
    }

    function closeDictModal() {
      document.getElementById('dict-modal').classList.add('hidden');
      document.getElementById('dict-modal').classList.remove('flex');
    }

    function speakCurrentDictWord() {
      if ('speechSynthesis' in window && currentDictWordText) {
        var u = new SpeechSynthesisUtterance(currentDictWordText);
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    }

    function openChallengeModal(ml) {
      document.getElementById('mini-title').innerText = ml.title;

      // Native-language (L1) headline: the learner sees the easy version first.
      var l1Head = document.getElementById('mini-l1-head');
      var l1TitleEl = document.getElementById('mini-l1-title');
      var l1SummaryEl = document.getElementById('mini-l1-summary');
      if (l1Head && (ml.l1Title || ml.l1Summary)) {
        l1Head.classList.remove('hidden');
        var l1LangEl = document.getElementById('mini-l1-lang');
        if (l1LangEl) l1LangEl.innerText = '🗣 Easy version · ' + nativeLanguage();
        if (l1TitleEl) l1TitleEl.innerText = ml.l1Title || ('Easy version · ' + nativeLanguage());
        if (l1SummaryEl) l1SummaryEl.innerText = ml.l1Summary || '';
      } else if (l1Head) {
        l1Head.classList.add('hidden');
      }

      var container = document.getElementById('mini-cards-container');
      if (ml.contentCards && ml.contentCards.length > 0) {
        container.innerHTML = ml.contentCards.map(function (c, i) {
          return '<section class="w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">' +
              '<header class="flex items-start gap-3 px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/70">' +
                '<span class="w-7 h-7 shrink-0 rounded-full bg-fuchsia-500 text-white text-xs font-black flex items-center justify-center">' + (i + 1) + '</span>' +
                '<h4 class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">' + escapeHtmlStr(c.heading) + '</h4>' +
              '</header>' +
              '<div class="p-5 sm:p-6">' +
                '<div class="mini-lesson-prose text-[15px] sm:text-base leading-7 text-slate-700 dark:text-zinc-200">' + (c.htmlBody || '') + '</div>' +
                (c.l1HtmlBody ? l1Panel(c.l1Heading, c.l1HtmlBody) : '') +
              '</div>' +
            '</section>';
        }).join('');
      } else {
        container.innerHTML = '<div class="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900 text-[15px] text-slate-700 dark:text-zinc-300">' + escapeHtmlStr(ml.explanation || 'Key concept breakdown') + '</div>';
      }

      var ccqBox = document.getElementById('ccq-questions');
      if (ml.ccqs && ml.ccqs.length > 0) {
        ccqBox.innerHTML = ml.ccqs.map(function (q, i) {
          var label = typeof q === 'string' ? q : (q.question || '');
          var checklist = (q && q.checklist) ? q.checklist : [];
          var l1Question = (q && q.l1Question) ? q.l1Question : '';
          return '<div class="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">' +
              '<label class="flex items-start gap-3 cursor-pointer">' +
                '<input type="checkbox" data-score="15" class="mt-1 accent-indigo-500" />' +
                '<span class="text-[15px] text-slate-800 dark:text-zinc-200 font-semibold leading-snug">' + escapeHtmlStr(label) + '</span>' +
              '</label>' +
              (l1Question ? '<p class="mt-2 ml-7 text-sm text-amber-700 dark:text-amber-300 font-medium leading-snug">🗣 ' + escapeHtmlStr(l1Question) + '</p>' : '') +
              (checklist.length ? '<ul class="mt-2 ml-7 text-sm text-slate-500 dark:text-zinc-400 list-disc">' + checklist.map(function (c) { return '<li>' + escapeHtmlStr(typeof c === 'string' ? c : (c && c.text) || '') + '</li>'; }).join('') + '</ul>' : '') +
            '</div>';
        }).join('');
      } else {
        ccqBox.innerHTML = '<p class="text-sm text-slate-500 dark:text-zinc-400">Reflect on how this pattern applies to your conversation fluency.</p>';
      }

      document.getElementById('cat-feedback-text').innerText = ml.catFeedback || 'Read through the key concepts above and test your understanding!';
      var feedbackL1 = document.getElementById('cat-feedback-l1');
      if (feedbackL1) {
        feedbackL1.innerText = ml.catFeedbackL1 || '';
        feedbackL1.classList.toggle('hidden', !ml.catFeedbackL1);
      }
      document.getElementById('challenge-modal').classList.remove('hidden');
      document.getElementById('challenge-modal').classList.add('flex');
    }

    function closeChallengeModal() {
      document.getElementById('challenge-modal').classList.add('hidden');
      document.getElementById('challenge-modal').classList.remove('flex');
    }

    function finishMiniLesson() {
      addScore(50);
      closeChallengeModal();
      if (!isPlaying) togglePlay();
    }

    function addScore(pts) {
      score += pts;
      document.getElementById('score-counter').innerText = score;
    }

    // ── KARAOKE LYRICS & VISUALIZER ───────────────────────────────────────
    function renderKaraokeLyrics(l) {
      var container = document.getElementById('karaoke-lyrics-container');
      lastKaraokeIndex = -1;
      if (!l.subtitles || l.subtitles.length === 0) {
        container.innerHTML = '<p class="text-slate-400 dark:text-zinc-500">No lyrics available yet — add them with 🎯 Sync on the player.</p>';
        return;
      }
      container.innerHTML = l.subtitles.map(function (s, i) {
        return '<div id="k-line-' + i + '" data-seek="' + (s.start || 0) + '" class="k-line p-3 rounded-2xl transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-bold text-lg lg:text-xl">' +
            '<p class="text-slate-900 dark:text-white font-black tracking-tight">' + escapeHtmlStr(s.text) + '</p>' +
            (s.translation ? '<p class="text-xs text-slate-500 dark:text-zinc-500 font-normal mt-1">' + escapeHtmlStr(s.translation) + '</p>' : '') +
          '</div>';
      }).join('');
    }

    function highlightKaraokeLine(t) {
      var container = document.getElementById('karaoke-lyrics-container');
      var subs = getActiveLesson().subtitles || [];
      var activeIndex = -1;
      for (var k = 0; k < subs.length; k++) {
        if (t >= subs[k].start && t <= (subs[k].end || subs[k].start + 5)) { activeIndex = k; break; }
      }
      // Only repaint when the highlighted line changes — otherwise the smooth
      // auto-scroll would be restarted on every 120ms tick.
      if (activeIndex === lastKaraokeIndex) return;
      lastKaraokeIndex = activeIndex;
      subs.forEach(function (s, i) {
        var el = document.getElementById('k-line-' + i);
        if (!el) return;
        var active = t >= s.start && t <= (s.end || s.start + 5);
        if (active) {
          el.className = 'k-line p-4 rounded-2xl transition-all bg-gradient-to-r from-fuchsia-100 to-indigo-100 dark:from-fuchsia-600/30 dark:to-indigo-600/30 border border-fuchsia-300 dark:border-fuchsia-500/50 text-slate-900 dark:text-white font-black text-2xl shadow-lg shadow-fuchsia-500/10';
          if (container) {
            var target = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);
            container.scrollTo({ top: target, behavior: 'smooth' });
          }
        } else {
          el.className = 'k-line p-3 rounded-2xl transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-bold text-lg lg:text-xl opacity-70';
        }
      });
    }

    function toggleMicrophone() {
      micActive = !micActive;
      var btn = document.getElementById('btn-mic');
      if (micActive) {
        btn.innerText = '🎙️ Recording Mic ON';
        btn.className = 'btn px-5 py-3 rounded-2xl bg-fuchsia-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-fuchsia-500/30';
      } else {
        btn.innerText = '🎙️ Mic Off';
        btn.className = 'btn px-5 py-3 rounded-2xl bg-white border border-slate-300 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800';
      }
    }

    function setupVisualizers() {
      // Only the Karaoke view keeps a frequency canvas — the player itself
      // deliberately has no equaliser bars and no spinning artwork.
      var karaoke = document.getElementById('karaoke-canvas');
      if (!karaoke) return;

      function drawBars(canvas, barCount, quietHeight) {
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        function frame() {
          canvas.width = canvas.clientWidth || 600;
          canvas.height = canvas.clientHeight || 64;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          var width = canvas.width / barCount;
          for (var i = 0; i < barCount; i++) {
            var amp = isPlaying ? (Math.sin(Date.now() * 0.005 + i * 0.3) * 0.4 + 0.6) : 0.06;
            var h = Math.max(quietHeight, amp * canvas.height);
            ctx.fillStyle = i % 2 === 0 ? '#d946ef' : '#6366f1';
            ctx.fillRect(i * width, canvas.height - h, Math.max(1, width - 2), h);
          }
          requestAnimationFrame(frame);
        }
        frame();
      }

      drawBars(karaoke, 40, 4);
    }

    // ── DELEGATED EVENTS (no inline quotes needed) ────────────────────────
    function bindDelegatedEvents() {
      document.getElementById('subtitles-container').addEventListener('click', function (e) {
        var hl = e.target.closest('[data-hl]');
        if (hl) {
          var sub = findActiveSub(currentMediaTime()) || getActiveLesson().subtitles[0];
          var item = sub && sub.highlights ? sub.highlights[parseInt(hl.getAttribute('data-hl'), 10)] : null;
          if (item) openHighlightModal(item);
          return;
        }
        var word = e.target.closest('[data-word]');
        if (word) openWordDict(word.getAttribute('data-word'));
      });

      document.getElementById('mini-lessons-list').addEventListener('click', function (e) {
        var card = e.target.closest('[data-mini]');
        if (card) triggerMiniLessonById(card.getAttribute('data-mini'));
      });

      document.getElementById('mini-lesson-markers').addEventListener('click', function (e) {
        var mark = e.target.closest('[data-mini]');
        if (mark) triggerMiniLessonById(mark.getAttribute('data-mini'));
      });

      document.getElementById('karaoke-lyrics-container').addEventListener('click', function (e) {
        var line = e.target.closest('[data-seek]');
        if (line) seekTo(parseFloat(line.getAttribute('data-seek')) || 0);
      });

      document.getElementById('ccq-questions').addEventListener('change', function (e) {
        var box = e.target.closest('[data-score]');
        if (box && box.checked) addScore(parseInt(box.getAttribute('data-score'), 10) || 10);
      });

      document.getElementById('song-search-results').addEventListener('click', function (e) {
        var preview = e.target.closest('[data-preview]');
        if (preview) { playSearchPreview(preview, preview.getAttribute('data-preview')); return; }
        var use = e.target.closest('[data-use-track]');
        if (use) {
          loadSearchTrack(use.getAttribute('data-use-track'), use.getAttribute('data-track-title'), use.getAttribute('data-track-artist'));
        }
      });

      document.getElementById('sync-rows').addEventListener('change', onSyncRowChange);
      document.getElementById('sync-rows').addEventListener('click', onSyncRowClick);
    }

    function onGlobalKey(e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;

      // Close the speed menu on any escape / outside key press.
      if (e.key === 'Escape') {
        var menu = document.getElementById('speed-menu');
        if (menu) menu.classList.add('hidden');
        return;
      }

      // Tap sync always owns the Space bar, even while a button has focus,
      // so the tutor can stamp line after line without the button re-clicking.
      if (e.code === 'Space' && tapMode) {
        e.preventDefault();
        tapStamp();
        return;
      }

      // YouTube-style shortcuts (ignored while typing in the sync editor).
      var onButton = tag === 'BUTTON' || tag === 'LABEL' || tag === 'A';
      switch (e.key) {
        case ' ':
          if (onButton) return;
          e.preventDefault();
          togglePlay();
          return;
        case 'ArrowRight':
          e.preventDefault();
          forward(e.shiftKey ? 30 : 5);
          return;
        case 'ArrowLeft':
          e.preventDefault();
          rewind(e.shiftKey ? 30 : 5);
          return;
        case 'ArrowUp':
          e.preventDefault();
          bumpVolume(0.05);
          return;
        case 'ArrowDown':
          e.preventDefault();
          bumpVolume(-0.05);
          return;
        case 'm': case 'M':
          toggleMute();
          return;
        case 'f': case 'F':
          toggleFullscreen();
          return;
        case 'c': case 'C':
          toggleCaptions();
          return;
      }
    }

    // ── LYRIC SYNC STUDIO ────────────────────────────────────────────────
    function renderSyncStudio() {
      var l = getActiveLesson();
      var subs = l.subtitles || [];
      var box = document.getElementById('sync-rows');
      var summary = document.getElementById('sync-summary');

      if (!subs.length) {
        box.innerHTML = '<div class="p-6 text-center text-sm text-slate-500 dark:text-zinc-400 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700">No lyric lines yet — paste the lyrics above and press “Split into lines”.</div>';
        summary.innerText = '';
        refreshTapPanel();
        return;
      }

      box.innerHTML = subs.map(function (s, i) {
        return '<div id="sync-row-' + i + '" class="sync-row grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">' +
            '<div class="col-span-1 text-center text-xs font-black text-slate-400 dark:text-zinc-500">' + (i + 1) + '</div>' +
            '<input type="number" step="0.1" min="0" data-act="time" data-field="start" data-index="' + i + '" value="' + round1(s.start) + '" class="col-span-2 p-1.5 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs font-mono text-center bg-slate-50 dark:bg-zinc-950 dark:text-white" />' +
            '<input type="number" step="0.1" min="0" data-act="time" data-field="end" data-index="' + i + '" value="' + round1(s.end) + '" class="col-span-2 p-1.5 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs font-mono text-center bg-slate-50 dark:bg-zinc-950 dark:text-white" />' +
            '<input type="text" data-act="text" data-index="' + i + '" value="' + escapeAttr(s.text || '') + '" class="col-span-5 p-1.5 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs bg-white dark:bg-zinc-950 dark:text-white" />' +
            '<div class="col-span-2 flex items-center justify-end gap-1">' +
              '<button data-act="play" data-index="' + i + '" title="Play from this line" class="btn px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[11px]">▶</button>' +
              '<button data-act="start" data-index="' + i + '" title="Set start = current time" class="btn px-2 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-black">S⏱</button>' +
              '<button data-act="end" data-index="' + i + '" title="Set end = current time" class="btn px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-black">E⏱</button>' +
            '</div>' +
          '</div>';
      }).join('');

      var issues = syncIssues();
      summary.innerText = subs.length + ' lines' + (issues ? ' · ' + issues : '');
      refreshTapPanel();
    }

    function round1(n) {
      var v = parseFloat(n);
      return isFinite(v) ? Math.round(v * 10) / 10 : 0;
    }

    function syncIssues() {
      var subs = getActiveLesson().subtitles || [];
      var overlaps = 0, missing = 0;
      for (var i = 0; i < subs.length; i++) {
        if (!subs[i].end || subs[i].end <= subs[i].start) missing++;
        if (i > 0 && subs[i].start < subs[i - 1].end) overlaps++;
      }
      var parts = [];
      if (overlaps) parts.push(overlaps + ' overlap');
      if (missing) parts.push(missing + ' missing end');
      return parts.join(', ');
    }

    function onSyncRowChange(e) {
      var el = e.target;
      var act = el.getAttribute('data-act');
      var index = parseInt(el.getAttribute('data-index'), 10);
      var subs = getActiveLesson().subtitles || [];
      if (!subs[index]) return;
      if (act === 'time') {
        var field = el.getAttribute('data-field');
        var val = Math.max(0, parseFloat(el.value) || 0);
        subs[index][field] = val;
        if (field === 'start' && (!subs[index].end || subs[index].end <= val)) {
          subs[index].end = val + 5;
        }
      } else if (act === 'text') {
        subs[index].text = el.value;
      }
      afterSyncEdit(index);
    }

    function onSyncRowClick(e) {
      var el = e.target.closest('[data-act]');
      if (!el || el.tagName === 'INPUT') return;
      var act = el.getAttribute('data-act');
      var index = parseInt(el.getAttribute('data-index'), 10);
      var subs = getActiveLesson().subtitles || [];
      if (!subs[index]) return;
      if (act === 'play') { if (lineLoop) toggleLineLoop(); seekTo(subs[index].start); if (!isPlaying) togglePlay(); return; }
      if (act === 'start') { subs[index].start = round1(currentMediaTime()); afterSyncEdit(index); return; }
      if (act === 'end') { subs[index].end = round1(currentMediaTime()); afterSyncEdit(index); return; }
    }

    function afterSyncEdit(index) {
      var l = getActiveLesson();
      l.subtitles = l.subtitles || [];
      autosaveSyncToBrowser();
      renderKaraokeLyrics(l);
      renderMiniLessonMarkers(l);
      renderSubtitles(currentMediaTime());
      renderSyncStudio();
      if (typeof index === 'number') highlightSyncRow(currentMediaTime());
    }

    function highlightSyncRow(t) {
      var dock = document.getElementById('sync-dock');
      if (!dock || dock.classList.contains('hidden')) return;
      var subs = getActiveLesson().subtitles || [];
      for (var i = 0; i < subs.length; i++) {
        var row = document.getElementById('sync-row-' + i);
        if (!row) continue;
        var active = t >= subs[i].start && t <= (subs[i].end || subs[i].start + 5);
        row.classList.toggle('is-active', active);
      }
    }

    // ── IN-PLAYER SYNC DOCK ───────────────────────────────────────────────
    function openSyncDock() {
      var dock = document.getElementById('sync-dock');
      if (!dock) return;
      dock.classList.remove('hidden');
      renderSyncStudio();
      refreshTapPanel();
    }

    function closeSyncDock() {
      var dock = document.getElementById('sync-dock');
      if (dock) dock.classList.add('hidden');
      if (tapMode) { tapMode = false; refreshTapPanel(); }
    }

    function toggleSyncDock() {
      var dock = document.getElementById('sync-dock');
      if (!dock) return;
      if (dock.classList.contains('hidden')) openSyncDock();
      else closeSyncDock();
    }

    /** Stamp the currently playing lyric line's start (or end) to “now”. */
    function stampCurrent(field) {
      var subs = getActiveLesson().subtitles || [];
      var index = subs.indexOf(findActiveSub(currentMediaTime()));
      if (index < 0) { toast('No lyric line is playing right now — press ▶ and try again.'); return; }
      subs[index][field] = round1(currentMediaTime());
      if (field === 'start' && (!subs[index].end || subs[index].end <= subs[index].start)) {
        subs[index].end = subs[index].start + 5;
      }
      afterSyncEdit(index);
      toast('Line ' + (index + 1) + ' ' + field + ' set to ' + formatTime(subs[index][field]) + '.');
    }

    /** Nudge the line that is playing right now by ±seconds. */
    function nudgeCurrent(delta) {
      var subs = getActiveLesson().subtitles || [];
      var index = subs.indexOf(findActiveSub(currentMediaTime()));
      if (index < 0) { toast('Play the song and pause on the line you want to nudge.'); return; }
      subs[index].start = Math.max(0, round1((subs[index].start || 0) + delta));
      subs[index].end = Math.max(subs[index].start + 0.2, round1((subs[index].end || 0) + delta));
      afterSyncEdit(index);
      toast('Line ' + (index + 1) + ' ' + (delta > 0 ? '+' : '') + delta + 's.');
    }

    // Tap sync
    function toggleTapMode() {
      if (!tapMode && !(getActiveLesson().subtitles || []).length) {
        toast('Add at least one lyric line before starting tap sync.');
        return;
      }
      tapMode = !tapMode;
      if (tapMode) {
        switchView('player');
        openSyncDock();
        tapCursor = 0;
        toast('Tap sync armed — press TAP (or Space) when each line begins.');
      } else {
        toast('Tap sync stopped.');
      }
      refreshTapPanel();
    }

    function refreshTapPanel() {
      var toggle = document.getElementById('btn-tap-toggle');
      var tapBtn = document.getElementById('btn-tap');
      var status = document.getElementById('tap-status');
      var next = document.getElementById('tap-next-line');
      var subs = getActiveLesson().subtitles || [];

      toggle.innerText = tapMode ? '■ Stop tap sync' : '▶ Start tap sync';
      toggle.className = tapMode
        ? 'btn px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider'
        : 'btn px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/25';
      tapBtn.disabled = !tapMode;
      status.innerText = tapMode
        ? 'Tap sync is ON — line ' + Math.min(tapCursor + 1, subs.length) + ' of ' + subs.length + '.'
        : 'Tap sync is off — nothing is being overwritten.';
      next.innerText = (subs[tapCursor] && subs[tapCursor].text) ? subs[tapCursor].text : '—';
    }

    function tapStamp() {
      if (!tapMode) return;
      var subs = getActiveLesson().subtitles || [];
      if (tapCursor >= subs.length) {
        tapMode = false;
        refreshTapPanel();
        toast('All lyric lines are synced 🎉');
        return;
      }
      var t = round1(currentMediaTime());
      subs[tapCursor].start = t;
      if (tapCursor > 0) subs[tapCursor - 1].end = t;
      if (tapCursor === subs.length - 1 && (!subs[tapCursor].end || subs[tapCursor].end <= t)) {
        subs[tapCursor].end = t + 5;
      }
      var edited = tapCursor;
      tapCursor++;
      afterSyncEdit(edited);
      if (tapCursor < subs.length) {
        var row = document.getElementById('sync-row-' + tapCursor);
        if (row && row.scrollIntoView) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      var auto = document.getElementById('tap-auto-advance');
      if (auto && !auto.checked) tapCursor = edited;
    }

    function shiftAllSync(delta) {
      var subs = getActiveLesson().subtitles || [];
      subs.forEach(function (s) {
        s.start = Math.max(0, round1((s.start || 0) + delta));
        s.end = Math.max(s.start + 0.2, round1((s.end || 0) + delta));
      });
      afterSyncEdit();
      toast((delta >= 0 ? 'Shifted ' : 'Shifted ') + delta + 's');
    }

    function nudgeSync(delta) { shiftAllSync(delta); }

    function offsetValue() {
      var el = document.getElementById('sync-offset');
      return parseFloat(el && el.value) || 0.5;
    }

    function autoFitSync() {
      var subs = getActiveLesson().subtitles || [];
      if (!subs.length) { toast('No lyric lines to fit.'); return; }
      var total = effectiveDuration();
      var step = total / subs.length;
      subs.forEach(function (s, i) {
        s.start = round1(i * step);
        s.end = round1(Math.min(total, (i + 1) * step));
      });
      afterSyncEdit();
      toast('Evenly spread ' + subs.length + ' lines across ' + formatTime(total) + '.');
    }

    function resetSyncFromLesson() {
      try { localStorage.removeItem(syncKey()); } catch (e) {}
      var origin = window.LESSONS_DATA[window.CURRENT_LESSON_INDEX];
      var l = getActiveLesson();
      if (origin) l.subtitles = JSON.parse(JSON.stringify(origin.subtitles || l.subtitles || []));
      afterSyncEdit();
      toast('Timings reset to the lesson values.');
    }

    function replaceLyricsFromPaste() {
      var text = document.getElementById('lyrics-paste').value || '';
      var lines = text.split(/\\r?\\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (!lines.length) { toast('Paste the lyrics first, one line per row.'); return; }
      var total = effectiveDuration();
      var step = total / lines.length;
      getActiveLesson().subtitles = lines.map(function (line, i) {
        return { start: round1(i * step), end: round1(Math.min(total, (i + 1) * step)), text: line };
      });
      afterSyncEdit();
      toast('Rebuilt the timeline with ' + lines.length + ' lines.');
    }

    function appendPasteToLyrics() {
      var text = document.getElementById('lyrics-paste').value || '';
      var lines = text.split(/\\r?\\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (!lines.length) { toast('Nothing to append.'); return; }
      var l = getActiveLesson();
      var subs = l.subtitles || [];
      var start = subs.length ? (subs[subs.length - 1].end || subs[subs.length - 1].start) : 0;
      lines.forEach(function (line) {
        subs.push({ start: round1(start), end: round1(start + 5), text: line });
        start += 5;
      });
      l.subtitles = subs;
      afterSyncEdit();
      toast('Appended ' + lines.length + ' lines — fine-tune them with tap sync.');
    }

    function fillPasteFromLesson() {
      var subs = getActiveLesson().subtitles || [];
      document.getElementById('lyrics-paste').value = subs.map(function (s) { return s.text || ''; }).join('\\n');
    }

    function syncKey() {
      if (window.MUSIC_SYNC_KEY) return window.MUSIC_SYNC_KEY;
      var l = getActiveLesson();
      return 'tutorly-music-sync-' + (l.id || l.songTitle || 'lesson');
    }

    // Every timing tweak is remembered straight away, so a tutor who closes the
    // lesson without pressing 💾 still gets their work back on the next render.
    var syncAutosaveTimer = null;
    function autosaveSyncToBrowser() {
      if (syncAutosaveTimer) clearTimeout(syncAutosaveTimer);
      syncAutosaveTimer = setTimeout(function () {
        syncAutosaveTimer = null;
        try { localStorage.setItem(syncKey(), JSON.stringify(getActiveLesson().subtitles || [])); } catch (e) {}
      }, 400);
    }

    function saveSyncToBrowser() {
      try {
        localStorage.setItem(syncKey(), JSON.stringify(getActiveLesson().subtitles || []));
        toast('Synced lyrics saved in this browser.');
      } catch (e) {
        toast('Could not save in this browser (storage blocked).');
      }
    }

    function restoreSyncFromBrowser() {
      try {
        var raw = localStorage.getItem(syncKey());
        if (!raw) return;
        var subs = JSON.parse(raw);
        if (Array.isArray(subs) && subs.length) {
          getActiveLesson().subtitles = subs;
          afterSyncEdit();
        }
      } catch (e) {}
    }

    function exportSyncedJson() {
      var l = getActiveLesson();
      var payload = JSON.stringify({ lesson: l }, null, 2);
      var blob = new Blob([payload], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = String(l.songTitle || 'song').replace(/[^a-z0-9]+/gi, '_') + '_synced_lyrics.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 4000);
      toast('Exported the synced lyrics JSON.');
    }

    // ── FREE STREAMING SONG SEARCH (iTunes Search API — no key, CORS-enabled) ──
    var searchPreviewEl = null;

    function openSongSearch() {
      document.getElementById('song-search-modal').classList.remove('hidden');
      document.getElementById('song-search-modal').classList.add('flex');
      setTimeout(function () { try { document.getElementById('song-search-input').focus(); } catch (e) {} }, 60);
    }

    function closeSongSearch() {
      if (searchPreviewEl) { searchPreviewEl.pause(); searchPreviewEl.src = ''; searchPreviewEl = null; }
      document.getElementById('song-search-modal').classList.add('hidden');
      document.getElementById('song-search-modal').classList.remove('flex');
    }

    function searchSongs() {
      var q = document.getElementById('song-search-input').value.trim();
      var box = document.getElementById('song-search-results');
      if (!q) return;
      box.innerHTML = '<p class="text-xs text-slate-400 dark:text-zinc-400 text-center py-10">🔎 Searching for “' + escapeHtmlStr(q) + '”…</p>';
      fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(q) + '&media=music&limit=12&entity=song')
        .then(function (r) { if (!r.ok) throw new Error('Search failed'); return r.json(); })
        .then(function (data) {
          var results = (data && data.results) || [];
          if (results.length === 0) {
            box.innerHTML = '<p class="text-xs text-slate-400 dark:text-zinc-500 text-center py-10">No songs found for “' + escapeHtmlStr(q) + '”. Try another title or artist.</p>';
            return;
          }
          box.innerHTML = results.map(function (t) {
            var art = t.artworkUrl100 ? t.artworkUrl100.replace('100x100', '300x300') : '';
            return '<div class="p-3 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/50 transition-all flex items-center gap-3">' +
              (art ? '<img src="' + art + '" class="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-zinc-700" onerror="this.style.display=&quot;none&quot;" />' : '<div class="w-12 h-12 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/20 border border-fuchsia-200 dark:border-fuchsia-500/30 flex items-center justify-center text-xl">🎵</div>') +
              '<div class="flex-1 min-w-0">' +
                '<h5 class="text-sm font-black text-slate-900 dark:text-white truncate">' + escapeHtmlStr(t.trackName) + '</h5>' +
                '<p class="text-[11px] text-slate-500 dark:text-zinc-400 truncate">' + escapeHtmlStr(t.artistName) + (t.collectionName ? ' · ' + escapeHtmlStr(t.collectionName) : '') + '</p>' +
              '</div>' +
              (t.previewUrl
                ? '<button data-preview="' + escapeAttr(t.previewUrl) + '" class="btn px-3 py-2 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 text-[10px] font-black uppercase tracking-wider dark:bg-fuchsia-500/15 dark:border-fuchsia-500/40 dark:text-fuchsia-300">▶ Preview</button>' +
                  '<button data-use-track="' + escapeAttr(t.previewUrl) + '" data-track-title="' + escapeAttr(t.trackName || '') + '" data-track-artist="' + escapeAttr(t.artistName || '') + '" class="btn px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-wider">Use Track</button>'
                : '<span class="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500">No Preview</span>') +
            '</div>';
          }).join('');
        })
        .catch(function (e) {
          box.innerHTML = '<p class="text-xs text-red-500 text-center py-10">Search failed: ' + escapeHtmlStr(String((e && e.message) || e)) + '</p>';
        });
    }

    function playSearchPreview(btn, url) {
      if (!url) return;
      if (searchPreviewEl) { searchPreviewEl.pause(); searchPreviewEl.src = ''; searchPreviewEl = null; }
      var prev = new Audio(url);
      prev.play().catch(function () {});
      searchPreviewEl = prev;
      Array.prototype.forEach.call(document.querySelectorAll('#song-search-results button'), function (b) {
        b.classList.remove('ring-2', 'ring-fuchsia-400');
      });
      if (btn) btn.classList.add('ring-2', 'ring-fuchsia-400');
    }

    function loadSearchTrack(url, title, artist) {
      setMediaSource(url, (title || 'Preview') + (artist ? ' — ' + artist : ''));
      document.getElementById('header-title').innerText = title || 'Song Lesson';
      document.getElementById('header-artist').innerText = artist || 'Featured Artist';
      closeSongSearch();
      toast('Loaded “' + (title || 'track') + '”. Tap-sync the lyrics to this preview timeline.');
    }

    // ── HELPERS ───────────────────────────────────────────────────────────
    function formatTime(s) {
      if (!isFinite(s) || s < 0) s = 0;
      var m = Math.floor(s / 60);
      var sec = Math.floor(s % 60);
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function nativeLanguage() {
      var l = getActiveLesson();
      return (l && (l.l1 || (l.learnerProfile && l.learnerProfile.l1))) || 'your language';
    }

    /** Native-language support panel shown under every mini-lesson card. */
    function l1Panel(heading, bodyHtml) {
      return '<div class="mt-5 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-4 sm:p-5">' +
          '<p class="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-300 font-bold mb-2">🗣 Easy version · ' + escapeHtmlStr(nativeLanguage()) + '</p>' +
          (heading ? '<p class="text-base font-black text-amber-900 dark:text-amber-200 mb-1.5">' + escapeHtmlStr(heading) + '</p>' : '') +
          '<div class="mini-lesson-prose text-[15px] sm:text-base leading-7 text-amber-900/90 dark:text-amber-100/90">' + bodyHtml + '</div>' +
        '</div>';
    }

    function escapeHtmlStr(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeAttr(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
