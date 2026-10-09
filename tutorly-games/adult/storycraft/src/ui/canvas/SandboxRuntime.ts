/**
 * Sandbox runtime injected into deployed AI scene iframes.
 *
 * The runtime installs a set of global helper functions inside the iframe that
 * talk to the parent canvas via postMessage. The parent:
 *   - speaks every awRead() call with a forced natural voice (never David).
 *   - applies item pickups / stat changes to the SELECTED player on the
 *     leaderboard (or the first living player if no selection).
 *   - plays ambient/SFX through its own (user-gesture-unlocked) audio engine.
 *
 * These helpers cover the full contract the AI is told to use in the
 * Story Maker prompt:
 *   awRead, awStopRead, awItem, awStat, awPowerup, awStatus, awDecision,
 *   awLevelUp, awPlaySfx, awPlayAmbient, awStopAmbient, awVote, awTimer,
 *   awGoPhase, awComplete, awEvolve.
 *
 * The runtime also delegates clicks for data-attribute based interactions so
 * the AI's buttons "just work" even without inline handlers. Critically,
 * ANY element whose text contains "Pick up" or similar verbs will be
 * considered an item pickup by the runtime (last-resort heuristic) so
 * buttons the AI forgot to wire are still picked up by the canvas.
 */

export const SANDBOX_RUNTIME_CSS = `
.aw-rt-bar{position:fixed;top:8px;right:8px;z-index:99999;display:flex;gap:6px}
.aw-rt-bar button{appearance:none;border:1px solid rgba(255,255,255,.22);background:rgba(7,10,20,.78);color:#e2e8f0;border-radius:10px;padding:5px 9px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(10px)}
.aw-rt-bar button:hover{background:rgba(7,10,20,.95)}

.aw-read{display:inline-flex;align-items:center;gap:4px;font:600 12px Inter,system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,#7c3aed,#4f46e5);border:0;border-radius:999px;padding:5px 12px;cursor:pointer;transition:.15s}
.aw-read:hover{filter:brightness(1.1);transform:translateY(-1px)}
.aw-used{opacity:.55;filter:grayscale(.5)}
.aw-used::after{content:" ✓";color:#4ade80;font-weight:900}
.aw-flash{animation:awFlash .6s ease}
@keyframes awFlash{0%{box-shadow:0 0 0 0 rgba(167,139,250,.6)}100%{box-shadow:0 0 0 24px rgba(167,139,250,0)}}
`;

