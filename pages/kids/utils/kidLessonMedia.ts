/* ════════════════════════════════════════════════════════════════════════════
   🆓 KID LESSON MEDIA — the free places a lesson is allowed to point at
   ════════════════════════════════════════════════════════════════════════════

   `kidFreeMedia.ts` fetches pictures and voices *for* the app at runtime. This
   file is the other half: the list of free, public, kid-safe places an AI is
   allowed to pull a lesson's media LINKS from — a song on YouTube, a ready-made
   activity on Wordwall, a read-aloud on Storyline Online, a sound effect, a crisp
   SVG emoji.

   Two reasons it is a fixed list rather than "ask the model for any URL":

     1. **A guessed URL 404s on a projector.** The single worst moment in a
        children's lesson is the tutor pressing play and getting a broken page in
        front of thirty kids. So every source here is one a tutor can search and
        play in seconds, and every one of them is free and needs no account for
        the parts a class actually uses.
     2. **Safety is a property of the source, not the search.** YouTube is where
        the songs are, and it is also where a search can go badly. These are the
        named, well-known, kid-facing channels and libraries teachers already use,
        plus the search page as the fallback whenever a specific link may have
        moved — which, in 2026, some always have.

   Nothing here is fetched or verified by the app; it is a *sourcebook* that goes
   into the AI prompt and a reference the tutor sees beside each link.
   ════════════════════════════════════════════════════════════════════════════ */

import type { KidAgeBand } from './lessonCreatorTypes';

export type KidFreeSourceKind = 'video' | 'audio' | 'activity' | 'picture' | 'story';

export interface KidFreeSource {
  id: string;
  /** What the tutor sees. */
  label: string;
  emoji: string;
  kind: KidFreeSourceKind;
  /** The site or channel root. */
  url: string;
  /** The page you would search from when the exact link is not known. */
  searchUrl: string;
  /** Bands this source is best for. Empty = both. */
  bands?: KidAgeBand[];
  /** One short line, in plain words, for the tutor and the prompt. */
  note: string;
}

/**
 * The sourcebook.
 *
 * Ordered songs-first for the little ones and read/think-first for 5+, because the
 * order is a hint to the model about what a lesson at that age reaches for.
 */
