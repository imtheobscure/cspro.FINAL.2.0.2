import { nanoid } from "nanoid";
import { store } from "./store";
import { audio } from "./audio";
import { interpretTriggers, sanitizeForCanvas } from "./triggers";
import type { Chapter, ConversationMessage, ConversationTurn, Decision, Entity, GameState, InventoryItem, ItemRarity, SocialDeductionPreset, StoryNode } from "./types";
import { makeEntity, PALETTE } from "./defaults";

// ---------------- Entities -----------------
/** Pick a forced natural Edge voice (never David/Zira). */
const pickNaturalVoice = (): string | undefined => {
  try {
    return audio.naturalVoices()[0]?.voiceURI;
  } catch {
    return undefined;
  }
};

export const addPlayer = () => {
  const voice = pickNaturalVoice();
  store.set((s) => ({ ...s, entities: [...s.entities, makeEntity({ name: "New Player", voiceURI: voice, translationVoiceURI: voice })] }));
};

export const addNPC = () => {
  const voice = pickNaturalVoice();
  store.set((s) => ({ ...s, entities: [...s.entities, makeEntity({ kind: "npc", name: "New NPC", emoji: "👤", isAlly: false, voiceURI: voice, translationVoiceURI: voice })] }));
};

export const updateEntity = (id: string, patch: Partial<Entity>) =>
  store.set((s) => ({ ...s, entities: s.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

export const removeEntity = (id: string) =>
  store.set((s) => ({ ...s, entities: s.entities.filter((e) => e.id !== id) }));

// ---------------- Settings -----------------
export const patchSettings = (patch: Partial<GameState["settings"]>) =>
  store.set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

export const setActiveUniverse = (id: string) =>
  store.set((s) => ({ ...s, activeUniverseId: id }));

export const addUniverse = (u: GameState["universes"][number]) =>
  store.set((s) => ({ ...s, universes: [...s.universes, u] }));

export const updateUniverse = (id: string, patch: Partial<GameState["universes"][number]>) =>
  store.set((s) => ({ ...s, universes: s.universes.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));

export const removeUniverse = (id: string) =>
  store.set((s) => ({ ...s, universes: s.universes.filter((u) => u.id !== id) }));

/** Sets active universe to the social deduction preset.
 * Per user request: does NOT auto-populate NPCs. The Story Maker prompt instructs
 * the AI to add appropriate NPCs when the GM pastes the generated HTML.
 * Also sets the social-deduction template id so the prompt generator
 * injects the strict hidden-role template rules. */
export const applySocialDeductionPreset = (preset: SocialDeductionPreset) =>
  store.set((s) => {
    const universe = {
      id: nanoid(6),
      name: preset.name,
      icon: preset.icon,
      category: "social-deduction" as const,
      description: preset.blurb,
      lore: `Social Deduction mode: ${preset.name}. Roles in this preset: ${preset.roles.join(", ")}. ${preset.blurb}`,
      presetId: preset.id,
      templateId: "social-deduction" as const,
    };
    return {
      ...s,
      universes: [...s.universes, universe],
      activeUniverseId: universe.id,
      settings: { ...s.settings, consensusMode: true, tone: "mysterious" },
    };
  });

// ---------------- Effects / Soundscapes -----------------
export const updateEffect = (id: string, patch: Partial<GameState["effects"][number]>) =>
  store.set((s) => ({ ...s, effects: s.effects.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

export const addEffect = () =>
  store.set((s) => ({
    ...s,
    effects: [...s.effects, { id: nanoid(6), name: "New Effect", emoji: "✨", animation: "burst", soundUrl: "", color: "#8b5cf6" }],
  }));

export const removeEffect = (id: string) =>
  store.set((s) => ({ ...s, effects: s.effects.filter((e) => e.id !== id) }));

export const addSoundscape = (name = "New Soundscape") =>
  store.set((s) => ({ ...s, soundscapes: [...s.soundscapes, { id: nanoid(6), name, url: "", volume: 0.6, loop: true }] }));

export const updateSoundscape = (id: string, patch: Partial<GameState["soundscapes"][number]>) =>
  store.set((s) => ({ ...s, soundscapes: s.soundscapes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

export const removeSoundscape = (id: string) =>
  store.set((s) => ({ ...s, soundscapes: s.soundscapes.filter((x) => x.id !== id) }));

export const setActiveSoundscape = (id?: string) =>
  store.set((s) => ({ ...s, activeSoundscapeId: id }));

export const setOpeningImage = (url?: string) =>
  store.set((s) => ({ ...s, environment: { ...(s.environment ?? { manualWeather: "clear" }), openingImageUrl: url } }));

export const setManualWeather = (weather: string) => {
  store.set((s) => ({ ...s, environment: { ...(s.environment ?? { manualWeather: "clear" }), manualWeather: weather } }));
  store.command({ type: "ENVIRONMENT", weather });
};

// ---------------- Pause -----------------
export const setPaused = (p: boolean) => store.set((s) => ({ ...s, paused: p }));

// ---------------- Deploy AI HTML scene -----------------
/**
 * Deploys generated HTML to the canvas as ONE chapter (one tab).
 * Every deploy: triggers a 3-2-1 countdown for the audience, then renders
 * the AI's HTML inside the sandboxed iframe. Internal phases (intro / cast /
 * how-to-play / game) are handled by the AI's HTML + the sandbox runtime
 * phase navigator — not by splitting into multiple chapters.
 */
export function deployScene(rawHtml: string, _legacyMode?: "single" | "splash") {
  void _legacyMode;
  const s0 = store.getSnapshot();
  const title = `Chapter ${s0.chapters.length + 1}`;

  // Auto-wrap so triggers and class-scoped CSS still find a stable parent.
  const wrappedHtml = /class\s*=\s*"[^"]*aw-scene/.test(rawHtml)
    ? rawHtml
    : `<section class="aw-scene" data-aw-scene-title="${escapeAttr(title)}">${rawHtml}</section>`;

  const parsed = interpretTriggers(wrappedHtml, s0);
  let nextState = parsed.nextState;

  // Auto-accept AI NPC suggestions that don't conflict with existing names.
  if (parsed.npcSuggestions.length > 0) {
    const existingNames = new Set(nextState.entities.map((e) => e.name.toLowerCase()));
    const suggested = parsed.npcSuggestions
      .filter((n) => n.name && !existingNames.has(n.name.toLowerCase()))
      .map((n) =>
        makeEntity({
          kind: "npc",
          name: n.name,
          emoji: n.emoji || "👤",
          role: n.role,
          background: n.background,
          goals: n.goals,
          personality: n.personality,
          abilities: n.abilities,
          nativeLanguage: n.nativeLanguage,
          learningLanguage: n.learningLanguage,
          bilingual: !!n.nativeLanguage && n.nativeLanguage.toLowerCase() !== "english",
          voiceURI: n.voiceURI,
          translationVoiceURI: n.translationVoiceURI,
          isAlly: false,
        }),
      );
    if (suggested.length > 0) {
      nextState = { ...nextState, entities: [...nextState.entities, ...suggested] };
    }
  }

  const { opening } = sanitizeForCanvas(wrappedHtml);
  const chapter: Chapter = {
    id: nanoid(8),
    title,
    timestamp: Date.now(),
    html: wrappedHtml,
    narratorOpening: opening,
    leaderboardSnapshot: structuredClone(nextState.entities),
    decisions: [],
  };
  const node: StoryNode = {
    id: nanoid(8),
    chapterId: chapter.id,
    label: chapter.title,
    parentId: s0.activeChapterId
      ? s0.storyMap.find((n) => n.chapterId === s0.activeChapterId)?.id
      : undefined,
    fates: [],
  };

  store.replace({
    ...nextState,
    entities: chapter.leaderboardSnapshot,
    chapters: [...s0.chapters, chapter],
    activeChapterId: chapter.id,
    storyMap: [...s0.storyMap, node],
    liveInputs: [],
  });

  // Always fire the 3-2-1 countdown so audience knows the game has started.
  store.command({ type: "COUNTDOWN" });
  store.command({ type: "DEPLOY_HTML", html: chapter.html, opening: chapter.narratorOpening });
  return chapter.id;
}



function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

/** Remove a chapter (tab). If it was active, switch to the previous one. */
export const removeChapter = (id: string) =>
  store.set((s) => {
    const idx = s.chapters.findIndex((c) => c.id === id);
    if (idx < 0) return s;
    const remaining = s.chapters.filter((c) => c.id !== id);
    let activeId = s.activeChapterId;
    if (activeId === id) {
      const fallback = remaining[idx - 1] ?? remaining[idx] ?? remaining[remaining.length - 1];
      activeId = fallback?.id;
    }
    const entities = activeId
      ? structuredClone(remaining.find((c) => c.id === activeId)?.leaderboardSnapshot ?? s.entities)
      : s.entities;
    return {
      ...s,
      chapters: remaining,
      activeChapterId: activeId,
      storyMap: s.storyMap.filter((n) => n.chapterId !== id),
      entities,
    };
  });

export const switchChapter = (id: string) => {
  store.set((s) => {
    const ch = s.chapters.find((c) => c.id === id);
    if (!ch) return s;
    return { ...s, activeChapterId: id, entities: structuredClone(ch.leaderboardSnapshot) };
  });
  const ch = store.getSnapshot().chapters.find((c) => c.id === id);
  if (ch) store.command({ type: "DEPLOY_HTML", html: ch.html, opening: ch.narratorOpening });
};

// ---------------- Decisions -----------------
/** Append a new decision. Per user request: do NOT replace — accumulate all
 *  decisions for a player so the GM can add multiple transcriptions per player
 *  and they all appear in the Live Feed and in the Continuation prompt. */
export const submitDecision = (entityId: string, action: string, reasoning: string) =>
  store.set((s) => {
    const dec: Decision = { id: nanoid(6), entityId, action, reasoning, locked: true };
    const liveInputs = [...s.liveInputs, dec];
    const chapters = s.chapters.map((c) =>
      c.id === s.activeChapterId ? { ...c, decisions: [...c.decisions, dec] } : c,
    );
    return { ...s, liveInputs, chapters };
  });

export const clearLiveInput = (entityId: string) =>
  store.set((s) => ({ ...s, liveInputs: s.liveInputs.filter((d) => d.entityId !== entityId) }));

// ---------------- Chat -----------------
export const sendChat = (authorId: string, authorName: string, color: string, text: string, emoji?: string, groupId?: string) =>
  store.set((s) => ({
    ...s,
    chat: [...s.chat, { id: nanoid(6), authorId, authorName, color, text, emoji, ts: Date.now(), groupId }].slice(-500),
    chatGroups: groupId ? s.chatGroups.map(g => g.id === groupId ? { ...g, messages: [...g.messages, { id: nanoid(6), authorId, authorName, color, text, emoji, ts: Date.now(), groupId: g.id }].slice(-200) } : g) : s.chatGroups,
  }));

export const addChatGroup = (name: string, emoji: string, memberIds: string[]) =>
  store.set((s) => ({ ...s, chatGroups: [...s.chatGroups, { id: nanoid(6), name, emoji, color: PALETTE[s.chatGroups.length % PALETTE.length], memberIds, messages: [] }] }));

export const removeChatGroup = (groupId: string) =>
  store.set((s) => ({ ...s, chatGroups: s.chatGroups.filter(g => g.id !== groupId) }));

export const addToGroup = (groupId: string, memberId: string) =>
  store.set((s) => ({ ...s, chatGroups: s.chatGroups.map(g => g.id === groupId ? { ...g, memberIds: [...g.memberIds, memberId] } : g) }));

export const removeFromGroup = (groupId: string, memberId: string) =>
  store.set((s) => ({ ...s, chatGroups: s.chatGroups.map(g => g.id === groupId ? { ...g, memberIds: g.memberIds.filter(id => id !== memberId) } : g) }));

export const setSpeakingEntity = (entityId?: string) =>
  store.set((s) => ({ ...s, speakingEntityId: entityId }));

export const setSessionPanelOpen = (open: boolean) =>
  store.set((s) => ({ ...s, sessionPanelOpen: open }));

export const upsertSessionPeer = (peer: { id: string; name: string; color: string; assignedEntityId?: string }) =>
  store.set((s) => ({
    ...s,
    sessionPeers: [...s.sessionPeers.filter((p) => p.id !== peer.id), peer],
  }));

export const removeSessionPeer = (peerId: string) =>
  store.set((s) => ({ ...s, sessionPeers: s.sessionPeers.filter((p) => p.id !== peerId) }));

// ---------------- Conversation -----------------
export const addConversationTurn = (turn: Omit<ConversationTurn, "id" | "ts">) =>
  store.set((s) => ({
    ...s,
    conversationDraft: [...s.conversationDraft, { ...turn, id: nanoid(6), ts: Date.now() }],
  }));

export const updateConversationTurn = (id: string, patch: Partial<ConversationTurn>) =>
  store.set((s) => ({
    ...s,
    conversationDraft: s.conversationDraft.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));

export const removeConversationTurn = (id: string) =>
  store.set((s) => ({ ...s, conversationDraft: s.conversationDraft.filter((t) => t.id !== id) }));

export const moveConversationTurn = (id: string, dir: -1 | 1) =>
  store.set((s) => {
    const idx = s.conversationDraft.findIndex((t) => t.id === id);
    if (idx < 0) return s;
    const ni = idx + dir;
    if (ni < 0 || ni >= s.conversationDraft.length) return s;
    const arr = [...s.conversationDraft];
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    return { ...s, conversationDraft: arr };
  });

export const clearConversationDraft = () =>
  store.set((s) => ({ ...s, conversationDraft: [] }));

/** Send all draft turns. Plays each turn sequentially on canvas with TTS, applies item transfer & challenge reward. */
export const sendConversation = () =>
  store.set((s) => {
    const turns = s.conversationDraft;
    if (turns.length === 0) return s;

    // Build a new list of finalized conversation messages
    const newMsgs: ConversationMessage[] = turns.map((t) => {
      const fromEnt = s.entities.find((e) => e.id === t.fromEntityId);
      return {
        id: t.id,
        fromId: t.fromEntityId,
        fromName: fromEnt?.name ?? "Unknown",
        fromColor: fromEnt?.color ?? "#a78bfa",
        fromEmoji: fromEnt?.emoji ?? "👤",
        toPlayerIds: t.toPlayerIds,
        richHtml: t.richText,
        ttsText: t.ttsText,
        challenge: t.challenge,
        ts: t.ts,
      };
    });

    // Apply item transfer / challenge rewards
    const entities = s.entities.map((e) => {
      if (e.kind !== "player") return e;
      const myTurns = turns.filter((t) => t.toPlayerIds.includes(e.id) && t.challenge);
      if (myTurns.length === 0) return e;
      let inv = [...e.inventory];
      myTurns.forEach((t) => {
        if (t.challenge) {
          inv.push({ id: nanoid(6), emoji: t.challenge.rewardItemEmoji, name: t.challenge.rewardItemName, qty: 1, rarity: "rare" });
        }
      });
      return { ...e, inventory: inv };
    });

    return {
      ...s,
      entities,
      conversation: [...s.conversation, ...newMsgs],
      conversationDraft: [],
    };
  });

/** Convert rich HTML to plain text for TTS. */
export const htmlToText = (html: string): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
};

// ---------------- Story map fates -----------------
export const setNodeFate = (chapterId: string, fates: string[]) =>
  store.set((s) => ({ ...s, storyMap: s.storyMap.map((n) => (n.chapterId === chapterId ? { ...n, fates } : n)) }));

// ---------------- Manual override editor -----------------
export const overrideEntityRaw = (id: string, patch: Partial<Entity>) => updateEntity(id, patch);

// ---------------- Canvas selection & resizable panel -----------------
export const setSelectedPlayer = (id?: string) =>
  store.set((s) => ({ ...s, selectedPlayerId: id }));

export const setDecisionPanelHeight = (h: number) =>
  store.set((s) => ({ ...s, decisionPanelHeight: Math.max(120, Math.min(700, Math.round(h))) }));

// ---------------- Evolution / level-up -----------------
export const setEvolutionLevel = (id: string, level: number) =>
  store.set((s) => ({
    ...s,
    entities: s.entities.map((e) => (e.id === id ? { ...e, evolutionLevel: Math.max(0, Math.min(5, level)) } : e)),
  }));

export const bumpEvolution = (id: string, dir: 1 | -1) =>
  store.set((s) => ({
    ...s,
    entities: s.entities.map((e) =>
      e.id === id ? { ...e, evolutionLevel: Math.max(0, Math.min(5, (e.evolutionLevel ?? 0) + dir)) } : e,
    ),
  }));

/**
 * Reapply all selected voices and force-reload the canvas iframe so the
 * fresh voices take effect immediately (the iframe's preloaded <audio>
 * tags also reset and any cached TTS jobs are flushed).
 */
export const resetAllCharacterVoices = () =>
  store.set((s) => ({
    ...s,
    entities: s.entities.map((e) => {
      const natural = pickNaturalVoice();
      // Keep the voice the GM selected if it is already present; otherwise
      // repair missing/legacy voices with a natural voice. This also bumps the
      // iframe reload key so the currently deployed scene rebinds to the latest
      // selected entity voices immediately.
      return {
        ...e,
        voiceURI: e.voiceURI || natural,
        translationVoiceURI: e.translationVoiceURI || e.voiceURI || natural,
      };
    }),
    sceneReloadKey: (s.sceneReloadKey ?? 0) + 1,
  }));

/** Force the canvas iframe to fully re-render the current chapter. */
export const reloadCanvas = () =>
  store.set((s) => ({ ...s, sceneReloadKey: (s.sceneReloadKey ?? 0) + 1 }));

/**
 * Apply an interaction coming from the embedded game (iframe postMessage).
 * It targets the SELECTED player (falls back to first living player).
 */
export type CanvasAction =
  | { kind: "give-item"; emoji: string; name: string; rarity?: ItemRarity }
  | { kind: "stat"; key: string; op: "add" | "set"; val: number; targetId?: string }
  | { kind: "powerup"; name: string }
  | { kind: "status"; emoji: string; label: string; turns: number }
  | { kind: "decision"; action: string };

const clampStat = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function applyCanvasAction(a: CanvasAction) {
  store.set((s) => {
    const explicitTarget = a.kind === "stat" && a.targetId ? s.entities.find((e) => e.id === a.targetId)?.id : undefined;
    const targetId =
      explicitTarget ||
      (s.selectedPlayerId && s.entities.find((e) => e.id === s.selectedPlayerId && e.kind === "player" && !e.dead)?.id) ||
      s.entities.find((e) => e.kind === "player" && !e.dead)?.id;
    if (!targetId) return s;

    if (a.kind === "decision") {
      const dec: Decision = { id: nanoid(6), entityId: targetId, action: a.action, reasoning: "(chosen in game)", locked: true };
      const liveInputs = [...s.liveInputs, dec];
      const chapters = s.chapters.map((c) =>
        c.id === s.activeChapterId ? { ...c, decisions: [...c.decisions, dec] } : c,
      );
      return { ...s, liveInputs, chapters };
    }

    const entities = s.entities.map((e) => {
      if (e.id !== targetId) return e;
      if (a.kind === "give-item") {
        const itemName = String(a.name || "Item").trim();
        const existing = e.inventory.find((i) => i.name.toLowerCase() === itemName.toLowerCase());
        const inventory: InventoryItem[] = existing
          ? e.inventory.map((i) => (i.name.toLowerCase() === itemName.toLowerCase() ? { ...i, qty: i.qty + 1 } : i))
          : [...e.inventory, { id: nanoid(6), emoji: a.emoji, name: itemName, qty: 1, rarity: a.rarity ?? "common" }];
        return { ...e, inventory };
      }
      if (a.kind === "powerup") {
        return e.powerUps.includes(a.name) ? e : { ...e, powerUps: [...e.powerUps, a.name] };
      }
      if (a.kind === "status") {
        const statuses = [...e.statuses.filter((st) => st.label !== a.label), { id: nanoid(6), emoji: a.emoji, label: a.label, turns: a.turns }];
        return { ...e, statuses };
      }
      if (a.kind === "stat") {
        const key = a.key;
        const cur = (e as unknown as Record<string, number>)[key] ?? 0;
        let nv = a.op === "add" ? cur + a.val : a.val;
        if (key === "health") nv = clampStat(nv, 0, e.maxHealth);
        if (key === "hunger" || key === "thirst") nv = clampStat(nv, 0, 100);
        if (key === "lives" || key === "deaths" || key === "score") nv = Math.max(0, Math.round(nv));
        const patched = { ...e, [key]: nv } as Entity;
        if (key === "health" && nv <= 0 && !patched.dead) {
          patched.dead = true;
          patched.deaths = e.deaths + 1;
        }
        // Score changes no longer auto-evolve; the GM manually levels characters
        // via the Players tab, or via in-game "Level Up" buttons in the scene.
        return patched;
      }
      return e;
    });
    return { ...s, entities };
  });
}
