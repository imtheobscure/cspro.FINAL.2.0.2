"use client";

import { useEffect, useMemo, useState } from "react";
import { BigButton, Chip } from "@/components/ui/BigButton";
import { Logo } from "@/components/ui/Logo";
import { EyeIcon, GridIcon, HomeIcon, SpeakerIcon, StarIcon } from "@/components/ui/icons";
import { WordArt } from "@/components/ui/WordArt";
import { LANGS } from "@/data/languages";
import { MODES, useStudio } from "@/lib/studio";
import type { StudentRow } from "@/lib/studio";
import type { LangCode } from "@/data/types";
import { sfx } from "@/lib/sfx";

const AVATARS = ["🦊", "🐼", "🦄", "🐯", "🐸", "🐰", "🐻", "🐥", "🦁", "🐳"];

export function TutorRail({
  students,
  onAddStudent,
  cinema,
  setCinema,
  onHome,
}: {
  students: StudentRow[];
  onAddStudent: (s: StudentRow) => void;
  cinema: boolean;
  setCinema: (v: boolean) => void;
  onHome: () => void;
}) {
  const st = useStudio();
  const { settings, patch, theme, subtheme, deck, index, go, mode, setMode, stars } = st;
  const [tab, setTab] = useState<"lesson" | "words" | "find">("lesson");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; emoji: string; word: string; en: string; subtheme: string | null }[]>([]);
  const [azure, setAzure] = useState<"checking" | "on" | "off">("checking");
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState(AVATARS[0]);

  useEffect(() => {
    void fetch("/api/tts")
      .then((r) => r.json())
      .then((d: { azure?: boolean }) => setAzure(d.azure ? "on" : "off"))
      .catch(() => setAzure("off"));
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      void fetch(`/api/dictionary?q=${encodeURIComponent(q.trim())}&lang=${settings.target}`)
        .then((r) => r.json())
        .then((d: { results?: typeof results }) => setResults(d.results ?? []))
        .catch(() => setResults([]));
    }, 220);
    return () => clearTimeout(t);
  }, [q, settings.target]);

  const modeList = useMemo(
    () =>
      MODES.filter((m) => {
        if (subtheme.kind === "numbers") return m.needs === "numbers" || m.needs === "words";
        if (subtheme.kind === "letters") return m.needs === "letters" || m.needs === "words";
        if (m.needs === "bins") return Boolean(subtheme.bins) || st.siblings.length > 0;
        return m.needs === "words";
      }),
    [subtheme, st.siblings],
  );

  const jumpToWord = (subthemeId: string, wordId: string) => {
    st.setSubtheme(subthemeId);
    setTimeout(() => {
      const list = st.deck;
      const i = list.findIndex((w) => w.id === wordId);
      if (i >= 0) go(i);
    }, 80);
  };

  return (
    <aside
      className="scroll-soft flex h-full w-[380px] shrink-0 flex-col gap-4 overflow-y-auto border-l-4 border-line bg-cream/95 px-4 py-4 backdrop-blur"
      style={{ display: cinema ? "none" : undefined }}
    >
      <div className="flex items-center justify-between gap-2">
        <Logo size={34} tag={false} />
        <span className="display rounded-full bg-mint/15 px-3 py-1 text-[0.8rem] font-extrabold uppercase tracking-wide text-mint">
          Tutor console
        </span>
      </div>

      {/* student */}
      <section className="sticker p-3">
        <div className="display mb-2 text-[0.95rem] font-extrabold uppercase tracking-wide text-inksoft">Child</div>
        <div className="flex flex-wrap gap-2">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                sfx.pop();
                st.setStudent(s);
              }}
              className="pressable no-select flex items-center gap-2 rounded-2xl border-2 px-3 py-2"
              style={{
                borderColor: st.student?.id === s.id ? s.color : "#ECE0CF",
                background: st.student?.id === s.id ? `${s.color}1f` : "#fff",
              }}
            >
              <span className="text-[1.6rem] leading-none">{s.avatar}</span>
              <span className="display text-[1.05rem] font-extrabold text-ink">{s.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a child…"
            className="display min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 py-2 text-[1rem] font-bold text-ink outline-none focus:border-brand"
          />
          <BigButton
            variant="mint"
            size="sm"
            onClick={async () => {
              const name = newName.trim();
              if (!name) return;
              const res = await fetch("/api/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, avatar: newAvatar, color: theme.color, homeLang: settings.support === "none" ? "en" : settings.support, targetLang: settings.target }),
              }).catch(() => null);
              const data = (await res?.json().catch(() => null)) as { student?: StudentRow } | null;
              if (data?.student) {
                onAddStudent(data.student);
                st.setStudent(data.student);
                setNewName("");
              }
            }}
          >
            Add
          </BigButton>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setNewAvatar(a)}
              className={`rounded-xl px-1.5 py-1 text-[1.3rem] transition ${newAvatar === a ? "bg-sun/30 ring-2 ring-sun" : "hover:bg-line/40"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      {/* tabs */}
      <div className="flex gap-2">
        {(["lesson", "words", "find"] as const).map((x) => (
          <Chip key={x} active={tab === x} onClick={() => setTab(x)} className="flex-1 capitalize">
            {x === "lesson" ? "🎛 Lesson" : x === "words" ? "📇 Words" : "🔎 Find"}
          </Chip>
        ))}
      </div>

      {tab === "lesson" ? (
        <>
          <section className="sticker p-3">
            <div className="display mb-2 text-[0.95rem] font-extrabold uppercase tracking-wide text-inksoft">Teaching language</div>
            <div className="flex flex-wrap gap-1.5">
              {LANGS.map((l) => (
                <Chip key={l.id} active={settings.target === l.id} color={theme.color} onClick={() => patch({ target: l.id as LangCode })}>
                  <span className="mr-1">{l.flag}</span>
                  {l.native}
                </Chip>
              ))}
            </div>
            <div className="display mt-3 mb-2 text-[0.95rem] font-extrabold uppercase tracking-wide text-inksoft">
              Bridge language <span className="normal-case text-inksoft/60">(bilingual mode)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={settings.support === "none"} onClick={() => patch({ support: "none" })}>
                🚫 Monolingual
              </Chip>
              {LANGS.filter((l) => l.id !== settings.target).map((l) => (
                <Chip key={l.id} active={settings.support === l.id} onClick={() => patch({ support: l.id as LangCode })}>
                  <span className="mr-1">{l.flag}</span>
                  {l.native}
                </Chip>
              ))}
            </div>
          </section>

          <section className="sticker p-3">
            <div className="display mb-2 text-[0.95rem] font-extrabold uppercase tracking-wide text-inksoft">Voice & sound</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={settings.voice === "kid"} color="#35B79A" onClick={() => patch({ voice: "kid" })}>
                🧒 Kids voice
              </Chip>
              <Chip active={settings.voice === "adult"} color="#35B79A" onClick={() => patch({ voice: "adult" })}>
                🧑 Warm voice
              </Chip>
              <Chip active={settings.slow} color="#5AA2EC" onClick={() => patch({ slow: !settings.slow })}>
                🐢 Slower
              </Chip>
              <Chip active={!settings.sfxOn} onClick={() => patch({ sfxOn: !settings.sfxOn })}>
                {settings.sfxOn ? "🔊 Sound on" : "🔇 Sound off"}
              </Chip>
              <Chip active={settings.autoSpeak} color="#FFC145" onClick={() => patch({ autoSpeak: !settings.autoSpeak })}>
                🗣 Auto read
              </Chip>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[0.88rem] font-semibold text-inksoft">
              <SpeakerIcon size={16} />
              {azure === "checking"
                ? "Checking Azure Neural voices…"
                : azure === "on"
                  ? "Azure Neural kids voice connected"
                  : "Azure key not set — using browser voice"}
            </div>
          </section>

          <section className="sticker p-3">
            <div className="display mb-2 text-[0.95rem] font-extrabold uppercase tracking-wide text-inksoft">Stage</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={settings.bigCards} onClick={() => patch({ bigCards: !settings.bigCards })}>
                <GridIcon size={16} className="mr-1 inline" /> Big cards
              </Chip>
              <Chip active={settings.reveal} onClick={() => patch({ reveal: !settings.reveal })}>
                <EyeIcon size={16} className="mr-1 inline" /> Tutor tips
              </Chip>
              <Chip active={cinema} color="#3B3455" onClick={() => setCinema(!cinema)}>
                🎬 Cinema mode
              </Chip>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="sticker flex items-center gap-2 px-3 py-2" style={{ background: "#FFC14522" }}>
                <StarIcon size={22} className="text-[#F2A62B]" />
                <span className="display text-[1.4rem] font-extrabold">{stars}</span>
              </div>
              <span className="text-[0.9rem] font-semibold text-inksoft">
                stars this lesson · {deck.length} words in deck
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <BigButton variant="soft" size="sm" className="flex-1" onClick={onHome}>
                <HomeIcon size={18} /> Themes
              </BigButton>
              <BigButton variant="soft" size="sm" className="flex-1" onClick={st.reset}>
                ↺ Reset stars
              </BigButton>
            </div>
          </section>
        </>
      ) : null}

      {tab === "words" ? (
        <section className="sticker p-3">
          <div className="display mb-2 text-[0.95rem] font-extrabold uppercase tracking-wide text-inksoft">
            {subtheme.t.en} · tap to jump
          </div>
          <div className="scroll-soft grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {deck.map((w, i) => (
              <button
                key={w.id}
                onClick={() => {
                  sfx.tap();
                  go(i);
                }}
                className={`pressable flex items-center gap-2 rounded-2xl border-2 px-2 py-1.5 text-left ${
                  i === index ? "border-transparent text-white" : "border-line bg-white"
                }`}
                style={i === index ? { background: theme.color } : undefined}
              >
                <WordArt emoji={w.emoji} size={26} alt="" />
                <span className="display truncate text-[0.95rem] font-bold">{w.t[settings.target] || w.t.en}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "find" ? (
        <section className="sticker p-3">
          <div className="display mb-2 text-[0.95rem] font-extrabold uppercase tracking-wide text-inksoft">
            Search the dictionary
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="apple / 苹果 / pomme / elma…"
            className="display w-full rounded-2xl border-2 border-line bg-white px-3 py-2.5 text-[1.05rem] font-bold text-ink outline-none focus:border-brand"
          />
          <div className="scroll-soft mt-2 flex max-h-[44vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => r.subtheme && jumpToWord(r.subtheme, r.id)}
                className="pressable flex items-center gap-2 rounded-2xl border-2 border-line bg-white px-2 py-1.5 text-left"
              >
                <WordArt emoji={r.emoji} size={28} alt="" />
                <span className="display text-[1rem] font-extrabold text-ink">{r.word}</span>
                <span className="ml-auto text-[0.8rem] font-bold text-inksoft/70">{r.en}</span>
              </button>
            ))}
            {q.trim().length >= 2 && results.length === 0 ? (
              <span className="text-[0.95rem] font-semibold text-inksoft/70">Nothing found — try “cat”, “红”, “pomme”.</span>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="sticker p-3">
        <div className="display mb-2 text-[0.95rem] font-extrabold uppercase tracking-wide text-inksoft">Game</div>
        <div className="grid grid-cols-2 gap-2">
          {modeList.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`pressable no-select rounded-2xl border-2 px-3 py-2 text-left ${
                mode === m.id ? "border-transparent text-white" : "border-line bg-white"
              }`}
              style={mode === m.id ? { background: theme.color } : undefined}
            >
              <div className="display text-[1.05rem] font-extrabold leading-tight">
                {m.emoji} {m.label}
              </div>
              <div className={`text-[0.78rem] font-semibold leading-tight ${mode === m.id ? "text-white/85" : "text-inksoft/80"}`}>
                {m.blurb}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="pb-2 text-[0.82rem] font-semibold leading-relaxed text-inksoft/80">
        Shortcuts: ← → card · Space say · S star · R shuffle · 1–8 game · C cinema · H hide panel
      </div>
      <div className="pb-4 text-[0.8rem] font-semibold text-inksoft/60">
        {theme.emoji} {theme.t.en} → {subtheme.emoji} {subtheme.t.en} · index {index + 1}/{deck.length}
      </div>
    </aside>
  );
}
