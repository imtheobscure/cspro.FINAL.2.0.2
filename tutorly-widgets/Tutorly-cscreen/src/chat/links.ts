import type { ChatAttachment, ChatAttachmentKind } from "../state/types";
import { uid } from "../state/store";

/**
 * Turn whatever the tutor pastes into a real attachment.
 *
 * A pasted link is the fastest way to get a YouTube clip, a SoundCloud track or
 * a live website into the room, so this module recognises the providers whose
 * player can be framed, and leaves everything else as an honest link card.
 */

export interface DetectedLink {
  kind: ChatAttachmentKind;
  url: string;
  embedUrl?: string;
  provider?: string;
  title?: string;
  thumb?: string;
  audioOnly?: boolean;
}

const URL_RX = /https?:\/\/[^\s<>"')\]]+/gi;

export function findUrls(text: string): string[] {
  const found = text.match(URL_RX);
  return found ? [...new Set(found.map((u) => u.replace(/[.,;]+$/, "")))] : [];
}

export function youtubeId(url: string): { id: string; start?: number } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] || "";
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] || "";
      else if (u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2] || "";
    }
    if (!/^[\w-]{6,}$/.test(id)) return null;
    const t = u.searchParams.get("t") || u.searchParams.get("start") || "";
    const start = /^\d+$/.test(t) ? Number(t) : /^(\d+)s$/.test(t) ? Number(t.replace("s", "")) : undefined;
    return { id, start };
  } catch {
    return null;
  }
}

export function isSoundCloud(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "soundcloud.com" || host === "on.soundcloud.com" || host.endsWith(".soundcloud.com");
  } catch {
    return false;
  }
}

export function isDirectMedia(url: string): ChatAttachmentKind | null {
  try {
    const p = new URL(url).pathname.toLowerCase();
    if (/\.(png|jpe?g|webp|avif|bmp|svg)$/.test(p)) return "image";
    if (/\.gifv?$/.test(p)) return "gif";
    if (/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/.test(p)) return "audio";
    if (/\.(mp4|webm|ogv|mov|m4v)$/.test(p)) return "video";
    if (/\.pdf$/.test(p)) return "file";
  } catch {}
  return null;
}

export function detectLink(rawUrl: string): DetectedLink {
  const yt = youtubeId(rawUrl);
  if (yt) {
    return {
      kind: "youtube",
      url: rawUrl,
      provider: "YouTube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt.id}?rel=0&modestbranding=1${yt.start ? `&start=${yt.start}` : ""}`,
      // 16:9 artwork — the player is 16:9 too, so the poster is shown whole.
      thumb: `https://i.ytimg.com/vi/${yt.id}/maxresdefault.jpg`,
    };
  }
  if (isSoundCloud(rawUrl)) {
    return {
      kind: "soundcloud",
      url: rawUrl,
      provider: "SoundCloud",
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(rawUrl)}&color=%236366f1&auto_play=false&hide_related=true&show_comments=false&show_user=true&visual=false`,
      audioOnly: true,
    };
  }
  const direct = isDirectMedia(rawUrl);
  if (direct) return { kind: direct, url: rawUrl, provider: hostOf(rawUrl) };
  return { kind: "site", url: rawUrl, provider: hostOf(rawUrl) };
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function attachmentFromLink(url: string): ChatAttachment {
  const d = detectLink(url);
  return {
    id: uid("att_"),
    kind: d.kind,
    url: d.url,
    embedUrl: d.embedUrl,
    provider: d.provider,
    thumb: d.thumb,
    title: d.title,
    author: undefined,
    audioOnly: d.audioOnly,
  };
}

/**
 * Ask the provider what the link actually is, so a pasted YouTube/SoundCloud link
 * shows a real title instead of a naked URL. Best effort: no key, no proxy, and a
 * silent failure keeps the card usable without metadata.
 */
export async function fetchLinkMetadata(url: string): Promise<Partial<ChatAttachment>> {
  const yt = youtubeId(url);
  const endpoint = yt
    ? `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    : isSoundCloud(url)
      ? `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`
      : "";
  if (!endpoint) return {};
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(endpoint, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return {};
    const data = await res.json();
    return {
      title: typeof data.title === "string" ? data.title : undefined,
      author: typeof data.author_name === "string" ? data.author_name : undefined,
      thumb: typeof data.thumbnail_url === "string" ? data.thumbnail_url : undefined,
    };
  } catch {
    return {};
  }
}

/** A site we cannot frame is worse than a link — these are known refusers. */
const NO_EMBED_HOSTS = [
  "google.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "linkedin.com",
  "netflix.com",
  "amazon.com",
  "whatsapp.com",
  "reddit.com",
  "chatgpt.com",
  "openai.com",
];

export function canFrame(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return !NO_EMBED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** For the link-preview bar: a one-line, human summary of a detected URL. */
export function describeLink(url: string): string {
  const d = detectLink(url);
  const yt = youtubeId(url);
  switch (d.kind) {
    case "youtube":
      return `YouTube video${yt?.start ? ` from ${yt.start}s` : ""}`;
    case "soundcloud":
      return "SoundCloud track";
    case "image":
      return "Image";
    case "gif":
      return "GIF";
    case "audio":
      return "Audio file";
    case "video":
      return "Video file";
    case "file":
      return "Document";
    default:
      return `Website · ${d.provider}`;
  }
}
