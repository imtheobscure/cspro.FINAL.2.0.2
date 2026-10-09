/**
 * Gamified Challenge — standalone engine (faithful vanilla-JS port of the
 * Gamified-Challnege React app's GameHub + DayView, minus splash/welcome/
 * theme-select/lesson-creator screens — the lesson boots DIRECTLY into the
 * game hub). All interactions, sounds, fear meter, jumpscares and the
 * localStorage persistence behave like the React version.
 */
export const GAMIFIED_HTML_SCRIPT = `
(function(){
  'use strict';
  var LESSON = window.__GAMIFIED__ || {};
  var THEME = LESSON.themeData || null;
  var LEARNER_NAME = LESSON.learnerName || 'Learner';
  var FILE_NAME = LESSON.fileName || 'gamified-challenge';
  var TITLE = (THEME && THEME.welcomeTitle) || 'Gamified Challenge';

  var LS_KEY = 'tutorly-gamified-' + FILE_NAME;
  var PROG_KEY = 'tutorly-gamified-progress-' + LEARNER_NAME;

  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var state = {
    points: 0, fearMeter: 0, completedDays: [], unlockedDays: [0], badges: [],
    cluesCollected: [], mysteryBoxes: 0, currentDay: 0,
    screen: 'game', tab: 'lesson',
    showBlood: false, isShaking: false, showJumpScare: false
  };
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved) for (var k in saved) if (k !== 'screen' && k !== 'tab' && k !== 'currentDay') state[k] = saved[k];
  } catch (e) {}

  function save(){
    try {
      var c = {};
      ['points','fearMeter','completedDays','unlockedDays','badges','cluesCollected','mysteryBoxes'].forEach(function(k){ c[k] = state[k]; });
      localStorage.setItem(LS_KEY, JSON.stringify(c));
    } catch (e) {}
    mirrorProgress();
  }
  function mirrorProgress(){
    try {
      var list = [];
      try { list = JSON.parse(localStorage.getItem(PROG_KEY) || '[]'); } catch (e) { list = []; }
      var rec = {
        fileName: FILE_NAME, title: TITLE, points: state.points, fearMeter: state.fearMeter,
        completedDays: state.completedDays.slice(), unlockedDays: state.unlockedDays.slice(),
        badges: state.badges.slice(), cluesCollected: state.cluesCollected.slice(),
        mysteryBoxes: state.mysteryBoxes, updatedAt: new Date().toISOString()
      };
      var others = list.filter(function(r){ return r.fileName !== rec.fileName; });
      others.unshift(rec);
      localStorage.setItem(PROG_KEY, JSON.stringify(others.slice(0, 20)));
    } catch (e) {}
  }

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function lvl(){ return Math.floor(state.points / 500) + 1; }
  function fearColor(){ return state.fearMeter < 33 ? '#00ff88' : state.fearMeter < 66 ? '#ffaa00' : '#ff0000'; }

  /* ── audio (WebAudio — all synthesized so it works offline) ── */
  var AC = null;
  function ctx(){ try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
  function noiseBuffer(dur){ var c = ctx(), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  function playScream(){ var c = ctx(); if (!c) return; try { var dur = 1.5, n = c.sampleRate * dur, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) { var t = i / c.sampleRate; var env = Math.exp(-t * 2) * (1 + 0.5 * Math.sin(t * 80)); var noise = Math.random() * 2 - 1; var tone = Math.sin(t * 800 * (1 + Math.sin(t * 5) * 0.5)); var harm = Math.sin(t * 1200) * 0.3 + Math.sin(t * 400) * 0.5; d[i] = (noise * 0.3 + tone * 0.5 + harm * 0.2) * env * 0.7; } var s = c.createBufferSource(); s.buffer = b; var ws = c.createWaveShaper(); var curve = new Float32Array(256); for (var j = 0; j < 256; j++) { var x = (j * 2) / 256 - 1; curve[j] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x)); } ws.curve = curve; s.connect(ws); ws.connect(c.destination); s.start(); } catch (e) {} }
  function playBreathing(){ var c = ctx(); if (!c) return; try { var dur = 3, n = c.sampleRate * dur, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) { var t = i / c.sampleRate; var bc = Math.sin(t * Math.PI * 1.5); var noise = (Math.random() * 2 - 1) * 0.3; var f = noise * Math.abs(bc); var rumble = Math.sin(t * 60) * 0.15 * Math.abs(bc); d[i] = (f + rumble) * 0.5; } var s = c.createBufferSource(); s.buffer = b; var fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 600; s.connect(fl); fl.connect(c.destination); s.start(); } catch (e) {} }
  function playHeartbeat(bpm){ var c = ctx(); if (!c) return; try { bpm = bpm || 90; var iv = 60 / bpm, dur = iv * 6, n = c.sampleRate * dur, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var beat = 0; beat < 6; beat++) { var bs = beat * iv * c.sampleRate; for (var i = 0; i < c.sampleRate * 0.15; i++) { var idx = Math.floor(bs + i); if (idx < n) { var t = i / c.sampleRate; d[idx] = Math.sin(t * 200) * Math.exp(-t * 30) * 0.6; } } var s2 = bs + c.sampleRate * 0.2; for (var k = 0; k < c.sampleRate * 0.1; k++) { var idx2 = Math.floor(s2 + k); if (idx2 < n) { var t2 = k / c.sampleRate; d[idx2] = Math.sin(t2 * 250) * Math.exp(-t2 * 40) * 0.4; } } } var s = c.createBufferSource(); s.buffer = b; var fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 150; var g = c.createGain(); g.gain.value = 1.5; s.connect(fl); fl.connect(g); g.connect(c.destination); s.start(); } catch (e) {} }
  function playHorrorDrone(dur){ var c = ctx(); if (!c) return; try { var o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), g = c.createGain(); o1.type = 'sawtooth'; o1.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 57; o3.type = 'triangle'; o3.frequency.value = 110; g.gain.value = 0; g.gain.linearRampToValueAtTime(0.15, c.currentTime + 1); g.gain.linearRampToValueAtTime(0, c.currentTime + (dur || 5)); o1.connect(g); o2.connect(g); o3.connect(g); g.connect(c.destination); o1.start(); o2.start(); o3.start(); o1.stop(c.currentTime + (dur || 5)); o2.stop(c.currentTime + (dur || 5)); o3.stop(c.currentTime + (dur || 5)); } catch (e) {} }
  function playSuccess(){ var c = ctx(); if (!c) return; try { [523, 659, 784, 1047].forEach(function(f, i){ var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.3; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.15 + 0.5); o.connect(g); g.connect(c.destination); o.start(c.currentTime + i * 0.15); o.stop(c.currentTime + i * 0.15 + 0.5); }); } catch (e) {} }
  function playWrong(){ var c = ctx(); if (!c) return; try { var o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 150; g.gain.value = 0.25; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3); } catch (e) {} }
  function playUnlock(){ var c = ctx(); if (!c) return; try { [880, 1108, 1318].forEach(function(f, i){ var o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.value = 0.25; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.4); o.connect(g); g.connect(c.destination); o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 0.4); }); } catch (e) {} }
  function playJumpScare(){ var c = ctx(); if (!c) return; try { var dur = 0.7, n = c.sampleRate * dur, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) { var t = i / c.sampleRate; var env = Math.exp(-t * 4); var tone = Math.sin(t * 1000 * (1 + Math.sin(t * 40) * 0.4)); d[i] = (Math.random() * 2 - 1) * 0.2 + tone * 0.6 * env; } var s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(); } catch (e) {} }

  /* ── TTS ── */
  function getVoices(){ try { return window.speechSynthesis.getVoices() || []; } catch (e) { return []; } }
  function findVoice(uri){ var vs = getVoices(); if (!uri) return null; for (var i = 0; i < vs.length; i++) if (vs[i].voiceURI === uri || vs[i].name === uri) return vs[i]; return null; }
  function speakText(text, uri, rate, pitch){
    try {
      if (!window.speechSynthesis || !text) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var v = findVoice(uri || '');
      if (v) u.voice = v;
      u.rate = rate || 1; u.pitch = pitch || 1;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function stopSpeaking(){ try { window.speechSynthesis.cancel(); } catch (e) {} }
  function startSpeechRecognition(onResult, onEnd){
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    try {
      var r = new SR();
      r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
      r.onresult = function(e){ try { onResult(e.results[0][0].transcript); } catch (err) {} };
      r.onend = function(){ if (onEnd) onEnd(); };
      r.onerror = function(){ if (onEnd) onEnd(); };
      r.start();
      return function(){ try { r.stop(); } catch (e2) {} };
    } catch (e) { return null; }
  }

  function triggerBlood(){ state.showBlood = true; renderFx(); setTimeout(function(){ state.showBlood = false; renderFx(); }, 2000); }
  function triggerShake(){ state.isShaking = true; renderFx(); setTimeout(function(){ state.isShaking = false; renderFx(); }, 600); }
  function triggerJumpScare(){ state.showJumpScare = true; renderFx(); setTimeout(function(){ state.showJumpScare = false; renderFx(); }, 850); }
  function renderFx(){
    var blood = $('#fx-blood'), shake = $('#fx-shake'), js = $('#fx-jumpscare');
    if (blood) blood.style.display = state.showBlood ? 'block' : 'none';
    if (shake) shake.className = state.isShaking ? 'animate-shake' : '';
    if (js) js.style.display = state.showJumpScare ? 'flex' : 'none';
    var fb = $('#fx-fearborder');
    if (fb) fb.className = 'fear-border' + (state.fearMeter > 50 ? ' active' : '');
  }

  function dayByNum(n){ for (var i = 0; i < THEME.days.length; i++) if (THEME.days[i].dayNumber === n) return THEME.days[i]; return null; }
  function isUnlocked(dayNum){ if (dayNum === 0) return true; return state.unlockedDays.indexOf(dayNum) >= 0; }
  function isAvailableByDate(dayNum){
    if (!THEME.startDate) return true;
    var start = new Date(THEME.startDate), d = new Date(start);
    d.setDate(d.getDate() + dayNum);
    var today = new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0);
    return today >= d;
  }
  function canAccess(dayNum){ return isUnlocked(dayNum) && isAvailableByDate(dayNum); }

  var toastTimer = null;
  function toast(msg, bad){
    var t = $('#fx-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + (bad ? 'bad' : 'good');
    t.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.style.display = 'none'; }, 3000);
  }

  /* ── HUB (GameHub) ── */
  function hubHTML(){
    var h = '';
    h += '<div class="content">';
    h += '<div class="topbar"><div class="topbar-left">';
    h += '<button class="bigbtn" data-act="back">🔙 Back</button>';
    h += '<button class="bigbtn" data-act="settings">⚙️ Settings</button>';
    h += '<div class="learner-chip"><span class="photo">' + (LESSON.learnerPhoto && LESSON.learnerPhoto.length <= 4 ? LESSON.learnerPhoto : '😎') + '</span><span class="name">' + esc(LEARNER_NAME) + '</span></div>';
    h += '</div><div class="stats">';
    h += '<span class="stat yellow">⭐ ' + state.points + '</span>';
    h += '<span class="stat purple">🏅 ' + state.badges.length + '</span>';
    h += '<span class="stat blue">🎁 ' + state.mysteryBoxes + '</span>';
    h += '<span class="stat green">🔍 ' + state.cluesCollected.length + '</span>';
    h += '</div></div>';
    h += '<div class="theme-title"><h1>' + esc(THEME.welcomeTitle) + '</h1><p>' + esc(THEME.welcomeSubtitle) + '</p></div>';
    h += '<div class="fearmeter"><div class="row"><span class="lbl" style="color:' + fearColor() + '">😱 FEAR METER</span><span class="lbl" style="color:' + fearColor() + '">' + Math.round(state.fearMeter) + '%</span></div>';
    h += '<div class="track"><div class="fill" style="width:' + state.fearMeter + '%;background:linear-gradient(90deg,' + fearColor() + ',' + (state.fearMeter > 66 ? '#ff0000' : fearColor()) + ');box-shadow:0 0 10px ' + fearColor() + '"></div></div></div>';
    h += '<div class="artifact-float"><div class="a animate-float perspective-3d" style="filter:drop-shadow(0 0 30px ' + fearColor() + ')">' + (THEME.days[0] ? THEME.days[0].artifactEmoji : '💎') + '</div></div>';
    h += '<div class="days-grid">';
    THEME.days.forEach(function(day){
      var unlocked = isUnlocked(day.dayNumber), available = isAvailableByDate(day.dayNumber);
      var completed = state.completedDays.indexOf(day.dayNumber) >= 0;
      var accessible = unlocked && available;
      h += '<button class="day-card' + (completed ? ' completed' : accessible ? ' accessible' : ' locked') + '" data-day="' + day.dayNumber + '">';
      h += '<div class="thumb"><img src="' + esc(day.backgroundImage) + '" alt="" onerror="this.remove()"><div class="grad"></div>';
      h += '<div class="lock">' + (completed ? '✅' : accessible ? '🔓' : '🔒') + '</div>';
      h += '<div class="art">' + day.artifactEmoji + '</div></div>';
      h += '<div class="body"><div class="dayno">DAY ' + day.dayNumber + '</div>';
      h += '<h3>' + esc(day.title) + '</h3><p class="sub">' + esc(day.subtitle) + '</p>';
      h += '<div class="meta"><span>🎯 ' + esc(day.skill) + '</span><span>⭐ ' + day.pointsAvailable + 'pts</span></div></div>';
      h += '</button>';
    });
    h += '</div></div>';
    return h;
  }

  function handleDayClick(dayNum){
    if (canAccess(dayNum)) { state.currentDay = dayNum; state.tab = 'lesson'; state.screen = 'day'; save(); render(); playHorrorDrone(2); }
    else if (!isAvailableByDate(dayNum)) {
      playWrong();
      var d = new Date(new Date(THEME.startDate).getTime() + dayNum * 86400000);
      toast('🔒 This day opens on ' + d.toLocaleDateString(), true);
    } else {
      openCodeModal(dayNum);
    }
  }

  /* code modal */
  var codeTarget = null;
  function openCodeModal(dayNum){
    codeTarget = dayNum;
    var prev = dayByNum(dayNum - 1);
    var m = $('#fx-modal');
    if (!m) return;
    m.style.display = 'flex';
    $('#fx-code-input').value = '';
    $('#fx-code-hint').textContent = (prev && prev.codeHint) || 'Find the code in the previous day\\'s content';
    setTimeout(function(){ try { $('#fx-code-input').focus(); } catch (e) {} }, 50);
  }
  function closeCodeModal(){ var m = $('#fx-modal'); if (m) m.style.display = 'none'; codeTarget = null; }
  function submitCode(){
    if (codeTarget === null || !THEME) return;
    var prev = dayByNum(codeTarget - 1);
    var expected = prev ? String(prev.unlockCode || '').toUpperCase() : '';
    var master = String(THEME.masterCode || '').toUpperCase();
    var input = $('#fx-code-input').value.trim().toUpperCase();
    if (input === expected || input === master) {
      playSuccess(); playUnlock();
      state.unlockedDays.push(codeTarget);
      state.points += 50;
      closeCodeModal();
      toast('✅ Day Unlocked!', false);
      save(); render();
    } else {
      if (Math.random() > 0.5) { playJumpScare(); triggerJumpScare(); } else { playScream(); playBreathing(); triggerBlood(); triggerShake(); }
      state.fearMeter = Math.min(100, state.fearMeter + 15);
      toast('💀 WRONG CODE! Fear rising...', true);
      save(); renderFx();
    }
  }

  /* ── DAY VIEW ── */
  function tabsFor(day){
    var t = [
      { id: 'lesson', label: '📖 Lesson' }, { id: 'vocab', label: '📝 Vocab' }, { id: 'grammar', label: '📐 Grammar' },
      { id: 'reading', label: '📕 Reading' }, { id: 'listening', label: '🎧 Listening' }, { id: 'dialogue', label: '🎭 Dialogue' },
      { id: 'speaking', label: '🎤 Speaking' }, { id: 'writing', label: '✍️ Writing' }, { id: 'dictation', label: '📢 Dictation' },
      { id: 'quiz', label: '❓ Quiz' }
    ];
    if (day.bossBattle && day.bossBattle.length) t.push({ id: 'boss', label: '💀 Boss' });
    if (day.dragDropClues && day.dragDropClues.length) t.push({ id: 'clues', label: '🧩 Clues' });
    return t;
  }

  function dayHTML(){
    var day = dayByNum(state.currentDay);
    if (!day) return '';
    var tabs = tabsFor(day);
    var h = '';
    h += '<div class="content">';
    h += '<div class="day-head">';
    h += '<div class="topbar-left"><button class="bigbtn" data-act="back">🔙 Back</button><button class="bigbtn" data-act="hub">⬅️</button><button class="bigbtn" data-act="settings">⚙️ Settings</button></div>';
    h += '<div class="day-head-center"><div class="dayno">DAY ' + day.dayNumber + ' • ' + esc(day.skill.toUpperCase()) + '</div><h1>' + esc(day.title) + '</h1></div>';
    h += '<div class="day-head-right"><span class="stat yellow">⭐ ' + state.points + '</span><span class="stat" style="color:' + fearColor() + '">😱 ' + Math.round(state.fearMeter) + '%</span></div>';
    h += '</div>';
    h += '<div class="day-art"><div class="a ' + (state.fearMeter > 50 ? 'animate-rotate' : 'animate-float-slow') + '" style="filter:drop-shadow(0 0 15px ' + fearColor() + ')">' + day.artifactEmoji + '</div></div>';
    h += '<div class="narrator-box"><div class="row"><span class="lbl">🔊 Narrator</span><button class="btn red" data-act="narr-intro">▶️ Read Aloud</button></div><p>"' + esc(day.narratorIntro) + '"</p></div>';
    h += '<div class="tabs">';
    tabs.forEach(function(t){ h += '<button class="tab' + (state.tab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>'; });
    h += '</div>';
    h += '<div class="panel" id="tabpanel">' + tabHTML(day, state.tab) + '</div>';
    if (state.completedDays.indexOf(day.dayNumber) < 0) {
      h += '<button class="complete-btn" data-act="complete">✅ Complete Day ' + day.dayNumber + '</button>';
    }
    h += '</div>';
    return h;
  }

  /* tab renderers */
  function tabHTML(day, tab){
    if (tab === 'lesson') return lessonTab(day);
    if (tab === 'vocab') return vocabTab(day);
    if (tab === 'grammar') return grammarTab(day);
    if (tab === 'reading') return readingTab(day);
    if (tab === 'listening') return listeningTab(day);
    if (tab === 'dialogue') return dialogueTab(day);
    if (tab === 'speaking') return speakingTab(day);
    if (tab === 'writing') return writingTab(day);
    if (tab === 'dictation') return dictationTab(day);
    if (tab === 'quiz') return quizTab(day);
    if (tab === 'boss' && day.bossBattle) return bossTab(day);
    if (tab === 'clues' && day.dragDropClues) return cluesTab(day);
    return '';
  }

  function lessonTab(day){
    var h = '<h2 class="lesson-title">' + esc(day.lesson.title) + '</h2>';
    h += '<p class="lesson-intro">' + esc(day.lesson.content) + '</p>';
    day.lesson.sections.forEach(function(sec){
      h += '<div class="sec-block ' + (sec.type === 'warning' ? 'warning' : sec.type === 'dialogue' ? 'dialogue' : '') + '">';
      h += '<div class="row"><h3>' + esc(sec.title) + '</h3><button class="btn red" data-act="sec-read" data-idx="' + day.lesson.sections.indexOf(sec) + '">🔊 Read</button></div>';
      if (sec.type === 'dialogue') {
        var chars = [];
        sec.content.split('\\n').forEach(function(line){ var m = line.match(/^([^:]+):/); if (m && chars.indexOf(m[1].trim()) < 0) chars.push(m[1].trim()); });
        chars.forEach(function(ch){
          h += '<div class="charvoice"><span class="nm">' + esc(ch) + ':</span><select data-charvoice="' + esc(ch) + '"><option value="">Default</option>' + voiceOptions() + '</select></div>';
        });
        sec.content.split('\\n').filter(function(l){ return l.trim(); }).forEach(function(line){
          var m = line.match(/^([^:]+):\\s*"?(.+)"?$/);
          if (m) h += '<div class="dline"><span class="who">' + esc(m[1]) + ':</span><span class="what">' + esc(m[2]) + '</span><button class="play" data-speak-line="' + esc(m[2]) + '" data-char="' + esc(m[1].trim()) + '">🔊</button></div>';
          else h += '<p class="text">' + esc(line) + '</p>';
        });
      } else {
        h += '<div class="text">' + esc(sec.content) + '</div>';
      }
      h += '</div>';
    });
    return h;
  }
  function voiceOptions(){
    var vs = getVoices(), h = '';
    vs.forEach(function(v){ h += '<option value="' + esc(v.voiceURI) + '">' + esc(v.name.slice(0, 30)) + '</option>'; });
    return h;
  }

  function vocabTab(day){
    var h = '<h2 class="lesson-title" style="font-size:24px">📝 Vocabulary</h2><div class="vocab-grid">';
    day.vocabulary.forEach(function(v, i){
      h += '<div class="vocab-card" data-vocab="' + i + '">';
      h += '<div class="row"><span class="word">' + esc(v.word) + '</span><div style="display:flex;gap:8px;align-items:center"><span class="pos">' + esc(v.partOfSpeech) + '</span><button class="speak" data-speak="' + esc(v.word) + '">🔊</button></div></div>';
      h += '<div class="flip-content" style="display:none">';
      h += '<p class="flip"><strong>Definition:</strong> ' + esc(v.definition) + '</p>';
      h += '<p class="ex"><strong>Example:</strong> ' + esc(v.example) + '</p>';
      h += '<button class="hear" data-speak="' + esc(v.example) + '">🔊 Hear example</button>';
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  }

  function grammarTab(day){
    var h = '<h2 class="lesson-title" style="font-size:24px">📐 Grammar</h2>';
    day.grammar.forEach(function(g, gi){
      h += '<div class="gram-block"><h3>' + esc(g.rule) + '</h3><p class="exp">' + esc(g.explanation) + '</p>';
      h += '<div class="gram-examples">' + g.examples.map(function(ex){ return '<span>"' + esc(ex) + '"</span>'; }).join('') + '</div>';
      g.exercises.forEach(function(ex, ei){
        var key = gi + '-' + ei;
        var ans = (state.gramAns && state.gramAns[key]) || '';
        var checked = state.gramChecked && state.gramChecked[key];
        var right = checked && String(ans).toLowerCase().trim() === String(ex.answer).toLowerCase().trim();
        h += '<div class="ex-block' + (checked ? (right ? ' ok' : ' bad') : '') + '" data-gram="' + key + '">';
        h += '<p>' + esc(ex.instruction) + ': <strong>' + esc(ex.sentence) + '</strong></p>';
        if (ex.options) {
          h += '<div class="ex-opts">';
          ex.options.forEach(function(opt){
            var cls = checked && String(opt).toLowerCase().trim() === String(ex.answer).toLowerCase().trim() ? ' right' : (checked && ans === opt ? ' wrongpick' : '');
            h += '<button class="ex-opt' + cls + '" data-gram-opt="' + key + '" data-val="' + esc(opt) + '"' + (checked ? ' disabled' : '') + '>' + esc(opt) + '</button>';
          });
          h += '</div>';
        } else {
          h += '<div class="ex-inrow"><input data-gram-in="' + key + '" value="' + esc(ans) + '"' + (checked ? ' disabled' : '') + '/>';
          if (!checked) h += '<button class="ex-check" data-gram-check="' + key + '" data-answer="' + esc(ex.answer) + '">Check</button>';
          h += '</div>';
        }
        if (checked) h += '<p class="ex-feedback ' + (right ? 'good' : 'bad') + '">' + (right ? '✅ Correct!' : '❌ Answer: ' + esc(ex.answer)) + '</p>';
        h += '</div>';
      });
      h += '</div>';
    });
    return h;
  }

  function readingTab(day){
    var h = '<h2 class="lesson-title" style="font-size:24px">📕 Glitch Hunter</h2>';
    var foundN = 0;
    state.foundGlitches = state.foundGlitches || [];
    state.foundGlitches.forEach(function(f){ if (f.day === day.dayNumber) foundN++; });
    h += '<p style="color:#9ca3af;margin:0 0 16px">Click on corrupted words! Found: ' + foundN + '/' + day.reading.glitchWords.length + '</p>';
    h += '<button class="btn red" style="margin-bottom:12px" data-act="read-aloud">🔊 Read Aloud</button>';
    var gmap = {};
    day.reading.glitchWords.forEach(function(g){ gmap[g.text.toLowerCase()] = g; });
    var words = day.reading.text.split(/(\\s+)/);
    h += '<div class="reading-text">';
    words.forEach(function(w, i){
      var clean = w.replace(/[.,!?\\"'\\';:()]/g, '');
      var gw = gmap[clean.toLowerCase()];
      var isFound = state.foundGlitches.some(function(f){ return f.day === day.dayNumber && f.idx === i; });
      h += '<span class="rword' + (isFound ? ' found' : '') + '" data-word="' + i + '" data-glitch="' + (gw && gw.isGlitch ? '1' : '') + '">' + (isFound && gw ? esc(gw.correction || w) : esc(w)) + '</span>';
    });
    h += '</div>';
    h += '<h3 style="color:#d1d5db;font-size:18px;margin:0 0 12px">Comprehension</h3>';
    day.reading.comprehensionQuestions.forEach(function(q, qi){
      var picked = state.cqAns && state.cqAns[day.dayNumber] && state.cqAns[day.dayNumber][qi];
      h += '<div class="q-block"><p class="q">' + esc(q.question) + '</p><div class="q-opts">';
      q.options.forEach(function(opt, oi){
        var cls = picked !== undefined && oi === q.correct ? ' right' : (picked === oi ? ' wrongpick' : '');
        h += '<button class="q-opt' + cls + '" data-cq="' + qi + '" data-oi="' + oi + '" data-day="' + day.dayNumber + '"' + (picked !== undefined ? ' disabled' : '') + '>' + esc(opt) + '</button>';
      });
      h += '</div>';
      if (picked !== undefined) h += '<p class="q-exp">💡 ' + esc(q.explanation) + '</p>';
      h += '</div>';
    });
    return h;
  }

  function listeningTab(day){
    var h = '<h2 class="lesson-title" style="font-size:24px">🎧 Echo Locator</h2>';
    day.listening.forEach(function(l, i){
      var ans = (state.listAns && state.listAns[i]) || '';
      var checked = state.listChecked && state.listChecked[i];
      h += '<div class="listen-block">';
      h += '<div class="row"><button class="btn red" data-list-play="' + i + '">🔊 Play</button><button class="btn dark" data-list-play="' + i + '" data-slow="1">🐢 Slow</button><span class="hint">💡 ' + esc(l.hint) + '</span></div>';
      h += '<div class="listen-inrow"><input data-list-in="' + i + '" value="' + esc(ans) + '" placeholder="Type the hidden word..."' + (checked ? ' disabled' : '') + '>';
      if (!checked) h += '<button class="listen-check" data-list-check="' + i + '" data-answer="' + esc(l.hiddenWord) + '">Check</button>';
      h += '</div>';
      if (checked) {
        var good = String(ans).toLowerCase().trim() === l.hiddenWord.toLowerCase();
        h += '<p class="listen-fb ' + (good ? 'good' : 'bad') + '">' + (good ? '✅ "' + esc(l.hiddenWord) + '"' : '❌ "' + esc(l.hiddenWord) + '"') + '</p>';
      }
      h += '</div>';
    });
    return h;
  }

  function dialogueTab(day){
    var h = '<h2 class="lesson-title" style="font-size:36px">🎭 Interrogation</h2>';
    h += '<p class="dlg-scenario">Scenario: ' + esc(day.dialogue.scenario) + '</p>';
    var charVoices = state.charVoices || {};
    day.dialogue.characters.forEach(function(rawChar){
      var ch = rawChar.trim();
      h += '<div class="charvoice"><span class="nm">' + esc(ch) + ':</span><select data-charvoice="' + esc(ch) + '"><option value="">Default</option>' + voiceOptions() + '</select></div>';
    });
    var tIdx = state.dlgTurn && state.dlgTurn[day.dayNumber] !== undefined ? state.dlgTurn[day.dayNumber] : 0;
    var turn = day.dialogue.turns[tIdx];
    h += '<div class="dlg-box">';
    h += '<p class="dlg-narr"><span>' + esc(turn.narrator) + '</span><button class="play" data-speak="' + esc(turn.narrator) + '">🔊</button></p>';
    h += '<div class="dlg-q"><span class="who">' + esc(turn.character || 'Narrator') + ':</span><button class="play" data-speak="' + esc(turn.question) + '" data-char="' + esc((turn.character || 'Narrator').trim()) + '">🔊</button></div>';
    h += '<p class="dlg-question">' + esc(turn.question) + '</p>';
    var chosen = state.dlgChoice && state.dlgChoice[day.dayNumber] !== undefined ? state.dlgChoice[day.dayNumber] : undefined;
    if (chosen === undefined) {
      h += '<div class="dlg-opts">';
      turn.options.forEach(function(opt, oi){
        h += '<button class="dlg-opt" data-dlg-opt="' + oi + '" data-day="' + day.dayNumber + '">' + esc(opt.text) + '</button>';
      });
      h += '</div>';
    } else {
      var c = turn.options[chosen];
      h += '<div class="dlg-result ' + c.outcome + '">';
      h += '<h3 style="color:' + (c.outcome === 'survive' ? '#00ff88' : c.outcome === 'die' ? '#ff4444' : '#ffcc00') + '">' + (c.outcome === 'survive' ? '✅ SURVIVED!' : c.outcome === 'die' ? '💀 ELIMINATED!' : '⚠️ CLOSE CALL...') + '</h3>';
      h += '<p>' + esc(c.response) + '</p></div>';
      if (tIdx < day.dialogue.turns.length - 1) h += '<button class="dlg-next" data-dlg-next="' + day.dayNumber + '">Next Turn →</button>';
    }
    h += '</div>';
    return h;
  }

  function speakingTab(day){
    var h = '<h2 class="lesson-title" style="font-size:24px">🎤 ' + (day.speaking[0].mode === 'whisper' ? 'Whisper' : day.speaking[0].mode === 'shout' ? 'SHOUT' : 'Speak') + ' Challenge</h2>';
    var idx = state.spkIdx && state.spkIdx[day.dayNumber] !== undefined ? state.spkIdx[day.dayNumber] : 0;
    var ch = day.speaking[idx];
    h += '<p style="color:#9ca3af;margin:0 0 16px">Read aloud. ' + ch.targetAccuracy + '% accuracy required.</p>';
    h += '<div class="speak-words">';
    var spoken = (state.spkResult && state.spkResult[day.dayNumber] && state.spkResult[day.dayNumber][idx]) ? state.spkResult[day.dayNumber][idx].toLowerCase().split(/\\s+/) : [];
    ch.text.split(/\\s+/).forEach(function(w){
      var cls = '';
      if (state.spkResult && state.spkResult[day.dayNumber] && state.spkResult[day.dayNumber][idx]) cls = spoken.indexOf(w.toLowerCase()) >= 0 ? 'done' : 'wrong';
      h += '<span class="karaoke-word ' + cls + '">' + esc(w) + '</span>';
    });
    h += '</div>';
    h += '<div class="speak-row"><button class="mic-btn' + (state.spkListening ? ' live' : '') + '" data-act="spk-mic" data-day="' + day.dayNumber + '" data-idx="' + idx + '">' + (state.spkListening ? '⏹️ Stop' : '🎙️ Start Speaking') + '</button>';
    h += '<button class="listen-first" data-speak="' + esc(ch.text) + '">🔊 Listen First</button></div>';
    var acc = state.spkAcc && state.spkAcc[day.dayNumber] && state.spkAcc[day.dayNumber][idx];
    if (acc !== undefined) {
      var good = acc >= ch.targetAccuracy;
      h += '<div class="speak-result ' + (good ? 'good' : 'bad') + '">';
      h += '<span class="pct" style="color:' + (good ? '#00ff88' : '#ff4444') + '">' + (good ? '🎉' : '😰') + ' ' + acc + '%</span>';
      if (state.spkResult && state.spkResult[day.dayNumber] && state.spkResult[day.dayNumber][idx]) h += '<p class="said">You said: "' + esc(state.spkResult[day.dayNumber][idx]) + '"</p>';
      if (good) h += '<p class="clue">🔍 Clue: ' + esc(ch.clueOnSuccess) + '</p>';
      h += '</div>';
    }
    if (day.speaking.length > 1) {
      h += '<div class="speak-dots">';
      day.speaking.forEach(function(_, i){ h += '<button class="' + (i === idx ? 'cur' : 'oth') + '" data-act="spk-dot" data-idx="' + i + '" data-day="' + day.dayNumber + '">' + (i + 1) + '</button>'; });
      h += '</div>';
    }
    return h;
  }

  function writingTab(day){
    var p = day.writing[0];
    if (!p) return '';
    var h = '<h2 class="lesson-title" style="font-size:24px">✍️ Writing Challenge</h2>';
    h += '<div class="write-prompt"><p>' + esc(p.prompt) + '</p><div class="write-keys">Keywords: ';
    var text = (state.writeText && state.writeText[day.dayNumber]) || '';
    p.keywords.forEach(function(k){
      h += '<span class="' + (text.toLowerCase().indexOf(k.toLowerCase()) >= 0 ? 'found' : '') + '">' + esc(k) + '</span>';
    });
    h += '</div></div>';
    var wc = text.trim().split(/\\s+/).filter(Boolean).length;
    var submitted = state.writeDone && state.writeDone[day.dayNumber];
    h += '<textarea class="write-ta" rows="6" data-write="' + day.dayNumber + '" placeholder="Write here..."' + (submitted ? ' disabled' : '') + '>' + esc(text) + '</textarea>';
    h += '<div class="write-count ' + (wc >= p.minWords ? 'good' : '') + '">Words: ' + wc + '/' + p.minWords + '</div>';
    if (!submitted) h += '<button class="write-submit" data-act="write-submit" data-day="' + day.dayNumber + '"' + (wc < p.minWords ? ' disabled' : '') + '>Submit ✅</button>';
    else h += '<div class="write-done"><p class="ok">✅ Submitted!</p><p class="sample">' + esc(p.sampleAnswer) + '</p></div>';
    return h;
  }

  function dictationTab(day){
    var h = '<h2 class="lesson-title" style="font-size:24px">📢 Dictation</h2>';
    day.dictation.forEach(function(d, i){
      var ans = (state.dictAns && state.dictAns[i]) || '';
      var checked = state.dictChecked && state.dictChecked[i];
      h += '<div class="dict-block">';
      h += '<button class="play" data-dict-play="' + i + '" data-speed="' + d.speed + '">🔊 Play (' + d.speed + ')</button>';
      h += '<textarea rows="2" data-dict-in="' + i + '" placeholder="Type what you hear..."' + (checked ? ' disabled' : '') + '>' + esc(ans) + '</textarea>';
      if (!checked) h += '<button class="listen-check" data-dict-check="' + i + '" data-answer="' + esc(d.text) + '">Check</button>';
      else {
        var good = norm(ans) === norm(d.text);
        h += '<p class="dict-fb ' + (good ? 'good' : 'bad') + '">' + (good ? '✅ Perfect!' : '❌ "' + esc(d.text) + '"') + '</p>';
      }
      h += '</div>';
    });
    return h;
  }
  function norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9\\s]/g, '').trim(); }

  function quizTab(day){
    var h = '<h2 class="lesson-title" style="font-size:24px">❓ Quiz</h2>';
    day.quiz.forEach(function(q, qi){
      var picked = state.quizAns && state.quizAns[day.dayNumber] && state.quizAns[day.dayNumber][qi];
      h += '<div class="quiz-block"><p class="q">' + esc(q.question) + '</p><div class="quiz-opts">';
      q.options.forEach(function(opt, oi){
        var cls = picked !== undefined && oi === q.correct ? ' right' : (picked === oi ? ' wrongpick' : '');
        h += '<button class="quiz-opt' + cls + '" data-quiz="' + qi + '" data-oi="' + oi + '" data-day="' + day.dayNumber + '"' + (picked !== undefined ? ' disabled' : '') + '>' + esc(opt) + '</button>';
      });
      h += '</div>';
      if (picked !== undefined) h += '<p class="q-exp">💡 ' + esc(q.explanation) + '</p>';
      h += '</div>';
    });
    return h;
  }

  function bossTab(day){
    var questions = day.bossBattle || [];
    var qIdx = (state.bossQ && state.bossQ[day.dayNumber] !== undefined) ? state.bossQ[day.dayNumber] : 0;
    var bossHP = (state.bossHP && state.bossHP[day.dayNumber] !== undefined) ? state.bossHP[day.dayNumber] : 100;
    var score = (state.bossScore && state.bossScore[day.dayNumber] !== undefined) ? state.bossScore[day.dayNumber] : 0;
    var gameOver = state.bossOver && state.bossOver[day.dayNumber];
    var h = '';
    if (gameOver) {
      var won = bossHP <= 0;
      h += '<div class="boss-end ' + (won ? 'win' : 'lose') + '"><div class="big">' + (won ? '🏆' : '💀') + '</div>';
      h += '<h3 style="color:' + (won ? '#00ff88' : '#ff4444') + '">' + (won ? 'BOSS DEFEATED!' : 'BOSS SURVIVED') + '</h3>';
      h += '<p>Score: ' + score + '/' + questions.length + '</p></div>';
      return h;
    }
    var q = questions[qIdx];
    if (!q) return '';
    h += '<h2 class="lesson-title" style="font-size:24px">💀 BOSS BATTLE</h2>';
    h += '<div class="boss-hp"><div class="row"><span>BOSS HP</span><span>' + Math.round(bossHP) + '%</span></div>';
    h += '<div class="track"><div class="fill" style="width:' + bossHP + '%"></div></div></div>';
    h += '<div class="boss-art"><div class="a ' + (bossHP < 30 ? 'animate-glitch' : bossHP < 60 ? 'animate-rotate' : 'animate-float-slow') + '" style="filter:drop-shadow(0 0 20px ' + fearColor() + ')">' + day.artifactEmoji + '</div></div>';
    var timer = (state.bossTimer && state.bossTimer[day.dayNumber] !== undefined) ? state.bossTimer[day.dayNumber] : q.timeLimit;
    var answered = state.bossAnswered && state.bossAnswered[day.dayNumber];
    h += '<div class="boss-qrow"><span class="idx">Q' + (qIdx + 1) + '/' + questions.length + '</span><span class="timer' + (timer <= 3 ? ' warn' : '') + '">⏱️ ' + timer + 's</span></div>';
    h += '<div class="boss-q"><p class="q">' + esc(q.question) + '</p><div class="opts">';
    q.options.forEach(function(opt, oi){
      var cls = answered && oi === q.correct ? ' right' : answered ? ' dim' : '';
      h += '<button class="boss-opt' + cls + '" data-boss-opt="' + oi + '" data-day="' + day.dayNumber + '"' + (answered ? ' disabled' : '') + '>' + esc(opt) + '</button>';
    });
    h += '</div></div>';
    return h;
  }

  function cluesTab(day){
    var clues = day.dragDropClues || [];
    var matched = state.clueMatched && state.clueMatched[day.dayNumber] ? state.clueMatched[day.dayNumber] : [];
    var sel = state.clueSel && state.clueSel[day.dayNumber] !== undefined ? state.clueSel[day.dayNumber] : null;
    var h = '<h2 class="lesson-title" style="font-size:24px">🧩 Connect the Clues</h2><div class="clues-grid">';
    h += '<div class="clues-col"><h3>Clues</h3>';
    clues.forEach(function(c, i){
      h += '<button class="clue-item' + (matched.indexOf(i) >= 0 ? ' matched' : sel === i ? ' sel' : '') + '" data-clue="' + i + '" data-day="' + day.dayNumber + '">' + esc(c.clue) + '</button>';
    });
    h += '</div><div class="clues-col"><h3>Meanings</h3>';
    clues.forEach(function(c, i){
      var isMatched = matched.some(function(mi){ return clues[mi].match === c.match; });
      h += '<button class="clue-item' + (isMatched ? ' matched' : '') + '" data-match="' + i + '" data-day="' + day.dayNumber + '">' + esc(c.match) + '</button>';
    });
    h += '</div></div>';
    if (matched.length === clues.length) h += '<div class="clues-win"><p>🎉 All clues matched!</p></div>';
    return h;
  }

  /* ── render ── */
  function render(){
    var root = $('#app');
    if (!root) return;
    root.className = 'app' + (state.isShaking ? ' animate-shake' : '');
    var html = '';
    html += '<div class="bg-layer"><img src="' + esc((state.screen === 'day' && dayByNum(state.currentDay)) ? dayByNum(state.currentDay).backgroundImage : (THEME.backgroundImages[0] || '')) + '" alt="" onerror="this.remove()"><div class="shade"></div></div>';
    html += '<div class="fog-layer"></div>';
    for (var i = 0; i < 8; i++) html += '<div class="ember-particle" style="left:' + (Math.random() * 100) + '%;animation-delay:' + (Math.random() * 4) + 's;animation-duration:' + (3 + Math.random() * 3) + 's"></div>';
    html += state.screen === 'day' ? dayHTML() : hubHTML();
    html += '<div class="blood-overlay" id="fx-blood" style="display:none"></div>';
    html += '<div class="fear-border" id="fx-fearborder"></div>';
    html += '<div class="jumpscare" id="fx-jumpscare" style="display:none"><div class="face">' + ['🐦\\u200d⬛', '🕷️', '💀', '👻', '🤡', '👁️'][Math.floor(Math.random() * 6)] + '</div></div>';
    html += '<div class="toast" id="fx-toast" style="display:none"></div>';
    html += '<div class="modal-back" id="fx-modal" style="display:none"><div class="modal-box"><div class="big">🔐</div><h2>Enter Unlock Code</h2><p class="hint" id="fx-code-hint"></p><input id="fx-code-input" placeholder="Type the code..." /><div class="modal-actions"><button class="cancel" data-act="modal-cancel">Cancel</button><button class="unlock" data-act="modal-unlock">🔓 Unlock</button></div></div></div>';
    html += '<div class="mobilenav"></div>';
    root.innerHTML = html;
    bind();
  }

  function bind(){
    var root = $('#app');
    $$('[data-act]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var act = b.getAttribute('data-act');
        if (act === 'back') { if (window.location.hash === '#/') {} else { window.location.hash = '#/'; } }
        else if (act === 'hub') { stopSpeaking(); state.screen = 'game'; render(); }
        else if (act === 'settings') { toast('⚙️ Voice & narration controls are on each screen — see the speaker buttons.', false); }
        else if (act === 'narr-intro') { var d = dayByNum(state.currentDay); if (d) speakText(d.narratorIntro); }
        else if (act === 'sec-read') { var dd = dayByNum(state.currentDay); var sec = dd.lesson.sections[+b.getAttribute('data-idx')]; if (sec) speakText(sec.content); }
        else if (act === 'read-aloud') { var d2 = dayByNum(state.currentDay); if (d2) speakText(d2.reading.text); }
        else if (act === 'spk-mic') { handleMic(b); }
        else if (act === 'spk-dot') { var day = +b.getAttribute('data-day'), idx = +b.getAttribute('data-idx'); state.spkIdx = state.spkIdx || {}; state.spkIdx[day] = idx; state.spkResult = state.spkResult || {}; state.spkResult[day] = state.spkResult[day] || {}; delete state.spkResult[day][idx]; state.spkAcc = state.spkAcc || {}; state.spkAcc[day] = state.spkAcc[day] || {}; delete state.spkAcc[day][idx]; render(); }
        else if (act === 'write-submit') { var wd = +b.getAttribute('data-day'); state.writeDone = state.writeDone || {}; state.writeDone[wd] = true; playSuccess(); state.points += 30; save(); render(); }
        else if (act === 'complete') { var cd = dayByNum(state.currentDay); state.completedDays.push(cd.dayNumber); if (state.badges.indexOf('day' + cd.dayNumber + '_complete') < 0) state.badges.push('day' + cd.dayNumber + '_complete'); state.mysteryBoxes++; playSuccess(); state.screen = 'game'; save(); render(); }
        else if (act === 'modal-cancel') { closeCodeModal(); }
        else if (act === 'modal-unlock') { submitCode(); }
      });
    });
    $$('.day-card', root).forEach(function(c){
      c.addEventListener('click', function(){ handleDayClick(+c.getAttribute('data-day')); });
    });
    $$('.tab', root).forEach(function(t){
      t.addEventListener('click', function(){ state.tab = t.getAttribute('data-tab'); render(); });
    });
    $$('.vocab-card', root).forEach(function(c){
      c.addEventListener('click', function(){
        var fc = $('.flip-content', c);
        if (fc) fc.style.display = fc.style.display === 'none' ? 'block' : 'none';
        c.className = 'vocab-card' + (fc && fc.style.display === 'block' ? ' flipped' : '');
      });
    });
    $$('[data-speak]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var txt = b.getAttribute('data-speak'), ch = b.getAttribute('data-char');
        var uri = ch ? ((state.charVoices || {})[ch] || '') : '';
        speakText(txt, uri);
      });
    });
    $$('[data-speak-line]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var ch = b.getAttribute('data-char');
        speakText(b.getAttribute('data-speak-line'), (state.charVoices || {})[ch] || '');
      });
    });
    $$('[data-charvoice]', root).forEach(function(sel){
      sel.addEventListener('change', function(){
        state.charVoices = state.charVoices || {};
        state.charVoices[sel.getAttribute('data-charvoice')] = sel.value;
        save();
      });
      var ch = sel.getAttribute('data-charvoice'), cv = (state.charVoices || {})[ch];
      if (cv) sel.value = cv;
    });
    $$('[data-gram-opt]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var key = b.getAttribute('data-gram-opt'), val = b.getAttribute('data-val');
        var ex = grammarExercise(key);
        state.gramAns = state.gramAns || {}; state.gramAns[key] = val;
        state.gramChecked = state.gramChecked || {}; state.gramChecked[key] = true;
        if (String(val).toLowerCase().trim() === String(ex.answer).toLowerCase().trim()) { playSuccess(); state.points += 10; }
        else { if (Math.random() > 0.8) { playJumpScare(); triggerJumpScare(); } else { playWrong(); triggerShake(); } state.fearMeter = Math.min(100, state.fearMeter + 5); }
        save(); render();
      });
    });
    $$('[data-gram-check]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var key = b.getAttribute('data-gram-check');
        var inp = $('input[data-gram-in="' + key + '"]');
        var val = inp ? inp.value : '';
        var ex = grammarExercise(key);
        state.gramAns = state.gramAns || {}; state.gramAns[key] = val;
        state.gramChecked = state.gramChecked || {}; state.gramChecked[key] = true;
        if (String(val).toLowerCase().trim() === String(ex.answer).toLowerCase().trim()) { playSuccess(); state.points += 10; }
        else { if (Math.random() > 0.8) { playJumpScare(); triggerJumpScare(); } else { playWrong(); triggerShake(); } state.fearMeter = Math.min(100, state.fearMeter + 5); }
        save(); render();
      });
    });
    $$('[data-cq]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var day = +b.getAttribute('data-day'), qi = +b.getAttribute('data-cq'), oi = +b.getAttribute('data-oi');
        var d = dayByNum(day); if (!d) return;
        var q = d.reading.comprehensionQuestions[qi];
        state.cqAns = state.cqAns || {}; state.cqAns[day] = state.cqAns[day] || {};
        state.cqAns[day][qi] = oi;
        if (oi === q.correct) { playSuccess(); state.points += 10; }
        else { if (Math.random() > 0.8) { playJumpScare(); triggerJumpScare(); } else { playWrong(); triggerShake(); } state.fearMeter = Math.min(100, state.fearMeter + 5); }
        save(); render();
      });
    });
    $$('.rword', root).forEach(function(w){
      w.addEventListener('click', function(){
        var idx = +w.getAttribute('data-word');
        var d = dayByNum(state.currentDay); if (!d) return;
        if (w.getAttribute('data-glitch') === '1') {
          state.foundGlitches = state.foundGlitches || [];
          if (!state.foundGlitches.some(function(f){ return f.day === state.currentDay && f.idx === idx; })) {
            state.foundGlitches.push({ day: state.currentDay, idx: idx });
            playSuccess(); state.points += 15; state.fearMeter = Math.max(0, state.fearMeter - 2);
          }
        } else {
          if (Math.random() > 0.7) { playJumpScare(); triggerJumpScare(); } else { playWrong(); triggerShake(); }
          state.fearMeter = Math.min(100, state.fearMeter + 5);
        }
        save(); render();
      });
    });
    $$('[data-list-play]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var i = +b.getAttribute('data-list-play'), d = dayByNum(state.currentDay);
        if (!d) return;
        speakText(d.listening[i].text, '', b.getAttribute('data-slow') ? 0.5 : 0.8);
      });
    });
    $$('[data-list-check]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var i = +b.getAttribute('data-list-check'), d = dayByNum(state.currentDay);
        if (!d) return;
        var inp = $('input[data-list-in="' + i + '"]');
        var v = inp ? inp.value : '';
        state.listAns = state.listAns || {}; state.listAns[i] = v;
        state.listChecked = state.listChecked || {}; state.listChecked[i] = true;
        if (String(v).toLowerCase().trim() === d.listening[i].hiddenWord.toLowerCase()) {
          playSuccess(); state.points += 20; state.cluesCollected.push(d.listening[i].hiddenWord);
        } else {
          if (Math.random() > 0.6) { playJumpScare(); triggerJumpScare(); } else { playScream(); triggerBlood(); triggerShake(); }
          state.fearMeter = Math.min(100, state.fearMeter + 10);
        }
        save(); render();
      });
    });
    $$('[data-dict-play]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var i = +b.getAttribute('data-dict-play'), d = dayByNum(state.currentDay);
        if (!d) return;
        var sp = b.getAttribute('data-speed');
        speakText(d.dictation[i].text, '', sp === 'slow' ? 0.6 : sp === 'fast' ? 1.3 : 0.9);
      });
    });
    $$('[data-dict-check]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var i = +b.getAttribute('data-dict-check'), d = dayByNum(state.currentDay);
        if (!d) return;
        var ta = $('textarea[data-dict-in="' + i + '"]');
        var v = ta ? ta.value : '';
        state.dictAns = state.dictAns || {}; state.dictAns[i] = v;
        state.dictChecked = state.dictChecked || {}; state.dictChecked[i] = true;
        if (norm(v) === norm(d.dictation[i].text)) { playSuccess(); state.points += 20; }
        else { playWrong(); state.fearMeter = Math.min(100, state.fearMeter + 5); }
        save(); render();
      });
    });
    $$('[data-dlg-opt]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var day = +b.getAttribute('data-day'), oi = +b.getAttribute('data-dlg-opt');
        var d = dayByNum(day); if (!d) return;
        var tIdx = (state.dlgTurn && state.dlgTurn[day] !== undefined) ? state.dlgTurn[day] : 0;
        var turn = d.dialogue.turns[tIdx], opt = turn.options[oi];
        state.dlgChoice = state.dlgChoice || {}; state.dlgChoice[day] = oi;
        state.points += opt.points;
        if (opt.outcome === 'survive') { playSuccess(); state.fearMeter = Math.max(0, state.fearMeter - 5); }
        else if (opt.outcome === 'die') {
          if (Math.random() > 0.5) { playJumpScare(); triggerJumpScare(); } else { playScream(); playBreathing(); triggerBlood(); triggerShake(); }
          state.fearMeter = Math.min(100, state.fearMeter + 20);
        } else { playHeartbeat(100); state.fearMeter = Math.min(100, state.fearMeter + 5); }
        speakText(opt.response, (state.charVoices || {})[(turn.character || 'Narrator').trim()] || '');
        save(); render();
      });
    });
    $$('[data-dlg-next]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var day = +b.getAttribute('data-day');
        state.dlgTurn = state.dlgTurn || {};
        var tIdx = (state.dlgTurn[day] !== undefined ? state.dlgTurn[day] : 0) + 1;
        state.dlgTurn[day] = tIdx;
        state.dlgChoice = state.dlgChoice || {}; delete state.dlgChoice[day];
        render();
      });
    });
    $$('[data-quiz]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var day = +b.getAttribute('data-day'), qi = +b.getAttribute('data-quiz'), oi = +b.getAttribute('data-oi');
        var d = dayByNum(day); if (!d) return;
        var q = d.quiz[qi];
        state.quizAns = state.quizAns || {}; state.quizAns[day] = state.quizAns[day] || {};
        state.quizAns[day][qi] = oi;
        if (oi === q.correct) { playSuccess(); state.points += 15; if (q.codeFragment && state.cluesCollected.indexOf(q.codeFragment) < 0) state.cluesCollected.push(q.codeFragment); }
        else { playScream(); triggerBlood(); triggerShake(); playBreathing(); state.fearMeter = Math.min(100, state.fearMeter + 10); }
        save(); render();
      });
    });
    $$('[data-boss-opt]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var day = +b.getAttribute('data-day'), oi = +b.getAttribute('data-boss-opt');
        var d = dayByNum(day); if (!d) return;
        if (state.bossAnswered && state.bossAnswered[day]) return;
        var questions = d.bossBattle || [];
        var qIdx = (state.bossQ && state.bossQ[day] !== undefined) ? state.bossQ[day] : 0;
        var q = questions[qIdx];
        state.bossAnswered = state.bossAnswered || {}; state.bossAnswered[day] = true;
        if (state.bossTimer && state.bossTimer[day] !== undefined) clearInterval(state.bossTimer[day]._iv);
        if (oi === q.correct) {
          playSuccess();
          state.bossScore = state.bossScore || {}; state.bossScore[day] = (state.bossScore[day] || 0) + 1;
          state.bossHP = state.bossHP || {}; state.bossHP[day] = Math.max(0, (state.bossHP[day] !== undefined ? state.bossHP[day] : 100) - (100 / questions.length));
          state.points += 20; state.fearMeter = Math.max(0, state.fearMeter - 3);
        } else {
          playScream(); playBreathing(); triggerBlood(); triggerShake();
          state.fearMeter = Math.min(100, state.fearMeter + 15);
        }
        save(); render();
        setTimeout(function(){ bossNext(day); }, 1500);
      });
    });
    $$('[data-clue]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var day = +b.getAttribute('data-day'), i = +b.getAttribute('data-clue');
        state.clueMatched = state.clueMatched || {};
        if ((state.clueMatched[day] || []).indexOf(i) >= 0) return;
        state.clueSel = state.clueSel || {}; state.clueSel[day] = i;
        render();
      });
    });
    $$('[data-match]', root).forEach(function(b){
      b.addEventListener('click', function(){
        var day = +b.getAttribute('data-day'), i = +b.getAttribute('data-match');
        var d = dayByNum(day); if (!d) return;
        var clues = d.dragDropClues || [];
        var sel = (state.clueSel && state.clueSel[day] !== undefined) ? state.clueSel[day] : null;
        if (sel === null) return;
        state.clueMatched = state.clueMatched || {}; state.clueMatched[day] = state.clueMatched[day] || [];
        if (clues[sel].match === clues[i].match) {
          if (state.clueMatched[day].indexOf(sel) < 0) state.clueMatched[day].push(sel);
          playSuccess(); state.points += 15;
        } else { playWrong(); triggerShake(); state.fearMeter = Math.min(100, state.fearMeter + 5); }
        state.clueSel = state.clueSel || {}; delete state.clueSel[day];
        save(); render();
      });
    });
    $$('[data-write]', root).forEach(function(ta){
      ta.addEventListener('input', function(){
        state.writeText = state.writeText || {};
        state.writeText[+ta.getAttribute('data-write')] = ta.value;
        save();
        var btn = $('[data-act="write-submit"][data-day="' + ta.getAttribute('data-write') + '"]');
        var wc = ta.value.trim().split(/\\s+/).filter(Boolean).length;
        var d = dayByNum(+ta.getAttribute('data-write'));
        if (btn && d && d.writing[0]) btn.disabled = wc < d.writing[0].minWords;
        var cnt = $('.write-count');
        if (cnt) { cnt.textContent = 'Words: ' + wc + '/' + (d && d.writing[0] ? d.writing[0].minWords : 0); cnt.className = 'write-count' + (d && d.writing[0] && wc >= d.writing[0].minWords ? ' good' : ''); }
      });
    });
    var modalInput = $('#fx-code-input');
    if (modalInput) modalInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') submitCode(); });
    var modalBack = $('#fx-modal');
    if (modalBack) modalBack.addEventListener('click', function(e){ if (e.target === modalBack) closeCodeModal(); });
    renderFx();
  }

  function grammarExercise(key){
    var d = dayByNum(state.currentDay); if (!d) return null;
    var parts = key.split('-');
    var g = d.grammar[+parts[0]];
    return g ? g.exercises[+parts[1]] : null;
  }

  function handleMic(b){
    var day = +b.getAttribute('data-day'), idx = +b.getAttribute('data-idx');
    var d = dayByNum(day); if (!d) return;
    var ch = d.speaking[idx];
    if (state.spkListening) {
      if (state.spkStopFn) { state.spkStopFn(); state.spkStopFn = null; }
      state.spkListening = false; render(); return;
    }
    var stop = startSpeechRecognition(function(text){
      state.spkListening = false;
      state.spkResult = state.spkResult || {}; state.spkResult[day] = state.spkResult[day] || {};
      state.spkResult[day][idx] = text;
      var target = ch.text.toLowerCase().split(/\\s+/);
      var spoken = text.toLowerCase().split(/\\s+/);
      var matches = 0;
      target.forEach(function(w){ if (spoken.indexOf(w) >= 0) matches++; });
      var acc = Math.round((matches / target.length) * 100);
      state.spkAcc = state.spkAcc || {}; state.spkAcc[day] = state.spkAcc[day] || {};
      state.spkAcc[day][idx] = acc;
      if (acc >= ch.targetAccuracy) { playSuccess(); state.points += 25; state.cluesCollected.push(ch.clueOnSuccess); }
      else { playWrong(); state.fearMeter = Math.min(100, state.fearMeter + 5); }
      save(); render();
    }, function(){ state.spkListening = false; render(); });
    if (!stop) { toast('🎤 Speech recognition not supported here — read aloud and check with your tutor.', true); return; }
    state.spkStopFn = stop;
    state.spkListening = true;
    render();
  }

  function bossNext(day){
    var d = dayByNum(day); if (!d) return;
    var questions = d.bossBattle || [];
    var qIdx = (state.bossQ && state.bossQ[day] !== undefined) ? state.bossQ[day] : 0;
    state.bossQ = state.bossQ || {};
    if (qIdx >= questions.length - 1) {
      state.bossOver = state.bossOver || {}; state.bossOver[day] = true;
      save(); render(); return;
    }
    state.bossQ[day] = qIdx + 1;
    state.bossAnswered = state.bossAnswered || {}; delete state.bossAnswered[day];
    state.bossTimer = state.bossTimer || {};
    var nextQ = questions[state.bossQ[day]];
    state.bossTimer[day] = nextQ.timeLimit;
    save(); render();
    startBossTimer(day);
  }

  function startBossTimer(day){
    var d = dayByNum(day); if (!d) return;
    var questions = d.bossBattle || [];
    var qIdx = (state.bossQ && state.bossQ[day] !== undefined) ? state.bossQ[day] : 0;
    var q = questions[qIdx];
    if (!q) return;
    state.bossTimer = state.bossTimer || {};
    state.bossTimer[day] = q.timeLimit;
    var iv = setInterval(function(){
      if (state.bossOver && state.bossOver[day]) { clearInterval(iv); return; }
      if (state.bossAnswered && state.bossAnswered[day]) { clearInterval(iv); return; }
      state.bossTimer[day]--;
      var tEl = $('.boss-qrow .timer');
      if (tEl) { tEl.textContent = '⏱️ ' + state.bossTimer[day] + 's'; tEl.className = 'timer' + (state.bossTimer[day] <= 3 ? ' warn' : ''); }
      if (state.bossTimer[day] <= 0) {
        clearInterval(iv);
        playScream(); triggerShake(); state.fearMeter = Math.min(100, state.fearMeter + 10);
        state.bossAnswered = state.bossAnswered || {}; state.bossAnswered[day] = true;
        save(); render();
        setTimeout(function(){ bossNext(day); }, 1500);
      }
    }, 1000);
    state.bossTimer[day]._iv = iv;
  }

  /* ── boot ── */
  function boot(){
    if (!THEME) { document.body.innerHTML = '<div style="color:#fff;padding:40px;text-align:center;font-family:sans-serif">No gamified challenge data found.</div>'; return; }
    document.body.innerHTML = '<div id="app" class="app"></div>';
    // ensure a startDate so date gating behaves like the React version with a fresh theme
    if (!THEME.startDate) THEME.startDate = new Date().toISOString().slice(0, 10);
    // resume any in-flight boss timer
    if (state.screen === 'day') {
      var d = dayByNum(state.currentDay);
      if (d && d.bossBattle && state.tab === 'boss' && !(state.bossOver && state.bossOver[state.currentDay]) && !(state.bossAnswered && state.bossAnswered[state.currentDay])) {
        startBossTimer(state.currentDay);
      }
    }
    playHorrorDrone(3);
    render();
  }
  boot();
})();
`;