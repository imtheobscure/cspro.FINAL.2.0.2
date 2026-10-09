"use client";

import { useSearchParams } from "next/navigation";
import StudioPlayer from "./StudioPlayer";
import type { GameId } from "@/lib/playroom/catalog";

/**
 * `/studio/<slug>/?lesson=<id>` — the lesson id has to be read in the browser.
 *
 * The server build read `searchParams` in the page component. A static export
 * cannot: touching `searchParams` on the server would make the route dynamic.
 * The page therefore only resolves the slug (its nine values are known at build
 * time) and hands the lesson id to this client wrapper, which reads it from
 * `useSearchParams()`. The page wraps this in `<Suspense>` as Next requires.
 */
export default function StudioHost({ gameId }: { gameId: GameId }) {
  const params = useSearchParams();
  const lesson = params.get("lesson") ?? undefined;
  return <StudioPlayer gameId={gameId} initialLesson={lesson} />;
}
