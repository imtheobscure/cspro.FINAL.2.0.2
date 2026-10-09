import { useRef } from "react";
import { useStore, store, bus } from "../../state/store";
import { Btn, TInput, TTextarea } from "../../ui/primitives";
import { Field, Section, AvatarInput } from "../shared";

export default function SettingsTab() {
  const settings = useStore((s) => s.settings);
  const tutor = useStore((s) => s.tutor);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof settings>(key: K, v: any) {
    store.set((s) => { s.settings = { ...s.settings, [key]: v }; return { ...s }; });
  }

  function exportAll() {
    const s = store.get();
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      npcs: s.npcs,
        learners: s.learners,
      tutor: s.tutor,
      reactions: s.reactions,
      polls: s.polls,
      dialogues: s.dialogues,
      canvasTabs: s.canvasTabs,
        canvasTemplates: s.canvasTemplates,
      transcriptTemplates: s.transcriptTemplates,
        participantScores: s.participantScores,
        catSettings: s.catSettings,
      settings: s.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classroom-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importAll(f: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result as string);
        store.set((s) => {
          s.npcs = Array.isArray(d.npcs) ? d.npcs : s.npcs;
          s.learners = Array.isArray(d.learners) ? d.learners : s.learners;
          s.tutor = d.tutor || s.tutor;
          s.reactions = Array.isArray(d.reactions) ? d.reactions : s.reactions;
          s.polls = Array.isArray(d.polls) ? d.polls : s.polls;
          s.dialogues = Array.isArray(d.dialogues) ? d.dialogues : s.dialogues;
          s.canvasTabs = Array.isArray(d.canvasTabs) ? d.canvasTabs : s.canvasTabs;
          s.canvasTemplates = Array.isArray(d.canvasTemplates) ? d.canvasTemplates : s.canvasTemplates;
          s.transcriptTemplates = Array.isArray(d.transcriptTemplates) ? d.transcriptTemplates : s.transcriptTemplates;
          s.participantScores = d.participantScores || s.participantScores;
          s.catSettings = { ...s.catSettings, ...(d.catSettings || {}) };
          s.settings = { ...s.settings, ...(d.settings || {}) };
          return { ...s };
        });
        alert("Imported successfully ✓");
      } catch (e: any) {
        alert("Invalid file: " + e.message);
      }
    };
    r.readAsText(f);
  }

  function openPanel() {
    store.set((s) => { s.settings.panelOpen = true; return { ...s }; });
    bus.emit("open-panel"); // also emit for compatibility
  }
  function closePanel() {
    store.set((s) => { s.settings.panelOpen = false; return { ...s }; });
    bus.emit("close-panel");
  }

  return (
    <div className="space-y-4">
      <input type="file" ref={fileRef} accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importAll(f); e.target.value = ""; }} />

      <Section title="Audio & effects">
        <div className="grid md:grid-cols-2 gap-3">
          <Toggle label="Sound effects (chat ping, reactions)" checked={settings.soundEffects} onChange={(v) => set("soundEffects", v)} />
          <Toggle label="Background chatter ambience" checked={settings.backgroundChatter} onChange={(v) => set("backgroundChatter", v)} />
        </div>
      </Section>

      <Section title="Side panel">
        <div className="flex gap-2">
          <Btn variant="primary" onClick={openPanel}>📂 Open chat panel</Btn>
          <Btn variant="ghost" onClick={closePanel}>📁 Close chat panel</Btn>
        </div>
      </Section>

      <Section title="Live indicator">
        <div className="grid md:grid-cols-3 gap-3">
          <Toggle label="Go Live (red LIVE badge)" checked={settings.goLive} onChange={(v) => set("goLive", v)} />
          <Toggle label="Auto-fluctuate viewers (5-50)" checked={settings.liveAuto} onChange={(v) => set("liveAuto", v)} />
          <Field label="Viewer count">
            <TInput type="number" value={settings.liveViewerCount} onChange={(e) => set("liveViewerCount", Math.max(0, Number(e.target.value) || 0))} />
          </Field>
        </div>
      </Section>

      <Section title="Tutor profile">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Avatar"><AvatarInput value={tutor.avatar} onChange={(v) => store.set((s) => ({ ...s, tutor: { ...s.tutor, avatar: v } }))} /></Field>
          <div className="space-y-3">
            <Field label="Name"><TInput value={tutor.name} onChange={(e) => store.set((s) => ({ ...s, tutor: { ...s.tutor, name: e.target.value } }))} /></Field>
            <Field label="Info / Bio"><TTextarea rows={3} value={tutor.info} onChange={(e) => store.set((s) => ({ ...s, tutor: { ...s.tutor, info: e.target.value } }))} placeholder="Languages I teach, certifications, style…" /></Field>
            <Field label="Facts (used in AI prompts)"><TTextarea rows={3} value={tutor.facts} onChange={(e) => store.set((s) => ({ ...s, tutor: { ...s.tutor, facts: e.target.value } }))} placeholder="Hobbies, location, anecdotes…" /></Field>
          </div>
        </div>
      </Section>

      <Section title="Backup & restore">
        <p className="text-xs text-slate-500 mb-3">Export saves participants, learner scores, reactions, polls, dialogues, canvas tabs, editable canvas templates, tutor profile, cat voice settings and panel settings.</p>
        <div className="flex gap-2">
          <Btn variant="primary" onClick={exportAll}>💾 Export JSON</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>📂 Import JSON</Btn>
        </div>
      </Section>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-xl bg-white hover:border-slate-300 text-left"
    >
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={"relative w-10 h-6 rounded-full transition " + (checked ? "bg-indigo-500" : "bg-slate-200")}>
        <span className={"absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition " + (checked ? "translate-x-4" : "")} />
      </span>
    </button>
  );
}
