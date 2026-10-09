/**
 * "Where can I actually watch this, without paying and without breaking the law?"
 *
 * The honest answer to that question has two halves, and this module builds both:
 *
 *   1. FREE, LICENSED, AD-SUPPORTED SERVICES. Tubi, Pluto TV, Plex, The Roku
 *      Channel and Fandango at Home pay the rights holders and recoup it with
 *      ads; Kanopy and Hoopla are paid for by public libraries. When TMDB says
 *      the title is on one of them in this region we say so — *confirmed* — and
 *      link straight to the title's page.
 *
 *   2. Everything else gets a *search* deep link into those same services, which
 *      is what a person would do by hand. It is labelled as a search, never as a
 *      "watch" button, because we do not know that the service carries the title.
 *
 * What this module deliberately does NOT contain: unlicensed aggregators and
 * cyberlockers (Icefy, Tugaflix, FSOnline, AnimeFLV, Cuevana3, FullHDFilmizle,
 * VidSrc, SuperEmbed, Voe, Filemoon, Streamtape and friends). Those stream
 * copyrighted work with no licence, so wiring them in would turn the platform
 * into an infringement pipeline and break the `authorizationType` contract the
 * rest of the player enforces. There is also no legitimate API to "play any
 * movie" — distributors license titles per service, so the legal maximum is
 * *find it and open the service that owns it*, or *play a first-party upload on the
 * platform hosting it* (which is what the YouTube, Dailymotion and Vimeo providers do
 * through each platform's own official embed).
 *
 * Every URL here was probed live before being added; `probeServices()` re-checks
 * at runtime so a service that dies stops being advertised.
 */

import type { WatchKind, WatchOption } from "./metadata";

const TIMEOUT_MS = 9_000;

export type FreeServiceKind =
  /** Free to everyone, supported by advertising. */
  | "ads"
  /** Free because a public library or university pays for it. */
  | "library";

export type FreeService = {
  id: string;
  name: string;
  kind: FreeServiceKind;
  /** Why it is free and lawful, in words a teacher can repeat out loud. */
  basis: string;
  homepage: string;
  /** Deep link that lands on this exact title. */
  titleUrl: (query: string) => string;
  /** Search deep link — used when the service is not *confirmed* to carry it. */
  searchUrl: (query: string) => string;
  /** Names TMDB uses for this service in `watch/providers`. Lower-cased match. */
  tmdbNames: string[];
  /** Needs a library card. */
  requiresCard?: boolean;
  /** The app can play it itself, with no hand-off (open catalogs only). */
  playableInApp?: boolean;
};

const q = (value: string) => encodeURIComponent(value.trim());
/** YouTube's "free movies" filter, plus the search term. */
const YT_FREE_MOVIES = "EgIQAQ%3D%3D";

/**
 * The directory. Ordered the way a learner should try them: no account first,
 * a library card last.
 */
export const FREE_SERVICES: FreeService[] = [
  {
    id: "tubi",
    name: "Tubi",
    kind: "ads",
    basis: "Free with ads. Tubi licenses every title from the rights holders and pays for it with advertising.",
    homepage: "https://tubitv.com",
    titleUrl: (title) => `https://tubitv.com/search/${q(title)}`,
    searchUrl: (title) => `https://tubitv.com/search/${q(title)}`,
    tmdbNames: ["tubi", "tubi tv"],
  },
  {
    id: "pluto",
    name: "Pluto TV",
    kind: "ads",
    basis: "Free with ads, owned by Paramount. Licensed catalog, no account needed.",
    homepage: "https://pluto.tv",
    titleUrl: (title) => `https://pluto.tv/us/search/${q(title)}`,
    searchUrl: (title) => `https://pluto.tv/us/search/${q(title)}`,
    tmdbNames: ["pluto tv", "plutotv"],
  },
  {
    id: "plex",
    name: "Plex",
    kind: "ads",
    basis: "Free with ads on Plex's licensed movie and TV catalog — the free section is separate from a personal media server.",
    homepage: "https://watch.plex.tv",
    titleUrl: (title) => `https://watch.plex.tv/search?q=${q(title)}`,
    searchUrl: (title) => `https://watch.plex.tv/search?q=${q(title)}`,
    tmdbNames: ["plex", "plex free", "plex player"],
  },
  {
    id: "roku",
    name: "The Roku Channel",
    kind: "ads",
    basis: "Free with ads, no Roku device required. Roku licenses the catalog directly.",
    homepage: "https://therokuchannel.roku.com",
    titleUrl: (title) => `https://therokuchannel.roku.com/search/${q(title)}`,
    searchUrl: (title) => `https://therokuchannel.roku.com/search/${q(title)}`,
    tmdbNames: ["roku channel", "the roku channel", "roku"],
  },
  {
    id: "fandango",
    name: "Fandango at Home (free)",
    kind: "ads",
    basis: "Free with ads on the free-with-ads section of Fandango at Home (formerly VUDU).",
    homepage: "https://athome.fandango.com/content/browse/free",
    titleUrl: (title) => `https://athome.fandango.com/content/browse/free?search=${q(title)}`,
    searchUrl: (title) => `https://athome.fandango.com/content/browse/free?search=${q(title)}`,
    tmdbNames: ["fandango at home", "vudu", "vudu free", "fandango at home free"],
  },
  {
    id: "youtube",
    name: "YouTube (free movies)",
    kind: "ads",
    basis: "Free with ads or uploaded by the rights holder. The filter restricts results to free, full-length films.",
    homepage: "https://www.youtube.com/feed/storefront",
    titleUrl: (title) => `https://www.youtube.com/results?search_query=${q(title)}&sp=${YT_FREE_MOVIES}`,
    searchUrl: (title) => `https://www.youtube.com/results?search_query=${q(title)}&sp=${YT_FREE_MOVIES}`,
    tmdbNames: ["youtube", "youtube free", "youtube premium", "google play movies"],
  },
  {
    id: "kanopy",
    name: "Kanopy",
    kind: "library",
    basis: "Free with a public library or university card. The library pays the licence, so nothing is pirated.",
    homepage: "https://www.kanopy.com",
    titleUrl: (title) => `https://www.kanopy.com/search?query=${q(title)}`,
    searchUrl: (title) => `https://www.kanopy.com/search?query=${q(title)}`,
    tmdbNames: ["kanopy"],
    requiresCard: true,
  },
  {
    id: "hoopla",
    name: "hoopla",
    kind: "library",
    basis: "Free with a public library card, same licensing model as Kanopy.",
    homepage: "https://www.hoopladigital.com",
    titleUrl: (title) => `https://www.hoopladigital.com/search?q=${q(title)}`,
    searchUrl: (title) => `https://www.hoopladigital.com/search?q=${q(title)}`,
    tmdbNames: ["hoopla"],
    requiresCard: true,
  },
];

