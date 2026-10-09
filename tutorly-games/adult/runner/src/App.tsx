import { useState, useEffect, useRef, useCallback, type ReactNode, type PointerEvent } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Mic, MicOff, Settings2, Trophy, Heart, Users, Shield, Crosshair, BookOpen, Maximize, Minimize, Camera, ChevronRight, ArrowUpRight, CircleHelp, X, Target, Zap, Rocket, Snowflake, Activity, Monitor, Mouse, ArrowLeft, ArrowRight, LockKeyhole, Download } from 'lucide-react';
import { RoadEngine } from './game/GameEngine';
import { DEFAULT_GRAPHICS, type GraphicsOptions, type HUDStats } from './game/battleTypes';
import { QuestionModal } from './components/QuestionModal';
import { AIPromptModal } from './components/AIPromptModal';
import { SettingsModal } from './components/SettingsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import type { Question, PowerUpType, CEFRLevel, AudienceMode, LeaderboardEntry } from './types/game';
import { SAMPLE_QUESTIONS } from './data/sampleQuestions';
import { soundManager } from './utils/audio';
import { voiceService } from './utils/speechRecognition';
import { downloadJSONFile } from './utils/aiPromptGenerator';
import { assetUrl } from './utils/assetUrl';

type Panel = 'settings' | 'studio' | 'records' | 'arsenal' | 'help' | null;
interface Preferences { level: CEFRLevel; mode: AudienceMode; name: string; review: boolean; sound: boolean; graphics: GraphicsOptions }
interface PersonalRecord { score: number; wave: number; accuracy: number; name: string }

function readSaved<T,>(key: string, fallback: T): T {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be disabled in classroom browsers. */ } }

const DEFAULT_PREFS: Preferences = { level: 'B1', mode: 'adult', name: 'Commander', review: false, sound: true, graphics: DEFAULT_GRAPHICS };
const EMPTY_RECORD: PersonalRecord = { score: 0, wave: 1, accuracy: 0, name: 'Commander' };
const INITIAL_STATS: HUDStats = { hp: 100, squad: 5, score: 0, kills: 0, wave: 1, waveProgress: 0, weapon: 'dual_smg', weaponRemaining: 0, shield: 0, enemies: 32, fps: 0 };
const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const BOT_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, name: 'Vance', score: 38450, waves: 12, accuracy: 96, country: 'GB', badge: 'Veteran' },
  { rank: 2, name: 'Elena', score: 32100, waves: 10, accuracy: 94, country: 'FR', badge: 'Elite' },
  { rank: 3, name: 'Ghost_07', score: 28900, waves: 9, accuracy: 91, country: 'US' },
  { rank: 4, name: 'Lexi', score: 24500, waves: 8, accuracy: 89, country: 'DE' },
  { rank: 5, name: 'Kenji', score: 21800, waves: 7, accuracy: 88, country: 'JP' },
  { rank: 6, name: 'Santos', score: 18400, waves: 6, accuracy: 85, country: 'BR' },
];

const WEAPONS: { type: PowerUpType; name: string; code: string; category: string; description: string; damage: string; rate: string; icon: typeof Crosshair }[] = [
  { type: 'dual_smg', name: 'VECTOR MK. II', code: 'V-02', category: 'STANDARD ISSUE', description: 'Reliable, rapid-fire automatic weapon. Every squad member adds another stream of fire.', damage: '5 / ROUND', rate: '286 RPM', icon: Crosshair },
  { type: 'shotgun_spread', name: 'BREACHER-12', code: 'B-12', category: 'CROWD CONTROL', description: 'Five-projectile spread. Clear a wide path through the horde at close range.', damage: '5 x 5', rate: '143 RPM', icon: Target },
  { type: 'gatling_overload', name: 'TITAN GATLING', code: 'T-06', category: 'HEAVY SUPPORT', description: 'High-velocity rotary cannon. A relentless wall of lead with an 800 RPM fire rate.', damage: '7 / ROUND', rate: '800 RPM', icon: Zap },
  { type: 'plasma_laser', name: 'ARC LANCER', code: 'A-09', category: 'ENERGY WEAPON', description: 'A piercing plasma lance that passes through entire columns of enemies.', damage: '14 / HIT', rate: 'PIERCING', icon: Activity },
  { type: 'rocket_barrage', name: 'HELLFIRE SYSTEM', code: 'H-04', category: 'EXPLOSIVE', description: 'Heavy rockets detonate on impact, dealing splash damage across a 3.8-meter radius.', damage: '30 + AOE', rate: '109 RPM', icon: Rocket },
];
const WEAPON_ART: Partial<Record<PowerUpType, string>> = { dual_smg: 'rifle', shotgun_spread: 'shotgun', gatling_overload: 'gatling', plasma_laser: 'plasma', rocket_barrage: 'rocket' };

