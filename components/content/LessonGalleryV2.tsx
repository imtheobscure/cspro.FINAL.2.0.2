import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { UserTier } from '../../utils/tiers';

/* ─────────────────────────────────────────────────────────────────────────
   Lesson Gallery V2 — premium, data-driven gallery.
   Every tile = a real lesson format the tutor can open & test with mock data
   (same window) or preload in the Lesson Creator. Tiles carry a target
   audience, feature chips and concise metadata; the grid is filterable and a
   wizard asks questions then recommends the best formats.
   ───────────────────────────────────────────────────────────────────────── */

export interface GalleryItem {
  id: string;          // ManualCreator content-type id (used to preset the creator)
  name: string;        // display name
  emoji: string;
  tagline: string;     // one-line pitch
  audience: string;    // target audience
  features: string[];  // concise feature chips
  level: string;       // suggested CEFR band
  mins: number;        // typical length
  rarity: 'Free' | 'Premium' | 'VIP';
  format: 'Interactive' | 'Game' | 'Audio' | 'Video' | 'Study' | 'Assessment';
  sampleUrl?: string;  // standalone HTML in /learners (mock data)
  sampleLabel?: string; // "Adele — Rolling in the Deep" style
  phases?: string;     // e.g. "10 steps · 3 games"
}

/* Tier required to OPEN an item (preview or creator) — Free stays free,
   Premium needs PRO, VIP needs VIP. Browsing the gallery itself is free. */
export const RARITY_TIER: Record<GalleryItem['rarity'], UserTier> = {
  Free: 'free',
  Premium: 'pro',
  VIP: 'vip',
};

