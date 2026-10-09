/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Users, Trophy, MapPin, RefreshCw, Eye, Target, 
  Volume2, VolumeX, CheckCircle, HelpCircle, Copy, Check, 
  Trash2, Plus, ArrowRight, Play, Award, Sparkles, BookOpen, Clock, Globe,
  Key, Settings, ArrowLeft, UserMinus, Camera, X, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EslRound, VocabularyItem } from '../types';

// Interactive Glossary Component to underline challenging words and read aloud definitions on hover
function InteractiveGlossaryText({ text, vocabulary, onSpeak }: { 
  text: string; 
  vocabulary: VocabularyItem[]; 
  onSpeak: (text: string) => void;
}) {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const timeoutRef = useRef<any>(null);

  if (!vocabulary || vocabulary.length === 0) {
    return <span>{text}</span>;
  }

  // Create a regex to match any of the vocabulary words (case-insensitive) using word boundaries \b
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sortedWords = [...vocabulary].sort((a, b) => b.word.length - a.word.length); // Match longer words first
  const wordsRegexStr = sortedWords.map(v => `\\b${escapeRegExp(v.word)}\\b`).join('|');
  
  if (!wordsRegexStr) return <span>{text}</span>;
  
  const regex = new RegExp(`(${wordsRegexStr})`, 'gi');
  const parts = text.split(regex);

  const handleMouseEnter = (event: React.MouseEvent, wordObj: VocabularyItem) => {
    setHoveredWord(wordObj.word);
    
    // Read aloud definition on hover with a slight safety delay
    if (onSpeak) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onSpeak(`${wordObj.word}: ${wordObj.definition}`);
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    setHoveredWord(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <span className="relative inline">
      {parts.map((part, index) => {
        const matchedVocab = vocabulary.find(
          v => v.word.toLowerCase() === part.toLowerCase()
        );

        if (matchedVocab) {
          return (
            <span
              key={index}
              className="underline decoration-sky-400 decoration-2 underline-offset-4 font-black text-sky-400 hover:text-sky-300 cursor-help transition-all duration-150 inline-block relative group"
              onMouseEnter={(e) => handleMouseEnter(e, matchedVocab)}
              onMouseLeave={handleMouseLeave}
            >
              {part}
              
              {/* Tooltip visible on hover */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block w-[320px] bg-slate-950/95 backdrop-blur-md text-slate-100 rounded-2xl border border-sky-400 p-4 shadow-2xl text-left z-50 text-sm leading-relaxed pointer-events-none font-normal animate-in zoom-in-95 duration-150">
                <span className="text-sky-400 text-lg font-black tracking-wide block mb-1">
                  {matchedVocab.word}
                </span>
                <p className="text-slate-100 text-sm font-semibold mb-2 leading-relaxed">
                  {matchedVocab.definition}
                </p>
                <p className="text-slate-400 text-xs italic border-t border-slate-900 pt-2 leading-normal">
                  Example: "{matchedVocab.example}"
                </p>
              </span>
            </span>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

// Cultural comparison generator based on learner country
function getCueDetailsAndComparison(idx: number, round: EslRound, learnerCountry: string) {
  const comparativeInsights: Record<number, { example: string, comparison: string }> = {
    0: { 
      example: "In this place, it is custom to queue patiently, prioritize polite distance, and avoid loud conversations in public transit.",
      comparison: `While people at this destination rely on quiet decorum and strict social lines, social greetings at home are often warmer, closer, and more expressive, focusing heavily on lively family discussions and visual sharing.`
    },
    1: { 
      example: "Typically, people wear thick layered fabrics, smart trench coats, or rainproof utilities to cope with unpredictable local weather.",
      comparison: `While clothing at this destination highlights adaptive climate layers, daily fashion at home is guided by a completely different local weather rhythm, prioritizing light textures, vibrant colors, or more casual coordinates.`
    },
    2: { 
      example: "Locals enjoy playing cricket, row boating on canals, or joining traditional neighborhood pub games.",
      comparison: `While recreation at this destination highlights historical water sports or structural clubs, leisure at home is heavily focused on outdoor public squares, seaside strolling, dining together, or passionate football cheers.`
    },
    3: { 
      example: "A popular topic in newspapers is high-density travel, commuting protocols, and global traveler stories.",
      comparison: `While daily news and commutes are highly regimented here, modern life and transit at home have a much more spontaneous, social, and flexible community pacing.`
    },
    4: { 
      example: "Legendary romantic writers, mathematical thinkers, and gothic artists have left their mark on these streets.",
      comparison: `While this destination honors pioneers of industrial-age science, the notable pioneers at home are heavily celebrated for their warm, highly descriptive literary style, national songs, and expressive screen masterpieces.`
    },
    5: { 
      example: "This majestic structure has survived several historical wars, massive imperial eras, and reconstruction campaigns.",
      comparison: `The history here centers on medieval kingdoms, ancient arches, or colonial trading heights. On the other hand, the home heritage is famous for ancient revolutions, sun-colored fortresses, and vibrant coastal epochs.`
    },
    6: { 
      example: "Locals are extremely proud of hot pies, fried fish, roasted meats, or special morning herbal drinks.",
      comparison: `While breakfasts and dinners at this destination are often quick or schedule-bound (e.g. eating dinner around 6:00 PM), culinary culture at home highlights long shared meals, rich tapas, espresso breakfast routines, and late-evening dinner gatherings.`
    },
    7: { 
      example: "Lush rivers, green coastal ridges, and natural harbor waters surround the location.",
      comparison: `While the terrain here highlights rolling green shores and estuaries, the natural terrain at home is famous for sunny coastal beaches, dry mountain ranges, or stunning natural valleys.`
    },
    8: { 
      example: "The site utilizes massive Gothic pointed towers, structural iron columns, or hand-carved limestone arches.",
      comparison: `While this site highlights heavy stone architecture and pointed spires, structural style at home features beautiful sun-baked stucco, Roman terracotta facades, or expressive tiled decorations.`
    },
    9: { 
      example: "To express friendly greeting or parting words, young people frequently say 'Cheers' or use local expressions.",
      comparison: `While language at this destination relies on expressions to preserve respectful distance, conversational expressions and gestures at home are incredibly warm, expressive, and focus on physical closeness.`
    }
  };

  return comparativeInsights[idx] || {
    example: `For instance, real-world interactions here center strictly around local cultural activities, traditional clothing styles, or specific regional etiquette rules.`,
    comparison: `While social routines here are tailored to the unique environment, they stand in fascinating contrast to home habits, where community bonds and daily schedules follow a warm, expressive, and distinct local rhythm.`
  };
}

export default function GameSidebar() {
  const { 
    gameState, 
    activeGuess,
    addPlayer, 
    removePlayer, 
    updateConfig, 
    startEslGame, 
    recordActivePlayerGuess, 
    skipActivePlayerGuess,
    setActivePlayerForGuess,
    revealNextClue,
    revealEslRound, 
    nextEslRound, 
    resetCampaign,
    loadCustomRounds,
    getCurrentPrompt,
    getTeachersGuidePrompt,
    getCluesForRound
  } = useGame();

  // State Management
  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const [liveRoundTime, setLiveRoundTime] = useState(0);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState('personas');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyTeacherSuccess, setCopyTeacherSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>('default');

  // Google Maps API Key State
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [mapsKey, setMapsKey] = useState(() => localStorage.getItem('google_maps_api_key') || '');

  // Reveal Countdown logic
  const [isRevealing, setIsRevealing] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);

  // Custom Voice Search
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVoiceDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const speakVoiceNonBlocking = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const allAvailable = window.speechSynthesis.getVoices();
    const matchedVoice = allAvailable.find(v => v.name === selectedVoiceName) ||
                         allAvailable.find(v => v.name.toLowerCase().includes('microsoft ava')) ||
                         allAvailable.find(v => v.default) ||
                         allAvailable[0];
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    utterance.rate = speechRate * 1.05;
    utterance.pitch = speechPitch;
    window.speechSynthesis.speak(utterance);
  };

  const handleRevealWithCountdown = () => {
    setIsRevealing(true);
    setCountdownValue(3);
    speakVoiceNonBlocking("Three!");
    
    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdownValue(current);
        if (current === 2) {
          speakVoiceNonBlocking("Two!");
        } else if (current === 1) {
          speakVoiceNonBlocking("One!");
        }
      } else {
        clearInterval(interval);
        setIsRevealing(false);
        speakVoiceNonBlocking("Answer revealed!");
        revealEslRound();
      }
    }, 1000);
  };

  const [hasSpokenOneMinuteWarning, setHasSpokenOneMinuteWarning] = useState(false);

  useEffect(() => {
    setHasSpokenOneMinuteWarning(false);
  }, [gameState.currentRoundIndex, gameState.status]);

  useEffect(() => {
    if (gameState.status === 'playing' && gameState.roundStartedAt) {
      const remaining = 300 - liveRoundTime;
      if (remaining === 60 && !hasSpokenOneMinuteWarning) {
        setHasSpokenOneMinuteWarning(true);
        speakVoiceNonBlocking("Attention players! You have only one minute remaining. Please announce and lock in your guesses on the map now!");
      }
    }
  }, [liveRoundTime, gameState.status, hasSpokenOneMinuteWarning]);

  useEffect(() => {
    if (gameState.status === 'playing' && gameState.players.length > 0) {
      const allGuessed = gameState.players.every(p => !!p.guesses[gameState.currentRoundIndex]);
      if (allGuessed && !isRevealing) {
        handleRevealWithCountdown();
      }
    }
  }, [gameState.players, gameState.status, gameState.currentRoundIndex]);

  const handleSaveMapsKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('google_maps_api_key', mapsKey.trim());
    window.location.reload();
  };

  // TTS State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [isHoverSpeakActive, setIsHoverSpeakActive] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      const getAvailableVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        setVoices(allVoices);
        
        // Prioritize Microsoft Ava or other natural voices
        const avaVoice = allVoices.find(v => v.name.toLowerCase().includes('microsoft ava'));
        const backupVoice = allVoices.find(v => v.lang.toLowerCase().includes('en') && v.name.toLowerCase().includes('natural')) ||
                            allVoices.find(v => v.name.toLowerCase().includes('zira')) ||
                            allVoices.find(v => v.default) ||
                            allVoices.find(v => v.lang.toLowerCase().includes('en')) ||
                            allVoices[0];
        const defaultChoice = avaVoice || backupVoice;
        if (defaultChoice && !selectedVoiceName) {
          setSelectedVoiceName(defaultChoice.name);
        }
      };

      getAvailableVoices();
      window.speechSynthesis.onvoiceschanged = getAvailableVoices;
    }
  }, [selectedVoiceName]);

  // Audio Playback
  const handleSpeak = (textToSpeak: string) => {
    if (!synthRef.current) return;

    if (isPlayingSpeech) {
      synthRef.current.cancel();
      setIsPlayingSpeech(false);
      return;
    }

    synthRef.current.cancel();

    // Clean up emojis, symbols, and hashtag signs for natural speech playback
    let cleanedText = textToSpeak;
    try {
      cleanedText = cleanedText
        .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '')
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/#/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (e) {
      // safe fallback
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;

    const allAvailable = window.speechSynthesis.getVoices();
    const matchedVoice = allAvailable.find(v => v.name === selectedVoiceName) ||
                         allAvailable.find(v => v.name.toLowerCase().includes('microsoft ava')) ||
                         allAvailable.find(v => v.default) ||
                         allAvailable[0];
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = speechRate;
    utterance.pitch = speechPitch;

    utterance.onend = () => {
      setIsPlayingSpeech(false);
    };

    utterance.onerror = () => {
      setIsPlayingSpeech(false);
    };

    setIsPlayingSpeech(true);
    synthRef.current.speak(utterance);
  };

  const handleHoverSpeak = (textToSpeak: string) => {
    if (!isHoverSpeakActive || !synthRef.current) return;

    synthRef.current.cancel();

    let cleanedText = textToSpeak;
    try {
      cleanedText = cleanedText
        .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '')
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/#/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (e) {
      // safe fallback
    }

    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    const allAvailable = window.speechSynthesis.getVoices();
    const matchedVoice = allAvailable.find(v => v.name === selectedVoiceName) ||
                         allAvailable.find(v => v.name.toLowerCase().includes('microsoft ava')) ||
                         allAvailable.find(v => v.default) ||
                         allAvailable[0];
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;

    synthRef.current.speak(utterance);
  };

  // Stop playback when round, status shifts, or when hover speak is turned off
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingSpeech(false);
    }
  }, [gameState.currentRoundIndex, gameState.status, isHoverSpeakActive]);

  // Clipboard copies
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(getCurrentPrompt());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopyTeacherPrompt = () => {
    navigator.clipboard.writeText(getTeachersGuidePrompt());
    setCopyTeacherSuccess(true);
    setTimeout(() => setCopyTeacherSuccess(false), 2000);
  };

  const handleVerifyAndLoadJson = () => {
    setJsonError(null);
    setJsonSuccess(false);

    if (!jsonInput.trim()) {
      setJsonError('Please paste a JSON array code block.');
      return;
    }

    const res = loadCustomRounds(jsonInput);
    if (res.success) {
      setJsonSuccess(true);
      setTimeout(() => {
        setJsonSuccess(false);
      }, 3000);
    } else {
      setJsonError(res.error || 'Failed to parse JSON.');
    }
  };

  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      const customAvatarUrl = `https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${encodeURIComponent(newPlayerName.trim())}`;
      addPlayer(newPlayerName.trim(), customAvatarUrl);
      setNewPlayerName('');
    }
  };

  const currentRound: EslRound | undefined = gameState.rounds[gameState.currentRoundIndex];
  const totalRoundsCount = gameState.rounds.length;

  // Compute live round time
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.roundStartedAt) {
      const interval = setInterval(() => {
        setLiveRoundTime(Math.floor((Date.now() - gameState.roundStartedAt!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
    setLiveRoundTime(0);
  }, [gameState.status, gameState.roundStartedAt]);

  const currentActivePlayer = gameState.activePlayerIndexForGuess !== null 
    ? gameState.players[gameState.activePlayerIndexForGuess] 
    : null;

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-100 border-r border-slate-800 font-sans shadow-lg">
      
      {/* Giant Countdown Overlay */}
      <AnimatePresence>
        {isRevealing && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md"
          >
            <motion.div 
              key={countdownValue}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[15rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-emerald-400 font-display drop-shadow-[0_0_40px_rgba(56,189,248,0.5)] leading-none"
            >
              {countdownValue}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Workspace Hero */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/70 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
            <Globe className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400 font-display">
              Tutorly GeoSeeker
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGeneralSettings(true)}
          className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition duration-150 active:scale-95 shadow border border-slate-800"
          title="General Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Main Panel Scrolling container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* SETUP PHASE PANEL */}
        {gameState.status === 'setup' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            
            {/* Step 1: Learning Configuration */}
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-5 shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <BookOpen className="w-5 h-5 text-sky-450" />
                <h3 className="font-extrabold text-base text-slate-100 uppercase tracking-wide">1. Parameters</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-400 tracking-wide uppercase mb-1.5">
                    CEFR Proficiency Level
                  </label>
                  <select 
                    value={gameState.config.cefrLevel}
                    onChange={(e) => updateConfig({ cefrLevel: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 text-base rounded-xl p-3.5 focus:ring-1 focus:ring-sky-500 outline-none text-slate-100 font-semibold cursor-pointer"
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 tracking-wide uppercase mb-1.5">
                    Learner Profile / Facts
                  </label>
                  <input 
                    type="text"
                    value={gameState.config.learnerBackground}
                    onChange={(e) => updateConfig({ learnerBackground: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-base rounded-xl p-3.5 focus:ring-1 focus:ring-sky-500 outline-none text-slate-200 font-semibold"
                    placeholder="e.g. Spanish speakers, interested in architecture"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 tracking-wide uppercase mb-1.5">
                      Place of Living
                    </label>
                    <input 
                    type="text"
                    value={gameState.config.placeOfLiving}
                    onChange={(e) => updateConfig({ placeOfLiving: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-base rounded-xl p-3.5 focus:ring-1 focus:ring-sky-500 outline-none text-slate-200 font-semibold"
                    placeholder="e.g. València, Spain"
                  />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 tracking-wide uppercase mb-1.5">
                      Target Region
                    </label>
                    <input 
                    type="text"
                    value={gameState.config.customRegionName}
                    onChange={(e) => updateConfig({ customRegionName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-base rounded-xl p-3.5 focus:ring-1 focus:ring-sky-500 outline-none text-slate-200 font-semibold"
                    placeholder="e.g. Global, Europe, UK"
                  />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Student Management */}
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-5 shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-800/85 pb-3">
                <Users className="w-5 h-5 text-sky-455" />
                <h3 className="font-extrabold text-base text-slate-100 uppercase tracking-wide">2. Players ({gameState.players.length})</h3>
              </div>

              {/* Avatar Style Chooser */}
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'personas', label: '👤 Face' },
                    { id: 'adventurer', label: '🧙 Hero' },
                    { id: 'pixel-art', label: '🎮 Pixel' },
                    { id: 'bottts', label: '🤖 Robo' },
                    { id: 'thumbs', label: '🐾 Cute' }
                  ].map(style => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedAvatarStyle(style.id)}
                      className={`py-2 text-[11px] font-black uppercase rounded-lg transition border duration-150 ${selectedAvatarStyle === style.id ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'}`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Input + Live Avatar Realtime Frame */}
              <form onSubmit={handleAddPlayerSubmit} className="flex gap-2 items-center w-full">
                <div className="w-10 h-10 rounded-lg border border-slate-750 bg-slate-900 flex-shrink-0 overflow-hidden flex items-center justify-center relative shadow-inner">
                  <img
                    src={`https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${encodeURIComponent(newPlayerName.trim() || 'Guest')}`}
                    alt="realtime avatar"
                    className="w-full h-full object-cover p-1"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <input 
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Student name..."
                  maxLength={15}
                  className="flex-1 bg-slate-900 border border-slate-700 text-xs rounded-xl p-2.5 focus:ring-1 focus:ring-sky-500 outline-none text-slate-100 font-bold min-w-0"
                />
                <button 
                  type="submit"
                  disabled={!newPlayerName.trim()}
                  className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg p-2 h-10 w-10 flex items-center justify-center transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                </button>
              </form>

              {gameState.players.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-2 font-medium">No students registered yet.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 separator-scroll">
                  {gameState.players.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-base p-3.5 bg-slate-950/45 rounded-xl hover:border-slate-850 border border-transparent transition-all">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={p.avatar} 
                          alt="avatar" 
                          className="w-8 h-8 rounded-full border border-slate-700 bg-slate-950 flex-shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-extrabold text-slate-200">{p.name}</span>
                      </div>
                      <button 
                        onClick={() => removePlayer(p.id)}
                        className="text-slate-500 hover:text-rose-400 p-2 rounded-lg transition-colors active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Loading Campaign Tab system */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <h3 className="font-extrabold text-base text-slate-100 uppercase tracking-wide">3. Copy Prompt</h3>
                </div>
                <div className="text-xs text-slate-400 font-bold">({gameState.rounds.length} rounds)</div>
              </div>

              {/* Tabs */}
              <div className="flex bg-slate-900 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('default')}
                  className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium transition-all ${activeTab === 'default' ? 'bg-sky-600 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Standard (Global Wonders)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium transition-all ${activeTab === 'custom' ? 'bg-sky-600 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Copy Prompt
                </button>
              </div>

              {activeTab === 'custom' ? (
                <div className="space-y-3 animate-in fade-in duration-200">
                  
                  <button
                     type="button"
                     onClick={handleCopyPrompt}
                     className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded-lg p-2.5 transition text-xs font-semibold"
                   >
                    {copySuccess ? (
                      <>
                         <Check className="w-4 h-4 text-emerald-500" />
                         Prompt Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-sky-400" />
                        Copy Prompt
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyTeacherPrompt}
                    className="w-full flex items-center justify-center gap-2 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-900/60 rounded-lg p-2.5 transition text-xs font-semibold text-amber-200"
                  >
                    {copyTeacherSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        Teacher's Guide Copied!
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 text-amber-500" />
                        Teacher's guide prompt
                      </>
                    )}
                  </button>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wide">
                      Paste External JSON Output
                    </label>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 text-slate-300 font-mono outline-none focus:ring-1 focus:ring-sky-500"
                      placeholder='[ { "name": "Berlin Wall", "lat": 52.508, "lng": 13.44, "tourGuideText": "..." } ]'
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyAndLoadJson}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg transition"
                  >
                    Load & Validate JSON Itinerary
                  </button>

                  {jsonError && (
                    <div className="p-2 border border-red-900 bg-red-950/40 text-red-300 rounded text-[11px] leading-relaxed">
                      ❌ {jsonError}
                    </div>
                  )}

                  {jsonSuccess && (
                    <div className="p-2 border border-emerald-950 bg-emerald-950/40 text-emerald-300 rounded text-[11px] leading-relaxed flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5" /> Checked successfully! Rounds loaded!
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 bg-slate-900/40 rounded-xl border border-slate-850 space-y-2">
                  <Globe className="w-8 h-8 mx-auto text-sky-500 opac-80" />
                  <p className="text-xs font-semibold text-slate-200">10 Global High-Definition Rounds Loaded</p>
                  <p className="text-[10px] text-slate-500">Includes London, Paris, Rome, Sydney, Tokyo, Cairo, Cape Town and more.</p>
                </div>
              )}
            </div>

            {/* Launch Campaign Button */}
            <button
              onClick={() => startEslGame()}
              disabled={gameState.players.length === 0}
              className={`w-full py-4 rounded-xl font-extrabold flex items-center justify-center gap-2 text-base transition-all transform shadow-lg
                ${gameState.players.length === 0 
                  ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white active:scale-95 shadow-sky-600/10'
                }`}
            >
              <Award className="w-5 h-5" />
              Launch {gameState.rounds.length}-Game Campaign
            </button>
            {gameState.players.length === 0 && (
              <p className="text-center text-[10px] text-red-400 animate-pulse">
                Please register at least one student before launching.
              </p>
            )}

          </div>
        )}

        {/* ACTIVE PLAYING PHASE PANEL */}
        {gameState.status === 'playing' && currentRound && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Top Navigation Row */}
            <div className="flex gap-2 justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => resetCampaign()}
                className="bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Setup
              </button>
              <span className="font-mono bg-sky-950 text-sky-400 border border-sky-900/40 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                Game {gameState.currentRoundIndex + 1} / {totalRoundsCount}
              </span>
            </div>

            {/* Highly Visual Grand Game Timer */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-rose-950 shadow-[0_0_20px_rgba(244,63,94,0.06)] flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-rose-400 animate-pulse" />
                <span className="text-[44px] leading-none font-bold text-rose-500 font-mono text-center tracking-tight drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]">
                  {Math.floor(Math.max(0, 300 - liveRoundTime) / 60)}:{(Math.max(0, 300 - liveRoundTime) % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              {/* Animated Progress Bar Meter */}
              <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    (300 - liveRoundTime) > 180 
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                      : (300 - liveRoundTime) > 60 
                        ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                        : 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.7)]'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, ((300 - liveRoundTime) / 300) * 100))}%` }}
                />
              </div>
            </div>

            {/* Hidden Browser Audio settings */}
            <div className="hidden">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-4 shadow">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-sky-400 animate-pulse" />
                    <h4 className="font-bold text-xs text-slate-200">Browser Audio Reader</h4>
                  </div>
                </div>

              {/* Advanced Controls Dropdown */}
              <div className="space-y-2">
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-[9px] uppercase font-bold tracking-wide text-slate-500 mb-0.5">Select Reading Voice</label>
                  <button 
                    type="button" 
                    onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                    className="w-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded p-2 text-left truncate flex justify-between items-center outline-none focus:border-sky-500 hover:bg-slate-800 transition-colors"
                  >
                    {selectedVoiceName || "System Default Voice"}
                  </button>
                  
                  <AnimatePresence>
                    {showVoiceDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute z-50 mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden"
                      >
                        <div className="p-2 border-b border-slate-800 bg-slate-900">
                          <input 
                            type="text" 
                            placeholder="Search voices (e.g. Microsoft Ava)" 
                            value={voiceSearchQuery}
                            onChange={(e) => setVoiceSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-xs rounded p-1.5 outline-none focus:border-sky-500 text-slate-200"
                          />
                        </div>
                        <ul className="max-h-40 overflow-y-auto">
                          {voices.filter(v => v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) || v.lang.toLowerCase().includes(voiceSearchQuery.toLowerCase())).map(v => (
                            <li 
                              key={v.name} 
                              onClick={() => { setSelectedVoiceName(v.name); setShowVoiceDropdown(false); }}
                              className="px-3 py-2 text-[11px] text-slate-300 hover:bg-sky-600 hover:text-white cursor-pointer truncate transition-colors"
                            >
                              {v.name} ({v.lang})
                            </li>
                          ))}
                          {voices.length === 0 && <li className="px-3 py-2 text-[11px] text-slate-500 italic">No voices found.</li>}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[9px] uppercase font-bold tracking-wide text-slate-500 mb-0.5">Rate (Speed): {speechRate}x</label>
                    <input 
                      type="range"
                      min={0.5} 
                      max={1.8} 
                      step={0.1} 
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full filter invert-80"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold tracking-wide text-slate-500 mb-0.5">Pitch: {speechPitch}</label>
                    <input 
                      type="range"
                      min={0.5} 
                      max={1.5} 
                      step={0.1} 
                      value={speechPitch}
                      onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                      className="w-full filter invert-80"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSpeak(currentRound.tourGuideText)}
                  className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-xs border border-transparent transition-all active:scale-95 duration-100 ${isPlayingSpeech ? 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-950/60' : 'bg-sky-600 hover:bg-sky-500 text-white shadow shadow-sky-600/10'}`}
                >
                  {isPlayingSpeech ? (
                    <>
                      <VolumeX className="w-4 h-4 animate-bounce" />
                      Pause Audio Guide Reading
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Read Aloud Clue (Natural English)
                    </>
                  )}
                </button>
              </div>
            </div>
            </div>

            {/* Tour Clue Content Field */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 relative overflow-hidden shadow-lg">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm uppercase tracking-widest text-[#22d3ee] font-extrabold flex items-center gap-1.5">
                    <Globe className="w-5 h-5 animate-spin-slow" /> 
                    Host Introduction Clue
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSpeak(currentRound.tourGuideText)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sky-450 hover:text-sky-355 transition active:scale-95 flex items-center gap-1.5"
                    title="Read Aloud Host Intro"
                  >
                    {isPlayingSpeech ? <VolumeX className="w-4 h-4 text-rose-450 animate-bounce" /> : <Volume2 className="w-4 h-4" />}
                    <span className="text-xs font-black uppercase tracking-wider">Speak</span>
                  </button>
                </div>
                <div className="text-slate-100 text-[17px] font-bold leading-relaxed border-l-4 border-sky-500 pl-4 py-2 bg-slate-900/30 rounded-r-lg pr-2 relative text-left">
                  "<InteractiveGlossaryText 
                    text={currentRound.tourGuideText} 
                    vocabulary={currentRound.vocabulary} 
                    onSpeak={handleSpeak} 
                  />"
                </div>
              </div>
            </div>

              {/* Host Sequential Clues System */}
              {(() => {
                const liveClues = getCluesForRound(currentRound);
                if (liveClues && liveClues.length > 0) {
                  return (
                    <div className="pt-5 border-t border-slate-850 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm uppercase tracking-widest text-amber-400 font-extrabold">
                          Progressive Clues ({gameState.currentClueIndex + 1}/{liveClues.length})
                        </p>
                      </div>
                      
                      <div className="space-y-5">
                        {liveClues.slice(0, gameState.currentClueIndex + 1).map((clueItem, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, scale: 0.98 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            className={`overflow-hidden rounded-2xl border ${idx === gameState.currentClueIndex ? 'border-amber-500/65 shadow-[0_0_20px_rgba(245,158,11,0.18)] bg-slate-900' : 'border-slate-800/80 bg-slate-900/40'}`}
                          >
                            <div className="bg-slate-950/80 px-5 py-3 border-b border-slate-850 flex items-center justify-between text-xs font-black text-amber-300 uppercase tracking-widest">
                              <span className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500">#{idx + 1}</span>
                                {clueItem.category}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  // Construct fully integrated readable description of the card (including category, clue, real-world example, and cultural contrast)
                                  const comp = getCueDetailsAndComparison(idx, currentRound, gameState.config.placeOfLiving.split(',').pop()?.trim() || 'home country');
                                  const textToSpeak = `Clue number ${idx + 1}. ${clueItem.category.replace(/Level \d+/, '')}. ${clueItem.text}.` + 
                                    (idx === gameState.currentClueIndex ? ` Real world student example. ${comp.example}. Cultural contrast. ${comp.comparison}.` : '');
                                  handleSpeak(textToSpeak);
                                }}
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                                title="Speak Clue"
                              >
                                <Volume2 className="w-4 h-4" />
                                <span>Read</span>
                              </button>
                            </div>
                            
                            {/* Dynamic Image based on keywords if provided */}
                            {idx === gameState.currentClueIndex && currentRound.imageSearchKeywords && (() => {
                              const keyword = (idx === 0 ? currentRound.imageSearchKeywords.general : idx === 1 ? currentRound.imageSearchKeywords.food : idx === 2 ? currentRound.imageSearchKeywords.clothes : currentRound.imageSearchKeywords.culture) || 'landmark,travel';
                              const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(keyword)}`;
                              return (
                                <a 
                                  href={googleImagesUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-44 w-full bg-slate-850 relative overflow-hidden block group cursor-pointer border-b border-slate-850"
                                  title={`Search "${keyword}" on Google Images`}
                                >
                                  <img 
                                    src={`https://loremflickr.com/600/400/${encodeURIComponent(keyword)}`} 
                                    alt="Clue visual" 
                                    className="w-full h-full object-cover opacity-85 mix-blend-screen transition-transform group-hover:scale-105 duration-700"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-905 to-transparent"></div>
                                  <div className="absolute top-2.5 right-2.5 bg-black/75 rounded-md px-1.5 py-1 text-[8px] font-black text-amber-500 uppercase flex items-center gap-1 border border-slate-700">
                                    <Search className="w-2.5 h-2.5 text-amber-500" />
                                    <span>Google Images</span>
                                  </div>
                                </a>
                              );
                            })()}
                            <div className={`p-5 text-[15px] font-bold leading-relaxed text-left ${idx === gameState.currentClueIndex ? 'text-amber-100 bg-amber-500/5' : 'text-slate-300 bg-transparent'}`}>
                              <InteractiveGlossaryText 
                                text={clueItem.text} 
                                vocabulary={currentRound.vocabulary} 
                                onSpeak={handleSpeak} 
                              />
                            </div>

                            {/* Culture comparison card for active progressive clue level (Issue 6) */}
                            {idx === gameState.currentClueIndex && (
                              <div className="mx-5 mb-5 p-4 rounded-xl bg-sky-950/20 border border-sky-900/40 space-y-3">
                                <div>
                                  <span className="text-[10px] uppercase font-black text-sky-400 tracking-wider block mb-1 text-left">
                                    💡 Example
                                  </span>
                                  <p className="text-slate-200 text-sm leading-relaxed font-semibold text-left">
                                    {getCueDetailsAndComparison(idx, currentRound, gameState.config.placeOfLiving.split(',').pop()?.trim() || 'home country').example}
                                  </p>
                                </div>
                                <div className="border-t border-sky-900/30 pt-2.5">
                                  <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider block mb-1 text-left">
                                    ☕ Cultural Contrast
                                  </span>
                                  <p className="text-slate-200 text-sm leading-relaxed font-semibold text-left">
                                    {getCueDetailsAndComparison(idx, currentRound, gameState.config.placeOfLiving.split(',').pop()?.trim() || 'home country').comparison}
                                  </p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>

                      {gameState.currentClueIndex < liveClues.length - 1 && (
                        <div className="mt-5 pt-1">
                          <button
                            onClick={() => {
                              revealNextClue();
                              const nextIdx = gameState.currentClueIndex + 1;
                              const nextClueObj = liveClues[nextIdx];
                              if (nextClueObj) {
                                const comp = getCueDetailsAndComparison(nextIdx, currentRound, gameState.config.placeOfLiving.split(',').pop()?.trim() || 'home country');
                                const fullCardText = `Clue number ${nextIdx + 1}. ${nextClueObj.category.replace(/Level \d+/, '')}. ${nextClueObj.text}. Real world student example. ${comp.example}. Cultural contrast. ${comp.comparison}.`;
                                handleSpeak(fullCardText);
                              }
                            }}
                            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:text-slate-900 font-black py-4 rounded-2xl transition duration-150 text-base uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_4px_0_#9a3412] active:translate-y-1 active:shadow-none"
                          >
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            Skip
                          </button>
                          <p className="text-center text-xs text-rose-450 font-black mt-2.5 uppercase tracking-wide">
                            ⚠️ Cost: Progressive reveals cap score potential by -10% each
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Turn Guess log Panel */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-sky-950/40 space-y-4">

              {currentActivePlayer ? (
                <div className="space-y-4 p-4 bg-sky-950/10 border border-sky-950/60 rounded-xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={currentActivePlayer.avatar} 
                        alt="avatar" 
                        className="w-10 h-10 rounded-full border-2 border-sky-750 bg-slate-900 flex-shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left py-1">
                        <p className="text-lg font-black text-slate-100">{currentActivePlayer.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 border-t border-sky-950/30">
                    {activeGuess ? (
                      <div className="text-sm font-bold text-emerald-400 text-left">
                        📍 Pin set!
                      </div>
                    ) : null}
                    
                    <div className="flex gap-4">
                      <button
                        type="button"
                        disabled={!activeGuess}
                        onClick={() => {
                          recordActivePlayerGuess(false);
                        }}
                        className={`flex-1 py-4 px-6 rounded-2xl text-base font-black tracking-widest transition-all uppercase ${
                          activeGuess 
                            ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-[0_4px_0_#1d4ed8] active:translate-y-1 active:shadow-none' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        Lock Guess
                      </button>
                      <button
                        type="button"
                        onClick={() => skipActivePlayerGuess()}
                        className="py-4 px-6 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 font-extrabold text-white rounded-2xl text-base uppercase tracking-wider transition-all shadow-[0_4px_0_#9f1239] active:translate-y-1 active:shadow-none"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-900/60 p-4 rounded-xl space-y-3 text-center animate-pulse">
                  <p className="text-sm text-emerald-300 font-black flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 animate-bounce" /> All registered students have guessed!
                  </p>
                  <button
                    onClick={handleRevealWithCountdown}
                    disabled={isRevealing}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black py-4.5 rounded-xl shadow shadow-emerald-700/20 active:scale-95 transition disabled:opacity-50"
                  >
                    {isRevealing ? `Revealing in ${countdownValue}...` : 'Reveal Secret Hiding Spot! 🎯'}
                  </button>
                  </div>
              )}

              {/* Progress of other students */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Play Turn Order</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Touch to swap turns</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {gameState.players.map((p, idx) => {
                    const hasGuessed = !!p.guesses[gameState.currentRoundIndex];
                    const isCurrent = currentActivePlayer?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const index = gameState.players.findIndex(player => player.id === p.id);
                          if (index !== -1) {
                            setActivePlayerForGuess(index);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all active:scale-95 text-left border ${
                          hasGuessed 
                            ? 'bg-emerald-950/20 border-emerald-950/40 text-slate-300 hover:bg-emerald-950/35' 
                            : isCurrent 
                              ? 'bg-sky-900/40 border-sky-500 text-sky-200 font-bold' 
                              : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <img src={p.avatar} alt="avatar" className="w-4 h-4 rounded-full bg-slate-950 border border-slate-700 shrink-0" referrerPolicy="no-referrer" />
                          <span className="truncate max-w-[80px] font-semibold">{p.name}</span>
                        </div>
                        <span className="text-[9px] shrink-0 font-bold">
                          {hasGuessed ? '✅' : '⏳'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* REVEALED EDUCATIONAL FEEDBACK PANEL */}
        {gameState.status === 'revealed' && currentRound && (
          <div className="space-y-6 animate-in fade-in duration-400">
            
            {/* Top Navigation Row */}
            <div className="flex gap-2 justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => resetCampaign()}
                className="bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Setup
              </button>
              <span className="font-mono bg-sky-950 text-sky-450 border border-sky-900/40 px-2.5 py-1 rounded-full text-[10px] font-bold">
                Round {gameState.currentRoundIndex + 1} Resolved
              </span>
            </div>

            {/* Revelation Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900 to-teal-950 border border-emerald-800/60 shadow-lg space-y-2">
              <span className="text-[9px] uppercase font-bold text-emerald-300 tracking-widest block">SECRET HIDING SPOT</span>
              <h3 className="text-lg font-black text-white hover:text-emerald-100 transition-colors flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400 scale-125" />
                {currentRound.name}
              </h3>
            </div>

            {/* Things to Try section */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
              <h4 className="font-bold text-xs text-sky-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Things to Try There (English tasks)
              </h4>
              <ul className="space-y-2 text-xs text-slate-200 pl-1">
                {currentRound.thingsToTry.map((task, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="text-sky-400 font-extrabold">{i+1}.</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vocabulary Flashcards */}
            {currentRound.vocabulary && currentRound.vocabulary.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Key Vocabulary (CEFR Alignment)
                </h4>
                
                <div className="space-y-2">
                  {currentRound.vocabulary.map((vocab, i) => (
                    <div key={vocab.word} className="p-3 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-800 transition">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1.5">
                        <span className="font-extrabold text-sm text-sky-400 font-display">{vocab.word}</span>
                        <button
                          onClick={() => handleSpeak(`${vocab.word}. definition: ${vocab.definition}. Example: ${vocab.example}`)}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 italic mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase not-italic mr-1">Meaning:</span> 
                        {vocab.definition}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-[10px] text-slate-500 uppercase mr-1">Example:</strong> 
                        "{vocab.example}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar Challenge */}
            {currentRound.grammarChallenge && (
              <div className="p-4 rounded-xl bg-slate-950 border border-purple-950 space-y-2">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-purple-400">Grammar Skill Lesson</span>
                <p className="text-xs text-purple-200 leading-relaxed">
                  {currentRound.grammarChallenge}
                </p>
              </div>
            )}

            {/* Extra Detail Cards (Dynamically shown if AI generated them) */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              {[
                { title: '🏛️ History', val: currentRound.history },
                { title: '📐 Architecture', val: currentRound.architecture },
                { title: '🌤️ Climate', val: currentRound.climate },
                { title: '🚊 Transport', val: currentRound.transport },
                { title: '🦅 Wildlife', val: currentRound.wildlife },
                { title: '🎵 Music', val: currentRound.music },
                { title: '🎉 Festivals', val: currentRound.festivals },
                { title: '⚽ Sports', val: currentRound.sports },
                { title: '⭐ Famous People', val: currentRound.famousPeople },
                { title: '🛍️ Souvenirs', val: currentRound.souvenirs },
                { title: '🐉 Local Myths', val: currentRound.localMyths },
                { title: '👋 Gestures', val: currentRound.gestures },
                { title: '😎 Slang', val: currentRound.slang },
                { title: '🧩 Hobbies', val: currentRound.hobbies },
                { title: '💼 Economy', val: currentRound.economy },
                { title: '🎓 Education', val: currentRound.education },
                { title: '📚 Literature', val: currentRound.literature },
                { title: '🎬 Movies Here', val: currentRound.movies },
                { title: '📍 Other Landmarks', val: currentRound.landmarks },
              ].filter(item => item.val).map(item => (
                <div key={item.title} className="bg-slate-900 p-2.5 rounded-lg border border-slate-850 shadow-md">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 break-words">{item.title}</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{item.val}</p>
                </div>
              ))}
            </div>

            {currentRound.funFacts && currentRound.funFacts.length > 0 && (
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-850 shadow-md">
                <span className="text-[10px] uppercase font-black text-fuchsia-400 block mb-2">💡 Fun Facts</span>
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-300 marker:text-fuchsia-500">
                  {currentRound.funFacts.map((fact, i) => (
                    <li key={i}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Visual Image Search Queries */}
            {currentRound.imageSearchKeywords && (() => {
              const mainTag = currentRound.imageSearchKeywords.general || currentRound.imageSearchKeywords.food || 'landmark';
              const targetUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(mainTag)}`;
              return (
                <a 
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-slate-900 to-slate-950 p-3 rounded-lg border border-sky-900/30 hover:border-sky-400 hover:bg-slate-900 shadow-md flex items-center justify-between text-xs cursor-pointer transition group" 
                  title={`Search "${mainTag}" on Google Images`}
                >
                  <span className="text-slate-400 flex items-center gap-1.5 group-hover:text-slate-200">
                    <Globe className="w-3.5 h-3.5 text-sky-400 group-hover:animate-pulse" /> Image search tags derived (Click to search)
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono font-bold flex items-center gap-1.5 bg-sky-950/40 border border-sky-900/40 px-2 py-0.5 rounded group-hover:text-sky-300">
                    {mainTag}
                    <Search className="w-2.5 h-2.5" />
                  </span>
                </a>
              );
            })()}
            {/* Cultural Image Slides & Multi-parameter Bento Grid */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 shadow-inner space-y-5">
              <h4 className="font-black text-xs text-emerald-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-900 pb-2.5">
                <Camera className="w-4 h-4 text-emerald-400" /> Cultural Slide Presentation
              </h4>

              {currentRound.imageSearchKeywords && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(currentRound.imageSearchKeywords).map(([key, keyword]) => {
                    if (!keyword) return null;
                    const title = key === 'general' ? '🗺️ Hiding Spot' : key === 'food' ? '🍲 Signature Dish' : key === 'clothes' ? '👘 Festive Outfit' : '🎭 Cultural Vibe';
                    const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(keyword)}`;
                    return (
                      <a 
                        key={key} 
                        href={googleImagesUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="relative rounded-lg overflow-hidden bg-slate-900 border border-slate-800 h-24 group block cursor-pointer transition hover:border-sky-500"
                        title={`Search "${keyword}" on Google Images`}
                      >
                        <img 
                          src={`https://loremflickr.com/400/300/${encodeURIComponent(keyword)}?random=${key}`} 
                          alt={keyword} 
                          className="w-full h-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-2">
                          <span className="text-[8px] uppercase font-black text-indigo-400 tracking-wider font-display">{title}</span>
                          <span className="text-[10px] font-bold text-slate-100 truncate flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                            {keyword}
                            <Search className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-900 pt-2 pb-2">
                <h4 className="font-black text-xs text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" /> Deep Dive: Local Identity Bento Grid
                </h4>
                <button
                  type="button"
                  onClick={() => setIsHoverSpeakActive(!isHoverSpeakActive)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition border ${
                    isHoverSpeakActive 
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-lg shadow-sky-500/10' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                  title="Enable Hover Speak: Hover over any card below to read it aloud"
                >
                  <Volume2 className={`w-3 h-3 ${isHoverSpeakActive ? 'animate-pulse text-sky-400' : ''}`} />
                  <span>{isHoverSpeakActive ? 'Hover Speak ON' : 'Hover Speak OFF'}</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto separator-scroll bg-slate-900/10 p-1 rounded-lg">
                {[
                  { label: "🍲 Signature Food", val: currentRound.food, color: "text-rose-400" },
                  { label: "🎭 Local Culture", val: currentRound.culture, color: "text-amber-400" },
                  { label: "👔 Traditional Clothes", val: currentRound.clothes, color: "text-indigo-400" },
                  { label: "🛑 Cultural Taboos", val: currentRound.taboos, color: "text-red-400" },
                  { label: "🔮 Common Superstitions", val: currentRound.superstitions, color: "text-purple-400" },
                  { label: "🏺 Traditional Crafts", val: currentRound.traditionalCrafts, color: "text-amber-300" },
                  { label: "🌲 Nature & Biospheres", val: currentRound.natureParks, color: "text-emerald-400" },
                  { label: "🛹 Weekend Routines", val: currentRound.weekendActivities, color: "text-cyan-400" },
                  { label: "🙇 Etiquette & Manners", val: currentRound.etiquetteRules, color: "text-sky-450" },
                  { label: "🗣️ Regional Accents", val: currentRound.regionalAccents, color: "text-pink-400" },
                  { label: "⏳ Historic Core Era", val: currentRound.historicalEra, color: "text-yellow-400" },
                  { label: "📐 Landmark Geometrics", val: currentRound.landmarkHeight, color: "text-teal-400" },
                  { label: "🪙 Cost of Living Index", val: currentRound.costOfLiving, color: "text-green-400" },
                  { label: "👁️ Other Major Sights", val: currentRound.mainSights, color: "text-fuchsia-400" },
                  { label: "🎨 Street Art Vibe", val: currentRound.streetArt, color: "text-rose-300" },
                  { label: "🐱 Pet Preferences", val: currentRound.localPets, color: "text-amber-200" },
                  { label: "👨‍👩‍👧‍👦 Family Nuance", val: currentRound.familyStructure, color: "text-cyan-300" },
                  { label: "☕ Beverage Rituals", val: currentRound.localCoffeeCulture, color: "text-amber-500" },
                  { label: "⏱️ Time punctuality Value", val: currentRound.timeManagement, color: "text-purple-300" },
                  { label: "🛒 Smart Shopping Hacks", val: currentRound.shoppingHacks, color: "text-emerald-300" },
                  { label: "🌋 Famous Disasters", val: currentRound.famousDisasters, color: "text-red-500" },
                  { label: "👘 Folklore Outfits Usage", val: currentRound.folkloreOutfits, color: "text-violet-400" },
                  { label: "🕵️ Architectural Crypts", val: currentRound.architectureSecret, color: "text-slate-400" },
                  { label: "🌺 Emblematic Symbols", val: currentRound.nationalSymbols, color: "text-pink-200" }
                ].filter(item => item.val).map(item => (
                  <div 
                    key={item.label} 
                    onMouseEnter={() => handleHoverSpeak(`${item.label}. ${item.val}`)}
                    onMouseLeave={() => {
                      if (isHoverSpeakActive && synthRef.current) {
                        synthRef.current.cancel();
                      }
                    }}
                    className={`bg-slate-900/80 p-2.5 rounded-lg border shadow-md flex flex-col justify-between transition-all duration-200 ${
                      isHoverSpeakActive 
                        ? 'hover:border-sky-400 hover:bg-slate-850/90 cursor-help active:scale-98' 
                        : 'border-slate-850/80'
                    }`}
                  >
                    <span className={`text-[10px] uppercase font-black ${item.color} block mb-1 break-words font-mono`}>{item.label}</span>
                    <p className="text-[11px] text-slate-350 leading-relaxed font-medium">{item.val}</p>
                  </div>
                ))}
              </div>

              {currentRound.phraseBook && currentRound.phraseBook.length > 0 && (
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-850 shadow-md">
                  <span className="text-[10px] uppercase font-black text-sky-400 block mb-2 font-mono flex items-center gap-1">
                    🗣️ Survival Phrasebook & English Translations
                  </span>
                  <div className="space-y-2">
                    {currentRound.phraseBook.map((phrase, i) => (
                      <div key={i} className="flex flex-col text-xs p-1.5 hover:bg-slate-850/60 rounded transition-colors group border-b border-slate-800 last:border-0 pl-2">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-extrabold text-slate-200 text-[12px]">{phrase.phrase}</span>
                          <button 
                            onClick={() => handleSpeak(phrase.phrase)}
                            className="text-slate-500 hover:text-sky-400 transition ml-2 shrink-0 p-1 bg-slate-950 rounded hover:scale-105"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-slate-400 italic text-[11px]">"{phrase.translation}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Round Summary Scoreboard */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-900">
                Round Standings & Score Awards
              </span>
              <div className="space-y-2">
                {gameState.players
                  .map(p => {
                    const guess = p.guesses[gameState.currentRoundIndex];
                    return { 
                      player: p, 
                      guess,
                      timeBonus: guess ? Math.max(0, 500 - Math.floor(guess.timeElapsedSeconds * 2.78)) : 0
                    };
                  })
                  .sort((a, b) => {
                    const aScore = a.guess ? a.player.score : -1;
                    const bScore = b.guess ? b.player.score : -1;
                    return bScore - aScore; // Sort by highest score first
                  })
                  .map(({ player, guess, timeBonus }, idx) => (
                    <div key={player.id} className="flex items-center justify-between py-2 px-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60 transition">
                      <div className="flex items-center gap-3 truncate">
                        <img src={player.avatar} alt="avatar" className="w-8 h-8 rounded-full border-2 border-slate-700 bg-slate-950 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-slate-200 text-sm">{player.name}</span>
                          <span className="block text-[10px] text-slate-500">
                            {idx === 0 ? '🏆 Currently Leading' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <p className="font-mono text-emerald-400 font-black text-xs">
                          {guess ? (guess.skipped ? 'Skipped' : `${Math.round(guess.distance).toLocaleString()} km`) : 'No Guess'}
                        </p>
                        {guess && !guess.skipped && (
                          <p className="text-[9px] text-amber-500/90 font-mono font-bold tracking-tight">
                            +{timeBonus} Speed Bonus ({Math.round(guess.timeElapsedSeconds)}s)
                          </p>
                        )}
                        <p className="text-[9px] text-slate-400 tracking-wider">
                          <span className="font-bold text-slate-300">{player.score}</span> PTS TOTAL
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Advance Button */}
            <button
              onClick={nextEslRound}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-4 rounded-xl transition flex items-center justify-center gap-2 text-base active:scale-95 shadow shadow-sky-600/10"
            >
              Advance to Next Round
              <ArrowRight className="w-5 h-5 animate-bounce-horizontal" />
            </button>

          </div>
        )}

        {/* CAMPAIGN FINISHED SCREEN CEREMONY */}
        {gameState.status === 'campaign_finished' && (
          <div className="text-center space-y-6 animate-in zoom-in-95 duration-400 py-4">
            
            <div className="relative inline-block">
              <Award className="w-16 h-16 text-yellow-500 mx-auto animate-pulse" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-100 font-display">Campaign Completed!</h2>
              <p className="text-xs text-slate-400">Champion ceremony & scoreboard awards</p>
            </div>

            {/* Absolute Leaderboard Badges */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="space-y-3">
                {gameState.players
                  .map(p => p)
                  .sort((a, b) => b.score - a.score)
                  .map((player, idx) => {
                    let medalEmoji = '🎗️';
                    let medalColor = 'text-slate-400';
                    if (idx === 0) { medalEmoji = '🥇'; medalColor = 'text-yellow-400'; }
                    else if (idx === 1) { medalEmoji = '🥈'; medalColor = 'text-slate-300'; }
                    else if (idx === 2) { medalEmoji = '🥉'; medalColor = 'text-amber-600'; }

                    return (
                      <div 
                        key={player.id} 
                        className={`flex items-center justify-between p-3 rounded-lg text-sm border transition-all duration-300
                          ${idx === 0 
                            ? 'bg-yellow-950/10 border-yellow-800/40 font-black' 
                            : 'bg-slate-900 border-slate-850'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{medalEmoji}</span>
                          <div>
                            <p className="text-slate-200 font-bold">{player.name}</p>
                            <p className="text-[10px] text-slate-500 font-normal">Average error: {player.guesses.length > 0 ? Math.round(player.totalDistance / player.guesses.length) : 0} km</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-black ${idx === 0 ? 'text-yellow-400 text-lg' : 'text-sky-400'}`}>
                            {player.score} pts
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {Math.round(player.totalDistance).toLocaleString()} km combined
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={resetCampaign}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                Configure New Campaign
              </button>
            </div>

          </div>
        )}

      </div>

      {/* General Settings Overlay Modal */}
      <AnimatePresence>
        {showGeneralSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                    <Settings className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">General Session Settings</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Tutorly GeoSeeker Control Center</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGeneralSettings(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* 1. Browser Audio Reader Configuration */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-sky-400 font-extrabold flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-sky-400" />
                    Browser Audio Reader Config
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Personalize default pronunciation voices. Microsoft Ava Multilingual is recommended for optimal ESL audio reading.
                  </p>

                  <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                    <div className="relative" ref={dropdownRef}>
                      <label className="block text-[10px] uppercase font-bold tracking-wide text-slate-400 mb-1.5">Selected Reading Voice</label>
                      <button 
                        type="button" 
                        onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                        className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-3 text-left truncate flex justify-between items-center outline-none focus:border-sky-500 hover:bg-slate-800 transition"
                      >
                        {selectedVoiceName || "System Default Voice (Auto)"}
                        <span className="text-[9px] text-sky-500 uppercase font-black tracking-widest ml-1 bg-sky-950/50 px-2 py-0.5 rounded border border-sky-900/40">Select</span>
                      </button>
                      
                      <AnimatePresence>
                        {showVoiceDropdown && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute left-0 right-0 z-50 mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden"
                          >
                            <div className="p-2 border-b border-slate-800 bg-slate-900">
                              <input 
                                type="text" 
                                placeholder="Search voice name (e.g. Ava, David, Hazel)..." 
                                value={voiceSearchQuery}
                                onChange={(e) => setVoiceSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2 outline-none focus:border-sky-500 text-slate-250"
                              />
                            </div>
                            <ul className="max-h-48 overflow-y-auto divide-y divide-slate-900">
                              {voices.filter(v => v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) || v.lang.toLowerCase().includes(voiceSearchQuery.toLowerCase())).map(v => (
                                <li 
                                  key={v.name} 
                                  onClick={() => { setSelectedVoiceName(v.name); setShowVoiceDropdown(false); }}
                                  className={`px-3.5 py-2.5 text-xs text-slate-350 hover:bg-sky-600 hover:text-white cursor-pointer truncate transition flex justify-between items-center ${v.name.toLowerCase().includes('microsoft ava') ? 'bg-indigo-950/20 text-indigo-300 font-bold' : ''}`}
                                >
                                  <span>{v.name}</span>
                                  <span className="text-[9px] text-slate-500 font-mono bg-black/40 px-1.5 py-0.5 rounded">{v.lang}</span>
                                </li>
                              ))}
                              {voices.length === 0 && <li className="px-3 py-3 text-xs text-slate-500 italic text-center">No reading voices detected.</li>}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wide text-slate-400 mb-1.5">Speed (Rate): {speechRate}x</label>
                        <input 
                          type="range"
                          min={0.5} 
                          max={1.8} 
                          step={0.1} 
                          value={speechRate}
                          onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                          className="w-full accent-sky-500 bg-slate-900 border border-slate-800 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wide text-slate-400 mb-1.5">Pitch: {speechPitch}</label>
                        <input 
                          type="range"
                          min={0.5} 
                          max={1.5} 
                          step={0.1} 
                          value={speechPitch}
                          onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                          className="w-full accent-sky-500 bg-slate-900 border border-slate-800 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Google Maps API License & Keys */}
                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  <h4 className="text-xs uppercase tracking-wider text-sky-400 font-extrabold flex items-center gap-2">
                    <Key className="w-4 h-4 text-sky-400" />
                    Map Attribution & Licensing Keys
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Custom API keys remove Google's "Development only" watermarks, unlock unrestricted street-view queries, and avoid limits.
                  </p>

                  <form onSubmit={handleSaveMapsKey} className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                    <div className="relative">
                      <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={mapsKey}
                        onChange={(e) => setMapsKey(e.target.value)}
                        placeholder="Paste AIzaSy... (Your Google Maps API key)"
                        className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg pl-10 pr-3.5 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 transition font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2 px-4 rounded-lg transition text-xs active:scale-95 duration-100"
                      >
                        Save & Apply License Key
                      </button>
                      {localStorage.getItem('google_maps_api_key') && (
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem('google_maps_api_key');
                            setMapsKey('');
                            window.location.reload();
                          }}
                          className="bg-red-950/30 hover:bg-red-900/40 text-red-400 font-bold py-2 px-3 rounded-lg transition text-xs border border-red-900/30 active:scale-95 duration-100"
                        >
                          Clear Key
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* 3. Static Map Attribution Acknowledgement */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 text-[10px] text-slate-500 leading-relaxed">
                  <span className="font-bold text-slate-400 block mb-1">Interactive Terrain Engine Summary</span>
                  This utility links with real Google Maps and Street View visual metadata feeds in runtime mode. All location coordinates and vocabulary profiles are calculated server-side using Gemini AI vectors.
                </div>

              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGeneralSettings(false)}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2.5 px-6 rounded-xl transition text-xs active:scale-95 duration-150"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
