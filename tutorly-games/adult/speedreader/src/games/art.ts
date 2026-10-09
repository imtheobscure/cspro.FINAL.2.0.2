/**
 * Scene artwork for the eight modes.
 *
 * The eight jpgs ship in `public/images/` (~1.7 MB), NOT in `src/assets/`, so the
 * build copies them to `<folder>/dist/images/` and the page links to them at
 * runtime. `vite-plugin-singlefile` forces `base = "./"`, which is what
 * `import.meta.env.BASE_URL` resolves to, so these become `./images/…` — correct
 * from `/tutorly-games/adult/speedreader/index.html` and still correct if the
 * folder is ever moved or served from a sub-path.
 *
 * This used to `import … from "../assets/images/race.jpg"`, a directory that does
 * not exist: the build failed on an unresolved import. The hub's `dungeon` game
 * resolves its artwork the same way, for the same reason.
 */
export const ART = {
  race: `${import.meta.env.BASE_URL}images/race.jpg`,
  rocket: `${import.meta.env.BASE_URL}images/rocket.jpg`,
  boxing: `${import.meta.env.BASE_URL}images/boxing.jpg`,
  heist: `${import.meta.env.BASE_URL}images/heist.jpg`,
  practice: `${import.meta.env.BASE_URL}images/studio.jpg`,
  neon: `${import.meta.env.BASE_URL}images/neon.jpg`,
  avalanche: `${import.meta.env.BASE_URL}images/avalanche.jpg`,
  kraken: `${import.meta.env.BASE_URL}images/kraken.jpg`,
} as const;
