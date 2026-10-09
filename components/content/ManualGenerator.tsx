
import React, { FC, useState, useEffect, useRef } from 'react';
import type { LearnerProfile, LearnerContent, AppCharacter } from '../../types';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { getManualPrompt, getStrictLanguageTutorPromptBlock } from '../../utils/manualPrompts';
import { lessonTypeGuideFor } from '../../utils/lessonTypeGuide';
import { getPedagogicalHistoryPromptBlock } from '../../utils/pedagogicalHistory';
import { CEFR_LEVEL_ORDER, CEFR_LEVEL_LABELS, CEFR_GRAMMAR_TIERS, TIER_NAMES, getCefrTierTopics, getCumulativeCefrTopics, countCumulativeCefrTopics, buildCefrGrammarConstraintBlock, getChapterCefrGuard, chapterGuardRank, type ChapterCefrGuard } from '../../utils/cefrGrammarDictionary';
import { handleSaveTestLabAsHtml } from '../../utils/testLabHtmlGenerator';
import { generateInteractiveLessonHtml } from '../../utils/interactiveLessonHtmlGenerator';
import { generateLearningAppV2Html } from '../../utils/learningAppV2HtmlGenerator';
import { generateFlipbookHomeworkHtml } from '../../utils/flipbookHtmlGenerator';
import { generateGamifiedChallengeHtml } from '../../utils/gamifiedChallengeHtmlGenerator';
import { handleSaveLearningAppAsInteractiveHtml } from '../../utils/learningAppHtmlGenerator';
import { saveAndExportHtmlLesson } from '../../utils/htmlLessonSaver';
import { handleSaveConversationMakerAsHtml } from '../../utils/conversationMakerHtmlGenerator';
import { generateExamSimulatorHtml, EXAM_PROFILE_TASK_TYPE_MATRIX, resolveExamTaskType, validateExamDefinition } from '../../tutorly-lessons/Mock-Test/ExamSimulatorHtmlGenerator';
import { generateExamHtml } from '../../tutorly-lessons/Mock_Test_V3/ExamSimulatorHtmlGenerator.v3';
import { EXAM_PROFILE_V2_LABELS, EXAM_PROFILE_V2_TASK_TYPE_MATRIX, resolveExamV2TaskType } from '../../utils/manual_prompts/mock_test_v2_matrix';
import { fixJson, validateJson } from '../../utils/jsonTools';
import { calculateLessonStats } from '../../utils/lessonStats';
import { generateContentWithRetry } from '../../services/generation/core';
import { groupClassPromptBlock } from '../../services/groupParticipants';
import { H5P_TYPES } from '../../utils/h5pTypes';
import { MOCK_JSON_DATA } from '../../data/mockJsonData';
import { getFullCoverageMockJson } from '../../data/fullCoverageMock';
import { buildInteractiveLessonMockJson } from '../../data/interactiveLessonMock';
import { buildLearningAppV2MockJson } from '../../data/learningAppV2Mock';
import { buildFlipbookHomeworkMockJson } from '../../data/flipbookHomeworkMock';
import { buildGamifiedChallengeMock, buildGamifiedChallengeMockJson } from '../../data/gamifiedChallengeMock';
import { generateMusicLessonStandaloneHtml } from '../../utils/musicLessonHtmlGenerator';
import { buildMusicLessonMockJson } from '../../data/musicLessonMock';
import { applySavedTimings, clearSavedTimings, loadSavedTimings } from '../../utils/musicTimingStore';
import { generateDailyLessonHtml, normalizeDailyLesson } from '../../utils/dailyLessonHtmlGenerator';
import { buildDailyLessonMockJson } from '../../data/dailyLessonMock';
import { generateLiveLessonHtml } from '../../utils/liveLessonHtmlGenerator';
import { buildLiveLessonMockJson, normalizeLiveLesson } from '../../data/liveLessonMock';
import { generateVideoLessonHtml } from '../../utils/videoLessonHtmlGenerator';
import { buildVideoLessonMockJson, normalizeVideoLesson } from '../../data/videoLessonMock';
import { validateLessonData, generateStandaloneHtml, VOICE_REGIONS, VOICE_PRESETS } from '../../tutorly-lessons/Avatar_Lesson/avatarhtmlgenerator';
import { generateStandaloneHtmlV2 } from '../../tutorly-lessons/Avatar_Lesson_V2/htmlgenerator';
import { handleSaveSimulationAsHtml } from '../../utils/simulationHtmlGenerator';
import { saveLessonPlanAsHtml } from '../../utils/lessonPlanHtmlGenerator';
import { handleSaveSlidesAsHtml } from '../../utils/slidesHtmlGenerator';
import { handleSaveStudyGuideAsInteractiveHtml } from '../../utils/studyGuideHtmlGenerator';
import { handleSavePartyModeAsHtml } from '../../utils/partyModeHtmlGenerator';
import { useAppStore } from '../../store/useAppStore';
import { SearchableVoiceSelect } from '../ui/SearchableVoiceSelect';
import { getCharacterByCode, getCharacterAvatarFallback, DEFAULT_APP_CHARACTERS, isCompanionVoiceCode, resolveGlobalReadAloudVoice } from '../../utils/characters';
import { isEnglishLanguage, findLanguageVoiceSet, pickVoiceForLanguage, languageVoiceLabel } from '../../utils/voices';
import { useAuthStore } from '../../store/useAuthStore';
import { isLessonAllowed, LESSON_TIER_MAP, UserTier } from '../../utils/tiers';
import { TierGatedOverlay } from '../ui/TierGatedOverlay';
import { CLASSMATE_CHARACTERS, getClassmateCharacterById, getFriendshipMeterStatus, ClassmateCharacter } from '../../utils/classmateCharacters';
import { generateClassmateMasterPromptText } from '../../utils/html/promptTexts';
import { handleSaveClassmateAsHtml, getDefaultClassmateSampleJson, copyClassmateHtml5 } from '../../utils/classmateStandalone';
import { getCategoryById } from '../../data/learnerCategories';
import { searchLessonTypes } from '../../utils/lessonTypeSearch';
import { buildLessonFileName, getLessonFilePrefill, LessonAudience } from '../../utils/lessonFileNaming';


/** Collapsible section header used to organize the Lesson Creator workflow
 *  into clean accordions — every existing setting stays inside, just tucked away
 *  until the tutor needs it. */
const GeneratorSection: FC<{
  title: string;
  subtitle?: string;
  icon?: string;
  defaultOpen?: boolean;
  badgeText?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, defaultOpen = true, badgeText, children }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-5 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <i className={`fas ${icon} text-indigo-500 text-sm`}></i>}
          <div className="min-w-0">
            <span className="font-extrabold text-slate-800 text-sm block truncate">{title}</span>
            {subtitle && <span className="text-[10px] text-slate-500 block truncate">{subtitle}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badgeText && <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 whitespace-nowrap">{badgeText}</span>}
          <i className={`fas ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[11px] text-slate-400`}></i>
        </div>
      </button>
      {isOpen && <div className="p-4 border-t border-slate-200">{children}</div>}
    </div>
  );
};

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

const BROWSER_VOICE_MAP: Record<string, string> = {
  'male1': 'Microsoft Ryan Online',
  'male2': 'Microsoft Thomas Online',
  'male3': 'Microsoft Liam online',
  'male4': 'Microsoft Brianmultilingual online',
  'female1': 'Microsoft Clara online',
  'female2': 'Microsoft Libby Online',
  'female3': 'Microsoft Emma Online',
  'female4': 'Microsoft Natasha Online',
};
const DEFAULT_VOICE_NAME = 'Microsoft Ava Multilingual online';
import AudioGenerator from './AudioGenerator';
import LiveLessonStudio from './LiveLessonStudio';

interface ManualGeneratorProps {
    learner: LearnerProfile;
    onContentRender: (type: string, data: any) => void;
    tutorProfile?: any;
    onSaveContent?: (content: any) => void;
    onSaveLearnerSettings?: (settings: any) => void;
    onUpdateLearner?: (learner: any) => void;
    /** Lesson type id to auto-select in Step 1 (e.g. 'learningAppV2') when the tutor arrives from a gallery tile. */
    presetType?: string;
}

const EXAM_PROFILE_LABELS: Record<string, string> = {
  ielts_academic_paper_2026: "IELTS Academic (Paper)",
  ielts_academic_computer_2026: "IELTS Academic (Computer)",
  ielts_general_paper_2026: "IELTS General (Paper)",
  ielts_general_computer_2026: "IELTS General (Computer)",
  ielts_ukvi_2026: "IELTS UKVI",
  ielts_life_skills_a1_2026: "IELTS Life Skills A1",
  ielts_life_skills_b1_2026: "IELTS Life Skills B1",
  toefl_ibt_2026: "TOEFL iBT",
  toefl_essentials_2026: "TOEFL Essentials",
  toefl_itp_2026: "TOEFL ITP",
  toefl_junior_2026: "TOEFL Junior",
  pte_academic_2026: "PTE Academic",
  pte_core_2026: "PTE Core",
  pte_home_a1_2026: "PTE Home A1",
  pte_home_b1_2026: "PTE Home B1",
  duolingo_english_test_2026: "Duolingo English Test (DET)",
  cambridge_a2_key_2026: "Cambridge A2 Key",
  cambridge_b1_preliminary_2026: "Cambridge B1 Preliminary",
  cambridge_b2_first_2026: "Cambridge B2 First",
  cambridge_c1_advanced_2026: "Cambridge C1 Advanced",
  cambridge_c2_proficiency_2026: "Cambridge C2 Proficiency",
  celpip_general_2026: "CELPIP General",
  celpip_general_ls_2026: "CELPIP General LS",
  oet_2026: "OET (Occupational English Test)",
  trinity_ise_2026: "Trinity ISE",
  aptis_2026: "Aptis",
  languagecert_2026: "LanguageCert",
  gcse_english_language_2026: "GCSE English Language",
  gcse_english_literature_2026: "GCSE English Literature",
  gcse_mathematics_2026: "GCSE Mathematics",
  gcse_combined_science_2026: "GCSE Combined Science",
  eleven_plus_2026: "Eleven Plus (11+)",
  iseb_common_entrance_2026: "ISEB Common Entrance",
  ssat_upper_middle_2026: "SSAT Upper/Middle",
  sat_2026: "SAT",
  act_2026: "ACT",
  hspt_2026: "HSPT",
  isee_upper_2026: "ISEE Upper",
  naplan_2026: "NAPLAN",
  canadian_cat4_2026: "Canadian CAT4/CCAT",
  english_placement_test_2026: "English Placement Test",
  exam_prep_test_teach_test: "Test-Teach-Test (TTT)"
};

interface ManualConversationPlayerProps {
    data: any;
    onClose: () => void;
    readAloudVoice?: string;
}