function BrandMark() {
  return <svg viewBox="0 0 48 54" fill="none" aria-hidden="true"><path d="M4 5h40v29L24 49 4 34V5Z" stroke="currentColor" strokeWidth="2"/><path d="m12 15 12 9 12-9v9L24 34 12 24v-9Z" fill="currentColor"/><path d="M17 39h14M19 3V0m10 3V0" stroke="currentColor" strokeWidth="2"/></svg>;
}

function TacticalDialog({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="tactical-modal-backdrop" onClick={onClose}><section className="tactical-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={23}/></button></header>{children}</section></div>;
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RoadEngine | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(() => ({ ...DEFAULT_PREFS, ...readSaved<Partial<Preferences>>('tuto-runner-preferences-v1', {}), graphics: { ...DEFAULT_GRAPHICS, ...readSaved<Partial<Preferences>>('tuto-runner-preferences-v1', {}).graphics } }));
  const [record, setRecord] = useState<PersonalRecord>(() => readSaved('tuto-runner-record-v1', EMPTY_RECORD));
  const [stats, setStats] = useState<HUDStats>(INITIAL_STATS);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [detailedAssets, setDetailedAssets] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [notice, setNotice] = useState<{ title: string; detail: string } | null>(null);
  const [answers, setAnswers] = useState({ correct: 0, total: 0 });
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionReward, setQuestionReward] = useState<PowerUpType>('gatling_overload');
  const [rescue, setRescue] = useState<{ active: boolean; name: string }>({ active: false, name: '' });
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState<PowerUpType>('dual_smg');
  const usedIds = useRef(new Set<string>(readSaved<string[]>('tuto-runner-used-questions-v1', [])));
  const runQuestions = useRef<Question[]>([]);
  const reviewQueue = useRef<Question[]>([]);
  const answerLog = useRef<{ id: string; type: string; correct: boolean }[]>([]);
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((title: string, detail: string) => {
    setNotice({ title, detail });
    if (noticeTimeout.current) clearTimeout(noticeTimeout.current);
    noticeTimeout.current = setTimeout(() => setNotice(null), 4200);
  }, []);
  const preference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPreferences((current) => ({ ...current, [key]: value }));
  const accuracy = answers.total ? Math.round(answers.correct / answers.total * 100) : 0;

  const pickQuestion = () => {
    if (preferences.review && reviewQueue.current.length) {
      const next = reviewQueue.current.shift()!;
      runQuestions.current.push(next);
      return next;
    }
    const source = customQuestions.length ? customQuestions : SAMPLE_QUESTIONS;
    let pool = source.filter((item) => item.audience === preferences.mode && LEVELS.indexOf(item.cefr) <= LEVELS.indexOf(preferences.level));
    if (!pool.length) pool = source.filter((item) => item.audience === preferences.mode);
    if (!pool.length) pool = source;
    let available = pool.filter((item) => !usedIds.current.has(item.id));
    if (!available.length) {
      pool.forEach((item) => usedIds.current.delete(item.id));
      available = pool;
      notify('LESSON CYCLE COMPLETE', 'All available questions have been seen. Beginning a new cycle.');
    }
    const next = available[Math.floor(Math.random() * available.length)] ?? SAMPLE_QUESTIONS[0];
    usedIds.current.add(next.id);
    save('tuto-runner-used-questions-v1', [...usedIds.current]);
    runQuestions.current.push(next);
    return next;
  };

  // Latest callbacks live in a ref so a new question or preference never recreates the WebGL game.
  const callbacks = useRef({ onQuestion: (_reward: PowerUpType, _rescue: boolean, _name?: string) => {}, onOver: () => {} });
  callbacks.current = {
    onQuestion: (reward, isRescue, name) => {
      const next = pickQuestion();
      setQuestionReward(isRescue ? reward : next.powerUpReward);
      setRescue({ active: isRescue, name: name ?? 'Dr. Elena' });
      setQuestion(next);
    },
    onOver: () => {
      setGameOver(true);
      const game = engineRef.current;
      if (game && game.score > record.score) {
        const newRecord = { score: game.score, wave: game.wave, accuracy, name: preferences.name };
        setRecord(newRecord);
        save('tuto-runner-record-v1', newRecord);
      }
    },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: RoadEngine;
    try {
      engine = new RoadEngine(canvas, preferences.graphics, setDetailedAssets);
      engineRef.current = engine;
      engine.audience = preferences.mode;
      engine.onStatsUpdate = setStats;
      engine.onNotice = notify;
      engine.onTriggerQuestion = (reward, isRescue, name) => callbacks.current.onQuestion(reward, isRescue, name);
      engine.onGameOver = () => callbacks.current.onOver();
      setReady(true);
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : 'WebGL could not initialize.');
      return;
    }
    const resize = new ResizeObserver(() => engine.resize());
    resize.observe(canvas);
    const keyDown = (event: KeyboardEvent) => engine.handleKeyDown(event);
    const keyUp = (event: KeyboardEvent) => engine.handleKeyUp(event);
    const blur = () => { engine.clearInput(); if (!engine.isPreview && !engine.isGameOver) setPaused(true); };
    const lostContext = (event: Event) => {
      event.preventDefault();
      engine.pause();
      setPaused(true);
      setRenderError('The graphics context was interrupted. Reload to restart the renderer.');
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    canvas.addEventListener('webglcontextlost', lostContext);
    return () => {
      resize.disconnect();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      canvas.removeEventListener('webglcontextlost', lostContext);
      engine.destroy();
      engineRef.current = null;
    };
    // The renderer is intentionally created only once per mounted canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    save('tuto-runner-preferences-v1', preferences);
  }, [preferences]);
  useEffect(() => { soundManager.setSoundEnabled(preferences.sound); }, [preferences.sound]);
  useEffect(() => { if (engineRef.current) engineRef.current.audience = preferences.mode; }, [preferences.mode]);
  useEffect(() => { engineRef.current?.setGraphics(preferences.graphics); }, [preferences.graphics]);

  useEffect(() => { voiceService.setEnabled(micActive); return () => voiceService.stop(); }, [micActive]);
  useEffect(() => {
    if (panel || paused || question || photoMode) engineRef.current?.pause();
    else engineRef.current?.resume();
  }, [panel, paused, question, photoMode]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (photoMode) setPhotoMode(false);
      else if (panel) setPanel(null);
      else if (!question && started && !gameOver) setPaused((value) => !value);
    };
    const full = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('keydown', escape);
    document.addEventListener('fullscreenchange', full);
    return () => { window.removeEventListener('keydown', escape); document.removeEventListener('fullscreenchange', full); };
  }, [panel, started, gameOver, question, photoMode]);
  useEffect(() => () => { if (noticeTimeout.current) clearTimeout(noticeTimeout.current); voiceService.stop(); soundManager.stopSpeaking(); }, []);

  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>('[aria-modal="true"]');
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length > 0);
    if (!dialog.contains(previous)) focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus(); };
  }, [panel, question]);

  const deploy = () => {
    if (!engineRef.current || renderError) return;
    reviewQueue.current = preferences.review ? [...runQuestions.current] : [];
    runQuestions.current = [];
    answerLog.current = [];
    setAnswers({ correct: 0, total: 0 });
    setStarted(true); setPaused(false); setGameOver(false); setPanel(null); setQuestion(null);
    engineRef.current.init();
    soundManager.playGateMultiplier();
  };
  const answerQuestion = (correct: boolean, reward: PowerUpType) => {
    setAnswers((current) => ({ correct: current.correct + Number(correct), total: current.total + 1 }));
    if (question) answerLog.current.push({ id: question.id, type: question.type, correct });
    if (correct) engineRef.current?.applyPowerUp(reward);
    if (engineRef.current) engineRef.current.shieldTimer = Math.max(engineRef.current.shieldTimer, 2);
    soundManager.stopSpeaking();
    voiceService.stop();
    setQuestion(null);
  };
  const toggleMic = () => {
    if (!voiceService.isSupported()) { notify('VOICE INPUT UNAVAILABLE', 'Use Chrome or Edge for optional fruit-word voice controls.'); return; }
    setMicActive((value) => !value);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shellRef.current?.requestFullscreen) await shellRef.current.requestFullscreen();
      else throw new Error('Unsupported');
    } catch { notify('FULLSCREEN UNAVAILABLE', 'Your browser or embedded view does not allow fullscreen.'); }
  };
  const capture = () => {
    try {
      const image = engineRef.current?.capture();
      if (!image) return;
      const link = document.createElement('a');
      link.href = image; link.download = `tuto-runner-${Date.now()}.png`; link.click();
      notify('CAPTURE SAVED', 'Your battlefield screenshot has been downloaded.');
    } catch { notify('CAPTURE UNAVAILABLE', 'The browser could not export the current graphics frame.'); }
  };
  const report = () => downloadJSONFile({ player: preferences.name, date: new Date().toISOString(), ...stats, accuracy, questions: answerLog.current, record }, 'tuto-runner-mission-report.json');
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => { event.currentTarget.setPointerCapture(event.pointerId); engineRef.current?.handlePointerDown(event.clientX); };

  const activeWeapon = WEAPONS.find((weapon) => weapon.type === stats.weapon) ?? WEAPONS[0];
  const armoryWeapon = WEAPONS.find((weapon) => weapon.type === selectedWeapon) ?? WEAPONS[0];
  const ranked = [...BOT_ENTRIES, { rank: 7, name: preferences.name, score: Math.max(stats.score, record.score), waves: Math.max(stats.wave, record.wave), accuracy: stats.score >= record.score ? accuracy : record.accuracy, country: 'YOU', isPlayer: true }].sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }));

  return <div ref={shellRef} className={`game-shell ${preferences.mode === 'kid' ? 'kid-mode' : ''} ${photoMode ? 'photo-mode' : ''}`}>
    <div
      className="battlefield-background"
      aria-hidden="true"
      // Resolved against document.baseURI by assetUrl(), so the artwork is found
      // from /tutorly-games/adult/runner/ as well as from the site root. The
      // no-leading-slash form is deliberate: a root-absolute literal would 404 on
      // the deployed sub-path (and scripts/check-static-deploy.mjs flags it).
      style={{ backgroundImage: `url(${assetUrl('images/harbor-dusk.jpg')})` }}
    />
    <canvas ref={canvasRef} className="battlefield-canvas" aria-label="3D survival battlefield. Move with A and D, the arrow keys, or drag the battlefield." onPointerDown={pointerDown} onPointerMove={(event) => engineRef.current?.handlePointerMove(event.clientX)} onPointerUp={() => engineRef.current?.handlePointerUp()} onPointerCancel={() => engineRef.current?.handlePointerUp()}/>
    <div className="cinematic-vignette" aria-hidden="true"/>
    <div className="film-grain" aria-hidden="true"/>

    <header className="command-header game-interface">
      <a className="brand" href="#battlefield" onClick={(event) => event.preventDefault()} aria-label="Runner: English Arena"><BrandMark/><span className="brand-type">TUTO <strong>RUNNER</strong><small>ENGLISH ARENA</small></span></a>
      <nav className="main-navigation" aria-label="Game navigation">
        <button className={!panel || panel === 'help' ? 'active' : ''} onClick={() => setPanel(null)}><Crosshair size={15}/> BATTLEFIELD</button>
        <button className={panel === 'arsenal' ? 'active' : ''} onClick={() => { setSelectedWeapon(stats.weapon); setPanel('arsenal'); }}><Shield size={15}/> ARSENAL</button>
        <button className={panel === 'records' ? 'active' : ''} onClick={() => setPanel('records')}><Trophy size={15}/> RECORDS</button>
      </nav>
      <div className="header-actions">
        <button className="icon-button mobile-arsenal-button" title="Inspect the arsenal" aria-label="Open arsenal" onClick={() => setPanel('arsenal')}><Shield size={19}/></button>
        <button className="lesson-button" onClick={() => setPanel('studio')}><BookOpen size={17}/><span>LESSON STUDIO</span><ArrowUpRight size={15}/></button>
        <button className="icon-button" title="Graphics and classroom settings" aria-label="Open settings" onClick={() => setPanel('settings')}><Settings2 size={20}/></button>
        <button className="icon-button fullscreen-button" title="Toggle fullscreen" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>{fullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}</button>
      </div>
    </header>

    <main id="battlefield" className="battlefield-hud game-interface" aria-label="Mission status">
      <section className="mission-heading">
        <div className="mission-eyebrow"><span className="tiny-square"/>OPERATION 01 <span className="slash">/</span> SURVIVAL</div>
        <h1>THE LAST<br/><span>CROSSING.</span></h1>
        <p>Hold your ground. Every word is a weapon.</p>
        <div className="mission-location"><span className="location-diamond"/> CROSSWIND BRIDGE <span className="sector">SECTOR 07</span></div>
        <div className="learning-mode"><span className="level-tag">{preferences.level}</span><span>{preferences.mode === 'adult' ? 'ADULT' : 'KID'} MODE<span className="mode-divider">/</span>ENGLISH</span><button onClick={() => setPanel('settings')} aria-label="Change learning mode"><ChevronRight size={14}/></button></div>
      </section>

      <section className="wave-indicator" aria-label={`Wave ${stats.wave}`}>
        <div className="compass-ticks" aria-hidden="true"><span>NW</span><i/><i/><i/><b>N</b><i/><i/><i/><span>NE</span></div>
        <div className="wave-label"><span>WAVE</span><strong>{String(stats.wave).padStart(2, '0')}</strong><span className="wave-state">{started ? 'IN PROGRESS' : 'STANDING BY'}</span></div>
        <div className="wave-track"><div style={{ width: `${stats.waveProgress * 100}%` }}/></div>
      </section>

      <section className="mission-score">
        <div className="eyebrow">MISSION SCORE</div>
        <strong>{stats.score.toLocaleString().padStart(5, '0')}</strong>
        <div className="best-score"><Trophy size={12}/><span>PERSONAL BEST</span><b>{record.score.toLocaleString()}</b></div>
        <div className="kill-count"><Crosshair size={17}/><b>{String(stats.kills).padStart(2, '0')}</b><span>ELIMINATED</span></div>
      </section>

      <section className="vitals-panel">
        <div className="vitals-heading"><span><Heart size={15}/>SQUAD VITALS</span><b className={stats.hp < 30 ? 'critical' : ''}>{Math.ceil(stats.hp)}<small>/ 100</small></b></div>
        <div className={`health-track ${stats.hp < 30 ? 'critical' : ''}`} role="progressbar" aria-label="Squad health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.ceil(stats.hp)}><div style={{ width: `${stats.hp}%` }}/></div>
        <div className="squad-status"><span><span className="status-dot"/>{stats.hp === 0 ? 'SQUAD DOWN' : stats.hp < 30 ? 'CRITICAL CONDITION' : 'COMBAT READY'}</span><span><Users size={14}/><b>{String(stats.squad).padStart(2, '0')}</b> ACTIVE</span></div>
        <button className="weapon-panel" onClick={() => { setSelectedWeapon(stats.weapon); setPanel('arsenal'); }} aria-label="Inspect equipped weapon">
          <div className="weapon-topline"><span>PRIMARY WEAPON</span><span className="auto-fire-dot"/><span>AUTO FIRE</span></div>
          <img src={`/images/${WEAPON_ART[stats.weapon] ?? 'rifle'}.svg`} alt={`${activeWeapon.name} weapon illustration`} className={`rifle-art weapon-${stats.weapon}`}/>
          <div className="weapon-bottomline"><div><h2>{activeWeapon.name}</h2><span>{stats.weaponRemaining > 0 ? `${Math.ceil(stats.weaponRemaining)}s UPGRADE REMAINING` : '5.56 MM / AUTOMATIC'}</span></div><span className="weapon-inspect"><ChevronRight size={19}/></span></div>
          {stats.weaponRemaining > 0 && <div className="weapon-duration" style={{ width: `${Math.min(100, stats.weaponRemaining / 16 * 100)}%` }}/>} 
        </button>
      </section>

      <section className="deployment-panel">
        <div className="learning-callout"><div className="callout-symbol"><Zap size={19}/></div><div><span>KNOWLEDGE IS FIREPOWER</span><p>Answer. Upgrade. Survive.</p></div></div>
        <div className="mission-objective"><span className="objective-line"/><span>{!started ? 'YOUR SQUAD IS AWAITING ORDERS' : `${answers.correct} CORRECT / ${answers.total} CHALLENGES`}</span></div>
        {!started ? <button className="deploy-button" onClick={deploy} disabled={!ready || Boolean(renderError)}><Play size={19} fill="currentColor"/><span>{ready ? 'DEPLOY SQUAD' : renderError ? 'WEBGL UNAVAILABLE' : 'PREPARING SCENE'}</span><ChevronRight size={21}/></button> : <button className="mission-action" onClick={() => gameOver ? deploy() : setPaused((value) => !value)}>{gameOver ? <RotateCcw size={18}/> : paused ? <Play size={18}/> : <Pause size={18}/>}<span>{gameOver ? 'RETRY MISSION' : paused ? 'RESUME MISSION' : 'PAUSE MISSION'}</span><kbd>ESC</kbd></button>}
        <button className="field-guide-button" onClick={() => setPanel('help')}><CircleHelp size={14}/><span>FIELD MANUAL</span><ArrowUpRight size={13}/></button>
      </section>

      {stats.shield > 0 && started && !gameOver && <div className="shield-indicator"><Shield size={14}/> SHIELD ACTIVE <b>{Math.ceil(stats.shield)}s</b></div>}
      {notice && !panel && !question && <div className="combat-notice" key={notice.title} role="status"><span className="notice-rule"/><div><strong>{notice.title}</strong><p>{notice.detail}</p></div></div>}
      {started && stats.hp < 30 && !gameOver && <div className="damage-vignette" aria-hidden="true"/>}
    </main>

    <footer className="combat-footer game-interface">
      <button className="graphics-readout" onClick={() => setPanel('settings')} title={detailedAssets ? 'High-detail animated models loaded' : 'Built-in 3D infantry active'}><Monitor size={14}/><span>{preferences.graphics.quality.toUpperCase()}</span><i/><span className="fps-readout">{ready ? `${stats.fps || '--'} FPS` : 'INITIALIZING'}</span></button>
      <div className="movement-controls"><kbd>A</kbd><kbd>D</kbd><span>MOVE</span><span className="control-divider"/><kbd><ArrowLeft size={11}/></kbd><kbd><ArrowRight size={11}/></kbd><span>OR</span><Mouse size={15}/><span>DRAG</span></div>
      <div className="audio-controls"><button className={micActive ? 'enabled' : ''} onClick={toggleMic} title="Enable fruit-word voice answers">{micActive ? <Mic size={15}/> : <MicOff size={15}/>}<span>MIC {micActive ? 'READY' : 'OFF'}</span></button><button onClick={() => preference('sound', !preferences.sound)} title="Toggle game sound">{preferences.sound ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>SFX {preferences.sound ? 'ON' : 'OFF'}</span></button><button onClick={() => setPhotoMode(true)} title="Photo mode" aria-label="Open photo mode"><Camera size={17}/></button></div>
    </footer>

    {photoMode && <div className="photo-controls"><span>PHOTO MODE <small>Gameplay paused</small></span><button className="lesson-button" onClick={capture}><Download size={17}/>SAVE SCREENSHOT</button><button className="icon-button" aria-label="Exit photo mode" onClick={() => setPhotoMode(false)}><X size={23}/></button></div>}

    {renderError && <div className="render-error" role="alert"><Monitor size={34}/><h2>3D RENDERING UNAVAILABLE</h2><p>This battlefield needs WebGL 2. Enable hardware acceleration in Chrome, Edge, Firefox, or Safari, then reload.</p><details><summary>Technical details</summary>{renderError}</details><button className="deploy-button" onClick={() => window.location.reload()}>RELOAD BATTLEFIELD<RotateCcw size={18}/></button></div>}

    {paused && !panel && !question && !gameOver && !photoMode && !renderError && <div className="pause-overlay"><div className="pause-content"><Pause size={32}/><span className="eyebrow">OPERATION ON HOLD</span><h2>TAKE A BREATHER.</h2><p>Your squad is waiting for your command.</p><button className="deploy-button" onClick={() => setPaused(false)}><Play size={19}/>RESUME MISSION<ChevronRight size={20}/></button><button className="quiet-button" onClick={deploy}><RotateCcw size={15}/>RESTART MISSION</button></div></div>}

    {gameOver && !panel && <div className="pause-overlay"><div className="debrief-content"><span className="eyebrow">MISSION DEBRIEF</span><h2>PERIMETER<br/><span>BREACHED.</span></h2><p>The crossing fell. The next run is yours.</p><div className="debrief-stats"><div><span>FINAL SCORE</span><strong>{stats.score.toLocaleString()}</strong></div><div><span>WAVE REACHED</span><strong>{String(stats.wave).padStart(2, '0')}</strong></div><div><span>ACCURACY</span><strong>{answers.total ? `${accuracy}%` : '--'}</strong></div></div><label className="review-checkbox"><input type="checkbox" checked={preferences.review} onChange={(event) => preference('review', event.target.checked)}/>Review this run's questions on retry</label><button className="deploy-button" onClick={deploy}><RotateCcw size={19}/>RETRY MISSION<ChevronRight size={20}/></button><button className="quiet-button" onClick={report}><Download size={16}/>DOWNLOAD MISSION REPORT</button></div></div>}

    {question && <QuestionModal key={`${question.id}-${runQuestions.current.length}`} question={question} powerUpReward={questionReward} isSurvivorRescue={rescue.active} survivorName={rescue.name} isMicActive={micActive} onAnswerResult={answerQuestion}/>}
    <AIPromptModal isOpen={panel === 'studio'} onClose={() => setPanel(null)} currentCefr={preferences.level} currentMode={preferences.mode} onImportQuestions={(items) => { if (!items.length) { notify('EMPTY LESSON', 'Import at least one complete question.'); return; } setCustomQuestions(items); setPanel(null); notify('LESSON LOADED', `${items.length} questions are ready for your next supply cache.`); }}/>
    <SettingsModal isOpen={panel === 'settings'} onClose={() => setPanel(null)} isMicActive={micActive} setIsMicActive={setMicActive} isSoundEnabled={preferences.sound} setIsSoundEnabled={(value) => preference('sound', value)} audienceMode={preferences.mode} setAudienceMode={(value) => preference('mode', value)} cefrLevel={preferences.level} setCefrLevel={(value) => preference('level', value)} isReviewMode={preferences.review} setIsReviewMode={(value) => preference('review', value)} playerName={preferences.name} setPlayerName={(value) => preference('name', value)} graphics={preferences.graphics} setGraphics={(value) => preference('graphics', value)}/>
    <LeaderboardModal isOpen={panel === 'records'} onClose={() => setPanel(null)} entries={ranked} playerScore={stats.score} playerWaves={stats.wave} playerAccuracy={accuracy} playerName={preferences.name}/>

    {panel === 'arsenal' && <TacticalDialog title="THE ARSENAL" eyebrow="EQUIPMENT REQUISITION / 05 WEAPONS" onClose={() => setPanel(null)}>
      <div className="arsenal-layout">
        <div className="arsenal-list">{WEAPONS.map((weapon) => <button className={selectedWeapon === weapon.type ? 'selected' : ''} key={weapon.type} onClick={() => setSelectedWeapon(weapon.type)}><weapon.icon size={23}/><span><small>{weapon.code}</small><strong>{weapon.name}</strong></span>{stats.weapon === weapon.type ? <span className="equipped-mark">EQUIPPED</span> : <ChevronRight size={16}/>}</button>)}</div>
        <div className="arsenal-detail">
          <span className="eyebrow">{armoryWeapon.category}</span><h3>{armoryWeapon.name}</h3>
          <div className={`arsenal-weapon-visual weapon-${armoryWeapon.type}`}><img src={`/images/${WEAPON_ART[armoryWeapon.type] ?? 'rifle'}.svg`} alt={`${armoryWeapon.name} equipment illustration`}/></div>
          <p>{armoryWeapon.description}</p>
          <div className="weapon-specifications"><div><span>DAMAGE</span><strong>{armoryWeapon.damage}</strong></div><div><span>FIRE RATE</span><strong>{armoryWeapon.rate}</strong></div></div>
          <div className="unlock-note"><LockKeyhole size={17}/>{armoryWeapon.type === 'dual_smg' ? 'Your starting weapon. Always available in the field.' : 'Answer a supply-cache question correctly to earn this upgrade.'}</div>
        </div>
      </div>
      <div className="arsenal-support"><Shield size={17}/><span>ALSO IN THE FIELD</span><b>Energy shields</b><Snowflake size={17}/><b>Cryo freeze</b><Users size={17}/><b>Survivor allies</b></div>
    </TacticalDialog>}

    {panel === 'help' && <TacticalDialog title="YOUR FIELD MANUAL" eyebrow="SURVIVE THE HORDE. BUILD YOUR SKILLS." onClose={() => setPanel(null)}><div className="field-manual"><div><span className="manual-number">01</span><h3>MOVE. WE HANDLE THE FIRING.</h3><p>Use A / D, the arrow keys, or drag across the bridge. Your squad shoots automatically. Keep away from incoming enemies to protect your health.</p></div><div><span className="manual-number">02</span><h3>KNOWLEDGE UNLOCKS FIREPOWER.</h3><p>Shoot a supply cache or reach a rescue crate. The battlefield pauses while you answer a language challenge. Correct answers grant new weapons, shields, or allies.</p></div><div><span className="manual-number">03</span><h3>BUILD A STRONGER SQUAD.</h3><p>Pass through blue reinforcement gates. Survive 40 seconds of combat to advance a wave. Every third wave brings a heavy hostile.</p></div><div className="manual-tip"><Mic size={20}/><p>Enable the microphone in Settings to choose answers by saying their fruit keywords. Voice controls are optional; clicking always works.</p></div><button className="deploy-button" onClick={() => { setPanel(null); const next = pickQuestion(); setRescue({ active: false, name: '' }); setQuestionReward(next.powerUpReward); setQuestion(next); }}><BookOpen size={18}/>TRY A KNOWLEDGE GATE<ChevronRight size={19}/></button></div></TacticalDialog>}
  </div>;
}

export default App;