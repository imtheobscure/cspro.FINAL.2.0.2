import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useGameState, store } from "../../engine/store";
import {
  addConversationTurn,
  clearConversationDraft,
  moveConversationTurn,
  removeConversationTurn,
  sendConversation,
  updateConversationTurn,
} from "../../engine/actions";
import { audio } from "../../engine/audio";
import type { ConversationTurn } from "../../engine/types";
import { Button, Card, Field, Input, SectionTitle, Textarea } from "../primitives";

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || "").trim();
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (h: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (ref.current && !focused.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const commitNow = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const exec = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    commitNow();
  };

  const insertImage = (dataUrl: string) => {
    ref.current?.focus();
    const img = `<img src="${dataUrl}" style="max-width:100%; border-radius:8px; display:block; margin:6px 0;" alt="image" />`;
    document.execCommand("insertHTML", false, img);
    commitNow();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const imageItem = Array.from(e.clipboardData.items).find((it) => it.type.startsWith("image/"));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        const r = new FileReader();
        r.onload = () => insertImage(r.result as string);
        r.readAsDataURL(file);
        return;
      }
    }
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      document.execCommand("insertHTML", false, html);
    } else {
      document.execCommand("insertText", false, text || "");
    }
    commitNow();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => insertImage(r.result as string);
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const btn = "rounded px-2 py-1 text-sm hover:bg-white/15 active:bg-white/25 focus:outline-none focus:ring-1 focus:ring-violet-400/60";

  return (
    <div className="rounded-lg border border-white/20 bg-white/5">
      <div
        onMouseDown={(e) => e.preventDefault()}
        className="flex flex-wrap gap-1 border-b border-white/10 p-1.5"
      >
        <button type="button" onClick={() => exec("bold")} className={`${btn} font-bold`} title="Bold">B</button>
        <button type="button" onClick={() => exec("italic")} className={`${btn} italic`} title="Italic">I</button>
        <button type="button" onClick={() => exec("underline")} className={`${btn} underline`} title="Underline">U</button>
        <span className="mx-1 w-px self-stretch bg-white/10" />
        <button type="button" onClick={() => exec("formatBlock", "H3")} className={`${btn} text-xs`} title="Heading">H</button>
        <button type="button" onClick={() => exec("insertUnorderedList")} className={btn} title="Bulleted list">•</button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={btn} title="Numbered list">1.</button>
        <span className="mx-1 w-px self-stretch bg-white/10" />
        <button type="button" onClick={() => fileRef.current?.click()} className={btn} title="Insert image">🖼️</button>
        <input ref={fileRef} type="file" accept="image/*,image/gif" onChange={onFile} className="hidden" />
        <button
          type="button"
          onClick={() => {
            const v = prompt("Enter emoji or paste a GIF/Image URL:");
            if (!v) return;
            const isUrl = /^https?:\/\//.test(v);
            document.execCommand(
              "insertHTML",
              false,
              isUrl
                ? `<img src="${v}" style="max-width:140px; border-radius:8px;" alt="media" />`
                : `<span style="font-size:32px">${v}</span>`,
            );
            commitNow();
          }}
          className={btn}
          title="Insert emoji / GIF URL"
        >
          😀
        </button>
        <span className="mx-1 w-px self-stretch bg-white/10" />
        <button type="button" onClick={() => exec("justifyLeft")} className={`${btn} text-xs`} title="Align left">⫷</button>
        <button type="button" onClick={() => exec("justifyCenter")} className={`${btn} text-xs`} title="Center">≡</button>
        <button type="button" onClick={() => exec("justifyRight")} className={`${btn} text-xs`} title="Align right">⫸</button>
        <button type="button" onClick={() => exec("removeFormat")} className={`${btn} text-xs`} title="Clear formatting">⌫</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; commitNow(); }}
        onInput={commitNow}
        onPaste={onPaste}
        onMouseDown={(e) => e.stopPropagation()}
        className="min-h-[120px] max-h-[300px] cursor-text overflow-y-auto p-3 text-sm text-slate-100 outline-none empty:before:text-slate-500 empty:before:content-[attr(data-placeholder)]"
        style={{ whiteSpace: "pre-wrap" }}
        data-placeholder="Type a rich message. Paste images, GIFs, format text..."
      />
    </div>
  );
}

