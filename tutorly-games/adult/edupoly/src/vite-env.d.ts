/**
 * Raw asset imports (the board icons are downloaded SVGs, inlined into the
 * single-file build as data URLs — see `src/icons.ts`).
 */
declare module '*.svg?raw' {
  const content: string;
  export default content;
}
