import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ActiveTimer, SessionToLogInfo, ErrorLog, PendingAIConfirmation } from '../types2';
import { AppCharacter } from '../types';
import { DEFAULT_APP_CHARACTERS, isBrokenAvatarUrl } from '../utils/characters';
import { buildCharacterAvatarDataUri } from '../utils/voiceGroups';
import { LOGO_URL } from '../constants2';
import { idbZustandStorage } from '../utils/storageAdapter';


const MAX_ERRORS = 50;

/**
 * Characters persisted back when every avatar was force-generated carry an inline SVG
 * monogram instead of the companion's real portrait. A monogram is indistinguishable from
 * a deliberate custom avatar, so only rows whose code/id/name match the built-in catalog are
 * upgraded back to the real photo — anything the tutor authored by hand is left untouched.
 */
function restoreCatalogPhoto<T extends { code?: string; id?: string; name?: string; avatarUrl?: string }>(character: T): T {
    const url = character?.avatarUrl || '';
    if (!url.startsWith('data:image/svg')) return character;
    const match =
        DEFAULT_APP_CHARACTERS.find(c => (c.code && c.code === character.code) || (c.id && c.id === character.id)) ||
        DEFAULT_APP_CHARACTERS.find(c => (c.name || '').toLowerCase() === String(character.name || '').toLowerCase());
    if (!match || !match.avatarUrl || isBrokenAvatarUrl(match.avatarUrl)) return character;
    return { ...character, avatarUrl: match.avatarUrl };
}

/**
 * Keeps the saved companion roster in step with the built-in catalog: a roster that
 * was saved before the 8 Classmate personas existed only holds 12 entries, so the
 * missing catalog companions are appended (they show up in the Classmate studio AND
 * in the Annotations → Classmates widget). Every catalog row also gets its real
 * portrait back when it was persisted as a generated monogram.
 */
export function mergeCatalogCharacters<T extends { code?: string; id?: string; name?: string; avatarUrl?: string }>(list: T[]): T[] {
    const restored = (Array.isArray(list) ? list : []).map(c => restoreCatalogPhoto({ ...c }));
    const missing = DEFAULT_APP_CHARACTERS.filter(def => !restored.some(c =>
        (def.code && c.code && def.code === c.code) ||
        (def.id && c.id && def.id === c.id) ||
        (def.name || '').toLowerCase() === String(c.name || '').toLowerCase()
    )) as unknown as T[];
    return missing.length ? [...restored, ...missing] : restored;
}

export interface AppState {
    loading: boolean;
    voices: SpeechSynthesisVoice[];
    globalVoice: string | null;
    activeTimer: ActiveTimer | null;
    sessionToLogInfo: SessionToLogInfo | null;
    errors: ErrorLog[];
    logoUrl: string;
    appName: string;
    appAddress: string;
    characters: AppCharacter[];
    tutorInfo: {
        name: string;
        email: string;
        avatarId: string;
        voice?: string;
        interests?: string;
        teachingMethod?: string;
        bio?: string;
        useForPersonalization?: boolean;
        baseTotal?: number;
        historicalHoursTaught?: number;
        tutorFacts?: string;
        timezone?: string;
        timeOffsetMinutes?: number;
        sendGridApiKey?: string;
        sendingEmail?: string;
        emailTemplate?: string;
        splashScreenText?: string;
        splashScreenSubtext?: string;
        enableSplashScreens?: boolean;
        subscribeEmail?: string;
        subscribeEnabled?: boolean;
        streakWarningDays?: string;
        backupReminderInterval?: string;
        notifyOnStreakFreeze?: boolean;
        notifyOnQuizSubmit?: boolean;
        notifyOnIdle?: boolean;
    };
    pendingAIConfirmation: PendingAIConfirmation | null;
    
