/**
 * Inline CSS for the standalone Flipbook Homework magazine HTML.
 * Mirrors the React magazine design (dark navy shell, gold accents, cream pages).
 */
export const FLIPBOOK_HTML_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:Inter,system-ui,sans-serif;background:radial-gradient(ellipse at 40% 40%,#1a3a5c 0%,#0d0d1a 70%);color:#1a1a1a;overflow:hidden}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#c9a84c;border-radius:2px}
.app{display:flex;flex-direction:column;height:100vh;overflow:hidden}
/* XP BAR */
.xpbar{display:flex;align-items:center;gap:12px;padding:8px 16px;background:linear-gradient(135deg,#0d0d1a,#1a3a5c);border-bottom:1px solid rgba(201,168,76,.3);flex-shrink:0}
.xpbar .brand{font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:14px;background:linear-gradient(135deg,#c9a84c,#f5d87a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;display:none}
.xpbar .lvl{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;background:linear-gradient(135deg,#c9a84c,#f5d87a);color:#0d0d1a;flex-shrink:0}
.xpbar .who{display:none}
.xpbar .who p{color:#fff;font-size:11px;line-height:1.1}
.xpbar .who span{color:rgba(255,255,255,.4);font-size:10px}
.xpbar .xpwrap{flex:1;min-width:0;display:flex;align-items:center;gap:8px}
.xpbar .xpwrap>span{color:rgba(255,255,255,.6);font-size:10px;flex-shrink:0}
.xpbar .track{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
.xpbar .fill{height:100%;width:0;background:linear-gradient(90deg,#f6d365,#fda085);border-radius:3px;transition:width .8s cubic-bezier(.34,1.56,.64,1)}
.xpbar .xptxt{color:#fde047;font-size:11px;font-weight:700;flex-shrink:0}
.xpbar .pgtrack{display:none;align-items:center;gap:6px}
.xpbar .pgtrack span{color:rgba(255,255,255,.4);font-size:10px}
.xpbar .pgfill{width:64px;height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
.xpbar .pgfill i{display:block;height:100%;width:0;background:linear-gradient(90deg,#c9a84c,#f5d87a)}
.xpbar .done{display:none;align-items:center;gap:4px;color:rgba(255,255,255,.6);font-size:10px}
.xpbar .snd{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;font-size:12px;cursor:pointer;flex-shrink:0}
/* CONTROLS */
.controls{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:rgba(0,0,0,.4);border-bottom:1px solid rgba(201,168,76,.1);flex-shrink:0;gap:8px}
.controls button{border:none;cursor:pointer;font-family:inherit}
.cbtn{padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;gap:5px}
.cbtn:hover{transform:scale(1.05)}
.navmid{display:flex;align-items:center;gap:6px}
.round{width:26px;height:26px;border-radius:50%;background:transparent;color:rgba(255,255,255,.6);font-size:18px;line-height:1}
.round:hover{background:rgba(255,255,255,.1);color:#fff}
.pageno{color:rgba(255,255,255,.5);font-size:11px;font-family:ui-monospace,monospace;padding:0 4px}
.gold{background:linear-gradient(135deg,#c9a84c,#f5d87a);color:#111;font-weight:700;border:none;border-radius:8px;padding:6px 12px;font-size:11px;display:flex;align-items:center;gap:5px;cursor:pointer}
.gold:hover{transform:scale(1.05)}
.narrpick{display:flex;align-items:center;gap:6px}
.narrpick select{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:4px 4px;font-size:11px;outline:none;max-width:130px}
.narrpick select option{color:#111}
@media(max-width:768px){.narrpick select:first-child{max-width:90px}}
/* STAGE */
.stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:8px 12px;position:relative}
/* Realistic two-page spread book */
.book{position:relative;filter:drop-shadow(0 30px 60px rgba(0,0,0,.8));perspective:2500px}
.slot{position:absolute;top:0;overflow:hidden}
.slot.l{border-radius:2px 0 0 2px;box-shadow:inset -22px 0 40px rgba(0,0,0,.22),-5px 0 16px rgba(0,0,0,.3)}
.slot.r{border-radius:0 2px 2px 0;box-shadow:inset 22px 0 40px rgba(0,0,0,.22),5px 0 16px rgba(0,0,0,.3)}
.spine{position:absolute;top:0;bottom:0;width:32px;z-index:5;background:linear-gradient(to right,rgba(0,0,0,.28),transparent 60%,rgba(0,0,0,.28));pointer-events:none}
.leaf{position:absolute;top:0;z-index:20;transform-style:preserve-3d}
.leaf .face,.leaf .faceb{position:absolute;inset:0;backface-visibility:hidden;overflow:hidden}
.leaf .faceb{transform:rotateY(180deg);background:linear-gradient(120deg,#fdfcf8,#f4efe3);box-shadow:inset 0 0 40px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;color:rgba(201,168,76,.4);font-family:'Playfair Display',Georgia,serif;font-size:40px}
.leaf.next{transform-origin:left center;animation:pageTurnNext .9s cubic-bezier(.33,.1,.18,1) forwards}
.leaf.prev{transform-origin:right center;animation:pageTurnPrev .9s cubic-bezier(.33,.1,.18,1) forwards}
.turnsh{position:absolute;top:0;bottom:0;z-index:15;pointer-events:none}
.turnsh.next{background:linear-gradient(to left,rgba(0,0,0,.45),transparent);animation:turnShadowNext .9s cubic-bezier(.33,.1,.18,1) forwards}
.turnsh.prev{background:linear-gradient(to right,rgba(0,0,0,.45),transparent);animation:turnShadowPrev .9s cubic-bezier(.33,.1,.18,1) forwards}
@keyframes pageTurnNext{0%{transform:rotateY(0);box-shadow:-6px 0 22px rgba(0,0,0,.5)}45%{box-shadow:-18px 0 46px rgba(0,0,0,.7)}100%{transform:rotateY(-180deg);box-shadow:8px 0 24px rgba(0,0,0,.45)}}
@keyframes pageTurnPrev{0%{transform:rotateY(0);box-shadow:6px 0 22px rgba(0,0,0,.5)}45%{box-shadow:18px 0 46px rgba(0,0,0,.7)}100%{transform:rotateY(180deg);box-shadow:-8px 0 24px rgba(0,0,0,.45)}}
@keyframes turnShadowNext{0%{transform:translateX(0);opacity:0}30%{opacity:1}100%{transform:translateX(-100%);opacity:0}}
@keyframes turnShadowPrev{0%{transform:translateX(0);opacity:0}30%{opacity:1}100%{transform:translateX(100%);opacity:0}}
@media(max-width:768px){.spine{display:none}}
.book .corner{position:absolute;bottom:0;width:40px;height:40px;z-index:20;cursor:pointer;opacity:.6;transition:opacity .2s}
.book .corner:hover{opacity:1}
.book .corner.l{left:0;background:linear-gradient(315deg,transparent 50%,rgba(201,168,76,.5) 50%)}
.book .corner.r{right:0;background:linear-gradient(135deg,transparent 50%,rgba(201,168,76,.5) 50%)}
.sidenav{width:38px;height:38px;border-radius:50%;background:transparent;border:none;color:rgba(255,255,255,.5);font-size:22px;cursor:pointer;flex-shrink:0}
.sidenav:hover{background:rgba(255,255,255,.1);color:#fff}
.mobilenav{display:none;justify-content:center;align-items:center;gap:24px;padding:6px 0;flex-shrink:0}
.mobilenav button{width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.1);color:#fff;font-size:20px;cursor:pointer}
.hint{text-align:center;padding:3px 0;flex-shrink:0}
.hint p{color:rgba(255,255,255,.2);font-size:11px}
/* PAGE CONTENT SHARED */
.scroller{flex:1;overflow-y:auto;padding:8px 16px;min-height:0;font-size:12px;line-height:1.75}
.maghead{font-family:'Playfair Display',Georgia,serif}
.dropcap::first-letter{font-family:'Playfair Display',Georgia,serif;font-size:3.5em;font-weight:900;float:left;line-height:.8;margin-right:.08em;margin-top:.05em;color:#c0392b}
.pullquote{font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;font-style:italic;color:#1a3a5c;border-top:3px solid #c9a84c;border-bottom:3px solid #c9a84c;padding:8px 12px;margin:10px 0;text-align:center;break-inside:avoid}
.section-rule{height:2px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);border:none;margin:10px 0}
.cols2{columns:2;column-gap:12px;column-rule:1px solid #e8dfc8}
.cols2 p{margin-bottom:8px;text-align:justify;hyphens:auto;break-inside:avoid}
.actcard{background:#fff;border:1px solid #e8dfc8;border-radius:6px;padding:10px;margin:8px 0;break-inside:avoid;box-shadow:0 2px 8px rgba(0,0,0,.06);font-size:12px}
.actcard h4{display:flex;align-items:flex-start;gap:6px;font-size:12px;color:#1f2937;margin-bottom:8px}
.actcard button{border:none;cursor:pointer;font-family:inherit}
.mcopt{display:block;width:100%;text-align:left;padding:7px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;margin-bottom:6px;cursor:pointer}
.mcopt:hover{border-color:#93c5fd;background:#eff6ff}
.mcopt.sel{border-color:#3b82f6;background:#eff6ff;color:#1d4ed8}
.mcopt.ok{border-color:#22c55e;background:#f0fdf4;color:#166534;font-weight:500}
.mcopt.bad{border-color:#ef4444;background:#fef2f2;color:#b91c1c}
.mcopt:disabled{opacity:.8;cursor:default}
.actbtn{background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;font-size:11px;font-weight:500;padding:6px 14px;border-radius:8px;margin-top:8px}
.actbtn.g{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
.actbtn.gr{background:linear-gradient(135deg,#10b981,#047857)}
.actbtn.o{background:linear-gradient(135deg,#f59e0b,#d97706)}
.actbtn.p{background:linear-gradient(135deg,#ec4899,#be185d)}
.actbtn.b{background:linear-gradient(135deg,#0ea5e9,#0369a1)}
/* DICTATION */
.dictbar{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1a3a5c,#2d5986);color:#fff;border-radius:8px;padding:6px 10px;font-size:11px;margin-bottom:8px}
.dictbar button{width:26px;height:26px;border-radius:50%;border:none;cursor:pointer;background:rgba(201,168,76,.8);color:#fff;font-size:11px;flex-shrink:0}
.dictbar button[data-live="1"]{background:#ef4444;animation:micpulse .8s ease-in-out infinite}
@keyframes micpulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}
.dictbar span{color:rgba(255,255,255,.85)}
.dictin{width:100%;border:2px solid #3b82f6;border-radius:8px;padding:6px 10px;font-size:12px;outline:none;font-family:inherit;color:#111827;margin-bottom:2px}
.dictin:disabled{border-color:#16a34a;background:#f9fafb}
.result{margin-top:6px;font-size:11px;font-weight:500}
.result.ok{color:#16a34a}
.result.no{color:#dc2626}
.gaprow{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-bottom:10px;font-size:12px;color:#374151}
.gaprow input{width:110px;text-align:center;border:none;border-bottom:2px solid #3b82f6;background:transparent;font-size:12px;padding:2px 6px;outline:none;color:inherit}
.gaprow input.ok{border-color:#16a34a;color:#16a34a}
.gaprow input.bad{border-color:#dc2626;color:#dc2626}
.hinttxt{color:#9ca3af;font-style:italic;font-size:11px}
.matchrow{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px}
.matchrow .l{flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 8px;color:#1e40af}
.matchrow .a{color:#9ca3af}
.matchrow select{flex:1;border:1px solid #d1d5db;border-radius:6px;padding:5px;font-size:11px;color:#374151;background:#fff}
.matchrow select.ok{border-color:#16a34a}
.matchrow select.bad{border-color:#dc2626}
.shortans{width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px;font-size:12px;resize:none;font-family:inherit;color:#374151}
.stars{display:flex;gap:2px}
.stars button{background:none;font-size:18px;color:#d1d5db;cursor:pointer;border:none}
.stars button.on{color:#f59e0b}
.dlg{display:flex;gap:6px;margin-bottom:6px}
.dlg.rev{flex-direction:row-reverse}
.dlg .av{width:20px;height:20px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;flex-shrink:0;margin-top:2px}
.dlg .bub{max-width:82%;border-radius:12px;padding:6px 8px}
.dlg .bub p.s{font-weight:900;font-size:9px;margin-bottom:2px}
.dlg .bub p.t{font-size:11px;color:#374151;line-height:1.5}
.dlg .bub p.e{font-style:italic;color:#9ca3af;font-size:10px;margin-top:2px}
.vocabcard{border:1px solid #e8dfc8;border-radius:8px;padding:8px;background:#fff;margin-bottom:6px;break-inside:avoid;cursor:pointer}
.vocabcard:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}
.vocabcard .w{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:12px;color:#111;display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
.vocabcard .w span{background:#f0f9ff;color:#0369a1;font-size:9px;padding:2px 6px;border-radius:4px;font-family:Inter,sans-serif}
.vocabcard .d{color:#6b7280;font-size:10px;line-height:1.4}
.vocabcard .e{color:#9ca3af;font-style:italic;font-size:9px;margin-top:3px;line-height:1.4}
.vocabcard .diff{display:inline-block;font-size:9px;font-weight:600;margin-top:4px;padding:2px 6px;border-radius:4px}
.vocabcard .diff.advanced{background:#fef2f2;color:#991b1b}
.vocabcard .diff.intermediate{background:#fef3c7;color:#92400e}
.vocabcard .diff.basic{background:#f0fdf4;color:#166534}
.vocabtip{position:absolute;z-index:60;background:#fff;border:2px solid #c9a84c;border-radius:12px;padding:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);width:210px;font-size:11px}
/* PODCAST */
.podbar{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1a3a5c,#2d5986);color:#fff;border-radius:8px;padding:8px 12px;font-size:11px;margin-bottom:10px;break-inside:avoid}
.podbar .wv{display:flex;align-items:flex-end;gap:2px;height:20px}
.podbar .wv i{width:2px;border-radius:2px;background:rgba(255,255,255,.7)}
.podbar .wv i.on{animation:wave .5s ease-in-out infinite alternate}
@keyframes wave{from{transform:scaleY(.5)}to{transform:scaleY(1.5)}}
.podbar .t{flex:1;min-width:0}
.podbar .t p:first-child{font-weight:500;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.podbar .t p:last-child{color:rgba(255,255,255,.5);font-size:10px}
.podbar button{width:26px;height:26px;border-radius:50%;border:none;cursor:pointer;font-size:11px}
.podbar .pp{background:rgba(201,168,76,.8);color:#fff}
.podbar .st{background:rgba(255,255,255,.15);color:#fff}
/* COVER */
.cover{position:relative;width:100%;height:100%;background:linear-gradient(160deg,#0a1628 0%,#1a3a5c 40%,#0d0d1a 100%);color:#fff;font-family:'Playfair Display',Georgia,serif;overflow:hidden;display:flex;flex-direction:column;padding:20px 24px}
.cover .goldbar{position:absolute;left:0;right:0;height:4px;background:linear-gradient(90deg,#c9a84c,#f5d87a,#c9a84c)}
.cover .goldbar.t{top:0}
.cover .goldbar.b{bottom:0}
.cover .goldbar.v{top:0;bottom:0;width:4px;height:auto;background:linear-gradient(180deg,#c9a84c,#f5d87a,#c9a84c)}
.cover .goldbar.vl{left:0}
.cover .goldbar.vr{right:0}
.cover .mast{border-bottom:2px solid rgba(201,168,76,.5);padding-bottom:12px;margin-bottom:12px;text-align:center}
.cover .mast .row{display:flex;justify-content:space-between;color:rgba(255,255,255,.5);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;font-family:Inter,sans-serif}
.cover .mast h1{font-size:clamp(34px,6vw,52px);font-weight:900;letter-spacing:-2px;line-height:1;background:linear-gradient(135deg,#c9a84c 0%,#f5d87a 40%,#c9a84c 80%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.cover .mast p{color:rgba(255,255,255,.6);font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:2px;font-family:Inter,sans-serif}
.cover .issue{display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,.4);margin-bottom:8px;font-family:Inter,sans-serif}
.cover .issue b{color:#c9a84c;font-weight:400}
.cover .hero{flex:1;min-height:0;position:relative;border-radius:8px;overflow:hidden;margin-bottom:12px;box-shadow:0 20px 60px rgba(0,0,0,.6),inset 0 0 0 2px rgba(201,168,76,.3)}
.cover .hero img,.cover .hero .ph{width:100%;height:100%;object-fit:cover;object-position:top}
.cover .hero .ph{display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#1a3a5c,#2d5986);font-size:56px}
.cover .hero .ph p{color:rgba(255,255,255,.6);font-size:12px;font-family:Inter,sans-serif}
.cover .hero .shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.8) 0%,transparent 50%)}
.cover .hero .cap{position:absolute;left:0;right:0;bottom:0;padding:10px 14px;display:flex;justify-content:space-between;align-items:flex-end}
.cover .hero .cap .nm{font-weight:900;font-size:16px;text-shadow:0 2px 8px rgba(0,0,0,.8)}
.cover .hero .cap .lv{color:rgba(255,255,255,.7);font-size:10px;font-family:Inter,sans-serif}
.cover .hero .cap .ex{font-size:10px;font-weight:700;background:#c9a84c;color:#0d0d1a;padding:4px 8px;border-radius:4px;font-family:Inter,sans-serif}
.cover .story{margin-bottom:10px}
.cover .story .mid{display:flex;align-items:center;gap:8px;margin-bottom:4px;color:#c9a84c;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:Inter,sans-serif}
.cover .story .mid i{flex:1;height:1px;background:#c9a84c}
.cover .story h2{font-size:clamp(13px,2.4vw,20px);text-align:center}
.cover .story p{color:rgba(255,255,255,.5);text-align:center;font-style:italic;font-size:10px;margin-top:2px;font-family:Merriweather,Georgia,serif}
.cover .bullets{border-top:1px solid rgba(201,168,76,.3);padding-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;font-family:Inter,sans-serif}
.cover .bullets span{color:rgba(255,255,255,.6);font-size:10px}
.cover .bullets b{color:#c9a84c;font-weight:400;margin-right:4px}
.cover .foot{display:flex;justify-content:space-between;color:rgba(255,255,255,.3);font-size:10px;margin-top:10px;font-family:Inter,sans-serif}
/* TOC */
.toc{width:100%;height:100%;background:#faf8f3;display:flex;flex-direction:column;position:relative}
.toc .hd{padding:16px 24px;border-bottom:2px solid #c9a84c}
.toc .hd .row{display:flex;justify-content:space-between;align-items:flex-start}
.toc .hd p{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;font-family:Inter,sans-serif}
.toc .hd h1{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:900;color:#111;line-height:1.1}
.toc .hd .bk{font-size:32px;opacity:.2}
.toc .hd .sub{font-style:italic;font-size:11px;color:#6b7280;margin-top:2px;font-family:Merriweather,Georgia,serif}
.toc .list{flex:1;overflow-y:auto;padding:12px 16px}
.toc .rowitem{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 12px;border-radius:8px;border:1px solid #f0e8d8;background:#fff;margin-bottom:6px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.04);font-family:inherit}
.toc .rowitem:hover{transform:scale(1.01)}
.toc .rowitem .ic{font-size:18px;flex-shrink:0}
.toc .rowitem .tt{flex:1;min-width:0}
.toc .rowitem .tt b{font-size:11px;color:#1f2937;font-family:'Playfair Display',Georgia,serif;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.toc .rowitem .tt span{font-size:10px;color:#9ca3af;text-transform:capitalize}
.toc .rowitem .pg{display:flex;align-items:center;gap:6px;flex-shrink:0}
.toc .rowitem .pg .n{color:#9ca3af;font-size:10px;font-family:ui-monospace,monospace}
.toc .rowitem .pg .cnt{background:#fef3c7;color:#92400e;font-size:9px;padding:2px 6px;border-radius:4px}
.toc .rowitem .pg .ar{color:#e5e7eb;font-size:10px}
.toc .ft{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;padding:8px 24px;border-top:1px solid #e8dfc8;background:#faf8f3;color:#9ca3af;font-size:10px;font-family:Inter,sans-serif}
/* SECTION PAGE */
.secpage{width:100%;height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden}
.secpage .acc{height:4px;flex-shrink:0}
.secpage .hd{flex-shrink:0;padding:6px 14px 8px;border-bottom:1px solid #e8dfc8}
.secpage .hd .row{display:flex;justify-content:space-between;align-items:center}
.secpage .hd .badge{color:#fff;font-weight:900;font-size:9px;letter-spacing:.05em;padding:3px 8px;border-radius:4px;font-family:Inter,sans-serif}
.secpage .hd .pg{font-family:ui-monospace,monospace;font-size:9px;color:#d1d5db}
.secpage .hd h2{font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:clamp(12px,1.8vw,15px);margin-top:3px;line-height:1.2}
.secpage .ft{flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:5px 14px;border-top:1px solid #e8dfc8;font-size:10px;color:#d1d5db;background:rgba(250,248,243,.95)}
.secpage .ft .m{font-family:'Playfair Display',Georgia,serif;font-style:italic}
.secpage .ft .cmp{color:#16a34a;font-size:9px}
.heroimg{border-radius:8px;overflow:hidden;margin-bottom:10px;position:relative;height:80px;box-shadow:0 4px 16px rgba(0,0,0,.15)}
.heroimg img{width:100%;height:100%;object-fit:cover}
.heroimg .tint{position:absolute;inset:0}
.heroimg .lbl{position:absolute;left:8px;bottom:4px;color:#fff;font-size:9px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,.8);font-family:Inter,sans-serif}
.complete-badge{position:absolute;top:8px;right:8px;z-index:20;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.3);animation:pop .5s cubic-bezier(.34,1.56,.64,1)}
@keyframes pop{from{transform:scale(0) rotate(-30deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
/* BACK COVER */
.backcover{width:100%;height:100%;background:linear-gradient(160deg,#0d0d1a 0%,#1a1a2e 50%,#2d1b69 100%);color:#fff;font-family:'Playfair Display',Georgia,serif;display:flex;flex-direction:column;padding:20px 24px;position:relative;overflow:hidden}
.backcover .goldbar{position:absolute;left:0;right:0;height:4px;background:linear-gradient(90deg,#c9a84c,#f5d87a,#c9a84c)}
.backcover .goldbar.t{top:0}
.backcover .goldbar.b{bottom:0}
.backcover .hd{text-align:center;margin-bottom:14px}
.backcover .hd h1{font-size:28px;font-weight:900;background:linear-gradient(135deg,#c9a84c,#f5d87a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.backcover .hd p{color:rgba(255,255,255,.4);font-size:10px;margin-top:2px;font-family:Inter,sans-serif}
.backcover .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;font-family:Inter,sans-serif}
.backcover .stats div{background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);border-radius:12px;padding:10px;text-align:center}
.backcover .stats .v{font-size:18px;font-weight:900;font-family:'Playfair Display',Georgia,serif}
.backcover .stats .l{font-size:10px;color:rgba(255,255,255,.4)}
.backcover .board{flex:1;min-height:0;background:rgba(255,255,255,.05);border:1px solid rgba(201,168,76,.2);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.backcover .board .hdr{display:flex;padding:8px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(201,168,76,.2);font-family:Inter,sans-serif}
.backcover .board .hdr span:nth-child(1){width:28px}
.backcover .board .hdr span:nth-child(2){flex:1}
.backcover .board .hdr span:nth-child(3){width:44px;text-align:right}
.backcover .board .hdr span:nth-child(4){width:28px;text-align:right}
.backcover .board .rows{flex:1;overflow-y:auto}
.backcover .board .r{display:flex;align-items:center;padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.05);font-family:Inter,sans-serif}
.backcover .board .r.me{background:rgba(201,168,76,.2)}
.backcover .board .r .rank{width:28px;font-size:11px;font-weight:700;color:rgba(255,255,255,.4)}
.backcover .board .r .nm{flex:1;display:flex;align-items:center;gap:6px;font-size:11px;color:#fff}
.backcover .board .r .nm .av{font-size:14px}
.backcover .board .r .nm .ct{color:rgba(255,255,255,.3);font-size:9px}
.backcover .board .r .xp{width:44px;text-align:right;font-size:11px;font-weight:700;color:#c9a84c}
.backcover .board .r .lv{width:28px;text-align:right;font-size:10px;color:rgba(255,255,255,.4)}
.backcover .rankline{text-align:center;font-family:Inter,sans-serif;color:rgba(255,255,255,.5);font-size:10px;margin-top:10px}
.backcover .rankline b{color:#c9a84c}
.backcover .brand{text-align:center;border-top:1px solid rgba(201,168,76,.3);margin-top:10px;padding-top:10px;font-family:Inter,sans-serif}
.backcover .brand p:first-child{font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:16px}
.backcover .brand p:first-child span{color:#c9a84c}
.backcover .brand p:last-child{color:rgba(255,255,255,.3);font-size:9px;margin-top:2px}
/* OVERLAYS */
.overlay{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:flex-start;justify-content:flex-start;padding:80px 16px 16px}
.overlay .panel{background:#faf8f3;border-radius:16px;max-height:calc(100vh - 100px);overflow:hidden;width:320px;box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column}
.context-menu{position:fixed;background:#fff;border:1px solid #e8dfc8;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.2);z-index:9500;min-width:190px;overflow:hidden;font-size:12px}
.context-menu .t{padding:8px 12px;font-weight:700;color:#6b7280;border-bottom:1px solid #eee;text-transform:uppercase;font-size:10px;letter-spacing:1px}
.context-menu button{display:block;width:100%;text-align:left;padding:9px 12px;border:none;background:#fff;cursor:pointer;font-family:inherit;color:#374151;font-size:12px}
.context-menu button:hover{background:#f0e8d8}
.dictmodal{position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px}
.dictmodal .box{background:#fff;border-radius:16px;width:100%;max-width:420px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.dictmodal .box .hd{background:linear-gradient(135deg,#1a3a5c,#2d5986);padding:14px 18px;display:flex;justify-content:space-between;align-items:center;color:#fff}
.dictmodal .box .hd h3{font-family:'Playfair Display',Georgia,serif;font-size:16px}
.dictmodal .box .hd button{background:none;border:none;color:rgba(255,255,255,.6);font-size:16px;cursor:pointer}
.dictmodal .box .bd{padding:18px;overflow-y:auto;font-size:13px}
.dictmodal .box .bd h2{font-family:'Playfair Display',Georgia,serif;font-size:22px;color:#111}
.dictmodal .box .bd .ph{color:#6b7280;font-size:12px;font-family:ui-monospace,monospace}
.dictmodal .box .bd .m{margin-bottom:14px}
.dictmodal .box .bd .pos{display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;padding:2px 8px;border-radius:4px;margin-bottom:6px}
.dictmodal .box .bd .def{color:#374151;margin-bottom:6px}
.dictmodal .box .bd .ex{color:#6b7280;font-style:italic;font-size:12px}
.dictmodal .box .bd .syn{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.dictmodal .box .bd .syn span{background:#e0f2fe;color:#0369a1;font-size:11px;padding:2px 8px;border-radius:10px}
.cat{position:fixed;bottom:14px;right:14px;z-index:500;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#1a3a5c,#2d5986);border:3px solid #c9a84c;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4);animation:catbounce 2s ease-in-out infinite}
@keyframes catbounce{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-6px) rotate(3deg)}}
.catbub{position:fixed;bottom:78px;right:14px;z-index:510;background:#fff;border:2px solid #c9a84c;border-radius:14px;border-bottom-right-radius:4px;padding:10px 12px;width:210px;font-size:12px;color:#1f2937;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.catbub:after{content:'';position:absolute;bottom:-8px;right:20px;width:14px;height:14px;background:#fff;border-right:2px solid #c9a84c;border-bottom:2px solid #c9a84c;transform:rotate(45deg)}
.confetti{position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden}
.confetti i{position:absolute;top:-10px;width:8px;height:14px;opacity:.9;animation:fall linear forwards}
@keyframes fall{to{transform:translateY(110vh) rotate(720deg)}}
@media (max-width:768px){.xpbar .brand,.xpbar .who,.xpbar .pgtrack,.xpbar .done{display:none}.sidenav{display:none}.mobilenav{display:flex}.cols2{columns:1}.dropcap::first-letter{font-size:2.5em}.cover .bullets{grid-template-columns:1fr}}
@media (min-width:769px){.xpbar .brand,.xpbar .who,.xpbar .pgtrack,.xpbar .done{display:flex}}
`;