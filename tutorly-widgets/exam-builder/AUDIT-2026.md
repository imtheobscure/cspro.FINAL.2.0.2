# Exam Builder — audit against the 2026 task-type standard

Audit of `exam-builder/` against the 2026 engine in `Mock_Test_V3/ExamTaskTypeCoverage.md`
and `Mock-Test/TaskTypeCoverageAudit.md`.

Reproduce everything below with:

```bash
cd exam-builder
npm run build          # single-file build -> exam-builder/dist/index.html
npm run gen:exams      # one standalone exam per preset -> exam-builder/.check/
npm run audit:exams    # parses each emitted engine + checks every question type
```

The `.check/` folder holds one generated paper per preset plus two fixtures
(`practice-ielts.html`, `unsupported-2026.html`). Open any of them directly in a
browser — they are self-contained.

---

## 1. What was broken

### 1.1 Fatal: every generated exam was dead on arrival

`quizHtmlGenerator.ts` builds the whole standalone paper inside one TypeScript
template literal. Three string literals in that template used `\n` where `\\n`
was required, so the emitted JavaScript contained a raw newline inside a string
literal:

```
SyntaxError: Invalid or unexpected token
```

The `<script>` failed to parse, so no event listener was ever attached. The page
rendered the instruction overlay and the timer then sat at `--:--` forever —
clicking **Begin Session** did nothing at all. **Every one of the 13 presets**
produced this. Fixed in all three places (`join('\n')`, the tutor-email body, the
speaking-audio note).

### 1.2 Scoring: two question types awarded full marks unconditionally

Verified by driving a generated paper and answering everything correctly, then
answering nothing:

| Item | Answered all-wrong / untouched | Old result | Now |
|---|---|---|---|
| `matching` (10 pts) | every dropdown set to a **wrong** value | **10 / 10** | 0 / 10 |
| `ordering` (10 pts) | never touched | **10 / 10** | 0 / 10 |

* **Matching** carried no answer key in the schema, so grading fell through to a
  generic "did the candidate write anything?" branch — and *any* object is truthy.
  Grading is now pair-by-pair against `matchingPairs`.
* **Ordering** was written into the answer store at *render* time with the option
  order, and graded as an un-ordered set (`every(includes)`), so the starting
  permutation always matched. The starting order is now shuffled, is not stored
  until the candidate moves something, and is graded as a sequence.
* **Essays** in the twelve generated presets were keyed to the literal string
  `['Manual rubric review required']`, so a perfect essay scored **0** — 20 of every
  60 points per section were permanently unreachable. Subjective items now earn
  completion credit against a word floor and are listed explicitly on the results
  page as *awaiting rubric review*, instead of being silently scored as wrong.

There are now one `gradeQuestion(q, ans)` used by both final marking and adaptive
routing, so a routing decision can never disagree with the score.

### 1.3 Reading passages were never rendered

`section.readingPassages` and `q.readingPassage` are in the schema and produced by
the presets, but the render chain never touched them. An English Placement paper
asked *"What is the main idea of the passage?"* with **no passage on screen**.
Now rendered with vocabulary tooltips, removable highlighting and optional
read-aloud. The vocabulary regex was also double-escaped, so it searched for a
literal `\b` and never wrapped a word — replaced with a text-node walk.

### 1.4 Advertised features that did nothing

| Feature | Symptom | Cause |
|---|---|---|
| Practice Scratch Notepad | `Uncaught ReferenceError: toggleNotepad is not defined` | inline `onclick` cannot see a function scoped inside the engine IIFE |
| Writing word counters / draft history / spellcheck | absent on every writing task | `addWritingUtilities` was built but never attached to a textarea |
| Listening audio | silent Play button, no audio at all | `voiceSettings.enabled` defaulted to `false`, and `speakText` returns early when disabled |
| Section timer (`timerMode: 'section'`) | a single global clock; `section.timeLimitMinutes` read nowhere | not implemented |
| Branding stage (Stage 5) | no effect on 12 of 13 presets | `metadata.branding` only emitted by the Placement branch, and missing from the AI prompt schema |
| `peerJsEnabled` | tutor observation unreachable | key absent from both the presets and the AI prompt schema |

