# 🎈 Kids Lesson & Game Library — build blueprints

Every file in `Very Young/` and `Young/` is a **blueprint**, not the lesson itself. Hand one
file to an AI (or a developer), say *“build it exactly as specified”*, and you get **one
self-contained HTML file** the Lesson Creator can open, project and play. The built file then
replaces its blueprint in the same folder (keep the blueprint; add `-built.html`).

This README is the **unifying system**: the splash screen, the learner identity, the tutor
controls, the voice, the praise language and the master Copy-AI prompt are identical across
every file, so the whole library feels like one product and not forty experiments.

---

## 1 · The one-file contract (non-negotiable)

Each built lesson/game is **one `.html` file**:

- all CSS in a single `<style>` in the head, all JS in a single `<script>` at the end;
- **zero network requests** — no CDN, no Google Fonts, no remote images, no fetch;
  artwork is emoji, CSS shapes and (optionally) inline SVG data URIs;
- voice = `speechSynthesis`; sounds = WebAudio (`AudioContext`); both optional and silent on failure;
- works opened straight from a USB stick, a `file://` path, or dropped into the app;
- no build step, no frameworks, no imports; `defer`, `DOMContentLoaded` and `try/catch` everywhere;
- target < 150 KB; a single screen must never need scrolling at 1366×768.

## 2 · The shared splash screen (every file, identical structure)

```
[band badge:   🧸 VERY YOUNG · 2–5     |     🚀 YOUNG · 5–12]
[hero emoji]  [pet emoji]  [kingdom crest emoji]
[lesson/game title — 2–5 words, huge]
[child's name] + “ready?” line
[ one enormous “Let's go!” button ]
   ← → move · Space hear it again · Esc leave
```

- very young: pink→rose gradient, 1.3× scale, no score anywhere;
- young: indigo→violet gradient, stars only (points stay private to the tutor);
- the splash is a real screen, not a modal: the lesson starts **only** when it is pressed;
- the same jingle (three rising WebAudio notes) plays on every start — one sound identity.

## 3 · Learner identity (from the profile)

The host passes this in, and the file must run without it:

```js
window.TUTORLY_LEARNER = {
  name: "Mia", age: 4, band: "veryYoung",
  hero: "🦸",         // avatar evolution emoji
  pet: "🐱",          // pet evolution emoji
  crest: "🏰",        // newest kingdom-canvas item
  words: ["duck", "cow"] // optional: this lesson's words
};
```

- use `name`, `hero`, `pet`, `crest` in at least three places (splash, header, celebration);
- never show age, XP or coins as numbers to the child;
- if the object is missing, fall back to `{name:"friend", hero:"🧒", pet:"🐾", crest:"🏰"}`.

## 4 · Tutor controls (identical in every file)

| key | action |
| --- | --- |
| `→` / huge Next button | next screen |
| `←` | back |
| `Space` | read the current line aloud again |
| `Esc` | leave (confirm only if progress would be lost) |

Big top bar: title · progress dots · 🔊 repeat · ⚙ how-to-play · ✕ exit. The tutor is standing
at a projector with one hand free — every control must be reachable with one press.

## 5 · Voice, sound and praise

- one utterance at a time (`speechSynthesis.cancel()` first), pitch ≈ 1.2, rate ≈ 0.9;
- prefer a child-friendly English voice, then any `en-*` voice, then silence;
- sounds are short WebAudio blips; never loop, never startle;
- praise is about effort: “You did it!”, “Nearly — try again 💛”, “You tried again and fixed it!”;
- **never** “wrong”, “0 points”, red X, buzzers, or a sad trombone. A wrong tap only wobbles.

## 6 · Projector sizing & safety

- child-facing text: 1–3 words; quiz options at most 6; body ≥ 20 px; hero picture ≥ 96 px;
- everything tappable ≥ 64 px; high contrast (≥ 4.5:1); no colour-only answers;
- no flashing > 3 Hz; no timers under 5; no elimination; no external links; no accounts.

## 7 · Band rules (short form)

**Very young (2–5):** no reading, no writing, no score, no losing, one instruction per screen,
one target word per activity, 3–5 minutes per activity, movement every few minutes.

**Young (5–12):** reading arrives; 4–6 words or one structure per lesson; every game has several
fair turns and a small repeatable win; spaced review in the first two minutes; growth-mindset
feedback; a 60-second brain break every 5 minutes.

---

## 8 · The unifying Copy-AI prompt (canonical)

Paste this with the file's own section filled in. Every blueprint in this folder ends with the
same prompt, instantiated for its type — this is the shape it follows:

```text
You are building ONE self-contained HTML file for a children's English lesson library.
Return ONE complete .html file and nothing else.

CONTENT TO BUILD
  Band: {{veryYoung (2-5) | Young (5-12)}}
  Type: {{lesson / game}} — {{name from the blueprint}}
  Title: {{title}}
  Goals: {{goals from the blueprint}}
  Type-specific spec: {{paste the blueprint's sections 3-6 verbatim}}

THE UNIFIED SYSTEM (must match exactly)
  · one HTML file, all CSS+JS inline, zero network requests, < 150 KB, no frameworks;
  · the shared splash screen from the library README (band badge, hero·pet·crest,
    title, name, one huge "Let's go!", the 4 tutor keys);
  · window.TUTORLY_LEARNER with name/hero/pet/crest, graceful fallback;
  · every screen: title bar, progress dots, 🔊 repeat, ⚙ how-to, ✕ exit;
  · speechSynthesis: one utterance at a time, pitch 1.2, rate 0.9, child-friendly voice,
    silence on failure; short WebAudio effects only;
  · praise = effort, "Nearly — try again 💛" is the harshest line;
  · {{very young: no score, no reading, one instruction per screen, pink theme}
     {young: stars only, 4-6 word options, indigo theme}};
  · projector sizing: child text ≤ 3 words, ≥ 20px body, ≥ 96px hero art, 4.5:1 contrast;
  · keyboard ← → Space Esc + big Next button; works from file:// with no server;
  · finish screen with the learner's name, a celebration sound and one takeaway line.

CONTENT RULES
  · fill the whole session from the goals — no filler, no placeholders, no "TODO";
  · every child-facing string is written for THIS age; every tutor line is word-for-word;
  · personalise with the learner's name, hero, pet and one interest where it fits;
  · include a no-screen fallback line for the tutor at the end of the how-to.

OUTPUT
  Return only the HTML file in one code block, starting with <!doctype html>.
```

---

## 9 · Folder map

```
kids-lesson-library/
  README.md                 ← this file: the system + master prompt
  Very Young/               ← 10 lesson blueprints + 8 screen-game blueprints
  Young/                    ← 13 lesson blueprints + 10 screen-game blueprints
```

Every blueprint starts with **what it is** and **the goals**, then the interaction flow, then
the tutor notes, then its **own ready-to-paste Copy-AI prompt** (the master prompt above,
already instantiated — no editing needed).
