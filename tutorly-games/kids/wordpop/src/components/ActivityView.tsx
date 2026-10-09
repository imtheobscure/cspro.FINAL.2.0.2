"use client";

import { Theme, Activity, ACTIVITIES } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { ui } from "@/lib/i18n";
import { href } from "@/lib/route";
import { BackLink } from "./ui";
import { Emoji } from "./WordImage";
import { Learn } from "./activities/Learn";
import { Chant } from "./activities/Chant";
import { Quiz } from "./activities/Quiz";
import { Match } from "./activities/Match";
import { Memory } from "./activities/Memory";
import { Listen } from "./activities/Listen";
import { sfx } from "@/lib/sfx";

const ICONS: Record<Activity, string> = { learn: "📖", chant: "🎵", quiz: "❓", match: "🧩", memory: "🃏", listen: "👂" };

export function ActivityView({ theme, activity }: { theme: Theme; activity: Activity }) {
  const s = useSettings();
  const target = s.target;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <BackLink href={href.theme(theme.id)} label={theme.title[target] ?? theme.title.en} />
        <div className="ml-auto flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-ink/10">
          {ACTIVITIES.map((a) => (
            <a
              key={a}
              href={href.activity(theme.id, a)}
              onClick={() => sfx.tick()}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${a === activity ? "bg-ink text-white" : "text-ink-soft hover:bg-cream-2"}`}
              title={ui(target, a)}
            >
              <span>{ICONS[a]}</span>
              <span className="hidden md:inline">{ui(target, a)}</span>
            </a>
          ))}
        </div>
      </div>

      <h1 className="font-display flex items-center gap-3 text-3xl font-bold text-ink sm:text-4xl">
        <Emoji emoji={theme.emoji} size={40} /> {theme.title[target] ?? theme.title.en} · {ICONS[activity]} {ui(target, activity)}
      </h1>

      {!s.ready ? (
        <div className="py-20 text-center text-2xl text-ink-soft">…</div>
      ) : (
        <div key={`${activity}-${target}-${s.support}`}>
          {activity === "learn" && <Learn theme={theme} />}
          {activity === "chant" && <Chant theme={theme} />}
          {activity === "quiz" && <Quiz theme={theme} />}
          {activity === "match" && <Match theme={theme} />}
          {activity === "memory" && <Memory theme={theme} />}
          {activity === "listen" && <Listen theme={theme} />}
        </div>
      )}
    </div>
  );
}
