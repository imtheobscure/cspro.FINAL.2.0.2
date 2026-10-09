import React, { useMemo, useState } from "react";
import { PROVIDERS, TGJU_URL, fetchLiveRate, pickBest, rateKindLabel, tomanPerUsd, type RateAttempt, type RateResult } from "../lib/rates";
import type { AppState, Platform } from "../types";
import { BUILTIN_PLATFORMS, allPlatforms } from "../lib/platforms";
import { Btn, Card, Disclosure, Field, Pill, PlatformMark, SectionTitle, Stat, inputClass } from "../components/ui";
import { downloadJson, folderSyncSupported, readJsonFile } from "../lib/storage";
import { downloadSpreadsheet } from "../lib/exportWorkbook";
import { stateSizeLabel } from "../lib/image";
import { num, relativeDate, toman, usd } from "../lib/format";
import { DEFAULT_RIAL_PER_USD } from "../lib/format";
import type { SyncStatus, Toast } from "../lib/useAppState";

/**
 * Settings, where the two things that make this app *this* app are configured: the
 * Toman rate that every money figure is converted at, and the folder on disk where the
 * whole thing is backed up.
 */

const RATE_PROMPT = `What is the current USD to Iranian rial (IRR) rate on the free market today?
Search for the latest rate and answer with a single number: the number of rials per 1 US dollar.
Also tell me the date you found it. Reply in one line, like: 1 USD = 1,042,000 IRR (May 12, 2026).`;

