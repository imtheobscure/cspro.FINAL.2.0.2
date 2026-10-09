/**
 * Music Lesson — AI prompt for the Manual JSON Creator.
 * Instructs the model to emit a full PremiumLesson JSON (the same schema the
 * standalone HTML generator and React presenter consume).
 *
 * The tutor supplies the song up-front in Step 2 · Customization & Lesson
 * Structure (song name, singer, lyrics, media link/local file), so the prompt is
 * generated around THAT exact song.
 *
 * Every mini-lesson also carries the learner's native language (L1):
 * `l1Title` / `l1Summary` for the lesson, `l1Heading` + `l1HtmlBody` for every
 * content card, `l1Question` for every concept check and `catFeedbackL1` for the
 * tutor feedback — so the learner can always read the easy version first.
 */

export interface MusicLessonInputs {
  /** Song title supplied by the tutor in Lesson Creator → Step 2. */
  songTitle?: string;
  /** Singer / band supplied by the tutor. */
  artist?: string;
  /** Full lyrics pasted by the tutor (one line per row). */
  lyrics?: string;
  /** Media link supplied by the tutor (or the packaged local file path). */
  mediaUrl?: string;
  /** How the media is delivered: a link or a local file bundled in the ZIP. */
  mediaMode?: 'link' | 'local';
  /** File name of the local media, when mediaMode === 'local'. */
  localFileName?: string;
}

const SCHEMA_BLOCK = `{
  "id": "unique-song-id",
  "songTitle": "Song title",
  "artist": "Artist name",
  "level": "B2",
  "goals": "Master idioms, phrasal verbs and conversational intonation",
  "l1": "Spanish",
  "mediaUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "subtitles": [
    {
      "start": 0,
      "end": 8,
      "text": "First lyric line of the song",
      "translation": "Native-language (L1) translation of the line — ALWAYS required",
      "highlights": [
        {
          "word": "target word or phrase",
          "type": "idiom | phrasal_verb | vocab | grammar",
          "definition": "Simple CEFR-level definition",
          "translation": "L1 translation of this word/phrase",
          "example": "Personalized example sentence",
          "ccq": "Concept checking question"
        }
      ]
    }
  ],
  "miniLessons": [
    {
      "id": "lesson-1",
      "timeMarker": 10,
      "title": "Mini-lesson title based on the lyric section",
      "l1Title": "The SAME mini-lesson title translated into the learner's L1",
      "l1Summary": "1-3 sentences in the learner's L1 explaining, in the simplest words, what this mini-lesson teaches and what the lyric section means.",
      "contentCards": [
        {
          "heading": "Form & Structure",
          "htmlBody": "<p>English explanation written for a full-width card: short paragraphs (2-4 sentences each), <strong>bold</strong> key words, and one example per idea.</p>",
          "l1Heading": "Form & Structure translated into the learner's L1",
          "l1HtmlBody": "<p>The COMPLETE native-language (L1) version of this card: same teaching point, but written in the easiest possible L1 — short sentences, no jargon, one everyday example.</p>"
        },
        {
          "heading": "Meaning & Metaphors",
          "htmlBody": "<p>...</p>",
          "l1Heading": "...",
          "l1HtmlBody": "<p>...</p>"
        },
        {
          "heading": "Song Story & Culture",
          "htmlBody": "<p>...</p>",
          "l1Heading": "...",
          "l1HtmlBody": "<p>...</p>"
        },
        {
          "heading": "Personalized Examples",
          "htmlBody": "<p>...</p>",
          "l1Heading": "...",
          "l1HtmlBody": "<p>...</p>"
        }
      ],
      "ccqs": [
        {
          "question": "Concept checking question about the lyric",
          "checklist": ["Use target vocabulary", "Past tense", "Emotion words"],
          "l1Question": "The same concept-check question written in the learner's L1"
        }
      ],
      "activities": [
        {
          "type": "gapFill | dragDrop | scramble | match | multipleChoice | trueFalse | ordering | dictation | errorCorrection | sentenceBuilder | findMistake | discussionQuestions",
          "title": "Activity title",
          "instruction": "What to do",
          "cards": [
            {
              "question": "Question text",
              "options": ["Option A", "Option B", "Option C"],
              "answer": "The correct option text",
              "instruction": "Cat reads this on hover",
              "feedbackCorrect": "Motivating cat feedback",
              "feedbackIncorrect": "Constructive cat feedback"
            }
          ]
        }
      ],
      "challenge": {
        "type": "roleplay | lyricTranscription | karaoke | metaphor | newVerse | compareSongs | paraphraseChorus | shortReview | debate | predictNext | predictPast | audioRecording",
        "title": "Stage challenge title",
        "instruction": "Instructions",
        "data": {
          "lines": ["Lyric lines to perform"],
          "situation": "Personalized scenario",
          "checklist": ["Target phrases to include"]
        }
      },
      "catFeedback": "Warm encouraging summary (no emojis — spoken aloud)",
      "catFeedbackL1": "The same warm encouragement written in the learner's L1"
    }
  ]
}`;