function TurnEditor({
  turn, index, isLast, players, npcs,
}: {
  turn: ConversationTurn;
  index: number;
  isLast: boolean;
  /** players are the LISTENERS (targets). Only NPCs can be the speaker. */
  players: any[];
  /** NPCs that can be selected as the speaker of this turn. */
  npcs: any[];
}) {
  const npcList = npcs;
  const fromEnt = npcList.find((n) => n.id === turn.fromEntityId);
  const [hasChallenge, setHasChallenge] = useState(!!turn.challenge);
  const [preview, setPreview] = useState(false);

  // If the current from-entity is no longer an NPC (e.g. user changed types),
  // force-select the first NPC to keep the rule that only NPCs speak.
  useEffect(() => {
    if (!fromEnt && npcList[0]) {
      updateConversationTurn(turn.id, { fromEntityId: npcList[0].id });
    }
  }, [turn.id, npcList, fromEnt]);

  const previewSpeak = () => {
    if (!fromEnt) return;
    audio.speak(turn.ttsText || stripHtml(turn.richText) || "Hello.", fromEnt.voiceURI, { pitch: 0.95 });
  };

  return (
    <Card className="space-y-2 border-2 border-violet-500/30 bg-violet-500/5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-violet-500/30 px-2 py-0.5 text-xs font-black">Turn {index + 1}</span>
        <span className="text-xl">{fromEnt?.emoji ?? "🎭"}</span>
        <span className="font-bold" style={{ color: fromEnt?.color }}>{fromEnt?.name ?? "Unknown NPC"}</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="subtle" onClick={() => moveConversationTurn(turn.id, -1)} disabled={index === 0}>▲</Button>
          <Button size="sm" variant="subtle" onClick={() => moveConversationTurn(turn.id, 1)} disabled={isLast}>▼</Button>
          <Button size="sm" variant="danger" onClick={() => removeConversationTurn(turn.id)}>🗑️</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Speaking NPC (only NPCs can talk)">
          <select
            value={turn.fromEntityId}
            onChange={(e) => updateConversationTurn(turn.id, { fromEntityId: e.target.value })}
            className="w-full rounded-lg bg-slate-900/70 px-2 py-2 text-sm text-slate-100 ring-1 ring-white/10"
          >
            {npcList.length === 0 && <option value="">(no NPCs yet — add one in Players tab)</option>}
            {npcList.map((n) => (
              <option key={n.id} value={n.id}>
                {n.emoji} {n.name}{n.role ? ` · ${n.role}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Talking To (1+ players)">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-900/70 p-2 ring-1 ring-white/10">
            {players.map((p) => (
              <label key={p.id} className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs">
                <input
                  type="checkbox"
                  checked={turn.toPlayerIds.includes(p.id)}
                  onChange={(e) => {
                    const ids = e.target.checked
                      ? [...turn.toPlayerIds, p.id]
                      : turn.toPlayerIds.filter((x) => x !== p.id);
                    updateConversationTurn(turn.id, { toPlayerIds: ids });
                  }}
                />
                {p.emoji} {p.name}
              </label>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Message (rich text — click 'Read aloud' to preview)">
        <RichTextEditor
          value={turn.richText}
          onChange={(h) => updateConversationTurn(turn.id, { richText: h, ttsText: stripHtml(h) })}
        />
      </Field>

      <Field label="TTS Read-Aloud text (auto-derived, edit if needed)">
        <Input
          value={turn.ttsText}
          onChange={(e) => updateConversationTurn(turn.id, { ttsText: e.target.value })}
          placeholder="Auto-derived from rich text"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="subtle" onClick={previewSpeak}>🔊 Read this card aloud</Button>
        <Button size="sm" variant="subtle" onClick={() => setPreview((v) => !v)}>{preview ? "Hide" : "Show"} preview</Button>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={hasChallenge} onChange={(e) => {
            setHasChallenge(e.target.checked);
            if (e.target.checked) {
              updateConversationTurn(turn.id, {
                challenge: { description: "Describe the challenge…", rewardItemEmoji: "🎁", rewardItemName: "Mystery Item" },
              });
            } else {
              updateConversationTurn(turn.id, { challenge: undefined });
            }
          }} />
          Include a challenge/quest (rewards player with item)
        </label>
      </div>

      {preview && turn.richText && (
        <div className="rounded-lg bg-slate-950/70 p-3 ring-1 ring-violet-500/30">
          <div className="prose prose-invert max-w-none text-sm prose-img:rounded-md" dangerouslySetInnerHTML={{ __html: turn.richText }} />
        </div>
      )}

      {hasChallenge && turn.challenge && (
        <div className="rounded-lg bg-slate-900/50 p-2 space-y-2">
          <Field label="Challenge description">
            <Textarea rows={2} value={turn.challenge.description}
              onChange={(e) => updateConversationTurn(turn.id, { challenge: { ...turn.challenge!, description: e.target.value } })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Reward item emoji">
              <Input value={turn.challenge.rewardItemEmoji}
                onChange={(e) => updateConversationTurn(turn.id, { challenge: { ...turn.challenge!, rewardItemEmoji: e.target.value } })} />
            </Field>
            <Field label="Reward item name">
              <Input value={turn.challenge.rewardItemName}
                onChange={(e) => updateConversationTurn(turn.id, { challenge: { ...turn.challenge!, rewardItemName: e.target.value } })} />
            </Field>
          </div>
        </div>
      )}

      {fromEnt && fromEnt.kind === "npc" && (
        <div className="rounded-lg bg-slate-900/60 p-2">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">💼 {fromEnt.name}'s Items (click to send):</p>
          <div className="flex flex-wrap gap-1">
            {fromEnt.inventory.length === 0 ? (
              <p className="text-[10px] text-slate-500">No items.</p>
            ) : (
              fromEnt.inventory.map((it: any) => (
                <button
                  key={it.id}
                  onClick={() => {
                    store.set((s) => ({
                      ...s,
                      entities: s.entities.map((e) => {
                        if (e.id === fromEnt.id) return { ...e, inventory: e.inventory.filter((i) => i.id !== it.id) };
                        if (turn.toPlayerIds.includes(e.id)) return { ...e, inventory: [...e.inventory, { ...it, id: nanoid(6) }] };
                        return e;
                      }),
                      conversation: [
                        ...s.conversation,
                        {
                          id: nanoid(6),
                          fromId: fromEnt.id,
                          fromName: fromEnt.name,
                          fromColor: fromEnt.color,
                          fromEmoji: fromEnt.emoji,
                          toPlayerIds: turn.toPlayerIds,
                          richHtml: `<i>📦 ${fromEnt.name} sends <b>${it.emoji} ${it.name}</b> to ${turn.toPlayerIds.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean).join(", ")}</i>`,
                          ttsText: `${fromEnt.name} sends ${it.name}.`,
                          ts: Date.now(),
                        },
                      ],
                    }));
                  }}
                  className="rounded bg-violet-500/20 px-2 py-1 text-sm hover:bg-violet-500/40"
                  title={`Send ${it.name}`}
                >
                  {it.emoji} {it.name}
                </button>
              ))
            )}
          </div>
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 mt-2">💞 Relationship to selected players:</p>
          {turn.toPlayerIds.length === 0 && <p className="text-[10px] text-slate-500">No targets selected.</p>}
          {turn.toPlayerIds.map((pid) => {
            const p = players.find((x) => x.id === pid);
            const r = fromEnt.relationships?.find((x: any) => x.targetId === pid);
            return (
              <div key={pid} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 truncate">{p?.emoji} {p?.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full"
                    style={{
                      marginLeft: `${50 + (r ? Math.min(0, r.value) / 2 : 0)}%`,
                      width: `${Math.abs(r?.value ?? 0) / 2}%`,
                      background: (r?.value ?? 0) >= 0 ? "#22c55e" : "#ef4444",
                    }}
                  />
                </div>
                <span className={`w-12 text-right ${(r?.value ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {r?.value ?? 0} {(r?.value ?? 0) >= 0 ? "💚" : "💢"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function ConversationTab() {
  const state = useGameState();
  const players = state.entities.filter((e) => e.kind === "player");
  const npcs = state.entities.filter((e) => e.kind === "npc");
  const draft = state.conversationDraft;

  const onAddTurn = () => {
    if (players.length === 0) {
      alert("Add at least one player first in the Players tab.");
      return;
    }
    if (npcs.length === 0) {
      alert("Add at least one NPC first in the Players tab. Only NPCs can talk in this tab.");
      return;
    }
    addConversationTurn({
      fromEntityId: npcs[0].id,
      toPlayerIds: [players[0].id],
      richText: "",
      ttsText: "",
    });
  };

  const onSendAll = () => {
    if (draft.length === 0) {
      alert("No turns to send.");
      return;
    }
    sendConversation();
  };

  const onPreview = async () => {
    if (draft.length === 0) {
      alert("Add turns first.");
      return;
    }
    for (const t of draft) {
      const npc = npcs.find((n) => n.id === t.fromEntityId);
      if (!npc) continue;
      const text = t.ttsText || stripHtml(t.richText) || "...";
      await audio.speakAsync(text, npc.voiceURI, { pitch: 0.95 });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>🎬 Conversation Builder (NPC → Player)</SectionTitle>
        <p className="text-xs text-slate-400">
          Build a turn-based dialogue sequence. Only NPCs speak. Players are listeners. Each card is
          a self-contained turn; in the canvas, the NPC speaks to the players, the leaderboard highlights
          who is talking, and the card plays the next turn only after the previous one finishes.
          Click a card on the canvas to re-read it aloud.
        </p>
        {npcs.length === 0 && (
          <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
            ⚠ No NPCs yet. Add at least one NPC in the Players tab before creating turns.
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onAddTurn} disabled={npcs.length === 0 || players.length === 0}>＋ Add Turn</Button>
        <Button variant="primary" disabled={draft.length === 0} onClick={onSendAll}>
          🚀 Send All ({draft.length})
        </Button>
        <Button variant="subtle" disabled={draft.length === 0} onClick={onPreview}>🔊 Preview Sequence</Button>
        <Button variant="ghost" disabled={draft.length === 0} onClick={clearConversationDraft}>Clear Draft</Button>
      </div>

      <div className="space-y-3">
        {draft.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500 text-center">
              No turns yet. Click <b>Add Turn</b> to start.
            </p>
          </Card>
        )}
        {draft.map((t, i) => (
          <TurnEditor
            key={t.id}
            turn={t}
            index={i}
            isLast={i === draft.length - 1}
            players={players}
            npcs={npcs}
          />
        ))}
      </div>
    </div>
  );
}