### 1.5 Preset papers did not match the standard they claimed

* `estimatedQuestions` was ignored — an "IELTS 44 item" form shipped **20** items.
  Now: IELTS 44, FCE 72, CAE 76, CPE 76, TOEFL 56, PTE 51 (all matching or within
  rounding of the declared scale).
* All four IELTS sections were **byte-identical**, asking a reading-comprehension
  question inside the *Writing* and *Speaking* sections. Sections are now
  classified by skill (`classifySection`) and draw from a per-skill task profile,
  with per-slot prompt wording.
* The same placeholder listening script was injected into **every** section of every
  form. Audio is now confined to listening sections, and only listening items carry
  an audio stem — including a `Play Listening Prompt` control on choice and
  completion items, not just on the bare `listening` type.

### 1.6 The validator would approve papers that cannot be answered

Pasting a schema built from genuine 2026 task types returned
**"SCHEMA APPROVED"** and left the export button enabled. The exported paper
rendered five question cards with **zero interactive controls**: a candidate could
see a 10-mark `note_completion` item, have no way to answer it, and score zero.

New `src/questionTypeRegistry.ts` splits the 2026 vocabulary into three buckets:

* **native (10)** — a dedicated renderer exists;
* **aliased (~36)** — a real 2026 task with a faithful reduction
  (`true_false_not_given` → `multipleChoice` with TRUE/FALSE/NOT GIVEN options
  generated, `reorder_paragraphs` → `ordering`, `read_aloud` → `speaking`, …).
  Applied automatically, each one reported with exactly what the reduction loses;
* **blocked (11)** — needs a stimulus the runtime cannot draw (`hotspot`,
  `highlight_text`, `dropdown_cloze`, `drag_and_drop_cloze`, `interactive_reading`,
  `image_choice`, `multi_field`, `graph_interaction`, …). Compilation is refused,
  with the section, item id and reason listed.

The AI prompt now carries the same three lists as a hard constraint, so generated
papers are renderable on the first pass, and `branding` / `peerJsEnabled` are in
its sample schema so those stages can no longer be dropped silently.

---

## 2. Current generation matrix

| Preset | Items | Question types produced |
|---|---:|---|
| ielts | 44 | essay, fillInBlank, listening, matching, multipleChoice, speaking |
| toefl | 56 | essay, listening, multipleChoice, speaking |
| pte | 51 | essay, fillInBlank, listening, multipleChoice, ordering |
| duolingo | 45 | essay, fillInBlank, listening, multipleChoice, speaking |
| ket | 39 | essay, fillInBlank, listening, multipleChoice, speaking |
| pet | 44 | essay, listening, matching, multipleChoice, speaking |
| fce / cae / cpe | 72 / 76 / 76 | essay, fillInBlank, listening, matching, multipleChoice, speaking |
| celpip | 48 | essay, listening, multipleChoice, speaking |
| oet | 52 | essay, listening, multipleChoice, speaking |
| english-placement | 15 | essay, fillInBlank, matching, multipleChoice, multipleSelect, ordering, speaking, writing |
| custom | 20 | essay, multipleChoice, speaking |

`english-placement` is a hand-written diagnostic paper (the only preset with its own
authored sections), so it keeps its 15 curated items rather than a scaled count.

---

## 3. Still missing against the 2026 engine

These are deliberate gaps, not regressions — every one is a design decision the
`Mock_Test_V3` engine already solves:

1. **34 of 42 renderers.** Version 3 has `hotspot`, `dropdown_cloze`,
   `drag_and_drop_cloze`, `highlight_text`, `note_completion`, `matrix`,
   `numeric_entry`, `fraction_entry`, `equation_entry`, `email`, `letter`,
   `dictation`, `read_aloud`, `oral_interview`, `role_play`, `video_reflection` and
   more. This build has ten. The registry makes the gap *visible and safe* rather
   than silent, but the tasks themselves still cannot be set.
