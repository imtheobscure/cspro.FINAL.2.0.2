import { Learner, CourseLevel, CompetencyStatus } from '../types2';

export const getTestUser = (): Learner => {
  return {
    id: "test-user-alpha",
    name: "Test Student Alpha",
    email: "alpha@test.com",
    phone: "",
    country: "Spain",
    city: "Madrid",
    timezone: "Europe/Madrid",
    avatarId: "😎",
    level: CourseLevel.B2,
    cefrLevel: "B2",
    l1Language: "Spanish",
    targetLanguage: "English",
    tutorVoice: "You are an expert ESL tutor for adults.",
    occupation: "Software Engineer",
    gender: "Male",
    birthday: "1990-01-01",
    languages: ["Spanish", "English"],
    streak: 15,
    xp: 2500,
    notes: "Very motivated.",
    joinedAt: new Date().toISOString(),
    status: 'active',
    competencies: [
      { id: "c1", name: "Speaking", icon: "speaking", rating: 4, initialProgress: 30, progress: 45, status: CompetencyStatus.OnTrack },
      { id: "c2", name: "Listening", icon: "listening", rating: 3, initialProgress: 20, progress: 35, status: CompetencyStatus.OnTrack }
    ],
    needs: [
      { id: "n1", label: "Business Meetings", description: "Need to run meetings smoothly", skills: [{id: "s1", name: "Interrupting politely"}] }
    ],
    goals: ["Lead a presentation confidently"],
    interests: "Technology, Startups, Gaming",
    learningStyle: "Visual",
    expectations: "Practical speaking practice",
    sessions: [],
    achievements: [],
    coursePlan: {
      level: CourseLevel.B2,
      targetLevel: CourseLevel.C1,
      courseName: "Tech English Pro",
      duration: 60,
      frequency: "Balanced",
      totalSessions: 24,
      currentLesson: "",
      features: "Mock presentations"
    }
  } as unknown as Learner;
};

export const mockTodos: any[] = [];
export const mockGroupClasses: any[] = [];
export const mockLearners: any[] = [];
