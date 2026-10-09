import React, { useMemo, useState } from "react";
import { useStore } from "../store/useStore";
import { buildPrompt } from "../prompt/promptBuilder";
import { parseLessonJson } from "../prompt/validate";
import { Button, Card, Field, Input, Pill, Select, Textarea, Toggle } from "./ui";
import {
  ClipboardCopy, ClipboardPaste, Sparkles, Users, BookOpenText, FileJson,
  CheckCircle2, AlertTriangle, Play, Trash2, FileUp, FileDown, Wand2,
  Plus, X, UserPlus, Settings, Download, Upload, GraduationCap,
} from "lucide-react";
import { DEMO_LESSON, DEMO_LESSON_JSON } from "../demo/demoLesson";
import type { CustomProfile } from "../types";

const PROFILES: { value: string; label: string; hint: string }[] = [
  { value: "lesson", label: "Lesson Plan", hint: "Language or any concept (PPP/ESA)" },
  { value: "free_discussion", label: "Free Discussion", hint: "Mostly questions & follow-ups" },
  { value: "friendly_chat", label: "Friendly Chat", hint: "Rapport-building, casual" },
  { value: "trial_preply", label: "Trial Lesson (Preply)", hint: "25-min intro to assessment to plan" },
  { value: "content_maker", label: "Content Maker", hint: "YT / IG / TikTok / Shorts" },
  { value: "profile_intro", label: "Profile Introduction", hint: "Marketplace tutor intro video" },
  { value: "custom", label: "Custom Profile ✏️", hint: "Your own custom profile" },
];