2. **Submission packaging.** V3 exports a ZIP containing `results.json`,
   `report.html`, `recordings/*.webm` and `snapshots/*.jpg`. Here the result page
   offers a PNG of the certificate, a print, and a `mailto:` link — the audio
   recordings are only ever downloadable one at a time, and no machine-readable
   result exists.
3. **Analytics.** V3 ships section charts, a skill radar, pacing, difficulty vs
   accuracy, a focus heatmap and review filters. This build has a per-section
   accuracy bar list.
4. **Adaptive branching is a stub.** `evaluateAdaptiveBranching()` computes an
   accuracy figure, logs it, and stops — the comment literally says
   *"E.g. flag next section tags"*. Nothing is re-routed, though
   `adaptiveFlag: true` is advertised to the candidate.
5. **Question palette, flagging, review mode, retry-incorrect, model answers.**
   None present.
6. **Proctoring fidelity.** The camera "face tracking" canvas-diff heuristic
   strikes a candidate after 3 low-motion frames; copy/paste in the candidate's
   *own* answer box is logged as a cheat strike (`SHORTCUT_PENALTY`, `isStrike:
   true`), which can invalidate an honest paper. Silencing the microphone during a
   speaking task is not noticed: `checkSilence()` is defined and never called.
7. **`examInstances` is inert.** The prompt asks for N complete versions; the
   runtime reads the key nowhere, so N > 1 changes nothing.

---

## 4. Verification performed

* 13/13 presets generate; every emitted engine script passes a `vm.Script` parse.
* 0 question types in any preset fall outside the runtime's renderers.
* End-to-end in Chromium, per paper: start session, answer every item, submit,
  read the score back, compare section rows against the answer key.
* Adversarial pass: all items answered wrong / left untouched scores 0 on those
  items (it used to score full marks on matching and ordering).
* Validator pass: unrenderable 2026 types are blocked with the export button
  disabled; aliased types pass with an explicit adaptation list.
* Practice-mode pass: notepad opens/persists/closes with no console errors;
  counters and draft history render on writing tasks; listening audio fires.
* Section-timer pass: header shows `Section 1 of 4 · 41 min`, the clock tracks the
  section allowance, and stepping back with Previous preserves the remaining time
  rather than resetting it.

---

## 5. Second audit round — audio, casting and per-item content

This round drove the two production papers (TOEFL 2026, IELTS 2026) section by
section in Chromium, answering every item and reading the marks back, and it
listened to every player the engine renders.

### 5.1 Fatal: every listening item played the same recording

`testCatalog.ts` overwrote each listening item's audio with one hard-coded
sentence:

```ts
built.audioText = 'Good morning. Today we need to confirm the updated assessment deadline...';
```

A thirteen-item listening section therefore had thirteen players, all of which
read the same sentence, and **no item's own answer was ever spoken**: a
note-completion task whose notes read "Opening hours change to ____" was played a
recording that never mentioned an opening time. The `DUP-AUDIO` and
`AUDIO-ANSWER-MISSING` gates in `audit-exams.ts` now fail the build on either
half of this defect.

What replaced it:

* `LISTENING_SCRIPTS` holds five authored recordings per task type, and every
  completion/matching/choice branch pairs its payload with the recording that
  states its answers.
* `LISTENING_CHOICE_BANK` replaced options that were meta-descriptions of a source
  ("The main point of the source", "A plausible but unsupported idea") — which made
  the item unanswerable from the recording — with real content options, and each
  entry carries its own `focus` so the question, the options and the audio describe
  one situation.

### 5.2 Fatal: the same question appeared twice in one section

The stimulus was selected by item position, so in a section longer than the type
mix, both the task and its recording repeated identically. Two fixes:

* each bank is indexed by **how many times that type has already appeared** in the
  section (`variant`), not by item number;
