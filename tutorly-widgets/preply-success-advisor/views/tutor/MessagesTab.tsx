import React, { useState } from "react";
import PromptModal from "../../components/PromptModal";
import ReadyCommsCard from "./ReadyCommsCard";
import { Btn, Card, Empty, Field, Pill, SectionTitle, inputClass } from "../../components/ui";
import { celebrationPrompt, messageFactoryPrompt } from "../../lib/prompts";
import { normalizeMessages } from "../../lib/normalize";
import { moodMeta } from "../../lib/domain";
import { relativeDate, shortDate } from "../../lib/format";
import { latestSnapshot } from "../../lib/domain";
import type { CraftedMessage, MessageTone } from "../../types";
import type { TutorTabProps } from "./common";

/**
 * The message factory.
 *
 * Platform-compliant, motivational, and written from the tutor's own numbers — the
 * difference between "great job!" and "three trials and two of them booked again this
 * week; that is the hard part done. Keep the Thursday slot open." Four tones, because
 * the same tutor needs a cheerleader on Monday and a wise mentor when they are stuck,
 * and localised warmth matters when the mentor and the tutor share a context the
 * platform does not know about.
 */

const TONES: { id: MessageTone; label: string; icon: string; blurb: string }[] = [
  { id: "cheerleader", label: "Cheerleader", icon: "🎉", blurb: "High energy, celebrates the effort." },
  { id: "mentor", label: "Wise mentor", icon: "🧭", blurb: "Calm, strategic, names the next move." },
  { id: "tough-love", label: "Tough love", icon: "🔨", blurb: "Honest about what is not working, with respect." },
  { id: "warmth", label: "Localised warmth", icon: "🫶", blurb: "Respectful, family-aware, exchange-rate aware." },
];

const OCCASIONS = [
  "General encouragement",
  "Just before a trial lesson",
  "After a milestone",
  "After a bad week",
  "No bookings for a while",
  "New account just approved",
  "Coming back after a break",
  "Payment or withdrawal question",
];

