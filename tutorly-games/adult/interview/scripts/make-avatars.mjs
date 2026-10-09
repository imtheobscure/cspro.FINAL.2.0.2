#!/usr/bin/env node
/**
 * Draw the 24 interviewer portraits (and the dashboard hero art) as SVG.
 *
 * The fallback, not the shipped artwork
 * ------------------------------------
 * The interviewers have photographic portraits in
 * `public/images/characters/<id>.jpg`, fetched and cast by
 * `scripts/fetch-portraits.mjs` (see `public/images/README.md`). A photograph
 * always wins over these drawings — `lib/art.ts` prefers it through the
 * build-time manifest, and `components/image-guard.tsx` only reaches an `.svg`
 * when a picture is missing or fails to load. They exist so that a missing file
 * shows a face rather than a broken-image icon.
 *
 * What this script draws is deliberately unmistakably illustrated: the same warm
 * palette the interface already uses (#e59e82 / #bd8168 / #e48168 on the cream
 * cards), the flat style of the sidebar's hand-drawn illustration, one head and
 * shoulders per character, varied by skin tone, hair, top and accessory so the
 * twenty-four are tellable apart at 27px in a list.
 *
 * Usage: node scripts/make-avatars.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "images", "characters");

/**
 * One row per interviewer, in `characters.ts` order.
 *
 * `skin` and `hair` are deliberately spread across the palette rather than
 * assigned by name: these are 24 fictional people from everywhere, and the app's
 * own copy promises "a safe space for every accent, background, and ambition".
 *
 * style: short | bob | long | bun | curly | afro | hijab | bald | ponytail | wavy
 * look:  glasses | round-glasses | beard | earrings | none
 */
const CHARACTERS = [
  { id: 1, name: "Emily Parker", skin: "f2c9a8", hair: "8a5a35", style: "long", top: "e48168", look: "none" },
  { id: 2, name: "James Wilson", skin: "e8b48c", hair: "3d2b1f", style: "short", top: "4a6fa5", look: "beard" },
  { id: 3, name: "Sofia Chen", skin: "f6d3b3", hair: "1f1a17", style: "bob", top: "6b8e6b", look: "none" },
  { id: 4, name: "David Mitchell", skin: "eec3a0", hair: "6b6157", style: "short", top: "55606b", look: "glasses" },
  { id: 5, name: "Priya Shah", skin: "d9a273", hair: "2b1b12", style: "long", top: "b15b8a", look: "earrings" },
  { id: 6, name: "Omar Hassan", skin: "c98a5a", hair: "1c1512", style: "curly", top: "3f7d7a", look: "beard" },
  { id: 7, name: "Grace Johnson", skin: "8d5a3b", hair: "241a14", style: "afro", top: "d4845e", look: "earrings" },
  { id: 8, name: "Lucas Rivera", skin: "d99e6b", hair: "2a1a10", style: "wavy", top: "e0a33d", look: "none" },
  { id: 9, name: "Arjun Mehta", skin: "c98f5d", hair: "17110d", style: "short", top: "4f6d8f", look: "glasses" },
  { id: 10, name: "Helen Park", skin: "f3d0ae", hair: "2a2320", style: "bun", top: "7b6ba8", look: "earrings" },
  { id: 11, name: "Olivia Bennett", skin: "f7d9bc", hair: "b8804a", style: "bob", top: "c2603f", look: "none" },
  { id: 12, name: "Marcus Reed", skin: "7a4a2e", hair: "1b1310", style: "short", top: "2f4858", look: "beard" },
  { id: 13, name: "Amina Farouk", skin: "c88c5c", hair: "241811", style: "hijab", top: "4a8f7c", look: "none" },
  { id: 14, name: "Daniel Kim", skin: "f0cda9", hair: "15110f", style: "short", top: "59626d", look: "round-glasses" },
  { id: 15, name: "Isabella Torres", skin: "d2925f", hair: "3a2114", style: "ponytail", top: "c95a6b", look: "earrings" },
  { id: 16, name: "Thomas Wright", skin: "f1c6a2", hair: "8e8b86", style: "short", top: "6d7b5f", look: "glasses" },
  { id: 17, name: "Alex Morgan", skin: "dcae86", hair: "5c3f2a", style: "short", top: "7a5fa0", look: "none" },
  { id: 18, name: "Meera Patel", skin: "b8763f", hair: "1d1310", style: "long", top: "d08a3c", look: "earrings" },
  { id: 19, name: "Nadia Brooks", skin: "9a6244", hair: "2b1c15", style: "curly", top: "46656f", look: "none" },
  { id: 20, name: "Richard Hayes", skin: "eec6a3", hair: "9b9a97", style: "short", top: "3c4450", look: "beard" },
  { id: 21, name: "Victoria Lin", skin: "f6d5b8", hair: "221c19", style: "bob", top: "a8517a", look: "none" },
  { id: 22, name: "Samir Rahman", skin: "c28250", hair: "1a1410", style: "short", top: "2f6f6a", look: "beard" },
  { id: 23, name: "Diane Foster", skin: "f0c8a6", hair: "a8a5a0", style: "bun", top: "6b4a6f", look: "round-glasses" },
  { id: 24, name: "Catherine Blake", skin: "f4d2b4", hair: "4a3123", style: "wavy", top: "8d4358", look: "glasses" },
];

