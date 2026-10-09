import { useState } from "react";
import { nanoid } from "nanoid";
import { useGameState } from "../../engine/store";
import { addUniverse, removeUniverse, setActiveUniverse, updateUniverse } from "./helpers";
import { SOCIAL_PRESETS, UNIVERSE_TEMPLATES } from "../../engine/templates";
import { applySocialDeductionPreset } from "../../engine/actions";
import { Badge, Button, Card, Field, Input, Select, SectionTitle, Textarea } from "../primitives";
import type { UniverseTemplateId } from "../../engine/types";

export function UniverseTab() {
  const state = useGameState();
  const [quickLore, setQuickLore] = useState("");
  const [expandedTemplate, setExpandedTemplate] = useState<UniverseTemplateId | null>(null);

  const createFromTemplate = (templateId: UniverseTemplateId) => {
    const tpl = UNIVERSE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const newUniverse = {
      id: nanoid(6),
      name: `${tpl.label} — New`,
      icon: tpl.icon,
      category:
        templateId === "social-deduction"
          ? ("social-deduction" as const)
          : templateId === "video-game"
          ? ("video-game" as const)
          : templateId === "movie-tv"
          ? ("movie" as const)
          : templateId === "situational"
          ? ("situational" as const)
          : ("custom" as const),
      description: tpl.blurb,
      lore: tpl.system,
      templateId,
    };
    addUniverse(newUniverse);
    setActiveUniverse(newUniverse.id);
    setQuickLore(tpl.blurb);
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-violet-500/30 bg-violet-500/5">
        <SectionTitle>📚 Universe Templates — turn-based game engines</SectionTitle>
        <p className="text-xs text-slate-400">
          Each template is a hyper-detailed, opinionated set of rules. When you copy the prompt, the
          AI is FORCED to follow that template's structure (intro → cast → how-to-play → game) and the
          exact card-based interaction pattern. Every generated chapter is a fully playable game.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {UNIVERSE_TEMPLATES.map((tpl) => (
          <Card key={tpl.id} className={`space-y-1.5 border-2 ${
            expandedTemplate === tpl.id ? "border-violet-400/60 bg-violet-500/10" : "border-white/10"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tpl.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-100">{tpl.label}</div>
                <div className="text-[10px] text-slate-400">{tpl.blurb}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {tpl.defaultRoles.slice(0, 3).map((r) => (
                <span key={r.role} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">
                  {r.emoji} {r.role}
                </span>
              ))}
              {tpl.defaultRoles.length > 3 && (
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                  +{tpl.defaultRoles.length - 3}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="primary" onClick={() => createFromTemplate(tpl.id)}>＋ Use this template</Button>
              <Button size="sm" variant="subtle" onClick={() => setExpandedTemplate(expandedTemplate === tpl.id ? null : tpl.id)}>
                {expandedTemplate === tpl.id ? "Hide" : "View"} details
              </Button>
            </div>
            {expandedTemplate === tpl.id && (
              <div className="mt-1 max-h-64 space-y-1 overflow-y-auto rounded-lg bg-slate-950/60 p-2 text-[10px] text-slate-300">
                <div className="font-bold text-violet-300">System prompt (injected to AI):</div>
                <pre className="whitespace-pre-wrap font-mono text-[9px] leading-snug">{tpl.system}</pre>
                <div className="font-bold text-violet-300 mt-2">Default NPC roles:</div>
                {tpl.defaultRoles.map((r) => (
                  <div key={r.role}>• {r.emoji} {r.role} ({r.alignment}) — {r.brief}</div>
                ))}
                <div className="font-bold text-violet-300 mt-2">Required widgets:</div>
                {tpl.requiredWidgets.map((w) => (
                  <div key={w.widget}>• {w.widget} — {w.title}</div>
                ))}
                <div className="font-bold text-violet-300 mt-2">Required scenes (each has strict must-include):</div>
                {tpl.requiredScenes.map((s) => (
                  <div key={s.title}>• {s.title} (min {s.minLines} lines): {s.must.join(", ")}</div>
                ))}
                <div className="font-bold text-violet-300 mt-2">Functional rules:</div>
                {tpl.rules.map((r, i) => (
                  <div key={i}>• {r}</div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle>Active Universe (Select ONE)</SectionTitle>
        <p className="mb-2 text-xs text-slate-400">Click a universe to make it active. Each universe is bound to one template.</p>
        <div className="grid grid-cols-2 gap-2">
          {state.universes.map((u) => (
            <button
              key={u.id}
              onClick={() => setActiveUniverse(u.id)}
              className={`flex items-center gap-2 rounded-lg p-2 text-left ring-1 transition ${
                u.id === state.activeUniverseId ? "bg-violet-600/20 ring-violet-400" : "bg-slate-900/50 ring-white/10 hover:bg-white/5"
              }`}
            >
              <span className="text-2xl">{u.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-100">{u.name}</div>
                <div className="flex gap-1 mt-0.5">
                  <Badge>{u.category}</Badge>
                  {u.templateId && <Badge color="#a78bfa">{u.templateId}</Badge>}
                </div>
              </div>
            </button>
          ))}
        </div>
        {state.universes.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">No universes yet. Pick a template above to create one.</p>
        )}
      </Card>

      <Card>
        <SectionTitle>Social Deduction Presets</SectionTitle>
        <p className="text-xs text-slate-400 mb-2">One-click to create a social-deduction universe and set the social-deduction template active.</p>
        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_PRESETS.map((p: any) => (
            <button
              key={p.id}
              onClick={() => {
                applySocialDeductionPreset(p);
                setActiveUniverse(p.id);
                alert(`${p.name} universe created. Open Story Maker to copy the prompt.`);
              }}
              className="rounded-lg bg-slate-900/50 p-2 text-left ring-1 ring-white/10 hover:bg-white/5"
            >
              <div className="text-sm font-bold">{p.icon} {p.name}</div>
              <div className="text-[11px] text-slate-400">{p.blurb}</div>
              <div className="mt-1 text-[10px] text-violet-300">{p.roles.join(" · ")}</div>
              <div className="mt-1 text-[10px] text-emerald-300">Activates the social-deduction template with full hidden-role rules.</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Lore / Quick Description for active universe</SectionTitle>
        <p className="text-xs text-slate-400 mb-2">Add a short paragraph to give the AI extra context. The lore is injected into the prompt.</p>
        <Textarea
          placeholder="e.g. A floating city powered by clockwork magic where everyone wears masks…"
          value={quickLore}
          onChange={(e) => {
            setQuickLore(e.target.value);
            const active = state.universes.find((u) => u.id === state.activeUniverseId);
            if (active) updateUniverse(active.id, { lore: e.target.value });
          }}
          rows={3}
        />
      </Card>

      {state.universes.map((u) => (
        <Card key={u.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <Input className="w-16 text-center text-xl" value={u.icon} onChange={(e) => updateUniverse(u.id, { icon: e.target.value })} />
            <Input className="flex-1 font-bold" value={u.name} onChange={(e) => updateUniverse(u.id, { name: e.target.value })} />
            <Select value={u.category} onChange={(e) => updateUniverse(u.id, { category: e.target.value as never })} className="w-40">
              <option value="custom">custom</option>
              <option value="video-game">video-game</option>
              <option value="movie">movie</option>
              <option value="situational">situational</option>
              <option value="social-deduction">social-deduction</option>
            </Select>
            <Select
              value={u.templateId ?? "custom"}
              onChange={(e) => updateUniverse(u.id, { templateId: e.target.value as UniverseTemplateId })}
              className="w-36"
            >
              {UNIVERSE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </Select>
            <Button size="icon" variant="danger" onClick={() => removeUniverse(u.id)}>🗑️</Button>
          </div>
          <Field label="Description"><Input value={u.description} onChange={(e) => updateUniverse(u.id, { description: e.target.value })} /></Field>
          <Field label="Lore / Setting (longer)">
            <Textarea rows={3} value={u.lore} onChange={(e) => updateUniverse(u.id, { lore: e.target.value })} />
          </Field>
        </Card>
      ))}
    </div>
  );
}
