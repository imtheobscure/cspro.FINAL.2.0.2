/** Free avatar packs served by DiceBear's public API (no key, CC0/MIT artwork). */
export const AVATAR_PACKS = [
  { id: "adventurer", label: "Adventurer" },
  { id: "avataaars", label: "Avataaars" },
  { id: "big-smile", label: "Big Smile" },
  { id: "bottts", label: "Bottts" },
  { id: "croodles", label: "Croodles" },
  { id: "fun-emoji", label: "Fun Emoji" },
  { id: "lorelei", label: "Lorelei" },
  { id: "micah", label: "Micah" },
  { id: "miniavs", label: "Miniavs" },
  { id: "notionists", label: "Notionists" },
  { id: "open-peeps", label: "Open Peeps" },
  { id: "personas", label: "Personas" },
  { id: "pixel-art", label: "Pixel Art" },
  { id: "thumbs", label: "Thumbs" },
] as const;

export type AvatarPack = (typeof AVATAR_PACKS)[number]["id"];

export function avatarUrl(pack: string, seed: string, size = 160) {
  const s = encodeURIComponent(seed || "arena");
  return `https://api.dicebear.com/9.x/${pack}/svg?seed=${s}&size=${size}&radius=20&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export const AVATAR_SEEDS = [
  "Nova", "Comet", "Falcon", "Tigris", "Juno", "Atlas", "Zephyr", "Koda",
  "Mira", "Rook", "Sable", "Pixel", "Onyx", "Lumen", "Echo", "Kite",
  "Vesper", "Quill", "Fable", "Halo", "Indigo", "Marlow", "Riven", "Solas",
];

export function randomAvatar() {
  const pack = AVATAR_PACKS[Math.floor(Math.random() * AVATAR_PACKS.length)].id;
  const seed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)] + Math.floor(Math.random() * 90 + 10);
  return { pack, seed, url: avatarUrl(pack, seed) };
}
