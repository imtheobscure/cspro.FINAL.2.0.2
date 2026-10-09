// stores/useAutomationStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  ScheduledEmail, 
  DripCampaign, 
  EmailTemplate, 
  SpacedRepetitionItem, 
  HomeworkAssignment,
  Challenge,
  StreakFreeze,
  Notification,
  PaymentRecord,
  ResourceItem,
  SessionTemplate,
  LearnerTag
} from '../types2';
import { idbZustandStorage } from '../utils/storageAdapter';

interface AutomationState {
  // Email System
  emailTemplates: EmailTemplate[];
  scheduledEmails: ScheduledEmail[];
  dripCampaigns: DripCampaign[];
  
  // Spaced Repetition
  spacedRepetitionItems: SpacedRepetitionItem[];
  
  // Homework
  homeworkAssignments: HomeworkAssignment[];
  
  // Gamification
  challenges: Challenge[];
  streakFreezes: StreakFreeze[];
  
  // Notifications
  notifications: Notification[];
  
  // Payments
  paymentRecords: PaymentRecord[];
  
  // Resources
  resources: ResourceItem[];
  
  // Templates
  sessionTemplates: SessionTemplate[];
  
  // Tags
  learnerTags: Record<string, string[]>; // learnerId -> tagIds[]
  
  // Actions - Email
  addEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt'>) => void;
  updateEmailTemplate: (template: EmailTemplate) => void;
  removeEmailTemplate: (id: string) => void;
  scheduleEmail: (email: Omit<ScheduledEmail, 'id' | 'createdAt'>) => void;
  updateScheduledEmail: (email: ScheduledEmail) => void;
  cancelScheduledEmail: (id: string) => void;
  markEmailSent: (id: string) => void;
  
  // Actions - Drip Campaigns
  createDripCampaign: (campaign: Omit<DripCampaign, 'id'>) => void;
  updateDripCampaign: (campaign: DripCampaign) => void;
  pauseDripCampaign: (id: string) => void;
  
  // Actions - Spaced Repetition
  addSpacedRepetitionItem: (item: Omit<SpacedRepetitionItem, 'id'>) => void;
  updateSpacedRepetitionItem: (item: SpacedRepetitionItem) => void;
  markItemReviewed: (id: string) => void;
  
  // Actions - Homework
  addHomework: (homework: Omit<HomeworkAssignment, 'id'>) => void;
  updateHomework: (homework: HomeworkAssignment) => void;
  submitHomework: (id: string) => void;
  gradeHomework: (id: string, grade: number, feedback: string) => void;
  
  // Actions - Challenges
  addChallenge: (challenge: Omit<Challenge, 'id'>) => void;
  updateChallengeProgress: (id: string, progress: number) => void;
  completeChallenge: (id: string) => void;
  
  // Actions - Streak Freezes
  addStreakFreeze: (learnerId: string) => void;
  useStreakFreeze: (learnerId: string) => boolean;
  getAvailableFreezes: (learnerId: string) => number;
  
  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  getUnreadCount: () => number;
  
  // Actions - Payments
  addPaymentRecord: (payment: Omit<PaymentRecord, 'id'>) => void;
  updatePaymentRecord: (payment: PaymentRecord) => void;
  markPaymentPaid: (id: string) => void;
  
  // Actions - Resources
  addResource: (resource: Omit<ResourceItem, 'id' | 'uploadedAt'>) => void;
  removeResource: (id: string) => void;
  
  // Actions - Session Templates
  addSessionTemplate: (template: Omit<SessionTemplate, 'id'>) => void;
  updateSessionTemplate: (template: SessionTemplate) => void;
  removeSessionTemplate: (id: string) => void;
  
