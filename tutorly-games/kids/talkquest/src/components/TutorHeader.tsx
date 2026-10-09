'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SupportedLanguage } from '@/types/theme';
import { Globe, Star, Volume2, VolumeX, Mic, Type } from 'lucide-react';
import { pickBuddy } from '@/lib/art';
import { AudioManager } from '@/lib/audio';

interface TutorHeaderProps {
  currentLang: SupportedLanguage;
  onLangChange: (lang: SupportedLanguage) => void;
  stars: number;
  onRewardStar: () => void;
  themeTitle: string;
  onOpenVoiceTest: () => void;
}

/**
 * Text size for a shared screen. The three names are the ones the tutor sees;
 * the values match `html[data-textsize]` in globals.css. Kept in localStorage and
 * applied on boot by the inline script in layout.tsx, so there is no flash.
 */
export const TEXT_SIZES = [
  { id: 'large', label: 'Large' },
  { id: 'xlarge', label: 'Extra large' },
  { id: 'huge', label: 'Huge' },
] as const;
export type TextSize = (typeof TEXT_SIZES)[number]['id'];
export const TEXT_SIZE_KEY = 'talkquest.textSize.v1';

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
];

export const TutorHeader: React.FC<TutorHeaderProps> = ({
  currentLang, onLangChange, stars, onRewardStar, themeTitle, onOpenVoiceTest,
}) => {
  const [langOpen, setLangOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [size, setSize] = useState<TextSize>('xlarge');

  /**
   * Both of these are remembered in localStorage, and both are read AFTER mount
   * on purpose — see WhatsNew for the full reason. Reading them while rendering
   * put a tutor's saved "Huge" or "Muted" in the client's first paint but not in
   * the pre-rendered HTML, which React reports as a hydration mismatch.
   */
  useEffect(() => {
    setMuted(AudioManager.isMuted());
    try {
      const saved = localStorage.getItem(TEXT_SIZE_KEY);
      if (saved === 'large' || saved === 'xlarge' || saved === 'huge') setSize(saved);
    } catch { /* storage can be blocked */ }
  }, []);
  const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  const chooseSize = (next: TextSize) => {
    AudioManager.playSound('select');
    setSize(next);
    setSizeOpen(false);
    document.documentElement.dataset.textsize = next;
    try { localStorage.setItem(TEXT_SIZE_KEY, next); } catch { /* */ }
  };

  const toggleSound = () => {
    const next = !muted;
    AudioManager.setMuted(next);
    setMuted(next);
    // Play the confirmation only when turning sound ON, or there is nothing to hear.
    if (!next) AudioManager.playSound('select');
  };

  return (
    <header className="sticky top-0 z-50 px-4 lg:px-8 py-3 bg-white/80 backdrop-blur-md border-b-4 border-amber-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src={pickBuddy('TalkQuestPip')} alt="" className="w-12 h-12 rounded-2xl ring-2 ring-amber-300 bg-sky-100" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>
                TalkQuest
              </span>
              <span className="text-[10px] font-black uppercase bg-amber-300 text-slate-900 px-1.5 py-0.5 rounded-md">Kids</span>
            </div>
            <p className="text-xs font-bold text-slate-500 truncate max-w-[260px]">{themeTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleSound} title={muted ? 'Sound is off — tap to turn it on' : 'Sound is on — tap to mute'}
            className={`btn-3d flex items-center gap-2 px-3.5 py-2 rounded-2xl font-black text-sm cursor-pointer ${
              muted ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{muted ? 'Sound off' : 'Sound on'}</span>
          </button>

          <button onClick={onOpenVoiceTest} title="Test the read-aloud voices"
            className="btn-3d flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-violet-100 hover:bg-violet-200 text-violet-800 font-black text-sm cursor-pointer">
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Voices</span>
          </button>

          <div className="relative">
            <button
              onClick={() => { setSizeOpen(!sizeOpen); setLangOpen(false); }}
              title="Make the text bigger for a shared screen"
              className="btn-3d flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-100 hover:bg-amber-200 text-slate-800 font-black text-sm cursor-pointer">
              <Type className="w-4 h-4 text-amber-700" />
              <span className="hidden md:inline">{TEXT_SIZES.find(s => s.id === size)?.label}</span>
            </button>
            {sizeOpen && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border-2 border-slate-100 p-1.5 z-50">
                {TEXT_SIZES.map(s => (
                  <button key={s.id} onClick={() => chooseSize(s.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-black text-left cursor-pointer ${
                      size === s.id ? 'bg-amber-200 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    {s.label}
                    <span className="text-[10px] font-black text-slate-400">Aa</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setLangOpen(!langOpen); setSizeOpen(false); }}
              className="btn-3d flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-sky-100 hover:bg-sky-200 text-slate-800 font-black text-sm cursor-pointer"
            >
              <Globe className="w-4 h-4 text-sky-600" />
              <span>{current.flag} {current.label}</span>
            </button>
            {langOpen && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border-2 border-slate-100 p-1.5 z-50">
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => { onLangChange(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-black text-left cursor-pointer ${
                      currentLang === lang.code ? 'bg-amber-200 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    <span>{lang.flag}</span>{lang.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <motion.button whileTap={{ scale: 0.92 }} onClick={onRewardStar} title="Give a star"
            className="btn-3d flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-300 text-slate-900 font-black cursor-pointer">
            <Star className="w-5 h-5 fill-current" />
            <span className="text-lg tabular-nums">{stars}</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
