"use client";

import { useEffect, useState } from "react";
import { href, navigate } from "@/lib/route";
import { motion } from "framer-motion";
import { THEMES, TOTAL_WORDS, UNIT_MAP, WORDS, label } from "@/lib/data";
import { LANGS, type Lang } from "@/lib/data/types";
import { t } from "@/lib/data/phrases";
import { MODES, useTutor } from "@/lib/store";
import { useVoice, useSfxSync } from "@/lib/useSpeech";
import { DEFAULT_VOICE, KID_VOICES } from "@/lib/speech";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, Chip, SpeakerButton } from "@/components/ui/Kit";
import { IconArrowRight, IconSpeaker, IconStar, TutorlyMark } from "@/components/ui/Icons";
import { sfxTap } from "@/lib/sfx";

const HERO_IDS = ["cat", "apple", "bus", "happy", "red", "elephant"];

export function HomeScreen() {
  useSfxSync();
  const homeLang = useTutor((s) => s.homeLang);
  const targetLang = useTutor((s) => s.targetLang);
  const mono = useTutor((s) => s.mono);
  const setLangs = useTutor((s) => s.setLangs);
  const setTheme = useTutor((s) => s.setTheme);
  const patch = useTutor((s) => s.patch);
  const setMode = useTutor((s) => s.setMode);
  const { say, sayWord } = useVoice();
  const [hi, setHi] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHi((h) => (h + 1) % HERO_IDS.length), 4200);
    return () => clearInterval(id);
  }, []);

  const heroWord = WORDS.find((w) => w.id === HERO_IDS[hi])!;
  const theme = THEMES[0];

  const start = (themeId?: string, unitId?: string, mode?: string) => {
    sfxTap();
    if (themeId) setTheme(themeId);
    if (unitId) patch({ unitIds: [unitId] });
    if (mode) setMode(mode as never);
    navigate(href.play);
  };

  return (
    <div className="dot-grid min-h-screen bg-cream">
      {/* ---------------------------------------------------------- header */}
      <header className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <TutorlyMark size={54} />
          <div className="leading-none">
            <div className="font-display text-4xl font-extrabold tracking-tight">Tutorly Kids</div>
            <div className="text-lg font-semibold text-inksoft">{t("app.tag", homeLang)}</div>
          </div>
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-2">
          <a href={href.lesson()} className="soft-ring rounded-full bg-paper px-5 py-2.5 text-lg font-extrabold text-inksoft hover:text-ink">
            📚 {t("les.title", homeLang)}
          </a>
          <a href={href.teacher} className="soft-ring rounded-full bg-paper px-5 py-2.5 text-lg font-extrabold text-inksoft hover:text-ink">
            📊 {t("nav.teacher", homeLang)}
          </a>
          <a href={href.pack} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:text-ink">
            📋 AI Prompt &amp; JSON
          </a>
          <a href={href.voices} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:text-ink">
            🎤 Voice test
          </a>
          <a href={href.home} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:text-ink">
            🏠 Splash
          </a>
          <BigButton variant="coral" size="md" onClick={() => start()}>
            {t("nav.play", homeLang)} <IconArrowRight size={22} />
          </BigButton>
        </nav>
      </header>

      {/* ---------------------------------------------------------- hero */}
      <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-sagesoft px-5 py-2 text-lg font-extrabold text-sage">
            🧸 Ages 3–6 · tutor-led · screen-share ready
          </div>
          <h1 className="font-display text-[4.4rem] leading-[0.95] font-extrabold text-ink sm:text-[5.4rem]">
            Two languages.
            <br />
            <span style={{ color: theme.color }}>One very</span> happy child.
          </h1>
          <p className="mt-6 max-w-[36ch] text-2xl leading-snug font-semibold text-inksoft">
            {TOTAL_WORDS} hand-picked first words across 6 themes — with pictures, read-aloud, chants, concept-check
            questions and drag-&amp;-drop games. You lead, they speak.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <BigButton variant="coral" size="xl" onClick={() => start()}>
              {t("setup.start", homeLang)} <IconArrowRight size={30} />
            </BigButton>
            <BigButton variant="paper" size="xl" onClick={() => start("nature", "pets", "chant")}>
              🎵 Try a chant
            </BigButton>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="text-lg font-extrabold tracking-wide text-inksoft uppercase">{t("setup.welearn", homeLang)}</span>
            {LANGS.map((l) => (
              <Chip key={l.id} active={targetLang === l.id} color="#f2836b" onClick={() => setLangs(homeLang, l.id, l.id === homeLang ? true : mono)}>
                {l.flag} {l.native}
              </Chip>
            ))}
            <Chip active={mono} color="#b394d6" onClick={() => patch({ mono: !mono })}>
              {mono ? "1 language" : "2 languages"}
            </Chip>
          </div>
        </div>

        {/* live demo card */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1.5 }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-sun/50 blur-2xl" />
          <div className="absolute -right-4 -bottom-8 h-32 w-32 rounded-full bg-sky/40 blur-2xl" />
          <div className="relative rounded-[3rem] bg-paper p-10 tile-shadow">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-coralsoft px-4 py-1.5 text-lg font-extrabold text-coral">
                {LANGS.find((l) => l.id === targetLang)?.flag} {LANGS.find((l) => l.id === targetLang)?.native}
              </span>
              <span className="flex items-center gap-1 text-lg font-extrabold text-inksoft">
                <IconStar size={22} className="text-sun" /> live card
              </span>
            </div>

            <div className="flex min-h-[330px] flex-col items-center justify-center gap-6">
              <motion.div key={heroWord.id} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <ArtTile word={heroWord} size={230} color={theme.color} float />
              </motion.div>
              <motion.div key={`t-${heroWord.id}`} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
                <div className="font-display text-6xl leading-none font-extrabold" style={{ color: theme.color }}>
                  {label(heroWord, targetLang)}
                </div>
                {targetLang === "zh" && heroWord.py && (
                  <div className="mt-2 text-2xl font-bold tracking-widest text-inksoft">{heroWord.py}</div>
                )}
                {!mono && homeLang !== targetLang && (
                  <div className="mt-1 text-3xl font-bold text-inksoft">{label(heroWord, homeLang)}</div>
                )}
              </motion.div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <SpeakerButton size="lg" onClick={() => void sayWord(heroWord, targetLang, homeLang, mono)} title="listen" />
              <BigButton variant="sun" size="md" onClick={() => void say(t("ccq.isAnimal", targetLang), targetLang)}>
                <IconSpeaker size={24} /> {t("ccq.isAnimal", homeLang)}
              </BigButton>
              <BigButton variant="sage" size="md" onClick={() => setHi((h) => (h + 1) % HERO_IDS.length)}>
                {t("ui.next", homeLang)} <IconArrowRight size={22} />
              </BigButton>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- themes */}
      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <h2 className="font-display text-5xl font-extrabold">Every theme, fully illustrated</h2>
        <p className="mt-2 text-2xl font-semibold text-inksoft">
          Tap a theme to jump straight into the game with the tutor dock pre-loaded.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {THEMES.map((th, idx) => {
            const words = th.units.flatMap((u) => u.words);
            return (
              <motion.div
                key={th.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: idx * 0.05 }}
                className="flex flex-col gap-5 rounded-[2.2rem] bg-paper p-7 tile-shadow"
                style={{ borderTop: `10px solid ${th.color}` }}
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-16 w-16 place-items-center rounded-[1.3rem] text-4xl" style={{ background: th.soft }}>
                    {th.icon}
                  </span>
                  <div>
                    <div className="font-display text-3xl leading-tight font-extrabold">{t(th.name, homeLang)}</div>
                    <div className="text-lg font-bold text-inksoft">
                      {th.units.length} units · {words.length} words
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {th.units.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => start(th.id, u.id)}
                      className="soft-ring cursor-pointer rounded-full bg-cream px-3.5 py-1.5 text-base font-bold text-ink hover:bg-sand"
                    >
                      {u.icon} {t(u.name, homeLang)}
                    </button>
                  ))}
                </div>
                <div className="mt-auto flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {words.slice(0, 5).map((w) => (
                      <div key={w.id} className="grid h-14 w-14 place-items-center rounded-full bg-cream ring-4 ring-paper">
                        <ArtTile word={w} size={34} color={th.color} />
                      </div>
                    ))}
                  </div>
                  <BigButton variant="paper" size="sm" className="ml-auto" onClick={() => start(th.id, th.units[0].id)}>
                    {t("nav.play", homeLang)} <IconArrowRight size={20} />
                  </BigButton>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------- modes */}
      <section className="bg-paper py-14">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="font-display text-5xl font-extrabold">11 ways to make them talk</h2>
          <p className="mt-2 text-2xl font-semibold text-inksoft">
            Every mode is tutor-controlled, huge on screen and built around speaking — not tapping.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["🃏", "Learn", "One giant flashcard. Art, word, pinyin, home-language gloss, sentence frame and CCQ prompts for the tutor."],
              ["💬", "Talk Time (CCQ)", "Concept-check questions with Yes/No and either-or answers, a 20-second talk timer and a drill ladder: say it loud, quiet, slow, three times."],
              ["👂", "Listen & Find", "Read-aloud only — the child hears the word and taps the right picture. Pure listening practice."],
              ["❓", "Quiz", "Multiple choice that rotates: word→picture, picture→word, audio→picture, picture→home-language word. Score saved to the child's profile."],
              ["🧲", "Match It", "Drag the word onto the picture. Real drag & drop with soft snap-back, works with mouse and touch."],
              ["🂠", "Memory", "Picture card + word card pairs, gentle flip animation, no timers and no pressure."],
              ["🗂️", "Sort It", "Drag pictures into the right category boxes — animals, food, vehicles, clothes, feelings."],
              ["↔️", "Opposites", "Big/small, hot/cold, fast/slow, up/down, open/closed, long/short, clean/dirty, loud/quiet."],
              ["🎵", "Chant", "Six original theme chants with a bouncing beat, line-by-line highlighting and one-tap line replay."],
              ["🔢", "Count", "Objects appear one by one, we count aloud together, then choose the numeral from 1 to 20."],
              ["🔤", "ABC", "Letter + sound + example word, then 'which letter starts this word?' with four big choices."],
            ].map(([icon, name, desc], i) => (
              <motion.button
                key={name}
                onClick={() => start(undefined, undefined, MODES.find((m) => m.key.toLowerCase().includes(name.split(" ")[0].toLowerCase()))?.id ?? "learn")}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="soft-ring flex cursor-pointer gap-4 rounded-[1.8rem] bg-cream p-6 text-left hover:bg-sand"
              >
                <span className="text-4xl">{icon}</span>
                <span>
                  <span className="block font-display text-2xl font-extrabold">{name}</span>
                  <span className="mt-1 block text-lg leading-snug font-semibold text-inksoft">{desc}</span>
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- voice */}
      <section className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[2.4rem] bg-paper p-8 tile-shadow">
            <h2 className="font-display text-4xl font-extrabold">🎙️ Microsoft Azure natural kid voices</h2>
            <p className="mt-3 text-xl leading-snug font-semibold text-inksoft">
              Every word, question and chant can be read aloud by an Azure Neural child voice. Add{" "}
              <code className="rounded bg-cream px-2 py-0.5 text-lg font-bold text-coral">AZURE_SPEECH_KEY</code> and{" "}
              <code className="rounded bg-cream px-2 py-0.5 text-lg font-bold text-coral">AZURE_SPEECH_REGION</code> to
              your environment and the app switches automatically. Without a key it falls back to the warmest browser
              voice it can find — nothing breaks.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => void say(label(WORDS.find((w) => w.id === "cat")!, l.id as Lang), l.id as Lang)}
                  className="soft-ring flex cursor-pointer items-center gap-2 rounded-full bg-cream px-4 py-2 text-lg font-bold hover:bg-sand"
                >
                  <IconSpeaker size={20} className="text-coral" />
                  {l.flag} {KID_VOICES[l.id as Lang][0].name}
                </button>
              ))}
            </div>
            <div className="mt-4 text-lg font-semibold text-inksoft">
              Default: <b>{DEFAULT_VOICE[targetLang]}</b> · pitch +8% · pace tuned for 3-year-olds
            </div>
          </div>

          <div className="rounded-[2.4rem] p-8 tile-shadow" style={{ background: "#8fbe9b" }}>
            <h2 className="font-display text-4xl font-extrabold text-white">🌿 Safe, calm, low-stimulation</h2>
            <ul className="mt-5 flex flex-col gap-4 text-xl font-bold text-white">
              {[
                "No ads, no links out, no autoplay video, no flashing lights.",
                "Soft cream palette and rounded shapes — never pure black or neon.",
                "Gentle synthesised chimes; no loud jingles, and one-tap mute.",
                "No timers that punish. Mistakes are met with 'Look again!'.",
                "All tutor controls can be hidden with T for a clean shared screen.",
                "Child data stays in your own database — name, avatar and stars only.",
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <span className="mt-1">✦</span>
                  <span className="leading-snug">{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 rounded-[2.4rem] bg-paper p-10 tile-shadow">
          <div className="text-center">
            <div className="font-display text-6xl font-extrabold text-coral">{TOTAL_WORDS}</div>
            <div className="text-xl font-bold text-inksoft">illustrated words</div>
          </div>
          <div className="h-16 w-px bg-sand" />
          <div className="text-center">
            <div className="font-display text-6xl font-extrabold text-sky">6</div>
            <div className="text-xl font-bold text-inksoft">languages</div>
          </div>
          <div className="h-16 w-px bg-sand" />
          <div className="text-center">
            <div className="font-display text-6xl font-extrabold text-sage">{Object.keys(UNIT_MAP).length}</div>
            <div className="text-xl font-bold text-inksoft">units</div>
          </div>
          <div className="h-16 w-px bg-sand" />
          <div className="text-center">
            <div className="font-display text-6xl font-extrabold text-plum">11</div>
            <div className="text-xl font-bold text-inksoft">game modes</div>
          </div>
          <BigButton variant="coral" size="xl" onClick={() => start()}>
            {t("setup.start", homeLang)} <IconArrowRight size={30} />
          </BigButton>
        </div>
      </section>

      <footer className="border-t-4 border-sand bg-paper px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-3">
          <TutorlyMark size={40} />
          <span className="font-display text-2xl font-extrabold">Tutorly Kids</span>
        </div>
        <p className="mt-2 text-lg font-semibold text-inksoft">
          Artwork: Twemoji (CC-BY 4.0) · Voices: Microsoft Azure Speech / Web Speech · Made for online tutors of 3–6 year olds.
        </p>
      </footer>
    </div>
  );
}
