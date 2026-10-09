"use client";

import { useMemo, useState } from "react";
import { GRID_QUESTIONS, buildPokerDeck, type PokerCard } from "@/content/pack";
import { Avatar, Btn, Chip, Panel } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { sfx } from "@/lib/audio";
import { avatarUrl } from "@/lib/avatars";
import { asset } from "@/lib/basePath";

type Seat = { id: string; name: string; avatar: string; chips: number; hand: PokerCard[]; folded: boolean; bet: number; npc: boolean };

const CATS = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];

function evaluate(cards: PokerCard[]) {
  const vals = cards.map((c) => c.value).sort((a, b) => b - a);
  const bySuit = new Map<string, number[]>();
  cards.forEach((c) => bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c.value]));
  const counts = new Map<number, number>();
  vals.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flushSuit = [...bySuit.entries()].find(([, v]) => v.length >= 5);
  const straightIn = (arr: number[]) => {
    const u = [...new Set(arr)].sort((a, b) => b - a);
    if (u.includes(14)) u.push(1);
    let run = 1;
    for (let i = 1; i < u.length; i++) {
      if (u[i] === u[i - 1] - 1) { run++; if (run >= 5) return u[i] + 4; } else run = 1;
    }
    return 0;
  };
  const sf = flushSuit ? straightIn(flushSuit[1]) : 0;
  if (sf) return { cat: 8, score: 8e10 + sf, label: `${CATS[8]} to ${sf}` };
  if (groups[0][1] === 4) return { cat: 7, score: 7e10 + groups[0][0] * 100, label: CATS[7] };
  if (groups[0][1] === 3 && groups[1]?.[1] >= 2) return { cat: 6, score: 6e10 + groups[0][0] * 100 + groups[1][0], label: CATS[6] };
  if (flushSuit) return { cat: 5, score: 5e10 + Math.max(...flushSuit[1]), label: CATS[5] };
  const st = straightIn(vals);
  if (st) return { cat: 4, score: 4e10 + st, label: `${CATS[4]} to ${st}` };
  if (groups[0][1] === 3) return { cat: 3, score: 3e10 + groups[0][0] * 100, label: CATS[3] };
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) return { cat: 2, score: 2e10 + groups[0][0] * 100 + groups[1][0], label: CATS[2] };
  if (groups[0][1] === 2) return { cat: 1, score: 1e10 + groups[0][0] * 100 + vals[0], label: CATS[1] };
  return { cat: 0, score: vals[0] * 100 + vals[1], label: CATS[0] };
}