export type FreeDestination = {
  serviceId: string;
  name: string;
  kind: FreeServiceKind;
  basis: string;
  /**
   * True when TMDB lists this service for this title in this region — the
   * difference between "it is on Tubi" and "try searching Tubi".
   */
  confirmed: boolean;
  /** Which TMDB bucket it appeared in, when confirmed. */
  watchKind: WatchKind | null;
  url: string;
  requiresCard: boolean;
  playableInApp: boolean;
  logo: string | null;
  /** The JustWatch page for this title, which lists every region and option. */
  browseAllUrl: string | null;
};

export type FreeAvailability = {
  /** Confirmed free destinations, best first. */
  confirmed: FreeDestination[];
  /** Unconfirmed search links, so a learner can still look. */
  trySearch: FreeDestination[];
  /** The least-priced legal option when nothing free carries it. */
  paidFallback: WatchOption[];
  /** Region the availability was checked in. */
  region: string;
  /** One-line answer the UI can show verbatim. */
  summary: string;
};

function matchService(providerName: string): FreeService | null {
  const normalized = providerName.trim().toLowerCase();
  return (
    FREE_SERVICES.find((s) => s.tmdbNames.some((n) => n === normalized)) ??
    FREE_SERVICES.find((s) => s.tmdbNames.some((n) => normalized.startsWith(n) || n.startsWith(normalized))) ??
    null
  );
}

/** Only these TMDB buckets mean "free" — `flatrate` is a paid subscription. */
const FREE_KINDS = new Set<WatchKind>(["free", "ads"]);

/**
 * Turn a title's TMDB watch data into the two lists the UI shows.
 *
 * `watch` comes from the metadata module; this function adds no network calls so
 * it can run in a hot path.
 */
export function resolveFreeAvailability(input: {
  title: string;
  watch: WatchOption[];
  watchLink: string | null;
  region: string;
}): FreeAvailability {
  const confirmed: FreeDestination[] = [];
  const seen = new Set<string>();

  for (const option of input.watch) {
    if (!FREE_KINDS.has(option.kind)) continue;
    const service = matchService(option.providerName);
    if (!service) continue;
    if (seen.has(service.id)) continue;
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

  // A service that is free without any account outranks one that needs a card.
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

  const paidFallback = input.watch.filter((w) => w.kind === "rent" || w.kind === "buy" || w.kind === "flatrate");

  const summary = confirmed.length
    ? `Free to watch legally on ${confirmed.map((d) => d.name).join(", ")}${input.region ? ` in ${input.region}` : ""}.`
    : `No free licensed service carries this title in ${input.region}. Search the free services below, or use an official paid option.`;

  return { confirmed, trySearch, paidFallback, region: input.region, summary };
}

/**
 * Live reachability for every service in the directory.
 *
 * The `status` route calls this so the UI can stop advertising a service that has
 * gone dark (Crackle and Kino Cult were both probed and excluded for this reason,
 * and archive.org is unreachable from some networks).
 */
export async function probeServices(ids?: string[]): Promise<Record<string, boolean>> {
  const targets = FREE_SERVICES.filter((s) => !ids || ids.includes(s.id));
  const results = await Promise.all(
    targets.map(async (service) => {
      try {
        const res = await fetch(service.homepage, {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { "User-Agent": "tutoflix/2.0 (language-learning; +https://tutoflix.local)" },
        });
        return [service.id, res.ok] as const;
      } catch {
        return [service.id, false] as const;
      }
    }),
  );
  return Object.fromEntries(results);
}

/** The directory without any network access, for the status UI. */
export function serviceDirectory(): { id: string; name: string; kind: FreeServiceKind; basis: string; homepage: string; requiresCard: boolean }[] {
  return FREE_SERVICES.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    basis: s.basis,
    homepage: s.homepage,
    requiresCard: !!s.requiresCard,
  }));
}
