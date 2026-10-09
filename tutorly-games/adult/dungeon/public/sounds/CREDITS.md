# Dungeon — bundled sound effects

Every file here is a **CC0 1.0 (public domain)** recording from Kenney's asset
packs — https://kenney.nl/assets — copied verbatim, no edits, no attribution
required (credited here anyway because it is the decent thing to do).

| Shipped file | Kenney pack | Original file | Used for |
|---|---|---|---|
| `click.ogg` | Interface Sounds | `click_001` | button press |
| `toggle.ogg` | Interface Sounds | `toggle_002` | settings switch |
| `correct.ogg` | Interface Sounds | `confirmation_001` | good / jackpot outcome |
| `wrong.ogg` | Interface Sounds | `error_004` | bad outcome, hesitation |
| `clock-tick.ogg` | Interface Sounds | `tick_001` | last 5 seconds of the room clock |
| `level-up.ogg` | Music Jingles (Pizzicato) | `jingles_PIZZI02` | level up, revive |
| `victory.ogg` | Music Jingles (Pizzicato) | `jingles_PIZZI00` | run complete |
| `boss-hit.ogg` | Music Jingles (Hit) | `jingles_HIT03` | boss reveal stinger |
| `coins.ogg` | RPG Audio | `handleCoins` | treasure |
| `coins-stack.ogg` | RPG Audio | `handleCoins2` | merchant purchase |
| `blade-slice.ogg` | RPG Audio | `knifeSlice` | sword attack |
| `metal-clash.ogg` | Impact Sounds | `impactMetal_heavy_001` | steel on steel |
| `metal-slam.ogg` | Impact Sounds | `impactMetal_heavy_004` | jumpscare |
| `monster-toll.ogg` | Impact Sounds | `impactBell_heavy_000` | monster / boss appears |
| `death-bell.ogg` | Impact Sounds | `impactBell_heavy_004` | death |
| `trap-latch.ogg` | RPG Audio | `metalLatch` | trap sprung |
| `magic-chime.ogg` | Impact Sounds | `impactGlass_light_000` | spell cast |
| `heartbeat.ogg` | Impact Sounds | `impactPlate_heavy_003` | clock under 3 seconds |
| `door-open.ogg` | RPG Audio | `doorOpen_1` | entering a room |
| `door-close.ogg` | RPG Audio | `doorClose_2` | leaving a room |
| `card-flip.ogg` | RPG Audio | `bookFlip1` | card / page turn |
| `whoosh.ogg` | RPG Audio | `cloth4` | scene transition |
| `step-wood.ogg` | Impact Sounds | `footstep_wood_001` | footsteps |
| `dice-throw.ogg` | Casino Audio | `die-throw-1` | d20 result |
| `dice-shake.ogg` | Casino Audio | `dice-shake-2` | dice in hand |

## Why these replaced the old sounds

The game used to hot-link `assets.mixkit.co/…-preview.mp3` for every effect.
Those previews are thin, synthetic and only exist online — with no connection,
or when mixkit rotates a file, the game went silent. These recordings are real
(a struck bell, a real door, real coins, a real blade), ship inside the app, and
work offline. The old remote URLs are still kept as a **fallback candidate** in
`src/flashcards.ts`: if a build is uploaded without this folder, the game still
makes noise online instead of failing silently.

## Re-fetching

`node .freebuff/fetch-sounds.mjs extract` re-downloads the five packs and copies
these exact files back in. The pick table lives in that script — change a row to
swap a sound, then re-run it.
