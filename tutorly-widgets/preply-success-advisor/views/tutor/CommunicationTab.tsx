import React, { useMemo, useState } from "react";
import PromptModal from "../../components/PromptModal";
import ReadyCommsCard from "./ReadyCommsCard";
import { Btn, Card, Disclosure, Empty, Field, Pill, SectionTitle, inputClass } from "../../components/ui";
import { communicationPrompt } from "../../lib/prompts";
import { isoDate, normalizeLog, normalizeProfileUpdates } from "../../lib/normalize";
import { moodMeta, newLog, nudgesFor, phaseMeta } from "../../lib/domain";
import { moneyPair, relativeDate, shortDate, toman } from "../../lib/format";
import type { Goal, LogEntry, Swot } from "../../types";
import type { TutorTabProps } from "./common";

/**
 * The conversation log.
 *
 * This is the flow you actually run: you talk to a tutor in Persian or English, you
 * paste the chat, and the AI writes it up — a **concise English version that becomes
 * the log**, a read on how they are doing, the SWOT, your follow-ups, and the profile
 * changes the conversation justifies. You apply it once and the tutor's phase, tags,
 * price, hours, notes and goals move with it.
 *
 * The pasted chat is not stored by default: the clean version is the record. Switch
 * "keep the original text" on in Settings if you want both.
 */

const SWOT_LABEL: Record<keyof Swot, { title: string; icon: string; tone: string }> = {
  strengths: { title: "Strengths", icon: "💪", tone: "#10B981" },
  weaknesses: { title: "Weaknesses", icon: "🩹", tone: "#EF4444" },
  opportunities: { title: "Opportunities", icon: "🌤️", tone: "#3B82F6" },
  threats: { title: "Threats", icon: "⚠️", tone: "#F59E0B" },
};

const LANG_LABEL: Record<string, string> = { fa: "🇮🇷 Persian", en: "🇬🇧 English", mixed: "🇮🇷🇬🇧 Mixed" };

/** Describe the profile changes a conversation would make, without making them yet. */
function describeUpdates(patch: ReturnType<typeof normalizeProfileUpdates>, tutor: TutorTabProps["tutor"], rialPerUsd: number): string[] {
  const out: string[] = [];
  if (patch.phase && patch.phase !== tutor.phase) out.push(`Phase → ${phaseMeta(patch.phase).short}`);
  if (patch.tags) out.push(`Tags → ${patch.tags.join(", ")}`);
  if (patch.priceUsd) out.push(`Price → ${moneyPair(patch.priceUsd, rialPerUsd)}`);
  if (patch.availabilityHours) out.push(`Availability → ${patch.availabilityHours} hours a week`);
  if (patch.nextFollowUpAt) out.push(`Next follow-up → ${shortDate(patch.nextFollowUpAt)}`);
  if (patch.notes) out.push("Mentor note added");
  if (patch.sourceTextAppend) out.push("Background material extended");
  if (patch.goal) out.push(`Goals updated (${Object.keys(patch.goal).join(", ")})`);
  return out;
}