export const LessonComposer: React.FC<{ onLessonReady: () => void }> = ({
  onLessonReady,
}) => {
  const {
    rawLessonText, setRawLessonText,
    lessonJsonText, setLessonJsonText,
    setLesson,
    prompt, setPrompt,
    learner,
    learners, addLearner, removeLearner, setActiveLearner, updateLearner, activeLearnerIdx,
    customProfiles, addCustomProfile, removeCustomProfile,
    studentRoster, setStudentRoster,
    exportSettings, importSettings,
  } = useStore();

  const [copyState, setCopyState] = useState<"idle" | "ok">("idle");
  const [parseMsg, setParseMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showCustomProfileForm, setShowCustomProfileForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDesc, setNewProfileDesc] = useState("");
  const [newProfileInstr, setNewProfileInstr] = useState("");

  const fullPrompt = useMemo(
    () => buildPrompt({ rawLesson: rawLessonText, settings: prompt, learner, customProfiles }),
    [rawLessonText, prompt, learner, customProfiles],
  );

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  async function pasteJson() {
    try {
      const txt = await navigator.clipboard.readText();
      setLessonJsonText(txt);
    } catch {
      setParseMsg({ ok: false, msg: "Clipboard read blocked — paste manually below." });
    }
  }

  function loadJson() {
    const res = parseLessonJson(lessonJsonText);
    if (res.ok && res.lesson) {
      setLesson(res.lesson);
      setParseMsg({ ok: true, msg: `Loaded "${res.lesson.title}" — ${res.lesson.sections.length} sections.` });
      onLessonReady();
    } else {
      setParseMsg({ ok: false, msg: res.error || "Could not parse JSON." });
    }
  }

  function downloadLesson() {
    const blob = new Blob([lessonJsonText || ""], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutorly-lesson-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setLessonJsonText(String(r.result || ""));
    r.readAsText(f);
  }

  function handleExportSettings() {
    const json = exportSettings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutorly-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportSettings(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const ok = importSettings(String(r.result || ""));
      if (ok) setParseMsg({ ok: true, msg: "Settings imported successfully!" });
      else setParseMsg({ ok: false, msg: "Could not parse settings file." });
    };
    r.readAsText(f);
  }

  function handleAddCustomProfile() {
    if (!newProfileName.trim()) return;
    const id = Math.random().toString(36).slice(2, 10);
    const cp: CustomProfile = {
      id,
      name: newProfileName.trim(),
      description: newProfileDesc.trim(),
      instructions: newProfileInstr.trim(),
    };
    addCustomProfile(cp);
    setPrompt({ profile: "custom", customProfileId: id });
    setShowCustomProfileForm(false);
    setNewProfileName("");
    setNewProfileDesc("");
    setNewProfileInstr("");
  }

  const verbosityLabel = { minimal: "Minimal", average: "Standard (2×)", maximum: "Maximum (5×)" };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* LEFT */}
      <div className="lg:col-span-7 space-y-4">
        {/* Profile & timing */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Sparkles className="h-4 w-4 text-blue-400" /> Profile & timing
            </h2>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleExportSettings} title="Export all settings">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".json" className="hidden" onChange={handleImportSettings} />
                <span className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-transparent px-2 text-xs text-slate-200 hover:bg-white/5">
                  <Upload className="h-3.5 w-3.5" /> Import
                </span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Profile">
              <Select
                value={prompt.profile}
                onChange={(e) => setPrompt({ profile: e.target.value as any })}
              >
                {PROFILES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
                {customProfiles.map((cp) => (
                  <option key={cp.id} value="custom">{`Custom: ${cp.name}`}</option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] text-slate-500">
                {PROFILES.find((p) => p.value === prompt.profile)?.hint}
              </p>
            </Field>
            <Field label="Target minutes">
              <Input
                type="number"
                min={1}
                max={180}
                value={prompt.targetMinutes}
                onChange={(e) => setPrompt({ targetMinutes: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Wait time (sec)" hint="After questions">
              <Input
                type="number"
                min={1}
                max={30}
                value={prompt.waitTimeSec}
                onChange={(e) => setPrompt({ waitTimeSec: Number(e.target.value) || 5 })}
              />
            </Field>
          </div>

          {/* Custom profile management */}
          {prompt.profile === "custom" && (
            <div className="mt-3 space-y-2">
              {customProfiles.length > 0 && (
                <div className="space-y-1">
                  {customProfiles.map((cp) => (
                    <div key={cp.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2">
                      <div>
                        <button onClick={() => setPrompt({ customProfileId: cp.id })}
                          className={`text-sm font-medium ${prompt.customProfileId === cp.id ? "text-blue-400" : "text-slate-200"}`}>
                          {cp.name}
                        </button>
                        <p className="text-[10px] text-slate-500">{cp.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setPrompt({ customProfileId: cp.id })}>Use</Button>
                        <Button size="sm" variant="ghost" onClick={() => removeCustomProfile(cp.id)}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!showCustomProfileForm ? (
                <Button size="sm" variant="ghost" onClick={() => setShowCustomProfileForm(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add custom profile
                </Button>
              ) : (
                <div className="space-y-2 rounded-lg border border-white/10 bg-slate-900/30 p-3">
                  <Field label="Profile name">
                    <Input value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="E.g., IELTS Prep" />
                  </Field>
                  <Field label="Description">
                    <Input value={newProfileDesc} onChange={(e) => setNewProfileDesc(e.target.value)} placeholder="Short description" />
                  </Field>
                  <Field label="Custom instructions (sent to AI)">
                    <Textarea rows={3} value={newProfileInstr} onChange={(e) => setNewProfileInstr(e.target.value)}
                      placeholder="E.g., Use IELTS-style structure, include band descriptors..." />
                  </Field>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCustomProfile}>Save profile</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowCustomProfileForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {prompt.profile === "content_maker" && (
            <Field label="Platform" className="mt-3">
              <Select value={prompt.contentPlatform} onChange={(e) => setPrompt({ contentPlatform: e.target.value as any })}>
                <option value="youtube">YouTube (long-form)</option>
                <option value="shorts">YouTube Shorts</option>
                <option value="instagram">Instagram Reels</option>
                <option value="tiktok">TikTok</option>
                <option value="profile_intro">Profile Intro (marketplace)</option>
              </Select>
            </Field>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {(prompt.profile === "lesson" || prompt.profile === "custom") && (
              <>
                <Toggle checked={prompt.includeWarmUp} onChange={(v) => setPrompt({ includeWarmUp: v })} label="Warm-up" />
                <Toggle checked={prompt.includeLeadIn} onChange={(v) => setPrompt({ includeLeadIn: v })} label="Lead-in" />
                <Toggle checked={prompt.includeCooler} onChange={(v) => setPrompt({ includeCooler: v })} label="Cooler / wrap-up" />
                <Toggle checked={prompt.includeBlooms} onChange={(v) => setPrompt({ includeBlooms: v })} label="Bloom's tags" />
              </>
            )}
            <Toggle checked={prompt.includePronunciation} onChange={(v) => setPrompt({ includePronunciation: v })} label="Pronunciation (IPA)" />
            <Toggle checked={prompt.includePredictedQuestions} onChange={(v) => setPrompt({ includePredictedQuestions: v })} label="Predicted student Qs" />
            <Toggle checked={prompt.includeWhiteboard} onChange={(v) => setPrompt({ includeWhiteboard: v })} label="Whiteboard / image cues" />
            <Toggle checked={prompt.includeFormative} onChange={(v) => setPrompt({ includeFormative: v })} label="Formative check-ins" />
            <Toggle checked={prompt.bilingualMode} onChange={(v) => setPrompt({ bilingualMode: v, includeTranslation: v })} label="Bilingual translations" />
            {prompt.bilingualMode && (
              <Field label="Translate to">
                <Input value={prompt.translationLanguage} onChange={(e) => setPrompt({ translationLanguage: e.target.value })} placeholder="Spanish, Mandarin…" />
              </Field>
            )}
          </div>
        </Card>

        {/* Learner facts — multi-learner */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Users className="h-4 w-4 text-emerald-400" /> Learner facts
            </h2>
            <Button size="sm" variant="ghost" onClick={addLearner}>
              <UserPlus className="h-3.5 w-3.5" /> Add learner
            </Button>
          </div>

          {/* Learner tabs */}
          {learners.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {learners.map((l, i) => (
                <div key={l.id} className="flex items-center gap-0.5">
                  <button
                    onClick={() => setActiveLearner(i)}
                    className={`rounded px-2 py-1 text-xs ${activeLearnerIdx === i ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "bg-white/5 text-slate-400 hover:text-white"}`}
                  >
                    {l.name || `Learner ${i + 1}`}
                  </button>
                  {learners.length > 1 && (
                    <button onClick={() => removeLearner(l.id)} className="text-slate-500 hover:text-rose-400">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={learner.name} onChange={(e) => updateLearner(learner.id, { name: e.target.value })} placeholder="Maria" />
            </Field>
            <Field label="L1 (native language)" hint="used for accent markers">
              <Input value={learner.l1} onChange={(e) => updateLearner(learner.id, { l1: e.target.value })} placeholder="Spanish" />
            </Field>
            <Field label="CEFR">
              <Select value={learner.cefr} onChange={(e) => updateLearner(learner.id, { cefr: e.target.value as any })}>
                {["A1","A2","B1","B2","C1","C2"].map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Age (optional)">
              <Input value={learner.age} onChange={(e) => updateLearner(learner.id, { age: e.target.value })} placeholder="34" />
            </Field>
            <Field label="Target accent" hint="AI marks accent-specific pronunciation">
              <Input value={learner.targetAccent || ""} onChange={(e) => updateLearner(learner.id, { targetAccent: e.target.value })} placeholder="American English, British, Australian…" />
            </Field>
            <Field label="Interests" className="col-span-2">
              <Input value={learner.interests} onChange={(e) => updateLearner(learner.id, { interests: e.target.value })} placeholder="travel, cooking, tech" />
            </Field>
            <Field label="Goals" className="col-span-2">
              <Input value={learner.goals} onChange={(e) => updateLearner(learner.id, { goals: e.target.value })} placeholder="prepare for a job interview in 6 weeks" />
            </Field>
            <Field label="Other notes / personalization" className="col-span-2">
              <Textarea rows={2} value={learner.notes} onChange={(e) => updateLearner(learner.id, { notes: e.target.value })} placeholder="Loves dogs, struggles with present perfect, shy at first…" />
            </Field>
            <Field label="Student roster (one per line — for {{Student}})" className="col-span-2">
              <Textarea
                rows={2}
                value={studentRoster.join("\n")}
                onChange={(e) => setStudentRoster(e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                placeholder={"Maria\nDiego"}
              />
            </Field>
          </div>
        </Card>

        {/* Source lesson material + custom AI instructions + verbosity */}
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <BookOpenText className="h-4 w-4 text-amber-400" /> Source lesson material
          </h2>
          <Textarea
            rows={9}
            value={rawLessonText}
            onChange={(e) => setRawLessonText(e.target.value)}
            placeholder="Paste your raw lesson notes, syllabus, target grammar, vocab list, slide bullets, or simply describe the topic… The AI will turn this into a teleprompter-ready script."
          />

          <div className="mt-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Settings className="h-4 w-4 text-violet-400" /> Custom instructions
            </h3>
            <Textarea
              rows={3}
              value={prompt.customInstructions}
              onChange={(e) => setPrompt({ customInstructions: e.target.value })}
              placeholder="Add any special instructions — focus on these errors, include real-world examples about X, use humor, make the practice section longer, etc."
            />
          </div>

          {/* Verbosity slider */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Content quantity</span>
              <Pill color={prompt.verbosity === "maximum" ? "rose" : prompt.verbosity === "average" ? "blue" : "slate"}>
                {verbosityLabel[prompt.verbosity]}
              </Pill>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              value={prompt.verbosity === "minimal" ? 0 : prompt.verbosity === "average" ? 1 : 2}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPrompt({ verbosity: v === 0 ? "minimal" : v === 1 ? "average" : "maximum" });
              }}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>Minimal</span>
              <span>Standard (2×)</span>
              <span>Maximum (5×)</span>
            </div>
          </div>
        </Card>

        {/* Teacher Guide section */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <GraduationCap className="h-4 w-4 text-blue-400" /> Teacher Guide
            </h2>
            <Toggle
              checked={prompt.teacherGuide.enabled}
              onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, enabled: v } })}
              label="Enabled"
            />
          </div>
          {prompt.teacherGuide.enabled && (
            <>
              <p className="mb-3 text-[11px] text-slate-400">
                Check which fields to include in the teacher guide for each section:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Toggle
                  checked={prompt.teacherGuide.ccqs}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, ccqs: v } })}
                  label="CCQs"
                  hint="Concept-checking questions"
                />
                <Toggle
                  checked={prompt.teacherGuide.extraExplanation}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, extraExplanation: v } })}
                  label="Extra explanations"
                />
                <Toggle
                  checked={prompt.teacherGuide.sel}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, sel: v } })}
                  label="SEL"
                  hint="Social-emotional learning"
                />
                <Toggle
                  checked={prompt.teacherGuide.softSkills}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, softSkills: v } })}
                  label="Soft skills"
                  hint="Future-ready skills"
                />
                <Toggle
                  checked={prompt.teacherGuide.discussionQuestions}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, discussionQuestions: v } })}
                  label="Discussion questions"
                />
                <Toggle
                  checked={prompt.teacherGuide.relatedVocabulary}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, relatedVocabulary: v } })}
                  label="Related vocabulary"
                />
                <Toggle
                  checked={prompt.teacherGuide.relatedGrammar}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, relatedGrammar: v } })}
                  label="Related grammar"
                />
                <Toggle
                  checked={prompt.teacherGuide.homeworkIdea}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, homeworkIdea: v } })}
                  label="Homework ideas"
                />
                <Toggle
                  checked={prompt.teacherGuide.onlineChallenges}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, onlineChallenges: v } })}
                  label="Online challenges"
                />
                <Toggle
                  checked={prompt.teacherGuide.activities}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, activities: v } })}
                  label="Activities"
                />
                <Toggle
                  checked={prompt.teacherGuide.teacherTips}
                  onChange={(v) => setPrompt({ teacherGuide: { ...prompt.teacherGuide, teacherTips: v } })}
                  label="Teacher tips"
                />
              </div>

              {/* Custom items */}
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Custom items</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newItems = [...prompt.teacherGuide.customItems, ""];
                      setPrompt({ teacherGuide: { ...prompt.teacherGuide, customItems: newItems } });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {prompt.teacherGuide.customItems.length > 0 && (
                  <div className="space-y-2">
                    {prompt.teacherGuide.customItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={item}
                          onChange={(e) => {
                            const newItems = [...prompt.teacherGuide.customItems];
                            newItems[i] = e.target.value;
                            setPrompt({ teacherGuide: { ...prompt.teacherGuide, customItems: newItems } });
                          }}
                          placeholder={`Custom item ${i + 1} (e.g., Cultural notes, Real-world examples)`}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newItems = prompt.teacherGuide.customItems.filter((_, idx) => idx !== i);
                            setPrompt({ teacherGuide: { ...prompt.teacherGuide, customItems: newItems } });
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* RIGHT: Prompt + JSON */}
      <div className="lg:col-span-5 space-y-4">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Sparkles className="h-4 w-4 text-violet-400" /> 1) Copy prompt
            </h2>
            <Pill color="violet">≈{Math.round(fullPrompt.length / 4)} tokens</Pill>
          </div>
          <p className="mb-3 text-[12px] text-slate-400">
            Paste into ChatGPT (or any LLM). It returns a JSON. No API keys needed.
          </p>
          <Button onClick={copyPrompt} variant="primary" size="lg" className="w-full">
            {copyState === "ok" ? <><CheckCircle2 className="h-4 w-4" /> Copied!</> : <><ClipboardCopy className="h-4 w-4" /> Copy formatted prompt</>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              setLessonJsonText(DEMO_LESSON_JSON);
              setLesson(DEMO_LESSON);
              setParseMsg({ ok: true, msg: `Demo lesson loaded — "${DEMO_LESSON.title}". Click Teleprompter above to try it.` });
              onLessonReady();
            }}
          >
            <Wand2 className="h-3.5 w-3.5" /> Skip — try a demo lesson
          </Button>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">Preview prompt</summary>
            <pre className="mt-2 max-h-60 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-slate-300 whitespace-pre-wrap">
              {fullPrompt}
            </pre>
          </details>
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <FileJson className="h-4 w-4 text-cyan-400" /> 2) Paste returned JSON
          </h2>
          <Textarea
            rows={10}
            value={lessonJsonText}
            onChange={(e) => setLessonJsonText(e.target.value)}
            placeholder='Paste the JSON the AI returned…'
            className="font-mono text-[12px]"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="subtle" onClick={pasteJson}><ClipboardPaste className="h-4 w-4" /> Paste clipboard</Button>
            <Button variant="primary" onClick={loadJson}><Play className="h-4 w-4" /> Load lesson</Button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="application/json,.json" className="hidden" onChange={importJsonFile} />
              <span className="inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-slate-200 hover:bg-white/10">
                <FileUp className="h-3.5 w-3.5" /> Import
              </span>
            </label>
            <Button size="sm" variant="ghost" onClick={downloadLesson}><FileDown className="h-3.5 w-3.5" /> Save .json</Button>
            <Button size="sm" variant="ghost" onClick={() => { setLessonJsonText(""); setLesson(null); setParseMsg(null); }}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
          {parseMsg && (
            <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              parseMsg.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}>
              {parseMsg.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{parseMsg.msg}</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
