"use client";

import { useState } from "react";
import { Brand } from "./Brand";
import { useSettings } from "@/lib/settings";
import { LANGS, Lang } from "@/lib/types";
import { LANG_META } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";
import { href } from "@/lib/route";
import { usePacks } from "@/lib/customPack";

function Toggle({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button
      onClick={() => { sfx.tick(); onClick(); }}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all ${
        on ? "bg-ink text-white shadow-inner" : "bg-white text-ink-soft ring-1 ring-ink/10 hover:bg-cream-2"
      }`}
      aria-pressed={on}
      title={label}
    >
      <span aria-hidden>{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function NavChip({ to, icon, label, title }: { to: string; icon: string; label: string; title: string }) {
  return (
    <a
      href={to}
      onClick={() => sfx.pop()}
      title={title}
      className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-bold text-ink ring-1 ring-ink/10 transition-all hover:-translate-y-0.5 hover:bg-cream-2"
    >
      <span aria-hidden>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}

export function TutorBar() {
  const s = useSettings();
  const packs = usePacks();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
        <Brand />

        <NavChip to={href.pack} icon="📋" label="AI Prompt & JSON" title="Copy the AI prompt, paste the JSON back to install a whole new category — or a lesson plan for a topic you have" />
        <NavChip to={href.lesson()} icon="📚" label="Lesson plan" title="A timed, tutor-ready lesson plan for any topic — scripts, questions and what to expect back" />
        <NavChip to={href.voices} icon="🎤" label="Voice test" title="Read-aloud voice test — the free Microsoft natural voices" />
        <NavChip to={href.home} icon="🏠" label="Topics" title="All topics" />

        {packs.length > 0 && (
          <span className="rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-ink" title="Categories you installed from pasted JSON">
            +{packs.length} custom {packs.length === 1 ? "category" : "categories"}
          </span>
        )}

        {/* Target language */}
        <div className="ml-auto flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-ink/10">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => { sfx.pop(); s.update({ target: l, support: s.support === l ? "none" : s.support }); }}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-bold transition-all ${
                s.target === l ? "bg-sky text-ink shadow" : "text-ink-soft hover:bg-cream-2"
              }`}
              title={`Teach in ${LANG_META[l].name}`}
              aria-pressed={s.target === l}
            >
              <span className="text-lg leading-none">{LANG_META[l].flag}</span>
              <span className="hidden xl:inline">{LANG_META[l].native}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full bg-white px-3 py-2 text-sm font-bold text-ink ring-1 ring-ink/10 hover:bg-cream-2"
          aria-expanded={open}
        >
          🎛️ <span className="hidden sm:inline">Tutor</span> {open ? "▲" : "▼"}
        </button>

        {s.learner && (
          <div className="flex items-center gap-1 rounded-full bg-sun/60 px-3 py-1.5 text-sm font-bold text-ink">
            <span className="text-lg">{s.learner.avatar}</span>
            <span className="hidden sm:inline">{s.learner.name}</span>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-ink/5 bg-white/70">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 text-sm sm:px-6">
            <span className="font-bold text-ink-soft">Support language:</span>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => s.update({ support: "none" })}
                className={`rounded-full px-3 py-1.5 font-bold ${s.support === "none" ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10"}`}
              >
                None (monolingual)
              </button>
              {LANGS.filter((l) => l !== s.target).map((l: Lang) => (
                <button
                  key={l}
                  onClick={() => s.update({ support: l })}
                  className={`rounded-full px-3 py-1.5 font-bold ${s.support === l ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10"}`}
                >
                  {LANG_META[l].flag} {LANG_META[l].native}
                </button>
              ))}
            </div>
            <span className="mx-2 hidden h-6 w-px bg-ink/10 sm:block" />
            <Toggle on={s.showCCQ} onClick={() => s.update({ showCCQ: !s.showCCQ })} label="Talk-time questions" icon="💬" />
            <Toggle on={s.autoSpeak} onClick={() => s.update({ autoSpeak: !s.autoSpeak })} label="Auto read-aloud" icon="🔊" />
            <Toggle on={s.sound} onClick={() => s.update({ sound: !s.sound })} label="Sound effects" icon="🎵" />
            <span className="mx-2 hidden h-6 w-px bg-ink/10 sm:block" />
            <NavChip to={href.voices} icon="🎤" label="Voice settings" title="Pick and test the read-aloud voice for each language" />
          </div>
        </div>
      )}
    </header>
  );
}
