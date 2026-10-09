import {FlipbookJSON } from './flipbookTypes';
import { Learner, TeacherProfile } from '../types';

export function buildMasterHomeworkPrompt(
  book:FlipbookJSON,
  homeworkBrief: string,
  deadlineDate: string,
  learner?: Learner,
  teacher?: TeacherProfile
): string {
  const learnerName = learner?.name || 'Luna';
  const avatarEmoji = learner?.avatar || book.learnerAvatarEmoji || '🦸';
  const petEmoji = book.learnerPetEmoji || '🐾';
  const petName = learner?.petType ? `${learner.petType} Companion` : 'Whiskers';
  const tutorName = teacher?.characterName || 'Wizard Dan';

  const vocabSummary = book.vocabulary.map(v => `• ${v.word} ${v.phonetic ? `(${v.phonetic})` : ''}: ${v.meaning} (Example: "${v.example}")`).join('\n');
  const sectionsSummary = book.sections.map((s, i) => `• Chapter ${i + 1}: ${s.title} — ${s.subtitle || s.objective || ''}`).join('\n');

  return `╔════════════════════════════════════════════════════════════════════════════╗
  🎮 MASTER PROMPT: 100% SELF-CONTAINED GAMIFIED HTML5 HOMEWORK GENERATOR 🎮
╚════════════════════════════════════════════════════════════════════════════╝

You are an expert full-stack web developer, children's game designer, and master ESL educator.
Your task is to write a **COMPLETE, FULLY PLAYABLE, ZERO-DEPENDENCY STANDALONE HTML5 GAME FILE** in raw HTML/CSS/JavaScript.

─────────────────────────────────────────────────────────────────────────────
🎯 THE HERO & LESSON CONTEXT:
─────────────────────────────────────────────────────────────────────────────
• 🦸 Student Hero Name: ${learnerName} ${avatarEmoji}
• 🐾 Companion Pet: ${petName} ${petEmoji}
• 🧙‍♂️ Grand Tutor: ${tutorName}
• 🎯 Target CEFR Level: ${book.level} (Strictly calibrated 1 step simpler for effortless comprehension and high oral confidence)
• 📅 Homework Due Date / Deadline: ${deadlineDate || 'Friday, 5:00 PM'}
• 📚 Flipbook Lesson Topic: "${book.title}" — ${book.subtitle}

• 💎 Target Vocabulary from Lesson:
${vocabSummary}

• 📖 Story Chapters Covered:
${sectionsSummary}

─────────────────────────────────────────────────────────────────────────────
📝 TEACHER'S SPECIFIC HOMEWORK INSTRUCTIONS:
─────────────────────────────────────────────────────────────────────────────
"${homeworkBrief || 'Create a thrilling 5-round gamified homework quest reviewing the lesson vocabulary, oral speaking, and grammar with a Boss Battle finale!'}"

─────────────────────────────────────────────────────────────────────────────
⚡ STRICT ARCHITECTURAL & GAMEPLAY MANDATES (NO LAZY AI / NO PLACEHOLDERS):
─────────────────────────────────────────────────────────────────────────────
1. 100% STANDALONE SINGLE-FILE HTML:
   - Output must start directly with \`<!DOCTYPE html>\` and end with \`</html>\`.
   - Embed all CSS inside \`<style>...</style>\` (modern responsive Tailwind-like aesthetics, vibrant glowing gradients, smooth CSS transitions, dark/light fantasy theme).
   - Embed all JavaScript inside \`<script>...</script>\`.
   - ZERO external JS/CSS dependencies (no broken CDNs). Must run 100% offline in any browser or iframe!

2. BUILT-IN WEB AUDIO API SOUND ENGINE (NO EXTERNAL AUDIO FILES):
   - Synthesize real sound effects using the Web Audio API (\`AudioContext\`):
     • Click pops, correct ding fanfare, error buzz, engine rev nitro boost, boss clash hit, laser zap, and star shower victory chime.

3. 5 DISTINCT, RICHLY REITERATED INTERACTIVE GAME ROUNDS:
   • 🏁 Round 1: NITRO WORD SPEED RACE (Right-to-left race track with rival cars, word order unscrambling, tire screech & nitro sound).
   • 🗣️ Round 2: ORAL PRONUNCIATION & VOICE LAB (Web Speech API synthesis for listening & microphone speech recognition for speaking repeat).
   • 🧠 Round 3: 3D MEMORY MATCH FLIP (Flipping card tiles with Magic Eye power-up and Lightning match).
   • ⚔️ Round 4: SHADOW BOSS HP BATTLE (Answer 4+ grammar/vocab questions to attack the Boss; Boss has an animated HP bar, shakes on hit, and unleashes spell attacks).
   • 📜 Round 5: HERO'S REFLECTION & SEL EXIT TICKET (Emoji mood meter, sentence creation, and kindness pledge).

4. IMMERSIVE HERO PERSONALIZATION:
   - Feature ${learnerName} and pet ${petName} throughout all dialogues, HUD headers, and battle victory screens.
   - Display a live countdown timer until the deadline (${deadlineDate || 'Due Soon'}).
   - Live XP & Coin tracker with level-up animations.
   - LocalStorage auto-save so student never loses their score.

5. OFFICIAL PRINTABLE / DOWNLOADABLE CERTIFICATE:
   - Upon completing all 5 rounds, display a gorgeous Gold-Trimmed Certificate of Completion with:
     • Student Name: ${learnerName} ${avatarEmoji}
     • Pet: ${petName} ${petEmoji}
     • Tutor Signature: ${tutorName} 🧙‍♂️
     • Total Score & Grade (A+ / Master Storyteller)
     • "🖨️ Print / Save Certificate" button.

─────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT:
─────────────────────────────────────────────────────────────────────────────
Output ONLY the raw, complete, non-truncated HTML code enclosed in:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
...
</html>
\`\`\``;
}
