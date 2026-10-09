import { useEffect, useRef, useState } from 'react';
import { Monitor, SlidersHorizontal, Volume2, Mic, X, ChevronRight, Sparkles, Gauge, Zap, Shield, Users, BookOpen } from 'lucide-react';
import type { AudienceMode, CEFRLevel } from '../types/game';
import type { GraphicsOptions, GraphicsQuality } from '../game/battleTypes';
import { DEFAULT_FRUIT_TRIGGERS, voiceService } from '../utils/speechRecognition';
import { soundManager } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMicActive: boolean;
  setIsMicActive: (active: boolean) => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  audienceMode: AudienceMode;
  setAudienceMode: (mode: AudienceMode) => void;
  cefrLevel: CEFRLevel;
  setCefrLevel: (level: CEFRLevel) => void;
  isReviewMode: boolean;
  setIsReviewMode: (enabled: boolean) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  graphics: GraphicsOptions;
  setGraphics: (graphics: GraphicsOptions) => void;
}

function Toggle({ value, onChange, label, disabled = false }: { value: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button className={`tactical-toggle ${value ? 'on' : ''}`} role="switch" aria-checked={value} aria-label={label} disabled={disabled} onClick={() => onChange(!value)}><span/></button>;
}

export function SettingsModal(props: SettingsModalProps) {
  const [tab, setTab] = useState<'graphics' | 'classroom' | 'audio'>('graphics');
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!props.isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, [props.isOpen]);
  if (!props.isOpen) return null;

  const supported = voiceService.isSupported();
  const graphic = <K extends keyof GraphicsOptions>(key: K, value: GraphicsOptions[K]) => props.setGraphics({ ...props.graphics, [key]: value });
  const presets: { quality: GraphicsQuality; title: string; detail: string; icon: typeof Sparkles }[] = [
    { quality: 'cinematic', title: 'CINEMATIC', detail: 'High-resolution shadows. Full atmosphere.', icon: Sparkles },
    { quality: 'balanced', title: 'BALANCED', detail: 'Refined visuals. Lighter on your GPU.', icon: Gauge },
    { quality: 'performance', title: 'PERFORMANCE', detail: 'Lower resolution. Shadows and bloom off.', icon: Zap },
  ];

  return <div className="tactical-modal-backdrop" onClick={props.onClose}><section className="tactical-dialog settings-dialog" role="dialog" aria-modal="true" aria-label="Game settings" onClick={(event) => event.stopPropagation()}>
    <header><div><span className="eyebrow">SYSTEM CONFIGURATION</span><h2>MAKE IT YOURS.</h2></div><button ref={closeRef} className="icon-button" onClick={props.onClose} aria-label="Close settings"><X size={23}/></button></header>
    <nav className="settings-tabs" aria-label="Settings categories">
      <button className={tab === 'graphics' ? 'active' : ''} onClick={() => setTab('graphics')}><Monitor size={16}/> GRAPHICS</button>
      <button className={tab === 'classroom' ? 'active' : ''} onClick={() => setTab('classroom')}><BookOpen size={16}/> CLASSROOM</button>
      <button className={tab === 'audio' ? 'active' : ''} onClick={() => setTab('audio')}><Volume2 size={16}/> AUDIO & VOICE</button>
    </nav>
    <div className="settings-body">
      {tab === 'graphics' && <>
        <h3 className="settings-section-heading">A battlefield worth getting lost in.</h3>
        <p className="settings-description">Choose the right balance for your device. All presets use the same real-time 3D battlefield and gameplay.</p>
        <div className="graphics-presets">{presets.map((preset) => <button key={preset.quality} className={props.graphics.quality === preset.quality ? 'active' : ''} aria-pressed={props.graphics.quality === preset.quality} onClick={() => graphic('quality', preset.quality)}><preset.icon size={22}/><strong>{preset.title}</strong><small>{preset.detail}</small></button>)}</div>
        <div className="setting-row"><div><h3>Cinematic bloom</h3><p>Soft light bleed around muzzle flashes, tracers, and supply beacons.</p></div><Toggle label="Cinematic bloom" value={props.graphics.bloom && props.graphics.quality !== 'performance'} disabled={props.graphics.quality === 'performance'} onChange={(value) => graphic('bloom', value)}/></div>
        <div className="setting-row"><div><h3>Environmental atmosphere</h3><p>Drifting smoke, firelight, airborne ash, and the helicopter flyby.</p></div><Toggle label="Environmental atmosphere" value={props.graphics.atmosphere} onChange={(value) => graphic('atmosphere', value)}/></div>
        <div className="setting-row"><div><h3>Cinematic camera motion</h3><p>Subtle idle movement and impact shake. Turn off for a steadier view.</p></div><Toggle label="Cinematic camera motion" value={props.graphics.shake} onChange={(value) => graphic('shake', value)}/></div>
        <p className="asset-note">Built with Three.js and free <a href="https://polyhaven.com/a/asphalt_02" target="_blank" rel="noreferrer">Poly Haven CC0 textures</a>. The optional animated infantry model streams from the Three.js examples; built-in models are always available. <a href="/ASSET_CREDITS.md" download>Download asset credits</a>.</p>
      </>}

      {tab === 'classroom' && <>
        <label className="form-field"><span>COMMANDER / LEARNER NAME</span><input value={props.playerName} maxLength={28} onChange={(event) => props.setPlayerName(event.target.value)} placeholder="Your callsign"/></label>
        <span className="setting-field-label">AUDIENCE MODE</span>
        <div className="mode-selection"><button className={props.audienceMode === 'adult' ? 'active' : ''} aria-pressed={props.audienceMode === 'adult'} onClick={() => props.setAudienceMode('adult')}><Shield size={19}/> ADULT TACTICAL</button><button className={props.audienceMode === 'kid' ? 'active' : ''} aria-pressed={props.audienceMode === 'kid'} onClick={() => props.setAudienceMode('kid')}><Users size={19}/> KID FRIENDLY</button></div>
        <p className="settings-description">Kid mode uses child-focused questions, gentler hit effects, and lower collision damage. Neither mode uses graphic gore.</p>
        <label className="form-field"><span>LEARNER'S CEFR LEVEL</span><select value={props.cefrLevel} onChange={(event) => props.setCefrLevel(event.target.value as CEFRLevel)}><option value="A1">A1 - Beginner</option><option value="A2">A2 - Elementary</option><option value="B1">B1 - Intermediate</option><option value="B2">B2 - Upper intermediate</option><option value="C1">C1 - Advanced</option><option value="C2">C2 - Proficient</option></select></label>
        <div className="setting-row"><div><h3>Review previous run</h3><p>Replay the questions from your last run. Otherwise, use unseen questions before cycling the available lesson pool.</p></div><Toggle label="Review previous run" value={props.isReviewMode} onChange={props.setIsReviewMode}/></div>
        <p className="asset-note">Use Lesson Studio to import your own question pack or copy a prompt for an external AI. These settings apply to the next question, without resetting the current mission.</p>
      </>}

      {tab === 'audio' && <>
        <div className="setting-row" style={{ borderTop: 0, paddingTop: 0 }}><div><h3>Combat sound effects</h3><p>Automatic gunfire, impact sounds, and upgrade feedback.</p></div><Toggle label="Combat sound effects" value={props.isSoundEnabled} onChange={props.setIsSoundEnabled}/></div>
        <button className="quiet-button sound-test" disabled={!props.isSoundEnabled} onClick={() => soundManager.playGateMultiplier()}><Volume2 size={16}/>TEST SOUND</button>
        <div className="setting-row"><div><h3>Fruit-word voice controls</h3><p>Say the fruit beside an answer to choose it, even as part of a longer sentence.</p></div><Toggle label="Enable microphone voice controls" value={props.isMicActive} onChange={props.setIsMicActive} disabled={!supported}/></div>
        <div className="voice-fruits">{DEFAULT_FRUIT_TRIGGERS.slice(0, 4).map((fruit) => <div key={fruit.word}><span>{fruit.emoji}</span>{fruit.label}</div>)}</div>
        <p className="browser-note"><Mic size={15} style={{ display: 'inline', marginRight: 7 }}/>{supported ? 'Microphone access is requested when a compatible question opens. Whole fruit words trigger selection; similar substrings do not.' : 'Voice recognition is not supported in this browser. Please use Chrome or Edge. All questions can still be answered by clicking.'}</p>
        <p className="asset-note">Your browser may send speech to its recognition service. Voice controls are optional and stop when a question closes. Listening exercises use the natural English voices installed in your browser, not an authenticated Azure service.</p>
      </>}
    </div>
    <footer className="settings-footer"><span><SlidersHorizontal size={12} style={{ display: 'inline', marginRight: 7 }}/>Saved on this device</span><button className="deploy-button" onClick={props.onClose}>RETURN TO BATTLE<ChevronRight size={18}/></button></footer>
  </section></div>;
}