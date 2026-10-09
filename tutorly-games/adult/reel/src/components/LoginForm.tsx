"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CEFR_LEVELS } from "@/modules/lessons/types";
import { Button, Card, cx, CEFR_COLORS } from "@/components/ui";

const INTERESTS = ["Travel", "Movies & TV Shows", "Fitness", "Food", "Nature", "Music", "Technology", "Business"];

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ email: "demo@lingua.tv", password: "demo1234", name: "", cefrLevel: "B1", nativeLanguage: "Spanish", targetLanguage: "English", interests: [] as string[] });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, ...form }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Something went wrong");
    router.push("/");
    router.refresh();
  };

  return (
    <Card className="self-start">
      <div className="mb-4 flex rounded-xl bg-white/5 p-1">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setForm((f) => ({ ...f, email: m === "login" ? "demo@lingua.tv" : "", password: m === "login" ? "demo1234" : "" })); }} className={cx("flex-1 rounded-lg py-2 text-sm font-semibold", mode === m ? "bg-white/10 text-white" : "text-zinc-400")}>
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && <input className={input} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        <input className={input} type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={input} type="password" placeholder="Password (min 6 characters)" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {mode === "signup" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <select className={input} value={form.nativeLanguage} onChange={(e) => setForm({ ...form, nativeLanguage: e.target.value })} aria-label="Native language">
                {["Spanish", "Portuguese", "French", "German", "Italian", "Japanese", "Korean", "Chinese", "Arabic", "English"].map((l) => <option key={l}>{l}</option>)}
              </select>
              <select className={input} value={form.targetLanguage} onChange={(e) => setForm({ ...form, targetLanguage: e.target.value })} aria-label="Target language">
                {["English", "Spanish", "French", "German", "Italian", "Japanese"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Your level</div>
              <div className="flex gap-1">
                {CEFR_LEVELS.map((l) => (
                  <button key={l} type="button" onClick={() => setForm({ ...form, cefrLevel: l })} className={cx("flex-1 rounded-lg border py-1.5 text-xs font-bold", form.cefrLevel === l ? "border-transparent text-black" : "border-white/10 text-zinc-300")} style={form.cefrLevel === l ? { background: CEFR_COLORS[l] } : undefined}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Interests</div>
              <div className="flex flex-wrap gap-1">
                {INTERESTS.map((i) => (
                  <button key={i} type="button" onClick={() => setForm((f) => ({ ...f, interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i] }))} className={cx("rounded-full border px-2.5 py-1 text-xs", form.interests.includes(i) ? "border-fuchsia-400 bg-fuchsia-500/20" : "border-white/10 text-zinc-300")}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account & start"}
        </Button>
      </form>
    </Card>
  );
}
