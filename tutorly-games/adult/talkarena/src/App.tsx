import { useEffect, useState } from 'react';
import { GameProvider, useGame } from './store/GameContext';
import Setup from './components/Setup';
import Splash from './components/Splash';
import GridArena from './games/GridArena';
import Pictionary from './games/Pictionary';
import DebateArena from './games/DebateArena';
import PracticeRoom from './games/PracticeRoom';
import Report from './components/Report';
import AIStudio from './components/AIStudio';
import { Btn, Chip } from './components/ui';
import { audio } from './lib/audio';
import { stopSpeaking } from './lib/speech';
import { cn } from './utils/cn';

type View = 'lobby' | 'arena' | 'pictionary' | 'debate' | 'practice' | 'report' | 'studio';

/**
 * The rooms of the speaking platform. Emoji Flood used to sit here; it grew into
 * a game of its own — ShoutOut (`../shoutout/`) — so this app is the tutor-led
 * side: cards, drawing, debate, practice, and the teaching plan.
 */
const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'lobby', label: 'Lobby', icon: '🏠' },
  { id: 'arena', label: 'Grid Arena', icon: '🎯' },
  { id: 'pictionary', label: 'Pictionary', icon: '🎨' },
  { id: 'debate', label: 'Debate', icon: '⚖️' },
  { id: 'practice', label: 'Practice', icon: '🧘' },
  { id: 'report', label: 'Report', icon: '📊' },
  { id: 'studio', label: 'AI Studio', icon: '🧪' },
];

function Shell() {
  const { teams, scores, settings, update, pack, log, talk, clearLog, resetScores } = useGame();
  const talkSecs = Math.round(Object.values(talk).reduce((a, b) => a + b, 0) / 1000);
  const [view, setView] = useState<View>('lobby');
  const [focusIds, setFocusIds] = useState<string[] | undefined>();
  const [unlocked, setUnlocked] = useState(false);
  // Keyed on the setting so unchecking it on the title card hides the card for good.
  const [splash, setSplash] = useState(settings.splash);

  useEffect(() => {
    const unlock = () => {
      audio.init();
      if (settings.music) audio.play('lobby', 0.4);
      setUnlocked(true);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, [settings.music]);

  useEffect(() => {
    if (view === 'lobby' || view === 'studio' || view === 'report') audio.play('lobby', 0.4);
  }, [view]);

  const go = (v: string) => {
    stopSpeaking();
    setView(v as View);
    if (v !== 'arena') setFocusIds(undefined);
  };

  /**
   * Projector shortcuts. A tutor standing at the board should not have to aim at
   * a tab: the numbers follow the nav order (1 = Lobby … 7 = AI Studio), `f`
   * toggles fullscreen and `m` mutes the music.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        update({ music: !settings.music });
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= NAV.length) go(NAV[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.music, update]);

  const newSession = () => {
    if (!window.confirm('Start a new session? Scores and the card log are cleared — teams, players and settings stay.')) return;
    clearLog();
    resetScores();
    audio.whoosh();
    go('lobby');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,#eef2ff,transparent),radial-gradient(900px_500px_at_100%_0%,#fff7ed,transparent)] bg-slate-50 text-slate-900">
      {splash && (
        <Splash
          onStart={(v) => { setSplash(false); if (v) go(v); }}
          showAlways={settings.splash}
          onShowAlways={(v) => update({ splash: v })}
        />
      )}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-4 py-3">
          <button onClick={() => go('lobby')} className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl text-white shadow-lg">🗣️</span>
            <span className="text-left">
              <span className="block text-2xl font-black leading-none tracking-tight">TalkArena</span>
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">classroom speaking games</span>
            </span>
          </button>

          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV.map((n, i) => (
              <button key={n.id} onClick={() => go(n.id)} title={`${n.label} — press ${i + 1}`}
                className={cn('rounded-xl px-3 py-2 text-base font-black transition',
                  view === n.id ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-100')}>
                <span className="mr-1">{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {teams.map((t) => (
              <div key={t.id} className="rounded-xl bg-slate-100 px-3 py-1.5 text-center">
                <div className="text-xs font-black" style={{ color: t.color }}>{t.emoji}</div>
                <div className="text-lg font-black tabular-nums leading-none">{scores[t.id] ?? 0}</div>
              </div>
            ))}
            <Chip tone="violet">{pack.meta.level}</Chip>
            <Chip tone="emerald" className="tabular-nums" >🎙 {talkSecs}s talk</Chip>
            <Btn size="sm" variant={settings.music ? 'ok' : 'ghost'} onClick={() => update({ music: !settings.music })}>{settings.music ? '🔊' : '🔇'}</Btn>
            <Btn size="sm" onClick={() => { stopSpeaking(); audio.stop(); }} title="Silence everything">⏹</Btn>
            <Btn size="sm" onClick={newSession} title="Start a new session — clears scores and the card log">↺</Btn>
            <Btn size="sm" onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen?.();
            }} title="Projector mode (F)">⛶</Btn>
          </div>
        </div>
        {!unlocked && (
          <div className="bg-amber-100 px-4 py-1.5 text-center text-sm font-bold text-amber-900">
            Tap anywhere once to switch on sound — browsers block audio until the tutor clicks.
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-5">
        {view === 'lobby' && <Setup onGo={go} />}
        {view === 'arena' && <GridArena focusIds={focusIds} onOpenReport={() => go('report')} />}
        {view === 'pictionary' && <Pictionary />}
        {view === 'debate' && <DebateArena />}
        {view === 'practice' && <PracticeRoom />}
        {view === 'studio' && <AIStudio />}
        {view === 'report' && (
          <Report
            onReask={(ids) => { setFocusIds(ids); setView('arena'); }}
            onTeach={() => { /* narration handled inside */ }}
          />
        )}
      </main>

      <footer className="mx-auto max-w-[1800px] px-4 pb-8 pt-2 text-center text-sm font-semibold text-slate-400">
        {log.length} cards logged this session · press 1–{NAV.length} to switch room, F for projector mode · avatars by DiceBear (free, open source) · photos from Pexels · audio synthesised live in your browser
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
