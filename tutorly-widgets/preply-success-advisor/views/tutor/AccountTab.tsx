import React, { useEffect, useMemo, useState } from "react";
import PromptModal from "../../components/PromptModal";
import AudioPlayer from "../../components/AudioPlayer";
import { Avatar, Btn, Card, Disclosure, Field, Meter, Pill, SectionTitle, inputClass } from "../../components/ui";
import { accountCompleteness } from "../../lib/domain";
import { accountCreationPrompt, checkAndFixPrompt } from "../../lib/prompts";
import { describeChanges, normalizeAccount, normalizeVideoScripts } from "../../lib/normalize";
import { imageFromPaste, toMinimalDataUrl, readableBytes } from "../../lib/image";
import { moneyPair } from "../../lib/format";
import { joinList, numberOr, splitList, type TutorTabProps } from "./common";

/**
 * Account data creation.
 *
 * This is the original "Create New Profile" flow, now living inside each tutor. The
 * AI does the writing; the mentor pastes the JSON back and every field lands here for
 * editing. The paste step reports what it received — including how many video scripts
 * came through — because a model that answers with a bare array of strings used to
 * produce empty script boxes with no warning.
 */
const AccountTab: React.FC<TutorTabProps & { autoCreate?: boolean; onAutoCreateHandled?: () => void }> = ({
  tutor,
  platform,
  rialPerUsd,
  update,
  toast,
  autoCreate,
  onAutoCreateHandled,
}) => {
  const [prompt, setPrompt] = useState<ReturnType<typeof accountCreationPrompt> | null>(null);

  /**
   * The profile header's "Create the account content" shortcut lands here with
   * `autoCreate` set, so the button does what it says instead of only switching tab.
   */
  useEffect(() => {
    if (!autoCreate) return;
    setPrompt(accountCreationPrompt(tutor));
    onAutoCreateHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate]);
  const [fixTarget, setFixTarget] = useState<{ label: string; apply: (text: string) => void } | null>(null);
  const a = tutor.account;
  const completeness = useMemo(() => accountCompleteness(a), [a]);

  const setAccount = (patch: Partial<typeof a>) => update((t) => ({ ...t, account: { ...t.account, ...patch } }));

  const handlePhotoPaste = async (file: File | null) => {
    if (!file) return;
    try {
      const processed = await toMinimalDataUrl(file);
      setAccount({ photo: processed.dataUrl });
      toast(`Photo saved at ${readableBytes(processed.bytes)} — small enough to keep in the backup.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "That image could not be read.", "error");
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          icon="🧱"
          title="Account data creation"
          sub={`Everything ${platform.name} asks for on its profile page, in one place.`}
          right={
            <Btn onClick={() => setPrompt(accountCreationPrompt(tutor))}>🤖 Create the account content</Btn>
          }
        />
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div>
            <Meter value={completeness.percent} color="#FF79AC" label="Profile completeness" right={`${completeness.done}/${completeness.total}`} height={10} />
            {completeness.missing.length > 0 && (
              <ul className="mt-3 space-y-1">
                {completeness.missing.map((m) => (
                  <li key={m} className="flex items-start gap-1.5 text-[12px] text-[#121118]/86">
                    <span className="text-[#FF79AC]">•</span>
                    {m}
                  </li>
                ))}
              </ul>
            )}
            {completeness.missing.length === 0 && (
              <p className="mt-3 rounded-xl bg-emerald-50 p-2 text-[12px] font-semibold text-emerald-700">
                ✅ Every piece of the profile is filled in.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Field
              label="Background material the AI writes from"
              hint="Paste the résumé, the notes, the chat where they described themselves. This is the source the prompt carries."
            >
              <textarea
                className={`${inputClass} h-32 resize-y`}
                value={tutor.sourceText}
                onChange={(e) => update((t) => ({ ...t, sourceText: e.target.value }))}
                placeholder="Everything you know about this tutor's teaching background…"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Btn
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(tutor.sourceText);
                  toast("Background material copied.", "info");
                }}
              >
                📋 Copy material
              </Btn>
              <Pill tone={platform.color}>{platform.emoji} {platform.name} fields</Pill>
            </div>
          </div>
        </div>
      </Card>

      {/* Photo */}
      <Card>
        <SectionTitle icon="📷" title="Profile photo" sub="Paste a screenshot straight from your chat with the tutor." />
        <div
          tabIndex={0}
          onPaste={(e) => {
            const file = imageFromPaste(e);
            if (file) {
              e.preventDefault();
              void handlePhotoPaste(file);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0] ?? null;
            void handlePhotoPaste(file);
          }}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-black/22 bg-black/[0.05] p-4"
        >
          <Avatar src={a.photo} name={tutor.name} size={76} ring={`${platform.color}55`} />
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-semibold">Click here and press Ctrl/⌘+V, or drop an image</p>
            <p className="mt-0.5 text-[12px] text-[#121118]/82">
              The image is cropped square, resized to 192px and stored as JPEG — a few kilobytes, so the whole backup stays small.
            </p>
            <div className="mt-2 flex gap-2">
              <label className="cursor-pointer rounded-xl border border-black/16 bg-white px-3 py-1.5 text-xs font-semibold hover:border-black/34">
                Choose a file
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handlePhotoPaste(e.target.files?.[0] ?? null)}
                />
              </label>
              {a.photo && (
                <Btn size="sm" variant="danger" onClick={() => setAccount({ photo: undefined })}>
                  Remove photo
                </Btn>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Headlines */}
      <Card>
        <SectionTitle
          icon="✨"
          title="Headlines"
          sub="Three options, 50–75 characters each. These are what students read first."
          right={
            <Btn
              size="sm"
              variant="outline"
              onClick={() => setAccount({ headlines: [...a.headlines, ""] })}
            >
              ＋ Add headline
            </Btn>
          }
        />
        <div className="space-y-2">
          {a.headlines.map((headline, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={inputClass}
                value={headline}
                onChange={(e) => setAccount({ headlines: a.headlines.map((h, j) => (j === i ? e.target.value : h)) })}
                placeholder="e.g. IELTS coach who gets you to band 7"
              />
              <span className={`w-12 shrink-0 text-right text-[12px] tabular-nums ${headline.length > 75 ? "text-red-500" : "text-[#121118]/78"}`}>
                {headline.length}
              </span>
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => setFixTarget({ label: `headline ${i + 1}`, apply: (text) => setAccount({ headlines: a.headlines.map((h, j) => (j === i ? text : h)) }) })}
              >
                🩹
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setAccount({ headlines: a.headlines.filter((_, j) => j !== i) })}>
                🗑
              </Btn>
            </div>
          ))}
          {a.headlines.length === 0 && (
            <p className="rounded-2xl border border-dashed border-black/16 p-4 text-center text-xs text-[#121118]/78">
              No headlines yet — run <b>Create the account content</b> above.
            </p>
          )}
        </div>
      </Card>

      {/* Description */}
      <Card>
        <SectionTitle
          icon="✍️"
          title="Description"
          sub="At least 200 words, split into Introduce Yourself / Teaching Experience / Motivate Learners."
          right={
            <Btn size="sm" variant="outline" onClick={() => setFixTarget({ label: "the description", apply: (text) => setAccount({ description: text }) })}>
              🩹 Check &amp; fix
            </Btn>
          }
        />
        <textarea
          className={`${inputClass} h-64 resize-y font-mono text-[13px] leading-relaxed`}
          value={a.description}
          onChange={(e) => setAccount({ description: e.target.value })}
          placeholder="The full description…"
        />
        <div className="mt-2 flex items-center justify-between text-[12px] text-[#121118]/82">
          <span>{a.description.trim().split(/\s+/).filter(Boolean).length} words</span>
          <span className={a.description.length > 200 ? "text-emerald-600" : ""}>{a.description.length} characters</span>
        </div>
      </Card>

      {/* Video scripts */}
      <Card>
        <SectionTitle
          icon="🎬"
          title="Video scripts"
          sub="Two scripts, 45–60 seconds each, with a stress guide. Read one aloud with the play button."
          right={
            <Btn
              size="sm"
              variant="outline"
              onClick={() => setAccount({ videoScripts: [...a.videoScripts, { plain: "", pronunciation: "" }] })}
            >
              ＋ Add script
            </Btn>
          }
        />
        <div className="space-y-4">
          {a.videoScripts.map((script, i) => (
            <div key={i} className="rounded-2xl border border-black/12 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">Script {i + 1}</p>
                <div className="flex gap-1">
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setFixTarget({
                        label: `video script ${i + 1}`,
                        apply: (text) =>
                          setAccount({
                            videoScripts: a.videoScripts.map((s, j) => (j === i ? { ...s, plain: text } : s)),
                          }),
                      })
                    }
                  >
                    🩹 Check &amp; fix
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setAccount({ videoScripts: a.videoScripts.filter((_, j) => j !== i) })}>
                    🗑
                  </Btn>
                </div>
              </div>
              <textarea
                className={`${inputClass} h-40 resize-y text-[13px] leading-relaxed`}
                value={script.plain}
                onChange={(e) => setAccount({ videoScripts: a.videoScripts.map((s, j) => (j === i ? { ...s, plain: e.target.value } : s)) })}
                placeholder="The script, in plain English…"
              />
              <div className="mt-2 grid gap-2 lg:grid-cols-2">
                <Field label="Pronunciation / stress guide">
                  <textarea
                    className={`${inputClass} h-24 resize-y font-mono text-[12px]`}
                    value={script.pronunciation}
                    onChange={(e) =>
                      setAccount({ videoScripts: a.videoScripts.map((s, j) => (j === i ? { ...s, pronunciation: e.target.value } : s)) })
                    }
                    placeholder="I am a pro-FESS-ion-al TUT-or…"
                  />
                </Field>
                <div>
                  <AudioPlayer scriptText={script.plain} scriptIndex={i} />
                </div>
              </div>
              <p className="mt-2 text-[12px] text-[#121118]/78">
                {script.plain.trim().split(/\s+/).filter(Boolean).length} words · about{" "}
                {Math.max(1, Math.round(script.plain.trim().split(/\s+/).filter(Boolean).length / 2.6))} seconds read aloud
              </p>
            </div>
          ))}
          {a.videoScripts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-black/16 p-4 text-center text-xs text-[#121118]/78">
              No scripts yet. If a paste came back without them, the same prompt now reports it — see the step-3 summary
              in the paste window.
            </p>
          )}
        </div>
      </Card>

      {/* Subjects */}
      <Card>
        <SectionTitle
          icon="📚"
          title="Subjects"
          sub="Each subject needs its own paragraph written for that subject."
          right={
            <Btn size="sm" variant="outline" onClick={() => setAccount({ subjects: [...a.subjects, { name: "", description: "" }] })}>
              ＋ Add subject
            </Btn>
          }
        />
        <div className="space-y-3">
          {a.subjects.map((subject, i) => (
            <div key={i} className="rounded-2xl border border-black/12 p-3">
              <div className="flex items-center gap-2">
                <input
                  className={inputClass}
                  value={subject.name}
                  placeholder="Conversational English"
                  onChange={(e) => setAccount({ subjects: a.subjects.map((s, j) => (j === i ? { ...s, name: e.target.value } : s)) })}
                />
                <Btn size="sm" variant="ghost" onClick={() => setAccount({ subjects: a.subjects.filter((_, j) => j !== i) })}>
                  🗑
                </Btn>
              </div>
              <textarea
                className={`${inputClass} mt-2 h-24 resize-y`}
                value={subject.description}
                placeholder="Why this tutor is good at this subject, concretely…"
                onChange={(e) => setAccount({ subjects: a.subjects.map((s, j) => (j === i ? { ...s, description: e.target.value } : s)) })}
              />
            </div>
          ))}
          {a.subjects.length === 0 && <p className="text-xs text-[#121118]/78">No subjects yet.</p>}
        </div>
      </Card>

      {/* Lists and numbers */}
      <Card>
        <SectionTitle icon="🎯" title="Levels, age groups, certificates, specialties" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="Proficiency levels" hint="Comma separated">
            <input className={inputClass} value={joinList(a.proficiencyLevels)} onChange={(e) => setAccount({ proficiencyLevels: splitList(e.target.value) })} placeholder="Beginner, Intermediate, Advanced" />
          </Field>
          <Field label="Age groups" hint="Comma separated">
            <input className={inputClass} value={joinList(a.ageGroups)} onChange={(e) => setAccount({ ageGroups: splitList(e.target.value) })} placeholder="Adults, Teenagers, Children" />
          </Field>
          <Field label="Certificates" hint="Comma separated">
            <input className={inputClass} value={joinList(a.certificates)} onChange={(e) => setAccount({ certificates: splitList(e.target.value) })} placeholder="TEFL, CELTA, BA English" />
          </Field>
          <Field label="Specialties" hint="Aim for 3–4, each with a clear goal">
            <input className={inputClass} value={joinList(a.specialties)} onChange={(e) => setAccount({ specialties: splitList(e.target.value) })} placeholder="IELTS Preparation, Business English" />
          </Field>
          <Field label="Availability (hours per week)" hint="Only hours they will genuinely teach">
            <input type="number" className={inputClass} value={a.availabilityHours || ""} onChange={(e) => setAccount({ availabilityHours: numberOr(e.target.value) })} />
          </Field>
          <Field label="Hourly price" hint={a.priceUsd ? moneyPair(a.priceUsd, rialPerUsd) : "Set it, then benchmark it against the market"}>
            <input type="number" className={inputClass} value={a.priceUsd || ""} onChange={(e) => setAccount({ priceUsd: numberOr(e.target.value) })} />
          </Field>
        </div>
      </Card>

      {Object.keys(a.extra ?? {}).length > 0 && (
        <Card>
          <SectionTitle
            icon="🗃️"
            title="Everything else the AI sent"
            sub="Fields that had no fixed home are kept here instead of being thrown away."
          />
          <div className="space-y-2">
            {Object.entries(a.extra).map(([label, text]) => (
              <Disclosure key={label} title={label}>
                <p className="whitespace-pre-line text-xs text-[#121118]/91">{text}</p>
              </Disclosure>
            ))}
          </div>
        </Card>
      )}

      <PromptModal
        open={!!prompt}
        onClose={() => setPrompt(null)}
        title={prompt?.title ?? ""}
        purpose={prompt?.purpose}
        prompt={prompt?.prompt ?? ""}
        schema={prompt?.schema}
        summarize={(parsed) => {
          const mapped = normalizeAccount(parsed);
          const report = describeChanges(parsed, mapped as Record<string, unknown>);
          const scripts = normalizeVideoScripts(
            (parsed as Record<string, unknown>)?.videoScripts ??
              (parsed as Record<string, unknown>)?.video_scripts ??
              (parsed as Record<string, unknown>)?.scripts,
          );
          return [
            `Filled: ${report.filled.join(", ") || "nothing"}`,
            `Video scripts: ${scripts.length}${scripts.length === 0 ? "  ← none came back, run the prompt again" : ""}`,
            `Headlines: ${mapped.headlines?.length ?? 0} · Description: ${mapped.description?.length ?? 0} characters`,
            report.ignored.length ? `Ignored keys: ${report.ignored.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        }}
        onApply={(parsed) => {
          const patch = normalizeAccount(parsed);
          if (!Object.keys(patch).length) throw new Error("Nothing in that answer matched a profile field. Check you used the right prompt.");
          update((t) => ({ ...t, account: { ...t.account, ...patch } }));
          const scriptCount = patch.videoScripts?.length ?? 0;
          toast(
            `Profile content applied: ${patch.headlines?.length ?? 0} headlines, description ${patch.description?.length ?? 0} characters, ${scriptCount} video script${scriptCount === 1 ? "" : "s"}.`,
          );
        }}
      />

      <PromptModal
        open={!!fixTarget}
        onClose={() => setFixTarget(null)}
        title={checkAndFixPrompt("", fixTarget?.label ?? "text").title}
        purpose={checkAndFixPrompt("", fixTarget?.label ?? "text").purpose}
        prompt={checkAndFixPrompt(tutor.account.description || tutor.sourceText || "", fixTarget?.label ?? "text").prompt}
        schema={checkAndFixPrompt("", fixTarget?.label ?? "text").schema}
        summarize={(parsed) => {
          const fixed = (parsed as Record<string, unknown>)?.fixed ?? (parsed as Record<string, unknown>)?.text;
          return typeof fixed === "string" ? `${fixed.length} characters of corrected text, changes in bold.` : "No corrected text found in that answer.";
        }}
        onApply={(parsed) => {
          const fixed = (parsed as Record<string, unknown>)?.fixed ?? (parsed as Record<string, unknown>)?.text;
          if (typeof fixed !== "string" || !fixed.trim()) throw new Error('The answer needs a "fixed" field with the corrected text.');
          fixTarget?.apply(fixed);
          toast("Corrected text applied — every change is marked in bold.");
        }}
      />
    </div>
  );
};

export default AccountTab;