const ManualConversationPlayer: FC<ManualConversationPlayerProps> = ({ data, onClose, readAloudVoice }) => {
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [isPlayingAll, setIsPlayingAll] = useState(false);
    const [activeTab, setActiveTab] = useState<'dialogue' | 'glossary' | 'questions'>('dialogue');
    
    // Glossary specifics
    const [playingGlossaryIndex, setPlayingGlossaryIndex] = useState<number | null>(null);
    const [isPlayingAllGlossary, setIsPlayingAllGlossary] = useState(false);

    const [characters, setCharacters] = useState<any[]>(data?.characters || []);

    useEffect(() => {
        if (data?.characters) {
            setCharacters(data.characters);
        }
    }, [data?.characters]);

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

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const getVoiceForCharacter = (charName: string) => {
        if (!charName) return undefined;
        const appChars = useAppStore.getState().characters || [];
        const allVoices = window.speechSynthesis.getVoices() || [];
        if (!allVoices.length) return undefined;

        // Companion profiles ("Alexander Wright" / "male1" / "Maya Lin"…) are Classmate-only.
        // Conversation Maker, Audio Lab and the other tools read legacy speakers with the
        // global Read Aloud Voice instead of the companion's own voice.
        if (isCompanionVoiceCode(charName, appChars)) {
            const preferred = readAloudVoice
                ? allVoices.find(v => v.voiceURI === readAloudVoice || v.name === readAloudVoice || v.name.toLowerCase().includes(readAloudVoice.toLowerCase()))
                : undefined;
            if (preferred) return preferred;
        } else {
            const charMatch = getCharacterByCode(charName, appChars);
            if (charMatch && charMatch.voice) {
                const v = allVoices.find(voice => voice.voiceURI === charMatch.voice || voice.name === charMatch.voice || voice.name.toLowerCase().includes(charMatch.voice.toLowerCase()));
                if (v) return v;
            }
        }

        const clean = charName.replace(/[:\s]+$/, '').trim().toLowerCase();
        const charList = characters && characters.length > 0 ? characters : [];
        const charIndex = charList.findIndex((c: any) => c.name && c.name.replace(/[:\s]+$/, '').trim().toLowerCase() === clean);
        
        let voiceURI: string | undefined = undefined;
        let voicePresetId: string | undefined = undefined;
        if (charIndex !== -1 && charList[charIndex]) {
            voiceURI = charList[charIndex].voiceURI;
            voicePresetId = charList[charIndex].voicePresetId;
        }

        if (voiceURI) {
            const matchedVoice = allVoices.find(v => v.voiceURI === voiceURI || v.name === voiceURI);
            if (matchedVoice) return matchedVoice;
        }

        // Intelligent priority scoring: NEVER pick David or robotic desktop voices!
        const scored = allVoices.map(v => {
            let score = 0;
            const nLower = (v.name || '').toLowerCase();
            const langLower = (v.lang || '').toLowerCase();

            // HEAVY PENALTIES FOR ROBOTIC / LOW QUALITY VOICES
            if (nLower.includes('david')) score -= 10000;
            if (nLower.includes('desktop')) score -= 5000;
            if (nLower.includes('zira') || nLower.includes('mark') || nLower.includes('hazel')) score -= 3000;
            if (nLower.includes('espeak')) score -= 8000;

            // REWARDS FOR NATURAL / HIGH QUALITY VOICES
            if (nLower.includes('natural') || nLower.includes('neural') || nLower.includes('online')) score += 3000;
            if (nLower.includes('google')) score += 2000;
            if (nLower.includes('samantha') || nLower.includes('daniel') || nLower.includes('karen')) score += 1500;

            if (voicePresetId && nLower.includes(voicePresetId.toLowerCase())) score += 4000;
            if (clean && nLower.includes(clean)) score += 2000;
            if (langLower.startsWith('en')) score += 500;

            return { voice: v, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.voice || allVoices[0];
    };

    const cleanSpeechText = (text: string) => {
        if (!text) return '';
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/\[(grammar|glossary):\s*([^\]]+)\]/gi, '$2')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .trim();
    };

    const formatDialogueReactText = (line: any, globalGlossary?: any[]) => {
        let rawText = line?.text || '';
        if (!rawText) return null;

        const ann = line?.annotations || {};
        const grammarTarget = ann.grammar_target || ann.grammar_phrase || '';
        const glossaryTarget = ann.glossary_target || ann.glossary_word || '';

        // Extract glossary term from "term = definition" if not provided
        let extractedGlossaryTerm = '';
        if (!glossaryTarget && ann.glossary) {
            const match = ann.glossary.match(/^([a-zA-Z0-9\s'-]+?)\s*(=|:|-|–|—|\()/);
            if (match && match[1] && match[1].trim().length > 2) {
                extractedGlossaryTerm = match[1].trim();
            }
        }

        // Extract grammar term from quotes if not provided
        let extractedGrammarTerm = '';
        if (!grammarTarget && ann.grammar) {
            const quoteMatch = ann.grammar.match(/["']([^"']{3,30})["']/);
            if (quoteMatch && quoteMatch[1]) {
                extractedGrammarTerm = quoteMatch[1].trim();
            }
        }

        // Convert inline markdown / HTML tags to standard placeholders
        let processed = rawText
            .replace(/<span class="grammar-highlight">([^<]+)<\/span>/gi, '[GRAMMAR_HL:$1]')
            .replace(/<span class="glossary-highlight">([^<]+)<\/span>/gi, '[GLOSSARY_HL:$1]')
            .replace(/\[grammar:\s*([^\]]+)\]/gi, '[GRAMMAR_HL:$1]')
            .replace(/\[glossary:\s*([^\]]+)\]/gi, '[GLOSSARY_HL:$1]');

        const finalGrammarTerm = grammarTarget || extractedGrammarTerm;
        if (finalGrammarTerm && !processed.includes('[GRAMMAR_HL:')) {
            const regex = new RegExp(`(?<![<\\w])(${finalGrammarTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})(?![>\\w])`, 'i');
            processed = processed.replace(regex, '[GRAMMAR_HL:$1]');
        }

        const finalGlossaryTerm = glossaryTarget || extractedGlossaryTerm;
        if (finalGlossaryTerm && !processed.includes('[GLOSSARY_HL:')) {
            const regex = new RegExp(`(?<![<\\w])(${finalGlossaryTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})(?![>\\w])`, 'i');
            processed = processed.replace(regex, '[GLOSSARY_HL:$1]');
        }

        if (globalGlossary && Array.isArray(globalGlossary) && !processed.includes('[GLOSSARY_HL:')) {
            for (const gItem of globalGlossary) {
                if (gItem?.word && gItem.word.length >= 3) {
                    const gRegex = new RegExp(`\\b(${gItem.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\b`, 'i');
                    if (gRegex.test(processed) && !processed.includes('[GRAMMAR_HL:') && !processed.includes('[GLOSSARY_HL:')) {
                        processed = processed.replace(gRegex, '[GLOSSARY_HL:$1]');
                        break;
                    }
                }
            }
        }

        // Split and render React elements
        const parts = processed.split(/(\[GRAMMAR_HL:[^\]]+\]|\[GLOSSARY_HL:[^\]]+\])/);
        return parts.map((part: string, pIdx: number) => {
            if (part.startsWith('[GRAMMAR_HL:') && part.endsWith(']')) {
                const content = part.slice(12, -1);
                return (
                    <span 
                        key={pIdx} 
                        className="bg-blue-100 text-blue-800 border-b-2 border-blue-600 px-1.5 py-0.5 rounded font-bold transition-all hover:bg-blue-200 cursor-help"
                        title={ann.grammar ? `Grammar: ${ann.grammar}` : 'Grammar focus'}
                    >
                        {content}
                    </span>
                );
            }
            if (part.startsWith('[GLOSSARY_HL:') && part.endsWith(']')) {
                const content = part.slice(13, -1);
                return (
                    <span 
                        key={pIdx} 
                        className="bg-amber-100 text-amber-900 border-b-2 border-amber-500 px-1.5 py-0.5 rounded font-bold transition-all hover:bg-amber-200 cursor-help"
                        title={ann.glossary ? `Glossary: ${ann.glossary}` : 'Key Glossary term'}
                    >
                        {content}
                    </span>
                );
            }
            return <span key={pIdx}>{part.replace(/<[^>]*>/g, '')}</span>;
        });
    };

    const playLine = (index: number, onEnd?: () => void) => {
        if (!data.dialogue || index >= data.dialogue.length) return;
        const line = data.dialogue[index];
        
        window.speechSynthesis.cancel();
        setPlayingIndex(index);

        setTimeout(() => {
            const cleanText = cleanSpeechText(line.text);
            const utterance = new SpeechSynthesisUtterance(cleanText);
            
            const voice = getVoiceForCharacter(line.character);
            if (voice) utterance.voice = voice;
            
            utterance.onend = () => {
                if (onEnd) onEnd();
                else setPlayingIndex(null);
            };

            utterance.onerror = () => {
                if (onEnd) onEnd();
                else setPlayingIndex(null);
            };

            window.speechSynthesis.speak(utterance);
        }, 50);
    };

    const readGlossaryItem = (idx: number, onEnd?: () => void) => {
        if (!data.glossary || idx >= data.glossary.length) return;
        const item = data.glossary[idx];
        const textToRead = `${item.word}. ${item.definition}. ${item.ccq}. ${item.ccq_answer}.`;
        
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        
        const activeVoice = readAloudVoice;
        if (activeVoice) {
            const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === activeVoice);
            if (voice) utterance.voice = voice;
        }
        
        utterance.onend = () => {
            if (onEnd) onEnd();
            else setPlayingGlossaryIndex(null);
        };

        setPlayingGlossaryIndex(idx);
        window.speechSynthesis.speak(utterance);
    };

    const readAloudText = (text: string, voiceURIOrObj?: string | SpeechSynthesisVoice) => {
        window.speechSynthesis.cancel();
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            if (typeof voiceURIOrObj === 'object' && voiceURIOrObj !== null) {
                utterance.voice = voiceURIOrObj;
            } else {
                let activeVoice = (typeof voiceURIOrObj === 'string' ? voiceURIOrObj : undefined) || readAloudVoice;
                const appChars = useAppStore.getState().characters || [];
                if (activeVoice) {
                    const charMatch = getCharacterByCode(activeVoice, appChars);
                    if (charMatch && charMatch.voice) {
                        activeVoice = charMatch.voice;
                    }
                    const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === activeVoice || v.name === activeVoice || v.name.toLowerCase().includes(activeVoice.toLowerCase()));
                    if (voice) utterance.voice = voice;
                }
            }
            window.speechSynthesis.speak(utterance);
        }, 50);
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

    return (
        <div className="flex flex-col bg-slate-50 min-h-[500px] border border-slate-200 rounded-xl overflow-hidden shadow-inner p-4">
            {/* Play controls bar */}
            <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2 rounded-t-xl">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setActiveTab('dialogue')} 
                        className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${activeTab === 'dialogue' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        🗣️ Dialogue
                    </button>
                    <button 
                        onClick={() => setActiveTab('glossary')} 
                        className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${activeTab === 'glossary' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        📖 Glossary
                    </button>
                    <button 
                        onClick={() => setActiveTab('questions')} 
                        className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${activeTab === 'questions' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        ❓ Questions
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === 'dialogue' && (
                        isPlayingAll ? (
                            <button onClick={pausePlayback} className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                                <i className="fas fa-pause"></i> Pause Audio
                            </button>
                        ) : (
                            <button onClick={playAll} className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                                <i className="fas fa-play"></i> Play Full Conversation
                            </button>
                        )
                    )}
                    {activeTab === 'glossary' && (
                        isPlayingAllGlossary ? (
                            <button onClick={pauseGlossaryPlayback} className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                                <i className="fas fa-pause"></i> Pause Glossary
                            </button>
                        ) : (
                            <button onClick={playAllGlossary} className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                                <i className="fas fa-volume-up"></i> Read Full Glossary
                            </button>
                        )
                    )}
                    <button onClick={copyToClipboard} className="bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                        <i className="fas fa-copy"></i> Copy All Content
                    </button>
                </div>
            </div>

            {/* Character Voices Configuration Panel */}
            {characters && characters.length > 0 && (
                <div className="bg-indigo-50/40 p-3.5 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs animate-fade-in">
                    {characters.map((char: any, charIdx: number) => (
                        <div key={charIdx} className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                            <span className="font-extrabold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                                <i className="fas fa-user-circle text-indigo-500 text-sm"></i>
                                {char.name} Voice
                            </span>
                            <SearchableVoiceSelect 
                                value={char.voiceURI} 
                                onChange={(val) => {
                                    const copy = [...characters];
                                    copy[charIdx] = { ...char, voiceURI: val };
                                    setCharacters(copy);
                                }} 
                                defaultVoice={readAloudVoice}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Dynamic tabs display */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[600px] bg-white rounded-b-xl border border-t-0 border-slate-200">
                {activeTab === 'dialogue' && (
                    <div className="space-y-4">
                        {(data.dialogue || []).map((line: any, idx: number) => {
                            const isCurrentlyPlaying = playingIndex === idx;
                            const stageDir = line.action ? addEmojisToStageDirections(line.action) : '';
                            const ann = line.annotations || {};
                            return (
                                <div key={idx} className={`p-4 rounded-xl border transition-all duration-300 ${isCurrentlyPlaying ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-indigo-950 text-sm">{line.character}</span>
                                            {stageDir && (
                                                <span className="text-xs text-slate-500 font-medium italic">
                                                    ({stageDir})
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => playLine(idx)}
                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isCurrentlyPlaying ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            <i className="fas fa-volume-up text-xs"></i>
                                        </button>
                                    </div>
                                    <p className="text-slate-900 text-base md:text-lg font-semibold leading-relaxed mb-3">
                                        {formatDialogueReactText(line, data.glossary)}
                                    </p>

                                    {/* Color-coded Learning Annotations Badges */}
                                    {(ann.grammar || ann.glossary || ann.translation_l1 || ann.formal || ann.informal) && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                            {ann.grammar && (
                                                <div className="bg-blue-50/80 border border-blue-100 p-2 rounded-lg text-blue-950">
                                                    <span className="font-extrabold text-blue-700 text-[10px] uppercase tracking-wider block mb-0.5">
                                                        🎓 Grammar Explanation
                                                    </span>
                                                    {ann.grammar}
                                                </div>
                                            )}
                                            {ann.glossary && (
                                                <div className="bg-amber-50/80 border border-amber-100 p-2 rounded-lg text-amber-950">
                                                    <span className="font-extrabold text-amber-700 text-[10px] uppercase tracking-wider block mb-0.5">
                                                        📖 Key Glossary
                                                    </span>
                                                    {ann.glossary}
                                                </div>
                                            )}
                                            {ann.translation_l1 && (
                                                <div className="bg-sky-50/80 border border-sky-100 p-2 rounded-lg text-sky-950">
                                                    <span className="font-extrabold text-sky-700 text-[10px] uppercase tracking-wider block mb-0.5">
                                                        🌐 Translation
                                                    </span>
                                                    {ann.translation_l1}
                                                </div>
                                            )}
                                            {ann.formal && (
                                                <div className="bg-indigo-50/80 border border-indigo-100 p-2 rounded-lg text-indigo-950">
                                                    <span className="font-extrabold text-indigo-700 text-[10px] uppercase tracking-wider block mb-0.5">
                                                        👔 Formal Register
                                                    </span>
                                                    {ann.formal}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'glossary' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(data.glossary || []).map((item: any, idx: number) => {
                            const isCurrentlyPlaying = playingGlossaryIndex === idx;
                            return (
                                <div key={idx} className={`p-4 rounded-xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md ${isCurrentlyPlaying ? 'border-indigo-400 bg-indigo-50/20' : 'border-amber-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-black text-amber-900 text-base flex items-center gap-1">
                                            ✨ {item.word}
                                        </h5>
                                        <button 
                                            onClick={() => readGlossaryItem(idx)}
                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isCurrentlyPlaying ? 'bg-indigo-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                                        >
                                            <i className="fas fa-volume-up text-xs"></i>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-700 mb-3 font-semibold">
                                        <span className="text-amber-700 font-extrabold uppercase text-[10px] tracking-wider block mb-0.5">Definition</span>
                                        {item.definition}
                                    </p>
                                    <div className="bg-amber-50/50 rounded-lg p-2.5 border border-amber-100 text-[11px] text-amber-950 font-medium space-y-1">
                                        <div><strong className="text-amber-800">Concept Check:</strong> {item.ccq}</div>
                                        <div><strong className="text-amber-800">Answer:</strong> {item.ccq_answer}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="space-y-4">
                        {(data.questions || []).map((q: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl border border-green-100 bg-white shadow-sm hover:shadow-md transition-all">
                                <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <i className="fas fa-film text-green-600"></i> Scenario: {q.scenario}
                                </div>
                                <div className="flex justify-between items-start mb-2.5">
                                    <div className="text-sm font-bold text-green-900 flex items-center gap-1.5">
                                        <span>🙋 {q.character} asks:</span>
                                        <span className="font-extrabold text-slate-900 text-base">"{q.question}"</span>
                                    </div>
                                    <button 
                                        onClick={() => readAloudText(q.question, getVoiceForCharacter(q.character))}
                                        className="w-7 h-7 rounded-full bg-green-50 text-green-700 hover:bg-green-100 flex items-center justify-center transition-all"
                                    >
                                        <i className="fas fa-volume-up text-xs"></i>
                                    </button>
                                </div>
                                <div className="bg-green-50/40 rounded-lg p-3 border border-green-100 text-xs font-semibold text-green-950">
                                    <span className="text-green-800 text-[10px] font-black uppercase tracking-wider block mb-1">Expected Answer</span>
                                    {q.answer}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ManualGenerator: FC<ManualGeneratorProps> = ({ learner, onContentRender, tutorProfile, onSaveContent, onSaveLearnerSettings, onUpdateLearner, presetType }) => {
    const authTier = useAuthStore(state => state.tier);
    const s = learner?.manualGeneratorSettings as any;

    // Recommended lesson types for this learner's category (theme)
    const learnerCategory = getCategoryById((learner as any)?.category);
    const recommendedLessonTypeIds = new Set(learnerCategory?.recommendedLessonTypeIds || []);
    const [selectedType, setSelectedType] = useState(s?.selectedType || 'englishLesson');

    // Standard saved-file naming: {learner}_{book}_{unit}_{type}_{Learner|Presenter}_{date}
    const filePrefill = getLessonFilePrefill(learner);
    const [fileBook, setFileBook] = useState<string>(filePrefill.book);
    const [fileUnit, setFileUnit] = useState<string>(filePrefill.unit);
    const [fileAudience, setFileAudience] = useState<LessonAudience>('Learner');
    useEffect(() => {
        const p = getLessonFilePrefill(learner);
        setFileBook(p.book);
        setFileUnit(p.unit);
    }, [learner?.id, learner?.name]);
    const [promptText, setPromptText] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<React.ReactNode>('');
    const [isFixing, setIsFixing] = useState(false);
    const [syntaxErrorContext, setSyntaxErrorContext] = useState<{lineNo: number, colNo: number, snippet: string, startIndex: number, endIndex: number, message: string} | null>(null);
    const [manualAiFix, setManualAiFix] = useState('');
    const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);

    const [liveValidation, setLiveValidation] = useState<{
        isValid: boolean;
        errorType: 'empty' | 'syntax' | 'schema' | 'none';
        errorMessage?: string;
        lineNo?: number;
        colNo?: number;
        errorLineText?: string;
        snippet?: { lineNo: number; text: string; isError: boolean }[];
        syntaxErrorContext?: {
            lineNo: number;
            colNo: number;
            snippet: string;
            startIndex: number;
            endIndex: number;
            message: string;
        } | null;
        schemaWarnings?: string[];
        stats?: any;
    }>({ isValid: false, errorType: 'empty' });

    useEffect(() => {
        if (!jsonInput.trim()) {
            setLiveValidation({ isValid: false, errorType: 'empty' });
            return;
        }

        const cleaned = fixJson(jsonInput);
        if (!cleaned) {
            setLiveValidation({
                isValid: false,
                errorType: 'syntax',
                errorMessage: 'No JSON object or array could be extracted from your input. Make sure it contains at least { } or [ ].'
            });
            return;
        }

        try {
            const parsed = JSON.parse(cleaned);
            const schemaWarnings: string[] = [];
            const typeLower = selectedType.toLowerCase();
            
            if (['englishlesson', 'englishlessonv2', 'bilingualstudylesson', 'dailylesson', 'homework', 'exampreplesson'].includes(typeLower)) {
                if (!parsed.sections || !Array.isArray(parsed.sections)) {
                    schemaWarnings.push(`Missing 'sections' array which is required for ${selectedType}.`);
                } else if (parsed.sections.length === 0) {
                    schemaWarnings.push(`The 'sections' array is empty.`);
                } else {
                    parsed.sections.forEach((sec: any, sIdx: number) => {
                        if (!sec.title) {
                            schemaWarnings.push(`Section ${sIdx + 1} is missing a 'title'.`);
                        }
                        if (!sec.activities || !Array.isArray(sec.activities)) {
                            schemaWarnings.push(`Section ${sIdx + 1} "${sec.title || ''}" is missing its 'activities' array.`);
                        } else if (sec.activities.length === 0) {
                            schemaWarnings.push(`Section ${sIdx + 1} "${sec.title || ''}" has an empty 'activities' array.`);
                        }
                    });
                }
            } else if (typeLower === 'simulations') {
                const hasScenarios = parsed.simulations || parsed.scenarios || parsed.scenario || Array.isArray(parsed);
                if (!hasScenarios) {
                    schemaWarnings.push(`Expected an array of simulations, or an object containing a 'simulations' or 'scenarios' array.`);
                }
            } else if (typeLower === 'placegame') {
                if (!parsed.places || !Array.isArray(parsed.places)) {
                    schemaWarnings.push(`Missing 'places' array which is required for Guess the Place game.`);
                } else if (parsed.places.length === 0) {
                    schemaWarnings.push(`The 'places' array is empty.`);
                } else if (parsed.places.length !== 5) {
                    schemaWarnings.push(`The prompt requests EXACTLY 5 places, but found ${parsed.places.length} places.`);
                }
            } else if (typeLower === 'slides') {
                if (!parsed.slides || !Array.isArray(parsed.slides)) {
                    schemaWarnings.push(`Missing 'slides' array required for Slide Presentation.`);
                }
            } else if (typeLower === 'quiz') {
                const hasQuestions = parsed.questions || parsed.quiz || Array.isArray(parsed);
                if (!hasQuestions) {
                    schemaWarnings.push(`Missing 'questions' array/content required for Quiz.`);
                }
            } else if (typeLower === 'studyguide') {
                if (!parsed.audioOverview) {
                    schemaWarnings.push(`Missing 'audioOverview' object for Study Guide.`);
                }
            }

            if (typeLower === 'mocktest') {
                try {
                    const issues = validateExamDefinition(parsed);
                    if (issues && issues.length > 0) {
                        issues.forEach((issue: any) => {
                            schemaWarnings.push(`[Exam Schema Issue at ${issue.path}] ${issue.message}`);
                        });
                    }
                } catch (err: any) {
                    schemaWarnings.push(`Failed to validate exam structure: ${err.message}`);
                }
            }

            if (typeLower === 'mocktestv2') {
                try {
                    if (!parsed.examName) {
                        schemaWarnings.push("Missing 'examName' field which is required for Mock Test V2.");
                    }
                    if (!parsed.sections || !Array.isArray(parsed.sections)) {
                        schemaWarnings.push("Missing 'sections' array which is required for Mock Test V2.");
                    } else if (parsed.sections.length === 0) {
                        schemaWarnings.push("The 'sections' array is empty.");
                    } else {
                        parsed.sections.forEach((section: any, sIdx: number) => {
                            if (!section.title) {
                                schemaWarnings.push(`Section ${sIdx + 1} is missing a 'title'.`);
                            }
                            if (!section.questions || !Array.isArray(section.questions)) {
                                schemaWarnings.push(`Section ${sIdx + 1} is missing or has an invalid 'questions' array.`);
                            } else if (section.questions.length === 0) {
                                schemaWarnings.push(`Section ${sIdx + 1} has no questions.`);
                            }
                        });
                    }
                } catch (err: any) {
                    schemaWarnings.push(`Failed to validate exam structure: ${err.message}`);
                }
            }

            const stats = calculateLessonStats(parsed, selectedType);

            setLiveValidation({
                isValid: true,
                errorType: 'none',
                schemaWarnings,
                stats
            });
        } catch (e: any) {
            const msg = e.message;
            const posMatch = msg.match(/position (\d+)/);
            const lineMatch = msg.match(/line (\d+)/);
            const colMatch = msg.match(/column (\d+)/);
            
            const allLines = jsonInput.split('\n');
            let lineNo = 1;
            let colNo = 1;

            if (lineMatch && colMatch) {
                lineNo = parseInt(lineMatch[1], 10);
                colNo = parseInt(colMatch[1], 10);
            } else if (posMatch) {
                const pos = parseInt(posMatch[1], 10);
                const textBefore = jsonInput.substring(0, pos);
                const linesBefore = textBefore.split('\n');
                lineNo = linesBefore.length;
                colNo = linesBefore[linesBefore.length - 1].length + 1;
            }

            const errorLineText = allLines[lineNo - 1] || "";
            const startLineIdx = Math.max(0, lineNo - 4);
            const endLineIdx = Math.min(allLines.length, lineNo + 3);
            const snippet = allLines.slice(startLineIdx, endLineIdx).map((l, idx) => {
                const currLineNo = startLineIdx + idx + 1;
                return {
                    lineNo: currLineNo,
                    text: l,
                    isError: currLineNo === lineNo
                };
            });

            const startLineIdxForCtx = Math.max(0, lineNo - 6);
            const endLineIdxForCtx = Math.min(allLines.length, lineNo + 5);
            const ctxSnippetString = allLines.slice(startLineIdxForCtx, endLineIdxForCtx).join('\n');
            const snippetCharStart = allLines.slice(0, startLineIdxForCtx).join('\n').length + (startLineIdxForCtx > 0 ? 1 : 0);
            const snippetCharEnd = snippetCharStart + ctxSnippetString.length;

            const sCtx = {
                lineNo,
                colNo,
                snippet: ctxSnippetString,
                startIndex: snippetCharStart,
                endIndex: snippetCharEnd,
                message: msg
            };

            setLiveValidation({
                isValid: false,
                errorType: 'syntax',
                errorMessage: msg,
                lineNo,
                colNo,
                errorLineText,
                syntaxErrorContext: sCtx,
                snippet
            });
        }
    }, [jsonInput, selectedType]);
    
    // Syllabus Chapters Selector State
    const [selectedSyllabusChapters, setSelectedSyllabusChapters] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(`syllabus-chapters-${(learner as any).id}`);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [syllabusSearchQuery, setSyllabusSearchQuery] = useState("");
    const [personalSyllabusMode, setPersonalSyllabusMode] = useState(() => {
        try {
            return localStorage.getItem(`syllabus-mode-${(learner as any).id}`) === 'true';
        } catch { return false; }
    });

    const pendingSyllabusChapters = React.useMemo(() => {
        const syllabus = (learner as any)?.syllabus;
        if (!syllabus || !Array.isArray(syllabus.competencies)) return [];
        
        const list: Array<{ competencyName: string; chapter: any }> = [];
        syllabus.competencies.forEach((comp: any) => {
            if (Array.isArray(comp.chapters)) {
                comp.chapters.forEach((ch: any) => {
                    if (ch.status === 'pending') {
                        list.push({
                            competencyName: comp.competencyName,
                            chapter: ch
                        });
                    }
                });
            }
        });
        return list;
    }, [learner]);



    // Step 1 · Content-type search (real time)
    const [searchTerm, setSearchTerm] = useState('');

    // Live Lesson State
    const [liveLessonConfig, setLiveLessonConfig] = useState({
        activities: [] as string[],
        topic: '',
        duration: '30 minutes',
        feedbackStyle: 'encouraging'
    });
    const [activitySearch, setActivitySearch] = useState('');

    // Conversation Maker State
    const [convCharacters, setConvCharacters] = useState<any[]>(() => {
        const tInfo = useAppStore.getState().tutorInfo;
        // Both characters inherit the global Read Aloud Voice — never a leftover
        // Classmate companion profile ("Alexander Wright", "male1"…).
        const inheritedVoice = resolveGlobalReadAloudVoice(learner?.readAloudVoice, tInfo?.voice);
        return [
          {
            name: learner?.name || 'Learner',
            tone: 'Curious',
            mood: 'Excited',
            job: learner?.personalInfo?.occupation || 'Student',
            voiceURI: inheritedVoice
          },
          {
            name: tInfo?.name || 'Tutor',
            tone: 'Encouraging',
            mood: 'Happy',
            job: 'Professional Teacher',
            voiceURI: inheritedVoice
          }
        ];
    });
    const [convTimeAndPlace, setConvTimeAndPlace] = useState('A quiet coffee shop or virtual classroom');
    const [convTopicAndPurpose, setConvTopicAndPurpose] = useState(() => {
        return `Discussing professional goals, practice targeted grammar points, and talking about interests: ${learner?.interests || 'general topics'}.`;
    });
    const [convLanguage, setConvLanguage] = useState(() => {
        return `Target Language: ${learner?.targetLanguage || 'English'}. CEFR Level: ${learner?.cefrLevel || 'B2'}. Focus on active vocabulary and natural spoken phrases.`;
    });
    const [convLearnersInfo, setConvLearnersInfo] = useState(() => {
        return `Age: ${learner?.personalInfo?.age || 'N/A'}, Country: ${learner?.personalInfo?.country || 'N/A'}, Occupation: ${learner?.personalInfo?.occupation || 'Student'}, Interests: ${learner?.interests || 'N/A'}, Challenges: ${learner?.learningChallenges?.join(', ') || 'N/A'}`;
    });
    const [convSampleDialogue, setConvSampleDialogue] = useState('Natural turn-taking, active listening gestures, checking for understanding.');
    
    // Classmate State & Companion Management
    const storeCharacters = useAppStore(state => state.characters) || DEFAULT_APP_CHARACTERS;
    // The Classmate studio must list the SAME roster the Annotations → Classmates
    // widget shows (the 12 classic companions + the 8 Classmate personas). Older
    // saved rosters only hold the classic 12, so the catalog fills the gaps and
    // every entry is upgraded back to its real portrait when the stored avatar is
    // still a generated monogram.
    const companionRoster: AppCharacter[] = React.useMemo(() => {
        const catalog = DEFAULT_APP_CHARACTERS;
        const catalogMatch = (c: AppCharacter) => catalog.find(
            d => (d.code && c.code && d.code === c.code) ||
                 (d.id && c.id && d.id === c.id) ||
                 (d.name || '').toLowerCase() === String(c.name || '').toLowerCase()
        );
        const stored = (storeCharacters || []).map(c => {
            const match = catalogMatch(c);
            if (!match) return c;
            const current = String(c.avatarUrl || '');
            if (!current || current.startsWith('data:image/svg')) {
                return { ...c, avatarUrl: match.avatarUrl, avatarFallback: c.avatarFallback || match.avatarFallback };
            }
            return { ...c, avatarFallback: c.avatarFallback || match.avatarFallback };
        });
        const missing = catalog.filter(d => !stored.some(c =>
            (d.code && c.code && d.code === c.code) ||
            (d.id && c.id && d.id === c.id) ||
            (d.name || '').toLowerCase() === String(c.name || '').toLowerCase()
        ));
        return missing.length ? [...stored, ...missing] : stored;
    }, [storeCharacters]);
    const updateCharacter = useAppStore(state => state.updateCharacter);
    const addCharacter = useAppStore(state => state.addCharacter);
    const deleteCharacter = useAppStore(state => state.deleteCharacter);
    const setCharacters = useAppStore(state => state.setCharacters);
    const speakGlobal = useAppStore(state => state.speak);

    const [classmateCharId, setClassmateCharId] = useState<string>('maya_lin');
    const [classmateLessonMode, setClassmateLessonMode] = useState<string>('explainer');
    const [classmateInitialFriendship, setClassmateInitialFriendship] = useState<number>(35);
    const [classmateMultiActivity, setClassmateMultiActivity] = useState<boolean>(true);

    // Companion Modal Editor State
    const [editingCompanion, setEditingCompanion] = useState<AppCharacter | null>(null);
    const [isCreatingNewCompanion, setIsCreatingNewCompanion] = useState<boolean>(false);
    const [voiceTestLoading, setVoiceTestLoading] = useState<boolean>(false);

    // Inline player state
    const [activeConversationData, setActiveConversationData] = useState<any>(null);

    useEffect(() => {
        if (learner?.manualGeneratorSettings) {
            const ls = learner.manualGeneratorSettings as any;
            if (ls.selectedType) setSelectedType(ls.selectedType);
            if (ls.tone) setTone(ls.tone);
            if (ls.cefrLevel) setCefrLevel(ls.cefrLevel);
            if (ls.cefrTier) setCefrTier(ls.cefrTier);
            if (ls.targetAudience) setTargetAudience(ls.targetAudience);
            if (ls.details) setDetails(ls.details);
            if (ls.musicSongTitle) setMusicSongTitle(ls.musicSongTitle);
            if (ls.musicArtist) setMusicArtist(ls.musicArtist);
            if (ls.musicLyrics) setMusicLyrics(ls.musicLyrics);
            if (ls.musicMediaMode === 'local' || ls.musicMediaMode === 'link') setMusicMediaMode(ls.musicMediaMode);
            if (ls.musicMediaLink) setMusicMediaLink(ls.musicMediaLink);
            if (ls.selectedActivities) setSelectedActivities(ls.selectedActivities);
            if (ls.readAloudVoice) setReadAloudVoice(ls.readAloudVoice);
            if (ls.addL1Translation !== undefined) setAddL1Translation(ls.addL1Translation);
            if (ls.l1TranslationAmount) setL1TranslationAmount(ls.l1TranslationAmount);
            if (ls.addPictures !== undefined) setAddPictures(ls.addPictures);
            if (ls.picturesCount) setPicturesCount(ls.picturesCount);
            if (ls.youtubeVideos !== undefined) setYoutubeVideos(ls.youtubeVideos);
            if (ls.youtubeVideoCount) setYoutubeVideoCount(ls.youtubeVideoCount);

            if (ls.contentMultiplier) setContentMultiplier(ls.contentMultiplier);
            if (ls.podcastHosts) setPodcastHosts(ls.podcastHosts);
            if (ls.trialLesson !== undefined) setTrialLesson(ls.trialLesson);
            if (ls.lessonCheatSheet !== undefined) setLessonCheatSheet(ls.lessonCheatSheet === true);

            if (ls.avatarLessonCountHint) setAvatarLessonCountHint(ls.avatarLessonCountHint);
            if (ls.avatarMinInitialChoices) setAvatarMinInitialChoices(ls.avatarMinInitialChoices);
            if (ls.avatarMinTotalBranches) setAvatarMinTotalBranches(ls.avatarMinTotalBranches);
            if (ls.avatarMinEndings) setAvatarMinEndings(ls.avatarMinEndings);
            if (ls.avatarPreferredRegions) setAvatarPreferredRegions(ls.avatarPreferredRegions);
            if (ls.avatarPreferredVoices) setAvatarPreferredVoices(ls.avatarPreferredVoices);
            if (ls.avatarDomainConstraints) setAvatarDomainConstraints(ls.avatarDomainConstraints);

            if (ls.classmateCharId) setClassmateCharId(ls.classmateCharId);
            if (ls.classmateLessonMode) setClassmateLessonMode(ls.classmateLessonMode);
            if (ls.classmateInitialFriendship !== undefined) setClassmateInitialFriendship(ls.classmateInitialFriendship);
            if (ls.classmateMultiActivity !== undefined) setClassmateMultiActivity(ls.classmateMultiActivity);

            if (ls.convCharacters && Array.isArray(ls.convCharacters) && ls.convCharacters.length > 0) {
                // Legacy safety: characters saved before the Classmate split can still be named
                // after a companion profile ("Alexander Wright", "Maya Lin", …). They are renamed
                // to the learner/tutor and re-voiced, because companions belong to Classmate only.
                const tInfo = useAppStore.getState().tutorInfo;
                const cleaned = ls.convCharacters.map((c: any, idx: number) => ({
                    ...c,
                    name: isCompanionVoiceCode(c?.name) ? (idx === 0 ? (learner?.name || c.name) : (tInfo?.name || c.name)) : c.name,
                }));
                setConvCharacters(cleaned);
            }
            if (ls.convTimeAndPlace) setConvTimeAndPlace(ls.convTimeAndPlace);
            if (ls.convTopicAndPurpose) setConvTopicAndPurpose(ls.convTopicAndPurpose);
            if (ls.convLanguage) setConvLanguage(ls.convLanguage);
            if (ls.convLearnersInfo) setConvLearnersInfo(ls.convLearnersInfo);
            if (ls.convSampleDialogue) setConvSampleDialogue(ls.convSampleDialogue);
        }
    }, [learner?.manualGeneratorSettings]);

    const contentTypes = [
        // CORE LEARNING
        { id: 'englishLesson', label: '📖 Micro Lesson', category: 'Core Learning', rarity: 'Free' },
        { id: 'interactiveLesson', label: '🎓 Interactive Lesson', category: 'Core Learning', rarity: 'Premium' },
        { id: 'englishLessonV2', label: '🚀 Micro Lesson V2', category: 'Core Learning', rarity: 'Premium' },
        { id: 'avatarLesson', label: '🤖 Avatar Lesson', category: 'Core Learning', rarity: 'VIP' },
        { id: 'avatarLessonV2', label: '🤖 Avatar Lesson V2', category: 'Core Learning', rarity: 'VIP' },
        { id: 'classmate', label: '🤝 Classmate', category: 'Core Learning', rarity: 'VIP' },
        { id: 'bilingualStudyLesson', label: '🌐 Bilingual Lesson', category: 'Core Learning', rarity: 'Premium' },
        { id: 'explainerLesson', label: '💡 Explainer Lesson', category: 'Core Learning', rarity: 'Free' },
        { id: 'conversationalLesson', label: '🗣️ Conversational Lesson', category: 'Core Learning', rarity: 'Premium' },
        
        // ASSIGNMENTS
        { id: 'homework', label: '🏠 Homework', category: 'Assignments', rarity: 'Free' },
        { id: 'quiz', label: '❓ Quiz', category: 'Assignments', rarity: 'Free' },
        { id: 'studyGuide', label: '📚 Study Guide', category: 'Assignments', rarity: 'Premium' },
        { id: 'printableWorksheet', label: '🖨️ Official Worksheet', category: 'Assignments', rarity: 'Premium' },
        { id: 'examPrepLesson', label: '📝 Exam Prep Lesson', category: 'Assignments', rarity: 'Free' },
        { id: 'mockTest', label: '📝 Mock Test', category: 'Assignments', rarity: 'Free' },
        { id: 'mockTestV2', label: '📝 Mock Test V2', category: 'Assignments', rarity: 'Free' },
        
        // INTERACTIVE & GAMES
        { id: 'learningApp', label: '🔁 Review App', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'learningAppV2', label: '🎮 Learning App V2', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'flipbookHomework', label: '📖 Flipbook Homework', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'gamifiedChallenge', label: '🏆 Gamified Challenge', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'musicLesson', label: '🎵 Music Lesson', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'dailyLessonInteractive', label: '🐱 Daily Lesson', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'liveLessonInteractive', label: '⚡ Live Lesson', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'videoLessonInteractive', label: '🎬 Video Lesson', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'conversationGame', label: '💬 Conversation Game', category: 'Interactive & Games', rarity: 'Premium' },
        { id: 'conversationMaker', label: '💬 Conversation Maker', category: 'Interactive & Games', rarity: 'Premium' },
        { id: 'partyMode', label: '🎉 Party Mode Arena', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'placeGame', label: '🌍 Guess the Place', category: 'Interactive & Games', rarity: 'Premium' },
        { id: 'weeklyChallenge', label: '🏆 Weekly Challenge', category: 'Interactive & Games', rarity: 'Premium' },
        { id: 'simulations', label: '🎧 Audio Lab', category: 'Interactive & Games', rarity: 'VIP' },
        { id: 'liveLesson', label: '👨‍💻 H5P', category: 'Interactive & Games', rarity: 'VIP' },
        
        // TEACHER TOOLS
        { id: 'lessonPlan', label: '📋 Lesson Plan', category: 'Teacher Tools', rarity: 'Free' },
        { id: 'forTeachers', label: '👩‍🏫 Teacher Guide', category: 'Teacher Tools', rarity: 'Free' },
        { id: 'lessonGuide', label: '📖 Lesson Guide', category: 'Teacher Tools', rarity: 'Free' },
        { id: 'slides', label: '📽️ Slide Presentation', category: 'Teacher Tools', rarity: 'VIP' },
        
        // DAILY & MEDIA
        { id: 'dailyLesson', label: '📅 Daily Lesson', category: 'Daily & Media', rarity: 'Premium' },
        { id: 'testLab', label: '🧪 Test Lab Activity', category: 'Daily & Media', rarity: 'Free' },
        // Retired with the Automatic generator (their JSON→HTML pipelines no longer exist):
        //   🎵 Music Lesson  ·  🎬 Video Lesson
        { id: 'audioLesson', label: '🎧 Audio Lesson', category: 'Daily & Media', rarity: 'VIP' },
    ];

    // Gallery tiles can ask for a specific content type (e.g. 🎮 Learning App V2):
    // preselect it in Step 1 so the tutor lands directly on that lesson format.
    useEffect(() => {
        if (presetType && contentTypes.some(t => t.id === presetType)) {
            setSelectedType(presetType);
            setError('');
        }
    }, [presetType]);

    // When the gallery opens a tile, also auto-load that type's mock data so the
    // tutor can immediately test the format (one click from Gallery → testable JSON).
    const presetHandled = useRef<string | null>(null);
    useEffect(() => {
        if (presetType && presetHandled.current !== presetType && contentTypes.some(t => t.id === presetType)) {
            presetHandled.current = presetType;
            setSelectedType(presetType);
            // load the matching mock for the preset type explicitly (not the stale closure value)
            setTimeout(() => { try { handleLoadMockData(presetType); } catch (e) { /* keep going */ } }, 60);
        }
    }, [presetType]);

    // What the Step 1 query means — lesson name, group, tier, or a searched skill/theme.
    const typeSearch = searchLessonTypes(searchTerm, contentTypes);
    const matchedThemes = typeSearch.matchedThemes;
    const filteredTypes = typeSearch.results;

    /**
     * The theme rows under the search box.
     *
     * Whatever the query matched — or, with an empty box, this learner's own Category (Theme),
     * so the lesson types that fit this profile are visible and one click away instead of only
     * being discoverable as small badges on the tiles below.
     */
    const bannerThemes = matchedThemes.length > 0 ? matchedThemes : (learnerCategory ? [learnerCategory] : []);

    const filteredActivities = H5P_TYPES.filter(t => 
        t.label.toLowerCase().includes(activitySearch.toLowerCase())
    );

    const [tone, setTone] = useState(s?.tone || 'Encouraging & Professional');
    const [cefrLevel, setCefrLevel] = useState(s?.cefrLevel || learner?.cefrLevel || 'B1');
    // Fall back to the learner/group/platform record itself: a group class and a
    // platform both store `cefrTier`, and without this they were silently generated at
    // Tier 1 no matter what was chosen when they were created.
    const [cefrTier, setCefrTier] = useState<number>(s?.cefrTier || (learner as any)?.cefrTier || 1);

    // CEFR level guard: estimate each syllabus chapter's level against the dictionary
    // and order them so content BELOW the selected ceiling comes first (preferred) and
    // content ABOVE the ceiling comes last (its grammar is blocked in the prompt).
    const guardedPendingChapters = React.useMemo(() => {
        return pendingSyllabusChapters
            .map(({ competencyName, chapter }) => ({
                competencyName,
                chapter,
                guard: getChapterCefrGuard(chapter, cefrLevel, cefrTier) as ChapterCefrGuard
            }))
            .sort((a, b) => chapterGuardRank(a.guard.relation) - chapterGuardRank(b.guard.relation));
    }, [pendingSyllabusChapters, cefrLevel, cefrTier]);

    const filteredPendingChapters = React.useMemo(() => {
        if (!syllabusSearchQuery.trim()) return guardedPendingChapters;
        const query = syllabusSearchQuery.toLowerCase();
        return guardedPendingChapters.filter(({ competencyName, chapter }) => {
            const titleMatch = (chapter.title || '').toLowerCase().includes(query);
            const compMatch = (competencyName || '').toLowerCase().includes(query);
            const grammarMatch = (chapter.grammar || '').toLowerCase().includes(query);
            const vocabMatch = (chapter.vocabulary || []).some((v: string) => v.toLowerCase().includes(query));
            const descMatch = (chapter.description || '').toLowerCase().includes(query);
            return titleMatch || compMatch || grammarMatch || vocabMatch || descMatch;
        });
    }, [guardedPendingChapters, syllabusSearchQuery]);
    const [grammarPopover, setGrammarPopover] = useState<{ left: number; top: number } | null>(null);
    /**
     * The lesson-type guide card (Step 1).
     *
     * A tutor resting on a tile for five seconds gets this lesson's structure, audience and teaching
     * notes — the three questions nobody can answer from a two-word label. The timer is separate from
     * the card so that moving the pointer away before the five seconds cancels cleanly.
     */
    const [typeGuide, setTypeGuide] = useState<{ id: string; left: number; top: number } | null>(null);
    const typeGuideTimer = useRef<number | null>(null);
    const clearTypeGuideTimer = () => {
        if (typeGuideTimer.current !== null) {
            window.clearTimeout(typeGuideTimer.current);
            typeGuideTimer.current = null;
        }
    };
    const openTypeGuide = (id: string, anchor: HTMLElement | null) => {
        clearTypeGuideTimer();
        const rect = anchor?.getBoundingClientRect();
        const width = Math.min(window.innerWidth * 0.92, 420);
        const left = rect ? Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 12)) : 24;
        // Below the tile when there is room, otherwise above it, so the card never runs off-screen.
        const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
        const top = rect ? (spaceBelow > 380 ? rect.bottom + 10 : Math.max(8, rect.top - 360)) : 80;
        setTypeGuide({ id, left, top });
    };
    const scheduleTypeGuide = (id: string, anchor: HTMLElement | null) => {
        clearTypeGuideTimer();
        typeGuideTimer.current = window.setTimeout(() => openTypeGuide(id, anchor), 5000);
    };
    // Close on Escape / scroll / resize: an anchored card that floats over a page the tutor has
    // scrolled away from is worse than no card at all.
    useEffect(() => {
        if (!typeGuide) return;
        const close = () => setTypeGuide(null);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
            window.removeEventListener('keydown', onKey);
        };
    }, [typeGuide]);
    useEffect(() => clearTypeGuideTimer, []);
    const [targetAudience, setTargetAudience] = useState(s?.targetAudience || (learner as any)?.targetAudience || 'Adult Professional');
    const [details, setDetails] = useState(s?.details || '');
    // Music Lesson Step 2 fields — replace the generic "Specific Details / Topic" for songs.
    const [musicSongTitle, setMusicSongTitle] = useState(s?.musicSongTitle || '');
    // Bumped when the tutor inspects / clears the lyric timings synced from a player.
    const [musicTimingTick, setMusicTimingTick] = useState(0);
    const [musicArtist, setMusicArtist] = useState(s?.musicArtist || '');
    const [musicLyrics, setMusicLyrics] = useState(s?.musicLyrics || '');
    const [musicMediaMode, setMusicMediaMode] = useState<'link' | 'local'>(s?.musicMediaMode === 'local' ? 'local' : 'link');
    const [musicMediaLink, setMusicMediaLink] = useState(s?.musicMediaLink || '');
    const [musicLocalFile, setMusicLocalFile] = useState<File | null>(null);
    /** Relative path the packaged ZIP uses for the local media file. */
    const musicLocalMediaPath = musicLocalFile ? `media/${musicLocalFile.name.replace(/[^a-zA-Z0-9._-]+/g, '_')}` : '';
    const [selectedActivities, setSelectedActivities] = useState<string[]>(s?.selectedActivities || []);
    const [trialLesson, setTrialLesson] = useState(s?.trialLesson || false);
    /**
     * Lesson Cheat Sheet (Step 2). OFF by default: the sheet is a deliberate revision artefact the
     * tutor asks for, so a lesson is never given one by accident.
     */
    const [lessonCheatSheet, setLessonCheatSheet] = useState(s?.lessonCheatSheet === true);
    
    const [readAloudVoice, setReadAloudVoice] = useState(s?.readAloudVoice || learner?.readAloudVoice || '');
    // Optional tutor (name + photo) for Test Lab / Party Mode Arena lessons
    const [lessonTutor, setLessonTutor] = useState<{ name: string; avatar: string } | null>(null);
    const [useTutorInfo, setUseTutorInfo] = useState(false);
    const [includeAccessibility, setIncludeAccessibility] = useState(false);
    const [addL1Translation, setAddL1Translation] = useState(s?.addL1Translation ?? true);
    
    const [contentMultiplier, setContentMultiplier] = useState(s?.contentMultiplier || 5);
    const [addPictures, setAddPictures] = useState(s?.addPictures ?? false);
    const [picturesCount, setPicturesCount] = useState(s?.picturesCount || 3);
    const [l1TranslationAmount, setL1TranslationAmount] = useState(s?.l1TranslationAmount || 3);
    const [youtubeVideos, setYoutubeVideos] = useState(s?.youtubeVideos ?? false);
    const [youtubeVideoCount, setYoutubeVideoCount] = useState(s?.youtubeVideoCount || 2);
    const [podcastHosts, setPodcastHosts] = useState<{name: string, voice: string, mood: string, personality: string, fact: string}[]>(s?.podcastHosts || []);
    const [simulationGenre, setSimulationGenre] = useState<string[]>(Array.isArray(s?.simulationGenre) ? s.simulationGenre : (s?.simulationGenre ? [s.simulationGenre] : ['Classroom simulated conversation teacher providing feedback and learners ask questions']));
    const [simulationLength, setSimulationLength] = useState(s?.simulationLength || 'medium');
    const [townName, setTownName] = useState(s?.townName || '');
    const [touristVoice, setTouristVoice] = useState(s?.touristVoice || '');
    const [tourGuideVoice, setTourGuideVoice] = useState(s?.tourGuideVoice || '');

    // Avatar Lesson State
    const [avatarLessonCountHint, setAvatarLessonCountHint] = useState<number | string>(s?.avatarLessonCountHint || 2);
    const [avatarMinInitialChoices, setAvatarMinInitialChoices] = useState<number>(s?.avatarMinInitialChoices || 5);
    const [avatarMinTotalBranches, setAvatarMinTotalBranches] = useState<number>(s?.avatarMinTotalBranches || 25);
    const [avatarMinEndings, setAvatarMinEndings] = useState<number>(s?.avatarMinEndings || 3);
    const [avatarPreferredRegions, setAvatarPreferredRegions] = useState<string[]>(s?.avatarPreferredRegions || []);
    const [avatarPreferredVoices, setAvatarPreferredVoices] = useState<string[]>(s?.avatarPreferredVoices || []);
    const [avatarDomainConstraints, setAvatarDomainConstraints] = useState<string>(s?.avatarDomainConstraints || '');

    const [mockExamProfile, setMockExamProfile] = useState<string>(s?.mockExamProfile || 'ielts_academic_paper_2026');
    const [mockExaminerEmail, setMockExaminerEmail] = useState<string>(s?.mockExaminerEmail || '');
    const [mockTotalDuration, setMockTotalDuration] = useState<number>(s?.mockTotalDuration || 30);
    const [mockDeliveryMode, setMockDeliveryMode] = useState<string>(s?.mockDeliveryMode || 'digital_simulation');
    const [mockProctoring, setMockProctoring] = useState({
        preventFocusLoss: s?.mockProctoring?.preventFocusLoss ?? false,
        maxFocusLossWarnings: s?.mockProctoring?.maxFocusLossWarnings ?? 3,
        preventClipboardActions: s?.mockProctoring?.preventClipboardActions ?? false,
        preventContextMenu: s?.mockProctoring?.preventContextMenu ?? false,
        preventProtectedSelection: s?.mockProctoring?.preventProtectedSelection ?? false,
        requireHardwareChecks: s?.mockProctoring?.requireHardwareChecks ?? false
    });
    const [mockAccessibility, setMockAccessibility] = useState({
        highContrast: s?.mockAccessibility?.highContrast ?? false,
        largeText: s?.mockAccessibility?.largeText ?? false,
        reducedMotion: s?.mockAccessibility?.reducedMotion ?? false,
        captions: s?.mockAccessibility?.captions ?? true
    });
    const [mockTaskSettings, setMockTaskSettings] = useState<Record<string, {
        enabled: boolean;
        itemCount: number;
        marks: number;
        durationSeconds: number;
        required: boolean;
        difficulty: string;
        cognitiveProcess: string;
        primarySkill: string;
    }>>(s?.mockTaskSettings || {});

    useEffect(() => {
        const matrix = selectedType === 'mockTestV2' ? EXAM_PROFILE_V2_TASK_TYPE_MATRIX : EXAM_PROFILE_TASK_TYPE_MATRIX;
        const taskTypes = matrix[mockExamProfile] || [];
        setMockTaskSettings(prev => {
            const updated = { ...prev };
            let changed = false;
            taskTypes.forEach(t => {
                if (!updated[t]) {
                    const isWriting = /writing|essay|email|letter|summary|report/i.test(t);
                    const isSpeaking = /speaking|interview|read_aloud|story|talk|pronunciation/i.test(t);
                    
                    updated[t] = {
                        enabled: true,
                        itemCount: isWriting || isSpeaking ? 1 : 5,
                        marks: isWriting ? 10 : (isSpeaking ? 5 : 1),
                        durationSeconds: isWriting ? 600 : (isSpeaking ? 120 : 60),
                        required: true,
                        difficulty: 'CEFR ' + (cefrLevel || 'B2'),
                        cognitiveProcess: isWriting ? 'create' : (isSpeaking ? 'apply' : 'understand'),
                        primarySkill: isWriting ? 'writing' : (isSpeaking ? 'speaking' : 'reading')
                    };
                    changed = true;
                }
            });
            return changed ? updated : prev;
        });
    }, [mockExamProfile, cefrLevel, selectedType]);

    useEffect(() => {
        if (selectedType === 'mockTest') {
            if (!EXAM_PROFILE_TASK_TYPE_MATRIX[mockExamProfile]) {
                setMockExamProfile('ielts_academic_paper_2026');
            }
        }
    }, [selectedType, mockExamProfile]);

    useEffect(() => {
        if (!readAloudVoice) {
            // Default read-aloud voice. A learner whose TARGET language (L2) is not
            // English hears the lesson in the language they are studying: the
            // matching Microsoft Natural voice for that L2 (or, when there is no
            // dedicated voice, its language tag / a multilingual voice) is chosen
            // automatically, so a learner of French gets a French voice without the
            // tutor touching the picker.
            const gender = String((learner as any)?.personalInfo?.gender || (learner as any)?.gender || '').toLowerCase();
            const preferMale = gender.indexOf('male') !== -1;
            const targetLanguage = String((learner as any)?.targetLanguage || '').trim();
            const targetVoice = pickVoiceForLanguage(targetLanguage, preferMale ? 'male' : 'female');
            if (targetVoice) {
                setReadAloudVoice(targetVoice);
                return;
            }
            // English (or a target language we cannot place): female learners -> Microsoft
            // Ava, male learners -> Microsoft Andrew, else Ava.
            const findVoice = (query: string) => {
                const v = window.speechSynthesis.getVoices().find(voice => voice.name.toLowerCase().includes(query));
                if (v) { setReadAloudVoice(v.voiceURI); return true; }
                return false;
            };
            const found = preferMale ? findVoice('microsoft andrew') : findVoice('microsoft ava');
            if (!found) {
                const interval = setInterval(() => {
                    const ok = preferMale ? findVoice('microsoft andrew') : findVoice('microsoft ava');
                    if (ok) clearInterval(interval);
                }, 200);
                setTimeout(() => clearInterval(interval), 5000);
            }
        }
    }, [readAloudVoice]);

    /**
     * A stored English voice is upgraded to the target-language (L2) voice once,
     * without ever overwriting a voice the tutor deliberately chose in the
     * language the learner is studying (a French voice for a learner of French is
     * left exactly as it is).
     */
    const targetVoiceAppliedRef = useRef<string>('');
    useEffect(() => {
        const targetLanguage = String((learner as any)?.targetLanguage || '').trim();
        if (!targetLanguage || isEnglishLanguage(targetLanguage) || !findLanguageVoiceSet(targetLanguage)) return;
        if (targetVoiceAppliedRef.current === targetLanguage) return;
        const current = String(readAloudVoice || '').toLowerCase();
        const isEnglishDefault = !current
            || current.indexOf('english') !== -1
            || current.indexOf('microsoft ava') !== -1
            || current.indexOf('microsoft andrew') !== -1
            || current.indexOf('multilingual') !== -1;
        if (!isEnglishDefault) { targetVoiceAppliedRef.current = targetLanguage; return; }
        const gender = String((learner as any)?.personalInfo?.gender || (learner as any)?.gender || '').toLowerCase();
        const voice = pickVoiceForLanguage(targetLanguage, gender.indexOf('male') !== -1 ? 'male' : 'female');
        if (voice && voice !== readAloudVoice) {
            targetVoiceAppliedRef.current = targetLanguage;
            setReadAloudVoice(voice);
        }
    }, [learner, readAloudVoice]);

    /** The Step-2 hint that explains which target-language voice is in charge. */
    const targetVoiceHint = (() => {
        const targetLanguage = String((learner as any)?.targetLanguage || '').trim();
        if (!targetLanguage || isEnglishLanguage(targetLanguage) || !findLanguageVoiceSet(targetLanguage)) return '';
        const gender = String((learner as any)?.personalInfo?.gender || (learner as any)?.gender || '').toLowerCase();
        const label = languageVoiceLabel(targetLanguage, gender.indexOf('male') !== -1 ? 'male' : 'female');
        return label ? 'Auto-selected for the target language (L2): ' + label + '.' : '';
    })();

    // Persist the learner's chosen read-aloud voice so future lessons remember it.
    const persistedVoiceRef = useRef<string | null>(null);
    useEffect(() => {
        if (readAloudVoice && persistedVoiceRef.current !== readAloudVoice) {
            persistedVoiceRef.current = readAloudVoice;
            if (onUpdateLearner && learner) {
                onUpdateLearner({ ...learner, readAloudVoice });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readAloudVoice]);

    /**
     * ONE global Read Aloud Voice (Adult Profile → Step 2 · Customization & Lesson Structure)
     * feeds every per-character voice picker: Conversation Maker, Audio Lab, Study Guide
     * hosts and Guess the Place. Empty slots, leftover Classmate companion profiles
     * (Alexander Wright / male1 / maya_lin…) and slots still holding the previous global
     * value are re-pointed, while a voice deliberately hand-picked by the tutor is kept.
     */
    const globalReadAloudVoice = resolveGlobalReadAloudVoice(
        readAloudVoice,
        learner?.readAloudVoice,
        (tutorProfile as any)?.voice,
        useAppStore.getState().tutorInfo?.voice,
    );
    const previousGlobalVoiceRef = useRef<string>('');
    useEffect(() => {
        const fallback = globalReadAloudVoice;
        const previous = previousGlobalVoiceRef.current;
        previousGlobalVoiceRef.current = fallback;
        const needsVoice = (v?: string) => !v || isCompanionVoiceCode(v) || (!!previous && v === previous);

        setConvCharacters(prev => {
            let changed = false;
            const next = prev.map((c: any) => {
                if (!needsVoice(c?.voiceURI)) return c;
                changed = true;
                return { ...c, voiceURI: fallback };
            });
            return changed ? next : prev;
        });
        setPodcastHosts(prev => {
            let changed = false;
            const next = prev.map(h => {
                if (!needsVoice(h?.voice)) return h;
                changed = true;
                return { ...h, voice: fallback };
            });
            return changed ? next : prev;
        });
        setTouristVoice(v => (needsVoice(v) ? fallback : v));
        setTourGuideVoice(v => (needsVoice(v) ? fallback : v));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalReadAloudVoice]);

    const handleSavePreferences = () => {
        const settingsToSave = {
            tone,
            cefrLevel,
            cefrTier,
            targetAudience,
            details,
            musicSongTitle,
            musicArtist,
            musicLyrics,
            musicMediaMode,
            musicMediaLink,
            selectedActivities,
            readAloudVoice,
            addL1Translation,
            l1TranslationAmount,
            addPictures,
            picturesCount,
            youtubeVideos,
            youtubeVideoCount,
            selectedType,
            contentMultiplier,
            podcastHosts,
            simulationGenre,
            simulationLength,
            townName,
            touristVoice,
            tourGuideVoice,
            trialLesson,
            lessonCheatSheet,
            mockTotalDuration,
            mockDeliveryMode,
            mockProctoring,
            mockAccessibility,
            mockTaskSettings,
            mockExaminerEmail,
            avatarLessonCountHint,
            avatarMinInitialChoices,
            avatarMinTotalBranches,
            avatarMinEndings,
            avatarPreferredRegions,
            avatarPreferredVoices,
            avatarDomainConstraints,
            classmateCharId,
            classmateLessonMode,
            classmateInitialFriendship,
            classmateMultiActivity,
            convCharacters,
            convTimeAndPlace,
            convTopicAndPurpose,
            convLanguage,
            convLearnersInfo,
            convSampleDialogue
        };

        if (onSaveLearnerSettings) {
            onSaveLearnerSettings(settingsToSave);
        }

        if (onUpdateLearner) {
            onUpdateLearner({
                ...learner,
                manualGeneratorSettings: settingsToSave
            });
        }

        localStorage.setItem(`syllabus-chapters-${(learner as any).id}`, JSON.stringify(selectedSyllabusChapters));
        localStorage.setItem(`syllabus-mode-${(learner as any).id}`, JSON.stringify(personalSyllabusMode));

        if (selectedSyllabusChapters.length > 0 && onUpdateLearner && (learner as any).syllabus?.competencies) {
            const updatedSyllabus = {
                ...(learner as any).syllabus,
                competencies: (learner as any).syllabus.competencies.map((comp: any) => ({
                    ...comp,
                    chapters: (comp.chapters || []).map((chap: any) => {
                        if (selectedSyllabusChapters.includes(chap.id)) {
                            return { ...chap, status: 'completed' };
                        }
                        return chap;
                    })
                }))
            };
            onUpdateLearner({
                ...learner,
                manualGeneratorSettings: settingsToSave,
                syllabus: updatedSyllabus
            });
            setSelectedSyllabusChapters([]);
        }

        alert("Customization preferences saved for this learner!");
    };

    // Activity Types Mapping (comprehensive for all lesson types)
    const ACTIVITY_TYPES = {
        englishLesson: ['Vocabulary', 'Grammar', 'Reading', 'Listening', 'Speaking', 'Writing', 'Roleplay', 'Gap Fill', 'Multiple Choice', 'Flashcards', 'Matching', 'Dictation', 'Error Correction', 'Scramble', 'Discussion', 'Pronunciation', 'Audio Matching', 'Typing Speed', 'Sorting', 'Read Aloud', 'Guided Writing', 'Paragraph Organiser', 'Sequence Ordering', 'Text Reconstruction', 'Just A Minute', 'Shadowing', 'Word Stress', 'True/False', 'Sentence Stress', 'Minimal Pairs', 'Topic Preview', 'Final Review'],
        englishLessonV2: ['Flashcards', 'Gap Fill', 'Matching', 'Multiple Choice', 'Error Correction', 'Sequence Ordering', 'Speaking Game', 'Shadowing', 'Information Gap', 'Debate', 'One Minute Talk', 'Taboo', 'Essay Writing', 'Voice Recording', 'Pronunciation', 'Listening', 'Reading', 'Roleplay', 'Scramble', 'Typing Speed'],
        bilingualStudyLesson: ['Reading', 'Vocabulary', 'Multiple Choice', 'Gap Fill', 'Voice Recording', 'Essay Writing', 'Speaking', 'Listening', 'Grammar', 'Pronunciation'],
        explainerLesson: ['Warm Up', 'Necessary Language', 'Conversation / Dialogue', 'Deep Dive Explanation', 'Communication Toolkit', 'Skills for Real Life', 'Real World Application', 'Expert Talk', 'Dialogues Across Registers', 'Case Study', 'Review & Reflection', 'Voice Recording', 'Essay Writing'],
        conversationalLesson: ['Dialogue', 'Key Phrases', 'Roleplay Scenario', 'Discussion Questions', 'Matching', 'Speaking Challenge', 'Speaking Game', 'Voice Recording', 'Essay Writing', 'Would You Rather', 'Truth or Dare'],
        homework: ['Reading', 'Listening', 'Speaking', 'Writing', 'Grammar', 'Vocabulary', 'Dialogue', 'Roleplay', 'Review', 'Discussion', 'Integrated Skills', 'Soft Skills'],
        quiz: ['IELTS Mock Test', 'TOEFL Practice', 'Duolingo English Test (DET)', 'PTE Academic', 'Standard Pop Quiz', 'Review Quiz', 'Grammar Diagnostic', 'Vocabulary Assessment'],
        studyGuide: ['Audio Overview', 'Summary Slides', 'Flashcards'],
        printableWorksheet: ['Reading Comprehension', 'Vocabulary Check', 'Grammar Focus', 'Writing Prompt'],
        examPrepLesson: ['Exam Strategy', 'Practice Questions', 'Timed Task', 'Feedback', 'Language Analysis', 'Mock Test', 'Model Answer', 'Self-Assessment Rubric', 'Grammar & Vocabulary Cheat Sheet', 'Personalised Study Plan', 'Homework', 'Voice Recording', 'Essay Writing'],
        mockTest: ['Reading Comprehension', 'Listening Comprehension', 'Multiple Choice', 'Short Answer', 'Matching', 'Writing Task', 'Speaking Task'],
        mockTestV2: ['Reading Comprehension', 'Listening Comprehension', 'Multiple Choice', 'Short Answer', 'Matching', 'Writing Task', 'Speaking Task'],
        learningApp: ['Multiple Choice', 'Matching', 'Scramble', 'Dictation', 'Cloze', 'Audio Matching', 'Pronunciation', 'True False'],
        conversationGame: ['Dialogue', 'Choices', 'Roleplay', 'Discussion'],
        partyMode: ['Alibi Puzzle', 'Keep Talking', 'Pictionary', 'Concept Link', 'Hot Seat', 'Taboo', 'Sentiment Analyst', 'Spyfall'],
        placeGame: ['Fun Facts', 'Culture Notes', 'Things To Try', 'Things To Avoid', 'Local Phrases', 'Audio Script', 'Situational Dialogue', 'Comprehension Questions'],
        weeklyChallenge: ['Reading', 'Listening', 'Grammar', 'Speaking', 'Vocabulary', 'Fluency', 'Review'],
        simulations: ['Monologue', 'Lecture', 'Podcast', 'Dialogue', 'Movie Dialogue', 'Play', 'Discussion', 'Debate', 'Situational English', 'Explainer', 'News Report', 'Short Story'],
        liveLesson: ['Warm Up', 'Main Activities', 'Cool Down'],
        lessonPlan: ['Warm Up', 'Main Activities', 'Vocabulary Expansion', 'Consolidation & Review', 'Answer Key', 'Extension'],
        forTeachers: ['Warm Up', 'Main Activities', 'Vocabulary Expansion', 'Consolidation & Review', 'Answer Key', 'Extension'],
        lessonGuide: ['Grammar Dictionary', 'Teaching Strategies', 'Answer Keys', 'SEL Integrations', 'Gamified Challenges', 'Cultural Nuance', 'Pronunciation Drills', 'Differentiated Scaffolding'],
        slides: ['Keywords', 'Examples', 'Comprehension', 'Strategy', 'Dialogue', 'Grammar', 'Slide Explainer'],
        dailyLesson: ['Warm Up Questions', 'Audio Keywords', 'Audio Dialogue', 'Reading Article', 'Language Analysis', 'Radio Drama', 'Quiz', 'Discussion'],
        testLab: ['Hot Seat', 'Listening Activity', 'Multiple Choice', 'Taboo', 'Truth or Dare', 'Matching', 'Scramble', 'Cloze', 'Reading Activity'],
        // musicLesson/videoLesson kinds retired — those types were removed from the content picker.
        audioLesson: ['Podcast', 'Explainer', 'Dialogue', 'Monologue'],
    };

    const getToneGuidelines = (selectedTone: string) => {
        let specificGuidelines = '';
        if (selectedTone.includes('Professional') || selectedTone.includes('Executive') || selectedTone.includes('Formal')) {
            specificGuidelines = `- Strictly enforce a Professional, Formal, and Executive register.
- Use polished vocabulary, clear structural discourse markers, and respectful professional phrasing.
- Eliminate all informal slang, casual street idioms, and sloppy shortcuts.
- Maintain a poised, articulate, and executive-level demeanor throughout all dialogues, explanations, and feedback.`;
        } else if (selectedTone.includes('Casual') || selectedTone.includes('Conversational')) {
            specificGuidelines = `- Strictly enforce a Casual, Natural, and Conversational style.
- Use authentic everyday spoken idioms, friendly colloquialisms, natural contractions (I'm, we'll, gonna/wanna where spoken), and relaxed conversational pacing.
- Avoid stiff academic lectures; make explanations sound like a friendly, helpful peer chatting naturally.`;
        } else if (selectedTone.includes('Humorous') || selectedTone.includes('Fun')) {
            specificGuidelines = `- Strictly enforce a Humorous, Witty, and Highly Engaging tone.
- Incorporate playful banter, amusing relatable examples, witty commentary, and lighthearted analogies.
- Keep the energy high, cheerful, and entertaining while teaching effectively.`;
        } else if (selectedTone.includes('Strict') || selectedTone.includes('Academic')) {
            specificGuidelines = `- Strictly enforce Academic Rigor and Linguistic Precision.
- Provide comprehensive grammatical analysis, etymological context, and formal academic discourse.
- Focus on accuracy, nuance, and intellectual depth in all explanations and feedback.`;
        } else if (selectedTone.includes('Direct') || selectedTone.includes('Concise')) {
            specificGuidelines = `- Strictly enforce a Direct, Crisp, and High-Efficiency tone.
- Zero fluff or unnecessary filler words.
- Present instructions, explanations, and feedback in streamlined, bulleted, or punchy formats.`;
        } else if (selectedTone.includes('Gentle') || selectedTone.includes('Patient') || selectedTone.includes('Beginner')) {
            specificGuidelines = `- Strictly enforce a Gentle, Ultra-Patient, and Reassuring tone.
- Provide slow-paced scaffolding, frequent positive reinforcement, simple clear analogies, and zero intimidating jargon.
- Validate the learner's efforts and eliminate all performance anxiety.`;
        } else if (selectedTone.includes('Playful') || selectedTone.includes('Gamified')) {
            specificGuidelines = `- Strictly enforce an Enthusiastic, Playful, and Gamified tone.
- Frame learning activities as exciting quests, challenges, and level-ups with cheerful celebratory feedback.
- Use colorful expressions, imaginative scenarios, and vibrant positive energy.`;
        } else if (selectedTone.includes('Diplomatic') || selectedTone.includes('Polished')) {
            specificGuidelines = `- Strictly enforce a Diplomatic, Tactful, and Highly Polished tone.
- Model polite hedging (e.g., "It might be helpful to consider...", "Perhaps we could..."), considerate disagreement phrasing, and sophisticated intercultural etiquette.`;
        } else {
            specificGuidelines = `- Strictly enforce a Warm, Encouraging, and Highly Supportive tutor persona.
- Balance constructive linguistic feedback with genuine praise, empathetic encouragement, and confidence-building guidance.`;
        }

        return `\n🎭 MANDATORY TONE & REGISTER DIRECTIVES:
- Selected Tone: ${selectedTone}
${specificGuidelines}`;
    };

    const getCefrGuidelines = (selectedCefr: string) => {
        let guidelines = '';
        const level = selectedCefr.split(' ')[0].toUpperCase();
        if (level === 'A1') {
            guidelines = `- Vocabulary: High-frequency essential words (top 500-1000 lemmas), concrete objects, basic everyday greetings, simple numbers, family, food, and daily routines.
- Grammar: Present Simple (to be, have, do), basic can/can't, simple imperative, singular/plural nouns.
- Sentence Structure: Very short clauses (4-8 words), simple Subject-Verb-Object format. No subordinate or embedded clauses.
- Simplification: Ultra-clear instructions, zero abstract jargon, frequent L1 support for clarity.`;
        } else if (level === 'A2') {
            guidelines = `- Vocabulary: Everyday basic situations (shopping, local geography, employment, routine tasks), common adjectives and prepositions.
- Grammar: Past Simple, basic Present Continuous, Future with 'going to', comparative/superlative adjectives, basic modal verbs (must, should).
- Sentence Structure: Short sentences connected with simple connectors (and, but, because).
- Simplification: Clear, unambiguous phrasing with straightforward contextual examples.`;
        } else if (level === 'B1') {
            guidelines = `- Vocabulary: Broad conversational vocabulary covering personal interests, work, travel, current events, and abstract feelings. Common phrasal verbs and collocations.
- Grammar: Present Perfect vs. Past Simple, First/Second Conditionals, Passive Voice (basic), Modals of deduction (might, could), Relative clauses.
- Sentence Structure: Compound and complex sentences with varied linking words (although, however, therefore, in order to).
- Simplification: Natural yet accessible phrasing, explaining nuanced terms in simple English.`;
        } else if (level === 'B2') {
            guidelines = `- Vocabulary: Rich, expressive vocabulary with idiomatic expressions, workplace collocations, abstract concepts, and nuanced descriptors.
- Grammar: Third and Mixed Conditionals, Advanced Passive, Past Perfect Continuous, Reported Speech, Subjunctive/Inversion basics, Cleft sentences.
- Sentence Structure: Sophisticated multi-clause sentences, varied discourse markers, cohesive paragraphs.
- Simplification: Natural native-like complexity with deep linguistic explanations for subtle distinctions.`;
        } else if (level === 'C1' || level === 'C2') {
            guidelines = `- Vocabulary: Native-level idiomatic mastery, low-frequency collocations, precise domain-specific terminology, stylistic registers, and subtle connotations.
- Grammar: Inversion with negative adverbials, participle clauses, advanced mixed conditionals, complex nominalization, sophisticated discourse structuring.
- Sentence Structure: Highly articulated, nuanced syntax with effortless stylistic variation.
- Simplification: No artificial simplification — maintain full authentic native complexity.`;
        } else {
            guidelines = `- Strictly align vocabulary, grammar patterns, and sentence length to CEFR ${selectedCefr}.`;
        }

        return `\n📊 STRICT CEFR DIFFICULTY & LINGUISTIC PRECISION:
- Target Level: ${selectedCefr}
${guidelines}`;
    };

    const getTargetAudienceGuidelines = (audience: string) => {
        let tips = '';
        if (audience.includes('Professional') || audience.includes('Executive') || audience.includes('Business')) {
            tips = `- Pedagogical Focus: Professional efficiency, boardroom assertiveness, business negotiation, email & presentation clarity, cross-cultural workplace competence.
- Practical Strategy: Frame examples around meetings, project deliverables, leadership scenarios, executive summaries, and polite corporate diplomacy.`;
        } else if (audience.includes('University') || audience.includes('Academic')) {
            tips = `- Pedagogical Focus: Academic discourse, critical thinking, literature analysis, research synthesis, academic hedging, seminar debate.
- Practical Strategy: Use university campus contexts, lecture discussions, scientific/humanistic articles, and formal argument structuring.`;
        } else if (audience.includes('Test Taker')) {
            tips = `- Pedagogical Focus: Exam rubric criteria (Lexical Resource, Grammatical Range & Accuracy, Coherence & Cohesion, Task Achievement), timed precision, error avoidance.
- Practical Strategy: Model high-scoring band 7-9 responses, highlight common candidate traps, and reinforce formal linking devices.`;
        } else if (audience.includes('Immigrant') || audience.includes('Relocation')) {
            tips = `- Pedagogical Focus: Practical real-world survival English, civic institutions, healthcare/banking navigation, neighborhood interactions, localized cultural norms.
- Practical Strategy: Use highly applicable everyday dialogues (doctor visits, landlord discussions, school meetings, grocery/transit queries).`;
        } else if (audience.includes('Teenager') || audience.includes('Young Adult') || audience.includes('College Prep')) {
            tips = `- Pedagogical Focus: Relatable digital-era topics, pop culture, social interactions, academic ambition, modern hobbies, peer communication.
- Practical Strategy: Keep themes dynamic and fast-paced; avoid outdated or dry corporate cliches.`;
        } else if (audience.includes('Child') || audience.includes('Young Learner')) {
            tips = `- Pedagogical Focus: High visuality, sensory concepts, storytelling, energetic songs/rhymes, positive habit building.
- Practical Strategy: Ultra-simple language, playful character dialogues, frequent encouragement, gamified milestones.`;
        } else {
            tips = `- Pedagogical Focus: General conversational confidence, cultural exchange, travel fluency, casual banter, overcoming speaking hesitation.
- Practical Strategy: Focus on active listening, spontaneous dialogue turns, and practical real-world scenarios.`;
        }

        return `\n🎯 TARGET AUDIENCE TAILORING & PEDAGOGICAL STRATEGY:
- Target Audience: ${audience}
${tips}`;
    };

    const generateConversationPrompt = () => {
        let lengthInstruction = "";
        if (contentMultiplier === 2) {
            lengthInstruction = `\nCONTENT QUANTITY MULTIPLIER: 2X (Deep Dive).
- Make each line TWICE AS LONG with detailed multi-sentence dialogue turns.
- Generate at least 20-25 complete dialogue turns.`;
        } else if (contentMultiplier >= 3) {
            lengthInstruction = `\nCONTENT QUANTITY MULTIPLIER: 3X/5X (Exhaustive Volume).
- Make each line 5 TIMES LONGER with rich multi-paragraph spoken dialogue turns, detailed banter, and deep sub-scenarios.
- Generate at least 40-50 complete dialogue turns.`;
        } else {
            lengthInstruction = `\nCONTENT QUANTITY MULTIPLIER: 1X (Standard).
- Generate 10-12 standard length dialogue turns.`;
        }

        const learnerName = learner?.name || 'Learner';
        const learnerL1 = learner?.translationLanguage || learner?.l1Language || (learner as any)?.nativeLanguage || 'Spanish';
        const learnerInterests = learner?.interests || 'general conversational goals';
        const learnerOccupation = learner?.personalInfo?.occupation || 'Professional';
        const learnerAge = learner?.personalInfo?.age ? `${learner?.personalInfo?.age} years old` : 'Adult';
        const learnerCountry = learner?.personalInfo?.country || 'International';
        const learnerFacts = learner?.facts && learner.facts.length > 0 ? learner.facts.join('; ') : 'Dedicated language learner';
        const learnerChallenges = learner?.learningChallenges && learner.learningChallenges.length > 0 ? learner.learningChallenges.join(', ') : 'Spoken fluency and natural idioms';
        const learnerGoals = learner?.coursePlan?.shortTermGoals && learner.coursePlan.shortTermGoals.length > 0 ? learner.coursePlan.shortTermGoals.join(', ') : 'Master conversational English';
        const learnerLevel = cefrLevel || learner?.cefrLevel || 'B1-B2';

        const prompt = `## NON-NEGOTIABLE FIRST STEP: REQUEST SOURCE TEXT OR SAMPLE DIALOGUE

You MUST begin your response by asking the user: "Please send your PDF, lesson text, or Sample Dialogue."
Do NOT generate any conversation content in your first response. You MUST wait for the user to provide their source material.

## AFTER THE USER PROVIDES THEIR SOURCE MATERIAL (PDF, lesson text, or Sample Dialogue):

Once the user sends their PDF, lesson text, or Sample Dialogue, carefully analyze it and create a comprehensive ESL interactive conversation JSON package based entirely on the provided source material, fully personalized for the learner and characters below.

### LEARNER PROFILE & CONTEXT:
- Name: ${learnerName}
- Age: ${learnerAge}
- Location / Country: ${learnerCountry}
- Occupation: ${learnerOccupation}
- Target CEFR Level: ${learnerLevel}
- Native Language (L1): ${learnerL1}
- Personal Interests: ${learnerInterests}
- Key Facts & Background: ${learnerFacts}
- Learning Challenges & Focus: ${learnerChallenges}
- Goals: ${learnerGoals}

### CONVERSATION CHARACTERS SPECIFICATION:
${convCharacters.map((c, i) => `- Character ${i + 1} (${c.name}): Tone: ${c.tone || 'Natural'}, Mood: ${c.mood || 'Engaged'}, Job/Role: ${c.job || 'Participant'}, Read Aloud Voice: ${c.voiceURI || 'Default'}`).join('\n')}
(Note: Character 1 is ${convCharacters[0]?.name || learnerName} [Learner], Character 2 is ${convCharacters[1]?.name || 'Tutor'} [Tutor]).

${getToneGuidelines(tone)}
${getCefrGuidelines(learnerLevel)}
${getTargetAudienceGuidelines(targetAudience)}
${lengthInstruction}

REQUIRED COMPONENTS TO GENERATE:
1. "settings": { "cefrLevel": "${learnerLevel}", "targetL1": "${learnerL1}", "topic": "Extracted directly from the provided source material/dialogue" }
2. "dialogue": Complete conversational turns derived from the provided source material. For EVERY line, include:
   - "character": Character name (strictly from the characters defined above)
   - "text": Spoken sentence/paragraph. CRITICAL HIGHLIGHTING DIRECTIVE: In the spoken "text", you MUST mark the exact phrase explained by Grammar using [grammar: target phrase] or <span class="grammar-highlight">target phrase</span>, and mark the exact word/phrase explained by Key Glossary using [glossary: target word] or <span class="glossary-highlight">target word</span>.
   - "action": Vivid stage directions with matching emojis at start and end (e.g. "😊 smiles warmly 😊")
   - "annotations": Color-coded learning metadata for this line. PERSONALIZATION DIRECTIVE: Address ${learnerName} DIRECTLY in second person (e.g. "Notice for ${learnerName}: ...", "Practice this phrase for your interest in ${learnerInterests}..."):
     * "grammar_target": Exact substring inside "text" that grammar explains (e.g. "are diving into").
     * "grammar": Grammatical breakdown addressing ${learnerName} directly.
     * "glossary_target": Exact word or idiom inside "text" that key glossary explains (e.g. "dive into").
     * "glossary": Key vocabulary explained directly for ${learnerName} (format: "word/phrase = definition and context").
     * "formal": Professional/formal register equivalent.
     * "informal": Casual street/friend equivalent.
     * "soap_opera": Uncensored dramatic soap opera style (expressive raw slang and curses where appropriate).
     * "pronunciation": Pronunciation & intonation indicators with stressed words and pitch direction arrows (↗ ↘).
     * "translation_l1": Accurate, natural translation in ${learnerName}'s native language (${learnerL1}).

3. "glossary": Key vocabulary items used in dialogue. Generate AT LEAST 12 distinct items in the "glossary" array. Each item MUST have "word", "definition", "ccq" (concept checking question), "ccq_answer", and "character" (the character name who speaks this term, e.g. "${convCharacters[0]?.name || 'Character1'}").

4. "questions": Personalized comprehension/discussion questions asked by characters addressing ${learnerName}. Generate AT LEAST 6 distinct items in the "questions" array. Each item MUST have "scenario", "character" (the character name asking the question, e.g. "${convCharacters[1]?.name || 'Tutor'}"), "question", and "answer".

Read Aloud Voice DIRECTIVE: In "glossary" and "questions" sections, every item MUST include a "character" field specifying which character reads it aloud using their assigned voice.

DIALOGUE LENGTH GUIDELINE: Keep the conversation realistic and natural. Dialogue lines MUST vary naturally in length throughout the conversation — alternate between short 1-2 sentence quick reactions or questions, medium 2-3 sentence responses, and occasional 3-4 sentence detailed explanations. Avoid uniform or unnaturally long speeches to ensure authentic spoken flow.

CRITICAL AUDIO GAME FORMATTING: For all listening and read-aloud game items (listening_no_text_1, listen_speed_trial, listening_no_text_2), NEVER include brackets [] or prefixes like "[Audio:" or "AUDIO:". The prompt and audioText fields must be clean plain spoken English text without brackets or metadata tags.

LISTEN-ONLY RULE (NON-NEGOTIABLE): ONLY the three listening activities are listen-only tasks: "listening_no_text_1" (dictation), "listen_speed_trial" (pick the correct reply) and "listening_no_text_2" (choose the exact sentence you heard). These are the ONLY items that get an audio Play button, and ONLY their prompts may sound like "Listen to the clip and choose the exact sentence you heard" or "Listen-only mode — the spoken text is hidden". For EVERY other activity (vocab_sprint, gap_fill_frenzy, register_clash, dialogue_best_alt, rapid_ccq_duel) the "prompt" MUST be the real self-contained question the learner reads and answers (for example "What is the meaning of ...?" / "Which word best completes the gap?") with genuine options, "answer" index and "explanation" — NEVER write "Listen to the clip...", never add a listening subtitle, never create a Play button. Do NOT put an "audioText" field on non-listening items; the learner must read those questions themselves.

SELF-CONTAINED QUESTIONS (NON-NEGOTIABLE): Every question must be fully answerable from its own text. NEVER write "according to the text", "as mentioned above", "in the passage", "based on the dialogue" or similar. If a question needs a sentence, dialogue line or definition, embed that exact text inside the item's "prompt" or context first, then ask the question. The mini-lesson style "explanation" must TEACH the language point used in the question (meaning, form, use) — never meta-comment about the question itself (never "These questions test your ability to find specific details in a text").

5. "activities": 10 auto-scored game activities (each activity MUST contain 5 distinct items based on the provided material, EXCEPT rapid_ccq_duel which MUST contain AT LEAST 10 items):
   - Activity 1: "vocab_sprint" (⚡ Speed Vocab Sprint - real vocabulary questions: each item = { "prompt": "What is the meaning of 'TERM'?" or "Which word matches this definition...?", "options": [4 real choices incl. the correct one], "answer": <index>, "explanation": "Why correct" } — a plain question card, NO Play button, NO listen framing)
   - Activity 2: "listening_no_text_1" (🎧 Listening Challenge - real-time DICTATION: each item MUST have "audioText" = a clean spoken line of conversation (NO brackets, NO "Audio:" prefixes) and "prompt" = "Dictation: type what you hear". The learner types every word they hear - NEVER show the answer in options)
   - Activity 3: "grammar_strike" (Grammar Strike - Preposition Errors: each item MUST have this EXACT shape: { "sentenceSegments": ["I've been", "trying to", "reached you", "for ten minutes!"], "errorIndex": 2, "explanation": "Incorrect past participle 'reached'. Should be 'reach' after 'trying to'." } - 3-6 segments per sentence, errorIndex points at the segment with the preposition/grammar mistake)
   - Activity 4: "gap_fill_frenzy" (🔍 Gap Fill Frenzy - each item = { "prompt": "the sentence with a gap '___' — full context included in the prompt", "options": [4 choices incl. the target phrase], "answer": <index>, "explanation": "Why this phrase fits" } — a plain question card, NO Play button)
   - Activity 5: "register_clash" (🎭 Register Clash - each item = { "prompt": "Which is the formal / informal / neutral equivalent of the quoted phrase?", "options": [4 choices], "answer": <index>, "explanation": "Register explanation" } — a plain question card, NO Play button)
   - Activity 6: "listen_speed_trial" (🎧 Listen & Pick - listen to a line of conversation, pick the CORRECT REPLY line. Each item: { "audioText": "the spoken line", "prompt": "Listen and pick the correct reply", "options": [the real next reply line + 3 wrong distractor replies], "answer": <index of correct reply>, "explanation": "Why this is the natural reply" })
   - Activity 7: "rapid_ccq_duel" (⚔️ Rapid CCQ Duel - AT LEAST 10 concept-checking questions with 4 choices each; items: { "prompt": "CCQ question", "options": [4 options], "answer": <index>, "explanation": "Why correct" })
   - Activity 8: "dialogue_best_alt" (🗣️ Dialogue Alternatives - each item = { "prompt": "Which is the most natural alternative way for CHARACTER to say: 'quoted line'?", "options": [4 choices], "answer": <index>, "explanation": "Why this sounds most natural" } — a plain question card, NO Play button)
   - Activity 9: "listening_no_text_2" (🎵 Audio Listening - listen and choose the EXACT sentence you heard: items { "audioText": "the spoken sentence", "prompt": "Listen and choose the exact sentence you heard", "options": [the spoken sentence + 3 similar distractor sentences], "answer": <index> })
   - Activity 10: "dramatic_branching_quest" (RPG Quest - A turn-based roleplay game with settings, context, and 3 alternative choices for forking story paths in everyday modern sitcom situational English). RPG Quest is MANDATORY: ALWAYS include it as activity 10 with 5 turns - never skip it.

SPECIAL DIRECTIVE FOR RPG QUEST (ACTIVITY 10):
- Title MUST be "🎮 RPG Quest".
- Characters: The main speaker and characters in RPG Quest MUST be dynamically chosen from the defined conversation characters (${convCharacters.map(c => c.name).join(' and ')}). STRICTLY DO NOT use fixed generic names like Barista Sam, Jordan, Alex, Taylor, or Chris.
- Tone & Theme: The story MUST be an everyday modern situational English scenario based on the topic and context from the source material.
- STRICTLY FORBIDDEN: Do NOT use gothic themes, vampire lords, Renaissance codexes, ancient dungeons, catacombs, sci-fi laser grids, or medieval fantasy. Do NOT use big, fancy, or archaic words.
- CEFR Level: Everything (narrative context, prompts, dialogue choices, and consequences) MUST be strictly written in everyday situational English at learner ${learnerName}'s CEFR level (${learnerLevel}).
- Structure: Provide a top-level "rpg_quest" object containing exactly 5 sequential turn nodes (turns 1 to 5). Each turn MUST contain a clear scene location, speaker name (from ${convCharacters.map(c => c.name).join(' or ')}), storyText, and 3 distinct choice options per turn (1 winning choice with isWinning: true, and 2 non-winning choices with isWinning: false, distinct funny/relatable consequenceText and emoji).

CRITICAL VOICE DIRECTIVE: You MUST preserve and return the exact "voiceURI" values provided in the "characters" schema below for each character.

OUTPUT YOUR ENTIRE RESPONSE AS A SINGLE VALID JSON BLOCK (wrapped in \`\`\`json blocks).
Use exactly this JSON schema:
{
  "settings": {
    "cefrLevel": "${learnerLevel}",
    "targetL1": "${learnerL1}",
    "topic": "Topic from provided text"
  },
  "characters": [
    ${convCharacters.map(c => `{ "name": "${c.name}", "voiceURI": "${c.voiceURI || ''}" }`).join(',\n    ')}
  ],
  "dialogue": [
    {
      "character": "${convCharacters[0]?.name || 'Character1'}",
      "text": "Hey there! We are <span class=\"grammar-highlight\">diving into</span> this project right now, and it looks <span class=\"glossary-highlight\">promising</span>.",
      "action": "😊 smiles warmly 😊",
      "annotations": {
        "grammar_target": "diving into",
        "grammar": "Note for ${learnerName}: Present continuous structure ('are diving into') expressing current active engagement...",
        "glossary_target": "promising",
        "glossary": "promising = showing signs of future success or good results",
        "formal": "Good day. Shall we commence our formal review of this endeavor?",
        "informal": "Hey! Ready to jump right in?",
        "soap_opera": "Damn it, let's get down to business right now before it slips away!",
        "pronunciation": "HOW are you DOing toDAY? ↗",
        "translation_l1": "Translation in ${learnerL1}..."
      }
    }
  ],
  "glossary": [
    { "word": "promising", "definition": "Showing signs of future success or good results", "ccq": "Does this mean the outcome looks positive?", "ccq_answer": "Yes, it looks very positive", "character": "${convCharacters[0]?.name || 'Character1'}" }
  ],
  "questions": [
    { "scenario": "Context...", "character": "${convCharacters[1]?.name || 'Tutor'}", "question": "Question for ${learnerName}...", "answer": "Expected answer" }
  ],
  "activities": [
    {
      "id": "vocab_sprint",
      "title": "⚡ Speed Vocab Sprint",
      "icon": "fa-bolt",
      "description": "Rapid vocabulary matching challenge",
      "items": [
        { "prompt": "Question prompt 1", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 0, "explanation": "Why correct" }
      ]
    }
  ],
  "rpg_quest": {
    "title": "🎮 RPG Quest",
    "turns": [
      {
        "turn": 1,
        "location": "Modern scene location for turn 1...",
        "speaker": "${convCharacters[1]?.name || 'Character2'}",
        "storyText": "Everyday modern situational English scenario story context...",
        "choices": [
          { "text": "Polite, natural winning response...", "isWinning": true, "sfx": "love", "consequenceText": "Success description..." },
          { "text": "Impolite misstep response...", "isWinning": false, "sfx": "death", "emoji": "😅", "consequenceText": "Funny relatable consequence explanation..." },
          { "text": "Awkward misstep response...", "isWinning": false, "sfx": "death", "emoji": "🙈", "consequenceText": "Awkward consequence explanation..." }
        ]
      },
      {
        "turn": 2,
        "location": "Modern scene location for turn 2...",
        "speaker": "${convCharacters[1]?.name || 'Character2'}",
        "storyText": "Everyday story continuation for turn 2...",
        "choices": [
          { "text": "Natural winning response...", "isWinning": true, "sfx": "love", "consequenceText": "Success description..." },
          { "text": "Misstep choice A...", "isWinning": false, "sfx": "death", "emoji": "😅", "consequenceText": "Relatable consequence..." },
          { "text": "Misstep choice B...", "isWinning": false, "sfx": "death", "emoji": "🙈", "consequenceText": "Awkward consequence..." }
        ]
      },
      {
        "turn": 3,
        "location": "Modern scene location for turn 3...",
        "speaker": "${convCharacters[1]?.name || 'Character2'}",
        "storyText": "Everyday story continuation for turn 3...",
        "choices": [
          { "text": "Natural winning response...", "isWinning": true, "sfx": "love", "consequenceText": "Success description..." },
          { "text": "Misstep choice A...", "isWinning": false, "sfx": "death", "emoji": "😅", "consequenceText": "Relatable consequence..." },
          { "text": "Misstep choice B...", "isWinning": false, "sfx": "death", "emoji": "🙈", "consequenceText": "Awkward consequence..." }
        ]
      },
      {
        "turn": 4,
        "location": "Modern scene location for turn 4...",
        "speaker": "${convCharacters[1]?.name || 'Character2'}",
        "storyText": "Everyday story continuation for turn 4...",
        "choices": [
          { "text": "Natural winning response...", "isWinning": true, "sfx": "love", "consequenceText": "Success description..." },
          { "text": "Misstep choice A...", "isWinning": false, "sfx": "death", "emoji": "😅", "consequenceText": "Relatable consequence..." },
          { "text": "Misstep choice B...", "isWinning": false, "sfx": "death", "emoji": "🙈", "consequenceText": "Awkward consequence..." }
        ]
      },
      {
        "turn": 5,
        "location": "Modern scene location for turn 5...",
        "speaker": "${convCharacters[1]?.name || 'Character2'}",
        "storyText": "Final resolution story context for turn 5...",
        "choices": [
          { "text": "Natural winning response...", "isWinning": true, "sfx": "love", "consequenceText": "Success description..." },
          { "text": "Misstep choice A...", "isWinning": false, "sfx": "death", "emoji": "😅", "consequenceText": "Relatable consequence..." },
          { "text": "Misstep choice B...", "isWinning": false, "sfx": "death", "emoji": "🙈", "consequenceText": "Awkward consequence..." }
        ]
      }
    ]
  }
}`;
        return prompt;
    };

    const generatePrompt = () => {
        let prompt = '';
        
        if (selectedType === 'conversationMaker') {
            prompt = generateConversationPrompt();
            prompt += getStrictLanguageTutorPromptBlock(cefrLevel || learner?.cefrLevel || 'B1', (learner as any)?.l1Language || learner?.translationLanguage, cefrTier);
            if (learner) {
                prompt += getPedagogicalHistoryPromptBlock(learner);
            }
            // A group class must reach EVERY lesson type, and this is the one place each of
            // them ends up as the prompt the tutor copies and the AI receives. See
            // `groupClassPromptBlock` — it returns '' for an ordinary one-to-one learner.
            setPromptText(prompt + groupClassPromptBlock(learner));
            return;
        }

        if (selectedType === 'classmate') {
            const currentChars = useAppStore.getState().characters || DEFAULT_APP_CHARACTERS;
            const character = getClassmateCharacterById(classmateCharId, currentChars);
            prompt = generateClassmateMasterPromptText({
                characterId: classmateCharId,
                mode: classmateLessonMode,
                friendshipLevel: classmateInitialFriendship,
                isSectionMode: classmateMultiActivity,
                learnerName: learner?.name || 'Learner',
                learnerL1: (learner as any)?.l1Language || learner?.translationLanguage || 'English',
                learnerInfo: learner?.interests || (learner as any)?.personalInfo?.occupation || 'Adult ESL Learner'
            }, character);
            prompt += getStrictLanguageTutorPromptBlock(cefrLevel || learner?.cefrLevel || 'B1', (learner as any)?.l1Language || learner?.translationLanguage, cefrTier);
            if (learner) {
                prompt += getPedagogicalHistoryPromptBlock(learner);
            }
            // A group class must reach EVERY lesson type, and this is the one place each of
            // them ends up as the prompt the tutor copies and the AI receives. See
            // `groupClassPromptBlock` — it returns '' for an ordinary one-to-one learner.
            setPromptText(prompt + groupClassPromptBlock(learner));
            return;
        }

        if (trialLesson) {
            // TRIAL LESSON: 20-Minute Micro Lesson V1 with High-Conversion Persuasion & Playful Booking Prompts
            const basePrompt = getManualPrompt('englishLesson', learner, { contentMultiplier: 1 });
            const learnerName = learner?.name || 'Learner';
            const learnerLevel = cefrLevel || learner?.cefrLevel || 'B1';
            const learnerL1 = (learner as any)?.l1Language || learner?.translationLanguage || 'Spanish';
            const learnerInterests = learner?.interests || 'personal & professional growth';
            const learnerGoals = learner?.coursePlan?.shortTermGoals?.join(', ') || 'speaking fluency, confidence, and natural conversational flow';

            prompt = `## NON-NEGOTIABLE FIRST STEP: REQUEST TOPIC FOR 20-MINUTE TRIAL LESSON

You MUST begin your response by asking the user: "Welcome! For this 20-minute trial lesson, please tell me what topic or interest you would like to explore today!"
Do NOT generate any lesson content in your first response. Do NOT ask for any PDF or lesson text. You MUST wait for the user to provide their topic or area of interest.

## AFTER THE USER PROVIDES THEIR TOPIC:

Once the user provides their topic, generate a dynamic, high-engagement **20-Minute Micro Lesson (Version 1)** tailored for ${learnerName} following these STRICT pedagogical and conversion psychology rules:

---
### 🚀 CORE MISSION: HIGH-CONVERSION 20-MINUTE TRIAL LESSON
This is an online trial lesson designed to provide tremendous instant value, showcase all interactive features of a Micro Lesson (Version 1), and **persuasively and delightfully convert the trial student into a long-term recurring student**.

### 🎭 PLAYFUL, WITTY & PERSUASIVE TUTOR PERSONA:
- The tutor tone MUST be exceptionally warm, humorous, witty, charismatic, and enthusiastic.
- Throughout the entire lesson, make the learner feel that **I am indisputably the best, most dedicated, and most fun tutor for them**.
- Constantly highlight how fast and effortlessly they learn when studying with me.

### 🎯 MANDATORY INTERLEAVED "WHEN DO WE START?" & BOOKING PROMPTS:
From the very start of the lesson and across ALL sections (dialogues, vocabulary checks, comprehension questions, speaking tasks, and quizzes), you MUST **interleave topic questions with playful, persuasive booking questions and commitment prompts**.
- **The Alternating Pattern Rule**: For every 1-2 standard topic questions/exercises, the next question or dialogue turn MUST explicitly and playfully ask about starting classes, booking their schedule, or locking in their learning plan.
- **Direct, Humorous Booking Prompts to Weave In**:
  - *"Be honest, ${learnerName}... don't you wanna book your weekly spot with me right now? 😉"*
  - *"So when are we officially starting our regular classes: this Tuesday or Thursday?"*
  - *"On a scale of 1 to 'Let's book our 10-lesson package immediately', how much fun are you having right now? 😂"*
  - *"Look at you mastering this already! Imagine where your English will be in 3 months if we meet twice a week. Ready to make it official?"*
  - *"Quick diagnostic test: Are you going to tell me your booking decision now, or after this next challenge? (Hint: option A is the winning move! 🎉)"*
- **Multiple-Choice Questions with Booking Options**:
  - In quizzes and interactive activities, include witty options that get ${learnerName} to choose or declare their intention to start classes (e.g. Option A: "I need to practice more grammar", Option B: "I should immediately book regular classes with my awesome tutor", Option C: "Both A and B!").
- **Clear Next Steps & Scheduling Checkpoints**:
  - Prompt ${learnerName} to specify their preferred days, times, and weekly lesson frequency (1x, 2x, or 3x per week).
  - Explicitly ask them to confirm if they are ready to embark on this journey together.

### 🧠 PSYCHOLOGICAL PERSUASION TRIGGERS:
1. **Instant Dopamine & Quick Wins**: Structure the first 2-3 activities to give rapid, guaranteed success so ${learnerName} immediately feels competent and motivated.
2. **Personalized Relevance**: Tie every concept directly to ${learnerName}'s interests (${learnerInterests}) and goals (${learnerGoals}).
3. **The "Contrast Effect"**: Contrast dry, boring textbook methods with our engaging, interactive, gamified lesson style to demonstrate why learning with me is 10x more effective.
4. **Exciting Future Milestones (FOMO & Teasers)**: Introduce 2-3 advanced idioms, speaking hacks, or native nuances and tease: *"We'll dive deep into these insider secrets in Lesson 2 and 3!"*
5. **Unstoppable Call to Action at the Climax**: Conclude with a celebratory graduation milestone and an irresistible, warm, and humorous closing message demanding a high-five and a class booking!

### 📊 LANGUAGE & CEFR CALIBRATION:
- Target CEFR Level: ${learnerLevel}
- Native Language Support (L1): ${learnerL1}
${getToneGuidelines('Warm, Encouraging, Humorous & Fun')}
${getCefrGuidelines(learnerLevel)}
${getTargetAudienceGuidelines(targetAudience)}

${basePrompt}`;

            prompt += getStrictLanguageTutorPromptBlock(learnerLevel, learnerL1, cefrTier);
            if (learner) {
                prompt += getPedagogicalHistoryPromptBlock(learner);
            }
            // A group class must reach EVERY lesson type, and this is the one place each of
            // them ends up as the prompt the tutor copies and the AI receives. See
            // `groupClassPromptBlock` — it returns '' for an ordinary one-to-one learner.
            setPromptText(prompt + groupClassPromptBlock(learner));
            return;
        }
        
        if (selectedType === 'liveLesson') {
            prompt = getManualPrompt(selectedType, learner, { ...liveLessonConfig, cefrLevel, cefrTier });
        } else if (selectedType === 'mockTest' || selectedType === 'mockTestV2') {
            prompt = getManualPrompt(selectedType, learner, {
                examProfile: mockExamProfile,
                totalDurationMinutes: mockTotalDuration,
                deliveryMode: mockDeliveryMode,
                proctoring: mockProctoring,
                accessibility: mockAccessibility,
                taskSettings: mockTaskSettings,
                cefrLevel,
                cefrTier
            });
        } else if (selectedType === 'avatarLesson' || selectedType === 'avatarLessonV2') {
            prompt = getManualPrompt(selectedType, learner, {
                tone,
                cefrLevel,
                cefrTier,
                targetAudience,
                details,
                lessonCountHint: avatarLessonCountHint,
                minInitialChoices: avatarMinInitialChoices,
                minTotalBranches: avatarMinTotalBranches,
                minEndings: avatarMinEndings,
                preferredRegions: avatarPreferredRegions,
                preferredVoices: avatarPreferredVoices,
                domainConstraints: avatarDomainConstraints
            });
        } else if (selectedType === 'musicLesson') {
            // Music Lesson — the tutor specifies the song, singer, lyrics and media
            // source in Step 2, so the prompt is built around THAT song.
            prompt = getManualPrompt(selectedType, learner, {
                contentMultiplier,
                cefrLevel,
                cefrTier,
                songTitle: musicSongTitle,
                artist: musicArtist,
                lyrics: musicLyrics,
                mediaMode: musicMediaMode,
                localFileName: musicLocalFile?.name || '',
                mediaUrl: musicMediaMode === 'local'
                    ? (musicLocalMediaPath || 'media/song.mp3')
                    : musicMediaLink
            });
        } else {
            prompt = getManualPrompt(selectedType, learner, { contentMultiplier, cefrLevel, cefrTier });
        }

        if (personalSyllabusMode && selectedSyllabusChapters.length > 0) {
            // OVERRIDE the two-step "wait for source text" instructions — the AI must generate NOW
            // The base prompt tells the AI to wait for source text, but we call this as a single-shot generation.
            // Remove "DO NOT GENERATE YET" blocks that ask the AI to wait for text
            prompt = prompt.replace(
                /\*\*CRITICAL INSTRUCTION: STOP! DO NOT GENERATE YET\.\*\*[\s\S]*?(?:Once you receive the text, THEN you must generate the JSON\.|Once you receive the lyrics, THEN you must generate the JSON\.)/,
                `**CRITICAL INSTRUCTION: GENERATE THE COMPLETE JSON NOW.**
        Use the lesson details, learner profile, and settings below as your SOURCE MATERIAL. Create a full, detailed lesson based on these inputs — do not ask for additional text.`
            );
            // Handle englishLessonV2's slightly different "DO NOT GENERATE" text
            prompt = prompt.replace(
                /CRITICAL: DO NOT GENERATE THE JSON YET![\s\S]*?Wait for my next message containing the text\./,
                `**CRITICAL INSTRUCTION: GENERATE THE COMPLETE JSON NOW.**
        Use the lesson details, learner profile, and settings below as your SOURCE MATERIAL. Create a full, detailed lesson based on these inputs — do not ask for additional text.`
            );
            prompt = prompt.replace(
                /--- YOUR TASK \(SETUP\) ---[\s\S]*?You are an expert content generator for an English learning platform\./,
                `--- YOUR TASK ---
        You are an expert content generator for an English learning platform.`
            );
            // Replace "user will provide a raw text in the next message" with "use the details below"
            prompt = prompt.replace(
                /The user will provide a raw text in the next message\. Create a/g,
                `Create a`
            );
            prompt = prompt.replace(
                /The user will provide a raw text in the next message\. Generate a/g,
                `Generate a`
            );
            prompt = prompt.replace(
                /The user will provide a raw text in the next message\.?/g,
                ``
            );
            prompt = prompt.replace(
                /based on that text\./g,
                `based on the learner profile and details below.`
            );
            prompt = prompt.replace(
                /Based on that text\./g,
                `Based on the learner profile and details below.`
            );
            // Remove "I have NOT provided the source text yet" instructions that remain
            prompt = prompt.replace(
                /I have NOT provided the source text yet\./g,
                ``
            );
            // Replace "Wait for my next message containing the text" with generate now
            prompt = prompt.replace(
                /Wait for my next message containing the text\./g,
                `Generate the complete JSON now based on the inputs below.`
            );
        } else if (selectedType === 'musicLesson') {
            // A Music Lesson is fully specified by the Step 2 song fields — never ask
            // the tutor to send a PDF/text, just generate the JSON immediately.
            prompt = `## SOURCE MATERIAL ALREADY PROVIDED\n\nThe song, the singer, the lyrics and the media source of this Music Lesson are already specified in the prompt below (plus any selected personal-syllabus chapters). Do NOT ask for any PDF, file or lesson text — generate the complete JSON now.\n\n${prompt}`;
        } else if (selectedType === 'videoLessonInteractive') {
            // A Video Lesson is driven by the video itself, never by a PDF. The only
            // thing that may still be missing is the link/transcript, so the prompt
            // (not this wrapper) decides whether to ask for it.
            prompt = `## SOURCE MATERIAL ALREADY PROVIDED\n\nThis is a VIDEO LESSON: the video (and its transcript, when the tutor has one) is already specified in the prompt below — do NOT ask for a PDF or lesson text. If the video link or its transcript is genuinely missing, ask only for that. Otherwise generate the complete JSON now.\n\n${prompt}`;
        } else if (selectedType === 'mockTest' || selectedType === 'mockTestV2') {
            // NON-NEGOTIABLE: The AI must ask for source text FIRST
            // Prepend instructions specifically tailored for Mock Test & Mock Test V2
            // No personalization with user data, realistic exam tasks, simplify language to learner level but keep exam realistic
            prompt = `## NON-NEGOTIABLE FIRST STEP: REQUEST SOURCE TEXT

You MUST begin your response by asking the user: "Please send your PDF or lesson text."
Do NOT generate any exam content in your first response. You MUST wait for the user to provide their source material.

## AFTER THE USER PROVIDES THEIR TEXT:

Once the user sends their PDF or lesson text, carefully analyze it and follow these rules:

1. **Realistic, High-Fidelity Exam Generation** — Generate a realistic, professional, and accurate exam matching the official 2026 specifications of the selected exam profile. Ensure that it does NOT contain informal conversational dialogue or informal tutoring explanations inside the questions or tasks themselves.
2. **Complete Full Text** — Every reading passage, listening audio segment script, and question MUST contain complete, high-quality, fully written out text. Do NOT use any placeholders, templates, truncated responses, or empty arrays/fields.
3. **CEFR-Level Balanced Language** — Simplify the language and vocabulary used in instructions, questions, or passages to align with the learner's current CEFR language level so it is highly accessible and readable, but the overall style, format, and depth must remain realistic and faithful to a real-world examination.
4. **High-Quality Exam Tasks** — Ensure all question options, matching matrices, cloze templates, and grading criteria are substantive, accurate, and completely generated.

${prompt}`;
        } else {
            // NON-NEGOTIABLE: The AI must ask for source text FIRST
            // Prepend instructions so the AI does not generate until the user provides PDF/lesson text
            prompt = `## NON-NEGOTIABLE FIRST STEP: REQUEST SOURCE TEXT

You MUST begin your response by asking the user: "Please send your PDF or lesson text."
Do NOT generate any lesson content in your first response. You MUST wait for the user to provide their source material.

## AFTER THE USER PROVIDES THEIR TEXT:

Once the user sends their PDF or lesson text, carefully analyze it and follow these rules:

1. **Find the lesson organization** — Identify ALL sections, lessons, units, and chapters in the text. Look for patterns like "1A", "Unit 1 Lesson A", "Chapter 1", "Section 1.1", "Lesson 2", etc.
2. **Use the EXACT SAME organization** — Preserve the original lesson/section structure from the source text. Do not change, merge, or skip any sections.
3. **Cover EVERY section completely** — Every lesson, unit, or section found in the text must have its own detailed lesson content.
4. **5X CONTENT VOLUME & MAXIMUM QUALITY** — Generate 5 TIMES MORE content volume, activities, and depth than you normally would. Ensure it is a complete, deep, and fully structured lesson, not just a brief introduction or high-level overview. Do NOT talk casually or dialogically with the learner in the second person asking and answering simple things without substance.
5. **5X Answers & Feedback Content**: For every activity and question, the "comprehensiveFeedback" (or Answers & Feedback) field MUST be 5 TIMES larger, more detailed, and more substantive than standard. Provide deep grammatical explanations, common mistakes, clear translation mappings, memory mnemonics, soft skills integration, and real-world usage guides. No empty or tiny feedback strings!
6. **Simple, clear language** — Use language that is easy to understand for language learners. Explain concepts simply. Avoid complex vocabulary unless it is being taught.
7. **Comprehensive detail** — Do not be concise. Be expansive, thorough, and exhaustive. Write as much high-quality content as possible for every section.

${prompt}`;
        }

        // Append Checklist Settings
        prompt += `\n\nCRITICAL CONSTRAINTS (You MUST tailor the entire lesson to these attributes):\n`;
        prompt += `- Tone & Persona: ${tone}\n`;
        prompt += `- CEFR Difficulty Level: ${cefrLevel} — Tier ${cefrTier}/3 (Strictly adhere to vocabulary/grammar for this level & tier)\n`;
        prompt += `- Target Audience: ${targetAudience}\n`;
        if (selectedType === 'musicLesson') {
            if (musicSongTitle) prompt += `- Song name: ${musicSongTitle}\n`;
            if (musicArtist) prompt += `- Singer / band: ${musicArtist}\n`;
            if (musicMediaMode === 'local') {
                prompt += `- Media source: a LOCAL file ships inside the lesson package (${musicLocalFile?.name || 'media file'}) — keep the lesson's "mediaUrl" pointing at it.\n`;
            } else if (musicMediaLink) {
                prompt += `- Media link (audio or video — the HTML lesson player streams it): ${musicMediaLink}\n`;
            }
            if (musicLyrics) {
                prompt += `- The full lyrics are supplied below — every "subtitles[].text" must be a real line from them, in order.\n`;
            }
        } else if (details) prompt += `- Specific Details/Topic: ${details}\n`;
        else prompt += `- No specific topic provided. Base the lesson on the learner's profile (interests, goals, level) — create a well-structured general lesson that covers vocabulary, grammar, reading, speaking, and listening at their CEFR level.\n`;
        if (selectedActivities.length > 0) prompt += `- Excluded Activities (DO NOT include these): ${selectedActivities.join(', ')}\n`;
        if (selectedType === 'videoLessonInteractive' || selectedType === 'videoLesson') {
            prompt += `- MEDIA: the ONLY allowed media URL is \"metadata.videoUrl\" — set it to the video link the tutor provided (YouTube / Vimeo / Dailymotion / direct mp4). Do NOT embed images, iframes, audio or any other media inside the lesson content.\n`;
        } else {
            prompt += `- MEDIA-FREE CONTENT: This JSON contains ONLY text + interactive activities. Do NOT embed any images, GIFs, YouTube videos, iframes or media URLs anywhere inside the content. Images/GIFs/videos/audio/podcasts are curated separately afterwards by the tutor in Lesson Settings → Add Media, where each media item targets its exact lesson section.\n`;
        }

        // ── Platform output contract ───────────────────────────────────────────
        // A platform stores its own register, format, length and custom rules. They
        // were collected in the Platform UI and then ignored by every prompt, so a
        // lesson "written for" a platform came out platform-blind.
        const platformSpecs = (learner as any)?.platformSpecs;
        if (platformSpecs) {
            const fmt = platformSpecs.outputFormat === 'PlainText'
                ? 'plain text — no markdown syntax'
                : platformSpecs.outputFormat === 'HTML'
                    ? 'inline HTML inside the text fields'
                    : 'markdown inside the text fields';
            prompt += `\n\nOUTPUT CONTRACT — ${(learner as any).platformName || 'PLATFORM'} (obey this; never mention it inside the lesson):\n`;
            if (platformSpecs.register) prompt += `- Register: ${platformSpecs.register}\n`;
            prompt += `- Prose format: ${fmt}\n`;
            if (platformSpecs.tone) prompt += `- Tone: ${platformSpecs.tone}\n`;
            if (platformSpecs.emojiIntensity) prompt += `- Emoji intensity: ${platformSpecs.emojiIntensity}\n`;
            if (platformSpecs.wordCount) prompt += `- Target length: about ${platformSpecs.wordCount} words for the whole lesson\n`;
            if (platformSpecs.maxTokens) prompt += `- Output budget: about ${platformSpecs.maxTokens} tokens — fill it with substance before finishing the JSON\n`;
            if (platformSpecs.customInstructions) prompt += `- Platform rules (NON-NEGOTIABLE): ${platformSpecs.customInstructions}\n`;
            if (platformSpecs.targetAudience) prompt += `- Platform audience: ${platformSpecs.targetAudience}\n`;
            if (platformSpecs.topic) prompt += `- Platform focus: ${platformSpecs.topic}\n`;
        }

        // Append Selected Syllabus Chapters if any
        if (selectedSyllabusChapters.length > 0) {
            const syllabusCompetencies = (learner as any).syllabus?.competencies || [];
            const chaptersToIntegrate: any[] = [];
            for (const comp of syllabusCompetencies) {
                for (const ch of comp.chapters) {
                    if (selectedSyllabusChapters.includes(ch.id)) {
                        chaptersToIntegrate.push({
                            competencyName: comp.competencyName,
                            ...ch
                        });
                    }
                }
            }

            if (chaptersToIntegrate.length > 0) {
                // CEFR level guard: order chapters so content BELOW the selected ceiling
                // is presented first (preferred) and content ABOVE it comes last.
                chaptersToIntegrate.sort((a, b) => chapterGuardRank(getChapterCefrGuard(a, cefrLevel, cefrTier).relation) - chapterGuardRank(getChapterCefrGuard(b, cefrLevel, cefrTier).relation));
                const guardCounts = chaptersToIntegrate.reduce((acc: any, ch) => {
                    const rel = getChapterCefrGuard(ch, cefrLevel, cefrTier).relation;
                    acc[rel] = (acc[rel] || 0) + 1;
                    return acc;
                }, {});

                prompt += `\n\n🎯 HIGH-PRIORITY PERSONAL SYLLABUS TARGETS (INTEGRATION MANDATORY):\n`;
                prompt += `You MUST integrate and focus heavily on the following personalized chapters from the learner's syllabus to ensure sufficient repetition, deep practice, and ultimate mastery. Every activity, text, dialogue, reading, exercises, feedback, and questions generated in this lesson/activity must naturally weave in these target elements:\n`;
                prompt += `\n🛡 CEFR LEVEL GUARD ON SYLLABUS (NON-NEGOTIABLE — applies to the selected ceiling ${cefrLevel} · Tier ${cefrTier}/3):\n`;
                prompt += `- Chapters are listed in priority order: content BELOW the ceiling first, then at-ceiling, then unknown, then ABOVE the ceiling (${guardCounts.below || 0} below / ${guardCounts.allowed || 0} at level / ${guardCounts.above || 0} above).\n`;
                prompt += `- Chapters at or below the ceiling are PREFERRED — weave their vocabulary AND grammar into the lesson freely, with plenty of repetition.\n`;
                prompt += `- Chapters ABOVE the ceiling may inspire the topic, theme and VOCABULARY ONLY. Their grammar structures are FORBIDDEN in the lesson: never teach, explain, or produce them (the level guard blocks them even when a syllabus chapter names them). Rewrite any of that chapter's examples at the allowed level.\n`;
                prompt += `- When the tutor's lesson content is a syllabus chapter itself, its exact language may be reused — but never extended into new structures above the ceiling.\n`;
                chaptersToIntegrate.forEach((ch, idx) => {
                    const guard = getChapterCefrGuard(ch, cefrLevel, cefrTier);
                    const guardLabel = guard.relation === 'below'
                        ? `BELOW the ceiling (${guard.level}) — PREFERRED; use its vocabulary and grammar freely`
                        : guard.relation === 'allowed'
                            ? `at the ceiling (${guard.level} · Tier ${cefrTier}/3) — its grammar is allowed`
                            : guard.relation === 'above'
                                ? `ABOVE the ceiling (${guard.level} → ${cefrLevel} · Tier ${cefrTier}/3) — topic/vocabulary ONLY, its grammar is FORBIDDEN`
                                : `not detected — keep all language within the ceiling (${cefrLevel} · Tier ${cefrTier}/3)`;
                    prompt += `Target Chapter ${idx + 1}:\n`;
                    prompt += `- Related Competency: ${ch.competencyName}\n`;
                    prompt += `- Title/Theme: ${ch.title}\n`;
                    prompt += `- Target Vocabulary to explicitly use and practice: ${ch.vocabulary ? ch.vocabulary.join(', ') : 'None'}\n`;
                    prompt += `- Target Grammar pattern to explicitly explain and use: ${ch.grammar || 'None'}\n`;
                    prompt += `- Context/Description: ${ch.description || 'None'}\n`;
                    prompt += `- 🛡 CEFR Guard: ${guardLabel}\n`;
                });
                prompt += `\nCOHESION & FOCUS CONSTRAINTS:\n`;
                prompt += `- Write the lesson around these target themes. Do not just list them; integrate them actively into the lesson's exercises, reading comprehension passages, listening scripts, speaking prompts, and homework.\n`;
                prompt += `- Ensure the learner has enough repetitive practice on this vocabulary and grammar to master it effectively.\n`;
            }
        }
        if (readAloudVoice) prompt += `- Read Aloud Voice: Forcefully use '${readAloudVoice}' as the read aloud voice in the generated content.\n`;
        if (addL1Translation) {
            const l1Lang = (learner as any)?.l1Language || learner?.l1Language || "the learner's native language";
            prompt += `- L1 Translation: Include L1 translation (${l1Lang})`;
            const levels = ['key terms only', 'key terms + instructions', 'key terms + instructions + examples (moderate)', 'most content including explanations', 'everything including feedback and assessments'];
            prompt += ` at level ${l1TranslationAmount}/5 (${levels[l1TranslationAmount - 1] || 'moderate'}).`;
            if (l1TranslationAmount >= 5) prompt += ` Translate ALL content to ${l1Lang} including vocabulary, instructions, examples, explanations, feedback, and assessments.`;
            prompt += `\n`;
        }
        
        prompt += `\nCRITICAL: In the root of your JSON, you MUST include a "settings" object. Below is the EXACT format for it.
"settings": {
  "lessonName": "string - Choose a catchy, relevant name for the lesson based on the content",
  "lessonTimeRange": "string - Estimate the time required, e.g., '45-60 minutes'",
  "teacherNotes": "string - Notes for the teacher",
  "homeworkChecklist": "string - Bulleted checklist of homework",
  "materialLinks": "string - Relevant URLs or resources"
}\n`;
        prompt += `\nNote: The "settings" object must NOT contain lessonImages/lessonVideos/lessonMedia arrays — media is added later in Lesson Settings → Add Media.\n`;

        prompt += `\nCRITICAL JSON RULES:
Ensure your response is valid JSON without truncations. Be careful with double quotes inside strings (escape them) and missing commas.
Common errors to avoid completely:
- "Invalid JSON. Expected ',' or '}' after property value in JSON at position x" (Make sure every property value has a comma correctly).
- Trailing commas at the end of objects/arrays (not allowed in strict JSON).
- Unescaped newlines or quotes inside string values.
- **NEVER leave any "content" field empty or null.** Every activity MUST have substantive, detailed content. Blank/empty activities break the lesson renderer.
- **Do not generate placeholder text like "..." or "Your answer here" as content.** Every field must have full, complete, real content.\n`;
        
        if (['englishLesson', 'englishLessonV2', 'bilingualStudyLesson', 'explainerLesson', 'conversationalLesson', 'examPrepLesson', 'homework'].includes(selectedType)) {
            // Classmates widget rules removed for manual json creation
        }

        const hasAnnotationToolbar = ['englishLesson', 'englishLessonV2', 'bilingualStudyLesson', 'explainerLesson', 'conversationalLesson', 'homework', 'examPrepLesson'].includes(selectedType);

        if (includeAccessibility) {
            if (hasAnnotationToolbar) {
                prompt += `\nFOR CLASSROOM WIDGET PRODUCTION:\nPlease ensure the lesson does not include a splash screen as it will be embedded directly in the classroom widget.\n`;
            } else {
                prompt += `\nCRITICAL CONSTRAINTS FOR ACCESSIBILITY:\nYou MUST inject the following code snippet exactly as is into the final HTML output (preferably at the end of the body tag) so that the user receives the accessibility widget: <script src="https://accessibility-widget.pages.dev/widget.js"></script>\n`;
            }
        }

        if (useTutorInfo) {
            const savedProfile = localStorage.getItem('tutor-crafter-profile');
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                if (profile.useForPersonalization) {
                     prompt += `\n\nTUTOR CONTEXT (Use this style/persona):\nName: ${profile.name}\nTeaching Style: ${profile.teachingMethod}\nInterests: ${profile.interests}\nBio: ${profile.bio}`;
                }
            }
        }

        if (contentMultiplier > 1) {
            prompt += `\n🔥 CRITICAL CONTENT VOLUME OVERRIDE:
The user has requested ${contentMultiplier}x TIMES MORE CONTENT AND NUMBER OF ACTIVITIES. 
You MUST multiply the number of generated activities, sections, questions, and examples by ${contentMultiplier}.
Do NOT skip or summarize. Provide a truly massive, exhaustive amount of high-quality content.
X5 RULE: For every activity, section, question, example, and feedback field, generate 5 TIMES MORE content than you normally would. Each answer/feedback must be 5X longer and more detailed. Every section must have 5X more activities and examples.\n`;
        }

        if (selectedType === 'studyGuide' && podcastHosts.length > 0) {
            prompt += `\n\n🎙️ PODCAST HOSTS SPECIFICATION:
You MUST create the podcast script featuring the following hosts:
${podcastHosts.map(h => `- ${h.name} (Personality: ${h.personality}, Mood: ${h.mood}, Fact: ${h.fact}). Read aloud voice: ${h.voice}`).join('\n')}

CRITICAL: Since there are custom hosts, the "script" property in "audioOverview" MUST NOT be a single string. It MUST be an array of objects, where each object represents a single line of dialogue.
For example:
"audioOverview": {
  "title": "...",
  "script": [
     {
        "speaker": "SpeakerName",
        "voice": "VoiceName specified above",
        "text": "The dialogue text..."
     }
  ]
}
Make sure the characters are strictly followed, the dialogue reflects their personality, mood, and facts.
`;
        }

        if (selectedType === 'simulations') {
            prompt += `\n\n🎧 AUDIO LAB GUIDELINES:
- Target Genres / Formats: ${simulationGenre.join(', ')}
- Target Length per Scenario: ${simulationLength}
- Provide 'context' for each generated scenario, setting the scene.
- Provide 'discussionQuestions' (Discussion & Follow-up Questions) at the end of each scenario.
- CRITICAL MATH REQUIREMENT: For EACH selected genre, you MUST generate 3 to 5 distinct scenarios/versions. If the user selected 3 genres, you MUST generate a total of AT LEAST 9 to 15 scenarios. DO NOT output just 3 scenarios total. You must output multiple independent scenarios per genre.
- CRITICAL GENRE RIGIDITY: Forcefully apply the genre exactly. Each individual scenario must be strictly isolated to its assigned genre. Refer to the specific strict guidelines for each genre below:
  * monologue: A single speaker expressing their thoughts or addressing an audience. Strictly only 1 speaker.
  * lecture: A formal educational talk given by an instructor/professor to an audience. Typically 1 main speaker, optionally allowing for brief audience questions.
  * podcast: A classic podcast structure. Typically a host-guest format or a small panel. Includes intro, outro, and structured topic discussion.
  * dialogue: A standard two-person conversation.
  * movie dialogue: Dramatic, stylistic, and engaging dialogue characteristic of a film scene. Focus on character emotion and subtext.
  * play: A theatrical script format with stage directions (in the context) and dramatic back-and-forth between characters.
  * Discussion: An open and balanced exchange of ideas among a group of people.
  * debate: A formal, structured argument where opposing viewpoints are presented strictly by distinct speakers.
  * situational English dialogues: Practical, real-world interactions (e.g., ordering food, checking into a hotel, asking for directions).
  * Explainer: A concise and clear breakdown of a specific topic, often using simple analogies.
  * News report: A journalistic presentation of information, involving a formal news anchor or reporter.
  * Short story: A narrative format. STRICTLY 1 speaker acting as a narrator reading a story from beginning to end.
  * Classroom simulated conversation teacher providing feedback and learners ask questions: A classroom setting where learners repeatedly make language mistakes (grammar, vocab, pronunciation), ask questions, and the teacher corrects them naturally with explanations.
- If the genre involves a teacher providing feedback and learners asking questions and making grammar/vocabulary mistakes, strictly embed those errors and have the teacher correct them appropriately in the dialogue.
`;
            if (podcastHosts.length > 0) {
                prompt += `\n\n🎙️ AUDIO LAB CHARACTERS SPECIFICATION:
You MUST create the audio scripts featuring the following characters:
${podcastHosts.map(h => `- ${h.name} (Personality: ${h.personality}, Mood: ${h.mood}, Fact: ${h.fact}). Read aloud voice: ${h.voice}`).join('\n')}

Make sure the characters are strictly followed, the dialogue/monologue reflects their personality, mood, and facts.                Ensure the "characters" array in each generated scenario explicitly lists these exact names and voices.
`;
            } else {
                prompt += `\n\n🎙️ AUDIO LAB VOICE SPECIFICATION:\n- Use the read aloud voice "${globalReadAloudVoice}" for EVERY character in EVERY generated scenario, unless a different voice is explicitly listed above.\n- Use plain role names for the characters: Host, Guest, Teacher, Learner, Tourist, Guide, Narrator, Speaker 1, Speaker 2, etc.\n- NEVER name a character after a Classmate companion profile (no "Alexander Wright", "Maya Lin", "Leo Drake", "male1", "female2" or any similar profile name) and never use a profile name as a voice.\n`;
            }
        }

        if (selectedType === 'placeGame') {
            prompt = `You are an expert creator of educational language games for language learners.
Your task is to create JSON content for a "Guess the Place" game based on the following location: "${townName || 'A famous city'}".

CRITICAL GAME STRUCTURE:
- You must generate EXACTLY 5 different famous places/landmarks within that town or city.
- For EACH place, the game involves a Tourist asking questions and a Tour Guide answering them. This must be a very lengthy conversation as a virtual tour.
- You must provide at least 4 image prompts for EACH place (e.g. overview, street view, food, culture).
- The Tour guide should give extra tips and talk a lot to explain to the Tourist.
- The user must guess a hidden code! Each time they guess one of the 5 places correctly, a word from a famous quotation by a notable person from that city will be revealed in the footer.
- You must provide the final quotation and the person's name. The quotation should ideally have 5 main words or phrases corresponding to the 5 places.
- Use the format [word/phrase:A simple definition or extra info] extensively for difficult words and proper nouns to create hover tooltips in all text fields (like descriptiveText, funFacts, cultureNotes, etc).

🎙️ AUDIO VOICES SPECIFICATION:
- English Tourist voice: forcefully use "${touristVoice || 'Kore'}"
- English Tour Guide voice: forcefully use "${tourGuideVoice || 'Zephyr'}"

JSON SCHEMA DEFINITION (Your Output MUST match this exactly):
{
  "settings": {
    "lessonName": "Guess the Place: ${townName}",
    "lessonTimeRange": "30-45 minutes",
    "teacherNotes": "",
    "homeworkChecklist": "",
    "materialLinks": ""
  },
  "city": "${townName}",
  "quotation": "The full famous quotation here",
  "quotationAuthor": "Author Name",
  "places": [
    {
       "placeName": "Actual name of the landmark",
       "descriptiveText": "A massive, deep, and extremely detailed paragraph (500-600 words) describing the place without directly naming it. Use [word:definition] extensively.",
       "imagePrompts": [
          "Overview image prompt...",
          "Street view image prompt...",
          "Local food image prompt...",
          "Cultural detail image prompt..."
       ],
       "funFacts": [
          { "text": "Detailed fact 1...", "ccq": "CCQ Question?" },
          { "text": "Detailed fact 2...", "ccq": "CCQ Question?" },
          { "text": "Detailed fact 3...", "ccq": "CCQ Question?" },
          { "text": "Detailed fact 4...", "ccq": "CCQ Question?" },
          { "text": "Detailed fact 5...", "ccq": "CCQ Question?" },
          { "text": "Detailed fact 6...", "ccq": "CCQ Question?" }
       ],
       "cultureNotes": [
          { "text": "Detailed culture note 1...", "ccq": "CCQ Question?" },
          { "text": "Detailed culture note 2...", "ccq": "CCQ Question?" },
          { "text": "Detailed culture note 3...", "ccq": "CCQ Question?" },
          { "text": "Detailed culture note 4...", "ccq": "CCQ Question?" }
       ],
       "thingsToTry": [
          { "text": "Detailed try 1...", "ccq": "CCQ Question?" },
          { "text": "Detailed try 2...", "ccq": "CCQ Question?" },
          { "text": "Detailed try 3...", "ccq": "CCQ Question?" },
          { "text": "Detailed try 4...", "ccq": "CCQ Question?" }
       ],
       "thingsToAvoid": [
          { "text": "Detailed avoid 1...", "ccq": "CCQ Question?" },
          { "text": "Detailed avoid 2...", "ccq": "CCQ Question?" },
          { "text": "Detailed avoid 3...", "ccq": "CCQ Question?" },
          { "text": "Detailed avoid 4...", "ccq": "CCQ Question?" }
       ],
       "localPhrases": [
          { "category": "Greetings", "english": "Hello", "local": "Bonjour", "phonetic": "Bohn-zhoor" },
          { "category": "Basics", "english": "Please", "local": "S'il vous plaît", "phonetic": "Seel voo play" },
          { "category": "Directions", "english": "Where is...?", "local": "Où est...?", "phonetic": "Oo ay...?" },
          { "category": "Food", "english": "Delicious", "local": "Délicieux", "phonetic": "Day-lee-see-uh" }
       ],
       "audioScript": [
          { "speaker": "Tourist", "voice": "${touristVoice || 'Kore'}", "text": "Long conversational line 1..." },
          { "speaker": "Tour Guide", "voice": "${tourGuideVoice || 'Zephyr'}", "text": "Extremely detailed informative answer 1..." },
          { "speaker": "Tourist", "voice": "${touristVoice || 'Kore'}", "text": "Long conversational line 2..." },
          { "speaker": "Tour Guide", "voice": "${tourGuideVoice || 'Zephyr'}", "text": "Extremely detailed informative answer 2..." },
          { "speaker": "Tourist", "voice": "${touristVoice || 'Kore'}", "text": "Long conversational line 3..." },
          { "speaker": "Tour Guide", "voice": "${tourGuideVoice || 'Zephyr'}", "text": "Extremely detailed informative answer 3..." }
       ],
       "situationalDialogue": [
          { "speaker": "Learner", "text": "Excuse me, I'm trying to find..." },
          { "speaker": "Local", "text": "Ah yes, it is just down the street." },
          { "speaker": "Learner", "text": "Thank you. Is it very crowded today?" },
          { "speaker": "Local", "text": "Not right now, you picked a great time!" },
          { "speaker": "Learner", "text": "Perfect, I will head there now." },
          { "speaker": "Local", "text": "Enjoy your visit!" }
       ],
       "comprehensionQuestions": [
          { "question": "?", "answer": "!" },
          { "question": "?", "answer": "!" }
       ],
       "quotationWordRavel": "A word or chunk of the quotation revealed by this place"
    }
  ] // Array of EXACTLY 5 places
}

Ensure the audio scripts are very lengthy and descriptive conversations.
`;
        }
        
        if (trialLesson) {
            prompt += `\n\n🎯 TRIAL LESSON CONVERSION PSYCHOLOGY DIRECTIVES (CRITICAL):\n`;
            prompt += `- DO NOT ask the learner/tutor for any PDFs, books, external uploads or files. Instead, automatically create this lesson outline and content entirely based on the learner's existing profile info, background, hobbies, interests, and stated goals.\n`;
            prompt += `- Make this a SHORT, personalized lesson that invites the learner to book classes. Say that if they book classes, they will achieve their goals faster and have fun doing it. Include a clear CTA for choosing a tutor, booking sessions, etc.\n`;
            prompt += `- Focus heavily on live speaking exercises, engaging interactive roleplays, dynamic dialogue loops, and extremely fun, amusing language tasks.\n`;
            prompt += `- Set the level of the vocabulary and grammatical targets of this lesson to be EXACTLY 1 level easier than the learner's recorded CEFR status. (For example, if the learner's CEFR is B2, style the content strictly for an easy B1 experience). This boosts speaking fluency, immediate confidence, and eliminates performance anxiety.\n`;
            prompt += `- Integrate highly clever, fun, or engaging psychological hooks and amusing reminders promoting future speaking drills, booking further full-length lessons, or subscribing to customized study packages. These prompts must leverage positive online classroom conversion psychology (CRO), building a sense of exciting progress and an amusing, delightful motivation to continue studying with the teacher, without using dry marketing jargon or high-pressure selling.\n`;
        }

        if (personalSyllabusMode && selectedSyllabusChapters.length > 0) {
            prompt += `\n\n📚 PERSONAL SYLLABUS MODE (NO EXTERNAL SOURCE NEEDED):\n`;
            prompt += `- DO NOT ask for any PDFs, books, external uploads, lesson texts, or files. The syllabus chapters below contain all the context needed.\n`;
            prompt += `- Conduct a thorough 2026 web search on each of the following chapter topics/themes to ensure the lesson is grounded in the most current, accurate information available.\n`;
            prompt += `- Create a DEEP, SCAFFOLDED lesson covering ALL selected chapters. Structure each chapter into 3+ distinct sections (e.g. Introduction & Context, Deep Dive & Practice, Application & Extension) with thorough explanations, multiple examples, and progressive difficulty.\n`;
            prompt += `- For every chapter, provide at least 3 full sections with substantially more content: detailed explanations, multiple real-world examples, extensive practice activities, reading passages, comprehension questions, vocabulary exercises, grammar breakdowns, and speaking prompts.\n`;
            prompt += `- Make the lesson as high-quality and high-quantity as a top-tier premium course, with 3x the usual number of sections, examples, activities, and practice exercises.\n`;
            prompt += `- Include relevant real-world context, current events from 2025-2026, and practical applications for each chapter's content.\n`;
            prompt += `- Add as much personalization as possible based on the learner's profile (occupation, interests, goals, level, learning style).\n`;
            prompt += `- For each selected chapter, ensure the target vocabulary and grammar are explicitly taught, practiced, and reinforced throughout the lesson with at least 3 rounds of varied practice (controlled, guided, and free production).\n`;
            prompt += `- Each section within a chapter should include: clear learning objectives, detailed teaching points, worked examples, interactive exercises, reflection questions, and a mini summary.\n`;
            prompt += `- Do not be concise. Be expansive, thorough, and exhaustive. Write as much high-quality content as possible for each chapter.\n`;
        }
        
        // Lesson Cheat Sheet (Step 2 · Customization & Lesson Structure).
        //
        // The sheet is derived from the lesson's own content — it never invents anything — so when
        // the tutor asks for it, the JSON has to carry the content the sheet needs: a per-section
        // point list of what is actually TAUGHT. Without this the writer tends to describe its
        // activities ("a short reading, a vocabulary table and two comprehension checks"), which is
        // exactly what a revision sheet must not say.
        const CHEAT_SHEET_SECTIONED_TYPES = ['englishLesson', 'englishLessonV2', 'explainerLesson', 'examPrepLesson', 'conversationalLesson', 'bilingualStudyLesson'];
        if (lessonCheatSheet && CHEAT_SHEET_SECTIONED_TYPES.includes(selectedType)) {
            prompt += `\n\n--- 🧾 LESSON CHEAT SHEET — CREATE IT IN THE JSON (the tutor turned it ON) ---
This lesson will render a printable one-page Lesson Cheat Sheet: a content map of every section, the key words and phrases with their meanings, the grammar patterns underneath them, the pronunciation to watch, and the questions to recycle after class. For that sheet to be worth printing, your JSON must describe CONTENT, never activities:
1. In "tableOfContents", give every entry a "skills" array (from: vocabulary, grammar, listening, speaking, reading, writing, pronunciation) and a "keyPoints" array of 3-5 short statements — the actual facts, rules, distinctions and target language that section teaches ("A shared ledger means no single company owns the record of it"), never the tasks it uses ("learners read a short text").
2. Put the same "keyPoints" array on the matching object inside "sections".
3. Write each section's "summary" as what the learner will KNOW or be able to DO afterwards, and never list the activities, tasks or exercise types it contains.
4. Every key point must stand on its own: the tutor revises from the sheet alone, so never write "see the table above" or "as discussed in the text".
`;
        }

        // Same as the other lesson paths: the group mandate is part of every prompt.
        setPromptText(prompt + groupClassPromptBlock(learner));
    };

    useEffect(() => {
        generatePrompt();
    }, [selectedType, learner, useTutorInfo, includeAccessibility, addL1Translation, l1TranslationAmount, addPictures, picturesCount, youtubeVideos, youtubeVideoCount, readAloudVoice, liveLessonConfig, tone, cefrLevel, cefrTier, targetAudience, details, musicSongTitle, musicArtist, musicLyrics, musicMediaMode, musicMediaLink, musicLocalFile, selectedActivities, contentMultiplier, podcastHosts, simulationGenre, simulationLength, townName, touristVoice, tourGuideVoice, trialLesson, lessonCheatSheet, personalSyllabusMode, selectedSyllabusChapters, mockExamProfile, mockTotalDuration, mockDeliveryMode, mockProctoring, mockAccessibility, mockTaskSettings, mockExaminerEmail, avatarLessonCountHint, avatarMinInitialChoices, avatarMinTotalBranches, avatarMinEndings, avatarPreferredRegions, avatarPreferredVoices, avatarDomainConstraints, classmateCharId, classmateLessonMode, classmateInitialFriendship, classmateMultiActivity, convCharacters, convTimeAndPlace, convTopicAndPurpose, convLanguage, convLearnersInfo, convSampleDialogue]);

    useEffect(() => {
        // Auto-detect fields within the creator based on pasted JSON.
        if (!jsonInput.trim()) return;
        try {
            const parsed = JSON.parse(jsonInput);
            if (parsed.plan && (selectedType !== 'lessonPlan' && selectedType !== 'forTeachers' && selectedType !== 'lessonGuide')) {
                setSelectedType('lessonPlan');
            } else if (parsed.simulations && selectedType !== 'simulations') {
                setSelectedType('simulations');
            } else if (parsed.settings && parsed.settings.teacherNotes) {
                // Detected typical components
            }
        } catch(e) {
            // Wait for valid JSON.
        }
    }, [jsonInput, selectedType]);

    const handleCopy = () => {
        navigator.clipboard.writeText(promptText);
    };
    
    const toggleManualActivity = (activity: string) => {
        setSelectedActivities(prev => 
            prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
        );
    };

    const handleFixJson = () => {
        const fixed = fixJson(jsonInput);
        setJsonInput(fixed);
        const validation = validateJson(fixed);
        if (validation.isValid) {
            setError('');
            alert("JSON fixed and valid!");
        } else {
            setError("Attempted to fix, but still invalid: " + validation.error);
        }
    };

    const handleFixWithAi = async () => {
        if (!jsonInput.trim()) return;
        setIsFixing(true);
        setError('');
        try {
            const prompt = `
            I have a JSON string that is invalid or broken. Please fix it and return ONLY the valid JSON object. Do not add any markdown formatting or explanations.
            
            BROKEN JSON:
            ${jsonInput}
            `;
            
            const result = await generateContentWithRetry({
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            let fixedText = result.text.trim();
            // Remove markdown if present
            const match = fixedText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) fixedText = match[1];

            setJsonInput(fixedText);
            
            const validation = validateJson(fixedText);
            if (validation.isValid) {
                alert("AI successfully fixed the JSON!");
            } else {
                setError("AI attempted to fix, but result is still invalid: " + validation.error);
            }
        } catch (e) {
            console.error(e);
            setError("AI Fix Failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsFixing(false);
        }
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Helper: standard Lesson Creator save name from the current learner + file-meta row.
    const stdFileName = (lessonLabel: string, audience: LessonAudience = fileAudience) =>
        buildLessonFileName({
            learnerName: learner?.name || 'Learner',
            lessonLabel,
            book: fileBook.trim(),
            unit: fileUnit.trim(),
            audience,
        });
    // The label leads with a decorative emoji ('📖 Micro Lesson'). Strip only that leading
    // decoration — never the first whitespace-delimited word — so a label that happens to have
    // no emoji still keeps its name instead of saving a file with no lesson type in it.
    const selectedTypeLabel = (contentTypes.find(t => t.id === selectedType)?.label || selectedType)
        .replace(/^[^\p{L}\p{N}]+/u, '')
        .trim();

    const handleCheckSyntax = () => {
        if (!jsonInput.trim()) return;
        try {
            JSON.parse(jsonInput);
            setError('');
            alert("No JSON syntax errors found! The JSON is perfectly valid.");
        } catch (e: any) {
            const msg = e.message;
            const posMatch = msg.match(/position (\d+)/);
            const lineMatch = msg.match(/line (\d+)/);
            const colMatch = msg.match(/column (\d+)/);
            
            const allLines = jsonInput.split('\n');
            let lineNo = 1;
            let colNo = 1;

            if (lineMatch && colMatch) {
                lineNo = parseInt(lineMatch[1], 10);
                colNo = parseInt(colMatch[1], 10);
            } else if (posMatch) {
                const pos = parseInt(posMatch[1], 10);
                const textBefore = jsonInput.substring(0, pos);
                const linesBefore = textBefore.split('\n');
                lineNo = linesBefore.length;
                colNo = linesBefore[linesBefore.length - 1].length;
            } else {
                setError("Invalid JSON. " + msg);
                return;
            }
            
            const errorLineText = allLines[lineNo - 1] || "";
            
            const startLineIdx = Math.max(0, lineNo - 6);
            const endLineIdx = Math.min(allLines.length, lineNo + 5);
            const snippet = allLines.slice(startLineIdx, endLineIdx).join('\n');
            const snippetCharStart = allLines.slice(0, startLineIdx).join('\n').length + (startLineIdx > 0 ? 1 : 0);
            const snippetCharEnd = snippetCharStart + snippet.length;

            setSyntaxErrorContext({
                lineNo, colNo, snippet,
                startIndex: snippetCharStart, 
                endIndex: snippetCharEnd,
                message: msg
            });

            setError(
                <div className="space-y-2 text-left max-w-full w-full min-w-0">
                    <div className="font-bold text-red-600">Error on line {lineNo}, column {colNo}:</div>
                    <div className="bg-gray-800 text-red-400 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto text-xs whitespace-pre-wrap break-all font-mono relative max-w-full w-full">
                        <div className="break-all whitespace-pre-wrap">{errorLineText}</div>
                        <div className="text-yellow-400 font-bold" style={{ paddingLeft: `${colNo > 0 ? colNo - 1 : 0}ch` }}>^</div>
                    </div>
                    <div className="text-sm text-gray-800">
                        <span className="font-bold">Message:</span> {msg}
                    </div>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm font-medium text-gray-700">
                        <li>Check if you missed a comma <span className="bg-gray-200 px-1 rounded">,</span> on the previous line.</li>
                        <li>Check if you forgot to escape a double quote <span className="bg-gray-200 px-1 rounded">\"</span> inside a string.</li>
                        <li>Check if you have an extra comma before a closing <span className="bg-gray-200 px-1 rounded">{"}"}</span> or <span className="bg-gray-200 px-1 rounded">{"]"}</span>.</li>
                    </ul>
                </div>
            );

            if (textareaRef.current) {
                const lineStartIndex = allLines.slice(0, lineNo - 1).join('\n').length + (lineNo > 1 ? 1 : 0);
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(lineStartIndex + colNo - 1, lineStartIndex + colNo);
                textareaRef.current.scrollTop = (lineNo - 1) * 20; // estimation
            }
        }
    };

    const handleRender = async (overrideJson?: string) => {
        try {
            setError('');
            if (learner) {
                learner.readAloudVoice = readAloudVoice;
                learner.manualGeneratorSettings = {
                    ...(learner.manualGeneratorSettings as any || {}),
                    tone, cefrLevel, targetAudience, details, selectedActivities,
                    readAloudVoice, addL1Translation, l1TranslationAmount,
                    addPictures, picturesCount, youtubeVideos, youtubeVideoCount,
                    selectedType, contentMultiplier, podcastHosts, simulationGenre,
                    simulationLength, townName, touristVoice, tourGuideVoice, trialLesson,
                    lessonCheatSheet,
                    avatarLessonCountHint, avatarMinInitialChoices, avatarMinTotalBranches,
                    avatarMinEndings, avatarPreferredRegions, avatarPreferredVoices,
                    avatarDomainConstraints
                };
            }
            
            const jsonToRender = typeof overrideJson === 'string' ? overrideJson : jsonInput;

            if (selectedType === 'conversationMaker') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                if (convCharacters && convCharacters.length > 0) {
                    if (!parsedData.characters) parsedData.characters = [];
                    convCharacters.forEach((c: any, i: number) => {
                        if (parsedData.characters[i]) {
                            if (c.voiceURI) parsedData.characters[i].voiceURI = c.voiceURI;
                            if (c.name) parsedData.characters[i].name = c.name;
                        } else {
                            parsedData.characters.push({
                                name: c.name || `Character ${i + 1}`,
                                voiceURI: c.voiceURI || ''
                            });
                        }
                    });
                }
                const activeTutor = tutorProfile || useAppStore.getState().tutorInfo;
                handleSaveConversationMakerAsHtml(parsedData, learner, activeTutor);
                return;
            }

            if (selectedType === 'placeGame') {
                if (jsonToRender.includes('<DESCRIPTIVE_TEXT>')) {
                    alert("Legacy format not supported. Use the new JSON format.");
                    return;
                }
            }

            const validation = validateJson(jsonToRender);
            if (!validation.isValid) {
                 throw new Error(validation.error);
            }
            
            const parsed = validation.parsed;

            if (!parsed.settings) parsed.settings = {};
            parsed.settings.tone = tone;
            parsed.settings.cefrLevel = cefrLevel;
            parsed.settings.targetAudience = targetAudience;
            parsed.settings.readAloudVoice = readAloudVoice;

            if (selectedType === 'interactiveLesson') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                const fileName = stdFileName('Interactive Lesson');
                const html = generateInteractiveLessonHtml(parsedData, undefined, readAloudVoice);

                // Persist to Learners/ + register in the Lessons Gallery metadata
                saveAndExportHtmlLesson({
                    alsoZip: true,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Interactive Lesson',
                    title: `🎓 Interactive Lesson: ${parsedData.title || fileName}`,
                    triggerDownload: true,
                });

                return;
            }

            if (selectedType === 'learningApp') {
                // Review App — transcript-based review game: save DIRECTLY to HTML,
                // no Saved Lesson step needed. Follows the learner_book_unit_type_audience_date convention.
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                const fileName = stdFileName('Review App');
                let html = '';
                try {
                    html = (await handleSaveLearningAppAsInteractiveHtml(parsedData, learner, true)) || '';
                } catch (err: any) {
                    console.error(err);
                    setError("Failed to build Review App HTML: " + (err instanceof Error ? err.message : String(err)));
                    return;
                }
                if (!html) { setError("Review App: the JSON did not produce HTML — check the schema (sections with activities)."); return; }
                saveAndExportHtmlLesson({
                    alsoZip: true,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Review App',
                    title: `🔁 Review App: ${parsedData.title || fileName}`,
                    triggerDownload: true,
                });
                return;
            }

            if (selectedType === 'learningAppV2') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                const fileName = stdFileName('Learning App V2');
                const html = generateLearningAppV2Html(parsedData, undefined, {
                    voiceURI: learner?.readAloudVoice || '',
                    coachVoiceURI: learner?.tutorVoice || '',
                    l1: learner?.translationLanguage || learner?.l1Language || (learner as any)?.nativeLanguage || ''
                });

                // Persist to Learners/ + register in the Lessons Gallery metadata
                saveAndExportHtmlLesson({
                    alsoZip: true,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Learning App V2',
                    title: `🎮 Learning App V2: ${parsedData.title || fileName}`,
                    triggerDownload: true,
                });

                return;
            }

            if (selectedType === 'flipbookHomework') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                const fileName = stdFileName('Flipbook Homework');
                const html = generateFlipbookHomeworkHtml(parsedData, fileName, {
                    learnerName: learner?.name || 'Learner',
                    photo: (learner as any)?.photo || null,
                });

                // Persist to Learners/ + register in the Lessons Gallery metadata
                saveAndExportHtmlLesson({
                    alsoZip: true,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Flipbook Homework',
                    title: `📖 Flipbook Homework: ${parsedData.title || fileName}`,
                    triggerDownload: true,
                });

                // Stash the live JSON so the Saved Lesson's "Open Live as presenter"
                // button can re-open this magazine in the React presenter (not the HTML).
                try {
                    localStorage.setItem(`tutorly-flipbook-live-${fileName}`, JSON.stringify(parsedData));
                    const photo = (learner as any)?.photo || '';
                    if (photo) localStorage.setItem(`tutorly-flipbook-photo-${fileName}`, photo);
                } catch (e) {
                    console.warn('Failed to stash flipbook live JSON:', e);
                }

                return;
            }

            if (selectedType === 'gamifiedChallenge') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                // Accept either a bare theme ({days:[...]}) or a wrapped {themeData}.
                const themeData = parsedData.themeData || parsedData;
                const fileName = stdFileName('Gamified Challenge');
                const html = generateGamifiedChallengeHtml(themeData, fileName, {
                    learnerName: learner?.name || 'Learner',
                    learnerPhoto: (learner as any)?.photo || null,
                });

                saveAndExportHtmlLesson({
                    alsoZip: true,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Gamified Challenge',
                    title: `🏆 Gamified Challenge: ${themeData.welcomeTitle || fileName}`,
                    triggerDownload: true,
                });

                // Stash the live JSON so the Saved Lesson's "Open Live as presenter"
                // button can re-open this challenge in the React presenter (not the HTML).
                try {
                    localStorage.setItem(`tutorly-gamified-live-${fileName}`, JSON.stringify({ themeData, learnerName: learner?.name || 'Learner' }));
                    const photo = (learner as any)?.photo || '';
                    if (photo) localStorage.setItem(`tutorly-gamified-photo-${fileName}`, photo);
                } catch (e) {
                    console.warn('Failed to stash gamified live JSON:', e);
                }

                return;
            }

            if (selectedType === 'musicLesson') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                // Accept a single PremiumLesson, an array of lessons, or a wrapped {lesson}.
                const lessonData = parsedData.lesson || parsedData;

                const isLocalMedia = musicMediaMode === 'local';
                if (isLocalMedia && !musicLocalFile) {
                    alert("This Music Lesson is set to play a LOCAL file, but no audio/video file was chosen in Step 2 → Song Details. Pick the file (or switch to “Play from a link”) and press Render Content again.");
                    return;
                }

                // The tutor's Step 2 song details always win over whatever the AI produced,
                // so the lesson, the player and the exported package stay in sync.
                if (musicSongTitle.trim()) lessonData.songTitle = musicSongTitle.trim();
                if (musicArtist.trim()) lessonData.artist = musicArtist.trim();
                if (isLocalMedia && musicLocalMediaPath) lessonData.mediaUrl = musicLocalMediaPath;
                else if (musicMediaMode === 'link' && musicMediaLink.trim()) lessonData.mediaUrl = musicMediaLink.trim();

                // When the lyrics were pasted in Step 2, keep them as the lesson's source of
                // truth so the HTML lesson's Lyric Sync Studio starts from the real lines.
                const pastedLyricLines = musicLyrics.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                if (pastedLyricLines.length > 0 && (!Array.isArray(lessonData.subtitles) || lessonData.subtitles.length === 0)) {
                    const total = Math.max(pastedLyricLines.length * 5, 60);
                    const step = total / pastedLyricLines.length;
                    lessonData.subtitles = pastedLyricLines.map((text, i) => ({
                        start: Math.round(i * step * 10) / 10,
                        end: Math.round((i + 1) * step * 10) / 10,
                        text,
                    }));
                }

                // Timings the tutor synced in a player (standalone lesson or live presenter)
                // are overlaid here, so re-rendering keeps their work instead of resetting it.
                const timingMerge = applySavedTimings(lessonData, loadSavedTimings(lessonData));
                if (timingMerge.applied) {
                    lessonData.subtitles = timingMerge.lesson.subtitles;
                    console.info(`Music Lesson: re-applied ${timingMerge.lines} synced lyric line(s) from the player.`);
                }

                const fileName = stdFileName('Music Lesson');
                const html = generateMusicLessonStandaloneHtml(lessonData, undefined, {
                    mediaPath: isLocalMedia ? musicLocalMediaPath : undefined,
                    mediaLabel: isLocalMedia ? (musicLocalFile?.name || '') : '',
                });

                // LOCAL FILE MODE: bundle the media inside the ZIP so the exported
                // lesson is a complete, self-contained package (lesson + media).
                let musicExtraFiles: { name: string; data: Blob | ArrayBuffer | string }[] = [];
                if (isLocalMedia && musicLocalFile && musicLocalMediaPath) {
                    try {
                        musicExtraFiles = [{ name: musicLocalMediaPath, data: await musicLocalFile.arrayBuffer() }];
                    } catch (e) {
                        console.warn('Music Lesson: could not read the local media file for the ZIP.', e);
                        alert("The lesson was rendered, but the media file could not be packed into the ZIP. Please re-select the file and render again.");
                    }
                }

                saveAndExportHtmlLesson({
                    alsoZip: true,
                    extraFiles: musicExtraFiles,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Music Lesson',
                    title: `🎵 Music Lesson: ${lessonData.songTitle || lessonData.title || fileName}`,
                    // Local media only exists inside the ZIP, so skip the standalone HTML download.
                    triggerDownload: !isLocalMedia,
                });

                // Stash the live JSON so the Saved Lesson's "Open Live as presenter"
                // button can re-open this lesson in the React presenter (not the HTML).
                try {
                    localStorage.setItem(`tutorly-music-live-${fileName}`, JSON.stringify({ lesson: lessonData, learnerName: learner?.name || 'Learner' }));
                } catch (e) {
                    console.warn('Failed to stash music lesson live JSON:', e);
                }

                return;
            }

            if (selectedType === 'dailyLessonInteractive') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                // Accept either a bare lesson or a wrapped {lesson}.
                const rawLesson = parsedData.lesson || parsedData;
                const lessonData = normalizeDailyLesson(rawLesson);
                const fileName = stdFileName('Daily Lesson');
                const html = generateDailyLessonHtml(lessonData, fileName, {
                    learnerName: learner?.name || 'Learner',
                    learnerAvatar: (learner as any)?.photo ? undefined : '🐱',
                });

                saveAndExportHtmlLesson({
                    alsoZip: true,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Daily Lesson',
                    title: `🐱 Daily Lesson: ${lessonData.topic || fileName}`,
                    triggerDownload: true,
                });

                // Stash the live JSON so the Saved Lesson's "Open Live as presenter"
                // button can re-open this lesson in the React presenter (not the HTML).
                try {
                    localStorage.setItem(`tutorly-daily-live-${fileName}`, JSON.stringify({ lesson: lessonData, learnerName: learner?.name || 'Learner' }));
                } catch (e) {
                    console.warn('Failed to stash daily lesson live JSON:', e);
                }

                return;
            }

            if (selectedType === 'liveLessonInteractive') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                const rawLesson = parsedData.lesson || parsedData;
                const lessonData = normalizeLiveLesson(rawLesson);
                const fileName = stdFileName('Live Lesson');
                const html = generateLiveLessonHtml(lessonData, fileName, {
                    learnerName: learner?.name || 'Learner',
                });

                saveAndExportHtmlLesson({
                    alsoZip: true,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Live Lesson',
                    title: `⚡ Live Lesson: ${lessonData.metadata?.title || fileName}`,
                    triggerDownload: true,
                });

                // Stash the live JSON so the Saved Lesson's "Open Live as presenter"
                // button can re-open this lesson in the React presenter (not the HTML).
                try {
                    localStorage.setItem(`tutorly-live-live-${fileName}`, JSON.stringify({ lesson: lessonData, learnerName: learner?.name || 'Learner' }));
                } catch (e) {
                    console.warn('Failed to stash live lesson JSON:', e);
                }

                return;
            }

            if (selectedType === 'videoLessonInteractive') {
                const validation = validateJson(jsonToRender);
                if (!validation.isValid) {
                     throw new Error(validation.error);
                }
                const parsedData = validation.parsed;
                const rawLesson = parsedData.lesson || parsedData;
                const lessonData = normalizeVideoLesson(rawLesson);
                const fileName = stdFileName('Video Lesson');
                const html = generateVideoLessonHtml(lessonData, fileName, {
                    learnerName: learner?.name || 'Learner',
                    learnerAvatar: (learner as any)?.photo ? undefined : '🎬',
                    includeVideo: true,
                });

                saveAndExportHtmlLesson({
                    alsoZip: true,
                    htmlContent: html,
                    fileName,
                    learnerName: learner?.name || 'Learner',
                    tutorName: (tutorProfile as any)?.name || 'Tutor',
                    type: 'Video Lesson',
                    title: `🎬 Video Lesson: ${lessonData.metadata?.title || fileName}`,
                    triggerDownload: true,
                });

                // Stash the live JSON so the Saved Lesson's "Open Live as presenter"
                // button can re-open this lesson in the React presenter (not the HTML).
                try {
                    localStorage.setItem(`tutorly-video-lesson-${fileName}`, JSON.stringify({ lesson: lessonData, learnerName: learner?.name || 'Learner' }));
                } catch (e) {
                    console.warn('Failed to stash video lesson live JSON:', e);
                }

                return;
            }

            if (selectedType === 'testLab') {
                 const resolvedTutor = lessonTutor ? { name: lessonTutor.name || 'Tutor', avatar: lessonTutor.avatar || '' } : undefined;
                 handleSaveTestLabAsHtml(parsed, learner, resolvedTutor);
                 return;
            }

            if (selectedType === 'partyMode') {
                 const title = parsed.gameTitle || parsed.title || "Party_Mode_Arena";
                 const filename = stdFileName('Party Mode');
                 const resolvedTutor = lessonTutor ? { name: lessonTutor.name || 'Tutor', avatar: lessonTutor.avatar || '' } : undefined;
                 handleSavePartyModeAsHtml(parsed, learner, filename, resolvedTutor);

                 if (onSaveContent) {
                     onSaveContent({
                         id: `party-${Date.now()}`,
                         title: `🎉 Party Mode: ${title}`,
                         type: 'partyMode',
                         content: parsed,
                         createdAt: new Date().toISOString()
                     });
                 }

                 setError(
                     <div className="bg-emerald-950/80 text-emerald-200 p-4 rounded-xl border border-emerald-700 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg">
                         <span className="flex items-center gap-2">
                             <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                             Party Mode Arena Standalone HTML5 package (<strong>{filename}</strong>) saved & downloaded to your device!
                         </span>
                         <button type="button" onClick={() => handleSavePartyModeAsHtml(parsed, learner, filename)} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                             <i className="fas fa-download"></i> Re-download
                         </button>
                     </div>
                 );
                 return;
            }

            if (selectedType === 'mockTest') {
                 try {
                     const examinerEmail = mockExaminerEmail?.trim() || (details.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0]);
                     const html = generateExamSimulatorHtml(parsed, {
                         documentTitle: parsed.examMetadata?.title || "Mock Test Assessment",
                         examinerEmail: examinerEmail,
                         candidateReference: learner.name || "Student",
                         accessibility: {
                             highContrast: false,
                             largeText: false,
                             reducedMotion: false,
                             captions: true,
                             extraTimeMultiplier: 1
                         }
                     });
                     const filename = stdFileName('Mock Test');
                     const blob = new Blob([html], { type: 'text/html' });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = filename;
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                     URL.revokeObjectURL(url);
                     import('../../utils/htmlZip').then(m => m.downloadZipOfHtml(html, filename)).catch(() => {});
                 } catch (err: any) {
                     let details = "";
                     if (err.issues && Array.isArray(err.issues)) {
                         details = "\n\nSpecific validation issues:\n" + err.issues.map((i: any, idx: number) => 
                             `${idx + 1}. [Path: ${i.path}] ${i.message}`
                         ).join("\n");
                     }
                     alert("Mock Test rendering failed: " + err.message + details);
                 }
                 return;
            }

            if (selectedType === 'mockTestV2') {
                 try {
                     const html = generateExamHtml(parsed, {
                         mode: 'practice',
                         includeAnswerKey: true,
                         includePracticeCoaching: true,
                         includeTelemetryDashboard: true,
                         htmlTitle: parsed.examName || "Mock Test Assessment V2",
                         candidateReference: learner.name || "Student"
                     });
                     const filename = stdFileName('Mock Test V2');
                     const blob = new Blob([html], { type: 'text/html' });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = filename;
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                     URL.revokeObjectURL(url);
                     import('../../utils/htmlZip').then(m => m.downloadZipOfHtml(html, filename)).catch(() => {});
                 } catch (err: any) {
                     let details = "";
                     if (err.issues && Array.isArray(err.issues)) {
                         details = "\n\nSpecific validation issues:\n" + err.issues.map((i: any, idx: number) => 
                             `${idx + 1}. [Path: ${i.path}] ${i.message}`
                         ).join("\n");
                     }
                     alert("Failed to generate V2 Exam Simulator HTML: " + err.message + details);
                 }
                 return;
            }

            if (selectedType === 'avatarLesson') {
                 let downloadSuccess = false;
                 const filename = stdFileName('Avatar Lesson');
                 try {
                     const html = generateStandaloneHtml(parsed);
                     const blob = new Blob([html], { type: 'text/html' });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = filename;
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                     URL.revokeObjectURL(url);
                     import('../../utils/htmlZip').then(m => m.downloadZipOfHtml(html, filename)).catch(() => {});
                     downloadSuccess = true;
                 } catch (err: any) {
                     alert("Failed to generate Avatar Lesson HTML: " + err.message);
                 }

                 if (onSaveContent) {
                     onSaveContent({
                         id: `avatar-${Date.now()}`,
                         title: `🤖 Avatar Lesson: ${parsed?.meta?.title || 'Interactive Branching'}`,
                         type: 'avatarLesson',
                         content: parsed,
                         createdAt: new Date().toISOString()
                     });
                 }

                 if (downloadSuccess) {
                     setError(
                         <div className="bg-emerald-950/80 text-emerald-200 p-4 rounded-xl border border-emerald-700 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg">
                             <span className="flex items-center gap-2">
                                 <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                                 Avatar Lesson Standalone HTML5 package (<strong>{filename}</strong>) saved & downloaded!
                             </span>
                             <button type="button" onClick={() => {
                                 try {
                                     const html = generateStandaloneHtml(parsed);
                                     const blob = new Blob([html], { type: 'text/html' });
                                     const url = URL.createObjectURL(blob);
                                     const a = document.createElement('a');
                                     a.href = url;
                                     a.download = filename;
                                     document.body.appendChild(a);
                                     a.click();
                                     document.body.removeChild(a);
                                     URL.revokeObjectURL(url);
                                     import('../../utils/htmlZip').then(m => m.downloadZipOfHtml(html, filename)).catch(() => {});
                                 } catch (e: any) {
                                     alert("Download error: " + e.message);
                                 }
                             }} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                                 <i className="fas fa-download"></i> Re-download
                             </button>
                         </div>
                     );
                 }
                 return;
            }

            if (selectedType === 'avatarLessonV2') {
                 let downloadSuccess = false;
                 const filename = stdFileName('Avatar Lesson V2');
                 try {
                     const html = generateStandaloneHtmlV2(parsed);
                     const blob = new Blob([html], { type: 'text/html' });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = filename;
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                     URL.revokeObjectURL(url);
                     import('../../utils/htmlZip').then(m => m.downloadZipOfHtml(html, filename)).catch(() => {});
                     downloadSuccess = true;
                 } catch (err: any) {
                     alert("Failed to generate Avatar Lesson V2 HTML: " + err.message);
                 }

                 if (onSaveContent) {
                     onSaveContent({
                         id: `avatar-v2-${Date.now()}`,
                         title: `🚀 Avatar Lesson V2: ${parsed?.meta?.title || '3-Act Branching'}`,
                         type: 'avatarLessonV2',
                         content: parsed,
                         createdAt: new Date().toISOString()
                     });
                 }

                 if (downloadSuccess) {
                     setError(
                         <div className="bg-emerald-950/80 text-emerald-200 p-4 rounded-xl border border-emerald-700 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg">
                             <span className="flex items-center gap-2">
                                 <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                                 Avatar Lesson V2 Standalone HTML5 package (<strong>{filename}</strong>) saved & downloaded!
                             </span>
                             <button type="button" onClick={() => {
                                 try {
                                     const html = generateStandaloneHtmlV2(parsed);
                                     const blob = new Blob([html], { type: 'text/html' });
                                     const url = URL.createObjectURL(blob);
                                     const a = document.createElement('a');
                                     a.href = url;
                                     a.download = filename;
                                     document.body.appendChild(a);
                                     a.click();
                                     document.body.removeChild(a);
                                     URL.revokeObjectURL(url);
                                     import('../../utils/htmlZip').then(m => m.downloadZipOfHtml(html, filename)).catch(() => {});
                                 } catch (e: any) {
                                     alert("Download error: " + e.message);
                                 }
                             }} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                                 <i className="fas fa-download"></i> Re-download
                             </button>
                         </div>
                     );
                 }
                 return;
            }

            if (selectedType === 'classmate') {
                let downloadSuccess = false;
                const currentChars = useAppStore.getState().characters || DEFAULT_APP_CHARACTERS;
                const char = getClassmateCharacterById(classmateCharId, currentChars);
                const filename = stdFileName(`Classmate ${char.name || 'Session'}`);
                try {
                    handleSaveClassmateAsHtml(parsed, learner, char, filename);
                    downloadSuccess = true;
                } catch (err: any) {
                    alert("Failed to generate Classmate Standalone HTML: " + err.message);
                }

                if (onSaveContent) {
                    onSaveContent({
                        id: `classmate-${Date.now()}`,
                        title: `🤝 Classmate: ${char.name} (${parsed?.meta?.title || 'Interactive Session'})`,
                        type: 'classmate',
                        content: parsed,
                        createdAt: new Date().toISOString()
                    });
                }

                if (downloadSuccess) {
                    setError(
                        <div className="bg-emerald-950/80 text-emerald-200 p-4 rounded-xl border border-emerald-700 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg">
                            <span className="flex flex-col gap-1">
                                <span className="flex items-center gap-2">
                                    <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                                    Classmate HTML5 package (<strong>{filename}</strong>) saved &amp; downloaded!
                                </span>
                                <span className="text-[11px] font-medium text-emerald-300/90">
                                    Paste it into your lesson: <strong>Annotations toolbar → Media Manager (Alt+F) → Classmate → Inject Custom HTML5 / JSON → Apply to Widget</strong>.
                                </span>
                            </span>
                            <span className="flex items-center gap-2 flex-wrap">
                                <button type="button" onClick={async () => {
                                    try {
                                        const ok = await copyClassmateHtml5(parsed, char, learner);
                                        alert(ok
                                            ? "Classmate HTML5 copied! Open Annotations toolbar → Media Manager → Classmate → Inject Custom HTML5 / JSON and paste it, then click Apply to Widget."
                                            : "Clipboard blocked by the browser — use Re-download and open the .html file instead.");
                                    } catch (e: any) {
                                        alert("Copy error: " + e.message);
                                    }
                                }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                                    <i className="fas fa-clipboard-check"></i> Copy HTML5 for Classmate tool
                                </button>
                                <button type="button" onClick={() => {
                                    try {
                                        handleSaveClassmateAsHtml(parsed, learner, char, filename);
                                    } catch (e: any) {
                                        alert("Download error: " + e.message);
                                    }
                                }} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                                    <i className="fas fa-download"></i> Re-download
                                </button>
                            </span>
                        </div>
                    );
                }
                return;
            }

            // Teacher Tools: lessonPlan, forTeachers, lessonGuide
            if (selectedType === 'lessonPlan' || selectedType === 'forTeachers' || selectedType === 'lessonGuide') {
                 let planHtml = '';
                 if (typeof parsed === 'string') {
                     planHtml = parsed;
                 } else if (parsed && typeof parsed === 'object') {
                     planHtml = parsed.plan || parsed.html || parsed.content || parsed.lessonPlan || parsed.guide || parsed.text || JSON.stringify(parsed, null, 2);
                 } else {
                     planHtml = String(parsed || '');
                 }

                 const docTitle = parsed?.title || (selectedType === 'forTeachers' ? 'Teacher Guide' : selectedType === 'lessonGuide' ? 'Lesson Guide' : 'Lesson Plan');
                 const filename = stdFileName(docTitle);

                 saveLessonPlanAsHtml(planHtml, learner, docTitle);

                 if (onSaveContent) {
                     onSaveContent({
                         id: `tp-${Date.now()}`,
                         title: `📋 ${docTitle}`,
                         type: selectedType,
                         content: parsed,
                         createdAt: new Date().toISOString()
                     });
                 }

                 setError(
                     <div className="bg-emerald-950/80 text-emerald-200 p-4 rounded-xl border border-emerald-700 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg">
                         <span className="flex items-center gap-2">
                             <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                             {docTitle} Standalone HTML5 package (<strong>{filename}</strong>) saved & downloaded to your device!
                         </span>
                         <button type="button" onClick={() => saveLessonPlanAsHtml(planHtml, learner, docTitle)} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                             <i className="fas fa-download"></i> Re-download
                         </button>
                     </div>
                 );
                 return;
            }

            // Teacher Tools: slides
            if (selectedType === 'slides') {
                 let slidesList: any[] = [];
                 if (Array.isArray(parsed)) {
                     slidesList = parsed;
                 } else if (parsed?.slides && Array.isArray(parsed.slides)) {
                     slidesList = parsed.slides;
                 } else if (parsed && typeof parsed === 'object') {
                     slidesList = [parsed];
                 }

                 const primaryTitle = parsed?.title || slidesList[0]?.title || "Slide Presentation";
                 const filename = stdFileName('Slides');

                 handleSaveSlidesAsHtml(slidesList, learner, filename);

                 if (onSaveContent) {
                     onSaveContent({
                         id: `slides-${Date.now()}`,
                         title: `📽️ Slides: ${primaryTitle}`,
                         type: 'slides',
                         content: parsed,
                         createdAt: new Date().toISOString()
                     });
                 }

                 setError(
                     <div className="bg-emerald-950/80 text-emerald-200 p-4 rounded-xl border border-emerald-700 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg">
                         <span className="flex items-center gap-2">
                             <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                             Slide Presentation Standalone HTML5 package (<strong>{filename}</strong>) saved & downloaded to your device!
                         </span>
                         <button type="button" onClick={() => handleSaveSlidesAsHtml(slidesList, learner, filename)} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                             <i className="fas fa-download"></i> Re-download
                         </button>
                     </div>
                 );
                 return;
            }

            // Study Guide
            if (selectedType === 'studyGuide') {
                 const primaryTitle = parsed?.title || parsed?.topic || "Study Guide";
                 const filename = stdFileName('Study Guide');

                 handleSaveStudyGuideAsInteractiveHtml(parsed, learner, filename);

                 if (onSaveContent) {
                     onSaveContent({
                         id: `sg-${Date.now()}`,
                         title: `📚 Study Guide: ${primaryTitle}`,
                         type: 'studyGuide',
                         content: parsed,
                         createdAt: new Date().toISOString()
                     });
                 }

                 setError(
                     <div className="bg-emerald-950/80 text-emerald-200 p-4 rounded-xl border border-emerald-700 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg">
                         <span className="flex items-center gap-2">
                             <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                             Study Guide Standalone HTML5 package (<strong>{filename}</strong>) saved & downloaded to your device!
                         </span>
                         <button type="button" onClick={() => handleSaveStudyGuideAsInteractiveHtml(parsed, learner, filename)} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                             <i className="fas fa-download"></i> Re-download
                         </button>
                     </div>
                 );
                 return;
            }

            // Handle simulations array case (renderer expects array)
            if (selectedType === 'simulations') {
                let sims = [];
                if (Array.isArray(parsed)) {
                    sims = parsed;
                } else if (parsed.simulations && Array.isArray(parsed.simulations)) {
                    sims = parsed.simulations;
                } else if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
                    sims = parsed.scenarios;
                } else if (parsed.scenario && Array.isArray(parsed.scenario)) {
                    sims = parsed.scenario;
                } else {
                    // find any array at the root
                    const firstArrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
                    if (firstArrayKey) {
                        sims = parsed[firstArrayKey];
                    } else {
                        sims = [parsed];
                    }
                }
                
                // Map common mistakes from AI to correct schema keys
                const normalizedSims = sims.map((sim: any) => ({
                    ...sim,
                    title: sim.title || sim.name || "Simulation Scenario",
                    scenario: sim.scenario || sim.context || sim.description || "Interactive scenario details",
                    dialogue: sim.dialogue || sim.lines || sim.script || [],
                    characters: sim.characters || sim.participants || sim.speakers || [],
                }));

                // Save Audio Lab directly as standalone HTML5 file instead of opening in Saved Lessons
                const primaryTitle = normalizedSims[0]?.title || "Audio Lab Lesson";
                const filename = stdFileName('Audio Lab');

                handleSaveSimulationAsHtml(normalizedSims, learner, filename);

                if (onSaveContent) {
                    onSaveContent({
                        id: `sim-${Date.now()}`,
                        title: `🎧 Audio Lab: ${primaryTitle}`,
                        type: 'simulations',
                        content: normalizedSims,
                        createdAt: new Date().toISOString()
                    });
                }

                setError(
                    <div className="bg-emerald-950/80 text-emerald-200 p-4 rounded-xl border border-emerald-700 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg">
                        <span className="flex items-center gap-2">
                            <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                            Audio Lab Standalone HTML5 package (<strong>{filename}</strong>) saved & downloaded to your device!
                        </span>
                        <button type="button" onClick={() => handleSaveSimulationAsHtml(normalizedSims, learner, filename)} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                            <i className="fas fa-download"></i> Re-download
                        </button>
                    </div>
                );
                return;
            }

            // Inject Accessibility Setting
            if (includeAccessibility) {
                if (!parsed.settings) parsed.settings = {};
                parsed.settings.enableAccessibility = true;
            }

            // Lesson Cheat Sheet (Step 2) — the lesson carries the flag so the renderer creates the
            // one-page content map, and so "Render Content" on the same lesson keeps the tutor's
            // choice instead of quietly dropping it back to off.
            if (!parsed.settings) parsed.settings = {};
            parsed.settings.lessonCheatSheet = lessonCheatSheet === true;

            onContentRender(selectedType, parsed);
        } catch (e) {
            console.error(e);
            setError("Invalid JSON. " + (e instanceof Error ? e.message : String(e)));
        }
    };

    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    // Render-with-AI progress — lets the tutor see exactly which stage is running.
    const [aiStage, setAiStage] = useState<'idle' | 'calling' | 'parsing' | 'validating' | 'rendering' | 'done'>('idle');

    const AI_STAGE_LABEL: Record<string, string> = {
        calling: 'Sending the Lesson Creator prompt to the AI…',
        parsing: 'Reading the AI answer…',
        validating: 'Validating the JSON structure…',
        rendering: 'Rendering the lesson content…',
        done: '✅ Lesson rendered successfully — open Lesson Settings to continue.'
    };

    const handleRenderWithAi = async () => {
        const currentTier = useAuthStore.getState().tier;
        if (!isLessonAllowed(selectedType, currentTier)) {
            const requiredTier = LESSON_TIER_MAP[selectedType] || 'pro';
            useAuthStore.getState().openUpgradeModal(`The selected lesson format (${selectedType}) requires a ${requiredTier.toUpperCase()} account. Micro Lessons and Explainer Lessons are 100% Free!`);
            return;
        }
        if (!promptText.trim()) {
            setError('Copy AI Prompt is empty — build the lesson prompt first, then press “Render with AI”.');
            return;
        }

        setIsGeneratingAi(true);
        setAiStage('calling');
        setError('');
        try {
            const result = await generateContentWithRetry({
                contents: promptText,
                config: { responseMimeType: 'application/json' }
            });

            setAiStage('parsing');
            let generatedText = result.text.trim();
            const match = generatedText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) generatedText = match[1];

            setJsonInput(generatedText);

            setAiStage('validating');
            const validation = validateJson(generatedText);
            if (!validation.isValid) {
                // Keep the raw answer visible so the tutor can paste & fix it — but tell them why.
                setError(`AI returned invalid JSON: ${validation.error || 'structure error'}. It was pasted below — you can fix it or press “Render with AI” again.`);
                setAiStage('idle');
                return;
            }

            // Wait for state to flow, then render synchronously through the same pipeline
            // as “Render Content” so the JSON is parsed once and validated identically.
            setAiStage('rendering');
            await new Promise((r) => setTimeout(r, 80));
            await handleRender(generatedText);
            setAiStage('done');
            setTimeout(() => setAiStage((s) => (s === 'done' ? 'idle' : s)), 3500);
        } catch (e) {
            console.error(e);
            setError("AI Generation Failed: " + (e instanceof Error ? e.message : String(e)));
            setAiStage('idle');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleLoadMockData = (typeOverride?: string) => {
        const typeId = typeOverride || selectedType;
        if (typeId === 'conversationMaker') {
            const mockL1 = learner?.translationLanguage || learner?.l1Language || (learner as any)?.nativeLanguage || 'Spanish';
            const mockName = learner?.name || 'David';
            const conversationMock = {
                settings: {
                    cefrLevel: learner?.cefrLevel || 'B1-B2',
                    targetL1: mockL1,
                    topic: 'System Architecture & Microservices Discussion'
                },
                characters: [
                    {
                        code: "female1",
                        name: convCharacters[0]?.name || "Sarah",
                        tone: convCharacters[0]?.tone || "Warm & Encouraging",
                        mood: convCharacters[0]?.mood || "Helpful",
                        job: convCharacters[0]?.job || "Senior System Architect & Tutor",
                        voiceURI: convCharacters[0]?.voiceURI || globalReadAloudVoice
                    },
                    {
                        code: "male1",
                        name: convCharacters[1]?.name || mockName,
                        tone: convCharacters[1]?.tone || "Serious & Reflective",
                        mood: convCharacters[1]?.mood || "Curious",
                        job: convCharacters[1]?.job || "Software Engineer Learner",
                        voiceURI: convCharacters[1]?.voiceURI || globalReadAloudVoice
                    }
                ],
                dialogue: [
                    {
                        character: "[female1] Sarah",
                        text: `Hello ${mockName}! How are you doing today? Ready to dive into our conversational practice on microservices?`,
                        action: "😊 smiles warmly, waves hand 👋",
                        annotations: {
                            grammar: `Notice for ${mockName}: Present continuous question 'How are you doing' paired with infinitive phrase 'Ready to dive into'`,
                            glossary: `dive into = to start doing something with enthusiasm (perfect for ${mockName}'s goals)`,
                            formal: `Good day, ${mockName}. I trust you are well. Are you prepared to commence our conversational practice?`,
                            informal: `Hey ${mockName}! What's up? Ready to jump into practice?`,
                            soap_opera: `Well well well, ${mockName}! Look who finally decided to show up! Are we doing this or what?`,
                            pronunciation: `hel-LO ${mockName.toUpperCase()}! How ARE you DO-ing to-DAY? ↗`,
                            translation_l1: `[${mockL1} Translation]: ¡Hola ${mockName}! ¿Cómo estás hoy? ¿Listo para sumergirte en nuestra práctica de conversación?`
                        }
                    },
                    {
                        character: `[male1] ${mockName}`,
                        text: "Hi Sarah. Yes, I am! I wanted to discuss how we can structure our upcoming microservices project. It feels slightly overwhelming.",
                        action: "🥱 leans forward, rubbing eyes slightly, serious tone 🤨",
                        annotations: {
                            grammar: `Direct note for ${mockName}: Indirect question clause 'how we can structure' following main verb 'wanted to discuss'`,
                            glossary: "microservices = architectural style that structures an app as a collection of services",
                            formal: "Hello Sarah. Indeed I am. I wish to deliberate on the architectural framework for our upcoming microservices initiative.",
                            informal: "Hey Sarah. Yeah man, I really gotta talk about structuring this microservices thing. It's kinda crazy.",
                            soap_opera: "Sarah, listen to me closely! This whole microservices project is spinning completely out of control!",
                            pronunciation: "Hi SA-rah. Yes, I AM. I WAN-ted to dis-CUSS... ↘",
                            translation_l1: `[${mockL1} Translation]: Hola Sarah. Sí, lo estoy. Quería discutir cómo podemos estructurar nuestro próximo proyecto de microservicios. Es un poco abrumador.`
                        }
                    },
                    {
                        character: "[female1] Sarah",
                        text: "No worries at all! Let's break it down step by step. Have you decided on the API gateway design patterns yet?",
                        action: "🤗 nodding in agreement, supportive posture 🤝",
                        annotations: {
                            grammar: `For ${mockName}: Imperative suggestion 'Let's break' + Present perfect question 'Have you decided'`,
                            glossary: "break down = analyze or reduce into smaller manageable components",
                            formal: "There is no cause for concern. Let us analyze this systematically. Have you finalized the API gateway design specifications?",
                            informal: "No biggie! Let's tackle it piece by piece. You pick an API gateway pattern yet?",
                            soap_opera: `Don't panic on me now, ${mockName}! Damn it, we can figure this API gateway nightmare out together!`,
                            pronunciation: "No WOR-ries at ALL! Let's BREAK it DOWN. ↗",
                            translation_l1: `[${mockL1} Translation]: ¡No hay problema! Vamos a desglosarlo. ¿Has decidido los patrones de diseño de API gateway?`
                        }
                    },
                    {
                        character: `[male1] ${mockName}`,
                        text: "Not yet. I am still weighing the pros and cons of decentralized routing and service mesh architectures.",
                        action: "🤔 scratches head, looking thoughtful 💭",
                        annotations: {
                            grammar: `Key tip for ${mockName}: Present continuous 'am weighing' indicating an ongoing decision-making process`,
                            glossary: "weigh pros and cons = compare advantages and disadvantages",
                            formal: "Not at this juncture. I am currently evaluating the relative merits and drawbacks of decentralized routing protocols.",
                            informal: "Not yet. Still trying to figure out if decentralized routing is worth the hassle.",
                            soap_opera: "Not a chance in hell yet! I'm stuck trying to figure out this damn decentralized routing mess!",
                            pronunciation: "Not YET. I am STILL WEIGH-ing the PROS and CONS... ↘",
                            translation_l1: `[${mockL1} Translation]: Aún no. Todavía estoy sopesando los pros y los contras del enrutamiento descentralizado.`
                        }
                    }
                ],
                glossary: [
                    {
                        word: "decentralized routing",
                        definition: "A network design where routing decisions are made by individual nodes rather than a single central controller.",
                        ccq: "Is decentralized routing managed by a single central controller?",
                        ccq_answer: "No, routing decisions are distributed among individual nodes."
                    },
                    {
                        word: "service mesh",
                        definition: "A dedicated infrastructure layer for handling service-to-service communication.",
                        ccq: "Does a service mesh handle user interface rendering?",
                        ccq_answer: "No, it manages network traffic between microservices."
                    }
                ],
                questions: [
                    {
                        scenario: "David's concerns about the project architecture",
                        character: "Sarah",
                        question: "What is David's primary objective and concern regarding the microservices project?",
                        answer: "David wants to design a structured approach for the microservices project but finds it overwhelming."
                    },
                    {
                        scenario: "Architectural options",
                        character: "Sarah",
                        question: "Which architectural pattern does Sarah suggest discussing first?",
                        answer: "The API gateway design pattern."
                    }
                ],
                activities: [
                    {
                        id: "game1",
                        title: "🎯 Comprehension Challenge",
                        icon: "fa-bullseye",
                        description: "Test your understanding of the dialogue and architectural concepts",
                        items: [
                            {
                                prompt: "What is David currently evaluating for his microservices architecture?",
                                options: [
                                    "Decentralized routing and service mesh",
                                    "Monolithic database migration",
                                    "Frontend CSS frameworks"
                                ],
                                answer: 0,
                                explanation: "David explicitly stated he is weighing the pros and cons of decentralized routing.",
                                audioText: "David is evaluating decentralized routing and service mesh architectures."
                            },
                            {
                                prompt: "What advice does Sarah give to tackle the project?",
                                options: [
                                    "Rewrite the codebase from scratch",
                                    "Break it down step by step starting with API gateway patterns",
                                    "Delay the project by six months"
                                ],
                                answer: 1,
                                explanation: "Sarah reassures David and suggests breaking it down step by step.",
                                audioText: "Sarah advises breaking down the architectural decisions step by step."
                            }
                        ]
                    },
                    {
                        id: "game2",
                        title: "🧩 Vocabulary Gap Fill",
                        icon: "fa-puzzle-piece",
                        description: "Complete the key sentences with the correct terminology",
                        items: [
                            {
                                prompt: "I am still _____ the pros and cons of decentralized routing.",
                                options: ["weighing", "floating", "singing"],
                                answer: 0,
                                explanation: "'Weighing pros and cons' is an idiom meaning evaluating advantages and disadvantages.",
                                audioText: "I am still weighing the pros and cons of decentralized routing."
                            }
                        ]
                    }
                ]
            };
            setJsonInput(JSON.stringify(conversationMock, null, 2));
            setError('');
        } else if (typeId === 'classmate') {
            const currentChars = useAppStore.getState().characters || DEFAULT_APP_CHARACTERS;
            const mock = getDefaultClassmateSampleJson(classmateCharId, learner?.name || 'Learner', currentChars);
            setJsonInput(JSON.stringify(mock, null, 2));
            setError('');
        } else if (MOCK_JSON_DATA[typeId]) {
            setJsonInput(MOCK_JSON_DATA[typeId]);
            setError('');
        } else if (typeId === 'interactiveLesson') {
            setJsonInput(buildInteractiveLessonMockJson(learner));
            setError('');
        } else if (typeId === 'learningAppV2') {
            setJsonInput(buildLearningAppV2MockJson(learner));
            setError('');
        } else if (typeId === 'flipbookHomework') {
            setJsonInput(buildFlipbookHomeworkMockJson(learner));
            setError('');
        } else if (typeId === 'gamifiedChallenge') {
            setJsonInput(buildGamifiedChallengeMockJson(learner));
            setError('');
        } else if (typeId === 'musicLesson') {
            const mockJson = buildMusicLessonMockJson(learner);
            setJsonInput(mockJson);
            // Mirror the sample song into the Step 2 · Song Details fields so the tutor
            // can see/edit the real inputs that build the lesson and its player.
            try {
                const parsedMock = JSON.parse(mockJson);
                const mockLesson = parsedMock.lesson || parsedMock;
                if (mockLesson.songTitle && !musicSongTitle) setMusicSongTitle(mockLesson.songTitle);
                if (mockLesson.artist && !musicArtist) setMusicArtist(mockLesson.artist);
                if (mockLesson.mediaUrl && !musicMediaLink) setMusicMediaLink(mockLesson.mediaUrl);
                if (!musicLyrics && Array.isArray(mockLesson.subtitles) && mockLesson.subtitles.length > 0) {
                    setMusicLyrics(mockLesson.subtitles.map((sub: any) => sub?.text || '').filter(Boolean).join('\n'));
                }
            } catch (e) { /* the JSON is shown below even if the prefill fails */ }
            setError('');
        } else if (typeId === 'dailyLessonInteractive') {
            setJsonInput(buildDailyLessonMockJson(learner));
            setError('');
        } else if (typeId === 'liveLessonInteractive') {
            setJsonInput(buildLiveLessonMockJson(learner));
            setError('');
        } else if (typeId === 'videoLessonInteractive') {
            setJsonInput(buildVideoLessonMockJson(learner));
            setError('');
        } else {
            alert(`No mock data available for type: ${typeId}`);
        }
    };

    const toggleActivity = (id: string) => {
        setLiveLessonConfig(prev => {
            const exists = prev.activities.includes(id);
            return {
                ...prev,
                activities: exists 
                    ? prev.activities.filter(a => a !== id)
                    : [...prev.activities, id]
            };
        });
    };

    return (
        <div className="space-y-6">
            {/* Fixed hover popover: which grammar the AI is allowed to use (CEFR dictionary) */}
            {grammarPopover && (() => {
                const popMaxH = Math.min(window.innerHeight * 0.7, 560);
                return (
                <div
                    className="fixed z-[9999] w-[26rem] max-w-[92vw] bg-white border border-gray-200 rounded-xl shadow-2xl p-4 flex flex-col"
                    style={{
                        left: Math.min(grammarPopover.left, Math.max(8, window.innerWidth - 432)),
                        top: Math.min(grammarPopover.top, Math.max(8, window.innerHeight - popMaxH - 8)),
                        maxHeight: popMaxH,
                    }}
                    onMouseEnter={() => setGrammarPopover(grammarPopover)}
                    onMouseLeave={() => setGrammarPopover(null)}
                >
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 shrink-0">
                        <i className="fas fa-book-open text-emerald-600 mr-1"></i>
                        Allowed Grammar — {cefrLevel} · Tier {cefrTier}/3 (cumulative: this tier + everything before it)
                    </p>
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar text-[11px] leading-relaxed space-y-2 pr-1">
                        {getCumulativeCefrTopics(cefrLevel, cefrTier).map(r => (
                            <div key={r.level}>
                                <p className="font-black text-indigo-700">
                                    {r.level}{r.isSelectedTier ? ` · through Tier ${r.tier}` : ' · all tiers'} <span className="text-gray-400 font-bold">({r.topics.length})</span>
                                </p>
                                <p className="text-gray-600">{r.topics.join(' · ')}</p>
                            </div>
                        ))}
                    </div>
                </div>
                );
            })()}
            {/*
             * The Step 1 guide card: what this format contains, who it is for, and how to teach it.
             * Anchored to the tile the tutor rested on (or to the tile's ⓘ badge), closed by Escape,
             * a scroll, a resize or a click on another tile.
             */}
            {typeGuide && (() => {
                const guide = lessonTypeGuideFor(typeGuide.id);
                const meta = contentTypes.find(t => t.id === typeGuide.id);
                const width = Math.min(window.innerWidth * 0.92, 420);
                const maxH = Math.min(window.innerHeight * 0.75, 620);
                const section = (icon: string, heading: string, items: string[]) => (
                    <div key={heading}>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            <span className="mr-1">{icon}</span>{heading}
                        </p>
                        <ul className="mt-1.5 space-y-1">
                            {items.map((item) => (
                                <li key={item} className="flex gap-1.5 text-[11px] leading-relaxed text-slate-700">
                                    <span className="text-indigo-400 shrink-0">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
                return (
                    <div
                        className="fixed z-[9999] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ left: typeGuide.left, top: typeGuide.top, width, maxHeight: maxH }}
                        onMouseLeave={() => setTypeGuide(null)}
                        role="dialog"
                        aria-label={`${meta?.label || typeGuide.id} — structure, audience and how to teach it`}
                    >
                        <div className="flex items-start gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-slate-800 truncate">{meta?.label || typeGuide.id}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    {meta?.category}{meta?.rarity ? ` · ${meta.rarity}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTypeGuide(null)}
                                aria-label="Close the format guide"
                                className="shrink-0 w-6 h-6 grid place-items-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-white"
                            >
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>
                        <div className="px-4 py-3 space-y-3 overflow-y-auto custom-scrollbar">
                            <p className="text-xs leading-relaxed text-slate-700 font-semibold">{guide.what}</p>
                            {section('🧱', 'Lesson structure', guide.structure)}
                            {section('🎯', 'Target audience', guide.audience)}
                            {section('🍎', 'How to teach it', guide.teaching)}
                        </div>
                        <p className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500">
                            Rest on a format for 5 seconds, or hover its ⓘ badge, to see this card again · Esc closes it
                        </p>
                    </div>
                );
            })()}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
                <h3 className="text-xl font-bold text-indigo-800 mb-2">Lesson Creator</h3>
                
                <style>{`
                    @keyframes shine-sweep {
                        0% { transform: translateX(-150%) skewX(-15deg); }
                        100% { transform: translateX(250%) skewX(-15deg); }
                    }
                    .animate-shine-sweep {
                        animation: shine-sweep 3s infinite linear;
                    }
                `}</style>
                <GeneratorSection title="Step 1 · Select Content Type" subtitle="Choose the lesson format you want to build" icon="fa-th-large" defaultOpen>
                <div id="manual-tour-select-content-type" className="mb-0">
                    <label className="font-bold block mb-3 text-gray-800">1. Select Content Type</label>
                    {/* Real-time search: lesson name, group, tier OR a skill/theme */}
                    <div className="mb-5">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="🔍 Search a lesson, a skill or a theme — speaking, conversation, general English, exams..."
                                aria-label="Search lesson types"
                                className="w-full text-sm p-2.5 pr-28 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple placeholder:text-slate-400 text-slate-800"
                            />
                            {searchTerm && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                        {filteredTypes.length} of {contentTypes.length}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        aria-label="Clear search"
                                        className="w-6 h-6 grid place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/*
                         * The themes the query matched, with the lesson types each one recommends.
                         * These chips are the tutor's fastest route to the right format when they
                         * searched a skill rather than a name.
                         */}
                        {bannerThemes.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {bannerThemes.map(cat => (
                                    <div key={cat.id} className={`rounded-xl border p-3 ${cat.chip}`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-base">{cat.emoji}</span>
                                            <span className="text-xs font-black uppercase tracking-wide">{cat.name}</span>
                                            <span className="text-[11px] font-semibold opacity-80">{cat.tagline}</span>
                                            {learnerCategory?.id === cat.id && (
                                                <span className="text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/70 border border-black/10">
                                                    {typeSearch.searching ? 'also this learner’s theme' : 'this learner’s theme'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-black uppercase tracking-wider">✅ Recommended</span>
                                            {cat.recommendedLessonTypeIds.map(id => {
                                                const rec = contentTypes.find(x => x.id === id);
                                                if (!rec) return null;
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isLessonAllowed(id, authTier)) {
                                                                const requiredTier = LESSON_TIER_MAP[id] || (rec.rarity === 'VIP' ? 'vip' : 'pro');
                                                                useAuthStore.getState().openUpgradeModal(`The ${rec.label} format is a ${rec.rarity.toUpperCase()} exclusive feature. Upgrade to ${requiredTier.toUpperCase()} to unlock it.`);
                                                                return;
                                                            }
                                                            setSelectedType(id);
                                                        }}
                                                        title={`Recommended for ${cat.name} — select ${rec.label}`}
                                                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border border-black/10 transition-colors ${selectedType === id ? 'bg-white ring-2 ring-black/20' : 'bg-white/80 hover:bg-white'}`}
                                                    >
                                                        {rec.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        {Array.from(new Set(filteredTypes.map(t => t.category))).map(category => (
                            <div key={category} className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{category}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {filteredTypes.filter(t => t.category === category).map(t => {
                                        const splitIndex = t.label.indexOf(' ');
                                        const emoji = splitIndex > 0 ? t.label.substring(0, splitIndex) : '📄';
                                        const text = splitIndex > 0 ? t.label.substring(splitIndex + 1) : t.label;
                                        
                                        const isAllowed = isLessonAllowed(t.id, authTier);
                                        const isSelected = selectedType === t.id && isAllowed;
                                        // Recommended for this learner's own theme, and/or for a theme the
                                        // search box matched — the two are shown with the same badge.
                                        const isCategoryRecommended = recommendedLessonTypeIds.has(t.id);
                                        const themeSources = matchedThemes.filter(cat => cat.recommendedLessonTypeIds.includes(t.id));
                                        const isThemeRecommended = themeSources.length > 0;
                                        let rarityClass = "bg-gray-100 text-gray-800";
                                        let borderClass = "border-gray-200 hover:border-gray-300";
                                        let glowClass = "";
                                        
                                        if (!isAllowed) {
                                            rarityClass = t.rarity === 'VIP' 
                                                ? "bg-gradient-to-r from-amber-500 to-pink-600 text-white font-black"
                                                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black";
                                            borderClass = "border-slate-300 bg-slate-50/80";
                                        } else if (t.rarity === 'Free') {
                                            rarityClass = "bg-emerald-500 text-white font-extrabold";
                                            borderClass = isSelected ? "border-emerald-500" : "border-emerald-200 hover:border-emerald-400";
                                            glowClass = isSelected ? "shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]";
                                        } else if (t.rarity === 'Premium') {
                                            rarityClass = "bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black";
                                            borderClass = isSelected ? "border-purple-500" : "border-purple-200 hover:border-purple-400";
                                            glowClass = isSelected ? "shadow-[0_0_20px_rgba(139,92,246,0.6)]" : "hover:shadow-[0_0_15px_rgba(139,92,246,0.4)]";
                                        } else if (t.rarity === 'VIP') {
                                            rarityClass = "bg-gradient-to-r from-amber-500 via-purple-600 to-pink-600 text-white font-black";
                                            borderClass = isSelected ? "border-amber-500" : "border-amber-200 hover:border-amber-400";
                                            glowClass = isSelected ? "shadow-[0_0_20px_rgba(245,158,11,0.6)]" : "hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]";
                                        } else {
                                            rarityClass = "bg-slate-200 text-slate-700";
                                            borderClass = isSelected ? "border-slate-400" : "border-slate-200 hover:border-slate-300";
                                            glowClass = isSelected ? "shadow-[0_0_15px_rgba(148,163,184,0.4)]" : "";
                                        }
                                        
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    clearTypeGuideTimer();
                                                    setTypeGuide(null);
                                                    if (!isAllowed) {
                                                        const requiredTier = LESSON_TIER_MAP[t.id] || (t.rarity === 'VIP' ? 'vip' : 'pro');
                                                        useAuthStore.getState().openUpgradeModal(`The ${text} format is a ${t.rarity.toUpperCase()} exclusive feature. Upgrade to ${requiredTier.toUpperCase()} to unlock it.`);
                                                        return;
                                                    }
                                                    setSelectedType(t.id);
                                                }}
                                                /* Resting on a format for five seconds opens its guide card. */
                                                onMouseEnter={(e) => scheduleTypeGuide(t.id, e.currentTarget)}
                                                onMouseLeave={clearTypeGuideTimer}
                                                className={`relative overflow-hidden p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all duration-300 transform group perspective-1000 ${
                                                    !isAllowed 
                                                        ? 'bg-slate-50/90 border-dashed border-slate-300 opacity-75 hover:opacity-100 cursor-pointer hover:border-purple-400 hover:shadow-md' 
                                                        : `bg-white ${borderClass} ${glowClass} ${isSelected ? 'scale-105 z-10' : 'hover:-translate-y-1'}`
                                                }`}
                                                title={
                                                    isCategoryRecommended
                                                        ? `✅ Recommended for ${learnerCategory?.name || 'this learner'} — ${text}`
                                                        : isThemeRecommended
                                                            ? `✅ Recommended for ${themeSources.map(c => c.name).join(' & ')} — ${text}`
                                                            : (!isAllowed ? `🔒 Locked (${t.rarity} feature - Click to upgrade)` : text)
                                                }
                                            >
                                                {/* Recommended badge — for this learner's theme, or for a searched theme */}
                                                {(isCategoryRecommended || isThemeRecommended) && (
                                                    <div className="absolute top-0 left-0 px-2 py-0.5 text-[10px] font-black uppercase rounded-br-lg flex items-center gap-1 bg-emerald-500 text-white shadow-sm">
                                                        ✅ Recommended
                                                        {!isCategoryRecommended && themeSources[0] && (
                                                            <span title={themeSources.map(c => c.name).join(' & ')}>{themeSources[0].emoji}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Rariry / Lock Badge */}
                                                <div className={`absolute top-0 right-0 px-2 py-0.5 text-[10px] font-black uppercase rounded-bl-lg flex items-center gap-1 ${rarityClass}`}>
                                                    {!isAllowed && <i className="fas fa-lock text-[8px]"></i>}
                                                    {t.rarity}
                                                </div>
                                                
                                                <div className={`text-4xl mb-2 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-6 ${isSelected ? 'scale-110 drop-shadow-md' : ''} ${!isAllowed ? 'filter grayscale-[40%]' : ''}`}>
                                                    {emoji}
                                                </div>
                                                <span className={`text-xs font-bold leading-tight z-10 ${
                                                    !isAllowed ? 'text-gray-500' : isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700'
                                                }`}>
                                                    {text}
                                                </span>

                                                {!isAllowed && (
                                                    <span className="mt-1 text-[9px] font-extrabold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                                        🔒 Locked
                                                    </span>
                                                )}
                                                
                                                {isSelected && (
                                                    <div className="absolute inset-0 border-4 border-white opacity-50 rounded-lg pointer-events-none"></div>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute top-0 bottom-0 w-[150%] bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 -translate-x-full animate-shine-sweep pointer-events-none"></div>
                                                )}

                                                {/*
                                                 * Instant version of the same card: hover (or tap) the badge to read the
                                                 * format's structure, audience and teaching notes without waiting.
                                                 */}
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`About the ${text} format: structure, audience and how to teach it`}
                                                    title="Structure, target audience and how to teach this format"
                                                    onMouseEnter={(e) => openTypeGuide(t.id, e.currentTarget.closest('button'))}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        openTypeGuide(t.id, e.currentTarget.closest('button'));
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            openTypeGuide(t.id, e.currentTarget.closest('button'));
                                                        }
                                                    }}
                                                    className="absolute bottom-1 left-1 z-20 w-5 h-5 grid place-items-center rounded-full bg-white/90 border border-slate-200 text-[10px] font-black text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm cursor-help"
                                                >
                                                    i
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {filteredTypes.length === 0 && (
                            <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50">
                                <p className="text-sm font-bold text-slate-700">No lesson type matches “{searchTerm}”.</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Try a skill or a theme instead — speaking, listening, pronunciation, exams, travel, work…
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                </GeneratorSection>

                {/* CHECKLIST SETTINGS UI */}
                {selectedType !== 'liveLesson' && selectedType !== 'audioLesson' && (
                    <GeneratorSection title="Step 2 · Customization & Lesson Structure" subtitle="Tone, level, read-aloud voice, activities, companions & type-specific options" icon="fa-sliders-h" defaultOpen={false}>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Tone & Teaching Style</label>
                                <select value={tone} onChange={e => setTone(e.target.value)} className="w-full p-2 border rounded text-sm bg-white">
                                    <option value="Professional & Business Formal">Professional & Business Formal</option>
                                    <option value="Casual, Natural & Conversational">Casual, Natural & Conversational</option>
                                    <option value="Warm, Encouraging & Supportive">Warm, Encouraging & Supportive</option>
                                    <option value="Strict, Academic & Rigorous">Strict, Academic & Rigorous</option>
                                    <option value="Playful, Energetic & Fun">Playful, Energetic & Fun</option>
                                    <option value="Direct, Socratic & Challenge-Driven">Direct, Socratic & Challenge-Driven</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">CEFR Level & Grammar Tier</label>
                                <select value={cefrLevel} onChange={e => setCefrLevel(e.target.value)} className="w-full p-2 border rounded text-sm bg-white">
                                    {CEFR_LEVEL_ORDER.map(lvl => (
                                        <option key={lvl} value={lvl}>{CEFR_LEVEL_LABELS[lvl]}</option>
                                    ))}
                                </select>
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                    {[1, 2, 3].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setCefrTier(t)}
                                            title={`Tier ${t} — ${TIER_NAMES[t - 1]} (${getCefrTierTopics(cefrLevel, t).length} topics of ${cefrLevel})`}
                                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                                cefrTier === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                                            }`}
                                        >
                                            Tier {t}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onMouseEnter={e => {
                                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                            setGrammarPopover({ left: r.left, top: r.bottom + 6 });
                                        }}
                                        onMouseLeave={() => setGrammarPopover(null)}
                                        className="px-2 py-1 rounded-lg text-[11px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                                    >
                                        <i className="fas fa-eye mr-1"></i>Allowed Grammar ({countCumulativeCefrTopics(cefrLevel, cefrTier)})
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Target Audience</label>
                                <select value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className="w-full p-2 border rounded text-sm bg-white">
                                    <option value="Adult Professional">Adult Professional (Career & Workplace)</option>
                                    <option value="University Student">University Student (Academic & Campus)</option>
                                    <option value="Teenager">Teenager (Modern, High-Interest)</option>
                                    <option value="Child">Child (Visual, Simple & Playful)</option>
                                    <option value="General Learner">General Learner (Everyday Situational)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Read Aloud Voice</label>
                                <SearchableVoiceSelect value={readAloudVoice} onChange={setReadAloudVoice} hideCharacters />
                                {targetVoiceHint && (
                                    <p className="mt-1 text-[10px] font-semibold text-indigo-600 leading-snug">🌐 {targetVoiceHint}</p>
                                )}
                            </div>
                        </div>

                        {(selectedType === 'testLab' || selectedType === 'partyMode') && (
                            <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <label className="text-xs font-black text-indigo-950 flex items-center gap-2">
                                        <i className="fas fa-chalkboard-teacher text-indigo-500"></i>
                                        Tutor shown in this lesson
                                    </label>
                                    {lessonTutor && (
                                        <button
                                            type="button"
                                            onClick={() => setLessonTutor(null)}
                                            className="text-[10px] font-bold text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-2 py-1 bg-white"
                                        >
                                            ✕ Remove Tutor
                                        </button>
                                    )}
                                </div>

                                {!lessonTutor ? (
                                    <div className="flex gap-2 flex-wrap mt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const ti = useAppStore.getState().tutorInfo;
                                                setLessonTutor({
                                                    name: ti?.name || 'Tutor',
                                                    avatar: '', // resolved from tutor profile avatar below
                                                    _tutorInfo: true,
                                                } as any);
                                            }}
                                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition cursor-pointer"
                                        >
                                            <i className="fas fa-user-plus mr-1"></i> Add Tutor (My Profile)
                                        </button>
                                        <label className="text-xs bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-300 font-bold px-4 py-2 rounded-lg shadow-sm transition cursor-pointer">
                                            <i className="fas fa-image mr-1"></i> Add Tutor Photo + Name
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const reader = new FileReader();
                                                    reader.onload = () => {
                                                        setLessonTutor({ name: prompt('Tutor name:') || 'Tutor', avatar: String(reader.result || '') });
                                                    };
                                                    reader.readAsDataURL(file);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 mt-3 bg-white rounded-xl border border-indigo-100 p-3 flex-wrap">
                                        {lessonTutor.avatar ? (
                                            <img src={lessonTutor.avatar} alt={lessonTutor.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-300" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-lg border-2 border-indigo-300">
                                                {(lessonTutor.name || 'T').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-[180px]">
                                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Tutor Name</label>
                                            <input
                                                type="text"
                                                value={lessonTutor.name}
                                                onChange={e => setLessonTutor({ ...lessonTutor, name: e.target.value })}
                                                className="w-full p-1.5 border rounded text-sm"
                                            />
                                        </div>
                                        <label className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-3 py-2 rounded-lg cursor-pointer">
                                            <i className="fas fa-image mr-1"></i> Change Photo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const reader = new FileReader();
                                                    reader.onload = () => setLessonTutor({ ...lessonTutor, avatar: String(reader.result || '') });
                                                    reader.readAsDataURL(file);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-500 mt-2">
                                    The tutor's name and photo will be embedded in the generated lesson so their avatar always shows.
                                </p>
                            </div>
                        )}

                        <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-2.5">
                            <input 
                                type="checkbox" 
                                id="trial-lesson-checkbox"
                                checked={trialLesson} 
                                onChange={e => setTrialLesson(e.target.checked)}
                                className="w-4 h-4 text-indigo-700 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="trial-lesson-checkbox" className="text-xs font-black text-indigo-950 select-none cursor-pointer">
                                Trial lesson
                            </label>
                        </div>

                        {/* One-page Lesson Cheat Sheet — off unless the tutor asks for it. */}
                        <div className="mb-4 bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="lesson-cheat-sheet-checkbox"
                                    checked={lessonCheatSheet}
                                    onChange={e => setLessonCheatSheet(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 text-emerald-700 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="lesson-cheat-sheet-checkbox" className="select-none cursor-pointer">
                                    <span className="block text-xs font-black text-emerald-950">
                                        <i className="fas fa-scroll mr-1.5"></i> Lesson Cheat Sheet
                                    </span>
                                    <span className="block text-[11px] text-emerald-900/80 mt-0.5 leading-relaxed">
                                        Adds one printable A4 revision sheet to the lesson: a content map of every section
                                        (what it teaches, in the lesson's own words), the key words and phrases with their
                                        meanings, the grammar patterns underneath them, the pronunciation to watch and the
                                        questions to recycle after class. Off by default.
                                    </span>
                                </label>
                            </div>
                        </div>

                        {selectedType === 'musicLesson' ? (
                            <div className="mb-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <i className="fas fa-music text-fuchsia-500"></i>
                                    <h4 className="text-sm font-black text-slate-800">Song Details</h4>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">Music Lesson</span>
                                    <span className="text-[10px] text-slate-500">Replaces “Specific Details / Topic”</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Name of the song</label>
                                        <input
                                            type="text"
                                            value={musicSongTitle}
                                            onChange={e => setMusicSongTitle(e.target.value)}
                                            placeholder="e.g. Rolling in the Deep"
                                            className="w-full p-2 border rounded text-sm bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Singer / band</label>
                                        <input
                                            type="text"
                                            value={musicArtist}
                                            onChange={e => setMusicArtist(e.target.value)}
                                            placeholder="e.g. Adele"
                                            className="w-full p-2 border rounded text-sm bg-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Lyrics <span className="font-normal text-slate-500">(one line per row — used as the source text)</span></label>
                                    <textarea
                                        rows={6}
                                        value={musicLyrics}
                                        onChange={e => setMusicLyrics(e.target.value)}
                                        placeholder={"There's a fire starting in my heart\nReaching a fever pitch and it's bringing me out the dark\n…"}
                                        className="w-full p-2 border rounded text-sm font-mono bg-white"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Each row becomes a synced subtitle line. The lesson's <strong>🎯 Sync tools</strong> in the player then let you tap the exact timing of every line.
                                    </p>
                                </div>

                                {(() => {
                                    // Timings are stored per song, so they can be checked before rendering.
                                    void musicTimingTick;
                                    const saved = loadSavedTimings({ songTitle: musicSongTitle || undefined });
                                    const count = saved?.length || 0;
                                    return (
                                        <div className={`rounded-lg border p-3 text-[11px] ${count ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <i className={`fas ${count ? 'fa-circle-check text-emerald-600' : 'fa-stopwatch text-slate-400'}`}></i>
                                                {count ? (
                                                    <span>
                                                        <strong>{count} synced lyric line{count === 1 ? '' : 's'}</strong> saved from a player for “{musicSongTitle || 'this song'}” — they are applied automatically on render.
                                                    </span>
                                                ) : (
                                                    <span>
                                                        No synced timings saved yet for “{musicSongTitle || 'this song'}”. Open the lesson's <strong>🎯 Sync</strong> tools, sync the lyrics, and they will be remembered here.
                                                    </span>
                                                )}
                                                <span className="ml-auto flex items-center gap-2">
                                                    <button type="button" onClick={() => setMusicTimingTick(t => t + 1)} className="font-bold text-slate-600 hover:text-slate-900 underline decoration-dotted">
                                                        Refresh
                                                    </button>
                                                    {count > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { clearSavedTimings({ songTitle: musicSongTitle || undefined }); setMusicTimingTick(t => t + 1); }}
                                                            className="font-bold text-red-600 hover:text-red-700 underline decoration-dotted"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Video / audio source</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMusicMediaMode('link')}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${musicMediaMode === 'link' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            🔗 Play from a link
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMusicMediaMode('local')}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${musicMediaMode === 'local' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            📁 Open local file
                                        </button>
                                    </div>

                                    {musicMediaMode === 'link' ? (
                                        <div className="mt-2">
                                            <input
                                                type="text"
                                                value={musicMediaLink}
                                                onChange={e => setMusicMediaLink(e.target.value)}
                                                placeholder="https://… MP3 / MP4 / M4A / WAV link, or a YouTube link"
                                                className="w-full p-2 border rounded text-sm bg-white"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                The HTML lesson streams this link in its built-in media player (audio <em>and</em> video, including YouTube).
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-2 space-y-2">
                                            <label className="inline-flex items-center gap-2 text-xs bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-300 font-bold px-4 py-2 rounded-lg shadow-sm transition cursor-pointer">
                                                <i className="fas fa-folder-open"></i> Choose audio or video file
                                                <input
                                                    type="file"
                                                    accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.ogg,.webm,.mov,.mkv"
                                                    className="hidden"
                                                    onChange={e => setMusicLocalFile(e.target.files?.[0] || null)}
                                                />
                                            </label>
                                            {musicLocalFile ? (
                                                <div className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-lg p-2">
                                                    <i className="fas fa-file-audio text-indigo-500"></i>
                                                    <span className="font-bold text-slate-700 truncate">{musicLocalFile.name}</span>
                                                    <span className="text-slate-500">{(musicLocalFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                                                    <button type="button" onClick={() => setMusicLocalFile(null)} className="ml-auto text-red-500 hover:text-red-700">
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-slate-500">No file chosen yet.</p>
                                            )}
                                            {musicLocalFile && musicLocalFile.size > 120 * 1024 * 1024 && (
                                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                                    ⚠ This file is large ({(musicLocalFile.size / (1024 * 1024)).toFixed(0)} MB). Building the ZIP happens in the browser, so it may take a moment — an audio track keeps the package light.
                                                </p>
                                            )}
                                            <p className="text-[11px] text-slate-500">
                                                “Render Content” will export a <strong>ZIP</strong> containing the lesson HTML plus the media file it plays — the learner just unzips and opens the lesson.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Specific Details / Topic</label>
                            <input 
                                type="text" 
                                value={details} 
                                onChange={e => setDetails(e.target.value)} 
                                placeholder="e.g. Focus on Medical Vocabulary, or 'The History of Jazz'..."
                                className="w-full p-2 border rounded text-sm"
                            />
                        </div>
                        )}

                        {/* Dynamic Activities Checklist */}
                        {(ACTIVITY_TYPES as any)[selectedType] && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-600 mb-2">Exclude Activities <span className="text-red-500 font-normal">(checked = excluded from lesson)</span></label>
                                <div className="flex flex-wrap gap-2">
                                    {(ACTIVITY_TYPES as any)[selectedType].map((act: string) => (
                                        <button
                                            key={act}
                                            onClick={() => toggleManualActivity(act)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                selectedActivities.includes(act) 
                                                    ? 'bg-red-500 text-white border-red-500 line-through' 
                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {selectedActivities.includes(act) && <i className="fas fa-times mr-1"></i>}
                                            {act}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(selectedType === 'studyGuide' || selectedType === 'simulations') && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-600 mb-2">{selectedType === 'simulations' ? 'Voice Characters' : 'Podcast Hosts'}</label>
                                {podcastHosts.map((host, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 p-2 border border-gray-200 rounded-lg bg-white items-center">
                                        <input type="text" placeholder="Name" value={host.name} onChange={e => { const newHosts = [...podcastHosts]; newHosts[index].name = e.target.value; setPodcastHosts(newHosts); }} className="p-2 border rounded text-xs w-full" />
                                        <div className="col-span-1">
                                             <SearchableVoiceSelect value={host.voice} onChange={val => { const newHosts = [...podcastHosts]; newHosts[index].voice = val; setPodcastHosts(newHosts); }} defaultVoice={globalReadAloudVoice} />
                                        </div>
                                        <input type="text" placeholder="Mood" value={host.mood} onChange={e => { const newHosts = [...podcastHosts]; newHosts[index].mood = e.target.value; setPodcastHosts(newHosts); }} className="p-2 border rounded text-xs w-full" />
                                        <input type="text" placeholder="Personality" value={host.personality} onChange={e => { const newHosts = [...podcastHosts]; newHosts[index].personality = e.target.value; setPodcastHosts(newHosts); }} className="p-2 border rounded text-xs w-full" />
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Fact" value={host.fact} onChange={e => { const newHosts = [...podcastHosts]; newHosts[index].fact = e.target.value; setPodcastHosts(newHosts); }} className="p-2 border rounded text-xs w-full" />
                                            <button onClick={() => { const newHosts = [...podcastHosts]; newHosts.splice(index, 1); setPodcastHosts(newHosts); }} className="text-red-500 hover:text-red-700 p-2"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={() => setPodcastHosts([...podcastHosts, { name: '', voice: globalReadAloudVoice, mood: '', personality: '', fact: '' }])} className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 mt-2">
                                    <i className="fas fa-plus mr-1"></i> Add {selectedType === 'simulations' ? 'Character' : 'Host'}
                                </Button>
                            </div>
                        )}

                        {selectedType === 'simulations' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Audio Genres / Formats</label>
                                    <div className="grid grid-cols-2 gap-2 text-sm bg-white p-2 border rounded max-h-48 overflow-y-auto">
                                        {[
                                            'monologue', 'lecture', 'podcast', 'dialogue', 'movie dialogue', 
                                            'play', 'Discussion', 'debate', 'situational English dialogues', 
                                            'Explainer', 'News report', 'Short story', 
                                            'Classroom simulated conversation teacher providing feedback and learners ask questions'
                                        ].map(genre => (
                                            <label key={genre} className="flex items-center space-x-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={simulationGenre.includes(genre)} 
                                                    onChange={e => {
                                                        if (e.target.checked) setSimulationGenre([...simulationGenre, genre]);
                                                        else setSimulationGenre(simulationGenre.filter(g => g !== genre));
                                                    }}
                                                />
                                                <span className="truncate" title={genre}>{genre}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Length</label>
                                    <select value={simulationLength} onChange={e => setSimulationLength(e.target.value)} className="w-full p-2 border rounded text-sm bg-white">
                                        <option>short</option>
                                        <option>medium</option>
                                        <option>lengthy</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedType === 'placeGame' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Town / City Name</label>
                                    <input 
                                        type="text" 
                                        value={townName} 
                                        onChange={e => setTownName(e.target.value)} 
                                        placeholder="e.g. Paris"
                                        className="w-full p-2 border rounded text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Tourist Voice</label>
                                    <SearchableVoiceSelect value={touristVoice} onChange={setTouristVoice} defaultVoice={globalReadAloudVoice} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Tour Guide Voice</label>
                                    <SearchableVoiceSelect value={tourGuideVoice} onChange={setTourGuideVoice} defaultVoice={globalReadAloudVoice} />
                                </div>
                            </div>
                        )}

                        {(selectedType === 'mockTest' || selectedType === 'mockTestV2') && (
                            <div className="bg-slate-100/60 p-4 border border-slate-200 rounded-xl mb-4 text-gray-700">
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5 border-b pb-1.5 border-slate-200">
                                    <i className="fas fa-sliders-h text-indigo-500"></i> Detailed Mock Test Customization
                                </h4>
                                
                                {/* Section 1: Exam Type & Core Parameters */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Target Exam Profile</label>
                                        <select 
                                            value={mockExamProfile} 
                                            onChange={e => setMockExamProfile(e.target.value)}
                                            className="w-full p-2 border rounded text-sm bg-white border-gray-300"
                                        >
                                            {Object.keys(selectedType === 'mockTestV2' ? EXAM_PROFILE_V2_LABELS : EXAM_PROFILE_TASK_TYPE_MATRIX).map(key => (
                                                <option key={key} value={key}>
                                                    {selectedType === 'mockTestV2'
                                                        ? (EXAM_PROFILE_V2_LABELS[key] || key.replace(/_/g, ' ').toUpperCase())
                                                        : ((EXAM_PROFILE_LABELS as any)[key] || key.replace(/_/g, ' ').toUpperCase())}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Total Duration (Minutes)</label>
                                        <input 
                                            type="number" 
                                            min={5} 
                                            max={240} 
                                            value={mockTotalDuration} 
                                            onChange={e => setMockTotalDuration(parseInt(e.target.value) || 30)}
                                            className="w-full p-2 border rounded text-sm bg-white border-gray-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Delivery Mode</label>
                                        <select 
                                            value={mockDeliveryMode} 
                                            onChange={e => setMockDeliveryMode(e.target.value)}
                                            className="w-full p-2 border rounded text-sm bg-white border-gray-300"
                                        >
                                            <option value="digital_simulation">Digital Simulation (Interactive)</option>
                                            <option value="paper_transition">Paper Transition (Traditional)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Examiner Email (for Results)</label>
                                        <input 
                                            type="email" 
                                            placeholder="tutor@example.com"
                                            value={mockExaminerEmail} 
                                            onChange={e => setMockExaminerEmail(e.target.value)}
                                            className="w-full p-2 border rounded text-sm bg-white border-gray-300"
                                        />
                                    </div>
                                </div>

                                {/* Section 2: Proctoring & Accessibility Accordions or Toggle Bars */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-white p-3 border border-slate-200 rounded-lg">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-700 mb-2 border-b pb-1 border-slate-100 flex items-center gap-1">
                                            <i className="fas fa-shield-alt text-red-500"></i> Proctoring & Security
                                        </span>
                                        <div className="space-y-2 text-xs">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockProctoring.preventFocusLoss} 
                                                    onChange={e => setMockProctoring(prev => ({ ...prev, preventFocusLoss: e.target.checked }))}
                                                />
                                                <span>Prevent Focus Loss (Lock tab switching)</span>
                                            </label>
                                            {mockProctoring.preventFocusLoss && (
                                                <div className="pl-5 flex items-center space-x-2">
                                                    <span>Max Warnings:</span>
                                                    <input 
                                                        type="number" 
                                                        min={1} 
                                                        max={10} 
                                                        value={mockProctoring.maxFocusLossWarnings} 
                                                        onChange={e => setMockProctoring(prev => ({ ...prev, maxFocusLossWarnings: parseInt(e.target.value) || 3 }))}
                                                        className="w-16 p-1 border rounded text-xs"
                                                    />
                                                </div>
                                            )}
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockProctoring.preventClipboardActions} 
                                                    onChange={e => setMockProctoring(prev => ({ ...prev, preventClipboardActions: e.target.checked }))}
                                                />
                                                <span>Block Copy / Paste Actions</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockProctoring.preventContextMenu} 
                                                    onChange={e => setMockProctoring(prev => ({ ...prev, preventContextMenu: e.target.checked }))}
                                                />
                                                <span>Disable Right-click Menu</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockProctoring.preventProtectedSelection} 
                                                    onChange={e => setMockProctoring(prev => ({ ...prev, preventProtectedSelection: e.target.checked }))}
                                                />
                                                <span>Block Text Selection / Dragging</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockProctoring.requireHardwareChecks} 
                                                    onChange={e => setMockProctoring(prev => ({ ...prev, requireHardwareChecks: e.target.checked }))}
                                                />
                                                <span>Require Mic & Audio Device Check</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <span className="block text-xs font-bold text-slate-700 mb-2 border-b pb-1 border-slate-100 flex items-center gap-1">
                                            <i className="fas fa-universal-access text-blue-500"></i> Accessibility Supports
                                        </span>
                                        <div className="space-y-2 text-xs">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockAccessibility.highContrast} 
                                                    onChange={e => setMockAccessibility(prev => ({ ...prev, highContrast: e.target.checked }))}
                                                />
                                                <span>Enable High Contrast CSS Accent styles</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockAccessibility.largeText} 
                                                    onChange={e => setMockAccessibility(prev => ({ ...prev, largeText: e.target.checked }))}
                                                />
                                                <span>Increase Base Typography Sizing (+15%)</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockAccessibility.reducedMotion} 
                                                    onChange={e => setMockAccessibility(prev => ({ ...prev, reducedMotion: e.target.checked }))}
                                                />
                                                <span>Disable Interactive Animations & Page Sliders</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={mockAccessibility.captions} 
                                                    onChange={e => setMockAccessibility(prev => ({ ...prev, captions: e.target.checked }))}
                                                />
                                                <span>Provide Text Captions for Media / Audio Blocks</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Task-level granular configurations */}
                                <div className="mb-2">
                                    <span className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                                        <i className="fas fa-list-ol text-emerald-500"></i> Section & Task-Level Item Specification Grid
                                    </span>
                                    <div className="max-h-[350px] overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 shadow-inner">
                                        {((selectedType === 'mockTestV2' ? EXAM_PROFILE_V2_TASK_TYPE_MATRIX[mockExamProfile] : EXAM_PROFILE_TASK_TYPE_MATRIX[mockExamProfile]) || []).map(taskId => {
                                            const def = selectedType === 'mockTestV2' ? resolveExamV2TaskType(taskId) : resolveExamTaskType(taskId);
                                            const taskConf = mockTaskSettings[taskId] || {
                                                enabled: true,
                                                itemCount: 5,
                                                marks: 1,
                                                durationSeconds: 120,
                                                required: true,
                                                difficulty: 'B2',
                                                cognitiveProcess: 'understand',
                                                primarySkill: 'reading'
                                            };
                                            
                                            const handleUpdateTask = (field: string, val: any) => {
                                                setMockTaskSettings(prev => ({
                                                    ...prev,
                                                    [taskId]: {
                                                        ...taskConf,
                                                        [field]: val
                                                    }
                                                }));
                                            };

                                            return (
                                                <div key={taskId} className={`p-3 transition-colors ${taskConf.enabled ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                                        <div className="flex items-start gap-2.5 min-w-[250px]">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={taskConf.enabled} 
                                                                onChange={e => handleUpdateTask('enabled', e.target.checked)}
                                                                className="mt-1 cursor-pointer"
                                                            />
                                                            <div>
                                                                <span className="font-semibold text-xs text-slate-800 block">
                                                                    {def?.label || taskId}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                                                    {taskId} &bull; renderer: <span className="text-indigo-600">{def?.renderer || 'single_choice'}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        {taskConf.enabled && (
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 flex-1">
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Item Count</label>
                                                                    <input 
                                                                        type="number" 
                                                                        min={1} 
                                                                        max={20} 
                                                                        value={taskConf.itemCount} 
                                                                        onChange={e => handleUpdateTask('itemCount', parseInt(e.target.value) || 1)}
                                                                        className="w-full p-1 border rounded text-[11px]"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Marks / Score</label>
                                                                    <input 
                                                                        type="number" 
                                                                        min={1} 
                                                                        max={100} 
                                                                        value={taskConf.marks} 
                                                                        onChange={e => handleUpdateTask('marks', parseInt(e.target.value) || 1)}
                                                                        className="w-full p-1 border rounded text-[11px]"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Time (secs)</label>
                                                                    <input 
                                                                        type="number" 
                                                                        min={10} 
                                                                        max={3600} 
                                                                        value={taskConf.durationSeconds} 
                                                                        onChange={e => handleUpdateTask('durationSeconds', parseInt(e.target.value) || 60)}
                                                                        className="w-full p-1 border rounded text-[11px]"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Cognitive Process</label>
                                                                    <select 
                                                                        value={taskConf.cognitiveProcess} 
                                                                        onChange={e => handleUpdateTask('cognitiveProcess', e.target.value)}
                                                                        className="w-full p-1 border rounded text-[11px] bg-white"
                                                                    >
                                                                        <option value="remember">Remember</option>
                                                                        <option value="understand">Understand</option>
                                                                        <option value="apply">Apply</option>
                                                                        <option value="analyze">Analyze</option>
                                                                        <option value="evaluate">Evaluate</option>
                                                                        <option value="create">Create</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Skill Domain</label>
                                                                    <select 
                                                                        value={taskConf.primarySkill} 
                                                                        onChange={e => handleUpdateTask('primarySkill', e.target.value)}
                                                                        className="w-full p-1 border rounded text-[11px] bg-white"
                                                                    >
                                                                        <option value="reading">Reading</option>
                                                                        <option value="writing">Writing</option>
                                                                        <option value="listening">Listening</option>
                                                                        <option value="speaking">Speaking</option>
                                                                        <option value="grammar">Grammar</option>
                                                                        <option value="vocabulary">Vocabulary</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Difficulty</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={taskConf.difficulty} 
                                                                        onChange={e => handleUpdateTask('difficulty', e.target.value)}
                                                                        className="w-full p-1 border rounded text-[11px]"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-center pt-3">
                                                                    <label className="flex items-center space-x-1 cursor-pointer">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={taskConf.required} 
                                                                            onChange={e => handleUpdateTask('required', e.target.checked)}
                                                                            className="scale-90"
                                                                        />
                                                                        <span className="text-[10px] text-gray-500 font-bold">Mandatory</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {(selectedType === 'avatarLesson' || selectedType === 'avatarLessonV2') && (
                            <div className="bg-slate-100/60 p-4 border border-slate-200 rounded-xl mb-4 text-gray-700">
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5 border-b pb-1.5 border-slate-200">
                                    <i className="fas fa-robot text-indigo-500"></i> Avatar Lesson Customization
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Lesson Count Hint</label>
                                        <select 
                                            value={avatarLessonCountHint} 
                                            onChange={e => setAvatarLessonCountHint(e.target.value)}
                                            className="w-full p-2 border rounded text-sm bg-white border-gray-300"
                                        >
                                            <option value={1}>1 Lesson segment</option>
                                            <option value={2}>2 Lesson segments (Balanced)</option>
                                            <option value={3}>3 Lesson segments (In-Depth)</option>
                                            <option value={4}>4 Lesson segments (Long)</option>
                                            <option value={5}>5 Lesson segments (Exhaustive)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Min Initial Choices</label>
                                        <input 
                                            type="number" 
                                            min={2} 
                                            max={10}
                                            value={avatarMinInitialChoices} 
                                            onChange={e => setAvatarMinInitialChoices(Number(e.target.value))}
                                            className="w-full p-2 border rounded text-sm bg-white border-gray-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Min Total Branches</label>
                                        <input 
                                            type="number" 
                                            min={5} 
                                            max={100}
                                            value={avatarMinTotalBranches} 
                                            onChange={e => setAvatarMinTotalBranches(Number(e.target.value))}
                                            className="w-full p-2 border rounded text-sm bg-white border-gray-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Min Distinct Endings</label>
                                        <input 
                                            type="number" 
                                            min={1} 
                                            max={10}
                                            value={avatarMinEndings} 
                                            onChange={e => setAvatarMinEndings(Number(e.target.value))}
                                            className="w-full p-2 border rounded text-sm bg-white border-gray-300"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Preferred Accent Regions</label>
                                        <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 border rounded-lg h-40 overflow-y-auto border-gray-300">
                                            {VOICE_REGIONS.map(reg => {
                                                const isSelected = avatarPreferredRegions.includes(reg.label);
                                                return (
                                                    <label key={reg.key} className="flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected} 
                                                            onChange={() => {
                                                                if (isSelected) {
                                                                    setAvatarPreferredRegions(avatarPreferredRegions.filter(r => r !== reg.label));
                                                                } else {
                                                                    setAvatarPreferredRegions([...avatarPreferredRegions, reg.label]);
                                                                }
                                                            }}
                                                            className="scale-90"
                                                        />
                                                        <span>{reg.flag} {reg.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Preferred Voices / Characters</label>
                                        <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 border rounded-lg h-40 overflow-y-auto border-gray-300">
                                            {VOICE_PRESETS.map(v => {
                                                const isSelected = avatarPreferredVoices.includes(v.id);
                                                return (
                                                    <label key={v.id} className="flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected} 
                                                            onChange={() => {
                                                                if (isSelected) {
                                                                    setAvatarPreferredVoices(avatarPreferredVoices.filter(id => id !== v.id));
                                                                } else {
                                                                    setAvatarPreferredVoices([...avatarPreferredVoices, v.id]);
                                                                }
                                                            }}
                                                            className="scale-90"
                                                        />
                                                        <span className="truncate">{v.emoji} {v.displayName} <span className="text-gray-400">({v.id})</span></span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Domain Constraints (e.g. specific vocab or terminology constraints)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Keep chemical formulas precise, use real business English terminology..." 
                                        value={avatarDomainConstraints}
                                        onChange={e => setAvatarDomainConstraints(e.target.value)}
                                        className="w-full p-2 border rounded text-sm bg-white border-gray-300 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        )}

                        {selectedType === 'conversationMaker' && (
                             <div className="bg-slate-100/60 p-4 border border-slate-200 rounded-xl mb-4 text-gray-700 animate-fade-in">
                                 <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-1.5 border-b pb-1.5 border-slate-200">
                                     <i className="fas fa-comments text-indigo-500"></i> Conversation Maker Customization
                                 </h4>

                                 {/* Characters Section */}
                                 <div className="mb-2">
                                     <label className="block text-xs font-bold text-gray-600 mb-2">Characters (Character 1 is Learner, Character 2 is Tutor by default)</label>
                                     <div className="space-y-3">
                                         {convCharacters.map((char, index) => (
                                             <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                 <div className="flex justify-between items-center mb-2">
                                                     <span className="text-xs font-bold text-indigo-600">Character {index + 1}</span>
                                                     {convCharacters.length > 2 && (
                                                         <button 
                                                             onClick={() => setConvCharacters(convCharacters.filter((_, i) => i !== index))}
                                                             className="text-red-500 hover:text-red-700 text-xs font-bold"
                                                         >
                                                             Remove
                                                         </button>
                                                     )}
                                                 </div>
                                                 <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                                     <div>
                                                         <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Name</label>
                                                         <input 
                                                             type="text" 
                                                             value={char.name} 
                                                             onChange={e => {
                                                                 const copy = [...convCharacters];
                                                                 copy[index].name = e.target.value;
                                                                 setConvCharacters(copy);
                                                             }}
                                                             className="w-full p-1.5 border rounded text-xs"
                                                         />
                                                     </div>
                                                     <div>
                                                         <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Tone</label>
                                                         <input 
                                                             type="text" 
                                                             value={char.tone} 
                                                             onChange={e => {
                                                                 const copy = [...convCharacters];
                                                                 copy[index].tone = e.target.value;
                                                                 setConvCharacters(copy);
                                                             }}
                                                             className="w-full p-1.5 border rounded text-xs"
                                                         />
                                                     </div>
                                                     <div>
                                                         <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Mood</label>
                                                         <input 
                                                             type="text" 
                                                             value={char.mood} 
                                                             onChange={e => {
                                                                 const copy = [...convCharacters];
                                                                 copy[index].mood = e.target.value;
                                                                 setConvCharacters(copy);
                                                             }}
                                                             className="w-full p-1.5 border rounded text-xs"
                                                         />
                                                     </div>
                                                     <div>
                                                         <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Job/Role</label>
                                                         <input 
                                                             type="text" 
                                                             value={char.job} 
                                                             onChange={e => {
                                                                 const copy = [...convCharacters];
                                                                 copy[index].job = e.target.value;
                                                                 setConvCharacters(copy);
                                                             }}
                                                             className="w-full p-1.5 border rounded text-xs"
                                                         />
                                                     </div>
                                                     <div>
                                                         <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Read Aloud Voice</label>
                                                         <SearchableVoiceSelect 
                                                             value={char.voiceURI} 
                                                             onChange={val => {
                                                                 const copy = [...convCharacters];
                                                                 copy[index].voiceURI = val;
                                                                 setConvCharacters(copy);
                                                             }}
                                                             defaultVoice={globalReadAloudVoice}
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                     <button 
                                         onClick={() => setConvCharacters([...convCharacters, { name: `Character ${convCharacters.length + 1}`, tone: 'Friendly', mood: 'Neutral', job: 'Assistant', voiceURI: globalReadAloudVoice }])}
                                         className="mt-2 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold px-3 py-1.5 rounded-lg"
                                     >
                                         + Add Custom Character
                                     </button>
                                 </div>
                             </div>
                        )}

                        {selectedType === 'classmate' && (
                            <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 mb-5 shadow-lg animate-fade-in space-y-6">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl text-white shadow-lg shadow-indigo-500/20">
                                            🤝
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                Classmate AI Companion Studio
                                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                                                    VIP Feature
                                                </span>
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Select, customize, and edit your AI study companions with dedicated Microsoft Azure Natural Voices, bios, and tones.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newId = `char_${Date.now()}`;
                                                setEditingCompanion({
                                                    id: newId,
                                                    code: newId,
                                                    name: 'New Companion',
                                                    // Start from a real portrait (swap in any URL in the editor) with the
                                                    // character monogram as the offline/broken-image fallback.
                                                    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
                                                    avatarFallback: getCharacterAvatarFallback({ name: 'New Companion', gender: 'female' }),
                                                    voice: 'Microsoft Jenny Online (Natural) - English (United States)',
                                                    nationality: 'American',
                                                    gender: 'female',
                                                    role: 'Study Partner',
                                                    tone: 'Friendly & Supportive',
                                                    toneDescription: 'Warm, engaging, and highly motivating.',
                                                    personality: 'Enthusiastic and helpful learning companion.',
                                                    bio: 'An encouraging study partner dedicated to active practice.',
                                                    catchphrases: "Let's do this together, $name! ✨\nAwesome work, $name! 🌟",
                                                    initialFriendship: 40
                                                });
                                                setIsCreatingNewCompanion(true);
                                            }}
                                            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <i className="fas fa-plus"></i> + Add Companion
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm('Reset all companions to default system characters? Custom companions will be restored to defaults.')) {
                                                    setCharacters(DEFAULT_APP_CHARACTERS);
                                                }
                                            }}
                                            className="text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                                            title="Restore default character roster"
                                        >
                                            <i className="fas fa-undo"></i> Reset Defaults
                                        </button>
                                        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Selected:</span>
                                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
                                                {getClassmateCharacterById(classmateCharId, companionRoster).name}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Companions Grid */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-3 flex items-center justify-between">
                                        <span>1. Study Companions ({companionRoster.length} Unique Personalities)</span>
                                        <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 lowercase">Click to select • Click ✏️ to edit profile & voice</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                        {companionRoster.map((char) => {
                                            const charId = char.id || char.code;
                                            const isInStore = (storeCharacters || []).some(c => (c.id || c.code) === charId);
                                            const isSelected = classmateCharId === charId;
                                            const status = getFriendshipMeterStatus(char.initialFriendship || 35);
                                            const formattedVoiceName = (char.voice || '').replace('Microsoft ', '').replace(' (Natural)', '').replace(' - English', '');
                                            return (
                                                <div
                                                    key={charId}
                                                    onClick={() => {
                                                        setClassmateCharId(charId);
                                                        setClassmateInitialFriendship(char.initialFriendship || 35);
                                                    }}
                                                    className={`relative p-3.5 rounded-xl cursor-pointer transition-all duration-200 border flex flex-col justify-between select-none ${
                                                        isSelected
                                                            ? 'bg-indigo-50/90 dark:bg-gradient-to-b dark:from-indigo-950/90 dark:to-slate-900 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/50 shadow-md'
                                                            : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-md">
                                                            ✓
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2.5">
                                                            <img
                                                                src={char.avatarUrl}
                                                                alt={char.name}
                                                                className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-400/40 shadow-sm bg-white dark:bg-slate-900 flex-shrink-0"
                                                                referrerPolicy="no-referrer"
                                                                onError={(e) => {
                                                                    // Real portrait first, the character's own monogram second — never a robot cartoon.
                                                                    (e.target as HTMLImageElement).src = char.avatarFallback || getCharacterAvatarFallback(char);
                                                                }}
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">{char.name}</span>
                                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">({char.nationality})</span>
                                                                </div>
                                                                <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold truncate">
                                                                    {char.role}
                                                                </div>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            speakGlobal(`Hi there! I am ${char.name}. Ready for today's lesson?`, char.voice);
                                                                        }}
                                                                        title="Listen to voice preview"
                                                                        className="text-[9px] bg-slate-200 dark:bg-slate-700/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold transition cursor-pointer"
                                                                    >
                                                                        <i className="fas fa-volume-up text-indigo-500"></i>
                                                                        <span className="truncate max-w-[90px]">{formattedVoiceName || 'Voice'}</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-2">
                                                            {char.personality || char.bio}
                                                        </p>
                                                        {char.catchphrases && (
                                                            <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/70 p-2 rounded-lg border border-slate-200 dark:border-slate-800 italic line-clamp-2 mb-2">
                                                                &ldquo;{(Array.isArray(char.catchphrases) ? char.catchphrases[0] : char.catchphrases.split('\n')[0]).replace(/\$name/g, learner?.name || 'Friend')}&rdquo;
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[10px]">
                                                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                                                            {status.icon} {char.initialFriendship || 35}%
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // A catalog companion that this tutor has never saved has to
                                                                // exist in the store before the editor can update it.
                                                                if (!isInStore) addCharacter({ ...char });
                                                                setEditingCompanion({ ...char });
                                                                setIsCreatingNewCompanion(false);
                                                            }}
                                                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/90 border border-indigo-200 dark:border-indigo-800/70 px-2 py-0.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <i className="fas fa-pen text-[10px]"></i> Edit
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Customization Controls Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    {/* Interaction Mode */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                        <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
                                            <i className="fas fa-theater-masks"></i> 2. Interaction Mode
                                        </label>
                                        <select
                                            value={classmateLessonMode}
                                            onChange={(e) => setClassmateLessonMode(e.target.value)}
                                            className="w-full p-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                        >
                                            <option value="explainer">💡 Explainer & Concept Breakdown</option>
                                            <option value="brainstorm">🧠 Brainstorming & Ideation</option>
                                            <option value="discussion">💬 Socratic Discussion & Analysis</option>
                                            <option value="debate">⚔️ Friendly Debate & Counterpoints</option>
                                            <option value="quiz_duel">🏆 Quiz Duel & Rapid Challenge</option>
                                            <option value="roleplay">🎭 Real-world Situational Roleplay</option>
                                        </select>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                                            Determines the collaborative dynamic between the learner and their companion.
                                        </p>
                                    </div>

                                    {/* Starting Friendship Meter */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                                <i className="fas fa-heart"></i> 3. Friendship Starting Meter
                                            </label>
                                            <span className="text-xs font-black text-amber-600 dark:text-amber-300">
                                                {classmateInitialFriendship}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={classmateInitialFriendship}
                                            onChange={(e) => setClassmateInitialFriendship(parseInt(e.target.value) || 0)}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-2"
                                        />
                                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                            <span>
                                                Status: <strong className="text-slate-800 dark:text-white">{getFriendshipMeterStatus(classmateInitialFriendship).icon} {getFriendshipMeterStatus(classmateInitialFriendship).label}</strong>
                                            </span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Realistic progression (+2 to +5)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Multiplier & Sequential Activities */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="classmate-multi-activity"
                                            checked={classmateMultiActivity}
                                            onChange={(e) => setClassmateMultiActivity(e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <label htmlFor="classmate-multi-activity" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                                            🚀 5x Content Multiplier & Multi-Activity Division (Generate sequential study segments)
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
                                        <i className="fas fa-photo-video text-amber-500"></i> Includes Stickers, Dialogues, Quizzes & Challenges
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* COMPANION EDIT MODAL */}
                        {editingCompanion && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                                <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                                    {/* Modal Header */}
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                                                <i className="fas fa-user-edit"></i>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                                    {isCreatingNewCompanion ? 'Create New Study Companion' : `Edit Companion: ${editingCompanion.name}`}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    Universal Character Profile • Saved globally for all profiles in one place
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingCompanion(null);
                                                setIsCreatingNewCompanion(false);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Modal Body */}
                                    <div className="p-5 overflow-y-auto space-y-4 text-xs">
                                        {/* Avatar & Basic Info */}
                                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                            <div className="flex flex-col items-center gap-2">
                                                <img
                                                    src={editingCompanion.avatarUrl}
                                                    alt={editingCompanion.name}
                                                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md bg-white dark:bg-slate-800"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = editingCompanion.avatarFallback || getCharacterAvatarFallback(editingCompanion);
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const seed = Math.random().toString(36).substring(7);
                                                        setEditingCompanion({
                                                            ...editingCompanion,
                                                            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
                                                        });
                                                    }}
                                                    className="text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer"
                                                >
                                                    <i className="fas fa-dice"></i> Random Bot
                                                </button>
                                            </div>
                                            <div className="flex-1 w-full space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Companion Name</label>
                                                        <input
                                                            type="text"
                                                            value={editingCompanion.name}
                                                            onChange={(e) => setEditingCompanion({ ...editingCompanion, name: e.target.value })}
                                                            placeholder="e.g. Maya Lin"
                                                            className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Role / Archetype</label>
                                                        <input
                                                            type="text"
                                                            value={editingCompanion.role}
                                                            onChange={(e) => setEditingCompanion({ ...editingCompanion, role: e.target.value })}
                                                            placeholder="e.g. Encouraging Study Partner"
                                                            className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Nationality</label>
                                                        <input
                                                            type="text"
                                                            value={editingCompanion.nationality}
                                                            onChange={(e) => setEditingCompanion({ ...editingCompanion, nationality: e.target.value })}
                                                            placeholder="e.g. American, British, Australian"
                                                            className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                                                        <select
                                                            value={editingCompanion.gender || 'female'}
                                                            onChange={(e) => setEditingCompanion({ ...editingCompanion, gender: e.target.value as any })}
                                                            className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                                                        >
                                                            <option value="female">Female</option>
                                                            <option value="male">Male</option>
                                                            <option value="child">Child / Youth</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Avatar Image URL</label>
                                                    <input
                                                        type="text"
                                                        value={editingCompanion.avatarUrl}
                                                        onChange={(e) => setEditingCompanion({ ...editingCompanion, avatarUrl: e.target.value })}
                                                        placeholder="https://..."
                                                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Microsoft Azure Voice Selection with Read Aloud test */}
                                        <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                                    <i className="fas fa-microphone-alt text-indigo-600 dark:text-indigo-400"></i> Microsoft Azure Read Aloud Natural Voice
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        speakGlobal(`Hello! I'm ${editingCompanion.name}. How is your English learning coming along today?`, editingCompanion.voice);
                                                    }}
                                                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                                                >
                                                    <i className="fas fa-volume-up"></i> Test Voice
                                                </button>
                                            </div>
                                            {/* Classmate companion studio — the ONLY place where the
                                                companion voice profiles themselves stay selectable. */}
                                            <SearchableVoiceSelect
                                                value={editingCompanion.voice}
                                                onChange={(voice) => setEditingCompanion({ ...editingCompanion, voice })}
                                                allowCharacterVoices
                                            />
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                Powered by ultra-realistic Microsoft Azure Natural Voices. Selected voice is saved universally across all lesson tools.
                                            </p>
                                        </div>

                                        {/* Tone & Communication Style */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Tone Profile</label>
                                                <input
                                                    type="text"
                                                    value={editingCompanion.tone}
                                                    onChange={(e) => setEditingCompanion({ ...editingCompanion, tone: e.target.value })}
                                                    placeholder="e.g. Enthusiastic & Encouraging"
                                                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Tone Description</label>
                                                <input
                                                    type="text"
                                                    value={editingCompanion.toneDescription}
                                                    onChange={(e) => setEditingCompanion({ ...editingCompanion, toneDescription: e.target.value })}
                                                    placeholder="e.g. Warm, empathetic, uses cheerful emojis"
                                                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Personality & In-Depth Bio */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Personality & Bio</label>
                                            <textarea
                                                rows={2}
                                                value={editingCompanion.personality || editingCompanion.bio}
                                                onChange={(e) => setEditingCompanion({ ...editingCompanion, personality: e.target.value, bio: e.target.value })}
                                                placeholder="Describe the companion's backstory, study habits, motivation style..."
                                                className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                                            />
                                        </div>

                                        {/* Catchphrases / Signature Lines */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                                <span>Signature Catchphrases (One per line)</span>
                                                <span className="text-[10px] text-slate-400 font-normal">Use <code className="text-indigo-500 font-mono">$name</code> for student name</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={Array.isArray(editingCompanion.catchphrases) ? editingCompanion.catchphrases.join('\n') : (editingCompanion.catchphrases || '')}
                                                onChange={(e) => setEditingCompanion({ ...editingCompanion, catchphrases: e.target.value })}
                                                placeholder={"Let's ace this together, $name!\nAwesome progress today, $name! 🌟"}
                                                className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
                                            />
                                        </div>

                                        {/* Initial Friendship Affinity */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Default Starting Affinity</label>
                                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{editingCompanion.initialFriendship || 35}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={editingCompanion.initialFriendship || 35}
                                                onChange={(e) => setEditingCompanion({ ...editingCompanion, initialFriendship: parseInt(e.target.value) || 0 })}
                                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                                        <div>
                                            {!isCreatingNewCompanion && storeCharacters.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm(`Delete companion "${editingCompanion.name}"?`)) {
                                                            deleteCharacter(editingCompanion.id || editingCompanion.code);
                                                            setEditingCompanion(null);
                                                            if (classmateCharId === (editingCompanion.id || editingCompanion.code)) {
                                                                const remaining = storeCharacters.filter(c => (c.id || c.code) !== (editingCompanion.id || editingCompanion.code));
                                                                if (remaining.length > 0) {
                                                                    setClassmateCharId(remaining[0].id || remaining[0].code);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                                                >
                                                    <i className="fas fa-trash-alt mr-1"></i> Delete Companion
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingCompanion(null);
                                                    setIsCreatingNewCompanion(false);
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!editingCompanion.name.trim()) {
                                                        alert('Please enter a name for the companion.');
                                                        return;
                                                    }
                                                    if (isCreatingNewCompanion) {
                                                        addCharacter(editingCompanion);
                                                        setClassmateCharId(editingCompanion.id || editingCompanion.code);
                                                    } else {
                                                        updateCharacter(editingCompanion.id || editingCompanion.code, editingCompanion);
                                                    }
                                                    setEditingCompanion(null);
                                                    setIsCreatingNewCompanion(false);
                                                }}
                                                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <i className="fas fa-save"></i> Save Companion
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleSavePreferences} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2">
                                <i className="fas fa-save mr-2"></i> Save Settings for this Learner
                            </Button>
                        </div>
                    </GeneratorSection>
                )}

                {/* PERSONAL SYLLABUS WIDGET */}
                <TierGatedOverlay 
                    requiredTier="pro" 
                    featureName="Personal Syllabus Integration" 
                    description="Personal Syllabus is an exclusive feature for Pro and VIP tutors. Upgrade to create, link, and automatically generate lessons from comprehensive multi-chapter curricula."
                >
                <GeneratorSection title="Step 3 · Personal Syllabus Integration" subtitle="Generate the lesson from your learner's syllabus chapters" icon="fa-book-reader" defaultOpen badgeText={pendingSyllabusChapters.length > 0 ? `${filteredPendingChapters.length}/${pendingSyllabusChapters.length} chapters` : undefined}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-book-reader text-brand-purple text-base"></i>
                            <h4 className="font-extrabold text-slate-800 text-sm">
                                Personal Syllabus
                            </h4>
                        </div>
                        <div className="flex items-center gap-2">
                            {pendingSyllabusChapters.length > 0 && (
                                <span className="text-[10px] bg-brand-purple/10 text-brand-purple font-extrabold px-2.5 py-0.5 rounded-full">
                                    {filteredPendingChapters.length} of {pendingSyllabusChapters.length} Chapters
                                </span>
                            )}
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <span className="text-[10px] font-bold text-slate-600">Use as Source</span>
                                <input
                                    type="checkbox"
                                    checked={personalSyllabusMode}
                                    onChange={(e) => setPersonalSyllabusMode(e.target.checked)}
                                    className="w-3.5 h-3.5 text-brand-purple rounded border-gray-300 focus:ring-brand-purple cursor-pointer"
                                />
                            </label>
                        </div>
                    </div>

                    {personalSyllabusMode && (
                        <div className="mb-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] text-indigo-700 font-semibold flex items-center gap-2">
                            <i className="fas fa-info-circle"></i>
                            Personal Syllabus active - Copy Prompt will use selected chapters as source (no PDF/lesson text needed).
                        </div>
                    )}

                    {!(learner as any)?.syllabus || !(learner as any).syllabus.competencies || (learner as any).syllabus.competencies.length === 0 ? (
                        <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                            <i className="fas fa-info-circle mr-1.5 text-brand-purple"></i>
                            No syllabus has been loaded for this student yet. Go to the <strong>Profile</strong> tab to create or import a Personal Syllabus.
                        </div>
                    ) : pendingSyllabusChapters.length === 0 ? (
                        <div className="p-4 bg-white border border-dashed border-emerald-300 rounded-xl text-center text-xs text-emerald-600">
                            <i className="fas fa-check-circle mr-1.5 text-emerald-500"></i>
                            All chapters from the Personal Syllabus have been completed! Outstanding work! 🎉
                        </div>
                    ) : (
                        <>
                            {/* CEFR Level Guard notice */}
                            <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-800 font-semibold leading-snug">
                                <i className="fas fa-shield-halved mr-1.5 text-emerald-600"></i>
                                CEFR Level Guard: chapters at or below <b>{cefrLevel} · Tier {cefrTier}/3</b> are listed first and preferred. Grammar from chapters above the ceiling is blocked in the Copy AI prompt (their topic & vocabulary may still be used).
                            </div>

                            {/* Real-time Keyword Search Filter */}
                            <div className="mb-3 relative">
                                <input
                                    type="text"
                                    placeholder="🔍 Search syllabus chapters, grammar, or vocabulary..."
                                    value={syllabusSearchQuery}
                                    onChange={(e) => setSyllabusSearchQuery(e.target.value)}
                                    className="w-full text-xs p-2 pl-8 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple placeholder:text-slate-400 text-slate-800"
                                />
                            </div>
                            
                            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 shadow-inner">
                                {filteredPendingChapters.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-500">
                                        No chapters match your search query.
                                    </div>
                                ) : (
                                    filteredPendingChapters.map(({ competencyName, chapter, guard }, idx) => {
                                        const isChecked = selectedSyllabusChapters.includes(chapter.id);
                                        const guardBadge = guard.relation === 'below' ? (
                                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200" title={`Grammar detected: ${guard.topic} (${guard.level}) — below the ${cefrLevel} ceiling, preferred`}>🟢 Below {cefrLevel}</span>
                                        ) : guard.relation === 'allowed' ? (
                                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200" title={`Grammar detected: ${guard.topic} (${guard.level}) — inside the ${cefrLevel} · Tier ${cefrTier}/3 ceiling, allowed`}>✅ At level</span>
                                        ) : guard.relation === 'above' ? (
                                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200" title={`Grammar detected: ${guard.topic} (${guard.level}) — ABOVE the ${cefrLevel} ceiling; grammar blocked in the prompt`}>🟠 Above — grammar blocked</span>
                                        ) : (
                                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200" title="No dictionary topic recognized — the AI must keep all language within the selected ceiling">Level not detected</span>
                                        );
                                        return (
                                            <div 
                                                key={`${competencyName}-${chapter.id}-${idx}`}
                                                onClick={() => {
                                                    if (isChecked) {
                                                        setSelectedSyllabusChapters(selectedSyllabusChapters.filter(id => id !== chapter.id));
                                                    } else {
                                                        setSelectedSyllabusChapters([...selectedSyllabusChapters, chapter.id]);
                                                    }
                                                }}
                                                className={`p-3 transition-all cursor-pointer flex items-start gap-3 select-none ${
                                                    isChecked 
                                                        ? 'bg-indigo-50/25' 
                                                        : 'hover:bg-slate-50/50'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {}} // handled by click of parent div
                                                    className="w-4 h-4 text-brand-purple rounded border-gray-300 focus:ring-brand-purple cursor-pointer mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-brand-purple/10 text-brand-purple uppercase tracking-wider">{competencyName}</span>
                                                        {guardBadge}
                                                    </div>
                                                    <h5 className="font-extrabold text-xs text-slate-800 mt-1.5">{chapter.title}</h5>
                                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{chapter.description}</p>
                                                    
                                                    {/* Vocabulary & Grammar Indicators */}
                                                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                                        {chapter.grammar && (
                                                            <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                                                Grammar: {chapter.grammar}
                                                            </span>
                                                        )}
                                                        {chapter.vocabulary && chapter.vocabulary.length > 0 && (
                                                            <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50/80 text-indigo-600 rounded border border-indigo-100">
                                                                Vocab: {chapter.vocabulary.join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </GeneratorSection>
                </TierGatedOverlay>

                {selectedType === 'audioLesson' ? (
                    <div className="mt-8">
                        <AudioGenerator learner={learner} />
                    </div>
                ) : selectedType === 'liveLesson' ? (
                    <div className="mt-8 space-y-4">
                        <LiveLessonStudio 
                            learner={learner} 
                            tutorProfile={tutorProfile}
                            onSave={onSaveContent}
                        />
                    </div>
                ) : (
                    <>
                        <GeneratorSection title="Step 4 · Optional Extras" subtitle="L1 translations, tutor personalization, saved-file naming & content density (media is added later in Lesson Settings)" icon="fa-wand-magic-sparkles" defaultOpen={false}>
                        <div className="mb-4 flex flex-col gap-2">
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={addL1Translation} 
                                    onChange={e => setAddL1Translation(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Add L1 Translation</span>
                            </label>
                            {addL1Translation && (
                                <div className="ml-6 mb-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                    <label className="block text-xs font-bold text-gray-600 mb-2">L1 Translation Amount ({l1TranslationAmount}/5)</label>
                                    <input 
                                        type="range" 
                                        min="1" max="5" step="1" 
                                        value={l1TranslationAmount} 
                                        onChange={e => setL1TranslationAmount(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                        <span>1 (Key terms)</span>
                                        <span>3 (Moderate)</span>
                                        <span>5 (Everything)</span>
                                    </div>
                                </div>
                            )}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={useTutorInfo} 
                                    onChange={e => setUseTutorInfo(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Use Tutor Info for Personalization</span>
                            </label>
                            {!['englishLesson', 'englishLessonV2', 'bilingualStudyLesson', 'explainerLesson', 'conversationalLesson', 'homework', 'examPrepLesson'].includes(selectedType) && (
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={includeAccessibility} 
                                        onChange={e => setIncludeAccessibility(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Inject Accessibility Widget Automatically</span>
                                </label>
                            )}
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Content Quantity Multiplier ({contentMultiplier}x)</label>
                            <input 
                                type="range" 
                                min="1" max="3" step="1" 
                                value={contentMultiplier} 
                                onChange={e => setContentMultiplier(parseInt(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>1x (Standard)</span>
                                <span>2x (Deep Dive)</span>
                                <span>3x (Exhaustive)</span>
                            </div>
                        </div>

                        {/* Saved file name: {learner}_{book}_{unit}_{type}_{Learner|Presenter}_{date} — book & unit auto-filled from the learner's course plan */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                                <i className="fas fa-file-signature text-indigo-500"></i>
                                Saved file name
                                <span className="text-slate-400 font-medium">learner_book_unit_type_Learner/Presenter_date</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <input
                                    value={fileBook}
                                    onChange={(e) => setFileBook(e.target.value)}
                                    placeholder="Book (from learner's profile)"
                                    title="Auto-filled from the learner's course plan"
                                    className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <input
                                    value={fileUnit}
                                    onChange={(e) => setFileUnit(e.target.value)}
                                    placeholder="Unit (from Lesson Settings)"
                                    title="Auto-filled from the learner's Lesson Settings"
                                    className="flex-1 min-w-[100px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <select
                                    value={fileAudience}
                                    onChange={(e) => setFileAudience(e.target.value as LessonAudience)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="Learner">Learner</option>
                                    <option value="Presenter">Presenter</option>
                                </select>
                            </div>
                            <div className="mt-2 text-[11px] font-mono text-slate-500 truncate" title={stdFileName(selectedTypeLabel || selectedType)}>
                                {stdFileName(selectedTypeLabel || selectedType)}
                            </div>
                        </div>
                        </GeneratorSection>

                        <GeneratorSection title="Step 5 · Generate — Copy AI Prompt & Paste JSON" subtitle="Copy the prompt to an external AI, then paste & validate the JSON response" icon="fa-terminal" defaultOpen>
                        <div id="manual-tour-copy-prompt" className="mb-0">
                            <div className="relative">
                                <Textarea value={promptText} readOnly rows={8} className="bg-gray-50 text-xs font-mono text-gray-800" />
                                <button 
                                    onClick={handleCopy}
                                    className="absolute top-2 right-2 bg-gray-200 border border-gray-400 text-black font-extrabold px-3 py-1 rounded shadow text-xs hover:bg-gray-300 transition"
                                >
                                    Copy Prompt
                                </button>
                            </div>
                        </div>

                        <div id="manual-tour-paste-json" className="mb-4">
                            <Textarea 
                                ref={textareaRef}
                                value={jsonInput} 
                                onChange={(e) => setJsonInput(e.target.value)} 
                                placeholder="Paste the raw JSON response here..." 
                                rows={10} 
                                className="font-mono text-xs shadow-inner focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex justify-between items-center mt-2">
                                <div className="text-xs text-gray-500">
                                    {jsonInput.trim() ? (
                                        <span className="flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                            Instant validator active
                                        </span>
                                    ) : (
                                        "Paste JSON to begin"
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleCheckSyntax}
                                        disabled={isFixing}
                                        className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 flex items-center gap-1 font-bold shadow-sm"
                                    >
                                        <i className="fas fa-search"></i> Check Syntax Error
                                    </button>
                                    <button 
                                        onClick={() => handleLoadMockData()}
                                        className="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded hover:bg-indigo-200 flex items-center gap-1 shadow-sm"
                                    >
                                        <i className="fas fa-file-invoice"></i> Load Mock Data
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* LIVE VALIDATION & DYNAMIC SUMMARY DASHBOARD */}
                        <div className="mb-6 border rounded-xl overflow-hidden shadow-sm bg-white">
                            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                                <span className="font-bold text-sm text-gray-700 flex items-center gap-2">
                                    <i className="fas fa-shield-halved text-indigo-500"></i>
                                    Validation & Summary Console
                                </span>
                                {liveValidation.errorType === 'empty' && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">Idle</span>
                                )}
                                {liveValidation.errorType === 'syntax' && (
                                    <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded font-bold animate-pulse">Syntax Error</span>
                                )}
                                {liveValidation.errorType === 'none' && liveValidation.schemaWarnings && liveValidation.schemaWarnings.length > 0 && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">Schema Warning</span>
                                )}
                                {liveValidation.errorType === 'none' && (!liveValidation.schemaWarnings || liveValidation.schemaWarnings.length === 0) && (
                                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold">Fully Verified</span>
                                )}
                            </div>

                            <div className="p-4">
                                {/* 1. Empty State */}
                                {liveValidation.errorType === 'empty' && (
                                    <div className="text-center py-6 text-gray-400">
                                        <i className="far fa-clipboard text-3xl mb-2 block text-gray-300"></i>
                                        <p className="text-xs">No content to display. Paste valid JSON above to instantly generate lesson stats, syntax validation, and section outlines.</p>
                                    </div>
                                )}

                                {/* 2. Syntax Error Detected */}
                                {liveValidation.errorType === 'syntax' && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-rose-50 border border-rose-150 rounded-lg flex items-start gap-2.5 text-rose-900">
                                            <i className="fas fa-circle-exclamation text-rose-500 mt-1 text-base"></i>
                                            <div>
                                                <h4 className="font-bold text-sm">JSON Syntax Validation Failed</h4>
                                                <p className="text-xs text-rose-700 mt-0.5">{liveValidation.errorMessage}</p>
                                                {liveValidation.lineNo && (
                                                    <div className="text-[10px] mt-1.5 font-mono text-rose-600 bg-rose-100/50 px-2 py-0.5 rounded inline-block">
                                                        Line: {liveValidation.lineNo} | Column: {liveValidation.colNo}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Color-Coded Error Context Snippet */}
                                        {liveValidation.snippet && (
                                            <div className="border border-rose-200 rounded-lg overflow-hidden max-w-full w-full shadow-inner">
                                                <div className="bg-slate-900 px-3 py-1.5 text-[10px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-800">
                                                    <span>Snippet Source Code</span>
                                                    <span className="text-rose-400 font-bold">Error near Line {liveValidation.lineNo}</span>
                                                </div>
                                                <div className="bg-slate-950 p-3 font-mono text-xs overflow-x-auto max-h-72 overflow-y-auto text-slate-300 space-y-1 max-w-full w-full">
                                                    {liveValidation.snippet.map((line) => (
                                                        <div 
                                                            key={line.lineNo} 
                                                            className={`flex items-start min-w-0 w-full ${line.isError ? 'bg-rose-950/70 border-l-2 border-rose-500 text-rose-100 py-0.5' : 'text-slate-400'}`}
                                                        >
                                                            <span className="w-8 select-none text-right pr-2 text-slate-600 border-r border-slate-800 mr-2 text-[10px] pt-0.5">
                                                                {line.lineNo}
                                                            </span>
                                                            <span className="whitespace-pre-wrap break-all flex-1 text-slate-300 min-w-0">
                                                                {line.text}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Common JSON Syntax Errors Guide */}
                                        <div className="bg-slate-50 border rounded-lg p-3 text-xs space-y-2">
                                            <h5 className="font-semibold text-gray-700 flex items-center gap-1.5 border-b pb-1 mb-1.5">
                                                <i className="fas fa-lightbulb text-amber-500"></i>
                                                Common JSON Issues to Check
                                            </h5>
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-600">
                                                <li className="flex items-start gap-1">
                                                    <span className="text-rose-500 font-bold mr-1">•</span>
                                                    <span>Missing/Extra commas between properties or list items.</span>
                                                </li>
                                                <li className="flex items-start gap-1">
                                                    <span className="text-rose-500 font-bold mr-1">•</span>
                                                    <span>Unescaped double quotes inside strings (should use <code className="bg-gray-150 px-1 py-0.2 rounded font-mono">\"</code>).</span>
                                                </li>
                                                <li className="flex items-start gap-1">
                                                    <span className="text-rose-500 font-bold mr-1">•</span>
                                                    <span>Trailing commas at the end of lists or objects (e.g., <code className="bg-gray-150 px-1 py-0.2 rounded font-mono">[1, 2,]</code>).</span>
                                                </li>
                                                <li className="flex items-start gap-1">
                                                    <span className="text-rose-500 font-bold mr-1">•</span>
                                                    <span>Unclosed brackets <code className="bg-gray-150 px-1 py-0.2 rounded font-mono">]</code> or curly braces <code className="bg-gray-150 px-1 py-0.2 rounded font-mono">{"}"}</code>.</span>
                                                </li>
                                            </ul>
                                        </div>

                                        {/* AI Fix Copier Interface nested inside validation block */}
                                        {liveValidation.syntaxErrorContext && (
                                            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg shadow-inner text-xs">
                                                <h4 className="font-bold text-amber-800 mb-1 flex items-center gap-1">
                                                    <i className="fas fa-wand-magic-sparkles text-amber-500 animate-pulse"></i>
                                                    Interactive AI Assistance Fix
                                                </h4>
                                                <p className="text-amber-700 text-[11px] mb-2.5">
                                                    Pasted JSON contains syntax defects. Use this pre-formed template to instruct ChatGPT, Claude, or Gemini to resolve it instantly, then paste the corrected block here:
                                                </p>
                                                <div className="flex gap-2 mb-2.5">
                                                    <button 
                                                        onClick={() => {
                                                            const sCtx = liveValidation.syntaxErrorContext;
                                                            if (sCtx) {
                                                                navigator.clipboard.writeText(`This JSON snippet has an error near line ${sCtx.lineNo}: ${sCtx.message}. Please fix the syntax completely and return ONLY the corrected valid JSON segment identical in structure without markdown wrappers or explanation:\n\n${sCtx.snippet}`);
                                                                alert("Copied AI instruction prompt to clipboard!");
                                                            }
                                                        }}
                                                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <i className="fas fa-copy"></i> Copy AI Fixing Prompt
                                                    </button>
                                                </div>
                                                <textarea
                                                    className="w-full border border-amber-200 rounded-lg p-2 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                                                    rows={4}
                                                    placeholder="Paste the corrected JSON code snippet here..."
                                                    value={manualAiFix}
                                                    onChange={e => setManualAiFix(e.target.value)}
                                                ></textarea>
                                                <div className="flex justify-end mt-2">
                                                    <button 
                                                        onClick={() => {
                                                            if (!manualAiFix.trim()) { alert("Please paste the fixed code first."); return; }
                                                            const sCtx = liveValidation.syntaxErrorContext;
                                                            if (sCtx) {
                                                                setJsonInput(prev => prev.substring(0, sCtx.startIndex) + manualAiFix + prev.substring(sCtx.endIndex));
                                                                setManualAiFix('');
                                                                alert("Applied fix! Syntax validation will auto-re-verify.");
                                                            }
                                                        }}
                                                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-bold shadow transition flex items-center gap-1"
                                                    >
                                                        <i className="fas fa-check"></i> Apply Correction Segment
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. Perfectly Valid JSON: Render Rich Metadata Stats Dashboard */}
                                {liveValidation.errorType === 'none' && liveValidation.stats && (
                                    <div className="space-y-4">
                                        {/* Verification success banner */}
                                        <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-lg flex items-center gap-2.5 text-emerald-900">
                                            <i className="fas fa-circle-check text-emerald-500 text-lg"></i>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-sm">JSON Format Fully Valid</h4>
                                                <p className="text-[11px] text-emerald-700 mt-0.5">Structure successfully complies with standard parse standards. Ready to render.</p>
                                            </div>
                                        </div>

                                        {/* Schema matching warning if any */}
                                        {liveValidation.schemaWarnings && liveValidation.schemaWarnings.length > 0 && (() => {
                                            const hasExamIssues = liveValidation.schemaWarnings.some(w => w.startsWith('[Exam Schema Issue'));
                                            const bgColor = hasExamIssues ? 'bg-rose-50 border-rose-150 text-rose-950' : 'bg-amber-50 border-amber-150 text-amber-900';
                                            const textColor = hasExamIssues ? 'text-rose-800' : 'text-amber-800';
                                            const icon = hasExamIssues ? 'fa-circle-xmark text-rose-500' : 'fa-triangle-exclamation text-amber-500';
                                            const title = hasExamIssues ? 'Mock Test Schema Validation Failed' : 'Schema Mismatch Advisory';
                                            return (
                                                <div className={`p-3 border rounded-lg flex items-start gap-2.5 ${bgColor}`}>
                                                    <i className={`fas ${icon} mt-0.5 text-base`}></i>
                                                    <div>
                                                        <h4 className="font-bold text-sm">{title}</h4>
                                                        <ul className="list-disc pl-4 mt-1 text-[11px] space-y-0.5">
                                                            {liveValidation.schemaWarnings.map((warn, wIdx) => (
                                                                <li key={wIdx} className={textColor}>{warn}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* GRID OF STATISTICAL CONTENT CARDS (Dynamic by lesson type) */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            {/* Stat 1: Word Count */}
                                            <div className="bg-slate-50 border rounded-xl p-3 shadow-sm relative overflow-hidden group">
                                                <div className="absolute right-2.5 bottom-2 text-slate-200 text-4xl font-extrabold select-none transition-transform group-hover:scale-110">
                                                    <i className="fas fa-file-word"></i>
                                                </div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Words</p>
                                                <h4 className="text-xl font-bold text-slate-800 mt-1">{liveValidation.stats.wordCount.toLocaleString()}</h4>
                                                <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-1.5 py-0.5 rounded mt-1.5 inline-block">
                                                    {liveValidation.stats.wordCount < 400 ? "⚡ Compact Drill" : 
                                                     liveValidation.stats.wordCount < 1000 ? "📖 Standard Lesson" : 
                                                     liveValidation.stats.wordCount < 2000 ? "📚 Deep Comprehensive" : "🔥 Master Class"}
                                                </span>
                                            </div>

                                            {/* Stat 2: Sections */}
                                            <div className="bg-slate-50 border rounded-xl p-3 shadow-sm relative overflow-hidden group">
                                                <div className="absolute right-2.5 bottom-2 text-slate-200 text-4xl font-extrabold select-none transition-transform group-hover:scale-110">
                                                    <i className="fas fa-cubes"></i>
                                                </div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Structure Nodes</p>
                                                <h4 className="text-xl font-bold text-slate-800 mt-1">
                                                    {liveValidation.stats.sectionsCount} {liveValidation.stats.sectionsCount === 1 ? 'Node' : 'Nodes'}
                                                </h4>
                                                <span className="text-[10px] text-purple-600 bg-purple-50 font-bold px-1.5 py-0.5 rounded mt-1.5 inline-block">
                                                    {selectedType === 'placeGame' ? '🔑 5 Reveal Places' : 
                                                     selectedType === 'simulations' ? '🎭 Voices / Scenarios' : '📂 Ordered Modules'}
                                                </span>
                                            </div>

                                            {/* Stat 3: Parts & Reward */}
                                            <div className="bg-slate-50 border rounded-xl p-3 shadow-sm relative overflow-hidden group">
                                                <div className="absolute right-2.5 bottom-2 text-slate-200 text-4xl font-extrabold select-none transition-transform group-hover:scale-110">
                                                    <i className="fas fa-trophy"></i>
                                                </div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lesson Activities</p>
                                                <h4 className="text-xl font-bold text-slate-800 mt-1">
                                                    {liveValidation.stats.partsCount || 0} Drills
                                                </h4>
                                                <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-1.5 py-0.5 rounded mt-1.5 inline-block">
                                                    {liveValidation.stats.xpReward ? `🏆 ${liveValidation.stats.xpReward} Total XP` : "🎮 Interactive Tasks"}
                                                </span>
                                            </div>

                                            {/* Stat 4: Time Pace / Media */}
                                            <div className="bg-slate-50 border rounded-xl p-3 shadow-sm relative overflow-hidden group">
                                                <div className="absolute right-2.5 bottom-2 text-slate-200 text-4xl font-extrabold select-none transition-transform group-hover:scale-110">
                                                    <i className="fas fa-hourglass-half"></i>
                                                </div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Duration / Assets</p>
                                                <h4 className="text-base font-bold text-slate-800 mt-1.5 truncate">
                                                    {liveValidation.stats.duration || (liveValidation.stats.imagesCount ? `${liveValidation.stats.imagesCount} Images` : "Self-Paced")}
                                                </h4>
                                                <span className="text-[10px] text-rose-600 bg-rose-50 font-bold px-1.5 py-0.5 rounded mt-1.5 inline-block">
                                                    {liveValidation.stats.videosCount ? `🎬 ${liveValidation.stats.videosCount} Embedded Clips` : "🎯 High Concentration"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* ACCORDION TREE OUTLINE */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
                                                className="w-full px-4 py-2.5 bg-slate-50 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center justify-between"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <i className="fas fa-folder-tree text-indigo-500"></i>
                                                    View Detailed Lesson Structure Outline ({liveValidation.stats.outline.length} nodes)
                                                </span>
                                                <i className={`fas fa-chevron-down transition-transform duration-200 ${isOutlineExpanded ? 'rotate-180' : ''}`}></i>
                                            </button>

                                            {isOutlineExpanded && (
                                                <div className="p-4 bg-white divide-y divide-slate-100 max-h-[300px] overflow-y-auto space-y-3">
                                                    {liveValidation.stats.outline.map((node: any, idx: number) => (
                                                        <div key={idx} className="pt-3 first:pt-0">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div>
                                                                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                                                        <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                                                                        {node.title}
                                                                    </h5>
                                                                    {node.subtitle && (
                                                                        <span className="text-[10px] text-slate-500 mt-0.5 block">{node.subtitle}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-1.5">
                                                                    {node.typeBadge && (
                                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                                            {node.typeBadge}
                                                                        </span>
                                                                    )}
                                                                    {node.countBadge && (
                                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                                            {node.countBadge}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {node.details && node.details.length > 0 && (
                                                                <div className="mt-2 bg-slate-50/50 rounded-lg p-2.5 pl-3 border border-dashed space-y-1">
                                                                    {node.details.map((detail: string, dIdx: number) => (
                                                                        <div key={dIdx} className="text-[10px] text-slate-600 flex items-start gap-1">
                                                                            <span className="text-indigo-400 mt-0.5 font-bold">›</span>
                                                                            <span>{detail}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        </GeneratorSection>

                        {error && <div className="p-4 bg-red-50 border border-red-200 rounded mb-4 text-sm shadow-sm">{error}</div>}

                        {aiStage !== 'idle' && (
                            <div className={`mb-4 rounded-xl border p-4 ${aiStage === 'done' ? 'border-emerald-300 bg-emerald-50' : 'border-indigo-200 bg-indigo-50/60'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    {aiStage !== 'done' ? (
                                        <span className="inline-block w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                                    ) : (
                                        <span className="text-emerald-600"><i className="fas fa-check-circle"></i></span>
                                    )}
                                    <span className={`text-sm font-extrabold ${aiStage === 'done' ? 'text-emerald-800' : 'text-indigo-800'}`}>{AI_STAGE_LABEL[aiStage]}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {[
                                        { id: 'calling', label: '1 · Send prompt to AI' },
                                        { id: 'parsing', label: '2 · Read AI answer' },
                                        { id: 'validating', label: '3 · Validate JSON' },
                                        { id: 'rendering', label: '4 · Render lesson' }
                                    ].map((step) => {
                                        const order = ['calling', 'parsing', 'validating', 'rendering'];
                                        const active = aiStage !== 'done' && aiStage === step.id;
                                        const done = !active && (aiStage === 'done' || order.indexOf(step.id) < order.indexOf(aiStage));
                                        return (
                                            <span key={step.id} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${done ? 'bg-emerald-100 text-emerald-800' : active ? 'bg-indigo-200 text-indigo-900 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                                {done ? <i className="fas fa-check text-emerald-600"></i> : active ? <i className="fas fa-spinner fa-spin text-indigo-600"></i> : <i className="fas fa-circle text-[6px]"></i>}
                                                {step.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div id="manual-tour-render-buttons" className="flex gap-2">
                            <Button id="manual-tour-publish-and-save" onClick={() => handleRender()} disabled={isGeneratingAi} className="flex-1 bg-green-600 hover:bg-green-700 py-3 text-lg">
                                <i className="fas fa-play-circle mr-2"></i> Render Content
                            </Button>
                            <Button onClick={handleRenderWithAi} disabled={isGeneratingAi} className="flex-1 bg-red-600 hover:bg-red-700 py-3 text-lg">
                                {isGeneratingAi ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i> {aiStage === 'validating' || aiStage === 'rendering' ? 'Finalizing...' : 'Generating...'}</>
                                ) : (
                                    <><i className="fas fa-magic mr-2"></i> Render with AI</>
                                )}
                            </Button>
                        </div>

                        {activeConversationData && (
                            <div className="mt-6 border-t pt-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                                        <i className="fas fa-play-circle text-indigo-500"></i> Rendered Conversation Preview
                                    </h4>
                                    <button 
                                        onClick={() => setActiveConversationData(null)}
                                        className="text-slate-500 hover:text-slate-700 text-xs font-bold"
                                    >
                                        Clear Preview
                                    </button>
                                </div>
                                <ManualConversationPlayer 
                                    data={activeConversationData} 
                                    onClose={() => setActiveConversationData(null)} 
                                    readAloudVoice={readAloudVoice}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ManualGenerator;
