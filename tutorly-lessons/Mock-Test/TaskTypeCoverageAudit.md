# Exam Simulator Task-Type Coverage Audit

**Audit date:** 12 July 2026  
**Generator:** `ExamSimulatorHtmlGenerator.ts`  
**Result:** **Complete for all 42 requested simulator profiles**

## Automated result

```json
{
  "profileCount": 42,
  "catalogTaskTypeCount": 400,
  "referencedTaskTypeCount": 364,
  "missingByProfile": {},
  "complete": true
}
```

The TypeScript module now exports:

- `EXAM_TASK_TYPE_CATALOG` — 400 canonical task definitions and recognized aliases.
- `EXAM_PROFILE_TASK_TYPE_MATRIX` — the required task types for each of the 42 requested profiles.
- `resolveExamTaskType(taskType)` — resolves a canonical task or alias to its renderer.
- `auditExamTaskTypeCoverage()` — verifies that every task referenced by every profile has an implemented renderer.

The remaining 36 catalog entries are shared primitives, optional companion-test tasks, custom tasks, or clearly marked legacy aliases.

## Interaction renderers

| Renderer | Catalog task types | Implemented interaction |
|---|---:|---|
| Single choice | 130 | Accessible radio-card choice UI |
| Multiple select | 6 | Checkbox cards with maximum-selection enforcement |
| Short text | 10 | Text/textarea response |
| Numeric | 6 | Decimal-aware entry with optional units |
| Rich text/extended writing | 74 | Long-form editor, word/character counts, targets, autosave |
| Gap fill | 20 | One or many labeled text gaps |
| Dropdown gaps | 8 | Select controls for each gap |
| Matching | 25 | Accessible select-based matching |
| Categorization | 1 | Category assignment controls |
| Ordering | 4 | Keyboard-accessible up/down ordering |
| Table completion | 3 | Structured multi-gap table response |
| Hotspot | 1 | Stable-ID visual option selection |
| Matrix selection | 13 | Responsive visual matrix + selection |
| Graph interaction | 3 | Structured graph stimulus + multi-field answer/working |
| Voice recording | 67 | Preparation timer, `MediaRecorder`, waveform, playback, limits |
| Video recording | 4 | Camera/microphone capture, live preview, playback, multipart submission |
| Select/highlight text | 3 | Keyboard-operable selectable-word interface |
| Multi-field response | 12 | Part answers plus working/explanation |
| Instructional content | 2 | Test–Teach–Test lesson completion state |
| True/False/Not Given | 2 | Dedicated three-state control |
| Yes/No/Not Given | 1 | Dedicated three-state control |
| Complete words | 3 | Missing-character/gap controls |
| Sentence builder | 2 | Accessible token ordering |

Additional shared functionality includes strict audio playback counts, transcript cues, reading annotation, calculator, declarative SVG matrices, formulas, autosave/recovery, monotonic timers, proctoring telemetry, and answer-key stripping.

## Profile coverage

| # | Profile | Canonical task types mapped | Status |
|---:|---|---:|---|
| 1 | IELTS Academic Paper 2026 | 39 | Complete |
| 2 | IELTS Academic Computer 2026 | 39 | Complete |
| 3 | IELTS General Paper 2026 | 37 | Complete |
| 4 | IELTS General Computer 2026 | 37 | Complete |
| 5 | IELTS UKVI 2026 | 42 | Complete; Academic and General variants |
| 6 | IELTS Life Skills A1 2026 | 3 phase/task families | Complete |
| 7 | IELTS Life Skills B1 2026 | 5 phase/task families | Complete |
| 8 | TOEFL iBT post-21-Jan-2026 | 12 | Complete |
| 9 | TOEFL Essentials 2026 | 16 | Complete, including Personal Video Statement |
| 10 | TOEFL ITP 2026 | 6 core | Complete; optional Speaking tasks are also cataloged |
| 11 | TOEFL Junior Standard 2026 | 7 core | Complete; optional Speaking tasks are also cataloged |
| 12 | PTE Academic 2026 | 22 | Complete, including the two tasks introduced in 2025 |
| 13 | PTE Core 2026 | 20 including unscored introduction | Complete |
| 14 | PTE Home A1 2026 | 2 official task families | Complete |
| 15 | PTE Home B1 2026 | 4 | Complete |
| 16 | Duolingo English Test 2026 | 19 current task/subtask families | Complete; removed legacy tasks are marked legacy |
| 17 | Cambridge A2 Key 2026 | 12 | Complete; paper/digital constructs identical |
| 18 | Cambridge B1 Preliminary 2026 | 16 | Complete |
| 19 | Cambridge B2 First 2026 | 19 | Complete |
| 20 | Cambridge C1 Advanced 2026 | 19 | Complete |
| 21 | Cambridge C2 Proficiency 2026 | 18 | Complete |
| 22 | CELPIP General 2026 | 20 | Complete |
| 23 | CELPIP General LS 2026 | 14 | Complete |
| 24 | OET 2026 | 13 | Complete, including four writing-purpose variants and role-play |
| 25 | Trinity ISE 2026 | 13 | Complete across paper and ISE Digital families |
| 26 | Aptis ESOL General 2026 | 20 | Complete |
| 27 | LanguageCert International ESOL 2026 | 15 | Complete across Written and Spoken suites |
| 28 | GCSE English Language 2026 | 9 | Complete using AQA-style reference profile |
| 29 | GCSE English Literature 2026 | 5 | Complete using AQA-style reference profile |
| 30 | GCSE Mathematics 2026 | 5 | Complete using AQA-style reference profile |
| 31 | GCSE Combined Science 2026 | 7 | Complete using AQA Trilogy reference profile |
| 32 | 11+ English/Math/VR/NVR 2026 | 12 | Complete as provider-configurable practice modules |
| 33 | ISEB Common Entrance 2026 | 11 | Complete for core and optional subject interaction families |
| 34 | SSAT Upper/Middle 2026 | 6 | Complete |
| 35 | Digital SAT 2026 | 11 domain/response families | Complete, including student-produced Math responses and calculator |
| 36 | Enhanced ACT 2026 | 7 | Complete, including optional Science and Writing |
| 37 | HSPT 2026 | 8 | Complete |
| 38 | ISEE Upper Level 2026 | 6 | Complete |
| 39 | NAPLAN 2026 | 7 | Complete across the four domains |
| 40 | “Canadian CAT4” 2026 | 17 | Complete for both GL CAT4 and Canadian CCAT interpretations |
| 41 | English Placement Test 2026 | 7 | Complete as a custom diagnostic profile |
| 42 | Test–Teach–Test Lesson | 4 | Complete |

