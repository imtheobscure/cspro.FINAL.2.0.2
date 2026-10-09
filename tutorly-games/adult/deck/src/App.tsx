import React from "react";
import { Bot, Check, Clipboard, Copy, FileText, Pencil, X, type LucideIcon } from "lucide-react";
import { FlashcardsTool } from "./tools/flashcards/FlashcardsTool";
import { DEMO_PAYLOAD, FlashPayload, FlashItem } from "./tools/flashcards/flashcards";
import { readShareUrl } from "./lib/deck";
import { useTutorlyBranding } from "./lib/tutorlyBranding";
import { TutorlySplash } from "./components/TutorlySplash";
import { Mascot } from "./components/Glyphs";
import {
  CEFR_LEVELS,
  EMPTY_BRIEF,
  LANGUAGE_NAMES,
  buildLessonPrompt,
  type CefrLevel,
  type LessonBrief,
} from "./lib/lessonPrompt";

/**
 * A consistent icon + label row.
 *
 * `LucideIcon` rather than a hand-rolled component type: the props Lucide accepts for
 * `aria-hidden` are `Booleanish`, and describing them by hand produced a type that was
 * narrower than the icons actually are.
 */
function Label({ icon: Glyph, children, size = 13 }: { icon: LucideIcon; children: React.ReactNode; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Glyph size={size} strokeWidth={2} aria-hidden="true" />
      {children}
    </span>
  );
}

// Initialize confetti
async function loadConfetti() {
  const mod = await import("canvas-confetti");
  (window as any).__confetti__ = mod.default;
}
loadConfetti();

const DEMO_PLAYERS = [{ id: "p1", name: "Player 1", score: 0, avatar: "🧙‍♂️" }];

/* ─────────────────────────────────────────────────────────────
 * The lesson brief form's shared field shell.
 *
 * Every field is a labelled control with the same chrome, so the panel reads as one form
 * rather than as nine unrelated boxes, and so the labels are real `<label>` elements —
 * which is also what makes the panel usable with a keyboard and a screen reader.
 * ───────────────────────────────────────────────────────────── */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs font-black uppercase tracking-wider text-fg-3">{label}</span>
      {children}
      {hint ? <span className="text-2xs leading-snug text-fg-4">{hint}</span> : null}
    </label>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-line-2 bg-inset px-2.5 py-2 text-sm font-semibold text-fg-1 outline-none transition placeholder:font-normal placeholder:text-fg-4 focus:border-indigo-400";

