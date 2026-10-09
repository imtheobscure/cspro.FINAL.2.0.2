import React, { useMemo, useState } from "react";
import Shell, { type NavItem, type ViewId } from "./components/Shell";
import PromptModal from "./components/PromptModal";
import { ToastHost } from "./components/ui";
import { useAppState } from "./lib/useAppState";
import { allNudges, newLog, newSnapshot, newTutor, phaseMeta } from "./lib/domain";
import { normalizeConversations, normalizeRoster, normalizeSnapshot, unplacedNames, weekStart } from "./lib/normalize";
import { pepTalkPrompt, rosterCommsPrompt, rosterImportPrompt, weeklyReportPrompt } from "./lib/prompts";
import { allPlatforms, tutorPlatforms } from "./lib/platforms";
import type { Platform, Tutor } from "./types";
import BoardView from "./views/BoardView";
import LeaderboardView from "./views/LeaderboardView";
import InsightsView from "./views/InsightsView";
import PortfolioView from "./views/PortfolioView";
import SettingsView from "./views/SettingsView";
import TutorView from "./views/TutorView";

/**
 * The mentor console.
 *
 * Three screens over one board — the phase board, the leaderboard, insights — plus a
 * tutor profile behind each card. The three global prompts live here because they work
 * on the *whole roster* at once: the spreadsheet import, the weekly numbers drop, and
 * the daily pep talk. Everything else is per tutor, inside their profile.
 */
