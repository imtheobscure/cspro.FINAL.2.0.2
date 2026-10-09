"use client";

import { useState } from "react";
import { useCatalogue, themesIn } from "@/lib/catalogue";
import { useSettings } from "@/lib/settings";
import { addLearner, removeLearner, totalStars, useLearners, type Learner } from "@/lib/store";
import { usePacks } from "@/lib/customPack";
import { ui, LANG_META } from "@/lib/i18n";
import { href } from "@/lib/route";
import { Emoji } from "./WordImage";
import { Mascot } from "@/lib/shell";
import { BigButton } from "./ui";
import { sfx } from "@/lib/sfx";
import { speak } from "@/lib/tts";

const AVATARS = ["🐣", "🐼", "🦊", "🐸", "🦄", "🐝", "🐙", "🦁", "🐧", "🐨"];

export function Home() {
  const s = useSettings();
  const cat = useCatalogue();
  const packs = usePacks();
  const learners = useLearners();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [adding, setAdding] = useState(false);
  const target = s.target;

  const add = () => {
    if (!name.trim()) return;
    const row = addLearner(name, avatar);
    sfx.star();
    s.update({ learner: { id: row.id, name: row.name, avatar: row.avatar } });
    setName("");
    setAdding(false);
  };

  const remove = (l: Learner) => {
    if (!confirm(`Remove ${l.name} and their stars?`)) return;
    removeLearner(l.id);
    if (s.learner?.id === l.id) s.update({ learner: null });
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="card-soft relative overflow-hidden bg-gradient-to-br from-white via-cream-2 to-rose/40 px-6 py-8 sm:px-10">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-ink-soft ring-1 ring-ink/10">
              🎓 Tutorly Kids · ages 3–6 · {LANG_META[target].flag} {LANG_META[target].name}
              {s.support !== "none" && <> + {LANG_META[s.support].flag} {LANG_META[s.support].name}</>}
            </p>
            <h1 className="font-display text-5xl font-bold leading-tight text-ink sm:text-6xl">
              {ui(target, "hello")} <span className="text-coral-deep">{ui(target, "letsLearn")}</span>
            </h1>
            <p className="mt-3 max-w-xl text-xl text-ink-soft">
              {cat.themes.length} topics · {cat.words} words · 6 activities each — with chants, quizzes, matching and talk-time questions. Made for screen-sharing tutors.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <BigButton tone="coral" onClick={() => { sfx.unlock(); void speak(`${ui(target, "hello")} ${ui(target, "letsLearn")}`, target); }}>
                🔊 {ui(target, "hello")}
              </BigButton>
              <BigButton tone="sky" href="#topics">🗺️ {ui(target, "pickTheme")}</BigButton>
              <BigButton tone="mint" href={href.pack}>📋 AI Prompt &amp; JSON</BigButton>
              <BigButton tone="lilac" href={href.voices}>🎤 Voice test</BigButton>
            </div>
          </div>
          <Mascot size={220} className="anim-float mx-auto drop-shadow-lg" />
        </div>
      </section>

      {/* Learners */}
      <section className="card-soft px-6 py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-bold">👧 Learners</h2>
          <button onClick={() => setAdding((a) => !a)} className="rounded-full bg-ink px-4 py-2 font-bold text-white">
            {adding ? "Close" : "+ Add learner"}
          </button>
        </div>
        {adding && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-cream-2 p-3">
            <div className="flex flex-wrap gap-1">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setAvatar(a)} className={`h-11 w-11 rounded-full text-2xl ${avatar === a ? "bg-sun ring-2 ring-ink" : "bg-white"}`}>{a}</button>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Child's name"
              className="h-11 min-w-40 flex-1 rounded-full border-2 border-ink/10 bg-white px-4 text-lg font-bold outline-none focus:border-sky"
              maxLength={30}
            />
            <BigButton tone="mint" size="sm" onClick={add}>Save</BigButton>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => s.update({ learner: null })}
            className={`rounded-full px-4 py-2 font-bold ${!s.learner ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10"}`}
          >
            👀 Guest
          </button>
          {learners.map((l) => (
            <div key={l.id} className={`group flex items-center gap-1 rounded-full pr-1 ${s.learner?.id === l.id ? "bg-sun" : "bg-white ring-1 ring-ink/10"}`}>
              <button onClick={() => { sfx.pop(); s.update({ learner: { id: l.id, name: l.name, avatar: l.avatar } }); }} className="flex items-center gap-2 px-4 py-2 text-lg font-bold">
                <span className="text-2xl">{l.avatar}</span> {l.name}
                <span className="text-sm text-ink-soft">⭐ {totalStars(l.id)}</span>
              </button>
              <button onClick={() => remove(l)} className="h-8 w-8 rounded-full text-ink-soft opacity-0 hover:bg-coral/20 group-hover:opacity-100" title="Remove">✕</button>
            </div>
          ))}
          {learners.length === 0 && <span className="self-center text-ink-soft">No learners yet — add one to save stars on this device.</span>}
        </div>
      </section>

      {/* Topics */}
      <section id="topics" className="space-y-8">
        <h2 className="font-display text-4xl font-bold">🗺️ {ui(target, "pickTheme")}</h2>
        {cat.categories.map((category) => {
          const themes = themesIn(cat, category.id);
          if (!themes.length) return null;
          const isCustom = themes.every((t) => cat.customThemeIds.has(t.id));
          return (
            <div key={category.id}>
              <h3 className="font-display mb-3 flex items-center gap-2 text-2xl font-bold text-ink">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: category.color }}>
                  <Emoji emoji={category.emoji} size={24} />
                </span>
                {category.title[target] ?? category.title.en}
                {s.support !== "none" && category.title[s.support] && (
                  <span className="text-lg font-bold text-ink-soft">· {category.title[s.support]}</span>
                )}
                {isCustom && (
                  <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-ink" title="Installed from pasted AI JSON on this device">
                    🤖 your pack
                  </span>
                )}
              </h3>
              <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {themes.map((t) => (
                  <a
                    key={t.id}
                    href={href.theme(t.id)}
                    onClick={() => sfx.pop()}
                    className="card-soft group flex items-center gap-3 p-3 transition-all hover:-translate-y-1 hover:shadow-xl sm:p-4"
                    style={{ borderBottom: `6px solid ${category.color}` }}
                  >
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:rotate-3 group-hover:scale-110" style={{ background: category.color + "88" }}>
                      <Emoji emoji={t.emoji} size={40} />
                    </span>
                    <span className="min-w-0">
                      <span className="font-display block truncate text-xl font-bold leading-tight">{t.title[target] ?? t.title.en}</span>
                      {s.support !== "none" && t.title[s.support] && <span className="block truncate text-sm text-ink-soft">{t.title[s.support]}</span>}
                      <span className="block text-xs font-bold text-ink-soft/70">{t.words.length} words</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* The AI-prompt path: the tutor's own content */}
      <section className="card-soft bg-gradient-to-br from-white to-mint/30 px-6 py-6">
        <h2 className="font-display text-3xl font-bold">🤖 Need a topic that is not here?</h2>
        <p className="mt-2 max-w-3xl text-lg text-ink-soft">
          Copy this game&apos;s prompt into ChatGPT, Claude or Gemini and paste the JSON it returns back into the app — a whole new
          category appears on this page with its own themes, words, emoji and games.
          {packs.length > 0 && <> You have {packs.length} custom {packs.length === 1 ? "category" : "categories"} installed on this device.</>}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <BigButton tone="mint" href={href.pack}>📋 Open AI Prompt &amp; JSON</BigButton>
          <BigButton tone="white" href={href.voices}>🎤 Test the read-aloud voice</BigButton>
        </div>
      </section>

      <footer className="pt-6 text-center text-sm text-ink-soft">
        <p>
          Made with 💛 by <b>Tutorly</b>. Art: Twemoji (CC-BY 4.0). Voices: the free Microsoft Azure “Online (Natural)” voices built into
          Microsoft Edge — nothing to pay, no key, no server.
        </p>
      </footer>
    </div>
  );
}
