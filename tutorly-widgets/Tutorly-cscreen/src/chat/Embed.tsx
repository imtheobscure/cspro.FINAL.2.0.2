import { useState } from "react";
import type { ChatAttachment } from "../state/types";
import { Btn } from "../ui/primitives";
import { canFrame, hostOf } from "./links";

/**
 * Embedded media cards.
 *
 * Two rules learned the hard way: a video must never start playing by itself in
 * the middle of a lesson (so YouTube waits for one click on the poster), and a
 * site that refuses to be framed must say so instead of showing a blank box —
 * some of the biggest hosts send `X-Frame-Options: DENY`.
 */
export function YouTubeCard({ a }: { a: ChatAttachment }) {
  const [playing, setPlaying] = useState(false);
  /**
   * Posters are picked widest-first.
   *
   * The player is 16:9, and `hqdefault` is 4:3 — drawn into a 16:9 box it loses the
   * top and bottom of the frame, which is exactly what "half the video is outside
   * the frame" looks like. `maxresdefault` is the true 16:9 artwork; it only exists
   * for some videos, so a failed load (or YouTube's 120 px grey placeholder) steps
   * down the list until something real is on screen.
   */
  const [posterIdx, setPosterIdx] = useState(0);
  const posters = posterCandidates(a);
  const thumb = posters[posterIdx];
  const nextPoster = () => setPosterIdx((i) => Math.min(i + 1, posters.length - 1));
  return (
    <div className="w-full max-w-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95">
      <div className="relative aspect-video w-full bg-black">
        {playing && a.embedUrl ? (
          <iframe
            src={`${a.embedUrl}&autoplay=1`}
            title={a.title || "YouTube video"}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" className="group absolute inset-0" onClick={() => setPlaying(true)} title="Play video">
            {thumb ? (
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover opacity-90"
                onError={nextPoster}
                onLoad={(e) => {
                  // 120 px wide is YouTube's "no artwork of this size" placeholder
                  if (e.currentTarget.naturalWidth <= 120) nextPoster();
                }}
              />
            ) : (
              <div className="h-full w-full bg-slate-800" />
            )}
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-rose-600 text-2xl text-white shadow-xl transition group-hover:scale-110">▶</span>
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-sm">▶️</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-white">{a.title || "YouTube video"}</div>
          <div className="truncate text-[11px] text-white/60">{a.author || hostOf(a.url)}</div>
        </div>
        <a href={a.url} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/20">
          Open ↗
        </a>
      </div>
    </div>
  );
}

/**
 * Artwork for a video, best first: true 16:9, then the 4:3 still YouTube always
 * has, then whatever the link card was given. The id is recovered from either the
 * embed URL or an existing thumbnail, so rooms saved before this fix get the wide
 * poster too.
 */
function posterCandidates(a: ChatAttachment): string[] {
  const id =
    a.embedUrl?.match(/embed\/([\w-]{6,})/)?.[1] ??
    a.thumb?.match(/\/vi\/([\w-]{6,})\//)?.[1] ??
    "";
  if (!id) return a.thumb ? [a.thumb] : [];
  const wide = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const still = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return [wide, still, ...(a.thumb && a.thumb !== wide && a.thumb !== still ? [a.thumb] : [])];
}


export function SoundCloudCard({ a }: { a: ChatAttachment }) {
  return (
    <div className="overflow-hidden rounded-xl border border-orange-200 bg-white w-[min(28rem,100%)]">
      <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-white">
        <span className="text-sm">🎧</span>
        <span className="text-[11px] font-bold uppercase tracking-wider">SoundCloud</span>
        <span className="flex-1" />
        <a href={a.url} target="_blank" rel="noreferrer" className="text-[11px] underline decoration-white/60 hover:text-white/80">
          open ↗
        </a>
      </div>
      {a.embedUrl ? (
        <iframe
          src={a.embedUrl}
          title={a.title || "SoundCloud track"}
          className="block w-full"
          height={a.audioOnly ? 120 : 166}
          allow="autoplay"
          scrolling="no"
        />
      ) : (
        <div className="p-3 text-xs text-slate-500">Player unavailable for this link.</div>
      )}
      {a.title && <div className="truncate px-3 pb-2 text-[11px] text-slate-500">{a.title}</div>}
    </div>
  );
}

/**
 * A live site inside the chat. Sites that are known to refuse framing get the
 * honest treatment: a link card plus a "try to load anyway" button.
 */
export function SiteCard({ a }: { a: ChatAttachment }) {
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false);
  const frameable = canFrame(a.url);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white w-[min(34rem,100%)]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
        <span className="text-sm">🌐</span>
        <span className="truncate text-[11px] font-semibold text-slate-600">{a.provider || hostOf(a.url)}</span>
        <span className="flex-1" />
        <a href={a.url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline">
          open ↗
        </a>
      </div>
      {loaded ? (
        <iframe
          src={a.url}
          title={a.title || a.provider || "Embedded site"}
          className="block h-[22rem] w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="space-y-2 p-3">
          <div className="truncate text-[13px] font-semibold text-slate-800">{a.title || a.url}</div>
          <p className="text-[11px] text-slate-500">
            {frameable
              ? "Loading a live page inside the chat can be heavy — press to load it here."
              : "This site usually refuses to be embedded in another page, so it will most likely stay blank. Open it in a tab instead."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn size="sm" variant="soft" onClick={() => { setTried(true); setLoaded(true); }}>
              🖼 Load inside chat
            </Btn>
            <a href={a.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50">
              Open in a new tab ↗
            </a>
          </div>
          {tried && <div className="text-[11px] text-amber-600">If the frame stays blank, the site blocked embedding — use “open in a new tab”.</div>}
        </div>
      )}
    </div>
  );
}