## Important fidelity qualifications

“Complete” means every current public task construct in the profile matrix resolves to a working candidate interaction. It does **not** mean the independent simulator reproduces a provider's private adaptive algorithm, live item bank, licensed scoring/equating model, or physical test administration.

- Paper handwriting is represented as a digital practice adaptation unless the host app supplies a paper workflow.
- Face-to-face speaking is represented by sequential recorded interview/role-play interactions; it is not a replacement for a live examiner.
- Adaptive tests require an author-supplied item pool or module branching. A fixed JSON form remains a fixed-form approximation.
- Official scoring must remain server-side and provider-equated where required.
- School-, regulator-, institution-, and year-specific thresholds are not replaced by a universal percentage pass mark.
- “Canadian CAT4” is ambiguous: GL CAT4 has Verbal, Non-Verbal, Quantitative, and Spatial batteries; Canadian CCAT uses Verbal, Quantitative, and Non-Verbal batteries. Both are separately represented.

## Major 2026 accuracy corrections reflected in the matrix

- Post-21-January-2026 TOEFL iBT uses 12 public task categories across Reading, Listening, Writing, and Speaking—not the older TOEFL task inventory.
- PTE Academic has 22 current question types, including `Summarize Group Discussion` and `Respond to a Situation`.
- PTE Core has seven Speaking/Writing, five Reading, and seven Listening task types, plus the unscored Personal Introduction.
- PTE Home B1 uses Repeat Sentence, Describe Image, Retell Story, and Story: Listen and Answer.
- Current Cambridge paper and digital exams use identical task constructs; delivery tools differ.
- Digital SAT uses Reading/Writing multiple choice, Math multiple choice, and Math student-produced responses with calculator availability throughout Math.
- Enhanced ACT core is English, Math, and Reading; Science and Writing are optional.
- DET legacy Read Aloud and Listen Then Speak are retained only as explicitly marked legacy aliases, not as current-form requirements.

## Official source seeds used for the audit

- IELTS format and task types: https://ielts.org/take-a-test/test-types/ielts-academic-test
- TOEFL iBT structure: https://www.ets.org/toefl/test-takers/ibt/about/content.html
- TOEFL Essentials: https://www.ets.org/toefl/test-takers/essentials/content.html
- PTE Academic and Core: https://www.pearsonpte.com/pte-academic/test-format/ and https://www.pearsonpte.com/pte-core/test-format/
- PTE Home: https://www.pearsonpte.com/pte-home/pte-home-b1/
- Cambridge formats: https://www.cambridgeenglish.org/exams-and-tests/qualifications/ways-to-take-exam/
- CELPIP: https://www.celpip.ca/take-celpip/test-format/
- OET: https://oet.com/en-us/about/the-test
- Trinity ISE: https://www.trinitycollege.com/qualifications/english-language/ISE
- Aptis ESOL: https://www.britishcouncil.org/exam/english/aptis/prepare-general
- LanguageCert International ESOL: https://www.languagecert.org/en/language-exams/english/languagecert-international-esol
- Digital SAT: https://satsuite.collegeboard.org/sat/whats-on-the-test/structure
- Enhanced ACT: https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/act-exam-sections-and-structure.html
- ISEE: https://www.erblearn.org/families/isee-by-erb/instructions/in-person-paper/
- NAPLAN: https://www.nap.edu.au/naplan/key-dates/naplan-test-window
- GL CAT4: https://www.gl-assessment.co.uk/products/cat4/
