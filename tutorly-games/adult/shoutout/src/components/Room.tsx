import { useMemo, useState } from 'react';
import { Avatar, Btn, Card, Chip, Field, Toggle, inputCls } from './ui';
import { useSession } from '../store/Session';
import { useNarrator } from '../lib/useNarrator';
import { AVATAR_STYLES, TEAM_PRESETS } from '../data/decks';
import { PACE, PACE_IDS, isPace } from '../lib/pacing';
import { Listener, recognitionSupported } from '../lib/speech';
import { audio } from '../lib/audio';
import { cn } from '../utils/cn';
import type { EmojiItem, Team } from '../lib/types';

/**
 * Parse a pasted word list into deck items.
 *
 * Tutors already have their word lists somewhere — a textbook page, a whiteboard
 * photo, last week's vocabulary test. The rule is deliberately forgiving, because
 * a list that has to be reformatted first does not get pasted at all:
 *
 *     😀 happy                 → emoji + word
 *     happy 😀                 → same thing, either order
 *     happy 😀 glad, cheerful  → everything after the word is an accepted alt
 *     enthusiasm               → no emoji? ⭐ is used
 */
export function parseWordList(text: string): EmojiItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const emojiIdx = parts.findIndex((p) => /\p{Extended_Pictographic}/u.test(p));
      const emoji = emojiIdx >= 0 ? parts.splice(emojiIdx, 1)[0] : '⭐';
      const rest = parts.join(' ').replace(/[,;]+$/, '');
      const [name, ...alts] = rest.split(/\s*[,;]\s*/).map((s) => s.trim()).filter(Boolean);
      return { emoji, name: (name ?? '').toLowerCase(), alts: alts.map((a) => a.toLowerCase()) };
    })
    .filter((i) => i.name.length > 1);
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/** The room: everything a session is made of, in the order a tutor decides it. */
export default function Room({ onStart }: { onStart: () => void }) {
  const { settings, update, teams, setTeams, categories, enabled, custom, addCustom, removeCustom, resetSession } = useSession();
  const { voices, pool, say } = useNarrator();
  const [paste, setPaste] = useState('');
  const [micTest, setMicTest] = useState<string | null>(null);

  /** A wave needs enough words that the class cannot just memorise the order. */
  const wordsInPlay = useMemo(() => enabled.reduce((a, c) => a + c.items.length, 0), [enabled]);
  const canStart = wordsInPlay >= 4;
  const teamCount = settings.mode === 'solo' ? 1 : teams.length;

  const addPasted = () => {
    const items = parseWordList(paste);
    if (!items.length) return;
    addCustom(items);
    setPaste('');
    audio.reveal();
  };

  const toggleCategory = (id: string) => {
    const ids = settings.categoryIds.length ? settings.categoryIds : categories.map((c) => c.id);
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    // Never leave the room with an empty deck.
    update({ categoryIds: next.length ? next : [id] });
    audio.tick();
  };

  const toggleTeam = (t: Team) => {
    const on = teams.some((x) => x.id === t.id);
    if (on) {
      if (teams.length <= 1) return;
      setTeams((cur) => cur.filter((x) => x.id !== t.id));
    } else {
      setTeams((cur) => [...cur, t].slice(0, 6));
    }
    audio.stamp();
  };

  const testMic = () => {
    if (!recognitionSupported()) return;
    setMicTest('Listening for three seconds — say any word on the list…');
    const l = new Listener();
    const timer = window.setTimeout(() => { l.stop(); setMicTest((m) => m && m.startsWith('Listening') ? 'Nothing heard. Type-in mode still works.' : m); }, 3000);
    l.onResult = ({ transcript }) => {
      setMicTest(`Heard: “${transcript}”`);
      window.clearTimeout(timer);
      l.stop();
    };
    l.start();
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-rose-50 via-white to-sky-50">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-sky-500 text-3xl text-white shadow-lg">🫧</div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">The room</h2>
            <p className="text-base font-semibold text-slate-500">
              {settings.waves} waves · {PACE[(isPace(settings.pace) ? settings.pace : 'normal')].label} pace ·{' '}
              {settings.mixed ? 'a different category every wave' : 'one category all session'} ·{' '}
              {settings.mode === 'solo' ? 'one class score' : `${teamCount} teams`}
            </p>
          </div>
        </div>
        <Btn variant="ok" size="lg" disabled={!canStart} onClick={() => { resetSession(); onStart(); }}>
          ▶ Start the flood
        </Btn>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* format */}
        <Card className="space-y-4">
          <h3 className="text-2xl font-black text-slate-900">🎮 Format</h3>

          <Field label="Who is scoring">
            <div className="flex gap-2">
              {(['teams', 'solo'] as const).map((m) => (
                <button key={m} onClick={() => { update({ mode: m }); audio.tick(); }}
                  className={cn('flex-1 rounded-2xl border-2 px-4 py-3 text-left font-black transition',
                    settings.mode === m ? 'border-slate-900 bg-white' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                  <span className="block text-lg">{m === 'teams' ? '🙌 Teams take turns' : '🎓 One class score'}</span>
                  <span className="block text-xs font-bold text-slate-500">
                    {m === 'teams' ? 'a team per wave, scores rotate' : 'no teams, everybody shouts'}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="How many waves">
            <div className="flex gap-2">
              {[3, 5, 10].map((w) => (
                <button key={w} onClick={() => { update({ waves: w }); audio.tick(); }}
                  className={cn('flex-1 rounded-xl border-2 py-3 text-xl font-black transition',
                    settings.waves === w ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-400')}>
                  {w}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Pace" hint="Pace is the whole difficulty dial: speed, how fast words come, and how many may land.">
            <div className="space-y-2">
              {PACE_IDS.map((id) => (
                <button key={id} onClick={() => { update({ pace: id }); audio.tick(); }}
                  className={cn('flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition',
                    settings.pace === id ? 'border-slate-900 bg-white' : 'border-slate-200 bg-slate-50')}>
                  <span>
                    <span className="block text-lg font-black text-slate-900">{PACE[id].label}</span>
                    <span className="block text-xs font-bold text-slate-500">{PACE[id].blurb}</span>
                  </span>
                  <Chip tone={settings.pace === id ? 'rose' : 'slate'}>{PACE[id].capacity} land = flood</Chip>
                </button>
              ))}
            </div>
          </Field>

          <Toggle on={settings.cam} onChange={(v) => update({ cam: v })} label="📷 Camera behind the words" />
        </Card>

        {/* words */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900">📚 Words</h3>
            <Chip tone="violet">{wordsInPlay} words in play</Chip>
          </div>

          <Toggle on={settings.mixed} onChange={(v) => update({ mixed: v })} label="🎲 A different category every wave" />

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = enabled.some((e) => e.id === c.id);
              return (
                <button key={c.id} onClick={() => toggleCategory(c.id)}
                  className={cn('rounded-2xl border-2 px-3 py-2 text-left font-black transition',
                    on ? 'border-slate-900 bg-white' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                  <span className="block">{c.icon} {c.name}</span>
                  <span className="block text-xs font-bold text-slate-500">{c.items.length} words</span>
                </button>
              );
            })}
          </div>

          {!canStart && (
            <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">
              Switch a category back on — a wave needs at least four words.
            </p>
          )}

          <Field label="Your own words" hint="One per line: emoji word, then any extra ways to say it. “😀 happy, glad, cheerful” — or paste a whole vocabulary list.">
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={4}
              placeholder={'😀 happy, glad\n🐢 turtle, tortoise\nprocrastinate ⏳'}
              className={inputCls}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Btn variant="primary" onClick={addPasted} disabled={!paste.trim()}>＋ Add to the deck</Btn>
            {custom.length > 0 && <Chip tone="emerald">{custom.length} added</Chip>}
          </div>

          {custom.length > 0 && (
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-2xl bg-slate-50 p-3">
              {custom.map((i) => (
                <button key={i.name} onClick={() => removeCustom(i.name)} title="Remove"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-bold text-slate-700 hover:border-rose-300 hover:text-rose-600">
                  {i.emoji} {i.name} ✕
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* teams + kit */}
        <Card className="space-y-4">
          <h3 className="text-2xl font-black text-slate-900">🙌 Teams</h3>
          {settings.mode === 'solo' ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-base font-semibold text-slate-600">
              One class score — the scoreboard shows a single total and the class shouts together.
              Switch to teams above to rotate the shout-out.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {TEAM_PRESETS.map((t) => {
                  const on = teams.some((x) => x.id === t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTeam(t)}
                      className={cn('rounded-2xl border-2 px-4 py-2 font-black transition',
                        on ? 'border-slate-900 bg-white' : 'border-slate-200 bg-slate-50 text-slate-400')}
                      style={{ color: on ? t.color : undefined }}>
                      {t.emoji} {t.name}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {teams.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 p-3">
                    <Avatar style={AVATAR_STYLES[hash(t.id) % AVATAR_STYLES.length].id} seed={t.id + t.name} size={44} ring={t.color} />
                    <span className="text-2xl">{t.emoji}</span>
                    <input value={t.name} onChange={(e) => setTeams((cur) => cur.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
                      className="w-full rounded-xl border-2 border-slate-200 px-3 py-1.5 font-bold" />
                  </div>
                ))}
              </div>
            </>
          )}

          <hr className="border-slate-200" />

          <h3 className="text-2xl font-black text-slate-900">🎙 Kit check</h3>
          <div className="space-y-2">
            <Btn size="sm" variant={recognitionSupported() ? 'primary' : 'ghost'} disabled={!recognitionSupported()} onClick={testMic}>
              🎙 Test the microphone
            </Btn>
            <p className="text-sm font-semibold text-slate-600">
              {micTest ?? (recognitionSupported()
                ? 'Say one word from the list — if it shows up here, the class can shout.'
                : 'This browser has no speech recognition. The type box in the game still pops words.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Toggle on={settings.music} onChange={(v) => update({ music: v })} label="Music" />
            <Toggle on={settings.sfx} onChange={(v) => update({ sfx: v })} label="Sound FX" />
          </div>

          <Field label={`Projector text size — ${Math.round(settings.fontScale * 100)}%`}>
            <input type="range" min={0.9} max={1.45} step={0.01} value={settings.fontScale}
              onChange={(e) => update({ fontScale: +e.target.value })} className="w-full accent-rose-600" />
          </Field>

          <Field label="Announcer voice" hint="Nothing is read aloud on its own — the announcer only speaks when you tap 🔊.">
            <div className="flex gap-2">
              <select value={settings.narrator} onChange={(e) => update({ narrator: e.target.value })} className={inputCls}>
                {voices.length === 0 && <option>Loading system voices…</option>}
                {pool.map((v) => <option key={v.uri} value={v.uri}>{v.natural ? '★ ' : ''}{v.name} ({v.lang})</option>)}
              </select>
              <Btn onClick={() => say('Words are falling. Shout the name and pop every copy!')}>▶</Btn>
            </div>
          </Field>
        </Card>
      </div>

      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-base font-bold text-slate-600">
          {settings.waves} waves · {PACE[(isPace(settings.pace) ? settings.pace : 'normal')].label} · {wordsInPlay} words ·{' '}
          {settings.mode === 'solo' ? 'one class score' : teams.map((t) => t.emoji + ' ' + t.name).join(' vs ')}
        </p>
        <Btn variant="ok" size="lg" disabled={!canStart} onClick={() => { resetSession(); onStart(); }}>
          ▶ Start the flood
        </Btn>
      </div>
    </div>
  );
}
