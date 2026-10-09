/**
 * Inline vanilla-JS engine for the standalone Flipbook Homework magazine.
 * Renders cover → TOC → section pages → back cover, with interactive
 * activities (XP + sounds), podcast TTS player, dictionary, cat assistant.
 */
export const FLIPBOOK_HTML_SCRIPT = `
(function(){
  'use strict';
  var LESSON = window.__LESSON__ || { sections: [], title: 'Flipbook', level: '', topic: '', coverTagline: '', learnerName: 'Learner', date: '' };
  var LEARNER_NAME = LESSON.learnerName || 'Learner';
  var FILE_NAME = (window.__FB_FILENAME__ || LESSON.title || 'Flipbook').replace(/\.html$/i, '');
  var PHOTO = window.__FB_PHOTO__ || '';
  var SECTIONS = LESSON.sections || [];
  var TOTAL = SECTIONS.length + 3; // cover + toc + sections + back cover
  var LS_KEY = 'tutorly-fb-' + (LESSON.id || 'lesson');

  var state = { page: 0, xp: 0, level: 1, sound: true, voice: '', rate: 0.95, completedPages: [], done: {}, answers: {}, ratings: {}, matches: {}, fills: {}, short: {} };
  try { var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (saved) { for (var k in saved) if (k !== 'page') state[k] = saved[k]; } } catch (e) {}

  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  function save(){ try { var c = {}; ['xp','level','sound','voice','rate','completedPages','done','answers','ratings','matches','fills','short'].forEach(function(k){ if (state[k] !== undefined) c[k] = state[k]; }); localStorage.setItem(LS_KEY, JSON.stringify(c)); mirrorProgress(); } catch (e) {} }
  // Mirror progress for the tutor dashboard: the main app merges this record into
  // the learner profile the next time the Saved Lessons list is opened.
  function mirrorProgress(){
    try {
      var KEY = 'tutorly-flipbook-progress-' + LEARNER_NAME;
      var list = [];
      try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e2) { list = []; }
      var rec = { fileName: FILE_NAME, title: LESSON.title || FILE_NAME, xp: state.xp, level: lvl(), completedPages: state.completedPages.slice(), totalSections: SECTIONS.length, answers: state.answers, updatedAt: new Date().toISOString() };
      var others = list.filter(function(r){ return r.fileName !== rec.fileName; });
      others.unshift(rec);
      localStorage.setItem(KEY, JSON.stringify(others.slice(0, 20)));
    } catch (e) {}
  }
  function lvl(){ return Math.floor(state.xp / 100) + 1; }

  /* ── sounds ── */
  var AC = null;
  function ctx(){ try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; } catch (e) { return null; } }
  function tone(f, d, t, g){ if (!state.sound) return; var c = ctx(); if (!c) return; try { var o = c.createOscillator(), gn = c.createGain(); o.connect(gn); gn.connect(c.destination); o.type = t || 'sine'; o.frequency.value = f; gn.gain.setValueAtTime(g || .3, c.currentTime); gn.gain.exponentialRampToValueAtTime(.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch (e) {} }
  function sndPage(){ if (!state.sound) return; var c = ctx(); if (!c) return; try { var n = c.sampleRate * .15, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); var s = c.createBufferSource(); s.buffer = b; var g = c.createGain(); g.gain.value = .4; g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .15); var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; s.connect(f); f.connect(g); g.connect(c.destination); s.start(); } catch (e) {} }
  function sndGood(){ tone(523,.1); setTimeout(function(){ tone(659,.1); },100); setTimeout(function(){ tone(784,.2); },200); }
  function sndBad(){ tone(300,.15,'sawtooth',.2); setTimeout(function(){ tone(250,.2,'sawtooth',.15); },150); }
  function sndBadge(){ [0,100,200,300,400].forEach(function(d,i){ setTimeout(function(){ tone(523 + i*100,.15); }, d); }); }

  /* ── TTS ── */
  function pickVoice(pref){ var vs = window.speechSynthesis.getVoices(); if (!vs.length) return null; if (pref) { var m = vs.filter(function(v){ return v.name.toLowerCase().includes(pref.toLowerCase()) || v.name === pref; }); if (m.length) return m[0]; } var nat = vs.filter(function(v){ return /ava|aria|natural|online/.test(v.name.toLowerCase()) && v.lang.startsWith('en'); }); if (nat.length) return nat[0]; var en = vs.filter(function(v){ return v.lang.startsWith('en'); }); return en[0] || null; }
  function speak(text, voice, rate){ try { window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text.replace(/[\\u{1F300}-\\u{1FFFF}]/gu,'').replace(/[✅❌🏆🎯💡🔑⚡🎓📚]/g,'')); u.rate = rate || .95; u.pitch = 1; var v = pickVoice(voice); if (v) u.voice = v; window.speechSynthesis.speak(u); } catch (e) {} }

  /* ── confetti ── */
  function confetti(){ var wrap = document.createElement('div'); wrap.className = 'confetti'; var cols = ['#c9a84c','#f5d87a','#3b82f6','#8b5cf6','#ec4899','#10b981']; for (var i = 0; i < 120; i++) { var p = document.createElement('i'); p.style.left = Math.random()*100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDuration = (2 + Math.random()*2.5) + 's'; p.style.animationDelay = (Math.random()*.5) + 's'; wrap.appendChild(p); } document.body.appendChild(wrap); setTimeout(function(){ wrap.remove(); }, 5200); }

  function addXP(n){ var oldL = lvl(); state.xp += n; var nl = lvl(); if (nl > oldL) { state.level = nl; sndBadge(); confetti(); } else { sndGood(); } renderBar(); save(); }

  /* ── page navigation (two-page spread book with a realistic 3D page turn) ── */
  var FLIP_MS = 900;
  var turning = null;
  function isMobile(){ return innerWidth < 768; }
  function pageW(){ return Math.min(isMobile() ? innerWidth - 16 : (innerWidth - 96) / 2, Math.floor(pageH() / 1.414)); }
  function pageH(){ return Math.min(innerHeight - 150, 880, Math.max(300, (isMobile() ? innerWidth - 16 : (innerWidth - 96) / 2) * 1.414)); }
  function spreadW(){ return isMobile() ? pageW() : pageW() * 2 + 8; }
  function startTurn(i){
    if (i === state.page || turning) return;
    sndPage();
    turning = { from: state.page, to: i, dir: i > state.page ? 1 : -1 };
    render();
    setTimeout(function(){ state.page = i; turning = null; render(); }, FLIP_MS + 40);
  }
  function goTo(i, silent){
    var c = Math.max(0, Math.min(TOTAL - 1, i));
    if (c === state.page || turning) return;
    if (Math.abs(c - state.page) === 1) { startTurn(c); return; } // adjacent → realistic turn across the spine
    sndPage(); state.page = c; render(); // far jump (contents) → instant
  }
  function next(){ if (state.page < TOTAL - 1) goTo(state.page + 1); }
  function prev(){ if (state.page > 0) goTo(state.page - 1); }

  /* ── renderers ── */
  function renderBar(){
    var xpIn = state.xp % 100;
    $('#lvl').textContent = lvl();
    $('#xpnum').textContent = state.xp;
    $('#fill').style.width = xpIn + '%';
    $('#who').innerHTML = '<p>' + esc(LEARNER_NAME) + '</p><span>Level ' + lvl() + '</span>';
    $('#pgnum').textContent = (state.page + 1) + ' / ' + TOTAL;
    $('#pgfill').style.width = (TOTAL > 1 ? Math.round(state.page / (TOTAL - 1) * 100) : 0) + '%';
    $('#pgpct').textContent = Math.round(TOTAL > 1 ? state.page / (TOTAL - 1) * 100 : 0) + '%';
    $('#done').textContent = state.completedPages.length + ' done';
    $('#snd').textContent = state.sound ? '🔊' : '🔇';
    var t = $('#pagecomplete'); if (t) t.style.display = state.completedPages.indexOf(state.page) >= 0 ? 'inline' : 'none';
  }

  function isDone(id){ return !!state.done[id]; }
  function markDone(id, answer){
    state.done[id] = true;
    if (answer !== undefined) state.answers[id] = answer;
    save();
    // page complete when every activity on it is done
    var sec = SECTIONS[state.page - 2];
    if (sec && sec.activities && sec.activities.length && sec.activities.every(function(a){ return isDone(a.id); })) {
      if (state.completedPages.indexOf(state.page) < 0) { state.completedPages.push(state.page); sndBadge(); save(); }
    }
    render();
  }

  function activityHTML(a){
    var xp = a.xpReward || 10;
    var done = isDone(a.id);
    var saved = state.answers[a.id];
    var h = '<div class="actcard" data-id="' + esc(a.id) + '">';
    h += '<h4>' + esc(a.question || '') + '</h4>';
    if (a.type === 'multiple-choice' || a.type === 'true-false') {
      var opts = (a.options && a.options.length ? a.options : ['True','False']);
      h += '<div class="opts">';
      opts.forEach(function(o, i){
        var cls = '';
        if (done && String(o) === String(a.correctAnswer)) cls = ' ok';
        else if (done && String(o) === String(saved) && String(o) !== String(a.correctAnswer)) cls = ' bad';
        else if (!done && String(o) === String(saved)) cls = ' sel';
        h += '<button class="mcopt' + cls + '" data-o="' + esc(o) + '"' + (done ? ' disabled' : '') + '>' + esc(o) + '</button>';
      });
      h += '</div>';
      h += '<div class="result" style="display:none"></div>';
    } else if (a.type === 'fill-blanks' && a.blanks) {
      a.blanks.forEach(function(b){
        var val = (saved && saved[b.id]) || '';
        h += '<div class="gaprow"><span>' + esc(b.sentence.split('_____')[0] || '') + '</span><input data-b="' + esc(b.id) + '" value="' + esc(val) + '"' + (done ? ' disabled' : '') + ' placeholder="..." /><span>' + esc(b.sentence.split('_____')[1] || '') + '</span><span class="hinttxt">' + (b.hint ? '💡 ' + esc(b.hint) : '') + '</span></div>';
      });
      h += '<button class="actbtn">Check Answers</button>';
      h += '<div class="result" style="display:none"></div>';
    } else if (a.type === 'matching' && a.pairs) {
      a.pairs.forEach(function(p, i){
        var sel = (saved && saved[i]) || '';
        h += '<div class="matchrow"><span class="l">' + esc(p.left) + '</span><span class="a">→</span><select data-i="' + i + '"' + (done ? ' disabled' : '') + '><option value="">Select...</option>';
        a.pairs.forEach(function(r){ h += '<option value="' + esc(r.right) + '"' + (sel === r.right ? ' selected' : '') + '>' + esc(r.right) + '</option>'; });
        h += '</select><span class="mk"></span></div>';
      });
      h += '<button class="actbtn g">Check Matches</button>';
      h += '<div class="result" style="display:none"></div>';
    } else if (a.type === 'short-answer') {
      h += '<textarea class="shortans" rows="3" placeholder="Write your answer here..."' + (done ? ' disabled' : '') + '>' + esc(typeof saved === 'string' ? saved : '') + '</textarea>';
      h += '<button class="actbtn gr">Submit Answer</button>';
      h += '<div class="result" style="display:none"></div>';
    } else if (a.type === 'discussion' && a.discussionPoints) {
      h += '<ul style="padding-left:16px;font-size:12px;color:#374151;margin-bottom:6px">';
      a.discussionPoints.forEach(function(p){ h += '<li style="margin-bottom:4px">' + esc(p) + '</li>'; });
      h += '</ul>';
      if (!done) h += '<button class="actbtn o">Mark as Discussed ✓</button>';
      h += '<div class="result" style="display:none"></div>';
    } else if (a.type === 'dictation') {
      var dictTxt = a.text || (typeof a.correctAnswer === 'string' ? a.correctAnswer : '');
      h += '<div class="dictbar"><button class="play" data-dict="1">🔊</button><button class="play mic" data-mic="1" title="Speak your answer">🎤</button><span>Play the audio, then type or speak exactly what you hear</span></div>';
      h += '<input class="dictin" data-dict-input="1" value="' + esc(typeof saved === 'string' ? saved : '') + '"' + (done ? ' disabled' : '') + ' placeholder="Type what you hear..." />';
      h += '<button class="actbtn b">Check Dictation</button>';
      h += '<div class="result" style="display:none"></div>';
    } else if (a.type === 'speaking' || a.type === 'roleplay') {
      if (a.speakingPrompts) {
        h += '<ul style="padding-left:16px;font-size:12px;color:#374151;margin-bottom:6px">';
        a.speakingPrompts.forEach(function(p){ h += '<li style="margin-bottom:4px">' + esc(p) + '</li>'; });
        h += '</ul>';
      }
      if (!done) h += '<button class="actbtn p">✓ Speaking Completed</button>';
      h += '<div class="result" style="display:none"></div>';
    } else if (a.type === 'rating' && a.ratingCriteria) {
      a.ratingCriteria.forEach(function(c, i){
        h += '<div style="margin-bottom:6px"><p style="font-size:11px;color:#4b5563;margin-bottom:2px">' + esc(c) + '</p><div class="stars" data-i="' + i + '">';
        for (var s = 1; s <= 5; s++) h += '<button data-s="' + s + '" class="' + ((saved && saved[i] && saved[i] >= s) ? 'on' : '') + '">★</button>';
        h += '</div></div>';
      });
      h += '<button class="actbtn o">Submit Ratings</button>';
      h += '<div class="result" style="display:none"></div>';
    } else {
      h += '<p style="font-style:italic;color:#9ca3af">' + esc(a.type) + '</p>';
    }
    if (done) h = h.replace('<div class="result" style="display:none"></div>', '<div class="result ok">✓ +' + xp + ' XP</div>');
    h += '</div>';
    return h;
  }

  function vocabHTML(items){
    var h = '<div style="columns:2;column-gap:10px">';
    items.forEach(function(v){
      var dc = v.difficulty || 'basic';
      h += '<div class="vocabcard" data-word="' + esc(v.word) + '"><div class="w">' + esc(v.word) + '<span>' + esc(v.partOfSpeech || '') + '</span></div><div class="d">' + esc(v.definition || '') + '</div>' + (v.example ? '<div class="e">e.g. "' + esc(v.example.split('|')[0].trim().substring(0,80)) + '"</div>' : '') + '<span class="diff ' + esc(dc) + '">' + esc(dc) + '</span></div>';
    });
    h += '</div>';
    return h;
  }

  function dialogueHTML(lines){
    var h = '';
    lines.forEach(function(line, i){
      var isA = i % 2 === 0;
      h += '<div class="dlg' + (isA ? '' : ' rev') + '"><div class="av" style="background:' + (isA ? '#1a3a5c' : '#c9a84c') + '">' + esc((line.speaker || '?').charAt(0)) + '</div><div class="bub" style="background:' + (isA ? '#f0f4f8' : '#fef9e7') + ';border:1px solid ' + (isA ? '#e2e8f0' : '#fef3c7') + ';border-top-left-radius:' + (isA ? 2 : 12) + 'px;border-top-right-radius:' + (isA ? 12 : 2) + 'px"><p class="s" style="color:' + (isA ? '#1a3a5c' : '#92400e') + '">' + esc(line.speaker) + '</p><p class="t">' + esc(line.text) + '</p>' + (line.emotion ? '<p class="e">*' + esc(line.emotion) + '*</p>' : '') + '</div></div>';
    });
    return h;
  }

  function sectionHTML(sec, pageNum){
    var accent = window.__FB_COLORS__ && window.__FB_COLORS__[sec.type] || '#1a3a5c';
    var bg = window.__FB_BG__ && window.__FB_BG__[sec.type] || '#faf8f3';
    var isHorror = sec.type === 'horror-story';
    var isAd = sec.type === 'advertisement';
    var img = sec.imageUrl || (window.__FB_IMAGES__ && window.__FB_IMAGES__[sec.type]) || (sec.imageQuery ? 'https://picsum.photos/seed/' + (sec.imageQuery.split('').reduce(function(a,c){ return a + c.charCodeAt(0); },0) % 1000) + '/800/500' : 'https://picsum.photos/800/500');
    var label = (window.__FB_LABELS__ && window.__FB_LABELS__[sec.type]) || sec.type.replace(/-/g,' ');
    var paras = (sec.content || '').split('\\n').map(function(p){ return p.trim(); }).filter(function(p){ return p.length > 0; });
    var hasPod = /reading|story|news|biography|lifestyle|listening/.test(sec.type) && sec.content;

    var h = '<div class="secpage" style="background:' + bg + ';color:' + (isHorror ? '#e5e7eb' : '#1a1a1a') + ';font-family:Merriweather,Georgia,serif">';
    h += '<div class="acc" style="background:' + accent + '"></div>';
    var photoChip = PHOTO ? '<img src="' + esc(PHOTO) + '" alt="" style="width:16px;height:16px;border-radius:50%;object-fit:cover;border:1px solid ' + accent + '" />' : '';
    h += '<div class="hd" style="border-color:' + (isHorror ? 'rgba(255,255,255,.1)' : '#e8dfc8') + '"><div class="row"><span class="badge" style="background:' + accent + '">' + esc(label) + '</span><span class="pg" style="color:' + (isHorror ? '#6b7280' : '#d1d5db') + '">' + photoChip + pageNum + '</span></div><h2 style="color:' + (isHorror ? '#f3f4f6' : accent) + '">' + esc(sec.title) + '</h2></div>';

    h += '<div class="scroller" style="color:' + (isHorror ? '#d1d5db' : '#374151') + '">';
    // Full-section read-aloud narration bar (every section with content)
    if (sec.content) h += '<div class="podbar" data-narr="1"><div class="wv">' + [3,5,7,5,3,7,5,3].map(function(x){ return '<i style="height:' + x + 'px"></i>'; }).join('') + '</div><div class="t"><p>🎧 Read Aloud — ' + esc(sec.title) + '</p><p>Narration • play / pause / stop</p></div><button class="pp" data-pp="1">▶</button><button class="pp" data-pause="1" style="background:rgba(255,255,255,.15)">⏸</button><button class="st">⏹</button></div>';
    if (/reading|story|news|biography|lifestyle|listening/.test(sec.type) && sec.content) h += '<div class="podbar" data-pod="1"><div class="wv">' + [3,5,7,5,3,7,5,3].map(function(x){ return '<i style="height:' + x + 'px"></i>'; }).join('') + '</div><div class="t"><p>🎙️ ' + esc(sec.title) + '</p><p>Natural AI Voice</p></div><button class="pp">▶</button><button class="st">⏹</button></div>';
    if (!isAd) h += '<div class="heroimg"><img src="' + esc(img) + '" alt="' + esc(sec.title) + '" /><div class="tint" style="background:linear-gradient(to right,' + accent + '44,transparent 60%)"></div><div class="lbl">' + esc(sec.imageQuery || sec.title) + '</div></div>';

    if (isAd) {
      h += '<div style="text-align:center;padding:14px 0"><div style="font-size:48px;margin-bottom:10px">🎓</div><div style="display:inline-block;background:#c9a84c;color:#0d0d1a;padding:8px 16px;border-radius:20px;font-weight:900;font-size:14px">TUTORLY™</div></div>';
      h += '<div class="cols2">' + paras.map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';
    } else if (paras.length) {
      h += '<div class="cols2" style="column-rule:1px solid ' + (isHorror ? 'rgba(255,255,255,.1)' : '#e8dfc8') + '">';
      paras.forEach(function(p, i){
        if (p.length < 100 && (p === p.toUpperCase() || /^[A-Z\\s\\d:–\\-'"]+$/.test(p))) {
          h += '<div style="break-inside:avoid;margin-bottom:6px"><div style="height:1px;background:' + (isHorror ? 'rgba(255,255,255,.1)' : '#e8dfc8') + ';margin:6px 0"></div><h3 class="maghead" style="font-size:11px;font-weight:900;color:' + (isHorror ? '#f9fafb' : accent) + ';margin-bottom:4px">' + esc(p) + '</h3></div>';
        } else if (i === 0) {
          h += '<p class="dropcap" style="margin-bottom:8px;text-align:justify;color:' + (isHorror ? '#e5e7eb' : '#374151') + '">' + esc(p) + '</p>';
        } else if (i === 2 && p.length > 80) {
          h += '<div class="pullquote">"' + esc(p.substring(0,120)) + '..."</div>';
        } else {
          h += '<p style="margin-bottom:6px;text-align:justify;color:' + (isHorror ? '#d1d5db' : '#374151') + '">' + esc(p) + '</p>';
        }
      });
      h += '</div>';
    }

    if (sec.dialogue && sec.dialogue.length) h += '<div class="section-rule"></div><h3 class="maghead" style="font-size:11px;font-weight:900;color:' + accent + ';margin-bottom:8px">🗣️ Dialogue Practice</h3>' + dialogueHTML(sec.dialogue);
    if (sec.vocabulary && sec.vocabulary.length) h += '<div class="section-rule"></div><h3 class="maghead" style="font-size:11px;font-weight:900;color:' + accent + ';margin-bottom:8px">📚 Key Vocabulary</h3>' + vocabHTML(sec.vocabulary);
    if (sec.activities && sec.activities.length) {
      var all = sec.activities.every(function(a){ return isDone(a.id); });
      h += '<div class="section-rule"></div><h3 class="maghead" style="font-size:11px;font-weight:900;color:' + accent + ';display:flex;align-items:center;gap:6px;margin-bottom:4px">✏️ Activities <span style="background:' + accent + ';color:#fff;font-size:9px;padding:2px 6px;border-radius:4px;font-family:Inter,sans-serif">' + sec.activities.length + '</span>' + (all ? '<span style="color:#22c55e;font-size:11px">✓ All done!</span>' : '') + '</h3>';
      sec.activities.forEach(function(a){ h += activityHTML(a); });
    }
    h += '<div style="height:16px"></div></div>';

    h += '<div class="ft" style="border-color:' + (isHorror ? 'rgba(255,255,255,.1)' : '#e8dfc8') + ';background:' + (isHorror ? 'rgba(0,0,0,.2)' : 'rgba(250,248,243,.95)') + '"><span class="m" style="color:' + (isHorror ? '#6b7280' : '#d1d5db') + '">Tutorly Magazine</span><span><span id="pagecomplete" style="color:#16a34a;font-size:9px;display:none">✓ Page Complete&nbsp;</span><span style="color:' + (isHorror ? '#6b7280' : '#d1d5db') + '">' + pageNum + '</span></span></div>';
    h += '</div>';
    return h;
  }

  function coverHTML(){
    var h = '<div class="cover"><div class="goldbar t"></div><div class="goldbar b"></div><div class="goldbar v vl"></div><div class="goldbar v vr"></div>';
    h += '<div class="mast"><div class="row"><span>' + esc(LESSON.level) + '</span><span>' + esc(LESSON.date) + '</span></div><h1>TUTORLY</h1><p>Homework Magazine</p></div>';
    h += '<div class="issue"><span>Special Edition</span><span><b>★★★★★</b>&nbsp;Premium Issue</span></div>';
    var phInner = PHOTO
      ? '<img src="' + esc(PHOTO) + '" alt="' + esc(LEARNER_NAME) + '" style="width:100%;height:100%;object-fit:cover;object-position:top" />'
      : '<div><div style="font-size:56px;margin-bottom:6px">👩‍🎓</div><p>' + esc(LEARNER_NAME) + '</p></div>';
    h += '<div class="hero"><div class="ph">' + phInner + '</div><div class="shade"></div><div class="cap"><div><div class="nm">' + esc(LEARNER_NAME) + '</div><div class="lv">' + esc(LESSON.level) + ' • ' + esc(LESSON.topic) + '</div></div><div class="ex">EXCLUSIVE</div></div></div>';
    h += '<div class="story"><div class="mid"><i></i>This Issue<i></i></div><h2>' + esc(LESSON.title) + '</h2><p>' + esc(LESSON.coverTagline || LESSON.description) + '</p></div>';
    h += '<div class="bullets">' + ['Reading & Comprehension','Grammar Masterclass','Vocabulary Builder','Speaking & Debate','Business English','Survival Language'].map(function(b){ return '<span><b>▸</b>' + b + '</span>'; }).join('') + '</div>';
    h += '<div class="foot"><span>tutorly.com</span><span>© Tutorly Education</span></div></div>';
    return h;
  }

  function tocHTML(){
    var h = '<div class="toc"><div class="hd"><div class="row"><div><p>Contents</p><h1>Table of Contents</h1></div><div class="bk">📚</div></div><p class="sub">' + esc(LESSON.title) + ' • ' + esc(LESSON.level) + '</p></div><div class="list">';
    SECTIONS.forEach(function(sec, i){
      var ic = (window.__FB_ICONS__ && window.__FB_ICONS__[sec.type]) || '📄';
      h += '<div class="rowitem" data-go="' + (i + 2) + '"><span class="ic">' + ic + '</span><div class="tt"><b>' + esc(sec.title) + '</b><span>' + esc(sec.type.replace(/-/g,' ')) + '</span></div><div class="pg">' + (sec.activities && sec.activities.length ? '<span class="cnt">' + sec.activities.length + ' activities</span>' : '') + '<span class="n">' + (i + 3) + '</span><span class="ar">→</span></div></div>';
    });
    h += '</div><div class="ft"><span>Tutorly Homework Magazine</span><span>' + SECTIONS.length + ' sections</span></div></div>';
    return h;
  }

  function backCoverHTML(){
    var lb = generateLB();
    var myRank = lb.findIndex(function(e){ return e.me; }) + 1;
    var h = '<div class="backcover"><div class="goldbar t"></div><div class="goldbar b"></div>';
    h += '<div class="hd"><h1>🏆 Leaderboard</h1><p>Global Rankings • This Week</p></div>';
    h += '<div class="stats"><div><div class="v">⚡' + state.xp + '</div><div class="l">My XP</div></div><div><div class="v">🎓' + lvl() + '</div><div class="l">Level</div></div><div><div class="v">🏅' + state.completedPages.length + '</div><div class="l">Pages Done</div></div></div>';
    h += '<div class="board"><div class="hdr"><span>#</span><span>Learner</span><span>XP</span><span>Lv.</span></div><div class="rows">';
    lb.slice(0, 12).forEach(function(e, i){
      h += '<div class="r' + (e.me ? ' me' : '') + '"><span class="rank">' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)) + '</span><span class="nm"><span class="av">' + e.avatar + '</span><span>' + esc(e.name) + (e.me ? ' (You)' : '') + '<span class="ct"><br>' + e.flag + ' ' + esc(e.country) + '</span></span></span><span class="xp">' + e.xp + '</span><span class="lv">' + e.level + '</span></div>';
    });
    h += '</div></div>';
    h += '<div class="rankline">Your rank: <b>#' + myRank + '</b> of ' + lb.length + ' learners • ' + state.completedPages.length + ' pages completed</div>';
    h += '<div class="brand"><p><span>Tutorly</span> Homework Magazine</p><p>' + esc(LESSON.title) + ' • ' + esc(LESSON.date) + ' • tutorly.com</p></div></div>';
    return h;
  }

  function generateLB(){
    var fakes = [
      ['Amara O.','Nigeria','🇳🇬','👩🏿‍🎓'],['Hiroshi T.','Japan','🇯🇵','👨🏻‍💼'],['Sofia M.','Brazil','🇧🇷','👩🏽‍🎨'],['Dmitri K.','Russia','🇷🇺','🧑🏻‍💻'],['Priya S.','India','🇮🇳','👩🏽‍🔬'],['Carlos R.','Mexico','🇲🇽','👨🏽‍🏫'],['Yuki N.','Japan','🇯🇵','👩🏻‍🎤'],['Ibrahim A.','Egypt','🇪🇬','🧑🏽‍💼'],['Elena V.','Ukraine','🇺🇦','👩🏻‍🏫'],['Kwame B.','Ghana','🇬🇭','👨🏿‍🎓'],['Mei L.','China','🇨🇳','👩🏻‍💻'],['Ahmed F.','Morocco','🇲🇦','🧔🏽']
    ];
    var rng = function(min, max, s){ var x = Math.sin(s) * 10000; return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min; };
    var list = fakes.map(function(f, i){ return { name: f[0], country: f[1], flag: f[2], avatar: f[3], xp: rng(50,400,42 + i*7), level: rng(1,5,42 + i*3), me: false }; });
    list.push({ name: LEARNER_NAME || 'You', country: 'Your Country', flag: '🌟', avatar: '👩‍🎓', xp: state.xp, level: lvl(), me: true });
    return list.sort(function(a, b){ return b.xp - a.xp; });
  }

  function pageHTML(i){
    if (i <= 0) return coverHTML();
    if (i === 1) return tocHTML();
    if (i >= TOTAL - 1) return backCoverHTML();
    return sectionHTML(SECTIONS[i - 2], i + 1);
  }

  function render(){
    var book = $('#book');
    var slotL = $('#slotL'), slotR = $('#slotR');
    var leaf = $('#leaf'), leafF = $('#leafF');
    var sh = $('#turnsh'), spine = $('#spine');
    var pw = pageW(), ph = pageH();
    book.style.width = spreadW() + 'px';
    book.style.height = ph + 'px';
    slotL.style.width = pw + 'px'; slotL.style.height = ph + 'px'; slotL.style.left = '0px'; slotL.style.top = '0px';
    slotR.style.width = pw + 'px'; slotR.style.height = ph + 'px'; slotR.style.left = (isMobile() ? 0 : pw + 8) + 'px'; slotR.style.top = '0px';
    spine.style.left = (pw - 4) + 'px';

    var leftHtml = '', rightHtml = '';
    if (turning) {
      var to = turning.to;
      if (isMobile()) rightHtml = pageHTML(to);
      else if (turning.dir === 1) rightHtml = pageHTML(to);
      else leftHtml = pageHTML(to - 1);
    } else {
      if (!isMobile() && state.page - 1 >= 0) leftHtml = pageHTML(state.page - 1);
      rightHtml = pageHTML(state.page);
    }
    slotL.className = 'slot' + (leftHtml ? ' l' : '');
    slotR.className = 'slot' + (rightHtml ? ' r' : '');
    slotL.innerHTML = leftHtml;
    slotR.innerHTML = rightHtml;

    if (turning) {
      // Restart the animation even for same-direction consecutive turns.
      leaf.style.display = 'none'; void leaf.offsetWidth;
      leafF.innerHTML = pageHTML(turning.from);
      leaf.style.width = pw + 'px'; leaf.style.height = ph + 'px';
      leaf.style.left = (isMobile() ? 0 : (turning.dir === 1 ? pw + 8 : 0)) + 'px';
      leaf.style.top = '0px';
      leaf.className = 'leaf ' + (turning.dir === 1 ? 'next' : 'prev');
      leaf.style.display = 'block';
      sh.style.width = pw + 'px';
      sh.style.left = (isMobile() ? 0 : (turning.dir === 1 ? 0 : pw + 8)) + 'px';
      sh.className = 'turnsh ' + (turning.dir === 1 ? 'next' : 'prev');
      sh.style.display = 'block';
    } else {
      leaf.style.display = 'none';
      sh.style.display = 'none';
    }
    renderBar();
    bindPage();
  }

  /* ── interactions ── */
  function bindPage(){
    var pg = $('#book');
    $$('.rowitem', pg).forEach(function(el){ el.addEventListener('click', function(){ goTo(+el.getAttribute('data-go')); }); });
    $$('.mcopt', pg).forEach(function(b){
      b.addEventListener('click', function(){
        var card = b.closest('.actcard'), id = card.getAttribute('data-id');
        var opts = $$('.mcopt', card); opts.forEach(function(o){ o.classList.remove('sel'); }); b.classList.add('sel');
        var act = findAct(id);
        var correct = act.correctAnswer != null && String(b.getAttribute('data-o')) === String(act.correctAnswer);
        opts.forEach(function(o){ o.disabled = true; });
        if (correct) { b.classList.add('ok'); } else { b.classList.add('bad'); }
        var res = $('.result', card);
        res.style.display = 'block';
        res.className = 'result ' + (correct ? 'ok' : 'no');
        res.textContent = correct ? '✓ Correct! +' + (act.xpReward || 10) + ' XP' : '✗ The answer is: ' + act.correctAnswer;
        if (correct) addXP(act.xpReward || 10); else sndBad();
        markDone(id, b.getAttribute('data-o'));
      });
    });
    $$('.actbtn', pg).forEach(function(b){
      b.addEventListener('click', function(){
        var card = b.closest('.actcard'), id = card.getAttribute('data-id'), act = findAct(id);
        if (act.type === 'fill-blanks') {
          var all = true, ok = true;
          act.blanks.forEach(function(bl){
            var inp = $('input[data-b="' + bl.id + '"]', card);
            var v = inp.value.trim().toLowerCase(), a = bl.answer.trim().toLowerCase();
            if (!v) all = false;
            var good = v === a;
            inp.classList.remove('ok','bad'); inp.classList.add(good ? 'ok' : 'bad');
            if (!good) ok = false;
            if (!good) { var ex = document.createElement('span'); ex.textContent = '(' + bl.answer + ')'; ex.style.cssText = 'color:#16a34a;font-size:11px'; inp.parentElement.appendChild(ex); }
          });
          var res = $('.result', card); res.style.display = 'block'; res.className = 'result ' + (all && ok ? 'ok' : 'no');
          res.textContent = all && ok ? '✓ Correct! +' + (act.xpReward || 10) + ' XP' : (all ? '✗ Some answers are wrong' : '✗ Fill every blank first');
          if (all && ok) addXP(act.xpReward || 10); else if (all) sndBad();
          if (all) markDone(id, answersObj(act));
        } else if (act.type === 'matching') {
          var sel = $$('select', card).map(function(s){ return s.value; });
          var filled = sel.every(function(v){ return v !== ''; });
          var correct = sel.every(function(v, i){ return v === act.pairs[i].right; });
          $$('select', card).forEach(function(s, i){ var m = $('.mk', s.parentElement); if (filled) { s.classList.remove('ok','bad'); s.classList.add(s.value === act.pairs[i].right ? 'ok' : 'bad'); m.textContent = s.value === act.pairs[i].right ? '✓' : '✗'; m.style.color = s.value === act.pairs[i].right ? '#22c55e' : '#ef4444'; } });
          var res = $('.result', card); res.style.display = 'block'; res.className = 'result ' + (filled && correct ? 'ok' : 'no');
          res.textContent = filled && correct ? '✓ All matched! +' + (act.xpReward || 10) + ' XP' : (filled ? '✗ Some matches are wrong' : '✗ Match every pair first');
          if (filled && correct) addXP(act.xpReward || 10); else if (filled) sndBad();
          if (filled) markDone(id, sel);
        } else if (act.type === 'short-answer') {
          var ta = $('.shortans', card), v = ta.value.trim();
          if (!v) return;
          var res = $('.result', card); res.style.display = 'block'; res.className = 'result ok';
          res.textContent = '✓ Answer saved! +' + (act.xpReward || 10) + ' XP';
          addXP(act.xpReward || 10); markDone(id, v);
        } else if (act.type === 'discussion') {
          var res = $('.result', card); res.style.display = 'block'; res.className = 'result ok';
          res.textContent = '✓ Discussed! +' + (act.xpReward || 10) + ' XP';
          addXP(act.xpReward || 10); markDone(id, 'discussed');
        } else if (act.type === 'dictation') {
          var inp = $('.dictin', card), v = inp.value.trim();
          if (!v) return;
          var target = String(act.text || act.correctAnswer || '').trim();
          var norm = function(s){ return s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\\s+/g, ' ').trim(); };
          var exact = norm(v) === norm(target);
          var res = $('.result', card); res.style.display = 'block'; res.className = 'result ' + (exact ? 'ok' : 'no');
          if (exact) { res.textContent = '✓ Perfect dictation! +' + (act.xpReward || 10) + ' XP'; addXP(act.xpReward || 10); }
          else {
            // word-by-word diff feedback
            var tw = target.split(/\\s+/), aw = v.split(/\\s+/), diffs = [];
            for (var wi = 0; wi < Math.max(tw.length, aw.length); wi++) {
              if (tw[wi] !== aw[wi]) diffs.push(tw[wi] ? '"' + tw[wi] + '"' : '…');
            }
            res.textContent = '✗ Not quite. Check: ' + diffs.slice(0, 5).join(', ') + ' — Expected: ' + target;
            sndBad();
          }
          if (exact) markDone(id, v);
        } else if (act.type === 'speaking' || act.type === 'roleplay') {
          var res = $('.result', card); res.style.display = 'block'; res.className = 'result ok';
          res.textContent = '✓ Speaking done! +' + (act.xpReward || 10) + ' XP';
          addXP(act.xpReward || 10); markDone(id, 'speaking-done');
        } else if (act.type === 'rating') {
          var res = $('.result', card); res.style.display = 'block'; res.className = 'result ok';
          res.textContent = '✓ Rated! +' + (act.xpReward || 10) + ' XP';
          addXP(act.xpReward || 10); markDone(id, ratingsObj(card));
        }
      });
    });
    $$('.stars button', pg).forEach(function(s){
      s.addEventListener('click', function(){ var row = s.parentElement; $$('.stars button', row.parentElement).forEach(function(x){ x.classList.remove('on'); }); for (var i = 0; i < +s.getAttribute('data-s'); i++) $$('.stars button', row.parentElement)[i].classList.add('on'); });
    });
    // dictation play buttons
    $$('[data-dict]', pg).forEach(function(b){
      b.addEventListener('click', function(){
        var card = b.closest('.actcard'), act = findAct(card.getAttribute('data-id'));
        speak(act.text || (typeof act.correctAnswer === 'string' ? act.correctAnswer : ''), state.voice || null, state.rate ? state.rate * .85 : .85);
      });
    });
    // dictation mic buttons — accept spoken answers via SpeechRecognition (scored like typed)
    $$('[data-mic]', pg).forEach(function(b){
      b.addEventListener('click', function(){
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { alert('Speech recognition is not supported in this browser — please type your answer.'); return; }
        var card = b.closest('.actcard'), inp = $('.dictin', card);
        if (!inp || inp.disabled) return;
        if (b.getAttribute('data-live') === '1') { b.textContent = '🎤'; b.removeAttribute('data-live'); try { b._rec && b._rec.stop(); } catch (e3) {} return; }
        try {
          var r = new SR();
          r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
          r.onresult = function(e){ try { inp.value = e.results[0][0].transcript; } catch (e2) {} b.textContent = '🎤'; b.removeAttribute('data-live'); };
          r.onerror = function(){ b.textContent = '🎤'; b.removeAttribute('data-live'); };
          r.onend = function(){ b.textContent = '🎤'; b.removeAttribute('data-live'); };
          b._rec = r;
          b.textContent = '🔴';
          b.setAttribute('data-live', '1');
          r.start();
        } catch (e2) { b.textContent = '🎤'; b.removeAttribute('data-live'); }
      });
    });
    // narration bar (play / pause / stop, every section)
    var narr = $('[data-narr]', pg);
    if (narr) {
      var ppBtn = $('[data-pp]', narr), pauseBtn = $('[data-pause]', narr), stopBtn = $('.st', narr);
      var stopUI = function(){ ppBtn.textContent = '▶'; $$('.wv i', narr).forEach(function(w){ w.classList.remove('on'); }); };
      ppBtn.addEventListener('click', function(){
        if (ppBtn.textContent === '⏸') { window.speechSynthesis.cancel(); stopUI(); return; }
        var sec = SECTIONS[state.page - 2];
        if (!sec || !sec.content) return;
        speak(sec.content, state.voice || null, state.rate || .95);
        ppBtn.textContent = '⏸';
        $$('.wv i', narr).forEach(function(w, i){ w.classList.add('on'); w.style.animationDelay = (i * .08) + 's'; });
        var poll = setInterval(function(){ if (!window.speechSynthesis.speaking && !window.speechSynthesis.paused) { clearInterval(poll); stopUI(); } }, 500);
      });
      pauseBtn.addEventListener('click', function(){
        try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); else if (window.speechSynthesis.speaking) window.speechSynthesis.pause(); } catch (e2) {}
        ppBtn.textContent = window.speechSynthesis.paused ? '▶' : '⏸';
      });
      stopBtn.addEventListener('click', function(){ window.speechSynthesis.cancel(); stopUI(); });
    }
    // podcast (classic player for reading/story/news sections only — narration bar above covers all sections)
    $$('.podbar[data-pod]', pg).forEach(function(p){
      var sec = SECTIONS[state.page - 2];
      if (!sec) return;
      var btn = $('.pp', p);
      if (!btn) return;
      btn.addEventListener('click', function(){
        var playing = btn.textContent === '⏸';
        if (playing) { window.speechSynthesis.cancel(); btn.textContent = '▶'; $$('.wv i', p).forEach(function(w){ w.classList.remove('on'); }); return; }
        speak(sec.content, state.voice || null, state.rate ? state.rate * .9 : .9);
        btn.textContent = '⏸';
        $$('.wv i', p).forEach(function(w, i){ w.classList.add('on'); w.style.animationDelay = (i * .08) + 's'; });
        var poll = setInterval(function(){ if (!window.speechSynthesis.speaking && !window.speechSynthesis.paused) { clearInterval(poll); btn.textContent = '▶'; $$('.wv i', p).forEach(function(w){ w.classList.remove('on'); }); } }, 500);
      });
      $('.st', p).addEventListener('click', function(){ window.speechSynthesis.cancel(); btn.textContent = '▶'; $$('.wv i', p).forEach(function(w){ w.classList.remove('on'); }); });
    });
    // vocab hover lookup
    $$('.vocabcard', pg).forEach(function(c){
      c.addEventListener('mouseenter', function(){ lookupTip(c); });
      c.addEventListener('mouseleave', function(){ var t = $('#vocabtip'); if (t) t.remove(); });
    });
    // completion badge
    if (state.completedPages.indexOf(state.page) >= 0 && state.page >= 2 && state.page <= TOTAL - 2) {
      var b = document.createElement('div'); b.className = 'complete-badge'; b.textContent = '✓'; pg.appendChild(b);
    }
  }

  function findAct(id){ for (var i = 0; i < SECTIONS.length; i++) { var a = (SECTIONS[i].activities || []).filter(function(x){ return x.id === id; }); if (a.length) return a[0]; } return {}; }
  function answersObj(act){ var o = {}; act.blanks.forEach(function(b){ var inp = $('input[data-b="' + b.id + '"]'); if (inp) o[b.id] = inp.value; }); return o; }
  function ratingsObj(card){ var o = {}; $$('.stars', card).forEach(function(row, i){ var n = 0; $$('button', row).forEach(function(s){ if (s.classList.contains('on')) n++; }); o[i] = n; }); return o; }

  /* dictionary */
  function lookupTip(card){
    var w = card.getAttribute('data-word'); if (!w) return;
    fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w)).then(function(r){ return r.json(); }).then(function(d){
      var e = d && d[0]; if (!e) return;
      var tip = document.createElement('div'); tip.id = 'vocabtip'; tip.className = 'vocabtip';
      tip.innerHTML = '<b>' + esc(e.word) + '</b> ' + (e.phonetic ? '<span style="color:#9ca3af;font-family:ui-monospace,monospace">' + esc(e.phonetic) + '</span>' : '') + '<div style="margin-top:4px;color:#374151">' + (e.meanings[0] ? esc(e.meanings[0].definitions[0].definition) : '') + '</div>';
      document.body.appendChild(tip);
      var r = card.getBoundingClientRect(); tip.style.left = Math.min(r.left, innerWidth - 220) + 'px'; tip.style.top = (r.top + r.height + 6) + 'px';
    }).catch(function(){});
  }

  var menu = null;
  document.addEventListener('contextmenu', function(e){
    var sel = (window.getSelection() || '').toString().trim();
    if (!sel || sel.length > 60) return;
    e.preventDefault();
    if (menu) menu.remove();
    menu = document.createElement('div'); menu.className = 'context-menu';
    menu.style.left = Math.min(e.clientX, innerWidth - 200) + 'px'; menu.style.top = e.clientY + 'px';
    menu.innerHTML = '<div class="t">"' + esc(sel.substring(0,30)) + (sel.length > 30 ? '…' : '') + '"</div><button data-a="define">📖 Define (Free Dictionary)</button><button data-a="translate">🌐 Translate (Google)</button><button data-a="google">🔍 Search Google</button>';
    document.body.appendChild(menu);
    $$('button', menu).forEach(function(b){
      b.addEventListener('click', function(){
        var a = b.getAttribute('data-a'); menu.remove(); menu = null;
        if (a === 'translate') window.open('https://translate.google.com/?sl=en&text=' + encodeURIComponent(sel), '_blank');
        else if (a === 'google') window.open('https://www.google.com/search?q=' + encodeURIComponent(sel + ' meaning'), '_blank');
        else openDict(sel);
      });
    });
  });
  document.addEventListener('click', function(){ if (menu) { menu.remove(); menu = null; } });

  function openDict(word){
    var m = document.createElement('div'); m.className = 'dictmodal';
    m.innerHTML = '<div class="box"><div class="hd"><h3>📖 Dictionary</h3><button>✕</button></div><div class="bd"><p style="color:#9ca3af">Looking up "' + esc(word) + '"…</p></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function(e){ if (e.target === m || e.target.closest('.hd button')) m.remove(); });
    fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word)).then(function(r){ return r.json(); }).then(function(d){
      var e = d && d[0]; if (!e) { m.querySelector('.bd').innerHTML = '<p style="color:#dc2626">Definition not found.</p>'; return; }
      var h = '<h2>' + esc(e.word) + '</h2>' + (e.phonetic ? '<span class="ph">' + esc(e.phonetic) + '</span>' : '');
      (e.meanings || []).slice(0, 3).forEach(function(mn){
        h += '<div class="m"><span class="pos">' + esc(mn.partOfSpeech) + '</span>';
        (mn.definitions || []).slice(0, 2).forEach(function(df){
          h += '<div class="def">' + esc(df.definition) + '</div>' + (df.example ? '<div class="ex">"' + esc(df.example) + '"</div>' : '');
        });
        if (mn.synonyms && mn.synonyms.length) h += '<div class="syn">' + mn.synonyms.slice(0,5).map(function(s){ return '<span>' + esc(s) + '</span>'; }).join('') + '</div>';
        h += '</div>';
      });
      m.querySelector('.bd').innerHTML = h;
    }).catch(function(){ m.querySelector('.bd').innerHTML = '<p style="color:#dc2626">Definition not found.</p>'; });
  }

  /* cat assistant */
  var CATS = ['😺','😸','😹','😻','😼','😽','🐱'];
  var QUOTES = ["You're doing BRILLIANTLY! Keep it up! 🌟","Every mistake is a lesson in disguise! 🎓","I believe in you more than catnip! 🐱","Reading is purr-fect for your brain! 📚","Meow! You just got smarter! ✨","Language learning is an adventure — enjoy it! 🌍","Even I had to learn to meow properly! Practice makes perfect! 🎯","Your tutor is SO proud of you right now! 💫","Challenge accepted? Challenge CONQUERED! 💪","You're in the top percentile of cool learners! 🏆","Curiosity didn't kill the cat — it made them fluent! 😻","Take a deep breath. You've got this! 🌸"];
  function catQuote(){
    var q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    var b = document.createElement('div'); b.className = 'catbub'; b.textContent = q;
    document.body.appendChild(b);
    if (state.sound) speak(q, state.voice || null, state.rate ? state.rate * 1.1 : 1.1);
    setTimeout(function(){ b.remove(); }, 4200);
  }
  var cat = document.createElement('button'); cat.className = 'cat'; cat.textContent = '😺'; cat.title = 'Cat Assistant';
  cat.addEventListener('click', function(){ cat.textContent = CATS[Math.floor(Math.random() * CATS.length)]; catQuote(); });
  document.body.appendChild(cat);

  /* shell */
  document.body.innerHTML = '<div class="app"><div class="xpbar"><span class="brand">Tutorly</span><span style="width:1px;height:18px;background:rgba(255,255,255,.2);display:none"></span><div class="lvl" id="lvl">1</div><div class="who" id="who"></div><div class="xpwrap"><span>XP</span><div class="track"><div class="fill" id="fill"></div></div><span class="xptxt" id="xpnum">0</span></div><div class="pgtrack"><span>Pg</span><div class="pgfill"><i id="pgfill"></i></div><span id="pgpct">0%</span></div><div class="done"><span>🏅</span><span id="done">0 done</span></div><button class="snd" id="snd">🔊</button></div><div class="controls"><button class="cbtn" id="contents">📋 <span>Contents</span></button><div class="navmid"><button class="round" id="nv">‹</button><span class="pageno" id="pgnum">1 / 1</span><button class="round" id="nx">›</button></div><div class="narrpick"><select id="vsel" title="Read-aloud voice"><option value="">🎧 Auto voice</option></select><select id="rsel" title="Narration speed"><option value="0.7">0.7×</option><option value="0.85">0.85×</option><option value="0.95">0.95×</option><option value="1.1">1.1×</option><option value="1.25">1.25×</option></select></div><div class="navmid"><button class="gold" id="restart">↺ Restart</button></div></div><div class="stage"><div id="book" class="book"><div class="slot" id="slotL"></div><div class="slot" id="slotR"></div><div class="spine" id="spine"></div><div class="leaf" id="leaf" style="display:none"><div class="face" id="leafF"></div><div class="faceb">✦</div></div><div class="turnsh" id="turnsh" style="display:none"></div></div></div><div class="mobilenav"><button id="mv">‹</button><span class="pageno" id="mpgnum"></span><button id="mx">›</button></div><div class="hint"><p>← → arrow keys to flip • Right-click text for dictionary</p></div></div>';

  var contentsOpen = false;
  $('#contents').addEventListener('click', function(){
    contentsOpen = !contentsOpen;
    if (contentsOpen) {
      var ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'tocov';
      ov.innerHTML = '<div class="panel">' + tocHTML() + '</div>';
      document.body.appendChild(ov);
      $$('.rowitem', ov).forEach(function(el){ el.addEventListener('click', function(){ goTo(+el.getAttribute('data-go')); closeToc(); }); });
      ov.addEventListener('click', function(e){ if (e.target === ov) closeToc(); });
    } else closeToc();
  });
  function closeToc(){ var ov = $('#tocov'); if (ov) ov.remove(); contentsOpen = false; }

  /* narration voice & rate picker (persisted with progress) */
  function loadVoices(){
    try {
      var vs = window.speechSynthesis.getVoices();
      var sel = $('#vsel'), cur = state.voice || '';
      var html = '<option value="">🎧 Auto voice</option>';
      vs.forEach(function(v){
        if (!v.lang || v.lang.indexOf('en') !== 0) return;
        html += '<option value="' + esc(v.name) + '"' + (cur === v.name ? ' selected' : '') + '>' + esc(v.name.replace(/\s*\(.*?\)/g, '')) + (v.lang !== 'en-US' ? ' (' + v.lang + ')' : '') + '</option>';
      });
      sel.innerHTML = html;
      sel.value = cur;
    } catch (e) {}
  }
  loadVoices();
  try { window.speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) {}
  $('#vsel').addEventListener('change', function(){ state.voice = this.value; save(); });
  $('#rsel').addEventListener('change', function(){ state.rate = parseFloat(this.value); save(); });
  (function(){
    var r = $('#rsel'), cur = state.rate || 0.95;
    Array.prototype.forEach.call(r.options, function(o){ if (parseFloat(o.value) === cur) o.selected = true; });
  })();

  $('#nv').addEventListener('click', prev);
  $('#nx').addEventListener('click', next);
  $('#mv').addEventListener('click', prev);
  $('#mx').addEventListener('click', next);
  $('#restart').addEventListener('click', function(){ if (confirm('Restart this magazine? Your XP and progress will be reset.')) { try { localStorage.removeItem(LS_KEY); } catch (e) {} location.reload(); } });
  $('#snd').addEventListener('click', function(){ state.sound = !state.sound; $('#snd').textContent = state.sound ? '🔊' : '🔇'; save(); });
  document.addEventListener('keydown', function(e){
    if (['INPUT','TEXTAREA','SELECT'].indexOf((e.target || {}).tagName) >= 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
  });
  var corners = document.createElement('div');
  corners.innerHTML = '<div class="corner l"></div><div class="corner r"></div>';
  $('#book').appendChild(corners);
  $('.corner.l').addEventListener('click', prev);
  $('.corner.r').addEventListener('click', next);
  addEventListener('resize', render);

  render();
})();
`;