export type ThemeDef = {
  slug: string;
  name: string;
  icon: string;
  category: string;
  color: string;
};

/** The themes the app ships with. */
export const ALL_THEME_DEFINITIONS: ThemeDef[] = [
  { slug: 'alphabet', name: 'Alphabet & Letters', icon: '🔤', category: 'Foundations', color: '#64748b' },
  { slug: 'numbers-counting', name: 'Numbers & Counting', icon: '🔢', category: 'Foundations', color: '#5b8266' },
  { slug: 'colors', name: 'Colors', icon: '🎨', category: 'Foundations', color: '#9d6b8f' },
  { slug: 'shapes', name: 'Shapes', icon: '📐', category: 'Foundations', color: '#6b7a9d' },
  { slug: 'classroom-school', name: 'Classroom & School Objects', icon: '🎒', category: 'School & Learning', color: '#a68a64' },
  { slug: 'my-family', name: 'My Family & Relatives', icon: '👨‍👩‍👧‍👦', category: 'People & Feelings', color: '#a07171' },
  { slug: 'body-face', name: 'My Body & Face', icon: '👀', category: 'Health & Body', color: '#6d9197' },
  { slug: 'clothes', name: 'Clothes & Getting Dressed', icon: '👕', category: 'Daily Life', color: '#7b7fa3' },
  { slug: 'toys-games', name: 'Toys & Games', icon: '🧸', category: 'Play & Fun', color: '#b08160' },
  { slug: 'fruits-vegetables', name: 'Fruits & Vegetables', icon: '🥕', category: 'Food & Cooking', color: '#7d9163' },
  { slug: 'food-drinks', name: 'Food & Drinks', icon: '🥪', category: 'Food & Cooking', color: '#a89060' },
  { slug: 'meals', name: 'Meals: Breakfast, Lunch, Dinner', icon: '🍽️', category: 'Daily Life', color: '#a3737a' },
  { slug: 'my-house', name: 'My House: Rooms & Furniture', icon: '🏡', category: 'Home & Living', color: '#6d8f96' },
  { slug: 'kitchen-cooking', name: 'Kitchen Utensils & Cooking', icon: '🍳', category: 'Home & Living', color: '#a3824f' },
  { slug: 'daily-routines', name: 'Daily Routines', icon: '⏰', category: 'Daily Life', color: '#727d9e' },
  { slug: 'actions-verbs', name: 'Actions & Verbs', icon: '🏃', category: 'Language Basics', color: '#5b8266' },
  { slug: 'feelings-emotions', name: 'Feelings & Emotions', icon: '🥰', category: 'People & Feelings', color: '#9d6b8f' },
  { slug: 'weather-seasons', name: 'Weather & Seasons', icon: '🌦️', category: 'Nature & Science', color: '#5f87a3' },
  { slug: 'days-months', name: 'Days of the Week & Months', icon: '📅', category: 'Time & Calendar', color: '#85719d' },
  { slug: 'telling-time', name: 'Time & Clocks', icon: '🕒', category: 'Time & Calendar', color: '#6b7a9d' },
  { slug: 'pets-farm-animals', name: 'Pets & Farm Animals', icon: '🐶', category: 'Animals & Nature', color: '#6f9169' },
  { slug: 'wild-animals-zoo', name: 'Wild Animals & Zoo', icon: '🦁', category: 'Animals & Nature', color: '#a08d55' },
  { slug: 'sea-creatures', name: 'Sea Creatures', icon: '🐬', category: 'Animals & Nature', color: '#5f87a3' },
  { slug: 'musical-instruments', name: 'Instruments & Music', icon: '🎻', category: 'Arts & Music', color: '#85719d' },
  { slug: 'nature-plants', name: 'Nature: Flowers, Trees, Plants', icon: '🌻', category: 'Nature & Science', color: '#6f9169' },
  { slug: 'places-in-town', name: 'Places in Town', icon: '🏙️', category: 'Community', color: '#77808c' },
  { slug: 'jobs-occupations', name: 'Jobs & Occupations', icon: '👩‍⚕️', category: 'Community', color: '#6b7a9d' },
  { slug: 'vehicles-transport', name: 'Vehicles & Transportation', icon: '🚀', category: 'Travel & Going Out', color: '#a8794f' },
  { slug: 'sports-exercise', name: 'Sports & Exercise', icon: '⚽', category: 'Health & Body', color: '#6f9169' },
  { slug: 'hobbies-free-time', name: 'Hobbies & Free Time', icon: '🎨', category: 'Play & Fun', color: '#9d6b8f' },
  { slug: 'park-playground', name: 'Park & Playground', icon: '🛝', category: 'Play & Fun', color: '#5b8266' },
  { slug: 'beach-seaside', name: 'At the Beach & Seaside', icon: '🏖️', category: 'Travel & Going Out', color: '#5f9bab' },
  { slug: 'camping-outdoors', name: 'Camping & Outdoor Adventures', icon: '⛺', category: 'Travel & Going Out', color: '#76895b' },
  { slug: 'pirate-ship', name: 'Pirate Ship & Adventure', icon: '🏴‍☠️', category: 'Stories & Fantasy', color: '#9a5f5f' },
  { slug: 'fairy-tales', name: 'Fairy Tales & Fantasy', icon: '🧙‍♀️', category: 'Stories & Fantasy', color: '#85719d' },
  { slug: 'birthday-party', name: 'Birthday Party & Celebrations', icon: '🎂', category: 'People & Feelings', color: '#a3737a' },
  { slug: 'in-the-garden', name: 'In the Garden', icon: '🪴', category: 'Nature & Science', color: '#6f9169' },
  { slug: 'farm-life', name: 'Farm Life', icon: '🚜', category: 'Nature & Science', color: '#a3824f' },
  { slug: 'shopping-stores', name: 'Shopping & Stores', icon: '🛒', category: 'Community', color: '#6b7a9d' },
  { slug: 'opposites-adjectives', name: 'Opposites: Big & Small', icon: '⚖️', category: 'Language Basics', color: '#7b7fa3' },
  { slug: 'doctor-health', name: 'At the Doctor & Health', icon: '🩺', category: 'Health & Body', color: '#5f8f88' },
  { slug: 'space-planets', name: 'Space, Moon & Planets', icon: '🪐', category: 'Nature & Science', color: '#6a6f9d' },
  { slug: 'earth-environment', name: 'Our Earth & Recycling', icon: '🌍', category: 'Nature & Science', color: '#5b8266' },
  { slug: 'computers-tech', name: 'Computers & Phones', icon: '💻', category: 'Modern World', color: '#6b7a9d' },
  { slug: 'art-painting', name: 'Art & Painting', icon: '🖌️', category: 'Arts & Music', color: '#9d6b8f' },
  { slug: 'music-dance', name: 'Music & Dance', icon: '💃', category: 'Arts & Music', color: '#a68a64' },
  { slug: 'cooking-baking', name: 'Cooking & Baking', icon: '🧁', category: 'Food & Cooking', color: '#a3737a' },
  { slug: 'pet-shop', name: 'Pet Shop', icon: '🐹', category: 'Community', color: '#6f9169' },
  { slug: 'toyshop', name: 'Toyshop', icon: '🎁', category: 'Play & Fun', color: '#b08160' },
  { slug: 'theme-park', name: 'Theme Park', icon: '🎡', category: 'Play & Fun', color: '#85719d' },
  // Added in the TalkQuest release — six more themes for the interests young
  // learners ask for by name. Each one has a word bank in `bankD.ts`.
  { slug: 'dinosaurs', name: 'Dinosaurs', icon: '🦕', category: 'Nature & Science', color: '#6f9169' },
  { slug: 'five-senses', name: 'My Five Senses', icon: '✋', category: 'Health & Body', color: '#6d9197' },
  { slug: 'superheroes', name: 'Superheroes', icon: '🦸', category: 'Stories & Fantasy', color: '#9a5f5f' },
  { slug: 'insects-bugs', name: 'Bugs & Minibeasts', icon: '🐛', category: 'Animals & Nature', color: '#7d9163' },
  { slug: 'circus', name: 'The Circus', icon: '🎪', category: 'Play & Fun', color: '#b08160' },
  { slug: 'road-safety', name: 'Staying Safe', icon: '🚦', category: 'Modern World', color: '#a8794f' },
];

