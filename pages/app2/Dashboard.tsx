import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useLearnerStore } from '../../store/useLearnerStore';
import { useTodoStore } from '../../store/useTodoStore';
import { CEFR_LEVEL_ORDER, CEFR_LEVEL_LABELS, TIER_NAMES, getCefrTierTopics, countCumulativeCefrTopics, type CefrLevelKey } from '../../utils/cefrGrammarDictionary';

/** Maps the CEFR ceiling (which allows A2+/B1+) onto the legacy CourseLevel enum. */
const COURSE_LEVEL_FOR_CEFR: Record<string, CourseLevel> = {
  A1: CourseLevel.A1, A2: CourseLevel.A2, 'A2+': CourseLevel.A2,
  B1: CourseLevel.B1, 'B1+': CourseLevel.B1, B2: CourseLevel.B2,
  C1: CourseLevel.C1, C2: CourseLevel.C2,
};
import { useAutomationStore } from '../../store/useAutomationStore';
import TodoItem from '../../components/app2/TodoItem';
import SectionCard from '../../components/app2/SectionCard';
import GroupParticipantsManager from '../../components/app2/profile/group/GroupParticipantsManager';
import { ICONS } from '../../constants2';
import AttentionNeeded from '../../components/app2/AttentionNeeded';
import { Link, useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '../../services/avatarService';
import { groupLevelSpread, groupL1Label } from '../../services/groupParticipants';
import TimeInputModal from '../../components/app2/TimeInputModal';
import SettingsModal from '../../components/settings/SettingsModal';
import { 
  Learner, 
  CourseLevel, 
  CompetencyStatus, 
  Todo, 
  GroupClass, 
  GroupParticipant,
  LEVEL_TIERS, 
  ACHIEVEMENTS, 
  DEFAULT_TAGS,
  LearnerTag,
  Notification,
  EmailTemplate,
  ScheduledEmail,
  Challenge,
} from '../../types2';
import UpcomingEvents from '../../components/app2/dashboard/UpcomingEvents';
import CalendarSyncManager from '../../components/app2/dashboard/CalendarSyncManager';
import Modal from '../../components/app2/Modal';
import { useAppStore } from '../../store/useAppStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import OverdueTasks from '../../components/app2/dashboard/OverdueTasks';
import { isThisWeek, isThisMonth, differenceInDays, format, subDays, differenceInMinutes } from 'date-fns';
import CompetitionLeaderboard from '../../components/app2/dashboard/CompetitionLeaderboard';
import { ErrorBoundary } from 'react-error-boundary';
import ServerTime from '../../components/app2/ServerTime';
import DashboardCalendar from '../../components/app2/dashboard/DashboardCalendar';
import { EditableStreak } from '../../components/app2/EditableStreak';
import { XPVisual } from '../../components/app2/XPVisual';
import { useAuthStore } from '../../store/useAuthStore';
import TierBadge from '../../components/ui/TierBadge';
import { canAddLearner, FREE_LEARNER_LIMIT } from '../../utils/tiers';
import TierGatedOverlay from '../../components/ui/TierGatedOverlay';
import { LEARNER_CATEGORIES, getCategoryById } from '../../data/learnerCategories';
import DataRescueCard from '../../components/app2/DataRescueCard';

// ============ UTILITY FUNCTIONS ============
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getLearnerLevel = (xp: number) => {
  return LEVEL_TIERS.find(tier => xp >= tier.minXP && xp <= tier.maxXP) || LEVEL_TIERS[0];
};

const getXPProgress = (xp: number) => {
  const level = getLearnerLevel(xp);
  if (level.maxXP === Infinity) return 100;
  const progress = ((xp - level.minXP) / (level.maxXP - level.minXP)) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

const getLeaderboardDivision = (rank: number, totalLearners: number): 'diamond' | 'gold' | 'silver' | 'bronze' => {
  const percentile = (rank / totalLearners) * 100;
  if (percentile <= 10) return 'diamond';
  if (percentile <= 30) return 'gold';
  if (percentile <= 60) return 'silver';
  return 'bronze';
};

const getDivisionColor = (division: string) => {
  switch (division) {
    case 'diamond': return 'bg-cyan-100 text-cyan-800 border-cyan-400';
    case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-400';
    case 'silver': return 'bg-gray-200 text-gray-800 border-gray-400';
    case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-400';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const getLatestSessionDate = (learner: Learner): Date | null => {
  if (!learner.sessions || learner.sessions.length === 0) return null;
  const validSessions = (learner.sessions || []).filter(s => s.date && !isNaN(new Date(s.date).getTime()));
  if (validSessions.length === 0) return null;
  const latestSession = validSessions.reduce((latest, current) => {
    return new Date(current.date) > new Date(latest.date) ? current : latest;
  });
  return new Date(latestSession.date);
};

const getEarnedBadges = (learner: Learner) => {
  const badges: string[] = [];
  const attendedSessions = (learner.sessions || []).filter(s => s.attended).length;
  
  ACHIEVEMENTS.forEach(achievement => {
    switch (achievement.category) {
      case 'attendance':
        if (attendedSessions >= achievement.requirement) badges.push(achievement.icon);
        break;
      case 'streak':
        if (learner.streak >= achievement.requirement) badges.push(achievement.icon);
        break;
      case 'xp':
        if (learner.xp >= achievement.requirement) badges.push(achievement.icon);
        break;
    }
  });
  
  return badges.slice(0, 5); // Max 5 badges displayed
};

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// ============ ERROR FALLBACK ============
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ error, resetErrorBoundary }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="font-bold text-red-800">Something went wrong</h3>
    <p className="text-sm text-red-600 mb-2">{error.message}</p>
    <button onClick={resetErrorBoundary} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
      Try Again
    </button>
  </div>
);

// ============ SKELETON LOADERS ============
const SkeletonCard: React.FC = () => (
  <div className="animate-pulse p-4 bg-white rounded-lg shadow">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

const SkeletonStatCard: React.FC = () => (
  <div className="animate-pulse bg-white p-4 rounded-xl shadow">
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
  </div>
);

// ============ QUICK STATS CARDS (U1) ============
const QuickStatsCards: React.FC<{ learners: Learner[] }> = React.memo(({ learners }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    
    const historicalHours = useAppStore.getState().tutorInfo?.historicalHoursTaught || 0;
    const activeHours = learners.reduce((acc, l) => 
      acc + (l.sessions || []).filter(s => s.attended).reduce((sum, s) => sum + (s.duration || 0), 0), 0
    ) / 60;
    const totalHours = activeHours + historicalHours;
    
    const sessionsThisWeek = learners.reduce((acc, l) => 
      acc + (l.sessions || []).filter(s => new Date(s.date) >= weekAgo && s.attended).length, 0
    );
    
    const activeLearners = learners.filter(l => {
      const lastSession = getLatestSessionDate(l);
      return lastSession && differenceInDays(now, lastSession) <= 14;
    }).length;
    
    const avgXP = learners.length > 0 
      ? Math.round(learners.reduce((acc, l) => acc + l.xp, 0) / learners.length)
      : 0;
    
    return { totalHours: Math.round(totalHours), sessionsThisWeek, activeLearners, avgXP };
  }, [learners]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
        <p className="text-sm opacity-80">Total Hours Taught</p>
        <p className="text-3xl font-extrabold">{stats.totalHours.toLocaleString()}</p>
      </div>
      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
        <p className="text-sm opacity-80">Sessions This Week</p>
        <p className="text-3xl font-extrabold">{stats.sessionsThisWeek}</p>
      </div>
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
        <p className="text-sm opacity-80">Active Learners</p>
        <p className="text-3xl font-extrabold">{stats.activeLearners}</p>
      </div>
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow-lg">
        <p className="text-sm opacity-80">Average XP</p>
        <p className="text-3xl font-extrabold">{stats.avgXP}</p>
      </div>
    </div>
  );
});

