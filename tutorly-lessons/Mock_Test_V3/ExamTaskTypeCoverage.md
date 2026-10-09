# Task-Type Coverage Map v2 â€” 42 Core Exams + German/French/Spanish Proficiency Exams

This replaces the earlier coverage map and reflects the actual feature set in
`ExamSimulatorHtmlGenerator.v3.ts`.

## Big upgrade summary

The engine now supports not just rendering and grading, but full **submission packaging**:
- one-click **ZIP export** at exam end
- `results.json` with per-question detail, telemetry, timings, flags, revisits, browser/device fingerprint
- `/recordings` folder with audio and video captures
- `/snapshots` folder with webcam snapshot log
- printable `report.html`
- IndexedDB persistence for recordings and snapshots
- in-HTML analytics dashboard, review mode, retry incorrect, model answers, mini-lessons

## Engine renderer inventory

`single_choice`, `multiple_select`, `true_false_not_given`, `yes_no_not_given`,
`matching`, `matching_headings`, `matching_information`, `matching_features`,
`matching_sentence_endings`, `sentence_completion`, `summary_completion`,
`note_completion`, `table_completion`, `flow_chart_completion`,
`diagram_label_completion`, `short_answer`, `long_answer`, `essay`, `email`,
`letter`, `read_aloud`, `repeat_sentence`, `listen_and_type`, `dictation`,
`speaking_response`, `oral_interview`, `reorder_paragraphs`,
`drag_and_drop_cloze`, `dropdown_cloze`, `highlight_text`, `highlight_sentence`,
`numeric_entry`, `fraction_entry`, `equation_entry`, `hotspot`, `image_choice`,
`matrix`, `sequence`, `build_sentence`, `role_play`, `interactive_reading`,
`video_reflection`.

## Submission and analytics layer

Every supported exam can now also produce:
- `results.json`
- `report.html`
- `recordings/*.webm`
- `snapshots/*.jpg`
- AI-ready summary block
- section charts, skill radar, pacing chart, difficulty/accuracy chart, focus heatmap
- review filters (all, wrong-only, flagged, by skill)
- model answer playback and mini-lesson rendering

---

## Core English-exam mapping

### IELTS family
Supported: Academic Paper/Computer, General Paper/Computer, UKVI, Life Skills A1/B1.

| Branded task | Engine type | Notes |
|---|---|---|
| Listening form/note/table completion | `note_completion` / `table_completion` | Play-once configurable |
| Listening map/plan/diagram labelling | `diagram_label_completion` / `hotspot` | |
| Reading TFNG / YNNG | `true_false_not_given` / `yes_no_not_given` | |
| Reading matching headings/info/features | `matching_headings` / `matching_information` / `matching_features` | |
| Computer reading highlighting | `highlight_text` / `highlight_sentence` | plus annotation tools |
| Writing Task 1 chart description | `essay` | chart/image can be in `media.imageUrl` |
| Writing Task 1 letter (GT) | `letter` | |
| Writing Task 2 essay | `essay` | |
| Speaking interview | `oral_interview` | mic capture, review, rubric sliders |
| UKVI photo-ID step | proctoring/photo capture | bundled in ZIP |

### TOEFL family
Supported: TOEFL iBT, TOEFL Essentials, TOEFL ITP, TOEFL Junior.

| Branded task | Engine type | Notes |
|---|---|---|
| Complete the Words | `sentence_completion` / `short_answer` | precise keying |
| Read in Daily Life | `single_choice` / `multiple_select` | split-pane |
| Read an Academic Passage | `single_choice`, `matching`, `interactive_reading` | split-pane |
| Listen and Choose a Response | `single_choice` | TTS/voice prompt |
| Listen to Conversation / Announcement / Talk | `single_choice`, `matching`, `note_completion` | |
| Listen and Repeat | `repeat_sentence` | audio + mic |
| Take an Interview | `oral_interview` | multi-turn oral |
| Build a Sentence | `build_sentence` | word-chip interaction |
| Write an Email | `email` | |
| Academic Discussion | `essay` | |
| Personal video statement | `video_reflection` | webcam video bundled |
| Adaptive paths | adaptive branching hooks | difficulty path logged |

### PTE family
Supported: PTE Academic, PTE Core, PTE Home A1/B1.

| Branded task | Engine type | Notes |
|---|---|---|
| Read Aloud | `read_aloud` | |
| Repeat Sentence | `repeat_sentence` | |
| Describe Image | `speaking_response` + `media.imageUrl` | fixed in v3 |
| Re-tell Lecture | `speaking_response` | |
| Summarize Written Text | `long_answer` | |
| Summarize Spoken Text | `long_answer` + audio | |
| Fill in the Blanks | `dropdown_cloze` / `drag_and_drop_cloze` | real drag-drop |
| Reorder Paragraphs | `reorder_paragraphs` | |
| Write from Dictation | `dictation` | exact key |
| Respond to a Situation | `role_play` | |

