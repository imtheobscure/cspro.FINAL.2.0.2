
import React, { FC } from 'react';
import Input from '../ui/Input';

// --- Type Definitions ---
type ChecklistData = Record<string, boolean>;

export interface ChecklistStateItem {
  features: ChecklistData;
  custom: string;
}

export interface ChecklistState {
  explainerLesson: ChecklistStateItem;
  englishLesson: ChecklistStateItem;
  examPrepLesson: ChecklistStateItem;
  conversationalLesson: ChecklistStateItem;
  bilingualStudyLesson: ChecklistStateItem;
  homework: ChecklistStateItem;
  quiz: ChecklistStateItem;
  lessonPlan: ChecklistStateItem;
  learningApp: ChecklistStateItem;
  weeklyChallenge: ChecklistStateItem;
  studyGuide: ChecklistStateItem;
  simulations: ChecklistStateItem;
  slides: ChecklistStateItem;
  feedbackLesson: ChecklistStateItem;
}

type ChecklistType = keyof ChecklistState;

// --- Feature Definitions ---
export const checklistFeatures = {
  explainerLesson: {
    "Sequential Analysis": "Process the source text in order, breaking it down chunk by chunk.",
    "Deep Vocabulary Explanation": "Provide detailed explanations, examples, and translations for all key vocabulary.",
    "Grammar & Nuance Breakdown": "Analyze grammatical structures and subtle language use in each text chunk.",
    "Actionable 'How to Use' Section": "Include a detailed section with sample dialogues on how to apply the learned content.",
    "Dialogic Teaching Voice": "Speak directly to the learner in 2nd person with a warm, encouraging tutor voice throughout.",
    "Real-World Skills Connection": "Connect each section to 2-3 real-life skills with step-by-step guidance personalized to the learner.",
    "Case Study Integration": "Include a simplified real-world article with discussion and debate cards for each section.",
  },
  englishLesson: {
    "Exhaustive Vocabulary List": "Identify and explain every single important word, phrasal verb, and idiom from the entire text.",
    "Dedicated Grammar Section": "Provide a clear and comprehensive explanation of the key grammar points found in the text.",
    "Long-form Listening Practice": "Generate a new, long (1200+ words for B1/B2) audio script that recycles all lesson content.",
    "Authentic Reading Practice": "Generate a new, long (1200+ words for B1/B2) text in a real-world genre that recycles all lesson content.",
    "Practical Speaking Scenarios": "Create at least 3 distinct, detailed speaking tasks that require active use of the new language.",
    "Speaking Games Variety": "Include a range of speaking games like 'Would You Rather?', 'Truth or Dare?', 'Never Have I Ever', 'Two Truths One Lie' to practice language in a fun, low-anxiety way.",
  },
  examPrepLesson: {
    "Task-based Structure": "Organize the lesson around specific exam tasks (e.g., IELTS Speaking Part 2, TOEFL Writing).",
    "High-Scoring Strategies & Tips": "Provide actionable advice, time management tips, and insights into scoring criteria for each task.",
    "Common Mistake Analysis": "Highlight common errors learners make on each task and show how to avoid them.",
    "Model Answer with Analysis": "For each practice task, provide a high-quality model answer and a detailed analysis of WHY it's high-scoring.",
    "Exam Speaking Games": "Include exam-themed speaking games like 'Would You Rather' exam dilemmas, 'Truth or Dare' exam challenges, or 'Hot Seat' rapid-fire vocabulary review.",
  },
  conversationalLesson: {
    "Multi-Part Conversational Flow": "Structure the lesson in four parts: Activation, Language Deep Dive, Structured Practice, and Fun & Games.",
    "Spoken Grammar Read-Aloud": "Include a long (~700 word) read-aloud script that exaggerates the use of natural, spoken grammar.",
    "Real-Life Dialogue Scenarios": "Generate multiple, substantial dialogues set in the learner's real-life contexts.",
    "Interactive Games": "Include fun, speaking-focused games like 'Would You Rather?', 'Truth or Dare?', 'Never Have I Ever', and 'Two Truths One Lie'.",
  },
  bilingualStudyLesson: {
    "Chunk-based Learning": "Break the source text down into small, manageable 'smart chunks' for analysis.",
    "Side-by-Side Translation": "Provide a full, side-by-side translation of each text chunk into the learner's L1.",
    "Sentence-by-Sentence L1 Analysis": "Include a detailed, sentence-by-sentence explanation of grammar and nuance in the learner's L1.",
    "Bilingual Vocabulary Lists": "For each chunk, provide key vocabulary with definitions, examples, and translations in L1.",
  },
  homework: {
    "Multiple Reading Genres": "Include at least two distinct reading tasks in authentic genres (e.g., email, blog post).",
    "Dual Listening Tasks": "Provide two listening tasks: one monologue (podcast) and one dialogue (conversation).",
    "Speaking Task (Record & Compare)": "Create a speaking prompt that asks the learner to record themselves and compare to a model answer.",
    "Integrated & Soft Skills Tasks": "Design practical, multi-step tasks that combine skills and focus on real-world communication.",
  },
  quiz: {
    "Multiple Question Formats": "Use a mix of question types: Multiple Choice, Fill-in-the-Blank, and Short Answer.",
    "Reading Comprehension Section": "Include a short, new text followed by comprehension questions.",
    "Direct Vocabulary & Grammar Testing": "Directly test the discrete vocabulary and grammar points from the lesson.",
    "Clear Answer Key": "Generate a complete and clearly formatted answer key for all sections.",
  },
  lessonPlan: {
    "Tutor's Dialogue Script": "Provide explicit, word-for-word scripts for the tutor to say during activities.",
    "Vocabulary Expansion (2-3x)": "Generate 2-3 times more related vocabulary than what's in the student's lesson.",
    "Streetwise Language Section": "Include slang, casual alternatives, and real examples from movies/TV shows.",
    "Life Skill Connection": "Link language points to practical life skills, like personal safety or financial literacy.",
    "Actionable Strategy Dialogues": "Ensure all teaching tips are demonstrated with a sample dialogue.",
  },
  learningApp: {
    "Varied Exercise Types": "Include a wide range of activities like fill-in-the-blanks, matching, error correction, and short writing prompts.",
    "Pronunciation Focus": "Add a section with tips and practice for difficult sounds or word stress.",
    "Register (Formal/Casual) Practice": "Include activities that focus on distinguishing and using formal vs. casual language.",
    "Real-life Application Task": "Create a task that requires using the lesson's language in a realistic scenario.",
  },
  weeklyChallenge: {
    "7-Day Scaffolding": "Structure the week so tasks build on each other and gradually increase in complexity.",
    "Authentic, Real-World Genres": "Use tasks based on real-world materials like product reviews, news clips, or user manuals.",
    "Coherent Learning Loop": "Forcefully recycle vocabulary and skills from the core lesson throughout the week.",
    "Self-Correction Mechanisms": "Provide answer keys, checklists, or model answers so the learner can self-assess.",
  },
  studyGuide: {
    "Podcast-Style Audio": "Generate a conversational audio overview with two speakers (Host & Expert).",
    "Analysis Slides": "Create sequential slides breaking down grammar and nuance from the text.",
    "Gamified Flashcards": "Include 'Would You Rather' scenarios and Concept Checking Questions on flashcards.",
    "Interactive HTML": "Structure content for the interactive 3D flashcard and game viewer.",
  },
  simulations: {
    "Multiple (3) Scenarios": "Generate three distinct simulation scenarios based on the text.",
    "Emotional Variety": "Use a wide range of emotions to make the dialogue engaging.",
    "Interactive Practice Prompts": "Include specific prompts for the learner and system for follow-up interactive practice.",
  },
  slides: {
    "Visual Slide Deck": "Create a visually structured deck with key points, personalized examples, and usage tips.",
    "Comprehensive Explainer Doc": "Generate a separate, detailed 'Slide Explainer' document with core lecture notes, case studies, and discussion prompts.",
    "Simplified CEFR Language": "Strictly adhere to the CEFR level for clarity and accessibility.",
    "Show/Hide Answers": "Include interactive comprehension checks with revealable answers on the slides.",
  },
  feedbackLesson: {
    "Socratic Method": "Do not correct errors immediately. Ask guiding questions to help the learner self-correct first.",
    "Exam Rubric Scoring": "Provide a detailed score breakdown based on the specific exam rubrics found in the learner profile.",
    "Top Score Rewrite": "Rewrite the learner's input into a perfect, native-level Band 9 sample.",
    "Nuance & Register Analysis": "Explain the subtle differences in meaning, formality, and tone for every correction.",
    "Personalized Strategy": "Provide actionable steps and specific practice tips tailored to the learner's recurring mistakes.",
  }
};

