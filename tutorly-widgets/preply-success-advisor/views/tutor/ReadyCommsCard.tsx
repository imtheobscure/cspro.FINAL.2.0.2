import React, { useMemo, useState } from "react";
import { Btn, Card, Field, Pill, SectionTitle, inputClass } from "../../components/ui";
import {
  GROUP_LABEL,
  buildCommsItems,
  groupCommsItems,
  renderReadyMessage,
  toPersianDigits,
  type CommsLang,
} from "../../lib/readyComms";
import type { TutorTabProps } from "./common";

/** Only what building a message actually needs — the four tabs it appears in do not
 *  all receive the same props, and this card has no business with the raw log setting. */
type ReadyCommsProps = Pick<TutorTabProps, "tutor" | "platform" | "rialPerUsd" | "update" | "toast">;

/**
 * Put text on the clipboard, with a way through when the modern API refuses.
 *
 * `navigator.clipboard.writeText` rejects whenever the document is not focused or the
 * browser wants a fresh user gesture — which happens often enough (an iframe, a second
 * monitor, a click that was replayed by a tool) that relying on it alone would make the
 * one feature this card exists for fail silently. The legacy path below still works in
 * those cases, and is the reason the fallback message is a last resort rather than the
 * first answer.
 */
async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const scratch = document.createElement("textarea");
    scratch.value = value;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.top = "-1000px";
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(scratch);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Ready message — the button you press when you are about to write to a tutor.
 *
 * Everything else in this app prepares material for the AI. This card prepares the
 * message the mentor actually sends: an update built from this tutor's real numbers,
 * plus the exact list of data the profile is still missing, in English and in Persian.
 *
 * The copy buttons are one click from the tab, because that is how often this is used.
 * The review panel is one click away rather than open by default, because the app can
 * assemble a check-in from numbers but it cannot know that this tutor's mother is ill
 * or that you promised to revisit their rate on Friday — so the last edit is the
 * mentor's, and it happens before anything leaves the app.
 */