const BASE_PROMPT = `You are an expert ESL curriculum designer specializing in music-based lessons. Create a COMPLETE premium song lesson ("Music Lesson / Song Lesson Studio") in strict JSON. The output is rendered as an interactive song player with synced subtitles, highlighted vocabulary, full-width mini-lesson cards, activities, and a karaoke arena — so fill EVERY field below. No empty arrays, no placeholders, no markdown fences — return ONLY valid JSON.

${SCHEMA_BLOCK}

RULES:
1. subtitles[] must cover the WHOLE song with sequential timestamps (start/end in seconds), and EVERY line MUST have an L1 "translation" — it is shown right under the lyric.
2. miniLessons[] must contain AT LEAST 4 (ideally 6-10) mini-lessons spread across the song timeline; timeMarker must fall inside one of the subtitle ranges.
3. Each mini-lesson needs 2-4 contentCards, 2-4 ccqs, 2-5 activities (3-5 cards each), one challenge, and catFeedback.
4. Vary activity types; use lyric text in questions and examples.
5. Include learner personalization in examples, dialogue and challenges.
6. Escape quotes inside HTML strings properly (\\" inside the JSON string values).
7. Return ONLY the JSON object — no markdown, no commentary.

NATIVE-LANGUAGE (L1) SUPPORT — THIS IS THE HEART OF THE LESSON:
Every mini-lesson is rendered as a FULL-WIDTH card on screen next to the song, and the learner must be able to understand it instantly. So for EVERY mini-lesson you MUST produce the L1 twin of every piece of teaching text:
- "l1Title" and "l1Summary" on the mini-lesson itself.
- "l1Heading" AND "l1HtmlBody" on EVERY content card (a complete translation/rewrite of that card in the learner's L1, not a one-line summary).
- "l1Question" on EVERY concept check (ccqs).
- "catFeedbackL1" on the mini-lesson.
Write the L1 text in the simplest everyday register the learner speaks — short sentences, common words, no grammar jargon. It must be a real translation of the same teaching point, never meta-commentary about the exercise.

CARD WRITING STYLE (full-width cards, large text):
- Write each card as 2-4 short paragraphs separated into clear blocks, using <p>, <strong>, <ul><li> and inline highlight spans.
- Keep every sentence short and readable; avoid walls of text and never repeat the same example twice.
- Put the target language in bold and add one concrete, personalised example per teaching point.
- Suggested card set: (1) Form & Structure, (2) Meaning & Metaphors, (3) Song Story & Culture, (4) Personalized Examples / real-life usage.`;

/** Legacy named export — kept so existing imports keep working. */
export const MUSIC_LESSON_PROMPT = BASE_PROMPT;

