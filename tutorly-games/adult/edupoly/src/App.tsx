import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import type {
  GameState, Player, Tile, Property, Question, Toast,
  TradeOffer, WildEffect
} from './types';
import {
  DEFAULT_TILES, SAMPLE_QUESTIONS, HOST_LINES, COLOR_GROUPS,
  COLOR_HEX, PLAYER_COLORS, DEFAULT_EMOJIS
} from './gameData';
import {
  playDiceRoll, playCorrect, playWrong, playBuy, playPayRent,
  playJail, playMove, playTimerWarning, playTimerExpire, playWin,
  playCheer, playGroan, startBackgroundMusic, stopBackgroundMusic,
  setMusicTrack, setMusicMuted as setEngineMusicMuted, setVoiceMuted as setEngineVoiceMuted,
  setMusicVolume,
  speak
} from './audio';
import { tileIconUrl, addressLabel } from './icons';
import { SplashScreen, PlayerSetup } from './GameShell';
import type { ShellSetupResult } from './GameShell';
import {
  buildMonopolyPrompt, getLocationPrompt, parsePack, validatePackJson,
  backdropPhotoUrl, tilePhotos, tileMedia,
  type ParsedPack,
} from './gamePack';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STARTING_MONEY = 1500;
const GO_SALARY = 200;
/** 1 = whole board fits the screen · 3 = squares ~3x, pan/scroll around the board */
const MAX_BOARD_ZOOM = 3;
const JAIL_POSITION = 10;
void 30; // GO_TO_JAIL = 30 (tile index)
const QUESTION_TIME = 30; // seconds
const RAILROADS = [5, 15, 25, 35];
const UTILITIES = [12, 28];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function rollDie(): number { return Math.floor(Math.random() * 6) + 1; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function getHostLine(category: string): string {
  const line = HOST_LINES.find(l => l.category === category);
  return line ? pickRandom(line.templates) : '';
}

function formatMoney(n: number) { return `$${n.toLocaleString()}`; }

function getRailroadRent(ownedCount: number): number {
  return [0, 25, 50, 100, 200][ownedCount] ?? 200;
}

function getUtilityRent(diceTotal: number, ownedCount: number): number {
  return diceTotal * (ownedCount >= 2 ? 10 : 4);
}

function getPropertyRent(tile: Tile, prop: Property, allProps: Record<number, Property>, diceTotal: number): number {
  if (!tile.rent) return 0;
  if (tile.type === 'railroad') {
    const ownerId = prop.ownerId;
    const count = RAILROADS.filter(id => allProps[id]?.ownerId === ownerId).length;
    return getRailroadRent(count);
  }
  if (tile.type === 'utility') {
    const ownerId = prop.ownerId;
    const count = UTILITIES.filter(id => allProps[id]?.ownerId === ownerId).length;
    return getUtilityRent(diceTotal, count);
  }
  const houses = prop.houses;
  // Check if full color group owned for doubling base rent
  const group = Object.values(COLOR_GROUPS).find(g => g.includes(tile.id));
  const groupFullyOwned = group ? group.every(id => allProps[id]?.ownerId === prop.ownerId) : false;
  if (houses === 0 && groupFullyOwned) return tile.rent[0] * 2;
  return tile.rent[Math.min(houses, 5)] ?? tile.rent[0];
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── BOARD LABEL FITTING (large, never truncated, never overflowing) ─────────
// Short names for the classic corners/boxes so the big font always fits.
const SHORT_LABELS: Record<string, string> = {
  'community chest': 'Chest',
  'visiting jail': 'Jail',
  'free parking': 'Parking',
  'go to jail': 'Go To Jail',
  'income tax': 'Income Tax',
  'luxury tax': 'Luxury Tax',
};

/** Board tiles show a short form of the name — the full name stays in the tooltip,
    the hover card, the landing splash and the property modal. */
function boardLabel(name: string): string {
  // "RetailKing" → "Retail King" so long made-up names can wrap and stay big
  const clean = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+(ltd|inc|corp|co|llc|plc|gmbh)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const short = SHORT_LABELS[clean.toLowerCase()];
  if (short) return short;
  if (clean.length <= 14) return clean;
  const words = clean.split(' ');
  let out = words[0].length > 11 ? `${words[0].slice(0, 10)}…` : words[0];
  for (let i = 1; i < words.length; i++) {
    const cand = `${out} ${words[i]}`;
    if (cand.length <= 14) out = cand;
    else break;
  }
  return out;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, px: number, weight = 950): number {
  if (!measureCtx && typeof document !== 'undefined') {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  if (!measureCtx) return text.length * px * 0.55;
  measureCtx.font = `${weight} ${px}px Montserrat, Inter, sans-serif`;
  return measureCtx.measureText(text).width;
}

/** Largest font size at which `label` wraps into at most 2 lines inside the tile. */
function fitLabelFont(label: string, boxW: number, boxH: number, maxPx: number, minPx = 8, maxLines = 2): number {
  const words = label.split(' ').filter(Boolean);
  const safeW = boxW * 0.98;
  for (let px = maxPx; px >= minPx; px -= 0.5) {
    if (px * 1.16 * maxLines > boxH) continue;
    let linesLen = 1;
    let cur = '';
    let ok = true;
    for (const w of words) {
      if (textWidth(w, px) > safeW) { ok = false; break; }
      const test = cur ? `${cur} ${w}` : w;
      if (textWidth(test, px) <= safeW) cur = test;
      else { linesLen++; cur = w; }
    }
    if (ok && linesLen <= maxLines) return px;
  }
  return minPx;
}

// ─── STOCK MUSIC TRACKS (Mixkit free license) ────────────────────────────────
const MUSIC_TRACKS = [
  {
    id: 'mixkit-706',
    name: '🎪 Games Music (Mixkit #706) – upbeat game-show',
    url: 'https://assets.mixkit.co/music/706/706.mp3',
  },
  {
    id: 'mixkit-473',
    name: '⚡ Talent in the Air (Mixkit #473) – energetic competition',
    url: 'https://assets.mixkit.co/music/473/473.mp3',
  },
  {
    id: 'mixkit-466',
    name: '🌍 Games Worldbeat (Mixkit #466) – light & friendly',
    url: 'https://assets.mixkit.co/music/466/466.mp3',
  },
  {
    id: 'mixkit-1183',
    name: '🏁 Karma (Mixkit #1183) – modern energetic',
    url: 'https://assets.mixkit.co/music/1183/1183.mp3',
  },
];

// ─── TWEMOJI (more realistic emojis for shared-screen clarity) ───────────────
function emojiToTwemojiUrl(emoji: string) {
  const cps = Array.from(emoji)
    .map(ch => ch.codePointAt(0)!)
    // strip VS16 (emoji presentation selector)
    .filter(cp => cp !== 0xfe0f);
  const code = cps.map(cp => cp.toString(16)).join('-');
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${code}.png`;
}

const Emoji: React.FC<{ char: string; size?: number; className?: string; title?: string }> = ({ char, size = 22, className, title }) => {
  const [err, setErr] = useState(false);
  const src = useMemo(() => emojiToTwemojiUrl(char), [char]);
  if (err) {
    return <span className={className} title={title ?? char} style={{ fontSize: size, lineHeight: 1 }}>{char}</span>;
  }
  return (
    <img
      className={className}
      src={src}
      alt={char}
      title={title ?? char}
      width={size}
      height={size}
      style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}
      onError={() => setErr(true)}
      loading="lazy"
      decoding="async"
    />
  );
};

// ─── CULTURAL INFO FOR LOCATIONS ──────────────────────────────────────────────
interface CultureInfo {
  googleMapsUrl: string;
  streetViewUrl: string;
  foodToTry: string[];
  thingsToDo: string[];
  taboos: string[];
  localExpressions: { phrase: string; meaning: string }[];
  funFact: string;
  neighborhood: string;
}

// Default culture data for Business English (generic business districts)
const DEFAULT_CULTURE_DATA: Record<string, CultureInfo> = {
  'MedTech Corp': {
    googleMapsUrl: 'https://maps.googleapis.com/maps/api/staticmap?center=Silicon+Valley,CA&zoom=14&size=400x200&maptype=roadmap',
    streetViewUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop',
    foodToTry: ['Tech campus cafeteria fusion', 'Artisan coffee', 'Organic smoothies'],
    thingsToDo: ['Visit innovation labs', 'Attend tech meetups', 'Explore startup incubators'],
    taboos: ['Don\'t share confidential data', 'Avoid loud phone calls in open offices'],
    localExpressions: [
      { phrase: 'Let\'s circle back', meaning: 'We\'ll discuss this later' },
      { phrase: 'Move the needle', meaning: 'Make significant progress' }
    ],
    funFact: 'The tech industry adds $1.8 trillion to the US economy annually.',
    neighborhood: 'Innovation District'
  },
  'StartUp Hub': {
    googleMapsUrl: 'https://maps.googleapis.com/maps/api/staticmap?center=WeWork+NYC&zoom=15&size=400x200&maptype=roadmap',
    streetViewUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=200&fit=crop',
    foodToTry: ['Food truck tacos', 'Cold brew on tap', 'Avocado toast'],
    thingsToDo: ['Pitch competitions', 'Networking happy hours', 'Co-working spaces'],
    taboos: ['Don\'t dismiss new ideas', 'Avoid negativity about ventures'],
    localExpressions: [
      { phrase: 'Pivot', meaning: 'Change business direction' },
      { phrase: 'Disrupt', meaning: 'Revolutionize an industry' }
    ],
    funFact: '90% of startups fail, but the successful 10% change the world.',
    neighborhood: 'Startup Alley'
  },
  'City Rail': {
    googleMapsUrl: 'https://maps.googleapis.com/maps/api/staticmap?center=Grand+Central+Terminal&zoom=16&size=400x200&maptype=roadmap',
    streetViewUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=200&fit=crop',
    foodToTry: ['Station bakery pastries', 'Quick espresso', 'Grab-and-go sandwiches'],
    thingsToDo: ['People watching', 'Admire architecture', 'Check departure boards'],
    taboos: ['Don\'t block doorways', 'No loud music without headphones'],
    localExpressions: [
      { phrase: 'Catch the train', meaning: 'Board in time' },
      { phrase: 'Rush hour', meaning: 'Peak commuting time' }
    ],
    funFact: 'Grand Central Terminal sees 750,000 visitors daily.',
    neighborhood: 'Transit Hub'
  },
};

function getCultureInfoFromTile(tile: Tile): CultureInfo {
  // 1. If the tile has inline culture data (from imported JSON), use it
  const tc = tile.culture;
  if (tc) {
    return {
      googleMapsUrl: tc.mapImageUrl || '',
      streetViewUrl: tc.photoUrl || `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=200&fit=crop`,
      foodToTry: tc.foods || ['Local cuisine'],
      thingsToDo: tc.thingsToDo || ['Explore the area'],
      taboos: tc.taboos || ['Be respectful'],
      localExpressions: tc.phrases?.map(p => ({ phrase: p.phrase, meaning: p.meaning })) || [{ phrase: 'Hello', meaning: 'Standard greeting' }],
      funFact: tc.funFact || 'Discover unique local culture!',
      neighborhood: tc.neighborhood || tile.name,
    };
  }
  // 2. Fallback to DEFAULT_CULTURE_DATA by name
  return DEFAULT_CULTURE_DATA[tile.name] || {
    googleMapsUrl: '',
    streetViewUrl: `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=200&fit=crop`,
    foodToTry: ['Local cuisine', 'Street food', 'Traditional dishes'],
    thingsToDo: ['Explore the area', 'Meet locals', 'Visit landmarks'],
    taboos: ['Research local customs', 'Be respectful'],
    localExpressions: [
      { phrase: 'Hello', meaning: 'Standard greeting' },
      { phrase: 'Thank you', meaning: 'Show appreciation' }
    ],
    funFact: 'Every neighborhood has its own unique character!',
    neighborhood: tile.name
  };
}

// Keep backward compat
void function getCultureInfo(n: string) { return getCultureInfoFromTile({ id: 0, name: n, type: 'property', color: 'none' }); };

// ─── MONEY-BASED GLOW TIERS ───────────────────────────────────────────────────
function getMoneyTier(money: number): 'common' | 'rare' | 'epic' | 'legendary' {
  if (money >= 3000) return 'legendary';
  if (money >= 2000) return 'epic';
  if (money >= 1000) return 'rare';
  return 'common';
}

const GLOW_COLORS: Record<string, { glow: string; pulse: string; bg: string }> = {
  common: { glow: 'rgba(148, 163, 184, 0.6)', pulse: 'rgba(148, 163, 184, 0.3)', bg: '#94a3b8' },
  rare: { glow: 'rgba(59, 130, 246, 0.8)', pulse: 'rgba(59, 130, 246, 0.4)', bg: '#3b82f6' },
  epic: { glow: 'rgba(168, 85, 247, 0.9)', pulse: 'rgba(168, 85, 247, 0.5)', bg: '#a855f7' },
  legendary: { glow: 'rgba(245, 158, 11, 1)', pulse: 'rgba(245, 158, 11, 0.6)', bg: '#f59e0b' },
};

// ─── SHARED SETUP: SPLASH → PLAYER SETUP → AI PACK → GAME ────────────────────
// The splash screen + setup page live in GameShell.tsx and are copied into every
// Tutorly game so the procedure is identical everywhere.
// The AI prompt builders + pack parser live in gamePack.ts so this game and
// every other Tutorly game share one procedure (prompt → JSON → play).

function getQuestionsForDeck(type: 'chance' | 'community', bank: Question[] = SAMPLE_QUESTIONS): Question[] {
  const wilds = bank.filter(q => q.type === 'wild_card');
  const challenges = bank.filter(q => q.type === 'challenge' || q.type === 'would_you_rather' || q.type === 'truth_or_dare');
  const main = bank.filter(q => !['wild_card', 'challenge', 'would_you_rather', 'truth_or_dare'].includes(q.type));
  const built = type === 'chance' ? [...wilds, ...challenges] : [...main, ...wilds.slice(0, 3)];
  if (!built.length) return bank === SAMPLE_QUESTIONS ? [] : getQuestionsForDeck(type, SAMPLE_QUESTIONS);
  return shuffle(built);
}

// ─── INITIAL STATE BUILDER ────────────────────────────────────────────────────
function buildInitialState(
  players: Player[],
  tiles: Tile[],
  pack?: { questions?: Question[]; chanceCards?: Question[]; communityChest?: Question[] }
): GameState {
  const properties: Record<number, Property> = {};
  const market: Record<number, { price: number; deltaPct: number }> = {};

  tiles.forEach(t => {
    if (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') {
      properties[t.id] = { tileId: t.id, ownerId: null, houses: 0, mortgaged: false };
      if (typeof t.price === 'number') market[t.id] = { price: t.price, deltaPct: 0 };
    }
  });

  return {
    players,
    tiles,
    properties,
    market,
    wealthHistory: Object.fromEntries(players.map(p => [p.id, [p.money]])),
    currentPlayerIndex: 0,
    phase: 'playing',
    diceValues: [1, 1],
    isDoubles: false,
    currentQuestion: null,
    questionTileId: null,
    auctionTileId: null,
    auctionBids: {},
    tradeOffer: null,
    communityChestDeck: pack?.communityChest?.length
      ? shuffle(pack.communityChest)
      : getQuestionsForDeck('community', pack?.questions),
    chanceDeck: pack?.chanceCards?.length
      ? shuffle(pack.chanceCards)
      : getQuestionsForDeck('chance', pack?.questions),
    log: ['🎲 Game started! Good luck everyone!'],
    turnCount: 0,
    timeLimit: null,
    startTime: Date.now(),
    darkMode: false,
    hostVoice: '',
    musicMuted: false,
    sfxMuted: false,
    audienceSounds: true,
    showTeacherPanel: false,
    jailQuestionActive: false,
    pendingRentTileId: null,
    rentAmount: 0,
    rentReduceQuestion: null,
    houseTarget: null,
    selectedVoice: null,
  };
}

// ─── PARTICLE SYSTEM ─────────────────────────────────────────────────────────
interface Particle { id: string; x: number; y: number; char: string; color?: string; }

function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const spawnCoins = useCallback((x: number, y: number, count = 6) => {
    const coins: Particle[] = Array.from({ length: count }, () => ({
      id: uid(), char: '🪙',
      x: x + (Math.random() - 0.5) * 120,
      y: y + (Math.random() - 0.5) * 60,
    }));
    setParticles(p => [...p, ...coins]);
    setTimeout(() => setParticles(p => p.filter(c => !coins.some(cn => cn.id === c.id))), 1500);
  }, []);
  const spawnConfetti = useCallback((x: number, y: number) => {
    const colors = ['#f5b042', '#d9534f', '#5cb85c', '#3498db', '#9b59b6', '#e74c3c'];
    const conf: Particle[] = Array.from({ length: 30 }, () => ({
      id: uid(), char: '',
      color: pickRandom(colors),
      x: x + (Math.random() - 0.5) * 300,
      y: y + (Math.random() - 0.5) * 200,
    }));
    setParticles(p => [...p, ...conf]);
    setTimeout(() => setParticles(p => p.filter(c => !conf.some(cn => cn.id === c.id))), 2200);
  }, []);
  const spawnFloatLabel = useCallback((text: string, x: number, y: number, color: string) => {
    const lbl: Particle = { id: uid(), char: text, color, x, y };
    setParticles(p => [...p, lbl]);
    setTimeout(() => setParticles(p => p.filter(c => c.id !== lbl.id)), 1400);
  }, []);
  return { particles, spawnCoins, spawnConfetti, spawnFloatLabel };
}

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 3500) => {
    const id = uid();
    setToasts(t => [...t, { id, message, type, duration }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration + 400);
  }, []);
  return { toasts, addToast };
}

// ─── DICE COMPONENT ───────────────────────────────────────────────────────────
const DiceFace: React.FC<{ value: number; rolling: boolean; size?: number }> = ({ value, rolling, size = 80 }) => {
  const dots: [number, number][][] = [
    [],
    [[50,50]],
    [[25,25],[75,75]],
    [[25,25],[50,50],[75,75]],
    [[25,25],[75,25],[25,75],[75,75]],
    [[25,25],[75,25],[50,50],[25,75],[75,75]],
    [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
  ];
  const positions = dots[value] || dots[1];
  return (
    <div className={`dice-face relative ${rolling ? 'dice-rolling' : ''}`}
      style={{
        width: size, height: size, borderRadius: size * 0.15,
        background: 'linear-gradient(145deg, #ffffff 0%, #e8e8e8 100%)',
        boxShadow: `0 ${size*0.06}px ${size*0.12}px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.1)`,
        border: '1px solid rgba(0,0,0,0.08)',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
      {/* Shine */}
      <div style={{ position:'absolute', top:'8%', left:'12%', width:'30%', height:'18%', background:'rgba(255,255,255,0.7)', borderRadius:'50%', transform:'rotate(-20deg)', filter:'blur(2px)' }} />
      {positions.map(([cx, cy], i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${cx}%`, top: `${cy}%`,
          transform: 'translate(-50%, -50%)',
          width: size * 0.16, height: size * 0.16,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #2d3748, #1a202c)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }} />
      ))}
    </div>
  );
};

// ─── CIRCULAR TIMER ───────────────────────────────────────────────────────────
const CircularTimer: React.FC<{ timeLeft: number; total: number; warning?: boolean }> = ({ timeLeft, total, warning }) => {
  const r = 48; const circ = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const offset = circ * (1 - pct);
  const color = pct > 0.5 ? '#5cb85c' : pct > 0.25 ? '#f5b042' : '#d9534f';
  return (
    <div className={`relative flex items-center justify-center ${warning ? 'timer-warning' : ''}`} style={{ width: 120, height: 120 }}>
      <svg width="120" height="120" className="timer-ring absolute inset-0">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }} />
      </svg>
      <div className="relative z-10 text-center">
        <div style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1 }}>{timeLeft}</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#888', letterSpacing: '0.08em' }}>SECS</div>
      </div>
    </div>
  );
};