/** The warm backdrop behind every portrait, cycled so a grid is not monotone. */
const BACKDROPS = ["fdf0e4", "fbeee6", "f7ece2", "fdf1e0", "fbeae2", "f6efe4"];

const hairBack = (style, hair) => {
  switch (style) {
    case "long":
      return `<path d="M52 96c0-34 20-56 48-56s48 22 48 56v58c0 6-5 10-11 10h-12V96c0-22-11-34-25-34s-25 12-25 34v68H63c-6 0-11-4-11-10z" fill="#${hair}"/>`;
    case "bob":
      return `<path d="M54 100c0-33 19-54 46-54s46 21 46 54v34c0 5-4 8-9 8h-9V98c0-20-12-31-28-31s-28 11-28 31v44h-9c-5 0-9-3-9-8z" fill="#${hair}"/>`;
    case "bun":
      return `<circle cx="100" cy="40" r="17" fill="#${hair}"/><path d="M58 98c0-32 18-52 42-52s42 20 42 52v10c0 5-4 8-9 8h-6V96c0-20-12-30-27-30s-27 10-27 30v20h-6c-5 0-9-3-9-8z" fill="#${hair}"/>`;
    case "ponytail":
      return `<path d="M138 84c18 8 24 28 20 50-3 16-12 24-22 22 8-14 9-30 3-44-3-8-7-14-11-18z" fill="#${hair}"/><path d="M58 98c0-32 18-52 42-52s42 20 42 52v12c0 5-4 8-9 8h-6V96c0-20-12-30-27-30s-27 10-27 30v22h-6c-5 0-9-3-9-8z" fill="#${hair}"/>`;
    case "curly":
      return `<g fill="#${hair}"><circle cx="70" cy="72" r="17"/><circle cx="100" cy="56" r="20"/><circle cx="130" cy="72" r="17"/><circle cx="58" cy="94" r="13"/><circle cx="142" cy="94" r="13"/></g>`;
    case "afro":
      return `<g fill="#${hair}"><circle cx="100" cy="60" r="42"/><circle cx="62" cy="82" r="24"/><circle cx="138" cy="82" r="24"/><circle cx="74" cy="52" r="20"/><circle cx="126" cy="52" r="20"/></g>`;
    case "wavy":
      return `<path d="M52 100c0-34 21-56 48-56s48 22 48 56v22c0 5-4 9-10 9-4 0-7-3-7-7V96c0-21-13-33-31-33s-31 12-31 33v28c0 4-3 7-7 7-6 0-10-4-10-9z" fill="#${hair}"/>`;
    default:
      return `<path d="M60 92c0-30 17-48 40-48s40 18 40 48v6c0 4-3 7-8 7h-4V92c0-19-12-29-28-29s-28 10-28 29v6h-4c-5 0-8-3-8-7z" fill="#${hair}"/>`;
  }
};

const hairFront = (style, hair) => {
  switch (style) {
    case "curly":
      return `<g fill="#${hair}"><circle cx="80" cy="60" r="13"/><circle cx="104" cy="54" r="13"/><circle cx="124" cy="64" r="11"/></g>`;
    case "afro":
      return `<g fill="#${hair}"><circle cx="82" cy="58" r="16"/><circle cx="108" cy="52" r="15"/><circle cx="128" cy="62" r="13"/></g>`;
    case "hijab":
      return "";
    case "bun":
      return `<path d="M66 84c6-20 20-30 34-30s28 10 34 30c-10-10-21-15-34-15s-24 5-34 15z" fill="#${hair}"/>`;
    default:
      return `<path d="M64 84c4-22 18-33 36-33s32 11 36 33c-11-12-22-17-36-17s-25 5-36 17z" fill="#${hair}"/>`;
  }
};

