export const AVATAR_SETS = [
  { key: "adventurer", name: "Adventurers" },
  { key: "bottts", name: "Robots" },
  { key: "fun-emoji", name: "Fun Emoji" },
  { key: "pixel-art", name: "Pixel Heroes" },
  { key: "lorelei", name: "Lorelei" },
  { key: "big-smile", name: "Big Smile" },
  { key: "thumbs", name: "Thumbs" },
  { key: "avataaars", name: "Classic" },
];

export const AVATAR_SEEDS = ["Nova", "Blaze", "Pixel", "Luna", "Atlas", "Zed", "Kira", "Max", "Echo", "Rio", "Jinx", "Sky"];

export function avatarUrl(set: string, seed: string): string {
  return `https://api.dicebear.com/9.x/${set}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
}

export function parseAvatar(a: string): { set: string; seed: string } {
  const [set, seed] = a.split("|");
  return { set: set || "adventurer", seed: seed || "Nova" };
}

export function avatarSrc(a: string): string {
  const { set, seed } = parseAvatar(a);
  return avatarUrl(set, seed);
}
