"use client";

import { useEffect, useMemo, useState } from "react";
import { href, navigate } from "@/lib/route";
import { motion } from "framer-motion";
import { THEMES, WORD_MAP, label } from "@/lib/data";
import { t } from "@/lib/data/phrases";
import { api, type PlanDto, type ProgressDto, type ResultDto, type StudentDto } from "@/lib/api";
import { useTutor } from "@/lib/store";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, IconButton, StarRow } from "@/components/ui/Kit";
import { IconArrowRight, IconPlus, IconTrash, TutorlyMark } from "@/components/ui/Icons";
import { sfxTap } from "@/lib/sfx";
import { useSfxSync } from "@/lib/useSpeech";

const AVATARS = ["🦊", "🐼", "🐯", "🐸", "🐰", "🦁", "🐨", "🐷", "🐵", "🦄", "🐥", "🐢"];

export function TeacherScreen() {
  useSfxSync();
  const homeLang = useTutor((s) => s.homeLang);
  const targetLang = useTutor((s) => s.targetLang);
  const setLangs = useTutor((s) => s.setLangs);
  const patch = useTutor((s) => s.patch);
  const student = useTutor((s) => s.student);

  const [students, setStudents] = useState<StudentDto[]>([]);
  const [progress, setProgress] = useState<ProgressDto[]>([]);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [results, setResults] = useState<ResultDto[]>([]);
  const [themeId, setThemeId] = useState<string>("nature");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [age, setAge] = useState(4);

  useEffect(() => {
    void api.listStudents().then((r) => {
      if (!r) return;
      setStudents(r);
      if (!student && r[0]) patch({ student: { id: r[0].id, name: r[0].name, avatar: r[0].avatar, age: r[0].age } });
    });
    void api.listPlans().then((r) => setPlans(r ?? []));
    void api.listResults().then((r) => setResults(r ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!student) return;
    void api.getProgress(student.id, targetLang).then((r) => setProgress(r ?? []));
  }, [student, targetLang]);

  const progMap = useMemo(() => Object.fromEntries(progress.map((p) => [p.wordId, p])), [progress]);
  const theme = THEMES.find((x) => x.id === themeId) ?? THEMES[0];
  const themeWords = theme.units.flatMap((u) => u.words);
  const mastered = themeWords.filter((w) => (progMap[w.id]?.stars ?? 0) >= 3).length;
  const learning = themeWords.filter((w) => (progMap[w.id]?.stars ?? 0) > 0 && (progMap[w.id]?.stars ?? 0) < 3).length;

  const addChild = async () => {
    if (!name.trim()) return;
    const rows = await api.createStudent({ name: name.trim(), avatar, age, homeLang, targetLang });
    if (rows) {
      setStudents(rows);
      const mine = rows.find((r) => r.name === name.trim());
      if (mine) patch({ student: { id: mine.id, name: mine.name, avatar: mine.avatar, age: mine.age } });
    }
    setName("");
  };

  const loadPlan = (p: PlanDto) => {
    sfxTap();
    setLangs(p.homeLang as never, p.targetLang as never);
    patch({ themeId: p.themeId, unitIds: p.unitIds, wordIds: p.wordIds, mode: p.mode as never });
    navigate(href.play);
  };

  const removePlan = async (id: string) => {
    const rows = await api.deletePlan(id);
    if (rows) setPlans(rows);
  };

  return (
    <div className="dot-grid min-h-screen bg-transparent pb-16">
      <header className="border-b-4 border-sand bg-paper/90 px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4">
          <a href={href.home} className="flex items-center gap-3">
            <TutorlyMark size={46} />
            <div className="font-display text-3xl font-extrabold">{t("nav.teacher", homeLang)}</div>
          </a>
          <a href={href.play} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:text-ink">
            🎈 Game
          </a>
          <a href={href.pack} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:text-ink">
            📋 AI Prompt &amp; JSON
          </a>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {student && (
              <div className="flex items-center gap-2 rounded-full bg-sunsoft px-5 py-2">
                <span className="text-3xl">{student.avatar}</span>
                <span className="font-display text-2xl font-extrabold">{student.name}</span>
                <span className="text-lg font-bold text-inksoft">· {student.age}</span>
              </div>
            )}
            <BigButton variant="coral" size="md" onClick={() => navigate(href.play)}>
              {t("nav.play", homeLang)} <IconArrowRight size={22} />
            </BigButton>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-8">
        {/* children */}
        <section className="rounded-[2.2rem] bg-paper p-7 tile-shadow">
          <h2 className="font-display text-3xl font-extrabold">{t("setup.pickChild", homeLang)}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {students.map((c) => (
              <button
                key={c.id}
                onClick={() => patch({ student: { id: c.id, name: c.name, avatar: c.avatar, age: c.age } })}
                className={`soft-ring flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-xl font-extrabold transition ${
                  student?.id === c.id ? "bg-coral text-white" : "bg-cream text-ink hover:bg-sand"
                }`}
              >
                <span className="text-3xl">{c.avatar}</span>
                {c.name}
              </button>
            ))}
            {!students.length && <span className="text-xl font-semibold text-inksoft">No children yet — add one below.</span>}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[1.6rem] bg-cream p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`grid h-12 w-12 cursor-pointer place-items-center rounded-xl text-2xl ${avatar === a ? "bg-sun ring-2 ring-sunsoft" : "bg-paper hover:bg-sand"}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addChild()}
              placeholder="Child name"
              className="soft-ring min-w-[200px] flex-1 rounded-2xl border-2 border-sand bg-paper px-5 py-3 text-xl font-bold outline-none"
            />
            <div className="flex items-center gap-2 rounded-2xl bg-paper px-3 py-2">
              <IconButton title="-" onClick={() => setAge((a) => Math.max(3, a - 1))} variant="paper" className="h-11 w-11">−</IconButton>
              <span className="w-9 text-center font-display text-2xl font-extrabold">{age}</span>
              <IconButton title="+" onClick={() => setAge((a) => Math.min(6, a + 1))} variant="paper" className="h-11 w-11">+</IconButton>
            </div>
            <BigButton variant="sage" size="md" onClick={() => void addChild()}>
              <IconPlus size={22} /> {t("setup.newChild", homeLang)}
            </BigButton>
          </div>
        </section>

        {/* word wall */}
        <section className="rounded-[2.2rem] bg-paper p-7 tile-shadow">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl font-extrabold">{t("ui.progress", homeLang)}</h2>
            <div className="ml-auto flex flex-wrap gap-2">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => setThemeId(th.id)}
                  className={`soft-ring cursor-pointer rounded-full px-4 py-1.5 text-lg font-bold ${themeId === th.id ? "text-white" : "bg-cream text-inksoft"}`}
                  style={themeId === th.id ? { background: th.color } : undefined}
                >
                  {th.icon} {t(th.name, homeLang)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-[1.2rem] bg-sagesoft px-5 py-3">
              <div className="font-display text-3xl font-extrabold text-sage">{mastered}</div>
              <div className="text-base font-bold text-ink">{t("ui.mastery", homeLang)}</div>
            </div>
            <div className="rounded-[1.2rem] bg-sunsoft px-5 py-3">
              <div className="font-display text-3xl font-extrabold text-sun">{learning}</div>
              <div className="text-base font-bold text-ink">{t("ui.learning", homeLang)}</div>
            </div>
            <div className="rounded-[1.2rem] bg-skysoft px-5 py-3">
              <div className="font-display text-3xl font-extrabold text-sky">{themeWords.length}</div>
              <div className="text-base font-bold text-ink">{t("ui.words", homeLang)}</div>
            </div>
          </div>

          <div className="scroll-thin mt-5 grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto pr-2 sm:grid-cols-3 lg:grid-cols-5">
            {themeWords.map((w) => {
              const p = progMap[w.id];
              const stars = Math.min(5, p?.stars ?? 0);
              return (
                <motion.div key={w.id} whileHover={{ y: -3 }} className="flex flex-col items-center gap-1 rounded-[1.3rem] bg-cream p-3">
                  <ArtTile word={w} size={64} color={theme.color} />
                  <div className="text-center text-lg leading-tight font-extrabold">{label(w, targetLang)}</div>
                  {!targetLang.startsWith("en") && (
                    <div className="text-center text-sm font-semibold text-inksoft">{label(w, "en")}</div>
                  )}
                  <StarRow n={stars} />
                  <div className="text-xs font-bold text-inksoft">
                    ✓ {p?.correct ?? 0} · ✗ {p?.wrong ?? 0}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {!student && <div className="mt-3 text-lg font-bold text-inksoft">{t("ui.nochild", homeLang)}</div>}
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* plans */}
          <section className="rounded-[2.2rem] bg-paper p-7 tile-shadow">
            <h2 className="font-display text-3xl font-extrabold">{t("ui.plans", homeLang)}</h2>
            <div className="mt-4 flex flex-col gap-3">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-[1.3rem] bg-cream p-4">
                  <span className="text-3xl">{THEMES.find((x) => x.id === p.themeId)?.icon ?? "🎈"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-xl font-extrabold">{p.title}</div>
                    <div className="text-base font-semibold text-inksoft">
                      {p.wordIds.length} {t("ui.words", homeLang)} · {p.homeLang} → {p.targetLang} · {p.mode}
                    </div>
                  </div>
                  <BigButton variant="sage" size="sm" onClick={() => loadPlan(p)}>
                    {t("ui.load", homeLang)}
                  </BigButton>
                  <IconButton title={t("ui.delete", homeLang)} onClick={() => void removePlan(p.id)} variant="paper" className="h-11 w-11">
                    <IconTrash size={20} />
                  </IconButton>
                </div>
              ))}
              {!plans.length && (
                <p className="text-lg font-semibold text-inksoft">
                  Save a lesson from the tutor dock and it appears here — word list, languages and starting mode included.
                </p>
              )}
            </div>
          </section>

          {/* results */}
          <section className="rounded-[2.2rem] bg-paper p-7 tile-shadow">
            <h2 className="font-display text-3xl font-extrabold">{t("ui.results", homeLang)}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {results.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-[1.2rem] bg-cream px-4 py-3">
                  <span className="text-2xl">🏆</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xl font-extrabold">
                      {r.studentName ?? "—"} · {r.mode}
                    </div>
                    <div className="text-base font-semibold text-inksoft">
                      {THEMES.find((x) => x.id === r.themeId)?.name ? t(THEMES.find((x) => x.id === r.themeId)!.name, homeLang) : r.themeId} ·{" "}
                      {r.targetLang} · {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-display text-3xl font-extrabold" style={{ color: theme.color }}>
                    {r.score}/{r.total}
                  </div>
                </div>
              ))}
              {!results.length && (
                <p className="text-lg font-semibold text-inksoft">
                  Quiz results for each child are stored here automatically after every finished round.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="rounded-[2.2rem] bg-paper p-7 tile-shadow">
          <h2 className="font-display text-3xl font-extrabold">Dictionary coverage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((th) => (
              <div key={th.id} className="rounded-[1.4rem] p-4" style={{ background: th.soft }}>
                <div className="font-display text-2xl font-extrabold" style={{ color: th.color }}>
                  {th.icon} {t(th.name, homeLang)}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {th.units.map((u) => (
                    <span key={u.id} className="rounded-full bg-paper px-3 py-1 text-sm font-bold text-ink">
                      {t(`unit.${u.id === "numbers1to10" ? "num10" : u.id === "numbers11to20" ? "num20" : u.id}`, homeLang)} · {u.words.length}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-lg font-semibold text-inksoft">
            {Object.keys(WORD_MAP).length} words · 6 languages · every word has art, audio, CCQs and drill prompts.
          </div>
        </div>
      </main>
    </div>
  );
}
