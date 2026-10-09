import { Learner, Session, Competency, Need, HomeworkAssignment } from '../types2';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

export interface SmartGoalRoadmapPhase {
  phase: number;
  title: string;
  targetDate?: string;
  targetCefr?: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  focusSkills: string[];
  keyMilestones: string[];
  grammarFocus?: string;
  vocabularyFocus?: string;
  actionItems?: string[];
}

export interface WhatToStudyItem {
  topic: string;
  description: string;
  priority?: 'high' | 'medium' | 'normal';
  tags?: string[];
  actionType?: 'review' | 'homework' | 'practice' | 'preview';
}

export interface WeeklyMilestoneItem {
  week: number;
  title: string;
  focus: string;
  isCompleted?: boolean;
}

export interface TermPlanDetails {
  totalSessions: number;
  sessionsCompleted: number;
  expectedCompletionDate?: string;
  weeklyCadence?: string;
  attendanceTargetPct?: number;
  notes?: string;
}

export interface MonthlyPlan {
  month: string;
  label: string;
  startDate?: string;
  endDate?: string;
  goals?: string[];
  focus?: string;
  sessionsPlanned?: number;
  milestones?: string[];
  holidaysConsidered?: string[];
  timeManagementMessages?: string[];
}

export interface SmartCoachingData {
  goal: string;
  goals: string[];
  targetLevel?: string;
  currentLevel?: string;
  deadline?: string;
  hoursPerWeek: number;
  lessonsPerWeek: number;
  studyPace?: string;
  lifestyleWindow?: string;
  nextRecommendedClassDate?: string;
  coachMotivationalQuote?: string;
  coachingSummary?: string;
  coachName?: string;
  whatToStudyNext?: WhatToStudyItem[];
  weeklyMilestones?: WeeklyMilestoneItem[];
  roadmapPhases?: SmartGoalRoadmapPhase[];
  keyStrengthsIdentified?: string[];
  priorityFixes?: string[];
  termPlanDetails?: TermPlanDetails;
  recommendedMilestones?: string[];
  aiAnalysis?: string;
  learnerReply?: string;
  monthlyPlans?: MonthlyPlan[];
  testResults?: any;
}

