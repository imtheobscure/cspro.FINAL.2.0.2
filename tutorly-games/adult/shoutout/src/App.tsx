import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionProvider, useSession } from './store/Session';
import Splash from './components/Splash';
import Room from './components/Room';
import Results from './components/Results';
import Flood, { type WaveStats } from './games/Flood';
import { Btn, Chip } from './components/ui';
import { scoreWave } from './lib/pacing';
import { audio } from './lib/audio';
import { stopSpeaking } from './lib/speech';
import { cn } from './utils/cn';
import type { Settings } from './lib/types';

type Stage = 'splash' | 'room' | 'play' | 'results';

function Shell() {
  const session = useSession();
  const { settings, enabled, categories, teams, scores, teamForWave, award, pushWave, results, total, resetSession, recordBest, best, update } = session;

  const [stage, setStage] = useState<Stage>(settings.splash ? 'splash' : 'room');
  const [wave, setWave] = useState(1);
  const [newBest, setNewBest] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const unlock = () => {
      audio.init();
      if (settings.music) audio.play('flood', 0.35);
      setUnlocked(true);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, [settings.music]);

  /**
   * The category for a wave.
   *
   * Rotation, not a random draw: a classroom wants to know what is coming next
   * ("animals, then food") and to be sure the list gets used, and a session that
   * reshuffles on every re-render would be a bug the tutor would notice mid-wave.
   */
  const category = useMemo(() => {
    const pool = enabled.length ? enabled : categories;
    if (!settings.mixed) return pool[0];
    return pool[(wave - 1) % pool.length] ?? pool[0];
  }, [enabled, categories, settings.mixed, wave]);

  const team = teamForWave(wave);

  const startSession = useCallback(
    (preset?: Partial<Settings>) => {
      if (preset) update(preset);
      stopSpeaking();
      resetSession();
      setNewBest(false);
      setWave(1);
      setStage(preset ? 'play' : 'room');
    },
    [update, resetSession],
  );

  /** One place scores a wave: the engine reports counts, this decides the points. */
  const onWaveEnd = useCallback(
    (stats: WaveStats) => {
      const { saved, points } = scoreWave(stats.popped, stats.spawned, stats.survived);
      award(team.id, points);
      pushWave({
        wave,
        teamId: team.id,
        categoryId: category.id,
        categoryName: category.name,
        spawned: stats.spawned,
        popped: stats.popped,
        landed: stats.landed,
        survived: stats.survived,
        saved,
        landedWords: stats.landedWords,
        ms: stats.ms,
        points,
      });
    },
    [award, category.id, category.name, pushWave, team.id, wave],
  );

  const toResults = useCallback(() => {
    stopSpeaking();
    setNewBest(recordBest(total));
    setStage('results');
  }, [recordBest, total]);

  const nextWave = useCallback(() => setWave((w) => w + 1), []);

  const replay = useCallback(() => {
    resetSession();
    setNewBest(false);
    setWave(1);
    setStage('play');
  }, [resetSession]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_600px_at_15%_-10%,#ffe4e6,transparent),radial-gradient(900px_500px_at_100%_0%,#e0f2fe,transparent)] bg-slate-50 text-slate-900">
      {stage === 'splash' && (
        <Splash
          best={best}
          showAlways={settings.splash}
          onShowAlways={(v) => update({ splash: v })}
          onStart={(preset) => startSession(preset)}
        />
      )}

      {/* Every stage but the title card gets the same bar: brand, live scores, escape hatches. */}
      {stage !== 'splash' && (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
            <button onClick={() => { stopSpeaking(); setStage('room'); }} className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-sky-500 text-2xl text-white shadow-lg">🫧</span>
              <span className="text-left">
                <span className="block text-2xl font-black leading-none tracking-tight">ShoutOut</span>
                <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">the emoji flood arcade</span>
              </span>
            </button>

            <div className="flex flex-1 flex-wrap items-center gap-2">
              {settings.mode !== 'solo' && teams.map((t) => (
                <div key={t.id} className={cn('rounded-xl px-3 py-1.5 text-center', team.id === t.id && stage === 'play' ? 'bg-slate-900 text-white' : 'bg-slate-100')}>
                  <div className="text-xs font-black" style={{ color: team.id === t.id && stage === 'play' ? '#fff' : t.color }}>{t.emoji} {t.name}</div>
                  <div className="text-lg font-black tabular-nums leading-none">{scores[t.id] ?? 0}</div>
                </div>
              ))}
              {stage === 'play' && (
                <>
                  <Chip tone="violet">Wave {wave} / {settings.waves}</Chip>
                  <Chip tone="sky">{category.icon} {category.name}</Chip>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {stage === 'play' && (
                <>
                  <Btn size="sm" onClick={() => { stopSpeaking(); setWave(1); resetSession(); setStage('room'); }}>🎛 Room</Btn>
                  <Btn size="sm" variant="dark" onClick={() => { stopSpeaking(); audio.stop(); setStage('results'); }}>🏁 End session</Btn>
                </>
              )}
              {stage === 'results' && (
                <Btn size="sm" onClick={() => setStage('room')}>🎛 Room</Btn>
              )}
              <Btn size="sm" variant={settings.music ? 'ok' : 'ghost'} onClick={() => update({ music: !settings.music })}>{settings.music ? '🔊' : '🔇'}</Btn>
              <Btn size="sm" onClick={() => { stopSpeaking(); audio.stop(); }} title="Silence everything">⏹</Btn>
              <Btn size="sm" onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen?.();
              }} title="Projector mode">⛶</Btn>
            </div>
          </div>
          {!unlocked && (
            <div className="bg-amber-100 px-4 py-1.5 text-center text-sm font-bold text-amber-900">
              Tap anywhere once to switch on sound — browsers block audio until you click.
            </div>
          )}
        </header>
      )}

      <main className="mx-auto max-w-[1600px] px-4 py-4">
        {stage === 'room' && <Room onStart={() => setStage('play')} />}
        {stage === 'play' && category && (
          <Flood
            wave={wave}
            totalWaves={settings.waves}
            category={category}
            team={team}
            pace={settings.pace}
            cam={settings.cam}
            words={category.items}
            onWaveEnd={onWaveEnd}
            onNext={nextWave}
            onFinish={toResults}
            onExit={() => setStage('room')}
          />
        )}
        {stage === 'results' && <Results onAgain={replay} onRoom={() => setStage('room')} newBest={newBest} />}
      </main>

      {stage !== 'splash' && (
        <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 text-center text-sm font-semibold text-slate-400">
          {results.length} wave{results.length === 1 ? '' : 's'} played this session · session total {total.toLocaleString()} points
          {best > 0 && <> · best session {best.toLocaleString()}</>} · camera and mic stay in this browser · audio synthesised live
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
