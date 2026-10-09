import { useAppStore } from '../../store/useAppStore';

// ============================================================
// SOUND SYSTEM
// ============================================================
const audioCtxRef: { current: AudioContext | null } = { current: null };
function getAudioCtx(): AudioContext {
  if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
  return audioCtxRef.current;
}
function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_e) { /* audio not supported */ }
}
export const SFX = {
  click: () => playTone(800, 0.08, 'sine', 0.1),
  success: () => { playTone(523, 0.15); setTimeout(() => playTone(659, 0.15), 100); setTimeout(() => playTone(784, 0.2), 200); },
  error: () => playTone(200, 0.3, 'sawtooth', 0.1),
  flip: () => playTone(600, 0.06, 'sine', 0.08),
  timerEnd: () => { for (let i = 0; i < 5; i++) setTimeout(() => playTone(880, 0.15, 'square', 0.12), i * 200); },
  spin: () => playTone(400 + Math.random() * 400, 0.04, 'sine', 0.06),
  win: () => { [523, 587, 659, 698, 784, 880, 988, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15), i * 80)); },
  type: () => playTone(1200, 0.02, 'sine', 0.04),
  pop: () => playTone(1000, 0.05, 'sine', 0.08),
};

// ============================================================
// HTML EXPORT UTILITY
// ============================================================
export function exportToHTML(title: string, bodyHTML: string) {
  const { appName, appAddress } = useAppStore.getState();
  
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} - ${appName}</title>

<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}</style>
</head><body>
<div style="max-width:900px;margin:0 auto;padding:20px">
<div style="text-align:center;padding:16px;color:white;margin-bottom:20px">
<h1 style="font-size:1.5rem;font-weight:bold">${title}</h1>
<p style="opacity:0.8;font-size:0.85rem">Powered by ClassroomScreen Pro — ${appName} (${appAddress})</p>
</div>
<div style="background:white;border-radius:16px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.2)">
${bodyHTML}
</div>
<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.6);font-size:0.75rem">
© ${appName} — ${appAddress} | ClassroomScreen Pro
</div></div></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_${appName.replace(/\s+/g, '')}.html`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
