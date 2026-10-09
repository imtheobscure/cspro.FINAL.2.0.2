"use client";

import { useEffect, useState } from "react";
import { Theme, ACTIVITIES, Activity } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { starsFor, subscribe } from "@/lib/store";
import { ui, speakText, LANG_META } from "@/lib/i18n";
import { href } from "@/lib/route";
import { WordImage, Emoji } from "./WordImage";
import { BackLink, Stars } from "./ui";
import { sfx } from "@/lib/sfx";
import { speak } from "@/lib/tts";
import { useCatalogue, categoryIn } from "@/lib/catalogue";

const ACT_META: Record<Activity, { icon: string; tone: string }> = {
  learn: { icon: "📖", tone: "#BDE0FE" },
  chant: { icon: "🎵", tone: "#FFD6A5" },
  quiz: { icon: "❓", tone: "#CDEAC0" },
  match: { icon: "🧩", tone: "#E2D5F8" },
  memory: { icon: "🃏", tone: "#FFC8DD" },
  listen: { icon: "👂", tone: "#B9F0E1" },
};

export function ThemeHub({ theme }: { theme: Theme }) {
  const s = useSettings();
  const target = s.target;
  const catalogue = useCatalogue();
  const cat = categoryIn(catalogue, theme.category);
  const [stars, setStars] = useState<Record<string, number>>({});
  const learnerId = s.learner?.id;

  useEffect(() => {
    const load = () => setStars(starsFor(learnerId, theme.id));
    load();
    return subscribe("wordpop.stars.v1", load);
  }, [learnerId, theme.id]);

  const total = Object.values(stars).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink href={href.home} label={ui(target, "home")} />
        {s.learner && (
          <span className="rounded-full bg-sun px-4 py-2 font-bold">
            {s.learner.avatar} {s.learner.name} · ⭐ {total} / {ACTIVITIES.length * 3}
          </span>
        )}
      </div>

      <header className="card-soft flex flex-wrap items-center gap-5 px-6 py-6" style={{ borderLeft: `12px solid ${cat?.color ?? "#FFD6A5"}` }}>
        <span className="flex h-24 w-24 items-center justify-center rounded-3xl" style={{ background: cat?.color ?? "#FFD6A5" }}>
          <Emoji emoji={theme.emoji} size={60} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-soft">{(cat?.title[target] ?? cat?.title.en) ?? ""}</p>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">{theme.title[target] ?? theme.title.en}</h1>
          {s.support !== "none" && theme.title[s.support] && (
            <p className="font-display text-2xl text-ink-soft">
              {LANG_META[s.support].flag} {theme.title[s.support]}
            </p>
          )}
        </div>
        <button
          onClick={() => { sfx.tick(); void speak(theme.title[target] ?? theme.title.en, target); }}
          className="btn-3d rounded-full bg-sky px-5 py-3 text-2xl [--shadow:#4ba3e3]"
          title="Hear the theme name"
        >
          🔊
        </button>
      </header>

      <section>
        <h2 className="font-display mb-3 text-3xl font-bold">🎮 {ui(target, "chooseGame")}</h2>
        <div className="stagger grid grid-cols-2 gap-4 md:grid-cols-3">
          {ACTIVITIES.map((a) => (
            <a
              key={a}
              href={href.activity(theme.id, a)}
              onClick={() => sfx.pop()}
              className="card-soft group flex flex-col items-center gap-2 p-5 text-center transition-all hover:-translate-y-1 hover:shadow-xl"
              style={{ background: `linear-gradient(180deg, #fff 0%, ${ACT_META[a].tone}66 100%)` }}
            >
              <span className="text-6xl transition-transform group-hover:-rotate-6 group-hover:scale-110">{ACT_META[a].icon}</span>
              <span className="font-display text-3xl font-bold">{ui(target, a)}</span>
              <span className="text-base text-ink-soft">{ui(target, `${a}Desc` as "learnDesc")}</span>
              <Stars count={stars[a] ?? 0} size="text-2xl" />
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display mb-3 text-3xl font-bold">📚 {theme.words.length} words</h2>
        <div className="stagger grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {theme.words.map((w) => (
            <button
              key={w.id}
              onClick={() => { sfx.pop(); void speak(speakText(target, w), target); }}
              className="card-soft flex flex-col items-center gap-1 p-3 transition-transform hover:scale-105 active:scale-95"
              aria-label={w.t[target]}
            >
              <WordImage word={w} size={72} countEmoji={theme.countEmoji} />
              <span className="font-display text-lg font-bold leading-tight">{w.letter ? `${w.letter} · ` : ""}{w.t[target]}</span>
              {s.support !== "none" && <span className="text-sm text-ink-soft">{w.t[s.support]}</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
