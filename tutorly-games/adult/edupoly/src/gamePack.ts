import type { PropertyColor, Question, QuestionType, Tile, TileType } from './types';
import { DEFAULT_TILES, SAMPLE_QUESTIONS } from './gameData';
import type { ShellPlayer } from './GameShell';

/* ═══════════════════════════════════════════════════════════════════════════
   GAME PACK — the AI prompt for THIS game + a tolerant parser for its answer.
   The setup page (GameShell) only needs buildPrompt() and parsePack().
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PackPlayer {
  name?: string;
  emoji?: string;
  color?: string;
  isNPC?: boolean;
  npcLines?: string;
}

export interface ParsedPack {
  town: string;
  cefrLevel: string;
  topic: string;
  players: PackPlayer[];
  tiles: Tile[];
  /** full question bank: tile questions + standalone questions + card decks */
  questions: Question[];
  chanceCards: Question[];
  communityChest: Question[];
  culturalTips: string[];
  /** how many board positions had to be filled from the built-in board */
  padded: number;
}

const TILE_TYPES: TileType[] = [
  'property', 'railroad', 'utility', 'chance', 'community_chest',
  'go', 'jail', 'free_parking', 'go_to_jail', 'tax',
];
const COLORS: PropertyColor[] = [
  'brown', 'light_blue', 'pink', 'orange', 'red', 'yellow', 'green', 'blue',
  'railroad', 'utility', 'none',
];
const QUESTION_TYPES: QuestionType[] = [
  'mcq', 'true_false', 'fill_gap', 'listening', 'matching',
  'sentence_scramble', 'ordering', 'wild_card', 'challenge',
  'would_you_rather', 'truth_or_dare',
];

const DEFAULT_PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

// ─── SANITISERS ───────────────────────────────────────────────────────────────
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined;
const strArray = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : String(x))).filter(Boolean) : undefined;

function asQuestion(raw: unknown, fallbackId: string): Question | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const text = str(r.text).trim();
  if (!text) return null;
  const rawType = str(r.type, 'mcq') as QuestionType;
  const type: QuestionType = QUESTION_TYPES.includes(rawType) ? rawType : 'mcq';
  const correct = r.correctAnswer;
  const q: Question = {
    id: str(r.id, fallbackId) || fallbackId,
    type,
    text,
    options: strArray(r.options),
    audioText: str(r.audioText) || undefined,
    correctAnswer:
      typeof correct === 'string' ? correct : Array.isArray(correct) ? correct.map(String) : undefined,
    pairs: Array.isArray(r.pairs)
      ? (r.pairs as unknown[])
          .map(p => {
            const pr = p as Record<string, unknown>;
            return { left: str(pr.left), right: str(pr.right) };
          })
          .filter(p => p.left && p.right)
      : undefined,
    words: strArray(r.words),
    wildEffect: str(r.wildEffect) as Question['wildEffect'] || undefined,
    challengeText: str(r.challengeText) || undefined,
    optionA: str(r.optionA) || undefined,
    optionB: str(r.optionB) || undefined,
    hint: str(r.hint) || undefined,
    explanation: str(r.explanation) || undefined,
    imageUrl: str(r.imageUrl) || undefined,
  };
  if (!q.wildEffect) delete q.wildEffect;
  return q;
}