export function canOpenRarity(rarity: GalleryItem['rarity'], tier: UserTier): boolean {
  const required = RARITY_TIER[rarity];
  if (required === 'free') return true;
  if (required === 'pro') return tier === 'pro' || tier === 'vip';
  return tier === 'vip';
}

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'liveLessonInteractive',
    name: 'Live Lesson',
    emoji: '⚡',
    tagline: 'A dynamic, gamified guided lesson with a live narrator cat, timer, ambient sound and 14 activity types.',
    audience: 'Adult 1:1 tutoring · dynamic multi-activity sessions',
    features: ['14 activity types', 'Timer & ambient sounds', 'Backgrounds + themes', 'Narrating cat (TTS)', 'Tiers, badges, XP', 'Print / PDF worksheet'],
    level: 'B1–B2',
    mins: 45,
    rarity: 'VIP',
    format: 'Interactive',
    sampleUrl: '/learners/Live_Lesson_Present_Perfect_Tense_in_Action.html',
    sampleLabel: 'Present Perfect Tense in Action',
    phases: '14 steps · study/speak/review',
  },
  {
    id: 'videoLessonInteractive',
    name: 'Video Lesson',
    emoji: '🎬',
    tagline: 'A video-synced lesson: watch any video with synced subtitles, then answer time-stamped activities (flashcards, voice-over, prediction, would-you-rather, reading & listening challenges…) as the video plays.',
    audience: 'Adult 1:1 tutoring · movie / TV / documentary / YouTube-based sessions',
    features: ['Video-synced segments', 'Synced subtitles & transcript', '19 activity types', 'Karaoke / voice-over', 'Watch party + live polls', 'Learning-with-Streaming search', 'Whiteboard notes', 'Print / PDF worksheet'],
    level: 'A2–C1',
    mins: 50,
    rarity: 'VIP',
    format: 'Video',
    sampleUrl: '/learners/big_buck_bunny_emotions_nature_vocabulary.html',
    sampleLabel: 'Big Buck Bunny · Emotions & Nature Vocabulary',
    phases: '6 segments · 14 activities',
  },
  {
    id: 'dailyLessonInteractive',
    name: 'Daily Lesson',
    emoji: '🐱',
    tagline: 'A 10-step animated daily lesson with a moody cat mascot: warm-up, flashcards, listening, karaoke, grammar, radio drama, dictation, quiz & 3 bonus games.',
    audience: 'Adult learners · full 60-min daily routine',
    features: ['10-step flow', '3D flashcards', 'Karaoke reading', 'Radio drama w/ voices', 'Dictation scoring', '3 bonus games', 'Leaderboard', 'Secret code'],
    level: 'A2–B2',
    mins: 60,
    rarity: 'VIP',
    format: 'Interactive',
    sampleUrl: '/learners/Daily_Lesson_The_Digital_Age_Navigating_Modern_Technology.html',
    sampleLabel: 'The Digital Age · Navigating Modern Technology',
    phases: '10 steps · 3 games',
  },
  {
    id: 'gamifiedChallenge',
    name: 'Gamified Challenge',
    emoji: '🏆',
    tagline: 'A 7-day thematic survival challenge: fear meter, mystery boxes, clues, badges and a final quiz showdown.',
    audience: 'Motivation-driven teens & adults · homework-as-game',
    features: ['7-day campaign', 'Fear meter', 'Mystery boxes', 'Clue hunts', 'Badges & XP', 'Final boss quiz'],
    level: 'B1–C1',
    mins: 30,
    rarity: 'VIP',
    format: 'Game',
    sampleUrl: '/learners/Gamified_Challenge_Welcome_to_the_Game.html',
    sampleLabel: 'Welcome to the Game',
    phases: '7 days · 1 boss quiz',
  },
  {
    id: 'musicLesson',
    name: 'Music Lesson',
    emoji: '🎵',
    tagline: 'Learn language through a real song: synced subtitles, vocabulary highlights, 12 mini-lesson activity types, karaoke arena & a live song search with previews.',
    audience: 'Music-loving learners · song-based fluency',
    features: ['Real-song subtitles', 'Clickable vocabulary', '12 activity types', 'Karaoke arena', '🎤 voice picker', '🔎 live song search', 'Dictation & gap-fill'],
    level: 'A2–B2',
    mins: 40,
    rarity: 'VIP',
    format: 'Interactive',
    sampleUrl: '/learners/Music_Lesson_Rolling_in_the_Deep.html',
    sampleLabel: 'Adele — Rolling in the Deep',
    phases: '10 mini-lessons · karaoke',
  },
  {
    id: 'flipbookHomework',
    name: 'Flipbook Homework',
    emoji: '📖',
    tagline: 'A magazine-style flipbook homework: realistic two-page page-flip, read-aloud narration, dictation (mic), crossword, taboo & listening script pages.',
    audience: 'Homework that feels like reading a magazine',
    features: ['Realistic page-flip', 'Read-aloud narration', '🎙 dictation + voices', 'Crossword & taboo', 'Vocabulary games', 'XP + completion'],
    level: 'B1–C1',
    mins: 25,
    rarity: 'VIP',
    format: 'Interactive',
    sampleUrl: '/learners/Flipbook_Homework_The_World_of_Innovation.html',
    sampleLabel: 'The World of Innovation',
    phases: 'Full magazine · activity pages',
  },
  {
    id: 'learningAppV2',
    name: 'Learning App V2',
    emoji: '🎮',
    tagline: 'A slick mobile-app style lesson with many quick-fire minigames, combo streaks and score arcade — great warm-up or review.',
    audience: 'Gamified learners · quick interactive drills',
    features: ['Mobile-app UX', 'Quick-fire games', 'Combo streaks', 'Arcade scoring', 'Category levels'],
    level: 'A1–B1',
    mins: 20,
    rarity: 'VIP',
    format: 'Game',
    sampleUrl: '/learners/Learning_App_V2_Around_Town.html',
    sampleLabel: 'Around Town',
    phases: 'Minigame arcade',
  },
  {
    id: 'interactiveLesson',
    name: 'Interactive Lesson',
    emoji: '🎓',
    tagline: 'A classic rich-media interactive lesson (H5P-style activities) on any topic with multi-activity coverage and media.',
    audience: 'General tutoring · all-round topic lessons',
    features: ['H5P-style blocks', 'Multi-activity', 'Media-rich', 'Save & share'],
    level: 'A1–C1',
    mins: 45,
    rarity: 'Premium',
    format: 'Interactive',
    sampleUrl: '/learners/Interactive_Lesson_Daily_Routines.html',
    sampleLabel: 'Daily Routines',
    phases: 'Multi-activity lesson',
  },
  // ── Core Learning ──────────────────────────────────────────────
  {
    id: 'englishLesson',
    name: 'Micro Lesson',
    emoji: '📖',
    tagline: 'The classic guided lesson: study, practice, speak and review phases with flashcards, gap-fills, roleplays, MCQs and a report card — 61 activity types in the full mock.',
    audience: 'Everyday 1:1 English tutoring · foundational format',
    features: ['61 activity types', 'Study → Practice → Speak', 'Flashcards & gap-fills', 'Roleplays & MCQs', 'Cat mascot', 'Report card'],
    level: 'A1–C1',
    mins: 40,
    rarity: 'Free',
    format: 'Interactive',
    sampleUrl: '/learners/Micro_Lesson_V1_All_Activities.html',
    sampleLabel: 'All 61 activity types (full coverage)',
    phases: '4 phases · 61 activity types',
  },
  {
    id: 'englishLessonV2',
    name: 'Micro Lesson V2',
    emoji: '🚀',
    tagline: 'The upgraded Micro Lesson with spiral repetition, gamification, a study mascot, voiceover study mode and deadlines — everything the tutor needs for a complete lesson package.',
    audience: '1:1 tutoring wanting a full lesson + homework package',
    features: ['Spiral repetition', 'Gamified XP & streak', 'Study mascot', 'Voiceover mode', 'Homework-ready', 'Tutor passcode'],
    level: 'A1–C1',
    mins: 50,
    rarity: 'Premium',
    format: 'Interactive',
    sampleUrl: '/learners/Gallery_englishLessonV2_Sample.html',
    sampleLabel: 'Digital Communication (phase mock)',
    phases: '4 phases · full coverage',
  },
  {
    id: 'avatarLesson',
    name: 'Avatar Lesson',
    emoji: '🤖',
    tagline: 'An AI avatar-led guided discovery lesson: characters with voices and affinities, branching conversations and dynamic scenarios.',
    audience: 'Learners who respond to character-driven conversation',
    features: ['AI avatar characters', 'Voice presets', 'Affinity system', 'Branching dialogue', 'Guided discovery'],
    level: 'B2–C1',
    mins: 45,
    rarity: 'VIP',
    format: 'Interactive',
    sampleUrl: '/learners/Gallery_avatarLesson_Sample.html',
    sampleLabel: 'Executive Negotiations & Diplomacy',
    phases: '3 acts · branching dialogue',
  },
  {
    id: 'avatarLessonV2',
    name: 'Avatar Lesson V2',
    emoji: '🤖',
    tagline: 'The next-gen avatar lesson: richer character casts, multi-scene storylines and smoother voice-led interaction.',
    audience: 'Advanced learners who love immersive stories',
    features: ['Richer character cast', 'Multi-scene story', 'Voice-led', 'Immersive UI'],
    level: 'B2–C1',
    mins: 50,
    rarity: 'VIP',
    format: 'Interactive',
    sampleUrl: '/learners/Gallery_avatarLessonV2_Sample.html',
    sampleLabel: 'Avatar V2 storyline mock',
    phases: 'Storyline · multi-scene',
  },
  {
    id: 'classmate',
    name: 'Classmate',
    emoji: '🤝',
    tagline: 'A fun practice partner scenario: chat and roleplay with a virtual classmate using voice bubbles and a friendship meter.',
    audience: 'Lower-level & shy learners building confidence',
    features: ['Virtual classmate', 'Roleplay chat', 'Voice bubbles', 'Friendship meter'],
    level: 'A1–B1',
    mins: 20,
    rarity: 'VIP',
    format: 'Interactive',
    sampleUrl: '/learners/Gallery_classmate_Sample.html',
    sampleLabel: 'Maya Lin · day-to-day chat',
    phases: 'Chat · roleplay',
  },
  {
    id: 'bilingualStudyLesson',
    sampleUrl: '/learners/Gallery_bilingualStudyLesson_Sample.html',
    sampleLabel: 'Bilingual study mock',
    name: 'Bilingual Lesson',
    emoji: '🌐',
    tagline: 'Chunk-based study guide with L1 translation support — perfect for absolute beginners learning through their native language.',
    audience: 'Absolute beginners · translation-supported study',
    features: ['L1 translation', 'Chunk-based', 'Beginner-friendly', 'Vocabulary-first'],
    level: 'A0–A2',
    mins: 25,
    rarity: 'Premium',
    format: 'Study',
    phases: 'Chunked study',
  },
  {
    id: 'explainerLesson',
    sampleUrl: '/learners/Gallery_explainerLesson_Sample.html',
    sampleLabel: 'Explainer lesson mock',
    name: 'Explainer Lesson',
    emoji: '💡',
    tagline: 'A strict-sequence explainer with full content retention: concept → examples → checks. Free to create.',
    audience: 'New concepts · first exposure lessons',
    features: ['Strict sequence', 'Concept-first', 'Retention checks', '100% free'],
    level: 'A1–B2',
    mins: 30,
    rarity: 'Free',
    format: 'Interactive',
    phases: 'Explain → practice',
  },
  {
    id: 'conversationalLesson',
    sampleUrl: '/learners/Gallery_conversationalLesson_Sample.html',
    sampleLabel: 'Conversational mock',
    name: 'Conversational Lesson',
    emoji: '🗣️',
    tagline: 'A speaking-focused lesson with guided conversation practice, model answers and fluency building.',
    audience: 'Speaking-focused sessions · fluency practice',
    features: ['Speaking-first', 'Guided dialogue', 'Model answers', 'Fluency drills'],
    level: 'A2–C1',
    mins: 35,
    rarity: 'Premium',
    format: 'Interactive',
    phases: 'Talk · drill · polish',
  },
  // ── Assignments ────────────────────────────────────────────────
  {
    id: 'homework',
    name: 'Homework',
    emoji: '🏠',
    tagline: 'A structured homework package: reading, vocabulary, grammar and writing practice the learner completes offline.',
    audience: 'Post-lesson practice between sessions',
    features: ['Reading tasks', 'Vocabulary drills', 'Grammar practice', 'Writing prompts', 'Offline-friendly'],
    level: 'A1–B2',
    mins: 30,
    rarity: 'Free',
    format: 'Study',
    sampleUrl: '/learners/Gallery_homework_Sample.html',
    sampleLabel: 'Homework package mock',
    phases: 'Reading · vocab · grammar · writing',
  },
  {
    id: 'quiz',
    sampleUrl: '/learners/Gallery_quiz_Sample.html',
    sampleLabel: 'Quiz assessment mock',
    name: 'Quiz',
    emoji: '❓',
    tagline: 'A secure timed exam-style assessment with a proctored feel, question blocks and instant scoring.',
    audience: 'Formative & summative checks',
    features: ['Timed exam', 'Question blocks', 'Auto scoring', 'Secure mode'],
    level: 'A1–C1',
    mins: 20,
    rarity: 'Free',
    format: 'Assessment',
    phases: 'Timed exam',
  },
  {
    id: 'studyGuide',
    sampleUrl: '/learners/Gallery_studyGuide_Sample.html',
    sampleLabel: 'Study guide mock',
    name: 'Study Guide',
    emoji: '📚',
    tagline: 'An interactive study guide with podcast-style hosts, key points and revision activities.',
    audience: 'Exam revision · self-study',
    features: ['Podcast hosts', 'Key-point cards', 'Revision activities', 'Self-study'],
    level: 'A2–C1',
    mins: 25,
    rarity: 'Premium',
    format: 'Study',
    phases: 'Guide · revise',
  },
  {
    id: 'printableWorksheet',
    sampleUrl: '/learners/Gallery_printableWorksheet_Sample.html',
    sampleLabel: 'Printable worksheet mock',
    name: 'Official Worksheet',
    emoji: '🖨️',
    tagline: 'A clean printable PDF-style worksheet: exercises, answer key and a professional header for offline classrooms.',
    audience: 'Printable offline practice',
    features: ['Print-ready', 'Answer key', 'Professional layout'],
    level: 'A1–B2',
    mins: 15,
    rarity: 'Premium',
    format: 'Study',
    phases: 'Print & do',
  },
  {
    id: 'examPrepLesson',
    sampleUrl: '/learners/Gallery_examPrepLesson_Sample.html',
    sampleLabel: 'Exam prep lesson mock',
    name: 'Exam Prep Lesson',
    emoji: '📝',
    tagline: 'IELTS-style exam preparation: reading strategy, writing tasks with model answers, speaking cue cards and a mini mock.',
    audience: 'IELTS / exam candidates',
    features: ['Reading strategy', 'Writing model answers', 'Speaking cue cards', 'Mini mock', 'Vocabulary bank'],
    level: 'B1–C1',
    mins: 60,
    rarity: 'Free',
    format: 'Assessment',
    phases: '5 sections · full exam',
  },
  {
    id: 'mockTest',
    name: 'Mock Test',
    emoji: '📝',
    tagline: 'A high-fidelity mock examination with timed sections, proctoring notes and full exam structure.',
    audience: 'Full mock exams · progress benchmarking',
    features: ['Timed sections', 'Exam structure', 'Proctoring notes', 'Scored results'],
    level: 'B1–C1',
    mins: 90,
    rarity: 'Free',
    format: 'Assessment',
    sampleUrl: '/learners/Gallery_mockTest_Sample.html',
    sampleLabel: 'B2 Mock Examination (water systems)',
    phases: 'Full mock exam',
  },
  {
    id: 'mockTestV2',
    name: 'Mock Test V2',
    emoji: '📝',
    tagline: 'The next-gen mock exam generator with richer task types and modern exam UX.',
    audience: 'Full mock exams · modern exam formats',
    features: ['Modern exam UX', 'Richer task types', 'Timed sections', 'Detailed results'],
    level: 'B1–C1',
    mins: 90,
    rarity: 'Free',
    format: 'Assessment',
    sampleUrl: '/learners/Gallery_mockTestV2_Sample.html',
    sampleLabel: 'Mock Test V2 sample',
    phases: 'Full mock exam',
  },
  // ── Interactive & Games (rest) ─────────────────────────────────
  {
    id: 'learningApp',
    name: 'Review App',
    emoji: '🔁',
    tagline: 'A transcript-based review game: replay the lesson transcript and answer timed review questions — a fast end-of-lesson recap.',
    audience: 'End-of-lesson review & recall',
    features: ['Transcript replay', 'Timed review Qs', 'Score tracking', 'Fast recap'],
    level: 'A1–B2',
    mins: 15,
    rarity: 'VIP',
    format: 'Game',
    sampleUrl: '/learners/Review_App_Test.html',
    sampleLabel: 'Review App test mock',
    phases: 'Replay · review · score',
  },
  {
    id: 'conversationGame',
    sampleUrl: '/learners/Gallery_conversationGame_Sample.html',
    sampleLabel: 'Conversation game mock',
    name: 'Conversation Game',
    emoji: '💬',
    tagline: 'A branching audio roleplay game: pick dialogue paths, hear characters speak and earn points for good choices.',
    audience: 'Speaking practice through play',
    features: ['Branching paths', 'Audio roleplay', 'Choice scoring'],
    level: 'A2–B2',
    mins: 20,
    rarity: 'Premium',
    format: 'Game',
    phases: 'Choose · speak · score',
  },
  {
    id: 'conversationMaker',
    name: 'Conversation Maker',
    emoji: '💬',
    tagline: 'A scripted multi-character conversation builder with per-character voices, translations and roleplay flows.',
    audience: 'Dialogue drills · character-based speaking',
    features: ['Multi-character', 'Per-character voices', 'Translations', 'Roleplay flows'],
    level: 'A1–B2',
    mins: 25,
    rarity: 'Premium',
    format: 'Interactive',
    sampleUrl: '/learners/Gallery_conversationMaker_Sample.html',
    sampleLabel: 'Morning chat roleplay',
    phases: 'Script · voices · roleplay',
  },
  {
    id: 'partyMode',
    name: 'Party Mode Arena',
    emoji: '🎉',
    tagline: 'A party-style arena of quick-fire activities: matching, quizzes and celebration effects for group fun.',
    audience: 'Group classes & fun warm-ups',
    features: ['Quick-fire rounds', 'Matching & quizzes', 'Celebration effects', 'Group-friendly'],
    level: 'A1–B1',
    mins: 20,
    rarity: 'VIP',
    format: 'Game',
    sampleUrl: '/learners/Gallery_partyMode_Sample.html',
    sampleLabel: 'Party Mode Arena mock',
    phases: 'Rounds · rapid play',
  },
  {
    id: 'placeGame',
    name: 'Guess the Place',
    emoji: '🌍',
    tagline: 'A clue-based world guessing game: read the clues, guess famous places and reveal them on a map.',
    audience: 'Culture & geography lessons',
    features: ['Clue-based', 'Map reveals', '5 places per round'],
    level: 'A1–B2',
    mins: 10,
    rarity: 'Premium',
    format: 'Game',
    sampleUrl: '/learners/Gallery_placeGame_Sample.html',
    sampleLabel: 'Guess the Place mock',
    phases: '5 reveal places',
  },
  {
    id: 'weeklyChallenge',
    sampleUrl: '/learners/Gallery_weeklyChallenge_Sample.html',
    sampleLabel: 'Weekly challenge mock',
    name: 'Weekly Challenge',
    emoji: '🏆',
    tagline: 'A gamified weekly mission set: daily tasks, streaks and a reward chart to keep learners motivated all week.',
    audience: 'Weekly motivation & habit building',
    features: ['Daily tasks', 'Streaks', 'Reward chart'],
    level: 'A1–B2',
    mins: 15,
    rarity: 'Premium',
    format: 'Game',
    phases: '7-day challenge',
  },
  {
    id: 'simulations',
    name: 'Audio Lab',
    emoji: '🎧',
    tagline: 'A scenario-based audio lab: record and replay dialogue simulations with characters, roles and MP3 downloads.',
    audience: 'Listening & speaking simulation drills',
    features: ['Scenario audio', 'Role dialogues', 'Record & replay', 'MP3 export'],
    level: 'A2–C1',
    mins: 25,
    rarity: 'VIP',
    format: 'Audio',
    sampleUrl: '/learners/Gallery_simulations_Sample.html',
    sampleLabel: 'Tech Standup simulation',
    phases: 'Scenarios · voices',
  },
  {
    id: 'liveLesson',
    sampleUrl: '/learners/Gallery_liveLesson_Sample.html',
    sampleLabel: 'H5P studio lesson mock',
    name: 'H5P',
    emoji: '👨‍💻',
    tagline: 'The classic H5P-style lesson studio with interactive activity blocks you assemble manually.',
    audience: 'Tutors who hand-build activity stacks',
    features: ['Activity blocks', 'Manual assembly', 'H5P-style'],
    level: 'A1–C1',
    mins: 30,
    rarity: 'VIP',
    format: 'Interactive',
    phases: 'Build · assemble',
  },
  // ── Teacher Tools ───────────────────────────────────────────────
  {
    id: 'lessonPlan',
    sampleUrl: '/learners/Gallery_lessonPlan_Sample.html',
    sampleLabel: 'Lesson plan mock',
    name: 'Lesson Plan',
    emoji: '📋',
    tagline: 'A structured lesson plan document: objectives, timing, activities and wrap-up — export as HTML.',
    audience: 'Teacher planning & documentation',
    features: ['Objectives', 'Timings', 'Activity flow', 'HTML export'],
    level: '—',
    mins: 5,
    rarity: 'Free',
    format: 'Study',
    phases: 'Plan document',
  },
  {
    id: 'forTeachers',
    sampleUrl: '/learners/Gallery_forTeachers_Sample.html',
    sampleLabel: 'Teacher guide mock',
    name: 'Teacher Guide',
    emoji: '👩‍🏫',
    tagline: 'A teacher-facing guide with instructions, differentiation notes and classroom tips for the lesson.',
    audience: 'Teacher support materials',
    features: ['Instructions', 'Differentiation', 'Classroom tips'],
    level: '—',
    mins: 5,
    rarity: 'Free',
    format: 'Study',
    phases: 'Guide document',
  },
  {
    id: 'lessonGuide',
    sampleUrl: '/learners/Gallery_lessonGuide_Sample.html',
    sampleLabel: 'Lesson guide mock',
    name: 'Lesson Guide',
    emoji: '📖',
    tagline: 'A concise lesson guide: learning objectives, teacher instructions and differentiation notes.',
    audience: 'Teacher quick-reference',
    features: ['Objectives', 'Teacher instructions', 'Differentiation'],
    level: '—',
    mins: 5,
    rarity: 'Free',
    format: 'Study',
    phases: 'Guide document',
  },
  {
    id: 'slides',
    sampleUrl: '/learners/Gallery_slides_Sample.html',
    sampleLabel: 'Slide deck mock',
    name: 'Slide Presentation',
    emoji: '📽️',
    tagline: 'A polished slide deck presentation with speaker notes — great for presenting lessons in class.',
    audience: 'In-class presentation',
    features: ['Slide deck', 'Speaker notes', 'Presentable design'],
    level: 'A1–C1',
    mins: 20,
    rarity: 'VIP',
    format: 'Study',
    phases: 'Deck presentation',
  },
  // ── Daily & Media ───────────────────────────────────────────────
  {
    id: 'dailyLesson',
    sampleUrl: '/learners/Gallery_dailyLesson_Sample.html',
    sampleLabel: 'Daily lesson mock',
    name: 'Daily Lesson (classic)',
    emoji: '📅',
    tagline: 'The classic daily lesson format: a day-stamped lesson with sections for study and practice.',
    audience: 'Daily routine lessons',
    features: ['Day-stamped', 'Study sections', 'Practice flow'],
    level: 'A1–B2',
    mins: 30,
    rarity: 'Premium',
    format: 'Interactive',
    phases: 'Day lesson',
  },
  {
    id: 'testLab',
    sampleUrl: '/learners/Gallery_testLab_Sample.html',
    sampleLabel: 'Full lab · 14 activity types',
    name: 'Test Lab Activity',
    emoji: '🧪',
    tagline: 'The real Test Lab game: hot seat, taboo, listening, matching, scramble, cloze, conversation, truth or dare and more — 14 activity types in one lab-style arena.',
    audience: 'Assessment-heavy sessions & speaking/listening drills',
    features: ['Lab arena game', '14 activity types', 'Hot seat & taboo', 'Cloze & scramble', 'Listening & dictation', 'Conversation lab'],
    level: 'A1–B2',
    mins: 20,
    rarity: 'Free',
    format: 'Assessment',
    phases: '24-tile lab · 14 types',
  },
  {
    id: 'audioLesson',
    sampleUrl: '/learners/Gallery_audioLesson_Sample.html',
    sampleLabel: 'Audio lesson mock',
    name: 'Audio Lesson',
    emoji: '🎧',
    tagline: 'An audio immersion lesson: audio scenarios with replay, dictation and listening comprehension.',
    audience: 'Listening-focused sessions',
    features: ['Audio scenarios', 'Dictation', 'Listening comprehension'],
    level: 'A2–C1',
    mins: 15,
    rarity: 'VIP',
    format: 'Audio',
    phases: 'Listen · dictate',
  },
];

