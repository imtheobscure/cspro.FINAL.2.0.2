"use client";

import { useState } from "react";
import { Button, Card, cx } from "@/components/ui";

export type PlayerSettings = { subtitleMode: string; playbackRate: number; autoSkipIntro: boolean; autoSkipRecap: boolean; autoSkipOutro: boolean; autoSkipCredits: boolean; autoplayNext: boolean; subtitleFontSize: string; subtitleBackground: boolean; theaterMode: boolean };
export type LearnerSettings = { feedbackDetail: "normal" | "detailed"; suspenseSounds: boolean; activityPauseMode: "pause" | "overlay"; dailyGoalXp: number };

export function SettingsForm({ player, learner }: { player: PlayerSettings; learner: LearnerSettings }) {
  const [p, setP] = useState(player);
  const [l, setL] = useState(learner);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const save = async () => {
    setState("saving");
    await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player: p, preferences: l }) });
    setState("saved");
    setTimeout(() => setState("idle"), 1500);
  };
  const Toggle = ({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) => (
    <button type="button" onClick={() => onChange(!value)} className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-left hover:bg-white/5">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
      <span className={cx("h-6 w-11 rounded-full p-0.5 transition", value ? "bg-violet-500" : "bg-white/15")}>
        <span className={cx("block h-5 w-5 rounded-full bg-white transition", value && "translate-x-5")} />
      </span>
    </button>
  );
  const Segmented = <T extends string | number>({ label, options, value, onChange }: { label: string; options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) => (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</div>
      <div className="flex gap-1">
        {options.map((o) => (
          <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} className={cx("flex-1 rounded-lg py-1.5 text-xs", value === o.v ? "bg-violet-500/40 text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10")}>
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <h2 className="font-bold">Player</h2>
        <Segmented label="Subtitles" value={p.subtitleMode} onChange={(v) => setP({ ...p, subtitleMode: v })} options={[{ v: "off", l: "Off" }, { v: "original", l: "Original" }, { v: "translation", l: "Translation" }, { v: "dual", l: "Dual" }]} />
        <Segmented label="Subtitle size" value={p.subtitleFontSize} onChange={(v) => setP({ ...p, subtitleFontSize: v })} options={[{ v: "sm", l: "Small" }, { v: "md", l: "Medium" }, { v: "lg", l: "Large" }]} />
        <Segmented label="Default speed" value={p.playbackRate} onChange={(v) => setP({ ...p, playbackRate: v })} options={[0.75, 1, 1.25, 1.5].map((r) => ({ v: r, l: `${r}×` }))} />
        <Toggle label="Subtitle background box" value={p.subtitleBackground} onChange={(v) => setP({ ...p, subtitleBackground: v })} />
        <Toggle label="Theater mode by default" value={p.theaterMode} onChange={(v) => setP({ ...p, theaterMode: v })} />
        <Toggle label="Autoplay next episode" value={p.autoplayNext} onChange={(v) => setP({ ...p, autoplayNext: v })} />
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="Skip intro" value={p.autoSkipIntro} onChange={(v) => setP({ ...p, autoSkipIntro: v })} />
          <Toggle label="Skip recap" value={p.autoSkipRecap} onChange={(v) => setP({ ...p, autoSkipRecap: v })} />
          <Toggle label="Skip outro" value={p.autoSkipOutro} onChange={(v) => setP({ ...p, autoSkipOutro: v })} />
          <Toggle label="Skip credits" value={p.autoSkipCredits} onChange={(v) => setP({ ...p, autoSkipCredits: v })} />
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-bold">Lessons</h2>
          <Segmented label="Feedback detail" value={l.feedbackDetail} onChange={(v) => setL({ ...l, feedbackDetail: v })} options={[{ v: "normal", l: "Normal" }, { v: "detailed", l: "Detailed by default" }]} />
          <Segmented label="When an activity triggers" value={l.activityPauseMode} onChange={(v) => setL({ ...l, activityPauseMode: v })} options={[{ v: "pause", l: "Pause video" }, { v: "overlay", l: "Overlay" }]} />
          <Segmented label="Daily XP goal" value={l.dailyGoalXp} onChange={(v) => setL({ ...l, dailyGoalXp: v })} options={[50, 100, 200, 400].map((x) => ({ v: x, l: `${x}` }))} />
          <Toggle label="Suspense & reward sounds" value={l.suspenseSounds} onChange={(v) => setL({ ...l, suspenseSounds: v })} hint="Short synthesized chimes on answers" />
        </Card>
        <Button onClick={save} className="w-full" size="lg" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