const face = (id, skin, hair, top, look) => `
  <ellipse cx="100" cy="188" rx="58" ry="46" fill="#${top}"/>
  <rect x="88" y="120" width="24" height="26" rx="10" fill="#${skin}"/>
  <ellipse cx="100" cy="96" rx="40" ry="44" fill="#${skin}"/>
  <ellipse cx="62" cy="100" rx="7" ry="10" fill="#${skin}"/>
  <ellipse cx="138" cy="100" rx="7" ry="10" fill="#${skin}"/>
  ${
    look === "beard"
      ? `<path d="M64 104c0 30 16 48 36 48s36-18 36-48c0 14-4 22-10 26-6-8-15-12-26-12s-20 4-26 12c-6-4-10-12-10-26z" fill="#${hair}" opacity=".92"/>`
      : ""
  }
  <ellipse cx="85" cy="97" rx="4.6" ry="5.4" fill="#3a2a22"/>
  <ellipse cx="115" cy="97" rx="4.6" ry="5.4" fill="#3a2a22"/>
  <circle cx="86.6" cy="95.4" r="1.5" fill="#fff" opacity=".9"/>
  <circle cx="116.6" cy="95.4" r="1.5" fill="#fff" opacity=".9"/>
  <path d="M76 86c4-3 10-3 14 0M110 86c4-3 10-3 14 0" stroke="#5a4034" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".55"/>
  <path d="M89 116c3.5 4 8 6 11 6s7.5-2 11-6" stroke="#a8614c" stroke-width="2.6" stroke-linecap="round" fill="none"/>
  ${
    look === "glasses" || look === "round-glasses"
      ? `<g stroke="#3b4652" stroke-width="2.4" fill="none" opacity=".85"><rect x="72" y="86" width="26" height="21" rx="${look === "round-glasses" ? 10 : 5}"/><rect x="102" y="86" width="26" height="21" rx="${look === "round-glasses" ? 10 : 5}"/><path d="M98 96h4M72 92l-8 3M128 92l8 3"/></g>`
      : ""
  }
  ${
    look === "earrings"
      ? `<circle cx="62" cy="112" r="3.2" fill="#e0a33d"/><circle cx="138" cy="112" r="3.2" fill="#e0a33d"/>`
      : ""
  }
  <path d="M100 30a70 70 0 0 1 70 70H30a70 70 0 0 1 70-70z" fill="#fff" opacity="0"/>
  <title>Simulated interviewer ${id}</title>
`;

const hijabWrap = (hair, top) => `
  <path d="M56 100c0-32 20-56 44-56s44 24 44 56c0 22-6 38-16 46l-12-10c8-8 12-20 12-34 0-22-12-36-28-36s-28 14-28 36c0 14 4 26 12 34l-12 10c-10-8-16-24-16-46z" fill="#${hair}"/>
  <path d="M56 100c0-32 20-56 44-56s44 24 44 56c0 10-1 19-4 26-4-30-20-46-40-46s-36 16-40 46c-3-7-4-16-4-26z" fill="#${top}" opacity=".35"/>
`;

/** One 200×200 rounded portrait. */
function portrait({ id, skin, hair, style, top, look }, index) {
  const bg = BACKDROPS[index % BACKDROPS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Simulated interviewer portrait ${id}">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#${bg}"/>
      <stop offset="1" stop-color="#f3ddd0"/>
    </linearGradient>
    <clipPath id="clip${id}"><rect width="200" height="200" rx="28"/></clipPath>
  </defs>
  <g clip-path="url(#clip${id})">
    <rect width="200" height="200" fill="url(#bg${id})"/>
    <circle cx="164" cy="34" r="30" fill="#${top}" opacity=".10"/>
    ${hairBack(style, hair)}
    ${face(id, skin, hair, top, look)}
    ${style === "hijab" ? hijabWrap(hair, top) : hairFront(style, hair)}
  </g>
</svg>
`;
}

/** The dashboard hero: three of the crew, side by side, in the same style. */
function hero() {
  const pick = [1, 7, 14];
  const width = 720;
  const figures = pick
    .map((id, i) => {
      const c = CHARACTERS.find((entry) => entry.id === id);
      const x = 60 + i * 210;
      return `<g transform="translate(${x},70) scale(1.05)">
        ${hairBack(c.style, c.hair)}
        ${face(c.id, c.skin, c.hair, c.top, c.look)}
        ${c.style === "hijab" ? hijabWrap(c.hair, c.top) : hairFront(c.style, c.hair)}
      </g>`;
    })
    .join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 480" width="${width}" height="480" role="img" aria-label="Three friendly Tutorly interview characters in a warm, welcoming setting">
  <defs>
    <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fdf1e6"/>
      <stop offset="1" stop-color="#f6e2d5"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="480" rx="32" fill="url(#heroBg)"/>
  <circle cx="640" cy="80" r="70" fill="#e48168" opacity=".12"/>
  <circle cx="80" cy="410" r="58" fill="#6b8e6b" opacity=".12"/>
  <g opacity=".9">
    ${figures}
  </g>
  <path d="m628 44 4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="#e48168"/>
</svg>
`;
}

await mkdir(outDir, { recursive: true });
for (const [index, character] of CHARACTERS.entries()) {
  await writeFile(path.join(outDir, `${character.id}.svg`), portrait(character, index), "utf8");
}
await writeFile(path.join(root, "public", "images", "tutorly-hero.svg"), hero(), "utf8");

console.log(`[make-avatars] wrote ${CHARACTERS.length} portraits to public/images/characters/`);
console.log("[make-avatars] wrote public/images/tutorly-hero.svg");
console.log(
  "[make-avatars] a real photo wins automatically — drop images/characters/<id>.jpg (or .png/.webp/.avif) in and rebuild",
);
