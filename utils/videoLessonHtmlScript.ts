// Engine injected as <script> into the standalone Video Lesson HTML.
// Written without backticks or </script> sequences; all runtime HTML uses
// double-quoted attributes and single-quoted JS strings.
export const videoLessonHtmlScript = `
(function () {
  var DATA = window.__VL__ || {};
  var LESSON = DATA.lesson;
  var FILE_NAME = DATA.fileName || 'Video_Lesson';
  var LEARNER_NAME = DATA.learnerName || 'Learner';
  var INCLUDE_VIDEO = DATA.includeVideo !== false;
  // Native-language support: every activity can carry an L1 twin, which is shown
  // as an "easy version" line under the English task.
  var LEARNER_L1 = (LESSON.metadata && LESSON.metadata.learnerL1) ||
    (LESSON.learnerProfile && LESSON.learnerProfile.nativeLanguage) || 'your language';
  var SEG = LESSON.segments || [];
  var TOTAL = SEG.reduce(function (n, s) { return n + (s.activities || []).length; }, 0);
  var STORE_KEY = 'video-lesson-progress-' + LEARNER_NAME;
  var MIRROR_KEY = 'tutorly-video-lessons-' + LEARNER_NAME;

  var LS = {
    xp: 0, level: 1, streak: 0, badges: [], done: {}, mediaUrl: '',
  };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    if (saved && typeof saved === 'object') {
      LS.xp = saved.xp || 0; LS.level = saved.level || 1; LS.streak = saved.streak || 0;
      LS.badges = saved.badges || []; LS.done = saved.done || {};
      LS.mediaUrl = saved.mediaUrl || '';
    }
  } catch (e) { /* noop */ }

  var state = {
    xp: LS.xp, level: LS.level, streak: LS.streak, badges: LS.badges.slice(), done: LS.done || {},
    currentSeg: -1, openSeg: 0, mode: 'lesson', ui: 'lesson', // mode: lesson | stream; ui: which tab inside lesson
    subCues: [], subIdx: 0, playerType: 'none', ytId: '', seekTimer: null,
    searchResults: [], searchLoading: false,
    party: null, partyRole: '', partyName: '',
    mirrorTimer: null,
  };
  var PTS = LESSON.globalSettings && LESSON.globalSettings.pointsToLevelUp ? LESSON.globalSettings.pointsToLevelUp : 500;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(t) {
    t = Math.max(0, Math.floor(t || 0));
    var m = Math.floor(t / 60), s = t % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        xp: state.xp, level: state.level, streak: state.streak,
        badges: state.badges, done: state.done, mediaUrl: state.playerUrl || '',
        updatedAt: Date.now(),
      }));
      mirror();
    } catch (e) { /* noop */ }
  }
  function mirror() {
    try {
      var all = JSON.parse(localStorage.getItem(MIRROR_KEY) || '[]');
      var rec = {
        fileName: FILE_NAME, title: LESSON.metadata.title, learnerName: LEARNER_NAME, name: LEARNER_NAME,
        xp: state.xp, level: state.level, streak: state.streak, badges: state.badges,
        completed: Object.keys(state.done).length, total: TOTAL, updatedAt: Date.now(),
      };
      var i = -1;
      for (var k = 0; k < all.length; k++) { if (all[k].fileName === FILE_NAME) { i = k; break; } }
      if (i >= 0) all[i] = rec; else all.push(rec);
      localStorage.setItem(MIRROR_KEY, JSON.stringify(all.slice(-40)));
    } catch (e) { /* noop */ }
  }
  function levelUp() {
    while (state.xp >= state.level * PTS) {
      state.xp -= state.level * PTS; state.level++;
    }
  }
  function award(points, activity) {
    state.xp += points; state.streak++;
    if (!state.done[activity.id]) {
      state.done[activity.id] = true;
      var badgeIds = badgeCheck(activity);
      if (badgeIds.length) {
        state.badges = state.badges.concat(badgeIds.filter(function (b) { return state.badges.indexOf(b) < 0; }));
        var names = badgeIds.map(function (id) {
          var b = (LESSON.badges || []).filter(function (x) { return x.id === id; })[0];
          return b ? b.emoji + ' ' + b.name : id;
        }).join('  ');
        banner('🏅 Badge earned! ' + names);
      }
    }
    // Deliberately does NOT rebuild the segment list: the learner keeps the
    // feedback they just earned on screen. Only the progress chrome refreshes.
    levelUp(); save(); renderTop(); refreshChips(); banner('+' + points + ' XP');
  }
  function badgeCheck(activity) {
    var out = [];
    var vocab = ['flashcard', 'multipleChoice', 'fillBlanks', 'wordScramble', 'matching', 'dragDrop'];
    if (Object.keys(state.done).length === 1) out.push('first_answer');
    var vc = 0;
    Object.keys(state.done).forEach(function (id) { /* count from lesson map below */ });
    if (activity && vocab.indexOf(activity.type) >= 0 && state.vocabCount === undefined) { state.vocabCount = 1; }
    if (activity && vocab.indexOf(activity.type) >= 0) { state.vocabCount = (state.vocabCount || 0) + 1; if (state.vocabCount >= 3) out.push('word_master'); }
    if (state.streak >= 5) out.push('streak_5');
    if (activity && activity.type === 'speaking') out.push('perfect_speaker');
    return out;
  }
  function banner(msg) {
    var el = $('#vl-banner');
    if (!el) return;
    el.innerHTML = msg; el.className = 'vl-banner show';
    clearTimeout(banner._t);
    banner._t = setTimeout(function () { el.className = 'vl-banner'; }, 2400);
  }
  function note(msg) { var n = $('#vl-note'); if (n) n.textContent = msg; }

  /* ---------- rendering ---------- */
  function allActs() {
    var out = [];
    SEG.forEach(function (s, si) {
      (s.activities || []).forEach(function (a) { out.push({ act: a, seg: s, si: si }); });
    });
    return out;
  }
  function actById(id) {
    var hit = null;
    allActs().forEach(function (x) { if (x.act.id === id) hit = x; });
    return hit;
  }
  function renderTop() {
    var pct = TOTAL ? Math.round(Object.keys(state.done).length / TOTAL * 100) : 0;
    $('#vl-xp').textContent = state.xp + ' XP';
    $('#vl-lvl').textContent = 'Lv.' + state.level;
    $('#vl-streak').textContent = '🔥' + state.streak;
    var badgesEl = $('#vl-badges');
    if (badgesEl) badgesEl.innerHTML = state.badges.map(function (id) {
      var b = (LESSON.badges || []).filter(function (x) { return x.id === id; })[0];
      return b ? b.emoji : '🏅';
    }).join('');
    $('#vl-prog-fill').style.width = pct + '%';
    $('#vl-prog-txt').textContent = Object.keys(state.done).length + '/' + TOTAL;
    // segment progress
    SEG.forEach(function (s, si) {
      var done = (s.activities || []).filter(function (a) { return state.done[a.id]; }).length;
      var p = document.getElementById('vl-segprog-' + si);
      if (p) p.style.width = (s.activities && s.activities.length) ? Math.round(done / s.activities.length * 100) + '%' : '0%';
    });
    // per-seg activity states
    allActs().forEach(function (x) {
      var card = document.getElementById('vl-act-' + esc(x.act.id));
      if (card && state.done[x.act.id]) card.style.opacity = '0.75';
    });
    // Keep the open chapter's "next" CTA honest without rebuilding the chapter
    // (rebuilding would throw away the feedback the learner just read).
    SEG.forEach(function (s, si) {
      var btn = document.getElementById('vl-cta-' + si);
      if (!btn) return;
      var left = requiredLeft(si);
      var d = segDone(si);
      var complete = d.total > 0 && d.done >= d.total;
      if (si === SEG.length - 1) {
        btn.className = 'vl-btn ok';
        btn.textContent = '🎉 Save my results';
        btn.disabled = !complete;
      } else {
        btn.className = 'vl-btn' + (left ? '' : ' ok');
        btn.textContent = left
          ? '🔒 Finish ' + left + ' required activit' + (left === 1 ? 'y' : 'ies') + ' to unlock'
          : 'Next chapter →';
        btn.disabled = left > 0;
      }
      btn.style.opacity = btn.disabled ? '.6' : '1';
    });
  }
  function segDone(si) {
    var s = SEG[si];
    var acts = (s && s.activities) || [];
    return { done: acts.filter(function (a) { return state.done[a.id]; }).length, total: acts.length };
  }
  function requiredLeft(si) {
    var s = SEG[si]; if (!s) return 0;
    return (s.activities || []).filter(function (a) { return a.requiredForNext && !state.done[a.id]; }).length;
  }
  function chipHtml() {
    return SEG.map(function (s, i) {
      var d = segDone(i);
      var complete = d.total > 0 && d.done >= d.total;
      return '<button class="vl-segmark' + (state.openSeg === i ? ' active' : '') + (complete ? ' complete' : '') + '" onclick="VL.goSeg(' + i + ')">' +
        (complete ? '✓' : (i + 1) + '.') + ' ' + esc(s.title) +
        '<span class="t">' + fmt(s.startTime) + ' · ' + d.done + '/' + d.total + '</span></button>';
    }).join('');
  }
  function refreshChips() {
    var nav = $('#vl-segbar');
    if (nav) nav.innerHTML = chipHtml();
  }
  /**
   * One chapter at a time (progressive disclosure): the open chapter shows its
   * activities and a gated CTA; the rest stay as scannable summary rows, so the
   * lesson reads as a guided flow instead of one endless scroll.
   */
  function renderSegs() {
    var nav = $('#vl-segbar'); if (!nav) return;
    if (typeof state.openSeg !== 'number') state.openSeg = 0;
    nav.innerHTML = chipHtml();
    var wrap = $('#vl-segs');
    if (!wrap) return;
    wrap.innerHTML = SEG.map(function (s, si) {
      var d = segDone(si);
      var complete = d.total > 0 && d.done >= d.total;
      var open = state.openSeg === si;
      var head =
        '<div class="vl-seg-head"><span class="vl-seg-num">' + (complete ? '✓' : (si + 1)) + '</span>' +
        '<span class="vl-seg-title">' + esc(s.title) + '</span>' +
        '<span class="vl-act-type">' + d.done + '/' + d.total + ' activities</span>' +
        '<span class="vl-seg-time">⏱ ' + fmt(s.startTime) + ' – ' + fmt(s.endTime) + '</span>' +
        '<button class="vl-btn" style="margin-left:auto" onclick="VL.toggleSeg(' + si + ')">' + (open ? 'Collapse ▴' : 'Open chapter ▾') + '</button></div>';
      var prog = '<div class="vl-seg-prog"><div class="fill" id="vl-segprog-' + si + '" style="width:' + (d.total ? Math.round(d.done / d.total * 100) : 0) + '%"></div></div>';
      var desc = '<div class="vl-seg-desc">' + esc(s.summary || s.description || '') + '</div>';
      if (!open) {
        var preview = (s.activities || []).map(function (a) { return esc(a.emoji || '🎯') + ' ' + esc(a.title || a.type); }).join(' · ');
        return '<div class="vl-seg vl-seg-collapsed" id="vl-seg-' + si + '">' + head + prog + desc +
          (preview ? '<div class="vl-seg-preview">' + preview + '</div>' : '') + '</div>';
      }
      var acts = (s.activities || []).map(function (a, ai) { return actHtml(a, si, ai); }).join('');
      var left = requiredLeft(si);
      var isLast = si === SEG.length - 1;
      var cta = isLast
        ? '<button id="vl-cta-' + si + '" class="vl-btn ok"' + (complete ? '' : ' disabled style="opacity:.6"') + ' onclick="VL.finishLesson()">🎉 Save my results</button>'
        : '<button id="vl-cta-' + si + '" class="vl-btn' + (left ? '' : ' ok') + '"' + (left ? ' disabled style="opacity:.6"' : '') + ' onclick="VL.goSeg(' + (si + 1) + ')">' +
          (left ? '🔒 Finish ' + left + ' required activit' + (left === 1 ? 'y' : 'ies') + ' to unlock' : 'Next chapter →') + '</button>';
      return '<div class="vl-seg" id="vl-seg-' + si + '">' + head + prog + desc + acts +
        '<div class="vl-seg-cta">' + cta +
        '<span class="vl-notes">' + (complete ? 'Chapter complete ✓' : d.done + ' of ' + d.total + ' activities done') + '</span></div></div>';
    }).join('');
    renderTop();
  }
  function actHtml(a, si, ai) {
    var color = a.color || 'gold';
    var xp = (typeof a.points === 'number' ? a.points : 10);
    var body = actBody(a);
    var l1 = a.content && a.content.translation
      ? '<div class="vl-l1"><b>🗣 Easy version · ' + esc(LEARNER_L1) + ':</b> ' + esc(a.content.translation) + '</div>'
      : '';
    return '<div class="vl-act" id="vl-act-' + esc(a.id) + '" style="border-left-color:' + colorMap(color) + '">' +
      '<div class="vl-act-head"><span class="vl-act-emoji">' + esc(a.emoji || '🎯') + '</span>' +
      '<span class="vl-act-title">' + esc(a.title || a.type) + '</span>' +
      '<span class="vl-act-type">' + esc(a.type) + '</span>' +
      '<span class="vl-act-xp">+' + xp + ' XP</span></div>' +
      l1 + body + '</div>';
  }
  function colorMap(c) {
    var m = { gold: '#f59e0b', teal: '#14b8a6', purple: '#a855f7', orange: '#f97316', green: '#22c55e', pink: '#ec4899', blue: '#3b82f6' };
    return m[c] || '#f59e0b';
  }
  function lessonContentHtml(a) {
    var lc = a.lessonContent; if (!lc) return '';
    var bits = [];
    if (lc.warmUp) bits.push('<div><b>🌡 Warm-up:</b> ' + esc(lc.warmUp) + '</div>');
    if (lc.meaning) bits.push('<div><b>💡 Meaning:</b> ' + esc(lc.meaning) + '</div>');
    if (lc.form) bits.push('<div><b>📝 Form:</b> ' + esc(lc.form) + '</div>');
    if (lc.use) bits.push('<div><b>🗣 Use:</b> ' + esc(lc.use) + '</div>');
    if (lc.personalizedExamples && lc.personalizedExamples.length) bits.push('<div><b>✨ Examples:</b> ' + lc.personalizedExamples.map(esc).join(' · ') + '</div>');
    if (lc.lifeApplication) bits.push('<div><b>🌟 In your life:</b> ' + esc(lc.lifeApplication) + '</div>');
    return bits.length ? '<div style="background:rgba(79,70,229,.06);border:1px solid var(--line);border-radius:11px;padding:13px;margin-bottom:10px;font-size:15px;color:var(--tx);display:flex;flex-direction:column;gap:6px">' + bits.join('') + '</div>' : '';
  }
  function actBody(a) {
    var c = a.content || {};
    var lc = lessonContentHtml(a);
    switch (a.type) {
      case 'multipleChoice': {
        var opts = (c.options || []).map(function (o) {
          return '<button class="vl-opt" data-id="' + esc(o.id) + '" onclick="VL.answer(this,\\'' + esc(a.id) + '\\',\\'' + esc(o.id) + '\\')">' + esc(o.text) + '</button>';
        }).join('');
        return lc + '<div class="vl-q">' + esc(c.question || 'Choose the best answer') + '</div>' + opts + fbHtml(a);
      }
      case 'trueFalse':
        return lc + '<div class="vl-q">' + esc(c.question || '') + '</div><div class="vl-grid2"><button class="vl-btn vl-tf true" onclick="VL.tf(this,\\'' + esc(a.id) + '\\',true)">✅ TRUE</button><button class="vl-btn vl-tf false" onclick="VL.tf(this,\\'' + esc(a.id) + '\\',false)">❌ FALSE</button></div>' + fbHtml(a);
      case 'fillBlanks': {
        var parts = (c.sentence || '').split('___');
        var blanks = c.blanks || [];
        var html = parts.map(function (p, i) {
          var inp = i < blanks.length ? '<input class="vl-blank" data-a="' + esc(blanks[i]) + '" placeholder="…">' : '';
          return '<span>' + esc(p) + '</span>' + inp;
        }).join('');
        return lc + '<div class="vl-q">' + html + '</div><button class="vl-btn ok" onclick="VL.blanks(this)">Check blanks</button>' + fbHtml(a);
      }
      case 'wordScramble':
        return lc + '<div class="vl-word">' + esc(c.scrambledWord || '').split('').join(' ') + '</div><input class="vl-in" data-a="' + esc(c.correctWord || '') + '" placeholder="Type the word…"><button class="vl-btn ok" onclick="VL.scramble(this)">Check</button>' + fbHtml(a);
      case 'matching': {
        var pairs = c.pairs || [];
        var rights = pairs.map(function (p, i) { return { i: i, r: p.right }; }).sort(function () { return Math.random() - 0.5; });
        return lc + '<div class="vl-match-cols" data-a="' + esc(JSON.stringify(pairs)) + '"><div class="vl-col">' + pairs.map(function (p, i) {
          return '<div class="vl-mitem L" data-i="' + i + '" onclick="VL.matchPick(this)">' + esc(p.left) + '</div>';
        }).join('') + '</div><div class="vl-col">' + rights.map(function (x) {
          return '<div class="vl-mitem R" data-i="' + x.i + '" onclick="VL.matchPick(this)">' + esc(x.r) + '</div>';
        }).join('') + '</div></div><button class="vl-btn ok" onclick="VL.matchCheck(this)">Check matches</button>' + fbHtml(a);
      }
      case 'ordering': {
        var order = c.orderedItems || [];
        var shuffled = order.slice().sort(function () { return Math.random() - 0.5; });
        return lc + '<p class="vl-notes">Drag to order (correct: ' + esc(order.join(' → ')) + ')</p><div class="vl-sort">' + shuffled.map(function (it) {
          return '<div class="vl-sortitem" draggable="true" data-v="' + esc(it) + '">⠿ <span>' + esc(it) + '</span></div>';
        }).join('') + '</div><button class="vl-btn ok" onclick="VL.ordering(this)">Check order</button>' + fbHtml(a);
      }
      case 'flashcard': {
        var cards = c.cards || [];
        return lc + '<div class="vl-card-deck">' + cards.map(function (cd) {
          return '<div class="vl-card" onclick="this.classList.toggle(\\'flip\\')"><div class="vl-card-in"><div class="vl-card-f">' + esc(cd.front) + (cd.pronunciation ? '<div style="font-size:11px;opacity:.8">/' + esc(cd.pronunciation) + '/</div>' : '') + '<div style="font-size:10px;color:#cbd5ff">tap to flip</div></div><div class="vl-card-b">' + esc(cd.back) + (cd.translation ? '<div style="font-size:11px;color:var(--gold)">' + esc(cd.translation) + '</div>' : '') + (cd.example ? '<div style="font-size:10.5px;color:var(--mut)">" ' + esc(cd.example) + ' "</div>' : '') + '</div></div></div>';
        }).join('') + '</div><button class="vl-btn ok" onclick="VL.markDone(this,\\'' + esc(a.id) + '\\')">I studied the cards +' + (typeof a.points === 'number' ? a.points : 10) + ' XP</button>' + fbHtml(a);
      }
      case 'speaking':
        return lc + '<div class="vl-say">" ' + esc(c.expectedSentence || c.question || c.term || '') + ' "</div>' +
          '<button class="vl-btn" onclick="VL.say(\\'' + esc(c.expectedSentence || c.question || c.term || '') + '\\',this)">🔊 Listen</button>' +
          '<button class="vl-btn vio" onclick="VL.record(this)">🎤 Record &amp; compare</button>' +
          '<div class="vl-transcript" style="font-size:12.5px;color:#a5f3fc;margin-top:6px;min-height:18px"></div>' + fbHtml(a);
      case 'voiceOver':
        return lc + '<div class="vl-say">🎙 ' + esc(c.question || c.term || c.expectedSentence || '') + '</div>' +
          '<button class="vl-btn" onclick="VL.say(\\'' + esc(c.question || c.term || c.expectedSentence || '') + '\\',this)">🔊 Hear the line</button>' +
          '<button class="vl-btn ok" onclick="VL.markDone(this,\\'' + esc(a.id) + '\\')">✅ I voiced it +' + (typeof a.points === 'number' ? a.points : 10) + ' XP</button>' + fbHtml(a);
      case 'wouldYouRather': {
        var w1 = c.wouldYouOption1 || (c.options && c.options[0] ? c.options[0].text : 'Option A');
        var w2 = c.wouldYouOption2 || (c.options && c.options[1] ? c.options[1].text : 'Option B');
        return lc + '<div class="vl-q">⚖ Would you rather…</div><div class="vl-grid2"><button class="vl-btn vl-tf" style="min-height:64px;white-space:normal" onclick="VL.wyr(this,\\'' + esc(a.id) + '\\')">' + esc(w1) + '</button><button class="vl-btn vl-tf" style="min-height:64px;white-space:normal" onclick="VL.wyr(this,\\'' + esc(a.id) + '\\')">' + esc(w2) + '</button></div>' + fbHtml(a);
      }
      case 'predictNext': {
        var pops = c.predictOptions || (c.options || []).map(function (o) { return { text: o.text, consequence: '' }; });
        return lc + '<div class="vl-q">🔮 ' + esc(c.question || 'What happens next?') + '</div>' + pops.map(function (p, i) {
          return '<button class="vl-opt" onclick="VL.predict(this,\\'' + esc(a.id) + '\\',\\'' + esc(p.consequence || '') + '\\')">' + esc(p.text) + (p.consequence ? '<span class="conseq">' + esc(p.consequence) + '</span>' : '') + '</button>';
        }).join('') + fbHtml(a);
      }
      case 'dragDrop': {
        var targets = c.targets || (c.pairs || []).map(function (p) { return p.left; });
        var items = c.items || (c.pairs || []).map(function (p) { return p.right; });
        var cols = targets.map(function (t, i) {
          return '<div class="vl-drop" data-t="' + i + '" ondragover="event.preventDefault()" ondrop="VL.drop(this,event)"><b style="font-size:11.5px;color:var(--gold)">' + esc(t) + '</b><div class="vl-dropitems"></div></div>';
        }).join('');
        return lc + '<p class="vl-notes">Drag each item into the right group</p><div class="vl-drag-items" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' + items.map(function (it) {
          return '<div class="vl-sortitem" draggable="true" style="cursor:grab" data-v="' + esc(it) + '" data-g="' + (c.pairs ? esc((c.pairs.filter(function (p) { return p.right === it; })[0] || {}).left || '') : '') + '">' + esc(it) + '</div>';
        }).join('') + '</div>' + cols + '<button class="vl-btn ok" onclick="VL.dragCheck(this)">Check groups</button>' + fbHtml(a);
      }
      case 'discussion':
      case 'reflection':
      case 'videoPause': {
        var prompt = c.discussionPrompt || c.reflectionPrompt || c.videoPausePrompt || c.question || '';
        return lc + '<div class="vl-q">💬 ' + esc(prompt) + '</div>' +
          (c.expectedSentence || c.sentence ? '<div class="vl-say" style="font-size:13px">' + esc(c.expectedSentence || c.sentence) + '</div>' : '') +
          '<textarea class="vl-in" rows="3" placeholder="Write / type your answer…"></textarea>' +
          '<button class="vl-btn ok" onclick="VL.reflect(this,\\'' + esc(a.id) + '\\')">💾 Save response +' + (typeof a.points === 'number' ? a.points : 10) + ' XP</button>' + fbHtml(a);
      }
      case 'readingChallenge': {
        var rd = c.reading || {};
        var qs = (rd.questions || []).map(function (q, qi) {            return '<div style="margin-top:10px"><b style="font-size:13px">Q' + (qi + 1) + '. ' + esc(q.question) + '</b>' +
            '<div>' + (q.options || []).map(function (o) {
              return '<button class="vl-opt" data-g="' + (o.isCorrect ? '1' : '0') + '" onclick="VL.readq(this,' + qi + ')">' + esc(o.text) + '</button>';
            }).join('') + '</div><div class="vl-fb" style="font-size:12px"></div></div>';
        }).join('');
        return lc + '<div class="vl-q">📖 ' + esc(rd.title || 'Reading') + '</div>' +
          '<div style="font-size:16px;background:var(--card);border:1px solid var(--line);border-radius:11px;padding:14px;max-height:260px;overflow:auto;line-height:1.75">' + esc(rd.text || '') + '</div>' +
          (rd.translation ? '<div class="vl-l1"><b>🗣 Easy version · ' + esc(LEARNER_L1) + ':</b> ' + esc(rd.translation) + '</div>' : '') + qs;
      }
      case 'listeningComprehension': {
        var ls = c.listening || {};
        var lqs = (ls.questions || []).map(function (q, qi) {            return '<div style="margin-top:10px"><b style="font-size:13px">Q' + (qi + 1) + '. ' + esc(q.question) + (typeof q.timestamp === 'number' ? ' <span style="color:var(--gold)">(at ' + fmt(q.timestamp) + ')</span>' : '') + '</b>' +
            '<div>' + (q.options || []).map(function (o) {
              return '<button class="vl-opt" data-g="' + (o.isCorrect ? '1' : '0') + '" onclick="VL.lq(this,' + qi + ')">' + esc(o.text) + '</button>';
            }).join('') + '</div><div class="vl-fb" style="font-size:12px"></div></div>';
        }).join('');
        return lc + '<div class="vl-q">🎧 ' + esc(ls.title || 'Listening') + '</div>' +
          '<button class="vl-btn vio" onclick="VL.say(\\'' + esc((ls.audioText || '').slice(0, 600).replace(/'/g, '\\'\\'')) + '\\',this,0.9)">🔊 Play audio text</button>' +
          (ls.showTranscript !== false ? '<div style="font-size:15px;color:var(--mut);max-height:150px;overflow:auto;margin-top:8px;line-height:1.7">' + esc(ls.audioText || '') + '</div>' : '') +
          (ls.translation ? '<div class="vl-l1"><b>🗣 Easy version · ' + esc(LEARNER_L1) + ':</b> ' + esc(ls.translation) + '</div>' : '') + lqs;
      }
      case 'hotspot': {
        var hs = c.hotspot || {};
        return lc + '<div class="vl-q">📍 ' + esc(hs.question || c.question || 'Spot the answer') + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' + (hs.options || c.options || []).map(function (o) {
            return '<button class="vl-opt" style="width:auto" onclick="VL.answer(this,\\'' + esc(a.id) + '\\',\\'' + esc(o.id) + '\\')">' + esc(o.text) + '</button>';
          }).join('') + '</div>' + fbHtml(a);
      }
      default:
        return lc + '<div class="vl-q">' + esc(c.question || 'Activity: ' + a.type) + '</div><button class="vl-btn ok" onclick="VL.markDone(this,\\'' + esc(a.id) + '\\')">✅ Complete +' + (typeof a.points === 'number' ? a.points : 10) + ' XP</button>' + fbHtml(a);
    }
  }
  function fbHtml(a) {
    return '<div class="vl-fb"></div>' +
      '<div style="font-size:11px;color:var(--mut);margin-top:2px">' + esc(a.correctFeedback || '') + '</div>' +
      '<input type="hidden" class="vl-aid" value="' + esc(a.id) + '">';
  }

  /* ---------- interactions ---------- */
  function fbWrap(btn) {
    var card = btn.closest('.vl-act');
    return card ? card.querySelector('.vl-fb') : null;
  }
  function wrong(el, msg) { var f = fbWrap(el); if (f) { f.className = 'vl-fb bad'; f.textContent = msg || 'Not quite — try again!'; } }
  function right(el, msg) { var f = fbWrap(el); if (f) { f.className = 'vl-fb ok'; f.textContent = msg || 'Correct!'; } }
  var answered = {};
  function once(aid, el, points) {
    if (answered[aid]) return true;
    answered[aid] = true;
    award(points || 10, { id: aid, type: 'multipleChoice' });
    return false;
  }
  var VL = {
    goSeg: function (i) {
      var seg = SEG[i]; if (!seg) return;
      state.currentSeg = i;
      state.openSeg = i;
      renderSegs();
      var target = $('#vl-seg-' + i);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (state.playerUrl || (LESSON.metadata.videoUrl && INCLUDE_VIDEO)) {
        seekTo(seg.startTime); play();
      }
    },
    toggleSeg: function (i) {
      state.openSeg = state.openSeg === i ? -1 : i;
      renderSegs();
      if (state.openSeg === i) {
        var t = $('#vl-seg-' + i);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    finishLesson: function () {
      var done = 0;
      for (var i = 0; i < SEG.length; i++) done += segDone(i).done;
      banner('🎉 Lesson complete — ' + done + '/' + TOTAL + ' activities · ' + state.xp + ' XP · Lv.' + state.level);
    },
    answer: function (btn, aid, oid) {
      var entry = actById(aid); if (!entry) return;
      var opts = entry.act.content.options || [];
      var chosen = opts.filter(function (o) { return o.id === oid; })[0];
      var correct = chosen && chosen.isCorrect;
      var f = fbWrap(btn);
      $$('.vl-opt', btn.closest('.vl-act')).forEach(function (o) { o.disabled = true; o.className = 'vl-opt'; });
      btn.classList.add(correct ? 'correct' : 'wrong');
      if (correct) {
        var first = !state.done[aid];
        if (f) { f.className = 'vl-fb ok'; f.textContent = entry.act.correctFeedback || 'Correct!'; }
        if (first) { award(entry.act.points || 10, entry.act); } else { banner('+0 (already done)'); }
      } else {
        if (f) { f.className = 'vl-fb bad'; f.textContent = entry.act.incorrectFeedback || 'Not quite — review and try again.'; }
        setTimeout(function () {
          $$('.vl-opt', btn.closest('.vl-act')).forEach(function (o) { o.disabled = false; o.classList.remove('wrong'); });
          if (f) { f.className = 'vl-fb'; f.textContent = ''; }
        }, 1600);
      }
    },
    tf: function (btn, aid, val) {
      var entry = actById(aid); if (!entry) return;
      var correct = entry.act.content.answer === val;
      var f = fbWrap(btn);
      btn.classList.add(correct ? 'correct' : 'wrong');
      if (correct) {
        if (f) { f.className = 'vl-fb ok'; f.textContent = entry.act.correctFeedback || 'Correct!'; }
        if (!state.done[aid]) { award(entry.act.points || 10, entry.act); }
      } else {
        if (f) { f.className = 'vl-fb bad'; f.textContent = entry.act.incorrectFeedback || 'Not quite — try again!'; }
        setTimeout(function () { btn.classList.remove('wrong'); if (f) { f.className = 'vl-fb'; f.textContent = ''; } }, 1400);
      }
    },
    blanks: function (btn) {
      var card = btn.closest('.vl-act'); var okAll = true;
      $$('.vl-blank', card).forEach(function (inp) {
        var good = inp.value.trim().toLowerCase() === inp.getAttribute('data-a').trim().toLowerCase();
        inp.className = 'vl-blank ' + (good ? 'okk' : 'no');
        if (!good) okAll = false;
      });
      var f = card.querySelector('.vl-fb');
      var aid = card.querySelector('.vl-aid').value;
      if (okAll) { if (f) { f.className = 'vl-fb ok'; f.textContent = 'All correct!'; } if (!state.done[aid]) { award(10, { id: aid, type: 'fillBlanks' }); } }
      else if (f) { f.className = 'vl-fb bad'; f.textContent = 'Some blanks are wrong — check the highlighted ones.'; }
    },
    scramble: function (btn) {
      var card = btn.closest('.vl-act');
      var inp = card.querySelector('.vl-in');
      var f = card.querySelector('.vl-fb');
      var aid = card.querySelector('.vl-aid').value;
      var good = inp.value.trim().toLowerCase() === inp.getAttribute('data-a').trim().toLowerCase();
      if (good) { if (f) { f.className = 'vl-fb ok'; f.textContent = 'Correct!'; } if (!state.done[aid]) { award(10, { id: aid, type: 'wordScramble' }); } }
      else if (f) { f.className = 'vl-fb bad'; f.textContent = 'Not quite — try again!'; }
    },
    matchPick: function (el) {
      if (el.classList.contains('done')) return;
      var col = el.closest('.vl-col');
      var picked = col.querySelector('.vl-mitem.sel');
      if (picked && picked !== el) {
        // pair
        var L = el.classList.contains('L') ? el : picked;
        var R = el.classList.contains('R') ? el : picked;
        if (L.getAttribute('data-i') === R.getAttribute('data-i')) {
          L.classList.add('done'); R.classList.add('done'); L.classList.remove('sel'); R.classList.remove('sel');
        } else {
          L.classList.remove('sel'); R.classList.remove('sel');
          var f = L.closest('.vl-act').querySelector('.vl-fb');
          if (f) { f.className = 'vl-fb bad'; f.textContent = "Those don't match — try again."; setTimeout(function () { f.className = 'vl-fb'; }, 1200); }
        }
      } else if (!el.classList.contains('sel')) {
        $$('.vl-mitem', el.closest('.vl-col')).forEach(function (m) { m.classList.remove('sel'); });
        el.classList.add('sel');
      }
    },
    matchCheck: function (btn) {
      var card = btn.closest('.vl-act');
      var done = $$('.vl-mitem.L.done', card).length;
      var total = $$('.vl-mitem.L', card).length;
      var aid = card.querySelector('.vl-aid').value;
      var f = card.querySelector('.vl-fb');
      if (done === total) { if (f) { f.className = 'vl-fb ok'; f.textContent = 'All matched!'; } if (!state.done[aid]) { award(15, { id: aid, type: 'matching' }); } }
      else if (f) { f.className = 'vl-fb warn'; f.textContent = done + '/' + total + ' matched — keep going!'; }
    },
    ordering: function (btn) {
      var card = btn.closest('.vl-act');
      var items = $$('.vl-sortitem', card).map(function (x) { return x.getAttribute('data-v'); });
      var aid = card.querySelector('.vl-aid').value;
      var f = card.querySelector('.vl-fb');
      var entry = actById(aid);
      var correct = entry && entry.act.content.orderedItems;
      if (correct && items.join('|') === correct.join('|')) {
        if (f) { f.className = 'vl-fb ok'; f.textContent = 'Perfect order!'; }
        if (!state.done[aid]) { award(15, { id: aid, type: 'ordering' }); }
      } else if (f) { f.className = 'vl-fb bad'; f.textContent = 'Not the right order yet — drag and retry.'; }
    },
    drop: function (box, ev) {
      ev.preventDefault();
      var data = ev.dataTransfer.getData('text/plain');
      var el = document.getElementById(data);
      if (!el) return;
      box.querySelector('.vl-dropitems').appendChild(el);
    },
    dragCheck: function (btn) {
      var card = btn.closest('.vl-act');
      var f = card.querySelector('.vl-fb');
      var aid = card.querySelector('.vl-aid').value;
      var wrongs = 0;
      $$('.vl-drop', card).forEach(function (box) {
        var ti = parseInt(box.getAttribute('data-t'), 10);
        $$('.vl-dropitems .vl-sortitem', box).forEach(function (it) {
          var g = it.getAttribute('data-g');
          var tg = g ? (box.closest('.vl-act').querySelectorAll('.vl-drop')[ti] || {}) : null;
          // compare group target text to item expected target index target text
          var targetText = box.querySelector('b').textContent;
          if (g && g.trim().toLowerCase() !== targetText.trim().toLowerCase()) wrongs++;
          box.classList.add('okk');
        });
      });
      var misplaced = 0;
      $$('.vl-dropitems', card).forEach(function (di) {
        if (di.children.length === 0) misplaced++;
      });
      if (wrongs === 0 && misplaced === 0) {
        if (f) { f.className = 'vl-fb ok'; f.textContent = 'All items sorted correctly!'; }
        if (!state.done[aid]) { award(15, { id: aid, type: 'dragDrop' }); }
      } else if (f) { f.className = 'vl-fb bad'; f.textContent = 'Some items are in the wrong group — review and retry.'; }
    },
    wyr: function (btn, aid) {
      var f = fbWrap(btn); var first = !state.done[aid];
      if (first) { award(10, { id: aid, type: 'wouldYouRather' }); } else { banner('Already answered'); }
      if (f) { f.className = 'vl-fb ok'; f.textContent = 'Nice choice! Tell your tutor why. 🗣'; }
    },
    predict: function (btn, aid, consequence) {
      var f = fbWrap(btn);
      $$('.vl-opt', btn.closest('.vl-act')).forEach(function (o) { o.disabled = true; });
      btn.classList.add('correct');
      if (!state.done[aid]) { award(10, { id: aid, type: 'predictNext' }); }
      if (f) { f.className = 'vl-fb ok'; f.textContent = consequence || 'Good prediction! 🎯'; }
    },
    reflect: function (btn, aid) {
      var card = btn.closest('.vl-act');
      var ta = card.querySelector('textarea');
      var f = card.querySelector('.vl-fb');
      if (!ta.value.trim()) { if (f) { f.className = 'vl-fb warn'; f.textContent = 'Write a short answer first 🙂'; } return; }
      if (f) { f.className = 'vl-fb ok'; f.textContent = 'Saved to your journal 📓'; }
      if (!state.done[aid]) { award(10, { id: aid, type: 'discussion' }); }
    },
    say: function (text, btn, rate) {
      try {
        if (!('speechSynthesis' in window)) { banner('TTS not supported here'); return; }
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.rate = rate || 1; u.lang = 'en-US';
        var voices = window.speechSynthesis.getVoices();
        var pick = voices.filter(function (v) { return /en[-_]/i.test(v.lang); });
        if (pick.length) u.voice = pick[0];
        window.speechSynthesis.speak(u);
      } catch (e) { /* noop */ }
    },
    record: function (btn) {
      var card = btn.closest('.vl-act');
      var out = card.querySelector('.vl-transcript');
      var f = card.querySelector('.vl-fb');
      var aid = card.querySelector('.vl-aid').value;
      var expected = card.querySelector('.vl-say') ? card.querySelector('.vl-say').textContent.trim() : '';
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { banner('Speech recognition is not supported in this browser.'); return; }
      var rec = new SR(); rec.lang = 'en-US';
      btn.disabled = true; btn.textContent = '🎤 Listening…';
      rec.onresult = function (ev) {
        var heard = ev.results[0][0].transcript.trim().toLowerCase();
        if (out) out.textContent = 'You said: "' + heard + '"';
        var norm = function (s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\\s+/g, ' ').trim(); };
        var ok = expected && norm(heard) === norm(expected);
        if (!expected) ok = heard.length > 0;
        if (ok) {
          if (f) { f.className = 'vl-fb ok'; f.textContent = 'Pronunciation spot on! 🎉'; }
          if (!state.done[aid]) { award(20, { id: aid, type: 'speaking' }); }
        } else if (f) { f.className = 'vl-fb bad'; f.textContent = 'Almost — compare with the model line and try once more.'; }
        btn.disabled = false; btn.textContent = '🎤 Record & compare';
      };
      rec.onerror = function () { banner('Mic error — check permissions.'); btn.disabled = false; btn.textContent = '🎤 Record & compare'; };
      rec.onend = function () { btn.disabled = false; btn.textContent = '🎤 Record & compare'; };
      rec.start();
    },
    readq: function (btn, qi) { mcqInline(btn, qi); },
    lq: function (btn, qi) { mcqInline(btn, qi); },
    markDone: function (btn, aid) {
      var f = fbWrap(btn);
      var entry = actById(aid);
      if (!state.done[aid]) { award((entry && entry.act.points) || 10, entry ? entry.act : { id: aid, type: 'flashcard' }); }
      if (f) { f.className = 'vl-fb ok'; f.textContent = 'Done — nice work!'; }
    },
    /* ---------- print ---------- */
    print: function () {
      var rows = SEG.map(function (s, si) {
        var acts = (s.activities || []).map(function (a) {
          var c = a.content || {};
          var q = c.question || c.discussionPrompt || c.reflectionPrompt || c.videoPausePrompt || c.term || c.sentence || c.scrambledWord || c.expectedSentence || '';
          var ans = '';
          if (c.options) ans = c.options.filter(function (o) { return o.isCorrect; }).map(function (o) { return o.text; }).join('; ');
          if (c.blanks) ans = c.blanks.join(', ');
          if (c.answer !== undefined) ans = String(c.answer);
          if (c.orderedItems) ans = c.orderedItems.join(' → ');
          if (c.pairs) ans = c.pairs.map(function (p) { return p.left + ' = ' + p.right; }).join('; ');
          return '<tr><td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top">' + (si + 1) + '.' + esc(a.title || a.type) + ' <em>(' + esc(a.type) + ')</em></td><td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top">' + esc(q) + '</td><td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top">' + esc(ans) + '</td></tr>';
        }).join('');
        return acts;
      }).join('');
      var html = '<html><head><title>' + esc(LESSON.metadata.title) + ' — Study Worksheet</title><style>body{font-family:system-ui,Arial,sans-serif;color:#111;margin:24px}table{border-collapse:collapse;width:100%;font-size:12px}th{background:#eee;padding:7px 8px;border:1px solid #ccc;text-align:left}h2{color:#111}small{color:#555}</style></head><body>' +
        '<h2>🎬 ' + esc(LESSON.metadata.title) + '</h2>' +
        '<small>Learner: ' + esc(LEARNER_NAME) + ' · Level: ' + esc(LESSON.metadata.cefrLevel) + ' · ' + esc(LESSON.metadata.targetLanguage) + ' · Segments: ' + SEG.length + ' · Activities: ' + TOTAL + '</small>' +
        '<h3>Study Worksheet</h3><table><tr><th style="width:26%">Activity</th><th style="width:40%">Question / Prompt</th><th>Answer Key</th></tr>' + rows + '</table>' +
        '<p style="margin-top:16px;font-size:11px;color:#666">Generated from the Video Lesson lesson JSON.</p>' +
        '</body></html>';
      var w = window.open('', '_blank');
      if (!w) { banner('Allow pop-ups to print'); return; }
      w.document.write(html); w.document.close();
      setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* noop */ } }, 400);
    },
    openStream: function () { switchMode('stream'); },
    openLesson: function () { switchMode('lesson'); },
    toggleTranscript: function () { var el = $('#vl-transcript'); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; },
    partyOpen: function () { openParty(); },
  };

  /* mcq for reading/listening inline questions */
  function mcqInline(btn, qi) {
    var card = btn.closest('.vl-act');
    var q = btn.parentElement;
    var f = q.querySelector('.vl-fb');
    var opts = Array.prototype.slice.call(q.querySelectorAll('.vl-opt'));
    var good = btn.getAttribute('data-g') === '1';
    opts.forEach(function (o) { o.disabled = true; });
    if (good) {
      btn.classList.add('correct');
      if (f) { f.className = 'vl-fb ok'; f.textContent = 'Correct! ✓'; }
      var aid = card.querySelector('.vl-aid');
      if (aid && !state.done[aid.value]) {
        var a = actById(aid.value);
        if (a) { state.done[aid.value] = true; state.xp += (a.act.points || 10); levelUp(); save(); renderTop(); }
      }
    } else {
      btn.classList.add('wrong');
      opts.forEach(function (o) { if (o.getAttribute('data-g') === '1') o.classList.add('correct'); });
      if (f) { f.className = 'vl-fb bad'; f.textContent = 'Not quite — the green option is the answer key.'; }
    }
  }

  /* ---------- video player ---------- */
  function playerUrl() {
    return state.playerUrl || (LESSON.metadata.videoUrl && INCLUDE_VIDEO ? LESSON.metadata.videoUrl : '');
  }
  function isYt(url) { return /youtube\\.com|youtu\\.be/i.test(url || ''); }
  function ytId(url) { var m = String(url || '').match(/(?:v=|youtu\\.be\\/|embed\\/)([a-zA-Z0-9_-]{6,})/); return m ? m[1] : ''; }
  function switchMode(mode) {
    state.mode = mode;
    renderLeft(); renderRight();
    $('#vl-tab-lesson').className = 'vl-topbtn' + (mode === 'lesson' ? ' gold' : '');
    $('#vl-tab-stream').className = 'vl-topbtn' + (mode === 'stream' ? ' gold' : '');
  }
  function renderLeft() {
    var content = $('#vl-content');
    if (!content) return;
    var lessonView = state.mode === 'lesson';
    content.innerHTML = lessonView
      ? '<div class="vl-segbar" id="vl-segbar"></div><div id="vl-segs"></div>'
      : '<div id="vl-stream-panel"></div>';
    if (lessonView) renderSegs(); else renderStream();
  }
  function mountPlayer() {
    var shell = $('#vl-playershell');
    if (!shell) return;
    var url = playerUrl();
    var newKey = isYt(url) ? ytId(url) : url;
    if (state._lastUrl === newKey) return;
    state._lastUrl = newKey;
    destroyYT();
    shell.innerHTML = playerView();
    if (state.playerType === 'yt') ensureYT();
  }
  function playerView() {
    var url = playerUrl();
    var html = '';
    if (!url) {
      html = '<div class="vl-player"><div class="vl-empty-player"><div style="font-size:44px">🎬</div><b>No video attached to this lesson</b><span>Open <b>Learning with Streaming</b> to search a video, or your tutor may add one later.</span></div></div>';
    } else if (isYt(url)) {
      html = '<div class="vl-player"><iframe id="vl-yt" src="https://www.youtube.com/embed/' + esc(ytId(url)) + '?enablejsapi=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><div class="vl-caption" id="vl-caption"></div></div>';
      state.playerType = 'yt'; state.ytId = ytId(url);
    } else {
      html = '<div class="vl-player"><video id="vl-vid" controls preload="metadata" src="' + esc(url) + '"></video><div class="vl-caption" id="vl-caption"></div></div>';
      state.playerType = 'media';
      bindVideo();
    }
    return html;
  }
  function el(id) { return document.getElementById(id); }
  function bindVideo() {
    var v = el('vl-vid');
    if (!v) return;
    if (v._bound) return; v._bound = true;
    v.addEventListener('timeupdate', function () { captionTick(v.currentTime); });
    v.addEventListener('play', function () { try { partySend('state', { t: v.currentTime, p: true }); } catch (e) { /* noop */ } });
    v.addEventListener('pause', function () { try { partySend('state', { t: v.currentTime, p: false }); } catch (e) { /* noop */ } });
  }
  var ytReady = false;
  function destroyYT() {
    if (state._player && window.YT && YT.Player) { try { state._player.destroy(); } catch (e) { /* noop */ } }
    state._player = null; state._playing = false;
    if (state._tick) { clearInterval(state._tick); state._tick = null; }
  }
  function ensureYT() {
    if (ytReady) { initYT(); return; }
    if (window.YT && YT.Player) { ytReady = true; initYT(); return; }
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onload = function () { /* api calls onYouTubeIframeAPIReady */ };
    document.head.appendChild(s);
  }
  window.onYouTubeIframeAPIReady = function () { ytReady = true; initYT(); };
  function initYT() {
    if (!window.YT || !YT.Player) return;
    if (state._player) return;
    var host = el('vl-yt');
    if (!host) return;
    state._player = new YT.Player(host.id, {
      events: {
        onReady: function () { if (state._paused) state._player.seekTo(state._pendingSeek || 0); },
        onStateChange: function (ev) {
          if (ev.data === 1) {
            state._playing = true;
            if (!state._tick) {
              state._tick = setInterval(function () {
                try { var t = state._player.getCurrentTime(); captionTick(t); partySend('state', { t: t, p: true }); } catch (e) { /* noop */ }
              }, 800);
            }
          } else if (ev.data === 2) { state._playing = false; try { partySend('state', { t: state._player.getCurrentTime(), p: false }); } catch (e) { /* noop */ } }
        },
      },
    });
  }
  function seekTo(t) {
    if (state._player && state._playing !== undefined) {
      try { state._player.seekTo(t, true); } catch (e) { /* noop */ }
    } else {
      state._pendingSeek = t;
      var v = el('vl-vid');
      if (v) v.currentTime = t;
    }
  }
  function play() {
    if (state._player) { try { state._player.playVideo(); } catch (e) { /* noop */ } }
    var v = el('vl-vid');
    if (v) { v.play(); }
  }
  function captionTick(t) {
    var idx = state.subIdx;
    var cues = state.subCues;
    if (!cues || !cues.length) return;
    if (idx >= 0 && cues[idx] && t >= cues[idx].start && t <= cues[idx].end) {
      var cap = el('vl-caption');
      if (cap) cap.textContent = cues[idx].text;
      return;
    }
    var found = -1;
    for (var i = 0; i < cues.length; i++) {
      if (t >= cues[i].start && t <= cues[i].end) { found = i; break; }
      if (cues[i].start > t) break;
    }
    state.subIdx = found;
    var cap2 = el('vl-caption');
    if (cap2) cap2.textContent = found >= 0 ? cues[found].text : '';
    if (found >= 0 && state.mode === 'lesson') highlightLine(found);
  }
  function highlightLine(i) {
    $$('.vl-line').forEach(function (l, li) { l.className = 'vl-line' + (li === i ? ' active' : ''); });
    var act = $('#vl-line-' + i);
    if (act) act.scrollIntoView({ block: 'nearest' });
  }
  window.addEventListener('message', function (ev) { /* youtube JSAPI posts none for iframe; unused */ });

  /* ---------- right rail ---------- */
  function renderRight() {
    var el = $('#vl-right');
    if (!el) return;
    el.innerHTML =
      '<div class="vl-panel"><div class="vl-h3"><span>📄 Subtitle / Transcript</span><span><button class="vl-btn" style="font-size:10.5px;padding:4px 8px" onclick="VL.toggleTranscript()">fold</button></span></div>' +
      '<div id="vl-sub-btns">' + (state.subCues.length ? '' : '<button class="vl-btn vio" onclick="loadLessonSubs()">Load embedded subtitles</button>') + '</div>' +
      '<div class="vl-trans" id="vl-transcript" style="' + (state.subCues.length ? '' : 'display:none') + '"></div>' +
      '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="vl-btn" onclick="VL.copySubs()">📋 Copy transcript</button>' +
      '<button class="vl-btn gold" onclick="VL.copyAiPrompt()">🤖 Copy AI prompt → make a lesson</button>' +
      '</div><div class="vl-notes" id="vl-note" style="margin-top:6px"></div></div>' +
      '<div class="vl-panel"><div class="vl-h3"><span>👥 Watch Party</span></div>' +
      '<div class="vl-notes" style="margin-bottom:8px">Cross-device sync (PeerJS rooms): playback, chat &amp; live polls — share your room code; guests join from any device.</div>' +
      '<button class="vl-btn vio" style="width:100%" onclick="openParty()">🚀 Host / Join party</button></div>' +
      '<div class="vl-panel"><div class="vl-h3"><span>🎬 Turn this video into a lesson</span></div>' +
      '<div class="vl-notes" style="margin-bottom:8px">Auto-split the fetched transcript into timestamped chapters, edit them, and generate a ready-to-paste 🎬 Video Lesson JSON for the Manual Creator.</div>' +
      '<button class="vl-btn gold" style="width:100%" onclick="VL.lessonWizard()">🎬 Turn into a lesson</button></div>' +
      '<div class="vl-panel"><div class="vl-h3"><span>💬 Subtitles when captions are off</span></div>' +
      '<div class="vl-notes" style="margin-bottom:8px">Paste a transcript (plain text, SRT or VTT) and it becomes synced captions; or fetch from OpenSubtitles with an API key.</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="vl-btn vio" style="flex:1" onclick="VL.pasteSubs()">📋 Paste transcript</button><button class="vl-btn" style="flex:1" onclick="VL.opensub()">🌐 OpenSubtitles</button></div></div>';
    if (state.subCues.length) renderTranscript();
  }
  function renderTranscript() {
    var box = el('vl-transcript');
    if (!box) return;
    box.innerHTML = state.subCues.map(function (c, i) {
      return '<div class="vl-line" id="vl-line-' + i + '"><span class="lt">' + fmt(c.start) + '</span><span>' + esc(c.text) + '</span></div>';
    }).join('');
    box.style.display = 'block';
  }
  var COPIED = null;
  function copyText(txt, msg) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { banner(msg || 'Copied ✓'); }, function () { fallbackCopy(txt); banner(msg || 'Copied ✓'); });
      } else { fallbackCopy(txt); banner(msg || 'Copied ✓'); }
    } catch (e) { fallbackCopy(txt); banner(msg || 'Copied ✓'); }
  }
  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }
  function transcriptText() {
    return state.subCues.map(function (c) { return fmt(c.start) + ' ' + c.text; }).join('\\n');
  }
  VL.copySubs = function () { copyText(transcriptText(), 'Transcript copied — paste it anywhere'); };
  VL.copyAiPrompt = function () {
    var url = playerUrl();
    var txt = 'Please turn the video lesson transcript below into a ready-to-teach 🎬 Video Lesson JSON (manual creator type videoLessonInteractive). Rules:\\n' +
      '- Keep the schema exactly: { metadata:{title,targetLanguage,cefrLevel,estimatedDurationSeconds,videoUrl}, globalSettings:{pointsToLevelUp:500,enableStreak:true,suspenseSounds:true}, badges:[{id,name,emoji,rarity,condition,description}], learnerProfile:{name,level,nativeLanguage,goals,interests,facts}, segments:[{id,title,startTime,endTime,activities:[{id,type,timestamp,title,emoji,color,points,requiredForNext,difficulty,correctFeedback,incorrectFeedback,content}]}] }.\\n' +
      '- Use at least 12 segments matching natural chapter breaks of the video (timestamps from the transcript).\\n' +
      '- Activity types available: flashcard, multipleChoice, trueFalse, fillBlanks, dragDrop, matching, speaking, truthOrDare, wouldYouRather, discussion, predictNext, voiceOver, ordering, wordScramble, reflection, hotspot, videoPause, readingChallenge, listeningComprehension. Spread them across the segments and vary difficulty.\\n' +
      '- Video URL: ' + url + '\\n' +
      '- Video title: ' + LESSON.metadata.title + '\\n' +
      '- Learner: ' + LEARNER_NAME + ' (CEFR ' + LESSON.metadata.cefrLevel + ', L1 ' + LESSON.metadata.targetLanguage + ')\\n\\n' +
      'Transcript:\\n' + transcriptText();
    copyText(txt, 'AI prompt copied — paste it in Lesson Creator → Copy AI Prompt');
  };

  /* ---------- subtitles loading ---------- */
  window.loadLessonSubs = function () {
    var demoVtt = window.__VL_SUBS__ || '';
    if (demoVtt) {
      state.subCues = parseVtt(demoVtt);
      renderRight();
      note('Subtitles loaded: ' + state.subCues.length + ' cues');
    } else {
      note('No embedded subtitles for this lesson.');
    }
  };
  function parseVtt(text) {
    var cues = [];
    var lines = String(text || '').split(/\\r?\\n/);
    var i = 0;
    function ts(s) {
      var p = s.trim().split(':');
      var sec = 0;
      for (var k = 0; k < p.length; k++) {
        var num = parseFloat(p[k]) || 0;
        sec = sec * 60 + num;
      }
      return sec;
    }
    while (i < lines.length) {
      var m = lines[i].match(/^(\\d{1,2}:\\d{2}:\\d{2}[.,]?\\d*|\\d{1,2}:\\d{2}[.,]?\\d*)\\s*-->\\s*(\\d{1,2}:\\d{2}:\\d{2}[.,]?\\d*|\\d{1,2}:\\d{2}[.,]?\\d*)/);
      if (m) {
        var text = [];
        i++;
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/-->\\s*$/)) {
          text.push(lines[i].replace(/<[^>]+>/g, '').trim());
          i++;
        }
        cues.push({ start: ts(m[1]), end: ts(m[2]), text: text.join(' ').trim() });
      } else i++;
    }
    return cues;
  }

  /* ---------- streaming (Learning with Streaming) ---------- */
  function renderStream() {
    var box = el('vl-stream-panel');
    if (!box) return;
    box.innerHTML =
      '<div class="vl-panel">' +
      '<div class="vl-h3"><span>📺 Learning with Streaming</span><span class="vl-chip">free sources · no API key</span></div>' +
      '<p class="vl-notes" style="margin-bottom:8px">Search free streaming sources (server-powered YouTube, plus Dailymotion when offline), watch with synced subtitles, grab the transcript, and turn <b>any</b> video into a ready-made 🎬 Video Lesson for your Manual Creator.</p>' +
      '<div class="vl-search"><input class="vl-in" id="vl-q" placeholder="Search movies, TV, talks, lessons… e.g. \\'planet earth documentary\\'" onkeydown="if(event.key===\\'Enter\\')VL.search()"><button class="vl-btn vio" onclick="VL.search()">🔎 Search</button><button class="vl-btn" onclick="VL.search(\\'\\')">Reset</button></div>' +
      '<div class="vl-notes" style="margin-top:6px" id="vl-searchnote"></div>' +
      '<div class="vl-res" id="vl-res"></div>' +
      '</div>' +
      '<div class="vl-panel"><div class="vl-h3"><span>🎬 Use any video URL</span></div>' +
      '<input class="vl-in" id="vl-url" placeholder="Paste a YouTube / Vimeo / Dailymotion / .mp4 link…" onkeydown="if(event.key===\\'Enter\\')VL.useUrl()">' +
      '<button class="vl-btn gold" onclick="VL.useUrl()">▶ Load into player</button>' +
      '<div class="vl-notes" style="margin-top:6px">Then press <b>Load embedded subtitles</b> / fetch transcript in the sidebar (server mode) or paste a transcript.</div>' +
      '</div>';
  }
  VL.search = function (q) {
    q = q === '' ? '' : ($('#vl-q') ? $('#vl-q').value : '');
    var box = el('vl-res');
    if (!box) return;
    if (!q.trim()) { box.innerHTML = '<div class="vl-notes">Type a search above 👆</div>'; return; }
    box.innerHTML = '<div class="vl-notes">Searching…</div>';
    var url = '/api/media-search?type=video&q=' + encodeURIComponent(q);
    fetch(url).then(function (r) { return r.json(); }).then(function (items) {
      if (!items || !items.length) throw new Error('empty');
      renderResults(items);
    }).catch(function () {
      // Offline / file:// fallback → Dailymotion public API (CORS friendly)
      fetch('https://api.dailymotion.com/videos?search=' + encodeURIComponent(q) + '&fields=id,title,thumbnail_360_url,url,duration&limit=12')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var items = (d && d.list ? d.list : []).map(function (v) {
            return { id: 'dm_' + v.id, url: v.url, preview: v.thumbnail_360_url || '', title: v.title, caption: 'Dailymotion · ' + Math.round((v.duration || 0) / 60) + ' min' };
          });
          if (!items.length) throw new Error('empty dm');
          renderResults(items);
        })
        .catch(function () { box.innerHTML = '<div class="vl-notes">No results / offline. Paste a video URL directly instead.</div>'; });
    });
  };
  function renderResults(items) {
    var box = el('vl-res');
    if (!box) return;
    window.__VL_RESULTS__ = items;
    box.innerHTML = items.map(function (it, i) {
      var thumb = it.preview ? '<img src="' + esc(it.preview) + '" loading="lazy">' : '<div style="height:0;padding-bottom:56%;background:linear-gradient(135deg,#667eea,#764ba2)"></div>';
      return '<button class="vl-resitem" onclick="VL.playResult(' + i + ')">' + thumb + '<div class="tt">' + esc(it.title) + '</div><div class="ct">' + esc(it.caption || '') + '</div></button>';
    }).join('');
  }
  VL.playResult = function (i) {
    var it = (window.__VL_RESULTS__ || [])[i];
    if (!it) return;
    var url = it.url || '';
    if (/youtube|youtu\\.be/i.test(url)) {
      var id = ytId(url);
      if (id) { url = 'https://www.youtube.com/watch?v=' + id; }
    }
    setPlayerUrl(url);
    banner('▶ Playing: ' + (it.title || '').slice(0, 60));
    try {
      if (LESSON.metadata.videoUrl !== url) { note('Loaded a streamed video — click Copy AI prompt to build a fresh lesson from it.'); }
    } catch (e) { /* noop */ }
  };
  VL.useUrl = function () {
    var u = $('#vl-url') ? $('#vl-url').value.trim() : '';
    if (!u) { banner('Paste a video URL first'); return; }
    setPlayerUrl(u);
    banner('▶ Video loaded');
  };
  function setPlayerUrl(url) {
    state.playerUrl = url; save();
    mountPlayer();
  }
  VL.fetchSubs = function () {
    var url = playerUrl();
    if (!url) { note('Load a video first (streaming tab or lesson video).'); return; }
    var id = ytId(url);
    if (!id) { note('Subtitle fetching works best with YouTube links.'); return; }
    note('Fetching subtitles…');
    fetch('/api/video-subs?url=' + encodeURIComponent(url)).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.text) throw new Error('none');
        state.subCues = parseVtt(d.text);
        renderRight();
        if (d.title) note(d.title);
        banner('Subtitles fetched: ' + state.subCues.length + ' cues');
      })
      .catch(function () {
        note('Could not auto-fetch captions (YouTube captions may be off). Paste a transcript below or use the demo video.');
        renderRight();
      });
  };

  /* ---------- paste-transcript wizard (captions-off path) ---------- */
  function srtTimeToSec(s) {
    var p = String(s || '').trim().replace(',', '.').split(':');
    var sec = 0;
    for (var k = 0; k < p.length; k++) sec = sec * 60 + (parseFloat(p[k]) || 0);
    return sec;
  }
  function parseSrtLike(text) {
    // handles SRT / VTT style: timestamp lines "00:00:01,000 --> 00:00:03,500"
    var cues = [];
    var lines = String(text || '').split(/\\r?\\n/);
    var i = 0;
    while (i < lines.length) {
      var m = lines[i].match(/^(\\d{1,2}:\\d{2}:\\d{2}[.,]?\\d*|\\d{1,2}:\\d{2}[.,]?\\d*)\\s*-->\\s*(\\d{1,2}:\\d{2}:\\d{2}[.,]?\\d*|\\d{1,2}:\\d{2}[.,]?\\d*)/);
      if (m) {
        var t = [];
        i++;
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/-->\s*$/)) {
          var clean = lines[i].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
          if (clean) t.push(clean);
          i++;
        }
        var tx = t.join(' ');
        if (tx) cues.push({ start: srtTimeToSec(m[1]), end: srtTimeToSec(m[2]), text: tx });
      } else i++;
    }
    return cues;
  }
  function plainTextToCues(text) {
    // plain lines → evenly spaced cues across the lesson duration (default 8s each)
    var lines = String(text || '').split(/\\r?\\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var cues = [];
    var secsPer = 8;
    lines.forEach(function (ln, li) { cues.push({ start: li * secsPer, end: (li + 1) * secsPer, text: ln }); });
    return cues;
  }
  VL.pasteSubs = function () {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,6,20,.8);z-index:150;display:flex;align-items:center;justify-content:center;padding:14px';
    overlay.innerHTML = '<div style="background:#171332;border:1px solid var(--line);border-radius:18px;max-width:560px;width:100%;padding:18px;max-height:90vh;overflow:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:17px">📋 Paste a transcript / subtitles</b><button class="vl-btn" onclick="this.closest(\\'div\\').parentElement.remove()">✕</button></div>' +
      '<p class="vl-notes" style="margin:6px 0 10px">Works when YouTube captions are off. Paste <b>SRT/VTT</b> (keeps exact timestamps) or <b>plain text</b> (one line per sentence — evenly timed). Loaded cues sync with the player and the transcript panel.</p>' +
      '<textarea id="vl-pastetext" rows="10" style="width:100%;box-sizing:border-box;background:var(--card);color:var(--tx);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:14.5px;font-family:inherit" placeholder="00:00:01,000 --> 00:00:03,500\\nHello, welcome to my channel!\\n\\nor just paste plain lines...\\nEach line becomes a caption."></textarea>' +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="vl-btn vio" style="flex:1" onclick="VL.applyPaste(this)">✓ Apply as synced captions</button><button class="vl-btn" onclick="VL.pasteLoadDemo()">✨ Load demo transcript</button></div>' +
      '<div class="vl-notes" id="vl-pastestatus" style="margin-top:8px"></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
  };
  VL.pasteLoadDemo = function () {
    var ta = $('#vl-pastetext'); if (!ta) return;
    ta.value = 'Welcome back to the Big Buck Bunny lesson!\\nToday we are learning nature words.\\nThis is a bunny — big and fluffy.\\nThese are butterflies — small and colorful.\\nThe forest is full of trees and flowers.\\nWatch what happens when the animals meet!\\nCan you guess the next word?\\nGreat job! Now try the activities.';
  };
  VL.applyPaste = function (btn) {
    var ta = $('#vl-pastetext'); if (!ta) return;
    var text = ta.value;
    if (!text.trim()) { banner('Paste something first'); return; }
    var cues = text.indexOf('-->') >= 0 ? parseSrtLike(text) : plainTextToCues(text);
    if (!cues.length) { var st = $('#vl-pastestatus'); if (st) st.textContent = 'Could not parse — check the format (SRT/VTT timestamps or plain lines).'; return; }
    state.subCues = cues;
    state.subIdx = 0;
    renderRight();
    banner('✅ ' + cues.length + ' cues loaded as synced captions');
    try { var ov = btn.closest('div'); while (ov && ov.style && ov.style.background !== 'rgb(23, 19, 50)') ov = ov.parentElement; if (ov) ov.remove(); } catch (e) { /* noop */ }
  };

  /* ---------- OpenSubtitles / timedtext proxy (captions-off path, API key optional) ---------- */
  VL.opensub = function () {
    var url = playerUrl();
    if (!url) { note('Load a video first.'); return; }
    var key = prompt('OpenSubtitles API key (optional — leave empty to use the server\\'s OPENSUBTITLES_API_KEY):');
    if (key === null) return;
    note('Fetching subtitles via OpenSubtitles proxy…');
    var q = '/api/video-subs-proxy?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(LESSON.metadata.title || '');
    if (key && key.trim()) q += '&apiKey=' + encodeURIComponent(key.trim());
    fetch(q).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.text) throw new Error('none');
        state.subCues = parseVtt(d.text);
        renderRight();
        banner('OpenSubtitles: ' + state.subCues.length + ' cues loaded');
        if (d.lang) note('Language: ' + d.lang);
      })
      .catch(function () {
        note('No OpenSubtitles result — try the 📋 Paste transcript wizard instead.');
      });
  };

  /* ---------- turn-this-video-into-a-lesson wizard ---------- */
  function guessChapterTitles(cues, starts) {
    return starts.map(function (st, i) {
      var end = i + 1 < starts.length ? starts[i + 1] : (cues.length ? cues[cues.length - 1].end : st + 60);
      var words = [];
      for (var k = 0; k < cues.length; k++) {
        if (cues[k].start >= st - 0.5 && cues[k].start < end) words.push(cues[k].text);
        if (cues[k].start >= end) break;
      }
      var joined = words.join(' ').replace(/\\s+/g, ' ').trim();
      var title = joined.split(' ').slice(0, 7).join(' ');
      if (title.length > 48) title = title.slice(0, 48) + '…';
      return title || ('Chapter ' + (i + 1));
    });
  }
  function autoSplitChapters(cues, gapSec, minSec, maxSec) {
    gapSec = gapSec || 6; minSec = minSec || 25; maxSec = maxSec || 120;
    var starts = [];
    var last = null;
    var segStart = cues.length ? cues[0].start : 0;
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      if (last !== null && (c.start - last) > gapSec) {
        if (c.start - segStart >= minSec) { starts.push(Math.round(segStart)); segStart = c.start; }
      }
      last = c.end;
      if (c.end - segStart >= maxSec) { starts.push(Math.round(segStart)); segStart = c.end; last = null; }
    }
    if (cues.length && segStart < cues[cues.length - 1].end - minSec / 2) starts.push(Math.round(segStart));
    if (!starts.length && cues.length) starts.push(Math.round(cues[0].start));
    return starts;
  }
  VL.lessonWizard = function () {
    if (!state.subCues || !state.subCues.length) {
      note('Fetch or paste a transcript first (📄 Subtitle / Transcript panel).');
      banner('Get a transcript first — fetch subtitles or paste one');
      return;
    }
    var starts = autoSplitChapters(state.subCues);
    var titles = guessChapterTitles(state.subCues, starts);
    state._chapters = starts.map(function (st, i) {
      var end = i + 1 < starts.length ? starts[i + 1] : (state.subCues.length ? state.subCues[state.subCues.length - 1].end : st + 60);
      return { start: st, end: Math.round(end), title: titles[i] };
    });
    renderLessonWizard();
  };
  function renderLessonWizard() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,6,20,.85);z-index:160;display:flex;align-items:center;justify-content:center;padding:14px';
    overlay.id = 'vl-wizard-ov';
    overlay.innerHTML = '<div style="background:#171332;border:1px solid var(--line);border-radius:18px;max-width:640px;width:100%;padding:18px;max-height:92vh;overflow:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:17px">🎬 Turn this video into a lesson</b><button class="vl-btn" onclick="this.closest(\\'div\\').parentElement.remove()">✕</button></div>' +
      '<p class="vl-notes" style="margin-bottom:8px">Auto-split the transcript into <b>' + state._chapters.length + ' chapters</b>. Edit titles &amp; timestamps, then generate a ready-to-paste Video Lesson JSON.</p>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><button class="vl-btn" onclick="VL.wizResplit(3)">🔀 Tighter splits (3s)</button><button class="vl-btn" onclick="VL.wizResplit(10)">🔀 Looser splits (10s)</button><button class="vl-btn" onclick="VL.wizAdd()">➕ Add chapter</button></div>' +
      '<div id="vl-wizlist"></div>' +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="vl-btn gold" style="flex:1" onclick="VL.wizGen()">⚡ Generate Video Lesson JSON</button><button class="vl-btn" onclick="VL.wizCopyPrompt()">🤖 Copy AI prompt</button></div>' +
      '<textarea id="vl-wizout" rows="7" style="display:none;width:100%;box-sizing:border-box;background:var(--card);color:var(--tx);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:13px;margin-top:10px;font-family:monospace" readonly></textarea>' +
      '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap" id="vl-wizact" style="display:none"><button class="vl-btn ok" onclick="VL.wizCopy()">📋 Copy JSON</button><button class="vl-btn" onclick="VL.wizDownload()">💾 Download .json</button><button class="vl-btn" onclick="VL.wizSave()">💾 Save for presenter</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
    renderWizList();
  }
  function renderWizList() {
    var list = $('#vl-wizlist'); if (!list) return;
    list.innerHTML = state._chapters.map(function (ch, i) {
      return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">' +
        '<span style="font-size:11px;font-weight:800;color:var(--gold);min-width:18px">' + (i + 1) + '</span>' +
        '<input class="vl-in" style="flex:2;min-width:140px" value="' + esc(ch.title) + '" oninput="VL.wizTitle(' + i + ',this.value)">' +
        '<input class="vl-in" style="width:74px" type="number" min="0" value="' + ch.start + '" onchange="VL.wizStart(' + i + ',this.value)">' +
        '<span class="vl-notes">→</span>' +
        '<input class="vl-in" style="width:74px" type="number" min="0" value="' + ch.end + '" onchange="VL.wizEnd(' + i + ',this.value)">' +
        '<button class="vl-btn" style="padding:4px 8px;font-size:11px" onclick="VL.wizDel(' + i + ')">🗑</button></div>';
    }).join('');
  }
  VL.wizTitle = function (i, v) { if (state._chapters[i]) state._chapters[i].title = v; };
  VL.wizStart = function (i, v) { if (state._chapters[i]) state._chapters[i].start = Math.max(0, parseInt(v) || 0); };
  VL.wizEnd = function (i, v) { if (state._chapters[i]) state._chapters[i].end = Math.max(0, parseInt(v) || 0); };
  VL.wizDel = function (i) { state._chapters.splice(i, 1); renderWizList(); };
  VL.wizAdd = function () {
    var last = state._chapters[state._chapters.length - 1];
    var st = last ? last.end : 0;
    state._chapters.push({ start: st, end: st + 60, title: 'New chapter' });
    renderWizList();
  };
  VL.wizResplit = function (gap) {
    var starts = autoSplitChapters(state.subCues, gap);
    var titles = guessChapterTitles(state.subCues, starts);
    state._chapters = starts.map(function (st, i) {
      var end = i + 1 < starts.length ? starts[i + 1] : (state.subCues.length ? state.subCues[state.subCues.length - 1].end : st + 60);
      return { start: st, end: Math.round(end), title: titles[i] };
    });
    renderWizList();
  };
  function buildLessonFromChapters() {
    var chs = state._chapters || [];
    var url = playerUrl();
    var title = LESSON.metadata.title || 'Video Lesson';
    var segs = chs.map(function (ch, i) {
      var words = [];
      for (var k = 0; k < state.subCues.length; k++) {
        if (state.subCues[k].start >= ch.start - 0.5 && state.subCues[k].start < ch.end) words.push(state.subCues[k].text);
        if (state.subCues[k].start >= ch.end) break;
      }
      var text = words.join(' ').replace(/\\s+/g, ' ').trim();
      var acts = [
        { id: 'seg' + (i + 1) + '-mc', type: 'multipleChoice', timestamp: ch.start, title: 'Quick check', emoji: '❓', color: '#667eea', points: 10, requiredForNext: false, difficulty: 'easy', correctFeedback: 'Well done!', incorrectFeedback: 'Watch the clip again — the answer is in it.', content: { question: 'What did the chapter talk about?', options: [ch.title, 'Something else entirely', 'I need to rewatch'], answer: 0 } },
        { id: 'seg' + (i + 1) + '-fl', type: 'flashcard', timestamp: ch.start + 3, title: 'Key idea', emoji: '🗂️', color: '#f6b73c', points: 5, requiredForNext: false, difficulty: 'easy', correctFeedback: 'Got it!', incorrectFeedback: 'Flip it again.', content: { front: 'Chapter ' + (i + 1) + ' — key idea', back: text.slice(0, 140) || ch.title } },
        { id: 'seg' + (i + 1) + '-re', type: 'reflection', timestamp: ch.start + 5, title: 'Think & say', emoji: '💬', color: '#34d399', points: 10, requiredForNext: false, difficulty: 'medium', content: { prompt: 'In one sentence, what is the most important thing you heard in “' + ch.title + '”? Say it out loud in English.' } }
      ];
      return { id: 's' + (i + 1), title: ch.title, startTime: ch.start, endTime: ch.end, activities: acts };
    });
    return {
      metadata: { title: title, targetLanguage: LESSON.metadata.targetLanguage || 'English', cefrLevel: LESSON.metadata.cefrLevel || 'B1', estimatedDurationSeconds: (chs.length ? chs[chs.length - 1].end : 600), videoUrl: url },
      globalSettings: { pointsToLevelUp: 500, enableStreak: true, suspenseSounds: true },
      badges: [{ id: 'first_answer', name: 'First Step', emoji: '🎯', rarity: 'common', condition: 'Answer your first activity', description: 'Completed the first activity' }, { id: 'word_master', name: 'Word Master', emoji: '🧠', rarity: 'rare', condition: 'Answer 3 vocabulary activities', description: 'Completed 3 vocabulary activities' }],
      learnerProfile: { name: LEARNER_NAME, level: 1, nativeLanguage: LESSON.metadata.targetLanguage || 'Arabic', goals: ['Improve listening'], interests: ['Video lessons'], facts: [] },
      segments: segs
    };
  }
  VL.wizGen = function () {
    var lesson = buildLessonFromChapters();
    var out = $('#vl-wizout'); var act = $('#vl-wizact');
    if (!out || !act) return;
    out.value = JSON.stringify(lesson, null, 2);
    out.style.display = 'block'; act.style.display = 'flex';
    state._wizLesson = lesson;
    banner('✅ Lesson JSON generated — ' + (lesson.segments || []).length + ' chapters');
  };
  VL.wizCopy = function () {
    var out = $('#vl-wizout'); if (!out) return;
    copyText(out.value, 'Video Lesson JSON copied — paste it in Lesson Creator (type 🎬 Video Lesson)');
  };
  VL.wizDownload = function () {
    var out = $('#vl-wizout'); if (!out) return;
    try {
      var blob = new Blob([out.value], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (LESSON.metadata.title || 'video_lesson').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '_lesson.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      banner('💾 JSON downloaded');
    } catch (e) { banner('Download blocked — use 📋 Copy JSON'); }
  };
  VL.wizSave = function () {
    if (!state._wizLesson) return;
    try {
      localStorage.setItem('tutorly-video-live-' + FILE_NAME, JSON.stringify(state._wizLesson));
      banner('✅ Saved — open it via ▶ Open Live as Presenter in Saved Lessons');
    } catch (e) { banner('Could not save (storage full) — use 📋 Copy JSON'); }
  };
  VL.wizCopyPrompt = function () {
    var lesson = buildLessonFromChapters();
    copyText(JSON.stringify(lesson, null, 2), 'Prompt copied — paste into any AI with: “Turn this into a complete 🎬 Video Lesson JSON”');
  };

  /* ---------- watch party ---------- */
  function openParty() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,6,20,.8);z-index:150;display:flex;align-items:center;justify-content:center;padding:14px';
    overlay.innerHTML = '<div style="background:#171332;border:1px solid var(--line);border-radius:18px;max-width:520px;width:100%;padding:18px;max-height:90vh;overflow:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:17px">👥 Watch Party</b><button class="vl-btn" onclick="this.closest(\\'div\\').parentElement.remove()">✕</button></div>' +
      '<div class="vl-party">' +
      '<div class="vl-partybox"><b>Host a party</b><p class="vl-notes" style="margin:6px 0">You control play/pause; guests follow in sync and answer live polls.</p><button class="vl-btn vio" onclick="VL.hostParty(this)">🚀 Create room</button><div class="vl-notes" id="vl-pcode" style="margin-top:8px"></div></div>' +
      '<div class="vl-partybox"><b>Join a party</b><input class="vl-in" id="vl-pjoin" placeholder="Room code…"><button class="vl-btn ok" onclick="VL.joinParty(this)">Join</button><div class="vl-notes" style="margin-top:6px">Open this lesson on any device and join with the room code — works across different computers (PeerJS rooms).</div></div>' +
      '</div>' +
      '<div id="vl-party-live" style="display:none;margin-top:12px">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b id="vl-prole" style="font-size:13px"></b><span class="vl-chip" id="vl-pcode2"></span><span class="vl-chip">peers: ~<span id="vl-peers">1</span></span><span style="flex:1"></span><button class="vl-btn" onclick="VL.leaveParty()">Leave</button></div>' +
      '<div class="vl-chat" id="vl-chat"></div>' +
      '<div class="vl-reacts"><span onclick="VL.react(\\'👍\\')">👍</span><span onclick="VL.react(\\'🎉\\')">🎉</span><span onclick="VL.react(\\'😮\\')">😮</span><span onclick="VL.react(\\'😂\\')">😂</span><span onclick="VL.react(\\'💡\\')">💡</span><span onclick="VL.react(\\'❤️\\')">❤️</span></div>' +
      '<div style="display:flex;gap:6px"><input class="vl-in" id="vl-msg" placeholder="Say something…" onkeydown="if(event.key===\\'Enter\\')VL.chat()"><button class="vl-btn ok" onclick="VL.chat()">Send</button></div>' +
      '<div id="vl-pollarea"></div>' +
      '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button class="vl-btn" onclick="VL.syncNow()">🔄 Re-sync video</button><button class="vl-btn vio" onclick="VL.makePoll()">📊 Live poll</button></div>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
  }
  /* ---------- watch party transport (PeerJS rooms, BroadcastChannel fallback) ---------- */
  var BCAST = null;          // same-device fallback channel
  var PEER = null;           // PeerJS instance
  var PCONNS = {};           // peer-id -> DataConnection (host side)
  var PHOST = null;          // host connection (guest side)
  var PMODE = 'bc';          // 'peer' | 'bc'
  var PEER_RETRIES = 0;
  var PEER_ID_PREFIX = 'vlp-';
  function bc(code) {
    if (BCAST && BCAST.name === 'vl-party-' + code) return BCAST;
    if (BCAST) { try { BCAST.close(); } catch (e) { /* noop */ } }
    BCAST = new BroadcastChannel('vl-party-' + code);
    BCAST.onmessage = function (ev) { onPartyMsg(ev.data); };
    return BCAST;
  }
  function peerOptions() {
    return { debug: 1, config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'turn:relay1.expressturn.com:3478', username: 'efZ4VGOVT7FWHM5RNC', credential: 'uoaX5K3QJEegQBnO' }
    ] } };
  }
  function waitForPeer(retries, cb) {
    if (window.Peer) { cb(window.Peer); return; }
    if (retries <= 0) { cb(null); return; }
    setTimeout(function () { waitForPeer(retries - 1, cb); }, 200);
  }
  function peerPeerId(code) { return PEER_ID_PREFIX + code; }
  function onPartyMsg(m) {
    if (!state.party) return;
    if (m.from === state.party.myId) return;
    if (m.type === 'chat') addChat(m.name, m.text);
    if (m.type === 'react') addChat('', m.react, true);
    if (m.type === 'hello') {
      addChat('', '👋 ' + esc(m.name) + ' joined the party', true);
      if (state.party.role === 'host') {
        partyPeerCount();
        try { partySend('state', { t: playerTimeNow(), p: state._playing, url: playerUrl() }); } catch (e) { /* noop */ }
        if (state._poll) { try { partySend('pollstate', { pollId: state._poll.q, votes: state._poll.votes }); } catch (e) { /* noop */ } }
      }
    }
    if (m.type === 'poll') showPoll(m);
    if (m.type === 'vote') {
      // guest -> host vote; host merges + rebroadcasts tallies
      if (state.party.role === 'host' && state._poll && state._poll.q === m.q) {
        state._poll.votes[m.from + '|' + m.name] = m.oi;
        showPoll(state._poll);
        try { partySend('pollstate', { pollId: state._poll.q, votes: state._poll.votes }); } catch (e) { /* noop */ }
      }
    }
    if (m.type === 'pollstate' && state.party.role === 'guest' && state._poll && state._poll.q === m.pollId) {
      state._poll.votes = m.votes || {};
      showPoll(state._poll);
    }
    if (m.type === 'state' && state.partyRole === 'guest') {
      if (m.url && m.url !== playerUrl()) setPlayerUrl(m.url);
      try {
        if (m.p) { seekTo(m.t); setTimeout(play, 150); }
        else { try { if (state._player) state._player.pauseVideo(); } catch (e) { /* noop */ } var v = el('vl-vid'); if (v) v.pause(); }
      } catch (e) { /* noop */ }
    }
  }
  function playerTimeNow() {
    if (state._player) { try { return state._player.getCurrentTime(); } catch (e) { /* noop */ } }
    var v = el('vl-vid');
    return v ? v.currentTime : 0;
  }
  function partyPeerCount() {
    var n = PMODE === 'peer' ? (state.party.role === 'host' ? Object.keys(PCONNS).length + 1 : 2) : 1;
    var el = $('#vl-peers'); if (el) el.textContent = String(n);
  }
  function teardownParty() {
    if (PEER) { try { PEER.destroy(); } catch (e) { /* noop */ } }
    PEER = null; PCONNS = {}; PHOST = null; PMODE = 'bc'; PEER_RETRIES = 0;
    if (BCAST) { try { BCAST.close(); } catch (e) { /* noop */ } }
    BCAST = null; state.party = null;
    banner('Left the party');
    var live = $('#vl-party-live');
    if (live) { live.style.display = 'none'; var pcode = $('#vl-pcode'); if (pcode) pcode.textContent = ''; }
  }
  function setupPeerConn(conn) {
    conn.on('open', function () {
      if (state.party.role === 'host') { PCONNS[conn.peer] = conn; partyPeerCount(); }
      else PHOST = conn;
      addChat('', state.party.role === 'host' ? ('🔗 ' + esc(conn.metadata && conn.metadata.name ? conn.metadata.name : conn.peer) + ' connected') : '🔗 Connected to host', true);
      partyPeerCount();
    });
    conn.on('data', function (data) { try { onPartyMsg(typeof data === 'string' ? JSON.parse(data) : data); } catch (e) { /* noop */ } });
    conn.on('close', function () {
      if (state.party && state.party.role === 'host' && PCONNS[conn.peer]) { delete PCONNS[conn.peer]; partyPeerCount(); addChat('', '👋 A guest left', true); }
      if (PHOST === conn) PHOST = null;
    });
    conn.on('error', function () { /* noop */ });
  }
  function openPeer() {
    waitForPeer(40, function (PeerCtor) {
      if (!state.party) return;
      if (!PeerCtor) {
        // PeerJS CDN unreachable → same-device BroadcastChannel fallback
        bc(state.party.code);
        partyShowLive();
        addChat('', '⚠️ Peer network unavailable — using same-device mode (another tab on this computer).', true);
        return;
      }
      try {
        var id = state.party.role === 'host' ? peerPeerId(state.party.code) : undefined;
        PEER = new PeerCtor(id, peerOptions());
        PEER.on('open', function (myId) {
          if (!state.party) { try { PEER.destroy(); } catch (e) { /* noop */ } return; }
          PMODE = 'peer';
          state.party.myId = myId;
          if (state.party.role === 'host') {
            partyShowLive();
            addChat('', '🎬 Party created — room ' + state.party.code + ' · online mode (any device)', true);
            partyPeerCount();
          } else {
            connectToHost();
          }
        });
        PEER.on('connection', function (conn) {
          if (state.party && state.party.role === 'host') setupPeerConn(conn);
        });
        PEER.on('disconnected', function () {
          if (!state.party) return;
          if (PEER_RETRIES < 6) { PEER_RETRIES++; try { PEER.reconnect(); } catch (e) { /* noop */ } }
        });
        PEER.on('error', function (err) {
          if (!state.party) return;
          if (err && err.type === 'unavailable-id') {
            // room code taken by a different host → try again with a suffix
            var newCode = state.party.code + '-' + Math.random().toString(36).slice(2, 4).toUpperCase();
            state.party.code = newCode;
            try { PEER.destroy(); } catch (e) { /* noop */ }
            PEER = null;
            openPeer();
            return;
          }
          if (err && (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'socket-closed')) {
            if (PMODE !== 'peer') { bc(state.party.code); partyShowLive(); }
          }
        });
      } catch (e) {
        bc(state.party.code);
        partyShowLive();
        addChat('', '⚠️ Could not reach the peer server — using same-device mode.', true);
      }
    });
  }
  function connectToHost() {
    if (!PEER || !state.party) return;
    try {
      PHOST = PEER.connect(peerPeerId(state.party.code), { reliable: true, metadata: { name: LEARNER_NAME } });
      setupPeerConn(PHOST);
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (PHOST && PHOST.open) {
          clearInterval(iv);
          try { PHOST.send({ type: 'hello', from: state.party.myId, name: state.party.name, code: state.party.code }); } catch (e) { /* noop */ }
          partyShowLive();
          addChat('', '👋 You joined room ' + state.party.code + ' · online mode', true);
          partyPeerCount();
        } else if (tries > 30 || (PEER && PEER.destroyed)) {
          clearInterval(iv);
          // Host not found → try BroadcastChannel same-device as a last resort
          if (state.party) { bc(state.party.code); partyShowLive(); addChat('', '⚠️ Host not reachable over network — trying same-device mode.', true); }
        }
      }, 500);
    } catch (e) {
      if (state.party) { bc(state.party.code); partyShowLive(); }
    }
  }
  VL.hostParty = function (btn) {
    var code = Math.random().toString(36).slice(2, 8).toUpperCase();
    var name = LEARNER_NAME + ' (Host)';
    state.party = { code: code, role: 'host', myId: 'H' + Math.random().toString(36).slice(2, 7), name: name };
    var pcode = $('#vl-pcode');
    if (pcode) pcode.innerHTML = '<b style="font-size:19px;letter-spacing:3px;color:var(--gold)">' + code + '</b><br><span class="vl-notes">Share this code — learners open this lesson on <b>any device</b> (even different computers) and join with the code.</span>';
    openPeer();
  };
  VL.joinParty = function (btn) {
    var code = ($('#vl-pjoin') ? $('#vl-pjoin').value : '').trim().toUpperCase();
    if (!code) { banner('Enter the room code'); return; }
    state.party = { code: code, role: 'guest', myId: 'G' + Math.random().toString(36).slice(2, 7), name: LEARNER_NAME };
    openPeer();
  };
  VL.leaveParty = function () { teardownParty(); };
  function partyShowLive() {
    var live = $('#vl-party-live');
    if (live) live.style.display = 'block';
    var role = $('#vl-prole'); if (role) role.textContent = (state.party.role === 'host' ? '👑 Hosting ' : '👋 Joined ') + state.party.code + (PMODE === 'peer' ? ' · 🌐 online' : '');
    var p2 = $('#vl-pcode2'); if (p2) p2.textContent = state.party.code;
    if (state.party.role === 'host') {
      try { partySend('state', { t: 0, p: false }); } catch (e) { /* noop */ }
    }
  }
  function partySend(type, payload) {
    if (!state.party) return;
    var m = { type: type, from: state.party.myId, name: state.party.name, code: state.party.code };
    for (var k in payload) m[k] = payload[k];
    if (PMODE === 'peer' && PEER) {
      try {
        var s = JSON.stringify(m);
        if (state.party.role === 'host') {
          Object.keys(PCONNS).forEach(function (k) { try { PCONNS[k].send(s); } catch (e) { /* noop */ } });
        } else if (PHOST && PHOST.open) {
          PHOST.send(s);
        }
      } catch (e) { /* noop */ }
      return;
    }
    if (BCAST) { try { BCAST.postMessage(m); } catch (e) { /* noop */ } }
  }
  VL.chat = function () {
    var inp = $('#vl-msg'); if (!inp) return;
    var text = inp.value.trim(); if (!text) return;
    inp.value = '';
    addChat(state.party.name, text);
    partySend('chat', { text: text });
  };
  VL.react = function (r) { addChat('', r, true); partySend('react', { react: r }); };
  VL.syncNow = function () {
    if (!state._player) { try { var v = el('vl-vid'); partySend('state', { t: v ? v.currentTime : 0, p: v ? !v.paused : false }); } catch (e) { /* noop */ } return; }
    try { partySend('state', { t: state._player.getCurrentTime(), p: state._playing }); banner('Sent current playback to party'); } catch (e) { /* noop */ }
  };
  VL.makePoll = function () {
    if (state.party.role !== 'host') { banner('Only the host can launch polls'); return; }
    var q = prompt('Live poll question:');
    if (!q) return;
    var opts = prompt('Options separated by "|" (2-4):');
    if (!opts) return;
    var list = opts.split('|').map(function (s) { return s.trim(); }).slice(0, 4);
    if (list.length < 2) { banner('Need at least 2 options'); return; }
    var poll = { type: 'poll', q: q, opts: list, votes: {}, from: state.party.myId, name: state.party.name };
    state._poll = poll;
    showPoll(poll);
    partySend('poll', { q: q, opts: list });
  };
  VL.vote = function (oi) {
    var poll = state._poll; if (!poll) return;
    var key = state.party.myId + '|' + state.party.name;
    poll.votes[key] = oi;
    poll.myVote = oi;
    showPoll(poll);
    // send the vote to the host; host merges + rebroadcasts tallies to everyone
    partySend('vote', { q: poll.q, oi: oi });
  };
  function showPoll(m) {
    var area = $('#vl-pollarea'); if (!area) return;
    if (m.type !== 'poll') return;
    if (!state._poll || state._poll.q !== m.q) {
      state._poll = { type: 'poll', q: m.q, opts: m.opts || [], votes: {}, name: m.name || 'Host' };
    }
    var poll = state._poll;
    var total = Object.keys(poll.votes).length;
    var myKey = state.party ? state.party.myId + '|' + state.party.name : '';
    var myVote = poll.myVote !== undefined ? poll.myVote : (myKey && poll.votes[myKey] !== undefined ? poll.votes[myKey] : -1);
    var html = '<div class="vl-poll"><div style="display:flex;gap:8px;align-items:center"><b style="font-size:13px">📊 LIVE POLL</b><span style="flex:1"></span><span class="vl-notes">' + total + ' voted · ' + (myVote >= 0 ? 'your pick ✓' : 'tap to vote') + '</span></div>' +
      '<div style="font-size:14px;font-weight:800;margin:6px 0">' + esc(m.q || poll.q) + '</div>' +
      poll.opts.map(function (o, oi) {
        var n = Object.keys(poll.votes).filter(function (k) { return poll.votes[k] === oi; }).length;
        var pct = total ? Math.round(n / total * 100) : 0;
        var mine = myVote === oi;
        return '<div style="margin:5px 0"><button class="vl-opt' + (mine ? ' mine' : '') + '" style="padding:7px 10px;font-size:12.5px' + (mine ? ';border-color:var(--gold)!important;color:var(--gold)!important;font-weight:800' : '') + '" onclick="VL.vote(' + oi + ')">' + esc(o) + ' <span class="vl-notes">' + n + (total ? ' · ' + pct + '%' : '') + '</span></button>' +
          '<div style="height:7px;background:rgba(15,23,42,.12);border-radius:9px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#f6b73c,#e8891c);border-radius:9px"></div></div></div>';
      }).join('') + '</div>';
    area.innerHTML = html;
  }
  function addChat(name, text, isSys) {
    var chat = $('#vl-chat'); if (!chat) return;
    var d = document.createElement('div');
    if (isSys) d.innerHTML = '<span style="color:var(--gold)">' + esc(text) + '</span>';
    else d.innerHTML = '<span class="who">' + esc(name || 'Guest') + ':</span> ' + esc(text);
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
  }

  /* drag & drop support (ordering + drag-drop) */
  document.addEventListener('dragstart', function (ev) {
    var t = ev.target;
    if (t && t.classList && t.classList.contains('vl-sortitem')) {
      t.classList.add('drag');
      ev.dataTransfer.setData('text/plain', t.id || (function () { if (!t.id) t.id = 'vl-drag-' + Math.random().toString(36).slice(2, 8); return t.id; })());
    }
  });
  document.addEventListener('dragend', function (ev) {
    var t = ev.target;
    if (t && t.classList) t.classList.remove('drag');
  });
  document.addEventListener('dragover', function (ev) {
    if (ev.target && ev.target.classList && ev.target.classList.contains('vl-sort')) ev.preventDefault();
  });
  document.addEventListener('drop', function (ev) {
    var t = ev.target;
    if (t && t.classList && t.classList.contains('vl-sort') && ev.dataTransfer) {
      ev.preventDefault();
      var id = ev.dataTransfer.getData('text/plain');
      var el = document.getElementById(id);
      if (!el) return;
      var after = null;
      for (var i = 0; i < t.children.length; i++) {
        var r = t.children[i].getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) { after = t.children[i]; break; }
      }
      if (after) t.insertBefore(el, after); else t.appendChild(el);
    }
  });

  /* ---------- boot ---------- */
  window.VL = VL;
  window.openParty = openParty; // inline onclick="openParty()" in the right rail needs it on window
  function boot() {
    var root = $('#vl-root');
    if (!root) return;
    var demoSubs = window.__VL_SUBS__ || '';
    if (demoSubs) state.subCues = parseVtt(demoSubs);
    root.innerHTML =
      '<div class="vl-banner" id="vl-banner"></div>' +
      '<div class="vl-wrap">' +
      '<div class="vl-top">' +
      '<span class="vl-logo">🎬</span>' +
      '<span class="vl-title">' + esc(LESSON.metadata.title) + '</span>' +
      '<span class="vl-chip">' + esc(LESSON.metadata.cefrLevel) + '</span>' +
      '<span class="vl-chip">' + esc(LESSON.metadata.targetLanguage) + '</span>' +
      '<span class="vl-lvl" id="vl-lvl">Lv.1</span>' +
      '<span class="vl-xp" id="vl-xp">0 XP</span>' +
      '<span class="vl-xp" id="vl-streak" style="color:#fb923c"></span>' +
      '<span class="vl-badges" id="vl-badges"></span>' +
      '<span style="flex:1"></span>' +
      '<button class="vl-topbtn" id="vl-tab-lesson" onclick="VL.openLesson()">🎥 Lesson</button>' +
      '<button class="vl-topbtn" id="vl-tab-stream" onclick="VL.openStream()">📺 Streaming</button>' +
      '<button class="vl-topbtn gold" onclick="VL.print()">🖨 Print</button>' +
      '</div>' +
      '<div class="vl-progress"><span>' + esc(LEARNER_NAME) + '</span><div class="bar"><div class="fill" id="vl-prog-fill"></div></div><span id="vl-prog-txt">0/' + TOTAL + '</span></div>' +
      '<div class="vl-main">' +
      '<div class="vl-left" id="vl-left">' +
      '<div class="vl-panel" style="padding:0;overflow:hidden;border:0" id="vl-playershell"></div>' +
      '<div id="vl-content"></div>' +
      '</div>' +
      '<div class="vl-right" id="vl-right"></div>' +
      '</div></div>';
    renderLeft();
    renderRight();
    mountPlayer();
    mirror();
  }
  function setPlayerUrlSilent(url) { /* avoid rebuild: just ensure captions engine alive */ state.playerUrl = url; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
`;