export default function Poker() {
  const a = useArena();
  const bank = a.questions.length >= 12 ? a.questions : GRID_QUESTIONS;
  const [deck, setDeck] = useState<PokerCard[]>(() => buildPokerDeck(GRID_QUESTIONS).sort(() => Math.random() - 0.5));
  const [seats, setSeats] = useState<Seat[]>([]);
  const [board, setBoard] = useState<PokerCard[]>([]);
  const [pot, setPot] = useState(0);
  const [street, setStreet] = useState(0);
  const [hand, setHand] = useState(1);
  const [msg, setMsg] = useState("Deal to start the hand.");
  const [swap, setSwap] = useState<{ card: PokerCard; index: number } | null>(null);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [showdown, setShowdown] = useState<string | null>(null);

  const hero = seats[0];

  const deal = () => {
    const d = buildPokerDeck(bank).sort(() => Math.random() - 0.5);
    const humans = a.s.teams.slice(0, 3);
    const npcs = ["Vera", "Ike", "Sol"].slice(0, Math.max(1, 4 - humans.length));
    const list: Seat[] = [
      ...humans.map((t) => ({ id: t.id, name: t.name, avatar: t.avatar, chips: 1000, hand: [] as PokerCard[], folded: false, bet: 0, npc: false })),
      ...npcs.map((n) => ({ id: `npc-${n}`, name: n, avatar: avatarUrl("bottts", n), chips: 1000, hand: [] as PokerCard[], folded: false, bet: 0, npc: true })),
    ];
    let k = 0;
    list.forEach((s) => { s.hand = [d[k++], d[k++]]; });
    setSeats(list);
    setDeck(d.slice(k));
    setBoard([]); setPot(30); setStreet(0); setShowdown(null); setMsg(`Hand ${hand}: blinds posted. ${list[0].name} to act.`);
    sfx("deal");
  };

  const npcAct = (pool: Seat[]) => pool.map((s) => {
    if (!s.npc || s.folded) return s;
    const r = Math.random();
    if (r < 0.15) { setMsg((m) => `${m} · ${s.name} folds.`); return { ...s, folded: true }; }
    const amount = r > 0.82 ? 80 : 40;
    setPot((p) => p + amount);
    return { ...s, chips: s.chips - amount, bet: s.bet + amount };
  });

  const act = (kind: "check" | "call" | "raise" | "fold") => {
    if (!hero) return;
    sfx(kind === "fold" ? "buzz" : "coin");
    let next = [...seats];
    if (kind === "fold") next[0] = { ...next[0], folded: true };
    if (kind === "call" || kind === "raise") {
      const amount = kind === "raise" ? 100 : 40;
      next[0] = { ...next[0], chips: next[0].chips - amount, bet: next[0].bet + amount };
      setPot((p) => p + amount);
    }
    next = npcAct(next);
    setSeats(next);
    advance(next);
  };

  const advance = (current: Seat[]) => {
    const d = [...deck];
    if (street === 0) { setBoard(d.splice(0, 3)); setMsg("Flop."); }
    else if (street === 1) { setBoard((b) => [...b, d.splice(0, 1)[0]]); setMsg("Turn."); }
    else if (street === 2) { setBoard((b) => [...b, d.splice(0, 1)[0]]); setMsg("River."); }
    else {
      const live = current.filter((s) => !s.folded);
      const scored = live.map((s) => ({ s, e: evaluate([...s.hand, ...board]) })).sort((x, y) => y.e.score - x.e.score);
      const w = scored[0];
      setShowdown(`${w.s.name} wins ${pot} with ${w.e.label}.`);
      sfx("applause");
      if (!w.s.npc) a.addPoints(w.s.id, Math.round(pot / 4));
      a.log({ gameKey: "poker", teamName: w.s.name, skill: "Speaking · Risk & reasoning", grammarPoint: "Hold'em question swaps", correct: !w.s.npc, points: Math.round(pot / 4), detail: { hand: w.e.label } });
      setHand((h) => h + 1);
      setStreet(4);
      return;
    }
    setDeck(d);
    setStreet((s) => s + 1);
    sfx("card");
  };

  const trySwap = (ok: boolean) => {
    setAnswered(ok);
    if (!ok || !swap || !hero) { sfx("wrong"); a.addPoints(hero?.id ?? "", -25); return; }
    sfx("correct");
    const d = [...deck];
    const replacement = d.shift()!;
    const next = [...seats];
    const h = [...next[0].hand];
    h[swap.index] = replacement;
    next[0] = { ...next[0], hand: h };
    setSeats(next);
    setDeck([...d, swap.card]);
    a.addPoints(hero.id, 120);
    a.log({
      gameKey: "poker", questionId: swap.card.question.id, teamId: hero.id, teamName: hero.name,
      skill: swap.card.question.skill, grammarPoint: swap.card.question.grammarPoint, correct: true, points: 120,
    });
    setTimeout(() => { setSwap(null); setAnswered(null); }, 900);
  };

  const remaining = useMemo(() => deck.slice(0, 24), [deck]);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#4ade80">Hand {hand}</Chip>
        <Chip colour="#eab308">Pot {pot}</Chip>
        <Chip colour="#38bdf8">{["Pre-flop", "Flop", "Turn", "River", "Showdown"][street]}</Chip>
        <Btn size="sm" tone="amber" className="ml-auto" onClick={deal}>{seats.length ? "New hand" : "Deal"}</Btn>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-emerald-900/60">
        <img src={asset("/images/poker.svg")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative p-4">
          <div className="flex min-h-24 flex-wrap items-center justify-center gap-2">
            {board.map((c) => <CardFace key={c.code} c={c} />)}
            {!board.length && <p className="text-sm text-emerald-200/70">Community cards appear here.</p>}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {seats.map((s, i) => (
              <div key={s.id} className={`rounded-2xl border p-2 ${s.folded ? "border-white/5 bg-black/40 opacity-40" : i === 0 ? "border-amber-400/60 bg-amber-500/10" : "border-white/10 bg-black/30"}`}>
                <div className="flex items-center gap-2">
                  <Avatar src={s.avatar} name={s.name} size={28} />
                  <span className="min-w-0 flex-1 truncate text-xs font-black">{s.name}</span>
                  <span className="text-xs text-amber-300">{s.chips}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {s.hand.map((c, k) => (
                    <button key={c.code} disabled={i !== 0 || street > 3} onClick={() => { setSwap({ card: c, index: k }); setAnswered(null); sfx("card"); }}
                      className="flex-1">
                      <CardFace c={c} hidden={i !== 0 && !showdown} small />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-sm text-emerald-100">{showdown ?? msg}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Btn tone="ghost" onClick={() => act("check")} disabled={!hero || street > 3}>Check</Btn>
            <Btn tone="green" onClick={() => act("call")} disabled={!hero || street > 3}>Call 40</Btn>
            <Btn tone="amber" onClick={() => act("raise")} disabled={!hero || street > 3}>Raise 100</Btn>
            <Btn tone="red" onClick={() => act("fold")} disabled={!hero || street > 3}>Fold</Btn>
          </div>
        </div>
      </div>

      {swap && (
        <Panel title={`Answer to exchange ${swap.card.code}`} right={<Chip colour="#a78bfa">{swap.card.question.difficulty}</Chip>}>
          <p className="text-lg font-bold">{swap.card.question.prompt}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {swap.card.question.options.map((o, k) => (
              <button key={k} disabled={answered !== null} onClick={() => trySwap(swap.card.question.answer.includes(k))}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${answered !== null && swap.card.question.answer.includes(k) ? "border-emerald-400 bg-emerald-500/20" : "border-white/15 bg-white/[0.04] hover:border-white/40"}`}>
                <b className="mr-2 text-slate-500">{"ABCD"[k]}</b>{o}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Btn size="sm" tone="ghost" onClick={() => a.say(swap.card.question.prompt)}>🔊 Read</Btn>
            <Btn size="sm" tone="ghost" onClick={() => { setSwap(null); setAnswered(null); }}>Keep the card</Btn>
          </div>
          {answered === false && <p className="mt-2 rounded-xl border border-rose-400/40 bg-rose-500/10 p-2 text-sm text-rose-100">Wrong — the card stays and you pay a blind (−25).</p>}
        </Panel>
      )}

      <Panel title={`Cards still in the deck (${deck.length})`}>
        <div className="flex flex-wrap gap-1">
          {remaining.map((c) => <span key={c.code} className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-xs" style={{ color: "♥♦".includes(c.suit) ? "#fb7185" : "#e2e8f0" }}>{c.code}</span>)}
          {deck.length > 24 && <span className="text-xs text-slate-500">+{deck.length - 24} more</span>}
        </div>
      </Panel>
    </div>
  );
}

function CardFace({ c, hidden, small }: { c: PokerCard; hidden?: boolean; small?: boolean }) {
  const red = "♥♦".includes(c.suit);
  if (hidden) return <div className={`${small ? "h-14" : "h-20 w-14"} w-full rounded-lg border border-white/20 bg-gradient-to-br from-indigo-900 to-slate-900`} />;
  return (
    <div className={`${small ? "h-14" : "h-20 w-14"} flex w-full flex-col items-center justify-center rounded-lg border border-white/30 bg-white shadow-lg`}>
      <span className={`font-black ${small ? "text-sm" : "text-lg"}`} style={{ color: red ? "#e11d48" : "#0f172a" }}>{c.rank}</span>
      <span className={small ? "text-xs" : "text-base"} style={{ color: red ? "#e11d48" : "#0f172a" }}>{c.suit}</span>
    </div>
  );
}