const MessagesTab: React.FC<TutorTabProps> = ({ tutor, platform, rialPerUsd, update, toast }) => {
  const [tone, setTone] = useState<MessageTone>("mentor");
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [factoryOpen, setFactoryOpen] = useState(false);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [milestone, setMilestone] = useState("");

  const messages = [...tutor.messages].sort((a, b) => (a.at < b.at ? 1 : -1));
  const last = latestSnapshot(tutor);

  const saveMessages = (parsed: unknown, extra: Partial<CraftedMessage> = {}) => {
    const list = normalizeMessages(parsed);
    if (!list.length) throw new Error("No message text found in that answer.");
    update((t) => ({
      ...t,
      messages: [
        ...t.messages,
        ...list.map((m, i) => ({
          id: `m_${Date.now().toString(36)}_${i}`,
          at: new Date().toISOString(),
          tone: (m.tone as MessageTone) || tone,
          occasion: m.occasion || occasion,
          text: m.text ?? "",
          ...extra,
        })),
      ],
    }));
    toast(`${list.length} message option${list.length === 1 ? "" : "s"} saved — copy the one you like and send it.`);
  };

  return (
    <div className="space-y-5">
      <ReadyCommsCard tutor={tutor} platform={platform} rialPerUsd={rialPerUsd} update={update} toast={toast} />

      <Card>
        <SectionTitle
          icon="✉️"
          title="Message factory"
          sub="Writes platform-compliant, motivational messages in the tone you pick — built from this tutor's own week."
          right={<Btn onClick={() => setFactoryOpen(true)}>🤖 Write messages</Btn>}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={`rounded-2xl border p-3 text-left transition-all ${
                tone === t.id ? "border-[#FF79AC] bg-[#FF79AC]/[0.07] shadow-sm" : "border-black/12 hover:border-black/28"
              }`}
            >
              <p className="text-sm font-bold">
                {t.icon} {t.label}
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#121118]/85">{t.blurb}</p>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Field label="Occasion">
            <select className={inputClass} value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {last && (
          <p className="mt-3 rounded-2xl bg-black/[0.05] p-3 text-xs text-[#121118]/86">
            The prompt carries this tutor's real numbers, so the message can say: last week {last.lessons} lessons,{" "}
            {last.trials} trials, {last.trialsConverted} converted
            {last.rating ? `, rating ${last.rating}` : ""}. Generic encouragement is what we are avoiding.
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon="🎊" title="Celebration generator" sub="For the moment a milestone lands." />
          <Field label="What is the milestone?">
            <input
              className={inputClass}
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="First 100 lessons · first 5-star review · 50M Toman earned"
            />
          </Field>
          <Btn className="mt-3" onClick={() => setCelebrateOpen(true)}>
            🤖 Write the card
          </Btn>
        </Card>

        <Card>
          <SectionTitle icon="🕐" title="Pre-trial prep" sub="Sent shortly before a trial lesson." />
          <p className="text-xs text-[#121118]/86">
            Pick the <b>Just before a trial lesson</b> occasion above and write in any tone: the prompt asks for one
            encouraging line and two practical reminders they can act on in the next ten minutes.
          </p>
          <Btn className="mt-3" variant="outline" onClick={() => setFactoryOpen(true)}>
            🤖 Write it now
          </Btn>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="🗃️" title="Messages you have written" sub={`${messages.length} saved`} />
        {messages.length === 0 ? (
          <Empty icon="📭" title="No messages yet" body="Every message you generate is kept here with its tone and occasion, so you can reuse the phrasing that works." />
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id} className={`rounded-2xl border p-3 ${m.sentAt ? "border-emerald-100 bg-emerald-50/50" : "border-black/12"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="#8B5CF6">{TONES.find((t) => t.id === m.tone)?.icon ?? "✉️"} {m.tone}</Pill>
                  <span className="text-[12px] text-[#121118]/82">{m.occasion}</span>
                  <span className="text-[12px] text-[#121118]/76">{shortDate(m.at)}</span>
                  {m.sentAt && <Pill tone="#10B981">sent {relativeDate(m.sentAt)}</Pill>}
                  <div className="ml-auto flex gap-1">
                    <Btn
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(m.text);
                        toast("Message copied — paste it into your chat.");
                      }}
                    >
                      📋 Copy
                    </Btn>
                    {!m.sentAt && (
                      <Btn
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          update((t) => ({
                            ...t,
                            messages: t.messages.map((x) => (x.id === m.id ? { ...x, sentAt: new Date().toISOString() } : x)),
                          }))
                        }
                      >
                        ✓ Mark sent
                      </Btn>
                    )}
                    <Btn size="sm" variant="ghost" onClick={() => update((t) => ({ ...t, messages: t.messages.filter((x) => x.id !== m.id) }))}>
                      🗑
                    </Btn>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-[#121118]/94">{m.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {tutor.logs.length > 0 && (
        <Card>
          <SectionTitle icon="🌤️" title="Where they are right now" sub="The last read from your conversations — the message should meet them there." />
          <div className="flex flex-wrap gap-2">
            {[...tutor.logs]
              .sort((a, b) => (a.at < b.at ? 1 : -1))
              .slice(0, 3)
              .map((l) => {
                const mood = moodMeta(l.mood);
                return (
                  <Pill key={l.id} tone={mood.color}>
                    {mood.emoji} {mood.label} · {shortDate(l.at)}
                  </Pill>
                );
              })}
          </div>
        </Card>
      )}

      <PromptModal
        open={factoryOpen}
        onClose={() => setFactoryOpen(false)}
        title={messageFactoryPrompt(tutor, tone, occasion).title}
        purpose={messageFactoryPrompt(tutor, tone, occasion).purpose}
        prompt={messageFactoryPrompt(tutor, tone, occasion).prompt}
        schema={messageFactoryPrompt(tutor, tone, occasion).schema}
        summarize={(parsed) => {
          const list = normalizeMessages(parsed);
          return list.length ? `${list.length} options · first: ${list[0].text.slice(0, 90)}…` : "No message text found.";
        }}
        onApply={(parsed) => saveMessages(parsed)}
      />

      <PromptModal
        open={celebrateOpen}
        onClose={() => setCelebrateOpen(false)}
        title={celebrationPrompt(tutor, milestone).title}
        purpose={celebrationPrompt(tutor, milestone).purpose}
        prompt={celebrationPrompt(tutor, milestone).prompt}
        schema={celebrationPrompt(tutor, milestone).schema}
        summarize={(parsed) => {
          const root = (parsed ?? {}) as Record<string, unknown>;
          return `Headline: ${String(root.headline ?? "—")}\nBody: ${String(root.body ?? "—").slice(0, 120)}`;
        }}
        onApply={(parsed) => {
          const root = (parsed ?? {}) as Record<string, unknown>;
          const headline = typeof root.headline === "string" ? root.headline : "";
          const body = typeof root.body === "string" ? root.body : "";
          const share = typeof root.shareText === "string" ? root.shareText : "";
          const text = [headline, body, share ? `Share text: ${share}` : ""].filter(Boolean).join("\n\n");
          if (!text) throw new Error("That answer had no headline or body in it.");
          update((t) => ({
            ...t,
            messages: [
              ...t.messages,
              {
                id: `m_${Date.now().toString(36)}`,
                at: new Date().toISOString(),
                tone: "celebration",
                occasion: milestone || "Milestone",
                text,
              },
            ],
          }));
          toast("Celebration card saved to this tutor's messages.");
          setMilestone("");
        }}
      >
        <p className="rounded-2xl bg-black/[0.05] p-3 text-xs text-[#121118]/86">
          Milestones worth a card: lessons taught, reviews earned, cumulative Toman earned, first regular student, a month
          without a cancellation. Anything the two of you can point at.
        </p>
      </PromptModal>
    </div>
  );
};

export default MessagesTab;