export const buildSmartCoachingAiPrompt = (learner: Learner, opts?: { learnerReply?: string; selectedGoals?: string[] }): string => {
  const tutor = useAuthStore.getState().tutor || useAppStore.getState().tutorInfo;
  const tutorName = tutor?.name || 'Tutor';
  const tutorBio = tutor?.bio || '';
  const teachingMethod = tutor?.teachingMethod || 'Communicative Language Teaching & Task-Based Learning';
  
  const currentLevel = learner.cefrLevel || learner.level || 'B1';
  const currentDateTime = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
  const courseName = learner.coursePlan?.courseName || (learner.coursePlan as any)?.coursebookInfo?.coursebook || 'General English Course';
  
  // Format Competencies
  const compList = (learner.competencies || []).map(c => 
    `- ${c.name} (${c.type || 'skill'}): Progress ${c.progress}%, Status: ${c.status}${c.notes ? `, Notes: ${c.notes}` : ''}`
  ).join('\n') || '- General Fluency (Progress 50%)';

  // Format Needs & Wants
  const needsList = (learner.needs || []).map(n => 
    `- ${n.name}: Priority: ${n.priority || 'medium'}, Rating: ${n.rating}/5${n.description ? `, Info: ${n.description}` : ''}`
  ).join('\n') || '- Conversational Confidence';

  // Format Previous Sessions
  const recentSessions = (learner.sessions || []).slice(-5).map((s, idx) => 
    `Session ${idx + 1} (${s.date}): Duration: ${s.duration}m, Attended: ${s.attended ? 'Yes' : 'No'}. Topics: ${(s.topics || []).join(', ') || 'N/A'}. Notes: ${s.notes || 'None'}`
  ).join('\n') || '- No previous sessions recorded yet.';

  // Format Homework
  const homeworkList = ((learner as any).homeworkAssignments || []).map((h: HomeworkAssignment) => 
    `- "${h.title}": Status: ${h.status}, Due: ${h.dueDate}${h.feedback ? `, Feedback: ${h.feedback}` : ''}`
  ).join('\n') || '- General assignment practice.';

  // Default target date: 90 days ahead
  const defaultDeadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const activeDeadline = learner.smartGoal?.deadline || defaultDeadline;
  const activeHours = learner.smartGoal?.hoursPerWeek || 4;
  const activePace = learner.smartGoal?.studyPace || 'Balanced';
  const activeWindow = learner.smartGoal?.lifestyleWindow || 'Evening Deep-Dive';
  const learnerReply = opts?.learnerReply || learner.smartGoal?.learnerReply || '';
  const selectedGoalNames = (opts?.selectedGoals && opts.selectedGoals.length > 0 ? opts.selectedGoals : (learner.smartGoal?.goals?.length ? learner.smartGoal.goals : [learner.smartGoal?.goal || ''])).map(g => `- ${g}`).join('\n');

  // First lesson from the Learner Path lesson history log (the current generated material).
  const history = (learner.lessonHistory || []);
  const currentLessonEntry = history.length > 0 ? history[history.length - 1] : undefined;
  const currentLessonLine = currentLessonEntry
    ? `- Current lesson: "${currentLessonEntry.title}" (started ${currentLessonEntry.date}, ${(currentLessonEntry.completedHeadings || []).length}/${(currentLessonEntry.headings || []).length} contents completed)`
    : '- No generated lesson in the Lesson History Log yet — plan around the next unit in the syllabus.';

  return `You are acting as the Chief Pedagogical Strategist for Coach ${tutorName}.
Analyze the comprehensive learner profile below and generate an inspiring, highly structured, data-driven SMART Goal Roadmap & Term Plan.

=== COACH & CONTEXT ===
- Academic Coach: Coach ${tutorName}
- Teaching Methodology: ${teachingMethod}
${tutorBio ? `- Coach Bio / Focus: ${tutorBio}` : ''}
- Analysis Date & Time: ${currentDateTime} (ISO: ${new Date().toISOString()})

=== LEARNER PROFILE ===
- Learner Name: ${learner.name}
- Current Level: ${currentLevel}
- Target Level Goal: ${learner.smartGoal?.targetLevel || 'Next CEFR Level (e.g. B2+)'}
- Target Deadline: ${activeDeadline}
- Occupation: ${learner.occupation || 'Professional / Student'}
- Country & Timezone: ${learner.country || 'Global'}, ${learner.timezone || 'UTC'}
- Learning Style: ${learner.learningStyle || 'Visual & Communicative'}
- Interests: ${learner.interests || 'General'}
- Learner Expectations: ${learner.expectations || 'Rapid fluency improvement and speaking confidence'}
- Current Streak: ${learner.streak || 0} sessions
- Total Logged Sessions: ${(learner.sessions || []).length} sessions
- Active Course / Syllabus: ${courseName}

=== COMPETENCIES & CURRENT MASTERY ===
${compList}

=== PRIORITIZED NEEDS & LEARNING TARGETS ===
${needsList}

=== RECENT SESSION HISTORY ===
${recentSessions}

=== RECENT HOMEWORK & TASKS ===
${homeworkList}

=== LEARNER PATH / LESSON HISTORY LOG (current generated material) ===
${currentLessonLine}
${currentLessonEntry ? `- Lesson contents: ${currentLessonEntry.headings.slice(0, 12).join(' | ')}` : ''}

=== LEARNER'S SCHEDULING REPLY (their own words) ===
${learnerReply || '- No reply provided yet. Use the profile data and reasonable defaults (2 classes/week, evening window).'}

=== GOALS SELECTED BY THE TUTOR (from competencies / syllabus) ===
${selectedGoalNames || '- General English fluency'}

=== STRICT PEDAGOGICAL INSTRUCTIONS ===
1. Craft the motivational quote and coaching summary in the authentic voice of "Coach ${tutorName}" (never mention AI, algorithms, or automated systems).
2. Generate 3 realistic, sequential Roadmap Phases (Phase 1: Foundation/Accuracy, Phase 2: Fluency/Discourse, Phase 3: Mastery/Polish) with clear CEFR milestones and grammar/vocabulary anchors.
3. Recommend 3-4 concrete "What to Study Next" preparation topics (specific grammar points, vocabulary sets, listening audios, or speaking tasks) before their next class.
4. Establish weekly milestones and calculate recommended session frequency (e.g., 2 sessions/week for ${activeHours} hrs/week).
5. SCHEDULING & PLAN REALISM: Build ONE clear month-by-month plan. If the learner starts mid-month, plan ONLY until the end of that month (e.g. "September Plan"), then continue with October Plan, November Plan... until the deadline. Respect their country's national holidays and the days they said they are unavailable — never schedule classes on those days. Use their stated free days / preferred time of day for class slots, and their stated weekly free time to cap study hours.
6. For each month, write 2-4 short, concrete time-management / coaching messages in plain language (no metaphors) that the tutor can send that learner that month (e.g. reminders, prep tasks, encouragements tied to actual progress).

=== REQUIRED JSON OUTPUT FORMAT ===
Return ONLY a raw JSON object (no markdown, no backticks, no conversational preamble) matching this exact schema:

{
  "goal": "Specific primary mastery goal (e.g., B2+ Spontaneous Fluency & Negotiation)",
  "goals": [
    "Primary target goal 1",
    "Target goal 2",
    "Target goal 3"
  ],
  "targetLevel": "B2+",
  "currentLevel": "${currentLevel}",
  "deadline": "${activeDeadline}",
  "hoursPerWeek": ${activeHours},
  "lessonsPerWeek": ${Math.max(1, Math.round(activeHours / 1.5))},
  "studyPace": "${activePace}",
  "lifestyleWindow": "${activeWindow}",
  "nextRecommendedClassDate": "${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
  "coachMotivationalQuote": "Inspiring personal coaching message from Coach ${tutorName}...",
  "coachingSummary": "Professional diagnostic assessment and pedagogical strategy for ${learner.name}...",
  "whatToStudyNext": [
    {
      "topic": "Topic Title (e.g. Unit 4: Conditional Fluency)",
      "description": "Specific preparation instructions before next session...",
      "priority": "high",
      "tags": ["Grammar", "Speaking"],
      "actionType": "homework"
    },
    {
      "topic": "Topic Title (e.g. Essential Idioms for Meetings)",
      "description": "Spaced repetition and drill instructions...",
      "priority": "medium",
      "tags": ["Vocabulary"],
      "actionType": "practice"
    },
    {
      "topic": "Topic Title (e.g. Fast-Paced Audio Analysis)",
      "description": "Listening task to improve comprehension...",
      "priority": "normal",
      "tags": ["Listening"],
      "actionType": "review"
    }
  ],
  "weeklyMilestones": [
    {
      "week": 1,
      "title": "Week 1: Core Accuracy & Sentence Flow",
      "focus": "Eliminate tense hesitation and reinforce active collocations",
      "isCompleted": false
    },
    {
      "week": 2,
      "title": "Week 2: Spontaneous Dialogue & Stance Markers",
      "focus": "Practice 5-minute uninterrupted speaking prompts",
      "isCompleted": false
    },
    {
      "week": 3,
      "title": "Week 3: Idiomatic Expression Integration",
      "focus": "Incorporate 20+ advanced phrasal verbs naturally",
      "isCompleted": false
    },
    {
      "week": 4,
      "title": "Week 4: Mid-Term Mastery & Synthesis Check",
      "focus": "Comprehensive speaking diagnostic and review",
      "isCompleted": false
    }
  ],
  "roadmapPhases": [
    {
      "phase": 1,
      "title": "Foundation & Core Accuracy",
      "targetDate": "${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
      "targetCefr": "${currentLevel}+",
      "status": "in_progress",
      "focusSkills": ["Grammar precision", "Vocabulary expansion", "Sentence connectors"],
      "keyMilestones": ["Complete Core Units 1-2", "Pass initial accuracy check with >85%"],
      "grammarFocus": "Conditionals & modal certainty",
      "vocabularyFocus": "Professional collocations & descriptive synonyms"
    },
    {
      "phase": 2,
      "title": "Fluency Expansion & Active Discourse",
      "targetDate": "${new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
      "targetCefr": "B2",
      "status": "upcoming",
      "focusSkills": ["Spontaneous argumentation", "Listening cadence", "Natural intonation"],
      "keyMilestones": ["Deliver 5-minute presentation", "Participate in simulated case study"],
      "grammarFocus": "Inversion, cleft sentences & discourse connectors",
      "vocabularyFocus": "Nuanced adjectives & idiomatic verbs"
    },
    {
      "phase": 3,
      "title": "Advanced Mastery & Confident Polish",
      "targetDate": "${activeDeadline}",
      "targetCefr": "B2+",
      "status": "upcoming",
      "focusSkills": ["Executive communication", "Idiomatic agility", "Native speed listening"],
      "keyMilestones": ["Pass term milestone exam", "Achieve target CEFR score"],
      "grammarFocus": "Pragmatic hedging & rhetorical precision",
      "vocabularyFocus": "High-register terminology & idioms"
    }
  ],
  "keyStrengthsIdentified": [
    "High engagement and consistency",
    "Strong receptive reading and listening grasp"
  ],
  "priorityFixes": [
    "Hesitation during spontaneous speech production",
    "Preposition and tense consistency under time pressure"
  ],
  "termPlanDetails": {
    "totalSessions": 24,
    "sessionsCompleted": ${(learner.sessions || []).filter(s => s.attended).length},
    "expectedCompletionDate": "${activeDeadline}",
    "weeklyCadence": "${Math.max(1, Math.round(activeHours / 1.5))} sessions / week",
    "attendanceTargetPct": 95,
    "notes": "Consistently maintain weekly cadence to ensure target milestone achievement."
  },
  "recommendedMilestones": [
    "Complete Phase 1 core units and review drills",
    "Achieve 90%+ attendance consistency across the term"
  ],
  "monthlyPlans": [
    {
      "month": "September 2026",
      "label": "September Plan",
      "startDate": "2026-09-15",
      "endDate": "2026-09-30",
      "goals": ["Finish current lesson contents", "Accuracy check > 85%"],
      "focus": "Foundation & core accuracy (Phase 1)",
      "sessionsPlanned": 5,
      "milestones": ["Complete 5 classes", "No missed classes"],
      "holidaysConsidered": ["Any national holidays in ${learner.country} during this month"],
      "timeManagementMessages": ["Class reminder + 1 prep task 24h before each class", "Weekend 20-min review drill message"]
    }
  ]
}`;
};