// ─── GLOWING PLAYER TOKEN ─────────────────────────────────────────────────────
const GlowingToken: React.FC<{ player: Player; size?: number }> = ({ player, size = 28 }) => {
  const tier = getMoneyTier(player.money);
  const glow = GLOW_COLORS[tier];
  
  return (
    <div
      className="glowing-token"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: tier === 'legendary' ? 'legendaryPulse 1.5s ease-in-out infinite' : 
                   tier === 'epic' ? 'epicPulse 2s ease-in-out infinite' :
                   tier === 'rare' ? 'rarePulse 2.5s ease-in-out infinite' : 
                   'subtleBounce 3s ease-in-out infinite',
      }}
      title={`${player.name} - ${formatMoney(player.money)} (${tier.toUpperCase()})`}
    >
      {/* Glow ring */}
      <div style={{
        position: 'absolute',
        inset: -4,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${glow.glow} 0%, transparent 70%)`,
        filter: 'blur(3px)',
        animation: 'glowPulse 2s ease-in-out infinite',
      }} />
      {/* Token */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        filter: `drop-shadow(0 0 ${tier === 'legendary' ? '8px' : tier === 'epic' ? '5px' : '3px'} ${glow.glow})`,
      }}>
        <Emoji char={player.emoji} size={size} />
      </div>
      {/* Tier badge */}
      {tier !== 'common' && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: glow.bg,
          border: '1.5px solid white',
          boxShadow: `0 0 4px ${glow.glow}`,
        }} />
      )}
    </div>
  );
};

// ─── CULTURE HOVER CARD ───────────────────────────────────────────────────────
/**
 * The card that opens when a square is hovered. It shows everything we know about
 * the real place behind the square: the photos the AI packed in, its video, a 360°
 * Street View, a live map — plus the local culture notes. The pointer can move onto
 * the card (tabs and links stay usable) because the parent keeps it open.
 */
const CultureHoverCard: React.FC<{
  tile: Tile;
  property?: Property;
  darkMode: boolean;
  position: { x: number; y: number };
  /** city the board was built from — used for photo/place lookups */
  town?: string;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}> = ({ tile, property, darkMode, position, town = '', onPointerEnter, onPointerLeave }) => {
  void position;
  const culture = getCultureInfoFromTile(tile);
  const media = useMemo(() => tileMedia(tile, town), [tile, town]);
  const colorHex = COLOR_HEX[tile.color] ?? '#64748b';
  const [tab, setTab] = useState<'photo' | 'video' | 'pano' | 'map' | 'culture'>('photo');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [broken, setBroken] = useState<boolean[]>([]);
  const photos = media.photos;
  const photo = photos[photoIdx];
  const frame = (src: string, title: string, extra?: React.CSSProperties) => (
    <iframe
      src={src}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      style={{ width: '100%', height: '100%', border: 0, display: 'block', ...extra }}
    />
  );

  const tabs = [
    { id: 'photo' as const, label: photos.length > 1 ? `📷 Photos (${photos.length})` : '📷 Photo' },
    media.videoEmbed || media.videoFile ? { id: 'video' as const, label: '🎬 Video' } : null,
    media.panoEmbed ? { id: 'pano' as const, label: '🌐 360°' } : null,
    { id: 'map' as const, label: '🗺️ Map' },
    { id: 'culture' as const, label: '📖 Culture' },
  ].filter(Boolean) as { id: 'photo' | 'video' | 'pano' | 'map' | 'culture'; label: string }[];

  return (
    <div
      className="culture-hover-card glass-card"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      style={{
        position: 'fixed',
        right: 14,
        top: 78,
        width: 'min(580px, 96vw)',
        height: 'min(86vh, 760px)',
        borderRadius: 18,
        overflow: 'hidden',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
        border: `2px solid ${colorHex}66`,
        background: darkMode ? '#0f172a' : '#fff',
      }}
    >
      {/* ── MEDIA FRAME: photos, video, 360° or the live map ── */}
      <div style={{ position: 'relative', height: 300, flexShrink: 0, background: '#0b1220' }}>
        {tab === 'photo' && (photo ? (
          <img
            src={photo}
            alt={tile.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.15) contrast(1.1)' }}
            loading="lazy"
            onError={() => setBroken(b => { const n = [...b]; n[photoIdx] = true; return n; })}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'rgba(255,255,255,0.75)', background: `linear-gradient(135deg,${colorHex},#0b1220)` }}>
            <span style={{ fontSize: '2.4rem' }}>🏙️</span>
            <span style={{ fontWeight: 800 }}>No photo link for this place yet</span>
          </div>
        ))}
        {tab === 'video' && (media.videoEmbed
          ? frame(media.videoEmbed, `${tile.name} video`)
          : media.videoFile
            ? <video src={media.videoFile} controls playsInline poster={tile.culture?.videoPosterUrl} style={{ width: '100%', height: '100%', background: '#000' }} />
            : null)}
        {tab === 'pano' && media.panoEmbed && frame(media.panoEmbed, `${tile.name} 360° panorama`)}
        {tab === 'map' && frame(media.mapEmbed, `${tile.name} map`)}
        {tab === 'culture' && (
          <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '14px 16px', background: darkMode ? '#0b1220' : '#f8fafc' }}>
            {media.description && (
              <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.5, color: darkMode ? '#e2e8f0' : '#1e293b', marginBottom: 12 }}>{media.description}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 950, color: '#f59e0b', letterSpacing: '0.14em', marginBottom: 6 }}>🍽️ FOOD TO TRY</div>
                {culture.foodToTry.slice(0, 3).map((f, i) => (
                  <div key={i} style={{ fontSize: '0.9rem', fontWeight: 750, color: darkMode ? '#fde68a' : '#92400e', marginBottom: 4 }}>• {f}</div>
                ))}
                <div style={{ fontSize: '0.76rem', fontWeight: 950, color: '#22c55e', letterSpacing: '0.14em', margin: '12px 0 6px' }}>✨ THINGS TO DO</div>
                {culture.thingsToDo.slice(0, 3).map((t, i) => (
                  <div key={i} style={{ fontSize: '0.88rem', fontWeight: 750, color: darkMode ? '#a5f3fc' : '#0e7490', marginBottom: 4 }}>• {t}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 950, color: '#ef4444', letterSpacing: '0.14em', marginBottom: 6 }}>🚫 TABOOS</div>
                {culture.taboos.slice(0, 2).map((tb, i) => (
                  <div key={i} style={{ fontSize: '0.88rem', fontWeight: 800, color: darkMode ? '#fecaca' : '#b91c1c', marginBottom: 4 }}>✗ {tb}</div>
                ))}
                <div style={{ fontSize: '0.76rem', fontWeight: 950, color: '#8b5cf6', letterSpacing: '0.14em', margin: '12px 0 6px' }}>💬 USEFUL PHRASES</div>
                {culture.localExpressions.slice(0, 2).map((p, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: darkMode ? '#ddd6fe' : '#5b21b6' }}>“{p.phrase}”</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: darkMode ? '#a5b4fc' : '#6d28d9' }}>{p.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12, background: darkMode ? '#111827' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 950, color: '#0ea5e9', letterSpacing: '0.14em', marginBottom: 6 }}>💡 FUN FACT</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 750, lineHeight: 1.5, color: darkMode ? '#e0f2fe' : '#0f172a' }}>{culture.funFact}</div>
            </div>
          </div>
        )}

        {/* Overlay title — hidden while a map/video/360 frame is on screen */}
        {(tab === 'photo' || tab === 'culture') && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.9) 100%)', pointerEvents: 'none' }} />
        )}
        {(tab === 'photo' || tab === 'culture') && (
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 12, pointerEvents: 'none' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 950, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.18em' }}>
              📍 {culture.neighborhood}{tile.culture?.country ? ` · ${tile.culture.country}` : ''}
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 950, color: '#fff', textShadow: '0 3px 18px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>{tile.name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {tile.price != null && (
                <div style={{ background: 'rgba(245,176,66,0.25)', border: '1px solid rgba(245,176,66,0.6)', color: '#fff', padding: '4px 10px', borderRadius: 10, fontWeight: 950, fontSize: '0.9rem' }}>
                  {formatMoney(tile.price)} {property?.ownerId ? '• OWNED' : '• FOR SALE'}
                </div>
              )}
              {photos.length > 1 && (
                <div style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', padding: '4px 10px', borderRadius: 10, fontWeight: 850, fontSize: '0.8rem' }}>
                  {(broken[photoIdx] ? 'photo unavailable' : 'photo')} {photoIdx + 1}/{photos.length}
                </div>
              )}
            </div>
          </div>
        )}

        {/* photo controls */}
        {tab === 'photo' && photos.length > 1 && (
          <div style={{ position: 'absolute', right: 10, top: 10, display: 'flex', gap: 6 }}>
            <button className="btn-press" title="Previous photo"
              onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
              style={{ width: 34, height: 34, borderRadius: 99, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 950, cursor: 'pointer' }}>‹</button>
            <button className="btn-press" title="Next photo"
              onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
              style={{ width: 34, height: 34, borderRadius: 99, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 950, cursor: 'pointer' }}>›</button>
          </div>
        )}

        {/* outbound links for whatever media the pack provided */}
        <div style={{ position: 'absolute', left: 10, top: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <a href={media.mapLink} target="_blank" rel="noreferrer"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '5px 10px', borderRadius: 99, fontWeight: 850, fontSize: '0.76rem', textDecoration: 'none' }}>
            🗺️ Maps ↗
          </a>
          {media.panoLink && (
            <a href={media.panoLink} target="_blank" rel="noreferrer"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '5px 10px', borderRadius: 99, fontWeight: 850, fontSize: '0.76rem', textDecoration: 'none' }}>
              🌐 360° ↗
            </a>
          )}
          {tile.culture?.videoUrl && (
            <a href={tile.culture.videoUrl} target="_blank" rel="noreferrer"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '5px 10px', borderRadius: 99, fontWeight: 850, fontSize: '0.76rem', textDecoration: 'none' }}>
              🎬 Video ↗
            </a>
          )}
        </div>
      </div>

      {/* ── TAB STRIP ── */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px 0', flexShrink: 0, flexWrap: 'wrap', background: darkMode ? '#0f172a' : '#fff' }}>
        {tabs.map(t => (
          <button key={t.id} className="btn-press"
            onClick={() => setTab(t.id)}
            style={{
              padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 900,
              border: `1px solid ${tab === t.id ? colorHex : (darkMode ? '#334155' : '#e2e8f0')}`,
              background: tab === t.id ? `${colorHex}22` : (darkMode ? '#111827' : '#f8fafc'),
              color: darkMode ? '#e2e8f0' : '#1e293b',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BOTTOM: description + a one-line summary of the square ── */}
      <div style={{ padding: '10px 16px 14px', flexShrink: 0, background: darkMode ? '#0f172a' : '#fff', borderTop: `1px solid ${darkMode ? '#1e293b' : '#f1f5f9'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 900, color: darkMode ? '#94a3b8' : '#64748b' }}>
            {tile.type.replace('_', ' ').toUpperCase()} · {media.placeQuery || tile.name}
          </div>
          {media.videoCaption && (media.videoEmbed || media.videoFile) && (
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: darkMode ? '#cbd5e1' : '#475569', flex: 1, minWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🎬 {media.videoCaption}
            </div>
          )}
          {tile.culture?.latLng && (
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: darkMode ? '#64748b' : '#94a3b8' }}>📌 {tile.culture.latLng}</div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Section heading used by the settings popover. */
const panelTitle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 950,
  letterSpacing: '0.14em',
  opacity: 0.75,
};

/** One labelled on/off switch — every sound setting uses this, so the state is
    always visible instead of being hidden behind an icon. */
const SoundToggle: React.FC<{ label: string; on: boolean; onClick: () => void; darkMode: boolean }> = ({ label, on, onClick, darkMode }) => (
  <button
    onClick={onClick}
    className="btn-press"
    aria-pressed={on}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%',
      padding: '8px 11px', borderRadius: 10, cursor: 'pointer',
      border: `1px solid ${on ? 'rgba(34,197,94,0.45)' : darkMode ? '#334155' : '#e2e8f0'}`,
      background: on ? (darkMode ? 'rgba(34,197,94,0.16)' : 'rgba(34,197,94,0.1)') : (darkMode ? '#0f172a' : '#f8fafc'),
      color: darkMode ? '#e2e8f0' : '#1e293b', fontSize: '0.8rem', fontWeight: 800,
    }}
  >
    <span>{label}</span>
    <span style={{ fontSize: '0.72rem', fontWeight: 950, color: on ? '#16a34a' : '#94a3b8', letterSpacing: '0.08em' }}>
      {on ? 'ON' : 'OFF'}
    </span>
  </button>
);

// ─── BOARD TILE RENDERER ──────────────────────────────────────────────────────
const BoardTile: React.FC<{
  tile: Tile;
  players: Player[];
  property?: Property;
  market?: { price: number; deltaPct: number };
  isCurrentLanding?: boolean;
  onClick?: () => void;
  darkMode: boolean;
  onHover?: (pos: { x: number; y: number } | null) => void;
  /** size of one cell in px — drives every font size on the tile */
  tileW?: number;
  tileH?: number;
  /** city the board was built from — used to look up a photo for the tile */
  town?: string;
}> = ({ tile, players, property, market, isCurrentLanding, onClick, darkMode, onHover, tileW = 90, tileH = 70, town = '' }) => {
  const colorHex = COLOR_HEX[tile.color] ?? 'transparent';
  const hasColor = tile.color !== 'none';
  // one number drives EVERY size on the tile, so text always scales with the square
  const tilePx = Math.min(tileW, tileH);
  // board label (short form) — the full name stays in tooltips / cards / modals
  const label = useMemo(() => boardLabel(tile.name), [tile.name]);
  // every cell can carry a photo of the real place (the AI pack provides the link)
  const photoSources = useMemo(
    () => tilePhotos(tile, town, Math.min(600, Math.round(Math.max(240, Math.max(tileW, tileH) * 3.5)))),
    [tile, town, tileW, tileH]
  );
  const [photoIdx, setPhotoIdx] = useState(0);
  const photo = photoSources[photoIdx];
  const showPhoto = Boolean(photo);
  const owner = property?.ownerId ? players.find(p => p.id === property.ownerId) : null;
  const tokensHere = players.filter(p => p.position === tile.id && !p.isEliminated);
  const border = darkMode ? '#475569' : '#94a3b8';
  const shownPrice = typeof market?.price === 'number' ? market.price : tile.price;
  const deltaPct = market?.deltaPct ?? 0;

  // Downloaded SVG icon for the special squares (GO, Jail, Chest, Chance, taxes,
  // parking, stations, utilities). Properties return null here — they are the
  // only squares that show a real photo of the street instead.
  const iconUrl = useMemo(() => tileIconUrl(tile), [tile]);
  const street = useMemo(() => (tile.type === 'property' ? addressLabel(tile) : ''), [tile]);

  // ── TILE METRICS: the cell's width and height drive every size on the tile, and
  //    the name font is auto-fitted so it is ALWAYS as large as it can possibly be.
  //    The price rides inside the colour band, which leaves the whole cell body
  //    for the name. ──
  const hasPrice = shownPrice != null;
  const m = useMemo(() => {
    const minSide = Math.min(tileW, tileH);
    const borderW = Math.max(1.5, Math.min(4, minSide * 0.03));
    const pad = Math.max(2, Math.min(10, tileH * 0.05));
    const bandH = hasColor ? Math.max(hasPrice ? 15 : 8, Math.min(28, tileH * (hasPrice ? 0.22 : 0.15))) : 0;
    const innerW = tileW - 2 * borderW - 2 * pad;
    const contentH = tileH - 2 * borderW - 2 * pad - bandH;
    const gapY = Math.max(1, Math.min(6, tileH * 0.02));
    // big squares get to use a third line, which lets the name grow much larger
    const maxLines = minSide >= 74 ? 3 : 2;
    const maxPx = Math.min(54, tileH * 0.5);
    // a real street line under the name, but only when the square is big enough
    // for it to stay readable (skipped on small cells, where it would be noise)
    const streetFont = street && tileW >= 108 && tileH >= 74 ? Math.max(9, Math.min(13, tileH * 0.135)) : 0;
    const streetH = streetFont ? streetFont * 1.25 + gapY * 0.6 : 0;
    // the icon sits above the name and steals height from it, so the name font is
    // fitted against whatever is actually left
    let iconFont = 0;
    let labelFont = 0;
    if (iconUrl) {
      // the icon takes a fixed share of the square and the name fits the rest;
      // the icon only gives room back if the name would collapse to nothing
      iconFont = Math.max(12, Math.round(tileH * (hasColor ? 0.2 : 0.32)));
      labelFont = fitLabelFont(label, innerW, contentH - iconFont - gapY - streetH, maxPx, 8, maxLines);
      if (labelFont <= 9) {
        iconFont = Math.max(11, iconFont - 5);
        labelFont = fitLabelFont(label, innerW, contentH - iconFont - gapY - streetH, maxPx, 8, maxLines);
      }
    }
    if (!iconFont) labelFont = fitLabelFont(label, innerW, contentH - streetH, maxPx, 8, maxLines);
    return {
      borderW, pad, bandH, innerW, gapY, iconFont, labelFont, maxLines, streetFont,
      priceFont: Math.max(9, Math.min(24, bandH * 0.7)),
    };
  }, [tileW, tileH, hasColor, label, tile.type, hasPrice, iconUrl, street]);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (onHover && (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) {
      onHover({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    if (onHover) onHover(null);
  };

  return (
    <div
      className={`board-tile tile-shine cursor-pointer relative flex flex-col ${isCurrentLanding ? 'ring-2 ring-yellow-400' : ''}`}
      style={{
        background: showPhoto ? '#0b1220' : darkMode ? '#1e293b' : '#fff',
        border: `${m.borderW}px solid ${isCurrentLanding ? '#f59e0b' : showPhoto ? 'rgba(255,255,255,0.35)' : border}`,
        borderRadius: Math.max(4, Math.min(tileW, tileH) * 0.1),
        width: '100%',
        height: '100%',
        boxShadow: isCurrentLanding
          ? '0 0 16px rgba(245,176,66,0.5)'
          : '0 2px 6px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        position: 'relative',
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={tile.realAddress ? `${tile.name} — ${tile.realAddress}` : tile.name}
    >
      {/* Real place photo (pack) — the colour band + text stay on top so the
          square is still instantly readable, and a failed image silently
          falls back to the plain card. */}
      {showPhoto && (
        <img
          key={photoIdx}
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setPhotoIdx(i => i + 1)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        />
      )}
      {showPhoto && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            // light scrim only — the photo of the real place stays clearly visible,
            // the label below carries its own text shadow for readability
            background: `linear-gradient(180deg, rgba(4,9,17,0.10) 0%, rgba(4,9,17,0.30) 48%, rgba(4,9,17,0.72) 100%)`,
          }}
        />
      )}

      {/* Colour band — the price rides here so the name gets the whole cell body */}
      {hasColor && (
        <div style={{
          background: colorHex,
          height: m.bandH,
          flexShrink: 0,
          borderRadius: '5px 5px 0 0',
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 3,
          padding: '0 4px',
          overflow: 'hidden',
        }}>
          {hasPrice && (
            <>
              <span style={{ fontSize: m.priceFont, fontWeight: 950, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.75)', whiteSpace: 'nowrap' }}>
                ${shownPrice}
              </span>
              {deltaPct !== 0 && (
                <span style={{ fontSize: Math.max(7.5, m.priceFont * 0.7), fontWeight: 950, color: deltaPct > 0 ? '#bbf7d0' : '#fecaca', textShadow: '0 1px 2px rgba(0,0,0,0.8)', whiteSpace: 'nowrap' }}>
                  {deltaPct > 0 ? '▲' : '▼'}{Math.abs(deltaPct)}%
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Houses indicator */}
      {property && property.houses > 0 && (
        <div style={{ position: 'absolute', top: hasColor ? m.bandH + 2 : 2, right: 2, display: 'flex', gap: 1 }}>
          {Array.from({ length: Math.min(property.houses, 4) }).map((_, i) => (
            <div key={i} style={{ width: Math.max(4, tilePx * 0.08), height: Math.max(4, tilePx * 0.08), background: property.houses >= 5 ? '#dc2626' : '#22c55e', borderRadius: 1, border: '1px solid #fff' }} />
          ))}
          {property.houses >= 5 && <span style={{ fontSize: Math.max(8, tilePx * 0.14) }}>🏨</span>}
        </div>
      )}

      {/* Main content — BIG & READABLE for screen-share */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{ minHeight: 0, padding: m.pad, gap: m.gapY, overflow: 'hidden', position: 'relative', zIndex: 3 }}
      >
        {iconUrl && m.iconFont > 0 ? (
          <span
            style={{
              flexShrink: 0,
              lineHeight: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              // on a photo square the icon sits on a white chip so a dark glyph
              // never disappears into the photograph
              background: showPhoto ? 'rgba(255,255,255,0.92)' : undefined,
              borderRadius: showPhoto ? '50%' : undefined,
              padding: showPhoto ? Math.max(3, m.iconFont * 0.16) : 0,
              boxShadow: showPhoto ? '0 2px 8px rgba(0,0,0,0.35)' : undefined,
            }}
          >
            <img
              src={iconUrl}
              alt=""
              aria-hidden
              draggable={false}
              style={{ width: m.iconFont, height: m.iconFont, display: 'block', filter: showPhoto ? undefined : 'drop-shadow(0 1px 3px rgba(0,0,0,0.22))' }}
            />
          </span>
        ) : null}

        <div
          style={{
            fontSize: `${m.labelFont}px`,
            fontWeight: 950,
            textAlign: 'center',
            lineHeight: 1.16,
            color: showPhoto || darkMode ? '#fff' : '#0f172a',
            wordBreak: 'break-word',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: m.maxLines,
            WebkitBoxOrient: 'vertical' as const,
            textShadow: showPhoto ? '0 2px 6px rgba(0,0,0,0.85)' : darkMode ? '0 1px 3px rgba(0,0,0,0.6)' : '0 1px 1px rgba(0,0,0,0.08)',
          }}
          title={tile.name}
        >
          {label}
        </div>

        {/* the real street / address of a property, under its name */}
        {m.streetFont > 0 && street ? (
          <div
            style={{
              fontSize: `${m.streetFont}px`,
              fontWeight: 800,
              letterSpacing: '0.02em',
              textAlign: 'center',
              color: showPhoto || darkMode ? 'rgba(255,255,255,0.92)' : '#475569',
              textShadow: showPhoto ? '0 1px 4px rgba(0,0,0,0.9)' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              lineHeight: 1.2,
            }}
          >
            📍 {street}
          </div>
        ) : null}

        {/* the price already rides in the colour band — only band-less squares
            (tax etc.) print it here, which leaves the whole cell body to the name */}
        {shownPrice != null && !hasColor && (
          <div style={{
            fontSize: `${m.priceFont}px`,
            color: showPhoto ? '#fde68a' : darkMode ? '#fde68a' : '#92400e',
            fontWeight: 950,
            background: showPhoto ? 'rgba(0,0,0,0.45)' : darkMode ? 'rgba(251,191,36,0.22)' : 'rgba(251,191,36,0.25)',
            padding: '0 3px',
            borderRadius: 5,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}>
            <span>${shownPrice}</span>
            {deltaPct !== 0 && (
              <span style={{
                fontSize: Math.max(7, m.priceFont * 0.72),
                fontWeight: 950,
                color: deltaPct > 0 ? '#22c55e' : '#ef4444',
              }}>
                {deltaPct > 0 ? '▲' : '▼'} {Math.abs(deltaPct)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Owner indicator */}
      {owner && (
        <div style={{
          position: 'absolute', bottom: 2, left: 2,
          width: Math.max(7, tilePx * 0.14), height: Math.max(7, tilePx * 0.14), borderRadius: '50%',
          background: owner.color,
          border: '2px solid #fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }} />
      )}

      {/* Player tokens with glow */}
      {tokensHere.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          display: 'flex', flexWrap: 'wrap', gap: 2,
        }}>
          {tokensHere.slice(0, 4).map(p => (
            <GlowingToken key={p.id} player={p} size={Math.max(16, Math.round(tilePx * 0.36))} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── LANDING SPLASH SCREEN ────────────────────────────────────────────────────
const LandingSplash: React.FC<{
  tile: Tile;
  player: Player;
  property?: Property;
  darkMode: boolean;
  onContinue: () => void;
}> = ({ tile, player, property, darkMode, onContinue }) => {
  const culture = getCultureInfoFromTile(tile);
  const colorHex = COLOR_HEX[tile.color] ?? '#64748b';
  const tier = getMoneyTier(player.money);
  const glow = GLOW_COLORS[tier];

  return (
    <div 
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div 
        className="landing-splash glass-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 600,
          width: '100%',
          borderRadius: 24,
          overflow: 'hidden',
          animation: 'slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 40px ${glow.pulse}`,
        }}
      >
        {/* Real Unsplash street photo */}
        <div style={{ position: 'relative', height: 220 }}>
          <img
            src={culture.streetViewUrl || `https://source.unsplash.com/featured/800x400/?${encodeURIComponent(tile.name + ' street landmark')}`}
            alt={tile.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=200&fit=crop'; }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to top, ${colorHex} 0%, ${colorHex}99 30%, transparent 70%)`,
          }} />
          
          {/* Player landed badge */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: 12,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <GlowingToken player={player} size={32} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>LANDED!</div>
              <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 800 }}>{player.name}</div>
            </div>
          </div>
          
          {/* Location info */}
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.12em', marginBottom: 4 }}>
              📍 {culture.neighborhood}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', textShadow: '0 3px 6px rgba(0,0,0,0.4)' }}>
              {tile.name}
            </div>
            {tile.price && (
              <div style={{ 
                fontSize: '1.4rem', 
                fontWeight: 900, 
                color: '#fef08a',
                display: 'inline-block',
                background: 'rgba(0,0,0,0.4)',
                padding: '4px 14px',
                borderRadius: 8,
                marginTop: 6,
              }}>
                {formatMoney(tile.price)} {property?.ownerId ? '• OWNED' : '• FOR SALE'}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24, background: darkMode ? '#1e293b' : '#fff' }}>
          {/* Quick stats */}
          {tile.rent && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 12, 
              marginBottom: 20,
              padding: 14,
              background: darkMode ? '#0f172a' : '#f8fafc',
              borderRadius: 12,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: darkMode ? '#64748b' : '#94a3b8', letterSpacing: '0.1em' }}>BASE RENT</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#22c55e' }}>{formatMoney(tile.rent[0])}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: darkMode ? '#64748b' : '#94a3b8', letterSpacing: '0.1em' }}>WITH HOTEL</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f59e0b' }}>{formatMoney(tile.rent[5] || tile.rent[0] * 10)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: darkMode ? '#64748b' : '#94a3b8', letterSpacing: '0.1em' }}>HOUSE COST</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#3b82f6' }}>{formatMoney(tile.housePrice || 100)}</div>
              </div>
            </div>
          )}
          
          {/* Culture sections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Food */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', marginBottom: 8 }}>
                🍽️ FOOD TO TRY
              </div>
              {culture.foodToTry.map((food, i) => (
                <div key={i} style={{
                  background: darkMode ? '#334155' : '#fef3c7',
                  color: darkMode ? '#fbbf24' : '#92400e',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  marginBottom: 4,
                }}>{food}</div>
              ))}
            </div>
            
            {/* Things to do */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#22c55e', letterSpacing: '0.1em', marginBottom: 8 }}>
                ✨ THINGS TO DO
              </div>
              {culture.thingsToDo.map((thing, i) => (
                <div key={i} style={{ fontSize: '0.9rem', color: darkMode ? '#a5f3fc' : '#0e7490', marginBottom: 4, fontWeight: 600 }}>
                  • {thing}
                </div>
              ))}
            </div>
          </div>
          
          {/* Local expressions */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8b5cf6', letterSpacing: '0.1em', marginBottom: 8 }}>
              💬 USEFUL EXPRESSIONS
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {culture.localExpressions.map((expr, i) => (
                <div key={i} style={{
                  background: darkMode ? '#312e81' : '#ede9fe',
                  padding: '8px 14px',
                  borderRadius: 10,
                  flex: '1 1 auto',
                  minWidth: 180,
                }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: darkMode ? '#c4b5fd' : '#5b21b6' }}>
                    "{expr.phrase}"
                  </div>
                  <div style={{ fontSize: '0.85rem', color: darkMode ? '#a5b4fc' : '#7c3aed' }}>
                    → {expr.meaning}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Fun fact */}
          <div style={{
            background: darkMode ? '#0f172a' : '#f0f9ff',
            border: `2px solid ${darkMode ? '#334155' : '#bae6fd'}`,
            borderRadius: 12,
            padding: 14,
            marginTop: 16,
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.1em', marginBottom: 6 }}>
              💡 FUN FACT
            </div>
            <div style={{ fontSize: '1rem', color: darkMode ? '#e0f2fe' : '#0369a1', fontWeight: 600 }}>
              {culture.funFact}
            </div>
          </div>
          
          {/* Close button */}
          <button
            className="btn-gold btn-press"
            onClick={onContinue}
            style={{ width: '100%', padding: 16, borderRadius: 14, fontSize: '1.1rem', marginTop: 20 }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── CHANCE CARD SHUFFLE ANIMATION ────────────────────────────────────────────
const ChanceCardShuffle: React.FC<{
  onComplete: () => void;
  type: 'chance' | 'community_chest';
  result?: { title: string; body: string } | null;
}> = ({ onComplete, type, result }) => {
  const [phase, setPhase] = useState<'shuffling' | 'revealing'>('shuffling');
  const cardEmoji = type === 'chance' ? '🃏' : '📦';
  const title = type === 'chance' ? 'CHANCE' : 'COMMUNITY CHEST';
  const bgColor = type === 'chance' ? '#f59e0b' : '#3b82f6';

  useEffect(() => {
    const timer1 = window.setTimeout(() => setPhase('revealing'), 1500);
    return () => { window.clearTimeout(timer1); };
  }, []);

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '0.15em', marginBottom: 20, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {title}
        </div>
        
        {/* Card deck */}
        <div style={{ position: 'relative', width: 200, height: 280, margin: '0 auto' }}>
          {phase === 'shuffling' && (
            <>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 160,
                    height: 220,
                    borderRadius: 18,
                    background: 'linear-gradient(145deg, #0b1220 0%, #111b33 45%, #070b14 100%)',
                    border: `2px solid ${bgColor}99`,
                    boxShadow: `0 14px 44px rgba(0,0,0,0.6), 0 0 18px ${bgColor}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4rem',
                    filter: 'saturate(1.15)',
                    animation: `cardShuffle${i} 0.4s ease-in-out infinite`,
                    animationDelay: `${i * 0.08}s`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {cardEmoji}
                </div>
              ))}
            </>
          )}
          
          {phase === 'revealing' && (
            <div
              style={{
                position: 'absolute',
                width: 240,
                height: 320,
                borderRadius: 22,
                background: 'linear-gradient(145deg, #0b1220 0%, #111b33 35%, #070b14 100%)',
                border: `2px solid ${bgColor}`,
                boxShadow: `0 22px 70px rgba(0,0,0,0.65), 0 0 26px ${bgColor}88`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'cardReveal 0.6s cubic-bezier(0.22, 1.61, 0.36, 1)',
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: '4rem',
                filter: `drop-shadow(0 0 14px ${bgColor})`,
                marginBottom: 6,
              }}>{cardEmoji}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fff', letterSpacing: '0.22em' }}>{result?.title ?? title}</div>
              <div style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#f8fafc',
                lineHeight: 1.2,
                maxWidth: 210,
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}>
                {result?.body ?? 'Your fate is decided.'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginTop: 6 }}>
                {type === 'chance' ? 'Risk. Reward. Language.' : 'Surprise. Support. Language.'}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ marginTop: 26, color: 'rgba(255,255,255,0.85)', fontWeight: 800 }}>
          {phase === 'shuffling' ? 'Shuffling cards…' : 'Result revealed.'}
        </div>

        {phase === 'revealing' && (
          <button
            className="btn-gold btn-press"
            style={{ marginTop: 14, padding: '12px 18px', borderRadius: 14, fontSize: '1rem' }}
            onClick={onComplete}
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
};

// ─── FULL BOARD ───────────────────────────────────────────────────────────────
// ─── SPARKLINE COMPONENT ──────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color: string; w?: number; h?: number }> = ({ data, color, w = 90, h = 28 }) => {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - mn) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - mn) / range) * (h - 4) - 2} r={3} fill={color} />
    </svg>
  );
};

const GameBoard: React.FC<{
  gs: GameState;
  onTileClick: (tile: Tile) => void;
  onTileHover: (tile: Tile | null, pos: { x: number; y: number } | null) => void;
  achievements?: Record<string, string[]>;
  /** 0.5 – 1 : fraction of the space that actually fits on screen (1 = full board visible) */
  zoom?: number;
  /** city the board was built from — used for photos */
  town?: string;
  /** space the board may use — measured by the parent, never by the board itself,
      so the size can never feed back into the layout */
  avail?: number;
  availH?: number;
  /** the turn controls live in the middle of the board, so no screen space is
      spent on a bottom bar that would shrink every square */
  centerActions?: React.ReactNode;
  /** the board reports zoom gestures (ctrl+wheel / pinch) back to the parent */
  onZoomChange?: (z: number) => void;
}> = ({ gs, onTileClick, onTileHover, achievements: ach, zoom = 1, town = '', avail = 0, availH = 0, centerActions, onZoomChange }) => {
  const { tiles, players, properties, darkMode } = gs;
  const currentPlayer = players[gs.currentPlayerIndex];

  const space = Math.max(280, avail || 900);
  const spaceH = Math.max(240, availH || 560);
  const z = Math.min(MAX_BOARD_ZOOM, Math.max(1, zoom));
  const bw = Math.max(260, Math.round(space * z));
  const bh = Math.max(240, Math.round(spaceH * z));
  // chrome is kept razor thin: every pixel saved here becomes tile size
  const gap = Math.max(2, Math.round(Math.min(bw, bh) * 0.004));
  const pad = Math.max(2, Math.round(gap * 0.75));
  const borderW = Math.max(3, Math.round(Math.min(bw, bh) * 0.006));
  // the 11×11 grid fills the WHOLE area (no square lock), so every cell is as
  // large as the screen allows
  const tileW = Math.max(28, Math.floor((bw - 2 * borderW - 2 * pad - 10 * gap) / 11));
  const tileH = Math.max(28, Math.floor((bh - 2 * borderW - 2 * pad - 10 * gap) / 11));

  // ── PAN: when the board is bigger than the stage it is dragged around. All
  //    offsets are clamped so the board always covers the whole visible stage. ──
  const panMax = useMemo(
    () => ({ x: Math.min(0, space - bw), y: Math.min(0, spaceH - bh) }),
    [space, spaceH, bw, bh]
  );
  const clampPan = useCallback(
    (p: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(panMax.x, p.x)),
      y: Math.min(0, Math.max(panMax.y, p.y)),
    }),
    [panMax.x, panMax.y]
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ cx: number; cy: number; px: number; py: number } | null>(null);
  const dragMoved = useRef(false);

  /** board index → grid position (0-based row/col of the 11×11 grid) */
  const gridOf = (id: number) => {
    if (id <= 10) return { row: 10, col: 10 - id };
    if (id <= 19) return { row: 20 - id, col: 0 };
    if (id <= 30) return { row: 0, col: id - 20 };
    return { row: id - 30, col: 10 };
  };

  /** centre the stage on one square — used to follow the current token when zoomed */
  const centreOn = useCallback(
    (id: number) => {
      const { row, col } = gridOf(id);
      const cx = borderW + pad + col * (tileW + gap) + tileW / 2;
      const cy = borderW + pad + row * (tileH + gap) + tileH / 2;
      setPan(clampPan({ x: space / 2 - cx, y: spaceH / 2 - cy }));
    },
    [borderW, pad, tileW, tileH, gap, space, spaceH, clampPan]
  );

  // keep the board covering the stage after any resize / zoom change
  useEffect(() => { setPan(p => clampPan(p)); }, [clampPan]);

  // when zoomed, follow the player whose turn it is so the token never gets lost
  const followKey = z > 1 && currentPlayer ? `${currentPlayer.id}:${currentPlayer.position}` : '';
  useEffect(() => {
    if (followKey && currentPlayer) centreOn(currentPlayer.position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followKey]);

  // Live ticking clock
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  void now; // used in elapsed calculation below

  // Build 11×11 grid
  // Positions: bottom row 0-10 (row 10), left col 11-19 (col 0), top row 20-30 (row 0), right col 31-39 (col 10)

  const getTileAt = (row: number, col: number): Tile | null => {
    if (row === 10) return tiles[10 - col] ?? null;
    if (row === 0) return tiles[20 + col] ?? null;
    if (col === 0) return tiles[10 + (10 - row)] ?? null;
    if (col === 10) return tiles[30 + row] ?? null;
    return null;
  };

  const cells: React.ReactNode[] = [];
  for (let row = 0; row <= 10; row++) {
    for (let col = 0; col <= 10; col++) {
      if (row > 0 && row < 10 && col > 0 && col < 10) {
        if (row === 1 && col === 1) {
           // Center area — MEGA DASHBOARD
          const sorted = [...players].filter(p => !p.isEliminated).sort((a, b) => b.money - a.money);
          const totalProps = Object.values(properties).filter(p => p.ownerId).length;
          const freeProps = Object.values(properties).filter(p => !p.ownerId).length;
          const elapsed = gs.startTime ? Math.floor((now - gs.startTime) / 1000) : 0;
          const elapsedMin = Math.floor(elapsed / 60);
          const elapsedSec = elapsed % 60;
          const marketMovers = Object.entries(gs.market).filter(([, v]) => v.deltaPct !== 0).sort(([, a], [, b]) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct)).slice(0, 4);
          const chanceLeft = gs.chanceDeck.length;
          const chestLeft = gs.communityChestDeck.length;
          // Cultural tip
          const cultureTiles = tiles.filter(t => t.culture);
          const cultureTip = cultureTiles.length > 0 ? cultureTiles[gs.turnCount % cultureTiles.length] : null;
          const tipCulture = cultureTip ? getCultureInfoFromTile(cultureTip) : null;
          // All badges
          const allBadges = Object.entries(ach || {}).flatMap(([pid, badges]) => badges.map(b => ({ pid, badge: b })));
          const cp = currentPlayer;

          // ── CENTRE DASHBOARD METRICS ──
          // The middle of the board is the biggest usable surface on the screen, so
          // everything the table needs sits here. ONE scale factor (`dash`) is derived
          // from the real centre box and drives every font inside it, so the whole
          // dashboard grows with the board and stays readable on a laptop or a projector.
          const centreW = bw - 2 * (borderW + pad + tileW + gap);
          const centreH = bh - 2 * (borderW + pad + tileH + gap);
          const dash = Math.min(1.7, Math.max(0.8, Math.min(centreW / 1080, centreH / 600)));
          const fz = (base: number) => `${Math.max(9, Math.round(base * dash * 10) / 10)}px`;
          const diceSize = Math.round(Math.min(102, 62 * dash));
          const cardStyle: React.CSSProperties = {
            background: darkMode ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.72)',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'}`,
            borderRadius: Math.round(12 * dash),
            padding: `${fz(9)} ${fz(12)}`,
            display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
          };
          const cardTitle: React.CSSProperties = {
            fontSize: fz(11.5), fontWeight: 950, letterSpacing: '0.14em', marginBottom: fz(7), whiteSpace: 'nowrap',
          };
          const rowBorder = `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'}`;
          const muted = darkMode ? '#94a3b8' : '#64748b';

          cells.push(
            <div key="center" className="center-dash" style={{
              gridColumn: '2 / 11', gridRow: '2 / 11',
              background: darkMode
                ? 'linear-gradient(160deg,#050d0a 0%,#0a1a14 55%,#050d0a 100%)'
                : 'linear-gradient(160deg,#f7fdf9 0%,#e6f7ec 55%,#f7fdf9 100%)',
              borderRadius: Math.round(14 * dash),
              display: 'grid',
              gridTemplateColumns: '1.08fr 1fr',
              gridTemplateRows: 'auto 1fr auto auto auto',
              position: 'relative', overflow: 'hidden',
              padding: fz(13), gap: fz(10),
              boxShadow: darkMode ? 'inset 0 0 70px rgba(0,0,0,0.55)' : 'inset 0 0 70px rgba(22,101,52,0.07)',
            }}>

              {/* ── HERO: whose turn, the dice, and the state of the table ── */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: fz(14), flexWrap: 'wrap', padding: `${fz(4)} ${fz(8)} ${fz(9)}`, borderBottom: `1px solid ${darkMode ? 'rgba(74,222,128,0.15)' : 'rgba(22,101,52,0.13)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: fz(12), minWidth: 0 }}>
                  <span style={{ fontSize: fz(46), lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.28))' }}>{cp?.emoji ?? '🎓'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: fz(11), fontWeight: 950, letterSpacing: '0.22em', color: darkMode ? '#4ade80' : '#166534' }}>NOW PLAYING</div>
                    <div style={{ fontSize: fz(31), fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1.05, color: darkMode ? '#f1f5f9' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp?.name ?? 'Tutorly Edupoly'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: fz(10), marginTop: fz(3), flexWrap: 'wrap' }}>
                      <span style={{ fontSize: fz(23), fontWeight: 950, color: '#e0a12a' }}>{formatMoney(cp?.money ?? 0)}</span>
                      <span style={{ fontSize: fz(13), fontWeight: 800, color: muted }}>💼 {cp?.propertiesOwned.length ?? 0} properties</span>
                      {gs.isDoubles && <span style={{ fontSize: fz(12), fontWeight: 950, color: '#15803d', background: darkMode ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.16)', borderRadius: 99, padding: `${fz(2)} ${fz(9)}` }}>DOUBLES — ROLL AGAIN</span>}
                      {cp && cp.jailTurns > 0 && <span style={{ fontSize: fz(12), fontWeight: 950, color: '#dc2626' }}>⛓️ IN JAIL ({cp.jailTurns})</span>}
                    </div>
                  </div>
                </div>

                {/* dice big enough to read from the back of the room */}
                <div style={{ display: 'flex', alignItems: 'center', gap: fz(10) }}>
                  <DiceFace value={gs.diceValues[0]} rolling={false} size={diceSize} />
                  <DiceFace value={gs.diceValues[1]} rolling={false} size={diceSize} />
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: fz(42), fontWeight: 950, color: darkMode ? '#4ade80' : '#166534' }}>={gs.diceValues[0] + gs.diceValues[1]}</span>
                </div>

                {/* clock, decks, table counters */}
                <div style={{ display: 'flex', alignItems: 'stretch', gap: fz(8), flexWrap: 'wrap' }}>
                  {[
                    { label: '⏱️ ELAPSED', value: `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`, mono: true },
                    { label: '🔄 TURN', value: String(gs.turnCount), mono: false },
                    { label: '🃏 CHANCE', value: String(chanceLeft), mono: false },
                    { label: '📦 CHEST', value: String(chestLeft), mono: false },
                    { label: '🏠 OWNED', value: String(totalProps), mono: false },
                  ].map(s => (
                    <div key={s.label} style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'}`, borderRadius: Math.round(10 * dash), padding: `${fz(4)} ${fz(11)}`, textAlign: 'center', minWidth: fz(62) }}>
                      <div style={{ fontSize: fz(10), fontWeight: 900, letterSpacing: '0.1em', color: muted, whiteSpace: 'nowrap' }}>{s.label}</div>
                      <div style={{ fontSize: fz(21), fontWeight: 950, color: darkMode ? '#e2e8f0' : '#0f172a', fontFamily: s.mono ? 'monospace' : undefined }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── LEADERBOARD with net-worth sparklines ── */}
              <div style={cardStyle}>
                <div style={{ ...cardTitle, color: darkMode ? '#4ade80' : '#166534' }}>📊 STANDINGS & NET WORTH</div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {sorted.map((p, i) => {
                    const history = gs.wealthHistory[p.id] || [p.money];
                    const trend = history.length >= 2 ? history[history.length - 1] - history[history.length - 2] : 0;
                    const ranking = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
                    const isTurn = p.id === cp?.id;
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: fz(9), padding: `${fz(5)} ${fz(6)}`, borderRadius: Math.round(8 * dash), borderBottom: i < sorted.length - 1 ? rowBorder : 'none', background: isTurn ? (darkMode ? 'rgba(245,176,66,0.12)' : 'rgba(245,176,66,0.13)') : 'transparent' }}>
                        <span style={{ fontSize: fz(17), fontWeight: 950, width: fz(28), textAlign: 'center', color: i === 0 ? '#f5b042' : muted }}>{ranking}</span>
                        <span style={{ fontSize: fz(25), lineHeight: 1 }}>{p.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: fz(16), fontWeight: 900, color: darkMode ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}{isTurn ? ' 🎯' : ''}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: fz(6) }}>
                            <span style={{ fontSize: fz(18), fontWeight: 950, color: '#e0a12a' }}>{formatMoney(p.money)}</span>
                            {trend !== 0 && <span style={{ fontSize: fz(12), fontWeight: 900, color: trend > 0 ? '#22c55e' : '#ef4444' }}>{trend > 0 ? '▲' : '▼'}{Math.abs(trend)}</span>}
                          </div>
                        </div>
                        <Sparkline data={history} color={p.color} w={Math.round(84 * dash)} h={Math.round(26 * dash)} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── MARKET + BEST DEALS (stacked in the second column) ── */}
              <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: fz(10), minHeight: 0 }}>
                <div style={cardStyle}>
                  <div style={{ ...cardTitle, color: darkMode ? '#fbbf24' : '#92400e' }}>📈 PROPERTY MARKET</div>
                  {marketMovers.length > 0 ? marketMovers.map(([idStr, mv]) => {
                    const t = tiles[Number(idStr)];
                    if (!t) return null;
                    return (
                      <div key={idStr} style={{ display: 'flex', alignItems: 'center', gap: fz(8), padding: `${fz(4)} 0`, borderBottom: rowBorder }}>
                        <div style={{ width: fz(10), height: fz(10), borderRadius: 3, background: COLOR_HEX[t.color] ?? '#888', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: fz(15), fontWeight: 850, color: darkMode ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boardLabel(t.name)}</span>
                        <span style={{ fontSize: fz(16), fontWeight: 950, color: darkMode ? '#fde68a' : '#92400e' }}>${mv.price}</span>
                        <span style={{ fontSize: fz(14), fontWeight: 950, color: mv.deltaPct > 0 ? '#22c55e' : '#ef4444', minWidth: fz(46), textAlign: 'right' }}>{mv.deltaPct > 0 ? '▲' : '▼'}{Math.abs(mv.deltaPct)}%</span>
                      </div>
                    );
                  }) : (
                    <div style={{ fontSize: fz(13), color: muted, fontStyle: 'italic' }}>Prices are steady — they move as turns pass.</div>
                  )}
                  <div style={{ display: 'flex', gap: fz(8), marginTop: fz(8) }}>
                    {[
                      { icon: '🏠', label: 'OWNED', val: totalProps, color: '#22c55e' },
                      { icon: '🏗️', label: 'FOR SALE', val: freeProps, color: '#3b82f6' },
                    ].map(s => (
                      <div key={s.label} style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)', borderRadius: Math.round(9 * dash), padding: `${fz(4)} ${fz(8)}`, textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: fz(10.5), fontWeight: 900, color: muted, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{s.icon} {s.label}</div>
                        <div style={{ fontSize: fz(21), fontWeight: 950, color: s.color }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={{ ...cardTitle, color: darkMode ? '#fbbf24' : '#92400e' }}>🎯 BEST DEALS LEFT</div>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {[...tiles]
                      .filter(t => (t.price ?? 0) > 0 && !properties[t.id]?.ownerId)
                      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
                      .slice(0, 6)
                      .map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: fz(8), padding: `${fz(4)} 0`, borderBottom: rowBorder }}>
                          <div style={{ width: fz(10), height: fz(10), borderRadius: 3, background: COLOR_HEX[t.color] ?? '#888', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: fz(15), fontWeight: 850, color: darkMode ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boardLabel(t.name)}</span>
                          <span style={{ fontSize: fz(16), fontWeight: 950, color: '#e0a12a' }}>${t.price}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* ── COMMENTARY + ACHIEVEMENTS ── */}
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: fz(10), minHeight: 0 }}>
                <div style={cardStyle}>
                  <div style={{ ...cardTitle, color: muted }}>📣 MATCH COMMENTARY</div>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {gs.log.slice(-4).reverse().map((entry, i) => (
                      <div key={`${i}-${entry.slice(0, 12)}`} style={{ fontSize: i === 0 ? fz(16) : fz(13.5), fontWeight: i === 0 ? 900 : 700, color: i === 0 ? (darkMode ? '#e2e8f0' : '#1e293b') : muted, padding: `${fz(2)} 0`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={cardStyle}>
                  <div style={{ ...cardTitle, color: darkMode ? '#c084fc' : '#7c3aed' }}>🏅 ACHIEVEMENTS & DECKS</div>
                  {allBadges.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: fz(5), flex: 1, minHeight: 0, overflow: 'hidden' }}>
                      {allBadges.slice(-5).map((ab, i) => {
                        const pl = players.find(p => p.id === ab.pid);
                        return (
                          <span key={i} className="achievement-badge" style={{ fontSize: fz(13), background: darkMode ? '#312e81' : '#ede9fe', color: darkMode ? '#c4b5fd' : '#5b21b6', padding: `${fz(3)} ${fz(9)}`, borderRadius: Math.round(8 * dash), fontWeight: 850, whiteSpace: 'nowrap' }}>
                            {pl?.emoji} {ab.badge}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: fz(13), color: muted, fontStyle: 'italic', flex: 1 }}>No badges yet — the first purchase earns one.</div>
                  )}
                  <div style={{ display: 'flex', gap: fz(8), marginTop: fz(6) }}>
                    {[{ icon: '🃏', label: 'CHANCE', val: chanceLeft, color: '#f59e0b' }, { icon: '📦', label: 'CHEST', val: chestLeft, color: '#3b82f6' }].map(d => (
                      <div key={d.label} style={{ flex: 1, textAlign: 'center', background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)', borderRadius: Math.round(9 * dash), padding: `${fz(3)} 0` }}>
                        <div style={{ fontSize: fz(11), fontWeight: 950, color: d.color, letterSpacing: '0.1em' }}>{d.icon} {d.label}</div>
                        <div style={{ fontSize: fz(18), fontWeight: 950, color: darkMode ? '#e2e8f0' : '#0f172a' }}>{d.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── TURN CONTROLS + SQUARE SIZE — the biggest buttons on the page ── */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fz(12), flexWrap: 'wrap', padding: `${fz(4)} 0` }}>
                {centerActions}
                {onZoomChange && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: fz(6), background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)', borderRadius: Math.round(11 * dash), padding: fz(4) }}>
                    <span style={{ fontSize: fz(12), fontWeight: 950, letterSpacing: '0.12em', color: muted, padding: `0 ${fz(4)}`, whiteSpace: 'nowrap' }}>SQUARE SIZE</span>
                    {[1, 1.5, 2, 3].map(s => (
                      <button
                        key={s}
                        className={z === s ? 'btn-gold btn-press' : 'btn-navy btn-press'}
                        style={{ padding: `${fz(5)} ${fz(10)}`, borderRadius: Math.round(9 * dash), fontSize: fz(13), fontWeight: 950 }}
                        onClick={() => onZoomChange(s)}
                        title={s === 1 ? 'Whole board on screen' : `${s}× bigger squares — drag the board to move around it`}
                      >
                        {s === 1 ? 'Fit' : `${s}×`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── CULTURAL TIP ── */}
              {tipCulture && cultureTip && (
                <div style={{ gridColumn: '1 / -1', background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)', borderRadius: Math.round(11 * dash), padding: `${fz(7)} ${fz(12)}`, border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'}`, display: 'flex', alignItems: 'center', gap: fz(12), flexWrap: 'wrap' }}>
                  <div style={{ fontSize: fz(12), fontWeight: 950, letterSpacing: '0.14em', color: darkMode ? '#38bdf8' : '#0369a1', whiteSpace: 'nowrap' }}>🌍 {cultureTip.name}</div>
                  {tipCulture.localExpressions[0] && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: fz(7), minWidth: 0 }}>
                      <span style={{ fontSize: fz(16), fontWeight: 950, color: darkMode ? '#c4b5fd' : '#5b21b6', whiteSpace: 'nowrap' }}>💬 “{tipCulture.localExpressions[0].phrase}”</span>
                      <span style={{ fontSize: fz(13.5), fontWeight: 700, color: darkMode ? '#a5b4fc' : '#6d28d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {tipCulture.localExpressions[0].meaning}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: fz(160), fontSize: fz(13.5), fontWeight: 700, fontStyle: 'italic', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💡 {tipCulture.funFact}</div>
                  {tipCulture.foodToTry[0] && (
                    <div style={{ background: darkMode ? 'rgba(245,176,66,0.16)' : '#fef3c7', borderRadius: Math.round(9 * dash), padding: `${fz(4)} ${fz(10)}`, fontSize: fz(13), fontWeight: 900, color: darkMode ? '#fbbf24' : '#92400e', whiteSpace: 'nowrap' }}>
                      🍽️ Try: {tipCulture.foodToTry[0]}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }
        continue;
      }
      const tile = getTileAt(row, col);
      if (!tile) continue;
      const prop = properties[tile.id];
      cells.push(
        <div key={`${row}-${col}`} style={{
          gridColumn: col + 1,
          gridRow: row + 1,
          minWidth: 0,
          minHeight: 0,
        }}>
          <BoardTile
            tile={tile}
            players={players}
            property={prop}
            market={gs.market[tile.id]}
            isCurrentLanding={currentPlayer?.position === tile.id}
            onClick={() => onTileClick(tile)}
            onHover={(pos) => onTileHover(pos ? tile : null, pos)}
            darkMode={darkMode}
            tileW={tileW}
            tileH={tileH}
            town={town}
          />
        </div>
      );
    }
  }

  const zoomed = z > 1;
  return (
    <div
      className="board-fit-area"
      style={{
        width: bw,
        height: bh,
        flex: '0 0 auto',
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
        willChange: zoomed ? 'transform' : 'auto',
        cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none',
      }}
      onPointerDown={e => {
        if (!zoomed) return;
        if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return;
        dragRef.current = { cx: e.clientX, cy: e.clientY, px: pan.x, py: pan.y };
        dragMoved.current = false;
        setDragging(true);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }}
      onPointerMove={e => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.cx;
        const dy = e.clientY - d.cy;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
        setPan(clampPan({ x: d.px + dx, y: d.py + dy }));
      }}
      onPointerUp={e => {
        dragRef.current = null;
        setDragging(false);
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      }}
      onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
      onClickCapture={e => {
        // a pan must not open a property card
        if (dragMoved.current) { e.stopPropagation(); e.preventDefault(); dragMoved.current = false; }
      }}
      onWheel={e => {
        if (!onZoomChange) return;
        if (!e.ctrlKey && !e.metaKey && !zoomed) return;
        onZoomChange(Math.min(MAX_BOARD_ZOOM, Math.max(1, z - e.deltaY * 0.0018)));
      }}
    >
      <div
        className="board-3d"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(11, 1fr)',
          gridTemplateRows: 'repeat(11, 1fr)',
          gap,
          background: '#196d28',
          border: `${borderW}px solid #145a1a`,
          borderRadius: 14,
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 3px rgba(255,255,255,0.16)',
          padding: pad,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          ['--tile' as string]: `${Math.min(tileW, tileH)}px`,
        } as React.CSSProperties}
      >
        {cells}
      </div>
    </div>
  );
};

// ─── QUESTION CARD ────────────────────────────────────────────────────────────
const QuestionCard: React.FC<{
  question: Question;
  timeLeft: number;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
  selectedAnswer: string | null;
  showResult: boolean;
  isCorrect: boolean | null;
  darkMode: boolean;
  bonusTime: number;
}> = ({ question, timeLeft, onAnswer, onSkip, selectedAnswer, showResult, isCorrect, darkMode, bonusTime }) => {
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<number[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [matchSelected, setMatchSelected] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [matchWrong, setMatchWrong] = useState<string | null>(null);
  const [shuffledRightOptions, setShuffledRightOptions] = useState<string[]>([]);

  useEffect(() => {
    if (question.type === 'sentence_scramble' || question.type === 'ordering') {
      setScrambled(shuffle(question.words || []));
      setUsedWords([]);
      setBuiltSentence([]);
    }
    if (question.type === 'matching') {
      setMatchSelected(null);
      setMatchedPairs({});
      setMatchWrong(null);
      setShuffledRightOptions(shuffle(question.pairs?.map(p => p.right) || []));
    }
  }, [question.id]);

  const bg = darkMode ? '#1e293b' : '#fff'; void bg;
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';
  const subText = darkMode ? '#94a3b8' : '#64748b';
  const cardBg = darkMode ? '#0f172a' : '#f8fafc'; void cardBg;

  const warning = timeLeft <= 10;

  const handleWordClick = (word: string, idx: number) => {
    if (usedWords.includes(idx) || showResult) return;
    const newSentence = [...builtSentence, word];
    const newUsed = [...usedWords, idx];
    setBuiltSentence(newSentence);
    setUsedWords(newUsed);
    if (newSentence.length === scrambled.length) {
      onAnswer(newSentence.join(' '));
    }
  };

  const handleRemoveWord = (si: number) => {
    if (showResult) return;
    const word = builtSentence[si];
    const origIdx = scrambled.findIndex((w, i) => w === word && !usedWords.slice(0, si).includes(i) && usedWords.includes(i));
    setBuiltSentence(builtSentence.filter((_, i) => i !== si));
    setUsedWords(usedWords.filter((_, i) => i !== usedWords.indexOf(origIdx)));
  };

  const handleMatchLeft = (left: string) => {
    if (showResult) return;
    setMatchSelected(left);
    setMatchWrong(null);
  };

  const handleMatchRight = (right: string) => {
    if (!matchSelected || showResult) return;
    const correct = question.pairs?.find(p => p.left === matchSelected)?.right;
    if (correct === right) {
      const newPairs = { ...matchedPairs, [matchSelected]: right };
      setMatchedPairs(newPairs);
      setMatchSelected(null);
      if (question.pairs && Object.keys(newPairs).length === question.pairs.length) {
        const ans = question.pairs.map(p => `${p.left}:${p.right}`).join(',');
        onAnswer(ans);
      }
    } else {
      setMatchWrong(matchSelected);
      setTimeout(() => { setMatchSelected(null); setMatchWrong(null); }, 600);
    }
  };

  const typeLabel: Record<string, string> = {
    mcq: '📝 Multiple Choice', true_false: '✅ True or False',
    fill_gap: '📝 Fill in the Gap', listening: '🎧 Listening',
    matching: '🔗 Match the Pairs', sentence_scramble: '🔀 Sentence Scramble',
    ordering: '🔢 Put in Order', wild_card: '🃏 Wild Card',
    challenge: '🎭 Challenge', would_you_rather: '🤔 Would You Rather',
    truth_or_dare: '🎭 Truth or Dare',
  };

  return (
    <div className="question-card-enter" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ background: '#f5b042', borderRadius:20, padding:'4px 14px', fontSize:'0.85rem', fontWeight:800, color:'#1e2a3a' }}>
          {typeLabel[question.type] || question.type.toUpperCase()}
        </div>
        <CircularTimer timeLeft={timeLeft} total={QUESTION_TIME} warning={warning} />
      </div>

      {/* Question text */}
      <div style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)', fontWeight: 900, color: text, lineHeight: 1.2, marginBottom: 20, textAlign:'center' }}>
        {question.text}
      </div>

      {/* Image */}
      {question.imageUrl && (
        <img src={question.imageUrl} alt="Question" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:8, marginBottom:12 }} />
      )}

      {/* Listening — auto-play audio + play button */}
      {question.type === 'listening' && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn-navy btn-press" style={{ width:'100%', padding:'14px', borderRadius:12, fontSize:'1rem', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}
            onClick={() => speak(question.audioText ?? question.text, null, 0.85, 1.0)}>
            🎧 Play Audio
          </button>
          <div style={{ background: darkMode?'#1e3a5f':'#e8f4fd', border:'2px solid #3498db', borderRadius:10, padding:'12px 16px', fontSize:'0.95rem', color:darkMode?'#93c5fd':'#1a4a7a', fontStyle:'italic', lineHeight:1.5 }}>
            🎧 <em>Listen carefully, then choose the correct answer below.</em>
          </div>
        </div>
      )}

      {/* Wild card effect */}
      {question.type === 'wild_card' && (
        <div style={{ textAlign:'center', fontSize:'3.5rem', marginBottom:12 }}>🃏</div>
      )}

      {/* Challenge text */}
      {(question.type === 'challenge' || question.type === 'truth_or_dare') && question.challengeText && (
        <div style={{ background: darkMode?'#1a2744':'#eef2ff', border:'2px solid #6366f1', borderRadius:10, padding:'14px 16px', marginBottom:16, fontSize:'1.1rem', fontWeight:700, color:darkMode?'#a5b4fc':'#3730a3', lineHeight:1.5, textAlign:'center' }}>
          {question.challengeText}
        </div>
      )}

      {/* Would You Rather */}
      {question.type === 'would_you_rather' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, marginBottom:16, alignItems:'stretch' }}>
          <button className="answer-option btn-navy" style={{ padding:'14px 10px', borderRadius:10, fontSize:'1rem', fontWeight:700, textAlign:'center', lineHeight:1.3 }}
            onClick={() => onAnswer('A')}>
            🅰️ {question.optionA}
          </button>
          <div style={{ display:'flex', alignItems:'center', fontWeight:900, fontSize:'1.1rem', color:subText }}>OR</div>
          <button className="answer-option btn-navy" style={{ padding:'14px 10px', borderRadius:10, fontSize:'1rem', fontWeight:700, textAlign:'center', lineHeight:1.3 }}
            onClick={() => onAnswer('B')}>
            🅱️ {question.optionB}
          </button>
        </div>
      )}

      {/* MCQ / True-False / Listening options */}
      {(question.type === 'mcq' || question.type === 'true_false' || question.type === 'listening') && question.options && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
          {question.options.map((opt, i) => {
            const labels = ['A','B','C','D'];
            let cls = 'answer-option';
            let extraStyle: React.CSSProperties = {
              background: darkMode ? '#1e3a5f' : '#f0f4ff',
              border: `2px solid ${darkMode?'#334155':'#c7d2fe'}`,
              borderRadius: 10, padding: '14px 18px',
              display:'flex', alignItems:'center', gap:12,
              cursor:'pointer', transition:'all 0.2s',
            };
            if (showResult) {
              if (opt === question.correctAnswer) {
                cls += ' correct';
                extraStyle = { ...extraStyle, background:'rgba(92,184,92,0.2)', borderColor:'#5cb85c' };
              } else if (opt === selectedAnswer && opt !== question.correctAnswer) {
                cls += ' wrong';
                extraStyle = { ...extraStyle, background:'rgba(217,83,79,0.2)', borderColor:'#d9534f' };
              }
            } else if (opt === selectedAnswer) {
              cls += ' selected';
            }
            return (
              <button key={opt} className={`${cls} btn-press`} style={extraStyle}
                onClick={() => !showResult && onAnswer(opt)} disabled={showResult}>
                <span style={{ background: darkMode?'#334155':'#e0e7ff', color: darkMode?'#a5b4fc':'#4f46e5', borderRadius:6, padding:'2px 8px', fontSize:'0.9rem', fontWeight:800, flexShrink:0 }}>
                  {labels[i]}
                </span>
                <span style={{ fontSize:'clamp(1.2rem, 1.8vw, 1.8rem)', fontWeight:800, color: text, textAlign:'left', lineHeight:1.2 }}>{opt}</span>
                {showResult && opt === question.correctAnswer && <span style={{ marginLeft:'auto', fontSize:'1.2rem' }}>✅</span>}
                {showResult && opt === selectedAnswer && opt !== question.correctAnswer && <span style={{ marginLeft:'auto', fontSize:'1.2rem' }}>❌</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Fill in the gap */}
      {question.type === 'fill_gap' && (
        <div style={{ marginBottom:16 }}>
          <input
            type="text"
            placeholder="Type your answer here..."
            style={{
              width:'100%', padding:'14px 18px', borderRadius:10,
              border:`2px solid ${darkMode?'#334155':'#c7d2fe'}`,
              background: darkMode?'#0f172a':'#f8fafc',
              color: text, fontSize:'clamp(1.4rem, 2.2vw, 2rem)', fontWeight:800,
              outline:'none', fontFamily:'inherit',
            }}
            onKeyDown={e => { if (e.key === 'Enter') onAnswer((e.target as HTMLInputElement).value.trim()); }}
            disabled={showResult}
            autoFocus
          />
          {!showResult && (
            <button className="btn-gold btn-press" style={{ marginTop:10, width:'100%', padding:'12px', borderRadius:10, fontSize:'1rem' }}
              onClick={e => onAnswer((e.currentTarget.previousElementSibling as HTMLInputElement)?.value.trim() || '')}>
              Submit Answer ↩
            </button>
          )}
        </div>
      )}

      {/* Sentence Scramble / Ordering */}
      {(question.type === 'sentence_scramble' || question.type === 'ordering') && (
        <div style={{ marginBottom:16 }}>
          {/* Built sentence area */}
          <div style={{ minHeight:52, background: darkMode?'#0f172a':'#f0f4ff', borderRadius:10, border:`2px dashed ${darkMode?'#334155':'#c7d2fe'}`, padding:'10px 12px', marginBottom:10, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
            {builtSentence.length === 0 && <span style={{ color:subText, fontSize:'0.9rem' }}>Click words below to build the sentence...</span>}
            {builtSentence.map((w, i) => (
              <button key={i} onClick={() => handleRemoveWord(i)}
                style={{ background:'#f5b042', borderRadius:6, padding:'4px 10px', fontSize:'0.95rem', fontWeight:700, border:'none', cursor:'pointer', color:'#1e2a3a' }}>
                {w} ×
              </button>
            ))}
          </div>
          {/* Word bank */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {scrambled.map((w, i) => (
              <button key={i} onClick={() => handleWordClick(w, i)}
                disabled={usedWords.includes(i) || showResult}
                style={{
                  background: usedWords.includes(i) ? (darkMode?'#334155':'#e2e8f0') : (darkMode?'#1e3a5f':'#dbeafe'),
                  borderRadius:8, padding:'8px 14px', fontSize:'1rem', fontWeight:700,
                  border:`2px solid ${usedWords.includes(i)?(darkMode?'#475569':'#cbd5e1'):(darkMode?'#3b82f6':'#93c5fd')}`,
                  cursor: usedWords.includes(i)?'not-allowed':'pointer',
                  color: usedWords.includes(i)?(darkMode?'#475569':'#9ca3af'):text,
                  transition:'all 0.15s',
                }}>
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matching */}
      {question.type === 'matching' && question.pairs && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {question.pairs.map(pair => {
                const isDone = !!matchedPairs[pair.left];
                const isSelected = matchSelected === pair.left;
                const isWrong = matchWrong === pair.left;
                return (
                  <button key={pair.left}
                    onClick={() => !isDone && handleMatchLeft(pair.left)}
                    disabled={isDone || showResult}
                    style={{
                      padding:'10px 12px', borderRadius:8, fontSize:'0.95rem', fontWeight:700,
                      border:`2px solid ${isDone?'#5cb85c':isSelected?'#f5b042':isWrong?'#d9534f':(darkMode?'#334155':'#c7d2fe')}`,
                      background: isDone?'rgba(92,184,92,0.15)':isSelected?'rgba(245,176,66,0.15)':isWrong?'rgba(217,83,79,0.15)':(darkMode?'#1e3a5f':'#f0f4ff'),
                      color:text, cursor: isDone?'default':'pointer', textAlign:'left',
                    }}>
                    {isDone ? '✅' : isSelected ? '👉' : ''} {pair.left}
                  </button>
                );
              })}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {shuffledRightOptions.map(right => {
                const isDone = Object.values(matchedPairs).includes(right);
                return (
                  <button key={right}
                    onClick={() => !isDone && handleMatchRight(right)}
                    disabled={isDone || !matchSelected || showResult}
                    style={{
                      padding:'10px 12px', borderRadius:8, fontSize:'0.95rem', fontWeight:700,
                      border:`2px solid ${isDone?'#5cb85c':(darkMode?'#334155':'#c7d2fe')}`,
                      background: isDone?'rgba(92,184,92,0.15)':(darkMode?'#1e3a5f':'#f0f4ff'),
                      color:text, cursor:isDone||!matchSelected?'default':'pointer', textAlign:'left',
                    }}>
                    {isDone ? '✅' : ''} {right}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Result banner */}
      {showResult && (
        <div style={{
          background: isCorrect ? 'rgba(92,184,92,0.15)' : 'rgba(217,83,79,0.15)',
          border: `2px solid ${isCorrect?'#5cb85c':'#d9534f'}`,
          borderRadius:10, padding:'12px 16px', marginBottom:12,
        }}>
          <div style={{ fontSize:'1.4rem', fontWeight:900, color: isCorrect?'#2d8a30':'#c0302b', marginBottom:4 }}>
            {isCorrect ? '🎉 Correct!' : '❌ Not quite!'}
            {isCorrect && bonusTime > 0 && <span style={{ fontSize:'0.9rem', marginLeft:8, color:'#f5b042' }}>+{bonusTime} speed bonus!</span>}
          </div>
          {question.explanation && (
            <div style={{ fontSize:'0.9rem', color: darkMode?'#94a3b8':'#475569', fontWeight:500, lineHeight:1.4 }}>
              💡 {question.explanation}
            </div>
          )}
          {!isCorrect && question.correctAnswer && typeof question.correctAnswer === 'string' && (
            <div style={{ fontSize:'0.9rem', fontWeight:700, color: darkMode?'#4ade80':'#2d6a4f', marginTop:4 }}>
              ✅ Correct answer: <em>{question.correctAnswer}</em>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
        {question.type === 'wild_card' && !showResult && (
          <button className="btn-gold btn-press" style={{ padding:'12px 28px', borderRadius:10, fontSize:'1rem' }}
            onClick={() => onAnswer('wild')}>
            🃏 Activate Effect
          </button>
        )}
        {(question.type === 'challenge' || question.type === 'truth_or_dare' || question.type === 'would_you_rather') && !showResult && question.type !== 'would_you_rather' && (
          <>
            <button className="btn-green btn-press" style={{ padding:'12px 24px', borderRadius:10, fontSize:'0.95rem' }}
              onClick={() => onAnswer('correct')}>
              ✅ Teacher: Correct
            </button>
            <button className="btn-red btn-press" style={{ padding:'12px 24px', borderRadius:10, fontSize:'0.95rem' }}
              onClick={() => onAnswer('wrong')}>
              ❌ Teacher: Wrong
            </button>
          </>
        )}
        {showResult && (
          <button className="btn-gold btn-press" style={{ padding:'12px 28px', borderRadius:10, fontSize:'1rem' }}
            onClick={onSkip}>
            Continue →
          </button>
        )}
        {!showResult && !['wild_card','challenge','truth_or_dare','would_you_rather'].includes(question.type) && (
          <button className="btn-navy btn-press" style={{ padding:'10px 20px', borderRadius:10, fontSize:'0.85rem', opacity:0.7 }}
            onClick={onSkip}>
            Skip ⏭
          </button>
        )}
      </div>
    </div>
  );
};

// ─── PLAYER CARD ──────────────────────────────────────────────────────────────
const PlayerCard: React.FC<{
  player: Player;
  isActive: boolean;
  properties: Record<number, Property>;
  tiles: Tile[];
  darkMode: boolean;
  onGiveMoney: () => void;
  onTakeMoney: () => void;
  badges?: string[];
}> = ({ player, isActive, properties, tiles, darkMode, onGiveMoney, onTakeMoney, badges }) => {
  const ownedTiles = Object.values(properties).filter(p => p.ownerId === player.id).map(p => tiles.find(t => t.id === p.tileId)).filter(Boolean) as Tile[];
  const bg = darkMode ? (isActive ? '#1e3a5f' : '#1e293b') : (isActive ? '#fef9ec' : '#fff');
  const border = isActive ? '#f5b042' : (darkMode ? '#334155' : '#e2e8f0');

  return (
    <div style={{
      background: bg, border: `2px solid ${border}`,
      borderRadius: 12, padding: '12px 14px',
      boxShadow: isActive ? '0 4px 16px rgba(245,176,66,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
      transition: 'all 0.3s ease', position:'relative', overflow:'hidden',
    }}>
      {isActive && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#f5b042,#e09a20,#f5b042)', backgroundSize:'200% 100%' }} />}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
        <div style={{
          width:42, height:42, borderRadius:'50%',
          background: player.color + '22',
          border: `2px solid ${player.color}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'1.4rem', flexShrink:0,
        }}>{player.emoji}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'0.95rem', fontWeight:800, color: darkMode?'#f1f5f9':'#1e2a3a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {player.name} {player.isEliminated && '💀'}
          </div>
          <div style={{ fontSize:'1.3rem', fontWeight:900, color:'#f5b042', letterSpacing:'-0.01em' }}>
            {formatMoney(player.money)}
          </div>
        </div>
      </div>
      {isActive && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background:'#f5b042',
          borderRadius:99,
          padding:'2px 8px',
          fontSize:'0.65rem',
          fontWeight:900,
          color:'#1e2a3a',
          boxShadow: '0 6px 16px rgba(245,176,66,0.35)',
        }}>
          TURN
        </div>
      )}
      {/* Stats row */}
      <div style={{ display:'flex', gap:8, fontSize:'0.7rem', fontWeight:600, color: darkMode?'#64748b':'#94a3b8', marginBottom:6 }}>
        <span>🏠 {ownedTiles.length} props</span>
        {player.jailTurns > 0 && <span style={{ color:'#d9534f' }}>⛓️ Jail ({player.jailTurns})</span>}
        {player.getOutOfJailCards > 0 && <span style={{ color:'#5cb85c' }}>🔑 ×{player.getOutOfJailCards}</span>}
      </div>
      {/* Properties owned */}
      {ownedTiles.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:8 }}>
          {ownedTiles.slice(0,8).map(t => (
            <div key={t.id} title={t.name} style={{
              width:12, height:12, borderRadius:2,
              background: COLOR_HEX[t.color] ?? '#888',
              border:'1px solid rgba(0,0,0,0.2)', flexShrink:0,
            }} />
          ))}
          {ownedTiles.length > 8 && <span style={{ fontSize:'0.6rem', color: darkMode?'#64748b':'#94a3b8' }}>+{ownedTiles.length-8}</span>}
        </div>
      )}
      {/* Achievement badges */}
      {badges && badges.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:6 }}>
          {badges.map((b, i) => (
            <span key={i} className="achievement-badge" style={{ fontSize:'0.65rem', background: darkMode?'#334155':'#fef3c7', color: darkMode?'#fbbf24':'#92400e', padding:'1px 6px', borderRadius:6, fontWeight:700 }}>{b}</span>
          ))}
        </div>
      )}
      {/* Teacher money controls */}
      <div style={{ display:'flex', gap:6 }}>
        <button className="btn-green btn-press" style={{ flex:1, padding:'5px', borderRadius:6, fontSize:'0.7rem', fontWeight:700 }} onClick={onGiveMoney}>+$50</button>
        <button className="btn-red btn-press" style={{ flex:1, padding:'5px', borderRadius:6, fontSize:'0.7rem', fontWeight:700 }} onClick={onTakeMoney}>-$50</button>
      </div>
    </div>
  );
};

// ─── PROPERTY DETAIL MODAL ────────────────────────────────────────────────────
const PropertyModal: React.FC<{
  tile: Tile;
  property: Property;
  players: Player[];
  currentPlayer: Player;
  onBuy: () => void;
  onAuction: () => void;
  onClose: () => void;
  darkMode: boolean;
  canBuy: boolean;
  /** city the board was built from — resolves the street photo */
  town?: string;
}> = ({ tile, property, players, currentPlayer: _currentPlayer, onBuy, onAuction, onClose, darkMode, canBuy, town = '' }) => {
  const colorHex = COLOR_HEX[tile.color] ?? '#888';
  const owner = property.ownerId ? players.find(p => p.id === property.ownerId) : null;
  const bg = darkMode ? '#1e293b' : '#fff';
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';
  // the real street behind this square: its photo + its address
  const photos = useMemo(() => tilePhotos(tile, town, 900), [tile, town]);
  const media = useMemo(() => tileMedia(tile, town), [tile, town]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const photo = photos[photoIdx];

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card" style={{ maxWidth:420, width:'100%', borderRadius:16, overflow:'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Colour header, painted with a photo of the real street when we have one */}
        <div style={{ position:'relative', background: `linear-gradient(135deg, ${colorHex}, ${colorHex}bb)`, padding:'20px 24px', overflow:'hidden' }}>
          {photo && (
            <img
              src={photo}
              alt=""
              loading="lazy"
              onError={() => setPhotoIdx(i => i + 1)}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.6 }}
            />
          )}
          {photo && <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.65))' }} />}
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:800, color:'rgba(255,255,255,0.85)', letterSpacing:'0.15em', marginBottom:4 }}>
              {tile.type.toUpperCase().replace('_',' ')}
            </div>
            <div style={{ fontSize:'1.8rem', fontWeight:900, color:'#fff', textShadow:'0 2px 4px rgba(0,0,0,0.45)' }}>{tile.name}</div>
            {media.placeQuery && (
              <div style={{ fontSize:'0.86rem', fontWeight:800, color:'rgba(255,255,255,0.95)', marginTop:6, textShadow:'0 1px 4px rgba(0,0,0,0.6)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span>📍 {media.placeQuery}</span>
                <a href={media.mapLink} target="_blank" rel="noreferrer" style={{ color:'#fff', background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.35)', borderRadius:99, padding:'3px 10px', textDecoration:'none', fontSize:'0.78rem' }}>Maps ↗</a>
                {media.panoLink && <a href={media.panoLink} target="_blank" rel="noreferrer" style={{ color:'#fff', background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.35)', borderRadius:99, padding:'3px 10px', textDecoration:'none', fontSize:'0.78rem' }}>360° ↗</a>}
              </div>
            )}
          </div>
        </div>
        {/* Details */}
        <div style={{ padding:'20px 24px', background:bg }}>
          {/* Price */}
          {tile.price && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, padding:'10px 14px', background: darkMode?'#0f172a':'#f8fafc', borderRadius:8 }}>
              <span style={{ fontWeight:700, color: darkMode?'#94a3b8':'#64748b' }}>List Price</span>
              <span style={{ fontWeight:900, fontSize:'1.2rem', color:'#f5b042' }}>{formatMoney(tile.price)}</span>
            </div>
          )}
          {/* Rent table */}
          {tile.rent && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:'0.8rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:8 }}>RENT SCHEDULE</div>
              {['Base','1 House','2 Houses','3 Houses','4 Houses','🏨 Hotel'].map((label, i) => (
                tile.rent && tile.rent[i] !== undefined && (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${darkMode?'#1e2d40':'#f1f5f9'}`, fontSize:'0.9rem' }}>
                    <span style={{ color: darkMode?'#94a3b8':'#64748b', fontWeight:600 }}>{label}</span>
                    <span style={{ fontWeight:800, color:text }}>{formatMoney(tile.rent[i])}</span>
                  </div>
                )
              ))}
            </div>
          )}
          {/* Owner */}
          {owner && (
            <div style={{ background: owner.color+'22', border:`1px solid ${owner.color}`, borderRadius:8, padding:'8px 12px', marginBottom:12, display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:'1.2rem' }}>{owner.emoji}</span>
              <span style={{ fontWeight:700, color:text }}>Owned by {owner.name}</span>
              {property.mortgaged && <span style={{ fontSize:'0.75rem', color:'#d9534f', fontWeight:800 }}>MORTGAGED</span>}
            </div>
          )}
          {/* Action buttons */}
          <div style={{ display:'flex', gap:10 }}>
            {canBuy && !owner && (
              <>
                <button className="btn-gold btn-press" style={{ flex:2, padding:'13px', borderRadius:10, fontSize:'1rem' }} onClick={onBuy}>
                  🏦 Buy {tile.price ? formatMoney(tile.price) : ''}
                </button>
                <button className="btn-navy btn-press" style={{ flex:1, padding:'13px', borderRadius:10, fontSize:'0.85rem' }} onClick={onAuction}>
                  🔨 Auction
                </button>
              </>
            )}
            <button className="btn-navy btn-press" style={{ flex:1, padding:'13px', borderRadius:10, fontSize:'0.95rem' }} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── AUCTION MODAL ────────────────────────────────────────────────────────────
const AuctionModal: React.FC<{
  tile: Tile;
  players: Player[];
  bids: Record<string, number>;
  onBid: (playerId: string, amount: number) => void;
  onFinish: () => void;
  darkMode: boolean;
}> = ({ tile, players, bids, onBid, onFinish, darkMode }) => {
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const activePlayers = players.filter(p => !p.isEliminated);
  const bg = darkMode ? '#1e293b' : '#fff';
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';
  const highestBid = Object.values(bids).reduce((a, b) => Math.max(a, b), 0);
  const winner = Object.entries(bids).find(([, v]) => v === highestBid);

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-card" style={{ maxWidth:480, width:'100%', borderRadius:16, overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,#8B4513,#5c2d0a)', padding:'18px 24px' }}>
          <div style={{ fontSize:'0.75rem', fontWeight:800, color:'rgba(255,255,255,0.7)', letterSpacing:'0.15em' }}>🔨 AUCTION</div>
          <div style={{ fontSize:'1.6rem', fontWeight:900, color:'#fff' }}>{tile.name}</div>
          <div style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.8)', marginTop:2 }}>Starting bid: {formatMoney(tile.price ? Math.floor(tile.price / 2) : 10)}</div>
        </div>
        <div style={{ padding:'20px 24px', background:bg }}>
          {/* Highest bid banner */}
          {winner && (
            <div style={{ background:'rgba(245,176,66,0.15)', border:'2px solid #f5b042', borderRadius:8, padding:'8px 14px', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, color:text }}>🏆 Current leader: {players.find(p=>p.id===winner[0])?.name}</span>
              <span style={{ fontWeight:900, color:'#f5b042', fontSize:'1.1rem' }}>{formatMoney(highestBid)}</span>
            </div>
          )}
          {/* Player bids */}
          {activePlayers.map(p => (
            <div key={p.id} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:'1.2rem' }}>{p.emoji}</span>
              <span style={{ flex:1, fontWeight:700, color:text, fontSize:'0.9rem' }}>{p.name}</span>
              <span style={{ fontSize:'0.8rem', color: darkMode?'#64748b':'#94a3b8', fontWeight:600 }}>{formatMoney(p.money)}</span>
              {bids[p.id] ? (
                <span style={{ background:'#f5b042', borderRadius:6, padding:'4px 10px', fontWeight:800, fontSize:'0.9rem', color:'#1e2a3a' }}>{formatMoney(bids[p.id])}</span>
              ) : (
                <div style={{ display:'flex', gap:4 }}>
                  <input type="number" min={1} max={p.money} placeholder="Bid"
                    value={bidAmounts[p.id] || ''}
                    onChange={e => setBidAmounts({...bidAmounts, [p.id]: e.target.value})}
                    style={{ width:80, padding:'6px 8px', borderRadius:6, border:`1px solid ${darkMode?'#334155':'#c7d2fe'}`, background: darkMode?'#0f172a':'#f8fafc', color:text, fontSize:'0.9rem', fontWeight:700 }}
                  />
                  <button className="btn-gold btn-press" style={{ padding:'6px 10px', borderRadius:6, fontSize:'0.8rem' }}
                    onClick={() => { const amt = parseInt(bidAmounts[p.id] || '0'); if (amt > 0 && amt <= p.money && amt > highestBid) { onBid(p.id, amt); setBidAmounts({...bidAmounts, [p.id]: ''}); } }}>
                    Bid
                  </button>
                </div>
              )}
            </div>
          ))}
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button className="btn-gold btn-press" style={{ flex:1, padding:'12px', borderRadius:10, fontSize:'0.95rem' }} onClick={onFinish}>
              🔨 Sell to Highest Bidder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TRADE MODAL ──────────────────────────────────────────────────────────────
const TradeModal: React.FC<{
  gs: GameState;
  onSubmit: (trade: TradeOffer) => void;
  onClose: () => void;
}> = ({ gs, onSubmit, onClose }) => {
  const { players, properties: _properties, tiles, darkMode } = gs; void _properties;
  const [fromId, setFromId] = useState(players[0]?.id ?? '');
  const [toId, setToId] = useState(players[1]?.id ?? '');
  const [offeredProps, setOfferedProps] = useState<number[]>([]);
  const [requestedProps, setRequestedProps] = useState<number[]>([]);
  const [offeredMoney, setOfferedMoney] = useState(0);
  const [requestedMoney, setRequestedMoney] = useState(0);

  const fromPlayer = players.find(p => p.id === fromId);
  const toPlayer = players.find(p => p.id === toId);
  const fromProps = fromPlayer?.propertiesOwned.map(id => tiles.find(t => t.id === id)).filter(Boolean) as Tile[] ?? [];
  const toProps = toPlayer?.propertiesOwned.map(id => tiles.find(t => t.id === id)).filter(Boolean) as Tile[] ?? [];
  const bg = darkMode ? '#1e293b' : '#fff';
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';

  const toggle = (arr: number[], setArr: (v: number[]) => void, val: number) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card trade-enter" style={{ maxWidth:560, width:'100%', borderRadius:16, overflow:'hidden', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ background:'linear-gradient(135deg,#1e2a3a,#2d3f57)', padding:'18px 24px' }}>
          <div style={{ fontSize:'1.4rem', fontWeight:900, color:'#fff' }}>🤝 Property Trade</div>
          <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.7)', marginTop:2 }}>Set up a trade between two players</div>
        </div>
        <div style={{ padding:'20px 24px', background:bg }}>
          {/* Player selectors */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, marginBottom:20, alignItems:'center' }}>
            <select value={fromId} onChange={e => { setFromId(e.target.value); setOfferedProps([]); }}
              style={{ padding:'10px', borderRadius:8, border:`1px solid ${darkMode?'#334155':'#c7d2fe'}`, background: darkMode?'#0f172a':'#f8fafc', color:text, fontWeight:700, fontSize:'0.95rem' }}>
              {players.filter(p => !p.isEliminated).map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
            <span style={{ fontSize:'1.3rem', fontWeight:900, color:'#f5b042', textAlign:'center' }}>⇄</span>
            <select value={toId} onChange={e => { setToId(e.target.value); setRequestedProps([]); }}
              style={{ padding:'10px', borderRadius:8, border:`1px solid ${darkMode?'#334155':'#c7d2fe'}`, background: darkMode?'#0f172a':'#f8fafc', color:text, fontWeight:700, fontSize:'0.95rem' }}>
              {players.filter(p => !p.isEliminated && p.id !== fromId).map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </div>

          {/* Properties */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <div style={{ fontSize:'0.75rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:8 }}>{fromPlayer?.name}'s OFFER</div>
              {fromProps.map(t => (
                <button key={t.id} onClick={() => toggle(offeredProps, setOfferedProps, t.id)}
                  style={{ display:'block', width:'100%', marginBottom:4, padding:'7px 10px', borderRadius:7, border:`2px solid ${offeredProps.includes(t.id)?COLOR_HEX[t.color]??'#f5b042':(darkMode?'#334155':'#c7d2fe')}`, background: offeredProps.includes(t.id)?(COLOR_HEX[t.color]+'22'):(darkMode?'#1e3a5f':'#f0f4ff'), color:text, fontWeight:700, fontSize:'0.8rem', textAlign:'left', cursor:'pointer' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:COLOR_HEX[t.color]??'#888', marginRight:6 }} />
                  {t.name} {offeredProps.includes(t.id) && '✓'}
                </button>
              ))}
              <input type="number" min={0} max={fromPlayer?.money??0} value={offeredMoney}
                onChange={e => setOfferedMoney(+e.target.value)}
                placeholder="+ Money offer"
                style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:`1px solid ${darkMode?'#334155':'#c7d2fe'}`, background: darkMode?'#0f172a':'#f8fafc', color:text, fontWeight:700, fontSize:'0.85rem', marginTop:6 }} />
            </div>
            <div>
              <div style={{ fontSize:'0.75rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:8 }}>{toPlayer?.name}'s OFFER</div>
              {toProps.map(t => (
                <button key={t.id} onClick={() => toggle(requestedProps, setRequestedProps, t.id)}
                  style={{ display:'block', width:'100%', marginBottom:4, padding:'7px 10px', borderRadius:7, border:`2px solid ${requestedProps.includes(t.id)?COLOR_HEX[t.color]??'#f5b042':(darkMode?'#334155':'#c7d2fe')}`, background: requestedProps.includes(t.id)?(COLOR_HEX[t.color]+'22'):(darkMode?'#1e3a5f':'#f0f4ff'), color:text, fontWeight:700, fontSize:'0.8rem', textAlign:'left', cursor:'pointer' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:COLOR_HEX[t.color]??'#888', marginRight:6 }} />
                  {t.name} {requestedProps.includes(t.id) && '✓'}
                </button>
              ))}
              <input type="number" min={0} max={toPlayer?.money??0} value={requestedMoney}
                onChange={e => setRequestedMoney(+e.target.value)}
                placeholder="+ Money request"
                style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:`1px solid ${darkMode?'#334155':'#c7d2fe'}`, background: darkMode?'#0f172a':'#f8fafc', color:text, fontWeight:700, fontSize:'0.85rem', marginTop:6 }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-gold btn-press" style={{ flex:2, padding:'12px', borderRadius:10, fontSize:'0.95rem' }}
              onClick={() => onSubmit({ fromPlayerId:fromId, toPlayerId:toId, offeredProperties:offeredProps, requestedProperties:requestedProps, offeredMoney, requestedMoney })}>
              🤝 Confirm Trade
            </button>
            <button className="btn-navy btn-press" style={{ flex:1, padding:'12px', borderRadius:10, fontSize:'0.9rem' }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TEACHER PANEL ────────────────────────────────────────────────────────────
const TeacherPanel: React.FC<{
  gs: GameState;
  onClose: () => void;
  onImportJSON: (json: string) => void;
  onVoiceChange: (voice: SpeechSynthesisVoice) => void;
  onHostLineSpeech: (category: string) => void;
  darkMode: boolean;
  hostVoiceURI: string;
  /** live sound state — the teacher panel switches the SAME state the top bar uses */
  sound: { music: boolean; sfx: boolean; voice: boolean; audience: boolean };
  onToggleSound: (key: 'music' | 'sfx' | 'voice' | 'audience') => void;
}> = ({ gs, onClose, onImportJSON, onVoiceChange, onHostLineSpeech, darkMode, hostVoiceURI, sound, onToggleSound }) => {
  const [tab, setTab] = useState<'content'|'voice'|'settings'|'overview'>('overview');
  const [jsonInput, setJsonInput] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
  const bg = darkMode ? '#1e293b' : '#fff';
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';
  const cardBg = darkMode ? '#0f172a' : '#f8fafc';

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      setVoices(v);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const tabs = [
    { id:'overview', label:'📊 Overview' },
    { id:'content', label:'📝 Content' },
    { id:'voice', label:'🎙️ Voice' },
    { id:'settings', label:'⚙️ Settings' },
  ] as const;

  return (
    <div className="modal-backdrop fixed inset-0 z-40 flex items-start justify-end p-4" onClick={onClose}>
      <div className="glass-card" style={{ width:480, maxHeight:'92vh', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1e2a3a,#2d3f57)', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:'1.1rem', fontWeight:900, color:'#fff' }}>🎓 Teacher Panel</div>
            <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.6)' }}>Content management & game controls</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, padding:'6px 10px', color:'#fff', cursor:'pointer', fontSize:'1rem' }}>✕</button>
        </div>
        {/* Tabs */}
        <div style={{ display:'flex', background: darkMode?'#0f172a':'#f1f5f9', borderBottom:`1px solid ${darkMode?'#334155':'#e2e8f0'}`, flexShrink:0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:'10px 6px', background: tab===t.id?(darkMode?'#1e293b':'#fff'):'transparent', border:'none', borderBottom: tab===t.id?`2px solid #f5b042`:'2px solid transparent', cursor:'pointer', fontSize:'0.72rem', fontWeight:700, color: tab===t.id?'#f5b042':(darkMode?'#64748b':'#94a3b8'), transition:'all 0.2s', fontFamily:'inherit' }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="scrollable flex-1" style={{ padding:'16px 20px', background:bg }}>
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              <div style={{ fontSize:'0.75rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:10 }}>PLAYER STATUS</div>
              {gs.players.map(p => (
                <div key={p.id} style={{ background:cardBg, borderRadius:10, padding:'10px 14px', marginBottom:8, display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:'1.2rem' }}>{p.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, color:text, fontSize:'0.9rem' }}>{p.name}</div>
                    <div style={{ fontSize:'0.8rem', color: darkMode?'#64748b':'#94a3b8' }}>Pos: {p.position} | {formatMoney(p.money)} | Props: {p.propertiesOwned.length}</div>
                  </div>
                  {p.isEliminated && <span style={{ fontSize:'0.75rem', fontWeight:800, color:'#d9534f', background:'rgba(217,83,79,0.1)', borderRadius:6, padding:'2px 8px' }}>ELIMINATED</span>}
                </div>
              ))}
              <div style={{ fontSize:'0.75rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginTop:14, marginBottom:8 }}>GAME LOG (LAST 8)</div>
              {gs.log.slice(-8).reverse().map((entry, i) => (
                <div key={i} style={{ fontSize:'0.8rem', color: darkMode?'#94a3b8':'#475569', padding:'4px 0', borderBottom:`1px solid ${darkMode?'#1e2d40':'#f1f5f9'}` }}>{entry}</div>
              ))}
              {/* Host speech triggers */}
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:'0.75rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:8 }}>HOST SPEECH TRIGGERS</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {['correct','wrong','timer','buy','jail','welcome'].map(cat => (
                    <button key={cat} className="btn-navy btn-press" style={{ padding:'6px 12px', borderRadius:8, fontSize:'0.75rem' }} onClick={() => onHostLineSpeech(cat)}>
                      🎙️ {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONTENT */}
          {tab === 'content' && (
            <div>
              {/* AI Location Generator */}
              <div style={{ background: darkMode?'#0c2340':'#eff6ff', border:`2px solid ${darkMode?'#1e40af':'#93c5fd'}`, borderRadius:12, padding:16, marginBottom:20 }}>
                <div style={{ fontSize:'0.9rem', fontWeight:900, color: darkMode?'#60a5fa':'#1e40af', marginBottom:8 }}>
                  🌍 Personalize for Your Learner's Town
                </div>
                <div style={{ fontSize:'0.8rem', color: darkMode?'#93c5fd':'#1e40af', marginBottom:12, lineHeight:1.5 }}>
                  Enter your learner's neighborhood or city below. Copy the generated prompt, paste it into ChatGPT/Claude, then paste the result JSON back here.
                </div>
                <input
                  type="text"
                  placeholder="e.g. Kreuzberg, Berlin or Shibuya, Tokyo..."
                  id="location-input"
                  style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:`1px solid ${darkMode?'#334155':'#93c5fd'}`, background: darkMode?'#0f172a':'#fff', color:text, fontSize:'0.9rem', fontWeight:700, fontFamily:'inherit', marginBottom:8 }}
                />
                <button className="btn-navy btn-press" style={{ width:'100%', padding:'10px', borderRadius:8, fontSize:'0.85rem' }}
                  onClick={() => {
                    const loc = (document.getElementById('location-input') as HTMLInputElement)?.value || '';
                    if (!loc) return;
                    const prompt = getLocationPrompt(loc, 'B1', 'General English');
                    navigator.clipboard.writeText(prompt).then(() => {
                      alert('✅ Prompt copied to clipboard! Paste it into ChatGPT or Claude, then paste the JSON result below.');
                    }).catch(() => {
                      // Fallback: show in textarea
                      const ta = document.getElementById('json-import-area') as HTMLTextAreaElement;
                      if (ta) ta.value = prompt;
                    });
                  }}>
                  📋 Generate & Copy AI Prompt
                </button>
              </div>

              <div style={{ fontSize:'0.85rem', fontWeight:700, color:text, marginBottom:12, lineHeight:1.5 }}>
                Paste a JSON array of tiles/questions to import custom content. Format:
              </div>
              <div style={{ background: darkMode?'#0f172a':'#f0f4ff', border:`1px solid ${darkMode?'#334155':'#c7d2fe'}`, borderRadius:8, padding:'10px 12px', fontSize:'0.72rem', color: darkMode?'#94a3b8':'#475569', fontFamily:'monospace', marginBottom:12, lineHeight:1.6, overflowX:'auto' }}>
{`[
  {
    "id": 1,
    "name": "Property Name",
    "type": "property",
    "color": "red",
    "price": 220,
    "rent": [18, 90, 250, 700, 875, 1050],
    "question": {
      "id": "q1",
      "type": "mcq",
      "text": "Your question here?",
      "options": ["A","B","C","D"],
      "correctAnswer": "A"
    }
  }
]`}
              </div>
              <textarea id="json-import-area" value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                placeholder="Paste your JSON here..."
                style={{ width:'100%', minHeight:160, padding:'10px 12px', borderRadius:8, border:`1px solid ${darkMode?'#334155':'#c7d2fe'}`, background: darkMode?'#0f172a':'#f8fafc', color:text, fontSize:'0.85rem', fontFamily:'monospace', resize:'vertical' }} />
              <button className="btn-gold btn-press" style={{ width:'100%', padding:'12px', borderRadius:10, fontSize:'0.95rem', marginTop:10 }}
                onClick={() => { if (jsonInput.trim()) { onImportJSON(jsonInput); setJsonInput(''); } }}>
                📥 Import Content
              </button>
              <div style={{ marginTop:16, fontSize:'0.8rem', color: darkMode?'#64748b':'#94a3b8', fontWeight:600 }}>
                💡 Tip: Questions assigned to specific tiles override the default deck. Wild cards and challenges auto-route to Chance tiles.
              </div>
            </div>
          )}

          {/* VOICE */}
          {tab === 'voice' && (
            <div>
              <div style={{ fontSize:'0.75rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:10 }}>SELECT HOST VOICE</div>
              {voices.length === 0 && (
                <div style={{ color: darkMode?'#94a3b8':'#64748b', fontSize:'0.9rem', marginBottom:12 }}>
                  No English voices found in your browser. Try Chrome or Edge for best results.
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:300, overflowY:'auto' }}>
                {voices.map((v, i) => (
                  <button key={i} onClick={() => { setSelectedVoiceIdx(i); onVoiceChange(v); }}
                    style={{ padding:'10px 12px', borderRadius:8, textAlign:'left', border:`2px solid ${selectedVoiceIdx===i?'#f5b042':(darkMode?'#334155':'#c7d2fe')}`, background: selectedVoiceIdx===i?'rgba(245,176,66,0.12)':(darkMode?'#0f172a':'#f8fafc'), cursor:'pointer', transition:'all 0.15s' }}>
                    <div style={{ fontSize:'0.85rem', fontWeight:700, color:text }}>{v.name}</div>
                    <div style={{ fontSize:'0.7rem', color: darkMode?'#64748b':'#94a3b8' }}>{v.lang} {v.localService?'(Local)':'(Remote)'}</div>
                  </button>
                ))}
              </div>
              <button className="btn-navy btn-press" style={{ width:'100%', padding:'10px', borderRadius:9, fontSize:'0.9rem', marginTop:12 }}
                onClick={() => speak('Welcome to Tutorly Edupoly! The educational language game where knowledge is currency!', hostVoiceURI || null)}>
                🔊 Test Voice
              </button>
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <div>              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize:'0.75rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em' }}>SOUND — changes apply instantly and are remembered</div>
                {([
                  { label: '🎵 Background Music', key: 'music' as const },
                  { label: '🔔 Sound Effects', key: 'sfx' as const },
                  { label: '🎙️ Host Voice', key: 'voice' as const },
                  { label: '👥 Audience Sounds', key: 'audience' as const },
                ]).map(setting => (
                  <SoundToggle
                    key={setting.key}
                    label={setting.label}
                    on={sound[setting.key]}
                    onClick={() => onToggleSound(setting.key)}
                    darkMode={darkMode}
                  />
                ))}
                <div style={{ padding:'12px 14px', background:cardBg, borderRadius:10 }}>
                  <div style={{ fontWeight:700, color:text, marginBottom:6 }}>📋 Keyboard Shortcuts</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:'0.8rem', color: darkMode?'#94a3b8':'#64748b' }}>
                    <div><kbd style={{ background: darkMode?'#334155':'#e2e8f0', borderRadius:4, padding:'1px 6px', fontFamily:'monospace' }}>Space</kbd> Roll dice</div>
                    <div><kbd style={{ background: darkMode?'#334155':'#e2e8f0', borderRadius:4, padding:'1px 6px', fontFamily:'monospace' }}>1-4</kbd> Select answer option</div>
                    <div><kbd style={{ background: darkMode?'#334155':'#e2e8f0', borderRadius:4, padding:'1px 6px', fontFamily:'monospace' }}>Enter</kbd> Submit answer</div>
                    <div><kbd style={{ background: darkMode?'#334155':'#e2e8f0', borderRadius:4, padding:'1px 6px', fontFamily:'monospace' }}>T</kbd> Open teacher panel</div>
                    <div><kbd style={{ background: darkMode?'#334155':'#e2e8f0', borderRadius:4, padding:'1px 6px', fontFamily:'monospace' }}>F</kbd> Toggle fullscreen</div>
                  </div>
                </div>
                <div style={{ padding:'12px 14px', background:cardBg, borderRadius:10 }}>
                  <div style={{ fontWeight:700, color:text, marginBottom:8 }}>💾 Auto-Save</div>
                  <div style={{ fontSize:'0.8rem', color: darkMode?'#94a3b8':'#64748b', marginBottom:8 }}>Game state is saved automatically to localStorage on every action.</div>
                  <button className="btn-red btn-press" style={{ padding:'8px 16px', borderRadius:8, fontSize:'0.8rem' }}
                    onClick={() => { localStorage.removeItem('eduopoly_state'); window.location.reload(); }}>
                    🗑️ Clear Save & Restart
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── LEGACY SETUP SCREEN (superseded) ────────────────────────────────────────
// The live setup flow is <PlayerSetup/> from GameShell.tsx so every Tutorly game
// shares one splash screen + one player/AI-pack setup page. This older, game-only
// version is kept exported but unused — it is safe to delete.
interface LearnerProfile {
  name: string;
  emoji: string;
  color: string;
  facts: string; // interests, strengths, background
  town: string;
  isNPC: boolean;
  npcLines: string; // dialogue lines for NPC
  luckRate: number; // 1-10 (NPC only)
}

export const LegacySetupScreen: React.FC<{
  onStart: (players: Player[]) => void;
  darkMode: boolean;
  onToggleDark: () => void;
}> = ({ onStart, darkMode, onToggleDark }) => {
  const [profiles, setProfiles] = useState<LearnerProfile[]>([
    { name: '', emoji: '🚗', color: PLAYER_COLORS[0], facts: '', town: '', isNPC: false, npcLines: '', luckRate: 5 },
    { name: '', emoji: '🎩', color: PLAYER_COLORS[1], facts: '', town: '', isNPC: false, npcLines: '', luckRate: 5 },
  ]);
  const [gameTown, setGameTown] = useState('');
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [topic, setTopic] = useState('General English');
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [expandedProfile, setExpandedProfile] = useState<number | null>(0);
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';
  const bg = darkMode ? '#0f172a' : '#f5f5f0';
  const cardBg = darkMode ? '#1e293b' : '#fff';
  const inputBg = darkMode ? '#0f172a' : '#f8fafc';
  const borderCol = darkMode ? '#334155' : '#c7d2fe';

  const emojiGrid = ['🚗','🎩','🐕','🚢','👟','🎭','🦁','🚀','💎','⚡','🎸','🏆','🐉','🦊','🌟','🎯','🍕','🎮','🏄','🌈','🦋','🎪','🚂','✈️','🎻','🐸','🦄','🍀','🎲','🎨','👨‍🏫','👩‍💼','🤖','🧑‍🚀','🧙','🦸'];

  const addProfile = (isNPC: boolean) => {
    if (profiles.length >= 6) return;
    const idx = profiles.length;
    setProfiles([...profiles, {
      name: isNPC ? `NPC ${idx}` : '',
      emoji: DEFAULT_EMOJIS[idx % DEFAULT_EMOJIS.length],
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      facts: '',
      town: '',
      isNPC,
      npcLines: isNPC ? 'Welcome to my property! Pay up!' : '',
      luckRate: isNPC ? 7 : 5,
    }]);
    setExpandedProfile(idx);
  };

  const removeProfile = (i: number) => {
    if (profiles.length <= 1) return;
    setProfiles(profiles.filter((_, idx) => idx !== i));
  };

  const updateProfile = (i: number, field: keyof LearnerProfile, val: string | number | boolean) => {
    setProfiles(profiles.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  // Build the comprehensive AI prompt
  const buildPrompt = (): string => {
    const town = gameTown || profiles.find(p => p.town)?.town || 'London';
    const playerDescs = profiles.map((p, i) => {
      if (p.isNPC) {
        return `NPC ${i + 1}: "${p.name || 'Mystery NPC'}" (Emoji: ${p.emoji})
  - Dialogue lines: "${p.npcLines}"
  - Luck rate: ${p.luckRate}/10 (higher = luckier Chance cards)
  - Role: AI-controlled character with personality`;
      }
      return `Learner ${i + 1}: "${p.name || 'Unnamed'}" (Emoji: ${p.emoji})
  - Background: ${p.facts || 'No info provided'}
  - From: ${p.town || town}`;
    }).join('\n\n');

    return `You are generating a COMPLETE, VALIDATED JSON game pack for "Tutorly Edupoly" — an educational Monopoly-style language learning board game.

⚠️ CRITICAL: Output ONLY valid JSON. No comments, no trailing commas, no explanations outside JSON. Validate before outputting.

═══ GAME CONTEXT ═══
Town/City: ${town}
CEFR Level: ${cefrLevel}
Topic: ${topic}
Number of players: ${profiles.length}

═══ PLAYER PROFILES ═══
${playerDescs}

═══ REQUIRED JSON STRUCTURE ═══
{
  "town": "${town}",
  "cefrLevel": "${cefrLevel}",
  "topic": "${topic}",

  "players": [
    {
      "name": "Learner's actual name",
      "emoji": "${profiles[0]?.emoji || '🚗'}",
      "color": "${profiles[0]?.color || '#e74c3c'}",
      "isNPC": false
    }
  ],

  "tiles": [
    {
      "id": 0,
      "name": "GO",
      "type": "go",
      "color": "none",
      "description": "Collect $200 salary as you pass!"
    },
    {
      "id": 1,
      "name": "REAL STREET/PLACE NAME from ${town}",
      "type": "property",
      "color": "brown",
      "price": 60,
      "rent": [2, 10, 30, 90, 160, 250],
      "mortgageValue": 30,
      "housePrice": 50,
      "realAddress": "Full real address in ${town}",
      "culture": {
        "neighborhood": "Real district name",
        "photoUrl": "https://source.unsplash.com/featured/800x400/?PLACE+NAME+${town.replace(/ /g, '+')}",
        "foods": ["Real local dish 1", "Real local dish 2", "Real local dish 3"],
        "thingsToDo": ["Real local activity 1", "Real local activity 2"],
        "taboos": ["Real cultural don't 1", "Real cultural don't 2"],
        "phrases": [
          {"phrase": "Real local expression", "meaning": "English meaning"},
          {"phrase": "Another phrase", "meaning": "Meaning"}
        ],
        "funFact": "A real, surprising fact about this place",
        "country": "Country name"
      },
      "question": {
        "id": "q1",
        "type": "mcq",
        "text": "Question personalized to this learner's interests or about this place",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "B",
        "explanation": "Why this is correct"
      }
    }
  ],

  "culturalTips": [
    "💬 In ${town}, people say 'X' which means 'Y'",
    "🍽️ You must try X when visiting ${town}",
    "💰 Negotiation tip: In ${town}, it's common to...",
    "🤝 Business etiquette: Always...",
    "🚫 Never do X in ${town} because..."
  ],

  "chanceCards": [
    {
      "id": "ch1",
      "type": "wild_card",
      "text": "Cultural scenario related to ${town}!",
      "wildEffect": "collect_100"
    },
    {
      "id": "ch2",
      "type": "challenge",
      "text": "Cultural Etiquette Challenge",
      "challengeText": "You're at a real venue in ${town}. What do you do?",
      "explanation": "The culturally appropriate response"
    }
  ]
}

═══ TILE REQUIREMENTS (40 total) ═══
- id 0: GO
- id 1-3: 2 properties (brown) + 1 Community Chest — use REAL streets from ${town}
- id 4: Income Tax
- id 5: Railroad — use a REAL train station from ${town}
- id 6-9: 3 properties (light_blue) + 1 Chance — REAL places
- id 10: Jail
- id 11-14: 3 properties (pink) — REAL landmarks
- id 15: Railroad — REAL station
- id 16-19: 3 properties (orange) + 1 Community Chest — REAL neighborhoods
- id 20: Free Parking
- id 21-24: 3 properties (red) — REAL famous spots
- id 25: Railroad — REAL station
- id 26-29: 3 properties (yellow) — REAL business districts
- id 30: Go To Jail
- id 31-34: 3 properties (green) + 1 Community Chest — REAL upscale areas
- id 35: Railroad — REAL station
- id 36-39: 1 Chance + 2 properties (blue) + 1 Luxury Tax — REAL prestigious addresses

═══ QUESTION REQUIREMENTS ═══
- 10 MCQ questions about ${town}'s culture, language, places
- 5 True/False about local customs
- 5 Fill-gap grammar questions using local context
- 3 Listening questions (audioText field with local dialogues)
- 5 Sentence scramble using local phrases
- 4 Matching (local vocabulary pairs)
- 4 Challenge/Cultural etiquette scenarios
- 4 Wild cards (collect money, go to jail, etc.)

═══ PERSONALIZATION RULES ═══
${profiles.filter(p => p.facts).map(p => `- For "${p.name}": Reference their interests (${p.facts}) in some questions`).join('\n')}
${profiles.filter(p => p.isNPC).map(p => `- NPC "${p.name}" has luck rate ${p.luckRate}/10. Generate ${p.luckRate > 5 ? 'favorable' : 'challenging'} Chance cards mentioning them.`).join('\n')}

═══ CULTURAL TIPS (for board center) ═══
Generate 15+ tips covering: local expressions, food, negotiation customs, business etiquette, taboos, economic facts about ${town}.

⚠️ VALIDATE: Ensure all 40 tile IDs (0-39) are present. All JSON is valid. No trailing commas. All strings properly escaped.`;
  };

  const handleCopyPrompt = () => {
    const prompt = buildPrompt();
    navigator.clipboard.writeText(prompt).then(() => {
      setShowPrompt(true);
      setTimeout(() => setShowPrompt(false), 3000);
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setShowPrompt(true);
      setTimeout(() => setShowPrompt(false), 3000);
    });
  };

  const handleStart = () => {
    const gamePlayers: Player[] = profiles.map((p, i) => ({
      id: uid(), name: p.name || `Player ${i + 1}`, emoji: p.emoji,
      money: STARTING_MONEY, position: 0, jailTurns: 0,
      getOutOfJailCards: 0, color: p.color, isEliminated: false,
      propertiesOwned: [], consecutiveDoubles: 0, hasRolled: false,
    }));
    onStart(gamePlayers);
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', fontFamily: "'Montserrat',sans-serif" }}>
      {/* Dark toggle */}
      <button onClick={onToggleDark} style={{ position: 'fixed', top: 16, right: 16, background: darkMode ? '#334155' : '#e2e8f0', border: 'none', borderRadius: 99, padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: text, zIndex: 10 }}>
        {darkMode ? '☀️ Light' : '🌙 Dark'}
      </button>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 6 }}>🎓</div>
        <div style={{ fontSize: 'clamp(1.8rem,5vw,3rem)', fontWeight: 950, color: text, lineHeight: 1 }}>
          <span style={{ color: '#f5b042' }}>Tutorly</span> Edupoly
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: darkMode ? '#64748b' : '#94a3b8', letterSpacing: '0.18em', marginTop: 4 }}>PERSONALIZED LANGUAGE GAME</div>
      </div>

      {/* Main setup card */}
      <div className="glass-card" style={{ maxWidth: 700, width: '100%', borderRadius: 20, overflow: 'hidden' }}>
        {/* ── SECTION 1: Town & Settings ── */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${borderCol}`, background: darkMode ? '#0c1829' : '#eff6ff' }}>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: darkMode ? '#60a5fa' : '#1e40af', marginBottom: 12 }}>🌍 Game Location & Settings</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: darkMode ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 4 }}>TOWN / CITY *</label>
              <input type="text" value={gameTown} onChange={e => setGameTown(e.target.value)}
                placeholder="e.g. Shibuya, Tokyo"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${borderCol}`, background: inputBg, color: text, fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: darkMode ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 4 }}>CEFR LEVEL</label>
                <select value={cefrLevel} onChange={e => setCefrLevel(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1.5px solid ${borderCol}`, background: inputBg, color: text, fontSize: '0.9rem', fontWeight: 700, fontFamily: 'inherit' }}>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: darkMode ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 4 }}>TOPIC</label>
                <select value={topic} onChange={e => setTopic(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1.5px solid ${borderCol}`, background: inputBg, color: text, fontSize: '0.9rem', fontWeight: 700, fontFamily: 'inherit' }}>
                  {['General English', 'Business English', 'Travel English', 'Academic English', 'Medical English', 'Tech English', 'Hospitality', 'Legal English'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Learner Profiles ── */}
        <div style={{ padding: '20px 24px', background: cardBg }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: text }}>👥 Players & Learner Profiles</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-navy btn-press" style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem' }} onClick={() => addProfile(false)} disabled={profiles.length >= 6}>
                + Learner
              </button>
              <button className="btn-press" style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }} onClick={() => addProfile(true)} disabled={profiles.length >= 6}>
                + NPC 🤖
              </button>
            </div>
          </div>

          {profiles.map((p, i) => (
            <div key={i} style={{ marginBottom: 10, border: `2px solid ${expandedProfile === i ? '#f5b042' : borderCol}`, borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}>
              {/* Player header — always visible */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: p.isNPC ? (darkMode ? '#1a1040' : '#f5f3ff') : (darkMode ? '#111827' : '#f8fafc'), cursor: 'pointer' }}
                onClick={() => setExpandedProfile(expandedProfile === i ? null : i)}>
                <button onClick={e => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === i ? null : i); }}
                  style={{ width: 42, height: 42, borderRadius: 10, background: p.color + '22', border: `2px solid ${p.color}`, fontSize: '1.4rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {p.emoji}
                </button>
                <input type="text" value={p.name} onChange={e => { e.stopPropagation(); updateProfile(i, 'name', e.target.value); }}
                  onClick={e => e.stopPropagation()}
                  placeholder={p.isNPC ? 'NPC name' : 'Learner name'}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: text, fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit' }} />
                <input type="color" value={p.color} onChange={e => updateProfile(i, 'color', e.target.value)} onClick={e => e.stopPropagation()}
                  style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                {p.isNPC && <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#7c3aed', color: '#fff', padding: '2px 6px', borderRadius: 6 }}>NPC</span>}
                {profiles.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeProfile(i); }} style={{ background: 'rgba(217,83,79,0.1)', border: '1px solid #d9534f', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#d9534f', fontSize: '0.75rem', fontWeight: 900 }}>✕</button>
                )}
                <span style={{ fontSize: '0.8rem', color: darkMode ? '#64748b' : '#94a3b8', transform: expandedProfile === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </div>

              {/* Emoji picker */}
              {showEmojiPicker === i && (
                <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 3, background: darkMode ? '#1e293b' : '#fff', borderTop: `1px solid ${borderCol}` }}>
                  {emojiGrid.map(em => (
                    <button key={em} onClick={() => { updateProfile(i, 'emoji', em); setShowEmojiPicker(null); }}
                      style={{ width: 32, height: 32, fontSize: '1.1rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer' }}>{em}</button>
                  ))}
                </div>
              )}

              {/* Expanded details */}
              {expandedProfile === i && (
                <div style={{ padding: '12px 14px', background: darkMode ? '#0f172a' : '#fafbff', borderTop: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: darkMode ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 3 }}>
                      {p.isNPC ? '🤖 NPC PERSONALITY & DIALOGUE LINES' : '📋 FACTS, INTERESTS, STRENGTHS (for AI personalization)'}
                    </label>
                    <textarea value={p.isNPC ? p.npcLines : p.facts}
                      onChange={e => updateProfile(i, p.isNPC ? 'npcLines' : 'facts', e.target.value)}
                      placeholder={p.isNPC ? 'e.g. "Welcome to MY hotel! Pay up or answer my riddle!" Sarcastic, dramatic, loves puns...' : 'e.g. Loves football, works in tech, beginner at cooking, interested in Japanese culture...'}
                      style={{ width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: text, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: p.isNPC ? '1fr 1fr' : '1fr', gap: 8 }}>
                    {!p.isNPC && (
                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 800, color: darkMode ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 3 }}>🏠 FROM (city/town)</label>
                        <input type="text" value={p.town} onChange={e => updateProfile(i, 'town', e.target.value)}
                          placeholder="e.g. Berlin, Germany"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: text, fontSize: '0.85rem', fontFamily: 'inherit' }} />
                      </div>
                    )}
                    {p.isNPC && (
                      <>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: darkMode ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 3 }}>🎲 LUCK RATE (1-10)</label>
                          <input type="range" min={1} max={10} value={p.luckRate} onChange={e => updateProfile(i, 'luckRate', +e.target.value)}
                            style={{ width: '100%' }} />
                          <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, color: p.luckRate >= 7 ? '#22c55e' : p.luckRate <= 3 ? '#ef4444' : '#f59e0b' }}>
                            {p.luckRate}/10 {p.luckRate >= 8 ? '🍀' : p.luckRate <= 3 ? '💀' : '🎲'}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: darkMode ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 3 }}>🤖 NPC FACTS</label>
                          <textarea value={p.facts} onChange={e => updateProfile(i, 'facts', e.target.value)}
                            placeholder="Background story..."
                            style={{ width: '100%', minHeight: 50, padding: '6px 8px', borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: text, fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical' }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── SECTION 3: AI Prompt & Start ── */}
        <div style={{ padding: '20px 24px', borderTop: `1px solid ${borderCol}`, background: darkMode ? '#0c1829' : '#f0f9ff' }}>
          {/* Copy AI Prompt */}
          <button className="btn-navy btn-press" style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: '1rem', marginBottom: 10, position: 'relative' }}
            onClick={handleCopyPrompt}>
            📋 Copy AI Prompt (for ChatGPT / Claude)
            {showPrompt && <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#22c55e', fontWeight: 900 }}>✓ Copied!</span>}
          </button>
          <div style={{ fontSize: '0.75rem', color: darkMode ? '#64748b' : '#94a3b8', marginBottom: 16, lineHeight: 1.5 }}>
            1️⃣ Fill in town + learner profiles above → 2️⃣ Click "Copy AI Prompt" → 3️⃣ Paste into ChatGPT/Claude → 4️⃣ Copy the JSON result → 5️⃣ Use "Teacher Panel → Content" to import during game
          </div>

          {/* Start */}
          <button className="btn-gold btn-press glow-pulse" style={{ width: '100%', padding: '18px', borderRadius: 14, fontSize: '1.4rem', fontWeight: 950, letterSpacing: '0.02em' }}
            onClick={handleStart}>
            🎲 Start Game!
          </button>
        </div>
      </div>

      {/* Feature badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20, maxWidth: 700 }}>
        {['🌍 Town-Based', '🤖 NPCs', '📋 AI-Generated', '🎧 TTS Host', '🏠 Properties', '🤝 Trading', '⛓️ Jail', '💰 Rent Battles', '🎭 10+ Q Types', '📈 Stock Market'].map(f => (
          <div key={f} style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 20, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700, color: darkMode ? '#94a3b8' : '#64748b' }}>{f}</div>
        ))}
      </div>
    </div>
  );
};

// ─── GAME OVER SCREEN ─────────────────────────────────────────────────────────
const GameOverScreen: React.FC<{ players: Player[]; onRestart: () => void; darkMode: boolean }> = ({ players, onRestart, darkMode }) => {
  const sorted = [...players].sort((a, b) => b.money - a.money);
  const bg = darkMode ? '#0f172a' : '#f5f5f0';
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';

  return (
    <div style={{ minHeight:'100vh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Montserrat',sans-serif" }}>
      <div style={{ fontSize:'4rem', textAlign:'center', marginBottom:8 }}>🏆</div>
      <div style={{ fontSize:'2.5rem', fontWeight:900, color:text, marginBottom:4, textAlign:'center' }}>Game Over!</div>
      <div style={{ fontSize:'1rem', color: darkMode?'#64748b':'#94a3b8', fontWeight:600, marginBottom:28, textAlign:'center' }}>Final Standings</div>
      <div style={{ maxWidth:400, width:'100%', display:'flex', flexDirection:'column', gap:12, marginBottom:28 }}>
        {sorted.map((p, i) => (
          <div key={p.id} style={{
            background: darkMode?'#1e293b':'#fff',
            border: `2px solid ${i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'#e2e8f0'}`,
            borderRadius:14, padding:'16px 20px',
            display:'flex', alignItems:'center', gap:14,
            boxShadow: i===0?'0 4px 20px rgba(255,215,0,0.3)':'none',
          }}>
            <div className={`rank-${Math.min(i+1,3)}`} style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', fontWeight:900, color:'#fff', flexShrink:0 }}>
              {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
            </div>
            <span style={{ fontSize:'1.8rem' }}>{p.emoji}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'1.1rem', fontWeight:800, color:text }}>{p.name}</div>
              <div style={{ fontSize:'0.85rem', color: darkMode?'#64748b':'#94a3b8', fontWeight:600 }}>{p.propertiesOwned.length} properties</div>
            </div>
            <div style={{ fontSize:'1.4rem', fontWeight:900, color:'#f5b042' }}>{formatMoney(p.money)}</div>
          </div>
        ))}
      </div>
      <button className="btn-gold btn-press glow-pulse" style={{ padding:'16px 40px', borderRadius:14, fontSize:'1.2rem', fontWeight:900 }} onClick={onRestart}>
        🔄 Play Again
      </button>
    </div>
  );
};

// ─── RENT BATTLE MODAL ────────────────────────────────────────────────────────
const RentBattleModal: React.FC<{
  tile: Tile;
  rentAmount: number;
  question: Question | null;
  onAnswer: (answer: string) => void;
  onPayFull: () => void;
  timeLeft: number;
  showResult: boolean;
  isCorrect: boolean | null;
  selectedAnswer: string | null;
  darkMode: boolean;
}> = ({ tile, rentAmount, question, onAnswer, onPayFull, timeLeft, showResult, isCorrect, selectedAnswer, darkMode }) => {
  const bg = darkMode ? '#1e293b' : '#fff';
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';
  const colorHex = COLOR_HEX[tile.color] ?? '#888';

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-card question-card-enter" style={{ maxWidth:520, width:'100%', borderRadius:16, overflow:'hidden' }}>
        {/* Rent header */}
        <div style={{ background:`linear-gradient(135deg,${colorHex}cc,${colorHex}88)`, padding:'16px 24px' }}>
          <div style={{ fontSize:'0.75rem', fontWeight:800, color:'rgba(255,255,255,0.8)', letterSpacing:'0.15em' }}>🏠 RENT DUE</div>
          <div style={{ fontSize:'1.6rem', fontWeight:900, color:'#fff' }}>{tile.name}</div>
          <div style={{ fontSize:'2rem', fontWeight:900, color:'#fff', textShadow:'0 2px 6px rgba(0,0,0,0.3)' }}>
            {formatMoney(rentAmount)} <span style={{ fontSize:'1rem', opacity:0.8 }}>full rent</span>
          </div>
          <div style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.85)', marginTop:4, fontWeight:600 }}>
            Answer correctly → pay only {formatMoney(Math.floor(rentAmount/2))} (50% off!) ⚡
          </div>
        </div>
        <div style={{ padding:'20px 24px', background:bg }}>
          {question ? (
            <QuestionCard
              question={question} timeLeft={timeLeft}
              onAnswer={onAnswer} onSkip={onPayFull}
              selectedAnswer={selectedAnswer} showResult={showResult}
              isCorrect={isCorrect} darkMode={darkMode} bonusTime={0}
            />
          ) : (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:'1.1rem', fontWeight:700, color:text, marginBottom:16 }}>No question available.</div>
              <button className="btn-red btn-press" style={{ padding:'12px 28px', borderRadius:10, fontSize:'1rem' }} onClick={onPayFull}>
                💸 Pay {formatMoney(rentAmount)}
              </button>
            </div>
          )}
          {!showResult && question && (
            <button className="btn-red btn-press" style={{ width:'100%', marginTop:10, padding:'10px', borderRadius:9, fontSize:'0.85rem' }} onClick={onPayFull}>
              💸 Skip & Pay Full Rent {formatMoney(rentAmount)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── JAIL MODAL ───────────────────────────────────────────────────────────────
const JailModal: React.FC<{
  player: Player;
  question: Question | null;
  timeLeft: number;
  onPayFine: () => void;
  onUseCard: () => void;
  onAnswerQuestion: (ans: string) => void;
  onSkip: () => void;
  showResult: boolean;
  isCorrect: boolean | null;
  selectedAnswer: string | null;
  darkMode: boolean;
}> = ({ player, question, timeLeft, onPayFine, onUseCard, onAnswerQuestion, onSkip, showResult, isCorrect, selectedAnswer, darkMode }) => {
  const bg = darkMode ? '#1e293b' : '#fff'; void bg;
  const text = darkMode ? '#f1f5f9' : '#1e2a3a'; void text;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-card question-card-enter" style={{ maxWidth:500, width:'100%', borderRadius:16, overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,#1a1a2e,#2d1b5e)', padding:'18px 24px', textAlign:'center' }}>
          <div style={{ fontSize:'2.5rem' }}>⛓️</div>
          <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#fff' }}>{player.name} is in Jail!</div>
          <div style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.7)', marginTop:4 }}>Turn {player.jailTurns}/3 in jail</div>
        </div>
        <div style={{ padding:'20px 24px', background:bg }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
            <button className="btn-gold btn-press" style={{ padding:'12px', borderRadius:10, fontSize:'1rem' }} onClick={onPayFine}>
              💰 Pay $50 Fine to Get Out
            </button>
            {player.getOutOfJailCards > 0 && (
              <button className="btn-green btn-press" style={{ padding:'12px', borderRadius:10, fontSize:'1rem' }} onClick={onUseCard}>
                🔑 Use Get Out of Jail Card ({player.getOutOfJailCards})
              </button>
            )}
          </div>
          {question && (
            <div>
              <div style={{ fontSize:'0.85rem', fontWeight:800, color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:10, textAlign:'center' }}>
                — OR ANSWER THIS QUESTION TO GET OUT FREE —
              </div>
              <QuestionCard
                question={question} timeLeft={timeLeft}
                onAnswer={onAnswerQuestion} onSkip={onSkip}
                selectedAnswer={selectedAnswer} showResult={showResult}
                isCorrect={isCorrect} darkMode={darkMode} bonusTime={0}
              />
            </div>
          )}
          <button className="btn-navy btn-press" style={{ width:'100%', marginTop:10, padding:'10px', borderRadius:9, fontSize:'0.85rem', opacity:0.7 }} onClick={onSkip}>
            Stay in Jail This Turn
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN GAME COMPONENT ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── SHELL PHASES: splash → setup → game (same in every Tutorly game) ──
  const [phase, setPhase] = useState<'splash' | 'setup' | 'game'>('splash');
  const [gs, setGs] = useState<GameState | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [savedGameExists, setSavedGameExists] = useState(false);
  /** question bank + decks loaded from the AI pack (falls back to built-in questions) */
  const [bankQuestions, setBankQuestions] = useState<Question[]>(SAMPLE_QUESTIONS);
  /** city the current board was built from — drives the backdrop + tile photos */
  const [packTown, setPackTown] = useState<string>(() => localStorage.getItem('eduopoly_town') || '');
  // ── FULL-PAGE BOARD HUD: both side panels are drawers, the header can collapse ──
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [qTimeLeft, setQTimeLeft] = useState(QUESTION_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showQResult, setShowQResult] = useState(false);
  const [qIsCorrect, setQIsCorrect] = useState<boolean | null>(null);
  const [showPropertyModal, setShowPropertyModal] = useState<Tile | null>(null);
  const [showAuction, setShowAuction] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);
  const [showJailModal, setShowJailModal] = useState(false);
  const [showRentBattle, setShowRentBattle] = useState(false);
  const [hoverTile, setHoverTile] = useState<{ tile: Tile; pos: { x: number; y: number } } | null>(null);
  const [landingSplashTile, setLandingSplashTile] = useState<Tile | null>(null);
  const [showChanceShuffle, setShowChanceShuffle] = useState<'chance' | 'community_chest' | null>(null);
  const [chanceShuffleText, setChanceShuffleText] = useState<{ title: string; body: string } | null>(null);
  const [rentBattleResult, setRentBattleResult] = useState(false);
  const [rentBattleCorrect, setRentBattleCorrect] = useState<boolean | null>(null);
  const [rentBattleSelected, setRentBattleSelected] = useState<string | null>(null);
  const [jailQResult, setJailQResult] = useState(false);
  const [jailQCorrect, setJailQCorrect] = useState<boolean | null>(null);
  const [jailQSelected, setJailQSelected] = useState<string | null>(null);
  const [bonusTime, setBonusTime] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hostVoiceURI, setHostVoiceURI] = useState<string>(() => localStorage.getItem('eduopoly_voiceURI') || '');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const [musicTrackId, setMusicTrackId] = useState<string>(() => localStorage.getItem('eduopoly_musicTrack') || MUSIC_TRACKS[0].id);
  const [musicVolume, setMusicVolumeState] = useState<number>(() => {
    const raw = localStorage.getItem('eduopoly_musicVolume');
    const v = raw ? Number(raw) : 0.22;
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.22;
  });

  // ── SOUND SETTINGS: one source of truth, persisted so a muted game STAYS muted ──
  const [musicMuted, setMusicMuted] = useState<boolean>(() => localStorage.getItem('eduopoly_musicMuted') === '1');
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => localStorage.getItem('eduopoly_sfxMuted') === '1');
  const [voiceMuted, setVoiceMuted] = useState<boolean>(() => localStorage.getItem('eduopoly_voiceMuted') === '1');
  const [audienceSounds, setAudienceSounds] = useState<boolean>(() => localStorage.getItem('eduopoly_audienceSounds') !== '0');
  const [fullscreen, setFullscreen] = useState(false);

  // Board zoom — 1 = the whole board fits on screen, up to 3 = very big squares
  // that you pan around. Bigger numbers than 1 are the only way to make the
  // squares larger than "everything visible" allows.
  const [boardZoom, setBoardZoom] = useState<number>(() => {
    const saved = Number(localStorage.getItem('eduopoly_boardZoom'));
    if (!Number.isFinite(saved) || saved < 1) return 1;
    return Math.min(MAX_BOARD_ZOOM, saved);
  });
  const setZoom = useCallback((v: number) => {
    const next = Math.min(MAX_BOARD_ZOOM, Math.max(1, Math.round(v * 100) / 100));
    setBoardZoom(next);
    try { localStorage.setItem('eduopoly_boardZoom', String(next)); } catch { /* ignore */ }
  }, []);

  /** zoom steps the whole board experience is built around */
  const ZOOM_STEPS = [1, 1.5, 2, 3];

  // Player emotion overlay
  const [emotionOverlay, setEmotionOverlay] = useState<{ emoji: string; playerId: string } | null>(null);

  // Achievement badges
  const [achievements, setAchievements] = useState<Record<string, string[]>>({});
  const grantAchievement = useCallback((playerId: string, badge: string) => {
    setAchievements(prev => {
      const existing = prev[playerId] || [];
      if (existing.includes(badge)) return prev;
      return { ...prev, [playerId]: [...existing, badge] };
    });
  }, []);

  // News ticker
  const [newsItems, setNewsItems] = useState<string[]>([
    '📰 Welcome to Tutorly Edupoly! The property market is OPEN!',
    '💡 Tip: Answer questions fast for speed bonus coins!',
    '🌍 Explore cultural hotspots as you play!',
  ]);

  // Commentator personality
  const [commentatorStyle, setCommentatorStyle] = useState<'british' | 'american' | 'australian'>('american');
  const commentatorPhrases: Record<string, Record<string, string[]>> = useMemo(() => ({
    british: {
      correct: ['Jolly good!', 'Splendid answer!', 'Quite right!', 'Brilliant, old chap!'],
      wrong: ['Hard luck, I\'m afraid.', 'Not quite, dear.', 'Better luck next time, eh?'],
      buy: ['A fine acquisition!', 'Marvellous investment!'],
      jail: ['Off to the clink, I\'m afraid!', 'Her Majesty\'s pleasure awaits!'],
    },
    american: {
      correct: ['Awesome!', 'Nailed it!', 'You\'re on fire!', 'Boom! That\'s right!'],
      wrong: ['Oh no!', 'So close!', 'Don\'t sweat it!', 'You\'ll get the next one!'],
      buy: ['Great deal!', 'Smart move, investor!'],
      jail: ['Busted! Straight to jail!', 'You\'re doing time!'],
    },
    australian: {
      correct: ['Ripper!', 'Good on ya!', 'Spot on, mate!', 'Bonzer answer!'],
      wrong: ['No worries, mate.', 'She\'ll be right next time.', 'Bit of bad luck there.'],
      buy: ['Beaut investment, mate!', 'You\'re a legend!'],
      jail: ['Strewth! Off to the slammer!', 'Crikey, you\'re nicked!'],
    },
  }), []);

  // Blow on dice ritual
  const [blowingDice, setBlowingDice] = useState(false);

  // Emotion helper
  const showEmotion = useCallback((emoji: string, playerId: string) => {
    setEmotionOverlay({ emoji, playerId });
    setTimeout(() => setEmotionOverlay(null), 1500);
  }, []);

  // News helper
  const addNews = useCallback((text: string) => {
    setNewsItems(prev => [...prev.slice(-8), text]);
  }, []);

  // Use commentator phrases
  const getCommentLine = useCallback((category: 'correct' | 'wrong' | 'buy' | 'jail') => {
    const lines = commentatorPhrases[commentatorStyle]?.[category];
    return lines ? pickRandom(lines) : '';
  }, [commentatorStyle, commentatorPhrases]);
  const { toasts, addToast } = useToasts();
  const { particles, spawnCoins, spawnConfetti, spawnFloatLabel } = useParticles();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const musicStarted = useRef(false);

  // Hover stability (prevents flicker)
  const hoverTimers = useRef<{ show: number | null; hide: number | null }>({ show: null, hide: null });

  const handleTileHover = useCallback((tile: Tile | null, pos: { x: number; y: number } | null) => {
    if (hoverTimers.current.show) window.clearTimeout(hoverTimers.current.show);
    if (hoverTimers.current.hide) window.clearTimeout(hoverTimers.current.hide);

    if (tile && pos) {
      hoverTimers.current.show = window.setTimeout(() => {
        setHoverTile({ tile, pos });
      }, 120);
    } else {
      hoverTimers.current.hide = window.setTimeout(() => {
        setHoverTile(null);
      }, 180);
    }
  }, []);

  /** keep the hover card open while the pointer is on it (tabs + links) */
  const keepHoverCardOpen = useCallback(() => {
    if (hoverTimers.current.hide) window.clearTimeout(hoverTimers.current.hide);
  }, []);
  const closeHoverCard = useCallback(() => {
    hoverTimers.current.hide = null;
    setHoverTile(null);
  }, []);

  // Modal gating (Chance + Landing)
  const chanceContinueResolver = useRef<null | (() => void)>(null);
  const landingContinueResolver = useRef<null | (() => void)>(null);

  const musicTrack = useMemo(
    () => MUSIC_TRACKS.find(t => t.id === musicTrackId) ?? MUSIC_TRACKS[0],
    [musicTrackId]
  );

  // ── Keep the audio engine in sync with the UI settings ──
  // Every mute switch is pushed into the engine AND saved, so the mute survives a
  // reload and no other code path can quietly restart playback.
  useEffect(() => {
    localStorage.setItem('eduopoly_musicTrack', musicTrackId);
    setMusicTrack(musicTrack.url);
  }, [musicTrackId, musicTrack.url]);

  useEffect(() => {
    localStorage.setItem('eduopoly_musicVolume', String(musicVolume));
    setMusicVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    localStorage.setItem('eduopoly_musicMuted', musicMuted ? '1' : '0');
    setEngineMusicMuted(musicMuted);
    if (musicMuted) stopBackgroundMusic();
  }, [musicMuted]);

  useEffect(() => {
    localStorage.setItem('eduopoly_sfxMuted', sfxMuted ? '1' : '0');
  }, [sfxMuted]);

  useEffect(() => {
    localStorage.setItem('eduopoly_voiceMuted', voiceMuted ? '1' : '0');
    setEngineVoiceMuted(voiceMuted);
  }, [voiceMuted]);

  useEffect(() => {
    localStorage.setItem('eduopoly_audienceSounds', audienceSounds ? '1' : '0');
  }, [audienceSounds]);

  /** Turning music back on must always produce sound — if the saved volume is 0
      the switch alone would look broken, so restore a sane default. */
  const toggleMusic = useCallback(() => {
    setMusicMuted(m => {
      const next = !m;
      if (!next && musicVolume <= 0) {
        setMusicVolumeState(0.25);
        setMusicVolume(0.25);
      }
      return next;
    });
  }, [musicVolume]);

  const voiceChoices = useMemo(() => {
    const score = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase();
      let s = 0;
      if (name.includes('natural')) s += 100;
      if (name.includes('online')) s += 40;
      if (v.lang.toLowerCase().startsWith('en')) s += 20;
      if (/(aria|jenny|guy|sonia|samantha|zira)/i.test(v.name)) s += 10;
      if (/david/i.test(v.name)) s -= 30;
      return s;
    };
    const list = [...voices].sort((a, b) => score(b) - score(a));

    // Keep the currently selected voice visible even if we slice
    const selected = list.find(v => v.voiceURI === hostVoiceURI);
    const top = list.slice(0, 28);
    if (selected && !top.some(v => v.voiceURI === selected.voiceURI)) top.unshift(selected);
    return top;
  }, [voices, hostVoiceURI]);

  // ── Load voices (prefer Natural / Online voices when available) ──
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() ?? [];
      setVoices(v);
      if (!v.length) return;

      // 1) Restore previously selected voice
      if (hostVoiceURI) {
        const restored = v.find(x => x.voiceURI === hostVoiceURI);
        if (restored) {
          setSelectedVoice(restored);
          return;
        }
      }

      // 2) Otherwise prefer Natural/Online voices (Edge / Windows)
      const preferred =
        v.find(x => /natural/i.test(x.name) && x.lang.toLowerCase().startsWith('en')) ||
        v.find(x => /online/i.test(x.name) && x.lang.toLowerCase().startsWith('en')) ||
        v.find(x => /(aria|jenny|guy|sonia)/i.test(x.name) && x.lang.toLowerCase().startsWith('en')) ||
        v.find(x => /(female|samantha|zira)/i.test(x.name) && x.lang.toLowerCase().startsWith('en')) ||
        v.find(x => x.lang === 'en-US') ||
        v.find(x => x.lang.toLowerCase().startsWith('en')) ||
        v[0];

      setSelectedVoice(preferred ?? null);
      if (preferred?.voiceURI) {
        setHostVoiceURI(preferred.voiceURI);
        localStorage.setItem('eduopoly_voiceURI', preferred.voiceURI);
      }
    };

    loadVoices();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, [hostVoiceURI, setVoices, setSelectedVoice, setHostVoiceURI]);

  // ── Apply dark mode to body ──
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // ── Fix stale zoom saved from previous versions (they were > 1 = cut off) ──
  useEffect(() => {
    const saved = Number(localStorage.getItem('eduopoly_boardZoom'));
    if (Number.isFinite(saved) && saved > 1) {
      localStorage.setItem('eduopoly_boardZoom', '1');
      setBoardZoom(1);
    }
  }, []);

  // ── Auto-save ──
  useEffect(() => {
    if (gs) {
      try { localStorage.setItem('eduopoly_state', JSON.stringify({ gs, darkMode })); } catch {}
    }
  }, [gs, darkMode]);

  // ── Load save (stays on the splash screen so the splash always shows first) ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eduopoly_state');
      if (saved) {
        const { gs: savedGs, darkMode: savedDark } = JSON.parse(saved);
        if (savedGs?.players?.length) {
          setGs(savedGs);
          setDarkMode(savedDark ?? false);
          setSavedGameExists(true);
          const savedTown = localStorage.getItem('eduopoly_town');
          if (savedTown) setPackTown(savedTown);
          const fromTiles = ((savedGs.tiles as Tile[] | undefined) ?? [])
            .map(t => t.question)
            .filter((q): q is Question => Boolean(q));
          setBankQuestions(fromTiles.length >= 8 ? fromTiles : SAMPLE_QUESTIONS);
        }
      }
    } catch {}
  }, []);

  // ── Question timer ──
  useEffect(() => {
    if (!gs || (gs.phase !== 'question' && !showJailModal && !showRentBattle)) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setQTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setQTimeLeft(t => {
        if (t <= 11 && t > 10) playTimerWarning(sfxMuted);
        if (t <= 6 && t > 5) speak('Five seconds!', hostVoiceURI || null, 1.1, 1.1, false);
        if (t <= 1) {
          clearInterval(timerRef.current!);
          playTimerExpire(sfxMuted);
          speak(getHostLine('timer'), hostVoiceURI || null);
          if (gs.phase === 'question') handleTimeOut();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gs?.phase, gs?.currentQuestion?.id, showJailModal, showRentBattle]);

  // ── Background music (real track): the ONLY place that starts it ──
  useEffect(() => {
    if (phase !== 'game' || musicMuted || musicVolume <= 0) {
      stopBackgroundMusic();
      return;
    }
    startBackgroundMusic(false, musicTrack.url);
    musicStarted.current = true;
  }, [phase, musicMuted, musicVolume, musicTrack.url]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && gs && !rolling && !moving && gs.phase === 'playing') {
        e.preventDefault();
        handleRollDice();
      }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 't' || e.key === 'T') setShowTeacherPanel(s => !s);
      if (gs?.phase === 'question' && gs.currentQuestion?.options) {
        const idx = ['1','2','3','4'].indexOf(e.key);
        if (idx >= 0 && gs.currentQuestion.options[idx] && !showQResult) {
          handleAnswer(gs.currentQuestion.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gs, rolling, moving, showQResult]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  // ── BOARD SIZE: measure the stage, subtract the chrome that shares it ──
  // The stage is an absolutely positioned box, so this measurement is definite and
  // nothing here depends on the board's own size (no feedback, no flicker).
  const [boardAvail, setBoardAvail] = useState(0);
  const [boardAvailH, setBoardAvailH] = useState(0);
  useEffect(() => {
    if (phase !== 'game') return;
    const stage = boardRef.current;
    const area = boardAreaRef.current;
    if (!stage || !area) return;
    const measure = () => {
      const sw = stage.clientWidth;
      const sh = stage.clientHeight;
      if (sw < 100 || sh < 100) return;
      let chrome = 0;
      Array.from(stage.children).forEach(c => {
        if (c === area) return;
        chrome += (c as HTMLElement).offsetHeight;
      });
      const gaps = Math.max(0, stage.children.length - 1) * 8;
      const w = Math.max(280, Math.floor(sw - 4));
      const h = Math.max(240, Math.floor(sh - chrome - gaps - 6));
      setBoardAvail(prev => (Math.abs(prev - w) < 3 ? prev : w));
      setBoardAvailH(prev => (Math.abs(prev - h) < 3 ? prev : h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    Array.from(stage.children).forEach(c => { if (c !== area) ro.observe(c); });
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [phase, gs?.phase, focusMode, showLeftPanel, showRightPanel]);

  // ── Update gs helper ──
  const updateGs = useCallback((updater: (prev: GameState) => GameState) => {
    setGs(prev => prev ? updater(prev) : prev);
  }, []);

  const addLog = useCallback((msg: string) => {
    updateGs(gs => ({ ...gs, log: [...gs.log.slice(-49), msg] }));
  }, [updateGs]);

  // ── START GAME (from the shared setup page: profiles + location + AI pack) ──
  const handleStart = useCallback((setup: ShellSetupResult) => {
    // 1. parse the JSON pack the teacher pasted (if any)
    let pack: ParsedPack | null = null;
    if (setup.json) {
      const parsed = parsePack(setup.json);
      if (parsed.ok) pack = parsed.pack;
      else addToast(`⚠️ Pack ignored: ${parsed.error}`, 'error', 6000);
    }

    // 2. players come from the setup form (the AI pack can only suggest avatars)
    const players: Player[] = setup.players.map((p, i) => {
      const suggestion = pack?.players[i];
      return {
        id: uid(),
        name: p.name || `Player ${i + 1}`,
        emoji: suggestion?.emoji || p.emoji,
        money: STARTING_MONEY,
        position: 0,
        jailTurns: 0,
        getOutOfJailCards: 0,
        color: suggestion?.color || p.color,
        isEliminated: false,
        propertiesOwned: [],
        consecutiveDoubles: 0,
        hasRolled: false,
      };
    });

    // 3. board + question bank
    const tiles = pack?.tiles?.length === 40 ? pack.tiles : DEFAULT_TILES;
    const bank = pack?.questions?.length ? pack.questions : SAMPLE_QUESTIONS;
    const town = pack?.town || setup.location || '';
    setBankQuestions(bank);
    setPackTown(town);
    try { localStorage.setItem('eduopoly_town', town); } catch { /* ignore */ }

    const initial = buildInitialState(players, tiles, {
      questions: bank,
      chanceCards: pack?.chanceCards,
      communityChest: pack?.communityChest,
    });

    if (pack) {
      initial.log = [
        `🎲 Game started in ${pack.town || setup.location || 'the city'}!`,
        `📦 AI pack loaded: ${pack.tiles.length} tiles, ${pack.questions.length} questions.`,
        ...(pack.culturalTips.slice(0, 6).map(t => `🌍 ${t}`)),
      ];
    } else {
      initial.log = ['🎲 Game started with the built-in board! Good luck everyone!'];
    }

    setGs(initial);
    setSavedGameExists(true);
    setPhase('game');
    setTimeout(() => {
      speak(getHostLine('welcome'), hostVoiceURI || null);
      addToast('🎮 Game started! Good luck!', 'gold', 4000);
    }, 500);
  }, [selectedVoice, addToast]);

  // ── NEXT TURN ──
  const advanceToNextPlayer = useCallback((state: GameState): GameState => {
    const activePlayers = state.players.filter(p => !p.isEliminated);
    if (activePlayers.length <= 1) return { ...state, phase: 'game_over' };
    let nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
    while (state.players[nextIdx].isEliminated) {
      nextIdx = (nextIdx + 1) % state.players.length;
    }
    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, hasRolled: false, consecutiveDoubles: 0 } : p
    );

    // Market tick: small random movement per turn
    const newMarket: GameState['market'] = {};
    for (const [idStr, entry] of Object.entries(state.market)) {
      const id = Number(idStr);
      // 35% chance to move
      const move = Math.random() < 0.35;
      if (!move) {
        newMarket[id] = { price: entry.price, deltaPct: 0 };
        continue;
      }
      const delta = (Math.random() * 0.14) - 0.06; // -6% .. +8%
      const nextPrice = Math.max(20, Math.round(entry.price * (1 + delta)));
      newMarket[id] = { price: nextPrice, deltaPct: Math.round(delta * 100) };
    }

    // Snapshot wealth history
    const newWH: Record<string, number[]> = {};
    for (const p of updatedPlayers) {
      const prev = state.wealthHistory[p.id] || [];
      newWH[p.id] = [...prev.slice(-19), p.money]; // keep last 20
    }

    return {
      ...state,
      market: newMarket,
      wealthHistory: newWH,
      players: updatedPlayers,
      currentPlayerIndex: nextIdx,
      phase: 'playing',
      currentQuestion: null,
      questionTileId: null,
      isDoubles: false,
      pendingRentTileId: null,
      rentAmount: 0,
      rentReduceQuestion: null,
      turnCount: state.turnCount + 1,
    };
  }, []);

  // ── MOVE PLAYER ──
  const movePlayer = useCallback(async (playerId: string, steps: number, state: GameState): Promise<GameState> => {
    const playerIdx = state.players.findIndex(p => p.id === playerId);
    if (playerIdx < 0) return state;
    const player = state.players[playerIdx];
    const oldPos = player.position;
    let newPos = (oldPos + steps) % 40;
    let money = player.money;
    const log = [...state.log];

    // Passed GO?
    if (newPos < oldPos || (oldPos + steps >= 40)) {
      money += GO_SALARY;
      log.push(`🟢 ${player.name} passed GO and collected ${formatMoney(GO_SALARY)}!`);
      addToast(`🟢 ${player.name} passed GO! +${formatMoney(GO_SALARY)}`, 'gold');
      speak(`${player.name} passed Go! Collect two hundred dollars!`, hostVoiceURI || null);
      playBuy(sfxMuted);
    }

    playMove(sfxMuted);
    const updatedPlayers = state.players.map((p, i) =>
      i === playerIdx ? { ...p, position: newPos, money } : p
    );
    return { ...state, players: updatedPlayers, log };
  }, [sfxMuted, selectedVoice, addToast]);

  // ── ROLL DICE ──
  const handleRollDice = useCallback(async () => {
    if (!gs || rolling || moving) return;
    if (gs.phase !== 'playing') return;
    const cp = gs.players[gs.currentPlayerIndex];
    if (cp.hasRolled && !gs.isDoubles) return;
    if (cp.isEliminated) return;

    // Jail check
    if (cp.jailTurns > 0) {
      setShowJailModal(true);
      return;
    }

    setRolling(true);
    playDiceRoll(sfxMuted);
    speak(getHostLine('dice'), hostVoiceURI || null);

    const d1 = rollDie(); const d2 = rollDie();
    const isDoubles = d1 === d2;
    const total = d1 + d2;

    updateGs(gs => ({ ...gs, diceValues: [d1, d2], isDoubles }));

    await new Promise(r => setTimeout(r, 700));
    setRolling(false);
    setMoving(true);

    // Triple doubles → jail
    if (isDoubles && cp.consecutiveDoubles >= 2) {
      const updatedPlayers = gs.players.map((p, i) =>
        i === gs.currentPlayerIndex ? { ...p, position: JAIL_POSITION, jailTurns: 1, consecutiveDoubles: 0, hasRolled: true } : p
      );
      updateGs(gs => ({ ...gs, players: updatedPlayers, phase: 'playing' }));
      setMoving(false);
      playJail(sfxMuted);
      speak(getHostLine('jail'), hostVoiceURI || null);
      addToast(`🚔 ${cp.name} rolled 3 doubles! Go to Jail!`, 'error');
      addLog(`⛓️ ${cp.name} got 3 doubles in a row → Jail!`);
      return;
    }

    // Move
    let newState = await movePlayer(cp.id, total, { ...gs, diceValues: [d1, d2], isDoubles });
    const newPos = newState.players[gs.currentPlayerIndex].position;
    const landedTile = gs.tiles[newPos];

    addLog(`🎲 ${cp.name} rolled ${d1}+${d2}=${total} → landed on ${landedTile.name}`);
    speak(`${cp.name} rolled ${d1} and ${d2}. Moved to ${landedTile.name}.`, hostVoiceURI || null);

    // Update doubled
    newState = {
      ...newState,
      players: newState.players.map((p, i) =>
        i === gs.currentPlayerIndex
          ? { ...p, consecutiveDoubles: isDoubles ? p.consecutiveDoubles + 1 : 0, hasRolled: true }
          : p
      ),
    };

    // ── Handle tile landing ──
    await handleTileLanding(newState, landedTile, total, isDoubles);
    setMoving(false);
  }, [gs, rolling, moving, sfxMuted, selectedVoice]);

  // ── TILE LANDING LOGIC ──
  const handleTileLanding = useCallback(async (state: GameState, tile: Tile, diceTotal: number, isDoubles: boolean) => {
    const cp = state.players[state.currentPlayerIndex];

    // Landing splash must be acknowledged before questions/timers
    if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
      setLandingSplashTile(tile);
      await new Promise<void>(resolve => {
        landingContinueResolver.current = resolve;
      });
    }

    // GO TO JAIL — dramatic!
    if (tile.type === 'go_to_jail') {
      const updPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, position: JAIL_POSITION, jailTurns: 1, consecutiveDoubles: 0 } : p
      );
      playJail(sfxMuted);
      speak(getCommentLine('jail') || getHostLine('jail'), hostVoiceURI || null);
      addToast(`🚔 ${cp.name} → Go to Jail!`, 'error');
      addLog(`🚔 ${cp.name} sent to Jail!`);
      showEmotion('😤', cp.id);
      addNews(`🚔 BREAKING: ${cp.name} has been sent to JAIL!`);

      // Wait to let player see their token move to jail
      await new Promise(r => setTimeout(r, 1200));

      // Single state update then advance
      const jailState: GameState = { ...state, players: updPlayers, phase: 'playing' };
      setGs(advanceToNextPlayer(jailState));
      return;
    }

    // TAX
    if (tile.type === 'tax') {
      const taxAmt = tile.id === 4 ? 200 : 100;
      const updPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, money: p.money - taxAmt } : p
      );
      setGs(() => advanceToNextPlayer({ ...state, players: updPlayers }));
      addToast(`💸 ${cp.name} paid ${formatMoney(taxAmt)} tax!`, 'warning');
      addLog(`💸 ${cp.name} paid ${formatMoney(taxAmt)} tax on ${tile.name}`);
      playPayRent(sfxMuted);
      return;
    }

    // CHANCE or COMMUNITY CHEST (shuffle + reveal result)
    if (tile.type === 'chance' || tile.type === 'community_chest') {
      const deck = tile.type === 'chance' ? state.chanceDeck : state.communityChestDeck;
      const q = deck[0] || bankQuestions.find(s => s.type === 'wild_card') || bankQuestions[0] || SAMPLE_QUESTIONS[0];
      const newDeck = [...deck.slice(1), q]; // rotate deck
      const deckUpdate = tile.type === 'chance' ? { chanceDeck: newDeck } : { communityChestDeck: newDeck };

      // Suspense shuffle animation
      setChanceShuffleText({
        title: tile.type === 'chance' ? 'CHANCE' : 'COMMUNITY CHEST',
        body: q.text,
      });
      setShowChanceShuffle(tile.type);
      speak(tile.type === 'chance' ? 'Chance. Shuffling cards.' : 'Community Chest. Shuffling cards.', hostVoiceURI || null);
      await new Promise<void>(resolve => {
        chanceContinueResolver.current = resolve;
      });

      if (q.type === 'wild_card') {
        // Instant wild effect
        const newState2 = await applyWildEffect(q.wildEffect!, { ...state, ...deckUpdate }, state.currentPlayerIndex);
        setGs(newState2);
        addToast(`🃏 ${q.text}`, 'gold', 3500);
        speak(q.text, hostVoiceURI || null);
        if (!isDoubles) setGs(prev => prev ? advanceToNextPlayer(prev) : prev);
      } else {
        setGs({ ...state, ...deckUpdate, phase: 'question', currentQuestion: q, questionTileId: tile.id });
        setSelectedAnswer(null); setShowQResult(false); setQIsCorrect(null);
        speak(`${tile.type === 'chance' ? 'Chance card!' : 'Community Chest!'} ${q.text}`, hostVoiceURI || null);
        addToast(`${tile.type === 'chance' ? '❓ Chance' : '💌 Community Chest'}: ${q.text.slice(0,50)}...`, 'info');
      }
      return;
    }

    // PROPERTY / RAILROAD / UTILITY
    if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
      const prop = state.properties[tile.id];
      if (!prop) { setGs(prev => prev ? advanceToNextPlayer(prev) : prev); return; }

      // Owned by current player? Nothing happens
      if (prop.ownerId === cp.id) {
        setGs(prev => prev ? advanceToNextPlayer(prev) : prev);
        addToast(`🏠 You own ${tile.name}!`, 'info', 2000);
        return;
      }

      // Owned by another player? Pay rent (with optional question to reduce)
      if (prop.ownerId && !prop.mortgaged) {
        const rent = getPropertyRent(tile, prop, state.properties, diceTotal);
        const reduceQ = shuffle(bankQuestions.filter(q => q.type === 'mcq' || q.type === 'true_false'))[0] ?? null;
        setGs({ ...state, phase: 'playing', pendingRentTileId: tile.id, rentAmount: rent, rentReduceQuestion: reduceQ });
        setShowRentBattle(true);
        setRentBattleResult(false); setRentBattleCorrect(null); setRentBattleSelected(null);
        speak(`You landed on ${tile.name}! Rent is ${rent} dollars. Answer a question to pay half!`, hostVoiceURI || null);
        return;
      }

      // Unowned – question to buy
      const q = tile.question || shuffle(bankQuestions.filter(q => !['wild_card','challenge','would_you_rather','truth_or_dare'].includes(q.type)))[0] || SAMPLE_QUESTIONS[0];
      setGs({ ...state, phase: 'question', currentQuestion: q, questionTileId: tile.id });
      setSelectedAnswer(null); setShowQResult(false); setQIsCorrect(null);
      speak(`You landed on ${tile.name}! Answer this question to buy it for ${tile.price} dollars!`, hostVoiceURI || null);
      addToast(`🏠 Land on ${tile.name}! Answer to buy!`, 'info');
      return;
    }

    // GO, JAIL (visiting), FREE PARKING
    if (tile.type === 'go') { setGs(prev => prev ? advanceToNextPlayer(prev) : prev); return; }
    if (tile.type === 'jail') {
      setGs(prev => prev ? advanceToNextPlayer(prev) : prev);
      addToast(`⛓️ Just visiting jail!`, 'info', 2000);
      return;
    }
    if (tile.type === 'free_parking') {
      setGs(prev => prev ? advanceToNextPlayer(prev) : prev);
      addToast(`🅿️ Free parking! Take a break!`, 'success', 2000);
      speak('Free parking! Nothing happens here.', hostVoiceURI || null);
      return;
    }

    setGs(prev => prev ? advanceToNextPlayer(prev) : prev);
  }, [sfxMuted, selectedVoice, advanceToNextPlayer, bankQuestions]);

  // ── WILD EFFECT ──
  const applyWildEffect = useCallback(async (effect: WildEffect, state: GameState, playerIdx: number): Promise<GameState> => {
    const player = state.players[playerIdx];
    let updPlayers = [...state.players];
    const logLines = [...state.log];

    switch (effect) {
      case 'advance_to_go': {
        updPlayers = updPlayers.map((p, i) =>
          i === playerIdx ? { ...p, position: 0, money: p.money + GO_SALARY } : p);
        logLines.push(`🟢 ${player.name} advanced to GO! +${formatMoney(GO_SALARY)}`);
        playBuy(sfxMuted);
        addToast(`🟢 Advance to GO! Collect ${formatMoney(GO_SALARY)}!`, 'gold');
        break;
      }
      case 'collect_100': {
        updPlayers = updPlayers.map((p, i) => i === playerIdx ? { ...p, money: p.money + 100 } : p);
        logLines.push(`💰 ${player.name} collected $100!`);
        addToast('💰 Collect $100!', 'gold');
        playCorrect(sfxMuted);
        break;
      }
      case 'collect_200': {
        updPlayers = updPlayers.map((p, i) => i === playerIdx ? { ...p, money: p.money + 200 } : p);
        logLines.push(`💰 ${player.name} collected $200!`);
        addToast('💰 Collect $200!', 'gold');
        playCorrect(sfxMuted);
        break;
      }
      case 'go_back_3': {
        const newPos = (player.position - 3 + 40) % 40;
        updPlayers = updPlayers.map((p, i) => i === playerIdx ? { ...p, position: newPos } : p);
        logLines.push(`⏪ ${player.name} went back 3 spaces.`);
        addToast('⏪ Go back 3 spaces!', 'warning');
        break;
      }
      case 'go_to_jail': {
        updPlayers = updPlayers.map((p, i) => i === playerIdx ? { ...p, position: JAIL_POSITION, jailTurns: 1, consecutiveDoubles: 0 } : p);
        logLines.push(`🚔 ${player.name} sent to Jail!`);
        addToast('🚔 Go directly to Jail!', 'error');
        playJail(sfxMuted);
        break;
      }
      case 'pay_50': {
        updPlayers = updPlayers.map((p, i) => i === playerIdx ? { ...p, money: Math.max(0, p.money - 50) } : p);
        logLines.push(`💸 ${player.name} paid $50.`);
        addToast('💸 Pay $50!', 'warning');
        playPayRent(sfxMuted);
        break;
      }
      case 'pay_100': {
        updPlayers = updPlayers.map((p, i) => i === playerIdx ? { ...p, money: Math.max(0, p.money - 100) } : p);
        logLines.push(`💸 ${player.name} paid $100.`);
        addToast('💸 Pay $100!', 'warning');
        playPayRent(sfxMuted);
        break;
      }
      case 'get_out_of_jail': {
        updPlayers = updPlayers.map((p, i) => i === playerIdx ? { ...p, getOutOfJailCards: p.getOutOfJailCards + 1 } : p);
        logLines.push(`🔑 ${player.name} got a Get Out of Jail Free card!`);
        addToast('🔑 Get Out of Jail Free!', 'success');
        break;
      }
      case 'extra_turn': {
        logLines.push(`⏭️ ${player.name} gets an extra turn!`);
        addToast('⏭️ Extra turn!', 'gold');
        return { ...state, players: updPlayers, log: logLines, isDoubles: true };
      }
      case 'lose_turn': {
        logLines.push(`😴 ${player.name} loses a turn.`);
        addToast('😴 Lose a turn!', 'warning');
        return advanceToNextPlayer({ ...state, players: updPlayers, log: logLines });
      }
      default: break;
    }
    return { ...state, players: updPlayers, log: logLines };
  }, [sfxMuted, advanceToNextPlayer, addToast]);

  // ── ANSWER QUESTION ──
  const handleAnswer = useCallback((answer: string) => {
    if (!gs || !gs.currentQuestion || showQResult) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const q = gs.currentQuestion;
    void gs.players[gs.currentPlayerIndex]; // current player reference (used below in speak)
    let correct = false;

    if (q.type === 'wild_card') {
      correct = true;
    } else if (q.type === 'challenge' || q.type === 'truth_or_dare') {
      correct = answer === 'correct';
    } else if (q.type === 'would_you_rather') {
      correct = true; // always correct – just need explanation
    } else if (q.type === 'fill_gap') {
      correct = answer.toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
    } else if (q.type === 'sentence_scramble' || q.type === 'ordering') {
      const userAns = answer.toLowerCase().replace(/\s+/g, ' ').trim();
      const corrAns = String(q.correctAnswer).toLowerCase().replace(/\s+/g, ' ').trim();
      correct = userAns === corrAns;
    } else if (q.type === 'matching') {
      correct = true; // handled by matching component fully
    } else {
      correct = answer === String(q.correctAnswer);
    }

    const bonus = correct ? qTimeLeft : 0;
    setBonusTime(bonus);
    setSelectedAnswer(answer);
    setShowQResult(true);
    setQIsCorrect(correct);

    if (correct) {
      playCorrect(sfxMuted);
      if (audienceSounds) playCheer(sfxMuted);
      speak(getCommentLine('correct') || getHostLine('correct'), hostVoiceURI || null);
      addToast(`🎉 Correct! +${formatMoney(bonus)} speed bonus!`, 'success');
      showEmotion('🤑', gs.players[gs.currentPlayerIndex].id);
      addNews(`⚡ ${gs.players[gs.currentPlayerIndex].name} answered correctly! +${formatMoney(bonus)} bonus!`);

      // Achievement: Speed Demon
      if (bonus >= 25) grantAchievement(gs.players[gs.currentPlayerIndex].id, '⚡ Speed Demon');
    } else {
      playWrong(sfxMuted);
      if (audienceSounds) playGroan(sfxMuted);
      speak(getCommentLine('wrong') || getHostLine('wrong'), hostVoiceURI || null);
      addToast(`❌ ${q.explanation ? `Answer: ${q.correctAnswer}` : 'Not quite!'}`, 'error');
      showEmotion('😱', gs.players[gs.currentPlayerIndex].id);
    }

    // Spawn particles
    if (correct) {
      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) {
        spawnCoins(window.innerWidth / 2, window.innerHeight / 2, 8);
        if (bonus > 15) spawnConfetti(window.innerWidth / 2, window.innerHeight / 2);
        spawnFloatLabel(`+${formatMoney(bonus)}`, window.innerWidth/2, window.innerHeight/2 - 60, '#f5b042');
      }
    }

    // Schedule resolution
    setTimeout(() => resolveQuestion(correct, bonus, answer), 2000);
  }, [gs, showQResult, qTimeLeft, sfxMuted, audienceSounds, selectedVoice, spawnCoins, spawnConfetti, spawnFloatLabel]);

  const handleTimeOut = useCallback(() => {
    if (!gs || !gs.currentQuestion) return;
    setSelectedAnswer('__timeout__');
    setShowQResult(true);
    setQIsCorrect(false);
    playWrong(sfxMuted);
    speak('Time is up!', hostVoiceURI || null);
    addToast('⏰ Time\'s up!', 'error');
    setTimeout(() => resolveQuestion(false, 0, '__timeout__'), 2000);
  }, [gs, sfxMuted, selectedVoice]);

  const resolveQuestion = useCallback((correct: boolean, bonus: number, _answer: string) => {
    setGs(prev => {
      if (!prev) return prev;
      const tile = prev.questionTileId !== null ? prev.tiles[prev.questionTileId] : null;
      const prop = tile ? prev.properties[tile.id] : null;
      let state = { ...prev };

      if (correct) {
        // Add bonus money
        const updPlayers = state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, money: p.money + bonus } : p
        );
        state = { ...state, players: updPlayers };

        // Property question: buy at list price
        if (tile && prop && !prop.ownerId && tile.price && (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) {
          const cp2 = state.players[state.currentPlayerIndex];
          if (cp2.money >= tile.price) {
            // Auto-buy
            const newProps = { ...state.properties, [tile.id]: { ...prop, ownerId: cp2.id } };
            const newPlayers = state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, money: p.money - tile.price!, propertiesOwned: [...p.propertiesOwned, tile.id] } : p
            );
            state = { ...state, properties: newProps, players: newPlayers };
            addLog(`🏠 ${cp2.name} bought ${tile.name} for ${formatMoney(tile.price!)}!`);
            playBuy(sfxMuted);
            speak(getHostLine('buy'), hostVoiceURI || null);
            addToast(`🏠 ${cp2.name} bought ${tile.name}!`, 'gold');
          }
        }
      } else {
        // Wrong: property goes to auction
        if (tile && prop && !prop.ownerId && (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) {
          state = { ...state, phase: 'auction', auctionTileId: tile.id, auctionBids: {} };
          setShowAuction(true);
          speak('Wrong answer! The property goes to auction!', hostVoiceURI || null);
          return state;
        }
      }

      setShowQResult(false);
      setQIsCorrect(null);
      setSelectedAnswer(null);
      setBonusTime(0);

      if (state.isDoubles && correct) return { ...state, phase: 'playing', currentQuestion: null, questionTileId: null };
      return advanceToNextPlayer({ ...state, currentQuestion: null, questionTileId: null });
    });
  }, [sfxMuted, selectedVoice, advanceToNextPlayer, addLog, addToast]);

  // ── SKIP QUESTION ──
  const handleSkip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowQResult(false); setQIsCorrect(null); setSelectedAnswer(null); setBonusTime(0);
    setGs(prev => prev ? advanceToNextPlayer({ ...prev, currentQuestion: null, questionTileId: null }) : prev);
  }, [advanceToNextPlayer]);

  // ── BUY PROPERTY ──
  const handleBuyProperty = useCallback((tile: Tile) => {
    setGs(prev => {
      if (!prev) return prev;
      const cp = prev.players[prev.currentPlayerIndex];
      const prop = prev.properties[tile.id];
      const buyPrice = prev.market[tile.id]?.price ?? tile.price ?? 0;
      if (!prop || prop.ownerId || buyPrice <= 0 || cp.money < buyPrice) return prev;
      const newProps = { ...prev.properties, [tile.id]: { ...prop, ownerId: cp.id } };
      const newPlayers = prev.players.map((p, i) =>
        i === prev.currentPlayerIndex ? { ...p, money: p.money - buyPrice, propertiesOwned: [...p.propertiesOwned, tile.id] } : p
      );
      addLog(`🏠 ${cp.name} bought ${tile.name} for ${formatMoney(buyPrice)} (market)!`);
      playBuy(sfxMuted);
      speak(getCommentLine('buy') || getHostLine('buy'), hostVoiceURI || null);
      addToast(`🏠 Bought ${tile.name}!`, 'gold');
      showEmotion('🤑', cp.id);
      addNews(`🏠 ${cp.name} acquired ${tile.name} for ${formatMoney(buyPrice)}!`);

      // Achievement: First Purchase
      if (cp.propertiesOwned.length === 0) grantAchievement(cp.id, '🏠 First Purchase');
      // Achievement: Monopolist (owns a full color group)
      const group = Object.values(COLOR_GROUPS).find(g => g.includes(tile.id));
      if (group) {
        const allOwned = group.every(id => {
          const pr = (id === tile.id) ? { ownerId: cp.id } : prev.properties[id];
          return pr?.ownerId === cp.id;
        });
        if (allOwned) grantAchievement(cp.id, '👑 Monopolist');
      }

      return advanceToNextPlayer({ ...prev, properties: newProps, players: newPlayers });
    });
    setShowPropertyModal(null);
  }, [sfxMuted, selectedVoice, advanceToNextPlayer, addLog, addToast, showEmotion, addNews, grantAchievement, getCommentLine]);

  // ── AUCTION ──
  const handleAuctionBid = useCallback((playerId: string, amount: number) => {
    updateGs(gs => ({ ...gs, auctionBids: { ...gs.auctionBids, [playerId]: amount } }));
  }, [updateGs]);

  const handleAuctionFinish = useCallback(() => {
    setGs(prev => {
      if (!prev || prev.auctionTileId === null) return prev;
      const tile = prev.tiles[prev.auctionTileId];
      const prop = prev.properties[prev.auctionTileId];
      if (!tile || !prop) return prev;
      const bids = prev.auctionBids;
      const highest = Math.max(0, ...Object.values(bids));
      const winnerId = Object.entries(bids).find(([, v]) => v === highest)?.[0];
      if (!winnerId || highest === 0) {
        addToast('No valid bids – property stays unowned.', 'info');
        return advanceToNextPlayer({ ...prev, phase: 'playing', auctionTileId: null, auctionBids: {}, currentQuestion: null });
      }
      const winner = prev.players.find(p => p.id === winnerId);
      if (!winner || winner.money < highest) {
        addToast('Winner cannot afford their bid!', 'error');
        return advanceToNextPlayer({ ...prev, phase: 'playing', auctionTileId: null, auctionBids: {}, currentQuestion: null });
      }
      const newProps = { ...prev.properties, [tile.id]: { ...prop, ownerId: winnerId } };
      const newPlayers = prev.players.map(p =>
        p.id === winnerId ? { ...p, money: p.money - highest, propertiesOwned: [...p.propertiesOwned, tile.id] } : p
      );
      addLog(`🔨 ${winner.name} won auction for ${tile.name} at ${formatMoney(highest)}!`);
      playBuy(sfxMuted);
      addToast(`🔨 ${winner.name} won ${tile.name} for ${formatMoney(highest)}!`, 'gold');
      return advanceToNextPlayer({ ...prev, properties: newProps, players: newPlayers, auctionTileId: null, auctionBids: {}, phase: 'playing', currentQuestion: null });
    });
    setShowAuction(false);
    setShowQResult(false); setQIsCorrect(null); setSelectedAnswer(null);
  }, [sfxMuted, advanceToNextPlayer, addLog, addToast]);

  // ── RENT BATTLE ──
  const handleRentAnswer = useCallback((answer: string) => {
    if (!gs || rentBattleResult) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const q = gs.rentReduceQuestion;
    if (!q) { handlePayFullRent(); return; }

    let correct = false;
    if (q.type === 'fill_gap') correct = answer.toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
    else correct = answer === String(q.correctAnswer);

    setRentBattleSelected(answer);
    setRentBattleResult(true);
    setRentBattleCorrect(correct);

    const rent = gs.rentAmount;
    const toPay = correct ? Math.floor(rent / 2) : rent;
    const tile = gs.pendingRentTileId !== null ? gs.tiles[gs.pendingRentTileId] : null;
    const ownerId = tile ? gs.properties[tile.id]?.ownerId : null;

    setGs(prev => {
      if (!prev) return prev;
      const cp = prev.players[prev.currentPlayerIndex];
      const actualPay = Math.min(cp.money, toPay);
      let updPlayers = prev.players.map((p, i) => {
        if (i === prev.currentPlayerIndex) return { ...p, money: p.money - actualPay };
        if (ownerId && p.id === ownerId) return { ...p, money: p.money + actualPay };
        return p;
      });
      // Bankruptcy check
      const newCp = updPlayers[prev.currentPlayerIndex];
      if (newCp.money <= 0) {
        addToast(`💀 ${cp.name} is bankrupt!`, 'error');
        addLog(`💀 ${cp.name} went bankrupt!`);
        // Transfer properties to rent owner
        if (ownerId) {
          const newProps = { ...prev.properties };
          cp.propertiesOwned.forEach(id => {
            newProps[id] = { ...newProps[id], ownerId };
          });
          updPlayers = updPlayers.map(p => {
            if (p.id === ownerId) return { ...p, propertiesOwned: [...p.propertiesOwned, ...cp.propertiesOwned] };
            if (p.id === cp.id) return { ...p, isEliminated: true, propertiesOwned: [] };
            return p;
          });
          return advanceToNextPlayer({ ...prev, players: updPlayers, properties: newProps, pendingRentTileId: null, rentAmount: 0, rentReduceQuestion: null });
        }
        updPlayers = updPlayers.map(p => p.id === cp.id ? { ...p, isEliminated: true } : p);
      }
      addLog(`💸 ${cp.name} paid ${formatMoney(actualPay)} rent on ${tile?.name ?? 'property'}${correct ? ' (50% off!)' : ''}`);
      playPayRent(sfxMuted);
      if (correct) { playCorrect(sfxMuted); addToast(`🎉 Correct! Rent halved → paid ${formatMoney(toPay)}!`, 'success'); }
      else { addToast(`💸 Paid full rent: ${formatMoney(toPay)}`, 'warning'); }
      return { ...prev, players: updPlayers, pendingRentTileId: null, rentAmount: 0, rentReduceQuestion: null };
    });

    setTimeout(() => {
      setShowRentBattle(false);
      setRentBattleResult(false); setRentBattleCorrect(null); setRentBattleSelected(null);
      setGs(prev => prev ? advanceToNextPlayer(prev) : prev);
    }, 2000);
  }, [gs, rentBattleResult, sfxMuted, advanceToNextPlayer, addLog, addToast]);

  const handlePayFullRent = useCallback(() => {
    if (!gs) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const rent = gs.rentAmount;
    const tile = gs.pendingRentTileId !== null ? gs.tiles[gs.pendingRentTileId] : null;
    const ownerId = tile ? gs.properties[tile.id]?.ownerId : null;
    setGs(prev => {
      if (!prev) return prev;
      const cp = prev.players[prev.currentPlayerIndex];
      const actualPay = Math.min(cp.money, rent);
      const updPlayers = prev.players.map((p, i) => {
        if (i === prev.currentPlayerIndex) return { ...p, money: p.money - actualPay };
        if (ownerId && p.id === ownerId) return { ...p, money: p.money + actualPay };
        return p;
      });
      addLog(`💸 ${cp.name} paid ${formatMoney(actualPay)} rent`);
      playPayRent(sfxMuted);
      return { ...prev, players: updPlayers, pendingRentTileId: null, rentAmount: 0, rentReduceQuestion: null };
    });
    setShowRentBattle(false);
    setRentBattleResult(false); setRentBattleCorrect(null); setRentBattleSelected(null);
    setGs(prev => prev ? advanceToNextPlayer(prev) : prev);
  }, [gs, sfxMuted, advanceToNextPlayer, addLog]);

  // ── JAIL ACTIONS ──
  const handleJailPayFine = useCallback(() => {
    setGs(prev => {
      if (!prev) return prev;
      const cp = prev.players[prev.currentPlayerIndex];
      const updPlayers = prev.players.map((p, i) =>
        i === prev.currentPlayerIndex ? { ...p, money: p.money - 50, jailTurns: 0 } : p
      );
      addLog(`💰 ${cp.name} paid $50 to get out of jail.`);
      addToast('💰 Paid $50 fine – free!', 'success');
      return { ...prev, players: updPlayers };
    });
    setShowJailModal(false);
    setJailQResult(false); setJailQCorrect(null); setJailQSelected(null);
  }, [addLog, addToast]);

  const handleJailUseCard = useCallback(() => {
    setGs(prev => {
      if (!prev) return prev;
      const cp = prev.players[prev.currentPlayerIndex];
      if (cp.getOutOfJailCards <= 0) return prev;
      const updPlayers = prev.players.map((p, i) =>
        i === prev.currentPlayerIndex ? { ...p, jailTurns: 0, getOutOfJailCards: p.getOutOfJailCards - 1 } : p
      );
      addLog(`🔑 ${cp.name} used Get Out of Jail Free card!`);
      addToast('🔑 Used Get Out of Jail Free card!', 'success');
      return { ...prev, players: updPlayers };
    });
    setShowJailModal(false);
    setJailQResult(false); setJailQCorrect(null); setJailQSelected(null);
  }, [addLog, addToast]);

  const handleJailAnswer = useCallback((answer: string) => {
    if (jailQResult || !gs) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const q = shuffle(bankQuestions.filter(q => q.type === 'mcq' || q.type === 'true_false'))[0];
    const correct = answer === String(q?.correctAnswer);
    setJailQSelected(answer);
    setJailQResult(true);
    setJailQCorrect(correct);
    if (correct) {
      playCorrect(sfxMuted);
      speak('Correct! You\'re free!', hostVoiceURI || null);
      addToast('🎉 Correct! Out of jail!', 'success');
      setGs(prev => {
        if (!prev) return prev;
        const cp = prev.players[prev.currentPlayerIndex];
        const updPlayers = prev.players.map((p, i) =>
          i === prev.currentPlayerIndex ? { ...p, jailTurns: 0 } : p
        );
        addLog(`🎉 ${cp.name} answered correctly and got out of jail!`);
        return { ...prev, players: updPlayers };
      });
    } else {
      playWrong(sfxMuted);
      speak('Wrong answer! Stay in jail.', hostVoiceURI || null);
      addToast('❌ Wrong – stay in jail!', 'error');
      setGs(prev => {
        if (!prev) return prev;
        const cp = prev.players[prev.currentPlayerIndex];
        const updPlayers = prev.players.map((p, i) =>
          i === prev.currentPlayerIndex ? { ...p, jailTurns: Math.min(p.jailTurns + 1, 3) } : p
        );
        if (updPlayers[prev.currentPlayerIndex].jailTurns >= 3) {
          addToast('🚔 3 turns in jail – must pay $50!', 'warning');
        }
        addLog(`❌ ${cp.name} failed jail question (turn ${cp.jailTurns+1})`);
        return { ...prev, players: updPlayers };
      });
    }
    setTimeout(() => {
      setShowJailModal(false);
      setJailQResult(false); setJailQCorrect(null); setJailQSelected(null);
      setGs(prev => prev ? advanceToNextPlayer(prev) : prev);
    }, 2000);
  }, [gs, jailQResult, sfxMuted, selectedVoice, advanceToNextPlayer, addLog, addToast, bankQuestions]);

  const handleJailSkip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowJailModal(false);
    setJailQResult(false); setJailQCorrect(null); setJailQSelected(null);
    setGs(prev => {
      if (!prev) return prev;
      const cp = prev.players[prev.currentPlayerIndex];
      const newTurns = cp.jailTurns + 1;
      let updPlayers = prev.players.map((p, i) =>
        i === prev.currentPlayerIndex ? { ...p, jailTurns: newTurns } : p
      );
      addLog(`😴 ${cp.name} stays in jail (turn ${newTurns}/3).`);
      if (newTurns >= 3) {
        // Force pay $50 and release
        updPlayers = updPlayers.map((p, i) =>
          i === prev.currentPlayerIndex ? { ...p, jailTurns: 0, money: Math.max(0, p.money - 50) } : p
        );
        addLog(`💰 ${cp.name} forced to pay $50 after 3 jail turns.`);
        addToast('💰 3 turns done – paid $50 fine.', 'warning');
      }
      return advanceToNextPlayer({ ...prev, players: updPlayers });
    });
  }, [advanceToNextPlayer, addLog, addToast]);

  // ── TRADE ──
  const handleTradeSubmit = useCallback((trade: TradeOffer) => {
    setGs(prev => {
      if (!prev) return prev;
      const fromPlayer = prev.players.find(p => p.id === trade.fromPlayerId);
      const toPlayer = prev.players.find(p => p.id === trade.toPlayerId);
      if (!fromPlayer || !toPlayer) return prev;
      // Transfer properties
      const newProps = { ...prev.properties };
      trade.offeredProperties.forEach(id => { newProps[id] = { ...newProps[id], ownerId: trade.toPlayerId }; });
      trade.requestedProperties.forEach(id => { newProps[id] = { ...newProps[id], ownerId: trade.fromPlayerId }; });
      // Transfer money
      const newPlayers = prev.players.map(p => {
        if (p.id === trade.fromPlayerId) {
          const newOwned = [...p.propertiesOwned.filter(id => !trade.offeredProperties.includes(id)), ...trade.requestedProperties];
          return { ...p, money: p.money - trade.offeredMoney + trade.requestedMoney, propertiesOwned: newOwned };
        }
        if (p.id === trade.toPlayerId) {
          const newOwned = [...p.propertiesOwned.filter(id => !trade.requestedProperties.includes(id)), ...trade.offeredProperties];
          return { ...p, money: p.money - trade.requestedMoney + trade.offeredMoney, propertiesOwned: newOwned };
        }
        return p;
      });
      addLog(`🤝 Trade: ${fromPlayer.name} ↔ ${toPlayer.name}`);
      addToast(`🤝 Trade completed!`, 'success');
      playBuy(sfxMuted);
      return { ...prev, properties: newProps, players: newPlayers };
    });
    setShowTrade(false);
  }, [sfxMuted, addLog, addToast]);

  // ── GIVE/TAKE MONEY (teacher) ──
  const handleGiveMoney = useCallback((playerId: string) => {
    setGs(prev => {
      if (!prev) return prev;
      const updPlayers = prev.players.map(p => p.id === playerId ? { ...p, money: p.money + 50 } : p);
      return { ...prev, players: updPlayers };
    });
    addToast('+$50 given (teacher)', 'success', 1500);
  }, [addToast]);

  const handleTakeMoney = useCallback((playerId: string) => {
    setGs(prev => {
      if (!prev) return prev;
      const updPlayers = prev.players.map(p => p.id === playerId ? { ...p, money: Math.max(0, p.money - 50) } : p);
      return { ...prev, players: updPlayers };
    });
    addToast('-$50 taken (teacher)', 'warning', 1500);
  }, [addToast]);

  // ── IMPORT JSON (from the teacher panel, mid-game) ──
  const handleImportJSON = useCallback((json: string) => {
    const parsed = parsePack(json);
    if (!parsed.ok) {
      addToast(`❌ ${parsed.error}`, 'error', 6000);
      return;
    }
    const { pack } = parsed;
    const bank = pack.questions.length ? pack.questions : bankQuestions;
    setBankQuestions(bank);
    if (pack.town) {
      setPackTown(pack.town);
      try { localStorage.setItem('eduopoly_town', pack.town); } catch { /* ignore */ }
    }
    updateGs(prev => {
      const properties = { ...prev.properties };
      const market = { ...prev.market };
      pack.tiles.forEach(t => {
        if (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') {
          if (!properties[t.id]) properties[t.id] = { tileId: t.id, ownerId: null, houses: 0, mortgaged: false };
          if (typeof t.price === 'number') market[t.id] = market[t.id] ?? { price: t.price, deltaPct: 0 };
        }
      });
      return {
        ...prev,
        tiles: pack.tiles,
        properties,
        market,
        chanceDeck: pack.chanceCards.length ? shuffle(pack.chanceCards) : getQuestionsForDeck('chance', bank),
        communityChestDeck: pack.communityChest.length ? shuffle(pack.communityChest) : getQuestionsForDeck('community', bank),
        log: [...prev.log.slice(-49), `📦 New AI pack loaded${pack.town ? ` for ${pack.town}` : ''}: ${pack.tiles.length} tiles.`],
      };
    });
    addToast(`✅ Imported ${pack.tiles.length} tiles${pack.town ? ` for ${pack.town}` : ''}!`, 'success', 5000);
    if (pack.culturalTips.length) addNews(`🌍 ${pack.culturalTips[0]}`);
  }, [updateGs, addToast, addNews, bankQuestions]);

  // ── HOST SPEECH TRIGGER ──
  const handleHostLineSpeech = useCallback((category: string) => {
    speak(getHostLine(category), hostVoiceURI || null);
  }, [hostVoiceURI]);

  // ── TILE CLICK ──
  const handleTileClick = useCallback((tile: Tile) => {
    if (!gs) return;
    const prop = gs.properties[tile.id];
    if (prop) setShowPropertyModal(tile);
  }, [gs]);

  // ── CURRENT PLAYER DATA ──
  const cp = gs?.players[gs.currentPlayerIndex];
  // doubles earn a second roll, so the button has to stay live for them
  const canRoll = gs?.phase === 'playing' && !rolling && !moving && cp && !cp.isEliminated && (!cp.hasRolled || gs.isDoubles);
  const jailQ = useMemo(() => shuffle(bankQuestions.filter(q => q.type === 'mcq' || q.type === 'true_false'))[0] ?? null, [showJailModal, bankQuestions]);

  // ── GAME OVER CHECK ──
  useEffect(() => {
    if (!gs) return;
    const active = gs.players.filter(p => !p.isEliminated);
    if (active.length === 1 && gs.players.length > 1) {
      updateGs(gs => ({ ...gs, phase: 'game_over' }));
      playWin(sfxMuted);
      speak(`${active[0].name} wins! Congratulations!`, hostVoiceURI || null);
      addToast(`🏆 ${active[0].name} wins!`, 'gold', 8000);
    }
  }, [gs?.players]);

  // ─── RENDER: the shared splash → setup → game procedure ──────────────────
  const shellSetup = (
    <PlayerSetup
      darkMode={darkMode}
      onToggleDark={() => setDarkMode(d => !d)}
      config={{
        gameTitle: 'Tutorly Edupoly',
        gameEmoji: '🎓',
        accent: '#f5b042',
        playersHeading: 'Players & learner profiles',
        playersHelp: 'Names, avatars and a few facts about each learner — the AI personalises the board and questions with them.',
        locationLabel: '🏙️ CITY / NEIGHBOURHOOD *',
        locationPlaceholder: 'e.g. Shibuya, Tokyo',
        locationHelp: 'The board is built from real streets, stations and local culture in this city — so the location is required for a personalised pack.',
        topics: ['General English', 'Business English', 'Travel English', 'Academic English', 'Medical English', 'Tech English', 'Hospitality', 'Legal English'],
        levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        playerColors: PLAYER_COLORS,
        avatars: DEFAULT_EMOJIS,
        maxPlayers: 6,
        buildPrompt: buildMonopolyPrompt,
        validateJson: validatePackJson,
        jsonPlaceholder: 'Paste the JSON your AI returned here — it starts with { "town": … }',
        onStart: handleStart,
        onBack: () => setPhase('splash'),
      }}
    />
  );

  if (phase === 'splash') {
    return (
      <SplashScreen
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onPlay={() => setPhase('setup')}
        hasSavedGame={savedGameExists}
        onContinue={() => setPhase('game')}
        config={{
          gameTitle: 'Tutorly Edupoly',
          gameEmoji: '🎓',
          tagline: 'The 3D language-learning Monopoly — buy the city, answer questions, speak to win.',
          accent: '#f5b042',
          features: [
            { icon: '🏙️', label: 'Real-city board' },
            { icon: '🎯', label: '10+ question types' },
            { icon: '🤖', label: 'AI content packs' },
            { icon: '🎧', label: 'Voice host' },
            { icon: '💰', label: 'Rent battles' },
            { icon: '📈', label: 'Live market' },
          ],
          howToPlay: [
            'Set up the players: name, avatar and a few facts about each learner.',
            'Type the city or neighbourhood you want the board built from.',
            'Press “Copy AI Prompt”, paste it into ChatGPT or Claude, then copy the JSON it writes back.',
            'Paste that JSON into the setup page, press “Load Pack”, then “Start Game”.',
            'Roll the dice (Space), answer the question to buy the property, and beat your rivals to the top of the leaderboard.',
          ],
        }}
      />
    );
  }
  if (phase === 'setup' || !gs) {
    return shellSetup;
  }
  if (gs.phase === 'game_over') {
    return <GameOverScreen players={gs.players} onRestart={() => { localStorage.removeItem('eduopoly_state'); setGs(null); setSavedGameExists(false); setPhase('setup'); }} darkMode={darkMode} />;
  }

  const bg = darkMode ? '#0f172a' : '#f5f5f0';
  const text = darkMode ? '#f1f5f9' : '#1e2a3a';
  const cardBg = darkMode ? '#1e293b' : '#fff';
  const border = darkMode ? '#334155' : '#e2e8f0';

  const allSoundOff = musicMuted && sfxMuted && voiceMuted;
  const toggleAllSound = () => {
    const mute = !allSoundOff;
    // unmuting must actually produce sound, even if the volume was left at 0
    if (!mute && musicVolume <= 0) {
      setMusicVolumeState(0.25);
      setMusicVolume(0.25);
    }
    setMusicMuted(mute);
    setSfxMuted(mute);
    setVoiceMuted(mute);
  };

  /** Zoom presets — the one control that decides how big the squares are. */
  const zoomControl = (
    <div style={{ display:'flex', alignItems:'center', gap:4, background: darkMode?'rgba(255,255,255,0.06)':'rgba(15,23,42,0.05)', borderRadius:11, padding:4 }}>
      <span style={{ fontSize:'0.78rem', fontWeight:900, padding:'0 4px', color: darkMode?'#94a3b8':'#64748b' }}>🔍</span>
      {ZOOM_STEPS.map(s => (
        <button
          key={s}
          className={boardZoom === s ? 'btn-gold btn-press' : 'btn-navy btn-press'}
          style={{ padding:'6px 10px', borderRadius:9, fontSize:'0.78rem', fontWeight:950 }}
          onClick={() => setZoom(s)}
          title={s === 1 ? 'Fit — the whole board on screen' : `Zoom ${s}× — every square ${s}× bigger, then drag to move the board`}
        >
          {s === 1 ? 'Fit' : `${s}×`}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ height:'100vh', overflow:'hidden', position:'relative', background: darkMode ? '#070d18' : bg, fontFamily:"'Montserrat','Inter',sans-serif", color:text }}>
      {/* ── PAGE BACKDROP: a photo of the board's city sits behind everything ── */}
      <img
        src={backdropPhotoUrl(gs.tiles, packTown, 1)}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        style={{ position:'fixed', inset:0, width:'100vw', height:'100vh', objectFit:'cover', zIndex:0, pointerEvents:'none', opacity: darkMode ? 0.4 : 0.55, filter:'blur(10px) saturate(1.05)' }}
      />
      {/* ── PARTICLES ── */}
      {particles.map(p => p.char ? (
        p.char.length <= 2 ? (
          <div key={p.id} className="coin-particle" style={{ left:p.x, top:p.y }}>{p.char}</div>
        ) : (
          <div key={p.id} className="float-label" style={{ left:p.x, top:p.y, color:p.color??'#f5b042' }}>{p.char}</div>
        )
      ) : (
        <div key={p.id} className="confetti-particle" style={{ left:p.x, top:p.y, background:p.color, borderRadius:Math.random()>0.5?'50%':'2px', transform:`rotate(${Math.random()*360}deg)` }} />
      ))}

      {/* ── TOAST NOTIFICATIONS ── */}
      <div style={{ position:'fixed', top: focusMode ? 58 : 66, right:14, zIndex:9998, display:'flex', flexDirection:'column', gap:8, maxWidth:330 }}>
        {toasts.map(toast => {
          const colors: Record<Toast['type'], string> = {
            success: '#5cb85c', error: '#d9534f', info: '#3498db', warning: '#f5b042', gold: '#f5b042'
          };
          const icons: Record<Toast['type'], string> = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️', gold:'🏆' };
          return (
            <div key={toast.id} className="toast-enter glass-card" style={{ padding:'10px 14px', borderRadius:10, borderLeft:`3px solid ${colors[toast.type]}`, display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:'1rem', flexShrink:0 }}>{icons[toast.type]}</span>
              <span style={{ fontSize:'0.85rem', fontWeight:700, color:text, lineHeight:1.3 }}>{toast.message}</span>
            </div>
          );
        })}
      </div>

      {/* ── TOP HUD: one slim floating bar, everything else slides over the board ── */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:30, display: focusMode ? 'none' : 'flex', alignItems:'center', gap:8, padding:'6px 10px', minHeight:52, flexWrap:'nowrap', background: darkMode?'rgba(11,18,32,0.8)':'rgba(255,255,255,0.88)', backdropFilter:'blur(14px)', borderBottom:`1px solid ${border}`, boxShadow:'0 2px 14px rgba(0,0,0,0.12)' }}>
        {/* Brand */}
        <div style={{ fontWeight:900, fontSize:'1rem', color: darkMode?'#f1f5f9':'#1e2a3a', letterSpacing:'-0.01em', whiteSpace:'nowrap', flexShrink:0 }}>
          🎓 <span style={{ color:'#f5b042' }}>Tutorly</span>
          <span style={{ fontWeight:700, fontSize:'0.78rem', color: darkMode?'#94a3b8':'#64748b', marginLeft:6 }}>Edupoly</span>
        </div>
        {/* Turn indicator */}
        {cp && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background: darkMode?'rgba(245,176,66,0.12)':'rgba(245,176,66,0.14)', border:'1px solid rgba(245,176,66,0.35)', borderRadius:99, padding:'4px 12px', flexShrink:0 }}>
            <Emoji char={cp.emoji} size={22} />
            <span style={{ fontWeight:800, fontSize:'0.9rem', color:'#b8791a', whiteSpace:'nowrap' }}>{cp.name}'s turn</span>
            {gs.isDoubles && <span style={{ fontSize:'0.7rem', fontWeight:800, color:'#2d8a30', background:'rgba(92,184,92,0.18)', borderRadius:99, padding:'1px 7px' }}>DOUBLES</span>}
          </div>
        )}
        {/* Dice display */}
        <div style={{ display:'flex', gap:5, alignItems:'center', flexShrink:0 }}>
          <DiceFace value={gs.diceValues[0]} rolling={rolling} size={36} />
          <DiceFace value={gs.diceValues[1]} rolling={rolling} size={36} />
          <span style={{ display:'flex', alignItems:'center', fontWeight:900, fontSize:'1.05rem', color:'#b8791a', marginLeft:2 }}>
            ={gs.diceValues[0]+gs.diceValues[1]}
          </span>
        </div>
        {/* One-tap master sound switch (music + SFX + host voice together) */}
        <button
          className="btn-navy btn-press"
          style={{ padding:'6px 11px', borderRadius:8, fontSize:'0.9rem', flexShrink:0 }}
          onClick={toggleAllSound}
          title={allSoundOff ? 'Turn all sound back on' : 'Mute everything (music, effects and voice)'}
        >
          {allSoundOff ? '🔇' : '🔊'}
        </button>
        {/* Board size — right where the eyes are */}
        {!focusMode && zoomControl}
        {/* News ticker scrolls through the dead space of the top bar */}
        <div style={{ flex:1, minWidth:60, overflow:'hidden', borderRadius:8, padding:'4px 0', background: darkMode?'rgba(255,255,255,0.05)':'rgba(254,252,232,0.9)', border:`1px solid ${darkMode?'#334155':'#fde047'}` }}>
          <div style={{ display:'flex', gap:60, whiteSpace:'nowrap', fontSize:'0.78rem', fontWeight:700, color: darkMode?'#fde68a':'#854d0e', animation:'tickerScroll 30s linear infinite' }}>
            {[...newsItems, ...newsItems].map((n, i) => <span key={i}>{n}</span>)}
          </div>
        </div>
        {/* Controls */}
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'nowrap', position:'relative', flexShrink:0 }}>
          {/* side panels + focus mode */}
          <button className="btn-navy btn-press" style={{ padding:'6px 12px', borderRadius:8, fontSize:'0.78rem' }}
            onClick={() => setShowLeftPanel(s => !s)} title="Players, log and controls">🏆 Players</button>
          <button className="btn-navy btn-press" style={{ padding:'6px 12px', borderRadius:8, fontSize:'0.78rem' }}
            onClick={() => setShowRightPanel(s => !s)} title="Properties, turn order and stats">🏠 Property</button>
          <button className="btn-navy btn-press" style={{ padding:'6px 10px', borderRadius:8, fontSize:'0.78rem' }}
            onClick={() => setShowControls(s => !s)} title="Music, voice and sound settings">⚙️</button>
          <button className="btn-navy btn-press" style={{ padding:'6px 10px', borderRadius:8, fontSize:'0.78rem' }}
            onClick={() => { setFocusMode(f => !f); setShowLeftPanel(false); setShowRightPanel(false); }} title="Focus mode — whole page becomes the board">🗖</button>

          {showControls && (
            <div
              onClick={e => e.stopPropagation()}
              style={{ position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:32, width:'min(94vw, 660px)', padding:'14px 16px', borderRadius:18, background: darkMode?'rgba(15,23,42,0.98)':'rgba(255,255,255,0.99)', border:`1px solid ${border}`, boxShadow:'0 18px 44px rgba(0,0,0,0.28)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 18px', textAlign:'left', maxHeight:'70vh', overflowY:'auto' }}
            >
              {/* ── SOUND: one switch per sound source, all persisted ── */}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                <div style={panelTitle}>🔊 SOUND</div>
                <SoundToggle label="🎵 Background music" on={!musicMuted} onClick={toggleMusic} darkMode={darkMode} />
                <SoundToggle label="🔔 Sound effects" on={!sfxMuted} onClick={() => setSfxMuted(v => !v)} darkMode={darkMode} />
                <SoundToggle label="🎙️ Host voice" on={!voiceMuted} onClick={() => setVoiceMuted(v => !v)} darkMode={darkMode} />
                <SoundToggle label="👥 Crowd / audience" on={audienceSounds} onClick={() => setAudienceSounds(v => !v)} darkMode={darkMode} />
              </div>

              {/* ── MUSIC + VOICE ── */}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                <div style={panelTitle}>🎼 MUSIC & VOICE</div>
                <select
                  value={musicTrackId}
                  onChange={e => setMusicTrackId(e.target.value)}
                  title="Music track"
                  style={{ padding:'8px 10px', borderRadius:10, border:`1px solid ${border}`, background: darkMode ? '#0f172a' : '#fff', color: text, fontWeight: 800, fontSize:'0.8rem', width:'100%' }}
                >
                  {MUSIC_TRACKS.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:'0.85rem' }}>🔉</span>
                  <input
                    type="range" min={0} max={1} step={0.01} value={musicVolume}
                    onChange={e => setMusicVolumeState(Number(e.target.value))}
                    style={{ flex:1 }} title="Music volume"
                  />
                  <span style={{ fontSize:'0.76rem', fontWeight:900, color: darkMode?'#94a3b8':'#64748b', width:34, textAlign:'right' }}>{Math.round(musicVolume*100)}%</span>
                </div>
                <select
                  value={hostVoiceURI}
                  onChange={e => {
                    const uri = e.target.value;
                    setHostVoiceURI(uri);
                    localStorage.setItem('eduopoly_voiceURI', uri);
                    const v = voices.find(x => x.voiceURI === uri) || null;
                    setSelectedVoice(v);
                  }}
                  title="Host voice"
                  style={{ padding:'8px 10px', borderRadius:10, border:`1px solid ${border}`, background: darkMode ? '#0f172a' : '#fff', color: text, fontWeight: 800, fontSize:'0.8rem', width:'100%' }}
                >
                  {voiceChoices.length === 0 && <option value="">(No voices)</option>}
                  {voiceChoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} — {v.lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── BOARD SIZE ── */}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                <div style={panelTitle}>🔍 BOARD SIZE</div>
                {zoomControl}
                <div style={{ fontSize:'0.72rem', fontWeight:700, color: darkMode?'#94a3b8':'#64748b', lineHeight:1.4 }}>
                  <b>Fit</b> keeps the whole board on screen · <b>2×</b> makes every square twice as big (drag the board to move around it, Ctrl+scroll to zoom, and the game auto-follows the token).
                </div>
              </div>

              {/* ── TABLE ── */}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                <div style={panelTitle}>🎲 TABLE</div>
                <button className="btn-navy btn-press"
                  style={{ padding:'8px 12px', borderRadius:10, fontSize:'0.8rem', opacity: blowingDice ? 0.5 : 1 }}
                  disabled={blowingDice}
                  onClick={() => { setBlowingDice(true); speak('Blowing on dice for good luck!', hostVoiceURI || null); setTimeout(() => setBlowingDice(false), 1500); }}>
                  {blowingDice ? '💨 Blowing...' : '🎲💨 Blow on dice'}
                </button>
                <select value={commentatorStyle} onChange={e => setCommentatorStyle(e.target.value as 'british'|'american'|'australian')}
                  title="Commentator style"
                  style={{ padding:'8px 10px', borderRadius:10, border:`1px solid ${border}`, background: darkMode?'#0f172a':'#fff', color: text, fontWeight:800, fontSize:'0.8rem', width:'100%' }}>
                  <option value="british">🎩 British commentator</option>
                  <option value="american">🇺🇸 American commentator</option>
                  <option value="australian">🦘 Australian commentator</option>
                </select>
                <SoundToggle label={darkMode ? '☀️ Light theme' : '🌙 Dark theme'} on={darkMode} onClick={() => setDarkMode(d => !d)} darkMode={darkMode} />
              </div>
            </div>
          )}

          <button className="btn-navy btn-press" style={{ padding:'6px 10px', borderRadius:8, fontSize:'0.75rem' }}
            onClick={toggleFullscreen}>{fullscreen ? '🔲' : '⛶'}</button>
          <button className="btn-navy btn-press" style={{ padding:'6px 14px', borderRadius:8, fontSize:'0.8rem' }}
            onClick={() => setShowTrade(true)}>🤝 Trade</button>
          <button className="btn-gold btn-press" style={{ padding:'6px 14px', borderRadius:8, fontSize:'0.8rem' }}
            onClick={() => setShowTeacherPanel(true)}>🎓 Teacher</button>
        </div>
      </div>

      {/* exit focus mode */}
      {focusMode && (
        <button className="btn-gold btn-press"
          style={{ position:'fixed', top:10, right:12, zIndex:60, padding:'8px 14px', borderRadius:99, fontSize:'0.8rem' }}
          onClick={() => setFocusMode(false)}>
          🗗 Exit focus
        </button>
      )}

      {/* ── LEFT DRAWER: leaderboard, log, controls (slides over the board) ── */}
      <div style={{ position:'absolute', top: focusMode ? 12 : 60, bottom:14, left:10, width:'min(330px, 86vw)', zIndex:45, display:'flex', flexDirection:'column', gap:10, overflowY:'auto', padding:'12px 14px', borderRadius:18, background: darkMode?'rgba(15,23,42,0.97)':'rgba(255,255,255,0.98)', border:`1px solid ${border}`, boxShadow:'0 24px 60px rgba(0,0,0,0.32)', transform: showLeftPanel ? 'translateX(0)' : 'translateX(-118%)', transition:'transform .28s ease' }}>
        {/* ── LEFT: LEADERBOARD ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:800, fontSize:'0.8rem', color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.12em' }}>🏆 PLAYERS & GAME LOG</div>
          <button className="btn-navy btn-press" style={{ padding:'4px 9px', borderRadius:8, fontSize:'0.75rem' }} onClick={() => setShowLeftPanel(false)}>✕</button>
        </div>
          {[...gs.players].sort((a, b) => b.money - a.money).map((p, _rank) => (
            <PlayerCard key={p.id} player={p}
              isActive={p.id === cp?.id}
              properties={gs.properties}
              tiles={gs.tiles}
              darkMode={darkMode}
              onGiveMoney={() => handleGiveMoney(p.id)}
              onTakeMoney={() => handleTakeMoney(p.id)}
              badges={achievements[p.id]}
            />
          ))}
          {/* Game log */}
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:12, padding:'10px 12px', marginTop:4, flex:1 }}>
            <div style={{ fontWeight:800, fontSize:'0.7rem', color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:6 }}>📋 GAME LOG</div>
            <div className="scrollable" style={{ maxHeight:180, display:'flex', flexDirection:'column', gap:3 }}>
              {gs.log.slice(-15).reverse().map((entry, i) => (
                <div key={i} style={{ fontSize:'0.68rem', color: darkMode?'#94a3b8':'#475569', lineHeight:1.3, padding:'2px 0', borderBottom:`1px solid ${darkMode?'#1e2d40':'#f8fafc'}` }}>
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BOARD STAGE: the whole page is the board, everything else floats ── */}
        <div ref={boardRef} style={{ position:'absolute', top: focusMode ? 6 : 52, bottom: 6, left: 8, right: 8, zIndex:10, overflow:'hidden', minHeight: 0, minWidth: 0 }}>
          {/* Board viewport — clips the board, which is pan/zoomed inside it */}
          <div
            ref={boardAreaRef}
            style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', borderRadius: 16 }}
          >
            <GameBoard
              gs={gs}
              onTileClick={handleTileClick}
              onTileHover={handleTileHover}
              achievements={achievements}
              zoom={boardZoom}
              town={packTown}
              avail={boardAvail}
              availH={boardAvailH}
              onZoomChange={setZoom}
              centerActions={
                <>
                  {gs.phase === 'playing' && (
                    <>
                      <button
                        className="btn-gold btn-press glow-pulse"
                        style={{ padding:'13px 30px', borderRadius:14, fontSize:'1.2rem', fontWeight:950, minWidth:220, opacity: canRoll ? 1 : 0.5, boxShadow:'0 12px 30px rgba(245,176,66,0.42)' }}
                        onClick={handleRollDice}
                        disabled={!canRoll || rolling || moving}
                      >
                        {rolling ? '🎲 Rolling...' : moving ? '🎲 Moving...' : '🎲 Roll Dice (Space)'}
                      </button>
                      {cp && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:99, background: darkMode?'rgba(255,255,255,0.08)':'rgba(15,23,42,0.05)', whiteSpace:'nowrap' }}>
                          <span style={{ fontSize:'1.35rem' }}>{cp.emoji}</span>
                          <span style={{ fontSize:'0.88rem', fontWeight:900, color:text }}>{formatMoney(cp.money)}</span>
                          <span style={{ fontSize:'0.78rem', fontWeight:800, color: darkMode?'#94a3b8':'#64748b' }}>💼 {cp.propertiesOwned.length}</span>
                        </div>
                      )}
                      {gs.isDoubles && cp && !cp.hasRolled && (
                        <div style={{ background:'rgba(92,184,92,0.15)', border:'1px solid #5cb85c', borderRadius:10, padding:'8px 14px', fontSize:'0.85rem', fontWeight:800, color:'#2d8a30' }}>
                          🎉 Doubles! Roll again!
                        </div>
                      )}
                      {cp && cp.jailTurns > 0 && (
                        <button className="btn-red btn-press" style={{ padding:'12px 16px', borderRadius:12, fontSize:'0.9rem', fontWeight:900 }}
                          onClick={() => setShowJailModal(true)}>
                          ⛓️ Jail Options
                        </button>
                      )}
                      <button className="btn-navy btn-press" style={{ padding:'12px 16px', borderRadius:12, fontSize:'0.9rem', fontWeight:900 }}
                        onClick={() => setShowTrade(true)}>
                        🤝 Trade
                      </button>
                    </>
                  )}
                </>
              }
            />

            {/* When the board is bigger than the screen, say so — and offer the way back */}
            {boardZoom > 1 && (
              <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', zIndex:12, display:'flex', alignItems:'center', gap:10, padding:'6px 12px', borderRadius:99, background: darkMode?'rgba(15,23,42,0.88)':'rgba(255,255,255,0.94)', border:`1px solid ${border}`, boxShadow:'0 10px 26px rgba(0,0,0,0.22)', fontSize:'0.78rem', fontWeight:800, color: darkMode?'#cbd5e1':'#475569', whiteSpace:'nowrap' }}>
                ✋ Drag the board to move around · Ctrl+scroll to zoom · squares {boardZoom}× bigger
                <button className="btn-gold btn-press" style={{ padding:'4px 11px', borderRadius:99, fontSize:'0.76rem', fontWeight:900 }} onClick={() => setZoom(1)}>
                  ⤢ Fit
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT DRAWER: properties, turn order, stats ── */}
        <div style={{ position:'absolute', top: focusMode ? 12 : 60, bottom:14, right:10, width:'min(330px, 86vw)', zIndex:45, display: showRightPanel ? 'flex' : 'none', flexDirection:'column', gap:10, overflowY:'auto', padding:'12px 14px', borderRadius:18, background: darkMode?'rgba(15,23,42,0.97)':'rgba(255,255,255,0.98)', border:`1px solid ${border}`, boxShadow:'0 24px 60px rgba(0,0,0,0.32)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontWeight:800, fontSize:'0.8rem', color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.12em' }}>🏠 PROPERTIES & STATS</div>
            <button className="btn-navy btn-press" style={{ padding:'4px 9px', borderRadius:8, fontSize:'0.75rem' }} onClick={() => setShowRightPanel(false)}>✕</button>
          </div>
          {/* Color groups */}
          {Object.entries(COLOR_GROUPS).map(([color, tileIds]) => {
            const groupTiles = tileIds.map(id => gs.tiles[id]).filter(Boolean);
            const anyOwned = groupTiles.some(t => gs.properties[t.id]?.ownerId);
            if (!anyOwned) return null;
            return (
              <div key={color} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:10, padding:'8px 10px', overflow:'hidden' }}>
                <div style={{ height:4, background:COLOR_HEX[color]??'#888', borderRadius:2, marginBottom:6 }} />
                {groupTiles.map(tile => {
                  const prop = gs.properties[tile.id];
                  if (!prop?.ownerId) return null;
                  const owner = gs.players.find(p => p.id === prop.ownerId);
                  return (
                    <div key={tile.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:'0.75rem' }}>{owner?.emoji}</span>
                      <span style={{ flex:1, fontSize:'0.65rem', fontWeight:700, color:text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tile.name}</span>
                      {prop.houses > 0 && (
                        <div style={{ display:'flex', gap:1 }}>
                          {Array.from({length:Math.min(prop.houses,5)}).map((_,i) => (
                            <div key={i} style={{ width:5, height:8, background:prop.houses>=5?'#d9534f':'#5cb85c', borderRadius:1 }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Turn order */}
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:10, padding:'10px 12px', marginTop:4 }}>
            <div style={{ fontWeight:800, fontSize:'0.7rem', color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:8 }}>🔄 TURN ORDER</div>
            {gs.players.filter(p => !p.isEliminated).map((p, _i) => {
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0', opacity: p.isEliminated ? 0.4 : 1 }}>
                  <span style={{ fontSize:'0.9rem' }}>{p.emoji}</span>
                  <span style={{ flex:1, fontSize:'0.75rem', fontWeight:700, color: p.id===cp?.id?'#f5b042':text }}>{p.name}</span>
                  <span style={{ fontSize:'0.7rem', color: darkMode?'#64748b':'#94a3b8', fontWeight:600 }}>{formatMoney(p.money)}</span>
                </div>
              );
            })}
          </div>

          {/* Quick stats */}
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontWeight:800, fontSize:'0.7rem', color: darkMode?'#64748b':'#94a3b8', letterSpacing:'0.1em', marginBottom:8 }}>📊 STATS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {[
                { label:'Turn', val: gs.turnCount },
                { label:'Phase', val: gs.phase.replace('_',' ') },
                { label:'Unowned', val: Object.values(gs.properties).filter(p => !p.ownerId).length },
                { label:'Players', val: `${gs.players.filter(p=>!p.isEliminated).length}/${gs.players.length}` },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center', padding:'6px', background: darkMode?'#0f172a':'#f8fafc', borderRadius:7 }}>
                  <div style={{ fontSize:'1rem', fontWeight:900, color:'#f5b042' }}>{s.val}</div>
                  <div style={{ fontSize:'0.6rem', color: darkMode?'#64748b':'#94a3b8', fontWeight:700, letterSpacing:'0.05em' }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* ── MODALS ── */}

      {/* Question modal — big, centred, and the board stays visible behind it */}
      {gs.phase === 'question' && gs.currentQuestion && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="glass-card question-card-enter"
            style={{
              width:'min(940px, 96vw)', maxHeight:'94vh', overflowY:'auto', borderRadius:20,
              padding:'20px 24px', background: darkMode ? '#1e293b' : '#ffffff',
              boxShadow:'0 30px 80px rgba(0,0,0,0.45)',
            }}
          >
            {gs.questionTileId !== null && gs.tiles[gs.questionTileId] && (
              <div style={{ fontSize:'0.75rem', fontWeight:900, letterSpacing:'0.14em', color:'#f5b042', marginBottom:8 }}>
                📍 {gs.tiles[gs.questionTileId].name.toUpperCase()}
              </div>
            )}
            <QuestionCard
              question={gs.currentQuestion}
              timeLeft={qTimeLeft}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
              selectedAnswer={selectedAnswer}
              showResult={showQResult}
              isCorrect={qIsCorrect}
              darkMode={darkMode}
              bonusTime={bonusTime}
            />
          </div>
        </div>
      )}

      {/* Property detail modal */}
      {showPropertyModal && (
        <PropertyModal
          tile={showPropertyModal}
          property={gs.properties[showPropertyModal.id] ?? { tileId: showPropertyModal.id, ownerId: null, houses: 0, mortgaged: false }}
          players={gs.players}
          currentPlayer={gs.players[gs.currentPlayerIndex]}
          onBuy={() => handleBuyProperty(showPropertyModal)}
          onAuction={() => { setGs(prev => prev ? { ...prev, phase:'auction', auctionTileId: showPropertyModal.id, auctionBids:{} } : prev); setShowAuction(true); setShowPropertyModal(null); }}
          onClose={() => setShowPropertyModal(null)}
          darkMode={darkMode}
          canBuy={gs.players[gs.currentPlayerIndex]?.position === showPropertyModal.id}
          town={packTown}
        />
      )}

      {/* Auction modal */}
      {showAuction && gs.auctionTileId !== null && (
        <AuctionModal
          tile={gs.tiles[gs.auctionTileId]}
          players={gs.players}
          bids={gs.auctionBids}
          onBid={handleAuctionBid}
          onFinish={handleAuctionFinish}
          darkMode={darkMode}
        />
      )}

      {/* Trade modal */}
      {showTrade && (
        <TradeModal gs={gs} onSubmit={handleTradeSubmit} onClose={() => setShowTrade(false)} />
      )}

      {/* Teacher panel */}
      {showTeacherPanel && (
        <TeacherPanel
          gs={gs}
          onClose={() => setShowTeacherPanel(false)}
          onImportJSON={handleImportJSON}
          onVoiceChange={v => setSelectedVoice(v)}
          onHostLineSpeech={handleHostLineSpeech}
          darkMode={darkMode}
          hostVoiceURI={hostVoiceURI}
          sound={{ music: !musicMuted, sfx: !sfxMuted, voice: !voiceMuted, audience: audienceSounds }}
          onToggleSound={key => {
            if (key === 'music') toggleMusic();
            else if (key === 'sfx') setSfxMuted(v => !v);
            else if (key === 'voice') setVoiceMuted(v => !v);
            else setAudienceSounds(v => !v);
          }}
        />
      )}

      {/* Jail modal */}
      {showJailModal && cp && (
        <JailModal
          player={cp}
          question={jailQ}
          timeLeft={qTimeLeft}
          onPayFine={handleJailPayFine}
          onUseCard={handleJailUseCard}
          onAnswerQuestion={handleJailAnswer}
          onSkip={handleJailSkip}
          showResult={jailQResult}
          isCorrect={jailQCorrect}
          selectedAnswer={jailQSelected}
          darkMode={darkMode}
        />
      )}

      {/* Rent battle modal */}
      {showRentBattle && gs.pendingRentTileId !== null && (
        <RentBattleModal
          tile={gs.tiles[gs.pendingRentTileId]}
          rentAmount={gs.rentAmount}
          question={gs.rentReduceQuestion}
          onAnswer={handleRentAnswer}
          onPayFull={handlePayFullRent}
          timeLeft={qTimeLeft}
          showResult={rentBattleResult}
          isCorrect={rentBattleCorrect}
          selectedAnswer={rentBattleSelected}
          darkMode={darkMode}
        />
      )}

      {/* Listening play button on question phase */}
      {gs.phase === 'question' && gs.currentQuestion?.type === 'listening' && !showQResult && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:40 }}>
          <button className="btn-navy btn-press" style={{ borderRadius:'50%', width:56, height:56, fontSize:'1.3rem', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}
            onClick={() => speak(gs.currentQuestion!.audioText ?? gs.currentQuestion!.text, hostVoiceURI || null, 0.85, 1.0)}
            title="Play audio">
            🎧
          </button>
        </div>
      )}

      {/* Hover culture card */}
      {hoverTile && (
        <CultureHoverCard
          tile={hoverTile.tile}
          property={gs.properties[hoverTile.tile.id]}
          darkMode={darkMode}
          position={hoverTile.pos}
          town={packTown}
          onPointerEnter={keepHoverCardOpen}
          onPointerLeave={closeHoverCard}
        />
      )}

      {/* Landing splash screen */}
      {landingSplashTile && cp && (
        <LandingSplash
          tile={landingSplashTile}
          player={cp}
          property={gs.properties[landingSplashTile.id]}
          darkMode={darkMode}
          onContinue={() => {
            setLandingSplashTile(null);
            const r = landingContinueResolver.current;
            landingContinueResolver.current = null;
            r?.();
          }}
        />
      )}

      {/* Chance card shuffle animation */}
      {showChanceShuffle && (
        <ChanceCardShuffle
          type={showChanceShuffle}
          result={chanceShuffleText}
          onComplete={() => {
            setShowChanceShuffle(null);
            setChanceShuffleText(null);
            const r = chanceContinueResolver.current;
            chanceContinueResolver.current = null;
            r?.();
          }}
        />
      )}

      {/* Emotion overlay */}
      {emotionOverlay && (
        <div className="emotion-overlay" key={emotionOverlay.playerId + Date.now()}>
          {emotionOverlay.emoji}
        </div>
      )}
    </div>
  );
}