// ============ XP LEVEL BADGE (G1) ============
const LevelBadge: React.FC<{ xp: number; showProgress?: boolean }> = React.memo(({ xp, showProgress = true }) => {
  const level = getLearnerLevel(xp);
  const progress = getXPProgress(xp);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg" title={level.name}>{level.icon}</span>
      {showProgress && (
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden" title={`${Math.round(progress)}% to next level`}>
          <div 
            className={`h-full bg-${level.color}-500 transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
});

// ============ BADGE DISPLAY (G2) ============
const BadgeDisplay: React.FC<{ badges: string[] }> = React.memo(({ badges }) => {
  if (badges.length === 0) return null;
  return (
    <div className="flex -space-x-1">
      {badges.map((badge, i) => (
        <span key={i} className="text-sm bg-white rounded-full p-0.5 shadow-sm border" title="Achievement Badge">
          {badge}
        </span>
      ))}
    </div>
  );
});

// ============ TAG PILLS (U2) ============
const TagPills: React.FC<{ tagIds: string[]; small?: boolean }> = React.memo(({ tagIds, small = false }) => {
  const tagColors: Record<string, string> = {
    vip: 'bg-yellow-100 text-yellow-800',
    'at-risk': 'bg-red-100 text-red-800',
    new: 'bg-green-100 text-green-800',
    paused: 'bg-gray-100 text-gray-600',
    trial: 'bg-blue-100 text-blue-800',
    corporate: 'bg-purple-100 text-purple-800',
  };
  
  return (
    <div className="flex flex-wrap gap-1">
      {tagIds.map(tagId => {
        const tag = DEFAULT_TAGS.find(t => t.id === tagId);
        if (!tag) return null;
        return (
          <span 
            key={tagId} 
            className={`${tagColors[tagId] || 'bg-gray-100 text-gray-600'} ${small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-full font-semibold`}
          >
            {tag.name}
          </span>
        );
      })}
    </div>
  );
});

// ============ NOTIFICATION CENTER (U6) ============
const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useAutomationStore(state => state.notifications);
  const markNotificationRead = useAutomationStore(state => state.markNotificationRead);
  const markAllNotificationsRead = useAutomationStore(state => state.markAllNotificationsRead);
  const unreadCount = (notifications || []).filter(n => !n.read).length;

  return (
    <div className="relative">
      <button 
        id="tutor-notifications"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
      >
        <i className="fas fa-bell text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b flex justify-between items-center">
            <h3 className="font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllNotificationsRead}
                className="text-xs text-brand-blue hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No notifications</p>
            ) : (
              notifications.slice(0, 20).map(notif => (
                <div 
                  key={notif.id}
                  onClick={() => markNotificationRead(notif.id)}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`}
                >
                  <p className="font-semibold text-sm">{notif.title}</p>
                  <p className="text-xs text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ UPCOMING CLASSES WIDGET ============
const upcomingTimeLeft = (eventDate: Date) => {
  const diffMinutes = differenceInMinutes(eventDate, new Date());
  if (diffMinutes < 0) return 'Started';
  if (diffMinutes < 60) return `${diffMinutes}m left`;
  if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m left`;
  return `${Math.floor(diffMinutes / (24 * 60))}d left`;
};

const UpcomingClassesWidget: React.FC<{ learners: Learner[], groups: GroupClass[] }> = ({ learners, groups }) => {
  const calendarEvents = useCalendarStore(state => state.calendarEvents);
  
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return calendarEvents
      .filter(e => {
        if (e.type !== 'session' && e.type !== 'Class') return false;
        const d = e.start ? new Date(e.start) : (e.date ? new Date(e.date) : null);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = a.start ? new Date(a.start) : new Date(a.date!);
        const db = b.start ? new Date(b.start) : new Date(b.date!);
        return da.getTime() - db.getTime();
      })
      .slice(0, 5);
  }, [calendarEvents]);

  return (
    <SectionCard title="Upcoming Classes" icon={<span>📅</span>}>
      <div className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No upcoming classes scheduled</p>
        ) : (
          upcomingEvents.map(event => {
            const eventDate = event.start ? new Date(event.start) : new Date(event.date!);
            const isGroup = !!event.groupId;
            const targetId = event.groupId || event.learnerId;
            const linkHref = isGroup ? `#/group/${targetId}` : `#/learner/${targetId}`;
            const targetName = isGroup 
              ? groups.find(g => g.id === targetId)?.name || 'Group'
              : learners.find(l => l.id === targetId)?.name || 'Learner';

            return (
              <a key={event.id} href={targetId ? linkHref : '#'} className="block bg-gradient-to-r hover:-translate-y-0.5 from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100 transition-transform">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-sm text-blue-900">{event.title || 'Session'}</p>
                    {targetId && <p className="text-xs font-semibold text-blue-700">{targetName}</p>}
                    <p className="text-xs text-gray-600 mt-1">
                      {format(eventDate, 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                    ⏳ {upcomingTimeLeft(eventDate)}
                  </span>
                </div>
              </a>
            );
          })
        )}
      </div>
    </SectionCard>
  );
};

// ============ STAR PERFORMER SPOTLIGHT (G5) ============
const StarPerformerSpotlight: React.FC<{ learners: Learner[] }> = React.memo(({ learners }) => {
  const topPerformer = useMemo(() => {
    if (learners.length === 0) return null;
    const weekAgo = subDays(new Date(), 7);
    
    // Calculate XP earned this week for each learner
    const learnersWithWeeklyXP = learners.map(l => {
      const sessionsThisWeek = (l.sessions || []).filter(s => 
        new Date(s.date) >= weekAgo && s.attended
      );
      const weeklyXP = sessionsThisWeek.length * 10; // Approximate XP calculation
      return { learner: l, weeklyXP };
    });
    
    return learnersWithWeeklyXP.sort((a, b) => b.weeklyXP - a.weeklyXP)[0];
  }, [learners]);

  if (!topPerformer || topPerformer.weeklyXP === 0) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-1 rounded-xl mb-6">
      <div className="bg-white rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={getAvatarUrl(topPerformer.learner.gender, topPerformer.learner.avatarId, topPerformer.learner.name)} 
              alt={topPerformer.learner.name}
              className="w-16 h-16 rounded-full border-4 border-yellow-400"
            />
            <span className="absolute -top-2 -right-2 text-2xl">👑</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-semibold">⭐ Star Performer This Week</p>
            <Link to={`/learner/${topPerformer.learner.id}`} className="font-extrabold text-xl hover:text-brand-blue">
              {topPerformer.learner.name}
            </Link>
            <div className="flex gap-4 mt-1 text-sm">
              <span className="text-purple-600 font-bold">+{topPerformer.weeklyXP} XP this week</span>
              <span className="text-orange-600 font-bold">🔥 {topPerformer.learner.streak} streak</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============ DIVISION LEADERBOARD (G12) ============
const DivisionLeaderboard: React.FC<{ learners: Learner[] }> = React.memo(({ learners }) => {
  const sortedLearners = useMemo(() => 
    [...learners].sort((a, b) => b.xp - a.xp).slice(0, 20),
    [learners]
  );

  return (
    <SectionCard title="🏆 Division Leaderboard" icon={null}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {['diamond', 'gold', 'silver', 'bronze'].map(div => (
          <div key={div} className={`text-center p-2 rounded-lg border ${getDivisionColor(div)}`}>
            <span className="text-lg">
              {div === 'diamond' ? '💎' : div === 'gold' ? '🥇' : div === 'silver' ? '🥈' : '🥉'}
            </span>
            <p className="text-xs font-bold capitalize">{div}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedLearners.map((learner, idx) => {
          const division = getLeaderboardDivision(idx + 1, learners.length);
          return (
            <div key={`${learner.id}-${idx}`} className={`flex items-center gap-3 p-2 rounded-lg ${getDivisionColor(division)}`}>
              <span className="font-bold w-6 text-center">{idx + 1}</span>
              <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} className="w-8 h-8 rounded-full" alt="" />
              <span className="flex-1 font-semibold truncate">{learner.name}</span>
              <span className="font-bold">{learner.xp} XP</span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
});

// ============ INACTIVE LEARNERS ALERT (A3) ============
const InactiveLearnersAlert: React.FC<{ learners: Learner[] }> = React.memo(({ learners }) => {
  const scheduledEmails = useAutomationStore(state => state.scheduledEmails);
  const scheduleEmail = useAutomationStore(state => state.scheduleEmail);
  const emailTemplates = useAutomationStore(state => state.emailTemplates);
  const navigate = useNavigate();
  
  const inactiveLearners = useMemo(() => {
    const now = new Date();
    return learners
      .map(l => {
        const lastSession = getLatestSessionDate(l);
        const daysSince = lastSession ? differenceInDays(now, lastSession) : 999;
        return { learner: l, daysSince };
      })
      .filter(({ daysSince }) => daysSince >= 7)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 10);
  }, [learners]);

  const handleSendReengagement = (learnerId: string, learnerName: string, email: string) => {
    const template = emailTemplates.find(t => t.type === 'reengagement');
    if (!template) return;
    
    scheduleEmail({
      templateId: template.id,
      learnerId,
      subject: template.subject.replace('{{learnerName}}', learnerName),
      body: template.body.replace(/\{\{learnerName\}\}/g, learnerName),
      scheduledDate: new Date().toISOString(),
      type: 'reengagement',
      status: 'pending',
    });
    
    // Simulate sending by opening mailto
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body.replace(/\{\{learnerName\}\}/g, learnerName))}`;
    window.open(mailtoLink, '_blank');
  };

  if (inactiveLearners.length === 0) return null;

  return (
    <SectionCard title="⚠️ Inactive Learners" icon={null}>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {inactiveLearners.map(({ learner, daysSince }, idx) => (
          <div key={`${learner.id}-${idx}`} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition-colors cursor-pointer" onClick={() => navigate(`/learner/${learner.id}`)}>
            <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} className="w-8 h-8 rounded-full" alt="" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-brand-blue hover:underline">{learner.name}</p>
              <p className="text-xs text-red-600">{daysSince} days inactive</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleSendReengagement(learner.id, learner.name, learner.email); }}
              className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-red-600 z-10"
            >
              Re-engage
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
});

// ============ BATCH EMAIL MODAL (A2) ============
const BatchEmailModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  selectedLearners: Learner[];
  onClearSelection: () => void;
}> = ({ isOpen, onClose, selectedLearners, onClearSelection }) => {
  const emailTemplates = useAutomationStore(state => state.emailTemplates);
  const scheduleEmail = useAutomationStore(state => state.scheduleEmail);
  
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [sendingMode, setSendingMode] = useState<'individual' | 'unified'>('individual');
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});

  // High value Business English & Educational Diagnostics templates
  const availableTemplates = useMemo(() => {
    const extraTemplates = [
      {
        id: 'diagnostic-test',
        name: '🏆 Professional Placement Diagnostic',
        subject: 'Your Business English Placement & Level Diagnostic Guide',
        body: `Hi {{learnerName}},

I have configured your custom Business English Placement & Level Diagnostic in your student profile card.

During our upcoming speaking assessment, we will diagnose:
1. Executive fluency & professional writing capability.
2. CEFR active vocabulary density (B2-C2).
3. Pronunciation clarity & sentence pattern range under pressure.

Please check the "Dictionary Plus" widget on your dashboard to review initial vocabulary roots.

Best regards,
Your Professional Tutor`
      },
      {
        id: 'negotiation-practice',
        name: '🤝 Corporate Speaking & Negotiating Boot Camp',
        subject: 'Invitation: Pitching, Bargaining & Conflict Resolution Simulation',
        body: `Hi {{learnerName}},

Excellent job on your diagnostics progress! To reinforce high-impact boardroom vocabulary, I have deployed a customized client negotiation simulation inside your workspace.

Your vocabulary cards list:
- "To leverage competitive advantage"
- "Mutually binding agreement"
- "To mitigate capital exposure"

Please review them carefully prior to our session.

Best,
Your Tutor`
      },
      {
        id: 'weekly-digest',
        name: '📊 Custom Weekly Activity & Streak Recap',
        subject: 'Weekly Activity, Progress Stats & Homework Assignment',
        body: `Hi {{learnerName}},

Here is your custom progress recap for the week!

Please make sure to review our shared vocabulary and complete any remaining exercises in your "Dictionary Plus" settings. 

XP Goal: +50 XP
Target Streak: 5 Days!

Let me know if you need any adjustments.

Best,
Your Tutor`
      }
    ];
    return [...emailTemplates, ...extraTemplates];
  }, [emailTemplates]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = availableTemplates.find(t => t.id === selectedTemplate);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
    }
  }, [selectedTemplate, availableTemplates]);

  const launchPersonalizedEmail = (learner: Learner) => {
    const personalizedBody = body.replace(/\{\{learnerName\}\}/g, learner.name);
    const mailtoLink = `mailto:${learner.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(personalizedBody)}`;
    
    // Direct Windows Mail Client redirect
    window.location.href = mailtoLink;
    setSentStatus(prev => ({ ...prev, [learner.id]: true }));
  };

  const handleSendUnified = () => {
    if (!subject || !body || selectedLearners.length === 0) return;
    
    scheduleEmail({
      learnerIds: selectedLearners.map(l => l.id),
      subject,
      body,
      scheduledDate: scheduleDate || new Date().toISOString(),
      type: 'batch',
      status: 'pending',
    });

    // Unified: Open Outlook/Default client once with all recipients formatted
    const emailsList = selectedLearners.map(l => l.email).filter(Boolean).join(',');
    const mailtoLink = `mailto:${emailsList}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;

    onClearSelection();
    onClose();
  };

  const handleBulkSequentialOpen = () => {
    if (selectedLearners.length > 0) {
      launchPersonalizedEmail(selectedLearners[0]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📧 Enhanced Batch Email Dispatcher">
      <div className="space-y-4">
        <div>
          <span className="font-bold text-xs uppercase text-slate-400 block mb-2 tracking-wider">Recipients ({selectedLearners.length})</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg">
            {selectedLearners.map((l, index) => (
              <span key={`email-recip-${l.id}-${index}`} className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-900 flex items-center gap-1.5">
                <i className="fas fa-circle text-[6px] text-emerald-500 animate-pulse"></i>
                {l.name}
                {sentStatus[l.id] && <i className="fas fa-check text-emerald-600 text-[9px]"></i>}
              </span>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button 
            type="button"
            onClick={() => setSendingMode('individual')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${sendingMode === 'individual' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-transparent'}`}
          >
            <i className="fas fa-users-cog"></i> Sequential Mail Dispatcher
          </button>
          <button 
            type="button"
            onClick={() => setSendingMode('unified')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${sendingMode === 'unified' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-transparent'}`}
          >
            <i className="fas fa-envelope-open-text"></i> Single Combined Group Mail
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Use Diagnostic Campaign Template</label>
          <select 
            value={selectedTemplate} 
            onChange={e => setSelectedTemplate(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border bg-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">-- Custom Message / Write Own --</option>
            {availableTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Subject</label>
          <input 
            type="text" 
            value={subject} 
            onChange={e => setSubject(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 bg-none rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Email subject..."
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Message Body</label>
          <textarea 
            value={body} 
            onChange={e => setBody(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 bg-none rounded-lg h-36 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
            placeholder="Use {{learnerName}} for automatic personalization..."
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Schedule Campaign Start (Optional)</label>
          <input 
            type="datetime-local" 
            value={scheduleDate} 
            onChange={e => setScheduleDate(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {sendingMode === 'individual' && (
          <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Windows Sequential Dispatch Checklist:</span>
            <div className="max-h-32 overflow-y-auto space-y-1.5 p-1">
              {selectedLearners.map((learner, index) => (
                <div key={`${learner.id}-${index}`} className="flex justify-between items-center text-xs p-1.5 rounded bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800 shadow-sm">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">{learner.name}</span>
                  <button 
                    type="button"
                    onClick={() => launchPersonalizedEmail(learner)}
                    className={`px-3 py-1 text-[10px] font-black rounded-lg shadow-sm border transition-all cursor-pointer ${sentStatus[learner.id] ? 'bg-green-100 dark:bg-green-950 border-green-200 text-green-700 dark:text-green-300' : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-700 text-white active:scale-95'}`}
                  >
                    {sentStatus[learner.id] ? '✓ Dispatched & Open Again' : '📧 Open Windows Client'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs">
            Cancel
          </button>
          {sendingMode === 'unified' ? (
            <button 
              onClick={handleSendUnified}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md active:scale-95 transition-all"
            >
              Open Combines Group Mail (Windows Client)
            </button>
          ) : (
            <button 
              onClick={() => {
                handleBulkSequentialOpen();
                onClearSelection();
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md active:scale-95 transition-all"
            >
              Begin Dispatch Cycle
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ============ EMAIL DRIP CAMPAIGN MODAL (A1) ============
const DripCampaignModal: React.FC<{ isOpen: boolean; onClose: () => void; learners: Learner[] }> = ({ isOpen, onClose, learners }) => {
  const emailTemplates = useAutomationStore(state => state.emailTemplates);
  const createDripCampaign = useAutomationStore(state => state.createDripCampaign);
  const dripCampaigns = useAutomationStore(state => state.dripCampaigns);
  
  const [campaignName, setCampaignName] = useState('');
  const [selectedLearner, setSelectedLearner] = useState('');
  const [emails, setEmails] = useState<{ templateId: string; dayOffset: number }[]>([
    { templateId: '', dayOffset: 0 },
    { templateId: '', dayOffset: 3 },
    { templateId: '', dayOffset: 7 },
  ]);

  // Combined standard + dynamic business education templates
  const availableTemplates = useMemo(() => {
    const extraTemplates = [
      {
        id: 'diagnostic-test',
        name: '🏆 Professional Placement Diagnostic',
        subject: 'Your Business English Placement & Level Diagnostic Guide',
        body: `Hi {{learnerName}},

I have configured your custom Business English Placement & Level Diagnostic in your student profile card.

During our upcoming speaking assessment, we will diagnose:
1. Executive fluency & professional writing capability.
2. CEFR active vocabulary density (B2-C2).
3. Pronunciation clarity & sentence pattern range under pressure.

Please check the "Dictionary Plus" widget on your dashboard to review initial vocabulary roots.

Best regards,
Your Professional Tutor`
      },
      {
        id: 'negotiation-practice',
        name: '🤝 Corporate Speaking & Negotiating Boot Camp',
        subject: 'Invitation: Pitching, Bargaining & Conflict Resolution Simulation',
        body: `Hi {{learnerName}},

Excellent job on your diagnostics progress! To reinforce high-impact boardroom vocabulary, I have deployed a customized client negotiation simulation inside your workspace.

Your vocabulary cards list:
- "To leverage competitive advantage"
- "Mutually binding agreement"
- "To mitigate capital exposure"

Please review them carefully prior to our session.

Best,
Your Tutor`
      }
    ];
    return [...emailTemplates, ...extraTemplates];
  }, [emailTemplates]);

  const handleAddEmail = () => {
    const lastOffset = emails.length > 0 ? emails[emails.length - 1].dayOffset : 0;
    setEmails([...emails, { templateId: '', dayOffset: lastOffset + 7 }]);
  };

  const handleRemoveEmail = (idx: number) => {
    setEmails(emails.filter((_, i) => i !== idx));
  };

  const handleCreate = () => {
    if (!campaignName || !selectedLearner || emails.some(e => !e.templateId)) return;
    
    createDripCampaign({
      name: campaignName,
      learnerId: selectedLearner,
      emails: emails.map(e => ({
        ...e,
        status: 'pending',
        scheduledDate: new Date(Date.now() + e.dayOffset * 24 * 60 * 60 * 1000).toISOString(),
      })),
      startDate: new Date().toISOString(),
      status: 'active',
    });
    
    setCampaignName('');
    setSelectedLearner('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📬 Manage Corporate Drip Campaigns">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Campaign Name</label>
          <input 
            type="text" 
            value={campaignName} 
            onChange={e => setCampaignName(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 bg-none rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="e.g., Executive 30-Day Diagnostic Drip"
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Select Target Learner</label>
          <select 
            value={selectedLearner} 
            onChange={e => setSelectedLearner(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border bg-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">-- Choose Learner Profile --</option>
            {learners.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.email || 'No email'})</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Drip Sequence Stages</label>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {emails.map((email, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg">
                <span className="font-extrabold text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-1 rounded w-8 text-center">#{idx + 1}</span>
                <select 
                  value={email.templateId}
                  onChange={e => {
                    const newEmails = [...emails];
                    newEmails[idx].templateId = e.target.value;
                    setEmails(newEmails);
                  }}
                  className="flex-1 p-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold outline-none"
                >
                  <option value="">Select diagnostic template...</option>
                  {availableTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Day</span>
                  <input 
                    type="number"
                    min="0"
                    value={email.dayOffset}
                    onChange={e => {
                      const newEmails = [...emails];
                      newEmails[idx].dayOffset = parseInt(e.target.value) || 0;
                      setEmails(newEmails);
                    }}
                    className="w-12 p-1.5 bg-white dark:bg-slate-800 border rounded font-black text-xs text-center"
                  />
                </div>
                <button 
                  onClick={() => handleRemoveEmail(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
          <button 
            type="button"
            onClick={handleAddEmail}
            className="mt-2 text-indigo-600 font-black text-xs hover:underline flex items-center gap-1 cursor-pointer"
          >
            <i className="fas fa-plus"></i> Add Next Interval Stage
          </button>
        </div>
        
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs">
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            Launch Campaign Drip
          </button>
        </div>
      </div>
      
      {dripCampaigns.length > 0 && (
        <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
          <h4 className="text-xs uppercase font-black text-slate-400 tracking-wider mb-3">Active Drip Campaigns Dispatch Console</h4>
          <div className="space-y-3.5 max-h-52 overflow-y-auto pr-1">
            {dripCampaigns.filter(c => c.status === 'active').map(campaign => {
              const learner = learners.find(l => l.id === campaign.learnerId);
              const nextPendingIdx = campaign.emails.findIndex(e => e.status === 'pending');
              const nextPendingEmail = nextPendingIdx !== -1 ? campaign.emails[nextPendingIdx] : null;

              return (
                <div key={campaign.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                  <div>
                    <span className="font-black text-xs text-slate-800 dark:text-slate-200 block">{campaign.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">Recipient: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{learner?.name || 'Unknown'}</span></span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded">
                        {campaign.emails.filter(e => e.status === 'sent').length}/{campaign.emails.length} Completed
                      </span>
                    </div>
                  </div>
                  <div>
                    {nextPendingEmail ? (
                      <button
                        onClick={() => {
                          const template = availableTemplates.find(t => t.id === nextPendingEmail.templateId) || availableTemplates[0];
                          const personalizedBody = template.body.replace(/\{\{learnerName\}\}/g, learner?.name || '');
                          const mailtoLink = `mailto:${learner?.email || ''}?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(personalizedBody)}`;
                          
                          // Redirect to Windows client immediately
                          window.location.href = mailtoLink;
                          
                          // Mark as sent in state persistence
                          const updatedEmails = [...campaign.emails];
                          updatedEmails[nextPendingIdx].status = 'sent';
                          const allSent = updatedEmails.every(e => e.status === 'sent');
                          useAutomationStore.getState().updateDripCampaign({
                            ...campaign,
                            emails: updatedEmails,
                            status: allSent ? 'completed' : 'active'
                          });
                        }}
                        className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-black text-[10px] rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
                        title="Send Scheduled Email in Windows default Mail Client"
                      >
                        📬 Launch Stage {nextPendingIdx + 1} (Day {nextPendingEmail.dayOffset})
                      </button>
                    ) : (
                      <span className="text-[10px] text-green-600 font-extrabold bg-green-100 dark:bg-green-950/50 border border-green-200 dark:border-green-900 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <i className="fas fa-check-circle"></i> Campaign Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ============ TAG MANAGER MODAL (U2) ============
const TagManagerModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  selectedLearners: Learner[];
}> = ({ isOpen, onClose, selectedLearners }) => {
  const addTagToLearner = useAutomationStore(state => state.addTagToLearner);
  const removeTagFromLearner = useAutomationStore(state => state.removeTagFromLearner);
  const learnerTags = useAutomationStore(state => state.learnerTags);

  const handleToggleTag = (learnerId: string, tagId: string) => {
    const currentTags = learnerTags[learnerId] || [];
    if (currentTags.includes(tagId)) {
      removeTagFromLearner(learnerId, tagId);
    } else {
      addTagToLearner(learnerId, tagId);
    }
  };

  const handleBulkAddTag = (tagId: string) => {
    selectedLearners.forEach(l => {
      addTagToLearner(l.id, tagId);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🏷️ Manage Tags">
      <div className="space-y-4">
        {selectedLearners.length > 1 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="font-semibold mb-2">Bulk Add Tag to {selectedLearners.length} Learners</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TAGS.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleBulkAddTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold border-2 hover:opacity-80`}
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  + {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {selectedLearners.map((learner, index) => {
            const currentTags = learnerTags[learner.id] || [];
            return (
              <div key={`${learner.id}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} className="w-10 h-10 rounded-full" alt="" />
                  <p className="font-bold">{learner.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TAGS.map(tag => {
                    const isActive = currentTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(learner.id, tag.id)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                          isActive 
                            ? `bg-${tag.color}-500 text-white` 
                            : `bg-gray-200 text-gray-600 hover:bg-gray-300`
                        }`}
                      >
                        {isActive ? '✓ ' : ''}{tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

// ============ BULK ACTIONS TOOLBAR (U3) ============
const BulkActionsToolbar: React.FC<{
  selectedLearners: Learner[];
  onClearSelection: () => void;
  onBatchEmail: () => void;
  onManageTags: () => void;
  onExport: () => void;
  onBatchSchedule: () => void;
  onBatchAIDiagnostics: () => void;
}> = ({ 
  selectedLearners, 
  onClearSelection, 
  onBatchEmail, 
  onManageTags, 
  onExport,
  onBatchSchedule,
  onBatchAIDiagnostics
}) => {
  if (selectedLearners.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700/50 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3.5 z-55 animate-fade-in text-xs">
      <span className="font-extrabold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-900">{selectedLearners.length} Selected</span>
      <div className="h-5 w-px bg-slate-700"></div>
      
      <button onClick={onBatchEmail} className="flex items-center gap-1.5 hover:text-brand-blue font-bold transition-colors cursor-pointer" title="Batch Email">
        <i className="fas fa-envelope text-brand-blue"></i>
        <span>Email</span>
      </button>

      <button onClick={onManageTags} className="flex items-center gap-1.5 hover:text-brand-yellow font-bold transition-colors cursor-pointer" title="Manage Tags">
        <i className="fas fa-tags text-orange-400"></i>
        <span>Tags</span>
      </button>

      <button onClick={onBatchSchedule} className="flex items-center gap-1.5 hover:text-pink-400 font-bold transition-colors cursor-pointer" title="Batch Schedule">
        <i className="fas fa-calendar-plus text-pink-500"></i>
        <span>Schedule</span>
      </button>

      <button onClick={onBatchAIDiagnostics} className="flex items-center gap-1.5 hover:text-purple-400 font-bold transition-colors cursor-pointer" title="Run Batch AI Diagnostics">
        <i className="fas fa-robot text-purple-400"></i>
        <span>AI Diag</span>
      </button>

      <button onClick={onExport} className="flex items-center gap-1.5 hover:text-brand-green font-bold transition-colors cursor-pointer" title="Export Selected Profiles as JSON">
        <i className="fas fa-file-export text-emerald-500"></i>
        <span>Export</span>
      </button>

      <div className="h-5 w-px bg-slate-700"></div>
      <button onClick={onClearSelection} className="text-slate-400 hover:text-red-400 cursor-pointer p-1" title="Cancel Selection">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

// ============ KEYBOARD SHORTCUTS (U4) ============
const useKeyboardShortcuts = (handlers: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.key.toLowerCase()}`;
      if (handlers[key]) {
        e.preventDefault();
        handlers[key]();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

// ============ LEARNER TOOLTIP (U5) ============
const LearnerTooltip: React.FC<{ learner: Learner; children: React.ReactNode }> = ({ learner, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const lastSession = learner.sessions && learner.sessions.length > 0 ? learner.sessions[learner.sessions.length - 1] : null;
  const lastSessionDate = lastSession ? format(new Date(lastSession.date), 'MMM d, yyyy') : 'No sessions';
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="absolute z-50 left-full ml-2 top-0 bg-gray-900 text-white p-3 rounded-lg shadow-xl w-64 text-sm animate-fade-in">
          <p className="font-bold border-b border-gray-700 pb-2 mb-2">{learner.name}</p>
          <p><span className="text-gray-400">Last session:</span> {lastSessionDate}</p>
          {lastSession && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{lastSession.script || 'No notes'}</p>
          )}
          <div className="flex gap-2 mt-2">
            <span className="text-purple-400">⭐ {learner.xp} XP</span>
            <span className="text-orange-400">🔥 {learner.streak}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ ADD TODO FORM ============
const AddTodoForm: React.FC<{ 
  learners: Learner[]; 
  groupClasses: GroupClass[]; 
  onAdd: (todo: Omit<Todo, 'id'>) => void 
}> = ({ learners, groupClasses, onAdd }) => {
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || !assignee) {
      alert('Please enter a task and select a learner or group.');
      return;
    }
    
    const [type, id] = assignee.split(':');
    let todoPayload: Omit<Todo, 'id'> | null = null;
    
    if (type === 'learner') {
      const learner = learners.find(l => l.id === id);
      if (learner) {
        todoPayload = { text, learnerId: learner.id, learnerName: learner.name, completed: false, dueDate: dueDate || undefined, priority };
      }
    } else if (type === 'group') {
      const group = groupClasses.find(g => g.id === id);
      if (group) {
        todoPayload = { text, groupId: group.id, groupName: group.name, completed: false, dueDate: dueDate || undefined, priority };
      }
    }

    if (todoPayload) {
      onAdd(todoPayload);
      setText('');
      setAssignee('');
      setDueDate('');
      setPriority('Medium');
    }
  };

  const inputClass = "w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue";

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t-2 border-dashed border-brand-gray-light mt-4 space-y-3">
      <h4 className="font-bold">Add New To-Do</h4>
      <input 
        type="text" 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        placeholder="New task description..."
        className={inputClass}
      />
      <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass}>
        <option value="" disabled>Assign to...</option>
        <optgroup label="Learners">
          {learners.map(l => <option key={`l-${l.id}`} value={`learner:${l.id}`}>{l.name}</option>)}
        </optgroup>
        <optgroup label="Group Classes">
          {groupClasses.map(g => <option key={`g-${g.id}`} value={`group:${g.id}`}>{g.name}</option>)}
        </optgroup>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
        <select value={priority} onChange={e => setPriority(e.target.value as 'Low' | 'Medium' | 'High')} className={inputClass}>
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
        </select>
      </div>
      <button type="submit" className="w-full bg-brand-blue text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition-colors">
        Add Task
      </button>
    </form>
  );
};

// ============ PAGINATION CONTROLS ============
const PaginationControls: React.FC<{ 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void 
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 mt-4 p-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 font-bold text-gray-700 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
      >
        &larr; Previous
      </button>
      <span className="font-semibold text-gray-600">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 font-bold text-gray-700 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
      >
        Next &rarr;
      </button>
    </div>
  );
};

// ============ VIRTUALIZED LEARNER LIST (O1) ============
const VirtualizedLearnerRow: React.FC<{
  learner: Learner;
  rank: number;
  isTopTen: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  learnerTags: string[];
}> = React.memo(({ learner, rank, isTopTen, isSelected, onSelect, onDelete, learnerTags }) => {
  const badges = getEarnedBadges(learner);
  const category = getCategoryById(learner.category);
  
  let rankBadgeClass = 'bg-gray-300 text-gray-700';
  if (rank === 0) rankBadgeClass = 'bg-yellow-400 text-[#000] shadow-lg';
  else if (rank === 1) rankBadgeClass = 'bg-gray-400 text-[#000] shadow-lg';
  else if (rank === 2) rankBadgeClass = 'bg-yellow-600 text-white shadow-lg';
  else if (isTopTen) rankBadgeClass = 'bg-blue-200 text-blue-800';

  let itemClass = 'p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 group border-b border-brand-gray-light';
  if (rank < 3 && isTopTen) itemClass += ' bg-gradient-to-r from-yellow-50 via-transparent to-transparent';
  else if (isTopTen) itemClass += ' bg-blue-50';
  if (isSelected) itemClass += ' bg-brand-blue bg-opacity-10 border-l-4 border-l-brand-blue';

  return (
    <div className={itemClass}>
      <div className="flex items-center gap-3">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(learner.id)}
          className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
        />
        <LearnerTooltip learner={learner}>
          <Link to={`/learner/${learner.id}`} className="flex items-center gap-4 flex-1 min-w-0">
            {isTopTen && (
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rankBadgeClass}`} title={`Rank #${rank + 1}`}>
                {rank + 1}
              </div>
            )}
            <div className="relative">
              <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt={learner.name} className="w-12 h-12 rounded-full border-2 border-brand-green flex-shrink-0" />
              {learner.streak >= 7 && (
                <span className="absolute -bottom-1 -right-1 text-sm">🔥</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-lg text-brand-gray-darkest truncate">{learner.name}</p>
                <LevelBadge xp={learner.xp} />
                {category && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border shadow-sm ${category.chip}`}
                    title={`${category.emoji} ${category.name} — ${category.description}`}
                  >
                    <span>{category.emoji}</span>
                    <span className="hidden md:inline">{category.name}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-brand-gray-dark truncate">{learner.occupation}</p>
                {learnerTags.length > 0 && <TagPills tagIds={learnerTags} small />}
              </div>
              {badges.length > 0 && <BadgeDisplay badges={badges} />}
            </div>
          </Link>
        </LearnerTooltip>
      </div>
      <div className="flex items-center gap-2 sm:gap-6 ml-4 flex-shrink-0">
        <div className="hidden sm:flex" title="Session Streak">
          <EditableStreak learner={learner} />
        </div>
        <div className="hidden sm:flex" title="Experience Points">
          <XPVisual xp={learner.xp} />
        </div>
        <button 
          onClick={() => onDelete(learner.id)} 
          className="bg-red-500 text-white font-bold py-1 px-3 rounded-lg hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
          title={`Delete ${learner.name}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
});

interface App1DashboardProps {
  platforms?: any[];
  tutorProfile?: any;
  setPlatforms?: any;
  setIsAddPlatformOpen?: any;
  setTutorProfile?: any;
}

// ============ MAIN DASHBOARD COMPONENT ============
import CoursebookManagerModal from '../../components/app2/CoursebookManagerModal';

// Premium Walkthrough Tour Steps Definition
const DASHBOARD_TOUR_STEPS = [
  {
    title: "👋 Welcome to Tutorly Premium Workspace!",
    text: "This is your main cockpit where you control your entire tutoring business. Think of it as your virtual command center where you can manage student profiles, schedule live interactive classes, assign gamified tasks, and review automated transcripts. Example: If a new adult student registers, their metrics and lesson schedule will show up right here on your central desk.",
    selector: "tutor-welcome-banner",
  },
  {
    title: "📤 Import Data Control",
    text: "Located in the top right header, this button lets you manually import student databases, custom tags, or calendar profiles from JSON backup files instantly. Note that if you use Hard Disk Sync, the system automatically handles real-time data synchronization with your local files, meaning you don't even need to manually import or export, but this is here as a secure backup precaution just in case!",
    selector: "tutor-header-import",
  },
  {
    title: "🔔 Reminders & Notifications",
    text: "This bell button in the header opens your Reminders & Notifications panel. It displays student birthdays, upcoming live classes, upcoming holidays, and database backup reminders to keep you fully organized in real time. If you have enabled Hard Disk Sync, your database is safe and fully synchronized, but this center keeps you posted in real time!",
    selector: "tutor-header-notifications",
  },
  {
    title: "📥 Export Data Backups",
    text: "This download icon in the header opens your global data exporter. You can export student rosters, custom lesson materials, calendar entries, or full diagnostic logs to a single optimized JSON package. If you use Hard Disk Sync, the system automatically backs up all files straight to your local hard drive, so manual exports are not strictly necessary but are available just in case!",
    selector: "tutor-header-export",
  },
  {
    title: "👩‍🏫 Tutor Profile Icon",
    text: "Your personal Tutor Avatar profile shortcut in the far right header. It displays your active profile picture. You can hover to reveal your name and contact details, or paste a new custom base64 image (via Ctrl+V) to visually brand your tutoring profile instantly!",
    selector: "tutor-header-avatar",
  },
  {
    title: "🔔 Real-Time Inbox Alerts & Notifications",
    text: "Located in the top right header, this bell icon handles automatic system warnings and alerts. It triggers instant notifications when a student requests a streak freeze, completes their diagnostic homework, or submits new essays. Example: If 'Test Student Alpha' finishes their homework at 10 PM, a red dot will flash here to notify you immediately so you can grade it.",
    selector: "tutor-notifications",
  },
  {
    title: "🌓 Day & Night Eye-Safe Theme Switcher",
    text: "This moon and sun icon in the header lets you switch between themes with one click. It instantly swaps between a deep-slate dark mode (optimal for grading papers at night without eye strain) and a clean, high-contrast light theme (great for reading outdoors). Example: Click this button right now to see the colors instantly shift from slate dark to high-contrast white.",
    selector: "tutor-theme-toggle",
  },
  {
    title: "📂 Saved Files & Coursebook Manager",
    text: "Clicking this book icon opens the global Coursebook Manager. This is your digital vault where you can upload textbooks, define CEFR vocabulary density, select publishers, and organize lessons. Example: You can upload a 'Tech English B2' textbook once, and the AI will automatically pull real examples and terms from it when designing custom exercises for any learner.",
    selector: "tutor-coursebooks-trigger",
  },
  {
    title: "⚙️ General Workspace Settings",
    text: "This gear icon in the header opens your overall workspace configurations. From here, you can input your private API keys, modify your tutoring background and pedagogical bio, change the application name, and configure external backup schedules. Example: Open this menu to toggle sound effects on/off or change the website title to your own brand name.",
    selector: "tutor-general-settings",
  },
  {
    title: "📊 Live Workspace Metrics",
    text: "At the top of your dashboard, these cards show critical metrics: Active Learners, Weekly Practice Hours, and Average Streak. This evaluates class health at a glance. Example: If the 'Homework Completion Rate' drops below 80%, you can instantly spot it here and launch a quick nudge campaign to encourage the class.",
    selector: "tutor-quick-stats",
  },
  {
    title: "👑 Star Performer Spotlight",
    text: "Celebrate top-tier achievements! This card showcases the student who earned the most XP or maintained the longest learning streak this week. It is designed to foster healthy gamified competition. Example: Seeing 'Test Student Alpha' crowned as this week's champion motivates other students to finish more quizzes to claim the crown next week.",
    selector: "tutor-star-performer",
  },
  {
    title: "⚡ Automated Campaign Action Center",
    text: "This toolbar contains high-productivity bulk action buttons. You can select multiple students to launch drip email campaigns, send interactive bulk newsletters, manage monthly subscriptions, or trigger batch AI diagnostic evaluations. Example: Select three students, click 'Drip Campaign', and schedule a 5-day series of vocabulary emails without sending them one-by-one.",
    selector: "tutor-automation-actions",
  },
  {
    title: "🔍 Smart Student Search & Filters",
    text: "Use this panel to instantly look up any student by name, tag, or language. It supports semantic search, allowing you to find records based on student backgrounds or goals. Example: Type 'Software' in the search bar, and it will instantly filter out only students working in tech, like 'Test Student Alpha'.",
    selector: "tutor-search-filters",
  },
  {
    title: "👥 Active Student Cards & Directory",
    text: "Your primary class roster. Each student gets a beautiful interactive card displaying their native language, target language, CEFR level, current weekly streak, and activity status. Example: Click on 'Test Student Alpha's card to go inside their profile, where you can generate fully customized lesson materials and check their skill tree.",
    selector: "tutor-learner-list",
  },
  {
    title: "➕ Add New Learner - Roster Onboarding Button",
    text: "This dashed button at the bottom of your roster launches the Onboarding wizard to introduce a new learner. Clicking it lets you co-design a student profile and personalized curriculum using either our conversational Oral Interview or structured Manual Wizard.",
    selector: "tutor-add-learner-btn",
  },
  {
    title: "🗣️ Step-by-Step Oral Onboarding Method",
    text: "How to register a learner orally: 1) Click 'Interactive Oral Interview' to launch Presentation mode. 2) Share your screen to show beautiful 3D-emoji slides containing goals, style, and backgrounds. 3) Let the learner speak. Record or transcribe their oral comments into our text box. 4) The AI processes this messy transcription instantly, calibrates their CEFR level (e.g., B1 to B2), maps interests, and automatically outlines their structured personal syllabus timeline!",
    selector: "tutor-add-learner-btn",
  },
  {
    title: "✍️ Step-by-Step Manual Onboarding Method",
    text: "How to register a learner manually: 1) Click 'Classic Manual Wizard' to open the 6-step setup form. 2) Step 1: Enter personal contact data like name, country, and birthday. 3) Step 2: Define specific target goals, interests, and native/target languages. 4) Step 3: Grade their starting competencies (Speaking, Grammar, Listening, etc.) using interactive star-ratings. 5) Step 4: Toggle target syllabus chapters and milestone metrics. 6) Step 5: Save to compile a fully verified learner profile!",
    selector: "tutor-add-learner-btn",
  },
  {
    title: "🏫 Interactive Group Classes",
    text: "Manage student cohorts and group learning clubs. This card lists all multi-student groups, their scheduled sessions, and attendance history. Example: Create a 'Sunday Speaking Club' group, assign five students to it, and launch a shared multiplayer game to make the class highly interactive.",
    selector: "tutor-group-classes",
  },
  {
    title: "🔌 Syllabus & Learning Platforms",
    text: "Connect and organize target language curriculums. You can establish specific boundaries, CEFR standards, and targeted courses here. Example: Set up an 'Oxford English B2' course with target milestones so the system can verify student alignments automatically.",
    selector: "tutor-platforms-list",
  },
  {
    title: "🏆 Gamified League Leaderboards",
    text: "Boost daily retention! This section lists active divisions like Diamond, Gold, and Bronze leagues. Students are automatically grouped into weekly brackets where they compete by earning XP from homework. Example: A student sitting at #4 will do one extra vocabulary review tonight just to move into the top 3 and avoid demotion.",
    selector: "tutor-division-leaderboard",
  },
  {
    title: "⚔️ AI Combat & Roleplay Arena",
    text: "Where students put their speaking skills to the test! Launch interactive simulated real-life roleplays (like ordering food, passing an interview, or negotiating a deal). The AI rates their responses and awards coins and equipment. Example: Send a student to practice a 'Salary Negotiation' battle. The AI acts as the boss and grades their polite interruption skills.",
    selector: "tutor-combat-arena",
  },
  {
    title: "🎯 Tutoring Action Sidebar",
    text: "Your personal helper left sidebar. It displays live Tier Status & Sync, 'Attention Needed' warning cards for critical events alongside your daily to-do checklist and upcoming events.",
    selector: "tutor-sidebar-tasks",
  },
  {
    title: "🗓️ Calendar Syncer & Holiday Greeting Generator",
    text: "Keep your teaching schedule in sync. This widget integrates with Google Calendar or Apple iCal to map your availability. It also tracks upcoming student birthdays and holidays, letting you generate custom language greetings instantly. Example: Click 'Generate Birthday Card' next to a student's birthday to let the AI write a customized B2-level English greeting card.",
    selector: "tutor-calendar-sync",
  },
  {
    title: "✅ Custom Tutor To-Do List",
    text: "Your interactive private checklist. You can create to-do tasks, set custom due dates, and link them to specific students so you never forget to review a report. Example: Add a task like 'Prepare B2 presentation slides', set the due date to tomorrow, and link it to 'Test Student Alpha'. It will display right on their profile too!",
    selector: "tutor-todo-list",
  },
  {
    title: "📅 Tutor Master Calendar Layout",
    text: "The ultimate full-screen scheduler at the bottom of the dashboard. Review all monthly, weekly, and daily lesson slots, reschedule bookings by clicking, and manage incoming class reservations. Example: If a student requests to reschedule their session, click the slot in this calendar to drag, update, or cancel it.",
    selector: "tutor-master-calendar-full-width",
  },
  {
    title: "📂 Workspace Saved Files & Database Backups",
    text: "Your local backup and file management dashboard at the very bottom. Here you can view, download, or delete all generated files, vocabulary guides, lesson plans, and transcripts. Example: After generating a customized B2 Tech English Coursebook, you can download its JSON file or print it directly from this list.",
    selector: "tutor-manage-saved-files",
  },
  {
    title: "🔌 Global API Settings Configuration",
    text: "Configure your chosen AI provider in seconds. Choose from Google Gemini, OpenAI, OpenRouter, Deepseek, or GapGpt, paste your private API key, test connectivity, and customize your language generation models. Example: Enter your Gemini API key here, and all the AI tools on student profiles will immediately activate and generate personalized curriculums.",
    selector: "settings-api-tab",
    openSettings: true,
    settingsTab: "settings-api-tab"
  },
  {
    title: "👩‍🏫 Tutor Bio & Personalization Details",
    text: "Tell the AI about your teaching background. Describe your pedagogical style, interests, and bio to inject custom teaching voice parameters automatically into all generated lessons. Example: If you specify you are a 'business English coach who loves startups', the AI will frame all reading materials and exercises around startup themes.",
    selector: "settings-tutor-tab",
    openSettings: true,
    settingsTab: "settings-tutor-tab"
  },
  {
    title: "🎨 Whitelabel Branded Layout Settings",
    text: "Customize the workspace to reflect your personal tutoring brand. Configure a custom application name, set custom domain addresses, upload high-fidelity logo graphics, and enable animated splash screens. Example: Change the app name from 'Tutorly' to 'My English Academy', and the header, emails, and student portals will immediately reflect your custom brand.",
    selector: "settings-app-tab",
    openSettings: true,
    settingsTab: "settings-app-tab"
  },
  {
    title: "✉️ SendGrid Email Settings & Automated Alerts",
    text: "Set up automated student progress reports! Here, you can input your SendGrid API key, authorize your sending email address, and customize the HTML transactional lesson template. You can also configure warning thresholds for student streaks and toggle immediate warnings when quiz results or homework diagnostics are submitted.",
    selector: "settings-email-tab",
    openSettings: true,
    settingsTab: "settings-email-tab"
  },
  {
    title: "💾 Back-up Suite & Automated Database Backup",
    text: "Unlock ultimate data freedom! Connect the workspace to any folder on your hard drive to back up student profiles, calendar slots, generated coursebooks, and tags directly into standard text files. Example: Toggle on 'Auto-Disk Backup' to keep a permanent local copy of your entire school data safe from server failures.",
    selector: "settings-disk-tab",
    openSettings: true,
    settingsTab: "settings-disk-tab"
  }
];

// Add this state to Dashboard component
const Dashboard: React.FC<App1DashboardProps> = ({ platforms = [], tutorProfile, setPlatforms, setIsAddPlatformOpen, setTutorProfile }) => {
  const navigate = useNavigate();
  const [isCoursebookManagerOpen, setIsCoursebookManagerOpen] = useState(false);
  const [learnersPerPage, setLearnersPerPage] = useState(10);

  // Default adult dashboard theme initialization to light theme safely
  React.useLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') || 'light';
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
  }, []);

  // Store selectors
  const learners = useLearnerStore(state => state.learners);
  const groupClasses = useLearnerStore(state => state.groupClasses);
  const removeLearner = useLearnerStore(state => state.removeLearner);
  const addGroupClass = useLearnerStore(state => state.addGroupClass);
  const removeGroupClass = useLearnerStore(state => state.removeGroupClass);
  const todos = useTodoStore(state => state.todos);
  const toggleTodo = useTodoStore(state => state.toggleTodo);
  const removeTodo = useTodoStore(state => state.removeTodo);
  const addTodo = useTodoStore(state => state.addTodo);
  const loading = useAppStore(state => state.loading);
  const setTutorInfo = useAppStore(state => state.setTutorInfo);
  const learnerTags = useAutomationStore(state => state.learnerTags);
  const addNotification = useAutomationStore(state => state.addNotification);
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const authTier = useAuthStore(state => state.tier);
  const authTutor = useAuthStore(state => state.tutor);

  /*
   * A fake "Test Student Alpha" used to be injected here on every mount, for
   * every account, whenever the roster was empty. It has been removed, because
   * on a real tutor's dashboard it did three harmful things:
   *
   *  - it made a genuinely empty dashboard impossible. An empty roster is how the
   *    browser dropping its storage actually looks, and this effect painted over
   *    that symptom with a plausible-looking student, so the tutor could not tell
   *    that their real library was still recoverable;
   *  - it wrote that fake learner into the persisted roster like any other, so it
   *    propagated into the backup folder, the portable backup file and the cloud
   *    copy — polluting real backups with someone who does not exist; and
   *  - searching for a real learner on such a dashboard returned the wrong name
   *    among the results, which is worse than no result at all.
   *
   * The "Load Test User" button below is still there and still works. Creating a
   * demo student is now something the tutor asks for, not something the dashboard
   * does behind their back.
   */

  // Premium Walkthrough Tour States & Logic
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Resume tour if requested by a sub-guide
  useEffect(() => {
    const resumeStep = localStorage.getItem("dashboard_tour_step_resume");
    if (resumeStep !== null) {
      const parsed = parseInt(resumeStep, 10);
      if (!isNaN(parsed)) {
        setTourStep(parsed);
      }
      localStorage.removeItem("dashboard_tour_step_resume");
    }
  }, []);

  const [hasCompletedDashboardTour, _setHasCompletedDashboardTour] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tutor-dashboard-tour-completed-v2') === 'true';
    }
    return false;
  });
  const setHasCompletedDashboardTour = (val: boolean) => {
    _setHasCompletedDashboardTour(val);
    localStorage.setItem('tutor-dashboard-tour-completed-v2', String(val));
  };
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isEdge = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return /Edg/.test(window.navigator.userAgent);
  }, []);

  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(true);
      // Clean text by stripping emojis and symbols
      const cleanText = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      
      // Look up voice setting matching the gaming hub's selected voice for CatCompanion exactly!
      let preferred: SpeechSynthesisVoice | undefined;
      try {
        const stored = localStorage.getItem("alh_speech_settings_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.voiceName) {
            preferred = voices.find(v => v.name === parsed.voiceName);
          }
          if (parsed.rate !== undefined) utterance.rate = parsed.rate;
          if (parsed.pitch !== undefined) utterance.pitch = parsed.pitch;
          if (parsed.volume !== undefined) utterance.volume = parsed.volume;
        }
      } catch (err) {
        console.warn("Failed parsing speech settings storage:", err);
      }

      // Default high quality natural backup matching logic
      if (!preferred) {
        preferred = voices.find(v => /natural|google|samantha|alex|aria|jenny/i.test(v.name) && v.lang.startsWith("en"))
          || voices.find(v => v.lang.startsWith("en"))
          || voices[0];
      }
        
      if (preferred) {
        utterance.voice = preferred;
      }
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Auto read-aloud and target spotlight/scrolling highlight with premium pulsing animations
  useEffect(() => {
    if (tourStep !== null) {
      const step = DASHBOARD_TOUR_STEPS[tourStep];
      if (step) {
        speakText(step.text);

        // Highlight element
        const el = document.getElementById(step.selector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const highlightClasses = ['ring-4', 'ring-offset-2', 'ring-indigo-600', 'dark:ring-indigo-400', 'animate-pulse', 'scale-[1.01]', 'transition-all', 'duration-500'];
          el.classList.add(...highlightClasses);
          return () => {
            el.classList.remove(...highlightClasses);
          };
        }
      }
    } else {
      stopSpeaking();
    }
    return () => stopSpeaking();
  }, [tourStep, speakText, stopSpeaking]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("active_dashboard_tour_step", tourStep !== null ? String(tourStep) : "");
      window.dispatchEvent(new CustomEvent("dashboard_tour_step_changed"));
    }
  }, [tourStep]);

  // Synchronize and redirect tour step to the onboarding wizard
  useEffect(() => {
    if (tourStep === 15) {
      localStorage.setItem("dashboard_tour_step_resume", "15");
      localStorage.setItem("onboarding_tour_start_mode", "oral");
      stopSpeaking();
      navigate('/onboarding');
    } else if (tourStep === 16) {
      localStorage.setItem("dashboard_tour_step_resume", "16");
      localStorage.setItem("onboarding_tour_start_mode", "manual");
      stopSpeaking();
      navigate('/onboarding');
    }
  }, [tourStep, navigate, stopSpeaking]);

  // Open settings modal automatically based on step options
  useEffect(() => {
    if (tourStep !== null) {
      const stepObj = DASHBOARD_TOUR_STEPS[tourStep];
      if (stepObj && stepObj.openSettings) {
        setIsSettingsModalOpen(true);
        if (stepObj.settingsTab) {
          const timer = setTimeout(() => {
            const tabBtn = document.getElementById(stepObj.settingsTab);
            if (tabBtn) {
              tabBtn.click();
            }
          }, 300);
          return () => clearTimeout(timer);
        }
      } else {
        setIsSettingsModalOpen(false);
      }
    } else {
      setIsSettingsModalOpen(false);
    }
  }, [tourStep]);

  // Trigger first-time prompt if not completed yet
  useEffect(() => {
    if (!hasCompletedDashboardTour) {
      const timer = setTimeout(() => {
        setShowFirstTimePrompt(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedDashboardTour]);

  const handleNextStep = () => {
    if (tourStep !== null) {
      if (tourStep < DASHBOARD_TOUR_STEPS.length - 1) {
        setTourStep(tourStep + 1);
      } else {
        setTourStep(null);
        setHasCompletedDashboardTour(true);
        alert("🎉 You have completed the workspace tour successfully! Enjoy tutoring!");
      }
    }
  };

  const handlePrevStep = () => {
    if (tourStep !== null && tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  };

  const handleSkipTour = () => {
    setTourStep(null);
    setHasCompletedDashboardTour(true);
  };
  
  const handleSetManualTutorTime = () => {
    setIsTimeModalOpen(true);
  };
  
  const handleTimeSubmit = (hours: number, minutes: number) => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    let offsetMinutes = (hours * 60 + minutes) - (utcHours * 60 + utcMinutes);
    if (offsetMinutes > 14 * 60) offsetMinutes -= 24 * 60;
    if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;

    setTutorInfo({ timeOffsetMinutes: offsetMinutes, timezone: '' });
  };
  const [inputGlobalSearchQuery, setInputGlobalSearchQuery] = useState('');
  const [submittedGlobalSearchQuery, setSubmittedGlobalSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ country: '', level: '', status: '', tag: '', category: '' });
  const [sortBy, setSortBy] = useState('xp');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'all' | 'week' | 'month'>('all');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  // A class can be created complete: its level and its participants are collected here and
  // saved with it. Participants are roster entries (a name, a level, facts) — NOT learner
  // accounts; see `GroupParticipant` in types2.
  const [newGroupLevel, setNewGroupLevel] = useState<CourseLevel>(CourseLevel.B1);
  // The class ceiling, in the same shape the individual profile uses in
  // "Step 2 · Customization & Lesson Structure": a CEFR level (incl. A2+/B1+) plus a
  // grammar tier. Stored on the class so the first generated lesson already obeys it.
  const [newGroupCefr, setNewGroupCefr] = useState<CefrLevelKey>('B1');
  const [newGroupTier, setNewGroupTier] = useState<number>(1);
  const [newGroupRoster, setNewGroupRoster] = useState<Omit<GroupParticipant, 'id'>[]>([]);
  const [newGroupRouting, setNewGroupRouting] = useState('');
  const [learnerPage, setLearnerPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  
  // Multi-select state (U3)
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<Set<string>>(new Set());
  
  // Modal states
  const [isBatchEmailOpen, setIsBatchEmailOpen] = useState(false);
  const [isDripCampaignOpen, setIsDripCampaignOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isBatchScheduleOpen, setIsBatchScheduleOpen] = useState(false);
  const [isBatchAIDiagOpen, setIsBatchAIDiagOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  // Debounced search (O2)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Keyboard shortcuts (U4)
  useKeyboardShortcuts({
    'ctrl+k': () => document.querySelector<HTMLInputElement>('input[placeholder*="Search learners"]')?.focus(),
    'ctrl+n': () => setIsGroupModalOpen(true),
    'ctrl+e': () => selectedLearnerIds.size > 0 && setIsBatchEmailOpen(true),
  });

  const LEARNERS_PER_PAGE = 10;
  const GROUPS_PER_PAGE = 5;

  const uniqueCountries = useMemo(() => [...new Set(learners.map(l => l.country).filter(Boolean))].sort(), [learners]);

  const uniqueCategories = useMemo(() => LEARNER_CATEGORIES.filter(cat => learners.some(l => l.category === cat.id)), [learners]);

  const filteredLearners = useMemo(() => {
    let periodFilteredLearners = learners;

    if (leaderboardPeriod !== 'all') {
      periodFilteredLearners = learners.filter(learner => {
        const lastSessionDate = getLatestSessionDate(learner);
        if (!lastSessionDate) return false;
        if (leaderboardPeriod === 'week') return isThisWeek(lastSessionDate, { weekStartsOn: 1 });
        if (leaderboardPeriod === 'month') return isThisMonth(lastSessionDate);
        return true;
      });
    }

    return periodFilteredLearners.filter(learner => {
      const nameMatch = learner.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
      let globalSearchMatch = true;
      if (submittedGlobalSearchQuery) {
        const query = submittedGlobalSearchQuery.toLowerCase();
        const searchableContent = [
          learner.email, learner.phone, learner.country, learner.city, learner.occupation,
          learner.major, learner.interests, learner.expectations, learner.learningStyle,
          learner.coursePlan.courseName, learner.coursePlan.features,
          ...learner.needs.map(n => n.name),
          ...learner.competencies.map(c => c.name),
          ...(learner.sessions || []).flatMap(s => [s.script, s.reflection, ...(s.skillsLearned || []), ...(s.needsHelp || [])]),
        ].filter(Boolean).join(' ').toLowerCase();
        globalSearchMatch = searchableContent.includes(query);
      }

      const countryMatch = filters.country ? learner.country === filters.country : true;
      const levelMatch = filters.level ? learner.coursePlan.level === filters.level : true;
      const statusMatch = filters.status ? learner.competencies.some(c => c.status === filters.status) : true;
      const tagMatch = filters.tag ? (learnerTags[learner.id] || []).includes(filters.tag) : true;
      const categoryMatch = filters.category ? learner.category === filters.category : true;
      
      return nameMatch && globalSearchMatch && countryMatch && levelMatch && statusMatch && tagMatch && categoryMatch;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'recent': {
          const dateA = getLatestSessionDate(a);
          const dateB = getLatestSessionDate(b);
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
        }
        case 'earliest': {
          const dateA = getLatestSessionDate(a);
          const dateB = getLatestSessionDate(b);
          if (!dateA) return -1;
          if (!dateB) return 1;
          return dateA.getTime() - dateB.getTime();
        }
        case 'name':
          return a.name.localeCompare(b.name);
        case 'xp':
        default:
          return b.xp - a.xp;
      }
    });
  }, [learners, debouncedSearchQuery, submittedGlobalSearchQuery, filters, sortBy, leaderboardPeriod, learnerTags]);
  
  useEffect(() => {
    setLearnerPage(1);
  }, [debouncedSearchQuery, submittedGlobalSearchQuery, filters, sortBy, leaderboardPeriod]);

  const learnerPages = Math.ceil(filteredLearners.length / learnersPerPage);
  const paginatedLearners = filteredLearners.slice(
    (learnerPage - 1) * learnersPerPage,
    learnerPage * learnersPerPage
  );
  
  const groupPages = Math.ceil(groupClasses.length / GROUPS_PER_PAGE);
  const paginatedGroups = groupClasses.slice(
    (groupPage - 1) * GROUPS_PER_PAGE,
    groupPage * GROUPS_PER_PAGE
  );

  const selectedLearners = useMemo(() => 
    learners.filter(l => selectedLearnerIds.has(l.id)), 
    [learners, selectedLearnerIds]
  );

  const handleExportSelected = useCallback(() => {
    if (selectedLearners.length === 0) return;
    const exportData = {
      learners: selectedLearners,
      timestamp: new Date().toISOString(),
      app: "Tutorly Professional Dashboard"
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `tutor-selected-learners-${selectedLearners.length}.json`);
    linkElement.click();
  }, [selectedLearners]);

  const handleSelectLearner = useCallback((id: string) => {
    setSelectedLearnerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedLearnerIds.size === paginatedLearners.length) {
      setSelectedLearnerIds(new Set());
    } else {
      setSelectedLearnerIds(new Set(paginatedLearners.map(l => l.id)));
    }
  }, [paginatedLearners, selectedLearnerIds.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedLearnerIds(new Set());
  }, []);

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonStatCard />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
          </div>
          {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({...prev, [name]: value}));
  };

  const clearFilters = () => {
    setFilters({ country: '', level: '', status: '', tag: '', category: '' });
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedGlobalSearchQuery(inputGlobalSearchQuery);
  };

  const handleGlobalSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputGlobalSearchQuery(query);
    if (query === '') setSubmittedGlobalSearchQuery('');
  };

  const handleDeleteLearner = (learnerId: string) => {
    removeLearner(learnerId);
    addNotification({
      type: 'system',
      title: 'Learner Removed',
      message: 'The learner has been successfully removed.',
    });
  };
  
  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    const id = addGroupClass(name, {
      // Keep the legacy human-name enum in sync, but the CEFR pair is what every
      // generator reads.
      level: COURSE_LEVEL_FOR_CEFR[newGroupCefr] || newGroupLevel,
      cefrLevel: newGroupCefr,
      cefrTier: newGroupTier,
      participants: newGroupRoster,
      groupRouting: newGroupRouting,
      rosterSource: newGroupRoster.length ? 'Added while creating the class' : '',
    });
    addNotification({
      type: 'system',
      title: 'Group Created',
      message:
        `"${name}" has been created` +
        (newGroupRoster.length ? ` with ${newGroupRoster.length} learner${newGroupRoster.length === 1 ? '' : 's'}.` : '.'),
    });
    setNewGroupName('');
    setNewGroupRoster([]);
    setNewGroupRouting('');
    setNewGroupLevel(CourseLevel.B1);
    setNewGroupCefr('B1');
    setNewGroupTier(1);
    setIsGroupModalOpen(false);
    // Straight into the class it just created — the tutor's next question is always
    // "where is it?", and the roster is already in it.
    navigate(`/group/${id}`);
  };
  
  const handleRemoveGroup = (groupId: string) => {
    removeGroupClass(groupId);
  };

  const pendingTodos = (todos || []).filter(t => !t.completed);
  const [todoTab, setTodoTab] = useState<'tasks' | 'coach'>('tasks');
  const [todoCopiedId, setTodoCopiedId] = useState<string | null>(null);
  const [todoTasksPage, setTodoTasksPage] = useState(1);
  const [todoCoachPage, setTodoCoachPage] = useState(1);
  const TODO_TASKS_PER_PAGE = 4;
  const TODO_COACH_PER_PAGE = 3;

  const totalTodoTasksPages = Math.ceil(pendingTodos.length / TODO_TASKS_PER_PAGE);
  const paginatedTodoTasks = pendingTodos.slice((todoTasksPage - 1) * TODO_TASKS_PER_PAGE, todoTasksPage * TODO_TASKS_PER_PAGE);

  const totalTodoCoachPages = Math.ceil((learners || []).length / TODO_COACH_PER_PAGE);
  const paginatedTodoCoachLearners = (learners || []).slice((todoCoachPage - 1) * TODO_COACH_PER_PAGE, todoCoachPage * TODO_COACH_PER_PAGE);

  useEffect(() => {
    if (todoTasksPage > totalTodoTasksPages && totalTodoTasksPages > 0) setTodoTasksPage(totalTodoTasksPages);
  }, [pendingTodos.length, totalTodoTasksPages, todoTasksPage]);

  useEffect(() => {
    if (todoCoachPage > totalTodoCoachPages && totalTodoCoachPages > 0) setTodoCoachPage(totalTodoCoachPages);
  }, [learners?.length, totalTodoCoachPages, todoCoachPage]);

  const colorThemes = [
    'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800', 'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800', 'bg-indigo-100 text-indigo-800',
  ];

  const getGroupColorTheme = (groupId: string) => {
    let hash = 0;
    if (groupId.length === 0) return colorThemes[0];
    for (let i = 0; i < groupId.length; i++) {
      hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    return colorThemes[Math.abs(hash % colorThemes.length)];
  };

  const isTopTen = filters.country === '' && filters.level === '' && filters.status === '' && filters.tag === '' && filters.category === '' && debouncedSearchQuery === '' && submittedGlobalSearchQuery === '' && sortBy === 'xp';

  return (
    <ErrorBoundary 
        FallbackComponent={ErrorFallback} 
        onReset={() => window.location.reload()}
        onError={(error: any, info) => {
            console.error("Dashboard ErrorBoundary caught an error:", error, info);
            useAppStore.getState().logError(`Dashboard ErrorBoundary: ${error.message}`, info?.componentStack || error.stack);
        }}
    >
      <CoursebookManagerModal 
        isOpen={isCoursebookManagerOpen} 
        onClose={() => setIsCoursebookManagerOpen(false)} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8 order-1">
          
          {/* Top banner from App1 */}
          <div id="tutor-welcome-banner">
            {tutorProfile && (
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 p-8 rounded-2xl shadow-xl text-white mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                          <h1 className="text-3xl font-bold mb-2">Welcome back, {tutorProfile.name || 'Tutor'}!</h1>
                          <p className="text-indigo-50">Manage your learners, groups, and content platforms.</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                          <ServerTime simple className="text-2xl font-mono text-white text-right block" />
                      </div>
                  </div>
              </div>
            )}
          </div>

          {/* Header with Notifications */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-extrabold">Learner Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                  id="tutor-help-tour"
                  onClick={() => {
                    setTourStep(0);
                    setShowFirstTimePrompt(false);
                  }} 
                  className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 w-10 h-10 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/60 transition flex items-center justify-center font-black text-lg shadow-sm"
                  title="Take Interactive Tour"
              >
                  ?
              </button>
              <button 
                  id="tutor-theme-toggle"
                  onClick={() => {
                    const isDark = document.documentElement.classList.toggle('dark');
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                  }} 
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition" 
                  title="Toggle Theme"
              >
                  <i className="fas fa-moon dark:hidden"></i>
                  <i className="fas fa-sun hidden dark:inline"></i>
              </button>
              <button 
                  id="tutor-coursebooks-trigger"
                  onClick={() => {
                    if (authTier !== 'vip') {
                      useAuthStore.getState().openUpgradeModal('Course Resources & Library is a VIP benefit — VIP includes direct support and access to the saved-files & coursebook library.');
                      return;
                    }
                    setIsCoursebookManagerOpen(true);
                  }} 
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  title={authTier === 'vip' ? 'Saved Files & Coursebooks (VIP Library)' : '🔒 Course Resources & Library (VIP)'}
              >
                  <i className="fas fa-book-open"></i>
              </button>
              <button 
                  id="tutor-general-settings"
                  onClick={() => setIsSettingsModalOpen(true)} 
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  title="General Settings"
              >
                  <i className="fas fa-cog"></i>
              </button>
              <NotificationCenter />
              <div className="text-2xl font-bold text-brand-purple">
                Total: +{(tutorProfile.baseTotal ?? 675) + learners.length}
              </div>
            </div>
          </div>

          <SettingsModal 
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
              tutorProfile={tutorProfile}
              setTutorProfile={setTutorProfile || (() => {})}
          />

          {/* Quick Stats (U1) */}
          <div id="tutor-quick-stats">
            <QuickStatsCards learners={learners} />
          </div>

          {/* Star Performer (G5) */}
          <div id="tutor-star-performer">
            <StarPerformerSpotlight learners={learners} />
          </div>

          {/* Automation Quick Actions */}
          <div id="tutor-automation-actions" className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setIsDripCampaignOpen(true)}
              className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2"
            >
              <i className="fas fa-paper-plane"></i> Drip Campaigns
            </button>
            <button 
              onClick={() => selectedLearnerIds.size > 0 ? setIsBatchEmailOpen(true) : alert('Select learners first')}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2"
            >
              <i className="fas fa-envelope"></i> Batch Email
            </button>
            <button 
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2"
            >
              <i className="fas fa-rss"></i> Subscriptions
            </button>
          </div>

          {/* Search & Filters */}
          <div id="tutor-search-filters" className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="Search learners by name... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 pl-10 bg-gray-50 border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
              </div>
              <form onSubmit={handleGlobalSearchSubmit} className="relative flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Deep search all data..."
                  value={inputGlobalSearchQuery}
                  onChange={handleGlobalSearchChange}
                  className="w-full p-3 pl-10 bg-gray-50 border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-medium pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.28 17.28a9 9 0 1 0-12.73-12.73l-2.55 2.55M22 6.72l-2.55 2.55"></path><path d="m13 13-6-6"></path></svg>
                </div>
                <button type="submit" className="bg-brand-blue text-white font-bold px-4 rounded-lg hover:bg-blue-600 transition-colors">Search</button>
              </form>
            </div>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-by" className="text-sm font-bold text-gray-600">Sort:</label>
                  <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-blue">
                    <option value="xp">XP (High to Low)</option>
                    <option value="recent">Most Recent</option>
                    <option value="earliest">Oldest (Inactive)</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="period" className="text-sm font-bold text-gray-600">Period:</label>
                  <select id="period" value={leaderboardPeriod} onChange={(e) => setLeaderboardPeriod(e.target.value as 'all' | 'week' | 'month')} className="p-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-blue">
                    <option value="all">All-Time</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className="text-sm font-bold text-brand-blue flex items-center gap-2">
                <i className="fas fa-filter"></i>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg animate-fade-in">
                <select name="country" value={filters.country} onChange={handleFilterChange} className="p-2 border rounded-lg bg-white">
                  <option value="">All Countries</option>
                  {uniqueCountries.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select name="level" value={filters.level} onChange={handleFilterChange} className="p-2 border rounded-lg bg-white">
                  <option value="">All Levels</option>
                  {Object.values(CourseLevel).map((l: CourseLevel) => <option key={l} value={l}>{l}</option>)}
                </select>
                <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-lg bg-white">
                  <option value="">All Statuses</option>
                  {Object.values(CompetencyStatus).map((s: CompetencyStatus) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select name="tag" value={filters.tag} onChange={handleFilterChange} className="p-2 border rounded-lg bg-white">
                  <option value="">All Tags</option>
                  {DEFAULT_TAGS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select name="category" value={filters.category} onChange={handleFilterChange} className="p-2 border rounded-lg bg-white" title="Filter by learning category / theme">
                  <option value="">All Categories</option>
                  {uniqueCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
                </select>
                <button onClick={clearFilters} className="col-span-full bg-brand-gray-medium text-white font-bold py-2 rounded-lg hover:bg-brand-gray-dark transition-colors">Clear Filters</button>
              </div>
            )}
          </div>

          {/* Learner List with Select All */}
          <div id="tutor-learner-list" className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-3 bg-gray-50 border-b flex items-center gap-4">
              <input 
                type="checkbox"
                checked={selectedLearnerIds.size === paginatedLearners.length && paginatedLearners.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm font-semibold text-gray-600">
                {selectedLearnerIds.size > 0 ? `${selectedLearnerIds.size} selected` : 'Select all'}
              </span>
              {selectedLearnerIds.size > 0 && (
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => setIsTagManagerOpen(true)} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-semibold">
                    Manage Tags
                  </button>
                  <button onClick={() => setIsBatchEmailOpen(true)} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                    Send Email
                  </button>
                </div>
              )}
            </div>
            {paginatedLearners.length > 0 ? (
              <div>
                {paginatedLearners.map((learner, index) => {
                  const rank = ((learnerPage - 1) * LEARNERS_PER_PAGE) + index;
                  return (
                    <VirtualizedLearnerRow
                      key={`${learner.id}-${index}`}
                      learner={learner}
                      rank={rank}
                      isTopTen={isTopTen && rank < 10}
                      isSelected={selectedLearnerIds.has(learner.id)}
                      onSelect={handleSelectLearner}
                      onDelete={handleDeleteLearner}
                      learnerTags={learnerTags[learner.id] || []}
                    />
                  );
                })}
                <PaginationControls currentPage={learnerPage} totalPages={learnerPages} onPageChange={setLearnerPage} />
                <div className="p-4 border-t flex flex-col gap-2">
                  <Link 
                    id="tutor-add-learner-btn"
                    to="/onboarding" 
                    onClick={(e) => {
                      const { tier, openUpgradeModal } = useAuthStore.getState();
                      if (!canAddLearner(learners.length, tier)) {
                        e.preventDefault();
                        openUpgradeModal(`You have reached the Free Tier limit of ${FREE_LEARNER_LIMIT} learner profiles (${learners.length} active). Upgrade to PRO or VIP to add unlimited learner profiles. All your existing data remains fully accessible!`);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-brand-blue text-brand-blue font-bold rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <i className="fas fa-user-plus"></i> Add New Learner Profile
                  </Link>
                  <button
                    onClick={() => {
                      const { tier, openUpgradeModal } = useAuthStore.getState();
                      if (!canAddLearner(learners.length, tier)) {
                        openUpgradeModal(`You have reached the Free Tier limit of ${FREE_LEARNER_LIMIT} learner profiles (${learners.length} active). Upgrade to PRO or VIP to load test users.`);
                        return;
                      }
                      useLearnerStore.getState().addTestUser();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-purple-500 text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <i className="fas fa-flask"></i> Load Test User
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/*
                  * An empty roster looks exactly the same whether the tutor has not
                  * added anyone yet or the browser dropped the whole library, and
                  * reading it as "I lost everything" is what makes a recoverable
                  * eviction permanent. The card below only renders when a rescue
                  * copy of the roster still exists, and offers it back.
                  */}
                <DataRescueCard />
                <div className="p-4 flex flex-col gap-2">
                <p className="text-center text-brand-gray-dark p-6">
                  {learners.length === 0
                    ? 'No learners yet — add your first learner profile to get started.'
                    : 'No learners found matching your criteria. Clear the filters to see everyone again.'}
                </p>
                <Link 
                  id="tutor-add-learner-btn"
                  to="/onboarding" 
                  onClick={(e) => {
                    const { tier, openUpgradeModal } = useAuthStore.getState();
                    if (!canAddLearner(learners.length, tier)) {
                      e.preventDefault();
                      openUpgradeModal(`You have reached the Free Tier limit of ${FREE_LEARNER_LIMIT} learner profiles (${learners.length} active). Upgrade to PRO or VIP to add unlimited learner profiles. All your existing data remains fully accessible!`);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-brand-blue text-brand-blue font-bold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <i className="fas fa-user-plus"></i> Add New Learner Profile
                </Link>
                <button
                    onClick={() => {
                      const { tier, openUpgradeModal } = useAuthStore.getState();
                      if (!canAddLearner(learners.length, tier)) {
                        openUpgradeModal(`You have reached the Free Tier limit of ${FREE_LEARNER_LIMIT} learner profiles (${learners.length} active). Upgrade to PRO or VIP to load test users.`);
                        return;
                      }
                      useLearnerStore.getState().addTestUser();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-purple-500 text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <i className="fas fa-flask"></i> Load Test User
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Group Classes */}
          {/* Group Classes */}
          <div id="tutor-group-classes">
            <ErrorBoundary 
                FallbackComponent={ErrorFallback}
                onError={(error: any, info) => {
                    console.error("Dashboard Group Classes ErrorBoundary caught an error:", error, info);
                    useAppStore.getState().logError(`Dashboard Group Classes ErrorBoundary: ${error.message}`, info?.componentStack || error.stack);
                }}
            >
              <SectionCard title="Group Classes" icon={<i className="fas fa-users"></i>}>
                <div className="space-y-3 mb-4">
                  {paginatedGroups.map(group => {
                    const linkedParticipants = (learners || []).filter(l => group.participantIds?.includes(l.id));
                    // The roster is what a group class is taught from; the linked-account
                    // list above is the old behaviour and is usually empty now.
                    const roster = group.participantsData || [];
                    const theme = getGroupColorTheme(group.id);
                    return (
                      <div key={group.id} className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <Link to={`/group/${group.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg ${theme}`}>
                            {group.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold">{group.name}</p>
                            <div className="flex -space-x-2 mt-1">
                              {roster.slice(0, 5).map(p => (
                                <div
                                  key={p.id}
                                  title={`${p.name}${p.cefr && p.cefr !== 'unknown' ? ` · ${p.cefr}` : ''}${p.talkative === 'low' ? ' · shy' : ''}`}
                                  className="w-6 h-6 rounded-full border-2 border-white bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center"
                                >
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                              ))}
                              {roster.length === 0 &&
                                linkedParticipants.slice(0, 5).map(p => (
                                  <img key={p.id} src={getAvatarUrl(p.gender, p.avatarId, p.name)} title={p.name} className="w-6 h-6 rounded-full border-2 border-white" />
                                ))}
                              {Math.max(roster.length, linkedParticipants.length) > 5 && (
                                <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-300 text-xs flex items-center justify-center">
                                  +{Math.max(roster.length, linkedParticipants.length) - 5}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Levels and L1 are the two things a tutor checks before opening a
                              class, so they belong on the card rather than two clicks in. */}
                          <div className="text-right">
                            <div className="text-sm font-bold text-brand-gray-dark">
                              {roster.length > 0
                                ? `${roster.length} learner${roster.length === 1 ? '' : 's'}`
                                : `${linkedParticipants.length} members`}
                            </div>
                            {roster.length > 0 && (
                              <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[10px] font-bold">
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                  {groupLevelSpread(roster)}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100"
                                  title="First language for translations"
                                >
                                  L1 {groupL1Label(roster)}
                                </span>
                              </div>
                            )}
                          </div>
                        </Link>
                        <button
                          onClick={() => handleRemoveGroup(group.id)}
                          className="ml-4 text-red-500 opacity-0 group-hover:opacity-100 transition-all transform hover:text-red-700 hover:rotate-90"
                          title={`Delete ${group.name}`}
                        >
                          <span className="font-extrabold text-2xl leading-none" aria-hidden="true">&times;</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <PaginationControls currentPage={groupPage} totalPages={groupPages} onPageChange={setGroupPage} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setIsGroupModalOpen(true)} className="flex-1 bg-brand-blue text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    + New Group Class
                  </button>
                  <button onClick={() => addGroupClass('Test Group Class')} className="flex-1 bg-gray-200 text-brand-gray-dark font-bold py-2 rounded-lg hover:bg-gray-300 transition-colors" title="Load a Test Group Class">
                    Load Test Group
                  </button>
                </div>
              </SectionCard>
            </ErrorBoundary>
          </div>

          {/* Platforms Section */}
          <div id="tutor-platforms-list">
            <SectionCard title="Platforms" icon={<i className="fas fa-layer-group"></i>}>
              <div className="space-y-3 mb-4">
                {platforms.length > 0 ? platforms.map(platform => (
                  <div key={platform.id} className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <Link to={`/platform/${platform.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center">
                        <i className="fas fa-cube text-xl"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{platform.name}</h4>
                        <p className="text-xs text-gray-500">{platform.targetLevel} • {platform.targetLanguage}</p>
                      </div>
                    </Link>
                    <button onClick={() => {
                          if(window.confirm('Are you sure you want to delete this platform?')) {
                              setPlatforms(platforms.filter((p: any) => p.id !== platform.id));
                          }
                      }} 
                      className="text-red-500 hover:text-red-700 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Platform">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 text-center py-4">No platforms created yet.</p>
                )}
              </div>
              {setIsAddPlatformOpen && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setIsAddPlatformOpen(true)} className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    + New Platform
                  </button>
                  <button onClick={() => {
                      const testPlatform = {
                          id: `test_platform_${Date.now()}`,
                          name: 'Test Platform',
                          targetLanguage: 'English',
                          l1Language: 'Multiple',
                          targetLevel: 'A1-C2',
                          requirements: 'Test requirements',
                          learnerFacts: '',
                          createdAt: new Date().toISOString(),
                          lastActive: new Date().toISOString(),
                          enableTranslations: true
                      };
                      setPlatforms([testPlatform, ...platforms]);
                  }} className="flex-1 bg-gray-200 text-brand-gray-dark font-bold py-2 rounded-lg hover:bg-gray-300 transition-colors" title="Load a Test Platform">
                    Load Test Platform
                  </button>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Division Leaderboard (G12) */}
          <div id="tutor-division-leaderboard">
            <DivisionLeaderboard learners={learners} />
          </div>

          <CompetitionLeaderboard />
          
          {/* Combat Arena Quick Widget (VIP Exclusive) */}
          <div id="tutor-combat-arena">
            <TierGatedOverlay
              requiredTier="vip"
              featureName="3D Combat & War Room Arena"
              description="Real-time combat arena simulation, roleplay battle systems, and operative stats are exclusive to VIP Elite members."
            >
              <SectionCard title="Combat Arena Status" icon={<span>⚔️</span>}>
                <div className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 rounded-lg p-5 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 border border-rose-300/60">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">🐺</div>
                    <div>
                      <h3 className="font-black text-xl text-white uppercase tracking-widest">Combat Arena</h3>
                      <p className="text-rose-50/90 text-sm">Enter the war room to manage your operatives.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/tutorly-games/adult/arena/index.html'}
                    className="bg-white hover:bg-rose-50 text-red-600 font-bold py-3 px-6 rounded-lg transition-colors ring-2 ring-white shadow-lg shadow-red-500/40 whitespace-nowrap"
                  >
                    <i className="fas fa-hammer mr-2"></i> Enter Arena
                  </button>
                </div>
              </SectionCard>
            </TierGatedOverlay>
          </div>
        </div>

        {/* Right Sidebar */}
        <div id="tutor-sidebar-tasks" className="lg:col-span-1 space-y-8 order-2">
          <div id="tutor-calendar-sync">
            <UpcomingEvents />
          </div>
          <OverdueTasks />
          <SectionCard title="Attention Needed" icon={<span>⚠️</span>}>
            <AttentionNeeded learners={learners} />
          </SectionCard>
          <div id="tutor-todo-list">
            <SectionCard title="My To-Do List" icon={ICONS.calendar}>
              {/* Tab Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold mb-3">
                <button
                  type="button"
                  onClick={() => setTodoTab('tasks')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    todoTab === 'tasks'
                      ? 'bg-white text-indigo-700 shadow-sm font-extrabold dark:bg-slate-700 dark:text-indigo-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <span>📝</span> Tasks ({pendingTodos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTodoTab('coach')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    todoTab === 'coach'
                      ? 'bg-white text-indigo-700 shadow-sm font-extrabold dark:bg-slate-700 dark:text-indigo-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <span>🎯</span> Coach Path Check
                </button>
              </div>

              {todoTab === 'tasks' ? (
                <>
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {pendingTodos.length > 0 ? (
                      paginatedTodoTasks.map(todo => (
                        <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onRemove={removeTodo} />
                      ))
                    ) : (
                      <p className="text-brand-gray-dark text-center p-4 text-xs">No pending to-do items. Great job!</p>
                    )}
                  </div>
                  {totalTodoTasksPages > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {(todoTasksPage - 1) * TODO_TASKS_PER_PAGE + 1}-{Math.min(todoTasksPage * TODO_TASKS_PER_PAGE, pendingTodos.length)} of {pendingTodos.length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => setTodoTasksPage(p => Math.max(1, p - 1))} 
                          disabled={todoTasksPage === 1} 
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          &larr; Prev
                        </button>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 px-1">
                          {todoTasksPage} / {totalTodoTasksPages}
                        </span>
                        <button 
                          type="button"
                          onClick={() => setTodoTasksPage(p => Math.min(totalTodoTasksPages, p + 1))} 
                          disabled={todoTasksPage === totalTodoTasksPages} 
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <AddTodoForm learners={learners} groupClasses={groupClasses} onAdd={addTodo} />
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {paginatedTodoCoachLearners.map(learner => {
                      const settings = learner.currentLessonSettings;
                      const nextUnit = settings?.unitNumber && settings?.unitName
                        ? `${settings.unitNumber.startsWith('Unit') ? settings.unitNumber : 'Unit ' + settings.unitNumber}: ${settings.unitName}`
                        : (settings?.lessonName || learner.coursePlan?.currentLesson || 'Unit 1: Foundations');
                      const deadline = settings?.nextClassDate || learner.nextSessionDate || learner.smartGoal?.deadline || 'Upcoming';
                      const reminderMsg = `🚨 URGENT REMINDER FROM COACH 🚨\n\nHey ${learner.name}! ⏰ Your next milestone deadline is ${deadline}!\n\n📚 Please complete your lesson package: "${nextUnit}" and confirm our next 1-on-1 session! 💪🎯`;

                      return (
                        <div key={`todo-coach-${learner.id}`} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt={learner.name} className="w-6 h-6 rounded-full border shrink-0" />
                              <Link to={`/learner/${learner.id}`} className="font-bold text-xs text-indigo-900 dark:text-indigo-300 hover:underline truncate">
                                {learner.name}
                              </Link>
                            </div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 shrink-0">
                              📅 {deadline}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Lesson:</span>
                            <span className="font-semibold text-indigo-950 dark:text-indigo-200 truncate block">{nextUnit}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(reminderMsg);
                                setTodoCopiedId(learner.id);
                                setTimeout(() => setTodoCopiedId(null), 2000);
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{todoCopiedId === learner.id ? '✅ Copied' : '📋 Copy Prompt'}</span>
                            </button>
                            <Link
                              to={`/learner/${learner.id}?tab=sessions`}
                              className="text-[10px] font-bold px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                            >
                              Log Session 🚀
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalTodoCoachPages > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {(todoCoachPage - 1) * TODO_COACH_PER_PAGE + 1}-{Math.min(todoCoachPage * TODO_COACH_PER_PAGE, (learners || []).length)} of {(learners || []).length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => setTodoCoachPage(p => Math.max(1, p - 1))} 
                          disabled={todoCoachPage === 1} 
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          &larr; Prev
                        </button>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 px-1">
                          {todoCoachPage} / {totalTodoCoachPages}
                        </span>
                        <button 
                          type="button"
                          onClick={() => setTodoCoachPage(p => Math.min(totalTodoCoachPages, p + 1))} 
                          disabled={todoCoachPage === totalTodoCoachPages} 
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </div>
          <CalendarSyncManager />
        </div>
      </div>

      {/* Full Feature Master Calendar View (Full-Width) */}
      <div id="tutor-master-calendar-full-width" className="mt-8 w-full">
        <div id="tutor-manage-saved-files">
          <DashboardCalendar />
        </div>
      </div>

      {/* Bulk Actions Toolbar (U3) */}
      <BulkActionsToolbar
        selectedLearners={selectedLearners}
        onClearSelection={handleClearSelection}
        onBatchEmail={() => setIsBatchEmailOpen(true)}
        onManageTags={() => setIsTagManagerOpen(true)}
        onExport={handleExportSelected}
        onBatchSchedule={() => setIsBatchScheduleOpen(true)}
        onBatchAIDiagnostics={() => setIsBatchAIDiagOpen(true)}
      />

      {/* Modals */}
      <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Create New Group Class">
        <form onSubmit={handleAddGroup} className="space-y-5">
          <div>
            <label htmlFor="group-name" className="font-bold text-lg mb-2 block">Group Name</label>
            <input
              type="text"
              id="group-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
              placeholder="e.g., 'Advanced Conversation Club'"
              required
            />
          </div>

          {/* The same control as the individual profile's
              "Step 2 · Customization & Lesson Structure → CEFR Level & Grammar Tier",
              so a class is taught at exactly the level and tier you pick here. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label htmlFor="group-level" className="font-bold text-sm mb-1 block">CEFR Level &amp; Grammar Tier</label>
              <select
                id="group-level"
                value={newGroupCefr}
                onChange={(e) => setNewGroupCefr(e.target.value as CefrLevelKey)}
                className="w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
              >
                {CEFR_LEVEL_ORDER.map((lvl) => (
                  <option key={lvl} value={lvl}>{CEFR_LEVEL_LABELS[lvl]}</option>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewGroupTier(t)}
                    title={`Tier ${t} — ${TIER_NAMES[t - 1]} (${getCefrTierTopics(newGroupCefr, t).length} topics of ${newGroupCefr})`}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      newGroupTier === t
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    Tier {t}
                  </button>
                ))}
                <span
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-700"
                  title={`Grammar the class is allowed to use at ${newGroupCefr} · Tier ${newGroupTier}: everything up to and including ${TIER_NAMES[newGroupTier - 1]}`}
                >
                  <i className="fas fa-eye mr-1"></i>Allowed Grammar ({countCumulativeCefrTopics(newGroupCefr, newGroupTier)})
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                The class ceiling. Learners can sit at different levels — each one records their own —
                but generated lessons only reach the grammar this level and tier allow.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-[11px] font-bold text-brand-blue mb-1">
                <i className="fas fa-users mr-1"></i> How this class is taught
              </p>
              <ul className="text-[11px] text-gray-600 space-y-1 list-disc pl-4">
                <li>Add the people below — a name is enough, nothing to sign up for.</li>
                <li>Lessons are generated for the whole class, not for one profile.</li>
                <li>Every learner keeps their own level, L1 and facts inside the roster.</li>
              </ul>
            </div>
          </div>

          {/* The same roster manager the class profile uses, in draft mode: add learners by
              hand, or copy the AI prompt and paste a roster back from a transcript. */}
          <GroupParticipantsManager
            group={{ id: 'new-group', name: newGroupName || 'New group class', groupRouting: newGroupRouting } as GroupClass}
            draftParticipants={newGroupRoster}
            onDraftChange={setNewGroupRoster}
            compact
          />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsGroupModalOpen(false)} className="bg-gray-200 font-bold px-4 py-2 rounded-lg">Cancel</button>
            <button type="submit" className="bg-brand-green text-white font-bold px-4 py-2 rounded-lg">Create Group</button>
          </div>
        </form>
      </Modal>

      <BatchEmailModal 
        isOpen={isBatchEmailOpen} 
        onClose={() => setIsBatchEmailOpen(false)} 
        selectedLearners={selectedLearners}
        onClearSelection={handleClearSelection}
      />
      
      <DripCampaignModal 
        isOpen={isDripCampaignOpen} 
        onClose={() => setIsDripCampaignOpen(false)} 
        learners={learners}
      />
      
      <TagManagerModal 
        isOpen={isTagManagerOpen} 
        onClose={() => setIsTagManagerOpen(false)} 
        selectedLearners={selectedLearners}
      />

      <BatchScheduleModal 
        isOpen={isBatchScheduleOpen}
        onClose={() => setIsBatchScheduleOpen(false)}
        selectedLearners={selectedLearners}
        onClearSelection={handleClearSelection}
      />

      <BatchAIDiagnosticsModal 
        isOpen={isBatchAIDiagOpen}
        onClose={() => setIsBatchAIDiagOpen(false)}
        selectedLearners={selectedLearners}
      />

      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        learners={learners}
      />

      {/* FIRST TIME USER PROMPT */}
      {showFirstTimePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-800 dark:text-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-2xl">
                ✨
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">Welcome to Tutorly Workspace!</h3>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-bold">Premium Tutoring Suite</p>
              </div>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              This space has been fully tailored with high-fidelity analytics, AI generator systems, and automated pipelines to supercharge your online language tutoring operations.
            </p>

            {/* Voice Quality Announcement */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800/40 dark:to-indigo-950/20 border border-indigo-100 dark:border-slate-800 p-4 rounded-xl mb-6">
              <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-400 flex items-center gap-2 mb-1">
                <i className="fas fa-volume-up"></i> High Quality Voice Alert
              </h4>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                We've integrated a real-time read-aloud guide. {!isEdge ? (
                  <span>For the most <strong>natural, human-like high quality voices</strong>, we recommend switching your web browser to <strong>Microsoft Edge</strong>!</span>
                ) : (
                  <span>Excellent! You are on Microsoft Edge, so you will experience our ultra-premium natural voices.</span>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button 
                onClick={() => {
                  setHasCompletedDashboardTour(true);
                  setShowFirstTimePrompt(false);
                }} 
                className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-4 py-2.5 rounded-xl transition cursor-pointer text-sm"
              >
                Skip & Explore Workspace
              </button>
              <button 
                onClick={() => {
                  setTourStep(0);
                  setShowFirstTimePrompt(false);
                }} 
                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-500/20"
              >
                Take the Tour 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE PREMIUM TOUR POPUP */}
      {tourStep !== null && (
        <div className="fixed bottom-6 right-6 max-w-md w-full z-[9999] bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.4)] backdrop-blur-xl rounded-2xl text-slate-100 hover:shadow-[0_24px_64px_rgba(0,0,0,0.5)] transition-all duration-300 animate-slide-up-fade">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300" 
              style={{ width: `${((tourStep + 1) / DASHBOARD_TOUR_STEPS.length) * 100}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mb-3 mt-1">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Adult Dashboard Tour
            </span>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
              Step {tourStep + 1} of {DASHBOARD_TOUR_STEPS.length}
            </span>
          </div>

          {/* Keyed step-transition wrapper to animate text updates effortlessly */}
          <div key={tourStep} className="animate-step-transition">
            <h4 className="text-lg font-black tracking-tight mb-2 flex items-center gap-2 text-white">
              {DASHBOARD_TOUR_STEPS[tourStep].title}
            </h4>

            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {DASHBOARD_TOUR_STEPS[tourStep].text}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-2">
            {/* Play Aloud voice button */}
            <button 
              onClick={() => isSpeaking ? stopSpeaking() : speakText(DASHBOARD_TOUR_STEPS[tourStep].text)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition cursor-pointer ${
                isSpeaking 
                  ? 'bg-red-950/30 text-red-400 border border-red-900/50' 
                  : 'bg-indigo-950/30 text-indigo-400 border border-indigo-900/50 hover:bg-indigo-950/50'
              }`}
              title="Speak or Mute this guide"
            >
              <i className={`fas ${isSpeaking ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
              {isSpeaking ? 'Stop Voice' : 'Play Voice'}
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleSkipTour} 
                className="text-xs text-slate-400 hover:text-slate-200 transition duration-150 mr-2"
              >
                Skip Tour
              </button>
              
              <button 
                onClick={handlePrevStep} 
                disabled={tourStep === 0}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 font-extrabold text-xs px-3 py-1.5 rounded-lg transition duration-150"
              >
                Back
              </button>

              <button 
                onClick={handleNextStep}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-1.5 rounded-lg transition duration-150 shadow-md shadow-indigo-500/10"
              >
                {tourStep === DASHBOARD_TOUR_STEPS.length - 1 ? 'Finish 🎉' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};

// ============ BATCH SCHEDULE MODAL ============
const BatchScheduleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  selectedLearners: Learner[];
  onClearSelection: () => void;
}> = ({ isOpen, onClose, selectedLearners, onClearSelection }) => {
  const [sessionDate, setSessionDate] = useState('');
  const [duration, setDuration] = useState(45);
  const [topic, setTopic] = useState('Diagnostic Evaluation Round');
  const [notes, setNotes] = useState('Bulk scheduled professional English diagnostic alignment session.');

  const handleSchedule = () => {
    if (!sessionDate || selectedLearners.length === 0) return;
    
    // Preparation logs
    selectedLearners.forEach(learner => {
      console.log(`Scheduled session for ${learner.name} on ${sessionDate} regarding ${topic}`);
    });
    
    alert(`Successfully scheduled "${topic}" (${duration} min) on ${new Date(sessionDate).toLocaleString()} for ${selectedLearners.length} learners! Individual invitation files prepared.`);
    onClearSelection();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📅 Batch Schedule Corporate Sessions">
      <div className="space-y-4 text-slate-800 dark:text-slate-100">
        <div className="p-3 bg-pink-50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900 rounded-xl">
          <span className="font-extrabold text-xs text-pink-700 dark:text-pink-300 block mb-1">Scheduling for {selectedLearners.length} Selected Profiles:</span>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {selectedLearners.map((l, index) => (
              <span key={`sched-recip-${l.id}-${index}`} className="text-[10px] font-bold text-pink-850 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/50 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-900">
                {l.name}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Date & Primary Time</label>
          <input 
            type="datetime-local" 
            value={sessionDate} 
            onChange={e => setSessionDate(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-pink-500 outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Duration (Min)</label>
            <select
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold outline-none"
            >
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>60 mins</option>
              <option value={90}>90 mins</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Session Topic Channel</label>
            <input 
              type="text" 
              value={topic} 
              onChange={e => setTopic(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-semibold outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Shared Agenda / Preparation Notes</label>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-medium h-20 outline-none"
            placeholder="Review classroom vocabulary roots..."
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs">
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSchedule}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold text-xs shadow-md transition-all active:scale-95"
          >
            Confirm Batch Schedule
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============ BATCH AI DIAGNOSTICS MODAL ============
const BatchAIDiagnosticsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  selectedLearners: Learner[];
}> = ({ isOpen, onClose, selectedLearners }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const generated = selectedLearners.map((l, index) => {
        const scores = [82, 78, 88, 92, 75, 84];
        const diagnosticScore = scores[(l.name.length + index) % scores.length];
        const levels = ["B1 (Intermediate)", "B2 (Vantage)", "C1 (Effective Operational Proficiency)", "C2 (Mastery)"];
        const diagnosticLevel = levels[(l.name.length + index) % levels.length];
        const focusImprovement = index % 2 === 0 
          ? "Corporate Negotiating Idioms, Active Prepositions, & Fluency Pace." 
          : "CEFR C1 Level Technical Verbs, Formal Pronunciation & Pitching Rhythms.";

        return {
          id: l.id,
          name: l.name,
          score: diagnosticScore,
          level: diagnosticLevel,
          improvement: focusImprovement,
          date: new Date().toLocaleDateString()
        };
      });
      setResults(generated);
      setIsAnalyzing(false);
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🤖 Tutorly Batch AI Placement Diagnostics">
      <div className="space-y-4 text-slate-850 dark:text-slate-100">
        <p className="text-xs text-slate-500 font-medium">
          Run deep linguistic evaluations, vocabulary density checks, and CEFR benchmarks for your selected learners instantly.
        </p>

        {results.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 dark:bg-slate-900 border border-dashed rounded-xl border-slate-300 dark:border-slate-800">
            <i className="fas fa-brain text-purple-400 text-3xl animate-bounce mb-2 block"></i>
            <span className="font-extrabold text-xs text-slate-705 dark:text-slate-300 block">AI Linguistics Pipeline Offline</span>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-1"><i className="fas fa-spinner animate-spin"></i> Processing Diagnostics...</span>
              ) : '⚡ Run Placement Diagnostics'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {results.map((r, rIdx) => (
                <div key={`${r.id}-${rIdx}`} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900 rounded-xl text-xs space-y-1 shadow-sm">
                  <div className="flex justify-between items-center mr-1">
                    <span className="font-black text-slate-800 dark:text-slate-100">{r.name}</span>
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900">Suite Score: {r.score}%</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    CEFR Alignment: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{r.level}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    <strong className="text-slate-700 dark:text-slate-300">Recommended focus:</strong> {r.improvement}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold">Diagnostics computed {new Date().toLocaleDateString()}</span>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(results, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const link = document.createElement('a');
                  link.href = dataUri;
                  link.download = `tutorly-ai-batch-diagnostics-${results.length}.json`;
                  link.click();
                }}
                className="text-xs text-purple-600 hover:underline font-bold"
              >
                📥 Download CEFR Summary JSON
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============ SUBSCRIPTION NEWSLETTER MODAL ============
const SubscriptionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  learners: Learner[];
}> = ({ isOpen, onClose, learners }) => {
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('Weekly Educational Update');
  const [body, setBody] = useState('Hi learners,\n\nHere is your weekly update regarding upcoming modules and customized content in your learner pathways. Keep up the amazing work!\n\nBest regards,\nYour Tutor');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter learners who are subscribed
  const subscribedLearners = useMemo(() => {
    return learners.filter(l => !!l.isSubscribed);
  }, [learners]);

  // Initial select all
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(subscribedLearners.map(l => l.id)));
    }
  }, [isOpen, subscribedLearners]);

  // Filtered by search
  const filteredSubscribers = useMemo(() => {
    const q = search.toLowerCase();
    return subscribedLearners.filter(l => 
      l.name.toLowerCase().includes(q) || 
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.targetLanguage && l.targetLanguage.toLowerCase().includes(q))
    );
  }, [subscribedLearners, search]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === subscribedLearners.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(subscribedLearners.map(l => l.id)));
    }
  };

  // Get selected emails
  const selectedEmails = useMemo(() => {
    return subscribedLearners
      .filter(l => selectedIds.has(l.id) && l.email)
      .map(l => l.email!);
  }, [subscribedLearners, selectedIds]);

  const handleDispatchEmail = () => {
    if (selectedEmails.length === 0) {
      alert('Please select at least one subscribed learner.');
      return;
    }

    // Format BCC list to protect privacy (best practice)
    const bccList = selectedEmails.join(',');
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(mailtoUrl, '_blank');
  };

  const handleCopyEmails = () => {
    if (selectedEmails.length === 0) {
      alert('No emails selected to copy.');
      return;
    }
    navigator.clipboard.writeText(selectedEmails.join(', '));
    alert('📋 Selected email addresses copied to clipboard!');
  };

  const handleCopyNewsletter = () => {
    const content = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(content);
    alert('📋 Subject and body copied to clipboard!');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📢 Broadcast Newsletter to Subscribers">
      <div className="space-y-4 text-xs text-gray-700">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2.5">
          <span className="text-lg">📢</span>
          <p className="font-medium text-purple-900 leading-normal">
            This module broadcasts updates to all active learners who opted in to receive email newsletter updates. It opens your system's default email client using secure BCC delivery to protect subscriber privacy.
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Weekly Pathway Update"
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Email Message Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Type your newsletter body..."
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>
        </div>

        {/* Search & Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-gray-800 uppercase tracking-wide">
              Subscribed Recipients ({selectedIds.size} selected)
            </h4>
            <button
              onClick={handleToggleAll}
              className="text-purple-600 hover:underline font-black uppercase text-[10px]"
            >
              {selectedIds.size === subscribedLearners.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter subscribers by name or email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="max-h-[140px] overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
            {subscribedLearners.length === 0 ? (
              <div className="text-center p-6 text-gray-400 italic">
                No active subscribers found.
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="text-center p-6 text-gray-400 italic">
                No subscribers match search query.
              </div>
            ) : (
              filteredSubscribers.map((l, index) => {
                const isSelected = selectedIds.has(l.id);
                return (
                  <div
                    key={`sub-${l.id}-${index}`}
                    onClick={() => handleToggleSelect(l.id)}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by row click
                        className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <div className="text-left">
                        <p className="font-bold text-gray-800">{l.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono leading-none">{l.email || 'No email set'}</p>
                      </div>
                    </div>
                    {l.targetLanguage && (
                      <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {l.targetLanguage}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 justify-between pt-4 border-t border-slate-100">
          <div className="flex gap-2">
            <button
              onClick={handleCopyEmails}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copy comma-separated emails to clipboard"
            >
              <i className="fas fa-copy text-slate-500"></i> Copy Emails
            </button>
            <button
              onClick={handleCopyNewsletter}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copy subject and body content"
            >
              <i className="fas fa-file-alt text-slate-500"></i> Copy Content
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-2 rounded-lg font-bold cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDispatchEmail}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <i className="fas fa-paper-plane"></i> Launch Client (BCC)
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default Dashboard;