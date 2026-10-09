"use client";

import { useState } from "react";
import { LANGS, Lang } from "@/lib/types";
import { LANG_META, ui } from "@/lib/i18n";
import { VoiceOption, sampleFor, speak, useVoices, voiceReports } from "@/lib/tts";
import { useSettings } from "@/lib/settings";
import { href } from "@/lib/route";
import { BackLink, BigButton } from "./ui";
import { sfx } from "@/lib/sfx";

const VOICE_ICON = (v: VoiceOption) => (v.child ? "🧒" : v.azure ? "☁️" : "💻");

function Row({
  label,
  hint,
  tone,
  children,
}: {
  label: string;
  hint?: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-ink/5">
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-xs font-black text-ink" style={{ background: tone }}>
          {label}
        </span>
        {hint && <span className="truncate text-xs font-bold text-ink-soft" title={hint}>{hint}</span>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function VoiceLab() {
  const s = useSettings();
  const voices = useVoices();
  const reports = voiceReports(voices);
  const [busy, setBusy] = useState<Lang | null>(null);
  const supported = typeof window !== "undefined" && !!window.speechSynthesis;
  const azureCount = reports.reduce((sum, r) => sum + r.azure.length, 0);

  const test = async (lang: Lang, text: string, slow = false) => {
    sfx.tick();
    setBusy(lang);
    await speak(text, lang, { slow });
    setBusy(null);
  };

  const testAll = async () => {
    setBusy(s.target);
    for (const r of reports) {
      await speak(r.sample, r.lang, { slow: true });
    }
    setBusy(null);
  };

  const choose = (lang: Lang, uri: string) => {
    sfx.pop();
    s.update({ voices: { ...s.voices, [lang]: uri } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <BackLink href={href.home} label={ui(s.target, "home")} />
        <BigButton tone="sky" size="md" onClick={() => void testAll()}>
          🔊 Test every language
        </BigButton>
      </div>

      <header className="card-soft px-6 py-6">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">🎤 Read-aloud voice test</h1>
        <p className="mt-2 max-w-3xl text-lg text-ink-soft">
          This game reads every card, chant and question with the <b>free Microsoft “Online (Natural)” voices</b> — the very same Azure
          neural voices Microsoft Edge uses for Read Aloud. They include the child voices (Ana, Maisie, Xiaoshuang, Eloise, Pierina,
          Gisela), cost nothing, need no key and no server. Press a button below and listen; if a language only offers a device voice,
          the card explains what to do.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
          <span className={`rounded-full px-3 py-1 ${azureCount ? "bg-mint" : "bg-rose"}`}>
            {azureCount ? `☁️ ${azureCount} Microsoft natural voices found` : "⚠️ no Microsoft natural voice found in this browser"}
          </span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-ink/10">🔊 {voices.length} browser voices in total</span>
          {!supported && <span className="rounded-full bg-coral px-3 py-1 text-white">This browser has no speech engine</span>}
        </div>
      </header>

      {!azureCount && (
        <div className="card-soft border-l-8 border-sun px-5 py-4 text-lg">
          <b>To get the good voices:</b> open this page in <b>Microsoft Edge</b> (Windows, Mac, Android or iOS). Edge ships the
          Microsoft “Online (Natural)” voices and exposes them to the page — they also work in Edge on a phone or tablet. Chrome,
          Firefox and Safari usually offer only their own offline voices, which sound more robotic; the game still works, it just
          reads with what that browser has.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {reports.map((r) => {
          const chosen = s.voices[r.lang] ?? r.best?.uri ?? "";
          const options = voices.length ? [...r.azure, ...r.others] : [];
          return (
            <section key={r.lang} className="card-soft px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-3xl">{LANG_META[r.lang].flag}</span>
                <h2 className="font-display text-2xl font-bold">{LANG_META[r.lang].name}</h2>
                {r.lang === s.target && <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-black">teaching now</span>}
                {r.best?.azure && <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-black">☁️ Microsoft natural</span>}
              </div>

              <p className="mt-2 text-base font-bold text-ink-soft">{r.sample}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <BigButton tone="sky" size="sm" onClick={() => void test(r.lang, r.sample)} disabled={busy === r.lang}>
                  {busy === r.lang ? "…" : "🔊"} Test
                </BigButton>
                <BigButton tone="white" size="sm" onClick={() => void test(r.lang, r.sample, true)}>🐢 Slow</BigButton>
                <BigButton tone="sun" size="sm" onClick={() => void test(r.lang, `${r.sample} ${r.sample}`)}>⏭ Longer</BigButton>
              </div>

              <div className="mt-3 space-y-2">
                <Row
                  label="voice"
                  tone={r.best?.azure ? "#8fd9b6" : "#ffd166"}
                  hint={r.best ? `${r.best.name} (${r.best.lang})` : "no voice for this language on this device"}
                >
                  {options.length === 0 ? (
                    <p className="text-sm font-bold text-ink-soft">
                      Nothing installed for {LANG_META[r.lang].name} in this browser — open the game in Microsoft Edge.
                    </p>
                  ) : (
                    <select
                      value={chosen}
                      onChange={(e) => choose(r.lang, e.target.value)}
                      className="w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold outline-none focus:border-sky"
                      title="The voice this language reads with everywhere in the game"
                    >
                      {options.map((v) => (
                        <option key={v.uri} value={v.uri}>
                          {VOICE_ICON(v)} {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  )}
                </Row>

                <details className="rounded-2xl bg-cream-2 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-bold text-ink-soft">
                    {options.length} voice{options.length === 1 ? "" : "s"} available ·{" "}
                    {r.azure.length ? `${r.azure.length} Microsoft natural` : "no Microsoft natural voice"}
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {options.slice(0, 24).map((v) => (
                      <li key={v.uri} className="flex items-center gap-2">
                        <span title={v.child ? "child voice" : v.azure ? "Microsoft online voice" : "device voice"}>{VOICE_ICON(v)}</span>
                        <span className="font-bold">{v.name}</span>
                        <span className="text-ink-soft">{v.lang}</span>
                        <button
                          className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold ring-1 ring-ink/10 hover:bg-sun/50"
                          onClick={() => void test(r.lang, r.sample)}
                          title="Test with the selected voice"
                        >
                          use
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </section>
          );
        })}
      </div>

      <section className="card-soft px-5 py-4">
        <h2 className="font-display text-2xl font-bold">🧪 What this test checks</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-lg text-ink-soft">
          {LANGS.map((l) => (
            <li key={l}>
              {LANG_META[l].flag} {LANG_META[l].name} — the word cards, chants and talk-time questions are read in this voice.
            </li>
          ))}
          <li>Nothing is uploaded and nothing is billed: the voice runs in the browser.</li>
        </ul>
      </section>
    </div>
  );
}
