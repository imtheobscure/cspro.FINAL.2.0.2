import type { Entity, GameState } from "./types";
import { nanoid } from "nanoid";

export interface SpeakJob {
  entityId: string;
  text: string;
  kind?: "line" | "translation";
}
export interface VisualEvent {
  kind: "weather" | "scare" | "ring";
  data: Record<string, string>;
}

export interface ParseResult {
  nextState: GameState;
  speakQueue: SpeakJob[];
  visuals: VisualEvent[];
  prompts: { entityId: string; hints: string[] }[];
  celebrations: { entityId: string; emoji: string }[];
  widgets: { widget: string; title: string; action: string }[];
  npcSuggestions: NpcSuggestion[];
}

type NpcSuggestion = {
  name: string;
  emoji: string;
  role: string;
  background: string;
  goals: string;
  personality: string;
  abilities: string;
  nativeLanguage: string;
  learningLanguage: string;
  voiceURI?: string;
  translationVoiceURI?: string;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Parse deployed HTML for <i data-aw="..."> triggers and apply them.
 * Robust: never throws on malformed input; unknown triggers are ignored.
 */
export function interpretTriggers(html: string, state: GameState): ParseResult {
  const speakQueue: SpeakJob[] = [];
  const visuals: VisualEvent[] = [];
  const prompts: { entityId: string; hints: string[] }[] = [];
  const celebrations: { entityId: string; emoji: string }[] = [];
  const widgets: { widget: string; title: string; action: string }[] = [];
  const npcSuggestions: NpcSuggestion[] = [];

  let nodes: Element[] = [];
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    nodes = Array.from(doc.querySelectorAll("[data-aw]"));
  } catch {
    nodes = [];
  }

  const next: GameState = structuredClone(state);
  const byId = (id: string) => next.entities.find((e) => e.id === id);
  const isAdult = next.settings.mode === "adult";

  const numKeys = new Set(["health", "hunger", "thirst", "score", "lives", "deaths"]);

  for (const el of nodes) {
    const aw = el.getAttribute("data-aw");
    const d = (k: string) => el.getAttribute(`data-${k}`) ?? "";
    try {
      switch (aw) {
        case "stat": {
          const e = byId(d("id"));
          if (!e) break;
          const key = d("key");
          if (!numKeys.has(key)) break;
          const val = Number(d("val")) || 0;
          const op = d("op") || "set";
          const cur = (e as unknown as Record<string, number>)[key] ?? 0;
          let nv = op === "add" ? cur + val : val;
          if (key === "health") nv = clamp(nv, 0, e.maxHealth);
          if (key === "hunger" || key === "thirst") nv = clamp(nv, 0, 100);
          if (key === "lives" || key === "deaths" || key === "score") nv = Math.max(0, Math.round(nv));
          (e as unknown as Record<string, number>)[key] = nv;
          if (key === "health" && nv <= 0 && !e.dead) markDead(e, undefined);
          break;
        }
        case "item": {
          const e = byId(d("id"));
          if (!e) break;
          const name = d("name") || "Item";
          const emoji = d("emoji") || "📦";
          const qty = Number(d("qty")) || 1;
          const rarity = ["common", "rare", "epic", "legendary"].includes(d("rarity")) ? (d("rarity") as "common" | "rare" | "epic" | "legendary") : "common";
          const existing = e.inventory.find((i) => i.name === name);
          if (existing) existing.qty += qty;
          else e.inventory.push({ id: nanoid(6), name, emoji, qty, rarity });
          celebrations.push({ entityId: e.id, emoji });
          break;
        }
        case "status": {
          const e = byId(d("id"));
          if (!e) break;
          e.statuses = e.statuses.filter((st) => st.label !== d("label"));
          e.statuses.push({ id: nanoid(6), emoji: d("emoji") || "✨", label: d("label") || "Status", turns: Number(d("turns")) || -1 });
          break;
        }
        case "powerup": {
          const e = byId(d("id"));
          if (!e) break;
          const n = d("name") || "Power";
          if (!e.powerUps.includes(n)) e.powerUps.push(n);
          celebrations.push({ entityId: e.id, emoji: "⚡" });
          break;
        }
        case "death": {
          const e = byId(d("id"));
          if (!e) break;
          const rev = d("revive") ? Number(d("revive")) : undefined;
          markDead(e, rev);
          break;
        }
        case "revive": {
          const e = byId(d("id"));
          if (!e) break;
          e.dead = false;
          e.reviveAt = undefined;
          e.health = Math.max(1, Math.round(e.maxHealth * 0.5));
          break;
        }
        case "relation": {
          const from = byId(d("from"));
          if (!from) break;
          const to = d("to");
          const op = d("op") || "set";
          const val = Number(d("val")) || 0;
          let r = from.relationships.find((x) => x.targetId === to);
          if (!r) {
            r = { targetId: to, value: 0 };
            from.relationships.push(r);
          }
          r.value = clamp(op === "add" ? r.value + val : val, -100, 100);
          break;
        }
        case "evolve": {
          if (!isAdult) break;
          const e = byId(d("id"));
          if (!e) break;
          // data-aw="evolve" now means "level up" — bumps the entity by 1.
          // (The old behavior of setting an arbitrary emoji is gone; the visible
          //  emoji is ALWAYS determined by the character's catalog ladder.)
          e.evolutionLevel = Math.max(0, Math.min(5, (e.evolutionLevel ?? 0) + 1));
          celebrations.push({ entityId: e.id, emoji: "🔱" });
          break;
        }
        case "weather":
          visuals.push({ kind: "weather", data: { kind: d("kind") || "clear" } });
          break;
        case "scare":
          // Per user request: do NOT auto-trigger jump-scares from HTML triggers. Skip silently.
          break;
        case "ring":
          visuals.push({ kind: "ring", data: {} });
          break;
        case "speak": {
          const text = d("text");
          if (text) speakQueue.push({ entityId: d("id") || "narrator", text, kind: d("kind") === "translation" ? "translation" : "line" });
          break;
        }
        case "prompt": {
          const id = d("id");
          if (id) prompts.push({ entityId: id, hints: [d("hint1"), d("hint2"), d("hint3")].filter(Boolean) });
          break;
        }
        case "widget":
          widgets.push({ widget: d("widget") || "custom", title: d("title") || "Canvas Widget", action: d("action") || "show" });
          break;
        case "suggest-npc":
          if (d("name")) {
            npcSuggestions.push({
              name: d("name"),
              emoji: d("emoji") || "👤",
              role: d("role") || "",
              background: d("background") || "",
              goals: d("goals") || "",
              personality: d("personality") || "",
              abilities: d("abilities") || "",
              nativeLanguage: d("nativelanguage") || "English",
              learningLanguage: d("learninglanguage") || "English",
              voiceURI: d("voiceuri") || undefined,
              translationVoiceURI: d("translationvoiceuri") || undefined,
            });
          }
          break;
      }
    } catch {
      /* skip malformed trigger */
    }
  }

  return { nextState: next, speakQueue, visuals, prompts, celebrations, widgets, npcSuggestions };
}

function markDead(e: Entity, reviveSec?: number) {
  if (!e.dead) e.deaths += 1;
  e.dead = true;
  e.health = 0;
  if (e.lives > 0 && reviveSec) e.lives -= 1;
  e.reviveAt = reviveSec ? Date.now() + reviveSec * 1000 : undefined;
}

/** Strip trigger + opening blocks before rendering so players never see them. */
export function sanitizeForCanvas(html: string): { visible: string; opening: string } {
  let opening = "";
  let visible = html;
  try {
    const doc = new DOMParser().parseFromString(`<div id="awroot">${html}</div>`, "text/html");
    const root = doc.getElementById("awroot")!;
    const op = root.querySelector(".aw-opening");
    if (op) opening = op.textContent?.trim() ?? "";
    root.querySelectorAll(".aw-triggers, .aw-opening").forEach((n) => n.remove());
    root.querySelectorAll("[data-aw]").forEach((n) => n.remove());
    visible = root.innerHTML;
  } catch {
    /* fall back to raw */
  }
  return { visible, opening };
}
