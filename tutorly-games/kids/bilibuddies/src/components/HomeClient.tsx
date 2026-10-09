"use client";

import { useMemo, useState } from "react";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { BigButton, Chip } from "@/components/ui/BigButton";
import { WordArt } from "@/components/ui/WordArt";
import { StarIcon, RightIcon, GridIcon } from "@/components/ui/icons";
import { THEMES, WORD_COUNT, SUBTHEMES } from "@/data/dictionary";
import { LANGS } from "@/data/languages";
import type { LangCode } from "@/data/types";
import { MODES } from "@/lib/studio";
import type { StudentRow } from "@/lib/studio";
import { href, navigate } from "@/lib/route";
import { addStudent as storeStudent, listStudents, stats as studioStats } from "@/lib/students";
import { sfx, unlockAudio } from "@/lib/sfx";
import { primeVoices, speak } from "@/lib/tts";

const AVATARS = ["🦊", "🐼", "🦄", "🐯", "🐸", "🐰", "🐻", "🐥", "🦁", "🐳"];

/**
 * The home screen. The roster and the stars are read from this device (see
 * `lib/students.ts`) instead of being handed down by a server component, so the
 * whole page is static and works offline — and a tutor's list of children stays
 * on their own machine.
 */
export function HomeClient() {
  const [students, setStudents] = useState<StudentRow[]>(() => listStudents());
  const [stats] = useState(() => studioStats());
  const [target, setTarget] = useState<LangCode>((students[0]?.targetLang as LangCode) ?? "en");
  const [support, setSupport] = useState<LangCode | "none">((students[0]?.homeLang as LangCode) ?? "none");
  const [student, setStudent] = useState<StudentRow | null>(students[0] ?? null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const greeting = useMemo(() => LANGS.find((l) => l.id === target)?.hi ?? "Hi!", [target]);

  /** Everything is a hash screen in the static build — deep links still work. */
  const open = (themeId: string, subId: string, mode = "learn") => {
    unlockAudio();
    primeVoices();
    sfx.whoosh();
    navigate(href.studio(themeId, subId, mode));
  };

  const addStudent = () => {
    const n = name.trim();
    if (!n) return;
    const created = storeStudent({
      name: n,
      avatar,
      color: "#6FA8E8",
      homeLang: support === "none" ? "en" : support,
      targetLang: target,
    });
    setStudents((s) => [...s, created]);
    setStudent(created);
    setName("");
  };

  return (
    <div className="min-h-[100dvh] w-full">
      {/* nav */}
      <nav className="sticky top-0 z-40 flex items-center gap-4 border-b-4 border-line/70 bg-cream/85 px-6 py-3 backdrop-blur">
        <Logo size={40} tag={false} />
        <span className="hidden text-[0.95rem] font-bold text-inksoft md:block">
          Tutor-controlled language studio for ages 3–6
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-sun/20 px-4 py-2 sm:flex">
            <StarIcon size={20} className="text-[#F2A62B]" />
            <span className="display text-[1.05rem] font-extrabold">{stats.stars}</span>
            <span className="text-[0.85rem] font-bold text-inksoft">stars · {stats.lessons} lessons</span>
          </div>
          <BigButton variant="primary" size="md" onClick={() => open(THEMES[0].id, THEMES[0].subthemes[0].id)}>
            Open studio <RightIcon size={20} />
          </BigButton>
        </div>
      </nav>

      {/* hero */}
      <header className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 pt-10 lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="display mb-3 inline-flex items-center gap-2 rounded-full bg-mint/15 px-4 py-2 text-[1rem] font-extrabold text-mint">
            🧒 {greeting} · Built for screen-share lessons
          </div>
          <h1 className="display text-[clamp(2.4rem,5.6vw,4.6rem)] font-extrabold leading-[1.02] text-ink">
            First words that children
            <span className="text-branddeep"> say out loud</span>.
          </h1>
          <p className="mt-4 max-w-[62ch] text-[clamp(1.05rem,1.5vw,1.35rem)] font-semibold leading-relaxed text-inksoft">
            {WORD_COUNT} hand-picked words across {SUBTHEMES.length} themes, in six languages — with chants, drag &amp; drop
            games, picture quizzes and CCQ question cards that keep the child talking. Calm colours, giant type, natural
            kids&apos; voices. You drive; they speak.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { k: "🎶", v: "Chants" },
              { k: "💬", v: "CCQ talk time" },
              { k: "🧲", v: "Drag & drop" },
              { k: "🔊", v: "Azure kids voices" },
              { k: "🔤", v: "Letters & numbers" },
              { k: "🧺", v: "Sorting baskets" },
            ].map((x) => (
              <span key={x.v} className="sticker display rounded-full px-4 py-2 text-[1rem] font-bold text-ink">
                {x.k} {x.v}
              </span>
            ))}
          </div>
        </div>

        <div className="sticker sticker-lg relative w-full max-w-[420px] shrink-0 p-6" style={{ background: "#FFF7E6" }}>
          <div className="display mb-3 text-[1.05rem] font-extrabold uppercase tracking-wide text-inksoft">Choose your child</div>
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  sfx.pop();
                  setStudent(s);
                  setTarget((s.targetLang as LangCode) ?? target);
                  setSupport((s.homeLang as LangCode) ?? "none");
                }}
                className="pressable no-select flex items-center gap-2 rounded-2xl border-2 px-3 py-2"
                style={{
                  borderColor: student?.id === s.id ? s.color : "#ECE0CF",
                  background: student?.id === s.id ? `${s.color}1f` : "#fff",
                }}
              >
                <span className="text-[1.7rem] leading-none">{s.avatar}</span>
                <span className="display text-[1.1rem] font-extrabold text-ink">{s.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStudent()}
              placeholder="New child's name…"
              className="display min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 py-2.5 text-[1.05rem] font-bold text-ink outline-none focus:border-brand"
            />
            <BigButton variant="mint" size="md" onClick={addStudent}>
              Add
            </BigButton>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`rounded-xl px-1.5 py-1 text-[1.4rem] transition ${avatar === a ? "bg-sun/35 ring-2 ring-sun" : "hover:bg-line/40"}`}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2">
            <LogoMark size={30} />
            <span className="text-[0.88rem] font-bold leading-snug text-inksoft">
              Stars and lesson logs are saved per child, so you can pick up exactly where you left off.
            </span>
          </div>
        </div>
      </header>

      {/* languages */}
      <section className="mx-auto mt-10 max-w-[1400px] px-6">
        <div className="sticker p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex-1">
              <div className="display mb-2 text-[1.05rem] font-extrabold uppercase tracking-wide text-inksoft">
                1 · Teaching language
              </div>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      sfx.pop();
                      setTarget(l.id);
                      void speak(l.hi, { lang: l.id });
                    }}
                    className="pressable no-select flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5"
                    style={{
                      borderColor: target === l.id ? "#FF8A5B" : "#ECE0CF",
                      background: target === l.id ? "#FF8A5B1f" : "#fff",
                    }}
                  >
                    <span className="text-[1.6rem] leading-none">{l.flag}</span>
                    <span className="display text-[1.15rem] font-extrabold text-ink">{l.native}</span>
                    <span className="text-[0.9rem] font-bold text-inksoft/70">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <div className="display mb-2 text-[1.05rem] font-extrabold uppercase tracking-wide text-inksoft">
                2 · Bridge language <span className="normal-case text-inksoft/60">(or stay monolingual)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip active={support === "none"} onClick={() => setSupport("none")}>
                  🚫 None — monolingual
                </Chip>
                {LANGS.filter((l) => l.id !== target).map((l) => (
                  <Chip key={l.id} active={support === l.id} onClick={() => setSupport(l.id)}>
                    {l.flag} {l.native}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-[0.92rem] font-semibold text-inksoft/80">
                With a bridge language every card shows both words and the tutor can translate with one tap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* themes */}
      <section className="mx-auto mt-8 max-w-[1400px] px-6 pb-6">
        <div className="mb-4 flex items-end gap-3">
          <h2 className="display text-[clamp(1.8rem,3.4vw,2.8rem)] font-extrabold text-ink">
            <GridIcon size={30} className="mr-2 inline text-brand" />
            3 · Pick a theme
          </h2>
          <span className="mb-2 text-[1rem] font-bold text-inksoft">tap a topic to jump straight into the studio</span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {THEMES.map((th) => (
            <article
              key={th.id}
              className="sticker pressable flex flex-col gap-3 p-5"
              style={{ background: th.soft, borderColor: `${th.color}55` }}
            >
              <div className="flex items-center gap-3">
                <span className="floaty text-[3rem] leading-none">{th.emoji}</span>
                <div>
                  <h3 className="display text-[clamp(1.35rem,2.2vw,1.9rem)] font-extrabold leading-tight text-ink">
                    {th.t[target]}
                  </h3>
                  <p className="text-[0.95rem] font-bold text-inksoft/80">{th.t.en}</p>
                </div>
                <button
                  onClick={() => open(th.id, th.subthemes[0].id)}
                  className="pressable ml-auto flex h-12 w-12 items-center justify-center rounded-full border-b-4 text-white"
                  style={{ background: th.color, borderColor: "rgba(59,52,85,0.22)" }}
                  aria-label={`Start ${th.t.en}`}
                >
                  <RightIcon size={24} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {th.subthemes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => open(th.id, s.id, s.kind === "numbers" ? "count" : s.kind === "letters" ? "abc" : "learn")}
                    className="pressable no-select flex items-center gap-1.5 rounded-xl border-2 bg-white/85 px-2.5 py-1.5 text-[0.98rem] font-bold text-ink"
                    style={{ borderColor: `${th.color}44` }}
                  >
                    <WordArt emoji={s.emoji} size={20} alt="" />
                    {s.t[target]}
                    <span className="text-[0.8rem] font-bold text-inksoft/60">{s.words.length}</span>
                  </button>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-2 text-[0.92rem] font-bold text-inksoft/80">
                <span className="rounded-full bg-white/80 px-3 py-1">
                  {th.subthemes.reduce((n, s) => n + s.words.length, 0)} words
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1">🎶 theme chant</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* how a lesson runs */}
      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="sticker p-6">
          <h2 className="display mb-4 text-[clamp(1.5rem,2.8vw,2.2rem)] font-extrabold text-ink">
            A 20-minute lesson, already planned for you
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              { n: "1", emoji: "🎶", title: "Warm up with a chant", body: "Sing the theme chant twice. Clap on every beat. The child hums along before any new word appears." },
              { n: "2", emoji: "🃏", title: "Learn 6 new words", body: "Giant flashcards, one tap = natural kids' voice. Star every word the child says out loud." },
              { n: "3", emoji: "🎯", title: "Play two games", body: "Listen & find, word match or basket sort — all drag & drop, all big enough to read on a shared screen." },
              { n: "4", emoji: "💬", title: "Talk time (CCQ)", body: "Finish with question cards. Simple concept-checking questions, sentence frames and 8 seconds of silent thinking time." },
            ].map((s) => (
              <div key={s.n} className="rounded-[24px] border-2 border-line bg-cream/60 p-4">
                <div className="display mb-2 flex items-center gap-2 text-[1.1rem] font-extrabold text-branddeep">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">{s.n}</span>
                  {s.emoji} {s.title}
                </div>
                <p className="text-[0.98rem] font-semibold leading-snug text-inksoft">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            {MODES.map((m) => (
              <div key={m.id} className="rounded-2xl border-2 border-line bg-white p-3">
                <div className="display text-[1.05rem] font-extrabold text-ink">
                  {m.emoji} {m.label}
                </div>
                <div className="text-[0.82rem] font-semibold leading-snug text-inksoft/85">{m.blurb}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 pb-10 text-[0.92rem] font-semibold text-inksoft/80">
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="display text-[1.05rem] font-extrabold text-ink">Tutorly LinguaPlay</span>
        </div>
        <span>
          Low-stimulation by design: soft cream palette, no strobing, no timers that punish, no ads, no external tracking.
          Every picture comes from one Twemoji SVG family (CC-BY 4.0) so the whole dictionary looks like a single
          illustration set.
        </span>
        <span>
          Read aloud uses Azure Neural child voices (en-GB-Maisie, zh-CN-Xiaoshuang, fr-FR-Eloise, de-DE-Gisela…) and
          falls back to the browser voice if no key is configured.
        </span>
      </footer>
    </div>
  );
}
