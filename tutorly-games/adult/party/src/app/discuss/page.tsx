"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DEBATE_FORMAT, DEBATE_RUBRIC, DEBATE_TOPICS, DISCUSSION_SETS } from "@/content/debate";
import { Btn, Chip, Panel } from "@/components/ui";
import { speak, stopSpeaking } from "@/lib/speech";
import { sfx } from "@/lib/audio";

export default function DiscussPage() {
  const [tag, setTag] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(DEBATE_TOPICS[0].id);
  const tags = useMemo(() => ["all", ...new Set(DEBATE_TOPICS.flatMap((t) => t.tags))], []);
  const list = DEBATE_TOPICS.filter((t) => tag === "all" || t.tags.includes(tag));

  const copyPack = (id: string) => {
    const t = DEBATE_TOPICS.find((x) => x.id === id)!;
    const text = [
      `MOTION: ${t.motion}`, `Hook: ${t.hook}`, `Level: ${t.cefr} · heat ${t.heat}/3`, "", `CONTEXT: ${t.context}`, "",
      "FOR:", ...t.forArguments.map((x) => `• ${x.claim} — ${x.evidence} [${x.language}]`), "",
      "AGAINST:", ...t.againstArguments.map((x) => `• ${x.claim} — ${x.evidence} [${x.language}]`), "",
      "VOCABULARY:", ...t.vocabulary.map((v) => `• ${v.word} = ${v.meaning} — "${v.example}"`), "",
      "FRAMES:", ...t.frames.map((f) => `• ${f.function}: ${f.phrases.join(" / ")}`), "",
      "FOLLOW-UPS:", ...t.followUps.map((f) => `• ${f}`), "", `CURVEBALL: ${t.curveball}`,
    ].join("\n");
    navigator.clipboard?.writeText(text);
    sfx("correct");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-amber-300">Talk library</p>
          <h1 className="neon text-4xl font-black">Discussion & Debate</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Twelve motions with prepared cases for both sides, target vocabulary, sentence frames, a timed format and a five-point rubric —
            plus four warm-up discussion sets for the first five minutes of class.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/arena" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">Open the Debate Arena →</Link>
          <Link href="/" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10">Setup</Link>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button key={t} onClick={() => setTag(t)}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${tag === t ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-white/10 bg-white/5 text-slate-400"}`}>{t}</button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {list.map((t) => (
            <article key={t.id} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50">
              <button onClick={() => { setOpen(open === t.id ? null : t.id); sfx("card"); }} className="flex w-full items-stretch gap-3 text-left">
                {t.media[0]?.url
                  ? <img src={t.media[0].url} alt="" className="h-28 w-40 shrink-0 object-cover" />
                  : <div className="sheen h-28 w-40 shrink-0 bg-slate-800" />}
                <div className="min-w-0 flex-1 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip colour="#fbbf24">{t.cefr}</Chip>
                    <Chip colour="#fb7185">heat {"🔥".repeat(t.heat)}</Chip>
                    {t.tags.map((x) => <Chip key={x} colour="#38bdf8">{x}</Chip>)}
                  </div>
                  <h2 className="mt-1 text-lg font-black leading-tight">{t.motion}</h2>
                  <p className="text-xs text-slate-400">{t.hook}</p>
                </div>
              </button>

              {open === t.id && (
                <div className="animate-rise space-y-3 border-t border-white/10 p-4">
                  <p className="text-sm text-slate-300">{t.context}</p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {t.media.map((m, i) => (
                      <figure key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                        {m.type === "image" && m.url
                          ? <img src={m.url} alt={m.caption} className="h-40 w-full object-cover" />
                          : <div className="sheen h-40 w-full bg-gradient-to-br from-slate-800 to-slate-900" />}
                        <figcaption className="p-2 text-[11px] text-slate-300">
                          {m.caption}<span className="block text-slate-500">{m.notice}</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3">
                      <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">For</p>
                      {t.forArguments.map((x, i) => (
                        <p key={i} className="mb-1.5 text-sm"><b className="text-emerald-200">{x.claim}</b><br /><span className="text-xs text-slate-300">{x.evidence} · <i>{x.language}</i></span></p>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3">
                      <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-rose-300">Against</p>
                      {t.againstArguments.map((x, i) => (
                        <p key={i} className="mb-1.5 text-sm"><b className="text-rose-200">{x.claim}</b><br /><span className="text-xs text-slate-300">{x.evidence} · <i>{x.language}</i></span></p>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3">
                      <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-amber-300">Vocabulary</p>
                      {t.vocabulary.map((v) => <p key={v.word} className="text-sm"><b>{v.word}</b> — {v.meaning} <span className="text-xs text-slate-400">“{v.example}”</span></p>)}
                    </div>
                    <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-3">
                      <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-sky-300">Frames</p>
                      {t.frames.map((f) => <p key={f.function} className="text-sm"><b>{f.function}:</b> {f.phrases.join(" / ")}</p>)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Follow-ups</p>
                    <ul className="text-sm">{t.followUps.map((f, i) => <li key={i}>❓ {f}</li>)}</ul>
                    <p className="mt-2 text-sm text-violet-200">🌀 Curveball: {t.curveball}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Btn tone="amber" onClick={() => copyPack(t.id)}>📋 Copy the whole motion pack</Btn>
                    <Btn tone="blue" onClick={() => { stopSpeaking(); void speak(`${t.motion}. ${t.context}`); }}>🔊 Read the motion</Btn>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        <aside className="space-y-3">
          <Panel title="Format & timing">
            <ol className="space-y-1 text-sm">
              {DEBATE_FORMAT.map((p) => (
                <li key={p.phase} className="flex justify-between gap-2 border-b border-white/5 pb-1">
                  <span className="font-bold">{p.phase}</span><span className="text-slate-400">{p.seconds}s</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Judging rubric">
            <ul className="space-y-1 text-sm">
              {DEBATE_RUBRIC.map((r) => <li key={r.id}><b>{r.label}</b> <span className="text-xs text-slate-400">— {r.hint}</span></li>)}
            </ul>
          </Panel>
          {DISCUSSION_SETS.map((d) => (
            <Panel key={d.id} title={d.title}>
              <p className="mb-2 text-xs text-slate-400">{d.prompt}</p>
              {d.kind === "images" ? (
                <div className="grid grid-cols-3 gap-1">
                  {d.items.map((s, i) => <img key={i} src={s} alt="" className="h-16 w-full rounded-lg object-cover" />)}
                </div>
              ) : (
                <ol className="list-decimal space-y-1 pl-4 text-sm">{d.items.map((s, i) => <li key={i}>{s}</li>)}</ol>
              )}
              <p className="mt-2 text-xs text-sky-300">{d.language.join(" · ")}</p>
            </Panel>
          ))}
        </aside>
      </div>
    </main>
  );
}
