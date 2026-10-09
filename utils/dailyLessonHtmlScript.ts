/**
 * Daily Lesson — standalone engine.
 *
 * Faithful vanilla-JS port of the Daily_Lesson React app (App + DailyLesson +
 * all 10 step components + ConversationGame + GuessThePlace + Leaderboard +
 * CatWidget + gamification) — minus splash/avatar-setup/lesson-creator screens:
 * the HTML boots DIRECTLY into the lesson with the embedded learner profile.
 *
 * Features:
 *  - 10-step lesson rail (warm-up, keywords flashcards, listening dialogue with
 *    per-speaker voices, multi-level reading, karaoke reading via
 *    SpeechRecognition, grammar slides, radio drama + comprehension quiz,
 *    dictation, discussion, final quiz with secret code)
 *  - Conversation game + Guess the Place + Leaderboard modules
 *  - Cat mascot with animated emotions (correct/incorrect/speaking/excited/
 *    thinking), voice picker, mute + WebAudio SFX
 *  - XP/level/streak/achievements persisted to `daily_lesson_stats` (the same
 *    key the Daily_Lesson app uses) and mirrored to
 *    `tutorly-daily-progress-<learner>` for the tutor dashboard
 */
export const DAILY_HTML_SCRIPT = `
(function(){
  'use strict';
  var LESSON = window.__DAILY__ || {};
  var DATA = LESSON.lesson || null;
  var LEARNER_NAME = LESSON.learnerName || 'Learner';
  var AVATAR = LESSON.learnerAvatar || '🐱';
  var FILE_NAME = LESSON.fileName || 'daily-lesson';
  var TITLE = (DATA && DATA.topic) || 'Daily Lesson';

  var STATS_KEY = 'daily_lesson_stats';
  var PROG_KEY = 'tutorly-daily-progress-' + LEARNER_NAME;
  var VOICE_KEY = 'daily_lesson_voices';

  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- tiny audio SFX (WebAudio, no assets) ---------- */
  var audioCtx = null;
  function ac(){
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return audioCtx;
  }
  function tone(freq, dur, type, vol){
    try {
      var ctx = ac(); if (!ctx) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + dur);
    } catch(e) {}
  }
  function playSuccess(){ tone(523.25,0.15,'sine',0.3); setTimeout(function(){tone(659.25,0.15,'sine',0.3);},150); setTimeout(function(){tone(783.99,0.3,'sine',0.3);},300); }
  function playError(){ tone(220,0.2,'sawtooth',0.2); setTimeout(function(){tone(180,0.3,'sawtooth',0.2);},200); }
  function playClick(){ tone(800,0.05,'sine',0.1); }
  function playUnlock(){ var notes=[261.63,329.63,392,523.25,659.25,783.99]; notes.forEach(function(n,i){ setTimeout(function(){tone(n,0.2,'sine',0.3);},i*120); }); }

  /* ---------- speech ---------- */
  var isMuted = false;
  var catVoiceName = null;
  var speakerVoices = {};
  var characterVoices = {};
  try {
    var vSaved = JSON.parse(localStorage.getItem(VOICE_KEY) || '{}');
    if (vSaved) {
      catVoiceName = vSaved.catVoice || null;
      speakerVoices = vSaved.speakerVoices || {};
      characterVoices = vSaved.characterVoices || {};
    }
  } catch(e) {}
  function saveVoicePrefs(){
    try { localStorage.setItem(VOICE_KEY, JSON.stringify({ catVoice: catVoiceName, speakerVoices: speakerVoices, characterVoices: characterVoices })); } catch(e) {}
  }
  function allVoices(){
    if (typeof speechSynthesis === 'undefined') return [];
    return speechSynthesis.getVoices() || [];
  }
  function naturalVoices(){
    var vs = allVoices();
    var excl = ['david','zira','mark','hazel'];
    var pref = ['natural','enhanced','premium','neural','siri','alex','samantha','victoria','karen','moira','tessa','fiona'];
    var out = vs.filter(function(v){ return v.lang.indexOf('en') === 0 && excl.indexOf(v.name.toLowerCase()) < 0; });
    out.sort(function(a,b){
      var as = pref.some(function(p){ return a.name.toLowerCase().indexOf(p) >= 0; }) ? 1 : 0;
      var bs = pref.some(function(p){ return b.name.toLowerCase().indexOf(p) >= 0; }) ? 1 : 0;
      return bs - as;
    });
    return out.length ? out : vs.filter(function(v){ return v.lang.indexOf('en') === 0; });
  }
  function pickVoice(pref){
    var vs = allVoices();
    if (!pref) return null;
    for (var i = 0; i < vs.length; i++) if (vs[i].name === pref) return vs[i];
    return null;
  }
  function stripEmojis(t){
    return String(t)
      .replace(/[\\u{1F600}-\\u{1F64F}]/gu,'').replace(/[\\u{1F300}-\\u{1F5FF}]/gu,'')
      .replace(/[\\u{1F680}-\\u{1F6FF}]/gu,'').replace(/[\\u{1F1E0}-\\u{1F1FF}]/gu,'')
      .replace(/[\\u{2600}-\\u{26FF}]/gu,'').replace(/[\\u{2700}-\\u{27BF}]/gu,'')
      .replace(/[\\u{FE00}-\\u{FE0F}]/gu,'').replace(/[\\u{1F900}-\\u{1F9FF}]/gu,'')
      .replace(/\\s+/g,' ').trim();
  }
  function speak(text, opts){
    if (isMuted || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    var clean = stripEmojis(text);
    if (!clean) return;
    var u = new SpeechSynthesisUtterance(clean);
    var voice = (opts && opts.voice) ? opts.voice : pickVoice(catVoiceName);
    if (voice) u.voice = voice;
    u.rate = (opts && opts.rate) || 0.9;
    u.pitch = (opts && opts.pitch) || 1.0;
    if (opts && opts.onEnd) u.onend = opts.onEnd;
    speechSynthesis.speak(u);
  }
  function stopSpeech(){ if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); }

  /* ---------- state ---------- */
  var state = {
    module: 'lesson',
    currentStep: 1,
    completedSteps: [],
    completedModules: [],
    xp: 0, level: 1, streak: 0, lastActive: '',
    quizScores: [], secretCode: null,
    achievements: [], totalCorrect: 0, totalAttempts: 0,
    theme: 'dark',
    // per-step ui state
    warmRevealed: [], warmCard: 0,
    kwMode: 'flashcard', kwFilter: 'All', kwSearch: '', kwCard: 0, kwFlipped: false, mastered: [],
    dialogueVoicesOpen: true, dialoguePlaying: false, dialogueLine: -1, dialoguePlayed: false, dialogueStop: false,
    readLevel: 'intermediate', readPlaying: false,
    gramOpen: null, gramViewed: [],
    dramaVoicesOpen: true, dramaPlaying: false, dramaLine: -1, dramaPlayed: false, dramaStop: false,
    dramaQuizOpen: false, dramaAnswers: [], dramaSubmitted: false,
    dictIdx: 0, dictInput: '', dictSubmitted: false, dictScores: [], dictResults: [],
    discSelected: null, discRevealed: false,
    quizCur: 0, quizSelected: null, quizAnswered: false, quizAnswers: [], quizResults: false, quizSecret: false,
    karaListening: false, karaWords: [], karaWpm: 0, karaStart: null, karaIdx: 0, karaDone: false, karaErr: '',
    cgNode: 'start', cgPicked: null, cgHistory: [],
    gpHintShown: 0, gpTipWord: null, gpGuess: '', gpRevealed: false, gpPhrase: null,
    catOpen: false, catVoicesOpen: false, catEmoji: '😺', catAnim: 'idle',
    message: (DATA && DATA.catFeedback && DATA.catFeedback.lessonIntro) || 'Welcome!',
    achPop: null, xpToast: null
  };

  function loadStats(){
    try {
      var saved = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
      if (saved) {
        state.xp = saved.xp || 0; state.level = saved.level || 1;
        state.streak = saved.streak || 0; state.lastActive = saved.lastActive || '';
        state.completedSteps = saved.completedSteps || [];
        state.completedModules = saved.completedModules || [];
        state.quizScores = saved.quizScores || [];
        state.secretCode = saved.secretCode || null;
        state.achievements = saved.achievements || [];
        state.totalCorrect = saved.totalCorrect || 0;
        state.totalAttempts = saved.totalAttempts || 0;
      }
    } catch(e) {}
    // streak update
    var today = new Date().toDateString();
    var yesterday = new Date(Date.now() - 86400000).toDateString();
    if (state.lastActive !== today) {
      if (state.lastActive === yesterday) state.streak += 1;
      else if (state.lastActive !== today) state.streak = 1;
      state.lastActive = today;
    }
  }
  function saveStats(){
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify({
        xp: state.xp, level: state.level, streak: state.streak, lastActive: state.lastActive,
        completedSteps: state.completedSteps, completedModules: state.completedModules,
        quizScores: state.quizScores, secretCode: state.secretCode,
        achievements: state.achievements, totalCorrect: state.totalCorrect, totalAttempts: state.totalAttempts
      }));
    } catch(e) {}
    mirrorProgress();
  }
  function mirrorProgress(){
    try {
      var list = [];
      try { list = JSON.parse(localStorage.getItem(PROG_KEY) || '[]'); } catch(e) { list = []; }
      var rec = {
        fileName: FILE_NAME, title: TITLE, topic: TITLE, level: (DATA && DATA.level) || '',
        xp: state.xp, levelNum: state.level, streak: state.streak,
        completedSteps: state.completedSteps.slice(), completedModules: state.completedModules.slice(),
        achievements: state.achievements.slice(), secretCode: state.secretCode,
        quizScores: state.quizScores.slice(), totalCorrect: state.totalCorrect, totalAttempts: state.totalAttempts,
        updatedAt: new Date().toISOString()
      };
      var others = list.filter(function(r){ return r.fileName !== rec.fileName; });
      others.unshift(rec);
      localStorage.setItem(PROG_KEY, JSON.stringify(others.slice(0, 20)));
    } catch(e) {}
  }

  var LEVELS = [
    { level: 1, name: 'Beginner', xpRequired: 0, badge: '🌱' },
    { level: 2, name: 'Explorer', xpRequired: 100, badge: '🔍' },
    { level: 3, name: 'Learner', xpRequired: 250, badge: '📚' },
    { level: 4, name: 'Scholar', xpRequired: 500, badge: '🎓' },
    { level: 5, name: 'Expert', xpRequired: 1000, badge: '⭐' },
    { level: 6, name: 'Master', xpRequired: 2000, badge: '🏆' },
    { level: 7, name: 'Grandmaster', xpRequired: 3500, badge: '💎' }
  ];
  var ACHIEVEMENTS = [
    { id: 'first_step', name: 'First Step', emoji: '👣', xp: 10 },
    { id: 'halfway', name: 'Halfway There', emoji: '🌟', xp: 25 },
    { id: 'lesson_complete', name: 'Lesson Master', emoji: '🎓', xp: 100 },
    { id: 'perfect_quiz', name: 'Perfect Score', emoji: '💯', xp: 50 },
    { id: 'high_quiz', name: 'High Achiever', emoji: '🏆', xp: 30 },
    { id: 'conversation_win', name: 'Conversation Champion', emoji: '🗣️', xp: 40 },
    { id: 'place_found', name: 'World Explorer', emoji: '🌍', xp: 35 },
    { id: 'all_modules', name: 'Daily Legend', emoji: '🌈', xp: 75 },
    { id: 'secret_code', name: 'Code Breaker', emoji: '🔐', xp: 30 }
  ];
  function levelInfo(){
    var cur = LEVELS[0];
    for (var i = 0; i < LEVELS.length; i++) if (state.xp >= LEVELS[i].xpRequired) cur = LEVELS[i];
    var next = null;
    for (var j = 0; j < LEVELS.length; j++) if (LEVELS[j].level === cur.level + 1) next = LEVELS[j];
    var progress = next ? Math.min(100, Math.round(((state.xp - cur.xpRequired) / (next.xpRequired - cur.xpRequired)) * 100)) : 100;
    return { cur: cur, next: next, progress: progress };
  }
  function addXP(amount, silent){
    state.xp += amount;
    var nl = 1;
    for (var i = 0; i < LEVELS.length; i++) if (state.xp >= LEVELS[i].xpRequired) nl = LEVELS[i].level;
    if (nl > state.level) {
      state.level = nl;
      catMessage('🎉 Level up! You reached level ' + nl + ' — ' + LEVELS[nl-1].name + '!', 'excited');
    }
    if (!silent) {
      state.xpToast = '+' + amount + ' XP';
      setTimeout(function(){ state.xpToast = null; if (!document.hidden) render(); }, 1600);
    }
    checkAchievements();
    saveStats();
    render();
  }
  function checkAchievements(){
    var checks = [
      { id: 'first_step', c: state.completedSteps.length >= 1 },
      { id: 'halfway', c: state.completedSteps.length >= 5 },
      { id: 'lesson_complete', c: state.completedSteps.length >= 10 },
      { id: 'perfect_quiz', c: state.quizScores.some(function(s){ return s.score === s.total; }) },
      { id: 'high_quiz', c: state.quizScores.some(function(s){ return s.score / s.total >= 0.8; }) },
      { id: 'conversation_win', c: state.completedModules.indexOf('conversation') >= 0 },
      { id: 'place_found', c: state.completedModules.indexOf('place') >= 0 },
      { id: 'all_modules', c: state.completedModules.length >= 3 },
      { id: 'secret_code', c: state.secretCode !== null }
    ];
    var newXP = 0;
    checks.forEach(function(ch){
      if (ch.c && state.achievements.indexOf(ch.id) < 0) {
        var a = null;
        for (var i = 0; i < ACHIEVEMENTS.length; i++) if (ACHIEVEMENTS[i].id === ch.id) a = ACHIEVEMENTS[i];
        if (a) {
          state.achievements.push(ch.id);
          newXP += a.xp;
          state.achPop = a.name;
          playSuccess();
          setTimeout(function(){ state.achPop = null; if (!document.hidden) render(); }, 3000);
        }
      }
    });
    if (newXP > 0) addXP(newXP, true);
  }

  /* ---------- cat ---------- */
  var CAT_EMOTIONS = {
    correct: ['😸','😻','😹','😸','😻'],
    incorrect: ['🙀','😿','😾','🙀','😿'],
    idle: ['😺','😼','😽','🐱','😺'],
    speaking: ['😻','😸','😹','😻'],
    excited: ['😹','😸','😻','😹'],
    thinking: ['🤔','😼','🐱','😺']
  };
  var catTimer = null;
  function catMessage(msg, emotion, speakIt){
    state.message = msg;
    state.catAnim = emotion || 'idle';
    var emojis = CAT_EMOTIONS[state.catAnim] || CAT_EMOTIONS.idle;
    var i = 0;
    state.catEmoji = emojis[0];
    if (catTimer) clearInterval(catTimer);
    catTimer = setInterval(function(){
      i = (i + 1) % emojis.length;
      state.catEmoji = emojis[i];
      renderCat();
    }, 600);
    setTimeout(function(){
      if (catTimer) clearInterval(catTimer);
      state.catEmoji = emojis[0];
      state.catAnim = 'idle';
      renderCat();
    }, 3000);
    if (speakIt !== false) speak(msg, { rate: 0.95, pitch: 1.1 });
    renderCat();
    render();
  }
  function renderCat(){
    var el = $('#cat-widget');
    if (!el) return;
    var animClass = '';
    if (state.catAnim === 'correct' || state.catAnim === 'excited') animClass = 'bounce';
    if (state.catAnim === 'incorrect') animClass = 'shake';
    if (state.catAnim === 'speaking') animClass = 'speaking';
    if (state.catAnim === 'thinking') animClass = 'thinking';
    var voicesHtml = '';
    if (state.catVoicesOpen) {
      var vs = naturalVoices();
      voicesHtml = '<div class="cat-voices">' + vs.map(function(v){
        var on = v.name === catVoiceName ? ' on' : '';
        return '<button class="cat-voice-btn' + on + '" onclick="window.__setCatVoice(\\'' + esc(v.name).replace(/'/g,'') + '\\')">' + esc(v.name) + ' (' + esc(v.lang) + ')</button>';
      }).join('') + '</div>';
    }
    el.innerHTML =
      (state.catOpen ? '<div class="cat-bubble-wrap"><div class="cat-bubble">' +
        '<p class="cb-text">' + esc(state.message) + '</p>' +
        '<div class="cat-actions">' +
          '<button class="cat-act" onclick="window.__toggleCatVoices()">🎙️ Voices</button>' +
          '<button class="cat-act sound' + (isMuted ? ' off' : '') + '" onclick="window.__toggleMute()">' + (isMuted ? '🔇 Muted' : '🔊 Sound') + '</button>' +
        '</div>' + voicesHtml +
        '<div class="cb-arrow"></div></div></div>' : '') +
      '<button class="cat-btn ' + animClass + '" onclick="window.__toggleCat()" aria-label="Cat assistant">' +
        '<span class="cat-emoji">' + state.catEmoji + '</span>' +
        (state.message ? '<span class="cat-dot"></span>' : '') +
      '</button>';
  }

  /* ---------- helpers ---------- */
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function pick(arr, i){ return arr[i % arr.length]; }
  function catFeedback(kind){
    var fb = DATA && DATA.catFeedback && DATA.catFeedback[kind];
    if (!fb || !fb.length) return kind === 'correct' ? 'Purr-fect!' : 'Keep trying!';
    return fb[Math.floor(Math.random() * fb.length)];
  }
  function totalProgress(){
    var stepsPct = Math.min(1, state.completedSteps.length / 10) * 50;
    var conv = state.completedModules.indexOf('conversation') >= 0 ? 25 : 0;
    var place = state.completedModules.indexOf('place') >= 0 ? 25 : 0;
    return Math.round(stepsPct + conv + place);
  }

  var STEPS = [
    { id: 1, label: 'Warm-Up', icon: '🔥', desc: 'Interactive Q&A' },
    { id: 2, label: 'Keywords', icon: '📖', desc: '22 Advanced Terms' },
    { id: 3, label: 'Listen', icon: '🎧', desc: 'Dialogue Player' },
    { id: 4, label: 'Reading', icon: '📰', desc: '3 Difficulty Levels' },
    { id: 5, label: 'Speaking', icon: '🎤', desc: 'Karaoke Mode' },
    { id: 6, label: 'Grammar', icon: '🔬', desc: '9 Grammar Slides' },
    { id: 7, label: 'Drama', icon: '🎭', desc: 'Radio Play' },
    { id: 8, label: 'Dictation', icon: '✍️', desc: 'Accuracy Test' },
    { id: 9, label: 'Discussion', icon: '💬', desc: 'Social Analysis' },
    { id: 10, label: 'Quiz', icon: '🧠', desc: 'Final Challenge' }
  ];

  /* ---------- renderers ---------- */
  function render(){
    if (!DATA) {
      $('#app').innerHTML = '<div class="card card-pad" style="text-align:center;padding:60px 20px"><div style="font-size:44px">😿</div><h2 style="margin:12px 0">No lesson data</h2><p class="section-head p">This Daily Lesson has no content. Create one in the Manual JSON Creator.</p></div>';
      return;
    }
    var li = levelInfo();
    var html = '';
    // header
    html += '<header class="app-header"><div class="header-row">' +
      '<div class="avatar-box">' + (AVATAR || '🐱') + '</div>' +
      '<div class="header-info">' +
        '<div class="header-name">' + esc(LEARNER_NAME) + '</div>' +
        '<div class="header-sub">' + esc(TITLE) + ' • Level ' + esc(DATA.level) + ' • ' + esc(li.cur.name) + '</div>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + totalProgress() + '%"></div></div>' +
      '</div>' +
      '<div class="streak-pill">🔥 ' + state.streak + '</div>' +
      '<button class="icon-btn" onclick="window.__toggleTheme()">' + (state.theme === 'dark' ? '☀️' : '🌙') + '</button>' +
      '<button class="icon-btn" title="Print / Export PDF study worksheet" onclick="window.__printLesson()">🖨️</button>' +
      '</div></header>';

    // module tabs
    var modules = [
      { id: 'lesson', label: 'Daily Lesson', icon: '📚' },
      { id: 'conversation', label: 'Conversation', icon: '🗣️' },
      { id: 'place', label: 'Guess Place', icon: '🗺️' },
      { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' }
    ];
    html += '<div class="module-tabs"><div class="tabs-row">' + modules.map(function(m){
      var done = m.id !== 'lesson' && state.completedModules.indexOf(m.id) >= 0;
      return '<button class="tab-btn' + (state.module === m.id ? ' active' : '') + '" onclick="window.__setModule(\\'' + m.id + '\\')">' +
        '<div class="t-icon">' + m.icon + '</div><div class="t-label">' + m.label + '</div>' +
        (done ? '<div class="tab-done">✓ Done</div>' : '') +
        '</button>';
    }).join('') + '</div></div>';

    html += '<main class="step-enter">';
    if (state.module === 'lesson') html += renderLesson();
    else if (state.module === 'conversation') html += renderConversation();
    else if (state.module === 'place') html += renderPlace();
    else html += renderLeaderboard();
    html += '</main>';

    // footer
    html += '<footer class="app-footer"><div class="footer-row">' +
      '<div class="footer-meta" style="flex:1">Global Lesson Progress <span style="color:var(--purple)">' + totalProgress() + '%</span></div>' +
      '<div class="badge-chip' + (state.completedSteps.length >= 10 ? ' on' : '') + '">📚</div>' +
      '<div class="badge-chip' + (state.completedModules.indexOf('conversation') >= 0 ? ' on' : '') + '">🗣️</div>' +
      '<div class="badge-chip' + (state.completedModules.indexOf('place') >= 0 ? ' on' : '') + '">🗺️</div>' +
      (state.secretCode ? '<div class="secret-pill">🔐 ' + esc(state.secretCode) + '</div>' : '') +
      '</div></footer>';

    $('#app').innerHTML = html;
    renderCat();
    if (state.xpToast) {
      var t = document.createElement('div');
      t.className = 'xp-toast';
      t.textContent = state.xpToast;
      document.body.appendChild(t);
      setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 1600);
    }
    if (state.achPop) {
      var a = document.createElement('div');
      a.className = 'ach-pop';
      a.innerHTML = '<span style="font-size:24px">🏆</span><div><div style="font-size:11px;opacity:.8">Achievement Unlocked!</div>' + esc(state.achPop) + '</div>';
      document.body.appendChild(a);
      setTimeout(function(){ if (a.parentNode) a.parentNode.removeChild(a); }, 3000);
    }
    bindDynamic();
  }

  function stepUnlocked(id){
    if (id === 1) return true;
    return state.completedSteps.indexOf(id - 1) >= 0;
  }

  function renderLesson(){
    var cur = STEPS[state.currentStep - 1];
    var html = '';
    // step rail
    html += '<div class="step-rail">' + STEPS.map(function(s){
      var cls = 'step-chip';
      if (s.id === state.currentStep) cls += ' current';
      else if (state.completedSteps.indexOf(s.id) >= 0) cls += ' done';
      else if (!stepUnlocked(s.id)) cls += ' locked';
      var icon = state.completedSteps.indexOf(s.id) >= 0 ? '✅' : s.icon;
      return '<button class="' + cls + '" onclick="window.__goStep(' + s.id + ')"' + (stepUnlocked(s.id) ? '' : ' disabled') + '>' +
        '<span class="s-icon">' + icon + '</span><span class="s-label">' + s.label + '</span><span class="s-num">' + s.id + '</span></button>';
    }).join('') + '</div>';

    // step header
    html += '<div class="step-head">' +
      '<div class="step-head-icon">' + cur.icon + '</div>' +
      '<div><div class="step-head-label">Step ' + cur.id + ' of 10</div>' +
      '<div class="step-head-title">' + cur.label + '</div>' +
      '<div class="step-head-desc">' + cur.desc + '</div></div>' +
      (state.completedSteps.indexOf(cur.id) >= 0 ? '<div class="step-done-pill">✓ Completed</div>' : '') +
      '</div>';

    switch (state.currentStep) {
      case 1: html += renderWarmup(); break;
      case 2: html += renderKeywords(); break;
      case 3: html += renderListen(); break;
      case 4: html += renderReading(); break;
      case 5: html += renderKaraoke(); break;
      case 6: html += renderGrammar(); break;
      case 7: html += renderDrama(); break;
      case 8: html += renderDictation(); break;
      case 9: html += renderDiscussion(); break;
      case 10: html += renderQuiz(); break;
    }
    return html;
  }

  function renderWarmup(){
    var w = DATA.warmup || [];
    var cur = state.warmCard;
    var item = w[cur] || { question: '', answer: '', emoji: '❓' };
    var allRevealed = state.warmRevealed.length >= w.length;
    return '<div class="section-head"><span class="sh-icon">🔥</span><h2>Warm-Up Questions</h2><p>Think about each question, then reveal the answer</p></div>' +
      '<div class="warm-nav">' + w.map(function(_, i){
        var cls = 'warm-dot';
        if (i === cur) cls += ' current';
        if (state.warmRevealed.indexOf(i) >= 0) cls += ' revealed';
        return '<button class="' + cls + '" onclick="window.__warmCard(' + i + ')">' + (state.warmRevealed.indexOf(i) >= 0 ? '✓' : (i + 1)) + '</button>';
      }).join('') + '</div>' +
      '<div class="card warm-card"><div class="warm-q"><div class="w-emoji">' + item.emoji + '</div><p>' + esc(item.question) + '</p></div><div class="warm-a">' +
      (state.warmRevealed.indexOf(cur) >= 0
        ? '<div style="color:#4ade80;font-weight:600;margin-bottom:10px">✅ Answer Revealed</div><p style="line-height:1.7;color:var(--text)">' + esc(item.answer) + '</p>' +
          '<button class="kw-sound" style="margin-top:12px" onclick="window.__speak(\\'' + esc(item.answer).replace(/'/g,'\\u0027') + '\\')">🔊 Listen Again</button>'
        : '<div style="text-align:center"><p style="color:var(--muted);font-style:italic;margin-bottom:14px">Take a moment to think about your answer...</p>' +
          '<button class="reveal-btn" onclick="window.__warmReveal(' + cur + ')">💡 Reveal Answer</button></div>') +
      '</div></div>' +
      '<div class="warm-nav-row"><button class="warm-prev" onclick="window.__warmCard(' + (cur - 1) + ')" ' + (cur === 0 ? 'disabled' : '') + '>← Previous</button>' +
      '<span class="warm-count">' + (cur + 1) + ' / ' + w.length + '</span>' +
      (cur < w.length - 1
        ? '<button class="warm-next" onclick="window.__warmCard(' + (cur + 1) + ')">Next →</button>'
        : '<button class="warm-next" style="background:linear-gradient(135deg,#22c55e,#10b981)" onclick="window.__completeStep(1)" ' + (allRevealed ? '' : 'disabled') + '>Complete Step ✓</button>') +
      '</div>' +
      (!allRevealed ? '<p class="warm-hint">Reveal all ' + w.length + ' answers to complete this step (' + state.warmRevealed.length + '/' + w.length + ' done)</p>' : '');
  }

  function renderKeywords(){
    var kws = DATA.keywords || [];
    var filtered = kws.filter(function(k){
      var lvl = state.kwFilter === 'All' || k.level === state.kwFilter;
      var q = state.kwSearch.toLowerCase();
      var s = !q || k.term.toLowerCase().indexOf(q) >= 0 || k.definition.toLowerCase().indexOf(q) >= 0;
      return lvl && s;
    });
    var translations = (DATA.keywordTranslations && DATA.keywordTranslations.es) || {};
    var html = '<div class="section-head"><span class="sh-icon">📖</span><h2>Keywords & Phrases</h2><p>' + kws.length + ' terms • flashcards & list view</p></div>' +
      '<div class="kw-toggle">' +
      '<button class="' + (state.kwMode === 'flashcard' ? 'on' : '') + '" onclick="window.__kwMode(\\'flashcard\\')">🎴 Flashcards</button>' +
      '<button class="' + (state.kwMode === 'list' ? 'on' : '') + '" onclick="window.__kwMode(\\'list\\')">📋 List View</button>' +
      '</div>' +
      '<div class="kw-progress"><div class="progress-track" style="flex:1;height:8px"><div class="progress-fill" style="width:' + Math.round((state.mastered.length / Math.max(1, kws.length)) * 100) + '%"></div></div>' +
      '<span style="font-size:13px;color:var(--muted);white-space:nowrap">' + state.mastered.length + '/' + kws.length + ' mastered</span></div>';

    if (state.kwMode === 'flashcard') {
      var kw = filtered[state.kwCard];
      if (kw) {
        var trans = translations[kw.term] || '';
        html += '<div class="fc-dots">' + filtered.slice(0, 10).map(function(_, i){
          var cls = 'fc-dot';
          if (i === state.kwCard) cls += ' cur';
          if (state.mastered.indexOf(kws.indexOf(filtered[i])) >= 0) cls += ' mastered';
          return '<button class="' + cls + '" onclick="window.__kwCard(' + i + ')"></button>';
        }).join('') + (filtered.length > 10 ? '<span style="font-size:11px;color:var(--muted)">+' + (filtered.length - 10) + '</span>' : '') + '</div>' +
        '<div class="fc-wrap"><div class="fc-inner' + (state.kwFlipped ? ' flipped' : '') + '" onclick="window.__kwFlip()">' +
          '<div class="fc-face fc-front">' +
            '<span class="fc-level">' + esc(kw.level) + '</span>' +
            '<div class="fc-term">' + esc(kw.term) + '</div>' +
            (trans ? '<div class="fc-trans">' + esc(trans) + '</div>' : '') +
            '<button class="fc-listen" onclick="event.stopPropagation();window.__kwSpeak(' + kws.indexOf(kw) + ')">🔊 Listen</button>' +
            '<div class="fc-tap">Tap to flip</div>' +
          '</div>' +
          '<div class="fc-face fc-back">' +
            '<div class="fc-back-scroll">' +
              '<div class="fc-def-label">Definition</div><div class="fc-def">' + esc(kw.definition) + '</div>' +
              '<div class="fc-def-label">Example</div><div class="fc-ex">"' + esc(kw.example) + '"</div>' +
              (trans ? '<div class="fc-def-label">Español</div><div class="fc-trans" style="color:var(--purple);font-size:14px">' + esc(trans) + '</div>' : '') +
            '</div>' +
            '<div class="fc-tap" style="color:var(--muted)">Tap to flip back</div>' +
          '</div>' +
        '</div></div>' +
        '<div class="fc-nav-row">' +
          '<button class="fc-arr" onclick="window.__kwNav(-1)" ' + (state.kwCard === 0 ? 'disabled' : '') + '>←</button>' +
          '<button class="fc-master" onclick="window.__kwMaster(' + kws.indexOf(kw) + ')">✓ Mastered</button>' +
          '<button class="fc-arr" onclick="window.__kwNav(1)" ' + (state.kwCard >= filtered.length - 1 ? 'disabled' : '') + '>→</button>' +
        '</div>';
      } else {
        html += '<p style="text-align:center;color:var(--muted);padding:30px">No keywords match your filter.</p>';
      }
    } else {
      html += '<div class="kw-list-search">' +
        '<span style="position:relative;flex:1;min-width:180px"><input class="kw-search" style="width:100%" placeholder="Search terms..." value="' + esc(state.kwSearch) + '" oninput="window.__kwSearch(this.value)" /><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%)">🔍</span></span>' +
        ['All','B1','B2'].map(function(l){
          return '<button class="kw-level-btn' + (state.kwFilter === l ? ' on' : '') + '" onclick="window.__kwFilter(\\'' + l + '\\')">' + l + '</button>';
        }).join('') +
      '</div>' +
      '<div class="kw-list">' + filtered.map(function(k){
        var gi = kws.indexOf(k);
        var isM = state.mastered.indexOf(gi) >= 0;
        var tr = translations[k.term] || '';
        return '<div class="kw-item' + (isM ? ' mastered' : '') + '">' +
          '<button class="kw-check" onclick="window.__kwToggle(' + gi + ')">✓</button>' +
          '<div class="kw-main"><span class="kw-term">' + esc(k.term) + '</span>' + (tr ? ' <span style="color:var(--purple);font-size:12px">(' + esc(tr) + ')</span>' : '') +
          '<div class="kw-def">' + esc(k.definition) + '</div></div>' +
          '<button class="kw-sound" onclick="window.__kwSpeak(' + gi + ')">🔊</button>' +
        '</div>';
      }).join('') + '</div>';
    }

    html += '<button class="grad-btn" style="margin-top:16px" onclick="window.__completeStep(2)">Continue to Listening ✓</button>';
    return html;
  }

  function voiceSelectHtml(prefix, key, label, voicesObj, placeholder, emoji, color){
    var vs = naturalVoices();
    return '<div class="vs-row"><div class="vs-avatar" style="background:linear-gradient(135deg,' + color + ')">' + emoji + '</div>' +
      '<select class="vs-select" onchange="window.__setVoice(\\'' + prefix + '\\',\\'' + key.replace(/'/g,'') + '\\',this.value)">' +
      '<option value="">' + placeholder + '</option>' +
      vs.map(function(v){
        var sel = voicesObj[key] === v.name ? ' selected' : '';
        return '<option value="' + esc(v.name) + '"' + sel + '>' + esc(v.name) + ' (' + esc(v.lang) + ')</option>';
      }).join('') +
      '</select></div>';
  }

  // Compact inline voice picker for a transcript bubble — lets the learner
  // assign a distinct voice to each character right from the transcript view
  // (like Micro Lesson V1's per-character voices). Persists via __setVoice.
  function inlineVoice(prefix, key, voicesObj, currentVoice){
    var vs = naturalVoices();
    return '<select class="vs-inline" onchange="window.__setVoice(\\'' + prefix + '\\',\\'' + key.replace(/'/g,'') + '\\',this.value)" title="Voice for ' + esc(key) + '">' +
      '<option value="">🎙️</option>' +
      vs.map(function(v){
        var sel = currentVoice === v.name ? ' selected' : '';
        return '<option value="' + esc(v.name) + '"' + sel + '>' + esc(v.name) + ' (' + esc(v.lang) + ')</option>';
      }).join('') +
      '</select>';
  }
  // "Play this line" button — speaks a single transcript bubble with the
  // character's assigned voice (falls back to a sensible default).
  function linePlayBtn(prefix, key, text, lineIdx, speaking){
    var spoken = speaking === lineIdx ? 'is-playing' : '';
    return '<button class="msg-play ' + spoken + '" onclick="window.__speakLine(\\'' + prefix + '\\',\\'' + key.replace(/'/g,'') + '\\',' + lineIdx + ')">▶</button>';
  }

  function renderListen(){
    var d = DATA.dialogue || { title: '', speakers: [], lines: [] };
    var avatars = { Maya: ['👩‍💼','#f472b6,#f43f5e'], James: ['👨‍💻','#60a5fa,#6366f1'] };
    var emotions = {
      curious: 'rgba(250,204,21,.15),#fbbf24', calm: 'rgba(59,130,246,.15),#93c5fd', surprised: 'rgba(249,115,22,.15),#fb923c',
      reflective: 'rgba(139,92,246,.15),#c4b5fd', thoughtful: 'rgba(20,184,166,.15),#5eead4', concerned: 'rgba(239,68,68,.15),#fca5a5',
      serious: 'rgba(107,114,128,.15),#9ca3af', honest: 'rgba(99,102,241,.15),#a5b4fc', happy: 'rgba(34,197,94,.15),#86efac',
      amused: 'rgba(236,72,153,.15),#f9a8d4', encouraging: 'rgba(16,185,129,.15),#6ee7b7'
    };
    var html = '<div class="section-head"><span class="sh-icon">🎧</span><h2>Listen to the Dialogue</h2><p>' + esc(d.title) + '</p></div>';
    if (isMuted) html += '<div class="muted-banner">🔇 Audio is muted. Unmute the cat to hear the dialogue.</div>';
    if (state.dialogueVoicesOpen) {
      html += '<div class="voice-setup"><div class="vs-title">🎙️ Choose Voices for Each Character</div>' +
        (d.speakers || []).map(function(s){
          var a = avatars[s] || ['👤','#6b7280,#374151'];
          return voiceSelectHtml('speaker', s, s, speakerVoices, 'Select voice for ' + s, a[0], a[1]);
        }).join('') +
        '<button class="vs-skip" onclick="window.__skipVoices(\\'dialogue\\')">Skip (use default voices)</button></div>';
    } else {
      html += '<div class="speaker-cards">' + (d.speakers || []).map(function(s){
        var a = avatars[s] || ['👤','#6b7280,#374151'];
        var v = speakerVoices[s] ? speakerVoices[s].slice(0, 20) : 'Default';
        return '<div class="speaker-card"><div class="vs-avatar" style="background:linear-gradient(135deg,' + a[1] + ')">' + a[0] + '</div>' +
          '<div><div class="s-name">' + esc(s) + '</div><div class="s-voice">' + esc(v) + '</div></div></div>';
      }).join('') +
      '<button class="icon-btn" onclick="window.__openVoiceSetup(\\'dialogue\\')">⚙️</button></div>';
    }
    html += '<div class="play-row">' +
      (!state.dialoguePlaying
        ? '<button class="play-btn" onclick="window.__playDialogue()" ' + (isMuted ? 'disabled' : '') + '><span style="font-size:22px">▶</span> ' + (state.dialoguePlayed ? 'Play Again' : 'Play Dialogue') + '</button>'
        : '<button class="play-btn stop" onclick="window.__stopDialogue()"><span style="font-size:22px">⏹</span> Stop</button>') +
      '</div>';
    html += '<div class="transcript">' + (d.lines || []).map(function(l, i){
      var a = avatars[l.speaker] || ['👤','#6b7280,#374151'];
      var isMaya = l.speaker === 'Maya';
      var active = state.dialogueLine === i;
      var emo = emotions[l.emotion];
      var em = emo ? '<span class="msg-emotion" style="background:' + emo.split(',')[0] + ';color:' + emo.split(',')[1] + '">' + esc(l.emotion) + '</span>' : '';
      return '<div class="msg-row' + (isMaya ? ' reverse' : '') + '">' +
        '<div class="msg-avatar" style="background:linear-gradient(135deg,' + a[1] + ');' + (active ? 'outline:3px solid var(--purple);outline-offset:2px' : '') + '">' + a[0] + '</div>' +
        '<div class="msg-body"><div class="msg-meta' + (isMaya ? '" style="flex-direction:row-reverse' : '') + '"><span class="msg-speaker">' + esc(l.speaker) + '</span>' + em + linePlayBtn('speaker', l.speaker, l.text, i, state.dialogueLine) + inlineVoice('speaker', l.speaker, speakerVoices, speakerVoices[l.speaker] || '') + '</div>' +
        '<div class="msg-bubble' + (active ? ' active' : '') + '">' + esc(l.text) + '</div></div></div>';
    }).join('') + '</div>';
    html += '<button class="grad-btn" style="margin-top:16px" onclick="window.__completeStep(3)">Continue to Reading ✓</button>';
    return html;
  }

  function renderReading(){
    var r = DATA.reading || {};
    var levels = [
      { id: 'basic', label: '🌱 Basic', desc: 'A1/A2 vocabulary' },
      { id: 'intermediate', label: '📘 Intermediate', desc: 'B1/B2 vocabulary' },
      { id: 'advanced', label: '🎓 Advanced', desc: 'B2/C1 vocabulary' }
    ];
    var art = r[state.readLevel] || { title: '', content: '' };
    return '<div class="section-head"><span class="sh-icon">📰</span><h2>Multi-Level Reading</h2><p>Read the same topic at three difficulty levels</p></div>' +
      '<div class="read-tabs">' + levels.map(function(l){
        return '<button class="read-tab' + (state.readLevel === l.id ? ' on' : '') + '" onclick="window.__setReadLevel(\\'' + l.id + '\\')">' + l.label + '</button>';
      }).join('') + '</div>' +
      '<div class="read-badge-bar"><span style="font-size:22px">' + (state.readLevel === 'basic' ? '🌱' : state.readLevel === 'intermediate' ? '📘' : '🎓') + '</span>' +
      '<div><div style="font-weight:700;font-size:13px">' + (levels.find(function(l){ return l.id === state.readLevel; }) || {}).label + ' Level</div>' +
      '<div style="font-size:11px;color:var(--muted)">' + (levels.find(function(l){ return l.id === state.readLevel; }) || {}).desc + '</div></div>' +
      (!state.readPlaying
        ? '<button class="read-listen" onclick="window.__readAloud()" ' + (isMuted ? 'disabled' : '') + '>🔊 Listen</button>'
        : '<button class="read-listen" style="color:#f87171" onclick="window.__stopRead()">⏹ Stop</button>') +
      '</div>' +
      '<div class="read-art"><h3>' + esc(art.title) + '</h3><div>' + art.content + '</div></div>' +
      '<button class="grad-btn" style="margin-top:16px" onclick="window.__completeStep(4)">Continue to Speaking ✓</button>';
  }

  function renderKaraoke(){
    var passage = '';
    if (DATA.reading && DATA.reading.basic) passage = DATA.reading.basic.content;
    var words = state.karaWords;
    if (!words.length) {
      words = passage.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().split(/\\s+/).filter(Boolean).map(function(w, i){ return { word: w, status: 'pending', index: i }; });
      state.karaWords = words;
    }
    var correctCount = words.filter(function(w){ return w.status === 'correct'; }).length;
    var progress = Math.round((correctCount / Math.max(1, words.length)) * 100);
    return '<div class="section-head"><span class="sh-icon">🎤</span><h2>Karaoke Reading Mode</h2><p>Read aloud — words highlight as you speak</p></div>' +
      '<div class="kara-stats">' +
      '<div class="kara-stat" style="border-color:rgba(34,197,94,.3)"><div class="v" style="color:#4ade80">' + correctCount + '</div><div style="font-size:11px;color:var(--muted)">Words Said</div></div>' +
      '<div class="kara-stat" style="border-color:rgba(139,92,246,.3)"><div class="v" style="color:#c4b5fd">' + state.karaWpm + '</div><div style="font-size:11px;color:var(--muted)">WPM</div></div>' +
      '<div class="kara-stat" style="border-color:rgba(59,130,246,.3)"><div class="v" style="color:#93c5fd">' + progress + '%</div><div style="font-size:11px;color:var(--muted)">Progress</div></div>' +
      '</div>' +
      '<div class="progress-track" style="margin-bottom:14px"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
      '<div class="play-row">' +
      (!state.karaListening
        ? '<button class="play-btn" style="background:linear-gradient(135deg,#ef4444,#ec4899)" onclick="window.__karaStart()">🎤 Start Speaking</button>'
        : '<button class="play-btn stop" onclick="window.__karaStop()">⏹ Stop</button>') +
      '<button class="play-btn" style="background:var(--panel2);color:var(--muted)" onclick="window.__karaReset()">🔄 Reset</button>' +
      '</div>' +
      (state.karaListening ? '<div class="kara-listen-row"><span class="listen-dot"></span> Listening...</div>' : '') +
      (state.karaErr ? '<div class="muted-banner" style="color:#fca5a5;border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.1)">' + esc(state.karaErr) + '</div>' : '') +
      '<div class="kara-words">' + words.map(function(w){
        var cls = 'kw-word';
        if (w.status === 'correct') cls += ' correct';
        if (w.status === 'current') cls += ' current';
        if (w.status === 'missed') cls += ' missed';
        return '<span class="' + cls + '">' + esc(w.word) + '</span>';
      }).join('') + '</div>' +
      (state.karaDone ? '<div style="margin-top:14px;padding:20px;border-radius:16px;background:rgba(34,197,94,.1);border:1px solid #22c55e;text-align:center"><div style="font-size:34px">🎉</div><div style="font-weight:700;color:#4ade80;margin-top:6px">Reading Complete!</div><div style="font-size:13px;color:var(--muted)">Final speed: ' + state.karaWpm + ' WPM</div></div>' : '') +
      '<button class="grad-btn" style="margin-top:16px" onclick="window.__completeStep(5)">Continue to Grammar Analysis ✓</button>';
  }

  function renderGrammar(){
    var slides = DATA.grammarSlides || [];
    var grouped = { 'A2/B1': [], 'B1/B2': [], 'B2/C1': [] };
    slides.forEach(function(s){ (grouped[s.level] = grouped[s.level] || []).push(s); });
    var levelColors = {
      'A2/B1': 'rgba(34,197,94,.12),#4ade80',
      'B1/B2': 'rgba(59,130,246,.12),#60a5fa',
      'B2/C1': 'rgba(139,92,246,.12),#c4b5fd'
    };
    var html = '<div class="section-head"><span class="sh-icon">🔬</span><h2>Language Analysis</h2><p>9 grammar structures across CEFR levels — click any to explore</p></div>' +
      '<div class="gram-progress"><div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px"><span>Slides explored</span><span>' + state.gramViewed.length + '/' + slides.length + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + Math.round((state.gramViewed.length / Math.max(1, slides.length)) * 100) + '%"></div></div></div></div>';
    Object.keys(grouped).forEach(function(lvl){
      if (!grouped[lvl].length) return;
      var c = levelColors[lvl] || levelColors['A2/B1'];
      html += '<div class="gram-group"><div class="gram-lvl-badge" style="background:' + c.split(',')[0] + ';color:' + c.split(',')[1] + ';border:1px solid ' + c.split(',')[1] + '">CEFR ' + lvl + '</div>';
      grouped[lvl].forEach(function(g){
        var idx = slides.indexOf(g);
        var open = state.gramOpen === idx;
        var viewed = state.gramViewed.indexOf(idx) >= 0;
        html += '<div class="gram-card' + (open ? ' open' : '') + '" onclick="window.__gramToggle(' + idx + ')">' +
          '<div class="gram-head"><div class="gram-ico" style="' + (viewed ? 'background:' + c.split(',')[0] + ';color:' + c.split(',')[1] : '') + '">' + (viewed ? '✅' : '📌') + '</div>' +
          '<div style="flex:1;min-width:0"><div class="gram-title">' + esc(g.structure) + '</div>' + (!open ? '<div class="gram-meaning">' + esc(g.meaning) + '</div>' : '') + '</div>' +
          '<span class="gram-caret">▾</span></div>' +
          (open ? '<div class="gram-body">' +
            '<div class="gram-sec-label">Example</div><div class="gram-ex" style="background:' + c.split(',')[0] + ';color:' + c.split(',')[1] + '">"' + esc(g.example) + '"</div>' +
            '<div class="gram-sec-label">Meaning & Use</div><p style="font-size:13px;line-height:1.6;margin-bottom:12px">' + esc(g.meaning) + '</p>' +
            '<div class="gram-sec-label">⚠️ Common Mistake</div><div class="gram-mistake">' + esc(g.mistake) + '</div>' +
            '<div class="gram-sec-label">Alternatives</div><div class="gram-alts">' + (g.alternatives || []).map(function(a){ return '<span class="gram-alt">' + esc(a) + '</span>'; }).join('') + '</div>' +
            '<button class="gram-listen" onclick="event.stopPropagation();window.__gramSpeak(' + idx + ')">🔊 Listen to Explanation</button>' +
          '</div>' : '') +
        '</div>';
      });
      html += '</div>';
    });
    html += '<button class="grad-btn" onclick="window.__completeStep(6)">Continue to Radio Drama ✓</button>';
    return html;
  }

  function renderDrama(){
    var dr = DATA.radioDrama || { title: '', setting: '', cast: [], lines: [] };
    var styles = {
      'Narrator': ['📻','#6b7280,#374151'],
      'Mom (Adaeze)': ['👩🏾‍🍳','#fb7185,#ec4899'],
      'Dad (Emeka)': ['👨🏾‍💼','#3b82f6,#4f46e5'],
      'Teen (Zoe)': ['👧🏾','#c084fc,#8b5cf6']
    };
    var ambient = { kitchen: '🍳 Kitchen ambiance', office: '💼 Office sounds', cafe: '☕ Café background', street: '🚗 Street noise', park: '🌳 Park atmosphere', rain: '🌧️ Rainy day' };
    var amKey = dr.ambientSound || 'kitchen';
    var html = '<div class="section-head"><span class="sh-icon">🎭</span><h2>Radio Drama</h2><p>"' + esc(dr.title) + '" — ' + esc(dr.setting) + '</p></div>' +
      '<div class="ambient-pill"><div>🍳 ' + (ambient[amKey] || ambient.kitchen) + '</div></div>';
    if (isMuted) html += '<div class="muted-banner">🔇 Audio is muted. Unmute the cat to hear the drama.</div>';

    if (state.dramaVoicesOpen) {
      html += '<div class="voice-setup"><div class="vs-title">🎙️ Choose Voices for Each Character</div>' +
        (dr.cast || []).map(function(c){
          var s = styles[c] || ['👤','#6b7280,#374151'];
          return voiceSelectHtml('character', c, c, characterVoices, 'Select voice for ' + c, s[0], s[1]);
        }).join('') +
        '<button class="vs-skip" onclick="window.__skipVoices(\\'drama\\')">Skip (use default voices)</button></div>';
    } else if (!state.dramaQuizOpen) {
      html += '<div class="cast-grid">' + (dr.cast || []).map(function(c){
        var s = styles[c] || ['👤','#6b7280,#374151'];
        var active = state.dramaLine >= 0 && dr.lines[state.dramaLine] && dr.lines[state.dramaLine].character === c;
        return '<div class="cast-card' + (active ? ' active' : '') + '"><div class="cast-emoji" style="background:linear-gradient(135deg,' + s[1] + ')">' + s[0] + '</div>' +
          '<div class="cast-name">' + esc(c) + '</div>' +
          (active ? '<div class="eq"><span></span><span></span><span></span></div>' : '') +
          '</div>';
      }).join('') + '</div>';
    }

    if (!state.dramaQuizOpen) {
      html += '<div class="play-row">' +
        (!state.dramaPlaying
          ? '<button class="play-btn" style="background:linear-gradient(135deg,#f43f5e,#ec4899)" onclick="window.__playDrama()" ' + (isMuted ? 'disabled' : '') + '><span style="font-size:22px">🎙️</span> ' + (state.dramaPlayed ? 'Replay Drama' : 'Play Radio Drama') + '</button>'
          : '<button class="play-btn stop" onclick="window.__stopDrama()"><span>⏹</span> Stop</button>') +
        '<button class="play-btn" style="background:var(--panel2);color:var(--muted)" onclick="window.__openVoiceSetup(\\'drama\\')">⚙️</button>' +
        '</div>';
      html += '<div class="script-box">' + (dr.lines || []).map(function(l, i){
        var s = styles[l.character] || ['👤','#6b7280,#374151'];
        var active = state.dramaLine === i;
        if (l.character === 'Narrator') {
          return '<div class="narr-line' + (active ? ' active' : '') + '">[' + esc(l.text) + ']</div>';
        }
        return '<div class="msg-row"><div class="msg-avatar" style="background:linear-gradient(135deg,' + s[1] + ');' + (active ? 'outline:3px solid var(--purple);outline-offset:2px' : '') + '">' + s[0] + '</div>' +
          '<div class="msg-body"><div class="msg-meta"><span class="msg-speaker">' + esc(l.character) + '</span>' + linePlayBtn('character', l.character, l.text, i, state.dramaLine) + inlineVoice('character', l.character, characterVoices, characterVoices[l.character] || '') + '</div>' +
          '<div class="msg-bubble' + (active ? ' active' : '') + '" style="border-top-left-radius:4px">' + esc(l.text) + '</div></div></div>';
      }).join('') + '</div>';
      html += '<button class="grad-btn" style="margin-top:16px" onclick="window.__dramaContinue()">' + (state.dramaPlayed && (dr.comprehensionQuestions || []).length ? 'Take Comprehension Quiz →' : 'Continue to Dictation ✓') + '</button>';
    } else {
      html += renderDramaQuiz(dr);
    }
    return html;
  }

  function renderDramaQuiz(dr){
    var qs = dr.comprehensionQuestions || [];
    if (!qs.length) {
      return '<button class="grad-btn" onclick="window.__completeStep(7)">Continue to Dictation ✓</button>';
    }
    var html = '<div class="section-head"><h2 style="font-size:18px">📝 Comprehension Check</h2><p>Test your understanding of the radio drama</p></div>';
    qs.forEach(function(q, qi){
      html += '<div class="card card-pad" style="margin-bottom:12px"><p style="font-weight:700;margin-bottom:12px">' + (qi + 1) + '. ' + esc(q.question) + '</p>';
      q.options.forEach(function(opt, oi){
        var cls = 'quiz-opt';
        var sel = state.dramaAnswers[qi] === oi;
        if (state.dramaSubmitted) {
          if (oi === q.correct) cls += ' correct';
          else if (sel) cls += ' wrong';
          else cls += ' dim';
        } else if (sel) cls += ' correct';
        html += '<button class="' + cls + '" onclick="window.__dramaAnswer(' + qi + ',' + oi + ')" ' + (state.dramaSubmitted ? 'disabled' : '') + '>' +
          '<span class="q-letter">' + String.fromCharCode(65 + oi) + '</span>' + esc(opt) + '</button>';
      });
      if (state.dramaSubmitted) html += '<div class="quiz-expl">💡 ' + esc(q.explanation) + '</div>';
      html += '</div>';
    });
    if (!state.dramaSubmitted) {
      var allAnswered = (state.dramaAnswers.filter(function(a){ return a !== null && a !== undefined; }).length) === qs.length;
      html += '<button class="grad-btn" onclick="window.__dramaSubmit()" ' + (allAnswered ? '' : 'disabled') + '>Check Answers ✓</button>';
    } else {
      var score = 0;
      qs.forEach(function(q, i){ if (state.dramaAnswers[i] === q.correct) score++; });
      var good = score >= qs.length / 2;
      html += '<div class="cg-end ' + (good ? 'win' : 'lose') + '" style="margin-bottom:12px"><div style="font-size:34px">' + (good ? '🎉' : '💪') + '</div>' +
        '<div style="font-weight:700;margin-top:6px">You got ' + score + '/' + qs.length + ' correct!</div></div>' +
        '<div class="play-row">' +
        '<button class="play-btn" style="background:var(--panel2);color:var(--muted)" onclick="window.__dramaReplay()">🔄 Replay Drama</button>' +
        '<button class="play-btn" onclick="window.__completeStep(7)">Continue →</button></div>';
    }
    return html;
  }

  function renderDictation(){
    var sents = DATA.dictation ? DATA.dictation.sentences : [];
    if (!sents.length) return '<p style="color:var(--muted);text-align:center">No dictation sentences.</p>';
    var cur = state.dictIdx;
    var sentence = sents[cur];
    var avg = state.dictScores.length ? Math.round(state.dictScores.reduce(function(a, b){ return a + b; }, 0) / state.dictScores.length) : 0;
    var html = '<div class="section-head"><span class="sh-icon">✍️</span><h2>Dictation Challenge</h2><p>Listen carefully and type what you hear</p></div>' +
      '<div class="dict-track">' + sents.map(function(_, i){
        var cls = 'dict-seg';
        if (i < cur) cls += state.dictScores[i] >= 70 ? ' past-g' : ' past-b';
        if (i === cur) cls += ' cur';
        return '<div class="' + cls + '"></div>';
      }).join('') + '</div>' +
      '<div style="text-align:center;font-size:13px;color:var(--muted);margin-bottom:12px">Sentence ' + (cur + 1) + ' of ' + sents.length + (state.dictScores.length ? ' • Average accuracy: ' + avg + '%' : '') + '</div>';
    if (isMuted) html += '<div class="muted-banner">🔇 Unmute the cat to hear the sentence</div>';
    html += '<div class="card card-pad dict-player"><div style="font-size:36px">🎧</div>' +
      '<p style="color:var(--muted);font-size:13px;margin:8px 0 14px">' + (isMuted ? 'Unmute to hear the sentence' : 'Click play to hear the sentence') + '</p>' +
      '<div class="play-row"><button class="play-btn" onclick="window.__dictPlay()" ' + (isMuted ? 'disabled' : '') + '>' +
      '<span style="font-size:20px">▶</span> Play Sentence</button>' +
      (state.dictSubmitted ? '<button class="play-btn" style="background:rgba(59,130,246,.2);color:#93c5fd" onclick="window.__dictPlay()">🔁 Hear Again</button>' : '') +
      '</div></div>';
    html += '<textarea id="dict-input" rows="3" placeholder="Type what you heard..." class="gp-input" style="width:100%;margin-top:12px;resize:none" ' + (state.dictSubmitted ? 'disabled' : '') + ' oninput="window.__dictInput(this.value)">' + esc(state.dictInput) + '</textarea>';
    if (!state.dictSubmitted) {
      html += '<button class="grad-btn" style="margin-top:12px" onclick="window.__dictSubmit()" ' + (state.dictInput.trim() ? '' : 'disabled') + '>Check My Answer ✓</button>';
    } else {
      var acc = Math.round((state.dictResults.filter(function(r){ return r.correct; }).length / Math.max(1, state.dictResults.length)) * 100);
      html += '<div class="dict-acc" style="' + (acc >= 90 ? 'border-color:#22c55e;background:rgba(34,197,94,.1)' : acc >= 70 ? 'border-color:#eab308;background:rgba(234,179,8,.1)' : 'border-color:#ef4444;background:rgba(239,68,68,.1)') + '">' +
        '<div class="big" style="color:' + (acc >= 90 ? '#4ade80' : acc >= 70 ? '#fbbf24' : '#f87171') + '">' + acc + '%</div>' +
        '<div style="font-weight:700;font-size:13px;color:' + (acc >= 90 ? '#4ade80' : acc >= 70 ? '#fbbf24' : '#f87171') + '">' + (acc >= 90 ? '🎉 Excellent!' : acc >= 70 ? '👍 Good effort!' : '💪 Keep practicing!') + '</div></div>' +
        '<div class="card card-pad" style="margin-bottom:12px"><div class="gram-sec-label" style="margin-bottom:8px">Word Analysis</div><div class="word-tags">' +
        state.dictResults.map(function(r){
          return '<span class="word-tag ' + (r.correct ? 'good' : 'bad') + '">' + (r.correct ? esc(r.word) : '<span style="text-decoration:line-through;opacity:.6">' + esc(r.userWord || '?') + '</span> → <b>' + esc(r.word) + '</b>') + '</span>';
        }).join('') + '</div></div>' +
        '<div class="dict-correct">✅ Correct sentence: "' + esc(sentence) + '"</div>' +
        (cur >= sents.length - 1
          ? '<button class="grad-btn" style="background:linear-gradient(135deg,#22c55e,#10b981)" onclick="window.__completeStep(8)">Continue to Discussion ✓</button>'
          : '<button class="grad-btn" onclick="window.__dictNext()">Next Sentence →</button>');
    }
    return html;
  }

  function renderDiscussion(){
    var d = DATA.discussion || { post: '', comments: [] };
    var comments = d.comments || [];
    var html = '<div class="section-head"><span class="sh-icon">💬</span><h2>Discussion Corner</h2><p>Select the most insightful comment</p></div>' +
      '<div class="card post-card"><div class="post-head"><div class="post-avatar">🐦</div>' +
      '<div><div class="post-name">TechWatcher</div><div class="post-handle">@TechWatcher • Just now</div></div>' +
      '<span class="post-tag">Discussion Post</span></div>' +
      '<p class="post-text">' + esc(d.post) + '</p>' +
      '<div class="post-stats"><span>❤️ 247 likes</span><span>💬 4 comments</span><span>🔁 89 shares</span></div></div>' +
      '<div class="divider-row"><div class="line"></div><span style="font-size:13px;color:var(--muted);font-weight:500;white-space:nowrap">Which response is most insightful?</span><div class="line"></div></div>';
    comments.forEach(function(c, i){
      var cls = 'comment-card';
      if (state.discRevealed) {
        if (c.isCorrect) cls += ' correct-ans';
        else if (state.discSelected === i) cls += ' wrong-ans';
      } else if (state.discSelected === i) cls += ' selected';
      html += '<div class="' + cls + '" onclick="window.__discSelect(' + i + ')">' +
        '<div class="comment-row"><div class="comment-avatar">' + c.avatar +
        (state.discRevealed ? (c.isCorrect ? '<span class="comment-mark">✓</span>' : (state.discSelected === i ? '<span class="comment-mark x">✗</span>' : '')) : '') +
        '</div><div class="comment-main">' +
        '<div class="comment-name">' + esc(c.character) + (state.discSelected === i && !state.discRevealed ? '<span style="font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(139,92,246,.2);color:#c4b5fd">Selected</span>' : '') + '</div>' +
        '<p class="comment-text">' + esc(c.text) + '</p>' +
        (state.discRevealed ? '<div class="comment-fb ' + (c.isCorrect ? 'good' : 'neutral') + '"><div class="gram-sec-label">📊 Analysis</div>' + esc(c.feedback) + '</div>' : '') +
        '</div><div class="radio-dot">' + (state.discSelected === i ? '✓' : '') + '</div></div></div>';
    });
    if (!state.discRevealed) {
      html += '<button class="grad-btn" onclick="window.__discSubmit()" ' + (state.discSelected !== null ? '' : 'disabled') + '>Submit My Answer ✓</button>';
    } else {
      var correctPick = comments[state.discSelected] && comments[state.discSelected].isCorrect;
      html += '<div class="cg-end ' + (correctPick ? 'win' : 'lose') + '" style="margin-bottom:12px">' +
        (correctPick ? '<p style="font-weight:700">🎉 Excellent critical thinking! You selected the most insightful response.</p>' : '<p style="font-weight:700">💡 Good try! Read Brittany\\'s response for the best critical thinking example.</p>') +
        '</div>' +
        '<button class="grad-btn" onclick="window.__completeStep(9)">Continue to Final Quiz ✓</button>';
    }
    return html;
  }

  function renderQuiz(){
    var quiz = DATA.quiz || [];
    if (state.quizResults) {
      var score = state.quizAnswers.filter(Boolean).length;
      var pct = Math.round((score / Math.max(1, quiz.length)) * 100);
      var html = '<div class="results-hero"><div style="font-size:56px">' + (pct >= 90 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '👍' : '📖') + '</div>' +
        '<h2 style="font-size:26px;font-weight:900;margin-top:6px">Quiz Complete!</h2>' +
        '<div class="big">' + pct + '%</div>' +
        '<p style="font-size:15px">' + score + ' out of ' + quiz.length + ' correct</p></div>' +
        '<div class="kara-stats" style="margin-top:12px">' +
        '<div class="kara-stat"><div class="v" style="color:#4ade80">' + score + '</div><div style="font-size:11px;color:var(--muted)">Correct</div></div>' +
        '<div class="kara-stat"><div class="v" style="color:#f87171">' + (quiz.length - score) + '</div><div style="font-size:11px;color:var(--muted)">Incorrect</div></div>' +
        '<div class="kara-stat"><div class="v" style="color:#c4b5fd">' + pct + '%</div><div style="font-size:11px;color:var(--muted)">Accuracy</div></div>' +
        '</div>';
      if (state.quizSecret) {
        html += '<div class="secret-box"><div style="position:absolute;left:15%;top:8px" class="sparkle">✨</div><div style="position:absolute;left:40%;top:12px" class="sparkle" style2="">⭐</div><div style="position:absolute;left:65%;top:8px" class="sparkle">💫</div><div style="position:absolute;left:82%;top:14px" class="sparkle">✨</div>' +
          '<div style="font-size:30px;margin-bottom:8px">🔐</div>' +
          '<h3 style="color:#fff;font-weight:900;font-size:17px;margin-bottom:6px">Secret Progress Code Unlocked!</h3>' +
          '<p style="color:rgba(255,255,255,.7);font-size:13px;margin-bottom:14px">You scored 80%+ and earned this exclusive code</p>' +
          '<div class="secret-code">' + esc(DATA.secretCode) + '</div>' +
          '<p style="color:rgba(255,255,255,.5);font-size:11px;margin-top:12px">Save this code — it proves you completed today\\'s lesson!</p></div>';
      }
      html += '<div style="margin-top:14px"><h3 style="font-weight:700;font-size:14px;margin-bottom:8px">Answer Review:</h3>' +
        quiz.map(function(q, i){
          return '<div class="review-row ' + (state.quizAnswers[i] ? 'good' : 'bad') + '"><span style="font-size:17px">' + (state.quizAnswers[i] ? '✅' : '❌') + '</span>' +
            '<div style="flex:1"><p style="font-size:13px;font-weight:500">' + esc(q.question) + '</p>' +
            (!state.quizAnswers[i] ? '<p style="font-size:11px;color:var(--muted);margin-top:2px">' + esc(q.explanation) + '</p>' : '') + '</div></div>';
        }).join('') + '</div>' +
        '<button class="grad-btn" style="margin-top:16px;background:linear-gradient(135deg,#22c55e,#10b981)" onclick="window.__finishLesson()">🎓 Complete Lesson!</button>';
      return html;
    }
    var q = quiz[state.quizCur] || quiz[0];
    if (!q) return '<p style="color:var(--muted);text-align:center">No quiz questions.</p>';
    var html = '<div class="section-head"><span class="sh-icon">🧠</span><h2>Final Quiz</h2><p>Score 80%+ to unlock the Secret Code</p></div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="progress-track" style="flex:1"><div class="progress-fill" style="width:' + Math.round((state.quizCur / quiz.length) * 100) + '%"></div></div>' +
      '<span style="font-size:13px;font-weight:700;color:var(--muted)">' + (state.quizCur + 1) + '/' + quiz.length + '</span></div>' +
      '<div class="quiz-track">' + state.quizAnswers.map(function(a, i){
        return '<div class="quiz-dot ' + (a ? 'good' : 'bad') + '">' + (a ? '✓' : '✗') + '</div>';
      }).join('') + Array(Math.max(0, quiz.length - state.quizAnswers.length)).fill('<div class="quiz-dot" style="background:var(--border)"></div>').join('') + '</div>' +
      '<div class="card quiz-q-card" key="q' + state.quizCur + '">' +
      '<div class="gram-sec-label" style="margin-bottom:6px;color:var(--purple)">Question ' + (state.quizCur + 1) + '</div>' +
      '<p style="font-size:17px;font-weight:700;line-height:1.5;margin-bottom:18px">' + esc(q.question) + '</p>' +
      q.options.map(function(opt, oi){
        var cls = 'quiz-opt';
        if (state.quizAnswered) {
          if (oi === q.correct) cls += ' correct';
          else if (oi === state.quizSelected) cls += ' wrong';
          else cls += ' dim';
        } else if (oi === state.quizSelected) cls += ' correct';
        return '<button class="' + cls + '" onclick="window.__quizAnswer(' + oi + ')" ' + (state.quizAnswered ? 'disabled' : '') + '>' +
          '<span class="q-letter">' + String.fromCharCode(65 + oi) + '</span>' + esc(opt) + '</button>';
      }).join('') +
      (state.quizAnswered ? '<div class="quiz-expl">💡 ' + esc(q.explanation) + '</div>' : '') +
      '</div>' +
      (state.quizAnswered ? '<button class="grad-btn" style="margin-top:14px" onclick="window.__quizNext()">' + (state.quizCur < quiz.length - 1 ? 'Next Question →' : 'See Results 🎯') + '</button>' : '');
    return html;
  }

  function renderConversation(){
    var cg = DATA.conversationGame;
    if (!cg) return '<p style="color:var(--muted);text-align:center;padding:40px">No conversation game in this lesson.</p>';
    var node = cg.nodes[state.cgNode];
    if (!node) node = cg.nodes.start;
    var char = null;
    for (var i = 0; i < cg.characters.length; i++) if (cg.characters[i].name === node.speaker) char = cg.characters[i];
    var html = '<div class="section-head"><span class="sh-icon">🗣️</span><h2>' + esc(cg.title) + '</h2><p>' + esc(cg.description) + '</p></div>' +
      '<div class="cg-chars">' + cg.characters.map(function(c){
        return '<div class="cg-char"><div class="c-avatar" style="background:linear-gradient(135deg,#a78bfa,#6366f1)">' + c.avatar + '</div>' +
          '<div><div style="font-weight:700;font-size:13px">' + esc(c.name) + '</div><div style="font-size:11px;color:var(--muted)">' + esc(c.role) + '</div></div></div>';
      }).join('') + '</div>';
    if (node.isEnd) {
      html += '<div class="cg-end ' + (node.isWin ? 'win' : 'lose') + '"><div style="font-size:44px">' + (node.isWin ? '🎉' : '💼') + '</div>' +
        '<div style="font-weight:900;font-size:18px;margin:8px 0">' + (node.isWin ? 'Welcome Aboard!' : 'Interview Ended') + '</div>' +
        '<p style="font-size:14px;color:var(--muted);line-height:1.7">' + esc(node.endMessage) + '</p>' +
        '<button class="grad-btn" style="margin-top:14px;width:auto;padding:12px 28px" onclick="window.__cgReset()">🔄 Play Again</button></div>' +
        '<div class="cg-discuss"><h3 style="font-weight:700;font-size:14px;margin-bottom:8px">💭 Discussion Questions</h3><ul>' +
        (cg.discussionQuestions || []).map(function(dq){ return '<li>' + esc(dq) + '</li>'; }).join('') + '</ul></div>';
    } else {
      html += '<div class="card cg-dialogue"><div class="cg-speaker">' + (char ? char.avatar + ' ' : '') + esc(node.speaker) + '</div>' +
        '<div class="cg-text">' + esc(node.text) + '</div></div>' +
        node.choices.map(function(ch, i){
          var picked = state.cgPicked === i;
          return '<button class="cg-choice' + (picked ? ' picked' : '') + '" onclick="window.__cgChoose(' + i + ')">' +
            '<span style="font-weight:700;margin-right:8px">' + String.fromCharCode(65 + i) + '.</span>' + esc(ch.text) +
            '<div class="cg-cat-note">🐱 ' + esc(ch.catNote) + '</div></button>';
        }).join('') +
        (state.cgPicked !== null ? '<button class="grad-btn" style="margin-top:12px" onclick="window.__cgAdvance()">Continue →</button>' : '');
    }
    return html;
  }

  function renderPlace(){
    var gp = DATA.guessThePlace;
    if (!gp) return '<p style="color:var(--muted);text-align:center;padding:40px">No place game in this lesson.</p>';
    var html = '<div class="section-head"><span class="sh-icon">🗺️</span><h2>Guess the Place</h2><p>Read the description and guess where in the world you are</p></div>' +
      '<div class="gp-clue">' + clueHtml(gp.clue, gp.tooltipWords || {}) + '</div>' +
      '<div style="margin-bottom:12px"><div class="gram-sec-label" style="margin-bottom:6px">Need a hint?</div>' +
      gp.hints.map(function(h, i){
        if (i >= state.gpHintShown) return '<button class="gp-hint-btn" onclick="window.__gpHint()">🔎 Reveal Hint ' + (i + 1) + '</button>';
        return '<div class="gp-hint-btn" style="cursor:default;border-color:rgba(139,92,246,.4)">💡 Hint ' + (i + 1) + ': <span class="hint">' + esc(h) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="gp-imgs">' + gp.images.map(function(img){
        return '<div class="gp-img"><span class="e">' + img.emoji + '</span><div class="l">' + esc(img.label) + '</div><div class="d">' + esc(img.description) + '</div></div>';
      }).join('') + '</div>' +
      '<div class="gram-sec-label" style="margin-bottom:6px">Survival phrases — tap to hear</div>' +
      '<div class="gp-phrases">' + gp.survivalPhrases.map(function(p, i){
        return '<button class="gp-phrase" onclick="window.__gpPhrase(' + i + ')"><div class="ph">' + esc(p.phrase) + '</div><div class="pr">' + esc(p.pronunciation) + ' — ' + esc(p.translation) + '</div></button>';
      }).join('') + '</div>' +
      '<button class="play-btn" style="width:100%;margin-bottom:12px" onclick="window.__gpTour()" ' + (isMuted ? 'disabled' : '') + '>🎧 Audio Tour</button>' +
      '<div class="gram-sec-label" style="margin-bottom:6px">Fun facts</div>' +
      '<div class="gp-facts">' + gp.funFacts.map(function(f){ return '<div class="gp-fact">' + esc(f) + '</div>'; }).join('') + '</div>';
    if (!state.gpRevealed) {
      html += '<div class="gp-guess-row"><input class="gp-input" placeholder="What place is this?" oninput="window.__gpGuess(this.value)" value="' + esc(state.gpGuess) + '" /><button class="play-btn" onclick="window.__gpSubmit()">Guess!</button></div>';
    } else {
      html += '<div class="gp-result ' + (state.gpWon ? 'cg-end win' : 'cg-end lose') + '">' +
        '<div style="font-size:40px">' + (state.gpWon ? '🎉' : '🤔') + '</div>' +
        '<div style="font-weight:900;font-size:17px;margin:6px 0">' + (state.gpWon ? 'Correct!' : 'The answer was...') + '</div>' +
        '<div style="font-size:20px;font-weight:900;color:var(--purple)">' + esc(gp.name) + '</div>' +
        '<p style="font-size:13px;color:var(--muted);margin-top:8px">📍 ' + esc(gp.country) + ' • 🗣️ ' + esc(gp.language) + '</p>' +
        (state.gpWon ? '' : '<button class="grad-btn" style="margin-top:12px;width:auto;padding:10px 24px" onclick="window.__gpAgain()">Try Another</button>') +
        '</div>';
    }
    return html;
  }

  function clueHtml(clue, words){
    var out = esc(clue);
    Object.keys(words || {}).forEach(function(w){
      var re = new RegExp('\\\\b' + w + '\\\\b', 'gi');
      out = out.replace(re, '<span class="gp-word" data-w="' + esc(w) + '">' + w + '</span>');
    });
    return out;
  }

  function renderLeaderboard(){
    var li = levelInfo();
    var rows = [
      { name: LEARNER_NAME, avatar: AVATAR, xp: state.xp, me: true },
      { name: 'Amira K.', avatar: '🦊', xp: Math.max(0, state.xp - 120) },
      { name: 'Liam O.', avatar: '🐼', xp: Math.max(0, state.xp - 260) },
      { name: 'Sofia R.', avatar: '🦉', xp: Math.max(0, state.xp - 400) },
      { name: 'Noah B.', avatar: '🐸', xp: Math.max(0, state.xp - 610) }
    ];
    rows.sort(function(a, b){ return b.xp - a.xp; });
    var max = rows[0] ? Math.max(100, rows[0].xp) : 100;
    var html = '<div class="section-head"><span class="sh-icon">🏆</span><h2>Leaderboard</h2><p>You have ' + state.xp + ' XP • Level ' + state.level + ' ' + li.cur.badge + ' ' + li.cur.name + '</p></div>' +
      rows.map(function(r, i){
        var rankCls = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
        return '<div class="lb-card"><div class="lb-rank ' + rankCls + '">' + (i + 1) + '</div>' +
          '<div class="lb-avatar">' + r.avatar + '</div>' +
          '<div style="flex:1;min-width:120px"><div class="lb-name">' + esc(r.name) + (r.me ? ' <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(139,92,246,.2);color:#c4b5fd">You</span>' : '') + '</div>' +
          '<div class="lb-xp">' + r.xp + ' XP</div></div>' +
          '<div class="lb-bar"><div style="width:' + Math.round((r.xp / max) * 100) + '%"></div></div></div>';
      }).join('') +
      '<div class="card card-pad" style="margin-top:14px"><div class="gram-sec-label" style="margin-bottom:6px">Your achievements</div><div class="gp-facts">' +
      ACHIEVEMENTS.map(function(a){
        var on = state.achievements.indexOf(a.id) >= 0;
        return '<div class="gp-fact" style="' + (on ? '' : 'opacity:.35') + '">' + a.emoji + ' ' + esc(a.name) + '</div>';
      }).join('') + '</div></div>';
    return html;
  }

  /* ---------- bind dynamic (tooltips etc) ---------- */
  function bindDynamic(){
    var words = $$('.gp-word');
    words.forEach(function(w){
      w.onmouseover = function(e){
        var tip = document.getElementById('gp-tip');
        if (!tip) {
          tip = document.createElement('div');
          tip.id = 'gp-tip';
          tip.className = 'gp-tip';
          document.body.appendChild(tip);
        }
        var def = '';
        var gw = DATA && DATA.guessThePlace && DATA.guessThePlace.tooltipWords;
        if (gw) def = gw[w.getAttribute('data-w')] || '';
        tip.textContent = w.getAttribute('data-w') + ': ' + def;
        tip.style.left = (e.pageX + 12) + 'px';
        tip.style.top = (e.pageY + 12) + 'px';
        tip.style.display = 'block';
      };
      w.onmouseout = function(){
        var tip = document.getElementById('gp-tip');
        if (tip) tip.style.display = 'none';
      };
    });
    var ta = $('#dict-input');
    if (ta) ta.value = state.dictInput;
  }

  /* ---------- actions ---------- */
  window.__setModule = function(m){
    playClick();
    stopSpeech();
    state.module = m;
    var intros = DATA && DATA.catFeedback && DATA.catFeedback.moduleIntro;
    if (intros && intros[m]) catMessage(intros[m], 'idle');
    if (m === 'leaderboard') catMessage('Check out how you rank against other learners! Keep learning to climb higher!', 'idle');
    render();
  };
  window.__goStep = function(s){
    if (!stepUnlocked(s)) return;
    playClick();
    state.currentStep = s;
    render();
  };
  window.__completeStep = function(s){
    if (state.completedSteps.indexOf(s) < 0) {
      state.completedSteps.push(s);
      addXP(15);
    }
    if (s < 10) state.currentStep = s + 1;
    var msgs = {
      1: 'Great job on the warm-up! Now let\\'s explore some important vocabulary.',
      2: 'Fantastic! You now know 22 key terms. Let\\'s listen to them in action.',
      3: 'Wonderful listening! Now read about the topic at your own level.',
      4: 'You read the article! Now let\\'s try speaking it aloud.',
      5: 'Amazing speaking practice! Time to analyse the grammar.',
      6: 'Excellent grammar work! Now listen to a radio drama.',
      7: 'Brilliant! Now test how well you can hear and write the sentences.',
      8: 'Great dictation! Now let\\'s discuss the topic critically.',
      9: 'Wonderful analysis! Time for the final quiz. Give it your best!'
    };
    if (msgs[s]) catMessage(msgs[s], 'correct');
    render();
  };
  window.__finishLesson = function(){
    if (state.completedSteps.indexOf(10) < 0) {
      state.completedSteps.push(10);
      addXP(15);
    }
    var score = state.quizAnswers.filter(Boolean).length;
    state.quizScores.push({ date: new Date().toISOString(), score: score, total: (DATA.quiz || []).length });
    if (state.quizSecret && !state.secretCode) {
      state.secretCode = DATA.secretCode || null;
      addXP(50);
    }
    if (state.quizSecret) {
      catMessage('Incredible! You scored ' + score + '/' + (DATA.quiz || []).length + ' and unlocked the secret code! You\\'re a true language master!', 'excited');
      playUnlock();
    } else {
      catMessage('You scored ' + score + '/' + (DATA.quiz || []).length + '. Good effort! Keep studying and try again!', 'idle');
    }
    saveStats();
    render();
  };
  window.__toggleTheme = function(){
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light', state.theme === 'light');
    try { localStorage.setItem('dl_theme', state.theme); } catch(e) {}
    render();
  };
  window.__toggleMute = function(){
    isMuted = !isMuted;
    if (isMuted) stopSpeech();
    render();
  };
  window.__toggleCat = function(){ state.catOpen = !state.catOpen; if (!state.catOpen) state.catVoicesOpen = false; renderCat(); };
  window.__toggleCatVoices = function(){ state.catVoicesOpen = !state.catVoicesOpen; renderCat(); };
  window.__setCatVoice = function(name){
    catVoiceName = name;
    saveVoicePrefs();
    state.catVoicesOpen = false;
    speak('Hello! This is how I sound. I will be your guide throughout the lesson!', { rate: 0.95, pitch: 1.1 });
    renderCat();
  };
  window.__setVoice = function(prefix, key, value){
    if (prefix === 'speaker') speakerVoices[key] = value || null;
    else characterVoices[key] = value || null;
    saveVoicePrefs();
    render();
  };
  // Play one transcript line with that character's assigned voice.
  window.__speakLine = function(prefix, key, lineIdx){
    if (isMuted) return;
    var lines = prefix === 'speaker' ? DATA.dialogue.lines : DATA.radioDrama.lines;
    var line = lines[lineIdx];
    if (!line) return;
    var voice = prefix === 'speaker' ? pickVoice(speakerVoices[key]) : pickVoice(characterVoices[key]);
    var voiceEls = $$('.msg-play');
    voiceEls.forEach(function(b, i){
      var on = b.classList.contains('is-playing');
      b.classList.toggle('is-playing', false);
      b.textContent = '▶';
    });
    speak(line.text, {
      rate: prefix === 'speaker' ? 0.88 : (key === 'Narrator' ? 0.8 : 0.88),
      voice: voice,
      onEnd: function(){ $$('.msg-play').forEach(function(b){ b.classList.remove('is-playing'); b.textContent = '▶'; }); }
    });
  };
  window.__skipVoices = function(which){
    if (which === 'dialogue') state.dialogueVoicesOpen = false;
    else state.dramaVoicesOpen = false;
    render();
  };
  window.__openVoiceSetup = function(which){
    if (which === 'dialogue') state.dialogueVoicesOpen = true;
    else state.dramaVoicesOpen = true;
    render();
  };
  window.__speak = function(t){ speak(t); };

  /* ---------- print / export PDF ---------- */
  function stripTags(h){ return String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
  function worksheetSection(title, icon, bodyHtml){
    return '<section style="page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 16px">' +
      '<h2 style="font-size:17px;font-weight:800;color:#7c3aed;margin:0 0 10px">' + icon + ' ' + title + '</h2>' + bodyHtml + '</section>';
  }
  window.__printLesson = function(){
    if (!DATA) return;
    var escH = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    var parts = [];

    // 1. Header
    parts.push('<div style="text-align:center;padding:8px 0 18px;border-bottom:3px solid #7c3aed;margin-bottom:18px">' +
      '<h1 style="font-size:24px;font-weight:900;color:#111827;margin:0 0 4px">' + escH(DATA.topic) + '</h1>' +
      '<p style="font-size:13px;color:#6b7280;margin:0">Level ' + escH(DATA.level) + ' · ' + escH(DATA.theme) + ' · Study Worksheet — ' + new Date().toLocaleDateString() + '</p></div>');

    // 2. Warm-up
    parts.push(worksheetSection('Warm-Up','🔥', (DATA.warmup||[]).map(function(w,i){
      return '<div style="margin-bottom:10px"><p style="font-weight:700;font-size:14px;margin:0 0 4px">' + (i+1) + '. ' + escH(w.emoji) + ' ' + escH(w.question) + '</p>' +
        '<div style="font-size:13px;color:#374151;padding-left:14px;border-left:3px solid #e5e7eb">' + escH(w.answer) + '</div></div>';
    }).join('') || '<p style="color:#9ca3af">No warm-up questions.</p>'));

    // 3. Keywords
    parts.push(worksheetSection('Keywords & Phrases','📖', '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:#f3f4f6"><th style="text-align:left;padding:6px 8px;border:1px solid #e5e7eb">Term</th><th style="text-align:left;padding:6px 8px;border:1px solid #e5e7eb">Definition</th><th style="text-align:left;padding:6px 8px;border:1px solid #e5e7eb">Example</th></tr></thead><tbody>' +
      (DATA.keywords||[]).map(function(k){ return '<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;font-weight:700">' + escH(k.term) + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb">' + escH(k.definition) + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-style:italic">' + escH(k.example) + '</td></tr>'; }).join('') +
      '</tbody></table>'));

    // 4. Dialogue
    parts.push(worksheetSection('Listening — Dialogue','🎧', (DATA.dialogue&&DATA.dialogue.lines||[]).map(function(l){
      return '<p style="font-size:13px;margin:0 0 6px"><b>' + escH(l.speaker) + ':</b> ' + escH(l.text) + '</p>';
    }).join('') || '<p style="color:#9ca3af">No dialogue.</p>'));

    // 5. Reading (all three levels, titles only + first paragraph)
    var r = DATA.reading || {};
    var readingHtml = ['basic','intermediate','advanced'].map(function(lvl){
      var a = r[lvl]; if (!a) return '';
      return '<div style="margin-bottom:12px"><p style="font-weight:800;font-size:14px;color:#4f46e5;margin:0 0 4px">' + escH(a.title) + '</p>' +
        '<p style="font-size:13px;color:#374151;margin:0;line-height:1.6">' + escH(stripTags(a.content).slice(0, 400)) + (stripTags(a.content).length>400?'…':'') + '</p></div>';
    }).join('');
    parts.push(worksheetSection('Reading','📰', readingHtml || '<p style="color:#9ca3af">No reading.</p>'));

    // 6. Grammar
    parts.push(worksheetSection('Language Analysis','🔬', (DATA.grammarSlides||[]).map(function(g){
      return '<div style="margin-bottom:10px"><p style="font-weight:700;font-size:13px;margin:0 0 2px"><span style="color:#7c3aed">' + escH(g.level) + '</span> · ' + escH(g.structure) + '</p>' +
        '<p style="font-size:13px;margin:0 0 2px">' + escH(g.meaning) + '</p>' +
        '<p style="font-size:12px;color:#6b7280;margin:0">"' + escH(g.example) + '"</p></div>';
    }).join('') || '<p style="color:#9ca3af">No grammar slides.</p>'));

    // 7. Radio drama
    parts.push(worksheetSection('Radio Drama','🎭', (DATA.radioDrama&&DATA.radioDrama.lines||[]).map(function(l){
      return '<p style="font-size:13px;margin:0 0 6px"><b>' + escH(l.character) + ':</b> ' + escH(l.text) + '</p>';
    }).join('') || '<p style="color:#9ca3af">No drama.</p>'));

    // 8. Dictation
    parts.push(worksheetSection('Dictation','✍️', (DATA.dictation&&DATA.dictation.sentences||[]).map(function(s,i){
      return '<p style="font-size:13px;margin:0 0 6px"><b>' + (i+1) + '.</b> <span style="border-bottom:1px solid #9ca3af;display:inline-block;min-width:260px"></span></p>' +
        '<p style="font-size:12px;color:#9ca3af;margin:0 0 12px">(Answer: ' + escH(s) + ')</p>';
    }).join('') || '<p style="color:#9ca3af">No dictation.</p>'));

    // 9. Discussion
    var dsc = DATA.discussion||{};
    parts.push(worksheetSection('Discussion','💬', '<p style="font-size:13px;font-weight:600;margin:0 0 8px">' + escH(dsc.post) + '</p>' +
      '<p style="font-size:12px;color:#6b7280;margin:0 0 6px">Which response is most insightful? Write why below.</p>' +
      (dsc.comments||[]).map(function(c){ return '<div style="font-size:13px;margin:0 0 4px;padding-left:12px;border-left:3px solid #e5e7eb"><b>' + escH(c.character) + ':</b> ' + escH(c.text) + '</div>'; }).join('')));

    // 10. Quiz
    parts.push(worksheetSection('Final Quiz','🧠', (DATA.quiz||[]).map(function(q,i){
      return '<div style="margin-bottom:12px;page-break-inside:avoid"><p style="font-weight:700;font-size:13px;margin:0 0 6px">' + (i+1) + '. ' + escH(q.question) + '</p>' +
        (q.options||[]).map(function(o,oi){ return '<p style="font-size:13px;margin:0 0 2px;padding-left:12px">' + String.fromCharCode(65+oi) + '. <span style="border-bottom:1px solid #9ca3af;display:inline-block;min-width:200px">' + escH(o) + '</span></p>'; }).join('') +
        '</div>';
    }).join('') || '<p style="color:#9ca3af">No quiz.</p>'));

    // Secret code note
    parts.push('<div style="text-align:center;padding:14px;border:2px dashed #7c3aed;border-radius:12px;font-size:13px;color:#6b7280">Secret code for this lesson: <b style="color:#111827;letter-spacing:.05em">' + escH(DATA.secretCode||'—') + '</b></div>');

    var doc = '<!doctype html><html><head><meta charset="utf-8"><title>' + escH(DATA.topic) + ' — Worksheet</title>' +
      '<style>@media print{body{padding:20px}} *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:820px;margin:0 auto;padding:24px} section{break-inside:avoid-page}</style>' +
      '</head><body>' + parts.join('') +
      '<script>window.onload=function(){setTimeout(function(){window.print();},250);};</'+'script>' +
      '</body></html>';
    var win = window.open('', '_blank');
    if (!win) { alert('Popup blocked. Allow popups to print the worksheet.'); return; }
    win.document.open();
    win.document.write(doc);
    win.document.close();
  };

  // warmup
  window.__warmCard = function(i){ playClick(); state.warmCard = i; render(); };
  window.__warmReveal = function(i){
    playClick();
    if (state.warmRevealed.indexOf(i) < 0) state.warmRevealed.push(i);
    speak(DATA.warmup[i].answer);
    render();
  };

  // keywords
  window.__kwMode = function(m){ playClick(); state.kwMode = m; render(); };
  window.__kwCard = function(i){ playClick(); state.kwCard = i; state.kwFlipped = false; render(); };
  window.__kwFlip = function(){ state.kwFlipped = !state.kwFlipped; render(); };
  window.__kwNav = function(d){
    var filtered = filteredKws();
    var next = Math.max(0, Math.min(filtered.length - 1, state.kwCard + d));
    state.kwCard = next; state.kwFlipped = false; render();
  };
  window.__kwMaster = function(gi){
    playSuccess();
    if (state.mastered.indexOf(gi) < 0) state.mastered.push(gi);
    var filtered = filteredKws();
    if (state.kwCard < filtered.length - 1) { state.kwCard += 1; state.kwFlipped = false; }
    render();
  };
  window.__kwToggle = function(gi){
    var i = state.mastered.indexOf(gi);
    if (i >= 0) state.mastered.splice(i, 1); else state.mastered.push(gi);
    render();
  };
  window.__kwSpeak = function(gi){
    var k = DATA.keywords[gi];
    if (k) speak(k.term + '. ' + k.definition);
  };
  window.__kwSearch = function(v){ state.kwSearch = v; state.kwCard = 0; render(); };
  window.__kwFilter = function(l){ state.kwFilter = l; state.kwCard = 0; render(); };
  function filteredKws(){
    var kws = DATA.keywords || [];
    return kws.filter(function(k){
      var lvl = state.kwFilter === 'All' || k.level === state.kwFilter;
      var q = state.kwSearch.toLowerCase();
      var s = !q || k.term.toLowerCase().indexOf(q) >= 0 || k.definition.toLowerCase().indexOf(q) >= 0;
      return lvl && s;
    });
  }

  // listen
  window.__playDialogue = function(){
    if (isMuted) return;
    state.dialogueStop = false;
    state.dialoguePlaying = true;
    state.dialogueVoicesOpen = false;
    state.dialogueLine = 0;
    render();
    var lines = DATA.dialogue.lines;
    var i = 0;
    (function playNext(){
      if (state.dialogueStop || i >= lines.length) {
        state.dialoguePlaying = false;
        state.dialogueLine = -1;
        state.dialoguePlayed = true;
        render();
        return;
      }
      var line = lines[i];
      state.dialogueLine = i;
      render();
      var voice = pickVoice(speakerVoices[line.speaker]);
      var isMaya = line.speaker === 'Maya';
      speak(line.text, {
        rate: 0.88,
        pitch: voice ? 1.0 : (isMaya ? 1.2 : 0.85),
        voice: voice,
        onEnd: function(){ setTimeout(playNext, 400); }
      });
      i++;
    })();
  };
  window.__stopDialogue = function(){
    state.dialogueStop = true;
    stopSpeech();
    state.dialoguePlaying = false;
    state.dialogueLine = -1;
    render();
  };
  window.__readAloud = function(){
    if (isMuted) return;
    state.readPlaying = true;
    render();
    var art = DATA.reading[state.readLevel];
    var plain = art.content.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
    speak(plain, { rate: 0.85, onEnd: function(){ state.readPlaying = false; if (!document.hidden) render(); } });
  };
  window.__stopRead = function(){ stopSpeech(); state.readPlaying = false; render(); };
  window.__setReadLevel = function(l){ stopSpeech(); state.readLevel = l; state.readPlaying = false; render(); };

  // karaoke
  window.__karaStart = function(){
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      state.karaErr = 'Speech recognition is not supported in your browser. Please use Chrome.';
      render();
      return;
    }
    state.karaErr = '';
    var rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    state.karaRec = rec;
    state.karaListening = true;
    state.karaStart = Date.now();
    if (state.karaWords.length) {
      state.karaWords[0] = { ...state.karaWords[0], status: 'current' };
    }
    rec.onresult = function(ev){
      var finalT = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalT += ev.results[i][0].transcript;
      }
      if (finalT) processKara(finalT);
    };
    rec.onerror = function(){ state.karaListening = false; render(); };
    rec.onend = function(){ if (state.karaListening) { try { rec.start(); } catch(e) {} } };
    try { rec.start(); } catch(e) {}
    render();
  };
  function processKara(transcript){
    var spoken = transcript.trim().toLowerCase().split(/\\s+/).map(function(w){ return w.toLowerCase().replace(/[^a-z]/g, ''); }).filter(Boolean);
    if (!spoken.length) return;
    var latest = spoken[spoken.length - 1];
    var idx = state.karaIdx;
    var found = false;
    for (var i = idx; i < Math.min(idx + 5, state.karaWords.length); i++) {
      var w = state.karaWords[i].word.toLowerCase().replace(/[^a-z]/g, '');
      if (w === latest && state.karaWords[i].status === 'pending') {
        state.karaWords[i] = { ...state.karaWords[i], status: 'correct' };
        state.karaIdx = i + 1;
        if (state.karaStart) {
          var mins = (Date.now() - state.karaStart) / 60000;
          var count = state.karaWords.filter(function(x){ return x.status === 'correct'; }).length;
          if (mins > 0) state.karaWpm = Math.round(count / mins);
        }
        if (i + 1 < state.karaWords.length) state.karaWords[i + 1] = { ...state.karaWords[i + 1], status: 'current' };
        else state.karaDone = true;
        found = true;
        break;
      }
    }
    if (found) render();
  }
  window.__karaStop = function(){
    if (state.karaRec) try { state.karaRec.stop(); } catch(e) {}
    state.karaListening = false;
    render();
  };
  window.__karaReset = function(){
    if (state.karaRec) try { state.karaRec.stop(); } catch(e) {}
    state.karaListening = false;
    state.karaWords = [];
    state.karaIdx = 0;
    state.karaWpm = 0;
    state.karaStart = null;
    state.karaDone = false;
    render();
  };

  // grammar
  window.__gramToggle = function(i){
    playClick();
    if (state.gramOpen === i) state.gramOpen = null;
    else {
      state.gramOpen = i;
      if (state.gramViewed.indexOf(i) < 0) state.gramViewed.push(i);
      var g = DATA.grammarSlides[i];
      speak(g.structure + '. ' + g.meaning + '. Example: ' + g.example);
    }
    render();
  };
  window.__gramSpeak = function(i){
    var g = DATA.grammarSlides[i];
    speak(g.structure + '. ' + g.meaning + '. Example: ' + g.example);
  };

  // drama
  window.__playDrama = function(){
    if (isMuted) return;
    state.dramaStop = false;
    state.dramaPlaying = true;
    state.dramaVoicesOpen = false;
    state.dramaLine = 0;
    render();
    var lines = DATA.radioDrama.lines;
    var i = 0;
    (function playNext(){
      if (state.dramaStop || i >= lines.length) {
        state.dramaPlaying = false;
        state.dramaLine = -1;
        state.dramaPlayed = true;
        render();
        if (!state.dramaStop && (DATA.radioDrama.comprehensionQuestions || []).length) {
          state.dramaQuizOpen = true;
          render();
        }
        return;
      }
      var line = lines[i];
      state.dramaLine = i;
      render();
      var voice = pickVoice(characterVoices[line.character]);
      speak(line.text, {
        pitch: voice ? 1.0 : (line.character === 'Narrator' ? 1.0 : line.character.indexOf('Mom') >= 0 ? 1.15 : line.character.indexOf('Dad') >= 0 ? 0.85 : 1.1),
        rate: line.character === 'Narrator' ? 0.8 : 0.88,
        voice: voice,
        onEnd: function(){ setTimeout(playNext, 500); }
      });
      i++;
    })();
  };
  window.__stopDrama = function(){
    state.dramaStop = true;
    stopSpeech();
    state.dramaPlaying = false;
    render();
  };
  window.__dramaContinue = function(){
    if (state.dramaPlayed && (DATA.radioDrama.comprehensionQuestions || []).length) {
      state.dramaQuizOpen = true;
      state.dramaAnswers = (DATA.radioDrama.comprehensionQuestions || []).map(function(){ return null; });
      render();
    } else {
      window.__completeStep(7);
    }
  };
  window.__dramaAnswer = function(qi, oi){
    if (state.dramaSubmitted) return;
    state.dramaAnswers[qi] = oi;
    render();
  };
  window.__dramaSubmit = function(){
    state.dramaSubmitted = true;
    var qs = DATA.radioDrama.comprehensionQuestions || [];
    var score = state.dramaAnswers.filter(function(a, i){ return a === qs[i].correct; }).length;
    if (score >= qs.length / 2) { playSuccess(); catMessage(catFeedback('correct'), 'correct'); }
    else { playError(); catMessage(catFeedback('incorrect'), 'incorrect'); }
    render();
  };
  window.__dramaReplay = function(){
    state.dramaQuizOpen = false;
    state.dramaSubmitted = false;
    state.dramaAnswers = (DATA.radioDrama.comprehensionQuestions || []).map(function(){ return null; });
    state.dramaPlayed = false;
    state.dramaVoicesOpen = true;
    render();
  };

  // dictation
  window.__dictInput = function(v){ state.dictInput = v; };
  window.__dictPlay = function(){
    if (isMuted) return;
    var s = DATA.dictation.sentences[state.dictIdx];
    speak(s, { rate: 0.7 });
  };
  window.__dictSubmit = function(){
    if (!state.dictInput.trim()) return;
    var original = DATA.dictation.sentences[state.dictIdx];
    var ow = original.toLowerCase().replace(/[.,!?;:]/g, '').split(/\\s+/);
    var tw = state.dictInput.toLowerCase().replace(/[.,!?;:]/g, '').split(/\\s+/);
    var results = ow.map(function(word, i){
      return { word: word, userWord: tw[i] || '', correct: word === (tw[i] || '').toLowerCase() };
    });
    var acc = results.length ? Math.round((results.filter(function(r){ return r.correct; }).length / results.length) * 100) : 0;
    state.dictResults = results;
    state.dictScores.push(acc);
    state.dictSubmitted = true;
    state.totalAttempts += 1;
    if (acc >= 70) { playSuccess(); state.totalCorrect += 1; }
    else { playError(); catMessage(catFeedback('incorrect'), 'incorrect'); }
    saveStats();
    render();
  };
  window.__dictNext = function(){
    state.dictIdx += 1;
    state.dictInput = '';
    state.dictSubmitted = false;
    state.dictResults = [];
    render();
    setTimeout(function(){ window.__dictPlay(); }, 800);
  };

  // discussion
  window.__discSelect = function(i){
    if (state.discRevealed) return;
    playClick();
    state.discSelected = i;
    speak(DATA.discussion.comments[i].text);
    render();
  };
  window.__discSubmit = function(){
    if (state.discSelected === null) return;
    state.discRevealed = true;
    var c = DATA.discussion.comments[state.discSelected];
    if (c.isCorrect) { playSuccess(); catMessage(catFeedback('correct'), 'correct'); }
    else { playError(); catMessage(catFeedback('incorrect'), 'incorrect'); }
    speak(c.feedback);
    render();
  };

  // quiz
  window.__quizAnswer = function(oi){
    if (state.quizAnswered) return;
    state.quizSelected = oi;
    state.quizAnswered = true;
    var q = DATA.quiz[state.quizCur];
    var ok = oi === q.correct;
    state.quizAnswers.push(ok);
    state.totalAttempts += 1;
    if (ok) { playSuccess(); state.totalCorrect += 1; catMessage(catFeedback('correct'), 'correct'); speak(q.explanation); }
    else { playError(); catMessage(catFeedback('incorrect'), 'incorrect'); speak('Incorrect. ' + q.explanation); }
    saveStats();
    render();
  };
  window.__quizNext = function(){
    if (state.quizCur < DATA.quiz.length - 1) {
      state.quizCur += 1;
      state.quizSelected = null;
      state.quizAnswered = false;
    } else {
      state.quizResults = true;
      var pct = Math.round((state.quizAnswers.filter(Boolean).length / DATA.quiz.length) * 100);
      if (pct >= 80) {
        setTimeout(function(){
          state.quizSecret = true;
          playUnlock();
          speak('Congratulations! You scored ' + pct + '% and have unlocked the secret progress code: ' + DATA.secretCode);
          render();
        }, 1000);
      }
    }
    render();
  };

  // conversation game
  window.__cgChoose = function(i){
    playClick();
    state.cgPicked = i;
    var ch = DATA.conversationGame.nodes[state.cgNode].choices[i];
    if (ch) catMessage(ch.catNote, 'thinking');
    render();
  };
  window.__cgAdvance = function(){
    var node = DATA.conversationGame.nodes[state.cgNode];
    var ch = node.choices[state.cgPicked];
    state.cgPicked = null;
    if (ch) {
      state.cgNode = ch.next;
      state.cgHistory.push(ch.next);
      var nxt = DATA.conversationGame.nodes[ch.next];
      if (nxt && nxt.isEnd) {
        if (nxt.isWin && state.completedModules.indexOf('conversation') < 0) {
          state.completedModules.push('conversation');
          addXP(30);
        }
        if (nxt.isWin) catMessage('Congratulations! You navigated the interview perfectly!', 'excited');
        else catMessage('Good try! Read the feedback and try again.', 'idle');
      }
    }
    render();
  };
  window.__cgReset = function(){
    state.cgNode = 'start';
    state.cgPicked = null;
    state.cgHistory = [];
    render();
  };

  // guess the place
  window.__gpHint = function(){
    playClick();
    state.gpHintShown += 1;
    render();
  };
  window.__gpPhrase = function(i){
    var p = DATA.guessThePlace.survivalPhrases[i];
    speak(p.phrase + '. ' + p.translation);
  };
  window.__gpTour = function(){
    if (isMuted) return;
    var lines = DATA.guessThePlace.audioTour.lines;
    var i = 0;
    (function playNext(){
      if (i >= lines.length) return;
      var l = lines[i];
      speak(l.text, { rate: 0.9, onEnd: function(){ setTimeout(playNext, 350); } });
      i++;
    })();
  };
  window.__gpGuess = function(v){ state.gpGuess = v; };
  window.__gpSubmit = function(){
    var guess = state.gpGuess.toLowerCase().trim();
    var name = (DATA.guessThePlace.name || '').toLowerCase();
    var city = name.split(',')[0].trim();
    var won = guess.indexOf(city) >= 0 || city.indexOf(guess) >= 0;
    state.gpRevealed = true;
    state.gpWon = won;
    if (won) {
      playSuccess();
      if (state.completedModules.indexOf('place') < 0) {
        state.completedModules.push('place');
        addXP(30);
      }
      catMessage('Purr-fect! It\\'s ' + DATA.guessThePlace.name + '! You\\'re a true world explorer!', 'excited');
    } else {
      playError();
      catMessage('Close! But not quite. Read the clues again and try!', 'thinking');
    }
    render();
  };
  window.__gpAgain = function(){
    state.gpRevealed = false;
    state.gpWon = false;
    state.gpGuess = '';
    render();
  };

  /* ---------- init ---------- */
  var savedTheme = null;
  try { savedTheme = localStorage.getItem('dl_theme'); } catch(e) {}
  if (savedTheme === 'light') {
    state.theme = 'light';
    document.body.classList.add('light');
  }
  loadStats();
  // Preserve any completion records the Daily_Lesson app left behind
  if (state.completedSteps.length) mirrorProgress();

  // initial cat welcome (only once per file open to avoid noise)
  try {
    var introKey = 'daily_intro_' + FILE_NAME;
    if (!localStorage.getItem(introKey)) {
      localStorage.setItem(introKey, '1');
      setTimeout(function(){ catMessage(state.message, 'idle'); }, 600);
    }
  } catch(e) {
    setTimeout(function(){ catMessage(state.message, 'idle'); }, 600);
  }

  render();
  // Load voices async so select options populate
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged) {
    speechSynthesis.onvoiceschanged = function(){ if (!document.hidden) render(); };
  }
})();
`;