"use client";

import { useEffect, useMemo, useState } from "react";
import { href } from "@/lib/route";
import { LANGS, type Lang } from "@/lib/data/types";
import { label, WORDS } from "@/lib/data";
import { t } from "@/lib/data/phrases";
import { DEFAULT_VOICE, KID_VOICES, allVoices, voicesFor } from "@/lib/speech";
import { useTutor } from "@/lib/store";
import { useVoice } from "@/lib/useSpeech";
import { BigButton } from "@/components/ui/Kit";

/**
 * VOICE TEST — the screen a tutor checks once, then never thinks about again.
 *
 * It answers three questions honestly: which voices this device actually has for
 * each language, whether they are the good Microsoft "(Natural)" neural ones
 * (they are the free Azure voices Edge ships — the same ones its own Read aloud
 * uses, including the child voices Ana, Xiaoshuang, Éloïse, Pierina, Gisela and
 * Emel), and what the game will do when a language has no voice at all.
 *
 * Pressing a Test button speaks with EXACTLY the code path the game modes use, so
 * what the tutor hears here is what the child hears on the board.
 */

/** Live list of the browser's voices (they load a beat after mount). */
function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => allVoices());
  useEffect(() => {
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (!synth) return;
    const load = () => setVoices(allVoices());
    load();
    synth.addEventListener?.("voiceschanged", load);
    const timers = [120, 450, 1200].map((ms) => window.setTimeout(load, ms));
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      timers.forEach((x) => window.clearTimeout(x));
    };
  }, []);
  return voices;
}

const isNatural = (v: SpeechSynthesisVoice) => /online\s*\(natural\)|natural|neural/i.test(v.name) && /microsoft/i.test(v.name);

/** Is this voice the *child* voice for that language (Ana, Xiaoshuang, …)? */
function isKidVoice(lang: Lang, v: SpeechSynthesisVoice | null): boolean {
  if (!v) return false;
  const wanted = KID_VOICES[lang].map((k) => k.id.replace(/^[a-z]{2}-[A-Z]{2}-/, "").replace(/Neural$/, "").toLowerCase());
  const name = v.name.toLowerCase();
  return wanted.some((w) => name.includes(w));
}