export const KID_FREE_SOURCES: KidFreeSource[] = [
  /* ── Songs and videos ───────────────────────────────────────────────────── */
  {
    id: 'superSimpleSongs',
    label: 'Super Simple Songs',
    emoji: '🎵',
    kind: 'video',
    url: 'https://www.youtube.com/@SuperSimpleSongs',
    searchUrl: 'https://www.youtube.com/results?search_query=super+simple+songs+',
    bands: ['veryYoung'],
    note: 'The safest bet for a song a 2-5 class can sing and copy. Calm, slow, one idea per song.',
  },
  {
    id: 'dreamEnglishKids',
    label: 'Dream English Kids',
    emoji: '🎤',
    kind: 'video',
    url: 'https://www.youtube.com/@DreamEnglishKids',
    searchUrl: 'https://www.youtube.com/results?search_query=dream+english+kids+',
    bands: ['veryYoung', 'young'],
    note: 'Chants and action songs built exactly for TPR and circle time.',
  },
  {
    id: 'pinkfong',
    label: 'Pinkfong',
    emoji: '🐯',
    kind: 'video',
    url: 'https://www.youtube.com/@Pinkfong',
    searchUrl: 'https://www.youtube.com/results?search_query=pinkfong+',
    bands: ['veryYoung'],
    note: 'Loud, bright and catchy. Use one short clip, never a whole compilation.',
  },
  {
    id: 'cocomelon',
    label: 'Cocomelon',
    emoji: '🍉',
    kind: 'video',
    url: 'https://www.youtube.com/@CoComelon',
    searchUrl: 'https://www.youtube.com/results?search_query=cocomelon+',
    bands: ['veryYoung'],
    note: 'Very familiar to toddlers. A 60-second slice is plenty.',
  },
  {
    id: 'britishCouncilKids',
    label: 'British Council LearnEnglish Kids',
    emoji: '🇬🇧',
    kind: 'video',
    url: 'https://learnenglishkids.britishcouncil.org',
    searchUrl: 'https://learnenglishkids.britishcouncil.org/search?keys=',
    bands: ['young'],
    note: 'Free songs, stories, games and worksheets made by teachers. No account needed for most of it.',
  },
  {
    id: 'storylineOnline',
    label: 'Storyline Online',
    emoji: '📖',
    kind: 'story',
    url: 'https://storylineonline.net',
    searchUrl: 'https://storylineonline.net/library',
    note: 'Free picture books read aloud by actors, with the pictures on screen. Perfect for story time, and lovely for a 4-year-old too.',
  },
  {
    id: 'oxfordOwl',
    label: 'Oxford Owl free eBooks',
    emoji: '🦉',
    kind: 'story',
    url: 'https://www.oxfordowl.co.uk/for-home/find-a-book/library-page/',
    searchUrl: 'https://www.oxfordowl.co.uk/for-home/find-a-book/library-page/',
    bands: ['young'],
    note: 'Free levelled reading books to read together on screen. A free sign-in may be asked for; use it as homework, not in class.',
  },
  {
    id: 'natGeoKids',
    label: 'National Geographic Kids',
    emoji: '🐘',
    kind: 'video',
    url: 'https://kids.nationalgeographic.com',
    searchUrl: 'https://kids.nationalgeographic.com/search?q=',
    bands: ['young'],
    note: 'Short, real, beautiful animal videos a child will actually watch. Real photographs of real things.',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    emoji: '▶️',
    kind: 'video',
    url: 'https://www.youtube.com',
    searchUrl: 'https://www.youtube.com/results?search_query=',
    note: 'The fallback for any song or clip. Always give the tutor the SEARCH link when the exact video is not certain, never an invented video id.',
  },

  /* ── Free audio and sound ───────────────────────────────────────────────── */
  {
    id: 'pixabayAudio',
    label: 'Pixabay free music & sound',
    emoji: '🎧',
    kind: 'audio',
    url: 'https://pixabay.com/music/',
    searchUrl: 'https://pixabay.com/music/search/',
    note: 'Free background music and sound effects with no attribution needed. Good for a chant backing track.',
  },
  {
    id: 'freesound',
    label: 'Freesound',
    emoji: '🔊',
    kind: 'audio',
    url: 'https://freesound.org',
    searchUrl: 'https://freesound.org/search/?q=',
    note: 'Real sound effects (a duck, rain, a doorbell). Filter to CC0 so no credit is needed.',
  },
  {
    id: 'wikimediaAudio',
    label: 'Wikimedia Commons audio',
    emoji: '🗣️',
    kind: 'audio',
    url: 'https://commons.wikimedia.org/wiki/Category:Audio_files',
    searchUrl: 'https://commons.wikimedia.org/w/index.php?search=&title=Special:MediaSearch&type=audio',
    note: 'Free human recordings of single words (the app already uses these for pronunciation).',
  },
  {
    id: 'linguaLibre',
    label: 'Lingua Libre',
    emoji: '🎙️',
    kind: 'audio',
    url: 'https://lingualibre.org',
    searchUrl: 'https://lingualibre.org/wiki/Special:Search',
    note: 'Volunteer recordings of single words — the clearest way to hear a real person say the word.',
  },
  {
    id: 'freeMusicArchive',
    label: 'Free Music Archive',
    emoji: '🎼',
    kind: 'audio',
    url: 'https://freemusicarchive.org',
    searchUrl: 'https://freemusicarchive.org/search?quicksearch=',
    note: 'Free songs and instrumentals for a warm-up or a wind-down. Check the licence on the track page.',
  },

  /* ── Ready-made free activities ─────────────────────────────────────────── */
  {
    id: 'wordwall',
    label: 'Wordwall',
    emoji: '🧩',
    kind: 'activity',
    url: 'https://wordwall.net',
    searchUrl: 'https://wordwall.net/en-us/community?query=',
    bands: ['young'],
    note: 'Ready-made click-and-play games. Use the free community ones — a class can play without everyone logging in.',
  },
  {
    id: 'baamboozle',
    label: 'Baamboozle',
    emoji: '🎉',
    kind: 'activity',
    url: 'https://www.baamboozle.com',
    searchUrl: 'https://www.baamboozle.com/games?q=',
    bands: ['young'],
    note: 'Team quiz games. Wonderful for a whole class on one screen; two teams, no pupil devices needed.',
  },
  {
    id: 'kahoot',
    label: 'Kahoot!',
    emoji: '🟣',
    kind: 'activity',
    url: 'https://create.kahoot.it',
    searchUrl: 'https://create.kahoot.it/discover',
    bands: ['young'],
    note: 'Free quizzes playable on one shared screen in "team mode". Brilliant for a TTT boss battle.',
  },
  {
    id: 'blooket',
    label: 'Blooket',
    emoji: '🦊',
    kind: 'activity',
    url: 'https://www.blooket.com',
    searchUrl: 'https://www.blooket.com/discover',
    bands: ['young'],
    note: 'Game quizzes children ask for again. Search for the topic; use a free set.',
  },
  {
    id: 'quizlet',
    label: 'Quizlet',
    emoji: '🃏',
    kind: 'activity',
    url: 'https://quizlet.com',
    searchUrl: 'https://quizlet.com/search?query=',
    bands: ['young'],
    note: 'A flashcard set on screen, with a read-aloud. Good for spaced review.',
  },
  {
    id: 'starfall',
    label: 'Starfall',
    emoji: '⭐',
    kind: 'activity',
    url: 'https://www.starfall.com',
    searchUrl: 'https://www.starfall.com/h/index-kindergarten.php',
    bands: ['young'],
    note: 'Free phonics and early reading practice, one letter or sound at a time.',
  },
  {
    id: 'abcya',
    label: 'ABCya',
    emoji: '🔤',
    kind: 'activity',
    url: 'https://www.abcya.com',
    searchUrl: 'https://www.abcya.com/search.htm?q=',
    bands: ['young'],
    note: 'Free letters, words and number games. Pick a game by age, not by look.',
  },
  {
    id: 'khanKids',
    label: 'Khan Academy Kids',
    emoji: '🦁',
    kind: 'activity',
    url: 'https://learn.khanacademy.org/khan-academy-kids/',
    searchUrl: 'https://learn.khanacademy.org/khan-academy-kids/',
    bands: ['veryYoung', 'young'],
    note: 'Free, ad-free stories and songs, made by teachers. Very safe for the youngest.',
  },
  {
    id: 'oxfordOwlGames',
    label: 'Literacy games & printable activities (Twinkl free)',
    emoji: '🎲',
    kind: 'activity',
    url: 'https://www.topmarks.co.uk',
    searchUrl: 'https://www.topmarks.co.uk/Search.aspx?q=',
    bands: ['young'],
    note: 'Topmarks collects free, ad-light learning games by subject and age.',
  },

  /* ── Pictures and crisp SVG art ─────────────────────────────────────────── */
  {
    id: 'commons',
    label: 'Wikimedia Commons',
    emoji: '📷',
    kind: 'picture',
    url: 'https://commons.wikimedia.org',
    searchUrl: 'https://commons.wikimedia.org/w/index.php?search=&title=Special:MediaSearch&type=image',
    note: 'Real photographs of real things, free to reuse. The app already fetches these for words automatically.',
  },
  {
    id: 'openverse',
    label: 'Openverse',
    emoji: '🖼️',
    kind: 'picture',
    url: 'https://openverse.org',
    searchUrl: 'https://openverse.org/search/image?q=',
    note: 'A second free picture pool when Commons has nothing usable.',
  },
  {
    id: 'twemoji',
    label: 'Twemoji (emoji as SVG)',
    emoji: '😀',
    kind: 'picture',
    url: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15/assets/svg',
    searchUrl: 'https://github.com/jdecked/twemoji',
    note: 'The SAME emoji on every laptop, as a clean SVG. The app already uses this everywhere.',
  },
  {
    id: 'openmoji',
    label: 'OpenMoji',
    emoji: '🎨',
    kind: 'picture',
    url: 'https://openmoji.org',
    searchUrl: 'https://openmoji.org/library/',
    note: 'Free emoji in many colours — useful when you want a big coloured picture of one thing.',
  },
  {
    id: 'svgrepo',
    label: 'SVGRepo',
    emoji: '🖌️',
    kind: 'picture',
    url: 'https://www.svgrepo.com',
    searchUrl: 'https://www.svgrepo.com/vectors/',
    note: 'Free SVG pictures, big and crisp at any size for a projector.',
  },
  {
    id: 'openclipart',
    label: 'Openclipart',
    emoji: '✏️',
    kind: 'picture',
    url: 'https://openclipart.org',
    searchUrl: 'https://openclipart.org/search/?query=',
    note: 'Public-domain clip art, all free to use.',
  },
];

