/**
 * Daily Lesson — standalone HTML styles (faithful to the Daily_Lesson React
 * app's dark purple/pink theme; self-contained so the file works offline).
 */
export const DAILY_HTML_CSS = `
:root{
  --bg:#0a0a12; --panel:#15151f; --panel2:#1c1c2a; --border:#262636;
  --text:#e8e8f0; --muted:#8b8ba0; --purple:#8b5cf6; --pink:#ec4899;
  --indigo:#6366f1; --green:#22c55e; --red:#ef4444; --amber:#f59e0b;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  background:var(--bg); color:var(--text); min-height:100vh; font-size:15px;
}
body.light{ --bg:#f3f4f6; --panel:#ffffff; --panel2:#f9fafb; --border:#e5e7eb; --text:#111827; --muted:#6b7280; }
img{max-width:100%}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
button:disabled{cursor:not-allowed;opacity:.4}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--purple);border-radius:999px}
.hidden{display:none!important}
.no-scrollbar::-webkit-scrollbar{display:none}
.no-scrollbar{scrollbar-width:none}

/* gradient helpers */
.grad{background:linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%)}
.grad-btn{
  background:linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%);
  color:#fff; border-radius:16px; padding:14px 18px; font-size:16px; font-weight:700;
  width:100%; box-shadow:0 10px 24px rgba(139,92,246,.3); transition:transform .15s, box-shadow .15s;
}
.grad-btn:hover:not(:disabled){transform:scale(1.02)}
.grad-btn:active:not(:disabled){transform:scale(.98)}
.grad-sm{
  background:linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%); color:#fff; border-radius:12px;
  padding:9px 16px; font-weight:700; font-size:14px;
}

/* header */
.app-header{
  position:sticky; top:0; z-index:40; backdrop-filter:blur(20px);
  background:rgba(10,10,18,.85); border-bottom:1px solid var(--border); padding:12px 16px;
}
body.light .app-header{background:rgba(255,255,255,.85)}
.header-row{max-width:896px;margin:0 auto;display:flex;align-items:center;gap:12px}
.avatar-box{
  width:48px;height:48px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  font-size:24px; box-shadow:0 4px 16px rgba(139,92,246,.35), inset 0 1px 0 rgba(255,255,255,.3);
  border:2px solid var(--border); background:linear-gradient(135deg,#8b5cf6,#ec4899); position:relative; overflow:hidden;
}
.avatar-box::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.25),transparent 60%)}
.header-info{flex:1;min-width:0}
.header-name{font-weight:900;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.header-sub{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.progress-track{height:8px;background:var(--border);border-radius:999px;margin-top:6px;overflow:hidden}
.progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#3b82f6,#22c55e);transition:width .7s;position:relative;overflow:hidden}
.progress-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);animation:shimmer 2s infinite;transform:translateX(-100%)}
@keyframes shimmer{to{transform:translateX(100%)}}
.streak-pill{display:flex;align-items:center;gap:4px;padding:6px 10px;border-radius:12px;background:rgba(249,115,22,.15);font-weight:700;font-size:13px;color:#fb923c}
.icon-btn{
  width:40px;height:40px;border-radius:12px;background:var(--panel2);display:flex;align-items:center;
  justify-content:center;font-size:17px;transition:background .15s; flex-shrink:0;
}
.icon-btn:hover{background:var(--border)}

/* module tabs */
.module-tabs{
  position:sticky; top:73px; z-index:30; backdrop-filter:blur(20px);
  background:rgba(10,10,18,.85); border-bottom:1px solid var(--border); padding:8px 16px;
}
body.light .module-tabs{background:rgba(255,255,255,.85)}
.tabs-row{max-width:896px;margin:0 auto;display:flex;gap:8px;overflow-x:auto}
.tab-btn{
  flex:1;min-width:80px;padding:10px 12px;border-radius:14px;text-align:center;transition:all .2s;
  background:var(--panel2);color:var(--muted);
}
.tab-btn.active{background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;box-shadow:0 8px 20px rgba(139,92,246,.35)}
.tab-btn .t-icon{font-size:18px}
.tab-btn .t-label{font-size:11px;font-weight:700;margin-top:2px;white-space:nowrap}
.tab-done{font-size:10px;color:#4ade80;margin-top:2px}

main{max-width:896px;margin:0 auto;padding:20px 16px 120px}
.step-enter{animation:fadeUp .3s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

/* sticky footer */
.app-footer{
  position:fixed;bottom:0;left:0;right:0;z-index:30;backdrop-filter:blur(20px);
  background:rgba(10,10,18,.9);border-top:1px solid var(--border);padding:10px 16px;
}
body.light .app-footer{background:rgba(255,255,255,.9)}
.footer-row{max-width:896px;margin:0 auto;display:flex;align-items:center;gap:12px}
.footer-meta{font-size:11px;color:var(--muted);font-weight:700;white-space:nowrap}
.badge-chip{
  width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  font-size:14px;border:1px solid var(--border);background:var(--panel2);opacity:.4;
}
.badge-chip.on{opacity:1;background:rgba(34,197,94,.15);border-color:#22c55e}
.secret-pill{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;background:rgba(234,179,8,.12);border:1px solid #b45309;font-size:12px;font-weight:700;color:#fbbf24}

/* step rail */
.step-rail{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px}
.step-chip{
  flex-direction:column;align-items:center;gap:4px;padding:10px 12px;border-radius:16px;min-width:72px;
  background:var(--panel);border:2px solid var(--border);color:var(--muted);transition:all .2s;text-align:center;
}
.step-chip:hover{border-color:var(--purple)}
.step-chip.current{background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;transform:scale(1.05);border-color:transparent;box-shadow:0 8px 20px rgba(139,92,246,.35)}
.step-chip.done{background:rgba(34,197,94,.12);border-color:#22c55e;color:#4ade80}
.step-chip.locked{opacity:.45;cursor:not-allowed}
.step-chip .s-icon{font-size:20px}
.step-chip .s-label{font-size:11px;font-weight:700;line-height:1.1}
.step-chip .s-num{font-size:10px;opacity:.6}

/* step header card */
.step-head{display:flex;align-items:center;gap:12px;padding:14px;background:var(--panel);border:1px solid var(--border);border-radius:18px;margin-bottom:16px}
.step-head-icon{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#8b5cf6,#ec4899);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.step-head-label{font-size:10px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.08em}
.step-head-title{font-weight:900;font-size:17px}
.step-head-desc{font-size:12px;color:var(--muted)}
.step-done-pill{margin-left:auto;padding:6px 12px;border-radius:999px;background:rgba(34,197,94,.15);color:#4ade80;font-size:12px;font-weight:700;white-space:nowrap}

/* shared card */
.card{background:var(--panel);border:1px solid var(--border);border-radius:18px;box-shadow:0 8px 24px rgba(0,0,0,.15)}
.card-pad{padding:18px}

.section-head{text-align:center;margin-bottom:16px}
.section-head .sh-icon{font-size:38px}
.section-head h2{font-size:22px;font-weight:900;margin-top:4px}
.section-head p{color:var(--muted);font-size:13px;margin-top:4px}

/* warmup */
.warm-nav{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}
.warm-dot{
  width:40px;height:40px;border-radius:999px;font-weight:700;font-size:14px;
  background:var(--panel2);color:var(--muted);border:2px solid var(--border);transition:all .2s;
}
.warm-dot.current{background:var(--purple);color:#fff;transform:scale(1.1);border-color:transparent}
.warm-dot.revealed{background:#22c55e;color:#fff;border-color:transparent}
.warm-card{overflow:hidden}
.warm-q{padding:32px;background:linear-gradient(135deg,#7c3aed,#4f46e5)}
.warm-q .w-emoji{font-size:48px;margin-bottom:14px}
.warm-q p{color:#fff;font-size:19px;font-weight:600;line-height:1.5}
.warm-a{padding:32px}
.reveal-btn{
  display:block;margin:0 auto;padding:12px 28px;border-radius:16px;font-weight:700;color:#fff;
  background:linear-gradient(135deg,#8b5cf6,#6366f1);box-shadow:0 8px 20px rgba(139,92,246,.35);
}
.reveal-btn:hover{transform:scale(1.03)}
.warm-nav-row{display:flex;justify-content:space-between;align-items:center;margin-top:14px}
.warm-prev,.warm-next{padding:10px 20px;border-radius:12px;background:var(--panel2);font-weight:600;color:var(--muted)}
.warm-next{background:var(--purple);color:#fff}
.warm-count{font-size:13px;color:var(--muted)}
.warm-hint{text-align:center;font-size:13px;color:var(--muted);margin-top:10px}

/* keywords */
.kw-toggle{display:flex;gap:8px;justify-content:center;margin-bottom:14px}
.kw-toggle button{padding:8px 16px;border-radius:12px;font-weight:700;font-size:13px;background:var(--panel2);color:var(--muted)}
.kw-toggle button.on{background:var(--purple);color:#fff}
.kw-progress{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.fc-wrap{position:relative;width:100%;max-width:448px;height:280px;margin:0 auto;perspective:1000px}
.fc-inner{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform .45s;cursor:pointer}
.fc-inner.flipped{transform:rotateY(180deg)}
.fc-face{position:absolute;inset:0;border-radius:22px;padding:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;backface-visibility:hidden;box-shadow:0 18px 40px rgba(0,0,0,.35)}
.fc-front{background:linear-gradient(135deg,#8b5cf6,#6366f1)}
.fc-back{background:var(--panel);border:1px solid var(--border);transform:rotateY(180deg)}
.fc-level{font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.25);margin-bottom:12px}
.fc-term{font-size:28px;font-weight:900;color:#fff;margin-bottom:8px}
.fc-trans{font-size:16px;font-style:italic;color:rgba(255,255,255,.65);margin-bottom:10px}
.fc-listen{padding:8px 16px;border-radius:12px;background:rgba(255,255,255,.2);color:#fff;font-size:13px}
.fc-tap{font-size:11px;color:rgba(255,255,255,.5);margin-top:12px}
.fc-back-scroll{overflow-y:auto;flex:1;width:100%}
.fc-def-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:6px 0 6px}
.fc-back .fc-def{font-size:15px;margin-bottom:8px}
.fc-ex{font-style:italic;color:var(--muted);border-left:3px solid var(--purple);padding-left:10px;font-size:13px;margin-bottom:8px}
.fc-dots{display:flex;gap:6px;justify-content:center;margin-bottom:12px}
.fc-dot{width:10px;height:10px;border-radius:999px;background:var(--border)}
.fc-dot.cur{background:var(--purple);transform:scale(1.25)}
.fc-dot.mastered{background:#22c55e}
.fc-nav-row{display:flex;justify-content:center;align-items:center;gap:14px;margin-top:14px}
.fc-arr{width:44px;height:44px;border-radius:999px;background:var(--panel2);font-weight:700;font-size:18px}
.fc-master{padding:11px 22px;border-radius:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,#22c55e,#10b981)}
.kw-list-search{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.kw-search{flex:1;min-width:180px;padding:10px 12px 10px 34px;border-radius:12px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:14px;outline:none}
.kw-search:focus{border-color:var(--purple)}
.kw-level-btn{padding:9px 16px;border-radius:12px;font-weight:600;font-size:13px;background:var(--panel2);color:var(--muted)}
.kw-level-btn.on{background:var(--purple);color:#fff}
.kw-list{max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px}
.kw-item{display:flex;align-items:center;gap:10px;padding:14px;border-radius:16px;border:1px solid var(--border);background:var(--panel)}
.kw-item.mastered{background:rgba(34,197,94,.08);border-color:#22c55e}
.kw-check{
  width:28px;height:28px;border-radius:999px;border:2px solid var(--border);display:flex;align-items:center;
  justify-content:center;font-size:13px;flex-shrink:0;color:transparent;
}
.kw-item.mastered .kw-check{background:#22c55e;border-color:#22c55e;color:#fff}
.kw-main{flex:1;min-width:0}
.kw-term{font-weight:700;font-size:14px}
.kw-def{font-size:12px;color:var(--muted);margin-top:2px}
.kw-sound{width:32px;height:32px;border-radius:999px;background:rgba(59,130,246,.15);color:#60a5fa;font-size:13px;flex-shrink:0}

/* dialogue / drama */
.voice-setup{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:18px;margin-bottom:14px}
.vs-title{font-weight:700;font-size:15px;margin-bottom:12px}
.vs-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.vs-avatar{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.vs-select{flex:1;padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:12px}
.vs-skip{width:100%;padding:8px;color:var(--purple);font-size:13px;font-weight:500;border-radius:10px}
.vs-skip:hover{background:rgba(139,92,246,.1)}
.speaker-cards{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}
.speaker-card{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:16px;background:var(--panel);border:1px solid var(--border)}
.speaker-card .s-name{font-weight:700;font-size:13px}
.speaker-card .s-voice{font-size:11px;color:var(--muted)}
.play-row{display:flex;justify-content:center;gap:10px;margin-bottom:12px}
.play-btn{
  display:flex;align-items:center;gap:10px;padding:15px 30px;border-radius:16px;color:#fff;font-weight:700;font-size:17px;
  background:linear-gradient(135deg,#8b5cf6,#6366f1);box-shadow:0 10px 24px rgba(139,92,246,.35);
}
.play-btn.stop{background:linear-gradient(135deg,#ef4444,#f97316)}
.play-btn:disabled{opacity:.5}
.msg-row{display:flex;gap:10px;margin-bottom:10px;align-items:flex-start}
.msg-row.reverse{flex-direction:row-reverse}
.msg-avatar{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,.2)}
.msg-body{max-width:80%;display:flex;flex-direction:column;gap:4px}
.msg-row.reverse .msg-body{align-items:flex-end}
.msg-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.msg-speaker{font-size:12px;font-weight:700;color:var(--muted)}
.vs-inline{
  font-size:11px;padding:2px 6px;border-radius:8px;border:1px solid var(--border);
  background:var(--panel2);color:var(--muted);max-width:130px;cursor:pointer;outline:none;
}
.vs-inline:hover{border-color:var(--purple)}
.vs-inline option{color:var(--text);background:var(--panel)}
.msg-play{
  font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(139,92,246,.15);
  color:#c4b5fd;font-weight:700;cursor:pointer;border:1px solid rgba(139,92,246,.3);
}
.msg-play:hover{background:rgba(139,92,246,.3)}
.msg-play.is-playing{background:var(--purple);color:#fff;animation:pulse 1s infinite}
.msg-emotion{font-size:10px;padding:2px 8px;border-radius:999px}
.msg-bubble{padding:12px 16px;border-radius:16px;background:var(--panel);border:1px solid var(--border);font-size:14px;line-height:1.5}
.msg-row.reverse .msg-bubble{border-top-right-radius:4px}
.msg-row:not(.reverse) .msg-bubble{border-top-left-radius:4px}
.msg-bubble.active{background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;border-color:transparent;box-shadow:0 8px 20px rgba(139,92,246,.35)}
.transcript{max-height:420px;overflow-y:auto;padding-right:4px}
.script-box{max-height:380px;overflow-y:auto;padding-right:4px}
.narr-line{text-align:center;padding:10px 14px;font-style:italic;font-size:13px;color:var(--muted);border-radius:12px;margin-bottom:8px}
.narr-line.active{background:rgba(139,92,246,.15);color:#c4b5fd}
.cast-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
@media(min-width:560px){.cast-grid{grid-template-columns:repeat(4,1fr)}}
.cast-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;border-radius:16px;border:1px solid var(--border);background:var(--panel2);transition:all .2s}
.cast-card.active{border-color:var(--purple);box-shadow:0 8px 20px rgba(139,92,246,.3);transform:translateY(-4px)}
.cast-emoji{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px}
.cast-card.active .cast-emoji{outline:3px solid var(--purple);outline-offset:2px}
.cast-name{font-size:11px;font-weight:700;text-align:center;line-height:1.2}
.eq{display:flex;gap:3px;align-items:flex-end;height:12px}
.eq span{width:4px;background:var(--purple);border-radius:2px;animation:eqb 0.6s infinite alternate}
.eq span:nth-child(2){animation-delay:.15s}.eq span:nth-child(3){animation-delay:.3s}
@keyframes eqb{from{height:3px}to{height:12px}}
.ambient-pill{display:flex;justify-content:center;margin-bottom:12px}
.ambient-pill div{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;background:rgba(245,158,11,.12);border:1px solid #b45309;color:#fbbf24;font-size:13px}

/* reading */
.read-tabs{display:flex;gap:8px;margin-bottom:12px}
.read-tab{flex:1;padding:12px;border-radius:16px;font-weight:700;font-size:13px;background:var(--panel2);color:var(--muted);position:relative;transition:all .2s}
.read-tab.on{color:#fff;background:linear-gradient(135deg,#8b5cf6,#ec4899);transform:scale(1.04);box-shadow:0 8px 20px rgba(139,92,246,.35)}
.read-badge-bar{display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:rgba(139,92,246,.08);margin-bottom:12px}
.read-art{background:var(--panel);border:1px solid var(--border);border-radius:20px;padding:22px;max-height:520px;overflow-y:auto}
.read-art h3{font-size:18px;font-weight:900;color:var(--purple);margin-bottom:12px}
.read-art p{color:var(--text);line-height:1.7;margin-bottom:12px;font-size:15px}
.read-art b{color:var(--purple)}
.read-listen{padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:var(--panel);font-size:13px;font-weight:500;margin-left:auto}

/* grammar */
.gram-progress{display:flex;align-items:center;gap:10px;padding:14px;background:var(--panel2);border-radius:16px;margin-bottom:12px}
.gram-group{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.gram-lvl-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;width:fit-content;margin-bottom:4px}
.gram-card{border-radius:16px;border:1px solid var(--border);background:var(--panel);cursor:pointer;overflow:hidden;transition:all .2s}
.gram-card:hover{border-color:var(--purple)}
.gram-card.open{border-color:var(--purple);box-shadow:0 8px 20px rgba(139,92,246,.2)}
.gram-head{display:flex;align-items:center;gap:12px;padding:14px}
.gram-ico{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:17px;background:var(--panel2);flex-shrink:0}
.gram-title{font-weight:700;font-size:14px}
.gram-meaning{font-size:12px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gram-caret{margin-left:auto;color:var(--muted);transition:transform .2s}
.gram-card.open .gram-caret{transform:rotate(180deg)}
.gram-body{padding:0 16px 16px;display:none}
.gram-card.open .gram-body{display:block;animation:fadeUp .25s ease}
.gram-ex{padding:12px;border-radius:12px;margin-bottom:12px;font-size:13px;font-style:italic}
.gram-sec-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.gram-mistake{padding:12px;border-radius:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);font-size:13px;color:#fca5a5;margin-bottom:12px}
.gram-alts{display:flex;flex-wrap:wrap;gap:8px}
.gram-alt{padding:6px 12px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);font-size:12px;font-family:ui-monospace,monospace}
.gram-listen{padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);font-size:13px;margin-top:12px}

/* karaoke */
.kara-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.kara-stat{border-radius:16px;padding:14px;text-align:center;border:1px solid var(--border)}
.kara-stat .v{font-size:24px;font-weight:900}
.kara-words{background:var(--panel);border:1px solid var(--border);border-radius:20px;padding:20px;max-height:260px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:6px;line-height:1.6}
.kw-word{font-size:16px;color:var(--muted);transition:all .15s}
.kw-word.correct{color:#4ade80;font-weight:600}
.kw-word.current{background:var(--purple);color:#fff;border-radius:4px;padding:0 4px;font-weight:700;animation:pulse 1s infinite}
.kw-word.missed{color:#f87171;text-decoration:line-through}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.4)}50%{box-shadow:0 0 0 6px rgba(139,92,246,0)}}
.listen-dot{width:12px;height:12px;border-radius:999px;background:#ef4444;animation:blink 0.8s infinite}
@keyframes blink{50%{opacity:.3;transform:scale(1.4)}}

/* dictation */
.dict-track{display:flex;gap:8px;margin-bottom:10px}
.dict-seg{flex:1;height:8px;border-radius:999px;background:var(--border);transition:background .3s}
.dict-seg.past-g{background:#22c55e}.dict-seg.past-b{background:#f87171}
.dict-seg.cur{background:var(--purple)}
.dict-player{padding:22px;text-align:center}
.dict-acc{text-align:center;padding:16px;border-radius:16px;border:2px solid var(--border);margin-bottom:12px}
.dict-acc .big{font-size:30px;font-weight:900}
.word-tags{display:flex;flex-wrap:wrap;gap:8px}
.word-tag{padding:6px 10px;border-radius:10px;font-size:13px;font-family:ui-monospace,monospace}
.word-tag.good{background:rgba(34,197,94,.15);color:#4ade80}
.word-tag.bad{background:rgba(239,68,68,.15);color:#f87171}
.dict-correct{padding:14px;border-radius:16px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);font-size:14px;font-style:italic;color:#93c5fd;margin-bottom:12px}

/* discussion */
.post-card{padding:18px;margin-bottom:14px}
.post-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.post-avatar{width:40px;height:40px;border-radius:999px;background:linear-gradient(135deg,#60a5fa,#6366f1);display:flex;align-items:center;justify-content:center;font-size:18px}
.post-name{font-weight:700;font-size:13px}
.post-handle{font-size:11px;color:var(--muted)}
.post-tag{margin-left:auto;padding:4px 10px;border-radius:999px;background:rgba(59,130,246,.15);color:#60a5fa;font-size:11px;font-weight:500}
.post-text{font-size:14px;line-height:1.6;font-weight:500}
.post-stats{display:flex;gap:14px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
.divider-row{display:flex;align-items:center;gap:10px;margin:14px 0}
.divider-row .line{flex:1;height:1px;background:var(--border)}
.comment-card{padding:14px;border:2px solid var(--border);border-radius:16px;cursor:pointer;margin-bottom:10px;transition:all .2s;background:var(--panel)}
.comment-card:hover{border-color:var(--purple)}
.comment-card.selected{border-color:var(--purple);background:rgba(139,92,246,.08)}
.comment-card.correct-ans{border-color:#22c55e;background:rgba(34,197,94,.08)}
.comment-card.wrong-ans{border-color:#ef4444;background:rgba(239,68,68,.08)}
.comment-row{display:flex;gap:12px;align-items:flex-start}
.comment-avatar{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#a78bfa,#6366f1);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;position:relative;box-shadow:0 4px 16px rgba(0,0,0,.2)}
.comment-mark{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:999px;background:#22c55e;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}
.comment-mark.x{background:#ef4444}
.comment-main{flex:1;min-width:0}
.comment-name{font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px}
.comment-text{font-size:13px;color:var(--text);line-height:1.55;margin-top:2px}
.comment-fb{margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:13px}
.comment-fb.good{color:#4ade80}
.comment-fb.neutral{color:var(--muted)}
.radio-dot{width:22px;height:22px;border-radius:999px;border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff}
.comment-card.selected .radio-dot{background:var(--purple);border-color:var(--purple)}

/* quiz */
.quiz-track{display:flex;gap:8px;justify-content:center;margin-bottom:12px}
.quiz-dot{width:26px;height:26px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:12px;background:var(--border);color:#fff}
.quiz-dot.good{background:#22c55e}.quiz-dot.bad{background:#f87171}
.quiz-q-card{padding:22px}
.q-letter{width:26px;height:26px;border-radius:999px;border:2px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.quiz-opt{
  width:100%;text-align:left;padding:14px 18px;border-radius:16px;border:2px solid var(--border);
  background:var(--panel2);font-size:14px;font-weight:500;margin-bottom:10px;display:flex;align-items:center;gap:12px;transition:all .2s;
}
.quiz-opt:hover{border-color:var(--purple)}
.quiz-opt.correct{background:rgba(34,197,94,.15);border-color:#22c55e;color:#bbf7d0}
.quiz-opt.wrong{background:rgba(239,68,68,.15);border-color:#ef4444;color:#fecaca}
.quiz-opt.dim{opacity:.5}
.quiz-expl{padding:14px;border-radius:16px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);font-size:13px;color:#93c5fd;margin-top:12px}
.results-hero{text-align:center;padding:34px 22px;border-radius:22px;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;box-shadow:0 16px 40px rgba(139,92,246,.4)}
.results-hero .big{font-size:64px;font-weight:900;margin:10px 0}
.secret-box{
  position:relative;overflow:hidden;text-align:center;padding:22px;border-radius:20px;margin-top:14px;
  background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
}
.secret-code{display:inline-block;padding:12px 22px;background:#facc15;color:#111827;font-weight:900;font-size:18px;border-radius:14px;letter-spacing:.1em;box-shadow:0 8px 24px rgba(250,204,21,.3)}
.sparkle{position:absolute;font-size:20px;animation:floaty 1.6s infinite}
@keyframes floaty{0%,100%{transform:translateY(0);opacity:.8}50%{transform:translateY(-16px);opacity:1}}
.review-row{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:12px;margin-bottom:8px}
.review-row.good{background:rgba(34,197,94,.1)}.review-row.bad{background:rgba(239,68,68,.1)}

/* conversation game */
.cg-chars{display:flex;gap:10px;justify-content:center;margin-bottom:14px}
.cg-char{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:16px;background:var(--panel);border:1px solid var(--border)}
.cg-char .c-avatar{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px}
.cg-dialogue{padding:22px;margin-bottom:14px;text-align:center}
.cg-speaker{font-weight:700;font-size:15px;margin-bottom:6px}
.cg-text{font-size:16px;line-height:1.6;color:var(--text);font-weight:500}
.cg-choice{
  width:100%;text-align:left;padding:14px 16px;border-radius:14px;border:2px solid var(--border);
  background:var(--panel);font-size:14px;margin-bottom:10px;transition:all .2s;display:block;
}
.cg-choice:hover{border-color:var(--purple);background:rgba(139,92,246,.06)}
.cg-cat-note{font-size:12px;color:#c4b5fd;font-style:italic;margin-top:4px;opacity:0;transition:opacity .3s}
.cg-choice.picked{border-color:var(--purple)}
.cg-choice.picked .cg-cat-note{opacity:1}
.cg-end{padding:22px;text-align:center;border-radius:18px}
.cg-end.win{background:rgba(34,197,94,.1);border:2px solid #22c55e}
.cg-end.lose{background:rgba(239,68,68,.1);border:2px solid #ef4444}
.cg-discuss{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:18px;margin-top:14px}
.cg-discuss ul{padding-left:20px;color:var(--muted);font-size:13px;line-height:1.7}

/* guess the place */
.gp-clue{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:20px;line-height:1.8;font-size:15px;max-height:340px;overflow-y:auto;margin-bottom:12px}
.gp-word{cursor:pointer;border-bottom:2px dotted var(--purple);position:relative}
.gp-tip{
  position:fixed;z-index:70;max-width:240px;padding:10px 12px;border-radius:12px;background:#1e1b4b;
  border:1px solid var(--purple);color:#ddd6fe;font-size:12px;line-height:1.5;box-shadow:0 12px 28px rgba(0,0,0,.5);pointer-events:none;
}
.gp-hint-btn{display:block;width:100%;text-align:left;padding:12px 16px;border-radius:12px;background:var(--panel2);border:1px solid var(--border);color:var(--muted);font-size:13px;margin-bottom:8px}
.gp-hint-btn .hint{color:var(--text);display:block;margin-top:4px}
.gp-imgs{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px}
@media(min-width:560px){.gp-imgs{grid-template-columns:repeat(4,1fr)}}
.gp-img{padding:14px;text-align:center;border-radius:16px;background:var(--panel);border:1px solid var(--border)}
.gp-img .e{font-size:34px;display:block;margin-bottom:6px}
.gp-img .l{font-weight:700;font-size:12px}
.gp-img .d{font-size:11px;color:var(--muted);margin-top:2px}
.gp-phrases{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.gp-phrase{padding:8px 12px;border-radius:12px;background:var(--panel);border:1px solid var(--border);font-size:12px;cursor:pointer;transition:all .15s}
.gp-phrase:hover{border-color:var(--purple)}
.gp-phrase .ph{font-weight:700}
.gp-phrase .pr{color:var(--purple);font-size:11px;margin-top:2px}
.gp-facts{display:flex;flex-wrap:wrap;gap:8px}
.gp-fact{padding:10px 14px;border-radius:12px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);font-size:12px;color:#86efac}
.gp-guess-row{display:flex;gap:10px;margin-top:14px}
.gp-input{flex:1;padding:13px 16px;border-radius:14px;border:2px solid var(--border);background:var(--panel2);color:var(--text);font-size:15px;outline:none}
.gp-input:focus{border-color:var(--purple)}
.gp-result{text-align:center;padding:18px;border-radius:16px;margin-top:12px;font-weight:700}

/* leaderboard */
.lb-card{display:flex;align-items:center;gap:12px;padding:14px;border-radius:16px;background:var(--panel);border:1px solid var(--border);margin-bottom:10px}
.lb-rank{width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;flex-shrink:0}
.lb-rank.r1{background:linear-gradient(135deg,#fbbf24,#f59e0b)}
.lb-rank.r2{background:linear-gradient(135deg,#cbd5e1,#94a3b8)}
.lb-rank.r3{background:linear-gradient(135deg,#fcd34d,#b45309)}
.lb-avatar{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:21px;background:var(--panel2);border:1px solid var(--border)}
.lb-name{font-weight:700;font-size:14px}
.lb-xp{font-size:12px;color:var(--muted)}
.lb-bar{flex:1;height:8px;border-radius:999px;background:var(--border);overflow:hidden;max-width:220px}
.lb-bar div{height:100%;border-radius:999px;background:linear-gradient(90deg,#8b5cf6,#ec4899)}

/* cat mascot */
.cat-wrap{position:fixed;bottom:92px;right:14px;z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.cat-bubble{max-width:280px;background:var(--panel);border:1px solid var(--purple);border-radius:18px;padding:14px;box-shadow:0 16px 40px rgba(0,0,0,.45);margin-right:6px;animation:fadeUp .25s ease}
.cat-bubble .cb-text{font-size:13px;line-height:1.6}
.cat-bubble .cb-arrow{width:12px;height:12px;background:var(--panel);border-right:1px solid var(--purple);border-bottom:1px solid var(--purple);transform:rotate(45deg);position:absolute;bottom:-7px;right:18px}
.cat-bubble-wrap{position:relative}
.cat-actions{display:flex;gap:8px;margin-top:12px}
.cat-act{flex:1;padding:8px;border-radius:10px;font-size:11px;font-weight:600;background:rgba(139,92,246,.15);color:#c4b5fd}
.cat-act.sound{background:rgba(34,197,94,.15);color:#86efac}
.cat-act.sound.off{background:rgba(239,68,68,.15);color:#fca5a5}
.cat-voices{margin-top:10px;border-top:1px solid var(--border);padding-top:10px;max-height:170px;overflow-y:auto}
.cat-voice-btn{width:100%;text-align:left;padding:7px 10px;border-radius:8px;font-size:11px;color:var(--muted);margin-bottom:2px}
.cat-voice-btn:hover{background:var(--panel2)}
.cat-voice-btn.on{background:rgba(139,92,246,.2);color:#c4b5fd;font-weight:600}
.cat-btn{
  width:64px;height:64px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:30px;
  background:linear-gradient(135deg,#a78bfa,#f472b6);box-shadow:0 12px 32px rgba(168,85,247,.5);
  border:4px solid var(--bg); transition:transform .15s; position:relative;
}
.cat-btn:hover{transform:scale(1.08)}
.cat-btn .cat-emoji{font-size:30px;display:inline-block}
.cat-btn.bounce .cat-emoji{animation:catBounce .5s ease}
.cat-btn.shake .cat-emoji{animation:catShake .5s ease}
@keyframes catBounce{0%,100%{transform:translateY(0) scale(1)}30%{transform:translateY(-8px) scale(1.15)}60%{transform:translateY(0) scale(.95)}}
@keyframes catShake{0%,100%{transform:rotate(0)}20%{transform:rotate(-12deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(8deg)}}
.cat-dot{position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-radius:999px;background:#ef4444;border:2px solid var(--bg)}
.cat-btn.speaking .cat-emoji{animation:catSpeak .7s infinite alternate}
@keyframes catSpeak{from{transform:scale(1)}to{transform:scale(1.18) rotate(-4deg)}}
.cat-btn.thinking .cat-emoji{animation:catThink 1.2s infinite}
@keyframes catThink{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}

/* achievement popup */
.ach-pop{
  position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:80;padding:14px 22px;border-radius:18px;
  background:linear-gradient(135deg,#fbbf24,#f97316);color:#fff;font-weight:700;font-size:15px;
  box-shadow:0 12px 32px rgba(0,0,0,.4);display:flex;align-items:center;gap:10px;animation:dropIn .35s ease;
}
@keyframes dropIn{from{opacity:0;transform:translate(-50%,-40px)}to{opacity:1;transform:translate(-50%,0)}}

/* toast + levelup */
.xp-toast{
  position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:75;padding:8px 16px;border-radius:999px;
  background:rgba(139,92,246,.9);color:#fff;font-weight:700;font-size:13px;animation:dropIn .3s ease;
}
.muted-banner{text-align:center;padding:12px;border-radius:16px;background:rgba(245,158,11,.1);border:1px solid #b45309;color:#fbbf24;font-size:13px;margin-bottom:12px}
.kara-listen-row{display:flex;align-items:center;justify-content:center;gap:8px;color:#f87171;font-size:13px;font-weight:600;margin-bottom:10px}

@media(max-width:560px){
  .cat-wrap{right:8px;bottom:86px}
  .cat-bubble{max-width:240px}
  .warm-q{padding:22px}
  .warm-a{padding:22px}
  .msg-body{max-width:88%}
}
`;