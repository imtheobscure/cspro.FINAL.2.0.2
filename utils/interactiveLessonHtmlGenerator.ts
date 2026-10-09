/**
 * Interactive Lesson HTML generator (ported from interactive-lesson-maker/).
 *
 * Takes Lesson Creator data:
 *   {
 *     title, unit?,
 *     learner: { name, level, nativeLanguage, xp, streak, gems },
 *     studyHtml, speakHtml, practiceHtml   // raw HTML for each tab
 *   }
 * and emits a standalone, offline-capable, mobile-first Duolingo-style player:
 * top HUD (hearts/streak/gems/XP), cat companion, Study/Speak/Practice tabs,
 * iframe sandbox with the lesson content, combo multiplier, confetti + XP toast
 * on every correct answer (same visual language as Micro Lesson V1).
 */

export interface InteractiveLessonData {
  title: string;
  unit?: string;
  learner?: {
    name?: string;
    level?: string;
    nativeLanguage?: string;
    xp?: number;
    streak?: number;
    gems?: number;
  };
  studyHtml: string;
  speakHtml: string;
  practiceHtml: string;
}

// ─── iframe document styles (ported from LessonMaker IFRAME_STYLES) ──────────
const IFRAME_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.7;color:#2d3748;padding:14px;background:#fff;font-size:16px}
h1,h2,h3,h4{color:#1a202c;margin:18px 0 10px;font-weight:700}
h1{font-size:clamp(22px,6vw,28px);border-bottom:3px solid #58CC02;padding-bottom:8px}
h2{font-size:clamp(19px,5vw,22px);color:#2563eb}
h3{font-size:clamp(16px,4.4vw,18px);color:#7c3aed}
p{margin:8px 0}
img{max-width:100%;border-radius:12px;margin:10px 0}
a{color:#2563eb}
ul,ol{margin:8px 0 8px 22px}
table{width:100%;border-collapse:collapse;margin:12px 0;border-radius:8px;overflow:hidden;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
th{background:#58CC02;color:#fff;padding:10px;text-align:left;white-space:nowrap}
td{padding:8px 10px;border-bottom:1px solid #e2e8f0}
tr:nth-child(even){background:#f7fafc}
.callout{border-radius:12px;padding:16px;margin:14px 0;border-left:4px solid;position:relative}
.callout-warning{background:#fefce8;border-color:#eab308;color:#854d0e}
.callout-question{background:#eff6ff;border-color:#3b82f6;color:#1e40af;cursor:pointer}
.callout-think{background:#fdf4ff;border-color:#a855f7;color:#6b21a8}
.callout-look{background:#fff7ed;border-color:#f97316;color:#9a3412}
.callout-important{background:#fef2f2;border-color:#ef4444;color:#991b1b}
.callout-idea{background:#fffbeb;border-color:#f59e0b;color:#92400e}
.callout-didyouknow{background:#f0fdf4;border-color:#22c55e;color:#166534}
.callout-example{background:#eff6ff;border-color:#60a5fa;color:#1e40af}
.callout-challenge{background:#fdf2f8;border-color:#ec4899;color:#9d174d}
.callout-brain{background:#f5f3ff;border-color:#8b5cf6;color:#5b21b6}
.callout-steps{background:#f8fafc;border-color:#64748b;color:#334155}
.callout-checklist{background:#f0fdf4;border-color:#4ade80;color:#166534}
.callout-reflect{background:#faf5ff;border-color:#c084fc;color:#7c3aed}
.callout-pair{background:#ecfdf5;border-color:#34d399;color:#065f46}
.callout-success{background:#f0fdf4;border-color:#22c55e;color:#14532d;border-width:3px}
.callout-objective{background:#eff6ff;border-color:#2563eb;color:#1e3a8a}
.callout-vocab{background:#e0f2fe;border-color:#0ea5e9;color:#0c4a6e}
.callout-grammar{background:#fef3c7;border-color:#d97706;color:#78350f}
.callout-pronunciation{background:#fce7f3;border-color:#ec4899;color:#831843}
.callout-mistake{background:#fee2e2;border-color:#f87171;color:#7f1d1d}
.callout-teacher{background:#dbeafe;border-color:#3b82f6;color:#1e3a8a}
.callout-exit{background:#e0e7ff;border-color:#6366f1;color:#3730a3}
.callout-quote{background:#faf5ff;border-color:#a78bfa;color:#5b21b6;font-style:italic;text-align:center}
.callout-protip{background:#fef9c3;border-color:#facc15;color:#713f12}
.callout-reminder{background:#fff1f2;border-color:#fb7185;color:#9f1239}
.callout-culture{background:#ecfdf5;border-color:#10b981;color:#064e3b}
.callout-realworld{background:#f1f5f9;border-color:#94a3b8;color:#334155}
.callout-story{background:#fffbeb;border-color:#fbbf24;color:#78350f}
.callout .reveal{display:none;margin-top:8px;padding:8px;background:rgba(255,255,255,0.7);border-radius:8px}
.callout.revealed .reveal{display:block}
.activity{background:#f8fafc;border:2px solid #e2e8f0;border-radius:16px;padding:16px;margin:16px 0;transition:all .3s}
.activity:hover{border-color:#58CC02;box-shadow:0 4px 12px rgba(88,204,2,0.15)}
.activity h3{color:#15803d;margin-top:0}
.btn{display:inline-block;padding:10px 24px;border-radius:12px;border:none;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;margin:4px;min-height:44px}
.btn-primary{background:#58CC02;color:#fff}
.btn-primary:hover{background:#4CAF00}
.btn-secondary{background:#1CB0F6;color:#fff}
.option{display:block;padding:12px 16px;margin:6px 0;border:2px solid #e2e8f0;border-radius:12px;cursor:pointer;transition:all .2s;background:#fff;min-height:44px;font-size:16px}
.option:hover{border-color:#58CC02;background:#f0fdf4}
.option.correct{border-color:#22c55e;background:#dcfce7}
.option.wrong{border-color:#ef4444;background:#fee2e2}
.option.locked{pointer-events:none;opacity:.75}
.gap-input{border:none;border-bottom:2px solid #58CC02;padding:6px 8px;font-size:16px;background:transparent;outline:none;min-width:100px;min-height:36px}
.feedback{padding:12px 16px;border-radius:12px;margin:8px 0;font-size:14px}
.feedback.correct{background:#dcfce7;color:#166534;border:1px solid #86efac}
.feedback.wrong{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}
.speaker-btn{background:#e0f2fe;border:none;cursor:pointer;font-size:18px;padding:6px 10px;border-radius:8px;min-height:36px;min-width:36px}
.speaker-btn:hover{background:#bae6fd}
[data-tts="true"]{cursor:pointer}
[data-tts="true"]:hover{background:rgba(88,204,2,0.08);border-radius:4px}
.il-dict-item{margin:14px 0;padding:12px;background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd}
.il-dict-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.il-dict-note{font-size:12px;color:#64748b}
.il-dict-input{width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:16px;outline:none}
.il-dict-input:focus{border-color:#1CB0F6}
.il-word-ok{color:#16a34a;background:#dcfce7;border-radius:3px;padding:1px 3px;margin:1px}
.il-word-close{color:#854d0e;background:#fef9c3;border-radius:3px;padding:1px 3px;margin:1px}
.il-word-bad{color:#991b1b;background:#fee2e2;border-radius:3px;padding:1px 3px;margin:1px}
.il-listen-btn{background:#1CB0F6;color:#fff;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:14px;font-weight:700;min-height:44px}
.il-check-btn{background:#58CC02;color:#fff;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:700;min-height:44px}
.il-shadow-btn{background:#FF4B4B;color:#fff;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:700;min-height:44px}
@media (max-width:480px){ body{padding:10px} .callout{padding:12px} .activity{padding:12px} }
@media (max-width:480px){ .activity{width:100%} .option{width:100%;box-sizing:border-box} .gap-input{min-width:0;max-width:100%;box-sizing:border-box} .speaker-btn,.btn,.option,.tab-btn,[role="button"]{min-height:44px;min-width:44px} .callout{max-width:100%;overflow-wrap:break-word} }`;

// ─── iframe interaction script (ported from LessonMaker IFRAME_SCRIPT) ───────
// Plain JS only — this is injected verbatim into the srcdoc iframe.
const IFRAME_JS = `(function(){
document.querySelectorAll('.callout-question').forEach(function(e){e.addEventListener('click',function(){e.classList.toggle('revealed')})});
document.querySelectorAll('[data-answer]').forEach(function(e){
  e.addEventListener('click',function(){
    if(e.classList.contains('locked'))return;
    var c=e.getAttribute('data-correct')==='true',
        a=e.getAttribute('data-activity')||'act_'+Math.random().toString(36).slice(2,8),
        t=e.getAttribute('data-category')||'general',
        f=e.getAttribute('data-feedback')||'',
        r=e.getAttribute('data-allow-retry')==='true';
    c?(e.classList.add('correct'),e.parentElement&&e.parentElement.querySelectorAll('[data-answer]').forEach(function(s){s.classList.add('locked')}))
     :(e.classList.add('wrong'),r||(e.parentElement&&e.parentElement.querySelectorAll('[data-answer]').forEach(function(s){s.classList.add('locked')})));
    if(f){
      var x=e.parentElement?e.parentElement.querySelector('.feedback'):null;x&&x.remove();
      var d=document.createElement('div');d.className='feedback '+(c?'correct':'wrong');d.textContent=f;
      if(!c&&r){var b=document.createElement('button');b.textContent='Try Again';b.className='il-check-btn';b.style.marginTop='6px';
        b.onclick=function(){e.classList.remove('wrong','locked');d.remove()};d.appendChild(b)}
      e.parentElement&&e.parentElement.appendChild(d);
    }
    document.dispatchEvent(new CustomEvent('lesson:answer',{detail:{correct:c,activityId:a,category:t,feedback:f}}));
  });
});
document.querySelectorAll('.gap-input[data-correct-answer]').forEach(function(e){
  function grade(){
    var v=e.value.trim(),a=e.getAttribute('data-correct-answer'),
        norm=function(s){return s.toLowerCase().replace(/[^a-z0-9]/g,'')},
        ok=(a==='*')?v.length>=2:norm(v)===norm(a),
        id=e.getAttribute('data-activity')||'gap_'+Math.random().toString(36).slice(2,8);
    e.style.borderColor=ok?'#22c55e':'#ef4444';e.style.background=ok?'#dcfce7':'#fee2e2';
    document.dispatchEvent(new CustomEvent('lesson:answer',{detail:{correct:ok,activityId:id,category:'grammar'}}));
  }
  e.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();grade()}});
  e.addEventListener('blur',function(){if(e.value.trim())grade()});
});
document.querySelectorAll('[data-check-activity]').forEach(function(btn){
  btn.addEventListener('click',function(){
    var aid=btn.getAttribute('data-check-activity'),
        c=document.querySelector('[data-activity-id="'+aid+'"]');
    if(!c)return;
    c.querySelectorAll('.gap-input[data-correct-answer]').forEach(function(e){
      var v=e.value.trim(),a=e.getAttribute('data-correct-answer'),
          norm=function(s){return s.toLowerCase().replace(/[^a-z0-9]/g,'')},
          ok=(a==='*')?v.length>=2:norm(v)===norm(a);
      e.style.borderColor=ok?'#22c55e':'#ef4444';e.style.background=ok?'#dcfce7':'#fee2e2';
      document.dispatchEvent(new CustomEvent('lesson:answer',{detail:{correct:ok,activityId:aid+'_r',category:'grammar'}}));
    });
  });
});
document.querySelectorAll('.speaker-btn').forEach(function(e){
  e.addEventListener('click',function(ev){ev.stopPropagation();window.parent.postMessage({type:'speak-text',text:e.getAttribute('data-speak')||''},'*')});
});
document.addEventListener('contextmenu',function(e){
  e.preventDefault();
  var sel=window.getSelection?window.getSelection().toString():'',
      fr=window.frameElement,
      rect=fr?fr.getBoundingClientRect():{top:0,left:0};
  window.parent.postMessage({type:'contextmenu',x:rect.left+e.clientX,y:rect.top+e.clientY,text:sel},'*');
});
document.addEventListener('click',function(){window.parent.postMessage({type:'dismiss-ctx'},'*')});
document.addEventListener('lesson:answer',function(e){window.parent.postMessage({type:'lesson:answer',detail:e.detail},'*')});
/* Clean dictation runner — replaces the sub-app's escaping-buggy inline scripts */
window.ilRunDictation=function(containerId,items){
  var host=document.getElementById(containerId);if(!host)return;
  items.forEach(function(item,idx){
    var wrap=document.createElement('div');wrap.className='il-dict-item';
    wrap.innerHTML='<div class="il-dict-row"><button class="il-listen-btn" data-il-say="'+idx+'">🔊 Listen</button>'
      +'<span class="il-dict-note">Listen, then type what you hear:</span></div>'
      +'<input class="il-dict-input" data-il-inp="'+idx+'" placeholder="Type what you hear...">'
      +'<div style="margin-top:6px"><button class="il-check-btn" data-il-check="'+idx+'">✅ Check</button></div>'
      +'<div data-il-fb="'+idx+'" style="margin-top:8px;font-family:monospace;font-size:14px;letter-spacing:0.5px"></div>';
    host.appendChild(wrap);
  });
  var say=function(t){try{var u=new SpeechSynthesisUtterance(t);u.rate=0.8;var nv=naturalVoice();if(nv)u.voice=nv;speechSynthesis.speak(u)}catch(err){}};
  function naturalVoice(){try{var vs=speechSynthesis.getVoices();var p=['natural','neural','google us english','google uk english','aria','jenny','sonia','samantha','susan','daniel','zira'];for(var i=0;i<p.length;i++){for(var j=0;j<vs.length;j++){var nm=vs[j].name.toLowerCase();if(nm.indexOf(p[i])>=0&&vs[j].lang&&vs[j].lang.toLowerCase().indexOf('en')===0)return vs[j];}}for(var k=0;k<vs.length;k++){if(vs[k].lang&&vs[k].lang.toLowerCase().indexOf('en')===0&&vs[k].default)return vs[k];}}catch(e){}return null;}
  host.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-il-say]');if(b){say(items[+b.getAttribute('data-il-say')].text);return}
    var c=ev.target.closest('[data-il-check]');
    if(c){
      var i=+c.getAttribute('data-il-check'),inp=host.querySelector('[data-il-inp="'+i+'"]'),
          fb=host.querySelector('[data-il-fb="'+i+'"]');
      if(!inp||!fb)return;
      var typed=inp.value,eW=items[i].text.split(' '),tW=typed.trim().split(' '),html='',exact=0;
      var clean=function(s){return s.toLowerCase().replace(/[^a-z0-9]/g,'')};
      for(var k=0;k<eW.length;k++){
        var ew=eW[k],tw=(tW[k]||'');
        if(clean(ew)===clean(tw)){html+='<span class="il-word-ok">'+ew+'</span> ';exact++}
        else if(tw&&clean(ew).indexOf(clean(tw))===0){html+='<span class="il-word-close">'+ew+'</span> '}
        else{html+='<span class="il-word-bad">'+ew+'</span> '}
      }
      fb.innerHTML='<strong>Transcript:</strong> '+html;
      var ok=clean(typed)===clean(items[i].text)||exact>=Math.ceil(eW.length*0.8);
      document.dispatchEvent(new CustomEvent('lesson:answer',{detail:{correct:ok,activityId:'dictation_'+i,category:'listening'}}));
    }
  });
};
/* Clean shadowing runner — real-time speech comparison */
window.ilRunShadowing=function(containerId,sentences){
  var host=document.getElementById(containerId);if(!host)return;
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  var compare=function(spoken,expected){
    var sW=spoken.trim().split(' '),eW=expected.trim().split(' '),html='',good=0;
    for(var i=0;i<eW.length;i++){
      var ew=eW[i].toLowerCase().replace(/[^a-z']/g,''),sw=((sW[i]||'').toLowerCase().replace(/[^a-z']/g,''));
      if(sw===ew){html+='<span class="il-word-ok">'+eW[i]+'</span> ';good++}
      else{html+='<span class="il-word-bad">'+eW[i]+'</span> '}
    }
    return {html:html,good:good,total:eW.length};
  };
  sentences.forEach(function(s,i){
    var div=document.createElement('div');div.className='il-dict-item';
    div.innerHTML='<p style="font-size:15px;font-weight:600;margin-bottom:10px">'+s.text+'</p>'
      +'<div class="il-dict-row"><button class="il-listen-btn" data-sh-listen="'+i+'">🔊 Listen</button>'
      +'<button class="il-shadow-btn" data-sh-go="'+i+'">🎙️ Shadow</button></div>'
      +'<div data-sh-fb="'+i+'" style="margin-top:8px;font-size:13px;line-height:2"></div>';
    host.appendChild(div);
  });
  var say=function(t){try{var u=new SpeechSynthesisUtterance(t);u.rate=0.85;var nv=naturalVoice();if(nv)u.voice=nv;speechSynthesis.speak(u)}catch(err){}};
  host.addEventListener('click',function(ev){
    var l=ev.target.closest('[data-sh-listen]');if(l){say(sentences[+l.getAttribute('data-sh-listen')].speak);return}
    var g=ev.target.closest('[data-sh-go]');
    if(!g)return;
    var i=+g.getAttribute('data-sh-go'),fb=host.querySelector('[data-sh-fb="'+i+'"]');
    if(!fb)return;
    if(!SR){fb.innerHTML='<span style="color:#991b1b">Speech recognition not supported in this browser.</span>';return}
    var rec=new SR();rec.lang='en-US';rec.interimResults=true;rec.maxAlternatives=1;
    fb.innerHTML='<span style="color:#1d4ed8">🎙️ Listening…</span>';
    rec.onresult=function(e){
      var transcript='';for(var k=0;k<e.results.length;k++){transcript+=e.results[k][0].transcript}
      var r=compare(transcript,sentences[i].text);
      fb.innerHTML='<div>'+r.html+'</div>';
      if(e.results[e.results.length-1].isFinal){
        var ok=r.good>=Math.ceil(r.total*0.6);
        document.dispatchEvent(new CustomEvent('lesson:answer',{detail:{correct:ok,activityId:'shadowing_'+i,category:'speaking'}}));
      }
    };
    rec.onerror=function(e){fb.innerHTML='<span style="color:#991b1b">Error: '+e.error+'</span>'};
    rec.start();setTimeout(function(){try{rec.stop()}catch(e){}},8000);
  });
};
/* Auto-run dictation/shadowing from declarative config divs:
   <div data-dictation="sentence 1|sentence 2"></div>  → builds listen-&-type UI in #il-dictation
   <div data-shadowing="sentence 1|sentence 2"></div> → builds shadow UI in #il-shadowing */
function ilSplit(v){return String(v||'').split('|').map(function(s){return s.trim()}).filter(Boolean).map(function(t){return {text:t,speak:t}})}
document.querySelectorAll('[data-dictation]').forEach(function(cfg){
  var host=document.getElementById('il-dictation');if(!host||host.childElementCount)return;
  var items=ilSplit(cfg.getAttribute('data-dictation'));if(items.length)window.ilRunDictation('il-dictation',items);
});
document.querySelectorAll('[data-shadowing]').forEach(function(cfg){
  var host=document.getElementById('il-shadowing');if(!host||host.childElementCount)return;
  var items=ilSplit(cfg.getAttribute('data-shadowing'));if(items.length)window.ilRunShadowing('il-shadowing',items);
});
})();`;

// ─── Parent shell styles ─────────────────────────────────────────────────────
const SHELL_CSS = `:root{--duo-green:#58CC02;--duo-green-dark:#46a302;--duo-blue:#1CB0F6;--duo-red:#FF4B4B;--duo-yellow:#FFC800;--ink:#3c3c3c}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:var(--ink);display:flex;flex-direction:column;overflow:hidden}
.hud{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:2px solid #e5e7eb;flex-wrap:wrap}
.hud-stat{display:flex;align-items:center;gap:6px;font-weight:900;font-size:clamp(14px,3.8vw,17px)}
.hud-hearts{color:var(--duo-red)}
.hud-streak{color:#ff9600}
.hud-gems{color:#1CB0F6}
.hud-xp{color:var(--duo-green);margin-left:auto}
.hud-flag{background:#58cc0218;color:#3ea301;padding:3px 10px;border-radius:10px;font-size:12px;font-weight:800}
.hud-title{width:100%;font-size:13px;font-weight:800;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hud-title b{color:#1f2937}
.combo-pill{display:none;background:linear-gradient(135deg,#ff9600,#ffc800);color:#fff;font-weight:900;padding:3px 10px;border-radius:10px;font-size:13px;box-shadow:0 2px 0 #e08600}
.combo-pill.on{display:inline-block;animation:comboPop .3s cubic-bezier(.2,1.6,.4,1)}
@keyframes comboPop{from{transform:scale(.6)}to{transform:scale(1)}}
.cat-bar{display:flex;align-items:center;gap:10px;padding:8px 14px;background:#f8fafc;border-bottom:2px solid #e5e7eb;min-height:56px}
.cat-emoji{font-size:30px;line-height:1;transition:transform .3s}
.cat-emoji.excited{animation:catBounce .5s ease infinite alternate}
.cat-emoji.sad{transform:rotate(-12deg) scale(.92)}
@keyframes catBounce{from{transform:translateY(0) scale(1)}to{transform:translateY(-6px) scale(1.08)}}
.cat-msg{flex:1;background:#fff;border:2px solid #e5e7eb;border-radius:14px;padding:8px 12px;font-size:clamp(12px,3.4vw,14px);font-weight:600;position:relative;min-width:0}
.cat-msg:before{content:'';position:absolute;left:-9px;top:50%;transform:translateY(-50%);border:6px solid transparent;border-right-color:#e5e7eb}
.league-strip{display:flex;gap:6px;padding:6px 14px;border-bottom:2px solid #e5e7eb;background:#fffdf5;overflow-x:auto;font-size:11px;font-weight:700;color:#64748b;white-space:nowrap}
.league-chip{background:#fefce8;border:1px solid #fde68a;border-radius:999px;padding:2px 9px}
.league-chip.you{background:#f0fdf4;border-color:#86efac;color:#15803d}
.tabs{display:flex;gap:6px;padding:8px 10px;border-bottom:2px solid #e5e7eb;background:#fff}
.tab-btn{flex:1;padding:10px 6px;min-height:46px;border:2px solid #e5e7eb;border-bottom-width:4px;border-radius:12px;background:#fff;font-weight:900;font-size:clamp(12px,3.4vw,15px);color:#6b7280;cursor:pointer;transition:all .15s}
.tab-btn.active{color:#3ea301;border-color:#58CC02;background:#f0fdf4;transform:translateY(1px);border-bottom-width:2px}
.frame-wrap{flex:1;position:relative;background:#fff;min-height:0}
iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
.hearts-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:60;padding:16px}
.hearts-modal-backdrop.open{display:flex}
.hearts-modal{background:#fff;border-radius:18px;max-width:340px;width:100%;padding:22px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.25);animation:modalPop .3s cubic-bezier(.2,1.6,.4,1)}
@keyframes modalPop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
.hearts-modal .big{font-size:52px}
.hearts-modal h3{margin:8px 0 4px;font-size:18px;font-weight:900}
.hearts-modal p{font-size:13px;color:#6b7280;margin-bottom:14px}
.hearts-modal button{display:block;width:100%;padding:12px;border:none;border-radius:12px;font-weight:900;font-size:14px;cursor:pointer;margin-top:8px;min-height:46px}
.hm-refill{background:var(--duo-yellow);color:#4b3800;box-shadow:0 4px 0 #e0ac00}
.hm-continue{background:#fff;border:2px solid #e5e7eb!important;color:#6b7280;box-shadow:none}
.ctx-menu{position:fixed;z-index:70;background:#fff;border:2px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.15);display:none;min-width:200px;max-width:280px;overflow:hidden}
.ctx-menu.open{display:block}
.ctx-menu button{display:block;width:100%;padding:11px 14px;border:none;background:#fff;text-align:left;font-weight:700;font-size:13px;cursor:pointer;min-height:44px}
.ctx-menu button:hover{background:#f0fdf4}
.ctx-menu .ctx-say{color:#1d4ed8}
.ctx-menu .ctx-save{color:#15803d}
/* XP toast + confetti — same visual language as Micro Lesson V1 */
.xp-toast-card{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:10002;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#58CC02,#7ee02e);color:#fff;padding:12px 20px;border-radius:16px;border:2px solid #3ea301;box-shadow:0 6px 0 #46a302,0 12px 30px rgba(88,204,2,.4);animation:xpToastIn .45s cubic-bezier(.18,1.4,.4,1) both;max-width:calc(100vw - 28px)}
.xp-toast-card.xp-toast-out{animation:xpToastOut .4s ease-in both}
.xp-toast-icon{font-size:1.8rem;animation:xpToastBounce .7s ease infinite alternate}
.xp-toast-body{display:flex;flex-direction:column;line-height:1.25}
.xp-toast-title{font-weight:900;font-size:.78rem;text-transform:uppercase;letter-spacing:.5px;opacity:.95}
.xp-toast-xp{font-weight:900;font-size:1.35rem;text-shadow:0 2px 0 rgba(0,0,0,.15)}
.xp-toast-stars{font-size:.75rem;font-weight:800;opacity:.92}
@keyframes xpToastIn{from{opacity:0;transform:translateX(-50%) translateY(-40px) scale(.8)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
@keyframes xpToastOut{to{opacity:0;transform:translateX(-50%) translateY(-30px) scale(.9)}}
@keyframes xpToastBounce{from{transform:scale(1) rotate(-6deg)}to{transform:scale(1.15) rotate(8deg)}}
.emoji-particle{position:fixed;z-index:9999;pointer-events:none;font-size:2.2rem}
.rain-heart{top:-60px;animation:heartFall linear forwards}
.fountain-particle{animation:fountainAnim 1.2s ease-out forwards}
@keyframes heartFall{to{transform:translateY(110vh) rotate(360deg);opacity:.7}}
@keyframes fountainAnim{0%{transform:translate(0,0) scale(.6);opacity:1}100%{transform:translate(var(--tx,0),var(--ty,-160px)) scale(1.1);opacity:0}}
@keyframes shakeX{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
body.shake{animation:shakeX .3s}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media (max-width:480px){
.hud{font-size:13px;gap:6px;padding:8px 8px}
.hud-xp{margin-left:0}
.tab-btn{min-height:44px;padding:10px 8px;font-size:13px;white-space:nowrap}
.cat-msg{font-size:12px}
.player-card,.il-card,#player-area,[class*=panel]{width:100%;box-sizing:border-box}
button,[role="button"]{min-height:44px;min-width:44px}
}`;

/**
 * Build the standalone Interactive Lesson HTML.
 */
export function generateInteractiveLessonHtml(data: InteractiveLessonData, documentTitle?: string, readAloudVoice?: string): string {
  const learner = data.learner || {};
  const name = learner.name || 'Learner';
  const level = learner.level || 'B1';
  const native = learner.nativeLanguage || '';
  const xp = learner.xp ?? 0;
  const streak = learner.streak ?? 0;
  const gems = learner.gems ?? 50;
  const title = (data.title || 'Interactive Lesson').replace(/</g, '&lt;');
  const unitLine = data.unit ? `${data.unit} · ` : '';
  const docTitle = documentTitle || `Interactive_Lesson_${name}_${title}`.replace(/[^\w\-]+/g, '_');

  // Lesson tab HTML is injected into the iframe at runtime (JSON-safe transport)
  const tabsPayload = JSON.stringify({
    study: data.studyHtml || '',
    speak: data.speakHtml || '',
    practice: data.practiceHtml || '',
  }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${docTitle}</title>
<style>
${SHELL_CSS}
</style>
</head>
<body>
  <div class="hud" id="hud">
    <span class="hud-stat hud-flag" id="hud-flag">${level}${native ? ' · ' + native : ''}</span>
    <span class="hud-stat hud-hearts" id="hud-hearts">❤️❤️❤️❤️❤️</span>
    <span class="hud-stat hud-streak" id="hud-streak">🔥 ${streak}</span>
    <span class="hud-stat hud-gems" id="hud-gems">💎 ${gems}</span>
    <span class="hud-stat hud-xp" id="hud-xp">⚡ ${xp} XP</span>
    <span class="combo-pill" id="combo-pill">🔥 2× combo</span>
    <span class="hud-title"><b>${title}</b> — ${unitLine}Hi ${name}! Pick a tab to start 🚀</span>
  </div>

  <div class="cat-bar">
    <span class="cat-emoji" id="cat-emoji">😸</span>
    <div class="cat-msg" id="cat-msg">Hi ${name}! Ready to learn? 😸</div>
  </div>

  <div class="league-strip" id="league-strip">
    <span class="league-chip you">You · ${xp} XP</span>
    <span class="league-chip">🥉 Bronze League</span>
    <span class="league-chip" data-npc="Sofia">👩‍🎓 Sofia · 820</span>
    <span class="league-chip" data-npc="Kenji">👨‍💻 Kenji · 950</span>
    <span class="league-chip" data-npc="Amara">👩‍🔬 Amara · 780</span>
  </div>

  <div class="tabs" role="tablist">
    <button class="tab-btn active" data-tab="study" role="tab">📖 Study</button>
    <button class="tab-btn" data-tab="speak" role="tab">🗣️ Speak</button>
    <button class="tab-btn" data-tab="practice" role="tab">🏋️ Practice</button>
  </div>

  <div class="frame-wrap">
    <iframe id="lesson-frame" title="Interactive lesson content" sandbox="allow-scripts allow-same-origin allow-modals allow-popups"></iframe>
  </div>

  <div class="hearts-modal-backdrop" id="hearts-modal">
    <div class="hearts-modal">
      <div class="big">💔</div>
      <h3>You ran out of hearts!</h3>
      <p>Refill with gems to keep your combo going, or continue in practice mode (XP is halved).</p>
      <button class="hm-refill" id="hm-refill">💎 Refill for 100 gems</button>
      <button class="hm-continue" id="hm-continue">Continue anyway</button>
    </div>
  </div>

  <div class="ctx-menu" id="ctx-menu"></div>

<script>
(function(){
'use strict';
var TABS = ${tabsPayload};
var PROF = { name: ${JSON.stringify(name)}, level: ${JSON.stringify(level)}, xp: ${xp}, streak: ${streak}, gems: ${gems} };
var VOICE = ${JSON.stringify(readAloudVoice || '')};
var STORE_KEY = 'interactive-lesson-state-' + ${JSON.stringify(title)};

/* ── persisted state ── */
var S = { xp: PROF.xp, gems: PROF.gems, streak: PROF.streak, hearts: 5, combo: 0, maxCombo: 0,
          correct: 0, wrong: 0, done: {}, practiceMode: false, tab: 'study' };
try {
  var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  if (saved) S = Object.assign(S, saved, { tab: 'study' });
} catch (e) {}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }

/* ── HUD ── */
function heartsStr() { var h = ''; for (var i = 0; i < 5; i++) h += i < S.hearts ? '❤️' : '🖤'; return h; }
function upHUD() {
  var el;
  el = document.getElementById('hud-hearts'); if (el) el.textContent = heartsStr();
  el = document.getElementById('hud-streak'); if (el) el.textContent = '🔥 ' + S.streak;
  el = document.getElementById('hud-gems'); if (el) el.textContent = '💎 ' + S.gems;
  el = document.getElementById('hud-xp'); if (el) el.textContent = '⚡ ' + S.xp + ' XP';
  var pill = document.getElementById('combo-pill');
  if (pill) {
    if (S.combo >= 2) { pill.textContent = '🔥 ' + S.combo + '× combo · ' + comboMult() + '× XP'; pill.classList.add('on'); }
    else pill.classList.remove('on');
  }
  var me = document.querySelector('.league-chip.you');
  if (me) me.textContent = 'You · ' + S.xp + ' XP';
}
function comboMult() { return S.combo >= 10 ? 3 : (S.combo >= 5 ? 2 : 1); }
var CAT_IDLE = ['You are doing great! 😻', 'Little and often wins! 💪', 'Try the Practice tab next! 🏋️', 'Combo streaks double your XP! 🔥', 'Speak out loud — it sticks! 🗣️'];
function setCat(emoji, mood, msg) {
  var e = document.getElementById('cat-emoji'), m = document.getElementById('cat-msg');
  if (e) { e.textContent = emoji; e.className = 'cat-emoji' + (mood === 'excited' ? ' excited' : mood === 'sad' ? ' sad' : ''); }
  if (m) m.textContent = msg;
}

/* ── celebrations (same language as Micro Lesson V1) ── */
function xpToast(earned, stars) {
  var old = document.getElementById('xp-toast-card'); if (old) old.remove();
  var t = document.createElement('div'); t.id = 'xp-toast-card'; t.className = 'xp-toast-card';
  t.innerHTML = '<div class="xp-toast-icon">🎉</div><div class="xp-toast-body">'
    + '<div class="xp-toast-title">' + (S.combo >= 5 ? 'Combo! Activity Correct!' : 'Correct!') + '</div>'
    + '<div class="xp-toast-xp" id="xp-toast-count">+0 XP</div>'
    + (stars ? '<div class="xp-toast-stars">' + stars + '</div>' : '')
    + '</div>';
  document.body.appendChild(t);
  var c = document.getElementById('xp-toast-count'), dur = 650, t0 = performance.now();
  (function tick(now) {
    if (!c) return;
    var p = Math.min((now - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
    c.textContent = '+' + Math.round(earned * eased) + ' XP';
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
  setTimeout(function() { t.classList.add('xp-toast-out'); setTimeout(function() { t.remove(); }, 420); }, 2400);
}
function celebrate(emoji) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var kind = Math.random(), n = 12;
  if (kind < 0.4) { // rain
    for (var i = 0; i < n; i++) {
      var h = document.createElement('div'); h.textContent = emoji; h.className = 'emoji-particle rain-heart';
      h.style.left = Math.random() * 100 + 'vw';
      h.style.fontSize = (Math.random() * 18 + 20) + 'px';
      h.style.animationDuration = (Math.random() * 1.6 + 1.8) + 's';
      h.style.animationDelay = (Math.random() * 0.6) + 's';
      document.body.appendChild(h); setTimeout(function(x) { return function() { x.remove(); }; }(h), 4200);
    }
  } else { // fountain from center
    var ox = window.innerWidth / 2, oy = window.innerHeight / 3;
    for (var j = 0; j < n; j++) {
      var p = document.createElement('div'); p.className = 'emoji-particle fountain-particle'; p.textContent = emoji;
      p.style.left = ox + 'px'; p.style.top = oy + 'px';
      p.style.fontSize = (Math.random() * 12 + 18) + 'px';
      p.style.setProperty('--tx', (Math.random() * 220 - 110) + 'px');
      p.style.setProperty('--ty', (Math.random() * -200 - 60) + 'px');
      document.body.appendChild(p); setTimeout(function(x) { return function() { x.remove(); }; }(p), 1200);
    }
  }
}
function cheerSound() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ctx = new AC();
    [523.25, 659.25, 783.99].forEach(function(f, i) {
      var o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + i * 0.09;
      o.type = 'sine'; o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + 0.55);
    });
  } catch (e) {}
}
function sadSound() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime;
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(140, t0 + 0.25);
    g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + 0.32);
  } catch (e) {}
}

/* ── answers from the iframe ── */
var frame = document.getElementById('lesson-frame');
window.addEventListener('message', function(ev) {
  var d = ev.data || {};
  if (d.type === 'lesson:answer') return handleAnswer(d.detail || {});
  if (d.type === 'speak-text' && d.text) speak(d.text);
  if (d.type === 'contextmenu') return openCtx(d);
  if (d.type === 'dismiss-ctx') closeCtx();
});
function handleAnswer(a) {
  var first = !S.done[a.activityId];
  if (a.correct) {
    var mult = comboMult();
    var earned = Math.round(10 * mult * (S.practiceMode ? 0.5 : 1) * (first ? 1 : 0.3)) || 2;
    var gemsEarned = S.combo % 3 === 2 ? 5 : 2;
    S.combo += 1; S.maxCombo = Math.max(S.maxCombo, S.combo);
    S.correct += 1; S.xp += earned; S.gems += gemsEarned;
    S.done[a.activityId] = true;
    setCat(S.combo >= 10 ? '🙀' : '😻', 'excited',
      S.combo >= 10 ? 'INCREDIBLE! ' + S.combo + '× combo! +' + earned + ' XP! 🏆'
      : S.combo >= 5 ? '🔥 ' + S.combo + '× combo! +' + earned + ' XP!'
      : '✅ Correct! +' + earned + ' XP, +' + gemsEarned + ' 💎!');
    xpToast(earned, S.combo >= 10 ? '⭐⭐⭐ flawless!' : S.combo >= 5 ? '⭐⭐ on fire!' : '⭐ nice!');
    celebrate(S.combo >= 5 ? '🔥' : '🎉');
    cheerSound();
  } else {
    S.combo = 0; S.wrong += 1;
    if (S.hearts > 0) S.hearts -= 1;
    setCat('😿', 'sad', "Don't worry! Mistakes help us learn. Try again! 💪");
    document.body.classList.add('shake');
    setTimeout(function() { document.body.classList.remove('shake'); }, 320);
    sadSound();
    if (S.hearts <= 0) { var m = document.getElementById('hearts-modal'); if (m) m.classList.add('open'); }
  }
  upHUD(); save();
}

/* ── hearts modal ── */
var hmRefill = document.getElementById('hm-refill');
var hmContinue = document.getElementById('hm-continue');
if (hmRefill) hmRefill.addEventListener('click', function() {
  if (S.gems >= 100) { S.gems -= 100; S.hearts = 5; setCat('😻', 'excited', 'Hearts refilled! Back to it! ❤️'); }
  else { S.hearts = 3; setCat('😿', 'sad', 'Not enough gems — here are 3 hearts on the house.'); }
  var m = document.getElementById('hearts-modal'); if (m) m.classList.remove('open');
  S.practiceMode = false; upHUD(); save();
});
if (hmContinue) hmContinue.addEventListener('click', function() {
  S.practiceMode = true; S.hearts = 3;
  setCat('💪', 'happy', 'Practice mode: XP is halved but you can keep learning!');
  var m = document.getElementById('hearts-modal'); if (m) m.classList.remove('open');
  upHUD(); save();
});

/* ── tabs ── */
function buildTabDoc(html) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<style>' + ${JSON.stringify(IFRAME_CSS)} + '</style></head><body>'
    + html + '<script>' + ${JSON.stringify(IFRAME_JS)} + '<\\/script></body></html>';
}
function loadTab(tab) {
  S.tab = tab; save();
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
  var html = TABS[tab] || '<p style="padding:20px;color:#9ca3af">This tab is empty — paste JSON in the Lesson Creator.</p>';
  if (frame) frame.srcdoc = buildTabDoc(html);
}
document.querySelectorAll('.tab-btn').forEach(function(b) {
  b.addEventListener('click', function() { loadTab(b.getAttribute('data-tab')); });
});

/* ── TTS + context menu ── */
function naturalVoice() {
  try {
    var vs = speechSynthesis.getVoices();
    var p = ['natural','neural','google us english','google uk english','aria','jenny','sonia','samantha','susan','daniel','zira'];
    for (var i = 0; i < p.length; i++) {
      for (var j = 0; j < vs.length; j++) {
        var nm = vs[j].name.toLowerCase();
        if (nm.indexOf(p[i]) >= 0 && vs[j].lang && vs[j].lang.toLowerCase().indexOf('en') === 0) return vs[j];
      }
    }
    for (var k = 0; k < vs.length; k++) {
      if (vs[k].lang && vs[k].lang.toLowerCase().indexOf('en') === 0 && vs[k].default) return vs[k];
    }
  } catch (e) {}
  return null;
}
function pickVoice(name) {
  try { var vs = speechSynthesis.getVoices(); for (var i = 0; i < vs.length; i++) if (vs[i].name === name) return vs[i]; } catch (e) {}
  return null;
}
function speak(text) {
  try {
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.lang = 'en-US';
    if (VOICE) { var v = pickVoice(VOICE); if (v) u.voice = v; }
    else { var nv = naturalVoice(); if (nv) u.voice = nv; }
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
var ctxMenu = document.getElementById('ctx-menu');
function closeCtx() { if (ctxMenu) ctxMenu.classList.remove('open'); }
function openCtx(d) {
  if (!ctxMenu) return;
  ctxMenu.innerHTML = '';
  if (d.text) {
    var b1 = document.createElement('button'); b1.className = 'ctx-say'; b1.textContent = '🔊 Say it';
    b1.onclick = function() { speak(d.text); closeCtx(); };
    var b2 = document.createElement('button'); b2.className = 'ctx-save'; b2.textContent = '💾 Save "' + d.text.slice(0, 24) + '"';
    b2.onclick = function() {
      try {
        var words = JSON.parse(localStorage.getItem('il-saved-words') || '[]');
        words.push({ word: d.text.slice(0, 60), at: Date.now() });
        localStorage.setItem('il-saved-words', JSON.stringify(words));
      } catch (e) {}
      setCat('📝', 'happy', 'Word saved! Review it later. 📚'); closeCtx();
    };
    ctxMenu.appendChild(b1); ctxMenu.appendChild(b2);
  }
  ctxMenu.style.left = Math.min(d.x || 40, window.innerWidth - 220) + 'px';
  ctxMenu.style.top = Math.min(d.y || 40, window.innerHeight - 130) + 'px';
  ctxMenu.classList.add('open');
}
document.addEventListener('click', function(ev) { if (ctxMenu && !ctxMenu.contains(ev.target)) closeCtx(); });

/* ── league ticker + idle cat ── */
setInterval(function() {
  document.querySelectorAll('[data-npc]').forEach(function(chip) {
    var m = chip.textContent.match(/(\\d+)/);
    if (m) chip.textContent = chip.textContent.replace(/\\d+/, String(+m[1] + Math.floor(Math.random() * 9)));
  });
}, 30000);
setInterval(function() { setCat('😽', 'happy', CAT_IDLE[Math.floor(Math.random() * CAT_IDLE.length)]); }, 90000);

/* ── boot ── */
upHUD();
loadTab('study');
setTimeout(function() { setCat('😸', 'happy', 'Hi ' + PROF.name + '! Ready to learn? 😸'); }, 700);
window.addEventListener('beforeunload', function() { save(); });
})();
</script>
</body>
</html>`;
}