  // Actions - Tags
  addTagToLearner: (learnerId: string, tagId: string) => void;
  removeTagFromLearner: (learnerId: string, tagId: string) => void;
  getLearnerTags: (learnerId: string) => string[];
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set, get) => ({
      emailTemplates: [
        {
          id: 'welcome-default',
          name: 'Welcome Email',
          subject: 'Welcome to Your English Learning Journey! 🎉',
          body: `Hi {{learnerName}},

Welcome aboard! I'm so excited to have you join our English learning community.

Here's what you can expect:
- Personalized lessons tailored to your goals
- Regular progress tracking and feedback
- Fun and engaging activities

Your first session is scheduled for {{nextSessionDate}}. I can't wait to meet you!

Best regards,
Your English Tutor`,
          type: 'welcome',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'reminder-default',
          name: 'Session Reminder',
          subject: 'Reminder: English Session Tomorrow! 📚',
          body: `Hi {{learnerName}},

Just a friendly reminder that we have a session scheduled for tomorrow at {{sessionTime}}.

Please review:
- {{lastSessionTopics}}

See you soon!`,
          type: 'reminder',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'homework-default',
          name: 'Homework Assignment',
          subject: 'New Homework Assignment 📝',
          body: `Hi {{learnerName}},

Here's your homework from our last session:

{{homeworkContent}}

Due date: {{dueDate}}

Complete this for {{xpReward}} XP bonus!

Good luck!`,
          type: 'homework',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'progress-default',
          name: 'Weekly Progress Update',
          subject: 'Your Weekly Progress Report 📊',
          body: `Hi {{learnerName}},

Here's your weekly progress summary:

Sessions this week: {{sessionsThisWeek}}
XP earned: {{xpEarned}}
Current streak: {{streak}} days
Level: {{level}}

Keep up the great work!`,
          type: 'progress',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'reengagement-default',
          name: 'We Miss You!',
          subject: 'We Miss You! Come Back and Learn 💙',
          body: `Hi {{learnerName}},

We noticed you haven't had a session in {{daysSinceLastSession}} days. We miss you!

Your progress so far:
- Level: {{level}}
- XP: {{xp}}
- Streak: {{streak}}

Don't let your progress slip! Book your next session today.

Looking forward to seeing you soon!`,
          type: 'reengagement',
          createdAt: new Date().toISOString(),
        },
      ],
      scheduledEmails: [],
      dripCampaigns: [],
      spacedRepetitionItems: [],
      homeworkAssignments: [],
      challenges: [
        {
          id: 'weekly-sessions',
          title: 'Weekly Warrior',
          description: 'Complete 3 sessions this week',
          type: 'weekly',
          target: 3,
          current: 0,
          xpReward: 50,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          category: 'sessions',
        },
        {
          id: 'xp-hunter',
          title: 'XP Hunter',
          description: 'Earn 100 XP this week',
          type: 'weekly',
          target: 100,
          current: 0,
          xpReward: 30,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          category: 'xp',
        },
      ],
      streakFreezes: [],
      notifications: [],
      paymentRecords: [],
      resources: [],
      sessionTemplates: [
        {
          id: 'business-meeting',
          name: 'Business English - Meeting Skills',
          description: 'Practice meeting vocabulary and role-plays',
          defaultDuration: 60,
          defaultScript: 'Today we will practice meeting skills including: opening a meeting, giving opinions, agreeing/disagreeing politely, and closing a meeting.',
          defaultTopics: ['Business English', 'Meetings', 'Professional Communication'],
          category: 'Business',
        },
        {
          id: 'ielts-speaking',
          name: 'IELTS Speaking Practice',
          description: 'IELTS Speaking Parts 1, 2, and 3 practice',
          defaultDuration: 45,
          defaultScript: 'IELTS Speaking practice session covering all three parts with timing and feedback.',
          defaultTopics: ['IELTS', 'Speaking', 'Test Prep'],
          category: 'Exam Prep',
        },
        {
          id: 'conversation-free',
          name: 'Free Conversation',
          description: 'Open conversation practice on current topics',
          defaultDuration: 45,
          defaultScript: 'Free-flowing conversation practice with error correction and vocabulary expansion.',
          defaultTopics: ['Conversation', 'Fluency', 'General English'],
          category: 'General',
        },
      ],
      learnerTags: {},

      // Email Actions
      addEmailTemplate: (template) => set((state) => ({
        emailTemplates: [...state.emailTemplates, { ...template, id: generateId(), createdAt: new Date().toISOString() }]
      })),
      
      updateEmailTemplate: (template) => set((state) => ({
        emailTemplates: state.emailTemplates.map(t => t.id === template.id ? template : t)
      })),
      
      removeEmailTemplate: (id) => set((state) => ({
        emailTemplates: state.emailTemplates.filter(t => t.id !== id)
      })),
      
      scheduleEmail: (email) => set((state) => ({
        scheduledEmails: [...state.scheduledEmails, { ...email, id: generateId(), createdAt: new Date().toISOString(), status: 'pending' }]
      })),
      
      updateScheduledEmail: (email) => set((state) => ({
        scheduledEmails: state.scheduledEmails.map(e => e.id === email.id ? email : e)
      })),
      
      cancelScheduledEmail: (id) => set((state) => ({
        scheduledEmails: state.scheduledEmails.map(e => e.id === id ? { ...e, status: 'cancelled' } : e)
      })),
      
      markEmailSent: (id) => set((state) => ({
        scheduledEmails: state.scheduledEmails.map(e => e.id === id ? { ...e, status: 'sent', sentAt: new Date().toISOString() } : e)
      })),

      // Drip Campaign Actions
      createDripCampaign: (campaign) => set((state) => ({
        dripCampaigns: [...state.dripCampaigns, { ...campaign, id: generateId() }]
      })),
      
      updateDripCampaign: (campaign) => set((state) => ({
        dripCampaigns: state.dripCampaigns.map(c => c.id === campaign.id ? campaign : c)
      })),
      
      pauseDripCampaign: (id) => set((state) => ({
        dripCampaigns: state.dripCampaigns.map(c => c.id === id ? { ...c, status: 'paused' } : c)
      })),

      // Spaced Repetition Actions
      addSpacedRepetitionItem: (item) => set((state) => ({
        spacedRepetitionItems: [...state.spacedRepetitionItems, { ...item, id: generateId() }]
      })),
      
      updateSpacedRepetitionItem: (item) => set((state) => ({
        spacedRepetitionItems: state.spacedRepetitionItems.map(i => i.id === item.id ? item : i)
      })),
      
      markItemReviewed: (id) => set((state) => ({
        spacedRepetitionItems: state.spacedRepetitionItems.map(item => {
          if (item.id !== id) return item;
          const nextIntervalIndex = Math.min(item.currentInterval + 1, item.intervals.length - 1);
          const daysUntilNext = item.intervals[nextIntervalIndex];
          return {
            ...item,
            currentInterval: nextIntervalIndex,
            timesReviewed: item.timesReviewed + 1,
            nextReviewDate: new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000).toISOString(),
            status: nextIntervalIndex >= item.intervals.length - 1 ? 'mastered' : 'active',
          };
        })
      })),

      // Homework Actions
      addHomework: (homework) => set((state) => ({
        homeworkAssignments: [...state.homeworkAssignments, { ...homework, id: generateId() }]
      })),
      
      updateHomework: (homework) => set((state) => ({
        homeworkAssignments: state.homeworkAssignments.map(h => h.id === homework.id ? homework : h)
      })),
      
      submitHomework: (id) => set((state) => ({
        homeworkAssignments: state.homeworkAssignments.map(h => 
          h.id === id ? { ...h, status: 'submitted', submittedAt: new Date().toISOString() } : h
        )
      })),
      
      gradeHomework: (id, grade, feedback) => set((state) => ({
        homeworkAssignments: state.homeworkAssignments.map(h => 
          h.id === id ? { ...h, status: 'reviewed', grade, feedback } : h
        )
      })),

      // Challenge Actions
      addChallenge: (challenge) => set((state) => ({
        challenges: [...state.challenges, { ...challenge, id: generateId() }]
      })),
      
      updateChallengeProgress: (id, progress) => set((state) => ({
        challenges: state.challenges.map(c => {
          if (c.id !== id) return c;
          const newCurrent = Math.min(c.current + progress, c.target);
          return { ...c, current: newCurrent, status: newCurrent >= c.target ? 'completed' : c.status };
        })
      })),
      
      completeChallenge: (id) => set((state) => ({
        challenges: state.challenges.map(c => c.id === id ? { ...c, status: 'completed' } : c)
      })),

      // Streak Freeze Actions
      addStreakFreeze: (learnerId) => set((state) => ({
        streakFreezes: [...state.streakFreezes, {
          id: generateId(),
          learnerId,
          earnedAt: new Date().toISOString(),
          status: 'available',
        }]
      })),
      
      useStreakFreeze: (learnerId) => {
        const state = get();
        const availableFreeze = state.streakFreezes.find(
          f => f.learnerId === learnerId && f.status === 'available'
        );
        if (!availableFreeze) return false;
        set({
          streakFreezes: state.streakFreezes.map(f =>
            f.id === availableFreeze.id ? { ...f, status: 'used', usedAt: new Date().toISOString() } : f
          )
        });
        return true;
      },
      
      getAvailableFreezes: (learnerId) => {
        return get().streakFreezes.filter(f => f.learnerId === learnerId && f.status === 'available').length;
      },

      // Notification Actions
      addNotification: (notification) => set((state) => ({
        notifications: [{
          ...notification,
          id: generateId(),
          createdAt: new Date().toISOString(),
          read: false,
        }, ...state.notifications]
      })),
      
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),
      
      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      getUnreadCount: () => get().notifications.filter(n => !n.read).length,

      // Payment Actions
      addPaymentRecord: (payment) => set((state) => ({
        paymentRecords: [...state.paymentRecords, { ...payment, id: generateId() }]
      })),
      
      updatePaymentRecord: (payment) => set((state) => ({
        paymentRecords: state.paymentRecords.map(p => p.id === payment.id ? payment : p)
      })),
      
      markPaymentPaid: (id) => set((state) => ({
        paymentRecords: state.paymentRecords.map(p => 
          p.id === id ? { ...p, status: 'paid', paidAt: new Date().toISOString() } : p
        )
      })),

      // Resource Actions
      addResource: (resource) => set((state) => ({
        resources: [...state.resources, { ...resource, id: generateId(), uploadedAt: new Date().toISOString() }]
      })),
      
      removeResource: (id) => set((state) => ({
        resources: state.resources.filter(r => r.id !== id)
      })),

      // Session Template Actions
      addSessionTemplate: (template) => set((state) => ({
        sessionTemplates: [...state.sessionTemplates, { ...template, id: generateId() }]
      })),
      
      updateSessionTemplate: (template) => set((state) => ({
        sessionTemplates: state.sessionTemplates.map(t => t.id === template.id ? template : t)
      })),
      
      removeSessionTemplate: (id) => set((state) => ({
        sessionTemplates: state.sessionTemplates.filter(t => t.id !== id)
      })),

      // Tag Actions
      addTagToLearner: (learnerId, tagId) => set((state) => ({
        learnerTags: {
          ...state.learnerTags,
          [learnerId]: [...(state.learnerTags[learnerId] || []), tagId].filter((v, i, a) => a.indexOf(v) === i)
        }
      })),
      
      removeTagFromLearner: (learnerId, tagId) => set((state) => ({
        learnerTags: {
          ...state.learnerTags,
          [learnerId]: (state.learnerTags[learnerId] || []).filter(t => t !== tagId)
        }
      })),
      
      getLearnerTags: (learnerId) => get().learnerTags[learnerId] || [],
    }),
    {
      name: 'automation-storage',
      storage: createJSONStorage(() => idbZustandStorage),
    }
  )
);
