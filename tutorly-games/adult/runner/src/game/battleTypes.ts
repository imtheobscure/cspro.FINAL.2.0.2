import type { AudienceMode, PowerUpType } from '../types/game';

export type GraphicsQuality = 'cinematic' | 'balanced' | 'performance';

export interface GraphicsOptions {
  quality: GraphicsQuality;
  bloom: boolean;
  shake: boolean;
  atmosphere: boolean;
}

export const DEFAULT_GRAPHICS: GraphicsOptions = {
  quality: 'cinematic',
  bloom: true,
  shake: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  atmosphere: true,
};

export interface Enemy {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  type: 'walker' | 'runner' | 'brute' | 'boss';
  phase: number;
  hitFlash: number;
}

export interface Bullet {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  life: number;
  type: 'round' | 'plasma' | 'rocket';
  hits: Set<number>;
}

export interface RoadObject {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  type: 'gate' | 'supply' | 'rescue' | 'barrier';
  value: number;
  reward: PowerUpType;
  name?: string;
}

export interface BattleParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

export interface BattleState {
  playerX: number;
  targetPlayerX: number;
  hp: number;
  maxHp: number;
  squadSize: number;
  score: number;
  kills: number;
  wave: number;
  waveTimer: number;
  currentWeapon: PowerUpType;
  weaponRemaining: number;
  shieldTimer: number;
  freezeTimer: number;
  screenShake: number;
  muzzleTimer: number;
  time: number;
  isPaused: boolean;
  isGameOver: boolean;
  isPreview: boolean;
  audience: AudienceMode;
  enemies: Enemy[];
  bullets: Bullet[];
  objects: RoadObject[];
  particles: BattleParticle[];
}

export interface HUDStats {
  hp: number;
  squad: number;
  score: number;
  kills: number;
  wave: number;
  waveProgress: number;
  weapon: PowerUpType;
  weaponRemaining: number;
  shield: number;
  enemies: number;
  fps: number;
}

export function squadPosition(index: number, playerX: number) {
  if (index === 0) return { x: playerX, z: 7.5 };
  const row = Math.ceil(index / 2);
  return {
    x: playerX + (index % 2 === 0 ? 1 : -1) * (0.76 + row * 0.36),
    z: 7.5 + row * 1.15,
  };
}