/**
 * Gamified Challenge — standalone CSS (faithful port of the Gamified-Challnege
 * React app's index.css + component inline styles, minus Tailwind utilities —
 * every layout/style below is hand-written to reproduce the same look).
 */
export const GAMIFIED_HTML_CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;width:100%;min-height:100vh;background:#0a0a0a;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:#111}
::-webkit-scrollbar-thumb{background:#8b0000;border-radius:4px}
button{font-family:inherit}

@keyframes shake{0%,100%{transform:translateX(0)}10%{transform:translateX(-10px) translateY(5px)}20%{transform:translateX(10px) translateY(-5px)}30%{transform:translateX(-10px) translateY(3px)}40%{transform:translateX(10px) translateY(-3px)}50%{transform:translateX(-5px) translateY(5px)}60%{transform:translateX(5px) translateY(-5px)}70%{transform:translateX(-5px)}80%{transform:translateX(5px)}90%{transform:translateX(-3px)}}
@keyframes bloodDrip{0%{transform:translateY(-100%);opacity:0}20%{opacity:1}100%{transform:translateY(100vh);opacity:.3}}
@keyframes heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.3)}30%{transform:scale(1)}45%{transform:scale(1.2)}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 20px rgba(139,0,0,.5)}50%{box-shadow:0 0 60px rgba(220,20,60,.8),0 0 100px rgba(139,0,0,.4)}}
@keyframes float{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-20px) rotateY(180deg)}}
@keyframes float-slow{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
@keyframes flicker{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes glitch{0%,100%{transform:translate(0);filter:none}20%{transform:translate(-2px,2px);filter:hue-rotate(90deg)}40%{transform:translate(2px,-2px);filter:hue-rotate(180deg)}60%{transform:translate(-1px,1px);filter:hue-rotate(270deg)}80%{transform:translate(1px,-1px);filter:hue-rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes rotateArtifact{from{transform:rotateY(0deg)}to{transform:rotateY(360deg)}}
@keyframes ember{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-100vh) scale(0);opacity:0}}
@keyframes fogDrift{0%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(0) translateY(-20px)}100%{transform:translateX(50%) translateY(0)}}
@keyframes splashPulse{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.05);filter:brightness(1.3)}}

.animate-shake{animation:shake .6s ease-in-out}
.animate-heartbeat{animation:heartbeat 1s ease-in-out infinite}
.animate-pulse-glow{animation:pulse-glow 2s ease-in-out infinite}
.animate-float{animation:float 6s ease-in-out infinite}
.animate-float-slow{animation:float-slow 4s ease-in-out infinite}
.animate-flicker{animation:flicker .1s infinite}
.animate-glitch{animation:glitch .3s infinite}
.animate-fadeIn{animation:fadeIn .8s ease-out forwards}
.animate-rotate{animation:rotateArtifact 4s linear infinite}
.animate-splash{animation:splashPulse 3s ease-in-out infinite}