### Cambridge family
Supported: A2 Key, B1 Preliminary, B2 First, C1 Advanced, C2 Proficiency.

| Branded task | Engine type | Notes |
|---|---|---|
| Open cloze / MC cloze | `dropdown_cloze` / `single_choice` | |
| Word formation / transformation | `sentence_completion` / `short_answer` | |
| Gapped text | `reorder_paragraphs` / `matching` | |
| Writing genres | `essay`, `letter`, `email`, `long_answer` | |
| Listening MC/matching/completion | `single_choice`, `matching`, `sentence_completion` | |
| Speaking interview / collaborative task | `oral_interview`, `role_play` | |

### CELPIP, OET, Trinity ISE, Aptis, LanguageCert, DET, Placement, Exam Prep Lesson
All covered with the same renderer set and analytics/export stack.

---

## School entrance / standardized testing coverage

Supported: GCSE English Language/Literature, GCSE Mathematics, GCSE Combined Science,
11+, ISEB Common Entrance, SSAT, SAT, ACT, HSPT, ISEE, NAPLAN, CAT4.

| Task family | Engine type | Notes |
|---|---|---|
| Evidence-based reading/writing | `single_choice`, `dropdown_cloze`, `highlight_text` | SAT/ACT-style |
| Math numeric response | `numeric_entry`, `fraction_entry`, `equation_entry` | calculator rules per section |
| Geometry/diagram | `hotspot`, `numeric_entry` | |
| Non-verbal reasoning / spatial | `image_choice`, `hotspot`, `matrix` | |
| Science reasoning | `single_choice` with chart/passage stimuli | |
| Essay | `essay` | |

---

## Added 2026 German, French, and Spanish proficiency exams

These are now included in the generator presets/metadata layer and can be built with the same engine.

### German
- TestDaF 2026
- Goethe-Zertifikat B1 2026
- Goethe-Zertifikat B2 2026
- Goethe-Zertifikat C1 2026
- telc Deutsch B1 2026
- telc Deutsch B2 2026

Typical mapping:
| Branded task | Engine type |
|---|---|
| Leseverstehen | `single_choice`, `matching`, `highlight_text` |
| HÃ¶rverstehen | `single_choice`, `note_completion`, `matching` |
| Schriftlicher Ausdruck | `essay`, `email`, `letter` |
| MÃ¼ndlicher Ausdruck | `oral_interview`, `role_play`, `speaking_response` |
| Sprachbausteine / grammar | `dropdown_cloze`, `sentence_completion` |

### French
- DELF B1 2026
- DELF B2 2026
- DALF C1 2026
- DALF C2 2026
- TCF Tout Public 2026

Typical mapping:
| Branded task | Engine type |
|---|---|
| ComprÃ©hension Ã©crite | `single_choice`, `matching`, `short_answer` |
| ComprÃ©hension orale | `single_choice`, `note_completion` |
| Production Ã©crite | `essay`, `email`, `letter` |
| Production orale | `oral_interview`, `speaking_response`, `role_play` |
| MaÃ®trise des structures | `dropdown_cloze`, `sentence_completion` |

### Spanish
- DELE B1 2026
- DELE B2 2026
- DELE C1 2026
- SIELE Global 2026

Typical mapping:
| Branded task | Engine type |
|---|---|
| ComprensiÃ³n de lectura | `single_choice`, `matching`, `highlight_text` |
| ComprensiÃ³n auditiva | `single_choice`, `note_completion`, `matching` |
| ExpresiÃ³n e interacciÃ³n escritas | `essay`, `email`, `letter` |
| ExpresiÃ³n e interacciÃ³n orales | `oral_interview`, `role_play`, `speaking_response`, `video_reflection` |
| GramÃ¡tica / uso de la lengua | `dropdown_cloze`, `sentence_completion` |

Accent support in TTS/voice metadata now includes:
- `de-DE`
- `fr-FR`
- `es-ES`

---

## What gets exported now

At exam end, one click can download a ZIP containing:
- `results.json`
- `report.html`
- `recordings/<question>.webm`
- `snapshots/<timestamp>.jpg`

`results.json` includes:
- overall score, weighted score, band/scaled estimate
- per-section percent and minimum-pass checks
- per-question answer, correctness, points, flags, notes, revisits, time spent, answer changes
- skill-tag analytics
- confidence mismatch stats
- timing/pacing table
- difficulty-vs-accuracy data
- telemetry log
- browser/device fingerprint
- AI-ready summary block

---

## Honest limits

Still true, because browser reality does not care about vibes:
- Standalone HTML cannot provide true secure lockdown.
- Writing/speaking scoring is rubric-aware and export-ready, but not magically human-equivalent AI scoring unless you connect a scoring service.
- Adaptive branching is heuristic/client-side, not a full IRT server implementation.