"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CEFR_LEVELS } from "@/modules/lessons/types";
import { Button, Card, cx, CEFR_COLORS } from "@/components/ui";

const INTERESTS = ["Travel", "Movies & TV Shows", "Fitness", "Food", "Nature", "Music", "Technology", "Business", "Science", "Gaming", "Art & Design", "History"];
const GOALS = ["Understand films without subtitles", "Sound more natural when speaking", "Pass an exam (IELTS/Cambridge)", "Work in English", "Travel confidently", "Read novels and news"];
const LANGS = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Japanese", "Korean", "Chinese", "Arabic"];

export type ProfileFormData = { name: string; cefrLevel: string; nativeLanguage: string; targetLanguage: string; interests: string[]; goals: string[]; weaknesses: string[]; facts: string[] };

export function ProfileForm({ initial, isGuest }: { initial: ProfileFormData; isGuest: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggle = (key: "interests" | "goals", v: string) => setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const save = async () => {
    setSaving(true);
    await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  };
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
      {children}
    </label>
  );
  const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {isGuest && (
        <Card className="border-amber-400/30 bg-amber-500/5 lg:col-span-2">
          <p className="text-sm text-amber-100">You are editing the <b>local learner profile</b> — the one this device uses, with its own history, XP and vocabulary.</p>
        </Card>
      )}
      <Card className="space-y-4">
        <h2 className="font-bold">Learner</h2>
        <Field label="Name"><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Native language">
            <select className={input} value={form.nativeLanguage} onChange={(e) => setForm({ ...form, nativeLanguage: e.target.value })}>{LANGS.map((l) => <option key={l}>{l}</option>)}</select>
          </Field>
          <Field label="Target language">
            <select className={input} value={form.targetLanguage} onChange={(e) => setForm({ ...form, targetLanguage: e.target.value })}>{LANGS.map((l) => <option key={l}>{l}</option>)}</select>
          </Field>
        </div>
        <Field label="CEFR level">
          <div className="flex gap-1">
            {CEFR_LEVELS.map((l) => (
              <button key={l} type="button" onClick={() => setForm({ ...form, cefrLevel: l })} className={cx("flex-1 rounded-xl border py-2 text-sm font-bold transition", form.cefrLevel === l ? "border-transparent text-black" : "border-white/10 text-zinc-300 hover:bg-white/5")} style={form.cefrLevel === l ? { background: CEFR_COLORS[l] } : undefined}>
                {l}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Lessons never exceed this level unless explicitly marked as challenge content.</p>
        </Field>
        <Field label="Weak areas (comma separated)"><input className={input} value={form.weaknesses.join(", ")} onChange={(e) => setForm({ ...form, weaknesses: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="connected speech, phrasal verbs" /></Field>
        <Field label="Facts the tutor should know (comma separated)"><input className={input} value={form.facts.join(", ")} onChange={(e) => setForm({ ...form, facts: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Lives in Valencia, works as a designer" /></Field>
      </Card>
      <div className="space-y-4">
        <Card>
          <h2 className="font-bold">Interests</h2>
          <p className="text-xs text-zinc-500">Used to flavour examples and contexts — naturally, not in every sentence.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {INTERESTS.map((i) => (
              <button key={i} type="button" onClick={() => toggle("interests", i)} className={cx("rounded-full border px-3 py-1 text-xs transition", form.interests.includes(i) ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100" : "border-white/10 text-zinc-300 hover:bg-white/5")}>
                {i}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">Goals</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {GOALS.map((g) => (
              <button key={g} type="button" onClick={() => toggle("goals", g)} className={cx("rounded-full border px-3 py-1 text-xs transition", form.goals.includes(g) ? "border-violet-400 bg-violet-500/20 text-violet-100" : "border-white/10 text-zinc-300 hover:bg-white/5")}>
                {g}
              </button>
            ))}
          </div>
        </Card>
        <Button onClick={save} disabled={saving} className="w-full" size="lg">
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