function asTile(raw: unknown, index: number): Tile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawType = str(r.type, 'property') as TileType;
  const type: TileType = TILE_TYPES.includes(rawType) ? rawType : 'property';
  const rawColor = str(r.color, 'none') as PropertyColor;
  const color: PropertyColor = COLORS.includes(rawColor) ? rawColor : 'none';
  const rent = Array.isArray(r.rent) ? r.rent.map(n => num(n) ?? 0) : undefined;

  const tile: Tile = {
    id: index,
    name: str(r.name, `Tile ${index}`).slice(0, 40) || `Tile ${index}`,
    type,
    color,
    price: num(r.price),
    rent,
    mortgageValue: num(r.mortgageValue),
    housePrice: num(r.housePrice),
    description: str(r.description) || undefined,
    realAddress: str(r.realAddress) || undefined,
    imageUrl: str(r.imageUrl) || undefined,
    question: asQuestion(r.question, `q${index}`) ?? undefined,
    culture: (() => {
      const c = r.culture as Record<string, unknown> | undefined;
      if (!c || typeof c !== 'object') return undefined;
      const phrases = Array.isArray(c.phrases)
        ? (c.phrases as unknown[])
            .map(p => {
              const pr = p as Record<string, unknown>;
              return { phrase: str(pr.phrase), meaning: str(pr.meaning) };
            })
            .filter(p => p.phrase)
        : undefined;
      const photoUrls = (
        strArray(c.photoUrls) ??
        strArray(c.photos) ??
        strArray(c.images) ??
        []
      ).filter(u => /^https?:/i.test(u));
      const latLng =
        str(c.latLng) ||
        str(c.coordinates) ||
        (Array.isArray(c.coordinates) ? (c.coordinates as unknown[]).map(String).join(',') : '') ||
        undefined;
      return {
        neighborhood: str(c.neighborhood) || undefined,
        country: str(c.country) || undefined,
        photoUrl: str(c.photoUrl) || photoUrls[0] || undefined,
        photoUrls: photoUrls.length ? photoUrls : undefined,
        photoQuery:
          str(c.photoQuery) ||
          (Array.isArray(c.photoQuery) ? (c.photoQuery as unknown[]).map(String).join(',') : '') ||
          undefined,
        mapImageUrl: str(c.mapImageUrl) || undefined,
        // ── place media: everything the AI could not be sure about is optional,
        //    so a half-filled culture block still renders a useful card ──
        videoUrl: str(c.videoUrl) || str(c.video) || undefined,
        videoCaption: str(c.videoCaption) || undefined,
        videoPosterUrl: str(c.videoPosterUrl) || undefined,
        panoramaUrl: str(c.panoramaUrl) || str(c.panorama) || str(c.streetView) || undefined,
        panoramaLink: str(c.panoramaLink) || str(c.streetViewLink) || undefined,
        mapQuery: str(c.mapQuery) || str(c.address) || undefined,
        latLng,
        description: str(c.description) || str(c.about) || undefined,
        mediaCaption: str(c.mediaCaption) || undefined,
        foods: strArray(c.foods),
        thingsToDo: strArray(c.thingsToDo),
        taboos: strArray(c.taboos),
        phrases,
        funFact: str(c.funFact) || str(c.fact) || undefined,
      };
    })(),
  };
  return tile;
}

function asPlayers(raw: unknown): PackPlayer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(p => p && typeof p === 'object')
    .map((p, i) => {
      const r = p as Record<string, unknown>;
      return {
        name: str(r.name) || undefined,
        emoji: str(r.emoji) || undefined,
        color: str(r.color, DEFAULT_PLAYER_COLORS[i % DEFAULT_PLAYER_COLORS.length]),
        isNPC: r.isNPC === true,
        npcLines: str(r.npcLines) || undefined,
      };
    });
}