/* Short "why this lesson" notes shown on wizard recommendations */
const WHY_NOTES: Record<string, string> = {
  liveLessonInteractive: 'You picked a structured, teacher-narrated session — this one walks through 12 guided steps with a live coach.',
  dailyLessonInteractive: 'Matches your full-session, teacher-figure preference — a day-stamped lesson with mascot narration and 10 rich steps.',
  gamifiedChallenge: 'You chose game energy — this is a points-driven challenge with fear-meter, badges and daily missions.',
  musicLesson: 'Music & audio resonated — learn through a real song with karaoke, lyrics sync and a cat coach.',
  flipbookHomework: 'Perfect for outside-class homework — a magazine-style flipbook the learner opens on their own device.',
  learningAppV2: 'A fast, game-like review app — great for the quick-session answer you gave.',
  interactiveLesson: 'A solid all-round interactive lesson for a standard 30–45 minute slot.',
  avatarLesson: 'You like a teacher-figure narrator — this one is led by an AI avatar guide.',
  avatarLessonV2: 'AI avatar guide with advanced scenes — matches your narrator preference.',
  simulations: 'Audio-focused choice — record & replay realistic scenario dialogues.',
  audioLesson: 'Pure listening immersion — scenarios, dictation and comprehension checks.',
  partyMode: 'Small group or class answer — quick-fire arena rounds made for groups.',
  conversationGame: 'Fluency goal — branching audio roleplay with scored choices.',
  conversationalLesson: 'Fluency goal — guided speaking practice with model answers.',
  conversationMaker: 'Dialogue drills — multi-character scripted roleplay with voices.',
  quiz: 'Assessment goal — a secure timed exam with instant scoring.',
  examPrepLesson: 'Exam goal — IELTS-style sections, model answers and a mini mock.',
  mockTest: 'Assessment goal — a full timed mock exam with proctoring notes.',
  videoLessonInteractive: 'Group-friendly — stream any video with segments, activities and a watch party.',
  slides: 'Whole-class pick — a polished deck with speaker notes for presenting.',
  bilingualStudyLesson: 'Vocabulary & reading goal — chunk-based study with L1 translation support.',
  weeklyChallenge: 'Motivation pick — a 7-day streak challenge with a reward chart.',
  placeGame: 'Fun culture break — clue-based world guessing with map reveals.',
  homework: 'Outside-class pick — offline reading, vocab, grammar and writing tasks.',
};

