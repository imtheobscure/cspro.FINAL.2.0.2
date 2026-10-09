"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Search, X, UserPlus, Users, Dumbbell, BarChart3 } from "lucide-react";
import type { Contact } from "@/lib/contacts";
import { suggestFor, type ConsolePlayer, type Roster } from "@/lib/players";

/**
 * The name box, upgraded into a player picker.
 *
 * Typing a name still works exactly as it did. What is new:
 *   · suggestions appear from the tutor's own saved players first, then from the
 *     Adult and Kids dashboards — with each learner's real avatar — so a name does
 *     not have to be retyped (or misspelled) at the start of every session;
 *   · picking one *selects that player*, which is what makes \"continue their
 *     record\" true: the board and the personal best switch to that person's scores;
 *   · saved players sit in a row underneath, one click to switch.
 *
 * The suggestion list is deliberately capped at six and never shows a name the
 * tutor has already saved twice.
 */

export interface PlayerPickerProps {
  roster: Roster;
  contacts: Contact[];
  contactsState: "idle" | "loading" | "ready";
  onRenameActive: (name: string) => void;
  onPick: (contact: Contact) => void;
  onRemove: (id: string) => void;
  showPractice: boolean;
  onTogglePractice: (value: boolean) => void;
  /** Open the saved record for one player: games, bests, trend and time spent. */
  onStats?: (player: ConsolePlayer) => void;
}

export default function PlayerPicker({
  roster,
  contacts,
  contactsState,
  onRenameActive,
  onPick,
  onRemove,
  showPractice,
  onTogglePractice,
  onStats,
}: PlayerPickerProps) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(
    () => roster.players.find((p) => p.id === roster.activeId) ?? roster.players[0] ?? null,
    [roster]
  );

  const suggestions = useMemo(
    () => (draft.trim() ? suggestFor(draft, roster, contacts) : []),
    [draft, roster, contacts]
  );

  // A click anywhere else closes the list; otherwise it would hang over the board.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => setHighlight(0), [draft]);

  const commit = (contact: Contact) => {
    onPick(contact);
    setDraft("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, suggestions.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (open && suggestions[highlight]) commit(suggestions[highlight]);
      else if (draft.trim()) commit({ id: "", name: draft.trim(), avatar: "", source: "console" });
      return;
    }
    if (event.key === "Escape") setOpen(false);
  };

  const saved = roster.players;

  return (
    <div className="min-w-0" ref={boxRef}>
      <label className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 focus-within:border-cyan-400 transition-colors">
        <Pencil className="w-3 h-3 text-slate-500 shrink-0" />
        <input
          value={draft}
          onChange={(e) => {
            const value = e.target.value.slice(0, 24);
            setDraft(value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={active ? `${active.name} — or another name` : "Your name"}
          aria-label="Player name"
          title="Type a name, or pick one from your dashboard"
          /*
            `flex-1` + `min-w-0` + a `max-w` cap instead of a bare `w-44`: the fixed
            width could not shrink, so the trailing search icon was pushed 9px out of
            the row on a phone. The cap keeps the desktop size unchanged.
          */
          className="bg-transparent text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none flex-1 min-w-0 max-w-44"
        />
        <Search className="w-3 h-3 text-slate-600 shrink-0" />
      </label>

      {open && draft.trim() && (
        /*
          On a phone the picker sits near the right edge, so a fixed 288px panel
          anchored to its left edge ran 59px off the screen. It now spans its own row
          below `sm` and keeps the original 288px panel from `sm` up.
        */
        <div className="absolute left-0 right-0 z-30 mt-1.5 sm:right-auto sm:w-72 bg-slate-950/98 backdrop-blur border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2.5 text-[11px] font-mono text-slate-500">
              No match — press Enter to add “{draft.trim()}”.
            </div>
          ) : (
            suggestions.map((c, i) => (
              <button
                key={c.id}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => commit(c)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  i === highlight ? "bg-cyan-500/15" : "hover:bg-slate-800/60"
                }`}
              >
                <Avatar avatar={c.avatar} name={c.name} size={26} />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-white truncate">{c.name}</span>
                  <span className="block text-[10px] font-mono text-slate-500">
                    {c.source === "adult"
                      ? "Adult Dashboard"
                      : c.source === "kids"
                      ? "Kids Dashboard"
                      : c.source === "guest"
                      ? "Room guest"
                      : "Saved in consol"}
                  </span>
                </span>
              </button>
            ))
          )}
          <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            {contactsState === "loading"
              ? "Looking in your dashboards…"
              : contactsState === "ready"
              ? `${contacts.length} learner${contacts.length === 1 ? "" : "s"} found in your dashboards`
              : "Dashboard names load when you type"}
          </div>
        </div>
      )}

      {/* Saved players — one click to continue a record */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {saved.length > 0 ? (
          saved.map((p) => {
            const isActive = active?.id === p.id;
            return (
              <span
                key={p.id}
                className={`group flex items-center gap-1 rounded-full border pl-0.5 pr-1 py-0.5 transition ${
                  isActive
                    ? "border-cyan-400/70 bg-cyan-500/15"
                    : "border-slate-700 bg-slate-950/70 hover:border-slate-500"
                }`}
              >
                <button
                  onClick={() => onPick({ id: p.id, name: p.name, avatar: p.avatar, source: p.source })}
                  title={isActive ? `${p.name} — current player` : `Continue ${p.name}'s record`}
                  className="flex items-center gap-1.5"
                >
                  <Avatar avatar={p.avatar} name={p.name} size={18} />
                  <span className={`text-[11px] font-bold ${isActive ? "text-cyan-200" : "text-slate-300"}`}>
                    {p.name}
                  </span>
                </button>
                {onStats && (
                  <button
                    onClick={() => onStats(p)}
                    title={`${p.name}'s record: games played, best scores, trend and time spent`}
                    className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-cyan-300"
                  >
                    <BarChart3 className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => onRemove(p.id)}
                  title={`Forget ${p.name} (their scores stay)`}
                  className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <UserPlus className="w-3 h-3" /> Pick a name to start a record
          </span>
        )}

        <button
          onClick={() => onTogglePractice(!showPractice)}
          title={
            showPractice
              ? "Hide the practice rivals — show your own players only"
              : "Show the practice rivals alongside your players"
          }
          className={`ml-auto flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono transition ${
            showPractice
              ? "border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-500"
              : "border-amber-400/60 bg-amber-400/15 text-amber-300"
          }`}
        >
          {showPractice ? <Users className="w-3 h-3" /> : <Dumbbell className="w-3 h-3" />}
          {showPractice ? "Practice rivals" : "Real players only"}
        </button>
      </div>
    </div>
  );
}

/** An avatar may be an emoji or an image — render whichever it is. */
export function Avatar({ avatar, name, size }: { avatar: string; name: string; size: number }) {
  const isImage = avatar.startsWith("data:") || avatar.startsWith("http");
  if (isImage) {
    return (
      <img
        src={avatar}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-slate-700 shrink-0 bg-slate-800"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
      className="rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0"
      title={name}
    >
      {avatar || "👤"}
    </span>
  );
}

export type { ConsolePlayer };
