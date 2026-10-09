import React, { createContext } from 'react';
import { ThemeConfig, WidgetState, SnapGuide, StickyNote } from './types';

export const THEMES: Record<string, ThemeConfig> = {
  light: {
    name: 'Light',
    mode: 'light',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    background: '#f8fafc',
    surface: 'rgba(255,255,255,0.95)',
    surfaceHover: 'rgba(255,255,255,1)',
    border: 'rgba(0,0,0,0.1)',
    text: '#1e293b',
    textMuted: '#64748b',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  dark: {
    name: 'Dark',
    mode: 'dark',
    primary: '#818cf8',
    secondary: '#a78bfa',
    accent: '#f472b6',
    background: '#0f172a',
    surface: 'rgba(30,41,59,0.95)',
    surfaceHover: 'rgba(51,65,85,0.95)',
    border: 'rgba(255,255,255,0.1)',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
  },
  midnight: {
    name: 'Midnight',
    mode: 'dark',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    background: '#020617',
    surface: 'rgba(15,23,42,0.95)',
    surfaceHover: 'rgba(30,41,59,0.95)',
    border: 'rgba(99,102,241,0.2)',
    text: '#e2e8f0',
    textMuted: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  ocean: {
    name: 'Ocean',
    mode: 'dark',
    primary: '#06b6d4',
    secondary: '#0ea5e9',
    accent: '#22d3ee',
    background: '#0c1929',
    surface: 'rgba(12,25,41,0.95)',
    surfaceHover: 'rgba(23,37,53,0.95)',
    border: 'rgba(6,182,212,0.2)',
    text: '#e0f2fe',
    textMuted: '#7dd3fc',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#fb7185',
  },
  forest: {
    name: 'Forest',
    mode: 'dark',
    primary: '#22c55e',
    secondary: '#10b981',
    accent: '#84cc16',
    background: '#0f1f0f',
    surface: 'rgba(20,40,20,0.95)',
    surfaceHover: 'rgba(30,50,30,0.95)',
    border: 'rgba(34,197,94,0.2)',
    text: '#dcfce7',
    textMuted: '#86efac',
    success: '#4ade80',
    warning: '#facc15',
    error: '#f87171',
  },
  sunset: {
    name: 'Sunset',
    mode: 'dark',
    primary: '#f97316',
    secondary: '#fb923c',
    accent: '#fbbf24',
    background: '#1c1917',
    surface: 'rgba(41,37,36,0.95)',
    surfaceHover: 'rgba(68,64,60,0.95)',
    border: 'rgba(249,115,22,0.2)',
    text: '#fef3c7',
    textMuted: '#fcd34d',
    success: '#84cc16',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  sepia: {
    name: 'Sepia',
    mode: 'light',
    primary: '#d97706',
    secondary: '#b45309',
    accent: '#92400e',
    background: '#fef3c7',
    surface: 'rgba(255,251,235,0.95)',
    surfaceHover: 'rgba(254,243,199,0.95)',
    border: 'rgba(120,53,15,0.1)',
    text: '#451a03',
    textMuted: '#92400e',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626',
  },
};

export interface AppContextType {
  theme: ThemeConfig;
  setTheme: (name: string) => void;
  widgets: WidgetState[];
  addWidget: (type: string, initialSettings?: any) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetState>) => void;
  bringToFront: (id: string) => void;
  snapGuides: SnapGuide[];
  setSnapGuides: (guides: SnapGuide[]) => void;
  stickyNotes: StickyNote[];
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNote[]>>;
  showReaction: (emoji: string) => void;
  stopReaction: () => void;
}

export const AppContext = createContext<AppContextType>({
  /**
   * Light is the app's default theme. This value is only the initial one before the
   * provider in ClassroomScreen resolves `classroom-theme` from storage, but it has
   * to agree with that fallback (`useLocalStorage('classroom-theme', 'light')`),
   * otherwise the first paint of any consumer is dark and then flips.
   */
  theme: THEMES.light,
  setTheme: () => {},
  widgets: [],
  addWidget: () => {},
  removeWidget: () => {},
  updateWidget: () => {},
  bringToFront: () => {},
  snapGuides: [],
  setSnapGuides: () => {},
  stickyNotes: [],
  setStickyNotes: () => {},
  showReaction: () => {},
  stopReaction: () => {},
});

export interface WidgetStateContextType {
  widgets: WidgetState[];
  snapGuides: SnapGuide[];
  setSnapGuides: (guides: SnapGuide[]) => void;
}

export const WidgetStateContext = createContext<WidgetStateContextType>({
  widgets: [],
  snapGuides: [],
  setSnapGuides: () => {},
});
