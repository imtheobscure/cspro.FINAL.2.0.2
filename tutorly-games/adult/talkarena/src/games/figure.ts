import type { Pt } from '../lib/geometry';

export type JointName =
  | 'head' | 'neck' | 'chest' | 'hip'
  | 'elbowL' | 'handL' | 'elbowR' | 'handR'
  | 'kneeL' | 'footL' | 'kneeR' | 'footR';

export type Pose = Record<JointName, Pt>;

export interface Figure {
  id: string;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  gender: 'm' | 'f';
  color: string;
  pose: Pose;
}

const P = (x: number, y: number) => ({ x, y });

export const POSES: { name: string; icon: string; pose: Pose }[] = [
  {
    name: 'stand', icon: '🧍',
    pose: { head: P(0, -132), neck: P(0, -106), chest: P(0, -70), hip: P(0, 0), elbowL: P(-32, -44), handL: P(-40, -2), elbowR: P(32, -44), handR: P(40, -2), kneeL: P(-16, 52), footL: P(-18, 108), kneeR: P(16, 52), footR: P(18, 108) },
  },
  {
    name: 'run', icon: '🏃',
    pose: { head: P(14, -130), neck: P(10, -104), chest: P(6, -68), hip: P(0, 0), elbowL: P(-30, -60), handL: P(-58, -84), elbowR: P(40, -40), handR: P(26, -8), kneeL: P(-36, 36), footL: P(-64, 62), kneeR: P(34, 44), footR: P(52, 96) },
  },
  {
    name: 'jump', icon: '🤸',
    pose: { head: P(0, -140), neck: P(0, -114), chest: P(0, -78), hip: P(0, 0), elbowL: P(-46, -110), handL: P(-58, -152), elbowR: P(46, -110), handR: P(58, -152), kneeL: P(-42, 34), footL: P(-64, 74), kneeR: P(42, 34), footR: P(64, 74) },
  },
  {
    name: 'sit', icon: '🪑',
    pose: { head: P(0, -120), neck: P(0, -94), chest: P(0, -58), hip: P(0, 0), elbowL: P(-34, -30), handL: P(-30, 14), elbowR: P(34, -30), handR: P(30, 14), kneeL: P(-48, 18), footL: P(-50, 76), kneeR: P(48, 18), footR: P(50, 76) },
  },
  {
    name: 'wave', icon: '👋',
    pose: { head: P(0, -132), neck: P(0, -106), chest: P(0, -70), hip: P(0, 0), elbowL: P(-36, -96), handL: P(-52, -142), elbowR: P(32, -44), handR: P(40, -2), kneeL: P(-16, 52), footL: P(-18, 108), kneeR: P(16, 52), footR: P(18, 108) },
  },
  {
    name: 'point', icon: '👉',
    pose: { head: P(6, -132), neck: P(0, -106), chest: P(0, -70), hip: P(0, 0), elbowL: P(-30, -46), handL: P(-36, -4), elbowR: P(44, -84), handR: P(86, -96), kneeL: P(-16, 52), footL: P(-18, 108), kneeR: P(16, 52), footR: P(18, 108) },
  },
  {
    name: 'kick', icon: '⚽',
    pose: { head: P(-8, -128), neck: P(-4, -102), chest: P(0, -66), hip: P(0, 0), elbowL: P(-42, -52), handL: P(-64, -22), elbowR: P(34, -52), handR: P(52, -80), kneeL: P(-20, 54), footL: P(-24, 110), kneeR: P(48, 10), footR: P(92, -14) },
  },
  {
    name: 'carry', icon: '📦',
    pose: { head: P(0, -128), neck: P(0, -102), chest: P(2, -66), hip: P(0, 0), elbowL: P(-38, -52), handL: P(-26, -86), elbowR: P(38, -52), handR: P(26, -86), kneeL: P(-18, 52), footL: P(-20, 108), kneeR: P(18, 52), footR: P(20, 108) },
  },
  {
    name: 'sleep', icon: '🛌',
    pose: { head: P(-96, -20), neck: P(-70, -16), chest: P(-34, -10), hip: P(10, 0), elbowL: P(-46, 18), handL: P(-12, 26), elbowR: P(-40, -34), handR: P(-6, -30), kneeL: P(58, 6), footL: P(104, 16), kneeR: P(56, -14), footR: P(102, -8) },
  },
  {
    name: 'climb', icon: '🧗',
    pose: { head: P(6, -136), neck: P(2, -110), chest: P(0, -74), hip: P(0, 0), elbowL: P(-34, -120), handL: P(-30, -166), elbowR: P(38, -104), handR: P(44, -150), kneeL: P(-42, 30), footL: P(-30, 78), kneeR: P(40, 22), footR: P(54, 70) },
  },
  {
    name: 'push', icon: '🚪',
    pose: { head: P(-14, -128), neck: P(-8, -102), chest: P(-2, -66), hip: P(0, 0), elbowL: P(26, -74), handL: P(62, -78), elbowR: P(28, -60), handR: P(64, -62), kneeL: P(-30, 46), footL: P(-64, 100), kneeR: P(22, 52), footR: P(30, 108) },
  },
  {
    name: 'fall', icon: '🤕',
    pose: { head: P(-70, 40), neck: P(-46, 26), chest: P(-20, 6), hip: P(0, 0), elbowL: P(-56, -26), handL: P(-84, -44), elbowR: P(-14, 46), handR: P(-40, 70), kneeL: P(44, -22), footL: P(84, -44), kneeR: P(40, 30), footR: P(86, 24) },
  },
];