/**
 * Themes a tutor pasted in from an AI, live for this browser session.
 *
 * They are kept OUT of `ALL_THEME_DEFINITIONS` so that array stays the record
 * of what the app ships with — the lesson importer uses it to refuse a pack
 * that would quietly overwrite a built-in topic.
 */
const EXTRA_THEMES: ThemeDef[] = [];
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach((fn) => fn());
}

/** Bumped on every install/remove, so screens can re-render. */
export function themesVersion() {
  return version;
}

export function subscribeThemes(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Every theme in the library: the built-in ones, then any pasted ones. */
export function allThemes(): ThemeDef[] {
  return [...ALL_THEME_DEFINITIONS, ...EXTRA_THEMES];
}

export function findTheme(slug: string): ThemeDef | undefined {
  return allThemes().find((t) => t.slug === slug);
}

export function isBuiltInTheme(slug: string): boolean {
  return ALL_THEME_DEFINITIONS.some((t) => t.slug === slug);
}

/** Add or replace a pasted theme, and tell every screen about it. */
export function registerTheme(def: ThemeDef) {
  const at = EXTRA_THEMES.findIndex((t) => t.slug === def.slug);
  if (at >= 0) EXTRA_THEMES[at] = def;
  else EXTRA_THEMES.push(def);
  notify();
}

export function removeTheme(slug: string) {
  const at = EXTRA_THEMES.findIndex((t) => t.slug === slug);
  if (at < 0) return;
  EXTRA_THEMES.splice(at, 1);
  notify();
}
