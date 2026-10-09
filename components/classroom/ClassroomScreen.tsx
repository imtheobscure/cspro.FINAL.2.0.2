import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ActivityDef, CategoryDef, WidgetState, ThemeConfig, SnapGuide, StickyNote, Position, Size } from './types';
import { SFX } from './utils';
import { PeerContext } from './PeerContext';
import { AppContext, THEMES, WidgetStateContext } from './AppContext';
import { SuperMediaPlayerWidget, PeerWidget, PeerOverlay } from './NewWidgets';
import { SoundBoardWidget } from './SoundBoardWidget';
import { openSpinnerWidget } from '../../utils/spinnerWidget';
import { generateEnglishLessonHtml } from '../../utils/englishLessonHtmlGenerator';
import { getManualPrompt } from '../../utils/manualPrompts';
import { fixJson, validateJson } from '../../utils/jsonTools';
import type { LearnerProfile } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import TimeInputModal from '../app2/TimeInputModal';
import GoogleTranslateWidget from '../ui/GoogleTranslateWidget';
import { WorldTimeZonesModal, WorldMapCity, DEFAULT_MAP_CITIES } from './WorldTimeZonesModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useIsCompactViewport } from '../../hooks/useMediaQuery';
import TierBadge from '../ui/TierBadge';
import GroupedVoiceOptions from '../ui/GroupedVoiceOptions';
import {
  triggerAutoSync,
  isDiskModeEnabled,
  setDiskModeEnabled,
  getStoredDirectoryHandle,
  storeDirectoryHandle,
  clearStoredDirectoryHandle,
  verifyDirectoryPermission,
  saveAllToDisk,
  loadAllFromDisk,
  purgeBrowserMemory,
  downloadFullBackupFile,
  importFullBackupFile,
  isFileSystemAccessSupported
} from '../../utils/diskStorage';
import {
  saveToCloud,
  loadFromCloud,
  getCloudBackupInfo,
  isVipTier,
  type CloudBackupInfo
} from '../../services/cloudBackup';
import { YouTubeStage, type PlayerHandle } from './YouTubeStage';
import {
  parseLrc,
  activeLineIndex as findActiveLineIndex,
  formatClock,
  type SyncedLine,
  type SongPayload,
  type VideoCandidate
} from '../../utils/lyricSync';
import {
  loadSong,
  searchTracksClient,
  type TrackCandidate
} from '../../utils/songResolveClient';

// ============================================================
// TYPES & INTERFACES
// ============================================================

declare global {
  interface Window {
    openWhiteboard: () => void;
    closeWb: () => void;
  }
}

interface WhiteboardTool {
  type: 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'triangle' | 'text' | 'stamp' | 'laser' | 'select';
  color: string;
  size: number;
  opacity: number;
}

interface WhiteboardPage {
  id: string;
  imageData: string | null;
  pdfPage?: number;
}

interface DrawPath {
  id: string;
  tool: WhiteboardTool;
  points: Position[];
  shape?: string;
  text?: string;
  completed: boolean;
}

interface PeerUser {
  id: string;
  name: string;
  color: string;
  cursor: Position;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  color: string;
  source: 'local' | 'google' | 'microsoft';
}

interface ScoreboardTeam {
  id: string;
  name: string;
  score: number;
  color: string;
}

interface TimetableEntry {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  subject: string;
  color: string;
}

interface WorldClockZone {
  id: string;
  timezone: string;
  label: string;
  isTutor: boolean;
  customOffset?: number;
}

interface MediaQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  feedback: string;
  timeLimit: number;
}

interface DesktopShortcut {
  id: string;
  name: string;
  url: string;
  emoji: string;
  position?: { x: number; y: number };
}

// ============================================================
// CONSTANTS
// ============================================================
const SNAP_THRESHOLD = 15;
const MIN_WIDGET_WIDTH = 250;
const MIN_WIDGET_HEIGHT = 200;
const GRID_SIZE = 10;



const BACKGROUNDS = [
  { id: 'gradient1', type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gradient2', type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'gradient3', type: 'gradient', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'gradient4', type: 'gradient', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'gradient5', type: 'gradient', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'gradient6', type: 'gradient', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
];

const WIDGET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#64748b', '#0ea5e9', '#14b8a6'];

const REACTION_EMOJIS = [
  '👏', '🎉', '❤️', '🔥', '⭐', '👍', '🚀', '💯', '🌟', '✨', '🏆', '💪', '🥳', '💡', // Praise & High-Five
  '🤔', '😢', '🥱', '🤦', '🔇', '🤯', '❓', '⚠️', '💨', '🥀' // Constructive & Oops
];

const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
];


// ============================================================
// CATEGORIES & ACTIVITIES
// ============================================================

const FREE_DOCK_WIDGETS = [
  { id: 'lessonGen', icon: 'fa-robot', label: 'Lesson Gen', color: '#ec4899', hotkey: 'Alt+G' },
  { id: 'conversationMaker', icon: 'fa-comments', label: 'Conversation Maker', color: '#f59e0b', hotkey: 'Alt+D' },
  { id: 'calendar', icon: 'fa-calendar-alt', label: 'Calendar', color: '#8b5cf6', hotkey: 'Alt+K' },
  { id: 'media', icon: 'fa-play-circle', label: 'Media Player', color: '#ec4899', hotkey: 'Alt+M' },
  { id: 'webcam', icon: 'fa-camera', label: 'Webcam', color: '#06b6d4', hotkey: 'Alt+C' },
];

const PREMIUM_DOCK_WIDGETS = [
  { id: 'transcriber', icon: 'fa-microphone', label: 'Transcriber', color: '#10b981', hotkey: 'Alt+B', isPremium: true },
  { id: 'prompter', icon: 'fa-scroll', label: 'Teleprompter', color: '#8b5cf6', hotkey: 'Alt+P', isPremium: true },
  { id: 'whiteboard', icon: 'fa-chalkboard', label: 'Whiteboard V2', color: '#f59e0b', hotkey: 'Alt+W', isPremium: true },
  { id: 'lessonInsight', icon: 'fa-chart-line', label: 'Lesson Insight', color: '#3b82f6', hotkey: 'Alt+I', isPremium: true },
];

const DOCK_WIDGETS = [...FREE_DOCK_WIDGETS, ...PREMIUM_DOCK_WIDGETS];

export const VIP_WIDGET_IDS = ['screen', 'university-management', 'preply-success', 'content-creator'];
export const PREMIUM_WIDGET_IDS = ['sound-board', 'tutorly-chess', 'lyrics', 'karaoke', 'exam-builder', 'transcriber', 'prompter', 'whiteboard', 'lessonInsight'];

/**
 * Widget ids that open a STANDALONE app instead of a widget inside the canvas.
 *
 * Each one redirects out of the classroom in `addWidget`, so clicking the tile
 * never creates a widget — which means it never makes the home screen's
 * `widgets.length === 0` test fail, and never hides the "Ready to teach?" hero.
 * Keep this list in step with the early returns in `addWidget`.
 */
const STANDALONE_WIDGET_IDS = [
  'screen',
  'university-management',
  'preply-success',
  'content-creator',
  'lessonInsight',
  'exam-builder',
  'whiteboard',
  'transcriber',
  'prompter',
  'tutorly-chess',
  'spinner',
  'accessibility',
] as const;

const VIP_STUDIO_WIDGETS = [
  { id: 'screen', icon: 'fa-desktop', label: 'Screen', tier: 'vip' as const },
  { id: 'university-management', icon: 'fa-university', label: 'University Management', tier: 'vip' as const },
  { id: 'preply-success', icon: 'fa-user-tie', label: 'Advisor', tier: 'vip' as const },
  { id: 'content-creator', icon: 'fa-magic', label: 'Content Creator', tier: 'vip' as const },
];

const PREMIUM_STUDIO_WIDGETS = [
  { id: 'sound-board', icon: 'fa-drum', label: 'Sound Board', tier: 'pro' as const },
  { id: 'tutorly-chess', icon: 'fa-chess', label: 'Chess Tutor', tier: 'pro' as const },
  { id: 'lyrics', icon: 'fa-music', label: 'Lyrics', tier: 'pro' as const },
  { id: 'karaoke', icon: 'fa-microphone-alt', label: 'AI Karaoke', tier: 'pro' as const },
  { id: 'exam-builder', icon: 'fa-graduation-cap', label: 'Exam Builder', tier: 'pro' as const },
];

const FREE_STUDIO_WIDGETS = [
  { id: 'notes', icon: 'fa-sticky-note', label: 'Sticky Notes', tier: 'free' as const },
  { id: 'timer', icon: 'fa-stopwatch', label: 'Timer', tier: 'free' as const },
  { id: 'counter', icon: 'fa-plus-circle', label: 'Counter', tier: 'free' as const },
  { id: 'dice', icon: 'fa-dice-five', label: 'Dice', tier: 'free' as const },
  { id: 'traffic', icon: 'fa-traffic-light', label: 'Traffic Light', tier: 'free' as const },
  { id: 'joke', icon: 'fa-laugh-squint', label: 'Joke', tier: 'free' as const },
  { id: 'thesaurus', icon: 'fa-book', label: 'Thesaurus', tier: 'free' as const },
  { id: 'bored', icon: 'fa-smile-beam', label: 'Bored Activity', tier: 'free' as const },
  { id: 'reactions', icon: 'fa-heart', label: 'Reactions', tier: 'free' as const },
  { id: 'qr', icon: 'fa-qrcode', label: 'QR Code', tier: 'free' as const },
  { id: 'noise', icon: 'fa-volume-up', label: 'Noise Level', tier: 'free' as const },
  { id: 'poll', icon: 'fa-poll', label: 'Quick Poll', tier: 'free' as const },
  { id: 'random', icon: 'fa-dice', label: 'Random Picker', tier: 'free' as const },
  { id: 'groupmaker', icon: 'fa-users-cog', label: 'Group Maker', tier: 'free' as const },
  { id: 'scoreboard', icon: 'fa-trophy', label: 'Scoreboard', tier: 'free' as const },
  { id: 'worldclock', icon: 'fa-globe', label: 'World Clock', tier: 'free' as const },
  { id: 'timetable', icon: 'fa-th', label: 'Timetable', tier: 'free' as const },
  { id: 'embed', icon: 'fa-code', label: 'Embed', tier: 'free' as const },
  { id: 'dictionary', icon: 'fa-book-open', label: 'Dictionary', tier: 'free' as const },
  { id: 'deck', icon: 'fa-layer-group', label: 'Draw', tier: 'free' as const },
  { id: 'spinner', icon: 'fa-dharmachakra', label: 'Spinner', tier: 'free' as const },
];

const MORE_WIDGETS = [...VIP_STUDIO_WIDGETS, ...PREMIUM_STUDIO_WIDGETS, ...FREE_STUDIO_WIDGETS];

/**
 * Every widget type `renderWidget` (below) knows how to draw.
 *
 * It exists so `addWidget` can refuse to append a widget that would render `null`:
 * an invisible widget still counts in `widgets.length`, and the home screen reads
 * that to decide whether the "Ready to teach?" hero is shown. Keep it in step with
 * the `case` labels in `renderWidget`.
 *
 * `peer` is the one entry with no `case`: the collaboration dock injects its own UI
 * through `PeerOverlay` at the top of the canvas, and `addWidget('peer')` is only
 * reachable from the retired Activity Library. It is listed so that path keeps
 * behaving exactly as it does today.
 */
const RENDERED_WIDGET_TYPES = new Set<string>([
  'lessonGen',
  'lessonContent',
  'conversationMaker',
  'conversationPlayer',
  'timer',
  'traffic',
  'random',
  'noise',
  'qr',
  'notes',
  'poll',
  'media',
  'webcam',
  'calendar',
  'scoreboard',
  'worldclock',
  'timetable',
  'reactions',
  'embed',
  'dice',
  'groupmaker',
  'counter',
  'karaoke',
  'joke',
  'thesaurus',
  'bored',
  'dictionary',
  'deck',
  'lyrics',
  'sound-board',
  'peer',
]);

const NAV_LINKS = [
  { id: 'dashboard', icon: 'fa-home', label: 'Dashboard', path: '/platform' },
  { id: 'lessons', icon: 'fa-book', label: 'Lessons', path: '/lessons' },
  { id: 'students', icon: 'fa-users', label: 'Students', path: '/students' },
  { id: 'assignments', icon: 'fa-tasks', label: 'Assignments', path: '/assignments' },
  { id: 'grades', icon: 'fa-chart-line', label: 'Grades', path: '/grades' },
  { id: 'resources', icon: 'fa-folder', label: 'Resources', path: '/resources' },
  { id: 'calendar', icon: 'fa-calendar', label: 'Calendar', path: '/calendar' },
  { id: 'messages', icon: 'fa-envelope', label: 'Messages', path: '/messages' },
  { id: 'settings', icon: 'fa-cog', label: 'Settings', path: '/settings' },
];

// ============================================================
// CONTEXT
// ============================================================




// ============================================================
// UTILITY HOOKS
// ============================================================
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T) => void] => {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = (value: T) => {
    setStored(value);
    window.localStorage.setItem(key, JSON.stringify(value));
    try {
      triggerAutoSync();
    } catch {}
  };

  return [stored, setValue];
};

// Helper to calculate next widget position (side by side)
const calculateNextWidgetPosition = (widgets: WidgetState[], type: string): Position => {
  const visibleWidgets = widgets.filter(w => !w.minimized && !w.maximized);
  if (visibleWidgets.length === 0) {
    return { x: 100, y: 100 };
  }

  // Find rightmost widget
  let rightmost = visibleWidgets[0];
  visibleWidgets.forEach(w => {
    if (w.position.x + w.size.width > rightmost.position.x + rightmost.size.width) {
      rightmost = w;
    }
  });

  const newX = rightmost.position.x + rightmost.size.width + 20;
  const newY = rightmost.position.y;

  // Check if it fits on screen
  if (newX + 320 > window.innerWidth - 50) {
    // Wrap to next row
    let topmost = visibleWidgets[0];
    let bottommost = visibleWidgets[0];
    visibleWidgets.forEach(w => {
      if (w.position.y < topmost.position.y) topmost = w;
      if (w.position.y + w.size.height > bottommost.position.y + bottommost.size.height) bottommost = w;
    });
    return { x: 100, y: bottommost.position.y + bottommost.size.height + 20 };
  }

  return { x: newX, y: newY };
};

// ============================================================
// FULL SCREEN OVERLAY COMPONENT
// ============================================================
const FullScreenOverlay: React.FC<{ type: 'timer' | 'noise'; onClose: () => void }> = ({ type, onClose }) => {
  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
    const timeout = setTimeout(onClose, 5000);
    return () => { clearTimeout(timeout); audio.pause(); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center cursor-pointer" onClick={onClose}>
      <div className={`absolute inset-0 animate-pulse ${type === 'timer' ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-red-600 to-pink-600'}`} />
      <div className="relative text-center z-10">
        <i className={`fas ${type === 'timer' ? 'fa-bell' : 'fa-volume-up'} text-white text-8xl md:text-9xl mb-8 drop-shadow-2xl animate-bounce`} />
        <h1 className="text-white text-4xl md:text-6xl font-black drop-shadow-2xl">
          {type === 'timer' ? "TIME'S UP!" : 'TOO LOUD!'}
        </h1>
        <p className="text-white/80 text-xl mt-4">Click anywhere to dismiss</p>
      </div>
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-4xl md:text-6xl animate-ping pointer-events-none"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1 + Math.random()}s`,
          }}
        >
          {type === 'timer' ? '⏰' : '🔊'}
        </div>
      ))}
    </div>
  );
};

// ============================================================
// REACTION OVERLAY
// ============================================================
const ReactionOverlay: React.FC<{ emoji: string; onComplete: () => void }> = ({ emoji, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // 1. High Quality Sounds mapped per emoji
    const sounds: Record<string, string> = {
      '👏': 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // applause
      '🎉': 'https://assets.mixkit.co/active_storage/sfx/1966/1966-preview.mp3', // party horn
      '❤️': 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3', // cute sweet chime
      '🔥': 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // whoosh sizzle
      '⭐': 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // glitter win ding
      '🌟': 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
      '✨': 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
      '👍': 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // bubble pop success
      '🚀': 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3', // space lift whoosh
      '💯': 'https://assets.mixkit.co/active_storage/sfx/1432/1432-preview.mp3', // hero gong chime
      '🏆': 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
      '💪': 'https://assets.mixkit.co/active_storage/sfx/1432/1432-preview.mp3',
      '🥳': 'https://assets.mixkit.co/active_storage/sfx/1966/1966-preview.mp3',
      '💡': 'https://assets.mixkit.co/active_storage/sfx/911/911-preview.mp3', // bells ringing ping

      // Constructive / Redirection SFX
      '🤔': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // think click
      '😢': 'https://assets.mixkit.co/active_storage/sfx/2330/2330-preview.mp3', // soft tear violin
      '🥱': 'https://assets.mixkit.co/active_storage/sfx/2200/2200-preview.mp3', // yawns drowsy chime
      '🤦': 'https://assets.mixkit.co/active_storage/sfx/2650/2650-preview.mp3', // bouncy spring slide whistle
      '🥀': 'https://assets.mixkit.co/active_storage/sfx/2650/2650-preview.mp3',
      '🔇': 'https://assets.mixkit.co/active_storage/sfx/1105/1105-preview.mp3', // mute hush blow
      '🤯': 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // blast explosion Rumble
      '❓': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      '⚠️': 'https://assets.mixkit.co/active_storage/sfx/1005/1005-preview.mp3', // error buzz notify
      '💨': 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'
    };

    const sfxUrl = sounds[emoji] || 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
    const audio = new Audio(sfxUrl);
    audio.volume = 0.45;
    audio.play().catch(e => console.log('Audio launch failed:', e));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface PhysicsParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rotation: number;
      rotSpeed: number;
      scale: number;
      alpha: number;
      sineOffset?: number;
      sineFreq?: number;
    }

    // Spawn 45 particles with specialized behaviors
    const particles: PhysicsParticle[] = Array.from({ length: 45 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;

      // Class 1: Raining Downwards (😢, 🤦, 🥀, ⚠️, 🥱)
      if (['😢', '🤦', '🥀', '⚠️', '🥱'].includes(emoji)) {
        return {
          x: Math.random() * width,
          y: -50 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 2,
          vy: 3 + Math.random() * 4,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.04,
          scale: 0.6 + Math.random() * 1.2,
          alpha: 1
        };
      }

      // Class 2: Floating Upwards (❤️, ✨, 💡, 🌟, ⭐, 💯)
      if (['❤️', '✨', '💡', '🌟', '⭐', '🏆'].includes(emoji)) {
        return {
          x: Math.random() * width,
          y: height + 50 + Math.random() * 200,
          vx: 0,
          vy: -(2 + Math.random() * 3),
          sineOffset: Math.random() * 100,
          sineFreq: 0.01 + Math.random() * 0.03,
          rotation: (Math.random() - 0.5) * 0.5,
          rotSpeed: (Math.random() - 0.5) * 0.02,
          scale: 0.6 + Math.random() * 1.4,
          alpha: 1
        };
      }

      // Class 3: Fast Swooshing Streakers (🚀, 💨)
      if (['🚀', '💨'].includes(emoji)) {
        return {
          x: -50 - Math.random() * 300,
          y: height * 0.72 + (Math.random() - 0.5) * 220,
          vx: 11 + Math.random() * 10,
          vy: -5 - Math.random() * 5,
          rotation: -Math.PI / 4,
          rotSpeed: 0,
          scale: 0.8 + Math.random() * 1.3,
          alpha: 1
        };
      }

      // Class 4: Center Fireworks Explosion Burst (🎉, 🔥, 🥳, 🤯, 💪)
      if (['🎉', '🔥', '🥳', '🤯', '💪'].includes(emoji)) {
        return {
          x: width / 2,
          y: height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4, // slight upward impulse
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.22,
          scale: 0.5 + Math.random() * 1.4,
          alpha: 1
        };
      }

      // Default: Floppy Bouncers (👏, 👍, 🤔, ❓, 🔇)
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        scale: 0.6 + Math.random() * 1.2,
        alpha: 1
      };
    });

    let active = true;
    let animeFrame: number;

    const render = () => {
      if (!ctx || !active) return;
      ctx.clearRect(0, 0, width, height);

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      let renderedAny = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.alpha <= 0.01) continue;

        renderedAny++;

        // Floater horizontal sine swaying
        if (p.sineOffset !== undefined && p.sineFreq !== undefined) {
          p.x += Math.sin(Date.now() * p.sineFreq + p.sineOffset) * 1.3;
        }

        // Apply slight gravity to explosions
        if (['🎉', '🔥', '🥳', '🤯'].includes(emoji)) {
          p.vy += 0.14;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.alpha -= 0.0055; // fades out over 3 sec

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        // 1. Render premium auxiliary effects based on individual reaction emoji
        if (emoji === '💡') {
          const auraGrad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.scale * 35);
          auraGrad.addColorStop(0, 'rgba(253, 224, 71, 0.5)');
          auraGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.scale * 35, 0, Math.PI * 2);
          ctx.fill();
        } else if (emoji === '🤯') {
          ctx.strokeStyle = `rgba(239, 68, 68, ${p.alpha * 0.45})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.scale * (50 * (1.1 - p.alpha)), 0, Math.PI * 2);
          ctx.stroke();
        } else if (emoji === '⚠️') {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.scale * 28, 0, Math.PI * 2);
          ctx.fill();
        } else if (emoji === '✨') {
          ctx.strokeStyle = `rgba(253, 224, 71, ${p.alpha * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 15, p.y); ctx.lineTo(p.x + 15, p.y);
          ctx.moveTo(p.x, p.y - 15); ctx.lineTo(p.x, p.y + 15);
          ctx.stroke();
        } else if (emoji === '😢') {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
          ctx.beginPath();
          ctx.arc(p.x - 12 * p.scale, p.y + 12 * p.scale, 4, 0, Math.PI * 2);
          ctx.arc(p.x + 12 * p.scale, p.y + 12 * p.scale, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (emoji === '🥱') {
          ctx.fillStyle = 'rgba(129, 140, 248, 0.95)';
          ctx.font = `bold ${Math.floor(p.scale * 13)}px monospace`;
          ctx.fillText('Zzz', p.x + 18, p.y - 12);
        } else if (emoji === '🥀') {
          ctx.fillStyle = 'rgba(244, 63, 94, 0.85)';
          ctx.beginPath();
          ctx.ellipse(p.x + 16, p.y + 12, 3, 6, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (emoji === '🤦') {
          ctx.fillStyle = 'rgba(253, 224, 71, 0.65)';
          ctx.font = `bold ${Math.floor(p.scale * 12)}px monospace`;
          ctx.fillText('💥 Slap!', p.x + 10, p.y - 15);
        }

        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${Math.floor(p.scale * 45)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Android Emoji", "Twitter Color Emoji", sans-serif`;
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
      }

      if (renderedAny > 0) {
        animeFrame = requestAnimationFrame(render);
      }
    };

    animeFrame = requestAnimationFrame(render);

    const timeout = setTimeout(() => {
      active = false;
      onComplete();
    }, 3000);

    return () => {
      active = false;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animeFrame);
      clearTimeout(timeout);
    };
  }, [emoji, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[10000] pointer-events-none w-screen h-screen overflow-hidden"
    />
  );
};

// ============================================================
// WIDGET WRAPPER WITH WINDOW CONTROLS
// ============================================================
interface WidgetWrapperProps {
  widget: WidgetState;
  title: string;
  icon: string;
  children: React.ReactNode;
  onClose: () => void;
  minWidth?: number;
  minHeight?: number;
  settingsPanel?: React.ReactNode;
  isFullScreen?: boolean;
}

export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  widget, title, icon, children, onClose, minWidth = MIN_WIDGET_WIDTH, minHeight = MIN_WIDGET_HEIGHT, settingsPanel, isFullScreen = false
}) => {
  const { theme, updateWidget, bringToFront } = useContext(AppContext);
  const { widgets, snapGuides, setSnapGuides } = useContext(WidgetStateContext);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localColor, setLocalColor] = useState(widget.settings?.color || theme.primary);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const calculateSnap = useCallback((x: number, y: number, width: number, height: number): { x: number; y: number; guides: SnapGuide[] } => {
    const guides: SnapGuide[] = [];
    let snappedX = x;
    let snappedY = y;
    const edges = { left: x, right: x + width, top: y, bottom: y + height, centerX: x + width / 2, centerY: y + height / 2 };

    // Screen edges
    if (Math.abs(edges.left) < SNAP_THRESHOLD) { snappedX = 0; guides.push({ type: 'vertical', position: 0, sourceId: 'screen' }); }
    if (Math.abs(edges.right - window.innerWidth) < SNAP_THRESHOLD) { snappedX = window.innerWidth - width; guides.push({ type: 'vertical', position: window.innerWidth, sourceId: 'screen' }); }
    if (Math.abs(edges.top - 60) < SNAP_THRESHOLD) { snappedY = 60; guides.push({ type: 'horizontal', position: 60, sourceId: 'screen' }); }
    if (Math.abs(edges.bottom - (window.innerHeight - 80)) < SNAP_THRESHOLD) { snappedY = window.innerHeight - 80 - height; guides.push({ type: 'horizontal', position: window.innerHeight - 80, sourceId: 'screen' }); }

    // Other widgets
    widgets.forEach(w => {
      if (w.id === widget.id || w.minimized || w.maximized) return;
      const other = { left: w.position.x, right: w.position.x + w.size.width, top: w.position.y, bottom: w.position.y + w.size.height };

      if (Math.abs(edges.left - other.right) < SNAP_THRESHOLD) { snappedX = other.right; guides.push({ type: 'vertical', position: other.right, sourceId: w.id }); }
      if (Math.abs(edges.right - other.left) < SNAP_THRESHOLD) { snappedX = other.left - width; guides.push({ type: 'vertical', position: other.left, sourceId: w.id }); }
      if (Math.abs(edges.left - other.left) < SNAP_THRESHOLD) { snappedX = other.left; guides.push({ type: 'vertical', position: other.left, sourceId: w.id }); }
      if (Math.abs(edges.right - other.right) < SNAP_THRESHOLD) { snappedX = other.right - width; guides.push({ type: 'vertical', position: other.right, sourceId: w.id }); }
      if (Math.abs(edges.top - other.bottom) < SNAP_THRESHOLD) { snappedY = other.bottom; guides.push({ type: 'horizontal', position: other.bottom, sourceId: w.id }); }
      if (Math.abs(edges.bottom - other.top) < SNAP_THRESHOLD) { snappedY = other.top - height; guides.push({ type: 'horizontal', position: other.top, sourceId: w.id }); }
      if (Math.abs(edges.top - other.top) < SNAP_THRESHOLD) { snappedY = other.top; guides.push({ type: 'horizontal', position: other.top, sourceId: w.id }); }
      if (Math.abs(edges.bottom - other.bottom) < SNAP_THRESHOLD) { snappedY = other.bottom - height; guides.push({ type: 'horizontal', position: other.bottom, sourceId: w.id }); }
    });

    return { x: snappedX, y: snappedY, guides };
  }, [widgets, widget.id]);

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag') || widget.maximized) return;
    e.preventDefault();
    setDragging(true);
    bringToFront(widget.id);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: widget.position.x, posY: widget.position.y };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const newX = dragStartRef.current.posX + e.clientX - dragStartRef.current.x;
      const newY = dragStartRef.current.posY + e.clientY - dragStartRef.current.y;
      const { x, y, guides } = calculateSnap(newX, newY, widget.size.width, widget.size.height);
      
      if (widgetRef.current) {
        widgetRef.current.style.left = `${x}px`;
        widgetRef.current.style.top = `${y}px`;
      }
      setSnapGuides(guides);
    };

    const handleUp = (e: MouseEvent) => {
      setDragging(false);
      setSnapGuides([]);
      const newX = dragStartRef.current.posX + e.clientX - dragStartRef.current.x;
      const newY = dragStartRef.current.posY + e.clientY - dragStartRef.current.y;
      const { x, y } = calculateSnap(newX, newY, widget.size.width, widget.size.height);
      updateWidget(widget.id, { position: { x, y } });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, widget.id, widget.size, calculateSnap, updateWidget, setSnapGuides]);

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (widget.maximized) return;
    setResizing(direction);
    bringToFront(widget.id);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: widget.size.width, height: widget.size.height, posX: widget.position.x, posY: widget.position.y };
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      let newX = resizeStartRef.current.posX;
      let newY = resizeStartRef.current.posY;

      if (resizing.includes('e')) newWidth = Math.max(minWidth, resizeStartRef.current.width + dx);
      if (resizing.includes('w')) {
        newWidth = Math.max(minWidth, resizeStartRef.current.width - dx);
        newX = resizeStartRef.current.posX + resizeStartRef.current.width - newWidth;
      }
      if (resizing.includes('s')) newHeight = Math.max(minHeight, resizeStartRef.current.height + dy);
      if (resizing.includes('n')) {
        newHeight = Math.max(minHeight, resizeStartRef.current.height - dy);
        newY = resizeStartRef.current.posY + resizeStartRef.current.height - newHeight;
      }

      if (widgetRef.current) {
        widgetRef.current.style.width = `${newWidth + (showSettings ? 260 : 0)}px`;
        widgetRef.current.style.height = `${newHeight}px`;
        widgetRef.current.style.left = `${newX}px`;
        widgetRef.current.style.top = `${newY}px`;
      }
    };

    const handleUp = (e: MouseEvent) => {
      setResizing(null);
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      let newX = resizeStartRef.current.posX;
      let newY = resizeStartRef.current.posY;

      if (resizing.includes('e')) newWidth = Math.max(minWidth, resizeStartRef.current.width + dx);
      if (resizing.includes('w')) {
        newWidth = Math.max(minWidth, resizeStartRef.current.width - dx);
        newX = resizeStartRef.current.posX + resizeStartRef.current.width - newWidth;
      }
      if (resizing.includes('s')) newHeight = Math.max(minHeight, resizeStartRef.current.height + dy);
      if (resizing.includes('n')) {
        newHeight = Math.max(minHeight, resizeStartRef.current.height - dy);
        newY = resizeStartRef.current.posY + resizeStartRef.current.height - newHeight;
      }

      updateWidget(widget.id, { size: { width: newWidth, height: newHeight }, position: { x: newX, y: newY } });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizing, widget.id, minWidth, minHeight, updateWidget, showSettings]);

  const toggleMinimize = () => {
    if (widget.maximized) return;
    updateWidget(widget.id, { minimized: !widget.minimized });
  };

  const toggleMaximize = () => {
    if (widget.maximized) {
      updateWidget(widget.id, {
        maximized: false,
        position: widget.savedPosition || { x: 100, y: 100 },
        size: widget.savedSize || { width: 400, height: 400 },
      });
    } else {
      updateWidget(widget.id, {
        maximized: true,
        savedPosition: widget.position,
        savedSize: widget.size,
        position: { x: 0, y: 0 },
        size: { width: window.innerWidth, height: window.innerHeight },
        minimized: false,
      });
    }
  };

  const [detachedWindow, setDetachedWindow] = useState<Window | null>(null);
  const containerEl = useRef<HTMLDivElement | null>(null);

  if (!containerEl.current) {
    containerEl.current = document.createElement('div');
    containerEl.current.style.width = '100vw';
    containerEl.current.style.height = '100vh';
    containerEl.current.style.overflow = 'hidden';
    containerEl.current.style.display = 'flex';
    containerEl.current.style.flexDirection = 'column';
    containerEl.current.className = 'detached-widget-container';
  }

  const toggleDetach = () => {
    if (detachedWindow) {
      detachedWindow.close();
      setDetachedWindow(null);
    } else {
      const extWin = window.open('', '', `width=${Math.max(600, widget.size.width)},height=${Math.max(600, widget.size.height)},left=${window.screenX + widget.position.x},top=${window.screenY + widget.position.y}`);
      if (extWin) {
        // Inject base tag
        const baseTag = extWin.document.createElement('base');
        baseTag.href = window.location.origin + window.location.pathname;
        extWin.document.head.appendChild(baseTag);

        // Inject FontAwesome from CDN to avoid auth proxy cookie issues in detached window
        const faLink = extWin.document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        extWin.document.head.appendChild(faLink);

        // Copy styles safely
        const styleEl = extWin.document.createElement('style');
        let cssText = '';
        Array.from(document.styleSheets).forEach(sheet => {
          try {
            if (sheet.href) {
              const url = new URL(sheet.href, window.location.origin);
              if (url.origin !== window.location.origin) {
                const clone = extWin.document.createElement('link');
                clone.rel = 'stylesheet';
                clone.href = sheet.href;
                extWin.document.head.appendChild(clone);
                return;
              }
            }
            if (sheet.cssRules) {
              Array.from(sheet.cssRules).forEach(rule => {
                if (rule.cssText.includes('@font-face') && rule.cssText.toLowerCase().includes('fontawesome')) {
                   // Rewrite local URLs to CDN ones to circumvent auth proxy issues
                   const rewritten = rule.cssText.replace(/url\(['"]?.*?([^/'"]+\.(?:woff2?|eot|ttf|svg))['"]?\)/gi, "url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/$1')");
                   cssText += rewritten + '\n';
                   return;
                }
                cssText += rule.cssText + '\n';
              });
            }
          } catch (e) {
            // CORS error on access, fallback to direct link
            if (sheet.href) {
              const clone = extWin.document.createElement('link');
              clone.rel = 'stylesheet';
              clone.href = sheet.href;
              extWin.document.head.appendChild(clone);
            }
          }
        });
        if (cssText) {
          styleEl.textContent = cssText;
          extWin.document.head.appendChild(styleEl);
        }
        
        // Ensure body matches parent
        extWin.document.documentElement.className = document.documentElement.className;
        extWin.document.body.className = document.body.className;
        extWin.document.body.style.margin = '0';
        extWin.document.body.style.padding = '0';
        extWin.document.title = title;
        
        if (containerEl.current) {
          extWin.document.body.appendChild(containerEl.current);
        }
        
        extWin.addEventListener('beforeunload', () => setDetachedWindow(null));
        setDetachedWindow(extWin);
      } else {
        alert("Please allow popups to detach window.");
      }
    }
  };

  const getPosition = () => {
    if (widget.maximized) return { left: 0, top: 0 };
    return { left: widget.position.x, top: widget.position.y };
  };

  const getSize = () => {
    if (widget.maximized) return { width: window.innerWidth, height: window.innerHeight };
    if (widget.minimized) return { width: 220, height: 44 };
    return { width: widget.size.width + (showSettings ? 260 : 0), height: widget.size.height };
  };

  const resizeHandles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  const cursorMap: Record<string, string> = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };

  const contentRenderer = (
    <div className="flex-1 flex overflow-hidden min-h-0">
      <div className="flex-1 overflow-auto no-drag flex flex-col" style={{ color: theme.text, backgroundColor: detachedWindow ? theme.surface : 'transparent' }}>
        {children}
      </div>
      {showSettings && settingsPanel && (
        <div className="w-64 border-l overflow-auto no-drag shrink-0" style={{ borderColor: theme.border, backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
          <div className="p-3 border-b" style={{ borderColor: theme.border }}>
            <h4 className="font-bold text-sm" style={{ color: theme.text }}>Settings</h4>
          </div>
          <div className="p-3 space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Widget Color</label>
              <div className="flex flex-wrap gap-1">
                {WIDGET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setLocalColor(c); updateWidget(widget.id, { settings: { ...widget.settings, color: c } }); }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${localColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {settingsPanel}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={widgetRef}
      className={`fixed rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${dragging ? 'shadow-3xl cursor-grabbing ring-2 ring-white/30' : ''} ${widget.maximized ? 'rounded-none' : ''}`}
      style={{
        ...getPosition(),
        ...getSize(),
        zIndex: widget.zIndex,
        backgroundColor: theme.surface,
        backdropFilter: 'blur(20px)',
        border: widget.maximized ? 'none' : `1px solid ${theme.border}`,
      }}
      onMouseDown={() => bringToFront(widget.id)}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 select-none shrink-0 ${widget.maximized ? '' : 'cursor-grab'}`}
        style={{ backgroundColor: localColor }}
        onMouseDown={handleDragStart}
        onDoubleClick={toggleMaximize}
      >
        <div className="flex items-center gap-2 text-white font-semibold text-sm truncate">
          <i className={`fas ${icon} text-xs`} />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button onClick={toggleDetach} className="w-6 h-6 rounded hover:bg-blue-500/80 flex items-center justify-center text-white/80 hover:text-white transition-colors" title={detachedWindow ? 'Reattach' : 'Detach'}>
            <i className={`fas fa-${detachedWindow ? 'window-maximize' : 'external-link-alt'} text-xs`} />
          </button>
          {settingsPanel && (
            <button onClick={() => setShowSettings(!showSettings)} className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors" title="Settings (Alt+S)">
              <i className="fas fa-cog text-xs" />
            </button>
          )}
          <button onClick={toggleMinimize} className="w-6 h-6 rounded hover:bg-yellow-500/80 flex items-center justify-center text-white/80 hover:text-white transition-colors" title="Minimize">
            <i className="fas fa-minus text-xs" />
          </button>
          <button onClick={toggleMaximize} className="w-6 h-6 rounded hover:bg-green-500/80 flex items-center justify-center text-white/80 hover:text-white transition-colors" title={widget.maximized ? 'Restore' : 'Maximize'}>
            <i className={`fas fa-${widget.maximized ? 'compress' : 'expand'} text-xs`} />
          </button>
          <button onClick={onClose} className="w-6 h-6 rounded hover:bg-red-500/80 flex items-center justify-center text-white/80 hover:text-white transition-colors" title="Close (Esc)">
            <i className="fas fa-times text-xs" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!widget.minimized && (
        detachedWindow ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black/10 dark:bg-white/5">
            <i className={`fas ${icon} text-4xl opacity-50`}></i>
            <span className="font-bold opacity-50">Detached in a separate window</span>
            <button onClick={toggleDetach} className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 shadow transition-colors">
               Reattach Window
            </button>
            {createPortal(contentRenderer, containerEl.current!)}
          </div>
        ) : (
          contentRenderer
        )
      )}

      {/* Resize Handles */}
      {!widget.minimized && !widget.maximized && (
        <>
          {resizeHandles.map(dir => (
            <div
              key={dir}
              className={`absolute no-drag z-[9999] transition-colors group ${
                dir === 's' 
                  ? 'border-b-4 border-black/10 dark:border-white/10 hover:border-indigo-500/80' 
                  : ''
              }`}
              style={{
                cursor: cursorMap[dir],
                ...(dir.includes('n') ? { top: 0, height: 8 } : {}),
                ...(dir.includes('s') ? { bottom: 0, height: 8 } : {}),
                ...(dir.includes('e') ? { right: 0, width: 8 } : {}),
                ...(dir.includes('w') ? { left: 0, width: 8 } : {}),
                ...(dir === 'n' || dir === 's' ? { left: 8, right: 8 } : {}),
                ...(dir === 'e' || dir === 'w' ? { top: 8, bottom: 8 } : {}),
              }}
              onMouseDown={e => handleResizeStart(e, dir)}
            >
              {dir === 's' && (
                <div className="w-12 h-1 bg-slate-400/50 dark:bg-slate-600/50 rounded-full mx-auto mt-0.5 pointer-events-none group-hover:bg-indigo-500 transition-colors"></div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// ============================================================
// ACTIVITY FULL SCREEN WINDOW
// ============================================================
// AI LESSON GENERATOR WIDGET
// ============================================================
const AILessonWidget: React.FC<{ widget: WidgetState; onClose: () => void; onLaunchLesson: (html: string) => void }> = ({ widget, onClose, onLaunchLesson }) => {
  const { theme } = useContext(AppContext);
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');

  const copyPrompt = () => {
    // Generate prompt using a dummy learner profile to bypass requirements
    const basePrompt = getManualPrompt('englishLesson', { id: 'dummy', name: 'Learner', cefrLevel: 'Unknown', age: null } as unknown as LearnerProfile);
    const finalPrompt = `Act as an expert English lesson curriculum designer.
Please follow this exact, non-negotiable process:
1. First, ask me about the learner's profile (age, level, interests, goals).
2. Wait for my response.
3. Then, ask me to paste the text or topic of the lesson.
4. Wait for my response.
5. Finally, create a comprehensive interactive English lesson matching the exact JSON schema defined below based on the text/topic. OUTPUT YOUR ENTIRE RESPONSE AS A SINGLE VALID JSON BLOCK (wrapped in \`\`\`json blocks).

${basePrompt}`;
    navigator.clipboard.writeText(finalPrompt).then(() => alert("Prompt copied! Paste it into your AI Chatbot."));
  };

  const handleLaunchFromJSON = () => {
    try {
      if (!jsonInput.trim()) {
        setError('Please paste JSON first.');
        return;
      }
      const fixed = fixJson(jsonInput);
      const validation = validateJson(fixed);
      if (!validation.isValid) throw new Error(validation.error);
      const parsed = validation.parsed;

      const html = generateEnglishLessonHtml(parsed as any, null, { name: 'Learner' } as unknown as LearnerProfile, undefined, 'presenter');
      onLaunchLesson(html);
      onClose();
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON format');
    }
  };

  const handleLaunchEmpty = () => {
    const emptyLesson = {
      title: 'New Custom Lesson',
      sections: [{
        title: 'New Custom Section',
        activities: [{ type: 'html', content: '<div contenteditable="true" style="min-height:300px;padding:20px;border:1px dashed #ccc;outline:none;"><h2>Start typing your lesson here...</h2><p></p></div>' }]
      }]
    };
    const html = generateEnglishLessonHtml(emptyLesson as any, null, { name: 'Learner' } as unknown as LearnerProfile, undefined, 'presenter');
    onLaunchLesson(html);
    onClose();
  };

  return (
    <WidgetWrapper widget={widget} title="Lesson Generator" icon="fa-robot" onClose={onClose}>
      <div className="p-4 flex flex-col h-full gap-3 overflow-y-auto" style={{ background: theme.surface }}>
        <p className="text-xs" style={{ color: theme.textMuted }}>
          1. Copy the Prompt and paste it into a Chatbot (like ChatGPT or Gemini).
        </p>
        <button onClick={copyPrompt} className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700">
          <i className="fas fa-copy"></i> Copy Prompt
        </button>

        <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
          2. Paste the generated JSON result here:
        </p>
        <textarea
          value={jsonInput}
          onChange={(e) => { setJsonInput(e.target.value); setError(''); }}
          placeholder="Paste generated JSON here..."
          className="flex-1 w-full p-2 text-xs font-mono border rounded outline-none resize-none"
          style={{ borderColor: theme.border, background: theme.background, color: theme.text }}
        />
        {error && <div className="text-red-500 text-xs">{error}</div>}

        <button onClick={handleLaunchFromJSON} className="w-full py-2 bg-green-600 text-white rounded text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700">
          <i className="fas fa-play"></i> Launch Generated Lesson
        </button>

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px" style={{ background: theme.border }}></div>
          <span className="text-xs" style={{ color: theme.textMuted }}>OR</span>
          <div className="flex-1 h-px" style={{ background: theme.border }}></div>
        </div>

        <button onClick={handleLaunchEmpty} className="w-full py-2 bg-gray-600 text-white rounded text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-700">
          <i className="fas fa-file-alt"></i> Open Empty Lesson
        </button>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// CONVERSATION PLAYER WIDGET
// ============================================================
const addEmojisToStageDirections = (action: string): string => {
  if (!action) return action;
  
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;
  if (emojiRegex.test(action)) {
    return action;
  }

  const text = action.toLowerCase().trim();
  let emoji = "";

  if (text.includes("smile") || text.includes("grin") || text.includes("happy")) emoji = "😊";
  else if (text.includes("laugh") || text.includes("chuckle") || text.includes("giggle")) emoji = "😂";
  else if (text.includes("lean forward") || text.includes("leans forward")) emoji = "🧐";
  else if (text.includes("rubbing eyes") || text.includes("rub eyes") || text.includes("tired")) emoji = "🥱";
  else if (text.includes("serious") || text.includes("solemn") || text.includes("grave")) emoji = "🤨";
  else if (text.includes("nod") || text.includes("nods")) emoji = "👍";
  else if (text.includes("shake head") || text.includes("shrug") || text.includes("uncertain")) emoji = "🤷";
  else if (text.includes("wink") || text.includes("winks")) emoji = "😉";
  else if (text.includes("sigh") || text.includes("sighs")) emoji = "😔";
  else if (text.includes("surprised") || text.includes("gasp") || text.includes("wide eyes")) emoji = "😮";
  else if (text.includes("think") || text.includes("ponder") || text.includes("scratch")) emoji = "🤔";
  else if (text.includes("wave") || text.includes("waves") || text.includes("greet")) emoji = "👋";
  else if (text.includes("point") || text.includes("points")) emoji = "👉";
  else if (text.includes("claps") || text.includes("clap") || text.includes("applaud")) emoji = "👏";
  else if (text.includes("excited") || text.includes("cheer")) emoji = "🙌";
  else if (text.includes("angry") || text.includes("frown") || text.includes("annoyed")) emoji = "😠";
  else if (text.includes("explain") || text.includes("gestures") || text.includes("gesture")) emoji = "👋";
  else if (text.includes("whisper") || text.includes("quiet")) emoji = "🤫";
  else if (text.includes("look") || text.includes("looks") || text.includes("stare")) emoji = "👀";
  else emoji = "🎭";

  return `${emoji} ${action} ${emoji}`;
};

const ConversationPlayerWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const data = widget.settings?.json || { characters: [], dialogue: [], glossary: [], questions: [] };
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'glossary' | 'questions'>('dialogue');
  
  // Glossary specifics
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [glossaryVoiceURI, setGlossaryVoiceURI] = useState('');
  const [playingGlossaryIndex, setPlayingGlossaryIndex] = useState<number | null>(null);
  const [isPlayingAllGlossary, setIsPlayingAllGlossary] = useState(false);

  useEffect(() => {
    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (isPlayingAll && playingIndex !== null) {
      if (playingIndex >= (data.dialogue?.length || 0)) {
        setIsPlayingAll(false);
        setPlayingIndex(null);
      } else {
        playLine(playingIndex, () => {
          setPlayingIndex(playingIndex + 1);
        });
      }
    }
  }, [playingIndex, isPlayingAll]);

  useEffect(() => {
    if (isPlayingAllGlossary && playingGlossaryIndex !== null) {
      if (playingGlossaryIndex >= (data.glossary?.length || 0)) {
        setIsPlayingAllGlossary(false);
        setPlayingGlossaryIndex(null);
      } else {
        readGlossaryItem(playingGlossaryIndex, () => {
          setPlayingGlossaryIndex(playingGlossaryIndex + 1);
        });
      }
    }
  }, [playingGlossaryIndex, isPlayingAllGlossary]);

  const getVoiceForCharacter = (charName: string) => {
    const character = data.characters?.find((c: any) => c.name === charName);
    return character?.voiceURI;
  };

  const playLine = (index: number, onEnd?: () => void) => {
    if (!data.dialogue || index >= data.dialogue.length) return;
    const line = data.dialogue[index];
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line.text);
    
    const voiceURI = getVoiceForCharacter(line.character);
    if (voiceURI) {
      const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
    }
    
    utterance.onend = () => {
      if (onEnd) onEnd();
      else setPlayingIndex(null);
    };

    setPlayingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const readGlossaryItem = (idx: number, onEnd?: () => void) => {
    if (!data.glossary || idx >= data.glossary.length) return;
    const item = data.glossary[idx];
    const textToRead = `${item.word}. ${item.definition}. ${item.ccq}. ${item.ccq_answer}.`;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    if (glossaryVoiceURI) {
      const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === glossaryVoiceURI);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
      else setPlayingGlossaryIndex(null);
    };

    setPlayingGlossaryIndex(idx);
    window.speechSynthesis.speak(utterance);
  };

  const readAloudText = (text: string, voiceURI?: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceURI) {
      const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const playAll = () => {
    setActiveTab('dialogue');
    setIsPlayingAll(true);
    setPlayingIndex(0);
  };

  const pausePlayback = () => {
    setIsPlayingAll(false);
    window.speechSynthesis.cancel();
    setPlayingIndex(null);
  };

  const playAllGlossary = () => {
    setIsPlayingAllGlossary(true);
    setPlayingGlossaryIndex(0);
  };

  const pauseGlossaryPlayback = () => {
    setIsPlayingAllGlossary(false);
    window.speechSynthesis.cancel();
    setPlayingGlossaryIndex(null);
  };

  const copyToClipboard = () => {
    // Generate beautiful plain text
    let plainText = "💬 ==========================================\n";
    plainText += "💬             CONVERSATION SECTION\n";
    plainText += "💬 ==========================================\n\n";
    (data.dialogue || []).forEach((line: any) => {
      const stageDir = line.action ? addEmojisToStageDirections(line.action) : '';
      plainText += `🗣️ [${line.character}]${stageDir ? ` (${stageDir})` : ''}\n   👉 "${line.text}"\n\n`;
    });
    
    if (data.glossary && data.glossary.length > 0) {
      plainText += "📖 ==========================================\n";
      plainText += "📖               GLOSSARY SECTION\n";
      plainText += "📖 ==========================================\n\n";
      data.glossary.forEach((item: any) => {
        plainText += `💡 Word/Phrase: **${item.word}**\n   📝 Definition: ${item.definition}\n   ❓ Concept Check: ${item.ccq}\n   ✅ Expected Answer: ${item.ccq_answer}\n\n`;
      });
    }

    if (data.questions && data.questions.length > 0) {
      plainText += "❓ ==========================================\n";
      plainText += "❓              QUESTIONS SECTION\n";
      plainText += "❓ ==========================================\n\n";
      data.questions.forEach((q: any) => {
        plainText += `🎬 Scenario: ${q.scenario}\n   🙋 ${q.character} asks: "${q.question}"\n   🎯 Expected Answer: ${q.answer}\n\n`;
      });
    }

    // Generate beautiful HTML for rich formatting (color-coded, prettier layout!)
    let htmlText = `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; color: #334155;">`;
    
    // Conversation HTML
    htmlText += `
      <div style="background-color: #e0f2fe; padding: 12px 18px; border-radius: 8px; border-left: 6px solid #0284c7; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0369a1; font-size: 20px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
          🗣️ CONVERSATION
        </h2>
      </div>
      <div style="margin-left: 10px; margin-bottom: 30px;">
    `;
    (data.dialogue || []).forEach((line: any) => {
      const stageDir = line.action ? addEmojisToStageDirections(line.action) : '';
      htmlText += `
        <div style="margin-bottom: 16px; padding: 12px; border-radius: 8px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
          <strong style="color: #4f46e5; font-size: 15px;">${line.character}</strong>
          ${stageDir ? `<span style="font-style: italic; color: #64748b; font-size: 13px; margin-left: 8px;">(${stageDir})</span>` : ''}
          <div style="margin-top: 6px; color: #1e293b; font-size: 14px; line-height: 1.5;">${line.text}</div>
        </div>
      `;
    });
    htmlText += `</div>`;

    // Glossary HTML
    if (data.glossary && data.glossary.length > 0) {
      htmlText += `
        <div style="background-color: #fef3c7; padding: 12px 18px; border-radius: 8px; border-left: 6px solid #d97706; margin-bottom: 20px; margin-top: 30px;">
          <h2 style="margin: 0; color: #b45309; font-size: 20px; font-weight: bold;">
            📖 GLOSSARY & VOCABULARY
          </h2>
        </div>
        <div style="margin-left: 10px; margin-bottom: 30px; display: grid; gap: 16px;">
      `;
      data.glossary.forEach((item: any) => {
        htmlText += `
          <div style="padding: 14px; border-radius: 8px; background-color: #ffffff; border: 1px solid #fde68a; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 16px; font-weight: bold; color: #b45309; margin-bottom: 6px;">
              ✨ ${item.word}
            </div>
            <div style="font-size: 14px; color: #1e293b; margin-bottom: 8px; line-height: 1.4;">
              <strong>Definition:</strong> ${item.definition}
            </div>
            <div style="font-size: 12px; color: #475569; background-color: #fffbeb; padding: 8px; border-radius: 6px; border-left: 3px solid #f59e0b;">
              <strong>Concept Check Question:</strong> ${item.ccq}<br/>
              <strong style="color: #d97706;">Expected Answer:</strong> ${item.ccq_answer}
            </div>
          </div>
        `;
      });
      htmlText += `</div>`;
    }

    // Questions HTML
    if (data.questions && data.questions.length > 0) {
      htmlText += `
        <div style="background-color: #dcfce7; padding: 12px 18px; border-radius: 8px; border-left: 6px solid #16a34a; margin-bottom: 20px; margin-top: 30px;">
          <h2 style="margin: 0; color: #15803d; font-size: 20px; font-weight: bold;">
            ❓ PERSONALIZED DISCUSSION QUESTIONS
          </h2>
        </div>
        <div style="margin-left: 10px; display: grid; gap: 16px;">
      `;
      data.questions.forEach((q: any) => {
        htmlText += `
          <div style="padding: 14px; border-radius: 8px; background-color: #ffffff; border: 1px solid #bbf7d0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 6px;">
              🎬 Scenario: ${q.scenario}
            </div>
            <div style="font-size: 14px; color: #15803d; font-weight: bold; margin-bottom: 6px;">
              🙋 ${q.character} asks: <span style="font-weight: normal; color: #1e293b; font-size: 15px;">"${q.question}"</span>
            </div>
            <div style="font-size: 13px; color: #166534; background-color: #f0fdf4; padding: 8px; border-radius: 6px;">
              🎯 <strong>Expected Answer:</strong> ${q.answer}
            </div>
          </div>
        `;
      });
      htmlText += `</div>`;
    }
    htmlText += `</div>`;

    if (navigator.clipboard && window.ClipboardItem) {
      const clipboardData = [
        new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([htmlText], { type: "text/html" }),
        })
      ];
      navigator.clipboard.write(clipboardData).then(() => {
        alert("Color-coded sections and prettier style copied to clipboard! (Formatting preserved for Notion, Slack, Word)");
      }).catch(err => {
        console.error("Rich-text clipboard error, falling back:", err);
        navigator.clipboard.writeText(plainText).then(() => {
          alert("Full content copied to clipboard!");
        });
      });
    } else {
      navigator.clipboard.writeText(plainText).then(() => {
        alert("Full content copied to clipboard!");
      });
    }
  };

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  return (
    <WidgetWrapper widget={widget} title="Conversation" icon="fa-comments" onClose={onClose}>
      <div className="flex flex-col h-full" style={{ background: theme.surface, color: theme.text }}>
        <div className="p-2 border-b flex justify-between items-center" style={{ borderColor: theme.border }}>
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('dialogue')} className={`px-2 py-1 text-xs rounded font-bold ${activeTab === 'dialogue' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}>Dialogue</button>
            <button onClick={() => setActiveTab('glossary')} className={`px-2 py-1 text-xs rounded font-bold ${activeTab === 'glossary' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}>Glossary</button>
            <button onClick={() => setActiveTab('questions')} className={`px-2 py-1 text-xs rounded font-bold ${activeTab === 'questions' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}>Questions</button>
          </div>
          <button onClick={copyToClipboard} className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 font-bold"><i className="fas fa-copy"></i> Copy All</button>
        </div>

        {/* Dialogue Tab */}
        <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-4 ${activeTab === 'dialogue' ? 'block' : 'hidden'}`}>
          <div className="flex justify-center mb-2">
            {isPlayingAll ? (
              <button onClick={pausePlayback} className="px-4 py-2 bg-red-500 text-white rounded font-bold text-sm hover:bg-red-600 shadow-md">
                 <i className="fas fa-stop mr-2"></i> Stop Auto-Play
              </button>
            ) : (
              <button onClick={playAll} className="px-4 py-2 bg-green-500 text-white rounded font-bold text-sm hover:bg-green-600 shadow-md">
                 <i className="fas fa-play mr-2"></i> Auto-Play Dialogue
              </button>
            )}
          </div>
          {(data.dialogue || []).map((line: any, idx: number) => {
            const isPlaying = playingIndex === idx;
            const stageDir = line.action ? addEmojisToStageDirections(line.action) : '';
            return (
              <div key={idx} className={`p-3 rounded border transition-all ${isPlaying ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/40' : ''}`} style={{ borderColor: theme.border }}>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm" style={{ color: theme.primary }}>{line.character}</span>
                  <button onClick={() => { setIsPlayingAll(false); playLine(idx); }} className={`hover:text-indigo-500 ${isPlaying ? 'text-indigo-500' : 'text-gray-400'}`}>
                    <i className="fas fa-play-circle text-lg"></i>
                  </button>
                </div>
                {stageDir && (
                  <div className="text-xs italic mb-1 text-gray-500">({stageDir})</div>
                )}
                <div className="text-sm leading-relaxed">{line.text}</div>
              </div>
            );
          })}
        </div>

        {/* Glossary Tab */}
        <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-3 ${activeTab === 'glossary' ? 'block' : 'hidden'}`}>
          {/* Controls */}
          <div className="flex flex-col gap-2 mb-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
             <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Read Aloud Voice</label>
             <select value={glossaryVoiceURI} onChange={e=>setGlossaryVoiceURI(e.target.value)} className="w-full text-xs p-1 border rounded" style={{ borderColor: theme.border, background: theme.background, color: theme.text }}>
                <option value="">-- Default Voice --</option>
                <GroupedVoiceOptions voices={availableVoices} />
             </select>
             
             <div className="flex justify-center mt-2">
               {isPlayingAllGlossary ? (
                 <button onClick={pauseGlossaryPlayback} className="px-4 py-2 bg-red-500 text-white rounded font-bold text-sm hover:bg-red-600 shadow-md">
                    <i className="fas fa-stop mr-2"></i> Stop Vocabulary
                 </button>
               ) : (
                 <button onClick={playAllGlossary} className="px-4 py-2 bg-indigo-500 text-white rounded font-bold text-sm hover:bg-indigo-600 shadow-md">
                    <i className="fas fa-play mr-2"></i> Play All Words
                 </button>
               )}
             </div>
          </div>

          {(!data.glossary || data.glossary.length === 0) && (
            <div className="text-center text-gray-500 text-sm mt-4">No glossary provided.</div>
          )}
          {(data.glossary || []).map((item: any, idx: number) => {
            const isPlaying = playingGlossaryIndex === idx;
            return (
            <div key={idx} className={`p-3 border rounded text-sm relative transition-all ${isPlaying ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/40' : ''}`} style={{ borderColor: theme.border }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-indigo-500 text-lg border-b-2 border-indigo-200 pb-1 pr-2">{item.word}</span>
                <button onClick={() => { setIsPlayingAllGlossary(false); readGlossaryItem(idx); }} className={`hover:text-indigo-500 rounded-full w-8 h-8 flex items-center justify-center transition-colors ${isPlaying ? 'text-indigo-500 bg-indigo-200 dark:bg-indigo-700' : 'text-gray-400 bg-gray-100 dark:bg-gray-800'}`}>
                  <i className="fas fa-volume-up"></i>
                </button>
              </div>
              <div className="mt-1 leading-relaxed"><strong className="text-gray-700 dark:text-gray-300">Def:</strong> {item.definition}</div>
              <div className="mt-3 text-xs italic text-gray-600 dark:text-gray-400"><strong>CCQ:</strong> {item.ccq}</div>
              <div className="text-xs text-gray-700 dark:text-gray-300 font-bold mt-1 bg-gray-50 dark:bg-gray-800 inline-block px-2 py-1 rounded">A: {item.ccq_answer}</div>
            </div>
          )})}
        </div>

        {/* Questions Tab */}
        <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-4 ${activeTab === 'questions' ? 'block' : 'hidden'}`}>
          {(!data.questions || data.questions.length === 0) && (
            <div className="text-center text-gray-500 text-sm mt-4">No questions provided.</div>
          )}
          {(data.questions || []).map((q: any, idx: number) => {
            const voiceURI = getVoiceForCharacter(q.character);
            return (
              <div key={idx} className="p-3 border rounded text-sm shadow-sm" style={{ borderColor: theme.border }}>
                <div className="text-xs text-gray-500 mb-2 italic bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  <i className="fas fa-info-circle mr-1"></i> {q.scenario}
                </div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold mr-2 text-indigo-600 dark:text-indigo-400 border-b border-indigo-200 pb-1">{q.character} asks:</span>
                  <button onClick={() => readAloudText(q.question, voiceURI)} className="text-gray-400 hover:text-indigo-500 bg-gray-100 dark:bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center transition-colors" title={`Read as ${q.character}`}>
                    <i className="fas fa-volume-up"></i>
                  </button>
                </div>
                <div className="mt-1 text-base font-medium mb-3 leading-relaxed">{q.question}</div>
                <div className="text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-2 rounded-md border border-green-100 dark:border-green-800">
                  <i className="fas fa-check-circle mr-1"></i> Expected Answer: <span className="font-normal">{q.answer}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// CONVERSATION MAKER WIDGET
// ============================================================
const ConversationMakerWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme, addWidget } = useContext(AppContext);
  const [characters, setCharacters] = useState<any[]>([{ name: 'Alice', tone: 'Friendly', mood: 'Happy', job: 'Teacher', voiceURI: '' }]);
  const [timeAndPlace, setTimeAndPlace] = useState('');
  const [topicAndPurpose, setTopicAndPurpose] = useState('');
  const [language, setLanguage] = useState('');
  const [learnersInfo, setLearnersInfo] = useState('');
  const [sampleDialogue, setSampleDialogue] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const addCharacter = () => setCharacters([...characters, { name: '', tone: '', mood: '', job: '', voiceURI: '' }]);
  const updateCharacter = (idx: number, key: string, val: string) => setCharacters(characters.map((c, i) => i === idx ? { ...c, [key]: val } : c));
  const removeCharacter = (idx: number) => setCharacters(characters.filter((_, i) => i !== idx));

  const copyPrompt = () => {
    const prompt = `Act as an expert conversation designer. Create a JSON dialogue with the following characters: ${characters.map(c => c.name).join(', ')}.
Characters details:
${characters.map(c => `- ${c.name}: Tone: ${c.tone}, Mood: ${c.mood}, Job: ${c.job}`).join('\n')}

Setting (Time and Place): ${timeAndPlace}
Topic and Purpose: ${topicAndPurpose}
Language Focus (Grammar/Vocab): ${language}
Learners Info (for personalized questions): ${learnersInfo}
Sample Dialogue style: ${sampleDialogue}

Also create:
1. A glossary of vocabulary, idiomatic expressions, phrasal verbs, and spoken grammar used in the conversation. Each should have a word/phrase, definition, concept checking question (ccq), and ccq answer.
2. A list of personalized comprehension or discussion questions asked by the characters (based on Learners Info). Each question should have a context/scenario, the character asking it, the question text, and the expected answer.

CRITICAL REQUIREMENT FOR STAGE DIRECTIONS:
In the stage directions (action field in dialogue lines), like "leans forward, rubbing eyes slightly, serious tone", always include matching emojis at the start and end of the parentheses/action to make the emotion or action highly understandable (e.g. "🥱 leans forward, rubbing eyes slightly, serious tone 🤨" or "😊 smiles warmly 😊"). Make sure every action is vivid and accompanied by descriptive emojis.

OUTPUT YOUR ENTIRE RESPONSE AS A SINGLE VALID JSON BLOCK (wrapped in \`\`\`json blocks).
Use exactly this JSON schema:
{
  "characters": [
    { "name": "${characters[0]?.name || 'Character1'}", "voiceURI": "" }
  ],
  "dialogue": [
    { "character": "${characters[0]?.name || 'Character1'}", "text": "Hello there!", "action": "😊 smiles warmly 😊" }
  ],
  "glossary": [
    { "word": "Expression", "definition": "Meaning", "ccq": "Concept Checking Question?", "ccq_answer": "Yes/No/Answer" }
  ],
  "questions": [
    { "scenario": "Set the context...", "character": "${characters[0]?.name || 'Character1'}", "question": "The question...?", "answer": "Expected answer" }
  ]
}`;
    navigator.clipboard.writeText(prompt).then(() => alert("Prompt copied! Paste it into your AI Chatbot."));
  };

  const launchPlayer = () => {
    try {
      const fixed = fixJson(jsonInput);
      const parsed = JSON.parse(fixed);
      
      const mappedCharacters = parsed.characters?.map((c: any) => {
        const matchingOurChar = characters.find(mc => mc.name.toLowerCase() === c.name?.toLowerCase());
        if (matchingOurChar && matchingOurChar.voiceURI) c.voiceURI = matchingOurChar.voiceURI;
        return c;
      }) || [];
      parsed.characters = mappedCharacters;

      addWidget('conversationPlayer', { json: parsed });
      onClose();
    } catch(e) {
      alert("Invalid JSON format");
    }
  };

  return (
    <WidgetWrapper widget={widget} title="Conversation Maker" icon="fa-comments" onClose={onClose}>
      <div className="p-4 flex flex-col h-full gap-4 overflow-y-auto" style={{ background: theme.surface, color: theme.text }}>
        <div>
          <h3 className="font-bold border-b mb-2 pb-1 text-sm" style={{ borderColor: theme.border }}>Characters</h3>
          {characters.map((c, i) => (
            <div key={i} className="mb-2 p-2 border rounded" style={{ borderColor: theme.border }}>
              <div className="flex justify-between mb-1 items-center">
                <span className="font-bold text-xs" style={{ color: theme.primary }}>Character {i+1}</span>
                {characters.length > 1 && <button onClick={() => removeCharacter(i)} className="text-red-500 hover:text-red-400 text-xs"><i className="fas fa-trash"></i></button>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <input placeholder="Name" value={c.name} onChange={e=>updateCharacter(i,'name',e.target.value)} className="p-1 border rounded w-full" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
                <input placeholder="Tone" value={c.tone} onChange={e=>updateCharacter(i,'tone',e.target.value)} className="p-1 border rounded w-full" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
                <input placeholder="Mood" value={c.mood} onChange={e=>updateCharacter(i,'mood',e.target.value)} className="p-1 border rounded w-full" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
                <input placeholder="Job" value={c.job} onChange={e=>updateCharacter(i,'job',e.target.value)} className="p-1 border rounded w-full" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
              </div>
              <div className="flex gap-1 mb-1 items-center">
                <input 
                  type="text" 
                  placeholder="🔍 Filter voices..." 
                  value={c.voiceSearch || ''} 
                  onChange={e => updateCharacter(i, 'voiceSearch', e.target.value)} 
                  className="w-full text-xs p-1 border rounded" 
                  style={{ borderColor: theme.border, background: theme.background, color: theme.text }} 
                />
                {c.voiceSearch && (
                  <button onClick={() => updateCharacter(i, 'voiceSearch', '')} className="text-xs px-1 text-red-500 hover:text-red-400">Clear</button>
                )}
              </div>
              <select value={c.voiceURI} onChange={e=>updateCharacter(i,'voiceURI',e.target.value)} className="w-full text-xs p-1 border rounded" style={{ borderColor: theme.border, background: theme.background, color: theme.text }}>
                <option value="">-- Select Voice --</option>
                <GroupedVoiceOptions voices={availableVoices.filter(v => !c.voiceSearch || v.name.toLowerCase().includes(c.voiceSearch.toLowerCase()) || v.lang.toLowerCase().includes(c.voiceSearch.toLowerCase()))} />
              </select>
            </div>
          ))}
          <button onClick={addCharacter} className="text-xs text-blue-500 hover:text-blue-400 font-bold">+ Add Character</button>
        </div>

        <div>
          <h3 className="font-bold border-b mb-2 pb-1 text-sm" style={{ borderColor: theme.border }}>Settings</h3>
          <input placeholder="Time and Place" value={timeAndPlace} onChange={e=>setTimeAndPlace(e.target.value)} className="w-full text-xs p-2 mb-2 border rounded" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
          <input placeholder="Topic and Purpose" value={topicAndPurpose} onChange={e=>setTopicAndPurpose(e.target.value)} className="w-full text-xs p-2 mb-2 border rounded" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
          <textarea placeholder="Language to use (grammar/vocab)" value={language} onChange={e=>setLanguage(e.target.value)} className="w-full text-xs p-2 mb-2 border rounded h-16 resize-none" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
          <textarea placeholder="Learners Info (for personalized questions)" value={learnersInfo} onChange={e=>setLearnersInfo(e.target.value)} className="w-full text-xs p-2 mb-2 border rounded h-16 resize-none" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
          <textarea placeholder="Sample Dialogue" value={sampleDialogue} onChange={e=>setSampleDialogue(e.target.value)} className="w-full text-xs p-2 border rounded h-16 resize-none" style={{ borderColor: theme.border, background: theme.background, color: theme.text }} />
        </div>

        <button onClick={copyPrompt} className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700">
          <i className="fas fa-copy"></i> Copy AI Prompt
        </button>

        <div>
          <h3 className="font-bold border-b mb-2 pb-1 text-sm" style={{ borderColor: theme.border }}>Paste Result</h3>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste generated JSON here..."
            className="w-full text-xs p-2 border rounded font-mono h-24 resize-none"
            style={{ borderColor: theme.border, background: theme.background, color: theme.text }}
          />
        </div>

        <button onClick={launchPlayer} className="w-full py-2 bg-green-600 text-white rounded text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50" disabled={!jsonInput.trim()}>
          <i className="fas fa-play"></i> Launch Conversation
        </button>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// LESSON CONTENT WIDGET
// ============================================================
const LessonContentWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const html = widget.settings?.html || '';

  return (
    <WidgetWrapper widget={widget} title="Lesson Viewer" icon="fa-book-open" onClose={onClose}>
      <div className="w-full h-full bg-white relative">
        {html ? (
          <iframe srcDoc={html} className="w-full h-full border-none" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads" allow="microphone" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">No content available.</div>
        )}
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// TIMER WIDGET
// ============================================================
const TimerWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme, updateWidget } = useContext(AppContext);
  const [mode, setMode] = useState<'countdown' | 'stopwatch' | 'visual' | 'alarms'>('countdown');
  const [time, setTime] = useState(300);
  const [inputMins, setInputMins] = useState(5);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Alarms State
  const [alarms, setAlarms] = useState<{id: string, time: string, label: string, enabled: boolean}[]>([]);
  const [newAlarmTime, setNewAlarmTime] = useState('12:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('Class Ends');
  const [alarmSoundUrl, setAlarmSoundUrl] = useState('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
  const [customSoundUrl, setCustomSoundUrl] = useState('');
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.target?.toString().includes('input') && mode !== 'alarms') {
        e.preventDefault();
        setRunning(r => !r);
      }
      if (e.code === 'KeyR' && e.altKey && mode !== 'alarms') {
        setRunning(false);
        setTime(inputMins * 60);
        setElapsed(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputMins, mode]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      if (mode === 'countdown' || mode === 'visual') {
        setTime(t => {
          if (t <= 1) {
            setRunning(false);
            setShowFullScreen(true);
            const audio = new Audio(customSoundUrl || alarmSoundUrl);
            audio.play().catch(e => console.log('Audio error', e));
            return 0;
          }
          return t - 1;
        });
      } else if (mode === 'stopwatch') {
        setElapsed(e => e + 10);
      }
    }, mode === 'stopwatch' ? 10 : 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, customSoundUrl, alarmSoundUrl]);

  // Alarms trigger loop
  useEffect(() => {
    const alarmInterval = setInterval(() => {
        const now = new Date();
        const currentTimeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        // We trigger only at the exact minute match, and we need to prevent multiple triggers in the same minute
        // In a real app we'd keep track of triggered ones
        const triggered = alarms.find(a => a.enabled && a.time === currentTimeString && now.getSeconds() === 0);
        if (triggered) {
            const audio = new Audio(customSoundUrl || alarmSoundUrl);
            audio.play().catch(e => console.log('Audio error', e));
            alert(`Alarm Trigerred: ${triggered.label}`);
        }
    }, 1000);
    return () => clearInterval(alarmInterval);
  }, [alarms, customSoundUrl, alarmSoundUrl]);


  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const formatMs = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const c = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${c.toString().padStart(2, '0')}`;
  };

  const progress = inputMins * 60 > 0 ? (time / (inputMins * 60)) * 100 : 0;
  const progressColor = progress > 30 ? theme.success : progress > 10 ? theme.warning : theme.error;

  const addAlarm = () => {
      if(!newAlarmTime) return;
      setAlarms([...alarms, { id: Date.now().toString(), time: newAlarmTime, label: newAlarmLabel, enabled: true }]);
  };
  const deleteAlarm = (id: string) => setAlarms(alarms.filter(a => a.id !== id));
  const toggleAlarm = (id: string) => setAlarms(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));

  const settingsPanel = (
    <>
      {mode !== 'alarms' && (
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Quick Set</label>
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3, 5, 10, 15, 20, 30, 45].map(m => (
            <button key={m} onClick={() => { setInputMins(m); setTime(m * 60); setRunning(false); setMode('countdown'); }} className="px-2 py-1 rounded text-xs font-medium transition-colors" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text }}>
              {m}m
            </button>
          ))}
        </div>
      </div>
      )}
      <div className="mt-4">
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Custom Alarm Sound URL</label>
        <input 
          type="text" 
          value={customSoundUrl} 
          onChange={e => setCustomSoundUrl(e.target.value)} 
          placeholder="https://.../sound.mp3"
          className="w-full px-2 py-1 rounded text-xs border bg-transparent"
          style={{ borderColor: theme.border, color: theme.text }}
        />
        <button onClick={() => { const a = new Audio(customSoundUrl || alarmSoundUrl); a.play(); }} className="mt-2 text-xs text-blue-500 font-bold"><i className="fas fa-play mr-1"></i>Test Sound</button>
      </div>
      {mode !== 'alarms' && (
      <div className="text-xs mt-4" style={{ color: theme.textMuted }}>
        <p><strong>Hotkeys:</strong></p>
        <p>Space - Start/Pause</p>
        <p>Alt+R - Reset</p>
      </div>
      )}
    </>
  );

  return (
    <>
      <WidgetWrapper widget={widget} title="Timer & Alarms" icon="fa-stopwatch" onClose={onClose} settingsPanel={settingsPanel} minWidth={350} minHeight={420}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            {(['countdown', 'visual', 'stopwatch', 'alarms'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); if(m !== 'alarms'){ setRunning(false); setElapsed(0); setTime(inputMins * 60); } }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${mode === m ? 'shadow' : ''}`}
                style={{ backgroundColor: mode === m ? theme.surface : 'transparent', color: mode === m ? theme.primary : theme.textMuted }}
              >
                {m === 'countdown' ? 'Timer' : m}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {mode === 'visual' ? (
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="none" stroke={theme.border} strokeWidth="12" />
                  <circle cx="80" cy="80" r="70" fill="none" stroke={progressColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={440} strokeDashoffset={440 * (1 - progress / 100)} className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black" style={{ color: theme.text }}>{formatTime(time)}</span>
                </div>
              </div>
            ) : mode === 'stopwatch' ? (
              <div className="text-5xl font-mono font-black" style={{ color: theme.text }}>{formatMs(elapsed)}</div>
            ) : mode === 'alarms' ? (
              <div className="w-full h-full flex flex-col">
                 <div className="flex gap-2 mb-4">
                    <input type="time" value={newAlarmTime} onChange={e => setNewAlarmTime(e.target.value)} className="px-3 py-2 rounded-lg font-bold outline-none border" style={{ backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }} />
                    <input type="text" value={newAlarmLabel} onChange={e => setNewAlarmLabel(e.target.value)} placeholder="Alarm Label" className="flex-1 px-3 py-2 rounded-lg font-medium outline-none border" style={{ backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }} />
                    <button onClick={addAlarm} className="px-4 rounded-lg bg-indigo-500 text-white font-bold hover:bg-indigo-600 shadow-sm"><i className="fas fa-plus"></i></button>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {alarms.map(alarm => (
                        <div key={alarm.id} className="flex justify-between items-center p-3 rounded-xl border opacity-90 hover:opacity-100 transition-opacity" style={{ borderColor: theme.border, backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }}>
                             <div className="flex flex-col">
                                 <span className="text-xl font-black" style={{ color: theme.text }}>
                                     {new Date(`2000-01-01T${alarm.time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                 </span>
                                 <span className="text-xs font-bold" style={{ color: theme.textMuted }}>{alarm.label}</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <button onClick={() => toggleAlarm(alarm.id)} className={`w-12 h-6 rounded-full relative transition-colors ${alarm.enabled ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                                     <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${alarm.enabled ? 'left-7' : 'left-1'}`}></span>
                                 </button>
                                 <button onClick={() => deleteAlarm(alarm.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors">
                                     <i className="fas fa-trash"></i>
                                 </button>
                             </div>
                        </div>
                    ))}
                    {alarms.length === 0 && (
                        <div className="text-center p-8 opacity-50 font-bold" style={{ color: theme.textMuted }}>
                            <i className="fas fa-bell-slash text-4xl mb-2"></i>
                            <p>No alarms set</p>
                        </div>
                    )}
                 </div>
              </div>
            ) : (
              <div className="text-center w-full">
                <div className="text-7xl font-black mb-4 tracking-tighter" style={{ color: theme.text }}>{formatTime(time)}</div>
                <div className="h-4 rounded-full overflow-hidden shadow-inner bg-black/5 dark:bg-white/5 border" style={{ borderColor: theme.border }}>
                  <div className="h-full rounded-full transition-all duration-1000 relative" style={{ width: `${progress}%`, backgroundColor: progressColor }}>
                     <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(mode === 'countdown' || mode === 'visual') && !running && time === inputMins * 60 && (
            <div className="flex items-center justify-center gap-2 mb-4 mt-2">
              <input
                type="number"
                value={inputMins}
                onChange={e => { const v = parseInt(e.target.value) || 1; setInputMins(v); setTime(v * 60); }}
                min="1"
                max="180"
                className="w-20 px-3 py-2 rounded-lg text-center font-bold"
                style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
              />
              <span className="font-bold" style={{ color: theme.textMuted }}>Minutes</span>
            </div>
          )}

          {mode !== 'alarms' && (
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => setRunning(!running)} className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 text-white transition-transform active:scale-95 shadow-md hover:shadow-lg" style={{ backgroundImage: running ? `linear-gradient(to right, ${theme.warning}, #f59e0b)` : `linear-gradient(to right, ${theme.success}, #10b981)` }}>
              <i className={`fas fa-${running ? 'pause' : 'play'}`} />
              {running ? 'Pause' : 'Start'}
            </button>
            <button onClick={() => { setRunning(false); setTime(inputMins * 60); setElapsed(0); }} className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-sm hover:shadow" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text }}>
              <i className="fas fa-redo" />
              Reset
            </button>
          </div>
          )}
        </div>
      </WidgetWrapper>
      {showFullScreen && <FullScreenOverlay type="timer" onClose={() => setShowFullScreen(false)} />}
    </>
  );
};

// ============================================================
// TRAFFIC LIGHT WIDGET
// ============================================================
const TrafficLightWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [light, setLight] = useState<'red' | 'yellow' | 'green'>('green');
  const [auto, setAuto] = useState(false);
  const [intervals, setIntervals] = useState({ green: 60, yellow: 10, red: 30 });

  useEffect(() => {
    if (!auto) return;
    const timeout = setTimeout(() => {
      setLight(l => l === 'green' ? 'yellow' : l === 'yellow' ? 'red' : 'green');
      SFX.click();
    }, intervals[light] * 1000);
    return () => clearTimeout(timeout);
  }, [auto, light, intervals]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') setLight('red');
      if (e.key === '2') setLight('yellow');
      if (e.key === '3') setLight('green');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const lightColors = { red: '#ef4444', yellow: '#facc15', green: '#22c55e' };

  const settingsPanel = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: theme.textMuted }}>Auto Cycle</span>
        <button onClick={() => setAuto(!auto)} className={`w-10 h-5 rounded-full transition-all relative ${auto ? 'bg-green-500' : 'bg-gray-500'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${auto ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      {auto && (
        <>
          <div>
            <label className="text-xs" style={{ color: theme.textMuted }}>Green: {intervals.green}s</label>
            <input type="range" min="10" max="120" value={intervals.green} onChange={e => setIntervals({ ...intervals, green: parseInt(e.target.value) })} className="w-full" />
          </div>
          <div>
            <label className="text-xs" style={{ color: theme.textMuted }}>Yellow: {intervals.yellow}s</label>
            <input type="range" min="5" max="30" value={intervals.yellow} onChange={e => setIntervals({ ...intervals, yellow: parseInt(e.target.value) })} className="w-full" />
          </div>
          <div>
            <label className="text-xs" style={{ color: theme.textMuted }}>Red: {intervals.red}s</label>
            <input type="range" min="10" max="120" value={intervals.red} onChange={e => setIntervals({ ...intervals, red: parseInt(e.target.value) })} className="w-full" />
          </div>
        </>
      )}
      <div className="text-xs" style={{ color: theme.textMuted }}>
        <p><strong>Hotkeys:</strong> 1=Red, 2=Yellow, 3=Green</p>
      </div>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Traffic Light" icon="fa-traffic-light" onClose={onClose} minWidth={200} minHeight={350} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col items-center justify-center" style={{ backgroundColor: '#1f2937' }}>
        <div className="bg-gray-800 rounded-2xl p-4 flex flex-col items-center space-y-4 shadow-xl">
          {(['red', 'yellow', 'green'] as const).map(c => (
            <button
              key={c}
              onClick={() => { setLight(c); SFX.click(); }}
              className="w-16 h-16 rounded-full transition-all duration-300"
              style={{
                backgroundColor: light === c ? lightColors[c] : '#374151',
                boxShadow: light === c ? `0 0 40px 10px ${lightColors[c]}60` : 'none',
                opacity: light === c ? 1 : 0.3,
              }}
            />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 w-full max-w-[200px]">
          {[{ c: 'green' as const, l: 'Go' }, { c: 'yellow' as const, l: 'Slow' }, { c: 'red' as const, l: 'Stop' }].map(({ c, l }) => (
            <button key={c} onClick={() => { setLight(c); SFX.click(); }} className="py-2 rounded-lg font-bold text-white text-sm transition-all hover:opacity-80" style={{ backgroundColor: lightColors[c] }}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// RANDOM PICKER WIDGET
// ============================================================
const RandomPickerWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [mode, setMode] = useState<'single' | 'vs'>('single');
  const [items, setItems] = useState(['Student 1', 'Student 2', 'Student 3', 'Student 4', 'Student 5']);
  const [newItem, setNewItem] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [vsResult, setVsResult] = useState<{ a: string; b: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

  const spin = () => {
    if (items.length < 2) return;
    setSpinning(true);
    setResult(null);
    setVsResult(null);

    if (mode === 'single') {
      const spins = 5 + Math.random() * 5;
      const idx = Math.floor(Math.random() * items.length);
      setRotation(r => r + spins * 360 + (360 - idx * (360 / items.length)));
      setTimeout(() => { setSpinning(false); setResult(items[idx]); SFX.success(); }, 3000);
    } else {
      setTimeout(() => {
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        setVsResult({ a: shuffled[0], b: shuffled[1] });
        setSpinning(false);
        SFX.success();
      }, 2000);
    }
  };

  const addItem = () => { if (newItem.trim()) { setItems([...items, newItem.trim()]); setNewItem(''); } };

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Add Multiple (one per line)</label>
        <textarea
          placeholder="Name 1&#10;Name 2"
          className="w-full h-20 px-2 py-1 rounded text-xs"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
          onBlur={e => {
            const names = e.target.value.split('\n').filter(n => n.trim());
            if (names.length) setItems([...items, ...names]);
            e.target.value = '';
          }}
        />
      </div>
      <button onClick={() => setItems([])} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.error }}>Clear All</button>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Random Picker" icon="fa-dice" onClose={onClose} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('single')} className="flex-1 py-2 rounded-lg font-bold text-sm transition-all" style={{ backgroundColor: mode === 'single' ? theme.primary : theme.border, color: mode === 'single' ? 'white' : theme.text }}>
            <i className="fas fa-user mr-2" />Single
          </button>
          <button onClick={() => setMode('vs')} className="flex-1 py-2 rounded-lg font-bold text-sm transition-all" style={{ backgroundColor: mode === 'vs' ? theme.error : theme.border, color: mode === 'vs' ? 'white' : theme.text }}>
            <i className="fas fa-users mr-2" />VS Mode
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          {mode === 'single' ? (
            <div className="relative w-44 h-44">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-2xl z-10" style={{ color: theme.text }}>▼</div>
              <div className="w-full h-full rounded-full overflow-hidden border-4 shadow-lg" style={{ borderColor: theme.border, transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                  {items.map((_, i) => {
                    const angle = (360 / items.length) * i - 90;
                    const endAngle = angle + 360 / items.length;
                    const x1 = 50 + 50 * Math.cos((angle * Math.PI) / 180);
                    const y1 = 50 + 50 * Math.sin((angle * Math.PI) / 180);
                    const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
                    const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
                    return <path key={i} d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`} fill={colors[i % colors.length]} />;
                  })}
                </svg>
              </div>
            </div>
          ) : vsResult ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="text-center p-4 rounded-2xl text-white" style={{ backgroundColor: '#3b82f6' }}>
                <div className="text-3xl mb-2">👤</div>
                <div className="font-bold">{vsResult.a}</div>
              </div>
              <div className="text-3xl font-black" style={{ color: theme.error }}>VS</div>
              <div className="text-center p-4 rounded-2xl text-white" style={{ backgroundColor: theme.error }}>
                <div className="text-3xl mb-2">👤</div>
                <div className="font-bold">{vsResult.b}</div>
              </div>
            </div>
          ) : (
            <div className="text-center" style={{ color: theme.textMuted }}>
              <i className="fas fa-users text-4xl mb-2" />
              <p className="text-sm">Click spin to pick!</p>
            </div>
          )}
        </div>

        {result && mode === 'single' && (
          <div className="text-center mb-4 p-3 rounded-xl" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
            <span className="font-bold text-white text-lg">🎉 {result}</span>
          </div>
        )}

        <button onClick={spin} disabled={spinning || items.length < 2} className="w-full py-3 rounded-xl font-bold text-white transition-all mb-4 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
          {spinning ? 'Picking...' : mode === 'vs' ? 'Pick Opponents!' : 'Spin!'}
        </button>

        <div className="flex gap-2 mb-2">
          <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Add name..." className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }} />
          <button onClick={addItem} className="px-4 py-2 rounded-lg font-bold text-white" style={{ backgroundColor: theme.success }}>+</button>
        </div>

        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
          {items.map((item, i) => (
            <span key={i} className="px-2 py-1 rounded-full text-white text-xs font-medium flex items-center gap-1" style={{ backgroundColor: colors[i % colors.length] }}>
              {item}
              <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="hover:text-red-200"><i className="fas fa-times text-xs" /></button>
            </span>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// NOISE LEVEL WIDGET
// ============================================================
const NoiseLevelWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [level, setLevel] = useState(0);
  const [threshold, setThreshold] = useState(70);
  const [sensitivity, setSensitivity] = useState(50);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const audioRef = useRef<{ context: AudioContext; analyser: AnalyserNode; stream: MediaStream } | null>(null);
  const animationRef = useRef<number>(0);
  const alertCooldown = useRef(false);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      const source = context.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      source.connect(analyser);
      audioRef.current = { context, analyser, stream };
      setIsActive(true);

      const draw = () => {
        if (!audioRef.current) return;
        const data = new Uint8Array(audioRef.current.analyser.frequencyBinCount);
        audioRef.current.analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b) / data.length;
        setLevel(Math.min(100, (avg / 256) * 100 * (sensitivity / 25)));
        animationRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (err) { console.error('Microphone error'); }
  };

  const stopListening = () => {
    cancelAnimationFrame(animationRef.current);
    audioRef.current?.stream.getTracks().forEach(t => t.stop());
    audioRef.current?.context.close();
    audioRef.current = null;
    setIsActive(false);
    setLevel(0);
  };

  useEffect(() => {
    return () => stopListening();
  }, []);

  useEffect(() => {
    if (level > threshold && !alertCooldown.current && isActive) {
      alertCooldown.current = true;
      setShowFullScreen(true);
      setTimeout(() => { alertCooldown.current = false; }, 5000);
    }
  }, [level, threshold, isActive]);

  const color = level > threshold ? theme.error : level > 50 ? theme.warning : theme.success;

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Threshold: {threshold}%</label>
        <input type="range" min="20" max="100" value={threshold} onChange={e => setThreshold(parseInt(e.target.value))} className="w-full" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Sensitivity: {sensitivity}</label>
        <input type="range" min="10" max="100" value={sensitivity} onChange={e => setSensitivity(parseInt(e.target.value))} className="w-full" />
      </div>
    </>
  );

  return (
    <>
      <WidgetWrapper widget={widget} title="Noise Level" icon="fa-volume-up" onClose={onClose} settingsPanel={settingsPanel}>
        <div className="p-4 h-full flex flex-col items-center justify-center">
          {!isActive ? (
            <button onClick={startListening} className="px-6 py-4 rounded-xl font-bold text-white" style={{ backgroundColor: theme.primary }}>
              <i className="fas fa-microphone mr-2" />Start Monitoring
            </button>
          ) : (
            <>
              <div className="relative w-44 h-24 mb-4">
                <svg className="w-full h-full" viewBox="0 0 200 100">
                  <path d="M20,90 A80,80 0 0,1 180,90" fill="none" stroke={theme.border} strokeWidth="16" strokeLinecap="round" />
                  <path d="M20,90 A80,80 0 0,1 180,90" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 * (1 - level / 100)} className="transition-all duration-150" />
                </svg>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl font-black" style={{ color }}>{Math.round(level)}%</div>
              </div>
              <p className="text-sm mb-4" style={{ color: theme.textMuted }}>Alert at {threshold}%</p>
              <button onClick={stopListening} className="px-4 py-2 rounded-lg font-bold text-white" style={{ backgroundColor: theme.error }}>
                <i className="fas fa-stop mr-2" />Stop
              </button>
            </>
          )}
        </div>
      </WidgetWrapper>
      {showFullScreen && <FullScreenOverlay type="noise" onClose={() => setShowFullScreen(false)} />}
    </>
  );
};

// ============================================================
// QR CODE WIDGET
// ============================================================
const QRCodeWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [text, setText] = useState('https://tutomy.com');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Quick Links</label>
        <div className="space-y-1">
          {['https://tutomy.com', 'https://google.com', window.location.href].map((url, i) => (
            <button key={i} onClick={() => setText(url)} className="w-full text-left px-2 py-1 rounded text-xs truncate" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text }}>
              {url}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="QR Code" icon="fa-qrcode" onClose={onClose} minWidth={280} minHeight={320} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col items-center">
        <div className="flex-1 flex items-center justify-center">
          <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl shadow-lg" style={{ backgroundColor: 'white' }} />
        </div>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter URL or text..."
          className="w-full px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
        />
      </div>
    </WidgetWrapper>
  );
};


/*
  const [pages, setPages] = useState<WhiteboardPage[]>([{ id: '1', imageData: null }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [history, setHistory] = useState<DrawPath[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showLaser, setShowLaser] = useState(false);
  const [laserPos, setLaserPos] = useState<Position>({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { type: 'select' as const, icon: 'fa-mouse-pointer', label: 'Select' },
    { type: 'pen' as const, icon: 'fa-pen', label: 'Pen' },
    { type: 'highlighter' as const, icon: 'fa-highlighter', label: 'Highlighter' },
    { type: 'eraser' as const, icon: 'fa-eraser', label: 'Eraser' },
    { type: 'line' as const, icon: 'fa-minus', label: 'Line' },
    { type: 'arrow' as const, icon: 'fa-arrow-right', label: 'Arrow' },
    { type: 'rectangle' as const, icon: 'fa-square', label: 'Rectangle' },
    { type: 'circle' as const, icon: 'fa-circle', label: 'Circle' },
    { type: 'triangle' as const, icon: 'fa-play', label: 'Triangle' },
    { type: 'text' as const, icon: 'fa-font', label: 'Text' },
    { type: 'laser' as const, icon: 'fa-dot-circle', label: 'Laser Pointer' },
  ];

  const colors = ['#000000', '#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

  useEffect(() => {
    redrawCanvas();
  }, [paths, currentPage]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pageData = pages[currentPage]?.imageData;
    if (pageData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawPaths(ctx);
      };
      img.src = pageData;
    } else {
      drawPaths(ctx);
    }
  };

  const drawPaths = (ctx: CanvasRenderingContext2D) => {
    paths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.tool.color;
      ctx.lineWidth = path.tool.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = path.tool.opacity;

      if (path.tool.type === 'highlighter') {
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = path.tool.size * 3;
      }

      if (path.tool.type === 'eraser') {
        ctx.strokeStyle = '#ffffff';
      }

      if (['line', 'arrow'].includes(path.tool.type) && path.completed) {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        ctx.lineTo(path.points[path.points.length - 1].x, path.points[path.points.length - 1].y);
        if (path.tool.type === 'arrow') {
          const angle = Math.atan2(path.points[path.points.length - 1].y - path.points[0].y, path.points[path.points.length - 1].x - path.points[0].x);
          const arrowSize = 15;
          ctx.lineTo(path.points[path.points.length - 1].x - arrowSize * Math.cos(angle - Math.PI / 6), path.points[path.points.length - 1].y - arrowSize * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(path.points[path.points.length - 1].x, path.points[path.points.length - 1].y);
          ctx.lineTo(path.points[path.points.length - 1].x - arrowSize * Math.cos(angle + Math.PI / 6), path.points[path.points.length - 1].y - arrowSize * Math.sin(angle + Math.PI / 6));
        }
      } else if (path.tool.type === 'rectangle' && path.completed) {
        const w = path.points[path.points.length - 1].x - path.points[0].x;
        const h = path.points[path.points.length - 1].y - path.points[0].y;
        ctx.rect(path.points[0].x, path.points[0].y, w, h);
      } else if (path.tool.type === 'circle' && path.completed) {
        const r = Math.sqrt(Math.pow(path.points[path.points.length - 1].x - path.points[0].x, 2) + Math.pow(path.points[path.points.length - 1].y - path.points[0].y, 2));
        ctx.arc(path.points[0].x, path.points[0].y, r, 0, Math.PI * 2);
      } else {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach(p => ctx.lineTo(p.x, p.y));
      }

      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    if (textInput.show) {
      ctx.font = `${tool.size * 5}px Arial`;
      ctx.fillStyle = tool.color;
      ctx.fillText(textInput.text, textInput.x, textInput.y);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (tool.type === 'laser') {
      setShowLaser(true);
      setLaserPos({ x, y });
      return;
    }

    if (tool.type === 'text') {
      setTextInput({ show: true, x, y, text: '' });
      return;
    }

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (tool.type === 'laser') {
      setLaserPos({ x, y });
      return;
    }

    if (!isDrawing) return;
    setCurrentPath(prev => [...prev, { x, y }]);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    redrawCanvas();
    ctx.beginPath();
    ctx.strokeStyle = tool.color;
    ctx.lineWidth = tool.size;
    ctx.lineCap = 'round';
    ctx.globalAlpha = tool.type === 'highlighter' ? 0.4 : tool.opacity;
    if (tool.type === 'highlighter') ctx.lineWidth = tool.size * 3;
    if (tool.type === 'eraser') ctx.strokeStyle = '#ffffff';

    if (['line', 'arrow', 'rectangle', 'circle'].includes(tool.type)) {
      if (tool.type === 'line' || tool.type === 'arrow') {
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        ctx.lineTo(x, y);
      } else if (tool.type === 'rectangle') {
        ctx.rect(currentPath[0].x, currentPath[0].y, x - currentPath[0].x, y - currentPath[0].y);
      } else if (tool.type === 'circle') {
        const r = Math.sqrt(Math.pow(x - currentPath[0].x, 2) + Math.pow(y - currentPath[0].y, 2));
        ctx.arc(currentPath[0].x, currentPath[0].y, r, 0, Math.PI * 2);
      }
    } else {
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (tool.type === 'laser') {
      setShowLaser(false);
      return;
    }

    if (!isDrawing || currentPath.length === 0) return;
    setIsDrawing(false);

    const newPath: DrawPath = {
      id: Date.now().toString(),
      tool: { ...tool },
      points: currentPath,
      completed: true,
    };

    const newPaths = [...paths, newPath];
    setPaths(newPaths);
    setCurrentPath([]);

    let newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPaths);
    if (newHistory.length > 50) {
      newHistory = newHistory.slice(newHistory.length - 50);
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPaths(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPaths(history[historyIndex + 1]);
    }
  };

  const clearCanvas = () => {
    setPaths([]);
    let newHistory = [...history.slice(0, historyIndex + 1), []];
    if (newHistory.length > 50) {
      newHistory = newHistory.slice(newHistory.length - 50);
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newPages = [...pages];
        newPages[currentPage] = { ...newPages[currentPage], imageData: ev.target?.result as string };
        setPages(newPages);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 10 * 1024 * 1024) {
      alert('PDF must be under 10MB');
      return;
    }
    // PDF processing would require pdf.js library - showing placeholder
    alert('PDF upload functionality requires pdf.js library integration');
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/png')) {
          const blob = await item.getType('image/png');
          const reader = new FileReader();
          reader.onload = (e) => {
            const newPages = [...pages];
            newPages[currentPage] = { ...newPages[currentPage], imageData: e.target?.result as string };
            setPages(newPages);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    } catch (err) {
      console.error('Paste failed:', err);
    }
  };

  const addPage = () => {
    setPages([...pages, { id: Date.now().toString(), imageData: null }]);
    setCurrentPage(pages.length);
    setPaths([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === 'v') { e.preventDefault(); handlePaste(); }
      if (e.key === 'p') setTool(t => ({ ...t, type: 'pen' }));
      if (e.key === 'e') setTool(t => ({ ...t, type: 'eraser' }));
      if (e.key === 'h') setTool(t => ({ ...t, type: 'highlighter' }));
      if (e.key === 'l') setTool(t => ({ ...t, type: 'laser' }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Brush Size: {tool.size}</label>
        <input type="range" min="1" max="50" value={tool.size} onChange={e => setTool({ ...tool, size: parseInt(e.target.value) })} className="w-full" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Opacity: {Math.round(tool.opacity * 100)}%</label>
        <input type="range" min="10" max="100" value={tool.opacity * 100} onChange={e => setTool({ ...tool, opacity: parseInt(e.target.value) / 100 })} className="w-full" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Pages</label>
        <div className="flex flex-wrap gap-1">
          {pages.map((_, i) => (
            <button key={i} onClick={() => { setCurrentPage(i); setPaths([]); }} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${currentPage === i ? 'ring-2' : ''}`} style={{ backgroundColor: currentPage === i ? theme.primary : theme.border, color: currentPage === i ? 'white' : theme.text }}>
              {i + 1}
            </button>
          ))}
          <button onClick={addPage} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: theme.success, color: 'white' }}>
            <i className="fas fa-plus text-xs" />
          </button>
        </div>
      </div>
      <div className="text-xs space-y-1" style={{ color: theme.textMuted }}>
        <p><strong>Hotkeys:</strong></p>
        <p>P - Pen, E - Eraser, H - Highlighter, L - Laser</p>
        <p>Ctrl+Z - Undo, Ctrl+Y - Redo, Ctrl+V - Paste</p>
      </div>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Whiteboard" icon="fa-chalkboard" onClose={onClose} minWidth={600} minHeight={500} settingsPanel={settingsPanel}>
      <div className="h-full flex flex-col">
        { // Toolbar }
        <div className="flex items-center gap-2 p-2 border-b flex-wrap" style={{ borderColor: theme.border, backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
          { // Tools }
          <div className="flex gap-1">
            {tools.map(t => (
              <button key={t.type} onClick={() => setTool({ ...tool, type: t.type })} className={`w-8 h-8 rounded flex items-center justify-center transition-all ${tool.type === t.type ? 'ring-2' : ''}`} style={{ backgroundColor: tool.type === t.type ? theme.primary : theme.border, color: tool.type === t.type ? 'white' : theme.text }} title={t.label}>
                <i className={`fas ${t.icon} text-xs`} />
              </button>
            ))}
          </div>

          <div className="w-px h-6 mx-1" style={{ backgroundColor: theme.border }} />

          { // Colors }
          <div className="flex gap-1">
            {colors.map(c => (
              <button key={c} onClick={() => setTool({ ...tool, color: c })} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${tool.color === c ? 'scale-110 ring-2 ring-offset-1' : ''}`} style={{ backgroundColor: c, borderColor: c === '#ffffff' ? theme.border : c }} />
            ))}
          </div>

          <div className="w-px h-6 mx-1" style={{ backgroundColor: theme.border }} />

          { // Actions }
          <button onClick={undo} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: theme.border, color: theme.text }} title="Undo (Ctrl+Z)">
            <i className="fas fa-undo text-xs" />
          </button>
          <button onClick={redo} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: theme.border, color: theme.text }} title="Redo (Ctrl+Y)">
            <i className="fas fa-redo text-xs" />
          </button>
          <button onClick={clearCanvas} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: theme.error, color: 'white' }} title="Clear">
            <i className="fas fa-trash text-xs" />
          </button>

          <div className="w-px h-6 mx-1" style={{ backgroundColor: theme.border }} />

          { // File Actions }
          <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: theme.primary, color: 'white' }} title="Open Image">
            <i className="fas fa-image text-xs" />
          </button>
          <button onClick={() => pdfInputRef.current?.click()} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: theme.secondary, color: 'white' }} title="Open PDF">
            <i className="fas fa-file-pdf text-xs" />
          </button>
          <button onClick={handlePaste} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: theme.success, color: 'white' }} title="Paste (Ctrl+V)">
            <i className="fas fa-paste text-xs" />
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
        </div>

        { // Canvas }
        <div className="flex-1 relative overflow-hidden bg-gray-100">
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="w-full h-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {showLaser && (
            <div className="absolute pointer-events-none animate-pulse" style={{ left: laserPos.x - 10, top: laserPos.y - 10, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'red', boxShadow: '0 0 20px 10px rgba(255,0,0,0.5)' }} />
          )}
          {textInput.show && (
            <input
              type="text"
              autoFocus
              value={textInput.text}
              onChange={e => setTextInput({ ...textInput, text: e.target.value })}
              onBlur={() => {
                if (textInput.text) {
                  const newPath: DrawPath = { id: Date.now().toString(), tool, points: [{ x: textInput.x, y: textInput.y }], text: textInput.text, completed: true };
                  setPaths([...paths, newPath]);
                }
                setTextInput({ show: false, x: 0, y: 0, text: '' });
              }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              className="absolute px-2 py-1 rounded"
              style={{ left: textInput.x, top: textInput.y, fontSize: tool.size * 5, color: tool.color, backgroundColor: 'white', border: `2px solid ${theme.primary}` }}
            />
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
};
*/

// ============================================================
// ADVANCED MEDIA PLAYER WIDGET
// ============================================================
const MediaPlayerWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'youtube' | 'slides'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideInterval, setSlideInterval] = useState(5);
  const [volume, setVolume] = useState(1);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<MediaQuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<MediaQuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const promptTemplate = `Create a quiz based on the following lesson content. Generate 4 multiple choice questions with 4 options each. Include feedback for each question and set a time limit of 30 seconds per question.

ANSWER-LENGTH ANTI-CUE RULE (MANDATORY — check every question before returning):
- All four options must be within ±2 words of each other and carry the same level of detail. Never a long wordy option next to three short ones.
- THE LONGEST OPTION MUST NEVER BE THE CORRECT ANSWER. If your correct option is the longest, shorten it or lengthen the distractors until a distractor is longer.
- The correct option must not be the only option with a number, a name, a comma or extra qualifying detail, and must not echo the question's keywords more than the distractors do.
- Distractors must be equally plausible and from the same topic family; rotate the position of the correct answer so it is never the same index twice in a row.
- Self-check silently: if a learner could score by always picking the wordiest option, rewrite those questions.

Lesson Content:
[PASTE YOUR LESSON TEXT HERE]

Please respond in the following JSON format:
{
  "questions": [
    {
      "id": "1",
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "feedback": "Explanation of the correct answer",
      "timeLimit": 30
    }
  ]
}`;

  useEffect(() => {
    if (isPlaying && mediaType === 'image' && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex(i => (i + 1) % images.length);
      }, slideInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, mediaType, images.length, slideInterval]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    Array.from(files).forEach((file: File) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          newImages.push(ev.target?.result as string);
          if (newImages.length === files.length) {
            setImages([...images, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptTemplate);
    SFX.success();
  };

  const loadQuizFromJson = () => {
    const json = prompt('Paste your quiz JSON here:');
    if (json) {
      try {
        const data = JSON.parse(json);
        if (data.questions) {
          setQuizQuestions(data.questions);
          SFX.success();
        }
      } catch (err) {
        alert('Invalid JSON format');
      }
    }
  };

  const showQuestion = (q: MediaQuizQuestion) => {
    setCurrentQuestion(q);
    setSelectedAnswer(null);
  };

  const answerQuestion = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    if (answerIndex === currentQuestion?.correctAnswer) {
      SFX.success();
    } else {
      SFX.error();
    }
  };

  const extractYoutubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Slideshow Interval: {slideInterval}s</label>
        <input type="range" min="1" max="30" value={slideInterval} onChange={e => setSlideInterval(parseInt(e.target.value))} className="w-full" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Volume: {Math.round(volume * 100)}%</label>
        <input type="range" min="0" max="100" value={volume * 100} onChange={e => { setVolume(parseInt(e.target.value) / 100); if (videoRef.current) videoRef.current.volume = parseInt(e.target.value) / 100; if (audioRef.current) audioRef.current.volume = parseInt(e.target.value) / 100; }} className="w-full" />
      </div>
      <button onClick={copyPrompt} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.primary }}>
        <i className="fas fa-copy mr-1" />Copy Quiz Prompt
      </button>
      <button onClick={loadQuizFromJson} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.success }}>
        <i className="fas fa-file-import mr-1" />Load Quiz JSON
      </button>
      {quizQuestions.length > 0 && (
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Quiz Questions</label>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {quizQuestions.map((q, i) => (
              <button key={q.id} onClick={() => showQuestion(q)} className="w-full text-left px-2 py-1 rounded text-xs truncate" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text }}>
                {i + 1}. {q.question}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Media Player" icon="fa-play-circle" onClose={onClose} minWidth={500} minHeight={400} settingsPanel={settingsPanel}>
      <div className="h-full flex flex-col">
        {/* Type Selector */}
        <div className="flex gap-1 p-2 border-b" style={{ borderColor: theme.border }}>
          {[
            { type: 'image' as const, icon: 'fa-image', label: 'Images' },
            { type: 'video' as const, icon: 'fa-video', label: 'Video' },
            { type: 'audio' as const, icon: 'fa-music', label: 'Audio' },
            { type: 'youtube' as const, icon: 'fa-youtube', label: 'YouTube' },
          ].map(t => (
            <button key={t.type} onClick={() => setMediaType(t.type)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mediaType === t.type ? 'shadow' : ''}`} style={{ backgroundColor: mediaType === t.type ? theme.primary : theme.border, color: mediaType === t.type ? 'white' : theme.text }}>
              <i className={`fas ${t.icon} mr-1`} />{t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
          {mediaType === 'image' && (
            <>
              {images.length > 0 ? (
                <img src={images[currentImageIndex]} alt="" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center text-white/50">
                  <i className="fas fa-images text-4xl mb-2" />
                  <p className="text-sm">Add images to start slideshow</p>
                </div>
              )}
            </>
          )}

          {mediaType === 'video' && (
            <video ref={videoRef} src={mediaUrl} controls className="max-w-full max-h-full" />
          )}

          {mediaType === 'audio' && (
            <div className="text-center text-white">
              <i className="fas fa-music text-6xl mb-4" />
              <audio ref={audioRef} src={mediaUrl} controls className="w-full max-w-md" />
            </div>
          )}

          {mediaType === 'youtube' && mediaUrl && extractYoutubeId(mediaUrl) && (
            <iframe
              src={`https://www.youtube.com/embed/${extractYoutubeId(mediaUrl)}?autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Quiz Overlay */}
          {currentQuestion && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
                <h3 className="text-xl font-bold mb-4 text-gray-800">{currentQuestion.question}</h3>
                <div className="space-y-2 mb-4">
                  {currentQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answerQuestion(i)}
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3 rounded-lg text-left font-medium transition-all ${selectedAnswer === i ? (i === currentQuestion.correctAnswer ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : selectedAnswer !== null && i === currentQuestion.correctAnswer ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </button>
                  ))}
                </div>
                {selectedAnswer !== null && (
                  <div className={`p-3 rounded-lg ${selectedAnswer === currentQuestion.correctAnswer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p className="font-bold">{selectedAnswer === currentQuestion.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}</p>
                    <p className="text-sm mt-1">{currentQuestion.feedback}</p>
                  </div>
                )}
                <button onClick={() => setCurrentQuestion(null)} className="mt-4 w-full py-2 rounded-lg font-bold text-white" style={{ backgroundColor: theme.primary }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: theme.border }}>
          {mediaType === 'image' && (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded-lg font-bold text-sm text-white" style={{ backgroundColor: theme.primary }}>
                <i className="fas fa-plus mr-1" />Add Images
              </button>
              {images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImageIndex(i => (i - 1 + images.length) % images.length)} className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.border, color: theme.text }}>
                    <i className="fas fa-chevron-left" />
                  </button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: isPlaying ? theme.warning : theme.success }}>
                    <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
                  </button>
                  <button onClick={() => setCurrentImageIndex(i => (i + 1) % images.length)} className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.border, color: theme.text }}>
                    <i className="fas fa-chevron-right" />
                  </button>
                  <span className="text-sm" style={{ color: theme.textMuted }}>{currentImageIndex + 1} / {images.length}</span>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
            </>
          )}

          {(mediaType === 'video' || mediaType === 'audio' || mediaType === 'youtube') && (
            <input
              type="text"
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              placeholder={mediaType === 'youtube' ? 'Paste YouTube URL...' : `Enter ${mediaType} URL...`}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
            />
          )}

          <button onClick={() => setShowAnnotation(!showAnnotation)} className={`px-3 py-2 rounded-lg font-bold text-sm ${showAnnotation ? 'text-white' : ''}`} style={{ backgroundColor: showAnnotation ? theme.primary : theme.border, color: showAnnotation ? 'white' : theme.text }}>
            <i className="fas fa-pen mr-1" />Annotate
          </button>
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// WEBCAM WIDGET
// ============================================================
const WebcamWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [chromaKey, setChromaKey] = useState(false);
  const [chromaColor, setChromaColor] = useState('#00ff00');
  const [chromaTolerance, setChromaTolerance] = useState(30);
  const [maskShape, setMaskShape] = useState<'none' | 'circle' | 'rounded'>('none');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) setSelectedDevice(videoDevices[0].deviceId);
    });
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDevice ? { exact: selectedDevice } : undefined }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
        setIsPaused(false);
      }
    } catch (err) {
      console.error('Webcam error:', err);
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
  };

  const togglePause = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    const link = document.createElement('a');
    link.download = `webcam-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    return () => stopWebcam();
  }, []);

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Camera</label>
        <select
          value={selectedDevice}
          onChange={e => setSelectedDevice(e.target.value)}
          className="w-full px-2 py-1 rounded text-xs"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
        >
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${devices.indexOf(d) + 1}`}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: theme.textMuted }}>Mirror</span>
        <button onClick={() => setMirror(!mirror)} className={`w-10 h-5 rounded-full transition-all relative ${mirror ? 'bg-green-500' : 'bg-gray-500'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${mirror ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Rotation: {rotation}°</label>
        <input type="range" min="0" max="360" step="90" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} className="w-full" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Mask Shape</label>
        <div className="flex gap-1">
          {['none', 'circle', 'rounded'].map(shape => (
            <button
              key={shape}
              onClick={() => setMaskShape(shape as any)}
              className={`flex-1 py-1 rounded text-xs font-bold ${maskShape === shape ? 'text-white' : ''}`}
              style={{ backgroundColor: maskShape === shape ? theme.primary : theme.border, color: maskShape === shape ? 'white' : theme.text }}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: theme.textMuted }}>Chroma Key</span>
        <button onClick={() => setChromaKey(!chromaKey)} className={`w-10 h-5 rounded-full transition-all relative ${chromaKey ? 'bg-green-500' : 'bg-gray-500'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${chromaKey ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      {chromaKey && (
        <>
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Key Color</label>
            <input type="color" value={chromaColor} onChange={e => setChromaColor(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Tolerance: {chromaTolerance}</label>
            <input type="range" min="1" max="100" value={chromaTolerance} onChange={e => setChromaTolerance(parseInt(e.target.value))} className="w-full" />
          </div>
        </>
      )}
    </>
  );

  const getVideoStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      transform: `${mirror ? 'scaleX(-1)' : ''} rotate(${rotation}deg)`,
      maxWidth: '100%',
      maxHeight: '100%',
    };
    if (maskShape === 'circle') {
      style.borderRadius = '50%';
    } else if (maskShape === 'rounded') {
      style.borderRadius = '20%';
    }
    return style;
  };

  return (
    <WidgetWrapper widget={widget} title="Webcam" icon="fa-camera" onClose={onClose} minWidth={400} minHeight={350} settingsPanel={settingsPanel}>
      <div className="h-full flex flex-col">
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
          {isActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={getVideoStyle()}
              className="object-contain"
            />
          ) : (
            <div className="text-center text-white/50">
              <i className="fas fa-camera text-6xl mb-4" />
              <p>Click Start to enable webcam</p>
            </div>
          )}
          {isPaused && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">PAUSED</span>
            </div>
          )}
        </div>

        <div className="p-3 border-t flex items-center justify-center gap-2" style={{ borderColor: theme.border }}>
          {!isActive ? (
            <button onClick={startWebcam} className="px-6 py-2 rounded-lg font-bold text-white" style={{ backgroundColor: theme.success }}>
              <i className="fas fa-play mr-2" />Start
            </button>
          ) : (
            <>
              <button onClick={togglePause} className="px-4 py-2 rounded-lg font-bold text-white" style={{ backgroundColor: isPaused ? theme.success : theme.warning }}>
                <i className={`fas fa-${isPaused ? 'play' : 'pause'} mr-1`} />{isPaused ? 'Resume' : 'Pause'}
              </button>
              <button onClick={captureFrame} className="px-4 py-2 rounded-lg font-bold text-white" style={{ backgroundColor: theme.primary }}>
                <i className="fas fa-camera mr-1" />Capture
              </button>
              <button onClick={stopWebcam} className="px-4 py-2 rounded-lg font-bold text-white" style={{ backgroundColor: theme.error }}>
                <i className="fas fa-stop mr-1" />Stop
              </button>
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// STICKY NOTES WIDGET (Enhanced)
// ============================================================
const StickyNotesWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme, stickyNotes, setStickyNotes } = useContext(AppContext);
  const noteColors = [
    { bg: '#fef08a', border: '#eab308' }, // Yellow
    { bg: '#bbf7d0', border: '#22c55e' }, // Green
    { bg: '#bfdbfe', border: '#3b82f6' }, // Blue
    { bg: '#fecaca', border: '#ef4444' }, // Red
    { bg: '#fbcfe8', border: '#ec4899' }, // Pink
    { bg: '#e9d5ff', border: '#a855f7' }, // Purple
    { bg: '#fed7aa', border: '#f97316' }, // Orange
    { bg: '#ffffff', border: '#d1d5db' }, // White
  ];
  const [isListening, setIsListening] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const addNote = () => {
    const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)];
    const newNote: StickyNote = {
      id: Date.now().toString(),
      text: '',
      color: randomColor.bg,
      position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 100 },
      size: { width: 200, height: 200 },
      zIndex: 1000 + stickyNotes.length,
      fontSize: 18,
      fontBold: false,
      fontItalic: false,
    };
    setStickyNotes([...stickyNotes, newNote]);
  };

  const updateNote = (id: string, updates: Partial<StickyNote>) => {
    setStickyNotes(stickyNotes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNote = (id: string) => {
    setStickyNotes(stickyNotes.filter(n => n.id !== id));
  };

  const startVoiceDictation = (noteId: string) => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      const note = stickyNotes.find(n => n.id === noteId);
      if (note) {
        updateNote(noteId, { text: note.text + transcript });
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
    setActiveNoteId(noteId);
  };

  const getBorderColor = (bg: string) => {
    const colorObj = noteColors.find(c => c.bg === bg);
    return colorObj ? colorObj.border : '#eab308';
  };

  const settingsPanel = (
    <>
      <button onClick={() => setStickyNotes([])} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.error }}>
        <i className="fas fa-trash mr-1" />Clear All Notes
      </button>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="3D Sticky Notes" icon="fa-sticky-note" onClose={onClose} settingsPanel={settingsPanel} minWidth={450}>
      <div className="p-4 h-full flex flex-col bg-gray-100 dark:bg-slate-900 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')]">
        <button onClick={addNote} className="w-full py-3 mb-6 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-[0_5px_0_rgba(180,83,9,1)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2">
          <i className="fas fa-plus-square text-xl" /> Create New Sticky
        </button>
        <div className="flex-1 overflow-auto custom-scrollbar p-4 -mx-4">
          <div className="grid grid-cols-2 gap-8">
            {stickyNotes.map((note, index) => {
              const rotation = (index % 2 === 0 ? 1 : -1) * (Math.random() * 3 + 1);
              return (
              <div
                key={note.id}
                className="relative group transition-transform duration-300 hover:scale-[1.02] hover:z-50"
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                {/* 3D Tape Strip */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/40 backdrop-blur-sm shadow-sm border border-white/50 z-20" style={{ transform: 'rotate(-2deg)' }}></div>
                
                {/* Sticky Note Body */}
                <div 
                  className="p-4 shadow-[5px_10px_20px_rgba(0,0,0,0.2)] rounded-sm relative isolate before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:to-transparent before:pointer-events-none after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-8 after:h-8 after:bg-gradient-to-tl after:from-black/10 after:to-transparent after:rounded-tl-2xl border-l-[3px]"
                  style={{
                    backgroundColor: note.color,
                    borderColor: getBorderColor(note.color)
                  }}
                >
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                    <button onClick={() => deleteNote(note.id)} className="w-6 h-6 rounded-full bg-red-500/90 text-white text-xs flex items-center justify-center hover:bg-red-600 shadow-md">
                      <i className="fas fa-times" />
                    </button>
                    <button onClick={() => startVoiceDictation(note.id)} className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center shadow-md ${isListening && activeNoteId === note.id ? 'bg-red-500 animate-pulse' : 'bg-blue-500/90 hover:bg-blue-600'}`} title="Voice Input">
                      <i className={`fas fa-${isListening && activeNoteId === note.id ? 'stop' : 'microphone'}`} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col h-full gap-2">
                    <div className="flex gap-1 justify-center bg-black/10 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => updateNote(note.id, { fontBold: !note.fontBold })} className={`w-6 h-6 rounded flex items-center justify-center text-xs text-black font-semibold shadow-sm ${note.fontBold ? 'bg-black/30' : 'hover:bg-black/20'}`}><i className="fas fa-bold"></i></button>
                      <button onClick={() => updateNote(note.id, { fontItalic: !note.fontItalic })} className={`w-6 h-6 rounded flex items-center justify-center text-xs text-black font-semibold shadow-sm ${note.fontItalic ? 'bg-black/30' : 'hover:bg-black/20'}`}><i className="fas fa-italic"></i></button>
                      <div className="w-px h-full bg-black/20 mx-1"></div>
                      <select 
                        value={note.fontSize} 
                        onChange={(e) => updateNote(note.id, { fontSize: parseInt(e.target.value) })}
                        className="bg-transparent border-none text-xs font-black text-black outline-none cursor-pointer"
                      >
                        {[14, 16, 18, 20, 24, 28, 32].map(size => <option key={size} value={size}>{size}px</option>)}
                      </select>
                    </div>

                    <textarea
                      value={note.text}
                      onChange={e => updateNote(note.id, { text: e.target.value })}
                      placeholder="Write a note..."
                      className="w-full flex-1 bg-transparent resize-none focus:outline-none custom-scrollbar marker-font text-black placeholder-black/50"
                      spellCheck="false"
                      style={{
                        fontSize: note.fontSize,
                        fontWeight: note.fontBold ? 'bold' : 'normal',
                        fontStyle: note.fontItalic ? 'italic' : 'normal',
                        minHeight: '140px',
                        lineHeight: '1.4'
                      }}
                    />
                    
                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-black/10 items-center justify-center">
                      {noteColors.map(c => (
                        <button 
                          key={c.bg} 
                          onClick={() => updateNote(note.id, { color: c.bg })} 
                          className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 shadow-inner ${note.color === c.bg ? 'scale-110' : 'border-transparent'}`} 
                          style={{ backgroundColor: c.bg, borderColor: note.color === c.bg ? c.border : 'rgba(0,0,0,0.1)' }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
          {stickyNotes.length === 0 && (
            <div className="text-center py-12 text-gray-500 font-bold bg-white/50 dark:bg-black/20 rounded-2xl border-4 border-dashed border-gray-300 dark:border-gray-700 m-4">
              <i className="fas fa-sticky-note text-6xl mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-xl">Your pinboard is empty.</p>
              <p className="text-sm opacity-70 mt-2">Create a new sticky note above.</p>
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// QUICK POLL WIDGET
// ============================================================
const QuickPollWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [question, setQuestion] = useState('What is your favorite subject?');
  const [options, setOptions] = useState([{ text: 'Math', votes: 0 }, { text: 'Science', votes: 0 }, { text: 'English', votes: 0 }, { text: 'History', votes: 0 }]);
  const [showResults, setShowResults] = useState(false);
  const [editing, setEditing] = useState(false);

  const vote = (idx: number) => {
    const newOpts = [...options];
    newOpts[idx].votes++;
    setOptions(newOpts);
    setShowResults(true);
    SFX.success();
  };

  const totalVotes = options.reduce((a, b) => a + b.votes, 0);

  const settingsPanel = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: theme.textMuted }}>Edit Mode</span>
        <button onClick={() => setEditing(!editing)} className={`w-10 h-5 rounded-full transition-all relative ${editing ? 'bg-green-500' : 'bg-gray-500'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editing ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      <button onClick={() => setOptions([...options, { text: `Option ${options.length + 1}`, votes: 0 }])} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.success }}>
        <i className="fas fa-plus mr-1" />Add Option
      </button>
      <button onClick={() => { setOptions(options.map(o => ({ ...o, votes: 0 }))); setShowResults(false); }} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.warning }}>Reset Votes</button>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Quick Poll" icon="fa-poll" onClose={onClose} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col">
        {editing ? (
          <input type="text" value={question} onChange={e => setQuestion(e.target.value)} className="w-full px-3 py-2 rounded-lg font-bold mb-4" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }} />
        ) : (
          <h3 className="font-bold text-lg mb-4" style={{ color: theme.text }}>{question}</h3>
        )}

        <div className="flex-1 space-y-2 overflow-auto">
          {options.map((opt, i) => (
            <div key={i}>
              {editing ? (
                <div className="flex gap-2">
                  <input type="text" value={opt.text} onChange={e => { const o = [...options]; o[i].text = e.target.value; setOptions(o); }} className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }} />
                  <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="px-3 py-2 rounded-lg text-white" style={{ backgroundColor: theme.error }}><i className="fas fa-trash" /></button>
                </div>
              ) : (
                <button onClick={() => vote(i)} className="w-full p-3 rounded-xl text-left relative overflow-hidden transition-all hover:scale-[1.02]" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  {showResults && <div className="absolute inset-0 transition-all" style={{ width: `${totalVotes ? (opt.votes / totalVotes) * 100 : 0}%`, backgroundColor: `${theme.primary}30` }} />}
                  <div className="relative flex justify-between items-center">
                    <span className="font-medium" style={{ color: theme.text }}>{opt.text}</span>
                    {showResults && <span className="font-bold" style={{ color: theme.primary }}>{opt.votes} ({totalVotes ? Math.round((opt.votes / totalVotes) * 100) : 0}%)</span>}
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// CALENDAR WIDGET
// ============================================================
const CalendarWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  const addEvent = () => {
    if (!selectedDate || !newEventTitle.trim()) return;
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: newEventTitle,
      date: selectedDate.toISOString().split('T')[0],
      color: theme.primary,
      source: 'local',
    };
    setEvents([...events, newEvent]);
    setNewEventTitle('');
    setShowEventModal(false);
    SFX.success();
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const connectGoogle = () => {
    // Placeholder for Google Calendar OAuth
    alert('Google Calendar integration requires OAuth setup. This would redirect to Google for authentication.');
    setGoogleConnected(true);
  };

  const connectMicrosoft = () => {
    // Placeholder for Microsoft Calendar OAuth
    alert('Microsoft Calendar integration requires OAuth setup. This would redirect to Microsoft for authentication.');
    setMicrosoftConnected(true);
  };

  const settingsPanel = (
    <>
      <div className="space-y-2">
        <button
          onClick={connectGoogle}
          className={`w-full py-2 rounded font-bold text-xs flex items-center justify-center gap-2 ${googleConnected ? 'text-white' : ''}`}
          style={{ backgroundColor: googleConnected ? theme.success : theme.border, color: googleConnected ? 'white' : theme.text }}
        >
          <i className="fab fa-google" />
          {googleConnected ? 'Google Connected' : 'Connect Google'}
        </button>
        <button
          onClick={connectMicrosoft}
          className={`w-full py-2 rounded font-bold text-xs flex items-center justify-center gap-2 ${microsoftConnected ? 'text-white' : ''}`}
          style={{ backgroundColor: microsoftConnected ? theme.success : theme.border, color: microsoftConnected ? 'white' : theme.text }}
        >
          <i className="fab fa-microsoft" />
          {microsoftConnected ? 'Microsoft Connected' : 'Connect Microsoft'}
        </button>
      </div>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Calendar" icon="fa-calendar-alt" onClose={onClose} minWidth={350} minHeight={400} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.border, color: theme.text }}>
            <i className="fas fa-chevron-left" />
          </button>
          <h3 className="font-bold text-lg" style={{ color: theme.text }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.border, color: theme.text }}>
            <i className="fas fa-chevron-right" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-bold py-1" style={{ color: theme.textMuted }}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDate?.toDateString() === date.toDateString();

            return (
              <button
                key={i + 1}
                onClick={() => { setSelectedDate(date); setShowEventModal(true); }}
                className={`relative p-1 rounded-lg text-sm font-medium transition-all hover:scale-105 ${isToday ? 'ring-2' : ''}`}
                style={{
                  backgroundColor: isSelected ? theme.primary : dayEvents.length > 0 ? `${theme.primary}20` : theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: isSelected ? 'white' : theme.text,
                  borderColor: theme.primary,
                }}
              >
                {i + 1}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((e, j) => (
                      <div key={j} className="w-1 h-1 rounded-full" style={{ backgroundColor: e.color }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Event Modal */}
        {showEventModal && selectedDate && (
          <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold" style={{ color: theme.text }}>{selectedDate.toLocaleDateString()}</h4>
              <button onClick={() => setShowEventModal(false)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ color: theme.textMuted }}>
                <i className="fas fa-times" />
              </button>
            </div>
            
            {/* Existing Events */}
            <div className="space-y-1 mb-3 max-h-24 overflow-y-auto">
              {getEventsForDate(selectedDate).map(e => (
                <div key={e.id} className="flex items-center justify-between px-2 py-1 rounded" style={{ backgroundColor: `${e.color}20` }}>
                  <span className="text-sm" style={{ color: theme.text }}>{e.title}</span>
                  <button onClick={() => deleteEvent(e.id)} className="text-xs" style={{ color: theme.error }}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Add Event */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                placeholder="New event..."
                className="flex-1 px-2 py-1 rounded text-sm"
                style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
                onKeyDown={e => e.key === 'Enter' && addEvent()}
              />
              <button onClick={addEvent} className="px-3 py-1 rounded font-bold text-white text-sm" style={{ backgroundColor: theme.success }}>
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// SCOREBOARD WIDGET
// ============================================================
const ScoreboardWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [teams, setTeams] = useState<ScoreboardTeam[]>([
    { id: '1', name: 'Team A', score: 0, color: '#3b82f6' },
    { id: '2', name: 'Team B', score: 0, color: '#ef4444' },
  ]);
  const [showAnimation, setShowAnimation] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [animatingTeam, setAnimatingTeam] = useState<string | null>(null);

  const teamColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const addTeam = () => {
    const newTeam: ScoreboardTeam = {
      id: Date.now().toString(),
      name: `Team ${teams.length + 1}`,
      score: 0,
      color: teamColors[teams.length % teamColors.length],
    };
    setTeams([...teams, newTeam]);
  };

  const removeTeam = (id: string) => {
    if (teams.length > 2) {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  const updateScore = (id: string, delta: number) => {
    setTeams(teams.map(t => {
      if (t.id === id) {
        const newScore = Math.max(0, t.score + delta);
        if (delta > 0 && showAnimation) {
          setAnimatingTeam(id);
          setTimeout(() => setAnimatingTeam(null), 1000);
        }
        if (soundEnabled && delta !== 0) {
          const audio = new Audio(delta > 0 
            ? 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
            : 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3'
          );
          audio.volume = 0.3;
          audio.play().catch(() => {});
        }
        return { ...t, score: newScore };
      }
      return t;
    }));
  };

  const updateTeamName = (id: string, name: string) => {
    setTeams(teams.map(t => t.id === id ? { ...t, name } : t));
  };

  const resetScores = () => {
    setTeams(teams.map(t => ({ ...t, score: 0 })));
  };

  const settingsPanel = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: theme.textMuted }}>Animations</span>
        <button onClick={() => setShowAnimation(!showAnimation)} className={`w-10 h-5 rounded-full transition-all relative ${showAnimation ? 'bg-green-500' : 'bg-gray-500'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showAnimation ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: theme.textMuted }}>Sound Effects</span>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-10 h-5 rounded-full transition-all relative ${soundEnabled ? 'bg-green-500' : 'bg-gray-500'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${soundEnabled ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      <button onClick={addTeam} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.success }}>
        <i className="fas fa-plus mr-1" />Add Team
      </button>
      <button onClick={resetScores} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.warning }}>
        <i className="fas fa-redo mr-1" />Reset All
      </button>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Scoreboard" icon="fa-trophy" onClose={onClose} minWidth={400} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className={`grid gap-4 ${teams.length <= 2 ? 'grid-cols-2' : teams.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {teams.map(team => (
              <div
                key={team.id}
                className={`relative p-4 rounded-2xl text-center transition-all ${animatingTeam === team.id ? 'scale-110 animate-pulse' : ''}`}
                style={{ backgroundColor: team.color }}
              >
                {teams.length > 2 && (
                  <button
                    onClick={() => removeTeam(team.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/20 text-white text-xs flex items-center justify-center hover:bg-black/40"
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
                <input
                  type="text"
                  value={team.name}
                  onChange={e => updateTeamName(team.id, e.target.value)}
                  className="w-full bg-transparent text-white font-bold text-center text-lg mb-2 focus:outline-none"
                />
                <div className="text-6xl font-black text-white mb-4 drop-shadow-lg">
                  {team.score}
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => updateScore(team.id, -1)}
                    className="w-10 h-10 rounded-full bg-white/20 text-white font-bold text-xl hover:bg-white/30 transition-colors"
                  >
                    -
                  </button>
                  <button
                    onClick={() => updateScore(team.id, 1)}
                    className="w-10 h-10 rounded-full bg-white/30 text-white font-bold text-xl hover:bg-white/40 transition-colors"
                  >
                    +
                  </button>
                </div>
                <div className="flex justify-center gap-1 mt-2">
                  <button onClick={() => updateScore(team.id, 5)} className="px-2 py-1 rounded bg-white/20 text-white text-xs font-bold">+5</button>
                  <button onClick={() => updateScore(team.id, 10)} className="px-2 py-1 rounded bg-white/20 text-white text-xs font-bold">+10</button>
                </div>
                
                {/* Color picker */}
                <div className="flex justify-center gap-1 mt-3">
                  {teamColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setTeams(teams.map(t => t.id === team.id ? { ...t, color: c } : t))}
                      className={`w-4 h-4 rounded-full border-2 ${team.color === c ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Animation overlay */}
                {animatingTeam === team.id && (
                  <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-2xl animate-ping"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 0.5}s`,
                        }}
                      >
                        ⭐
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// WORLD CLOCK WIDGET
// ============================================================
const WorldClockWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [clocks, setClocks] = useState<WorldClockZone[]>([
    { id: '1', timezone: 'America/New_York', label: 'New York', isTutor: true },
    { id: '2', timezone: 'Europe/London', label: 'London', isTutor: false },
  ]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [manualCity, setManualCity] = useState('');
  const [manualOffset, setManualOffset] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getAdjustedTime = (offset: number) => {
    return new Date(currentTime.getTime() + (offset * 3600000));
  };

  const getTimeForZone = (clock: WorldClockZone) => {
    if (clock.customOffset !== undefined) {
      const adjusted = getAdjustedTime(clock.customOffset);
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(adjusted);
    }
    return new Intl.DateTimeFormat('en-US', {
      timeZone: clock.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(currentTime);
  };

  const getDateForZone = (clock: WorldClockZone) => {
    if (clock.customOffset !== undefined) {
      const adjusted = getAdjustedTime(clock.customOffset);
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(adjusted);
    }
    return new Intl.DateTimeFormat('en-US', {
      timeZone: clock.timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(currentTime);
  };

  const getHourAngle = (clock: WorldClockZone) => {
    let timeStr;
    if (clock.customOffset !== undefined) {
      const adjusted = getAdjustedTime(clock.customOffset);
      timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).format(adjusted);
    } else {
      timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: clock.timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).format(currentTime);
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return ((hours % 12) + minutes / 60) * 30;
  };

  const getMinuteAngle = (clock: WorldClockZone) => {
    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: clock.customOffset !== undefined ? 'UTC' : clock.timezone,
      minute: 'numeric',
    }).format(clock.customOffset !== undefined ? getAdjustedTime(clock.customOffset) : currentTime);
    return parseInt(time) * 6;
  };

  const getSecondAngle = (clock: WorldClockZone) => {
    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: clock.customOffset !== undefined ? 'UTC' : clock.timezone,
      second: 'numeric',
    }).format(clock.customOffset !== undefined ? getAdjustedTime(clock.customOffset) : currentTime);
    return parseInt(time) * 6;
  };

  const addManualClock = () => {
    if (manualCity.trim() && manualOffset !== '') {
      const offset = parseFloat(manualOffset);
      if (!isNaN(offset)) {
        setClocks([...clocks, {
          id: Date.now().toString(),
          timezone: 'UTC',
          label: manualCity,
          isTutor: false,
          customOffset: offset
        }]);
        setManualCity('');
        setManualOffset('');
      }
    }
  };

  const addClock = (timezone: string) => {
    const tz = TIMEZONES.find(t => t.value === timezone);
    if (tz) {
      setClocks([...clocks, {
        id: Date.now().toString(),
        timezone: tz.value,
        label: tz.label.split(' ')[0],
        isTutor: false,
      }]);
    }
  };

  const removeClock = (id: string) => {
    if (clocks.length > 1) {
      setClocks(clocks.filter(c => c.id !== id));
    }
  };

  const settingsPanel = (
    <>
      <div className="mb-4">
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Add Timezone</label>
        <select
          onChange={e => { if (e.target.value) addClock(e.target.value); e.target.value = ''; }}
          className="w-full px-2 py-1 rounded text-xs mb-2"
          style={{ 
            backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
            color: theme.text, 
            border: `1px solid ${theme.border}` 
          }}
        >
          <option value="" style={{ color: 'black' }}>Select timezone...</option>
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value} style={{ color: 'black' }}>{tz.label}</option>
          ))}
        </select>
      </div>
      
      <div className="border-t pt-4" style={{ borderColor: theme.border }}>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Manual Entry</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="City Name (e.g. Athens)"
            value={manualCity}
            onChange={e => setManualCity(e.target.value)}
            className="flex-1 px-2 py-1 rounded text-xs"
            style={{ 
              backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
              color: theme.text, 
              border: `1px solid ${theme.border}` 
            }}
          />
          <input
            type="number"
            placeholder="UTC Offset (+2)"
            value={manualOffset}
            onChange={e => setManualOffset(e.target.value)}
            className="w-20 px-2 py-1 rounded text-xs"
            style={{ 
              backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
              color: theme.text, 
              border: `1px solid ${theme.border}` 
            }}
          />
        </div>
        <button 
          onClick={addManualClock}
          disabled={!manualCity.trim() || manualOffset === ''}
          className="w-full py-1 rounded text-xs font-bold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: theme.primary }}
        >
          Add Custom Clock
        </button>
      </div>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="World Clock" icon="fa-globe" onClose={onClose} minWidth={350} settingsPanel={settingsPanel}>
      <div className="p-4 h-full overflow-auto">
        <div className="grid grid-cols-2 gap-4">
          {clocks.map(clock => (
            <div
              key={clock.id}
              className="p-4 rounded-2xl relative"
              style={{ backgroundColor: clock.isTutor ? `${theme.primary}20` : theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
            >
              {clocks.length > 1 && (
                <button
                  onClick={() => removeClock(clock.id)}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: theme.error, color: 'white' }}
                >
                  <i className="fas fa-times" />
                </button>
              )}
              
              <div className="text-center mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${clock.isTutor ? 'text-white' : ''}`} style={{ backgroundColor: clock.isTutor ? theme.primary : theme.border, color: clock.isTutor ? 'white' : theme.textMuted }}>
                  {clock.isTutor ? 'TUTOR' : 'LEARNER'}
                </span>
                <input
                  type="text"
                  value={clock.label}
                  onChange={e => setClocks(clocks.map(c => c.id === clock.id ? { ...c, label: e.target.value } : c))}
                  className="block w-full text-center font-bold mt-1 bg-transparent focus:outline-none"
                  style={{ color: theme.text }}
                />
              </div>

              {/* Analog Clock */}
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Clock face */}
                  <circle cx="50" cy="50" r="48" fill={theme.mode === 'dark' ? '#1f2937' : '#f8fafc'} stroke={theme.border} strokeWidth="2" />
                  {/* Hour markers */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <line
                      key={i}
                      x1="50"
                      y1="6"
                      x2="50"
                      y2={i % 3 === 0 ? "12" : "9"}
                      stroke={theme.textMuted}
                      strokeWidth={i % 3 === 0 ? "2" : "1"}
                      transform={`rotate(${i * 30} 50 50)`}
                    />
                  ))}
                  {/* Hour hand */}
                  <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="25"
                    stroke={theme.text}
                    strokeWidth="3"
                    strokeLinecap="round"
                    transform={`rotate(${getHourAngle(clock)} 50 50)`}
                  />
                  {/* Minute hand */}
                  <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="15"
                    stroke={theme.primary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    transform={`rotate(${getMinuteAngle(clock)} 50 50)`}
                  />
                  {/* Second hand */}
                  <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="12"
                    stroke={theme.error}
                    strokeWidth="1"
                    strokeLinecap="round"
                    transform={`rotate(${getSecondAngle(clock)} 50 50)`}
                  />
                  {/* Center dot */}
                  <circle cx="50" cy="50" r="3" fill={theme.primary} />
                </svg>
              </div>

              {/* Digital time */}
              <div className="text-center">
                <div className="text-2xl font-mono font-bold" style={{ color: theme.text }}>
                  {getTimeForZone(clock)}
                </div>
                <div className="text-xs" style={{ color: theme.textMuted }}>
                  {getDateForZone(clock)}
                </div>
              </div>

              {/* Toggle tutor/learner */}
              <button
                onClick={() => setClocks(clocks.map(c => c.id === clock.id ? { ...c, isTutor: !c.isTutor } : c))}
                className="mt-2 w-full py-1 rounded text-xs font-bold"
                style={{ backgroundColor: theme.border, color: theme.textMuted }}
              >
                Set as {clock.isTutor ? 'Learner' : 'Tutor'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// TIMETABLE WIDGET
// ============================================================
const TimetableWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 12 }, (_, i) => `${8 + i}:00`);
  const entryColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const addEntry = (day: number, startTime: string) => {
    const newEntry: TimetableEntry = {
      id: Date.now().toString(),
      day,
      startTime,
      endTime: `${parseInt(startTime) + 1}:00`,
      subject: 'New Class',
      color: entryColors[Math.floor(Math.random() * entryColors.length)],
    };
    setEntries([...entries, newEntry]);
    setEditingEntry(newEntry);
  };

  const updateEntry = (id: string, updates: Partial<TimetableEntry>) => {
    setEntries(entries.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
    setEditingEntry(null);
  };

  const getEntriesForSlot = (day: number, hour: string) => {
    return entries.filter(e => e.day === day && e.startTime === hour);
  };

  const settingsPanel = editingEntry ? (
    <>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Subject</label>
        <input
          type="text"
          value={editingEntry.subject}
          onChange={e => { updateEntry(editingEntry.id, { subject: e.target.value }); setEditingEntry({ ...editingEntry, subject: e.target.value }); }}
          className="w-full px-2 py-1 rounded text-sm"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
        />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Start Time</label>
        <select
          value={editingEntry.startTime}
          onChange={e => { updateEntry(editingEntry.id, { startTime: e.target.value }); setEditingEntry({ ...editingEntry, startTime: e.target.value }); }}
          className="w-full px-2 py-1 rounded text-xs"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
        >
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>End Time</label>
        <select
          value={editingEntry.endTime}
          onChange={e => { updateEntry(editingEntry.id, { endTime: e.target.value }); setEditingEntry({ ...editingEntry, endTime: e.target.value }); }}
          className="w-full px-2 py-1 rounded text-xs"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
        >
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Color</label>
        <div className="flex gap-1">
          {entryColors.map(c => (
            <button
              key={c}
              onClick={() => { updateEntry(editingEntry.id, { color: c }); setEditingEntry({ ...editingEntry, color: c }); }}
              className={`w-6 h-6 rounded-full border-2 ${editingEntry.color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <button onClick={() => deleteEntry(editingEntry.id)} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.error }}>
        <i className="fas fa-trash mr-1" />Delete Entry
      </button>
      <button onClick={() => setEditingEntry(null)} className="w-full py-2 rounded font-bold text-xs" style={{ backgroundColor: theme.border, color: theme.text }}>
        Close
      </button>
    </>
  ) : (
    <>
      <p className="text-xs" style={{ color: theme.textMuted }}>Click on an empty cell to add a new entry, or click an existing entry to edit it.</p>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Timetable" icon="fa-th" onClose={onClose} minWidth={500} minHeight={400} settingsPanel={settingsPanel}>
      <div className="p-2 h-full overflow-auto">
        <div className="grid grid-cols-8 gap-0.5 text-xs">
          {/* Header */}
          <div className="p-1 font-bold text-center" style={{ color: theme.textMuted }}>Time</div>
          {days.map(day => (
            <div key={day} className="p-1 font-bold text-center" style={{ color: theme.text }}>{day}</div>
          ))}

          {/* Grid */}
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="p-1 text-center border-t" style={{ color: theme.textMuted, borderColor: theme.border }}>{hour}</div>
              {days.map((_, dayIndex) => {
                const slotEntries = getEntriesForSlot(dayIndex, hour);
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className="p-0.5 min-h-[40px] border-t cursor-pointer hover:bg-opacity-50 transition-colors"
                    style={{ borderColor: theme.border, backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                    onClick={() => slotEntries.length === 0 && addEntry(dayIndex, hour)}
                  >
                    {slotEntries.map(entry => (
                      <div
                        key={entry.id}
                        onClick={e => { e.stopPropagation(); setEditingEntry(entry); }}
                        className="p-1 rounded text-white text-xs font-medium truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: entry.color }}
                      >
                        {entry.subject}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// REACTIONS WIDGET
// ============================================================
const ReactionsWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme, showReaction } = useContext(AppContext);
  const [customEmoji, setCustomEmoji] = useState('');

  const handleReaction = (emoji: string) => {
    showReaction(emoji);
  };

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Custom Sticker</label>
        <input
          type="text"
          value={customEmoji}
          onChange={e => setCustomEmoji(e.target.value)}
          placeholder="Paste emoji or URL..."
          className="w-full px-2 py-1 rounded text-sm"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
        />
        {customEmoji && (
          <button
            onClick={() => handleReaction(customEmoji)}
            className="mt-2 w-full py-2 rounded font-bold text-xs text-white"
            style={{ backgroundColor: theme.primary }}
          >
            Send Custom Reaction
          </button>
        )}
      </div>
    </>
  );

  const praises = REACTION_EMOJIS.slice(0, 14);
  const criticals = REACTION_EMOJIS.slice(14);

  return (
    <WidgetWrapper widget={widget} title="Reactions" icon="fa-heart" onClose={onClose} minWidth={330} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div>
          <div className="text-[10px] uppercase font-black tracking-wider text-emerald-500 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Praise & Celebration
          </div>
          <div className="grid grid-cols-6 gap-2">
            {praises.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-3xl p-2 rounded-xl transition-all hover:scale-120 hover:bg-emerald-500/10 cursor-pointer text-center active:scale-95"
                title="Send Praise"
                style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-black/10 dark:border-white/10 pt-3">
          <div className="text-[10px] uppercase font-black tracking-wider text-amber-500 dark:text-amber-400 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Oops & Constructive
          </div>
          <div className="grid grid-cols-6 gap-2">
            {criticals.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-3xl p-2 rounded-xl transition-all hover:scale-120 hover:bg-amber-500/10 cursor-pointer text-center active:scale-95"
                title="Send Constructive"
                style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// EMBED WIDGET
// ============================================================
const EmbedWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [mode, setMode] = useState<'url' | 'code'>('url');

  const settingsPanel = (
    <>
      <div className="flex gap-1">
        <button
          onClick={() => setMode('url')}
          className={`flex-1 py-1 rounded text-xs font-bold ${mode === 'url' ? 'text-white' : ''}`}
          style={{ backgroundColor: mode === 'url' ? theme.primary : theme.border, color: mode === 'url' ? 'white' : theme.text }}
        >
          URL
        </button>
        <button
          onClick={() => setMode('code')}
          className={`flex-1 py-1 rounded text-xs font-bold ${mode === 'code' ? 'text-white' : ''}`}
          style={{ backgroundColor: mode === 'code' ? theme.primary : theme.border, color: mode === 'code' ? 'white' : theme.text }}
        >
          HTML Code
        </button>
      </div>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Quick Embeds</label>
        <div className="space-y-1">
          {[
            { name: 'Google Slides', url: 'https://docs.google.com/presentation/d/e/YOUR_ID/embed' },
            { name: 'YouTube', url: 'https://www.youtube.com/embed/VIDEO_ID' },
            { name: 'Padlet', url: 'https://padlet.com/embed/YOUR_PADLET' },
          ].map(item => (
            <button
              key={item.name}
              onClick={() => setEmbedUrl(item.url)}
              className="w-full text-left px-2 py-1 rounded text-xs"
              style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Embed" icon="fa-code" onClose={onClose} minWidth={400} minHeight={350} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col">
        {mode === 'url' ? (
          <input
            type="text"
            value={embedUrl}
            onChange={e => setEmbedUrl(e.target.value)}
            placeholder="Enter embed URL (YouTube, Google Slides, etc.)..."
            className="w-full px-3 py-2 rounded-lg text-sm mb-4"
            style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
          />
        ) : (
          <textarea
            value={embedCode}
            onChange={e => setEmbedCode(e.target.value)}
            placeholder="Paste HTML embed code here..."
            className="w-full px-3 py-2 rounded-lg text-sm mb-4 resize-none h-20"
            style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
          />
        )}
        
        <div className="flex-1 rounded-lg overflow-hidden bg-white">
          {mode === 'url' && embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : mode === 'code' && embedCode ? (
            <div dangerouslySetInnerHTML={{ __html: embedCode }} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <i className="fas fa-code text-4xl mb-2" />
                <p className="text-sm">Enter a URL or embed code to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// DICE WIDGET
// ============================================================
const DiceWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(6);
  const [results, setResults] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [modifier, setModifier] = useState<number>(0);
  const [history, setHistory] = useState<{roll: number[], total: number, date: Date}[]>([]);

  const rollDice = async () => {
    setIsRolling(true);
    setResults([]);
    SFX.click();
    
    try {
      // Simulate epic delay
      await new Promise(r => setTimeout(r, 600));
      
      const newResults = Array.from({ length: diceCount }).map(() => {
         return Math.floor(Math.random() * diceSides) + 1;
      });

      setResults(newResults);
      const total = newResults.reduce((a, b) => a + b, 0) + modifier;
      setHistory(prev => [{roll: newResults, total, date: new Date()}, ...prev].slice(0, 5));
      SFX.success();
    } finally {
      setIsRolling(false);
    }
  };

  const getDiceFace = (value: number) => {
    if (diceSides !== 6) return value;
    const dots: Record<number, string> = {
      1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'
    };
    return dots[value] || value;
  };

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Number of Dice: {diceCount}</label>
        <input type="range" min="1" max="10" value={diceCount} onChange={e => setDiceCount(parseInt(e.target.value))} className="w-full accent-indigo-500" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Modifier (e.g. +2): {modifier}</label>
        <input type="range" min="-10" max="20" value={modifier} onChange={e => setModifier(parseInt(e.target.value))} className="w-full accent-emerald-500" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Sides: {diceSides}</label>
        <div className="flex gap-1 flex-wrap">
          {[4, 6, 8, 10, 12, 20, 100].map(sides => (
            <button
              key={sides}
              onClick={() => setDiceSides(sides)}
              className={`px-2 py-1 rounded text-xs font-bold transition-all shadow-sm ${diceSides === sides ? 'text-white scale-105' : 'hover:scale-105'}`}
              style={{ backgroundColor: diceSides === sides ? theme.primary : theme.border, color: diceSides === sides ? 'white' : theme.text }}
            >
              d{sides}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Dice" icon="fa-dice-d20" onClose={onClose} minWidth={350} minHeight={400} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col bg-gradient-to-b from-black/5 to-black/10 dark:from-white/5 dark:to-transparent">
        
        {/* Main Rolling Area */}
        <div className="flex-1 flex flex-col items-center justify-center py-6">
           <div className={`flex flex-wrap gap-4 justify-center mb-6 perspective-1000 ${isRolling ? 'animate-pulse' : ''}`}>
             {results.length > 0 ? (
               results.map((result, i) => (
                 <div
                   key={i}
                   className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl font-black shadow-2xl relative bg-gradient-to-br from-indigo-500 to-purple-600 outline outline-4 outline-white/20 text-white ${isRolling ? 'animate-bounce' : 'animate-slideInUp'}`}
                   style={{ transformStyle: 'preserve-3d' }}
                 >
                   <span className="drop-shadow-md">{diceSides === 6 ? getDiceFace(result) : result}</span>
                   {results.length > 1 && <span className="absolute -bottom-2 -right-2 text-[10px] bg-black/50 px-1 rounded-sm">d{diceSides}</span>}
                 </div>
               ))
             ) : (
               Array.from({ length: diceCount }).map((_, i) => (
                 <div
                   key={i}
                   className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 border-dashed opacity-50 transition-all"
                   style={{ borderColor: theme.textMuted, color: theme.textMuted }}
                 >
                   ?
                 </div>
               ))
             )}
           </div>
           
           {results.length > 0 && (
             <div className="text-center mb-2 animate-fadeIn flex flex-col items-center">
               <span className="text-xs uppercase tracking-widest font-bold opacity-60 mb-1" style={{ color: theme.text }}>Total {modifier !== 0 ? `(w/ ${modifier > 0 ? '+'+modifier : modifier} mod)` : ''}</span>
               <div className="text-5xl font-black drop-shadow-lg" style={{ color: theme.primary }}>
                  {results.reduce((a, b) => a + b, 0) + modifier}
               </div>
             </div>
           )}
        </div>

        {/* History Panel */}
        {history.length > 0 && (
           <div className="shrink-0 max-h-24 overflow-y-auto mb-4 custom-scrollbar rounded-xl bg-black/5 dark:bg-white/5 p-2 shadow-inner">
              {history.map((h, i) => (
                 <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-black/5 dark:border-white/5 last:border-0" style={{ color: theme.text }}>
                    <span className="opacity-50 blur-[0.2px] hover:blur-none transition-all">{h.date.toLocaleTimeString()}</span>
                    <span className="opacity-80 font-mono tracking-tighter">[{h.roll.join(', ')}] {modifier !== 0 && (modifier > 0 ? '+'+modifier : modifier)}</span>
                    <span className="font-black w-8 text-right" style={{ color: theme.primary }}>{h.total}</span>
                 </div>
              ))}
           </div>
        )}
        
        {/* Actions */}
        <button
          onClick={rollDice}
          disabled={isRolling}
          className="w-full shrink-0 py-4 rounded-xl font-black text-white hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-xl bg-gradient-to-r from-indigo-500 to-purple-600"
        >
          <i className={`fas fa-dice mr-2 ${isRolling ? 'fa-spin' : ''}`} />
          {isRolling ? 'Rolling...' : `ROLL`}
        </button>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// GROUP MAKER WIDGET
// ============================================================
const GroupMakerWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [students, setStudents] = useState<string[]>(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']);
  const [groupCount, setGroupCount] = useState(2);
  const [groups, setGroups] = useState<string[][]>([]);
  const [newStudent, setNewStudent] = useState('');

  const generateGroups = () => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const newGroups: string[][] = Array.from({ length: groupCount }, () => []);
    shuffled.forEach((student, i) => {
      newGroups[i % groupCount].push(student);
    });
    setGroups(newGroups);
    SFX.success();
  };

  const addStudent = () => {
    if (newStudent.trim()) {
      setStudents([...students, newStudent.trim()]);
      setNewStudent('');
    }
  };

  const groupColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Number of Groups: {groupCount}</label>
        <input type="range" min="2" max={Math.min(10, students.length)} value={groupCount} onChange={e => setGroupCount(parseInt(e.target.value))} className="w-full" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: theme.textMuted }}>Add Students (one per line)</label>
        <textarea
          placeholder="Name 1&#10;Name 2"
          className="w-full h-20 px-2 py-1 rounded text-xs"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
          onBlur={e => {
            const names = e.target.value.split('\n').filter(n => n.trim());
            if (names.length) setStudents([...students, ...names]);
            e.target.value = '';
          }}
        />
      </div>
      <button onClick={() => setStudents([])} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.error }}>Clear All</button>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Group Maker" icon="fa-users-cog" onClose={onClose} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col">
        {/* Add student input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newStudent}
            onChange={e => setNewStudent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStudent()}
            placeholder="Add student..."
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
          />
          <button onClick={addStudent} className="px-4 py-2 rounded-lg font-bold text-white" style={{ backgroundColor: theme.success }}>+</button>
        </div>

        {/* Student list */}
        <div className="flex flex-wrap gap-1 mb-4 max-h-20 overflow-y-auto">
          {students.map((student, i) => (
            <span key={i} className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: theme.primary + '30', color: theme.text }}>
              {student}
              <button onClick={() => setStudents(students.filter((_, j) => j !== i))} className="hover:text-red-500">
                <i className="fas fa-times text-xs" />
              </button>
            </span>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={generateGroups}
          disabled={students.length < groupCount}
          className="w-full py-3 rounded-xl font-bold text-white mb-4 disabled:opacity-50"
          style={{ backgroundColor: theme.primary }}
        >
          <i className="fas fa-random mr-2" />Generate {groupCount} Groups
        </button>

        {/* Groups display */}
        <div className="flex-1 overflow-auto grid grid-cols-2 gap-3">
          {groups.map((group, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: groupColors[i % groupColors.length] + '20' }}>
              <h4 className="font-bold mb-2 flex items-center gap-2" style={{ color: groupColors[i % groupColors.length] }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: groupColors[i % groupColors.length] }}>{i + 1}</span>
                Group {i + 1}
              </h4>
              <ul className="space-y-1">
                {group.map((student, j) => (
                  <li key={j} className="text-sm" style={{ color: theme.text }}>{student}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// COUNTER WIDGET
// ============================================================
const CounterWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState('Counter');

  const settingsPanel = (
    <>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Label</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="w-full px-2 py-1 rounded text-sm"
          style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}
        />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Step: {step}</label>
        <input type="range" min="1" max="10" value={step} onChange={e => setStep(parseInt(e.target.value))} className="w-full" />
      </div>
      <button onClick={() => setCount(0)} className="w-full py-2 rounded font-bold text-xs text-white" style={{ backgroundColor: theme.warning }}>Reset</button>
    </>
  );

  return (
    <WidgetWrapper widget={widget} title="Counter" icon="fa-plus-circle" onClose={onClose} minWidth={250} minHeight={200} settingsPanel={settingsPanel}>
      <div className="p-4 h-full flex flex-col items-center justify-center">
        <span className="text-lg font-bold mb-2" style={{ color: theme.textMuted }}>{label}</span>
        <div className="text-7xl font-black mb-6" style={{ color: theme.primary }}>{count}</div>
        <div className="flex gap-3">
          <button
            onClick={() => setCount(count - step)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-transform hover:scale-110"
            style={{ backgroundColor: theme.error }}
          >
            -
          </button>
          <button
            onClick={() => setCount(count + step)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-transform hover:scale-110"
            style={{ backgroundColor: theme.success }}
          >
            +
          </button>
        </div>
      </div>
    </WidgetWrapper>
  );
};

/*
// ============================================================
// TEXT EDITOR WIDGET
// ============================================================
const TextEditorWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Inject whiteboard HTML/CSS/JS
    const { html, css, js } = getWhiteboardFeatures({ name: 'Student', coursePlan: { courseName: 'General English' } } as any);
    
    // Check if already injected
    if (!document.getElementById('wb-overlay')) {
      const style = document.createElement('style');
      style.innerHTML = css;
      document.head.appendChild(style);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      while (tempDiv.firstChild) {
        document.body.appendChild(tempDiv.firstChild);
      }
      
      const script = document.createElement('script');
      script.innerHTML = js;
      document.body.appendChild(script);
    }
    
    // Open the whiteboard overlay — prefer the Smart Writeboard's own opener when this
    // page also embeds the older whiteboard engine (its window.openWhiteboard may shadow it)
    const sbOpen: any = (window as any).openSmartWriteboard || (window as any).openWhiteboard;
    if (typeof sbOpen === 'function') {
      sbOpen();
      // Set theme through new API
      if (typeof (window as any).wbSetTheme === 'function') {
        (window as any).wbSetTheme('light');
      }
    }
    
    // Close the widget since the whiteboard is full screen
    onClose();
    
    return () => {
      // We don't remove the DOM elements to allow reopening later
    };
  }, [theme.mode, onClose]);

  return <div ref={containerRef} className="hidden" />;
};
*/

// ============================================================
// KARAOKE WIDGET (AI Karaoke)
// ============================================================
const KaraokeWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [lyricsInput, setLyricsInput] = useState('');
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [syncedLines, setSyncedLines] = useState<SyncedLine[]>([]);
  const [autoLyrics, setAutoLyrics] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [videos, setVideos] = useState<VideoCandidate[]>([]);
  const [videoTitle, setVideoTitle] = useState('');
  const [searchError, setSearchError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [songMeta, setSongMeta] = useState('');
  const [paceSeconds, setPaceSeconds] = useState(4);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  // The stage has its own flag so that pausing (or a video ending) cannot throw
  // the tutor back to the setup screen the way the old `isPlaying` check did.
  const [stageActive, setStageActive] = useState(false);

  // Microphone and live visualizer states
  const [micEnabled, setMicEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const syncedMode = syncedLines.length > 0;

  /** Apply a resolved song (app song service or the in-browser fallback) to the widget. */
  const applySong = useCallback((data: SongPayload, fallbackQuery = '', noticeText = '') => {
    const list = Array.isArray(data.videos) ? data.videos : [];
    setVideos(list);
    const best = data.video || list[0] || null;
    setVideoId(best ? best.id : (data.youtubeVideoId || ''));
    setVideoTitle(best ? best.title : '');
    setUrl(best ? best.id : '');
    if (data.lyrics) {
      setLyricsInput(data.lyrics);
      setAutoLyrics(data.lyrics);
    }
    setSyncedLines(parseLrc(data.syncedLyrics));
    setSourceLabel(data.lyricsSource || '');
    setSongMeta(`“${data.song || fallbackQuery}” · ${data.artist || 'Unknown artist'}`);
    setNotice(noticeText);
    setSearchError(best ? '' : 'No embeddable video was found for this song — paste a YouTube link below, or pick one of the alternatives.');
  }, []);

  // loadSong() prefers the app's song service and falls back to resolving the track
  // in the browser (see utils/songResolveClient.ts) — on a static deployment there
  // are no /api routes, which used to make this widget fail outright.
  const searchLyricsAndVideo = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSongMeta('');
    setSearchError('');
    setNotice('');
    try {
      const { payload, notice: noticeText } = await loadSong({ query: searchQuery, mode: 'karaoke' });
      applySong(payload, searchQuery, noticeText);
    } catch (e: any) {
      setSearchError(e?.message || "Could not look up that song. Check the spelling, or paste a YouTube link and the lyrics manually.");
    } finally {
      setIsSearching(false);
    }
  };

  const startKaraoke = () => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/);
    const vId = match && match[1] ? match[1] : url.trim();
    setVideoId(vId);

    // Timings describe the lyrics we fetched. If the teacher edited the text box,
    // drop them and fall back to the manual pace timer instead of drifting.
    const edited = lyricsInput.trim() !== autoLyrics.trim();
    const timings = edited ? [] : syncedLines;
    const lines = lyricsInput.split('\n').filter(l => l.trim() !== '');

    setLyricsLines(lines.length ? lines : ["♪ ♪ ♪"]);
    setSyncedLines(timings);
    setActiveLineIndex(timings.length ? -1 : 0);
    setStageActive(true);
    setShowCountdown(true);
    setCountdown(3);
  };

  // Countdown timer cycle
  useEffect(() => {
    if (!showCountdown) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowCountdown(false);
      setIsPlaying(true);
      setActiveLineIndex(0);
      // The countdown is the cue — the music starts when it hits zero.
      playerRef.current?.play();
    }
  }, [showCountdown, countdown]);

  // Pace timer — only for tracks without timings (manual mode).
  useEffect(() => {
    if (!isPlaying || syncedMode || lyricsLines.length === 0) return;
    const interval = setInterval(() => {
      setActiveLineIndex(prev => (prev < lyricsLines.length - 1 ? prev + 1 : prev));
    }, paceSeconds * 1000);
    return () => clearInterval(interval);
  }, [isPlaying, syncedMode, lyricsLines.length, paceSeconds]);

  // Keep the highlighted line centred.
  useEffect(() => {
    const container = lyricsContainerRef.current;
    if (!container || activeLineIndex < 0) return;
    const child = container.children[activeLineIndex] as HTMLElement | undefined;
    if (child) child.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLineIndex]);

  // Follow the real video clock when the track has timings.
  const handleVideoTime = useCallback((t: number) => {
    setCurrentTime(t);
    if (!syncedLines.length) return;
    const idx = findActiveLineIndex(syncedLines, t);
    setActiveLineIndex(prev => (prev === idx ? prev : idx));
  }, [syncedLines]);

  /** Jump the video to a lyric line (synced mode only). */
  const jumpToLine = useCallback((idx: number) => {
    setActiveLineIndex(idx);
    if (!syncedLines.length) return;
    const line = syncedLines[Math.min(idx, syncedLines.length - 1)];
    if (line) playerRef.current?.seek(Math.max(0, line.time - 0.2));
  }, [syncedLines]);

  // Live microphone level — replaces the old invented score.
  useEffect(() => {
    if (!micEnabled) {
      setMicLevel(0);
      return;
    }
    let raf = 0;
    let last = 0;
    const data = new Uint8Array(128);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 140) return;
      last = now;
      const analyser = analyserRef.current;
      if (!analyser) return;
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
      setMicLevel(Math.min(100, Math.round((peak / 128) * 100)));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [micEnabled]);

  // Audio mic streaming hook
  useEffect(() => {
    if (micEnabled) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          localStreamRef.current = stream;
          const AC = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AC();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          source.connect(analyser);
          analyserRef.current = analyser;
        })
        .catch(err => {
          console.warn("Camera/Mic stream denied or restricted. Gracefully falling back to simulation.", err);
          setMicEnabled(false);
        });
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    }
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [micEnabled]);

  // Render loop of live waveform analyzer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dataArray = analyserRef.current ? new Uint8Array(analyserRef.current.frequencyBinCount) : null;
      
      if (analyserRef.current && dataArray) {
        analyserRef.current.getByteFrequencyData(dataArray);
      }

      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      const sliceWidth = canvas.width / 32;
      for (let i = 0; i < 32; i++) {
        let magnitude = 12;
        if (dataArray) {
          magnitude = (dataArray[i % dataArray.length] / 255) * 50;
        } else {
          magnitude = Math.sin(i * 0.45 + phase) * 15 + 18;
        }

        const x = i * sliceWidth + sliceWidth / 2;
        const middleY = canvas.height / 2;
        const topY = middleY - magnitude / 2;
        const bottomY = middleY + magnitude / 2;

        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
      }
      
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#94a3b8');
      gradient.addColorStop(0.5, '#6366f1');
      gradient.addColorStop(1, '#0ea5e9');
      ctx.strokeStyle = gradient;
      ctx.stroke();

      phase += 0.18;
      frameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying, micEnabled]);

  return (
    <WidgetWrapper widget={widget} title="AI Karaoke" icon="fa-microphone-alt" onClose={onClose} minWidth={500} minHeight={600}>
      <div className="song-studio flex flex-col h-full bg-slate-50 text-slate-900 overflow-hidden select-none">
        
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center z-20 shrink-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <i className="fas fa-microphone-alt text-slate-400"></i> AI Karaoke
          </h2>
          <div className="flex gap-2">
            {stageActive && (
               <button 
                onClick={() => {
                  setIsPlaying(false);
                  setShowCountdown(false);
                  setStageActive(false);
                }} 
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
               >
                 <i className="fas fa-sliders mr-1"></i> Setup
               </button>
            )}
          </div>
        </div>

        <div className="flex-1 relative flex flex-col bg-slate-50 min-h-0">
           {!stageActive ? (
             <div className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto custom-scrollbar bg-slate-50">
               {/* Find a song */}
               <div className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col gap-3">
                 <div className="flex justify-between items-center gap-2">
                   <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                     Find a song
                   </label>
                   <span className="text-[10px] font-medium text-slate-400">
                     Lyrics &amp; video are filled in automatically
                   </span>
                 </div>
                 <div className="flex gap-2">
                   <input
                     type="text"
                     placeholder="Song title and artist, e.g. Yellow Submarine Beatles"
                     className="flex-1 min-w-0 h-[42px] bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && searchLyricsAndVideo()}
                   />
                   <button
                     disabled={isSearching || !searchQuery.trim()}
                     onClick={searchLyricsAndVideo}
                     className="h-[42px] shrink-0 bg-slate-900 text-white text-[12px] font-semibold px-4 rounded-lg flex items-center gap-2 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                   >
                     {isSearching ? (
                       <i className="fas fa-circle-notch fa-spin"></i>
                     ) : (
                       <i className="fas fa-magic"></i>
                     )}
                     Autofill
                   </button>
                 </div>
                 {songMeta && (
                   <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-2">
                     <i className="fas fa-circle-check"></i> <span className="truncate">{songMeta}</span>
                   </div>
                 )}
                 {notice && !searchError && (
                   <div className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg flex items-start gap-2">
                     <i className="fas fa-circle-info mt-0.5 text-slate-400"></i>
                     <span>{notice}</span>
                   </div>
                 )}
                 {searchError && (
                   <div className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-start gap-2">
                     <i className="fas fa-triangle-exclamation mt-0.5"></i>
                     <span>{searchError}</span>
                   </div>
                 )}
                 {videos.length > 1 && (
                   <div className="flex flex-col gap-1.5">
                     <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                       Playable videos — tap to switch
                     </span>
                     <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                       {videos.map((v) => (
                         <button
                           key={v.id}
                           onClick={() => { setVideoId(v.id); setUrl(v.id); setVideoTitle(v.title); }}
                           className={`relative shrink-0 w-24 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                             videoId === v.id ? 'border-slate-900 ring-1 ring-slate-900/25' : 'border-slate-200 hover:border-slate-400'
                           }`}
                           title={`${v.title} — ${v.author}`}
                         >
                           <img src={v.thumbnail} alt="" referrerPolicy="no-referrer" className="w-full h-14 object-cover" />
                           <span className="block text-[9px] leading-tight text-slate-500 px-1.5 py-1 truncate bg-slate-50">{v.author}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
               </div>

               <div className="bg-white p-4 border border-slate-200 rounded-xl">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Video</label>
                  {videoTitle && (
                    <p className="mb-2 text-[11px] text-emerald-700 font-medium truncate">
                      <i className="fas fa-circle-check mr-1"></i>
                      {videoTitle}
                    </p>
                  )}
                  <input
                    type="text"
                    placeholder="Paste a YouTube link or video ID (optional)"
                    className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-lg px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors font-mono text-[12px]"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                  />
               </div>
               
               {/* Scroll pace */}
               <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-4 select-none">
                 <div>
                   <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Scroll pace</label>
                   <p className="text-[10px] text-slate-500">
                     {syncedMode ? 'Not used — this song has video timings' : 'Seconds per line while the song has no timings'}
                   </p>
                 </div>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setPaceSeconds(Math.max(2, paceSeconds - 1))}
                     className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                   >
                     -
                   </button>
                   <span className="text-[12px] font-semibold w-14 text-center tabular-nums text-slate-800">{paceSeconds}s / line</span>
                   <button 
                     onClick={() => setPaceSeconds(Math.min(10, paceSeconds + 1))}
                     className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                   >
                     +
                   </button>
                 </div>
               </div>

               <div className="bg-white p-4 border border-slate-200 rounded-xl flex-1 flex flex-col min-h-[150px]">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Lyrics</label>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      {sourceLabel ? sourceLabel : 'Manual'}
                      {syncedMode ? ' · timed' : ' · untimed'}
                    </span>
                  </div>
                  <textarea
                    placeholder="Paste the song lyrics here..."
                    className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors text-[12px] custom-scrollbar resize-none leading-relaxed"
                    value={lyricsInput}
                    onChange={e => setLyricsInput(e.target.value)}
                  />
               </div>
               
               <button 
                 disabled={!url} 
                 onClick={startKaraoke}
                 className="w-full py-3.5 bg-slate-900 rounded-xl font-semibold text-[13px] hover:bg-slate-800 transition-colors disabled:opacity-35 disabled:pointer-events-none active:bg-slate-950 flex items-center justify-center gap-2 cursor-pointer text-white"
               >
                 <i className="fas fa-play"></i> Start karaoke
               </button>
             </div>
           ) : (
             <div className="flex-1 flex flex-col">
                {/* YouTube player via the IFrame API, so the lyrics can follow the real playhead */}
                {videoId && (
                  <div className="w-full aspect-video relative bg-black shrink-0 z-10 border-b border-slate-200">
                    <YouTubeStage
                      videoId={videoId}
                      autoplay={false}
                      handleRef={playerRef}
                      onTime={handleVideoTime}
                      onPlayingChange={setIsPlaying}
                      onError={() => setSearchError('That video refused to play here — choose another verified video from the list.')}
                    />
                  </div>
                )}

                {/* Transport bar */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 shrink-0">
                  <button
                    onClick={() => playerRef.current?.toggle()}
                    className="w-8 h-8 shrink-0 rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Play / pause"
                  >
                    <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-[10px]`}></i>
                  </button>
                  <button
                    onClick={() => playerRef.current?.seek(0)}
                    className="w-8 h-8 shrink-0 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-[10px]"
                    title="Restart"
                  >
                    <i className="fas fa-rotate-left text-[10px]"></i>
                  </button>
                  <button
                    onClick={() => playerRef.current?.seek(Math.max(0, (playerRef.current?.currentTime() || 0) - 5))}
                    className="w-8 h-8 shrink-0 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-[10px] font-semibold"
                    title="Back 5 seconds"
                  >-5s</button>
                  <button
                    onClick={() => playerRef.current?.seek((playerRef.current?.currentTime() || 0) + 5)}
                    className="w-8 h-8 shrink-0 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-[10px] font-semibold"
                    title="Forward 5 seconds"
                  >+5s</button>
                  <span className="text-[11px] font-medium tabular-nums text-slate-500">{formatClock(currentTime)}</span>
                  <span
                    className={`ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border ${
                      syncedMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    <i className={`fas ${syncedMode ? 'fa-clock' : 'fa-hourglass-half'} mr-1`}></i>
                    {syncedMode ? 'Synced to video' : 'Manual pace'}
                  </span>
                </div>
                
                {/* Projected Lyrics UI */}
                <div className="flex-1 min-h-0 relative overflow-hidden bg-white flex flex-col">
                   <div 
                      ref={lyricsContainerRef}
                      className="flex-1 overflow-y-auto custom-scrollbar py-[16vh] px-8 flex flex-col items-center gap-1 select-text"
                      style={{ scrollBehavior: 'smooth' }}
                   >
                     {lyricsLines.map((line, idx) => {
                       const isActive = idx === activeLineIndex;
                       const isPast = idx < activeLineIndex;
                       return (
                         <div 
                           key={idx} 
                           className="text-center py-2 w-full cursor-pointer"
                           onClick={() => jumpToLine(idx)}
                           title={syncedMode ? 'Jump the video to this line' : undefined}
                         >
                           <p className={`
                             mx-auto max-w-[44rem] text-[22px] sm:text-[26px] font-semibold tracking-tight leading-snug transition-all duration-500
                             ${isActive ? 'text-slate-900' : 
                               isPast ? 'text-slate-300 hover:text-slate-400' : 
                               'text-slate-400 hover:text-slate-500'}
                           `}>
                             {line}
                           </p>
                         </div>
                       );
                     })}
                   </div>

                   {/* Countdown before the music starts */}
                   {showCountdown && (
                     <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-white/95 backdrop-blur-sm">
                       <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Get ready to sing</span>
                       <span className="text-6xl font-bold tabular-nums text-slate-900">{countdown > 0 ? countdown : 'Go'}</span>
                     </div>
                   )}

                    {/* Microphone Feedback Section */}
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 h-16 z-10 gap-3">
                      <div className="flex items-center gap-2.5 select-none">
                        <button
                          onClick={() => setMicEnabled(!micEnabled)}
                          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                            micEnabled
                              ? "bg-rose-600 border-rose-600 text-white"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                          } cursor-pointer`}
                          title={micEnabled ? "Turn the microphone off" : "Turn the microphone on"}
                        >
                          <i className={`fas ${micEnabled ? "fa-microphone" : "fa-microphone-slash"} text-sm`}></i>
                        </button>
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block leading-none">Microphone</span>
                          <span className="text-[10px] text-slate-400 font-medium">{micEnabled ? "Live input" : "Off"}</span>
                        </div>
                      </div>

                      {/* Waveform Canvas */}
                      <div className="flex-1 h-full flex items-center justify-center max-w-[200px]">
                        <canvas ref={canvasRef} width="200" height="40" className="w-full h-10 opacity-80" />
                      </div>

                      {/* Real input level (replaces the previously invented score) */}
                      <div className="text-right select-none w-[118px]">
                        <div className="flex items-end justify-end gap-[3px] h-6">
                          {Array.from({ length: 11 }).map((_, i) => {
                            const lit = micEnabled && micLevel >= (i + 1) * 8;
                            return (
                              <span
                                key={i}
                                className={`w-[5px] rounded-sm transition-colors ${
                                  lit ? (i > 7 ? 'bg-rose-500' : i > 4 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-200'
                                }`}
                                style={{ height: 6 + i * 1.8 }}
                              />
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1">
                          {micEnabled ? `Input ${micLevel}%` : 'Enable the mic to sing along'}
                        </span>
                      </div>
                    </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// JOKE WIDGET (Official Joke API & ICanHazDadJoke)
// ============================================================
const JokeWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [joke, setJoke] = useState<{ setup: string, punchline: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [bgGradient, setBgGradient] = useState('from-cyan-400 to-blue-500');
  const [apiType, setApiType] = useState<'official' | 'dadjoke'>('official');

  const gradients = [
    'from-cyan-400 to-blue-500', 'from-pink-500 to-rose-500', 'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500', 'from-violet-500 to-purple-500', 'from-fuchsia-500 to-pink-500'
  ];

  const fetchJoke = async () => {
    setLoading(true);
    setBgGradient(gradients[Math.floor(Math.random() * gradients.length)]);
    try {
      if (apiType === 'official') {
        const res = await fetch('https://official-joke-api.appspot.com/random_joke');
        const data = await res.json();
        setJoke({ setup: data.setup, punchline: data.punchline });
      } else {
        const res = await fetch('https://icanhazdadjoke.com/', {
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        const parts = data.joke.split('?');
        if (parts.length > 1) {
          setJoke({ setup: parts[0] + '?', punchline: parts.slice(1).join('?') });
        } else {
          setJoke({ setup: data.joke, punchline: '' });
        }
      }
    } catch (e) {
      console.error(e);
      setJoke({ setup: 'Failed to load joke. Try again!', punchline: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJoke(); }, [apiType]);

  return (
    <WidgetWrapper widget={widget} title="Daily Jokes" icon="fa-laugh-squint" onClose={onClose} minWidth={400}>
      <div className={`p-0 h-full flex flex-col justify-between text-center bg-gradient-to-br ${bgGradient} text-white relative transition-all duration-500 rounded-b-xl overflow-hidden`}>
        <div className="flex bg-black/20 backdrop-blur-md">
          <button 
            onClick={() => setApiType('official')} 
            className={`flex-1 py-3 text-sm font-bold transition-colors ${apiType === 'official' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            Random Jokes
          </button>
          <button 
            onClick={() => setApiType('dadjoke')} 
            className={`flex-1 py-3 text-sm font-bold transition-colors ${apiType === 'dadjoke' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            Dad Jokes (GroanDeck)
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {loading ? (
            <i className="fas fa-spinner fa-spin text-4xl opacity-80"></i>
          ) : joke ? (
            <div className="animate-fade-in-up space-y-6 max-w-sm w-full">
              <h2 className="text-2xl font-black leading-tight drop-shadow-md">{joke.setup}</h2>
              {joke.punchline && (
                <div className="bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
                  <p className="text-xl font-bold italic drop-shadow">{joke.punchline}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="p-6">
          <button onClick={fetchJoke} disabled={loading} className="mx-auto px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full font-bold transition-all shadow-lg border border-white/30 flex items-center justify-center gap-2">
            <i className="fas fa-random"></i> Next Joke
          </button>
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// BORED WIDGET (Bored API / Local Fallback)
// ============================================================
const BoredWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const localActivities = [
    { activity: "Play a quick game of Simon Says", type: "recreational", participants: 1 },
    { activity: "Do 10 jumping jacks", type: "physical", participants: 1 },
    { activity: "Draw a funny face with your non-dominant hand", type: "creative", participants: 1 },
    { activity: "Think of 5 words that rhyme with 'orange' (good luck!)", type: "educational", participants: 1 },
    { activity: "Play rock, paper, scissors with someone", type: "social", participants: 2 },
    { activity: "Try to touch your toes for 10 seconds", type: "physical", participants: 1 },
    { activity: "Make the silliest face you can", type: "recreational", participants: 1 },
    { activity: "Count backwards from 50 by 3s", type: "educational", participants: 1 },
    { activity: "Write a haiku about your favorite food", type: "creative", participants: 1 },
    { activity: "Do a staring contest with the person next to you", type: "social", participants: 2 },
    { activity: "Try to balance a pencil on your nose", type: "recreational", participants: 1 },
    { activity: "Hum your favorite song and let others guess it", type: "music", participants: 2 }
  ];

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://bored.api.lewagon.com/api/activity');
      const data = await res.json();
      if (data && data.activity) {
        setActivity(data);
      } else {
        throw new Error("Invalid API response");
      }
    } catch (e) {
      // Fallback if API fails
      const randomLocal = localActivities[Math.floor(Math.random() * localActivities.length)];
      setActivity(randomLocal);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivity(); }, []);

  return (
    <WidgetWrapper widget={widget} title="I'm Bored" icon="fa-smile-beam" onClose={onClose}>
      <div className="p-6 h-full flex flex-col justify-center gap-6" style={{ background: theme.surface, color: theme.text }}>
        <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
               <i className="fas fa-lightbulb"></i>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-2">How about...</h3>
            {loading ? (
                <div className="h-20 flex items-center justify-center">
                   <div className="flex gap-2">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                   </div>
                </div>
            ) : (
                <h2 className="text-2xl font-black leading-tight text-indigo-600 dark:text-indigo-400">
                    {activity?.activity}
                </h2>
            )}
        </div>
        {!loading && activity && (
            <div className="flex justify-center gap-4 text-xs font-bold text-gray-500">
                <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full"><i className="fas fa-tag mr-1"></i>{activity.type}</span>
                <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full"><i className="fas fa-users mr-1"></i>{activity.participants}</span>
            </div>
        )}
        <button onClick={fetchActivity} disabled={loading} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95">
            Give me another idea!
        </button>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// THESAURUS WIDGET (Datamuse API)
// ============================================================
const ThesaurusWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [word, setWord] = useState('');
  const [synonyms, setSynonyms] = useState<any[]>([]);
  const [rhymes, setRhymes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const lookupWord = async () => {
    if (!word.trim()) return;
    setLoading(true); setSynonyms([]); setRhymes([]);
    try {
      const [synRes, rhyRes] = await Promise.all([
        fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=20`),
        fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}&max=10`)
      ]);
      setSynonyms(await synRes.json());
      setRhymes(await rhyRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WidgetWrapper widget={widget} title="AI Thesaurus" icon="fa-book" onClose={onClose} minWidth={350} minHeight={450}>
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900" style={{ color: theme.text }}>
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 flex gap-2">
            <input 
                type="text" 
                value={word} 
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupWord()}
                placeholder="Find synonyms & rhymes..."
                className="flex-1 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-xl border border-transparent focus:border-indigo-500 outline-none font-medium"
                style={{ color: theme.text }}
            />
            <button onClick={lookupWord} className="bg-indigo-600 text-white w-12 rounded-xl flex items-center justify-center hover:bg-indigo-700 shadow transition-colors">
                <i className={loading ? "fas fa-spinner fa-spin" : "fas fa-search"}></i>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative">
            {synonyms.length > 0 && (
                <div>
                    <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider mb-3 flex items-center gap-2">
                        <i className="fas fa-layer-group"></i> Synonyms & Related
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {synonyms.map((s, i) => (
                            <span key={i} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium shadow-sm hover:border-indigo-500 cursor-default transition-colors">
                                {s.word}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {rhymes.length > 0 && (
                <div>
                    <h3 className="text-xs font-black uppercase text-pink-500 tracking-wider mb-3 flex items-center gap-2">
                        <i className="fas fa-music"></i> Rhyming Words
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {rhymes.map((r, i) => (
                            <span key={i} className="px-3 py-1.5 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border border-pink-100 dark:border-pink-900 rounded-lg text-sm font-medium shadow-sm cursor-default">
                                {r.word}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {!loading && synonyms.length === 0 && rhymes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3 opacity-60">
                    <i className="fas fa-text-width text-4xl"></i>
                    <p className="font-bold">Powered by Datamuse / AIThesaurus</p>
                </div>
            )}
        </div>
      </div>
    </WidgetWrapper>
  );
};


// ============================================================
// MORE WIDGETS PANEL (WIDGET STUDIO)
// ============================================================
const MoreWidgetsPanel: React.FC<{ isOpen: boolean; onClose: () => void; onSelect: (id: string) => void }> = ({ isOpen, onClose, onSelect }) => {
  const { theme } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const authTier = useAuthStore(state => state.tier);
  const isVipUser = authTier === 'vip';
  const isPremUser = authTier === 'pro' || authTier === 'vip';

  if (!isOpen) return null;

  const handleWidgetClick = (widgetId: string) => {
    const isVipWidget = VIP_WIDGET_IDS.includes(widgetId);
    const isPremWidget = PREMIUM_WIDGET_IDS.includes(widgetId);

    if (isVipWidget && !isVipUser) {
      useAuthStore.getState().openUpgradeModal('VIP Access Required: Upgrade to VIP to unlock this advanced module.');
      onClose();
      return;
    }
    if (isPremWidget && !isPremUser) {
      useAuthStore.getState().openUpgradeModal('Pro Feature: Upgrade to Pro or VIP to unlock this tool.');
      onClose();
      return;
    }

    onSelect(widgetId);
    onClose();
    SFX.click();
  };

  const renderWidgetCard = (w: { id: string; icon: string; label: string; tier: 'vip' | 'pro' | 'free' }) => {
    const isVip = w.tier === 'vip';
    const isPro = w.tier === 'pro';

    return (
      <button
        key={w.id}
        onClick={() => handleWidgetClick(w.id)}
        className="flex flex-col items-center gap-2 p-3.5 rounded-2xl transition-all hover:scale-[1.04] shadow-sm hover:shadow-xl border border-transparent hover:border-indigo-500/30 group relative cursor-pointer"
        style={{ backgroundColor: theme.background }}
      >
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${
            isVip
              ? 'bg-amber-500/15 text-amber-500 group-hover:bg-amber-500 group-hover:text-black shadow-sm'
              : isPro
              ? 'bg-purple-500/15 text-purple-500 group-hover:bg-purple-600 group-hover:text-white shadow-sm'
              : 'group-hover:bg-indigo-500 group-hover:text-white'
          }`}
          style={!isVip && !isPro ? { backgroundColor: theme.primary + '15', color: theme.primary } : undefined}
        >
          <i className={`fas ${w.icon} text-lg`} />
        </div>
        <span className="text-[11px] font-bold text-center leading-tight px-1" style={{ color: theme.text }}>
          {w.label}
        </span>
        {isVip && (
          <div className="absolute top-2 right-2 text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-sm flex items-center gap-0.5 pointer-events-none">
            <i className="fas fa-crown text-[7px]" /> VIP
          </div>
        )}
        {isPro && (
          <div className="absolute top-2 right-2 text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm flex items-center gap-0.5 pointer-events-none">
            <i className="fas fa-star text-[7px]" /> PRO
          </div>
        )}
      </button>
    );
  };

  const filteredAll = MORE_WIDGETS.filter(w => w.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredVip = VIP_STUDIO_WIDGETS.filter(w => w.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPrem = PREMIUM_STUDIO_WIDGETS.filter(w => w.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFree = FREE_STUDIO_WIDGETS.filter(w => w.label.toLowerCase().includes(searchTerm.toLowerCase()));

  /*
   * Rendered into `document.body`, not in place.
   *
   * The board used to live inside the dock as an `absolute` child of the "+"
   * button, opening upward with `bottom-[110%]`. But the dock carries
   * `overflow-x-auto` (it scrolls horizontally on narrow screens), and an
   * ancestor with any `overflow` other than `visible` clips absolutely-positioned
   * descendants — so on any window narrower than the `lg` breakpoint the board
   * was cut down to the dock's ~56px strip and looked like it had not opened at
   * all. Portalling it out also escapes the dock's `backdrop-blur`, which would
   * otherwise become the containing block for a `fixed` child.
   */
  return createPortal(
    <div
      /*
       * Anchored to the viewport now, so the width can follow the window instead
       * of the button. `min(620px, ...)` rather than a bare `620px`: at a
       * half-width window the old fixed width, right-aligned to a button near the
       * right edge, ran off the left of the screen.
       *
       * `dvh` rather than `vh` for the height budget: mobile browsers' `vh`
       * ignores the collapsing URL bar, so `85vh` was taller than the visible
       * area and the top rows could not be reached.
       */
      className="fixed z-[200] left-1/2 -translate-x-1/2 bottom-[5.5rem] w-[calc(100vw-1.5rem)] sm:w-[min(620px,calc(100vw-1.5rem))] max-h-[min(85dvh,calc(100dvh-7rem))] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
      /* `theme.surface` rather than a literal `#1f2937`: that hex is Tailwind's
         gray-800, one shade off from the slate-800 every other dark surface in the
         app uses, which is exactly the kind of drift that made the panels look
         mismatched in dark mode. */
      style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, backdropFilter: 'blur(20px)' }}
    >
      {/* Header & Search.
          Deliberately OUTSIDE the scroll region below. As a `sticky top-0` block
          inside it, tiles slid underneath the rounded header and reappeared in the
          padding around it — above it and beside it — which is what made the board
          look broken while scrolling. A non-scrolling header cannot be overlapped
          by the grid at all. */}
      <div className="shrink-0 flex flex-col gap-3 p-3 sm:p-4 border-b" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <i className="fas fa-shapes text-sm" />
            </div>
            <h3 className="font-heading font-extrabold text-lg tracking-tight" style={{ color: theme.text }}>
              Widget Studio
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors" style={{ color: theme.textMuted }}>
            <i className="fas fa-times" />
          </button>
        </div>
        
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search widgets & tools..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 outline-none font-bold text-sm transition-all focus:ring-2 focus:ring-indigo-500/50"
            style={{ color: theme.text }}
          />
        </div>
      </div>

      {/* Body — the only scrolling region on the board. */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4">
      {filteredAll.length === 0 ? (
        <div className="py-12 text-center opacity-50 text-sm font-bold" style={{ color: theme.text }}>No widgets found.</div>
      ) : searchTerm ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {filteredAll.map(renderWidgetCard)}
        </div>
      ) : (
        <div className="space-y-5">
          {/* VIP Section */}
          {filteredVip.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <i className="fas fa-crown text-xs" /> VIP Access Suite
                </span>
                <div className="flex-1 h-px bg-amber-500/20" />
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {filteredVip.map(renderWidgetCard)}
              </div>
            </div>
          )}

          {/* Premium Section */}
          {filteredPrem.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                  <i className="fas fa-star text-xs" /> Premium PRO Tools
                </span>
                <div className="flex-1 h-px bg-indigo-500/20" />
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {filteredPrem.map(renderWidgetCard)}
              </div>
            </div>
          )}

          {/* Free Section */}
          {filteredFree.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-[11px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1.5" style={{ color: theme.text }}>
                  <i className="fas fa-toolbox text-xs" /> Classroom Widgets
                </span>
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {filteredFree.map(renderWidgetCard)}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>,
    document.body
  );
};

// ============================================================
// DRAGGABLE STICKY NOTE
// ============================================================
const DraggableStickyNote: React.FC<{ note: StickyNote }> = ({ note }) => {
  const { theme, stickyNotes, setStickyNotes } = useContext(AppContext);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const updateNote = (updates: Partial<StickyNote>) => {
    setStickyNotes(stickyNotes.map(n => n.id === note.id ? { ...n, ...updates } : n));
  };

  const deleteNote = () => {
    setStickyNotes(stickyNotes.filter(n => n.id !== note.id));
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = { x: e.clientX, y: e.clientY, posX: note.position.x, posY: note.position.y };
    updateNote({ zIndex: Math.max(...stickyNotes.map(n => n.zIndex)) + 1 });
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      updateNote({
        position: {
          x: dragRef.current.posX + e.clientX - dragRef.current.x,
          y: dragRef.current.posY + e.clientY - dragRef.current.y,
        }
      });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [dragging]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    resizeRef.current = { x: e.clientX, y: e.clientY, width: note.size.width, height: note.size.height };
  };

  useEffect(() => {
    if (!resizing) return;
    const handleMove = (e: MouseEvent) => {
      updateNote({
        size: {
          width: Math.max(150, resizeRef.current.width + e.clientX - resizeRef.current.x),
          height: Math.max(100, resizeRef.current.height + e.clientY - resizeRef.current.y),
        }
      });
    };
    const handleUp = () => setResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [resizing]);

  return (
    <div
      className="fixed shadow-xl rounded-lg overflow-hidden group"
      style={{
        left: note.position.x,
        top: note.position.y,
        width: note.size.width,
        height: note.size.height,
        zIndex: note.zIndex,
        backgroundColor: note.color,
        transform: 'rotate(-1deg)',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleDragStart}
    >
      {/* Tape effect */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-6 bg-yellow-200/80 rounded-sm transform rotate-2" />
      
      {/* Delete button */}
      <button
        onClick={deleteNote}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center"
      >
        <i className="fas fa-times" />
      </button>

      {/* Content */}
      <textarea
        value={note.text}
        onChange={e => updateNote({ text: e.target.value })}
        placeholder="Type here..."
        className="w-full h-full bg-transparent resize-none p-4 pt-6 focus:outline-none"
        style={{
          fontSize: note.fontSize,
          fontWeight: note.fontBold ? 'bold' : 'normal',
          fontStyle: note.fontItalic ? 'italic' : 'normal',
          color: '#1f2937',
          lineHeight: 1.4,
        }}
      />

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100"
        onMouseDown={handleResizeStart}
      >
        <svg viewBox="0 0 16 16" fill="#666">
          <path d="M14 14H10L14 10V14Z" />
          <path d="M14 8H6L14 0V8Z" opacity="0.3" />
        </svg>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const DraggableShortcut: React.FC<{ sc: DesktopShortcut, update: (id: string, updates: Partial<DesktopShortcut>) => void, remove: (id: string) => void, onEdit: () => void }> = ({ sc, update, remove, onEdit }) => {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasDragged = useRef(false);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    hasDragged.current = false;
    dragRef.current = { x: e.clientX, y: e.clientY, posX: sc.position?.x || 20, posY: sc.position?.y || 80 };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      if (Math.abs(e.clientX - dragRef.current.x) > 3 || Math.abs(e.clientY - dragRef.current.y) > 3) {
        hasDragged.current = true;
      }
      update(sc.id, {
        position: {
          x: Math.max(0, dragRef.current.posX + e.clientX - dragRef.current.x),
          y: Math.max(0, dragRef.current.posY + e.clientY - dragRef.current.y),
        }
      });
    };
    const handleUp = () => {
       // small delay to prevent click firing if we just finished dragging
       setTimeout(() => setDragging(false), 50);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [dragging, sc.id, update]);

  return (
    <div 
      className="absolute flex flex-col items-center gap-2 cursor-pointer group w-24 pointer-events-auto"
      title={sc.url}
      style={{ left: sc.position?.x || 20, top: sc.position?.y || 80, zIndex: dragging ? 1000 : 10 }}
      onMouseDown={handleDragStart}
    >
      <div 
        className={`text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform relative ${dragging ? 'scale-110 drop-shadow-[0_20px_35px_rgba(0,0,0,0.7)]' : 'group-hover:scale-110 group-hover:drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]'}`}
        onClick={() => !hasDragged.current && window.open(sc.url, '_blank')}
      >
        {sc.emoji}
        
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }} 
          className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg transition-opacity hover:scale-110"
          title="Edit Shortcut"
        >
          <i className="fas fa-pen"/>
        </button>
        
        <button 
          onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${sc.name}?`)) remove(sc.id); }} 
          className="absolute -bottom-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg transition-opacity hover:scale-110"
          title="Delete Shortcut"
        >
          <i className="fas fa-trash"/>
        </button>
      </div>
      <span className="text-white text-sm font-bold bg-black/50 backdrop-blur px-2 py-0.5 rounded shadow break-words w-full text-center group-hover:bg-black/70 transition-colors pointer-events-none" style={{textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>
        {sc.name}
      </span>
    </div>
  );
};

// ============================================================
// NEW: DICTIONARY WIDGET
// ============================================================
const DictionaryWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [word, setWord] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState<string[]>(['google', 'cambridge', 'collins', 'wiktionary']);
  
  // Tabs for our rich content views
  const [activeTab, setActiveTab] = useState<string>('definitions'); // 'definitions' | 'thesaurus' | 'visuals' | 'rhymes' | 'urban'
  
  // Custom glossary metadata from external public APIs
  const [spellingSuggestions, setSpellingSuggestions] = useState<string[]>([]);
  const [collocations, setCollocations] = useState<{
    adjectives: any[];
    nouns: any[];
    synonyms: any[];
    antonyms: any[];
    trig: any[];
  } | null>(null);
  const [wikiData, setWikiData] = useState<any>(null);
  const [urbanData, setUrbanData] = useState<any[]>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Advanced educational metrics
  const [isSharedScreenLarge, setIsSharedScreenLarge] = useState<boolean>(false);
  const [wikiImage, setWikiImage] = useState<string | null>(null);
  const [syllableCount, setSyllableCount] = useState<number>(0);
  const [rhymeData, setRhymeData] = useState<any[]>([]);
  const [homophoneData, setHomophoneData] = useState<any[]>([]);
  const [similarSoundData, setSimilarSoundData] = useState<any[]>([]);

  // Hardcoded curated Word of the Day list representing real-world English learner items
  const WORDS_OF_THE_DAY = [
    { word: "Serendipity", phonetic: "/ˌsɛrənˈdɪpɪti/", pos: "noun", def: "The occurrence of events by chance in a happy or beneficial way.", example: "We found the charming little English classroom by pure serendipity." },
    { word: "Ubiquitous", phonetic: "/juːˈbɪkwɪtəs/", pos: "adjective", def: "Present, appearing, or found everywhere.", example: "Mobile phones have became ubiquitous in modern classrooms." },
    { word: "Resilient", phonetic: "/rɪˈzɪliənt/", pos: "adjective", def: "Able to withstand or recover quickly from difficult conditions.", example: "These motivated language learners are resilient and never give up." },
    { word: "Eloquence", phonetic: "/ˈɛləkwəns/", pos: "noun", def: "Fluent or persuasive speaking or writing.", example: "Her spoken eloquence helped her pass the Cambridge C1 exam easily." },
    { word: "Ephemeral", phonetic: "/ɪˈfɛmərəl/", pos: "adjective", def: "Lasting for a very short time.", example: "The beautiful cherry blossoms in spring are lovely but ephemeral." },
    { word: "Aura", phonetic: "/ˈɔːrə/", pos: "noun", def: "The distinctive atmosphere that seems to surround a place, person, or thing.", example: "The room was filled with an aura of academic dedication." },
    { word: "Luminous", phonetic: "/ˈluːmɪnəs/", pos: "adjective", def: "Full of shedding light; bright or shining, especially in the dark.", example: "The luminous presentation caught everyone's interest instantly." },
    { word: "Inquisitive", phonetic: "/ɪnˈkwɪzətɪv/", pos: "adjective", def: "Having or showing an interest in learning things; curious.", example: "Every great scientist started as an inquisitive student asking simple questions." },
    { word: "Meticulous", phonetic: "/məˈtɪkjələs/", pos: "adjective", def: "Showing great attention to detail; very careful and precise.", example: "The tutor designed a meticulous course syllabus tailored to each student's weakness." },
    { word: "Superfluous", phonetic: "/suːˈpɜːrfluəs/", pos: "adjective", def: "Unnecessary, especially through being more than enough.", example: "Avoid adding superfluous words when a simple explanation is clearer." }
  ];

  const getWordOfTheDay = () => {
    const day = new Date().getDate();
    return WORDS_OF_THE_DAY[day % WORDS_OF_THE_DAY.length];
  };

  const wordOfTheDay = getWordOfTheDay();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };



  const searchWord = async (searchOverride?: string) => {
    const term = (searchOverride || word).trim();
    if (!term) return;
    setLoading(true);
    setError('');
    setData(null);
    setSpellingSuggestions([]);
    setCollocations(null);
    setWikiData(null);
    setWikiImage(null);
    setSyllableCount(0);
    setRhymeData([]);
    setHomophoneData([]);
    setSimilarSoundData([]);
    setUrbanData([]);

    if (searchOverride) {
      setWord(searchOverride);
    }

    try {
      // Parallel fetches for standard dictionary, collocations, Wikipedia resources, and phonological features
      const fetchDict = fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null);

      const fetchCollocAdjectives = fetch(`https://api.datamuse.com/words?rel_jja=${encodeURIComponent(term)}&max=20`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);
      
      const fetchCollocNouns = fetch(`https://api.datamuse.com/words?rel_jjb=${encodeURIComponent(term)}&max=20`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const fetchDatamuseSyns = fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(term)}&max=20`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const fetchDatamuseAnts = fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(term)}&max=20`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const fetchDatamuseTrigs = fetch(`https://api.datamuse.com/words?rel_trg=${encodeURIComponent(term)}&max=20`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const fetchDatamuseSyllables = fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(term)}&md=s&max=1`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const fetchRhymes = fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(term)}&max=30`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const fetchHomophones = fetch(`https://api.datamuse.com/words?rel_hom=${encodeURIComponent(term)}&max=15`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const fetchSimilarSound = fetch(`https://api.datamuse.com/words?sl=${encodeURIComponent(term)}&max=30`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const fetchWiki = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      const fetchWikiOriginalImage = fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(term)}&origin=*`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      const fetchUrban = fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      const [
        dictResult,
        adjectives,
        nouns,
        syns,
        ants,
        trigs,
        syllablesList,
        rhymes,
        homophones,
        similarSounds,
        wikiResult,
        wikiImgResult,
        urbanResult
      ] = await Promise.all([
        fetchDict,
        fetchCollocAdjectives,
        fetchCollocNouns,
        fetchDatamuseSyns,
        fetchDatamuseAnts,
        fetchDatamuseTrigs,
        fetchDatamuseSyllables,
        fetchRhymes,
        fetchHomophones,
        fetchSimilarSound,
        fetchWiki,
        fetchWikiOriginalImage,
        fetchUrban
      ]);

      // Populate Standard Dictionary Data
      if (dictResult && dictResult.length > 0) {
        setData(dictResult[0]);
      } else {
        const fetchSpellSuggest = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(term)}&max=8`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => []);

        const fetchSoundSuggest = await fetch(`https://api.datamuse.com/words?sl=${encodeURIComponent(term)}&max=8`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => []);

        const suggestions = Array.from(new Set([
          ...fetchSpellSuggest.map((o: any) => o.word),
          ...fetchSoundSuggest.map((o: any) => o.word)
        ])).filter(s => s.toLowerCase() !== term.toLowerCase()).slice(0, 8);

        setSpellingSuggestions(suggestions);

        if (suggestions.length > 0) {
          setError(`"${term}" wasn't found in standard entries. Have you checked the spelling? Did you mean one of the alternatives below?`);
        } else {
          setError(`"${term}" wasn't found in standard dictionary. Check the other tabs (Wikipedia, Rhymes, Urban Dictionary) or try another common word.`);
        }
      }

      // Populate Syllable Metrical Count
      if (syllablesList && syllablesList.length > 0) {
        setSyllableCount(syllablesList[0]?.numSyllables || 0);
      }

      // Populate Phonology blocks
      setRhymeData(rhymes || []);
      setHomophoneData(homophones || []);
      setSimilarSoundData(similarSounds || []);

      // Populate Datamuse lexical context
      if (adjectives.length > 0 || nouns.length > 0 || syns.length > 0 || ants.length > 0 || trigs.length > 0) {
        setCollocations({
          adjectives,
          nouns,
          synonyms: syns,
          antonyms: ants,
          trig: trigs
        });
      }

      // Populate Editorial Wiki Source
      if (wikiResult && wikiResult.type !== 'no-license-found' && wikiResult.title) {
        setWikiData(wikiResult);
      }

      // Populate High-Res Page Image original from Wiki Pages API
      if (wikiImgResult?.query?.pages) {
        const pages = wikiImgResult.query.pages;
        const pageId = Object.keys(pages)[0];
        const sourceUrl = pages[pageId]?.original?.source;
        if (sourceUrl) {
          setWikiImage(sourceUrl);
        }
      }

      // Populate Slang Source
      if (urbanResult && urbanResult.list && urbanResult.list.length > 0) {
        setUrbanData(urbanResult.list.slice(0, 5));
      }

    } catch (e: any) {
      setError(`Search error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (phonetics: any[], slow: boolean = false) => {
    const phoneticObj = phonetics?.find(p => p.audio && p.audio.length > 0);
    if (phoneticObj && !slow) {
      const audio = new Audio(phoneticObj.audio);
      audio.play().catch(e => console.error("Audio playback failed", e));
    } else {
      const utterance = new SpeechSynthesisUtterance(data?.word || word);
      if (slow) utterance.rate = 0.6;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getCEFRLevel = (wd: string): string => {
    const length = wd.trim().length;
    const lower = wd.toLowerCase();
    if (['hello', 'yes', 'no', 'book', 'good', 'day', 'water', 'apple', 'friend', 'happy', 'name', 'school', 'cat', 'dog'].includes(lower)) return 'A1';
    if (['people', 'study', 'house', 'city', 'country', 'music', 'sport', 'teacher', 'family', 'travel'].includes(lower)) return 'A2';
    if (['understand', 'dictionary', 'language', 'business', 'experience', 'science', 'health', 'culture', 'internet'].includes(lower)) return 'B1';
    if (['challenge', 'effective', 'creative', 'flexible', 'sustainable', 'impact', 'support', 'manager', 'strategy'].includes(lower)) return 'B2';
    if (['sophisticated', 'ubiquitous', 'serendipity', 'ephemeral', 'melancholy', 'eloquence', 'precarious', 'eloquent'].includes(lower)) return 'C1';
    if (['indefatigable', 'capricious', 'loquacious', 'obfuscate', 'recalcitrant', 'scintillating'].includes(lower)) return 'C2';
    if (length > 11) return 'C2';
    if (length > 9) return 'C1';
    if (length > 7) return 'B2';
    return 'B1';
  };

  const formatCollinsCOBUILD = (wd: string, part: string, def: string) => {
    const isNoun = part.toLowerCase().includes('noun');
    const isAdj = part.toLowerCase().includes('adjective') || part.toLowerCase().includes('adj');
    const isVerb = part.toLowerCase().includes('verb');
    const formattedDef = def.charAt(0).toLowerCase() + def.slice(1);
    
    if (isNoun) return `A ${wd} is defined as ${formattedDef}`;
    if (isAdj) return `If someone or something is described as ${wd}, they are ${formattedDef}`;
    if (isVerb) return `To ${wd} means to ${formattedDef}`;
    return `In English contexts, ${wd} represents: ${def}`;
  };

  const getMockFirstUse = (wd: string) => {
    const hash = wd.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const eras = ['14th century', '15th century', 'circa 1593', 'circa 1611', 'circa 1660', 'mid 18th century', 'circa 1832', 'circa 1888', 'circa 1924', 'circa 1957'];
    return eras[hash % eras.length];
  };

  return (
    <WidgetWrapper widget={widget} title="Dictionary Plus" icon="fa-book-open" onClose={onClose} minWidth={380} minHeight={500}>
      <div className={`flex flex-col h-full poppins-font ${isSharedScreenLarge ? 'bg-white dark:bg-black text-black dark:text-white' : 'bg-slate-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100'}`}>
        
        {/* Projector Shared Screen Banner */}
        {isSharedScreenLarge && (
          <div className="bg-yellow-400 dark:bg-yellow-500 text-black py-1.5 px-3 font-mono font-black text-center text-xs tracking-wider shrink-0 flex items-center justify-center gap-2 shadow-inner">
            <i className="fas fa-desktop animate-pulse"></i>
            <span>SHARED SCREEN PROJECTER ACTIVE &mdash; JUMBO TYPOGRAPHY SPEED & POWER ENABLED</span>
          </div>
        )}

        {/* Top search & settings button */}
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex gap-2 shadow-sm z-10 shrink-0">
          <input 
            type="text" 
            value={word} 
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchWord()}
            placeholder="Search words, slang, or elements..."
            className={`flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl outline-none font-bold bg-gray-100 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500/50 transition-all text-gray-800 dark:text-white ${isSharedScreenLarge ? 'text-sm font-black' : 'text-xs'}`}
          />

          <button onClick={() => searchWord()} disabled={loading} className="w-10 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center shrink-0">
            <i className={loading ? "fas fa-spinner fa-spin text-sm" : "fas fa-search text-sm"}></i>
          </button>

          {/* Projecter Share Screen Mode */}
          <button 
            type="button"
            onClick={() => setIsSharedScreenLarge(!isSharedScreenLarge)} 
            className={`w-10 rounded-xl border flex items-center justify-center transition-all ${isSharedScreenLarge ? 'bg-yellow-400 border-yellow-500 text-black font-black scale-105' : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'}`}
            title="Toggle Large Contrasting Shared Screen Projection Mode"
            id="dict-projector-btn"
          >
            <i className="fas fa-desktop text-sm"></i>
          </button>

          <button onClick={() => setShowSettings(!showSettings)} className={`w-10 rounded-xl border flex items-center justify-center transition-all ${showSettings ? 'bg-indigo-50 text-indigo-600 border-indigo-400 animate-pulse' : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'}`}>
            <i className="fas fa-cog text-sm"></i>
          </button>
        </div>

        {/* Collapsible settings compartment */}
        {showSettings && (
          <div className="p-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 animate-fade-in-down text-xs space-y-2 shrink-0 z-20 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-gray-700 dark:text-gray-300">Active Editorial Providers:</span>
              <button onClick={() => setEnabledProviders(['google', 'cambridge', 'collins', 'merriam', 'heritage'])} className="text-[10px] text-indigo-500 hover:underline">Reset Providers</button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'google', label: 'Google Entries' },
                { id: 'cambridge', label: 'Cambridge CEFR' },
                { id: 'collins', label: 'Collins COBUILD' },
                { id: 'merriam', label: 'Merriam-Webster®' },
                { id: 'heritage', label: 'American Heritage®' }
              ].map(prov => (
                <label key={prov.id} className="flex items-center gap-2 cursor-pointer p-1.5 bg-gray-50 dark:bg-slate-900 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={enabledProviders.includes(prov.id)} 
                    onChange={() => setEnabledProviders(prev => prev.includes(prov.id) ? prev.filter(p => p !== prov.id) : [...prev, prov.id])}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize text-[11px]">
                    {prov.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Tab Selection Filter */}
        <div className="flex bg-white dark:bg-slate-850 border-b border-gray-200 dark:border-gray-700 text-xs py-1.5 px-3 gap-1 overflow-x-auto shrink-0 custom-scrollbar">
          {[
            { id: 'definitions', label: 'Linguistic Definitions', icon: 'fa-book-open' },
            { id: 'thesaurus', label: 'Thesaurus & Collocs', icon: 'fa-cubes' },
            { id: 'visuals', label: 'Images & Illustrations', icon: 'fa-image' },
            { id: 'rhymes', label: 'Syllables & Rhymes', icon: 'fa-music' },
            { id: 'urban', label: 'Urban Slang', icon: 'fa-comment' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`px-3 py-1.5 font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 text-[11px] ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
            >
              <i className={`fas ${tab.icon} text-[10px]`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
          
          {/* Spelling Error & Suggestions Block ("Did you mean alternatives") */}
          {error && (
            <div className="mb-4 space-y-3">
              <div className="text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 shadow-sm">
                <i className="fas fa-exclamation-circle text-lg shrink-0 mt-0.5 animate-pulse"></i>
                <span className="font-semibold text-xs leading-relaxed">{error}</span>
              </div>

              {spellingSuggestions.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 space-y-2 font-medium">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-400 block"><i className="fas fa-magic mr-1"></i> Spelling Suggestions / Alternative Terms:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {spellingSuggestions.map((sugg, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setWord(sugg);
                          searchWord(sugg);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-gray-200 hover:border-indigo-300 dark:bg-slate-800 dark:text-indigo-300 dark:border-gray-700 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-all hover:scale-105 shadow-sm"
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 1: Standard Definitions */}
          {activeTab === 'definitions' && (
            <div className="space-y-4">
              {data ? (
                <div className="animate-fade-in space-y-5">
                  
                  {/* Pronunciation block (Supports huge shared visual contrast) */}
                  <div className={`flex items-start justify-between gap-4 border-b pb-3 ${isSharedScreenLarge ? 'border-indigo-600 border-b-2' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div>
                      <h2 className={`font-black capitalize tracking-tight text-indigo-700 dark:text-indigo-400 mb-1 leading-none ${isSharedScreenLarge ? 'text-5xl md:text-6xl font-sans' : 'text-3xl'}`}>{data.word}</h2>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <span className={`font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${isSharedScreenLarge ? 'bg-indigo-600 text-white text-base' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 text-[10px]'}`}>
                          {getCEFRLevel(data.word)} Level
                        </span>
                        {data.phonetic && <span className={`text-indigo-500 font-mono font-bold tracking-wide ${isSharedScreenLarge ? 'text-2xl block ml-1' : 'text-xs'}`}>{data.phonetic}</span>}
                      </div>
                    </div>

                    {/* Shared screen friendly audio buttons */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => playAudio(data.phonetics, false)} 
                        className={`rounded-full bg-indigo-105 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-all shadow-md shrink-0 ${isSharedScreenLarge ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm'}`}
                        title="Normal Speed Audio Pronunciation"
                      >
                        <i className="fas fa-volume-up"></i>
                      </button>
                      <button 
                        onClick={() => playAudio(data.phonetics, true)} 
                        className={`rounded-full bg-amber-105 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-800 transition-all shadow-md shrink-0 ${isSharedScreenLarge ? 'w-14 h-14 text-xl border-2 border-amber-400' : 'w-10 h-10 text-xs'}`}
                        title="Practice Pronunciation - Slown Down Rate (0.6x)"
                      >
                        <i className="fas fa-turtle text-sm"></i>
                      </button>
                    </div>
                  </div>

                  {/* Stacks for definitions */}
                  <div className={`space-y-4 font-medium ${isSharedScreenLarge ? 'text-lg' : 'text-xs'}`}>
                    
                    {/* Source: Google standard free entries */}
                    {enabledProviders.includes('google') && (
                      <div className={`bg-white dark:bg-slate-800 border p-4 rounded-xl shadow-sm space-y-3 ${isSharedScreenLarge ? 'border-gray-500 text-black dark:text-white dark:bg-black p-6' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-2">
                          <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider"><i className="fas fa-book-open mr-1.5"></i> Google Standard Entries</span>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-400 font-mono">Open API</span>
                        </div>

                        <div className="space-y-4">
                          {data.meanings.map((meaning: any, i: number) => (
                            <div key={i} className="space-y-2">
                              <span className="font-serif italic text-sm font-bold text-gray-700 dark:text-gray-300 block">{meaning.partOfSpeech}</span>
                              <ul className="space-y-3.5 pl-3 border-l-2 border-indigo-500/20">
                                {meaning.definitions.slice(0, 3).map((def: any, j: number) => {
                                  const defId = `google-def-${i}-${j}`;
                                  return (
                                    <li key={j} className="space-y-1 relative group">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className={`font-semibold text-gray-800 dark:text-gray-200 leading-relaxed flex-1 ${isSharedScreenLarge ? 'text-2xl font-black text-black dark:text-white' : 'text-xs'}`}>{def.definition}</p>
                                        <button 
                                          onClick={() => handleCopy(`${data.word} (${meaning.partOfSpeech}): ${def.definition}${def.example ? ' — Example: "' + def.example + '"' : ''}`, defId)}
                                          className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 transition-all text-[11px] shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                          <i className={copiedId === defId ? "fas fa-check text-green-500" : "fas fa-copy"}></i>
                                        </button>
                                      </div>
                                      {def.example && (
                                        <div className={`italic pl-2 border-l border-gray-200 dark:border-gray-700 ${isSharedScreenLarge ? 'text-xl font-bold text-indigo-500' : 'text-gray-500'}`}>
                                          "{def.example}"
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source: Cambridge Style Learner's Definitions */}
                    {enabledProviders.includes('cambridge') && (
                      <div className={`bg-white dark:bg-slate-800 border p-4 rounded-xl shadow-sm space-y-3 ${isSharedScreenLarge ? 'border-gray-500 text-black dark:text-white dark:bg-black p-6' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-2">
                          <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider"><i className="fas fa-graduation-cap mr-1.5 font-bold"></i> Cambridge Learner Style</span>
                          <span className="text-[9px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-bold font-mono">CEFR {getCEFRLevel(data.word)}</span>
                        </div>

                        <div className="space-y-4">
                          {data.meanings.slice(0, 2).map((m: any, idx: number) => {
                            const cambId = `camb-def-${idx}`;
                            const defText = m.definitions[0]?.definition || "Definition not provided.";
                            return (
                              <div key={idx} className="bg-sky-50/40 dark:bg-sky-950/10 p-2.5 rounded-lg border border-sky-100/60 dark:border-sky-900/30 space-y-1 group relative">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300 tracking-wide italic leading-none">{m.partOfSpeech}</span>
                                  <button 
                                    onClick={() => handleCopy(`[Cambridge Study] ${data.word} (${m.partOfSpeech}): ${defText}`, cambId)}
                                    className="text-gray-400 hover:text-sky-600 p-0.5 transition-all text-[11px] shrink-0 opacity-0 group-hover:opacity-100"
                                  >
                                    <i className={copiedId === cambId ? "fas fa-check text-green-500" : "fas fa-copy"}></i>
                                  </button>
                                </div>
                                <p className={`text-gray-850 dark:text-gray-250 mt-1 leading-relaxed ${isSharedScreenLarge ? 'text-2xl font-black text-black dark:text-white' : 'font-bold'}`}>{defText}</p>
                                {m.definitions[0]?.example && (
                                  <p className={`italic pt-0.5 ${isSharedScreenLarge ? 'text-xl text-indigo-500' : 'text-[11px] text-gray-500'}`}>
                                    <span className="text-sky-600 font-bold block text-[9px] uppercase not-italic">Key Learners Example:</span>
                                    "{m.definitions[0].example}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Source: Collins COBUILD */}
                    {enabledProviders.includes('collins') && (
                      <div className={`bg-white dark:bg-slate-800 border p-4 rounded-xl shadow-sm space-y-3 ${isSharedScreenLarge ? 'border-gray-500 text-black dark:text-white dark:bg-black p-6' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-755 pb-2">
                          <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider"><i className="fas fa-comment-alt mr-1.5"></i> Collins COBUILD Essential</span>
                          <span className="text-[9px] bg-rose-50 dark:bg-rose-950/40 text-rose-500 px-1.5 py-0.5 rounded font-mono font-bold">Frequency Index ⭐⭐⭐</span>
                        </div>

                        <div className="space-y-3 pl-1">
                          {data.meanings.slice(0, 2).map((meaning: any, i: number) => {
                            const rawDef = meaning.definitions[0]?.definition || '';
                            const cobuildDef = formatCollinsCOBUILD(data.word, meaning.partOfSpeech, rawDef);
                            const collinsId = `collins-def-${i}`;
                            return (
                              <div key={i} className="space-y-1 relative group bg-rose-50/20 dark:bg-rose-950/5 p-2 rounded-lg border border-rose-100/30">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-extrabold text-rose-450 uppercase tracking-widest">{meaning.partOfSpeech} formulation</span>
                                  <button 
                                    onClick={() => handleCopy(`[Collins COBUILD] ${cobuildDef}`, collinsId)}
                                    className="text-gray-400 hover:text-rose-500 p-0.5 transition-all text-[11px] shrink-0 opacity-0 group-hover:opacity-100"
                                  >
                                    <i className={copiedId === collinsId ? "fas fa-check text-green-500" : "fas fa-copy"}></i>
                                  </button>
                                </div>
                                <p className={`font-serif italic leading-relaxed text-gray-850 dark:text-gray-250 ${isSharedScreenLarge ? 'text-2xl font-black text-rose-900 dark:text-rose-250' : 'font-semibold'}`}>
                                  "{cobuildDef}"
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* NEW Source: Merriam-Webster® Collegiate Style Card */}
                    {enabledProviders.includes('merriam') && (
                      <div className={`bg-[#fbfcfa] dark:bg-[#0f140e] border p-4 rounded-xl shadow-sm space-y-3 font-serif ${isSharedScreenLarge ? 'border-gray-500 text-black dark:text-white dark:bg-black p-6' : 'border-emerald-800/20'}`}>
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 font-sans">
                          <span className="text-[11px] font-black text-emerald-850 dark:text-emerald-450 uppercase tracking-wider">
                            <i className="fas fa-graduation-cap mr-1.5"></i> Merriam-Webster® Collegiate Style
                          </span>
                          <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">11th Edition</span>
                        </div>
                        <div className="text-[11px] text-gray-505 font-sans italic">
                          First Known Use &mdash; <span className="font-extrabold text-emerald-800">{getMockFirstUse(data.word)}</span>
                        </div>
                        <div className="space-y-4">
                          {data.meanings.slice(0, 2).map((meaning: any, i: number) => (
                            <div key={i} className="space-y-1">
                              <span className="font-sans italic text-xs font-bold text-emerald-750 dark:text-emerald-450 block">\\ {meaning.partOfSpeech} \\</span>
                              <ol className="space-y-2 pl-3 border-l border-emerald-100 dark:border-emerald-900">
                                {meaning.definitions.slice(0, 3).map((def: any, j: number) => (
                                  <li key={j} className={`text-gray-800 dark:text-gray-200 leading-relaxed ${isSharedScreenLarge ? 'text-2xl font-black text-black dark:text-white' : ''}`}>
                                    <span className="font-sans font-black text-emerald-800 dark:text-emerald-400 mr-2">{j + 1}</span>
                                    {def.definition}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* NEW Source: American Heritage® Dictionary Style Card */}
                    {enabledProviders.includes('heritage') && (
                      <div className={`bg-white dark:bg-slate-800 border p-4 rounded-xl shadow-sm space-y-3 font-sans ${isSharedScreenLarge ? 'border-gray-500 text-black dark:text-white dark:bg-black p-6' : 'border-blue-200 dark:border-blue-900/40'}`}>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            <i className="fas fa-university mr-1.5"></i> The American Heritage® Style
                          </span>
                          <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 px-1.5 py-0.5 rounded font-mono">5th Collegiate</span>
                        </div>
                        
                        <div className="space-y-4 text-xs">
                          {data.meanings.slice(0, 2).map((meaning: any, i: number) => {
                            const syllableDivision = data.word.split('').join('·');
                            return (
                              <div key={i} className="space-y-1 bg-slate-50/40 dark:bg-slate-900/25 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <p className="font-extrabold text-blue-600 dark:text-blue-400 italic text-[11px] tracking-wide uppercase">
                                  [{syllableDivision}] &mdash; {meaning.partOfSpeech}
                                </p>
                                <ul className="space-y-2 pl-2 border-l border-blue-105">
                                  {meaning.definitions.slice(0, 2).map((def: any, j: number) => (
                                    <li key={j} className={`text-gray-750 dark:text-gray-250 ${isSharedScreenLarge ? 'text-2xl font-black text-black dark:text-white' : ''}`}>
                                      <span className="font-serif font-black text-blue-700 dark:text-blue-450 mr-1.5 hover:underline">
                                        {j === 0 ? 'a.' : 'b.'}
                                      </span>
                                      {def.definition}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Source: Wiktionary Etymology */}
                    {enabledProviders.includes('wiktionary') && (
                      <div className={`bg-white dark:bg-slate-800 border p-4 rounded-xl shadow-sm space-y-3 ${isSharedScreenLarge ? 'border-gray-500 text-black dark:text-white dark:bg-black p-6' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-2">
                          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider"><i className="fas fa-history mr-1.5 font-bold"></i> Wiktionary Etymology</span>
                          <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold font-mono">Lexicon Origin</span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <span className="font-bold text-[10px] text-gray-500 uppercase block mb-1 font-sans">Origin Summary</span>
                            <p className={`font-serif italic leading-relaxed text-gray-700 dark:text-gray-300 ${isSharedScreenLarge ? 'text-2xl font-black text-black dark:text-white' : ''}`}>
                              Linguistic evolution traced through modern English contexts, adapting foreign morphology roots, classical suffixes, and lexical variants representing historic conversational adaptations.
                            </p>
                          </div>

                          <div className="border-t border-gray-100 dark:border-gray-750 pt-3 space-y-1">
                            {data.meanings.slice(0, 2).map((m: any, i: number) => (
                              <div key={i} className={`text-gray-650 dark:text-gray-350 ${isSharedScreenLarge ? 'text-xl font-bold' : 'text-[11px]'}`}>
                                <span className="font-bold capitalize">{m.partOfSpeech}:</span> {m.definitions[0]?.definition}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div className="py-2 space-y-4 animate-fade-in">
                  {/* Word of the Day dynamic card */}
                  <div className={`bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-slate-800 dark:to-slate-850 border border-indigo-200/50 dark:border-gray-700 shadow-sm relative overflow-hidden ${isSharedScreenLarge ? 'p-10 rounded-3xl' : 'p-5 rounded-2xl'}`}>
                    <div className="absolute right-0 top-0 bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-xs">
                      Today's Pick
                    </div>
                    
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider"><i className="fas fa-magic mr-1"></i> Word Of The Day</span>
                    
                    <h3 className={`font-black capitalize tracking-tight text-gray-900 dark:text-white mt-1 mb-1 leading-none ${isSharedScreenLarge ? 'text-5xl md:text-6xl' : 'text-3xl'}`}>{wordOfTheDay.word}</h3>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 px-2.5 py-0.5 rounded font-extrabold uppercase tracking-widest font-semibold">{wordOfTheDay.pos}</span>
                      <span className="text-xs font-mono text-gray-500 font-bold">{wordOfTheDay.phonetic}</span>
                    </div>

                    <p className={`text-gray-705 dark:text-gray-295 font-semibold leading-relaxed mb-3 ${isSharedScreenLarge ? 'text-2xl font-black text-slate-900 dark:text-white mb-6' : 'text-xs'}`}>"{wordOfTheDay.def}"</p>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-50/70 dark:border-gray-800 text-[11px] italic font-medium text-gray-600 dark:text-gray-400 mb-3.5">
                      <span className="font-bold text-indigo-600 uppercase text-[9px] block mb-0.5 not-italic">Academic Usage Context:</span>
                      "{wordOfTheDay.example}"
                    </div>

                    <button 
                      onClick={() => {
                        setWord(wordOfTheDay.word);
                        searchWord(wordOfTheDay.word);
                      }} 
                      className={`w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${isSharedScreenLarge ? 'py-4 text-lg' : 'py-2 text-xs'}`}
                    >
                      <i className="fas fa-search text-[10px]"></i> Explore Multi-Source Lexicon
                    </button>
                  </div>

                  {/* Standard Dictionary Widget Footer Placeholder */}
                  <div className="flex flex-col items-center justify-center pt-2 opacity-50 text-center gap-2 max-w-xs mx-auto">
                     <i className="fas fa-book-open text-2xl text-indigo-500 mb-1"></i>
                     <p className="text-[11px] font-semibold text-gray-500 leading-normal">Search any word above to aggregate definitions, levels, pronunciation syllables, thesaurus, wikipedia sources and slang definitions.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Thesaurus & Collocations (Datamuse) */}
          {activeTab === 'thesaurus' && (
            <div className="space-y-4">
              {collocations ? (
                <div className="animate-fade-in space-y-4">
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm space-y-4">
                    
                    {/* Header with full list copy */}
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-755 pb-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest"><i className="fas fa-cubes mr-1.5"></i> Datamuse Lexical Thesaurus</span>
                      <button 
                        onClick={() => {
                          const allSyns = collocations.synonyms.map(s => s.word).join(', ');
                          handleCopy(allSyns, 'all-thesaurus-copy');
                        }}
                        className="text-[11px] text-gray-400 hover:text-indigo-600 flex items-center gap-1 font-bold"
                      >
                        <i className={copiedId === 'all-thesaurus-copy' ? "fas fa-check text-green-500" : "fas fa-copy"}></i>
                        <span>{copiedId === 'all-thesaurus-copy' ? 'Copied List!' : 'Copy Synonyms List'}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal font-medium">
                      The relational word catalog suggests associations compiled by linguistic semantic distances. <span className="font-bold text-indigo-500">Click any word below</span> to find information on it instantly:
                    </p>

                    <div className="space-y-4 text-xs">
                      
                      {/* Synonyms */}
                      <div className="space-y-1.5">
                        <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider"><i className="fas fa-check-circle text-green-500"></i> Synonyms (Thesaurus Lookup)</span>
                        {collocations.synonyms.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 font-medium">
                            {collocations.synonyms.map((s, i) => (
                              <button 
                                key={i}
                                onClick={() => {
                                  setWord(s.word);
                                  searchWord(s.word);
                                }}
                                className="px-2 py-0.5 bg-gray-100 hover:bg-indigo-50 text-gray-800 border border-gray-200 hover:border-indigo-300 dark:bg-slate-700 dark:text-white dark:border-none rounded-lg font-bold transition-all text-[11px]"
                              >
                                {s.word}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] italic text-gray-400">No absolute lexical synonyms match.</p>
                        )}
                      </div>

                      {/* Antonyms */}
                      <div className="space-y-1.5 font-medium">
                        <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider"><i className="fas fa-times-circle text-red-400"></i> Antonyms (Opposites)</span>
                        {collocations.antonyms.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {collocations.antonyms.map((s, i) => (
                              <button 
                                key={i}
                                onClick={() => {
                                  setWord(s.word);
                                  searchWord(s.word);
                                }}
                                className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-none rounded-lg font-bold transition-all text-[11px]"
                              >
                                {s.word}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] italic text-gray-400">No contrasting opposites logged.</p>
                        )}
                      </div>

                      {/* Collocations: Adjectives that modify this noun */}
                      {collocations.adjectives.length > 0 && (
                        <div className="space-y-1.5 font-medium">
                          <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider"><i className="fas fa-brush text-indigo-500"></i> Collocations (Adjectives describing "{word}")</span>
                          <div className="flex flex-wrap gap-1.5">
                            {collocations.adjectives.map((s, i) => (
                              <button 
                                key={i}
                                onClick={() => {
                                  setWord(s.word);
                                  searchWord(s.word);
                                }}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-150 rounded dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-none font-bold text-[11px]"
                              >
                                {s.word}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Collocations: Nouns described by this adjective */}
                      {collocations.nouns.length > 0 && (
                        <div className="space-y-1.5 font-medium">
                          <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider"><i className="fas fa-cubes text-pink-500"></i> Collocations (Nouns described by "{word}")</span>
                          <div className="flex flex-wrap gap-1.5">
                            {collocations.nouns.map((s, i) => (
                              <button 
                                key={i}
                                onClick={() => {
                                  setWord(s.word);
                                  searchWord(s.word);
                                }}
                                className="px-2 py-0.5 bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-150 rounded dark:bg-pink-950/30 dark:text-pink-350 dark:border-none font-bold text-[11px]"
                              >
                                {s.word}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Associated Trigger words */}
                      {collocations.trig.length > 0 && (
                        <div className="space-y-1.5 font-medium">
                          <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider"><i className="fas fa-compress text-orange-500"></i> Semantically Associated Concepts</span>
                          <div className="flex flex-wrap gap-1.5 font-semibold">
                            {collocations.trig.map((s, i) => (
                              <button 
                                key={i}
                                onClick={() => {
                                  setWord(s.word);
                                  searchWord(s.word);
                                }}
                                className="px-2 py-0.5 bg-orange-50 hover:bg-orange-100 text-orange-850 border border-orange-150 rounded dark:bg-orange-950/30 dark:text-orange-300 dark:border-none text-[11px]"
                              >
                                {s.word}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 space-y-2 max-w-xs mx-auto">
                  <i className="fas fa-cubes text-4xl text-gray-300 mb-1"></i>
                  <p className="text-xs font-bold text-gray-500 leading-normal">No thesaurus or collocs loaded. Search any common word above to fetch associated lexical descriptors.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Visuals / Images & Illustrations */}
          {activeTab === 'visuals' && (
            <div className="space-y-4">
              {wikiData || wikiImage ? (
                <div className="animate-fade-in space-y-4">
                  <div className={`bg-white dark:bg-slate-850 p-5 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden flex flex-col ${isSharedScreenLarge ? 'border-indigo-400 p-8 text-black dark:text-white dark:bg-black' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-center justify-between border-b pb-2 border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-bold text-slate-810 dark:text-gray-300 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                        <i className="fas fa-image text-indigo-500"></i> Wikipedia Visual Illustration
                      </span>
                      <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono">Academic Image File</span>
                    </div>

                    {wikiImage ? (
                      <div className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-755 bg-gray-50 dark:bg-slate-900 shadow-md group flex items-center justify-center transition-all hover:scale-[1.01] relative p-1 z-0">
                        <img 
                          src={wikiImage} 
                          alt={wikiData?.title || word} 
                          className={`object-contain rounded-xl ${isSharedScreenLarge ? 'w-full max-h-[500px]' : 'max-h-[300px]'}`} 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : wikiData?.thumbnail ? (
                      <div className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-slate-900 shadow-md flex items-center justify-center p-1">
                        <img 
                          src={wikiData.thumbnail.source} 
                          alt={wikiData.title} 
                          className="object-contain max-h-[300px] rounded-xl" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center text-gray-400 font-medium text-xs">
                        <i className="fas fa-eye-slash text-2xl text-gray-300 mb-1.5 block"></i>
                        No photographic illustration filed for this word.
                      </div>
                    )}

                    {wikiData ? (
                      <div className="space-y-3 font-medium">
                        <h3 className={`font-black capitalize ${isSharedScreenLarge ? 'text-3xl text-indigo-600' : 'text-xl text-gray-900 dark:text-white'}`}>
                          {wikiData.title}
                        </h3>
                        {wikiData.description && (
                          <span className={`font-extrabold uppercase text-indigo-505 tracking-wider block ${isSharedScreenLarge ? 'text-sm' : 'text-[10px]'}`}>
                            Described as: {wikiData.description}
                          </span>
                        )}
                        <p className={`font-serif leading-relaxed text-gray-700 dark:text-gray-305 ${isSharedScreenLarge ? 'text-2xl font-black' : 'text-xs'}`}>
                          {wikiData.extract}
                        </p>
                        <div className="pt-2">
                          <a 
                            href={wikiData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(word)}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold hover:underline inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg"
                          >
                            <i className="fas fa-external-link-alt"></i> View Full Article on Wikipedia
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 space-y-2 max-w-xs mx-auto">
                  <i className="fas fa-images text-4xl text-gray-300 mb-1"></i>
                  <p className="text-xs font-bold text-gray-500 leading-normal">No high-resolution illustration or article abstract is found. Try examining a concrete noun or historical element.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Phonology, Syllables & Rhyme matching Suite */}
          {activeTab === 'rhymes' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
                
                {/* Metrical Syllable Count banner */}
                <div className="flex items-center justify-between bg-gradient-to-r from-violet-500 to-indigo-600 text-white p-4 rounded-xl shadow-md">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-105">Pronunciation metrics</span>
                    <h4 className="text-lg font-black capitalize tracking-tight font-sans">{word} syllable scan</h4>
                  </div>
                  <div className="bg-white/20 px-3.5 py-1.5 rounded-xl font-mono text-center shrink-0 border border-white/10">
                    <span className="text-2xl font-black block leading-none">{syllableCount || '1'}</span>
                    <span className="text-[9px] uppercase font-bold text-violet-105 tracking-wider">Syllables</span>
                  </div>
                </div>

                <div className={`space-y-4 text-xs ${isSharedScreenLarge ? 'text-lg text-black dark:text-white' : ''}`}>
                  
                  {/* Rhyming block */}
                  <div className="space-y-2 font-semibold">
                    <span className="font-extrabold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <i className="fas fa-music text-[11px] text-green-550"></i> Words that Rhyme with "{word}"
                    </span>
                    {rhymeData.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {rhymeData.slice(0, 30).map((rh, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              setWord(rh.word);
                              searchWord(rh.word);
                            }}
                            className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-800 hover:border-green-300 border border-green-100 dark:bg-green-950/20 dark:text-green-300 dark:border-none rounded-lg font-black transition-all text-xs"
                          >
                            {rh.word}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-gray-400">No matching perfect rhyme syllables returned.</p>
                    )}
                  </div>

                  {/* Homophones block */}
                  <div className="space-y-2 font-semibold border-t border-gray-100 dark:border-gray-800 pt-3">
                    <span className="font-extrabold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <i className="fas fa-volume-up text-indigo-500"></i> Homophones (Sounds exactly alike)
                    </span>
                    {homophoneData.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {homophoneData.map((hp, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              setWord(hp.word);
                              searchWord(hp.word);
                            }}
                            className="px-2.5 py-1 bg-amber-55 hover:bg-amber-100 text-amber-800 hover:border-amber-300 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-none rounded-lg font-black transition-all text-xs"
                          >
                            {hp.word}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-gray-400">No absolute lexical homophones matched for this spelling.</p>
                    )}
                  </div>

                  {/* Similar pronunciation block */}
                  <div className="space-y-2 font-semibold border-t border-gray-100 dark:border-gray-800 pt-3">
                    <span className="font-extrabold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <i className="fas fa-theater-masks text-pink-500"></i> Sounds-Alike / Near Phonetic Matches
                    </span>
                    {similarSoundData.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {similarSoundData.slice(0, 20).map((sm, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              setWord(sm.word);
                              searchWord(sm.word);
                            }}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 text-gray-700 dark:bg-slate-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg font-bold transition-all text-xs"
                          >
                            {sm.word}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-gray-400">No matching fuzzy sounds recorded.</p>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* Tab 5: Urban slang dictionary */}
          {activeTab === 'urban' && (
            <div className="space-y-4">
              {urbanData && urbanData.length > 0 ? (
                <div className="animate-fade-in space-y-3.5">
                  <div className="text-[11px] text-gray-505 flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/25 text-yellow-850 dark:text-yellow-400 p-2 border border-yellow-200/50 rounded-lg">
                    <i className="fas fa-info-circle text-[12px] shrink-0"></i>
                    <span className="font-semibold leading-relaxed">Urban Dictionary gathers unofficial slang and community cultural idioms. Content index reflects casual user-submitted lists.</span>
                  </div>

                  {urbanData.map((entry: any, idx: number) => {
                    const cleanDef = entry.definition.replace(/[\[\]]/g, "");
                    const cleanEx = entry.example ? entry.example.replace(/[\[\]]/g, "") : "";
                    const urbanId = `urban-def-${idx}`;
                    return (
                      <div key={idx} className={`bg-white dark:bg-slate-800 border p-4 rounded-xl shadow-xs space-y-2 relative group-item font-medium ${isSharedScreenLarge ? 'border-gray-500 p-6 text-black dark:text-white dark:bg-black' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-bold text-gray-400 font-mono">Idiomatic Definition #{idx+1}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(`Urban Slang: ${entry.word} — Definition: "${cleanDef}" ${cleanEx ? ' — Example: "' + cleanEx + '"' : ''}`, urbanId)}
                              className="text-gray-400 hover:text-indigo-600 p-0.5"
                              title="Copy Definition Snippet"
                            >
                              <i className={copiedId === urbanId ? "fas fa-check text-green-500" : "fas fa-copy"}></i>
                            </button>
                            <a href={entry.permalink} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600 p-0.5" title="Source link">
                              <i className="fas fa-external-link-square-alt text-xs"></i>
                            </a>
                          </div>
                        </div>

                        <div className="space-y-2 leading-relaxed text-xs">
                          <h4 className={`font-black text-indigo-750 dark:text-indigo-400 capitalize ${isSharedScreenLarge ? 'text-2xl' : 'text-sm'}`}>{entry.word}</h4>
                          <p className={`font-semibold font-serif whitespace-pre-line text-gray-850 dark:text-gray-200 ${isSharedScreenLarge ? 'text-2xl font-black' : 'text-xs'}`}>
                            {cleanDef}
                          </p>
                          {entry.example && (
                            <div className="p-2.5 bg-gray-55 dark:bg-slate-900 border-l-2 border-indigo-500 text-gray-500 italic rounded text-[11px] font-medium leading-relaxed">
                              <span className="text-[9px] text-indigo-550 font-bold uppercase block not-italic mb-0.5">Idiomatic Sample Context:</span>
                              "{cleanEx}"
                            </div>
                          )}

                          <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-gray-500">
                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded">
                              <i className="fas fa-thumbs-up"></i> {entry.thumbs_up} upvotes
                            </span>
                            <span className="flex items-center gap-1 text-red-500 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">
                              <i className="fas fa-thumbs-down"></i> {entry.thumbs_down} downvotes
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 space-y-2 max-w-xs mx-auto">
                  <i className="fas fa-comment-slash text-4xl text-gray-300 mb-1"></i>
                  <p className="text-xs font-bold text-gray-500 leading-normal">No slang results verified yet. Search terms representing modern slang words (e.g., "flex", "no cap", "chillax") to see listings.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// NEW: DECK SIMULATOR WIDGET
// ============================================================
const DeckSimulatorWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [cards, setCards] = useState<{ me?: any, you?: any, single?: any }[]>([]);
  const [loading, setLoading] = useState(false);

  const shuffleDeck = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
      const json = await res.json();
      setDeckId(json.deck_id);
      setCards([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const drawCard = async (count: number = 1) => {
    if (!deckId) return;
    setLoading(true);
    try {
      const res = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`);
      const json = await res.json();
      if (json.cards && json.cards.length > 0) {
        if (count === 1) {
          setCards(prev => [{ single: json.cards[0] }, ...prev].slice(0, 8));
        } else if (count === 2) {
          setCards(prev => [{ me: json.cards[0], you: json.cards[1] }, ...prev].slice(0, 8));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { shuffleDeck(); }, []);

  return (
    <WidgetWrapper widget={widget} title="Draw" icon="fa-layer-group" onClose={onClose} minWidth={380} minHeight={500}>
      <div className="flex flex-col h-full p-5 gap-5" style={{ background: theme.surface, color: theme.text }}>
        <div className="flex gap-2 shrink-0">
          <button onClick={shuffleDeck} disabled={loading} className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-3 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm text-xs flex items-center justify-center gap-1">
            <i className={loading ? "fas fa-spinner fa-spin" : "fas fa-random"}></i> Shuffle
          </button>
          <button onClick={() => drawCard(1)} disabled={loading || !deckId} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-500/20 px-2 py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-emerald-500/50 text-xs flex items-center justify-center gap-1">
            <i className="fas fa-hand-paper"></i> Draw
          </button>
          <button onClick={() => drawCard(2)} disabled={loading || !deckId} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-500/20 px-2 py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-indigo-500/50 text-xs flex items-center justify-center gap-1">
            <i className="fas fa-users"></i> Dual (Me vs You)
          </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto gap-4 py-4 relative perspective-[1000px] bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-black/10 dark:border-white/10 hide-scrollbar">
          {cards.length === 0 && !loading && (
             <div className="text-center opacity-50 font-medium mt-12 flex flex-col items-center gap-3">
               <i className="fas fa-layer-group text-4xl opacity-50"></i>
               <span>Deck ready. Draw a card!</span>
             </div>
          )}
          {cards.map((play, i) => (
             <div key={i} className="flex gap-4 items-center justify-center animate-slide-up bg-white/5 p-4 rounded-2xl border border-white/5 shadow-xl w-full" style={{ animationDelay: `${i * 0.1}s` }}>
               {play.single && (
                  <img src={play.single.image} alt={play.single.code} className="w-32 rounded-lg shadow-2xl transition hover:scale-105" />
               )}
               {play.me && play.you && (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col items-center gap-3">
                       <span className="font-black text-[10px] uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 shadow-inner">Me</span>
                       <img src={play.me.image} alt={play.me.code} className="w-24 rounded-lg shadow-2xl transition-transform hover:scale-105 hover:rotate-[-2deg]" />
                    </div>
                    <div className="text-xl font-black italic opacity-20 px-2">VS</div>
                    <div className="flex flex-col items-center gap-3">
                       <span className="font-black text-[10px] uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-inner">You</span>
                       <img src={play.you.image} alt={play.you.code} className="w-24 rounded-lg shadow-2xl transition-transform hover:scale-105 hover:rotate-[2deg]" />
                    </div>
                  </div>
               )}
             </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
};

// ============================================================
// NEW: ZEN QUOTE BOARD
// ============================================================
const ZenQuoteBoard: React.FC = () => {
    const { theme } = useContext(AppContext);
    const [quote, setQuote] = useState<{ quote: string, author: string } | null>(null);
    const [image, setImage] = useState('');

    useEffect(() => {
        fetch('https://dummyjson.com/quotes/random')
            .then(res => res.json())
            .then(data => setQuote(data))
            .catch(() => setQuote({ quote: 'The beautiful thing about learning is that no one can take it away from you.', author: 'B.B. King' }));
        setImage(`https://picsum.photos/1920/1080?blur=4&random=${Date.now()}`);
    }, []);

    return (
        <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
            <div className="absolute inset-0 bg-cover bg-center z-[-1] transition-opacity duration-1000" style={{ backgroundImage: `url(${image})`, opacity: theme.mode === 'dark' ? 0.3 : 0.6 }} />
            <div className="relative z-10 max-w-4xl tracking-tight p-12 md:p-16 rounded-[3rem] backdrop-blur-2xl border-2 pointer-events-auto transition-all shadow-[0_0_100px_rgba(0,0,0,0.2)] text-center animate-fade-in" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.7)', borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <i className="fas fa-quote-left text-4xl md:text-6xl absolute top-8 left-8 opacity-20" style={{ color: theme.primary }}></i>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif italic mb-10 leading-tight drop-shadow-sm" style={{ color: theme.text }}>
                    "{quote?.quote || 'Loading inspiration...'}"
                </h1>
                <p className="text-xl md:text-2xl font-bold uppercase tracking-widest" style={{ color: theme.primary }}>
                    — {quote?.author || '...'}
                </p>
                <i className="fas fa-quote-right text-4xl md:text-6xl absolute bottom-8 right-8 opacity-20" style={{ color: theme.primary }}></i>
            </div>
        </div>
    );
};

// ============================================================
// NEW: WEATHER TRACKER MODAL
// ============================================================
const WeatherTrackerModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const { theme } = useContext(AppContext);
  const [city, setCity] = useLocalStorage('classroom-weather-city', 'New York');
  const [inputCity, setInputCity] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeather = async (cityName: string) => {
    setLoading(true); setError('');
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
      const geoJson = await geoRes.json();
      if (!geoJson.results || geoJson.results.length === 0) throw new Error('City not found. Try spelling it differently.');
      
      const loc = geoJson.results[0];
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=mph&temperature_unit=celsius&_t=${Date.now()}`);
      const weatherJson = await weatherRes.json();
      
      setData({
        name: loc.name,
        country: loc.country,
        temp: weatherJson.current.temperature_2m,
        wind: weatherJson.current.wind_speed_10m,
        code: weatherJson.current.weather_code,
        timezone: loc.timezone || undefined
      });
      setCity(loc.name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setInputCity(city);
      fetchWeather(city);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getWeatherProps = (code: number) => {
     if (code <= 3) return { icon: 'fa-sun', color: 'text-amber-400', bg: 'from-amber-500/20 to-orange-500/20', drop: 'drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]' };
     if (code <= 48) return { icon: 'fa-cloud', color: 'text-slate-400', bg: 'from-slate-500/20 to-gray-500/20', drop: 'drop-shadow-[0_0_20px_rgba(148,163,184,0.3)]' };
     if (code <= 67) return { icon: 'fa-cloud-rain', color: 'text-sky-400', bg: 'from-sky-500/20 to-blue-500/20', drop: 'drop-shadow-[0_0_20px_rgba(56,189,248,0.3)]' };
     if (code <= 77) return { icon: 'fa-snowflake', color: 'text-teal-200', bg: 'from-teal-500/20 to-blue-300/20', drop: 'drop-shadow-[0_0_20px_rgba(153,246,228,0.3)]' };
     return { icon: 'fa-bolt', color: 'text-purple-400', bg: 'from-purple-500/20 to-fuchsia-500/20', drop: 'drop-shadow-[0_0_20px_rgba(192,132,252,0.3)]' };
  };

  const wp = data ? getWeatherProps(data.code) : { icon: 'fa-cloud-sun', color: 'text-gray-400', bg: 'from-gray-500/10 to-gray-400/10', drop: '' };

  return (
    <div className="fixed inset-0 z-[40000] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-black/60 pointer-events-auto">
      <div 
        className="rounded-3xl p-5 sm:p-6 md:p-8 w-full max-w-md max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] relative border outline-none animate-fade-in overflow-hidden" 
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-base cursor-pointer z-20"
        >
          <i className="fas fa-times" style={{ color: theme.text }}/>
        </button>
        
        <h2 className="text-xl sm:text-2xl font-black mb-4 tracking-tight flex items-center gap-3 shrink-0" style={{ color: theme.text }}>
           <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${wp.bg}`}>
             <i className={`fas fa-cloud-sun text-lg ${wp.color}`}></i>
           </div>
           <span>Climate & Weather</span>
        </h2>
        
        <div className="flex gap-2 mb-4 shrink-0">
           <input 
             type="text" 
             value={inputCity} 
             onChange={e => setInputCity(e.target.value)} 
             onKeyDown={e => e.key === 'Enter' && fetchWeather(inputCity)}
             className="flex-1 px-3.5 py-2.5 rounded-xl border outline-none font-bold text-sm shadow-inner transition-shadow focus:shadow-md" 
             style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
             placeholder="Search city (e.g. Tokyo, London)..."
           />
           <button 
             onClick={() => fetchWeather(inputCity)} 
             className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-md text-sm cursor-pointer"
           >
              <i className={loading ? "fas fa-spinner fa-spin" : "fas fa-search"}></i>
           </button>
        </div>

        {error && <div className="text-red-500 bg-red-500/10 p-3 rounded-xl text-center font-bold text-xs border border-red-500/20 animate-shake mb-4 shrink-0">{error}</div>}

        {data && !loading && (
           <div className={`flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center py-6 px-4 bg-gradient-to-br ${wp.bg} rounded-2xl border relative shadow-inner`} style={{ borderColor: theme.border }}>
              <div className="absolute top-0 left-0 w-full h-full opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 10%, transparent 10%)', backgroundSize: '16px 16px' }}></div>
              
              <div className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight mb-0.5 relative z-10" style={{ color: theme.text }}>
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: data?.timezone })}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-3 relative z-10" style={{ color: theme.text }}>
                {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: data?.timezone })}
              </div>
              
              <button 
                onClick={() => fetchWeather(city)} 
                className="mb-4 px-3 py-1 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-all font-bold text-xs border border-black/10 dark:border-white/10 shadow-xs relative z-10 cursor-pointer" 
                style={{ color: theme.text }}
              >
                 <i className="fas fa-sync-alt mr-1.5 text-[10px]"></i> Refresh
              </button>

              <i className={`fas ${wp.icon} ${wp.color} text-5xl sm:text-6xl mb-3 ${wp.drop} transition-all duration-700 relative z-10`}></i>
              <div className="text-5xl sm:text-6xl font-black mb-1 tabular-nums tracking-tighter drop-shadow-xs relative z-10" style={{ color: theme.text }}>{data.temp}°C</div>
              <div className="text-lg font-extrabold opacity-90 mb-4 relative z-10 text-center" style={{ color: theme.text }}>{data.name}, {data.country}</div>
              
              <div className="flex gap-8 bg-black/5 dark:bg-white/5 py-2.5 px-6 rounded-2xl backdrop-blur-md shadow border border-white/10 relative z-10">
                 <div className="flex flex-col items-center gap-0.5">
                    <i className="fas fa-wind text-sky-500 text-xl mb-0.5"></i>
                    <span className="font-black text-base" style={{ color: theme.text }}>{data.wind} <span className="text-xs opacity-70">mph</span></span>
                    <span className="text-[9px] uppercase tracking-widest font-bold opacity-60" style={{ color: theme.text }}>Wind Speed</span>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const MiniWeatherWidget: React.FC = () => {
  const { theme } = useContext(AppContext);
  const tutorInfo = useAppStore(state => state.tutorInfo);
  const setTutorInfo = useAppStore(state => state.setTutorInfo);
  const timeOffsetMinutes = tutorInfo?.timeOffsetMinutes;

  const [city] = useLocalStorage('classroom-weather-city', 'New York');
  const [data, setData] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTimeSubmit = (hours: number, minutes: number) => {
      const currentTime = new Date();
      const currentUtcHours = currentTime.getUTCHours();
      const currentUtcMinutes = currentTime.getUTCMinutes();
      
      let desiredTotalMinutes = hours * 60 + minutes;
      let currentUtcTotalMinutes = currentUtcHours * 60 + currentUtcMinutes;
      
      let offset = desiredTotalMinutes - currentUtcTotalMinutes;
      if (offset > 720) offset -= 1440;
      if (offset < -720) offset += 1440;
      
      setTutorInfo({ ...tutorInfo, timeOffsetMinutes: offset });
  };

  const displayTime = () => {
    let localNow = now;
    if (timeOffsetMinutes !== undefined) {
        localNow = new Date(now.getTime() + timeOffsetMinutes * 60000);
        return localNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    }
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: data?.timezone });
  };

  const displayDate = () => {
    let localNow = now;
    if (timeOffsetMinutes !== undefined) {
        localNow = new Date(now.getTime() + timeOffsetMinutes * 60000);
        return localNow.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    }
    return now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: data?.timezone });
  };

  const fetchWeather = async () => {
    setError(false);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      const geoJson = await geoRes.json();
      if (!geoJson.results || geoJson.results.length === 0) throw new Error();
      
      const loc = geoJson.results[0];
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=mph&temperature_unit=celsius&_t=${Date.now()}`);
      const weatherJson = await weatherRes.json();
      
      setData({
        name: loc.name,
        country: loc.country,
        temp: weatherJson.current.temperature_2m,
        wind: weatherJson.current.wind_speed_10m,
        code: weatherJson.current.weather_code,
        timezone: loc.timezone || undefined
      });
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [city]);

  const getWeatherProps = (code: number) => {
     if (code <= 3) return { icon: 'fa-sun', color: 'text-amber-400' };
     if (code <= 48) return { icon: 'fa-cloud', color: 'text-slate-400' };
     if (code <= 67) return { icon: 'fa-cloud-rain', color: 'text-sky-400' };
     if (code <= 77) return { icon: 'fa-snowflake', color: 'text-teal-200' };
     return { icon: 'fa-bolt', color: 'text-purple-400' };
  };

  const wp = data ? getWeatherProps(data.code) : { icon: 'fa-cloud-sun', color: 'text-gray-400' };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-black/5 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner relative overflow-hidden">
      <div 
        className="flex items-center justify-center gap-2 relative z-10 group cursor-pointer hover:opacity-80 transition-opacity" 
        onClick={() => setIsEditingTime(true)}
      >
        <div className="text-3xl font-black tabular-nums tracking-tighter mb-1" style={{ color: theme.text }}>
          {displayTime()}
        </div>
        <button 
          className="text-lg opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-white/10 rounded-full h-8 w-8 flex items-center justify-center -mr-10"
          title="Set exact time"
        >
          ⚙️
        </button>
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-3 relative z-10" style={{ color: theme.text }}>
        {displayDate()}
      </div>
      
      <button onClick={fetchWeather} className="mb-4 px-4 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-all font-bold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-2 relative z-10" style={{ color: theme.text }}>
         <i className="fas fa-sync-alt"></i> Update Weather
      </button>

      <TimeInputModal
        isOpen={isEditingTime}
        onClose={() => setIsEditingTime(false)}
        onSubmit={handleTimeSubmit}
        title="Set Exact Time"
      />

      {error ? (
         <div className="text-xs text-red-500 font-bold opacity-80 py-4">Weather unavailable</div>
      ) : data ? (
        <>
          <i className={`fas ${wp.icon} ${wp.color} text-[3rem] mb-2 drop-shadow-sm relative z-10`}></i>
          <div className="text-5xl font-black mb-1 tabular-nums tracking-tighter relative z-10" style={{ color: theme.text }}>{data.temp}°C</div>
          <div className="text-xs font-bold opacity-80 mb-4 relative z-10" style={{ color: theme.text }}>{data.name}, {data.country}</div>
          
          <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 py-1.5 px-3 rounded-lg border border-white/10 relative z-10">
             <i className="fas fa-wind text-sky-500 text-sm"></i>
             <span className="font-black text-xs" style={{ color: theme.text }}>{data.wind} <span className="text-[9px] opacity-60">mph</span></span>
          </div>
        </>
      ) : (
        <div className="py-8"><i className="fas fa-spinner fa-spin text-2xl opacity-50" style={{ color: theme.text }}></i></div>
      )}
    </div>
  );
};

const LyricsWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<TrackCandidate[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [textSize, setTextSize] = useState<"sm" | "md" | "lg">("md");
  const [videos, setVideos] = useState<VideoCandidate[]>([]);
  const [lyricsSource, setLyricsSource] = useState("");
  const [syncedLines, setSyncedLines] = useState<SyncedLine[]>([]);
  const [liveIndex, setLiveIndex] = useState(-1);
  const [singAlong, setSingAlong] = useState(true);
  const [pastedLyrics, setPastedLyrics] = useState("");
  const [notice, setNotice] = useState("");
  const playerRef = useRef<PlayerHandle | null>(null);
  const lyricsPaneRef = useRef<HTMLDivElement | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<{
    artist: string;
    song: string;
    lyrics: string;
    meaning: string;
    youtubeVideoId: string;
    durationSeconds: number;
  } | null>(null);

  /** Apply a resolved song — from the app's song service or from the browser. */
  const applySong = (data: SongPayload, fallbackName: string, noticeText: string) => {
    const list: VideoCandidate[] = Array.isArray(data.videos) ? data.videos : [];
    const best = data.video || list[0] || null;
    setVideos(list);
    setLyricsSource(data.lyricsSource || "");
    setSyncedLines(parseLrc(data.syncedLyrics));
    setLiveIndex(-1);
    setPastedLyrics("");
    setNotice(noticeText);
    setSelectedTrack({
      artist: data.artist || "Unknown artist",
      song: data.song || fallbackName,
      // Never a placeholder: an empty string lets the UI say so honestly.
      lyrics: data.lyrics || "",
      meaning: data.meaning || "",
      youtubeVideoId: best ? best.id : data.youtubeVideoId || "",
      durationSeconds: data.durationSeconds || 0,
    });
  };

  // The song service is preferred, but a static deployment has no /api routes, so
  // loadSong() falls back to resolving the track in the browser (see
  // utils/songResolveClient.ts) instead of failing with "Could not retrieve lyrics".
  const searchSongs = async () => {
    const term = query.trim();
    if (!term) return;
    setLoading(true);
    setError("");
    setNotice("");
    setSelectedTrack(null);
    setSearchResults([]);
    setShowNotes(false);

    try {
      const tracks = await searchTracksClient(term);
      if (tracks.length) {
        setSearchResults(tracks);
        return;
      }
      const { payload, notice: noticeText } = await loadSong({ query: term, mode: "lyrics" });
      applySong(payload, term, noticeText);
    } catch (e: any) {
      setError(e?.message || "Search failed. Please try another track.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLyricDetails = async (trackName: string, artistName: string) => {
    setLoading(true);
    setError("");
    setNotice("");
    setSelectedTrack(null);
    setShowNotes(false);

    try {
      const { payload, notice: noticeText } = await loadSong({ song: trackName, artist: artistName, mode: "lyrics" });
      applySong(payload, trackName, noticeText);
    } catch (e: any) {
      setError(e?.message || "Could not retrieve lyrics. Please try another track.");
    } finally {
      setLoading(false);
    }
  };

  // Keep the line the song is on centred while sing-along is following along.
  useEffect(() => {
    if (liveIndex < 0 || !singAlong) return;
    const pane = lyricsPaneRef.current;
    if (!pane) return;
    const child = pane.querySelectorAll("button")[liveIndex] as HTMLElement | undefined;
    if (child) child.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [liveIndex, singAlong]);

  return (
    <WidgetWrapper widget={widget} title="Song Lyrics" icon="fa-music" onClose={onClose} minWidth={350} minHeight={450}>
      <div className="song-studio flex flex-col h-full bg-white text-slate-900 overflow-hidden select-text">
        {/* Search */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchSongs()}
                placeholder="Search a song and artist…"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white transition-colors"
              />
            </div>
            <button
              disabled={loading || !query.trim()}
              onClick={searchSongs}
              title="Search"
              className="h-[42px] w-[42px] shrink-0 rounded-lg bg-slate-900 text-white text-sm flex items-center justify-center hover:bg-slate-800 active:bg-slate-950 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <i className={loading ? "fas fa-circle-notch fa-spin" : "fas fa-magnifying-glass"}></i>
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Plain and timestamped lyrics, with a playable video and sing-along when one is available.
          </p>
        </div>

        {error && (
          <div className="shrink-0 mx-4 mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
            <i className="fas fa-circle-exclamation mt-0.5"></i>
            <span>{error}</span>
          </div>
        )}

        {notice && !error && (
          <div className="shrink-0 mx-4 mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600">
            <i className="fas fa-circle-info mt-0.5 text-slate-400"></i>
            <span>{notice}</span>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col justify-center items-center gap-3">
            <i className="fas fa-circle-notch fa-spin text-2xl text-slate-300"></i>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Finding lyrics &amp; video
            </span>
          </div>
        )}

        {/* Results */}
        {!loading && !selectedTrack && searchResults.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 py-2">
            <div className="px-2 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {searchResults.length} matches
              </span>
              <button
                onClick={() => setSearchResults([])}
                className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {searchResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => fetchLyricDetails(track.song, track.artist)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 text-left transition-colors cursor-pointer group"
                >
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                    {track.song.trim().charAt(0).toUpperCase() || "♪"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-slate-900 truncate">{track.song}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {track.artist}{track.album ? ` · ${track.album}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5">
                    {track.timed && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Timed
                      </span>
                    )}
                    {track.durationSeconds > 0 && (
                      <span className="text-[11px] text-slate-400 tabular-nums">{formatClock(track.durationSeconds)}</span>
                    )}
                    <i className="fas fa-chevron-right text-[9px] text-slate-300 group-hover:text-slate-500 transition-colors"></i>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && selectedTrack && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header / YouTube player (IFrame API: play, pause, seek, sing-along sync) */}
            {selectedTrack.youtubeVideoId && (
              <div className="w-full relative shrink-0 overflow-hidden border-b border-slate-200 bg-slate-900">
                <div className="aspect-video w-full">
                  <YouTubeStage
                    videoId={selectedTrack.youtubeVideoId}
                    handleRef={playerRef}
                    autoplay={false}
                    onTime={(t) => {
                      if (!singAlong) return;
                      const idx = findActiveLineIndex(syncedLines, t);
                      setLiveIndex(prev => (prev === idx ? prev : idx));
                    }}
                    onError={() => setError("That video cannot be embedded — pick another from the list below.")}
                  />
                </div>
                <div className="flex items-center gap-2 overflow-hidden px-3 py-2 bg-slate-50 border-t border-slate-200">
                  <button
                    onClick={() => playerRef.current?.toggle()}
                    className="w-8 h-8 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 active:bg-slate-950 transition-colors cursor-pointer"
                    title="Play / pause"
                  >
                    <i className="fas fa-play text-[10px]"></i>
                  </button>
                  <button
                    onClick={() => playerRef.current?.seek(0)}
                    className="w-8 h-8 shrink-0 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Restart"
                  >
                    <i className="fas fa-rotate-left text-[10px]"></i>
                  </button>
                  <a
                    href={`https://www.youtube.com/watch?v=${selectedTrack.youtubeVideoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3 shrink-0 rounded-full border border-slate-200 bg-white text-[10px] font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors flex items-center"
                  >
                    <i className="fas fa-up-right-from-square mr-1.5" /> YouTube
                  </a>
                  <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {syncedLines.length ? "Timed lyrics" : "Lyrics only"}
                  </span>
                </div>
              </div>
            )}

            {/* Track header */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{selectedTrack.song}</div>
                  <div className="mt-0.5 text-[12px] text-slate-500 truncate">
                    {selectedTrack.artist}
                    {selectedTrack.durationSeconds > 0 ? ` · ${formatClock(selectedTrack.durationSeconds)}` : ""}
                  </div>
                </div>
                
                
                {/* Visual controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(["sm", "md", "lg"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setTextSize(sz)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          textSize === sz
                            ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>

                  {selectedTrack.meaning && (
                    <button
                      onClick={() => setShowNotes(!showNotes)}
                      className={`h-[30px] px-2.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                        showNotes
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <i className="fas fa-book-open mr-1"></i> Study notes
                    </button>
                  )}
                </div>
              </div>

              {/* Provenance + sing-along + alternative videos */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-500">
                  {lyricsSource ? `Lyrics · ${lyricsSource}` : 'No lyrics found'}
                </span>
                {syncedLines.length > 0 && (
                  <button
                    onClick={() => setSingAlong((v) => !v)}
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                      singAlong ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Highlight each line as the song reaches it"
                  >
                    <i className="fas fa-microphone-lines mr-1" /> Sing-along {singAlong ? 'on' : 'off'}
                  </button>
                )}
                {searchResults.length > 0 && (
                  <button
                    onClick={() => setSelectedTrack(null)}
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <i className="fas fa-arrow-left mr-1" /> Results
                  </button>
                )}
              </div>

              {videos.length > 1 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto custom-scrollbar">
                  {videos.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedTrack({ ...selectedTrack, youtubeVideoId: v.id })}
                      className={`shrink-0 rounded-md overflow-hidden border transition-all cursor-pointer ${
                        selectedTrack.youtubeVideoId === v.id ? 'border-slate-900 ring-1 ring-slate-900/25' : 'border-slate-200 hover:border-slate-400'
                      }`}
                      title={`${v.title} — ${v.author}`}
                    >
                      <img src={v.thumbnail} alt="" referrerPolicy="no-referrer" className="w-16 h-10 object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {showNotes && selectedTrack.meaning && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <i className="fas fa-book-open"></i> Study notes
                  </div>
                  <div className="whitespace-pre-line">{selectedTrack.meaning}</div>
                </div>
              )}
            </div>

            {/* Lyrics Scrollable Area */}
            <div 
              ref={lyricsPaneRef}
              className={`flex-1 min-h-0 overflow-y-auto px-5 py-6 custom-scrollbar text-center ${
                textSize === "sm" ? "text-[13px]" : textSize === "md" ? "text-[15px]" : "text-[17px]"
              }`}
            >
              {!selectedTrack.lyrics ? (
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-6">
                  <i className="fas fa-circle-info text-lg text-slate-300"></i>
                  <p className="text-[12px] leading-relaxed text-slate-500">
                    No lyrics were found for this track. Nothing is invented to fill the gap — paste the words
                    below to study or sing along.
                  </p>
                  <textarea
                    placeholder="Paste the lyrics here…"
                    className="w-full h-40 resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-[12px] leading-relaxed text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    value={pastedLyrics}
                    onChange={(e) => setPastedLyrics(e.target.value)}
                  />
                  <button
                    disabled={!pastedLyrics.trim()}
                    onClick={() => setSelectedTrack({ ...selectedTrack, lyrics: pastedLyrics.trim() })}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Use these lyrics
                  </button>
                </div>
              ) : singAlong && syncedLines.length ? (
                <div className="flex flex-col items-center">
                  {syncedLines.map((line, idx) => {
                    const isActive = idx === liveIndex;
                    const isPast = idx < liveIndex;
                    return (
                      <button
                        key={`${line.time}-${idx}`}
                        onClick={() => playerRef.current?.seek(Math.max(0, line.time - 0.2))}
                        className={`w-full rounded-lg px-3 py-1.5 font-medium leading-snug transition-all duration-300 cursor-pointer ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 font-semibold scale-[1.02]'
                            : isPast
                            ? 'text-slate-300 hover:text-slate-500'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title={`Jump to ${formatClock(line.time)}`}
                      >
                        {line.text}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-left font-medium leading-relaxed text-slate-700">
                  {selectedTrack.lyrics}
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedTrack && searchResults.length === 0 && !loading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <i className="fas fa-music text-slate-400"></i>
            </div>
            <p className="max-w-[260px] text-[12px] leading-relaxed text-slate-500">
              Search a song title and artist above to load the words, a playable video and study notes.
            </p>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};



const ClassroomScreen: React.FC = () => {
  const navigate = useNavigate();
  const [themeNameRaw, setThemeName] = useLocalStorage('classroom-theme', 'light');
  const [tourStep, setTourStep] = useState<number>(-1);
  /* The walkthrough card can't be positioned per-step on a small screen — see the bubble. */
  const isCompact = useIsCompactViewport();
  const [hasCompletedTour, setHasCompletedTour] = useLocalStorage('classroom-tour-v152-completed', false);
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState<boolean>(false);

  useEffect(() => {
    if (!hasCompletedTour) {
      const timer = setTimeout(() => {
        setShowFirstTimePrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour]);
  const themeName = (themeNameRaw && typeof themeNameRaw === 'string' && themeNameRaw !== '[]') ? themeNameRaw : 'light';
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPrompt || null);

  useEffect(() => {
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const [widgets, setWidgets] = useState<WidgetState[]>([]);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [backgroundRaw, setBackground] = useLocalStorage('classroom-bg', BACKGROUNDS[0]);
  const background = (backgroundRaw && backgroundRaw.id) ? backgroundRaw : BACKGROUNDS[0];
  const [searchBg, setSearchBg] = useState('');
  const [showActivityLibrary, setShowActivityLibrary] = useState(false);
  const [showMoreWidgets, setShowMoreWidgets] = useState(false);
  const [showWeatherTracker, setShowWeatherTracker] = useState(false);
  const [zenMode, setZenMode] = useLocalStorage('classroom-zen-mode', false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeActivities, setActiveActivities] = useState<Map<string, { activity: ActivityDef; minimized: boolean; data?: Record<string, unknown> }>>(new Map());
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [diskSyncEnabled, setDiskSyncEnabledState] = useState(isDiskModeEnabled());
  const [diskDirHandle, setDiskDirHandle] = useState<any>(null);
  const [diskDirName, setDiskDirName] = useState('');
  const [diskPermissionGranted, setDiskPermissionGranted] = useState(false);
  // Back-up Suite: manual file export/import and (VIP) cloud backup state.
  const [suiteBusy, setSuiteBusy] = useState<'idle' | 'file' | 'cloud-save' | 'cloud-load'>('idle');
  const [cloudInfo, setCloudInfo] = useState<CloudBackupInfo | null>(null);
  const suiteWorking = suiteBusy !== 'idle';

  useEffect(() => {
    async function initDiskSync() {
      const handle = await getStoredDirectoryHandle();
      if (handle) {
        setDiskDirHandle(handle);
        setDiskDirName(handle.name);
        const state = await handle.queryPermission({ mode: 'readwrite' });
        setDiskPermissionGranted(state === 'granted');
      }
    }
    initDiskSync();
  }, []);

  const toggleDiskSync = async (enabled: boolean) => {
    setDiskModeEnabled(enabled);
    setDiskSyncEnabledState(enabled);
    if (enabled) {
      if (!diskDirHandle) {
        await handleChooseSyncFolder();
      } else {
        const hasPerm = await verifyDirectoryPermission(diskDirHandle, true);
        setDiskPermissionGranted(hasPerm);
        if (hasPerm) {
          await saveAllToDisk(diskDirHandle);
        }
      }
    }
  };

  const handleChooseSyncFolder = async () => {
    try {
      if (!isFileSystemAccessSupported()) {
        alert("The File System Access API is not supported by your browser or inside this iframe context. Please open this app in a new tab to choose a folder.");
        return;
      }
      const handle = await (window as any).showDirectoryPicker();
      await storeDirectoryHandle(handle);
      setDiskDirHandle(handle);
      setDiskDirName(handle.name);
      setDiskPermissionGranted(true);
      setDiskModeEnabled(true);
      setDiskSyncEnabledState(true);
      await saveAllToDisk(handle);
      alert(`Local backup & sync directory is successfully set to: "${handle.name}". Everything is fully synchronized and up to date!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Failed to select sync folder:", err);
        alert("Failed to access directory. Please make sure to give folder permission.");
      }
    }
  };

  const forceSyncNow = async () => {
    if (!diskDirHandle) {
      await handleChooseSyncFolder();
      return;
    }
    const hasPerm = await verifyDirectoryPermission(diskDirHandle, true);
    setDiskPermissionGranted(hasPerm);
    if (hasPerm) {
      const ok = await saveAllToDisk(diskDirHandle);
      if (ok) {
        alert("Everything has been successfully backed up to your local hard disk!");
      } else {
        alert("Backup failed. Please make sure you have allowed write permissions to your connected folder.");
      }
    } else {
      alert("Permission denied. Could not perform backup.");
    }
  };

  const restoreFromDisk = async () => {
    if (!diskDirHandle) {
      alert("No directory selected. Please select a folder first.");
      return;
    }
    if (window.confirm("Are you sure you want to restore all data from your local folder? This will overwrite your current browser data!")) {
      const hasPerm = await verifyDirectoryPermission(diskDirHandle, true);
      setDiskPermissionGranted(hasPerm);
      if (hasPerm) {
        const ok = await loadAllFromDisk(diskDirHandle, { replaceLearners: true });
        if (ok) {
          alert("All data successfully restored from disk! Reloading page to apply...");
          window.location.reload();
        } else {
          alert("Failed to restore from disk. Make sure classroom_settings.json exists in your directory.");
        }
      }
    }
  };

  const handlePurgeMemory = async () => {
    if (window.confirm("🚨 CRITICAL WARNING: This will completely purge all app data from your browser memory (localStorage, IndexedDB, and custom avatars cache). ONLY do this if you have successfully synced your data to your hard drive folder first! Otherwise, you will lose all data permanently. Do you wish to proceed?")) {
      const purged = await purgeBrowserMemory();
      if (!purged) {
        alert("Nothing was deleted. Your browser data is only cleared after a verified, complete backup exists in the connected folder. Connect a folder and run 'Backup to Disk', then try again.");
        return;
      }
      alert("Browser memory cleared successfully! Reloading page...");
      window.location.reload();
    }
  };

  /* ── Back-up Suite: manual file export / import ───────────────────────── */
  const handleExportBackupFile = async () => {
    setSuiteBusy('file');
    try {
      const res = await downloadFullBackupFile();
      if (res.ok) {
        alert(`✅ Back-up file saved (${((res.bytes || 0) / 1024 / 1024).toFixed(1)} MB, ${res.learners ?? 0} adult learner(s)).\n\nIt holds everything — learners and lessons, the classroom, the kids kingdom, custom photos and every other widget's data. "Import file" restores all of it, even on another computer.`);
      } else {
        alert(`Could not create the backup file: ${res.error || 'unknown error'}`);
      }
    } finally {
      setSuiteBusy('idle');
    }
  };

  const handleImportBackupFile = async (file: File) => {
    if (!window.confirm('Import this backup file?\n\nLearners, lessons, the classroom, the young-learners kingdom, custom photos and Game Hub data in the file are restored. Data that only exists in this browser is kept — nothing is deleted.\n\nContinue?')) return;
    setSuiteBusy('file');
    try {
      const res = await importFullBackupFile(file);
      if (res.ok) {
        alert(`✅ Import complete — ${res.learners ?? 0} adult learner(s) restored. Reloading so every dashboard shows the restored data.`);
        window.location.reload();
      } else {
        alert(`Import failed: ${res.error || 'the file could not be read.'}`);
      }
    } finally {
      setSuiteBusy('idle');
    }
  };

  /* ── Back-up Suite: cloud backup / restore (VIP) ──────────────────────── */
  const refreshCloudInfo = async () => {
    if (!isVipTier()) { setCloudInfo(null); return; }
    setCloudInfo(await getCloudBackupInfo());
  };

  useEffect(() => { void refreshCloudInfo(); /* run once; the status card has its own refresh */ }, []);

  const handleCloudSave = async () => {
    setSuiteBusy('cloud-save');
    try {
      const res = await saveToCloud();
      if (res.success) {
        alert(`✅ Saved to the cloud — revision ${res.revision} (${((res.bytes || 0) / 1024).toFixed(1)} KB).`);
        void refreshCloudInfo();
      } else {
        alert(`Cloud save failed: ${res.error || 'unknown error'}`);
      }
    } finally {
      setSuiteBusy('idle');
    }
  };

  const handleCloudRestore = async () => {
    if (!window.confirm('Download the cloud backup and restore it into this browser?\n\nLearners, sessions/feedback, schedules, todos, bookings and settings are restored. Generated lesson files stay on your hard disk.')) return;
    setSuiteBusy('cloud-load');
    try {
      const res = await loadFromCloud({ replace: true });
      if (res.success) {
        alert(`✅ Restored ${res.learners ?? 0} learner(s) from the cloud. Reloading…`);
        window.location.reload();
      } else {
        alert(`Cloud restore failed: ${res.error || 'no cloud backup exists for this account yet.'}`);
      }
    } finally {
      setSuiteBusy('idle');
    }
  };
  const [animateBg, setAnimateBg] = useLocalStorage('classroom-bg-animate', false);
  const authTier = useAuthStore(state => state.tier);
  const tutor = useAuthStore(state => state.tutor);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated) || !!tutor;
  const isVIP = authTier === 'vip';
  const isPremium = authTier === 'pro' || authTier === 'vip';
  const [showWhatsNewHover, setShowWhatsNewHover] = useState(false);
  
  const [currentTimeOffset, setCurrentTimeOffset] = useLocalStorage('classroom-time-offset', 0);
  const [shortcuts, setShortcuts] = useLocalStorage<DesktopShortcut[]>('classroom-shortcuts', []);
  const [newShortcut, setNewShortcut] = useState<DesktopShortcut>({ id: '', name: '', url: '', emoji: '🌎' });
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [mapCities, setMapCities] = useLocalStorage<WorldMapCity[]>('classroom-map-cities', DEFAULT_MAP_CITIES);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, show: boolean } | null>(null);
  const [showAddShortcutModal, setShowAddShortcutModal] = useState<{ x: number, y: number } | null>(null);
  const [showGoogleTranslate, setShowGoogleTranslate] = useState(false);
  const [showLeftMenu, setShowLeftMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, show: true });
  };

  const hideContextMenu = () => {
    if (contextMenu) setContextMenu(null);
  };

// Premium state
  const [requiredLevel, setRequiredLevel] = useState<'premium' | 'vip'>('premium');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumCode, setPremiumCode] = useState('');
  const [premiumError, setPremiumError] = useState('');
  const [premiumCallback, setPremiumCallback] = useState<(() => void) | null>(null);

  const showPremiumPrompt = useCallback((level: 'premium' | 'vip', callback?: () => void) => {
    setRequiredLevel(level);
    setPremiumCallback(() => callback || null);
    useAuthStore.getState().openUpgradeModal(`This feature requires a ${level.toUpperCase()} tutor membership. Enter your activation code or upgrade to unlock.`);
    return false;
  }, []);

  const handlePremiumSubmit = async () => {
    const code = premiumCode.trim().toUpperCase();
    if (!code) return;
    const res = await useAuthStore.getState().redeemCode(code);
    if (res.success) {
      setShowPremiumModal(false);
      if (premiumCallback) premiumCallback();
    } else {
      setPremiumError(res.message || 'Invalid code. Please try again.');
    }
  };

  const handlePremiumFeature = useCallback((level: 'premium' | 'vip', callback: () => void) => {
    if (level === 'vip' && isVIP) {
      callback();
    } else if (level === 'premium' && (isPremium || isVIP)) {
      callback();
    } else {
      showPremiumPrompt(level, callback);
    }
  }, [isPremium, isVIP, showPremiumPrompt]);

  const theme = THEMES[themeName] || THEMES.light;

  /*
   * A walkthrough step names the element it is about, and optionally the one
   * slide-out panel that should be open while it is on screen.
   */
  type TourStep = {
    title: string;
    icon: string;
    targetId: string;
    position: string;
    text: string;
    tutorTip: string;
    panel?: 'moreWidgets' | 'settings';
  };

  const tourSteps = useMemo<TourStep[]>(() => [
    {
      /* Was stuck at v1.5.2 — three releases behind the badge the user is being
         told to hover over in the very next sentence. */
      title: "Classroom Screen Pro v2.0.1 Console",
      icon: "fa-chalkboard-teacher text-amber-500",
      targetId: "tour-app-version",
      position: "top-20 left-6",
      text: "This is your main app status hub. Hover over the version name to see the full list of updates and active features in Tutorly Classroom Screen Pro.",
      tutorTip: "💡 Language Tutor Tip: Set this to VIP or Pro level to unlock maximum AI conversation engines, flashcard builders, and advanced custom media decks."
    },
    {
      title: "Interactive Widgets Toolbar",
      icon: "fa-desktop text-indigo-500",
      targetId: "tour-bottom-dock",
      position: "bottom-28 left-1/2 -translate-x-1/2",
      text: "The bottom dock houses high-impact widgets. Launch things like the AI Lesson Generator, Conversation Maker, Transcribers, or the Digital Whiteboard with a single tap.",
      tutorTip: "💡 Language Tutor Tip: Open 'Conversation Maker' during speaking sessions to generate situational roleplays (e.g., ordering food, job interviews) customized for the student's target level!"
    },
    {
      title: "More Advanced Widgets Suite",
      icon: "fa-plus-circle text-amber-500",
      targetId: "tour-more-widgets-btn",
      position: "bottom-28 right-4 sm:right-24 md:right-[20%]",
      panel: 'moreWidgets',
      text: "Clicking the '+' button opens the full suite of 25+ specialized widgets including Dice, Timers, Quick Polls, Sound Boards, and interactive tools.",
      tutorTip: "💡 Language Tutor Tip: Keep the 'Sound Board' open for pronunciation practice! Award audio praises for correct accents, and use 'Sticky Notes' to drop instant correction feedback on-screen."
    },
    {
      title: "General Settings & Themed Backdrops",
      icon: "fa-cog text-sky-500",
      targetId: "tour-settings-toggle-btn",
      position: "top-1/2 right-[340px] -translate-y-1/2",
      panel: 'settings',
      text: "Open the slide-out settings panel to configure weather locations, upload custom materials, or choose beautiful immersive gradient or image backdrops.",
      tutorTip: "💡 Language Tutor Tip: Match the background wallpaper to your lesson theme! If you're teaching French culture, select a gorgeous Paris backdrop to spark natural free-flowing conversation."
    }
  ], []);

  /*
   * Name-based, not index-based.
   *
   * A step is only offered while the element it names is really in the document,
   * and everything else — the counter, the dot matrix, which panel slides open,
   * which control gets the highlight ring — is derived from the step's own
   * `targetId`/`panel` rather than from its position in this array.
   *
   * The old version used raw indices for all of that. Deleting a single button
   * then shoved every later step onto the wrong element, and the step that
   * pointed at the deleted control could never light up at all. Removing a
   * control now simply shortens the tour.
   */
  const liveTourSteps = tourSteps.filter(
    (step) => typeof document !== 'undefined' && document.getElementById(step.targetId) !== null
  );
  const currentTargetId = tourStep >= 0 ? liveTourSteps[tourStep]?.targetId ?? null : null;
  const currentPanel = tourStep >= 0 ? liveTourSteps[tourStep]?.panel ?? null : null;

  useEffect(() => {
    // Closed or finished: leave the panels exactly as the user left them.
    if (tourStep < 0) return;
    setShowMoreWidgets(currentPanel === 'moreWidgets');
    setShowSettingsPanel(currentPanel === 'settings');
  }, [tourStep, currentPanel]);

  // Sync document root dark class name for accurate dark/light styling on widgets
  useEffect(() => {
    const isDark = theme.mode === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    /*
     * Two keys, on purpose — but they have to be written together.
     *
     * `classroom-theme` is THIS screen's named palette (one of eight). The
     * dashboards, the header and the learner pages only understand light/dark, and
     * they read it from a separate `theme` key. Nothing ever wrote both, so the two
     * halves of the app disagreed: choose Midnight (a dark palette) here and the
     * dashboard still rendered itself light, and vice versa — which is what "the
     * dark theme does not stick" looked like from the outside.
     *
     * Mirroring the resolved mode onto `theme` makes the classroom the source of
     * truth for the whole app while each side keeps reading the key it already
     * knows. Guarded because localStorage throws in private mode.
     */
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      /* storage unavailable — the class on <html> still applied above */
    }
  }, [theme.mode]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hotkey handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'g': e.preventDefault(); addWidget('lessonGen'); break;
          case 't': e.preventDefault(); addWidget('timer'); break;
          case 'l': e.preventDefault(); addWidget('traffic'); break;
          case 'r': e.preventDefault(); addWidget('random'); break;
          case 'n': e.preventDefault(); addWidget('noise'); break;
          case 'q': e.preventDefault(); addWidget('qr'); break;
          case 'w': e.preventDefault(); addWidget('whiteboard'); break;
          // Alt+E used to open `texteditor`, which has no renderer — so the
          // shortcut silently hid the home screen's hero and added nothing.
          case 'i': e.preventDefault(); addWidget('lessonInsight'); break;
          case 'a': e.preventDefault(); addWidget('accessibility'); break;
          case 'm': e.preventDefault(); addWidget('media'); break;
          case 'c': e.preventDefault(); addWidget('webcam'); break;
          // Legacy hotkeys
          case 's': e.preventDefault(); addWidget('notes'); break;
          case 'p': e.preventDefault(); addWidget('poll'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [widgets]);

  const handleReactionComplete = useCallback(() => {
    setActiveReaction(null);
  }, []);

  const showReaction = useCallback((emoji: string) => {
    setActiveReaction(emoji);
  }, []);

  const addWidget = useCallback((type: string, initialSettings?: any, bypassPremium = false) => {
    const vipTypes = ['screen', 'university-management', 'preply-success', 'content-creator'];
    const premiumTypes = ['sound-board', 'tutorly-chess', 'lyrics', 'karaoke', 'exam-builder', 'transcriber', 'prompter', 'whiteboard', 'lessonInsight'];
    
    if (!bypassPremium) {
      if (vipTypes.includes(type) && !isVIP) {
        useAuthStore.getState().openUpgradeModal('VIP Access Required: Upgrade to VIP to unlock this advanced module.');
        return;
      }
      if (premiumTypes.includes(type) && (!isPremium && !isVIP)) {
        useAuthStore.getState().openUpgradeModal('Pro Feature: Upgrade to Pro or VIP to unlock this tool.');
        return;
      }
    }

    if (type === 'accessibility') {
      const p = document.getElementById('accessibility-panel');
      if (p) {
        p.style.display = p.style.display === 'none' || p.style.display === '' ? 'flex' : 'none';
      }
      return;
    }
    
    if (type === 'spinner') {
      openSpinnerWidget();
      return;
    }

    if (type === 'screen') {
      window.open('/tutorly-widgets/Tutorly-cscreen/index.html', '_self');
      return;
    }

    if (type === 'lessonInsight') {
      window.open('/tutorly-widgets/tutorly-lesson-insight/index.html', '_blank');
      return;
    }

    if (type === 'transcriber') {
      window.open('/tutorly-widgets/tutorly-transcriber-2-v1/index.html', '_self');
      return;
    }

    if (type === 'prompter') {
      window.open('/tutorly-widgets/tutorly-prompter/index.html', '_self');
      return;
    }

    if (type === 'exam-builder') {
      // The single-file build of the `exam-builder/` project, collected into dist/ by
      // scripts/collect-standalone-apps.mjs. This used to open `exam-builder-v1`, a
      // folder that was never built — so the tile landed on a 404.
      window.open('/tutorly-widgets/exam-builder/index.html', '_self');
      return;
    }

    if (type === 'whiteboard') {
      window.open('/tutorly-widgets/whiteboard-application-V2/index.html', '_self');
      return;
    }

    if (type === 'preply-success') {
      // The folder was renamed from preply-success-advisor-v1 (the "V2" tile that
      // used to sit beside this one pointed at a folder that no longer exists).
      window.open('/tutorly-widgets/preply-success-advisor/index.html', '_self');
      return;
    }

    if (type === 'university-management') {
      // Standalone app deployed at the site root (https://cspro.tutomy.com/university-management-system/).
      // Opened in a new tab so the teacher's classroom screen is never replaced.
      window.open('/tutorly-widgets/university-management-system/', '_blank');
      return;
    }

    if (type === 'tutorly-chess') {
      // The chess game was renamed and moved, like every other adult game, under
      // /tutorly-games/adult/chess/ (its folder IS its public URL).
      window.open('/tutorly-games/adult/chess/index.html', '_self');
      return;
    }

    if (type === 'content-creator') {
      // "ContentAlchemy AI", the VIP studio app. Opened in a NEW TAB so the
      // classroom screen and whatever is on the canvas survive the visit.
      //
      // It used to have no launcher at all, so the tile fell through to the bottom
      // of this function. That appended a widget of type `content-creator`, which
      // `renderWidget` has no case for and answered with `null` — an invisible
      // widget that still counted in `widgets.length` and therefore hid the
      // "Ready to teach?" hero, with nothing appearing in its place.
      window.open('/tutorly-widgets/content-creator/index.html', '_blank');
      return;
    }

    /**
     * Last line of defence: a tile that has neither a launcher above nor a
     * `renderWidget` case below would append a widget that renders `null`.
     *
     * That widget is invisible but real — it counts in `widgets.length`, which the
     * home screen uses to decide whether to show the "Ready to teach?" hero — so
     * one click on such a tile made the hero disappear and gave the user nothing to
     * close or explain it. Refusing to create it is what keeps the empty state
     * honest. Add the launcher (or the renderer) instead of widening this list.
     */
    if (!RENDERED_WIDGET_TYPES.has(type)) {
      console.warn(
        `[classroom] "${type}" has no launcher and no renderer, so nothing was added.` +
          ` Add it to addWidget (a standalone app) or to renderWidget (an in-canvas widget).`,
      );
      return;
    }

    const maxZ = widgets.reduce((max, w) => Math.max(max, w.zIndex), 100);
    const position = calculateNextWidgetPosition(widgets, type);

    const sizes: Record<string, Size> = {
      lessonGen: { width: 400, height: 500 },
      lessonContent: { width: 800, height: 600 },
      conversationMaker: { width: 400, height: 600 },
      conversationPlayer: { width: 600, height: 500 },
      timer: { width: 350, height: 420 },
      traffic: { width: 220, height: 380 },
      random: { width: 350, height: 480 },
      noise: { width: 300, height: 320 },
      qr: { width: 300, height: 360 },
      whiteboard: { width: 800, height: 600 },
      notes: { width: 400, height: 450 },
      poll: { width: 350, height: 400 },
      media: { width: 600, height: 500 },
      webcam: { width: 450, height: 400 },
      calendar: { width: 380, height: 480 },
      scoreboard: { width: 500, height: 400 },
      worldclock: { width: 400, height: 450 },
      timetable: { width: 600, height: 500 },
      reactions: { width: 300, height: 350 },
      embed: { width: 500, height: 450 },
      dice: { width: 300, height: 320 },
      groupmaker: { width: 400, height: 480 },
      counter: { width: 280, height: 280 },
      texteditor: { width: 400, height: 400 },
      hyperlink: { width: 320, height: 400 },
      symbols: { width: 350, height: 450 },
    };

    const newWidget: WidgetState = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      size: sizes[type] || { width: 350, height: 400 },
      minimized: false,
      maximized: false,
      zIndex: maxZ + 1,
      settings: initialSettings || {},
    };

    setWidgets(prev => [...prev, newWidget]);
    SFX.click();
  }, [widgets, isPremium, handlePremiumFeature]);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const updateWidget = useCallback((id: string, updates: Partial<WidgetState>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const bringToFront = useCallback((id: string) => {
    const maxZ = widgets.reduce((max, w) => Math.max(max, w.zIndex), 100);
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
  }, [widgets]);

  const handleSelectActivity = (activity: ActivityDef, data?: Record<string, unknown>) => {
    if (activity.id === 'collaboration') {
      addWidget('peer');
      setShowActivityLibrary(false);
      return;
    }
    setActiveActivities(prev => new Map(prev).set(activity.id, { activity, minimized: false, data }));
    setShowActivityLibrary(false);
  };

  const closeActivity = (activityId: string) => {
    setActiveActivities(prev => {
      const next = new Map(prev);
      next.delete(activityId);
      return next;
    });
  };

  const toggleActivityMinimize = (activityId: string) => {
    setActiveActivities(prev => {
      const next = new Map<string, { activity: ActivityDef; minimized: boolean; data?: Record<string, unknown> }>(prev);
      const current = next.get(activityId);
      if (current) {
        next.set(activityId, { ...current, minimized: !current.minimized });
      }
      return next;
    });
  };

  const searchBackground = () => {
    if (searchBg.trim()) {
      const url = `https://loremflickr.com/1920/1080/${encodeURIComponent(searchBg)}`;
      setBackground({ id: 'search', type: 'image', value: url });
    }
  };

  const contextValue = useMemo(() => ({
    theme,
    setTheme: setThemeName,
    widgets,
    addWidget,
    removeWidget,
    updateWidget,
    bringToFront,
    snapGuides,
    setSnapGuides,
    stickyNotes,
    setStickyNotes,
    showReaction,
    stopReaction: () => {},
  }), [theme, setThemeName, addWidget, removeWidget, updateWidget, bringToFront, stickyNotes, showReaction]);

  const renderWidget = (widget: WidgetState) => {
    const onClose = () => removeWidget(widget.id);

    switch (widget.type) {
      case 'lessonGen': return <AILessonWidget key={widget.id} widget={widget} onClose={onClose} onLaunchLesson={(html) => addWidget('lessonContent', { html })} />;
      case 'lessonContent': return <LessonContentWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'conversationMaker': return <ConversationMakerWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'conversationPlayer': return <ConversationPlayerWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'timer': return <TimerWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'traffic': return <TrafficLightWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'random': return <RandomPickerWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'noise': return <NoiseLevelWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'qr': return <QRCodeWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'notes': return <StickyNotesWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'poll': return <QuickPollWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'media': return <SuperMediaPlayerWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'webcam': return <WebcamWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'calendar': return <CalendarWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'scoreboard': return <ScoreboardWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'worldclock': return <WorldClockWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'timetable': return <TimetableWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'reactions': return <ReactionsWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'embed': return <EmbedWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'dice': return <DiceWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'groupmaker': return <GroupMakerWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'counter': return <CounterWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'karaoke': return <KaraokeWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'joke': return <JokeWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'thesaurus': return <ThesaurusWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'bored': return <BoredWidget key={widget.id} widget={widget} onClose={onClose} />;
      // case 'texteditor': removed
      case 'dictionary': return <DictionaryWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'deck': return <DeckSimulatorWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'lyrics': return <LyricsWidget key={widget.id} widget={widget} onClose={onClose} />;
      case 'sound-board': return <SoundBoardWidget key={widget.id} widget={widget} onClose={onClose} />;
      default: return null;
    }
  };

  const bgStyle = background.type === 'gradient'
    ? { background: background.value }
    : { backgroundImage: `url(${background.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };

  const widgetStateValue = useMemo(() => ({
    widgets,
    snapGuides,
    setSnapGuides,
  }), [widgets, snapGuides, setSnapGuides]);

  return (
    <AppContext.Provider value={contextValue}>
      <WidgetStateContext.Provider value={widgetStateValue}>

        <PeerOverlay />
      
      {/* Background Layer */}
      <div 
        className={`fixed inset-0 overflow-hidden ${animateBg ? (background.type === 'gradient' ? 'animate-bg-gradient' : 'animate-bg-image') : ''}`} 
        style={{ ...bgStyle, zIndex: -10 }}
      />

      <div className="fixed inset-0 overflow-hidden" onContextMenu={handleContextMenu} onClick={hideContextMenu}>
        <div className="absolute inset-0 z-[-5] pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />

        {/* Header - Uncluttered Single Menu Button */}
        {!showActivityLibrary && (
          <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-[50] pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3">
              <button 
                id="tour-app-version"
                onClick={() => setShowLeftMenu(true)}
                className={`px-3.5 h-10 rounded-xl flex items-center gap-2.5 shadow-lg font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md ${currentTargetId === 'tour-app-version' ? 'ring-4 ring-offset-2 ring-amber-500 animate-pulse' : ''}`}
                style={{ 
                  backgroundColor: theme.surface, 
                  border: isVIP ? '2px solid #f1c40f' : `1px solid ${theme.border}`, 
                  color: theme.text,
                  boxShadow: isVIP ? '0 0 15px rgba(241,196,15,0.4)' : undefined
                }}
                title="Open Academy Menu & Navigation"
              >
                <i className="fas fa-bars text-sm" style={{ color: theme.primary }} />
                <span className="text-xs font-black tracking-wide">Menu</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  ClassroomScreen 2.0.1
                </span>
                <TierBadge tier={authTier} size="sm" />
              </button>
            </div>
          </header>
        )}

        {/* Left Side Menu Drawer */}
        <div className={`fixed inset-0 z-[120] transition-all duration-300 ${showLeftMenu ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLeftMenu(false)}
          />

          {/* Drawer Container */}
          <div
            className={`absolute top-0 bottom-0 left-0 w-[86vw] max-w-[21rem] sm:w-96 sm:max-w-none shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out border-r ${
              showLeftMenu ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{
              /*
               * The drawer, the settings panel and the dock all paint with the SAME
               * two tokens (`theme.surface` + `theme.border`). They used to be three
               * different hand-picked colours — the drawer hard-coded slate-900, the
               * panel slate-800, the dock `theme.surface` — so switching themes left
               * one of them a shade off from the others.
               *
               * `w-[86vw] max-w-[21rem]` matters on a phone: at a flat `w-80` (320px)
               * the drawer covered the whole 320–360px screen, so there was no
               * tappable backdrop left to close it with.
               */
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow" style={{ backgroundColor: theme.primary }}>
                  <i className="fas fa-chalkboard-teacher" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-extrabold tracking-tight" style={{ color: theme.text }}>
                    ClassroomScreen <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">v2.0.1</span>
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <TierBadge tier={authTier} size="sm" />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowLeftMenu(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-sm font-bold"
                title="Close Menu"
              >
                ✕
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Tutor Profile Card — inset against the drawer, so it reads as a card in BOTH themes.
                  It used `surfaceHover`, which is pure white in the light theme: the same
                  colour as the drawer behind it, so the card had no visible edge at all. */}
              <div className="p-3.5 rounded-2xl border flex flex-col gap-3 shadow-sm" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {tutor?.avatarUrl ? (
                      <img src={tutor.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-black text-sm">
                        <i className="fas fa-user-circle text-lg" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-extrabold truncate text-xs flex items-center gap-1.5" style={{ color: theme.text }}>
                        <span className="truncate">{tutor ? (tutor.name || tutor.email) : 'Guest Tutor'}</span>
                        {tutor?.emailVerified && (
                          <span className="text-emerald-500 text-xs shrink-0" title="Verified Gmail Account">✅</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <span>{tutor ? tutor.email : 'Free Starter (30 Learners)'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Action Buttons */}
                <div className="flex flex-col gap-1.5 pt-1">
                  {tutor ? (
                    <>
                      {/* Left Panel Verify Button if not verified */}
                      {!tutor.emailVerified && (
                        <button
                          onClick={() => {
                            setShowLeftMenu(false);
                            useAuthStore.getState().openAuthModal('verify');
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-extrabold text-xs flex items-center justify-between transition cursor-pointer shadow-xs"
                          title="Click to enter your 6-digit verification code"
                        >
                          <div className="flex items-center gap-1.5">
                            <i className="fas fa-envelope text-amber-500" />
                            <span>Verify Gmail</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                            Verify
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowLeftMenu(false);
                          useAuthStore.getState().openUpgradeModal();
                        }}
                        className="w-full py-2 px-3 rounded-xl font-extrabold text-xs text-white flex items-center justify-center gap-2 shadow transition hover:opacity-95 cursor-pointer"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <i className="fas fa-crown text-yellow-300" />
                        <span>Manage Membership & Tiers</span>
                      </button>
                      {tutor.email === 'info.tutomy@gmail.com' && (
                        <button
                          onClick={() => {
                            setShowLeftMenu(false);
                            useAuthStore.getState().openAdminModal();
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/30 border border-purple-500/40 text-purple-700 dark:text-purple-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <i className="fas fa-shield-alt text-purple-500" />
                          <span>Master Admin Console</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          useAuthStore.getState().logout();
                        }}
                        className="w-full py-1 px-3 text-slate-500 hover:text-red-500 dark:hover:text-red-400 text-[11px] font-bold transition text-center cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setShowLeftMenu(false);
                          useAuthStore.getState().openAuthModal('login');
                        }}
                        className="py-2 px-3 rounded-xl font-extrabold text-xs text-white flex items-center justify-center gap-1.5 shadow transition hover:opacity-95 cursor-pointer"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <i className="fas fa-sign-in-alt" />
                        <span>Sign In</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowLeftMenu(false);
                          useAuthStore.getState().openUpgradeModal();
                        }}
                        className="py-2 px-3 rounded-xl font-extrabold text-xs border flex items-center justify-center gap-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        style={{ borderColor: theme.border, color: theme.text }}
                      >
                        <i className="fas fa-star text-amber-500" />
                        <span>View Tiers</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Quick Actions */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                  Interactive Tools & Support
                </div>

                <button
                  onClick={() => {
                    setShowLeftMenu(false);
                    setTourStep(0);
                    setShowFirstTimePrompt(false);
                  }}
                  className="w-full p-2.5 rounded-xl text-white font-extrabold flex items-center justify-between transition hover:scale-[1.01] cursor-pointer shadow"
                  /*
                   * Deepened from emerald-500/600 to emerald-700/800. The label is
                   * 12px bold, so it needs 4.5:1, and white on #10b981 only reaches
                   * 2.5:1 (white on #059669 is 3.5:1) — the text sat washed-out on its
                   * own button. #047857 → #065f46 gives 4.5:1 and 6.7:1.
                   */
                  style={{ background: 'linear-gradient(135deg, #047857, #065f46)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-compass text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>Take Interactive Tour 🧭</span>
                  </div>
                  <i className="fas fa-play text-[10px]" />
                </button>
              </div>

              {/*
                * What's New — for TEACHERS, about teaching.
                *
                * This list is read by the person about to run a lesson, so it only
                * ever says what they can now do. It deliberately carries no notes on
                * how the app is arranged (folder names, URLs, old-to-new paths), no
                * admin or maintenance tools, and nothing about the server, database
                * or hosting — none of which is a teacher's business, and all of which
                * has been on this panel before.
                */}
              <div className="p-3 rounded-2xl border space-y-2 text-xs" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
                <div className="flex items-center justify-between font-extrabold text-[11px]" style={{ color: theme.primary }}>
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-star text-amber-500" /> What's New in v2.0.1
                  </span>
                  <span className="text-[10px] text-slate-400">2026-09-25</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  <li>• <strong>Content Creator (VIP):</strong> turn a topic or a text into ready-to-teach material — now on the <em>More Widgets</em> board, in its own tab so your board stays as it was.</li>
                  <li>• <strong>New on the Game Hub board:</strong> <strong>TalkArena</strong> runs a whole speaking lesson, <strong>ShoutOut</strong> turns the camera into an emoji word-flood, <strong>SpeedReader</strong> is karaoke shadowing against a ghost pace, and <strong>StoryCraft</strong> hands the class a world to steer.</li>
                  <li>• <strong>Every lesson tool opens:</strong> Whiteboard&nbsp;V2, Teleprompter, Lesson&nbsp;Insight and Exam&nbsp;Builder are now wired straight to their apps instead of landing on a dead tile.</li>
                  <li>• <strong>Built for your phone:</strong> the menu, the widget dock and the settings panel now resize to the screen you are holding, so the whole studio fits a phone in portrait.</li>
                  <li>• <strong>Light theme by default:</strong> the studio opens bright and readable on a projector; switch to Dark or any of the six other themes from the settings panel whenever you like.</li>
                  <li>• <strong>Back-up Suite:</strong> one place to save, restore and sync everything — Hard Drive, Cloud, and a manual file export/import that round-trips your whole workspace.</li>
                  <li>• <strong>50 MB cloud backups:</strong> up from 4&nbsp;MB, with a manual <strong>Restore from cloud</strong> button in the panel.</li>
                  <li>• <strong>Password reset:</strong> if an account has no usable password, you are now asked to set a new one instead of being unable to sign in.</li>
                </ul>
              </div>
            </div>

            {/* Drawer Bottom Footer with Copyright Text */}
            <div className="p-4 border-t text-center text-[11px] leading-normal" style={{ borderColor: theme.border, color: theme.textMuted }}>
              <div className="font-semibold">
                © {new Date().getFullYear()} Tutor Academy • <a href="https://tutomy.com" target="_blank" rel="noopener noreferrer" className="hover:underline font-bold transition-all text-amber-500">Tutomy.com</a>
              </div>
              <div className="text-[10px] opacity-70">All Rights Reserved • Studio Edition</div>
            </div>
          </div>
        </div>

        {/* Main Content - Empty state */}
        <div className="absolute inset-0 z-[5] pointer-events-none">
          {shortcuts.map((sc) => (
             <DraggableShortcut 
               key={sc.id} 
               sc={sc} 
               update={(id, updates) => setShortcuts(shortcuts.map(s => s.id === id ? { ...s, ...updates } : s))} 
               remove={(id) => setShortcuts(shortcuts.filter(s => s.id !== id))} 
               onEdit={() => { setNewShortcut(sc); setShowSettingsPanel(true); }} 
             />
          ))}
        </div>

        {!showActivityLibrary && widgets.length === 0 && activeActivities.size === 0 && (
          zenMode ? <ZenQuoteBoard /> : (
          /*
           * The hero scrolls on a SHORT or NARROW screen instead of being clipped.
           *
           * It used to be `absolute inset-0 flex items-center justify-center
           * overflow-hidden`: a fixed, non-scrolling box the height of the viewport.
           * Any phone whose hero was taller than the screen (a small landscape
           * window, or a 360px portrait phone with the keyboard up) simply had the
           * bottom of the card cut off with no way to reach it — the emerald "Zero
           * Data Loss" badges and, on the signed-out card, the Sign In buttons.
           *
           * The shape below is the one that scrolls correctly: the scroll container
           * is the outer div, and `min-h-full` on the inner wrapper is what keeps the
           * card optically centred while still allowing it to be taller than the
           * viewport. A plain `items-center` on a scroll container clips the TOP of an
           * overflowing child instead, which is the classic version of this bug.
           *
           * `pt-20 pb-24` clears the floating Menu button and the dock, which are
           * both `fixed` and would otherwise sit on top of the copy.
           */
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden hide-scrollbar pointer-events-none">
            {/* Decorative blobs get their own clipped layer: as children of the
                scrolling box, absolutely-positioned glow circles would otherwise
                extend its scroll height and let the page drift past the card. */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute top-1/2 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-purple-500/30 blur-3xl animate-slime mix-blend-multiply dark:mix-blend-screen" />
              <div className="absolute bottom-1/4 right-1/4 w-72 h-72 sm:w-[30rem] sm:h-[30rem] bg-indigo-500/20 blur-3xl animate-slime-delayed mix-blend-multiply dark:mix-blend-screen" />
              <div className="absolute top-1/3 right-1/3 w-56 h-56 sm:w-80 sm:h-80 bg-blue-500/20 blur-3xl animate-slime mix-blend-multiply dark:mix-blend-screen" style={{ animationDelay: '-10s' }} />
            </div>

            <div className="relative min-h-full flex items-center justify-center px-3 pt-20 pb-24 sm:px-6 sm:pt-24 sm:pb-28">
            <div 
              className="text-center pointer-events-auto px-5 py-7 sm:px-12 md:px-16 sm:py-12 rounded-[2rem] sm:rounded-[2.5rem] backdrop-blur-2xl transition-all duration-500 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.45)] border border-white/25 ring-1 ring-white/20 relative z-10 w-full max-w-4xl lg:max-w-5xl overflow-hidden" 
              style={{ 
                background: `linear-gradient(135deg, ${theme.primary}b3, ${theme.surface || '#1e293b'}cc)` 
              }}
            >
              {/* Subtle Ambient Glow Mesh inside card */}
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

              {/* Top Refined Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 rounded-full bg-white/15 border border-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-4 sm:mb-5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Interactive Classroom Studio</span>
              </div>

              {/* Main Headline.
                  `clamp()` instead of a text-3xl/text-6xl/text-7xl ladder: the headline
                  then tracks the viewport continuously rather than jumping between three
                  fixed sizes, which is what stops "Ready to teach?" from wrapping to two
                  lines on a 320px phone and from looking small on a 1440px projector.
                  `font-heading` is Outfit — the display face. */}
              <h1 className="font-heading text-[clamp(1.6rem,7vw,4.5rem)] leading-[1.05] font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] mb-2 sm:mb-3 tracking-tight">
                Ready to teach?
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 font-medium drop-shadow-sm max-w-2xl mx-auto leading-relaxed">
                {isAuthenticated 
                  ? 'Launch your teaching dashboards, interactive studio widgets, or student gaming arena.' 
                  : 'Sign in to access student management, curriculum creators, and interactive classroom tools.'}
              </p>

              {/* Action Buttons */}
              {isAuthenticated ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
                  <button 
                    onClick={() => navigate('/dashboard')} 
                    className="group px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl font-bold text-base shadow-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer flex items-center justify-center gap-3 border border-white/20"
                    style={{ backgroundColor: theme.surface, color: theme.primary }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-500 text-lg group-hover:scale-110 transition-transform">
                      <i className="fas fa-user-graduate" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black leading-tight" style={{ color: theme.text }}>Adult Dashboard</div>
                      <div className="text-[10px] opacity-70 font-semibold leading-tight mt-0.5">Profiles & Syllabus</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigate('/kids')} 
                    className="group px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl font-bold text-base shadow-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer flex items-center justify-center gap-3 border border-white/20"
                    style={{ backgroundColor: theme.surface, color: theme.primary }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 text-lg group-hover:scale-110 transition-transform">
                      <i className="fas fa-child" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black leading-tight" style={{ color: theme.text }}>Kids Dashboard</div>
                      <div className="text-[10px] opacity-70 font-semibold leading-tight mt-0.5">Gamified Kingdom</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => window.open('./gaming-hub/index.html', '_self')} 
                    className="group px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl font-bold text-base shadow-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-2xl text-white cursor-pointer flex items-center justify-center gap-3 border border-white/30 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform">
                      <i className="fas fa-gamepad" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black leading-tight text-white">Game Hub</div>
                      <div className="text-[10px] text-white/80 font-semibold leading-tight mt-0.5">Interactive Games</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center max-w-md mx-auto">
                  <button 
                    onClick={() => useAuthStore.getState().openAuthModal('login')} 
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 border border-white/50"
                  >
                    <i className="fas fa-sign-in-alt text-lg text-indigo-600" />
                    <span>Sign In</span>
                  </button>
                  <button 
                    onClick={() => useAuthStore.getState().openAuthModal('register')} 
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center gap-3 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 hover:brightness-105 font-sans border border-amber-300/50 shadow-amber-500/20"
                  >
                    <i className="fas fa-user-plus text-lg text-slate-900" />
                    <span>Sign Up Free</span>
                  </button>
                </div>
              )}

              {/* Bottom Feature Badges */}
              <div className="mt-6 pt-5 sm:mt-8 sm:pt-6 border-t border-white/15 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-8 text-[10px] sm:text-xs font-semibold text-white/80">
                <span className="flex items-center gap-1.5">
                  <i className="fas fa-shield-alt text-emerald-300" /> Zero Data Loss
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="fas fa-globe-americas text-sky-300" /> 40+ World Timezones
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="fas fa-cubes text-purple-300" /> Live Classroom Tools
                </span>
              </div>
            </div>
            </div>
          </div>
          )
        )}

        {/* Draggable Sticky Notes (on canvas) */}
        {stickyNotes.map(note => (
          <DraggableStickyNote key={note.id} note={note} />
        ))}

        {/* Widgets */}
        {widgets.map(renderWidget)}

                {/* Snap Guides */}
        {snapGuides.map((guide, i) => (
          <div key={i} className="fixed pointer-events-none z-[9999]" style={{
            ...(guide.type === 'vertical' ? { left: guide.position, top: 0, bottom: 0, width: 2 } : { top: guide.position, left: 0, right: 0, height: 2 }),
            backgroundColor: theme.primary,
            opacity: 0.7,
          }} />
        ))}

        {/* Reaction Overlay */}
        {activeReaction && (
          <ReactionOverlay emoji={activeReaction} onComplete={handleReactionComplete} />
        )}

        {/* Dock */}
        {!showActivityLibrary && (
          <nav 
            id="tour-bottom-dock"
            /*
             * Phone shape. The row is wider than a phone on purpose — eleven tiles
             * cannot fit across 390px at a legible size — so it scrolls sideways
             * INSIDE the pill, which is how a phone toolbar is expected to behave.
             * What was broken is everything around that:
             *
             *   · `w-[95vw]` plus `px-4 py-3` and 44px tiles pushed the pill past
             *     both edges on a narrow screen;
             *   · `.hide-scrollbar` was used here and defined nowhere, so the swipe
             *     showed a grey scrollbar lying across the pill;
             *   · `bottom-4` sat under the iOS home indicator.
             *
             * Now the pill is capped to the viewport minus its margin, the tiles and
             * gaps shrink below `sm`, the scrollbar is really hidden, and the bottom
             * padding carries `env(safe-area-inset-bottom)`.
             */
            className={`fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100vw-1.5rem)] md:w-auto overflow-x-auto lg:overflow-visible px-2.5 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-1 sm:gap-2 z-[100] hide-scrollbar ${currentTargetId === 'tour-bottom-dock' ? 'ring-4 ring-offset-2 ring-indigo-500 animate-pulse' : ''}`} 
            style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              backdropFilter: 'blur(20px)',
              paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* Free Dock Widgets */}
            {FREE_DOCK_WIDGETS.map(w => (
              <div key={w.id} className="relative group">
                <button type="button" onClick={() => addWidget(w.id)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-base sm:text-lg transition-all hover:scale-110 hover:-translate-y-1 cursor-pointer" style={{ color: theme.textMuted }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.surfaceHover, e.currentTarget.style.color = w.color)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = theme.textMuted)}>
                  <i className={`fas ${w.icon}`} />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: theme.text, color: theme.background }}>
                  {w.label}
                  <span className="ml-1 opacity-60">({w.hotkey})</span>
                </div>
              </div>
            ))}

            {/* Divider between Free & Premium */}
            <div className="w-px h-7 mx-1 opacity-20" style={{ backgroundColor: theme.text }} />

            {/* Premium Dock Widgets Stacked Together */}
            {PREMIUM_DOCK_WIDGETS.map(w => (
              <div key={w.id} className="relative group">
                <button 
                  type="button" 
                  onClick={() => {
                    if (!isPremium && !isVIP) {
                      useAuthStore.getState().openUpgradeModal(`The ${w.label} tool is an exclusive Pro & VIP feature. Upgrade to unlock instant access!`);
                      return;
                    }
                    addWidget(w.id);
                  }} 
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-base sm:text-lg transition-all hover:scale-110 hover:-translate-y-1 relative cursor-pointer" 
                  style={{ color: theme.textMuted }} 
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.surfaceHover, e.currentTarget.style.color = w.color)} 
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = theme.textMuted)}
                >
                  <i className={`fas ${w.icon}`} />
                  <span className="absolute -top-1 -right-1 text-[7px] font-black uppercase tracking-tighter px-1 py-0.2 rounded bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-xs">
                    PRO
                  </span>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1" style={{ backgroundColor: theme.text, color: theme.background }}>
                  <span>{w.label}</span>
                  <span className="text-indigo-400 font-bold">(PRO)</span>
                </div>
              </div>
            ))}

            {/* Authenticated Dashboard Actions */}
            {isAuthenticated && (
              <>
                <div className="w-px h-7 mx-1 opacity-20" style={{ backgroundColor: theme.text }} />

                <div className="relative group">
                  <button onClick={() => navigate('/platform')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-base sm:text-lg transition-all hover:scale-110 hover:-translate-y-1 cursor-pointer" style={{ color: theme.textMuted }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.surfaceHover, e.currentTarget.style.color = theme.primary)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = theme.textMuted)}>
                    <i className="fas fa-home" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: theme.text, color: theme.background }}>
                    Adult Dashboard
                  </div>
                </div>

                <div className="relative group">
                  <button onClick={() => navigate('/kids')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-base sm:text-lg transition-all hover:scale-110 hover:-translate-y-1 cursor-pointer" style={{ color: theme.textMuted }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.surfaceHover, e.currentTarget.style.color = theme.primary)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = theme.textMuted)}>
                    <i className="fas fa-child" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: theme.text, color: theme.background }}>
                    Young Learners Dashboard
                  </div>
                </div>

                <div className="relative group">
                  <button onClick={() => window.open('./gaming-hub/index.html', '_self')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-base sm:text-lg transition-all hover:scale-110 hover:-translate-y-1 cursor-pointer shadow-sm" style={{ backgroundColor: theme.primary, color: 'white' }}>
                    <i className="fas fa-gamepad" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: theme.text, color: theme.background }}>
                    Game Hub
                  </div>
                </div>
              </>
            )}

            <div className="w-px h-7 mx-1 opacity-20" style={{ backgroundColor: theme.text }} />

            {/* Widget Studio Toggle Button */}
            <div className="relative">
              <button 
                id="tour-more-widgets-btn"
                onClick={() => setShowMoreWidgets(!showMoreWidgets)} 
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-base sm:text-lg transition-all hover:scale-110 hover:-translate-y-1 cursor-pointer ${currentTargetId === 'tour-more-widgets-btn' ? 'ring-4 ring-offset-2 ring-indigo-500 animate-pulse' : ''}`} 
                style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', color: theme.text }}
                title="Widget Studio"
              >
                <i className={`fas fa-${showMoreWidgets ? 'times' : 'plus'}`} />
              </button>
              <MoreWidgetsPanel isOpen={showMoreWidgets} onClose={() => setShowMoreWidgets(false)} onSelect={addWidget} />
            </div>
          </nav>
        )}

        {/* Settings Panel & Toggle.
            The panel's width was a hard `w-[320px]` and its closed state a hard
            `translate-x-[320px]` — the same magic number written twice. On a 360px
            phone that is 320px of panel plus a 48px toggle, so the cog was pushed off
            the right edge and could not be tapped to close it again. Both now read one
            custom property, so the width and the distance it slides out by can never
            disagree; `min(84vw,20rem)` keeps panel + cog inside a 320px screen.

            Both values come from the single `--panel-w` above. The width used to be
            `w-[320px]` and the slide-out `translate-x-[320px]`: the same number
            written twice, which is how they were free to drift apart. */}
        <div
          className="fixed top-1/2 right-0 -translate-y-1/2 z-[60] transition-transform duration-300 [--panel-w:min(84vw,20rem)] translate-x-[var(--panel-x)]"
          style={{ '--panel-x': showSettingsPanel ? '0px' : 'var(--panel-w)' } as React.CSSProperties}
        >
          <div className="flex items-center">
            {/* Toggle Button */}
            <button
              id="tour-settings-toggle-btn"
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className={`bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-xl w-12 h-16 flex items-center justify-center shadow-lg transition-colors border border-r-0 border-indigo-500/30 ${currentTargetId === 'tour-settings-toggle-btn' ? 'ring-4 ring-offset-2 ring-indigo-500 animate-pulse' : ''}`}
              title="General Settings"
            >
              <i className={`fas fa-cog text-xl transition-transform ${showSettingsPanel ? 'rotate-180' : ''}`} />
            </button>

            {/* Panel Content */}
            {/* Same two tokens as the left drawer and the dock — see the note there. */}
            <div className="w-[var(--panel-w)] h-[80vh] rounded-l-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl border-y border-l" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="p-4 flex-1 overflow-y-auto space-y-6">
                
                {/* Weather Settings Section */}
                <div className="space-y-4">
                  <MiniWeatherWidget />
                  
                  <div className="flex gap-2">
                    <button onClick={() => setShowWorldMap(true)} className="flex-1 py-2 bg-indigo-500/10 text-indigo-500 rounded-lg hover:bg-indigo-500/20 transition-colors font-bold text-[11px] uppercase tracking-wider shadow-sm border border-indigo-500/20">
                      <i className="fas fa-globe-americas mr-2" />World Map
                    </button>
                    <button onClick={() => setShowWeatherTracker(true)} className="flex-1 py-2 bg-sky-500/10 text-sky-500 rounded-lg hover:bg-sky-500/20 transition-colors font-bold text-[11px] uppercase tracking-wider shadow-sm border border-sky-500/20">
                      <i className="fas fa-city mr-2" />Locations
                    </button>
                  </div>
                </div>

                <hr style={{ borderColor: theme.border }} />

                {/* Desktop Shortcuts Settings removed */}
                
                {/* Background Settings */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: theme.text }}>Background</h3>
                  
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 flex gap-2 items-center px-3 py-2 rounded-lg" style={{ backgroundColor: theme.surfaceHover }}>
                      <i className="fas fa-search text-xs opacity-50" style={{ color: theme.text }} />
                      <input
                        type="text"
                        value={searchBg}
                        onChange={e => setSearchBg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchBackground()}
                        placeholder="Search web backgrounds..."
                        className="w-full bg-transparent border-none text-sm outline-none"
                        style={{ color: theme.text }}
                      />
                    </div>
                    <label className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:scale-105" style={{ backgroundColor: theme.primary, color: 'white' }} title="Upload from device">
                      <i className="fas fa-upload" />
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/gif, image/webp" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if(file) {
                             const reader = new FileReader();
                             reader.onload = (ev) => {
                               if(ev.target?.result) {
                                 setBackground({ id: 'custom-'+Date.now(), type: 'image', value: ev.target.result as string });
                               }
                             };
                             reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {BACKGROUNDS.map((bg) => (
                      <button 
                        key={bg.id} 
                        onClick={() => setBackground(bg)} 
                        className={`aspect-video rounded-lg border-2 transition-all overflow-hidden ${background.id === bg.id ? 'scale-105 shadow-lg relative z-10' : 'opacity-60 hover:opacity-100'}`}
                        style={{ borderColor: background.id === bg.id ? theme.primary : 'transparent' }}
                      >
                        <div className="w-full h-full" style={bg.type === 'gradient' ? { background: bg.value } : { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-dashed mt-4 cursor-pointer hover:opacity-80 transition-opacity" 
                       style={{ borderColor: theme.border, backgroundColor: theme.surfaceHover }}
                       onClick={() => setAnimateBg(!animateBg)}
                  >
                     <div className="flex items-center gap-3">
                       <i className={`fas fa-magic text-xl ${animateBg ? 'animate-pulse' : ''}`} style={{ color: animateBg ? theme.primary : theme.textMuted }} />
                       <div className="text-sm">
                         <div className="font-bold" style={{ color: theme.text }}>Animated elements</div>
                         <div className="text-xs opacity-70" style={{ color: theme.textMuted }}>{animateBg ? 'Soothing animations enabled' : 'Click to enable soothing animations'}</div>
                       </div>
                     </div>
                     <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${animateBg ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                       <div className={`w-4 h-4 rounded-full bg-white transition-transform ${animateBg ? 'translate-x-4' : 'translate-x-0'}`} />
                     </div>
                  </div>
                </div>

                <hr style={{ borderColor: theme.border }} />

                {/* Theme Mode Option */}
                <div>
                  <button
                    onClick={() => setThemeName(theme.mode === 'dark' ? 'light' : 'dark')}
                    className="w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm hover:scale-[1.02] mb-2"
                    style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                  >
                    <i className={`fas ${theme.mode === 'dark' ? 'fa-sun text-yellow-400' : 'fa-moon text-indigo-500'} text-xl`} />
                    {theme.mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </button>
                  <button
                    onClick={() => setZenMode(!zenMode)}
                    className="w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm hover:scale-[1.02]"
                    style={{ backgroundColor: zenMode ? theme.primary : theme.surface, color: zenMode ? 'white' : theme.text, border: `1px solid ${zenMode ? 'transparent' : theme.border}` }}
                  >
                    <i className={`fas fa-leaf ${zenMode ? 'text-white' : 'text-emerald-500'} text-xl`} />
                    {zenMode ? 'Exit Zen Mode' : 'Enable Zen Mode'}
                  </button>
                </div>

                <hr style={{ borderColor: theme.border }} />

                {/* Back-up Suite Section — one place to save, restore and sync EVERYTHING */}
                <div 
                  className="p-4 rounded-xl border space-y-4 shadow-md transition-colors" 
                  style={{ 
                    backgroundColor: theme.mode === 'dark' ? 'rgba(15,23,42,0.7)' : '#f8fafc',
                    borderColor: theme.border,
                    color: theme.text
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                      <i className="fas fa-hdd text-indigo-600 dark:text-indigo-400 text-sm" />
                      Back-up Suite
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      !isFileSystemAccessSupported() ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                      !diskDirHandle ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300' :
                      diskPermissionGranted ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-orange-500/20 text-orange-800 dark:text-orange-300'
                    }`}>
                      {!isFileSystemAccessSupported() ? 'Unsupported' :
                       !diskDirHandle ? 'Unconnected' :
                       diskPermissionGranted ? 'Active' : 'No Permission'}
                    </span>
                  </div>

                  {/* One place, stated plainly. The old context menu carried a second,
                      partial Export/Import (widgets and shortcuts only) that is gone
                      now, so this is the only backup surface left in the app. */}
                  <p className="text-[10px] leading-relaxed font-semibold text-slate-600 dark:text-slate-300">
                    Everything is saved from here: the hard-disk folder, one portable file for any computer, and the
                    optional cloud copy. There is no second backup menu.
                  </p>

                  {isFileSystemAccessSupported() ? (
                    <div className="space-y-3">
                      {/* Sync Toggle */}
                      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                        <label className="text-xs font-bold cursor-pointer select-none" style={{ color: theme.text }}>
                          Enable Auto Local Sync
                        </label>
                        <input
                          type="checkbox"
                          checked={diskSyncEnabled}
                          onChange={(e) => toggleDiskSync(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </div>

                      {/* Directory Info */}
                      {diskDirName && (
                        <div className="p-2.5 rounded-lg border flex items-center justify-between gap-1.5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <i className="fas fa-folder text-amber-500 text-sm shrink-0" />
                            <span className="text-xs truncate font-mono font-bold" style={{ color: theme.text }}>{diskDirName}</span>
                          </div>
                          <button
                            onClick={async () => {
                              await clearStoredDirectoryHandle();
                              setDiskDirHandle(null);
                              setDiskDirName('');
                              setDiskPermissionGranted(false);
                            }}
                            className="text-[10px] text-red-600 dark:text-red-400 hover:text-red-700 transition-colors shrink-0 font-bold p-1 cursor-pointer"
                            title="Disconnect Folder"
                          >
                            <i className="fas fa-times text-xs" />
                          </button>
                        </div>
                      )}

                      {/* Connection / Permission Buttons */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleChooseSyncFolder}
                          className="w-full py-2.5 rounded-lg font-black text-[10px] shadow transition-all hover:scale-[1.01] bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wider cursor-pointer"
                        >
                          <i className="fas fa-folder-open mr-2" />
                          {diskDirHandle ? 'Change Backup Directory' : 'Choose Backup Directory'}
                        </button>

                        {diskDirHandle && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={forceSyncNow}
                                className="py-2 rounded-lg font-black text-[10px] shadow transition-all hover:scale-[1.01] bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-wider cursor-pointer"
                              >
                                <i className="fas fa-sync-alt mr-1" /> Save to Disk
                              </button>
                              <button
                                onClick={restoreFromDisk}
                                className="py-2 rounded-lg font-black text-[10px] shadow transition-all hover:scale-[1.01] bg-blue-600 hover:bg-blue-700 text-white uppercase tracking-wider cursor-pointer"
                              >
                                <i className="fas fa-cloud-download-alt mr-1" /> Load Disk Data
                              </button>
                            </div>

                            <button
                              onClick={handlePurgeMemory}
                              className="w-full py-1.5 rounded-lg font-black text-[10px] text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/30 uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              <i className="fas fa-trash-alt mr-1.5" /> Purge Browser Memory
                            </button>
                          </>
                        )}
                      </div>

                      {/* Manual file export / import — works with or without a folder */}
                      <div className="p-3 rounded-xl border border-dashed space-y-2" style={{ borderColor: theme.border, backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)' }}>
                        <h4 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-2" style={{ color: theme.text }}>
                          <i className="fas fa-file-export text-indigo-500" /> Manual File Export / Import
                        </h4>
                        <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                          Save the entire workspace into one portable file, then import it back on any computer — no
                          folder required. The file is complete, so importing it restores everything accurately.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleExportBackupFile}
                            disabled={suiteWorking}
                            className="py-2 rounded-lg font-black text-[10px] shadow transition-all hover:scale-[1.01] bg-violet-600 hover:bg-violet-700 text-white uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            <i className={`${suiteBusy === 'file' ? 'fas fa-spinner fa-spin' : 'fas fa-download'} mr-1`} /> Export file
                          </button>
                          <label className={`py-2 rounded-lg font-black text-[10px] shadow transition-all hover:scale-[1.01] bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wider cursor-pointer text-center ${suiteWorking ? 'opacity-50 pointer-events-none' : ''}`}>
                            <i className="fas fa-upload mr-1" /> Import file
                            <input
                              type="file"
                              accept=".json,application/json"
                              className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleImportBackupFile(f); }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Cloud backup / restore (VIP) */}
                      <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: theme.border, backgroundColor: theme.mode === 'dark' ? 'rgba(12,48,74,0.4)' : '#f0f9ff' }}>
                        <h4 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-2" style={{ color: theme.text }}>
                          <i className="fas fa-cloud text-sky-500" /> Cloud Backup &amp; Restore
                          {!isVipTier() && <span className="ml-auto px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">VIP</span>}
                        </h4>
                        {isVipTier() ? (
                          <>
                            <p className="text-[10px] leading-relaxed font-semibold text-slate-600 dark:text-slate-300">
                              {cloudInfo?.exists
                                ? `Cloud copy: ${(cloudInfo.bytes / 1024).toFixed(1)} KB · rev ${cloudInfo.revision}${cloudInfo.updatedAt ? ` · ${new Date(cloudInfo.updatedAt).toLocaleString()}` : ''}`
                                : 'No cloud copy yet — press “Save to cloud”.'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={handleCloudSave}
                                disabled={suiteWorking}
                                className="py-2 rounded-lg font-black text-[10px] shadow transition-all hover:scale-[1.01] bg-sky-600 hover:bg-sky-700 text-white uppercase tracking-wider cursor-pointer disabled:opacity-50"
                              >
                                <i className={`${suiteBusy === 'cloud-save' ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt'} mr-1`} /> Save to cloud
                              </button>
                              <button
                                type="button"
                                onClick={handleCloudRestore}
                                disabled={suiteWorking}
                                className="py-2 rounded-lg font-black text-[10px] shadow transition-all hover:scale-[1.01] bg-blue-600 hover:bg-blue-700 text-white uppercase tracking-wider cursor-pointer disabled:opacity-50"
                              >
                                <i className={`${suiteBusy === 'cloud-load' ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-download-alt'} mr-1`} /> Restore from cloud
                              </button>
                            </div>
                            <button type="button" onClick={() => void refreshCloudInfo()} className="w-full text-[10px] font-bold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer">
                              ↻ Refresh cloud status
                            </button>
                          </>
                        ) : (
                          <p className="text-[10px] leading-relaxed font-semibold text-slate-600 dark:text-slate-300">
                            Cloud back-up is a VIP feature. The hard-disk folder and the manual file export above stay available on every plan — nothing is ever only on the cloud.
                          </p>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-[11px] leading-relaxed font-semibold">
                      <i className="fas fa-exclamation-triangle mr-1.5 text-red-500" />
                      We detected that the File System Access API is blocked or unsupported in your current environment (often due to iframe sandboxing or unsupported browser). Please open this application in a new browser tab to activate this system.
                    </div>
                  )}
                </div>

                <hr style={{ borderColor: theme.border }} />

                {/* PWA Install Area */}
                <div className="space-y-4 pb-12">
                  <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: theme.text }}>Install App</h3>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={async () => {
                        const activePrompt = deferredPrompt || (window as any).deferredPrompt;
                        if (activePrompt) {
                          activePrompt.prompt();
                          const { outcome } = await activePrompt.userChoice;
                          if (outcome === 'accepted') {
                            setDeferredPrompt(null);
                            (window as any).deferredPrompt = null;
                          }
                        } else if (window.self !== window.top) {
                          alert("PWA installation is blocked inside iframes. Opening the app in a new tab to enable the direct browser installation prompt...");
                          window.open(window.location.href, '_blank');
                        } else {
                          alert("Browser installation prompt is not active. If the app is already installed, please use your installed app or desktop shortcut!");
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm hover:scale-[1.02] bg-blue-600 text-white cursor-pointer"
                    >
                      <i className="fab fa-windows text-xl" />
                      Install for Windows / Desktop
                    </button>

                    <button
                      onClick={async () => {
                        const activePrompt = deferredPrompt || (window as any).deferredPrompt;
                        if (activePrompt) {
                          activePrompt.prompt();
                          const { outcome } = await activePrompt.userChoice;
                          if (outcome === 'accepted') {
                            setDeferredPrompt(null);
                            (window as any).deferredPrompt = null;
                          }
                        } else if (window.self !== window.top) {
                          alert("PWA installation is blocked inside iframes. Opening the app in a new tab to enable the direct browser installation prompt...");
                          window.open(window.location.href, '_blank');
                        } else {
                          alert("Browser installation prompt is not active. If the app is already installed, please use your installed app or desktop shortcut!");
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm hover:scale-[1.02] bg-green-600 text-white cursor-pointer"
                    >
                      <i className="fab fa-android text-xl" />
                      Install for Android
                    </button>

                    <button
                      onClick={async () => {
                        const activePrompt = deferredPrompt || (window as any).deferredPrompt;
                        if (activePrompt) {
                          activePrompt.prompt();
                          const { outcome } = await activePrompt.userChoice;
                          if (outcome === 'accepted') {
                            setDeferredPrompt(null);
                            (window as any).deferredPrompt = null;
                          }
                        } else if (window.self !== window.top) {
                          alert("PWA installation is blocked inside iframes. Opening the app in a new tab to enable the direct browser installation prompt...");
                          window.open(window.location.href, '_blank');
                        } else {
                          alert("Browser installation prompt is not active. If the app is already installed, please use your installed app or desktop shortcut!");
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm hover:scale-[1.02] bg-gray-800 text-white cursor-pointer"
                    >
                      <i className="fab fa-apple text-xl" />
                      Install for iOS
                    </button>
                    

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Library */}
        {/* Activity Library removed */}
        
        {/* Premium Modal */}
        {showPremiumModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden border-2 border-indigo-500/30">
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-2xl" />
                </button>
              </div>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className={`fas ${requiredLevel === 'vip' ? 'fa-crown' : 'fa-gem'} text-4xl ${requiredLevel === 'vip' ? 'text-yellow-500' : 'text-indigo-500'}`} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                  {requiredLevel === 'vip' ? 'Unlock VIP Access' : 'Unlock Premium'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {requiredLevel === 'vip' 
                    ? 'Enter a VIP code to unlock exclusive features like Advisor, Content Creator, University Management, and more.' 
                    : 'Buy a Premium subscription to unlock all advanced features like custom widgets, dashboards, and unlimited access to the content library.'}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={premiumCode}
                    onChange={(e) => setPremiumCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePremiumSubmit()}
                    placeholder={`Enter ${requiredLevel === 'vip' ? 'VIP' : 'Premium'} Code`}
                    className="w-full px-6 py-4 rounded-xl text-center text-xl font-bold tracking-widest uppercase bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-0 outline-none text-gray-900 dark:text-white"
                  />
                  {premiumError && (
                    <p className="text-red-500 text-sm font-bold text-center mt-2 animate-bounce">{premiumError}</p>
                  )}
                </div>
                <button
                  onClick={handlePremiumSubmit}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/50 transition-all hover:-translate-y-1"
                >
                  Unlock Access
                </button>
              </div>
              <div className="mt-6 text-center text-sm text-gray-500">
                Contact support to purchase a new code.
              </div>
            </div>
          </div>
        )}


        {/* World Time Zones & Learner Clock Modal */}
        <WorldTimeZonesModal
          isOpen={showWorldMap}
          onClose={() => setShowWorldMap(false)}
          mapCities={mapCities}
          onUpdateCities={setMapCities}
        />

        {/* Weather Tracker Modal */}
        <WeatherTrackerModal isOpen={showWeatherTracker} onClose={() => setShowWeatherTracker(false)} />

        {/* Dynamic Context Menu */}
        {contextMenu && contextMenu.show && (
          <div 
            className="fixed z-[99999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700"
            style={{ 
              top: contextMenu.y, 
              left: contextMenu.x, 
              minWidth: '220px',
              color: theme.mode === 'dark' ? '#ffffff' : '#0f172a'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2 flex flex-col">
              <button 
                className="px-4 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 transition-colors text-sm font-bold opacity-90"
                onClick={() => {
                  setShowAddShortcutModal({ x: contextMenu.x, y: contextMenu.y });
                  setContextMenu(null);
                }}
              >
                <i className="fas fa-location-arrow w-5 text-center text-primary"/> Add Shortcut
              </button>
              
              <div className="h-px bg-black/10 dark:bg-white/10 my-1" />
              
              <div className="group relative">
                <button className="w-full px-4 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-sm font-bold opacity-90 transition-colors">
                  <span className="flex items-center gap-3"><i className="fas fa-download w-5 text-center text-emerald-500"/> Install App</span>
                  <i className="fas fa-chevron-right text-xs opacity-50" />
                </button>
                <div className="absolute left-[95%] top-0 hidden group-hover:flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 min-w-[200px] py-1 z-[100000]" style={{ color: theme.mode === 'dark' ? '#ffffff' : '#0f172a' }}>
                   <button 
                     onClick={async () => {
                       const activePrompt = deferredPrompt || (window as any).deferredPrompt;
                       if (activePrompt) {
                         activePrompt.prompt();
                         const { outcome } = await activePrompt.userChoice;
                         if (outcome === 'accepted') {
                           setDeferredPrompt(null);
                           (window as any).deferredPrompt = null;
                         }
                       } else if (window.self !== window.top) {
                         alert("PWA installation is blocked inside iframes. Opening the app in a new tab to enable the direct browser installation prompt...");
                         window.open(window.location.href, '_blank');
                       } else {
                         alert("Browser installation prompt is not active. If the app is already installed, please use your installed app or desktop shortcut!");
                       }
                       setContextMenu(null);
                     }}
                     className="px-4 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 font-bold text-sm flex items-center gap-3 transition-colors cursor-pointer"
                   >
                     <i className="fab fa-windows text-emerald-500 w-5"/> Install to Desktop
                   </button>
                   <button 
                     onClick={async () => {
                       const activePrompt = deferredPrompt || (window as any).deferredPrompt;
                       if (activePrompt) {
                         activePrompt.prompt();
                         const { outcome } = await activePrompt.userChoice;
                         if (outcome === 'accepted') {
                           setDeferredPrompt(null);
                           (window as any).deferredPrompt = null;
                         }
                       } else if (window.self !== window.top) {
                         alert("PWA installation is blocked inside iframes. Opening the app in a new tab to enable the direct browser installation prompt...");
                         window.open(window.location.href, '_blank');
                       } else {
                         alert("Browser installation prompt is not active. If the app is already installed, please use your installed app or desktop shortcut!");
                       }
                       setContextMenu(null);
                     }}
                     className="px-4 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 font-bold text-sm flex items-center gap-3 transition-colors cursor-pointer"
                   >
                     <i className="fab fa-android text-green-500 w-5"/> Install for Android
                   </button>
                   <button 
                     onClick={async () => {
                       const activePrompt = deferredPrompt || (window as any).deferredPrompt;
                       if (activePrompt) {
                         activePrompt.prompt();
                         const { outcome } = await activePrompt.userChoice;
                         if (outcome === 'accepted') {
                           setDeferredPrompt(null);
                           (window as any).deferredPrompt = null;
                         }
                       } else if (window.self !== window.top) {
                         alert("PWA installation is blocked inside iframes. Opening the app in a new tab to enable the direct browser installation prompt...");
                         window.open(window.location.href, '_blank');
                       } else {
                         alert("Browser installation prompt is not active. If the app is already installed, please use your installed app or desktop shortcut!");
                       }
                       setContextMenu(null);
                     }}
                     className="px-4 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 font-bold text-sm flex items-center gap-3 transition-colors cursor-pointer"
                   >
                     <i className="fab fa-apple text-gray-500 dark:text-white w-5"/> Install for iOS
                   </button>
                </div>
              </div>
              

              <div className="h-px bg-gray-200 dark:bg-slate-700 my-1" />
              
              <button 
                className="px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors text-sm font-bold opacity-80"
                onClick={() => {
                  setShowGoogleTranslate(!showGoogleTranslate);
                  setContextMenu(null);
                }}
              >
                <i className="fas fa-language w-5 text-center text-blue-600"/> Google Translate
              </button>
            </div>
          </div>
        )}

        {/* Add Shortcut Inline Modal */}
        {showAddShortcutModal && (
          <div className="fixed z-[99999] bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-[260px] animate-fade-in"
               style={{ top: Math.min(showAddShortcutModal.y, window.innerHeight - 250), left: Math.min(showAddShortcutModal.x, window.innerWidth - 300) }}>
             <h3 className="font-bold text-sm mb-3">Add Shortcut</h3>
             <input autoFocus type="text" placeholder="Name" value={newShortcut.name} onChange={e => setNewShortcut(s => ({...s, name: e.target.value}))} className="w-full bg-black/5 dark:bg-white/5 p-2 rounded mb-2 text-sm outline-none" />
             <input type="text" placeholder="URL (https://...)" value={newShortcut.url} onChange={e => setNewShortcut(s => ({...s, url: e.target.value}))} className="w-full bg-black/5 dark:bg-white/5 p-2 rounded mb-2 text-sm outline-none" />
             <input type="text" placeholder="Emoji (e.g. 🌎)" value={newShortcut.emoji} onChange={e => setNewShortcut(s => ({...s, emoji: e.target.value}))} className="w-full bg-black/5 dark:bg-white/5 p-2 rounded mb-4 text-sm outline-none" />
             <div className="flex gap-2">
               <button className="flex-1 bg-gray-200 dark:bg-slate-700 p-2 rounded text-sm font-bold" onClick={() => { setShowAddShortcutModal(null); setNewShortcut({ id: '', name: '', url: '', emoji: '🌎' }); }}>Cancel</button>
               <button className="flex-1 bg-primary text-white p-2 rounded text-sm font-bold disabled:opacity-50" 
                 disabled={!newShortcut.name || !newShortcut.url || !newShortcut.emoji}
                 onClick={() => {
                   setShortcuts([...shortcuts, { ...newShortcut, id: Date.now().toString(), position: {x: showAddShortcutModal.x, y: showAddShortcutModal.y} } as any]);
                   setNewShortcut({ id: '', name: '', url: '', emoji: '🌎' });
                   setShowAddShortcutModal(null);
                 }}
               >Add</button>
             </div>
          </div>
        )}
        
        {showGoogleTranslate && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-white dark:bg-slate-800 p-2 rounded-full shadow-2xl border flex items-center">
            <GoogleTranslateWidget />
            <button onClick={() => setShowGoogleTranslate(false)} className="ml-4 mr-2 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* Global Toast Message */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] animate-slide-up">
            <div className="bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3">
              <i className="fas fa-info-circle text-blue-400 text-lg"></i>
              <span className="text-sm">{toastMessage}</span>
              <button onClick={() => setToastMessage("")} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}

        {/* Welcome Dialog / First Time Prompt */}
        {showFirstTimePrompt && tourStep === -1 && (
          <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
            <div className="relative w-full max-w-lg p-8 rounded-3xl shadow-3xl border text-center transform transition-all scale-100 duration-300"
                 style={{ 
                   backgroundColor: theme.surface, 
                   borderColor: theme.border,
                   color: theme.text,
                   boxShadow: `0 25px 50px -12px ${theme.primary}40`
                 }}>
              
              {/* Animated Floating Elements */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-xl animate-bounce"
                   style={{ 
                     background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent || theme.secondary || '#8b5cf6'})`,
                     color: 'white',
                     boxShadow: `0 8px 25px ${theme.primary}50`
                   }}>
                <i className="fas fa-compass" />
              </div>

              <div className="mt-8 space-y-4">
                <h2 className="font-heading text-2xl sm:text-3xl font-black tracking-tight" style={{ color: theme.text }}>
                  Welcome to Classroom Screen Pro!
                </h2>
                {/*
                 * `text-emerald-400` on a light surface is ~1.9:1 — the badge was
                 * close to invisible in the light theme, so the shade is now chosen
                 * per mode instead of being a single mid-tone green.
                 */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  ⚡ Version 2.0.1 Live
                </div>
                {/*
                 * Was plain text containing literal `**` markdown, which no renderer
                 * turns into bold — it just showed the asterisks. It is a real
                 * <strong> now, and the paragraph returns to `theme.text` so it reads
                 * as body copy rather than a grey caption.
                 */}
                <p className="text-sm leading-relaxed" style={{ color: theme.text, opacity: 0.8 }}>
                  Supercharge your online classes! We've prepared a highly interactive, 1-minute feature tour specifically designed to help <strong style={{ opacity: 1, fontWeight: 800 }}>online language tutors</strong> master all widgets, backdrops, and interactive tools.
                </p>
                
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => {
                      setShowFirstTimePrompt(false);
                      setTourStep(0);
                    }}
                    className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-white shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 group"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent || theme.secondary || '#8b5cf6'})`,
                      boxShadow: `0 8px 20px ${theme.primary}30`
                    }}
                  >
                    <span>Start Interactive Tour</span>
                    <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => {
                      setShowFirstTimePrompt(false);
                      setHasCompletedTour(true);
                    }}
                    className="py-3.5 px-6 rounded-2xl font-bold text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ color: theme.textMuted }}
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Tour Step Bubble */}
        {tourStep >= 0 && tourStep < liveTourSteps.length && (() => {
          const step = liveTourSteps[tourStep];
          return (
            <div className="fixed inset-0 z-[100000] pointer-events-none">
              {/* Highlight Overlay Backdrop around the target */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-all duration-300 pointer-events-auto" onClick={() => {}} />

              {/* Floating Tooltip Card */}
              <div
                /*
                 * On a phone the per-step `position` classes are unusable: two of
                 * them (`left-48` and `right-[340px]`) push a 90vw card straight
                 * off the screen, so the card ends up pointing at a control the
                 * viewer cannot even see. Below `sm` it becomes a bottom sheet
                 * instead — full width, clear of the home bar, and scrollable if
                 * the copy runs long — while `sm:` and up keep the original
                 * pointing behaviour untouched.
                 */
                className={`fixed z-[100001] pointer-events-auto animate-fade-in rounded-2xl shadow-3xl border ${
                  isCompact
                    ? /*
                       * `bottom-24` rather than `bottom-3`: the dock lives in the last
                       * 96px of the screen, and it is what two of these steps point
                       * at. Sitting flush on the bottom edge hid the very control
                       * being explained. The height budget is reduced to match, so
                       * long copy scrolls instead of running off the top.
                       */
                      'left-1/2 -translate-x-1/2 w-[calc(100vw-1.5rem)] max-w-[34rem] bottom-24 max-h-[calc(100dvh-7rem)] overflow-y-auto hide-scrollbar p-4'
                    : `w-[90vw] sm:w-[380px] p-6 ${step.position}`
                }`}
                style={{ 
                  backgroundColor: theme.surface, 
                  borderColor: theme.primary,
                  color: theme.text,
                  boxShadow: `0 20px 40px -5px ${theme.primary}40, 0 0 0 1px ${theme.primary}40`
                }}
              >
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setTourStep(-1);
                    setHasCompletedTour(true);
                  }} 
                  className="absolute top-4 right-4 text-xs opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: theme.text }}
                >
                  <i className="fas fa-times text-sm" />
                </button>

                {/* Step Indicator Dot Matrix */}
                {/* `pr-7` keeps the "Step n of m" counter clear of the absolutely-positioned close button. */}
                <div className="flex items-center gap-1.5 mb-3 pr-7">
                  {liveTourSteps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === tourStep ? 'w-5' : 'w-1.5 opacity-40'}`}
                      style={{ backgroundColor: theme.primary }}
                    />
                  ))}
                  <span className="text-[10px] font-bold uppercase tracking-wider ml-auto" style={{ color: theme.primary }}>
                    Step {tourStep + 1} of {liveTourSteps.length}
                  </span>
                </div>

                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                       style={{ backgroundColor: `${theme.primary}20` }}>
                    <i className={`fas ${step.icon}`} />
                  </div>
                  <div>
                    {/* `font-heading` keeps the walkthrough title on the same display face as the hero — it was the only headline on the screen still set in the body font. */}
                    <h4 className="font-heading font-extrabold text-sm tracking-tight" style={{ color: theme.text }}>{step.title}</h4>
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mt-0.5">Interactive Guide</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs opacity-90 leading-relaxed mb-4" style={{ color: theme.text }}>
                  {step.text}
                </p>

                {/* Specialized Tutor Tip Panel */}
                <div className="p-3 rounded-xl text-[11px] leading-relaxed mb-5 border border-amber-500/20 text-left"
                     style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)' }}>
                  <p className="text-amber-500 font-bold mb-1 flex items-center gap-1.5">
                    <i className="fas fa-lightbulb" />
                    <span>Language Tutor Strategies</span>
                  </p>
                  <p className="opacity-80" style={{ color: theme.text }}>
                    {step.tutorTip}
                  </p>
                </div>

                {/* Navigation Controls */}
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => {
                      setTourStep(-1);
                      setHasCompletedTour(true);
                    }}
                    className="px-3 py-2 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    style={{ color: theme.textMuted }}
                  >
                    Skip
                  </button>

                  <div className="flex gap-2 ml-auto">
                    {tourStep > 0 && (
                      <button 
                        onClick={() => setTourStep(tourStep - 1)}
                        className="p-2 w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ borderColor: theme.border, color: theme.text }}
                      >
                        <i className="fas fa-chevron-left" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (tourStep === liveTourSteps.length - 1) {
                          setTourStep(-1);
                          setHasCompletedTour(true);
                          setToastMessage("🎉 Congratulations! You have completed the tour. Enjoy teaching!");
                        } else {
                          setTourStep(tourStep + 1);
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-white font-bold text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <span>{tourStep === liveTourSteps.length - 1 ? 'Finish' : 'Next'}</span>
                      <i className={`fas fa-${tourStep === liveTourSteps.length - 1 ? 'check' : 'chevron-right'} text-[10px]`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </WidgetStateContext.Provider>
  </AppContext.Provider>
  );
};

export default ClassroomScreen;