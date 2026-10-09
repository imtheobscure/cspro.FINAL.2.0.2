// One-off: inject the shared 390px phone/touch hardening block into generators
// that lack a mobile media query. Idempotent (skips files that already have it).
const fs = require('fs');

const BLOCK = `
        /* ===== PHONE / TOUCH AUDIT (390px) ===== */
        @media (max-width: 480px) {
            button, .btn, .nav-btn, .tab-btn, .slide-nav-btn, .play-btn,
            .speaker-btn, .replay-btn, .record-btn, [role="button"] { min-height: 44px; min-width: 44px; }
            table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
            h1 { font-size: 1.5rem; }
            h2 { font-size: 1.25rem; }
            body { overflow-x: hidden; }
        }
        @media (max-width: 390px) {
            h1 { font-size: 1.35rem; }
            .dialogue-card, .study-grid, .slides-carousel-wrapper { padding-left: 10px; padding-right: 10px; }
        }
`;

const files = [
    'utils/conversationMakerHtmlGenerator.ts',
    'utils/studyGuideHtmlGenerator.ts',
    'utils/slideExplainerHtmlGenerator.ts',
    'utils/gamifiedChallengeHtmlGenerator.ts',
];

for (const f of files) {
    let s = fs.readFileSync(f, 'utf8');
    if (s.includes('PHONE / TOUCH AUDIT')) { console.log('skip (present):', f); continue; }
    const marker = '@media print {';
    const i = s.indexOf(marker);
    if (i < 0) { console.error('no @media print anchor in', f); process.exit(1); }
    s = s.slice(0, i) + BLOCK + '\n' + s.slice(i);
    fs.writeFileSync(f, s);
    console.log('injected:', f);
}
