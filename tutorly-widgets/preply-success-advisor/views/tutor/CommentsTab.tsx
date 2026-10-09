import React, { useMemo, useState } from "react";
import { Btn, Card, SectionTitle, inputClass } from "../../components/ui";
import { daysBetween, relativeDate, shortDate } from "../../lib/format";
import { phaseMeta } from "../../lib/domain";
import type { TutorTabProps } from "./common";

/**
 * Comments — the one line you want beside a name six months from now.
 *
 * A tutor goes quiet and the roster keeps them. The history that explains it is spread
 * across conversations, notes and weekly numbers, which is fine while the reason is fresh
 * and useless by the time someone asks "why is this one not active?". So this tab asks one
 * question — why are they not being worked on — and stores one answer with the date it was
 * written. It is what the Not-active sheet of the spreadsheet reports, so the reason can be
 * sorted, filtered and read next to the name it belongs to.
 *
 * The quick reasons below are the ones that actually come up with tutors on these platforms;
 * they are offered as a starting point, never as a substitute for the sentence you write.
 */
const CommentsTab: React.FC<TutorTabProps> = ({ tutor, update, toast }) => {
  const [draft, setDraft] = useState(tutor.holdNote ?? "");
  const phase = phaseMeta(tutor.phase);

  /**
   * The reasons that recur.
   *
   * Each one is written the way a mentor would say it out loud, because the sentence has to
   * still make sense to whoever reads the sheet months later.
   */
  const reasons = useMemo(
    () => [
      "Stopped answering — chasing has stopped too",
      "Left the platform",
      "On a break; asked us not to schedule anything",
      "Goal met — they no longer need mentoring",
      "Too expensive for them right now",
      "Schedule never lined up",
      "Moved to another mentor",
      "Waiting on the platform: account not approved yet",
      "Still preparing their material — no account to work on",
      "Teaching quality fell short; we agreed to stop",
    ],
    [],
  );

  const written = tutor.holdNoteAt ? `Written ${relativeDate(tutor.holdNoteAt)} (${shortDate(tutor.holdNoteAt)})` : "Not written yet";
  const stale = tutor.holdNoteAt ? daysBetween(tutor.holdNoteAt) > 90 : false;

  const save = (value: string) => {
    const text = value.trim();
    update((t) => ({
      ...t,
      holdNote: text,
      holdNoteAt: text ? new Date().toISOString() : undefined,
    }));
    toast(text ? "Saved — this reason now travels with the tutor into the Not-active sheet." : "Reason cleared.", text ? "ok" : "info");
  };

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          icon="💬"
          title="Comments"
          sub="Why this tutor is not being worked on. One answer, one date — the reason that shows beside their name in the Not-active sheet."
          right={
            <Btn size="sm" variant="outline" onClick={() => save(draft)} disabled={draft.trim() === (tutor.holdNote ?? "")}>
              💾 Save the reason
            </Btn>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <textarea
              className={`${inputClass} h-40 resize-y leading-relaxed`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft.trim() !== (tutor.holdNote ?? "")) save(draft);
              }}
              placeholder='One or two sentences. "Stopped answering in May; asked about a discount, said she would come back after the exam."'
            />
            <div className="flex flex-wrap items-center gap-2">
              <Btn size="sm" onClick={() => save(draft)} disabled={draft.trim() === (tutor.holdNote ?? "")}>
                ✅ Save
              </Btn>
              <Btn
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(`${tutor.name}: ${draft.trim()}`);
                  toast("Copied — ready to paste into a note, a chat or the board.", "info");
                }}
                disabled={!draft.trim()}
              >
                📋 Copy
              </Btn>
              {tutor.holdNote ? (
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setDraft("");
                    save("");
                  }}
                >
                  🗑 Clear the reason
                </Btn>
              ) : null}
              <span className="text-[12px] text-[#121118]/80">{written}</span>
            </div>
            {stale && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                This reason is more than three months old. Tutors change their minds — worth a check before you
                decide anything final from it.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#121118]/76">Quick reasons</p>
            <p className="text-[12px] leading-relaxed text-[#121118]/80">
              Press one to fill the box, then edit it into your own words — a reason written in your voice is the
              one you will trust later.
            </p>
            <div className="flex flex-col gap-1.5">
              {reasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDraft((current) => (current.trim() ? `${current.trim()} ${reason}.` : `${reason}.`))}
                  className="rounded-xl border border-black/12 bg-white px-3 py-2 text-left text-[12px] font-semibold text-[#121118]/88 hover:border-black/30"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon="🧭"
          title="Where this reason lands"
          sub="Written once here, read in three places — so nobody has to remember it."
        />
        <ul className="space-y-2 text-[13px] leading-relaxed text-[#121118]/88">
          <li>
            • <b>The Not-active sheet</b> in 📊 Export everything as Excel (.xlsx): it comes straight after the
            Roster and lists everyone in <b>{phase.short}</b>, a status that is not active — longest on the roster
            first, each with this reason in a “Why not continuing” column.
          </li>
          <li>
            • <b>The Portfolio board</b>, on this tutor’s card, so the reason is visible while you scan every status
            at once.
          </li>
          <li>
            • <b>The tutor’s own record</b> in the JSON backup, so a restore on another machine brings the reasons
            with it.
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default CommentsTab;