// ─── PARSER ───────────────────────────────────────────────────────────────────
export function parsePack(json: string): { ok: true; pack: ParsedPack } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: `JSON error: ${e instanceof Error ? e.message : 'could not parse'}` };
  }

  // Accept: a bare array of tiles, or a pack object with a tiles array.
  const root = (Array.isArray(data) ? { tiles: data } : (data ?? {})) as Record<string, unknown>;
  const rawTiles = Array.isArray(root.tiles) ? root.tiles : null;
  if (!rawTiles) {
    return { ok: false, error: 'No "tiles" array found — ask the AI for the full pack JSON.' };
  }
  if (rawTiles.length < 8) {
    return { ok: false, error: `Only ${rawTiles.length} tiles found — a Monopoly board needs 40 (ids 0-39).` };
  }

  // Place tiles by their "id" when the AI provided ids, otherwise by order.
  const byId = new Map<number, Tile>();
  rawTiles.forEach((t, i) => {
    const raw = (t ?? {}) as Record<string, unknown>;
    const id = num(raw.id);
    const slot = id != null && id >= 0 && id <= 39 ? Math.floor(id) : i;
    if (slot < 0 || slot > 39 || byId.has(slot)) return;
    byId.set(slot, asTile(t, slot));
  });

  const tiles: Tile[] = [];
  let padded = 0;
  for (let i = 0; i < 40; i++) {
    const found = byId.get(i);
    if (found) tiles.push(found);
    else {
      tiles.push({ ...DEFAULT_TILES[i], id: i, question: undefined, culture: undefined });
      padded++;
    }
  }

  const questions: Question[] = [];
  const pushQ = (raw: unknown) => {
    const q = asQuestion(raw, `q${questions.length + 1}`);
    if (q) questions.push(q);
  };
  if (Array.isArray(root.questions)) root.questions.forEach(pushQ);
  tiles.forEach(t => { if (t.question) questions.push(t.question); });

  const collectDeck = (value: unknown): Question[] => {
    const out: Question[] = [];
    if (!Array.isArray(value)) return out;
    value.forEach((raw, i) => {
      const q = asQuestion(raw, `card${i + 1}`);
      if (q) out.push(q);
    });
    return out;
  };

  const chanceCards = collectDeck(root.chanceCards ?? root.chance ?? root.wildCards);
  const communityChest = collectDeck(root.communityChest ?? root.community_chest ?? root.chestCards);
  const culturalTips = (strArray(root.culturalTips) ?? strArray(root.tips) ?? []).slice(0, 20);

  return {
    ok: true,
    pack: {
      town: str(root.town) || str(root.location) || str(root.city),
      cefrLevel: str(root.cefrLevel) || str(root.level),
      topic: str(root.topic),
      players: asPlayers(root.players),
      tiles,
      questions,
      chanceCards,
      communityChest,
      culturalTips,
      padded,
    },
  };
}

/** Human-readable validation used by the setup page's "Load Pack" button. */
export function validatePackJson(json: string): { ok: boolean; message: string } {
  const res = parsePack(json);
  if (!res.ok) return { ok: false, message: res.error };
  const { pack } = res;
  const withPhotos = pack.tiles.filter(t => tilePhotos(t, pack.town).length).length;
  const withVideo = pack.tiles.filter(t => t.culture?.videoUrl).length;
  const withPano = pack.tiles.filter(t => t.culture?.panoramaUrl || t.culture?.latLng).length;
  const withCulture = pack.tiles.filter(t => t.culture?.description || t.culture?.funFact).length;
  const bits = [
    `${pack.tiles.length} board tiles`,
    `${pack.questions.length} questions`,
    pack.chanceCards.length ? `${pack.chanceCards.length} chance cards` : '',
    pack.communityChest.length ? `${pack.communityChest.length} chest cards` : '',
    pack.players.length ? `${pack.players.length} players` : '',
    pack.town ? `📍 ${pack.town}` : '',
  ].filter(Boolean);
  const media = [
    `${withCulture}/${pack.tiles.length} places described`,
    `${withPhotos} with photos`,
    withVideo ? `${withVideo} with video` : '',
    withPano ? `${withPano} with 360°/map` : '',
  ].filter(Boolean);
  return {
    ok: true,
    message: `Pack ready — ${bits.join(' · ')}. Media: ${media.join(', ')}.${pack.padded ? ` (${pack.padded} empty board spaces filled from the built-in board.)` : ''} Now press Start Game.`,
  };
}

// ─── PHOTOS (board backdrop + per-tile photos) ────────────────────────────────
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Wide photo used behind the board, taken from the pack when possible. */
export function backdropPhotoUrl(tiles: Tile[], town: string, seed = 0): string {
  const photos = tiles.map(t => t.culture?.photoUrl).filter((u): u is string => Boolean(u && u.startsWith('http')));
  if (photos.length) return photos[seed % photos.length];
  const key = slug(town || '').split('-')[0];
  if (!key) return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80&auto=format&fit=crop';
  return `https://loremflickr.com/1200/700/${key},city`;
}

/* ─── PLACE MEDIA (photos · video · 360° panorama · live map) ─────────────────
   One helper so the hover card, the landing splash and the property modal all
   read the same media for a square. Everything is derived from the AI link when
   present and falls back to a live keyless map/search built from the place name. */
