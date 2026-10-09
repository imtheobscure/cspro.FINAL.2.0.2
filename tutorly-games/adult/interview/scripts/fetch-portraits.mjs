#!/usr/bin/env node
/**
 * Fetch the photographic portraits for the 24 interviewers.
 *
 * The app was designed around real photographs — `/images/characters/<id>.jpg`
 * and `/images/tutorly-hero.jpg` — and its own Help dialog says the interviewers
 * have "AI-generated portraits". Those files were never shipped, so every avatar
 * fell back to a flat generated illustration. This script fills the contract.
 *
 * Each portrait is a photorealistic, computer-generated face (nobody real is
 * depicted), cast to match the character: gender, age band and ethnicity follow
 * the names and biographies in `src/lib/characters.ts`, so Emily Parker, Priya
 * Shah, Omar Hassan, Victoria Lin and Catherine Blake each get a face that fits
 * them. Faces are checked for size, format and uniqueness, then cropped and
 * resized for the places they are shown (a 512px square covers the 166px cards
 * and the ~440px practice stage, even on a high-density screen).
 *
 * The artwork is deliberately replaceable: put your own `1.jpg` … `24.jpg` in
 * `public/images/characters/` and this script will leave them alone unless you
 * pass `--force`. `README.md` in that folder lists the cast.
 *
 * Usage:
 *   node scripts/fetch-portraits.mjs                     # fill in whatever is missing
 *   node scripts/fetch-portraits.mjs --force             # re-download every portrait
 *   node scripts/fetch-portraits.mjs --ids=5,18          # only these characters
 *   node scripts/fetch-portraits.mjs --from "my photos"  # import YOUR pictures
 *
 * `--from` takes any folder or `.zip` holding your own photographs, whatever they
 * are called. Files are matched to characters by name (`emily.jpg`,
 * `priya-shah.png`, `07.jpg`) or, when that finds nothing, by their natural
 * order; each is cropped and re-encoded to the 512px square the app expects. The
 * mapping is printed so it can be checked, and the hero panel is rebuilt from it.
 */