export default function App() {
  const [payload, setPayload] = React.useState<FlashPayload>(DEMO_PAYLOAD);
  const [players, setPlayers] = React.useState(DEMO_PLAYERS);
  const [showEditor, setShowEditor] = React.useState(false);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [jsonText, setJsonText] = React.useState(JSON.stringify(DEMO_PAYLOAD, null, 2));
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [copySuccess, setCopySuccess] = React.useState(false);
  const [shareNotice, setShareNotice] = React.useState<string | null>(null);
  /*
   * The brief.
   *
   * Held in state rather than typed straight into the prompt so the tutor can fill the form
   * once and re-copy as many times as the deck needs reworking — which is the normal shape
   * of this task, not a one-shot.
   */
  const [brief, setBrief] = React.useState<LessonBrief>(EMPTY_BRIEF);
  const [showPreview, setShowPreview] = React.useState(false);

  /*
   * The tutor's opening screen, read from the Adult Dashboard.
   *
   * `enabled` is the dashboard's own switch, so with it off this app opens straight into
   * the card exactly as it did before — the setting is honoured rather than decorative.
   */
  const branding = useTutorlyBranding();
  const [showSplash, setShowSplash] = React.useState(true);

  const setField = <K extends keyof LessonBrief>(key: K, value: LessonBrief[K]) =>
    setBrief((previous) => ({ ...previous, [key]: value }));

  const prompt = React.useMemo(() => buildLessonPrompt(brief), [brief]);

  /* The two fields without which the prompt is generic rather than personal. */
  const missingLearner = brief.learner.trim().length === 0;
  const hasLesson = brief.lessonText.trim().length > 0;

  /*
   * Load a deck from a share link.
   *
   * The QR code and the copy-link button encode a whole deck into the URL fragment, so
   * without this they produced something that looked like a feature and did nothing when
   * opened. The fragment is cleared afterwards, because a refresh should not silently
   * reload a deck the learner has since moved on from.
   */
  React.useEffect(() => {
    const load = () => {
      const result = readShareUrl(window.location.href);
      if (!result) return;
      if (!result.payload.items.length) {
        setShareNotice("That share link did not contain any usable cards.");
      } else {
        setPayload(result.payload);
        setJsonText(JSON.stringify(result.payload, null, 2));
        setShareNotice(
          `Loaded \u201C${result.payload.title}\u201D from a share link \u2014 ${result.payload.items.length} card${result.payload.items.length === 1 ? "" : "s"}.`
        );
      }
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    };

    load();
    /*
     * `hashchange` matters because a fragment-only navigation does **not** reload the
     * document. Opening a share link in a fresh tab works from the mount alone, but
     * pasting one into the address bar of a tab that already has the app open would
     * otherwise do nothing at all — the React tree never remounts.
     */
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  const validateAndApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);

      if (!parsed.items || !Array.isArray(parsed.items)) {
        setJsonError("❌ JSON must have an 'items' array.");
        return;
      }

      if (parsed.items.length === 0) {
        setJsonError("❌ Items array cannot be empty.");
        return;
      }

      const errors: string[] = [];
      const validRarities = ["common", "rare", "epic", "legendary"];
      const stringList = (value: unknown): string[] =>
        Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];

      /*
       * Only http(s) URLs are allowed through to an image.
       *
       * Every other field here is text, but `image` is fed straight to `<img src>`. A
       * `javascript:` or `data:` value pasted into a deck JSON is an injection, so the
       * allow-list is on the scheme rather than on the shape of the string.
       */
      const isHttpUrl = (value: unknown): value is string => {
        if (typeof value !== "string") return false;
        try {
          const url = new URL(value.trim());
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      };

      parsed.items = parsed.items.map((item: any, i: number): FlashItem => {
        const idx = i + 1;

        if (!item.front || typeof item.front !== "string" || item.front.trim() === "") {
          errors.push(`Item ${idx}: Missing or empty 'front' field`);
        }
        if (!item.back || typeof item.back !== "string" || item.back.trim() === "") {
          errors.push(`Item ${idx}: Missing or empty 'back' field`);
        }

        // Validate CCQ
        if (!item.ccq || !Array.isArray(item.ccq)) {
          errors.push(`Item ${idx}: Missing 'ccq' array`);
        } else if (item.ccq.length < 1) {
          errors.push(`Item ${idx}: 'ccq' array must have at least 1 question`);
        } else {
          item.ccq.forEach((q: any, qi: number) => {
            if (typeof q.question !== "string" || q.question.trim() === "") {
              errors.push(`Item ${idx}, CCQ ${qi + 1}: Invalid or empty question`);
            }
            if (typeof q.answer !== "boolean") {
              errors.push(`Item ${idx}, CCQ ${qi + 1}: 'answer' must be true or false (boolean), got: ${typeof q.answer}`);
            }
          });
        }

        // Validate rarity
        if (item.rarity && !validRarities.includes(item.rarity)) {
          errors.push(`Item ${idx}: Invalid rarity '${item.rarity}'. Must be: ${validRarities.join(", ")}`);
        }

        // Validate examples
        if (item.examples && !Array.isArray(item.examples)) {
          errors.push(`Item ${idx}: 'examples' must be an array`);
        }

        // Validate etymology
        if (item.etymology && typeof item.etymology !== "object") {
          errors.push(`Item ${idx}: 'etymology' must be an object`);
        }

        /*
         * The pass-through for everything the generator is asked for beyond the original
         * contract. Without this the validator silently *deleted* the pronunciation, the
         * collocations and the hint — the deck loaded, and the extra content the tutor paid
         * for was gone.
         */
        return {
          id: item.id || String(idx),
          front: item.front || "",
          back: item.back || "",
          example: item.example || "",
          examples: item.examples || [],
          l1Translation: item.l1Translation || "",
          etymology: item.etymology || undefined,
          wordFamily: stringList(item.wordFamily),
          ccq: item.ccq || [{ question: `Do you understand "${item.front}"?`, answer: true }],
          rarity: validRarities.includes(item.rarity) ? item.rarity : "common",
          pronunciation: typeof item.pronunciation === "string" ? item.pronunciation : undefined,
          partOfSpeech: typeof item.partOfSpeech === "string" ? item.partOfSpeech : undefined,
          register: typeof item.register === "string" ? item.register : undefined,
          cefr: typeof item.cefr === "string" ? item.cefr : undefined,
          synonyms: stringList(item.synonyms),
          antonyms: stringList(item.antonyms),
          collocations: stringList(item.collocations),
          hint: typeof item.hint === "string" ? item.hint : undefined,
          image: isHttpUrl(item.image) ? item.image : undefined,
          imageCredit: typeof item.imageCredit === "string" ? item.imageCredit : undefined,
          imageAlt: typeof item.imageAlt === "string" ? item.imageAlt : undefined,
        };
      });

      if (errors.length > 0) {
        setJsonError(`⚠️ Validation errors found:\n\n${errors.slice(0, 8).join("\n")}${errors.length > 8 ? `\n\n...and ${errors.length - 8} more errors` : ""}`);
        return;
      }

      // Deck-level metadata travels with the cards, so two decks of the same lesson for two
      // learners stay distinguishable in the header and in the printed handout.
      setPayload({
        ...parsed,
        learner: typeof parsed.learner === "string" ? parsed.learner : undefined,
        level: typeof parsed.level === "string" ? parsed.level : undefined,
        source: typeof parsed.source === "string" ? parsed.source : undefined,
      });
      setJsonError(null);
      setShowEditor(false);
    } catch (e: any) {
      let message = e.message;
      const posMatch = message.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const lines = jsonText.substring(0, pos).split("\n");
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        message = `Syntax error at line ${line}, column ${col}:\n${message}`;
      }
      setJsonError(`❌ JSON Parse Error:\n\n${message}\n\n💡 Tip: Check for missing commas, extra commas, or unclosed brackets.`);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    /*
     * No background colour here on purpose: `body` paints the stage from the
     * `--stage-bg` token, so the page, this wrapper and any full-bleed overlay all
     * resolve to the same surface in both themes.
     */
    <div className="relative min-h-screen w-full">
      {/*
       * The Tutorly splash, once per page load.
       *
       * Rendered here rather than inside the tool because it belongs to the shell: it is
       * the first thing a learner sees, and it has to be dismissible before the card is
       * on screen, not after.
       */}
      {showSplash && branding.enabled ? (
        <TutorlySplash
          branding={branding}
          gameName="Deck"
          tagline="Immersive 3D flashcards for your own lesson — every card, mode and quote built from the material you brought."
          mark={<Mascot mood="excited" size={64} />}
          onStart={() => setShowSplash(false)}
        />
      ) : null}

      {/* Control Panel */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => { setShowPrompt(!showPrompt); setShowEditor(false); }}
            className="rounded-xl border px-4 py-2 text-xs font-black transition-all"
            style={{
              background: showPrompt ? "#10b98122" : "var(--surface-control)",
              borderColor: showPrompt ? "#10b981" : "var(--border-control)",
              color: showPrompt ? "#0f9d6b" : "var(--content-3)",
            }}
          >
            {showPrompt ? <Label icon={X}>Close</Label> : <Label icon={Bot}>Lesson to deck</Label>}
          </button>
          <button
            onClick={() => { setShowEditor(!showEditor); setShowPrompt(false); }}
            className="rounded-xl border px-4 py-2 text-xs font-black transition-all"
            style={{
              background: showEditor ? "#6366f122" : "var(--surface-control)",
              borderColor: showEditor ? "#6366f1" : "var(--border-control)",
              color: showEditor ? "#4f46e5" : "var(--content-3)",
            }}
          >
            {showEditor ? <Label icon={X}>Close</Label> : <Label icon={Pencil}>Paste JSON</Label>}
          </button>
        </div>

        {/* Lesson-to-deck brief */}
        {showPrompt && (
          <div
            className="flex max-h-[86vh] w-[min(92vw,620px)] flex-col gap-3 overflow-hidden rounded-2xl border p-4"
            style={{ background: "var(--surface-overlay)", borderColor: "#10b98144", backdropFilter: "blur(20px)", boxShadow: "0 30px 60px rgba(15,23,42,0.28)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <Bot size={14} strokeWidth={2} aria-hidden="true" /> Lesson → deck
              </div>
              <button
                onClick={() => void copyText(prompt)}
                className="rounded-lg px-3 py-1.5 text-xs font-black transition-all"
                style={{ background: copySuccess ? "#10b98133" : "#10b98122", border: "1px solid #10b981", color: "#047857" }}
              >
                {copySuccess ? <Label icon={Check}>Copied!</Label> : <Label icon={Clipboard}>Copy prompt</Label>}
              </button>
            </div>

            <p className="text-xs leading-relaxed text-fg-3">
              Fill this in, then paste the prompt into ChatGPT, Claude or Gemini <strong className="text-emerald-700 dark:text-emerald-400">together with your lesson</strong> — attach the PDF, or paste its text below. What comes back is the deck JSON for every mode in the game.
            </p>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Learner's name">
                  <input
                    className={INPUT_CLASS}
                    value={brief.learner}
                    onChange={(event) => setField("learner", event.target.value)}
                    placeholder="e.g. Marta"
                  />
                </Field>
                <Field label="First language">
                  <select
                    className={INPUT_CLASS}
                    value={brief.l1}
                    onChange={(event) => setField("l1", event.target.value)}
                  >
                    {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="CEFR level">
                  <select
                    className={INPUT_CLASS}
                    value={brief.level}
                    onChange={(event) => setField("level", event.target.value as CefrLevel)}
                  >
                    {CEFR_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cards">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className={INPUT_CLASS}
                    value={brief.count}
                    onChange={(event) => setField("count", Number(event.target.value))}
                  />
                </Field>
              </div>

              <div className="mt-2.5">
                <Field label="Lesson title or topic">
                  <input
                    className={INPUT_CLASS}
                    value={brief.topic}
                    onChange={(event) => setField("topic", event.target.value)}
                    placeholder="e.g. Unit 4 — negotiating a deadline"
                  />
                </Field>
              </div>

              <div className="mt-2.5">
                <Field
                  label={`Facts about ${brief.learner.trim() || "the learner"}`}
                  hint="One per line. These become the personal example sentences, so the more specific the better: job, studies, family, hobbies, a goal, a running joke."
                >
                  <textarea
                    className={`${INPUT_CLASS} min-h-[68px] resize-y`}
                    value={brief.facts}
                    onChange={(event) => setField("facts", event.target.value)}
                    placeholder={"works nights as a nurse\nlearning English for a residency interview\nplays five-a-side on Sundays\nhates small talk"}
                  />
                </Field>
              </div>

              <div className="mt-2.5">
                <Field
                  label="Lesson text (paste it here)"
                  hint={hasLesson ? "The prompt will carry this text verbatim." : "Leave empty if you are attaching the PDF instead — the prompt will refer to the attachment."}
                >
                  <textarea
                    className={`${INPUT_CLASS} min-h-[100px] resize-y font-mono text-xs`}
                    value={brief.lessonText}
                    onChange={(event) => setField("lessonText", event.target.value)}
                    placeholder="Paste the lesson, handout or transcript here…"
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                aria-expanded={showPreview}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line-2 bg-inset px-3 py-2 text-xs font-black text-fg-2 transition hover:bg-control"
              >
                <FileText size={13} strokeWidth={2} aria-hidden="true" />
                {showPreview ? "Hide the prompt" : `Preview the prompt (${prompt.length.toLocaleString()} characters)`}
              </button>

              {showPreview ? (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line-2 bg-sunken p-3 font-mono text-2xs leading-relaxed text-fg-2">
                  {prompt}
                </pre>
              ) : null}
            </div>

            {missingLearner ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-2xs font-bold leading-relaxed text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
                Add the learner's name — the personal examples are the part of this deck that makes it theirs, and they cannot be written without it.
              </p>
            ) : null}

            <div className="rounded-xl border border-line-2 bg-inset p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-fg-2">
                <Pencil size={13} strokeWidth={2} aria-hidden="true" /> How to use it
              </div>
              <ol className="list-inside list-decimal space-y-1 text-xs text-fg-3">
                <li>Fill in the learner, the level and their facts.</li>
                <li>Copy the prompt, then attach the lesson PDF or paste its text into the chat.</li>
                <li>Paste the JSON that comes back into <strong className="text-fg-2">Paste JSON</strong> and validate.</li>
                <li>Study it — every mode reads the same deck, and progress is kept.</li>
              </ol>
            </div>
          </div>
        )}

        {/* JSON Editor Panel */}
        {showEditor && (
          <div
            className="flex max-h-[80vh] w-80 flex-col gap-3 overflow-hidden rounded-2xl border p-4 sm:w-[520px]"
            style={{ background: "var(--surface-overlay)", borderColor: "#6366f144", backdropFilter: "blur(20px)", boxShadow: "0 30px 60px rgba(15,23,42,0.28)" }}
          >
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              <Copy size={13} strokeWidth={2} aria-hidden="true" /> Paste &amp; Validate JSON
            </div>

            <div className="rounded-lg p-2 text-xs text-fg-3" style={{ background: "rgba(99,102,241,0.1)" }}>
              Paste the JSON from AI. The validator will check all fields and report specific errors.
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setJsonError(null); }}
              className="min-h-[250px] w-full flex-1 resize-none overflow-auto rounded-xl border p-3 font-mono text-xs outline-none"
              style={{ background: "var(--surface-sunken)", borderColor: jsonError ? "#ef444466" : "#6366f122", color: "#4338ca", lineHeight: 1.5 }}
              spellCheck={false}
              placeholder="Paste your JSON here..."
            />

            {jsonError && (
              <div className="max-h-32 overflow-auto rounded-xl border p-3 text-xs" style={{ background: "#ef444411", borderColor: "#ef444444" }}>
                <pre className="whitespace-pre-wrap font-mono text-red-700 dark:text-red-400">{jsonError}</pre>
              </div>
            )}

            <button
              onClick={validateAndApplyJson}
              className="rounded-xl py-3 text-sm font-black transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 0 20px rgba(99,102,241,0.4)", color: "white" }}
            >
              <Label icon={Check} size={15}>Validate &amp; Load Cards</Label>
            </button>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg p-2 text-center" style={{ background: "var(--surface-inset)" }}>
                <span className="text-fg-4">Cards:</span>
                <span className="ml-1 font-black text-indigo-600 dark:text-indigo-400">{payload.items.length}</span>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ background: "var(--surface-inset)" }}>
                <span className="text-fg-4">Level:</span>
                <span className="ml-1 font-black text-emerald-700 dark:text-emerald-400">{payload.level || "—"}</span>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ background: "var(--surface-inset)" }}>
                <span className="text-fg-4">Deck:</span>
                <span className="ml-1 font-black text-amber-700 dark:text-amber-400">{payload.title?.slice(0, 10) || "Demo"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {shareNotice ? (
        <div className="mx-auto mb-3 flex max-w-2xl items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
          <span className="flex-1">{shareNotice}</span>
          <button onClick={() => setShareNotice(null)} aria-label="Dismiss" className="rounded p-1 transition hover:bg-inset">
            <X size={13} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <FlashcardsTool payload={payload} players={players} setPlayers={setPlayers} />
    </div>
  );
}
