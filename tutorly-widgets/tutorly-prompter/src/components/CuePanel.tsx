import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CueCard, LessonPlan, LessonSentence, TeacherGuide } from "../types";
import { Pill, Button } from "./ui";
import {
  Bookmark, BookOpen, ListTree, MessageSquare,
  Timer as TimerIcon, GraduationCap,
} from "lucide-react";
import { cn } from "../utils/cn";

export interface FlatItem {
  globalIndex: number;
  sectionIndex: number;
  sentenceIndex: number;
  sentence: LessonSentence;
  sectionTitle: string;
  isSectionStart: boolean;
}

export interface CuePanelProps {
  lesson: LessonPlan;
  flat: FlatItem[];
  currentIdx: number;
  onJump: (idx: number) => void;
  bookmarks: number[];
  onStartTimer: (label: string, sec: number, kind?: "activity" | "wait" | "custom") => void;
}

type TabKey = "cues" | "guide" | "outline" | "glossary" | "bookmarks";

const cueColorMap: Record<string, "blue" | "amber" | "rose" | "emerald" | "violet" | "slate"> = {
  question: "blue", slide: "violet", poll: "amber", activity: "emerald",
  joke: "rose", transition: "slate", image: "violet", whiteboard: "amber", note: "slate",
};

export const CuePanel: React.FC<CuePanelProps> = ({
  lesson, flat, currentIdx, onJump, bookmarks, onStartTimer,
}) => {
  const [tab, setTab] = useState<TabKey>("cues");
  const [collapsed, setCollapsed] = useState(false);

  // Scroll the panel body to top whenever the section or tab changes
  const panelBodyRef = useRef<HTMLDivElement>(null);
  const currentSectionIdx = flat[currentIdx]?.sectionIndex ?? 0;

  useEffect(() => {
    if (panelBodyRef.current) panelBodyRef.current.scrollTop = 0;
  }, [currentSectionIdx, tab]);

  // ── CUES: only those belonging to the current sentence first, then the rest of this section ──
  const { sentenceCues, sectionCues, otherCues } = useMemo(() => {
    const sentC: { idx: number; cue: CueCard }[] = [];
    const secC: { idx: number; cue: CueCard }[] = [];
    const othC: { idx: number; cue: CueCard }[] = [];
    flat.forEach((f) => {
      f.sentence.ann?.cues?.forEach((c) => {
        const entry = { idx: f.globalIndex, cue: c };
        if (f.globalIndex === currentIdx) sentC.push(entry);
        else if (f.sectionIndex === currentSectionIdx) secC.push(entry);
        else othC.push(entry);
      });
    });
    return { sentenceCues: sentC, sectionCues: secC, otherCues: othC };
  }, [flat, currentIdx, currentSectionIdx]);

  // ── GUIDE: current section's guide ──
  const currentSectionGuide = lesson.sections[currentSectionIdx]?.teacherGuide;
  const currentSectionTitle = lesson.sections[currentSectionIdx]?.title || "Section";

  // ── GLOSSARY: filter to terms mentioned in the current section ──
  const { sectionGlossary, otherGlossary } = useMemo(() => {
    if (!lesson.glossary) return { sectionGlossary: [], otherGlossary: [] };
    const sectionText = flat
      .filter((f) => f.sectionIndex === currentSectionIdx)
      .map((f) => f.sentence.text.toLowerCase())
      .join(" ");
    const secG: typeof lesson.glossary = [];
    const othG: typeof lesson.glossary = [];
    lesson.glossary.forEach((g) => {
      if (sectionText.includes(g.term.toLowerCase())) secG.push(g);
      else othG.push(g);
    });
    return { sectionGlossary: secG, otherGlossary: othG };
  }, [lesson.glossary, flat, currentSectionIdx]);

  if (collapsed) {
    return (
      <button
        className="hidden md:flex w-7 shrink-0 items-center justify-center border-l border-white/10 bg-black/40 text-slate-400 hover:bg-black/60 hover:text-white"
        onClick={() => setCollapsed(false)}
        title="Show panel"
      >‹</button>
    );
  }

  const TAB_LABELS: Record<TabKey, string> = {
    cues: "Cues", guide: "Guide", outline: "Outline", glossary: "Glossary", bookmarks: "Marks",
  };

  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col border-l border-white/10 bg-black/40 text-xs">
      {/* Section indicator at top of panel */}
      <div className="border-b border-white/10 bg-blue-500/8 px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-blue-300 truncate">
            § {currentSectionTitle}
          </span>
          <span className="text-[10px] text-slate-500 shrink-0 ml-1">
            {lesson.sections[currentSectionIdx]?.estimatedMinutes || "?"}min
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 px-1 py-1">
        <div className="flex gap-0.5">
          {(["cues", "guide", "outline", "glossary", "bookmarks"] as TabKey[]).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn(
                "rounded px-1.5 py-1 text-[11px] transition",
                tab === k ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
                k === "guide" && "font-semibold"
              )}>
              {TAB_LABELS[k]}
            </button>
          ))}
        </div>
        <button className="shrink-0 text-slate-500 hover:text-white px-1" onClick={() => setCollapsed(true)}>›</button>
      </div>

      {/* Panel body */}
      <div ref={panelBodyRef} className="flex-1 overflow-y-auto p-2 scroll-smooth">

        {/* ── CUES TAB ── */}
        {tab === "cues" && (
          <div className="space-y-2">
            {/* Current sentence cues first */}
            {sentenceCues.length > 0 && (
              <>
                <SectionLabel>▶ Current line</SectionLabel>
                {sentenceCues.map((c, i) => (
                  <CueCard key={`sc-${i}`} c={c} onJump={onJump} onStartTimer={onStartTimer} highlight />
                ))}
              </>
            )}
            {/* Rest of section */}
            {sectionCues.length > 0 && (
              <>
                <SectionLabel>This section</SectionLabel>
                {sectionCues.map((c, i) => (
                  <CueCard key={`sec-${i}`} c={c} onJump={onJump} onStartTimer={onStartTimer} />
                ))}
              </>
            )}
            {/* Other sections */}
            {otherCues.length > 0 && (
              <>
                <SectionLabel>Other sections</SectionLabel>
                {otherCues.map((c, i) => (
                  <CueCard key={`oth-${i}`} c={c} onJump={onJump} onStartTimer={onStartTimer} dim />
                ))}
              </>
            )}
            {sentenceCues.length === 0 && sectionCues.length === 0 && otherCues.length === 0 && (
              <Empty icon={<MessageSquare className="h-4 w-4" />} text="No cue cards in this lesson." />
            )}
          </div>
        )}

        {/* ── GUIDE TAB ── */}
        {tab === "guide" && (
          <TeacherGuideView
            guide={currentSectionGuide}
            sectionTitle={currentSectionTitle}
            flat={flat}
            currentSectionIdx={currentSectionIdx}
            onJump={onJump}
          />
        )}

        {/* ── OUTLINE TAB ── */}
        {tab === "outline" && (
          <div className="space-y-1">
            {lesson.sections.map((s, si) => {
              const firstIdx = flat.find((f) => f.sectionIndex === si)?.globalIndex ?? 0;
              const active = currentSectionIdx === si;
              return (
                <button key={s.id} onClick={() => onJump(firstIdx)}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition",
                    active ? "bg-blue-500/15 text-white" : "text-slate-300 hover:bg-white/5"
                  )}>
                  <span className="truncate">
                    <ListTree className="mr-1 inline h-3 w-3" />
                    {s.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-500">{s.estimatedMinutes || "?"}m</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── GLOSSARY TAB: section-relevant terms first ── */}
        {tab === "glossary" && (
          <div className="space-y-2">
            {sectionGlossary.length === 0 && otherGlossary.length === 0 && (
              <Empty icon={<BookOpen className="h-4 w-4" />} text="No glossary terms." />
            )}
            {sectionGlossary.length > 0 && (
              <>
                <SectionLabel>Used in this section</SectionLabel>
                {sectionGlossary.map((g, i) => (
                  <GlossaryCard key={i} g={g} highlight />
                ))}
              </>
            )}
            {otherGlossary.length > 0 && (
              <>
                <SectionLabel>Other terms</SectionLabel>
                {otherGlossary.map((g, i) => (
                  <GlossaryCard key={i} g={g} />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── BOOKMARKS TAB ── */}
        {tab === "bookmarks" && (
          <div className="space-y-1">
            {bookmarks.length === 0 && (
              <Empty icon={<Bookmark className="h-4 w-4" />} text="No bookmarks. Press Ctrl+B on a line." />
            )}
            {bookmarks.map((b) => (
              <button key={b} onClick={() => onJump(b)}
                className={cn(
                  "block w-full truncate rounded border border-white/10 bg-slate-900/40 px-2 py-1 text-left hover:bg-white/5",
                  b === currentIdx ? "border-amber-400/40 bg-amber-500/10 text-amber-200" : "text-slate-200"
                )}>
                ★ {flat[b]?.sentence.text.slice(0, 70) || `Line ${b}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

// ── Sub-components ──

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-1 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-slate-500">{children}</div>
);

const CueCard: React.FC<{
  c: { idx: number; cue: CueCard };
  onJump: (idx: number) => void;
  onStartTimer: (label: string, sec: number, kind?: "activity" | "wait" | "custom") => void;
  highlight?: boolean;
  dim?: boolean;
}> = ({ c, onJump, onStartTimer, highlight, dim }) => (
  <button
    onClick={() => onJump(c.idx)}
    className={cn(
      "block w-full rounded-lg border px-2 py-1.5 text-left transition",
      highlight ? "border-blue-400/60 bg-blue-500/12 ring-1 ring-blue-400/20"
        : dim ? "border-white/5 bg-slate-900/20 opacity-50"
        : "border-white/10 bg-slate-900/40 hover:bg-white/5"
    )}
  >
    <div className="mb-1 flex items-center justify-between gap-1">
      <Pill color={(cueColorMap[c.cue.category] || "slate") as any}>{c.cue.category}</Pill>
      {c.cue.hotkey ? <span className="text-[10px] text-slate-400">Ctrl+{c.cue.hotkey}</span> : null}
    </div>
    <div className="text-[12px] text-slate-100">{c.cue.text}</div>
    {c.cue.imageQuery && (
      <a className="mt-1 inline-block text-[11px] text-blue-300 hover:underline"
        target="_blank" rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(c.cue.imageQuery!)}`}>
        🔎 {c.cue.imageQuery}
      </a>
    )}
    {c.cue.durationSec && (
      <Button size="sm" className="mt-1.5 w-full"
        onClick={(e) => { e.stopPropagation(); onStartTimer(c.cue.text, c.cue.durationSec!); }}>
        <TimerIcon className="h-3 w-3" /> {c.cue.durationSec}s
      </Button>
    )}
  </button>
);

const GlossaryCard: React.FC<{ g: { term: string; definition: string; exampleSentence?: string }; highlight?: boolean }> = ({ g, highlight }) => (
  <div className={cn(
    "rounded border p-2",
    highlight ? "border-blue-500/30 bg-blue-500/5" : "border-white/10 bg-slate-900/40"
  )}>
    <div className="font-semibold text-slate-100">{g.term}</div>
    <div className="text-[11px] text-slate-300 mt-0.5">{g.definition}</div>
    {g.exampleSentence && <div className="mt-1 text-[11px] italic text-slate-400">"{g.exampleSentence}"</div>}
  </div>
);

// ── Teacher Guide view ──
const TeacherGuideView: React.FC<{
  guide?: TeacherGuide;
  sectionTitle: string;
  flat: FlatItem[];
  currentSectionIdx: number;
  onJump: (idx: number) => void;
}> = ({ guide, flat, currentSectionIdx, onJump }) => {
  const predicted = flat
    .filter((f) => f.sectionIndex === currentSectionIdx)
    .flatMap((f) => (f.sentence.ann?.predicted || []).map((p) => ({ ...p, idx: f.globalIndex })));

  if (!guide && predicted.length === 0) {
    return (
      <Empty
        icon={<GraduationCap className="h-5 w-5" />}
        text="No teacher guide for this section. Enable 'Teacher Guide' in Compose settings and regenerate."
      />
    );
  }

  return (
    <div className="space-y-2">
      {guide?.ccqs && guide.ccqs.length > 0 && (
        <GuideSection title="📋 CCQs">
          <ul className="list-disc list-inside space-y-0.5">
            {guide.ccqs.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </GuideSection>
      )}
      {guide?.extraExplanation && (
        <GuideSection title="📖 Extra Explanation">
          <p>{guide.extraExplanation}</p>
        </GuideSection>
      )}
      {guide?.sel && (
        <GuideSection title="💚 SEL">
          <p>{guide.sel}</p>
        </GuideSection>
      )}
      {guide?.softSkills && (
        <GuideSection title="🌟 Soft Skills">
          <p>{guide.softSkills}</p>
        </GuideSection>
      )}
      {guide?.discussionQuestions && guide.discussionQuestions.length > 0 && (
        <GuideSection title="💬 Discussion Questions">
          <ul className="list-disc list-inside space-y-0.5">
            {guide.discussionQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </GuideSection>
      )}
      {guide?.relatedVocabulary && guide.relatedVocabulary.length > 0 && (
        <GuideSection title="📝 Related Vocabulary">
          <div className="flex flex-wrap gap-1">
            {guide.relatedVocabulary.map((v, i) => (
              <span key={i} className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-violet-200">{v}</span>
            ))}
          </div>
        </GuideSection>
      )}
      {guide?.relatedGrammar && (
        <GuideSection title="⚙️ Grammar">
          <p>{guide.relatedGrammar}</p>
        </GuideSection>
      )}
      {guide?.homeworkIdea && (
        <GuideSection title="📚 Homework">
          <p>{guide.homeworkIdea}</p>
        </GuideSection>
      )}
      {guide?.onlineChallenges && guide.onlineChallenges.length > 0 && (
        <GuideSection title="🎮 Online Challenges">
          <ul className="list-disc list-inside space-y-0.5">
            {guide.onlineChallenges.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </GuideSection>
      )}
      {guide?.activities && guide.activities.length > 0 && (
        <GuideSection title="🎯 Activities">
          <ul className="list-disc list-inside space-y-0.5">
            {guide.activities.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </GuideSection>
      )}
      {guide?.teacherTips && (
        <GuideSection title="💡 Tips">
          <p>{guide.teacherTips}</p>
        </GuideSection>
      )}
      {predicted.length > 0 && (
        <GuideSection title="❓ Predicted Questions">
          <div className="space-y-1">
            {predicted.map((p, i) => (
              <button key={i} onClick={() => onJump(p.idx)}
                className={cn(
                  "block w-full rounded px-1 py-0.5 text-left hover:bg-white/5 border border-transparent",
                  "" // highlight removed
                )}>
                <span className="text-slate-100">Q: {p.q}</span>
                {p.hint && <span className="block text-[10px] text-slate-400 mt-0.5">💡 {p.hint}</span>}
              </button>
            ))}
          </div>
        </GuideSection>
      )}
    </div>
  );
};

const GuideSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-2">
    <div className="mb-1.5 text-[11px] font-semibold text-slate-200">{title}</div>
    <div className="text-[11px] text-slate-300 leading-relaxed">{children}</div>
  </div>
);

const Empty: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex flex-col items-center gap-1 p-4 text-slate-500">
    {icon}
    <span className="text-center">{text}</span>
  </div>
);
