/**
 * Class portraits for the party builder — one coherent set, five figures.
 *
 * WHY THIS IS A GENERATOR AND NOT FIVE HAND-DRAWN FILES
 * -----------------------------------------------------
 * The five portraits have to look like a FAMILY: same canvas, same lighting, same
 * frame, same pose skeleton, same palette, with only the class colour and the kit
 * changing. Five files edited by hand drift apart the moment one of them is
 * touched, so the shared parts live here once (`defs`, `backdrop`, `body`, `frame`)
 * and each class only supplies what makes it that class: headgear, robe/cloak
 * cut, weapon and accent colour.
 *
 * Everything is vector on purpose: the game already ships 2.2 MB of photographic
 * scene art, and these are shown at 40–200 px (party bar, class cards), so SVGs
 * stay crisp at every size, weigh ~4 KB each and need no licence attribution.
 *
 * These are the FALLBACK art, not the shipped portraits: the game's class portraits
 * are photographs in `public/images/classes/<class>.png` (see the CREDITS there).
 * The vectors are kept beside them in `public/images/classes/vector/` and are shown
 * automatically if a photo file is ever missing, so a class tile can never render as
 * a broken image.
 *
 * Usage:  node tools/make-class-art.mjs
 * Output: public/images/classes/vector/<class>.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'public', 'images', 'classes', 'vector');

/** Canvas. Every figure is drawn inside this box, feet on the same floor line. */
const W = 512;
const H = 640;
const FLOOR = 556;

