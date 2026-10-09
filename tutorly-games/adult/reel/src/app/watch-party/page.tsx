import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@/db";
import { episodes, users, watchParties } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog } from "@/lib/queries";
import { WatchPartyLobby } from "@/components/WatchPartyLobby";
import { Card, SectionTitle } from "@/components/ui";

export default async function WatchPartyPage() {
  await getCurrentUser();
  const catalog = await getCatalog();
  const recent = await db
    .select({ party: watchParties, episode: episodes, host: users })
    .from(watchParties)
    .innerJoin(episodes, eq(episodes.id, watchParties.episodeId))
    .innerJoin(users, eq(users.id, watchParties.hostUserId))
    .where(eq(watchParties.active, true))
    .orderBy(desc(watchParties.updatedAt))
    .limit(8);
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub="Study together: synchronized playback, shared subtitles, presence — every participant streams the authorized video locally.">Watch Party</SectionTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <WatchPartyLobby episodes={catalog.episodes.map((e) => ({ id: e.id, title: e.title, thumbnail: e.thumbnail, episodeNumber: e.episodeNumber }))} />
        <div className="space-y-4">
          <Card>
            <h2 className="flex items-center gap-2 font-bold"><Users size={16} /> Open rooms</h2>
            <ul className="mt-3 space-y-2">
              {recent.map(({ party, episode, host }) => (
                <li key={party.id}>
                  <Link href={`/watch/${episode.id}?party=${party.code}`} className="flex items-center gap-3 rounded-xl border border-white/10 p-2 hover:bg-white/5">
                    <div className="h-12 w-20 overflow-hidden rounded-lg bg-zinc-800">{episode.thumbnail && <img src={episode.thumbnail} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{episode.title}</div>
                      <div className="text-xs text-zinc-400">host {host.name} · {party.mode} · <span className="font-mono">{party.code}</span></div>
                    </div>
                  </Link>
                </li>
              ))}
              {!recent.length && <li className="text-sm text-zinc-500">No open rooms yet — create one.</li>}
            </ul>
          </Card>
          <Card>
            <h2 className="font-bold">How sync works</h2>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-400">
              <li>The host's play / pause / seek / rate events publish a timestamped room state.</li>
              <li>Participants compute the expected position from server time and correct drift: small drift → smooth rate nudge, large drift → seek.</li>
              <li>Late joiners receive the current state immediately; episode changes follow the host.</li>
              <li>Modes: host-controlled, follow-host, independent.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
