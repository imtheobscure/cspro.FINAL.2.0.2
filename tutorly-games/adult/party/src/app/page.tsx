"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GAMES } from "@/content/pack";
import { LUCK_DECK } from "@/content/cards";
import { AVATAR_PACKS, avatarUrl, randomAvatar } from "@/lib/avatars";
import { buildCopyPrompt } from "@/lib/prompt";
import { defaultSettings, newSession, saveState, type Settings, type Team } from "@/components/arena/provider";
import { Avatar, Btn, Chip, Modal, Panel } from "@/components/ui";
import { music, sfx } from "@/lib/audio";
import { createRoom as openRoom, importPack, listPacks } from "@/lib/localApi";
import { asset, joinUrl } from "@/lib/basePath";
import QrImage from "@/components/qr-image";

type PackRow = { slug: string; title: string; cefr: string; topic: string };

export default function SetupPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [pack, setPack] = useState<string>("adventurer");
  const [seed, setSeed] = useState<string>("Nova7");
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [game, setGame] = useState<string>("grid");
  const [tutor, setTutor] = useState({ name: "", avatar: "" });
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [chosenPack, setChosenPack] = useState<{ slug: string; title: string }>({ slug: "built-in", title: "Work, Travel & Modern Life (built-in)" });
  const [promptOpen, setPromptOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [luckOpen, setLuckOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string; problems?: string[] } | null>(null);
  const [po, setPo] = useState({ cefr: "B1", l1: "Spanish", topic: "Work, travel and modern life", lessonTitle: "Unit 6 — Getting things done" });

  useEffect(() => {
    const stored = window.localStorage.getItem("pma-tutor");
    if (stored) setTutor(JSON.parse(stored));
    const a = randomAvatar();
    setPack(a.pack); setSeed(a.seed);
    setPacks(listPacks());
    setTeams([{ id: "device", name: "This device", avatar: avatarUrl("thumbs", "device"), score: 0, streak: 0, powers: [] }]);
  }, []);

  const preview = useMemo(() => avatarUrl(pack, seed), [pack, seed]);

  const addTeam = () => {
    const n = name.trim();
    if (!n) return;
    sfx("coin");
    setTeams((t) => [...t, { id: `t${Date.now()}`, name: n, avatar: preview, score: 0, streak: 0, powers: [] }]);
    setName("");
    const a = randomAvatar(); setPack(a.pack); setSeed(a.seed);
  };

  const addTutor = () => {
    const n = tutor.name.trim() || "Tutor";
    const av = tutor.avatar || avatarUrl("notionists", n);
    window.localStorage.setItem("pma-tutor", JSON.stringify({ name: n, avatar: av }));
    setTutor({ name: n, avatar: av });
    if (teams.some((t) => t.isTutor)) return;
    sfx("powerup");
    setTeams((t) => [...t, { id: "tutor", name: n, avatar: av, score: 0, streak: 0, powers: [], isTutor: true }]);
  };

  const createRoom = () => {
    const r = openRoom({ hostName: tutor.name || "Tutor" });
    if (r.code) { setRoomCode(r.code); sfx("reveal"); }
  };

  const doImport = () => {
    setImportMsg(null);
    const d = importPack(importText);
    if (!d.ok) { setImportMsg({ ok: false, text: d.error ?? "Rejected", problems: d.problems }); sfx("wrong"); return; }
    setImportMsg({ ok: true, text: `Imported "${d.pack.title}" (${d.pack.cefr}).` });
    setChosenPack({ slug: d.pack.slug, title: d.pack.title });
    setPacks((p) => [{ slug: d.pack.slug, title: d.pack.title, cefr: d.pack.cefr, topic: "" }, ...p]);
    sfx("correct");
  };

  const start = () => {
    if (!teams.length) return;
    const st = newSession(teams, settings, chosenPack);
    st.activeGame = game as typeof st.activeGame;
    st.roomCode = roomCode;
    saveState(st);
    sfx("whoosh");
    router.push("/arena");
  };

  const join = typeof window !== "undefined" && roomCode ? joinUrl(roomCode) : "";

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-6">
      <header className="relative mb-6 overflow-hidden rounded-3xl border border-white/10">
        <img src={asset("/images/hero.svg")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="relative bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-amber-300">Classroom game show</p>
              <h1 className="neon mt-1 text-4xl font-black tracking-tight sm:text-5xl">Party</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                One lesson, seventeen game environments, one tutor-controlled screen. Everything on the board comes from your lesson —
                and every answer turns into a colour-coded mini lesson.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/play" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">📱 Play on phones</Link>
              <Link href="/discuss" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">⚖️ Discussion & debate library</Link>
              <Btn tone="ghost" size="sm" onClick={() => music("lobby")}>🔊 Start the soundtrack</Btn>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* WHO IS AT THE TABLE */}
        <div className="space-y-5">
          <Panel title="1 · Who is at the table" right={<Chip colour="#34d399">{teams.length} on the board</Chip>}>
            <div className="flex gap-3">
              <div className="shrink-0 text-center">
                <img src={preview} alt="avatar preview" className="h-20 w-20 rounded-2xl border border-white/15 bg-slate-800" />
                <button className="mt-1 text-[11px] font-bold text-sky-300 hover:underline"
                  onClick={() => { const a = randomAvatar(); setPack(a.pack); setSeed(a.seed); sfx("card"); }}>
                  🎲 shuffle
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <input
                  value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTeam()}
                  placeholder="Team or player name…"
                  className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
                <div className="flex gap-2">
                  <select value={pack} onChange={(e) => setPack(e.target.value)}
                    className="flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-2 py-2 text-xs">
                    {AVATAR_PACKS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <Btn tone="green" onClick={addTeam}>Add team</Btn>
                </div>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <Avatar src={t.avatar} name={t.name} size={36} ring={t.isTutor ? "#f59e0b" : undefined} />
                  <span className="flex-1 text-sm font-bold">{t.name}</span>
                  {t.isTutor && <Chip colour="#f59e0b">tutor</Chip>}
                  {t.id === "device" && <Chip colour="#38bdf8">this machine</Chip>}
                  <button className="text-xs text-rose-300 hover:underline" onClick={() => setTeams((x) => x.filter((y) => y.id !== t.id))}>remove</button>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-300">Add tutor from your profile</p>
              <div className="flex gap-2">
                <input value={tutor.name} onChange={(e) => setTutor({ ...tutor, name: e.target.value })} placeholder="Tutor name"
                  className="flex-1 rounded-lg border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm" />
                <input value={tutor.avatar} onChange={(e) => setTutor({ ...tutor, avatar: e.target.value })} placeholder="Photo URL (optional)"
                  className="flex-1 rounded-lg border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm" />
                <Btn tone="amber" onClick={addTutor}>Add tutor</Btn>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Saved to this browser, so you never retype it.</p>
            </div>
          </Panel>

          <Panel title="2 · Play on phones" right={roomCode ? <Chip colour="#f472b6">room {roomCode}</Chip> : null}>
            {!roomCode ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-300">Open a room and learners join with a code, a name and an avatar — from a second window on this machine. The game is a plain folder (no server), so the join link only reaches this browser.</p>
                <Btn tone="violet" onClick={createRoom}>Open room</Btn>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <QrImage text={join} className="h-32 w-32 rounded-xl bg-white p-1" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-3xl font-black tracking-[0.3em] text-amber-300">{roomCode}</p>
                  <p className="truncate text-xs text-slate-400">{join}</p>
                  <Btn tone="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(join)}>Copy join link</Btn>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="3 · Lesson content" right={<Chip colour="#38bdf8">{chosenPack.title}</Chip>}>
            <div className="flex flex-wrap gap-2">
              <Btn tone="amber" onClick={() => setPromptOpen(true)}>📋 Copy the AI prompt</Btn>
              <Btn tone="blue" onClick={() => setImportOpen(true)}>⬇️ Paste the AI answer</Btn>
              <Btn tone="ghost" onClick={() => setChosenPack({ slug: "built-in", title: "Work, Travel & Modern Life (built-in)" })}>Use built-in pack</Btn>
            </div>
            {packs.length > 0 && (
              <ul className="mt-3 space-y-1">
                {packs.slice(0, 5).map((p) => (
                  <li key={p.slug}>
                    <button onClick={() => setChosenPack({ slug: p.slug, title: p.title })}
                      className={`w-full rounded-lg border px-3 py-1.5 text-left text-xs ${chosenPack.slug === p.slug ? "border-sky-400 bg-sky-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/10"}`}>
                      {p.title} · <span className="text-slate-400">{p.cefr}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-xs text-slate-300">Luck deck: <b className="text-white">{LUCK_DECK.filter((c) => settings.luck[c.id]).length}</b> of 17 cards live</span>
              <Btn tone="ghost" size="sm" onClick={() => setLuckOpen(true)}>Configure</Btn>
            </div>
          </Panel>
        </div>

        {/* GAME PICKER */}
        <Panel title="4 · Which game" right={<Chip colour="#f59e0b">{GAMES.find((g) => g.key === game)?.name}</Chip>}>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {GAMES.map((g) => (
              <button key={g.key} onClick={() => { setGame(g.key); sfx("card"); }}
                className={`tile-3d group rounded-2xl border p-3 text-left transition ${game === g.key ? "border-amber-400 bg-amber-500/10 shadow-[0_0_30px_-10px_rgba(245,158,11,.9)]" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black" style={{ color: g.accent }}>{g.n}. {g.name}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.tag}</p>
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-slate-400">{g.blurb}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-4">
            <Btn tone="green" size="lg" className="text-lg" onClick={start} disabled={!teams.length}>▶ Start Game</Btn>
            <p className="text-xs text-slate-300">
              The board opens with {teams.length} player{teams.length === 1 ? "" : "s"} on <b className="text-white">{GAMES.find((g) => g.key === game)?.name}</b>.
              You can switch games at any time from the header.
            </p>
          </div>
        </Panel>
      </div>

      {/* PROMPT MODAL */}
      <Modal open={promptOpen} onClose={() => setPromptOpen(false)} title="Copy the AI prompt" wide>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          {(["cefr", "l1", "topic", "lessonTitle"] as const).map((k) => (
            <label key={k} className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {k}
              <input value={po[k]} onChange={(e) => setPo({ ...po, [k]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950/60 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-white" />
            </label>
          ))}
        </div>
        <textarea readOnly value={buildCopyPrompt(po)} className="h-80 w-full rounded-xl border border-white/15 bg-slate-950/70 p-3 font-mono text-[11px] leading-relaxed" />
        <div className="mt-3 flex gap-2">
          <Btn tone="amber" onClick={() => { navigator.clipboard?.writeText(buildCopyPrompt(po)); sfx("correct"); }}>Copy to clipboard</Btn>
          <span className="text-xs text-slate-400">Paste it into any AI, add your lesson material underneath, then bring the JSON back.</span>
        </div>
      </Modal>

      {/* IMPORT MODAL */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Paste the AI answer" wide>
        <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{ "meta": { … }, "grid": [ … 64 questions … ] }'
          className="h-72 w-full rounded-xl border border-white/15 bg-slate-950/70 p-3 font-mono text-[11px]" />
        <div className="mt-3 flex items-center gap-2">
          <Btn tone="green" onClick={doImport}>Validate & import</Btn>
          <Btn tone="ghost" onClick={() => { setImportText(""); setImportMsg(null); }}>Clear</Btn>
        </div>
        {importMsg && (
          <div className={`mt-3 rounded-xl border p-3 text-sm ${importMsg.ok ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-rose-400/40 bg-rose-500/10 text-rose-200"}`}>
            <p className="font-bold">{importMsg.text}</p>
            {importMsg.problems && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">{importMsg.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          </div>
        )}
      </Modal>

      {/* LUCK DECK MODAL */}
      <Modal open={luckOpen} onClose={() => setLuckOpen(false)} title="The luck deck (17 cards)" wide>
        <div className="mb-3 flex flex-wrap gap-2">
          <Btn tone="amber" onClick={() => setSettings({ ...settings, luck: Object.fromEntries(LUCK_DECK.map((c) => [c.id, true])) })}>Full classic set</Btn>
          <Btn tone="blue" onClick={() => setSettings({ ...settings, luck: Object.fromEntries(LUCK_DECK.map((c) => [c.id, c.jr])) })}>Classic Jr (gentler)</Btn>
          <Btn tone="ghost" onClick={() => setSettings({ ...settings, luck: Object.fromEntries(LUCK_DECK.map((c) => [c.id, false])) })}>Take none</Btn>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {LUCK_DECK.map((c) => (
            <button key={c.id} onClick={() => setSettings({ ...settings, luck: { ...settings.luck, [c.id]: !settings.luck[c.id] } })}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left ${settings.luck[c.id] ? "border-white/25 bg-white/[0.06]" : "border-white/5 bg-black/20 opacity-45"}`}>
              <span className="text-2xl">{c.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-black" style={{ color: c.colour }}>{c.name}</span>
                <span className="block text-[11px] text-slate-300">{c.blurb}</span>
                <span className="block text-[11px] text-slate-500">{c.rule}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </main>
  );
}
