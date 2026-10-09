"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { THEMES, UNIT_MAP, label } from "@/lib/data";
import { LANGS, type Lang } from "@/lib/data/types";
import { t } from "@/lib/data/phrases";
import { api, type StudentDto } from "@/lib/api";
import { MODES, useTutor, activeWords, type Mode } from "@/lib/store";
import { DEFAULT_VOICE, KID_VOICES } from "@/lib/speech";
import { ArtTile } from "./ui/ArtTile";
import { BigButton, Chip, IconButton } from "./ui/Kit";
import { IconClose, IconEye, IconEyeOff, IconMaximize, IconPlus, IconSave, IconShuffle, IconStar, TutorlyMark } from "./ui/Icons";
import Link from "next/link";
import { sfxTap } from "@/lib/sfx";

const AVATARS = ["🦊", "🐼", "🐯", "🐸", "🐰", "🦁", "🐨", "🐷", "🐵", "🦄", "🐥", "🐢"];

/* ------------------------------------------------------------------ top bar */

export function TopBar() {
  const homeLang = useTutor((s) => s.homeLang);
  const targetLang = useTutor((s) => s.targetLang);
  const mono = useTutor((s) => s.mono);
  const setLangs = useTutor((s) => s.setLangs);
  const patch = useTutor((s) => s.patch);
  const muted = useTutor((s) => s.muted);
  const sfx = useTutor((s) => s.sfx);
  const slow = useTutor((s) => s.slow);
  const bigView = useTutor((s) => s.bigView);
  const useLocal = useTutor((s) => s.useLocalVoice);
  const voice = useTutor((s) => s.voice);
  const stars = useTutor((s) => s.stars);
  const student = useTutor((s) => s.student);
  const [childOpen, setChildOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const langRow = (which: "home" | "target") => {
    const current = which === "home" ? homeLang : targetLang;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => {
              sfxTap();
              if (which === "home") setLangs(l.id, targetLang);
              else setLangs(homeLang, l.id, l.id === homeLang ? true : mono);
            }}
            className={`soft-ring no-select flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-lg font-bold transition
              ${current === l.id ? "bg-ink text-cream" : "bg-paper text-inksoft hover:bg-sand"}`}
          >
            <span className="text-xl">{l.flag}</span>
            <span>{l.native}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b-4 border-sand bg-cream/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <TutorlyMark size={52} />
          <div className="leading-none">
            <div className="font-display text-3xl font-extrabold tracking-tight text-ink">Tutorly Kids</div>
            <div className="text-base font-semibold text-inksoft">{t("app.tag", homeLang)}</div>
          </div>
        </Link>

        <div className="flex flex-col gap-1">
          <span className="text-base font-extrabold tracking-wide text-inksoft uppercase">{t("setup.ispeak", homeLang)}</span>
          {langRow("home")}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-base font-extrabold tracking-wide text-inksoft uppercase">{t("setup.welearn", homeLang)}</span>
          {langRow("target")}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => patch({ mono: !mono })}
            className={`soft-ring no-select cursor-pointer rounded-full px-4 py-2 text-lg font-extrabold transition ${
              mono ? "bg-plum text-white" : "bg-paper text-inksoft"
            }`}
          >
            {mono ? "1×" : "2×"} {mono ? t("setup.mono", homeLang) : t("setup.bilingual", homeLang)}
          </button>

          <button
            onClick={() => setChildOpen(true)}
            className="soft-ring no-select flex cursor-pointer items-center gap-2 rounded-full bg-paper px-4 py-2 text-lg font-extrabold text-ink"
          >
            <span className="text-2xl">{student?.avatar ?? "🧒"}</span>
            {student?.name ?? t("setup.pickChild", homeLang)}
          </button>

          <div className="flex items-center gap-1.5 rounded-full bg-sunsoft px-4 py-2">
            <IconStar size={26} className="text-sun" />
            <span className="font-display text-2xl font-extrabold text-ink">{stars}</span>
          </div>

          <IconButton title={t("ui.voice", homeLang)} onClick={() => setVoiceOpen(true)} variant="paper">
            <span className="text-2xl">{useLocal ? "🖥️" : "🎙️"}</span>
          </IconButton>
          <IconButton title={t("ui.sound", homeLang)} active={!muted} onClick={() => patch({ muted: !muted })} variant={muted ? "paper" : "sage"}>
            {muted ? <IconEyeOff size={26} /> : <span className="text-2xl">🔊</span>}
          </IconButton>
          <IconButton title="sound effects" active={sfx} onClick={() => patch({ sfx: !sfx })} variant={sfx ? "sky" : "paper"}>
            <span className="text-2xl">🔔</span>
          </IconButton>
          <IconButton title={t("ui.slow", homeLang)} active={slow} onClick={() => patch({ slow: !slow })} variant={slow ? "plum" : "paper"}>
            <span className="text-2xl">🐢</span>
          </IconButton>
          <IconButton title={t("ui.bigview", homeLang)} active={bigView} onClick={() => patch({ bigView: !bigView })} variant={bigView ? "berry" : "paper"}>
            <IconMaximize size={26} />
          </IconButton>
          <IconButton
            title="Fullscreen"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen();
            }}
            variant="paper"
          >
            <span className="text-2xl">⛶</span>
          </IconButton>
        </div>
      </div>

      <AnimatePresence>
        {voiceOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t-2 border-sand bg-paper"
          >
            <div className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="text-lg font-extrabold text-inksoft">{t("ui.voice", homeLang)}:</span>
              <Chip active={!useLocal} onClick={() => patch({ useLocalVoice: false })} color="#8fbe9b">
                🎙️ {t("ui.azurekids", homeLang)}
              </Chip>
              <Chip active={useLocal} onClick={() => patch({ useLocalVoice: true })} color="#7fb2de">
                🖥️ {t("ui.browser", homeLang)}
              </Chip>
              <span className="mx-2 h-8 w-px bg-sand" />
              {KID_VOICES[targetLang].map((v) => (
                <Chip key={v.id} active={(voice || DEFAULT_VOICE[targetLang]) === v.id} onClick={() => patch({ voice: v.id })} color="#b394d6">
                  {v.name}
                </Chip>
              ))}
              <span className="text-base font-semibold text-inksoft">
                {useLocal ? "browser TTS" : `Azure · ${voice || DEFAULT_VOICE[targetLang]}`}
              </span>
              <IconButton title="close" onClick={() => setVoiceOpen(false)} variant="paper" className="ml-auto">
                <IconClose size={22} />
              </IconButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChildModal open={childOpen} onClose={() => setChildOpen(false)} />
    </header>
  );
}

