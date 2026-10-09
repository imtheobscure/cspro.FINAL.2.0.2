import { useEffect, useRef } from "react";
import type { SceneTheme } from "./modes";
import { ART } from "./art";

export type { SceneTheme };
export interface SceneState { progress: number; ghost: number; speed: number; accuracy: number; hit: number; miss: number; nitro: boolean; finished: boolean; combo: number; }

const BG: Record<SceneTheme, string> = { ...ART };

export function Scene({ theme, state, avatar }: { theme: SceneTheme; state: React.MutableRefObject<SceneState>; avatar?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const bg = useRef<HTMLImageElement | null>(null);
  useEffect(() => { if (avatar) { const i = new Image(); i.crossOrigin = "anonymous"; i.src = avatar; img.current = i; } }, [avatar]);
  useEffect(() => { const i = new Image(); i.src = BG[theme]; bg.current = i; }, [theme]);
  useEffect(() => {
    const cv = ref.current!; const c = cv.getContext("2d")!; let raf = 0; let t0 = performance.now(); let dist = 0;
    let smooth = { p: 0, g: 0, s: 0, combo: 0 };
    const particles: { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number }[] = [];
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000); t0 = now; const W = cv.width, H = cv.height; const st = state.current;
      smooth.p += (st.progress - smooth.p) * 0.08; smooth.g += (st.ghost - smooth.g) * 0.08; smooth.s += (st.speed - smooth.s) * 0.05; smooth.combo += (st.combo - smooth.combo) * 0.12;
      dist += dt * (0.4 + smooth.s * 3.2);
      if (st.hit > 0) { for (let i = 0; i < 10; i++) particles.push({ x: W * 0.55, y: H * 0.7, vx: (Math.random() - 0.5) * 380, vy: -Math.random() * 340, life: 0.7, col: st.nitro ? "#f472b6" : "#fbbf24", r: 3 + Math.random() * 4 }); st.hit = 0; }
      if (st.miss > 0) { for (let i = 0; i < 10; i++) particles.push({ x: W * 0.5, y: H * 0.7, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 140, life: 0.55, col: "#ef4444", r: 3 }); st.miss = 0; }
      c.clearRect(0, 0, W, H);
      const R: R = { c, W, H, t: now / 1000, dist, p: smooth.p, g: smooth.g, s: smooth.s, acc: st.accuracy, nitro: st.nitro, img: img.current, bg: bg.current, fin: st.finished, combo: smooth.combo };
      photo(R);
      ({ race: drawRace, rocket: drawRocket, boxing: drawBoxing, heist: drawHeist, practice: drawPractice, neon: drawNeon, avalanche: drawAva, kraken: drawKraken })[theme](R);
      speedLines(R);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        c.globalAlpha = Math.max(0, p.life); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      if (R.nitro) { c.fillStyle = "rgba(244,114,182,0.08)"; c.fillRect(0, 0, W, H); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [theme]);
  return <canvas ref={ref} width={1280} height={560} className="w-full h-auto rounded-2xl border border-white/10 shadow-2xl bg-black" />;
}

type R = { c: CanvasRenderingContext2D; W: number; H: number; t: number; dist: number; p: number; g: number; s: number; acc: number; nitro: boolean; img: HTMLImageElement | null; bg: HTMLImageElement | null; fin: boolean; combo: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function photo(R: R) {
  const { c, W, H, s, t, nitro, bg } = R;
  if (bg && bg.complete && bg.naturalWidth) {
    const z = 1.12 + s * 0.22; const shx = Math.sin(t * 48) * s * 8 + (nitro ? Math.sin(t * 90) * 10 : 0); const shy = Math.cos(t * 36) * s * 5;
    const dw = W * z, dh = H * z;
    c.drawImage(bg, (W - dw) / 2 + shx, (H - dh) / 2 + shy, dw, dh);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, "rgba(0,0,0,0.05)"); g.addColorStop(1, "rgba(0,0,0,0.55)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  } else { c.fillStyle = "#020617"; c.fillRect(0, 0, W, H); }
}
function avatarAt(R: R, x: number, y: number, r: number) {
  if (!R.img || !R.img.complete || !R.img.naturalWidth) return;
  const { c } = R; c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.clip(); c.drawImage(R.img, x - r, y - r, r * 2, r * 2); c.restore();
  c.strokeStyle = "#fbbf24"; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
}
function hud(R: R, label: string, value: string, x: number) {
  const { c } = R; c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(x, 14, 168, 48); c.fillStyle = "#94a3b8"; c.font = "11px sans-serif"; c.fillText(label, x + 12, 30); c.fillStyle = "#fff"; c.font = "bold 20px monospace"; c.fillText(value, x + 12, 52);
}
function progressBar(R: R, label: string) {
  const { c, W, p, g } = R; c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(W / 2 - 210, 16, 420, 32); c.fillStyle = "#334155"; c.fillRect(W / 2 - 200, 26, 400, 12); c.fillStyle = "#94a3b8"; c.fillRect(W / 2 - 200, 26, 400 * Math.min(1, g), 12); c.fillStyle = R.nitro ? "#f472b6" : "#22c55e"; c.fillRect(W / 2 - 200, 26, 400 * Math.min(1, p), 12); c.fillStyle = "#fff"; c.font = "bold 11px sans-serif"; c.fillText(label, W / 2 - 200, 24); c.fillText(Math.round(p * 100) + "%", W / 2 + 168, 24);
}
function banner(R: R, text: string) { const { c, W, H } = R; c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(0, H / 2 - 54, W, 108); c.fillStyle = "#fde047"; c.font = "black 64px sans-serif"; c.textAlign = "center"; c.fillText(text, W / 2, H / 2 + 22); c.textAlign = "left"; }
function speedLines(R: R) {
  if (R.s < 0.25) return; const { c, W, H, t, s } = R; c.save(); c.globalAlpha = Math.min(0.45, s * 0.5); c.strokeStyle = "#fff"; c.lineWidth = 1;
  for (let i = 0; i < 18; i++) { const y = ((i * 73 + t * 900 * s) % H); c.beginPath(); c.moveTo(0, y); c.lineTo(40 + s * 80, y); c.stroke(); c.beginPath(); c.moveTo(W, y + 20); c.lineTo(W - 40 - s * 80, y + 20); c.stroke(); }
  c.restore();
}

function drawRace(R: R) {
  const { c, W, H, t, dist, p, g, s } = R; const horizon = H * 0.46; const curve = Math.sin(dist * 0.28) * 110;
  const rows = 52;
  for (let i = rows; i >= 0; i--) {
    const z1 = i / rows, z2 = (i + 1) / rows; const y1 = horizon + (H - horizon) * Math.pow(z1, 1.55), y2 = horizon + (H - horizon) * Math.pow(z2, 1.55);
    const w1 = 50 + z1 * W * 0.95, w2 = 50 + z2 * W * 0.95; const cx1 = W / 2 + curve * (1 - z1) ** 2, cx2 = W / 2 + curve * (1 - z2) ** 2;
    const stripe = Math.floor((dist * 6 + i * 0.25) % 2);
    c.fillStyle = stripe ? "rgba(24,24,27,0.75)" : "rgba(63,63,70,0.7)"; c.beginPath(); c.moveTo(cx1 - w1 / 2, y1); c.lineTo(cx1 + w1 / 2, y1); c.lineTo(cx2 + w2 / 2, y2); c.lineTo(cx2 - w2 / 2, y2); c.fill();
    c.fillStyle = stripe ? "#ef4444" : "#f8fafc"; c.fillRect(cx1 - w1 / 2 - 8 * z1 - 4, y1, 8 * z1 + 4, y2 - y1 + 1); c.fillRect(cx1 + w1 / 2, y1, 8 * z1 + 4, y2 - y1 + 1);
    if (stripe) { c.fillStyle = "#fef08a"; c.fillRect(cx1 - 3 * z1 - 1, y1, 6 * z1 + 2, y2 - y1 + 1); }
  }
  const rel = Math.max(-1, Math.min(1, (g - p) * 8)); const gz = 0.18 + (1 - rel) * 0.35; const gy = horizon + (H - horizon) * Math.pow(gz, 1.55); const gw = (50 + gz * W * 0.95) * 0.2; const gx = W / 2 + curve * (1 - gz) ** 2 + gw * 0.6;
  car(c, gx, gy, gw, "#94a3b8", true); c.fillStyle = "#e2e8f0"; c.font = "bold 12px sans-serif"; c.fillText("RECORD", gx - 22, gy - gw * 0.55);
  const px = W / 2 - 70 + Math.sin(t * 18) * s * 3; car(c, px, H - 36, 190, R.nitro ? "#f472b6" : "#ef4444", false);
  if (s > 0.15 || R.nitro) { c.fillStyle = R.nitro ? "rgba(244,114,182,0.75)" : "rgba(251,146,60,0.75)"; const fl = 24 + Math.random() * 48 * (s + (R.nitro ? 1 : 0)); c.beginPath(); c.moveTo(px - 70, H - 24); c.lineTo(px - 58, H - 24 + fl); c.lineTo(px - 46, H - 24); c.fill(); c.beginPath(); c.moveTo(px + 46, H - 24); c.lineTo(px + 58, H - 24 + fl); c.lineTo(px + 70, H - 24); c.fill(); }
  avatarAt(R, px, H - 108, 24);
  c.save(); c.translate(W - 96, H - 78); c.fillStyle = "rgba(0,0,0,0.6)"; c.beginPath(); c.arc(0, 0, 62, 0, Math.PI * 2); c.fill();
  for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5; c.strokeStyle = i > 7 ? "#ef4444" : "#e2e8f0"; c.lineWidth = 3; c.beginPath(); c.moveTo(Math.cos(a) * 50, Math.sin(a) * 50); c.lineTo(Math.cos(a) * 58, Math.sin(a) * 58); c.stroke(); }
  const na = Math.PI * 0.75 + s * Math.PI * 1.5; c.strokeStyle = "#f59e0b"; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(na) * 52, Math.sin(na) * 52); c.stroke(); c.fillStyle = "#fff"; c.font = "bold 13px monospace"; c.fillText(Math.round(s * 260) + " km/h", -38, 32); c.restore();
  progressBar(R, "CIRCUIT"); if (R.fin) banner(R, "FINISH!");
}
function car(c: CanvasRenderingContext2D, x: number, y: number, w: number, col: string, ghost: boolean) {
  const h = w * 0.5; c.save(); if (ghost) c.globalAlpha = 0.7;
  c.fillStyle = "rgba(0,0,0,0.45)"; c.beginPath(); c.ellipse(x, y + 4, w * 0.55, h * 0.2, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#111"; c.fillRect(x - w * 0.5, y - h * 0.5, w * 0.16, h * 0.55); c.fillRect(x + w * 0.34, y - h * 0.5, w * 0.16, h * 0.55);
  c.fillStyle = col; c.beginPath(); c.roundRect(x - w * 0.45, y - h * 0.7, w * 0.9, h * 0.72, w * 0.08); c.fill();
  c.fillStyle = "#0f172a"; c.beginPath(); c.roundRect(x - w * 0.3, y - h * 1.05, w * 0.6, h * 0.42, w * 0.06); c.fill();
  c.fillStyle = "#93c5fd"; c.fillRect(x - w * 0.26, y - h * 1.0, w * 0.52, h * 0.22);
  c.fillStyle = "#fca5a5"; c.fillRect(x - w * 0.42, y - h * 0.5, w * 0.12, h * 0.14); c.fillRect(x + w * 0.3, y - h * 0.5, w * 0.12, h * 0.14); c.restore();
}

function drawRocket(R: R) {
  const { c, W, H, t, p, g, s } = R;
  c.fillStyle = "#fff"; for (let i = 0; i < 80; i++) { const y = ((i * 131 + R.dist * 140 * (1 + (i % 3))) % H); c.globalAlpha = 0.25 + (i % 5) * 0.12; c.fillRect((i * 79) % W, y, 2, 2 + (i % 3) * s * 8); } c.globalAlpha = 1;
  const ry = lerp(H - 90, 70, p); const gy = lerp(H - 90, 70, g);
  rocket(c, W * 0.68, gy, 0.72, "#94a3b8", t, 0.2); c.fillStyle = "#cbd5e1"; c.font = "bold 12px sans-serif"; c.fillText("RECORD", W * 0.68 - 24, gy + 72);
  const rx = W * 0.38 + Math.sin(t * 14) * s * 4; rocket(c, rx, ry, 1.05, R.nitro ? "#f472b6" : "#e11d48", t, s); avatarAt(R, rx, ry - 12, 18);
  hud(R, "ALTITUDE", Math.round(p * 420) + " km", 20); hud(R, "THRUST", Math.round(s * 100) + "%", 200);
  progressBar(R, "ORBIT"); if (R.fin) banner(R, "ORBIT REACHED!");
}
function rocket(c: CanvasRenderingContext2D, x: number, y: number, sc: number, col: string, _t: number, s = 0.3) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  const fl = 34 + Math.random() * 46 * (0.3 + s); const grad = c.createLinearGradient(0, 40, 0, 40 + fl); grad.addColorStop(0, "#fef08a"); grad.addColorStop(1, "rgba(239,68,68,0)"); c.fillStyle = grad; c.beginPath(); c.moveTo(-14, 40); c.lineTo(0, 40 + fl); c.lineTo(14, 40); c.fill();
  c.fillStyle = "#e2e8f0"; c.beginPath(); c.moveTo(0, -60); c.quadraticCurveTo(24, -20, 22, 40); c.lineTo(-22, 40); c.quadraticCurveTo(-24, -20, 0, -60); c.fill();
  c.fillStyle = col; c.beginPath(); c.moveTo(0, -60); c.quadraticCurveTo(24, -35, 20, -20); c.lineTo(-20, -20); c.quadraticCurveTo(-24, -35, 0, -60); c.fill();
  c.beginPath(); c.moveTo(-22, 10); c.lineTo(-40, 45); c.lineTo(-22, 40); c.fill(); c.beginPath(); c.moveTo(22, 10); c.lineTo(40, 45); c.lineTo(22, 40); c.fill();
  c.fillStyle = "#38bdf8"; c.beginPath(); c.arc(0, -8, 9, 0, Math.PI * 2); c.fill(); c.restore();
}

function drawBoxing(R: R) {
  const { c, W, H, t, p, g, s, acc } = R;
  const oppHp = 1 - p; const ox = W / 2 + 110, oy = H * 0.62; const stagger = R.nitro ? Math.sin(t * 28) * 8 : 0;
  boxer(c, ox + stagger, oy - Math.abs(Math.sin(t * 3)) * 6, "#7c2d12", "#f59e0b", false, oppHp < 0.3 ? 1 : 0);
  const px = W / 2 - 110, py = H * 0.7; const punch = s > 0.25 ? Math.abs(Math.sin(t * 14)) * 42 * s : 0;
  boxer(c, px, py - Math.abs(Math.sin(t * 3 + 1)) * 6, "#0f172a", "#ef4444", true, 0, punch); avatarAt(R, px, py - 138, 22);
  c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(20, 14, 420, 64); c.fillRect(W - 440, 14, 420, 64);
  c.fillStyle = "#fff"; c.font = "bold 14px sans-serif"; c.fillText("YOU — STAMINA", 32, 34); c.textAlign = "right"; c.fillText("CHAMPION", W - 32, 34); c.textAlign = "left";
  c.fillStyle = "#334155"; c.fillRect(32, 42, 390, 22); c.fillRect(W - 422, 42, 390, 22);
  c.fillStyle = acc > 0.6 ? "#22c55e" : "#f59e0b"; c.fillRect(32, 42, 390 * Math.max(0.02, acc), 22);
  c.fillStyle = "#ef4444"; c.fillRect(W - 422 + 390 * (1 - oppHp), 42, 390 * oppHp, 22);
  c.fillStyle = "#94a3b8"; c.font = "11px sans-serif"; c.fillText("Record pace " + Math.round(g * 100) + "%  ·  combo x" + Math.max(1, Math.round(R.combo)), W - 422, 90);
  if (R.fin) banner(R, "K.O.!");
}
function boxer(c: CanvasRenderingContext2D, x: number, y: number, skin: string, shorts: string, back: boolean, hurt: number, punch = 0) {
  c.save(); c.translate(x, y); if (hurt) c.rotate(Math.sin(performance.now() / 90) * 0.1);
  c.fillStyle = shorts; c.fillRect(-38, -42, 76, 54); c.fillStyle = skin; c.fillRect(-42, -136, 84, 100); c.beginPath(); c.arc(0, -162, 34, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#dc2626";
  if (back) { c.beginPath(); c.arc(-58, -104 - punch, 28, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(58, -104 - punch * 0.5, 28, 0, Math.PI * 2); c.fill(); }
  else { c.beginPath(); c.arc(-52, -98, 28, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(52, -98, 28, 0, Math.PI * 2); c.fill(); c.fillStyle = "#fff"; if (!hurt) { c.fillRect(-16, -172, 10, 10); c.fillRect(6, -172, 10, 10); } }
  c.restore();
}

function drawHeist(R: R) {
  const { c, W, H, t, p, g, s } = R;
  const n = Math.max(0, 6 - Math.floor(p * 6));
  for (let i = 0; i < n; i++) { const y = 70 + i * 60 + Math.sin(t * 2 + i) * 18; c.strokeStyle = "rgba(239,68,68,0.85)"; c.lineWidth = 2; c.shadowColor = "#ef4444"; c.shadowBlur = 14; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + Math.sin(t + i) * 28); c.stroke(); } c.shadowBlur = 0;
  const cx = W / 2, cy = H / 2 + 16; const open = p * 0.92; c.save(); c.translate(cx, cy);
  c.fillStyle = "rgba(0,0,0,0.55)"; c.beginPath(); c.arc(0, 0, 168, 0, Math.PI * 2); c.fill();
  c.save(); c.scale(1 - open, 1); const door = c.createRadialGradient(-40, -40, 10, 0, 0, 160); door.addColorStop(0, "#cbd5e1"); door.addColorStop(1, "#334155"); c.fillStyle = door; c.beginPath(); c.arc(0, 0, 158, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#64748b"; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 122, 0, Math.PI * 2); c.stroke();
  c.save(); c.rotate(p * Math.PI * 6 + s * Math.sin(t * 10) * 0.04); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.fillStyle = "#e2e8f0"; c.fillRect(-10, 0, 20, 92); c.beginPath(); c.arc(0, 92, 16, 0, Math.PI * 2); c.fill(); } c.fillStyle = "#f8fafc"; c.beginPath(); c.arc(0, 0, 26, 0, Math.PI * 2); c.fill(); c.restore(); c.restore();
  if (open > 0.12) { const gold = c.createRadialGradient(0, 0, 10, 0, 0, 150 * open); gold.addColorStop(0, "#fde68a"); gold.addColorStop(1, "rgba(253,230,138,0)"); c.fillStyle = gold; c.beginPath(); c.arc(0, 0, 150, 0, Math.PI * 2); c.fill(); }
  c.restore(); avatarAt(R, 130, H - 86, 32);
  hud(R, "LOCKS CRACKED", Math.round(p * 100) + "%", 20); hud(R, "RIVAL CREW", Math.round(g * 100) + "%", 200); hud(R, "SIGNAL", s > 0.6 ? "STRONG" : s > 0.25 ? "OK" : "WEAK", W - 188);
  if (R.fin) banner(R, "VAULT OPEN!");
}

function drawPractice(R: R) {
  const { c, W, H, t, p, s, acc } = R;
  c.strokeStyle = "rgba(167,139,250,0.85)"; c.lineWidth = 3; c.beginPath();
  for (let x = 0; x < W; x += 4) { const y = H / 2 + Math.sin(x * 0.028 + t * 6) * Math.sin(x * 0.01 + t) * 70 * (0.18 + s); x === 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
  c.save(); c.translate(W / 2, H / 2); c.strokeStyle = "rgba(15,23,42,0.7)"; c.lineWidth = 18; c.beginPath(); c.arc(0, 0, 128, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = "#22c55e"; c.beginPath(); c.arc(0, 0, 128, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke();
  c.strokeStyle = "#f59e0b"; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 102, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * acc); c.stroke(); c.restore();
  avatarAt(R, W / 2, H / 2, 52);
  hud(R, "PROGRESS", Math.round(p * 100) + "%", 20); hud(R, "ACCURACY", Math.round(acc * 100) + "%", 200); hud(R, "PACE", Math.round(s * 100) + "%", W - 188);
  if (R.fin) banner(R, "TAKE COMPLETE");
}

function drawNeon(R: R) {
  const { c, W, H, t, p, g, s } = R;
  for (let i = 0; i < 70; i++) { const x = (i * 37 + t * (280 + s * 900)) % (W + 40) - 20; const y = (i * 53) % H; c.fillStyle = "rgba(226,232,240,0.35)"; c.fillRect(x, y, 1, 10 + s * 18); }
  const gx = 260 + (g - p) * 720; bike(c, gx, H * 0.72, 0.7, "#64748b", t, 0.2); c.fillStyle = "#e2e8f0"; c.font = "bold 11px sans-serif"; c.fillText("GHOST", gx - 16, H * 0.72 - 70);
  const lean = Math.min(0.45, (R.combo / 12) * 0.35 + s * 0.12); const px = 280 + Math.sin(t * 10) * s * 8;
  c.save(); c.translate(px, H * 0.74); c.rotate(-lean); c.translate(-px, -H * 0.74); bike(c, px, H * 0.74, 1, R.nitro ? "#f472b6" : "#22d3ee", t, s); avatarAt(R, px + 10, H * 0.74 - 78, 18); c.restore();
  hud(R, "DRIFT ANGLE", Math.round(lean * 55) + "°", 20); hud(R, "CHAIN", "x" + Math.max(1, Math.round(R.combo)), 200); hud(R, "RIVAL", Math.round(g * 100) + "%", W - 188);
  progressBar(R, "STRIP"); if (R.fin) banner(R, "NITRO FINISH");
}
function bike(c: CanvasRenderingContext2D, x: number, y: number, sc: number, col: string, _t: number, s: number) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  c.strokeStyle = col; c.globalAlpha = 0.5; c.lineWidth = 6; c.beginPath(); c.moveTo(-90, 10); c.quadraticCurveTo(-40, -20 - s * 20, 10, 8); c.stroke(); c.globalAlpha = 1;
  c.fillStyle = "#111"; c.beginPath(); c.arc(-38, 18, 16, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(42, 18, 16, 0, Math.PI * 2); c.fill();
  c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(-38, 18, 16, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(42, 18, 16, 0, Math.PI * 2); c.stroke();
  c.fillStyle = col; c.beginPath(); c.moveTo(-28, 8); c.lineTo(30, 4); c.lineTo(22, -18); c.lineTo(-10, -12); c.closePath(); c.fill();
  c.fillStyle = "#0f172a"; c.fillRect(8, -28, 10, 18); c.fillStyle = "#e2e8f0"; c.beginPath(); c.arc(14, -34, 8, 0, Math.PI * 2); c.fill();
  if (s > 0.2) { const fl = 20 + Math.random() * 40 * s; const g = c.createLinearGradient(-50, 10, -50 - fl, 10); g.addColorStop(0, "#f472b6"); g.addColorStop(1, "rgba(244,114,182,0)"); c.fillStyle = g; c.fillRect(-50 - fl, 6, fl, 8); }
  c.restore();
}

function drawAva(R: R) {
  const { c, W, H, t, p, g, s } = R;
  for (let i = 0; i < 90; i++) { const x = (i * 47 + t * (40 + s * 120)) % W; const y = (i * 91 + t * 180) % H; c.fillStyle = "rgba(255,255,255,0.7)"; c.beginPath(); c.arc(x, y, 1.4 + (i % 3), 0, Math.PI * 2); c.fill(); }
  const wallX = lerp(-80, W * 0.55, Math.max(0, g - p + 0.15));
  const snow = c.createLinearGradient(wallX - 80, 0, wallX + 180, 0); snow.addColorStop(0, "rgba(255,255,255,0)"); snow.addColorStop(0.4, "rgba(226,232,240,0.55)"); snow.addColorStop(1, "rgba(148,163,184,0.85)");
  c.fillStyle = snow; c.beginPath(); c.moveTo(wallX - 100, 0); for (let y = 0; y <= H; y += 16) c.lineTo(wallX + Math.sin(y * 0.04 + t * 6) * 40, y); c.lineTo(-40, H); c.lineTo(-40, 0); c.fill();
  const hop = Math.abs(Math.sin(t * 9 * (0.4 + s))) * 18 * (0.3 + s); skier(c, 320, H * 0.62 - hop, s, R.nitro); avatarAt(R, 332, H * 0.62 - hop - 58, 18);
  hud(R, "DROP", Math.round(p * 2400) + " m", 20); hud(R, "AVALANCHE", g > p ? "CLOSING" : "BEHIND", 200); hud(R, "EDGE", Math.round(s * 100) + "%", W - 188);
  progressBar(R, "DESCENT"); if (R.fin) banner(R, "YOU OUTRAN IT");
}
function skier(c: CanvasRenderingContext2D, x: number, y: number, s: number, nitro: boolean) {
  c.save(); c.translate(x, y); c.rotate(-0.2 - s * 0.15); c.strokeStyle = "#e2e8f0"; c.lineWidth = 4; c.beginPath(); c.moveTo(-40, 28); c.lineTo(50, 18); c.stroke(); c.beginPath(); c.moveTo(-36, 36); c.lineTo(54, 26); c.stroke();
  c.fillStyle = nitro ? "#f472b6" : "#0369a1"; c.fillRect(-10, -28, 22, 40); c.fillStyle = "#0f172a"; c.beginPath(); c.arc(2, -40, 10, 0, Math.PI * 2); c.fill(); c.restore();
}

function drawKraken(R: R) {
  const { c, W, H, t, p, g, s } = R;
  const rock = Math.sin(t * 1.8) * 8 + Math.sin(t * 4.2) * 4;
  tentacle(c, W * 0.78, H * 0.2 + (1 - p) * 80, t, 1.1, "#064e3b"); tentacle(c, W * 0.88, H * 0.45 + (1 - p) * 40, t + 1, 0.9, "#065f46"); tentacle(c, W * 0.7, H * 0.7, t + 2, 0.8, "#047857");
  c.save(); c.translate(0, rock);
  c.fillStyle = "#1c1917"; c.beginPath(); c.moveTo(80, H * 0.62); c.lineTo(W * 0.58, H * 0.58); c.lineTo(W * 0.55, H * 0.78); c.lineTo(70, H * 0.82); c.closePath(); c.fill();
  c.fillStyle = "#44403c"; c.fillRect(W * 0.28, H * 0.28, 10, H * 0.34); c.strokeStyle = "#e7e5e4"; c.lineWidth = 3; c.beginPath(); c.moveTo(W * 0.28 + 5, H * 0.28); c.lineTo(W * 0.28 + 70, H * 0.48); c.lineTo(W * 0.28 + 5, H * 0.5); c.closePath(); c.stroke();
  if (s > 0.25) { c.fillStyle = "rgba(251,191,36,0.85)"; c.beginPath(); c.arc(W * 0.54, H * 0.6, 8 + Math.random() * 10 * s, 0, Math.PI * 2); c.fill(); }
  avatarAt(R, W * 0.3, H * 0.52, 22); c.restore();
  hud(R, "HULL", Math.round(R.acc * 100) + "%", 20); hud(R, "KRAKEN", Math.round((1 - p) * 100) + "%", 200); hud(R, "VOLLEY", "x" + Math.max(1, Math.round(R.combo)), W - 188);
  progressBar(R, "THE BEAST"); if (R.fin) banner(R, "THE DEEP YIELDS");
  void g;
}
function tentacle(c: CanvasRenderingContext2D, x: number, y: number, t: number, sc: number, col: string) {
  c.save(); c.translate(x, y); c.scale(sc, sc); c.strokeStyle = col; c.lineWidth = 22; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 220);
  for (let i = 0; i <= 8; i++) { const py = 220 - i * 28; c.lineTo(Math.sin(t * 1.4 + i * 0.7) * (20 + i * 6), py); } c.stroke();
  c.fillStyle = "#34d399"; for (let i = 2; i < 8; i++) { c.beginPath(); c.arc(Math.sin(t * 1.4 + i * 0.7) * (20 + i * 6) - 10, 220 - i * 28, 5, 0, Math.PI * 2); c.fill(); } c.restore();
}
