import React, { useEffect, useMemo, useState } from "react";
import { Btn, Disclosure, Modal, Pill } from "./ui";
import { parseAiJson } from "../lib/normalize";

/**
 * The one way AI output gets into the app.
 *
 * Step 1: the prompt is already assembled from this tutor's real data — copy it.
 * Step 2: paste the answer back.
 * Step 3: the modal tells you exactly what it understood BEFORE anything is saved:
 *         which fields were filled, what it could not place, and what was ignored.
 *
 * That last step is the fix for the class of bug where pasted JSON "didn't show up".
 * Nothing is ever applied silently, and nothing in a recognized field is ever
 * dropped — `lib/normalize.ts` accepts every plausible shape.
 */

export interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  purpose?: string;
  prompt: string;
  /** The JSON contract, shown for reference next to the paste box. */
  schema?: string;
  /** Set false for prompts whose answer is prose rather than JSON. */
  expectJson?: boolean;
  /**
   * Replaces the "how this works" line.
   *
   * The default says "attach nothing else", which is right for every prompt that carries
   * its own context — but wrong for the roster sweep, where the whole point is that you
   * attach a long chat export *after* the prompt. Leaving the default there would tell the
   * mentor to do the one thing that makes the flow produce nothing.
   */
  howItWorks?: string;
  /** Rendered above the prompt — used for inputs that change the prompt itself. */
  children?: React.ReactNode;
  /** A one-line summary of the parsed answer, shown before you apply it. */
  summarize?: (parsed: unknown) => string;
  /** Apply the parsed answer. Return a toast message, or throw to show an error. */
  onApply: (parsed: unknown, rawText: string) => string | void;
}

const copyText = async (value: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

const PromptModal: React.FC<PromptModalProps> = ({
  open,
  onClose,
  title,
  purpose,
  prompt,
  schema,
  expectJson = true,
  howItWorks,
  children,
  summarize,
  onApply,
}) => {
  const [answer, setAnswer] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setAnswer("");
      setError("");
      setCopied(false);
    }
  }, [open, prompt]);

  /**
   * The text that actually gets copied.
   *
   * The JSON contract has to travel *inside* the prompt, because the only thing the
   * model ever sees is what you paste into it — a contract shown neatly in this window
   * but left out of the prompt is a contract the model never reads, and every flow
   * would come back in whatever shape the model felt like using. Appending it here
   * means no individual prompt can forget it, and the `includes` check keeps the few
   * prompts that already embed their own example from repeating it twice.
   */
  const fullPrompt = useMemo(() => {
    const trimmed = schema?.trim();
    if (!trimmed || prompt.includes(trimmed)) return prompt;
    return `${prompt}\n\n## OUTPUT CONTRACT — your reply must be exactly this shape, with every key present\n${trimmed}`;
  }, [prompt, schema]);

  const parsed = useMemo(() => (answer.trim() ? parseAiJson(answer) : null), [answer]);

  const preview = useMemo(() => {
    if (!parsed?.ok) return null;
    try {
      return summarize ? summarize(parsed.value) : null;
    } catch {
      return null;
    }
  }, [parsed, summarize]);

  const handleCopy = async () => {
    const ok = await copyText(fullPrompt);
    setCopied(ok);
    if (!ok) setError("Your browser blocked the clipboard. Select the text and copy it manually.");
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setAnswer(text);
        setError("");
      }
    } catch {
      setError("Clipboard access was refused — paste into the box with Ctrl/⌘+V instead.");
    }
  };

  const handleApply = () => {
    if (!answer.trim()) {
      setError("Paste the AI's answer above first.");
      return;
    }
    if (!expectJson) {
      try {
        onApply(answer, answer);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not apply that answer.");
      }
      return;
    }
    const result = parseAiJson(answer);
    if (!result.ok) {
      setError(`${result.error} Make sure you pasted the whole reply, including the outer braces.`);
      return;
    }
    try {
      onApply(result.value, answer);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply that answer.");
    }
  };

  const charCount = fullPrompt.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={purpose}
      wide
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn onClick={handleApply} disabled={expectJson ? !parsed?.ok : !answer.trim()}>
            {expectJson ? "Apply to profile" : "Save answer"}
          </Btn>
        </>
      }
    >
      <div className="space-y-5">
        {children}

        {expectJson && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#FF79AC]/20 bg-[#FF79AC]/[0.06] p-3 text-xs text-[#121118]/91">
            <Pill tone="#FF79AC">how this works</Pill>
            {howItWorks ??
              "Copy the prompt → paste it into your own AI (attach nothing else) → paste the JSON it returns into the box at the bottom → Apply. Nothing is saved until you apply."}
          </div>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#121118]">
              <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-[#121118] text-[11px] text-white">1</span>
              Copy this prompt
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#121118]/78">{charCount.toLocaleString("en-US")} characters</span>
              <Btn size="sm" variant={copied ? "outline" : "primary"} onClick={() => void handleCopy()}>
                {copied ? "✅ Copied" : "📋 Copy prompt"}
              </Btn>
            </div>
          </div>
          <textarea
            readOnly
            value={fullPrompt}
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
            className="h-52 w-full resize-y rounded-2xl border border-black/16 bg-[#121118] p-3 font-mono text-[12px] leading-relaxed text-[#E7E5EA] outline-none"
          />
          {schema && (
            <div className="mt-2">
              <Disclosure title="The exact JSON shape this expects">
                <pre className="scrollbar-thin overflow-x-auto rounded-xl bg-black/[0.07] p-3 font-mono text-[12px] text-[#121118]/93">
                  {schema}
                </pre>
              </Disclosure>
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#121118]">
              <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-[#121118] text-[11px] text-white">2</span>
              Paste the answer
            </h3>
            <Btn size="sm" variant="outline" onClick={() => void handlePasteFromClipboard()}>
              📥 Paste from clipboard
            </Btn>
          </div>
          <textarea
            value={answer}
            spellCheck={false}
            onChange={(e) => {
              setAnswer(e.target.value);
              setError("");
            }}
            placeholder={expectJson ? "Paste the AI's JSON reply here…" : "Paste the AI's reply here…"}
            className="h-40 w-full resize-y rounded-2xl border border-black/16 bg-white p-3 font-mono text-[12px] leading-relaxed outline-none transition focus:border-[#FF79AC] focus:ring-4 focus:ring-[#FF79AC]/15"
          />
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>
        )}

        {expectJson && answer.trim() && (
          <section className="rounded-2xl border border-black/12 bg-black/[0.05] p-3">
            <h3 className="text-sm font-bold text-[#121118]">
              <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-[#121118] text-[11px] text-white">3</span>
              What will be applied
            </h3>
            {parsed?.ok ? (
              <div className="mt-2 space-y-1 text-xs text-[#121118]/91">
                <p className="font-semibold text-emerald-600">✅ Valid JSON — nothing is saved until you press Apply.</p>
                {preview && <p className="whitespace-pre-line text-[#121118]/94">{preview}</p>}
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-red-600">{parsed?.error ?? "Reading…"}</p>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
};

export default PromptModal;
