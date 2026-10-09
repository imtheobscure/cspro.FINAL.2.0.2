export type LightColor = 'red' | 'yellow' | 'green';
export type ViewMode = 'screen' | 'activities' | 'activity';

export interface ActivityDef {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  hotkey?: string;
  color: string;
  aiPrompt?: string;
}

export interface CategoryDef {
  id: string;
  name: string;
  icon: string;
  gradient: string;
}

export interface Position { x: number; y: number; }
export interface Size { width: number; height: number; }

export interface WidgetState {
  id: string;
  type: string;
  position: Position;
  size: Size;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  settings: Record<string, any>;
  savedPosition?: Position;
  savedSize?: Size;
}

export interface ThemeConfig {
  name: string;
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  sourceId: string;
}

export interface StickyNote {
  id: string;
  text: string;
  color: string;
  position: Position;
  size: Size;
  zIndex: number;
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
}