interface SettingsViewProps {
  state: AppState;
  sync: SyncStatus;
  onSetRate: (rate: number, meta?: { source?: string; live?: boolean }) => void;
  onSetPrefs: (patch: Partial<AppState["prefs"]>) => void;
  onConnectFolder: () => void;
  onReconnectFolder: () => void;
  onDisconnectFolder: () => void;
  onLoadFromFolder: () => void;
  onReplaceState: (next: AppState) => void;
  onUpsertPlatform: (platform: Platform) => void;
  onSetPlatformColor: (id: string, color: string, name: string) => void;
  onRemoveCustomPlatform: (id: string) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  sync,
  onSetRate,
  onSetPrefs,
  onConnectFolder,
  onReconnectFolder,
  onDisconnectFolder,
  onLoadFromFolder,
  onReplaceState,
  onUpsertPlatform,
  onSetPlatformColor,
  onRemoveCustomPlatform,
  toast,
}) => {
  const [rateInput, setRateInput] = useState(String(state.toman.rialPerUsd));
  const [checking, setChecking] = useState(false);
  const [quote, setQuote] = useState<RateResult | null>(null);
  /** Sources that have not answered yet, so the panel can say so instead of looking stuck. */
  const [waiting, setWaiting] = useState<{ id: string; label: string }[]>([]);
  const [newPlatform, setNewPlatform] = useState({ name: "", color: "#7A5CFF", emoji: "🟣", commission: "15" });
  const rate = state.toman.rialPerUsd;

  const platforms = useMemo(() => allPlatforms(state.customPlatforms), [state.customPlatforms]);
  const jsonSize = useMemo(() => stateSizeLabel(JSON.stringify(state)), [state]);
  const totalEarnings = state.tutors.reduce((a, t) => a + t.snapshots.reduce((b, s) => b + s.earningsUsd, 0), 0);

  const applyRate = () => {
    const cleaned = parseFloat(rateInput.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(cleaned) || cleaned <= 0) {
      toast("That does not look like a rate. Paste a number such as 1,042,000.", "error");
      return;
    }
    onSetRate(cleaned, { source: "you", live: false });
    toast(`Rate set to ${num(cleaned)} rial per dollar — every figure in the app just updated.`);
  };

  /**
   * Ask every provider at once and show exactly what each one said.
   *
   * The panel is painted from each answer as it lands rather than once at the end: the
   * free-market rate normally arrives in about 1.5 s, while a relay for the second tgju
   * host can take 20 s or fail. Waiting for the slowest source before showing the good
   * number is what made this look broken.
   */
  const checkLive = async () => {
    setChecking(true);
    setQuote(null);
    setWaiting(PROVIDERS.map((p) => ({ id: p.id, label: p.label })));
    try {
      const result = await fetchLiveRate((landed: RateAttempt[], stillWaiting) => {
        setQuote({ attempts: landed, best: pickBest(landed) });
        setWaiting(stillWaiting.map((p) => ({ id: p.id, label: p.label })));
      });
      setQuote(result);
      setWaiting([]);
      if (!result.best) {
        toast("No provider answered from this browser. Type the rate from tgju.org below — it takes ten seconds.", "error");
      }
    } catch {
      toast("The rate check failed. Type the number from tgju.org below.", "error");
      setWaiting([]);
    } finally {
      setChecking(false);
    }
  };

  const useQuote = () => {
    if (!quote?.best) return;
    onSetRate(quote.best.rialPerUsd, { source: quote.best.label, live: true });
    setRateInput(String(quote.best.rialPerUsd));
    toast(`Live rate applied from ${quote.best.label} — 1 USD = ${num(tomanPerUsd(quote.best.rialPerUsd))} Toman.`);
  };

  return (
    <div className="space-y-5">
      <SectionTitle icon="⚙️" title="Settings" sub="The rate, the platforms, and where your data lives." />

      {/* Toman */}
      <Card>
        <SectionTitle
          icon="🇮🇷"
          title="Toman economy"
          sub="Every dollar figure in the app is shown next to its Toman equivalent at this rate."
          right={
            <div className="flex flex-wrap gap-2">
              <Btn onClick={checkLive} disabled={checking}>
                {checking ? "⏳ Checking…" : "🔄 Check the live rate"}
              </Btn>
              <Btn
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(RATE_PROMPT);
                  toast("Prompt copied — paste it into your AI and type the number it gives you below.", "info");
                }}
              >
                📋 Copy the rate-lookup prompt
              </Btn>
            </div>
          }
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <Field
              label="Rials per US dollar"
              hint="The free-market rate, not the official one. Toman is shown as rials ÷ 10."
            >
              <input className={inputClass} value={rateInput} onChange={(e) => setRateInput(e.target.value)} placeholder="1,042,000" />
            </Field>
            <div className="flex gap-2">
              <Btn onClick={applyRate}>Update the rate everywhere</Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  setRateInput(String(DEFAULT_RIAL_PER_USD));
                  onSetRate(DEFAULT_RIAL_PER_USD);
                  toast("Reset to the placeholder rate — set the real one when you have it.", "info");
                }}
              >
                Reset to placeholder
              </Btn>
            </div>
            <p className="text-[12px] leading-relaxed text-[#121118]/82">
              <b>Check the live rate</b> asks three sources at once — the free-market dollar from tgju.org on both of its
              hosts, plus an aggregated reference — and shows what every one of them answered. Nothing is applied until
              you choose it, because a number that changes under your feet makes last month's figures look wrong.
              tgju.org's first host holds the same document but refuses browser reads, so that one is fetched through a
              relay, and the app says so. When no provider is reachable, copy the prompt, ask your AI, and type the
              number here — that always works.
            </p>

            {quote && (
              <div className="rounded-2xl border border-black/16 p-3">
                {quote.best ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">
                          {num(tomanPerUsd(quote.best.rialPerUsd))} Toman = 1 USD{" "}
                          <Pill tone={quote.best.kind === "market" ? "#10B981" : "#F59E0B"}>{rateKindLabel(quote.best.kind)}</Pill>
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#121118]/85">
                          {quote.best.label}
                          {quote.best.viaProxy ? " · came through a relay" : ""} · read just now
                        </p>
                      </div>
                      <Btn onClick={useQuote}>✅ Use this rate</Btn>
                    </div>
                    {quote.best.kind === "reference" && (
                      <p className="mt-2 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-800">
                        Only an aggregated reference answered. It reads well below the free market, so the Toman figures
                        will look low — check tgju.org before applying it.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs font-semibold text-[#121118]/91">
                    No source answered from this browser. Copy the prompt, or open tgju.org and type the number below.
                  </p>
                )}

                <div className="mt-3">
                  <Disclosure title="What every source answered">
                    <ul className="space-y-1.5">                          {quote.attempts.map((a) => (
                            <li key={a.id} className="flex flex-wrap items-center gap-2 text-[12px]">
                              <span>{a.ok ? "✅" : "⚠️"}</span>
                              <b className="text-[#121118]/94">{a.label}</b>
                              <span className="text-[#121118]/85">
                                {a.ok && a.rialPerUsd
                                  ? `${num(tomanPerUsd(a.rialPerUsd))} Toman${a.viaProxy ? " (via relay)" : ""}`
                                  : a.error}
                              </span>
                              <span className="ml-auto tabular-nums text-[#121118]/76">{a.ms} ms</span>
                            </li>
                          ))}
                          {waiting.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-2 text-[12px]">
                              <span>⏳</span>
                              <b className="text-[#121118]/94">{p.label}</b>
                              <span className="text-[#121118]/85">still asking…</span>
                            </li>
                          ))}
                    </ul>
                    <p className="mt-2 text-[12px] text-[#121118]/82">
                      A rate quoted by an exchange tracks the free market. An aggregated reference does not, so it never
                      overwrites your number on its own — not even with “refresh on open” switched on. Both are shown here,
                      and you choose.
                    </p>
                    <a href={TGJU_URL} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] font-semibold text-[#FF79AC]">
                      Check the number yourself on tgju.org ↗
                    </a>
                  </Disclosure>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <Stat
              label="Rate on file"
              value={`${num(rate)} rial`}
              sub={`1 USD = ${num(rate / 10)} Toman · ${state.toman.source === "you" || !state.toman.source ? "typed by you" : state.toman.source} · ${relativeDate(state.toman.updatedAt)}`}
              icon={state.toman.live ? "📡" : "✍️"}
            />
            <Stat label="$100 becomes" value={toman(100, rate, { compact: false })} sub={usd(100)} />
            <Stat label="Roster lifetime earnings" value={usd(totalEarnings)} sub={toman(totalEarnings, rate)} />
          </div>
        </div>
      </Card>

      {/* Behavior */}
      <Card>
        <SectionTitle
          icon="🎛️"
          title="How the app behaves"
          sub="Two switches that change how conversations and the rate are handled."
        />
        <div className="space-y-2">
          {[
            {
              key: "keepRawLogs" as const,
              title: "Keep the original chat text",
              detail:
                "Off by default: the clean version the AI writes is the log. Turn this on and the pasted conversation is stored with the entry too, so you can re-read the exact words in a year.",
            },
            {
              key: "autoRateRefresh" as const,
              title: "Refresh the Toman rate when I open the app",
              detail:
                "Checks a free-market source once per open when the rate on file is more than half a day old, and tells you when it changes it. A rate you typed by hand is never replaced unless a live source answers.",
            },
          ].map((row) => (
            <label key={row.key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/12 p-3 hover:border-black/22">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[#FF79AC]"
                checked={state.prefs[row.key]}
                onChange={(e) => {
                  onSetPrefs({ [row.key]: e.target.checked });
                  toast(`${row.title} ${e.target.checked ? "on" : "off"}.`, "info");
                }}
              />
              <span>
                <span className="block text-sm font-bold">{row.title}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-[#121118]/86">{row.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Platforms */}
      <Card>
        <SectionTitle
          icon="🎨"
          title="Platforms and their colors"
          sub="Each platform carries its brand color into the cards, chips and glows. Two of these are published brand codes; the rest come from each site's own interface, so correct any that look off."
        />
        <div className="space-y-2">
          {platforms.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/12 p-3">
              {/* The platform's own logo, not a guessed symbol. Built-ins carry their
                  favicon inlined, so this renders with no network; the emoji is only the
                  fallback when an image cannot load. */}
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${p.color}22` }}>
                <PlatformMark platform={p} size={26} />
              </span>
              <div className="min-w-[140px] flex-1">
                <p className="text-sm font-bold">{p.name}</p>
                <p className="text-[13px] text-[#121118]/91" title={p.colorSource}>
                  {p.colorSource} · commission {Math.round((p.commission || 0) * 100)}%
                </p>
              </div>
              <input
                type="color"
                aria-label={`${p.name} color`}
                value={p.color}
                onChange={(e) => {
                  onSetPlatformColor(p.id, e.target.value, p.name);
                  toast(`${p.name} color updated.`);
                }}
                className="h-9 w-14 cursor-pointer rounded-lg border border-black/16 bg-white"
              />
              <code className="text-[13px] text-[#121118]/91">{p.color}</code>
              {/* The logo URL is editable, the same way the color is: point it at any
                  image of the brand and the app uses it everywhere. */}
              <input
                className={`${inputClass} max-w-[240px] flex-1 text-[13px]`}
                aria-label={`${p.name} logo URL`}
                value={p.logoUrl?.startsWith("data:") ? "" : p.logoUrl ?? ""}
                placeholder={p.logoUrl?.startsWith("data:") ? "built-in logo (paste a URL to replace)" : "https://…/logo.png"}
                onChange={(e) => onUpsertPlatform({ ...p, logoUrl: e.target.value })}
                title="Paste an image URL to use your own logo for this platform"
              />
              {p.logoUrl?.startsWith("data:") && (
                <span className="text-[13px] font-semibold text-[#121118]/91">built-in logo</span>
              )}
              {p.custom && !BUILTIN_PLATFORMS.some((b) => b.id === p.id) && (
                <Btn size="sm" variant="ghost" onClick={() => onRemoveCustomPlatform(p.id)}>
                  🗑
                </Btn>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-black/22 p-3">
          <p className="mb-2 text-sm font-bold">Add a platform</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Name">
              <input className={inputClass} value={newPlatform.name} onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })} placeholder="Cambly" />
            </Field>
            <Field label="Emoji">
              <input className={inputClass} value={newPlatform.emoji} onChange={(e) => setNewPlatform({ ...newPlatform, emoji: e.target.value })} />
            </Field>
            <Field label="Color">
              <input type="color" className="h-10 w-full rounded-xl border border-black/16" value={newPlatform.color} onChange={(e) => setNewPlatform({ ...newPlatform, color: e.target.value })} />
            </Field>
            <Field label="Commission %">
              <input className={inputClass} value={newPlatform.commission} onChange={(e) => setNewPlatform({ ...newPlatform, commission: e.target.value })} />
            </Field>
          </div>
          <Btn
            className="mt-3"
            onClick={() => {
              if (!newPlatform.name.trim()) {
                toast("Give the platform a name first.", "error");
                return;
              }
              const id = newPlatform.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
              onUpsertPlatform({
                id,
                name: newPlatform.name.trim(),
                color: newPlatform.color,
                colorSource: "Set by you",
                emoji: newPlatform.emoji || "🟣",
                commission: Math.max(0, Math.min(1, parseFloat(newPlatform.commission) / 100 || 0)),
                signupUrl: "",
                rules: [],
                accountFields: [],
                logoUrl: "",
                custom: true,
              });
              toast(`${newPlatform.name} added — it now appears everywhere platforms do.`);
              setNewPlatform({ name: "", color: "#7A5CFF", emoji: "🟣", commission: "15" });
            }}
          >
            ＋ Add platform
          </Btn>
          <p className="mt-2 text-[12px] text-[#121118]/82">
            A custom platform starts with no rules and no field list. Add its rules on the Status tab of any tutor once you
            know them — until then the prompts keep content free of contact details and free-lesson offers.
          </p>
        </div>
      </Card>

      {/* Storage */}
      <Card>
        <SectionTitle icon="💾" title="Where your data lives" sub="Nothing here leaves your machine. Two copies exist: this browser, and a JSON file in a folder you choose." />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-2xl border border-black/12 p-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${sync.permission === "granted" ? "bg-emerald-500" : "bg-slate-400"}`} />
                <p className="text-sm font-bold">
                  {sync.folderName ? `Folder: ${sync.folderName}` : "No folder connected"}
                </p>
              </div>
              <p className="mt-1 text-xs text-[#121118]/86">
                {sync.permission === "granted"
                  ? `Automatic saving is on. Last written ${sync.lastWriteAt ? relativeDate(sync.lastWriteAt) : "—"} to ${sync.lastFile ?? "tutorly-advisor-data.json"}.`
                  : sync.permission === "none"
                    ? folderSyncSupported()
                      ? "Connect a folder (a OneDrive or Dropbox folder works well) and every change is written into tutorly-advisor-data.json automatically."
                      : "This browser has no folder API. Use Export below — Chrome, Edge, Brave and Opera support the folder."
                    : "The folder needs permission again. Press Reconnect — the browser only asks after a click, by design."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!sync.folderName && folderSyncSupported() && <Btn size="sm" onClick={onConnectFolder}>📁 Choose a folder</Btn>}
                {sync.folderName && sync.permission !== "granted" && <Btn size="sm" onClick={onReconnectFolder}>🔌 Reconnect</Btn>}
                {sync.folderName && <Btn size="sm" variant="outline" onClick={onLoadFromFolder}>📥 Load the file from the folder</Btn>}
                {sync.folderName && <Btn size="sm" variant="danger" onClick={onDisconnectFolder}>Stop syncing</Btn>}
              </div>
              {sync.sharedWithMainApp && (
                <p className="mt-2 text-[12px] text-emerald-700">
                  🔗 Shared with your tutor app: this folder holds both this file and the tutor app's backup, so
                  one restore brings back everything. Each app only ever writes its own file here.
                </p>
              )}
              {sync.folderName && !sync.sharedWithMainApp && (
                <p className="mt-2 text-[12px] text-[#121118]/82">
                  Tip: pointing this at your tutor app's backup folder keeps everything in one place — neither app
                  overwrites the other's file.
                </p>
              )}
              {sync.error && <p className="mt-2 text-[12px] text-amber-700">{sync.error}</p>}
            </div>

            <div className="rounded-2xl border border-black/12 p-3">
              <p className="text-sm font-bold">This browser</p>
              <p className="mt-1 text-xs text-[#121118]/86">
                {state.tutors.length} tutor{state.tutors.length === 1 ? "" : "s"} · {jsonSize} of data · saved locally on
                every change.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Btn variant="outline" className="w-full" onClick={() => { downloadJson(state); toast("Backup downloaded."); }}>
              📤 Export everything as JSON
            </Btn>
            {/* Two exports, two jobs: the JSON is the backup that comes back in here,
                the workbook is the roster a mentor can sort, filter and send on. */}
            <Btn
              variant="outline"
              className="w-full"
              onClick={() => {
                const { rows, sheets } = downloadSpreadsheet(state);
                toast(`Excel workbook downloaded: ${rows.toLocaleString("en-US")} rows across ${sheets} sheets.`);
              }}
            >
              📊 Export everything as Excel (.xlsx)
            </Btn>
            <p className="text-[12px] leading-relaxed text-[#121118]/88">
              Nine sheets, one per kind of fact: a summary of the whole roster, the roster with each tutor's status,
              a <b>Not active</b> sheet straight after it (everyone waiting, preparing or passive, longest on the
              roster first, with the reason you wrote on each tutor's Comments tab),
              weekly numbers, audits, goals and the 90-day plan, follow-ups, reminders and every conversation. It opens
              in Excel, Numbers, Google Sheets and LibreOffice. Use this to sort, filter or hand the roster to someone;
              use the JSON above to bring it all back in here.
            </p>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/16 bg-white px-4 py-2 text-sm font-semibold hover:border-black/34">
              📥 Import a JSON backup
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const loaded = await readJsonFile(file);
                    if (!window.confirm(`Replace everything with ${loaded.tutors.length} tutors from "${file.name}"?`)) return;
                    await onReplaceState(loaded);
                    toast(`Imported ${loaded.tutors.length} tutors.`);
                  } catch {
                    toast("That file could not be read as a backup.", "error");
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <div className="rounded-2xl bg-black/[0.05] p-3 text-[12px] leading-relaxed text-[#121118]/86">
              The export is the complete state: every tutor, their account content, every week logged, every conversation
              analysis, avatars, your platform colors and the Toman rate (with the date it was set). Import it on another
              machine and you are exactly where you left off.
            </div>
            <Disclosure title="Advanced: start over">
              <p className="mb-2 text-[12px] text-[#121118]/86">
                This deletes every tutor from this browser and from the connected folder on the next save. Export first.
              </p>
              <Btn
                size="sm"
                variant="danger"
                onClick={() => {
                  if (!window.confirm("Delete every tutor and reset the app? This cannot be undone.")) return;
                  if (!window.confirm("Really delete everything, including your tasks and reminders? Export a backup first if you are not sure.")) return;
                  onReplaceState({
                    version: state.version,
                    tutors: [],
                    // Tasks are part of "everything": leaving them behind would keep nudging
                    // about tutors who no longer exist in the app.
                    tasks: [],
                    customPlatforms: [],
                    toman: { rialPerUsd: rate, updatedAt: new Date().toISOString(), source: state.toman.source, live: state.toman.live },
                    prefs: state.prefs,
                  });
                  toast("Everything cleared.", "info");
                }}
              >
                Delete all data
              </Btn>
            </Disclosure>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="📖" title="How the AI side works" sub="No keys, no server, no per-request cost." />
        <ul className="space-y-2 text-xs text-[#121118]/90">
          <li>• Every AI task is a prompt you copy into the assistant you already pay for — the app assembles it from this tutor's real data so you never retype anything.</li>
          <li>• You paste the JSON answer back and the app tells you what it understood before saving anything.</li>
          <li>• The prompts ask the assistant to search the web — reddit.com/r/Preply, the platform's help center, recent tutor reports — and to list its sources, which are kept with the audit.</li>
          <li>• Whatever the assistant sends is read tolerantly: an object where a string was expected, an array of plain strings for the video scripts, an extra key — none of it is dropped or crashes the app.</li>
        </ul>
        <p className="mt-3 text-[12px] text-[#121118]/78">
          Built for a mentor, not a marketplace. {state.tutors.length ? `${state.tutors.length} tutors under your wing.` : ""}
        </p>
      </Card>
    </div>
  );
};

export default SettingsView;
