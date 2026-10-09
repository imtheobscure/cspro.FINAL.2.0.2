import type { Tile } from './types';

/* ═══════════════════════════════════════════════════════════════════════════
   BOARD ICONS — the non-property squares.
   ---------------------------------------------------------------------------
   Special squares (GO, Jail, Community Chest, Chance, taxes, parking, stations,
   utilities) carry a real icon instead of an emoji. The SVGs are the Material
   Design Icons set, downloaded from jsDelivr and kept in `assets/icons/`, so the
   game ships with them instead of pulling an icon font at runtime.
   Every icon is coloured to match the square it sits on and exported as an
   inline data URL, which keeps the production build a single self-contained file.
   ═══════════════════════════════════════════════════════════════════════════ */

import flagCheckered from './assets/icons/flag-checkered.svg?raw';
import bankRaw from './assets/icons/bank.svg?raw';
import treasureChest from './assets/icons/treasure-chest.svg?raw';
import cardsPlaying from './assets/icons/cards-playing-outline.svg?raw';
import handcuffs from './assets/icons/handcuffs.svg?raw';
import policeBadge from './assets/icons/police-badge-outline.svg?raw';
import parking from './assets/icons/parking.svg?raw';
import cashMinus from './assets/icons/cash-minus.svg?raw';
import diamondStone from './assets/icons/diamond-stone.svg?raw';
import train from './assets/icons/train.svg?raw';
import lightningBolt from './assets/icons/lightning-bolt.svg?raw';
import waterPump from './assets/icons/water-pump.svg?raw';
import homeCity from './assets/icons/home-city.svg?raw';
import officeBuilding from './assets/icons/office-building.svg?raw';

export type BoardIconKey =
  | 'go' | 'bank' | 'chest' | 'chance' | 'jail' | 'go_to_jail' | 'parking'
  | 'income_tax' | 'luxury_tax' | 'railroad' | 'electric' | 'water' | 'property' | 'office';

const RAW: Record<BoardIconKey, string> = {
  go: flagCheckered,
  bank: bankRaw,
  chest: treasureChest,
  chance: cardsPlaying,
  jail: handcuffs,
  go_to_jail: policeBadge,
  parking,
  income_tax: cashMinus,
  luxury_tax: diamondStone,
  railroad: train,
  electric: lightningBolt,
  water: waterPump,
  property: homeCity,
  office: officeBuilding,
};

/** The accent colour each kind of square paints its icon with. */
export const ICON_COLOR: Record<BoardIconKey, string> = {
  go: '#15803d',
  bank: '#1d4ed8',
  chest: '#7c3aed',
  chance: '#b45309',
  jail: '#334155',
  go_to_jail: '#b91c1c',
  parking: '#0284c7',
  income_tax: '#b91c1c',
  luxury_tax: '#a21caf',
  railroad: '#1e293b',
  electric: '#d97706',
  water: '#0ea5e9',
  property: '#166534',
  office: '#334155',
};

const cache = new Map<string, string>();

/** Inline the downloaded SVG as a data URL with our own fill colour. */
function asDataUrl(key: BoardIconKey, color: string): string {
  const cacheKey = `${key}:${color}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const coloured = RAW[key].replace('<svg ', `<svg fill="${color}" `).replace(/\s+/g, ' ');
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(coloured)}`;
  cache.set(cacheKey, url);
  return url;
}

/** Which icon a square shows. Properties are the ONLY squares with no icon —
    they show the real street photo instead. */
export function iconKeyForTile(tile: Tile): BoardIconKey | null {
  switch (tile.type) {
    case 'go': return 'go';
    case 'community_chest': return 'chest';
    case 'chance': return 'chance';
    case 'jail': return 'jail';
    case 'go_to_jail': return 'go_to_jail';
    case 'free_parking': return 'parking';
    case 'tax': return /luxury/i.test(tile.name) ? 'luxury_tax' : 'income_tax';
    case 'railroad': return 'railroad';
    case 'utility': return /water/i.test(tile.name) ? 'water' : 'electric';
    default: return null;
  }
}

/** Data URL for a square's icon (null when the square should show a photo). */
export function tileIconUrl(tile: Tile): string | null {
  const key = iconKeyForTile(tile);
  if (!key) return null;
  const color = tile.color === 'utility' && /water/i.test(tile.name) ? ICON_COLOR.water
    : tile.color === 'railroad' ? ICON_COLOR.railroad
    : ICON_COLOR[key];
  return asDataUrl(key, color);
}

/** One-line street/address label used on big squares and in tooltips. */
export function addressLabel(tile: Tile): string {
  const raw = tile.realAddress || tile.culture?.mapQuery || '';
  if (!raw) return '';
  const first = raw.split(/[,،]/)[0].trim();
  return first.length > 26 ? `${first.slice(0, 25)}…` : first;
}