/** Shared paint. `accent` is the class colour — the only per-class paint. */
const defs = (accent) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#241d15"/>
      <stop offset="0.55" stop-color="#15110c"/>
      <stop offset="1" stop-color="#080706"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.4" r="0.62">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.40"/>
      <stop offset="0.65" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0.9">
      <stop offset="0" stop-color="#d3dae1"/>
      <stop offset="0.42" stop-color="#8a929b"/>
      <stop offset="1" stop-color="#424952"/>
    </linearGradient>
    <linearGradient id="steelDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#727b87"/>
      <stop offset="1" stop-color="#242830"/>
    </linearGradient>
    <linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5f422b"/>
      <stop offset="1" stop-color="#2e2117"/>
    </linearGradient>
    <linearGradient id="cloth" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="0.55" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#100d0b"/>
    </linearGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e9b787"/>
      <stop offset="1" stop-color="#a9744a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe9a8"/>
      <stop offset="0.5" stop-color="#f0c163"/>
      <stop offset="1" stop-color="#9d6c1b"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.44" r="0.8">
      <stop offset="0.58" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.62"/>
    </radialGradient>
    <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>`;

/** Torch-lit stone: the same stage for every class. */
const backdrop = () => `
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="256" cy="262" rx="238" ry="286" fill="url(#glow)"/>
  <path d="M62 ${FLOOR + 10} V270a194 194 0 0 1 388 0v${FLOOR - 260}" fill="none" stroke="#2a231a" stroke-width="13"/>
  <path d="M92 566 V282a164 164 0 0 1 328 0v284" fill="none" stroke="#211a13" stroke-width="6"/>
  <g stroke="#2f2519" stroke-width="3" stroke-opacity="0.5">
    <path d="M92 340h64M356 340h64M92 404h72M348 404h72M92 468h60M360 468h60"/>
  </g>
  <ellipse cx="256" cy="${FLOOR + 8}" rx="176" ry="34" fill="url(#floorFade)"/>
  <ellipse cx="256" cy="300" rx="132" ry="196" fill="#000" fill-opacity="0.32"/>`;

/** Pose skeleton shared by all five: legs, torso, belt, pauldrons, arms, hands, head. */
const body = () => `
  <path d="M224 392h28l-6 156h-28z" fill="url(#steelDark)"/>
  <path d="M260 392h28l6 156h-28z" fill="url(#steelDark)"/>
  <path d="M206 ${FLOOR - 26}h50q9 0 9 9v11q0 6-6 6h-56q-7 0-7-7z" fill="#23262b"/>
  <path d="M256 ${FLOOR - 26}h50q4 0 4 6v12q0 8-8 8h-54q-7 0-7-7z" fill="#23262b"/>
  <path d="M206 ${FLOOR - 26}h118" stroke="url(#gold)" stroke-opacity="0.5" stroke-width="3"/>
  <path d="M200 232q56-22 112 0l-14 152q-42 15-84 0z" fill="url(#steel)"/>
  <path d="M256 236v142" stroke="#000" stroke-opacity="0.22" stroke-width="3"/>
  <path d="M212 264h88" stroke="#fff" stroke-opacity="0.09" stroke-width="7"/>
  <path d="M214 300h84" stroke="#000" stroke-opacity="0.18" stroke-width="4"/>
  <path d="M200 244q-12 60-8 128" fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="6" stroke-linecap="round"/>
  <path d="M219 160q37-24 74 0" fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="5"/>
  <rect x="208" y="364" width="96" height="24" rx="9" fill="url(#leather)"/>
  <rect x="240" y="361" width="32" height="30" rx="7" fill="url(#gold)"/>
  <ellipse cx="194" cy="240" rx="41" ry="27" fill="url(#steelDark)"/>
  <ellipse cx="318" cy="240" rx="41" ry="27" fill="url(#steelDark)"/>
  <path d="M164 232q30-14 60-4" stroke="#fff" stroke-opacity="0.14" stroke-width="5" fill="none"/>
  <path d="M288 228q30-10 60 4" stroke="#fff" stroke-opacity="0.14" stroke-width="5" fill="none"/>
  <rect x="243" y="204" width="26" height="30" fill="#8f6039"/>
  <path d="M186 250l-20 74 12 48" fill="none" stroke="url(#steelDark)" stroke-width="27" stroke-linecap="round"/>
  <path d="M326 250l20 74-12 48" fill="none" stroke="url(#steelDark)" stroke-width="27" stroke-linecap="round"/>
  <circle cx="178" cy="374" r="15" fill="url(#skin)"/>
  <circle cx="334" cy="374" r="15" fill="url(#skin)"/>
  <ellipse cx="256" cy="184" rx="39" ry="45" fill="url(#skin)"/>`;

/** Held item in the right hand (sword, staff, dagger...) — drawn over the body. */
const inFront = (markup) => markup;

const frame = () => `
  <rect x="11" y="11" width="${W - 22}" height="${H - 22}" rx="26" fill="none" stroke="url(#gold)" stroke-opacity="0.55" stroke-width="3"/>
  <rect x="21" y="21" width="${W - 42}" height="${H - 42}" rx="18" fill="none" stroke="#000" stroke-opacity="0.45" stroke-width="2"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>`;

/* ───────────────────────────── the five classes ───────────────────────────── */

const CLASSES = {
  fighter: {
    label: 'Fighter',
    accent: '#ef4444',
    art: `
      <path d="M256 214q-88 22-100 128l-8 214h216l-8-214q-12-106-100-128z" fill="url(#cloth)" opacity="0.42"/>
      <path d="M222 160q34-24 68 0l10 16-44-8-44 8z" fill="url(#steelDark)"/>
      <path d="M215 168q41-26 82 0v-16q-41-22-82 0z" fill="url(#gold)" opacity="0.85"/>
      <path d="M198 306l-40 12 12 108h58z" fill="url(#steel)"/>
      <path d="M198 306l-40 12 4 34h58z" fill="#000" opacity="0.22"/>
      <circle cx="186" cy="374" r="9" fill="url(#gold)"/>
      <path d="M330 372l14-206 16 0 14 206z" fill="url(#steel)"/>
      <path d="M330 372l14-206 4 0 10 206z" fill="#fff" opacity="0.25"/>
      <path d="M312 178h72v16h-72z" fill="url(#gold)"/>
      <circle cx="348" cy="164" r="13" fill="url(#gold)"/>
      <path d="M342 356h12v22h-12z" fill="url(#leather)"/>
    `,
  },

  mage: {
    label: 'Mage',
    accent: '#8b5cf6',
    art: `
      <path d="M256 212q-96 24-108 136l-10 214h236l-10-214q-12-112-108-136z" fill="url(#cloth)"/>
      <path d="M256 240q-30 60-40 306h80q-10-246-40-306z" fill="#000" opacity="0.2"/>
      <path d="M256 128q-58 0-58 62 0 26 12 42h92q12-16 12-42 0-62-58-62z" fill="url(#cloth)"/>
      <path d="M204 200q52 30 104 0v22q-52 30-104 0z" fill="#000" opacity="0.4"/>
      <ellipse cx="256" cy="196" rx="30" ry="28" fill="#0b0910"/>
      <circle cx="244" cy="196" r="4.5" fill="${'#8b5cf6'}"/>
      <circle cx="268" cy="196" r="4.5" fill="${'#8b5cf6'}"/>
      <path d="M256 196v-24" stroke="${'#8b5cf6'}" stroke-opacity="0.6" stroke-width="2"/>
      <path d="M180 376l14-256" stroke="url(#leather)" stroke-width="13" stroke-linecap="round"/>
      <path d="M180 376l14-256" stroke="#000" stroke-opacity="0.25" stroke-width="4"/>
      <circle cx="196" cy="104" r="30" fill="${'#4c1d95'}" opacity="0.55"/>
      <circle cx="196" cy="104" r="19" fill="#8b5cf6"/>
      <circle cx="189" cy="97" r="7" fill="#e9d5ff" opacity="0.9"/>
      <path d="M338 300q22 22 10 62-10 34-34 44" fill="none" stroke="url(#steelDark)" stroke-width="9" stroke-linecap="round"/>
    `,
  },

  marksman: {
    label: 'Marksman',
    accent: '#10b981',
    art: `
      <path d="M256 214q-84 22-96 124l-8 212h208l-8-212q-12-102-96-124z" fill="url(#cloth)" opacity="0.5"/>
      <path d="M258 134q-56 4-60 58 0 24 10 40h94q12-18 12-40q-8-54-56-58z" fill="url(#leather)"/>
      <path d="M256 132q-44 6-58 40 34-26 116-4-14-32-58-36z" fill="#000" opacity="0.35"/>
      <path d="M206 208q50 26 100 0v18q-50 26-100 0z" fill="#000" opacity="0.35"/>
      <ellipse cx="256" cy="198" rx="31" ry="22" fill="#2a1a10" opacity="0.85"/>
      <circle cx="244" cy="198" r="4" fill="#10b981"/><circle cx="268" cy="198" r="4" fill="#10b981"/>
      <path d="M312 214l30-84 12 4-24 86z" fill="url(#leather)"/>
      <path d="M334 132l16-6 8 22-16 6z" fill="url(#gold)" opacity="0.8"/>
      <path d="M204 176q72-44 128-10" fill="none" stroke="url(#leather)" stroke-width="7"/>
      <path d="M330 152l-24 96" stroke="#e6d8bf" stroke-width="3"/>
      <path d="M186 250q-46 48-40 122t52 122" fill="none" stroke="url(#leather)" stroke-width="11" stroke-linecap="round"/>
      <path d="M186 250q-46 48-40 122t52 122" fill="none" stroke="#fff" stroke-opacity="0.12" stroke-width="3"/>
      <path d="M148 372h72" stroke="#d8cab0" stroke-width="2.5" stroke-opacity="0.85"/>
      <path d="M170 236q44 42 42 132-2 74-16 116" fill="none" stroke="#efe3cb" stroke-width="2.5" stroke-opacity="0.85"/>
    `,
  },

  assassin: {
    label: 'Assassin',
    accent: '#38bdf8',
    art: `
      <path d="M256 208q-92 26-104 138l-8 210h224l-8-210q-12-112-104-138z" fill="url(#cloth)" opacity="0.85"/>
      <path d="M148 556h216l-8-104-100 44-100-44z" fill="#0a0b10" opacity="0.55"/>
      <path d="M256 122q-58 2-62 64 0 26 12 44h100q12-18 12-44 0-62-62-64z" fill="url(#cloth)"/>
      <path d="M200 196q56 30 112 0l-8 40q-48 24-96 0z" fill="#000" opacity="0.62"/>
      <path d="M216 186q40 16 80 0l-6 22q-34 14-68 0z" fill="#101218"/>
      <circle cx="238" cy="192" r="5" fill="#38bdf8"/><circle cx="274" cy="192" r="5" fill="#38bdf8"/>
      <path d="M180 372l-6-30 16-2 6 32z" fill="url(#steelDark)"/>
      <path d="M332 372l6-30-16-2-6 32z" fill="url(#steelDark)"/>
      <path d="M170 344l4-92 14 0 4 92z" fill="url(#steel)"/>
      <path d="M170 344l4-92 4 0 2 92z" fill="#fff" opacity="0.3"/>
      <path d="M338 344l-4-92-14 0-4 92z" fill="url(#steel)"/>
      <path d="M338 344l-4-92-4 0-2 92z" fill="#fff" opacity="0.3"/>
      <path d="M188 356l40-40" stroke="url(#gold)" stroke-width="4" opacity="0.5" fill="none"/>
    `,
  },

  tank: {
    label: 'Tank',
    accent: '#f59e0b',
    art: `
      <path d="M256 218q-96 22-108 132l-8 206h232l-8-206q-12-110-108-132z" fill="url(#cloth)" opacity="0.4"/>
      <path d="M256 118q-62 2-66 68 0 30 14 48h104q14-18 14-48 0-66-66-68z" fill="url(#steel)"/>
      <path d="M196 178q60-24 120 0l-6-22q-54-22-108 0z" fill="url(#steelDark)"/>
      <path d="M208 196h96l-8 26h-80z" fill="#0b0d10"/>
      <path d="M214 204h84" stroke="#f59e0b" stroke-opacity="0.8" stroke-width="4"/>
      <path d="M248 116q8-42 8-42 0 0 8 42z" fill="url(#gold)" opacity="0.9"/>
      <path d="M256 74q34 12 44 46-30-26-44-46z" fill="#f59e0b" opacity="0.75"/>
      <path d="M170 258q-8 78 0 158l46 26 8-166z" fill="url(#steel)"/>
      <path d="M170 258q-8 78 0 158l46 26 8-166z" fill="none" stroke="url(#gold)" stroke-opacity="0.45" stroke-width="3"/>
      <path d="M212 276l-34-6-28 6 0 -22 30 -6 32 6z" fill="url(#steelDark)"/>
      <path d="M96 300h108v190H96z" fill="url(#steelDark)"/>
      <path d="M112 316h76v158h-76z" fill="url(#steel)"/>
      <path d="M150 316v158" stroke="#000" stroke-opacity="0.3" stroke-width="4"/>
      <path d="M112 372h76" stroke="url(#gold)" stroke-opacity="0.55" stroke-width="4"/>
      <path d="M104 300h92" stroke="#fff" stroke-opacity="0.16" stroke-width="5"/>
      <path d="M330 344l-14-70 16-4 14 72z" fill="url(#steelDark)"/>
    `,
  },
};

/* ───────────────────────────────── build ───────────────────────────────── */

mkdirSync(OUT, { recursive: true });

for (const [key, cls] of Object.entries(CLASSES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${cls.label}">
  <title>${cls.label}</title>${defs(cls.accent)}
${backdrop()}
${body()}
${inFront(cls.art)}
${frame()}
</svg>
`;
  writeFileSync(join(OUT, `${key}.svg`), svg);
  console.log(`wrote public/images/classes/vector/${key}.svg  ${(svg.length / 1024).toFixed(1)} kB`);
}