const RUNTIME_JS_BODY = `
(function(){
  if (window.__awSandboxInit) return; window.__awSandboxInit = true;
  function $(s,r){ return (r||document).querySelector(s); }
  function $$(s,r){ return Array.from((r||document).querySelectorAll(s)); }
  function post(msg){
    try { window.parent && window.parent.postMessage(Object.assign({ source:'aw-scene' }, msg), '*'); } catch(e){}
  }
  // Detect a likely item-name from a button's text.
  function detectName(text){
    var t = (text||'').replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g,'').trim();
    if (!t) return null;
    var patterns = [
      /pick\s*up\s+(?:the\s+)?(.+?)$/i,
      /drink\s+(?:the\s+)?(.+?)$/i,
      /eat\s+(?:the\s+)?(.+?)$/i,
      /take\s+(?:the\s+)?(.+?)$/i,
      /grab\s+(?:the\s+)?(.+?)$/i,
      /collect\s+(?:the\s+)?(.+?)$/i,
      /equip\s+(?:the\s+)?(.+?)$/i,
      /buy\s+(?:the\s+)?(.+?)$/i,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = t.match(patterns[i]);
      if (m) return m[1].replace(/^the\s+/i,'').trim();
    }
    if (/^(pick up|take|grab|use|drink|eat|open|attack|hit|fight|read|examine|inspect)/i.test(t)) return t;
    return null;
  }

  // ---- The ONLY speech path: ask the PARENT to speak (forced natural voice).
  window.awRead = function(text, voiceURI){
    if (!text) return;
    post({ kind:'read', text:String(text), voiceURI: voiceURI || '' });
  };
  window.awStopRead = function(){ post({ kind:'stop' }); };

  // ---- State mutations applied to the SELECTED player on the leaderboard.
  var __lastItem = { name:'', at:0 };
  window.awItem = function(emoji, name, rarity){
    var nm = String(name || 'Item').trim();
    var now = Date.now();
    // Prevent duplicate grants caused by a button that has BOTH inline
    // onclick="awItem(...)" and our generic text fallback on the same click.
    if (__lastItem.name === nm.toLowerCase() && (now - __lastItem.at) < 600) return;
    __lastItem = { name:nm.toLowerCase(), at:now };
    post({ kind:'give-item', emoji:emoji||'📦', name:nm, rarity:rarity||'common' }); flash();
  };
  window.awStat = function(key, op, val, targetId){ post({ kind:'stat', key:key, op:op||'add', val:Number(val)||0, targetId: targetId || '' }); flash(); };
  window.awPowerup = function(name){ post({ kind:'powerup', name:name||'Power' }); flash(); };
  window.awStatus = function(emoji, label, turns){ post({ kind:'status', emoji:emoji||'✨', label:label||'Status', turns:Number(turns)||-1 }); flash(); };
  window.awDecision = function(action){ post({ kind:'decision', action:String(action||'') }); };
  window.awLevelUp = function(entityId){ post({ kind:'evolution', entityId: entityId || '' }); };
  window.awEvolve = window.awLevelUp;
  window.awPlaySfx = function(url, volume){ post({ kind:'play-sfx', url:String(url||''), volume:Number(volume)||1 }); };
  window.awPlayAmbient = function(url, volume){ post({ kind:'play-ambient', url:String(url||''), volume:Number(volume)||0.5 }); };
  window.awStopAmbient = function(){ post({ kind:'stop-ambient' }); };
  window.awComplete = function(el){ try { (el && el.classList ? el : (el && el.target)).classList.add('aw-used'); } catch(e){} };

  function flash(){ try { document.body.classList.add('aw-flash'); setTimeout(function(){ document.body.classList.remove('aw-flash'); }, 600); } catch(e){} }

  // ---- Phase navigator -------------------------------------------------
  function findPhases(){ return $$('[data-aw-phase]'); }
  function setPhase(p){
    var phases = findPhases();
    phases.forEach(function(s){ s.style.display = (s.getAttribute('data-aw-phase') === p) ? '' : 'none'; });
    try { window.scrollTo({ top:0, behavior:'smooth' }); } catch(e){}
    $$('.aw-phase-fallback, .aw-phase-nav').forEach(function(nav){
      nav.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b.dataset.phase === p); });
    });
  }
  window.awGoPhase = function(p){ setPhase(p); };

  function buildPhaseFallback(){
    var phases = findPhases();
    if (phases.length === 0) return;
    // Per user request: do NOT render a phase navigator bar.
    // Just show the first phase (intro if it exists, otherwise game).
    var order = ['intro','cast','howto','game'];
    var found = order.filter(function(p){ return phases.some(function(s){ return s.getAttribute('data-aw-phase')===p; }); });
    if (found.length > 0) setPhase(found[0]);
  }

  // ---- Local vote tally helper ----------------------------------------
  window.awVote = function(target, tallyElId){
    try {
      var el = tallyElId ? document.getElementById(tallyElId) : null;
      var key = '__awVotes'; window[key] = window[key] || {};
      window[key][target] = (window[key][target]||0)+1;
      if (el) el.textContent = Object.keys(window[key]).map(function(k){ return k+': '+window[key][k]; }).join('  •  ');
      awRead('Vote cast against ' + target);
    } catch(e){}
  };

  // ---- Local timer helper ---------------------------------------------
  window.awTimer = function(seconds, elId){
    var el = elId ? document.getElementById(elId) : null;
    var t = Math.max(0, parseInt(seconds,10)||30);
    function tick(){
      if (el) el.textContent = '⏱ ' + t + 's';
      if (t <= 0) { if (el) el.textContent = '⏱ Time!'; return; }
      t -= 1; setTimeout(tick, 1000);
    }
    tick();
  };

  // ---- Delegated click handling for data-attribute interactions -------
  document.addEventListener('click', function(ev){
    var el = ev.target.closest && ev.target.closest('[data-aw-read],[data-aw-give-item],[data-aw-stat],[data-aw-powerup],[data-aw-status],[data-aw-decision],[data-aw-evolve],.aw-read');
    if (!el) return;
    ev.stopPropagation();

    if (el.matches('[data-aw-read], .aw-read')) {
      var text = el.dataset.text || el.getAttribute('data-text') || (el.textContent||'').trim();
      var voice = el.dataset.voice || el.getAttribute('data-voice') || '';
      awRead(text, voice);
    }
    if (el.hasAttribute('data-aw-give-item')) {
      var name = el.dataset.name || el.getAttribute('data-aw-give-item');
      var emoji = el.dataset.emoji || '📦';
      var rarity = el.dataset.rarity || 'common';
      awItem(emoji, name, rarity); markUsed(el);
    }
    if (el.hasAttribute('data-aw-stat')) { awStat(el.dataset.key, el.dataset.op, el.dataset.val, el.dataset.targetId || el.dataset.id || ''); markUsed(el); }
    if (el.hasAttribute('data-aw-powerup')) { awPowerup(el.dataset.name); markUsed(el); }
    if (el.hasAttribute('data-aw-status')) { awStatus(el.dataset.emoji, el.dataset.label, el.dataset.turns); markUsed(el); }
    if (el.hasAttribute('data-aw-decision')) {
      awDecision(el.dataset.action || (el.textContent||'').trim());
      var group = el.closest('.aw-decision') || el.parentElement;
      if (group) group.querySelectorAll('[data-aw-decision], button').forEach(function(b){ b.classList.add('aw-used'); b.disabled = true; });
    }
    if (el.hasAttribute('data-aw-evolve')) { awLevelUp(el.dataset.id || ''); markUsed(el); }
    var reveal = el.getAttribute('data-aw-reveal');
    if (reveal) { var tgt = document.getElementById(reveal); if (tgt) { tgt.style.display=''; tgt.classList.add('aw-flash'); tgt.scrollIntoView({behavior:'smooth', block:'center'}); } }
  }, true);

  // ---- FALLBACK: any unstyled <button> whose text looks like an action is
  // wrapped to call the right helper. This ensures the AI's buttons "just
  // work" even if it forgot to add data attributes.
  function wrapGenericButtons(){
    $$('button, [role="button"], .aw-action').forEach(function(b){
      if (b.__awWrapped) return; b.__awWrapped = true;
      var inline = (b.getAttribute('onclick') || '').toLowerCase();
      var hasExplicitAw = inline.indexOf('awitem') >= 0 || inline.indexOf('awstat') >= 0 || inline.indexOf('awpowerup') >= 0 || inline.indexOf('awstatus') >= 0 || inline.indexOf('awdecision') >= 0 || b.hasAttribute('data-aw-give-item') || b.hasAttribute('data-aw-stat') || b.hasAttribute('data-aw-powerup') || b.hasAttribute('data-aw-status') || b.hasAttribute('data-aw-decision');
      if (hasExplicitAw) return;
      b.addEventListener('click', function(){
        var t = (b.textContent || '').trim();
        if (!t) return;
        var name = detectName(t);
        if (!name) return;
        // Heuristic: if it says "Pick up X" / "Drink X" / "Eat X" → give-item.
        if (/^(pick up|grab|take|collect|buy|equip)/i.test(t)) {
          var em = '📦';
          if (/gun|firearm|rifle|pistol|shotgun/i.test(name)) em = '🔫';
          else if (/sword|blade|dagger|axe/i.test(name)) em = '⚔️';
          else if (/key/i.test(name)) em = '🗝️';
          else if (/potion|bottle|drink|elixir/i.test(name)) em = '🧪';
          else if (/food|apple|bread|meal|steak/i.test(name)) em = '🍎';
          else if (/book|scroll|note|letter/i.test(name)) em = '📜';
          else if (/amulet|ring|gem|charm/i.test(name)) em = '💍';
          else if (/coin|gold/i.test(name)) em = '🪙';
          else if (/map/i.test(name)) em = '🗺️';
          awItem(em, name, 'common'); markUsed(b);
        } else if (/^(drink|eat|use)/i.test(t)) {
          if (/water|juice|drink|canteen|bottle|soda|tea|coffee/i.test(name)) awStat('thirst', 'add', -25);
          else if (/food|apple|bread|meal|steak|meat|berry|berries|fruit|ration/i.test(name)) awStat('hunger', 'add', -25);
          else if (/potion|healing|medkit|medicine|bandage|elixir/i.test(name)) awStat('health', 'add', 25);
          else awStat('score', 'add', 5);
          markUsed(b);
        } else if (/^(open|attack|hit|fight)/i.test(t)) {
          awStat('score', 'add', 5); markUsed(b);
        } else if (/^(read|examine|inspect)/i.test(t)) {
          awRead('You examine the ' + name + '. It looks interesting.', '');
          markUsed(b);
        }
      });
    });
  }

  function markUsed(el){
    var card = el.closest('.aw-card, .aw-scene-card, article') || el;
    el.classList.add('aw-used');
    if (el.tagName === 'BUTTON') el.disabled = true;
    if (card && card !== el) card.classList.add('aw-flash');
  }

  // Defer all body-touching code until the DOM is ready, because the
  // runtime is now injected in <head> BEFORE the body exists.
  function whenBodyReady(fn){
    if (document.body) { fn(); return; }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      setTimeout(fn, 0);
    }
  }

  whenBodyReady(function(){
    // ---- Top bar: only a small mute button, no Top button. ----
    var bar = document.createElement('div'); bar.className='aw-rt-bar';
    var mute = document.createElement('button'); mute.textContent='🔇';
    mute.title = 'Stop voice';
    mute.onclick = function(){ awStopRead(); };
    bar.appendChild(mute);
    document.body.appendChild(bar);

    // ---- init -----------------------------------------------------------
    buildPhaseFallback();
    wrapGenericButtons();

    try {
      var mo = new MutationObserver(function(){ wrapGenericButtons(); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch(e){}
  });
})();
`;

export const SANDBOX_RUNTIME_JS = RUNTIME_JS_BODY;
