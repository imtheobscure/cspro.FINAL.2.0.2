/**
 * Live Lesson standalone HTML — styles.
 *
 * A self-contained CSS system (`.ll-*`) that reproduces the Live-Lessons React app's
 * dark-slate / indigo look pixel-for-pixel in the standalone HTML. The React presenter
 * imports the same string, so both versions are guaranteed identical.
 */

export const LIVE_HTML_CSS = `
:root{
  --ll-bg:#0f172a; --ll-bg2:#1e293b; --ll-bg3:#334155; --ll-brd:#334155;
  --ll-txt:#f1f5f9; --ll-txt2:#94a3b8; --ll-txt3:#64748b;
  --ll-ind:#6366f1; --ll-ind2:#818cf8; --ll-em:#10b981; --ll-rd:#ef4444;
  --ll-yl:#f59e0b; --ll-pr:#8b5cf6; --ll-cy:#06b6d4; --ll-rs:#f43f5e;
  /* The "2" family are the 400-weight tints the dark theme uses for accent
     TEXT and chips. They are named here (rather than left as literals) purely so
     the light theme can re-point them — on white, a 400 tint is ~1.3:1 and
     unreadable. Values below are identical to the literals they replace, so the
     dark theme is unchanged. */
  --ll-em2:#34d399; --ll-yl2:#fbbf24; --ll-bl2:#60a5fa; --ll-pr2:#a78bfa; --ll-rs2:#fb7185;
}
/*
  Light theme. Switching the surfaces is not enough on its own: every accent the
  dark theme uses is a 300/400 tint chosen to glow against slate, and those are
  washed out on white (measured 1.3–2.6:1). The accents are therefore re-pointed
  at the 600/700 shades, which are the ones designed for a light ground. The
  muted text token also moves DARKER here — it was set to slate-400, lighter than
  the dark theme's slate-500, which is backwards.
*/
.ll-light{
  --ll-bg:#f8fafc; --ll-bg2:#ffffff; --ll-bg3:#f1f5f9; --ll-brd:#e2e8f0;
  --ll-txt:#0f172a; --ll-txt2:#475569; --ll-txt3:#475569;
  --ll-ind:#4338ca; --ll-ind2:#4338ca; --ll-em:#047857; --ll-rd:#b91c1c;
  --ll-yl:#b45309; --ll-pr:#6d28d9; --ll-cy:#0e7490; --ll-rs:#be123c;
  /* The -800 shades, not -700: these land on tinted chips (a peach points
     badge, a mauve phase tag) rather than on plain white, which costs ~1.3:1. */
  --ll-em2:#065f46; --ll-yl2:#92400e; --ll-bl2:#1d4ed8; --ll-pr2:#5b21b6; --ll-rs2:#9f1239;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--ll-bg);color:var(--ll-txt);font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:17px;line-height:1.6;overflow:hidden}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
input,select,textarea{font-family:inherit;font-size:inherit}
img{max-width:100%}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-thumb{background:var(--ll-bg3);border-radius:4px}
.ll-app{display:flex;height:100vh;position:relative}
.ll-bgimg{position:fixed;inset:0;background-size:cover;background-position:center;pointer-events:none;opacity:.08;z-index:0;transition:opacity .5s}
.ll-side{width:320px;flex-shrink:0;background:var(--ll-bg2);border-right:1px solid var(--ll-brd);display:flex;flex-direction:column;overflow:hidden;backdrop-filter:blur(8px);z-index:5}
.ll-main{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:10}

/* ── Sidebar ─────────────────────────────────────────────── */
.ll-prof{padding:20px;border-bottom:1px solid var(--ll-brd);background:linear-gradient(to bottom,var(--ll-bg3),var(--ll-bg2))}
.ll-profrow{display:flex;align-items:center;gap:16px}
.ll-avatar{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#fff;flex-shrink:0}
.ll-tier-common{box-shadow:0 0 15px rgba(148,163,184,.3)}
.ll-tier-rare{box-shadow:0 0 25px rgba(59,130,246,.6)}
.ll-tier-epic{box-shadow:0 0 35px rgba(168,85,247,.7)}
.ll-tier-legendary{box-shadow:0 0 45px rgba(251,191,36,.8);animation:llpulse 1.5s ease-in-out infinite}
@keyframes llpulse{0%,100%{box-shadow:0 0 25px rgba(251,191,36,.5)}50%{box-shadow:0 0 55px rgba(251,191,36,.95)}}
.ll-profname{font-size:18px;font-weight:800;color:var(--ll-txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ll-tier-txt{font-size:15px;font-weight:600}
.ll-sub{font-size:13px;color:var(--ll-txt2);margin-top:2px}
.ll-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.ll-stat{background:var(--ll-bg3);border-radius:12px;padding:12px;text-align:center}
.ll-stat b{display:block;font-size:17px;color:var(--ll-txt)}
.ll-stat span{font-size:11px;color:var(--ll-txt2)}
.ll-badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.ll-badge{font-size:22px}
.ll-search{padding:12px 16px;border-bottom:1px solid var(--ll-brd);position:relative}
.ll-search input{width:100%;padding:12px 36px 12px 12px;background:var(--ll-bg3);border:1px solid var(--ll-brd);border-radius:12px;color:var(--ll-txt);font-size:15px;outline:none}
.ll-search input:focus{border-color:var(--ll-ind);box-shadow:0 0 0 2px rgba(99,102,241,.3)}
.ll-search .ll-x{position:absolute;right:26px;top:50%;transform:translateY(-50%);color:var(--ll-txt2);font-size:15px}
.ll-phases{display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--ll-brd)}
.ll-phase{flex:1;border-radius:12px;padding:10px 4px;text-align:center;border:2px solid var(--ll-brd);background:var(--ll-bg3);color:var(--ll-txt2);transition:all .15s}
.ll-phase:hover{border-color:var(--ll-bg3)}
.ll-phase.ll-on{border-color:currentColor}
.ll-phase .ll-emoji{font-size:22px;display:block;margin-bottom:2px}
.ll-phase b{font-size:13px}
.ll-phase small{display:block;font-size:11px;color:var(--ll-txt3)}
.ll-filterbar{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:var(--ll-bg3);font-size:13px;color:var(--ll-txt2)}
.ll-steps{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.ll-step{width:100%;text-align:left;border-radius:12px;padding:14px;border:2px solid var(--ll-brd);background:var(--ll-bg2);transition:all .15s;display:flex;gap:10px;align-items:flex-start}
.ll-step:hover{background:var(--ll-bg3)}
.ll-step.ll-active{background:rgba(99,102,241,.25);border-color:rgba(99,102,241,.6)}
.ll-step.ll-done{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.35)}
.ll-step .ll-sico{font-size:20px;margin-top:1px;flex-shrink:0}
.ll-step .ll-sinfo{flex:1;min-width:0}
.ll-phasetag{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;margin-bottom:4px}
.ll-pt-study{background:rgba(59,130,246,.2);color:var(--ll-bl2)}
.ll-pt-speak{background:rgba(16,185,129,.2);color:var(--ll-em2)}
.ll-pt-review{background:rgba(168,85,247,.2);color:var(--ll-pr2)}
.ll-steptitle{font-size:15px;font-weight:600;color:var(--ll-txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ll-step .ll-stype{font-size:12px;color:var(--ll-txt3);margin-top:2px;text-transform:capitalize}
.ll-step .ll-sscore{font-size:13px;color:var(--ll-em2);font-weight:600;margin-top:4px}
.ll-step .ll-smeta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.ll-pts{font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:rgba(245,158,11,.2);color:var(--ll-yl2);display:flex;align-items:center;gap:3px}
.ll-prog{padding:16px;border-top:1px solid var(--ll-brd)}
.ll-progrow{display:flex;justify-content:space-between;font-size:13px;color:var(--ll-txt2);margin-bottom:6px}
.ll-progbar{height:12px;background:var(--ll-bg3);border-radius:999px;overflow:hidden}
.ll-progfill{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:999px;transition:width .5s}

/* ── Header ─────────────────────────────────────────────── */
.ll-header{flex-shrink:0;display:flex;align-items:center;gap:10px;padding:14px 28px;background:var(--ll-bg2);border-bottom:1px solid var(--ll-brd);backdrop-filter:blur(8px);flex-wrap:wrap}
.ll-hbtn{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;border:1px solid var(--ll-brd);background:var(--ll-bg2);color:var(--ll-txt2);font-size:14px;font-weight:500;transition:all .15s}
.ll-hbtn:hover{color:var(--ll-txt);background:var(--ll-bg3)}
.ll-hbtn.ll-on{background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.5);color:var(--ll-ind2)}
.ll-hbtn.ll-em{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.5);color:var(--ll-em2)}
.ll-hbtn.ll-grad{background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;border:none;font-weight:600;box-shadow:0 4px 14px rgba(99,102,241,.35)}
.ll-hbtn.ll-grad:hover{filter:brightness(1.1)}
.ll-hbtn .ll-ico{font-size:17px;display:inline-flex}
.ll-spacer{flex:1}

/* ── Content ────────────────────────────────────────────── */
.ll-content{flex:1;overflow-y:auto}
.ll-wrap{max-width:1024px;margin:0 auto;padding:28px}
.ll-stephead{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:20px}
.ll-title{font-size:28px;font-weight:800;color:var(--ll-txt);margin-bottom:6px}
.ll-zap{display:flex;align-items:center;gap:6px;color:var(--ll-yl2);font-size:17px;font-weight:600}
.ll-legacy{font-size:13px;padding:5px 12px;border-radius:999px;background:rgba(180,83,9,.25);color:var(--ll-yl2);border:1px solid rgba(217,119,6,.3);white-space:nowrap}
.ll-tnotes{background:linear-gradient(90deg,rgba(67,56,202,.25),rgba(112,26,117,.25));border:1px solid rgba(109,40,217,.3);border-radius:16px;padding:22px;margin-bottom:16px}
.ll-tnotes h4{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#a5b4fc;margin-bottom:14px}
.ll-tnotes .ll-md{font-size:17px;color:var(--ll-txt);line-height:1.7}
.ll-sinst{background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:16px;padding:18px 22px;margin-bottom:16px}
.ll-sinst p{font-size:19px;color:var(--ll-txt);line-height:1.6}
.ll-card{background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:18px;padding:26px;box-shadow:0 8px 24px rgba(0,0,0,.15);margin-bottom:20px}

/* ── Timer bar ──────────────────────────────────────────── */
.ll-timer{display:flex;align-items:center;gap:16px;background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:16px;padding:12px 18px;margin-bottom:20px;backdrop-filter:blur(8px)}
.ll-tcirc{position:relative;width:62px;height:62px;flex-shrink:0}
.ll-tcirc svg{transform:rotate(-90deg)}
.ll-tcirc .ll-tt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700}
.ll-tbtn{padding:9px;border-radius:10px;color:var(--ll-txt2)}
.ll-tbtn:hover{background:var(--ll-bg3);color:var(--ll-txt)}
.ll-tdot{width:12px;height:12px;border-radius:50%;background:var(--ll-em2);animation:llblink 1s infinite}
@keyframes llblink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.35)}}

/* ── Language panel ─────────────────────────────────────── */
.ll-lang{background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:16px;overflow:hidden;margin-bottom:20px}
.ll-langhead{display:flex;align-items:center;gap:10px;padding:16px 24px;border-bottom:1px solid var(--ll-brd)}
.ll-langhead span{font-size:19px;font-weight:800}
.ll-sec{border-bottom:1px solid var(--ll-brd)}
.ll-sec:last-child{border-bottom:none}
.ll-sechead{width:100%;display:flex;align-items:center;justify-content:space-between;padding:15px 24px;font-size:16px;font-weight:700;color:var(--ll-txt)}
.ll-sechead:hover{background:var(--ll-bg3)}
.ll-secbody{padding:8px 24px 20px}
.ll-grow{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
.ll-grow:last-child{margin-bottom:0}
.ll-chk{flex-shrink:0;margin-top:5px;color:var(--ll-txt2);font-size:17px;cursor:pointer;background:none;border:none}
.ll-gbox{flex:1;border-radius:12px;padding:14px;border-left:4px solid #6366f1;background:rgba(99,102,241,.08)}
.ll-gbox b{font-size:16px;color:var(--ll-txt);display:block}
.ll-gbox i{font-size:15px;color:var(--ll-txt2);font-style:italic;margin-top:6px;display:block}
.ll-vwrap{display:flex;flex-wrap:wrap;gap:12px}
.ll-vchip{display:flex;align-items:center;gap:8px;border-radius:12px;padding:8px 14px;cursor:default}
.ll-vchip b{font-size:16px}
.ll-vchip span{font-size:14px;color:var(--ll-txt2)}
.ll-expr b{font-size:16px;color:#c4b5fd}
.ll-expr p{font-size:14px;color:var(--ll-txt3)}
.ll-ssbox{background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.2);border-radius:12px;padding:12px 16px;flex:1}
.ll-ssbox b{color:var(--ll-rs2);font-size:16px}
.ll-ssbox p{font-size:14px;color:var(--ll-txt3)}

/* ── CCQ / Speaking ─────────────────────────────────────── */
.ll-ccq{background:rgba(180,83,9,.12);border:1px solid rgba(217,119,6,.25);border-radius:16px;padding:22px;margin-bottom:20px}
.ll-ccq h4{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ll-yl2);margin-bottom:16px}
.ll-item{background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:12px;padding:18px;margin-bottom:12px}
.ll-item:last-child{margin-bottom:0}
.ll-item b{font-size:16px;font-weight:600;color:var(--ll-txt);display:block}
.ll-item details{margin-top:10px}
.ll-item summary{font-size:14px;color:var(--ll-txt3);cursor:pointer}
.ll-item .ll-ans{margin-top:8px;padding-left:12px;border-left:4px solid rgba(217,119,6,.5);color:var(--ll-yl2);font-size:15px}
.ll-item .ll-purp{font-size:12px;color:var(--ll-txt3);margin-top:6px}
.ll-spk{background:rgba(67,56,202,.15);border:1px solid rgba(99,102,241,.25);border-radius:16px;padding:22px;margin-bottom:20px}
.ll-spk h4{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ll-ind2);margin-bottom:16px}
.ll-level{font-size:12px;padding:3px 10px;border-radius:999px;font-weight:600;border:1px solid;flex-shrink:0}
.ll-lv-controlled{background:rgba(59,130,246,.2);color:var(--ll-bl2);border-color:rgba(59,130,246,.35)}
.ll-lv-guided{background:rgba(168,85,247,.2);color:var(--ll-pr2);border-color:rgba(168,85,247,.35)}
.ll-lv-free{background:rgba(16,185,129,.2);color:var(--ll-em2);border-color:rgba(16,185,129,.35)}
.ll-srow{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.ll-srow p{flex:1;font-size:16px;color:var(--ll-txt)}
.ll-follow{font-size:14px;color:var(--ll-txt3);margin-top:8px}
.ll-target{font-size:14px;color:var(--ll-ind2);font-weight:600;margin-top:6px}

/* ── Activity base ──────────────────────────────────────── */
.ll-actq{background:var(--ll-bg3);border-radius:14px;padding:18px;border:1px solid var(--ll-brd);margin-bottom:16px}
.ll-actq p{font-size:18px;font-weight:500;color:var(--ll-txt);line-height:1.5}
.ll-actq small{font-size:12px;color:var(--ll-txt2);display:block;margin-top:6px}
.ll-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:12px;font-size:15px;font-weight:600;transition:all .15s;border:2px solid transparent}
.ll-btn.ll-pri{background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,.3)}
.ll-btn.ll-pri:hover{filter:brightness(1.12)}
.ll-btn.ll-ghost{background:var(--ll-bg3);color:var(--ll-txt);border-color:var(--ll-brd)}
.ll-btn.ll-ghost:hover{background:var(--ll-bg2)}
.ll-btn.ll-grn{background:rgba(16,185,129,.2);color:var(--ll-em2);border-color:rgba(16,185,129,.4)}
.ll-btn.ll-red{background:rgba(239,68,68,.2);color:#f87171;border-color:rgba(239,68,68,.4)}
.ll-btn:disabled{opacity:.4;cursor:not-allowed}
.ll-btnrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.ll-fb{margin-top:16px;border-radius:14px;padding:18px;border:2px solid}
.ll-fb.ll-ok{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.35);color:#6ee7b7}
.ll-fb.ll-no{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.35);color:#fca5a5}
.ll-fb b{font-size:16px}
.ll-fb p{font-size:14px;margin-top:6px;opacity:.9}
.ll-tip{font-size:13px;color:var(--ll-txt3);margin-top:8px;font-style:italic}
.ll-ico-btn{padding:8px;border-radius:10px;background:var(--ll-bg3);color:var(--ll-txt2);border:1px solid var(--ll-brd);transition:all .15s}
.ll-ico-btn:hover{color:var(--ll-txt);background:var(--ll-bg2)}

/* ── Would You Rather ───────────────────────────────────── */
.ll-wyrnav{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.ll-wyrdots{display:flex;gap:8px;align-items:center}
.ll-wyrdot{width:13px;height:13px;border-radius:50%;background:var(--ll-bg3);border:none;transition:all .15s}
.ll-wyrdot.ll-on{background:var(--ll-ind);transform:scale(1.25)}
.ll-wyrdot.ll-chosen{background:var(--ll-em2)}
.ll-wyrq{text-align:center;font-size:21px;font-weight:700;margin-bottom:20px}
.ll-wyrgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ll-wyropt{display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px 16px;border-radius:18px;border:2px solid var(--ll-brd);background:var(--ll-bg3);transition:all .15s}
.ll-wyropt:hover{border-color:var(--ll-ind)}
.ll-wyropt.ll-on{border-color:var(--ll-em2);background:rgba(16,185,129,.15)}
.ll-wyropt .ll-oe{font-size:44px}
.ll-wyropt b{font-size:16px;color:var(--ll-txt);text-align:center;line-height:1.4}
.ll-spkprompts{margin-top:16px}
.ll-spkprompts li{font-size:15px;color:var(--ll-txt2);margin:6px 0 6px 18px}

/* ── Accordion ──────────────────────────────────────────── */
.ll-acc{border:1px solid var(--ll-brd);border-radius:14px;overflow:hidden;margin-bottom:10px;background:var(--ll-bg2)}
.ll-accbtn{width:100%;display:flex;align-items:center;justify-content:space-between;padding:16px 20px;font-size:16px;font-weight:600;color:var(--ll-txt);text-align:left}
.ll-accbtn:hover{background:var(--ll-bg3)}
.ll-accbody{padding:0 20px 18px;color:var(--ll-txt2);font-size:15px;line-height:1.7;display:none}
.ll-acc.ll-open .ll-accbody{display:block}
.ll-accbody table{width:100%;border-collapse:collapse;margin:10px 0;font-size:14px}
.ll-accbody td{border-bottom:1px solid var(--ll-brd);padding:9px 12px}
.ll-accbody tr:first-child td{font-weight:700;color:var(--ll-txt)}
.ll-accbody strong{color:var(--ll-txt)}

/* ── True / False ───────────────────────────────────────── */
.ll-tfbtn{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 16px;border-radius:18px;border:4px solid rgba(16,185,129,.5);font-size:36px;font-weight:900;color:var(--ll-em2);background:var(--ll-bg3);transition:all .25s;width:100%}
.ll-tfbtn:hover{background:rgba(16,185,129,.15)}
.ll-tfbtn.ll-pick-ok{background:#059669;border-color:var(--ll-em2);color:#fff;box-shadow:0 0 40px rgba(16,185,129,.4)}
.ll-tfbtn.ll-pick-no{background:#dc2626;border-color:#f87171;color:#fff;box-shadow:0 0 40px rgba(239,68,68,.4)}
.ll-tfbtn.ll-reveal-ok{background:rgba(16,185,129,.3);border-color:rgba(52,211,153,.5);color:#6ee7b7}
.ll-tfbtn.ll-reveal-no{background:rgba(239,68,68,.3);border-color:rgba(248,113,113,.5);color:#fca5a5}
.ll-tfbtn small{font-size:14px;font-weight:600}

/* ── Mark the words ─────────────────────────────────────── */
.ll-marktext{font-size:16px;line-height:2;color:var(--ll-txt2)}
.ll-marktext span{display:inline-block;margin:0 1px;padding:0 2px;border-radius:4px;cursor:pointer;transition:all .12s}
.ll-marktext span:hover{background:var(--ll-bg3)}
.ll-marktext span.ll-m{background:rgba(99,102,241,.3);color:#c7d2fe;border:1px solid rgba(99,102,241,.5)}
.ll-marktext span.ll-okm{background:rgba(16,185,129,.3);color:#6ee7b7;border:1px solid rgba(16,185,129,.5)}
.ll-marktext span.ll-miss{background:rgba(245,158,11,.3);color:#fde68a;border:1px solid rgba(245,158,11,.5);text-decoration:underline}
.ll-marktext span.ll-wrong{background:rgba(239,68,68,.3);color:#fca5a5;border:1px solid rgba(239,68,68,.5);text-decoration:line-through}
.ll-score{display:flex;gap:18px;margin-top:14px;font-size:14px;color:var(--ll-txt2)}
.ll-score b{color:var(--ll-em2)}

/* ── Fill in blanks ─────────────────────────────────────── */
.ll-fibline{margin-bottom:12px;font-size:16px;line-height:2.4;color:var(--ll-txt2)}
.ll-fibline .ll-tx{color:var(--ll-txt)}
.ll-blank{display:inline-block;width:110px;padding:6px 10px;border-radius:8px;border:2px solid rgba(99,102,241,.5);background:rgba(30,27,75,.5);color:#fff;text-align:center;font-size:14px;font-weight:600;outline:none}
.ll-blank:focus{border-color:var(--ll-ind2)}
.ll-blank.ll-okb{border-color:var(--ll-em2);background:rgba(6,78,59,.5);color:#6ee7b7}
.ll-blank.ll-badb{border-color:#f87171;background:rgba(127,29,29,.5);color:#fca5a5}
.ll-hintbtn{font-size:12px;color:var(--ll-txt2);background:var(--ll-bg3);border:1px solid var(--ll-brd);border-radius:6px;padding:2px 8px;margin-left:6px}
.ll-hintbtn:hover{color:var(--ll-txt)}
.ll-hint{font-size:12px;color:var(--ll-yl2);font-style:italic;margin-left:6px}

/* ── Drag the words ─────────────────────────────────────── */
.ll-bank{background:var(--ll-bg3);border-radius:12px;padding:14px;border:1px solid var(--ll-brd);margin-bottom:16px}
.ll-bank p{font-size:12px;color:var(--ll-txt2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}
.ll-bankrow{display:flex;flex-wrap:wrap;gap:8px}
.ll-dragword{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;border:2px solid var(--ll-brd);background:var(--ll-bg3);color:var(--ll-txt2);font-size:14px;font-weight:500;cursor:grab;transition:all .15s}
.ll-dragword:hover{border-color:var(--ll-ind)}
.ll-dragword.ll-grab{border-color:var(--ll-ind2);background:rgba(99,102,241,.3);color:#fff}
.ll-dragword:disabled{opacity:.35;cursor:default}
.ll-dtext{font-size:16px;line-height:2.6;color:var(--ll-txt2)}
.ll-slot{display:inline-flex;align-items:center;min-width:90px;min-height:36px;border-bottom:2px dashed var(--ll-brd);border-radius:8px;padding:4px 10px;margin:0 3px;vertical-align:middle;font-size:14px;font-weight:600;color:#c7d2fe;background:rgba(99,102,241,.12);cursor:pointer;justify-content:center}
.ll-slot.ll-okb{border-bottom-color:var(--ll-em2);background:rgba(16,185,129,.12);color:#6ee7b7}
.ll-slot.ll-badb{border-bottom-color:#f87171;background:rgba(239,68,68,.12);color:#fca5a5}

/* ── Memory game ────────────────────────────────────────── */
.ll-memhead{display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap}
.ll-memgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.ll-memcard{aspect-ratio:1.2;border-radius:14px;border:2px solid var(--ll-brd);background:linear-gradient(135deg,#334155,#1e293b);display:flex;align-items:center;justify-content:center;font-size:30px;cursor:pointer;transition:all .2s;position:relative}
.ll-memcard:hover{border-color:var(--ll-ind);transform:translateY(-2px)}
.ll-memcard.ll-flip{background:var(--ll-bg2);border-color:var(--ll-ind)}
.ll-memcard.ll-match{background:rgba(16,185,129,.2);border-color:var(--ll-em2);cursor:default;transform:scale(.96)}
.ll-memcard .ll-mfront{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px}
.ll-memcard .ll-mback{display:none;font-size:15px;font-weight:600;color:var(--ll-txt);text-align:center;padding:8px;line-height:1.3}
.ll-memcard.ll-flip .ll-mfront{display:none}
.ll-memcard.ll-flip .ll-mback{display:flex;align-items:center;justify-content:center}
.ll-memcard.ll-match .ll-mback{display:flex;align-items:center;justify-content:center}

/* ── Image hotspots ─────────────────────────────────────── */
.ll-ihwrap{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--ll-brd);cursor:crosshair}
.ll-ihwrap img{display:block;width:100%}
.ll-ihpin{position:absolute;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:50%;background:rgba(99,102,241,.85);border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4);transition:transform .15s}
.ll-ihpin:hover{transform:translate(-50%,-50%) scale(1.25);z-index:5}
.ll-ihpin.ll-visited{background:rgba(16,185,129,.9)}
.ll-ihpop{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:14px;padding:14px 16px;width:min(90%,420px);box-shadow:0 12px 30px rgba(0,0,0,.5);z-index:10}
.ll-ihpop b{display:block;margin-bottom:4px;font-size:15px}
.ll-ihpop p{font-size:14px;color:var(--ll-txt2)}
.ll-ihx{position:absolute;top:8px;right:10px;font-size:15px;color:var(--ll-txt2)}

/* ── Spot the difference ────────────────────────────────── */
.ll-stdgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ll-stdimg{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--ll-brd)}
.ll-stdimg img{display:block;width:100%}
.ll-stdmark{position:absolute;width:26px;height:26px;border-radius:50%;transform:translate(-50%,-50%);border:3px solid #fff;box-shadow:0 0 12px rgba(0,0,0,.5);animation:llpop .4s}
@keyframes llpop{0%{transform:translate(-50%,-50%) scale(0)}60%{transform:translate(-50%,-50%) scale(1.3)}100%{transform:translate(-50%,-50%) scale(1)}}
.ll-stdmark.ll-ok{background:var(--ll-em2)}
.ll-stdmark.ll-no{background:#f87171}

/* ── Truth or dare ──────────────────────────────────────── */
.ll-todfilters{display:flex;gap:8px;justify-content:center;margin-bottom:16px}
.ll-todf{flex:1;max-width:180px;padding:9px;border-radius:12px;font-size:14px;font-weight:600;background:var(--ll-bg3);color:var(--ll-txt2);border:1px solid var(--ll-brd);transition:all .15s}
.ll-todf.ll-on-blue{background:#2563eb;color:#fff}
.ll-todf.ll-on-red{background:#dc2626;color:#fff}
.ll-todf.ll-on-all{background:var(--ll-ind);color:#fff}
.ll-wheel{width:150px;height:150px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#9333ea,#db2777);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(99,102,241,.5);border:4px solid rgba(255,255,255,.1);margin:0 auto 18px;transition:all .15s}
.ll-wheel:hover{transform:scale(1.05)}
.ll-wheel.ll-spin{animation:llrot .3s linear infinite}
@keyframes llrot{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.ll-todcard{background:var(--ll-bg3);border:1px solid var(--ll-brd);border-radius:16px;padding:22px;text-align:center;min-height:110px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.ll-todcard b{font-size:18px;color:var(--ll-txt)}
.ll-todcard p{font-size:15px;color:var(--ll-txt2)}
.ll-tag-t{display:inline-block;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(59,130,246,.2);color:var(--ll-bl2)}
.ll-tag-d{display:inline-block;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(239,68,68,.2);color:#f87171}

/* ── Flashcards ─────────────────────────────────────────── */
.ll-fcbar{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.ll-fcbar .ll-pbar{flex:1;height:8px;background:var(--ll-bg3);border-radius:999px;overflow:hidden}
.ll-fcbar .ll-pfill{height:100%;background:linear-gradient(90deg,#10b981,#6366f1);border-radius:999px;transition:width .3s}
.ll-fcstage{display:flex;align-items:center;gap:12px}
.ll-fccard{flex:1;min-height:190px;perspective:1000px;cursor:pointer}
.ll-fcinner{position:relative;width:100%;min-height:190px;transition:transform .5s;transform-style:preserve-3d}
.ll-fccard.ll-flipped .ll-fcinner{transform:rotateY(180deg)}
.ll-fcface{position:absolute;inset:0;backface-visibility:hidden;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;border:2px solid rgba(99,102,241,.4);background:linear-gradient(135deg,#334155,#1e293b)}
.ll-fcface.ll-back{transform:rotateY(180deg);background:linear-gradient(135deg,rgba(16,185,129,.2),rgba(99,102,241,.2));border-color:rgba(16,185,129,.4)}
.ll-fcface b{font-size:26px;color:var(--ll-txt)}
.ll-fcface p{font-size:15px;color:var(--ll-txt2);margin-top:8px;line-height:1.5}
.ll-fcface small{font-size:12px;color:var(--ll-txt3);margin-top:10px}
.ll-fcmark{display:flex;gap:10px;justify-content:center;margin-top:14px}
.ll-fck{background:rgba(16,185,129,.2);color:var(--ll-em2);border:1px solid rgba(16,185,129,.4)}
.ll-fcu{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.35)}
.ll-fck:hover,.ll-fcu:hover{filter:brightness(1.2)}

/* ── Word cloud ─────────────────────────────────────────── */
.ll-wcin{display:flex;gap:8px;margin-bottom:8px}
.ll-wcin input{flex:1;padding:11px 14px;background:var(--ll-bg3);border:1px solid var(--ll-brd);border-radius:12px;color:var(--ll-txt);outline:none}
.ll-wcin input:focus{border-color:var(--ll-ind)}
.ll-cloud{background:rgba(2,6,23,.5);border:1px solid var(--ll-brd);border-radius:16px;padding:26px;min-height:180px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px}
.ll-cw{font-weight:600;cursor:default;transition:transform .15s;line-height:1.2}
.ll-cw:hover{transform:scale(1.12)}
.ll-c0{color:var(--ll-ind2)}.ll-c1{color:#c084fc}.ll-c2{color:var(--ll-em2)}.ll-c3{color:var(--ll-yl2)}.ll-c4{color:#f472b6}.ll-c5{color:#22d3ee}

/* ── Multiple choice ────────────────────────────────────── */
.ll-mcq{display:flex;flex-direction:column;gap:8px}
.ll-choice{display:flex;align-items:center;gap:10px;padding:13px 16px;border-radius:12px;border:2px solid var(--ll-brd);background:var(--ll-bg3);color:var(--ll-txt2);font-size:15px;text-align:left;transition:all .15s}
.ll-choice:hover{border-color:var(--ll-ind)}
.ll-choice.ll-sel{border-color:var(--ll-ind);background:rgba(99,102,241,.2);color:#fff}
.ll-choice.ll-okc{border-color:var(--ll-em2);background:rgba(16,185,129,.2);color:#6ee7b7}
.ll-choice.ll-badc{border-color:#f87171;background:rgba(239,68,68,.2);color:#fca5a5}
.ll-shake{animation:llshake .4s}
@keyframes llshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}

/* ── Default fallback ───────────────────────────────────── */
.ll-default{text-align:center;padding:30px}
.ll-default .ll-de{font-size:56px;display:block;margin-bottom:16px}
.ll-default b{font-size:20px;display:block;margin-bottom:8px}
.ll-default p{color:var(--ll-txt2);font-size:15px}
.ll-jsonpre{background:rgba(2,6,23,.6);border-radius:12px;padding:14px;font-size:12px;overflow:auto;max-height:220px;color:var(--ll-txt2);text-align:left;margin-top:14px;white-space:pre-wrap}

/* ── Footer nav ─────────────────────────────────────────── */
.ll-footer{flex-shrink:0;padding:18px 28px;background:var(--ll-bg2);border-top:1px solid var(--ll-brd);backdrop-filter:blur(8px)}
.ll-footer .ll-inner{max-width:1024px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px}
.ll-navbtn{display:flex;align-items:center;gap:10px;padding:13px 22px;border-radius:12px;font-size:17px;font-weight:600;transition:all .15s}
.ll-navbtn.ll-prev{background:var(--ll-bg3);color:var(--ll-txt);border:1px solid var(--ll-brd)}
.ll-navbtn.ll-prev:hover{background:var(--ll-bg2)}
.ll-navbtn.ll-next{background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,.3)}
.ll-navbtn.ll-next:hover{filter:brightness(1.12)}
.ll-navbtn:disabled{opacity:.35;cursor:not-allowed;filter:none}
.ll-dots{display:flex;gap:8px}
.ll-dot{width:13px;height:13px;border-radius:50%;border:none;background:var(--ll-bg3);transition:all .15s;cursor:pointer}
.ll-dot:hover{background:var(--ll-bg2)}
.ll-dot.ll-cur{background:var(--ll-ind);transform:scale(1.5)}
.ll-dot.ll-done{background:var(--ll-em2)}

/* ── Cat mascot ─────────────────────────────────────────── */
.ll-cat{position:fixed;bottom:22px;right:22px;z-index:60}
.ll-catface{width:92px;height:92px;border-radius:50%;background:var(--ll-bg2);box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:52px;transition:all .2s;border:none;position:relative}
.ll-catface:hover{transform:scale(1.08)}
.ll-catface.ll-speak{background:rgba(16,185,129,.25);box-shadow:0 0 0 4px rgba(52,211,153,.6);animation:llbob .5s infinite}
.ll-catface.ll-muted{background:var(--ll-bg3);opacity:.7;box-shadow:0 0 0 4px rgba(248,113,113,.6)}
@keyframes llbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.ll-catmute{position:absolute;top:-6px;right:-6px;width:38px;height:38px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:15px;z-index:2;background:#10b981;border-color:#6ee7b7;color:#fff}
.ll-catmute.ll-m{background:#ef4444;border-color:#fca5a5}
.ll-catset{position:absolute;bottom:-4px;left:-4px;width:32px;height:32px;border-radius:50%;background:var(--ll-ind);color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;transition:transform .2s}
.ll-catset.ll-rot{transform:rotate(90deg)}
.ll-catbub{position:absolute;bottom:100%;right:0;margin-bottom:12px;width:280px;background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.45);padding:14px;z-index:70}
.ll-catbub p{font-size:15px;color:var(--ll-txt);line-height:1.5}
.ll-catpanel{position:absolute;bottom:100%;right:0;margin-bottom:14px;width:320px;background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:18px;box-shadow:0 16px 40px rgba(0,0,0,.5);overflow:hidden;z-index:70}
.ll-catpanel h3{font-size:17px;font-weight:800;color:var(--ll-txt);padding:14px 16px 6px}
.ll-catsearch{position:relative;margin:8px 14px}
.ll-catsearch input{width:100%;padding:9px 12px 9px 32px;background:var(--ll-bg3);border:1px solid var(--ll-brd);border-radius:10px;color:var(--ll-txt);font-size:14px;outline:none}
.ll-catsearch input:focus{border-color:var(--ll-ind)}
.ll-voices{max-height:150px;overflow-y:auto;margin:0 8px}
.ll-voice{width:100%;text-align:left;padding:8px 10px;border-radius:10px;font-size:13px;color:var(--ll-txt2);transition:all .12s}
.ll-voice:hover{background:var(--ll-bg3)}
.ll-voice.ll-cur{background:rgba(99,102,241,.25);color:#c7d2fe}
.ll-voice small{margin-left:6px;color:var(--ll-txt3)}
.ll-catsliders{padding:12px 16px 16px;display:flex;flex-direction:column;gap:12px}
.ll-catsliders label{font-size:13px;color:var(--ll-txt2);display:flex;justify-content:space-between;margin-bottom:4px}
.ll-catsliders input[type=range]{width:100%;accent-color:var(--ll-ind)}
.ll-mutebig{width:calc(100% - 28px);margin:8px 14px 0;padding:11px;border-radius:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px}

/* ── Dropdowns (background / ambient) ───────────────────── */
.ll-dd{position:relative}
.ll-ddmenu{position:absolute;top:calc(100% + 8px);right:0;width:280px;background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.5);overflow:hidden;z-index:50}
.ll-ddmenu h4{padding:13px 16px;font-size:15px;font-weight:800;border-bottom:1px solid var(--ll-brd)}
.ll-ddgrid{padding:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:300px;overflow-y:auto}
.ll-ddcell{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px;border-radius:10px;transition:all .12s}
.ll-ddcell:hover{background:var(--ll-bg3)}
.ll-ddcell.ll-cur{background:rgba(99,102,241,.25);box-shadow:0 0 0 2px var(--ll-ind)}
.ll-ddcell .ll-thumb{width:100%;height:46px;border-radius:8px;overflow:hidden;background:var(--ll-bg3);display:flex;align-items:center;justify-content:center;font-size:20px}
.ll-ddcell .ll-thumb img{width:100%;height:100%;object-fit:cover}
.ll-ddcell span{font-size:11px;color:var(--ll-txt2);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%}
.ll-ddlist{padding:6px}
.ll-ddrow{width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;font-size:14px;color:var(--ll-txt2);text-align:left}
.ll-ddrow:hover{background:var(--ll-bg3)}
.ll-ddrow.ll-cur{background:rgba(99,102,241,.25);color:#c7d2fe}
.ll-ddrow .ll-eq{font-size:20px}
.ll-volrow{display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid var(--ll-brd)}
.ll-volrow input{flex:1;accent-color:var(--ll-ind)}

/* ── AI panel modal ─────────────────────────────────────── */
.ll-modal{position:fixed;inset:0;background:rgba(2,6,23,.7);display:flex;align-items:center;justify-content:center;z-index:80;padding:20px}
.ll-modalbox{width:min(760px,100%);max-height:88vh;overflow-y:auto;background:var(--ll-bg2);border:1px solid var(--ll-brd);border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.6)}
.ll-modaltabs{display:flex;border-bottom:1px solid var(--ll-brd)}
.ll-modaltab{flex:1;padding:14px;font-size:15px;font-weight:600;color:var(--ll-txt2);border-bottom:3px solid transparent}
.ll-modaltab.ll-on{color:var(--ll-ind2);border-bottom-color:var(--ll-ind)}
.ll-modalbody{padding:20px}
.ll-field{margin-bottom:14px}
.ll-field label{display:block;font-size:13px;font-weight:600;color:var(--ll-txt2);margin-bottom:6px}
.ll-field input,.ll-field select,.ll-field textarea{width:100%;padding:10px 12px;background:var(--ll-bg3);border:1px solid var(--ll-brd);border-radius:10px;color:var(--ll-txt);font-size:14px;outline:none}
.ll-field textarea{min-height:90px;resize:vertical;font-family:inherit}
.ll-actsgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;max-height:200px;overflow-y:auto;padding:6px;border:1px solid var(--ll-brd);border-radius:10px}
.ll-actsgrid label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ll-txt2);padding:6px 8px;border-radius:8px;cursor:pointer}
.ll-actsgrid label:hover{background:var(--ll-bg3)}
.ll-promptbox{background:rgba(2,6,23,.6);border-radius:12px;padding:14px;font-size:13px;color:var(--ll-txt2);white-space:pre-wrap;max-height:320px;overflow-y:auto;line-height:1.6}
.ll-jsonerr{background:rgba(239,68,68,.15);border:1px solid rgba(248,113,113,.4);color:#fca5a5;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:10px}

/* ── Toast / confetti ───────────────────────────────────── */
.ll-toast{position:fixed;bottom:130px;left:50%;transform:translateX(-50%);background:var(--ll-bg3);border:1px solid var(--ll-brd);color:var(--ll-txt);padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.4);z-index:90;animation:lltoast 2.4s forwards}
@keyframes lltoast{0%{opacity:0;transform:translateX(-50%) translateY(16px)}12%{opacity:1;transform:translateX(-50%) translateY(0)}85%{opacity:1}100%{opacity:0}}
.ll-confetti{position:fixed;width:10px;height:10px;top:-12px;z-index:95;border-radius:2px;pointer-events:none;animation:llfall linear forwards}
@keyframes llfall{to{transform:translateY(105vh) rotate(720deg)}}
.ll-hidden{display:none!important}

/* ── audio-discussion ───────────────────────────────────── */
.ll-aud{border:1px solid var(--ll-brd);border-radius:14px;padding:14px;margin-bottom:12px;background:var(--ll-bg2)}
.ll-aud.ll-audrec{border-color:#10b981;box-shadow:0 0 18px rgba(16,185,129,.15)}
.ll-audq{display:flex;gap:12px;align-items:flex-start;cursor:pointer}
.ll-audico{font-size:24px;flex-shrink:0}
.ll-audlang{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ll-audlang span{font-size:12px;padding:3px 10px;border-radius:999px;background:rgba(99,102,241,.15);color:var(--ll-ind2);border:1px solid rgba(99,102,241,.3)}
.ll-audctl{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}
.ll-audlen{font-size:13px;color:var(--ll-txt2);font-weight:600}
.ll-audtx{font-size:12px;color:#10b981;background:rgba(16,185,129,.1);padding:3px 10px;border-radius:8px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ll-audwave{display:flex;gap:4px;align-items:flex-end;height:26px;margin-top:10px}
.ll-audwave span{width:5px;border-radius:3px;background:#10b981;animation:llwave 1s ease-in-out infinite}
.ll-audwave span:nth-child(1){height:40%;animation-delay:0s}
.ll-audwave span:nth-child(2){height:80%;animation-delay:.15s}
.ll-audwave span:nth-child(3){height:55%;animation-delay:.3s}
.ll-audwave span:nth-child(4){height:95%;animation-delay:.45s}
.ll-audwave span:nth-child(5){height:65%;animation-delay:.6s}
@keyframes llwave{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}
.ll-audsamp{margin-top:14px}
.ll-btn.ll-stop{background:#ef4444;color:#fff;border-color:#ef4444;animation:llpulse 1.2s infinite}
@keyframes llpulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}

/* ── team-quiz ──────────────────────────────────────────── */
.ll-tqhead{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.ll-tqnum{font-size:13px;font-weight:800;padding:5px 12px;border-radius:999px;background:rgba(99,102,241,.18);color:var(--ll-ind2)}
.ll-tqtimer{font-size:14px;font-weight:800;padding:5px 12px;border-radius:999px;background:rgba(245,158,11,.15);color:var(--ll-yl2);min-width:74px;text-align:center}
.ll-tqtimer.ll-tqhot{background:rgba(239,68,68,.2);color:#f87171;animation:llpulse2 1s infinite}
@keyframes llpulse2{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.ll-tqscore{font-size:14px;font-weight:800;padding:5px 12px;border-radius:999px;background:rgba(16,185,129,.15);color:var(--ll-em2);margin-left:auto}
.ll-tqdone{text-align:center;padding:26px 16px}
.ll-tqemoji{font-size:56px;display:block;margin-bottom:10px}
.ll-tqboard{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px}
.ll-tqcell{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;border:1px solid var(--ll-brd)}
.ll-tqok{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.4)!important}
.ll-tqno{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.4)!important}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width:1024px){
  .ll-side{position:fixed;left:0;top:0;bottom:0;z-index:40;transform:translateX(-100%);transition:transform .25s;box-shadow:0 0 40px rgba(0,0,0,.4)}
  .ll-side.ll-open{transform:translateX(0)}
  .ll-sidetoggle{display:inline-flex!important}
  .ll-main{padding-left:0}
  .ll-wyrgrid{grid-template-columns:1fr}
  .ll-stdgrid{grid-template-columns:1fr}
  .ll-memgrid{grid-template-columns:repeat(3,1fr)}
  .ll-title{font-size:23px}
}
@media (max-width:640px){
  .ll-wrap{padding:14px 12px}
  .ll-header{padding:8px 10px;gap:6px}
  .ll-hbtn{padding:8px 10px;font-size:13px;border-radius:10px}
  .ll-hbtn .ll-ico{font-size:15px}
  .ll-footer{padding:12px 14px}
  .ll-navbtn{padding:10px 14px;font-size:15px}
  .ll-card{padding:14px 12px;border-radius:14px}
  .ll-memgrid{grid-template-columns:repeat(2,1fr)}
  .ll-catpanel{width:290px;right:-40px}
  /* keep ALL text inside its box on small screens */
  .ll-title{font-size:20px;word-break:break-word;overflow-wrap:anywhere;line-height:1.25}
  .ll-card,.ll-sinst,.ll-tnotes,.ll-ccq,.ll-spk,.ll-lang,.ll-aud,.ll-timer{max-width:100%;min-width:0;overflow-wrap:anywhere}
  .ll-card p,.ll-card li,.ll-card small,.ll-item p,.ll-vchip span,.ll-gbox b,.ll-gbox i,.ll-ssbox p{overflow-wrap:anywhere;word-break:break-word}
  .ll-btnrow{flex-direction:column;gap:8px}
  .ll-btnrow .ll-btn{width:100%;justify-content:center}
  .ll-timer{position:static;margin-bottom:10px}
  .ll-vwrap{grid-template-columns:1fr!important}
  .ll-audctl .ll-btn{flex:1;min-width:0}
  .ll-audtx{max-width:100%;white-space:normal}
  .ll-tqhead{gap:8px}
  .ll-tqscore{margin-left:0}
  .ll-ddmenu{position:fixed;left:10px;right:10px;top:56px;width:auto;max-height:70vh;overflow-y:auto}
  .ll-ddgrid{grid-template-columns:repeat(2,1fr)!important}
  .ll-stats{gap:8px}
  .ll-stat{padding:8px;min-width:0}
  .ll-stat b{font-size:15px}
  .ll-profname{font-size:14px}
  .ll-search input{font-size:14px}
}`;