import { mkdir, readdir, readFile, rm, stat, unlink, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const run = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const charactersDir = path.join(root, "public", "images", "characters");
const heroFile = path.join(root, "public", "images", "tutorly-hero.jpg");

const SOURCE = "https://this-person-does-not-exist.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

/** Where the faces are shown, largest first — 512px square covers all of them. */
const SIZE = 512;

/**
 * The cast: id, name and the look that matches the character's biography.
 *
 * `age` uses the generator's own bands; `etnic` its ethnicity values. Every
 * character gets its OWN (gender, age, ethnicity) triple, and that is deliberate:
 * the generator caches a triple for a while and serves the same face back, so two
 * characters fetched in the same run from the same triple would be twins — you
 * would have to wait out the cache and hope. Unique triples make distinct faces a
 * property of the cast rather than of timing, which also means the only way to
 * cast three white women in their late twenties is to spread them across the age
 * bands. The bands stay plausible for each character: the senior final-round
 * interviewer is 50+, the newly-qualified mentor is 19–25.
 */
const CAST = [
  { id: 1, name: "Emily Parker", gender: "female", age: "26-35", etnic: "white" },
  { id: 2, name: "James Wilson", gender: "male", age: "19-25", etnic: "white" },
  { id: 3, name: "Sofia Chen", gender: "female", age: "26-35", etnic: "asian" },
  { id: 4, name: "David Mitchell", gender: "male", age: "26-35", etnic: "white" },
  { id: 5, name: "Priya Shah", gender: "female", age: "26-35", etnic: "indian" },
  { id: 6, name: "Omar Hassan", gender: "male", age: "26-35", etnic: "middle_eastern" },
  { id: 7, name: "Grace Johnson", gender: "female", age: "26-35", etnic: "black" },
  { id: 8, name: "Lucas Rivera", gender: "male", age: "26-35", etnic: "latino_hispanic" },
  { id: 9, name: "Arjun Mehta", gender: "male", age: "26-35", etnic: "indian" },
  { id: 10, name: "Helen Park", gender: "female", age: "19-25", etnic: "asian" },
  { id: 11, name: "Olivia Bennett", gender: "female", age: "35-50", etnic: "white" },
  { id: 12, name: "Marcus Reed", gender: "male", age: "35-50", etnic: "black" },
  { id: 13, name: "Amina Farouk", gender: "female", age: "26-35", etnic: "middle_eastern" },
  { id: 14, name: "Daniel Kim", gender: "male", age: "26-35", etnic: "asian" },
  { id: 15, name: "Isabella Torres", gender: "female", age: "26-35", etnic: "latino_hispanic" },
  { id: 16, name: "Thomas Wright", gender: "male", age: "35-50", etnic: "white" },
  { id: 17, name: "Alex Morgan", gender: "female", age: "19-25", etnic: "white" },
  { id: 18, name: "Meera Patel", gender: "female", age: "35-50", etnic: "indian" },
  { id: 19, name: "Nadia Brooks", gender: "female", age: "35-50", etnic: "black" },
  { id: 20, name: "Richard Hayes", gender: "male", age: "50", etnic: "white" },
  { id: 21, name: "Victoria Lin", gender: "female", age: "35-50", etnic: "asian" },
  { id: 22, name: "Samir Rahman", gender: "male", age: "35-50", etnic: "indian" },
  { id: 23, name: "Diane Foster", gender: "female", age: "50", etnic: "black" },
  { id: 24, name: "Catherine Blake", gender: "female", age: "50", etnic: "white" },
];

/** The three portraits stitched into the dashboard hero art. */
const HERO_CAST = [1, 9, 7];

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--ids="));
const only = onlyArg ? new Set(onlyArg.slice(6).split(",").map((n) => Number(n.trim()))) : null;
const fromFlag = args.findIndex((a) => a === "--from" || a.startsWith("--from="));
const from =
  fromFlag === -1
    ? null
    : args[fromFlag].includes("=")
      ? args[fromFlag].slice(args[fromFlag].indexOf("=") + 1)
      : args[fromFlag + 1];
const importDir = path.join(root, ".portrait-import");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** JPEG dimensions, so a placeholder or an HTML error page cannot pass as a face. */
function jpegSize(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

/**
 * One fresh generated face. The API hands back a filename on a CDN path; the
 * page's own "refresh" button uses the same two calls.
 */
async function fetchFace({ gender, age, etnic }) {
  const query = `&gender=${gender}&age=${age}&etnic=${etnic}`;
  const request = await fetch(`${SOURCE}/new?time=${Date.now()}${query}`, {
    headers: { "user-agent": UA, accept: "application/json", referer: `${SOURCE}/en` },
    signal: AbortSignal.timeout(25000),
  });
  if (!request.ok) throw new Error(`generator returned ${request.status}`);
  const payload = await request.json();
  if (!payload?.src) throw new Error("generator returned no image path");

  const image = await fetch(`${SOURCE}${payload.src}`, {
    headers: { "user-agent": UA, referer: `${SOURCE}/en`, accept: "image/jpeg,image/*" },
    signal: AbortSignal.timeout(25000),
  });
  if (!image.ok) throw new Error(`image returned ${image.status}`);
  const buffer = Buffer.from(await image.arrayBuffer());
  if (buffer.length < 15000) throw new Error(`image too small (${buffer.length} bytes)`);
  const size = jpegSize(buffer);
  if (!size) throw new Error("not a JPEG");
  if (size.width < 512 || size.height < 512) throw new Error(`too small (${size.width}x${size.height})`);
  return buffer;
}

/**
 * A cheap visual fingerprint: 16×16 greyscale pixels.
 *
 * Hashing the downloaded bytes does not work — the same face can arrive as a
 * differently-compressed JPEG from a different edge node, so two byte hashes
 * would look "unique" while the learner sees the same person twice. Comparing
 * the picture itself is what actually catches a repeat.
 */
async function fingerprint(input) {
  return sharp(input).resize(16, 16, { fit: "fill" }).greyscale().raw().toBuffer();
}

/** Sum of absolute pixel differences between two 16×16 fingerprints. */
const distance = (a, b) => a.reduce((sum, byte, i) => sum + Math.abs(byte - b[i]), 0);

/**
 * Ask until we get a face that is genuinely not one we already have. The unique
 * triples in `CAST` are what normally guarantee that, so this is a safety net for
 * the day the generator serves the same face for two triples — and a silent
 * repeat is much worse than a slow build.
 */
async function fetchUniqueFace(cast, seenBuffers) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const buffer = await fetchFace(cast);
      const pixels = await fingerprint(buffer);
      const clash = seenBuffers.find((known) => distance(known, pixels) < 400);
      if (clash) {
        console.log(`  ${cast.id}. ${cast.name}: looks like an existing portrait, retrying (${attempt}/4)`);
        await sleep(1500);
        continue;
      }
      seenBuffers.push(pixels);
      return buffer;
    } catch (error) {
      console.log(`  ${cast.id}. ${cast.name}: ${error.message}, retrying (${attempt}/4)`);
      await sleep(1500 * attempt);
    }
  }
  throw new Error(`no usable portrait for ${cast.name}`);
}

