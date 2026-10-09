import { FlipbookJSON } from './flipbookTypes';

/* ═══════════════════════════════════════════════════════════════════════
   FLIPBOOK STANDALONE GENERATOR (formerly Flipbook)
   Zero-dependency HTML export with:
   • True two-faced 3D leaf page-turn — flips ONLY from narrow page edges
   • Hover curl peek near edges that never covers or blocks page content
   • Microsoft Azure neural TTS with CHILD voices (en-US-AnaNeural,
     en-GB-MaisieNeural) + Web Speech fallback with child-voice heuristics
   • 8 distinct content-type skins, each fully art-directed
   • 27 high-fidelity activities & arcade games with rich SFX/animation
   • New page order: bookplate → FRONT COVER → hero → quest map → vocab
     → chapters → exit ticket → certificate → teacher notes → BACK COVER
   ═══════════════════════════════════════════════════════════════════════ */

const CSS_BASE = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@600;700;900&display=swap');
:root{--ink:#342344;--purple:#7146c6;--gold:#e9ad45;--good:#28a566;--bad:#e05252;
--accent:#7146c6;--accent2:#bc4cae;--paper-a:#fffaf0;--paper-b:#f6ecd8;--orn-glyph:'✦'}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0}
body{min-height:100vh;color:var(--ink);font-family:Nunito,system-ui,sans-serif;background:radial-gradient(circle at 20% 0,#49306d,#160d25 55%,#090611);overflow-x:hidden;user-select:none}
button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}
.spark{position:fixed;color:#ffd98a;pointer-events:none;z-index:1;animation:sparkFloat 7s ease-in-out infinite;opacity:.7}
@keyframes sparkFloat{0%,100%{transform:translateY(0) scale(1);opacity:.55}50%{transform:translateY(-26px) scale(1.25);opacity:.95}}
.app{max-width:1180px;margin:auto;padding:14px 14px 22px;position:relative;z-index:2}
.bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;border:1px solid #b883ee66;border-radius:22px;background:#171025e6;color:#fff;box-shadow:0 12px 40px #0008}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.brand .logo{font-size:30px}
.brand b{font-family:'Baloo 2';font-size:19px;color:#ffd780;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand small{display:block;color:#cbbde4;font-weight:700;font-size:11px}
.tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.pill{border-radius:13px;padding:8px 11px;background:#5c3d1722;border:1px solid #e9ad4566;color:#ffe08a;font-weight:900;font-size:12px;white-space:nowrap}
.tool{border-radius:13px;padding:8px 11px;background:#ffffff12;color:#fff;font-weight:900;font-size:12px}
.tool:hover{background:#ffffff26}
.progress{height:8px;border-radius:99px;background:#ffffff14;margin:12px 2px 0;overflow:hidden}
#progressFill{height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--gold),#f472b6,var(--accent));transition:width .5s ease;box-shadow:0 0 12px #fbbf2488}
.stage{margin:16px auto;position:relative;max-width:1150px;padding:14px;border-radius:34px;background:linear-gradient(135deg,#4b2b6b,#1e112d);box-shadow:0 30px 80px #000b,0 0 0 5px #8e5aae55}
.orn{position:absolute;color:#f0c46a;font-size:22px;z-index:5;pointer-events:none;opacity:.9}
.book{position:relative;height:680px;perspective:2400px;display:grid;grid-template-columns:1fr 1fr;border-radius:18px;background:#21132f;box-shadow:inset 0 0 46px #0009}
.spine{position:absolute;z-index:20;left:50%;top:0;bottom:0;width:36px;transform:translateX(-50%);background:linear-gradient(90deg,#0000,#3b244677 35%,#140c22cc 50%,#3b244677 65%,#0000);pointer-events:none}
.rings{position:absolute;z-index:21;left:50%;top:0;bottom:0;width:40px;transform:translateX(-50%);display:flex;flex-direction:column;justify-content:space-around;align-items:center;padding:18px 0;pointer-events:none}
.ring{width:26px;height:11px;border-radius:99px;background:linear-gradient(90deg,#e9ad45,#ffeebc,#d99a35);border:1px solid #a8741f;box-shadow:0 2px 4px #000a;transform:rotate(-4deg)}
.page{position:relative;min-width:0;padding:26px 30px;background:linear-gradient(105deg,var(--paper-a),var(--paper-b));color:var(--ink);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}
.page::-webkit-scrollbar{width:6px}.page::-webkit-scrollbar-thumb{background:#c9a86a88;border-radius:99px}
.page::before{content:'';position:absolute;inset:8px;border:1px solid #a8783d26;border-radius:6px;pointer-events:none}
.page::after{content:'';position:absolute;inset:0;opacity:.18;pointer-events:none;background:repeating-linear-gradient(0deg,#9a744014 0,#9a744014 1px,transparent 1px,transparent 4px)}
.page>*{position:relative;z-index:2}
.page-l{border-radius:18px 0 0 18px;box-shadow:inset -16px 0 26px -18px #3c1e5055}
.page-r{border-radius:0 18px 18px 0;box-shadow:inset 16px 0 26px -18px #3c1e5055}
.curl-tr,.curl-tl{position:absolute;bottom:0;width:40px;height:40px;z-index:3;pointer-events:none;opacity:.8}
.curl-tr{right:0;background:radial-gradient(circle at 0 0,transparent 60%,#e8c98b 62%,#c89a4d 78%,#a87838 100%);border-radius:0 0 14px 0}
.curl-tl{left:0;background:radial-gradient(circle at 100% 0,transparent 60%,#e8c98b 62%,#c89a4d 78%,#a87838 100%);border-radius:0 0 0 14px}
.leaf{position:absolute;top:0;bottom:0;left:50%;width:50%;z-index:30;transform-origin:left center;transform-style:preserve-3d;will-change:transform;display:none}
.leaf.on{display:block}
.leaf-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
.leaf-front .gutter{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#15082040,transparent 24%)}
.leaf-back{transform:rotateY(180deg)}
.leaf-back .gutter{position:absolute;inset:0;pointer-events:none;background:linear-gradient(270deg,#15082040,transparent 24%)}
.leaf-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#00000052,transparent 55%);opacity:0;z-index:40}
.leaf-face .page{height:100%;border-radius:0}
/* ── COVER (right page of spread 1): full-page art-directed jacket ── */
.cover-page{padding:0!important;overflow:hidden}
.cover-skin{position:absolute;inset:0;background:linear-gradient(150deg,var(--accent),#1c1030 78%);opacity:.97}
.cover-pattern{position:absolute;inset:0;opacity:.16;background-image:radial-gradient(circle at 25% 20%,#ffffff44 1.5px,transparent 2px),radial-gradient(circle at 75% 70%,#ffffff33 1.5px,transparent 2px);background-size:56px 56px,72px 72px}
.cover-frame{position:absolute;inset:10px;border:2px solid #edc16bcc;border-radius:12px;pointer-events:none}
.cover-frame:after{content:'';position:absolute;inset:5px;border:1px solid #edc16b55;border-radius:8px}
.cover-inner{position:relative;z-index:3;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;padding:26px 24px 20px;color:#fff}
.cover-medal{padding:4px 14px;border-radius:99px;background:#edc16b26;border:1px solid #edc16b88;color:#ffe4a8;font-weight:900;font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.cover-title{font-family:'Baloo 2';font-size:clamp(26px,3.2vw,42px);line-height:1.04;margin:6px 0 4px;background:linear-gradient(180deg,#ffe9b0,#f3b23e 55%,#d98f1f);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 5px #00000066)}
.cover-sub{font-size:14px;font-weight:800;color:#efe3ff;max-width:34ch;margin:0 auto}
.cover-art{position:relative;width:min(78%,280px);aspect-ratio:1/1.05;border-radius:46% 46% 20px 20px/34% 34% 18px 18px;overflow:hidden;border:5px solid #edc16bd9;box-shadow:0 16px 34px #00000088, inset 0 0 30px #00000044}
.cover-art img{width:100%;height:100%;object-fit:cover}
.cover-art .arch-glow{position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,#1c1030aa);pointer-events:none}
.cover-shimmer{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.cover-shimmer:before{content:'';position:absolute;top:-60%;left:-80%;width:45%;height:220%;transform:rotate(24deg);background:linear-gradient(90deg,transparent,#ffffff2e,transparent);animation:coverShine 5.5s ease-in-out infinite}
@keyframes coverShine{0%,55%{left:-80%}85%,100%{left:150%}}
.cover-mascot{position:absolute;bottom:12px;right:16px;font-size:40px;z-index:4;filter:drop-shadow(0 4px 6px #0007);animation:mascotBob 3.2s ease-in-out infinite}
@keyframes mascotBob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(3deg)}}
.cover-open{padding:11px 22px;border-radius:99px;background:linear-gradient(135deg,#f3b23e,#e07b39);color:#3a2205;font-weight:900;font-size:14px;box-shadow:0 8px 18px #00000066, inset 0 1px 0 #ffe9b0}
.cover-open:hover{transform:translateY(-2px) scale(1.03)}
/* ── BOOKPLATE (left of spread 1) ── */
.plate{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;border:3px double #c68b3188;border-radius:16px;padding:26px 22px;background:radial-gradient(circle at 50% 0,#fffdf4,#fbf1da)}
.plate .big-orn{font-size:30px;letter-spacing:8px;color:#c68b31}
.plate h2{font-family:'Baloo 2';font-size:24px;color:#6e43c5;margin:0}
.plate .owner-line{font-size:17px;font-weight:900;color:#55445f}
.plate .owner-dots{width:75%;border-bottom:2.5px dotted #a8783866;height:30px}
.plate .stamp{margin-top:8px;font-size:40px;transform:rotate(-12deg);opacity:.85;filter:drop-shadow(0 3px 4px #0003)}
.plate .tiny{font-size:11.5px;color:#8a7a92;font-weight:800}
/* ── QUEST MAP + HERO + NOTES + BACK COVER ── */
.qmap{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:9px}
.qmap li{display:flex;gap:10px;align-items:flex-start;background:#fffdf6cc;border:1px solid #d5b57766;border-radius:14px;padding:10px 12px;font-weight:800;font-size:13.5px;line-height:1.45;box-shadow:0 4px 10px #51351a10}
.qmap .qm-ic{font-size:19px}
.hero-card{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;margin-top:8px}
.hero-ring{width:118px;height:118px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:62px;background:radial-gradient(circle at 32% 26%,#fff8e0,#f3d27a);border:5px solid var(--gold);box-shadow:0 10px 24px #51351a33, inset 0 0 18px #ffffffaa;animation:heroPulse 3s ease-in-out infinite}
@keyframes heroPulse{0%,100%{box-shadow:0 10px 24px #51351a33, inset 0 0 18px #ffffffaa}50%{box-shadow:0 14px 34px #51351a44, inset 0 0 26px #ffffffcc}}
.hero-name{font-family:'Baloo 2';font-size:24px;color:#5e3698;margin:0}
.pet-chip{display:inline-flex;align-items:center;gap:7px;background:#fff;border:2px solid #d5b57788;border-radius:99px;padding:6px 14px;font-weight:900;font-size:13px;box-shadow:0 4px 10px #51351a12}
.notes-card{background:#fbf4e4;border:1px solid #e3c98f;border-radius:14px;padding:12px 14px;margin-top:10px}
.notes-card h4{margin:0 0 6px;font-family:'Baloo 2';font-size:15px;color:#a36b19}
.notes-card ul{margin:0;padding-left:18px;font-size:12.5px;font-weight:700;color:#55445f;line-height:1.55}
.backcover-page{padding:0!important;background:linear-gradient(160deg,#241238,#0f0819 70%)!important;color:#efe3ff}
.backcover-inner{position:relative;z-index:3;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;padding:30px 26px 22px}
.backcover-blurb{font-size:14.5px;font-weight:800;line-height:1.7;color:#e9dcff;max-width:40ch}
.backcover-frame{position:absolute;inset:10px;border:2px solid #edc16b66;border-radius:12px;pointer-events:none}
.bc-badges{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.bc-badge{padding:4px 12px;border-radius:99px;border:1px solid #edc16b55;color:#ffe4a8;font-size:10.5px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.bc-barcode{width:150px;height:38px;border-radius:4px;background:repeating-linear-gradient(90deg,#e9dcff 0 2px,transparent 2px 5px,#e9dcff 5px 6px,transparent 6px 10px);opacity:.75}
.bc-tiny{font-size:10px;color:#a99cc4;font-weight:800;letter-spacing:.06em}
.eyebrow{color:var(--accent);text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:900}
.section-title{border-bottom:2px solid #c9954855;padding-bottom:10px;margin-bottom:16px;font-size:clamp(26px,2.4vw,38px)}
.content{font-size:clamp(18px,1.35vw,24px);line-height:1.75;white-space:pre-line}
.hero-listing{text-align:center;display:flex;min-height:100%;flex-direction:column;justify-content:center;align-items:center;gap:16px}
.hero-listing .cover{width:min(80%,320px);aspect-ratio:1;border-radius:28px;object-fit:cover;box-shadow:0 18px 30px #38224555;border:6px solid #edc16b}
.cast{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.character{border:1px solid #d4b57d;background:#fffdf6;border-radius:14px;padding:8px 11px;font-weight:900;box-shadow:0 4px 10px #543b2215;font-size:13px}
.character span{font-size:22px}
.cta{padding:12px 22px;color:#fff;border-radius:15px;background:linear-gradient(135deg,var(--accent),var(--accent2));font-weight:900;box-shadow:0 8px 16px #5f339255;transition:transform .15s}
.cta:hover{transform:translateY(-2px)}
.badge{display:inline-block;padding:4px 12px;border-radius:99px;background:#eee2fb;color:#6841a4;font-weight:900;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.media{width:100%;max-height:225px;object-fit:cover;border-radius:16px;margin:8px 0 14px;box-shadow:0 8px 18px #49302026}
.video{width:100%;aspect-ratio:16/9;border:0;border-radius:16px;margin:8px 0 14px;box-shadow:0 8px 18px #49302026}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.vocab,.dialogue{padding:12px;border:1px solid #d5b57788;border-radius:16px;background:#fffdf7d9;box-shadow:0 5px 12px #51351a14}
.vocab b{font-family:'Baloo 2';font-size:20px;color:#6841a4}
.vocab .phon{font-size:11px;color:#8a6bb0;font-weight:800}
.vocab p{margin:4px 0 0;font-size:12.5px;font-weight:700;color:#4c3d55}
.vocab small{display:block;margin-top:6px;font-style:italic;color:#7a6a85;font-size:11.5px}
.say{float:right;background:#eadbff;color:#6033a0;border-radius:10px;padding:5px 9px;font-weight:900;font-size:12px}
.say:hover{background:#dcc2ff}
.dialogue{margin:9px 0;background:#f0e7ff;cursor:pointer;display:flex;gap:10px;align-items:flex-start}
.dialogue:hover{border-color:#9a6fe0}
.dialogue b{color:#6434a4;font-size:13px}
.dialogue .dt{font-size:13px;font-weight:800;margin-top:2px}
.dialogue .demo{font-size:24px}
.activity{margin-top:14px;padding:14px;border:2px solid #d5b57788;border-radius:18px;background:#fffdf8;box-shadow:0 5px 14px #51351a12}
.activity h3{font-size:17px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.activity .xp-tag{margin-left:auto;background:#fdeed3;color:#a36b19;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:900}
.activity .prompt{font-size:clamp(17px,1.15vw,21px);font-weight:800;color:#55445f;margin:4px 0 10px;line-height:1.5}
.activity.done-act{border-color:var(--good);background:#f2fbf5}
.options{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.opt{padding:14px 16px;border-radius:13px;text-align:left;background:#f7f0ff;border:2px solid #dfcdf8;color:var(--ink);font-weight:800;font-size:13.5px;transition:all .15s}
.opt{font-size:clamp(16px,1.1vw,21px);line-height:1.45}.opt:hover{border-color:#8d5bd2;transform:translateY(-1px)}
.opt.correct{background:#d9f8df;border-color:#41ad65}
.opt.wrong{background:#ffe3e3;border-color:#e16b6b;animation:shake .4s}
.tf{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tf .opt{text-align:center;font-weight:900}
.complete{padding:10px 16px;border-radius:13px;background:linear-gradient(135deg,#6e43c5,#9b4cc0);color:#fff;font-weight:900;font-size:13px;box-shadow:0 5px 12px #5f339244}
.complete.done{background:var(--good)}
.complete:disabled{opacity:.6;cursor:default}
.fb-blank{margin:8px 0;padding:10px;background:#fdf6ff;border:1px dashed #c9a6ee;border-radius:12px}
.fb-sent{font-weight:800;font-size:14px}
.fb-choices{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.chip{padding:7px 12px;border-radius:11px;background:#fff7e6;border:2px solid #e3c98f;font-weight:900;font-size:13px}
.chip:hover{border-color:#c68b31}
.chip.used{opacity:.35;pointer-events:none}
.chip.picked{background:#eadbff;border-color:#8d5bd2}
.build-row{min-height:46px;padding:6px;display:flex;flex-wrap:wrap;gap:6px;background:#f6effc;border:2px dashed #c9a6ee;border-radius:12px;margin-bottom:8px}
.sort-wrap{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bucket{padding:10px;border-radius:14px;border:2px solid #d5b57788;background:#fbf4e4;min-height:80px}
.bucket h4{margin:0 0 6px;font-family:'Baloo 2';font-size:15px}
.bucket .items{display:flex;flex-wrap:wrap;gap:6px;min-height:34px}
.sort-item{padding:6px 10px;border-radius:10px;background:#fff;border:2px solid #c9a6ee;font-weight:800;font-size:12.5px}
.sort-item.selected{background:#eadbff;border-color:#8d5bd2;transform:scale(1.05)}
.sort-item.placed{background:#d9f8df;border-color:#41ad65}
.sort-item.used{opacity:.35;pointer-events:none}
.mem-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.mem-card{aspect-ratio:1;border-radius:12px;background:linear-gradient(135deg,#7442cc,#bc4cae);color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;transition:transform .3s;padding:4px;text-align:center;box-shadow:0 4px 10px #5f339244}
.mem-card.flip{background:#fffdf6;color:var(--ink);border:2px solid #d5b57788;transform:rotateY(180deg) scaleX(-1)}
.mem-card.match{background:#d9f8df;color:#1c7c42;border-color:#41ad65}
.pair-col{display:grid;gap:8px}
.pair-btn{padding:10px;border-radius:12px;background:#f7f0ff;border:2px solid #dfcdf8;font-weight:800;font-size:13px;text-align:left}
.pair-btn.sel{background:#eadbff;border-color:#8d5bd2}
.pair-btn.match{background:#d9f8df;border-color:#41ad65}
.pair-btn.wrong{background:#ffe3e3;border-color:#e16b6b;animation:shake .4s}
.mic-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border-radius:14px;background:linear-gradient(135deg,#0ea5a4,#22c1dc);color:#fff;font-weight:900;font-size:14px;box-shadow:0 6px 14px #0e749055}
.lyric{display:block;width:100%;text-align:left;padding:8px 12px;margin:4px 0;border-radius:11px;background:#fdf2f8;border:1px solid #f9c7dd;font-weight:800;font-size:13px}
.lyric:hover{border-color:#ec6aa8}
.story-outcome{margin-top:8px;padding:10px;border-radius:12px;background:#e8fff3;border:1px solid #7ed8a5;font-weight:800;font-size:13px}
.mood-row{display:flex;gap:8px;justify-content:center;margin:10px 0;flex-wrap:wrap}
.mood{font-size:30px;padding:6px 10px;border-radius:12px;background:#f7f0ff;border:2px solid transparent}
.mood:hover{border-color:#c9a6ee}
.mood.sel{border-color:#8d5bd2;background:#eadbff;transform:scale(1.12)}
textarea.mission{width:100%;min-height:90px;padding:10px;border-radius:12px;border:2px solid #d5b57788;background:#fffdf6;font-family:inherit;font-size:13.5px;font-weight:700;resize:vertical}
.check-row{display:flex;align-items:center;gap:8px;padding:8px 10px;margin:5px 0;background:#fbf4e4;border:1px solid #e3c98f;border-radius:11px;font-weight:800;font-size:13px;cursor:pointer}
.check-row input{width:17px;height:17px;accent-color:#6e43c5}
.flashcards{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:10px 0}
.fc{width:108px;height:108px;perspective:700px;cursor:pointer}
.fc-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s}
.fc.flip .fc-inner{transform:rotateY(180deg)}
.fc-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;padding:6px;text-align:center}
.fc-front{background:linear-gradient(135deg,#7442cc,#bc4cae);color:#fff;font-size:26px}
.fc-back{background:#fffdf6;border:2px solid #d5b57788;color:var(--ink);font-size:12px;transform:rotateY(180deg)}
.cert{border:4px double #c68b31;border-radius:18px;padding:18px 16px;background:radial-gradient(circle at 50% 0,#fff8e8,#fdf0cf);text-align:center;box-shadow:0 10px 26px #51351a1f}
.cert h1{font-size:26px;color:#6e43c5}
.cert .name{font-family:'Baloo 2';font-size:22px;color:#a36b19;margin:6px 0}
.cert .stats{display:flex;justify-content:center;gap:22px;margin:12px 0;font-weight:900}
.cert .stats b{display:block;font-size:20px;color:#6e43c5}
.cert .stats span{font-size:10.5px;color:#8a7a92;text-transform:uppercase;letter-spacing:.08em}
.controls{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
.turn{padding:11px 16px;border-radius:14px;background:#efe4ce;color:#50376c;font-weight:900;box-shadow:0 4px 10px #0003}
.turn.primary{background:linear-gradient(135deg,#7146c6,#ad4ca9);color:#fff}
.turn:disabled{opacity:.35;cursor:not-allowed}
.dots{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.dot{width:9px;height:9px;border-radius:99px;background:#ffffff2e;transition:all .25s}
.dot.active{width:24px;background:linear-gradient(90deg,#fbbf24,#f472b6)}
.corner-btn{position:absolute;bottom:0;width:52px;height:52px;z-index:35;opacity:.85;transition:opacity .2s,transform .2s}
.corner-btn:hover{opacity:1;transform:scale(1.06)}
#cornerNext{right:0;background:linear-gradient(315deg,#f0be62 0%,#d99a35 46%,transparent 52%);border-radius:0 0 20px 0}
#cornerPrev{left:0;background:linear-gradient(45deg,#f0be62 0%,#d99a35 46%,transparent 52%);border-radius:0 0 0 20px}
.mascot{position:fixed;left:16px;bottom:16px;z-index:60;display:flex;flex-direction:column;align-items:center;gap:8px}
#mascotBtn{width:64px;height:64px;border-radius:99px;background:radial-gradient(circle at 32% 28%,#fff8e0,#f3d27a);border:3px solid #c68b31;font-size:32px;box-shadow:0 8px 20px #0006;display:flex;align-items:center;justify-content:center;transition:transform .15s}
#mascotBtn:hover{transform:scale(1.08)}
#mascotBtn.pop{animation:pop .45s}
.bubble{max-width:240px;background:#fffdf6;color:#4c3d55;border:2px solid #e3c98f;border-radius:16px;padding:9px 13px;font-weight:900;font-size:12.5px;box-shadow:0 8px 18px #0005;opacity:0;transform:translateY(8px);transition:all .25s;pointer-events:none;text-align:center}
.bubble.show{opacity:1;transform:translateY(0)}
.cf{position:fixed;z-index:80;width:9px;height:9px;border-radius:2px;pointer-events:none;animation:cfFly .9s ease-out forwards}
@keyframes cfFly{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.25) rotate(-6deg)}100%{transform:scale(1)}}
/* Azure voice settings modal */
.az-modal{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;background:#000000a8}
.az-modal.open{display:flex}
.az-card{width:min(94vw,430px);background:#fffdf6;border:3px solid var(--gold);border-radius:20px;padding:20px 22px;box-shadow:0 24px 60px #000c}
.az-card h3{font-family:'Baloo 2';margin:0 0 4px;color:#6e43c5;font-size:20px}
.az-card p{font-size:12px;font-weight:700;color:#6b5a76;margin:4px 0 10px;line-height:1.5}
.az-card label{display:block;font-size:11px;font-weight:900;color:#8a6bb0;margin:8px 0 3px;text-transform:uppercase;letter-spacing:.08em}
.az-card input{width:100%;padding:9px 11px;border-radius:10px;border:2px solid #d5b57788;font-family:inherit;font-size:13px;font-weight:700}
.az-actions{display:flex;gap:8px;margin-top:14px}
.az-actions button{flex:1;padding:10px;border-radius:12px;font-weight:900;font-size:13px}
.az-save{background:linear-gradient(135deg,#6e43c5,#9b4cc0);color:#fff}
.az-clear{background:#f0e4ce;color:#7a5c33}
.footer-hint{text-align:center;color:#cbbde4;font-weight:800;font-size:12px;margin-top:10px}
@media(max-width:780px){
 .app{padding:8px}.bar{align-items:flex-start}.brand small{display:none}
 .stage{padding:8px;margin:10px auto}.book{display:block;height:620px}
 .spine,.rings{display:none}
 .page-l{display:none}.page-r{display:block;border-radius:16px}
 .leaf{left:0;width:100%}
 .page{padding:22px 18px}.content{font-size:18px}.activity .prompt{font-size:17px}.options,.sort-wrap{grid-template-columns:1fr}
 .mem-grid{grid-template-columns:repeat(3,1fr)}
 .cover-title{font-size:30px}.hero-listing h1{font-size:30px}
}
@media print{
 body{background:#fff}
 .bar,.progress,.controls,.mascot,.footer-hint,.orn,.corner-btn,.leaf,.page-l,.spine,.rings,.az-modal{display:none!important}
 .stage{margin:0;padding:0;background:none;box-shadow:none;max-width:100%}
 .book{display:block;height:auto;background:none;box-shadow:none}
 .page-r{display:block;border-radius:12px;box-shadow:none;height:auto;overflow:visible}
 .page{overflow:visible;height:auto}
}
`;

/* ═══ CONTENT-TYPE SKINS — each Content Type is art-directed differently ═══ */
const CSS_SKINS = `
/* English Lesson — royal purple & gold (default) */
.skin-english{--accent:#7146c6;--accent2:#bc4cae;--paper-a:#fffaf0;--paper-b:#f6ecd8}
/* Story Lesson — storybook rose & deep plum */
.skin-story{--accent:#c2477e;--accent2:#7d3fc0;--paper-a:#fffafa;--paper-b:#fdeef4}
.skin-story .cover-skin{background:linear-gradient(150deg,#8e3a68,#2a0f22 78%)}
.skin-story .page::before{border-color:#d16a9c44}
/* Song Lesson — music magenta & sunset orange */
.skin-song{--accent:#d9435f;--accent2:#f08a3c;--paper-a:#fffdf5;--paper-b:#fff0e2}
.skin-song .cover-skin{background:linear-gradient(150deg,#c2406a,#3d1030 78%)}
.skin-song .cover-pattern{background-image:radial-gradient(circle at 30% 30%,#ffd98a55 2px,transparent 3px),radial-gradient(circle at 70% 60%,#ff9d6b44 2px,transparent 3px);background-size:48px 48px}
/* Vocabulary Quest — explorer teal & lime */
.skin-vocabulary{--accent:#0d8f8f;--accent2:#7ab648;--paper-a:#f9fffb;--paper-b:#e9f7ee}
.skin-vocabulary .cover-skin{background:linear-gradient(150deg,#0c6b62,#07231f 78%)}
/* Grammar Quest — scholar blue & slate */
.skin-grammar{--accent:#2f6bbf;--accent2:#5a8fd9;--paper-a:#fafcff;--paper-b:#e9f0fa}
.skin-grammar .cover-skin{background:linear-gradient(150deg,#28548f,#0d1c33 78%)}
.skin-grammar .cover-pattern{background-image:linear-gradient(#ffffff22 1px,transparent 1px),linear-gradient(90deg,#ffffff22 1px,transparent 1px);background-size:34px 34px}
/* Speaking Mission — stage crimson & spotlight gold */
.skin-speaking{--accent:#c0392b;--accent2:#e9ad45;--paper-a:#fffaf6;--paper-b:#fdeee6}
.skin-speaking .cover-skin{background:linear-gradient(150deg,#93261c,#2b0a08 78%)}
.skin-speaking .cover-pattern{background-image:radial-gradient(circle at 50% 0%,#ffd98a44 0 26%,transparent 27%)}
/* Reading Mission — library forest & parchment */
.skin-reading{--accent:#3e7c4f;--accent2:#8f9a3f;--paper-a:#fdfcf3;--paper-b:#f1f2df}
.skin-reading .cover-skin{background:linear-gradient(150deg,#2f5a3c,#0e1f12 78%)}
/* Phonics Lab — playful sky & bubblegum */
.skin-phonics{--accent:#2a9fd8;--accent2:#ef6fae;--paper-a:#f9fdff;--paper-b:#eaf6fd}
.skin-phonics .cover-skin{background:linear-gradient(150deg,#1f7fb0,#0c2438 78%)}
.skin-phonics .cover-pattern{background-image:radial-gradient(circle at 20% 30%,#ffffff3d 3px,transparent 4px),radial-gradient(circle at 80% 70%,#ffffff2e 5px,transparent 6px);background-size:60px 60px}
`;

/* ═══ HIGH-FIDELITY ARCADE GAME STYLES ═══ */
const CSS_GAMES = `
/* Spelling Bee */
.bee-slots{display:flex;gap:6px;flex-wrap:wrap;min-height:48px;padding:6px;background:#fffbee;border:2px dashed #e3c98f;border-radius:12px;margin-bottom:8px}
.bee-tile{min-width:40px;height:44px;padding:4px 8px;border-radius:10px;background:linear-gradient(180deg,#fff,#f3e3b8);border:2px solid #d5a83f;font-family:'Baloo 2';font-size:21px;font-weight:800;color:#5c3a10;box-shadow:0 3px 6px #51351a22;text-transform:uppercase}
.bee-tile:hover{transform:translateY(-2px)}
.bee-tile.used{opacity:.25;pointer-events:none}
.bee-slot{min-width:40px;height:44px;border-radius:10px;background:#fff;border:2px solid #c9a6ee;display:flex;align-items:center;justify-content:center;font-family:'Baloo 2';font-size:21px;font-weight:800}
.bee-hint{font-size:13px;font-weight:800;color:#55445f;margin-bottom:8px}
/* Word Search */
.ws-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:3px;max-width:430px;margin:8px auto}
.ws-cell{aspect-ratio:1;border-radius:7px;background:#eef4ff;border:1.5px solid #bcd2f0;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;color:#2c4a73;cursor:pointer;transition:all .12s}
.ws-cell:hover{border-color:#2f6bbf}
.ws-cell.sel{background:#ffe9a8;border-color:#d99a35;transform:scale(1.12)}
.ws-cell.found{background:#d9f8df;border-color:#41ad65;color:#1c7c42}
.ws-words{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px}
.ws-word{padding:4px 11px;border-radius:99px;background:#fff;border:1.5px solid #bcd2f0;font-weight:900;font-size:12px}
.ws-word.found{background:#d9f8df;border-color:#41ad65;text-decoration:line-through}
/* Balloon Pop */
.balloon-stage{position:relative;height:230px;border-radius:16px;background:linear-gradient(180deg,#e8f4ff,#d5e9fa);border:2px solid #bcd2f0;overflow:hidden}
.balloon{position:absolute;bottom:-90px;width:62px;height:78px;border-radius:50% 50% 46% 46%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11.5px;color:#fff;text-align:center;padding:6px;cursor:pointer;box-shadow:inset -6px -8px 12px #00000033, inset 5px 6px 10px #ffffff55;animation:balloonFloat var(--dur) linear infinite;animation-delay:var(--del)}
.balloon:before{content:'';position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top:9px solid inherit}
.balloon .string{position:absolute;top:100%;left:50%;width:2px;height:26px;background:#ffffffaa}
@keyframes balloonFloat{0%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-300px) translateX(12px) rotate(3deg)}100%{transform:translateY(-320px) rotate(-2deg)}}
.balloon.pop{animation:none;background:radial-gradient(circle,#ffd54d,#ff8f3c)!important;transform:scale(1.4)!important;opacity:0;transition:all .3s}
.balloon.wob{animation:wob .4s}
@keyframes wob{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}
/* Whack-a-Mole */
.mole-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:340px;margin:10px auto}
.mole-hole{aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 42%,#5a3a1e 0 34%,#3d2712 60%,#2a1a0a 100%);position:relative;overflow:hidden;box-shadow:inset 0 8px 14px #00000066}
.mole{position:absolute;inset:14% 12% 0;border-radius:50% 50% 0 0;background:linear-gradient(180deg,#c98d5a,#8a5a30);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:#fff;padding:5px;text-align:center;cursor:pointer;transform:translateY(110%);transition:transform .18s;box-shadow:inset 0 4px 8px #00000044}
.mole.up{transform:translateY(6%)}
.mole.bonk{background:linear-gradient(180deg,#7ed8a5,#28a566);transform:translateY(30%) scale(.9)}
.mole.miss-m{background:linear-gradient(180deg,#f3a0a0,#e05252)}
.mole-score{display:flex;justify-content:center;gap:14px;font-weight:900;font-size:13px;margin-bottom:6px}
/* Bingo */
.bingo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:330px;margin:10px auto}
.bingo-cell{aspect-ratio:1.25;border-radius:12px;background:#fff;border:2px solid #d9435f88;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;text-align:center;padding:4px;cursor:pointer;transition:all .15s}
.bingo-cell:hover{border-color:#d9435f}
.bingo-cell.marked{background:linear-gradient(135deg,#ffd54d,#ff9d6b);border-color:#e07b39;transform:scale(.96);box-shadow:inset 0 0 12px #ffffff88}
.bingo-call{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:4px}
.bingo-called{font-weight:900;font-size:15px;color:#a3334b;min-height:20px}
/* Spin Wheel */
.wheel-wrap{display:flex;flex-direction:column;align-items:center;gap:12px}
.wheel{position:relative;width:230px;height:230px;border-radius:50%;border:7px solid #e9ad45;box-shadow:0 10px 26px #51351a33, inset 0 0 20px #00000022;transition:transform 3.6s cubic-bezier(.15,.9,.25,1)}
.wheel-pointer{font-size:34px;margin-bottom:-8px;z-index:2;filter:drop-shadow(0 3px 3px #0005)}
.wheel-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:900;color:#fff;text-shadow:0 1px 2px #0008;pointer-events:none}
.wheel-result{font-family:'Baloo 2';font-size:21px;color:#6e43c5;min-height:28px}
/* Syllable claps */
.syll-word{font-family:'Baloo 2';font-size:32px;color:#5e3698;text-align:center;margin:4px 0}
.syll-btns{display:flex;gap:10px;justify-content:center;margin:10px 0}
.syll-btn{width:52px;height:52px;border-radius:50%;background:linear-gradient(180deg,#fff,#ffe8b8);border:2.5px solid #d5a83f;font-family:'Baloo 2';font-size:22px;font-weight:800;color:#5c3a10;box-shadow:0 4px 8px #51351a22}
.syll-btn:hover{transform:scale(1.1)}
/* Drawing pad */
.draw-wrap{border:2px solid #d5b57788;border-radius:14px;overflow:hidden;background:#fff}
.draw-pad{display:block;width:100%;height:210px;cursor:crosshair;touch-action:none}
.draw-tools{display:flex;gap:6px;align-items:center;padding:8px;background:#fbf4e4;flex-wrap:wrap}
.draw-color{width:26px;height:26px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 0 1.5px #c9a6ee;cursor:pointer}
.draw-color.sel{box-shadow:0 0 0 3px #6e43c5;transform:scale(1.15)}
.draw-size{width:30px;height:30px;border-radius:8px;background:#fff;border:2px solid #c9a6ee;display:flex;align-items:center;justify-content:center}
.draw-size.sel{border-color:#6e43c5;background:#eadbff}
.draw-dot{border-radius:50%;background:#55445f}
/* Typing race */
.type-word{font-family:'Baloo 2';font-size:30px;color:#5e3698;text-align:center;letter-spacing:.06em;margin:6px 0}
.type-input{width:100%;padding:12px;border-radius:12px;border:2.5px solid #c9a6ee;font-family:'Baloo 2';font-size:22px;text-align:center;font-weight:800;color:#342344;outline:none}
.type-input:focus{border-color:#7146c6}
.type-bar{height:12px;border-radius:99px;background:#f0e4ce;overflow:hidden;margin:10px 0}
.type-bar-fill{height:100%;width:100%;background:linear-gradient(90deg,#28a566,#e9ad45,#e05252);border-radius:99px}
.type-progress{text-align:center;font-weight:900;font-size:13px;color:#55445f}
/* Flashcard trainer */
.fc-big{width:min(100%,300px);height:190px;perspective:800px;cursor:pointer;margin:8px auto}
.fc-big-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s}
.fc-big.flip .fc-big-inner{transform:rotateY(180deg)}
.fc-big-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-weight:900;padding:14px;text-align:center;box-shadow:0 8px 20px #51351a22}
.fc-big-front{background:linear-gradient(135deg,#7442cc,#bc4cae);color:#fff;font-family:'Baloo 2';font-size:26px}
.fc-big-front .em{font-size:44px}
.fc-big-back{background:#fffdf6;border:3px solid #d5b57788;color:var(--ink);font-size:15px;transform:rotateY(180deg)}
.fc-btns{display:flex;gap:10px;justify-content:center}
.fc-know{padding:10px 18px;border-radius:12px;background:linear-gradient(135deg,#28a566,#1c7c42);color:#fff;font-weight:900;font-size:13px}
.fc-again{padding:10px 18px;border-radius:12px;background:#f0e4ce;color:#7a5c33;font-weight:900;font-size:13px}
.fc-count{text-align:center;font-weight:900;font-size:12.5px;color:#8a7a92;margin-bottom:4px}
`;

const MARKUP = `
<div class="app">
  <header class="bar">
    <div class="brand"><span class="logo">📖✨</span><div><b id="bookTitle">Flipbook</b><small>Enchanted learning flipbook</small></div></div>
    <div class="tools">
      <span class="pill" id="lvlPill">Lv. 1</span>
      <span class="pill" id="xpPill">⭐ 50 XP</span>
      <span class="pill" id="streakPill">🔥 0</span>
      <button class="tool" id="soundBtn" onclick="toggleSound()">🔊 Sound</button>
      <button class="tool" id="readBtn" onclick="readPageAloud()">👁️ Read page</button>
      <button class="tool" id="azBtn" onclick="openAzure()">🗣️ Azure voices</button>
    </div>
  </header>
  <div class="progress"><div id="progressFill"></div></div>
  <main class="stage">
    <div class="orn" style="top:6px;left:10px">⚜</div>
    <div class="orn" style="top:6px;right:10px">⚜</div>
    <div class="orn" style="bottom:6px;left:10px">⚜</div>
    <div class="orn" style="bottom:6px;right:10px">⚜</div>
    <div class="book" id="book">
      <section class="page page-l" id="pageL"></section>
      <section class="page page-r" id="pageR"></section>
      <div class="spine"></div>
      <div class="rings" id="rings"></div>
      <div class="leaf" id="leaf">
        <div class="leaf-face leaf-front" id="leafFront"><div class="gutter"></div></div>
        <div class="leaf-face leaf-back" id="leafBack"><div class="gutter"></div></div>
        <div class="leaf-shade" id="leafShade"></div>
      </div>
    </div>
    <button class="corner-btn" id="cornerNext" onclick="beginTurn('next')" title="Turn page" aria-label="Next page"></button>
    <button class="corner-btn" id="cornerPrev" onclick="beginTurn('prev')" title="Turn back" aria-label="Previous page"></button>
  </main>
  <div class="controls">
    <button class="turn" id="prevBtn" onclick="beginTurn('prev')">◀ Turn Back</button>
    <div class="dots" id="dots"></div>
    <button class="turn primary" id="nextBtn" onclick="beginTurn('next')">Next Spread ▶</button>
  </div>
  <p class="footer-hint">Flip only from the page edges — hover close to see the page curl • Click, tap and drag all games freely ✨</p>
</div>
<div class="mascot">
  <div class="bubble" id="bubble"></div>
  <button id="mascotBtn" onclick="mascotCheer()" title="Your companion">🐾</button>
</div>
<div class="az-modal" id="azModal">
  <div class="az-card">
    <h3>🗣️ Azure Natural Voices</h3>
    <p>Paste a free <b>Azure Speech</b> key + region to hear the story with real Microsoft neural voices — the Flipbook automatically uses the <b>children voices</b> (en-US-AnaNeural, en-GB-MaisieNeural) for young characters. Without a key, a natural Web-Speech voice is chosen with child-friendly pitch.</p>
    <label>Azure Speech Key</label>
    <input id="azKey" placeholder="e.g. 4x9Qw... (from portal.azure.com — Speech service)">
    <label>Region</label>
    <input id="azRegion" placeholder="e.g. eastus, westeurope, southeastasia">
    <div class="az-actions">
      <button class="az-save" onclick="saveAzure()">Save &amp; use Azure 🎙️</button>
      <button class="az-clear" onclick="clearAzure()">Use browser voice</button>
    </div>
  </div>
</div>
`;

const ENGINE_JS = `
/* ═══ STATE & UTILS ═══ */
var state = { spread: 0, total: BOOK.sections.length + 5, xp: 50, streak: 0, bestStreak: 0, muted: false, turning: null, busy: false, awarded: {}, level: 1 };
function $(id) { return document.getElementById(id); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function correctOf(a) { return (a.correct !== undefined && a.correct !== null) ? a.correct : (a.correctAnswer !== undefined ? a.correctAnswer : ''); }

/* ═══ AUDIO: paper synthesis + chimes + arcade SFX ═══ */
var AC = window.AudioContext || window.webkitAudioContext;
var audio = null;
function actx() { if (!AC) return null; if (!audio) audio = new AC(); if (audio.state === 'suspended') audio.resume(); return audio; }
function noiseBuf(c, sec) { var len = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return b; }
function paperFlick(v) { if (state.muted) return; try { var c = actx(); if (!c) return; var t0 = c.currentTime; var s = c.createBufferSource(); s.buffer = noiseBuf(c, 0.12); var f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(2600, t0); f.frequency.exponentialRampToValueAtTime(900, t0 + 0.12); var g = c.createGain(); g.gain.setValueAtTime(0.15 * v, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12); s.connect(f); f.connect(g); g.connect(c.destination); s.start(t0); } catch (e) { } }
function paperWhoosh(v) { if (state.muted) return; try { var c = actx(); if (!c) return; var t0 = c.currentTime + 0.04; var s = c.createBufferSource(); s.buffer = noiseBuf(c, 0.42); var f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(500, t0); f.frequency.exponentialRampToValueAtTime(2100, t0 + 0.18); f.frequency.exponentialRampToValueAtTime(300, t0 + 0.4); var g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.085 * v, t0 + 0.14); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); s.connect(f); f.connect(g); g.connect(c.destination); s.start(t0); } catch (e) { } }
function paperSettle() { if (state.muted) return; try { var c = actx(); if (!c) return; var t0 = c.currentTime + 0.34; var o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(90, t0 + 0.16); g.gain.setValueAtTime(0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.2); } catch (e) { } }
function pageTurnSound() { paperFlick(1); paperWhoosh(1); paperSettle(); }
function tone(f, d, type, v) { if (state.muted) return; try { var c = actx(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v || 0.06, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (d || 0.15)); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (d || 0.15)); } catch (e) { } }
function toneSlide(f1, f2, d, type, v) { if (state.muted) return; try { var c = actx(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f1, c.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), c.currentTime + d); g.gain.setValueAtTime(v || 0.06, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d); } catch (e) { } }
function chime() { [523.25, 659.25, 783.99, 1046.5].forEach(function (n, i) { setTimeout(function () { tone(n, 0.16, 'sine', 0.06); }, i * 65); }); }
function sparkleSfx() { [1046.5, 1318.5, 1568, 2093].forEach(function (n, i) { setTimeout(function () { tone(n, 0.12, 'sine', 0.03); }, i * 45); }); }
function buzz() { tone(240, 0.16, 'sawtooth', 0.05); setTimeout(function () { tone(190, 0.2, 'sawtooth', 0.05); }, 110); }
function fanfare() { [[523, 0], [523, 130], [659, 260], [784, 420], [1046, 620]].forEach(function (p) { setTimeout(function () { tone(p[0], 0.22, 'triangle', 0.07); tone(p[0] * 1.5, 0.22, 'sine', 0.035); }, p[1]); }); }
function pop() { tone(520, 0.07, 'triangle', 0.05); setTimeout(function () { tone(740, 0.09, 'triangle', 0.05); }, 65); }
function balloonPopSfx() { if (state.muted) return; try { var c = actx(); if (!c) return; var t0 = c.currentTime; var s = c.createBufferSource(); s.buffer = noiseBuf(c, 0.09); var g = c.createGain(); g.gain.setValueAtTime(0.18, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09); s.connect(g); g.connect(c.destination); s.start(t0); toneSlide(900, 200, 0.14, 'square', 0.05); } catch (e) { } }
function boing() { toneSlide(300, 90, 0.22, 'sine', 0.07); }
function tada() { [659, 784, 1046, 1318].forEach(function (n, i) { setTimeout(function () { tone(n, 0.2, 'triangle', 0.06); }, i * 90); }); }
function tickTock() { tone(880, 0.03, 'square', 0.025); }
function clapSfx(n) { for (var i = 0; i < n; i++) { setTimeout(function () { if (state.muted) return; try { var c = actx(); if (!c) return; var s = c.createBufferSource(); s.buffer = noiseBuf(c, 0.06); var f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; var g = c.createGain(); g.gain.setValueAtTime(0.1, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06); s.connect(f); f.connect(g); g.connect(c.destination); s.start(); } catch (e) { } }, i * 220); } }

/* ═══ MICROSOFT AZURE NEURAL TTS — children voices preferred ═══ */
var AZ = { key: localStorage.getItem('fb_az_key') || '', region: localStorage.getItem('fb_az_region') || '' };
var azCache = {};
var CHILD_VOICE = /ana|maisie/i;
function openAzure() { $('azKey').value = AZ.key; $('azRegion').value = AZ.region; $('azModal').classList.add('open'); }
function closeAzure() { $('azModal').classList.remove('open'); }
function saveAzure() { AZ.key = $('azKey').value.trim(); AZ.region = $('azRegion').value.trim(); localStorage.setItem('fb_az_key', AZ.key); localStorage.setItem('fb_az_region', AZ.region); closeAzure(); if (AZ.key && AZ.region) { bubble('Azure neural voices ready — children voices first! 🎙️'); say('Azure voices are ready. Let the story begin!', 'en-US-AnaNeural'); } else bubble('Please paste both a key and a region.'); }
function clearAzure() { AZ.key = ''; AZ.region = ''; localStorage.removeItem('fb_az_key'); localStorage.removeItem('fb_az_region'); closeAzure(); bubble('Using the built-in natural voice.'); }
function pickLocalVoice(azName) {
  if (!('speechSynthesis' in window)) return null;
  var vs = speechSynthesis.getVoices(); var en = vs.filter(function (v) { return v.lang && v.lang.indexOf('en') === 0; });
  if (!en.length) return null;
  var wantChild = CHILD_VOICE.test(azName || '');
  var wantUK = /en-GB/i.test(azName || '');
  var wantFemale = wantChild || /jenny|aria|emma|sonia|libby|ana|maisie/i.test(azName || '');
  function score(v) { var s = 0, n = (v.name || '').toLowerCase(); if (wantChild && /ana|maisie|kid|child|junior/.test(n)) s += 6; if (wantUK && /gb|uk|british/i.test(v.lang + ' ' + n)) s += 3; else if (!wantUK && /us/i.test(v.lang)) s += 1; if (wantFemale && /female|zira|susan|hazel|samantha|karen|serena|tessa|fiona|moira|aria|jenny/.test(n)) s += 2; if (/natural|neural|online/.test(n)) s += 2; if (/google/.test(n)) s += 1; return s; }
  en.sort(function (a, b) { return score(b) - score(a); });
  return en[0];
}
function webSpeak(text, azName, pitch, rate) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(String(text));
  var child = CHILD_VOICE.test(azName || '');
  u.pitch = Math.min(2, (pitch || 1.05) + (child ? 0.35 : 0));
  u.rate = rate || (child ? 0.94 : 1);
  var v = pickLocalVoice(azName); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
function azureSpeak(text, azName, pitch, rate) {
  if (!AZ.key || !AZ.region) { webSpeak(text, azName, pitch, rate); return; }
  var voice = azName || 'en-US-AnaNeural';
  var p = pitch || 1.05, r = rate || 0.95;
  var pUp = p >= 1 ? '+' : '-'; var pVal = Math.round(Math.abs(p - 1) * 100);
  var rPct = Math.round(r * 100);
  var ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="' + voice + '"><prosody pitch="' + pUp + pVal + '%" rate="' + rPct + '%">' + text + '</prosody></voice></speak>';
  var cacheKey = voice + '|' + ssml;
  if (azCache[cacheKey]) { playAzureBuf(azCache[cacheKey]); return; }
  fetch('https://' + AZ.region + '.tts.speech.microsoft.com/cognitiveservices/v1', {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': AZ.key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'FlipbookPlayer' },
    body: ssml
  }).then(function (resp) { if (!resp.ok) throw new Error('azure ' + resp.status); return resp.arrayBuffer(); })
    .then(function (buf) { azCache[cacheKey] = buf; playAzureBuf(buf); })
    .catch(function () { webSpeak(text, azName, pitch, rate); });
}
function playAzureBuf(buf) { try { var c = actx(); if (!c) return; c.decodeAudioData(buf.slice(0), function (decoded) { var src = c.createBufferSource(); src.buffer = decoded; src.connect(c.destination); src.start(); }, function () { }); } catch (e) { } }
function say(text, azName, pitch, rate) { azureSpeak(text, azName, pitch, rate); }

/* ═══ GAMIFICATION ═══ */
var PRAISE = ['Your brain just grew! 🌟', 'Wonderful trying — that is how mastery happens!', 'Brave work, hero! ✨', 'You figured it out! 🧠', 'Fantastic effort! Keep the magic going!', 'Strong thinking! 💪', 'Every try makes you stronger! ⭐'];
var TIPS = ['Tap any 🔊 button to hear words again — repetition grows memory!', 'Hover near the page edge to watch it curl, then drag to flip!', 'Take a tiny breath, then say it out loud — brave!', 'Streaks grow when you keep trying!', 'Teach a new word to someone you love today!'];
var bubbleTimer = null;
function bubble(text) { var b = $('bubble'); b.textContent = text; b.classList.add('show'); if (bubbleTimer) clearTimeout(bubbleTimer); bubbleTimer = setTimeout(function () { b.classList.remove('show'); }, 3200); }
function mascotCheer() { pop(); bubble(TIPS[Math.floor(Math.random() * TIPS.length)]); }
function praise() { bubble(PRAISE[Math.floor(Math.random() * PRAISE.length)]); var m = $('mascotBtn'); m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); }
function confettiBurst(x, y, scale) { var n = Math.round(16 * (scale || 1)); var colors = ['#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#fde68a']; for (var i = 0; i < n; i++) { var s = document.createElement('span'); s.className = 'cf'; var cx = (x == null ? window.innerWidth / 2 : x), cy = (y == null ? window.innerHeight * 0.5 : y); s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.background = colors[i % colors.length]; var ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 130; s.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); s.style.setProperty('--dy', (Math.sin(ang) * dist - 50) + 'px'); s.style.setProperty('--rot', Math.floor(Math.random() * 540) + 'deg'); document.body.appendChild(s); (function (el) { setTimeout(function () { el.remove(); }, 950); })(s); } }
function markDone(key) { if (!key) return; var card = document.querySelector('[data-key="' + key + '"]'); if (card) { card.classList.add('done-act'); var tag = card.querySelector('.xp-tag'); if (tag) tag.textContent = '✅ Done!'; } }
function refreshHud() { $('xpPill').textContent = '⭐ ' + state.xp + ' XP'; var lvl = Math.floor(state.xp / 120) + 1; if (lvl > state.level) { state.level = lvl; fanfare(); confettiBurst(null, null, 1.6); bubble('Level ' + lvl + ' wizard! Magic grows with practice!'); } $('lvlPill').textContent = 'Lv. ' + state.level; $('streakPill').textContent = '🔥 ' + state.streak; }
function award(pts, key) { if (key && state.awarded[key]) return; if (key) state.awarded[key] = true; state.xp += pts; state.streak++; if (state.streak > state.bestStreak) state.bestStreak = state.streak; chime(); sparkleSfx(); confettiBurst(null, null, 1); praise(); markDone(key); refreshHud(); renderIfFinale(); }
function miss() { state.streak = 0; buzz(); refreshHud(); }
function toggleSound() { state.muted = !state.muted; $('soundBtn').textContent = state.muted ? '🔇 Muted' : '🔊 Sound'; if (!state.muted) pop(); }
/* ═══ PAGE RENDERERS — spread map:
    0 [bookplate | FRONT COVER]  1 [quest map | HERO]  2 [memory lab | VOCABULARY]
    3..n+2 [activities | story] per chapter  n+3 [exit ticket | CERTIFICATE]
    n+4 [teacher notes | BACK COVER] */
function voiceOf(el) { return el.getAttribute('data-voice') || null; }
function chapterOf(i) { return BOOK.sections[i] || {}; }
function renderIfFinale() { if (state.spread >= BOOK.sections.length + 3) renderPage(); }
function chapterMastered(i) { var s = BOOK.sections[i]; if (!s || !s.activities || !s.activities.length) return false; return s.activities.every(function (a, j) { return state.awarded['ch' + i + '-' + j]; }); }
function vocabCard(v) { return '<article class="vocab">' + (v.imageUrl ? '<img class="media" style="height:96px;margin:0 0 8px" src="' + esc(v.imageUrl) + '" alt="' + esc(v.word) + '" onerror="this.style.display=&#39;none&#39;">' : '') + '<button class="say" data-say="' + esc(v.word + '. ' + v.meaning + '. Example: ' + v.example) + '" data-voice="' + esc(v.speakerCharacter || '') + '">🔊</button><b>' + esc(v.emoji || '') + ' ' + esc(v.word) + '</b>' + (v.phonetic ? '<div class="phon">' + esc(v.phonetic) + '</div>' : '') + '<p>' + esc(v.meaning) + '</p>' + (v.example ? '<small>“' + esc(v.example) + '”</small>' : '') + '</article>'; }

/* Mystery Word Lab (spaced phonological recall) */
var lab = { answer: null };
function newLabRound() { var words = (BOOK.vocabulary || []).filter(function (w) { return w && w.word; }); if (words.length < 3) return ''; var pool = shuffle(words); var answer = pool[0]; var others = pool.slice(1, 4); lab.answer = answer; var opts = shuffle([answer].concat(others)); return '<div class="activity" id="labBox"><h3>🎧 Mystery Word Lab <span class="xp-tag">+15 XP each</span></h3><p class="prompt">Listen carefully, then tap the word you hear. Hear it again any time!</p><button class="say" style="float:none;display:inline-block;margin-bottom:8px" data-say="' + esc(answer.word) + '">🔊 Play the mystery word</button><div class="options">' + opts.map(function (w) { return '<button class="opt lab-opt" data-w="' + esc(w.word) + '">' + esc((w.emoji || '') + ' ' + w.word) + '</button>'; }).join('') + '</div></div>'; }

function leftContent(idx) {
  /* SPREAD 0 LEFT — ornate bookplate */
  if (idx === 0) {
    return '<div class="plate"><div class="big-orn">✦ ❖ ✦</div><h2>This magical Flipbook belongs to</h2><div class="owner-line"></div><div class="owner-dots"></div><div class="stamp">' + esc(BOOK.learnerAvatarEmoji || '🧚') + '</div><div class="tiny">A quest in spoken English • CEFR ' + esc(BOOK.level) + ' • ' + (BOOK.sections || []).length + ' chapters of magic</div><div class="tiny">Handle with brave, curious hands ✨</div></div>';
  }
  /* SPREAD 1 LEFT — quest map (objectives) */
  if (idx === 1) {
    var objs = (BOOK.learningObjectives || []).map(function (o) { return '<li><span class="qm-ic">⭐</span><span>' + esc(o) + '</span></li>'; }).join('');
    return '<div class="eyebrow">Before you begin</div><h2 class="section-title">🗺️ Your Quest Map</h2><p class="content">Great heroes read the map first! Here is everything you will master on this adventure. Tick each star off in your mind as you go.</p><ul class="qmap">' + objs + '</ul><p class="prompt" style="margin-top:12px">💡 Tap the hero on the right page to hear your greeting!</p>';
  }
  /* SPREAD 2 LEFT — memory lab */
  if (idx === 2) {
    var memAct = { type: 'memoryMatch', title: 'Memory Flip Power-up', emoji: '🧠', prompt: 'Flip two cards and find the matching pairs from the story world!', points: 30, feedbackCorrect: 'Mastered! You locked in every pair!', pairs: (BOOK.vocabulary || []).slice(0, 4).map(function (v) { return { left: (v.emoji || '') + ' ' + v.word, right: v.meaning }; }) };
    return '<div class="eyebrow">Warm-up • Page 5</div><h2 class="section-title">💎 Word Treasure Hunt</h2><p class="content">Look, say, connect! Tap 🔊 on any word card to hear it. Saying a word three times makes it stick forever.</p>' + activityHtml(memAct, 'lab-memory');
  }
  /* CHAPTER SPREADS — activities page */
  if (idx >= 3 && idx <= BOOK.sections.length + 2) {
    var si = idx - 3;
    var s = chapterOf(si);
    var acts = (s.activities || []).map(function (a, i) { return activityHtml(a, 'ch' + si + '-' + i); }).join('');
    return '<div class="eyebrow">Chapter ' + (idx - 2) + ' • ' + esc(s.type || 'quest') + '</div><h2 class="section-title">' + esc(s.emoji || '⚡') + ' ' + esc(s.title || 'Challenge') + '</h2><p class="content">' + esc(s.objective || 'Try each mission. Wrong answers are just practice in disguise!') + '</p>' + acts;
  }
  /* EXIT TICKET SPREAD LEFT */
  if (idx === BOOK.sections.length + 3) {
    var review = shuffle((BOOK.vocabulary || [])).slice(0, 3).map(function (v) { return '<div class="fc" onclick="this.classList.toggle(&#39;flip&#39;);say(&#39;' + esc(v.word) + '&#39;)"><div class="fc-inner"><div class="fc-face fc-front">' + esc(v.emoji || '⭐') + '</div><div class="fc-face fc-back"><b>' + esc(v.word) + '</b><span>' + esc(v.meaning) + '</span></div></div></div>'; }).join('');
    return '<div class="eyebrow">Grand finale</div><h2 class="section-title">🎟️ Exit Mission</h2>' + activityHtml(BOOK.exitTicket || { type: 'reflectionSEL', prompt: 'Share one thing you learned today!', points: 40 }, 'exit') + '<div class="activity"><h3>🔄 Review Sparkles <span class="xp-tag">flip me!</span></h3><p class="prompt">Spaced review makes memories strong. Tap each card to flip and say it aloud.</p><div class="flashcards">' + review + '</div></div>';
  }
  /* TEACHER NOTES (left of back-cover spread) */
  var crit = (BOOK.successCriteria || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
  var notes = (BOOK.teacherNotes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
  return '<div class="eyebrow">For the grown-up helper</div><h2 class="section-title">📝 Teacher &amp; Parent Notes</h2><div class="notes-card"><h4>✅ Success criteria — celebrate these!</h4><ul>' + crit + '</ul></div>' + (notes ? '<div class="notes-card"><h4>💡 Teaching notes</h4><ul>' + notes + '</ul></div>' : '') + '<div class="notes-card"><h4>🏆 Mastered chapters</h4><ul>' + (BOOK.sections || []).map(function (s, i) { return '<li>' + esc(s.title) + (chapterMastered(i) ? ' — mastered ⭐' : '') + '</li>'; }).join('') + '</ul></div>';
}

function rightContent(idx) {
  /* SPREAD 0 RIGHT — art-directed FRONT COVER */
  if (idx === 0) {
    return '<div class="cover-page"><div class="cover-skin"></div><div class="cover-pattern"></div><div class="cover-frame"></div><div class="cover-shimmer"></div><div class="cover-mascot">' + esc((BOOK.mascot && BOOK.mascot.emoji) || '🐾') + '</div><div class="cover-inner"><span class="cover-medal">⭐ Interactive Flipbook • CEFR ' + esc(BOOK.level) + '</span><h1 class="cover-title">' + esc(BOOK.title) + '</h1><p class="cover-sub">' + esc(BOOK.subtitle) + '</p>' + (BOOK.coverImageUrl ? '<div class="cover-art"><img src="' + esc(BOOK.coverImageUrl) + '" alt="' + esc(BOOK.title) + '" onerror="this.style.display=&#39;none&#39;"><div class="arch-glow"></div></div>' : '') + '<button class="cover-open" onclick="beginTurn(&#39;next&#39;)">📖 Open me!</button><span class="bc-badge" style="margin-top:6px">⏱ ' + esc(BOOK.estimatedMinutes || 45) + ' min • ' + (BOOK.sections || []).length + ' chapters • 27 games</span></div></div>';
  }
  /* SPREAD 1 RIGHT — HERO page (after the cover, as it should be) */
  if (idx === 1) {
    var heroName = (BOOK.characters || []).filter(function (c) { return c.archetype === 'Hero' || /brave/i.test(c.name || ''); })[0] || (BOOK.characters || [])[0] || { name: 'Brave Explorer', emoji: '🦸' };
    var cast = (BOOK.characters || []).map(function (c) { return '<div class="character" data-say="' + esc('I am ' + c.name + '. ' + (c.dialogueStyle || '')) + '" data-voice="' + esc(c.azureVoice || '') + '"><span>' + esc(c.emoji) + '</span> ' + esc(c.name) + '</div>'; }).join('');
    return '<div class="hero-listing"><span class="badge">🛡️ Meet your hero</span><div class="hero-ring" data-say="' + esc('Hello! I am ' + heroName.name + '. I am ' + (heroName.dialogueStyle || 'brave and curious') + '!') + '" data-voice="' + esc(heroName.azureVoice || 'en-US-AnaNeural') + '">' + esc(heroName.emoji || BOOK.learnerAvatarEmoji || '🦸') + '</div><h2 class="hero-name">' + esc(heroName.name) + '</h2><span class="pet-chip">🐾 Companion: ' + esc((BOOK.mascot && BOOK.mascot.name) || 'Spark') + ' ' + esc(BOOK.learnerPetEmoji || '') + '</span><div class="cast">' + cast + '</div><div class="dialogue" style="max-width:400px;cursor:default"><span class="demo">' + esc((BOOK.mascot && BOOK.mascot.emoji) || '🐾') + '</span><div><b>' + esc((BOOK.mascot && BOOK.mascot.name) || 'Spark') + ' says • tap to hear</b><div class="dt" data-say="' + esc((BOOK.mascot && BOOK.mascot.catchphrases && BOOK.mascot.catchphrases[0]) || 'Let the quest begin!') + '">“' + esc((BOOK.mascot && BOOK.mascot.catchphrases && BOOK.mascot.catchphrases[0]) || 'Let the quest begin!') + '”</div></div></div><button class="cta" onclick="beginTurn(&#39;next&#39;)">Begin the quest ⚡</button></div>';
  }
  /* SPREAD 2 RIGHT — vocabulary gallery + Mystery Word Lab */
  if (idx === 2) {
    return '<div class="eyebrow">Target vocabulary • Page 6</div><h2 class="section-title">✨ Magic Words (' + (BOOK.vocabulary || []).length + ')</h2><div class="cards">' + (BOOK.vocabulary || []).map(vocabCard).join('') + '</div>' + newLabRound();
  }
  /* CHAPTER SPREADS — story page */
  if (idx >= 3 && idx <= BOOK.sections.length + 2) {
    var si = idx - 3;
    var s = chapterOf(si);
    var media = s.youtubeId ? '<iframe class="video" src="https://www.youtube-nocookie.com/embed/' + esc(s.youtubeId) + '?rel=0" allowfullscreen title="Story video"></iframe>' : (s.imageUrl ? '<img class="media" src="' + esc(s.imageUrl) + '" alt="' + esc(s.title) + '" onerror="this.style.display=&#39;none&#39;">' : '');
    var dia = (s.dialogues || []).map(function (d) { return '<div class="dialogue" data-say="' + esc(d.text) + '" data-voice="' + esc(d.azureVoice || '') + '"><span class="demo">' + esc(d.emoji || '🗣️') + '</span><div><b>' + esc(d.speaker) + ' 🔊</b><div class="dt">“' + esc(d.text) + '”</div></div></div>'; }).join('');
    return '<div class="eyebrow">Story page • Page ' + (idx * 2 + 2) + '</div><h2 class="section-title">' + esc(s.emoji || '📖') + ' ' + esc(s.subtitle || s.title || 'Once upon a time') + '</h2>' + media + '<p class="content">' + esc(s.content || '') + '</p>' + (dia ? '<div class="eyebrow" style="margin-top:10px">🗣️ Tap a bubble to hear it with Azure voices</div>' + dia : '');
  }
  /* CERTIFICATE */
  if (idx === BOOK.sections.length + 3) {
    var mastered = (BOOK.sections || []).filter(function (s, i) { return chapterMastered(i); }).length;
    return '<div class="hero-listing"><div class="ornament">✦ ✦ ✦</div><div style="font-size:64px">🏆</div><div class="cert"><h1>Certificate of Story Mastery</h1><div class="eyebrow">Kingdom Seal • CEFR ' + esc(BOOK.level) + '</div><div class="name">' + esc((BOOK.characters && BOOK.characters[0] && BOOK.characters[0].name) || 'Grand Storyteller') + ' ' + esc(BOOK.learnerAvatarEmoji || '') + ' ' + esc(BOOK.learnerPetEmoji || '') + '</div><p style="font-size:13px;font-weight:700;color:#55445f">For curiosity, brave trying, and completing <b>' + esc(BOOK.title) + '</b>!</p><div class="stats"><div><b id="certXp">' + state.xp + '</b><span>XP earned</span></div><div><b id="certStreak">' + state.bestStreak + '</b><span>Best streak</span></div><div><b>' + mastered + '/' + (BOOK.sections || []).length + '</b><span>Chapters ⭐</span></div></div><button class="cta" onclick="window.print()">🖨 Print my certificate</button></div></div>';
  }
  /* BACK COVER */
  var blurb = BOOK.backCoverBlurb || ('What secrets wait inside ' + (BOOK.title || 'this book') + '? Open the cover and join ' + ((BOOK.characters && BOOK.characters[0] && BOOK.characters[0].name) || 'our hero') + ' on a speaking adventure full of songs, puzzles, and word magic!');
  return '<div class="backcover-page"><div class="cover-skin"></div><div class="cover-pattern"></div><div class="backcover-frame"></div><div class="backcover-inner"><div style="font-size:52px">' + esc((BOOK.mascot && BOOK.mascot.emoji) || '📖') + '</div><h2 style="font-family:Baloo 2;font-size:24px;color:#ffe4a8;margin:0">' + esc(BOOK.title) + '</h2><p class="backcover-blurb">' + esc(blurb) + '</p><div class="bc-badges"><span class="bc-badge">CEFR ' + esc(BOOK.level) + '</span><span class="bc-badge">Ages 6-11</span><span class="bc-badge">' + (BOOK.sections || []).length + ' chapters</span><span class="bc-badge">Azure voices</span></div><div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div class="bc-barcode"></div><span class="bc-tiny">PRINTED IN THE KINGDOM OF WORDS ✦ FLIPBOOK PRESS ✦ SERIES ' + esc(String(BOOK.level || 'A2').toUpperCase()) + '-' + (BOOK.sections || []).length + '</span></div></div></div>';
}
/* ═══ ACTIVITY BUILDERS (15 core + 12 arcade) ═══ */
function typeLabel(t) { var m = { multipleChoice: 'Quiz Quest', trueFalse: 'True or False', matchingPairs: 'Match It!', memoryMatch: 'Memory Flip', listenChoose: 'Listen & Choose', fillBlank: 'Fill the Magic Blank', wordOrderRace: 'Word Order Race', sentenceBuilder: 'Sentence Builder', dragDropSort: 'Sort the Treasures', speakRepeat: 'Repeat After Me', songKaraoke: 'Sing Along', storyChoice: 'Story Choice', writingMission: 'Writing Mission', reflectionSEL: 'Feelings Check-in', realLifeMission: 'Real-Life Mission', spellingBee: 'Spelling Bee', wordSearch: 'Word Search', balloonPop: 'Balloon Pop', whackAMole: 'Whack-a-Mole Words', bingoListener: 'Listening Bingo', spinWheel: 'Magic Wheel', oddOneOut: 'Odd One Out', rhymeMatch: 'Rhyme Time', syllableCount: 'Syllable Claps', drawingPad: 'Pictionary Pad', typingRace: 'Typing Race', flashcardTrainer: 'Flashcard Trainer' }; return m[t] || 'Magic Mission'; }
function fbOf(a) { return { good: a.feedbackCorrect || 'Brilliant work! Your brain just grew!', bad: a.feedbackIncorrect || 'Not yet — try again! Every try teaches you.' }; }
function explBox(a) { var f = fbOf(a); return '<div class="story-outcome" data-expl data-good="' + esc(f.good) + '" data-bad="' + esc(f.bad) + '" style="display:none"></div>'; }
function activityCard(a, key, inner) { return '<div class="activity" data-key="' + esc(key) + '" data-points="' + (a.points || 15) + '"><h3>' + esc(a.emoji || '⭐') + ' ' + esc(a.title || typeLabel(a.type)) + '<span class="xp-tag">+' + (a.points || 15) + ' XP</span></h3>' + (a.prompt ? '<p class="prompt">' + esc(a.prompt) + '</p>' : '') + inner + explBox(a) + (a.mascotTip ? '<p class="prompt" style="margin:8px 0 0">🐾 ' + esc(a.mascotTip) + '</p>' : '') + '</div>'; }
function optGrid(a) { var c = String(correctOf(a)).trim().toLowerCase(); return '<div class="options">' + (a.options || []).map(function (o) { return '<button class="opt"' + (String(o).trim().toLowerCase() === c ? ' data-ok="1"' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>'; }
function genericInner(a) { return '<button class="complete" data-done-key="1">Complete mission ⭐</button>'; }

function activityHtml(a, key) {
  if (!a) return '';
  var t = a.type;
  if (t === 'multipleChoice') return activityCard(a, key, optGrid(a));
  if (t === 'trueFalse') { var ok = correctOf(a) === true; return activityCard(a, key, '<div class="tf"><button class="opt"' + (ok ? ' data-ok="1"' : '') + '>✅ TRUE</button><button class="opt"' + (!ok ? ' data-ok="1"' : '') + '>❌ FALSE</button></div>'); }
  if (t === 'listenChoose') { if (!a.options || !a.options.length) return activityCard(a, key, genericInner(a)); var sayTxt = a.readAloudText || String(correctOf(a) || a.prompt || ''); return activityCard(a, key, '<button class="mic-btn" data-say="' + esc(sayTxt) + '" data-voice="' + esc(a.characterSpeaker || '') + '">🔊 Play the sound (tap to repeat)</button><div style="height:10px"></div>' + optGrid(a)); }
  if (t === 'matchingPairs') { var ps = (a.pairs || []).slice(0, 6); var idxs = ps.map(function (_, i) { return i; }); var L = shuffle(idxs), R = shuffle(idxs); return activityCard(a, key, '<p class="prompt">Tap a word, then tap its match. Match all ' + ps.length + ' pairs!</p><div class="sort-wrap"><div class="pair-col">' + L.map(function (i) { return '<button class="pair-btn" data-pl="' + i + '">' + esc(ps[i].leftEmoji || '') + ' ' + esc(ps[i].left) + '</button>'; }).join('') + '</div><div class="pair-col">' + R.map(function (i) { return '<button class="pair-btn" data-pr="' + i + '">' + esc(ps[i].rightEmoji || '') + ' ' + esc(ps[i].right) + '</button>'; }).join('') + '</div></div>'); }
  if (t === 'memoryMatch') { var ms = (a.pairs || []).slice(0, 6); var cards = []; ms.forEach(function (p, i) { cards.push({ p: i, f: (p.leftEmoji ? p.leftEmoji + ' ' : '') + p.left }); cards.push({ p: i, f: (p.rightEmoji ? p.rightEmoji + ' ' : '') + p.right }); }); cards = shuffle(cards); return activityCard(a, key, '<p class="prompt">Flip two cards. Find every matching pair to win!</p><div class="mem-grid">' + cards.map(function (c) { return '<button class="mem-card" data-p="' + c.p + '" data-face="' + esc(c.f) + '">?</button>'; }).join('') + '</div>'); }
  if (t === 'fillBlank') { var bs = a.blanks || []; return activityCard(a, key, bs.map(function (b, i) { var sent = esc(b.sentence || '___').replace(/___/g, '<span class="fb-slot" data-bi="' + i + '" style="color:#7146c6;font-weight:900">___</span>'); var chs = shuffle((b.choices || []).map(function (c) { return { c: c, ok: String(c).trim().toLowerCase() === String(b.answer).trim().toLowerCase() }; })); return '<div class="fb-blank" data-bi="' + i + '"><div class="fb-sent">' + sent + '</div><div class="fb-choices">' + chs.map(function (x) { return '<button class="chip fb-choice"' + (x.ok ? ' data-ok="1"' : '') + '>' + esc(x.c) + '</button>'; }).join('') + '</div></div>'; }).join('')); }
  if (t === 'wordOrderRace' || t === 'sentenceBuilder') { var tg = a.correctOrder || []; if (!tg.length) return activityCard(a, key, genericInner(a)); var bank = shuffle(tg.concat(a.distractors || [])); return activityCard(a, key, '<p class="prompt">Tap the words in the right order to build the sentence, then check!</p><div class="build-row" data-build></div><div class="chipbank" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' + bank.map(function (w) { return '<button class="chip" data-w="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div><button class="complete build-check" data-target="' + esc(tg.join('~')) + '">Check ✓</button>'); }
  if (t === 'dragDropSort') { var cats = a.categories || []; var flat = a.items && a.items.length ? a.items.slice() : (function () { var arr = []; cats.forEach(function (c) { (c.items || []).forEach(function (it) { arr.push(it); }); }); return shuffle(arr); })(); var items = shuffle(flat); return activityCard(a, key, '<p class="prompt">Tap a treasure, then tap the chest where it belongs!</p><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px" data-itemhost>' + items.map(function (w) { return '<button class="sort-item" data-w="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div><div class="sort-wrap">' + cats.map(function (c, i) { return '<div class="bucket" data-b="' + i + '" data-items="' + esc((c.items || []).join('|')) + '"><h4>' + esc((c.emoji || '') + ' ' + c.name) + '</h4><div class="items"></div></div>'; }).join('') + '</div>'); }
  if (t === 'speakRepeat') { var model = a.readAloudText || a.prompt; return activityCard(a, key, '<div class="dialogue" style="cursor:default"><span class="demo">🗣️</span><div><b>Model • tap to hear</b><div class="dt">“' + esc(model) + '”</div></div></div><button class="say" style="float:none;display:inline-block;margin:6px 0" data-say="' + esc(model) + '" data-voice="' + esc(a.characterSpeaker || '') + '">🔊 Hear it again</button><button class="mic-btn" data-speak-done="1">🎤 Your turn — say it out loud, then tap!</button>'); }
  if (t === 'songKaraoke') { var ly = a.lyrics || []; return activityCard(a, key, '<button class="say" style="float:none;display:inline-block;margin-bottom:8px" data-say="' + esc(ly.join('. ')) + '">🎵 Sing the whole song</button>' + ly.map(function (l) { return '<button class="lyric" data-say="' + esc(l) + '">🎼 ' + esc(l) + '</button>'; }).join('') + '<div style="height:8px"></div><button class="complete" data-done-key="1">I sang it! 🎤</button>'); }
  if (t === 'storyChoice') { return activityCard(a, key, '<div class="options">' + (a.storyChoices || []).map(function (c) { return '<button class="opt story-c" data-best="' + (c.best ? '1' : '') + '" data-outcome="' + esc(c.outcome) + '" data-bonus="' + (c.bonusXp || 0) + '">' + esc(c.choice) + '</button>'; }).join('') + '</div>'); }
  if (t === 'writingMission') { return activityCard(a, key, '<textarea class="mission" data-minw="' + (a.minWords || 8) + '" placeholder="Write your amazing ideas here..."></textarea><div style="height:8px"></div><button class="complete mission-share">Share my writing ⭐</button>'); }
  if (t === 'reflectionSEL') { return activityCard(a, key, '<p class="prompt">Feelings are information, never grades. How do you feel right now?</p><div class="mood-row">' + ['😊', '😃', '😐', '😢', '🤩'].map(function (m) { return '<button class="mood" data-mood="1">' + m + '</button>'; }).join('') + '</div>'); }
  if (t === 'realLifeMission') { return activityCard(a, key, '<p class="prompt">Try these in the real world and check each one off!</p>' + (a.checklist || []).map(function (c) { return '<label class="check-row"><input type="checkbox" data-check="1"> ' + esc(c) + '</label>'; }).join('')); }
  return arcadeHtml(a, key);
}
/* ═══ 12 HIGH-FIDELITY ARCADE GAMES ═══ */
var BALLOON_COLORS = ['#e05252', '#e9ad45', '#41ad65', '#3f7fd9', '#a45ad1', '#e06ba8'];
function buildWsGrid(words, size) {
  size = size || 10;
  var grid = [], r, c;
  for (r = 0; r < size; r++) { grid.push([]); for (c = 0; c < size; c++) grid[r].push(null); }
  var dirs = [[0, 1], [1, 0]];
  var placed = [];
  (words || []).forEach(function (w) {
    w = String(w).toUpperCase().replace(/[^A-Z]/g, '');
    if (!w || w.length > size) return;
    for (var tries = 0; tries < 90; tries++) {
      var dir = dirs[Math.floor(Math.random() * dirs.length)];
      var r0 = Math.floor(Math.random() * size), c0 = Math.floor(Math.random() * size);
      var rEnd = r0 + dir[0] * (w.length - 1), cEnd = c0 + dir[1] * (w.length - 1);
      if (rEnd >= size || cEnd >= size) continue;
      var ok = true;
      for (var i = 0; i < w.length; i++) { if (grid[r0 + dir[0] * i][c0 + dir[1] * i] && grid[r0 + dir[0] * i][c0 + dir[1] * i] !== w[i]) { ok = false; break; } }
      if (ok) { for (var j = 0; j < w.length; j++) grid[r0 + dir[0] * j][c0 + dir[1] * j] = w[j]; placed.push(w); break; }
    }
  });
  var az = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (r = 0; r < size; r++) for (c = 0; c < size; c++) if (!grid[r][c]) grid[r][c] = az[Math.floor(Math.random() * 26)];
  return { grid: grid, placed: placed };
}

function arcadeHtml(a, key) {
  var t = a.type;
  /* 1 — SPELLING BEE: hear it, build it tile by tile */
  if (t === 'spellingBee') {
    var word = String(a.word || (a.pairs && a.pairs[0] && a.pairs[0].left) || (BOOK.vocabulary && BOOK.vocabulary[0] && BOOK.vocabulary[0].word) || 'MAGIC').toUpperCase().replace(/[^A-Z]/g, '');
    var letters = shuffle(word.split('').concat(a.distractorLetters || []));
    return activityCard(a, key, '<div class="bee-hint">' + esc(a.hint || ('Listen and spell the word — ' + word.length + ' letters!')) + '</div><button class="say" style="float:none;display:inline-block;margin-bottom:8px" data-say="' + esc(word) + '">🔊 Hear the word</button><div class="bee-slots" data-slots></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' + letters.map(function (L, i) { return '<button class="bee-tile" data-bt="' + i + '" data-l="' + L + '">' + esc(L) + '</button>'; }).join('') + '</div><button class="complete bee-check" data-bee="' + esc(word) + '">Check my spelling ✓</button>');
  }
  /* 2 — WORD SEARCH */
  if (t === 'wordSearch') {
    var ws = buildWsGrid(a.gridWords || a.items || (BOOK.vocabulary || []).map(function (v) { return v.word; }), 10);
    return activityCard(a, key, '<p class="prompt">Tap the first letter, then the last letter of a word. Words go ➡ and ⬇!</p><div class="ws-grid">' + ws.grid.map(function (row, r) { return row.map(function (ch, c) { return '<button class="ws-cell" data-r="' + r + '" data-c="' + c + '">' + ch + '</button>'; }).join(''); }).join('') + '</div><div class="ws-words">' + ws.placed.map(function (w) { return '<span class="ws-word" data-ws="' + esc(w) + '">' + esc(w) + '</span>'; }).join('') + '</div>');
  }
  /* 3 — BALLOON POP */
  if (t === 'balloonPop') {
    var opts = a.options || [];
    var balloons = shuffle(opts.map(function (o, i) { return { o: o, ok: String(o).trim().toLowerCase() === String(correctOf(a)).trim().toLowerCase(), color: BALLOON_COLORS[i % BALLOON_COLORS.length] }; }));
    return activityCard(a, key, '<p class="prompt">Balloons are floating away! Pop ONLY the one that answers the question.</p><div class="balloon-stage">' + balloons.map(function (b, i) { return '<button class="balloon" data-ok="' + (b.ok ? '1' : '') + '" style="left:' + (4 + i * (88 / Math.max(1, balloons.length - 1))) + '%;--dur:' + (9 + i * 2.3) + 's;--del:' + (i * 0.9) + 's;background:' + b.color + '">' + esc(b.o) + '<span class="string"></span></button>'; }).join('') + '</div>');
  }
  /* 4 — WHACK-A-MOLE WORDS */
  if (t === 'whackAMole') {
    var moles = a.options || [];
    return activityCard(a, key, '<p class="prompt">Moles pop up with words — bonk ONLY the correct one. First to 3 wins!</p><div class="mole-score"><span>🎯 Bonked: <b data-mscore>0</b>/3</span><span>⏱ <b data-mtime>30</b>s</span></div><div class="mole-grid" data-moles="' + esc(moles.join('|')) + '" data-mcorrect="' + esc(String(correctOf(a))) + '">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return '<div class="mole-hole" data-hole="' + i + '"><div class="mole" data-mword=""></div></div>'; }).join('') + '</div>');
  }
  /* 5 — LISTENING BINGO */
  if (t === 'bingoListener') {
    var words9 = (a.gridWords || a.words || a.items || (BOOK.vocabulary || []).map(function (v) { return v.word; })).slice(0, 9);
    return activityCard(a, key, '<div class="bingo-call"><button class="say" style="float:none;display:inline-block" data-bingo-call="1">🔊 Call a word!</button><span class="bingo-called" data-called>Last called: —</span></div><p class="prompt">Listen, then tap the word on your card. Get 3 in a row to shout BINGO!</p><div class="bingo-grid">' + shuffle(words9).map(function (w) { return '<button class="bingo-cell" data-w="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div>');
  }
  /* 6 — SPIN THE MAGIC WHEEL */
  if (t === 'spinWheel') {
    var segs = a.segments || a.items || (BOOK.vocabulary || []).map(function (v) { return v.word; });
    segs = segs.slice(0, 8);
    var n = segs.length;
    var grad = [];
    var wc = ['#7146c6', '#bc4cae', '#e9ad45', '#41ad65', '#3f7fd9', '#e05252', '#0d8f8f', '#f08a3c'];
    for (var gi = 0; gi < n; gi++) grad.push(wc[gi % wc.length] + ' ' + (gi * 360 / n) + 'deg ' + ((gi + 1) * 360 / n) + 'deg');
    return activityCard(a, key, '<p class="prompt">' + esc(a.task || 'Spin the wheel! Say the word 3 times out loud, then tap Done.') + '</p><div class="wheel-wrap"><div class="wheel-pointer">▼</div><div class="wheel" data-wheel data-segs="' + n + '" data-words="' + esc(segs.join('|')) + '" style="background:conic-gradient(' + grad.join(',') + ')"><div class="wheel-label">MAGIC</div></div><div class="wheel-result" data-wres>—</div><button class="cta" data-spin="1">🎡 SPIN!</button><button class="complete" data-done-key="1" style="display:none" data-wdone>I did the task! ⭐</button></div>');
  }
  /* 7 — ODD ONE OUT */
  if (t === 'oddOneOut') {
    return activityCard(a, key, '<p class="prompt">Three belong together — one does not. Tap the odd one out!</p><div class="options">' + shuffle(a.items || []).map(function (it) { return '<button class="opt"' + (String(it) === String(a.odd) ? ' data-ok="1"' : '') + '>' + esc(it) + '</button>'; }).join('') + '</div>');
  }
  /* 8 — RHYME TIME */
  if (t === 'rhymeMatch') {
    return activityCard(a, key, '<button class="say" style="float:none;display:inline-block;margin-bottom:8px" data-say="' + esc(a.word || '') + '">🔊 ' + esc(a.word || 'Listen') + '</button><p class="prompt">Which word rhymes with <b>' + esc(a.word || '') + '</b>?</p>' + optGrid(a));
  }
  /* 9 — SYLLABLE CLAPS */
  if (t === 'syllableCount') {
    var syl = a.syllables || [];
    return activityCard(a, key, '<p class="prompt">Clap the syllables, then tap how many you clapped!</p><div data-syll-step data-sylls="' + esc(JSON.stringify(syl)) + '">' + syllStep(syl, 0) + '</div>');
  }
  /* 10 — PICTIONARY DRAWING PAD */
  if (t === 'drawingPad') {
    var target = a.word || (a.items && a.items[0]) || (BOOK.vocabulary && BOOK.vocabulary[0] && BOOK.vocabulary[0].word) || 'magic';
    return activityCard(a, key, '<p class="prompt">Draw “' + esc(target) + '” on the magic canvas. Tap 🔊 if you need to hear it first!</p><button class="say" style="float:none;display:inline-block;margin-bottom:8px" data-say="' + esc(target) + '">🔊 ' + esc(target) + '</button><div class="draw-wrap"><canvas class="draw-pad" width="600" height="260"></canvas><div class="draw-tools">' + ['#342344', '#e05252', '#e9ad45', '#41ad65', '#3f7fd9', '#a45ad1'].map(function (c, i) { return '<button class="draw-color' + (i === 0 ? ' sel' : '') + '" data-c="' + c + '" style="background:' + c + '"></button>'; }).join('') + '<span style="width:8px"></span>' + [3, 7, 14].map(function (s2, i2) { return '<button class="draw-size' + (i2 === 1 ? ' sel' : '') + '" data-s="' + s2 + '"><span class="draw-dot" style="width:' + s2 + 'px;height:' + s2 + 'px"></span></button>'; }).join('') + '<span style="flex:1"></span><button class="complete draw-clear" style="padding:6px 10px;font-size:11px">Clear</button></div></div><div style="height:8px"></div><button class="complete" data-done-key="1">I drew it! 🎨</button>');
  }
  /* 11 — TYPING RACE */
  if (t === 'typingRace') {
    var tws = (a.items || []).slice(0, 5);
    if (!tws.length) return activityCard(a, key, genericInner(a));
    var secs = a.seconds || 30;
    return activityCard(a, key, '<p class="prompt">Type each word before the timer melts. Go go go!</p><div class="type-bar"><div class="type-bar-fill" data-tbar></div></div><div class="type-word" data-tword>' + esc(tws[0]) + '</div><input class="type-input" data-tinput data-twords="' + esc(JSON.stringify(tws)) + '" data-tsecs="' + secs + '" autocomplete="off" spellcheck="false" placeholder="Type here..."><div class="type-progress" data-tprog>0 / ' + tws.length + ' words</div>');
  }
  /* 12 — FLASHCARD TRAINER */
  if (t === 'flashcardTrainer') {
    var cards = (a.pairs || (BOOK.vocabulary || []).slice(0, 5).map(function (v) { return { left: v.word, right: v.meaning }; })).slice(0, 6).map(function (p, i) { return { w: p.left, m: p.right, i: i }; });
    return activityCard(a, key, '<div class="fc-count" data-ftcount></div><div data-ftstep data-cards="' + esc(JSON.stringify(cards)) + '">' + ftStep(cards, 0) + '</div>');
  }
  return activityCard(a, key, genericInner(a));
}
function syllStep(syl, i) {
  if (!syl || !syl.length) return '';
  if (i >= syl.length) return '<p class="prompt" style="margin:0">🎉 All clapped! Brilliant rhythm!</p>';
  var cur = syl[i];
  return '<div class="syll-word" data-syll-i="' + i + '">' + esc(cur.word) + '</div><div style="text-align:center"><button class="say" style="float:none;display:inline-block" data-say="' + esc(cur.word) + '">🔊 hear it</button></div><div class="syll-btns">' + [1, 2, 3, 4, 5].map(function (n) { return '<button class="syll-btn" data-n="' + n + '" data-expect="' + cur.count + '">' + n + '</button>'; }).join('') + '</div><div class="type-progress">Word ' + (i + 1) + ' of ' + syl.length + '</div>';
}
function ftStep(cards, i, known) {
  if (!cards || !cards.length) return '';
  if (i >= cards.length) return '';
  var c = cards[i];
  return '<div class="fc-big" data-ft-w="' + esc(c.w) + '"><div class="fc-big-inner"><div class="fc-big-face fc-big-front"><span class="em">🃏</span>' + esc(c.w) + '<span style="font-size:11px;opacity:.85">tap to flip</span></div><div class="fc-big-face fc-big-back">' + esc(c.m) + '</div></div></div><div class="fc-btns"><button class="fc-know" data-ftknow="1">✅ Know it!</button><button class="fc-again" data-ftagain="1">🔁 Practice again</button></div>';
}
/* ═══ TRUE 3D LEAF ENGINE — flips ONLY from narrow page edges ═══ */
var INTERACTIVE_SEL = 'button,a,input,textarea,select,canvas,.opt,.chip,.mem-card,.pair-btn,.sort-item,.bucket,.mole,.bingo-cell,.ws-cell,.bee-tile,.balloon,.mood,.lyric,.fc,.fc-big,.dialogue,.wheel,.type-input';
var EDGE_W = 70;
var leaf = $('leaf'), leafFront = $('leafFront'), leafBack = $('leafBack'), leafShade = $('leafShade'), book = $('book');
function applyLeaf(deg, dur) { leaf.style.transition = dur ? ('transform ' + dur + 's cubic-bezier(0.32,0.72,0.24,1)') : 'none'; leaf.style.transform = 'rotateY(' + deg + 'deg)'; }
function fillLeaf(dir) { var frontIdx = dir === 'next' ? state.spread : state.spread - 1; var backIdx = dir === 'next' ? state.spread + 1 : state.spread; leafFront.innerHTML = '<div class="page page-r" style="height:100%">' + rightContent(frontIdx) + '</div><div class="gutter"></div>'; leafBack.innerHTML = '<div class="page page-l" style="height:100%">' + leftContent(backIdx) + '</div><div class="gutter"></div>'; }
function showBeneath(dir) { $('pageL').innerHTML = leftContent(dir === 'prev' ? state.spread - 1 : state.spread); $('pageR').innerHTML = rightContent(dir === 'next' ? state.spread + 1 : state.spread); }
function finalizeTurn(dir) { state.spread += dir === 'next' ? 1 : -1; leaf.classList.remove('on'); leafShade.style.opacity = 0; state.turning = null; state.busy = false; peekDir = null; renderPage(); }
function beginTurn(dir) {
  if (state.busy || state.turning) return;
  if (dir === 'next' && state.spread >= state.total - 1) return;
  if (dir === 'prev' && state.spread <= 0) return;
  state.busy = true; state.turning = dir; peekDir = null; pageTurnSound();
  fillLeaf(dir); showBeneath(dir);
  leaf.classList.add('on');
  applyLeaf(dir === 'next' ? 0 : -180, false);
  void leaf.offsetWidth;
  applyLeaf(dir === 'next' ? -180 : 0, 0.85);
  var done = false;
  var finish = function () { if (done) return; done = true; leaf.removeEventListener('transitionend', finish); finalizeTurn(dir); };
  leaf.addEventListener('transitionend', finish);
  setTimeout(finish, 1000);
}

/* Hover curl peek: bring the mouse close to an edge and the page curls up — never covering content */
var peekDir = null;
function edgeDir(e) {
  var rect = book.getBoundingClientRect();
  var x = e.clientX - rect.left;
  if (x < EDGE_W) return 'prev';
  if (x > rect.width - EDGE_W) return 'next';
  return null;
}
function isInteractive(t) { return !!(t && t.closest && t.closest(INTERACTIVE_SEL)); }
function clearPeek() { if (peekDir) { peekDir = null; leaf.classList.remove('on'); } }
book.addEventListener('pointermove', function (e) {
  if (drag || state.busy || state.turning) { clearPeek(); return; }
  var t = e.target;
  var dir = edgeDir(e);
  if (!dir || isInteractive(t) || (dir === 'next' && state.spread >= state.total - 1) || (dir === 'prev' && state.spread <= 0)) { clearPeek(); return; }
  if (peekDir !== dir) { peekDir = dir; fillLeaf(dir); leaf.classList.add('on'); applyLeaf(dir === 'next' ? 0 : -180, false); void leaf.offsetWidth; applyLeaf(dir === 'next' ? -14 : -166, 0.28); }
});
book.addEventListener('pointerleave', function () { if (!drag && !state.turning) clearPeek(); });

/* Drag-to-flip: press INSIDE an edge strip (on blank paper, never on a game) and drag */
var drag = null;
book.addEventListener('pointerdown', function (e) {
  var t = e.target;
  if (isInteractive(t)) return;
  if (state.busy || state.turning || drag) return;
  var dir = edgeDir(e);
  if (!dir) return;
  if (dir === 'next' && state.spread >= state.total - 1) return;
  if (dir === 'prev' && state.spread <= 0) return;
  var rect = book.getBoundingClientRect();
  var pageW = window.innerWidth < 780 ? rect.width : rect.width / 2;
  drag = { dir: dir, startX: e.clientX, pageW: pageW, lastX: e.clientX, lastT: performance.now(), vel: 0, deg: dir === 'next' ? 0 : -180 };
  peekDir = null;
  fillLeaf(dir); showBeneath(dir);
  leaf.classList.add('on');
  applyLeaf(dir === 'next' ? 0 : -180, false);
  paperWhoosh(0.5);
  if (e.cancelable) e.preventDefault();
});
window.addEventListener('pointermove', function (e) {
  if (!drag) return;
  var now = performance.now();
  drag.vel = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT);
  drag.lastX = e.clientX; drag.lastT = now;
  var delta = e.clientX - drag.startX;
  var raw = drag.dir === 'next' ? (delta / drag.pageW) * 180 : -180 + (delta / drag.pageW) * 180;
  var deg = Math.min(0, Math.max(-180, raw));
  drag.deg = deg;
  leafShade.style.opacity = Math.min(0.85, Math.abs(deg) / 160);
  applyLeaf(deg, false);
});
function endDrag() {
  if (!drag) return;
  var d = drag; drag = null;
  var deg = d.deg == null ? (d.dir === 'next' ? 0 : -180) : d.deg;
  var flick = d.dir === 'next' ? d.vel < -0.45 : d.vel > 0.45;
  var complete = Math.abs(deg) > 92 || flick;
  var target = complete ? (d.dir === 'next' ? -180 : 0) : (d.dir === 'next' ? 0 : -180);
  if (complete) { paperFlick(1); paperSettle(); }
  leafShade.style.opacity = 0;
  applyLeaf(target, 0.45);
  var done = false;
  var finish = function () { if (done) return; done = true; leaf.removeEventListener('transitionend', finish); if (complete) finalizeTurn(d.dir); else { leaf.classList.remove('on'); renderPage(); } };
  leaf.addEventListener('transitionend', finish);
  setTimeout(finish, 650);
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

/* ═══ GAME RUNTIMES ═══ */
function initMole(card) {
  var gridEl = card.querySelector('.mole-grid'); if (!gridEl) return;
  var words = (gridEl.getAttribute('data-moles') || '').split('|').filter(Boolean);
  if (!words.length) return;
  var correct = gridEl.getAttribute('data-mcorrect') || '';
  var time = 30;
  card._moleScore = 0;
  card._moleTimer = setInterval(function () {
    if (!document.contains(card)) { clearInterval(card._moleTimer); return; }
    var holes = card.querySelectorAll('.mole'); if (!holes.length) return;
    var pick = holes[Math.floor(Math.random() * holes.length)];
    if (pick.classList.contains('up')) return;
    var w = (Math.random() < 0.38 && correct) ? correct : words[Math.floor(Math.random() * words.length)];
    pick.textContent = w; pick.setAttribute('data-mword', w);
    pick.classList.remove('bonk', 'miss-m'); pick.classList.add('up');
    setTimeout(function () { if (document.contains(pick)) pick.classList.remove('up'); }, 1150);
  }, 800);
  card._moleClock = setInterval(function () {
    if (!document.contains(card)) { clearInterval(card._moleClock); return; }
    time--; var t = card.querySelector('[data-mtime]'); if (t) t.textContent = time;
    if (time <= 0) { clearInterval(card._moleClock); clearInterval(card._moleTimer); bubble('Time is up! Flip away and back for a rematch! 💪'); }
  }, 1000);
}
function stopMole(card) { clearInterval(card._moleTimer); clearInterval(card._moleClock); }
function initTyping(card) {
  var inp0 = card.querySelector('.type-input'); if (!inp0) return;
  var words = []; try { words = JSON.parse(inp0.getAttribute('data-twords') || '[]'); } catch (e) { }
  if (!words.length) return;
  var secs = parseInt(inp0.getAttribute('data-tsecs') || '30', 10);
  var remain = secs * 1000;
  card._ti = 0;
  var inp = card.querySelector('.type-input');
  card._typeTimer = setInterval(function () {
    if (!document.contains(card)) { clearInterval(card._typeTimer); return; }
    remain -= 250;
    var bar = card.querySelector('[data-tbar]'); if (bar) bar.style.width = Math.max(0, (remain / (secs * 1000)) * 100) + '%';
    if (remain <= 0) { clearInterval(card._typeTimer); if (inp) inp.disabled = true; buzz(); bubble('Time is up! Flip away and back for a rematch! ⏱'); }
  }, 250);
  setTimeout(function () { if (document.contains(inp)) inp.focus({ preventScroll: true }); }, 350);
}

/* ═══ PAGE RENDER + NAVIGATION ═══ */
function renderPage() {
  $('pageL').innerHTML = leftContent(state.spread);
  $('pageR').innerHTML = rightContent(state.spread);
  document.querySelectorAll('.activity[data-key]').forEach(function (card) {
    var k = card.getAttribute('data-key');
    if (state.awarded[k]) { card.classList.add('done-act'); var tag = card.querySelector('.xp-tag'); if (tag) tag.textContent = '✅ Done!'; }
  });
  document.querySelectorAll('.activity').forEach(function (card) {
    if (card._hbInited) return; card._hbInited = true;
    if (card.querySelector('.mole-grid')) initMole(card);
    if (card.querySelector('.type-input')) initTyping(card);
    var ft = card.querySelector('[data-ftcount]');
    if (ft) { var ftN = 0; try { ftN = JSON.parse(card.querySelector('[data-ftstep]').getAttribute('data-cards') || '[]').length; } catch (eFT) { } ft.textContent = 'Known: 0 / ' + ftN + ' — flip, say it out loud, then decide!'; }
  });
  $('progressFill').style.width = (((state.spread + 1) / state.total) * 100) + '%';
  var dots = ''; for (var i = 0; i < state.total; i++) dots += '<span class="dot' + (i === state.spread ? ' active' : '') + '"></span>';
  $('dots').innerHTML = dots;
  $('prevBtn').disabled = state.spread <= 0;
  $('nextBtn').disabled = state.spread >= state.total - 1;
  $('cornerNext').style.display = state.spread < state.total - 1 ? 'block' : 'none';
  $('cornerPrev').style.display = state.spread > 0 ? 'block' : 'none';
  $('pageL').scrollTop = 0; $('pageR').scrollTop = 0;
}
function readPageAloud() {
  var t = '';
  if (state.spread === 0) t = BOOK.title + '. ' + (BOOK.subtitle || '');
  else if (state.spread === 1) t = 'Meet your hero! Your quest map shows everything you will master. Are you ready, brave explorer?';
  else if (state.spread === 2) t = 'Magic words. ' + (BOOK.vocabulary || []).map(function (v) { return v.word + '. ' + v.meaning; }).join('. ');
  else if (state.spread <= BOOK.sections.length + 2) { var s = BOOK.sections[state.spread - 3] || {}; t = s.readAloudText || s.content || s.title || ''; }
  else if (state.spread === BOOK.sections.length + 3) t = (BOOK.exitTicket && BOOK.exitTicket.prompt) || 'You finished your quest. Well done!';
  else t = BOOK.backCoverBlurb || BOOK.title;
  if (t) say(t);
}

/* ═══ EVENT DELEGATION — one listener grades every game ═══ */
function actOf(el) { return el.closest('.activity'); }
function ptsOf(act) { return parseInt(act.getAttribute('data-points') || '15', 10); }
function keyOf(act) { return act.getAttribute('data-key'); }
function succeed(act, extraMsg) {
  if (keyOf(act) && state.awarded[keyOf(act)]) return;
  if (act._moleTimer) stopMole(act);
  if (act._typeTimer) clearInterval(act._typeTimer);
  var box = act.querySelector('[data-expl]');
  if (box) { box.style.display = 'block'; box.textContent = '🎉 ' + (box.getAttribute('data-good') || 'Brilliant work!') + (extraMsg ? ' ' + extraMsg : ''); }
  award(ptsOf(act), keyOf(act));
}
var pairSel = null, memSel = null, memLock = false, sortSel = null, wsSel = null;
var drawColor = '#342344', drawSize = 7, drawing = false, drawEl = null, drawLast = null;
document.addEventListener('click', function (e) {
  var t = e.target;
  if (!t || !t.closest) return;
  var el, act, box;
  el = t.closest('[data-say]');
  if (el) { say(el.getAttribute('data-say'), el.getAttribute('data-voice')); pop(); return; }
  el = t.closest('[data-speak-done]');
  if (el) { act = actOf(el); succeed(act); return; }
  el = t.closest('[data-done-key]');
  if (el) { act = actOf(el); el.disabled = true; el.classList.add('done'); el.textContent = 'Completed! ✅'; award(ptsOf(act), keyOf(act)); return; }
  el = t.closest('.story-c');
  if (el) {
    act = actOf(el); box = act.querySelector('[data-expl]');
    box.style.display = 'block'; box.textContent = el.getAttribute('data-outcome');
    if (el.getAttribute('data-best') === '1') { succeed(act, '(+ bonus for the wisest choice!)'); act.querySelectorAll('.story-c').forEach(function (b) { b.disabled = true; }); }
    else { miss(); el.disabled = true; }
    return;
  }
  el = t.closest('.lab-opt');
  if (el) {
    if (!lab.answer) return;
    if (el.getAttribute('data-w') === lab.answer.word) {
      el.classList.add('correct');
      el.closest('#labBox').querySelectorAll('.lab-opt').forEach(function (b) { b.disabled = true; });
      award(15, 'lab-' + lab.answer.word);
      setTimeout(function () { var lb = $('labBox'); if (lb) { var fresh = document.createElement('div'); fresh.innerHTML = newLabRound(); var node = fresh.firstChild; if (node) lb.replaceWith(node); } }, 1100);
    } else { el.classList.add('wrong'); setTimeout(function () { el.classList.remove('wrong'); }, 600); miss(); }
    return;
  }
  el = t.closest('.bee-tile');
  if (el) {
    if (el.classList.contains('used')) return;
    el.classList.add('used');
    var slot = document.createElement('span'); slot.className = 'bee-slot'; slot.textContent = el.getAttribute('data-l'); slot.setAttribute('data-bt', el.getAttribute('data-bt'));
    el.closest('.activity').querySelector('[data-slots]').appendChild(slot); pop(); return;
  }
  el = t.closest('.bee-slot');
  if (el) {
    var bt = el.getAttribute('data-bt'); el.remove();
    var tile = actOf(el).querySelector('.bee-tile[data-bt="' + bt + '"]'); if (tile) tile.classList.remove('used'); pop(); return;
  }
  el = t.closest('.bee-check');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    var built = ''; act.querySelectorAll('.bee-slot').forEach(function (s) { built += s.textContent; });
    if (built.toUpperCase() === String(el.getAttribute('data-bee') || '').toUpperCase()) succeed(act);
    else { var sl = act.querySelector('[data-slots]'); sl.style.animation = 'shake .4s'; setTimeout(function () { sl.style.animation = ''; }, 450); miss(); }
    return;
  }
  el = t.closest('.ws-cell');
  if (el) {
    if (el.classList.contains('found')) return;
    act = actOf(el);
    if (!wsSel) { wsSel = el; el.classList.add('sel'); pop(); return; }
    if (wsSel === el) { wsSel.classList.remove('sel'); wsSel = null; return; }
    var r1 = +wsSel.getAttribute('data-r'), c1 = +wsSel.getAttribute('data-c'), r2 = +el.getAttribute('data-r'), c2 = +el.getAttribute('data-c');
    var word = '';
    if (r1 === r2 && c1 !== c2) { for (var cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++) word += act.querySelector('.ws-cell[data-r="' + r1 + '"][data-c="' + cc + '"]').textContent; }
    else if (c1 === c2 && r1 !== r2) { for (var rr = Math.min(r1, r2); rr <= Math.max(r1, r2); rr++) word += act.querySelector('.ws-cell[data-r="' + rr + '"][data-c="' + c1 + '"]').textContent; }
    var rev = word.split('').reverse().join('');
    var target2 = null;
    act.querySelectorAll('.ws-word:not(.found)').forEach(function (wEl) { if (wEl.getAttribute('data-ws') === word || wEl.getAttribute('data-ws') === rev) target2 = wEl; });
    wsSel.classList.remove('sel');
    if (target2) {
      var cells = [];
      if (r1 === r2) { for (var cc2 = Math.min(c1, c2); cc2 <= Math.max(c1, c2); cc2++) cells.push(act.querySelector('.ws-cell[data-r="' + r1 + '"][data-c="' + cc2 + '"]')); }
      else { for (var rr2 = Math.min(r1, r2); rr2 <= Math.max(r1, r2); rr2++) cells.push(act.querySelector('.ws-cell[data-r="' + rr2 + '"][data-c="' + c1 + '"]')); }
      cells.forEach(function (cel) { cel.classList.remove('sel'); cel.classList.add('found'); });
      target2.classList.add('found'); chime(); wsSel = null;
      if (!act.querySelector('.ws-word:not(.found)')) succeed(act);
    } else { el.classList.add('wrong'); wsSel.classList.add('wrong'); setTimeout(function () { el.classList.remove('wrong'); wsSel = null; var w2 = actOf(el).querySelector('.ws-cell.wrong'); if (w2) w2.classList.remove('wrong'); }, 500); miss(); }
    return;
  }
  el = t.closest('.balloon');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    if (el.getAttribute('data-ok') === '1') { el.classList.add('pop'); balloonPopSfx(); setTimeout(function () { succeed(act); }, 350); }
    else { el.classList.add('wob'); balloonPopSfx(); setTimeout(function () { el.classList.remove('wob'); }, 420); miss(); }
    return;
  }
  el = t.closest('.mole');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    var mgrid = el.closest('.mole-grid');
    if (el.getAttribute('data-mword') === (mgrid ? mgrid.getAttribute('data-mcorrect') : '')) {
      el.classList.add('bonk'); chime();
      act._moleScore = (act._moleScore || 0) + 1;
      var sc = act.querySelector('[data-mscore]'); if (sc) sc.textContent = act._moleScore;
      if (act._moleScore >= 3) { stopMole(act); tada(); succeed(act); }
    } else if (el.classList.contains('up')) { el.classList.add('miss-m'); boing(); miss(); setTimeout(function () { el.classList.remove('miss-m'); }, 400); }
    return;
  }
  el = t.closest('[data-bingo-call]');
  if (el) {
    act = actOf(el);
    if (!act._called) act._called = {};
    var cellsB = Array.prototype.slice.call(act.querySelectorAll('.bingo-cell'));
    var left = cellsB.map(function (b) { return b.getAttribute('data-w'); }).filter(function (w) { return !act._called[w]; });
    if (!left.length) { bubble('All words called — tap the ones you heard!'); return; }
    var w2 = left[Math.floor(Math.random() * left.length)];
    act._called[w2] = true; act._lastCalled = w2;
    say(w2); pop();
    var cl = act.querySelector('[data-called]'); if (cl) cl.textContent = 'Last called: ' + w2;
    return;
  }
  el = t.closest('.bingo-cell');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)] || el.classList.contains('marked')) return;
    var w3 = el.getAttribute('data-w');
    if (!act._called || !act._called[w3]) { el.style.animation = 'shake .4s'; setTimeout(function () { el.style.animation = ''; }, 450); miss(); return; }
    el.classList.add('marked'); chime();
    var cellsC = Array.prototype.slice.call(act.querySelectorAll('.bingo-cell'));
    var marked = cellsC.map(function (b) { return b.classList.contains('marked'); });
    var lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    var won = lines.some(function (L) { return marked[L[0]] && marked[L[1]] && marked[L[2]]; });
    if (won) { tada(); succeed(act, 'BINGO!'); }
    return;
  }
  el = t.closest('[data-spin]');
  if (el) {
    act = actOf(el);
    var wheel = act.querySelector('[data-wheel]');
    var rot = (parseInt(act.getAttribute('data-rot') || '0', 10)) + 1440 + Math.floor(Math.random() * 360);
    act.setAttribute('data-rot', String(rot));
    wheel.style.transform = 'rotate(' + rot + 'deg)';
    var ticks = setInterval(tickTock, 140);
    setTimeout(function () { clearInterval(ticks); }, 3500);
    setTimeout(function () {
      var n = parseInt(wheel.getAttribute('data-segs') || '6', 10);
      var idx = Math.floor(((360 - (rot % 360)) % 360) / (360 / n)) % n;
      var segs = (wheel.getAttribute('data-words') || '').split('|');
      var word = segs[idx] || 'magic';
      var res = act.querySelector('[data-wres]'); if (res) res.textContent = word;
      say(word, null, 1.2, 0.9);
      var dn = act.querySelector('[data-wdone]'); if (dn) dn.style.display = 'inline-block';
      tada();
    }, 3700);
    return;
  }
  el = t.closest('.syll-btn');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    var syls = []; try { syls = JSON.parse(act.querySelector('[data-syll-step]').getAttribute('data-sylls') || '[]'); } catch (er) { }
    var i = parseInt(act.getAttribute('data-syi') || '0', 10);
    if (+el.getAttribute('data-n') === +el.getAttribute('data-expect')) {
      clapSfx(+el.getAttribute('data-n'));
      i++;
      if (i >= syls.length) { succeed(act); act.querySelector('[data-syll-step]').innerHTML = syllStep(syls, syls.length); }
      else { act.setAttribute('data-syi', String(i)); act.querySelector('[data-syll-step]').innerHTML = syllStep(syls, i); }
    } else { el.style.animation = 'shake .4s'; setTimeout(function () { el.style.animation = ''; }, 450); miss(); }
    return;
  }
  el = t.closest('.fc-big');
  if (el) { el.classList.toggle('flip'); paperFlick(0.6); return; }
  el = t.closest('.fc-know');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    var cards2 = []; try { cards2 = JSON.parse(act.querySelector('[data-ftstep]').getAttribute('data-cards') || '[]'); } catch (er2) { }
    var fi = parseInt(act.getAttribute('data-fti') || '0', 10) + 1;
    var known2 = parseInt(act.getAttribute('data-ftk') || '0', 10) + 1;
    act.setAttribute('data-fti', String(fi)); act.setAttribute('data-ftk', String(known2));
    var cnt = act.querySelector('[data-ftcount]'); if (cnt) cnt.textContent = 'Known: ' + known2 + ' / ' + cards2.length;
    if (fi >= cards2.length) { sparkleSfx(); succeed(act); }
    else { act.querySelector('[data-ftstep]').innerHTML = ftStep(cards2, fi); pop(); }
    return;
  }
  el = t.closest('.fc-again');
  if (el) {
    act = actOf(el);
    var cards3 = []; try { cards3 = JSON.parse(act.querySelector('[data-ftstep]').getAttribute('data-cards') || '[]'); } catch (er3) { }
    var fi3 = parseInt(act.getAttribute('data-fti') || '0', 10);
    act.querySelector('[data-ftstep]').innerHTML = ftStep(cards3, fi3);
    boing(); return;
  }
  el = t.closest('.draw-color');
  if (el) { drawColor = el.getAttribute('data-c'); el.parentElement.querySelectorAll('.draw-color').forEach(function (b) { b.classList.remove('sel'); }); el.classList.add('sel'); pop(); return; }
  el = t.closest('.draw-size');
  if (el) { drawSize = +el.getAttribute('data-s'); el.parentElement.querySelectorAll('.draw-size').forEach(function (b) { b.classList.remove('sel'); }); el.classList.add('sel'); pop(); return; }
  el = t.closest('.draw-clear');
  if (el) { var cv = actOf(el).querySelector('.draw-pad'); if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); pop(); return; }
  el = t.closest('.mission-share');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    var ta = act.querySelector('textarea.mission');
    var min = parseInt(ta.getAttribute('data-minw') || '8', 10);
    var words4 = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    if (words4 >= min) succeed(act);
    else bubble('Write a little more — you have ' + words4 + '/' + min + ' words. You can do it! 💪');
    return;
  }
  el = t.closest('.mood');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    act.querySelectorAll('.mood').forEach(function (m) { m.classList.remove('sel'); });
    el.classList.add('sel'); succeed(act);
    return;
  }
  el = t.closest('.opt');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    if (el.hasAttribute('data-ok')) {
      el.classList.add('correct');
      act.querySelectorAll('.opt').forEach(function (b) { b.disabled = true; });
      succeed(act);
    } else { el.classList.add('wrong'); setTimeout(function () { el.classList.remove('wrong'); }, 650); miss(); }
    return;
  }
  el = t.closest('.fb-choice');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    var blank = el.closest('.fb-blank');
    if (el.hasAttribute('data-ok')) {
      var slot2 = blank.querySelector('.fb-slot');
      if (slot2) slot2.textContent = el.textContent;
      blank.classList.add('solved');
      blank.querySelectorAll('.chip').forEach(function (c) { c.disabled = true; });
      el.classList.add('correct'); pop();
      if (act.querySelectorAll('.fb-blank.solved').length >= act.querySelectorAll('.fb-blank').length) succeed(act);
    } else { el.classList.add('wrong'); setTimeout(function () { el.classList.remove('wrong'); }, 600); miss(); }
    return;
  }
  el = t.closest('.mem-card');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)] || memLock || el.classList.contains('match') || el === memSel) return;
    el.classList.add('flip'); el.textContent = el.getAttribute('data-face');
    if (!memSel) { memSel = el; pop(); return; }
    var a1 = memSel; memSel = null;
    if (a1.getAttribute('data-p') === el.getAttribute('data-p')) {
      a1.classList.add('match'); el.classList.add('match');
      a1.classList.remove('flip'); el.classList.remove('flip');
      chime();
      if (act.querySelectorAll('.mem-card.match').length / 2 >= act.querySelectorAll('.mem-card').length / 2) succeed(act);
    } else {
      memLock = true; miss();
      setTimeout(function () { a1.classList.remove('flip'); a1.textContent = '?'; el.classList.remove('flip'); el.textContent = '?'; memLock = false; }, 850);
    }
    return;
  }
  el = t.closest('.pair-btn');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    if (el.hasAttribute('data-pl')) { if (pairSel) pairSel.classList.remove('sel'); pairSel = el; el.classList.add('sel'); pop(); return; }
    if (el.hasAttribute('data-pr')) {
      if (!pairSel) { bubble('Pick a word on the left first!'); return; }
      if (pairSel.getAttribute('data-pl') === el.getAttribute('data-pr')) {
        pairSel.classList.remove('sel'); pairSel.classList.add('match'); el.classList.add('match');
        pairSel.disabled = true; el.disabled = true; pairSel = null; chime();
        if (act.querySelectorAll('.pair-btn.match').length / 2 >= act.querySelectorAll('.pair-btn').length / 2) succeed(act);
      } else { el.classList.add('wrong'); setTimeout(function () { el.classList.remove('wrong'); }, 600); miss(); }
      return;
    }
  }
  el = t.closest('.sort-item');
  if (el) {
    if (el.classList.contains('used') || el.classList.contains('placed')) return;
    if (sortSel === el) { el.classList.remove('selected'); sortSel = null; return; }
    if (sortSel) sortSel.classList.remove('selected');
    sortSel = el; el.classList.add('selected'); pop(); return;
  }
  el = t.closest('.bucket');
  if (el && sortSel) {
    act = actOf(el);
    var wS = sortSel.getAttribute('data-w');
    var itemsL = (el.getAttribute('data-items') || '').split('|');
    if (itemsL.indexOf(wS) > -1) {
      var span = document.createElement('span'); span.className = 'sort-item placed'; span.textContent = wS;
      el.querySelector('.items').appendChild(span);
      sortSel.classList.add('used'); sortSel.classList.remove('selected'); sortSel = null;
      chime();
      if (act.querySelectorAll('.sort-item:not(.used)').length === 0) succeed(act);
    } else { el.style.animation = 'shake .4s'; setTimeout(function () { el.style.animation = ''; }, 450); miss(); }
    return;
  }
  el = t.closest('.built-chip');
  if (el) { var bankBox = actOf(el).querySelector('.chipbank'); if (bankBox) bankBox.appendChild(el); el.classList.remove('built-chip'); pop(); return; }
  el = t.closest('.chip');
  if (el && el.hasAttribute('data-w') && !el.classList.contains('fb-choice')) {
    var row = actOf(el).querySelector('[data-build]');
    if (row) { el.classList.add('built-chip'); row.appendChild(el); pop(); }
    return;
  }
  el = t.closest('.build-check');
  if (el) {
    act = actOf(el);
    if (keyOf(act) && state.awarded[keyOf(act)]) return;
    var built2 = [];
    act.querySelectorAll('[data-build] .built-chip').forEach(function (c) { built2.push(c.getAttribute('data-w')); });
    var target3 = (el.getAttribute('data-target') || '').split('~');
    if (built2.length && built2.join(' ').trim().toLowerCase() === target3.join(' ').trim().toLowerCase()) succeed(act);
    else { var rowEl = act.querySelector('[data-build]'); rowEl.style.animation = 'shake .4s'; setTimeout(function () { rowEl.style.animation = ''; }, 450); miss(); }
    return;
  }
});
document.addEventListener('input', function (e) {
  var t = e.target;
  if (!t || !t.matches || !t.matches('.type-input')) return;
  var act = t.closest('.activity');
  if (!act || (keyOf(act) && state.awarded[keyOf(act)])) return;
  var inpEl = act.querySelector('.type-input'); var words5 = []; try { words5 = JSON.parse((inpEl ? inpEl.getAttribute('data-twords') : '[]') || '[]'); } catch (e5) { }
  var ti = parseInt(act.getAttribute('data-ti') || '0', 10);
  if (t.value.trim().toLowerCase() === String(words5[ti] || '').toLowerCase()) {
    tone(880, 0.1, 'triangle', 0.05);
    ti++;
    act.setAttribute('data-ti', String(ti));
    t.value = '';
    var wEl = act.querySelector('[data-tword]'); var pEl = act.querySelector('[data-tprog]');
    if (ti >= words5.length) { if (pEl) pEl.textContent = words5.length + ' / ' + words5.length + ' words'; if (act._typeTimer) clearInterval(act._typeTimer); succeed(act); }
    else { if (wEl) wEl.textContent = words5[ti]; if (pEl) pEl.textContent = ti + ' / ' + words5.length + ' words'; }
  }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (!t || !t.matches || !t.matches('input[data-check]')) return;
  var act = t.closest('.activity');
  if (!act || (keyOf(act) && state.awarded[keyOf(act)])) return;
  var all = true;
  act.querySelectorAll('input[data-check]').forEach(function (b) { if (!b.checked) all = false; });
  if (all) succeed(act); else pop();
});
/* Drawing pad — pointer painting on the canvas */
document.addEventListener('pointerdown', function (e) {
  var t = e.target;
  if (!t || !t.closest || !t.closest('.draw-pad')) return;
  drawEl = t.closest('.draw-pad');
  var r = drawEl.getBoundingClientRect();
  drawing = true;
  drawLast = { x: (e.clientX - r.left) * (drawEl.width / r.width), y: (e.clientY - r.top) * (drawEl.height / r.height) };
  if (e.cancelable) e.preventDefault();
});
window.addEventListener('pointermove', function (e) {
  if (!drawing || !drawEl) return;
  var ctx2 = drawEl.getContext('2d');
  var r = drawEl.getBoundingClientRect();
  var x = (e.clientX - r.left) * (drawEl.width / r.width), y = (e.clientY - r.top) * (drawEl.height / r.height);
  ctx2.strokeStyle = drawColor; ctx2.lineWidth = drawSize; ctx2.lineCap = 'round'; ctx2.lineJoin = 'round';
  ctx2.beginPath(); ctx2.moveTo(drawLast.x, drawLast.y); ctx2.lineTo(x, y); ctx2.stroke();
  drawLast = { x: x, y: y };
});
window.addEventListener('pointerup', function () { drawing = false; });
window.addEventListener('keydown', function (e) {
  if (e.target && e.target.matches && e.target.matches('.type-input,textarea,input')) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); beginTurn('next'); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); beginTurn('prev'); }
});

/* ═══ INIT ═══ */
(function init() {
  $('bookTitle').textContent = BOOK.title || 'Flipbook';
  var SKIN_MAP = { 'English Lesson': 'skin-english', 'Story Lesson': 'skin-story', 'Song Lesson': 'skin-song', 'Vocabulary Quest': 'skin-vocabulary', 'Grammar Quest': 'skin-grammar', 'Speaking Mission': 'skin-speaking', 'Reading Mission': 'skin-reading', 'Phonics Lab': 'skin-phonics' };
  document.body.classList.add(SKIN_MAP[BOOK.contentType] || 'skin-english');
  var rings = ''; for (var i = 0; i < 10; i++) rings += '<div class="ring"></div>';
  $('rings').innerHTML = rings;
  $('mascotBtn').textContent = (BOOK.mascot && BOOK.mascot.emoji) || '🐾';
  var sparks = ['✦', '✧', '✨', '✦', '✧'];
  for (var s = 0; s < sparks.length; s++) {
    var sp = document.createElement('div'); sp.className = 'spark'; sp.textContent = sparks[s];
    sp.style.left = (6 + Math.random() * 88) + 'vw'; sp.style.top = (8 + Math.random() * 80) + 'vh';
    sp.style.fontSize = (10 + Math.random() * 16) + 'px'; sp.style.animationDelay = (Math.random() * 5) + 's';
    document.body.appendChild(sp);
  }
  renderPage();
  setTimeout(function () { bubble('I am ' + ((BOOK.mascot && BOOK.mascot.name) || 'Spark') + '! Hover near a page edge to see it curl, then drag to flip!'); }, 900);
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
})();
`;

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
}

export function buildStandaloneFlipbookHtml(book: FlipbookJSON): string {
  const safeJson = JSON.stringify(book)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  const title = escapeHtml(book.title || 'Flipbook');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} &mdash; Flipbook</title>
<style>${CSS_BASE}${CSS_SKINS}${CSS_GAMES}</style></head>
<body>${MARKUP}
<script>
const BOOK = ${safeJson};
${ENGINE_JS}
</script></body></html>`;
}
