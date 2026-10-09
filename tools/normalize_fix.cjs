const fs = require("fs");
const GEN = "utils/englishLessonHtmlGenerator.ts";
let src = fs.readFileSync(GEN, "utf8");

// 1) Add audio_block canonical row
const aOld = '    [["audio.*clip"], "audio_block"],';
if (src.indexOf(aOld) < 0) { console.error("audio clip row missing"); process.exit(1); }
src = src.replace(aOld, '    [["audio_block", "audio.*clip"], "audio_block"],');

// 2) Exact-match first: canonical type names must not be hijacked by fuzzy substrings
const probe = 'const t = rawType.toLowerCase().trim().replace(/\\s+/g, "_");';
if (src.indexOf(probe) < 0) { console.error("normalizeType probe missing"); process.exit(1); }
if (src.indexOf("CANONICAL_TYPES") >= 0) { console.log("already patched"); process.exit(0); }

const injection = probe + `

  // Canonical names always win: fuzzy substring rules below are only for
  // legacy/AI aliases. Without this, "gap_transcript" would be caught by the
  // generic "gap" rule and become gap_fill, "gap_fill_dropdown" would collapse
  // into gap_fill, etc.
  const CANONICAL_TYPES = new Set([
    "listening_mc", "listening_script", "movie_scene", "speaking_jam", "speaking_game",
    "audio_matching", "audio_block", "memory_match", "connect_lines", "venn_diagram",
    "timeline_placement", "jigsaw_puzzle", "hotspot", "drag_label", "sequence_ordering",
    "slider_input", "matching", "scramble", "gap_fill", "gap_fill_dropdown", "gap_fill_drag",
    "dictation", "flashcard", "sorting", "essay_writing", "voice_recording", "typing_speed",
    "word_search", "crossword", "hangman", "bingo", "escape_room", "scattergories",
    "error_correction", "contextual_mc", "confidence_weighted", "select_all", "true_false",
    "short_answer", "multiple_choice", "read_aloud", "pronunciation_check", "minimal_pairs",
    "tongue_twister", "shadowing", "word_stress", "sentence_stress", "speak_flashcard",
    "conversation_roleplay", "timed_reading", "annotation_reading", "text_reconstruction",
    "summary_writing", "guided_writing", "paragraph_organizer", "peer_review", "gap_transcript",
    "note_taking", "ai_trivia", "would_you_rather", "pick_who", "charades", "interactive_story",
    "pictionary", "concealed", "split_view", "image_block", "video_block", "code_block",
    "math_block", "quote_block", "vocabulary_table", "grammar_explanation",
    "paragraph", "list", "questions",
  ]);
  if (CANONICAL_TYPES.has(t)) return t;`;

src = src.replace(probe, injection);
fs.writeFileSync(GEN, src);
console.log("normalizeType fixed; length", src.length);