// --- Helper Functions ---
export const getInitialChecklistState = (): ChecklistState => {
  const state = {} as ChecklistState;
  for (const key in checklistFeatures) {
    const type = key as ChecklistType;
    const features = checklistFeatures[type];
    state[type] = {
      features: Object.keys(features).reduce((acc, feature) => {
        acc[feature] = true; // Default all to true
        return acc;
      }, {} as ChecklistData),
      custom: ''
    };
  }
  return state;
};

export const getSelectedFeatures = (stateItem: ChecklistStateItem, featureDefinitions: Record<string, string>): string[] => {
  const selected = Object.keys(stateItem.features)
    .filter(feature => stateItem.features[feature])
    .map(feature => featureDefinitions[feature] || feature); // Get full description
  
  if (stateItem.custom.trim()) {
    selected.push(stateItem.custom.trim());
  }
  return selected;
};

const ALL_FEATURES = Object.values(checklistFeatures).reduce((acc, features) => {
    return { ...acc, ...features };
}, {});


// --- Component ---
const FeatureChecklist: FC<{
  title: string;
  type: ChecklistType;
  features: Record<string, string>; // This is now just the default set for the type
  state: ChecklistStateItem;
  onFeatureChange: (type: ChecklistType, feature: string, isChecked: boolean) => void;
  onCustomChange: (type: ChecklistType, value: string) => void;
}> = ({ title, type, features, state, onFeatureChange, onCustomChange }) => {

  const otherFeatures: Record<string, string> = {};
  for (const key in ALL_FEATURES) {
      if (!features[key]) {
          otherFeatures[key] = ALL_FEATURES[key];
      }
  }

  return (
    <div className="bg-gray-50 p-3 rounded-md">
      <h4 className="font-semibold text-gray-700 text-sm mb-2">{title}</h4>
      <div className="space-y-2 pl-2 border-l-2 border-gray-200">
        {Object.entries(features).map(([key, description]) => (
          <label key={key} className="flex items-start text-sm text-gray-600" title={description}>
            <input
              type="checkbox"
              checked={state.features[key] ?? false}
              onChange={(e) => onFeatureChange(type, key, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2">{key}</span>
          </label>
        ))}
        <div className="pt-2">
            <Input
                value={state.custom}
                onChange={(e) => onCustomChange(type, e.target.value)}
                placeholder="Add a custom mandatory feature..."
                className="text-sm"
            />
        </div>
      </div>
      
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-gray-500">Show Additional Features...</summary>
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-200">
          {Object.entries(otherFeatures).map(([key, description]) => (
            <label key={key} className="flex items-start text-sm text-gray-500" title={description}>
              <input
                type="checkbox"
                checked={state.features[key] ?? false}
                onChange={(e) => onFeatureChange(type, key, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2">{key}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
};

export default FeatureChecklist;
