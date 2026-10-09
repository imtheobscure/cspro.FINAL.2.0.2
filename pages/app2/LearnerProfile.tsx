import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLearnerStore } from '../../store/useLearnerStore';
import { useAppStore } from '../../store/useAppStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { mapUserJsonProfileToLearnerProfile } from '../../services/profileMapper';
import { 
  Learner, 
  AIProgressReport, 
  Session, 
  CalendarEvent,
  LEVEL_TIERS,
  ACHIEVEMENTS,
  SpacedRepetitionItem,
  HomeworkAssignment,
  Challenge,
  PaymentRecord,
  ResourceItem,
  SessionTemplate,
} from '../../types2';
import { getOverallProgressReport, getAICopilotResponse } from '../../services/geminiService2';
import * as idb from 'idb-keyval';
import {
  isDiskModeEnabled,
  getStoredDirectoryHandle,
  verifyDirectoryPermission,
  readJsonFromDisk,
  writeJsonToDisk,
  readLearnerFolderFromDisk,
  writeLearnerFolderToDisk,
  syncLearnerToDisk,
  triggerAutoSync
} from '../../utils/diskStorage';
import { openLessonInsight, buildFactsFallback } from '../../utils/lessonInsightHandoff';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { format, differenceInDays, eachDayOfInterval, subDays, startOfYear, endOfYear, getDay, addDays } from 'date-fns';
import confetti from 'canvas-confetti';

import Modal from '../../components/app2/Modal';
import ProfileHeader from '../../components/app2/profile/ProfileHeader';
import PersonalInformation from '../../components/app2/profile/PersonalInformation';
import CompetencySection from '../../components/app2/profile/CompetencySection';
import NeedsAndWants from '../../components/app2/profile/NeedsAndWants';
import SessionLog from '../../components/app2/profile/SessionLog';
import SectionCard from '../../components/app2/SectionCard';
import TierGatedOverlay from '../../components/ui/TierGatedOverlay';
import { EditableCoursePlan } from '../../components/app2/profile/EditableCoursePlan';
import PrintableOverview from '../../components/app2/profile/PrintableOverview';
import AddSessionForm from '../../components/app2/profile/AddSessionForm';
import { ReviewSurveyModal } from '../../components/app2/profile/ReviewSurveyModal';
import { REVIEW_SKILLS, averageSkillRatings, countRatedReviews, formatSkillRatings } from '../../components/app2/profile/reviewSkills';
import DateActionModal from '../../components/app2/profile/DateActionModal';
import AttendanceTracker from '../../components/app2/AttendanceTracker';
import Feedback from '../../components/app2/profile/Feedback';
import LearningChallenges from '../../components/app2/profile/RecycleBin';
import FunFacts from '../../components/app2/profile/FunFacts';
import AIChatGenerator from '../../components/app2/profile/AIChatGenerator';
import CompetitionTab from '../../components/app2/profile/CompetitionTab';
import Achievements from '../../components/app2/profile/overview/Achievements';
import ProgressChart from '../../components/app2/profile/overview/ProgressChart';
import LearningPathTimeline from '../../components/app2/profile/overview/LearningPathTimeline';
import EmailComposerModal from '../../components/app2/profile/email/EmailComposerModal';
import AILessonDesigner from '../../components/app2/profile/AILessonDesigner';
import { LearnerActivityTile } from '../../components/app2/profile/LearnerActivityTile';
import { SmartGoalTrackerModal } from '../../components/app2/dashboard/SmartGoalTrackerModal';
import UpdateProfileModal from '../../components/app2/profile/UpdateProfileModal';
import { LearnerExamTile } from '../../components/app2/profile/LearnerExamTile';
import { getAvatarUrl } from '../../services/avatarService';
import { getCategoryById } from '../../data/learnerCategories';
import LearnerPage from '../../pages/LearnerPage';
import BookingSystem from '../../components/app2/profile/automation/BookingSystem';
import AutomationHub from '../../components/app2/profile/automation/AutomationHub';
import { ALL_ROLES } from '../../tutorly-games/adult/arena/src/data/roles';

// ============ UTILITY FUNCTIONS ============
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getLearnerLevel = (xp: number) => {
  return LEVEL_TIERS.find(tier => xp >= tier.minXP && xp <= tier.maxXP) || LEVEL_TIERS[0];
};

const getXPProgress = (xp: number) => {
  const level = getLearnerLevel(xp);
  if (level.maxXP === Infinity) return 100;
  return ((xp - level.minXP) / (level.maxXP - level.minXP)) * 100;
};

const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
};

// ============ INTERFACES ============
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CopilotProps {
  learner: Learner;
}

// ============ SKELETON LOADERS (O5) ============
const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

const TabSkeleton: React.FC = () => (
  <div className="space-y-4">
    <SkeletonLoader className="h-8 w-48" />
    <div className="grid grid-cols-2 gap-4">
      <SkeletonLoader className="h-32" />
      <SkeletonLoader className="h-32" />
    </div>
    <SkeletonLoader className="h-64" />
  </div>
);

// ============ ERROR BOUNDARY (O6) ============
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught React error in LearnerProfile:", error, errorInfo);
    try {
      useAppStore.getState().logError(`LearnerProfile ErrorBoundary: ${error.message}`, errorInfo?.componentStack || error.stack);
    } catch (e) {
      console.error("Failed to log error to app store", e);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-bold text-red-800">Something went wrong</h3>
          <p className="text-sm text-red-600">{this.state.error?.message}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============ SIMPLE MARKDOWN RENDERER ============
const SimpleMarkdownCopilot: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|```[\s\S]*?```)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          return <pre key={index} className="bg-gray-800 text-white p-2 rounded-md text-xs my-2 overflow-x-auto">{part.slice(3, -3).trim()}</pre>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={index} className="bg-gray-200 text-red-600 px-1 rounded-sm font-mono text-xs">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

