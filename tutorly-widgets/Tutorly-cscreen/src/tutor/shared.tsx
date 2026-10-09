import { useEffect, useRef, useState } from "react";
import { getAllVoices, getNaturalVoices, onVoicesReady, speak, stopSpeech } from "../lib/speech";
import { REAL_AVATARS, isGeneratedAvatar, pickAvatar } from "../lib/avatars";
import { Btn, TInput } from "../ui/primitives";
import { cn } from "../utils/cn";

// Voice picker with filter + test button
export function VoicePicker({
  value,
  onChange,
  rate,
  pitch,
}: {
  value: string;
  onChange: (uri: string) => void;
  rate: number;
  pitch: number;
}) {
  const [voices, setVoices] = useState(() => getNaturalVoices());
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onVoicesReady(() => setVoices(getNaturalVoices()));
  }, []);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const all = voices.length ? voices : getAllVoices();
  const current = all.find((v) => v.voiceURI === value) || all[0];
  const filtered = filter
    ? all.filter((v) => v.name.toLowerCase().includes(filter.toLowerCase()) || v.lang.toLowerCase().includes(filter.toLowerCase()))
    : all;

  function test() {
    stopSpeech();
    speak({
      text: "Hello, this is a sample of my voice. How does it sound?",
      voiceURI: value,
      rate,
      pitch,
    });
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-left hover:border-slate-300 transition flex items-center gap-2"
        >
          <span className="text-base">🔊</span>
          <span className="flex-1 truncate">
            {current ? `${current.name} (${current.lang})` : "Default voice"}
          </span>
          <span className="text-slate-400">▾</span>
        </button>
        <Btn size="sm" variant="soft" onClick={test} type="button" title="Test voice">▶ Test</Btn>
      </div>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl">
          <div className="sticky top-0 bg-white border-b border-slate-100 p-1.5">
            <TInput
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search voices…"
              className="!py-1 text-xs"
            />
          </div>
          {filtered.length === 0 && <div className="p-3 text-xs text-slate-500">No voices.</div>}
          {filtered.map((v) => (
            <button
              type="button"
              key={v.voiceURI}
              onClick={() => { onChange(v.voiceURI); setOpen(false); }}
              className={
                "w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 flex items-center gap-2 " +
                (value === v.voiceURI ? "bg-indigo-50 text-indigo-700" : "")
              }
            >
              <span className="font-medium flex-1 truncate">{v.name}</span>
              <span className="text-slate-400">{v.lang}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Avatar input with paste from clipboard / URL / file
export function AvatarInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  async function pasteClip() {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        for (const t of it.types) {
          if (t.startsWith("image/")) {
            const blob = await it.getType(t);
            const r = new FileReader();
            r.onload = () => onChange(r.result as string);
            r.readAsDataURL(blob);
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      if (text && /^https?:\/\//.test(text)) {
        onChange(text);
        return;
      }
      alert("No image/URL in clipboard");
    } catch {
      fileRef.current?.click();
    }
  }
  function fromFile(f?: File) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange(r.result as string);
    r.readAsDataURL(f);
  }
  const [browse, setBrowse] = useState(false);
  return (
    <div className="space-y-1.5">
      <input type="file" ref={fileRef} accept="image/*" hidden onChange={(e) => fromFile(e.target.files?.[0])} />
      <div className="flex items-center gap-2">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-white shadow-sm">
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : "?"}
        </div>
        <div className="flex-1 flex flex-wrap gap-1">
          <Btn size="sm" variant="soft" type="button" onClick={() => setBrowse((v) => !v)}>
            {browse ? "▾ " : "▸ "}👤 Portrait
          </Btn>
          <Btn size="sm" variant="ghost" type="button" onClick={() => onChange(pickAvatar([value]))}>🎲 Shuffle</Btn>
          <Btn size="sm" variant="ghost" type="button" onClick={pasteClip}>📋 Paste</Btn>
          <Btn size="sm" variant="ghost" type="button" onClick={() => fileRef.current?.click()}>📁 Upload</Btn>
          {value && <Btn size="sm" variant="ghost" type="button" onClick={() => onChange("")}>✕ Clear</Btn>}
        </div>
      </div>

      {isGeneratedAvatar(value) && (
        <p className="text-[11px] text-amber-600">
          Pick a real portrait below — the chat shows this face beside every line the character says.
        </p>
      )}

      {/* The real-people library. Photographs, not generated cartoons. */}
      {browse && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Portraits ({REAL_AVATARS.length})</span>
            <button type="button" className="text-[11px] text-slate-400 hover:text-slate-700" onClick={() => setBrowse(false)}>
              close
            </button>
          </div>
          <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto">
            {REAL_AVATARS.map((src) => (
              <button
                key={src}
                type="button"
                title={src}
                onClick={() => onChange(src)}
                className={cn(
                  "aspect-square overflow-hidden rounded-full border-2 transition",
                  value === src ? "border-indigo-500 ring-2 ring-indigo-200" : "border-white hover:border-indigo-300",
                )}
              >
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <TInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste image URL / data URL"
        className="text-xs"
      />
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}
