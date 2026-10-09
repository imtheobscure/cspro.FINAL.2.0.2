// Injects the redesigned-activity CSS into buildCSS() in the generator.
const fs = require("fs");
const GEN = "utils/englishLessonHtmlGenerator.ts";
let src = fs.readFileSync(GEN, "utf8");

if (src.indexOf("/* ===== AUDIO BLOCK (waveform player) ===== */") >= 0) {
  console.log("CSS already injected — skipping");
  process.exit(0);
}

const css = `
    /* ===== TEXT RECONSTRUCTION (tap-to-rebuild) ===== */
    .tr-wrap { display:flex; flex-direction:column; gap:10px; }
    .tr-hint { font-size:0.85rem; font-weight:700; color:var(--theme-text-secondary); }
    .tr-sheet { min-height:56px; background:var(--theme-bg); border:2px dashed var(--theme-text)20; border-radius:12px; padding:8px; display:flex; flex-direction:column; gap:6px; }
    .tr-sheet-empty { color:var(--theme-text-secondary); font-size:0.9rem; text-align:center; padding:12px; }
    .tr-line { display:flex; align-items:center; gap:8px; background:var(--theme-surface, #fff); border:2px solid var(--theme-text)15; border-radius:10px; padding:8px 10px; font-size:0.95rem; animation: fadeSlideIn 0.25s ease; }
    .tr-line-num { width:22px; height:22px; border-radius:50%; background:var(--theme-primary); color:var(--theme-bg); font-size:0.75rem; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .tr-line-text { flex:1; }
    .tr-remove { border:none; background:none; color:var(--theme-text-secondary); cursor:pointer; font-size:0.9rem; }
    .tr-line.tr-bad { border-color:var(--theme-error); animation: trShake 0.4s ease; }
    @keyframes trShake { 0%,100% { transform:translateX(0);} 25% { transform:translateX(-5px);} 75% { transform:translateX(5px);} }
    .tr-sheet.tr-win { border-color:var(--theme-success); border-style:solid; }
    .tr-pool { display:flex; flex-direction:column; gap:6px; }
    .tr-piece { display:flex; align-items:center; gap:8px; text-align:left; background:var(--theme-surface, #fff); border:2px solid var(--theme-text)20; border-radius:10px; padding:10px 12px; font-size:0.95rem; cursor:pointer; transition:transform 0.15s, border-color 0.15s; font-family:inherit; }
    .tr-piece:hover { transform:translateY(-2px); border-color:var(--theme-primary); }
    .tr-piece-idx { width:22px; height:22px; border-radius:6px; background:var(--theme-accent)20; color:var(--theme-accent); font-size:0.75rem; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .tr-actions { display:flex; gap:8px; }

    /* ===== MOVIE SCENE (guided player) ===== */
    .ms-wrap { display:flex; flex-direction:column; gap:12px; }
    .ms-setting { font-size:0.9rem; color:var(--theme-text-secondary); background:var(--theme-bg); border-radius:10px; padding:8px 12px; }
    .ms-stage { background:var(--theme-bg); border-radius:14px; padding:16px; border:1.5px solid var(--theme-text)10; }
    .ms-progress { display:flex; gap:6px; justify-content:center; margin-bottom:14px; }
    .ms-dot { width:10px; height:10px; border-radius:50%; background:var(--theme-text)15; transition:all 0.2s; }
    .ms-dot.current { background:var(--theme-primary); transform:scale(1.3); }
    .ms-dot.done { background:var(--theme-success); }
    .ms-beat-body { display:flex; flex-direction:column; gap:10px; }
    .ms-speaker { display:flex; align-items:center; gap:10px; font-weight:800; }
    .ms-avatar { width:40px; height:40px; border-radius:50%; background:var(--theme-primary); color:var(--theme-bg); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
    .ms-avatar-user { background:var(--theme-accent); }
    .ms-name { font-size:1.05rem; }
    .ms-mood { font-weight:600; color:var(--theme-text-secondary); font-size:0.85rem; }
    .ms-line { font-size:1.15rem; line-height:1.7; padding:12px 14px; background:var(--theme-surface, #fff); border-radius:10px; border:1.5px solid var(--theme-text)10; }
    .ms-word { transition:color 0.2s, background 0.2s; border-radius:4px; padding:0 2px; }
    .ms-word.revealed { color:var(--theme-success); font-weight:700; }
    .ms-userhelp { font-size:0.85rem; color:var(--theme-accent); font-weight:700; }
    .ms-controls { display:flex; gap:8px; justify-content:center; }
    .ms-feedback { text-align:center; font-weight:700; min-height:1.2em; }

    /* ===== INTERACTIVE STORY (turn-taking game) ===== */
    .is-wrap { display:flex; flex-direction:column; gap:10px; }
    .is-topbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .is-chapter { font-size:0.8rem; font-weight:900; text-transform:uppercase; letter-spacing:0.05em; color:var(--theme-primary); background:var(--theme-primary)12; padding:4px 10px; border-radius:999px; }
    .is-trail { display:flex; align-items:center; gap:4px; flex-wrap:wrap; font-size:0.95rem; }
    .is-trail-dot { opacity:0.85; }
    .is-trail-now { color:var(--theme-primary); font-size:0.8rem; }
    .is-card { background:var(--theme-bg); border:2px solid var(--theme-text)12; border-radius:16px; padding:18px; animation: fadeSlideIn 0.3s ease; }
    .is-scene-emoji { font-size:2.2rem; margin-bottom:6px; }
    .is-title { font-size:1.2rem; font-weight:900; margin-bottom:6px; }
    .is-text { font-size:1rem; line-height:1.75; margin-bottom:12px; }
    .is-effect { font-size:0.9rem; font-weight:700; color:var(--theme-accent); background:var(--theme-accent)10; border-radius:8px; padding:8px 10px; margin-bottom:10px; }
    .is-choices { display:flex; flex-direction:column; gap:8px; }
    .is-choice { text-align:left; }
    .is-choice-key { display:inline-flex; width:22px; height:22px; border-radius:6px; background:var(--theme-primary); color:var(--theme-bg); align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; margin-right:6px; }
    .is-ending { text-align:center; padding:12px; }
    .is-trophy { font-size:2.6rem; display:block; }
    .is-listen-row { text-align:center; margin-top:10px; }
    .is-feedback { font-weight:700; min-height:1.2em; }

    /* ===== GAP TRANSCRIPT STUDIO ===== */
    .gt2-wrap { display:flex; flex-direction:column; gap:12px; }
    .gt2-player { display:flex; gap:8px; align-items:center; }
    .gt2-tip { font-size:0.85rem; color:var(--theme-text-secondary); }
    .gt2-text { font-size:1.05rem; line-height:2.3; padding:16px; background:var(--theme-bg); border-radius:12px; border:1.5px solid var(--theme-text)10; }
    .gt2-input { border:none; border-bottom:2.5px solid var(--theme-primary); background:var(--theme-primary)08; border-radius:6px 6px 0 0; padding:4px 8px; font-size:1rem; width:110px; text-align:center; font-weight:700; outline:none; transition:all 0.2s; }
    .gt2-input:focus { background:var(--theme-primary)15; width:150px; }
    .gt2-input.ok { border-color:var(--theme-success); background:var(--theme-success)12; color:var(--theme-success); }
    .gt2-input.wrong { border-color:var(--theme-error); background:var(--theme-error)10; color:var(--theme-error); }

    /* ===== CONCEALED TEXT (magic lens) ===== */
    .ct-wrap { display:flex; flex-direction:column; gap:10px; }
    .ct-stage { position:relative; border-radius:12px; overflow:hidden; }
    .ct-cover { padding:28px 20px; text-align:center; background:var(--theme-text)08; color:var(--theme-text-secondary); }
    .ct-lock { font-size:2rem; margin-bottom:6px; }
    .ct-content { display:none; padding:16px; font-size:1.02rem; line-height:1.8; }
    .ct-stage.revealed .ct-cover { display:none; }
    .ct-stage.revealed .ct-content { display:block; }
    .ct-word { filter:blur(5px); transition:filter 0.35s ease; }
    .ct-stage.revealed .ct-word.shown { filter:blur(0); }
    .ct-word.quiz { filter:blur(5px); }
    .ct-bar { display:flex; gap:8px; }
    .ct-progress { height:6px; border-radius:3px; background:var(--theme-text)10; overflow:hidden; }
    .ct-progress-fill { height:100%; width:0%; background:var(--theme-success); transition:width 0.3s; }

    /* ===== ESCAPE ROOM (mission) ===== */
    .er2-wrap { display:flex; flex-direction:column; gap:12px; }
    .er2-story { font-size:0.95rem; line-height:1.6; background:var(--theme-bg); border-left:4px solid var(--theme-primary); border-radius:8px; padding:10px 14px; }
    .er2-hud { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
    .er2-progress { display:flex; gap:4px; }
    .er2-key { font-size:1.2rem; opacity:0.3; filter:grayscale(1); transition:all 0.25s; }
    .er2-key.current { opacity:1; filter:none; transform:scale(1.2); }
    .er2-key.done { opacity:1; filter:none; }
    .er2-stage { font-size:0.85rem; font-weight:700; color:var(--theme-text-secondary); }
    .er2-room { text-align:center; background:var(--theme-bg); border-radius:14px; padding:20px 16px; border:1.5px solid var(--theme-text)10; }
    .er2-door { font-size:3rem; transition:transform 0.2s; }
    .er2-door.shake { animation: trShake 0.4s ease; }
    .er2-clue { font-size:1.08rem; font-weight:700; margin:10px 0 14px; }
    .er2-entry { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
    .er2-options { display:flex; flex-direction:column; gap:8px; max-width:340px; margin:0 auto; }
    .er2-hint-btn { background:none; border:none; color:var(--theme-accent); font-weight:700; cursor:pointer; font-size:0.88rem; margin-top:10px; }
    .er2-hint { background:var(--theme-accent)10; border-radius:8px; padding:8px 12px; margin-top:8px; font-size:0.92rem; }
    .er2-feedback { margin-top:10px; font-weight:800; min-height:1.2em; }
    .er2-win-icon { font-size:3.4rem; }
    .er2-confetti { font-size:2rem; margin-top:6px; animation: bounceIn 0.6s ease; }

    /* ===== CONNECT LINES (SVG board) ===== */
    .cl2-wrap { display:flex; flex-direction:column; gap:10px; }
    .cl2-tip { font-size:0.85rem; color:var(--theme-text-secondary); }
    .cl2-board { position:relative; display:grid; grid-template-columns:1fr 1fr; gap:56px; }
    .cl2-svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:2; }
    .cl2-line { stroke-width:3; fill:none; }
    .cl2-line.good { stroke:var(--theme-success); stroke-linecap:round; }
    .cl2-line.bad { stroke:var(--theme-error); stroke-linecap:round; }
    .cl2-col { display:flex; flex-direction:column; gap:8px; }
    .cl2-item { text-align:left; background:var(--theme-surface, #fff); border:2px solid var(--theme-text)18; border-radius:10px; padding:10px 12px; font-size:0.95rem; cursor:pointer; transition:all 0.15s; font-family:inherit; }
    .cl2-item:hover { border-color:var(--theme-primary); }
    .cl2-sel { border-color:var(--theme-primary) !important; background:var(--theme-primary)10 !important; }
    .cl2-match { border-color:var(--theme-success); background:var(--theme-success)10; opacity:0.85; }
    .cl2-status { font-weight:800; text-align:center; min-height:1.2em; }

    /* ===== GUIDED WRITING (coach) ===== */
    .gw2-wrap { display:flex; flex-direction:column; gap:12px; }
    .gw2-prompt { background:var(--theme-bg); border-left:4px solid var(--theme-secondary); border-radius:10px; padding:12px 14px; }
    .gw2-prompt-label { display:block; font-size:0.8rem; font-weight:900; text-transform:uppercase; color:var(--theme-secondary); margin-bottom:4px; }
    .gw2-steps { display:flex; flex-direction:column; gap:8px; }
    .gw2-step { display:flex; gap:10px; align-items:flex-start; background:var(--theme-bg); border-radius:10px; padding:10px 12px; border:1.5px solid var(--theme-text)10; }
    .gw2-step.done { border-color:var(--theme-success); background:var(--theme-success)08; }
    .gw2-step-check { width:24px; height:24px; border-radius:50%; background:var(--theme-text)12; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem; flex-shrink:0; user-select:none; }
    .gw2-step.done .gw2-step-check { background:var(--theme-success); color:var(--theme-bg); }
    .gw2-step-goal { font-size:0.95rem; font-weight:600; }
    .gw2-starter { background:var(--theme-accent)12; color:var(--theme-accent); border:none; border-radius:6px; padding:4px 8px; font-size:0.82rem; font-weight:700; cursor:pointer; margin-top:4px; font-family:inherit; }
    .gw2-chips { display:flex; flex-wrap:wrap; gap:6px; }
    .gw2-chip { background:var(--theme-accent)10; color:var(--theme-accent); border:1px solid var(--theme-accent)30; border-radius:8px; padding:4px 10px; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:inherit; }
    .gw2-tools { display:flex; flex-direction:column; gap:8px; }
    .gw2-meter { display:flex; align-items:center; gap:10px; font-size:0.85rem; color:var(--theme-text-secondary); font-weight:700; }
    .gw2-rubric summary { cursor:pointer; font-weight:700; font-size:0.9rem; color:var(--theme-text-secondary); }
    .gw2-rubric > div { padding:10px 12px; font-size:0.92rem; }

    /* ===== MINIMAL PAIRS ===== */
    .mp2-wrap { display:flex; flex-direction:column; gap:12px; }
    .mp2-progress { display:flex; gap:5px; justify-content:center; }
    .mp2-dot { width:12px; height:12px; border-radius:50%; background:var(--theme-text)15; }
    .mp2-dot.now { background:var(--theme-primary); transform:scale(1.25); }
    .mp2-dot.ok { background:var(--theme-success); }
    .mp2-dot.bad { background:var(--theme-error); }
    .mp2-stage { text-align:center; }
    .mp2-count { font-size:0.85rem; color:var(--theme-text-secondary); font-weight:700; margin-bottom:6px; }
    .mp2-q { font-weight:800; margin-bottom:12px; }
    .mp2-options { display:flex; gap:12px; justify-content:center; margin:14px 0; flex-wrap:wrap; }
    .mp2-right { border-color:var(--theme-success) !important; background:var(--theme-success)12 !important; color:var(--theme-success) !important; }
    .mp2-wrong { border-color:var(--theme-error) !important; background:var(--theme-error)10 !important; }
    .mp2-hear-both { margin-bottom:8px; }
    .mp2-both { background:none; border:none; color:var(--theme-accent); font-weight:700; cursor:pointer; font-size:0.88rem; font-family:inherit; }
    .mp2-sentence { background:var(--theme-bg); border-radius:8px; padding:10px 12px; font-style:italic; }
    .mp2-done { padding:16px; }
    .mp2-trophy { font-size:3rem; }

    /* ===== AI TRIVIA ===== */
    .qt-wrap { display:flex; flex-direction:column; gap:10px; }
    .qt-hud { display:flex; justify-content:space-between; align-items:center; font-weight:800; font-size:0.9rem; }
    .qt-streak { color:#f59e0b; }
    .qt-q { font-size:1.1rem; font-weight:800; margin-bottom:12px; }
    .qt-options { display:flex; flex-direction:column; gap:8px; }
    .qt-right { border-color:var(--theme-success) !important; background:var(--theme-success)12 !important; }
    .qt-wrong { border-color:var(--theme-error) !important; background:var(--theme-error)10 !important; }
    .qt-feedback { min-height:1.2em; font-weight:700; }
    .qt-why { font-weight:600; color:var(--theme-text-secondary); background:var(--theme-bg); border-radius:8px; padding:8px 10px; margin:8px 0; font-size:0.92rem; }
    .qt-done { text-align:center; padding:16px; }
    .qt-trophy { font-size:3rem; }

    /* ===== PRONUNCIATION / WORD STRESS rows ===== */
    .pr-wrap { display:flex; flex-direction:column; gap:10px; }
    .pr-progress { display:flex; align-items:center; gap:10px; font-weight:700; font-size:0.88rem; }
    .pr-list { display:flex; flex-direction:column; gap:10px; }
    .pr-row { background:var(--theme-bg); border:1.5px solid var(--theme-text)10; border-radius:12px; padding:12px; }
    .pr-row.pr-mastered { border-color:var(--theme-success); background:var(--theme-success)06; }
    .pr-head { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
    .pr-word { font-size:1.2rem; font-weight:900; }
    .pr-phon { color:var(--theme-accent); font-weight:700; }
    .pr-stress { font-size:0.8rem; background:var(--theme-accent)12; color:var(--theme-accent); padding:2px 8px; border-radius:999px; font-weight:800; }
    .pr-sylls { display:flex; gap:6px; margin:8px 0 4px; flex-wrap:wrap; }
    .pr-syll { background:var(--theme-surface, #fff); border:1.5px solid var(--theme-text)18; border-radius:8px; padding:4px 10px; cursor:pointer; font-family:inherit; font-size:0.95rem; }
    .pr-syll.stressed { border-color:var(--theme-accent); background:var(--theme-accent)12; font-weight:800; }
    .pr-actions { display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; }
    .pr-sentence { margin-top:8px; font-size:0.92rem; color:var(--theme-text-secondary); font-style:italic; }
    .pr-sent-play { background:none; border:none; color:var(--theme-primary); cursor:pointer; }
    .pr-feedback { min-height:1em; font-weight:700; }
    .pr-good { border-color:var(--theme-success) !important; background:var(--theme-success)12 !important; color:var(--theme-success) !important; }
    .pr-mastered .pr-word::after { content:' ✓'; color:var(--theme-success); }

    /* ===== AUDIO BLOCK (waveform player) ===== */
    .ab2-wrap { background:linear-gradient(135deg, var(--theme-bg), var(--theme-surface, #fff)); border:2px solid var(--theme-text)12; border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:12px; }
    .ab2-head { display:flex; gap:12px; align-items:center; }
    .ab2-icon { width:44px; height:44px; border-radius:12px; background:var(--theme-primary); color:var(--theme-bg); display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0; }
    .ab2-title { font-weight:900; }
    .ab2-sub { font-size:0.82rem; color:var(--theme-text-secondary); }
    .ab2-wave { display:flex; align-items:center; gap:3px; height:56px; padding:0 4px; }
    .ab2-bar { flex:1; background:var(--theme-primary)25; border-radius:3px; min-width:4px; transition:background 0.3s; }
    .ab2-playing .ab2-bar { background:var(--theme-primary)55; animation: ab2Pulse 0.9s ease-in-out infinite alternate; }
    .ab2-playing .ab2-bar:nth-child(odd) { animation-duration:0.7s; }
    .ab2-playing .ab2-bar:nth-child(3n) { animation-duration:1.1s; }
    @keyframes ab2Pulse { from { transform:scaleY(0.6);} to { transform:scaleY(1.15);} }
    .ab2-controls { display:flex; gap:10px; align-items:center; }
    .ab2-play { width:48px; height:48px; border-radius:50%; font-size:1.1rem; padding:0; }
    .ab2-speed { min-width:52px; }
    .ab2-status { font-weight:700; font-size:0.9rem; color:var(--theme-text-secondary); }
    .ab2-caption { font-size:0.95rem; line-height:1.6; color:var(--theme-text-secondary); }
`;

const anchor = "    /* ===== TRANSLATION BLOCK ===== */";
const at = src.indexOf(anchor);
if (at < 0) { console.error("css anchor not found"); process.exit(1); }
src = src.slice(0, at) + css + "\n" + src.slice(at);
fs.writeFileSync(GEN, src);
console.log("CSS injected; length", src.length);
