"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export type DragPayload = {
  /** the thing being moved (word id / item id) */
  id: string;
  /** what the floating ghost should look like */
  ghost: ReactNode;
};

type DragState = {
  payload: DragPayload | null;
  x: number;
  y: number;
  over: string | null;
  start: (e: React.PointerEvent, payload: DragPayload) => void;
  dragging: boolean;
};

const Ctx = createContext<DragState | null>(null);

export function DragProvider({ children, onDrop }: { children: ReactNode; onDrop?: (dragId: string, dropId: string) => void }) {
  const [payload, setPayload] = useState<DragPayload | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [over, setOver] = useState<string | null>(null);
  const moved = useRef(false);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  const start = useCallback((e: React.PointerEvent, p: DragPayload) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
    moved.current = false;
    setPayload(p);
    setPos({ x: e.clientX, y: e.clientY });
    setOver(hitTest(e.clientX, e.clientY));
  }, []);

  useEffect(() => {
    if (!payload) return;
    const move = (e: PointerEvent) => {
      moved.current = true;
      setPos({ x: e.clientX, y: e.clientY });
      setOver(hitTest(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const target = hitTest(e.clientX, e.clientY);
      if (target && payload) dropRef.current?.(payload.id, target);
      setPayload(null);
      setOver(null);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [payload]);

  const value = useMemo<DragState>(
    () => ({ payload, x: pos.x, y: pos.y, over, start, dragging: Boolean(payload) }),
    [payload, pos, over, start],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {payload && (
        <div className="dragging-ghost" style={{ left: pos.x, top: pos.y }}>
          {payload.ghost}
        </div>
      )}
    </Ctx.Provider>
  );
}

function hitTest(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const drop = el?.closest("[data-drop]") as HTMLElement | null;
  return drop?.dataset.drop ?? null;
}

export function useDrag() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDrag must be used inside <DragProvider>");
  return v;
}