export function VoiceLab() {
  const voices = useVoices();
  const targetLang = useTutor((s) => s.targetLang);
  const chosen = useTutor((s) => s.voice);
  const patch = useTutor((s) => s.patch);
  const { say } = useVoice();
  const [busy, setBusy] = useState<string | null>(null);

  const sampleWord = useMemo(() => WORDS.find((w) => w.id === "cat") ?? WORDS[0], []);
  const numberWord = useMemo(
    () => WORDS.find((w) => w.k === "number") ?? WORDS.find((w) => w.id === "one") ?? sampleWord,
    [sampleWord],
  );
  const naturalCount = voices.filter(isNatural).length;

  const reports = LANGS.map((l) => {
    const forLang = voicesFor(l.id, voices);
    return { lang: l, best: forLang[0] ?? null, natural: forLang.filter(isNatural) };
  });

  const speakLine = async (lang: Lang, text: string) => {
    setBusy(lang);
    try {
      await say(text, lang);
    } finally {
      setBusy(null);
    }
  };

  /** Read the same little line in all six languages, one after the other. */
  const speakTour = async () => {
    setBusy("tour");
    try {
      for (const l of LANGS) {
        // eslint-disable-next-line no-await-in-loop
        await say(`${label(sampleWord, l.id)}. ${t("nav.play", l.id)}!`, l.id);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="dot-grid min-h-screen bg-transparent pb-20">
      <header className="border-b-4 border-sand bg-paper/90 px-6 py-4">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3">
          <a href={href.home} className="font-display text-3xl font-extrabold">
            ← PlaySchool
          </a>
          <a href={href.play} className="soft-ring ml-auto rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:bg-sand">
            🎈 Play
          </a>
          <a href={href.pack} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:bg-sand">
            📋 AI Prompt &amp; JSON
          </a>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-8">
        <section className="rounded-[2.2rem] bg-paper p-8 tile-shadow">
          <h1 className="font-display text-4xl font-extrabold">🎤 Read-aloud voice test</h1>
          <p className="mt-3 max-w-[80ch] text-xl leading-snug font-semibold text-inksoft">
            Every word, question and chant is read with the <b>free Microsoft “Online (Natural)” voices</b> — the same Azure
            neural voices Microsoft Edge uses for its own Read aloud, including the <b>child voices</b>. No key, no server,
            nothing to pay. Press a button and listen.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className="rounded-full px-5 py-2 text-lg font-extrabold"
              style={{ background: naturalCount ? "#dff4e6" : "#fde8e0", color: naturalCount ? "#1e7a45" : "#b4451f" }}
            >
              {naturalCount ? `✅ ${naturalCount} Microsoft natural voice(s) found` : "⚠️ no Microsoft natural voice in this browser"}
            </span>
            <span className="rounded-full bg-cream px-5 py-2 text-lg font-extrabold text-inksoft">
              🔊 {voices.length} browser voices in total
            </span>
            <BigButton variant="sage" size="sm" disabled={busy === "tour"} onClick={() => void speakTour()}>
              {busy === "tour" ? "🔊 reading…" : "▶ Test all six languages"}
            </BigButton>
          </div>

          {!naturalCount && (
            <div className="mt-4 rounded-[1.4rem] bg-sunsoft p-5 text-lg font-bold text-ink">
              To get the good voices: open this page in <b>Microsoft Edge</b> (Windows, Mac, Android or iOS). Edge ships the
              Microsoft “Online (Natural)” voices and exposes them to the page. Chrome, Firefox and Safari usually offer only
              their own offline voices — the game still works, it just reads with what that browser has.
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {reports.map(({ lang, best, natural }) => {
            const teaching = lang.id === targetLang;
            const sample = label(sampleWord, lang.id);
            const kid = isKidVoice(lang.id, best);
            return (
              <div key={lang.id} className="rounded-[2rem] bg-paper p-6 tile-shadow">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-4xl">{lang.flag}</span>
                  <div className="font-display text-2xl font-extrabold">{lang.native}</div>
                  {teaching && (
                    <span className="rounded-full bg-coralsoft px-3 py-1 text-base font-extrabold text-coral">teaching now</span>
                  )}
                  {kid && <span className="rounded-full bg-sagesoft px-3 py-1 text-base font-extrabold text-sage">🧒 child voice</span>}
                </div>

                <div className="mt-3 text-xl font-semibold text-inksoft">
                  “{sample}!” · {t("nav.play", lang.id)}!
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <BigButton
                    variant="coral"
                    size="sm"
                    disabled={busy === lang.id}
                    onClick={() => void speakLine(lang.id, `${sample}. ${t("nav.play", lang.id)}!`)}
                  >
                    {busy === lang.id ? "🔊 reading…" : "🔊 Test"}
                  </BigButton>
                  <BigButton variant="sun" size="sm" disabled={busy === lang.id} onClick={() => void speakLine(lang.id, sample)}>
                    🐢 One word
                  </BigButton>
                  <BigButton
                    variant="sky"
                    size="sm"
                    disabled={busy === lang.id}
                    onClick={() => void speakLine(lang.id, label(numberWord, lang.id))}
                  >
                    🔢 Number
                  </BigButton>
                </div>

                <div className="mt-4 text-lg font-bold text-ink">
                  {best ? (
                    <>
                      <span className={natural.length ? "text-sage" : "text-sun"}>
                        {natural.length ? "✨ natural · " : "💻 device · "}
                      </span>
                      {best.name}
                    </>
                  ) : (
                    <span className="text-coral">no voice for this language on this device</span>
                  )}
                </div>

                <div className="mt-1 text-base font-semibold text-inksoft">
                  Game default: <b>{DEFAULT_VOICE[lang.id]}</b> · pitch 1.18 (lifted for a small child) · pace 0.92, or 0.72 on the
                  🐢 slow setting
                </div>

                {best && (
                  <label className="mt-3 block text-lg font-bold text-inksoft">
                    Voice used everywhere in the game
                    <select
                      value={chosen || best.voiceURI}
                      onChange={(e) => patch({ voice: e.target.value })}
                      className="mt-1 w-full rounded-2xl border-2 border-sand bg-cream px-4 py-2 text-lg font-bold text-ink outline-none"
                    >
                      {voicesFor(lang.id, voices).map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {isNatural(v) ? "✨ " : "💻 "}
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {!best && (
                  <p className="mt-2 text-base font-semibold text-inksoft">
                    Nothing installed for {lang.label} — open the game in Microsoft Edge for the natural voices, or read this
                    language aloud yourself.
                  </p>
                )}
              </div>
            );
          })}
        </section>

        <section className="rounded-[2rem] bg-paper p-7 tile-shadow">
          <h2 className="font-display text-3xl font-extrabold">🧪 What this test checks</h2>
          <ul className="mt-3 flex flex-col gap-2 text-lg font-semibold text-inksoft">
            <li>• That at least one voice exists for each of the six languages.</li>
            <li>• That the Microsoft natural (Azure neural) voices are picked over the robotic ones.</li>
            <li>• That the child voice is preferred where the device has one, and the pitch is lifted for a small child.</li>
            <li>• That speaking never hangs the lesson: every utterance has a watchdog.</li>
            <li>• Nothing is uploaded and nothing is billed — the voice runs in this browser.</li>
          </ul>
          <div className="mt-4">
            <BigButton variant="sage" size="md" onClick={() => void say(t("mode.lesson", targetLang), targetLang)}>
              🎧 Say it the way the board does
            </BigButton>
          </div>
        </section>
      </main>
    </div>
  );
}
