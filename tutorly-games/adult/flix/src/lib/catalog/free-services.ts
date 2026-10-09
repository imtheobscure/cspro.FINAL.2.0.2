/**
 * "Where can I watch this for free, without pirating it?"
 *
 * The licensed answer has two halves:
 *
 *   1. Genuinely free services that pay the rights holders — Tubi, Pluto TV,
 *      Plex, The Roku Channel and Fandango at Home with advertising, Kanopy and
 *      hoopla through a library card. When TMDB says the title is on one of them
 *      in this region the entry is *confirmed*; otherwise it is a *search* link,
 *      which is what a person would do by hand.
 *   2. The open catalogs this app can play itself (Internet Archive, Wikimedia
 *      Commons) — public domain and Creative Commons only.
 *
 * Deliberately absent: unlicensed aggregators and cyberlockers (Icefy, Tugaflix,
 * FSOnline, AnimeFLV, Cuevana3, FullHDFilmizle, VidSrc, SuperEmbed, Voe,
 * Filemoon, Streamtape…). They stream commercial films with no licence, so
 * integrating them would break this app's own `authorizationType` contract and
 * make it an infringement tool. There is likewise no legal API that plays "any
 * movie": rights are licensed per service, so the honest maximum is *find it and
 * open the service that owns it*, plus playing what is actually free to play.
 *
 * Same directory as Flix V2's `modules/discovery/free-services.ts`; every URL
 * was probed live before being listed here (Crackle and Kino Cult were dropped
 * for not answering).
 */

import type { CatalogWatch, WatchKind } from "./types";

export type FreeServiceKind = "ads" | "library" | "public";

export type FreeService = {
  id: string;
  name: string;
  kind: FreeServiceKind;
  /** Why it is free and lawful, in words a teacher can repeat. */
  basis: string;
  homepage: string;
  titleUrl: (title: string) => string;
  searchUrl: (title: string) => string;
  /** Names TMDB uses in `watch/providers`, lower-cased. */
  tmdbNames: string[];
  requiresCard?: boolean;
  playableInApp?: boolean;
};

const q = (value: string) => encodeURIComponent(value.trim());
/** YouTube's "free movies" result filter. */
const YT_FREE_MOVIES = "EgIQAQ%3D%3D";

export const FREE_SERVICES: FreeService[] = [
  {
    id: "tubi",
    name: "Tubi",
    kind: "ads",
    basis: "Free with ads. Tubi licenses its catalog from the rights holders and pays for it with advertising.",
    homepage: "https://tubitv.com",
    titleUrl: (t) => `https://tubitv.com/search/${q(t)}`,
    searchUrl: (t) => `https://tubitv.com/search/${q(t)}`,
    tmdbNames: ["tubi", "tubi tv"],
  },
  {
    id: "pluto",
    name: "Pluto TV",
    kind: "ads",
    basis: "Free with ads, owned by Paramount. Licensed catalog, no account needed.",
    homepage: "https://pluto.tv",
    titleUrl: (t) => `https://pluto.tv/us/search/${q(t)}`,
    searchUrl: (t) => `https://pluto.tv/us/search/${q(t)}`,
    tmdbNames: ["pluto tv", "plutotv"],
  },
  {
    id: "plex",
    name: "Plex",
    kind: "ads",
    basis: "Free with ads on Plex's licensed catalog — separate from a personal media server.",
    homepage: "https://watch.plex.tv",
    titleUrl: (t) => `https://watch.plex.tv/search?q=${q(t)}`,
    searchUrl: (t) => `https://watch.plex.tv/search?q=${q(t)}`,
    tmdbNames: ["plex", "plex free", "plex player"],
  },
  {
    id: "roku",
    name: "The Roku Channel",
    kind: "ads",
    basis: "Free with ads, no Roku device required. Roku licenses the catalog directly.",
    homepage: "https://therokuchannel.roku.com",
    titleUrl: (t) => `https://therokuchannel.roku.com/search/${q(t)}`,
    searchUrl: (t) => `https://therokuchannel.roku.com/search/${q(t)}`,
    tmdbNames: ["roku channel", "the roku channel", "roku"],
  },
  {
    id: "fandango",
    name: "Fandango at Home (free)",
    kind: "ads",
    basis: "Free with ads on the free section of Fandango at Home (formerly VUDU).",
    homepage: "https://athome.fandango.com/content/browse/free",
    titleUrl: (t) => `https://athome.fandango.com/content/browse/free?search=${q(t)}`,
    searchUrl: (t) => `https://athome.fandango.com/content/browse/free?search=${q(t)}`,
    tmdbNames: ["fandango at home", "fandango at home free", "vudu", "vudu free"],
  },
  {
    id: "youtube",
    name: "YouTube (free movies)",
    kind: "ads",
    basis: "Free with ads or uploaded by the rights holder; the filter limits results to free full-length films.",
    homepage: "https://www.youtube.com/feed/storefront",
    titleUrl: (t) => `https://www.youtube.com/results?search_query=${q(t)}&sp=${YT_FREE_MOVIES}`,
    searchUrl: (t) => `https://www.youtube.com/results?search_query=${q(t)}&sp=${YT_FREE_MOVIES}`,
    tmdbNames: ["youtube", "youtube free", "youtube premium", "google play movies"],
  },
  {
    id: "kanopy",
    name: "Kanopy",
    kind: "library",
    basis: "Free with a public library or university card — the library pays the licence.",
    homepage: "https://www.kanopy.com",
    titleUrl: (t) => `https://www.kanopy.com/search?query=${q(t)}`,
    searchUrl: (t) => `https://www.kanopy.com/search?query=${q(t)}`,
    tmdbNames: ["kanopy"],
    requiresCard: true,
  },
  {
    id: "hoopla",
    name: "hoopla",
    kind: "library",
    basis: "Free with a public library card, the same licensing model as Kanopy.",
    homepage: "https://www.hoopladigital.com",
    titleUrl: (t) => `https://www.hoopladigital.com/search?q=${q(t)}`,
    searchUrl: (t) => `https://www.hoopladigital.com/search?q=${q(t)}`,
    tmdbNames: ["hoopla"],
    requiresCard: true,
  },
  {
    id: "internet-archive",
    name: "Internet Archive",
    kind: "public",
    basis: "Public-domain and Creative Commons films. Plays inside this app — no hand-off.",
    homepage: "https://archive.org/details/movies",
    titleUrl: (t) => `https://archive.org/search?query=${q(t)}&and[]=mediatype%3A%22movies%22`,
    searchUrl: (t) => `https://archive.org/search?query=${q(t)}&and[]=mediatype%3A%22movies%22`,
    tmdbNames: ["internet archive"],
    playableInApp: true,
  },
  {
    id: "wikimedia",
    name: "Wikimedia Commons",
    kind: "public",
    basis: "Freely licensed media with explicit licence tags. Plays inside this app — no hand-off.",
    homepage: "https://commons.wikimedia.org/wiki/Category:Videos",
    titleUrl: (t) => `https://commons.wikimedia.org/w/index.php?search=${q(t)}&title=Special:MediaSearch&type=video`,
    searchUrl: (t) => `https://commons.wikimedia.org/w/index.php?search=${q(t)}&title=Special:MediaSearch&type=video`,
    tmdbNames: ["wikimedia"],
    playableInApp: true,
  },
];