export const parseSmartCoachingJson = (jsonString: string): { success: boolean; data?: SmartCoachingData; error?: string } => {
  try {
    const cleaned = jsonString
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    
    const parsed = JSON.parse(cleaned);

    const goal = parsed.goal || (Array.isArray(parsed.goals) && parsed.goals[0]) || 'General English Fluency';
    const goals = Array.isArray(parsed.goals) && parsed.goals.length > 0 ? parsed.goals : [goal];
    const hoursPerWeek = Number(parsed.hoursPerWeek) || 4;
    const lessonsPerWeek = Number(parsed.lessonsPerWeek) || Math.max(1, Math.round(hoursPerWeek / 1.5));

    const coachingData: SmartCoachingData = {
      goal,
      goals,
      targetLevel: parsed.targetLevel || 'B2',
      currentLevel: parsed.currentLevel,
      deadline: parsed.deadline,
      hoursPerWeek,
      lessonsPerWeek,
      studyPace: parsed.studyPace || 'Balanced',
      lifestyleWindow: parsed.lifestyleWindow || 'Evening Deep-Dive',
      nextRecommendedClassDate: parsed.nextRecommendedClassDate,
      coachMotivationalQuote: parsed.coachMotivationalQuote,
      coachingSummary: parsed.coachingSummary || parsed.aiAnalysis,
      coachName: parsed.coachName,
      whatToStudyNext: Array.isArray(parsed.whatToStudyNext) ? parsed.whatToStudyNext : [],
      weeklyMilestones: Array.isArray(parsed.weeklyMilestones) ? parsed.weeklyMilestones : [],
      roadmapPhases: Array.isArray(parsed.roadmapPhases) ? parsed.roadmapPhases : [],
      keyStrengthsIdentified: Array.isArray(parsed.keyStrengthsIdentified) ? parsed.keyStrengthsIdentified : [],
      priorityFixes: Array.isArray(parsed.priorityFixes) ? parsed.priorityFixes : [],
      termPlanDetails: parsed.termPlanDetails || {
        totalSessions: 24,
        sessionsCompleted: 0,
        weeklyCadence: `${lessonsPerWeek} sessions / week`,
        attendanceTargetPct: 95
      },
      recommendedMilestones: Array.isArray(parsed.recommendedMilestones) ? parsed.recommendedMilestones : [],
      aiAnalysis: parsed.coachingSummary || parsed.aiAnalysis,
      learnerReply: parsed.learnerReply,
      monthlyPlans: Array.isArray(parsed.monthlyPlans) ? parsed.monthlyPlans : [],
      testResults: parsed.testResults
    };

    return { success: true, data: coachingData };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Invalid JSON format. Please ensure the external AI returned valid JSON.' };
  }
};
