import { Suspense } from "react";
import StudioHost from "@/components/playroom/StudioHost";
import { GAME_IDS, type GameId } from "@/lib/playroom/catalog";

/**
 * One page per studio, produced at build time.
 *
 * A static export cannot render a dynamic route on demand, so the nine studio
 * slugs are listed here. `dynamicParams = false` makes any other slug a build
 * error rather than a silently missing page. An unknown slug that reaches the
 * page anyway (a hand-typed URL on the host) falls back to the first studio
 * instead of a blank screen.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return GAME_IDS.map((slug) => ({ slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gameId: GameId = (GAME_IDS as readonly string[]).includes(slug) ? (slug as GameId) : GAME_IDS[0];
  return (
    <Suspense fallback={null}>
      <StudioHost gameId={gameId} />
    </Suspense>
  );
}