export type FreeDestination = {
  serviceId: string;
  name: string;
  kind: FreeServiceKind;
  basis: string;
  /** True when TMDB lists this service for this title in this region. */
  confirmed: boolean;
  watchKind: WatchKind | null;
  url: string;
  requiresCard: boolean;
  playableInApp: boolean;
  logo: string | null;
  browseAllUrl: string | null;
};

export type FreeAvailability = {
  confirmed: FreeDestination[];
  trySearch: FreeDestination[];
  region: string;
  /** One-line answer the panel can show verbatim. */
  summary: string;
};

function matchService(providerName: string): FreeService | null {
  const n = providerName.trim().toLowerCase();
  return (
    FREE_SERVICES.find((s) => s.tmdbNames.some((name) => name === n)) ??
    FREE_SERVICES.find((s) => s.tmdbNames.some((name) => n.startsWith(name) || name.startsWith(n))) ??
    null
  );
}

/** Only these TMDB buckets mean free — `flatrate` is a paid subscription. */
const FREE_KINDS: ReadonlySet<WatchKind> = new Set<WatchKind>(["free", "ads"]);

export function resolveFreeAvailability(input: {
  title: string;
  watch: CatalogWatch[];
  watchLink: string | null;
  region: string;
}): FreeAvailability {
  const confirmed: FreeDestination[] = [];
  const seen = new Set<string>();

  for (const option of input.watch) {
    if (!FREE_KINDS.has(option.kind)) continue;
    const service = matchService(option.provider);
    if (!service || seen.has(service.id)) continue;
    seen.add(service.id);
    confirmed.push({
      serviceId: service.id,
      name: service.name,
      kind: service.kind,
      basis: service.basis,
      confirmed: true,
      watchKind: option.kind,
      url: service.titleUrl(input.title),
      requiresCard: !!service.requiresCard,
      playableInApp: !!service.playableInApp,
      logo: option.logo,
      browseAllUrl: input.watchLink,
    });
  }

  // Playable-in-app first, then no-account free, then card-required.
  const rank = (d: FreeDestination) => (d.playableInApp ? 0 : d.requiresCard ? 2 : 1);
  confirmed.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  const trySearch: FreeDestination[] = FREE_SERVICES.filter((s) => !seen.has(s.id)).map((service) => ({
    serviceId: service.id,
    name: service.name,
    kind: service.kind,
    basis: service.basis,
    confirmed: false,
    watchKind: null,
    url: service.searchUrl(input.title),
    requiresCard: !!service.requiresCard,
    playableInApp: !!service.playableInApp,
    logo: null,
    browseAllUrl: input.watchLink,
  }));

  const region = input.region || "US";
  const summary = confirmed.length
    ? `Free to watch legally on ${confirmed.map((d) => d.name).join(", ")} in ${region}.`
    : `No free licensed service carries this title in ${region} — search them below, or use an official paid option.`;

  return { confirmed, trySearch, region, summary };
}
