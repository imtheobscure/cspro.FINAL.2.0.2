/**
 * ============================================================================
 * englishLessonHtmlGenerator.ts
 *
 * Exports: generateEnglishLessonHtml(content, learner, config) => string
 *
 * Produces a complete, self-contained HTML document that renders a fully
 * interactive English lesson web app with three modes:
 *   1. Prepare (Self-Study) – gamified, cat mascot, XP, badges
 *   2. Produce (Class Speaking) – teacher-led, projection-optimised
 *   3. Practice (Review & Homework) – assignments, self-assessment
 *
 * All CSS and JS are inlined. No external dependencies required at runtime.
 * ============================================================================
 */

import type {
  LessonPayload,
  LearnerProfile,
  GeneratorConfig,
  Section,
} from "./lessonTypes";
// These reach OUT of englishlesson2 to app-level modules, so they need one more
// `../` than they did when this project sat at the repo root. Fixed when the
// folder moved into tutorly-lessons/ — the lesson generator would not compile
// otherwise, and the failure was silent until something imported it.
import { getAccessibilityWidget } from "../../../utils/html/accessibility";
import { getCollaborationWidget } from "../../../utils/html/collaboration";
import { getAnnotationFeatures } from "../../../utils/html/annotations";
import { getTestingPanelFeatures } from "../../../utils/html/testingPanel";
import { getSplashScreenWidget } from "../../../utils/html/splashScreen";
import { getWhiteboardFeatures } from "../../../writeboard";
import { useAppStore } from "../../../store/useAppStore";
import { tagVoiceMapForLanguage, speechLanguageTag, voiceMatchesId } from "../../../utils/voices";
import { getCustomAvatar } from "../../../services/customAvatarStore";

/**
 * Main generator function.
 * Returns a complete HTML string ready to be rendered in an iframe or saved as a file.
 */
export function generateEnglishLessonHtml(
  content: LessonPayload,
  learner: LearnerProfile,
  config: GeneratorConfig,
): string {
  let avatarBase64 = '';
  const learnerAvatar = (learner as any).avatar || (learner as any).avatarId || '';
  if (learnerAvatar) {
    if (learnerAvatar.startsWith('custom:')) {
      avatarBase64 = getCustomAvatar(learnerAvatar) || '';
    } else if (learnerAvatar.startsWith('data:image/')) {
      avatarBase64 = learnerAvatar;
    }
  }
  // Provide defaults for missing config fields (e.g. from V2 wrapper)
  config.xpValues = config.xpValues || {};
  config.levelThresholds = config.levelThresholds || [
    100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500,
  ];

  // Pre-process: separate sections by mode and normalize lesson titles sequentially
  const normalizeSectionTitles = (sections: Section[]) => {
    return sections.map((s, idx) => {
      let title = s.title;
      if (/^(Lesson|Section)\s*\d+/i.test(title)) {
        title = title.replace(/^(Lesson|Section)\s*\d+/i, `$1 ${idx + 1}`);
      }
      return { ...s, title };
    });
  };

  const prepareSections = normalizeSectionTitles(content.sections.filter(
    (s) => s.mode === "prepare" || s.mode === "all",
  ));
  const produceSections = normalizeSectionTitles(content.sections.filter(
    (s) => s.mode === "produce" || s.mode === "all",
  ));
  const practiceSections = normalizeSectionTitles(content.sections.filter(
    (s) => s.mode === "practice" || s.mode === "all",
  ));

  // Calculate deadline info

  const mode = (config as any).role === "presenter" || (config as any).mode === "presenter" ? "presenter" : "learner";
  const accessibility = getAccessibilityWidget();
  const collabWidget = getCollaborationWidget(mode);
  // includePanels=true ships the FULL Micro Lesson V1 Bookmarks & Notes panels + engine
  // (the shared bundle installs window.LessonApp on this page since V2 has no native
  // engine), so the Annotation Toolbar opens the exact same panels as Micro Lesson V1.
  const annoWidget = getAnnotationFeatures(
    learner as any,
    mode,
    true,
  );
  const whiteboard =
    (config as any).role === "presenter"
      ? getWhiteboardFeatures(learner as any)
      : { html: "", css: "", js: "" };
  const storeState = useAppStore.getState();
  const splashScreen =
    storeState.tutorInfo.enableSplashScreens !== false
      ? getSplashScreenWidget({
          text: storeState.tutorInfo.splashScreenText,
          subtext: storeState.tutorInfo.splashScreenSubtext,
          logo: storeState.logoUrl,
        })
      : { html: "", css: "", js: "" };

  let testingPanel = { html: "", css: "", js: "" };
  if ((config as any).role === "presenter") {
    testingPanel = getTestingPanelFeatures();
  }

  const deadlineDate =
    config.deadlineDate || content.settings.deadlineIso || "";
  const now = new Date();
  const deadline = deadlineDate
    ? new Date(deadlineDate)
    : new Date(now.getTime() + 7 * 86400000);
  const totalDays = Math.max(
    1,
    Math.ceil((deadline.getTime() - now.getTime()) / 86400000) + 7,
  );
  const daysRemaining = Math.max(
    0,
    Math.ceil((deadline.getTime() - now.getTime()) / 86400000),
  );
  const batteryPercent = Math.min(
    100,
    Math.max(0, (daysRemaining / totalDays) * 100),
  );

  // Shared gamification sidebar (avatar ring, stats, badges, power-ups, radar).
  // Rendered in both Prepare and Practice tabs; `p` is an id prefix so each tab
  // gets its own unique ids ("" for Prepare, "prac-" for Practice).
  const gamificationSidebar = (p: string, asideId: string) => `
    <aside id="${asideId}" class="sidebar-left">
      <div class="avatar-section">
        <div class="xp-ring" id="${p}xp-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" class="ring-bg"/>
            <circle cx="60" cy="60" r="54" class="ring-fill" id="${p}ring-fill"/>
          </svg>
          <div class="avatar-img" id="${p}avatar-display">😎</div>
        </div>
        <div class="learner-name">${escHtml(learner.name)}</div>
        <div class="level-badge" id="${p}level-badge">Level 1</div>
      </div>
      <div class="stats-grid">
        <div class="stat-item"><span class="stat-icon">⚡</span><div><span id="${p}xp-count">0</span> XP</div></div>
        <div class="stat-item"><span class="stat-icon">🔥</span><div><span id="${p}streak-count">0</span> Streak</div></div>
        <div class="stat-item"><span class="stat-icon">🪙</span><div><span id="${p}coin-count">0</span> Coins</div></div>
        <div class="stat-item"><span class="stat-icon">⏱️</span><div><span id="${p}sidebar-session-timer">0:00</span></div></div>
      </div>
      <div class="level-progress">
        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="${p}level-progress-fill"></div>
        </div>
        <div class="progress-label" id="${p}level-progress-label">0 / 50 XP</div>
      </div>
      <div class="badges-section">
        <h4>🏆 Badges</h4>
        <div class="badge-row" id="${p}badge-row"></div>
      </div>
      <div class="powerups-section">
        <h4>⚡ Power-ups</h4>
        <div class="powerup-row">
          <button class="powerup-btn" onclick="usePowerUp('hint')" title="Hint (10🪙)">💡</button>
          <button class="powerup-btn" onclick="usePowerUp('doubleXp')" title="Double XP (25🪙)">✨</button>
          <button class="powerup-btn" onclick="usePowerUp('timeFreeze')" title="Time Freeze (30🪙)">❄️</button>
        </div>
      </div>
      <div class="voice-selector-section" style="margin-top: 16px;">
        <h4 style="font-size: 0.9rem; margin-bottom: 8px;">🗣️ Cat Voice</h4>
        <select id="${p}voice-selector" onchange="changeVoice(this.value)" style="width: 100%; padding: 6px; border-radius: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 0.85rem; max-width: 100%;">
            <option value="">Default Voice</option>
        </select>
      </div>
      <div class="radar-section">
        <h4>📊 Skills</h4>
        <canvas id="${p}radar-chart" width="240" height="240"></canvas>
      </div>
    </aside>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#4361ee">
<title>${escHtml(content.settings.lessonName)} – English Lesson</title>
<link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'" onerror="this.onerror=null;document.documentElement.classList.add('no-fa');">
<noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
<style>
${generateCSS(config)}

${accessibility.css}
${collabWidget.css}
${annoWidget.css}
${whiteboard.css}
${splashScreen.css}
</style>
</head>
<body>
<!-- Reading Progress Bar -->
<div id="reading-progress-bar"></div>

<!-- Top Navigation -->
<nav id="top-nav">
  <div class="nav-left">
    <div class="lesson-title-badge">
      <span class="lesson-badge-icon">📘</span>
      <span class="lesson-title" title="${escAttr(content.settings.lessonName)}">${escHtml(content.settings.lessonName)}</span>
      <span class="learner-header-badge">👤 ${escHtml(learner.name)}</span>
      <span class="cefr-header-badge">${escHtml((content.settings as any).cefrLevel || learner.cefrLevel || 'B1')}</span>
    </div>
  </div>
  <div class="nav-center">
    <div class="nav-tabs">
      <button class="tab-btn active" data-tab="prepare" onclick="switchTab('prepare')">📖 Prepare</button>
      <button class="tab-btn" data-tab="produce" onclick="switchTab('produce')">🎤 Produce</button>
      <button class="tab-btn" data-tab="practice" onclick="switchTab('practice')">✏️ Practice</button>
    </div>
  </div>
  <!-- Mobile-only trigger for the lesson tools drawer -->
  <button id="mobile-tools-btn" onclick="toggleMobileTools(event)" aria-label="Open lesson tools" aria-expanded="false" aria-controls="top-nav-tools">
    <span aria-hidden="true">🧰</span><span class="mt-label">Tools</span>
  </button>
  <div class="nav-right" id="top-nav-tools">
    <!-- Mobile-only drawer header (hidden on desktop) -->
    <div class="mobile-drawer-head">
      <span class="mt-title">🧰 Lesson Tools</span>
      <button class="mt-close" onclick="toggleMobileTools(false)" aria-label="Close lesson tools">✕</button>
    </div>
    <!-- Header Live Session Timer Widget (Countdown & Stopwatch) -->
    <div class="header-timer-pill" id="header-timer-widget" onclick="toggleTimerDropdown(event)" title="Class Timer (Click for Countdown / Presets)">
      <span class="header-pill-icon" id="header-timer-icon">⏱</span>
      <span id="session-timer" class="header-timer-text">01:27</span>
      <span class="timer-mode-badge" id="header-timer-mode-badge">DOWN</span>
    </div>

    <!-- Header Live Interactive Team Scoreboard with Steppers & Leaderboard -->
    <div class="header-teams-widget" id="header-teams-widget" title="Classroom Teams Scoreboard">
      <button class="teams-header-label-btn" onclick="openLeaderboardModal()" title="Open Dramatic Dynamic Leaderboard">
        🏆 <span class="teams-title-text">Teams</span>
      </button>
      <div class="header-team-unit team-a-unit">
        <button class="team-step-btn team-sub" onclick="teamPointChange('A', -1, event)" title="Subtract 1 point from Team A">−1</button>
        <button class="header-team-pill team-a" onclick="teamPointChange('A', 1, event)" title="Click to add +1 to Team A">
          <span class="team-dot dot-a"></span>A: <strong id="header-teamA-score">0</strong>
        </button>
        <button class="team-step-btn team-add" onclick="teamPointChange('A', 1, event)" title="Add 1 point to Team A">+1</button>
      </div>
      <div class="header-team-unit team-b-unit">
        <button class="team-step-btn team-sub" onclick="teamPointChange('B', -1, event)" title="Subtract 1 point from Team B">−1</button>
        <button class="header-team-pill team-b" onclick="teamPointChange('B', 1, event)" title="Click to add +1 to Team B">
          <span class="team-dot dot-b"></span>B: <strong id="header-teamB-score">0</strong>
        </button>
        <button class="team-step-btn team-add" onclick="teamPointChange('B', 1, event)" title="Add 1 point to Team B">+1</button>
      </div>
      <button class="leaderboard-pop-btn" onclick="openLeaderboardModal()" title="View Dynamic Dramatic Leaderboard">
        📊
      </button>
    </div>

    <!-- Deadline Battery -->
    <div class="battery-widget" title="Deadline ${deadline.toLocaleDateString()} — ${daysRemaining} days remaining">
      <div class="battery-icon-container">
        <div class="battery-fill-level ${daysRemaining <= 0 ? "empty" : daysRemaining <= 2 ? "low" : ""}" style="width:${batteryPercent}%"></div>
      </div>
      <span class="battery-days-label">${daysRemaining <= 0 ? "Due now" : daysRemaining + "d · " + deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
    </div>
    <!-- Toolbar buttons -->
    <button class="header-action-btn report-btn" onclick="downloadSessionReport()" title="Export Session Report ZIP">
      <i class="fas fa-file-export"></i><span class="header-action-label">Export Report</span>
    </button>
    <button class="header-action-btn" onclick="toggleSearch()" title="Search Content">
      <i class="fas fa-search"></i><span class="header-action-label">Search</span>
    </button>
    <!-- Bookmarks & Notes moved to the Annotation Toolbar (shared widget cluster) -->
  </div>
</nav>

<!-- Mobile: dimmed backdrop behind the tools drawer / support sheet -->
<div id="mobile-tools-backdrop" onclick="toggleMobileTools(false); toggleMobileSupport(false);"></div>

<!-- Search Bar (hidden by default) -->
<div id="search-bar" class="hidden">
  <input type="text" id="search-input" placeholder="Search lesson content..." oninput="doSearch(this.value)">
  <div id="filter-chips">
    <button class="chip active" onclick="toggleFilter(this,'all')">All</button>
    <button class="chip" onclick="toggleFilter(this,'vocabulary')">Vocabulary</button>
    <button class="chip" onclick="toggleFilter(this,'grammar')">Grammar</button>
    <button class="chip" onclick="toggleFilter(this,'listening')">Listening</button>
    <button class="chip" onclick="toggleFilter(this,'reading')">Reading</button>
    <button class="chip" onclick="toggleFilter(this,'speaking')">Speaking</button>
    <button class="chip" onclick="toggleFilter(this,'games')">Games</button>
  </div>
</div>

<!-- External Accessibility Panel will be injected here -->

<!-- The shared Annotation Toolbar bundle injects the FULL V1 Bookmarks & Notes panels here. -->

<!-- Tutor Dashboard (hidden, unlocked by passcode) -->
<div id="tutor-dashboard" class="hidden panel-overlay panel-center">
  <h3>🎓 Tutor Dashboard</h3>
  <div id="tutor-stats"></div>
  <div class="tutor-actions">
    <textarea id="tutor-announcement" placeholder="Broadcast announcement..."></textarea>
    <button onclick="broadcastAnnouncement()">📢 Broadcast</button>
    <button onclick="resetProgress()">🔄 Reset Progress</button>
    <button onclick="closeTutorDashboard()">✕ Close</button>
  </div>
</div>

<!-- Announcement Banner -->
<div id="announcement-banner" class="hidden"></div>

<!-- ==================== PREPARE MODE ==================== -->
<div id="tab-prepare" class="tab-content active">
  <div class="prepare-layout">
    <!-- Gamification Sidebar (shared with Practice tab) -->
    ${gamificationSidebar('', 'prepare-sidebar')}
    <!-- Main Content -->
    <main class="prepare-main">
      <div class="lesson-summary">${content.lessonSummary}</div>
      ${prepareSections.map((s, si) => renderSection(s, si, "prepare")).join("")}
    </main>
  </div>
</div>

<!-- ==================== PRODUCE MODE ==================== -->
<div id="tab-produce" class="tab-content">
  <div class="produce-layout">
    <!-- Mobile-only: floating trigger for the support sheet -->
    <button id="mobile-support-btn" onclick="toggleMobileSupport(true)" aria-label="Open spoken support and phrases">
      <span aria-hidden="true">💬</span><span class="ms-label">Support</span>
    </button>
    <main class="produce-main">
      <div class="produce-nav-top">
        <button class="produce-arrow" onclick="produceNav(-1)">← Previous</button>
        <span class="produce-progress" id="produce-progress">Activity 1 of ${produceSections.reduce((a, s) => a + s.activities.length, 0)}</span>
        <button class="produce-arrow" onclick="produceNav(1)">Next →</button>
      </div>
      <div id="produce-activity-container">
        ${produceSections
          .map((s, si) =>
            s.activities
              .map(
                (a, ai) => {
                  const actId = `act-produce-${si}-${ai}`;
                  return `<div class="produce-activity-slide" data-produce-idx="${si}-${ai}" style="display:none">
              <h2 class="produce-activity-title">${escHtml(a.title)}</h2>
              <div class="activity-card produce-card" id="${actId}" data-type="${a.type}" data-content='${escAttr(typeof a.content === "string" ? a.content : JSON.stringify(a.content))}' data-feedback='${escAttr(a.comprehensiveFeedback)}' data-cat-comment='${escAttr((a as any).catComment)}' data-mode="produce">
                ${a.imageUrl ? `<div class="activity-media"><img src="${escAttr(a.imageUrl)}" alt="Activity Image" style="max-width:100%; border-radius:8px; margin: 12px 16px 0 16px;"/>${a.imageCaption ? `<div style="text-align:center; font-size:0.85rem; color:var(--text2); margin-top:4px;">${escHtml(a.imageCaption)}</div>` : ''}</div>` : ''}
                ${a.videoUrl ? `<div class="activity-media" style="margin: 12px 16px 0 16px;"><div style="position:relative; padding-bottom:56.25%; height:0; border-radius:8px; overflow:hidden;"><iframe src="${escAttr(formatEmbedUrl(a.videoUrl))}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe></div>${a.videoCaption ? `<div style="text-align:center; font-size:0.85rem; color:var(--text2); margin-top:4px;">${escHtml(a.videoCaption)}</div>` : ''}</div>` : ''}
                <div class="activity-body"></div>
              </div>
            </div>`;
                }
              )
              .join(""),
          )
          .join("")}
      </div>
      <div class="produce-nav-bottom">
        <button class="produce-arrow" onclick="produceNav(-1)">← Previous</button>
        <button class="produce-arrow" onclick="produceNav(1)">Next →</button>
      </div>
    </main>
    <!-- Support panels wrapper.
         Desktop: display:contents — both panels stay flex children of the layout
         (the left one is ordered back to the front).
         Mobile: the same two panels live in a slide-in support sheet. -->
    <div id="produce-support-sheet" class="produce-support-sheet">
    <div class="mobile-sheet-head">
      <span class="ms-title">💬 Spoken Support &amp; Phrases</span>
      <button class="ms-close" onclick="toggleMobileSupport(false)" aria-label="Close support panel">✕</button>
    </div>
    <!-- Left Support Panel (Spoken Support) -->
    <aside class="produce-support-left">
      <h3 class="produce-panel-title produce-panel-title-left">
        💬 Spoken Support
      </h3>
      <div id="produce-support-vocab-container" class="produce-support-container">
        <p class="produce-support-placeholder">Click any question to view recommended vocabulary and spoken structures.</p>
      </div>
    </aside>
    <aside class="sidebar-right produce-sidebar">
      <!-- Right Support Panel (Recommend Phrases & Idiomatic Expressions) -->
      <div class="produce-support-right-card">
        <h3 class="produce-panel-title produce-panel-title-right">
          💡 Recommend Phrases
        </h3>
        <div id="produce-support-phrases-container" class="produce-support-container">
          <p class="produce-support-placeholder">Select a question to see recommended phrases and expressions.</p>
        </div>
      </div>
    </aside>
    </div>
  </div>
</div>

<!-- ==================== PRACTICE MODE ==================== -->
<div id="tab-practice" class="tab-content">
  <div class="practice-layout">
    <!-- Gamification Sidebar (same as Prepare — no more Study Tools right sidebar) -->
    ${gamificationSidebar('prac-', 'practice-sidebar')}
    <main class="practice-main">
      <div class="practice-progress-header">
        <h2>✏️ Practice & Homework</h2>
        <div class="practice-global-progress">
          <div class="progress-bar-container">
            <div class="progress-bar-fill" id="practice-progress-fill"></div>
          </div>
          <span id="practice-progress-label">0% complete</span>
        </div>
      </div>
      ${practiceSections.map((s, si) => renderSection(s, si, "practice")).join("")}
    </main>
  </div>
</div>

<!-- Timer Control Popover Dropdown -->
<div id="timer-dropdown-popover" class="timer-popover-menu hidden" onclick="event.stopPropagation()">
  <div class="timer-popover-header">
    <span class="timer-popover-title">⏱️ Classroom Session Timer</span>
    <button class="timer-close-btn" onclick="toggleTimerDropdown(event)" title="Close">✕</button>
  </div>
  <div class="timer-popover-body">
    <div class="timer-tab-row">
      <button class="timer-tab-btn active" id="timer-tab-down" onclick="setTimerType('countdown')">⏳ Countdown</button>
      <button class="timer-tab-btn" id="timer-tab-up" onclick="setTimerType('stopwatch')">⏱️ Stopwatch</button>
    </div>
    <div class="timer-big-display" id="timer-modal-display">01:27</div>
    <div class="timer-controls-row">
      <button class="timer-action-btn primary" id="timer-start-btn" onclick="toggleTimerRunning()">▶ Start</button>
      <button class="timer-action-btn" onclick="resetTimerState()">↺ Reset</button>
      <button class="timer-action-btn" onclick="addTimerSeconds(60)">+1 Min</button>
      <button class="timer-action-btn" onclick="addTimerSeconds(300)">+5 Min</button>
    </div>
    <div class="timer-presets-label">Quick Presets</div>
    <div class="timer-presets-grid" id="timer-countdown-presets">
      <button class="timer-preset-chip active" onclick="setTimerPreset(87, this)">⏱ 01:27</button>
      <button class="timer-preset-chip" onclick="setTimerPreset(180, this)">3 Min</button>
      <button class="timer-preset-chip" onclick="setTimerPreset(300, this)">5 Min</button>
      <button class="timer-preset-chip" onclick="setTimerPreset(600, this)">10 Min</button>
      <button class="timer-preset-chip" onclick="setTimerPreset(900, this)">15 Min</button>
      <button class="timer-preset-chip" onclick="setTimerPreset(1500, this)">25m Pomodoro</button>
    </div>
    <div class="timer-custom-row">
      <span>Custom (mm:ss):</span>
      <input type="text" id="timer-custom-input" placeholder="01:27" maxlength="5" onkeydown="if(event.key==='Enter')applyCustomTimer()" />
      <button class="timer-set-btn" onclick="applyCustomTimer()">Set</button>
    </div>
  </div>
</div>

<!-- Dynamic Dramatic Leaderboard Modal -->
<div id="dynamic-leaderboard-modal" class="modal-overlay hidden" style="z-index: 999999;" onclick="if(event.target===this)closeLeaderboardModal()">
  <div class="leaderboard-arena-card" onclick="event.stopPropagation()">
    <!-- Arena Header -->
    <div class="arena-header">
      <div class="arena-badge">🏆 CLASSROOM ARENA</div>
      <h2 class="arena-title">Dynamic Teams Leaderboard</h2>
      <p class="arena-subtitle">Live real-time battle for classroom mastery & participation!</p>
      <button class="arena-close-btn" onclick="closeLeaderboardModal()" title="Close">✕</button>
    </div>

    <!-- Live Leader Banner -->
    <div class="arena-leader-banner" id="arena-leader-banner">
      <span class="leader-trophy-icon">👑</span>
      <span id="arena-leader-text">It's a Tie! Both teams are neck and neck!</span>
    </div>

    <!-- Tug-of-War Power Balance Bar -->
    <div class="power-bar-wrapper">
      <div class="power-bar-labels">
        <span class="team-a-label" id="power-label-a">Team A: 50%</span>
        <span class="power-vs-badge">⚔️ POWER BALANCE</span>
        <span class="team-b-label" id="power-label-b">Team B: 50%</span>
      </div>
      <div class="power-bar-track">
        <div class="power-bar-fill team-a-fill" id="power-bar-a" style="width: 50%"></div>
        <div class="power-bar-fill team-b-fill" id="power-bar-b" style="width: 50%"></div>
        <div class="power-bar-clash" id="power-bar-clash">⚡</div>
      </div>
    </div>

    <!-- Teams Score Arena Grid -->
    <div class="arena-teams-grid">
      <!-- Team A Card -->
      <div class="arena-team-card team-a-card" id="arena-card-team-a">
        <div class="card-glow team-a-glow"></div>
        <div class="team-card-top">
          <span class="team-badge badge-a">🔴 RED TITANS</span>
          <input type="text" class="team-name-input" id="team-name-a" value="Team A" onchange="updateTeamName('A', this.value)" title="Click to rename" />
        </div>
        <div class="team-score-digital team-a-score" id="arena-score-a">0</div>
        <div class="team-quick-actions">
          <button class="quick-pts-btn pts-sub-5" onclick="teamPointChange('A', -5, event)" title="Subtract 5 pts">−5</button>
          <button class="quick-pts-btn pts-sub-1" onclick="teamPointChange('A', -1, event)" title="Subtract 1 pt">−1</button>
          <button class="quick-pts-btn pts-add-1" onclick="teamPointChange('A', 1, event)" title="Add 1 pt">+1</button>
          <button class="quick-pts-btn pts-add-5" onclick="teamPointChange('A', 5, event)" title="Add 5 pts">+5</button>
          <button class="quick-pts-btn pts-add-10" onclick="teamPointChange('A', 10, event)" title="Add 10 pts">+10 🔥</button>
        </div>
      </div>

      <!-- Team B Card -->
      <div class="arena-team-card team-b-card" id="arena-card-team-b">
        <div class="card-glow team-b-glow"></div>
        <div class="team-card-top">
          <span class="team-badge badge-b">🔵 BLUE DRAGONS</span>
          <input type="text" class="team-name-input" id="team-name-b" value="Team B" onchange="updateTeamName('B', this.value)" title="Click to rename" />
        </div>
        <div class="team-score-digital team-b-score" id="arena-score-b">0</div>
        <div class="team-quick-actions">
          <button class="quick-pts-btn pts-sub-5" onclick="teamPointChange('B', -5, event)" title="Subtract 5 pts">−5</button>
          <button class="quick-pts-btn pts-sub-1" onclick="teamPointChange('B', -1, event)" title="Subtract 1 pt">−1</button>
          <button class="quick-pts-btn pts-add-1" onclick="teamPointChange('B', 1, event)" title="Add 1 pt">+1</button>
          <button class="quick-pts-btn pts-add-5" onclick="teamPointChange('B', 5, event)" title="Add 5 pts">+5</button>
          <button class="quick-pts-btn pts-add-10" onclick="teamPointChange('B', 10, event)" title="Add 10 pts">+10 🔥</button>
        </div>
      </div>
    </div>

    <!-- Arena Footer Controls & Activity Feed -->
    <div class="arena-footer-section">
      <div class="arena-activity-log" id="arena-activity-log">
        <div class="activity-log-title">📋 Live Activity Log</div>
        <div class="activity-log-items" id="arena-log-items">
          <div class="log-item-empty">No score events yet. Award points to start the match!</div>
        </div>
      </div>
      <div class="arena-footer-toolbar">
        <button class="arena-tool-btn" onclick="undoLastTeamPoint()">↩️ Undo Last</button>
        <button class="arena-tool-btn" onclick="toggleArenaSoundFX()"><span id="arena-sfx-label">🔊 SFX: ON</span></button>
        <button class="arena-tool-btn" onclick="triggerArenaConfetti()">🎉 Confetti</button>
        <button class="arena-tool-btn danger" onclick="resetTeamScores()">↺ Reset Scores</button>
      </div>
    </div>
  </div>
</div>

<!-- Cute Cat Mascot Companion -->
${
  config.mascotEnabled
    ? `
<div id="cat-mascot" class="cat-mascot" onclick="handleCatClick(event)" title="Cat Study Companion (Click for Quick Tools)">
  <!-- Live Spoken Speech Bubble -->
  <div class="cat-speech-bubble" id="cat-speech">
    <span class="speech-bubble-text" id="cat-speech-text">Hi there! Click me to read anything aloud! 🐾</span>
  </div>
  
  <!-- Cute, friendly animated SVG cat mascot -->
  <div class="cat-avatar-container cute-cat-avatar" id="cat-avatar-box">
    <!-- Acoustic Pulsing Ripple Rings (when speaking) -->
    <div class="cat-audio-wave-ring ring-1"></div>
    <div class="cat-audio-wave-ring ring-2"></div>
    
    <svg class="realistic-cat-svg" id="cat-svg-graphic" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Soft cream kawaii fur palette -->
        <radialGradient id="catFurRealistic" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fffef9" />
          <stop offset="60%" stop-color="#fff3d4" />
          <stop offset="100%" stop-color="#ffe0ae" />
        </radialGradient>
        <linearGradient id="catEarInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffd9e8" />
          <stop offset="55%" stop-color="#ffb1cf" />
          <stop offset="100%" stop-color="#ff8fbc" />
        </linearGradient>
        <!-- Big sparkly sky-blue eyes -->
        <radialGradient id="catEyeEmerald" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#e3f3ff" />
          <stop offset="35%" stop-color="#8ccbff" />
          <stop offset="70%" stop-color="#4f9bff" />
          <stop offset="100%" stop-color="#2f6bf0" />
        </radialGradient>
        <!-- Soft pink blush -->
        <radialGradient id="catBlushGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffc2d1" />
          <stop offset="100%" stop-color="#ff9eb5" />
        </radialGradient>
        <linearGradient id="catCollarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f87171" />
          <stop offset="50%" stop-color="#fb5b7a" />
          <stop offset="100%" stop-color="#e0486b" />
        </linearGradient>
        <linearGradient id="catBellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff3a6" />
          <stop offset="45%" stop-color="#ffd94d" />
          <stop offset="100%" stop-color="#f0a500" />
        </linearGradient>
      </defs>

      <!-- Floating hearts (cute ambient animation) -->
      <g class="cat-hearts">
        <path class="cat-heart cat-heart-1" d="M 30 26 C 27.4 22 22 23.4 23.6 27.6 C 24.6 30.2 27.6 31.8 30 33.6 C 32.4 31.8 35.4 30.2 36.4 27.6 C 38 23.4 32.6 22 30 26 Z" fill="#ff9ec0" />
        <path class="cat-heart cat-heart-2" d="M 92 20 C 89.8 16.6 85.2 17.8 86.6 21.4 C 87.5 23.6 90 24.9 92 26.4 C 94 24.9 96.5 23.6 97.4 21.4 C 98.8 17.8 94.2 16.6 92 20 Z" fill="#ffc2d1" />
      </g>

      <!-- Big round left ear -->
      <g class="cat-ear cat-ear-left">
        <path d="M 22 44 C 15 24 16 4 36 9 C 49 12 52 30 45 44 Z" fill="url(#catFurRealistic)" />
        <path d="M 25 38 C 20 24 21 12 33 15 C 42 17 44 28 40 38 Z" fill="url(#catEarInner)" opacity="0.95" />
      </g>

      <!-- Big round right ear -->
      <g class="cat-ear cat-ear-right">
        <path d="M 98 44 C 105 24 104 4 84 9 C 71 12 68 30 75 44 Z" fill="url(#catFurRealistic)" />
        <path d="M 95 38 C 100 24 99 12 87 15 C 78 17 76 28 80 38 Z" fill="url(#catEarInner)" opacity="0.95" />
      </g>

      <!-- Round kawaii head base -->
      <ellipse cx="60" cy="60" rx="44" ry="41" fill="url(#catFurRealistic)" />

      <!-- Cute fur tuft on top of head -->
      <g class="cat-hair-tuft" fill="#f7c98a">
        <path d="M 51 23 Q 49 15 56 17 Q 54 20 56 24 Z" />
        <path d="M 58 21 Q 58 12 63 15 Q 61 19 62 23 Z" />
        <path d="M 65 22 Q 68 14 71 18 Q 68 22 67 24 Z" />
      </g>

      <!-- Big sparkly eyes -->
      <g class="cat-eyes-group">
        <!-- Left Eye -->
        <g class="cat-eye cat-eye-left" transform="translate(42, 55)">
          <ellipse cx="0" cy="0" rx="10" ry="11" fill="#ffffff" />
          <ellipse cx="0" cy="1" rx="8" ry="9" fill="url(#catEyeEmerald)" />
          <ellipse class="cat-pupil" cx="0" cy="1.5" rx="4.4" ry="6.4" fill="#23324f" />
          <circle cx="-3.2" cy="-3.6" r="2.9" fill="#ffffff" />
          <circle cx="2.6" cy="2.8" r="1.4" fill="#ffffff" opacity="0.9" />
          <circle cx="-1" cy="4.5" r="0.9" fill="#ffffff" opacity="0.6" />
          <path class="cat-eyelid cat-eyelid-left" d="M -11 -12 Q 0 -13.5 11 -12 L 11 1 Q 0 2.5 -11 1 Z" fill="url(#catFurRealistic)" />
        </g>

        <!-- Right Eye -->
        <g class="cat-eye cat-eye-right" transform="translate(78, 55)">
          <ellipse cx="0" cy="0" rx="10" ry="11" fill="#ffffff" />
          <ellipse cx="0" cy="1" rx="8" ry="9" fill="url(#catEyeEmerald)" />
          <ellipse class="cat-pupil" cx="0" cy="1.5" rx="4.4" ry="6.4" fill="#23324f" />
          <circle cx="-3.2" cy="-3.6" r="2.9" fill="#ffffff" />
          <circle cx="2.6" cy="2.8" r="1.4" fill="#ffffff" opacity="0.9" />
          <circle cx="-1" cy="4.5" r="0.9" fill="#ffffff" opacity="0.6" />
          <path class="cat-eyelid cat-eyelid-right" d="M -11 -12 Q 0 -13.5 11 -12 L 11 1 Q 0 2.5 -11 1 Z" fill="url(#catFurRealistic)" />
        </g>
      </g>

      <!-- Tiny pink nose -->
      <path d="M 57 66.5 C 58 65 62 65 63 66.5 L 60 70 Z" fill="#ff8fa3" />
      <path d="M 57.6 66.8 Q 60 65.4 62.4 66.8" stroke="#ffb9c9" stroke-width="0.8" fill="none" stroke-linecap="round" opacity="0.8" />

      <!-- Happy w-shaped mouth + talking mouth -->
      <path class="cat-mouth-path" id="cat-mouth-line" d="M 52.5 71.5 Q 56.5 75.2 60 71.8 Q 63.5 75.2 67.5 71.5" stroke="#a05a6e" stroke-width="1.9" fill="none" stroke-linecap="round" />
      <ellipse class="cat-mouth-open-ellipse" id="cat-mouth-interior" cx="60" cy="74.6" rx="4.2" ry="0" fill="#ef6a8e" opacity="0" />

      <!-- Rosy blush cheeks -->
      <g class="cat-blush">
        <ellipse cx="28.5" cy="67.5" rx="6" ry="3.4" fill="url(#catBlushGrad)" opacity="0.6" />
        <ellipse cx="91.5" cy="67.5" rx="6" ry="3.4" fill="url(#catBlushGrad)" opacity="0.6" />
      </g>

      <!-- Cute short whiskers -->
      <g class="cat-whiskers" stroke="#e8b98a" stroke-width="1.2" stroke-linecap="round" fill="none">
        <path d="M 40 69.5 Q 27 67.5 19 68.5" />
        <path d="M 40 73.5 Q 27 74 19 75.5" />
        <path d="M 80 69.5 Q 93 67.5 101 68.5" />
        <path d="M 80 73.5 Q 93 74 101 75.5" />
      </g>

      <!-- Pastel collar & golden bell -->
      <g class="cat-collar-group">
        <path d="M 30 92 Q 60 103 90 92 Q 60 107 30 92 Z" fill="url(#catCollarGrad)" />
        <circle cx="60" cy="101.5" r="6" fill="url(#catBellGrad)" />
        <circle cx="60" cy="101.5" r="1.2" fill="#a86a00" />
        <line x1="55.5" y1="102" x2="64.5" y2="102" stroke="#a86a00" stroke-width="0.9" />
      </g>

      <!-- Waving paw (animated hello!) -->
      <g class="cat-waving-paw">
        <g transform="rotate(-18 24 96)">
          <ellipse cx="24" cy="96" rx="10.5" ry="7.5" fill="url(#catFurRealistic)" />
          <circle cx="20.2" cy="95.2" r="1.7" fill="#ffb9cd" />
          <circle cx="24" cy="93.6" r="1.7" fill="#ffb9cd" />
          <circle cx="27.8" cy="95.2" r="1.7" fill="#ffb9cd" />
          <ellipse cx="24" cy="98.4" rx="2.6" ry="2" fill="#ffb9cd" />
        </g>
      </g>

      <!-- Resting paw -->
      <g class="cat-resting-paw" transform="rotate(14 97 96)">
        <ellipse cx="97" cy="96" rx="10" ry="7" fill="url(#catFurRealistic)" />
        <circle cx="93.6" cy="95.4" r="1.5" fill="#ffc9d6" />
        <circle cx="97" cy="94" r="1.5" fill="#ffc9d6" />
        <circle cx="100.4" cy="95.4" r="1.5" fill="#ffc9d6" />
      </g>
    </svg>
    
    <!-- Dynamic Audio EQ Bars -->
    <div class="cat-audio-eq-bars" id="cat-eq-bars">
      <div class="eq-bar bar-1"></div>
      <div class="eq-bar bar-2"></div>
      <div class="eq-bar bar-3"></div>
    </div>
  </div>

  <!-- Quick Companion Dock (Action Toolbar) -->
  <div class="cat-companion-dock" id="cat-companion-dock" onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()">
    <button type="button" class="dock-btn read-btn" onclick="readActiveSectionAloud(event)" title="Read Active Section Aloud">
      <span>🔊</span> <span class="dock-label">Read Section</span>
    </button>
    <button type="button" class="dock-btn" onclick="toggleSpeechPause(event)" id="cat-pause-btn" title="Pause / Resume Audio">
      <span id="cat-pause-icon">⏸️</span>
    </button>
    <button type="button" class="dock-btn" onclick="toggleCatMute(event)" id="cat-mute-btn" title="Mute / Unmute Voice">
      <span id="cat-mute-icon">🔈</span>
    </button>
    <button type="button" class="dock-btn" onclick="toggleHoverReadMode(event)" id="cat-hover-btn" title="Toggle Hover-to-Read Mode">
      <span>🎯</span> <span id="cat-hover-badge" class="dock-status-badge active">ON</span>
    </button>
    <button type="button" class="dock-btn speed-btn" onclick="cycleSpeechSpeed(event)" id="cat-speed-btn" title="Speech Speed">
      <span id="cat-speed-label">1.0x</span>
    </button>
    <span class="dock-divider" aria-hidden="true"></span>
    <!-- Hide-the-cat lives in the menu: click the cat, then tap this ✕ -->
    <button type="button" class="cat-close-btn" id="cat-close-btn" onclick="closeCatMascot(event)" onpointerdown="event.stopPropagation();" title="Hide the cat for this session" aria-label="Hide cat mascot">✕</button>
  </div>
</div>
`
    : ""
}

<!-- Celebration Overlay -->
<div id="celebration-overlay" class="hidden"></div>

<!-- Level Up Overlay -->
<div id="levelup-overlay" class="hidden">
  <div class="levelup-content">
    <div class="levelup-emoji">🎉</div>
    <h1>LEVEL UP!</h1>
    <p id="levelup-text"></p>
  </div>
</div>

<!-- XP Popup -->
<div id="xp-popup" class="hidden"></div>

<!-- Large Cute Cat Mascot Feedback Modal -->
<div id="large-cat-modal" class="modal-overlay hidden" style="z-index: 100000; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);" onclick="this.classList.add('hidden')">
  <div class="modal-content" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95)); border: 2px solid rgba(255, 215, 0, 0.4); border-radius: 24px; padding: 32px 24px; text-align: center; color: white; box-shadow: 0 20px 50px rgba(0,0,0,0.6); max-width: 440px;">
    <div class="celebrate-avatar-wrap" style="width: 140px; height: 140px; margin: 0 auto 16px; animation: cat-bounce 1s infinite alternate; filter: drop-shadow(0 8px 24px rgba(255, 215, 0, 0.4));">
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
        <use href="#cat-svg-graphic" />
      </svg>
    </div>
    <div id="large-cat-badge" style="display: inline-block; padding: 4px 14px; background: rgba(255, 215, 0, 0.2); border: 1px solid #ffd700; border-radius: 20px; font-size: 0.9rem; font-weight: 800; color: #facc15; margin-bottom: 8px;">🌟 PRAISE FROM COMPANION</div>
    <h2 id="large-cat-text" style="font-size: 1.8rem; margin: 8px 0; font-weight: 800; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">Awesome job!</h2>
    <p id="large-cat-subtext" style="font-size: 0.95rem; color: #cbd5e1; margin: 0;">Keep up the incredible focus!</p>
  </div>
</div>

<style>
@keyframes cat-bounce {
    0% { transform: scale(1) translateY(0); }
    100% { transform: scale(1.1) translateY(-20px); }
}
</style>

<!-- Avatar Setup Modal -->
<div id="avatar-modal" class="modal-overlay hidden">
  <div class="modal-content" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
    <h2>Choose Your Avatar 😎</h2>
    <p>Pick an emoji, use your webcam, or paste an image!</p>
    
    <div style="margin-bottom: 20px;">
        <button onclick="startWebcam()" class="action-btn" style="background:var(--primary);color:#fff">📷 Take Photo</button>
        <button onclick="document.getElementById('avatar-upload').click()" class="action-btn">📁 Upload File</button>
        <input type="file" id="avatar-upload" hidden accept="image/*" onchange="handleAvatarUpload(event)">
        <p style="font-size:0.8rem;color:var(--text-light);margin-top:8px">Or simply paste (Ctrl+V / Cmd+V) an image here!</p>
    </div>

    <div id="webcam-container" class="hidden" style="margin-bottom: 20px; text-align: center;">
        <video id="webcam-video" autoplay playsinline style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; margin: 0 auto;"></video>
        <br>
        <button onclick="captureWebcam()" class="action-btn" style="margin-top: 10px; background: #10b981; color: white;">📸 Capture</button>
    </div>

    <div class="avatar-emoji-grid">
      ${[
        "😎",
        "🦸",
        "🧙",
        "🦊",
        "🐼",
        "🦁",
        "🐸",
        "🦉",
        "🐱",
        "🐶",
        "🦄",
        "🐲",
        "👩‍🚀",
        "👨‍💻",
        "👩‍🎤",
        "🧑‍🔬",
        "🥷",
        "🧝",
        "🧚",
        "🤖",
      ]
        .map(
          (e) =>
            `<button class="avatar-option" onclick="selectAvatar('${e}')">${e}</button>`,
        )
        .join("")}
    </div>
  </div>
</div>

${splashScreen.html}
${accessibility.html}
${annoWidget.html}
${collabWidget.html}
${whiteboard.html}

<script>
${generateJS(content, learner, config, prepareSections, produceSections, practiceSections, daysRemaining, totalDays)}

${accessibility.js}
${annoWidget.js}
${collabWidget.js}
${whiteboard.js}
${splashScreen.js}
</script>
</body>
</html>`;
}

/* ─── Helper: HTML-escape ─── */
function escHtml(s?: string | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ─── Helper: Attribute-escape ─── */
function escAttr(s?: string | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatEmbedUrl(url?: string | null): string {
  if (!url) return "";
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?]+)/);
    return "https://www.youtube.com/embed/" + (match ? match[1] : "");
  }
  if (url.includes("vimeo.com")) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return "https://player.vimeo.com/video/" + (match ? match[1] : "");
  }
  return url;
}

/* ─── Render a section with its activities ─── */
function renderSection(
  section: Section,
  sectionIdx: number,
  mode: string,
): string {
  const diffLabel = section.difficulty
    ? `<span class="diff-badge diff-${section.difficulty}">${section.difficulty}</span>`
    : "";
  const sectionId = `section-${mode}-${sectionIdx}`;

  return `
  <div class="section-accordion" id="${sectionId}" data-tags='${JSON.stringify(section.tags || [])}'>
    <div class="section-header" style="border-left-color:${section.color}" onclick="toggleSection('${sectionId}')">
      <div class="section-header-left">
        <span class="section-chevron">▶</span>
        <h3 class="section-title">${escHtml(section.title)}</h3>
        ${diffLabel}
        <span class="section-time">⏱ ${escHtml(section.studyTime)}</span>
        ${section.xpReward > 0 && mode === "prepare" ? `<span class="section-xp">⚡${section.xpReward} XP</span>` : ""}
      </div>
      <div class="section-header-right">
        <div class="section-progress-mini">
          <div class="progress-bar-container mini">
            <div class="progress-bar-fill" id="prog-${sectionId}"></div>
          </div>
          <span class="prog-text" id="prog-text-${sectionId}">0/${section.activities.length}</span>
        </div>
        <button class="bookmark-btn" onclick="event.stopPropagation();toggleBookmark('${sectionId}','${escAttr(section.title)}')" title="Bookmark">☆</button>
      </div>
    </div>
    <div class="section-body collapsed" id="body-${sectionId}">
      ${section.activities
        .map((a, ai) => {
          const actId = `act-${mode}-${sectionIdx}-${ai}`;
          return `
        <div class="activity-card" id="${actId}" data-type="${a.type}" data-content='${escAttr(typeof a.content === "string" ? a.content : JSON.stringify(a.content))}' data-feedback='${escAttr(a.comprehensiveFeedback)}' data-cat-comment='${escAttr((a as any).catComment)}' data-mode="${mode}" data-section="${sectionId}" data-act-idx="${ai}">
          <div class="activity-header">
            <span class="activity-type-icon">${getActivityIcon(a.type)}</span>
            <h4 class="activity-title">${escHtml(a.title)}</h4>
            <span class="activity-status" id="status-${actId}"></span>
            <button class="bookmark-btn small" onclick="toggleBookmark('${actId}','${escAttr(a.title)}')" title="Bookmark">☆</button>
          </div>
          ${a.imageUrl ? `<div class="activity-media"><img src="${escAttr(a.imageUrl)}" alt="Activity Image" style="max-width:100%; border-radius:8px; margin: 12px 16px 0 16px;"/>${a.imageCaption ? `<div style="text-align:center; font-size:0.85rem; color:var(--text2); margin-top:4px;">${escHtml(a.imageCaption)}</div>` : ''}</div>` : ''}
          ${a.videoUrl ? `<div class="activity-media" style="margin: 12px 16px 0 16px;"><div style="position:relative; padding-bottom:56.25%; height:0; border-radius:8px; overflow:hidden;"><iframe src="${escAttr(formatEmbedUrl(a.videoUrl))}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe></div>${a.videoCaption ? `<div style="text-align:center; font-size:0.85rem; color:var(--text2); margin-top:4px;">${escHtml(a.videoCaption)}</div>` : ''}</div>` : ''}
          <div class="activity-body" id="abody-${actId}"></div>
          <div class="activity-feedback hidden" id="afeedback-${actId}"></div>
          <div class="activity-actions">
            <button class="retry-btn hidden" id="retry-${actId}" onclick="retryActivity('${actId}')">🔄 Retry</button>
          </div>
        </div>`;
        })
        .join("")}
    </div>
  </div>`;
}

/* ─── Activity type icons ─── */
function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    flashcard: "🃏",
    vocab_table: "📋",
    spelling_bee: "🐝",
    bingo: "🎯",
    word_search: "🔎",
    hangman: "☠️",
    collocation_drag: "🔗",
    word_formation: "🧩",
    gap_fill: "✏️",
    gap_fill_dropdown: "📝",
    gap_fill_drag: "🎯",
    error_correction: "🔧",
    scramble: "🔀",
    matching: "🔗",
    memory_match: "🧠",
    sequence_ordering: "📊",
    sentence_auction: "💰",
    pattern_drills: "🔄",
    listening_mc: "🎧",
    minimal_pairs: "👂",
    dictation: "📝",
    gap_transcript: "📄",
    phoneme_bingo: "🔤",
    pronunciation_check: "🗣️",
    tongue_twister: "👅",
    read_aloud: "📢",
    timed_reading: "⏱️",
    interactive_story: "📖",
    text_reconstruction: "🧱",
    jigsaw_reading: "🧩",
    annotation_reading: "🖍️",
    summary_writing: "✍️",
    escape_room: "🔐",
    jeopardy: "🏆",
    typing_speed: "⌨️",
    crossword: "✝️",
    word_chain: "⛓️",
    ai_trivia: "🧠",
    would_you_rather: "🤔",
    concealed_text: "🙈",
    split_view: "📊",
    quote_block: "💬",
    image_block: "🖼️",
    video_block: "🎬",
    code_block: "💻",
    math_block: "🔢",
    multiple_choice: "☑️",
    true_false: "✅",
    contextual_mc: "📖",
    movie_scene: "🎬",
    speaking_jam: "🎤",
    speaking_game: "🎲",
    information_gap: "🔀",
    debate: "⚖️",
    one_minute_challenge: "⏱️",
    taboo: "🚫",
    picture_description: "🖼️",
    shadowing: "🗣️",
    guided_writing: "✍️",
    paragraph_organizer: "📑",
    personal_dictionary: "📚",
    can_do_statements: "✅",
    reflective_journal: "📓",
    grammar_reference: "📘",
    list: "📋",
    questions: "❓",
    sorting: "🗂️",
  };
  return icons[type] || "📌";
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS GENERATION
   ═══════════════════════════════════════════════════════════════════════════ */

function generateCSS(config: GeneratorConfig): string {
  return `
/* ─── CSS Custom Properties (Theme) ─── */
:root {
  --bg: #f5f7fa; --bg2: #ffffff; --text: #1a1a2e; --text2: #555;
  --primary: #4361ee; --primary-light: #6c85f7; --primary-dark: #2d46c7;
  --success: #06d6a0; --danger: #ef476f; --warning: #ffd166;
  --accent: #118ab2; --border: #e0e4ea; --shadow: rgba(0,0,0,0.08);
  --radius: 12px; --sidebar-width: 280px; --nav-height: 60px;
  --font-main: 'Segoe UI', system-ui, -apple-system, sans-serif;
  --font-size-base: 14px;
  --celebration: ${config.celebrationIntensity === "maximum" ? "1" : config.celebrationIntensity === "normal" ? "0.7" : "0.3"};
}

/* ─── Theme: Dark ─── */
body.theme-dark {
  --bg: #0d1117; --bg2: #161b22; --text: #e6edf3; --text2: #8b949e;
  --primary: #58a6ff; --primary-light: #79b8ff; --primary-dark: #388bfd;
  --border: #30363d; --shadow: rgba(0,0,0,0.3);
}
body.theme-high-contrast {
  --bg: #000; --bg2: #111; --text: #fff; --text2: #ddd;
  --primary: #ff0; --border: #fff; --success: #0f0; --danger: #f00;
}
body.theme-pastel {
  --bg: #fdf2f8; --bg2: #fff5f5; --text: #4a3728; --text2: #7c6256;
  --primary: #f472b6; --success: #86efac; --danger: #fca5a5; --border: #fce7f3;
}
body.theme-paper {
  --bg: #faf8f5; --bg2: #fff; --text: #333; --primary: #8b5e3c; --border: #e8ddd0;
  --font-main: 'Georgia', serif;
}
body.theme-chalkboard {
  --bg: #2d4a3e; --bg2: #345c4e; --text: #e8e8e0; --text2: #c5d4cc;
  --primary: #f0e68c; --border: #456b5b;
}
body.theme-neon {
  --bg: #0a0a1a; --bg2: #111128; --text: #e0e0ff; --primary: #ff00ff;
  --success: #00ff88; --danger: #ff3366; --border: #333;
}
body.theme-duolingo {
  --bg: #f7f7f7; --bg2: #fff; --text: #3c3c3c; --primary: #58cc02;
  --primary-light: #7be828; --success: #58cc02; --danger: #ff4b4b; --border: #e5e5e5;
}

/* ─── Dyslexia font ─── */
body.dyslexia-font { --font-main: 'OpenDyslexic', 'Comic Sans MS', cursive, sans-serif; }
body.reduced-motion * { animation-duration: 0s !important; transition-duration: 0s !important; }
body.focus-mode .section-accordion:not(.focused) { opacity: 0.3; }

/* ─── Reset ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html {
  font-size: calc(var(--font-size-base, 16px) + var(--font-size-adjust, 0px));
}
body {
  font-family: var(--font-main);
  background: var(--bg); color: var(--text); line-height: 1.6;
  overflow-x: hidden;
}

/* Clean Typographic Sizes (2X Scaled for High-Impact Readability) */
:root {
  --fs-xs: 1.05rem;
  --fs-sm: 1.25rem;
  --fs-md: 1.55rem;
  --fs-lg: 1.95rem;
  --fs-xl: 2.35rem;
  --fs-2xl: 2.85rem;
  --fs-3xl: 3.4rem;
}
body .activity-body, body .activity-body p, body .activity-body div:not(.mcq-options, .vocab-table), body .vocab-table td {
  font-size: var(--fs-md) !important;
  line-height: 1.6 !important;
}
body h1:not(.lesson-title), body h2, body h3, body h4, body h5, body .section-title, body .activity-title {
  font-size: var(--fs-lg) !important;
}
body h1.section-title, body h2.produce-activity-title, body h2.practice-activity-title {
  font-size: var(--fs-xl) !important;
}
body .hint, body .section-time, body .section-xp, body .stat-label, body .progress-label {
  font-size: var(--fs-sm) !important;
}
body .speaking-prompt-list li, body .speaking-prompt, body .wyr-option {
  font-size: var(--fs-md) !important;
  line-height: 1.6 !important;
}

/* ─── Reading Progress Bar ─── */
#reading-progress-bar {
  position: fixed; top: 0; left: 0; height: 4px; width: 0%;
  background: linear-gradient(90deg, var(--primary), var(--success));
  z-index: 10000; transition: width 0.15s;
}

/* ─── Top Navigation (Premium Redesign) ─── */
#top-nav {
  position: sticky; top: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: space-between;
  height: 76px; padding: 0 24px;
  background: var(--bg2); border-bottom: 1.5px solid var(--border);
  box-shadow: 0 6px 20px var(--shadow);
  backdrop-filter: blur(16px);
}
.nav-left { display: flex; align-items: center; gap: 14px; }
.lesson-title-badge {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg); border: 1.5px solid var(--border);
  padding: 8px 16px; border-radius: 24px; box-shadow: 0 2px 6px var(--shadow);
}
.lesson-badge-icon { font-size: 1.3rem; }
body .lesson-title {
  font-size: 1.1rem !important; font-weight: 800; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;
}
.learner-header-badge {
  font-size: 0.95rem; font-weight: 700; color: var(--primary);
  background: rgba(67, 97, 238, 0.12); padding: 4px 12px; border-radius: 14px;
}
.cefr-header-badge {
  font-size: 0.85rem; font-weight: 800; color: #ffffff;
  background: #8b5cf6; padding: 3px 10px; border-radius: 12px;
  letter-spacing: 0.5px;
}
.nav-center { display: flex; align-items: center; }
.nav-tabs {
  display: flex; gap: 8px; background: var(--bg); padding: 6px; border-radius: 14px;
  border: 1.5px solid var(--border);
}
.tab-btn {
  padding: 10px 24px; border: none; background: transparent; color: var(--text2);
  font-size: 1.15rem; font-weight: 700; cursor: pointer; border-radius: 10px;
  transition: all 0.2s ease; display: flex; align-items: center; gap: 8px;
}
.tab-btn:hover { color: var(--text); background: var(--bg2); }
.tab-btn.active {
  background: var(--primary); color: #ffffff;
  box-shadow: 0 4px 14px rgba(67, 97, 238, 0.4);
}
.nav-right { display: flex; align-items: center; gap: 12px; }

/* ─── Header Session Timer ─── */
.header-timer-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; background: rgba(67, 97, 238, 0.09);
  border: 1.5px solid var(--primary-light); border-radius: 12px;
  font-size: 0.95rem; font-weight: 800; color: var(--primary);
  font-variant-numeric: tabular-nums; cursor: pointer;
  transition: all 0.2s ease; user-select: none;
}
.header-timer-pill:hover {
  background: rgba(67, 97, 238, 0.16); border-color: var(--primary);
  transform: translateY(-1px); box-shadow: 0 4px 12px rgba(67, 97, 238, 0.2);
}
.header-pill-icon { font-size: 1.05rem; }
.header-timer-text { min-width: 44px; display: inline-block; text-align: center; }
.timer-mode-badge {
  font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;
  padding: 2px 6px; border-radius: 6px; background: var(--primary);
  color: #ffffff; text-transform: uppercase;
}
.header-timer-pill.timer-finished {
  background: #ef4444 !important; border-color: #b91c1c !important; color: #ffffff !important;
  animation: timer-flash-alert 0.8s infinite alternate ease-in-out;
}
@keyframes timer-flash-alert {
  0% { transform: scale(1); box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
  100% { transform: scale(1.06); box-shadow: 0 0 16px rgba(239, 68, 68, 0.8); }
}

/* ─── Timer Popover Dropdown ─── */
.timer-popover-menu {
  position: fixed; top: 72px; right: 260px; z-index: 999990;
  width: 320px; background: var(--bg2); border: 2px solid var(--border);
  border-radius: 18px; box-shadow: 0 16px 36px var(--shadow), 0 0 0 1px rgba(0,0,0,0.05);
  padding: 16px; animation: popover-drop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes popover-drop {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.timer-popover-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
}
.timer-popover-title { font-size: 0.95rem; font-weight: 800; color: var(--text); }
.timer-close-btn {
  background: transparent; border: none; font-size: 1rem; color: var(--text2);
  cursor: pointer; padding: 2px 6px; border-radius: 6px;
}
.timer-close-btn:hover { background: var(--bg); color: var(--text); }
.timer-tab-row {
  display: flex; gap: 6px; background: var(--bg); padding: 4px; border-radius: 10px;
  margin-bottom: 14px;
}
.timer-tab-btn {
  flex: 1; padding: 6px 10px; border: none; background: transparent;
  color: var(--text2); font-size: 0.85rem; font-weight: 700; border-radius: 8px;
  cursor: pointer; transition: all 0.15s;
}
.timer-tab-btn.active {
  background: var(--primary); color: #ffffff;
}
.timer-big-display {
  text-align: center; font-size: 2.8rem; font-weight: 900;
  font-family: monospace, var(--font-mono, monospace);
  color: var(--primary); letter-spacing: 2px; margin: 4px 0 14px;
}
.timer-controls-row {
  display: flex; gap: 8px; justify-content: center; margin-bottom: 14px;
}
.timer-action-btn {
  padding: 8px 14px; border-radius: 10px; border: 1.5px solid var(--border);
  background: var(--bg); color: var(--text); font-size: 0.85rem; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
}
.timer-action-btn:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-1px); }
.timer-action-btn.primary {
  background: var(--primary); color: #ffffff; border-color: var(--primary);
}
.timer-presets-label {
  font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
  color: var(--text2); margin-bottom: 6px; letter-spacing: 0.5px;
}
.timer-presets-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;
}
.timer-preset-chip {
  padding: 6px 4px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-size: 0.8rem; font-weight: 700;
  cursor: pointer; text-align: center; transition: all 0.15s;
}
.timer-preset-chip:hover { border-color: var(--primary); color: var(--primary); }
.timer-preset-chip.active { background: rgba(67, 97, 238, 0.15); border-color: var(--primary); color: var(--primary); }
.timer-custom-row {
  display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text2);
  padding-top: 8px; border-top: 1px solid var(--border);
}
.timer-custom-row input {
  width: 70px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-weight: 700; text-align: center;
}
.timer-set-btn {
  padding: 4px 10px; border-radius: 6px; border: none; background: var(--primary);
  color: #ffffff; font-size: 0.8rem; font-weight: 700; cursor: pointer;
}

/* ─── Header Teams Widget & Steppers ─── */
.header-teams-widget {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg); border: 1.5px solid var(--border);
  padding: 3px 6px; border-radius: 14px;
}
.teams-header-label-btn {
  border: none; background: transparent; font-size: 0.85rem; font-weight: 800;
  color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 4px;
  padding: 4px 6px; border-radius: 8px; transition: all 0.15s;
}
.teams-header-label-btn:hover {
  background: rgba(250, 204, 21, 0.18); color: #d97706;
}
.header-team-unit {
  display: flex; align-items: center; gap: 2px;
  background: var(--bg2); border: 1px solid var(--border);
  padding: 2px; border-radius: 10px;
}
.team-step-btn {
  width: 22px; height: 26px; border: none; background: transparent;
  color: var(--text2); font-size: 0.8rem; font-weight: 800; cursor: pointer;
  border-radius: 6px; display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.team-step-btn:hover {
  background: var(--bg); color: var(--text); transform: scale(1.1);
}
.team-step-btn.team-sub:hover { color: #ef4444; }
.team-step-btn.team-add:hover { color: #10b981; }
.header-team-pill {
  display: flex; align-items: center; gap: 4px; padding: 2px 8px;
  border: none; background: transparent; cursor: pointer; font-size: 0.9rem; font-weight: 800;
  color: var(--text); transition: all 0.15s ease;
}
.header-team-pill:hover { transform: scale(1.05); }
.header-team-pill:active { transform: scale(0.95); }
.team-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot-a { background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.6); }
.dot-b { background: #3b82f6; box-shadow: 0 0 6px rgba(59, 130, 246, 0.6); }
.leaderboard-pop-btn {
  width: 28px; height: 28px; border: none; background: rgba(67, 97, 238, 0.1);
  color: var(--primary); font-size: 0.95rem; cursor: pointer; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.leaderboard-pop-btn:hover {
  background: var(--primary); color: #ffffff; transform: scale(1.08);
}

.header-action-btn {
  width: 44px; height: 44px; border: 1.5px solid var(--border); background: var(--bg);
  zoom: 1 !important; transform: none;
  color: var(--text); font-size: 1.25rem; cursor: pointer; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease; box-shadow: 0 1px 3px var(--shadow);
}
.header-action-btn:hover {
  border-color: var(--primary); color: var(--primary);
  background: var(--bg2); transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow);
}
.header-action-btn.report-btn {
  color: #10b981; border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1);
}
.header-action-btn.report-btn:hover {
  background: #10b981; color: #ffffff; border-color: #10b981;
}

/* ─── Battery Widget ─── */
.battery-widget {
  display: flex; align-items: center; gap: 7px; padding: 6px 12px;
  background: linear-gradient(135deg, var(--bg2), var(--bg));
  border: 1.5px solid var(--border); border-radius: 12px;
  box-shadow: 0 2px 10px var(--shadow);
  cursor: default;
}
.battery-icon-container {
  width: 30px; height: 17px; border: 2px solid var(--text2); border-radius: 4px;
  padding: 1.5px; position: relative; display: flex; align-items: center;
  background: rgba(255, 255, 255, 0.15);
}
.battery-icon-container::after {
  content: ''; position: absolute; right: -5px; top: 3.5px; width: 2.5px; height: 6px;
  background: var(--text2); border-radius: 0 1px 1px 0;
}
.battery-fill-level {
  height: 100%; border-radius: 2px; transition: width 0.3s;
  background: linear-gradient(90deg, #059669, #10b981, #34d399);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.55);
}
.battery-fill-level.low { background: linear-gradient(90deg, #b45309, #f59e0b, #fbbf24); box-shadow: 0 0 6px rgba(245, 158, 11, 0.55); }
.battery-fill-level.empty { background: linear-gradient(90deg, #b91c1c, #ef4444, #f87171); box-shadow: 0 0 6px rgba(239, 68, 68, 0.55); }
.battery-days-label { font-size: 0.78rem; font-weight: 800; color: var(--text); white-space: nowrap; }

/* ─── Search Bar ─── */
#search-bar {
  padding: 10px 20px; background: var(--bg2); border-bottom: 1px solid var(--border);
}
#search-input {
  width: 100%; padding: 10px 16px; border: 2px solid var(--border); border-radius: 8px;
  font-size: 1rem; background: var(--bg); color: var(--text);
  outline: none; transition: border 0.2s;
}
#search-input:focus { border-color: var(--primary); }
#filter-chips { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.chip {
  padding: 4px 12px; border: 1px solid var(--border); border-radius: 20px;
  background: var(--bg); color: var(--text2); font-size: 0.85rem; cursor: pointer;
  transition: all 0.2s;
}
.chip.active { background: var(--primary); color: #fff; border-color: var(--primary); }

/* ─── Panels ─── */
.panel-overlay {
  position: fixed; top: var(--nav-height); width: 320px; height: calc(100vh - var(--nav-height));
  zoom: 1 !important;
  zoom: 1 !important;
  background: var(--bg2); border-left: 1px solid var(--border); z-index: 9998;
  padding: 20px; overflow-y: auto; box-shadow: -4px 0 20px var(--shadow);
  transition: transform 0.3s;
}
.panel-right { right: 0; }
.panel-center {
  left: 50%; top: 50%; transform: translate(-50%,-50%);
  width: 600px; height: auto; max-height: 80vh; border-radius: var(--radius);
  border: 1px solid var(--border);
}
.close-btn {
  position: absolute; top: 10px; right: 10px; border: none; background: none;
  font-size: 1.2rem; cursor: pointer; color: var(--text2);
}
#notes-textarea {
  width: 100%; height: 300px; padding: 12px; border: 1px solid var(--border);
  border-radius: 8px; resize: vertical; font-family: var(--font-main);
  background: var(--bg); color: var(--text);
}
.hidden { display: none !important; }

/* ─── Announcement Banner ─── */
#announcement-banner {
  padding: 12px 20px; background: var(--warning); color: #333;
  font-weight: 600; text-align: center;
}

/* ─── Tab Content ─── */
.tab-content { display: none; }
.tab-content.active { display: block; }

/* ─── PREPARE LAYOUT ─── */
.prepare-layout { display: flex; min-height: calc(100vh - var(--nav-height)); }
.sidebar-left {
  width: var(--sidebar-width); background: var(--bg2); border-right: 1px solid var(--border);
  box-shadow: 2px 0 10px rgba(0,0,0,0.02);
  padding: 20px; position: sticky; top: var(--nav-height);
  height: calc(100vh - var(--nav-height)); flex-shrink: 0;
  overflow-y: overlay; scrollbar-width: none;
}
.sidebar-left::-webkit-scrollbar { width: 0px; display: none; }
.prepare-main { flex: 1; padding: 24px; max-width: 900px; margin: 0 auto; overflow-x: hidden; }

/* ─── Avatar & XP Ring ─── */
.avatar-section { text-align: center; margin-bottom: 20px; }
.xp-ring { position: relative; width: 120px; height: 120px; margin: 0 auto; }
.xp-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: var(--border); stroke-width: 8; }
.ring-fill {
  fill: none; stroke: var(--primary); stroke-width: 8;
  stroke-dasharray: 339.292; stroke-dashoffset: 339.292;
  stroke-linecap: round; transition: stroke-dashoffset 0.5s;
  filter: drop-shadow(0 0 6px var(--primary));
}
.avatar-img {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  font-size: 3rem; width: 80px; height: 80px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg); border: 3px solid var(--primary);
}
.learner-name { font-weight: 700; margin-top: 8px; font-size: 1.05rem; white-space: normal; word-break: break-word; }
.level-badge {
  display: inline-block; padding: 2px 12px; background: var(--primary);
  color: #fff; border-radius: 12px; font-size: 0.8rem; font-weight: 600;
  margin-top: 4px;
}

/* ─── Stats Grid ─── */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; }
.stat-item {
  background: var(--bg); padding: 8px; border-radius: 8px; text-align: center;
  font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums;
  display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.2;
}
.stat-icon { font-size: 1.2rem; margin-bottom: 4px; }
.stat-item span:not(.stat-icon) { min-width: 4ch; display: inline-block; text-align: center; }

/* ─── Level Progress ─── */
.level-progress { margin-bottom: 16px; }
.progress-bar-container {
  width: 100%; height: 8px; background: var(--border); border-radius: 4px;
  overflow: hidden;
}
.progress-bar-container.mini { height: 5px; width: 80px; }
.progress-bar-fill {
  height: 100%; background: linear-gradient(90deg, var(--primary), var(--success));
  border-radius: 4px; transition: width 0.5s; width: 0%;
}
.progress-label { font-size: 0.75rem; color: var(--text2); margin-top: 2px; text-align: center; }

/* ─── Badges ─── */
.badges-section { margin-bottom: 16px; }
.badges-section h4, .powerups-section h4, .radar-section h4 { font-size: 0.9rem; margin-bottom: 8px; }
.badge-row { display: flex; flex-wrap: wrap; gap: 6px; }
.badge-item {
  font-size: 1.6rem; cursor: default; transition: transform 0.2s;
  filter: grayscale(1); opacity: 0.4;
}
.badge-item.earned { filter: none; opacity: 1; }
.badge-item:hover { transform: scale(1.3); }

/* ─── Power-ups ─── */
.powerup-row { display: flex; gap: 8px; }
.powerup-btn {
  width: 42px; height: 42px; border: 2px solid var(--border); border-radius: 10px;
  background: var(--bg); font-size: 1.15rem; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.powerup-btn:hover { border-color: var(--primary); transform: scale(1.1); }

/* ─── Radar Chart ─── */
.radar-section { margin-top: 12px; }
#radar-chart { width: 100%; max-width: 200px; margin: 0 auto; display: block; }

/* ─── Sections ─── */
.section-accordion { margin-bottom: 16px; border-radius: var(--radius); overflow: hidden; background: var(--bg2); box-shadow: 0 2px 8px var(--shadow); }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; cursor: pointer; border-left: 5px solid var(--primary);
  transition: background 0.2s; user-select: none;
}
.section-header:hover { background: var(--bg); }
.section-header-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.section-chevron { font-size: 0.8rem; transition: transform 0.3s; color: var(--text2); }
.section-accordion.open .section-chevron { transform: rotate(90deg); }
.section-title { font-size: 1.05rem; font-weight: 700; }
.diff-badge {
  padding: 2px 8px; border-radius: 8px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
}
.diff-easy { background: #d4edda; color: #155724; }
.diff-medium { background: #fff3cd; color: #856404; }
.diff-hard { background: #f8d7da; color: #721c24; }
.section-time { font-size: 0.8rem; color: var(--text2); }
.section-xp { font-size: 0.8rem; color: var(--primary); font-weight: 600; }
.section-header-right { display: flex; align-items: center; gap: 10px; }
.section-progress-mini { display: flex; align-items: center; gap: 6px; }
.prog-text { font-size: 0.75rem; color: var(--text2); }
.bookmark-btn {
  border: none; background: none; font-size: 1.2rem; cursor: pointer;
  transition: transform 0.2s; color: var(--text2);
}
.bookmark-btn.small { font-size: 0.9rem; }
.bookmark-btn.active { color: var(--warning); }
.bookmark-btn:hover { transform: scale(1.2); }
.section-body { padding: 0 20px; }
.section-body.collapsed { display: none; }

/* ─── Activity Cards ─── */
.activity-card {
  background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
  margin-bottom: 16px; overflow: hidden; transition: box-shadow 0.2s;
}
.activity-card:hover { box-shadow: 0 4px 16px var(--shadow); }
.activity-header {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  border-bottom: 1px solid var(--border); background: var(--bg2);
}
.activity-type-icon { font-size: 1.3rem; }
.activity-title { font-size: 0.95rem; font-weight: 600; flex: 1; }
.activity-status { font-size: 0.85rem; }
.activity-body { padding: 16px; }
.activity-feedback {
  padding: 16px; background: #f0f7ff; border-top: 2px solid var(--primary);
  font-size: 0.9rem; line-height: 1.7;
}
.activity-actions { padding: 8px 16px; display: flex; gap: 8px; justify-content: flex-end; }
.retry-btn {
  padding: 6px 16px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg2); cursor: pointer; font-size: 0.85rem;
  transition: all 0.2s;
}
.retry-btn:hover { border-color: var(--primary); color: var(--primary); }

/* ─── Listening Script player (multi-voice read-aloud) ─── */
.v2-ls-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.v2-ls-play, .v2-ls-toggle {
  padding: 10px 20px; border: none; border-radius: 12px; font-size: 1.05rem; font-weight: 800;
  cursor: pointer; transition: filter .15s, transform .05s;
}
.v2-ls-play { background: #58cc02; color: #fff; box-shadow: 0 3px 0 #46a302; }
.v2-ls-toggle { background: #1cb0f6; color: #fff; box-shadow: 0 3px 0 #1899d6; }
.v2-ls-play:active, .v2-ls-toggle:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,0.2); }
.v2-ls-play:hover, .v2-ls-toggle:hover { filter: brightness(1.06); }
.v2-ls-transcript { display: none; }
.v2-ls-line { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 12px; margin-bottom: 8px; background: var(--bg2); border: 1.5px solid transparent; transition: background .25s, border-color .25s; }
.v2-ls-line.playing { background: #ddf4ff; border-color: #1cb0f6; }
.v2-ls-line.playing .v2-ls-text { color: #1899d6; font-weight: 800; }
.v2-ls-chip { flex-shrink: 0; font-weight: 800; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 999px; color: #fff; margin-top: 2px; }
.v2-ls-text { flex: 1; font-size: 1.05rem; line-height: 1.55; color: var(--text); }
.v2-ls-line-play { flex-shrink: 0; background: none; border: none; cursor: pointer; font-size: 1rem; opacity: .6; }
.v2-ls-line-play:hover { opacity: 1; transform: scale(1.1); }

/* ─── Common activity elements ─── */
.act-btn {
  padding: 12px 24px; border: none; border-radius: 10px; font-size: 1.25rem;
  font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.act-btn-primary { background: var(--primary); color: #fff; }
.act-btn-primary:hover { background: var(--primary-dark); }
.act-btn-success { background: var(--success); color: #fff; }
.act-btn-danger { background: var(--danger); color: #fff; }
.act-input {
  padding: 12px 16px; border: 2px solid var(--border); border-radius: 10px;
  font-size: 1.35rem; background: var(--bg2); color: var(--text);
  outline: none; transition: border 0.2s; width: 100%; font-weight: 600;
}
.act-input:focus { border-color: var(--primary); }
.act-input.correct { border-color: var(--success); background: #d4edda; }
.act-input.incorrect { border-color: var(--danger); background: #f8d7da; }
.act-select {
  padding: 10px 16px; border: 2px solid var(--border); border-radius: 10px;
  background: var(--bg2); color: var(--text); font-size: 1.25rem; font-weight: 600;
}

/* ─── Flashcard (X2 Scale, High Readability & Rich Front/Back Layout) ─── */
.flashcard-container { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; width: 100%; }
.flashcard {
  width: 100%; max-width: 820px; min-height: 480px; perspective: 1200px; cursor: pointer;
  margin: 0 auto;
}
.flashcard-inner {
  position: relative; width: 100%; min-height: 480px; height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d;
}
.flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }
.flashcard-front, .flashcard-back {
  position: absolute; inset: 0; backface-visibility: hidden;
  border-radius: 22px; display: flex; flex-direction: column;
  padding: 32px 28px;
  border: 2px solid var(--border);
  box-shadow: 0 14px 40px var(--shadow);
  overflow-y: auto;
}
.flashcard-front {
  background: linear-gradient(135deg, var(--primary-light), var(--primary));
  color: #ffffff; align-items: center; justify-content: center; text-align: center;
}
.flashcard-back {
  background: var(--bg2); transform: rotateY(180deg);
  color: var(--text); text-align: left; align-items: stretch; justify-content: flex-start;
}
.flashcard-actions { display: flex; gap: 16px; margin-top: 18px; justify-content: center; }
.fc-btn {
  padding: 10px 26px; border-radius: 12px; border: 1.5px solid var(--border);
  cursor: pointer; font-size: 1.25rem; font-weight: 800; transition: all 0.2s;
}
.fc-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px var(--shadow); }

/* ─── Matching ─── */
.matching-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.match-item {
  padding: 14px 18px; border: 2px solid var(--border); border-radius: 10px;
  cursor: pointer; text-align: center; transition: all 0.2s; font-size: 1.25rem; font-weight: 600;
}
.match-item.selected { border-color: var(--primary); background: var(--primary-light); color: #fff; }
.match-item.matched { border-color: var(--success); background: #d4edda; cursor: default; }
.match-item.wrong { border-color: var(--danger); background: #f8d7da; }

/* ─── Scramble ─── */
.scramble-words { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.scramble-chip {
  padding: 10px 20px; border: 2px solid var(--border); border-radius: 24px;
  cursor: pointer; transition: all 0.2s; font-size: 1.25rem; font-weight: 700; user-select: none;
}
.scramble-chip.placed { opacity: 0.3; }
.scramble-chip:hover { border-color: var(--primary); transform: translateY(-2px); }
.scramble-target {
  min-height: 64px; border: 2px dashed var(--border); border-radius: 12px;
  padding: 12px; display: flex; flex-wrap: wrap; gap: 10px;
}
.scramble-target .scramble-chip { background: var(--primary-light); color: #fff; border-color: var(--primary); }

/* ─── Memory Match ─── */
.memory-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.memory-card {
  min-height: 100px; border-radius: 12px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; font-size: 1.25rem;
  font-weight: 700; transition: transform 0.3s; text-align: center; padding: 8px;
  border: 2px solid var(--border); background: var(--primary); color: #fff;
}
.memory-card.flipped { background: var(--bg2); color: var(--text); transform: rotateY(180deg); }
.memory-card.matched { background: var(--success); color: #fff; opacity: 0.7; }

/* ─── Gap Fill ─── */
.gf-sentence { margin-bottom: 16px; line-height: 2.2; font-size: 1.45rem; font-weight: 600; }
.gf-input {
  display: inline-block; width: 180px; padding: 6px 14px; border: 2px solid var(--border);
  border-radius: 8px; font-size: 1.35rem; font-weight: 700; text-align: center; transition: border 0.2s;
}
.gf-input.correct { border-color: var(--success); background: #d4edda; }
.gf-input.incorrect { border-color: var(--danger); background: #f8d7da; }

/* ─── MCQ / True-False ─── */
.mcq-question { margin-bottom: 20px; }
.mcq-question h5 { margin-bottom: 12px; font-size: 1.6rem; }
.mcq-options { display: flex; flex-direction: column; gap: 10px; }
.mcq-opt {
  padding: 14px 22px; border: 2px solid var(--border); border-radius: 12px;
  cursor: pointer; transition: all 0.2s; font-size: 1.35rem; font-weight: 600;
}
.mcq-opt:hover { border-color: var(--primary); background: var(--bg); transform: translateX(4px); }
.mcq-opt.selected { border-color: var(--primary); background: var(--primary-light); color: #fff; }
.mcq-opt.correct { border-color: var(--success); background: #d4edda; color: #155724; }
.mcq-opt.wrong { border-color: var(--danger); background: #f8d7da; color: #721c24; }

/* ─── Vocab Table ─── */
.vocab-table { width: 100%; border-collapse: collapse; font-size: 1.25rem; }
.vocab-table th { background: var(--primary); color: #fff; padding: 14px; text-align: left; font-size: 1.3rem; }
.vocab-table td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 1.25rem; }
.vocab-table tr:hover { background: var(--bg); }
.tts-btn { border: none; background: none; font-size: 1.35rem; cursor: pointer; }

/* ─── Error Correction ─── */
.ec-sentence { margin-bottom: 16px; padding: 16px; border: 1.5px solid var(--border); border-radius: 12px; font-size: 1.4rem; line-height: 1.8; }
.ec-word {
  display: inline-block; padding: 4px 10px; margin: 2px; border-radius: 6px;
  cursor: pointer; transition: all 0.15s; font-size: 1.4rem; font-weight: 600;
}
.ec-word:hover { background: var(--warning); }
.ec-word.error-found { background: var(--danger); color: #fff; text-decoration: line-through; }
.ec-word.correct-word { background: var(--success); color: #fff; }

/* ─── Dictation ─── */
.dict-word { display: inline-block; margin: 2px; padding: 4px 8px; border-radius: 4px; font-size: 1.35rem; }
.dict-word.correct { color: var(--success); font-weight: 700; }
.dict-word.incorrect { color: var(--danger); text-decoration: line-through; }

/* ─── Typing Speed ─── */
.typing-display { font-size: 1.4rem; line-height: 2; padding: 20px; border: 1.5px solid var(--border); border-radius: 12px; margin-bottom: 16px; font-family: monospace; }
.typing-display .typed-correct { color: var(--success); font-weight: 700; }
.typing-display .typed-wrong { color: var(--danger); text-decoration: underline; }
.typing-display .typed-cursor { border-bottom: 3px solid var(--primary); animation: blink 0.7s infinite; }
@keyframes blink { 50% { opacity: 0; } }

/* ─── Produce Layout ─── */
.produce-layout { display: flex; min-height: calc(100vh - var(--nav-height)); }
.produce-support-left {
  width: 380px; min-width: 380px; max-width: 420px; flex-shrink: 0;
  background: var(--bg2); border-right: 1px solid var(--border); padding: 24px 20px;
  display: flex; flex-direction: column; gap: 16px;
  overflow-y: hidden; scrollbar-gutter: stable; transition: overflow 0.2s;
}
.produce-support-left:hover {
  overflow-y: auto;
}
.produce-main { flex: 1; padding: 24px; display: flex; flex-direction: column; align-items: center; }
.produce-nav-top, .produce-nav-bottom { display: flex; align-items: center; gap: 20px; width: 100%; max-width: 860px; justify-content: space-between; margin: 8px 0; }
.produce-arrow {
  padding: 12px 28px; font-size: 1.25rem; font-weight: 700; border: 2px solid var(--primary);
  border-radius: 12px; background: var(--bg2); color: var(--primary); cursor: pointer;
  transition: all 0.2s;
}
.produce-arrow:hover { background: var(--primary); color: #fff; }
.produce-progress { font-size: 1.2rem; font-weight: 700; color: var(--text2); }
.produce-activity-slide { max-width: 860px; width: 100%; }
.produce-activity-title { font-size: 2.2rem; font-weight: 800; text-align: center; margin-bottom: 20px; }
.produce-card { font-size: 1.45rem; line-height: 1.6; }
.produce-card .mcq-opt { font-size: 1.35rem; padding: 16px 24px; }
.done-check { margin-top: 16px; padding: 10px 24px; border: 2px solid var(--success); border-radius: 10px; background: transparent; color: var(--success); font-size: 1.2rem; font-weight: 700; cursor: pointer; }
.done-check:hover { background: var(--success); color: #fff; }
.produce-sidebar {
  width: 380px; min-width: 380px; max-width: 420px; flex-shrink: 0;
  background: var(--bg2); border-left: 1px solid var(--border); padding: 24px 20px;
  position: sticky; top: var(--nav-height); height: calc(100vh - var(--nav-height));
  display: flex; flex-direction: column; gap: 16px;
  overflow-y: hidden; scrollbar-gutter: stable; transition: overflow 0.2s;
}
.produce-sidebar:hover {
  overflow-y: auto;
}
.produce-support-right-card {
  display: flex; flex-direction: column; gap: 16px; width: 100%;
}
.produce-panel-title {
  font-size: 1.75rem; font-weight: 800; padding-bottom: 8px; display: flex; align-items: center; gap: 8px; margin: 0 0 12px 0;
}
.produce-panel-title-left {
  color: var(--primary); border-bottom: 3px solid var(--primary);
}
.produce-panel-title-right {
  color: #8b5cf6; border-bottom: 3px solid #8b5cf6;
}
.produce-support-container {
  display: flex; flex-direction: column; gap: 12px; width: 100%;
}
.produce-support-placeholder {
  font-size: 1.25rem; color: var(--text2); font-style: italic; line-height: 1.5;
}
.support-checkbox-label {
  display: flex; align-items: flex-start; gap: 12px; font-size: 1.35rem; cursor: pointer;
  padding: 12px 14px; border-radius: 10px; transition: background 0.15s; margin-bottom: 10px;
  border: 1px solid var(--border); border-left-width: 5px !important; background: var(--bg);
}
.support-checkbox-label:hover { background: var(--bg2); }
.support-cb-input {
  width: 22px !important; height: 22px !important; margin-top: 3px; cursor: pointer; flex-shrink: 0;
}
.support-blue { border-left-color: #3b82f6 !important; }
.support-green { border-left-color: #10b981 !important; }
.support-purple { border-left-color: #8b5cf6 !important; }
.sidebar-right {
  background: var(--bg2); border-left: 1px solid var(--border); padding: 20px 15px;
  position: sticky; top: var(--nav-height); height: calc(100vh - var(--nav-height));
  flex-shrink: 0;
}
.sidebar-right:hover {
  overflow-y: auto;
}

/* ─── Practice Layout ─── */
.practice-layout { display: flex; min-height: calc(100vh - var(--nav-height)); }
.practice-main { flex: 1; padding: 24px; max-width: 900px; margin: 0 auto; }
.practice-sidebar { width: 240px; display: flex; flex-direction: column; gap: 8px; padding-top: 20px; }
.practice-progress-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.practice-global-progress { display: flex; align-items: center; gap: 10px; }
.practice-global-progress .progress-bar-container { width: 200px; height: 10px; }

/* ─── Cute Cat Mascot & Companion Dock ─── */
.cat-mascot {
  position: fixed; bottom: 84px; right: 24px; z-index: 999998; cursor: pointer;
  zoom: 1 !important;
  display: flex; flex-direction: column; align-items: center;
  user-select: none; transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
body.a11y-panel-open .cat-mascot {
  bottom: 20px !important;
  right: 400px !important;
}
@media (max-width: 768px) {
  body.a11y-panel-open .cat-mascot {
    bottom: 20px !important;
    left: 20px !important;
    right: auto !important;
  }
}
.header-action-label { margin-left: 5px; font-size: 0.72rem; font-weight: 800; }
@media (max-width: 700px) { .header-action-label { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .cat-mascot *, .cat-mascot { animation: none !important; transition: none !important; }
}
.cat-avatar-container {
  width: 78px; height: 78px; position: relative;
  background: radial-gradient(circle at 35% 28%, #fffdf5 0 8%, #ffe9c7 9% 46%, #ffd9a0 100%);
  border-radius: 50%;
  box-shadow: 0 8px 24px var(--shadow), 0 0 0 2px rgba(244, 114, 182, 0.3);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.25s ease;
}
.cat-mascot:hover .cat-avatar-container {
  box-shadow: 0 12px 30px rgba(244, 114, 182, 0.4), 0 0 0 2.5px #f472b6;
}
.realistic-cat-svg {
  width: 92%; height: 92%;
  filter: drop-shadow(0 4px 8px rgba(251, 113, 133, 0.25));
  animation: cat-breathe 3.6s infinite ease-in-out;
}
@keyframes cat-breathe {
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.03, 0.97) translateY(-1.5px); }
}

/* Cute ear wiggle */
.cat-ear {
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: cat-ear-wiggle 6s infinite ease-in-out;
}
.cat-ear-right {
  animation-delay: 3s;
}
@keyframes cat-ear-wiggle {
  0%, 72%, 100% { transform: rotate(0deg); }
  78% { transform: rotate(-7deg); }
  84% { transform: rotate(5deg); }
  90% { transform: rotate(0deg); }
}

/* Waving paw */
.cat-waving-paw {
  transform-box: fill-box;
  transform-origin: 70% 90%;
  animation: cat-paw-wave 2.6s infinite ease-in-out;
}
@keyframes cat-paw-wave {
  0%, 100% { transform: rotate(0deg); }
  8% { transform: rotate(-24deg); }
  22% { transform: rotate(10deg); }
  36% { transform: rotate(-18deg); }
  52% { transform: rotate(4deg); }
  64% { transform: rotate(0deg); }
}

/* Gentle blush pulse */
.cat-blush {
  animation: cat-blush-pulse 3s infinite ease-in-out;
}
@keyframes cat-blush-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.8; }
}

/* Floating hearts */
.cat-heart {
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  animation: cat-heart-float 4.5s infinite ease-out;
}
.cat-heart-2 {
  animation-delay: 2.25s;
}
@keyframes cat-heart-float {
  0% { opacity: 0; transform: translateY(2px) scale(0.5); }
  15% { opacity: 0.9; transform: translateY(-2px) scale(1); }
  70% { opacity: 0.7; transform: translateY(-12px) scale(1.05); }
  100% { opacity: 0; transform: translateY(-16px) scale(1.15); }
}

/* Eye Blinking */
.cat-eyelid {
  opacity: 0;
  transform-origin: 50% 0%;
  animation: cat-blink 4.5s infinite ease-in-out;
}
@keyframes cat-blink {
  0%, 92%, 100% { opacity: 0; transform: scaleY(0); }
  95%, 97% { opacity: 1; transform: scaleY(1); }
}

/* Pupils stay fixed — no hover dilation or eye movement */
.cat-pupil {
  transform-origin: center;
}

/* Mouth Talking Animation */
.cat-mascot.is-speaking .cat-avatar-container {
  box-shadow: 0 0 0 3px #10b981, 0 12px 32px rgba(16, 185, 129, 0.4);
}
.cat-mascot.is-speaking .realistic-cat-svg {
  animation: cat-talking-body 0.35s infinite alternate ease-in-out;
}
@keyframes cat-talking-body {
  0% { transform: scale(1) translateY(0); }
  100% { transform: scale(1.03, 0.97) translateY(-2px); }
}
.cat-mascot.is-speaking .cat-mouth-open-ellipse {
  animation: cat-talk-mouth 0.22s infinite alternate ease-in-out;
  opacity: 1 !important;
}
@keyframes cat-talk-mouth {
  0% { ry: 0.5px; opacity: 0.4; }
  100% { ry: 4.5px; opacity: 1; }
}

/* Acoustic Ripple Wave Rings */
.cat-audio-wave-ring {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 2px solid #10b981; opacity: 0; pointer-events: none;
}
.cat-mascot.is-speaking .cat-audio-wave-ring.ring-1 {
  animation: wave-ripple 1.5s infinite cubic-bezier(0.1, 0.8, 0.3, 1);
}
.cat-mascot.is-speaking .cat-audio-wave-ring.ring-2 {
  animation: wave-ripple 1.5s 0.75s infinite cubic-bezier(0.1, 0.8, 0.3, 1);
}
@keyframes wave-ripple {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.45); opacity: 0; }
}

/* Audio EQ Bars */
.cat-audio-eq-bars {
  position: absolute; bottom: 2px; right: 2px;
  display: flex; gap: 2px; align-items: flex-end;
  height: 12px; padding: 2px 4px; border-radius: 6px;
  background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px);
  opacity: 0; transition: opacity 0.2s;
}
.cat-mascot.is-speaking .cat-audio-eq-bars { opacity: 1; }
.eq-bar {
  width: 3px; border-radius: 2px; background: #10b981;
  animation: eq-bounce 0.4s infinite alternate ease-in-out;
}
.eq-bar.bar-1 { height: 4px; animation-delay: 0.1s; }
.eq-bar.bar-2 { height: 10px; animation-delay: 0.25s; }
.eq-bar.bar-3 { height: 6px; animation-delay: 0.15s; }
@keyframes eq-bounce {
  0% { height: 3px; }
  100% { height: 11px; }
}

/* Cat Speech Bubble */
.cat-speech-bubble {
  background: var(--bg2); border: 2px solid var(--border); border-radius: 14px;
  padding: 8px 14px; font-size: 0.88rem; font-weight: 600; color: var(--text);
  max-width: 280px; text-align: center; margin-bottom: 8px;
  box-shadow: 0 8px 20px var(--shadow); opacity: 0;
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s;
  pointer-events: none; position: relative; line-height: 1.4;
  transform: translateY(4px);
}
.cat-speech-bubble.visible {
  opacity: 1; transform: translateY(0); pointer-events: auto;
}
.cat-speech-bubble::after {
  content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
  border-left: 8px solid transparent; border-right: 8px solid transparent;
  border-top: 8px solid var(--border);
}

/* Quick Companion Dock — hidden until the cat is clicked.
   It FLOATS under the avatar instead of sitting in the flow: the cat widget then
   stays avatar-sized, so the ✕ no longer floats a toolbar-width away from the
   cat and the widget is no longer as wide as the dock on phones. */
.cat-companion-dock {
  position: absolute; top: calc(100% + 8px); left: 50%;
  display: flex; align-items: center; gap: 4px; max-width: min(92vw, 460px);
  background: var(--bg2); border: 1.5px solid var(--border);
  padding: 4px 6px; border-radius: 20px; box-shadow: 0 6px 16px var(--shadow);
  opacity: 0; visibility: hidden; pointer-events: none;
  transform: translateX(-50%) translateY(-4px);
  transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
}
.cat-mascot.dock-open .cat-companion-dock {
  opacity: 1; visibility: visible; pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}
.dock-divider {
  width: 1px; height: 20px; margin: 0 3px; flex: 0 0 auto;
  background: var(--border);
}
/* Muted / control states so every dock button gives visible feedback */
.cat-mascot.is-muted .cat-avatar-container { filter: grayscale(0.35); }
.dock-btn.muted { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.12); }
.dock-status-badge { font-size: 0.65rem; padding: 1px 5px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--border); }
.dock-status-badge.active { background: #dcfce7; color: #166534; border-color: #86efac; }
.dock-btn:active { transform: scale(0.94); }
/* Hide-the-cat button — the last item inside the quick-tools menu, so it always
   sits right next to the cat instead of floating in the corner of a wide box. */
.cat-close-btn {
  flex: 0 0 auto; margin-left: 2px;
  width: 32px; height: 32px; padding: 0; border-radius: 50%;
  border: 2px solid #ffffff; background: #ef4444; color: #ffffff;
  font-size: 0.85rem; font-weight: 900; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  transition: transform 0.15s, background 0.15s;
  touch-action: manipulation;
}
.cat-close-btn:hover, .cat-close-btn:focus-visible {
  transform: scale(1.12); background: #dc2626;
}
/* Only exists while the menu is open */
.cat-mascot:not(.dock-open) .cat-close-btn { display: none; }
/* Dismissed for this session only — a fresh page load always shows the cat again */
.cat-mascot.cat-dismissed, .cat-mascot.cat-dismissed .cat-companion-dock {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
.dock-btn {
  padding: 4px 8px; border: none; background: var(--bg); color: var(--text);
  border-radius: 14px; font-size: 0.8rem; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; gap: 4px; transition: all 0.15s;
  border: 1px solid var(--border);
}
.dock-btn:hover {
  background: var(--bg2); border-color: var(--primary); color: var(--primary);
  transform: scale(1.06);
}
.dock-btn.read-btn {
  background: var(--primary); color: #ffffff; border-color: var(--primary);
}
.dock-btn.read-btn:hover {
  background: var(--primary-dark); color: #ffffff;
}
.dock-status-badge {
  font-size: 0.65rem; padding: 1px 4px; border-radius: 4px; font-weight: 900;
  background: #64748b; color: #ffffff;
}
.dock-status-badge.active {
  background: #10b981;
}

/* Synchronous Active DOM Reading Highlight */
.cat-reading-active {
  background: rgba(250, 204, 21, 0.22) !important;
  outline: 2px dashed #eab308 !important;
  outline-offset: 3px;
  border-radius: 6px;
  transition: background 0.2s, outline 0.2s;
}

/* ─── Dynamic Dramatic Leaderboard Modal ─── */
.leaderboard-arena-card {
  width: 92%; max-width: 780px; max-height: 90vh; overflow-y: auto;
  background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
  border: 2px solid rgba(250, 204, 21, 0.4); border-radius: 28px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(250, 204, 21, 0.15);
  padding: 28px 24px; color: #ffffff; position: relative;
  animation: arena-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes arena-pop {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.arena-header { text-align: center; position: relative; margin-bottom: 20px; }
.arena-badge {
  display: inline-block; padding: 4px 14px; background: rgba(250, 204, 21, 0.18);
  border: 1px solid #facc15; border-radius: 20px; font-size: 0.8rem; font-weight: 900;
  color: #fde047; letter-spacing: 1px; margin-bottom: 8px;
}
.arena-title {
  font-size: 2rem; font-weight: 900; margin: 0 0 4px;
  background: linear-gradient(90deg, #ffffff, #fde047, #ffffff);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.arena-subtitle { font-size: 0.95rem; color: #cbd5e1; margin: 0; }
.arena-close-btn {
  position: absolute; top: 0; right: 0; width: 36px; height: 36px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
  border-radius: 50%; color: #ffffff; font-size: 1.1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.arena-close-btn:hover { background: #ef4444; border-color: #ef4444; transform: rotate(90deg); }

/* Live Leader Banner */
.arena-leader-banner {
  background: rgba(255,255,255,0.06); border: 1.5px solid rgba(250, 204, 21, 0.3);
  border-radius: 14px; padding: 10px 16px; display: flex; align-items: center;
  justify-content: center; gap: 10px; font-size: 1.05rem; font-weight: 800;
  color: #fde047; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  box-shadow: inset 0 0 20px rgba(250, 204, 21, 0.08);
}
.leader-trophy-icon { font-size: 1.3rem; animation: trophy-wobble 2s infinite ease-in-out; }
@keyframes trophy-wobble {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-8deg); }
  75% { transform: rotate(8deg); }
}

/* Power Tug-of-War Bar */
.power-bar-wrapper { margin-bottom: 24px; }
.power-bar-labels {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.85rem; font-weight: 800; margin-bottom: 6px;
}
.team-a-label { color: #f87171; }
.team-b-label { color: #60a5fa; }
.power-vs-badge { color: #fde047; letter-spacing: 0.5px; font-size: 0.75rem; }
.power-bar-track {
  height: 20px; background: rgba(15, 23, 42, 0.8); border-radius: 12px;
  overflow: visible; position: relative; display: flex; border: 2px solid rgba(255,255,255,0.15);
}
.power-bar-fill {
  height: 100%; transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.power-bar-fill.team-a-fill {
  background: linear-gradient(90deg, #991b1b, #ef4444);
  border-radius: 10px 0 0 10px;
}
.power-bar-fill.team-b-fill {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 0 10px 10px 0;
}
.power-bar-clash {
  position: absolute; top: -6px; left: 50%; transform: translateX(-50%);
  font-size: 1.3rem; text-shadow: 0 0 10px #facc15; pointer-events: none;
  transition: left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Arena Teams Grid */
.arena-teams-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;
}
@media (max-width: 600px) {
  .arena-teams-grid { grid-template-columns: 1fr; }
}
.arena-team-card {
  background: rgba(30, 41, 59, 0.7); border-radius: 20px; padding: 20px 16px;
  position: relative; overflow: hidden; border: 2px solid rgba(255,255,255,0.1);
  text-align: center; transition: all 0.25s ease;
}
.arena-team-card.team-a-card {
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.12), rgba(15, 23, 42, 0.8));
}
.arena-team-card.team-b-card {
  border-color: rgba(59, 130, 246, 0.4);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(15, 23, 42, 0.8));
}
.team-card-top {
  display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 12px;
}
.team-badge {
  font-size: 0.75rem; font-weight: 900; letter-spacing: 0.8px; padding: 3px 10px; border-radius: 12px;
}
.badge-a { background: rgba(239, 68, 68, 0.25); color: #fca5a5; border: 1px solid #ef4444; }
.badge-b { background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid #3b82f6; }
.team-name-input {
  background: transparent; border: 1px dashed rgba(255,255,255,0.3); border-radius: 6px;
  color: #ffffff; font-size: 1.1rem; font-weight: 800; text-align: center;
  padding: 2px 8px; width: 85%;
}
.team-name-input:focus {
  background: rgba(0,0,0,0.4); border-color: #facc15; outline: none;
}
.team-score-digital {
  font-size: 4.2rem; font-weight: 900; font-family: monospace, var(--font-mono, monospace);
  line-height: 1; margin: 10px 0 16px; text-shadow: 0 4px 16px rgba(0,0,0,0.6);
  transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.team-score-digital.score-bump {
  animation: score-bump-anim 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes score-bump-anim {
  0% { transform: scale(1); }
  50% { transform: scale(1.22); color: #fde047; }
  100% { transform: scale(1); }
}
.team-a-score { color: #f87171; text-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
.team-b-score { color: #60a5fa; text-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }

.team-quick-actions {
  display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;
}
.quick-pts-btn {
  padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08); color: #ffffff; font-size: 0.85rem; font-weight: 800;
  cursor: pointer; transition: all 0.15s;
}
.quick-pts-btn:hover {
  transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.quick-pts-btn:active { transform: scale(0.95); }
.pts-add-1 { background: rgba(16, 185, 129, 0.25); border-color: #10b981; color: #a7f3d0; }
.pts-add-1:hover { background: #10b981; color: #ffffff; }
.pts-add-5 { background: rgba(245, 158, 11, 0.25); border-color: #f59e0b; color: #fde68a; }
.pts-add-5:hover { background: #f59e0b; color: #ffffff; }
.pts-add-10 { background: linear-gradient(135deg, #ef4444, #f59e0b); border: none; color: #ffffff; }
.pts-sub-1 { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.5); color: #fca5a5; }
.pts-sub-5 { background: rgba(239, 68, 68, 0.25); border-color: #ef4444; color: #f87171; }

/* Floating Points Burst Animation */
.floating-point-burst {
  position: fixed; z-index: 1000000; pointer-events: none;
  font-size: 1.8rem; font-weight: 900; font-family: monospace;
  animation: float-score-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes float-score-up {
  0% { opacity: 1; transform: translate(-50%, 0) scale(0.7); }
  40% { transform: translate(-50%, -30px) scale(1.3); }
  100% { opacity: 0; transform: translate(-50%, -70px) scale(1); }
}

/* Arena Footer Section & Activity Log */
.arena-footer-section {
  background: rgba(15, 23, 42, 0.6); border-radius: 16px; padding: 14px;
  border: 1px solid rgba(255,255,255,0.08);
}
.arena-activity-log { margin-bottom: 12px; }
.activity-log-title {
  font-size: 0.8rem; font-weight: 800; text-transform: uppercase;
  color: #94a3b8; margin-bottom: 6px; letter-spacing: 0.5px;
}
.activity-log-items {
  max-height: 80px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
}
.log-item-row {
  display: flex; justify-content: space-between; font-size: 0.82rem;
  padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,0.04);
}
.log-item-empty { font-size: 0.8rem; color: #64748b; font-style: italic; }
.arena-footer-toolbar {
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;
}
.arena-tool-btn {
  padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08); color: #cbd5e1; font-size: 0.82rem; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
}
.arena-tool-btn:hover { background: rgba(255,255,255,0.18); color: #ffffff; }
.arena-tool-btn.danger:hover { background: #ef4444; border-color: #ef4444; color: #ffffff; }

/* ─── Celebration Overlay ─── */
#celebration-overlay {
  position: fixed; inset: 0; z-index: 99999; pointer-events: none;
  display: flex; align-items: center; justify-content: center;
}
.confetti-particle {
  position: absolute; font-size: 1.5rem; animation: confetti-fall 2s ease-out forwards;
}
@keyframes confetti-fall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

/* ─── Level Up Overlay ─── */
#levelup-overlay {
  position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center;
}
.levelup-content {
  text-align: center; color: #fff; animation: levelup-appear 0.5s ease-out;
}
.levelup-emoji { font-size: 5rem; }
.levelup-content h1 { font-size: 3rem; margin: 12px 0; background: linear-gradient(45deg, #f9d423, #ff4e50); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
@keyframes levelup-appear { 0% { transform: scale(0.3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

/* ─── XP Popup ─── */
#xp-popup {
  position: fixed; z-index: 99998; font-size: 1.3rem; font-weight: 700;
  color: var(--primary); pointer-events: none;
  animation: xp-float 1.5s ease-out forwards;
}
@keyframes xp-float { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-60px); } }

/* ─── Avatar Modal ─── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99999;
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  background: var(--bg2); border-radius: var(--radius); padding: 32px;
  max-width: 400px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.avatar-emoji-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 16px; }
.avatar-option {
  font-size: 2.2rem; border: 2px solid var(--border); border-radius: 12px;
  background: var(--bg); cursor: pointer; padding: 8px; transition: all 0.2s;
}
.avatar-option:hover { border-color: var(--primary); transform: scale(1.1); }

/* ─── Speaking Game (Produce) ─── */
.speaking-prompt {
  font-size: 1.6rem; font-weight: 700; text-align: center; padding: 40px 20px;
  background: linear-gradient(135deg, var(--primary-light), var(--accent));
  color: #fff; border-radius: var(--radius); margin: 16px 0;
}

/* ─── Debate ─── */
.debate-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.debate-side { padding: 16px; border-radius: var(--radius); }
.debate-for { background: #d4edda; border: 2px solid var(--success); }
.debate-against { background: #f8d7da; border: 2px solid var(--danger); }

/* ─── Taboo ─── */
.taboo-card {
  text-align: center; padding: 30px; border: 3px solid var(--danger); border-radius: var(--radius);
  background: var(--bg2); max-width: 300px; margin: 0 auto;
}
.taboo-word { font-size: 2rem; font-weight: 700; margin-bottom: 16px; }
.taboo-forbidden { color: var(--danger); font-weight: 600; font-size: 1.1rem; }

/* ─── Information Gap ─── */
.info-gap-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-gap-side { padding: 16px; background: var(--bg); border-radius: var(--radius); border: 2px solid var(--border); }

/* ─── Guided Writing ─── */
.writing-area {
  width: 100%; min-height: 150px; padding: 12px; border: 2px solid var(--border);
  border-radius: 8px; font-family: var(--font-main); font-size: 0.95rem;
  resize: vertical; background: var(--bg2); color: var(--text);
}
.word-counter { font-size: 0.8rem; color: var(--text2); margin-top: 4px; text-align: right; }

/* ─── Can-do Statements ─── */
.cando-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.cando-item input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--primary); }

/* ─── Escape Room ─── */
.escape-puzzle { margin-bottom: 16px; padding: 16px; border: 2px solid var(--border); border-radius: 8px; }
.escape-puzzle.solved { border-color: var(--success); background: #d4edda; }
.escape-puzzle.locked { opacity: 0.5; pointer-events: none; }

/* ─── Sequence Ordering ─── */
.seq-items { list-style: none; }
.seq-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px;
  background: var(--bg2); cursor: grab;
}
.seq-arrows { display: flex; flex-direction: column; gap: 2px; }
.seq-arrows button { border: none; background: none; cursor: pointer; font-size: 0.8rem; }

/* ─── Concealed Text ─── */
.concealed-block { margin-bottom: 10px; }
.concealed-label {
  padding: 10px 16px; background: var(--primary); color: #fff; border-radius: 8px;
  cursor: pointer; font-weight: 600;
}
.concealed-content { padding: 12px; background: var(--bg); border-radius: 0 0 8px 8px; border: 1px solid var(--border); }

/* ─── Hangman ─── */
.hangman-word { font-size: 2rem; font-weight: 700; letter-spacing: 8px; text-align: center; margin: 16px 0; font-family: monospace; }
.hangman-keyboard { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
.hangman-key {
  width: 36px; height: 36px; border: 1px solid var(--border); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  font-weight: 600; transition: all 0.2s;
}
.hangman-key:hover { background: var(--primary); color: #fff; }
.hangman-key.used { opacity: 0.3; pointer-events: none; }
.hangman-key.correct { background: var(--success); color: #fff; }
.hangman-key.wrong { background: var(--danger); color: #fff; }

/* ─── Would You Rather ─── */
.wyr-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.wyr-option {
  padding: 24px; text-align: center; font-size: 1.1rem; font-weight: 600;
  border: 3px solid var(--border); border-radius: var(--radius); cursor: pointer;
  transition: all 0.3s;
}
.wyr-option:hover { border-color: var(--primary); transform: scale(1.03); }
.wyr-option.chosen { border-color: var(--primary); background: var(--primary-light); color: #fff; }

/* ─── Split View ─── */
.split-slider { width: 100%; margin: 12px 0; accent-color: var(--primary); }
.split-text { padding: 16px; background: var(--bg); border-radius: 8px; font-size: 1rem; line-height: 1.8; }

/* ─── Screen Shake ─── */
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
.screen-shake { animation: shake 0.3s ease-in-out; }

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .sidebar-left, .sidebar-right, .produce-sidebar, .practice-sidebar { display: none; }
  .prepare-main, .produce-main, .practice-main { padding: 12px; }
  .lesson-title { display: none; }
  .tab-btn { padding: 6px 12px; font-size: 0.85rem; }
  .flashcard { width: 100%; }
  .matching-grid, .debate-container, .info-gap-container, .wyr-container { grid-template-columns: 1fr; }
}

/* ─── Tutor actions ─── */
.tutor-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.tutor-actions textarea { width: 100%; height: 80px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; }
.tutor-actions button { padding: 8px 16px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; background: var(--bg); }
.tutor-actions button:hover { background: var(--primary); color: #fff; }

/* ─── Highlight search ─── */
mark.search-hl { background: var(--warning); padding: 1px 2px; border-radius: 2px; }

/* ─── A11y row ─── */
.a11y-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); }
.a11y-row button { padding: 4px 12px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; background: var(--bg); margin-left: 4px; }
.a11y-row select { padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); }

/* ─── Cat Mascot Speech Bubble ───
   Floats above the avatar instead of sitting in the flow: an in-flow bubble
   290px wide is what used to stretch the cat widget and strand the ✕ far from
   the cat. Text stays centred on the cat, nudged by JS when the cat hugs an edge. */
.cat-speech-bubble {
  background: var(--bg2);
  border: 1.5px solid var(--primary-light, #818cf8);
  border-radius: 16px;
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  width: max-content;
  max-width: min(300px, 46vw);
  text-align: center;
  margin: 0;
  box-shadow: 0 10px 28px var(--shadow), 0 0 0 1px rgba(67, 97, 238, 0.15);
  opacity: 0;
  pointer-events: none;
  position: absolute;
  top: auto;
  bottom: calc(100% + 10px);
  left: 50%;
  line-height: 1.45;
  transform: translateX(-50%) translateY(6px) scale(0.95);
  transform-origin: bottom center;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  word-break: break-word;
}
.cat-speech-bubble.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
  pointer-events: auto;
}
.cat-speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid var(--primary-light, #818cf8);
}

/* ─── Modern Sidebar Action Buttons (Practice mode sidebar) ─── */
.sidebar-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px var(--shadow);
}
.sidebar-action-btn:hover {
  background: var(--border);
  border-color: var(--text2);
  transform: translateY(-1px);
}
.sidebar-action-btn i {
  font-size: 1.1rem;
  color: var(--primary);
}

/* ─── Color-Coded Spoken & Vocabulary Support Checkboxes (Produce Mode) ─── */
.support-checkbox-label {
  border-left: 4px solid #ccc;
  background: var(--bg);
  box-shadow: 0 1px 2px var(--shadow);
  margin-bottom: 6px;
}
.support-checkbox-label:hover {
  background: var(--border) !important;
}
.support-checkbox-label input[type="checkbox"] {
  accent-color: currentColor;
  width: 15px;
  height: 15px;
  cursor: pointer;
}
.support-green {
  color: var(--text);
  border-left-color: #10b981 !important;
}
.support-blue {
  color: var(--text);
  border-left-color: #3b82f6 !important;
}
.support-purple {
  color: var(--text);
  border-left-color: #8b5cf6 !important;
}
.support-orange {
  color: var(--text);
  border-left-color: #f59e0b !important;
}

/* ─── Clickable Produce Questions with Focus States ─── */
.clickable-produce-question {
  border: 1px solid var(--border);
  background: var(--bg2);
  box-shadow: 0 1px 3px var(--shadow);
}
.clickable-produce-question:hover {
  background: var(--bg);
  border-color: var(--text2);
}
.clickable-produce-question.focused {
  background: rgba(67, 97, 238, 0.08) !important;
  border-color: var(--primary) !important;
  box-shadow: 0 4px 12px var(--shadow) !important;
  transform: scale(1.01);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM REFINEMENTS (header, sidebars, produce panels, cat drag)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Header: premium glassy look, less clutter ─── */
#top-nav {
  height: 72px;
  padding: 0 28px;
  background-color: var(--bg2);
  background-image: linear-gradient(135deg, rgba(67, 97, 238, 0.06), transparent 45%, rgba(139, 92, 246, 0.05));
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 24px rgba(30, 41, 59, 0.06);
  gap: 16px;
}
.nav-left { gap: 12px; }
.lesson-title-badge {
  gap: 8px;
  padding: 7px 15px;
  background: linear-gradient(135deg, var(--bg), var(--bg2));
  box-shadow: 0 2px 10px rgba(30, 41, 59, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
body .lesson-title { max-width: 220px; }
.learner-header-badge {
  font-size: 0.9rem;
  padding: 3px 11px;
  border-radius: 999px;
  letter-spacing: 0.2px;
}
.cefr-header-badge {
  padding: 2px 9px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.35);
}
.nav-tabs {
  padding: 5px;
  border-radius: 999px;
  box-shadow: 0 2px 12px rgba(30, 41, 59, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.tab-btn { padding: 8px 20px; border-radius: 999px; }
.tab-btn.active { box-shadow: 0 4px 14px rgba(67, 97, 238, 0.35); }
.nav-right { gap: 10px; }
.header-timer-pill,
.battery-widget,
.header-action-btn {
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.header-teams-widget {
  border-radius: 999px;
  padding: 5px 8px;
  background: rgba(67, 97, 238, 0.05);
  border: 1.5px solid var(--border);
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.05);
}

/* ─── Prepare / Practice gamification sidebar: premium cards ─── */
.sidebar-left {
  background: linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%);
  padding: 22px 18px;
  box-shadow: 2px 0 16px rgba(30, 41, 59, 0.04);
  scrollbar-width: thin;
}
.avatar-section { margin-bottom: 18px; }
.xp-ring { filter: drop-shadow(0 6px 14px rgba(67, 97, 238, 0.18)); }
.avatar-img {
  background: var(--bg2);
  box-shadow: 0 6px 16px rgba(67, 97, 238, 0.2);
  border-width: 3px;
}
.learner-name {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.2px;
}
.level-badge {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-radius: 999px;
  padding: 3px 14px;
  font-weight: 700;
  letter-spacing: 0.4px;
  box-shadow: 0 3px 10px rgba(67, 97, 238, 0.28);
}
.stats-grid { gap: 10px; margin: 16px 0; }
.stat-item {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.05);
  padding: 10px 6px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.stat-item:hover { transform: translateY(-2px); box-shadow: 0 5px 14px rgba(30, 41, 59, 0.09); }
.stat-icon { font-size: 1.3rem; }
.level-progress { padding: 0 2px; margin-bottom: 16px; }
.progress-bar-container {
  height: 10px;
  border-radius: 999px;
  background: var(--border);
  box-shadow: inset 0 1px 3px rgba(30, 41, 59, 0.12);
}
.progress-bar-fill { border-radius: 999px; }
.progress-label { font-size: 0.8rem; font-weight: 600; }
.badges-section,
.powerups-section,
.radar-section,
.voice-selector-section {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 13px 14px;
  margin-bottom: 13px;
  box-shadow: 0 2px 10px rgba(30, 41, 59, 0.05);
}
.badges-section h4,
.powerups-section h4,
.radar-section h4,
.voice-selector-section h4 {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.3px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.badge-item { font-size: 1.7rem; }
.powerup-btn {
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(30, 41, 59, 0.07);
  background: var(--bg);
}

/* ─── Produce panels: sticky + hover-to-scroll + larger readable text ─── */
.produce-support-left {
  position: sticky;
  top: var(--nav-height);
  height: calc(100vh - var(--nav-height));
  overflow-y: hidden;
  scrollbar-gutter: stable;
  box-shadow: 2px 0 16px rgba(30, 41, 59, 0.04);
  padding: 26px 22px;
}
.produce-support-left:hover,
.produce-support-left:focus-within {
  overflow-y: auto;
}
.produce-support-left::-webkit-scrollbar { width: 8px; }
.produce-support-left::-webkit-scrollbar-thumb { background: var(--border); border-radius: 8px; }
.produce-panel-title { font-size: 1.85rem; letter-spacing: -0.3px; }
.produce-support-placeholder { font-size: 1.4rem; line-height: 1.6; }
.support-checkbox-label {
  font-size: 1.5rem;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg2);
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.05);
}
.produce-support-container { gap: 12px; }
.produce-sidebar {
  box-shadow: -2px 0 16px rgba(30, 41, 59, 0.04);
  padding: 26px 22px;
}
.produce-sidebar::-webkit-scrollbar { width: 8px; }
.produce-sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 8px; }

/* ─── Practice layout: gamification sidebar on the left, no right panel ─── */
.practice-layout { position: relative; }
.practice-main { padding: 28px 32px; max-width: 940px; }

/* ─── Draggable Cat Mascot ─── */
.cat-mascot {
  cursor: grab;
  touch-action: none;
}
.cat-mascot:active,
.cat-mascot.dragging {
  cursor: grabbing;
  transition: none !important;
  z-index: 999999;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEDICATED MOBILE VERSION  ·  phones & small tablets (max-width 900px)
   The shell turns into an app-style layout: compact two-row header, slide-in
   tools drawer, swipeable progress rail, support sheet and touch-sized
   controls. Nothing here applies to the desktop/whiteboard experience.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Off-canvas chrome exists only on mobile */
#mobile-tools-btn,
#mobile-support-btn,
#mobile-tools-backdrop,
.mobile-drawer-head,
.mobile-sheet-head { display: none !important; }

/* Action labels live in the mobile tools drawer only */
#top-nav .header-action-btn .header-action-label { display: none; }

/* Wide lesson content must never push the app shell sideways */
.prepare-main,
.produce-main,
.practice-main { min-width: 0; overflow-x: hidden; }

/* ─── Narrow desktop / laptop: keep the single-row header inside the viewport ─── */
@media (min-width: 1025px) and (max-width: 1360px) {
  #top-nav { padding: 0 16px; gap: 10px; }
  body .lesson-title { max-width: 168px; }
  .tab-btn { padding: 9px 14px; font-size: 1.02rem; }
  .nav-right { gap: 7px; }
  /* The two extra +/- steppers per team push the row over the edge on laptops;
     tapping the team pill still scores +1 and the leaderboard handles the rest. */
  .header-team-unit .team-step-btn { display: none; }
  .teams-header-label-btn { padding: 4px 6px; }
  .teams-title-text { display: none; }
  .header-timer-pill { padding: 5px 9px; gap: 4px; font-size: 0.88rem; }
  .timer-mode-badge { font-size: 0.58rem; padding: 1px 4px; }
  .header-teams-widget { padding: 4px 6px; }
  .battery-widget { padding: 5px 9px; }
  .battery-days-label { max-width: 78px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
@media (min-width: 1025px) and (max-width: 1180px) {
  body .lesson-title { max-width: 104px; }
  .lesson-title-badge { padding: 6px 12px; }
  .nav-left { gap: 8px; }
  .nav-right { gap: 6px; }
  .tab-btn { padding: 8px 11px; font-size: 0.98rem; }
  .battery-days-label { display: none; }
  .header-action-btn { height: 34px; padding: 5px 9px; }
  .header-timer-pill { padding: 4px 7px; gap: 3px; font-size: 0.8rem; }
  .header-timer-text { min-width: 40px; }
  .timer-mode-badge { display: none; }
  .teams-header-label-btn { padding: 3px 5px; }
  .header-team-pill { padding: 4px 7px; font-size: 0.85rem; }
  .header-teams-widget { padding: 3px 5px; }
  .leaderboard-pop-btn { padding: 3px 5px; }
}
@media (min-width: 1025px) and (max-width: 1260px) {
  /* Produces two 380px support panels squeeze the activity column here — trim
     them and let the slide navigation wrap instead of overflowing. */
  .produce-support-left, .produce-sidebar { width: 330px; min-width: 300px; max-width: 330px; }
  .produce-nav-top, .produce-nav-bottom { flex-wrap: wrap; }
  .produce-progress { flex: 1 1 100%; text-align: center; }
  .produce-arrow { padding: 10px 16px; font-size: 1.05rem; }
}
@media (min-width: 1361px) and (max-width: 1560px) {
  #top-nav { padding: 0 20px; gap: 12px; }
  body .lesson-title { max-width: 186px; }
  .tab-btn { padding: 9px 18px; font-size: 1.06rem; }
  .nav-right { gap: 9px; }
  .header-timer-pill { padding: 5px 10px; }
  .battery-days-label { max-width: 92px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

/* Wrapper is layout-transparent on desktop so the two support panels stay
   direct flex children of .produce-layout (left panel ordered back to the front). */
.produce-support-sheet { display: contents; }
.produce-support-sheet > .produce-support-left { order: -1; }

@media (max-width: 1024px) {
  /* ── Compact typographic scale (a11y size slider still applies on top) ── */
  :root {
    --font-size-base: 13px;
    --fs-xs: 0.8rem; --fs-sm: 0.9rem; --fs-md: 1.02rem;
    --fs-lg: 1.16rem; --fs-xl: 1.3rem; --fs-2xl: 1.45rem; --fs-3xl: 1.6rem;
  }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  html, body { max-width: 100%; overflow-x: hidden; }
  body { padding-bottom: 0; }
  img, video, iframe, canvas, svg, table { max-width: 100%; }

  /* ── App bar: brand row + full-width mode switcher ── */
  #top-nav {
    height: auto !important;
    padding: 7px 9px !important;
    gap: 7px !important;
    flex-wrap: wrap;
    align-items: center;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  .nav-left { order: 1; flex: 1 1 auto; min-width: 0; gap: 8px !important; }
  .nav-center { order: 3; flex: 1 1 100%; }
  #mobile-tools-btn { order: 2; }
  .nav-right { order: 4; }

  .lesson-title-badge {
    width: 100%; min-width: 0; overflow: hidden;
    padding: 5px 11px !important; gap: 7px !important; border-radius: 999px !important;
  }
  .lesson-badge-icon { font-size: 1.05rem !important; flex: 0 0 auto; }
  body .lesson-title {
    display: block !important; flex: 1 1 auto; min-width: 0;
    max-width: none !important; font-size: 0.98rem !important; line-height: 1.25;
  }
  .learner-header-badge {
    flex: 0 1 auto; max-width: 42%; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; font-size: 0.76rem !important; padding: 2px 9px !important;
  }
  .cefr-header-badge { flex: 0 0 auto; font-size: 0.72rem !important; padding: 2px 8px !important; }

  .nav-tabs {
    width: 100%; display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px !important; padding: 4px !important; border-radius: 14px !important;
  }
  .tab-btn {
    justify-content: center; min-width: 0; white-space: nowrap; min-height: 42px;
    padding: 11px 6px !important; font-size: 0.9rem !important; border-radius: 10px !important;
  }
  .tab-btn:hover { transform: none; }

  #mobile-tools-btn {
    display: flex !important; align-items: center; gap: 5px; flex: 0 0 auto;
    height: 36px; padding: 0 12px; cursor: pointer;
    border: 1.5px solid var(--primary-light, #6c85f7); border-radius: 999px;
    background: rgba(67, 97, 238, 0.1); color: var(--primary);
    font-size: 0.88rem; font-weight: 800; letter-spacing: 0.2px;
    box-shadow: 0 2px 8px rgba(30, 41, 59, 0.06);
    transition: transform 0.15s ease, background 0.2s ease, color 0.2s ease;
  }
  #mobile-tools-btn:active { transform: scale(0.95); }
  body.mobile-tools-open #mobile-tools-btn { background: var(--primary); color: #ffffff; border-color: var(--primary); }

  /* ── Tools drawer (re-uses the existing header widgets) ── */
  .nav-right {
    position: fixed !important;
    top: 0; right: 0; bottom: 0; left: auto;
    width: min(340px, 88vw);
    display: flex !important; flex-direction: column; align-items: stretch;
    gap: 10px !important;
    padding: 14px 14px calc(24px + env(safe-area-inset-bottom, 0px));
    background: var(--bg2); border-left: 1.5px solid var(--border);
    box-shadow: -18px 0 44px rgba(15, 23, 42, 0.24);
    overflow-y: auto; overflow-x: hidden;
    z-index: 999991; visibility: hidden; transform: translateX(104%);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.32s;
    -webkit-overflow-scrolling: touch;
  }
  body.mobile-tools-open .nav-right { transform: translateX(0); visibility: visible; }
  .nav-right > * { width: 100%; max-width: none; flex: 0 0 auto; margin: 0; }
  .nav-right .header-timer-pill {
    justify-content: center; padding: 12px !important; gap: 8px;
    font-size: 1.05rem !important; border-radius: 14px !important;
  }
  .nav-right .header-timer-text { min-width: 58px; }
  .nav-right .header-teams-widget {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;
    padding: 10px !important; border-radius: 14px !important;
  }
  .nav-right .header-team-unit { display: flex; align-items: center; gap: 2px; }
  .nav-right .battery-widget { border-radius: 14px !important; padding: 10px 12px !important; justify-content: center; }
  .nav-right .header-action-btn {
    height: 44px; border-radius: 14px !important; font-size: 0.95rem;
    justify-content: center; gap: 8px;
  }
  .nav-right .header-action-btn .header-action-label { display: inline !important; font-size: 0.95rem; }
  .mobile-drawer-head {
    display: flex !important; align-items: center; justify-content: space-between;
    gap: 10px; padding-bottom: 10px; border-bottom: 1.5px solid var(--border);
  }
  .mobile-drawer-head .mt-title { font-size: 1.05rem; font-weight: 800; color: var(--text); }
  .mt-close, .ms-close {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; flex: 0 0 auto; cursor: pointer;
    border: 1.5px solid var(--border); border-radius: 999px;
    background: var(--bg); color: var(--text); font-size: 1rem; font-weight: 800;
  }
  .mt-close:active, .ms-close:active { transform: scale(0.93); }

  #mobile-tools-backdrop {
    display: none; position: fixed; inset: 0; z-index: 999990;
    background: rgba(15, 23, 42, 0.5);
    -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
    opacity: 0; pointer-events: none; transition: opacity 0.28s ease;
  }
  body.mobile-tools-open #mobile-tools-backdrop,
  body.mobile-support-open #mobile-tools-backdrop {
    display: block !important; opacity: 1; pointer-events: auto;
  }
  /* ── Single-column content, roomy thumb padding, cleared fixed toolbar ── */
  .prepare-layout,
  .produce-layout,
  .practice-layout { flex-direction: column; min-height: 0; }
  .prepare-main,
  .produce-main,
  .practice-main {
    padding: 12px 12px calc(104px + env(safe-area-inset-bottom, 0px)) !important;
    max-width: 100% !important; width: 100%; order: 1;
  }
  .lesson-summary { font-size: 1rem !important; margin-bottom: 14px; }

  /* ── Gamification sidebar becomes a swipeable progress rail ── */
  .sidebar-left {
    position: static !important;
    display: flex !important; flex-direction: row; align-items: stretch;
    width: auto !important; height: auto !important; max-height: none !important;
    gap: 10px; padding: 10px 12px 12px !important;
    border-right: none; border-bottom: 1.5px solid var(--border);
    overflow-x: auto !important; overflow-y: hidden !important;
    scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch;
    scrollbar-width: thin; order: 0;
  }
  .sidebar-left::-webkit-scrollbar { height: 4px; }
  .sidebar-left::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  .sidebar-left::before {
    content: '📊 Progress';
    display: flex; align-items: center; justify-content: center;
    flex: 0 0 auto; min-width: 84px; padding: 0 10px;
    border-radius: 14px; text-align: center;
    background: linear-gradient(135deg, rgba(67, 97, 238, 0.14), rgba(139, 92, 246, 0.14));
    color: var(--primary); font-size: 0.76rem; font-weight: 900;
    letter-spacing: 0.4px; text-transform: uppercase;
  }
  .sidebar-left > * { flex: 0 0 auto; scroll-snap-align: start; margin-bottom: 0 !important; }
  .sidebar-left .avatar-section { width: 112px; margin: 0 !important; }
  .sidebar-left .xp-ring { width: 74px; height: 74px; }
  .sidebar-left .avatar-img { width: 50px; height: 50px; font-size: 1.6rem; }
  .sidebar-left .learner-name { font-size: 0.85rem; margin-top: 6px; }
  .sidebar-left .level-badge { font-size: 0.68rem; padding: 2px 9px; }
  .sidebar-left .stats-grid { display: flex; gap: 8px; margin: 0 !important; }
  .sidebar-left .stats-grid .stat-item { min-width: 72px; padding: 8px 10px; font-size: 0.78rem; }
  .sidebar-left .stat-icon { font-size: 1.05rem; margin-bottom: 2px; }
  .sidebar-left .level-progress {
    min-width: 168px; margin: 0 !important;
    display: flex; flex-direction: column; justify-content: center; gap: 6px;
  }
  .sidebar-left .badges-section,
  .sidebar-left .powerups-section,
  .sidebar-left .radar-section,
  .sidebar-left .voice-selector-section {
    min-width: 158px; margin: 0 !important; padding: 10px !important;
  }
  .sidebar-left .badges-section h4,
  .sidebar-left .powerups-section h4,
  .sidebar-left .radar-section h4,
  .sidebar-left .voice-selector-section h4 { font-size: 0.78rem !important; margin-bottom: 6px !important; }
  .sidebar-left .badge-item { font-size: 1.35rem !important; }
  .sidebar-left canvas { width: 132px !important; height: 132px !important; max-width: 132px !important; }
  .sidebar-left .powerup-btn { width: 40px; height: 40px; font-size: 1.05rem; }
  .sidebar-left .voice-selector-section select { font-size: 0.8rem !important; }

  /* ── Tabs, search and panels ── */
  #search-bar { padding: 10px 12px !important; }
  #search-input { font-size: 1rem !important; padding: 11px 14px !important; }
  #filter-chips {
    flex-wrap: nowrap !important; overflow-x: auto; padding-bottom: 4px;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  #filter-chips::-webkit-scrollbar { display: none; }
  .chip { flex: 0 0 auto; padding: 7px 14px !important; font-size: 0.85rem !important; }
  .panel-overlay {
    top: 0 !important; left: 0 !important; right: 0 !important;
    width: 100% !important; height: 100vh !important; max-height: none !important;
    border-radius: 0 !important; transform: none !important;
    padding: 14px 14px calc(104px + env(safe-area-inset-bottom, 0px)) !important;
    z-index: 999993 !important;
  }
  .panel-overlay.panel-center { top: 0 !important; left: 0 !important; transform: none !important; border: none !important; }
  #timer-dropdown-popover {
    left: 10px !important; right: 10px !important; top: auto !important;
    bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important;
    width: auto !important; max-width: none !important;
    max-height: min(76vh, 520px); overflow-y: auto; z-index: 999995 !important;
  }
  /* ── Produce mode: activity first, support in a slide-in sheet ── */
  #mobile-support-btn {
    display: flex !important; align-items: center; gap: 6px;
    position: fixed; left: 12px; right: auto; bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    z-index: 999989; cursor: pointer;
    padding: 11px 16px; border: none; border-radius: 999px;
    background: linear-gradient(135deg, #4361ee, #8b5cf6); color: #ffffff;
    font-size: 0.92rem; font-weight: 800;
    box-shadow: 0 10px 24px rgba(67, 97, 238, 0.4);
  }
  #mobile-support-btn:active { transform: scale(0.95); }
  body.mobile-support-open #mobile-support-btn { opacity: 0; pointer-events: none; }

  .produce-support-sheet {
    display: flex !important; flex-direction: column;
    position: fixed; top: 0; right: 0; bottom: 0; left: auto;
    width: min(420px, 92vw);
    background: var(--bg2); border-left: 1.5px solid var(--border);
    box-shadow: -18px 0 44px rgba(15, 23, 42, 0.24);
    overflow-y: auto; overflow-x: hidden;
    z-index: 999992; visibility: hidden; transform: translateX(104%);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.32s;
    -webkit-overflow-scrolling: touch;
  }
  body.mobile-support-open .produce-support-sheet { transform: translateX(0); visibility: visible; }
  .mobile-sheet-head {
    display: flex !important; align-items: center; justify-content: space-between;
    gap: 10px; padding: 14px 14px 12px;
    position: sticky; top: 0; z-index: 2;
    background: var(--bg2); border-bottom: 1.5px solid var(--border);
  }
  .mobile-sheet-head .ms-title { font-size: 1.02rem; font-weight: 800; color: var(--text); }
  .produce-support-sheet .produce-support-left,
  .produce-support-sheet .produce-sidebar {
    position: static !important; display: flex !important;
    width: auto !important; min-width: 0 !important; max-width: none !important;
    height: auto !important; overflow: visible !important;
    padding: 14px 14px calc(28px + env(safe-area-inset-bottom, 0px)) !important;
    border: none; border-top: 1.5px solid var(--border); box-shadow: none;
  }
  .produce-support-sheet .produce-panel-title { font-size: 1.15rem !important; margin-bottom: 10px !important; }
  .produce-support-sheet .produce-support-container { gap: 10px; }
  /* The support rows are built with inline rem sizes; normalise them for the sheet */
  .produce-support-sheet .produce-support-container * {
    font-size: 0.98rem !important; line-height: 1.5 !important;
  }
  .produce-support-sheet .produce-support-container strong { font-size: 1.02rem !important; }
  .produce-support-sheet .support-checkbox-label { padding: 11px 12px !important; gap: 10px !important; }
  .produce-support-sheet .support-cb-input { width: 26px !important; height: 26px !important; margin-top: 1px !important; }

  /* ── Activity cards, sections and activity internals ── */
  .section-accordion { border-radius: 14px; margin-bottom: 12px; }
  .section-header {
    padding: 12px 12px !important; flex-wrap: wrap; gap: 8px !important;
  }
  .section-header-left { flex-wrap: wrap; gap: 8px !important; min-width: 0; }
  .section-header-right { flex-wrap: wrap; gap: 8px !important; justify-content: flex-start; }
  .section-body { padding: 0 12px !important; }
  .activity-header { padding: 10px 12px !important; flex-wrap: wrap; gap: 8px !important; }
  .activity-title { font-size: 1rem !important; min-width: 0; }
  .activity-body { padding: 12px !important; }
  .activity-actions { padding: 8px 12px !important; flex-wrap: wrap; }
  .activity-feedback { padding: 12px !important; }
  .act-btn { padding: 11px 16px !important; font-size: 1rem !important; }
  .act-input, .act-select { font-size: 1rem !important; padding: 11px 13px !important; }
  .mcq-opt { font-size: 1rem !important; padding: 13px 15px !important; }
  .mcq-opt:hover { transform: none; }
  .vocab-table { display: block; overflow-x: auto; font-size: 1rem !important; -webkit-overflow-scrolling: touch; }
  .vocab-table th, .vocab-table td { font-size: 0.98rem !important; padding: 10px 12px !important; white-space: nowrap; }
  .memory-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 8px !important; }
  .memory-card { font-size: 1.1rem !important; }
  .matching-grid, .debate-container, .info-gap-container, .wyr-container, .arena-teams-grid {
    grid-template-columns: 1fr !important;
  }
  .arena-teams-grid { gap: 10px !important; }
  .avatar-emoji-grid { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; gap: 6px !important; }
  .avatar-option { font-size: 1.7rem !important; padding: 5px !important; }
  .timer-presets-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .hangman-keyboard { gap: 3px !important; }
  .hangman-key { width: 30px !important; height: 34px !important; font-size: 0.95rem !important; }
  .hangman-word { font-size: 1.4rem !important; letter-spacing: 4px !important; }
  .gf-sentence { font-size: 1.05rem !important; line-height: 1.95 !important; }
  .gf-input { width: 116px !important; font-size: 1rem !important; padding: 6px 8px !important; }
  .scramble-words { gap: 8px !important; }
  .scramble-chip { padding: 8px 14px !important; font-size: 1rem !important; }
  .mcq-question h5 { font-size: 1.1rem !important; }
  .typing-display { font-size: 1.02rem !important; line-height: 1.8 !important; padding: 12px !important; word-break: break-word; }
  .v2-ls-line { padding: 9px 10px !important; gap: 8px !important; }
  .v2-ls-text { font-size: 1rem !important; }
  .v2-ls-play, .v2-ls-toggle { padding: 9px 16px !important; font-size: 1rem !important; }
  .seq-item { padding: 9px 11px !important; font-size: 1rem !important; }
  .writing-area { min-height: 130px !important; font-size: 1rem !important; }
  .cando-item { font-size: 0.95rem !important; }
  .taboo-word, .taboo-forbidden { font-size: 1rem !important; }
  .team-score-digital { font-size: 3rem !important; }
  .timer-big-display { font-size: 2rem !important; }
  .modal-content { padding: 22px 16px !important; max-width: calc(100vw - 20px) !important; }
  .dock-btn { font-size: 1rem !important; padding: 9px 10px !important; }
  .flashcard-container { gap: 14px !important; }
  .flashcard { width: 100% !important; min-height: 0 !important; max-width: 100% !important; }
  /* The two faces are absolutely positioned inside the inner card, so the inner
     keeps a phone-sized fixed height and each face scrolls its own content. */
  .flashcard-inner { min-height: 0 !important; height: 430px !important; }
  .flashcard-front, .flashcard-back { padding: 18px 16px !important; border-radius: 18px !important; }
  .flashcard-actions { flex-wrap: wrap; gap: 10px !important; margin-top: 12px !important; }
  .fc-btn { padding: 9px 16px !important; font-size: 1rem !important; }

  /* ── Produce mode canvas ── */
  .produce-nav-top, .produce-nav-bottom {
    gap: 8px !important; max-width: 100% !important; margin: 6px 0 !important;
  }
  .produce-arrow {
    flex: 1 1 auto; padding: 11px 12px !important; font-size: 1rem !important;
    min-width: 0; white-space: nowrap;
  }
  .produce-progress { font-size: 0.9rem !important; white-space: nowrap; }
  .produce-activity-slide { max-width: 100% !important; }
  .produce-activity-title { font-size: 1.3rem !important; margin-bottom: 12px !important; }
  .produce-card { font-size: 1rem !important; }
  .produce-card .mcq-opt { font-size: 1rem !important; padding: 13px 15px !important; }
  .done-check { width: 100%; font-size: 1rem !important; padding: 12px 20px !important; }

  /* ── Practice mode ── */
  .practice-progress-header { flex-direction: column; align-items: flex-start; gap: 10px !important; margin-bottom: 14px !important; }
  .practice-global-progress { width: 100%; }
  .practice-global-progress .progress-bar-container { width: 100% !important; flex: 1; }
  .sidebar-action-btn { padding: 12px 14px !important; font-size: 0.95rem !important; }

  /* ── Cat mascot: corner-parked, clear of the toolbars, toast-style bubble ── */
  .cat-mascot { right: 12px !important; bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important; }
  .cat-avatar-container { width: 62px !important; height: 62px !important; }
  /* The quick-tools menu becomes a thumb-reachable bottom bar, so it can never
     hang off the screen or sit mid-avatar on a narrow viewport. */
  .cat-mascot .cat-companion-dock {
    position: fixed !important; left: 50% !important; right: auto !important; top: auto !important;
    bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
    max-width: calc(100vw - 20px);
    transform: translateX(-50%) translateY(10px);
    overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .cat-mascot.dock-open .cat-companion-dock { transform: translateX(-50%) translateY(0); }
  .cat-companion-dock::-webkit-scrollbar { display: none; }
  .cat-companion-dock .dock-btn { padding: 8px 9px !important; font-size: 0.92rem !important; }
  .cat-companion-dock .dock-btn .dock-label { display: none; }
  .cat-companion-dock .dock-status-badge { font-size: 0.6rem !important; padding: 1px 4px !important; }
  .cat-close-btn { width: 34px !important; height: 34px !important; }
  .cat-speech-bubble {
    position: fixed; left: 12px !important; right: 12px !important; top: auto !important;
    bottom: calc(162px + env(safe-area-inset-bottom, 0px));
    max-width: none !important; width: auto !important; margin: 0 !important;
    text-align: center; z-index: 999997;
    transform: none !important;
  }
  .cat-speech-bubble::after { display: none; }
  body.a11y-panel-open .cat-mascot { left: 12px !important; right: auto !important; bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important; }
  #accessibility-widget { bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important; right: 12px !important; }
}  /* end ≤ 1024px mobile shell */

/* ─── Small phones: fewer pills, tighter type ─── */
@media (max-width: 480px) {
  .learner-header-badge { display: none !important; }
  #mobile-tools-btn { padding: 0 10px; }
  #mobile-tools-btn .mt-label { display: none; }
  .tab-btn { font-size: 0.84rem !important; padding: 11px 2px !important; }
  .sidebar-left { padding: 9px 10px 10px !important; }
  .sidebar-left::before { min-width: 74px; font-size: 0.7rem; }
  .produce-arrow { font-size: 0.95rem !important; }
  .produce-progress { flex: 1 1 100%; order: 3; text-align: center; }
  #mobile-support-btn { padding: 10px 14px; }
  .panel-overlay { padding: 12px 12px calc(104px + env(safe-area-inset-bottom, 0px)) !important; }
}

/* ─── Phones in landscape: reclaim vertical space ─── */
@media (max-width: 1024px) and (max-height: 520px) {
  #top-nav { position: static !important; }
}
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   JAVASCRIPT GENERATION
   ═══════════════════════════════════════════════════════════════════════════ */

function generateJS(
  content: LessonPayload,
  learner: LearnerProfile,
  config: GeneratorConfig,
  prepareSections: Section[],
  produceSections: Section[],
  practiceSections: Section[],
  daysRemaining: number,
  totalDays: number,
): string {
  let avatarBase64 = '';
  const learnerAvatar = (learner as any).avatar || (learner as any).avatarId || '';
  if (learnerAvatar) {
    if (learnerAvatar.startsWith('custom:')) {
      avatarBase64 = getCustomAvatar(learnerAvatar) || '';
    } else if (learnerAvatar.startsWith('data:image/')) {
      avatarBase64 = learnerAvatar;
    }
  }
  // Pre-compute total produce activities
  const totalProduceActs = produceSections.reduce(
    (a, s) => a + s.activities.length,
    0,
  );

  return `
// ============================================================================
// English Lesson App – Runtime JavaScript
// ============================================================================

(function() {
  'use strict';
  window.APP_CHARACTERS = ${JSON.stringify((learner as any).classmates || [])};
  /* The learner's TARGET language (L2). When it is not English its Microsoft
     Natural voices drive both the default read-aloud voice and the multi-voice
     players ([male1] … [female5]), so a learner of French hears French voices. */
  const TARGET_LANGUAGE_VOICES = ${JSON.stringify(tagVoiceMapForLanguage((learner as any).targetLanguage || (learner as any).targetLang || ''))};
  const TARGET_LANGUAGE_TAG = ${JSON.stringify(speechLanguageTag((learner as any).targetLanguage || (learner as any).targetLang || ''))};
  /* Browser twin of voiceMatchesId (utils/voices.ts): this file is standalone,
     so the voice resolver cannot import the helper. */
  function voiceMatchesId(voiceName, id) {
    const vName = String(voiceName || '').toLowerCase();
    const vId = String(id || '').toLowerCase();
    if (!vName || !vId) return false;
    if (vName === vId || vName.indexOf(vId) !== -1) return true;
    const cut = vId.indexOf(' - ');
    const stem = cut !== -1 ? vId.slice(0, cut) : '';
    return !!stem && vName.indexOf(stem) !== -1;
  }

  // Expose accessibility toggle for Ctrl+/
  window.toggleAccessibilityWidget = function() {
    const p = document.getElementById('accessibility-panel');
    if (p) {
      p.style.display = p.style.display === 'none' || p.style.display === '' ? 'flex' : 'none';
    }
  };

  // ─── Configuration ───
  const CONFIG = {
    gamification: ${config.gamificationEnabled},
    tts: ${config.ttsEnabled},
    mascot: ${config.mascotEnabled},
    celebration: '${config.celebrationIntensity}',
    spiral: ${config.spiralRepetition},
    tutorPasscode: '${config.tutorPasscode}',
    voice: ${JSON.stringify(config.studyModeVoice || "")},
    haptic: ${config.hapticEnabled},
    xpValues: ${JSON.stringify(config.xpValues)},
    levelThresholds: ${JSON.stringify(config.levelThresholds)},
    learnerName: ${JSON.stringify(learner.name)},
    daysRemaining: ${daysRemaining},
    totalDays: ${totalDays}
  };

  const LESSON_CONTENT = ${JSON.stringify(content)};

  // ─── Update every element with a given id (Prepare + Practice sidebars share the
  //     same gamification markup, so stats, badges and the radar must render twice). ───
  function setAll(id, fn) {
    document.querySelectorAll('[id="' + id + '"]').forEach(fn);
  }
  function setAllText(id, value) {
    setAll(id, function(el) { el.textContent = value; });
  }
  // Prepare sidebar uses plain ids, the Practice copy uses the same ids with a
  // "prac-" prefix — these update BOTH so the two gamification sidebars stay in sync.
  function setAllDual(id, fn) {
    setAll(id, fn);
    setAll('prac-' + id, fn);
  }
  function setAllDualText(id, value) {
    setAllDual(id, function(el) { el.textContent = value; });
  }

  // ─── Safe Storage Wrapper (Supports Tracking Prevention / Third-Party Iframes) ───
  const _memoryStore = {};
  function safeStorageGet(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch(e) {}
    return _memoryStore[key] || null;
  }
  function safeStorageSet(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch(e) {}
    _memoryStore[key] = String(value);
  }
  function safeStorageRemove(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch(e) {}
    delete _memoryStore[key];
  }
  window.safeStorageGet = safeStorageGet;
  window.safeStorageSet = safeStorageSet;
  window.safeStorageRemove = safeStorageRemove;

  // ─── HTML & Attribute Escaping Helpers ───
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  const escHtml = esc;
  const escapeHTML = esc;
  function escAttr(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  // Render trusted rich-text HTML (bold/italic/strike/lists) while stripping anything executable.
  function sanitizeRich(html) {
    if (!html) return '';
    return String(html)
      .replace(/<script[\\s\\S]*?<\\/script>/gi, '')
      .replace(/<style[\\s\\S]*?<\\/style>/gi, '')
      .replace(/<(iframe|object|embed|form|link|meta|base|template)[^>]*>[\\s\\S]*?<\\/(iframe|object|embed|form|link|meta|base|template)>/gi, '')
      .replace(/<(iframe|object|embed|form|link|meta|base|template)[^>]*\\/>/gi, '')
      .replace(/\\son\\w+\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)/gi, '')
      .replace(/(href|src)\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)/gi, function(m, attr, val) {
        const v = val.replace(/^["']|["']$/g, '');
        return (/^\s*javascript:/i.test(v)) ? attr + '="#"' : m;
      });
  }
  window.sanitizeRich = sanitizeRich;
  function escJs(s) {
    if (!s) return '';
    return String(s)
      .replace(/\\\\/g, '\\\\\\\\')
      .replace(/'/g, "\\\\'")
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  window.esc = esc;
  window.escHtml = escHtml;
  window.escapeHTML = escapeHTML;
  window.escAttr = escAttr;
  window.escJs = escJs;

  // ─── State ───
  const STORAGE_KEY = 'lesson_' + CONFIG.learnerName.replace(/\\s/g,'_');
  let state = loadState();
  
  function defaultState() {
    return {
      xp: 0, level: 1, streak: 0, coins: 0, badges: [],
      completedActivities: {},
      avatar: ${avatarBase64 ? JSON.stringify(avatarBase64) : "null"},
      isAvatarImage: ${avatarBase64 ? "true" : "false"},
      incorrectAnswers: [], reportStartedAt: new Date().toISOString(), essayAnswers: {}, voiceRecordings: {},
      skills: { vocabulary: 0, grammar: 0, listening: 0, reading: 0, pronunciation: 0 },
      notes: '', bookmarks: [], practiceCompleted: {},
      activeTab: 'prepare', catMuted: false, catHidden: false,
      doubleXpActive: false, hintActive: false, timeFreezeActive: false,
      sessionStart: Date.now()
    };
  }

  function loadState() {
    try {
      const saved = safeStorageGet(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // The mascot always comes back fully working on every lesson load: a previous
        // "close" only hid it for that session, and a stale muted flag (set by the old
        // close button) must never leave every audio button silently dead.
        return { ...defaultState(), ...parsed, catHidden: false, catMuted: false, sessionStart: Date.now() };
      }
    } catch(e) {}
    return defaultState();
  }

  function saveState() {
    try { safeStorageSet(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // ─── Cat Mascot Phrases ───
  const CAT_PHRASES = {
    correct: [
      "Purrfect! 😸 You nailed it!", "Meow-velous work! 😺 Keep going!",
      "That's right! 😻 You're on fire!", "Excellent! 😸 I knew you could do it!",
      "Amazing! 😺 Your brain is sharp today!", "Spot on! 😻 You're a natural!",
      "Brilliant! 😸 That was impressive!", "Wonderful! 😺 Keep up the great work!",
      "Fantastic! 😻 You're making great progress!", "Yes! 😸 That's exactly right!",
      "Superb! 😺 You're learning so fast!", "Outstanding! 😻 I'm proud of you!",
      "Way to go! 😸 You're a star!", "Perfect answer! 😺 You're unstoppable!",
      "Incredible! 😻 That was flawless!", "Awesome! 😸 You've got talent!",
      "Magnificent! 😺 Keep surprising me!", "Top marks! 😻 You're doing great!",
      "Right on! 😸 That's the spirit!", "Excellent choice! 😺 Well done!",
    ],
    correctRetry: [
      "You got it this time! 😸 Practice makes purrfect!",
      "See? 😺 Never give up! You got there!",
      "That's it! 😻 Learning from mistakes is powerful!",
      "There you go! 😸 Third time's a charm!",
      "Yes! 😺 Persistence pays off!",
    ],
    incorrect: [
      "Hmm, not quite! 😿 Let's think about this...",
      "Almost! 😿 Try a different approach.",
      "Not this time! 😿 But don't worry, try again!",
      "Oops! 😿 That's a common mistake. Let's review.",
      "Close but not quite! 😿 You'll get it next time!",
      "Don't give up! 😿 Everyone makes mistakes.",
      "Not right! 😿 But that's how we learn!",
      "Hmm... 😿 Think carefully and try again.",
      "That's tricky! 😿 Let me give you a hint.",
      "Not exactly! 😿 Read the question once more.",
    ],
    hint: [
      "Here's a clue! 😼 Think about the context...",
      "Psst! 😼 Look at the first letter...",
      "Let me help! 😼 Remember what we learned earlier?",
      "A little nudge! 😼 Think about the meaning...",
    ],
    sectionIntro: [
      "Let's explore this section! 😺", "New topic time! 😸 Ready?",
      "Here we go! 😻 This is going to be fun!", "Time for something new! 😺",
      "Let's dive in! 😸 You've got this!", "Next challenge! 😻 Let's do this!",
    ],
    spiralCue: [
      "Remember this word? 😼 We saw it earlier!",
      "This looks familiar! 😼 You studied this before.",
      "Hey, you know this one! 😼 It came up in a flashcard!",
    ]
  };
  let phraseIndices = {};
  function getCatPhrase(category) {
    const phrases = CAT_PHRASES[category] || CAT_PHRASES.correct;
    if (!phraseIndices[category]) phraseIndices[category] = 0;
    const idx = phraseIndices[category] % phrases.length;
    phraseIndices[category] = idx + 1;
    return phrases[idx];
  }

  // ─── Web Audio Tone Synthesizer ───
  let audioCtx = null;
  function playAudioTone(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'point') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
      } else if (type === 'penalty') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now); osc.stop(now + 0.28);
      } else if (type === 'fanfare') {
        const chordNotes = [523.25, 659.25, 783.99, 1046.50];
        chordNotes.forEach((freq, i) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + i * 0.08);
          g.gain.setValueAtTime(0.12, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.4);
        });
      } else if (type === 'alarm') {
        [0, 0.25, 0.5].forEach((offset) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(880, now + offset);
          o.frequency.setValueAtTime(1174.66, now + offset + 0.08);
          g.gain.setValueAtTime(0.2, now + offset);
          g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(now + offset); o.stop(now + offset + 0.22);
        });
      } else if (type === 'meow') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now); osc.stop(now + 0.38);
      }
    } catch(e) {
      // Audio context might be restricted before user gesture
    }
  }

  // ─── TTS Engine & Robust Web Speech Integration ───
  let selectedVoice = null;
  let speechRate = 1.0;
  let hoverReadActive = true; // ON by default — matches the dock badge that starts at ON
  // The mascot can be dismissed for THIS session only. Deliberately never stored,
  // so every fresh lesson load greets the learner with the cat again.
  let catDismissed = false;
  window._ttsUtterances = []; // Prevent browser garbage collection truncating speech

  // Chrome TTS Keep-Alive
  let ttsKeepAliveTimer = null;
  function startTTSKeepAlive() {
    if (ttsKeepAliveTimer) clearInterval(ttsKeepAliveTimer);
    ttsKeepAliveTimer = setInterval(() => {
      if (window.speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
    }, 8000);
  }
  function stopTTSKeepAlive() {
    if (ttsKeepAliveTimer) { clearInterval(ttsKeepAliveTimer); ttsKeepAliveTimer = null; }
  }

  function populateVoiceList() {
    if (!window.speechSynthesis) return;
    const voices = speechSynthesis.getVoices();
    // Fill the voice selector in BOTH the Prepare and Practice gamification sidebars.
    setAllDual('voice-selector', function(selector) {
      selector.innerHTML = '<option value="">Default Voice</option>';
      voices.forEach((v, index) => {
        if (v.lang && v.lang.startsWith('en')) {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = v.name + ' (' + v.lang + ')';
          selector.appendChild(option);
          if (selectedVoice && selectedVoice.name === v.name) {
            selector.value = index;
          }
        }
      });
    });
  }

  window.changeVoice = function(indexStr) {
    if (!window.speechSynthesis) return;
    const voices = speechSynthesis.getVoices();
    if (indexStr === "") {
      selectedVoice = null;
    } else {
      selectedVoice = voices[parseInt(indexStr, 10)];
    }
    catSay("How does this clear pronunciation sound?", "😸");
  };

  function initTTS() {
    if (!CONFIG.tts || !window.speechSynthesis) return;
    function setVoice() {
      const voices = speechSynthesis.getVoices();
      if (!selectedVoice) {
        const targetVoice = TARGET_LANGUAGE_VOICES ? (TARGET_LANGUAGE_VOICES['female1'] || TARGET_LANGUAGE_VOICES['male1'] || '') : '';
        selectedVoice = (targetVoice ? voices.find(v => voiceMatchesId(v.name, targetVoice) || voiceMatchesId(v.voiceURI, targetVoice)) : null) ||
                        voices.find(v => v.voiceURI === CONFIG.voice || v.name === CONFIG.voice) ||
                        (CONFIG.voice ? voices.find(v => v.name.toLowerCase().includes(CONFIG.voice.toLowerCase())) : null) ||
                        voices.find(v => v.name.includes('Natural') && v.lang.startsWith('en')) ||
                        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                        voices.find(v => v.name.includes('Samantha') && v.lang.startsWith('en')) ||
                        voices.find(v => v.name.includes('Microsoft') && v.lang.startsWith('en')) ||
                        voices.find(v => v.lang.startsWith('en') && v.localService) ||
                        voices.find(v => v.lang.startsWith('en')) || voices[0];
      }
      populateVoiceList();
    }
    speechSynthesis.onvoiceschanged = setVoice;
    setVoice();
  }

  const BROWSER_VOICE_MAP = {
    'male1': 'Microsoft Andrew',
    'male2': 'Microsoft Ryan',
    'male3': 'Microsoft Liam',
    'male4': 'Microsoft Brian',
    'male5': 'Microsoft Connor',
    'female1': 'Microsoft Emma',
    'female2': 'Microsoft Clara',
    'female3': 'Microsoft Libby',
    'female4': 'Microsoft Natasha',
    'child1': 'Microsoft Ana',
    'child2': 'Microsoft Maisie'
  };

  function scriptChipColor(tag) {
    if (!tag) return '#8b5cf6';
    if (tag.indexOf('male') === 0) return '#0ea5e9';
    if (tag.indexOf('female') === 0) return '#ec4899';
    if (tag.indexOf('child') === 0) return '#f59e0b';
    return '#10b981';
  }

  function parseTaggedScriptLines(raw) {
    const lines = [];
    if (typeof raw !== 'string') return lines;
    const tagRe = /\\[(male\\s*[1-5]|female\\s*[1-5]|child\\s*[12]|speaker)\\s*\\]/gi;
    let lastIdx = 0, tag = null, m;
    while ((m = tagRe.exec(raw)) !== null) {
      if (m.index > lastIdx) {
        const seg = raw.substring(lastIdx, m.index).trim();
        if (seg) lines.push({ tag: tag, text: seg });
      }
      tag = (m[1] || '').toLowerCase().replace(/\\s+/g, '');
      lastIdx = tagRe.lastIndex;
    }
    if (lastIdx < raw.length) {
      const seg = raw.substring(lastIdx).trim();
      if (seg) lines.push({ tag: tag, text: seg });
    }
    if (!lines.length && raw.trim()) lines.push({ tag: null, text: raw.trim() });
    return lines.map(function(l) {
      const mm = l.text.match(/^([A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)?):\\s*(.*)$/);
      if (mm) return { tag: l.tag, speaker: mm[1], text: mm[2] };
      return { tag: l.tag, speaker: null, text: l.text };
    });
  }

  // ─── Listening Script — multi-voice read-aloud player (mirrors Micro Lesson V1)
  function renderListeningScript(body, data, actId) {
    let scriptText = '';
    if (typeof data === 'string') {
      scriptText = data;
    } else if (data && typeof data === 'object') {
      scriptText = data.audioScript || data.taggedScript || data.script || data.text || data.content || '';
    }
    if (!scriptText || typeof scriptText !== 'string') {
      body.innerHTML = '<p style="color:var(--text2)">No listening script provided.</p>';
      return;
    }
    const lines = parseTaggedScriptLines(scriptText);
    if (!lines.length) {
      body.innerHTML = '<p style="color:var(--text2)">No listening script provided.</p>';
      return;
    }
    const esc = function(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
    let linesHtml = '';
    lines.forEach(function(line, i) {
      const color = scriptChipColor(line.tag);
      const label = line.speaker ? esc(line.speaker) : esc(line.tag || 'speaker');
      linesHtml += '<div class="v2-ls-line" data-idx="' + i + '">'
        + '<span class="v2-ls-chip" style="background:' + color + '">' + label + '</span>'
        + '<span class="v2-ls-text">' + esc(line.text) + '</span>'
        + '<button class="v2-ls-line-play" data-idx="' + i + '" title="Read this line">🔊</button>'
        + '</div>';
    });
    body.innerHTML =
      '<div class="v2-ls-bar">'
      + '<button class="v2-ls-play" id="v2ls-' + actId + '">▶ Play Script</button>'
      + '<button class="v2-ls-toggle" id="v2lst-' + actId + '">📺 Show Transcript</button>'
      + '</div>'
      + '<div class="v2-ls-transcript" id="v2lstr-' + actId + '" style="display:none;">' + linesHtml + '</div>';

    const playBtn = body.querySelector('.v2-ls-play');
    const toggleBtn = body.querySelector('.v2-ls-toggle');
    const box = body.querySelector('.v2-ls-transcript');
    let playSession = 0;
    let isPlaying = false;

    toggleBtn.addEventListener('click', function() {
      if (box.style.display === 'none') {
        box.style.display = 'block';
        toggleBtn.textContent = '📺 Hide Transcript';
      } else {
        box.style.display = 'none';
        toggleBtn.textContent = '📺 Show Transcript';
      }
    });

    function clearHi() { body.querySelectorAll('.v2-ls-line.playing').forEach(function(l) { l.classList.remove('playing'); }); }

    function playFrom(idx, sid) {
      if (sid !== playSession) return;
      if (idx >= lines.length) {
        isPlaying = false;
        clearHi();
        playBtn.textContent = '▶ Play Script';
        if (typeof completeActivity === 'function') { try { completeActivity(actId, mode, false, 'listening_script'); } catch (e) {} }
        return;
      }
      const line = lines[idx];
      clearHi();
      const lineEl = body.querySelector('.v2-ls-line[data-idx="' + idx + '"]');
      if (lineEl) {
        lineEl.classList.add('playing');
        if (typeof lineEl.scrollIntoView === 'function') lineEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const tagged = (line.tag ? '[' + line.tag + ']' : '') + (line.speaker ? line.speaker + ': ' : '') + line.text;
      speak(tagged, function() {
        setTimeout(function() { playFrom(idx + 1, sid); }, 120);
      });
    }

    playBtn.addEventListener('click', function() {
      if (isPlaying) {
        playSession++;
        isPlaying = false;
        clearHi();
        if (window.speechSynthesis) speechSynthesis.cancel();
        playBtn.textContent = '▶ Play Script';
        return;
      }
      isPlaying = true;
      const sid = ++playSession;
      playBtn.textContent = '⏹ Stop';
      // Reveal transcript automatically so learners can follow along
      if (box.style.display === 'none') toggleBtn.click();
      playFrom(0, sid);
    });

    body.querySelectorAll('.v2-ls-line-play').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.idx, 10);
        if (isNaN(idx) || !lines[idx]) return;
        const sid = ++playSession;
        if (isPlaying) { isPlaying = false; playBtn.textContent = '▶ Play Script'; }
        const line = lines[idx];
        clearHi();
        const lineEl = body.querySelector('.v2-ls-line[data-idx="' + idx + '"]');
        if (lineEl) lineEl.classList.add('playing');
        const tagged = (line.tag ? '[' + line.tag + ']' : '') + (line.speaker ? line.speaker + ': ' : '') + line.text;
        speak(tagged, function() { if (sid === playSession) clearHi(); });
      });
    });
  }

  function cleanForSpeech(text) {
    if (typeof text !== 'string') return '';
    let cleaned = text;

    // 0. Remove markdown code blocks and HTML code/script/style tags
    const tripleBacktick = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
    cleaned = cleaned.split(tripleBacktick).map(function(p, i) { return i % 2 === 0 ? p : ' '; }).join(' ');
    cleaned = cleaned.split('<code').map(function(p, i) { return i === 0 ? p : (p.indexOf('</code>') !== -1 ? p.substring(p.indexOf('</code>') + 7) : ''); }).join(' ');
    cleaned = cleaned.split('<sc' + 'ript').map(function(p, i) { return i === 0 ? p : (p.indexOf('</s' + 'cript>') !== -1 ? p.substring(p.indexOf('</s' + 'cript>') + 9) : ''); }).join(' ');
    cleaned = cleaned.split('<style').map(function(p, i) { return i === 0 ? p : (p.indexOf('</style>') !== -1 ? p.substring(p.indexOf('</style>') + 8) : ''); }).join(' ');

    // 1. Convert block HTML elements into spaces and strip tags safely
    cleaned = cleaned.replace(/<\\/(p|div|li|h[1-6]|tr|td|th|blockquote|section|header|footer)>/gi, ' ');
    cleaned = cleaned.replace(/<br\\s*[\\/]?>/gi, ' ');
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // 2. Decode ALL HTML entities
    const entityMap = {
      '&amp;': ' and ',
      '&#38;': ' and ',
      '&apos;': "'",
      '&#39;': "'",
      '&rsquo;': "'",
      '&lsquo;': "'",
      '&quot;': '"',
      '&#34;': '"',
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&nbsp;': ' ',
      '&#160;': ' ',
      '&lt;': ' ',
      '&gt;': ' ',
      '&mdash;': ' - ',
      '&ndash;': ' - '
    };
    cleaned = cleaned.replace(/&[a-zA-Z0-9#]+;/g, function(m) { return entityMap[m] || ' '; });

    // 3. Normalize apostrophes and contractions so "it's", "don't", "cat's", "students'" are preserved accurately
    cleaned = cleaned.replace(/[\\u2018\\u2019\\u201B\\u2032\\u0060\\u00B4\\u02BC]/g, "'");
    cleaned = cleaned.replace(/[\\u201C\\u201D\\u201E\\u2033]/g, '"');
    cleaned = cleaned.replace(/[\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015]/g, ' - ');

    // 4. Strip emojis while preserving alphanumeric text, punctuation, and plurals with trailing 's'
    cleaned = cleaned.replace(/[\\u{1F300}-\\u{1F9FF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F900}-\\u{1F9FF}\\u{1F1E6}-\\u{1F1FF}\\u{1F300}-\\u{1F5FF}\\u{2300}-\\u{23FF}]/gu, '');

    // 5. Remove markdown symbols
    cleaned = cleaned.replace(/[*_~#\\[\\]{}|^]/g, ' ');

    // 6. Clean whitespace
    return cleaned.split(/\\s+/).filter(Boolean).join(' ');
  }

  function parseAndPlay(text, callback, checkMuted = true, sourceElement = null) {
    if (!CONFIG.tts || !window.speechSynthesis || (checkMuted && state.catMuted)) {
      if (callback) callback();
      return;
    }
    
    window._ttsUtterances = [];
    speechSynthesis.cancel();
    startTTSKeepAlive();

    const catEl = document.getElementById('cat-mascot');
    if (catEl) catEl.classList.add('is-speaking');
    if (sourceElement && sourceElement.classList) {
      sourceElement.classList.add('cat-reading-active');
    }

    const regex = /(?:\\[\\s*(male\\s*[1-4]|female\\s*[1-4])\\s*\\]|\\b(male\\s*[1-4]|female\\s*[1-4])\\s*:)/gi;
    let match;
    let segments = [];
    let lastIndex = 0;
    let currentTag = null;
    
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const segText = text.substring(lastIndex, match.index).trim();
        if (segText) segments.push({ tag: currentTag, text: segText });
      }
      currentTag = (match[1] || match[2]).toLowerCase().replace(/\\s+/g, '');
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      const segText = text.substring(lastIndex).trim();
      if (segText) segments.push({ tag: currentTag, text: segText });
    }
    
    if (segments.length === 0) {
      if (catEl) catEl.classList.remove('is-speaking');
      if (sourceElement && sourceElement.classList) sourceElement.classList.remove('cat-reading-active');
      stopTTSKeepAlive();
      if (callback) callback();
      return;
    }

    function cleanupSpeech() {
      if (catEl) catEl.classList.remove('is-speaking');
      if (sourceElement && sourceElement.classList) sourceElement.classList.remove('cat-reading-active');
      stopTTSKeepAlive();
      window._ttsUtterances = [];
    }

    function playNext(index) {
      if (index >= segments.length) {
        cleanupSpeech();
        if (callback) callback();
        return;
      }
      
      const seg = segments[index];
      const cleanText = cleanForSpeech(seg.text);
      if (!cleanText) {
        playNext(index + 1);
        return;
      }
      
      const voices = speechSynthesis.getVoices();
      let voiceToUse = selectedVoice;
      /* The language the browser should read this line with, when the target
         language has no installed dedicated voice. */
      let langOverride = '';

      if (seg.tag) {
        const speakerName = seg.tag;
        const matchedChar = (window.APP_CHARACTERS || []).find(c => c.name.toLowerCase() === speakerName.toLowerCase() || c.code.toLowerCase() === speakerName.toLowerCase() || c.id === speakerName);
        if (TARGET_LANGUAGE_TAG) {
          /* Target language (L2) first: a learner of French hears [male1]/[female1]
             in French. When that voice is not installed the language tag lets the
             browser pick a voice for the language instead of a wrong English one,
             and an L2 with no voice at all never borrows the English map either. */
          const targetWanted = (TARGET_LANGUAGE_VOICES && TARGET_LANGUAGE_VOICES[seg.tag]) || '';
          const targetVoice = targetWanted ? voices.find(v => voiceMatchesId(v.name, targetWanted) || voiceMatchesId(v.voiceURI, targetWanted)) : null;
          if (targetVoice) voiceToUse = targetVoice;
          else { voiceToUse = null; langOverride = TARGET_LANGUAGE_TAG; }
        } else if (matchedChar && matchedChar.voice) {
          const specificVoice = voices.find(v => v.name.toLowerCase().includes(matchedChar.voice.toLowerCase()));
          if (specificVoice) voiceToUse = specificVoice;
        } else if (BROWSER_VOICE_MAP[seg.tag]) {
          const mappedName = BROWSER_VOICE_MAP[seg.tag].toLowerCase();
          const specificVoice = voices.find(v => v.name.toLowerCase().includes(mappedName)) || voices.find(v => v.name.toLowerCase().includes(seg.tag));
          if (specificVoice) voiceToUse = specificVoice;
        }
      }

      if (!voiceToUse && !langOverride) {
        voiceToUse = voices.find(v => v.lang && v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Microsoft') || v.name.includes('Alex'))) ||
                     voices.find(v => v.lang && v.lang.startsWith('en')) ||
                     voices[0];
      }

      // Break into manageable sentence chunks to guarantee no truncation
      const sentenceChunks = cleanText.split(/(?<=[.!?])\\s+|[\\r\\n]+/).filter(function(s) { return s.trim().length > 0; });
      if (sentenceChunks.length === 0) {
        playNext(index + 1);
        return;
      }

      let chunkIdx = 0;
      function speakChunk() {
        if (state.catMuted) {
          cleanupSpeech();
          if (callback) callback();
          return;
        }
        if (chunkIdx >= sentenceChunks.length) {
          playNext(index + 1);
          return;
        }
        const chunk = sentenceChunks[chunkIdx++].trim();
        if (!chunk) {
          speakChunk();
          return;
        }
        
        const utter = new SpeechSynthesisUtterance(chunk);
        if (voiceToUse) {
          utter.voice = voiceToUse;
          utter.lang = voiceToUse.lang || 'en-US';
        } else if (langOverride) {
          utter.lang = langOverride;
        } else {
          utter.lang = 'en-US';
        }
        utter.rate = speechRate || 1.0;
        utter.pitch = 1.0;
        
        utter.onstart = function() {
          if (catEl) catEl.classList.add('is-speaking');
        };
        utter.onend = function() {
          if (state.catMuted) {
            cleanupSpeech();
            return;
          }
          setTimeout(speakChunk, 90);
        };
        utter.onerror = function() {
          setTimeout(speakChunk, 90);
        };

        window._ttsUtterances.push(utter);
        speechSynthesis.speak(utter);
      }

      speakChunk();
    }

    playNext(0);
  }

  function speak(text, callback, sourceEl) {
    if (state.catMuted) {
      if (callback) callback();
      return;
    }
    parseAndPlay(text, callback, true, sourceEl);
  }

  function speakWord(text, sourceEl) {
    // Vocabulary-card 🔊, question 🔊 and other explicit audio buttons must work
    // even when the cat's own voice is muted.
    parseAndPlay(text, null, false, sourceEl);
  }

  // ─── Cat Mascot & Dynamic Companion ───
  const catEl = document.getElementById('cat-mascot');
  const catSpeech = document.getElementById('cat-speech');
  const catSpeechText = document.getElementById('cat-speech-text');
  let bubbleTimeout = null;

  function catSay(text, mood) {
    if (!catEl || !CONFIG.mascot || state.catMuted || catDismissed) return;
    if (bubbleTimeout) clearTimeout(bubbleTimeout);

    if (catSpeechText) catSpeechText.textContent = text;
    if (catSpeech) {
      catSpeech.classList.add('visible');
      positionCatBubble();
      bubbleTimeout = setTimeout(() => {
        catSpeech.classList.remove('visible');
      }, 5000);
    }
    speak(text);
  }

  // The quick-tools menu and the speech bubble float around the avatar (so they no
  // longer stretch the cat widget). Nudge each one sideways only when the cat sits
  // close enough to an edge that it would otherwise hang off the screen.
  function keepCatChildOnScreen(el) {
    if (!el) return;
    el.style.marginLeft = '';
    // Phones lay these out as fixed, full-width bars — nothing to clamp there.
    if (window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const pad = 8;
    let shift = 0;
    if (r.right > window.innerWidth - pad) shift = window.innerWidth - pad - r.right;
    if (r.left + shift < pad) shift = pad - r.left;
    if (shift !== 0) el.style.marginLeft = Math.round(shift) + 'px';
  }
  function positionCatDock() { keepCatChildOnScreen(document.getElementById('cat-companion-dock')); }
  function positionCatBubble() { keepCatChildOnScreen(document.getElementById('cat-speech')); }
  window.positionCatDock = positionCatDock;

  window.handleCatClick = function(event) {
    if (event) event.stopPropagation();
    // Clicking the cat toggles the quick tools dock (hidden by default).
    if (!catEl) return;
    const wasOpen = catEl.classList.contains('dock-open');
    catEl.classList.toggle('dock-open');
    if (!wasOpen) {
      positionCatDock();
      if (catSpeechText) catSpeechText.textContent = "Quick tools: 🔊 Read · 🎯 Hover-to-read · 🔇 Mute · ✕ Hide me";
      if (catSpeech) {
        catSpeech.classList.add('visible');
        positionCatBubble();
        if (bubbleTimeout) clearTimeout(bubbleTimeout);
        bubbleTimeout = setTimeout(() => catSpeech.classList.remove('visible'), 3500);
      }
      if (!state.catMuted) playAudioTone('meow');
    }
  };

  // Small helper so a control can still explain itself while the cat is muted
  // or dismissed, without relying on spoken feedback.
  function catNotice(text) {
    if (!catEl || catDismissed) return;
    if (catSpeechText) catSpeechText.textContent = text;
    if (catSpeech) {
      if (bubbleTimeout) clearTimeout(bubbleTimeout);
      catSpeech.classList.add('visible');
      positionCatBubble();
      bubbleTimeout = setTimeout(() => catSpeech.classList.remove('visible'), 3000);
    }
  }

  window.closeCatMascot = function(event) {
    if (event) {
      event.stopPropagation();
      if (event.preventDefault) event.preventDefault();
    }
    // Bury the whole widget: avatar, speech bubble AND the quick-tools dock.
    catDismissed = true;
    if (catEl) {
      catEl.classList.remove('dock-open', 'is-speaking');
      catEl.classList.add('cat-dismissed');
      catEl.style.display = 'none';
      catEl.style.visibility = 'hidden';
      catEl.style.pointerEvents = 'none';
    }
    const dock = document.getElementById('cat-companion-dock');
    if (dock) {
      dock.classList.remove('dock-open');
      dock.style.display = 'none';
    }
    // Cut any speech the cat is currently reading out.
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (typeof stopTTSKeepAlive === 'function') stopTTSKeepAlive();
    // Session-only: nothing about the dismissal is written to storage, and the
    // lesson audio keeps working (the cat is hidden, not muted).
    state.catHidden = false;
  };

  // ─── Draggable Cat Mascot (pointer-based: mouse + touch) ───
  (function initCatDrag() {
    const mascot = document.getElementById('cat-mascot');
    if (!mascot) return;
    let dragState = null;
    const dragThreshold = 6;
    // Keep the cat reachable and clear of the lesson text: 92px of bottom gutter
    // clears the fixed annotation toolbar, 8px keeps it off the other edges and
    // phones only ever let it snap to a side (never mid-content).
    const EDGE = 10;
    const BOTTOM_GUTTER = 92;
    function isSmallScreen() {
      return !!(window.matchMedia && window.matchMedia('(max-width: 1024px)').matches);
    }
    function placeCat(left, top) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = mascot.offsetWidth || 78;
      const h = mascot.offsetHeight || 78;
      const x = Math.min(Math.max(8, left), Math.max(8, vw - w - 8));
      const y = Math.min(Math.max(8, top), Math.max(8, vh - h - BOTTOM_GUTTER));
      // The important flag matters: the mobile stylesheet pins right/bottom with
      // !important, and leaving them set would stretch the cat across the screen
      // (both insets non-auto = the widget fills the gap between them).
      mascot.style.setProperty('left', x + 'px', 'important');
      mascot.style.setProperty('top', y + 'px', 'important');
      mascot.style.setProperty('right', 'auto', 'important');
      mascot.style.setProperty('bottom', 'auto', 'important');
    }
    // On a phone a drag always finishes in a corner of the safe area: below the
    // app bar and above the toolbars. The cat therefore never parks over the
    // middle of the lesson text.
    function snapCatToCorner() {
      const rect = mascot.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = rect.width || 62;
      const h = rect.height || 62;
      const minTop = Math.min(118, Math.round(vh * 0.3));
      const maxTop = Math.max(minTop, vh - h - BOTTOM_GUTTER);
      const goLeft = (rect.left + w / 2) < (vw / 2);
      const goTop = (rect.top + h / 2) < (vh / 2);
      placeCat(goLeft ? EDGE : vw - w - EDGE, goTop ? minTop : maxTop);
    }
    function resetCatPosition() {
      ['left', 'top', 'right', 'bottom'].forEach(function(prop) {
        mascot.style.removeProperty(prop);
      });
    }
    // A fresh mobile load parks the cat in its CSS corner instead of inheriting
    // any stale mid-screen position.
    if (isSmallScreen()) resetCatPosition();

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return; // left button only
      // Never start a drag from a control inside the widget. Pointer capture on the
      // mascot would otherwise retarget the click and silently swallow the press,
      // which is what stopped the mute / pause / hover / speed / close buttons.
      const pressed = e.target;
      if (pressed && pressed.closest && pressed.closest('button, a, input, select, textarea, label, .cat-companion-dock, .cat-close-btn')) {
        return;
      }
      const rect = mascot.getBoundingClientRect();
      dragState = {
        startX: e.clientX,
        startY: e.clientY,
        origLeft: rect.left,
        origTop: rect.top,
        moved: false,
      };
      mascot.classList.add('dragging');
      if (mascot.setPointerCapture) { try { mascot.setPointerCapture(e.pointerId); } catch (err) {} }
    }

    function onPointerMove(e) {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (!dragState.moved && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
        dragState.moved = true;
      }
      if (dragState.moved) {
        placeCat(dragState.origLeft + dx, dragState.origTop + dy);
        if (e.preventDefault) e.preventDefault();
      }
    }

    function onPointerUp(e) {
      if (!dragState) return;
      mascot.classList.remove('dragging');
      if (mascot.releasePointerCapture) { try { mascot.releasePointerCapture(e.pointerId); } catch (err) {} }
      // Phones: finish a drag by snapping into the nearest corner.
      if (dragState.moved && isSmallScreen()) snapCatToCorner();
      // A real drag must not trigger the click-to-read behaviour.
      if (dragState.moved) {
        const suppress = function(ev) {
          ev.stopPropagation();
          ev.stopImmediatePropagation();
          ev.preventDefault();
        };
        mascot.addEventListener('click', suppress, true);
        setTimeout(function() { mascot.removeEventListener('click', suppress, true); }, 50);
      }
      dragState = null;
    }

    mascot.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Rotation / window resize must never strand the cat over the content.
    window.addEventListener('resize', function() {
      if (mascot.classList.contains('dock-open')) positionCatDock();
      positionCatBubble();
      const rect = mascot.getBoundingClientRect();
      const offscreen = rect.left < 0 || rect.top < 0 ||
        rect.right > window.innerWidth + 1 || rect.bottom > window.innerHeight - 4;
      if (!offscreen) return;
      if (isSmallScreen()) snapCatToCorner(); else resetCatPosition();
    });
    window.addEventListener('orientationchange', function() {
      setTimeout(function() {
        if (isSmallScreen()) snapCatToCorner(); else resetCatPosition();
      }, 250);
    });
  })();

  window.readActiveSectionAloud = function(event) {
    if (event) event.stopPropagation();
    // Pressing an explicit "read to me" button is an intent to listen, so lift the
    // cat's mute instead of silently doing nothing (that looked like a broken button).
    if (state.catMuted) {
      state.catMuted = false;
      const mi = document.getElementById('cat-mute-icon');
      if (mi) mi.textContent = '🔊';
      const mb = document.getElementById('cat-mute-btn');
      if (mb) { mb.classList.remove('muted'); mb.title = 'Mute / Unmute Voice'; }
      if (catEl) catEl.classList.remove('is-muted');
      catNotice('Voice unmuted 🔊 — reading the section now.');
      saveState();
    }
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      if (catEl) catEl.classList.remove('is-speaking');
      return;
    }
    const activeTab = state.activeTab || 'prepare';
    const tabEl = document.getElementById('tab-' + activeTab);
    if (!tabEl) return;
    
    // Find text elements to read
    const readableEls = Array.from(tabEl.querySelectorAll('.activity-card, .flashcard-card, .produce-activity-slide:not([style*="none"]), .content-section, p, h2, h3'));
    const visibleEl = readableEls.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= (window.innerHeight || 800) && el.textContent.trim().length > 10;
    }) || tabEl;

    const cleanText = cleanForSpeech(visibleEl.innerText || visibleEl.textContent);
    if (cleanText) {
      catSay(cleanText.substring(0, 160) + (cleanText.length > 160 ? '...' : ''));
      // An explicit button press always plays the audio: muting only silences the
      // cat's spontaneous chatter, never a control the user deliberately clicked.
      parseAndPlay(cleanText, null, false, visibleEl);
    } else {
      catNotice('Nothing readable on screen yet — open a section first.');
      catSay("Click any text, vocabulary card, or question to hear it spoken!", '😺');
    }
  };

  window.toggleSpeechPause = function(event) {
    if (event) event.stopPropagation();
    if (!window.speechSynthesis) return;
    const pauseIcon = document.getElementById('cat-pause-icon');
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      if (pauseIcon) pauseIcon.textContent = '⏸️';
      catNotice("Resumed speech ▶️");
    } else if (speechSynthesis.speaking) {
      speechSynthesis.pause();
      // Some browsers refuse to pause mid-utterance, so report what really happened.
      const didPause = !!speechSynthesis.paused;
      if (pauseIcon) pauseIcon.textContent = didPause ? '▶️' : '⏸️';
      catNotice(didPause
        ? 'Paused speech ⏸️ — click again to resume.'
        : 'This browser cannot pause mid-sentence — press 🔊 Read Section to restart.');
    } else {
      catNotice("Nothing is reading right now — tap 🔊 Read Section first.");
    }
  };

  window.toggleCatMute = function(event) {
    if (event) event.stopPropagation();
    state.catMuted = !state.catMuted;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (catEl) catEl.classList.remove('is-speaking');
    
    const muteIcon = document.getElementById('cat-mute-icon');
    if (muteIcon) muteIcon.textContent = state.catMuted ? '🔇' : '🔊';
    const muteBtn = document.getElementById('cat-mute-btn');
    if (muteBtn) {
      muteBtn.classList.toggle('muted', state.catMuted);
      muteBtn.title = state.catMuted ? 'Voice muted — click to unmute' : 'Mute / Unmute Voice';
    }
    const catElNow = document.getElementById('cat-mascot');
    if (catElNow) catElNow.classList.toggle('is-muted', state.catMuted);

    catNotice(state.catMuted ? 'Voice Muted 🔇' : 'Voice Active 🔊 Ready to read!');
    saveState();
  };

  window.cycleSpeechSpeed = function(event) {
    if (event) event.stopPropagation();
    if (speechRate === 1.0) speechRate = 1.2;
    else if (speechRate === 1.2) speechRate = 0.8;
    else speechRate = 1.0;

    const label = document.getElementById('cat-speed-label');
    if (label) label.textContent = speechRate.toFixed(1) + 'x';
    catNotice("Speech speed set to " + speechRate.toFixed(1) + "x");
    catSay("Speech speed set to " + speechRate + "x", '😸');
  };

  window.toggleHoverReadMode = function(event) {
    if (event) event.stopPropagation();
    hoverReadActive = !hoverReadActive;
    const badge = document.getElementById('cat-hover-badge');
    if (badge) {
      badge.textContent = hoverReadActive ? 'ON' : 'OFF';
      badge.classList.toggle('active', hoverReadActive);
    }
    const hoverBtn = document.getElementById('cat-hover-btn');
    if (hoverBtn) hoverBtn.title = hoverReadActive
      ? 'Hover-to-Read is ON — point at any sentence to hear it (click to turn off)'
      : 'Hover-to-Read is OFF — click to turn it on';
    if (hoverReadActive) {
      catNotice('Hover-to-read ON — point your cursor at any sentence.');
      catSay("Hover-to-read activated! Point your cursor at any sentence to hear it.", '😸');
    } else {
      if (window.speechSynthesis && speechSynthesis.speaking) speechSynthesis.cancel();
      catNotice('Hover-to-read turned off.');
      catSay("Hover-to-read turned off.", '😺');
    }
  };

  // Hover-to-read is handled by the single body listener installed in init(),
  // which respects hoverReadActive / mute / dismissal. Registering extra
  // listeners here used to cause the same sentence to be spoken twice.

  window.trackFeedback = function(isCorrect, customText, actId, details) {
    if (isCorrect) {
      state.consecutiveIncorrect = 0;
      state.consecutiveCorrect = (state.consecutiveCorrect || 0) + 1;
      playAudioTone('point');
      
      if (state.consecutiveCorrect > 0 && state.consecutiveCorrect % 3 === 0) {
        const happyComments = ["You are unstoppable! 🌟", "Three in a row! 🎯", "Perfect streak! 🤩", "You're on fire! 🔥", "Amazing job! 🚀"];
        showLargeFeedbackModal(true, happyComments[Math.floor(Math.random() * happyComments.length)]);
      } else {
        if (customText && !state.catMuted) catSay(customText, '😸');
      }
    } else {
      state.consecutiveCorrect = 0;
      state.consecutiveIncorrect = (state.consecutiveIncorrect || 0) + 1;
      playAudioTone('penalty');
      
      state.incorrectAnswers = state.incorrectAnswers || [];
      state.incorrectAnswers.push({
        time: new Date().toISOString(),
        activityId: actId || null,
        details: customText || details || 'Incorrect answer',
      });

      if (state.consecutiveIncorrect > 0 && state.consecutiveIncorrect % 3 === 0) {
        const sadComments = ["Don't give up! 💪", "Take a deep breath! 🌬️", "Mistakes help you learn! 📚", "You can do this! ✨", "Let's try again! 🔄"];
        showLargeFeedbackModal(false, sadComments[Math.floor(Math.random() * sadComments.length)]);
      } else {
        if (!state.catMuted) catSay(customText || getCatPhrase('incorrect'), '😿');
      }
    }
    saveState();
  };

  window.showLargeFeedbackModal = function(isCorrect, customText) {
    const modal = document.getElementById('large-cat-modal');
    const emojiEl = document.getElementById('large-cat-emoji');
    const textEl = document.getElementById('large-cat-text');
    if (!modal) return;
    
    const correctEmojis = ['😺', '😸', '😹', '😻', '😽'];
    const incorrectEmojis = ['😾', '😿', '🙀', '😼'];
    
    const emoji = isCorrect 
      ? correctEmojis[Math.floor(Math.random() * correctEmojis.length)]
      : incorrectEmojis[Math.floor(Math.random() * incorrectEmojis.length)];
        
    const text = customText || (isCorrect ? getCatPhrase('correct') : getCatPhrase('incorrect'));
    
    if (emojiEl) emojiEl.textContent = emoji;
    if (textEl) textEl.textContent = text;
    
    modal.classList.remove('hidden');
    if (!state.catMuted) {
      speak(text);
    }
    
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 3000);
  };

  // ─── Tab Switching ───
  window.switchTab = function(tab) {
    if (window.speechSynthesis) speechSynthesis.cancel();
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
    state.activeTab = tab;
    // Show/hide cat
    if (catEl) catEl.style.display = (tab === 'prepare' && CONFIG.mascot) ? '' : 'none';
    // Mobile shell: leaving the tab closes its slide-in sheet.
    closeMobilePanels();
    saveState();
    if (tab === 'produce') { currentProduceIdx = 0; showProduceSlide(0); }
  };

  // ─── Dedicated mobile shell (drawers + support sheet) ───
  const MOBILE_SHELL_QUERY = '(max-width: 1024px)';
  function isMobileShell() {
    return !!(window.matchMedia && window.matchMedia(MOBILE_SHELL_QUERY).matches);
  }
  function setMobilePanel(open, which) {
    const body = document.body;
    const toolsOpen = which === 'tools' ? open : body.classList.contains('mobile-tools-open');
    const supportOpen = which === 'support' ? open : body.classList.contains('mobile-support-open');
    body.classList.toggle('mobile-tools-open', toolsOpen);
    body.classList.toggle('mobile-support-open', supportOpen);
    const btn = document.getElementById('mobile-tools-btn');
    if (btn) btn.setAttribute('aria-expanded', toolsOpen ? 'true' : 'false');
    const supportBtn = document.getElementById('mobile-support-btn');
    if (supportBtn) supportBtn.setAttribute('aria-expanded', supportOpen ? 'true' : 'false');
    // Lock the page behind an open sheet (the scroll offset is kept).
    document.documentElement.style.overflowY = (toolsOpen || supportOpen) ? 'hidden' : '';
  }
  function closeMobilePanels() { setMobilePanel(false, 'tools'); setMobilePanel(false, 'support'); }
  window.closeMobilePanels = closeMobilePanels;
  window.toggleMobileTools = function(force) {
    if (!isMobileShell()) return;
    const open = typeof force === 'boolean' ? force : !document.body.classList.contains('mobile-tools-open');
    setMobilePanel(open, 'tools');
    if (open) setMobilePanel(false, 'support');
  };
  window.toggleMobileSupport = function(force) {
    if (!isMobileShell()) return;
    const open = typeof force === 'boolean' ? force : !document.body.classList.contains('mobile-support-open');
    if (open) {
      // Support only exists in Produce mode — switch first, then slide the sheet
      // in (switchTab itself closes any open sheet).
      setMobilePanel(false, 'tools');
      if (state.activeTab !== 'produce') switchTab('produce');
      setTimeout(function() { setMobilePanel(true, 'support'); }, 40);
      return;
    }
    setMobilePanel(false, 'support');
  };
  // Never leave a sheet open after rotating back to the desktop layout.
  function keepMobileShellInSync() {
    if (!isMobileShell()) closeMobilePanels();
  }
  window.addEventListener('resize', keepMobileShellInSync);
  window.addEventListener('orientationchange', keepMobileShellInSync);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobilePanels();
  });
  // Swipe a mobile sheet away (right for the support sheet, left for the drawer).
  (function initMobileSheetSwipe() {
    let startX = 0, startY = 0, mode = null;
    document.addEventListener('touchstart', function(e) {
      const t = e.touches && e.touches[0];
      if (!t) return;
      const body = document.body;
      if (body.classList.contains('mobile-support-open')) mode = 'support';
      else if (body.classList.contains('mobile-tools-open')) mode = 'tools';
      else { mode = null; return; }
      startX = t.clientX; startY = t.clientY;
    }, { passive: true });
    document.addEventListener('touchend', function(e) {
      if (!mode) return;
      const swipedFrom = mode;
      mode = null;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dy > 70 || Math.abs(dx) < 70) return;
      if (swipedFrom === 'support' && dx > 0) window.toggleMobileSupport(false);
      if (swipedFrom === 'tools' && dx < 0) window.toggleMobileTools(false);
    }, { passive: true });
  })();

  // ─── Produce mode slides (previous / next navigation between activities) ───
  let currentProduceIdx = 0;
  const totalProduceSlides = document.querySelectorAll('#produce-activity-container .produce-activity-slide').length;
  function showProduceSlide(idx) {
    const slides = document.querySelectorAll('#produce-activity-container .produce-activity-slide');
    const total = slides.length;
    if (total === 0) return;
    currentProduceIdx = Math.max(0, Math.min(total - 1, idx));
    slides.forEach(function(s, i) {
      s.style.display = (i === currentProduceIdx) ? '' : 'none';
    });
    const prog = document.getElementById('produce-progress');
    if (prog) prog.textContent = 'Activity ' + (currentProduceIdx + 1) + ' of ' + total;
    // Initialise the visible activity's interactive card on first show.
    const card = slides[currentProduceIdx] && slides[currentProduceIdx].querySelector('.activity-card');
    if (card && !card.dataset.produceInit) {
      card.dataset.produceInit = 'true';
      if (typeof initActivity === 'function') { try { initActivity(card); } catch (e) {} }
    }
  }
  window.produceNav = function(dir) { showProduceSlide(currentProduceIdx + dir); };

  // ─── Section Toggle ───
  window.toggleSection = function(id) {
    const section = document.getElementById(id);
    const body = document.getElementById('body-' + id);
    if (!section || !body) return;
    const isOpen = section.classList.contains('open');
    section.classList.toggle('open');
    body.classList.toggle('collapsed');
    // Initialize activities on first open
    if (!isOpen && !body.dataset.initialized) {
      body.dataset.initialized = 'true';
      body.querySelectorAll('.activity-card').forEach(card => initActivity(card));
      // Cat introduction
      if (CONFIG.mascot && state.activeTab === 'prepare') {
        catSay(getCatPhrase('sectionIntro'), '😺');
      }
    }
  };

  // ─── Search ───
  window.toggleSearch = function() {
    document.getElementById('search-bar').classList.toggle('hidden');
    const input = document.getElementById('search-input');
    if (input) input.focus();
  };

  window.doSearch = function(query) {
    // Remove old highlights
    document.querySelectorAll('mark.search-hl').forEach(m => {
      m.replaceWith(m.textContent);
    });
    if (!query || query.length < 2) return;
    const re = new RegExp('(' + query.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi');
    // Search in activity titles
    document.querySelectorAll('.activity-title, .section-title').forEach(el => {
      if (el.innerHTML.match(re)) {
        el.innerHTML = el.textContent.replace(re, '<mark class="search-hl">$1</mark>');
        // Auto-expand parent section
        const section = el.closest('.section-accordion');
        if (section && !section.classList.contains('open')) {
          section.classList.add('open');
          const body = document.getElementById('body-' + section.id);
          if (body) body.classList.remove('collapsed');
        }
      }
    });
  };

  window.toggleFilter = function(btn, filter) {
    document.querySelectorAll('#filter-chips .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    // Filter logic – show/hide based on activity types
    const typeMap = {
      vocabulary: ['flashcard','vocab_table','spelling_bee','bingo','word_search','hangman','collocation_drag','word_formation','matching','memory_match'],
      grammar: ['gap_fill','gap_fill_dropdown','gap_fill_drag','error_correction','scramble','sentence_auction','pattern_drills','sequence_ordering'],
      listening: ['listening_mc','minimal_pairs','dictation','gap_transcript','phoneme_bingo'],
      reading: ['timed_reading','interactive_story','text_reconstruction','jigsaw_reading','annotation_reading','summary_writing'],
      speaking: ['movie_scene','speaking_jam','speaking_game','information_gap','debate','one_minute_challenge','shadowing','taboo','picture_description'],
      games: ['escape_room','jeopardy','typing_speed','crossword','word_chain','ai_trivia','would_you_rather']
    };
    document.querySelectorAll('.activity-card').forEach(card => {
      if (filter === 'all') { card.style.display = ''; return; }
      const types = typeMap[filter] || [];
      card.style.display = types.includes(card.dataset.type) ? '' : 'none';
    });
  };

  // ─── Panels ───
  // The Annotation Toolbar ships the FULL Micro Lesson V1 Bookmarks & Notes engine
  // (window.LessonApp) on this page — the simple native V2 panels were removed.
  // These shims delegate every entry point to that engine so the full panels always
  // open, with the old behaviour kept only as a defensive fallback.
  window.toggleNotes = function() {
    if (window.LessonApp && window.LessonApp.toggleNotes) { window.LessonApp.toggleNotes(); return; }
    const panel = document.getElementById('notes-panel');
    if (panel) panel.classList.toggle('hidden');
  };
  window.saveNotes = function() {
    if (window.LessonApp && window.LessonApp.saveNotes) { window.LessonApp.saveNotes(); return; }
    const ta = document.getElementById('notes-textarea');
    if (ta) { state.notes = ta.value; saveState(); }
  };
  window.exportNotes = function() {
    if (window.LessonApp && window.LessonApp.exportNotes) { window.LessonApp.exportNotes('txt'); return; }
    const blob = new Blob([state.notes || ''], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'lesson-notes.txt'; a.click();
  };

  window.toggleBookmarks = function() {
    if (window.LessonApp && window.LessonApp.showBookmarks) { window.LessonApp.showBookmarks(); return; }
    const panel = document.getElementById('bookmarks-panel');
    if (panel) panel.classList.toggle('hidden');
  };
  function renderBookmarks() {
    if (window.LessonApp && window.LessonApp.showBookmarks) { window.LessonApp.showBookmarks(); return; }
    const list = document.getElementById('bookmarks-list');
    if (!list) return;
    list.innerHTML = state.bookmarks.map(b =>
      '<div style="padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="document.getElementById(\\'' + b.id + '\\').scrollIntoView({behavior:\\'smooth\\'})"><span>' + b.title + '</span></div>'
    ).join('') || '<p style="color:var(--text2)">No bookmarks yet</p>';
  }
  window.toggleBookmark = function(id, title) {
    if (window.LessonApp && window.LessonApp.toggleBookmark) { window.LessonApp.toggleBookmark(id, title); }
    // Keep the V2 section/activity button visual state in sync with its own list.
    const idx = state.bookmarks.findIndex(b => b.id === id);
    if (idx >= 0) {
      state.bookmarks.splice(idx, 1);
    } else {
      state.bookmarks.push({ id, title });
    }
    saveState();
    // Update UI
    const btn = document.querySelector('#' + id + ' .bookmark-btn, [onclick*="' + id + '"].bookmark-btn');
    if (btn) btn.classList.toggle('active', idx < 0);
  };

  window.toggleAccessibility = function() {
    if (typeof toggleAccessibilityWidget === 'function') {
      toggleAccessibilityWidget();
    }
  };
  window.changeFontSize = function(delta) {
    const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-size-base'));
    document.documentElement.style.setProperty('--font-size-base', (current + delta) + 'px');
  };
  window.setTheme = function(theme) {
    document.body.className = document.body.className.replace(/theme-\\S+/g, '');
    if (theme !== 'default') document.body.classList.add('theme-' + theme);
  };
  window.toggleDyslexia = function(on) { document.body.classList.toggle('dyslexia-font', on); };
  window.toggleReducedMotion = function(on) { document.body.classList.toggle('reduced-motion', on); };
  window.toggleFocusMode = function(on) { document.body.classList.toggle('focus-mode', on); };

  // ─── Ctrl + Scroll Wheel Content Zoom ───
  // Keep fixed-position study widgets outside the zoomed content tree.
  let contentZoomLevel = 1.0;
  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        contentZoomLevel = Math.min(2.0, Math.round((contentZoomLevel + 0.05) * 100) / 100);
      } else if (e.deltaY > 0) {
        contentZoomLevel = Math.max(0.7, Math.round((contentZoomLevel - 0.05) * 100) / 100);
      }
      applyContentZoom();
    }
  }, { passive: false });

  function applyContentZoom() {
    const mains = document.querySelectorAll('.prepare-main, .produce-main, .practice-main');
    mains.forEach(main => {
      main.style.zoom = contentZoomLevel;
    });
    document.querySelectorAll('.cat-mascot, .panel-overlay, .header-action-btn, .fixed-widget-control').forEach(widget => {
      widget.style.zoom = '1';
      widget.style.transform = widget.classList.contains('cat-mascot') ? 'none' : '';
    });
    showZoomToast(Math.round(contentZoomLevel * 100) + '%');
  }

  function showZoomToast(text) {
    let toast = document.getElementById('zoom-toast-indicator');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'zoom-toast-indicator';
      toast.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.88); color:#ffffff; padding:6px 16px; border-radius:20px; font-size:0.85rem; font-weight:700; z-index:999999; pointer-events:none; transition:opacity 0.3s; opacity:0; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2);';
      document.body.appendChild(toast);
    }
    toast.textContent = '🔍 Content Zoom: ' + text;
    toast.style.opacity = '1';
    if (window.zoomToastTimeout) clearTimeout(window.zoomToastTimeout);
    window.zoomToastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, 1200);
  }

  // ─── Tutor Dashboard ───
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === '/') { e.preventDefault(); toggleAccessibility(); }
    // Tutor dashboard: type passcode
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      const code = prompt('Enter tutor passcode:');
      if (code === CONFIG.tutorPasscode) {
        document.getElementById('tutor-dashboard').classList.remove('hidden');
        updateTutorStats();
      }
    }
  });
  function updateTutorStats() {
    const stats = document.getElementById('tutor-stats');
    if (!stats) return;
    const completed = Object.keys(state.completedActivities).length;
    stats.innerHTML = '<p><strong>Completed:</strong> ' + completed + ' activities</p>' +
      '<p><strong>XP:</strong> ' + state.xp + '</p>' +
      '<p><strong>Level:</strong> ' + state.level + '</p>' +
      '<p><strong>Streak:</strong> ' + state.streak + '</p>';
  }
  window.broadcastAnnouncement = function() {
    const text = document.getElementById('tutor-announcement').value;
    const banner = document.getElementById('announcement-banner');
    if (text && banner) { banner.textContent = text; banner.classList.remove('hidden'); }
  };
  window.resetProgress = function() {
    if (confirm('Reset all learner progress?')) {
      state = defaultState();
      saveState();
      location.reload();
    }
  };
  window.closeTutorDashboard = function() {
    document.getElementById('tutor-dashboard').classList.add('hidden');
  };

  // ─── Reading Progress ───
  window.addEventListener('scroll', function() {
    const doc = document.documentElement;
    const scrolled = (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100;
    document.getElementById('reading-progress-bar').style.width = Math.min(100, scrolled) + '%';
  });

  // ─── Minimal Class Timer & Popover Controller ───
  let timerState = {
    mode: 'countdown', // 'countdown' | 'stopwatch'
    durationSec: 87,   // Default 01:27 (87s) as requested
    currentSec: 87,
    isRunning: false,
    timerInterval: null
  };

  function formatTimeMMSS(sec) {
    const s = Math.max(0, Math.floor(sec));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function updateTimerDisplays() {
    const formatted = formatTimeMMSS(timerState.currentSec);
    const navTimer = document.getElementById('session-timer');
    if (navTimer) navTimer.textContent = formatted;
    
    setAllDualText('sidebar-session-timer', formatted);

    const modalDisplay = document.getElementById('timer-modal-display');
    if (modalDisplay) modalDisplay.textContent = formatted;

    const produceTimer = document.getElementById('produce-session-timer');
    if (produceTimer) produceTimer.textContent = formatted;

    const modeBadge = document.getElementById('header-timer-mode-badge') || document.getElementById('timer-mode-badge');
    if (modeBadge) {
      modeBadge.textContent = timerState.mode === 'countdown' ? 'DOWN' : 'UP';
    }

    const startBtn = document.getElementById('timer-start-btn') || document.getElementById('timer-start-toggle-btn');
    if (startBtn) {
      startBtn.textContent = timerState.isRunning ? '⏸ Pause' : '▶ Start';
      startBtn.classList.toggle('primary', !timerState.isRunning);
    }
  }

  function tickTimerEngine() {
    if (!timerState.isRunning) return;

    if (timerState.mode === 'countdown') {
      if (timerState.currentSec > 0) {
        timerState.currentSec--;
        updateTimerDisplays();
        if (timerState.currentSec === 0) {
          timerState.isRunning = false;
          updateTimerDisplays();
          playAudioTone('alarm');
          const headerPill = document.getElementById('header-timer-widget');
          if (headerPill) headerPill.classList.add('timer-finished');
          if (typeof catSay === 'function') {
            catSay("⏰ Time is up! Outstanding effort on this lesson segment!", '😸');
          }
        }
      } else {
        timerState.isRunning = false;
        updateTimerDisplays();
      }
    } else {
      // Stopwatch
      timerState.currentSec++;
      updateTimerDisplays();
    }
  }

  // Start global tick
  if (window._classTimerInterval) clearInterval(window._classTimerInterval);
  window._classTimerInterval = setInterval(tickTimerEngine, 1000);

  window.toggleTimerDropdown = function(event) {
    if (event) event.stopPropagation();
    const popover = document.getElementById('timer-dropdown-popover');
    if (!popover) return;
    const isHidden = popover.classList.contains('hidden');
    popover.classList.toggle('hidden', !isHidden);
  };

  window.closeTimerDropdown = function(event) {
    if (event) event.stopPropagation();
    const popover = document.getElementById('timer-dropdown-popover');
    if (popover) popover.classList.add('hidden');
  };

  document.addEventListener('click', function(e) {
    const popover = document.getElementById('timer-dropdown-popover');
    const headerPill = document.getElementById('header-timer-widget');
    if (popover && !popover.classList.contains('hidden')) {
      if (!popover.contains(e.target) && (!headerPill || !headerPill.contains(e.target))) {
        popover.classList.add('hidden');
      }
    }
  });

  window.setTimerType = function(mode) {
    timerState.mode = mode;
    const tabDown = document.getElementById('timer-tab-down') || document.getElementById('timer-tab-countdown');
    const tabUp = document.getElementById('timer-tab-up') || document.getElementById('timer-tab-stopwatch');
    if (tabDown) tabDown.classList.toggle('active', mode === 'countdown');
    if (tabUp) tabUp.classList.toggle('active', mode === 'stopwatch');

    const presetsBox = document.getElementById('timer-countdown-presets');
    if (presetsBox) presetsBox.style.display = mode === 'countdown' ? 'grid' : 'none';

    const customRow = document.querySelector('.timer-custom-row');
    if (customRow) customRow.style.display = mode === 'countdown' ? 'flex' : 'none';

    if (mode === 'stopwatch') {
      timerState.currentSec = 0;
      timerState.isRunning = true;
    } else {
      timerState.currentSec = timerState.durationSec || 87;
      timerState.isRunning = false;
    }
    const headerPill = document.getElementById('header-timer-widget');
    if (headerPill) headerPill.classList.remove('timer-finished');
    updateTimerDisplays();
  };

  window.toggleTimerRunning = function() {
    if (!timerState.isRunning) {
      if (timerState.mode === 'countdown' && timerState.currentSec <= 0) {
        timerState.currentSec = timerState.durationSec || 87;
      }
      timerState.isRunning = true;
    } else {
      timerState.isRunning = false;
    }
    const headerPill = document.getElementById('header-timer-widget');
    if (headerPill) headerPill.classList.remove('timer-finished');
    updateTimerDisplays();
  };

  window.resetTimerState = function() {
    timerState.isRunning = false;
    timerState.currentSec = timerState.mode === 'countdown' ? (timerState.durationSec || 87) : 0;
    const headerPill = document.getElementById('header-timer-widget');
    if (headerPill) headerPill.classList.remove('timer-finished');
    updateTimerDisplays();
  };

  window.addTimerSeconds = function(sec) {
    timerState.currentSec += sec;
    if (timerState.mode === 'countdown') {
      timerState.durationSec = Math.max(timerState.durationSec, timerState.currentSec);
    }
    const headerPill = document.getElementById('header-timer-widget');
    if (headerPill) headerPill.classList.remove('timer-finished');
    updateTimerDisplays();
  };

  window.setTimerPreset = function(sec, chipEl) {
    document.querySelectorAll('.timer-preset-chip').forEach(c => c.classList.remove('active'));
    if (chipEl && typeof chipEl === 'object' && chipEl.classList) {
      chipEl.classList.add('active');
    }
    timerState.mode = 'countdown';
    timerState.durationSec = sec;
    timerState.currentSec = sec;
    timerState.isRunning = true;
    const tabDown = document.getElementById('timer-tab-down') || document.getElementById('timer-tab-countdown');
    const tabUp = document.getElementById('timer-tab-up') || document.getElementById('timer-tab-stopwatch');
    if (tabDown) tabDown.classList.add('active');
    if (tabUp) tabUp.classList.remove('active');
    const headerPill = document.getElementById('header-timer-widget');
    if (headerPill) headerPill.classList.remove('timer-finished');
    updateTimerDisplays();
  };

  window.applyCustomTimer = function() {
    const input = document.getElementById('timer-custom-input');
    if (!input || !input.value) return;
    const val = input.value.trim();
    let totalSec = 0;
    if (val.includes(':')) {
      const parts = val.split(':');
      totalSec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    } else {
      totalSec = (parseInt(val, 10) || 0) * 60;
    }
    if (totalSec > 0) {
      timerState.mode = 'countdown';
      timerState.durationSec = totalSec;
      timerState.currentSec = totalSec;
      timerState.isRunning = true;
      document.querySelectorAll('.timer-preset-chip').forEach(c => c.classList.remove('active'));
      const tabDown = document.getElementById('timer-tab-down') || document.getElementById('timer-tab-countdown');
      const tabUp = document.getElementById('timer-tab-up') || document.getElementById('timer-tab-stopwatch');
      if (tabDown) tabDown.classList.add('active');
      if (tabUp) tabUp.classList.remove('active');
      const headerPill = document.getElementById('header-timer-widget');
      if (headerPill) headerPill.classList.remove('timer-finished');
      updateTimerDisplays();
    }
  };

  // ─── Dynamic Dramatic Classroom Leaderboard Arena ───
  let teamScores = { A: 0, B: 0 };
  let teamNames = { A: 'Team A', B: 'Team B' };
  let teamScoreHistory = [];
  let arenaSFXEnabled = true;

  window.toggleArenaSoundFX = function() {
    arenaSFXEnabled = !arenaSFXEnabled;
    const label = document.getElementById('arena-sfx-label');
    if (label) label.textContent = arenaSFXEnabled ? '🔊 SFX: ON' : '🔇 SFX: OFF';
  };

  function spawnFloatingScore(text, clientX, clientY, color) {
    const burst = document.createElement('div');
    burst.className = 'floating-point-burst';
    burst.textContent = text;
    burst.style.left = (clientX || (window.innerWidth / 2)) + 'px';
    burst.style.top = (clientY || (window.innerHeight / 2)) + 'px';
    burst.style.color = color || '#facc15';
    document.body.appendChild(burst);
    setTimeout(() => {
      if (burst.parentNode) burst.parentNode.removeChild(burst);
    }, 1000);
  }

  function updateLeaderboardVisuals() {
    // Nav scores
    const navA = document.getElementById('header-teamA-score');
    const navB = document.getElementById('header-teamB-score');
    if (navA) navA.textContent = teamScores.A;
    if (navB) navB.textContent = teamScores.B;

    // Arena scores
    const arenaA = document.getElementById('arena-score-a');
    const arenaB = document.getElementById('arena-score-b');
    if (arenaA) arenaA.textContent = teamScores.A;
    if (arenaB) arenaB.textContent = teamScores.B;

    // Tug-of-war power bar
    const total = (teamScores.A + teamScores.B) || 2;
    const aRatio = teamScores.A === 0 && teamScores.B === 0 ? 0.5 : (teamScores.A / total);
    const aPct = Math.max(10, Math.min(90, Math.round(aRatio * 100)));
    const bPct = 100 - aPct;

    const fillA = document.getElementById('power-bar-a') || document.getElementById('arena-power-fill-a');
    const fillB = document.getElementById('power-bar-b') || document.getElementById('arena-power-fill-b');
    const clash = document.getElementById('power-bar-clash') || document.getElementById('arena-power-clash');
    if (fillA) fillA.style.width = aPct + '%';
    if (fillB) fillB.style.width = bPct + '%';
    if (clash) clash.style.left = aPct + '%';

    const labelA = document.getElementById('power-label-a') || document.getElementById('arena-power-label-a');
    const labelB = document.getElementById('power-label-b') || document.getElementById('arena-power-label-b');
    if (labelA) labelA.textContent = escapeHTML(teamNames.A) + ': ' + aPct + '%';
    if (labelB) labelB.textContent = escapeHTML(teamNames.B) + ': ' + bPct + '%';

    // Leader banner
    const leaderText = document.getElementById('arena-leader-text');
    const banner = document.getElementById('arena-leader-banner');
    if (teamScores.A > teamScores.B) {
      const diff = teamScores.A - teamScores.B;
      const msg = escapeHTML(teamNames.A) + ' leads by +' + diff + ' point' + (diff > 1 ? 's' : '') + '! 🔥';
      if (leaderText) leaderText.textContent = msg;
      else if (banner) banner.innerHTML = '<span class="leader-trophy-icon">👑</span> <strong>' + msg + '</strong>';
    } else if (teamScores.B > teamScores.A) {
      const diff = teamScores.B - teamScores.A;
      const msg = escapeHTML(teamNames.B) + ' leads by +' + diff + ' point' + (diff > 1 ? 's' : '') + '! ⚡';
      if (leaderText) leaderText.textContent = msg;
      else if (banner) banner.innerHTML = '<span class="leader-trophy-icon">👑</span> <strong>' + msg + '</strong>';
    } else {
      const msg = "It's a Tie! Both teams are neck and neck! ⚔️";
      if (leaderText) leaderText.textContent = msg;
      else if (banner) banner.innerHTML = '<span class="leader-trophy-icon">⚔️</span> <strong>' + msg + '</strong>';
    }
  }

  function logTeamAction(team, delta) {
    const logItems = document.getElementById('arena-log-items');
    if (!logItems) return;
    
    // Remove empty placeholder
    const emptyEl = logItems.querySelector('.log-item-empty');
    if (emptyEl) emptyEl.remove();

    const sign = delta > 0 ? '+' + delta : String(delta);
    const color = team === 'A' ? '#f87171' : '#60a5fa';
    const row = document.createElement('div');
    row.className = 'log-item-row';
    row.innerHTML = '<span style="color:' + color + '; font-weight:800;">' + escapeHTML(teamNames[team]) + ' (' + sign + ' pts)</span>' +
                    '<span style="color:#94a3b8; font-size:0.75rem;">' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) + '</span>';
    logItems.prepend(row);

    // Keep log max 10
    while (logItems.children.length > 10) {
      logItems.removeChild(logItems.lastChild);
    }
  }

  window.teamPointChange = function(team, delta, event) {
    if (event) event.stopPropagation();
    const oldLeader = teamScores.A > teamScores.B ? 'A' : (teamScores.B > teamScores.A ? 'B' : 'TIE');
    
    teamScores[team] = Math.max(0, teamScores[team] + delta);
    teamScoreHistory.push({ team, delta, prevScore: teamScores[team] - delta });

    // Play tone if SFX enabled
    if (arenaSFXEnabled) {
      if (delta > 0) {
        playAudioTone('point');
      } else {
        playAudioTone('penalty');
      }
    }

    // Spawn floating particle
    const clickX = event && event.clientX ? event.clientX : window.innerWidth / 2;
    const clickY = event && event.clientY ? event.clientY : window.innerHeight / 2;
    const sign = delta > 0 ? '+' + delta + '!' : delta + '!';
    const color = team === 'A' ? '#ef4444' : '#3b82f6';
    spawnFloatingScore(sign, clickX, clickY, color);

    // Bump score animation in modal
    const scoreDigit = document.getElementById('arena-score-' + team.toLowerCase());
    if (scoreDigit) {
      scoreDigit.classList.remove('score-bump');
      void scoreDigit.offsetWidth; // Trigger reflow
      scoreDigit.classList.add('score-bump');
    }

    // Check for lead change fanfare
    const newLeader = teamScores.A > teamScores.B ? 'A' : (teamScores.B > teamScores.A ? 'B' : 'TIE');
    if (newLeader !== 'TIE' && newLeader !== oldLeader && delta > 0) {
      if (arenaSFXEnabled) playAudioTone('fanfare');
      if (typeof catSay === 'function' && Math.random() > 0.3) {
        catSay("🌟 " + teamNames[newLeader] + " takes the lead with " + teamScores[newLeader] + " points!", '😸');
      }
    }

    logTeamAction(team, delta);
    updateLeaderboardVisuals();
  };

  // Backwards compatibility for legacy teamPoint(team)
  window.teamPoint = function(team) {
    window.teamPointChange(team, 1);
  };

  window.openLeaderboardModal = function(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('dynamic-leaderboard-modal') || document.getElementById('leaderboard-arena-modal');
    if (modal) {
      modal.classList.remove('hidden');
      updateLeaderboardVisuals();
    }
  };

  window.closeLeaderboardModal = function(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('dynamic-leaderboard-modal') || document.getElementById('leaderboard-arena-modal');
    if (modal) modal.classList.add('hidden');
  };

  window.updateTeamName = function(team, name) {
    if (name && name.trim()) {
      teamNames[team] = name.trim();
      updateLeaderboardVisuals();
    }
  };

  window.undoLastTeamPoint = function() {
    if (teamScoreHistory.length === 0) return;
    const last = teamScoreHistory.pop();
    teamScores[last.team] = Math.max(0, teamScores[last.team] - last.delta);
    if (arenaSFXEnabled) playAudioTone('penalty');
    updateLeaderboardVisuals();

    const logItems = document.getElementById('arena-log-items');
    if (logItems && logItems.firstChild) {
      logItems.removeChild(logItems.firstChild);
    }
  };

  window.resetTeamScores = function() {
    if (confirm('Reset scores for both teams back to 0?')) {
      teamScores.A = 0;
      teamScores.B = 0;
      teamScoreHistory = [];
      updateLeaderboardVisuals();
      const logItems = document.getElementById('arena-log-items');
      if (logItems) {
        logItems.innerHTML = '<div class="log-item-empty">Scores reset to zero.</div>';
      }
    }
  };

  window.triggerArenaConfetti = function() {
    if (arenaSFXEnabled) playAudioTone('fanfare');
    const overlay = document.getElementById('celebration-overlay');
    if (!overlay) return;
    const emojis = ['🏆', '✨', '🎉', '🥇', '⭐', '🔥', '🌟', '💥'];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = Math.random() * 100 + 'vw';
      p.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      overlay.appendChild(p);
      setTimeout(() => p.remove(), 3500);
    }
  };

  // Close timer and modals on outside click
  document.addEventListener('click', function(e) {
    const timerPopover = document.getElementById('timer-dropdown-popover');
    if (timerPopover && !timerPopover.classList.contains('hidden')) {
      if (!timerPopover.contains(e.target) && !e.target.closest('#header-timer-widget')) {
        timerPopover.classList.add('hidden');
      }
    }
  });

  // Initial render of timer and scores
  updateTimerDisplays();
  updateLeaderboardVisuals();

  // ─── Gamification ───
  function awardXP(amount, actId, actEl) {
    if (!CONFIG.gamification) return;
    let multiplier = 1;
    // Streak multiplier
    multiplier += Math.floor(state.streak / 5) * 0.2;
    // Double XP power-up
    if (state.doubleXpActive) { multiplier *= 2; state.doubleXpActive = false; }
    const finalXP = Math.round(amount * multiplier);
    state.xp += finalXP;
    state.coins = Math.floor(state.xp / 5);
    // Show popup
    showXPPopup(finalXP, actEl);
    // Check level up
    checkLevelUp();
    updateSidebar();
    saveState();
  }

  function showXPPopup(xp, nearEl) {
    const popup = document.getElementById('xp-popup');
    if (!popup) return;
    popup.textContent = '+' + xp + ' XP';
    popup.classList.remove('hidden');
    if (nearEl) {
      const rect = nearEl.getBoundingClientRect();
      popup.style.left = rect.left + rect.width / 2 + 'px';
      popup.style.top = rect.top + 'px';
    } else {
      popup.style.left = '50%'; popup.style.top = '50%';
    }
    // Reset animation
    popup.style.animation = 'none';
    popup.offsetHeight;
    popup.style.animation = '';
    setTimeout(() => popup.classList.add('hidden'), 1500);
  }

  function checkLevelUp() {
    const thresholds = CONFIG.levelThresholds;
    let newLevel = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (state.xp >= thresholds[i]) newLevel = i + 1;
    }
    if (newLevel > state.level) {
      state.level = newLevel;
      showLevelUp(newLevel);
    }
  }

  function showLevelUp(level) {
    const overlay = document.getElementById('levelup-overlay');
    const text = document.getElementById('levelup-text');
    if (!overlay) return;
    if (text) text.textContent = 'You reached Level ' + level + '!';
    overlay.classList.remove('hidden');
    celebrate('burst');
    catSay('LEVEL UP! 🎉 You\\'re now Level ' + level + '! Amazing!', '😻');
    setTimeout(() => overlay.classList.add('hidden'), 3000);
  }

  function playEpicStreakSound(streak) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      if (streak === 10) {
        const freqs = [130.81, 164.81, 196.00, 261.63, 329.63, 392.00, 523.25];
        freqs.forEach((f, index) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = index % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, now);
          const start = now + index * 0.12;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.25, start + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, start + 1.5);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 1.6);
        });
        
        const oscSweep = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gainSweep = ctx.createGain();
        oscSweep.type = 'sawtooth';
        oscSweep.frequency.setValueAtTime(65.41, now);
        oscSweep.frequency.exponentialRampToValueAtTime(523.25, now + 1.2);
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(8, now);
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 1.2);
        gainSweep.gain.setValueAtTime(0.15, now);
        gainSweep.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        oscSweep.connect(filter);
        filter.connect(gainSweep);
        gainSweep.connect(ctx.destination);
        oscSweep.start(now);
        oscSweep.stop(now + 1.3);
      } else if (streak === 20) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 1.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.5);
        
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, now + 1.2);
        noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 2.5);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.setValueAtTime(0.3, now + 1.3);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 2.5);
      } else if (streak === 30) {
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.frequency.setValueAtTime(120, now);
        subOsc.frequency.linearRampToValueAtTime(40, now + 2.0);
        subGain.gain.setValueAtTime(0.35, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 2.1);
        
        const arpNotes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25, 783.99, 1046.50];
        arpNotes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now);
          const t = now + idx * 0.08;
          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(t + 0.6);
        });
        
        const fanfares = [523.25, 659.25, 783.99, 1046.50];
        fanfares.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now + 0.8 + idx * 0.15);
          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0.12, now + 0.8 + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1500, now);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 2.6);
        });
      } else {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.1);
          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0.2, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 1.0);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + idx * 0.1 + 1.1);
        });
      }
    } catch(e) {
      console.warn("Audio Context error:", e);
    }
  }

  function triggerEpicStreakCelebration(streakCount) {
    playEpicStreakSound(streakCount);

    const overlay = document.createElement('div');
    overlay.id = 'epic-streak-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.92); z-index:9999999; display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0; transition:opacity 0.6s ease-in-out; font-family:"Space Grotesk", "Inter", sans-serif; overflow:hidden; pointer-events:auto;';
    
    let subtitle = "Unstoppable Learning!";
    let title = "🔥 " + streakCount + "-ANSWER STREAK! 🔥";
    let colorTheme = "#10b981";
    let glowColor = "rgba(16,185,129,0.8)";
    let backgroundGradient = "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0.95) 100%)";

    if (streakCount === 10) {
      title = "🏆 GOLDEN 10-ANSWER STREAK! 🏆";
      subtitle = "Phenomenal Focus! You are a master learner!";
      colorTheme = "#f59e0b";
      glowColor = "rgba(245,158,11,0.9)";
      backgroundGradient = "radial-gradient(circle, rgba(245,158,11,0.2) 0%, rgba(0,0,0,0.96) 100%)";
    } else if (streakCount === 20) {
      title = "🛸 COSMIC 20-ANSWER STREAK! 🛸";
      subtitle = "Out of This World! Simply flawless accuracy!";
      colorTheme = "#a78bfa";
      glowColor = "rgba(167,139,250,0.9)";
      backgroundGradient = "radial-gradient(circle, rgba(167,139,250,0.25) 0%, rgba(0,0,0,0.97) 100%)";
    } else if (streakCount === 30) {
      title = "🔥 LEGENDARY 30-ANSWER STREAK! 🔥";
      subtitle = "A True Phoenix! Absolutely spectacular performance!";
      colorTheme = "#ef4444";
      glowColor = "rgba(239,68,68,1.0)";
      backgroundGradient = "radial-gradient(circle, rgba(239,68,68,0.3) 0%, rgba(0,0,0,0.98) 100%)";
    } else if (streakCount >= 40) {
      title = "⚡ HYPERNOVA " + streakCount + "-ANSWER STREAK! ⚡";
      subtitle = "Godlike Prowess! There is no stopping you!";
      colorTheme = "#38bdf8";
      glowColor = "rgba(56,189,248,1.0)";
      backgroundGradient = "radial-gradient(circle, rgba(56,189,248,0.3) 0%, rgba(0,0,0,0.98) 100%)";
    }

    overlay.style.background = backgroundGradient;

    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:white; opacity:0.8; z-index:2; pointer-events:none; transition:opacity 0.2s ease-out;';
    overlay.appendChild(flash);

    const container = document.createElement('div');
    container.style.cssText = 'text-align:center; display:flex; flex-direction:column; align-items:center; gap:20px; z-index:3; transform:scale(0.4); opacity:0; transition:all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
    
    const banner = document.createElement('h1');
    banner.style.cssText = 'color:' + colorTheme + '; font-size:4rem; font-weight:900; margin:0; text-transform:uppercase; letter-spacing:2px; text-shadow:0 0 30px ' + glowColor + ', 0 0 60px ' + glowColor + '; line-height:1.1; padding:0 20px;';
    banner.innerHTML = title;

    const sub = document.createElement('p');
    sub.style.cssText = 'color:#f8fafc; font-size:1.8rem; font-weight:600; margin:0; font-family:"Inter", sans-serif; opacity:0.9; text-shadow:0 2px 8px rgba(0,0,0,0.8);';
    sub.innerHTML = subtitle;

    const badgeIcon = document.createElement('div');
    badgeIcon.style.cssText = 'font-size:8rem; filter:drop-shadow(0 0 20px ' + colorTheme + '); margin-bottom:10px;';
    badgeIcon.innerHTML = streakCount === 10 ? '👑' : (streakCount === 20 ? '🔮' : (streakCount === 30 ? '🎖s' : '🔱'));

    container.appendChild(badgeIcon);
    container.appendChild(banner);
    container.appendChild(sub);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    if (!document.getElementById('epic-streak-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'epic-streak-styles';
      styleEl.innerHTML = '@keyframes sparkUp { from { transform: translateY(100vh) scale(0.5); opacity: 1; } to { transform: translateY(-10vh) scale(1.5); opacity: 0; } }';
      document.head.appendChild(styleEl);
    }

    for (let i = 0; i < 40; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = 'position:absolute; bottom:-100px; left:' + Math.random() * 100 + 'vw; width:' + (Math.random() * 12 + 6) + 'px; height:' + (Math.random() * 12 + 6) + 'px; border-radius:50%; background:' + colorTheme + '; box-shadow:0 0 15px ' + colorTheme + '; opacity:0; pointer-events:none;';
      const delay = Math.random() * 1.5;
      const duration = 1.5 + Math.random() * 2;
      particle.style.animation = 'sparkUp ' + duration + 's ease-out ' + delay + 's infinite';
      overlay.appendChild(particle);
    }

    if (typeof celebrate === 'function') {
      const emoji = streakCount === 10 ? '👑' : (streakCount === 20 ? '✨' : (streakCount === 30 ? '🔥' : '⚡'));
      setTimeout(() => { celebrate(emoji); }, 600);
    }

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      setTimeout(() => { flash.style.opacity = '0'; }, 50);
      setTimeout(() => {
        container.style.transform = 'scale(1)';
        container.style.opacity = '1';
      }, 300);
    });

    setTimeout(() => {
      overlay.style.opacity = '0';
      container.style.transform = 'scale(0.8)';
      setTimeout(() => { overlay.remove(); }, 600);
    }, 4200);
  }

  function incrementStreak() {
    state.streak++;
    state.wrongAnswers = 0; // Reset consecutive wrong answers
    
    // Only celebrate milestones that are multiples of 10
    if (state.streak % 10 === 0 && state.streak > 0) {
      triggerEpicStreakCelebration(state.streak);
      catSay('🔥 Epic ' + state.streak + '-streak! Amazing focus!', '😸');
    }
    
    saveState();
  }

  function resetStreak() {
    state.streak = 0;
    state.wrongAnswers = (state.wrongAnswers || 0) + 1;
    if (state.wrongAnswers >= 3) {
       const angryCats = ['😼', '🙀', '😿', '😾'];
       const angryComments = ['Are you kitten me?!', 'Cat-astrophe!', 'Hiss-terrible!', 'You\\'ve got to be fur real...', 'Purr-haps try again?'];
       const randomCat = angryCats[Math.floor(Math.random() * angryCats.length)];
       const randomComment = angryComments[Math.floor(Math.random() * angryComments.length)];
       showBigCat(randomCat, randomComment);
    }
    saveState();
  }

  function showBigCat(emoji, comment) {
     let catDiv = document.getElementById('big-cat-overlay');
     if(!catDiv) {
         catDiv = document.createElement('div');
         catDiv.id = 'big-cat-overlay';
         catDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;text-align:center;pointer-events:none;transition:opacity 0.5s;';
         document.body.appendChild(catDiv);
     }
     catDiv.innerHTML = '<div style="font-size:10rem; animation: popIn 0.5s;">' + emoji + '</div><div style="font-size:2rem; background:rgba(0,0,0,0.8); color:white; padding:10px; border-radius:10px; margin-top:20px;">' + comment + '</div>';
     catDiv.style.opacity = '1';
     setTimeout(() => { catDiv.style.opacity = '0'; }, 3000);
  }


  function updateSidebar() {
    // Update BOTH gamification sidebars (Prepare + Practice share the same markup).
    setAllDualText('xp-count', state.xp);
    setAllDualText('streak-count', state.streak);
    setAllDualText('coin-count', state.coins);
    setAllDualText('level-badge', 'Level ' + state.level);
    // XP Ring
    const thresholds = CONFIG.levelThresholds;
    const currentThreshold = thresholds[state.level - 1] || 0;
    const nextThreshold = thresholds[state.level] || (currentThreshold + 100);
    const progress = (state.xp - currentThreshold) / (nextThreshold - currentThreshold);
    setAllDual('ring-fill', function(ringFill) {
      const circumference = 339.292;
      ringFill.style.strokeDashoffset = circumference * (1 - Math.min(1, progress));
    });
    // Level progress bar
    setAllDual('level-progress-fill', function(progFill) {
      progFill.style.width = Math.min(100, progress * 100) + '%';
    });
    setAllDualText('level-progress-label', (state.xp - currentThreshold) + ' / ' + (nextThreshold - currentThreshold) + ' XP');
    // Badges
    checkBadges();
    renderBadges();
    // Radar chart
    drawRadar();
    // Practice progress
    updatePracticeProgress();
  }

  // ─── Badges ───
  const BADGES = [
    { id: 'first_correct', emoji: '⭐', label: 'First Correct', desc: 'Get your first answer right', check: () => Object.keys(state.completedActivities).length >= 1 },
    { id: 'streak_3', emoji: '🔥', label: 'On Fire', desc: 'Get a streak of 3', check: () => state.streak >= 3 },
    { id: 'streak_10', emoji: '💥', label: 'Unstoppable', desc: 'Get a streak of 10', check: () => state.streak >= 10 },
    { id: 'perfect_5', emoji: '💎', label: 'Diamond', desc: 'Complete 5 activities perfectly', check: () => Object.values(state.completedActivities).filter(v => v.perfect).length >= 5 },
    { id: 'vocab_master', emoji: '📚', label: 'Vocab Master', desc: 'Complete 5 vocabulary activities', check: () => countByCategory('vocabulary') >= 5 },
    { id: 'grammar_guru', emoji: '🎓', label: 'Grammar Guru', desc: 'Complete 5 grammar activities', check: () => countByCategory('grammar') >= 5 },
    { id: 'listener', emoji: '🎧', label: 'Sharp Ears', desc: 'Complete 3 listening activities', check: () => countByCategory('listening') >= 3 },
    { id: 'level_3', emoji: '🏅', label: 'Rising Star', desc: 'Reach Level 3', check: () => state.level >= 3 },
    { id: 'level_5', emoji: '🏆', label: 'Champion', desc: 'Reach Level 5', check: () => state.level >= 5 },
    { id: 'night_owl', emoji: '🦉', label: 'Night Owl', desc: 'Study after 10 PM', check: () => new Date().getHours() >= 22 },
    { id: 'early_bird', emoji: '🐦', label: 'Early Bird', desc: 'Study before 7 AM', check: () => new Date().getHours() < 7 },
    { id: 'coin_collector', emoji: '💰', label: 'Rich!', desc: 'Earn 100 coins', check: () => state.coins >= 100 },
  ];

  const vocabTypes = ['flashcard','vocab_table','spelling_bee','bingo','word_search','hangman','matching','memory_match','collocation_drag','word_formation'];
  const grammarTypes = ['gap_fill','gap_fill_dropdown','gap_fill_drag','error_correction','scramble','sentence_auction','pattern_drills','sequence_ordering'];
  const listeningTypes = ['listening_mc','minimal_pairs','dictation','gap_transcript','phoneme_bingo'];

  function countByCategory(cat) {
    const types = cat === 'vocabulary' ? vocabTypes : cat === 'grammar' ? grammarTypes : listeningTypes;
    return Object.entries(state.completedActivities).filter(([k,v]) => types.some(t => k.includes(t) || v.type && types.includes(v.type))).length;
  }

  function checkBadges() {
    BADGES.forEach(b => {
      if (!state.badges.includes(b.id) && b.check()) {
        state.badges.push(b.id);
        showBadgeToast(b);
      }
    });
    saveState();
  }

  function showBadgeToast(badge) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;right:20px;background:var(--bg2);border:2px solid var(--warning);border-radius:12px;padding:12px 20px;z-index:99990;font-size:1rem;box-shadow:0 4px 20px var(--shadow);animation:xp-float 3s ease-out forwards;';
    toast.innerHTML = badge.emoji + ' <strong>' + badge.label + '</strong> unlocked!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function renderBadges() {
    setAllDual('badge-row', function(row) {
      row.innerHTML = BADGES.map(b =>
        '<span class="badge-item ' + (state.badges.includes(b.id) ? 'earned' : '') + '" title="' + b.label + ': ' + b.desc + '">' + b.emoji + '</span>'
      ).join('');
    });
  }

  // ─── Radar Chart ───
  function drawRadar() {
    // Draw on BOTH gamification sidebars (Prepare + Practice).
    setAllDual('radar-chart', function(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, r = 80;
    ctx.clearRect(0, 0, w, h);
    const skills = ['Vocabulary', 'Grammar', 'Listening', 'Reading', 'Pronunciation'];
    const values = [state.skills.vocabulary, state.skills.grammar, state.skills.listening, state.skills.reading, state.skills.pronunciation];
    const maxVal = Math.max(10, ...values);
    // Draw grid
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.5;
    for (let level = 1; level <= 4; level++) {
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
        const x = cx + r * (level / 4) * Math.cos(angle);
        const y = cy + r * (level / 4) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Draw data
    ctx.fillStyle = 'rgba(67, 97, 238, 0.2)';
    ctx.strokeStyle = 'rgba(67, 97, 238, 0.8)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const idx = i % 5;
      const angle = (Math.PI * 2 * idx / 5) - Math.PI / 2;
      const val = values[idx] / maxVal;
      const x = cx + r * val * Math.cos(angle);
      const y = cy + r * val * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.fill(); ctx.stroke();
    // Labels
    ctx.fillStyle = '#555'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
      const x = cx + (r + 18) * Math.cos(angle);
      const y = cy + (r + 18) * Math.sin(angle);
      ctx.fillText(skills[i], x, y + 4);
    }
    });
  }

  // ─── Power-ups ───
  window.usePowerUp = function(type) {
    if (type === 'hint' && state.coins >= 10) {
      state.coins -= 10; state.hintActive = true;
      catSay('💡 Hint activated! The next tricky answer will show a clue.', '😼');
    } else if (type === 'doubleXp' && state.coins >= 25) {
      state.coins -= 25; state.doubleXpActive = true;
      catSay('✨ Double XP! Your next activity gives double points!', '😸');
    } else if (type === 'timeFreeze' && state.coins >= 30) {
      state.coins -= 30; state.timeFreezeActive = true;
      catSay('❄️ Time Freeze! Timers are paused for the next activity.', '😺');
    } else {
      catSay('Not enough coins! 😿 Keep studying to earn more.', '😿');
      return;
    }
    updateSidebar();
    saveState();
  };

  // ─── Celebrations ───
  function celebrate(type) {
    const overlay = document.getElementById('celebration-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = '';
    const emojis = ['🎉','⭐','🌟','💫','✨','🎊','🏆','💎','🔥','❤️'];
    const count = CONFIG.celebration === 'maximum' ? 40 : CONFIG.celebration === 'normal' ? 20 : 8;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'confetti-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 0.5 + 's';
      p.style.animationDuration = (1.5 + Math.random()) + 's';
      overlay.appendChild(p);
    }
    setTimeout(() => { overlay.classList.add('hidden'); overlay.innerHTML = ''; }, 2500);
    if (CONFIG.haptic && navigator.vibrate) navigator.vibrate(100);
  }

  function screenShake() {
    document.body.classList.add('screen-shake');
    setTimeout(() => document.body.classList.remove('screen-shake'), 300);
    if (CONFIG.haptic && navigator.vibrate) navigator.vibrate([50, 50, 50]);
  }

  // ─── Levenshtein Distance for fuzzy matching ───
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1] + (a[i-1]!==b[j-1]?1:0));
    return dp[m][n];
  }

  function fuzzyMatch(input, answer) {
    const a = input.trim().toLowerCase();
    const b = answer.trim().toLowerCase();
    if (a === b) return true;
    // Allow Levenshtein distance of 1 for words > 4 chars
    if (b.length > 4 && levenshtein(a, b) <= 1) return true;
    return false;
  }

  // ─── Activity Initialization ───
  function initActivity(card) {
    const type = card.dataset.type;
    const mode = card.dataset.mode;
    const cComment = card.dataset.catComment;
    if (cComment && cComment.trim() !== "undefined" && cComment.trim() !== "") {
        catSay(cComment, '😸');
    }
    let data;
    try { 
      data = JSON.parse(card.dataset.content); 
      if (typeof data === 'string') {
        const trimmed = data.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try { data = JSON.parse(trimmed); } catch(e) {}
        }
      }
    } catch(e) { 
      let raw = card.dataset.content || '';
      if (typeof raw === 'string' && raw.trim().startsWith("'") && raw.trim().endsWith("'")) {
          raw = raw.trim().slice(1, -1);
          try { data = JSON.parse(raw); } catch(err) { data = raw; }
      } else {
          data = raw;
      }
    }
    const body = card.querySelector('.activity-body') || card;
    const actId = card.id;

    // Check if already completed
    if (state.completedActivities[actId]) {
      const statusEl = document.getElementById('status-' + actId);
      if (statusEl) statusEl.textContent = '✅';
    }

    switch(type) {
      case 'flashcard': renderFlashcards(body, data, actId, mode); break;
      case 'vocab_table': renderVocabTable(body, data, actId); break;
      case 'gap_fill': renderGapFill(body, data, actId, mode); break;
      case 'gap_fill_dropdown': renderGapFillDropdown(body, data, actId, mode); break;
      case 'multiple_choice': renderMCQ(body, data, actId, mode); break;
      case 'true_false': renderTrueFalse(body, data, actId, mode); break;
      case 'matching': renderMatching(body, data, actId, mode); break;
      case 'memory_match': renderMemoryMatch(body, data, actId, mode); break;
      case 'scramble': renderScramble(body, data, actId, mode); break;
      case 'error_correction': renderErrorCorrection(body, data, actId, mode); break;
      case 'dictation': renderDictation(body, data, actId, mode); break;
      case 'hangman': renderHangman(body, data, actId, mode); break;
      case 'would_you_rather': renderWouldYouRather(body, data, actId); break;
      case 'typing_speed': renderTypingSpeed(body, data, actId, mode); break;
      case 'escape_room': renderEscapeRoom(body, data, actId, mode); break;
      case 'sequence_ordering': renderSequenceOrdering(body, data, actId, mode); break;
      case 'essay_writing': renderEssayWriting(body, data, actId, mode); break;
      case 'voice_recording': renderVoiceRecording(body, data, actId, mode); break;
      case 'concealed_text': renderConcealedText(body, data); break;
      case 'split_view': renderSplitView(body, data); break;
      case 'quote_block': renderQuoteBlock(body, data); break;
      case 'image_block': renderImageBlock(body, data); break;
      case 'video_block': renderVideoBlock(body, data); break;
      case 'guided_writing': renderGuidedWriting(body, data, actId); break;
      case 'can_do_statements': renderCanDo(body, data, actId); break;
      case 'reflective_journal': renderJournal(body, data, actId); break;
      case 'personal_dictionary': renderPersonalDict(body, data, actId); break;
      case 'spelling_bee': renderSpellingBee(body, data, actId, mode); break;
      case 'speaking_game': renderSpeakingGame(body, data, actId); break;
      case 'debate': renderDebate(body, data, actId); break;
      case 'taboo': renderTaboo(body, data, actId); break;
      case 'information_gap': renderInfoGap(body, data, actId); break;
      case 'one_minute_challenge': renderOneMinute(body, data, actId); break;
      case 'shadowing': renderShadowing(body, data, actId); break;
      case 'minimal_pairs': renderMinimalPairs(body, data, actId, mode); break;
      case 'listening_mc': renderListeningMC(body, data, actId, mode); break;
      case 'listening_script':
      case 'listen_script':
      case 'audio_script':
        renderListeningScript(body, data, actId); break;
      case 'contextual_mc': renderContextualMC(body, data, actId, mode); break;
      case 'timed_reading': renderTimedReading(body, data, actId, mode); break;
      case 'text_reconstruction': renderTextReconstruction(body, data, actId, mode); break;
      case 'grammar_reference':
      case 'grammar_explanation': renderGrammarRef(body, data); break;
      case 'word_formation': renderWordFormation(body, data, actId, mode); break;
      case 'pattern_drills': renderPatternDrills(body, data, actId, mode); break;
      case 'ai_trivia': renderMCQ(body, data, actId, mode); break; // same renderer
      case 'list': renderList(body, data); break;
      case 'questions': renderQuestions(body, data); break;
      case 'sorting': renderSorting(body, data, actId, mode); break;
      case 'paragraph_organizer': renderTextReconstruction(body, data, actId, mode); break; // similar
      case 'paragraph': 
        body.innerHTML = typeof data === 'string' ? data : (data.content || data.html || card.dataset.content || '');
        break;
      default:
        body.innerHTML = '<p style="color:var(--text2)">Activity type <strong>' + type + '</strong> – ' + (data.prompts ? data.prompts[0] : 'Content loaded.') + '</p>';
    }

    // Whole-card hover reading disabled to comply with user request:
    // "only read the part I hover over, not the whole section"
    /*
    let hoverTimeout;
    card.addEventListener('mouseenter', () => {
      hoverTimeout = setTimeout(() => {
        if (!state.catMuted) {
          const isCompleted = !!state.completedActivities[actId];
          const feedbackText = card.dataset.feedback && card.dataset.feedback !== 'undefined' ? card.dataset.feedback : '';
          const cmt = card.dataset.catComment && card.dataset.catComment !== 'undefined' ? card.dataset.catComment : '';
          
          let textToRead = "";
          
          if (isCompleted && (feedbackText || cmt)) {
             textToRead = feedbackText || cmt;
             textToRead = textToRead.replace(/<[^>]*>?/gm, ''); // strip HTML tags
          }
          
          if (!textToRead) {
            const titleEl = card.querySelector('.activity-title');
            const titleText = titleEl ? titleEl.textContent : '';
            const bodyEl = card.querySelector('.activity-body');
            let bodyText = "";
            if (bodyEl) {
                const clone = bodyEl.cloneNode(true);
                clone.querySelectorAll('button, input, select, textarea, .feedback-panel').forEach(b => b.remove());
                bodyText = clone.textContent || "";
            }
            textToRead = titleText + (bodyText ? ". " + bodyText.replace(/\\s+/g, ' ') : "");
          }
          if (textToRead && textToRead.trim()) {
            catSay(textToRead, '😺');
          }
        }
      }, 700); // 700ms smart delay
    });
    card.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
    });
    */
  }

  // ─── Activity Complete Handler ───
  function completeActivity(actId, mode, perfect, type) {
    state.completedActivities[actId] = { perfect: !!perfect, type: type || '', time: Date.now() };
    const statusEl = document.getElementById('status-' + actId);
    if (statusEl) statusEl.textContent = '✅';
    const retryEl = document.getElementById('retry-' + actId);
    if (retryEl) retryEl.classList.remove('hidden');
    // Show feedback
    const feedbackEl = document.getElementById('afeedback-' + actId);
    const card = document.getElementById(actId);
    if (feedbackEl && card) {
      feedbackEl.innerHTML = card.dataset.feedback || '';
      feedbackEl.classList.remove('hidden');
    }
    
    // Have cat read feedback automatically
    if (card && !state.catMuted) {
      const feedbackText = card.dataset.feedback || card.dataset.catComment || '';
      if (feedbackText && feedbackText.trim() !== 'undefined') {
         setTimeout(() => catSay(feedbackText.replace(/<[^>]*>?/gm, ''), '😺'), 500);
      }
    }
    // Update section progress
    if (card) {
      const sectionId = card.dataset.section;
      updateSectionProgress(sectionId);
    }
    // Award XP
    if (CONFIG.gamification) {
      const xpBase = CONFIG.xpValues[type] || 10;
      const xpAmount = perfect ? xpBase * 2 : xpBase;
      awardXP(xpAmount, actId, card);
      // Update skills
      if (vocabTypes.includes(type)) state.skills.vocabulary += 2;
      else if (grammarTypes.includes(type)) state.skills.grammar += 2;
      else if (listeningTypes.includes(type)) state.skills.listening += 2;
      else if (['timed_reading','text_reconstruction','jigsaw_reading'].includes(type)) state.skills.reading += 2;
      else if (['pronunciation_check','tongue_twister','shadowing','minimal_pairs'].includes(type)) state.skills.pronunciation += 2;
      drawRadar();
    }
    // Practice completion tracking
    if (mode === 'practice') {
      state.practiceCompleted[actId] = true;
      updatePracticeProgress();
    }
    if (perfect) celebrate('rain');
    trackFeedback(perfect);
    updateSidebar();
    saveState();
  }

  function updateSectionProgress(sectionId) {
    if (!sectionId) return;
    const section = document.getElementById(sectionId);
    if (!section) return;
    const cards = section.querySelectorAll('.activity-card');
    const completed = Array.from(cards).filter(c => state.completedActivities[c.id]).length;
    const total = cards.length;
    const fill = document.getElementById('prog-' + sectionId);
    const text = document.getElementById('prog-text-' + sectionId);
    if (fill) fill.style.width = (completed / total * 100) + '%';
    if (text) text.textContent = completed + '/' + total;
  }

  function updatePracticeProgress() {
    const allPractice = document.querySelectorAll('#tab-practice .activity-card');
    const completed = Array.from(allPractice).filter(c => state.practiceCompleted[c.id] || state.completedActivities[c.id]).length;
    const total = allPractice.length || 1;
    const pct = Math.round(completed / total * 100);
    const fill = document.getElementById('practice-progress-fill');
    const label = document.getElementById('practice-progress-label');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = pct + '% complete';
  }

  // ─── Retry ───
  window.retryActivity = function(actId) {
    const card = document.getElementById(actId);
    if (!card) return;
    const feedback = document.getElementById('afeedback-' + actId);
    if (feedback) { feedback.innerHTML = ''; feedback.classList.add('hidden'); }
    const body = card.querySelector('.activity-body');
    if (body) { body.innerHTML = ''; initActivity(card); }
    const retry = document.getElementById('retry-' + actId);
    if (retry) retry.classList.add('hidden');
    const status = document.getElementById('status-' + actId);
    if (status) status.textContent = '';
    delete state.completedActivities[actId];
    saveState();
  };

  // ═══════════════════════════════════════════════════════════════
  // ACTIVITY RENDERERS
  // ═══════════════════════════════════════════════════════════════

  // ─── Flashcards ───
  function renderFlashcards(body, data, actId, mode) {
    const cards = data.cards || [];
    if (!cards.length) return;
    
    // store flashcard state globally to allow navigation
    if (!window.fcState) window.fcState = {};
    window.fcState[actId] = { currentIdx: 0, known: new Set(), total: cards.length, cards: cards };
    
    const containerId = 'fc-container-' + actId;
    body.innerHTML = '<div id="' + containerId + '"></div>';
    renderSingleFlashcard(actId);
  }

  function renderSingleFlashcard(actId) {
      const state = window.fcState[actId];
      if (!state) return;
      const c = state.cards[state.currentIdx] || {};
      const container = document.getElementById('fc-container-' + actId);
      if (!container) return;

      const progress = Math.round((state.known.size / state.total) * 100);
      const term = c.front || c.word || 'Vocabulary Item';
      const def = c.back || c.definition || '';
      const ipa = c.ipa || '';
      const translation = c.translation || '';
      const imgUrl = c.image || c.imageUrl || c.bgImage || c.background || '';
      const ccq = c.ccq || c.ccqQuestion || c.speakingQuestion || ('How would you use "' + term + '" in a conversation today?');

      // 1. Process Dialogue on Front (Highlight target word/expression in real bold style)
      let rawDialogue = c.dialogue || c.exampleDialogue || c.dialogueExample || c.conversation || '';
      if (!rawDialogue) {
        if (c.example) {
          if (c.example.includes(':')) {
            rawDialogue = c.example;
          } else {
            rawDialogue = 'A: Could you give me an example with this?\\nB: ' + c.example;
          }
        } else {
          rawDialogue = 'A: Have you practiced this expression recently?\\nB: Yes, we need to focus on **' + term + '** in our communication!';
        }
      }

      function highlightTargetInDialogue(text, target) {
        if (!text) return '';
        var safeTarget = (target || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\\\$&');
        var html = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong style="font-weight:900; background:rgba(0,0,0,0.38); padding:3px 9px; border-radius:6px; color:#fef08a; text-decoration:underline;">$1</strong>');
        if (safeTarget && !html.includes('style="font-weight:900')) {
          var reg = new RegExp('(' + safeTarget + ')', 'gi');
          html = html.replace(reg, '<strong style="font-weight:900; background:rgba(0,0,0,0.38); padding:3px 9px; border-radius:6px; color:#fef08a; text-decoration:underline;">$1</strong>');
        }
        var lines = html.split(/\\\\n|\\r?\\n|<br\\s*\\/?>/i);
        return lines.map(function(line) {
          var trimmed = line.trim();
          if (!trimmed) return '';
          if (/^A\\s*:/i.test(trimmed)) {
            return '<div style="margin-bottom:8px; display:flex; align-items:flex-start; gap:8px;"><span style="display:inline-block; font-weight:800; color:#93c5fd; background:rgba(0,0,0,0.25); padding:2px 8px; border-radius:6px; flex-shrink:0;">👤 A:</span><span style="flex:1;">' + trimmed.replace(/^A\\s*:\\s*/i, '') + '</span></div>';
          } else if (/^B\\s*:/i.test(trimmed)) {
            return '<div style="margin-bottom:8px; display:flex; align-items:flex-start; gap:8px;"><span style="display:inline-block; font-weight:800; color:#86efac; background:rgba(0,0,0,0.25); padding:2px 8px; border-radius:6px; flex-shrink:0;">🗣️ B:</span><span style="flex:1;">' + trimmed.replace(/^B\\s*:\\s*/i, '') + '</span></div>';
          }
          return '<div style="margin-bottom:6px;">' + trimmed + '</div>';
        }).join('');
      }

      const formattedDialogue = highlightTargetInDialogue(rawDialogue, term);

      // 2. Process 3 Personalized Examples on Back
      let examplesList = [];
      if (Array.isArray(c.personalizedExamples) && c.personalizedExamples.length > 0) {
        examplesList = c.personalizedExamples.slice(0, 3);
      } else if (Array.isArray(c.examples) && c.examples.length > 0) {
        examplesList = c.examples.slice(0, 3);
      } else if (typeof c.example === 'string' && c.example.trim()) {
        const parts = c.example.split(/\\\\n|\\r?\\n|\\.\\s+(?=[A-Z])/).filter(Boolean);
        if (parts.length >= 3) {
          examplesList = parts.slice(0, 3);
        } else {
          examplesList.push(c.example);
          examplesList.push('In everyday conversations, using "' + term + '" helps express key points precisely.');
          examplesList.push('Professional communicators frequently apply "' + term + '" in meetings and discussions.');
        }
      } else {
        examplesList = [
          'Many learners use "' + term + '" to describe key experiences.',
          'In business and travel contexts, "' + term + '" is essential for natural communication.',
          'Try creating your own sentence using "' + term + '" today!'
        ];
      }

      function highlightTargetInExample(text, target) {
        var safeTarget = (target || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\\\$&');
        var html = esc(text);
        if (safeTarget) {
          var reg = new RegExp('(' + safeTarget + ')', 'gi');
          html = html.replace(reg, '<strong style="color:var(--primary); font-weight:800; text-decoration:underline;">$1</strong>');
        }
        return html;
      }

      let html = '<div style="max-width: 820px; margin: 0 auto; text-align: center;">';
      if (window.fcDisableImages === undefined) window.fcDisableImages = false;
      const showImage = !window.fcDisableImages && !!imgUrl;

      html += '<div style="margin-bottom:14px; font-size:1.25rem; font-weight:800; color:var(--text2); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
        '<div style="display:flex; align-items:center; gap:10px;">' +
          '<span>🃏 Flashcard Deck</span>' +
          '<button type="button" class="fc-toggle-img-btn" onclick="toggleFcImages(&quot;' + actId + '&quot;)" title="Toggle card background and reference images" style="font-size:0.82rem; padding:4px 12px; border-radius:20px; border:1.5px solid var(--border); background:' + (window.fcDisableImages ? 'rgba(239,68,68,0.12)' : 'var(--bg)') + '; color:' + (window.fcDisableImages ? '#ef4444' : 'var(--text)') + '; cursor:pointer; font-weight:700; display:inline-flex; align-items:center; gap:5px; transition:all 0.2s;">' +
            (window.fcDisableImages ? '🚫 Images: OFF' : '🖼️ Images: ON') +
          '</button>' +
        '</div>' +
        '<span>Mastery: ' + state.known.size + '/' + state.total + ' (' + progress + '%)</span>' +
        '</div>';

      html += '<div class="flashcard-container" style="justify-content: center; align-items: center; margin-bottom: 22px;">';
      html += '<div class="flashcard" onclick="this.classList.toggle(&quot;flipped&quot;)">' +
        '<div class="flashcard-inner">' +
        // Front
        '<div class="flashcard-front">' +
          '<div style="font-size: 0.95rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-bottom: 8px;">Target Word / Expression</div>' +
          '<div style="font-size: 3.2rem; font-weight: 900; line-height: 1.2; letter-spacing: -0.5px; text-shadow: 0 4px 14px rgba(0,0,0,0.4); margin-bottom: 6px;">' + esc(term) + '</div>' +
          (ipa ? '<div style="font-size: 1.35rem; opacity: 0.95; font-family: monospace; margin-bottom: 12px;">/' + esc(ipa) + '/</div>' : '') +
          '<div style="width: 100%; max-width: 700px; font-size: 1.4rem; line-height: 1.6; padding: 18px 22px; border-radius: 16px; background: rgba(0,0,0,0.32); border: 1.5px solid rgba(255,255,255,0.3); text-align: left; margin: 14px 0; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">' +
            '<div style="font-size: 1.05rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #fef08a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">💬 Example Dialogue:</div>' +
            formattedDialogue +
          '</div>' +
          '<div style="margin-top: 10px; font-size: 1.15rem; font-weight: 700; opacity: 0.9; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fas fa-sync-alt"></i> (Click card to flip for definition & CCQ)</div>' +
        '</div>' +
        // Back
        '<div class="flashcard-back">' +
          (showImage ? '<div class="fc-img-wrapper" style="width:100%; max-height:190px; border-radius:14px; overflow:hidden; margin-bottom:14px; border:2px solid var(--border); box-shadow:0 4px 14px rgba(0,0,0,0.1);"><img src="' + esc(imgUrl) + '" alt="' + esc(term) + '" style="width:100%; height:180px; object-fit:cover; display:block;" onerror="this.style.display=&quot;none&quot;; if(this.parentElement) this.parentElement.style.display=&quot;none&quot;;" /></div>' : '') +
          '<div style="font-size: 1.45rem; font-weight: 700; color: var(--text); margin-bottom: 10px; line-height: 1.5; text-align: left;"><span style="color: var(--primary); font-weight: 800;">📖 Definition:</span> ' + esc(def) + '</div>' +
          (translation ? '<div style="font-size: 1.35rem; font-weight: 600; color: #0284c7; margin-bottom: 12px; text-align: left;"><span style="font-weight: 800;">🌐 Translation:</span> <em style="color: #0369a1;">' + esc(translation) + '</em></div>' : '') +
          '<div style="text-align: left; margin-bottom: 12px; width: 100%; background: var(--bg); padding: 14px 18px; border-radius: 12px; border: 1px solid var(--border);">' +
            '<div style="font-size: 1.35rem; font-weight: 800; color: var(--text); margin-bottom: 8px;">✨ 3 Personalized Examples:</div>' +
            '<ul style="margin: 0; padding-left: 24px; font-size: 1.25rem; line-height: 1.6; color: var(--text); display: flex; flex-direction: column; gap: 8px;">' +
              examplesList.map(ex => '<li>' + highlightTargetInExample(ex, term) + '</li>').join('') +
            '</ul>' +
          '</div>' +
          '<div style="text-align: left; width: 100%; padding: 14px 18px; background: rgba(245, 158, 11, 0.12); border-left: 5px solid #f59e0b; border-radius: 10px; font-size: 1.3rem; font-weight: 700; color: var(--text);">' +
            '<span style="color: #d97706; font-weight: 800; display: block; margin-bottom: 4px;">🗣️ CCQ Speaking Question:</span> ' + esc(ccq) +
          '</div>' +
        '</div>' +
        '</div></div></div>';

      html += '<div class="flashcard-actions" style="display:flex; justify-content: center; gap: 16px; margin-top: 18px;">';
      html += '<button class="fc-btn" style="background:#fff3cd; color:#856404; font-size:1.25rem; padding:10px 26px;" onclick="fcStudyAgain(&quot;' + actId + '&quot;)">🔄 Study again</button>';
      html += '<button class="fc-btn" style="background:#d4edda; color:#155724; font-size:1.25rem; padding:10px 26px;" onclick="fcKnow(&quot;' + actId + '&quot;)">✅ I know it</button>';
      html += '</div>';

      html += '<div style="display:flex; justify-content: space-between; align-items:center; margin-top: 24px;">';
      html += '<button onclick="fcPrev(&quot;' + actId + '&quot;)" style="padding:10px 20px; border:1px solid var(--border); border-radius:10px; font-size:1.2rem; font-weight:bold; cursor:pointer; background:var(--bg2); color:var(--text);"' + (state.currentIdx === 0 ? ' disabled opacity="0.5"' : '') + '>⬅️ Prev Card</button>';
      html += '<span style="font-size:1.25rem; font-weight:800; color:var(--text);">Card ' + (state.currentIdx + 1) + ' of ' + state.total + '</span>';
      html += '<button onclick="fcNext(&quot;' + actId + '&quot;)" style="padding:10px 20px; border:1px solid var(--border); border-radius:10px; font-size:1.2rem; font-weight:bold; cursor:pointer; background:var(--bg2); color:var(--text);"' + (state.currentIdx === state.total - 1 ? ' disabled opacity="0.5"' : '') + '>Next Card ➡️</button>';
      html += '</div></div>';

      container.innerHTML = html;

      // TTS on hover
      container.querySelectorAll('.flashcard-front').forEach(f => {
          f.addEventListener('mouseenter', () => speakWord(term));
      });
  }

  window.toggleFcImages = function(actId) {
      window.fcDisableImages = !window.fcDisableImages;
      renderSingleFlashcard(actId);
  };

  window.fcNext = function(actId) {
      if (window.fcState[actId].currentIdx < window.fcState[actId].total - 1) {
          window.fcState[actId].currentIdx++;
          renderSingleFlashcard(actId);
      }
  };

  window.fcPrev = function(actId) {
      if (window.fcState[actId].currentIdx > 0) {
          window.fcState[actId].currentIdx--;
          renderSingleFlashcard(actId);
      }
  };

  window.fcStudyAgain = function(actId) {
      // Just cycle to next for spaced repetition later
      fcNext(actId);
  };

  window.fcKnow = function(actId) {
    incrementStreak();
    const state = window.fcState[actId];
    state.known.add(state.currentIdx);
    
    if (state.known.size === state.total) {
        completeActivity(actId, 'prepare', true, 'flashcard');
        document.getElementById('fc-container-' + actId).innerHTML = '<div style="text-align:center; padding: 20px; font-size: 1.5rem; color: #10b981; font-weight: bold;">🎉 All flashcards mastered!</div>';
    } else {
        // Automatically go to next non-known card
        let nextIdx = state.currentIdx;
        let found = false;
        for (let i = 1; i <= state.total; i++) {
            let tryIdx = (state.currentIdx + i) % state.total;
            if (!state.known.has(tryIdx)) {
                nextIdx = tryIdx;
                found = true;
                break;
            }
        }
        if (found) {
            state.currentIdx = nextIdx;
            renderSingleFlashcard(actId);
        }
    }
  };

  // ─── Essay Writing ───
  function renderEssayWriting(body, data, actId, mode) {
    const prompt = data.prompt || "Write your essay here.";
    const minWords = data.minWords || 75;
    
    let html = '<div class="essay-writing-container">';
    html += '<p style="font-weight:600;margin-bottom:10px;">' + esc(prompt) + ' <span style="color:var(--primary);font-size:0.85em;">(Min: ' + minWords + ' words)</span></p>';
    html += '<textarea id="essay-' + actId + '" class="act-input" style="height:200px;resize:vertical;" oninput="updateEssayWordCount(this, \\'' + actId + '\\')"></textarea>';
    html += '<div style="display:flex;justify-content:space-between;margin-top:10px;align-items:center;">';
    html += '<span id="wc-' + actId + '" style="font-size:0.9em;color:var(--text2);font-weight:600;">0 words</span>';
    html += '<button id="submit-' + actId + '" class="act-btn act-btn-primary" onclick="submitEssay(\\'' + actId + '\\', ' + minWords + ')" disabled>Submit Essay</button>';
    html += '</div>';
    html += '</div>';
    
    body.innerHTML = html;
  }
  
  window.updateEssayWordCount = function(textarea, actId) {
    const countSpan = document.getElementById('wc-' + actId);
    const submitBtn = document.getElementById('submit-' + actId);
    if (!countSpan || !submitBtn) return;
    
    const words = textarea.value.trim().split(/\\s+/).filter(w => w.length > 0);
    const count = words.length;
    countSpan.textContent = count + ' words';
    
    const minWordsMatch = countSpan.parentElement.parentElement.querySelector('span[style*="font-size:0.85em"]');
    const minWordsText = minWordsMatch ? minWordsMatch.textContent : '';
    const extractMin = minWordsText.match(/Min: (\\d+)/);
    const minWords = extractMin ? parseInt(extractMin[1], 10) : 75;
    
    if (count >= minWords) {
      countSpan.style.color = "var(--success)";
      submitBtn.disabled = false;
    } else {
      countSpan.style.color = "var(--text2)";
      submitBtn.disabled = true;
    }
  };

  window.submitEssay = function(actId, minWords) {
    const textarea = document.getElementById('essay-' + actId);
    if (!textarea) return;
    const words = textarea.value.trim().split(/\\s+/).filter(w => w.length > 0);
    if (words.length >= minWords) {
       state.essayAnswers = state.essayAnswers || {};
       state.essayAnswers[actId] = textarea.value;
       textarea.disabled = true;
       document.getElementById('submit-' + actId).style.display = 'none';
       completeActivity(actId, 'practice', true, 'essay_writing');
    }
  };

  // ─── Voice Recording ───
  function renderVoiceRecording(body, data, actId, mode) {
    const prompt = data.prompt || "Press record and speak.";
    
    let html = '<div class="voice-recording-container">';
    html += '<p style="font-weight:600;margin-bottom:10px;">' + esc(prompt) + '</p>';
    html += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">';
    html += '<button id="record-btn-' + actId + '" class="act-btn" style="background:#e74c3c;color:white;border-radius:50%;width:50px;height:50px;font-size:1.2rem;display:flex;align-items:center;justify-content:center;" onclick="toggleVoiceRecording(\\'' + actId + '\\')"><i class="fas fa-microphone"></i></button>';
    html += '<span id="record-status-' + actId + '" style="font-weight:600;color:var(--text2);">Ready</span>';
    html += '<span id="record-timer-' + actId + '" style="margin-left:auto;font-family:monospace;font-size:1.2rem;">00:00</span>';
    html += '</div>';
    html += '<audio id="audio-playback-' + actId + '" controls style="width:100%;display:none;"></audio>';
    html += '<button id="submit-audio-' + actId + '" class="act-btn act-btn-primary hidden" style="margin-top:10px;width:100%;" onclick="submitAudio(\\'' + actId + '\\')">Submit Recording</button>';
    html += '</div>';
    
    body.innerHTML = html;
  }

  window.voiceRecorders = window.voiceRecorders || {};
  window.audioChunks = window.audioChunks || {};

  window.toggleVoiceRecording = async function(actId) {
    const btn = document.getElementById('record-btn-' + actId);
    const status = document.getElementById('record-status-' + actId);
    const timer = document.getElementById('record-timer-' + actId);
    const playback = document.getElementById('audio-playback-' + actId);
    const submitBtn = document.getElementById('submit-audio-' + actId);
    
    if (window.voiceRecorders[actId] && window.voiceRecorders[actId].state === 'recording') {
        // Stop recording
        window.voiceRecorders[actId].stop();
        clearInterval(window.voiceRecorders[actId].intervalId);
        status.textContent = "Finished";
        status.style.color = "var(--success)";
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.style.background = "#e74c3c";
        btn.style.animation = "none";
    } else {
        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            window.voiceRecorders[actId] = mediaRecorder;
            window.audioChunks[actId] = [];
            
            mediaRecorder.addEventListener("dataavailable", event => {
                window.audioChunks[actId].push(event.data);
            });
            
            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(window.audioChunks[actId], { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                playback.src = audioUrl;
                playback.style.display = 'block';
                submitBtn.classList.remove('hidden');
                
                // Read recording as base64 for saving in report
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = function() {
                    state.voiceRecordings = state.voiceRecordings || {};
                    state.voiceRecordings[actId] = reader.result;
                }
                
                stream.getTracks().forEach(track => track.stop());
            });
            
            playback.style.display = 'none';
            submitBtn.classList.add('hidden');
            mediaRecorder.start();
            status.textContent = "Recording...";
            status.style.color = "#e74c3c";
            btn.innerHTML = '<i class="fas fa-stop"></i>';
            btn.style.background = "#c0392b";
            btn.style.animation = "pulse-battery 1s infinite";
            
            let seconds = 0;
            timer.textContent = "00:00";
            window.voiceRecorders[actId].intervalId = setInterval(() => {
                seconds++;
                const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                const secs = (seconds % 60).toString().padStart(2, '0');
                timer.textContent = mins + ":" + secs;
            }, 1000);
            
        } catch (err) {
            alert("Microphone access denied or not available.");
            console.error(err);
        }
    }
  };

  window.submitAudio = function(actId) {
    const btn = document.getElementById('record-btn-' + actId);
    const submitBtn = document.getElementById('submit-audio-' + actId);
    if (btn) btn.disabled = true;
    if (submitBtn) {
       submitBtn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
       submitBtn.style.setProperty('background', '#10b981', 'important');
       submitBtn.style.setProperty('background-color', '#10b981', 'important');
       submitBtn.style.setProperty('color', '#ffffff', 'important');
       submitBtn.style.pointerEvents = 'none';
       submitBtn.style.display = 'block';
    }
    try {
        if (typeof completeActivity === 'function') {
            completeActivity(actId, 'practice', true, 'voice_recording');
        }
    } catch(e) {
        console.error("completeActivity failed:", e);
    }
    return;
  };
  window.submitAudioDeprecated = function(actId) {
    const btn = document.getElementById('record-btn-' + actId);
    const submitBtn = document.getElementById('submit-audio-' + actId);
    if (btn) btn.disabled = true;
    if (submitBtn) {
       submitBtn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
       submitBtn.style.background = '#10b981';
       submitBtn.style.color = '#ffffff';
       submitBtn.style.pointerEvents = 'none';
       submitBtn.style.display = 'block';
    }
    completeActivity(actId, 'practice', true, 'voice_recording');
  };

  // ─── Vocab Table ───
  function renderVocabTable(body, data, actId) {
    const words = data.words || [];
    let html = '<table class="vocab-table"><thead><tr><th>Word</th><th>IPA</th><th>Definition</th><th>Example</th><th>🔊</th></tr></thead><tbody>';
    words.forEach(w => {
      html += '<tr><td><strong>' + esc(w.word) + '</strong></td><td>' + esc(w.ipa || '') + '</td><td>' + esc(w.definition) + '</td><td><em>' + esc(w.example || '') + '</em></td>' +
        '<td><button class="tts-btn" onclick="speakWord(\\'' + escJs(w.word) + '\\')">🔊</button></td></tr>';
    });
    html += '</tbody></table>';
    body.innerHTML = html;
  }

  // ─── Gap Fill ───
  function renderGapFill(body, data, actId, mode) {
    const sentences = data.sentences || [];
    let html = '';
    sentences.forEach((s, i) => {
      const text = s.text || s.sentence || '';
      const parts = text.split('___');
      html += '<div class="gf-sentence">';
      parts.forEach((p, j) => {
        html += esc(p);
        if (j < parts.length - 1) {
          html += '<input class="gf-input" data-answer="' + escAttr(s.answer) + '" data-idx="' + i + '" id="gf-' + actId + '-' + i + '" ' +
            'onblur="checkGapFill(this,\\'' + actId + '\\',\\'' + mode + '\\')" placeholder="...">';
        }
      });
      if (s.hint) html += ' <span style="color:var(--text2);font-size:0.8rem">(' + esc(s.hint) + ')</span>';
      html += '</div>';
    });
    html += '<button class="act-btn act-btn-primary" onclick="checkAllGapFills(\\'' + actId + '\\',\\'' + mode + '\\')">Check All</button>';
    body.innerHTML = html;
  }
  window.checkGapFill = function(input, actId, mode) {
    const answer = input.dataset.answer;
    const val = input.value.trim();
    if (!val) return;
    if (fuzzyMatch(val, answer)) {
      input.classList.remove('incorrect');
      input.classList.add('correct');
      input.disabled = true;
      incrementStreak();
      trackFeedback(true);
    } else {
      input.classList.remove('correct');
      input.classList.add('incorrect');
      resetStreak();
      screenShake();
      trackFeedback(false, getCatPhrase("incorrect") + ' The answer is: ' + answer);
    }
  };
  window.checkAllGapFills = function(actId, mode) {
    const card = document.getElementById(actId);
    if (!card) return;
    const inputs = card.querySelectorAll('.gf-input');
    let allCorrect = true;
    inputs.forEach(inp => {
      checkGapFill(inp, actId, mode);
      if (!inp.classList.contains('correct')) allCorrect = false;
    });
    if (allCorrect) completeActivity(actId, mode, true, 'gap_fill');
  };

  // ─── Gap Fill Dropdown ───
  function renderGapFillDropdown(body, data, actId, mode) {
    const sentences = data.sentences || [];
    let html = '';
    sentences.forEach((s, i) => {
      const text = s.text || s.sentence || '';
      const parts = text.split('___');
      html += '<div class="gf-sentence">';
      parts.forEach((p, j) => {
        html += esc(p);
        if (j < parts.length - 1) {
          const opts = (s.options || []).sort(() => Math.random() - 0.5);
          html += '<select class="act-select" data-answer="' + escAttr(s.answer) + '" onchange="checkDropdown(this,\\'' + actId + '\\',\\'' + mode + '\\')">' +
            '<option value="">-- select --</option>' +
            opts.map(o => '<option value="' + escAttr(o) + '">' + esc(o) + '</option>').join('') + '</select>';
        }
      });
      html += '</div>';
    });
    body.innerHTML = html;
  }
  window.checkDropdown = function(sel, actId, mode) {
    if (sel.value === sel.dataset.answer) {
      sel.style.borderColor = 'var(--success)';
      sel.disabled = true;
      incrementStreak();
      trackFeedback(true);
      // Check if all done
      const card = document.getElementById(actId);
      const allDone = Array.from(card.querySelectorAll('.act-select')).every(s => s.disabled);
      if (allDone) completeActivity(actId, mode, true, 'gap_fill_dropdown');
    } else {
      sel.style.borderColor = 'var(--danger)';
      resetStreak(); screenShake();
      trackFeedback(false);
    }
  };

  // ─── Multiple Choice ───
  function renderMCQ(body, data, actId, mode) {
    const questions = data.questions || [];
    let html = '';
    questions.forEach((q, qi) => {
      html += '<div class="mcq-question" id="mcq-' + actId + '-' + qi + '"><h5>' + (qi+1) + '. ' + esc(q.question) + '</h5><div class="mcq-options">';
      (q.options || []).forEach(opt => {
        html += '<div class="mcq-opt" data-answer="' + escAttr(q.answer) + '" data-val="' + escAttr(opt) + '" onclick="checkMCQ(this,\\'' + actId + '\\',\\'' + mode + '\\',' + questions.length + ')">' + esc(opt) + '</div>';
      });
      html += '</div>';
      if (q.explanation) html += '<div class="hidden mcq-explain" style="margin-top:6px;font-size:0.85rem;color:var(--text2)">' + esc(q.explanation) + '</div>';
      html += '</div>';
    });
    body.innerHTML = html;
  }
  window.checkMCQ = function(el, actId, mode, total) {
    if (el.classList.contains('correct') || el.classList.contains('wrong')) return;
    const parent = el.closest('.mcq-question');
    if (parent.dataset.answered) return;
    parent.dataset.answered = 'true';
    const isCorrect = el.dataset.val === el.dataset.answer;
    if (isCorrect) {
      el.classList.add('correct');
      incrementStreak();
      trackFeedback(true);
    } else {
      el.classList.add('wrong');
      // Highlight correct
      parent.querySelectorAll('.mcq-opt').forEach(o => {
        if (o.dataset.val === o.dataset.answer) o.classList.add('correct');
      });
      resetStreak(); screenShake();
      trackFeedback(false);
    }
    // Show explanation
    const explain = parent.querySelector('.mcq-explain');
    if (explain) explain.classList.remove('hidden');
    // Check all done
    const card = document.getElementById(actId);
    const allAnswered = card.querySelectorAll('.mcq-question[data-answered]').length;
    if (allAnswered >= total) {
      const allCorrect = card.querySelectorAll('.mcq-opt.correct').length === total;
      completeActivity(actId, mode, allCorrect, 'multiple_choice');
    }
  };

  // ─── True/False ───
  function renderTrueFalse(body, data, actId, mode) {
    const stmts = data.statements || [];
    let html = '';
    stmts.forEach((s, i) => {
      html += '<div class="mcq-question" id="tf-' + actId + '-' + i + '"><h5>' + (i+1) + '. ' + esc(s.statement) + '</h5><div class="mcq-options">' +
        '<div class="mcq-opt" data-answer="' + s.answer + '" data-val="true" onclick="checkTF(this,\\'' + actId + '\\',\\'' + mode + '\\',' + stmts.length + ')">True</div>' +
        '<div class="mcq-opt" data-answer="' + s.answer + '" data-val="false" onclick="checkTF(this,\\'' + actId + '\\',\\'' + mode + '\\',' + stmts.length + ')">False</div>' +
        '</div></div>';
    });
    body.innerHTML = html;
  }
  window.checkTF = function(el, actId, mode, total) {
    const parent = el.closest('.mcq-question');
    if (parent.dataset.answered) return;
    parent.dataset.answered = 'true';
    const isCorrect = String(el.dataset.val) === String(el.dataset.answer);
    el.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      parent.querySelectorAll('.mcq-opt').forEach(o => {
        if (String(o.dataset.val) === String(o.dataset.answer)) o.classList.add('correct');
      });
      resetStreak(); screenShake();
      trackFeedback(false);
    } else {
      incrementStreak();
      trackFeedback(true);
    }
    const card = document.getElementById(actId);
    if (card.querySelectorAll('.mcq-question[data-answered]').length >= total) {
      completeActivity(actId, mode, true, 'true_false');
    }
  };

  // ─── Matching ───
  function renderMatching(body, data, actId, mode) {
    const pairs = data.pairs || [];
    const lefts = pairs.map(p => p.left).sort(() => Math.random() - 0.5);
    const rights = pairs.map(p => p.right).sort(() => Math.random() - 0.5);
    let html = '<div class="matching-grid">';
    html += '<div class="match-col">' + lefts.map((l, i) => '<div class="match-item match-left" data-val="' + escAttr(l) + '" onclick="selectMatch(this,\\'left\\',\\'' + actId + '\\',\\'' + mode + '\\')">' + esc(l) + '</div>').join('') + '</div>';
    html += '<div class="match-col">' + rights.map((r, i) => '<div class="match-item match-right" data-val="' + escAttr(r) + '" onclick="selectMatch(this,\\'right\\',\\'' + actId + '\\',\\'' + mode + '\\')">' + esc(r) + '</div>').join('') + '</div>';
    html += '</div>';
    body.innerHTML = html;
    body.dataset.pairs = JSON.stringify(pairs);
    body.dataset.selectedLeft = '';
    body.dataset.selectedRight = '';
    body.dataset.matchCount = '0';
    body.dataset.totalPairs = String(pairs.length);
  }
  window.selectMatch = function(el, side, actId, mode) {
    if (el.classList.contains('matched')) return;
    const body = el.closest('.activity-body');
    const card = document.getElementById(actId);
    // Deselect same side
    body.querySelectorAll('.match-' + side + '.selected').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    body.dataset['selected' + (side === 'left' ? 'Left' : 'Right')] = el.dataset.val;
    // Check if both selected
    const left = body.dataset.selectedLeft;
    const right = body.dataset.selectedRight;
    if (left && right) {
      const pairs = JSON.parse(body.dataset.pairs);
      const match = pairs.find(p => p.left === left && p.right === right);
      if (match) {
        body.querySelectorAll('.match-left.selected, .match-right.selected').forEach(s => {
          s.classList.remove('selected');
          s.classList.add('matched');
        });
        body.dataset.matchCount = String(parseInt(body.dataset.matchCount) + 1);
        incrementStreak();
        trackFeedback(true);
        if (parseInt(body.dataset.matchCount) >= parseInt(body.dataset.totalPairs)) {
          completeActivity(actId, mode, true, 'matching');
        }
      } else {
        body.querySelectorAll('.match-left.selected, .match-right.selected').forEach(s => {
          s.classList.add('wrong');
          setTimeout(() => { s.classList.remove('selected', 'wrong'); }, 500);
        });
        resetStreak(); screenShake();
        trackFeedback(false);
      }
      body.dataset.selectedLeft = '';
      body.dataset.selectedRight = '';
    }
  };

  // ─── Memory Match ───
  function renderMemoryMatch(body, data, actId, mode) {
    const pairs = data.pairs || [];
    let cards = [];
    pairs.forEach((p, i) => {
      cards.push({ text: p.a, pairId: i, type: 'a' });
      cards.push({ text: p.b, pairId: i, type: 'b' });
    });
    cards.sort(() => Math.random() - 0.5);
    let html = '<div class="memory-grid">';
    cards.forEach((c, i) => {
      html += '<div class="memory-card" data-pair="' + c.pairId + '" data-text="' + escAttr(c.text) + '" data-idx="' + i + '" onclick="flipMemory(this,\\'' + actId + '\\',\\'' + mode + '\\')">' + (i + 1) + '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
    body.dataset.flipped = '';
    body.dataset.matchedCount = '0';
    body.dataset.totalPairs = String(pairs.length);
  }
  window.flipMemory = function(el, actId, mode) {
    if (el.classList.contains('flipped') || el.classList.contains('matched')) return;
    const body = el.closest('.activity-body');
    const flippedCards = body.querySelectorAll('.memory-card.flipped:not(.matched)');
    if (flippedCards.length >= 2) return;
    el.classList.add('flipped');
    el.textContent = el.dataset.text;
    const newFlipped = body.querySelectorAll('.memory-card.flipped:not(.matched)');
    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      if (a.dataset.pair === b.dataset.pair) {
        setTimeout(() => { a.classList.add('matched'); b.classList.add('matched'); }, 300);
        body.dataset.matchedCount = String(parseInt(body.dataset.matchedCount) + 1);
        incrementStreak();
        if (parseInt(body.dataset.matchedCount) >= parseInt(body.dataset.totalPairs)) {
          setTimeout(() => completeActivity(actId, mode, true, 'memory_match'), 500);
        }
      } else {
        setTimeout(() => {
          a.classList.remove('flipped'); a.textContent = parseInt(a.dataset.idx) + 1;
          b.classList.remove('flipped'); b.textContent = parseInt(b.dataset.idx) + 1;
        }, 800);
        resetStreak();
      }
    }
  };

  // ─── Scramble ───
  function renderScramble(body, data, actId, mode) {
    let sentences = [];
    if (Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0].sentences)) {
            sentences = data.flatMap((d) => d.sentences || []);
        } else {
            sentences = data;
        }
    } else if (data) {
        sentences = data.sentences || data.items || [];
    }
    let html = '';
    sentences.forEach((s, i) => {
      let words = [];
      if (Array.isArray(s.words)) {
        words = [...s.words];
      } else {
        const sentenceStr = s.sentence || s.text || '';
        words = sentenceStr.split('|').map((x) => x.trim()).filter((x) => x);
        if (words.length <= 1 && sentenceStr.includes(' ')) {
          words = sentenceStr.split(/\\s+/).filter((x) => x);
        }
      }
      words.sort(() => Math.random() - 0.5);
      
      const correctStr = s.correctOrder || s.answer || s.correct || (s.sentence || s.text || '').split('|').map((x) => x.trim()).filter((x) => x).join(' ');
      
      html += '<div class="scramble-item" data-correct="' + escAttr(correctStr) + '" data-idx="' + i + '">' +
        '<div class="scramble-words" id="scw-' + actId + '-' + i + '">' +
        words.map(w => '<span class="scramble-chip" onclick="addToScramble(this,\\'' + actId + '-' + i + '\\')">' + esc(w) + '</span>').join('') +
        '</div>' +
        '<div class="scramble-target" id="sct-' + actId + '-' + i + '"></div>' +
        '<button class="act-btn act-btn-primary" style="margin-top:8px" onclick="checkScramble(\\'' + actId + '-' + i + '\\',\\'' + actId + '\\',\\'' + mode + '\\')">Check</button>' +
        '<button class="act-btn" style="margin-top:8px;margin-left:4px" onclick="clearScramble(\\'' + actId + '-' + i + '\\')">Clear</button>' +
        '</div>';
    });
    body.innerHTML = html || '<p>No content available.</p>';
  }
  window.addToScramble = function(chip, key) {
    if (chip.classList.contains('placed')) return;
    chip.classList.add('placed');
    const target = document.getElementById('sct-' + key);
    const clone = document.createElement('span');
    clone.className = 'scramble-chip';
    clone.textContent = chip.textContent;
    clone.onclick = function() {
      chip.classList.remove('placed');
      clone.remove();
    };
    target.appendChild(clone);
  };
  window.clearScramble = function(key) {
    const words = document.getElementById('scw-' + key);
    const target = document.getElementById('sct-' + key);
    if (words) words.querySelectorAll('.scramble-chip').forEach(c => c.classList.remove('placed'));
    if (target) target.innerHTML = '';
  };
  window.checkScramble = function(key, actId, mode) {
    const target = document.getElementById('sct-' + key);
    const item = target.closest('.scramble-item');
    const result = Array.from(target.children).map(c => c.textContent).join(' ');
    const correct = item.dataset.correct;
    if (result.trim().toLowerCase() === correct.trim().toLowerCase()) {
      target.style.borderColor = 'var(--success)';
      incrementStreak();
      trackFeedback(true);
      completeActivity(actId, mode, true, 'scramble');
    } else {
      target.style.borderColor = 'var(--danger)';
      resetStreak(); screenShake();
      trackFeedback(false, getCatPhrase("incorrect") + ' Correct: ' + correct);
    }
  };

  // ─── Error Correction ───
  function renderErrorCorrection(body, data, actId, mode) {
    const sentences = data.sentences || [];
    let html = '';
    sentences.forEach((s, i) => {
      const words = s.text.split(/\\s+/);
      html += '<div class="ec-sentence" data-error="' + escAttr(s.errorWord) + '" data-correction="' + escAttr(s.correction) + '" data-idx="' + i + '">' +
        words.map(w => '<span class="ec-word" onclick="clickError(this,\\'' + actId + '\\',\\'' + mode + '\\')">' + esc(w) + '</span>').join(' ') +
        '</div>';
    });
    body.innerHTML = html;
  }
  window.clickError = function(wordEl, actId, mode) {
    const sentence = wordEl.closest('.ec-sentence');
    if (sentence.dataset.done) return;
    const errorWord = sentence.dataset.error.toLowerCase();
    const clickedWord = wordEl.textContent.replace(/[.,!?]/g, '').toLowerCase();
    if (clickedWord === errorWord) {
      wordEl.classList.add('error-found');
      // Show correction
      const corr = document.createElement('span');
      corr.className = 'ec-word correct-word';
      corr.textContent = sentence.dataset.correction;
      wordEl.after(corr);
      sentence.dataset.done = 'true';
      incrementStreak();
      catSay(getCatPhrase('correct') + ' The correction is: ' + sentence.dataset.correction, '😸');
      completeActivity(actId, mode, true, 'error_correction');
    } else {
      wordEl.style.background = '#f8d7da';
      setTimeout(() => wordEl.style.background = '', 500);
      resetStreak();
      trackFeedback(false);
    }
  };

  // ─── Dictation ───
  function renderDictation(body, data, actId, mode) {
    const sentences = data.sentences || [];
    let html = '';
    sentences.forEach((s, i) => {
      html += '<div class="dict-item" style="margin-bottom:16px">' +
        '<button class="act-btn act-btn-primary" onclick="speakWord(\\'' + escJs(s.text) + '\\')">🔊 Listen</button>' +
        '<input class="act-input" style="margin-top:8px" placeholder="Type what you hear..." data-answer="' + escAttr(s.text) + '" id="dict-' + actId + '-' + i + '">' +
        '<div class="dict-result" id="dr-' + actId + '-' + i + '" style="margin-top:6px"></div></div>';
    });
    html += '<button class="act-btn act-btn-success" onclick="checkDictation(\\'' + actId + '\\',\\'' + mode + '\\')">Check All</button>';
    body.innerHTML = html;
  }
  window.checkDictation = function(actId, mode) {
    const card = document.getElementById(actId);
    const items = card.querySelectorAll('.dict-item');
    let allCorrect = true;
    items.forEach((item, i) => {
      const input = item.querySelector('.act-input');
      const result = document.getElementById('dr-' + actId + '-' + i);
      const answer = input.dataset.answer;
      const typed = input.value.trim();
      const answerWords = answer.split(/\\s+/);
      const typedWords = typed.split(/\\s+/);
      let html = '';
      answerWords.forEach((w, j) => {
        const tw = typedWords[j] || '';
        if (tw.toLowerCase() === w.toLowerCase().replace(/[.,!?]/g, '')) {
          html += '<span class="dict-word correct">' + esc(w) + '</span> ';
        } else {
          html += '<span class="dict-word incorrect">' + esc(tw || '_') + '</span> ';
          allCorrect = false;
        }
      });
      result.innerHTML = html + '<br><small style="color:var(--text2)">Correct: ' + esc(answer) + '</small>';
    });
    if (allCorrect) {
      incrementStreak();
      completeActivity(actId, mode, true, 'dictation');
    } else {
      resetStreak(); screenShake();
      trackFeedback(false);
    }
  };

  // ─── Hangman ───
  function renderHangman(body, data, actId, mode) {
    const words = data.words || [];
    const w = words[0] || { word: 'hello', hint: 'A greeting' };
    const word = w.word.toUpperCase();
    body.innerHTML = '<div style="text-align:center"><p style="color:var(--text2)">Hint: ' + esc(w.hint) + '</p>' +
      '<div class="hangman-word" id="hw-' + actId + '"></div>' +
      '<p>Remaining: <span id="hr-' + actId + '">6</span></p>' +
      '<div class="hangman-keyboard" id="hk-' + actId + '"></div></div>';
    // Set up
    const guessed = new Set();
    const remaining = { count: 6 };
    updateHangmanDisplay(actId, word, guessed);
    // Keyboard
    const kb = document.getElementById('hk-' + actId);
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
      const key = document.createElement('div');
      key.className = 'hangman-key';
      key.textContent = letter;
      key.onclick = function() {
        if (key.classList.contains('used')) return;
        key.classList.add('used');
        guessed.add(letter);
        if (word.includes(letter)) {
          key.classList.add('correct');
          incrementStreak();
        } else {
          key.classList.add('wrong');
          remaining.count--;
          document.getElementById('hr-' + actId).textContent = remaining.count;
          if (remaining.count <= 0) {
            trackFeedback(false, "Oh no! The word was: " + word);
            completeActivity(actId, mode, false, 'hangman');
            return;
          }
        }
        updateHangmanDisplay(actId, word, guessed);
        // Check win
        if (word.split('').every(l => l === ' ' || guessed.has(l))) {
          trackFeedback(true);
          completeActivity(actId, mode, true, 'hangman');
        }
      };
      kb.appendChild(key);
    });
  }
  function updateHangmanDisplay(actId, word, guessed) {
    const display = document.getElementById('hw-' + actId);
    if (!display) return;
    display.textContent = word.split('').map(l => l === ' ' ? '  ' : guessed.has(l) ? l : '_').join('');
  }

  // ─── Would You Rather ───
  function renderWouldYouRather(body, data, actId) {
    const options = data.options || [];
    let html = '';
    options.forEach((o, i) => {
      html += '<div class="wyr-container" style="margin-bottom:16px">' +
        '<div class="wyr-option" onclick="this.classList.toggle(\\'chosen\\')">' + esc(o.optionA) + '</div>' +
        '<div class="wyr-option" onclick="this.classList.toggle(\\'chosen\\')">' + esc(o.optionB) + '</div></div>';
    });
    body.innerHTML = html;
  }

  // ─── Typing Speed ───
  function renderTypingSpeed(body, data, actId, mode) {
    const text = data.text || 'The quick brown fox jumps over the lazy dog.';
    body.innerHTML = '<div class="typing-display" id="td-' + actId + '">' + esc(text) + '</div>' +
      '<input class="act-input" id="ti-' + actId + '" placeholder="Start typing..." oninput="updateTyping(\\'' + actId + '\\',\\'' + mode + '\\')">' +
      '<div style="margin-top:8px"><span id="twpm-' + actId + '">0 WPM</span></div>';
    body.dataset.text = text;
    body.dataset.startTime = '';
  }
  window.updateTyping = function(actId, mode) {
    const input = document.getElementById('ti-' + actId);
    const display = document.getElementById('td-' + actId);
    const body = input.closest('.activity-body');
    const text = body.dataset.text;
    if (!body.dataset.startTime) body.dataset.startTime = String(Date.now());
    const typed = input.value;
    let html = '';
    for (let i = 0; i < text.length; i++) {
      if (i < typed.length) {
        html += typed[i] === text[i] ?
          '<span class="typed-correct">' + esc(text[i]) + '</span>' :
          '<span class="typed-wrong">' + esc(text[i]) + '</span>';
      } else if (i === typed.length) {
        html += '<span class="typed-cursor">' + esc(text[i]) + '</span>';
      } else {
        html += esc(text[i]);
      }
    }
    display.innerHTML = html;
    // WPM
    const elapsed = (Date.now() - parseInt(body.dataset.startTime)) / 60000;
    const words = typed.split(/\\s+/).filter(Boolean).length;
    const wpm = elapsed > 0 ? Math.round(words / elapsed) : 0;
    document.getElementById('twpm-' + actId).textContent = wpm + ' WPM';
    if (typed.length >= text.length) {
      completeActivity(actId, mode, typed === text, 'typing_speed');
    }
  };

  // ─── Escape Room ───
  function renderEscapeRoom(body, data, actId, mode) {
    const puzzles = data.puzzles || [];
    let html = '<h4 style="margin-bottom:12px">🔐 Solve each puzzle to escape!</h4>';
    puzzles.forEach((p, i) => {
      html += '<div class="escape-puzzle ' + (i > 0 ? 'locked' : '') + '" id="ep-' + actId + '-' + i + '">' +
        '<p><strong>Puzzle ' + (i+1) + ':</strong> ' + esc(p.clue) + '</p>' +
        (p.hint ? '<p style="color:var(--text2);font-size:0.85rem">Hint: ' + esc(p.hint) + '</p>' : '') +
        '<input class="act-input" style="width:200px;display:inline-block" placeholder="Answer...">' +
        '<button class="act-btn act-btn-primary" style="margin-left:8px" onclick="checkEscape(\\'' + actId + '\\',' + i + ',\\'' + escJs(p.answer) + '\\',\\'' + mode + '\\')">Submit</button></div>';
    });
    body.innerHTML = html;
  }
  window.checkEscape = function(actId, idx, answer, mode) {
    const puzzle = document.getElementById('ep-' + actId + '-' + idx);
    const input = puzzle.querySelector('.act-input');
    if (fuzzyMatch(input.value, answer)) {
      puzzle.classList.add('solved');
      puzzle.classList.remove('locked');
      incrementStreak();
      const next = document.getElementById('ep-' + actId + '-' + (idx + 1));
      if (next) {
        next.classList.remove('locked');
        catSay('🔓 Unlocked! Next puzzle...', '😸');
      } else {
        catSay('🎉 You escaped! Amazing!', '😻');
        completeActivity(actId, mode, true, 'escape_room');
        celebrate('burst');
      }
    } else {
      screenShake();
      trackFeedback(false);
    }
  };

  // ─── Sequence Ordering ───
  function renderSequenceOrdering(body, data, actId, mode) {
    const items = data.items || data.sentences || [];
    const correctOrder = data.correctOrder || items.map((_, i) => i);
    const shuffled = [...items].map((item, i) => ({ text: item, origIdx: i })).sort(() => Math.random() - 0.5);
    body.innerHTML = '<div class="seq-items" id="seq-' + actId + '">' +
      shuffled.map((item, i) => '<div class="seq-item" data-orig="' + item.origIdx + '"><span class="seq-arrows"><button onclick="moveSeq(this,-1)">▲</button><button onclick="moveSeq(this,1)">▼</button></span><span>' + esc(item.text) + '</span></div>').join('') +
      '</div><button class="act-btn act-btn-primary" style="margin-top:8px" onclick="checkSequence(\\'' + actId + '\\',\\'' + mode + '\\',[' + correctOrder.join(',') + '])">Check Order</button>';
  }
  window.moveSeq = function(btn, dir) {
    const item = btn.closest('.seq-item');
    const container = item.parentElement;
    if (dir === -1 && item.previousElementSibling) {
      container.insertBefore(item, item.previousElementSibling);
    } else if (dir === 1 && item.nextElementSibling) {
      container.insertBefore(item.nextElementSibling, item);
    }
  };
  window.checkSequence = function(actId, mode, correctOrder) {
    const container = document.getElementById('seq-' + actId);
    const items = container.querySelectorAll('.seq-item');
    const order = Array.from(items).map(i => parseInt(i.dataset.orig));
    const correct = JSON.stringify(order) === JSON.stringify(correctOrder);
    items.forEach((item, i) => {
      item.style.borderColor = order[i] === correctOrder[i] ? 'var(--success)' : 'var(--danger)';
    });
    if (correct) {
      incrementStreak();
      completeActivity(actId, mode, true, 'sequence_ordering');
    } else {
      resetStreak(); screenShake();
      trackFeedback(false);
    }
  };

  // ─── Concealed Text ───
  function renderConcealedText(body, data) {
    const blocks = data.blocks || [];
    body.innerHTML = blocks.map(b =>
      '<div class="concealed-block"><div class="concealed-label" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\'none\\'?\\'block\\':\\'none\\'">' + esc(b.label) + '</div>' +
      '<div class="concealed-content" style="display:none">' + b.hiddenContent + '</div></div>'
    ).join('');
  }

  // ─── Split View ───
  function renderSplitView(body, data) {
    const versions = data.versions || [];
    if (versions.length === 0) {
      body.innerHTML = '<p style="color:var(--text2);font-style:italic;">No dialogue variations available.</p>';
      return;
    }
    body.innerHTML = '<input type="range" class="split-slider" min="0" max="' + (versions.length - 1) + '" value="0" oninput="updateSplit(this)">' +
      '<div class="split-labels" style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text2);margin-top:4px;margin-bottom:12px;">' +
      versions.map(v => '<span>' + esc(v.label) + '</span>').join('') + '</div>' +
      '<div class="split-text" style="padding:16px;background:var(--bg);border-radius:8px;font-size:1rem;line-height:1.6;border:1px solid var(--border);min-height:60px;margin-bottom:12px;">' + (versions[0] ? versions[0].text : '') + '</div>' +
      '<button class="done-check" onclick="copySplitText(this)" style="font-size:0.85rem;padding:6px 12px;margin-top:4px;border-color:var(--primary);color:var(--primary);"><i class="fas fa-copy" style="margin-right:5px;"></i> Copy Dialogue Prompt</button>';
    body.dataset.versions = JSON.stringify(versions);
  }
  window.updateSplit = function(slider) {
    const versions = JSON.parse(slider.closest('.activity-body').dataset.versions);
    const textEl = slider.closest('.activity-body').querySelector('.split-text');
    if (textEl && versions[slider.value]) {
      textEl.innerHTML = versions[slider.value].text;
    }
  };
  window.copySplitText = function(btn) {
    const textEl = btn.closest('.activity-body').querySelector('.split-text');
    if (textEl) {
      const textToCopy = textEl.innerText || textEl.textContent || "";
      navigator.clipboard.writeText(textToCopy).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      });
    }
  };

  // ─── Quote Block ───
  function renderQuoteBlock(body, data) {
    body.innerHTML = '<blockquote style="border-left:4px solid var(--primary);padding:12px 20px;margin:0;font-style:italic;font-size:1.1rem">' +
      esc(data.quote || '') + '<footer style="margin-top:8px;font-size:0.9rem;color:var(--text2)">— ' + esc(data.author || '') + '</footer></blockquote>';
  }

  // ─── Image Block ───
  function renderImageBlock(body, data) {
    if (!data || !data.src) { body.innerHTML = ''; return; }
    body.innerHTML = '<div style="text-align:center"><img src="' + escAttr(data.src) + '" alt="' + escAttr(data.alt || '') + '" style="max-width:100%;border-radius:8px;cursor:zoom-in" onclick="this.style.transform=this.style.transform?\\\'\\\':\\\'scale(1.5)\\\';this.style.transition=\\\'transform 0.3s\\\'">' +
      (data.caption ? '<p style="color:var(--text2);font-size:0.85rem;margin-top:6px">' + esc(data.caption) + '</p>' : '') + '</div>';
  }

  // ─── Video Block ───
  function renderVideoBlock(body, data) {
    const src = (data && data.src) ? data.src : '';
    if (!src) { body.innerHTML = ''; return; }
    if (src.includes('youtube') || src.includes('youtu.be')) {
      const id = src.match(/(?:v=|youtu\\.be\\/|embed\\/)([^&?]+)/);
      body.innerHTML = '<div style="position:relative;padding-bottom:56.25%;height:0"><iframe src="https://www.youtube.com/embed/' + (id ? id[1] : '') + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:8px" allowfullscreen></iframe></div>';
    } else if (src.includes('vimeo')) {
      const id = src.match(/vimeo\\.com\\/(\\d+)/);
      body.innerHTML = '<div style="position:relative;padding-bottom:56.25%;height:0"><iframe src="https://player.vimeo.com/video/' + (id ? id[1] : '') + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:8px" allowfullscreen></iframe></div>';
    } else {
      body.innerHTML = '<video controls style="width:100%;border-radius:8px"><source src="' + escAttr(src) + '"></video>';
    }
  }

  // ─── Guided Writing ───
  function renderGuidedWriting(body, data, actId) {
    const prompt = data.prompt || '';
    const starters = data.sentenceStarters || [];
    body.innerHTML = '<div style="margin-bottom:12px"><strong>✍️ ' + esc(prompt) + '</strong></div>' +
      (starters.length ? '<div style="margin-bottom:8px;color:var(--text2)">Sentence starters: ' + starters.map(s => '<em>' + esc(s) + '</em>').join(', ') + '</div>' : '') +
      '<textarea class="writing-area" id="gw-' + actId + '" oninput="updateWordCount(\\'' + actId + '\\')" placeholder="Write your answer here..."></textarea>' +
      '<div class="word-counter" id="wc-' + actId + '">0 words' + (data.minWords ? ' (min: ' + data.minWords + ')' : '') + '</div>' +
      '<button class="act-btn act-btn-success" style="margin-top:8px" onclick="submitWriting(\\'' + actId + '\\')">Submit</button>';
    // Load saved
    try {
      const saved = safeStorageGet('gw-' + actId);
      if (saved) document.getElementById('gw-' + actId).value = saved;
    } catch(e) {}
  }
  window.updateWordCount = function(actId) {
    const ta = document.getElementById('gw-' + actId);
    const wc = document.getElementById('wc-' + actId);
    const words = ta.value.trim().split(/\\s+/).filter(Boolean).length;
    wc.textContent = words + ' words';
    try { safeStorageSet('gw-' + actId, ta.value); } catch(e) {}
  };
  window.submitWriting = function(actId) {
    completeActivity(actId, 'practice', true, 'guided_writing');
  };

  // ─── Can-Do Statements ───
  function renderCanDo(body, data, actId) {
    const statements = data.statements || [];
    let html = '';
    statements.forEach((s, i) => {
      html += '<div class="cando-item"><input type="checkbox" id="cando-' + actId + '-' + i + '" onchange="saveCando(\\'' + actId + '\\')"><label for="cando-' + actId + '-' + i + '">' + esc(s.text) + '</label></div>';
    });
    html += '<button class="act-btn act-btn-success" style="margin-top:12px" onclick="submitCando(\\'' + actId + '\\')">Save Self-Assessment</button>';
    body.innerHTML = html;
  }
  window.saveCando = function(actId) { /* auto-save via safeStorageSet could be added */ };
  window.submitCando = function(actId) { completeActivity(actId, 'practice', true, 'can_do_statements'); };

  // ─── Reflective Journal ───
  function renderJournal(body, data, actId) {
    const prompts = data.prompts || ['Reflect on your learning today.'];
    body.innerHTML = prompts.map(p => '<p style="color:var(--text2);margin-bottom:6px">' + esc(p) + '</p>').join('') +
      '<textarea class="writing-area" id="rj-' + actId + '" placeholder="Write your thoughts..." oninput="try{safeStorageSet(\\'rj-' + actId + '\\',this.value)}catch(e){}"></textarea>' +
      '<button class="act-btn act-btn-success" style="margin-top:8px" onclick="completeActivity(\\'' + actId + '\\',\\'practice\\',true,\\'reflective_journal\\')">Save Reflection</button>';
    try {
      const saved = safeStorageGet('rj-' + actId);
      if (saved) setTimeout(() => { const el = document.getElementById('rj-' + actId); if (el) el.value = saved; }, 0);
    } catch(e) {}
  }

  // ─── Personal Dictionary ───
  function renderPersonalDict(body, data, actId) {
    body.innerHTML = '<p style="color:var(--text2)">' + esc(data.promptText || 'Add new words you learned:') + '</p>' +
      '<textarea class="writing-area" id="pd-' + actId + '" placeholder="Word – Definition – Example sentence" oninput="try{safeStorageSet(\\'pd-' + actId + '\\',this.value)}catch(e){}"></textarea>' +
      '<button class="act-btn act-btn-success" style="margin-top:8px" onclick="exportDict(\\'' + actId + '\\')">📥 Export Dictionary</button>';
    try {
      const saved = safeStorageGet('pd-' + actId);
      if (saved) setTimeout(() => { const el = document.getElementById('pd-' + actId); if (el) el.value = saved; }, 0);
    } catch(e) {}
  }
  window.exportDict = function(actId) {
    const text = document.getElementById('pd-' + actId).value;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'personal-dictionary.txt'; a.click();
    completeActivity(actId, 'practice', true, 'personal_dictionary');
  };

  // ─── Spelling Bee ───
  function renderSpellingBee(body, data, actId, mode) {
    const words = data.words || [];
    let html = '<div id="sb-' + actId + '">';
    words.forEach((w, i) => {
      html += '<div class="gf-sentence" style="margin-bottom:12px">' +
        '<button class="act-btn act-btn-primary" onclick="speakWord(\\'' + escJs(w.word) + '\\')">🔊 Listen</button> ' +
        (w.hint ? '<span style="color:var(--text2);font-size:0.85rem">(' + esc(w.hint) + ')</span> ' : '') +
        '<input class="gf-input" style="width:180px" data-answer="' + escAttr(w.word) + '" placeholder="Spell the word...">' +
        '</div>';
    });
    html += '</div><button class="act-btn act-btn-success" onclick="checkSpelling(\\'' + actId + '\\',\\'' + mode + '\\')">Check Spelling</button>';
    body.innerHTML = html;
  }
  window.checkSpelling = function(actId, mode) {
    const container = document.getElementById('sb-' + actId);
    const inputs = container.querySelectorAll('.gf-input');
    let allCorrect = true;
    inputs.forEach(inp => {
      if (fuzzyMatch(inp.value, inp.dataset.answer)) {
        inp.classList.add('correct');
        incrementStreak();
      } else {
        inp.classList.add('incorrect');
        allCorrect = false;
        resetStreak();
      }
    });
    if (allCorrect) {
      completeActivity(actId, mode, true, 'spelling_bee');
    } else {
      screenShake();
      trackFeedback(false);
    }
  };

  // ─── Speaking Game (Produce) ───
  function renderSpeakingGame(body, data, actId) {
    let rawItems = [];
    if (data) {
      if (Array.isArray(data)) {
        rawItems = data;
      } else if (typeof data === 'object') {
        const arraysToTry = [
          data.prompts,
          data.rounds,
          data.sentences,
          data.questions,
          data.cards,
          data.items,
          data.pairs
        ];
        for (const arr of arraysToTry) {
          if (Array.isArray(arr) && arr.length > 0) {
            rawItems = arr;
            break;
          }
        }
        if (rawItems.length === 0) {
          if (data.prompt) rawItems.push(data.prompt);
          else if (data.text) rawItems.push(data.text);
          else if (data.question) rawItems.push(data.question);
          else if (data.statement) rawItems.push(data.statement);
        }
      } else if (typeof data === 'string') {
        rawItems = [data];
      }
    }

    if (!rawItems || rawItems.length === 0) {
      rawItems = ["Let's speak on the target topic!", "Discuss how you can apply these learnings in real life.", "Share your thoughts about this lesson."];
    }

    body.innerHTML = '<div class="produce-questions-wrapper" style="text-align: left; margin: 16px 0;">' + 
      rawItems.map((item, i) => {
        let pText = '';
        let starters = null;
        let idioms = null;
        let sampleAnswer = null;
        let spokenSupport = null;

        if (typeof item === 'string') {
          pText = item;
        } else if (item && typeof item === 'object') {
          let prefix = '';
          if (item.type) {
            prefix += '<strong>[' + esc(item.type.toUpperCase()) + ']</strong> ';
          } else if (item.role) {
            prefix += '<strong>[' + esc(item.role.toUpperCase()) + ']</strong> ';
          }
          const textVal = item.text || item.prompt || item.question || item.front || item.left || '';
          const suffixVal = item.back || item.right ? ' &rarr; ' + (item.back || item.right) : '';
          pText = prefix + (typeof textVal === 'string' ? esc(textVal) : '') + (suffixVal ? esc(suffixVal) : '');
          if (!pText) pText = esc(JSON.stringify(item));

          starters = Array.isArray(item.starters) ? item.starters : (Array.isArray(item.recommendPhrases) ? item.recommendPhrases : (Array.isArray(item.phrases) ? item.phrases : null));
          idioms = Array.isArray(item.idioms) ? item.idioms : (Array.isArray(item.expressions) ? item.expressions : null);
          sampleAnswer = typeof item.sampleAnswer === 'string' ? item.sampleAnswer : (typeof item.modelAnswer === 'string' ? item.modelAnswer : null);
          spokenSupport = Array.isArray(item.spokenSupport) ? item.spokenSupport : (Array.isArray(item.vocab) ? item.vocab : null);
        } else {
          pText = String(item);
        }

        const startersAttr = (starters && starters.length) ? escAttr(JSON.stringify(starters)) : '';
        const idiomsAttr = (idioms && idioms.length) ? escAttr(JSON.stringify(idioms)) : '';
        const sampleAnswerAttr = sampleAnswer ? escAttr(sampleAnswer) : '';
        const spokenSupportAttr = (spokenSupport && spokenSupport.length) ? escAttr(JSON.stringify(spokenSupport)) : '';

        return '<div class="clickable-produce-question" onclick="focusProduceQuestion(this)" ' +
          (startersAttr ? 'data-starters="' + startersAttr + '" ' : '') +
          (idiomsAttr ? 'data-idioms="' + idiomsAttr + '" ' : '') +
          (sampleAnswerAttr ? 'data-sample-answer="' + sampleAnswerAttr + '" ' : '') +
          (spokenSupportAttr ? 'data-spoken-support="' + spokenSupportAttr + '" ' : '') +
          'style="padding: 12px 16px; margin-bottom: 12px; border-radius: var(--radius); cursor: pointer; border: 1px solid var(--border); transition: all 0.2s; display: flex; align-items: flex-start; gap: 8px;">' +
          '<span style="color: var(--primary); font-weight: 700; font-size: 1.05rem;">🎲 ' + (i + 1) + '.</span>' +
          '<span class="q-text-content" style="font-size: 0.95rem; font-weight: 600; line-height: 1.4;">' + pText + '</span>' +
          '</div>';
      }).join('') + 
    '</div>';
    body.dataset.prompts = JSON.stringify(rawItems);
  }
  window.nextSpeakingPrompt = function(actId) {
    // Deprecated for list view
  };

  // ─── Debate (Produce) ───
  function renderDebate(body, data, actId) {
    body.innerHTML = '<h4 style="text-align:center;margin-bottom:16px">' + esc(data.statement || '') + '</h4>' +
      '<div class="debate-container">' +
      '<div class="debate-side debate-for"><h5>✅ For</h5>' + (data.forArguments || []).map(a => '<p>• ' + esc(a) + '</p>').join('') + '</div>' +
      '<div class="debate-side debate-against"><h5>❌ Against</h5>' + (data.againstArguments || []).map(a => '<p>• ' + esc(a) + '</p>').join('') + '</div>' +
      '</div>' +
      (data.timeLimitSeconds ? '<div style="text-align:center;margin-top:12px"><button class="act-btn act-btn-primary" onclick="startDebateTimer(this,' + data.timeLimitSeconds + ')">⏱ Start Timer (' + data.timeLimitSeconds + 's)</button></div>' : '');
  }
  window.startDebateTimer = function(btn, seconds) {
    btn.disabled = true;
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      btn.textContent = '⏱ ' + remaining + 's';
      if (remaining <= 0) { clearInterval(interval); btn.textContent = '⏰ Time\\'s up!'; }
    }, 1000);
  };

  // ─── Taboo (Produce) ───
  function renderTaboo(body, data, actId) {
    const cards = data.cards || [];
    if (!cards.length) return;
    let idx = 0;
    function showCard(index) {
      const c = cards[index % cards.length];
      let html = '<div style="max-width: 600px; margin: 0 auto; text-align: center;">';
      html += '<div class="flashcard-container" style="justify-content: center; align-items: center; margin-bottom: 20px;">';
      html += '<div class="flashcard" style="width: 100%; height: 250px;" onclick="this.classList.toggle(\\'flipped\\')">' +
        '<div class="flashcard-inner">' +
        '<div class="flashcard-front" style="font-size: 2rem;"><div>Card ' + (index + 1) + ' of ' + cards.length + '<br><span style="font-size:1.2rem;color:var(--text-muted);display:block;margin-top:10px;">(Tap to Reveal Taboo Play)</span></div></div>' +
        '<div class="flashcard-back" style="font-size: 1.2rem; background: linear-gradient(135deg, var(--bg2), var(--bg3));"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%">' +
        '<strong style="font-size:2.5rem;color:var(--primary);margin-bottom:20px;">' + esc(c.word) + '</strong>' +
        '<div class="taboo-forbidden" style="font-size:1.5rem;color:var(--danger)">🚫 ' + c.tabooWords.map(w => esc(w)).join('<br>🚫 ') + '</div>' +
        '</div></div></div></div></div>';
      
      html += '<div style="text-align:center;margin-top:12px"><button class="act-btn act-btn-primary" onclick="nextTaboo(\\'' + actId + '\\')">Next Card →</button></div></div>';
      body.innerHTML = html;
    }
    showCard(idx);
    body.dataset.tabooIdx = '0';
    body.dataset.tabooCards = JSON.stringify(cards);
  }
  window.nextTaboo = function(actId) {
    const card = document.getElementById(actId);
    const body = card ? card.querySelector('.activity-body') : null;
    if (!body) return;
    let idx = parseInt(body.dataset.tabooIdx || '0') + 1;
    const cards = JSON.parse(body.dataset.tabooCards);
    const c = cards[idx % cards.length];
    body.dataset.tabooIdx = String(idx);
    
    let html = '<div style="max-width: 600px; margin: 0 auto; text-align: center;">';
    html += '<div class="flashcard-container" style="justify-content: center; align-items: center; margin-bottom: 20px;">';
    html += '<div class="flashcard" style="width: 100%; height: 250px;" onclick="this.classList.toggle(\\'flipped\\')">' +
      '<div class="flashcard-inner">' +
      '<div class="flashcard-front" style="font-size: 2rem;"><div>Card ' + (idx + 1) + ' of ' + cards.length + '<br><span style="font-size:1.2rem;color:var(--text-muted);display:block;margin-top:10px;">(Tap to Reveal Taboo Play)</span></div></div>' +
      '<div class="flashcard-back" style="font-size: 1.2rem; background: linear-gradient(135deg, var(--bg2), var(--bg3));"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%">' +
      '<strong style="font-size:2.5rem;color:var(--primary);margin-bottom:20px;">' + esc(c.word) + '</strong>' +
      '<div class="taboo-forbidden" style="font-size:1.5rem;color:var(--danger)">🚫 ' + c.tabooWords.map(w => esc(w)).join('<br>🚫 ') + '</div>' +
      '</div></div></div></div></div>';
    
    html += '<div style="text-align:center;margin-top:12px"><button class="act-btn act-btn-primary" onclick="nextTaboo(\\'' + actId + '\\')">Next Card →</button></div></div>';
    body.innerHTML = html;
  };

  // ─── Information Gap ───
  function renderInfoGap(body, data, actId) {
    body.innerHTML = '<div class="info-gap-container">' +
      '<div class="info-gap-side"><h4>👤 Student A</h4><div>' + (data.sideA || '') + '</div></div>' +
      '<div class="info-gap-side"><h4>👤 Student B</h4><div>' + (data.sideB || '') + '</div></div></div>' +
      (data.questions ? '<div style="margin-top:12px"><h5>Questions:</h5>' + data.questions.map(q => '<p>• ' + esc(q) + '</p>').join('') + '</div>' : '');
  }

  // ─── One Minute Challenge ───
  function renderOneMinute(body, data, actId) {
    const time = data.timeLimitSeconds || 60;
    body.innerHTML = '<div class="speaking-prompt">' + esc(data.topic || 'Speak about anything!') + '</div>' +
      '<div style="text-align:center;margin-top:16px"><div id="omc-timer-' + actId + '" style="font-size:3rem;font-weight:700">' + time + '</div>' +
      '<button class="act-btn act-btn-primary" style="font-size:1.2rem" onclick="startOneMinute(\\'' + actId + '\\',' + time + ')">▶ Start</button></div>';
  }
  window.startOneMinute = function(actId, time) {
    let remaining = time;
    const display = document.getElementById('omc-timer-' + actId);
    const interval = setInterval(() => {
      remaining--;
      display.textContent = remaining;
      if (remaining <= 10) display.style.color = 'var(--danger)';
      if (remaining <= 0) { clearInterval(interval); display.textContent = '⏰ Done!'; }
    }, 1000);
  };

  // ─── Shadowing ───
  function renderShadowing(body, data, actId) {
    const sentences = data.sentences && data.sentences.length ? data.sentences : [{ text: "Error: No sentences provided by AI. Please try this sample sentence." }];
    let html = '<div style="max-width: 600px; margin: 0 auto; text-align: center;">';
    sentences.forEach((s, i) => {
      html += '<div style="margin-bottom:12px;padding:16px;border:2px solid var(--border);border-radius:12px;background:var(--bg2);display:flex;align-items:center;gap:16px;box-shadow:0 4px 10px rgba(0,0,0,0.05);">' +
        '<button class="act-btn act-btn-primary" style="font-size:1.5rem;padding:12px 20px;border-radius:50%;" onclick="speakWord(\\'' + escJs(s.text) + '\\')">🔊</button>' +
        '<span style="font-size:1.4rem;font-weight:600;color:var(--text);flex:1;text-align:left;line-height:1.6;">' + esc(s.text) + '</span></div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }

  // ─── Minimal Pairs ───
  function renderMinimalPairs(body, data, actId, mode) {
    const pairs = data.pairs || [];
    let html = '';
    pairs.forEach((p, i) => {
      html += '<div class="mcq-question" id="mp-' + actId + '-' + i + '" style="margin-bottom:16px">' +
        '<button class="act-btn act-btn-primary" onclick="speakWord(\\'' + escJs(p['word' + p.correct]) + '\\')">🔊 Listen</button>' +
        '<div class="mcq-options" style="flex-direction:row;gap:12px;margin-top:8px">' +
        '<div class="mcq-opt" style="flex:1;text-align:center;font-size:1.2rem" data-answer="A" data-val="A" data-correct="' + p.correct + '" onclick="checkMinPair(this,\\'' + actId + '\\',\\'' + mode + '\\',' + pairs.length + ')">' + esc(p.wordA) + '</div>' +
        '<div class="mcq-opt" style="flex:1;text-align:center;font-size:1.2rem" data-answer="B" data-val="B" data-correct="' + p.correct + '" onclick="checkMinPair(this,\\'' + actId + '\\',\\'' + mode + '\\',' + pairs.length + ')">' + esc(p.wordB) + '</div>' +
        '</div></div>';
    });
    body.innerHTML = html;
  }
  window.checkMinPair = function(el, actId, mode, total) {
    const parent = el.closest('.mcq-question');
    if (parent.dataset.answered) return;
    parent.dataset.answered = 'true';
    const isCorrect = el.dataset.val === el.dataset.correct;
    el.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      parent.querySelectorAll('.mcq-opt').forEach(o => { if (o.dataset.val === o.dataset.correct) o.classList.add('correct'); });
      resetStreak(); screenShake();
    } else { incrementStreak(); }
    const card = document.getElementById(actId);
    if (card.querySelectorAll('.mcq-question[data-answered]').length >= total) {
      completeActivity(actId, mode, true, 'minimal_pairs');
    }
  };

  // ─── Contextual MC ───
  function renderContextualMC(body, data, actId, mode) {
    let html = '';
    if (data.context) {
      html += '<div class="lesson-text-context" style="margin-bottom: 24px; padding: 16px; background: var(--bg2); border-left: 4px solid var(--primary); border-radius: 8px; line-height: 1.8;">' + 
        (typeof data.context === 'string' ? data.context : esc(data.context)) + 
        '</div>';
    }
    // Render questions as MCQ
    const questions = data.questions || [];
    questions.forEach((q, qi) => {
      html += '<div class="mcq-question" id="ctxmc-' + actId + '-' + qi + '"><h5>' + (qi+1) + '. ' + esc(q.question) + '</h5><div class="mcq-options">';
      (q.options || []).forEach(opt => {
        html += '<div class="mcq-opt" data-answer="' + escAttr(q.answer) + '" data-val="' + escAttr(opt) + '" onclick="checkMCQ(this,\\'' + actId + '\\',\\'' + mode + '\\',' + questions.length + ')">' + esc(opt) + '</div>';
      });
      html += '</div></div>';
    });
    body.innerHTML = html;
  }

  // ─── Listening MC ───
  function renderListeningMC(body, data, actId, mode) {
    let html = '';
    if (data.audioText) {
      html += '<div style="margin-bottom:12px"><button class="act-btn act-btn-primary" onclick="speakWord(\\'' + escJs(data.audioText) + '\\')">🔊 Play Audio</button></div>';
    }
    if (data.audioUrl) {
      html += '<audio controls src="' + escAttr(data.audioUrl) + '" style="width:100%;margin-bottom:12px"></audio>';
    }
    // Render questions as MCQ
    const questions = data.questions || [];
    questions.forEach((q, qi) => {
      html += '<div class="mcq-question" id="lmc-' + actId + '-' + qi + '"><h5>' + (qi+1) + '. ' + esc(q.question) + '</h5><div class="mcq-options">';
      (q.options || []).forEach(opt => {
        html += '<div class="mcq-opt" data-answer="' + escAttr(q.answer) + '" data-val="' + escAttr(opt) + '" onclick="checkMCQ(this,\\'' + actId + '\\',\\'' + mode + '\\',' + questions.length + ')">' + esc(opt) + '</div>';
      });
      html += '</div></div>';
    });
    body.innerHTML = html;
  }

  // ─── Timed Reading ───
  function renderTimedReading(body, data, actId, mode) {
    let started = false;
    body.innerHTML = '<div id="tr-passage-' + actId + '" style="display:none;line-height:1.8;margin-bottom:16px">' + esc(data.passage || '') + '</div>' +
      '<button class="act-btn act-btn-primary" id="tr-start-' + actId + '" onclick="startTimedReading(\\'' + actId + '\\')">▶ Start Reading</button>' +
      '<div id="tr-timer-' + actId + '" style="font-size:1.2rem;font-weight:700;margin:8px 0"></div>' +
      '<div id="tr-questions-' + actId + '" style="display:none"></div>';
    body.dataset.passage = data.passage || '';
    body.dataset.wordCount = String(data.wordCount || (data.passage || '').split(/\\s+/).length);
    body.dataset.questions = JSON.stringify(data.questions || []);
    body.dataset.actId = actId;
    body.dataset.mode = mode;
  }
  window.startTimedReading = function(actId) {
    document.getElementById('tr-passage-' + actId).style.display = 'block';
    document.getElementById('tr-start-' + actId).style.display = 'none';
    const startTime = Date.now();
    const timerEl = document.getElementById('tr-timer-' + actId);
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timerEl.textContent = '⏱ ' + elapsed + 's';
    }, 1000);
    // Add "Done Reading" button
    const doneBtn = document.createElement('button');
    doneBtn.className = 'act-btn act-btn-success';
    doneBtn.textContent = '✅ Done Reading';
    doneBtn.style.marginTop = '12px';
    doneBtn.onclick = function() {
      clearInterval(interval);
      const elapsed = (Date.now() - startTime) / 60000;
      const body = document.getElementById(actId).querySelector('.activity-body');
      const wc = parseInt(body.dataset.wordCount);
      const wpm = Math.round(wc / elapsed);
      timerEl.textContent = '📖 ' + wpm + ' WPM';
      doneBtn.remove();
      // Show questions
      const qContainer = document.getElementById('tr-questions-' + actId);
      qContainer.style.display = 'block';
      const questions = JSON.parse(body.dataset.questions);
      renderMCQ(qContainer, { questions }, actId, body.dataset.mode);
    };
    document.getElementById('tr-passage-' + actId).after(doneBtn);
  };

  // ─── Text Reconstruction / Paragraph Organizer ───
  function renderTextReconstruction(body, data, actId, mode) {
    const paras = data.paragraphs || data.sentences || [];
    const correctOrder = data.correctOrder || paras.map((_, i) => i);
    const shuffled = paras.map((p, i) => ({ text: p, idx: i })).sort(() => Math.random() - 0.5);
    body.innerHTML = '<p style="color:var(--text2);margin-bottom:8px">Drag or use arrows to reorder:</p>' +
      '<div class="seq-items" id="seq-' + actId + '">' +
      shuffled.map(s => '<div class="seq-item" data-orig="' + s.idx + '"><span class="seq-arrows"><button onclick="moveSeq(this,-1)">▲</button><button onclick="moveSeq(this,1)">▼</button></span><span>' + esc(s.text) + '</span></div>').join('') +
      '</div><button class="act-btn act-btn-primary" style="margin-top:8px" onclick="checkSequence(\\'' + actId + '\\',\\'' + mode + '\\',[' + correctOrder.join(',') + '])">Check Order</button>';
  }

  // ─── Grammar Reference ───
  function renderGrammarRef(body, data) {
    let cards = [];
    if (Array.isArray(data)) {
      if (data.length > 0 && Array.isArray(data[0].cards)) {
        cards = data.flatMap((d) => d.cards || []);
      } else {
        cards = data;
      }
    } else if (data) {
      cards = data.cards || [];
    }
    body.innerHTML = cards.map(c =>
      '<div class="concealed-block"><div class="concealed-label" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\'none\\'?\\'block\\':\\'none\\'">' + esc(c.title || c.rule || 'Grammar Rule') + '</div>' +
      '<div class="concealed-content" style="display:none">' + (c.content || c.description || '') +
      (c.examples ? '<ul>' + (Array.isArray(c.examples) ? c.examples.map((e) => '<li>' + esc(e) + '</li>').join('') : '<li>' + esc(c.examples) + '</li>') + '</ul>' : '') + '</div></div>'
    ).join('') || '<p>No grammar content available.</p>';
  }

  // ─── Word Formation ───
  function renderWordFormation(body, data, actId, mode) {
    const rows = data.rows || [];
    let html = '<table class="vocab-table"><thead><tr><th>Noun</th><th>Verb</th><th>Adjective</th></tr></thead><tbody>';
    rows.forEach((r, i) => {
      const gap = r.gap;
      html += '<tr>';
      ['noun','verb','adjective'].forEach(col => {
        if (col === gap) {
          html += '<td><input class="gf-input" style="width:100%" data-answer="' + escAttr(r[col]) + '" placeholder="?"></td>';
        } else {
          html += '<td>' + esc(r[col]) + '</td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table><button class="act-btn act-btn-primary" style="margin-top:8px" onclick="checkWordFormation(\\'' + actId + '\\',\\'' + mode + '\\')">Check</button>';
    body.innerHTML = html;
  }
  window.checkWordFormation = function(actId, mode) {
    const card = document.getElementById(actId);
    const inputs = card.querySelectorAll('.gf-input');
    let allCorrect = true;
    inputs.forEach(inp => {
      if (fuzzyMatch(inp.value, inp.dataset.answer)) {
        inp.classList.add('correct');
      } else {
        inp.classList.add('incorrect');
        allCorrect = false;
      }
    });
    if (allCorrect) { completeActivity(actId, mode, true, 'word_formation'); incrementStreak(); }
    else { resetStreak(); screenShake(); trackFeedback(false); }
  };

  // ─── Pattern Drills ───
  function renderPatternDrills(body, data, actId, mode) {
    const drills = data.drills || [];
    let html = '';
    drills.forEach((d, i) => {
      html += '<div class="gf-sentence" style="margin-bottom:16px"><p><strong>' + esc(d.instruction) + '</strong></p>' +
        '<p style="color:var(--text2)">' + esc(d.prompt) + '</p>' +
        '<input class="act-input" data-answer="' + escAttr(d.answer) + '" placeholder="Type your answer...">' +
        '</div>';
    });
    html += '<button class="act-btn act-btn-primary" onclick="checkPatternDrills(\\'' + actId + '\\',\\'' + mode + '\\')">Check All</button>';
    body.innerHTML = html;
  }
  window.checkPatternDrills = function(actId, mode) {
    const card = document.getElementById(actId);
    const inputs = card.querySelectorAll('.act-input[data-answer]');
    let allCorrect = true;
    inputs.forEach(inp => {
      if (fuzzyMatch(inp.value, inp.dataset.answer)) {
        inp.classList.add('correct');
        incrementStreak();
      } else {
        inp.classList.add('incorrect');
        allCorrect = false;
        resetStreak();
      }
    });
    if (allCorrect) completeActivity(actId, mode, true, 'pattern_drills');
    else { screenShake(); trackFeedback(false); }
  };

  // ─── List ───
  function renderList(body, data) {
    const items = data.items || [];
    const tag = data.ordered ? 'ol' : 'ul';
    body.innerHTML = '<' + tag + ' style="padding-left:20px">' + items.map(i => '<li style="margin-bottom:4px">' + esc(i) + '</li>').join('') + '</' + tag + '>';
  }

  // ─── Questions ───
  function renderQuestions(body, data) {
    const questions = data.questions || [];
    body.innerHTML = '<div class="produce-questions-wrapper">' + 
      questions.map((q, i) => 
        '<div class="clickable-produce-question" onclick="focusProduceQuestion(this)" style="padding: 10px 14px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; border: 1px solid var(--border); transition: all 0.2s; display: flex; align-items: flex-start; gap: 8px;">' +
        '<strong style="color: var(--primary); font-size: 1.05rem;">' + (i+1) + '.</strong>' +
        '<span class="q-text-content" style="font-size: 0.95rem; font-weight: 600; line-height: 1.4;">' + esc(q) + '</span>' +
        '</div>'
      ).join('') + 
    '</div>';
  }

  // ─── Sorting ───
  function renderSorting(body, data, actId, mode) {
    const categories = data.categories || [];
    const allItems = [];
    categories.forEach(cat => cat.items.forEach(item => allItems.push({ item, category: cat.name })));
    allItems.sort(() => Math.random() - 0.5);

    let html = '<div style="margin-bottom:12px"><strong>Sort items into categories:</strong></div>';
    html += '<div class="scramble-words" id="sort-bank-' + actId + '">' +
      allItems.map(a => '<span class="scramble-chip" draggable="true" data-cat="' + escAttr(a.category) + '" onclick="pickSortItem(this,\\'' + actId + '\\')">' + esc(a.item) + '</span>').join('') + '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(' + Math.min(3, categories.length) + ',1fr);gap:8px;margin-top:12px">';
    categories.forEach(cat => {
      html += '<div class="scramble-target" style="min-height:80px" data-cat-name="' + escAttr(cat.name) + '" onclick="dropSortItem(this,\\'' + actId + '\\')"><div style="font-weight:600;margin-bottom:4px">' + esc(cat.name) + '</div></div>';
    });
    html += '</div>';
    html += '<button class="act-btn act-btn-primary" style="margin-top:12px" onclick="checkSorting(\\'' + actId + '\\',\\'' + mode + '\\')">Check</button>';
    body.innerHTML = html;
    body.dataset.selectedSortItem = '';
  }
  window.pickSortItem = function(chip, actId) {
    if (chip.classList.contains('placed')) return;
    const body = chip.closest('.activity-body');
    body.querySelectorAll('.scramble-chip.sort-selected').forEach(c => c.classList.remove('sort-selected'));
    chip.classList.add('sort-selected');
    chip.style.outline = '2px solid var(--primary)';
    body.dataset.selectedSortItem = chip.textContent;
  };
  window.dropSortItem = function(target, actId) {
    const body = target.closest('.activity-body');
    const selected = body.querySelector('.scramble-chip.sort-selected');
    if (!selected) return;
    selected.classList.add('placed');
    selected.classList.remove('sort-selected');
    selected.style.outline = '';
    const clone = selected.cloneNode(true);
    clone.classList.remove('placed');
    clone.onclick = function() { clone.remove(); selected.classList.remove('placed'); };
    target.appendChild(clone);
    body.dataset.selectedSortItem = '';
  };
  window.checkSorting = function(actId, mode) {
    const card = document.getElementById(actId);
    const targets = card.querySelectorAll('.scramble-target');
    let allCorrect = true;
    targets.forEach(target => {
      const catName = target.dataset.catName;
      const chips = target.querySelectorAll('.scramble-chip');
      chips.forEach(chip => {
        if (chip.dataset.cat === catName) {
          chip.style.background = 'var(--success)'; chip.style.color = '#fff';
        } else {
          chip.style.background = 'var(--danger)'; chip.style.color = '#fff';
          allCorrect = false;
        }
      });
    });
    if (allCorrect) { completeActivity(actId, mode, true, 'sorting'); incrementStreak(); }
    else { resetStreak(); screenShake(); trackFeedback(false); }
  };

  // ═══════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════

  function init() {
    initTTS();
    // Restore state
    if (state.avatar) {
      const av = document.getElementById('avatar-display');
      if (av) {
          const isRealImg = typeof state.avatar === 'string' && (state.avatar.startsWith('data:image/') || state.avatar.startsWith('http://') || state.avatar.startsWith('https://') || state.avatar.startsWith('blob:'));
          if (isRealImg) {
              av.innerHTML = '<img src="' + escAttr(state.avatar) + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">';
          } else {
              av.innerHTML = escHtml(state.avatar);
          }
      }
    } else {
      // Show avatar modal
      const modal = document.getElementById('avatar-modal');
      if (modal) modal.classList.remove('hidden');
    }
    
    // (The cat mascot is an SVG now; the old catEmoji element no longer exists.)

    // The cat is ALWAYS shown on load: dismissing it only lasts for that session.
    if (CONFIG.mascot) {
      catDismissed = false;
      state.catHidden = false;
      const cm = document.getElementById('cat-mascot');
      if (cm) {
        cm.classList.remove('cat-dismissed');
        cm.classList.toggle('is-muted', !!state.catMuted);
        cm.style.display = '';
        cm.style.visibility = '';
        cm.style.pointerEvents = '';
      }
      const dock = document.getElementById('cat-companion-dock');
      if (dock) dock.style.display = '';
      const muteIcon = document.getElementById('cat-mute-icon');
      if (muteIcon) muteIcon.textContent = state.catMuted ? '🔇' : '🔊';
      const muteBtn = document.getElementById('cat-mute-btn');
      if (muteBtn) muteBtn.classList.toggle('muted', !!state.catMuted);
      // Keep the hover-to-read badge in sync with the real flag (it starts ON).
      const hoverBadge = document.getElementById('cat-hover-badge');
      if (hoverBadge) {
        hoverBadge.textContent = hoverReadActive ? 'ON' : 'OFF';
        hoverBadge.classList.toggle('active', hoverReadActive);
      }
    }

    // Restore notes
    const ta = document.getElementById('notes-textarea');
    if (ta && state.notes) ta.value = state.notes;
    // Update sidebar
    updateSidebar();
    // Switch to saved tab
    if (state.activeTab) switchTab(state.activeTab);
    // Auto-open first section
    const firstSection = document.querySelector('#tab-prepare .section-accordion');
    if (firstSection && !firstSection.classList.contains('open')) {
      toggleSection(firstSection.id);
    }
    // Cat greeting
    if (CONFIG.mascot) {
      setTimeout(() => catSay("Hi " + CONFIG.learnerName + "! 😺 Let's learn English together!", '😺'), 1000);
    }
    // Set default theme
    const defaultTheme = '${config.defaultTheme}';
    if (defaultTheme && defaultTheme !== 'default') {
      document.body.classList.add('theme-' + defaultTheme);
    }

    // Initialize produce mode slides
    if (totalProduceSlides > 0) showProduceSlide(0);

    // Hover reading (cat reads text on hover)
    if (CONFIG.mascot && CONFIG.tts) {
      document.body.addEventListener('mouseover', function(e) {
        if (state.catMuted || catDismissed || !hoverReadActive) return;
        if (e.target && e.target.closest && e.target.closest('.cat-mascot')) return;
        
        // Find the closest text container element that is hover-readable
        const target = e.target.closest('p, li, td, .gf-sentence, .speaking-prompt, h1, h2, h3, h4, h5, .activity-title, .section-title, .mcq-option, .q-text-content, .recommended-phrase');
        if (!target) return;
        
        // Ensure we haven't already read this element on this hover
        if (target.dataset.hoverReadActive) return;
        
        // Mark all other elements as not active, and this one as active
        document.querySelectorAll('[data-hover-read-active]').forEach(el => el.removeAttribute('data-hover-read-active'));
        target.dataset.hoverReadActive = "true";
        
        // Extract inner text
        let text = target.innerText || target.textContent || "";
        
        // Keep only actual readable English text - remove card numbers like "Card 1 of 5", "Question 3", etc., and emojis
        text = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); 
        text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); 
        text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); 
        text = text.replace(/[\u{2600}-\u{26FF}]/gu, ''); 
        text = text.replace(/[\u{2700}-\u{27BF}]/gu, ''); 
        
        text = text.replace(/Card\\s+\\d+\\s+of\\s+\\d+/gi, '');
        text = text.replace(/Question\\s+\\d+/gi, '');
        text = text.replace(/^[Q]\\d+[:.-]?\\s*/gi, ''); // e.g. "Q1:" -> ""
        
        text = text.replace(/\\s+/g, ' ').trim();
        
        // Only read if it's a valid sentence
        if (text.length > 2 && text.length < 300) {
          if (window.hoverSpeechTimeout) clearTimeout(window.hoverSpeechTimeout);
          window.hoverSpeechTimeout = setTimeout(() => {
            speak(text);
          }, 150);
        }
      });
      
      document.body.addEventListener('mouseout', function(e) {
        const target = e.target.closest('p, li, td, .gf-sentence, .speaking-prompt, h1, h2, h3, h4, h5, .activity-title, .section-title, .mcq-option, .q-text-content, .recommended-phrase');
        if (target) {
          target.removeAttribute('data-hover-read-active');
        }
        if (window.hoverSpeechTimeout) clearTimeout(window.hoverSpeechTimeout);
      });
    }

    // Append vibration style for V2
    if (!document.getElementById('vibrate-v2-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'vibrate-v2-style';
      styleEl.innerHTML = \`
        @keyframes vibrateV2 {
          0%, 100% { transform: scale(1) rotate(0deg); }
          20% { transform: scale(1.05) rotate(-3deg); }
          40% { transform: scale(1.05) rotate(3deg); }
          60% { transform: scale(1.05) rotate(-3deg); }
          80% { transform: scale(1.05) rotate(3deg); }
        }
        .vibrating-v2-btn {
          animation: vibrateV2 2.5s infinite ease-in-out;
        }
        .vibrating-v2-btn:hover {
          animation-play-state: paused;
          transform: scale(1.1) !important;
        }
      \`;
      document.head.appendChild(styleEl);
    }

    // Standalone walkthrough button removed to prevent duplication above MasterWidget
  }

  window.startInteractiveWalkthroughV2 = function() {
    const mode = CONFIG.isPresenter ? 'presenter' : 'learner';
      
      // Inject highlight styles if not present
      if (!document.getElementById('walkthrough-tour-styles')) {
        const style = document.createElement('style');
        style.id = 'walkthrough-tour-styles';
        style.innerHTML = \`
          .tour-highlight {
            outline: 4px solid #8b5cf6 !important;
            outline-offset: 4px !important;
            box-shadow: 0 0 25px rgba(139,92,246,0.95) !important;
            transition: all 0.3s ease-in-out !important;
            animation: tour-pulse-v2 1.2s infinite alternate !important;
            z-index: 9999999 !important;
          }
          @keyframes tour-pulse-v2 {
            from { box-shadow: 0 0 10px rgba(139,92,246,0.4); }
            to { box-shadow: 0 0 30px rgba(139,92,246,0.9); }
          }
        \`;
        document.head.appendChild(style);
      }

      function highlightElement(selector) {
        document.querySelectorAll('.tour-highlight').forEach(el => {
          el.classList.remove('tour-highlight');
          if (el.dataset.originalPositionStatic === 'true') {
            el.style.removeProperty('position');
          }
        });
        if (!selector) return;
        const el = document.querySelector(selector);
        if (el) {
          const style = window.getComputedStyle(el);
          if (style.position === 'static') {
            el.style.setProperty('position', 'relative', 'important');
            el.dataset.originalPositionStatic = 'true';
          }
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('tour-highlight');
        }
      }

      let steps = [];

      // Speak function for reading tour slides out loud without emojis
      let currentUtterance = null;
      function speakText(text) {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const cleanText = cleanForSpeech(text);
          if (!cleanText) return;
          
          const utterance = new SpeechSynthesisUtterance(cleanText);
          const voices = window.speechSynthesis.getVoices();
          const engVoice = voices.find(v => v.lang.startsWith('en-US') && v.name.includes('Natural')) || 
                           voices.find(v => v.lang.startsWith('en')) || 
                           voices[0];
          if (engVoice) utterance.voice = engVoice;
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
          currentUtterance = utterance;
        }
      }

      if (mode === 'presenter') {
        steps = [
          {
            title: "Welcome, Teacher! 🍎",
            text: "Welcome to <strong>Micro Lesson V2</strong>! Let's explore how to guide your students through three comprehensive phases: <strong>Prepare</strong>, <strong>Practice</strong>, and <strong>Produce</strong>.",
            target: "#top-nav",
            action: () => {
              if (window.closeWb) window.closeWb(); else { const w = document.getElementById('wb-overlay'); if(w) w.style.display='none'; }
              if (window.switchTab) window.switchTab('prepare');
            }
          },
          {
            title: "Phase Tabs & Lesson Stages 🗺️",
            text: "Use these top buttons to navigate. We begin in the **Prepare** tab to teach new vocabulary, move to **Practice** for interactive questions, and finish in **Produce** for independent output.",
            target: "#top-nav",
            action: () => {}
          },
          {
            title: "Teacher Sidebar & Habit Tracker ⏱️",
            text: "This is the Left Sidebar. Here you'll find student stats, avatar selection, and the **Session Timer**! To cultivate consistent study habits, our system encourages students to focus daily. As they study, their **habit plant** grows from a withered seed (🥀) to a sprout (🌱), to a blossomed plant (🪴🌺), and eventually to a majestic tree (🌳)! Inspire your students to hit 30 minutes every single day.",
            target: "#prepare-sidebar",
            action: () => { if (window.switchTab) window.switchTab('prepare'); }
          },
          {
            title: "Mascot Hover TTS 🔊",
            text: "V2 features a smart **Mascot**. Hovering over any passage, question, or table row automatically reads it aloud using professional Edge voices. Try it out to help students learn perfect pronunciation!",
            target: "#avatar-display",
            action: () => {}
          },
          {
            title: "Closed Captions & Subtitles 💬",
            text: "Speak clearly and let students read along! Use the interactive <strong>Closed Captions</strong> panel to display live transcripts and hover translations.",
            target: "#subtitle-toggle-btn",
            action: () => {
              const btn = document.getElementById('subtitle-toggle-btn');
              if (btn && (!document.getElementById('subtitle-controls') || document.getElementById('subtitle-controls').style.display === 'none')) {
                btn.click();
              }
              setTimeout(() => { highlightElement('#subtitle-controls'); }, 150);
            }
          },
          {
            title: "Change Voice Engine 🎙️",
            text: "Switch narrator voices instantly! Click the <strong>Voice button</strong> to choose from professional international native voices for read-aloud features.",
            target: "#global-voice-btn",
            action: () => {
              const btn = document.getElementById('global-voice-btn');
              if (btn) btn.click();
              setTimeout(() => { highlightElement('#global-voice-dropdown'); }, 150);
            }
          },
          {
            title: "Read Aloud & Pronunciation 🔊",
            text: "Highlight any passage or word and click <strong>Read Selected Text</strong> to read it out loud. Use the red stop button to cancel playback at any time.",
            target: "#read-selected-btn",
            action: () => {
              const dropdown = document.getElementById('global-voice-dropdown'); if (dropdown) dropdown.style.display = 'none';
              highlightElement('#read-selected-btn');
            }
          },
          {
            title: "Speaking & Shadow Mode 👣",
            text: "Practice speech with **Shadow Mode**! Click to listen to professional Edge native narration, repeat into the microphone, and receive instant precision feedback.",
            target: "#shadow-mode-btn",
            action: () => {
              if (window.openShadowMode) {
                window.openShadowMode("Let's practice speaking English together!");
                setTimeout(() => { highlightElement('#shadow-mode-overlay .shadow-card'); }, 150);
              }
            }
          },
          {
            title: "L1 Language Translation 🌐",
            text: "Overcome language barriers! Hover translations instantly show words in L1 languages. Click to toggle translation overlays, or hold for a dynamic L1 float bubble.",
            target: "#toggle-translations-btn",
            action: () => {
              const s = document.getElementById('shadow-mode-overlay'); if(s) s.style.display='none';
              highlightElement('#toggle-translations-btn');
            }
          },
          {
            title: "Media Search & Manager 📁",
            text: "Bring your slides to life! Search YouTube videos, Tenor GIFs, Pixabay, Unsplash, and Wikimedia inside the **Media Manager** to support your lesson topics.",
            target: "#flashcard-canvas-btn",
            action: () => {
              highlightElement('#flashcard-canvas-btn');
            }
          },
          {
            title: "Smart Dictionary & Deep Search 🔍",
            text: "Need extra definitions or examples? Highlight any word and click the green search button to open dictionaries, translation matrices, and images.",
            target: "#search-btn",
            action: () => {
              highlightElement('#search-btn');
            }
          },
          {
            title: "Emoji Reaction Stamp 🎭",
            text: "Sticker stamp reactions! Press to load emoji stamps and tap anywhere on the slide to leave visual encouragement stamps or reactions for your students.",
            target: "#emoji-stamp-btn",
            action: () => {
              highlightElement('#emoji-stamp-btn');
            }
          },
          {
            title: "Media Player (Super Player) 📹",
            text: "Play custom MP3, YouTube, or GIF links inside your dedicated, resizable and draggable **Media Player** overlay for rich interactive listening practice.",
            target: "#super-player-btn",
            action: () => {
              if (window.closeWb) window.closeWb(); else { const w = document.getElementById('wb-overlay'); if(w) w.style.display='none'; }
              highlightElement('#super-player-btn');
            }
          },
          {
            title: "Integrated Webcam 🎥",
            text: "Need your camera feed? Click the pink **Webcam tool** to slide open your integrated webcam container! Customize webcam filters and capture screenshots.",
            target: "#webcam-btn",
            action: () => {
              highlightElement('#webcam-btn');
            }
          },
          {
            title: "Ticker Tape Banner 📰",
            text: "Announcements are simple! Toggle a floating, fully editable scrolling ticker tape banner across the top of your class screen to run live alerts.",
            target: "#toggle-ticker-btn",
            action: () => {
              highlightElement('#toggle-ticker-btn');
            }
          },
          {
            title: "All Drawing Tools & Sticky Notes ✏️",
            text: "Equipped with rich drawing tools: Pen, Highlighter, and Laser pointer. Use the yellow <strong>Sticky Note Stamp</strong> to place multi-color drag-and-drop notes on your slide. Sticky notes include language translation, templates, and text-to-speech!",
            target: "#pen-btn",
            action: () => {
              const penBtn = document.getElementById('pen-btn');
              if (penBtn && (!document.getElementById('pen-toolbar') || document.getElementById('pen-toolbar').style.display === 'none')) {
                penBtn.click();
              }
              setTimeout(() => { highlightElement('#pen-toolbar'); }, 150);
            }
          },
          {
            title: "Daily Habit Timer & Tree Planting 🌱",
            text: "Under our **Tree Planting system**, keeping the timer active grows a plant (Seed 🥀 -> Sprout 🌱 -> Growing plant 🌿 -> Flower 🪴🌺 -> Tree 🌳 -> Magical tree 🌳✨) as a daily habit tracker!",
            target: "#timer-btn",
            action: () => {
              const penBtn = document.getElementById('pen-btn');
              if (penBtn && document.getElementById('pen-toolbar') && document.getElementById('pen-toolbar').style.display !== 'none') {
                penBtn.click(); // close pen toolbar
              }
              const t = document.getElementById('session-timer-widget');
              if (t) {
                t.style.display = 'block';
                t.style.right = 'auto';
                t.style.top = '30%';
                t.style.left = '50%';
                t.style.transform = 'translate(-50%, -30%)';
                setTimeout(() => { highlightElement('#session-timer-widget'); }, 100);
              }
            }
          },
          {
            title: "Tutorly Accessibility Widget ♿",
            text: "Accessibility for both learners and presenters! Toggle the circular Accessibility button to access Dark Mode, dyslexia fonts, adjust spacing, scaling, and reading guides.",
            target: "#toolbar-accessibility-btn",
            action: () => {
              const t = document.getElementById('session-timer-widget'); if(t) { t.style.display='none'; t.style.top=''; t.style.left=''; t.style.right=''; t.style.transform=''; }
              highlightElement('#toolbar-accessibility-btn');
            }
          },
          {
            title: "Interactive Questions ✏️",
            text: "In the **Practice** tab, students solve spelling, grammar, and listening challenges! Answering questions correctly builds up an answer streak. Reaching milestones of 10, 20, or 30 answers correct triggers full-screen celebrations!",
            target: "button[data-tab='practice']",
            action: () => {
              const t = document.getElementById('session-timer-widget'); if(t) { t.style.display='none'; t.style.top=''; t.style.left=''; t.style.right=''; t.style.transform=''; }
              if (window.switchTab) window.switchTab('practice');
              setTimeout(() => { highlightElement("button[data-tab='practice']"); }, 150);
            }
          },
          {
            title: "Independent Output 🎤",
            text: "Finally, the **Produce** tab is where independent speaking and writing assessments live. Students record speaking drills, write essays, and download their finalized **Session Report ZIP** containing their exact answers and scores!",
            target: "button[data-tab='produce']",
            action: () => {
              if (window.switchTab) window.switchTab('produce');
              setTimeout(() => { highlightElement("button[data-tab='produce']"); }, 150);
            }
          },
          {
            title: "Ready to Guide! 🚀",
            text: "You are fully equipped! If you ever need another run-through, click the vibrating **?** button at the bottom right. Have a fantastic session!",
            target: null,
            action: () => {
              if (window.closeWb) window.closeWb(); else { const w = document.getElementById('wb-overlay'); if(w) w.style.display='none'; }
              if (window.switchTab) window.switchTab('prepare');
            }
          },
          {
            title: "Smart Writeboard ✍️",
            text: "Need a full whiteboard? Click **Smart Writeboard** to slide out an interactive, multi-color handwriting canvas! Perfect for spelling tests or grammar tables.",
            target: "#writeboard-btn",
            action: () => {
              /* Prefer the Smart Writeboard's own opener — presenter lessons also embed the older
                 whiteboard engine, whose window.openWhiteboard can shadow it. */
              const smartOpen = window.openSmartWriteboard || window.openWhiteboard;
              if (smartOpen) {
                smartOpen();
                setTimeout(() => { highlightElement('#wb-overlay'); }, 150);
              }
            }
          }
        ];
      } else {
        steps = [
          {
            title: "Welcome! I'm your Tutor 🌟",
            text: "Hi there! I am your study tutor, and I am so excited to learn English with you today! V2 splits your lesson into three comprehensive phases: <strong>Prepare</strong>, <strong>Practice</strong>, and <strong>Produce</strong>.",
            target: "#top-nav",
            action: () => { if (window.switchTab) window.switchTab('prepare'); }
          },
          {
            title: "Your Study Phases & Deadlines 📅",
            text: "First, you will read and hear new terms under **Prepare**, then answer questions under **Practice**, and finally speak or write on your own under **Produce**! Make sure to **study your lessons before the deadline** so you are fully prepared for active class discussion with your teacher!",
            target: "#top-nav",
            action: () => {}
          },
          {
            title: "Your Sidebar & Habit Plant! 🌱",
            text: "Take a look at your left **Sidebar**! Here you'll see your Level, XP, Coins, and the **Session Timer**. Regular, daily study is the secret to mastering English! To help you build this habit, you have a **Tree-Planting game**! Keep focusing to grow your tree:<br><br>• Under 5 mins: 🥀 (Withered seed)<br>• 5 mins: 🌱 (Baby sprout)<br>• 10 mins: 🌿 (Growing plant)<br>• 15 mins: 🪴🌺 (Blossomed flower)<br>• 20+ mins: 🌳 (Full tree)<br>• 30+ mins: 🌳✨ (Magical glowing tree)<br><br>Let's study for 30 minutes every day and fill your forest with beautiful trees!",
            target: "#prepare-sidebar",
            action: () => { if (window.switchTab) window.switchTab('prepare'); }
          },
          {
            title: "Tutorly Accessibility Widget ♿",
            text: "Need visual assistance or translation? Click the vibrating circular <strong>Accessibility button</strong> to access Dark Mode, dyslexia fonts, adjust spacing, scaling, reading guides, and translation tools!",
            target: "#accessibility-toggle",
            action: () => {}
          },
          {
            title: "Mascot Hover Reading 🔊",
            text: "Meet your Mascot! Whenever you hover your mouse pointer over any paragraph, sentence, or word list, your mascot will read it aloud for you automatically. It's a great way to learn exactly how words sound!",
            target: "#avatar-display",
            action: () => {}
          },
          {
            title: "Change Narrator Voice 🗣️",
            text: "Want to try a different accent? Simply use the voice dropdown selector in your left sidebar to **Change Read Aloud Voice** and find your absolute favorite mascot voice!",
            target: "#voice-selector",
            action: () => { if (window.switchTab) window.switchTab('prepare'); }
          },
          {
            title: "Practice Challenges ✏️",
            text: "Click on the **Practice** tab to solve spelling, grammar, and listening challenges! Answering questions correctly builds your correct answer streak. Let's reach a 10-streak for an epic victory screen!",
            target: "button[data-tab='practice']",
            action: () => { if (window.switchTab) window.switchTab('practice'); }
          },
          {
            title: "Save Report & Send to Tutor 🚀",
            text: "In the **Produce** tab, you will write essays, practice speaking into your microphone, and do custom activities. When you are finished, click **Save Report** to download your finalized **Session Report ZIP** file, and send it directly to your tutor for personalized feedback!",
            target: "button[data-tab='produce']",
            action: () => { if (window.switchTab) window.switchTab('produce'); }
          },
          {
            title: "Subscribe for Email Feedback 📬",
            text: "Want feedback sent right to your inbox? Enter your email and click the **Subscribe** button to receive teacher updates, lesson alerts, and personal scores!",
            target: "#prepare-sidebar",
            action: () => { if (window.switchTab) window.switchTab('prepare'); }
          },
          {
            title: "Bookmark & Resume 🔖",
            text: "Want to take a break and continue later? You can **bookmark** any slide or section, and next time you open the lesson, you can instantly resume exactly where you left off!",
            target: "#prepare-sidebar",
            action: () => { if (window.switchTab) window.switchTab('prepare'); }
          },
          {
            title: "Let's Start! 🚀",
            text: "We are all done with our quick tour! If you ever need me to show you the tools again, just click the vibrating **?** button at the bottom right. Have an amazing lesson! 🎉",
            target: null,
            action: () => { if (window.switchTab) window.switchTab('prepare'); }
          }
        ];
      }

      let currentStep = 0;
      let tourBox = document.getElementById('walkthrough-tour-box');
      if (!tourBox) {
        tourBox = document.createElement('div');
        tourBox.id = 'walkthrough-tour-box';
        tourBox.style.cssText = 'position:fixed; bottom:20px; left:20px; width:360px; max-width:calc(100vw - 32px); background:#0f172a; color:#ffffff; border:2px solid #8b5cf6; border-radius:16px; padding:20px; box-shadow:0 20px 50px rgba(0,0,0,0.6); z-index:10000005; font-family:"Inter",sans-serif; display:flex; flex-direction:column; gap:14px; transition:all 0.3s ease; opacity:0; transform:translateY(20px); box-sizing:border-box;';
        document.body.appendChild(tourBox);
      }

      function showStep(idx) {
        currentStep = idx;
        const step = steps[currentStep];

        // Execute step actions & highlights
        if (step.action) step.action();
        highlightElement(step.target);

        // Convert Markdown **bold** to <strong>bold</strong> HTML tag
        const formattedText = step.text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');

        // Audio read aloud for steps
        speakText(step.text);

        tourBox.innerHTML = 
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<span style="font-size:11px; font-weight:800; text-transform:uppercase; color:#8b5cf6; background:rgba(139,92,246,0.1); padding:2px 8px; border-radius:4px;">Walkthrough Step ' + (currentStep + 1) + ' of ' + steps.length + '</span>' +
            '<button id="tour-close-x" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">&times;</button>' +
          '</div>' +
          '<h3 style="margin:4px 0 0 0; font-size:17px; font-weight:800; color:#ffffff;">' + step.title + '</h3>' +
          '<p style="margin:0; font-size:13px; line-height:1.5; color:#cbd5e1;">' + formattedText + '</p>' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid #1e293b; padding-top:12px;">' +
            '<button id="tour-skip-btn" style="background:transparent; border:none; color:#94a3b8; font-size:12px; cursor:pointer; font-weight:600;">Skip</button>' +
            '<div style="display:flex; gap:8px;">' +
              '<button id="tour-prev-btn" style="background:#1e293b; color:#cbd5e1; border:1px solid #334155; border-radius:6px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;' + (currentStep === 0 ? 'opacity:0.5; pointer-events:none;' : '') + '">Back</button>' +
              '<button id="tour-next-btn" style="background:#8b5cf6; color:white; border:none; border-radius:6px; padding:6px 14px; font-size:12px; font-weight:700; cursor:pointer;">' + (currentStep === steps.length - 1 ? 'Finish' : 'Next') + '</button>' +
            '</div>' +
          '</div>';

        document.getElementById('tour-close-x').onclick = dismissTour;
        document.getElementById('tour-skip-btn').onclick = dismissTour;
        document.getElementById('tour-prev-btn').onclick = () => { if (currentStep > 0) showStep(currentStep - 1); };
        document.getElementById('tour-next-btn').onclick = () => {
          if (currentStep < steps.length - 1) showStep(currentStep + 1);
          else dismissTour();
        };
      }

      function dismissTour() {
        // Clear all highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
          el.classList.remove('tour-highlight');
          if (el.dataset.originalPositionStatic === 'true') {
            el.style.removeProperty('position');
          }
        });

        // Stop text-to-speech speak
        if (window.speechSynthesis) window.speechSynthesis.cancel();

        tourBox.style.opacity = '0';
        tourBox.style.transform = 'translateY(20px)';
        setTimeout(() => { tourBox.style.display = 'none'; }, 300);
        try { safeStorageSet('tutorial_dismissed_v2_' + mode, 'true'); } catch(e) {}
      }

      tourBox.style.display = 'flex';
      setTimeout(() => {
        tourBox.style.opacity = '1';
        tourBox.style.transform = 'translateY(0)';
        showStep(0);
      }, 100);
    };

  window.selectAvatar = function(emojiOrDataUrl, isImage = false) {
    state.avatar = emojiOrDataUrl;
    const isRealImg = isImage || (typeof emojiOrDataUrl === 'string' && (emojiOrDataUrl.startsWith('data:image/') || emojiOrDataUrl.startsWith('http://') || emojiOrDataUrl.startsWith('https://') || emojiOrDataUrl.startsWith('blob:')));
    state.isAvatarImage = isRealImg;
    setAllDual('avatar-display', function(av) {
        if (isRealImg) {
            av.innerHTML = '<img src="' + escAttr(emojiOrDataUrl) + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">';
        } else {
            av.innerHTML = escHtml(emojiOrDataUrl);
        }
    });
    const am = document.getElementById('avatar-modal');
    if (am) am.classList.add('hidden');
    saveState();
    
    // Stop webcam if it's on
    if (window.webcamStream) {
        window.webcamStream.getTracks().forEach(track => track.stop());
        window.webcamStream = null;
        document.getElementById('webcam-container').classList.add('hidden');
    }

    if (!isImage) {
        catSay('Great choice! ' + emojiOrDataUrl + ' suits you!', '😸');
    } else {
        catSay('Wow, looking good! 😸', '😸');
    }
  };

  window.handleAvatarUpload = function(event) {
      const file = event.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
              selectAvatar(e.target.result, true);
          };
          reader.readAsDataURL(file);
      }
  };

  window.startWebcam = async function() {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          window.webcamStream = stream;
          const video = document.getElementById('webcam-video');
          video.srcObject = stream;
          document.getElementById('webcam-container').classList.remove('hidden');
      } catch (err) {
          alert('Could not access webcam. Please ensure you have granted permission.');
          console.error(err);
      }
  };

  window.captureWebcam = function() {
      const video = document.getElementById('webcam-video');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Calculate crop to make it square
      let size = Math.min(canvas.width, canvas.height);
      let x = (canvas.width - size) / 2;
      let y = (canvas.height - size) / 2;
      
      ctx.drawImage(video, x, y, size, size, 0, 0, size, size);
      
      // We only want a cropped square canvas for the avatar
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = size;
      croppedCanvas.height = size;
      croppedCanvas.getContext('2d').drawImage(canvas, 0, 0, size, size, 0, 0, size, size);
      
      const dataUrl = croppedCanvas.toDataURL('image/jpeg');
      selectAvatar(dataUrl, true);
  };

  // Add paste event listener to modal
  document.addEventListener('paste', function(e) {
      const modal = document.getElementById('avatar-modal');
      if (modal && !modal.classList.contains('hidden')) {
          const items = (e.clipboardData || e.originalEvent.clipboardData).items;
          for (let index in items) {
              const item = items[index];
              if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
                  const blob = item.getAsFile();
                  const reader = new FileReader();
                  reader.onload = function(event) {
                      selectAvatar(event.target.result, true);
                  };
                  reader.readAsDataURL(blob);
              }
          }
      }
  });

  // ─── Session Report ───
  window.downloadSessionReport = async function() {
    state.reportEndedAt = new Date().toISOString();
    const sessionDurationMs = Date.now() - state.sessionStart;
    state.sessionDurationSeconds = Math.floor(sessionDurationMs / 1000);
    
    // Create zip
    var zip = new JSZip();
    var reportData = {
        learnerName: CONFIG.learnerName,
        startedAt: state.reportStartedAt,
        endedAt: state.reportEndedAt,
        durationSeconds: state.sessionDurationSeconds,
        xp: state.xp,
        incorrectAnswers: state.incorrectAnswers || [],
        essayAnswers: state.essayAnswers || {}
    };
    
    const voiceRecordingsMap = {};
    if (state.voiceRecordings) {
        Object.keys(state.voiceRecordings).forEach((actId) => {
            const dataUrl = state.voiceRecordings[actId];
            if (dataUrl) {
                try {
                    const base64Data = dataUrl.split(',')[1];
                    const filename = "recording_" + actId + ".mp3";
                    zip.file(filename, base64Data, {base64: true});
                    voiceRecordingsMap[actId] = filename;
                } catch(e) {
                    console.error("Error packaging audio for " + actId, e);
                }
            }
        });
    }
    reportData.recordedVoices = voiceRecordingsMap;
    zip.file("report.json", JSON.stringify(reportData, null, 2));
    
    try {
        const content = await zip.generateAsync({type:"blob"});
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = 'LearnerReport_' + CONFIG.learnerName.replace(/\\s/g,'_') + '_' + timestamp + '.zip';
        saveAs(content, fileName);
    } catch(e) {
        alert("Could not generate zip. Printing report to console.");
        console.log(reportData);
    }
  };

  // ─── Produce Mode Question Focus & Spoken/Vocab Support Generator ───
  function generateSupportDataForQuestion(qText, customData) {
    const rawQText = qText || "";
    // Clean raw text from any embedded HTML tags
    const plainQText = rawQText.replace(/<[^>]*>/g, '').trim();
    const text = plainQText.toLowerCase();

    // 1. Extract custom override data if provided
    let customStarters = (customData && Array.isArray(customData.starters) && customData.starters.length > 0) ? customData.starters : null;
    let customIdioms = (customData && Array.isArray(customData.idioms) && customData.idioms.length > 0) ? customData.idioms : null;
    let customSampleAnswer = (customData && typeof customData.sampleAnswer === 'string' && customData.sampleAnswer.trim()) ? customData.sampleAnswer : null;
    let customSpokenSupport = (customData && Array.isArray(customData.spokenSupport) && customData.spokenSupport.length > 0) ? customData.spokenSupport : null;

    // 2. Extract clean topic phrase from plainQText
    let topic = text;

    // Strip leading question introductions
    const leadPatterns = [
      /^(what|why|how|when|where|which|who|whose)\s+(do|does|did|is|are|was|were|can|could|would|should|will|have|has|had)\s+(you|people|we|they|students|learners)\s+(think|feel|believe|say|do|find|know|use|see|prefer)\s+(about|regarding|on|for|of|to)?\s*/i,
      /^(what|why|how|when|where|which|who)\s+(is|are|was|were|do|does|did|can|could|would|should)\s+/i,
      /^(do|does|did|can|could|would|should|is|are|was|were)\s+(you|people|we|they)\s+(think|agree|believe|feel|prefer|like|dislike)\s+(that|if|about|regarding)?\s*/i,
      /^(in your opinion|from your point of view|tell us about|describe|explain|discuss|give an example of|what is your opinion on|what are the main reasons for)\s+/i,
      /^(would you rather)\s+/i
    ];

    for (const pat of leadPatterns) {
      topic = topic.replace(pat, '');
    }

    // Remove trailing punctuation
    topic = topic.replace(/[?!.:;,]+/g, '').trim();

    // Normalize pronouns (second-person to first-person for natural answer starters)
    let normalizedTopic = topic
      .replace(/\byour\b/gi, 'my')
      .replace(/\byours\b/gi, 'mine')
      .replace(/\byou\b/gi, 'I');

    if (!normalizedTopic || normalizedTopic.length < 3) {
      normalizedTopic = "this topic";
    }

    // Extract key words for vocabulary relevance matching
    const stopWords = new Set([
      'what', 'where', 'when', 'why', 'how', 'which', 'who', 'does', 'do', 'did', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'the', 'a', 'an', 'and', 'or', 'but', 'if', 'because',
      'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
      'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'any',
      'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
      'think', 'describe', 'explain', 'discuss', 'give', 'tell', 'opinion', 'question', 'your', 'you',
      'would', 'could', 'might'
    ]);
    const wordsInQ = text.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

    // 3. Extract Vocabulary, Idioms & Grammar from LESSON_CONTENT or custom spoken support
    let extractedVocab = [];
    let extractedIdioms = [];
    let extractedGrammar = [];

    if (customSpokenSupport && customSpokenSupport.length > 0) {
      customSpokenSupport.forEach(function(item) {
        if (typeof item === 'object' && item) {
          extractedVocab.push({
            word: item.word || item.title || item.term || 'Target Structure',
            desc: item.desc || item.meaning || item.definition || ''
          });
        }
      });
    }

    if (typeof LESSON_CONTENT !== 'undefined' && LESSON_CONTENT && LESSON_CONTENT.sections) {
      LESSON_CONTENT.sections.forEach(function(sec) {
        if (sec.activities) {
          sec.activities.forEach(function(act) {
            try {
              let actContent = act.content;
              if (typeof actContent === 'string') {
                actContent = JSON.parse(actContent);
              }
              if (!actContent) return;

              if (act.type === 'vocab_table' && Array.isArray(actContent.words)) {
                actContent.words.forEach(function(w) {
                  if (w.word) {
                    extractedVocab.push({ word: w.word, desc: w.definition || w.example || "" });
                  }
                });
              } else if (act.type === 'flashcard' && Array.isArray(actContent.cards)) {
                actContent.cards.forEach(function(c) {
                  if (c.front) {
                    if (c.front.split(' ').length > 2) {
                      extractedIdioms.push({ phrase: c.front, meaning: c.back || "" });
                    } else {
                      extractedVocab.push({ word: c.front, desc: c.back || "" });
                    }
                  }
                });
              } else if (act.type === 'matching' && Array.isArray(actContent.pairs)) {
                actContent.pairs.forEach(function(p) {
                  if (p.left) {
                    if (p.left.split(' ').length > 2) {
                      extractedIdioms.push({ phrase: p.left, meaning: p.right || "" });
                    } else {
                      extractedVocab.push({ word: p.left, desc: p.right || "" });
                    }
                  }
                });
              } else if (act.type === 'taboo' && Array.isArray(actContent.cards)) {
                actContent.cards.forEach(function(c) {
                  if (c.word) {
                    extractedVocab.push({ word: c.word, desc: "Key lesson term (Taboo: " + (c.tabooWords || []).join(', ') + ")" });
                  }
                });
              } else if ((act.type === 'grammar_reference' || act.type === 'grammar_explanation' || act.type === 'grammar') && actContent.cards) {
                const cards = Array.isArray(actContent.cards) ? actContent.cards : [actContent.cards];
                cards.forEach(function(c) {
                  extractedGrammar.push({ word: c.title || c.rule || "Grammar Focus", desc: c.content || c.description || "" });
                });
              }
            } catch (e) {}
          });
        }
      });
    }

    // Deduplicate
    const seenWords = new Set();
    const cleanVocab = [];
    extractedVocab.forEach(function(v) {
      const lower = v.word.toLowerCase();
      if (!seenWords.has(lower)) {
        seenWords.add(lower);
        cleanVocab.push(v);
      }
    });

    const seenIdioms = new Set();
    const cleanIdioms = [];
    extractedIdioms.forEach(function(idm) {
      const lower = idm.phrase.toLowerCase();
      if (!seenIdioms.has(lower)) {
        seenIdioms.add(lower);
        cleanIdioms.push(idm);
      }
    });

    // Score relevance
    function scoreItem(itemText) {
      if (!itemText) return 0;
      const lower = itemText.toLowerCase();
      let score = 0;
      wordsInQ.forEach(function(kw) {
        if (lower.includes(kw)) score += 10;
      });
      return score;
    }

    cleanVocab.sort((a, b) => (scoreItem(b.word + " " + b.desc) - scoreItem(a.word + " " + a.desc)));
    let finalVocab = cleanVocab.slice(0, 3);

    if (finalVocab.length < 3) {
      wordsInQ.forEach(function(kw) {
        if (finalVocab.length < 3 && !seenWords.has(kw)) {
          const capitalized = kw.charAt(0).toUpperCase() + kw.slice(1);
          finalVocab.push({
            word: capitalized,
            desc: "Key term from question to recycle in your spoken response."
          });
          seenWords.add(kw);
        }
      });
    }

    cleanIdioms.sort((a, b) => (scoreItem(b.phrase + " " + b.meaning) - scoreItem(a.phrase + " " + a.meaning)));
    let finalIdioms = cleanIdioms.slice(0, 2);

    let finalGrammar = [];
    if (extractedGrammar.length > 0) {
      extractedGrammar.sort((a, b) => (scoreItem(b.word + " " + b.desc) - scoreItem(a.word + " " + a.desc)));
      finalGrammar.push(extractedGrammar[0]);
    }

    const grammarVocab = finalVocab.concat(finalGrammar);

    // 4. Generate High-Quality, Question-Tailored Sentence Starters & Idioms/Phrases
    let phrases = customStarters || [];
    let idioms = customIdioms || [];

    if (!phrases || phrases.length === 0) {
      const isHaveYouEver = /^have you ever\s+/i.test(plainQText);
      const isFavorite = /what (is|are) your (favorite|favourite)\s+/i.test(plainQText);
      const isWouldYouRather = /would you rather|prefer|choose between/i.test(text);
      const isDoYouThink = /^(do you think|do you agree|is it true that|do you believe)\s+/i.test(plainQText);
      const isProsCons = /advantages|disadvantages|pros and cons|benefits and drawbacks/i.test(plainQText);
      const isWhyOrReason = /why|reason|cause|because|attribute|factor|drives|lead to/i.test(text);
      const isHowOrSolution = /how (can|could|should|do|would)|solve|solution|tackle|improve|prevent|address|manage/i.test(text);
      const isOpinion = /opinion|think|agree|feel|believe|view|perspective|better|worst|best|disagree/i.test(text);
      const isHypothetical = /if you (could|were|had|would)|imagine|suppose|what if/i.test(text);
      const isDescribeOrExperience = /describe|tell|share|experience|time when|example|what is|what are/i.test(text);

      if (isHaveYouEver) {
        phrases = [
          "Yes, I have actually " + normalizedTopic + "; in fact, I remember when...",
          "Fortunately, I have never " + normalizedTopic + ", mainly because I always...",
          "To be honest, I haven't experienced " + normalizedTopic + " myself, but...",
          "Speaking from personal experience regarding " + normalizedTopic + ",..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Stepping out of my comfort zone", meaning: "Trying something new or unfamiliar." },
            { phrase: "An unforgettable experience", meaning: "A memory that remains vivid over time." },
            { phrase: "Broadening my horizons", meaning: "Gaining new perspectives through new experiences." }
          ];
        }
      } else if (isFavorite) {
        const favTopic = normalizedTopic.replace(/^(my|a|the)\s+/i, '');
        phrases = [
          "Without a doubt, my absolute favorite " + favTopic + " is...",
          "If I had to narrow it down to one favorite " + favTopic + ", I'd choose...",
          "What makes " + favTopic + " stand out as my favorite is...",
          "While I enjoy many options, my top choice for " + favTopic + " has to be..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Holding a special place in my heart", meaning: "Being deeply meaningful or cherished." },
            { phrase: "Standing head and shoulders above the rest", meaning: "Being noticeably superior to other choices." },
            { phrase: "An easy favorite for me", meaning: "A choice made without any doubt." }
          ];
        }
      } else if (isWouldYouRather) {
        const parts = normalizedTopic.split(/\s+or\s+/i);
        const optA = parts[0] ? parts[0].replace(/^(live in|stay in|be in|have|go to|choose|use)\s+/i, '').trim() : "the first option";
        const optB = parts[1] ? parts[1].replace(/^(live in|stay in|be in|have|go to|choose|use)\s+/i, '').trim() : "the second option";
        phrases = [
          "If I had to choose between " + optA + " and " + optB + ", I would definitely opt for...",
          "While " + optB + " has its merits, I lean strongly towards " + optA + " because...",
          "From my perspective, " + optA + " offers a distinct advantage over " + optB + " in terms of...",
          "When weighing " + optA + " against " + optB + ", the deciding factor for me is..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Tipping the scales in favor of...", meaning: "Making one option noticeably more attractive." },
            { phrase: "Striking a balance between both", meaning: "Finding a practical middle ground." },
            { phrase: "A clear-cut decision for me", meaning: "An easy choice without hesitation." }
          ];
        }
      } else if (isDoYouThink) {
        phrases = [
          "Yes, I firmly believe that " + normalizedTopic + " because...",
          "I'm inclined to agree that " + normalizedTopic + ", primarily because...",
          "On the contrary, I don't necessarily think that " + normalizedTopic + " because...",
          "While there are valid points on both sides regarding whether " + normalizedTopic + ", my view is..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Seeing eye to eye on this", meaning: "Agreeing fully with a particular standpoint." },
            { phrase: "Playing devil's advocate", meaning: "Presenting an opposing view to test an argument." },
            { phrase: "Taking a balanced perspective", meaning: "Considering all sides fairly." }
          ];
        }
      } else if (isProsCons) {
        phrases = [
          "On one hand, a major advantage of " + normalizedTopic + " is...",
          "On the other hand, a significant drawback regarding " + normalizedTopic + " involves...",
          "When weighing the benefits against the potential downsides of " + normalizedTopic + "...",
          "To strike a balance, one must acknowledge that " + normalizedTopic + " brings both..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "A double-edged sword", meaning: "Something that has both positive and negative consequences." },
            { phrase: "Outweighing the disadvantages", meaning: "Being overall more beneficial than harmful." },
            { phrase: "Looking at both sides of the coin", meaning: "Considering both advantages and disadvantages." }
          ];
        }
      } else if (isWhyOrReason) {
        phrases = [
          "The primary reason why " + normalizedTopic + " is that...",
          "A major factor contributing to " + normalizedTopic + " stems from...",
          "One key explanation for " + normalizedTopic + " lies in...",
          "This can largely be attributed to the fact that..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "At the root of the matter...", meaning: "Highlighting the fundamental cause." },
            { phrase: "Shedding light on the situation", meaning: "Making the underlying reason clear." },
            { phrase: "A major driving force behind this", meaning: "A principal factor causing this outcome." }
          ];
        }
      } else if (isHowOrSolution) {
        phrases = [
          "To effectively address " + normalizedTopic + ", one vital step is to...",
          "A practical approach to " + normalizedTopic + " would be to...",
          "The most impactful strategy regarding " + normalizedTopic + " involves...",
          "By focusing on " + normalizedTopic + ", we can achieve..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Taking proactive measures to...", meaning: "Acting in advance to solve a problem." },
            { phrase: "Paving the way for meaningful progress", meaning: "Creating ideal conditions for improvement." },
            { phrase: "Nipping the issue in the bud", meaning: "Stopping a problem early before it grows." }
          ];
        }
      } else if (isOpinion) {
        phrases = [
          "In my view, regarding " + normalizedTopic + ", I strongly believe that...",
          "From my perspective, " + normalizedTopic + " plays a crucial role because...",
          "While some might argue otherwise about " + normalizedTopic + ", my stance is that...",
          "Taking everything into account, I would argue that " + normalizedTopic + "..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Standing my ground on this issue", meaning: "Maintaining a firm personal conviction." },
            { phrase: "Weighing the pros and cons", meaning: "Considering all sides carefully before judging." },
            { phrase: "Looking at the bigger picture", meaning: "Considering the overall situation rather than small details." }
          ];
        }
      } else if (isHypothetical) {
        phrases = [
          "If I were in a position involving " + normalizedTopic + ", I would...",
          "Hypothetically speaking, the best course of action regarding " + normalizedTopic + " would be...",
          "In a scenario where " + normalizedTopic + ", my immediate priority would be...",
          "Were I given the opportunity regarding " + normalizedTopic + ", I would choose to..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Exploring uncharted territory", meaning: "Trying a completely new or unfamiliar approach." },
            { phrase: "Seizing the opportunity to...", meaning: "Taking full advantage of a chance." },
            { phrase: "Thinking outside the box", meaning: "Finding creative, non-conventional solutions." }
          ];
        }
      } else if (isDescribeOrExperience) {
        phrases = [
          "When reflecting on " + normalizedTopic + ", what stands out most is...",
          "To give a clear picture of " + normalizedTopic + ", it is important to note...",
          "A key aspect of " + normalizedTopic + " that deserves attention is...",
          "Speaking from experience regarding " + normalizedTopic + ",..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Painting a vivid picture of...", meaning: "Describing something clearly and detailedly." },
            { phrase: "Leaving a lasting impression", meaning: "Creating a strong, memorable impact." },
            { phrase: "In the grand scheme of things", meaning: "When considered in relation to everything else." }
          ];
        }
      } else {
        phrases = [
          "When considering " + normalizedTopic + ", I would say that...",
          "One crucial element regarding " + normalizedTopic + " is...",
          "From a practical point of view, " + normalizedTopic + " requires...",
          "To elaborate on " + normalizedTopic + ", it is worth emphasizing that..."
        ];
        if (!idioms.length) {
          idioms = [
            { phrase: "Bringing a fresh perspective to...", meaning: "Offering a new way of looking at a topic." },
            { phrase: "Setting the record straight", meaning: "Clarifying facts or details." },
            { phrase: "Going above and beyond", meaning: "Doing more than expected." }
          ];
        }
      }

      if (finalIdioms && finalIdioms.length > 0) {
        idioms = finalIdioms.concat(idioms).slice(0, 3);
      }
    }

    // 5. Generate or use Question-Tailored Sample Answer
    let sampleAnswer = customSampleAnswer || "";
    if (!sampleAnswer) {
      const isHaveYouEver = /^have you ever\s+/i.test(plainQText);
      const isFavorite = /what (is|are) your (favorite|favourite)\s+/i.test(plainQText);
      const isWouldYouRather = /would you rather|prefer|choose between/i.test(text);
      const isDoYouThink = /^(do you think|do you agree|is it true that|do you believe)\s+/i.test(plainQText);
      const isProsCons = /advantages|disadvantages|pros and cons|benefits and drawbacks/i.test(plainQText);
      const isWhyOrReason = /why|reason|cause|because|attribute|factor|drives|lead to/i.test(text);
      const isHowOrSolution = /how (can|could|should|do|would)|solve|solution|tackle|improve|prevent|address|manage/i.test(text);
      const isOpinion = /opinion|think|agree|feel|believe|view|perspective|better|worst|best|disagree/i.test(text);
      const isHypothetical = /if you (could|were|had|would)|imagine|suppose|what if/i.test(text);

      if (isHaveYouEver) {
        sampleAnswer = "Yes, I have experienced " + normalizedTopic + ". It happened when I was in a situation where I needed to adapt quickly, and it taught me a valuable lesson.";
      } else if (isFavorite) {
        sampleAnswer = "My absolute favorite choice regarding " + normalizedTopic + " is the one that offers the greatest personal satisfaction and long-term value.";
      } else if (isWouldYouRather) {
        sampleAnswer = "I would much rather choose the option that aligns with my long-term goals, because it provides greater stability and flexibility.";
      } else if (isDoYouThink) {
        sampleAnswer = "I strongly agree with this viewpoint because there are compelling reasons supporting it, particularly regarding practical outcomes.";
      } else if (isProsCons) {
        sampleAnswer = "While there are clear advantages such as increased efficiency, one must also account for potential drawbacks like higher initial costs.";
      } else if (isWhyOrReason) {
        sampleAnswer = "The primary reason behind " + normalizedTopic + " stems from fundamental social and economic changes that influence how people behave.";
      } else if (isHowOrSolution) {
        sampleAnswer = "To effectively address " + normalizedTopic + ", the best approach is to implement targeted strategies and collaborate consistently.";
      } else if (isOpinion) {
        sampleAnswer = "In my opinion, " + normalizedTopic + " plays an essential role in everyday life, and taking a balanced approach is key.";
      } else if (isHypothetical) {
        sampleAnswer = "If I were placed in a situation involving " + normalizedTopic + ", my first priority would be to gather key facts and take decisive action.";
      } else {
        sampleAnswer = "Regarding " + normalizedTopic + ", I believe that focusing on core principles and taking consistent steps leads to the best result.";
      }
    }

    return {
      grammarVocab: grammarVocab,
      phrases: phrases,
      idioms: idioms,
      sampleAnswer: sampleAnswer
    };
  }

  window.focusProduceQuestion = function(qEl) {
    if (!qEl) return;
    // 1. Remove focus from all other questions in the same container or overall
    document.querySelectorAll('.clickable-produce-question').forEach(el => el.classList.remove('focused'));
    // 2. Add focus to this question
    qEl.classList.add('focused');
    
    // 3. Get the text of the question
    const contentEl = qEl.querySelector('.q-text-content') || qEl;
    const qText = contentEl ? contentEl.textContent.trim() : "";

    // Parse custom per-question dataset attributes if provided
    let customData = {
      starters: null,
      idioms: null,
      sampleAnswer: null,
      spokenSupport: null
    };

    if (qEl.dataset) {
      if (qEl.dataset.starters) {
        try { customData.starters = JSON.parse(qEl.dataset.starters); } catch(e) {}
      }
      if (qEl.dataset.idioms) {
        try { customData.idioms = JSON.parse(qEl.dataset.idioms); } catch(e) {}
      }
      if (qEl.dataset.sampleAnswer) {
        customData.sampleAnswer = qEl.dataset.sampleAnswer;
      }
      if (qEl.dataset.spokenSupport) {
        try { customData.spokenSupport = JSON.parse(qEl.dataset.spokenSupport); } catch(e) {}
      }
    }
    
    // 4. Have the cat read ONLY this active question
    if (!state.catMuted && qText) {
      speak(qText);
    }
    
    // 5. Generate support check boxes
    const support = generateSupportDataForQuestion(qText, customData);
    
    // 6. Populate Left Container (Vocabulary, Grammar & Model Sample Answer under Spoken Support)
    const vocabContainer = document.getElementById('produce-support-vocab-container');
    if (vocabContainer) {
      let html = '<div style="margin-bottom: 12px; font-weight: 800; font-size: 1.45rem; color: var(--text);">🎯 Target Words & Grammar:</div>';
      
      if (support.grammarVocab && support.grammarVocab.length > 0) {
        support.grammarVocab.forEach((item, idx) => {
          html += '<label class="support-checkbox-label support-blue" style="display: flex; align-items: flex-start; gap: 12px; font-size: 1.35rem; cursor: pointer; padding: 12px 14px; border-radius: 10px; transition: background 0.15s; margin-bottom: 10px; border: 1px solid var(--border); border-left: 5px solid #3b82f6; background: var(--bg);">' +
            '<input type="checkbox" class="support-cb-input" style="width: 22px; height: 22px; margin-top: 3px; accent-color: #3b82f6; cursor: pointer; flex-shrink: 0;">' +
            '<span style="flex: 1;"><strong style="font-size: 1.35rem; font-weight: 800; color: var(--text); display: block;">' + esc(item.word) + '</strong><div style="font-size: 1.15rem; font-weight: 500; color: var(--text2); margin-top: 3px; line-height: 1.45;">' + sanitizeRich(item.desc) + '</div></span>' +
            '</label>';
        });
      } else {
        html += '<p style="font-size:1.25rem; color:var(--text2); font-style:italic;">No target structures matching.</p>';
      }

      if (support.sampleAnswer) {
        html += '<div style="margin-top: 20px; margin-bottom: 10px; font-weight: 800; font-size: 1.45rem; color: var(--primary); display: flex; align-items: center; gap: 6px;">💬 Model Response Outline:</div>' +
          '<div style="font-size: 1.25rem; line-height: 1.6; padding: 16px 20px; background: rgba(67, 97, 238, 0.08); border-left: 5px solid var(--primary); border-radius: 10px; color: var(--text); font-style: italic; border: 1px solid var(--border); border-left-width: 5px;">' +
          esc(support.sampleAnswer) +
          '</div>';
      }

      vocabContainer.innerHTML = html;
    }
    
    // 7. Populate Right Container (Recommend Phrases & Idiomatic Expressions)
    const phrasesContainer = document.getElementById('produce-support-phrases-container');
    if (phrasesContainer) {
      let html = "";
      
      if (support.phrases && support.phrases.length > 0) {
        html += '<div style="margin-bottom: 12px; font-weight: 800; font-size: 1.45rem; color: var(--text);">💡 Recommend Phrases:</div>';
        support.phrases.forEach((phrase, idx) => {
          html += '<label class="support-checkbox-label support-green" style="display: flex; align-items: flex-start; gap: 12px; font-size: 1.35rem; cursor: pointer; padding: 12px 14px; border-radius: 10px; transition: background 0.15s; margin-bottom: 10px; border: 1px solid var(--border); border-left: 5px solid #10b981; background: var(--bg);">' +
            '<input type="checkbox" class="support-cb-input" style="width: 22px; height: 22px; margin-top: 3px; accent-color: #10b981; cursor: pointer; flex-shrink: 0;">' +
            '<span style="font-size: 1.3rem; font-weight: 700; color: var(--text); line-height: 1.45;">' + esc(phrase) + '</span>' +
            '</label>';
        });
      }
      
      if (support.idioms && support.idioms.length > 0) {
        html += '<div style="margin-top: 20px; margin-bottom: 12px; font-weight: 800; font-size: 1.45rem; color: #8b5cf6;">🌟 Idiomatic Expressions & Phrases:</div>';
        support.idioms.forEach((idiom, idx) => {
          html += '<label class="support-checkbox-label support-purple" style="display: flex; align-items: flex-start; gap: 12px; font-size: 1.35rem; cursor: pointer; padding: 12px 14px; border-radius: 10px; transition: background 0.15s; margin-bottom: 10px; border: 1px solid var(--border); border-left: 5px solid #8b5cf6; background: var(--bg);">' +
            '<input type="checkbox" class="support-cb-input" style="width: 22px; height: 22px; margin-top: 3px; accent-color: #8b5cf6; cursor: pointer; flex-shrink: 0;">' +
            '<span style="flex: 1;"><strong style="font-size: 1.35rem; font-weight: 800; color: var(--text); display: block;">' + esc(idiom.phrase) + '</strong><div style="font-size: 1.15rem; font-weight: 500; color: var(--text2); margin-top: 3px; line-height: 1.45;">' + esc(idiom.meaning) + '</div></span>' +
            '</label>';
        });
      }
      
      phrasesContainer.innerHTML = html;
    }

    // Mobile: the support panels live in a slide-in sheet, so surface them the
    // moment a question is tapped — otherwise the fresh support stays off-screen.
    if (isMobileShell() && !document.body.classList.contains('mobile-support-open')) {
      setTimeout(function() { setMobilePanel(true, 'support'); }, 240);
    }
  };

  window.completeActivity = completeActivity;
  window.speakWord = speakWord;

  // ─── Start ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
`;
}
