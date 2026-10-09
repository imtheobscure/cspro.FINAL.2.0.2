import type { LearnerProfile } from '../../types';
import { getProfileContext } from '../../services/generation/core';

/**
 * AI prompt for the Interactive Lesson (gamified 3-tab player, Premium tier).
 * The AI produces `{ title, unit, learner, studyHtml, speakHtml, practiceHtml }`.
 * study/speak/practice are RAW HTML fragments (no <html>/<body>) using the
 * duolingo-style classes (.callout-*, .activity, .option[data-answer],
 * .gap-input[data-correct-answer], .speaker-btn[data-speak]).
 *
 * ⚠️ THE CORE IDEA (per product direction): the AI is NOT limited to ready-made
 * templates. It may design ANY custom HTML5 interactive code — inline styles,
 * custom widgets, mini-games, sliders, flip-cards, inline <script> blocks —
 * as long as it does NOT break the lesson player's wiring. The player wraps
 * everything, styles the contract classes, and executes AI <script> blocks.
 */
export const getInteractiveLessonPrompt = (learner: LearnerProfile, config?: any): string => {
    const profileCtx = getProfileContext(learner);
    const facts = `Name: ${learner.name}, Job: ${learner.personalInfo?.occupation || 'learner'}, Location: ${learner.personalInfo?.city || ''}/${learner.personalInfo?.country || ''}, Interests: ${Array.isArray(learner.interests) ? learner.interests.join(', ') : learner.interests}, Level: ${learner.cefrLevel || 'B1'}`;
    const topic = config?.details?.trim() || (config?.cefrLevel ? '' : '');

    return `
--- YOUR TASK (SETUP) ---
⚠️ MOST IMPORTANT RULE — YOU ARE DESIGNING HTML5 INTERACTIVE CODE, NOT A PLAIN DATA FILE.
The JSON envelope is only the transport. The heart of the lesson is RICH, IMMERSIVE,
HIGH-FIDELITY HTML5 — custom interactive widgets, motion, layered visual hierarchy and
storytelling that feels like a polished 2026 mobile game. You are the UI designer AND
the game designer: nothing here is a static document and nothing is a "ready-made
template". You may invent ANY HTML5 interaction you can imagine — flip-card decks,
drag-to-sort lists, tap-to-reveal mysteries, spinning wheels, sliders, typing games,
tabbed micro-explorers, mini-games — as long as it does not break the lesson player.

You are an expert Educational Content Generator and HTML5 UI designer for a language
learning application. Generate an INTERACTIVE LESSON for a gamified, Duolingo-style
player with three tabs (📖 Study, 🗣️ Speak, 🏋️ Practice), designed for BOTH kids and
adults: playful and joyful for kids, but never childish or simplistic for adults.

--- INPUT DATA ---
LEARNER_FACTS: ${facts}
${topic ? `LESSON_TOPIC/DETAILS: ${topic}\n` : ''}
${profileCtx}

--- EXACT JSON SCHEMA (output ONLY this JSON, no markdown fences, no commentary) ---
{
  "title": "Short lesson title, e.g. 'Daily Routines — Present Simple'",
  "unit": "Unit number/name, e.g. 'Unit 3' (optional)",
  "learner": {
    "name": "${learner.name || 'Learner'}",
    "level": "${learner.cefrLevel || 'B1'}",
    "nativeLanguage": "the learner's native language",
    "xp": 0,
    "streak": 0,
    "gems": 50
  },
  "studyHtml": "RAW HTML string (see CONTENT RULES)",
  "speakHtml": "RAW HTML string (see CONTENT RULES)",
  "practiceHtml": "RAW HTML string (see CONTENT RULES)"
}

--- CONTENT RULES (apply to studyHtml / speakHtml / practiceHtml) ---
1. Each field is a RAW HTML FRAGMENT — NO <html>, <head> or <body> tags. The app wraps and styles everything for you.
2. Structure per tab: an <h1> tab title, then a mix of callouts, activities and custom widgets.
3. CALLOUTS: <div class="callout callout-TYPE"><strong>EMOJI Title</strong><br>text</div>
   Available types: objective 🎯, success 🏆, idea 💡, warning ⚠️, question ❓, vocab 🔍, grammar 📐,
   pronunciation 🗣️, example 📘, story 📖, teacher 📝, culture 🌍, challenge ⚔️, mistake ❌,
   didyouknow 💡, checklist ✅, think 🤔, quote ❝, protip 💡, reminder ⏰, realworld 🌐.
   A callout-question becomes tap-to-reveal automatically: put the answer inside <div class="reveal">…</div>.
4. ACTIVITIES wrap in: <div class="activity"><h3>📝 Activity N: Name</h3>…</div>
5. MULTIPLE CHOICE — each option is a clickable div (min 2, one correct per question group):
   <div data-answer="unique-id" data-correct="true|false" data-activity="q1" data-category="vocab|grammar|reading|listening|speaking|general" data-feedback="Explain WHY, always kind and specific" class="option">Option text</div>
   Options of one question must share the same data-activity id. data-feedback is REQUIRED.
6. GAP FILL — type-in answers:
   She <input class="gap-input" data-correct-answer="wakes" data-activity="gap1" placeholder="(wake)"> up at 6.
   For check-all-at-once add a container id and button:
   <div class="activity" data-activity-id="setA"> …inputs… <button class="btn btn-primary" data-check-activity="setA">✅ Check</button></div>
   Use data-correct-answer="*" for free-production inputs (any answer of 2+ chars is accepted).
   Comparison ignores case, accents and punctuation, so minor spelling variations still pass.
7. SPEAKERS: any text can get a speaker button: <button class="speaker-btn" data-speak="exact sentence to read aloud">🔊</button>. Add data-tts="true" to a whole paragraph to make it tappable.
8. VOCABULARY: use a table inside a callout-vocab with a 🔊 column (Word / Meaning / Example / 🔊).
9. STUDY TAB: teach first — objective, success criteria, key idea, vocabulary table with 🔊, grammar focus, 2-3 choice activities, 1 gap-fill set, a short story box, 1-2 reading questions.
10. SPEAK TAB: 🗣️ speaking goal callout, a one-minute challenge with prompts, then:
    <div class="activity"><h3>👂 Shadowing Practice</h3><p>instructions…</p><div id="il-shadowing"></div></div>
    The app auto-fills #il-shadowing with 5 sentences ABOUT YOUR TOPIC ONLY if you also add right before </div> of that activity:
    <div data-shadowing="sentence 1|sentence 2|sentence 3|sentence 4|sentence 5"></div>
    (pipe-separated, no quotes). If you omit it, sensible defaults are used.
11. PRACTICE TAB: gamified review — a ⚔️ Boss Challenge callout, then:
    - Dictation round: <div class="activity"><h3>🎧 Round 1: Dictation</h3><div id="il-dictation"></div>
      <div data-dictation="sentence 1|sentence 2|sentence 3|sentence 4"></div></div>
      (pipe-separated sentences from YOUR lesson; app builds the whole listen-and-type UI).
    - An unscramble round using gap-inputs, a grammar boss battle (choice), and a final free-production round with data-correct-answer="*".

--- CUSTOM HTML5 WIDGETS (the part that makes your lesson unforgettable) ---
12. YOU ARE ALLOWED — ENCOURAGED — TO BUILD YOUR OWN INTERACTIVE WIDGETS. Anything HTML5 can do is fair game:
    - Wrap every custom widget in <div class="ai-widget">…</div>.
    - Inline <style> blocks INSIDE the widget are allowed (scope them: prefix every selector with .ai-widget, e.g. ".ai-widget .deck {…}").
    - One <script> block per widget, placed at the END of the widget, is allowed and WILL be executed by the player. Wrap it in an IIFE: <script>(function(){ … your code … })();</script>.
    - Use event listeners (addEventListener), not global onclick= attributes (the player's sandbox prefers listeners; inline onclick works too but keep it simple).
    - Ideas: tap-to-flip vocabulary decks, drag-to-order sentences, a "guess the emoji" puzzle, a spinning wheel picker, an animated story scene with tap hotspots, a hidden-object hunt, a matching maze, a typing race, a memory grid, a custom progress dial — anything that makes the learner DO something delightful.
13. WIDGET SAFETY CONTRACT — your code must NEVER break the lesson player:
    - NEVER remove, overwrite, or re-render these engine elements: #il-dictation, #il-shadowing, or the .activity containers.
    - NEVER override window functions (window.ilRunDictation, window.ilRunShadowing), and do not remove other scripts' listeners.
    - Do not use ids that start with "il-"; use your own unique id prefix (e.g. id="aw-deck-1").
    - Do not touch document.body layout globally (no fixed positioning over the whole page, no document-level click handlers that stopPropagation).
    - Keep your widget self-contained: if the user re-taps the tab, the player re-injects the HTML and re-runs your script — your script must be idempotent (guard double-init with a flag).
    - Test mentally: if your widget throws, the player must still work. Wrap risky code in try/catch.
14. NEVER write inline JavaScript OUTSIDE a widget script block, and never write <script> tags at the top level of the fragment — the player wires all contract interactions (options, gaps, speakers, dictation, shadowing) itself.

--- HIGH-FIDELITY DESIGN PRINCIPLES (apply to every snippet AND widget) ---
15. DESIGN FOR DELIGHT, KIDS AND ADULTS: big rounded cards, generous spacing, emoji as visual anchors, playful but clean typography. Content must read as a polished 2026 game: every block has a purpose and a visual beat.
16. MAXIMUM INTERACTIVITY PER TASK: prefer tapping over reading. Every activity should make the learner DO something — tap an option, fill a gap, tap a speaker, reveal a card, sort, match, guess. Avoid long paragraphs; break text into chips, cards, and bullet visuals.
17. LAYERS & REVEAL: use callout-question + <div class="reveal"> for self-check cards, tap-to-flip vocabulary, and "try it first" moments. Build curiosity before giving answers.
18. NARRATIVE & IMMERSION: open the Study tab with a short story callout that sets up a scenario the learner is the hero of; keep that scenario alive through all three tabs (same characters, same goal).
19. SENSORY SUPPORT: add a 🔊 speaker button beside any new word, phrase, or sentence (rule 7), so every chunk is see-it-hear-it. Keep an encouraging "mission" tone.
20. ACCESSIBLE & POLISHED: use semantic headings (h1/h3), aria-labels on icon-only buttons, and CSS classes from the contract above for contract elements (the app's stylesheet renders them). Custom widget styles are yours to define (scoped under .ai-widget). Never rely on color alone: pair color with emoji/icons.
21. Adapt ALL content to the learner's CEFR level (${learner.cefrLevel || 'B1'}) and interests. Use plenty of emoji, short sentences, and an encouraging tone.
22. Produce valid JSON: escape all quotes inside HTML strings (\\"), newlines as \\n. The three HTML fields must be single JSON strings.
`;
};