.blood-overlay{position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:9999;background:linear-gradient(180deg,rgba(139,0,0,.8) 0%,transparent 30%),linear-gradient(0deg,rgba(139,0,0,.6) 0%,transparent 20%);animation:shake .5s ease-in-out}
.fog-layer{position:fixed;bottom:0;left:-50%;width:200%;height:200px;background:radial-gradient(ellipse,rgba(100,100,100,.15) 0%,transparent 70%);animation:fogDrift 15s ease-in-out infinite;pointer-events:none;z-index:1}
.ember-particle{position:fixed;bottom:-10px;width:4px;height:4px;background:#ff4400;border-radius:50%;animation:ember 4s ease-out infinite;pointer-events:none;z-index:1}
.perspective-3d{perspective:1200px;transform-style:preserve-3d}
.card-3d{transform-style:preserve-3d;transition:transform .6s cubic-bezier(.175,.885,.32,1.275)}
.card-3d:hover{transform:rotateY(5deg) rotateX(-5deg) scale(1.02)}
.text-shadow-blood{text-shadow:0 0 20px rgba(139,0,0,.8),0 0 40px rgba(220,20,60,.4)}
.text-shadow-glow{text-shadow:0 0 10px rgba(255,215,0,.8),0 0 30px rgba(255,215,0,.4)}
.bg-dark-gradient{background:linear-gradient(135deg,#0a0a0a 0%,#1a0000 50%,#0a0a0a 100%)}
.border-blood-glow{border:1px solid rgba(139,0,0,.5);box-shadow:0 0 15px rgba(139,0,0,.3),inset 0 0 15px rgba(139,0,0,.1)}
.fear-border{position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:100;border:4px solid transparent;transition:border-color 1s,box-shadow 1s}
.fear-border.active{border-color:rgba(139,0,0,.6);box-shadow:inset 0 0 100px rgba(139,0,0,.3)}

/* app shell */
.app{min-height:100vh;position:relative;background:#0a0a0a}
.bg-layer{position:fixed;inset:0;z-index:0}
.bg-layer img{width:100%;height:100%;object-fit:cover;opacity:.2}
.bg-layer .shade{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(10,0,0,.7),rgba(0,0,0,.95))}
.content{position:relative;z-index:10;max-width:1152px;margin:0 auto;padding:16px 16px 80px}

/* header */
.topbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}
.topbar-left{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;border:none;cursor:pointer;transition:background .2s}
.btn.dark{background:#1f2937;color:#fff;border:1px solid #4b5563}
.btn.dark:hover{background:#374151}
.btn.red{background:#7f1d1d;color:#fff}
.btn.red:hover{background:#991b1b}
.bigbtn{font-size:18px;font-weight:700;padding:8px 16px;border-radius:8px;border:1px solid #4b5563;background:#1f2937;color:#fff;cursor:pointer}
.bigbtn:hover{background:#374151}
.iconbtn{font-size:30px;cursor:pointer;background:none;border:none;line-height:1}
.iconbtn:hover{transform:scale(1.1)}
.learner-chip{display:flex;align-items:center;gap:12px}
.learner-chip .photo{font-size:36px}
.learner-chip .name{font-size:20px;font-weight:700;color:#fff}
.stats{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
.stat{font-size:20px;font-weight:700}
.stat.yellow{color:#facc15}
.stat.purple{color:#c084fc}
.stat.blue{color:#60a5fa}
.stat.green{color:#4ade80}

/* theme title */
.theme-title{text-align:center;margin-bottom:24px}
.theme-title h1{font-family:'Creepster',cursive;font-size:clamp(2rem,6vw,4rem);color:#dc143c;text-shadow:0 0 20px rgba(139,0,0,.6);margin:0}
.theme-title p{color:#9ca3af;font-size:18px;margin:4px auto 0;max-width:672px}

/* fear meter */
.fearmeter{max-width:512px;margin:0 auto 24px}
.fearmeter .row{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.fearmeter .lbl{font-size:18px;font-weight:700}
.fearmeter .track{height:20px;background:#111827;border-radius:9999px;overflow:hidden;border:1px solid #374151}
.fearmeter .fill{height:100%;border-radius:9999px;transition:width .5s}

/* artifact */
.artifact-float{display:flex;justify-content:center;margin-bottom:32px}
.artifact-float .a{font-size:8rem;filter:drop-shadow(0 0 30px #00ff88);transition:filter 1s}

/* day grid */
.days-grid{display:grid;grid-template-columns:1fr;gap:20px}
@media(min-width:640px){.days-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.days-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:1280px){.days-grid{grid-template-columns:repeat(4,1fr)}}
.day-card{display:block;width:100%;text-align:left;border-radius:16px;overflow:hidden;cursor:pointer;border:2px solid rgba(139,0,0,.5);background:rgba(20,0,0,.9);transition:transform .3s;position:relative}
.day-card.locked{opacity:.6;filter:grayscale(1);border-color:rgba(50,50,50,.5)}
.day-card.completed{border-color:#00ff88;box-shadow:0 0 20px rgba(0,255,136,.3)}
.day-card.accessible:hover{transform:scale(1.05)}
.day-card .thumb{position:relative;height:112px;overflow:hidden}
.day-card .thumb img{width:100%;height:100%;object-fit:cover;opacity:.4;transition:opacity .3s}
.day-card:hover .thumb img{opacity:.6}
.day-card .thumb .grad{position:absolute;inset:0;background:linear-gradient(to top,#000,transparent)}
.day-card .thumb .lock{position:absolute;top:8px;right:8px;font-size:30px}
.day-card .thumb .art{position:absolute;bottom:8px;left:12px;font-size:36px}
.day-card .body{padding:16px}
.day-card .dayno{font-size:12px;color:#ef4444;font-weight:700;margin-bottom:4px;font-family:'Orbitron'}
.day-card h3{font-size:18px;font-weight:700;color:#fff;margin:0 0 4px;font-family:'Creepster',cursive}
.day-card .sub{font-size:14px;color:#6b7280;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.day-card .meta{display:flex;align-items:center;gap:8px;font-size:12px;color:#4b5563}

/* toast */
.toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%);padding:16px 32px;border-radius:12px;font-size:24px;font-weight:700;z-index:50;animation:fadeIn .4s ease-out;color:#fff;box-shadow:0 0 30px rgba(0,0,0,.5)}
.toast.bad{background:rgba(139,0,0,.9)}
.toast.good{background:rgba(0,100,0,.9)}

/* code modal */
.modal-back{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.9)}
.modal-box{max-width:448px;width:100%;padding:32px;border-radius:16px;background:rgba(20,0,0,.95);border:1px solid rgba(139,0,0,.5);box-shadow:0 0 15px rgba(139,0,0,.3);animation:fadeIn .4s ease-out}
.modal-box .big{text-align:center;font-size:60px;margin-bottom:16px;animation:float-slow 3s ease-in-out infinite}
.modal-box h2{text-align:center;font-size:24px;font-weight:700;color:#f87171;margin:0 0 8px;font-family:'Creepster',cursive}
.modal-box .hint{text-align:center;color:#9ca3af;font-size:18px;margin:0 0 16px}
.modal-box input{width:100%;padding:16px 24px;border-radius:12px;background:#111827;border:2px solid #7f1d1d;color:#fff;font-size:24px;text-align:center;letter-spacing:4px;outline:none;font-family:'Orbitron';margin-bottom:16px}
.modal-box input:focus{border-color:#ef4444}
.modal-actions{display:flex;gap:12px}
.modal-actions button{flex:1;padding:12px;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;border:none}
.modal-actions .cancel{background:#1f2937;color:#fff}
.modal-actions .cancel:hover{background:#374151}
.modal-actions .unlock{background:linear-gradient(135deg,#8b0000,#dc143c);color:#fff}

/* jumpscare */
.jumpscare{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,.85);animation:shake .3s ease-in-out}
.jumpscare .face{font-size:25rem;filter:drop-shadow(0 0 50px rgba(255,0,0,1));animation:splashPulse 3s ease-in-out infinite;line-height:1}

/* DAY VIEW */
.day-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px}
.day-head-center{text-align:center;flex:1}
.day-head-center .dayno{font-size:14px;color:#ef4444;font-weight:700;font-family:'Orbitron'}
.day-head-center h1{font-size:24px;font-weight:700;color:#fff;margin:0;font-family:'Creepster',cursive}
.day-head-right{display:flex;align-items:center;gap:12px}
.day-art{display:flex;justify-content:center;margin-bottom:12px}
.day-art .a{font-size:12rem;line-height:1;filter:drop-shadow(0 0 15px #00ff88)}
.narrator-box{margin-bottom:16px;padding:16px;border-radius:12px;background:rgba(20,0,0,.9);border:1px solid rgba(139,0,0,.5);box-shadow:0 0 15px rgba(139,0,0,.3),inset 0 0 15px rgba(139,0,0,.1)}
.narrator-box .row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.narrator-box .lbl{font-size:18px;font-weight:700;color:#f87171}
.narrator-box p{color:#d1d5db;font-size:16px;line-height:1.6;font-style:italic;margin:0}
.tabs{display:flex;overflow-x:auto;gap:4px;margin-bottom:16px;padding-bottom:8px}
.tab{padding:8px 16px;border-radius:8px;font-size:14px;font-weight:700;white-space:nowrap;cursor:pointer;border:1px solid rgba(50,50,50,.5);background:#111827;color:#9ca3af;transition:all .2s}
.tab:hover{background:#1f2937}
.tab.active{background:#7f1d1d;color:#fff;transform:scale(1.05);border-color:rgba(220,20,60,.5)}
.panel{padding:20px;border-radius:12px;background:rgba(15,0,0,.9);border:1px solid rgba(139,0,0,.5);box-shadow:0 0 15px rgba(139,0,0,.3),inset 0 0 15px rgba(139,0,0,.1);animation:fadeIn .8s ease-out forwards}

/* lesson tab */
.lesson-title{font-size:36px;font-weight:700;color:#f87171;margin:0 0 24px;font-family:'Creepster',cursive}
.lesson-intro{color:#d1d5db;margin:0 0 32px;font-size:20px;line-height:1.6}
.sec-block{margin-bottom:32px;padding:24px;border-radius:16px;background:rgba(30,30,30,.5);border:1px solid rgba(50,50,50,.3)}
.sec-block.warning{background:rgba(139,0,0,.2);border-color:rgba(220,20,60,.5)}
.sec-block.dialogue{background:rgba(100,0,100,.15);border-color:rgba(50,50,50,.3)}
.sec-block .row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.sec-block h3{font-size:28px;font-weight:700;color:#fff;margin:0}
.sec-block .text{color:#d1d5db;white-space:pre-wrap;font-size:20px;line-height:1.6}
.dline{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
.dline .who{font-weight:700;color:#f87171;min-width:120px}
.dline .what{flex:1}
.dline .play{opacity:0;transition:opacity .2s;font-size:20px;cursor:pointer;background:none;border:none}
.dline:hover .play{opacity:1}
.charvoice{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.charvoice .nm{font-size:20px;color:#9ca3af}
.charvoice select{max-width:250px;padding:8px 12px;background:#111827;border:1px solid #374151;color:#fff;font-size:18px;border-radius:8px;cursor:pointer}

/* vocab */
.vocab-grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:768px){.vocab-grid{grid-template-columns:repeat(2,1fr)}}
.vocab-card{cursor:pointer;padding:16px;border-radius:12px;background:rgba(30,0,0,.5);border:1px solid rgba(139,0,0,.3);transition:all .2s}
.vocab-card:hover{transform:scale(1.05)}
.vocab-card.flipped{background:rgba(0,100,0,.2)}
.vocab-card .row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.vocab-card .word{font-size:20px;font-weight:700;color:#fff}
.vocab-card .pos{font-size:12px;padding:4px 8px;background:#7f1d1d;border-radius:4px;color:#fca5a5}
.vocab-card .speak{font-size:18px;cursor:pointer;background:none;border:none}
.vocab-card .flip{color:#d1d5db;margin-bottom:4px}
.vocab-card .ex{color:#9ca3af;font-style:italic;margin-bottom:4px}
.vocab-card .hear{font-size:14px;color:#f87171;cursor:pointer;background:none;border:none}

/* grammar */
.gram-block{margin-bottom:24px;padding:16px;border-radius:12px;background:rgba(30,0,0,.5);border:1px solid rgba(139,0,0,.3)}
.gram-block h3{font-size:20px;font-weight:700;color:#fff;margin:0 0 8px}
.gram-block .exp{color:#d1d5db;margin:0 0 12px}
.gram-examples{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.gram-examples span{padding:4px 12px;background:#1f2937;border-radius:4px;color:#d1d5db;font-size:14px}
.ex-block{margin-top:12px;padding:12px;border-radius:8px;background:rgba(20,20,20,.5)}
.ex-block.ok{background:rgba(0,100,0,.2)}
.ex-block.bad{background:rgba(100,0,0,.2)}
.ex-block p{color:#d1d5db;margin:0 0 8px}
.ex-opts{display:flex;flex-wrap:wrap;gap:8px}
.ex-opt{padding:8px 16px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;background:#1f2937;color:#d1d5db;border:none;transition:all .2s}
.ex-opt:hover{background:#374151}
.ex-opt.right{background:#166534;color:#fff}
.ex-opt.wrongpick{background:#991b1b;color:#fff}
.ex-inrow{display:flex;gap:8px}
.ex-inrow input{flex:1;padding:8px 12px;background:#111827;border:1px solid #374151;color:#fff;border-radius:8px;font-size:16px}
.ex-check{background:#7f1d1d;color:#fff;border:none;border-radius:8px;font-weight:700;padding:8px 16px;cursor:pointer}
.ex-feedback{margin-top:4px;font-size:14px}
.ex-feedback.good{color:#4ade80}
.ex-feedback.bad{color:#f87171}

/* reading */
.reading-text{padding:20px;border-radius:12px;margin-bottom:16px;background:rgba(20,20,20,.8);border:1px solid rgba(50,50,50,.5);line-height:2.2}
.rword{display:inline;cursor:pointer;font-size:1.15rem;color:#e5e7eb}
.rword:hover{background:#374151;border-radius:4px;padding:0 2px}
.rword.found{text-decoration:line-through;color:#4ade80}
.q-block{margin-bottom:16px;padding:12px;border-radius:8px;background:rgba(20,20,20,.5)}
.q-block .q{color:#d1d5db;margin:0 0 8px;font-weight:700}
.q-opts{display:flex;flex-wrap:wrap;gap:8px}
.q-opt{padding:8px 16px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;background:#1f2937;color:#d1d5db;border:none;transition:all .2s}
.q-opt:hover{background:#374151}
.q-opt.right{background:#166534;color:#fff}
.q-opt.wrongpick{background:#991b1b;color:#fff}
.q-exp{margin-top:4px;font-size:14px;color:#9ca3af}

/* listening */
.listen-block{margin-bottom:20px;padding:16px;border-radius:12px;background:rgba(30,0,0,.5);border:1px solid rgba(139,0,0,.3)}
.listen-block .row{display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.listen-block .hint{color:#6b7280;font-size:14px}
.listen-inrow{display:flex;gap:8px}
.listen-inrow input{flex:1;padding:12px 16px;background:#111827;border:1px solid #374151;color:#fff;border-radius:8px;font-size:18px}
.listen-check{background:#7f1d1d;color:#fff;border:none;border-radius:8px;font-weight:700;padding:12px 24px;font-size:18px;cursor:pointer}
.listen-fb{margin-top:8px;font-size:16px;font-weight:700}
.listen-fb.good{color:#4ade80}
.listen-fb.bad{color:#f87171}

/* dialogue tab */
.dlg-scenario{color:#9ca3af;margin:0 0 24px;font-size:20px}
.dlg-box{padding:24px;border-radius:16px;margin-bottom:24px;background:rgba(30,0,30,.5);border:1px solid rgba(139,0,0,.3)}
.dlg-narr{color:#9ca3af;font-style:italic;margin:0 0 16px;font-size:20px;display:flex;align-items:center;gap:8px}
.dlg-q{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.dlg-q .who{color:#f87171;font-weight:700;font-size:20px}
.dlg-q .play{font-size:20px;cursor:pointer;background:none;border:none}
.dlg-question{color:#fff;font-size:30px;margin:0 0 24px;line-height:1.5}
.dlg-opts{display:flex;flex-direction:column;gap:16px}
.dlg-opt{width:100%;text-align:left;padding:20px 24px;border-radius:16px;font-size:20px;cursor:pointer;background:rgba(40,0,0,.8);border:1px solid rgba(139,0,0,.3);color:#e5e7eb;transition:all .2s}
.dlg-opt:hover{transform:scale(1.02)}
.dlg-result{padding:24px;border-radius:16px;margin-bottom:16px;animation:fadeIn .6s ease-out}
.dlg-result.survive{background:rgba(0,100,0,.2)}
.dlg-result.die{background:rgba(139,0,0,.3)}
.dlg-result.neutral{background:rgba(100,100,0,.2)}
.dlg-result h3{font-size:28px;font-weight:700;margin:0 0 12px}
.dlg-result p{color:#fff;font-size:20px;line-height:1.6;margin:0}
.dlg-next{background:#7f1d1d;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:20px;padding:16px 32px;cursor:pointer;transition:background .2s}
.dlg-next:hover{background:#991b1b}

/* speaking */
.speak-words{padding:20px;border-radius:12px;margin-bottom:16px;background:rgba(20,20,20,.8);border:1px solid rgba(50,50,50,.5)}
.karaoke-word{display:inline-block;padding:2px 4px;margin:2px;border-radius:4px;transition:all .3s;font-size:1.5rem;color:#e5e7eb}
.karaoke-word.done{color:#00ff88}
.karaoke-word.wrong{color:#ff0000}
.speak-row{display:flex;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap}
.mic-btn{padding:16px 32px;border-radius:12px;font-weight:700;font-size:20px;cursor:pointer;background:#7f1d1d;color:#fff;border:none}
.mic-btn.live{background:#dc2626;animation:heartbeat 1s ease-in-out infinite}
.listen-first{background:#1f2937;color:#fff;border:none;border-radius:12px;cursor:pointer;font-size:18px;padding:16px}
.speak-result{padding:16px;border-radius:12px;animation:fadeIn .6s ease-out}
.speak-result.good{background:rgba(0,100,0,.2)}
.speak-result.bad{background:rgba(100,0,0,.2)}
.speak-result .pct{font-size:24px;font-weight:700}
.speak-result .said{color:#9ca3af;font-size:14px;margin-top:4px}
.speak-result .clue{color:#4ade80;margin-top:8px;font-weight:700}
.speak-dots{display:flex;gap:8px;margin-top:16px}
.speak-dots button{width:32px;height:32px;border-radius:50%;font-size:14px;font-weight:700;cursor:pointer;border:none}
.speak-dots .cur{background:#dc2626;color:#fff}
.speak-dots .oth{background:#1f2937;color:#9ca3af}

/* writing */
.write-prompt{padding:16px;border-radius:12px;margin-bottom:16px;background:rgba(30,0,0,.5);border:1px solid rgba(139,0,0,.3)}
.write-prompt p{color:#d1d5db;font-size:18px;margin:0 0 8px}
.write-keys{color:#6b7280;font-size:14px}
.write-keys span{display:inline-block;margin:0 4px;padding:2px 8px;border-radius:4px;font-size:12px;background:#1f2937;color:#9ca3af}
.write-keys span.found{background:#14532d;color:#86efac}
.write-ta{width:100%;padding:12px 16px;background:#111827;border:1px solid #374151;color:#fff;border-radius:12px;font-size:16px;resize:vertical;margin-bottom:8px;font-family:inherit}
.write-count{font-size:14px;color:#6b7280;margin-bottom:12px}
.write-count.good{color:#4ade80}
.write-submit{width:100%;padding:12px;border-radius:12px;font-weight:700;font-size:18px;cursor:pointer;border:none;background:linear-gradient(135deg,#8b0000,#dc143c);color:#fff}
.write-submit:disabled{opacity:.3;cursor:default}
.write-done{padding:16px;border-radius:12px;background:rgba(0,50,0,.3);animation:fadeIn .6s ease-out}
.write-done .ok{color:#4ade80;font-weight:700;margin:0 0 8px}
.write-done .sample{color:#9ca3af;font-style:italic;font-size:14px;margin:0}

/* dictation */
.dict-block{margin-bottom:20px;padding:16px;border-radius:12px;background:rgba(30,0,0,.5);border:1px solid rgba(139,0,0,.3)}
.dict-block .play{margin-bottom:12px;padding:8px 16px;background:#7f1d1d;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:18px;cursor:pointer}
.dict-block textarea{width:100%;padding:8px 12px;background:#111827;border:1px solid #374151;color:#fff;border-radius:8px;font-size:16px;margin-bottom:8px;font-family:inherit}
.dict-fb{font-size:14px}
.dict-fb.good{color:#4ade80}
.dict-fb.bad{color:#f87171}

/* quiz */
.quiz-block{margin-bottom:20px;padding:16px;border-radius:12px;background:rgba(30,0,0,.5);border:1px solid rgba(139,0,0,.3)}
.quiz-block .q{color:#fff;font-weight:700;font-size:18px;margin:0 0 12px}
.quiz-opts{display:grid;grid-template-columns:1fr;gap:8px}
@media(min-width:640px){.quiz-opts{grid-template-columns:repeat(2,1fr)}}
.quiz-opt{padding:12px 16px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;text-align:left;background:#1f2937;color:#d1d5db;border:none;transition:all .2s}
.quiz-opt:hover{background:#374151}
.quiz-opt.right{background:#166534;color:#fff}
.quiz-opt.wrongpick{background:#991b1b;color:#fff}

/* boss */
.boss-hp{margin-bottom:16px}
.boss-hp .row{display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px}
.boss-hp .row span:first-child{color:#f87171;font-weight:700}
.boss-hp .track{height:16px;background:#111827;border-radius:9999px;overflow:hidden;border:1px solid #374151}
.boss-hp .fill{height:100%;background:linear-gradient(to right,#991b1b,#ef4444);border-radius:9999px;transition:width .5s}
.boss-art{display:flex;justify-content:center;margin-bottom:16px}
.boss-art .a{font-size:15rem;line-height:1;filter:drop-shadow(0 0 20px #00ff88)}
.boss-qrow{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.boss-qrow .idx{color:#9ca3af}
.boss-qrow .timer{font-size:24px;font-weight:700;color:#facc15;font-family:'Orbitron'}
.boss-qrow .timer.warn{color:#ef4444;animation:heartbeat 1s ease-in-out infinite}
.boss-q{padding:20px;border-radius:12px;margin-bottom:16px;background:rgba(30,0,0,.8);border:1px solid rgba(139,0,0,.5)}
.boss-q .q{color:#fff;font-size:20px;font-weight:700;margin:0 0 16px}
.boss-q .opts{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:640px){.boss-q .opts{grid-template-columns:repeat(2,1fr)}}
.boss-opt{padding:16px;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;background:#1f2937;color:#fff;border:none;transition:all .2s}
.boss-opt:hover{background:#7f1d1d;transform:scale(1.05)}
.boss-opt.right{background:#15803d;color:#fff;transform:scale(1.05)}
.boss-opt.dim{background:#1f2937;color:#6b7280}
.boss-end{text-align:center;padding:32px;border-radius:12px;animation:fadeIn .6s ease-out}
.boss-end.win{background:rgba(0,100,0,.3)}
.boss-end.lose{background:rgba(100,0,0,.3)}
.boss-end .big{font-size:60px;margin-bottom:16px}
.boss-end h3{font-size:30px;font-weight:700;margin:0 0 8px;font-family:'Creepster',cursive}
.boss-end p{color:#d1d5db;font-size:18px;margin:0}

/* clues */
.clues-grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:768px){.clues-grid{grid-template-columns:repeat(2,1fr)}}
.clues-col h3{font-size:18px;font-weight:700;color:#d1d5db;margin:0 0 8px}
.clue-item{width:100%;text-align:left;padding:12px 16px;border-radius:8px;margin-bottom:8px;cursor:pointer;font-size:16px;background:#1f2937;color:#d1d5db;border:none;transition:all .2s}
.clue-item:hover{background:#374151}
.clue-item.sel{background:#7f1d1d;color:#fff;transform:scale(1.05)}
.clue-item.matched{background:#14532d;color:#86efac;text-decoration:line-through}
.clues-win{margin-top:16px;padding:16px;border-radius:12px;text-align:center;background:rgba(0,100,0,.3);animation:fadeIn .6s ease-out}
.clues-win p{color:#4ade80;font-weight:700;font-size:20px;margin:0}

/* complete day */
.complete-btn{margin-top:24px;width:100%;padding:20px;border-radius:12px;font-weight:700;font-size:24px;cursor:pointer;background:linear-gradient(135deg,#006400,#008000);color:#fff;border:2px solid rgba(0,128,0,.5);animation:pulse-glow 2s ease-in-out infinite;font-family:'Orbitron'}

.mobilenav{display:none}
@media(max-width:768px){.artifact-float .a{font-size:5rem}.day-art .a{font-size:8rem}.jumpscare .face{font-size:15rem}.lesson-title{font-size:26px}.lesson-intro{font-size:17px}.sec-block .text{font-size:16px}.dlg-question{font-size:22px}}
`;