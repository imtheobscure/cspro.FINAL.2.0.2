# Feature Specification: Answer-Length Anti-Cue Rule Conformance

**Feature Branch**: `001-prompt-rule-conformance`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Enforce the answer-length anti-cue rule across every AI prompt surface."

---

## Problem Statement (repository evidence)

The platform's most repeated product promise is that a learner must never be able to score by
tapping the wordiest option. README.md documents this as a cross-cutting contract: one canonical
statement of the rule, appended to every surface that hands a tutor a prompt to paste into an AI.

A discovery pass over the repository shows the contract is not actually enforced:

- The canonical statement exists in one module with two forms (a long form and a short form).
- Exactly **one** consumer imports it (the Lesson Creator's prompt builder). Every other
  surface carries its own hand-written copy of the rule instead.
- There are **at least eight** independently-worded copies: the classmate master prompt, the
  classroom quiz panel, the interactive video pack, the Live Lesson manual, the kids flipbook,
  the Lingo content pack and the Runner question prompt, plus the Lesson Creator's own inline
  pre-amble.
- The copies are **not equivalent**. Each drops a different subset of clauses. Concretely, as of
  this pass: nobody but the Lesson Creator carries the "rewrite the question if it cannot be
  balanced" clause or the ~1.4× length-ratio ceiling; the interactive video pack and the Live
  Lesson manual omit the "no lexical echo" clause entirely.
- README.md's own table lists eight prompt rows. The repository contains further
  option-producing prompt emitters that the table does not mention (the video-lesson script,
  the spinner, the kids' games' pack builders, the adult games' shells, the Baamboozle studio,
  the kids' HTML generator, the coursebook modal). The inventory is already stale.
- No automated check exists for any of this. The one prompt-verification harness in the
  repository checks music/video lesson prompt details and never checks the rule, and it is not
  wired into any project script.

The consequence is a silent quality regression class: a change to the rule reaches one surface,
a new surface ships without the rule, and nothing detects either until a tutor notices that the
questions are too easy to game. This feature makes the rule one verified contract instead of
eight drifting copies, and lets the app judge model-authored content against it instead of
trusting the model's own self-check.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A weakening of the rule cannot ship unnoticed (Priority: P1)

A maintainer (or an agent) adds a new lesson type, game or studio, or edits an existing prompt.
Before the change can be considered finished, the project's own verification tells them whether
every prompt surface that can produce an option set still carries every mandatory clause — and
tells them which surface and which clause is missing when one does not.

**Why this priority**: this is the failure the evidence proves is already happening. It is the
only story that prevents recurrence, and it is worth shipping on its own even if the other two
stories never land.

**Independent Test**: run the project's verification command on the unmodified repository and
confirm it reports the known clause gaps and exits non-zero; then deliberately delete one clause
from a surface that currently carries it and confirm verification names that surface and that
clause.

**Acceptance Scenarios**:

1. **Given** the repository as it stands, **When** the maintainer runs the documented
   verification command, **Then** it exits non-zero and lists, per surface, which mandatory
   clauses are missing — and it does not report a missing clause for a surface that carries
   every clause.
2. **Given** a surface that carries all clauses, **When** one clause is removed from that
   surface's emitted prompt, **Then** verification fails and names that surface and clause.
3. **Given** a new file that emits a tutor-facing prompt producing an option set, **When** it is
   added without an inventory entry, **Then** verification reports it as unregistered.
4. **Given** a surface whose wording is deliberately different because its audience is different,
   **When** it retains every clause, **Then** verification passes and reports the divergence
   reason rather than a failure.
5. **Given** no network access, **When** verification runs, **Then** it still completes and
   reaches the same verdict.

---

### User Story 2 - Every studio's questions are equally hard to game (Priority: P2)

A tutor builds a lesson in the Lesson Creator, a classmate session, a classroom quiz, an
interactive video pack, a kids' flipbook, or a Lingo/Runner pack. Whichever surface they use,
the prompt they paste into their AI demands the same enforceable standard, so the questions that
come back are not systematically easier to guess on some surfaces than others.

**Why this priority**: it is the user-visible payoff, but a surface whose wording is already
strong loses little. It becomes critical only once the rule changes, which is what Story 1
guarantees will now be caught.

**Independent Test**: for a representative option-producing surface from each bundle class
(main app, generated HTML, standalone app), produce the prompt and confirm it states every
clause in wording appropriate to its audience.

**Acceptance Scenarios**:

1. **Given** a tutor on any option-producing surface, **When** they copy the prompt, **Then** the
   pasted text carries every mandatory clause.
2. **Given** a child-facing surface, **When** its prompt is produced, **Then** it states every
   clause in language appropriate for that audience rather than the adult wording verbatim.
3. **Given** a surface that generates prompts for several item types, **When** only some item
   types can have an option list, **Then** the rule is scoped to those item types and the prompt
   says so.
4. **Given** a change to the canonical rule, **When** verification next runs, **Then** every
   surface that has fallen behind is listed — a single change does not leave a surface silently
   stale.

---

### User Story 3 - Pasted content is judged, not trusted (Priority: P3)

A tutor pastes the AI's JSON back into the app. The app reads it, and where the rule applies it
tells the tutor which items give the answer away — by item, naming the clause — so they can
regenerate or fix those items before the learner ever sees them. The content still loads.

**Why this priority**: today the rule is enforced only by asking the model to police itself,
which is exactly the step models skip. This is the only part of the feature that can catch a real
giveaway in real content, and it is the most likely to be requested next — but it is additive, so
it comes last.

**Independent Test**: paste a lesson whose correct option is the longest by three or more words
and confirm the tutor is told which item and which clause, that the lesson still opens, and that
the pasted text is unchanged.

**Acceptance Scenarios**:

1. **Given** a pasted lesson containing an item whose correct option is clearly the longest,
   **When** it is loaded, **Then** that item is reported with the violated clause and the
   evidence that triggered it.
2. **Given** a pasted lesson with no violations, **When** it is loaded, **Then** no finding is
   reported and the flow is unchanged.
3. **Given** a reported item, **When** the tutor ignores it, **Then** the lesson plays and exports
   exactly as it would have without the report.
4. **Given** a surface that accepted a paste, **When** the tutor wants the report, **Then** it is
   available there — without a separate tool and without re-pasting the content.
5. **Given** a pasted lesson containing item types with no option list, **When** it is audited,
   **Then** those items produce no finding.

---

### Edge Cases

- **Prompt text that only exists after generation.** Surfaces that emit their prompt inside a
  generated standalone HTML document cannot be checked by reading source; the prompt must be
  produced by running the generator, and the generator must be callable without a browser.
- **Runtime-assembled prompts.** Some surfaces build the prompt from settings and stored
  preferences, so the same surface can emit different text on different machines. Verification
  must fix a deterministic input so the verdict is stable.
- **Separate bundles.** Standalone apps have their own build and are deliberately excluded from
  the root project's typecheck. A clause gap in one of them must still be detected.
- **Generated snapshots.** Sample HTML kept in the repository (for example published lesson
  snapshots) contains copies of these prompts. Those are build output and must be treated as
  artifacts, not as surfaces to be edited.
- **Non-option item types.** True/false, spelling, unscramble, sorting, matching, flashcards,
  polls and branching steps have no option list. They must never be reported as violations.
- **Partially scoped prompts.** A prompt that covers many item types may embed the rule for only
  some of them; the exemption must be explicit in the prompt, not implied by omission.
- **Non-English option sets.** Word counting is only meaningful in a language with word
  boundaries; an audit of an option set with no identifiable words must degrade to "not audited"
  rather than to a false violation.
- **Degenerate option sets.** All-equal-length options where the correct one is nevertheless the
  most detailed; single-word options; emoji-only options; numeric options.
- **A canonical change while copies remain independent.** Either the change propagates or
  verification fails loudly — never a silent partial rollout.
- **An unregistered surface that is genuinely not in scope.** Must be recorded as an exemption
  with a written reason, not left invisible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: There MUST be exactly one authoritative statement of the answer-length anti-cue
  rule, and it MUST be decomposed into individually identifiable mandatory clauses. The clause
  set is: (a) length balance within ±2 words and no option more than ~1.4× the shortest,
  (b) the longest option is never the correct one, (c) no detail cue (a number, date, proper
  name, comma, subordinate clause or extra qualifying detail unique to the correct option),
  (d) no position cue (rotation; never the same index twice in a row; roughly even use of
  positions), (e) no lexical echo (the correct option does not repeat the question stem more
  than the distractors do), (f) a silent self-check performed before returning, and
  (g) rewrite the question itself when it cannot be balanced fairly.
- **FR-002**: Every prompt surface that can cause a model to emit an option set MUST be recorded
  in a machine-readable inventory, one entry per surface.
- **FR-003**: Each inventory entry MUST record the tutor-facing entry point, where the prompt is
  emitted, which bundle it belongs to, which clauses its emitted wording carries, and its
  wording class: canonical, variant, or exempt.
- **FR-004**: Verification MUST assert clause presence on the **emitted** prompt text, produced
  by executing the surface's own prompt-producing code with a fixed input — not by matching the
  repository's source text.
- **FR-005**: A single documented command MUST verify the entire inventory, exit non-zero when
  any registered surface is missing any mandatory clause, and name each offending surface and
  each missing clause.
- **FR-006**: Verification MUST report any prompt-emitting source that can produce an option set
  but has no inventory entry, unless it is explicitly listed as an exemption with a written
  reason.
- **FR-007**: Verification MUST NOT require network access.
- **FR-008**: Changing a mandatory clause MUST either propagate to every surface carrying the
  rule, or cause verification to fail for every surface that has not been updated. A partial,
  silent rollout is not acceptable.
- **FR-009**: A `variant` wording MUST retain every mandatory clause. It MAY change reading
  level, audience, and item-type vocabulary; it MUST NOT drop or soften a clause.
- **FR-010**: Every clause MUST have at least one assertion that fails when that clause is
  removed from a surface that carries it, so no clause is protected only by chance.
- **FR-011**: When model-authored content is pasted back into the app, the app MUST be able to
  report the items that violate the rule, per item, naming the clause and the evidence that
  triggered it.
- **FR-012**: The per-item report MUST be advisory. It MUST NOT block loading, playing or
  exporting the content, and it MUST NOT modify the pasted content.
- **FR-013**: The report MUST be reachable from the surface that accepted the paste, without a
  separate tool and without the tutor re-supplying the content.
- **FR-014**: Verification MUST run as part of the project's existing build/verify path, with no
  new toolchain required of the maintainer.
- **FR-015**: An item type with no option list MUST NOT be reported as a violation, by either
  Story 1 verification or Story 3 auditing.

### Key Entities

- **Rule clause**: one mandatory requirement of the rule; has a stable identifier, a canonical
  wording, and a plain-language description of the giveaway it prevents.
- **Prompt surface**: a place in the product where a tutor can obtain a prompt. Identified by its
  tutor-facing entry point, not by a file path.
- **Inventory entry**: the per-surface record — entry point, emission site, bundle, wording
  class, clause coverage, and (for exemptions and variants) a written reason.
- **Wording variant**: a surface's wording, retained where the canonical text would be
  inappropriate; carries all clauses and records why it differs.
- **Conformance finding**: the result of verifying one surface — surface, clause, severity, and
  an excerpt of the offending text.
- **Option-set audit**: the result of auditing one item of pasted content — item location, clause
  violated, and the measured evidence (option word counts, correct index, echoed terms).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Running verification against the repository as it stands reports every surface whose
  wording is missing at least one mandatory clause, and reports **zero** false positives for
  surfaces that carry all clauses. (The seeded expectation from the discovery pass: at least two
  surfaces omit clause (e), and no surface other than the Lesson Creator carries clause (g) or
  the ~1.4× ratio.)
- **SC-002**: Removing any single clause from any registered surface makes verification fail,
  naming that surface and that clause — for **100%** of registered surfaces.
- **SC-003**: **100%** of a seeded set of newly added, unregistered option-producing prompt
  emitters are reported by verification.
- **SC-004**: Clause coverage is complete: all seven clauses have at least one assertion, and no
  clause is covered only by an exempt surface.
- **SC-005**: A tutor who pastes a lesson with a seeded giveaway item (correct option longer than
  every distractor by three or more words) is told which item and which clause, within 2 seconds
  for a 50-item lesson, with no network request.
- **SC-006**: Verification completes in under 30 seconds on a clean checkout with no network
  access.
- **SC-007**: The count of independently-worded copies of the rule that are not verified against
  the clause set is **zero**.
- **SC-008**: The project's existing checks still pass unchanged (`npm run lint` for the main app,
  and the deploy verification `npm run verify:dist`), so the new gate adds no regression to the
  existing path.

## Assumptions

- The rule's canonical statement stays in English for the main app. Child-facing surfaces keep
  child-appropriate wording; the requirement is parity of clauses, not identity of words.
- Standalone apps remain separately-built bundles. Carrying their own copy is acceptable; carrying
  an unverified copy is not.
- No new test framework is introduced. Verification follows the repository's existing style of
  TypeScript/Node scripts that import the real modules, print a per-check line, and exit non-zero
  on failure.
- The rule is enforced at build/verify time and reported at runtime; the app does not call a model
  itself, so no model is in the loop when auditing pasted content.
- Surfaces that cannot produce an option set are recorded as exempt rather than removed or
  rewritten.
- The existing prompt-verification harness in the repository is the natural starting point, but the
  feature MUST NOT depend on any single surface's harness surviving unchanged.
- The surface list in README.md is treated as stale input to the inventory, not as the inventory.