export const getMusicLessonPrompt = (learner: any, inputs?: MusicLessonInputs): string => {
  const songTitle = (inputs?.songTitle || '').trim();
  const artist = (inputs?.artist || '').trim();
  const lyrics = (inputs?.lyrics || '').trim();
  const mediaUrl = (inputs?.mediaUrl || '').trim();
  const localFileName = (inputs?.localFileName || '').trim();

  const l1Name = learner?.l1Language || learner?.translationLanguage || learner?.nativeLanguage || "the learner's native language";

  // No song supplied yet → keep the classic behaviour (the model picks a song),
  // but still tell it exactly which fields to fill with the tutor's data later.
  if (!songTitle && !artist && !lyrics && !mediaUrl) {
    return BASE_PROMPT;
  }

  const learnerName = learner?.name || 'the learner';
  const learnerLevel = learner?.cefrLevel || 'B1';

  let prompt = `## SONG SPECIFICATION (NON-NEGOTIABLE — USE EXACTLY THIS SONG)

You are building a Music Lesson for ${learnerName} (CEFR ${learnerLevel}, native language: ${l1Name}).
The tutor has ALREADY chosen the song below. Do NOT change it, do NOT invent a different
song, do NOT rename the artist, and do NOT ask for any additional text or PDF.

`;

  if (songTitle) prompt += `- Song title ("songTitle"): ${songTitle}\n`;
  if (artist) prompt += `- Singer / band ("artist"): ${artist}\n`;
  if (mediaUrl) prompt += `- Media source ("mediaUrl" — copy this value EXACTLY into the JSON): ${mediaUrl}\n`;
  if (localFileName) prompt += `- The media file travels with the lesson as a local package; the player is pointed at it automatically, so keep "mediaUrl" exactly as given above.\n`;

  prompt += `- Native language (L1): ${l1Name}. Set "l1" to "${l1Name}" and write EVERY l1Title / l1Summary / l1Heading / l1HtmlBody / l1Question / catFeedbackL1 / subtitles[].translation value in ${l1Name}.\n`;

  if (lyrics) {
    prompt += `
## THE LYRICS (THIS IS THE SOURCE TEXT — USE IT VERBATIM)

Every "subtitles[].text" value MUST be a real line taken from the lyrics below, in the
original order, with no invented or omitted lines. Split long lines only where the song
itself is broken into clearly separate lyric lines.
Estimate each line's "start"/"end" in seconds so the timeline is sequential and continuous
across the whole song (the tutor fine-tunes the exact timings later in the Lyric Sync Studio,
so a close, ordered estimate is enough). Attach "highlights" to the lines that carry the
lesson's target language, and give EVERY line its "translation" in ${l1Name}.

--- BEGIN LYRICS ---
${lyrics}
--- END LYRICS ---
`;
  } else {
    prompt += `
## LYRICS NOT SUPPLIED

Use the well-known, publicly documented lyrics of "${songTitle || 'the selected song'}"
by ${artist || 'the artist'}. Cover the song's actual verse / chorus structure, line by line,
in the original order. Keep every "subtitles[].text" value to a single real lyric line, add
its ${l1Name} "translation", and space the timestamps sequentially across the song.
`;
  }

  prompt += `
## HARD REQUIREMENTS FOR THIS SONG
1. "songTitle" and "artist" must match the values above character-for-character.
2. "mediaUrl" must be exactly the value given above (never a placeholder).
3. subtitles[] must contain the song's real lyric lines, in order, each with start/end seconds AND a ${l1Name} "translation".
4. "highlights" must teach idioms, phrasal verbs, key vocabulary and grammar actually present
   in these lyrics — no generic filler.
5. miniLessons[] must have at least ${lyrics ? Math.max(4, Math.min(10, Math.ceil(lyrics.split(/\r?\n/).filter(Boolean).length / 4) || 4)) : 6} mini-lessons whose "timeMarker" lands inside a subtitle range and whose content
   explains that exact part of the song. Each needs 2-4 contentCards, 2-4 ccqs, 2-5 activities,
   one challenge and catFeedback.
6. EVERY mini-lesson needs its ${l1Name} twin: l1Title, l1Summary, an l1Heading + l1HtmlBody on
   every single content card, an l1Question on every ccq, and catFeedbackL1. The L1 text must be
   a complete, simple, easy-to-read version of the same teaching point — this is how the learner
   understands the lesson, so never leave it out and never make it a one-word gloss.
7. Level the English strictly for CEFR ${learnerLevel}; personalise every example for ${learnerName}.
8. Return ONLY the JSON object — no markdown fences, no commentary.

`;

  prompt += BASE_PROMPT.replace(/^You are an expert ESL curriculum designer[^\n]*\n\n/, '');

  return prompt;
};