* a section whose preset offers too few task types for its length is *widened* to
  enough distinct types that no type has to appear more often than there are
  authored variants (five). PTE declares two listening types, so its seventeen-item
  listening section used to be nine identical multiple-choice items followed by
  eight identical sentence completions.

Writing and speaking types are held out of listening, reading and use-of-English
sections while widening, so a listening paper cannot gain an essay. Cambridge
"Reading and Writing" is a combined section and keeps its writing items.

### 5.3 Voice casting: multi-character, accent-matched, and verified

`VOICE_PROFILES` maps a persona to the substrings Microsoft actually reports inside
`voice.name`, and matching is a case-insensitive substring test against `voice.lang`,
so it survives Edge channel and Windows build differences. Verified by overriding
`SpeechSynthesisUtterance` in the page and reading back what was really assigned:

| Paper | Speaker | Authored hint | Voice chosen |
|---|---|---|---|
| IELTS 2026 | Receptionist | male, British, en-GB | Ryan (United Kingdom) |
| IELTS 2026 | Caller | female, Australian, en-AU | Natasha (Australia) |
| IELTS 2026 | Caretaker | male, Irish, en-IE | Connor (Ireland) |
| TOEFL 2026 | Student | female, American, en-US | Ava Multilingual |
| TOEFL 2026 | Adviser | male, American, en-US | Andrew Multilingual |
| TOEFL 2026 | Technician | male, Indian, en-IN | Prabhat (India) |
| KET | Pupil | child, British, en-GB | Sonia (en-GB) at pitch 1.4 |

The cast is shown as chips under each player, and two characters that end up on
one installed voice are flagged rather than hidden.

**Honest limitations.** No Windows or Edge voice is a child voice — there is no
"kid" entry in `getVoices()` in any locale — so a younger speaker is approximated
with a bright en-GB voice at raised pitch, and the code says so. The child persona
is also reserved for papers written for younger candidates (A2 Key, B1 Preliminary,
the placement diagnostic); adult papers get an Irish course administrator instead,
because an IELTS listening paper read by a child is not a plausible recording.

Unhinted audio (section instructions, reading passages) used to fall back to the OS
default voice, which on a machine with natural voices installed is both the
worst-sounding and frequently the wrong language. `bestDefaultVoice()` now prefers an
installed Microsoft natural/multilingual English voice first.

### 5.4 Labels

Every player that reads a script, a stem or a passage is labelled **Play Audio**.
The one remaining read-aloud button reads the practice *explanation* rather than an
exam script, so it is labelled **Play Feedback** — "Play Audio" means one thing on
this paper. "Play the script", "Read the script" and "Play Script" no longer exist
anywhere in the generated output.

### 5.5 One robustness fix found by the audio pass

Assigning `utterance.voice` throws for any entry the engine does not recognise, and
that assignment used to run inside a `forEach` over the dialogue — so **one bad
voice in the installed list aborted every remaining line**, and a three-speaker
script stopped after the first speaker. It is now caught per utterance with a
warning, and the affected line falls back to the engine default. Verified: 17
utterances are queued where the old path produced 1.

### 5.6 Second-round verification performed

* All 17 papers: 0 unrenderable types, 0 incomplete items, 0 duplicate recordings,
  0 recordings missing their answers, item counts unchanged (IELTS 44, TOEFL 56,
  PTE 51, FCE 72, CAE/CPE 76, OET 52, CELPIP 48, KET 39, PET 44).
* The negative fixture is still refused, with section, item id and reason.
* Speaking items render Start/Stop Recording; writing items render the word
  counter and draft history; no card in any paper renders without a control.
* IELTS 2026 production paper end-to-end: 22 items answered, 13/22 gaps
  deliberately correct → Listening 58%, Reading 50%, Writing 100% (unrecorded),
  Speaking 0% — partial credit per gap, and no section inflated.
* TOEFL 2026 production paper: Complete the Words renders its letters and blanks,
  note and table completion render their notes and table, and per-gap marks are
  awarded independently.
