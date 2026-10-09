"use client";

import { useEffect, useRef, useState } from "react";
import { Theme } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { chantFor, ui, LANG_META } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { WordImage } from "../WordImage";
import { BigButton } from "../ui";
import { Celebration } from "./Celebration";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Chant({ theme }: { theme: Theme }) {
  const s = useSettings();
  const target = s.target;
  const verses = chantFor(target, theme.words.slice(0, 12), theme.kind);
  const supportVerses = s.support !== "none" ? chantFor(s.support, theme.words.slice(0, 12), theme.kind) : null;
  const [active, setActive] = useState<{ v: number; l: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [done, setDone] = useState(false);
  const cancel = useRef(false);

  useEffect(() => () => { cancel.current = true; stopSpeaking(); }, []);

  async function claps() {
    for (let b = 0; b < 3; b++) {
      if (cancel.current) return;
      setBeat(b);
      sfx.clap();
      await wait(380);
    }
    setBeat(-1);
  }

  async function playVerse(v: number) {
    const verse = verses[v];
    for (let l = 0; l < verse.lines.length; l++) {
      if (cancel.current) return;
      setActive({ v, l });
      if (l === verse.lines.length - 1) {
        await claps();
      } else {
        sfx.beat(l === 0);
        await speak(verse.lines[l], target);
        await wait(250);
      }
    }
  }

  async function playAll(from = 0) {
    cancel.current = false;
    setPlaying(true);
    for (let v = from; v < verses.length; v++) {
      if (cancel.current) break;
      await playVerse(v);
      await wait(200);
    }
    setPlaying(false);
    setActive(null);
    if (!cancel.current) setDone(true);
  }

  function stop() {
    cancel.current = true;
    stopSpeaking();
    setPlaying(false);
    setActive(null);
    setBeat(-1);
  }

  if (done) return <Celebration stars={3} themeId={theme.id} activity="chant" onReplay={() => setDone(false)} />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="card-soft mb-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="font-display text-3xl font-bold">🎵 {ui(target, "clapWithMe")}</h2>
          <p className="text-ink-soft">{ui(target, "chantDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-2 flex gap-2" aria-hidden>
            {[0, 1, 2].map((b) => (
              <span key={b} className={`h-6 w-6 rounded-full transition-all duration-150 ${beat === b ? "scale-150 bg-coral" : "bg-ink/15"}`} />
            ))}
          </div>
          {playing ? (
            <BigButton tone="white" onClick={stop}>⏹ Stop</BigButton>
          ) : (
            <BigButton tone="coral" onClick={() => void playAll(0)}>▶ {ui(target, "letsGo")}</BigButton>
          )}
        </div>
      </div>

      <ol className="stagger space-y-3">
        {verses.map((verse, v) => {
          const isActive = active?.v === v;
          return (
            <li
              key={verse.word.id}
              className={`card-soft flex items-center gap-4 p-4 transition-all duration-300 ${isActive ? "scale-[1.02] ring-4 ring-sun" : ""}`}
            >
              <button
                onClick={() => { if (playing) return; cancel.current = false; setPlaying(true); void playVerse(v).then(() => { setPlaying(false); setActive(null); }); }}
                className={`shrink-0 rounded-3xl bg-cream-2 p-2 transition-transform hover:scale-105 ${isActive ? "anim-wiggle" : ""}`}
                aria-label={`Play verse ${v + 1}`}
              >
                <WordImage word={verse.word} size={88} countEmoji={theme.countEmoji} />
              </button>
              <div className="min-w-0 flex-1">
                {verse.lines.map((line, l) => {
                  const on = isActive && active?.l === l;
                  const isClap = l === verse.lines.length - 1;
                  return (
                    <div
                      key={l}
                      className={`font-display leading-tight transition-all ${
                        isClap ? "text-2xl text-ink-soft" : "text-3xl font-bold sm:text-4xl"
                      } ${on ? (isClap ? "text-coral-deep" : "text-coral-deep") : "text-ink"}`}
                    >
                      {isClap ? "👏 " : ""}{line}
                    </div>
                  );
                })}
                {supportVerses && (
                  <div className="mt-1 text-lg text-ink-soft">
                    {LANG_META[s.support as "en"].flag} {supportVerses[v].lines[0]} {supportVerses[v].lines[1]}
                  </div>
                )}
              </div>
              <button
                onClick={() => { sfx.tick(); void speak(verse.lines.slice(0, -1).join(" "), target, { slow: true }); }}
                className="btn-3d shrink-0 rounded-full bg-white px-3 py-2 text-2xl [--shadow:#e3d9c8]"
                title="Slow"
              >
                🐢
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex justify-center">
        <BigButton tone="mint" onClick={() => setDone(true)}>🎉 {ui(target, "allDone")}</BigButton>
      </div>
    </div>
  );
}