export interface TileMedia {
  /** gallery photos, best first */
  photos: string[];
  /** embeddable video (YouTube/Vimeo/iframe-ready) */
  videoEmbed: string | null;
  /** direct video file (mp4/webm) to play in a <video> tag */
  videoFile: string | null;
  videoCaption: string;
  /** 360° / Street View embeddable frame */
  panoEmbed: string | null;
  /** 360° link to open in a new tab */
  panoLink: string | null;
  /** live map embed (no API key needed) */
  mapEmbed: string;
  /** map/search link to open in a new tab */
  mapLink: string;
  /** what the place is, in the AI's words */
  description: string;
  /** the exact place query used for the map links */
  placeQuery: string;
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?vi?=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` : null;
}

function vimeoEmbed(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/i);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

/** Turn whatever the AI wrote into something we can safely drop into an iframe. */
export function tileMedia(tile: Tile, town: string, px = 900): TileMedia {
  const c = tile.culture;
  const placeQuery = c?.mapQuery || tile.realAddress || `${tile.name}${town ? `, ${town}` : ''}`;
  const latLng = c?.latLng && /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(c.latLng.trim()) ? c.latLng.trim() : null;

  const photos = tilePhotos(tile, town, px);
  for (const extra of c?.photoUrls || []) if (!photos.includes(extra)) photos.push(extra);

  const rawVideo = c?.videoUrl || '';
  const videoFile = /\.(mp4|webm|ogv|mov)(\?|$)/i.test(rawVideo) ? rawVideo : null;
  const videoEmbed = videoFile ? null : youtubeEmbed(rawVideo) || vimeoEmbed(rawVideo) || (/^https:\/\//i.test(rawVideo) && /embed|player|iframe/i.test(rawVideo) ? rawVideo : null);

  const rawPano = c?.panoramaUrl || '';
  const panoFromCoords = latLng
    ? `https://maps.google.com/maps?q=&layer=c&cbll=${latLng}&cbp=11,0,0,0,0&output=svembed`
    : null;
  const panoEmbed = /^https:\/\//i.test(rawPano) ? rawPano : panoFromCoords;
  const panoLink = c?.panoramaLink || rawPano || (latLng ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latLng}` : null);

  const mapEmbed = latLng
    ? `https://maps.google.com/maps?q=${latLng}&z=17&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(placeQuery)}&z=16&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery)}`;

  return {
    photos,
    videoEmbed,
    videoFile,
    videoCaption: c?.videoCaption || c?.mediaCaption || `A look around ${tile.name}`,
    panoEmbed,
    panoLink,
    mapEmbed,
    mapLink,
    description: c?.description || tile.description || '',
    placeQuery,
  };
}

/**
 * Photos for one board square, in priority order:
 *   1. the image link the AI wrote into the JSON for this exact place
 *   2. a keyword photo built from the JSON's photoQuery / the place + city
 *   3. nothing — the tile falls back to its plain colour card
 */
export function tilePhotos(tile: Tile, town: string, px = 400): string[] {
  const out: string[] = [];
  const direct = tile.culture?.photoUrl || tile.imageUrl;
  if (direct && direct.startsWith('http')) out.push(direct);

  const fromQuery = tile.culture?.photoQuery;
  const place = slug(fromQuery || tile.culture?.neighborhood || tile.name);
  const key = slug(town || '');
  if (place) out.push(`https://loremflickr.com/${px}/${px}/${key ? `${key},${place}` : place}`);
  else if (key) out.push(`https://loremflickr.com/${px}/${px}/${key}`);

  return out;
}

/** kept for older call sites */
export function tilePhotoUrl(tile: Tile, town: string): string | null {
  return tilePhotos(tile, town)[0] ?? null;
}

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────────────
export interface BuildPromptCtx {
  players: ShellPlayer[];
  location: string;
  level: string;
  topic: string;
}