const RARITY_STYLE: Record<string, { color: string; ring: string; label: string }> = {
  VIP: { color: '#7c3aed', ring: 'rgba(124,58,237,.35)', label: 'VIP' },
  Premium: { color: '#0d9488', ring: 'rgba(13,148,136,.35)', label: 'Premium' },
  Free: { color: '#475569', ring: 'rgba(71,85,105,.3)', label: 'Free' },
};

const GRADS: Record<string, string> = {
  liveLessonInteractive: 'linear-gradient(135deg,#7c2d12 0%,#ea580c 55%,#fde047 130%)',
  dailyLessonInteractive: 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 55%,#f0abfc 130%)',
  gamifiedChallenge: 'linear-gradient(135deg,#064e3b 0%,#059669 55%,#a7f3d0 130%)',
  musicLesson: 'linear-gradient(135deg,#713f12 0%,#d97706 55%,#fde68a 130%)',
  flipbookHomework: 'linear-gradient(135deg,#881337 0%,#e11d48 55%,#fda4af 130%)',
  learningAppV2: 'linear-gradient(135deg,#0c4a6e 0%,#0891b2 55%,#a5f3fc 130%)',
  interactiveLesson: 'linear-gradient(135deg,#14532d 0%,#16a34a 55%,#bbf7d0 130%)',
  videoLessonInteractive: 'linear-gradient(135deg,#1e1b4b 0%,#4f46e5 55%,#a5b4fc 130%)',
  englishLesson: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#93c5fd 130%)',
  englishLessonV2: 'linear-gradient(135deg,#9d174d 0%,#db2777 55%,#fbcfe8 130%)',
  avatarLesson: 'linear-gradient(135deg,#312e81 0%,#6366f1 55%,#c7d2fe 130%)',
  avatarLessonV2: 'linear-gradient(135deg,#581c87 0%,#a855f7 55%,#e9d5ff 130%)',
  classmate: 'linear-gradient(135deg,#134e4a 0%,#14b8a6 55%,#99f6e4 130%)',
  bilingualStudyLesson: 'linear-gradient(135deg,#0e7490 0%,#06b6d4 55%,#a5f3fc 130%)',
  explainerLesson: 'linear-gradient(135deg,#b45309 0%,#f59e0b 55%,#fde68a 130%)',
  conversationalLesson: 'linear-gradient(135deg,#3730a3 0%,#818cf8 55%,#c7d2fe 130%)',
  homework: 'linear-gradient(135deg,#365314 0%,#65a30d 55%,#d9f99d 130%)',
  quiz: 'linear-gradient(135deg,#7f1d1d 0%,#ef4444 55%,#fecaca 130%)',
  studyGuide: 'linear-gradient(135deg,#1e3a8a 0%,#3b82f6 55%,#bfdbfe 130%)',
  printableWorksheet: 'linear-gradient(135deg,#1f2937 0%,#4b5563 55%,#d1d5db 130%)',
  examPrepLesson: 'linear-gradient(135deg,#701a75 0%,#d946ef 55%,#f5d0fe 130%)',
  mockTest: 'linear-gradient(135deg,#991b1b 0%,#dc2626 55%,#fca5a5 130%)',
  mockTestV2: 'linear-gradient(135deg,#b91c1c 0%,#f87171 55%,#fee2e2 130%)',
  learningApp: 'linear-gradient(135deg,#164e63 0%,#0ea5e9 55%,#bae6fd 130%)',
  conversationGame: 'linear-gradient(135deg,#a16207 0%,#eab308 55%,#fef08a 130%)',
  conversationMaker: 'linear-gradient(135deg,#0f766e 0%,#2dd4bf 55%,#99f6e4 130%)',
  partyMode: 'linear-gradient(135deg,#be185d 0%,#f43f5e 55%,#fecdd3 130%)',
  placeGame: 'linear-gradient(135deg,#075985 0%,#38bdf8 55%,#bae6fd 130%)',
  weeklyChallenge: 'linear-gradient(135deg,#92400e 0%,#f59e0b 55%,#fde68a 130%)',
  simulations: 'linear-gradient(135deg,#1e40af 0%,#60a5fa 55%,#bfdbfe 130%)',
  liveLesson: 'linear-gradient(135deg,#155e75 0%,#22d3ee 55%,#a5f3fc 130%)',
  lessonPlan: 'linear-gradient(135deg,#334155 0%,#64748b 55%,#e2e8f0 130%)',
  forTeachers: 'linear-gradient(135deg,#831843 0%,#ec4899 55%,#fbcfe8 130%)',
  lessonGuide: 'linear-gradient(135deg,#44403c 0%,#78716c 55%,#e7e5e4 130%)',
  slides: 'linear-gradient(135deg,#4c1d95 0%,#8b5cf6 55%,#ddd6fe 130%)',
  dailyLesson: 'linear-gradient(135deg,#065f46 0%,#10b981 55%,#a7f3d0 130%)',
  testLab: 'linear-gradient(135deg,#57534e 0%,#a8a29e 55%,#e7e5e4 130%)',
  audioLesson: 'linear-gradient(135deg,#4d7c0f 0%,#84cc16 55%,#d9f99d 130%)',
};