const ReadyCommsCard: React.FC<ReadyCommsProps> = ({ tutor, platform, rialPerUsd, update, toast }) => {
  const [lang, setLang] = useState<CommsLang>("en");
  const [persianDigits, setPersianDigits] = useState(true);
  const [signOff, setSignOff] = useState("");
  const [open, setOpen] = useState(false);
  /** Manual edits per language; `undefined` means "use the generated text". */
  const [raw, setRaw] = useState<{ en?: string; fa?: string }>({});
  /** Unticked ids. Empty set means everything, so lines added later still appear. */
  const [unticked, setUnticked] = useState<Set<string>>(new Set());

  const items = useMemo(() => buildCommsItems(tutor, platform, rialPerUsd), [tutor, platform, rialPerUsd]);
  const groups = useMemo(() => groupCommsItems(items), [items]);
  const includeIds = useMemo(() => items.filter((i) => !unticked.has(i.id)).map((i) => i.id), [items, unticked]);

  const build = (which: CommsLang, digits: boolean = persianDigits) =>
    renderReadyMessage({ items, tutor, lang: which, includeIds, persianDigits: digits, signOff });

  const text = raw[lang] ?? build(lang);
  const edited = raw[lang] !== undefined;
  const rtl = lang === "fa";

  const copy = async (value: string, label: string) => {
    if (await copyToClipboard(value)) {
      toast(`${label} copied — paste it into Telegram, WhatsApp or the platform chat.`, "ok");
    } else {
      toast("Your browser blocked the clipboard. Open “Review & edit”, select the text and copy it manually.", "error");
    }
  };

  const saveToProfile = () => {
    update((t) => ({
      ...t,
      messages: [
        ...t.messages,
        {
          id: `m_${Date.now().toString(36)}`,
          at: new Date().toISOString(),
          tone: "mentor",
          occasion: "Check-in (ready message)",
          text,
        },
      ],
      // Sending it is contact: the next follow-up moves a week out.
      nextFollowUpAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    }));
    toast("Saved to Messages, and the next follow-up is set for a week from now.", "ok");
  };

  const toggle = (id: string) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card>
      <SectionTitle
        icon="📋"
        title="Ready message"
        sub="An update from this tutor's own numbers plus the questions that fill the app's gaps — English and Persian, ready to paste."
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Pill tone="#121118" title="Lines included in this message">
              {includeIds.length}/{items.length}
            </Pill>
            {/* Two language buttons that always name the OTHER language on the
                secondary one — otherwise, with Persian active, both buttons read
                "Copy فارسی" and it is impossible to tell them apart. */}
            <Btn size="sm" onClick={() => copy(text, lang === "en" ? "English message" : "پیام فارسی")}>
              📋 {lang === "en" ? "Copy English" : "Copy فارسی"}
            </Btn>
            <Btn size="sm" variant="outline" onClick={() => copy(build(lang === "en" ? "fa" : "en", true), lang === "en" ? "پیام فارسی" : "English message")}>
              📋 {lang === "en" ? "Copy فارسی" : "Copy English"}
            </Btn>
            <Btn size="sm" variant="dark" onClick={() => copy(`${build("en", false)}\n\n${"─".repeat(28)}\n\n${build("fa", true)}`, "Both versions")}>
              📋 Copy both
            </Btn>
            <Btn size="sm" variant={open ? "dark" : "outline"} onClick={() => setOpen((v) => !v)}>
              {open ? "▾ Review" : "▸ Review & edit"}
            </Btn>
          </div>
        }
      />

      {!open && (
        <p className="text-[12px] leading-relaxed text-[#121118]/85">
          Built from {tutor.snapshots.length ? `${tutor.snapshots.length} week${tutor.snapshots.length === 1 ? "" : "s"} of numbers` : "the profile (no weekly numbers yet)"}
          {tutor.plan ? ", the 90-day plan" : ""}
          {tutor.audit ? ", the profile audit" : ""} and the gaps still open on this profile. Open{" "}
          <b>Review &amp; edit</b> to choose lines, switch language, or change any wording before it goes out.
        </p>
      )}

      {open && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["en", "fa"] as CommsLang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                  lang === l ? "border-[#FF79AC] bg-[#FF79AC]/[0.09]" : "border-black/12 hover:border-black/28"
                }`}
              >
                {l === "en" ? "🇬🇧 English" : "🇮🇷 فارسی"}
              </button>
            ))}
            {rtl && (
              <label className="flex items-center gap-2 rounded-xl border border-black/12 px-3 py-1.5 text-xs font-semibold">
                <input type="checkbox" checked={persianDigits} onChange={(e) => setPersianDigits(e.target.checked)} />
                ۱۲۳ Persian digits
              </label>
            )}
            <Btn size="sm" variant="outline" onClick={saveToProfile}>
              💾 Save to Messages
            </Btn>
            {edited && (
              <button
                className="text-xs font-semibold text-[#121118]/70 underline decoration-dotted"
                onClick={() => setRaw((prev) => ({ ...prev, [lang]: undefined }))}
                title="Throw away your edits and rebuild this language from the app's data"
              >
                ↺ Rebuild {lang === "en" ? "English" : "فارسی"} from data
              </button>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
            {groups.map(({ group, items: groupItems }) => {
              const label = GROUP_LABEL[group];
              const allIn = groupItems.every((i) => !unticked.has(i.id));
              return (
                <div key={group}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#121118]">
                      {label.icon} {label[lang]}
                    </p>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setUnticked((prev) => {
                          const next = new Set(prev);
                          groupItems.forEach((i) => (allIn ? next.add(i.id) : next.delete(i.id)));
                          return next;
                        })
                      }
                    >
                      {allIn ? "None" : "All"}
                    </Btn>
                  </div>
                  <div className="space-y-1.5">
                    {groupItems.map((i) => (
                      <label key={i.id} className="flex cursor-pointer items-start gap-2 rounded-xl bg-white/70 p-2 text-[13px] leading-snug">
                        <input type="checkbox" className="mt-0.5" checked={!unticked.has(i.id)} onChange={() => toggle(i.id)} />
                        <span dir={rtl ? "rtl" : "ltr"} className={rtl ? "text-right" : ""}>
                          {/* The picker shows the line exactly as it will be sent, digits included. */}
                          {lang === "fa" ? (persianDigits ? toPersianDigits(i.fa) : i.fa) : i.en}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <textarea
            dir={rtl ? "rtl" : "ltr"}
            value={text}
            onChange={(e) => setRaw((prev) => ({ ...prev, [lang]: e.target.value }))}
            spellCheck={false}
            rows={rtl ? 12 : 11}
            className={`${inputClass} font-[inherit] leading-relaxed ${rtl ? "text-right" : ""}`}
          />

          <Field label="Sign-off (optional)" hint="Your name, or the line you normally sign with. It is added to both languages.">
            <input className={inputClass} value={signOff} onChange={(e) => setSignOff(e.target.value)} placeholder="— Mehrdad, your mentor" />
          </Field>
        </div>
      )}
    </Card>
  );
};

export default ReadyCommsCard;