export const clonePose = (p: Pose): Pose => JSON.parse(JSON.stringify(p));

export const newFigure = (x: number, y: number, gender: 'm' | 'f' = 'm'): Figure => ({
  id: `f${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
  x, y, scale: 1, flip: false, gender,
  color: gender === 'f' ? '#be185d' : '#1d4ed8',
  pose: clonePose(POSES[0].pose),
});

/** Shared renderer: draws the figure into a 2D canvas context (also used for stamping). */
export function drawFigure(ctx: CanvasRenderingContext2D, f: Figure) {
  const p = f.pose;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.flip ? -f.scale : f.scale, f.scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = f.color;
  ctx.fillStyle = f.color;

  const seg = (a: Pt, b: Pt, w: number) => {
    ctx.beginPath();
    ctx.lineWidth = w;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  if (f.gender === 'f') {
    // skirt
    ctx.beginPath();
    ctx.moveTo(p.chest.x - 16, p.chest.y + 20);
    ctx.lineTo(p.hip.x - 34, p.hip.y + 30);
    ctx.lineTo(p.hip.x + 34, p.hip.y + 30);
    ctx.lineTo(p.chest.x + 16, p.chest.y + 20);
    ctx.closePath();
    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 5;
    ctx.stroke();
    // hair
    ctx.beginPath();
    ctx.ellipse(p.head.x, p.head.y + 2, 30, 32, 0, 0, Math.PI * 2);
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // shoulders
    seg({ x: p.chest.x - 26, y: p.chest.y - 4 }, { x: p.chest.x + 26, y: p.chest.y - 4 }, 12);
  }

  seg(p.neck, p.chest, 15);
  seg(p.chest, p.hip, 17);
  seg(p.chest, p.elbowL, 11);
  seg(p.elbowL, p.handL, 10);
  seg(p.chest, p.elbowR, 11);
  seg(p.elbowR, p.handR, 10);
  seg(p.hip, p.kneeL, 13);
  seg(p.kneeL, p.footL, 11);
  seg(p.hip, p.kneeR, 13);
  seg(p.kneeR, p.footR, 11);

  // head
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, 24, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  // hands & feet
  ctx.fillStyle = f.color;
  [p.handL, p.handR].forEach((h) => { ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, Math.PI * 2); ctx.fill(); });
  [p.footL, p.footR].forEach((h) => { ctx.beginPath(); ctx.ellipse(h.x, h.y + 3, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}