/** Image files anywhere under a folder, in a natural order (2 before 10). */
async function findImages(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await findImages(full)));
    else if (/\.(jpe?g|png|webp|avif|bmp|tiff?)$/i.test(entry.name)) found.push(full);
  }
  return found.sort((a, b) =>
    path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true }),
  );
}

/**
 * Which character a file is meant for, from its name alone.
 *
 * `07.jpg`, `character-7.png`, `Emily Parker.jpg` and `priya-shah.webp` all
 * resolve. Anything unknown or ambiguous returns null and is placed by natural
 * order among whatever ids are still free.
 */
function idFromName(file) {
  const base = path.basename(file, path.extname(file)).toLowerCase();
  const numbered = /(?:^|[^a-z0-9])(\d{1,2})(?:[^0-9]|$)/.exec(base);
  if (numbered) {
    const id = Number(numbered[1]);
    if (id >= 1 && id <= CAST.length) return id;
  }
  for (const cast of CAST) {
    const [first, last] = cast.name.toLowerCase().split(" ");
    if (base.includes(last) || base.includes(first)) return cast.id;
  }
  return null;
}

/**
 * Import the tutor's own photographs — any folder, any `.zip`, any filenames.
 *
 * This exists so the artwork is never held hostage by a filename convention: put
 * twenty-four pictures in a folder, point `--from` at it, and each one is cropped
 * to the square the interface expects. Files that cannot be matched leave that
 * character's existing portrait untouched rather than guessing.
 */
async function importPhotographs(source) {
  const resolved = path.resolve(source);
  const isFolder = (await stat(resolved)).isDirectory();
  if (!isFolder) {
    if (!/\.zip$/i.test(resolved)) throw new Error(`--from expects a folder or a .zip: ${resolved}`);
    await rm(importDir, { recursive: true, force: true });
    await mkdir(importDir, { recursive: true });
    console.log(`  unzipping ${path.basename(resolved)}…`);
    await run("unzip", ["-o", "-q", resolved, "-d", importDir]);
  }

  const sourceDir = isFolder ? resolved : importDir;
  const files = await findImages(sourceDir);
  if (!files.length) throw new Error(`no images found in ${sourceDir}`);
  console.log(`  found ${files.length} image(s) in ${sourceDir}\n`);

  /** Named matches first, then fill the gaps in natural order. */
  const assignment = new Map();
  const leftovers = [];
  for (const file of files) {
    const id = idFromName(file);
    if (id && !assignment.has(id)) assignment.set(id, file);
    else leftovers.push(file);
  }
  for (let id = 1; id <= CAST.length && leftovers.length; id += 1) {
    if (!assignment.has(id)) assignment.set(id, leftovers.shift());
  }

  for (const cast of CAST) {
    const file = assignment.get(cast.id);
    if (!file) continue;
    await sharp(file)
      .resize(SIZE, SIZE, { fit: "cover", position: "top" })
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toFile(path.join(charactersDir, `${cast.id}.jpg`));
    console.log(`  ${String(cast.id).padStart(2)} ${cast.name.padEnd(16)} ← ${path.basename(file)}`);
  }

  await rm(importDir, { recursive: true, force: true });
  const missing = CAST.filter((cast) => !assignment.has(cast.id));
  if (missing.length) {
    console.log(`\n  no picture for ${missing.length} character(s), portrait left as it was:`);
    console.log(`  ${missing.map((cast) => `${cast.id} ${cast.name}`).join(", ")}`);
    console.log(`\n  Copy them into ${path.relative(root, charactersDir)} as \`<id>.jpg\` and re-run.`);
  }

  await buildHero(await Promise.all(HERO_CAST.map((id) => portraitFile(id))));
  console.log(`\n  hero art rebuilt from portraits ${HERO_CAST.join(", ")}`);
  console.log("Next: npm run build (regenerates the manifest and republishes the app)");
}