export const sourcesForKind = (kind: KidFreeSourceKind, band: KidAgeBand): KidFreeSource[] =>
  KID_FREE_SOURCES.filter((s) => s.kind === kind && (!s.bands || s.bands.includes(band)));

export const sourceById = (id: string): KidFreeSource | undefined => KID_FREE_SOURCES.find((s) => s.id === id);

/** A tidy, simple name for a media kind, for a button or a heading. */
export const mediaKindLabel = (kind: string): string =>
  ({
    video: 'Video',
    audio: 'Sound',
    activity: 'Tap-and-play game',
    picture: 'Picture',
    story: 'Story',
    game: 'Game',
  } as Record<string, string>)[kind] || 'Link';

export const mediaKindEmoji = (kind: string): string =>
  ({
    video: '🎬',
    audio: '🎧',
    activity: '🧩',
    picture: '🖼️',
    story: '📖',
    game: '🎮',
  } as Record<string, string>)[kind] || '🔗';

/** Only a real, hotlinkable https URL may leave this module for a screen. */
export const isHttpUrl = (url: unknown): url is string => /^https:\/\/\S+$/i.test(String(url || '').trim());

/**
 * Turn a YouTube watch/embed URL into an embeddable URL, or nothing.
 *
 * Used by the launcher so a lesson's video can play *inside* the lesson on the
 * tutor's screen rather than throwing them out to another tab. YouTube's nocookie
 * domain is used because a children's lesson should not be profiling the room.
 */
export function youtubeEmbedUrl(url: string): string | null {
  const raw = String(url || '').trim();
  const short = raw.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  const watch = raw.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  const embed = raw.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  const id = short?.[1] || watch?.[1] || embed?.[1];
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

/** A short, honest credit line for a media item. */
export function mediaCredit(media: { source?: string; title: string }): string {
  return media.source ? `${media.title} — ${media.source}` : media.title;
}
