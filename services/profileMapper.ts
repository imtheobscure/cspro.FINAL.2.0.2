import type { LearnerProfile, TutorPlatformProfile } from '../types';

export interface UserJsonLearnerProfile {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    country?: string;
    city?: string;
    languages?: string[];
    occupation?: string;
    major?: string;
    gender?: string;
    birthday?: string;
    learningStyle?: string;
    interests?: string;
    expectations?: string;
    facts?: string;
    funFacts?: string;
    needs?: Array<{ 
        id: string;
        name: string; 
        rating: number; 
        learningPath?: Array<{ name: string; progress: number }>;
    }>;
    competencies?: Array<{
        name: string;
        icon: string;
        rating: number;
        progress: number;
        status: string;
    }>;
    coursePlan?: {
      level: string;
      targetLevel: string;
      courseName: string;
      duration: number;
      frequency: string;
      totalSessions: number;
      features: string;
    };
    sessions?: Array<any>;
}

const generateSafeId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const mapTutorPlatformProfileToLearnerProfile = (
  rawProfile: TutorPlatformProfile,
  existingProfile?: LearnerProfile
): LearnerProfile => {
  const name = rawProfile.personalInformation.name;
  const id = existingProfile?.id || generateSafeId();

  const sessionHistory = rawProfile.lastSessionRecap ? [{
    date: rawProfile.lastSessionRecap.date,
    summary: `${rawProfile.lastSessionRecap.lessonName}: ${rawProfile.lastSessionRecap.keyLearnings.join('; ')}`,
    needsHelp: rawProfile.lastSessionRecap.areasToImprove,
    corrections: [],
  }] : [];

  const parsedNewFacts = Array.isArray(rawProfile.facts) ? rawProfile.facts : (typeof rawProfile.facts === 'string' ? rawProfile.facts.split('\n') : []);
  const newFacts = parsedNewFacts.map(f => typeof f === 'string' ? f.trim() : f).filter(Boolean);
  const existingFacts = Array.isArray(existingProfile?.facts) ? existingProfile.facts : (typeof existingProfile?.facts === 'string' ? (existingProfile.facts as any).split('\n') : []);
  const combinedFacts = [...new Set([...existingFacts, ...newFacts])];

  return {
    id,
    name,
    email: rawProfile.personalInformation.email,
    phone: rawProfile.personalInformation.phone,
    cefrLevel: rawProfile.coursePlan.level,
    l1Language: existingProfile?.l1Language ?? (rawProfile.personalInformation.languages?.[0] || rawProfile.personalInformation.country),
    targetLanguage: existingProfile?.targetLanguage || 'English',
    tutorVoice: "You are an expert ESL/EFL content creator.",
    personalInfo: {
      age: 0,
      country: rawProfile.personalInformation.country,
      city: rawProfile.personalInformation.city,
      occupation: rawProfile.personalInformation.occupation,
      address: `${rawProfile.personalInformation.city}, ${rawProfile.personalInformation.country}`,
      gender: existingProfile?.personalInfo.gender ?? rawProfile.personalInformation.gender as any,
    },
    interests: rawProfile.personalInformation.interests || '',
    facts: combinedFacts,
    learningChallenges: rawProfile.learningChallenges || [],
    needsAndExpectations: `Needs: ${(rawProfile.needsWantsAndExpectations.needs || []).map(n => n.name).join(', ')}\nExpectations: ${rawProfile.needsWantsAndExpectations.expectations || ''}`,
    sessionHistory,
    coursePlan: {
      longTermGoals: (rawProfile.needsWantsAndExpectations.expectations || '').split(',').map(g => g.trim()).filter(Boolean),
      shortTermGoals: (rawProfile.needsWantsAndExpectations.needs || []).map(n => n.name),
      targetLevel: rawProfile.coursePlan.targetLevel,
      courseName: rawProfile.coursePlan.courseName,
    },
    rawProfile,
  };
};