const FORMAT_ICON: Record<string, string> = {
  Interactive: '🖥️',
  Game: '🎮',
  Audio: '🎧',
  Video: '📺',
  Study: '📚',
  Assessment: '📝',
};

/* Popularity rank (1 = most commonly used) — the gallery shows the most-used
   lesson formats first (Micro Lesson at the top) down to the least common. */
const POP: Record<string, number> = {
  englishLesson: 1,            // Micro Lesson — the everyday classic
  englishLessonV2: 2,          // Micro Lesson V2
  dailyLessonInteractive: 3,   // Daily Lesson
  liveLessonInteractive: 4,    // Live Lesson
  homework: 5,
  quiz: 6,
  interactiveLesson: 7,
  conversationMaker: 8,
  conversationalLesson: 9,
  examPrepLesson: 10,
  mockTest: 11,
  mockTestV2: 12,
  testLab: 13,
  studyGuide: 14,
  avatarLesson: 15,
  avatarLessonV2: 16,
  classmate: 17,
  conversationGame: 18,
  simulations: 19,
  audioLesson: 20,
  musicLesson: 21,
  videoLessonInteractive: 22,
  gamifiedChallenge: 23,
  learningApp: 24,
  learningAppV2: 25,
  flipbookHomework: 26,
  partyMode: 27,
  placeGame: 28,
  weeklyChallenge: 29,
  bilingualStudyLesson: 30,
  explainerLesson: 31,
  printableWorksheet: 32,
  slides: 33,
  dailyLesson: 34,           // Daily Lesson (classic)
  liveLesson: 35,            // H5P studio
  lessonPlan: 36,
  forTeachers: 37,
  lessonGuide: 38,
};