    // Actions
    setLoading: (isLoading: boolean) => void;
    initVoices: () => void;
    setGlobalVoice: (voiceName: string) => void;
    speak: (text: string, voiceName?: string) => void;
    startTimer: (learnerId: string, learnerName: string, durationMinutes: number, breakInterval: number, alarmType?: string) => void;
    stopTimer: () => void;
    clearSessionToLogInfo: () => void;
    logError: (message: string, stack?: string) => void;
    clearErrors: () => void;
    setLogoUrl: (url: string) => void;
    setAppName: (name: string) => void;
    setAppAddress: (url: string) => void;
    setTutorInfo: (info: Partial<AppState['tutorInfo']>) => void;
    setPendingAIConfirmation: (data: PendingAIConfirmation | null) => void;
    setCharacters: (characters: AppCharacter[]) => void;
    addCharacter: (character: AppCharacter) => void;
    updateCharacter: (codeOrId: string, updated: Partial<AppCharacter>) => void;
    deleteCharacter: (codeOrId: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            loading: false,
            voices: [],
            globalVoice: null,
            activeTimer: null,
            sessionToLogInfo: null,
            errors: [],
            logoUrl: LOGO_URL,
            appName: 'Tutor Academy',
            appAddress: 'https://tutomy.com',
            characters: DEFAULT_APP_CHARACTERS,
            tutorInfo: {
                name: 'Tutor Alex',
                email: 'tutor.alex@example.com',
                avatarId: 'tutor-default-avatar',
                voice: 'Microsoft Ryan Online (Natural) - English (United Kingdom)',
                interests: 'Making learning fun and engaging',
                teachingMethod: 'Socratic method, communicative approach',
                bio: 'Experienced ESL tutor',
                useForPersonalization: true,
                baseTotal: 675,
                historicalHoursTaught: 0,
                tutorFacts: '',
                timezone: 'America/Toronto',
                enableSplashScreens: true,
                subscribeEmail: '',
                subscribeEnabled: false,
                streakWarningDays: '3',
                backupReminderInterval: 'weekly',
                notifyOnStreakFreeze: true,
                notifyOnQuizSubmit: true,
                notifyOnIdle: false,
            },
            pendingAIConfirmation: null,

            setLoading: (isLoading) => set({ loading: isLoading }),
            
            initVoices: () => {
                const loadVoices = () => {
                    const availableVoices = window.speechSynthesis.getVoices();
                    if (availableVoices.length > 0) {
                        set({ voices: availableVoices });
                        if (!get().globalVoice || get().globalVoice?.includes('David') || get().globalVoice?.includes('Zira')) {
                            const defaultVoice = availableVoices.find(v => v.name.includes('Microsoft Emma') || v.name.includes('Emma')) || availableVoices.find(v => v.name.includes('Microsoft Ava') || v.name.includes('Ava')) || availableVoices.find(v => v.lang.includes('en') && v.name.includes('Natural') && !v.name.includes('David') && !v.name.includes('Zira')) || availableVoices.find(v => v.lang.includes('en') && !v.name.includes('David') && !v.name.includes('Zira'));
                            if (defaultVoice) {
                                set({ globalVoice: defaultVoice.name });
                            }
                        }
                    }
                };
                if (typeof window.speechSynthesis === 'undefined') return;
                if (window.speechSynthesis.getVoices().length === 0) {
                    window.speechSynthesis.onvoiceschanged = loadVoices;
                } else {
                    loadVoices();
                }
            },

            setGlobalVoice: (voiceName) => set({ globalVoice: voiceName }),

            speak: (text, voiceName) => {
                const { globalVoice, voices } = get();
                const targetVoiceName = voiceName || globalVoice;
                if (!window.speechSynthesis || !text) return;
                window.speechSynthesis.cancel();

                // Clean text for speech
                let cleanText = String(text);
                cleanText = cleanText.replace(/```[\s\S]*?```/g, ' ');
                cleanText = cleanText.replace(/<(code|script|style)[\s\S]*?<\/\1>/gi, ' ');
                cleanText = cleanText.replace(/<[^>]*>?/gm, ' ');
                
                const entityMap: Record<string, string> = {
                  '&amp;': ' and ',
                  '&#38;': ' and ',
                  '&apos;': "'",
                  '&#39;': "'",
                  '&rsquo;': "'",
                  '&lsquo;': "'",
                  '&quot;': '"',
                  '&#34;': '"',
                  '&ldquo;': '"',
                  '&rdquo;': '"',
                  '&nbsp;': ' ',
                  '&#160;': ' ',
                  '&lt;': ' ',
                  '&gt;': ' '
                };
                cleanText = cleanText.replace(/&[a-zA-Z0-9#]+;/g, (m) => entityMap[m] || ' ');
                cleanText = cleanText.replace(/[\u2018\u2019\u201B\u2032\`\u00B4\u02BC]/g, "'");
                cleanText = cleanText.replace(/[\u201C\u201D\u201E\u2033]/g, '"');
                cleanText = cleanText.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, ' - ');
                cleanText = cleanText.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F5FF}\u{2300}-\u{23FF}]/gu, '');
                cleanText = cleanText.replace(/[*_~#\`\[\]{}|\\^]/g, ' ').replace(/\s+/g, ' ').trim();

                if (!cleanText) return;

                const browserVoices = window.speechSynthesis.getVoices();
                const selectedVoice = (voices.length > 0 ? voices : browserVoices).find(v => v.name === targetVoiceName);

                const sentenceChunks = cleanText.split(/(?<=[.!?])\s+|\n+/).filter(s => s.trim().length > 0);
                let chunkIdx = 0;

                function speakChunk() {
                  if (chunkIdx >= sentenceChunks.length) return;
                  const chunk = sentenceChunks[chunkIdx++].trim();
                  if (!chunk) {
                    speakChunk();
                    return;
                  }
                  const utterance = new SpeechSynthesisUtterance(chunk);
                  if (selectedVoice) {
                    utterance.voice = selectedVoice;
                  } else if (browserVoices.length > 0) {
                    const matched = browserVoices.find(v => v.name === targetVoiceName);
                    if (matched) utterance.voice = matched;
                  }
                  utterance.rate = 0.98;
                  utterance.onend = () => setTimeout(speakChunk, 100);
                  utterance.onerror = () => setTimeout(speakChunk, 100);
                  window.speechSynthesis.speak(utterance);
                }

                speakChunk();
            },

            startTimer: (learnerId, learnerName, durationMinutes, breakInterval, alarmType) => {
                const startTime = Date.now();
                const endTime = startTime + durationMinutes * 60 * 1000;
                set({ activeTimer: { learnerId, learnerName, startTime, durationMinutes, endTime, breakInterval, alarmType: alarmType || 'zen' }});
            },

            stopTimer: () => {
                const { activeTimer } = get();
                if (!activeTimer) return;
                const elapsedMs = Date.now() - activeTimer.startTime;
                const elapsedMinutes = Math.max(1, Math.round(elapsedMs / (1000 * 60)));
                set({ sessionToLogInfo: { learnerId: activeTimer.learnerId, elapsedMinutes } as any, activeTimer: null });
            },
            
            clearSessionToLogInfo: () => set({ sessionToLogInfo: null }),
            
            logError: (message, stack) => {
                const newError = { message, stack, timestamp: new Date().toISOString() as any } as ErrorLog;
                set(state => ({ errors: [newError, ...state.errors].slice(0, MAX_ERRORS)}));
                try {
                    fetch('/error_log.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newError)
                    }).catch(() => {});
                } catch(e) {}
            },

            clearErrors: () => {
                set({ errors: [] });
                try {
                    fetch('/error_log.php', { method: 'DELETE' }).catch(() => {});
                } catch(e) {}
            },
            
            setLogoUrl: (url) => set({ logoUrl: url }),
            setAppName: (name) => set({ appName: name }),
            setAppAddress: (url) => set({ appAddress: url }),
            
            setTutorInfo: (info) => set(state => ({ tutorInfo: { ...state.tutorInfo, ...info } })),

            setPendingAIConfirmation: (data) => set({ pendingAIConfirmation: data }),

            setCharacters: (characters) => set({ characters }),
            addCharacter: (character) => set(state => ({ characters: [...state.characters, character] })),
            updateCharacter: (codeOrId, updated) => set(state => ({
                characters: state.characters.map(c => (c.code === codeOrId || c.id === codeOrId) ? { ...c, ...updated } : c)
            })),
            deleteCharacter: (codeOrId) => set(state => ({
                characters: state.characters.filter(c => c.code !== codeOrId && c.id !== codeOrId)
            })),

        }),
        {
            name: 'app-storage',
            partialize: (state) => ({
                globalVoice: state.globalVoice,
                errors: state.errors,
                activeTimer: state.activeTimer,
                logoUrl: state.logoUrl,
                appName: state.appName,
                appAddress: state.appAddress,
                characters: state.characters,
                tutorInfo: state.tutorInfo,
                pendingAIConfirmation: state.pendingAIConfirmation,
            }),
            onRehydrateStorage: (state) => {
                if (state?.activeTimer && state.activeTimer.endTime <= Date.now()) {
                    state.activeTimer = null; // Clear expired timer on load
                }
                // Migrate old persisted characters: replace broken/unreliable photo URLs
                // with tiny generated SVG avatars so avatars never show broken links.
                if (state?.characters && Array.isArray(state.characters)) {
                    state.characters = mergeCatalogCharacters(state.characters.map(c => ({
                        ...c,
                        avatarUrl: isBrokenAvatarUrl(c.avatarUrl) ? buildCharacterAvatarDataUri(c.name, c.gender) : c.avatarUrl,
                    })));
                }
            },
            version: 4,
            migrate: (persisted: any, version: number) => {
                if (version < 2 && persisted?.characters && Array.isArray(persisted.characters)) {
                    persisted.characters = persisted.characters.map((c: any) => restoreCatalogPhoto({
                        ...c,
                        avatarUrl: isBrokenAvatarUrl(c?.avatarUrl) ? buildCharacterAvatarDataUri(c?.name || '?', c?.gender) : c?.avatarUrl,
                    }));
                }
                // v3: portraits that were generated as monograms by an older build are
                // restored to the companion's real photo (the Studio reads this list).
                if (version < 3 && persisted?.characters && Array.isArray(persisted.characters)) {
                    persisted.characters = persisted.characters.map((c: any) => restoreCatalogPhoto(c));
                }
                // v4: append the Classmate personas that did not exist when this roster
                // was saved, so every studio shows the full companion catalog.
                if (version < 4 && persisted?.characters && Array.isArray(persisted.characters)) {
                    persisted.characters = mergeCatalogCharacters(persisted.characters);
                }
                return persisted as any;
            },
        }
    )
);