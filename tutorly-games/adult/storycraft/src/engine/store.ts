import { useSyncExternalStore } from "react";
import { nanoid } from "nanoid";
import type { Channel, GameState, WireMessage } from "./types";
import { defaultState } from "./defaults";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/*
 * Storage and the GM↔canvas channel are namespaced with the game's own folder
 * name. They used to say `aetherweave`, an internal codename that appears nowhere
 * the tutor can see — so a key found while debugging the hub gave no clue which
 * game wrote it. Every game here namespaces its own keys (`ta.`, `so.`,
 * `speedreader.`); `storycraft` is the name in the URL, so it is the name here.
 */
const LS_KEY = "storycraft:state:v1";
const CHANNEL: Channel = "storycraft-sync";
const ORIGIN = nanoid(6);

function load(): GameState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return defaultState();
}

function migrate(s: GameState): GameState {
  // ensure newer fields exist
  const base = defaultState();
  return { ...base, ...s, settings: { ...base.settings, ...s.settings }, meta: { ...base.meta, ...s.meta } };
}

class Store {
  state: GameState = load();
  private listeners = new Set<() => void>();
  private bc: BroadcastChannel | null = null;
  private wireHandlers = new Set<(m: WireMessage) => void>();

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.bc = new BroadcastChannel(CHANNEL);
      this.bc.onmessage = (e: MessageEvent<WireMessage>) => {
        const m = e.data;
        if (!m || m.origin === ORIGIN) return;
        if (m.type === "STATE_PATCH") {
          this.state = m.state;
          this.persist();
          this.emit();
        } else if (m.type === "REQUEST_STATE") {
          this.broadcast({ type: "STATE_PATCH", state: this.state, origin: ORIGIN });
        } else {
          this.wireHandlers.forEach((h) => h(m));
        }
      };
      // Ask whoever is alive for fresh state
      this.broadcast({ type: "REQUEST_STATE", origin: ORIGIN });
    }
  }

  get origin() {
    return ORIGIN;
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = () => this.state;

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.state));
    } catch {
      /* quota */
    }
  }

  /** Apply a producer to state, persist, broadcast to other windows. */
  set(producer: (s: GameState) => GameState) {
    this.state = producer(structuredCloneSafe(this.state));
    this.persist();
    this.emit();
    this.broadcast({ type: "STATE_PATCH", state: this.state, origin: ORIGIN });
  }

  replace(s: GameState) {
    this.state = s;
    this.persist();
    this.emit();
    this.broadcast({ type: "STATE_PATCH", state: this.state, origin: ORIGIN });
  }

  broadcast(m: WireMessage) {
    this.bc?.postMessage(m);
  }

  /** Send a transient command (effect, countdown, deploy, speak) cross-window. */
  command(m: DistributiveOmit<WireMessage, "origin">) {
    const full = { ...m, origin: ORIGIN } as WireMessage;
    this.broadcast(full);
    // also dispatch locally so same-window listeners react
    this.wireHandlers.forEach((h) => h(full));
  }

  onWire(cb: (m: WireMessage) => void) {
    this.wireHandlers.add(cb);
    return () => {
      this.wireHandlers.delete(cb);
    };
  }
}

function structuredCloneSafe<T>(v: T): T {
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v));
  }
}

export const store = new Store();

export function useGameState(): GameState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function useSelector<T>(sel: (s: GameState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => sel(store.getSnapshot()),
    () => sel(store.getSnapshot()),
  );
}