export const mapUserJsonProfileToLearnerProfile = (
  raw: UserJsonLearnerProfile,
  existing?: LearnerProfile
): LearnerProfile => {
  const id = raw.id || existing?.id || generateSafeId();

  // Consolidate deep info into strings that AI can read
  const needsStr = (raw.needs || []).map(n => {
      const path = (n.learningPath || []).map(p => p.name).join(', ');
      return `${n.name} (Rating: ${n.rating}/5) - Path: ${path}`;
  }).join('\n');

  const compStr = (raw.competencies || []).map(c => 
      `${c.name}: ${c.progress}% - Status: ${c.status}`
  ).join('\n');

  const parsedFacts = Array.isArray(raw.facts) ? raw.facts : (typeof raw.facts === 'string' ? raw.facts.split('\n') : []);
  // Combine all strings into an exhaustive facts list
  const combinedFacts = [
      ...parsedFacts,
      raw.funFacts ? `Fun Facts: ${raw.funFacts}` : '',
      raw.occupation ? `Occupation: ${raw.occupation}` : '',
      raw.major ? `Major: ${raw.major}` : '',
      raw.learningStyle ? `Learning Style: ${raw.learningStyle}` : '',
      raw.expectations ? `Expectations: ${raw.expectations}` : '',
      ...(raw.sessions?.map(s => s.skillsLearned && s.skillsLearned.length > 0 ? `Learned previously: ${s.skillsLearned.join(', ')}` : '') || [])
  ].filter(f => f && f.trim() !== '');

  const uniqueFacts = [...new Set([...(existing?.facts || []), ...combinedFacts])];

  const mapped: Record<string, any> = {
    id,
    name: raw.name,
    email: raw.email || '',
    phone: raw.phone || '',
    cefrLevel: existing?.cefrLevel || raw.coursePlan?.level || 'B1',
    l1Language: existing?.l1Language ?? (raw.languages?.[0] || raw.country || 'English'),
    targetLanguage: existing?.targetLanguage || 'English',
    tutorVoice: "You are an expert ESL/EFL content creator for language tutors, creating highly personalized and pedagogically sound learning materials.",
    personalInfo: existing?.personalInfo || {
      age: 0,
      country: raw.country || '',
      city: raw.city || '',
      occupation: raw.occupation || '',
      address: `${raw.city || ''}, ${raw.country || ''}`,
      gender: (raw.gender as any) || 'Other',
    },
    interests: raw.interests || '',
    facts: uniqueFacts,
    learningChallenges: raw.coursePlan?.features ? raw.coursePlan.features.split(',').map(s => s.trim()) : [],
    needsAndExpectations: `EXPECTATIONS: ${raw.expectations || ''}\n\nNEEDS:\n${needsStr}\n\nCOMPETENCIES:\n${compStr}`,
    manualGeneratorSettings: (raw as any).manualGeneratorSettings || existing?.manualGeneratorSettings,
    sessionHistory: (raw.sessions || []).map(s => ({
        date: s.date,
        summary: s.lessonSummary || s.lessonName || '',
        needsHelp: s.needsHelp || s.weaknessDetails?.map((w: any) => w.point) || [],
        corrections: []
    })),
    coursePlan: {
      longTermGoals: (raw.expectations || '').split(',').map(g => g.trim()),
      shortTermGoals: (raw.needs || []).map(n => n.name),
      targetLevel: raw.coursePlan?.targetLevel,
      courseName: raw.coursePlan?.courseName,
    },
    currentLessonSettings: existing?.currentLessonSettings,
    syllabus: (raw as any).syllabus || existing?.syllabus,
    situations: (raw as any).situations || (raw as any).targetSituations || '',
    focus: (raw as any).focus || (raw as any).instructionalFocus || '',
  };

  // ------------------------------------------------------------------
  // LOSS-PROOF MERGE
  // The legacy LearnerProfile shape does not model every field of the
  // Zustand `Learner` (needs, competencies, level, todos, timezone, ...).
  // Spreading the raw record first keeps every native field alive so the
  // Review Board / profile editor can never silently wipe structured data
  // (this was the cause of competencies vanishing from the Competency
  // Overview and of edits writing a lossy object back to the store).
  // ------------------------------------------------------------------
  const merged: Record<string, any> = { ...(raw as any), ...mapped };

  // Never let an undefined legacy field overwrite a real native value
  Object.keys(mapped).forEach((key) => {
    if (mapped[key] === undefined) delete merged[key];
  });

  // Structured collections must survive the round trip
  merged.needs = (raw as any).needs ?? (existing as any)?.needs ?? merged.needs;
  merged.competencies = (raw as any).competencies ?? (existing as any)?.competencies ?? merged.competencies;
  merged.goals = (raw as any).goals ?? (existing as any)?.goals ?? merged.goals;
  merged.sessions = (raw as any).sessions ?? merged.sessions;

  // coursePlan is two shapes at once: the native CoursePlan (level, duration,
  // frequency, totalSessions...) and the legacy goals shape. Keep both.
  const legacyExtraPlan = Object.fromEntries(
    Object.entries((mapped.coursePlan || {}) as Record<string, any>).filter(([, v]) => v !== undefined)
  );
  merged.coursePlan = {
    ...((existing as any)?.coursePlan || {}),
    ...((raw as any).coursePlan || {}),
    ...legacyExtraPlan,
  };
  merged.plan = (raw as any).plan ?? (raw as any).coursePlan ?? merged.plan;

  // CEFR level used by Lesson Creation > Lesson Customization
  merged.cefrLevel =
    (raw as any).cefrLevel ||
    (raw as any).coursePlan?.level ||
    (existing as any)?.cefrLevel ||
    merged.cefrLevel ||
    'B1';
  merged.level = (raw as any).level || (raw as any).coursePlan?.level || merged.level || merged.cefrLevel;

  // Facts are always normalised to a clean array
  merged.facts = uniqueFacts;

  return merged as LearnerProfile;
};