/**
 * The portrait file for a character, whichever of the two naming conventions is
 * on disk — the tutor's own `01.jpg` … `24.jpg` or this app's `1.jpg` … `24.jpg`.
 */
async function portraitFile(id) {
  const plain = path.join(charactersDir, `${id}.jpg`);
  if (await exists(plain)) return plain;
  const padded = path.join(charactersDir, `${String(id).padStart(2, "0").slice(-2)}.jpg`);
  return padded;
}

/** Warm, welcoming collage of three faces — the app's original hero brief. */
async function buildHero(portraitFiles) {
  const [first, second, third] = portraitFiles;
  const circles = [
    { file: first, size: 390, x: 110, y: 285 },
    { file: second, size: 300, x: 545, y: 400 },
    { file: third, size: 360, x: 880, y: 240 },
  ];

  const layers = [];
  for (const circle of circles) {
    const mask = Buffer.from(
      `<svg width="${circle.size}" height="${circle.size}"><circle cx="${circle.size / 2}" cy="${circle.size / 2}" r="${circle.size / 2 - 5}" fill="#fff"/></svg>`,
    );
    const ring = Buffer.from(
      `<svg width="${circle.size}" height="${circle.size}"><circle cx="${circle.size / 2}" cy="${circle.size / 2}" r="${circle.size / 2 - 5}" fill="none" stroke="#fffefd" stroke-width="9"/></svg>`,
    );
    const face = await sharp(circle.file)
      .resize(circle.size, circle.size, { fit: "cover", position: "top" })
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
    layers.push({ input: face, left: circle.x, top: circle.y });
    layers.push({ input: ring, left: circle.x, top: circle.y });
  }

  const background = Buffer.from(
    `<svg width="1400" height="900" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="#fdf2ec"/>
           <stop offset="0.55" stop-color="#f9e4da"/>
           <stop offset="1" stop-color="#f4d5c9"/>
         </linearGradient>
       </defs>
       <rect width="1400" height="900" fill="url(#warm)"/>
     </svg>`,
  );

  await sharp(background).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toFile(heroFile);
}

async function main() {
  if (args.includes("--hero")) {
    await buildHero(await Promise.all(HERO_CAST.map((id) => portraitFile(id))));
    console.log(`  hero art rebuilt from portraits ${HERO_CAST.join(", ")}`);
    return;
  }

  if (args.includes("--help") || args.includes("-h")) {
    const usage = await readFile(new URL(import.meta.url), "utf8");
    const header = /\/\*\*([\s\S]*?)\*\//.exec(usage);
    console.log(header ? header[1].replace(/^ \* ?/gm, "").trim() : "see the header of this script");
    return;
  }

  await mkdir(charactersDir, { recursive: true });

  if (from) {
    await importPhotographs(from);
    return;
  }

  const targets = CAST.filter((cast) => !only || only.has(cast.id));
  const seen = [];
  const written = [];

  for (const cast of targets) {
    const file = path.join(charactersDir, `${cast.id}.jpg`);
    if (!force && (await exists(file))) {
      console.log(`  ${cast.id}. ${cast.name}: already here, keeping it (use --force to replace)`);
      seen.push(await fingerprint(file));
      written.push(file);
      continue;
    }
    console.log(`  ${cast.id}. ${cast.name} (${cast.ethnicity ?? cast.etnic}, ${cast.gender}, ${cast.age})`);
    const buffer = await fetchUniqueFace(cast, seen);
    await sharp(buffer)
      .resize(SIZE, SIZE, { fit: "cover", position: "top" })
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toFile(file);
    written.push(file);
    await sleep(700);
  }

  const heroPortraits = HERO_CAST.map((id) => path.join(charactersDir, `${id}.jpg`));
  if (heroPortraits.every((file) => written.includes(file)) || !(await exists(heroFile))) {
    await buildHero(heroPortraits);
    console.log(`\n  hero art → ${path.relative(root, heroFile)}`);
  }

  console.log(`\n${written.length} portrait(s) in ${path.relative(root, charactersDir)}`);
  console.log("Next: node scripts/manifest-images.mjs (or just npm run build)");
}

await main();
