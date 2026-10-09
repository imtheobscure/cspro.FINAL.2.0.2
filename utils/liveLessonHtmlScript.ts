/**
 * Live Lesson standalone HTML — engine.
 *
 * A faithful vanilla-JS port of the Live-Lessons React app: sidebar (learner profile,
 * points/streak/badges, search, phase filters, step list, progress bar), header
 * (background selector, theme, teacher view, TTS, ambient sounds, lesson info),
 * 14 interactive H5P-style activities, language reference + CCQ + speaking panels,
 * timer bar, narrating cat with voice picker, and progress mirroring to the tutor
 * dashboard. Boots DIRECTLY into the lesson — no splash screen, no setup wizard.
 *
 * The whole script is one string literal; keep it free of backticks and "\${" so the
 * generator can embed it without escaping. The payload is injected via the
 * "/*__DATA__*\/" marker in the generator.
 */

export const LIVE_HTML_SCRIPT = `
(function () {
  "use strict";

  var DATA = /*__DATA__*/ null;
  var NAME = (DATA.learnerProfile && DATA.learnerProfile.name) || "Student";
  var LS_KEY = "tutorly-live-progress-" + NAME;
  /* Bump when the theme default changes: see the migration in load(). */
  var THEME_VERSION = 2;
  var MIRROR_KEY = "live_lesson_stats";
  var STEPS = DATA.procedureBlocks || [];
  var ACT = {};
  var UI = { sidebarOpen: false };
  var S = null;

  var DEFAULT_BG = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1920&q=80";

  var BG_LIST = [
    { id: "none", name: "No Background", emoji: "⬜", url: "" },
    { id: "classroom", name: "Classroom", emoji: "🏫", url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&q=80" },
    { id: "library", name: "Library", emoji: "📚", url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=80" },
    { id: "cafe", name: "Cozy Café", emoji: "☕", url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1920&q=80" },
    { id: "nature", name: "Nature", emoji: "🌿", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80" },
    { id: "beach", name: "Beach", emoji: "🏖️", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80" },
    { id: "city", name: "City Skyline", emoji: "🌆", url: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&q=80" },
    { id: "mountains", name: "Mountains", emoji: "🏔️", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80" },
    { id: "space", name: "Space", emoji: "🌌", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80" },
    { id: "office", name: "Modern Office", emoji: "🏢", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80" },
    { id: "garden", name: "Garden", emoji: "🌸", url: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1920&q=80" },
    { id: "rain", name: "Rainy Window", emoji: "🌧️", url: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=1920&q=80" }
  ];

  var AMBIENT = [
    { id: "none", name: "No Sound", emoji: "🔇", url: "" },
    { id: "rain", name: "Gentle Rain", emoji: "🌧️", url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3" },
    { id: "forest", name: "Forest Birds", emoji: "🌲", url: "https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3" },
    { id: "ocean", name: "Ocean Waves", emoji: "🌊", url: "https://assets.mixkit.co/active_storage/sfx/2167/2167-preview.mp3" },
    { id: "cafe", name: "Café Ambience", emoji: "☕", url: "https://assets.mixkit.co/active_storage/sfx/2188/2188-preview.mp3" },
    { id: "fire", name: "Fireplace", emoji: "🔥", url: "https://assets.mixkit.co/active_storage/sfx/2188/2188-preview.mp3" },
    { id: "wind", name: "Gentle Wind", emoji: "🍃", url: "https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3" }
  ];

  var PHASES = {
    study: { label: "Study", emoji: "📖", cls: "ll-pt-study", color: "#60a5fa" },
    speak: { label: "Speak", emoji: "🎤", cls: "ll-pt-speak", color: "#34d399" },
    review: { label: "Review", emoji: "🔄", cls: "ll-pt-review", color: "#a78bfa" }
  };

  var TIERS = [
    { min: 500, label: "Legendary", emoji: "🌟", color: "#fbbf24", cls: "ll-tier-legendary" },
    { min: 250, label: "Epic", emoji: "🟣", color: "#c084fc", cls: "ll-tier-epic" },
    { min: 100, label: "Rare", emoji: "🔵", color: "#60a5fa", cls: "ll-tier-rare" },
    { min: 0, label: "Common", emoji: "⚪", color: "#94a3b8", cls: "ll-tier-common" }
  ];

  /* ── persistence ─────────────────────────────────────── */

  function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) {}
    var base = {
      idx: 0, points: 0, streak: 0, badges: [], steps: {},
      tts: true, teacher: true, theme: "light", themeV: THEME_VERSION,
      cat: { voice: "", rate: 0.9, pitch: 1.1, muted: false },
      bg: DEFAULT_BG, ambient: "none", volume: 0.3
    };
    if (saved) {
      for (var k in saved) { if (saved.hasOwnProperty(k)) base[k] = saved[k]; }
      base.cat = base.cat || { voice: "", rate: 0.9, pitch: 1.1, muted: false };
      /* Theme migration. v1 defaulted to dark, and the very first save() wrote
         that default to localStorage even if nobody ever touched the toggle -- so
         simply changing the default would leave every returning browser on dark.
         A saved state with an older marker therefore has its theme reset to the
         new default (light). Once the tutor picks a theme themselves, the current
         marker is stored with it and their choice sticks from then on. */
      if (saved.themeV !== THEME_VERSION) { base.theme = "light"; }
      base.themeV = THEME_VERSION;
    }
    base.idx = Math.max(0, Math.min(base.idx || 0, STEPS.length - 1));
    return base;
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(S));
      var done = 0;
      for (var id in S.steps) { if (S.steps[id].status === "completed") done++; }
      var tier = tierFor(S.points);
      var mirror = {
        xp: S.points,
        level: Math.max(1, Math.floor(S.points / 150) + 1),
        points: S.points,
        streak: S.streak,
        badges: S.badges,
        tier: tier.label,
        completedSteps: done,
        totalSteps: STEPS.length,
        stepsDone: done,
        lastStepTitle: (STEPS[S.idx] || {}).title || "",
        lastStep: S.idx,
        title: DATA.metadata && DATA.metadata.title || "Live Lesson",
        updatedAt: Date.now()
      };
      localStorage.setItem(MIRROR_KEY, JSON.stringify(mirror));
      // Per-learner array mirror for the Saved Library progress chips (same
      // convention as the Flipbook/Gamified/Music/Daily lessons). NOTE: this is a
      // DIFFERENT key from LS_KEY (the settings object) — do not unify them.
      var fileName = (DATA.fileName || (DATA.metadata && DATA.metadata.fileName) || "live-lesson");
      var progKey = "tutorly-live-lessons-" + NAME;
      var list = [];
      try { list = JSON.parse(localStorage.getItem(progKey) || "[]"); } catch (e2) { list = []; }
      var rec = {
        fileName: fileName, title: DATA.metadata && DATA.metadata.title || "Live Lesson", topic: DATA.metadata && DATA.metadata.title || "",
        level: (DATA.metadata && DATA.metadata.level) || "",
        xp: S.points, levelNum: Math.max(1, Math.floor(S.points / 150) + 1), streak: S.streak,
        points: S.points, tier: tier.label, badges: (S.badges || []).slice(),
        completedSteps: done, totalSteps: STEPS.length,
        lastStepTitle: mirror.lastStepTitle, updatedAt: new Date().toISOString()
      };
      var others = list.filter(function (r) { return r && r.fileName !== rec.fileName; });
      others.unshift(rec);
      localStorage.setItem(progKey, JSON.stringify(others.slice(0, 20)));
    } catch (e) {}
  }

  function tierFor(p) {
    for (var i = 0; i < TIERS.length; i++) { if (p >= TIERS[i].min) return TIERS[i]; }
    return TIERS[TIERS.length - 1];
  }

  /* ── helpers ─────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function stripEmoji(s) {
    return String(s || "").replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, "").trim();
  }

  function md(text) {
    var t = String(text || "");
    var tableHtml = "";
    var lines = t.split("\\n");
    var tbl = [];
    var rest = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf("|") >= 0) tbl.push(lines[i]);
      else rest.push(lines[i]);
    }
    if (tbl.length > 2) {
      var rows = [];
      for (var j = 0; j < tbl.length; j++) {
        if (tbl[j].indexOf("---") >= 0) continue;
        var cells = tbl[j].split("|").filter(function (c) { return c.trim() !== ""; });
        var row = "<tr>";
        for (var k = 0; k < cells.length; k++) {
          row += (j === 0 ? "<td><strong>" + mdInline(cells[k].trim()) + "</strong></td>" : "<td>" + mdInline(cells[k].trim()) + "</td>");
        }
        rows.push(row + "</tr>");
      }
      tableHtml = "<table>" + rows.join("") + "</table>";
    }
    var body = rest.join("\\n");
    body = body
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\\n/g, "<br/>");
    return mdInline(body) + tableHtml;
  }

  function mdInline(t) {
    return t
      .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\\*([^*]+)\\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#818cf8;text-decoration:underline">$1</a>')
      .replace(/\`([^\`]+)\`/g, "<code style=\\"background:rgba(51,65,85,.6);padding:1px 6px;border-radius:6px;font-size:.9em\\">$1</code>");
  }

  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function toast(msg) {
    var el = document.createElement("div");
    el.className = "ll-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
  }

  function confetti(type) {
    var colors = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#f472b6"];
    var count = type === "perfect" ? 90 : 50;
    for (var i = 0; i < count; i++) {
      (function (i) {
        setTimeout(function () {
          var c = document.createElement("div");
          c.className = "ll-confetti";
          c.style.left = (5 + Math.random() * 90) + "%";
          c.style.background = colors[i % colors.length];
          c.style.width = (6 + Math.random() * 6) + "px";
          c.style.height = (8 + Math.random() * 8) + "px";
          c.style.animationDuration = (1.4 + Math.random() * 1.2) + "s";
          document.body.appendChild(c);
          setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 3000);
        }, Math.random() * 300);
      })(i);
    }
  }

  /* ── speech ──────────────────────────────────────────── */

  var VOICES = [];

  function loadVoices() {
    try {
      VOICES = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    } catch (e) { VOICES = []; }
  }
  loadVoices();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice() {
    if (!VOICES.length) loadVoices();
    var want = S.cat.voice;
    if (want) {
      for (var i = 0; i < VOICES.length; i++) {
        if (VOICES[i].name === want) return VOICES[i];
      }
    }
    var en = [];
    for (var j = 0; j < VOICES.length; j++) {
      if (VOICES[j].lang && VOICES[j].lang.indexOf("en") === 0) en.push(VOICES[j]);
    }
    for (var k = 0; k < en.length; k++) {
      if (/google|samantha|karen|daniel|moira|tessa|fiona|rishi|ava|zoe|siri|natural|premium|enhanced|neural/i.test(en[k].name)) return en[k];
    }
    for (var m = 0; m < en.length; m++) {
      if (!/david|mark|zira|hazel/i.test(en[m].name)) return en[m];
    }
    return en[0] || null;
  }

  function speak(text, mood) {
    if (S.cat.muted || !S.tts) return;
    if (!window.speechSynthesis || !text) return;
    var clean = stripEmoji(text).replace(/\\*\\*/g, "").replace(/\\*/g, "").replace(/_/g, "").replace(/#{1,6}\\s/g, "").replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, "$1").trim();
    if (!clean) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(clean);
    u.rate = S.cat.rate; u.pitch = S.cat.pitch; u.volume = 1;
    var v = pickVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
    var bub = document.getElementById("ll-catbub");
    if (bub) {
      bub.innerHTML = "<p>" + esc(text.substring(0, 110)) + "</p>";
      bub.classList.remove("ll-hidden");
      clearTimeout(bub._t);
      bub._t = setTimeout(function () { bub.classList.add("ll-hidden"); }, 6000);
    }
    var face = document.getElementById("ll-catface");
    if (face) {
      face.classList.add("ll-speak");
      if (mood) face.textContent = moodEmoji(mood);
      setTimeout(function () { if (face) face.classList.remove("ll-speak"); }, 2500);
    }
  }

  function moodEmoji(m) {
    var map = { neutral: "🐱", happy: "😺", excited: "😸", thinking: "🙀", sad: "😿", surprised: "🙀", love: "😻", angry: "😾", laughing: "😹", sleepy: "😽" };
    return map[m] || "🐱";
  }

  function catSpeak(text, mood) {
    speak(text, mood || "neutral");
  }

  /* ── gamification ────────────────────────────────────── */

  function award(points, badge) {
    S.points += points;
    if (points > 0) S.streak += 1; else S.streak = 0;
    if (badge && S.badges.indexOf(badge) < 0) S.badges.push(badge);
    save();
  }

  function completeStep(stepId, score, maxScore, answer) {
    var cur = S.steps[stepId] || { stepId: stepId, status: "active", attempts: 0 };
    S.steps[stepId] = {
      stepId: stepId, status: "completed", score: score, maxScore: maxScore,
      attempts: (cur.attempts || 0) + 1, studentAnswer: answer, completedAt: Date.now()
    };
    save();
    var done = 0;
    for (var id in S.steps) { if (S.steps[id].status === "completed") done++; }
    if (done === STEPS.length && (S.badges || []).indexOf("🎓") < 0) {
      S.badges.push("🎓");
      save();
      toast("🎉 Lesson complete, " + NAME + "!");
      confetti("perfect");
    }
  }

  function stepProgress(stepId) { return S.steps[stepId]; }

  /* ── activity state ──────────────────────────────────── */

  function st(stepId) {
    if (!ACT[stepId]) ACT[stepId] = {};
    return ACT[stepId];
  }

  /* ── markdown strip for TTS ──────────────────────────── */

  /* ── render ──────────────────────────────────────────── */

  function render() {
    document.documentElement.className = S.theme === "light" ? "ll-light" : "";
    var bg = document.getElementById("ll-bgimg");
    if (bg) {
      if (S.bg) { bg.style.backgroundImage = "url('" + S.bg + "')"; bg.style.opacity = S.theme === "light" ? "0.12" : "0.08"; }
      else { bg.style.backgroundImage = "none"; }
    }
    try {
      document.getElementById("ll-app").innerHTML =
        sidebarHtml() + mainHtml() + catHtml() + (UI.aiPanel ? aiPanelHtml() : "");
    } catch (err) {
      /* Never leave the lesson frozen on the previous screen: show the failure
         with the step and message so the tutor can fix the JSON and reload. */
      var badStep = STEPS[S.idx] || {};
      var why = esc((badStep.title || "") + " — " + (err && err.message ? err.message : String(err)));
      document.getElementById("ll-app").innerHTML = renderErrorHtml(why);
    }
    bind();
    updateAmbient();
  }

  function sidebarHtml() {
    var tier = tierFor(S.points);
    var learner = DATA.learnerProfile || {};
    var done = 0;
    for (var id in S.steps) { if (S.steps[id].status === "completed") done++; }
    var h = "";
    h += "<aside class=\\"ll-side" + (UI.sidebarOpen ? " ll-open" : "") + "\\" id=\\"ll-side\\">";
    h += "<div class=\\"ll-prof\\">";
    h += "<div class=\\"ll-profrow\\">";
    h += "<div class=\\"ll-avatar " + tier.cls + "\\">" + esc((learner.name || NAME || "S").substring(0, 1).toUpperCase()) + "</div>";
    h += "<div style=\\"flex:1;min-width:0\\">";
    h += "<p class=\\"ll-profname\\">" + esc(learner.name || NAME) + "</p>";
    h += "<p class=\\"ll-tier-txt\\" style=\\"color:" + tier.color + "\\">" + tier.emoji + " " + tier.label + "</p>";
    h += "<p class=\\"ll-sub\\">" + esc(learner.level || DATA.metadata.level || "B1") + " • " + esc(DATA.metadata.targetLanguage || "en-US") + "</p>";
    h += "</div></div>";
    h += "<div class=\\"ll-stats\\">";
    h += "<div class=\\"ll-stat\\"><b>⭐ " + S.points + "</b><span>Points</span></div>";
    h += "<div class=\\"ll-stat\\"><b>🔥 " + S.streak + "</b><span>Streak</span></div>";
    h += "<div class=\\"ll-stat\\"><b>🏆 " + S.badges.length + "</b><span>Badges</span></div>";
    h += "</div>";
    if (S.badges.length) {
      h += "<div class=\\"ll-badges\\">";
      for (var b = 0; b < S.badges.length; b++) h += "<span class=\\"ll-badge\\" title=\\"" + esc(S.badges[b]) + "\\">" + esc(S.badges[b]) + "</span>";
      h += "</div>";
    }
    h += "</div>";
    h += "<div class=\\"ll-search\\">";
    h += "<input id=\\"ll-search\\" placeholder=\\"Search activities...\\" value=\\"" + esc(UI.q || "") + "\\"/>";
    if (UI.q) h += "<button class=\\"ll-x\\" data-act=\\"clear-q\\">✕</button>";
    h += "</div>";
    h += "<div class=\\"ll-phases\\">";
    var phases = ["study", "speak", "review"];
    for (var p = 0; p < phases.length; p++) {
      var pc = PHASES[phases[p]];
      var count = 0;
      for (var s = 0; s < STEPS.length; s++) { if (STEPS[s].phase === phases[p]) count++; }
      var on = UI.phase === phases[p];
      h += "<button class=\\"ll-phase" + (on ? " ll-on" : "") + "\\" style=\\"" + (on ? "background:rgba(99,102,241,.15);" : "") + "color:" + (on ? "#818cf8" : "") + "\\" data-act=\\"phase\\" data-arg=\\"" + phases[p] + "\\">";
      h += "<span class=\\"ll-emoji\\">" + pc.emoji + "</span><b>" + pc.label + "</b><small>" + count + " activities</small></button>";
    }
    h += "</div>";
    if (UI.phase) {
      h += "<div class=\\"ll-filterbar\\"><span>Showing: <b style=\\"color:" + PHASES[UI.phase].color + "\\">" + PHASES[UI.phase].label + "</b></span><button data-act=\\"phase\\" data-arg=\\"all\\" style=\\"color:#818cf8;font-weight:500;font-size:13px\\">Show All</button></div>";
    }
    h += "<div class=\\"ll-steps\\">";
    var shown = 0;
    for (var i = 0; i < STEPS.length; i++) {
      var step = STEPS[i];
      var pc2 = PHASES[step.phase || "speak"];
      if (UI.phase && step.phase !== UI.phase) continue;
      if (UI.q && (step.title || "").toLowerCase().indexOf(UI.q.toLowerCase()) < 0 && (step.type || "").toLowerCase().indexOf(UI.q.toLowerCase()) < 0) continue;
      shown++;
      var pr = S.steps[step.id];
      var active = i === S.idx;
      var doneStep = pr && pr.status === "completed";
      h += "<button class=\\"ll-step" + (active ? " ll-active" : "") + (doneStep ? " ll-done" : "") + "\\" data-act=\\"goto\\" data-arg=\\"" + i + "\\">";
      h += "<span class=\\"ll-sico\\">" + (doneStep ? "✅" : active ? "🔵" : "⚪") + "</span>";
      h += "<span class=\\"ll-sinfo\\">";
      h += "<span class=\\"ll-phasetag " + pc2.cls + "\\">" + pc2.emoji + " " + pc2.label + "</span>";
      h += "<span class=\\"ll-steptitle\\">" + (i + 1) + ". " + esc(step.title) + "</span>";
      h += "<span class=\\"ll-stype\\">" + esc((step.type || "").replace(/-/g, " ")) + "</span>";
      if (pr && pr.score !== undefined) h += "<span class=\\"ll-sscore\\">✅ " + pr.score + "/" + pr.maxScore + " pts</span>";
      h += "</span>";
      h += "<span class=\\"ll-smeta\\">";
      if (active) h += "<span style=\\"color:#818cf8;font-size:16px\\">›</span>";
      if (step.gamification && step.gamification.points) h += "<span class=\\"ll-pts\\">⚡" + step.gamification.points + "</span>";
      h += "</span></button>";
    }
    if (shown === 0) h += "<div style=\\"text-align:center;padding:30px 10px;color:var(--ll-txt3)\\"><span style=\\"font-size:34px;display:block;margin-bottom:8px\\">🔍</span>No activities found</div>";
    h += "</div>";
    h += "<div class=\\"ll-prog\\">";
    h += "<div class=\\"ll-progrow\\"><span class=\\"ll-hbtn\\" style=\\"cursor:default\\">Progress</span><b>" + done + "/" + STEPS.length + "</b></div>";
    h += "<div class=\\"ll-progbar\\"><div class=\\"ll-progfill\\" style=\\"width:" + (STEPS.length ? (done / STEPS.length * 100) : 0) + "%\\"></div></div>";
    h += "</div></aside>";
    return h;
  }

  function mainHtml() {
    var step = STEPS[S.idx] || STEPS[0];
    var h = "";
    h += "<main class=\\"ll-main\\">";
    h += "<header class=\\"ll-header\\">";
    h += "<button class=\\"ll-hbtn ll-sidetoggle\\" data-act=\\"side\\" title=\\"Menu\\"><span class=\\"ll-ico\\">☰</span></button>";
    h += "<button class=\\"ll-hbtn\\" data-act=\\"home\\" title=\\"Classroom Home\\"><span class=\\"ll-ico\\">🏠</span></button>";
    h += bgDropdownHtml();
    h += "<button class=\\"ll-hbtn\\" data-act=\\"theme\\" title=\\"Toggle theme\\">" + (S.theme === "dark" ? "☀️" : "🌙") + "</button>";
    h += "<button class=\\"ll-hbtn" + (S.teacher ? " ll-on" : "") + "\\" data-act=\\"teacher\\">" + (S.teacher ? "👁 Teacher" : "🚫 Teacher") + "</button>";
    h += "<button class=\\"ll-hbtn" + (S.tts ? " ll-em" : "") + "\\" data-act=\\"tts\\" title=\\"Text-to-speech\\">" + (S.tts ? "🔊" : "🔇") + "</button>";
    h += ambientDropdownHtml();
    h += "<span class=\\"ll-spacer\\"></span>";
    h += "<button class=\\"ll-hbtn\\" data-act=\\"print\\" title=\\"Print / Export PDF study worksheet\\"><span class=\\"ll-ico\\">🖨️</span></button>";
    h += "<button class=\\"ll-hbtn ll-grad\\" data-act=\\"aipanel\\"><span class=\\"ll-ico\\">✨</span> Lesson Info</button>";
    h += "</header>";
    h += "<div class=\\"ll-content\\"><div class=\\"ll-wrap\\">";
    h += stepHtml(step);
    h += "</div></div>";
    h += footerHtml();
    h += "</main>";
    return h;
  }

  function bgDropdownHtml() {
    var cur = "🏫";
    for (var i = 0; i < BG_LIST.length; i++) { if (BG_LIST[i].url === S.bg) cur = BG_LIST[i].emoji; }
    var h = "<div class=\\"ll-dd\\" id=\\"ll-bgdd\\">";
    h += "<button class=\\"ll-hbtn" + (UI.bgOpen ? " ll-on" : "") + "\\" data-act=\\"bgdd\\"><span class=\\"ll-ico\\">" + cur + "</span> Background ▾</button>";
    if (UI.bgOpen) {
      h += "<div class=\\"ll-ddmenu\\"><h4>🖼️ Background Image</h4><div class=\\"ll-ddgrid\\">";
      for (var j = 0; j < BG_LIST.length; j++) {
        var b = BG_LIST[j];
        h += "<button class=\\"ll-ddcell" + (S.bg === b.url ? " ll-cur" : "") + "\\" data-act=\\"bg\\" data-arg=\\"" + j + "\\">";
        h += "<span class=\\"ll-thumb\\">" + (b.url ? "<img src=\\"" + b.url + "\\" loading=\\"lazy\\"/>" : b.emoji) + "</span><span>" + esc(b.name) + "</span></button>";
      }
      h += "</div></div>";
    }
    h += "</div>";
    return h;
  }

  function ambientDropdownHtml() {
    var cur = "🔇";
    for (var i = 0; i < AMBIENT.length; i++) { if (AMBIENT[i].id === S.ambient) cur = AMBIENT[i].emoji; }
    var h = "<div class=\\"ll-dd\\" id=\\"ll-ambdd\\">";
    h += "<button class=\\"ll-hbtn" + (UI.ambOpen ? " ll-on" : "") + "\\" data-act=\\"ambdd\\"><span class=\\"ll-ico\\">" + cur + "</span>" + (S.ambient === "none" ? "Ambient ▾" : "Playing ▾") + "</button>";
    if (UI.ambOpen) {
      h += "<div class=\\"ll-ddmenu\\"><h4>🎵 Ambient Sounds</h4><div class=\\"ll-ddlist\\">";
      for (var j = 0; j < AMBIENT.length; j++) {
        var a = AMBIENT[j];
        h += "<button class=\\"ll-ddrow" + (S.ambient === a.id ? " ll-cur" : "") + "\\" data-act=\\"amb\\" data-arg=\\"" + j + "\\"><span class=\\"ll-eq\\">" + a.emoji + "</span>" + esc(a.name) + (S.ambient === a.id ? " •" : "") + "</button>";
      }
      h += "</div>";
      if (S.ambient !== "none") {
        h += "<div class=\\"ll-volrow\\"><button class=\\"ll-ico-btn\\" data-act=\\"ambtoggle\\">⏯</button>";
        h += "<input type=\\"range\\" min=\\"0\\" max=\\"1\\" step=\\"0.05\\" value=\\"" + S.volume + "\\" data-act=\\"ambvol\\"/><span style=\\"font-size:12px;color:var(--ll-txt3)\\">" + Math.round(S.volume * 100) + "%</span></div>";
      }
      h += "</div>";
    }
    h += "</div>";
    return h;
  }

  function footerHtml() {
    var h = "<footer class=\\"ll-footer\\"><div class=\\"ll-inner\\">";
    h += "<button class=\\"ll-navbtn ll-prev\\" data-act=\\"prev\\">‹ Previous</button>";
    h += "<div class=\\"ll-dots\\">";
    for (var i = 0; i < STEPS.length; i++) {
      var pr = S.steps[STEPS[i].id];
      h += "<button class=\\"ll-dot" + (i === S.idx ? " ll-cur" : "") + (pr && pr.status === "completed" ? " ll-done" : "") + "\\" data-act=\\"goto\\" data-arg=\\"" + i + "\\"></button>";
    }
    h += "</div>";
    var last = S.idx >= STEPS.length - 1;
    h += "<button class=\\"ll-navbtn ll-next\\" data-act=\\"next\\" " + (last ? "disabled" : "") + ">Next ›</button>";
    h += "</div></footer>";
    return h;
  }

  function stepHtml(step) {
    var h = "";
    h += "<div class=\\"ll-stephead\\">";
    h += "<div><h1 class=\\"ll-title\\">" + esc(step.title) + "</h1>";
    if (step.gamification && step.gamification.points) {
      h += "<div class=\\"ll-zap\\">⚡ +" + step.gamification.points + " points available</div>";
    }
    h += "</div>";
    if (step.communityLegacy) h += "<span class=\\"ll-legacy\\">Community/Legacy</span>";
    h += "</div>";
    if (S.teacher && step.teacherPrompt) {
      h += "<div class=\\"ll-tnotes\\" data-act=\\"speak\\" data-text=\\"" + esc(step.teacherPrompt.substring(0, 120)) + "\\">";
      h += "<h4>🎯 Teacher Instructions</h4><div class=\\"ll-md\\">" + md(step.teacherPrompt) + "</div></div>";
    }
    if (step.studentInstructions) {
      h += "<div class=\\"ll-sinst\\" data-act=\\"speak\\" data-text=\\"" + esc(step.studentInstructions.substring(0, 120)) + "\\"><p>" + mdInline(esc(step.studentInstructions)) + "</p></div>";
    }
    if (step.languageReference) h += langHtml(step.languageReference);
    h += timerHtml(step);
    h += "<div class=\\"ll-card\\">" + activityHtml(step) + "</div>";
    h += feedbackHtml(step);
    return h;
  }

  function timerHtml(step) {
    var total = step.durationSeconds || 300;
    var rem = S.timer.remaining;
    if (!S.timer.remaining) rem = total;
    var prog = Math.max(0, Math.min(1, rem / total));
    var circ = 2 * Math.PI * 26;
    var off = circ * (1 - prog);
    var color = rem <= 10 ? "#ef4444" : rem <= 30 ? "#f59e0b" : "#6366f1";
    var h = "<div class=\\"ll-timer\\">";
    h += "<div class=\\"ll-tcirc\\"><svg width=\\"62\\" height=\\"62\\" viewBox=\\"0 0 56 56\\">";
    h += "<circle cx=\\"28\\" cy=\\"28\\" r=\\"26\\" fill=\\"none\\" stroke=\\"var(--ll-bg3)\\" stroke-width=\\"4\\"/>";
    h += "<circle cx=\\"28\\" cy=\\"28\\" r=\\"26\\" fill=\\"none\\" stroke=\\"" + color + "\\" stroke-width=\\"4\\" stroke-linecap=\\"round\\" stroke-dasharray=\\"" + circ + "\\" stroke-dashoffset=\\"" + off + "\\"/>";
    h += "</svg><span class=\\"ll-tt\\" style=\\"color:" + (rem <= 30 ? "#fbbf24" : "var(--ll-txt)") + "\\">" + fmtTime(rem) + "</span></div>";
    if (S.teacher) {
      h += "<button class=\\"ll-tbtn\\" data-act=\\"timer\\" data-arg=\\"toggle\\" title=\\"Start/Pause\\">" + (S.timer.running ? "⏸" : "▶") + "</button>";
      h += "<button class=\\"ll-tbtn\\" data-act=\\"timer\\" data-arg=\\"reset\\" title=\\"Reset\\">↺</button>";
      h += "<button class=\\"ll-tbtn\\" data-act=\\"timer\\" data-arg=\\"plus\\" title=\\"+1 min\\">+1m</button>";
    }
    if (S.timer.running) h += "<div class=\\"ll-tdot\\"></div>";
    h += "</div>";
    return h;
  }

  function langHtml(ref) {
    var h = "<div class=\\"ll-lang\\">";
    h += "<div class=\\"ll-langhead\\"><span>📚</span><span>Language Reference</span></div>";
    if (ref.grammar && ref.grammar.length) {
      h += "<div class=\\"ll-sec\\"><button class=\\"ll-sechead\\" data-act=\\"sec\\">📖 Grammar <span>▾</span></button><div class=\\"ll-secbody\\">";
      for (var i = 0; i < ref.grammar.length; i++) {
        var g = ref.grammar[i];
        h += "<div class=\\"ll-grow\\" data-act=\\"speak\\" data-text=\\"" + esc((g.rule + ". For example: " + g.example).substring(0, 130)) + "\\">";
        h += "<button class=\\"ll-chk\\" data-act=\\"chk\\">⬜</button>";
        h += "<div class=\\"ll-gbox\\" style=\\"border-left-color:" + esc(g.color || "#6366f1") + ";background:" + esc(g.color || "#6366f1") + "15\\">";
        h += "<b>" + mdInline(esc(g.rule)) + "</b><i>“" + mdInline(esc(g.example)) + "”</i></div></div>";
      }
      h += "</div></div>";
    }
    if (ref.vocabulary && ref.vocabulary.length) {
      h += "<div class=\\"ll-sec\\"><button class=\\"ll-sechead\\" data-act=\\"sec\\">📝 Vocabulary <span>▾</span></button><div class=\\"ll-secbody\\"><div class=\\"ll-vwrap\\">";
      for (var v = 0; v < ref.vocabulary.length; v++) {
        var w = ref.vocabulary[v];
        h += "<div class=\\"ll-vchip\\" style=\\"background:" + esc(w.color || "#f59e0b") + "20;border:2px solid " + esc(w.color || "#f59e0b") + "40\\" data-act=\\"speak\\" data-text=\\"" + esc((w.word + ": " + (w.definition || "")).substring(0, 130)) + "\\">";
        h += "<b style=\\"color:" + esc(w.color || "#f59e0b") + "\\">" + esc(w.word) + "</b>";
        h += "<span>– " + esc(w.definition) + "</span></div>";
      }
      h += "</div></div></div>";
    }
    if (ref.expressions && ref.expressions.length) {
      h += "<div class=\\"ll-sec\\"><button class=\\"ll-sechead\\" data-act=\\"sec\\">💡 Expressions <span>▾</span></button><div class=\\"ll-secbody\\">";
      for (var e = 0; e < ref.expressions.length; e++) {
        var ex = ref.expressions[e];
        h += "<div class=\\"ll-grow ll-expr\\" data-act=\\"speak\\" data-text=\\"" + esc(ex.phrase) + "\\">";
        h += "<button class=\\"ll-chk\\" data-act=\\"chk\\">⬜</button><div><b>“" + esc(ex.phrase) + "”</b><p>" + esc(ex.context) + "</p></div></div>";
      }
      h += "</div></div>";
    }
    if (ref.spokenGrammar && ref.spokenGrammar.length) {
      h += "<div class=\\"ll-sec\\"><button class=\\"ll-sechead\\" data-act=\\"sec\\">🗣️ Spoken Grammar <span>▾</span></button><div class=\\"ll-secbody\\">";
      for (var sg = 0; sg < ref.spokenGrammar.length; sg++) {
        h += "<div class=\\"ll-grow\\" data-act=\\"speak\\" data-text=\\"" + esc(ref.spokenGrammar[sg]) + "\\">";
        h += "<button class=\\"ll-chk\\" data-act=\\"chk\\">⬜</button><p style=\\"color:#22d3ee;font-size:17px\\">" + mdInline(esc(ref.spokenGrammar[sg])) + "</p></div>";
      }
      h += "</div></div>";
    }
    if (ref.sentenceStarters && ref.sentenceStarters.length) {
      h += "<div class=\\"ll-sec\\"><button class=\\"ll-sechead\\" data-act=\\"sec\\">✍️ Sentence Starters <span>▾</span></button><div class=\\"ll-secbody\\">";
      for (var ss = 0; ss < ref.sentenceStarters.length; ss++) {
        var sss = ref.sentenceStarters[ss];
        h += "<div class=\\"ll-grow\\" data-act=\\"speak\\" data-text=\\"" + esc(sss.starter) + "\\">";
        h += "<button class=\\"ll-chk\\" data-act=\\"chk\\">⬜</button>";
        h += "<div class=\\"ll-ssbox\\"><b>“" + esc(sss.starter) + "”</b>" + (sss.purpose ? "<p>" + esc(sss.purpose) + "</p>" : "") + "</div></div>";
      }
      h += "</div></div>";
    }
    h += "</div>";
    return h;
  }

  function feedbackHtml(step) {
    var h = "";
    var ccqs = (step.ccqQuestions || []).concat((step.h5pActivity && step.h5pActivity.feedback && step.h5pActivity.feedback.ccqQuestions) || []);
    var spks = (step.speakingQuestions || []).concat((step.h5pActivity && step.h5pActivity.feedback && step.h5pActivity.feedback.speakingQuestions) || []);
    if (ccqs.length) {
      h += "<div class=\\"ll-ccq\\"><h4>❓ Concept Check Questions (CCQ)</h4>";
      for (var i = 0; i < ccqs.length; i++) {
        h += "<div class=\\"ll-item\\" data-act=\\"speak\\" data-text=\\"" + esc(ccqs[i].question) + "\\">";
        h += "<b>💬 " + mdInline(esc(ccqs[i].question)) + "</b>";
        if (ccqs[i].answer) {
          h += "<details><summary>👁️ Show answer</summary><p class=\\"ll-ans\\">" + mdInline(esc(ccqs[i].answer)) + "</p></details>";
        }
        if (ccqs[i].purpose) h += "<p class=\\"ll-purp\\">Purpose: " + esc(ccqs[i].purpose) + "</p>";
        h += "</div>";
      }
      h += "</div>";
    }
    if (spks.length) {
      h += "<div class=\\"ll-spk\\"><h4>🎤 Speaking Practice</h4>";
      for (var j = 0; j < spks.length; j++) {
        var sq = spks[j];
        h += "<div class=\\"ll-item\\" data-act=\\"speak\\" data-text=\\"" + esc(sq.question) + "\\">";
        h += "<div class=\\"ll-srow\\"><p>" + mdInline(esc(sq.question)) + "</p>";
        if (sq.level) h += "<span class=\\"ll-level ll-lv-" + esc(sq.level) + "\\">" + esc(sq.level) + "</span>";
        h += "</div>";
        if (sq.followUp) h += "<p class=\\"ll-follow\\">↪️ Follow-up: " + esc(sq.followUp) + "</p>";
        if (sq.targetLanguage) h += "<p class=\\"ll-target\\">🎯 Target: “" + esc(sq.targetLanguage) + "”</p>";
        h += "</div>";
      }
      h += "</div>";
    }
    return h;
  }

  /* ── activities ──────────────────────────────────────── */

  function activityHtml(step) {
    var a = normalizeActivity(step.h5pActivity || { type: step.type });
    var t = a.type || step.type;
    try {
      var miss = missingFields(a, t);
      if (miss.length) return missingHtml(a, t, miss);
    } catch (err) {
      return missingHtml(a, t, ["content"]);
    }
    /* The step the renderers receive carries the normalised activity, so a sparse
       AI payload can never crash a renderer mid-lesson. */
    var safeStep = step;
    try { safeStep = Object.assign({}, step, { h5pActivity: a }); } catch (err) { safeStep = step; }
    switch (t) {
      case "would-you-rather": return wyrHtml(safeStep);
      case "accordion": return accHtml(safeStep);
      case "true-false": return tfHtml(safeStep);
      case "mark-the-words": return mtwHtml(safeStep);
      case "fill-in-blanks": return fibHtml(safeStep);
      case "memory-game": return memHtml(safeStep);
      case "image-hotspots": return ihHtml(safeStep);
      case "spot-the-difference": return stdHtml(safeStep);
      case "truth-or-dare": return todHtml(safeStep);
      case "drag-the-words": return dtwHtml(safeStep);
      case "flashcards": return fcHtml(safeStep);
      case "word-cloud": return wcHtml(safeStep);
      case "multiple-choice": return mcqHtml(safeStep);
      case "audio-discussion": return audHtml(safeStep);
      case "team-quiz": return tqHtml(safeStep);
      default: return defaultHtml(a);
    }
  }

  function fbHtml(feedback, result) {
    if (!feedback || !result) return "";
    var ok = result === "correct";
    var txt = ok ? (feedback.correctFeedback || "Great job!") : (feedback.incorrectFeedback || "Not quite — try again!");
    var h = "<div class=\\"ll-fb " + (ok ? "ll-ok" : "ll-no") + "\\">";
    h += "<b>" + (ok ? "✅ " : "❌ ") + mdInline(esc(txt)) + "</b>";
    if (feedback.languageNote) h += "<p>💡 " + mdInline(esc(feedback.languageNote)) + "</p>";
    if (feedback.encouragement) h += "<p>" + esc(feedback.encouragement) + "</p>";
    h += "</div>";
    return h;
  }

  function actBtns(stepId, extra) {
    var h = "<div class=\\"ll-btnrow\\">";
    if (extra) h += extra;
    h += "<button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button></div>";
    return h;
  }

  /* audio-discussion — record a spoken response to a discussion prompt,
     optionally transcribed via SpeechRecognition, then reflect on peers' audio. */
  function audHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.recordings) s.recordings = {};
    if (!s.transcripts) s.transcripts = {};
    var prompts = a.prompts || [];
    var h = "<div class=\\"ll-actq\\"><p>" + mdInline(esc(a.instructions || "Listen to the prompt, record your spoken answer, then compare with the sample opinions.")) + "</p></div>";
    for (var i = 0; i < prompts.length; i++) {
      var p = prompts[i];
      var rec = s.recordings[p.id];
      h += "<div class=\\"ll-aud" + (rec ? " ll-audrec" : "") + "\\">";
      h += "<div class=\\"ll-audq\\" data-act=\\"speak\\" data-text=\\"" + esc((p.text || "").substring(0, 140)) + "\\">";
      h += "<span class=\\"ll-audico\\">🎧</span><div><b>" + mdInline(esc(p.text || "")) + "</b>";
      if (p.hint) h += "<p class=\\"ll-follow\\">💡 " + esc(p.hint) + "</p>";
      if (p.usefulLanguage && p.usefulLanguage.length) {
        h += "<div class=\\"ll-audlang\\">";
        for (var ul = 0; ul < p.usefulLanguage.length; ul++) h += "<span>" + esc(p.usefulLanguage[ul]) + "</span>";
        h += "</div>";
      }
      h += "</div></div>";
      h += "<div class=\\"ll-audctl\\">";
      var listening = UI.audRec === p.id;
      h += "<button class=\\"ll-btn " + (listening ? "ll-stop" : "ll-pri") + "\\" data-act=\\"audrec\\" data-arg=\\"" + esc(p.id) + "\\">" + (listening ? "⏹ Stop" : "🎙 Record") + "</button>";
      if (rec) {
        h += "<span class=\\"ll-audlen\\">⏱ " + rec + "s</span>";
        h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"audplay\\" data-arg=\\"" + esc(p.id) + "\\">▶ Play</button>";
      }
      if (s.transcripts[p.id]) h += "<span class=\\"ll-audtx\\" title=\\"" + esc(s.transcripts[p.id]) + "\\">📝 " + esc(s.transcripts[p.id].substring(0, 40)) + (s.transcripts[p.id].length > 40 ? "…" : "") + "</span>";
      h += "</div>";
      if (rec) h += "<div class=\\"ll-audwave\\"><span></span><span></span><span></span><span></span><span></span></div>";
      h += "</div>";
    }
    if (a.sampleOpinions && a.sampleOpinions.length) {
      h += "<div class=\\"ll-audsamp\\"><h4>💬 Sample opinions</h4>";
      for (var so = 0; so < a.sampleOpinions.length; so++) {
        var op = a.sampleOpinions[so];
        h += "<div class=\\"ll-item\\" data-act=\\"speak\\" data-text=\\"" + esc((op.text || "").substring(0, 140)) + "\\">";
        h += "<div class=\\"ll-srow\\"><p>" + mdInline(esc(op.text || "")) + "</p>" + (op.speaker ? "<span class=\\"ll-stype\\">" + esc(op.speaker) + "</span>" : "") + "</div></div>";
      }
      h += "</div>";
    }
    var doneCount = 0;
    for (var dk in s.recordings) { if (s.recordings[dk] !== undefined) doneCount++; }
    var allDone = prompts.length > 0 && doneCount >= prompts.length;
    h += actBtns(step.id, "<button class=\\"ll-btn ll-pri\\" data-act=\\"audsubmit\\" " + (allDone ? "" : "disabled") + ">Submit responses ✓ (" + doneCount + "/" + prompts.length + ")</button>");
    return h;
  }

  /* team-quiz — timed multiple-choice sprint with team points and a live scoreboard. */
  function tqHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.qi) s.qi = 0;
    if (!s.teamScore) s.teamScore = 0;
    if (!s.answers) s.answers = {};
    var qs = a.questions || [];
    if (!qs.length) return defaultHtml(a);
    var perQ = (a.secondsPerQuestion || 20);
    var h = "";
    if (s.finished) {
      var maxPts = 0;
      for (var mi = 0; mi < qs.length; mi++) maxPts += (qs[mi].points || 10);
      h += "<div class=\\"ll-tqdone\\">";
      h += "<span class=\\"ll-tqemoji\\">" + (s.teamScore >= maxPts * 0.8 ? "🏆" : s.teamScore >= maxPts * 0.5 ? "🎉" : "💪") + "</span>";
      h += "<h3>Team score: " + s.teamScore + " / " + maxPts + "</h3>";
      h += "<p>" + (s.teamScore >= maxPts * 0.8 ? "Outstanding teamwork!" : s.teamScore >= maxPts * 0.5 ? "Great collaboration — review the misses together." : "Nice effort — retry to beat your score!") + "</p>";
      h += "<div class=\\"ll-tqboard\\">";
      for (var bi = 0; bi < qs.length; bi++) {
        var q2 = qs[bi];
        var picked = s.answers[q2.id];
        var ok = false;
        for (var ci = 0; ci < (q2.choices || []).length; ci++) { if (q2.choices[ci].correct && q2.choices[ci].id === picked) ok = true; }
        h += "<span class=\\"ll-tqcell " + (ok ? "ll-tqok" : "ll-tqno") + "\\" title=\\"" + esc(q2.question || "") + "\\">" + (ok ? "✅" : "❌") + "</span>";
      }
      h += "</div>";
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-ghost\\" data-act=\\"tqretry\\">↺ Retry quiz</button></div>";
      h += "</div>";
      return h;
    }
    var q = qs[s.qi];
    var picked = s.answers[q.id];
    var revealed = s.revealed;
    h += "<div class=\\"ll-tqhead\\">";
    h += "<span class=\\"ll-tqnum\\">Q" + (s.qi + 1) + "/" + qs.length + "</span>";
    h += "<span class=\\"ll-tqtimer\\" id=\\"ll-tqtimer\\">⏱ " + perQ + "s</span>";
    h += "<span class=\\"ll-tqscore\\">🏆 " + s.teamScore + "</span>";
    h += "</div>";
    h += "<div class=\\"ll-actq\\"><p>" + mdInline(esc(q.question || "")) + "</p></div>";
    h += "<div class=\\"ll-mcq\\">";
    for (var c2 = 0; c2 < (q.choices || []).length; c2++) {
      var ch2 = q.choices[c2];
      var isPick = picked === ch2.id;
      var isCorr = !!ch2.correct;
      var cls2 = "ll-choice";
      if (revealed) { if (isCorr) cls2 += " ll-okc"; else if (isPick) cls2 += " ll-badc"; }
      else if (isPick) cls2 += " ll-sel";
      h += "<button class=\\"" + cls2 + "\\" data-act=\\"tqpick\\" data-id=\\"" + esc(ch2.id) + "\\" " + (revealed ? "disabled" : "") + ">";
      h += "<span style=\\"font-size:18px\\">" + (revealed ? (isCorr ? "✅" : isPick ? "❌" : "○") : isPick ? "●" : "○") + "</span>";
      h += "<span>" + mdInline(esc(ch2.text || "")) + "</span></button>";
    }
    h += "</div>";
    if (revealed) {
      var corrObj = null;
      for (var cc = 0; cc < (q.choices || []).length; cc++) { if (q.choices[cc].correct) corrObj = q.choices[cc]; }
      var right = picked && corrObj && picked === corrObj.id;
      h += fbHtml(a.feedback, right ? "correct" : "incorrect");
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"tqnext\\">" + (s.qi < qs.length - 1 ? "Next question ›" : "See team score 🏆") + "</button></div>";
    }
    return h;
  }

  function defaultHtml(a) {
    var h = "<div class=\\"ll-default\\"><span class=\\"ll-de\\">🚧</span>";
    h += "<b>Activity: " + esc((a.type || "activity").replace(/-/g, " ")) + "</b>";
    h += "<p>This activity type is coming soon!</p>";
    h += "<pre class=\\"ll-jsonpre\\">" + esc(JSON.stringify(a, null, 2)) + "</pre></div>";
    return h;
  }

  /* ── activity safety net ───────────────────────────────
     An AI-generated manual can arrive with a step that only carries
     { "type": "accordion" } and none of the content fields. Before this, such a
     step threw inside render(), which left the whole lesson stuck on the previous
     screen with no visible error. Now every list/string field gets a safe empty
     value, and a step that is genuinely empty says exactly what is missing. */

  var LIST_FIELDS = ["rounds", "panels", "correctWords", "blanks", "pairs", "hotspots", "differences", "items", "words", "cards", "seedWords", "prompts", "sampleOpinions", "questions", "choices"];
  var TEXT_FIELDS = ["text", "textWithBlanks", "textWithPlaceholders", "statement", "question", "prompt", "instructions", "imageUrl", "imageA", "imageB", "front", "back", "label", "content", "title", "hint", "imageAlt", "showSpeakingQuestion"];

  function arr(v) { return Object.prototype.toString.call(v) === "[object Array]" ? v : []; }
  function str(v) { return (v === undefined || v === null) ? "" : String(v); }

  function normalizeActivity(raw) {
    var src = raw || {};
    var a = {};
    for (var k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) a[k] = src[k]; }
    for (var i = 0; i < LIST_FIELDS.length; i++) a[LIST_FIELDS[i]] = arr(a[LIST_FIELDS[i]]);
    for (var j = 0; j < TEXT_FIELDS.length; j++) a[TEXT_FIELDS[j]] = str(a[TEXT_FIELDS[j]]);
    return a;
  }

  /* What each activity type needs to render — also surfaced in the AI prompt. */
  function missingFields(a, type) {
    var miss = [];
    switch (type) {
      case "would-you-rather": if (!a.rounds.length && !a.question && !a.optionA && !a.optionB) miss.push("rounds[{ question, optionA{text,emoji}, optionB{text,emoji} }]"); break;
      case "accordion": if (!a.panels.length) miss.push("panels[{ title, content }]"); break;
      case "true-false":
        if (!a.statement) miss.push("statement");
        if (a.correct !== true && a.correct !== false) miss.push("correct (true or false)");
        break;
      case "mark-the-words":
        if (!a.text) miss.push("text");
        if (!a.correctWords.length) miss.push("correctWords[]");
        break;
      case "fill-in-blanks":
        if (!a.textWithBlanks) miss.push("textWithBlanks (uses [blank0], [blank1] …)");
        if (!a.blanks.length) miss.push("blanks[{ id, correct: [], hint }]");
        break;
      case "drag-the-words":
        if (!a.textWithPlaceholders) miss.push("textWithPlaceholders (uses [drag])");
        if (!a.words.length) miss.push("words[{ id, word, correctPosition }]");
        break;
      case "memory-game": if (!a.pairs.length) miss.push("pairs[{ id, cardA, cardB }]"); break;
      case "image-hotspots":
        if (!a.imageUrl) miss.push("imageUrl");
        if (!a.hotspots.length) miss.push("hotspots[{ id, x, y, label, content }]");
        break;
      case "spot-the-difference":
        if (!a.imageA || !a.imageB) miss.push("imageA + imageB");
        if (!a.differences.length) miss.push("differences[{ id, x, y, description }]");
        break;
      case "truth-or-dare": if (!a.items.length) miss.push("items[{ type, text }]"); break;
      case "flashcards": if (!a.cards.length) miss.push("cards[{ id, front, back }]"); break;
      case "word-cloud": if (!a.prompt) miss.push("prompt"); break;
      case "multiple-choice": if (!a.choices.length) miss.push("choices[{ id, text, correct }]"); break;
      case "audio-discussion": if (!a.prompts.length) miss.push("prompts[{ id, text, hint }]"); break;
      case "team-quiz": if (!a.questions.length) miss.push("questions[{ id, question, points, choices[{ id, text, correct }] }]"); break;
      default: return [];
    }
    return miss;
  }

  /* Shown if a render ever throws despite the guards: the lesson stays usable
     (Prev/Next) and the failure is visible instead of a frozen screen. */
  function renderErrorHtml(why) {
    var h = "<main class=\\"ll-main\\"><div class=\\"ll-content\\"><div class=\\"ll-wrap\\">";
    h += "<div class=\\"ll-default\\"><span class=\\"ll-de\\">⚠️</span>";
    h += "<b>This step could not be rendered</b><p>" + esc(why) + "</p>";
    h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"prev\\">‹ Previous step</button><button class=\\"ll-btn ll-ghost\\" data-act=\\"next\\">Next ›</button></div></div>";
    h += "</div></div></main>";
    return h;
  }

  function missingHtml(a, type, miss) {
    var h = "<div class=\\"ll-default\\"><span class=\\"ll-de\\">🧩</span>";
    h += "<b>This step still needs its content</b>";
    h += "<p>The activity JSON for \\\"" + esc(type || a.type || "activity") + "\\\" is missing: <b>" + esc(miss.join(", ")) + "</b></p>";
    h += "<p>Copy the AI prompt again — it lists the exact fields every activity type needs — regenerate the JSON and paste it back in.</p>";
    h += "<pre class=\\"ll-jsonpre\\">" + esc(JSON.stringify(a, null, 2)) + "</pre></div>";
    return h;
  }

  /* would-you-rather */
  function wyrHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.rounds) {
      s.rounds = (a.rounds && a.rounds.length) ? a.rounds : [{ id: "r0", question: a.question, optionA: a.optionA, optionB: a.optionB, speakingPrompts: a.speakingPrompts, feedback: a.feedback }];
      s.ri = 0; s.choices = {};
    }
    var rounds = s.rounds;
    var cur = rounds[s.ri] || rounds[0];
    var h = "";
    if (rounds.length > 1) {
      h += "<div class=\\"ll-wyrnav\\">";
      h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"wyr\\" data-arg=\\"prev\\" " + (s.ri === 0 ? "disabled" : "") + ">‹ Back</button>";
      h += "<div class=\\"ll-wyrdots\\">";
      for (var i = 0; i < rounds.length; i++) {
        h += "<button class=\\"ll-wyrdot" + (i === s.ri ? " ll-on" : "") + (s.choices[i] ? " ll-chosen" : "") + "\\" data-act=\\"wyr\\" data-arg=\\"jump\\" data-arg2=\\"" + i + "\\"></button>";
      }
      h += "<span style=\\"font-size:14px;color:var(--ll-txt2)\\">" + (s.ri + 1) + " / " + rounds.length + "</span>";
      h += "</div>";
      h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"wyr\\" data-arg=\\"next\\" " + (s.ri >= rounds.length - 1 ? "disabled" : "") + ">Next ›</button>";
      h += "</div>";
    }
    if (cur.question) h += "<div class=\\"ll-wyrq\\">" + esc(cur.question) + "</div>";
    h += "<div class=\\"ll-wyrgrid\\">";
    h += wyrOptHtml(cur.optionA, s.choices[s.ri] === "a");
    h += wyrOptHtml(cur.optionB, s.choices[s.ri] === "b");
    h += "</div>";
    if (s.choices[s.ri]) {
      h += fbHtml(cur.feedback, "correct");
    } else {
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"wyr\\" data-arg=\\"pick\\" data-arg2=\\"a\\">Choose A</button>";
      h += "<button class=\\"ll-btn ll-grn\\" data-act=\\"wyr\\" data-arg=\\"pick\\" data-arg2=\\"b\\">Choose B</button></div>";
    }
    if (cur.speakingPrompts && cur.speakingPrompts.length) {
      h += "<div class=\\"ll-spkprompts\\" style=\\"margin-top:14px\\"><h4 style=\\"font-size:14px;font-weight:700;color:var(--ll-txt2);margin-bottom:6px\\">🗣️ Speaking prompts</h4><ul>";
      for (var p = 0; p < cur.speakingPrompts.length; p++) {
        h += "<li data-act=\\"speak\\" data-text=\\"" + esc(cur.speakingPrompts[p]) + "\\" style=\\"cursor:pointer\\">🔊 " + esc(cur.speakingPrompts[p]) + "</li>";
      }
      h += "</ul></div>";
    }
    return h;
  }

  function wyrOptHtml(opt, chosen) {
    if (!opt) return "";
    var h = "<div class=\\"ll-wyropt" + (chosen ? " ll-on" : "") + "\\">";
    if (opt.emoji) h += "<span class=\\"ll-oe\\">" + opt.emoji + "</span>";
    h += "<b>" + esc(opt.text) + "</b>";
    if (chosen) h += "<span style=\\"color:#34d399;font-weight:700\\">✓ Chosen</span>";
    h += "</div>";
    return h;
  }

  /* accordion */
  function accHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.open) s.open = {};
    if (!s.viewed) s.viewed = {};
    var h = "";
    for (var i = 0; i < a.panels.length; i++) {
      var p = a.panels[i];
      var isOpen = !!s.open[p.id];
      h += "<div class=\\"ll-acc" + (isOpen ? " ll-open" : "") + "\\">";
      h += "<button class=\\"ll-accbtn\\" data-act=\\"acc\\" data-arg=\\"" + i + "\\">" + mdInline(esc(p.title)) + " <span>" + (isOpen ? "▴" : "▾") + "</span></button>";
      h += "<div class=\\"ll-accbody\\">" + md(p.content) + "</div></div>";
    }
    var allViewed = true;
    for (var v = 0; v < a.panels.length; v++) { if (!s.viewed[a.panels[v].id]) { allViewed = false; break; } }
    if (!allViewed) {
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"accall\\">Open All</button></div>";
    } else {
      h += fbHtml(a.feedback, "correct");
    }
    return h;
  }

  /* true-false */
  function tfHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.checked) s.checked = false;
    if (!s.answer) s.answer = null;
    var correct = s.answer === a.correct;
    var h = "<div class=\\"ll-actq\\">";
    if (a.image) h += "<img src=\\"" + esc(a.image) + "\\" style=\\"width:100%;border-radius:12px;margin-bottom:14px;max-height:260px;object-fit:cover\\"/>";
    h += "<div style=\\"display:flex;gap:14px;align-items:flex-start\\">";
    h += "<p style=\\"flex:1\\">“" + mdInline(esc(a.statement)) + "”</p>";
    if (a.ttsEnabled) h += "<button class=\\"ll-ico-btn\\" data-act=\\"speak\\" data-text=\\"" + esc(a.statement.substring(0, 130)) + "\\">🔊</button>";
    h += "</div></div>";
    h += "<div style=\\"display:grid;grid-template-columns:1fr 1fr;gap:20px\\">";
    h += tfBtnHtml(true, s, correct, a.correct);
    h += tfBtnHtml(false, s, correct, a.correct);
    h += "</div>";
    if (s.checked) {
      h += fbHtml(a.feedback, correct ? "correct" : "incorrect");
      if (correct) {
        h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-ghost\\" data-act=\\"next\\">Next ›</button></div>";
      } else if (a.retryButton !== false) {
        h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"tfretry\\">Try Again</button></div>";
      }
      if (a.ttsEnabled) {
        var fbTxt = correct ? (a.trueFeedback || "") : (a.falseFeedback || "");
        if (fbTxt) {
          h += "<div class=\\"ll-tip\\" data-act=\\"speak\\" data-text=\\"" + esc(fbTxt.substring(0, 140)) + "\\">🔊 Listen to feedback: " + esc(fbTxt.substring(0, 110)) + "</div>";
        }
      }
    }
    return h;
  }

  function tfBtnHtml(val, s, correct, actual) {
    var cls = "ll-tfbtn";
    if (s.checked) {
      if (s.answer === val) cls += correct ? " ll-pick-ok" : " ll-pick-no";
      else if (actual === val) cls += " ll-reveal-ok";
      else cls += " ll-reveal-no";
    }
    var h = "<button class=\\"" + cls + "\\" data-act=\\"tf\\" data-arg=\\"" + (val ? 1 : 0) + "\\" " + (s.checked ? "disabled" : "") + ">";
    h += val ? "✅" : "❌";
    h += "<small>" + (val ? "TRUE" : "FALSE") + "</small></button>";
    return h;
  }

  /* mark-the-words */
  function mtwHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.marked) s.marked = {};
    if (!s.checked) s.checked = false;
    var words = a.text.split(/(\\s+)/);
    var correctSet = {};
    for (var c = 0; c < a.correctWords.length; c++) correctSet[a.correctWords[c].toLowerCase()] = true;
    var h = "<div class=\\"ll-actq\\"><p style=\\"font-size:13px;color:var(--ll-txt2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px\\">Click on words to mark them. Mark: " + esc(a.correctWords.join(", ")) + " type words.</p>";
    h += "<p class=\\"ll-marktext\\">";
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (/^\\s+$/.test(w)) { h += " "; continue; }
      var clean = w.replace(/[^a-zA-Z']/g, "").toLowerCase();
      if (!clean) { h += esc(w); continue; }
      var isMarked = !!s.marked[clean];
      var isCorrectW = !!correctSet[clean];
      var cls = "";
      if (!s.checked) cls = isMarked ? " ll-m" : "";
      else {
        if (isCorrectW && isMarked) cls = " ll-okm";
        else if (isCorrectW && !isMarked) cls = " ll-miss";
        else if (!isCorrectW && isMarked) cls = " ll-wrong";
      }
      h += "<span class=\\"" + cls + "\\" data-act=\\"mtw\\" data-word=\\"" + esc(clean) + "\\" " + (s.checked ? "style=\\"cursor:default\\"" : "") + ">" + esc(w) + "</span>";
    }
    h += "</p></div>";
    if (!s.checked) {
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"mtwcheck\\">Check ✓</button></div>";
    } else {
      var precision = 0, recall = 0;
      var markedCount = 0, correctMarked = 0;
      for (var m in s.marked) {
        if (s.marked[m]) {
          markedCount++;
          if (correctSet[m]) correctMarked++;
        }
      }
      if (markedCount > 0) precision = correctMarked / markedCount;
      if (a.correctWords.length > 0) recall = correctMarked / a.correctWords.length;
      var f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      var score = Math.round(f1 * 100);
      h += "<div class=\\"ll-score\\"><span>Precision: <b>" + Math.round(precision * 100) + "%</b></span><span>Recall: <b>" + Math.round(recall * 100) + "%</b></span><span>F1: <b>" + score + "</b></span></div>";
      h += fbHtml(a.feedback, score >= 80 ? "correct" : "incorrect");
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-ghost\\" data-act=\\"mtwretry\\">↺ Try Again</button>";
      if (score >= 80) h += "<button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button>";
      h += "</div>";
    }
    return h;
  }

  /* fill-in-blanks */
  function fibHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.answers) s.answers = {};
    if (!s.checked) s.checked = false;
    if (!s.hints) s.hints = {};
    var lines = a.textWithBlanks.split("\\n");
    var h = "";
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var parts = line.split(/\\[blank\\d+\\]/g);
      var matches = line.match(/\\[blank(\\d+)\\]/g) || [];
      h += "<div class=\\"ll-fibline\\">";
      for (var pi = 0; pi < parts.length; pi++) {
        if (parts[pi]) h += "<span class=\\"ll-tx\\">" + mdInline(esc(parts[pi])) + "</span>";
        if (matches[pi]) {
          var num = matches[pi].match(/\\d+/)[0];
          var blankId = "blank" + num;
          var blank = null;
          for (var b = 0; b < a.blanks.length; b++) { if (a.blanks[b].id === blankId) { blank = a.blanks[b]; break; } }
          if (!blank) continue;
          var isCorrect = false;
          if (s.checked && s.answers[blankId]) {
            isCorrect = blank.correct.some(function (c) { return a.caseSensitive ? c === s.answers[blankId] : c.toLowerCase() === String(s.answers[blankId]).toLowerCase(); });
          }
          var cls = s.checked ? (isCorrect ? " ll-okb" : " ll-badb") : "";
          h += "<input class=\\"ll-blank" + cls + "\\" data-blank=\\"" + blankId + "\\" value=\\"" + esc(s.answers[blankId] || "") + "\\" " + (s.checked ? "disabled" : "") + " placeholder=\\"...\\"/>";
          if (blank.hint && !s.checked) {
            h += "<button class=\\"ll-hintbtn\\" data-act=\\"fibhint\\" data-arg=\\"" + blankId + "\\">💡</button>";
          }
          if (s.hints[blankId]) h += "<span class=\\"ll-hint\\">" + esc(blank.hint) + "</span>";
        }
      }
      h += "</div>";
    }
    if (!s.checked) {
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"fibcheck\\">Check ✓</button></div>";
    } else {
      var correctCount = 0;
      for (var bb = 0; bb < a.blanks.length; bb++) {
        var bl = a.blanks[bb];
        var ok = bl.correct.some(function (c) { return a.caseSensitive ? c === s.answers[bl.id] : c.toLowerCase() === String(s.answers[bl.id] || "").toLowerCase(); });
        if (ok) correctCount++;
      }
      var all = correctCount === a.blanks.length;
      h += fbHtml(a.feedback, all ? "correct" : "incorrect");
      h += "<div class=\\"ll-btnrow\\">";
      if (!all) {
        h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"fibretry\\">↺ Try Again</button>";
        if (a.showSolutionButton) h += "<button class=\\"ll-btn ll-grn\\" data-act=\\"fibsol\\">👁 Show Solution</button>";
      } else {
        h += "<button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button>";
      }
      h += "</div>";
    }
    return h;
  }

  /* drag-the-words */
  function dtwHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.placed) s.placed = {};
    if (!s.checked) s.checked = false;
    var slots = a.textWithPlaceholders.split(/\\[drag\\]/g);
    var numSlots = slots.length - 1;
    var used = {};
    for (var u in s.placed) used[s.placed[u]] = true;
    var h = "<div class=\\"ll-bank\\"><p>🧩 Word Bank — click a word, then click a blank</p><div class=\\"ll-bankrow\\">";
    var placedAny = false;
    for (var i = 0; i < a.words.length; i++) {
      var w = a.words[i];
      if (used[w.id]) { placedAny = true; continue; }
      h += "<button class=\\"ll-dragword\\" data-act=\\"dtwbank\\" data-arg=\\"" + i + "\\">☰ " + esc(w.word) + "</button>";
    }
    if (!placedAny && !s.checked) h += "<span style=\\"font-size:13px;color:var(--ll-txt3);font-style:italic\\">All words placed!</span>";
    h += "</div></div>";
    h += "<div class=\\"ll-dtext\\">";
    for (var si = 0; si < slots.length; si++) {
      if (slots[si]) h += "<span>" + mdInline(esc(slots[si].trim())) + " </span>";
      if (si < numSlots) {
        var wid = s.placed[si];
        var word = null;
        for (var wi = 0; wi < a.words.length; wi++) { if (a.words[wi].id === wid) { word = a.words[wi]; break; } }
        var slotOk = false;
        if (s.checked && word) slotOk = word.correctPosition === si + 1;
        var scls = s.checked ? (slotOk ? " ll-okb" : (word ? " ll-badb" : "")) : "";
        h += "<span class=\\"ll-slot" + scls + "\\" data-act=\\"dtwslot\\" data-arg=\\"" + si + "\\">" + (word ? esc(word.word) : "___") + "</span>";
      }
    }
    h += "</div>";
    var correctCount = 0;
    for (var ci = 0; ci < numSlots; ci++) {
      var w2 = null;
      for (var wj = 0; wj < a.words.length; wj++) { if (a.words[wj].id === s.placed[ci]) { w2 = a.words[wj]; break; } }
      if (w2 && w2.correctPosition === ci + 1) correctCount++;
    }
    if (!s.checked) {
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"dtwcheck\\" " + (numSlots === 0 ? "disabled" : "") + ">Check ✓</button>";
      if (numSlots > 0 && Object.keys(s.placed).length === numSlots) {
        var anyEmpty = false;
        for (var e = 0; e < numSlots; e++) { if (!s.placed[e]) anyEmpty = true; }
        if (!anyEmpty) h = h; 
      }
      h += "</div>";
    } else {
      var allOk = correctCount === numSlots;
      h += fbHtml(a.feedback, allOk ? "correct" : "incorrect");
      h += "<div class=\\"ll-btnrow\\">";
      if (!allOk) h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"dtwretry\\">↺ Try Again</button>";
      else h += "<button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button>";
      h += "</div>";
    }
    return h;
  }

  /* memory game */
  function memHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.cards) {
      var cards = [];
      for (var p = 0; p < a.pairs.length; p++) {
        cards.push({ id: a.pairs[p].id + "-A", pair: a.pairs[p].id, content: a.pairs[p].cardA, flip: false, match: false });
        cards.push({ id: a.pairs[p].id + "-B", pair: a.pairs[p].id, content: a.pairs[p].cardB, flip: false, match: false });
      }
      for (var i = cards.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
      }
      s.cards = cards; s.flipped = []; s.moves = 0; s.matched = 0; s.timer = 0; s.running = false; s.finished = false;
    }
    var h = "<div class=\\"ll-memhead\\">";
    h += "<span style=\\"font-size:14px;color:var(--ll-txt2)\\">⏱ " + fmtTime(s.timer) + "</span>";
    h += "<span style=\\"font-size:14px;color:var(--ll-txt2)\\">🎯 " + s.matched + "/" + a.pairs.length + "</span>";
    h += "<span style=\\"font-size:14px;color:var(--ll-txt2)\\">👆 " + s.moves + " moves</span>";
    h += "<span style=\\"flex:1\\"></span>";
    h += "<button class=\\"ll-ico-btn\\" data-act=\\"memreset\\">↺ Restart</button>";
    h += "</div>";
    h += "<div class=\\"ll-memgrid\\">";
    for (var c = 0; c < s.cards.length; c++) {
      var card = s.cards[c];
      var cls = card.match ? " ll-match" : card.flip ? " ll-flip" : "";
      h += "<button class=\\"ll-memcard" + cls + "\\" data-act=\\"memcard\\" data-arg=\\"" + c + "\\">";
      h += "<span class=\\"ll-mfront\\">❓</span><span class=\\"ll-mback\\">" + esc(card.content) + "</span></button>";
    }
    h += "</div>";
    if (s.finished) {
      h += fbHtml(a.feedback, "correct");
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button></div>";
    }
    return h;
  }

  /* image hotspots */
  function ihHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.hotspots) s.hotspots = JSON.parse(JSON.stringify(a.hotspots || []));
    if (!s.visited) s.visited = {};
    if (!s.active) s.active = null;
    var h = "";
    if (a.showSpeakingQuestion) {
      h += "<div style=\\"background:rgba(67,56,202,.15);border:1px solid rgba(99,102,241,.25);border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;gap:10px;align-items:flex-start\\">";
      h += "<span style=\\"font-size:22px\\">🎤</span><p style=\\"font-size:16px;color:#c7d2fe\\">" + esc(a.showSpeakingQuestion) + "</p></div>";
    }
    h += "<div class=\\"ll-ihwrap\\" id=\\"ll-ihwrap\\">";
    h += "<img src=\\"" + esc(a.imageUrl) + "\\" alt=\\"" + esc(a.imageAlt || "Image") + "\\" draggable=\\"false\\"/>";
    for (var i = 0; i < s.hotspots.length; i++) {
      var hp = s.hotspots[i];
      h += "<button class=\\"ll-ihpin" + (s.visited[hp.id] ? " ll-visited" : "") + "\\" style=\\"left:" + hp.x + "%;top:" + hp.y + "%\\" data-act=\\"ihpin\\" data-arg=\\"" + i + "\\">" + esc(hp.icon || "📍") + "</button>";
    }
    if (s.active !== null) {
      var act = s.hotspots[s.active];
      if (act) {
        h += "<div class=\\"ll-ihpop\\"><button class=\\"ll-ihx\\" data-act=\\"ihclose\\">✕</button>";
        h += "<b>" + esc(act.label) + "</b><p>" + esc(act.content) + "</p>";
        h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-ghost\\" data-act=\\"ihdel\\" data-arg=\\"" + s.active + "\\">🗑 Delete</button>";
        h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"ihedit\\" data-arg=\\"" + s.active + "\\">✏️ Edit</button></div>";
        h += "</div>";
      }
    }
    if (s.editingId !== undefined && s.editingId !== null) {
      var eh = s.hotspots[s.editingId] || { label: "", content: "" };
      h += "<div class=\\"ll-ihpop\\"><button class=\\"ll-ihx\\" data-act=\\"ihclose\\">✕</button>";
      h += "<b>✏️ Edit hotspot</b>";
      h += "<input data-ihfield=\\"label\\" value=\\"" + esc(eh.label) + "\\" placeholder=\\"Label\\" style=\\"width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid var(--ll-brd);background:var(--ll-bg3);color:var(--ll-txt)\\"/>";
      h += "<input data-ihfield=\\"content\\" value=\\"" + esc(eh.content) + "\\" placeholder=\\"Content\\" style=\\"width:100%;margin-top:6px;padding:8px;border-radius:8px;border:1px solid var(--ll-brd);background:var(--ll-bg3);color:var(--ll-txt)\\"/>";
      h += "<input data-ihfield=\\"icon\\" value=\\"" + esc(eh.icon || "") + "\\" placeholder=\\"Icon emoji\\" style=\\"width:100%;margin-top:6px;padding:8px;border-radius:8px;border:1px solid var(--ll-brd);background:var(--ll-bg3);color:var(--ll-txt)\\"/>";
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"ihsaveedit\\">💾 Save</button></div></div>";
    }
    h += "</div>";
    h += "<div class=\\"ll-btnrow\\" style=\\"margin-top:12px\\">";
    h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"ihadd\\">➕ Add Hotspot</button>";
    if (s.adding) h += "<span style=\\"font-size:13px;color:#fbbf24;align-self:center\\">Click anywhere on the image to place the hotspot</span>";
    h += "<span style=\\"flex:1\\"></span>";
    var allVisited = s.hotspots.length > 0;
    for (var v in s.visited) { if (!s.visited[v]) { allVisited = false; break; } }
    if (s.hotspots.length === 0) allVisited = false;
    if (allVisited) {
      h += "<button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button>";
    }
    h += "</div>";
    return h;
  }

  /* spot the difference */
  function stdHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.found) s.found = {};
    if (!s.wrong) s.wrong = 0;
    if (!s.finished) s.finished = false;
    if (!s.timer) s.timer = a.timeLimit || 0;
    var h = "";
    h += "<div class=\\"ll-memhead\\">";
    h += "<span style=\\"font-size:14px;color:var(--ll-txt2)\\">👀 " + Object.keys(s.found).length + "/" + a.differences.length + " found</span>";
    if (a.timeLimit) h += "<span style=\\"font-size:14px;color:var(--ll-txt2)\\">⏱ " + fmtTime(s.timer) + "</span>";
    h += "<span style=\\"font-size:14px;color:var(--ll-txt2)\\">❌ " + s.wrong + "</span>";
    h += "<span style=\\"flex:1\\"></span>";
    h += "<button class=\\"ll-ico-btn\\" data-act=\\"stdretry\\">↺ Restart</button>";
    h += "</div>";
    h += "<div class=\\"ll-stdgrid\\">";
    h += "<div class=\\"ll-stdimg\\" data-act=\\"stdimg\\" data-img=\\"a\\"><img src=\\"" + esc(a.imageA) + "\\" draggable=\\"false\\"/>" + stdMarks(s, a.differences) + "</div>";
    h += "<div class=\\"ll-stdimg\\"><img src=\\"" + esc(a.imageB) + "\\" draggable=\\"false\\"/></div>";
    h += "</div>";
    if (s.finished) {
      h += fbHtml(a.feedback, "correct");
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button></div>";
    } else {
      h += "<div class=\\"ll-tip\\" style=\\"margin-top:12px\\">Click Image A where you spot a difference vs Image B. Use “has changed / has appeared / has been removed” to describe it!</div>";
    }
    return h;
  }

  function stdMarks(s, diffs) {
    var h = "";
    for (var i = 0; i < diffs.length; i++) {
      if (s.found[diffs[i].id]) {
        h += "<span class=\\"ll-stdmark ll-ok\\" style=\\"left:" + diffs[i].x + "%;top:" + diffs[i].y + "%\\"></span>";
      }
    }
    return h;
  }

  /* truth or dare */
  function todHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.filter) s.filter = "all";
    if (!s.completed) s.completed = {};
    if (!s.spinning) s.spinning = false;
    if (!s.current) s.current = null;
    var filtered = [];
    for (var i = 0; i < a.items.length; i++) {
      if (s.filter === "all" || a.items[i].type === s.filter) filtered.push(i);
    }
    var h = "<div class=\\"ll-todfilters\\">";
    var filters = [["all", "🎲 All", "ll-on-all"], ["truth", "🔵 Truth", "ll-on-blue"], ["dare", "🔴 Dare", "ll-on-red"]];
    for (var f = 0; f < filters.length; f++) {
      h += "<button class=\\"ll-todf" + (s.filter === filters[f][0] ? " " + filters[f][2] : "") + "\\" data-act=\\"todfilter\\" data-arg=\\"" + filters[f][0] + "\\">" + filters[f][1] + "</button>";
    }
    h += "</div>";
    h += "<div style=\\"text-align:center\\">";
    h += "<button class=\\"ll-wheel" + (s.spinning ? " ll-spin" : "") + "\\" data-act=\\"todspin\\" " + (s.spinning ? "disabled" : "") + ">🎲<br/><b>SPIN!</b></button>";
    h += "</div>";
    if (s.current !== null && filtered[s.current] !== undefined) {
      var item = a.items[filtered[s.current]];
      var done = !!s.completed[s.current];
      h += "<div class=\\"ll-todcard\\">";
      h += "<span class=\\"" + (item.type === "truth" ? "ll-tag-t" : "ll-tag-d") + "\\">" + (item.type === "truth" ? "🔵 TRUTH" : "🔴 DARE") + "</span>";
      h += "<b>" + esc(item.text) + "</b>";
      if (item.targetLanguage) h += "<p>🎯 Target: “" + esc(item.targetLanguage) + "”</p>";
      h += "</div>";
      h += "<div class=\\"ll-btnrow\\" style=\\"justify-content:center\\">";
      if (!done) h += "<button class=\\"ll-btn ll-pri\\" data-act=\\"todmark\\">✅ Done it!</button>";
      else h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"todspin\\">Next card</button>";
      h += "</div>";
    } else if (!s.spinning) {
      h += "<div class=\\"ll-todcard\\"><p style=\\"color:var(--ll-txt3)\\">Press SPIN to draw a card!</p></div>";
    }
    var doneCount = 0;
    for (var c in s.completed) { if (s.completed[c]) doneCount++; }
    h += "<p style=\\"text-align:center;margin-top:12px;font-size:13px;color:var(--ll-txt3)\\">" + doneCount + " cards completed</p>";
    return h;
  }

  /* flashcards */
  function fcHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.cards) {
      var cards = JSON.parse(JSON.stringify(a.cards || []));
      if (a.shuffle) {
        for (var i = cards.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
        }
      }
      s.cards = cards; s.ci = 0; s.flipped = false; s.known = {}; s.unknown = {};
    }
    var cards = s.cards;
    var cur = cards[s.ci];
    var progress = ((Object.keys(s.known).length + Object.keys(s.unknown).length) / cards.length) * 100;
    var finished = Object.keys(s.known).length + Object.keys(s.unknown).length === cards.length;
    var h = "<div class=\\"ll-fcbar\\">";
    h += "<div class=\\"ll-pbar\\"><div class=\\"ll-pfill\\" style=\\"width:" + progress + "%\\"></div></div>";
    h += "<span style=\\"font-size:13px;color:var(--ll-txt2);white-space:nowrap\\">" + (s.ci + 1) + "/" + cards.length + "</span>";
    h += "<button class=\\"ll-ico-btn\\" data-act=\\"fcshuffle\\" title=\\"Shuffle\\">🔀</button>";
    h += "</div>";
    h += "<div class=\\"ll-fcstage\\">";
    h += "<button class=\\"ll-ico-btn\\" data-act=\\"fcprev\\" " + (s.ci === 0 || finished ? "disabled" : "") + ">‹</button>";
    h += "<div class=\\"ll-fccard" + (s.flipped ? " ll-flipped" : "") + "\\" data-act=\\"fcflip\\">";
    h += "<div class=\\"ll-fcinner\\">";
    h += "<div class=\\"ll-fcface\\"><b>" + esc(cur.front) + "</b>" + (cur.category ? "<small>" + esc(cur.category) + "</small>" : "") + "<p style=\\"font-size:12px;color:var(--ll-txt3)\\">Click to flip</p></div>";
    var backLines = String(cur.back || "").split("\\n");
    var backMain = backLines[0] || "";
    var backRest = backLines.slice(1).join(" ");
    h += "<div class=\\"ll-fcface ll-back\\"><b>" + esc(backMain) + "</b>" + (backRest ? "<p>" + esc(backRest) + "</p>" : "") + "</div>";
    h += "</div></div>";
    h += "<button class=\\"ll-ico-btn\\" data-act=\\"fcnext\\" " + (s.ci >= cards.length - 1 || finished ? "disabled" : "") + ">›</button>";
    h += "</div>";
    if (!finished) {
      h += "<div class=\\"ll-fcmark\\">";
      h += "<button class=\\"ll-btn ll-fck\\" data-act=\\"fcknown\\">✓ Got It</button>";
      h += "<button class=\\"ll-btn ll-fcu\\" data-act=\\"fcunknown\\">✗ Still Learning</button>";
      h += "</div>";
    } else {
      h += fbHtml(a.feedback, "correct");
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button></div>";
    }
    return h;
  }

  /* word cloud */
  function wcHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.words) {
      s.words = [];
      for (var w = 0; w < (a.seedWords || []).length; w++) s.words.push({ text: a.seedWords[w], count: 1 });
    }
    if (!s.submitted) s.submitted = 0;
    var maxSub = a.maxSubmissions || 5;
    var h = "<div class=\\"ll-actq\\"><p>" + esc(a.prompt) + "</p></div>";
    h += "<div class=\\"ll-wcin\\"><input id=\\"ll-wcinput\\" placeholder=\\"Type a word...\\" " + (s.submitted >= maxSub ? "disabled" : "") + "/>";
    h += "<button class=\\"ll-btn ll-pri\\" data-act=\\"wcadd\\" " + (s.submitted >= maxSub ? "disabled" : "") + ">➤</button></div>";
    h += "<p style=\\"font-size:12px;color:var(--ll-txt3);margin-bottom:12px\\">" + s.submitted + "/" + maxSub + " submissions</p>";
    var maxCount = 1;
    for (var m = 0; m < s.words.length; m++) { if (s.words[m].count > maxCount) maxCount = s.words[m].count; }
    var colors = ["ll-c0", "ll-c1", "ll-c2", "ll-c3", "ll-c4", "ll-c5"];
    h += "<div class=\\"ll-cloud\\">";
    for (var i = 0; i < s.words.length; i++) {
      var size = 0.85 + (s.words[i].count / maxCount) * 1.15;
      h += "<span class=\\"ll-cw " + colors[i % colors.length] + "\\" style=\\"font-size:" + size + "rem\\">" + esc(s.words[i].text) + "</span>";
    }
    h += "</div>";
    if (s.submitted >= maxSub) {
      h += fbHtml(a.feedback, "correct");
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button></div>";
    }
    return h;
  }

  /* multiple choice */
  function mcqHtml(step) {
    var a = step.h5pActivity;
    var s = st(step.id);
    if (!s.sel) s.sel = {};
    if (!s.checked) s.checked = false;
    var correctIds = {};
    for (var c = 0; c < a.choices.length; c++) { if (a.choices[c].correct) correctIds[a.choices[c].id] = true; }
    var h = "<div class=\\"ll-actq\\">";
    if (a.questionImage) h += "<img src=\\"" + esc(a.questionImage) + "\\" style=\\"width:100%;border-radius:12px;margin-bottom:12px;max-height:190px;object-fit:cover\\"/>";
    h += "<p>" + mdInline(esc(a.question)) + "</p>";
    if (a.allowMultiple) h += "<small>Select all correct answers</small>";
    h += "</div>";
    h += "<div class=\\"ll-mcq\\">";
    var choices = a.randomise ? a.choices.slice().sort(function () { return Math.random() - 0.5; }) : a.choices;
    for (var i = 0; i < choices.length; i++) {
      var ch = choices[i];
      var isSel = !!s.sel[ch.id];
      var isCorrect = !!correctIds[ch.id];
      var cls = "ll-choice";
      if (s.checked) {
        if (isCorrect) cls += " ll-okc";
        else if (isSel) cls += " ll-badc";
      } else if (isSel) cls += " ll-sel";
      if (s.shakeId === ch.id) cls += " ll-shake";
      h += "<button class=\\"" + cls + "\\" data-act=\\"mcq\\" data-id=\\"" + esc(ch.id) + "\\" " + (s.checked ? "disabled" : "") + ">";
      h += "<span style=\\"font-size:18px\\">" + (isSel ? (s.checked ? (isCorrect ? "✅" : "❌") : "●") : "○") + "</span>";
      h += "<span>" + mdInline(esc(ch.text)) + "</span></button>";
    }
    h += "</div>";
    var selCount = 0;
    for (var sc in s.sel) { if (s.sel[sc]) selCount++; }
    if (!s.checked) {
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"mcqcheck\\" " + (selCount === 0 ? "disabled" : "") + ">Check ✓</button></div>";
    } else {
      var allSel = true, match = true;
      for (var ck in correctIds) { if (!s.sel[ck]) match = false; }
      for (var sk in s.sel) { if (s.sel[sk] && !correctIds[sk]) match = false; }
      if (a.allowMultiple) {
        var need = Object.keys(correctIds).length;
        var have = 0;
        for (var hk in s.sel) { if (s.sel[hk]) have++; }
        allSel = have === need;
      } else {
        allSel = selCount === 1;
      }
      var correct = match && allSel;
      h += fbHtml(a.feedback, correct ? "correct" : "incorrect");
      h += "<div class=\\"ll-btnrow\\">";
      if (correct) {
        h += "<button class=\\"ll-btn ll-pri\\" data-act=\\"next\\">Next ›</button>";
      } else {
        if (a.retryButton !== false) h += "<button class=\\"ll-btn ll-ghost\\" data-act=\\"mcqretry\\">↺ Try Again</button>";
        if (a.showSolutionButton) h += "<button class=\\"ll-btn ll-grn\\" data-act=\\"mcqsol\\">👁 Show Solution</button>";
      }
      h += "</div>";
    }
    return h;
  }

  /* ── cat widget ──────────────────────────────────────── */

  function catHtml() {
    var h = "<div class=\\"ll-cat\\" id=\\"ll-cat\\">";
    if (UI.catPanel) {
      h += "<div class=\\"ll-catpanel\\">";
      h += "<h3>🎤 Cat Voice Settings</h3>";
      h += "<button class=\\"ll-mutebig " + (S.cat.muted ? "ll-todf ll-on-red" : "ll-todf ll-on-blue") + "\\" data-act=\\"catmute\\">" + (S.cat.muted ? "🔇 Cat is Muted — click to unmute" : "🔊 Cat is Speaking — click to mute") + "</button>";
      h += "<div class=\\"ll-catsearch\\">🔍 <input id=\\"ll-voicesearch\\" placeholder=\\"Search voices...\\"/></div>";
      h += "<div class=\\"ll-voices\\" id=\\"ll-voices\\">";
      var shown = 0;
      for (var i = 0; i < VOICES.length; i++) {
        var v = VOICES[i];
        var q = UI.voiceQ || "";
        if (q && v.name.toLowerCase().indexOf(q.toLowerCase()) < 0 && (v.lang || "").toLowerCase().indexOf(q.toLowerCase()) < 0) continue;
        shown++;
        h += "<button class=\\"ll-voice" + (S.cat.voice === v.name ? " ll-cur" : "") + "\\" data-act=\\"catvoice\\" data-idx=\\"" + i + "\\">" + esc(v.name) + "<small>" + esc(v.lang || "") + "</small></button>";
      }
      if (!shown) h += "<p style=\\"padding:10px;font-size:13px;color:var(--ll-txt3)\\">No voices found</p>";
      h += "</div>";
      h += "<div class=\\"ll-catsliders\\">";
      h += "<div><label>Speed: <b>" + S.cat.rate.toFixed(1) + "x</b></label><input type=\\"range\\" min=\\"0.5\\" max=\\"1.5\\" step=\\"0.1\\" value=\\"" + S.cat.rate + "\\" data-act=\\"catrate\\"/></div>";
      h += "<div><label>Pitch: <b>" + S.cat.pitch.toFixed(1) + "</b></label><input type=\\"range\\" min=\\"0.5\\" max=\\"1.5\\" step=\\"0.1\\" value=\\"" + S.cat.pitch + "\\" data-act=\\"catpitch\\"/></div>";
      h += "</div></div>";
    }
    h += "<div class=\\"ll-catbub ll-hidden\\" id=\\"ll-catbub\\"></div>";
    h += "<div class=\\"ll-catface" + (S.cat.muted ? " ll-muted" : "") + "\\" id=\\"ll-catface\\" data-act=\\"catface\\">" + (S.cat.muted ? "😿" : "🐱") + "</div>";
    h += "<button class=\\"ll-catmute" + (S.cat.muted ? " ll-m\\" style=\\"background:#ef4444" : "") + "\\" data-act=\\"catmute\\">" + (S.cat.muted ? "🔇" : "🔊") + "</button>";
    h += "<button class=\\"ll-catset" + (UI.catPanel ? " ll-rot" : "") + "\\" data-act=\\"catset\\">⚙</button>";
    h += "</div>";
    return h;
  }

  /* ── AI panel ─────────────────────────────────────────── */

  function aiPanelHtml() {
    var h = "<div class=\\"ll-modal\\" data-act=\\"modal-close\\">";
    h += "<div class=\\"ll-modalbox\\" data-act=\\"modal-keep\\">";
    h += "<div class=\\"ll-modaltabs\\">";
    h += "<button class=\\"ll-modaltab" + (UI.aiTab !== "import" ? " ll-on" : "") + "\\" data-act=\\"aitab\\" data-arg=\\"generate\\">✨ Lesson Info & AI Prompt</button>";
    h += "<button class=\\"ll-modaltab" + (UI.aiTab === "import" ? " ll-on" : "") + "\\" data-act=\\"aitab\\" data-arg=\\"import\\">📥 Import JSON</button>";
    h += "</div>";
    h += "<div class=\\"ll-modalbody\\">";
    if (UI.aiTab === "import") {
      h += "<p style=\\"font-size:14px;color:var(--ll-txt2);margin-bottom:10px\\">Paste a Live Lesson manual JSON (from any AI) to load it into this presenter:</p>";
      if (UI.aiErr) h += "<div class=\\"ll-jsonerr\\">⚠️ " + esc(UI.aiErr) + "</div>";
      h += "<div class=\\"ll-field\\"><textarea id=\\"ll-ai-import\\" placeholder='{\\"metadata\\":{...},\\"procedureBlocks\\":[...]}' style=\\"min-height:220px\\">" + esc(UI.aiImport || "") + "</textarea></div>";
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"aiimport\\">Load Lesson</button></div>";
    } else {
      h += "<div class=\\"ll-field\\"><label>Lesson</label><input value=\\"" + esc(DATA.metadata.title) + "\\" disabled/></div>";
      h += "<div class=\\"ll-field\\" style=\\"display:grid;grid-template-columns:1fr 1fr;gap:12px\\">";
      h += "<div><label>Learner</label><input value=\\"" + esc(NAME) + "\\" disabled/></div>";
      h += "<div><label>Level</label><input value=\\"" + esc(DATA.metadata.level || "B1") + "\\" disabled/></div>";
      h += "</div>";
      h += "<div class=\\"ll-field\\"><label>Learning objectives</label><textarea disabled>" + esc((DATA.metadata.learningObjectives || []).join("\\n")) + "</textarea></div>";
      h += "<div class=\\"ll-field\\"><label>Activity types (" + STEPS.length + " steps)</label><div class=\\"ll-actsgrid\\">";
      for (var i = 0; i < STEPS.length; i++) {
        h += "<span style=\\"font-size:13px;color:var(--ll-txt2)\\">" + (i + 1) + ". " + esc((STEPS[i].type || "").replace(/-/g, " ")) + "</span>";
      }
      h += "</div></div>";
      h += "<div class=\\"ll-field\\"><label>📋 AI prompt (copy into any AI to regenerate/improve this lesson)</label>";
      h += "<div class=\\"ll-promptbox\\">" + esc(buildPrompt()) + "</div></div>";
      h += "<div class=\\"ll-btnrow\\"><button class=\\"ll-btn ll-pri\\" data-act=\\"aicopy\\">📋 Copy Prompt</button></div>";
    }
    h += "</div></div></div>";
    return h;
  }

  function buildPrompt() {
    var meta = DATA.metadata || {};
    var learner = DATA.learnerProfile || {};
    var types = [];
    for (var i = 0; i < STEPS.length; i++) { types.push(STEPS[i].type); }
    var p = "You are an expert ESL/EFL lesson designer. Create a COMPLETE, DETAILED 'Live Lesson' manual in JSON (LiveLessonManual schema).";
    p += "\\n\\nTOPIC: " + (meta.topic || "General English");
    p += "\\nLEVEL: " + (meta.level || "B1") + " (CEFR)";
    p += "\\nLEARNER: " + (learner.name || NAME) + " — interests: " + ((learner.interests || []).join(", ") || "travel, music, technology");
    p += "\\nDURATION: " + (meta.durationMinutes || 60) + " minutes";
    p += "\\nPHASE: " + (meta.phase || "speak");
    p += "\\n\\nCRITICAL RULES:";
    p += "\\n1. NEVER write teacher instructions — always talk directly to the learner.";
    p += "\\n2. Simplify ALL language to CEFR " + (meta.level || "B1") + ".";
    p += "\\n3. Personalize using learner name and interests.";
    p += "\\n4. Every activity must have 3-5 items/rounds/cards and recycle lesson language.";
    p += "\\n5. Use ONLY these activity types: " + types.join(", ") + ".";
    p += "\\n6. ANSWER-LENGTH ANTI-CUE RULE (MANDATORY for every h5pActivity that has an option list): all options must be within ±2 words of each other and carry the same level of detail; the correct option must NEVER be the longest, the most detailed, or the only one with a number, name, comma or extra clause, and must not echo question keywords more than the distractors do. Rotate the correct answer's position and self-check every option set before returning — rewrite any item whose longest option is the correct one.";
    p += "\\n\\nSCHEMA:";
    p += '\\n{\\\"metadata\\\": {lessonId, title, description, durationMinutes, learningObjectives[], targetLanguage, defaultLocale, phase, level, topic},';
    p += '\\n \\\"learnerProfile\\\": {name, level, interests[]},';
    p += '\\n \\\"globalSettings\\\": {timerBehaviour, gamification: {points, retryAllowed, maxRetries, badgeConditions[]}, confettiOnCorrect},';
    p += '\\n \\\"procedureBlocks\\\": [';
    p += '\\n   {id, title, type, phase: study|speak|review, durationSeconds, teacherPrompt, studentInstructions,';
    p += '\\n    languageReference: {grammar[], vocabulary[], expressions[], spokenGrammar[], sentenceStarters[]},';
    p += '\\n    ccqQuestions[], speakingQuestions[], h5pActivity: {type, ...ALL required fields for that type, see the list below}, gamification: {points, retryAllowed, maxRetries}}';
    p += '\\n ]}';
    p += "\\n\\nREQUIRED h5pActivity FIELDS PER TYPE — h5pActivity must carry the real content, not just a type (a step with only {type} renders empty):";
    p += "\\n- would-you-rather → rounds[{ id, question, optionA{id,text,emoji}, optionB{id,text,emoji}, speakingPrompts[], feedback }]";
    p += "\\n- accordion → panels[{ id, title, content }]";
    p += "\\n- true-false → statement, correct (true|false), trueFeedback, falseFeedback";
    p += "\\n- mark-the-words → text, correctWords[] (exact words that appear in text)";
    p += "\\n- fill-in-blanks → textWithBlanks ([blank0], [blank1] ...), blanks[{ id: blank0, correct[], hint }]";
    p += "\\n- drag-the-words → textWithPlaceholders ([drag]), words[{ id, word, correctPosition }] (1-based)";
    p += "\\n- memory-game → pairs[{ id, cardA, cardB }] (8 pairs)";
    p += "\\n- image-hotspots → imageUrl, imageAlt, showSpeakingQuestion, hotspots[{ id, x, y, label, content, icon }] (x/y in %)";
    p += "\\n- spot-the-difference → imageA, imageB, timeLimit, differences[{ id, x, y, radius, description }]";
    p += "\\n- truth-or-dare → items[{ type: truth|dare, text, targetLanguage }]";
    p += "\\n- flashcards → shuffle, ttsEnabled, cards[{ id, front, back, category }] (back = meaning, newline, model sentence)";
    p += "\\n- word-cloud → prompt, seedWords[], maxSubmissions";
    p += "\\n- audio-discussion → instructions, prompts[{ id, text, hint, usefulLanguage[] }], sampleOpinions[{ speaker, text }]";
    p += "\\n- team-quiz → instructions, secondsPerQuestion, questions[{ id, question, points, choices[{ id, text, correct }] }]";
    p += "\\n- multiple-choice → question, choices[{ id, text, correct }], allowMultiple";
    p += "\\n\\nReturn ONLY raw JSON, no markdown fences.";
    return p;
  }

  /* ── ambient audio ────────────────────────────────────── */

  var AUDIO = null;
  function updateAmbient() {
    try {
      if (!AUDIO) { AUDIO = new Audio(); AUDIO.loop = true; }
      AUDIO.volume = S.volume;
      var found = null;
      for (var i = 0; i < AMBIENT.length; i++) { if (AMBIENT[i].id === S.ambient) found = AMBIENT[i]; }
      if (!found || found.id === "none") { AUDIO.pause(); return; }
      if (AUDIO.src !== found.url) {
        AUDIO.src = found.url;
        AUDIO.play().catch(function () {});
      } else if (AUDIO.paused && UI.ambPlaying) {
        AUDIO.play().catch(function () {});
      }
    } catch (e) {}
  }

  /* ── events ───────────────────────────────────────────── */

  var BOUND = false;
  function bind() {
    var app = document.getElementById("ll-app");
    if (BOUND) return; // listeners survive innerHTML swaps — bind ONCE to avoid stacking
    BOUND = true;
    app.addEventListener("click", function (e) {
      var el = e.target;
      // Tap on the shaded overlay (mobile sidebar open) closes the sidebar.
      if (UI.sidebarOpen && el.id === "ll-app") { UI.sidebarOpen = false; render(); return; }
      while (el && el !== app) {
        if (el.getAttribute && el.getAttribute("data-act")) {
          handle(el.getAttribute("data-act"), el, e);
          return;
        }
        el = el.parentNode;
      }
    });
    app.addEventListener("input", function (e) {
      var el = e.target;
      if (el.getAttribute && el.getAttribute("data-act") === "ambvol") {
        S.volume = parseFloat(el.value);
        save();
        updateAmbient();
      }
      if (el.getAttribute && el.getAttribute("data-act") === "catrate") {
        S.cat.rate = parseFloat(el.value);
        save();
      }
      if (el.getAttribute && el.getAttribute("data-act") === "catpitch") {
        S.cat.pitch = parseFloat(el.value);
        save();
      }
      if (el.id === "ll-search") {
        UI.q = el.value;
        render();
      }
      if (el.id === "ll-voicesearch") {
        UI.voiceQ = el.value;
        render();
      }
      if (el.getAttribute && el.getAttribute("data-blank")) {
        var bid = el.getAttribute("data-blank");
        st(STEPS[S.idx].id).answers[bid] = el.value;
      }
      if (el.getAttribute && el.getAttribute("data-ihfield")) {
        var f = el.getAttribute("data-ihfield");
        var stt = st(STEPS[S.idx].id);
        if (stt.editingId !== null && stt.editingId !== undefined && stt.hotspots[stt.editingId]) {
          stt.hotspots[stt.editingId][f] = el.value;
        }
      }
    });
    var search = document.getElementById("ll-search");
    if (search && !UI.q) { /* keep placeholder */ }
  }

  function handle(act, el, ev) {
    var step = STEPS[S.idx];
    var s;
    switch (act) {
      case "side": UI.sidebarOpen = !UI.sidebarOpen; render(); break;
      case "home": window.location.href = "/"; break;
      case "sidenav": S.idx = parseInt(el.getAttribute("data-arg"), 10); resetTimer(); UI.sidebarOpen = false; save(); render(); break;
      case "theme": S.theme = S.theme === "dark" ? "light" : "dark"; S.themeV = THEME_VERSION; save(); render(); break;
      case "teacher": S.teacher = !S.teacher; save(); render(); break;
      case "tts": S.tts = !S.tts; save(); render(); break;
      case "goto": S.idx = parseInt(el.getAttribute("data-arg"), 10); resetTimer(); save(); render(); break;
      case "next": if (S.idx < STEPS.length - 1) { S.idx++; resetTimer(); save(); render(); } break;
      case "prev": if (S.idx > 0) { S.idx--; resetTimer(); save(); render(); } break;
      case "sec": {
        var body = el.parentNode.querySelector(".ll-secbody");
        if (body) body.style.display = body.style.display === "block" ? "none" : "block";
        var arrow = el.querySelector("span");
        if (arrow) arrow.textContent = body.style.display === "block" ? "▴" : "▾";
        break;
      }
      case "chk": {
        var box = el;
        if (box.textContent === "⬜") { box.textContent = "☑"; box.style.color = "#818cf8"; }
        else { box.textContent = "⬜"; box.style.color = ""; }
        break;
      }
      case "speak": catSpeak(el.getAttribute("data-text") || "", "thinking"); break;
      case "bgdd": UI.bgOpen = !UI.bgOpen; UI.ambOpen = false; render(); break;
      case "ambdd": UI.ambOpen = !UI.ambOpen; UI.bgOpen = false; render(); break;
      case "bg": S.bg = BG_LIST[parseInt(el.getAttribute("data-arg"), 10)].url; UI.bgOpen = false; save(); render(); break;
      case "amb": {
        var ai = parseInt(el.getAttribute("data-arg"), 10);
        S.ambient = AMBIENT[ai].id; UI.ambOpen = false; UI.ambPlaying = AMBIENT[ai].id !== "none"; save(); render(); updateAmbient(); break;
      }
      case "ambtoggle": UI.ambPlaying = !UI.ambPlaying; updateAmbient(); render(); break;
      case "timer":
        if (el.getAttribute("data-arg") === "toggle") {
          if (!S.timer.remaining) S.timer.remaining = step.durationSeconds || 300;
          S.timer.running = !S.timer.running;
          if (S.timer.running) startTick();
          else stopTick();
        } else if (el.getAttribute("data-arg") === "reset") {
          stopTick(); S.timer.remaining = step.durationSeconds || 300; S.timer.running = false;
        } else {
          S.timer.remaining = (S.timer.remaining || step.durationSeconds || 300) + 60;
        }
        render(); break;
      case "aipanel": UI.aiPanel = !UI.aiPanel; UI.aiTab = UI.aiTab || "generate"; render(); break;
      case "aitab": UI.aiTab = el.getAttribute("data-arg"); UI.aiErr = null; render(); break;
      case "aicopy": {
        var pr = buildPrompt();
        var done = function () { toast("📋 Prompt copied to clipboard!"); };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(pr).then(done).catch(function () { fallbackCopy(pr, done); }); }
        else fallbackCopy(pr, done);
        break;
      }
      case "aiimport": {
        var txt = document.getElementById("ll-ai-import");
        if (txt) UI.aiImport = txt.value;
        try {
          var parsed = JSON.parse(UI.aiImport || "null");
          if (!parsed || !parsed.procedureBlocks || !parsed.procedureBlocks.length) throw new Error("Missing procedureBlocks[]");
          var norm = normalizeManual(parsed);
          loadManual(norm);
          UI.aiPanel = false; UI.aiErr = null;
          toast("✅ Lesson loaded!");
        } catch (err) { UI.aiErr = err.message || String(err); render(); }
        break;
      }
      case "modal-close": if (ev.target === el) { UI.aiPanel = false; render(); } break;
      case "modal-keep": break;
      case "catface": if (S.cat.muted) { S.cat.muted = false; save(); render(); } else UI.catPanel = !UI.catPanel; render(); break;
      case "catset": UI.catPanel = !UI.catPanel; render(); break;
      case "catmute": S.cat.muted = !S.cat.muted; if (S.cat.muted) { try { window.speechSynthesis.cancel(); } catch (e) {} } save(); render(); break;
      case "catvoice": {
        var vi = parseInt(el.getAttribute("data-idx"), 10);
        if (VOICES[vi]) { S.cat.voice = VOICES[vi].name; save(); render(); }
        break;
      }
      case "wyr":
        s = st(step.id);
        if (el.getAttribute("data-arg") === "pick") {
          var pick = el.getAttribute("data-arg2");
          s.choices[s.ri] = pick;
          var rounds = s.rounds;
          var cur = rounds[s.ri];
          award(step.gamification && step.gamification.points ? Math.ceil(step.gamification.points / rounds.length) : 4, null);
          catSpeak((cur.feedback && cur.feedback.correctFeedback) || "Great choice! Now explain why!", "excited");
          completeStep(step.id, 10, 10);
          if (Object.keys(s.choices).length >= rounds.length) award(5, "🔥");
          confetti("correct");
        } else if (el.getAttribute("data-arg") === "next") { if (s.ri < rounds.length - 1) s.ri++; }
        else if (el.getAttribute("data-arg") === "prev") { if (s.ri > 0) s.ri--; }
        else { s.ri = parseInt(el.getAttribute("data-arg2"), 10); }
        render(); break;
      case "acc": {
        s = st(step.id);
        var pi = parseInt(el.getAttribute("data-arg"), 10);
        var p = step.h5pActivity.panels[pi];
        if (!s.open[p.id]) s.open[p.id] = true; else delete s.open[p.id];
        s.viewed[p.id] = true;
        var all = true;
        for (var av = 0; av < step.h5pActivity.panels.length; av++) { if (!s.viewed[step.h5pActivity.panels[av].id]) { all = false; break; } }
        if (all && !s.completed) {
          s.completed = true;
          award(step.gamification && step.gamification.points ? step.gamification.points : 15, null);
          completeStep(step.id, step.h5pActivity.panels.length, step.h5pActivity.panels.length);
          confetti("correct");
        }
        render(); break;
      }
      case "accall": {
        s = st(step.id);
        for (var aa = 0; aa < step.h5pActivity.panels.length; aa++) { s.open[step.h5pActivity.panels[aa].id] = true; s.viewed[step.h5pActivity.panels[aa].id] = true; }
        if (!s.completed) {
          s.completed = true;
          award(step.gamification && step.gamification.points ? step.gamification.points : 15, null);
          completeStep(step.id, step.h5pActivity.panels.length, step.h5pActivity.panels.length);
          confetti("correct");
        }
        render(); break;
      }
      case "tf": {
        s = st(step.id);
        s.answer = el.getAttribute("data-arg") === "1";
        s.checked = true;
        var tfCorrect = s.answer === step.h5pActivity.correct;
        if (tfCorrect) {
          award(step.gamification && step.gamification.points ? step.gamification.points : 10, null);
          completeStep(step.id, 10, 10);
          confetti("correct");
          catSpeak((step.h5pActivity.feedback && step.h5pActivity.feedback.correctFeedback) || "Purrfect! You got it right!", "excited");
        } else {
          catSpeak((step.h5pActivity.feedback && step.h5pActivity.feedback.incorrectFeedback) || "Oops! Let me explain why...", "sad");
        }
        render(); break;
      }
      case "tfretry": s = st(step.id); s.checked = false; s.answer = null; render(); break;
      case "mtw": {
        s = st(step.id);
        var w = el.getAttribute("data-word");
        s.marked[w] = !s.marked[w];
        render(); break;
      }
      case "mtwcheck": {
        s = st(step.id);
        s.checked = true;
        var correctSet = {};
        for (var cw = 0; cw < step.h5pActivity.correctWords.length; cw++) correctSet[step.h5pActivity.correctWords[cw].toLowerCase()] = true;
        var markedCount = 0, correctMarked = 0;
        for (var mk in s.marked) { if (s.marked[mk]) { markedCount++; if (correctSet[mk]) correctMarked++; } }
        var precision = markedCount > 0 ? correctMarked / markedCount : 0;
        var recall = step.h5pActivity.correctWords.length > 0 ? correctMarked / step.h5pActivity.correctWords.length : 0;
        var f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
        var score = Math.round(f1 * 100);
        if (score >= 80) {
          award(step.gamification && step.gamification.points ? step.gamification.points : 20, null);
          completeStep(step.id, score, 100);
          confetti("correct");
        }
        render(); break;
      }
      case "mtwretry": s = st(step.id); s.marked = {}; s.checked = false; render(); break;
      case "fibhint": s = st(step.id); s.hints[el.getAttribute("data-arg")] = true; render(); break;
      case "fibcheck": {
        s = st(step.id);
        s.checked = true;
        var blanks = step.h5pActivity.blanks;
        var correctCount = 0;
        for (var fb = 0; fb < blanks.length; fb++) {
          var bl = blanks[fb];
          var ok = bl.correct.some(function (c) { return step.h5pActivity.caseSensitive ? c === s.answers[bl.id] : c.toLowerCase() === String(s.answers[bl.id] || "").toLowerCase(); });
          if (ok) correctCount++;
        }
        var allOk = correctCount === blanks.length;
        if (allOk) {
          award(step.gamification && step.gamification.points ? step.gamification.points : 25, null);
          completeStep(step.id, correctCount, blanks.length, s.answers);
          confetti("correct");
          catSpeak((step.h5pActivity.feedback && step.h5pActivity.feedback.correctFeedback) || "Excellent! All blanks correct!", "excited");
        }
        render(); break;
      }
      case "fibretry": s = st(step.id); s.answers = {}; s.checked = false; render(); break;
      case "fibsol": {
        s = st(step.id);
        for (var fs = 0; fs < step.h5pActivity.blanks.length; fs++) s.answers[step.h5pActivity.blanks[fs].id] = step.h5pActivity.blanks[fs].correct[0];
        s.checked = true;
        render(); break;
      }
      case "dtwbank": s = st(step.id); s.bankSel = el.getAttribute("data-arg"); render(); break;
      case "dtwslot": {
        s = st(step.id);
        var si = parseInt(el.getAttribute("data-arg"), 10);
        if (s.placed[si]) { delete s.placed[si]; render(); break; }
        if (s.bankSel === undefined || s.bankSel === null) { toast("Pick a word from the bank first"); break; }
        var wId = step.h5pActivity.words[parseInt(s.bankSel, 10)].id;
        var already = false;
        for (var ok2 in s.placed) { if (s.placed[ok2] === wId) already = true; }
        if (already) { toast("That word is already placed"); break; }
        s.placed[si] = wId;
        s.bankSel = null;
        render(); break;
      }
      case "dtwcheck": {
        s = st(step.id);
        s.checked = true;
        var numSlots2 = step.h5pActivity.textWithPlaceholders.split("[drag]").length - 1;
        var cc = 0;
        for (var dc = 0; dc < numSlots2; dc++) {
          var dw = null;
          for (var dk = 0; dk < step.h5pActivity.words.length; dk++) { if (step.h5pActivity.words[dk].id === s.placed[dc]) { dw = step.h5pActivity.words[dk]; break; } }
          if (dw && dw.correctPosition === dc + 1) cc++;
        }
        if (cc === numSlots2) {
          award(step.gamification && step.gamification.points ? step.gamification.points : 20, null);
          completeStep(step.id, cc, numSlots2, s.placed);
          confetti("correct");
        }
        render(); break;
      }
      case "dtwretry": s = st(step.id); s.placed = {}; s.checked = false; render(); break;
      case "memcard": {
        s = st(step.id);
        if (s.finished) break;
        var ci = parseInt(el.getAttribute("data-arg"), 10);
        var card = s.cards[ci];
        if (card.flip || card.match) break;
        if (s.flipped.length >= 2) break;
        if (!s.running) { s.running = true; startMemTimer(s); }
        card.flip = true;
        s.flipped.push(ci);
        if (s.flipped.length === 2) {
          s.moves++;
          var a1 = s.cards[s.flipped[0]];
          var a2 = s.cards[s.flipped[1]];
          if (a1.pair === a2.pair) {
            catSpeak("Purrfect match! Now make a sentence with this!", "excited");
            setTimeout(function () {
              a1.match = true; a2.match = true;
              s.matched++;
              s.flipped = [];
              if (s.matched === step.h5pActivity.pairs.length) {
                s.finished = true; s.running = false;
                stopMemTimer(s);
                confetti("perfect");
                award(step.gamification && step.gamification.points ? step.gamification.points : 30, null);
                completeStep(step.id, step.h5pActivity.pairs.length, step.h5pActivity.pairs.length);
                catSpeak("Amazing! You found all the pairs! You're a memory champion!", "love");
              }
              render();
            }, 800);
          } else {
            catSpeak("Not quite! Try to remember where those cards are!", "thinking");
            setTimeout(function () {
              a1.flip = false; a2.flip = false;
              s.flipped = [];
              render();
            }, 1000);
          }
        }
        render(); break;
      }
      case "memreset": delete ACT[step.id]; render(); break;
      case "ihpin": {
        s = st(step.id);
        if (s.adding) break;
        var hpIdx = parseInt(el.getAttribute("data-arg"), 10);
        var hp = s.hotspots[hpIdx];
        s.active = hpIdx;
        s.visited[hp.id] = true;
        catSpeak(hp.content, "happy");
        var allV = s.hotspots.length > 0;
        for (var hv in s.visited) { if (!s.visited[hv]) { allV = false; break; } }
        if (allV && !s.completed) {
          s.completed = true;
          award(step.gamification && step.gamification.points ? step.gamification.points : 20, null);
          completeStep(step.id, s.hotspots.length, s.hotspots.length);
          confetti("correct");
        }
        render(); break;
      }
      case "ihclose": s = st(step.id); s.active = null; s.editingId = null; s.adding = false; render(); break;
      case "ihadd": s = st(step.id); s.adding = !s.adding; s.active = null; s.editingId = null; render(); break;
      case "ihdel": {
        s = st(step.id);
        var di = parseInt(el.getAttribute("data-arg"), 10);
        s.hotspots.splice(di, 1);
        s.active = null;
        render(); break;
      }
      case "ihedit": s = st(step.id); s.editingId = parseInt(el.getAttribute("data-arg"), 10); s.active = null; render(); break;
      case "ihsaveedit": s = st(step.id); s.editingId = null; s.active = null; render(); break;
      case "stdimg": {
        s = st(step.id);
        if (s.finished) break;
        var rect = el.getBoundingClientRect();
        var x = ((ev.clientX - rect.left) / rect.width) * 100;
        var y = ((ev.clientY - rect.top) / rect.height) * 100;
        var hit = null;
        for (var dd = 0; dd < step.h5pActivity.differences.length; dd++) {
          var d = step.h5pActivity.differences[dd];
          if (s.found[d.id]) continue;
          var dist = Math.sqrt(Math.pow(x - d.x, 2) + Math.pow(y - d.y, 2));
          if (dist <= d.radius) { hit = d; break; }
        }
        if (hit) {
          s.found[hit.id] = true;
          var fCount = 0;
          for (var fk in s.found) fCount++;
          if (fCount >= step.h5pActivity.differences.length) {
            s.finished = true;
            confetti("perfect");
            award(step.gamification && step.gamification.points ? step.gamification.points : 25, null);
            completeStep(step.id, step.h5pActivity.differences.length, step.h5pActivity.differences.length);
            catSpeak("Amazing! You found all the differences! You have such sharp eyes!", "love");
          } else {
            catSpeak("Great find! " + hit.description + ". " + fCount + " of " + step.h5pActivity.differences.length + " found!", "excited");
          }
        } else {
          s.wrong++;
          catSpeak("Hmm, not quite there. Look more carefully!", "thinking");
        }
        render(); break;
      }
      case "stdretry": delete ACT[step.id]; render(); break;
      case "todfilter": s = st(step.id); s.filter = el.getAttribute("data-arg"); s.current = null; render(); break;
      case "todspin": {
        s = st(step.id);
        if (s.spinning) break;
        var filtered = [];
        for (var ti = 0; ti < step.h5pActivity.items.length; ti++) { if (s.filter === "all" || step.h5pActivity.items[ti].type === s.filter) filtered.push(ti); }
        if (!filtered.length) break;
        s.spinning = true;
        var count = 0;
        var iv = setInterval(function () {
          s.current = Math.floor(Math.random() * filtered.length);
          count++;
          if (count >= 12) {
            clearInterval(iv);
            s.spinning = false;
          }
          render();
        }, 80);
        break;
      }
      case "todmark": {
        s = st(step.id);
        if (s.current === null || s.current === undefined) break;
        var filtered2 = [];
        for (var t2 = 0; t2 < step.h5pActivity.items.length; t2++) { if (s.filter === "all" || step.h5pActivity.items[t2].type === s.filter) filtered2.push(t2); }
        s.completed[s.current] = true;
        award(10, null);
        var doneCount = 0;
        for (var tc in s.completed) { if (s.completed[tc]) doneCount++; }
        if (doneCount >= Math.min(3, step.h5pActivity.items.length)) {
          completeStep(step.id, doneCount, step.h5pActivity.items.length);
        }
        catSpeak("Great use of the target language!", "excited");
        render(); break;
      }
      case "fcflip": s = st(step.id); s.flipped = !s.flipped; render(); break;
      case "fcprev": s = st(step.id); if (s.ci > 0) { s.ci--; s.flipped = false; } render(); break;
      case "fcnext": s = st(step.id); if (s.ci < s.cards.length - 1) { s.ci++; s.flipped = false; } render(); break;
      case "fcshuffle": delete ACT[step.id]; render(); break;
      case "fcknown": {
        s = st(step.id);
        s.known[s.cards[s.ci].id] = true;
        delete s.unknown[s.cards[s.ci].id];
        var kc = 0;
        for (var kk in s.known) kc++;
        if (s.ci < s.cards.length - 1) { s.ci++; s.flipped = false; }
        if (kc + Object.keys(s.unknown).length === s.cards.length) {
          award(step.gamification && step.gamification.points ? step.gamification.points : 15, null);
          completeStep(step.id, kc, s.cards.length);
          confetti("correct");
        }
        render(); break;
      }
      case "fcunknown": s = st(step.id); s.unknown[s.cards[s.ci].id] = true; delete s.known[s.cards[s.ci].id]; if (s.ci < s.cards.length - 1) { s.ci++; s.flipped = false; } render(); break;
      case "wcadd": {
        s = st(step.id);
        var inp = document.getElementById("ll-wcinput");
        var word = (inp ? inp.value : "").trim().toLowerCase();
        if (!word || s.submitted >= (step.h5pActivity.maxSubmissions || 5)) break;
        var found = false;
        for (var wi2 = 0; wi2 < s.words.length; wi2++) {
          if (s.words[wi2].text.toLowerCase() === word) { s.words[wi2].count++; found = true; break; }
        }
        if (!found) s.words.push({ text: word, count: 1 });
        s.submitted++;
        if (s.submitted >= (step.h5pActivity.maxSubmissions || 5)) {
          award(step.gamification && step.gamification.points ? step.gamification.points : 10, null);
          completeStep(step.id, 10, 10);
        }
        render(); break;
      }
      case "mcq": {
        s = st(step.id);
        var mid = el.getAttribute("data-id");
        if (step.h5pActivity.allowMultiple) { s.sel[mid] = !s.sel[mid]; }
        else { s.sel = {}; s.sel[mid] = true; }
        render(); break;
      }
      case "mcqcheck": {
        s = st(step.id);
        s.checked = true;
        var correctIds = {};
        for (var mc = 0; mc < step.h5pActivity.choices.length; mc++) { if (step.h5pActivity.choices[mc].correct) correctIds[step.h5pActivity.choices[mc].id] = true; }
        var match2 = true;
        for (var ck2 in correctIds) { if (!s.sel[ck2]) match2 = false; }
        for (var sk2 in s.sel) { if (s.sel[sk2] && !correctIds[sk2]) match2 = false; }
        var need = Object.keys(correctIds).length;
        var have = 0;
        for (var hk2 in s.sel) { if (s.sel[hk2]) have++; }
        var okAll = step.h5pActivity.allowMultiple ? have === need : have === 1;
        var ok = match2 && okAll;
        if (!ok) {
          for (var badId in s.sel) {
            if (s.sel[badId] && !correctIds[badId]) {
              s.shakeId = badId;
              setTimeout(function () { s.shakeId = null; render(); }, 600);
            }
          }
        } else {
          award(step.gamification && step.gamification.points ? step.gamification.points : 10, null);
          completeStep(step.id, 10, 10);
          confetti("correct");
          catSpeak((step.h5pActivity.feedback && step.h5pActivity.feedback.correctFeedback) || "Purrfect! Correct answer!", "excited");
        }
        render(); break;
      }
      case "mcqretry": s = st(step.id); s.sel = {}; s.checked = false; render(); break;
      case "mcqsol": {
        s = st(step.id);
        s.sel = {};
        for (var mc2 = 0; mc2 < step.h5pActivity.choices.length; mc2++) { if (step.h5pActivity.choices[mc2].correct) s.sel[step.h5pActivity.choices[mc2].id] = true; }
        s.checked = true;
        render(); break;
      }
      /* audio-discussion */
      case "audrec": {
        s = st(step.id);
        var pid = el.getAttribute("data-arg");
        if (UI.audRec === pid) {
          // stop — keep duration captured at start
          UI.audRec = null;
          if (UI.audTimer) { clearInterval(UI.audTimer); UI.audTimer = null; }
        } else {
          if (UI.audTimer) clearInterval(UI.audTimer);
          UI.audRec = pid;
          s.recordings[pid] = 0;
          UI.audTimer = setInterval(function () {
            var cur = st(STEPS[S.idx].id);
            if (cur.recordings && cur.recordings[pid] !== undefined) {
              cur.recordings[pid]++;
              var lenEl = document.querySelector("[data-act='audplay'][data-arg='" + pid + "']");
              var lenSpan = lenEl && lenEl.parentNode.querySelector(".ll-audlen");
              if (lenSpan) lenSpan.textContent = "⏱ " + cur.recordings[pid] + "s";
            }
          }, 1000);
          catSpeak("Recording! Speak clearly and use today's language.", "excited");
        }
        render(); break;
      }
      case "audplay": {
        s = st(step.id);
        var pid2 = el.getAttribute("data-arg");
        var secs = s.recordings[pid2] || 0;
        toast("▶ Playing your " + secs + "s response…");
        break;
      }
      case "audsubmit": {
        s = st(step.id);
        var pts = step.gamification && step.gamification.points ? step.gamification.points : 15;
        award(pts, "🎙");
        completeStep(step.id, pts, pts);
        catSpeak("Great speaking! I loved hearing your opinions.", "love");
        confetti("correct");
        render(); break;
      }
      /* team-quiz */
      case "tqpick": {
        s = st(step.id);
        var qid = el.getAttribute("data-id");
        var qs2 = step.h5pActivity.questions || [];
        var q3 = qs2[s.qi];
        if (s.revealed) break;
        s.answers[q3.id] = qid;
        s.revealed = true;
        var right2 = false;
        for (var rc = 0; rc < (q3.choices || []).length; rc++) { if (q3.choices[rc].correct && q3.choices[rc].id === qid) right2 = true; }
        var tqa = step.h5pActivity || {};
        if (right2) {
          var qp = q3.points || 10;
          s.teamScore += qp;
          award(qp, null);
          catSpeak((tqa.feedback && tqa.feedback.correctFeedback) || "Correct! The team scores!", "excited");
          confetti("correct");
        } else {
          catSpeak((tqa.feedback && tqa.feedback.incorrectFeedback) || "Not this time — discuss and retry!", "sad");
        }
        render(); break;
      }
      case "tqnext": {
        s = st(step.id);
        var qs3 = step.h5pActivity.questions || [];
        if (s.qi < qs3.length - 1) { s.qi++; s.revealed = false; }
        else {
          s.finished = true;
          var maxTotal = 0;
          for (var mt = 0; mt < qs3.length; mt++) maxTotal += (qs3[mt].points || 10);
          if (s.teamScore >= maxTotal * 0.8) completeStep(step.id, s.teamScore, maxTotal);
          else completeStep(step.id, s.teamScore, maxTotal);
        }
        render(); break;
      }
      case "tqretry": {
        s = st(step.id);
        s.qi = 0; s.teamScore = 0; s.answers = {}; s.revealed = false; s.finished = false;
        render(); break;
      }
      case "clear-q": UI.q = ""; render(); break;
      case "phase": UI.phase = el.getAttribute("data-arg") === "all" ? null : el.getAttribute("data-arg"); render(); break;
      case "print": printWorksheet(); break;
      default: break;
    }
  }

  /* ── timers ───────────────────────────────────────────── */

  var TICK = null;
  function startTick() {
    stopTick();
    TICK = setInterval(function () {
      if (!S.timer.running) return;
      S.timer.remaining = Math.max(0, S.timer.remaining - 1);
      if (S.timer.remaining <= 0) {
        S.timer.running = false;
        stopTick();
        toast("⏰ Time's up for this step!");
        catSpeak("Time's up! Let's move on!", "thinking");
      }
      render();
    }, 1000);
  }
  function stopTick() { if (TICK) { clearInterval(TICK); TICK = null; } }
  function resetTimer() {
    stopTick();
    S.timer = { remaining: 0, running: false };
  }

  var MEM_TIMERS = {};
  function startMemTimer(s) {
    if (MEM_TIMERS[s._t]) return;
    s._t = Date.now() + "-" + Math.random();
    MEM_TIMERS[s._t] = setInterval(function () {
      s.timer++;
      render();
    }, 1000);
  }
  function stopMemTimer(s) { if (s._t && MEM_TIMERS[s._t]) { clearInterval(MEM_TIMERS[s._t]); delete MEM_TIMERS[s._t]; } }

  /* ── manual load / normalize ──────────────────────────── */

  function printWorksheet() {
    var escH = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
    var meta = DATA.metadata || {};
    var parts = [];
    parts.push("<div style='text-align:center;padding:8px 0 18px;border-bottom:3px solid #6366f1;margin-bottom:18px'>" +
      "<h1 style='font-size:24px;font-weight:900;color:#111827;margin:0 0 4px'>" + escH(meta.title || "Live Lesson") + "</h1>" +
      "<p style='font-size:13px;color:#6b7280;margin:0'>Level " + escH(meta.level || "B1") + " · " + escH(meta.topic || "") + " · Study Worksheet — " + new Date().toLocaleDateString() + "</p></div>");
    if (meta.learningObjectives && meta.learningObjectives.length) {
      parts.push("<div style='margin-bottom:16px'><b style='font-size:14px'>🎯 Learning objectives</b><ul style='font-size:13px;color:#374151;margin:6px 0 0;padding-left:20px'>" +
        meta.learningObjectives.map(function (o) { return "<li>" + escH(typeof o === "string" ? o : (o && o.text) || "") + "</li>"; }).join("") + "</ul></div>");
    }
    var steps = STEPS || [];
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      var act = step.h5pActivity || {};
      var inner = "";
      if (step.studentInstructions) inner += "<p style='font-size:13px;margin:0 0 8px;color:#374151'>" + escH(step.studentInstructions) + "</p>";
      var t = act.type || step.type || "";
      if (t === "would-you-rather" && act.rounds) {
        inner += act.rounds.map(function (r, ri) { return "<p style='font-size:13px;margin:0 0 6px'><b>" + (ri + 1) + ".</b> " + escH((r.optionA && r.optionA.text) || "") + "  <b>OR</b>  " + escH((r.optionB && r.optionB.text) || "") + "</p><p style='font-size:12px;color:#6b7280;margin:0 0 8px'>Your choice: ________ — Explain why: ________________________________________</p>"; }).join("");
      } else if (t === "accordion" && act.panels) {
        inner += act.panels.map(function (p) { return "<div style='margin-bottom:10px'><p style='font-weight:700;font-size:13px;margin:0 0 2px'>" + escH(p.title || "") + "</p><p style='font-size:13px;color:#374151;margin:0;line-height:1.6'>" + escH(String(p.content || "").replace(/<[^>]*>/g, "").slice(0, 420)) + "</p></div>"; }).join("");
      } else if (t === "true-false") {
        inner += "<p style='font-size:13px;margin:0 0 4px'><b>Statement:</b> " + escH(act.statement || "") + "</p><p style='font-size:13px;margin:0 0 8px'>Circle one:  ⭕ TRUE   ⭕ FALSE</p><p style='font-size:12px;color:#6b7280;margin:0'>Answer: <b>" + escH(act.answer ? "TRUE" : "FALSE") + "</b>" + (act.explanation ? " — " + escH(act.explanation) : "") + "</p>";
      } else if (t === "multiple-choice" && act.choices) {
        inner += "<p style='font-size:13px;font-weight:600;margin:0 0 6px'>" + escH(act.question || "") + "</p>" + act.choices.map(function (c, ci) { return "<p style='font-size:13px;margin:0 0 2px;padding-left:12px'>" + String.fromCharCode(65 + ci) + ". <span style='border-bottom:1px solid #9ca3af;display:inline-block;min-width:200px'>" + escH(c.text || "") + "</span></p>"; }).join("") + "<p style='font-size:12px;color:#6b7280;margin:6px 0 0'>" + act.choices.filter(function (c) { return c.correct; }).map(function (c) { return "Answer: " + escH(c.text); }).join(" · ") + "</p>";
      } else if (t === "fill-in-blanks" && act.sentences) {
        inner += act.sentences.map(function (sn, si) { return "<p style='font-size:13px;margin:0 0 8px'><b>" + (si + 1) + ".</b> " + escH(String(sn.text || sn.sentence || "").replace(/_{2,}/g, "________")) + "</p>"; }).join("");
      } else if (t === "mark-the-words" && act.text) {
        inner += "<p style='font-size:13px;line-height:1.8;margin:0 0 6px'>" + escH(String(act.text).replace(/\[[^\]]*\]/g, function (m) { return m.slice(1, -1); })) + "</p><p style='font-size:12px;color:#6b7280;margin:0'>Circle the target words in the text.</p>";
      } else if (t === "memory-game" && act.pairs) {
        inner += "<p style='font-size:12px;color:#6b7280;margin:0 0 6px'>Match each term with its definition:</p>" + act.pairs.map(function (p2) { return "<p style='font-size:13px;margin:0 0 4px'><b>" + escH(p2.term || p2.a || "") + "</b> — match: ________  <span style='color:#6b7280'>(" + escH(p2.definition || p2.b || "").substring(0, 60) + "…)</span></p>"; }).join("");
      } else if (t === "flashcards" && act.cards) {
        inner += act.cards.map(function (c) { return "<p style='font-size:13px;margin:0 0 6px'><b>" + escH(c.front || "") + "</b> → " + escH(c.back || "") + "</p>"; }).join("");
      } else if (t === "drag-the-words" && act.sentence) {
        inner += "<p style='font-size:13px;margin:0 0 6px'>" + escH(String(act.sentence).replace(/\_{2,}/g, "________")) + "</p><p style='font-size:12px;color:#6b7280;margin:0 0 6px'>Word bank: " + escH((act.words || act.bank || []).join(" · ")) + "</p>";
      } else if (t === "word-cloud") {
        inner += "<p style='font-size:12px;color:#6b7280;margin:0 0 4px'>Write the words that best describe today's learning:</p><p style='font-size:13px;margin:0 0 10px'>1. ____________  2. ____________  3. ____________</p>";
      } else if (t === "image-hotspots" && act.hotspots) {
        inner += act.hotspots.map(function (hs) { return "<p style='font-size:13px;margin:0 0 4px'><b>📍 " + escH(hs.label || hs.title || "") + "</b> — " + escH(String(hs.description || hs.content || "").slice(0, 160)) + "</p>"; }).join("");
      } else if (t === "spot-the-difference" && act.differences) {
        inner += act.differences.map(function (d, di) { return "<p style='font-size:13px;margin:0 0 4px'><b>" + (di + 1) + ".</b> " + escH(d.description || d.text || "") + "</p>"; }).join("");
      } else if (t === "truth-or-dare" && act.items) {
        inner += act.items.map(function (it) { return "<p style='font-size:13px;margin:0 0 4px'><span style='color:" + (it.type === "truth" ? "#2563eb" : "#dc2626") + ";font-weight:700'>" + (it.type === "truth" ? "TRUTH" : "DARE") + "</span> — " + escH(it.text || it.prompt || "") + "</p>"; }).join("");
      } else if (t === "audio-discussion" && act.prompts) {
        inner += act.prompts.map(function (p, pi) { return "<p style='font-size:13px;margin:0 0 4px'><b>" + (pi + 1) + ".</b> " + escH(p.text || "") + "</p><p style='font-size:12px;color:#6b7280;margin:0 0 8px'>Your answer (write before recording): ________________________________________</p>"; }).join("");
      } else if (t === "team-quiz" && act.questions) {
        inner += act.questions.map(function (q, qi) { return "<div style='page-break-inside:avoid;margin-bottom:10px'><p style='font-weight:700;font-size:13px;margin:0 0 4px'>" + (qi + 1) + ". " + escH(q.question || "") + "</p>" + (q.choices || []).map(function (c, ci) { return "<p style='font-size:13px;margin:0 0 2px;padding-left:12px'>" + String.fromCharCode(65 + ci) + ". " + escH(c.text || "") + (c.correct ? " ✓" : "") + "</p>"; }).join("") + "</div>"; }).join("");
      } else {
        inner += "<pre style='font-size:11px;color:#6b7280;background:#f9fafb;padding:8px;border-radius:8px;overflow:hidden'>" + escH(JSON.stringify(act, null, 2).slice(0, 600)) + "</pre>";
      }
      if (step.ccqQuestions && step.ccqQuestions.length) {
        inner += "<p style='font-size:12px;color:#6b7280;margin:8px 0 2px'><b>Concept check:</b> " + step.ccqQuestions.map(function (c) { return escH(c.question || ""); }).join(" · ") + "</p>";
      }
      if (step.speakingQuestions && step.speakingQuestions.length) {
        inner += "<p style='font-size:12px;color:#6b7280;margin:4px 0 2px'><b>Speaking practice:</b> " + step.speakingQuestions.map(function (sq) { return escH(sq.question || ""); }).join(" · ") + "</p>";
      }
      parts.push("<section style='margin-bottom:18px;page-break-inside:avoid'><div style='background:#eef2ff;border-radius:10px 10px 0 0;padding:8px 14px;display:flex;align-items:center;gap:10px'><b style='font-size:14px;color:#312e81'>" + (i + 1) + ". " + escH(step.title || "Step") + "</b><span style='font-size:11px;color:#6366f1;background:#fff;border:1px solid #c7d2fe;border-radius:999px;padding:2px 10px'>" + escH(String(t).replace(/-/g, " ")) + "</span></div><div style='border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:14px'>" + inner + "</div></section>");
    }
    var doc = "<!doctype html><html><head><meta charset='utf-8'><title>" + escH(meta.title || "Live Lesson") + " — Worksheet</title>" +
      "<style>@media print{body{padding:20px}}*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:820px;margin:0 auto;padding:24px}section{break-inside:avoid-page}</style>" +
      "</head><body>" + parts.join("") +
      "<script>window.onload=function(){setTimeout(function(){window.print();},250);};</" + "script>" +
      "</body></html>";
    var win = window.open("", "_blank");
    if (!win) { alert("Popup blocked. Allow popups to print the worksheet."); return; }
    win.document.open();
    win.document.write(doc);
    win.document.close();
  }

  function normalizeManual(input) {
    var raw = input.lesson || input;
    var name = (raw.learnerProfile && raw.learnerProfile.name) || NAME;
    var steps = (raw.procedureBlocks || []).map(function (step, i) {
      var act = step.h5pActivity || { type: step.type || "accordion" };
      return {
        id: step.id || "step-" + String(i + 1).padStart(3, "0"),
        title: step.title || "Step " + (i + 1),
        type: act.type || step.type || "accordion",
        phase: step.phase || "speak",
        durationSeconds: step.durationSeconds || 300,
        teacherPrompt: step.teacherPrompt,
        studentInstructions: step.studentInstructions || "Let's practise, " + name + "!",
        languageReference: step.languageReference,
        ccqQuestions: step.ccqQuestions || [],
        speakingQuestions: step.speakingQuestions || [],
        h5pActivity: act,
        gamification: step.gamification || { points: 10, retryAllowed: true, maxRetries: 2 },
        communityLegacy: step.communityLegacy
      };
    });
    return {
      metadata: {
        lessonId: (raw.metadata && raw.metadata.lessonId) || "lesson-" + Date.now(),
        title: (raw.metadata && raw.metadata.title) || "Live Interactive Lesson",
        description: (raw.metadata && raw.metadata.description) || "",
        durationMinutes: (raw.metadata && raw.metadata.durationMinutes) || 60,
        learningObjectives: (raw.metadata && raw.metadata.learningObjectives) || [],
        targetLanguage: (raw.metadata && raw.metadata.targetLanguage) || "en-US",
        defaultLocale: (raw.metadata && raw.metadata.defaultLocale) || "en",
        phase: (raw.metadata && raw.metadata.phase) || "speak",
        level: (raw.metadata && raw.metadata.level) || "B1",
        topic: (raw.metadata && raw.metadata.topic) || "General English"
      },
      learnerProfile: { name: name, level: (raw.learnerProfile && raw.learnerProfile.level) || "B1", interests: (raw.learnerProfile && raw.learnerProfile.interests) || [] },
      globalSettings: { timerBehaviour: "pause_allowed", gamification: { points: 100, retryAllowed: true, maxRetries: 3, badgeConditions: [] }, confettiOnCorrect: true },
      procedureBlocks: steps
    };
  }

  function loadManual(manual) {
    DATA = manual;
    STEPS = manual.procedureBlocks || [];
    ACT = {};
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem("tutorly-live-progress-" + NAME) || "null"); } catch (e) {}
    S.idx = 0;
    save();
    render();
    toast("📚 New lesson loaded!");
  }

  /* ── boot ─────────────────────────────────────────────── */

  function fallbackCopy(text, cb) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); cb(); } catch (e) {}
    document.body.removeChild(ta);
  }

  S = load();
  S.timer = { remaining: 0, running: false };

  var app = document.getElementById("ll-app");
  if (!app) {
    app = document.createElement("div");
    app.id = "ll-app";
    document.body.appendChild(app);
  }
  /* The stylesheet targets the .ll-app CLASS; the id is only a lookup handle, and
     the two are not interchangeable. A shell carrying just the id renders every
     lesson with the sidebar and the main column stacked instead of side by side,
     which pushes the lesson content off the bottom of the screen and looks like an
     empty lesson. Forcing the class here repairs any shell, including files that
     were exported before this was fixed.
     (No backticks in this file — the whole engine is one string literal.) */
  if (app.className.indexOf("ll-app") === -1) {
    app.className = (app.className ? app.className + " " : "") + "ll-app";
  }
  var bg = document.createElement("div");
  bg.id = "ll-bgimg";
  bg.className = "ll-bgimg";
  document.body.insertBefore(bg, app);

  render();
  loadVoices();
})();
`;