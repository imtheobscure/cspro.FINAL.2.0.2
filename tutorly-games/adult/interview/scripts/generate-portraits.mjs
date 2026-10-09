#!/usr/bin/env node
/**
 * Generate the 24 interviewer portraits as professional business headshots.
 *
 * The first generator used for these portraits (`fetch-portraits.mjs --force`)
 * produced "in the wild" snapshots — greenery behind them, hoodies, people who
 * read as teenagers. That is not what an interview coach should look like. This
 * script writes a prompt per character instead: adult age, the character's gender
 * and background, business attire, a studio backdrop, and a head-and-shoulders
 * crop — so the whole set reads as one corporate headshot session.
 *
 * Faces are computer-generated. Nobody real is depicted, so no likeness or model
 * release is involved, and "all characters are fictional" stays true.
 *
 * The image service is a free, keyless, best-effort pool: requests are queued and
 * sometimes rate-limited, so every image is retried with backoff, and whatever
 * fails is reported at the end instead of left as a half-finished set. Its
 * watermark sits in the bottom-right corner, so the last few percent of every
 * image is cropped away before the picture is resized for the interface.
 *
 * Usage:
 *   node scripts/generate-portraits.mjs                # all 24 that are missing
 *   node scripts/generate-portraits.mjs --force        # redraw every portrait
 *   node scripts/generate-portraits.mjs --ids=1,10,24  # just these characters
 *   node scripts/generate-portraits.mjs --sheet        # also write a review sheet
 */
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const charactersDir = path.join(root, "public", "images", "characters");
const rawDir = path.join(root, ".portrait-raw");
const heroFile = path.join(root, "public", "images", "tutorly-hero.jpg");
const sheetFile = path.join(root, ".portrait-review.html");

const ENDPOINT = "https://image.pollinations.ai/prompt";
const SIZE = 512;

/**
 * What makes every portrait look like the same photographer took it: business
 * attire, a studio backdrop, even light, and a head-and-shoulders framing. The
 * "no text or logo" instruction helps only sometimes, which is why the watermark
 * is also cropped out afterwards.
 */
const STYLE =
  "corporate headshot photograph, business attire, studio lighting with soft key and fill, plain light grey seamless studio backdrop, head and shoulders framing, sharp focus on the eyes, professional business portrait, photorealistic, 85mm lens, no text, no logo, no watermark";

/**
 * One line per interviewer — age, background, hair, attire and expression chosen
 * to match the biography in `src/lib/characters.ts`. Everybody is an adult, in
 * business dress, looking like someone a learner would meet across a desk.
 */
