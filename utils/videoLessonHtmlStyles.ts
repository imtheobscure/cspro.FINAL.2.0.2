// Standalone Video Lesson — styles.
// Light-first (readable white surfaces, large type, full-width layout).
export const videoLessonHtmlCss = `
:root{--gold:#b45309;--goldSoft:#f59e0b;--orange:#ea580c;--bg0:#f8fafc;--bg1:#eef2ff;--bg2:#faf5ff;--card:#ffffff;--card2:#f1f5f9;--line:rgba(15,23,42,0.12);--tx:#0f172a;--mut:#5b6478;--ok:#15803d;--err:#b91c1c;--vio:#4f46e5;--vio2:#7c3aed;--onMedia:#fff}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:linear-gradient(135deg,var(--bg0) 0%,var(--bg1) 50%,var(--bg2) 100%);background-attachment:fixed;color:var(--tx);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;min-height:100vh;line-height:1.62;font-size:16px}
button{font-family:inherit;cursor:pointer;font-size:inherit}
/* Full-width canvas: the lesson uses the whole screen, not a narrow column. */
.vl-wrap{width:100%;max-width:none;margin:0;padding:14px 20px 70px}
.vl-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:rgba(255,255,255,0.92);border:1px solid var(--line);border-radius:18px;padding:12px 16px;position:sticky;top:8px;z-index:60;backdrop-filter:blur(10px);box-shadow:0 8px 24px -18px rgba(15,23,42,.35)}
.vl-logo{font-size:26px}
.vl-title{font-weight:900;font-size:20px;color:#7c2d12;flex:1;min-width:180px}
.vl-chip{font-size:13px;font-weight:700;background:var(--card2);border:1px solid var(--line);padding:5px 11px;border-radius:999px;color:#475569;white-space:nowrap}
.vl-xp{font-size:14px;font-weight:800;color:var(--gold)}
.vl-lvl{font-size:13px;color:var(--mut);font-weight:700}
.vl-topbtn{font-size:14px;font-weight:800;border:1px solid var(--line);background:var(--card);color:var(--tx);padding:9px 14px;border-radius:12px;transition:all .15s;white-space:nowrap}
.vl-topbtn:hover{border-color:var(--vio);transform:translateY(-1px)}
.vl-topbtn.gold{background:linear-gradient(135deg,var(--goldSoft),var(--orange));border-color:transparent;color:#fff}
.vl-topbtn.vio{background:linear-gradient(135deg,var(--vio),var(--vio2));border-color:transparent;color:#fff}
.vl-progress{width:100%;display:flex;align-items:center;gap:12px;font-size:13px;color:var(--mut);font-weight:700}
.vl-progress .bar{flex:1;height:9px;background:rgba(15,23,42,0.1);border-radius:99px;overflow:hidden}
.vl-progress .fill{height:100%;width:0;background:linear-gradient(90deg,var(--goldSoft),var(--orange));border-radius:99px;transition:width .5s}
.vl-badges{display:flex;gap:3px;font-size:18px}
.vl-main{display:flex;gap:18px;margin-top:18px;align-items:flex-start}
.vl-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px}
.vl-right{width:380px;flex-shrink:0;display:flex;flex-direction:column;gap:18px;max-height:calc(100vh - 130px);position:sticky;top:100px;overflow:auto}
@media(max-width:920px){.vl-right{width:100%;position:static;max-height:none}.vl-main{flex-direction:column}.vl-col{width:100%!important}}
.vl-panel{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 10px 30px -26px rgba(15,23,42,.4)}
.vl-h3{font-size:14px;font-weight:900;letter-spacing:.4px;color:#475569;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px;justify-content:space-between}
.vl-player{position:relative;border-radius:18px;overflow:hidden;background:#000;border:1px solid var(--line);aspect-ratio:16/9}
.vl-player video,.vl-player iframe{width:100%;height:100%;display:block;border:0}
.vl-empty-player{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 30%,rgba(79,70,229,.35),transparent 60%),#000;color:#cbd5e1;text-align:center;padding:20px;font-size:15px}
.vl-caption{position:absolute;left:0;right:0;bottom:0;padding:18px;text-align:center;background:linear-gradient(transparent,rgba(0,0,0,.88));font-size:22px;font-weight:800;color:#fff;text-shadow:0 2px 8px #000;min-height:64px;display:flex;align-items:flex-end;justify-content:center;line-height:1.35}
.vl-caption:empty{display:none}
.vl-segbar{display:flex;gap:8px;padding:12px 0 2px;flex-wrap:wrap}
.vl-segmark{font-size:13px;font-weight:800;padding:7px 13px;border-radius:99px;background:var(--card2);border:1px solid var(--line);color:var(--tx);transition:.15s}
.vl-segmark:hover{border-color:var(--goldSoft);color:var(--gold)}
.vl-segmark.active{background:linear-gradient(135deg,var(--vio),var(--vio2));border-color:transparent;color:#fff}
.vl-segmark.complete{border-color:rgba(21,128,61,.45);color:var(--ok);background:rgba(34,197,94,.1)}
.vl-segmark.complete.active{color:#fff;background:linear-gradient(135deg,#16a34a,#15803d)}
.vl-segmark .t{color:var(--mut);font-weight:700;margin-left:4px}
.vl-seg{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin-bottom:16px}
.vl-seg-head{display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap}
.vl-seg-num{font-size:15px;font-weight:900;color:#fff;background:linear-gradient(135deg,var(--goldSoft),var(--orange));width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.vl-seg-title{font-weight:900;font-size:19px}
.vl-seg-time{font-size:13px;color:var(--mut);font-weight:700;margin-left:auto}
.vl-seg-desc{font-size:15px;color:var(--mut);line-height:1.65}
.vl-seg-preview{margin-top:10px;font-size:14.5px;color:var(--mut);line-height:1.6}
.vl-seg-cta{display:flex;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--line)}
.vl-seg-collapsed{background:var(--card2)}
.vl-seg-collapsed:hover{border-color:var(--vio)}
.vl-seg-prog{height:6px;background:rgba(15,23,42,.1);border-radius:99px;overflow:hidden;margin:8px 0 14px}
.vl-seg-prog .fill{height:100%;background:var(--ok);width:0;border-radius:99px}
.vl-act{background:rgba(15,23,42,0.035);border:1px solid var(--line);border-left:5px solid var(--goldSoft);border-radius:14px;padding:16px;margin-top:12px}
.vl-act-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.vl-act-emoji{font-size:23px}
.vl-act-title{font-weight:800;font-size:16px}
.vl-act-type{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut);border:1px solid var(--line);border-radius:99px;padding:3px 9px;font-weight:800;background:var(--card)}
.vl-act-xp{font-size:13px;font-weight:800;color:var(--gold);margin-left:auto}
.vl-q{font-size:18px;font-weight:800;margin:8px 0 12px;line-height:1.55}
.vl-opt{display:block;width:100%;text-align:left;padding:14px 16px;border-radius:12px;border:2px solid var(--line);background:var(--card);color:var(--tx);font-size:16.5px;margin-bottom:10px;transition:.15s;font-weight:600;line-height:1.5}
.vl-opt:hover{border-color:var(--vio);background:rgba(79,70,229,.07)}
.vl-opt.correct{border-color:#22c55e;background:rgba(34,197,94,.14)}
.vl-opt.wrong{border-color:#ef4444;background:rgba(239,68,68,.12)}
.vl-opt:disabled{cursor:default;opacity:.85}
.vl-opt .conseq{display:block;font-size:13.5px;color:var(--mut);font-weight:600;margin-top:3px}
.vl-l1{font-size:15.5px;line-height:1.65;font-weight:600;background:rgba(245,158,11,.1);border:1px solid rgba(180,83,9,.28);border-radius:11px;padding:11px 14px;margin:0 0 12px}
.vl-fb{font-size:15px;font-weight:700;border-radius:11px;padding:11px 14px;margin:8px 0;display:none;line-height:1.5}
.vl-fb.ok{display:block;background:rgba(34,197,94,.12);border:1px solid rgba(22,101,52,.35);color:#14532d}
.vl-fb.bad{display:block;background:rgba(239,68,68,.1);border:1px solid rgba(185,28,28,.35);color:#7f1d1d}
.vl-fb.warn{display:block;background:rgba(245,158,11,.14);border:1px solid rgba(180,83,9,.35);color:#78350f}
.vl-in{width:100%;background:#fff;border:1.5px solid var(--line);color:var(--tx);border-radius:11px;padding:12px 14px;font-size:16px;outline:none;margin:5px 0}
.vl-in:focus{border-color:var(--vio)}
.vl-btn{font-size:14.5px;font-weight:800;background:var(--card2);border:1px solid var(--line);color:var(--tx);border-radius:11px;padding:11px 16px;transition:.15s;margin:3px 3px 3px 0}
.vl-btn:hover{border-color:var(--vio)}
.vl-btn.ok{background:linear-gradient(135deg,#16a34a,#15803d);border-color:transparent;color:#fff}
.vl-btn.warn{background:linear-gradient(135deg,var(--goldSoft),var(--orange));border-color:transparent;color:#fff}
.vl-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.vl-grid2 .vl-btn{white-space:normal}
.vl-tf{font-size:17px;font-weight:900;padding:18px;border-radius:13px;border:2px solid var(--line);background:var(--card);color:var(--tx)}
.vl-tf.true:hover{border-color:#22c55e}
.vl-tf.false:hover{border-color:#ef4444}
.vl-blank{background:#f1f5f9;border:0;border-bottom:2px solid var(--vio);color:#4338ca;font-size:16px;padding:3px 7px;width:150px;text-align:center;outline:none;font-weight:700}
.vl-blank.okk{border-color:#22c55e;color:#15803d}
.vl-blank.no{border-color:#ef4444;color:#b91c1c}
.vl-card-deck{display:flex;flex-wrap:wrap;gap:12px}
.vl-card{width:240px;height:174px;perspective:900px;cursor:pointer}
.vl-card-in{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d}
.vl-card.flip .vl-card-in{transform:rotateY(180deg)}
.vl-card-f,.vl-card-b{position:absolute;inset:0;backface-visibility:hidden;border-radius:14px;padding:14px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:6px;font-weight:800;font-size:16px;line-height:1.45}
.vl-card-f{background:linear-gradient(135deg,var(--vio),var(--vio2));border:2px solid #a5b4fc;color:#fff}
.vl-card-b{background:#fffbeb;border:2px solid var(--goldSoft);transform:rotateY(180deg);font-weight:700;color:#78350f}
.vl-match-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.vl-mitem{background:var(--card2);border:1.5px solid var(--line);border-radius:10px;padding:11px 13px;font-size:15px;margin-bottom:8px;cursor:pointer;font-weight:700;transition:.12s;user-select:none}
.vl-mitem.sel{border-color:var(--goldSoft);background:rgba(245,158,11,.14)}
.vl-mitem.done{border-color:#22c55e;background:rgba(34,197,94,.14);cursor:default;opacity:.9}
.vl-sort{display:flex;flex-direction:column;gap:8px}
.vl-sortitem{display:flex;gap:10px;align-items:center;background:var(--card2);border:1.5px solid var(--line);border-radius:11px;padding:11px 14px;font-size:15.5px;font-weight:700;cursor:grab}
.vl-sortitem.drag{opacity:.55;border-color:var(--goldSoft)}
.vl-drop{min-height:50px;border:2px dashed rgba(180,83,9,.45);border-radius:12px;padding:9px;margin-bottom:10px}
.vl-drop.okk{border-color:#22c55e;background:rgba(34,197,94,.09)}
.vl-word{font-size:32px;font-weight:900;letter-spacing:7px;text-align:center;margin:10px 0;color:var(--gold)}
.vl-say{font-size:17px;font-weight:700;font-style:italic;text-align:center;margin:12px 0}
.vl-notes{font-size:13px;color:var(--mut)}
.vl-trans{max-height:340px;overflow:auto}
.vl-line{display:flex;gap:10px;padding:8px 10px;border-radius:9px;font-size:15.5px;border-left:3px solid transparent}
.vl-line.active{background:rgba(79,70,229,.12);border-left-color:var(--vio);color:#312e81}
.vl-line .lt{color:var(--gold);font-weight:800;font-size:13px;flex-shrink:0;width:56px}
.vl-col{width:100%}
/* streaming */
.vl-search{display:flex;gap:10px;flex-wrap:wrap}
.vl-search input{flex:1;min-width:200px}
.vl-res{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin-top:12px}
.vl-resitem{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card);cursor:pointer;transition:.15s;text-align:left;color:var(--tx)}
.vl-resitem:hover{transform:translateY(-3px);border-color:var(--vio)}
.vl-resitem img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000}
.vl-resitem .tt{font-size:14.5px;font-weight:800;padding:10px 12px 4px;line-height:1.45}
.vl-resitem .ct{font-size:12.5px;color:var(--mut);padding:0 12px 12px}
.vl-resitem .tag{font-size:10.5px;font-weight:800;background:rgba(79,70,229,.18);color:#3730a3;border-radius:99px;padding:3px 8px;margin-left:10px;position:absolute}
/* party */
.vl-party{display:flex;gap:12px;flex-wrap:wrap}
.vl-partybox{border:1px solid var(--line);border-radius:13px;padding:13px;background:rgba(15,23,42,.03);flex:1;min-width:240px}
.vl-chat{height:190px;overflow:auto;border:1px solid var(--line);border-radius:11px;padding:10px;background:#fff;font-size:14px;margin:10px 0}
.vl-chat .who{font-weight:800;color:var(--gold)}
.vl-reacts{display:flex;gap:8px;font-size:24px;margin:8px 0}
.vl-reacts span{cursor:pointer;transition:.15s}
.vl-reacts span:hover{transform:scale(1.3)}
.vl-poll{border:1px solid rgba(180,83,9,.35);border-radius:13px;padding:13px;background:rgba(245,158,11,.08);margin-top:10px}
/* modal-ish */
.vl-banner{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:200;background:#fff;border:1px solid var(--goldSoft);color:var(--tx);font-weight:800;font-size:15px;padding:12px 20px;border-radius:13px;box-shadow:0 14px 40px -14px rgba(15,23,42,.5);display:flex;gap:9px;align-items:center;opacity:0;pointer-events:none;transition:.2s;max-width:92vw}
.vl-banner.show{opacity:1}
@media print{.vl-top,.vl-right,.vl-segmark,.vl-topbtn,.vl-search,.vl-player{display:none!important}.vl-left{width:100%}}
`;
