import { useState } from "react";
import { useStore, store, uid } from "../../state/store";
import { Btn, TInput, TTextarea } from "../../ui/primitives";
import { Field, Section } from "../shared";
import type { CanvasTemplate } from "../../state/types";

type SubTab = "library" | "prompt" | "custom" | "paste";

const LEVELS = ["Beginner", "Elementary", "Intermediate", "Upper Intermediate", "Advanced"];

export default function CanvasPromptTab() {
  const npcs = useStore((s) => s.npcs);
  const tutor = useStore((s) => s.tutor);
  const canvasTabs = useStore((s) => s.canvasTabs);
  const templates = useStore((s) => s.canvasTemplates);

  const [subTab, setSubTab] = useState<SubTab>("library");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  // Selected template for prompt generation
  const [selectedId, setSelectedId] = useState<string>(() => templates[0]?.id || "");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [extra, setExtra] = useState("");

  // Paste / add as tab
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteHtml, setPasteHtml] = useState("");

  // Custom template form (add new)
  const [customForm, setCustomForm] = useState<Omit<CanvasTemplate, "id">>({
    cat: "Custom",
    name: "",
    tags: [],
    desc: "",
    prompt: "",
  });
  const [customTagInput, setCustomTagInput] = useState("");

  // Edit existing template
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CanvasTemplate | null>(null);
  const [editTagInput, setEditTagInput] = useState("");

  const selectedTemplate = templates.find((t) => t.id === selectedId) || templates[0] || null;

  // ── Categories ─────────────────────────────────────────────────────────────
  const allCats = ["All", ...Array.from(new Set(templates.map((t) => t.cat)))];

  const filtered = templates.filter((t) => {
    const matchCat = catFilter === "All" || t.cat === catFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.cat.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  // ── Build prompt ───────────────────────────────────────────────────────────
  function buildPrompt(): string {
    const tpl = selectedTemplate;
    return `You are generating a single, fully self-contained HTML snippet to display inside a sandboxed <iframe> on a language teacher's "classroom screen". STRICT RULES:

1. Output ONLY raw HTML/CSS/JS (no markdown fences, no explanations).
2. Wrap ALL CSS in <style> selectors prefixed with a unique container class like ".lesson-${Date.now()}" so it cannot leak.
3. Use only inline scripts. No external fetches. No iframes. No window.top access.
4. The snippet must fit responsively in any container size and not exceed 100vh.
5. Use a clean white theme (#fff bg, #0f172a text, indigo accents #6366f1).
6. Use Apple-style typography (-apple-system, Segoe UI, system-ui).
7. All interactive elements (buttons, inputs) must be accessible and visible against white bg.
8. Animations welcome via CSS / JS, but never modify document.body styles globally.
9. VOICE: When read-aloud is needed, assume Microsoft Ava multilingual natural voice will be used.
10. IMAGES: Use real stock images from Unsplash or Pexels via direct URLs (https://images.unsplash.com/photo-…?w=800), never placeholder.com.

TEMPLATE: ${tpl?.name || "Custom"}
TEMPLATE GOAL: ${tpl?.prompt || "Build an engaging interactive HTML activity for a live language classroom."}

CONTEXT:
- Topic: ${topic || "(none specified)"}
- Learner level: ${level}
- Teacher: ${tutor.name}${tutor.info ? " — " + tutor.info : ""}
${tutor.facts ? "- Teacher facts: " + tutor.facts : ""}
- Participants in class:
${npcs.map((n) => `  • ${n.name} (${n.role}, L1: ${n.L1})`).join("\n") || "  (none)"}

EXTRA INSTRUCTIONS:
${extra || "(none)"}

Before generating, consider: What details would make this perfect for a live language class? Then generate the absolute best snippet without asking questions.

Now generate the HTML snippet.`;
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(buildPrompt());
      alert("Prompt copied to clipboard ✓");
    } catch {
      alert("Could not copy. Try selecting the text manually.");
    }
  }

  function addAsTab() {
    if (!pasteHtml.trim()) { alert("Paste HTML first."); return; }
    const t = pasteTitle.trim() || topic.trim() || "Canvas " + (canvasTabs.length + 1);
    store.set((s) => ({
      ...s,
      canvasTabs: [...s.canvasTabs, { id: uid("c_"), title: t, html: pasteHtml }],
    }));
    alert("Added as canvas tab ✓");
    setPasteHtml("");
    setPasteTitle("");
  }

  // ── Save new custom template ───────────────────────────────────────────────
  function saveCustom() {
    if (!customForm.name.trim()) { alert("Template name is required."); return; }
    if (!customForm.prompt.trim()) { alert("Template prompt is required."); return; }
    store.set((s) => ({
      ...s,
      canvasTemplates: [
        ...s.canvasTemplates,
        { id: uid("tpl_"), ...customForm, tags: customForm.tags },
      ],
    }));
    setCustomForm({ cat: "Custom", name: "", tags: [], desc: "", prompt: "" });
    setCustomTagInput("");
    alert("Custom template saved ✓");
    setSubTab("library");
  }

  function addCustomTag() {
    const tag = customTagInput.trim().toLowerCase();
    if (tag && !customForm.tags.includes(tag)) {
      setCustomForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    }
    setCustomTagInput("");
  }

  // ── Save edit ──────────────────────────────────────────────────────────────
  function saveEdit() {
    if (!editForm) return;
    store.set((s) => ({
      ...s,
      canvasTemplates: s.canvasTemplates.map((t) => (t.id === editForm.id ? editForm : t)),
    }));
    if (selectedId === editForm.id) {/* keep selection */}
    setEditingId(null);
    setEditForm(null);
  }

  function addEditTag() {
    if (!editForm) return;
    const tag = editTagInput.trim().toLowerCase();
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm({ ...editForm, tags: [...editForm.tags, tag] });
    }
    setEditTagInput("");
  }

  function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    store.set((s) => ({
      ...s,
      canvasTemplates: s.canvasTemplates.filter((t) => t.id !== id),
    }));
    if (selectedId === id) setSelectedId(templates.find((t) => t.id !== id)?.id || "");
    if (editingId === id) { setEditingId(null); setEditForm(null); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const subTabs: { key: SubTab; label: string }[] = [
    { key: "library", label: "📚 Library" },
    { key: "prompt", label: "📋 Build Prompt" },
    { key: "custom", label: "＋ New Template" },
    { key: "paste", label: "🖥 Add to Canvas" },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {subTabs.map((s) => (
          <button
            key={s.key}
            onClick={() => setSubTab(s.key)}
            className={
              "flex-1 py-1.5 text-xs font-medium rounded-lg transition " +
              (subTab === s.key
                ? "bg-white shadow text-indigo-700"
                : "text-slate-600 hover:text-slate-800")
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Library tab ─────────────────────────────────────────────────────── */}
      {subTab === "library" && (
        <Section title={`Template library (${templates.length})`}>
          {/* Search + category filter */}
          <div className="flex gap-2 mb-3">
            <TInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search by name, tag or category…"
              className="flex-1"
            />
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
            >
              {allCats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[480px] overflow-y-auto pr-1">
            {filtered.map((t) => {
              const isSelected = selectedId === t.id;
              const isEditing = editingId === t.id;
              return (
                <div
                  key={t.id}
                  className={
                    "border rounded-xl p-2.5 transition flex flex-col gap-1 " +
                    (isSelected ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300")
                  }
                >
                  {isEditing && editForm ? (
                    /* ── Inline edit form ─────────────────────────────────── */
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Editing</div>
                      <input
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Template name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                      <input
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Category"
                        value={editForm.cat}
                        onChange={(e) => setEditForm({ ...editForm, cat: e.target.value })}
                      />
                      <input
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Short description"
                        value={editForm.desc}
                        onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })}
                      />
                      <textarea
                        rows={3}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white resize-y focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Template prompt instruction…"
                        value={editForm.prompt}
                        onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                      />
                      {/* Tags */}
                      <div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {editForm.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px]">
                              {tag}
                              <button onClick={() => setEditForm({ ...editForm, tags: editForm.tags.filter((_, j) => j !== i) })} className="hover:text-rose-500">×</button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <input
                            className="flex-1 px-2 py-0.5 text-[10px] border border-slate-200 rounded-lg bg-white focus:outline-none"
                            placeholder="Add tag"
                            value={editTagInput}
                            onChange={(e) => setEditTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditTag(); } }}
                          />
                          <Btn size="sm" variant="ghost" onClick={addEditTag}>＋</Btn>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Btn size="sm" variant="primary" onClick={saveEdit}>Save</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm(null); }}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    /* ── Display card ────────────────────────────────────── */
                    <>
                      <div
                        className="cursor-pointer"
                        onClick={() => { setSelectedId(t.id); setSubTab("prompt"); }}
                      >
                        <div className="text-xs font-semibold text-slate-800 leading-tight">{t.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{t.desc}</div>
                        <div className="text-[9px] text-indigo-600 mt-1 font-medium">{t.cat}</div>
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {t.tags.slice(0, 4).map((tag, i) => (
                            <span key={i} className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px]">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-100">
                        <Btn
                          size="sm"
                          variant="soft"
                          className="flex-1 !text-[10px] !py-0.5"
                          onClick={() => { setSelectedId(t.id); setSubTab("prompt"); }}
                        >
                          {isSelected ? "✓ Selected" : "Select"}
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost"
                          className="!px-1.5 !text-[10px]"
                          onClick={() => {
                            setEditingId(t.id);
                            setEditForm({ ...t });
                            setEditTagInput("");
                          }}
                        >
                          ✏️
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost"
                          className="!px-1.5 !text-[10px] hover:text-rose-600"
                          onClick={() => deleteTemplate(t.id)}
                        >
                          🗑
                        </Btn>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center text-slate-400 py-8 text-sm">
                No templates match. Try a different search or add a custom one.
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Build prompt tab ────────────────────────────────────────────────── */}
      {subTab === "prompt" && (
        <div className="space-y-4">
          {selectedTemplate ? (
            <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">{selectedTemplate.cat}</div>
                <div className="font-semibold text-slate-800">{selectedTemplate.name}</div>
                <div className="text-xs text-slate-600 mt-0.5">{selectedTemplate.desc}</div>
              </div>
              <Btn size="sm" variant="ghost" onClick={() => setSubTab("library")}>Change</Btn>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              No template selected. <button className="underline" onClick={() => setSubTab("library")}>Choose one from the library.</button>
            </div>
          )}

          <Section title="Prompt settings">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Topic / Subject">
                <TInput value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Past simple verbs, Ordering food" />
              </Field>
              <Field label="Learner level">
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white">
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Extra instructions (optional)">
                <TTextarea
                  rows={3}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="e.g. Use gamified scoring, include funny examples, add a timer…"
                />
              </Field>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Btn variant="primary" onClick={copyPrompt}>📋 Copy Full Prompt</Btn>
              <Btn variant="ghost" onClick={() => setSubTab("paste")}>→ Paste AI output</Btn>
            </div>
          </Section>

          <Section title="Preview prompt (read-only)">
            <pre className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-auto max-h-64 whitespace-pre-wrap font-mono leading-relaxed">
              {buildPrompt()}
            </pre>
          </Section>
        </div>
      )}

      {/* ── New custom template tab ─────────────────────────────────────────── */}
      {subTab === "custom" && (
        <Section title="Add custom template">
          <div className="space-y-3">
            <Field label="Template name *">
              <TInput
                value={customForm.name}
                onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                placeholder="e.g. Vocabulary Bingo, Listening Cloze"
              />
            </Field>
            <Field label="Category">
              <TInput
                value={customForm.cat}
                onChange={(e) => setCustomForm({ ...customForm, cat: e.target.value })}
                placeholder="e.g. Custom, Games, Speaking, Writing"
              />
            </Field>
            <Field label="Short description">
              <TInput
                value={customForm.desc}
                onChange={(e) => setCustomForm({ ...customForm, desc: e.target.value })}
                placeholder="One sentence about what this creates"
              />
            </Field>
            <Field
              label="Template prompt instruction *"
              hint="This is injected into the AI prompt as the 'TEMPLATE GOAL'. Be specific about what the HTML should do."
            >
              <TTextarea
                rows={5}
                value={customForm.prompt}
                onChange={(e) => setCustomForm({ ...customForm, prompt: e.target.value })}
                placeholder="e.g. Build a vocabulary bingo card game where learners mark words as the teacher calls them out. Include a 5x5 bingo grid, word-check popup, and a win-celebration animation."
              />
            </Field>
            <Field label="Tags (press Enter or click + to add)">
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {customForm.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                      {tag}
                      <button onClick={() => setCustomForm({ ...customForm, tags: customForm.tags.filter((_, j) => j !== i) })} className="hover:text-rose-500 ml-0.5">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <TInput
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                    placeholder="e.g. games, vocabulary, interactive"
                  />
                  <Btn variant="ghost" onClick={addCustomTag}>＋</Btn>
                </div>
              </div>
            </Field>
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" size="lg" onClick={saveCustom}>💾 Save to Library</Btn>
              <Btn variant="ghost" onClick={() => { setCustomForm({ cat: "Custom", name: "", tags: [], desc: "", prompt: "" }); setCustomTagInput(""); }}>
                Clear
              </Btn>
            </div>
          </div>
        </Section>
      )}

      {/* ── Paste & add to canvas ───────────────────────────────────────────── */}
      {subTab === "paste" && (
        <Section title="Paste AI-generated HTML and add to canvas">
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
              <strong>How to use:</strong> Copy the prompt from the <em>Build Prompt</em> tab → paste into ChatGPT / Claude / Gemini → copy the HTML it outputs → paste below → click <em>Add to Canvas Tabs</em>.
            </div>
            <Field label="Canvas tab title (optional)">
              <TInput value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder={`e.g. ${topic || "Lesson activity"}`} />
            </Field>
            <Field label="Paste HTML here">
              <TTextarea
                rows={12}
                value={pasteHtml}
                onChange={(e) => setPasteHtml(e.target.value)}
                placeholder={'<div class="lesson-abc"><!-- paste AI output here --></div>'}
                className="font-mono text-xs"
              />
            </Field>
            <div className="flex gap-2">
              <Btn variant="success" size="lg" onClick={addAsTab} disabled={!pasteHtml.trim()}>
                ＋ Add to Canvas Tabs
              </Btn>
              {pasteHtml && <Btn variant="ghost" onClick={() => { setPasteHtml(""); setPasteTitle(""); }}>Clear</Btn>}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