export function buildMonopolyPrompt({ players, location, level, topic }: BuildPromptCtx): string {
  const town = location || players.find(p => p.from)?.from || 'London';
  const townSlug = town.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'city';

  const playerBlock = players
    .map((p, i) => {
      if (p.isNPC) {
        return `${i + 1}. NPC "${p.name || 'Mystery NPC'}" (avatar ${p.emoji}, colour ${p.color}, isNPC true)
   - Dialogue/personality: ${p.npcLines || 'playful rival, loves banter'}
   - Write their lines and some Chance cards with their voice.`;
      }
      return `${i + 1}. Learner "${p.name || 'Unnamed'}" (avatar ${p.emoji}, colour ${p.color}, isNPC false)
   - Facts/interests to personalise with: ${p.facts || 'none given'}
   - From: ${p.from || town}`;
    })
    .join('\n');

  const personalisation = players
    .filter(p => p.facts)
    .map(p => `- "${p.name}": weave their interests (${p.facts}) into at least 3 questions and 1 cultural tip.`)
    .join('\n');

  return `You are the senior content designer for "Tutorly Edupoly", an educational Monopoly-style language-learning board game. You are writing a REAL class pack: 40 real places in ${town}, every square with its own verified media links, and a big bank of genuinely HARD questions at CEFR ${level}+.

⚠️ OUTPUT RULES: reply with ONE valid JSON object and NOTHING else. No markdown fences, no commentary, no comments, no trailing commas. All strings escaped. Validate before answering.

⚠️ QUALITY BAR: this pack is used in live lessons with paying students. A generic filler question ("What does deadline mean?"), an invented place, a broken image link or a giveaway answer is a FAILURE. Every place must be a place that really exists in ${town}, and every media link must be a real, direct, hotlinkable URL.

═══ CONTEXT ═══
City / neighbourhood: ${town}
CEFR level: ${level}
Topic focus: ${topic}
Players:
${playerBlock}

═══ JSON SHAPE (exact keys) ═══
{
  "town": "${town}",
  "cefrLevel": "${level}",
  "topic": "${topic}",
  "players": [
    { "name": "${players[0]?.name || 'Player 1'}", "emoji": "${players[0]?.emoji || '🚗'}", "color": "${players[0]?.color || '#e74c3c'}", "isNPC": false }
  ],
  "tiles": [ /* EXACTLY 40 tiles, ids 0-39, each with a full culture block + media */ ],
  "questions": [ /* 45-60 extra questions that belong to no single tile */ ],
  "chanceCards": [ /* 12-14 cards */ ],
  "communityChest": [ /* 12-14 cards */ ],
  "culturalTips": [ /* 16-20 short, surprising tips about ${town} */ ]
}

═══ TILES: exactly 40, ids 0-39, real places in ${town} ═══
- id 0: { "id":0, "name":"GO", "type":"go", "color":"none", "description":"Collect $200 salary as you pass!" }
- ids 1-3: 2 properties (color "brown") + 1 "community_chest"
- id 4: { "type":"tax", "description":"Pay $200 income tax." }
- id 5: railroad (a REAL station in ${town})
- ids 6-9: 3 properties (color "light_blue") + 1 "chance"
- id 10: { "type":"jail", "description":"Just visiting" }
- ids 11-14: 3 "pink" properties + 1 "utility"
- id 15: railroad (real station)
- ids 16-19: 3 "orange" properties + 1 "community_chest"
- id 20: { "type":"free_parking" }
- ids 21-24: 3 "red" properties + 1 "chance"
- id 25: railroad (real station)
- ids 26-29: 3 "yellow" properties + 1 "utility"
- id 30: { "type":"go_to_jail" }
- ids 31-34: 3 "green" properties + 1 "community_chest"
- id 35: railroad (real station)
- ids 36-39: 1 "chance" + 2 "blue" properties + 1 { "type":"tax", "description":"Luxury tax" }

PROPERTIES ARE REAL STREETS WITH REAL ADDRESSES (the board paints each one with the street's own photo):
- "name": the real street, square, avenue, market, bridge or landmark, spelled the way locals write it ("Omotesandō Avenue", "Shibuya Scramble Crossing"). NEVER an invented company name, never a generic word like "City Hotel" or "Tech Park".
- "realAddress": the FULL, real, mappable address — street + number + district + postcode + city. It is printed on the square and used for the map deep link, so it must be findable on Google Maps.
- "culture.photoUrl" + "culture.photoUrls": photos of THAT street, used as the square's background image.
- "culture.description": what makes this street/place worth landing on (locals' nickname, what happens there, one concrete detail).
- The non-property squares (GO, Jail, Community Chest, Chance, taxes, stations, utilities, parking) are game squares: they get the game's own icon, so give them a real local flavour in the name/description but no address or photo.

USE REAL PLACES: landmarks, streets, markets, stations, universities, museums, stadiums, food districts and companies that really exist in ${town}. Vary them (old and new, grand and humble, touristy and local) so the board feels like a walk through the city. Never repeat a place, never invent a street name, and put the strongest, most recognisable place on the most expensive square.

Each property MUST look like this:
{
  "id": 1,
  "name": "Real street / landmark in ${town}",
  "type": "property",
  "color": "brown",
  "price": 60,
  "rent": [2, 10, 30, 90, 160, 250],
  "mortgageValue": 30,
  "housePrice": 50,
  "realAddress": "Full real address in ${town}",
  "culture": {
    "neighborhood": "Real district name",
    "country": "Country",
    "description": "3-4 sentences about THIS place: what it is, why locals care about it, and one concrete detail (a year, a number, a name).",
    "photoUrl": "A REAL https image link of THIS exact place (must end in .jpg/.jpeg/.png/.webp). Prefer a Wikimedia Commons upload.wikimedia.org or images.unsplash.com direct link you are sure exists. If you are not certain, use exactly: https://loremflickr.com/640/480/${townSlug},place-keywords",
    "photoQuery": "2-4 english keywords for a photo of this place, comma separated (e.g. \"shibuya, crossing, tokyo\")",
    "photoUrls": ["A SECOND real photo of this exact place", "A THIRD real photo of this exact place"],
    "videoUrl": "A REAL public YouTube/Vimeo link about this place, its food or its street life (watch or shorts URL)",
    "videoCaption": "One line describing what the video shows",
    "panoramaUrl": "A 360°/Street-View style EMBED link for this exact spot (Google Maps embed?pb=…, Kuula or Matterport)",
    "latLng": "exact latitude,longitude with 5 decimals, e.g. 35.65950,139.70055",
    "mapQuery": "The exact address / place name used for the live map",
    "foods": ["Real local dish 1", "Real local dish 2", "Real local dish 3"],
    "thingsToDo": ["Real activity 1", "Real activity 2", "Real activity 3"],
    "taboos": ["A real local etiquette rule to avoid", "Another one"],
    "phrases": [
      { "phrase": "Real local expression", "meaning": "What it means in English" },
      { "phrase": "Second useful phrase", "meaning": "Meaning" }
    ],
    "funFact": "A surprising REAL fact about this place",
    "mediaCaption": "Short gallery caption naming the place"
  },
  "question": {
    "id": "q1",
    "type": "mcq",
    "text": "Language question tied to this real place / local culture",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "B",
    "explanation": "Why this is correct"
  }
}

═══ MEDIA RULES (the hover card shows all of this live) ═══
- photoUrls: 3 DIFFERENT direct image links of THIS exact place. Direct = the URL ends in .jpg/.jpeg/.png/.webp, or it is an images.unsplash.com link with a ?w= size. NEVER link a search page, a .html page, source.unsplash.com, or a Google/Booking/TripAdvisor page. When you cannot verify a photo, use https://loremflickr.com/1200/800/${townSlug},place-keywords (photoUrl and photoUrls may both use that fallback).
- videoUrl: a real public video about the place (YouTube watch/shorts or Vimeo). It is embedded in an iframe — no live streams and no links that need a login. If you cannot name a real video, omit the key: never invent a video ID.
- latLng: include the real coordinates whenever you can. The game builds a working 360° Street View and live map from them, so the card is never empty.
- Every square's culture must be unique: no reused funFact, no reused phrase, no copy-pasted paragraph.

═══ QUESTION TYPES TO USE ═══
Allowed "type" values: mcq, true_false, fill_gap, listening, matching, sentence_scramble, ordering, challenge, would_you_rather, truth_or_dare, wild_card.
- mcq / true_false / listening: "options" + "correctAnswer". listening also needs "audioText".
- fill_gap: "correctAnswer" (the missing word) — put the 4 candidate forms in parentheses inside "text".
- matching: "pairs": [{ "left": "...", "right": "..." }] (4 pairs).
- sentence_scramble / ordering: "words": ["...", "..."] and "correctAnswer" (final order, comma separated).
- challenge / truth_or_dare: "challengeText" + "explanation".
- wild_card: "wildEffect" one of advance_to_go, collect_100, collect_200, go_back_3, go_to_jail, pay_50, pay_100, free_rent, double_rent, get_out_of_jail, extra_turn, lose_turn.

═══ DIFFICULTY — THIS IS GRADED LESSON WORK, NO FREE POINTS ═══
Use ${level} vocabulary but make every question genuinely HARD to answer without real understanding: a strong student should score about 8/10, never 10/10.
1. Never ask "what does <word> mean?" or anything whose answer is a definition you already gave away. Test paraphrase, inference from a short context, collocation, register, prepositions, or a quiet detail inside a listening.
2. All four MCQ options must be the same kind of thing and within about 3 words of each other in length: near-synonyms that differ in collocation, the wrong preposition, the wrong register (too casual / too formal), a false friend, or a paraphrase that changes ONE detail. Every distractor must be a mistake a real learner of ${level} actually makes.
3. Ban giveaways: no joke options, no "all of the above"/"none of the above", no option that is obviously wrong, and never make the correct option the longest one. Spread the correct answer across A/B/C/D fairly evenly.
4. listening: 30-70 words of natural connected speech (contractions, a hesitation, a number, a date, a name) and then ask about a detail that is said once and quietly — not the loudest word.
5. fill_gap: exactly one blank "_____", the four candidates in parentheses, and only one of them collocates correctly in the sentence you wrote.
6. Every question must test a different point or place. If two questions share a fact, delete one.
7. Every "explanation" must teach: why the answer is right AND the trap the closest distractor sets.
8. ${topic === 'General English' ? 'Mix everyday, travel and workplace situations — the lesson topic is general English.' : `Every question must serve the topic "${topic}" while staying tied to ${town} where it is natural.`}
9. Personalise where it fits: use the players' names and interests as the characters inside the questions (never as a giveaway).

QUESTION QUANTITY (do not go under): every property tile carries its own "question" (about 28), PLUS 45-60 more questions in the top-level "questions" array that belong to no tile, PLUS 12-14 chance and 12-14 community chest cards — a bank of 100+ questions.
QUESTION MIX for that bank: ~24 mcq, ~12 true_false, ~12 fill_gap, ~8 listening, ~6 matching, ~8 sentence_scramble/ordering, ~8 challenge / role-play, ~6 would_you_rather / truth_or_dare.

CHANCE / COMMUNITY CHEST decks:
- "chanceCards": ${town} dilemmas and role-plays that force real language ("You are at the ticket machine in ${town} and it only takes the local card — ask the person behind you for help."), mixed with wild_card effects and challenge questions.
- "communityChest": local knowledge tasks + useful tips turned into mini-language challenges, mixed with wild_card rewards.

═══ PERSONALISATION ═══
${personalisation || '- Use the player names above inside a few questions.'}
- Reference the players by name where it feels natural.

⚠️ FINAL SELF-CHECK before you answer — verify every line:
1. 40 tiles, ids 0-39, no gaps, no duplicates, matching the colour/type blueprint above.
2. Every tile has a culture block with a real place, a description, 3 photoUrls (or the loremflickr fallback), foods, thingsToDo, taboos, 2 phrases, a funFact and a mediaCaption.
3. 45-60 questions in "questions", 12-14 chance, 12-14 chest, every one with a unique "id" and a valid "type".
4. No question is answerable by guessing, by option length, or by common sense alone.
5. Valid JSON, no trailing commas, no markdown fences, nothing outside the JSON object.
Output ONLY the JSON.`;
}

/** Short prompt used by the in-game teacher panel (topic/location only). */
export function getLocationPrompt(location: string, cefrLevel: string, topic: string): string {
  return buildMonopolyPrompt({
    players: [],
    location,
    level: cefrLevel,
    topic,
  });
}

/** Questions to use for a prepared deck when the teacher did not paste a pack. */
export function defaultQuestionBank(): Question[] {
  return SAMPLE_QUESTIONS;
}
