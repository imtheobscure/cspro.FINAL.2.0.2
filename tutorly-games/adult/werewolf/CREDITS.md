# Bundled media credits

Every file below is downloaded into this game (`public/images`, `public/sounds`,
`public/fonts`) rather than hot-linked, so the game works offline and no URL can
rot mid-lesson. Each licence permits reuse; attribution is shown in the in-game
**Credits** panel and repeated here.

Relative paths are used throughout (`images/...`, `sounds/...`, `fonts/...`) so the
game also works when served from a sub-path such as `/tutorly-games/adult/<game>/`.

## Atmospheric photography — Wikimedia Commons

| File | Used for | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `images/moon.jpg` | night backdrop — the moon | W.carter | CC BY-SA 4.0 | [Full moon over Gullmarn fjord](https://commons.wikimedia.org/wiki/File:Full_moon_over_Gullmarn_fjord_at_Holma_Marina_1.jpg) |
| `images/forest-night.jpg` | night backdrop — the forest | F R | Public domain | [Moody, foggy black forest](https://commons.wikimedia.org/wiki/File:Moody,_foggy_black_forest_-_Flickr_-_Tannenschleicher.jpg) |
| `images/wolf.jpg` | the werewolf itself | Pacific Southwest Region 5 | Public domain | [Mexican Grey Wolf](https://commons.wikimedia.org/wiki/File:Mexican_Grey_Wolf_(5438623847).jpg) |
| `images/dawn-mist.jpg` | day backdrop — misty dawn | Susanne Nilsson | CC BY-SA 2.0 | [Misty morning](https://commons.wikimedia.org/wiki/File:Misty_morning_-_HFF!_(31337758876).jpg) |

## Jump-scare photographs — Wikimedia Commons

Shared with the Snake & Ladder game, which is where they were first curated and
credited. Usage note: these are the "few jump scares" the game may show, and they
are never used on the day-phase screens.

| File | Title | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `images/scares/face-zombie.jpg` | Zombie Walk — Into The Lens | Anthony Ingram-Westover | CC BY 2.0 | [Commons](https://commons.wikimedia.org/wiki/File:Zombie_Walk_-_Into_The_Lens.jpg) |
| `images/scares/face-clown.jpg` | Horror Clown Maske | Unlisted Commons contributor | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Horror_Clown_Maske.jpg) |
| `images/scares/face-mask.jpg` | Zombie Halloween Mask | Unlisted Commons contributor | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Zombie_Halloween_Mask.jpg) |
| `images/scares/face-family.jpg` | Scary Zombie Family Faces | Joe Shlabotnik | CC BY 2.0 | [Commons](https://commons.wikimedia.org/wiki/File:Scary_Zombie_Family_Faces_(15482446698).jpg) |
| `images/scares/doll.jpg` | Creepy Doll, Barnaul, Russia | Anjum Vahanvati | CC BY-SA 2.0 | [Commons](https://commons.wikimedia.org/wiki/File:Creepy_Doll,_Barnaul,_Russia_(21454199012).jpg) |
| `images/scares/skull.jpg` | Human skull of a boy (anatomical specimen) | Unlisted Commons contributor | CC BY 3.0 de | [Commons](https://commons.wikimedia.org/wiki/File:Anthroplogy_-_human_skull_of_a_boy.JPG) |
| `images/scares/zombie-horde.jpg` | Zombie Walk Cannes 2013 | Unlisted Commons contributor | CC BY-SA 3.0 | [Commons](https://commons.wikimedia.org/wiki/File:Zombie_Walk_Cannes_2013.JPG) |
| `images/scares/noh-ghost.jpg` | Shuosai — Yase-Onna, Nō ghost mask | Walters Art Museum | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Shuosai_-_Yase-Onna_(%22Grieving_Woman%22)_Mask_for_a_Ghost_Role_in_a_No_Play_-_Walters_61251.jpg) |

Only `noh-ghost.jpg`, `skull.jpg`, `face-mask.jpg` and `doll.jpg` are used at the
gentler **Eerie** setting; the rest require **Jump scares** in Settings.

## Recorded audio — Wikimedia Commons

| File | Used for | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `sounds/howl.ogg` | nightfall sting, ambient howls | Unlisted Commons contributor | Public domain | [Wolf howls](https://commons.wikimedia.org/wiki/File:Wolf_howls.ogg) |
| `sounds/wind-night.ogg` | night ambience (loops) | W.carter | CC BY-SA 4.0 | [Wind in Swedish pine forest](https://commons.wikimedia.org/wiki/File:Wind_in_Swedish_pine_forest_at_25_mps.ogg) |
| `sounds/crickets.ogg` | night ambience (loops) | Thatcher | CC BY-SA 3.0 | [Field cricket unedited](https://commons.wikimedia.org/wiki/File:Field_cricket_unedited.ogg) |
| `sounds/heartbeat.wav` | voting tension | Bob Smaude | CC BY 4.0 | [Heartbeat speedsup](https://commons.wikimedia.org/wiki/File:Heartbeat_speedsup.wav) |
| `sounds/bell.ogg` | dawn and execution bell | Adrian Tync | CC BY-SA 4.0 | [Chorzow Luther church bell](https://commons.wikimedia.org/wiki/File:Chorzow_Luther_church_bell_ringing_2021.opus) |
| `sounds/scream-wilhelm.ogg` | jump-scare scream | — | CC0 (no attribution required) | [Wilhelm Scream](https://commons.wikimedia.org/wiki/File:Wilhelm_Scream.ogg) |
| `sounds/scream-human.wav` | jump-scare scream | — | CC BY-SA 4.0 | [Scream-e](https://commons.wikimedia.org/wiki/File:Scream-e.wav) |

`sounds/bell.ogg` is Opus-in-Ogg. Browsers without Opus support fall back to the
synthesised bell automatically — see below.

## Fonts — self-hosted

| File | Used for | Licence |
| --- | --- | --- |
| `fonts/*` | UI/body and display headings | SIL Open Font License 1.1 (see `public/fonts/LICENSES.md`) |

Self-hosted rather than loaded from a font CDN: the game must render correctly with
no network, and a blocked font CDN otherwise drops the whole theme back to a
generic serif.

## Synthesised audio

Every cue also exists as **synthesised** Web Audio (`src/lib/synth.ts`). Any sound
whose file is missing, blocked or undecodable falls back to its synth twin, so the
game is never silent and never needs the network. `synth:` as a URL means
"use the built-in synth" outright.

## Replacing any of it

Drop your own files in the same folders and update `DEFAULT_SOUND_SETTINGS` /
`MEDIA` in `src/App.tsx` (or override the paths in the in-game **Settings** panel —
every one of them is editable there). Nothing else needs to change.