/* ── wizard ─────────────────────────────────────────────────────────────── */

interface WizardQ {
  q: string;
  emoji: string;
  options: { label: string; score: Record<string, number> }[];
}

const WIZARD_QUESTIONS: WizardQ[] = [
  {
    q: "What is the main purpose of this session?",
    emoji: '🎯',
    options: [
      { label: 'A full structured lesson with many activities', score: { liveLessonInteractive: 3, dailyLessonInteractive: 3, interactiveLesson: 2 } },
      { label: 'A fun review / drill to re-use earlier material', score: { learningAppV2: 3, gamifiedChallenge: 2, musicLesson: 2 } },
      { label: 'Homework the learner opens outside class', score: { flipbookHomework: 3, gamifiedChallenge: 3, dailyLessonInteractive: 2 } },
      { label: 'Work with a song / authentic audio', score: { musicLesson: 3, dailyLessonInteractive: 1 } },
    ],
  },
  {
    q: 'How much time will the learner spend?',
    emoji: '⏱️',
    options: [
      { label: 'Under 25 minutes (quick session)', score: { learningAppV2: 3, flipbookHomework: 3, gamifiedChallenge: 2 } },
      { label: '30–45 minutes (standard lesson)', score: { liveLessonInteractive: 3, musicLesson: 3, interactiveLesson: 2 } },
      { label: 'A full 60-minute session', score: { dailyLessonInteractive: 3, liveLessonInteractive: 3, musicLesson: 2 } },
    ],
  },
  {
    q: 'Which mood keeps this learner motivated?',
    emoji: '🔥',
    options: [
      { label: 'They love games, points and challenge', score: { gamifiedChallenge: 3, learningAppV2: 3, partyMode: 2, musicLesson: 2 } },
      { label: 'They like beautiful, magazine-style content', score: { flipbookHomework: 3, musicLesson: 2, dailyLessonInteractive: 2 } },
      { label: 'They respond to a teacher-figure narrator', score: { liveLessonInteractive: 3, dailyLessonInteractive: 2, avatarLesson: 2 } },
      { label: 'Music / audio is their language', score: { musicLesson: 3, simulations: 2, audioLesson: 2 } },
    ],
  },
  {
    q: "What is the main goal of this session?",
    emoji: '🎓',
    options: [
      { label: 'Exam / assessment prep', score: { quiz: 3, mockTest: 3, examPrepLesson: 3, studyGuide: 2 } },
      { label: 'Speaking & conversational fluency', score: { conversationalLesson: 3, conversationGame: 3, conversationMaker: 2, liveLessonInteractive: 2 } },
      { label: 'Vocabulary, reading & retention', score: { flipbookHomework: 3, learningAppV2: 3, bilingualStudyLesson: 2, homework: 2 } },
      { label: 'Listening & authentic media', score: { musicLesson: 3, audioLesson: 3, simulations: 2, videoLessonInteractive: 2 } },
    ],
  },
  {
    q: 'How many learners are in the group?',
    emoji: '👥',
    options: [
      { label: 'Just 1 learner (1-on-1)', score: { liveLessonInteractive: 2, dailyLessonInteractive: 2, conversationalLesson: 2, flipbookHomework: 2 } },
      { label: 'Small group (2–5)', score: { partyMode: 3, gamifiedChallenge: 3, liveLessonInteractive: 2, conversationGame: 2 } },
      { label: 'Whole class (6+)', score: { slides: 3, videoLessonInteractive: 3, partyMode: 2, gamifiedChallenge: 2 } },
    ],
  },
];

