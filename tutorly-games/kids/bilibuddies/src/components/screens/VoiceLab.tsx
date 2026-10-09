"use client";

import { useEffect, useMemo, useState } from "react";
import { ALL_WORDS } from "@/data/dictionary";
import { LANGS } from "@/data/languages";
import type { LangCode } from "@/data/types";
import { href } from "@/lib/route";
import { hasNaturalVoices, pickBrowserVoice, speak, stopSpeaking, voicesFor } from "@/lib/tts";
import { BigButton } from "@/components/ui/BigButton";
import { LogoMark } from "@/components/ui/Logo";

/**
 * VOICE TEST — the screen a tutor checks once, then never thinks about again.
 *
 * It answers three questions honestly: which voices this device has for each
 * language, whether they are the good Microsoft "(Natural)" neural ones (the free
 * Azure voices Edge ships — the same ones its own Read aloud uses), and what the
 * game does when a language has no voice at all. Pressing Test speaks through
 * EXACTLY the code path the games use, so what the tutor hears is what the child
 * hears on the studio stage.
 */
function useVoiceList() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    const load = () => setVoices(synth ? synth.getVoices() : []);
    load();
    synth?.addEventListener?.("voiceschanged", load);
    const timers = [120, 450, 1200].map((ms) => window.setTimeout(load, ms));
    return () => {
      synth?.removeEventListener?.("voiceschanged", load);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
  return voices;
}

export function VoiceLab() {
  useVoiceList();
  const [busy, setBusy] = useState<string | null>(null);
  const natural = hasNaturalVoices();
  const sample = useMemo(() => ALL_WORDS.find((w) => w.emoji === "🐙") ?? ALL_WORDS[0], []);
  const totalVoices = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices().length : 0;

  const test = async (lang: LangCode, text: string, slow = false) => {
    setBusy(`${lang}-${slow ? "slow" : "fast"}`);
    stopSpeaking();
    await speak(text, { lang, slow, kind: "kid" });
    setBusy(null);
  };

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-8">
      <header className="flex items-center gap-3">
        <a href={href.home} className="pressable flex items-center gap-2 rounded-full border-2 border-line bg-white px-5 py-2.5">
          <LogoMark size={28} />
          <span className="display text-[1.05rem] font-extrabold text-ink">← BiliBuddies</span>
        </a>
        <a href={href.studio()} className="pressable display ml-auto rounded-full border-2 border-line bg-white px-5 py-2.5 text-[1.05rem] font-extrabold text-inksoft">
          🎛 Open the studio
        </a>
        <a href={href.pack} className="pressable display rounded-full border-2 border-line bg-white px-5 py-2.5 text-[1.05rem] font-extrabold text-inksoft">
          📋 AI themes
        </a>
      </header>

      <section className="sticker sticker-lg p-7">
        <h1 className="display text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold text-ink">🎤 Read-aloud voice test</h1>
        <p className="mt-2 max-w-[80ch] text-[1.05rem] font-semibold leading-relaxed text-inksoft">
          Every card, chant and question is read with the <b>free Microsoft “Online (Natural)” voices</b> — the same Azure
          neural voices Edge uses for Read Aloud, including the child voices (Ana, Maisie, Xiaoshuang, Éloïse, Pierina,
          Gisela, Emel). No key, no server, nothing to pay.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className="display rounded-full px-5 py-2 text-[1rem] font-extrabold"
            style={{ background: natural ? "#E4F7EA" : "#FDE8E0", color: natural ? "#1E7A45" : "#B4451F" }}
          >
            {natural ? "✅ Microsoft natural voices found" : "⚠️ no Microsoft natural voice in this browser"}
          </span>
          <span className="display rounded-full bg-white px-5 py-2 text-[1rem] font-extrabold text-inksoft">
            🔊 {totalVoices} browser voices in total
          </span>
        </div>
        {!natural && (
          <div className="mt-4 rounded-2xl bg-sun/20 p-4 text-[1rem] font-bold text-ink">
            For the good voices, open this page in <b>Microsoft Edge</b> (Windows, Mac, Android or iOS). Chrome, Firefox and
            Safari usually offer only their own offline voices — the studio still works, it just reads with what the browser
            has.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {LANGS.map((l) => {
          const best = pickBrowserVoice(l.id);
          const list = voicesFor(l.id);
          const text = sample ? sample.t[l.id] : l.hi;
          return (
            <div key={l.id} className="sticker p-5">
              <div className="flex items-center gap-3">
                <span className="text-[2rem]">{l.flag}</span>
                <div className="display text-[1.25rem] font-extrabold text-ink">{l.native}</div>
                <span className="ml-auto rounded-full bg-white/80 px-3 py-1 text-[0.85rem] font-bold text-inksoft">
                  {list.length} voice{list.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 text-[1.05rem] font-semibold text-inksoft">
                {text} · {sample?.pinyin && l.id === "zh" ? sample.pinyin : l.hi}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <BigButton variant="primary" size="md" disabled={busy === `${l.id}-fast`} onClick={() => void test(l.id, text)}>
                  🔊 Test
                </BigButton>
                <BigButton variant="sun" size="md" onClick={() => void test(l.id, text, true)}>
                  🐢 Slow
                </BigButton>
                <BigButton variant="soft" size="md" onClick={() => void test(l.id, `${text}. ${l.hi}`, false)}>
                  ⏭ Longer
                </BigButton>
              </div>
              <div className="mt-3 text-[0.95rem] font-bold text-inksoft">
                {best ? (
                  <>
                    {/natural|neural/i.test(best.name) ? "✨ natural · " : "💻 device · "}
                    {best.name}
                  </>
                ) : (
                  <span className="text-[#B4451F]">no voice for this language on this device</span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="sticker p-6">
        <h2 className="display text-[1.4rem] font-extrabold text-ink">🧪 What this test checks</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-[1rem] font-semibold text-inksoft">
          <li>• That a voice exists for each of the six languages.</li>
          <li>• That the Microsoft natural (neural) voices win over the robotic device ones.</li>
          <li>• That speaking never hangs the lesson: every utterance has a watchdog.</li>
          <li>• Nothing is uploaded and nothing is billed — the voice runs in this browser.</li>
        </ul>
      </section>
    </div>
  );
}