const SUBJECTS = [
  { id: 1, name: "Emily Parker", subject: "a friendly 33 year old white British woman with shoulder length light brown hair, wearing a navy blazer over a white blouse, warm approachable smile" },
  { id: 2, name: "James Wilson", subject: "a relaxed 30 year old white British man with short dark hair and a light beard, wearing a charcoal suit over a pale blue shirt with no tie, easy friendly smile" },
  { id: 3, name: "Sofia Chen", subject: "a thoughtful 32 year old East Asian woman with straight black hair tied back, wearing a soft grey blazer and cream blouse, calm perceptive expression" },
  { id: 4, name: "David Mitchell", subject: "a precise 41 year old white British man with short greying brown hair and thin rimless glasses, wearing a navy suit and dark tie, measured calm expression" },
  { id: 5, name: "Priya Shah", subject: "a supportive 34 year old South Asian Indian woman with long dark brown hair, wearing a deep teal blazer and white blouse, warm encouraging smile" },
  { id: 6, name: "Omar Hassan", subject: "a practical 37 year old Middle Eastern man with short black hair and a neat short beard, wearing a dark grey suit and burgundy tie, composed reassuring expression" },
  { id: 7, name: "Grace Johnson", subject: "an empathetic 33 year old Black woman with natural curly shoulder length hair, wearing a plum blazer and cream blouse, kind observant expression" },
  { id: 8, name: "Lucas Rivera", subject: "an energetic 31 year old Latino man with short dark wavy hair, wearing a navy blazer over a white open collar shirt, friendly open smile" },
  { id: 9, name: "Arjun Mehta", subject: "an analytical 38 year old South Asian Indian man with short black hair and rectangular glasses, wearing a charcoal suit and blue tie, thoughtful expression" },
  { id: 10, name: "Helen Park", subject: "a reflective 29 year old Korean woman with straight dark hair, wearing a navy blazer over a pale blouse, curious calm expression" },
  { id: 11, name: "Olivia Bennett", subject: "a direct efficient 45 year old white British woman with short auburn hair, wearing a tailored charcoal blazer over a white shirt, confident composed expression" },
  { id: 12, name: "Marcus Reed", subject: "a grounded collaborative 44 year old Black man with close cropped hair and a short beard, wearing a grey suit over a white shirt, warm steady expression" },
  { id: 13, name: "Amina Farouk", subject: "a precise 38 year old Middle Eastern North African woman with dark hair pulled back and a silk scarf at the neck, wearing a beige blazer over a dark blouse, composed professional expression" },
  { id: 14, name: "Daniel Kim", subject: "a methodical 35 year old Korean man with short black hair, wearing a dark grey blazer over a light blue shirt, calm focused expression" },
  { id: 15, name: "Isabella Torres", subject: "an engaging 34 year old Latina woman with dark wavy hair, wearing a burgundy blazer over a white blouse, confident persuasive smile" },
  { id: 16, name: "Thomas Wright", subject: "a fair minded 47 year old white British man with short grey hair, wearing a navy suit and a grey tie, quizzical but fair expression" },
  { id: 17, name: "Alex Morgan", subject: "a creative 30 year old white woman with short dark hair and bold round glasses, wearing a mustard blazer over a black top, curious alert expression" },
  { id: 18, name: "Meera Patel", subject: "a principled 43 year old South Asian Indian woman with dark hair in a low bun, wearing a forest green blazer over a cream blouse, thoughtful principled expression" },
  { id: 19, name: "Nadia Brooks", subject: "a decisive 42 year old Black woman with short cropped natural hair, wearing a navy blazer over a white blouse, focused steady expression" },
  { id: 20, name: "Richard Hayes", subject: "a strategic 54 year old white British man with grey hair, wearing a navy pinstripe suit with a silver tie, senior executive confident expression" },
  { id: 21, name: "Victoria Lin", subject: "a poised 44 year old East Asian woman with shoulder length black hair, wearing a tailored black blazer over a silk blouse, assertive composed expression" },
  { id: 22, name: "Samir Rahman", subject: "a balanced 46 year old South Asian Bangladeshi man with short black hair and a neat beard, wearing a charcoal suit and patterned tie, attentive calm expression" },
  { id: 23, name: "Diane Foster", subject: "an incisive 52 year old Black woman with short curly hair and pearl earrings, wearing a deep grey blazer over a white blouse, unflappable expression" },
  { id: 24, name: "Catherine Blake", subject: "a perceptive 55 year old white woman with elegant silver hair, wearing a navy blazer over a cream blouse, challenging but warm expression" },
];

const HERO_CAST = [1, 9, 7];
const HERO_PROMPT =
  "team photograph of three business professionals in a bright modern office lobby: a white woman in a navy blazer, a South Asian Indian man in a charcoal suit, and a Black woman in a plum blazer, standing together, natural soft daylight, warm welcoming atmosphere, photorealistic, no text, no logo, no watermark";

const args = process.argv.slice(2);
const force = args.includes("--force");
const wantSheet = args.includes("--sheet");
const onlyArg = args.find((a) => a.startsWith("--ids="));
const only = onlyArg ? new Set(onlyArg.slice(6).split(",").map((n) => Number(n.trim()))) : null;
const concurrencyArg = args.find((a) => a.startsWith("--jobs="));
const jobs = Math.max(1, Math.min(4, Number(concurrencyArg?.slice(7) ?? 3)));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const isJpeg = (buffer) => buffer.length > 20000 && buffer[0] === 0xff && buffer[1] === 0xd8;

/**
 * One image, with the retries the pool needs. A 429 or a timeout is normal here —
 * the service is a shared community queue — so a failure is retried with backoff
 * rather than treated as the end of the run.
 */