/* ------------------------------------------------------------------ child modal */

function ChildModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const homeLang = useTutor((s) => s.homeLang);
  const targetLang = useTutor((s) => s.targetLang);
  const patch = useTutor((s) => s.patch);
  const student = useTutor((s) => s.student);
  const [list, setList] = useState<StudentDto[]>([]);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [age, setAge] = useState(4);

  useEffect(() => {
    if (!open) return;
    void api.listStudents().then((r) => setList(r ?? []));
  }, [open]);

  const add = async () => {
    if (!name.trim()) return;
    const rows = await api.createStudent({ name: name.trim(), avatar, age, homeLang, targetLang });
    if (rows) {
      setList(rows);
      const mine = rows.find((r) => r.name === name.trim());
      if (mine) patch({ student: { id: mine.id, name: mine.name, avatar: mine.avatar, age: mine.age } });
    }
    setName("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[760px] rounded-[2.4rem] bg-cream p-8 tile-shadow"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-4xl font-extrabold">{t("setup.pickChild", homeLang)}</h2>
              <IconButton title="close" onClick={onClose} variant="paper">
                <IconClose size={24} />
              </IconButton>
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
              {list.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    patch({ student: { id: c.id, name: c.name, avatar: c.avatar, age: c.age } });
                    onClose();
                  }}
                  className={`soft-ring flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-xl font-extrabold transition
                    ${student?.id === c.id ? "bg-coral text-white" : "bg-paper text-ink"}`}
                >
                  <span className="text-3xl">{c.avatar}</span>
                  {c.name} <span className="opacity-70">· {c.age}</span>
                </button>
              ))}
              {!list.length && <span className="text-xl font-semibold text-inksoft">—</span>}
            </div>

            <div className="rounded-[1.8rem] bg-paper p-5">
              <div className="mb-3 text-2xl font-extrabold">{t("setup.newChild", homeLang)}</div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`grid h-14 w-14 cursor-pointer place-items-center rounded-2xl text-3xl transition ${
                      avatar === a ? "bg-sunsoft ring-4 ring-sun" : "bg-cream hover:bg-sand"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void add()}
                  placeholder="Name"
                  className="soft-ring min-w-[220px] flex-1 rounded-2xl border-2 border-sand bg-cream px-5 py-3 text-2xl font-bold outline-none"
                />
                <div className="flex items-center gap-2 rounded-2xl bg-cream px-4 py-2">
                  <IconButton title="-" onClick={() => setAge((a) => Math.max(3, a - 1))} variant="paper" className="h-11 w-11">
                    −
                  </IconButton>
                  <span className="w-10 text-center font-display text-3xl font-extrabold">{age}</span>
                  <IconButton title="+" onClick={() => setAge((a) => Math.min(6, a + 1))} variant="paper" className="h-11 w-11">
                    +
                  </IconButton>
                </div>
                <BigButton variant="sage" onClick={() => void add()}>
                  <IconPlus size={24} /> {t("ui.save", homeLang)}
                </BigButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ side rail */

export function SideRail() {
  const homeLang = useTutor((s) => s.homeLang);
  const targetLang = useTutor((s) => s.targetLang);
  const mono = useTutor((s) => s.mono);
  const themeId = useTutor((s) => s.themeId);
  const unitIds = useTutor((s) => s.unitIds);
  const wordIds = useTutor((s) => s.wordIds);
  const setTheme = useTutor((s) => s.setTheme);
  const toggleUnit = useTutor((s) => s.toggleUnit);
  const toggleWord = useTutor((s) => s.toggleWord);
  const setWordIds = useTutor((s) => s.setWordIds);
  const clearWords = useTutor((s) => s.clearWords);
  const [openWords, setOpenWords] = useState(false);

  const theme = THEMES.find((x) => x.id === themeId) ?? THEMES[0];
  const pool = useMemo(() => unitIds.flatMap((u) => UNIT_MAP[u]?.words ?? []), [unitIds]);

  return (
    <aside className="scroll-thin hidden w-[330px] shrink-0 overflow-y-auto border-r-4 border-sand bg-paper/70 p-4 lg:block">
      <div className="mb-2 text-lg font-extrabold tracking-wide text-inksoft uppercase">{t("ui.theme2", homeLang)}</div>
      <div className="mb-5 flex flex-col gap-2">
        {THEMES.map((th) => (
          <button
            key={th.id}
            onClick={() => {
              sfxTap();
              setTheme(th.id);
            }}
            className={`soft-ring flex cursor-pointer items-center gap-3 rounded-[1.3rem] px-4 py-3 text-left text-xl font-extrabold transition ${
              th.id === themeId ? "text-white" : "bg-cream text-ink hover:bg-sand"
            }`}
            style={th.id === themeId ? { background: th.color } : undefined}
          >
            <span className="text-3xl">{th.icon}</span>
            <span className="leading-tight">{t(th.name, homeLang)}</span>
          </button>
        ))}
      </div>

      <div className="mb-2 text-lg font-extrabold tracking-wide text-inksoft uppercase">{t("ui.theme", homeLang)} · units</div>
      <div className="mb-5 flex flex-wrap gap-2">
        {theme.units.map((u) => (
          <Chip key={u.id} active={unitIds.includes(u.id)} color={theme.color} onClick={() => toggleUnit(u.id)}>
            {u.icon} {t(u.name, homeLang)}
          </Chip>
        ))}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg font-extrabold tracking-wide text-inksoft uppercase">{t("ui.words", homeLang)}</span>
        <span className="rounded-full bg-sand px-3 py-1 text-base font-extrabold text-ink">
          {wordIds.length || pool.length}
        </span>
      </div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setOpenWords((o) => !o)}
          className="soft-ring flex-1 cursor-pointer rounded-full bg-ink px-4 py-2 text-lg font-extrabold text-cream"
        >
          {openWords ? "hide" : t("setup.pickWords", homeLang)}
        </button>
        <IconButton title={t("ui.clear", homeLang)} onClick={clearWords} variant="paper" className="h-11 w-11">
          <IconClose size={20} />
        </IconButton>
      </div>

      <AnimatePresence>
        {openWords && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 pb-4">
              {pool.map((w) => {
                const on = wordIds.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWord(w.id)}
                    className={`soft-ring flex cursor-pointer items-center gap-2 rounded-[1rem] px-2 py-2 text-left transition ${
                      on ? "text-white" : "bg-cream text-ink hover:bg-sand"
                    }`}
                    style={on ? { background: theme.color } : undefined}
                  >
                    <ArtTile word={w} size={34} color={on ? "#fff" : theme.color} />
                    <span className="text-base leading-tight font-bold">{label(w, targetLang)}</span>
                  </button>
                );
              })}
              {!pool.length && <span className="col-span-2 text-lg font-semibold text-inksoft">—</span>}
            </div>
            {wordIds.length > 0 && (
              <div className="mb-3 rounded-[1rem] bg-sagesoft px-3 py-2 text-base font-bold text-ink">
                {wordIds.length} {t("ui.words", homeLang)} · {mono ? "1×" : "2×"}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 flex flex-col gap-2">
        <Link
          href="/teacher"
          className="soft-ring rounded-[1.2rem] bg-cream px-4 py-3 text-center text-lg font-extrabold text-ink hover:bg-sand"
        >
          📊 {t("nav.teacher", homeLang)}
        </Link>
        <div className="rounded-[1.2rem] bg-cream px-4 py-3 text-base leading-snug font-semibold text-inksoft">
          Shortcuts: <b>T</b> panel · <b>M</b> mute · <b>B</b> big view · <b>Space</b> replay · <b>1–9</b> modes
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ bottom dock */

export function BottomDock() {
  const homeLang = useTutor((s) => s.homeLang);
  const mode = useTutor((s) => s.mode);
  const setMode = useTutor((s) => s.setMode);
  const newSeed = useTutor((s) => s.newSeed);
  const themeId = useTutor((s) => s.themeId);
  const unitIds = useTutor((s) => s.unitIds);
  const wordIds = useTutor((s) => s.wordIds);
  const targetLang = useTutor((s) => s.targetLang);
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const words = activeWords().map((w) => w.id);
    const res = await api.savePlan({
      title: title.trim() || `${t(THEMES.find((x) => x.id === themeId)?.name ?? "theme.me", homeLang)} · ${mode}`,
      homeLang,
      targetLang,
      themeId,
      unitIds,
      wordIds: wordIds.length ? wordIds : words,
      mode,
    });
    if (res) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }
  };

  return (
    <footer className="sticky bottom-0 z-30 border-t-4 border-sand bg-cream/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((m, i) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                sfxTap();
                setMode(m.id as Mode);
              }}
              className={`soft-ring no-select flex cursor-pointer items-center gap-2 rounded-[1.1rem] border-b-4 px-4 py-2.5 text-lg font-extrabold transition ${
                active ? "border-[#d9694f] bg-coral text-white" : "border-sand bg-paper text-ink hover:border-ink/20"
              }`}
            >
              <span className="text-2xl">{m.icon}</span>
              <span>{t(m.key, homeLang)}</span>
              <span className={`text-xs font-bold ${active ? "opacity-70" : "opacity-40"}`}>{i + 1}</span>
            </button>
          );
        })}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <IconButton title="shuffle" onClick={newSeed} variant="paper">
            <IconShuffle size={24} />
          </IconButton>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("ui.plans", homeLang)}
            className="soft-ring w-[210px] rounded-[1rem] border-2 border-sand bg-paper px-4 py-2 text-lg font-bold outline-none"
          />
          <BigButton variant={saved ? "sage" : "ink"} size="md" onClick={() => void save()}>
            {saved ? <IconStar size={22} /> : <IconSave size={22} />} {saved ? t("ui.saved", homeLang) : t("ui.save", homeLang)}
          </BigButton>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ shortcuts */

export function useTutorShortcuts() {
  const patch = useTutor((s) => s.patch);
  const setMode = useTutor((s) => s.setMode);
  const panelHidden = useTutor((s) => s.panelHidden);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA"].includes(el.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "t") patch({ panelHidden: !panelHidden });
      else if (k === "m") patch({ muted: !useTutor.getState().muted });
      else if (k === "b") patch({ bigView: !useTutor.getState().bigView });
      else if (k === " ") {
        e.preventDefault();
        patch({ seed: useTutor.getState().seed });
      } else if (/^[1-9]$/.test(k)) {
        const m = MODES[Number(k) - 1];
        if (m) setMode(m.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [patch, setMode, panelHidden]);
}

export function RestorePanelButton() {
  const panelHidden = useTutor((s) => s.panelHidden);
  const patch = useTutor((s) => s.patch);
  const homeLang = useTutor((s) => s.homeLang);
  if (!panelHidden) return null;
  return (
    <button
      onClick={() => patch({ panelHidden: false })}
      className="soft-ring fixed bottom-4 left-4 z-40 flex cursor-pointer items-center gap-2 rounded-full bg-ink/80 px-4 py-2 text-base font-bold text-cream opacity-40 transition hover:opacity-100"
    >
      {panelHidden ? <IconEye size={18} /> : <IconEyeOff size={18} />} {t("ui.showpanel", homeLang)}
    </button>
  );
}


