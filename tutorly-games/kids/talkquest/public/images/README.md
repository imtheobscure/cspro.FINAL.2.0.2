# TalkQuest artwork — drop your pictures here

Each of the ten games has a hand-made backdrop picture. Put the files in **this
folder** with exactly these names and they appear everywhere the game is shown —
the launcher card, the "Get ready" card and the in-play background — with no code
change and no rebuild of anything but the app itself.

| File name              | Game                                |
| ---------------------- | ----------------------------------- |
| `whisper-wall.jpg`     | Whispering-Wall Escape Rooms        |
| `alien-cafe.jpg`       | Alien-Café Order Takers             |
| `parrot-delivery.jpg`  | Parrot-Partner Secret Deliveries    |
| `detective-office.jpg` | Detective Clue-Interrogators        |
| `animal-rescue.jpg`    | Animal-Rescue Radio Dispatches      |
| `time-traveler.jpg`    | Time-Traveler Dinner Parties        |
| `monster-baby.jpg`     | Monster-Babysitter Comfort Chats    |
| `magic-mirror.jpg`     | Magic-Mirror Compliment Battles     |
| `lost-found.jpg`       | Lost-and-Found Toy Reporters        |
| `robot-lab.jpg`        | Robot-Friend Upgrade Interviews     |

## Any format works

`.jpg` is tried first, then `.jpeg`, `.png`, `.webp` and `.avif`, so a PNG export
or a WebP optimisation is fine as long as the **base name** matches the table. A
`.svg` of the same name is only used as the last resort, so never name your
artwork that.

Aim for a landscape picture around **1600 × 1000** and under ~400 KB each: the
cards crop to a wide banner with a dark gradient over the lower third, so keep the
subject in the upper-middle and away from the very bottom edge where the game
title sits.

## What happens when a file is missing

`SceneImageGuard` catches the failed load and steps through the fallbacks, ending
at the generated scene already in this folder (`whisper-wall.svg` and friends), so
a card can never show a broken-image icon. `scripts/manifest-images.mjs` records
what is here at build time, so once a file exists there are no wasted requests
either.

Adding artwork later without a rebuild still works — the guard picks it up on the
next page load — but running `npm run build` regenerates the manifest and is the
supported path.