// ============ COPILOT COMPONENT ============
const Copilot: React.FC<CopilotProps> = ({ learner }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hi! I'm your AI Copilot. Ask me anything about ${learner.name}'s profile, progress, or learning patterns.` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const userQuestionsCount = useMemo(() => {
    return messages.filter(msg => msg.role === 'user').length;
  }, [messages]);

  const compileMasterPrompt = () => {
    const userQuestions = messages
      .filter(msg => msg.role === 'user')
      .map((msg, idx) => `${idx + 1}. "${msg.content}"`)
      .join('\n');

    const competenciesSummary = (learner.competencies || [])
      .map(c => ` - ${c.name}: ${c.progress}% completed`)
      .join('\n') || ' - General level evaluation';

    const achievementsSummary = (learner.achievements || [])
      .map(a => ` - ${a.title}`)
      .join('\n') || ' - Standard progress badge';

    const needsSummary = (learner.needs || [])
      .map(n => ` - ${n.name} (Priority: ${n.priority}, Status: ${n.status})`)
      .join('\n') || ' - General skills reinforcement';

    const sessionsSummary = (learner.sessions || [])
      .map((s, idx) => ` - Class #${idx + 1}: Duration ${s.duration} mins, topic notes: "${s.topics?.join(', ') || ''}"`)
      .join('\n') || ' - Live diagnostic registration active';

    return `
You are the Ultimate AI Learner Diagnostics Assistant. You have been provided with a comprehensive student academic profile and a specific list of questions submitted by the teacher.

==================================================
STUDENT ANTHROPOLOGY PROFILE:
==================================================
- STUDENT NAME: ${learner.name}
- EMAIL ADDRESS: ${learner.email || 'N/A'}
- CURRENT LEVEL: Lvl ${learner.level || 1}
- EXPERIENCE POINTS: ${learner.xp || 100} XP
- CLASS ATTENDANCE STREAK: ${learner.streak || 5} continuous study days
- AGE/PROFILE TYPE: CEFR Adaptive Class

ACADEMIC COMPETENCY RATINGS:
${competenciesSummary}

HONORS & BADGES UNLOCKED:
${achievementsSummary}

IDENTIFIED LEARNING NEEDS / GOALS:
${needsSummary}

HISTORIC CLASSROOM RECORDS:
${sessionsSummary}

==================================================
TEACHER'S DIAGNOSTIC QUESTIONS INQUIRED:
==================================================
${userQuestions || '1. "Analyze overall academic standing of the student and suggest remedial strategies."'}

==================================================
INSTRUCTIONS FOR THE ASSIGNED AI MODEL (CRITICAL):
==================================================
1. Carefully parse the student report analytics.
2. Directly answer all of the teacher's diagnostic questions above with detailed, actionable pedagogy guides.
3. Keep your advice professional, encouraging, and highly specific to ${learner.name}.
4. At the very end of your final answer, you MUST append this exact phrase to prompt the user for visual diagrams:
"Would you like me to visualize these analysis results in the next response? I can generate a custom, beautiful standalone HTML interactive dashboard component in our next exchange to represent these results visually."
    `.trim();
  };

  const handleCopyPrompt = async () => {
    try {
      const promptText = compileMasterPrompt();
      await navigator.clipboard.writeText(promptText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      alert(`Master AI Prompt successfully generated with ${userQuestionsCount} questions and copied to clipboard!`);
    } catch (err) {
      console.error("Copilot copy fail:", err);
      alert("Failed to copy prompt automatically.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getAICopilotResponse(learner, input);
      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't get a response. Please try again." }]);
      }
    } catch (error) {
      console.error("Copilot error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred. Please check the console and try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[60vh] bg-gray-50 rounded-lg border">
      {/* Top action bar */}
      <div className="bg-white border-b px-4 py-2.5 flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
          <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse"></span>
          ACTIVE INTERACTION: {userQuestionsCount} QUESTIONS REGISTERED
        </div>
        <button
          onClick={handleCopyPrompt}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition-all ${isCopied ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'}`}
        >
          <i className={`fas ${isCopied ? 'fa-check' : 'fa-clipboard-list'}`}></i>
          {isCopied ? 'Master Prompt Copied!' : 'Copy Master AI Prompt'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <span className="text-xl w-8 h-8 flex items-center justify-center bg-brand-purple text-white rounded-full flex-shrink-0">🤖</span>}
            <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-brand-blue text-white rounded-br-none' : 'bg-white border rounded-bl-none'}`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed"><SimpleMarkdownCopilot text={msg.content} /></div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start items-start gap-2.5">
            <span className="text-xl w-8 h-8 flex items-center justify-center bg-brand-purple text-white rounded-full flex-shrink-0">🤖</span>
            <div className="p-3 rounded-lg bg-white border">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-brand-blue rounded-full"></span>
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion notice if questions asked */}
      {userQuestionsCount > 0 && (
        <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-2 text-center text-xs text-emerald-800 flex items-center justify-between gap-4">
          <span className="font-semibold text-left">
            <i className="fas fa-magic mr-1"></i>
            Done asking? Compile questions and statistics into a single highly optimized prompt for final AI analysis.
          </span>
          <button
            onClick={handleCopyPrompt}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded shadow-sm text-[11px] whitespace-nowrap"
          >
            📋 Compile & Copy Prompt
          </button>
        </div>
      )}

      <div className="p-4 border-t bg-white rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${learner.name}...`}
            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-brand-blue text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

// ============ PROGRESS LINE CHART ============
const ProgressLineChart: React.FC<{ data: { date: string; overallProgress: number }[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500">Not enough session data to display progress chart.</p>;
  }
  const chartData = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleString('en-US', { month: 'short', day: 'numeric' })
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="overallProgress" name="Overall Progress" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ============ REPORT SECTION ============
const ReportSection: React.FC<{ title: string; icon: string; color: string; children: React.ReactNode }> = ({ title, icon, color, children }) => (
  <div className={`bg-${color}-50 p-4 rounded-lg border-l-4 border-${color}-400`}>
    <h3 className={`font-extrabold text-lg text-${color}-800 mb-2 flex items-center gap-2`}>
      <i className={icon}></i>
      {title}
    </h3>
    <div className="text-gray-700 space-y-2">
      {children}
    </div>
  </div>
);

// ============ SKILL TREE VISUALIZATION (G6) ============
const SkillTreeVisualization: React.FC<{ learner: Learner }> = ({ learner }) => {
  const competencyData = learner.competencies.map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
    fullName: c.name,
    progress: c.progress,
    status: c.status,
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mastered': return '#22c55e';
      case 'Practicing': return '#3b82f6';
      case 'Learning': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <span>🌳</span> Skill Tree
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {competencyData.map((skill, idx) => (
          <div 
            key={idx}
            className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-lg cursor-pointer ${
              skill.status === 'Mastered' ? 'border-green-400 bg-green-50' :
              skill.status === 'Practicing' ? 'border-blue-400 bg-blue-50' :
              skill.status === 'Learning' ? 'border-yellow-400 bg-yellow-50 animate-pulse' :
              'border-gray-300 bg-gray-50 opacity-60'
            }`}
            title={skill.fullName}
          >
            <div className="text-center">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl mb-2 ${
                skill.status === 'Mastered' ? 'bg-green-200' :
                skill.status === 'Practicing' ? 'bg-blue-200' :
                skill.status === 'Learning' ? 'bg-yellow-200' :
                'bg-gray-200'
              }`}>
                {skill.status === 'Mastered' ? '⭐' :
                 skill.status === 'Practicing' ? '📚' :
                 skill.status === 'Learning' ? '🔥' : '🔒'}
              </div>
              <p className="font-semibold text-sm truncate">{skill.name}</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${skill.progress}%`,
                    backgroundColor: getStatusColor(skill.status)
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{skill.progress}%</p>
            </div>
            {skill.status === 'Mastered' && (
              <span className="absolute -top-2 -right-2 text-lg">✨</span>
            )}
          </div>
        ))}
      </div>
      
      {/* Radar Chart for Skills */}
      <div className="mt-6 bg-white p-4 rounded-xl border">
        <h4 className="font-bold mb-4">Skills Overview</h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={competencyData.slice(0, 8)}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar name="Progress" dataKey="progress" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============ LEARNING STREAK HEATMAP (G7) ============
const LearningStreakHeatmap: React.FC<{ sessions: Session[] }> = ({ sessions }) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'hourly'>('calendar');
  const [selectedCell, setSelectedCell] = useState<{ title: string; count: number; details: string } | null>(null);

  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  
  const sessionDates = useMemo(() => {
    const dates = new Map<string, { count: number; topics: string[]; duration: number }>();
    sessions.forEach(s => {
      if (s.attended) {
        const dateKey = format(new Date(s.date), 'yyyy-MM-dd');
        const existingVal = dates.get(dateKey) || { count: 0, topics: [], duration: 0 };
        dates.set(dateKey, {
          count: existingVal.count + 1,
          topics: [...existingVal.topics, ...(s.topics || [])],
          duration: existingVal.duration + (s.duration || 0)
        });
      }
    });
    return dates;
  }, [sessions]);

  const weeks = useMemo(() => {
    const allDays = eachDayOfInterval({ start: yearStart, end: now });
    const weekGroups: Date[][] = [];
    let currentWeek: Date[] = [];
    
    allDays.forEach(day => {
      if (getDay(day) === 0 && currentWeek.length > 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    if (currentWeek.length > 0) weekGroups.push(currentWeek);
    
    return weekGroups.slice(-52); // Last 52 weeks
  }, [yearStart, now]);

  // Map month labels aligning with the respective column index
  const colMonthLabels = useMemo(() => {
    const labels: { colIndex: number; label: string }[] = [];
    let prevMonthLabel = "";
    weeks.forEach((week, idx) => {
      if (week[0]) {
        const mLabel = format(week[0], 'MMM');
        if (mLabel !== prevMonthLabel) {
          labels.push({ colIndex: idx, label: mLabel });
          prevMonthLabel = mLabel;
        }
      }
    });
    return labels;
  }, [weeks]);

  // Hourly grid setup
  const HourlySlots = [
    { name: '🌅 Early Morning (6 AM - 10 AM)', hours: [6, 7, 8, 9] },
    { name: '☀️ Late Morning (10 AM - 1 PM)', hours: [10, 11, 12] },
    { name: '🍱 Afternoon Slot (1 PM - 5 PM)', hours: [13, 14, 15, 16] },
    { name: '🌆 Prime Evening (5 PM - 9 PM)', hours: [17, 18, 19, 20] },
    { name: '🌌 Late Night Study (9 PM - 6 AM)', hours: [21, 22, 23, 0, 1, 2, 3, 4, 5] },
  ];

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const hourlyGrid = useMemo(() => {
    // 5 slots x 7 days
    const grid = Array(5).fill(0).map(() => Array(7).fill(0));
    const detailsGrid = Array(5).fill(null).map(() => Array(7).fill(""));

    sessions.forEach(s => {
      if (s.attended && s.date) {
        try {
          const date = new Date(s.date);
          const dayIndex = (getDay(date) + 6) % 7; // Monday = 0, Sunday = 6
          const hour = date.getHours();
          
          let slotIdx = 4; // Default late night
          if (hour >= 6 && hour < 10) slotIdx = 0;
          else if (hour >= 10 && hour < 13) slotIdx = 1;
          else if (hour >= 13 && hour < 17) slotIdx = 2;
          else if (hour >= 17 && hour < 21) slotIdx = 3;

          grid[slotIdx][dayIndex]++;
          const topicsStr = s.topics && s.topics.length > 0 ? ` Topics: ${s.topics.join(', ')}.` : "";
          detailsGrid[slotIdx][dayIndex] += `• Session with ${s.duration} mins on ${format(date, 'MMM d')}.${topicsStr}\n`;
        } catch (e) {}
      }
    });

    return { counts: grid, details: detailsGrid };
  }, [sessions]);

  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 border border-transparent';
    if (count === 1) return 'bg-green-200 border border-green-300';
    if (count === 2) return 'bg-green-400 border border-green-500';
    if (count >= 3) return 'bg-green-600 text-white border border-green-700';
    return 'bg-gray-100 border border-transparent';
  };

  const totalSessions = sessions.filter(s => s.attended).length;
  
  const currentStreak = useMemo(() => {
    let streak = 0;
    let checkDate = now;
    const sDates = new Map<string, boolean>();
    sessions.forEach(s => {
      if (s.attended) sDates.set(format(new Date(s.date), 'yyyy-MM-dd'), true);
    });
    
    while (true) {
      const dateKey = format(checkDate, 'yyyy-MM-dd');
      if (sDates.has(dateKey)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else if (streak === 0) {
        checkDate = subDays(checkDate, 1);
        if (differenceInDays(now, checkDate) > 7) break;
      } else {
        break;
      }
    }
    return streak;
  }, [sessions, now]);

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <span className="text-xl">📊</span> Learning Frequency Dashboard
          </h3>
          <p className="text-xs text-slate-500">Analyze peak learner activity hours, weekday loyalty, and continuous streaks</p>
        </div>
        <div className="flex gap-3 text-sm items-center">
          <div className="bg-orange-50 text-orange-700 font-extrabold px-3 py-1.5 rounded-full border border-orange-100 text-xs flex items-center gap-1">
            🔥 {currentStreak} Day Study Streak
          </div>
          <div className="bg-emerald-50 text-emerald-800 font-extrabold px-3 py-1.5 rounded-full border border-emerald-100 text-xs flex items-center gap-1">
            🟩 {totalSessions} Year Sessions
          </div>
        </div>
      </div>

      {/* Grid Mode Selection */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/40">
        <button
          onClick={() => { setViewMode('calendar'); setSelectedCell(null); }}
          className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-505 hover:text-slate-900'}`}
        >
          📅 Annual Activity Calendar
        </button>
        <button
          onClick={() => { setViewMode('hourly'); setSelectedCell(null); }}
          className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${viewMode === 'hourly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-505 hover:text-slate-900'}`}
        >
          ⏰ Hourly Time Slot Distribution
        </button>
      </div>
      
      {/* 1. Annual Calendar Grid */}
      {viewMode === 'calendar' && (
        <div className="relative pt-2">
          {/* Month headers Row */}
          <div className="relative h-5 ml-8 mb-1 overflow-visible text-[10px] font-extrabold text-slate-400 font-mono text-left select-none">
            {colMonthLabels.map((lbl, idx) => (
              <span 
                key={idx} 
                style={{ left: `${lbl.colIndex * 13.5}px` }} 
                className="absolute"
              >
                {lbl.label}
              </span>
            ))}
          </div>

          <div className="flex gap-2 min-w-max">
            {/* Weekday indicator labels column */}
            <div className="flex flex-col justify-around text-[9px] text-slate-400 font-bold w-6 pr-1 h-[91px] select-none font-mono text-right leading-none">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
              <span>Sun</span>
            </div>

            {/* Standard github grid columns */}
            <div className="flex gap-[2px]">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[2px]">
                  {[1, 2, 3, 4, 5, 6, 0].map(dayOfWeek => {
                    const day = week.find(d => getDay(d) === dayOfWeek);
                    if (!day) return <div key={dayOfWeek} className="w-[11px] h-[11px] bg-transparent" />;
                    
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const stats = sessionDates.get(dateKey) || { count: 0, topics: [], duration: 0 };
                    
                    return (
                      <div
                        key={dayOfWeek}
                        onClick={() => {
                          setSelectedCell({
                            title: format(day, 'MMMM d, yyyy'),
                            count: stats.count,
                            details: stats.count > 0 
                              ? `Completed ${stats.count} class session(s) spanning ${stats.duration} minutes.\nTopics discussed: ${stats.topics.length > 0 ? Array.from(new Set(stats.topics)).join(', ') : 'Grammar syntax structures and oral vocabulary drills.'}`
                              : 'No learning logs compiled on this date. Schedule an active lesson to record attendance.'
                          });
                        }}
                        className={`w-[11.5px] h-[11.5px] rounded-sm ${getIntensityColor(stats.count)} cursor-pointer transition-all hover:scale-125 hover:ring-2 hover:ring-indigo-500`}
                        title={`${format(day, 'MMM d, yyyy')}: ${stats.count} session${stats.count !== 1 ? 's' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-2 ml-8">
            <span>Less</span>
            <div className="w-2.5 h-2.5 bg-gray-100 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-green-200 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-green-400 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-green-600 rounded-sm" />
            <span>More</span>
          </div>
        </div>
      )}

      {/* 2. Hourly Slots Grid view */}
      {viewMode === 'hourly' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100">
            <thead>
              <tr className="bg-slate-100/50 border-b border-slate-200/60">
                <th className="p-3 text-left text-[10px] uppercase tracking-wider font-extrabold text-slate-500 font-mono w-[220px]">Time Slot</th>
                {weekdays.map((day, dIdx) => (
                  <th key={dIdx} className="p-3 text-center text-xs font-bold text-slate-700">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HourlySlots.map((slot, slotIdx) => (
                <tr key={slotIdx} className="border-b border-slate-200/40 hover:bg-slate-100/10">
                  <td className="p-3 text-xs font-bold text-slate-600 bg-white border-r border-slate-100 pr-2 font-mono flex items-center gap-1.5 h-full min-h-[48px]">
                    {slot.name}
                  </td>
                  {weekdays.map((day, dIdx) => {
                    const count = hourlyGrid.counts[slotIdx][dIdx];
                    const rawDetails = hourlyGrid.details[slotIdx][dIdx];
                    return (
                      <td key={dIdx} className="p-2 text-center">
                        <button
                          onClick={() => {
                            setSelectedCell({
                              title: `${slot.name} on ${day}s`,
                              count: count,
                              details: count > 0 
                                ? `Found ${count} attended lessons matching this period:\n${rawDetails}`
                                : 'No lessons have occurred inside this hour slot on Tuesdays.'
                            });
                          }}
                          className={`w-full max-w-[50px] mx-auto p-1.5 rounded-lg text-[10px] font-black transition-all ${
                            count === 0 
                              ? 'bg-slate-100 text-slate-400 hover:bg-slate-200/70' 
                              : count === 1 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                : count === 2 
                                  ? 'bg-emerald-300 text-emerald-950 px-2' 
                                  : 'bg-emerald-500 text-white shadow-sm'
                          }`}
                        >
                          {count}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Cell details card */}
      {selectedCell && (
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl slide-down flex flex-col gap-1 shadow-inner text-left">
          <div className="flex justify-between items-center border-b border-indigo-100/60 pb-1.5 mb-1.5">
            <h4 className="font-extrabold text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1">
              <i className="fas fa-calendar-check text-indigo-500"></i> {selectedCell.title}
            </h4>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${selectedCell.count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
              {selectedCell.count} Session{selectedCell.count !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-line font-medium">
            {selectedCell.details}
          </p>
        </div>
      )}
    </div>
  );
};

// ============ PERSONAL RECORDS & MILESTONES (G8) ============
const PersonalRecords: React.FC<{ learner: Learner }> = ({ learner }) => {
  const records = useMemo(() => {
    const attendedSessions = learner.sessions.filter(s => s.attended);
    
    // Calculate longest streak from sessions
    let maxStreak = 0;
    let currentStreak = 0;
    const sortedDates = attendedSessions
      .map(s => new Date(s.date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const diff = differenceInDays(sortedDates[i], sortedDates[i - 1]);
        if (diff <= 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    // Most sessions in a week
    const weekCounts = new Map<string, number>();
    attendedSessions.forEach(s => {
      const weekStart = format(subDays(new Date(s.date), getDay(new Date(s.date))), 'yyyy-MM-dd');
      weekCounts.set(weekStart, (weekCounts.get(weekStart) || 0) + 1);
    });
    const maxWeeklySessions = Math.max(...Array.from(weekCounts.values()), 0);

    // Total learning hours
    const totalHours = attendedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;

    return {
      totalSessions: attendedSessions.length,
      longestStreak: maxStreak,
      currentStreak: learner.streak,
      maxWeeklySessions,
      totalHours: Math.round(totalHours * 10) / 10,
      totalXP: learner.xp,
      level: getLearnerLevel(learner.xp),
    };
  }, [learner]);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <span>🏆</span> Personal Records
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-100 to-orange-100 p-4 rounded-xl border border-yellow-200">
          <p className="text-3xl font-extrabold text-yellow-700">{records.longestStreak}</p>
          <p className="text-sm text-yellow-800 font-semibold">Longest Streak</p>
          <p className="text-xs text-yellow-600">days in a row</p>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-4 rounded-xl border border-blue-200">
          <p className="text-3xl font-extrabold text-blue-700">{records.totalSessions}</p>
          <p className="text-sm text-blue-800 font-semibold">Total Sessions</p>
          <p className="text-xs text-blue-600">completed</p>
        </div>
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-4 rounded-xl border border-purple-200">
          <p className="text-3xl font-extrabold text-purple-700">{records.totalHours}h</p>
          <p className="text-sm text-purple-800 font-semibold">Learning Time</p>
          <p className="text-xs text-purple-600">total hours</p>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-teal-100 p-4 rounded-xl border border-green-200">
          <p className="text-3xl font-extrabold text-green-700">{records.maxWeeklySessions}</p>
          <p className="text-sm text-green-800 font-semibold">Best Week</p>
          <p className="text-xs text-green-600">sessions</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-100 to-violet-100 p-4 rounded-xl border border-indigo-200">
          <p className="text-3xl font-extrabold text-indigo-700">{records.totalXP}</p>
          <p className="text-sm text-indigo-800 font-semibold">Total XP</p>
          <p className="text-xs text-indigo-600">earned</p>
        </div>
        <div className="bg-gradient-to-br from-rose-100 to-red-100 p-4 rounded-xl border border-rose-200">
          <p className="text-3xl font-extrabold text-rose-700">{records.level.icon}</p>
          <p className="text-sm text-rose-800 font-semibold">{records.level.name}</p>
          <p className="text-xs text-rose-600">current level</p>
        </div>
      </div>
    </div>
  );
};

// ============ CHALLENGE BOARD (G9) ============
const ChallengeBoard: React.FC<{ learner: Learner }> = ({ learner }) => {
  const challenges = useAutomationStore(state => state.challenges);
  const addChallenge = useAutomationStore(state => state.addChallenge);
  const updateChallengeProgress = useAutomationStore(state => state.updateChallengeProgress);
  
  const learnerChallenges = challenges.filter(c => c.learnerId === learner.id || !c.learnerId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    target: 5,
    xpReward: 50,
    category: 'sessions' as const,
  });

  const handleAddChallenge = () => {
    addChallenge({
      ...newChallenge,
      learnerId: learner.id,
      type: 'custom',
      current: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    });
    setNewChallenge({ title: '', description: '', target: 5, xpReward: 50, category: 'sessions' });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span>🎯</span> Challenge Board
        </h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-purple text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-purple-600"
        >
          + New Challenge
        </button>
      </div>

      {showAddForm && (
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3 animate-fade-in">
          <input
            type="text"
            placeholder="Challenge title..."
            value={newChallenge.title}
            onChange={e => setNewChallenge({ ...newChallenge, title: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
          <textarea
            placeholder="Description..."
            value={newChallenge.description}
            onChange={e => setNewChallenge({ ...newChallenge, description: e.target.value })}
            className="w-full p-2 border rounded-lg h-20"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold">Target</label>
              <input
                type="number"
                value={newChallenge.target}
                onChange={e => setNewChallenge({ ...newChallenge, target: parseInt(e.target.value) || 1 })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">XP Reward</label>
              <input
                type="number"
                value={newChallenge.xpReward}
                onChange={e => setNewChallenge({ ...newChallenge, xpReward: parseInt(e.target.value) || 10 })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Category</label>
              <select
                value={newChallenge.category}
                onChange={e => setNewChallenge({ ...newChallenge, category: e.target.value as any })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="sessions">Sessions</option>
                <option value="xp">XP</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="homework">Homework</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAddChallenge}
            className="w-full bg-brand-purple text-white py-2 rounded-lg font-bold"
          >
            Create Challenge
          </button>
        </div>
      )}

      <div className="space-y-3">
        {learnerChallenges.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No challenges yet. Create one to motivate your learner!</p>
        ) : (
          learnerChallenges.map(challenge => (
            <div 
              key={challenge.id} 
              className={`p-4 rounded-xl border-2 transition-all ${
                challenge.status === 'completed' ? 'bg-green-50 border-green-300' :
                challenge.status === 'active' ? 'bg-white border-purple-200 hover:border-purple-400' :
                'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold flex items-center gap-2">
                    {challenge.title}
                    {challenge.status === 'completed' && <span>✅</span>}
                  </h4>
                  <p className="text-sm text-gray-600">{challenge.description}</p>
                </div>
                <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full font-bold">
                  +{challenge.xpReward} XP
                </span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span className="font-bold">{challenge.current} / {challenge.target}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      challenge.status === 'completed' ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}
                    style={{ width: `${Math.min((challenge.current / challenge.target) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {challenge.status === 'active' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => updateChallengeProgress(challenge.id, 1)}
                    className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded font-semibold hover:bg-purple-200"
                  >
                    +1 Progress
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============ SPACED REPETITION MANAGER (A6) ============
const SpacedRepetitionManager: React.FC<{ learner: Learner }> = ({ learner }) => {
  const spacedRepetitionItems = useAutomationStore(state => state.spacedRepetitionItems);
  const addSpacedRepetitionItem = useAutomationStore(state => state.addSpacedRepetitionItem);
  const markItemReviewed = useAutomationStore(state => state.markItemReviewed);
  
  const learnerItems = spacedRepetitionItems.filter(item => item.learnerId === learner.id);
  const dueItems = learnerItems.filter(item => 
    item.status === 'active' && new Date(item.nextReviewDate) <= new Date()
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ content: '', type: 'vocabulary' as const });

  const handleAddItem = () => {
    if (!newItem.content.trim()) return;
    addSpacedRepetitionItem({
      learnerId: learner.id,
      sessionId: '',
      content: newItem.content,
      type: newItem.type,
      intervals: [1, 3, 7, 14, 30],
      currentInterval: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timesReviewed: 0,
      status: 'active',
    });
    setNewItem({ content: '', type: 'vocabulary' });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span>🧠</span> Spaced Repetition
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-blue text-white px-3 py-1 rounded-lg text-sm font-bold"
        >
          + Add Item
        </button>
      </div>

      {dueItems.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
          <h4 className="font-bold text-orange-800 mb-2">🔔 {dueItems.length} items due for review!</h4>
          <div className="space-y-2">
            {dueItems.slice(0, 5).map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                <div>
                  <p className="font-semibold">{item.content}</p>
                  <p className="text-xs text-gray-500">Reviewed {item.timesReviewed} times</p>
                </div>
                <button
                  onClick={() => markItemReviewed(item.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold"
                >
                  ✓ Reviewed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
          <input
            type="text"
            placeholder="Word, phrase, or concept..."
            value={newItem.content}
            onChange={e => setNewItem({ ...newItem, content: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
          <select
            value={newItem.type}
            onChange={e => setNewItem({ ...newItem, type: e.target.value as any })}
            className="w-full p-2 border rounded-lg"
          >
            <option value="vocabulary">Vocabulary</option>
            <option value="grammar">Grammar</option>
            <option value="phrase">Phrase</option>
            <option value="concept">Concept</option>
          </select>
          <button onClick={handleAddItem} className="w-full bg-brand-blue text-white py-2 rounded-lg font-bold">
            Add to Review Queue
          </button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="font-semibold">All Items ({learnerItems.length})</h4>
        {learnerItems.slice(0, 10).map(item => (
          <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">{item.content}</p>
              <p className="text-xs text-gray-500">
                Next review: {format(new Date(item.nextReviewDate), 'MMM d')} • 
                {item.status === 'mastered' ? ' ⭐ Mastered' : ` Interval: ${item.intervals[item.currentInterval]} days`}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              item.status === 'mastered' ? 'bg-green-100 text-green-800' :
              item.status === 'active' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {item.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ HOMEWORK MANAGER (A9) ============
const HomeworkManager: React.FC<{ learner: Learner }> = ({ learner }) => {
  const homeworkAssignments = useAutomationStore(state => state.homeworkAssignments);
  const addHomework = useAutomationStore(state => state.addHomework);
  const gradeHomework = useAutomationStore(state => state.gradeHomework);
  const submitHomework = useAutomationStore(state => state.submitHomework);
  
  const learnerHomework = homeworkAssignments.filter(h => h.learnerId === learner.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    xpReward: 25,
  });

  const handleAddHomework = () => {
    if (!newHomework.title.trim()) return;
    addHomework({
      learnerId: learner.id,
      ...newHomework,
      status: 'assigned',
    });
    setNewHomework({
      title: '',
      description: '',
      dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      xpReward: 25,
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span>📝</span> Homework Assignments
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-green text-white px-3 py-1 rounded-lg text-sm font-bold"
        >
          + Assign Homework
        </button>
      </div>

      {showAddForm && (
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-3 animate-fade-in">
          <input
            type="text"
            placeholder="Homework title..."
            value={newHomework.title}
            onChange={e => setNewHomework({ ...newHomework, title: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
          <textarea
            placeholder="Description and instructions..."
            value={newHomework.description}
            onChange={e => setNewHomework({ ...newHomework, description: e.target.value })}
            className="w-full p-2 border rounded-lg h-24"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Due Date</label>
              <input
                type="date"
                value={newHomework.dueDate}
                onChange={e => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">XP Reward</label>
              <input
                type="number"
                value={newHomework.xpReward}
                onChange={e => setNewHomework({ ...newHomework, xpReward: parseInt(e.target.value) || 10 })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
          <button onClick={handleAddHomework} className="w-full bg-brand-green text-white py-2 rounded-lg font-bold">
            Assign Homework
          </button>
        </div>
      )}

      <div className="space-y-3">
        {learnerHomework.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No homework assigned yet.</p>
        ) : (
          learnerHomework.map(hw => (
            <div 
              key={hw.id}
              className={`p-4 rounded-xl border-2 ${
                hw.status === 'reviewed' ? 'bg-green-50 border-green-300' :
                hw.status === 'submitted' ? 'bg-blue-50 border-blue-300' :
                hw.status === 'overdue' ? 'bg-red-50 border-red-300' :
                'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold">{hw.title}</h4>
                  <p className="text-sm text-gray-600">{hw.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Due: {format(new Date(hw.dueDate), 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    hw.status === 'reviewed' ? 'bg-green-200 text-green-800' :
                    hw.status === 'submitted' ? 'bg-blue-200 text-blue-800' :
                    hw.status === 'overdue' ? 'bg-red-200 text-red-800' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {hw.status}
                  </span>
                  <p className="text-sm font-bold text-purple-600 mt-1">+{hw.xpReward} XP</p>
                </div>
              </div>
              {hw.status === 'submitted' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => gradeHomework(hw.id, 100, 'Great work!')}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => gradeHomework(hw.id, 50, 'Needs improvement')}
                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm font-bold"
                  >
                    Revise
                  </button>
                </div>
              )}
              {hw.feedback && (
                <div className="mt-3 p-2 bg-white rounded-lg border">
                  <p className="text-sm"><strong>Feedback:</strong> {hw.feedback}</p>
                  {hw.grade !== undefined && <p className="text-sm"><strong>Grade:</strong> {hw.grade}%</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============ OLD PAYMENT TRACKER REMOVED ============

// ============ RESOURCE LIBRARY (U8) ============
const ResourceLibrary: React.FC<{ learner: Learner }> = ({ learner }) => {
  const resources = useAutomationStore(state => state.resources);
  const addResource = useAutomationStore(state => state.addResource);
  const removeResource = useAutomationStore(state => state.removeResource);
  
  const learnerResources = resources.filter(r => r.learnerId === learner.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '',
    url: '',
    type: 'link' as const,
    topic: '',
  });

  const handleAddResource = () => {
    if (!newResource.name || !newResource.url) return;
    addResource({
      learnerId: learner.id,
      ...newResource,
    });
    setNewResource({ name: '', url: '', type: 'link', topic: '' });
    setShowAddForm(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'file': return '📁';
      default: return '🔗';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span>📚</span> Resource Library
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-blue text-white px-3 py-1 rounded-lg text-sm font-bold"
        >
          + Add Resource
        </button>
      </div>

      {showAddForm && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3 animate-fade-in">
          <input
            type="text"
            placeholder="Resource name..."
            value={newResource.name}
            onChange={e => setNewResource({ ...newResource, name: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
          <input
            type="url"
            placeholder="URL or link..."
            value={newResource.url}
            onChange={e => setNewResource({ ...newResource, url: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={newResource.type}
              onChange={e => setNewResource({ ...newResource, type: e.target.value as any })}
              className="p-2 border rounded-lg"
            >
              <option value="link">Link</option>
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="file">File</option>
            </select>
            <input
              type="text"
              placeholder="Topic (optional)"
              value={newResource.topic}
              onChange={e => setNewResource({ ...newResource, topic: e.target.value })}
              className="p-2 border rounded-lg"
            />
          </div>
          <button onClick={handleAddResource} className="w-full bg-brand-blue text-white py-2 rounded-lg font-bold">
            Add Resource
          </button>
        </div>
      )}

      <div className="space-y-2">
        {learnerResources.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No resources added yet.</p>
        ) : (
          learnerResources.map(resource => (
            <div key={resource.id} className="flex justify-between items-center p-3 bg-white rounded-lg border hover:bg-gray-50">
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{getTypeIcon(resource.type)}</span>
                <div>
                  <p className="font-semibold text-brand-blue hover:underline">{resource.name}</p>
                  {resource.topic && <p className="text-xs text-gray-500">{resource.topic}</p>}
                </div>
              </a>
              <button
                onClick={() => removeResource(resource.id)}
                className="text-red-500 hover:text-red-700 p-2"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============ SESSION TEMPLATE SELECTOR (U9) ============
const SessionTemplateSelector: React.FC<{ onSelect: (template: SessionTemplate) => void }> = ({ onSelect }) => {
  const sessionTemplates = useAutomationStore(state => state.sessionTemplates);

  return (
    <div className="space-y-3">
      <h4 className="font-bold">Quick Templates</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sessionTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border text-left transition-colors"
          >
            <p className="font-semibold">{template.name}</p>
            <p className="text-xs text-gray-500">{template.category} • {template.defaultDuration} min</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============ COMPARISON VIEW (U10) ============
const ComparisonView: React.FC<{ learner: Learner; allLearners: Learner[] }> = ({ learner, allLearners }) => {
  const averageXP = allLearners.reduce((sum, l) => sum + l.xp, 0) / allLearners.length;
  const averageStreak = allLearners.reduce((sum, l) => sum + l.streak, 0) / allLearners.length;
  const averageSessions = allLearners.reduce((sum, l) => sum + l.sessions.filter(s => s.attended).length, 0) / allLearners.length;

  const learnerSessions = learner.sessions.filter(s => s.attended).length;

  const comparisonData = [
    { metric: 'XP', learner: learner.xp, average: Math.round(averageXP) },
    { metric: 'Streak', learner: learner.streak, average: Math.round(averageStreak) },
    { metric: 'Sessions', learner: learnerSessions, average: Math.round(averageSessions) },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <span>📊</span> Comparison with Class Average
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {comparisonData.map(data => {
          const diff = data.learner - data.average;
          const isAbove = diff > 0;
          return (
            <div key={data.metric} className="bg-white p-4 rounded-xl border text-center">
              <p className="text-sm text-gray-500">{data.metric}</p>
              <p className="text-2xl font-extrabold">{data.learner}</p>
              <p className={`text-sm font-semibold ${isAbove ? 'text-green-600' : 'text-red-600'}`}>
                {isAbove ? '↑' : '↓'} {Math.abs(diff).toFixed(0)} vs avg
              </p>
              <p className="text-xs text-gray-400">Avg: {data.average}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ CELEBRATION ANIMATION (G11) ============
const useCelebration = (learner: Learner | undefined) => {
  const previousXP = useRef(learner?.xp || 0);
  const previousLevel = useRef(learner ? getLearnerLevel(learner.xp).level : 1);

  useEffect(() => {
    if (!learner) return;
    const currentLevel = getLearnerLevel(learner.xp).level;
    
    // Level up celebration
    if (currentLevel > previousLevel.current) {
      triggerConfetti();
    }
    
    // XP milestone celebration
    const milestones = [100, 250, 500, 1000, 2000, 3000];
    milestones.forEach(milestone => {
      if (previousXP.current < milestone && learner.xp >= milestone) {
        triggerConfetti();
      }
    });

    previousXP.current = learner.xp;
    previousLevel.current = currentLevel;
  }, [learner?.xp]);
};

// ============ MAIN TYPES ============
type ActiveTab = 'profile' | 'overview' | 'activity' | 'calendar' | 'feedback' | 'competition' | 'automation' | 'generator';
type OverviewSubTab = 'overview' | 'achievements' | 'progress' | 'learningPath';
type ActivitySubTab = 'history' | 'designer' | 'homework' | 'exam' | 'gallery' | 'reviews' | 'lesson-insight';
type FeedbackSubTab = 'feedback' | 'challenges' | 'facts' | 'chat' | 'copilot';
type AutomationSubTab = 'hub' | 'payments' | 'resources' | 'comparison';

// ============ MAIN COMPONENT ============
interface App1ProfileProps {
    learners?: any[]; 
    setLearners?: any;
    allContent?: any;
    setAllContent?: any;
    recentLearnerIds?: any;
    setRecentLearnerIds?: any;
    platforms?: any[];
    tutorProfile?: any;
}

// Premium Interactive Tour Steps for Learner Profile
const LEARNER_PROFILE_TOUR_STEPS = [
  {
    title: "👤 Learner Header & Gamified Status",
    text: "At the top of the profile, you can see the student's primary statistics. This includes their CEFR level, current experience points (XP), and live streak count. There are also premium action buttons to generate comprehensive progress reports, email students directly, or synchronize local directory backups.",
    tab: "profile",
    selector: "tutor-profile-header-main"
  },
  {
    title: "📊 Core Competencies & CEFR Skills",
    text: "This section tracks five core language competencies: Speaking, Listening, Pronunciation, Grammar, and Writing. Each skill is rated out of 5 stars with progress percentages. You can click on any competency to manually increase progress, update CEFR status, or review a timeline of historic skill entries.",
    tab: "profile",
    selector: "profile-competency-section"
  },
  {
    title: "📋 Personal Syllabus Section",
    text: "The Personal Syllabus defines a structured course path! Each chapter contains customized milestone criteria, vocabulary words, target grammar structures, reading comprehension lengths, and completion checkboxes. Click 'Create Syllabus' to copy an AI prompt configured with student metrics, or click 'Paste JSON' to update chapters directly.",
    tab: "profile",
    selector: "personal-syllabus-section"
  },
  {
    title: "⚙️ Personal Information & Target Settings",
    text: "Here you can define basic parameters for this student: contact email, target CEFR goals, native language (L1), target language (L2), and overall streak overrides. This maps their basic identities and shapes how lessons are framed.",
    tab: "profile",
    selector: "profile-personal-info"
  },
  {
    title: "🎯 Needs, Wants & Fact Sheets",
    text: "Specify your student's unique background facts here! You can add their professional occupation, learning style preferences, specific target topics, or detailed focus lists (e.g., 'preparing for a presentation next Tuesday'). The AI will draw directly from these facts to personalize any generated lesson asset.",
    tab: "profile",
    selector: "profile-needs-wants"
  },
  {
    title: "📖 Customized Course Plan & Class Schedule",
    text: "This is the active Course Plan and schedule! Update the lesson duration (e.g., 60 minutes), frequency of classes (e.g., twice a week), total target sessions, and check off completed lessons as you advance. This aligns booking slots and lessons with syllabus goals.",
    tab: "profile",
    selector: "profile-course-plan"
  },
  {
    title: "💻 Lesson Hub - Automatic Lesson Generator",
    text: "The main Lessons tab handles all material generation. Under the 'Automatic' generator tab, you can compile custom lesson plans by pasting raw texts, websites, or YouTube video URLs! Select whether you want to build a music lesson or an interactive video, then click compile.",
    tab: "generator",
    selector: "learner-page-automatic-generator"
  },
  {
    title: "🛠️ Lesson Creator - Custom Lesson Structure",
    text: "Step 1: In the Lesson Creator sub-tab, select a standard template structure (such as English Lesson V2 or Official printable worksheet), toggle interactive game modes (such as Flashcards, Debate, or Word Association), and specify content density parameters.",
    tab: "generator",
    selector: "manual-tour-select-content-type"
  },
  {
    title: "📖 Lesson Creator - Syllabus Integration",
    text: "Step 2: Bind the lesson to the student's personal syllabus! Toggle the checkboxes for targeted chapters and goals from the Learner Path. This tells the generator which specific milestones, grammar concepts, and vocabulary lists should be included in the generation criteria.",
    tab: "generator",
    selector: "manual-tour-syllabus-integration"
  },
  {
    title: "📋 Lesson Creator - Custom Prompts",
    text: "Step 3: Click the 'Copy Prompt' button! This instantly builds a detailed, context-aware prompt complete with student level, target chapters, and JSON schema structure rules. Simply paste this prompt into Gemini or any LLM to generate the perfectly structured lesson plan file.",
    tab: "generator",
    selector: "manual-tour-copy-prompt"
  },
  {
    title: "🔍 Lesson Creator - Paste & Validate JSON",
    text: "Step 4: Paste the generated JSON block into the input text box! The built-in real-time validation console automatically scans the input to confirm that it has a fully valid JSON format, meets schema parsing standards, and is clean of syntax errors.",
    tab: "generator",
    selector: "manual-tour-paste-json"
  },
  {
    title: "⚙️ Lesson Creator - Lesson Settings Customization",
    text: "Step 5: Switch to the Lesson Settings tab! Here, you can manually customize user-facing parameters including the custom lesson name, primary theme color, target vocabulary density level, dialogue parameters, and interactive quiz size constraints.",
    tab: "generator",
    selector: "learner-page-lesson-settings"
  },
  {
    title: "🚀 Lesson Creator - Render Content",
    text: "Step 6: Click 'Render Content' to compile your manual settings, or 'Render with AI' to let Gemini process it instantly! This renders the full lesson preview including custom dialogues, vocabulary definitions, gap-fill sentences, and reflection questions.",
    tab: "generator",
    selector: "manual-tour-render-buttons"
  },
  {
    title: "💾 Lesson Creator - Save & Send to Learner",
    text: "Step 7: Click 'Publish & Save' to permanently store the generated lesson inside the student's Saved Lessons history list. Tutors can download the lesson as a standalone interactive app or send it directly to the learner's device for instant offline practice!",
    tab: "generator",
    selector: "manual-tour-publish-and-save"
  },
  {
    title: "📁 Lesson Gallery & Saved Lessons",
    text: "The Saved Lessons and Gallery tabs keep a safe history of all customized materials you have built or downloaded. Tutors can quickly inspect previously saved lessons, publish them to student folders, track publisher versions, and recycle templates across multiple classes.",
    tab: "generator",
    selector: "learner-page-saved-lessons"
  },
  {
    title: "📈 Printable Student Overview & Study Heatmap",
    text: "Let's review student progress! Switch to the Overview tab. The 'Overview' sub-tab lists all diagnostics, personal interests, upcoming classes, and competency grades in one unified dashboard, ready to be saved as a clean PDF or printed. The study heatmap (annual activity grid) now lives inside the Calendar tab, right below the calendars.",
    tab: "overview",
    overviewSubTab: "overview",
    selector: "learner-profile-tab-content"
  },
  {
    title: "🏆 Milestone Achievement Badges",
    text: "The 'Achievements' sub-tab lists custom reward badges earned by this student. You can award personalized accolades (like 'Presentation Master' or 'Grammar King') complete with descriptive titles and emoji illustrations to motivate learning.",
    tab: "overview",
    overviewSubTab: "achievements",
    selector: "learner-profile-tab-content"
  },
  {
    title: "📊 Dynamic Practice Growth Charts",
    text: "Under the 'Progress' sub-tab of Overview, review detailed line charts representing XP velocity, homework marks, and weekly target progress. These graphs display real-time comparisons with overall class cohort benchmarks.",
    tab: "overview",
    overviewSubTab: "progress",
    selector: "learner-profile-tab-content"
  },
  {
    title: "🛣️ Syllabus Learning Path Timeline",
    text: "The Learning Path sub-tab displays a chronological timeline of syllabus milestones, historical chapters completed, and projected lesson paths to guide both the tutor and student through visual progress.",
    tab: "overview",
    overviewSubTab: "learningPath",
    selector: "learner-profile-tab-content"
  },
  {
    title: "📋 Completed Session History logs",
    text: "Switching to the Sessions tab. The 'Session History' lists chronological logs of all past classes. Tutors can record the duration, topic title, native text dialogues, lesson notes, positive praise items, and grammar points requiring attention.",
    tab: "activity",
    activitySubTab: "history",
    selector: "learner-profile-tab-content"
  },
  {
    title: "📝 Interactive Homework Management",
    text: "Under the 'Homework' sub-tab of Sessions, create custom homework tasks! You can specify target due dates, allocate XP rewards, define lesson goals, and track completion states. Once a student submits homework, you can grade their submissions directly.",
    tab: "activity",
    activitySubTab: "homework",
    selector: "learner-profile-tab-content"
  },
  {
    title: "⭐ Review Evaluations & AI Sentiment Analyzer",
    text: "The 'Reviews' sub-tab allows students to submit lesson feedback surveys. You can copy these ratings and paste them into our automated AI Sentiment Analyzer box to instantly map satisfaction rates and learning recommendations.",
    tab: "activity",
    activitySubTab: "reviews",
    selector: "learner-profile-tab-content"
  },
  {
    title: "🗓️ Calendar Syncer & Booking Schedule",
    text: "The Calendar tab displays a beautiful personal booking board. Tutors can schedule lesson reservations, configure daily availability grids, and synchronize active lesson slots with standard Google Calendar or Apple iCal feeds.",
    tab: "calendar",
    selector: "learner-profile-tab-content"
  },
  {
    title: "✉️ Automated Holiday Greeting Generator",
    text: "At the bottom of the Calendar page, you can review upcoming student birthdays and country holidays. Tutors can click 'Generate greeting' to compile personalized, level-appropriate congratulatory card messages instantly in the target language.",
    tab: "calendar",
    selector: "learner-profile-tab-content"
  },
  {
    title: "🔊 Spoken Dialogue Pronunciation Evaluation",
    text: "Switch to the Feedback tab. The 'Feedback' sub-panel evaluates pronunciation. Students can record live speech-to-text dialogue, and our engine automatically highlights mispronounced words, counts phoneme accuracy, and offers targeted feedback tips.",
    tab: "feedback",
    feedbackSubTab: "feedback",
    selector: "learner-profile-tab-content"
  },
  {
    title: "💬 Conversational Practice AI Chatbot",
    text: "Under the 'Chat' sub-tab of Feedback, your student can practice written conversations directly with a friendly AI language tutor. The chatbot automatically offers conversational prompts, local dictionary translations, and polite grammar corrections.",
    tab: "feedback",
    feedbackSubTab: "chat",
    selector: "learner-profile-tab-content"
  },
  {
    title: "💡 Academic Co-Pilot & Prompting desk",
    text: "The 'Copilot' sub-tab allows tutors to quickly consult an AI helper! You can type queries like 'suggest 3 business English games' or 'explain past perfect rules' to receive instant, tailored teaching activities and examples.",
    tab: "feedback",
    feedbackSubTab: "copilot",
    selector: "learner-profile-tab-content"
  },
  {
    title: "🏆 Gamified League Competitions",
    text: "The Competition tab tracks gamified brackets! Students are grouped into weekly leagues (such as Diamond, Gold, or Bronze divisions) where they compete against peers in the cohort by earning homework XP, preventing streak loss, and logging reviews.",
    tab: "competition",
    selector: "learner-profile-tab-content"
  },
  {
    title: "💳 Package Transactions & Tuition Ledgers",
    text: "The Automation tab handles financial details! Record package subscription quantities (e.g. 10-session passes), track unpaid class warnings, view payment invoices, and manage shared resource library directories where pupils can download books.",
    tab: "automation",
    selector: "learner-profile-tab-content"
  }
];

const LearnerProfile: React.FC<App1ProfileProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const learner = useLearnerStore(state => state.getLearnerById(id!));
  const categoryTheme = getCategoryById(learner?.category);
  const updateLearner = useLearnerStore(state => state.updateLearner);
  const addSession = useLearnerStore(state => state.addSession);
  const updateSession = useLearnerStore(state => state.updateSession);
  const removeSession = useLearnerStore(state => state.removeSession);
  const learners = useLearnerStore(state => state.learners);

  const loading = useAppStore(state => state.loading);
  const setLoading = useAppStore(state => state.setLoading);
  const sessionToLogInfo = useAppStore(state => state.sessionToLogInfo);
  const clearSessionToLogInfo = useAppStore(state => state.clearSessionToLogInfo);

  const calendarEvents = useCalendarStore(state => state.calendarEvents);
  const addCalendarEvent = useCalendarStore(state => state.addCalendarEvent);
  const updateCalendarEvent = useCalendarStore(state => state.updateCalendarEvent);

  const addNotification = useAutomationStore(state => state.addNotification);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [isSmartGoalTrackerOpen, setIsSmartGoalTrackerOpen] = useState(false);

  // Premium Walkthrough Tour States & Logic for Learner Profile
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(true);
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

  // Sync tab and scroll on step changes with premium pulsing offset highlights
  useEffect(() => {
    let highlightedEl: HTMLElement | null = null;
    const highlightClasses = ['ring-4', 'ring-offset-2', 'ring-indigo-600', 'dark:ring-indigo-400', 'animate-pulse', 'scale-[1.01]', 'transition-all', 'duration-500'];

    if (tourStep !== null) {
      const step = LEARNER_PROFILE_TOUR_STEPS[tourStep] as any;
      if (step) {
        // Automatically switch tab
        setActiveTab(step.tab as ActiveTab);

        // Auto-switch nested subtabs if defined in step
        if (step.overviewSubTab) setOverviewSubTab(step.overviewSubTab as OverviewSubTab);
        if (step.activitySubTab) setActivitySubTab(step.activitySubTab as ActivitySubTab);
        if (step.feedbackSubTab) setFeedbackSubTab(step.feedbackSubTab as FeedbackSubTab);
        if (step.automationSubTab) setAutomationSubTab(step.automationSubTab as AutomationSubTab);

        speakText(step.text);

        // Clear any leftover highlights first
        document.querySelectorAll('.ring-indigo-600').forEach(el => {
          el.classList.remove(...highlightClasses);
        });

        // Highlight & scroll container (using 'nearest' block positioning to prevent jumpy scroll downs)
        const timer = setTimeout(() => {
          const targetId = step.selector || "learner-profile-tab-content";
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            el.classList.add(...highlightClasses);
            highlightedEl = el;
          }
        }, 300);

        return () => {
          clearTimeout(timer);
          stopSpeaking();
          if (highlightedEl) {
            highlightedEl.classList.remove(...highlightClasses);
          }
          // fallback clear
          document.querySelectorAll('.ring-indigo-600').forEach(el => {
            el.classList.remove(...highlightClasses);
          });
        };
      }
    } else {
      stopSpeaking();
    }
    return () => {
      stopSpeaking();
      document.querySelectorAll('.ring-indigo-600').forEach(el => {
        el.classList.remove(...highlightClasses);
      });
    };
  }, [tourStep, speakText, stopSpeaking]);

  const handleNextStep = () => {
    if (tourStep !== null) {
      if (tourStep < LEARNER_PROFILE_TOUR_STEPS.length - 1) {
        setTourStep(tourStep + 1);
      } else {
        setTourStep(null);
        alert("🎉 You've completed the complete Learner Profile Tour!");
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
  };

  const [overviewSubTab, setOverviewSubTab] = useState<OverviewSubTab>('overview');
  const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>('history');
  
  // Gallery states
  const [galleryViewMode, setGalleryViewMode] = useState<'live' | 'video' | 'daily' | 'gamified' | 'music'>('live');
  const [feedbackSubTab, setFeedbackSubTab] = useState<FeedbackSubTab>('feedback');
  const [automationSubTab, setAutomationSubTab] = useState<AutomationSubTab>('hub');
  
  // Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportMode, setReportMode] = useState<'options' | 'automatic' | 'manual'>('options');
  const [manualReportInput, setManualReportInput] = useState('');
  const [reportData, setReportData] = useState<AIProgressReport | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // Manual Update states
  const [isManualUpdateOpen, setIsManualUpdateOpen] = useState(false);
  const [manualUpdateInput, setManualUpdateInput] = useState('');
  const [parsedManualUpdate, setParsedManualUpdate] = useState<any>(null);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
  const [liveSessionInfo, setLiveSessionInfo] = useState<{ duration: number } | null>(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isDateActionModalOpen, setIsDateActionModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Reviews Tab state
  const [showReviewsTabModal, setShowReviewsTabModal] = useState(false);
  /*
   * The four teaching-quality averages for the Reviews tab.
   *
   * Derived from `sessionHistory` rather than from a stored total, so it can never fall out
   * of step with the reviews themselves — including for reviews written before these four
   * questions existed, which simply do not contribute to the average.
   */
  const reviewHistory = useMemo(() => learner.sessionHistory || [], [learner.sessionHistory]);
  const skillAverages = useMemo(() => averageSkillRatings(reviewHistory), [reviewHistory]);
  const skillsRatedCount = useMemo(() => countRatedReviews(reviewHistory), [reviewHistory]);
  const [rawJsonInput, setRawJsonInput] = useState('');

  // Use celebration hook (G11)
  useCelebration(learner);

  const handleNavigateTab = (tabName: string) => {
    if (tabName === 'session' || tabName === 'history') {
      setActiveTab('activity');
      setActivitySubTab('history');
    } else if (tabName === 'homework') {
      setActiveTab('activity');
      setActivitySubTab('homework');
    } else if (tabName === 'exam') {
      setActiveTab('activity');
      setActivitySubTab('exam');
    } else if (tabName === 'feedback') {
      setActiveTab('feedback');
      setFeedbackSubTab('feedback');
    } else if (['profile', 'overview', 'activity', 'calendar', 'feedback', 'competition', 'automation', 'generator'].includes(tabName)) {
      setActiveTab(tabName as ActiveTab);
    }
  };

  const learnerEvents = useMemo(() => {
    if (!learner) return [];
    return calendarEvents.filter(event => {
      if (event.learnerId === learner.id) return true;
      if (event.id.startsWith('holiday-')) {
        const countryPart = event.id.split('-')[1];
        const learnerCountryId = (learner.country || '').replace(/\s/g, '');
        if (countryPart === learnerCountryId) return true;
      }
      return false;
    });
  }, [calendarEvents, learner]);

  useEffect(() => {
    if (sessionToLogInfo && sessionToLogInfo.learnerId === learner?.id) {
      setLiveSessionInfo({ duration: sessionToLogInfo.elapsedMinutes });
      setSessionToEdit(null);
      setIsSessionModalOpen(true);
      clearSessionToLogInfo();
    }
  }, [sessionToLogInfo, clearSessionToLogInfo, learner?.id]);

  // Auto Disk sync loading and reliable non-destructive saving
  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    
    if (isDiskModeEnabled()) {
      getStoredDirectoryHandle().then(async (handle) => {
        if (handle && isMounted) {
          const hasPerm = await verifyDirectoryPermission(handle, false);
          if (hasPerm) {
            // First check adult_dashboard subfolder, then fallback to root folder or JSON
            let diskData: any = null;
            try {
              const adultDir = await handle.getDirectoryHandle('adult_dashboard');
              diskData = await readLearnerFolderFromDisk(adultDir, `learner_${id}`) || await readJsonFromDisk(adultDir, `learner_${id}.json`);
            } catch {}
            if (!diskData) {
              diskData = await readLearnerFolderFromDisk(handle, `learner_${id}`) || await readJsonFromDisk(handle, `learner_${id}.json`);
            }

            if (diskData && isMounted) {
              // Restore profile safely preserving any live active session/competency state
              if (diskData.profile) {
                useLearnerStore.setState({
                  learners: useLearnerStore.getState().learners.map(l => {
                    if (l.id === id) {
                      return {
                        ...l,
                        ...diskData.profile,
                        sessions: (diskData.profile.sessions && diskData.profile.sessions.length > 0) ? diskData.profile.sessions : (l.sessions || []),
                        competencies: (diskData.profile.competencies && diskData.profile.competencies.length > 0) ? diskData.profile.competencies : (l.competencies || []),
                        needs: (diskData.profile.needs && diskData.profile.needs.length > 0) ? diskData.profile.needs : (l.needs || []),
                        streak: diskData.profile.streak !== undefined ? diskData.profile.streak : (l.streak || 0)
                      };
                    }
                    return l;
                  })
                });
              }
              // Restore content
              if (diskData.content) {
                const contentMap = await idb.get('tutor-crafter-content') || {};
                contentMap[id] = diskData.content;
                await idb.set('tutor-crafter-content', contentMap);
                
                if (props.setAllContent) {
                  props.setAllContent(prev => ({
                    ...prev,
                    [id]: diskData.content
                  }));
                }
              }
            }
          }
        }
      });
    }

    return () => {
      isMounted = false;
      if (isDiskModeEnabled()) {
        const latestLearner = useLearnerStore.getState().getLearnerById(id);
        if (latestLearner) {
          idb.get('tutor-crafter-content').then(async (contentMap) => {
            const learnerContent = contentMap?.[id] || null;
            await syncLearnerToDisk(latestLearner, learnerContent);
            triggerAutoSync(true);
          }).catch(() => {
            syncLearnerToDisk(latestLearner);
            triggerAutoSync(true);
          });
        }
      }
    };
  }, [id, props.setAllContent]);

  const handleUpdateLearner = useCallback((updatedLearner: Learner) => {
    updateLearner(updatedLearner);
    if (isDiskModeEnabled()) {
      syncLearnerToDisk(updatedLearner);
      triggerAutoSync(false);
    }
  }, [updateLearner]);

  const handleCopyAnalysisPrompt = useCallback(() => {
    if (!learner) return;
    const reviewsList = (learner.sessionHistory || [])
      .filter(s => s.review)
      .map(s => ({
        lesson: s.lessonName || s.title || "Lesson",
        date: s.date,
        stars: s.review!.stars,
        liked: s.review!.liked,
        disliked: s.review!.disliked,
        expectationsMet: s.review!.expectationsMetOptions || [],
        /*
         * The four teaching-quality ratings go to the analyser as their own field, not folded
         * into the overall stars. They are what make "you should work on X" actionable: the
         * overall number can only say a class went well, these say which of the four carried it.
         * `formatSkillRatings` returns one readable line and an empty string when nothing was
         * rated, so a legacy review does not arrive with a blank label attached.
         */
        teachingQuality: formatSkillRatings(s.review!.skillRatings)
      }));

    const jsonSample = {
      sentimentScore: 92,
      expectationsMetPercentage: 95,
      overallRecommendations: "The student shows excellent spoken output, but needs more grammar revision in past tenses.",
      commonPraisePoints: ["High speaking output", "Exceptional engagement", "Friendly attitude"],
      improvementAreas: ["Consolidate passive reporting grammar rules", "Review lesson material prior to class"],
      lessonProgressTrend: [
        { lesson: "Lesson 1", performanceScore: 80 },
        { lesson: "Lesson 2", performanceScore: 88 }
      ]
    };

    const promptText = `You are a professional Educational Analyst and AI Tutor. I am providing you with student-submitted lesson reviews. Please analyze this feedback to identify learning sentiment, progress patterns, common strengths, weaknesses, and a suggested pedagogical roadmap.

Return ONLY a single valid JSON object that strictly adheres to the schema shown in the sample below. Do NOT write any code blocks, markdown tags (such as \`\`\`json), or conversational chat introductory/concluding text. No text before or after the JSON.

SCHEMA SAMPLE:
${JSON.stringify(jsonSample, null, 2)}

REVIEWS DATA TO ANALYZE:
${JSON.stringify(reviewsList, null, 2)}
`;

    navigator.clipboard.writeText(promptText);
    alert("Review logs and AI Prompts copied to clipboard successfully! Paste this in Gemini or ChatGPT to get your detailed JSON report, then paste it back inside the JSON Analysis input area.");
  }, [learner]);

  const handlePasteJsonAnalysis = useCallback(() => {
    if (!learner) return;
    try {
      let cleanInput = rawJsonInput.trim();
      if (cleanInput.startsWith('```')) {
        const matches = cleanInput.match(/^(?:```(?:json)?\n?)([\s\S]*?)(?:\n?```)$/);
        if (matches && matches[1]) {
          cleanInput = matches[1].trim();
        }
      }

      const parsed = JSON.parse(cleanInput);
      if (typeof parsed.sentimentScore !== 'number' || typeof parsed.expectationsMetPercentage !== 'number') {
        alert("Invalid format: JSON must contain sentimentScore (number) and expectationsMetPercentage (number).");
        return;
      }

      updateLearner({
        ...learner,
        reviewAnalysis: parsed
      } as any);
      setRawJsonInput('');
      alert("AI Analysis report successfully parsed and visualized! 🚀");
    } catch (e) {
      alert("Error parsing JSON. Please ensure the response of the AI is valid JSON syntax.");
    }
  }, [learner, rawJsonInput, updateLearner]);

  const handleCopyUpdatePrompt = () => {
    if (!learner) return;

    // Get current challenge status
    const currentChallenges = useAutomationStore.getState().challenges.filter(c => c.learnerId === learner.id);
    const challengesSummary = currentChallenges.map(c => `- [${c.status}] "${c.title}" (Progress: ${c.current}/${c.target}, Category: ${c.category}, Reward: ${c.xpReward} XP)`).join('\n') || 'No challenges active.';

    // Get skills/competencies summary
    const competenciesSummary = learner.competencies.map(c => `- "${c.name}" (Progress: ${c.progress}%, Status: ${c.status})`).join('\n') || 'No competencies configured.';

    // Get personalized achievements
    const achievementsSummary = (learner.achievements || []).map(a => `- "${a.title}": ${a.description} (Earned: ${a.dateEarned || 'N/A'})`).join('\n') || 'No custom achievements earned yet.';

    // Get recent sessions details (excluding transcript, keeping summaries)
    const recentSessionsSummary = learner.sessions.slice(0, 5).map(s => {
      return `Date: ${s.date} | Name: ${s.lessonName || 'General Session'} | Attended: ${s.attended ? 'Yes' : 'No'}
   - Summary: ${s.lessonSummary || 'No summary'}
   - Topics: ${(s.topics || []).join(', ')}
   - Skills Learned: ${(s.skillsLearned || []).join(', ')}
   - Needs Help: ${(s.needsHelp || []).join(', ')}`;
    }).join('\n\n') || 'No sessions logged yet.';

    const promptText = `Act as an expert AI Learning Coach, Pedagogical Analyst, and Educator. 
Analyze the learner's profile, history of recent sessions, current competencies, active challenges, and achievements to generate a synchronized manual update payload in JSON.

==== STUDENT IDENTITY ====
Name: ${learner.name}
Gender: ${learner.gender || 'Unknown'}
Level: ${learner.cefrLevel || learner.level || 'Intermediate'}
Stated Goals: ${learner.goals.join(', ') || 'No specific goals'}
Interests: ${learner.interests || 'None specified'}
Learning Style: ${learner.learningStyle || 'None specified'}
Expectations: ${learner.expectations || 'None specified'}
Current XP: ${learner.xp}
Streak: ${learner.streak}

==== CURRENT COMPETENCIES & SKILL TREE ====
${competenciesSummary}

==== CURRENT PERSONALIZED ACHIEVEMENTS ====
${achievementsSummary}

==== CURRENT ACTIVE CHALLENGES ====
${challengesSummary}

==== RECENT SESSIONS SUMMARY ====
${recentSessionsSummary}

================ GENERAL INSTRUCTIONS ================
1. COMPETENCIES (SKILLS): Evaluate the student's recent session outcomes. Suggest realistic changes in progress (+1% to +15% increase max per skill, typically between +1% and +10% per session. DO NOT suggest huge, unrealistic absolute jumps like +75% or 68% for a single session out of 24! If current progress is 20%, the new progress should be 21% to 35% max) and appropriate status ('NeedsWork' | 'OnTrack' | 'Mastered' | 'Learning' | 'Practicing' or keep current) for existing competencies or suggest new ones. Keep changes balanced and justified based on the notes.
2. PERSONALIZED ACHIEVEMENTS: If the student completed key milestones or showed exceptional effort in recent sessions, design exactly 1 creative personalized achievement badge (with a title, customized description, and a representative emoji icon). If no milestone is met, skip adding new achievements (return empty array).
3. CHALLENGE BOARD: If the student attended sessions or completed work, increment the current progress value on matching challenges (status becomes "completed" if current >= target). You can also propose 1-2 new motivational challenges that align with their current focus (include title, category, description, target count, current=0, and xpReward, e.g. 50-100 XP).
4. GENERAL INFO & NOTES: Propose notes/feedback updates, or course plan current lesson progress.

You MUST return your response as a SINGLE valid JSON object inside a markdown code block matching this schema EXACTLY:

\`\`\`json
{
  "competencyUpdates": [
    {
      "competencyName": "Name of Existing or New Competency",
      "progress": 85, 
      "status": "Practicing", 
      "justification": "Why this progress was made based on session details."
    }
  ],
  "newAchievements": [
    {
      "title": "Creative Badge Title",
      "description": "Short personalized description of what they did to earn this.",
      "icon": "🏆"
    }
  ],
  "challengeUpdates": [
    {
      "title": "Title of existing challenge to update, or a new challenge to add",
      "description": "Description of the challenge",
      "category": "sessions",
      "target": 5,
      "current": 4,
      "xpReward": 50,
      "status": "pending" 
    }
  ],
  "generalUpdate": {
    "level": "${learner.level}",
    "notes": "Updated general diagnostic notes for the tutor summary page.",
    "xpGain": 100
  }
}
\`\`\`

Analyze the student data and respond ONLY with the JSON block. Do not write introductory or concluding statements outside the JSON.`;

    navigator.clipboard.writeText(promptText);
    alert("Analysis and Update Prompt copied to clipboard! Paste it to your external AI, then copy the JSON response and paste it back in the dialog.");
  };

  const handleParseManualUpdateInput = () => {
    try {
      const cleaned = manualUpdateInput.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setParsedManualUpdate(parsed);
    } catch (e) {
      alert("Failed to parse JSON. Please check formatting and ensure it is valid JSON.");
    }
  };

  const handleApplyManualUpdate = () => {
    if (!learner || !parsedManualUpdate) return;

    try {
      let updatedLearner = { ...learner };

      // 1. Process Competency Updates
      if (Array.isArray(parsedManualUpdate.competencyUpdates)) {
        const updatedCompetencies = [...updatedLearner.competencies];
        parsedManualUpdate.competencyUpdates.forEach((u: any) => {
          if (!u.competencyName) return;
          const idx = updatedCompetencies.findIndex(c => c.name.toLowerCase() === u.competencyName.toLowerCase());
          if (idx >= 0) {
            const original = updatedCompetencies[idx];
            updatedCompetencies[idx] = {
              ...original,
              progress: typeof u.progress === 'number' ? Math.max(0, Math.min(100, u.progress)) : original.progress,
              status: u.status || original.status,
              history: [
                ...(original.history || []),
                {
                  date: new Date().toISOString().split('T')[0],
                  score: typeof u.progress === 'number' ? u.progress : original.progress,
                  note: u.justification || 'Manual update analysis.'
                }
              ]
            };
          } else {
            updatedCompetencies.push({
              id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: u.competencyName,
              progress: typeof u.progress === 'number' ? Math.max(0, Math.min(100, u.progress)) : 50,
              status: u.status || 'Learning',
              history: [{
                date: new Date().toISOString().split('T')[0],
                score: typeof u.progress === 'number' ? u.progress : 50,
                note: u.justification || 'Created via Manual analysis.'
              }]
            });
          }
        });
        updatedLearner.competencies = updatedCompetencies;
      }

      // 2. Process Achievements
      if (Array.isArray(parsedManualUpdate.newAchievements)) {
        const updatedAchievements = [...(updatedLearner.achievements || [])];
        parsedManualUpdate.newAchievements.forEach((a: any, i: number) => {
          if (!a.title) return;
          if (updatedAchievements.some(existing => existing.title.toLowerCase() === a.title.toLowerCase())) return;
          updatedAchievements.push({
            id: `ach-${Date.now()}-${i}`,
            title: a.title,
            description: a.description || '',
            icon: a.icon || '🏅',
            dateEarned: new Date().toISOString().split('T')[0]
          });
        });
        updatedLearner.achievements = updatedAchievements;
      }

      // 3. Process Challenges
      if (Array.isArray(parsedManualUpdate.challengeUpdates)) {
        parsedManualUpdate.challengeUpdates.forEach((chall: any) => {
          if (!chall.title) return;
          const storeChallenges = useAutomationStore.getState().challenges;
          const existingChall = storeChallenges.find(c => c.learnerId === learner.id && c.title.toLowerCase() === chall.title.toLowerCase());
          
          if (existingChall) {
            useAutomationStore.setState(state => ({
              challenges: state.challenges.map(c => {
                if (c.id === existingChall.id) {
                  const newCurrent = typeof chall.current === 'number' ? chall.current : c.current;
                  const isCompleted = newCurrent >= c.target;
                  return {
                    ...c,
                    current: newCurrent,
                    status: isCompleted ? 'completed' : chall.status || c.status
                  };
                }
                return c;
              })
            }));
          } else {
            useAutomationStore.setState(state => ({
              challenges: [
                ...state.challenges,
                {
                  id: `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  learnerId: learner.id,
                  title: chall.title,
                  description: chall.description || '',
                  target: chall.target || 5,
                  current: chall.current || 0,
                  xpReward: chall.xpReward || 50,
                  category: chall.category || 'sessions',
                  status: chall.status || 'pending',
                  type: 'custom',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
                }
              ]
            }));
          }
        });
      }

      // 4. Process General Update
      if (parsedManualUpdate.generalUpdate) {
        const gu = parsedManualUpdate.generalUpdate;
        if (gu.level) updatedLearner.level = gu.level;
        if (gu.notes) updatedLearner.notes = gu.notes;
        if (typeof gu.xpGain === 'number' && gu.xpGain > 0) {
          updatedLearner.xp = (updatedLearner.xp || 0) + gu.xpGain;
        }
      }

      handleUpdateLearner(updatedLearner);
      alert(`Successfully synchronized and updated all profile visualizers (Skills Tree, Badge Board, Challenges Tree, Notes) for ${learner.name}!`);
      setIsManualUpdateOpen(false);
      setManualUpdateInput('');
      setParsedManualUpdate(null);
    } catch (err) {
      console.error(err);
      alert("Error applying changes: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleOpenReportOptions = () => {
    setIsReportModalOpen(true);
    setReportMode('options');
    setReportData(null);
    setManualReportInput('');
    setIsReportLoading(false);
  };

  const handleGenerateReportAutomatic = async () => {
    if (!learner) return;
    setReportMode('automatic');
    setIsReportLoading(true);
    setReportData(null);
    const report = await getOverallProgressReport(learner);
    setReportData(report);
    setIsReportLoading(false);
  };

  const handleGenerateReportManual = () => {
    if (!learner || !manualReportInput.trim()) return;
    setIsReportLoading(true);
    try {
      const cleanedInput = manualReportInput.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const report = JSON.parse(cleanedInput) as AIProgressReport;
      setReportData(report);
      setIsReportLoading(false);
    } catch (e) {
      console.error("Invalid Manual Input:", e);
      alert("Invalid Manual Input provided. Please ensure it is a valid object.");
      setIsReportLoading(false);
    }
  };

  const handleEmailReport = () => {
    if (!learner || !reportData) return;
    
    const subject = `Your Progress Report from Learner Profile`;
    const body = `Hi ${reportData.learnerName},\n\nHere is your latest progress report...\n\nKeep up the great work!`;
    
    const mailtoLink = `mailto:${learner.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const handleCopyLearnerAIContext = () => {
    if (!learner) return;
    const challengesStrs = learner.challenges ? Object.keys(learner.challenges).map(k => `- ${k}`) : [];
    const challengesStr = challengesStrs.length ? challengesStrs.join('\n') : "None recorded";
    
    let factsStrs: string[] = [];
    if (Array.isArray(learner.facts)) factsStrs = learner.facts.map(f => `- ${(f as any).title || (f as any).content || f}`);
    else if (typeof learner.facts === 'string') factsStrs = [(learner.facts as string)];
    const factsStr = factsStrs.length ? factsStrs.join('\n') : "None recorded";
    
    const goalsStr = learner.coursePlan?.title || learner.plan?.title || learner.goalsList?.join(', ') || "None recorded";
    
    const prompt = `Please create a customized JSON lesson for my student based on their profile.
Student Name: ${learner.name}
Level: ${learner.cefrLevel || learner.level || 'B1'}
Target Language: ${learner.targetLanguage || 'English'}
Native Language: ${learner.l1Language || 'Unknown'}

Recent Challenges:
${challengesStr}

Fun Facts/Interests:
${factsStr}

Course Plan Goals:
${goalsStr}
`;

    navigator.clipboard.writeText(prompt);
    alert('Learner context copied to clipboard! You can paste this to your AI to generate a lesson JSON for manual upload.');
  };
  
  const handleSaveSession = useCallback(async (sessionData: Session | Omit<Session, 'id' | 'aiAnalysis' | 'reviewQuestions' | 'skillsLearned' | 'needsHelp'>) => {
    if (!learner) return;
    
    if ('id' in sessionData) {
      setLoading(true);
      updateSession(learner.id, sessionData as Session);
      setLoading(false);
    } else {
      await addSession(learner.id, sessionData);
      // Trigger celebration for new session
      addNotification({
        type: 'milestone',
        title: 'Session Completed!',
        message: `${learner.name} completed a session. +10 XP!`,
        learnerId: learner.id,
      });
    }
  }, [learner, addSession, updateSession, setLoading, addNotification]);
  
  const handleUpdateSession = useCallback((updatedSession: Session) => {
    if (!learner) return;
    updateSession(learner.id, updatedSession);
  }, [learner, updateSession]);

  const handleOpenAddSessionModal = () => {
    setSessionToEdit(null);
    setLiveSessionInfo(null);
    setIsSessionModalOpen(true);
  };

  const handleEditSession = useCallback((session: Session) => {
    setSessionToEdit(session);
    setLiveSessionInfo(null);
    setIsSessionModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setIsSessionModalOpen(false);
    setSessionToEdit(null);
    setLiveSessionInfo(null);
  };

  const handleRemoveSession = useCallback((sessionId: string) => {
    if (!learner) return;
    removeSession(learner.id, sessionId);
  }, [learner, removeSession]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDateActionModalOpen(true);
  };
  
  const handleSaveEvent = (eventData: CalendarEvent) => {
    const payload = {
      ...eventData,
      endDate: eventData.endDate === eventData.date ? undefined : eventData.endDate,
    };
    
    if (payload.id) {
      updateCalendarEvent(payload);
    } else {
      addCalendarEvent(payload);
    }
    setIsDateActionModalOpen(false);
    setSelectedDate(null);
  };

  const handleSaveHtml = () => {
    const node = document.getElementById('full-overview-for-export');
    if (!node || !learner) return;

    const content = node.innerHTML;
    const fullHtml = `<!DOCTYPE html><html><head><title>Overview for ${learner.name}</title></head><body>${content}</body></html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Overview-${learner.name}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading state with skeleton (O5)
  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonLoader className="h-32 w-full" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} className="h-10 flex-1" />)}
        </div>
        <TabSkeleton />
      </div>
    );
  }

  if (!learner) {
    return <div className="text-center p-10 font-bold">Learner not found or still loading...</div>;
  }

  // Tab Button Components
  const currentTier = useAuthStore(state => state.tier);
  const TabButton: React.FC<{ name: ActiveTab; label: string; icon: string; isPremium?: boolean }> = ({ name, label, icon, isPremium }) => {
    const isLocked = isPremium && currentTier === 'free';
    return (
      <button
        id={`profile-tab-${name}`}
        onClick={() => setActiveTab(name)}
        className={`flex-1 font-bold py-3 px-4 rounded-t-lg transition-colors border-b-4 flex items-center justify-center gap-1.5 text-sm sm:text-base whitespace-nowrap ${activeTab === name ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
      >
        <i className={`fas ${icon}`}></i>
        <span className="hidden sm:inline">{label}</span>
        {isPremium && (
          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
            isLocked 
              ? 'bg-amber-100 text-amber-700 border border-amber-300' 
              : 'bg-purple-100 text-purple-700'
          }`}>
            {isLocked ? '🔒 PRO' : 'PRO'}
          </span>
        )}
      </button>
    );
  };

  /**
   * "Lesson Insight" tab — hands this learner's profile facts to the Lesson
   * Insight widget and opens it in a new tab.
   *
   * The widget needs the facts BEFORE it boots, so the button writes them to
   * the shared handoff key and then opens the tab (see
   * `utils/lessonInsightHandoff.ts`). Nothing is generated here: the tutor
   * pastes the transcript into the widget, which builds the prompt.
   */
  const LessonInsightTab: React.FC<{ learner: Learner }> = ({ learner }) => {
    const [opened, setOpened] = useState(false);
    // The tutor's own name labels the tutor's turns in the report, so the
    // analyst can tell the two speakers apart. Taken from the auth store
    // because this page never had a `tutorName` in scope.
    const tutorName = useAuthStore((state) => state.tutor?.name) || '';

    // Prefer the learner's explicit facts block; fall back to assembling the
    // basics so the report is never built with no context at all.
    const explicitFacts =
      typeof learner.facts === 'string'
        ? learner.facts.trim()
        : learner.facts && typeof learner.facts === 'object'
          ? Object.entries(learner.facts as Record<string, unknown>)
              .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
              .map(([k, v]) => `- ${k}: ${String(v)}`)
              .join('\n')
          : '';

    const facts = explicitFacts || buildFactsFallback({
      level: learner.cefrLevel || learner.level,
      nationality: learner.country,
      l1: learner.l1Language,
      l2: learner.targetLanguage,
      goals: (learner.goalsList?.length ? learner.goalsList : learner.goals)?.join('; '),
      interests: learner.interests,
      notes: learner.notes,
      weakAreas: learner.focus,
      extra: [learner.occupation ? `Occupation: ${learner.occupation}` : '', learner.learningStyle ? `Learning style: ${learner.learningStyle}` : ''],
    });

    const handleOpen = () => {
      const ok = openLessonInsight({
        name: learner.registeredName || learner.name,
        tutorName: tutorName,
        nationality: learner.country,
        l1: learner.l1Language,
        l2: learner.targetLanguage,
        focusedLanguage: learner.focus || '',
        facts,
        source: `${learner.name}'s profile — Sessions → Lesson Insight`,
      });
      if (ok) {
        setOpened(true);
        setTimeout(() => setOpened(false), 4000);
      }
    };

    return (
      <SectionCard title="Lesson Insight" icon={<i className="fas fa-chart-line text-blue-500"></i>}>
        <div className="space-y-5 animate-fade-in">
          <p className="text-sm text-slate-600">
            Build a full speaking, grammar, vocabulary and homework report for{' '}
            <strong>{learner.name}</strong> from a class transcript — no API key required.
            Clicking below copies this learner's profile facts into the app and opens it in a new
            tab, ready to paste the lesson transcript into.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="block font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">Learner</span>
              <span className="text-slate-800 font-semibold">{learner.registeredName || learner.name}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="block font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">Languages</span>
              <span className="text-slate-800 font-semibold">
                {learner.l1Language || '—'} → {learner.targetLanguage || '—'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <span className="block font-bold text-blue-700 uppercase text-[10px] tracking-wider mb-1.5">
              Profile facts that will be copied
            </span>
            <pre className="text-[11px] text-blue-900 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto leading-relaxed">
              {facts || '(none yet — add Learner Facts in the Profile tab for a sharper report)'}
            </pre>
          </div>

          <button
            onClick={handleOpen}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-purple text-white font-bold rounded-lg hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <i className={`fas ${opened ? 'fa-check' : 'fa-external-link-alt'}`}></i>
            {opened ? 'Opened in a new tab!' : 'Copy facts & open Lesson Insight'}
          </button>
        </div>
      </SectionCard>
    );
  };

  const SubTabButton: React.FC<{ name: string; label: string; icon: string; active: boolean; onClick: () => void }> = ({ name, label, icon, active, onClick }) => (
    <button
      onClick={onClick}
      className={`font-semibold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 text-sm ${active ? 'bg-brand-purple text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      <i className={`fas ${icon}`}></i>
      {label}
    </button>
  );

  // ============ COMBAT ARENA INTEGRATION ============
  const CombatArenaIntegration: React.FC<{ learner: Learner }> = ({ learner }) => {
    const navigate = useNavigate();
    const [isInGame, setIsInGame] = useState(false);
    const [gameLearner, setGameLearner] = useState<any>(null);
    
    const loadGameData = useCallback(() => {
      try {
        const data = localStorage.getItem('combat_arena_state_v3');
        if (data) {
          const parsed = JSON.parse(data);
          const gl = parsed.learners?.find((l: any) => l.id === learner.id);
          if (gl) {
            setIsInGame(true);
            setGameLearner(gl);
          }
        }
      } catch {}
    }, [learner.id]);

    useEffect(() => {
      loadGameData();
    }, [loadGameData]);

    const removeFromGame = () => {
      try {
        const data = localStorage.getItem('combat_arena_state_v3');
        if (!data) return;
        const parsed = JSON.parse(data);
        if (parsed.learners) {
          parsed.learners = parsed.learners.filter((l: any) => l.id !== learner.id);
          localStorage.setItem('combat_arena_state_v3', JSON.stringify(parsed));
          setIsInGame(false);
          setGameLearner(null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const addToGame = () => {
      try {
        const data = localStorage.getItem('combat_arena_state_v3');
        let parsed = { learners: [], theme: 'mafia' };
        if (data) {
          parsed = JSON.parse(data);
        }
        if (!parsed.learners) parsed.learners = [];
        if (!parsed.learners.find((l: any) => l.id === learner.id)) {
          const theme = parsed.theme || 'mafia';
          const themeRoles = ALL_ROLES.filter(r => r.theme === theme);
          const randomRole = themeRoles[Math.floor(Math.random() * themeRoles.length)] || { id: 'mafia_villager', emoji: '🧑‍🌾' };

          parsed.learners.push({
            id: learner.id,
            name: learner.name,
            emoji: randomRole.emoji,
            portraitUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${learner.name}`,
            currentRoleId: randomRole.id,
            weeklyRoleLevel: 1,
            careerXp: 0,
            coins: 0,
            inventory: [],
            questIds: [],
            battleHistory: [],
            vendettaTargets: [],
            voiceCards: [],
            isAlive: true,
            isGhost: false,
            weeklyKills: 0,
            weeklySaves: 0,
            weeklyCorrectAnswers: 0,
            bonusAtk: 0,
            bonusDef: 0,
            tutorNotes: learner.facts?.join('. ') || '',
            achievements: [],
            cefrLevel: learner.cefrLevel || 'B1',
            goals: learner.coursePlan?.courseName || learner.coursePlan?.title || '',
            lessonNotes: '',
            currentLesson: '',
            learnerVoice: ''
          });
          localStorage.setItem('combat_arena_state_v3', JSON.stringify(parsed));
          loadGameData();
        }
      } catch (e) {
        console.error(e);
      }
    };

    const syncToGame = () => {
      try {
        const data = localStorage.getItem('combat_arena_state_v3');
        if (data) {
          const parsed = JSON.parse(data);
          const idx = parsed.learners?.findIndex((l: any) => l.id === learner.id);
          if (idx !== -1) {
            parsed.learners[idx].goals = learner.coursePlan?.courseName || learner.coursePlan?.title || '';
            parsed.learners[idx].tutorNotes = learner.facts?.join('. ') || '';
            parsed.learners[idx].cefrLevel = learner.cefrLevel || 'B1';
            
            localStorage.setItem('combat_arena_state_v3', JSON.stringify(parsed));
            loadGameData();
            alert('Synced successfully with Combat Arena! Learner game data is now 100% synchronized with their dashboard goals & facts.');
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    return (
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 border border-indigo-300 rounded-lg p-5 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <span className="text-6xl">⚔️</span>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-xl">🛡️</span> Combat Arena Integration
            </h3>
            <p className="text-indigo-50 mt-1">
              {isInGame ? 'This learner is actively engaged in the Game. XP is 100% synced.' : 'Add this learner to the Arena to start gaining XP, coins, and battling!'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3 flex-wrap justify-end">
            {!isInGame ? (
              <label className="flex items-center gap-2 cursor-pointer bg-white text-gray-900 px-4 py-2 rounded-md font-bold hover:bg-gray-100 shadow-md">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-indigo-600 rounded" onChange={(e) => {
                  if (e.target.checked) addToGame();
                }} />
                <span>Add Learner to Game</span>
              </label>
            ) : (
              <>
                <button onClick={syncToGame} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md font-bold transition-colors shadow-lg">
                  <i className="fas fa-sync-alt mr-2"></i> Update Game Info
                </button>
                <button onClick={removeFromGame} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md font-bold transition-colors shadow-lg">
                  <i className="fas fa-user-minus mr-2"></i> Opt Out
                </button>
                <button onClick={() => window.location.href = `/tutorly-games/adult/arena/index.html?returnToProfile=${learner.id}`} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md font-bold transition-colors shadow-lg shadow-red-500/20">
                  <i className="fas fa-hammer mr-2"></i> Enter Arena
                </button>
              </>
            )}
          </div>
        </div>
        
        {isInGame && gameLearner && (
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-4 bg-black/30 p-4 rounded-lg items-center relative z-10">
            <div className="text-center">
              <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">War State</div>
              <div className="text-xl font-bold">
                {gameLearner.isGhost ? '👻 GHOST' : (gameLearner.isAlive ? '💚 ALIVE' : '💀 DEAD')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Team / Faction</div>
              <div className="text-xl font-bold capitalize">
                {gameLearner.faction || 'Neutral'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Role</div>
              <div className="text-xl font-bold capitalize">
                {(gameLearner.currentRoleId || '').replace('mafia_', '').replace('werewolf_', '')}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Hidden export container */}
        <div id="full-overview-for-export" style={{ display: 'none' }}>
          <PrintableOverview learner={learner} learners={learners} />
        </div>

        {/* Profile Tour Quick Button */}
        <div className="flex justify-end -mb-4">
          <button 
            onClick={() => setTourStep(0)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer"
            title="Start Interactive Walkthrough"
          >
            <i className="fas fa-question-circle text-sm"></i>
            Take Learner Profile Tour ?
          </button>
        </div>

        <ProfileHeader 
          learner={learner} 
          onGenerateReport={handleOpenReportOptions} 
          onUpdate={handleUpdateLearner} 
          onComposeEmail={() => setIsEmailComposerOpen(true)}
          onManualUpdateClick={() => {
            setManualUpdateInput('');
            setParsedManualUpdate(null);
            setIsManualUpdateOpen(true);
          }}
        />

        {/* Main Tabs */}
        <div className="flex border-b border-gray-200 -mb-px overflow-x-auto">
          <TabButton name="profile" label="Profile" icon="fa-user-cog" />
          <TabButton name="generator" label="Lessons" icon="fa-laptop-code" />
          <TabButton name="overview" label="Overview" icon="fa-chart-pie" />
          <TabButton name="activity" label="Sessions" icon="fa-rocket" isPremium={true} />
          <TabButton name="calendar" label="Calendar" icon="fa-calendar-alt" isPremium={true} />
          <TabButton name="feedback" label="Feedback" icon="fa-comments" />
          <TabButton name="competition" label="Competition" icon="fa-trophy" />
          <TabButton name="automation" label="Automation" icon="fa-cogs" />
        </div>

        <div id="learner-profile-tab-content" className="mt-6">
          {/* CATEGORY THEME WRAPPER — colors the sections & decorates the background with transparent emojis */}
          <div
            className="category-page relative"
            data-category={learner.category || 'none'}
            style={{
              '--cat-from': categoryTheme?.from || '#64748b',
              '--cat-to': categoryTheme?.to || '#94a3b8',
              '--cat-soft': categoryTheme?.soft || 'rgba(100,116,139,0.04)',
            } as React.CSSProperties}
          >
            {/* Transparent background emojis — pointer-events-none and behind all content so they never cover it */}
            <div className="pointer-events-none select-none absolute inset-0 z-0 overflow-hidden rounded-3xl" aria-hidden="true">
              {(categoryTheme?.backgroundEmojis || []).slice(0, 8).map((emoji, i) => (
                <span
                  key={i}
                  className="absolute opacity-[0.08] leading-none"
                  style={{
                    fontSize: `${[34, 52, 70, 44, 60, 38, 84, 48][i % 8]}px`,
                    top: `${[4, 60, 28, 78, 10, 68, 40, 86][i % 8]}%`,
                    left: `${[2, 82, 52, 6, 76, 28, 90, 58][i % 8]}%`,
                    transform: `rotate(${[-12, 10, -6, 14, -18, 8, -10, 16][i % 8]}deg)`,
                  }}
                >
                  {emoji}
                </span>
              ))}
            </div>

            {/* Accent strip with the category gradient */}
            <div
              className="relative z-10 mb-6 h-1.5 rounded-full"
              style={{ background: `linear-gradient(90deg, var(--cat-from), var(--cat-to))` }}
            />

          {/* GENERATOR HUB TAB */}
          {activeTab === 'generator' && (
            <div className="animate-fade-in -mx-4 sm:mx-0">
               <LearnerPage 
                  isEmbedded={true}
                  embeddedLearnerId={id}
                  tourStep={tourStep}
                  learners={(learners && learners.length > 0 ? learners : props.learners || []).map(l => {
                      if ('cefrLevel' in l && 'targetLanguage' in l && 'personalInfo' in l) return l as any; // already mapped old format
                      return mapUserJsonProfileToLearnerProfile(l as any, l as any);
                  })}
                  setLearners={(action) => {
                      if (props.setLearners) props.setLearners(action);
                      const currentState = useLearnerStore.getState();
                      const nextLearners = typeof action === 'function' 
                          ? action(currentState.learners as any) 
                          : action;
                      
                      const updated = nextLearners.find(l => l.id === id);
                      if (updated) {
                          const existing = currentState.learners.find(l => l.id === id);
                          if (existing) {
                              currentState.updateLearner({
                                  ...existing,
                                  ...updated,
                                  // CRITICAL: Preserve core App2 fields that might get stripped
                                  xp: existing.xp ?? 0,
                                  streak: existing.streak ?? 0,
                                  sessions: existing.sessions || [],
                                  competencies: existing.competencies || [],
                                  needs: existing.needs || [],
                                  coursePlan: existing.coursePlan
                              } as any);
                          } else {
                              currentState.updateLearner(updated as any);
                          }
                      }
                  }}
                  allContent={props.allContent || {}}
                  setAllContent={props.setAllContent || (() => {})}
                  recentLearnerIds={props.recentLearnerIds || []}
                  setRecentLearnerIds={props.setRecentLearnerIds || (() => {})}
                  platforms={props.platforms || []}
                  tutorProfile={props.tutorProfile}
               />
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                <div className="lg:col-span-2 space-y-8">
                  <div id="profile-competency-section">
                    <CompetencySection learner={learner} onUpdate={handleUpdateLearner} />
                  </div>
                </div>
                <div className="space-y-8">
                  <div id="profile-personal-info">
                    <PersonalInformation learner={learner} onUpdate={handleUpdateLearner} />
                  </div>
                  <div id="profile-needs-wants">
                    <NeedsAndWants learner={learner} onUpdate={handleUpdateLearner} />
                  </div>
                  <div id="profile-course-plan">
                    <EditableCoursePlan learner={learner} onUpdate={handleUpdateLearner} />
                  </div>
                </div>
              </div>

              {/* Combat Arena Integration — Profile tab only, at the very bottom */}
              <div className="mt-10" id="profile-combat-arena-section">
                <TierGatedOverlay
                  requiredTier="vip"
                  featureName="Combat Arena Learner Sync"
                  description="Direct learner RPG progression syncing, battle state telemetry, and operative roles are exclusive to VIP Elite members."
                >
                  <CombatArenaIntegration learner={learner} />
                </TierGatedOverlay>
              </div>
            </>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in">
              <SectionCard title="Overview" icon={<i className="fas fa-chart-pie"></i>}>
                <div className="flex flex-wrap gap-2 border-b pb-4 mb-4 items-center">
                  <div className="flex-grow flex flex-wrap gap-2">
                    <SubTabButton name="overview" label="Overview" icon="fa-eye" active={overviewSubTab === 'overview'} onClick={() => setOverviewSubTab('overview')} />
                    <SubTabButton name="achievements" label="Achievements" icon="fa-trophy" active={overviewSubTab === 'achievements'} onClick={() => setOverviewSubTab('achievements')} />
                    <SubTabButton name="progress" label="Progress" icon="fa-chart-line" active={overviewSubTab === 'progress'} onClick={() => setOverviewSubTab('progress')} />
                    <SubTabButton name="learningPath" label="Learning path" icon="fa-road" active={overviewSubTab === 'learningPath'} onClick={() => setOverviewSubTab('learningPath')} />
                  </div>
                  <button onClick={handleSaveHtml} className="bg-brand-green text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors shadow-sm text-sm">
                    <i className="fas fa-file-download mr-2"></i> Save as HTML
                  </button>
                </div>
                <Suspense fallback={<TabSkeleton />}>
                  {overviewSubTab === 'overview' && <PrintableOverview learner={learner} learners={learners} />}
                  {overviewSubTab === 'achievements' && <Achievements learner={learner} />}
                  {overviewSubTab === 'progress' && <ProgressChart sessions={learner.sessions} competencies={learner.competencies} />}
                  {overviewSubTab === 'learningPath' && <LearningPathTimeline sessions={learner.sessions} />}
                </Suspense>
              </SectionCard>
            </div>
          )}
          
          {/* ACTIVITY TAB (SESSIONS) */}
          {activeTab === 'activity' && (
            <TierGatedOverlay
              requiredTier="pro"
              featureName="Sessions Hub"
              description="Session history logs, homework assignments, exam tracking, spaced repetition drills, and review management are exclusive features for Pro and VIP tutors."
            >
              <div className="animate-fade-in">
                <div className="flex flex-wrap gap-2 mb-4">
                  <SubTabButton name="history" label="Session History" icon="fa-history" active={activitySubTab === 'history'} onClick={() => setActivitySubTab('history')} />
                  <SubTabButton name="homework" label="Homework" icon="fa-tasks" active={activitySubTab === 'homework'} onClick={() => setActivitySubTab('homework')} />
                  <SubTabButton name="exam" label="Exam" icon="fa-user-graduate" active={activitySubTab === 'exam'} onClick={() => setActivitySubTab('exam')} />
                  <SubTabButton name="reviews" label="Reviews" icon="fa-star border-yellow-500 text-yellow-500" active={activitySubTab === 'reviews'} onClick={() => setActivitySubTab('reviews')} />
                  <SubTabButton name="lesson-insight" label="Lesson Insight" icon="fa-chart-line" active={activitySubTab === 'lesson-insight'} onClick={() => setActivitySubTab('lesson-insight')} />
                </div>
              
              <Suspense fallback={<TabSkeleton />}>
                {activitySubTab === 'history' && (
                  <SessionLog 
                    learner={learner} 
                    onManualLogClick={handleOpenAddSessionModal} 
                    onEditSession={handleEditSession}
                    onRemoveSession={handleRemoveSession}
                    onUpdateSession={handleUpdateSession}
                  />
                )}
                {activitySubTab === 'homework' && (
                  <>
                    <SectionCard title="Homework Management" icon={<span>📝</span>}>
                      <HomeworkManager learner={learner} />
                    </SectionCard>
                    <div className="mt-6"></div>
                    <LearnerActivityTile learner={learner} />
                  </>
                )}
                {activitySubTab === 'exam' && (
                  <LearnerExamTile learner={learner} />
                )}
                
                {activitySubTab === 'lesson-insight' && (
                  <LessonInsightTab learner={learner} />
                )}

                {activitySubTab === 'reviews' && (
                  <SectionCard title="Session Reviews" icon={<i className="fas fa-star text-yellow-500"></i>}>
                    <div className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 text-center border border-yellow-200 shadow-sm relative overflow-hidden">
                          <div className="absolute -right-4 -top-4 opacity-10 text-8xl">⭐</div>
                          <div className="text-sm font-bold text-yellow-800 uppercase tracking-widest mb-2 z-10 relative">Average Rating</div>
                          <div className="text-5xl font-black text-yellow-600 mb-1 z-10 relative">
                            {learner.sessionHistory?.filter(s => s.review).length > 0 
                              ? (learner.sessionHistory.filter(s => s.review).reduce((sum, s) => sum + s.review!.stars, 0) / learner.sessionHistory.filter(s => s.review).length).toFixed(1)
                              : '—'
                            }
                          </div>
                          <div className="flex justify-center text-yellow-400 text-sm z-10 relative">
                            {[1, 2, 3, 4, 5].map(i => <i key={i} className="fas fa-star mx-0.5"></i>)}
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center border border-green-200 shadow-sm relative overflow-hidden">
                          <div className="absolute -right-4 -top-4 opacity-10 text-8xl">📝</div>
                          <div className="text-sm font-bold text-green-800 uppercase tracking-widest mb-2 z-10 relative">Total Reviews</div>
                          <div className="text-5xl font-black text-green-600 z-10 relative">
                            {learner.sessionHistory?.filter(s => s.review).length || 0}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center border border-blue-200 shadow-sm relative overflow-hidden">
                          <div className="absolute -right-4 -top-4 opacity-10 text-8xl">🎯</div>
                          <div className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-2 z-10 relative">Expectations Met</div>
                          <div className="text-5xl font-black text-blue-600 z-10 relative">
                            {learner.sessionHistory?.filter(s => s.review && s.review.expectationsMetOptions.length > 0).length || 0}
                          </div>
                        </div>
                      </div>

                      {/*
                        * The four teaching-quality averages.
                        *
                        * Kept as their own block under the three headline numbers, because they
                        * answer a different question: the star rating says whether the class was
                        * good, these say which part of the teaching produced that. A bar makes
                        * the weak one visible at a glance, which is the only reason to average
                        * them at all.
                        */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                          <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Teaching Quality Breakdown</h4>
                          <span className="text-xs font-bold text-slate-500">
                            {skillsRatedCount > 0
                              ? `averaged over ${skillsRatedCount} review${skillsRatedCount === 1 ? '' : 's'}`
                              : 'no reviews rated on these yet'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {REVIEW_SKILLS.map(({ key, label }) => {
                            const avg = skillAverages[key];
                            return (
                              <div key={key} className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                                <div className="text-xs font-black text-slate-500 uppercase tracking-wider">{label}</div>
                                <div className="mt-1 flex items-baseline gap-1">
                                  <span className="text-3xl font-black text-slate-900">{avg === null ? '—' : avg.toFixed(1)}</span>
                                  <span className="text-xs font-bold text-slate-400">/5</span>
                                </div>
                                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                                    style={{ width: `${avg === null ? 0 : (avg / 5) * 100}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-sm">
                        <div className="text-left">
                          <h4 className="font-bold text-slate-800 text-sm">Review & Insight Controls</h4>
                          <p className="text-xs text-slate-500">Log reviews instantly with automatic date & time, or request AI reports.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => setShowReviewsTabModal(true)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 transition text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                            id="reviews-tab-add-review-btn"
                          >
                            <i className="fas fa-edit"></i> ✍️ New Review
                          </button>
                          <button
                            onClick={handleCopyAnalysisPrompt}
                            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                            id="reviews-tab-copy-ai-btn"
                          >
                            <i className="fas fa-copy"></i> 📋 Copy AI Prompt
                          </button>
                        </div>
                      </div>

                      {/* Paste JSON Analyzer Input panel */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex justify-between items-center border-b pb-3 border-slate-100">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base">📊 Dynamic AI Visual Reporter</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Paste the JSON report generated by external AI to visualize interactive progress trends.</p>
                          </div>
                          {(learner as any).reviewAnalysis && (
                            <button
                              onClick={() => {
                                if(confirm('Are you sure you want to clear the current AI visualization?')) {
                                  updateLearner({ ...learner, reviewAnalysis: undefined } as any);
                                }
                              }}
                              className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                            >
                              Clear Report
                            </button>
                          )}
                        </div>

                        {!(learner as any).reviewAnalysis ? (
                          <div className="space-y-4">
                            <textarea
                              id="ai-json-pastebox"
                              value={rawJsonInput}
                              onChange={(e) => setRawJsonInput(e.target.value)}
                              rows={4}
                              placeholder='Paste the parsed AI JSON here... (Example: {"sentimentScore": 95, ...})'
                              className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={handlePasteJsonAnalysis}
                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs tracking-wider transition uppercase shadow-md"
                              >
                                Visualize Instantly ⚡
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Bento Metrics block */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-black shrink-0">
                                  {(learner as any).reviewAnalysis.sentimentScore}%
                                </div>
                                <div>
                                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Sentiment Health</div>
                                  <div className="text-sm font-bold text-slate-700 mt-0.5 leading-tight">Very Positive Engagement</div>
                                </div>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-black shrink-0">
                                  {(learner as any).reviewAnalysis.expectationsMetPercentage}%
                                </div>
                                <div>
                                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Expectations Met</div>
                                  <div className="text-sm font-bold text-slate-700 mt-0.5 leading-tight">Goals Perfectly Aligned</div>
                                </div>
                              </div>
                            </div>

                            {/* Line Chart */}
                            {(learner as any).reviewAnalysis.lessonProgressTrend && (learner as any).reviewAnalysis.lessonProgressTrend.length > 0 && (
                              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">📈 Lesson Performance & Comprehension Trajectory</h5>
                                <div className="w-full h-48 sm:h-56">
                                  <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={(learner as any).reviewAnalysis.lessonProgressTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                      <XAxis dataKey="lesson" tick={{ fill: '#475569', fontSize: 10 }} />
                                      <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
                                      <Tooltip />
                                      <Area type="monotone" dataKey="performanceScore" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {/* Recommendations text */}
                            {(learner as any).reviewAnalysis.overallRecommendations && (
                              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                                <h5 className="font-black text-orange-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <i className="fas fa-magic"></i> AI Pedagogical Action Roadmap
                                </h5>
                                <p className="text-sm text-slate-700 leading-relaxed italic">"{(learner as any).reviewAnalysis.overallRecommendations}"</p>
                              </div>
                            )}

                            {/* Badges/Tags lists */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(learner as any).reviewAnalysis.commonPraisePoints && (learner as any).reviewAnalysis.commonPraisePoints.length > 0 && (
                                <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100">
                                  <h5 className="font-bold text-emerald-800 text-xs uppercase tracking-wider mb-3">👍 Key Strengths Identified</h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(learner as any).reviewAnalysis.commonPraisePoints.map((item: string, i: number) => (
                                      <span key={i} className="px-2 py-1 bg-emerald-100/60 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg">
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(learner as any).reviewAnalysis.improvementAreas && (learner as any).reviewAnalysis.improvementAreas.length > 0 && (
                                <div className="bg-rose-50/20 p-4 rounded-xl border border-rose-100">
                                  <h5 className="font-bold text-rose-800 text-xs uppercase tracking-wider mb-3">⚠️ Suggested Adjustments</h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(learner as any).reviewAnalysis.improvementAreas.map((item: string, i: number) => (
                                      <span key={i} className="px-2 py-1 bg-rose-100/65 text-rose-800 border border-rose-200 text-xs font-semibold rounded-lg">
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {(!learner.sessionHistory || learner.sessionHistory.filter(s => s.review).length === 0) ? (
                        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                          <div className="text-6xl mb-4 grayscale opacity-50">📋</div>
                          <h3 className="text-xl font-bold text-gray-500">No reviews yet</h3>
                          <p className="text-gray-400 mt-2">Log a session and ask the learner to review it.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {[...(learner.sessionHistory || [])].reverse().filter(s => s.review).map((session, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition duration-300">
                              <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                                <div>
                                  <h4 className="font-bold text-xl text-gray-900">{session.lessonName || session.title || 'Session Review'}</h4>
                                  <div className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                                    <i className="far fa-calendar-alt"></i>
                                    {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                                  </div>
                                </div>
                                <div className="text-2xl bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <i key={star} className={`fa-star ${star <= session.review!.stars ? 'fas text-yellow-400' : 'far text-gray-300'}`}></i>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {session.review!.liked && (
                                  <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                                    <h5 className="font-bold text-green-800 text-sm mb-2 flex items-center gap-2">
                                      <i className="fas fa-thumbs-up"></i> What they liked
                                    </h5>
                                    <p className="text-gray-700 italic text-sm">"{session.review!.liked}"</p>
                                  </div>
                                )}
                                {session.review!.disliked && (
                                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                                    <h5 className="font-bold text-red-800 text-sm mb-2 flex items-center gap-2">
                                      <i className="fas fa-bullseye"></i> Areas for improvement
                                    </h5>
                                    <p className="text-gray-700 italic text-sm">"{session.review!.disliked}"</p>
                                  </div>
                                )}
                              </div>
                              
                              {session.review!.expectationsMetOptions && session.review!.expectationsMetOptions.length > 0 && (
                                <div className="mt-6">
                                  <h5 className="font-bold text-gray-800 text-sm mb-3">Expectations Met:</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {session.review!.expectationsMetOptions.map((exp, i) => (
                                      <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold border border-indigo-100 flex items-center gap-2">
                                        <i className="fas fa-check text-indigo-400"></i> {exp}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}
              </Suspense>
            </div>
            </TierGatedOverlay>
          )}

          {/* CALENDAR TAB */}
          {activeTab === 'calendar' && (
            <TierGatedOverlay
              requiredTier="pro"
              featureName="Calendar & Smart Coaching"
              description="Interactive calendar scheduling, attendance tracking, and SMART Goal Roadmaps are exclusive features for Pro and VIP tutors."
            >
              <div className="animate-fade-in space-y-6">
                <AttendanceTracker 
                  learner={learner} 
                  events={learnerEvents}
                  allCalendarEvents={calendarEvents}
                  onDateClick={handleDateClick}
                  onNavigateTab={handleNavigateTab}
                  onOpenSmartGoal={() => setIsSmartGoalTrackerOpen(true)}
                />
                {/* Study Heatmap — integrated below the calendars (previously its own Overview tab) */}
                <LearningStreakHeatmap sessions={learner.sessions} />
              </div>
            </TierGatedOverlay>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === 'feedback' && (
            <div className="animate-fade-in">
              <SectionCard title="">
                <div className="flex flex-wrap gap-2 border-b pb-4 mb-4">
                  <SubTabButton name="feedback" label="Feedback" icon="fa-comment-dots" active={feedbackSubTab === 'feedback'} onClick={() => setFeedbackSubTab('feedback')} />
                  <SubTabButton name="challenges" label="Recycled" icon="fa-lightbulb" active={feedbackSubTab === 'challenges'} onClick={() => setFeedbackSubTab('challenges')} />
                  <SubTabButton name="facts" label="Facts" icon="fa-brain" active={feedbackSubTab === 'facts'} onClick={() => setFeedbackSubTab('facts')} />
                  <SubTabButton name="chat" label="Chat" icon="fa-comments" active={feedbackSubTab === 'chat'} onClick={() => setFeedbackSubTab('chat')} />
                  <SubTabButton name="copilot" label="Copilot" icon="fa-robot" active={feedbackSubTab === 'copilot'} onClick={() => setFeedbackSubTab('copilot')} />
                </div>
                <Suspense fallback={<TabSkeleton />}>
                  {feedbackSubTab === 'feedback' && <Feedback learner={learner} onUpdate={handleUpdateLearner} isTabContent={true} />}
                  {feedbackSubTab === 'challenges' && (
                    <>
                      <LearningChallenges learner={learner} onUpdate={handleUpdateLearner} isTabContent={true} />
                      {/* Spaced Repetition was moved from the Sessions tab into the Recycled tab */}
                      <div className="mt-6">
                        <SectionCard title="Spaced Repetition System" icon={<span>🧠</span>}>
                          <SpacedRepetitionManager learner={learner} />
                        </SectionCard>
                      </div>
                    </>
                  )}
                  {feedbackSubTab === 'facts' && <FunFacts learner={learner} onUpdate={handleUpdateLearner} isTabContent={true} />}
                  {feedbackSubTab === 'chat' && <AIChatGenerator learner={learner} onUpdate={handleUpdateLearner} />}
                  {feedbackSubTab === 'copilot' && <Copilot learner={learner} />}
                </Suspense>
              </SectionCard>
            </div>
          )}

          {/* COMPETITION TAB (VIP EXCLUSIVE) */}
          {activeTab === 'competition' && (
            <div className="animate-fade-in">
              <TierGatedOverlay
                requiredTier="vip"
                featureName="Competition Arena & Tournaments"
                description="Live multi-student leaderboards, gamified battle arenas, and student XP rankings are exclusive to VIP Elite members."
              >
                <CompetitionTab learner={learner} />
                {/* Challenge Board — moved from Feedback tab and adapted as weekly competition missions */}
                <div className="mt-6">
                  <SectionCard title="🎯 Challenge Board — Weekly Missions" icon={<span>🎯</span>}>
                    <p className="text-xs text-slate-500 mb-4 font-medium">
                      Challenges now feed the Weekly Competition: completing missions earns XP that counts in this week's duel against the paired competitor from the same category.
                    </p>
                    <ChallengeBoard learner={learner} />
                  </SectionCard>
                </div>
              </TierGatedOverlay>
            </div>
          )}

          {/* AUTOMATION TAB (VIP EXCLUSIVE) */}
          {activeTab === 'automation' && (
            <div className="animate-fade-in">
              <TierGatedOverlay
                requiredTier="vip"
                featureName="Automation & Booking Suite"
                description="Automated booking schedules, integrated payment logs, comparative analytics, and resource management are exclusive to VIP Elite members."
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  <SubTabButton name="hub" label="Automation Hub" icon="fa-bolt" active={automationSubTab === 'hub'} onClick={() => setAutomationSubTab('hub')} />
                  <SubTabButton name="payments" label="Booking & Packages" icon="fa-calendar-check" active={automationSubTab === 'payments'} onClick={() => setAutomationSubTab('payments')} />
                  <SubTabButton name="resources" label="Resources" icon="fa-folder-open" active={automationSubTab === 'resources'} onClick={() => setAutomationSubTab('resources')} />
                  <SubTabButton name="comparison" label="Comparison" icon="fa-balance-scale" active={automationSubTab === 'comparison'} onClick={() => setAutomationSubTab('comparison')} />
                </div>
                
                <div className="w-full">
                  <Suspense fallback={<TabSkeleton />}>
                    {automationSubTab === 'hub' && <AutomationHub learner={learner} />}
                    {automationSubTab === 'payments' && <BookingSystem learner={learner} />}
                    {automationSubTab === 'resources' && <SectionCard title=""><ResourceLibrary learner={learner} /></SectionCard>}
                    {automationSubTab === 'comparison' && <SectionCard title=""><ComparisonView learner={learner} allLearners={learners} /></SectionCard>}
                  </Suspense>
                </div>
              </TierGatedOverlay>
            </div>
          )}
          </div>
          {/* /CATEGORY THEME WRAPPER */}
        </div>
        
        {/* Session Form Modal */}
        <AddSessionForm 
          learner={learner}
          onSaveSession={handleSaveSession}
          isOpen={isSessionModalOpen}
          onClose={handleCloseModal}
          sessionToEdit={sessionToEdit}
          liveSessionInfo={liveSessionInfo}
        />

        {/* Standalone reviews tab modal */}
        {showReviewsTabModal && (
          <ReviewSurveyModal
            expectations={learner.expectations?.split(',').map(e => e.trim()).filter(e => e.trim() !== '') || []}
            showLessonNameInput={true}
            onClose={() => setShowReviewsTabModal(false)}
            onComplete={(data) => {
              const newSession: Session = {
                id: `s_rev_${Date.now()}`,
                learnerId: learner.id,
                date: new Date().toISOString(),
                duration: 60,
                status: 'completed',
                attended: true,
                topics: [],
                notes: `Instant review completed.`,
                lessonName: data.lessonName || 'Self-Scheduled Review',
                lessonSummary: `Review added on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
                review: {
                  stars: data.stars,
                  liked: data.liked,
                  disliked: data.disliked,
                  expectationsMetOptions: data.expectationsMetOptions,
                  skillRatings: data.skillRatings
                },
                metExpectations: data.expectationsMetOptions,
                reviewQuestions: [],
                skillsLearned: [],
                needsHelp: []
               };

               const updatedHistoryItem = {
                 date: newSession.date,
                 title: newSession.lessonName,
                 lessonName: newSession.lessonName,
                 review: {
                   stars: data.stars,
                   liked: data.liked,
                   disliked: data.disliked,
                   expectationsMetOptions: data.expectationsMetOptions,
                   /* The Reviews tab aggregates from sessionHistory, so the four ratings have
                      to travel with the history entry, not only with the session. */
                   skillRatings: data.skillRatings
                 }
               };

               const updatedLearner = {
                 ...learner,
                 sessions: [newSession, ...(learner.sessions || [])],
                 sessionHistory: [updatedHistoryItem, ...(learner.sessionHistory || [])]
               };

               updateLearner(updatedLearner);
               setShowReviewsTabModal(false);
               addNotification({
                 type: 'milestone',
                 title: 'Review Added Instantly!',
                 message: `New rating of ${data.stars} stars recorded.`,
                 learnerId: learner.id
               });
            }}
          />
        )}

        {/* Update Profile Modal */}
        <UpdateProfileModal
          isOpen={isManualUpdateOpen}
          onClose={() => setIsManualUpdateOpen(false)}
          learner={learner}
          onUpdate={handleUpdateLearner}
        />

        {/* Report Modal */}
        <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title={`Progress Report for ${learner.name}`} size="full">
          {reportMode === 'options' && !isReportLoading && !reportData && (
            <div className="flex flex-col items-center justify-center space-y-4 p-8">
              <h2 className="text-xl font-bold mb-4">How would you like to generate the report?</h2>
              <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
                <div 
                  className="flex-1 bg-white border-2 border-brand-purple rounded-xl p-6 text-center cursor-pointer hover:bg-purple-50 transition-colors shadow-sm"
                  onClick={handleGenerateReportAutomatic}
                >
                  <i className="fas fa-magic text-4xl text-brand-purple mb-4"></i>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Automatic Generation</h3>
                  <p className="text-sm text-gray-600">The app will automatically analyze the learner's history and generate a comprehensive report.</p>
                </div>
                <div 
                  className="flex-1 bg-white border-2 border-brand-blue rounded-xl p-6 text-center cursor-pointer hover:bg-blue-50 transition-colors shadow-sm"
                  onClick={() => setReportMode('manual')}
                >
                  <i className="fas fa-keyboard text-4xl text-brand-blue mb-4"></i>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Manual</h3>
                  <p className="text-sm text-gray-600">Provide predefined data yourself.</p>
                </div>
              </div>
            </div>
          )}

          {reportMode === 'manual' && !isReportLoading && !reportData && (
            <div className="p-4 flex flex-col items-center w-full max-w-4xl mx-auto">
              <h2 className="text-xl font-bold mb-2 text-gray-900">Manual Report Generation</h2>
              <div className="bg-purple-50 border-l-4 border-brand-purple p-4 rounded-r-xl mb-6 w-full text-sm text-gray-700">
                <p className="font-bold text-brand-purple mb-1">💡 Copy & Run Analysis with External AI</p>
                <p className="mb-3">Compile session data, logs, and information from standard profile states instantaneously. Click the button below to copy a custom, comprehensive analytics prompt containing all of <strong>{learner.name}'s</strong> profile information, session records, and instruction set to generate the matching JSON schema. Paste it into an external AI (like ChatGPT, Gemini, or Claude), and paste the returned JSON block back below.</p>
                <button 
                  onClick={() => {
                    const competenciesStr = learner.competencies.map(c => `- "${c.name}" (Progress: ${c.progress}%, Status: ${c.status})`).join('\n') || 'None recorded';
                    const recentSessions = learner.sessions.slice(0, 10).map(s => {
                      return `Date: ${s.date} | Name: ${s.lessonName || 'General Session'} | Attended: ${s.attended ? 'Yes' : 'No'}
   - Summary: ${s.lessonSummary || 'No summary'}
   - Topics: ${(s.topics || []).join(', ')}
   - Skills Learned: ${(s.skillsLearned || []).join(', ')}
   - Needs Help: ${(s.needsHelp || []).join(', ')}`;
                    }).join('\n\n') || 'None';

                    const reportPrompt = `Act as an elite Academic Advisor and EFL/ESL Progress Analyst. Please analyze my learner's profile details and recent lesson history to generate a complete, insightful progress report in JSON.

==== STUDENT PROFILE ====
Name: ${learner.name}
Level: ${learner.cefrLevel || learner.level || 'Intermediate'}
Native Language: ${learner.l1Language || 'Unknown'}
Goals: ${learner.goals.join(', ') || 'General improvements'}
Streak: ${learner.streak}
XP: ${learner.xp}

==== COMPETENCY PROFILE ====
${competenciesStr}

==== RECENT SESSIONS HISTORY ====
${recentSessions}

==== OUTPUT FORMAT REQUIREMENTS ====
Analyze commitment, Success levels, themes, strengths and next steps.
CRITICAL RULES:
1. Address the learner directly in the 2nd person ("You did great", "Your grammar is improving"). NEVER use 3rd person ("The learner demonstrated").
2. USE ONLY VERY EASY, BASIC ENGLISH WORDS! The learner is a basic English speaker. Keep explanations, titles, and summaries extremely simple.
3. Format your final output as a SINGLE valid raw JSON object matching the following TypeScript schema. Do not truncate the JSON.

JSON Schema:
{
  "learnerName": "${learner.name}",
  "totalSessionsAttended": ${learner.sessions.filter(s => s.attended).length},
  "totalLearningHours": ${learner.sessions.filter(s => s.attended).reduce((acc, s) => acc + (s.duration || 0), 0) / 60},
  "statistics": {
    "total": ${learner.sessions.length},
    "attended": ${learner.sessions.filter(s => s.attended).length},
    "missed": ${learner.sessions.filter(s => !s.attended).length}
  },
  "overallSummary": "A detailed 4-5 sentence analytical summary of the learner's developmental progression.",
  "competencyAnalysis": {
    "strengths": [
      "Detail strength 1",
      "Detail strength 2",
      "Detail strength 3"
    ],
    "areasForImprovement": [
      "Detail area 1",
      "Detail area 2",
      "Detail area 3"
    ]
  },
  "needsAndPathAnalysis": "Critically evaluate how current lessons addresses learner expectations, motivations, and requirements.",
  "sessionLearningAnalysis": {
    "commonThemesPositive": [
      "Detail theme 1",
      "Detail theme 2"
    ],
    "commonThemesNeedsHelp": [
      "Detail difficulty 1",
      "Detail difficulty 2"
    ]
  },
  "progressOverTime": [
    // Pre-calculated historical progress points for the chart
    ${(() => {
      let cumulativeCompetencyProgress: { [key: string]: number } = {};
      learner.competencies.forEach(c => {
          cumulativeCompetencyProgress[c.id] = c.initialProgress || 20;
      });
      return learner.sessions
          .filter(s => s.attended)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(session => {
              Object.keys(cumulativeCompetencyProgress).forEach(id => {
                  cumulativeCompetencyProgress[id] = Math.min(100, cumulativeCompetencyProgress[id] + 1.5);
              });
              const totalProgress = Object.values(cumulativeCompetencyProgress).reduce((sum, current) => sum + current, 0);
              const overallProgress = totalProgress / Math.max(1, learner.competencies.length);
              return JSON.stringify({ date: session.date, overallProgress: Math.round(overallProgress) });
          }).join(',\n    ');
    })()}
  ],
  "criticalEvaluation": "Provide a direct, candid, professional critical assessment of the learner's consistency, effort, and actual linguistic advancement success.",
  "suggestedNextSteps": [
    "Predictive, actionable next step 1 (what topics/activities to cover next)",
    "Predictive, actionable next step 2",
    "Predictive, actionable next step 3"
  ]
}

Only return the raw JSON object inside \`\`\`json and \`\`\` code block. Do not add conversational intro/outro text.`;
                    navigator.clipboard.writeText(reportPrompt);
                    alert("Report Prompt copied to clipboard! Paste it to your external AI, then copy the JSON response and paste it back into the field below.");
                  }}
                  className="bg-brand-purple hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 transition-all transform hover:-translate-y-0.5 inline-flex"
                >
                  <i className="fas fa-copy"></i> Copy Analysis & Instruction Prompt
                </button>
              </div>
              <textarea 
                className="w-full h-64 p-3 border rounded-lg font-mono text-sm shadow-inner mb-4 focus:ring-2 focus:ring-brand-purple"
                placeholder="Paste the generated JSON here..."
                value={manualReportInput}
                onChange={(e) => setManualReportInput(e.target.value)}
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setReportMode('options')} 
                  className="px-6 py-2 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  Back
                </button>
                <button 
                  onClick={handleGenerateReportManual} 
                  disabled={!manualReportInput.trim()}
                  className="px-6 py-2 rounded-lg font-bold bg-brand-purple text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  Generate Report
                </button>
              </div>
            </div>
          )}

          {isReportLoading && <div className="text-center p-8 font-bold text-brand-purple animate-pulse">Generating your comprehensive report...</div>}
          {reportData && (
            <div className="space-y-6 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReportSection title="Progress Over Time" icon="fas fa-chart-line" color="purple">
                  <ProgressLineChart data={reportData.progressOverTime} />
                </ReportSection>
                <ReportSection title="Session Statistics" icon="fas fa-calendar-check" color="blue">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-3xl font-bold">{reportData.statistics.attended}</p><p className="text-sm font-semibold">Attended</p></div>
                    <div><p className="text-3xl font-bold text-red-600">{reportData.statistics.missed}</p><p className="text-sm font-semibold">Missed</p></div>
                    <div><p className="text-3xl font-bold">{reportData.totalLearningHours}</p><p className="text-sm font-semibold">Hours</p></div>
                  </div>
                </ReportSection>
              </div>
              
              <ReportSection title="Overall Summary" icon="fas fa-info-circle" color="gray">
                <p>{reportData.overallSummary}</p>
              </ReportSection>

              <ReportSection title="Critical Evaluation" icon="fas fa-flag" color="yellow">
                <p>{reportData.criticalEvaluation}</p>
              </ReportSection>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReportSection title="Competency Analysis" icon="fas fa-tasks" color="blue">
                  <h4 className="font-semibold text-green-800 mb-1">Strengths</h4>
                  <ul className="list-disc list-inside text-sm">
                    {reportData.competencyAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                  <h4 className="font-semibold text-red-800 mt-3 mb-1">Areas for Improvement</h4>
                  <ul className="list-disc list-inside text-sm">
                    {reportData.competencyAnalysis.areasForImprovement.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </ReportSection>
                <ReportSection title="Session Learning Analysis" icon="fas fa-book-reader" color="orange">
                  <h4 className="font-semibold text-green-800 mb-1">Common Positive Themes</h4>
                  <ul className="list-disc list-inside text-sm">
                    {reportData.sessionLearningAnalysis.commonThemesPositive.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                  <h4 className="font-semibold text-red-800 mt-3 mb-1">Common Challenges</h4>
                  <ul className="list-disc list-inside text-sm">
                    {reportData.sessionLearningAnalysis.commonThemesNeedsHelp.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </ReportSection>
              </div>

              <ReportSection title="Needs & Learning Path" icon="fas fa-map-signs" color="purple">
                <p>{reportData.needsAndPathAnalysis}</p>
              </ReportSection>
              
              <ReportSection title="Suggested Next Steps" icon="fas fa-rocket" color="green">
                <ul className="list-decimal list-inside space-y-2">
                  {reportData.suggestedNextSteps.map((q, i) => <li key={i} className="bg-green-100 p-2 rounded-md">{q}</li>)}
                </ul>
              </ReportSection>

              {/* Removing Email Report button as per instructions to centralize in Email Suite */}
            </div>
          )}
        </Modal>

        {/* Other Modals */}
        {learner && (
          <>
            <DateActionModal
              isOpen={isDateActionModalOpen}
              onClose={() => setIsDateActionModalOpen(false)}
              selectedDate={selectedDate}
              learnerOrGroup={learner}
              allLearners={learners}
              allEvents={calendarEvents}
              onSaveEvent={handleSaveEvent}
              onSaveSession={handleSaveSession}
              onSaveLearner={handleUpdateLearner}
            />
            <EmailComposerModal
              isOpen={isEmailComposerOpen}
              onClose={() => setIsEmailComposerOpen(false)}
              learner={learner}
            />
          </>
        )}

        {/* INTERACTIVE PREMIUM TOUR POPUP */}
        {tourStep !== null && (
          <div className="fixed bottom-6 right-6 max-w-md w-full z-[9999] bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.4)] backdrop-blur-xl rounded-2xl text-slate-100 hover:shadow-[0_24px_64px_rgba(0,0,0,0.5)] transition-all duration-300 animate-slide-up-fade">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300" 
                style={{ width: `${((tourStep + 1) / LEARNER_PROFILE_TOUR_STEPS.length) * 100}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between mb-3 mt-1">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Learner Profile Tour
              </span>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                Step {tourStep + 1} of {LEARNER_PROFILE_TOUR_STEPS.length}
              </span>
            </div>

            {/* Keyed step-transition wrapper to animate text updates effortlessly */}
            <div key={tourStep} className="animate-step-transition">
              <h4 className="text-lg font-black tracking-tight mb-2 flex items-center gap-2 text-white">
                {LEARNER_PROFILE_TOUR_STEPS[tourStep].title}
              </h4>

              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                {LEARNER_PROFILE_TOUR_STEPS[tourStep].text}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-2">
              {/* Play Aloud voice button */}
              <button 
                onClick={() => isSpeaking ? stopSpeaking() : speakText(LEARNER_PROFILE_TOUR_STEPS[tourStep].text)}
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
                  {tourStep === LEARNER_PROFILE_TOUR_STEPS.length - 1 ? 'Finish 🎉' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isSmartGoalTrackerOpen && (
          <SmartGoalTrackerModal learner={learner} onClose={() => setIsSmartGoalTrackerOpen(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default LearnerProfile;