async function requestImage(prompt, { width, height, seed }) {
  const url = `${ENDPOINT}/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux&enhance=false`;
  let lastError = "unknown";
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { accept: "image/jpeg,image/*" }, signal: AbortSignal.timeout(150000) });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (isJpeg(buffer)) return buffer;
        lastError = `not an image (${buffer.length} bytes)`;
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (error) {
      lastError = error.name === "TimeoutError" ? "timed out" : error.message;
    }
    const wait = Math.min(45000, 4000 * attempt);
    console.log(`      retry ${attempt}/8 (${lastError}) in ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }
  throw new Error(lastError);
}

/**
 * Trim the service's corner watermark, then frame it as a head-and-shoulders
 * portrait. Cropping the bottom slice costs nothing visually — it is desk and
 * background — and guarantees no logo ends up in the product.
 */
async function processHeadshot(buffer, file) {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;
  return sharp(buffer)
    .extract({ left: 0, top: 0, width, height: Math.round(height * 0.92) })
    .resize(SIZE, SIZE, { fit: "cover", position: "top" })
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toFile(file);
}

async function main() {
  await mkdir(charactersDir, { recursive: true });
  await mkdir(rawDir, { recursive: true });

  const queue = SUBJECTS.filter(
    (s) => (!only || only.has(s.id)) && (force || !existsSync(path.join(charactersDir, `${s.id}.jpg`))),
  );
  const skipped = SUBJECTS.filter((s) => (!only || only.has(s.id)) && !queue.includes(s));
  for (const s of skipped) console.log(`  ${s.id}. ${s.name}: already here, keeping it (use --force to redraw)`);

  const failed = [];
  let index = 0;

  const worker = async () => {
    while (index < queue.length) {
      const item = queue[index++];
      console.log(`  ${item.id}. ${item.name}`);
      try {
        const buffer = await requestImage(`${item.subject}, ${STYLE}`, { width: 1024, height: 1024, seed: item.id * 7919 + 13 });
        await writeFile(path.join(rawDir, `${item.id}.jpg`), buffer);
        await processHeadshot(buffer, path.join(charactersDir, `${item.id}.jpg`));
        console.log(`      ok (${Math.round(buffer.length / 1024)} kB)`);
      } catch (error) {
        failed.push({ item, error: error.message });
        console.log(`      FAILED: ${error.message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: jobs }, worker));

  if (failed.length) {
    console.log(`\n  ${failed.length} portrait(s) still missing — run this again to retry just them:`);
    console.log(`  npm run portraits:ai -- --force --ids=${failed.map((f) => f.item.id).join(",")}`);
  }

  // The dashboard hero, drawn from the same session so the styles match.
  const heroMissing = !(await exists(heroFile));
  if (failed.length === 0 && (heroMissing || force)) {
    try {
      console.log("  hero panel…");
      const buffer = await requestImage(HERO_PROMPT, { width: 1440, height: 800, seed: 8861 });
      await writeFile(path.join(rawDir, "hero.jpg"), buffer);
      // The service may hand back a different size than asked for, so crop from
      // what actually arrived rather than from the request.
      const meta = await sharp(buffer).metadata();
      const width = meta.width ?? 1440;
      const height = meta.height ?? 800;
      await sharp(buffer)
        .extract({ left: 0, top: 0, width, height: Math.round(height * 0.93) })
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(heroFile);
      console.log("  hero panel: ok");
    } catch (error) {
      console.log(`  hero panel failed (${error.message}) — the existing hero is untouched`);
    }
  }

  if (wantSheet) {
    const cards = [];
    for (const item of SUBJECTS) {
      const file = path.join(charactersDir, `${item.id}.jpg`);
      if (!(await exists(file))) continue;
      const data = await readFile(file);
      cards.push(
        `<figure><img src="data:image/jpeg;base64,${data.toString("base64")}"><figcaption>${item.id}. ${item.name}</figcaption></figure>`,
      );
    }
    await writeFile(
      sheetFile,
      `<!doctype html><meta charset="utf-8"><title>Interviewer portraits</title>
<style>body{font:13px system-ui;background:#faf6f4;margin:0;padding:14px}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}figure{margin:0;text-align:center}
img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px}figcaption{font-size:10px;color:#444;margin-top:4px}</style>
<h2>The 24 interviewers</h2><div class="grid">${cards.join("")}</div>`,
    );
    console.log(`\n  review sheet → ${path.relative(root, sheetFile)}`);
  }

  console.log(`\n  portraits in ${path.relative(root, charactersDir)}`);
  console.log("Next: npm run build (regenerates the manifest and republishes the app)");
}

await main();