const CommunicationTab: React.FC<TutorTabProps> = ({ tutor, platform, customPlatforms, rialPerUsd, update, toast, keepRawLogs }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [chat, setChat] = useState("");
  const [kind, setKind] = useState<LogEntry["kind"]>("chat");
  const [note, setNote] = useState("");

  const logs = useMemo(() => [...tutor.logs].sort((a, b) => (a.at < b.at ? 1 : -1)), [tutor.logs]);
  const openFollowUps = useMemo(
    () => logs.flatMap((l) => l.followUps.filter((f) => !f.done).map((f) => ({ ...f, logId: l.id }))),
    [logs],
  );
  const today = new Date().toISOString().slice(0, 10);

  const toggleFollowUp = (logId: string, followUpId: string) =>
    update((t) => ({
      ...t,
      logs: t.logs.map((l) =>
        l.id === logId ? { ...l, followUps: l.followUps.map((f) => (f.id === followUpId ? { ...f, done: !f.done } : f)) } : l,
      ),
    }));

  const setDue = (logId: string, followUpId: string, dueAt: string) =>
    update((t) => ({
      ...t,
      logs: t.logs.map((l) => (l.id === logId ? { ...l, followUps: l.followUps.map((f) => (f.id === followUpId ? { ...f, dueAt } : f)) } : l)),
    }));

  const addNote = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    update((t) => ({ ...t, logs: [...t.logs, newLog({ kind, summary: trimmed, language: "en" })] }));
    setNote("");
    toast("Note added to the log.");
  };

  return (
    <div className="space-y-5">
      <ReadyCommsCard tutor={tutor} platform={platform} rialPerUsd={rialPerUsd} update={update} toast={toast} />

      <Card>
        <SectionTitle
          icon="💬"
          title="Log a conversation"
          sub="Paste the chat — Persian, English or both. You get the clean log, the analysis, and the profile updates it implies."
          right={
            <div className="flex gap-2">
              <select className={`${inputClass} w-auto`} value={kind} onChange={(e) => setKind(e.target.value as LogEntry["kind"])}>
                <option value="chat">Chat</option>
                <option value="call">Call</option>
                <option value="note">Note</option>
                <option value="milestone">Milestone</option>
                <option value="alert">Alert</option>
              </select>
              <Btn onClick={() => setAnalyzing(true)}>🤖 Process the conversation</Btn>
            </div>
          }
        />

        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <Field label="Add a note without AI" hint="For the two-line things that do not need analysing.">
            <input
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNote(note);
              }}
              placeholder="Called her; she will send the Insight page tonight."
            />
          </Field>
          <Btn variant="outline" onClick={() => addNote(note)}>
            ＋ Add note
          </Btn>
        </div>

        <p className="mb-4 rounded-2xl bg-black/[0.05] p-3 text-[12px] leading-relaxed text-[#121118]/86">
          {keepRawLogs
            ? "Keep the original text is ON in Settings, so the pasted chat is stored alongside the clean log."
            : "The clean version is what gets saved. The chat you paste is only used to produce it — turn on “keep the original text” in Settings if you want both."}
        </p>

        {openFollowUps.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-800">
              ✅ {openFollowUps.length} open follow-up{openFollowUps.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-2 space-y-1.5">
              {openFollowUps.map((f) => {
                const overdue = f.dueAt && f.dueAt < today;
                return (
                  <li key={f.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <input type="checkbox" className="h-4 w-4 accent-emerald-600" onChange={() => toggleFollowUp(f.logId, f.id)} />
                    <span className={overdue ? "font-semibold text-red-600" : "text-amber-900"}>{f.text}</span>
                    <input
                      type="date"
                      value={f.dueAt}
                      onChange={(e) => setDue(f.logId, f.id, e.target.value)}
                      className="ml-auto rounded-lg border border-amber-200 bg-white px-2 py-0.5 text-[12px]"
                    />
                    {f.dueAt && <span className="text-[12px] text-amber-700">{relativeDate(f.dueAt)}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <SectionTitle icon="🗒️" title="The log" sub={`${logs.length} entr${logs.length === 1 ? "y" : "ies"}, newest first. Each one is the clean version.`} />

        {logs.length === 0 ? (
          <Empty
            icon="🗒️"
            title="Nothing logged yet"
            body="Paste the last chat you had with this tutor. The AI writes it up in English, reads how they are doing, and updates the profile from it."
            action={<Btn onClick={() => setAnalyzing(true)}>🤖 Process the conversation</Btn>}
          />
        ) : (
          <ol className="space-y-3">
            {logs.map((entry) => {
              const mood = moodMeta(entry.mood);
              const swotCount = Object.values(entry.swot).flat().length;
              return (
                <li key={entry.id} className="rounded-2xl border border-black/12 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-bold text-[#121118]/85">{shortDate(entry.at)}</span>
                      <Pill tone={mood.color}>
                        {mood.emoji} {mood.label}
                      </Pill>
                      <Pill tone="#121118">{entry.kind}</Pill>
                      {entry.language && <Pill tone="#8B5CF6">{LANG_LABEL[entry.language] ?? entry.language}</Pill>}
                      {swotCount > 0 && <Pill tone="#3B82F6">SWOT</Pill>}
                    </div>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm("Delete this log entry?")) {
                          update((t) => ({ ...t, logs: t.logs.filter((l) => l.id !== entry.id) }));
                          toast("Log entry deleted.", "info");
                        }
                      }}
                    >
                      🗑
                    </Btn>
                  </div>

                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#121118]/96">{entry.summary || "(no log text)"}</p>

                  {entry.profileUpdates && (
                    <p className="mt-2 rounded-xl bg-[#FF79AC]/[0.08] px-2.5 py-1.5 text-[12px] font-semibold text-[#121118]/91">
                      ↳ Applied to the profile: {entry.profileUpdates}
                    </p>
                  )}

                  {entry.actions.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {entry.actions.map((a, i) => (
                        <li key={i} className="rounded-xl bg-black/[0.06] px-2.5 py-1.5 text-xs text-[#121118]/91">
                          → {a}
                        </li>
                      ))}
                    </ul>
                  )}

                  {swotCount > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(Object.keys(SWOT_LABEL) as (keyof Swot)[]).map((key) => {
                        const items = entry.swot[key];
                        if (!items.length) return null;
                        const meta = SWOT_LABEL[key];
                        return (
                          <div key={key} className="rounded-xl border p-2.5" style={{ borderColor: `${meta.tone}33`, background: `${meta.tone}0d` }}>
                            <p className="text-[12px] font-bold" style={{ color: meta.tone }}>
                              {meta.icon} {meta.title}
                            </p>
                            <ul className="mt-1 space-y-0.5">
                              {items.map((item, i) => (
                                <li key={i} className="text-[12px] text-[#121118]/91">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {entry.followUps.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {entry.followUps.map((f) => (
                        <li key={f.id} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={f.done} className="h-4 w-4 accent-emerald-600" onChange={() => toggleFollowUp(entry.id, f.id)} />
                          <span className={f.done ? "text-[#121118]/76 line-through" : ""}>{f.text}</span>
                          {f.dueAt && <span className="text-[12px] text-[#121118]/78">{relativeDate(f.dueAt)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}

                  {entry.raw && (
                    <div className="mt-2">
                      <Disclosure title="The original chat (kept because you asked for it)">
                        <pre className="scrollbar-thin max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-black/[0.07] p-2.5 text-[12px] text-[#121118]/91">
                          {entry.raw}
                        </pre>
                      </Disclosure>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {tutor.notes && (
        <Card>
          <SectionTitle icon="📝" title="Mentor notes" sub="What conversations have taught you about this tutor. Saved with the profile." />
          <textarea
            className={`${inputClass} h-32 resize-y`}
            value={tutor.notes}
            onChange={(e) => update((t) => ({ ...t, notes: e.target.value }))}
          />
        </Card>
      )}

      {nudgesFor(tutor).length > 0 && (
        <Card>
          <SectionTitle icon="🔔" title="What this tutor needs from you" sub="Driven by the log, the numbers and how long they have sat in their phase." />
          <ul className="space-y-2">
            {nudgesFor(tutor).map((n) => (
              <li key={n.id} className="flex items-start gap-2 rounded-xl border border-black/12 p-2.5">
                <span className="text-base">{n.icon}</span>
                <div>
                  <p className="text-xs font-bold">{n.title}</p>
                  <p className="text-[12px] text-[#121118]/86">{n.detail}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-[#FF79AC]">→ {n.action}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PromptModal
        open={analyzing}
        onClose={() => setAnalyzing(false)}
        title={communicationPrompt(tutor, chat).title}
        purpose={communicationPrompt(tutor, chat).purpose}
        prompt={communicationPrompt(tutor, chat).prompt}
        schema={communicationPrompt(tutor, chat).schema}
        summarize={(parsed) => {
          const norm = normalizeLog(parsed);
          const updates = normalizeProfileUpdates(parsed);
          const changes = describeUpdates(updates, tutor, rialPerUsd);
          const swotCount = Object.values(norm.swot ?? {}).flat().length;
          return [
            `Log to be saved${norm.language ? ` (${LANG_LABEL[norm.language] ?? norm.language})` : ""}:`,
            norm.summary ? `${norm.summary.slice(0, 220)}${norm.summary.length > 220 ? "…" : ""}` : "none found — check you pasted the analysis answer",
            "",
            `Mood: ${norm.mood ?? "unknown"} · SWOT items: ${swotCount} · follow-ups: ${norm.followUps?.length ?? 0} · actions: ${norm.actions?.length ?? 0}`,
            changes.length ? `Profile updates: ${changes.join(" · ")}` : "Profile updates: none proposed",
          ].join("\n");
        }}
        onApply={(parsed) => {
          const norm = normalizeLog(parsed, keepRawLogs ? chat : "");
          if (!norm.summary) {
            throw new Error('That answer needs a "log" field with the clean version of the conversation.');
          }
          const patch = normalizeProfileUpdates(parsed);
          const changes = describeUpdates(patch, tutor, rialPerUsd);
          const stamp = new Date().toISOString().slice(0, 10);

          update((t) => {
            const next = { ...t, account: { ...t.account } };
            if (patch.phase && patch.phase !== t.phase) {
              next.phase = patch.phase;
              next.phaseSince = stamp;
            }
            if (patch.tags) next.tags = patch.tags;
            if (patch.priceUsd) next.account.priceUsd = patch.priceUsd;
            if (patch.availabilityHours) next.account.availabilityHours = patch.availabilityHours;
            if (patch.nextFollowUpAt) next.nextFollowUpAt = patch.nextFollowUpAt;
            if (patch.notes) next.notes = [t.notes, `${stamp}: ${patch.notes}`].filter(Boolean).join("\n");
            if (patch.sourceTextAppend) {
              next.sourceText = [t.sourceText, `${stamp}: ${patch.sourceTextAppend}`].filter(Boolean).join("\n\n");
            }
            if (patch.goal) {
              const base: Goal = t.goal ?? {
                monthlyIncomeUsd: 0,
                hoursPerWeek: 0,
                studentsTarget: 0,
                studentTypes: [],
                lifeGoal: "",
                lifeGoalCostUsd: 0,
                notes: "",
                createdAt: new Date().toISOString(),
              };
              next.goal = { ...base, ...patch.goal };
            }
            next.logs = [
              ...t.logs,
              newLog({ kind, ...norm, profileUpdates: changes.length ? changes.join(" · ") : undefined }),
            ];
            return next;
          });

          toast(
            changes.length
              ? `Logged and applied — ${changes.join(", ")}.`
              : "Conversation logged. No profile changes were proposed.",
          );
          setChat("");
        }}
      >
        <Field
          label="Paste the conversation"
          hint="Persian, English or both. Everything the two of you said, in either direction — the prompt understands either language and writes the log in English."
        >
          <textarea
            className={`${inputClass} h-48 resize-y font-mono text-[12px]`}
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            dir="auto"
            placeholder={"من: هفته اول چطور بود؟\nسارا: دو تا تریال گرفتم ولی کسی دوباره بوک نکرد…\n\nor in English: Me: How did the first week go?"}
          />
        </Field>
        <p className="mt-2 text-[12px] text-[#121118]/82">
          The AI writes the log, reads how they are doing, builds the SWOT, sets your follow-ups, and proposes profile
          changes — phase, tags, price, hours, notes and goals — which you see before anything is saved.
        </p>
        {tutor.logs.length > 0 && (
          <p className="mt-1 text-[12px] text-[#121118]/82">
            The prompt also carries your last {Math.min(6, tutor.logs.length)} log entries, so it does not repeat questions you
            already asked and can see what changed since.
          </p>
        )}
        <p className="mt-1 text-[12px] text-[#121118]/78">
          Current: {phaseMeta(tutor.phase).short} · {tutor.tags.length ? tutor.tags.join(", ") : "no tags"} ·{" "}
          {tutor.account.priceUsd ? moneyPair(tutor.account.priceUsd, rialPerUsd) : "no price"}
          {tutor.goal?.monthlyIncomeUsd ? ` · target ${toman(tutor.goal.monthlyIncomeUsd, rialPerUsd)}` : ""}
        </p>
      </PromptModal>
    </div>
  );
};

export default CommunicationTab;
