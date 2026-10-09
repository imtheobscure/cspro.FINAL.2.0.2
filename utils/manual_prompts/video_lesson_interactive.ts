import type { LearnerProfile } from '../../types';

export const getVideoLessonInteractivePrompt = (
  learner?: Partial<LearnerProfile>,
  config?: { topic?: string }
): string => {
  const topic = config?.topic || 'your chosen video (movie scene, TV episode, documentary, YouTube talk, song video…)';
  const l1 = (learner as any)?.nativeLanguage || (learner as any)?.l1 || 'the learner\u2019s native language (ask the tutor if unknown)';
  const learnerName = learner?.name || 'Learner';
  const cefr = learner?.cefrLevel || 'B1';
  return `🎬 VIDEO LESSON (videoLessonInteractive) — READY-TO-TEACH, VIDEO-DRIVEN LESSON JSON

You are an expert ESL / EdTech lesson designer. Build a complete, gamified, VIDEO-SYNCED lesson JSON for the manual creator. The lesson runs in the Video Lesson player: the tutor sees ONE CHAPTER AT A TIME, every segment is time-stamped to the video, and each activity pops at its moment in the timeline.

⏸ FIRST CHECK THE INPUTS BELOW. If the video link/URL (or the transcript needed to time the chapters) is missing, reply ONLY with: "Please provide the video link/URL and, if possible, its transcript or subtitles." When the link and transcript are already provided, generate the JSON immediately — never ask for a PDF or a lesson text file.

--- LEARNER PROFILE ---
Name: ${learnerName}
CEFR: ${cefr}
Native language (L1): ${l1}
Interests: ${(learner as any)?.interests || ''}
Age: ${(learner as any)?.personalInfo?.age || ''}
Goals: ${(learner as any)?.goals || 'general English improvement'}

--- TOPIC ---
${topic}

--- EXACT JSON SCHEMA (output only valid JSON, nothing else) ---
{
  "metadata": {
    "title": "Catchy lesson title derived from the video",
    "targetLanguage": "English",
    "cefrLevel": "${cefr}",
    "learnerL1": "${l1}",
    "estimatedDurationSeconds": <number: approx completion time incl. activities>,
    "videoUrl": "<the real video URL the tutor provided — YouTube / Vimeo / Dailymotion / direct mp4>"
  },
  "globalSettings": { "pointsToLevelUp": 500, "enableStreak": true, "suspenseSounds": true },
  "badges": [
    { "id": "first_answer", "name": "First Step", "emoji": "👣", "rarity": "common", "condition": "Complete your first activity", "description": "…" },
    { "id": "word_master", "name": "Word Master", "emoji": "📚", "rarity": "rare", "condition": "3 vocabulary activities correct", "description": "…" },
    { "id": "streak_5", "name": "On Fire", "emoji": "🔥", "rarity": "epic", "condition": "5-streak", "description": "…" },
    { "id": "perfect_speaker", "name": "Perfect Speaker", "emoji": "🎤", "rarity": "legendary", "condition": "Speaking activity done", "description": "…" }
  ],
  "learnerProfile": { "name": "${learnerName}", "level": "${cefr}", "nativeLanguage": "${l1}", "goals": "…", "interests": "…", "facts": "…" },
  "segments": [
    {
      "id": "seg-1",
      "title": "Natural chapter name",
      "summary": "One sentence (max 20 words) telling the learner what this chapter covers — it is the collapsed preview line.",
      "startTime": <seconds when this chapter begins>,
      "endTime": <seconds>,
      "activities": [
        {
          "id": "seg-1-act-1",
          "type": "multipleChoice",
          "timestamp": <video second this pops>,
          "title": "Comprehension Check",
          "emoji": "🔍",
          "color": "gold|teal|purple|orange|green|pink|blue",
          "points": 10,
          "requiredForNext": true,
          "difficulty": "easy|medium|hard",
          "correctFeedback": "Nice! …",
          "incorrectFeedback": "Not quite — …",
          "lessonContent": { "warmUp": "…", "meaning": "…", "form": "…", "use": "…", "personalizedExamples": ["…"], "lifeApplication": "…" },
          "content": { "question": "…", "translation": "<same instruction/question in L1: ${l1}>", "options": [ { "id": "a", "text": "…", "isCorrect": true }, { "id": "b", "text": "…" } ] }
        }
      ]
    }
  ]
}

--- ACTIVITY TYPES & THEIR content SHAPES ---
flashcard        → content: { "cards": [ { "front","back","pronunciation?","translation?","example?" } ] }
multipleChoice   → content: { "question", "translation?", "options":[{id,text,isCorrect}] }
trueFalse        → content: { "question", "translation?", "answer": true|false }
fillBlanks       → content: { "sentence":"…___…___…", "blanks":["w1","w2"], "translation?" }
dragDrop         → content: { "items":[…], "targets":[…], "pairs":[{left,right}], "translation?" }  (or pairs-only)
matching         → content: { "pairs":[{ "left","right" }], "translation?" }
speaking         → content: { "expectedSentence": "Line to pronounce", "translation?" }
truthOrDare      → content: { "truth": "…", "dare": "…", "translation?" }            (pick one side)
wouldYouRather   → content: { "wouldYouOption1": "…", "wouldYouOption2": "…", "translation?" }
discussion       → content: { "discussionPrompt": "…", "translation?" }
predictNext      → content: { "question": "What happens next?", "predictOptions":[{ "text":"…", "consequence":"…" }], "translation?" }
voiceOver        → content: { "question": "Line to voice-over while the video plays muted", "translation?" }
ordering         → content: { "orderedItems": [correct order], "translation?" }
wordScramble     → content: { "scrambledWord":"…", "correctWord":"…", "translation?" }
reflection       → content: { "reflectionPrompt": "…", "translation?" }
hotspot          → content: { "hotspot": { "x":50,"y":50,"question":"…","options":[…] }, "translation?" }
videoPause       → content: { "videoPausePrompt": "…", "translation?" }
readingChallenge → content: { "reading": { "title","genre":"fiction|factual|whatIf","text","translation?","questions":[{question,options}] } }
listeningComprehension → content: { "listening": { "title","genre":"podcast|dialogue|talk|interview|story","audioText","translation?","showTranscript":true,"questions":[{question,options,timestamp?}] } }

--- NATIVE LANGUAGE (L1) RULES — the learner reads an easy ${l1} twin everywhere ---
Every activity MUST carry an L1 twin so nothing is only in English:
1. Every non-flashcard activity needs content.translation: a full, natural ${l1} version of its question/instruction (never a one-word gloss, never a copy of the English).
2. Every flashcard needs card.translation (${l1}) and, when useful, an L1 example.
3. readingChallenge.reading.translation and listeningComprehension.listening.translation hold the ${l1} version of the passage/audio text.
4. lessonContent fields stay in English (they are the teacher's metalanguage notes), but keep them short and concrete.
5. metadata.learnerL1 = "${l1}", and learnerProfile.nativeLanguage = "${l1}".

--- FLOW RULES (the player shows one chapter at a time) ---
1. Cover the WHOLE video: 8–16 chapters whose startTime/endTime follow real timestamps from the transcript you were given.
2. Write a one-sentence "summary" for every segment — it is the only text visible while the chapter is collapsed, so it must tell the learner what they will practise.
3. Order activities inside each chapter from easier to harder, and place them so their timestamp falls inside the chapter's startTime–endTime.
4. Set requiredForNext: true on exactly ONE activity per chapter — the one the learner must finish before "Next chapter →" unlocks. Everything else is optional bonus XP.
5. At least one activity per chapter; alternate activity types (never the same type twice in a row); use at least 10 different types across the lesson.
6. Every activity has emoji, color, points (5–25), difficulty, correctFeedback, incorrectFeedback and content that perfectly matches its type.
7. Vocabulary/grammar grows naturally out of lines actually spoken in the video; quotes must come from the transcript.
8. Ids unique: segments seg-<n>; activities <segId>-act-<n>.
9. Include learnerProfile.facts with 2 short fun facts personalised to the learner's interests.

Output ONLY the JSON object — no markdown fences, no commentary.`;
};
