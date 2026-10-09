import React, { useEffect, useMemo, useRef, useState } from "react";
import { num, relativeDate } from "../lib/format";
import { tomanPerUsd } from "../lib/rates";
import type { SyncStatus } from "../lib/useAppState";

/**
 * The frame around every screen: navigation, the global actions, and the two pieces of
 * chrome the mentor should always be able to reach — whether their data is being saved to
 * disk, and the live USD→Toman rate that every money figure is converted at.
 *
 * The layout is deliberately full-bleed: a narrow margin, a slim sidebar, and no inner
 * max-width, so a 30-person roster fills the screen a mentor is actually teaching from.
 */

export type ViewId = "board" | "leaderboard" | "insights" | "portfolio" | "settings" | "tutor";

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  /** Urgent count shown as a badge. */
  badge?: number;
}

/** One row of the header search — the whole roster, reduced to what a search needs. */
export interface SearchPerson {
  id: string;
  name: string;
  latinName?: string;
  phone?: string;
  tags?: string[];
  /** Platform names, so "amazingtalker" finds everyone on it. */
  platformNames?: string[];
  phaseLabel?: string;
  phaseColor?: string;
}

export interface HeaderRate {
  rialPerUsd: number;
  source?: string;
  live?: boolean;
  updatedAt: string;
}

interface ShellProps {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  nav: NavItem[];
  sync: SyncStatus;
  children: React.ReactNode;
  /** Global actions (add tutors, weekly update, pep talk). */
  actions: { label: string; icon: string; onClick: () => void; primary?: boolean }[];
  /** Everyone on the roster, for the always-available search. */
  people: SearchPerson[];
  onOpenPerson: (id: string) => void;
  /** The rate shown in the header. */
  rate: HeaderRate;
  /** Re-check the live rate; the header button and Settings share this. */
  onRefreshRate: () => Promise<{ applied?: number; label?: string } | void> | void;
}