export default function App() {
  const app = useAppState();
  const [view, setView] = useState<ViewId>("board");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [pepOpen, setPepOpen] = useState(false);
  const [commsOpen, setCommsOpen] = useState(false);

  const { state, tutors, customPlatforms, toman, toast } = app;
  const current = currentId ? app.tutorById.get(currentId) : undefined;
  /* The badge counts the mentor's own due tasks too — a reminder you wrote is not a
     lesser thing than one the engine noticed, so it gets the same treatment. */
  const urgent = useMemo(
    () => allNudges(tutors, state.tasks).filter((n) => n.severity === "urgent").length,
    [tutors, state.tasks],
  );

  const nav: NavItem[] = [
    { id: "board", label: "Tutor board", icon: "🗂️" },
    { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
    { id: "insights", label: "Insights", icon: "🔔", badge: urgent || undefined },
    /* The portfolio sits between Insights and Settings on purpose: it is the summary
       screen — every status at once with the roster rolled up — so it belongs next to
       the other two "look at the whole book" views and above the configuration. */
    { id: "portfolio", label: "Portfolio", icon: "📚" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  const actions = [
    { label: "Add tutors", icon: "👥", onClick: () => setRosterOpen(true), primary: tutors.length === 0 },
    { label: "Weekly update", icon: "📊", onClick: () => setWeeklyOpen(true) },
    { label: "Daily pep talk", icon: "☀️", onClick: () => setPepOpen(true) },
  ];

  const openTutor = (id: string) => {
    setCurrentId(id);
    setView("tutor");
  };

  const platforms = useMemo(() => allPlatforms(customPlatforms), [customPlatforms]);

  /* Rebuilt only when the roster itself changes — see the note on the Update All modal. */
  const commsPrompt = useMemo(() => rosterCommsPrompt(tutors), [tutors]);

  /** Roster rows → tutors, skipping anyone already on the roster. */
  const importRoster = (rows: ReturnType<typeof normalizeRoster>): string => {
    const existing = new Set(
      tutors
        .flatMap((t) => [
          t.name.toLowerCase().trim(),
          t.latinName.toLowerCase().trim(),
          t.phone.replace(/\D/g, ""),
        ])
        .filter(Boolean),
    );
    const fresh = rows.filter((r) => {
      // Both spellings are identity: a spreadsheet in Farsi and one in Latin letters are
      // the same person, and importing the second must not add a duplicate.
      const nameKey = r.name.toLowerCase().trim();
      const latinKey = r.latinName.toLowerCase().trim();
      const phoneKey = r.phone.replace(/\D/g, "");
      if (existing.has(nameKey) || (latinKey && existing.has(latinKey)) || (phoneKey && existing.has(phoneKey))) return false;
      existing.add(nameKey);
      if (latinKey) existing.add(latinKey);
      if (phoneKey) existing.add(phoneKey);
      return true;
    });
    if (!fresh.length) return "Everyone in that answer is already on the roster.";

    const created = fresh.map((r, i) =>
      newTutor({
        name: r.name,
        latinName: r.latinName,
        phone: r.phone,
        country: r.country,
        startedAt: r.startedAt || new Date().toISOString().slice(0, 10),
        platformId: resolvePlatformId(r.platformId, platforms),
        platformIds: (r.platformIds.length ? r.platformIds : [r.platformId])
          .map((id) => resolvePlatformId(id, platforms))
          .filter(Boolean),
        phase: (["preparing", "waiting", "active", "passive"] as const).includes(r.phase as never)
          ? (r.phase as Tutor["phase"])
          : "preparing",
        phaseSince: r.startedAt || new Date().toISOString().slice(0, 10),
        tags: r.notes ? [r.notes] : [],
        id: `t_${Date.now().toString(36)}_${i}`,
      }),
    );
    app.addTutors(created);
    return `${created.length} tutor${created.length === 1 ? "" : "s"} added${rows.length !== fresh.length ? `, ${rows.length - fresh.length} skipped as already on the roster` : ""}.`;
  };

  /**
   * The roster-wide sweep: one answer, one entry per tutor.
   *
   * Three things this deliberately does NOT do. It does not apply profile changes — the
   * chat export is not the place to silently move thirty people's phases and prices, and
   * the prompt tells the AI not to propose any. It does not create a log entry with an
   * empty summary, because an empty timeline entry is worse than a missing one. And it
   * does not swallow a name it could not place: those come back in the toast, with the
   * roster and the chat spelling side by side, so a mismatch is visible immediately
   * rather than showing up as a conversation that quietly never arrived.
   *
   * Follow-ups ride along inside the log entry, which is what the Communication tab and
   * the nudges both read — so "agree a rebooking plan by Thursday" becomes a real reminder
   * without a second step.
   */
  const applyConversations = (parsed: unknown): string => {
    const rows = normalizeConversations(parsed);
    if (!rows.length) {
      throw new Error('That answer needs a "conversations" array with one entry per tutor.');
    }

    const applied: string[] = [];
    const unmatched: string[] = [];
    const empty: string[] = [];
    const alreadyLogged: string[] = [];

    for (const row of rows) {
      const summary = (row.log.summary ?? "").trim();
      const match =
        matchTutor(tutors, row.name) ?? (row.matchedAs ? matchTutor(tutors, row.matchedAs) : undefined);
      if (!match) {
        unmatched.push(`${row.name}${row.matchedAs ? ` (seen as “${row.matchedAs}”)` : ""}`);
        continue;
      }
      if (!summary) {
        empty.push(match.name);
        continue;
      }
      /*
       * Applying the same answer twice must not write the same conversation twice. The
       * mentor will re-run this after adding one more tutor to the export, and the whole
       * export comes back — so the check is on the summary, which is the write-up itself.
       */
      if (match.logs.some((l) => l.summary.trim() === summary)) {
        alreadyLogged.push(match.name);
        continue;
      }

      const at = row.date ? new Date(`${row.date}T12:00:00`).toISOString() : undefined;
      const entry = newLog({ ...row.log, ...(at ? { at } : {}), kind: "chat" });
      app.patchTutor(match.id, { logs: [...match.logs, entry] });
      applied.push(match.name);
    }

    const ambiguous = unplacedNames(parsed, "ambiguous");
    const offRoster = unplacedNames(parsed, "notOnRoster");

    return [
      applied.length
        ? `Logged a conversation for ${applied.length} tutor${applied.length === 1 ? "" : "s"}: ${applied.slice(0, 5).join(", ")}${applied.length > 5 ? `, +${applied.length - 5} more` : ""}`
        : "Nothing was written — see below.",
      alreadyLogged.length ? `Already logged, skipped: ${alreadyLogged.join(", ")}` : "",
      empty.length ? `Found but nothing to write up (the chat was empty): ${empty.join(", ")}` : "",
      unmatched.length ? `Could not match to anyone on the roster: ${unmatched.join("; ")}` : "",
      ambiguous.length ? `The AI would not guess: ${ambiguous.join("; ")} — tell it which tutor, or log those one at a time.` : "",
      offRoster.length ? `In the export but not on your roster: ${offRoster.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const applyWeekly = (parsed: unknown): string => {
    const root = (parsed ?? {}) as Record<string, unknown>;
    const week = typeof root.weekOf === "string" && root.weekOf ? root.weekOf : weekStart();
    const updates = Array.isArray(root.updates) ? (root.updates as Record<string, unknown>[]) : [];
    if (!updates.length) throw new Error('That answer needs an "updates" array with one entry per tutor.');

    const applied: string[] = [];
    const unmatched: string[] = [];
    for (const update of updates) {
      const name = String(update?.name ?? "").trim();
      if (!name) continue;
      const match = matchTutor(tutors, name);
      if (!match) {
        unmatched.push(name);
        continue;
      }
      const patch = normalizeSnapshot(update, week);
      const snapshot = newSnapshot({ ...patch, weekOf: patch.weekOf || week });
      app.addSnapshot(match.id, snapshot);
      applied.push(`${match.name} ${snapshot.earningsUsd ? `$${snapshot.earningsUsd}` : "(0)"}`);
    }

    const insights = Array.isArray(root.insights) ? root.insights.map(String) : [];
    return [
      `Updated ${applied.length} tutor${applied.length === 1 ? "" : "s"} for the week of ${week}${applied.length ? `: ${applied.slice(0, 4).join(", ")}${applied.length > 4 ? "…" : ""}` : ""}`,
      unmatched.length ? `Could not match: ${unmatched.join(", ")} — add them to the roster or fix the name.` : "",
      insights.length ? `Insights saved in the log:\n${insights.slice(0, 3).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const applyPepTalk = (parsed: unknown): string => {
    const root = (parsed ?? {}) as Record<string, unknown>;
    const talks = Array.isArray(root.talks) ? (root.talks as Record<string, unknown>[]) : [];
    if (!talks.length) throw new Error('That answer needs a "talks" array.');
    let count = 0;
    const unmatched: string[] = [];
    for (const talk of talks) {
      const name = String(talk?.name ?? "").trim();
      const message = String(talk?.message ?? "").trim();
      if (!name || !message) continue;
      const match = matchTutor(tutors, name);
      if (!match) {
        unmatched.push(name);
        continue;
      }
      count += 1;
      app.updateTutor(match.id, (t) => ({
        ...t,
        messages: [
          ...t.messages,
          {
            id: `m_${Date.now().toString(36)}_${count}`,
            at: new Date().toISOString(),
            tone: "pep",
            occasion: "Daily pep talk",
            text: message,
          },
        ],
      }));
    }
    return `Saved a pep talk for ${count} tutor${count === 1 ? "" : "s"}${unmatched.length ? ` · could not match ${unmatched.join(", ")}` : ""}.`;
  };

  /**
   * The roster, reduced to what the header search needs.
   *
   * Built here rather than inside the shell so a person is searchable by anything the
   * mentor would type: both name spellings, phone, tags, and every platform they work on.
   */
  const searchablePeople = useMemo(
    () =>
      tutors.map((t) => ({
        id: t.id,
        name: t.name,
        latinName: t.latinName,
        phone: t.phone,
        tags: t.tags,
        platformNames: tutorPlatforms(t, customPlatforms).map((p) => p.name),
        phaseLabel: phaseMeta(t.phase).short,
        phaseColor: phaseMeta(t.phase).color,
      })),
    [tutors, customPlatforms],
  );

  /** The header's refresh: ask the providers and report what happened, in one toast. */
  const refreshRateFromHeader = async () => {
    try {
      const result = await app.checkRate({ apply: true });
      if (result.applied) {
        toast(`Rate updated from ${result.label}: 1 USD = ${Math.round(result.applied / 10).toLocaleString("en-US")} Toman.`);
      } else {
        toast("No free-market source answered just now. Open Settings to see what each one said.", "error");
      }
      return result;
    } catch {
      toast("The rate check failed. Open Settings to see the details.", "error");
      return { attempts: [] };
    }
  };

  return (
    <>
      <Shell
        view={view}
        onNavigate={setView}
        nav={nav}
        sync={app.sync}
        actions={actions}
        people={searchablePeople}
        onOpenPerson={openTutor}
        rate={{
          rialPerUsd: toman.rialPerUsd,
          source: toman.source,
          live: toman.live,
          updatedAt: toman.updatedAt,
        }}
        onRefreshRate={refreshRateFromHeader}
      >
        {view === "board" && (
          <BoardView
            tutors={tutors}
            tasks={state.tasks}
            customPlatforms={customPlatforms}
            rialPerUsd={toman.rialPerUsd}
            onOpenTutor={openTutor}
            onAddTask={app.addTask}
            onToggleTask={app.toggleTask}
            onDeleteTask={app.deleteTask}
            onSetPhase={app.setPhase}
            onAddTutor={(partial) => {
              const t = app.addManualTutor(partial);
              openTutor(t.id);
            }}
            onOpenRosterImport={() => setRosterOpen(true)}
            onOpenRosterComms={() => setCommsOpen(true)}
            onDelete={app.deleteTutor}
            toast={toast}
          />
        )}

        {view === "leaderboard" && (
          <LeaderboardView tutors={tutors} customPlatforms={customPlatforms} rialPerUsd={toman.rialPerUsd} onOpenTutor={openTutor} />
        )}

        {view === "insights" && (
          <InsightsView
            tutors={tutors}
            tasks={state.tasks}
            customPlatforms={customPlatforms}
            rialPerUsd={toman.rialPerUsd}
            onOpenTutor={openTutor}
            onToggleTask={app.toggleTask}
            onDeleteTask={app.deleteTask}
            onPepTalk={() => setPepOpen(true)}
            onWeeklyUpdate={() => setWeeklyOpen(true)}
          />
        )}

        {view === "portfolio" && (
          <PortfolioView
            tutors={tutors}
            customPlatforms={customPlatforms}
            rialPerUsd={toman.rialPerUsd}
            onOpenTutor={openTutor}
            onSetPhase={(id, next) => app.setPhase(id, next)}
            toast={toast}
          />
        )}

        {view === "settings" && (
          <SettingsView
            state={state}
            sync={app.sync}
            onSetRate={app.setRate}
            onSetPrefs={app.setPrefs}
            onConnectFolder={app.connectFolder}
            onReconnectFolder={app.reconnect}
            onDisconnectFolder={app.disconnectFolder}
            onLoadFromFolder={app.loadFromFolder}
            onReplaceState={app.replaceState}
            onUpsertPlatform={app.upsertPlatform}
            onSetPlatformColor={app.setPlatformColor}
            onRemoveCustomPlatform={app.removeCustomPlatform}
            toast={toast}
          />
        )}

        {view === "tutor" &&
          (current ? (
            <TutorView
              tutor={current}
              customPlatforms={customPlatforms}
              rialPerUsd={toman.rialPerUsd}
              onBack={() => setView("board")}
              keepRawLogs={state.prefs.keepRawLogs}
              onDelete={(id) => {
                app.deleteTutor(id);
                setView("board");
              }}
              update={(updater) =>
                app.updateTutor(current.id, (t) => {
                  const next = updater(t);
                  return { ...next, updatedAt: new Date().toISOString() };
                })
              }
              toast={toast}
            />
          ) : (
            <p className="rounded-3xl bg-white p-6 text-sm text-[#121118]/86">
              That tutor is no longer on the roster.{" "}
              <button className="font-semibold text-[#FF79AC]" onClick={() => setView("board")}>
                Back to the board
              </button>
            </p>
          ))}
      </Shell>

      <PromptModal
        open={rosterOpen}
        onClose={() => setRosterOpen(false)}
        title={rosterImportPrompt(allPlatforms(customPlatforms).map((p) => p.id)).title}
        purpose={rosterImportPrompt(allPlatforms(customPlatforms).map((p) => p.id)).purpose}
        prompt={rosterImportPrompt(allPlatforms(customPlatforms).map((p) => p.id)).prompt}
        schema={rosterImportPrompt(allPlatforms(customPlatforms).map((p) => p.id)).schema}
        summarize={(parsed) => {
          const rows = normalizeRoster(parsed);
          return rows.length
            ? `${rows.length} tutor${rows.length === 1 ? "" : "s"}: ${rows.slice(0, 5).map((r) => r.name).join(", ")}${rows.length > 5 ? "…" : ""}\nStart dates and phones are kept exactly as the sheet had them.`
            : "No tutor rows found in that answer.";
        }}
        onApply={(parsed) => {
          const rows = normalizeRoster(parsed);
          if (!rows.length) throw new Error("No tutor rows found. Make sure the spreadsheet was attached and the reply is the roster JSON.");
          const summary = importRoster(rows);
          toast(summary);
        }}
      >
        <div className="rounded-2xl border border-[#FF79AC]/20 bg-[#FF79AC]/[0.06] p-3 text-xs text-[#121118]/91">
          <b>Attach your spreadsheet to the chat before you send the prompt.</b> The assistant reads the columns, works out
          which one is the name, which is the phone and which is the start date, and returns one JSON block. You paste that
          block below and every tutor lands on the board at once — names, phone numbers, start dates and platform.
        </div>
      </PromptModal>

      {/*
        * Update All — the roster-wide message sweep.
        *
        * Built once per roster change rather than four times per render like the other
        * prompts: this one embeds every tutor's name, both spellings, phone number,
        * platforms and facts, so it is the one prompt in the app whose size grows with the
        * roster and is worth not rebuilding on every keystroke elsewhere on the page.
        */}
      <PromptModal
        open={commsOpen}
        onClose={() => setCommsOpen(false)}
        title={commsPrompt.title}
        purpose={commsPrompt.purpose}
        prompt={commsPrompt.prompt}
        schema={commsPrompt.schema}
        howItWorks="Copy the prompt → paste it into your own AI → then attach or paste the chat export in the same chat → it replies with one JSON block for the whole roster → paste that here and Apply. Nothing is saved until you apply."
        summarize={(parsed) => {
          const rows = normalizeConversations(parsed);
          const named = rows.filter((r) => (r.log.summary ?? "").trim());
          const ambiguous = unplacedNames(parsed, "ambiguous");
          const offRoster = unplacedNames(parsed, "notOnRoster");
          const findable = named.filter((r) => matchTutor(tutors, r.name)).length;
          return [
            `${named.length} conversation${named.length === 1 ? "" : "s"} to log · ${findable} match a tutor on your roster${findable < named.length ? `, ${named.length - findable} do not` : ""}`,
            named.slice(0, 6).map((r) => `· ${r.name}: ${(r.log.summary ?? "").slice(0, 90)}${(r.log.summary ?? "").length > 90 ? "…" : ""}`).join("\n"),
            named.length > 6 ? `… and ${named.length - 6} more` : "",
            ambiguous.length ? `Not guessed: ${ambiguous.join("; ")}` : "",
            offRoster.length ? `Not on the roster: ${offRoster.join("; ")}` : "",
            "Nothing is saved until you apply.",
          ]
            .filter(Boolean)
            .join("\n");
        }}
        onApply={(parsed) => {
          const summary = applyConversations(parsed);
          const lines = summary.split("\n");
          toast(lines[0], lines[0].startsWith("Nothing was written") ? "error" : undefined);
          /* Everything after the headline is a caveat the mentor has to see, not a detail. */
          for (const line of lines.slice(1).slice(0, 3)) toast(line, "error");
        }}
      >
        <div className="rounded-2xl border border-[#FF79AC]/20 bg-[#FF79AC]/[0.06] p-3 text-xs text-[#121118]/91">
          <b>Give the AI the chat export after the prompt, not here.</b> The prompt carries your whole roster — every name in
          both scripts, the phone numbers, the platforms and the facts you already know about each person — so the assistant
          can work out who is who in an export where the names do not look anything like each other. Attach the WhatsApp /
          Telegram / Preply export, or paste it as text, and it writes one short English entry per tutor. Nobody's phase,
          price or tags are changed by this — it only fills in the Communication tab, one tutor at a time.
        </div>
      </PromptModal>

      <PromptModal
        open={weeklyOpen}
        onClose={() => setWeeklyOpen(false)}
        title={weeklyReportPrompt(tutors, weekStart()).title}
        purpose={weeklyReportPrompt(tutors, weekStart()).purpose}
        prompt={weeklyReportPrompt(tutors, weekStart()).prompt}
        schema={weeklyReportPrompt(tutors, weekStart()).schema}
        summarize={(parsed) => {
          const root = (parsed ?? {}) as Record<string, unknown>;
          const updates = Array.isArray(root.updates) ? root.updates.length : 0;
          const missing = Array.isArray(root.missing) ? root.missing.length : 0;
          return [
            `${updates} tutor update${updates === 1 ? "" : "s"} ready to apply`,
            missing ? `${missing} name${missing === 1 ? "" : "s"} could not be matched and will be listed for you` : "",
            "Nothing is saved until you apply.",
          ]
            .filter(Boolean)
            .join("\n");
        }}
        onApply={(parsed) => {
          const summary = applyWeekly(parsed);
          toast(summary.split("\n")[0]);
          if (summary.includes("Could not match")) toast(summary.split("\n")[1], "error");
        }}
      >
        <div className="rounded-2xl border border-[#FF79AC]/20 bg-[#FF79AC]/[0.06] p-3 text-xs text-[#121118]/91">
          <b>Paste everyone's numbers into the AI, not here.</b> The prompt lists your roster so the assistant can match
          names; paste this week's figures (income, lessons, trials, students, rating, response time) into the chat in any
          format. You then paste only the JSON that comes back, and each tutor's numbers, health score, streak and alerts
          all move together.
        </div>
      </PromptModal>

      <PromptModal
        open={pepOpen}
        onClose={() => setPepOpen(false)}
        title={pepTalkPrompt(tutors).title}
        purpose={pepTalkPrompt(tutors).purpose}
        prompt={pepTalkPrompt(tutors).prompt}
        schema={pepTalkPrompt(tutors).schema}
        summarize={(parsed) => {
          const root = (parsed ?? {}) as Record<string, unknown>;
          const talks = Array.isArray(root.talks) ? root.talks.length : 0;
          return talks ? `${talks} message${talks === 1 ? "" : "s"}, one per tutor — saved to each profile's Messages tab.` : "No messages found.";
        }}
        onApply={(parsed) => {
          toast(applyPepTalk(parsed));
        }}
      />

      <ToastHost toasts={app.toasts} onDismiss={app.dismissToast} />
    </>
  );
}

/**
 * Turn whatever the spreadsheet called the platform into a real platform id.
 *
 * A sheet says "Preply", the id is `preply`, and a model may write "Amazing Talker"
 * for `amazingtalker` — none of which should end up as a mystery chip. Anything that
 * matches no known platform lands on the custom entry, where the mentor can name it
 * properly in Settings.
 */
function resolvePlatformId(raw: string, platforms: Platform[]): string {
  const key = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = key(raw || "");
  if (!wanted) return "preply";
  const hit = platforms.find((p) => key(p.id) === wanted || key(p.name) === wanted);
  return hit ? hit.id : "custom";
}

/**
 * Match a name the AI wrote back to a tutor on the roster.
 *
 * Exact first, then case-insensitive, then first name, then "contains" — the AI is
 * told the exact names, but a model that writes "Sara" where the roster says
 * "Sara Ahmadi" must not silently lose a week of numbers.
 */
/**
 * Fold a name to something comparable across scripts and spellings.
 *
 * Three normalisations, all of them load-bearing:
 *  - Persian and Arabic-Indic digits become ASCII, so a phone number written ۰۹۱۲… and one
 *    written 0912… hash the same;
 *  - Persian letters are kept, Latin letters are kept, everything else (punctuation,
 *    emoji, the decorative ZWNJ) is dropped, so "علیرضا" and "Alireza" are distinct keys
 *    but "Alireza!" and "Alireza" are the same one;
 *  - Latin diacritics are stripped, because the same name is routinely written "Rezaei",
 *    "Rezai", "Rezayi" — and less often but really, "Rezái".
 * It is deliberately NOT a transliterator: mapping Persian glyphs onto Latin here would
 * invent matches, which is exactly the mistake this whole flow has to avoid. The cross-script
 * decision belongs to the AI and to the `latinName` field; this only has to land it.
 */
const foldName = (value: string): string =>
  (value || "")
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const foldDigits = (value: string): string => (value || "").replace(/\D/g, "");

/**
 * Find the tutor a name refers to.
 *
 * The roster keeps two spellings of everyone on purpose — the original script and the
 * Latin one — so both have to be searchable, or a chat that says "Alireza Ebtehaj" would
 * never find علیرضا ابتهاج. Phone numbers are matched too, in either direction, because a
 * contact saved without a name still carries one.
 */
function matchTutor(tutors: Tutor[], name: string): Tutor | undefined {
  const target = foldName(name);
  const digits = foldDigits(name);
  if (!target && digits.length < 6) return undefined;

  /** Every spelling of one tutor that a name could legitimately match. */
  const keysOf = (t: Tutor): string[] =>
    [t.name, t.latinName].map(foldName).filter(Boolean);

  if (digits.length >= 7) {
    const byPhone = tutors.filter((t) => {
      const own = foldDigits(t.phone);
      return own.length >= 7 && (own.endsWith(digits.slice(-7)) || digits.endsWith(own.slice(-7)));
    });
    if (byPhone.length === 1) return byPhone[0];
  }

  if (!target) return undefined;

  const exact = tutors.find((t) => keysOf(t).includes(target));
  if (exact) return exact;

  /* One-word forms: "Sara" should find "سارا احمدی" only when exactly one tutor is Sara. */
  const firstWord = target.split(" ")[0];
  const byFirst = tutors.filter((t) =>
    keysOf(t).some((k) => k.split(" ")[0] === firstWord || k.split(" ").slice(-1)[0] === firstWord),
  );
  if (byFirst.length === 1) return byFirst[0];

  /* Last resort: one name contains the other, in either direction. */
  return tutors.find((t) => keysOf(t).some((k) => k.includes(target) || target.includes(k)));
}
