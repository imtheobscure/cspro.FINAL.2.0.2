import { useMemo, useState } from 'react';
import { Avatar, Btn, Card, Chip, Meter } from './ui';
import { useSession } from '../store/Session';
import { AVATAR_STYLES } from '../data/decks';
import { PACE, isPace } from '../lib/pacing';
import { audio } from '../lib/audio';
import { cn } from '../utils/cn';

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/**
 * The scoreboard, and the two minutes after it.
 *
 * A game that ends with a number on a screen wastes the lesson; the class has
 * just spent five minutes shouting words, and that is the moment they will
 * remember them. So the board does three things in order: say who won, show the
 * wave-by-wave run, and hand the tutor the words that BEAT them — the ones that
 * landed — plus a summary they can paste into their lesson notes.
 */
export default function Results({
  onAgain,
  onRoom,
  newBest,
}: {
  onAgain: () => void;
  onRoom: () => void;
  newBest: boolean;
}) {
  const { settings, teams, scores, results, total, best } = useSession();
  const [copied, setCopied] = useState(false);

  const played = results.length > 0;

  const byTeam = useMemo(
    () =>
      teams.map((t) => {
        const rows = results.filter((r) => r.teamId === t.id);
        const popped = rows.reduce((a, r) => a + r.popped, 0);
        const spawned = rows.reduce((a, r) => a + r.spawned, 0);
        return {
          team: t,
          score: scores[t.id] ?? 0,
          waves: rows.length,
          saved: rows.filter((r) => r.saved).length,
          popped,
          rate: spawned ? popped / spawned : 0,
        };
      }).sort((a, b) => b.score - a.score),
    [teams, results, scores],
  );

  /** Words that reached the water: the ones the class did not retrieve in time. */
  const toRevise = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((r) => r.landedWords.forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [results]);

  const winner = byTeam[0];
  const solo = settings.mode === 'solo' || teams.length < 2;
  const paceLabel = PACE[(isPace(settings.pace) ? settings.pace : 'normal')].label;

  const summary = useMemo(() => {
    const lines = [
      `ShoutOut — ${results.length} waves, ${paceLabel} pace, ${new Date().toLocaleDateString()}`,
      solo
        ? `Class total: ${total} points · best session ${Math.max(best, total)}`
        : byTeam.map((b, i) => `${i + 1}. ${b.team.name}: ${b.score} pts (${b.saved}/${b.waves} waves saved, ${Math.round(b.rate * 100)}% of words popped)`).join('\n'),
      toRevise.length ? `Words to revise: ${toRevise.map(([w, n]) => `${w}${n > 1 ? ` ×${n}` : ''}`).join(', ')}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  }, [results.length, paceLabel, solo, total, best, byTeam, toRevise]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      audio.reveal();
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const maxScore = Math.max(1, ...byTeam.map((b) => b.score));

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      {/* hero */}
      <Card className={cn('overflow-hidden bg-gradient-to-br text-white', solo ? 'from-sky-600 to-indigo-700' : 'from-rose-600 to-violet-700')}>
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-7xl">{newBest ? '🏅' : solo ? '🎓' : '🏆'}</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-4xl font-black tracking-tight">
              {!played
                ? 'No waves played yet'
                : newBest
                  ? `New best session — ${total.toLocaleString()} points!`
                  : solo
                    ? `Class total: ${total.toLocaleString()} points`
                    : `${winner?.team.emoji} ${winner?.team.name} wins with ${winner?.score.toLocaleString()} points`}
            </h2>
            <p className="text-lg font-semibold text-white/85">
              {played
                ? `${results.length} wave${results.length === 1 ? '' : 's'} · ${paceLabel} pace · ${results.filter((r) => r.saved).length} saved · ${Math.round(
                    (results.reduce((a, r) => a + r.popped, 0) / Math.max(1, results.reduce((a, r) => a + r.spawned, 0))) * 100,
                  )}% of all words popped`
                : 'End the session early and there is nothing to report — run one wave first.'}
            </p>
          </div>
          {best > 0 && <Chip tone="amber" className="bg-white/15 text-white">Best session {best.toLocaleString()}</Chip>}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        {/* scoreboard */}
        <Card className="space-y-4">
          <h3 className="text-2xl font-black text-slate-900">📊 Scoreboard</h3>
          {byTeam.map((b, i) => (
            <div key={b.team.id} className="space-y-2 rounded-2xl border-2 border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{solo ? '🎓' : i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <Avatar style={AVATAR_STYLES[hash(b.team.id) % AVATAR_STYLES.length].id} seed={b.team.id + b.team.name} size={44} ring={b.team.color} />
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-black" style={{ color: b.team.color }}>{b.team.emoji} {b.team.name}</div>
                  <div className="text-sm font-bold text-slate-500">
                    {b.waves} wave{b.waves === 1 ? '' : 's'} · {b.saved} saved · {b.popped} words popped · {Math.round(b.rate * 100)}% accuracy
                  </div>
                </div>
                <div className="text-3xl font-black tabular-nums text-slate-900">{b.score.toLocaleString()}</div>
              </div>
              <Meter value={b.score / maxScore} tone={b.team.color} height={12} />
            </div>
          ))}
          {!solo && teams.length < 2 && (
            <p className="text-base font-semibold text-slate-500">Only one team was set up — the room can add up to four.</p>
          )}
        </Card>

        {/* revise + summary */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900">🧠 Words that beat you</h3>
              <Chip tone={toRevise.length ? 'rose' : 'emerald'}>{toRevise.length} to revise</Chip>
            </div>
            {toRevise.length ? (
              <>
                <p className="text-base font-semibold text-slate-600">
                  These reached the water — the class did not retrieve them in time. Perfect for tomorrow's warm-up.
                </p>
                <div className="flex flex-wrap gap-2">
                  {toRevise.map(([w, n]) => (
                    <Chip key={w} tone="rose">{w}{n > 1 ? ` ×${n}` : ''}</Chip>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-base font-semibold text-slate-600">
                {played ? 'Nothing landed — the class cleared every word. Raise the pace.' : 'Play a wave to collect the tricky words.'}
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <h3 className="text-2xl font-black text-slate-900">📋 Class summary</h3>
            <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">{summary}</pre>
            <Btn variant={copied ? 'ok' : 'ghost'} onClick={copy}>{copied ? '✓ Copied' : '📋 Copy for your lesson notes'}</Btn>
          </Card>
        </div>
      </div>

      {/* wave by wave */}
      {played && (
        <Card className="space-y-3">
          <h3 className="text-2xl font-black text-slate-900">🎞️ Wave by wave</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left">
              <thead>
                <tr className="text-sm font-black uppercase tracking-wide text-slate-500">
                  <th className="py-2">Wave</th>
                  <th className="py-2">Team</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Popped</th>
                  <th className="py-2">Cleared</th>
                  <th className="py-2">Result</th>
                  <th className="py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const team = teams.find((t) => t.id === r.teamId);
                  const rate = r.spawned ? r.popped / r.spawned : 0;
                  return (
                    <tr key={`${r.wave}-${r.teamId}-${r.ms}`} className="border-t border-slate-100 text-base font-bold text-slate-700">
                      <td className="py-2">{r.wave}</td>
                      <td className="py-2" style={{ color: team?.color }}>{team?.emoji} {team?.name}</td>
                      <td className="py-2">{r.categoryName}</td>
                      <td className="py-2 tabular-nums">{r.popped}/{r.spawned}</td>
                      <td className="py-2 tabular-nums">{Math.round(rate * 100)}%</td>
                      <td className="py-2">{r.saved ? '🏆 saved' : r.survived ? '😮‍💨 survived' : '🌊 drowned'}</td>
                      <td className="py-2 text-right tabular-nums">{r.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 pb-4">
        <Btn variant="ok" size="lg" onClick={onAgain}>🔁 Play again — same room</Btn>
        <Btn size="lg" onClick={onRoom}>🎛 Change the room</Btn>
        <a className="rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-lg font-bold text-slate-800 shadow-sm hover:bg-slate-50"
          href="../talkarena/index.html">🗣️ Open TalkArena ↗</a>
      </div>
    </div>
  );
}
