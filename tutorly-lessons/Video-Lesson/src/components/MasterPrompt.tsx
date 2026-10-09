import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

export const MasterPrompt: React.FC = () => {
  const { showMasterPrompt, setShowMasterPrompt, setLesson, setMediaUrl, setMediaType, learnerL1, setLearnerL1 } = useStore();
  const [tab, setTab] = useState<'generate' | 'import'>('generate');
  const [learnerName, setLearnerName] = useState('');
  const [learnerLevel, setLearnerLevel] = useState('B1');
  const [nativeLang, setNativeLang] = useState(learnerL1 || 'es');
  const [goals, setGoals] = useState('');
  const [interests, setInterests] = useState('');
  const [transcript, setTranscript] = useState('');
  const [videoDuration, setVideoDuration] = useState('600');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [copied, setCopied] = useState(false);

  const L1_LANGUAGES = [
    { code: 'es', name: 'Spanish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ru', name: 'Russian' },
    { code: 'hi', name: 'Hindi' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
  ];

  const generatePrompt = () => {
    const l1Name = L1_LANGUAGES.find(l => l.code === nativeLang)?.name || nativeLang;
    setLearnerL1(nativeLang);
    
    const prompt = `You are a world-class ESL curriculum designer creating a comprehensive "Super Lesson" JSON for an interactive video-based language learning app called "Video Lesson".

## LEARNER PROFILE
- Name: ${learnerName || 'Student'}
- CEFR Level: ${learnerLevel}
- Native Language (L1): ${l1Name} (code: ${nativeLang})
- Learning Goals: ${goals || 'Improve general English skills through video content'}
- Interests: ${interests || 'Movies, storytelling, nature'}

## VIDEO DETAILS
- Estimated Duration: ${videoDuration} seconds

## YOUR TASK
Create an extremely comprehensive, gamified lesson JSON with MAXIMUM content density. This should feel like a premium language course, not just a few questions.

### CRITICAL RULES:
1. **SEGMENT STRUCTURE**: Create 5-7 segments covering the full video timeline evenly
2. **ACTIVITY DENSITY**: Each segment MUST have 5-8 activities (minimum 35 total activities)
3. **TRANSLATIONS**: Include ${l1Name} translations for ALL vocabulary terms, flashcard backs, and key phrases
4. **CAT FEEDBACK**: Every activity MUST have catFeedback with both "correct" and "incorrect" messages (fun, encouraging, cat-themed personality, NO emojis in the text)

### LESSON CONTENT REQUIREMENTS:
Each activity MUST include a detailed "lessonContent" object with:
- warmUp: Engaging context question about what was seen/heard in the video
- form: Grammar/structure explanation with examples
- meaning: Clear definition with ${l1Name} translation
- use: When/how to use this language in real life
- personalizedExamples: 3+ examples tailored to learner's interests (${interests || 'general topics'})
- lifeApplication: Specific scenario where learner could use this in their life

### ACTIVITY TYPES TO USE (use ALL of these):
1. **flashcard** - 5+ cards per activity, each with: front, back, example, pronunciation, translation (in ${l1Name})
2. **multipleChoice** - 4 options, clear distractors based on common ${l1Name} speaker errors
3. **trueFalse** - Based on video comprehension or language facts
4. **fillBlanks** - Sentences with 2-3 blanks, context from video
5. **dragDrop** - Sequence events, match items to categories
6. **matching** - 5+ pairs of terms/definitions
7. **speaking** - Sentences learner must pronounce, include phonetic hints
8. **ordering** - Put sentences/events in correct sequence (5+ items)
9. **wordScramble** - Anagram puzzles from key vocabulary
10. **hotspot** - Questions that appear at specific video moments (x,y percentages)
11. **videoPause** - Open-ended reflection questions, teacher annotation prompts
12. **reflection** - Personal connection questions saved to learner journal
13. **readingChallenge** - Include:
    - "whatIf" scenarios: Alternative story paths with 3-4 options and consequences
    - "reading" object with genre (fiction/factual), text passage, translation, and 3+ comprehension questions
14. **listeningComprehension** - Include:
    - "listening" object with genre (podcast/dialogue/talk/interview/story)
    - audioText (what TTS will read)
    - translation in ${l1Name}
    - showTranscript: true/false
    - 3+ comprehension questions with timestamps

### COLOR CODING (use appropriately):
- gold: Vocabulary & flashcards
- teal: Comprehension questions
- purple: Speaking & pronunciation
- orange: Fill-in-blanks & writing
- green: Matching & drag-drop
- pink: Reflection & personal connection
- blue: Discussion & listening

### POINTS SYSTEM:
- Easy activities: 30-40 points
- Medium activities: 50-70 points
- Hard activities: 80-100 points
- Speaking/Recording: 90-120 points

### CAT FEEDBACK EXAMPLES (be creative, cat personality):
- Correct: "Purrfect answer! You're sharper than my claws after a good scratching post session!"
- Incorrect: "Meow... that's not quite right. Even cats make mistakes when chasing laser pointers. Try again!"

## TRANSCRIPT TO ANALYZE
\`\`\`
${transcript || '[PASTE YOUR VIDEO TRANSCRIPT/SUBTITLES HERE]'}
\`\`\`

## REQUIRED JSON SCHEMA
\`\`\`typescript
interface Lesson {
  metadata: {
    title: string;
    targetLanguage: string;
    cefrLevel: string;
    estimatedDurationSeconds: number;
    videoUrl?: string;
    learnerL1: string; // "${nativeLang}"
  };
  segments: {
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    activities: {
      id: string;
      type: "flashcard"|"multipleChoice"|"trueFalse"|"fillBlanks"|"dragDrop"|"matching"|"speaking"|"wordScramble"|"ordering"|"hotspot"|"videoPause"|"reflection"|"readingChallenge"|"listeningComprehension";
      timestamp: number;
      title: string;
      lessonContent: {
        warmUp: string;
        form?: string;
        meaning: string;
        use?: string;
        personalizedExamples?: string[];
        lifeApplication?: string;
      };
      content: {
        // For flashcard:
        cards?: { front: string; back: string; example: string; pronunciation: string; translation: string }[];
        // For multipleChoice/trueFalse:
        question?: string;
        options?: { id: string; text: string; isCorrect: boolean }[];
        answer?: boolean;
        translation?: string;
        // For fillBlanks:
        sentence?: string;
        blanks?: string[];
        // For matching:
        pairs?: { left: string; right: string }[];
        // For speaking:
        expectedSentence?: string;
        // For ordering:
        orderedItems?: string[];
        // For wordScramble:
        scrambledWord?: string;
        correctWord?: string;
        // For dragDrop:
        items?: string[];
        targets?: string[];
        // For hotspot:
        hotspot?: { x: number; y: number; question: string; options?: { id: string; text: string; isCorrect: boolean }[]; hint?: string };
        // For videoPause:
        videoPausePrompt?: string;
        // For reflection:
        reflectionPrompt?: string;
        // For readingChallenge:
        reading?: {
          title: string;
          genre: "fiction"|"factual"|"whatIf";
          text: string;
          translation?: string;
          questions: { question: string; options: { id: string; text: string; isCorrect: boolean }[]; explanation?: string }[];
        };
        whatIfScenario?: {
          scenario: string;
          options: { choice: string; consequence: string; followUp?: string }[];
        };
        // For listeningComprehension:
        listening?: {
          title: string;
          genre: "podcast"|"dialogue"|"talk"|"interview"|"story";
          audioText: string;
          translation?: string;
          showTranscript: boolean;
          questions: { question: string; options: { id: string; text: string; isCorrect: boolean }[]; timestamp?: number }[];
        };
      };
      correctFeedback: string;
      incorrectFeedback: string;
      catFeedback: { correct: string; incorrect: string }; // NO EMOJIS in these strings
      points: number;
      requiredForNext: boolean;
      difficulty: "easy"|"medium"|"hard";
      emoji: string;
      color: "gold"|"teal"|"purple"|"orange"|"green"|"pink"|"blue";
    }[];
  }[];
  globalSettings: {
    pointsToLevelUp: number;
    enableStreak: boolean;
    suspenseSounds: boolean;
  };
  badges: {
    id: string;
    name: string;
    emoji: string;
    rarity: "common"|"rare"|"epic"|"legendary";
    condition: string;
    description: string;
  }[];
  learnerProfile?: {
    name: string;
    level: string;
    nativeLanguage: string;
    goals: string;
    interests: string;
    facts: string;
  };
}
\`\`\`

## IMPORTANT REMINDERS:
1. Create AT LEAST 35 activities total across all segments
2. Include ${l1Name} translations wherever vocabulary appears
3. Every activity MUST have catFeedback (no emojis in cat speech)
4. Use ALL activity types at least once
5. Make content engaging, personalized, and educational
6. Include at least 2 readingChallenge and 2 listeningComprehension activities
7. Flashcard activities should have 5 cards minimum

## RESPOND WITH ONLY THE JSON. No explanation, no markdown code fences. Just valid JSON.`;

    setGeneratedPrompt(prompt);
    setTab('generate');
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.segments || !Array.isArray(parsed.segments)) {
        setJsonError('Invalid lesson JSON: missing "segments" array');
        return;
      }
      setLesson(parsed);
      if (parsed.metadata?.learnerL1) {
        setLearnerL1(parsed.metadata.learnerL1);
      }
      if (parsed.metadata?.videoUrl) {
        const url = parsed.metadata.videoUrl;
        setMediaUrl(url);
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          setMediaType('youtube');
        } else {
          setMediaType('video');
        }
      }
      setJsonError('');
      setShowMasterPrompt(false);
    } catch (e) {
      setJsonError('Invalid JSON: ' + (e instanceof Error ? e.message : 'parse error'));
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {showMasterPrompt && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-950 border border-yellow-500/30 rounded-3xl p-6 w-full max-w-3xl shadow-2xl my-8"
            initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #ffd700, #ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                📝 New Lesson
              </h2>
              <button onClick={() => setShowMasterPrompt(false)} className="text-gray-400 hover:text-white text-xl w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTab('generate')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'generate' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                📝 Generate Prompt
              </button>
              <button
                onClick={() => setTab('import')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'import' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                📥 Import JSON
              </button>
            </div>

            {tab === 'generate' && (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-yellow-400 text-xs font-bold mb-1 block">Learner Name</label>
                    <input value={learnerName} onChange={e => setLearnerName(e.target.value)} placeholder="Alex" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500" />
                  </div>
                  <div>
                    <label className="text-yellow-400 text-xs font-bold mb-1 block">CEFR Level</label>
                    <select value={learnerLevel} onChange={e => setLearnerLevel(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none">
                      {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-yellow-400 text-xs font-bold mb-1 block">Native Language (L1)</label>
                    <input type="text" value={nativeLang} onChange={e => setNativeLang(e.target.value)} placeholder="e.g. Spanish, Persian" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500" />
                  </div>
                  <div>
                    <label className="text-yellow-400 text-xs font-bold mb-1 block">Video Duration (seconds)</label>
                    <input type="number" value={videoDuration} onChange={e => setVideoDuration(e.target.value)} placeholder="600" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500" />
                  </div>
                </div>
                <div>
                  <label className="text-yellow-400 text-xs font-bold mb-1 block">Learning Goals</label>
                  <input value={goals} onChange={e => setGoals(e.target.value)} placeholder="Improve speaking fluency, expand vocabulary..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500" />
                </div>
                <div>
                  <label className="text-yellow-400 text-xs font-bold mb-1 block">Interests & Hobbies</label>
                  <input value={interests} onChange={e => setInterests(e.target.value)} placeholder="Nature, animals, travel, technology..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500" />
                </div>
                <div>
                  <label className="text-yellow-400 text-xs font-bold mb-1 block">Transcript / Subtitles</label>
                  <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste the subtitle/transcript text here..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 h-32 text-sm outline-none resize-none focus:border-yellow-500" />
                </div>
                <button onClick={generatePrompt} className="w-full py-3 rounded-xl font-black text-black text-lg" style={{ background: 'linear-gradient(135deg, #ffd700, #ff6b35)' }}>
                  ⚡ Generate Prompt
                </button>
                {generatedPrompt && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 text-sm font-bold">Generated Prompt (copy → paste into ChatGPT/Claude)</span>
                      <button onClick={copyPrompt} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:text-white'}`}>
                        {copied ? '✅ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <textarea value={generatedPrompt} readOnly className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 h-48 text-xs outline-none font-mono" />
                    <p className="text-gray-500 text-xs">
                      1. Copy this prompt → 2. Paste into ChatGPT/Claude → 3. Copy the JSON response → 4. Go to "Import JSON" tab
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'import' && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">Paste the JSON response from ChatGPT/Claude below:</p>
                <textarea
                  value={jsonInput}
                  onChange={e => { setJsonInput(e.target.value); setJsonError(''); }}
                  placeholder='{"metadata": {...}, "segments": [...], ...}'
                  className="w-full bg-gray-800 border border-gray-700 text-green-300 rounded-xl px-3 py-2 h-64 text-xs outline-none resize-none font-mono focus:border-green-500"
                />
                {jsonError && <p className="text-red-400 text-sm font-bold">❌ {jsonError}</p>}
                <button onClick={handleImport} className="w-full py-3 rounded-xl font-black text-black text-lg bg-green-500 hover:bg-green-400 transition-colors">
                  📥 Import Lesson
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
