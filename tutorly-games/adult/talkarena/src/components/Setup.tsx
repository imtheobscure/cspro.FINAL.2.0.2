import { useMemo, useState } from 'react';
import { Avatar, Btn, Card, Chip, Field, inputCls, Toggle } from './ui';
import { useGame } from '../store/GameContext';
import { AVATAR_STYLES, TEAM_PRESETS } from '../data/decks';
import { useNarrator } from '../lib/useNarrator';
import { audio } from '../lib/audio';
import { cn } from '../utils/cn';

export default function Setup({ onGo }: { onGo: (v: string) => void }) {
  const { players, setPlayers, teams, setTeams, pack, settings, update } = useGame();
  const { voices, pool, say, mixVoices } = useNarrator();
  const [avatarFor, setAvatarFor] = useState<string | null>(null);

  const characters = useMemo(() => {
    const s = new Set<string>();
    pack.questions.forEach((q) => q.dialogue?.forEach((d) => s.add(d.character)));
    return [...s];
  }, [pack.questions]);

  const addPlayer = () => {
    const id = `p${Date.now()}`;
    const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)].id;
    setPlayers((p) => [...p, { id, name: `Player ${p.length + 1}`, style, seed: Math.random().toString(36).slice(2, 8), teamId: teams[p.length % teams.length]?.id ?? teams[0].id }]);
    audio.stamp();
  };

  /**
   * The lobby's front doors. Emoji Flood is NOT one of them any more: it grew
   * into ShoutOut, a game of its own at `../shoutout/`, so its card here is a
   * link to the sibling build rather than a room inside this app.
   */
  const games: { id: string; icon: string; name: string; desc: string; tone: string; href?: string; external?: boolean }[] = [
    { id: 'arena', icon: '🎯', name: 'Grid Arena', desc: '10 rounds of hard cards. Mini lesson on every miss, talk task on every hit.', tone: 'from-indigo-500 to-violet-600' },
    { id: 'pictionary', icon: '🎨', name: 'Pictionary Studio', desc: 'Pen, marker, magic shape pen, emoji stamps, posable figure, webcam + Sketch-Sense AI.', tone: 'from-amber-500 to-orange-600' },
    { id: 'shoutout', icon: '🫧', name: 'ShoutOut', desc: 'The emoji-flood arcade: shout the word before the room floods. Its own game, its own scoreboard.', tone: 'from-rose-500 to-pink-600', href: '../shoutout/index.html', external: true },
    { id: 'debate', icon: '⚖️', name: 'Discussion & Debate', desc: '10 motions, 9 timed stages, live talk-time meter, twist that flips the room.', tone: 'from-violet-500 to-fuchsia-600' },
    { id: 'practice', icon: '🧘', name: 'Practice Room', desc: 'Pressure-free single cards for pre-teaching and homework review.', tone: 'from-emerald-500 to-teal-600' },
    { id: 'report', icon: '📊', name: 'Report & plan', desc: 'The score sheet, the weakest sub-skill, and one tap to re-ask the misses.', tone: 'from-slate-700 to-slate-900' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {games.map((g) => {
          const cls = cn('group block rounded-3xl bg-gradient-to-br p-6 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl', g.tone);
          const inner = (
            <>
              <div className="text-5xl">{g.icon}</div>
              <h3 className="mt-2 text-2xl font-black tracking-tight">{g.name}</h3>
              <p className="mt-1 text-base font-semibold text-white/85">{g.desc}</p>
              <span className="mt-3 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-black">
                {g.href ? 'Open in a new tab ↗' : 'Open ▶'}
              </span>
            </>
          );
          return g.href ? (
            <a key={g.id} href={g.href} target="_blank" rel="noreferrer" className={cls} onClick={() => audio.whoosh()}>{inner}</a>
          ) : (
            <button key={g.id} onClick={() => { onGo(g.id); audio.whoosh(); }} className={cls}>{inner}</button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* teams + players */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900">👥 Teams & avatars</h3>
            <div className="flex gap-2">
              <Btn size="sm" onClick={addPlayer}>＋ Learner</Btn>
              <Btn size="sm" onClick={() => { setPlayers((ps) => ps.map((p) => ({ ...p, seed: Math.random().toString(36).slice(2, 8) }))); audio.reveal(); }}>🎲 Reroll all</Btn>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {TEAM_PRESETS.map((t) => {
              const on = teams.some((x) => x.id === t.id);
              return (
                <button key={t.id} onClick={() => setTeams((cur) => (on ? (cur.length > 1 ? cur.filter((x) => x.id !== t.id) : cur) : [...cur, t]))}
                  className={cn('rounded-2xl border-2 px-4 py-2 font-black transition', on ? 'border-slate-900 bg-white' : 'border-slate-200 bg-slate-50 text-slate-400')}
                  style={{ color: on ? t.color : undefined }}>
                  {t.emoji} {t.name}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {players.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-slate-200 p-3">
                <button onClick={() => setAvatarFor(avatarFor === p.id ? null : p.id)} className="transition hover:scale-105">
                  <Avatar style={p.style} seed={p.seed} size={56} ring={teams.find((t) => t.id === p.teamId)?.color} />
                </button>
                <input value={p.name} onChange={(e) => setPlayers((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                  className="w-36 rounded-xl border-2 border-slate-200 px-3 py-1.5 font-bold" />
                <select value={p.teamId} onChange={(e) => setPlayers((ps) => ps.map((x) => (x.id === p.id ? { ...x, teamId: e.target.value } : x)))}
                  className="rounded-xl border-2 border-slate-200 px-2 py-1.5 font-bold">
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                </select>
                <Btn size="sm" onClick={() => setPlayers((ps) => ps.map((x) => (x.id === p.id ? { ...x, seed: Math.random().toString(36).slice(2, 8) } : x)))}>🎲</Btn>
                <Btn size="sm" variant="danger" onClick={() => setPlayers((ps) => ps.filter((x) => x.id !== p.id))}>✕</Btn>
                {avatarFor === p.id && (
                  <div className="w-full">
                    <div className="mb-1 text-xs font-black uppercase text-slate-500">Free avatar packs (DiceBear, open source)</div>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_STYLES.map((s) => (
                        <button key={s.id} onClick={() => setPlayers((ps) => ps.map((x) => (x.id === p.id ? { ...x, style: s.id } : x)))}
                          className={cn('rounded-2xl border-2 p-1 transition', p.style === s.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300')}
                          title={s.label}>
                          <Avatar style={s.id} seed={p.seed} size={44} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* voices + sound */}
        <Card className="space-y-4">
          <h3 className="text-2xl font-black text-slate-900">🗣 Voices & sound</h3>
          <Field label="Narrator voice" hint="Nothing ever reads aloud on its own — narration is always a tap.">
            <div className="flex gap-2">
              <select value={settings.narrator} onChange={(e) => update({ narrator: e.target.value })} className={inputCls}>
                {voices.length === 0 && <option>Loading system voices…</option>}
                {voices.map((v) => <option key={v.uri} value={v.uri}>{v.natural ? '★ ' : ''}{v.name} ({v.lang})</option>)}
              </select>
              <Btn onClick={() => say('This is how the narrator will sound in your classroom.')}>▶ Audition</Btn>
            </div>
          </Field>

          <Field label={`Speaking rate — ${settings.rate.toFixed(2)}×`}>
            <input type="range" min={0.6} max={1.3} step={0.01} value={settings.rate} onChange={(e) => update({ rate: +e.target.value })} className="w-full accent-indigo-600" />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-wide text-slate-500">Cast — one voice per character</span>
              <Btn size="sm" onClick={() => { mixVoices(characters); audio.reveal(); }}>🎲 Mix voices</Btn>
            </div>
            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {characters.map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <Chip tone="violet">{c}</Chip>
                  <select value={settings.cast[c] ?? ''} onChange={(e) => update({ cast: { ...settings.cast, [c]: e.target.value } })}
                    className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-2 py-1.5 text-sm font-bold">
                    <option value="">auto</option>
                    {pool.map((v) => <option key={v.uri} value={v.uri}>{v.name}</option>)}
                  </select>
                  <Btn size="sm" onClick={() => say(`Hello, I am ${c}.`, settings.cast[c])}>▶</Btn>
                </div>
              ))}
              {characters.length === 0 && <p className="text-sm font-semibold text-slate-500">Load a pack with listening cards to cast voices.</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Toggle on={settings.music} onChange={(v) => update({ music: v })} label="Music" />
            <Toggle on={settings.sfx} onChange={(v) => update({ sfx: v })} label="Sound FX" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-500">Music</span>
              <input type="range" min={0} max={1} step={0.01} value={settings.musicVol} onChange={(e) => update({ musicVol: +e.target.value })} className="w-24 accent-indigo-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-500">FX</span>
              <input type="range" min={0} max={1} step={0.01} value={settings.sfxVol} onChange={(e) => update({ sfxVol: +e.target.value })} className="w-24 accent-indigo-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Projector text size — ${Math.round(settings.fontScale * 100)}%`}>
              <input type="range" min={0.9} max={1.45} step={0.01} value={settings.fontScale} onChange={(e) => update({ fontScale: +e.target.value })} className="w-full accent-indigo-600" />
            </Field>
            <Field label={`Default card timer — ${settings.timerSec}s`}>
              <input type="range" min={15} max={120} step={5} value={settings.timerSec} onChange={(e) => update({ timerSec: +e.target.value })} className="w-full accent-indigo-600" />
            </Field>
          </div>
        </Card>
      </div>

      <Card className="space-y-2 bg-slate-50">
        <h3 className="text-xl font-black text-slate-900">House rules that make them talk</h3>
        <div className="grid gap-2 md:grid-cols-3">
          {[
            'Nobody scores until somebody speaks a full sentence.',
            'Every correct card triggers its talk task — 45 seconds, no passing.',
            'Wrong answers are worth more than right ones: the mini lesson is the prize.',
            'The learner who answers may not answer twice in a row.',
            'In debates, three seconds of silence hands the floor to the other team.',
            'The report is read aloud at the end — the class hears its own weakest sub-skill.',
          ].map((t) => <p key={t} className="rounded-xl bg-white px-3 py-2 text-base font-semibold text-slate-700">• {t}</p>)}
        </div>
      </Card>
    </div>
  );
}