function scoreToRanked(answers: number[], items: GalleryItem[]) {
  const total: Record<string, number> = {};
  answers.forEach((optIdx, qiIdx) => {
    const opts = WIZARD_QUESTIONS[qiIdx].options[optIdx];
    if (opts) Object.entries(opts.score).forEach(([id, pts]) => { total[id] = (total[id] || 0) + pts; });
  });
  const present = items.filter((i) => total[i.id] !== undefined);
  if (!present.length) return items.slice(0, 3);
  return present.sort((a, b) => total[b.id] - total[a.id]);
}

/* ── component ──────────────────────────────────────────────────────────── */

export default function LessonGalleryV2({
  learnerName,
  onOpenInCreator,
}: {
  learnerName?: string;
  onOpenInCreator: (typeId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [fmt, setFmt] = useState<string>('all');
  const [rarity, setRarity] = useState<string>('all');
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  // Gallery browsing is free for everyone; opening Premium/VIP tiles requires the matching tier.
  const currentTier = useAuthStore((s) => s.tier);
  const openUpgradeModal = useAuthStore((s) => s.openUpgradeModal);

  const locked = (it: GalleryItem) => !canOpenRarity(it.rarity, currentTier);

  const requireAccess = (it: GalleryItem): boolean => {
    if (!locked(it)) return true;
    openUpgradeModal(
      it.rarity === 'VIP'
        ? `Unlock ${it.name} with a VIP account — the gallery itself is free, this format is VIP-exclusive.`
        : `Unlock ${it.name} with a PRO account — the gallery itself is free, this format is Premium-exclusive.`
    );
    return false;
  };

  const filtered = useMemo(() => {
    return GALLERY_ITEMS.filter((it) => {
      if (fmt !== 'all' && it.format !== fmt) return false;
      if (rarity !== 'all' && it.rarity !== rarity) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${it.name} ${it.tagline} ${it.audience} ${it.features.join(' ')} ${it.level}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (POP[a.id] ?? 99) - (POP[b.id] ?? 99)); // most common first (Micro Lesson → least)
  }, [query, fmt, rarity]);

  const ranked = useMemo(() => {
    if (!wizard || answers.length === 0) return [];
    return scoreToRanked(answers, GALLERY_ITEMS);
  }, [wizard, answers]);

  const openSample = (it: GalleryItem) => {
    if (!requireAccess(it)) return; // locked Premium/VIP tile → upgrade prompt, never opens
    if (it.sampleUrl) { window.open(it.sampleUrl, '_self'); return; } // same window → watch it run
    // No standalone sample → open the Lesson Creator with this type pre-selected + mock data auto-loaded
    onOpenInCreator(it.id);
  };

  const openInCreator = (it: GalleryItem) => {
    if (!requireAccess(it)) return; // locked Premium/VIP tile → upgrade prompt, never opens the creator
    onOpenInCreator(it.id);
  };

  const fmtChips = ['all', ...Array.from(new Set(GALLERY_ITEMS.map((i) => i.format)))];
  const rarityChips = ['all', 'Free', 'Premium', 'VIP'];

  return (
    <div className="space-y-4">
      {/* header row + wizard toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Lesson Gallery</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {learnerName ? `Mock samples for ${learnerName}` : 'Mock samples'} — every tile opens in this window so you can test it live.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setWizard(!wizard); setStep(0); setAnswers([]); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer ${wizard ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 border border-violet-300 hover:bg-violet-50'}`}
          >
            {wizard ? '✕ Close wizard' : '🧭 Help me choose'}
          </button>
        </div>
      </div>

      {wizard && (
        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wide text-violet-600">Lesson picker wizard</span>
            <span className="text-[11px] text-gray-400">·</span>
            <span className="text-[11px] text-gray-500">{step + 1} / {WIZARD_QUESTIONS.length} · tap an answer to continue</span>
          </div>
          {step < WIZARD_QUESTIONS.length ? (
            <div>
              <h4 className="text-lg font-extrabold text-gray-900 mb-4">
                {WIZARD_QUESTIONS[step].emoji} {WIZARD_QUESTIONS[step].q}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WIZARD_QUESTIONS[step].options.map((o, oi) => (
                  <button
                    key={oi}
                    onClick={() => {
                      const next = [...answers];
                      next[step] = oi;
                      setAnswers(next);
                      setStep(Math.min(step + 1, WIZARD_QUESTIONS.length)); // advance past the last question → recommendations
                    }}
                    className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${answers[step] === oi ? 'border-violet-500 bg-white shadow-md' : 'border-white bg-white/60 hover:bg-white'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button className="mt-4 text-xs font-bold text-violet-500 hover:underline cursor-pointer" onClick={() => setStep(step - 1)}>← Back</button>
              )}
            </div>
          ) : (
            <div>
              <h4 className="text-lg font-extrabold text-gray-900 mb-1">✨ Best formats for this learner</h4>
              <p className="text-xs text-gray-500 mb-4">Based on your answers — tap a card to open its mock sample right here.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ranked.slice(0, 3).map((it, ri) => {
                  const r = RARITY_STYLE[it.rarity];
                  return (
                    <button key={it.id} onClick={() => openSample(it)}
                      className={`text-left rounded-2xl border-2 bg-white p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer ${ri === 0 ? 'border-violet-400' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-4xl">{it.emoji}</span>
                        {ri === 0 && <span className="text-[10px] font-black bg-violet-600 text-white px-2 py-1 rounded-lg">BEST FIT</span>}
                      </div>
                      <h5 className="font-extrabold text-gray-900">{it.name}</h5>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-3">{it.tagline}</p>
                      <p className="text-[10px] text-violet-700 mt-2 leading-snug bg-violet-50 border border-violet-100 rounded-lg px-2 py-1.5">
                        💡 {WHY_NOTES[it.id] || `A ${it.format.toLowerCase()} format that fits your answers — ${it.audience}.`}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: r.color, border: `1px solid ${r.ring}`, background: `${r.color}0d` }}>{r.label}</span>
                        <span className="text-[10px] text-gray-400">{it.level} · {it.mins} min</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="text-xs font-bold text-violet-500 hover:underline cursor-pointer" onClick={() => { setStep(0); setAnswers([]); }}>↺ Restart</button>
                <button className="text-xs font-bold text-gray-400 hover:underline cursor-pointer" onClick={() => setWizard(false)}>Done — show the whole gallery</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Filter by topic, audience, feature…"
            className="w-full pl-4 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          {query && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => setQuery('')}>✕</button>}
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          {fmtChips.map((f) => (
            <button key={f} onClick={() => setFmt(f)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer ${fmt === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'all' ? 'All formats' : `${FORMAT_ICON[f] || '·'} ${f}`}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 items-center">
          {rarityChips.map((rc) => (
            <button key={rc} onClick={() => setRarity(rc)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${rarity === rc ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-500 hover:bg-violet-100'}`}>
              {rc === 'all' ? 'Any tier' : `✦ ${rc}`}
            </button>
          ))}
        </div>
      </div>

      {/* tile grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-semibold text-gray-500">No lessons match those filters.</p>
          <button className="mt-2 text-sm font-bold text-violet-600 hover:underline cursor-pointer" onClick={() => { setQuery(''); setFmt('all'); setRarity('all'); }}>Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((it) => {
            const r = RARITY_STYLE[it.rarity];
            return (
              <div key={it.id} className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-200">
                {/* header band */}
                <div className="relative px-5 pt-5 pb-4 text-white" style={{ background: GRADS[it.id] || 'linear-gradient(135deg,#1e293b,#334155)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-4xl drop-shadow">{it.emoji}</div>
                      <h4 className="text-lg font-extrabold mt-1.5 leading-tight">{it.name}</h4>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,.22)' }}>{r.label}</span>
                      {locked(it) && <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(15,23,42,.55)' }} title={`Requires ${it.rarity === 'VIP' ? 'a VIP' : 'a PRO'} account to open`}>🔒 {it.rarity === 'VIP' ? 'VIP' : 'PRO'} only</span>}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,.15)' }}>{FORMAT_ICON[it.format]} {it.format}</span>
                    </div>
                  </div>
                  {it.sampleLabel && <div className="mt-2 text-[11px] font-semibold opacity-90 truncate" title={it.sampleLabel}>Mock sample · {it.sampleLabel}</div>}
                </div>
                {/* body */}
                <div className="flex-1 flex flex-col p-4">
                  <p className="text-[13px] text-gray-600 leading-relaxed flex-1">{it.tagline}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 py-1.5">
                      <div className="text-[13px] font-extrabold text-gray-800">{it.level}</div>
                      <div className="text-[9px] uppercase tracking-wide text-gray-400">Level</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 py-1.5">
                      <div className="text-[13px] font-extrabold text-gray-800">{it.mins}m</div>
                      <div className="text-[9px] uppercase tracking-wide text-gray-400">Length</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 py-1.5">
                      <div className="text-[13px] font-extrabold text-gray-800 truncate px-1" title={it.phases || '—'}>{it.phases || '—'}</div>
                      <div className="text-[9px] uppercase tracking-wide text-gray-400">Structure</div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-2.5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-violet-500 mb-1">👥 Target audience</div>
                    <p className="text-[12px] text-gray-700 leading-snug">{it.audience}</p>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {it.features.map((f) => (
                      <span key={f} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{f}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openSample(it)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-extrabold text-white shadow-sm transition-all cursor-pointer hover:brightness-110 hover:shadow-md"
                      style={{ background: locked(it) ? '#334155' : (GRADS[it.id] || '#1e293b') }}
                      title={locked(it)
                        ? `🔒 This ${it.rarity} format requires ${it.rarity === 'VIP' ? 'a VIP' : 'a PRO'} account to open`
                        : (it.sampleUrl ? 'Open the standalone mock in this window' : 'No standalone build — opens the Lesson Creator with this format + mock data auto-loaded')}
                    >
                      {locked(it) ? '🔒 Preview & Test' : '▶ Preview & Test'}
                    </button>
                    <button
                      onClick={() => openInCreator(it)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${locked(it) ? 'text-slate-400 border-slate-200 bg-slate-50' : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-violet-300'}`}
                      title={locked(it)
                        ? `🔒 Requires ${it.rarity === 'VIP' ? 'a VIP' : 'a PRO'} account — upgrade to open this format in the Lesson Creator`
                        : 'Open this format in the Lesson Creator (Step 1 pre-selected)'}
                    >
                      {locked(it) ? '🔒 In Creator' : '✍️ In Creator'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-gray-400 pt-1">
        The gallery is free to browse — every tile ships a ready-to-run standalone lesson with mock data. “Preview & Test” opens it in
        this same window so you can click through the real lesson, and “In Creator” jumps to the Lesson JSON Creator with this format
        pre-selected and mock loaded. Free tiles are open to every account; <strong className="text-amber-600">Premium (PRO) and VIP tiles
        stay locked until you upgrade</strong> — locked tiles never open the creator or the sample.
      </p>
    </div>
  );
}
