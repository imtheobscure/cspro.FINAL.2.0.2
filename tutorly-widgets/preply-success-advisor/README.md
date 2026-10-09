# Success Advisor — a mentor's console for online tutors

A local-first CRM for a mentor who coaches tutors across Preply, Classgap, NativeCamp,
italki, PalFish, AmazingTalker and any other platform they add. It keeps the roster, the
phases each tutor is in, the profile they are building, their numbers, their goals, the
conversations you had and the follow-ups that came out of them — and it tells you who
needs you today.

Everything runs on your machine. There is no server, no API key and no account: the AI
work is done by **copy prompts** you paste into your own assistant, and all data lives in
`localStorage` plus a JSON file in a folder you choose.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # single self-contained index.html
```

## The shape of the app

| Screen | What it is for |
| --- | --- |
| **Tutor board** | Four phase columns — Preparing data · Waiting for an account · Active · Passive — with a card per tutor showing their score, health, alerts and last week's earnings. Search, platform filter, and a one-line table of the whole roster. |
| **Leaderboard** | Premium tiered cards (Common · Rare · Epic · Legendary) with the Profile Power Score gauge, conversion-readiness meter, week-over-week arrow, badges and a podium. |
| **Insights** | The "what do I do today" list: every nudge sorted by urgency, who is falling behind and why, who is gaining ground, roster health distribution, and the Iranian cultural calendar. |
| **Settings** | The Toman rate, platform colors with their **real logos**, custom platforms, folder sync, export/import, and a reset. |
| **Tutor profile** | Seven tabs: Account · Audit & score · Status · Goals & plan · Performance · Communication · Messages. The identity panel carries a **Latin name** (for platform forms and English emails) and lets one person teach on **several platforms at once**, one of them marked primary. |

The header is always there: a **global search** that matches on name, Latin name, phone or
platform and jumps straight to the profile as you type, and the **live USD→Toman chip** with a
one-click refresh. So "who is Alireza and what is the dollar at today" never needs a screen.

## Phases drive everything

`preparing` → `waiting` → `active` → `passive`. Moving a tutor restarts the "stuck here"
clock, and each phase has its own patience (`nudgeAfterDays` in `lib/domain.ts`). Every
reminder in the app is derived from that clock plus the tutor's own numbers — nothing is
stored as "due", so nothing can go stale.

## The AI engine (all copy-prompt)

`lib/prompts.ts` holds thirteen prompts, each assembled from the tutor's real data:

| Prompt | Produces |
| --- | --- |
| Build the roster from a spreadsheet | Names, **Latin names**, phones, start dates and platforms from your Excel/CSV, in one JSON block. The prompt is explicit about transliteration — علیرضا ابتهاج becomes Alireza Ebtehaj, محمد رضایی becomes Mohammad Rezaei — because a platform form that cannot accept Farsi is the first thing a new tutor has to fill in, and it will not wait for them to invent a spelling. |
| Create the account content | Headlines, description, **video scripts with pronunciation**, subjects, specialties, levels, ages, price. |
| Master AI · Profile Auditor & Scoring Engine | 100-point Profile Power Score, a sub-score and tip per criterion, Success Probability Index, strengths/weaknesses, exactly three ranked actions, and the Super Tutor monitor. |
| Read an Insight page | Converts a pasted platform dashboard into one clean week of numbers. |
| Analyze our conversation | Written from the chat you paste: a concise English log (the record), how they are doing, the SWOT, follow-ups with due dates, and the profile updates the conversation actually justifies. |
| Weekly update | Everyone's week in one paste; each tutor's entry is matched by name and applied. |
| Smart Goal Wizard | Their goals → a 13-week plan with a metric for each week. |
| Consulting answer | A senior mentor's written answer, grounded in the tutor's data. |
| Price benchmark | A competitive range plus a gradual raise plan. |
| SOS | A three-point recovery plan, the message to send now, and what to check in seven days. |
| Message factory | Platform-compliant messages in four tones, built from their own week. |
| Celebration card, Daily pep talk, Check & fix | Milestone cards, a per-tutor daily message, and an editor that marks every change in bold. |

Every prompt tells the assistant to **search the web** — `reddit.com/r/Preply`, the
platform's own help center, recent tutor reports — and to list its sources, which are
stored with the audit. Nothing is applied until you press Apply, and the modal shows you
exactly what it understood first.

## Nothing pasted is ever silently lost

`lib/normalize.ts` is the single door between an AI reply and the app's types, and it is
deliberately tolerant:

- **Video scripts** from a bare array of strings, an array of `{plain, pronunciation}`,
  `{script, guide}`, `{script1, script2}`, a single object, or a nested wrapper — all of
  them become real scripts. This was a real bug: the model answered with
  `["Hi, I'm…", "Hello…"]` and a `.map(s => s.plain)` turned every script into an empty
  box with no warning. The paste window now reports `Video scripts: 2` before you apply.
- **Key aliases** match case-, space- and separator-insensitively, so `video_scripts`,
  `YearsOfExperience` and `profile_power_score` all land.
- **An object where text was expected** becomes labelled text rather than
  `[object Object]`; **a comma list in one string** ("IELTS, Business English") splits into
  items, while prose containing a comma stays prose.
- **Fenced JSON**, a sentence of preamble, smart quotes and trailing commas all parse.
- **Unrecognised fields are kept**, not dropped — they land in `account.extra` and are
  shown in the Account tab.
- The paste window reports `Filled: …` / `Ignored: …` so a mismatch is visible instead of
  mysterious.
- **An envelope is unwrapped everywhere.** Models answer with `{"result": {…}}`,
  `{"analysis": {…}}` or `{"log": …}` constantly, so the roster reader, the profile-update
  reader and the log reader all look inside it first. Two of them did not, and the failure
  was silent in the worst place: a spreadsheet import reported a single tutor named
  *result*, and a conversation kept its log while quietly discarding the price, hours, notes
  and goals the same answer proposed.
- **Follow-ups keep their due dates.** The contract asks for `[{text, dueAt}]`; a flattening
  step used to turn that into the string `"Ask about the ticket (Due At: 2026-09-19)"` with
  no date at all, so the reminder never fired. Both shapes work now.

## Your data

Three layers, so nothing is ever lost:

1. **localStorage** — written on every change.
2. **A folder on disk** — one click on *Choose a folder* and every change is written into
   `tutorly-advisor-data.json` inside it (debounced, ~1.2s after your last edit). Point it
   at a OneDrive or Dropbox folder and it syncs itself. The directory handle is kept in
   IndexedDB because it is not JSON-serializable; if the browser needs permission again
   after a restart, Settings offers *Reconnect*, and *Load the file from the folder* brings
   the data back on a new machine.
3. **Export / import** — a plain JSON file with the complete state.

The app also migrates the previous version's `tutorProfiles` data on first run.

Avatars are pasted straight from the clipboard and stored as a 192px JPEG (a few kB each),
so a 60-tutor backup stays in the hundreds of kilobytes.

## Toman

Every money figure is shown in dollars **and** Toman at the rate in Settings (rials ÷ 10).
Amounts above a million read the way they are spoken — "25.4M Toman" — with the exact
figure on hover.

**The live rate.** *Check the live rate* in Settings asks every source at once and shows what
each one answered, with the round-trip time and whether a relay was involved. Results are
painted **as they land**, not at the end: the free-market number normally appears in a few
hundred milliseconds, while the relay leg can take fifteen seconds, so waiting for the slowest
source before showing anything made a working check look broken.

| Source | What it is |
| --- | --- |
| tgju.org `call2` — free-market dollar | The reference rate, and the one that works: it serves `Access-Control-Allow-Origin: *`, so the browser reads it directly in about 1.5 s. |
| tgju.org `call1` — free-market dollar | The same document from the other host. It sends **no** CORS header, so it is only reachable through a free relay — kept as a cross-check, never as the path we depend on. |
| exchangerate-api — aggregated reference | The official-ish number. It reads **far** below the free market. |

Two providers were removed because they no longer exist, measured rather than assumed:
`api.nobitex.ir` does not resolve (ENOTFOUND) and `api.wallex.ir` resets the TLS connection
(ECONNRESET). If a future version wants an exchange quote again, verify a host responds to a
browser `fetch` **with** a CORS header before wiring it in — that missing header is what made
the rate look broken in the first place.

Two rules keep this honest, and both are enforced in `lib/rates.ts` and
`lib/useAppState.ts`:

1. **A reference rate never overwrites your number on its own.** If only the aggregated
   reference answers, the app says so and waits for your click — applying it unasked would
   cut every Toman figure by two thirds with no explanation.
2. **Nothing changes without a click, except a free-market quote on open.** *Refresh the
   Toman rate when I open the app* (on by default, switchable in Settings) re-checks once per
   open when the stored rate is more than half a day old, applies only an exchange quote, and
   tells you where it came from. A rate you typed by hand is never replaced by a stale cache.

When no source is reachable, copy the rate-lookup prompt, ask your AI, and type the number
in. That path always works, which is the point. The source label and the date travel with the
rate through every export.

Also here: the income visualiser (drag hours per week → gross and post-commission earnings
in both currencies), the economic-freedom bar against the tutor's own target, the life-goal
"how many months" calculator, Dollar Warrior badges at 50M/100M/500M Toman, price
benchmarking, and a cultural calendar that warns you before Nowruz and Yalda empty a week.

## The conversation log — the workflow the app is built around

You talk to a tutor in Persian or English, paste the chat into **Communication**, and the AI
returns:

- **`log`** — the clean version: 2–4 sentences of plain English, third person, past tense.
  This is what gets saved. **The pasted chat is not stored** unless you switch *Keep the
  original chat text* on in Settings, so the record stays readable a month later.
- **`language`** (`fa` / `en` / `mixed`), **`mood`**, a **SWOT** about the tutor's situation,
  **follow-ups** with dates (they appear as a checklist, overdue in red), and **actions**
  ranked by impact.
- **`profileUpdates`** — only what the conversation justifies: phase (with the "stuck here"
  clock restarted), tags, price, availability, next follow-up, a dated mentor note,
  background material for future profile writing, and goals. The paste window lists every
  change in words before anything is saved, and a reply that proposes nothing says so
  instead of guessing.

Every later prompt carries the last six log entries, so the next analysis knows what was
already asked and what changed since.

## Layout

```
App.tsx                 routing, the three roster-wide prompts, toasts
lib/domain.ts           phases, tiers, health score, nudges, falling-behind, badges, calendar
lib/prompts.ts          the thirteen copy prompts
lib/normalize.ts        tolerant AI-JSON reader + the change report
lib/storage.ts          localStorage, folder sync, export/import
lib/useAppState.ts      the single owner of state and persistence
lib/platforms.ts        7 platforms: colors, rules, account fields
lib/platformLogos.ts    each platform's real mark, inlined as a data URL so no logo is
                        ever an emoji and nothing is fetched at runtime
lib/rates.ts            the live USD→Toman sources, and what each one actually is
knowledge/              the researched Preply documentation the prompts quote: rubric tiers,
                        profile and video guidelines, subject list, platform rules
lib/format.ts           USD ⇄ Toman, dates
components/ui.tsx       cards, gauges, heart meter, sparkline, modal, tabs
components/PromptModal  copy → paste → review → apply
views/                  board, leaderboard, insights, settings, tutor profile + its 7 tabs
knowledge/              the platform rules, rubric, tone and subject guidance the prompts embed
```

## Colors

Platform colors are brand-derived where a published code exists — Preply's Flamingo Pink
`#FF79AC` (with Eerie Black `#121118` as the ink), italki's `#FF4338` — and taken from each
site's own interface otherwise. Each one records where it came from, and **every color is
editable in Settings**, including the built-in ones.

Each platform also carries its **real logo** — Preply, Classgap, NativeCamp, italki, PalFish,
AmazingTalker and LingoAce — inlined as a data URL so a chip shows the actual mark offline
instead of a guessed emoji. Settings shows the logo on a 26px tile next to the color, and the
source URL stays editable for anything we do not ship.

## Not in here

No teaching-method advice and no payment help outside the platform — the consulting prompt
refuses both, deliberately.