function StorageChip({ sync }: { sync: SyncStatus }) {
  const ok = sync.permission === "granted" && !sync.error;
  const tone = ok ? "#10B981" : sync.permission === "none" ? "#64748B" : "#F59E0B";
  const label = ok
    ? `Saved to ${sync.folderName}`
    : sync.permission === "none"
      ? "Saved in this browser"
      : "Folder needs reconnecting";
  return (
    <div className="rounded-2xl border border-black/12 bg-black/[0.05] p-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone }} />
        <p className="truncate text-xs font-bold text-[#121118]" title={sync.lastFile ?? label}>
          {label}
        </p>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-[#121118]/91">
        {ok
          ? sync.lastWriteAt
            ? `Every change written ${relativeDate(sync.lastWriteAt)}.`
            : "Every change is written to the folder automatically."
          : sync.permission === "none"
            ? "Turn on folder sync in Settings so a JSON file on your disk holds everything."
            : sync.error}
      </p>
    </div>
  );
}

/**
 * The live rate, always visible.
 *
 * It is a button, not a label: checking the rate is one of the things a mentor does while
 * looking at the numbers, and having to open Settings for it meant the number on screen
 * went stale without anyone noticing. Only a free-market quote is ever applied.
 */
function RateChip({ rate, onRefresh }: { rate: HeaderRate; onRefresh: ShellProps["onRefreshRate"] }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>("");
  const tomanValue = tomanPerUsd(rate.rialPerUsd);

  const check = async () => {
    setBusy(true);
    setNote("checking…");
    try {
      const result = await onRefresh();
      const applied = result && typeof result === "object" ? result : undefined;
      setNote(applied?.applied ? `updated from ${applied.label}` : "no free-market source answered");
    } catch {
      setNote("the check failed");
    } finally {
      setBusy(false);
      window.setTimeout(() => setNote(""), 6000);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-black/12 bg-black/[0.05] px-3 py-1.5">
      <span className="text-sm" title={rate.live ? "Live market rate" : "Rate you set by hand"}>
        {rate.live ? "📡" : "✍️"}
      </span>
      <span className="whitespace-nowrap text-xs font-bold tabular-nums text-[#121118]">
        {num(tomanValue)} T
        <span className="ml-1 font-semibold text-[#121118]/91">= 1 USD</span>
      </span>
      <button
        onClick={check}
        disabled={busy}
        className="rounded-lg px-1.5 py-0.5 text-xs font-bold text-[#121118]/88 transition hover:bg-black/12 hover:text-[#121118] disabled:opacity-40"
        title={`Re-check the free-market rate (now from ${rate.source || "you"}, set ${relativeDate(rate.updatedAt)})`}
      >
        {busy ? "…" : "⟳"}
      </button>
      {note && <span className="max-w-[10rem] truncate text-[12px] font-semibold text-[#121118]/91">{note}</span>}
    </div>
  );
}

/**
 * Search the whole roster from anywhere.
 *
 * Typing filters as you go and shows the people themselves (name, Latin name, platform,
 * phase) — not a page of results to scroll: the point is to jump to one person in two
 * keystrokes. Enter opens the top match, Escape closes, and clicking away dismisses it.
 */
function RosterSearch({ people, onOpen }: { people: SearchPerson[]; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const scored = people
      .map((p) => {
        const name = p.name.toLowerCase();
        const latin = (p.latinName ?? "").toLowerCase();
        const haystack = [name, latin, p.phone ?? "", ...(p.tags ?? []), ...(p.platformNames ?? [])]
          .join(" ")
          .toLowerCase();
        // Name prefixes first: typing "sa" should reach Sara before "Masa".
        const rank = name.startsWith(q) || latin.startsWith(q) ? 0 : name.includes(q) || latin.includes(q) ? 1 : 2;
        return { p, rank, hit: rank < 2 || haystack.includes(q) };
      })
      .filter((s) => s.hit)
      .sort((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name));
    return scored.slice(0, 8).map((s) => s.p);
  }, [people, query]);

  useEffect(() => setHighlight(0), [query]);

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  // ⌘K / Ctrl-K jumps straight into the field, which is how a long roster gets used.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const choose = (person: SearchPerson) => {
    onOpen(person.id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && matches[highlight]) {
            e.preventDefault();
            choose(matches[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search anyone — name, Latin name, phone, platform…  (⌘K)"
        aria-label="Search the roster"
        className="w-full rounded-2xl border border-black/16 bg-white/90 px-3.5 py-2 pr-9 text-sm font-medium text-[#121118] outline-none transition placeholder:text-[#121118]/85 focus:border-[#FF79AC] focus:ring-2 focus:ring-[#FF79AC]/25"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#121118]/82">🔍</span>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-black/16 bg-white p-1.5 shadow-2xl">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-xs font-semibold text-[#121118]/91">Nobody matches “{query}”.</p>
          ) : (
            matches.map((p, i) => (
              <button
                key={p.id}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(p)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  i === highlight ? "bg-[#FF79AC]/12" : "hover:bg-black/[0.07]"
                }`}
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: p.phaseColor ?? "#121118" }}
                >
                  {p.name.trim().charAt(0) || "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[#121118]">
                    {p.name}
                    {p.latinName && p.latinName.toLowerCase() !== p.name.toLowerCase() && (
                      <span className="ml-1.5 text-[13px] font-semibold text-[#121118]/90">{p.latinName}</span>
                    )}
                  </span>
                  <span className="block truncate text-[12px] font-semibold text-[#121118]/91">
                    {[p.phaseLabel, p.platformNames?.join(" · "), p.phone].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-[12px] font-bold text-[#121118]/82">↵</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const NAV_ICONS: Record<string, string> = { board: "🗂️", leaderboard: "🏆", insights: "🔔", portfolio: "📚", settings: "⚙️" };

export const Shell: React.FC<ShellProps> = ({
  view,
  onNavigate,
  nav,
  sync,
  children,
  actions,
  people,
  onOpenPerson,
  rate,
  onRefreshRate,
}) => (
  <div className="min-h-screen bg-[#F6F6F8] text-[#121118]">
    {/* Sidebar — slim, so the content gets the width instead of the chrome. */}
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-56 flex-col border-r border-black/12 bg-white px-3 py-5 lg:flex">
      <div className="mb-6 flex items-center gap-2.5 px-1">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FF79AC] text-lg shadow-[0_8px_20px_-8px_rgba(255,121,172,0.9)]">
          🎓
        </span>
        <div>
          <p className="text-sm font-bold leading-tight tracking-tight">Success Advisor</p>
          <p className="text-[12px] text-[#121118]/90">Mentor console</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const on = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                on ? "bg-[#121118] text-white shadow-[0_8px_20px_-12px_rgba(18,17,24,0.9)]" : "text-[#121118]/93 hover:bg-black/12"
              }`}
            >
              <span className="text-lg">{NAV_ICONS[item.id] ?? item.icon}</span>
              {item.label}
              {item.badge ? (
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    on ? "bg-white/20 text-white" : "bg-[#FF79AC]/15 text-[#FF79AC]"
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2">
        <p className="px-1 text-[12px] font-bold uppercase tracking-wide text-[#121118]/86">Quick actions</p>
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all active:scale-[0.98] ${
              a.primary
                ? "bg-[#FF79AC] text-white shadow-[0_8px_20px_-10px_rgba(255,121,172,0.95)] hover:brightness-105"
                : "border border-black/16 bg-white text-[#121118]/94 hover:border-black/34"
            }`}
          >
            <span className="text-base">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <StorageChip sync={sync} />
      </div>
    </aside>

    {/* Mobile bar */}
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/12 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {/* One column per destination — the nav is data-driven, so this stays correct
          when a view is added or removed instead of silently squashing five into four. */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(nav.length, 1)}, minmax(0, 1fr))` }}>
        {nav.map((item) => {
          const on = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${
                on ? "text-[#FF79AC]" : "text-[#121118]/88"
              }`}
            >
              <span className="text-lg leading-none">{NAV_ICONS[item.id] ?? item.icon}</span>
              <span className="max-w-full truncate px-0.5">{item.label.split(" ")[0]}</span>
              {item.badge ? (
                <span className="absolute right-4 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF79AC] px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>

    {/* Content — full width, narrow margins. */}
    <div className="pb-20 lg:pb-0 lg:pl-56">
      <header className="sticky top-0 z-20 border-b border-black/12 bg-white/90 backdrop-blur">
        <div className="flex w-full flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FF79AC] text-sm">🎓</span>
            <span className="text-sm font-bold">Success Advisor</span>
          </div>
          <RosterSearch people={people} onOpen={onOpenPerson} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <RateChip rate={rate} onRefresh={onRefreshRate} />
            {actions.slice(0, 1).map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="rounded-xl bg-[#FF79AC] px-3 py-1.5 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(255,121,172,0.95)] lg:hidden"
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="w-full px-4 py-5 lg:px-6">{children}</main>
    </div>
  </div>
);

export default Shell;
