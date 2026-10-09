# 20 · Word Hunt 🔍

**Band:** Young (7–12) · **Type:** Game (screen, visual scanning) · **Time:** 8–10 min · **Runtime:** one HTML file

## 1 · What it is
A letter grid with four to six hidden words, all horizontal or vertical. Because the child
already knows the words, the task is not recall but *searching* — visual attention and
letter-pattern recognition, a complementary and calming skill, perfect after a loud game.
No diagonals before age 9, and no two hidden words share a crossing letter, so success is always
possible. (Classic word search, adjusted for reading level.)

## 2 · Goals
- The child **finds 4–6 hidden words** in the grid.
- The child **reads each found word aloud** as it lights up.
- The child practises **scanning left-right and top-bottom** — early reading mechanics.
- The tutor gets a calm, quiet beat for a class that has just been noisy.

## 3 · How a round runs
1. Splash → "Let's go!".
2. The grid appears; the word list is shown as emoji + word (not just text).
3. Drag across letters to select a word; a correct find lights the word with a sparkle.
4. A wrong drag just clears; no penalty.
5. "Hint" reveals the first letter of the hardest word, once per game.
6. All found → the words parade; one new grid can be generated from the same words.

## 4 · Tutor & room notes
- Horizontal and vertical only before 9; diagonals after, if the child enjoys it.
- Never share a crossing letter between two hidden words.
- Keep the grid 8×8 to 10×10 — bigger is not better.
- Calm music-free silence is part of the design; let them concentrate.

## 5 · Copy AI prompt
```text
Build it exactly as specified; follow kids-lesson-library/README.md's master prompt and the
unified system (splash, identity, controls, voice, praise, band rules).

Type: Game — word hunt (visual scanning). Band: Young (7-12). Runtime: one HTML file.
Goals: find 4-6 hidden words; read each found word aloud; practise left-right/top-bottom
scanning; a calm beat for a noisy class.
Content: one 8x8-10x10 letter grid with 4-6 hidden words (the learner's words), placed
horizontally or vertically only, never sharing a crossing letter; the word list shown as
emoji + word; one hint per game (first letter of the hardest word).
Flow: splash → grid + word list → drag across letters → correct find lights + sparkle + the
word is read aloud / wrong drag just clears → all found = word parade → optional new grid with
the same words.
Include: the exact grid with placements (or a deterministic generator spec), the no-diagonal and
no-crossing rules, and the no-screen fallback (write the grid on the board; chalk instead of
pixels).
Stars for effort; no timer, no penalty. Return only the HTML file.
```
