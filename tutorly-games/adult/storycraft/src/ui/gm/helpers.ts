import { store } from "../../engine/store";
import * as A from "../../engine/actions";
import * as E from "../../engine/exporter";
import { importJSON } from "../../engine/exporter";
import type { GameState, Universe } from "../../engine/types";

export const addUniverse = A.addUniverse;
export const updateUniverse = A.updateUniverse;
export const removeUniverse = A.removeUniverse;
export const setActiveUniverse = A.setActiveUniverse;

export const exportImport = {
  exportUni: (s: GameState) => E.exportUniverses(s),
  importUni: async () => {
    try {
      const data = (await importJSON()) as { universes?: Universe[] };
      if (data?.universes) {
        store.set((s) => ({ ...s, universes: [...s.universes, ...data.universes!] }));
      }
    } catch {
      /* cancelled */
    }
  },
  exportSession: (s: GameState) => E.exportSessionJSON(s),
  importSession: async () => {
    try {
      const data = (await importJSON()) as GameState;
      if (data?.entities && data?.universes) store.replace(data);
    } catch {
      /* cancelled */
    }
  },
};
