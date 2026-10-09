import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCoursebookStore } from '../../store/useCoursebookStore';
import { useLearnerStore } from '../../store/useLearnerStore';
import { getAvatarUrl } from '../../services/avatarService';
import { CoursebookDetailed, TableOfContentsUnit, CoursebookLevelDetail, ExtraResource } from '../../data/CoursebookManagerData';

interface CoursebookManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoursebook?: (coursebookName: string, coursebookObj?: CoursebookDetailed) => void;
  initialSelectedId?: string;
}

// Known placeholder / other-series video IDs that must never be embedded for a book they do not belong to.
const FAKE_YOUTUBE_IDS = ['a1b2c3d4e5f', 'b2c3d4e5f6g', 'L_LUpnjgPso'];

// Neutral cover shown when a book has no verified official artwork yet
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';

// Helper to get the real, per-book YouTube Video ID.
// No generic "publisher trailer" fallback: if the catalog has no verified video
// for this exact title, returns '' and the UI shows an empty state instead of
// embedding a trailer of a different coursebook.
const getValidYoutubeVideoId = (book: CoursebookDetailed): string => {
  const id = (book.youtubeVideoId || '').trim();
  if (id.length > 5 && !FAKE_YOUTUBE_IDS.includes(id)) {
    return id;
  }
  return '';
};

// Helper to get Level Details breakdown
const getEnrichedLevelDetails = (book: CoursebookDetailed): CoursebookLevelDetail[] => {
  if (book.levelDetails && book.levelDetails.length > 0) return book.levelDetails;
  
  const cefrUpper = (book.cefr || 'A1-B2').toUpperCase();
  const levelsArr: CoursebookLevelDetail[] = [];
  const uCount = book.unitsCount || 10;
  const lCount = book.lessonsCount || (uCount * 4);

  if (cefrUpper.includes('A1')) {
    levelsArr.push({ levelCode: 'A1', title: `${book.coursebook} - Starter / Beginner`, description: 'Foundational vocabulary, simple present structures, everyday greetings, and basic daily routines.', unitsCount: uCount, lessonsCount: lCount });
  }
  if (cefrUpper.includes('A2')) {
    levelsArr.push({ levelCode: 'A2', title: `${book.coursebook} - Elementary / Pre-Intermediate`, description: 'Past experience narratives, travel transactions, shopping dialogues, and personal plans.', unitsCount: uCount, lessonsCount: lCount });
  }
  if (cefrUpper.includes('B1')) {
    levelsArr.push({ levelCode: 'B1', title: `${book.coursebook} - Intermediate`, description: 'Conversational fluency development, expressing opinions, workplace dialogues, and structured writing.', unitsCount: uCount, lessonsCount: lCount });
  }
  if (cefrUpper.includes('B2')) {
    levelsArr.push({ levelCode: 'B2', title: `${book.coursebook} - Upper-Intermediate`, description: 'Debates, complex text comprehension, formal correspondence, and natural idiomatic phrases.', unitsCount: uCount, lessonsCount: lCount });
  }
  if (cefrUpper.includes('C1') || cefrUpper.includes('C2')) {
    levelsArr.push({ levelCode: 'C1/C2', title: `${book.coursebook} - Advanced Mastery`, description: 'Sophisticated register, academic discourse, irony, and complex situational adaptation.', unitsCount: uCount, lessonsCount: lCount });
  }
  
  if (levelsArr.length === 0) {
    levelsArr.push({ levelCode: book.cefr || 'A1-C1', title: `${book.coursebook} - Complete Series`, description: `Full curriculum covering ${book.cefr} with structured units and practical speaking tasks.`, unitsCount: uCount, lessonsCount: lCount });
  }
  return levelsArr;
};

// Helper to get Table of Contents for a specific level or default
const getEnrichedTableOfContents = (book: CoursebookDetailed, selectedLevelCode?: string): TableOfContentsUnit[] => {
  if (selectedLevelCode && book.levelDetails && book.levelDetails.length > 0) {
    const lvlMatch = book.levelDetails.find(l => l.levelCode.toLowerCase() === selectedLevelCode.toLowerCase());
    // A picked level always owns its own list: an empty list means "not filled yet" —
    // we never silently fall back to another level's (or the series) table of contents.
    if (lvlMatch) {
      return (lvlMatch.tableOfContents && lvlMatch.tableOfContents.length > 0) ? lvlMatch.tableOfContents : [];
    }
  }

  if (book.tableOfContents && book.tableOfContents.length > 0) {
    return book.tableOfContents;
  }

  // Check if any level in levelDetails has a table of contents
  if (book.levelDetails) {
    for (const lvl of book.levelDetails) {
      if (lvl.tableOfContents && lvl.tableOfContents.length > 0) {
        return lvl.tableOfContents;
      }
    }
  }

  const count = book.unitsCount || 10;
  const sampleTopics = [
    { title: 'Identity, Family & Personal Life', grammar: 'Present Simple vs Present Continuous', vocab: 'Personality adjectives & family relationships', task: 'Introduce yourself and deliver a personal profile speech' },
    { title: 'Work, Office & Career Paths', grammar: 'Past Simple & Present Perfect', vocab: 'Workplace jargon, routines & time management', task: 'Conduct a job interview roleplay and outline career experience' },
    { title: 'Global Travel, Culture & Food', grammar: 'Comparatives, Superlatives & Modals', vocab: 'Airports, hotels, dining & travel etiquette', task: 'Plan a travel itinerary and solve travel complications' },
    { title: 'Technology, Media & AI Trends', grammar: 'Future Forms (Will, Going to, Present Continuous)', vocab: 'Digital gadgets, social media & innovation', task: 'Present a short tech pitch or debate social media trends' },
    { title: 'Opinions, Debates & Current Events', grammar: 'Conditionals (First & Second)', vocab: 'Expressing agreement, disagreement & nuances', task: 'Participate in a structured debate on global issues' },
    { title: 'Health, Well-being & Lifestyle', grammar: 'Modals of Necessity & Advice (Should, Must)', vocab: 'Fitness, nutrition, stress & mental well-being', task: 'Give health advice and design a daily wellness routine' },
    { title: 'Environment, Nature & Sustainability', grammar: 'Passive Voice in Present & Past', vocab: 'Ecology, recycling, climate & conservation', task: 'Create a community environmental action campaign' },
    { title: 'Arts, Entertainment & Storytelling', grammar: 'Narrative Tenses (Past Continuous & Past Perfect)', vocab: 'Film, music, literature & cultural events', task: 'Tell a personal story or review a recent movie/book' },
    { title: 'Business, Finance & Negotiation', grammar: 'Reported Speech & Indirect Questions', vocab: 'Banking, investments, sales & negotiations', task: 'Negotiate a business deal and write a formal follow-up email' },
    { title: 'Society, Laws & Global Citizenship', grammar: 'Advanced Relative Clauses & Connectors', vocab: 'Human rights, diversity, politics & law', task: 'Draft an essay on global citizenship and lead a discussion' },
    { title: 'Science, Space & Human Future', grammar: 'Speculation & Deduction (Must have, Might have)', vocab: 'Astronomy, robotics & future discoveries', task: 'Speculate on life in 2050 and present scientific research' },
    { title: 'Course Consolidation & Master Class', grammar: 'Mixed Tenses & Discourse Markers Review', vocab: 'Comprehensive CEFR lexis & idiomatic phrases', task: 'Deliver a final capstone presentation & receive feedback' },
  ];

  return Array.from({ length: Math.min(count, 12) }).map((_, i) => {
    const topic = sampleTopics[i % sampleTopics.length];
    return {
      unitNumber: i + 1,
      unitTitle: `Unit ${i + 1}: ${topic.title}`,
      grammarFocus: topic.grammar,
      vocabularyFocus: topic.vocab,
      realWorldTask: topic.task
    };
  });
};

// Helper to aggregate all extra resources (series level + per-level)
const getAllExtraResources = (book: CoursebookDetailed): ExtraResource[] => {
  const list: ExtraResource[] = [];
  if (book.extraResources && book.extraResources.length > 0) {
    list.push(...book.extraResources);
  }
  if (book.levelDetails) {
    book.levelDetails.forEach(lvl => {
      if (lvl.extraResources && lvl.extraResources.length > 0) {
        lvl.extraResources.forEach(res => {
          if (!list.some(r => r.title === res.title)) {
            list.push({
              ...res,
              title: `[${lvl.levelCode}] ${res.title}`
            });
          }
        });
      }
    });
  }
  return list;
};

// Parse the JSON an external AI returns after being given the printed contents pages.
// Accepts { units: [...] } | { tableOfContents: [...] } | [...] — every unit keeps the catalog schema.
const parseTocPastedJson = (raw: string): TableOfContentsUnit[] => {
  if (!raw || !raw.trim()) throw new Error('Paste the JSON the AI returned first.');
  const parsed = JSON.parse(raw);
  const arr = Array.isArray(parsed) ? parsed : (parsed.units || parsed.tableOfContents || parsed.contents || parsed.unitsList);
  if (!Array.isArray(arr)) throw new Error('Expected a JSON array — or an object with a "units" array — of unit objects.');
  const clean = (v: any) => v === undefined || v === null ? undefined : String(v).trim();
  const units = arr.map((u: any, i: number) => ({
    unitNumber: Number(u.unitNumber ?? u.number ?? i + 1) || i + 1,
    unitTitle: String(u.unitTitle ?? u.title ?? u.unit ?? u.name ?? '').trim(),
    grammarFocus: clean(u.grammarFocus ?? u.grammar ?? u.grammar_point ?? u.languageFocus) || 'Not specified',
    vocabularyFocus: clean(u.vocabularyFocus ?? u.vocabulary ?? u.vocab ?? u.words) || 'Not specified',
    realWorldTask: clean(u.realWorldTask ?? u.realWorld ?? u.task ?? u.speakingTask) || '',
    examFocus: clean(u.examFocus ?? u.exam ?? u.examTask),
    skillsFocus: clean(u.skillsFocus ?? u.skills ?? u.integratedSkills),
    pageRange: clean(u.pageRange ?? u.pages ?? u.page ?? u.pp)
  })).filter(u => u.unitTitle);
  if (units.length === 0) throw new Error('No units found — make sure each object has a "unitTitle".');
  return units;
};

// Builds the clipboard prompt that asks the external AI for the EXACT printed TOC of one book/level.
const buildTocAiPrompt = (book: CoursebookDetailed, levelCode?: string | undefined): string => {
  const scope = levelCode ? `level "${levelCode}" of the coursebook **${book.coursebook}**` : `the coursebook **${book.coursebook}** (single-volume)`;
  const who = levelCode ? `the ${levelCode} level` : 'the book';
  return `You are a coursebook catalogue specialist. I will give you the printed "Table of Contents" pages of ${scope} (${book.publisher}${book.editionYear ? ', ' + book.editionYear : ''}).

Read ONLY those printed contents pages and transcribe the real contents of ${who} into a detailed JSON unit list.

RULES (NON-NEGOTIABLE):
1. Transcribe the REAL units of ${who} exactly as printed — the unit titles, their page ranges, the grammar, vocabulary, skills and any exam/task focus each unit announces. NEVER invent units, titles, grammar points or vocabulary that are not on the pages. If a unit does not list a grammar point, write "Not listed in the TOC".
2. Do NOT describe the pages, do NOT talk about the exercise types in general terms, do NOT write instructions about how to use the table of contents, and never write meta sentences such as "These questions test your ability…".
3. The printed contents page is the ONLY source: if a unit has no page range shown, omit "pageRange" for that unit.
4. Output ONLY valid JSON inside a \`\`\`json … \`\`\` code block — no preamble, no commentary.
5. Cover every unit printed in the TOC of ${who} (usually 8–14 units), in order.

Return exactly this shape (fields optional ones can be omitted when the book does not show them):
{
  "units": [
    {
      "unitNumber": 1,
      "unitTitle": "Unit title exactly as printed",
      "pageRange": "pages 6–11" (when printed),
      "grammarFocus": "Grammar announced for this unit",
      "vocabularyFocus": "Vocabulary/skills announced for this unit",
      "skillsFocus": "Listening/Speaking/Reading/Writing focus if printed",
      "examFocus": "Exam task type if printed",
      "realWorldTask": "Real-world speaking/task outcome if printed"
    }
  ]
}`;
};

// Helper to get album images (deduplicated so a repeated/wrong entry can never show twice)
const getEnrichedAlbumImages = (book: CoursebookDetailed, overrides: Record<string, string> = {}): string[] => {
  const dedupe = (urls: string[]) => Array.from(new Set(urls.filter(u => u && u.trim().length > 0)));
  if (book.albumImages && book.albumImages.length > 0) return dedupe(book.albumImages);
  return dedupe([
    overrides[book.id] || book.coverImage || FALLBACK_COVER,
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80"
  ]);
};

export const CoursebookManagerModal: React.FC<CoursebookManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectCoursebook,
  initialSelectedId
}) => {
  const { coursebooks, addCoursebook, deleteCoursebook, coverOverrides, setCoverOverride, updateCoursebook } = useCoursebookStore();

  // Resolve the cover to display: tutor upload/paste override > catalog cover > neutral fallback
  const resolveCover = (book: CoursebookDetailed) => coverOverrides[book.id] || book.coverImage || FALLBACK_COVER;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('All');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('All');
  const [selectedCefr, setSelectedCefr] = useState<string>('All');
  const [selectedPublisher, setSelectedPublisher] = useState<string>('All');

  // Side-by-Side Comparison State
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareViewOpen, setIsCompareViewOpen] = useState<boolean>(false);

  // Detail Modal Inspection State
  const [activeBook, setActiveBook] = useState<CoursebookDetailed | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'toc' | 'levels' | 'resources' | 'media' | 'learners'>('overview');
  const [selectedTocLevelCode, setSelectedTocLevelCode] = useState<string>('All');
  const [tocSearch, setTocSearch] = useState('');

  // ── TOC AI tools (copy prompt / paste JSON / add & reorder levels) ──
  const [tocPasteOpen, setTocPasteOpen] = useState(false);
  const [tocPasteJson, setTocPasteJson] = useState('');
  const [tocPasteError, setTocPasteError] = useState<string | null>(null);
  const [tocPromptCopied, setTocPromptCopied] = useState(false);
  const [addingLevel, setAddingLevel] = useState(false);
  const [newLevelCode, setNewLevelCode] = useState('');
  const [dragLevelCode, setDragLevelCode] = useState<string | null>(null);

  // The TOC tab no longer has a "Series Overview" chip — when a book has levels the
  // first level is selected automatically; single-level books fall back to their own TOC.
  const tocDisplayLevelCode = useMemo(() => {
    if (!activeBook || !activeBook.levelDetails || activeBook.levelDetails.length === 0) return undefined;
    const valid = (selectedTocLevelCode !== 'All') && activeBook.levelDetails.some(l => l.levelCode === selectedTocLevelCode);
    return valid ? selectedTocLevelCode : activeBook.levelDetails[0].levelCode;
  }, [activeBook, selectedTocLevelCode]);

  // Reset the selected level whenever a different book is inspected
  useEffect(() => {
    setSelectedTocLevelCode('All');
    setTocPasteOpen(false);
    setTocPasteJson('');
    setTocPasteError(null);
    setAddingLevel(false);
  }, [activeBook?.id]);

  // Extra Resources Filter State
  const [resourceForWhomFilter, setResourceForWhomFilter] = useState<'All' | 'Teachers' | 'Learners' | 'Both'>('All');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('All');

  // Lightbox Preview Image State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Set Cover (upload / paste) Panel State
  const [coverPanelOpen, setCoverPanelOpen] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState('');
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !activeBook) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverOverride(activeBook.id, reader.result);
        setCoverPanelOpen(false);
        setToastMessage('Cover saved on this device — no data loss');
        setTimeout(() => setToastMessage(null), 2200);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCoverUrlSave = () => {
    if (!activeBook || !coverUrlDraft.trim()) return;
    setCoverOverride(activeBook.id, coverUrlDraft.trim());
    setCoverUrlDraft('');
    setCoverPanelOpen(false);
    setToastMessage('Cover URL saved on this device — no data loss');
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Selection Success Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshActiveBook = () => {
    if (!activeBook) return null;
    const fresh = useCoursebookStore.getState().coursebooks.find(b => b.id === activeBook.id);
    if (fresh) setActiveBook(fresh);
    return fresh || null;
  };

  // TOC AI: copy the prompt asking the external AI for the printed table of contents
  const copyTocAiPrompt = async () => {
    if (!activeBook) return;
    const prompt = buildTocAiPrompt(activeBook, tocDisplayLevelCode);
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setTocPromptCopied(true);
    setToastMessage('AI prompt copied — send it together with the printed contents pages');
    setTimeout(() => { setTocPromptCopied(false); setToastMessage(null); }, 2600);
  };

  // TOC AI: paste the JSON returned by the external AI and save it for this book/level
  const saveTocPastedJson = () => {
    if (!activeBook) return;
    try {
      const units = parseTocPastedJson(tocPasteJson);
      const bookId = activeBook.id;
      const current = useCoursebookStore.getState().coursebooks.find(b => b.id === bookId) || activeBook;
      let patch: Partial<CoursebookDetailed> = {};
      if (tocDisplayLevelCode && current.levelDetails && current.levelDetails.length > 0) {
        const idx = current.levelDetails.findIndex(l => l.levelCode === tocDisplayLevelCode);
        if (idx < 0) throw new Error('Could not find level ' + tocDisplayLevelCode + ' on this book.');
        patch = {
          levelDetails: current.levelDetails.map((lvl, i) => i === idx ? { ...lvl, tableOfContents: units, unitsCount: units.length } : lvl)
        };
      } else {
        patch = { tableOfContents: units, unitsCount: units.length };
      }
      updateCoursebook(bookId, patch);
      const fresh = useCoursebookStore.getState().coursebooks.find(b => b.id === bookId) || null;
      if (fresh) setActiveBook(fresh);
      setTocPasteOpen(false);
      setTocPasteJson('');
      setTocPasteError(null);
      const scope = tocDisplayLevelCode || 'this book';
      setToastMessage('✅ ' + units.length + ' units saved for ' + scope + ' — stored on this device');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setTocPasteError(err && err.message ? err.message : 'Could not parse the JSON — check it and try again.');
    }
  };

  // Adds a brand-new level chip at the end of the book's level list (drag to reorder after)
  const handleAddTocLevel = () => {
    if (!activeBook) return;
    const existing = activeBook.levelDetails || [];
    let code = newLevelCode.trim().toUpperCase().replace(/[^A-Z0-9+\-]/g, '');
    if (!code) {
      const fallbacks = ['C1', 'C2', 'Pre-A1', 'A1', 'A2', 'B1', 'B1+', 'B2'];
      code = fallbacks.find(f => !existing.some(l => l.levelCode.toLowerCase() === f.toLowerCase())) || ('L' + (existing.length + 1));
    }
    if (existing.some(l => l.levelCode.toLowerCase() === code.toLowerCase())) {
      setTocPasteError('Level ' + code + ' already exists on this book.');
      setTocPasteOpen(true);
      return;
    }
    const newLevel: CoursebookLevelDetail = {
      levelCode: code,
      title: activeBook.coursebook + ' — Level ' + code,
      description: 'Level added by tutor — use the AI tools above to paste its real table of contents.',
      unitsCount: activeBook.unitsCount || 10,
      lessonsCount: activeBook.lessonsCount || 40,
      tableOfContents: []
    };
    const bookId = activeBook.id;
    updateCoursebook(bookId, { levelDetails: [...existing, newLevel] });
    const fresh = useCoursebookStore.getState().coursebooks.find(b => b.id === bookId) || null;
    if (fresh) setActiveBook(fresh);
    setSelectedTocLevelCode(code);
    setAddingLevel(false);
    setNewLevelCode('');
    setTocPasteError(null);
    setToastMessage('Level ' + code + ' added — copy the AI prompt and paste its table of contents');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 🗑 Delete a level added by mistake (never removes the last remaining level)
  const handleDeleteTocLevel = (code: string) => {
    if (!activeBook) return;
    const existing = activeBook.levelDetails || [];
    if (existing.length <= 1) {
      setToastMessage('A book needs at least one level — pick another band to keep.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    const next = existing.filter(l => l.levelCode !== code);
    const bookId = activeBook.id;
    updateCoursebook(bookId, { levelDetails: next });
    const fresh = useCoursebookStore.getState().coursebooks.find(b => b.id === bookId) || null;
    if (fresh) setActiveBook(fresh);
    if (selectedTocLevelCode === code) setSelectedTocLevelCode('All');
    setToastMessage('Level ' + code + ' removed from ' + activeBook.coursebook);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Drag & drop: reorder the book's levels by dragging the level chips
  const handleTocDragStart = (e: React.DragEvent, code: string) => {
    setDragLevelCode(code);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleTocDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleTocDrop = (e: React.DragEvent, targetCode: string) => {
    e.preventDefault();
    if (!activeBook || !dragLevelCode || dragLevelCode === targetCode) { setDragLevelCode(null); return; }
    const levels = [...(activeBook.levelDetails || [])];
    const from = levels.findIndex(l => l.levelCode === dragLevelCode);
    const to = levels.findIndex(l => l.levelCode === targetCode);
    if (from < 0 || to < 0) { setDragLevelCode(null); return; }
    const [moved] = levels.splice(from, 1);
    levels.splice(to, 0, moved);
    const bookId = activeBook.id;
    updateCoursebook(bookId, { levelDetails: levels });
    const fresh = useCoursebookStore.getState().coursebooks.find(b => b.id === bookId) || null;
    if (fresh) setActiveBook(fresh);
    setDragLevelCode(null);
  };
  const handleTocDragEnd = () => setDragLevelCode(null);

  // Add Coursebook (AI-assisted) State
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customJsonInput, setCustomJsonInput] = useState('');
  const [customJsonError, setCustomJsonError] = useState<string | null>(null);
  const [customPromptCopied, setCustomPromptCopied] = useState(false);

  // Suggest Coursebooks Wizard State
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizAge, setWizAge] = useState('All');
  const [wizCefr, setWizCefr] = useState('All');
  const [wizCategory, setWizCategory] = useState('All');
  const [wizGoal, setWizGoal] = useState('');

  // Learners studying each coursebook (from their Course Plan)
  const learners = useLearnerStore(s => s.learners);
  const learnersByBook = useMemo(() => {
    const map = new Map<string, typeof learners>();
    learners.forEach(l => {
      const info: any = l.coursePlan?.coursebookInfo;
      const name = (info?.coursebook || l.coursePlan?.courseName || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return map;
  }, [learners]);
  const getBookLearners = (book: CoursebookDetailed) => learnersByBook.get((book.coursebook || '').toLowerCase()) || [];

  // Toggle book selection for side-by-side comparison
  const toggleCompareBook = (bookId: string) => {
    if (compareIds.includes(bookId)) {
      setCompareIds(compareIds.filter(id => id !== bookId));
    } else {
      if (compareIds.length >= 4) {
        setToastMessage('Maximum 4 coursebooks can be compared side-by-side');
        setTimeout(() => setToastMessage(null), 2000);
        return;
      }
      setCompareIds([...compareIds, bookId]);
    }
  };

  const clearCompare = () => {
    setCompareIds([]);
    setIsCompareViewOpen(false);
  };

  const compareBooks = useMemo(() => {
    return coursebooks.filter(b => compareIds.includes(b.id));
  }, [coursebooks, compareIds]);

  // Set initial selected book if passed
  useEffect(() => {
    if (initialSelectedId && coursebooks.length > 0) {
      const found = coursebooks.find(b => b.id === initialSelectedId || b.coursebook.toLowerCase().includes(initialSelectedId.toLowerCase()));
      if (found) {
        setActiveBook(found);
        setSelectedTocLevelCode('All');
      }
    }
  }, [initialSelectedId, coursebooks]);

  // Categories & Options
  const categoryTabs = ['All', 'General English', 'Business English', 'Academic English', 'Exam Preparation', 'Survival & Travel', 'Slang & Colloquial'];
  const ageGroups = ['All', 'Adults', 'Teenagers', 'Kids', 'Business Professionals'];
  const cefrLevels = ['All', 'A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2'];
  const publishers = ['All', 'Cambridge', 'Oxford', 'Pearson', 'National Geographic', 'Macmillan'];

  const filteredBooks = useMemo(() => {
    return coursebooks.filter(b => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        b.coursebook.toLowerCase().includes(query) || 
        b.publisher.toLowerCase().includes(query) ||
        b.primaryFocus.toLowerCase().includes(query) ||
        b.cefr.toLowerCase().includes(query) ||
        (b.authors && b.authors.toLowerCase().includes(query)) ||
        (b.editionYear && String(b.editionYear).toLowerCase().includes(query)) ||
        (b.digitalPlatform && b.digitalPlatform.toLowerCase().includes(query)) ||
        (b.methodology && b.methodology.toLowerCase().includes(query)) ||
        (b.bestFor && b.bestFor.toLowerCase().includes(query)) ||
        (b.keySellingPoints && b.keySellingPoints.some(k => k.toLowerCase().includes(query))) ||
        (b.components && (Array.isArray(b.components) ? b.components.join(' ').toLowerCase().includes(query) : b.components.toLowerCase().includes(query))) ||
        (b.realWorldTopics && b.realWorldTopics.toLowerCase().includes(query));

      const matchesCategoryTab = selectedCategoryTab === 'All' || b.category === selectedCategoryTab || (b.primaryFocus && b.primaryFocus.toLowerCase().includes(selectedCategoryTab.toLowerCase()));
      const matchesAge = selectedAgeGroup === 'All' || b.ageGroupCategory === selectedAgeGroup || (b.targetAudience && b.targetAudience.toLowerCase().includes(selectedAgeGroup.toLowerCase()));
      const matchesCefr = selectedCefr === 'All' || b.cefr.toUpperCase().includes(selectedCefr.toUpperCase());
      const matchesPublisher = selectedPublisher === 'All' || b.publisher.toLowerCase().includes(selectedPublisher.toLowerCase());

      return matchesSearch && matchesCategoryTab && matchesAge && matchesCefr && matchesPublisher;
    });
  }, [coursebooks, searchQuery, selectedCategoryTab, selectedAgeGroup, selectedCefr, selectedPublisher]);

  // CEFR overlap scoring for the suggest wizard
  const cefrLevelsIn = (range: string): string[] => {
    const r = (range || '').toUpperCase();
    const all = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    return all.filter(l => r.includes(l));
  };

  const wizardResults = useMemo(() => {
    const goalTerms = (wizGoal || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
    const scored = coursebooks.map(book => {
      let score = 0;
      const reasons: string[] = [];
      const bookCefr = cefrLevelsIn(book.cefr);
      const wizCefrLevels = cefrLevelsIn(wizCefr);
      if (wizAge !== 'All' && (book.ageGroupCategory === wizAge || (book.targetAudience || '').toLowerCase().includes(wizAge.toLowerCase()))) {
        score += 30;
        reasons.push(`Audience matches ${wizAge}`);
      }
      if (wizCefr !== 'All' && wizCefrLevels.some(l => bookCefr.includes(l))) {
        score += 25;
        reasons.push(`Covers ${wizCefr}`);
      }
      if (wizCategory !== 'All' && (book.category === wizCategory || (book.primaryFocus || '').toLowerCase().includes(wizCategory.toLowerCase()))) {
        score += 20;
        reasons.push(`Category: ${wizCategory}`);
      }
      if (goalTerms.length > 0) {
        const haystack = `${book.primaryFocus} ${book.bestFor} ${book.realWorldTopics} ${book.communicationGoal} ${(book.keySellingPoints || []).join(' ')}`.toLowerCase();
        const hits = goalTerms.filter(t => haystack.includes(t));
        if (hits.length > 0) {
          score += Math.min(15, hits.length * 5);
          reasons.push(`Matches goals: ${hits.join(', ')}`);
        }
      }
      return { book, score, reasons };
    });
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 9);
  }, [coursebooks, wizAge, wizCefr, wizCategory, wizGoal]);

  if (!isOpen) return null;

  const hasActiveFilters = searchQuery !== '' || selectedCategoryTab !== 'All' || selectedAgeGroup !== 'All' || selectedCefr !== 'All' || selectedPublisher !== 'All';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategoryTab('All');
    setSelectedAgeGroup('All');
    setSelectedCefr('All');
    setSelectedPublisher('All');
  };

  const handleSelectBookAsCourse = (book: CoursebookDetailed) => {
    if (onSelectCoursebook) {
      onSelectCoursebook(book.coursebook, book);
    }
    setToastMessage(`Selected "${book.coursebook}" as active syllabus!`);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1200);
  };

  // Builds the AI prompt covering EVERY section of the coursebook catalog record
  const buildCustomCoursebookPrompt = (): string => {
    return `You are a Coursebook Catalog Specialist for an ELT school. I need a complete catalog entry for a new coursebook to be added to my Coursebook Catalog (saved locally on this computer).

First confirm the coursebook title, then return STRICTLY a single valid JSON object (no markdown, no commentary) that fills every section below. Use sensible, realistic values.

{
  "coursebook": "${customTitle.trim() || '<Coursebook Title>'}",
  "publisher": "Publisher or school name",
  "authors": "Author name(s)",
  "editionYear": 2026,
  "cefr": "A1-B2",
  "levels": "e.g. 4 Levels (A1, A2, B1, B2)",
  "targetAudience": "Adults | Teenagers | Kids | Business Professionals",
  "ageGroupCategory": "Adults | Teenagers | Kids | Business Professionals",
  "category": "General English | Business English | Academic English | Exam Preparation | Survival & Travel | Slang & Colloquial",
  "module": "General | Business | Academic | Exam",
  "primaryFocus": "Main pedagogical focus, e.g. Speaking & Presentation Skills",
  "focusCategory": "e.g. Integrated Skills | Business Skills | Exam Skills",
  "skillBalance": "Balanced (Speaking, Listening, Reading, Writing)",
  "vocabularyType": "Core CEFR + Practical Conversational Lexis",
  "accent": "International | British | American",
  "authenticity": "Authentic Materials | Curated Custom Materials",
  "realWorldTopics": "The real-life topics covered",
  "communicationGoal": "What the student achieves by completing this book",
  "targetLanguageDensity": "Medium",
  "slangIdiomLevel": "Moderate",
  "overallDifficulty": "Tailored",
  "softSkills": "Communication, Critical Thinking & Active Listening",
  "culturalFocus": "Global & Multicultural",
  "units": "12 Units",
  "unitsCount": 12,
  "lessonsCount": 48,
  "video": "Yes | No",
  "coverImage": "A stable public image URL for the cover",
  "gseRange": "e.g. 25-58",
  "hoursPerLevel": "e.g. 80-120 hours",
  "digitalPlatform": "e.g. Online Practice / App",
  "methodology": "e.g. Communicative + Task-Based",
  "bestFor": "Who it suits best",
  "notIdealFor": "Who should avoid it",
  "examAlignment": "IELTS / TOEFL / Cambridge / school exams aligned?",
  "classFit": "e.g. 1-1, small groups, large classes",
  "teacherSupport": "Teacher's book, tests, slides",
  "contentsNote": "Short summary of contents",
  "keySellingPoints": ["3-5 strong selling points"],
  "components": ["Student's Book", "Workbook", "Teacher's Guide"],
  "tableOfContents": [
    { "unitNumber": 1, "unitTitle": "Unit 1: ...", "grammarFocus": "...", "vocabularyFocus": "...", "realWorldTask": "..." }
  ],
  "levelDetails": [
    { "levelCode": "B1", "title": "Level name", "description": "Level description", "unitsCount": 10, "lessonsCount": 40 }
  ]
}

Only output the JSON object. The title must match the one I provided.`;
  };

  const handleCopyCustomPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildCustomCoursebookPrompt());
      setCustomPromptCopied(true);
      setTimeout(() => setCustomPromptCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy coursebook AI prompt:', err);
      alert('Could not copy the prompt. Your browser may block clipboard access.');
    }
  };

  const handleSaveCustomCoursebook = () => {
    setCustomJsonError(null);
    let parsed: any = {};
    if (customJsonInput.trim()) {
      try {
        let text = customJsonInput.trim();
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        parsed = JSON.parse(text);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Not an object');
      } catch {
        setCustomJsonError('Invalid JSON — paste the AI response exactly as-is (JSON only), or fix the syntax and try again.');
        return;
      }
    }

    const title = ((parsed.coursebook || '').trim() || customTitle.trim());
    if (!title) {
      setCustomJsonError('A Coursebook Title is required — type it above or include "coursebook" in the JSON.');
      return;
    }

    const defaults: Partial<CoursebookDetailed> = {
      publisher: 'Custom School Syllabus',
      cefr: 'A1-B2',
      levels: '1 Level',
      targetAudience: 'Adults',
      ageGroupCategory: 'Adults',
      category: 'General English',
      module: 'General',
      primaryFocus: 'General English & Conversational Fluency',
      focusCategory: 'Integrated Skills',
      skillBalance: 'Balanced (Speaking, Listening, Reading, Writing)',
      vocabularyType: 'Core CEFR + Practical Conversational Lexis',
      accent: 'International',
      authenticity: 'Curated Custom Materials',
      realWorldTopics: 'Everyday communication, work, travel, and personal growth',
      communicationGoal: 'Build practical real-world speaking confidence and fluency',
      targetLanguageDensity: 'Medium',
      slangIdiomLevel: 'Moderate',
      overallDifficulty: 'Tailored',
      softSkills: 'Communication, Critical Thinking & Active Listening',
      culturalFocus: 'Global & Multicultural',
      units: '12 Units',
      unitsCount: 12,
      lessonsCount: 48,
      video: 'Yes',
      coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      keySellingPoints: ['Custom school syllabus', 'Tailored to your learners'],
      components: ["Student's Book", "Teacher's Guide"]
    };

    const newBook: CoursebookDetailed = {
      ...defaults,
      ...parsed,
      id: `custom-${Date.now()}`,
      coursebook: title,
      tableOfContents: parsed.tableOfContents && Array.isArray(parsed.tableOfContents) && parsed.tableOfContents.length > 0
        ? parsed.tableOfContents
        : Array.from({ length: Math.min(parsed.unitsCount || 12, 8) }).map((_, i) => ({
            unitNumber: i + 1,
            unitTitle: `Unit ${i + 1}: ${['Foundations & Greetings', 'Work & Daily Routines', 'Travel & Exploration', 'Opinions & Discussions', 'Future Plans & Ambitions', 'Culture & Society', 'Media & Technology', 'Review & Master Class'][i] || `Unit ${i + 1} Module`}`,
            grammarFocus: ['Present Simple & Continuous', 'Past Simple vs Present Perfect', 'Comparatives & Superlatives', 'Modals of Necessity & Advice', 'Future Forms (Will / Going to)', 'Conditionals Type 1 & 2', 'Passive Voice Essentials', 'Complex Sentences & Connectors'][i] || 'Target Grammar Patterns',
            vocabularyFocus: ['Introductions & Personal Details', 'Career, Office & Time Management', 'Airports, Hotels & Sightseeing', 'Agreeing, Disagreeing & Debating', 'Tech, Innovation & Career', 'Global Customs & Food', 'Digital Communication & News', 'Consolidation & Assessment'][i] || 'Key Topic Lexis',
            realWorldTask: `Complete Unit ${i + 1} practical speaking challenge`
          })),
      levelDetails: parsed.levelDetails && Array.isArray(parsed.levelDetails) ? parsed.levelDetails : undefined,
      extraResources: parsed.extraResources && Array.isArray(parsed.extraResources) ? parsed.extraResources : undefined,
      albumImages: parsed.albumImages && Array.isArray(parsed.albumImages) ? parsed.albumImages : undefined
    };

    addCoursebook(newBook);
    setActiveBook(newBook);
    setActiveTab('overview');
    setIsCreatingCustom(false);
    setCustomTitle('');
    setCustomJsonInput('');
    setCustomJsonError(null);
    setToastMessage(`"${title}" saved to your Coursebook Catalog (stored on this device — no data loss)!`);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleDownloadCatalogBackup = () => {
    const blob = new Blob([JSON.stringify(coursebooks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coursebook-catalog-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Active book extra resources list
  const activeExtraResources = activeBook ? getAllExtraResources(activeBook) : [];
  const filteredExtraResources = activeExtraResources.filter(res => {
    const matchesWhom = resourceForWhomFilter === 'All' || res.forWhom === resourceForWhomFilter || res.forWhom === 'Both';
    const matchesType = resourceTypeFilter === 'All' || res.type.toLowerCase() === resourceTypeFilter.toLowerCase();
    return matchesWhom && matchesType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 relative">
        
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white font-extrabold text-sm px-6 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-2.5 animate-bounce">
            <span>🎉</span> {toastMessage}
          </div>
        )}

        {/* Top Light Header Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl shadow-md text-white">
              📚
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                Coursebook Catalog
                <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold">
                  {filteredBooks.length} / {coursebooks.length} Titles
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Browse official ELT textbooks, inspect level syllabi & media, analyze methodology & CEFR specs, and assign active courses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (compareIds.length === 0) {
                  setToastMessage('Select coursebooks using the ⚖️ Compare button on any book card first!');
                  setTimeout(() => setToastMessage(null), 2500);
                  return;
                }
                setIsCompareViewOpen(true);
              }}
              className={`px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer border ${
                compareIds.length > 0 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Compare selected coursebooks side-by-side"
            >
              <span>⚖️</span> Compare ({compareIds.length})
            </button>

            <button
              type="button"
              onClick={() => setIsSuggesting(!isSuggesting)}
              className={`px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSuggesting
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 animate-pulse'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
              title="Step-by-step wizard that suggests the best coursebooks for your learner profile"
            >
              <span>✨</span> {isSuggesting ? 'Close Suggest Wizard' : 'Suggest Coursebooks'}
            </button>

            <button
              type="button"
              onClick={() => { setIsCreatingCustom(!isCreatingCustom); setIsSuggesting(false); }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span> {isCreatingCustom ? 'Back to Catalog' : 'Add Coursebook'}
            </button>

            <button 
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer font-bold border border-slate-200"
              title="Close Coursebook Manager"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Add Coursebook — AI-assisted creation (Title → Copy AI Prompt → Paste JSON → Save) */}
        {isCreatingCustom ? (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-800">
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>➕</span> Add Coursebook
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Type the title → ask the AI for the full catalog record → paste the JSON → Save. Everything is stored on this computer (local storage — no data loss).</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsCreatingCustom(false)}
                  className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Coursebook Title *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Intensive Medical English B2"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-black text-indigo-900 text-sm flex items-center gap-1.5">🤖 Step 1 — Copy AI Prompt</p>
                      <p className="text-[11px] text-indigo-700/80 font-medium mt-0.5">Copies detailed instructions for every section of the catalog record (CEFR, levels, table of contents, resources, methodology…). Paste into Gemini / ChatGPT / Claude.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCustomPrompt}
                      className={`px-4 py-2 rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${customPromptCopied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                      <i className={`fas ${customPromptCopied ? 'fa-check' : 'fa-clipboard-list'}`}></i>
                      {customPromptCopied ? 'Prompt Copied!' : 'Copy AI Prompt'}
                    </button>
                  </div>
                  <pre className="text-[10px] leading-relaxed text-indigo-800/70 bg-white/70 border border-indigo-100 rounded-xl p-3 overflow-auto max-h-32 whitespace-pre-wrap">{buildCustomCoursebookPrompt().slice(0, 360)}…</pre>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">📥 Step 2 — Paste the AI's JSON here</label>
                  <textarea
                    rows={9}
                    value={customJsonInput}
                    onChange={(e) => setCustomJsonInput(e.target.value)}
                    placeholder='Paste the JSON the AI returned (it fills every catalog section: publisher, cefr, levels, tableOfContents, levelDetails, resources…)'
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {customJsonError && (
                    <p className="mt-2 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                      <i className="fas fa-exclamation-triangle mt-0.5"></i> {customJsonError}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end items-center gap-3">
                  <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mr-auto">
                    <i className="fas fa-hard-drive text-emerald-500"></i> Saved automatically to this device — no data loss
                  </p>
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingCustom(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveCustomCoursebook}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md cursor-pointer"
                  >
                    ✨ Save Coursebook
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : isSuggesting ? (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-800">
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <span>✨</span> Suggest Coursebooks — Step {wizardStep} of 4
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Answer a few questions; we score every title in the catalog and show the most accurate matches.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsSuggesting(false)}
                    className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="flex gap-1.5 mt-4">
                  {[1, 2, 3, 4].map(s => (
                    <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= wizardStep ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                  ))}
                </div>

                {wizardStep === 1 && (
                  <div className="mt-5">
                    <p className="font-black text-slate-800 text-sm mb-3">👥 Who is the coursebook for?</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['All', 'Kids', 'Teenagers', 'Adults', 'Business Professionals'].map(a => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setWizAge(a)}
                          className={`px-3 py-3 rounded-xl border-2 font-extrabold text-xs transition-all cursor-pointer ${wizAge === a ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300'}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="mt-5">
                    <p className="font-black text-slate-800 text-sm mb-3">🎯 What CEFR level range do you need?</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['All', 'A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setWizCefr(c)}
                          className={`px-3 py-3 rounded-xl border-2 font-extrabold text-xs transition-all cursor-pointer ${wizCefr === c ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="mt-5">
                    <p className="font-black text-slate-800 text-sm mb-3">🏷️ Which category / focus?</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['All', 'General English', 'Business English', 'Academic English', 'Exam Preparation', 'Survival & Travel', 'Slang & Colloquial'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setWizCategory(c)}
                          className={`px-3 py-3 rounded-xl border-2 font-extrabold text-xs transition-all cursor-pointer ${wizCategory === c ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <label className="block text-slate-700 font-bold mb-1">Goal keywords (optional — e.g. speaking, exams, travel, business emails)</label>
                      <input
                        type="text"
                        value={wizGoal}
                        onChange={(e) => setWizGoal(e.target.value)}
                        placeholder="e.g. medical, IELTS, presentation, travel"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="mt-5">
                    <p className="font-black text-slate-800 text-sm mb-3">🏆 Best matches for your requirements</p>
                    {wizardResults.length > 0 ? (
                      <div className="space-y-2.5">
                        {wizardResults.map(({ book, score, reasons }, i) => {
                          const studying = getBookLearners(book);
                          return (
                            <div
                              key={book.id}
                              className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
                              onClick={() => {
                                setActiveBook(book);
                                setActiveTab('overview');
                                setSelectedTocLevelCode('All');
                                setTocSearch('');
                              }}
                            >
                              <span className="text-lg font-black text-slate-400 w-6 text-center shrink-0">{i + 1}</span>
                              <img
                                src={resolveCover(book)}
                                alt=""
                                className="w-10 h-14 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0"
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-extrabold text-sm text-slate-900 truncate">{book.coursebook}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{book.publisher} • {book.cefr} • {book.ageGroupCategory || book.targetAudience}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {reasons.slice(0, 3).map((r, j) => (
                                    <span key={j} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">✓ {r}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-black text-emerald-600 text-lg">{Math.round((score / 90) * 100)}%</div>
                                <div className="text-[9px] text-slate-400 font-bold">match</div>
                                {studying.length > 0 && (
                                  <div className="text-[9px] font-bold text-indigo-600 mt-0.5">👥 {studying.length} learner{studying.length > 1 ? 's' : ''}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400 font-semibold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No titles matched those exact requirements — loosen one filter (try "All") or add your own coursebook with <strong>➕ Add Coursebook</strong>.
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                    disabled={wizardStep === 1}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer disabled:opacity-40"
                  >
                    ← Back
                  </button>
                  {wizardStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep(s => Math.min(4, s + 1))}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md cursor-pointer"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md cursor-pointer"
                    >
                      🔁 Start Over
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-black text-slate-800 text-sm">💾 Catalog safety backup</p>
                  <p className="text-[11px] text-slate-500 font-medium">All books (official + yours) are already saved to this computer's local storage. Download a JSON backup anytime.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCatalogBackup}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs shadow-md cursor-pointer"
                >
                  <i className="fas fa-download mr-1.5"></i> Download Catalog Backup
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Filter Bar (Light Theme) */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              
              {/* Category Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                <span className="text-slate-500 uppercase tracking-wider text-[11px] shrink-0 mr-1">Category:</span>
                {categoryTabs.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryTab(cat)}
                    className={`px-3.5 py-1.5 rounded-xl font-extrabold transition-all shrink-0 cursor-pointer ${
                      selectedCategoryTab === cat 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Box + Filters Grid */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[280px]">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search titles, authors, publishers, GSE, digital platforms or methodology..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-8 py-2.5 text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  />
                  {searchQuery && (
                    <button 
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
                    <span className="text-slate-500">Audience:</span>
                    <select 
                      value={selectedAgeGroup} 
                      onChange={(e) => setSelectedAgeGroup(e.target.value)}
                      className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
                    >
                      {ageGroups.map(ag => (
                        <option key={ag} value={ag}>{ag}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
                    <span className="text-slate-500">CEFR:</span>
                    <select 
                      value={selectedCefr} 
                      onChange={(e) => setSelectedCefr(e.target.value)}
                      className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
                    >
                      {cefrLevels.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
                    <span className="text-slate-500">Publisher:</span>
                    <select 
                      value={selectedPublisher} 
                      onChange={(e) => setSelectedPublisher(e.target.value)}
                      className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
                    >
                      {publishers.map(pub => (
                        <option key={pub} value={pub}>{pub}</option>
                      ))}
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <button 
                      type="button"
                      onClick={resetAllFilters}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-all cursor-pointer"
                    >
                      Reset Filters ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Book Gallery Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBooks.map((book) => {
                  return (
                    <div 
                      key={book.id || book.coursebook}
                      onClick={() => {
                        setActiveBook(book);
                        setActiveTab('overview');
                        setSelectedTocLevelCode('All');
                        setTocSearch('');
                      }}
                      className={`bg-white border rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group relative shadow-sm cursor-pointer ${
                        compareIds.includes(book.id)
                          ? 'border-amber-500 ring-2 ring-amber-400/30 shadow-md bg-amber-50/20'
                          : 'border-slate-200 hover:border-indigo-500 hover:shadow-xl'
                      }`}
                    >
                      <div>
                        {/* Book Cover Photo + Badges Header */}
                        <div className="flex items-start gap-3.5 mb-3">
                          <div className="w-20 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative shadow-md">
                            <img 
                              src={resolveCover(book)} 
                              alt={book.coursebook} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={e => { e.currentTarget.src = FALLBACK_COVER; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5 text-[10px] font-bold text-white">
                              <span>🎥 Click to Inspect</span>
                            </div>
                            {compareIds.includes(book.id) && (
                              <div className="absolute top-1 left-1 bg-amber-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow">
                                ⚖️ Comparing
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {book.cefr}
                              </span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                {book.ageGroupCategory || 'Adults'}
                              </span>
                              {book.editionYear && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                  {book.editionYear}
                                </span>
                              )}
                            </div>

                            <h3 className="font-extrabold text-base text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {book.coursebook}
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold mt-1">
                              {book.publisher} {book.authors ? `• ${book.authors.split(',')[0]}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Specs Badges Row */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5 text-[10px] font-bold">
                          {book.gseRange && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200" title="Global Scale of English Range">
                              📊 GSE: {book.gseRange}
                            </span>
                          )}
                          {book.digitalPlatform && (
                            <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 truncate max-w-[140px]" title={`Platform: ${book.digitalPlatform}`}>
                              💻 {book.digitalPlatform.split('/')[0]}
                            </span>
                          )}
                          {book.hoursPerLevel && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200" title="Hours per level">
                              ⏱️ {book.hoursPerLevel}
                            </span>
                          )}
                        </div>

                        {/* Key Selling Points Tags */}
                        {book.keySellingPoints && book.keySellingPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {book.keySellingPoints.slice(0, 2).map((point, i) => (
                              <span key={i} className="text-[10px] font-semibold bg-indigo-50/70 text-indigo-900 px-2 py-0.5 rounded-md border border-indigo-100 line-clamp-1">
                                ✨ {point}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Focus & Audience Summary */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3 space-y-1 text-xs">
                          <p className="text-slate-700 font-medium line-clamp-1">
                            🎯 <strong className="text-slate-900">Focus:</strong> {book.primaryFocus}
                          </p>
                          <p className="text-slate-600 text-[11px] line-clamp-1">
                            📖 <strong className="text-slate-800">Syllabus:</strong> {book.units || '12 Units'} ({getEnrichedLevelDetails(book).length} CEFR Band Levels)
                          </p>
                        </div>

                        {/* Learners currently studying this coursebook */}
                        {getBookLearners(book).length > 0 && (
                          <div className="mb-3 px-2.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-2" title={getBookLearners(book).map(l => `${l.name} (${l.coursePlan?.level || l.coursePlan?.targetLevel || l.cefrLevel || l.level || ''})`).join('\n')}>
                            <span className="text-sm">👥</span>
                            <span className="text-[10px] font-extrabold text-indigo-800">
                              {getBookLearners(book).length} learner{getBookLearners(book).length > 1 ? 's' : ''} studying this
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Action Controls */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBook(book);
                            setActiveTab('overview');
                            setSelectedTocLevelCode('All');
                            setTocSearch('');
                          }}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 border border-indigo-200/80 shadow-sm"
                        >
                          <span>📖 Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompareBook(book.id);
                          }}
                          className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border shadow-sm ${
                            compareIds.includes(book.id)
                              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 font-extrabold'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                          title={compareIds.includes(book.id) ? 'Remove from comparison' : 'Add to side-by-side comparison'}
                        >
                          <span>{compareIds.includes(book.id) ? '✔ Comparing' : '⚖️ Compare'}</span>
                        </button>

                        {book.id?.startsWith('custom-') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCoursebook(book.id);
                              if (activeBook?.id === book.id) setActiveBook(null);
                            }}
                            className="px-2.5 py-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs hover:bg-rose-100 font-bold cursor-pointer"
                            title="Delete custom title"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredBooks.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div className="text-4xl mb-2">🔍</div>
                    <h3 className="text-lg font-extrabold text-slate-900 mb-1">No coursebooks found</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      No coursebooks match your search criteria. Try clearing filters or create a custom coursebook above.
                    </p>
                    <button 
                      type="button"
                      onClick={resetAllFilters}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white font-extrabold rounded-xl text-xs cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Bottom Comparison Action Bar */}
            {compareIds.length > 0 && !isCompareViewOpen && (
              <div className="px-6 py-3.5 bg-slate-900 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xl z-30 animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-extrabold text-lg shadow">
                    ⚖️
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-2">
                      Side-by-Side Comparison ({compareIds.length} / 4 Selected)
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {compareBooks.map(b => (
                        <span key={b.id} className="text-[11px] font-bold bg-slate-800 text-amber-300 px-2 py-0.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
                          {b.coursebook}
                          <button 
                            type="button" 
                            onClick={() => toggleCompareBook(b.id)}
                            className="text-slate-400 hover:text-white font-black"
                            title="Remove from compare"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearCompare}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer transition-all"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCompareViewOpen(true)}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>⚖️</span> View Side-by-Side Matrix ({compareIds.length})
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Side-by-Side Comparison Matrix Screen Modal */}
      {isCompareViewOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
            
            {/* Header Bar */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 flex flex-wrap justify-between items-center gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg">
                  ⚖️
                </div>
                <div>
                  <h3 className="font-black text-xl text-white tracking-tight flex items-center gap-2">
                    Coursebook Side-by-Side Comparison Matrix
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold">
                      {compareBooks.length} Books
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Analyze target audience, CEFR alignment, GSE ratings, syllabus structure, methodology, and digital platforms side-by-side
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {compareBooks.length < 4 && (
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          toggleCompareBook(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 outline-none cursor-pointer"
                    >
                      <option value="">➕ Add Book to Compare...</option>
                      {coursebooks
                        .filter(b => !compareIds.includes(b.id))
                        .map(b => (
                          <option key={b.id} value={b.id}>
                            {b.coursebook} ({b.publisher})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={clearCompare}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 font-extrabold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Clear Selection
                </button>

                <button
                  type="button"
                  onClick={() => setIsCompareViewOpen(false)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Back to Gallery
                </button>
              </div>
            </div>

            {/* Matrix Body Container */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              {compareBooks.length === 0 ? (
                <div className="py-20 text-center space-y-4 max-w-md mx-auto">
                  <div className="text-5xl">⚖️</div>
                  <h4 className="text-lg font-black text-slate-900">No Coursebooks Selected for Comparison</h4>
                  <p className="text-xs text-slate-600">Select 2 to 4 coursebooks from the catalog to compare their specs and syllabus side-by-side.</p>
                  <button
                    type="button"
                    onClick={() => setIsCompareViewOpen(false)}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
                  >
                    Browse Coursebook Catalog
                  </button>
                </div>
              ) : (
                <div className="min-w-[700px] bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden text-xs">
                  
                  {/* Table Header Row: Covers, Titles & Select Buttons */}
                  <div className="grid border-b border-slate-200 bg-slate-100/80 sticky top-0 z-20" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-4 font-black text-slate-700 uppercase tracking-wider text-[11px] border-r border-slate-200 flex items-center bg-slate-100">
                      Feature / Specs
                    </div>
                    {compareBooks.map(book => (
                      <div key={book.id} className="p-4 border-r border-slate-200 last:border-r-0 flex flex-col justify-between gap-3 bg-white">
                        <div className="flex gap-3 items-start">
                          <img 
                            src={resolveCover(book)} 
                            alt={book.coursebook} 
                            className="w-16 h-22 object-cover rounded-xl border border-slate-200 shadow shrink-0"
                            onError={e => { e.currentTarget.src = FALLBACK_COVER; }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block mb-1">
                              {book.cefr}
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                              {book.coursebook}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              {book.publisher} {book.editionYear ? `(${book.editionYear})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleSelectBookAsCourse(book)}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1"
                          >
                            <span>✅ Select Course</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCompareBook(book.id)}
                            className="p-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl border border-rose-200 font-bold cursor-pointer"
                            title="Remove from comparison"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 1: Target Audience & Age Group */}
                  <div className="grid border-b border-slate-200 hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>👥 Target Audience</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 font-medium text-slate-700">
                        <span className="font-extrabold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[11px]">
                          {b.ageGroupCategory || 'Adults'}
                        </span>
                        <p className="mt-1 text-slate-600 text-[11px] leading-relaxed">{b.targetAudience}</p>
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 2: CEFR & GSE Range */}
                  <div className="grid border-b border-slate-200 hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>📊 CEFR & GSE Specs</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
                            CEFR: {b.cefr}
                          </span>
                          {b.gseRange && (
                            <span className="font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                              GSE: {b.gseRange}
                            </span>
                          )}
                        </div>
                        {b.hoursPerLevel && (
                          <p className="text-[11px] text-slate-500 font-semibold mt-1">⏱️ {b.hoursPerLevel} per level</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 3: Category & Focus */}
                  <div className="grid border-b border-slate-200 hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>🎯 Pedagogical Focus</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1">
                        <p className="font-extrabold text-slate-900">{b.primaryFocus}</p>
                        <p className="text-slate-500 text-[11px]">{b.communicationGoal || b.category}</p>
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 4: Units & Lesson Count */}
                  <div className="grid border-b border-slate-200 hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>📖 Syllabus Volume</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 font-medium text-slate-700">
                        <p className="font-extrabold text-slate-900">{b.units || '12 Units'} ({getEnrichedLevelDetails(b).length} CEFR Band Levels)</p>
                        <p className="text-[11px] text-slate-500">~{b.lessonsCount || 48} total guided interactive lessons</p>
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 5: Methodology & Skill Balance */}
                  <div className="grid border-b border-slate-200 hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>⚙️ Methodology & Skills</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1 text-[11px] text-slate-700">
                        {b.methodology && <p><strong className="text-slate-900">Method:</strong> {b.methodology}</p>}
                        {b.skillBalance && <p><strong className="text-slate-900">Skills:</strong> {b.skillBalance}</p>}
                        {b.authenticity && <p><strong className="text-slate-900">Content:</strong> {b.authenticity}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 6: Key Selling Points */}
                  <div className="grid border-b border-slate-200 hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>✨ Key Highlights</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                        {b.keySellingPoints && b.keySellingPoints.length > 0 ? (
                          <ul className="space-y-1 text-[11px] text-indigo-950">
                            {b.keySellingPoints.map((pt, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-amber-500 font-bold shrink-0">•</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400 italic">Standard ELT Curriculum</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 7: Best For vs Not Ideal For */}
                  <div className="grid border-b border-slate-200 hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>💡 Class Fit & Suitability</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1.5 text-[11px]">
                        {b.bestFor && (
                          <p className="bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200">
                            <strong>👍 Best for:</strong> {b.bestFor}
                          </p>
                        )}
                        {b.notIdealFor && (
                          <p className="bg-rose-50 text-rose-900 p-2 rounded-lg border border-rose-200">
                            <strong>👎 Not ideal for:</strong> {b.notIdealFor}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 8: Digital Platform & Video */}
                  <div className="grid border-b border-slate-200 hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>💻 Digital Platform & Media</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1 font-medium text-slate-700">
                        {b.digitalPlatform && (
                          <p className="font-extrabold text-sky-800">💻 {b.digitalPlatform}</p>
                        )}
                        <p className="text-[11px] text-slate-600">
                          🎥 Video Support: <strong className="text-slate-900">{b.video || 'Yes'}</strong>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Spec Row 9: Teacher Support & Resources */}
                  <div className="grid hover:bg-slate-50/80 transition-colors" style={{ gridTemplateColumns: `200px repeat(${compareBooks.length}, minmax(0, 1fr))` }}>
                    <div className="p-3.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 flex items-center gap-1.5">
                      <span>🎁 Teacher Support & Packs</span>
                    </div>
                    {compareBooks.map(b => (
                      <div key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1 text-[11px] text-slate-700">
                        {b.teacherSupport && <p><strong>Teacher Pack:</strong> {b.teacherSupport}</p>}
                        <p className="text-indigo-700 font-bold">🎁 {getAllExtraResources(b).length} Extra Resources Available</p>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>

            {/* Matrix Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Comparing {compareBooks.length} coursebook titles side-by-side
              </span>
              <button
                type="button"
                onClick={() => setIsCompareViewOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all"
              >
                Close Comparison
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Detailed Syllabus & Media Inspection Modal (Light Theme, Premium Look) */}
      {activeBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
            
            {/* Premium Light Detail Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-purple-50/80 border-b border-slate-200 flex justify-between items-start gap-4 shrink-0">
              <div className="flex gap-4 items-start">
                <div className="w-20 h-28 rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-white shrink-0 relative group">
                  <img 
                    src={resolveCover(activeBook)} 
                    alt={activeBook.coursebook} 
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.src = FALLBACK_COVER; }}
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-md">Preview</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="bg-indigo-600 text-white font-black text-xs px-2.5 py-0.5 rounded-lg shadow-sm">
                      {activeBook.cefr}
                    </span>
                    <span className="bg-purple-100 text-purple-800 font-extrabold text-xs px-2.5 py-0.5 rounded-lg border border-purple-200">
                      {activeBook.publisher}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {activeBook.category || 'General English'}
                    </span>
                    <span className="bg-amber-100 text-amber-800 font-extrabold text-xs px-2.5 py-0.5 rounded-lg border border-amber-200">
                      {activeBook.ageGroupCategory || activeBook.targetAudience}
                    </span>
                    {activeBook.gseRange && (
                      <span className="bg-teal-100 text-teal-900 font-extrabold text-xs px-2.5 py-0.5 rounded-lg border border-teal-200">
                        GSE: {activeBook.gseRange}
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-snug">
                    {activeBook.coursebook}
                  </h3>

                  {activeBook.authors && (
                    <p className="text-xs text-slate-600 font-bold mt-0.5">
                      ✍️ Authors: {activeBook.authors} {activeBook.editionYear ? `(${activeBook.editionYear})` : ''}
                    </p>
                  )}

                  <p className="text-xs text-slate-600 font-semibold mt-1 flex items-center gap-2 flex-wrap">
                    <span>🎯 {activeBook.primaryFocus}</span>
                    <span>•</span>
                    <span>📖 {activeBook.units || '12 Units'} ({activeBook.lessonsCount || 48} Lessons)</span>
                    {activeBook.digitalPlatform && (
                      <>
                        <span>•</span>
                        <span>💻 Platform: {activeBook.digitalPlatform}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {activeBook.publisherUrl && (
                  <a
                    href={activeBook.publisherUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="Visit official publisher catalogue page"
                  >
                    <span>🔗</span> Official Site
                  </a>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCoverPanelOpen(o => !o)}
                    className={`px-3 py-2 font-bold text-xs rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${coverOverrides[activeBook.id] ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
                    title="Upload or paste the official cover image — stored locally on this device"
                  >
                    <span>🖼️</span> {coverOverrides[activeBook.id] ? 'Cover Set' : 'Set Cover'}
                  </button>
                  {coverPanelOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 text-left">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Official cover — stored locally, no data loss</p>
                      <input
                        ref={coverFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverFile}
                      />
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all mb-2"
                      >
                        📤 Upload image from device
                      </button>
                      <input
                        value={coverUrlDraft}
                        onChange={e => setCoverUrlDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCoverUrlSave(); }}
                        placeholder="…or paste an image URL (http… or /coursebook-covers/…)"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 mb-2"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCoverUrlSave}
                          className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all"
                        >
                          Save URL
                        </button>
                        {coverOverrides[activeBook.id] && (
                          <button
                            type="button"
                            onClick={() => { setCoverOverride(activeBook.id, ''); setCoverPanelOpen(false); }}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition-all"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold mt-2 leading-snug">
                        Uploads are stored in this app's local storage on this computer; pasted paths like /coursebook-covers/get-on-1.jpg render from the public folder.
                      </p>
                    </div>
                  )}
                </div>

                <button 
                  type="button"
                  onClick={() => handleSelectBookAsCourse(activeBook)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  title="Assign this coursebook as the active syllabus"
                >
                  <span>✅</span> Select Coursebook
                </button>

                <button 
                  type="button"
                  onClick={() => setActiveBook(null)}
                  className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold border border-slate-200 cursor-pointer shadow-sm transition-all"
                  title="Close inspection"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Navigation Tabs (Light Theme Premium) */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 text-xs font-extrabold shrink-0 gap-1 overflow-x-auto">
              <button 
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'overview' 
                    ? 'border-indigo-600 text-indigo-700 bg-white font-black shadow-sm' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <span>📋</span> Pedagogical Overview
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('toc')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'toc' 
                    ? 'border-indigo-600 text-indigo-700 bg-white font-black shadow-sm' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <span>📖</span> List of Contents ({getEnrichedTableOfContents(activeBook, tocDisplayLevelCode).length} Units)
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('levels')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'levels' 
                    ? 'border-indigo-600 text-indigo-700 bg-white font-black shadow-sm' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <span>🗺️</span> Levels & CEFR Roadmap ({getEnrichedLevelDetails(activeBook).length} Bands)
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('resources')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'resources' 
                    ? 'border-indigo-600 text-indigo-700 bg-white font-black shadow-sm' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <span>🎁</span> Teacher Pack & Extra Resources ({activeExtraResources.length})
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('media')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'media' 
                    ? 'border-indigo-600 text-indigo-700 bg-white font-black shadow-sm' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <span>🎥</span> Video Walkthrough & Gallery ({getEnrichedAlbumImages(activeBook, coverOverrides).length} Photos)
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('learners')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'learners' 
                    ? 'border-indigo-600 text-indigo-700 bg-white font-black shadow-sm' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <span>👥</span> Learners Studying This ({getBookLearners(activeBook).length})
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
              
              {/* Tab 1: Pedagogical Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-fade-in text-xs text-slate-700">
                  
                  {/* Communication Goal Callout */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 p-4 rounded-2xl space-y-1.5 shadow-sm">
                    <span className="font-extrabold text-indigo-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      💡 Communication & Teaching Objective
                    </span>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                      {activeBook.communicationGoal || 'Develop authentic conversational confidence, grammatical accuracy, and functional listening agility for real-world interactions.'}
                    </p>
                  </div>

                  {/* Key Selling Points Section */}
                  {activeBook.keySellingPoints && activeBook.keySellingPoints.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-extrabold text-slate-900 text-xs block">
                        ✨ Key Highlights & Unique Selling Points
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeBook.keySellingPoints.map((point, idx) => (
                          <div key={idx} className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-indigo-950 font-semibold flex items-start gap-2">
                            <span className="text-indigo-600 shrink-0">✔</span>
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Core Attributes Grid (12 Detailed Fields) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">CEFR & GSE Range</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.cefr} {activeBook.gseRange ? `(GSE ${activeBook.gseRange})` : ''}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Hours per Level</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.hoursPerLevel || 'About 80–120 hours'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Digital LMS Platform</span>
                      <span className="font-extrabold text-slate-900 text-xs block truncate" title={activeBook.digitalPlatform}>{activeBook.digitalPlatform || 'Publisher Online Portal'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Teacher Support Level</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.teacherSupport || 'High — Full Teacher Guide & Test Generator'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Skill Balance</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.skillBalance || 'Balanced 4-Skills Integration'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Vocabulary Lexis</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.vocabularyType || 'Conversational & Core CEFR Lexis'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Accent</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.accent || 'International Standard'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Authentic Material</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.authenticity || 'Real-World Articles & Audio'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Classroom Settings Fit</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.classFit || '1-on-1 tutoring, small groups, online & hybrid'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Slang & Idioms</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.slangIdiomLevel || 'Moderate Practical Idioms'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Overall Difficulty</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.overallDifficulty || 'Standard CEFR progression'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Syllabus Structure</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{activeBook.units || '12 Units'} ({activeBook.lessonsCount || 48} Lessons)</span>
                    </div>
                  </div>

                  {/* Teaching Methodology Approach */}
                  {activeBook.methodology && (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-1">
                      <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                        🧠 Pedagogical Methodology & Approach
                      </span>
                      <p className="text-emerald-900 font-medium leading-relaxed">
                        {activeBook.methodology}
                      </p>
                    </div>
                  )}

                  {/* Best For / Not Ideal For Fit */}
                  {(activeBook.bestFor || activeBook.notIdealFor) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {activeBook.bestFor && (
                        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
                          <span className="font-bold text-emerald-950 block text-xs">🎯 Best Suited For:</span>
                          <p className="text-emerald-900 font-medium">{activeBook.bestFor}</p>
                        </div>
                      )}

                      {activeBook.notIdealFor && (
                        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1">
                          <span className="font-bold text-amber-950 block text-xs">⚠️ Not Ideal For:</span>
                          <p className="text-amber-900 font-medium">{activeBook.notIdealFor}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Exam Alignment */}
                  {activeBook.examAlignment && (
                    <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-1">
                      <span className="font-extrabold text-sky-950 text-xs flex items-center gap-1.5">
                        🎓 Exam Alignment & International Validation
                      </span>
                      <p className="text-sky-900 font-medium leading-relaxed">
                        {activeBook.examAlignment}
                      </p>
                    </div>
                  )}

                  {/* Course Components */}
                  {activeBook.components && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        📦 Series Physical & Digital Components
                      </span>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {activeBook.components}
                      </p>
                    </div>
                  )}

                  {/* Real World Topics */}
                  {activeBook.realWorldTopics && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        🌍 Real-World Topics & Themes Covered
                      </span>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        {activeBook.realWorldTopics}
                      </p>
                    </div>
                  )}

                  {/* Soft Skills & Cultural Focus */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-1">
                      <span className="font-bold text-purple-900 block text-xs">🧠 Soft Skills & Competencies</span>
                      <p className="text-purple-800 font-medium">{activeBook.softSkills || 'Critical thinking, active listening, collaboration & presentation skills.'}</p>
                    </div>

                    <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1">
                      <span className="font-bold text-amber-900 block text-xs">🌐 Cultural Focus</span>
                      <p className="text-amber-800 font-medium">{activeBook.culturalFocus || 'Global multicultural perspectives and international etiquette.'}</p>
                    </div>
                  </div>

                  {/* Quick Video Trailer Preview in Overview */}
                  <div className="pt-2">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                          🎬 Video Overview & Course Walkthrough
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setActiveTab('media')}
                          className="text-[11px] font-extrabold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          Open Media Gallery →
                        </button>
                      </div>
                      
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative border border-slate-800">
                        <iframe 
                          src={`https://www.youtube.com/embed/${getValidYoutubeVideoId(activeBook)}`} 
                          title={activeBook.youtubeTitle || `${activeBook.coursebook} Overview Video`}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Table of Contents (List of Contents) */}
              {activeTab === 'toc' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Level Selector for Series with Multiple Levels */}
                  {activeBook.levelDetails && activeBook.levelDetails.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                        Select Level:
                      </span>

                      {activeBook.levelDetails.map(lvl => (
                        <div key={lvl.levelCode} className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            draggable
                            onDragStart={(e) => handleTocDragStart(e, lvl.levelCode)}
                            onDragOver={handleTocDragOver}
                            onDrop={(e) => handleTocDrop(e, lvl.levelCode)}
                            onDragEnd={handleTocDragEnd}
                            onClick={() => setSelectedTocLevelCode(lvl.levelCode)}
                            title="Drag to reorder this level"
                            className={`px-3 py-1 rounded-xl text-xs font-black cursor-grab active:cursor-grabbing transition-all select-none ${
                              tocDisplayLevelCode === lvl.levelCode
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                            } ${dragLevelCode === lvl.levelCode ? 'opacity-40 ring-2 ring-indigo-400' : ''}`}
                          >
                            <span className="mr-0.5 opacity-70">≡</span>{lvl.levelCode} ({lvl.title.split('-')[1] || lvl.title})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTocLevel(lvl.levelCode)}
                            className="opacity-40 hover:opacity-100 p-1 rounded-full text-[11px] leading-none text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title={'Delete level ' + lvl.levelCode}
                          >
                            🗑
                          </button>
                        </div>
                      ))}

                      {/* ➕ Add another level for this book */}
                      {addingLevel ? (
                        <div className="flex items-center gap-1.5 shrink-0 bg-white border-2 border-emerald-300 rounded-xl px-2 py-1">
                          <input
                            autoFocus
                            type="text"
                            value={newLevelCode}
                            onChange={(e) => setNewLevelCode(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTocLevel(); if (e.key === 'Escape') { setAddingLevel(false); setNewLevelCode(''); } }}
                            placeholder="e.g. C1 / B2+"
                            className="w-20 bg-transparent text-xs font-black text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-semibold"
                          />
                          <button type="button" onClick={handleAddTocLevel} className="text-[11px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg cursor-pointer">
                            Add
                          </button>
                          <button type="button" onClick={() => { setAddingLevel(false); setNewLevelCode(''); }} className="text-[11px] font-black text-slate-400 hover:text-rose-500 px-1 cursor-pointer" title="Cancel">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setNewLevelCode(''); setAddingLevel(true); }}
                          className="px-3 py-1 rounded-xl text-xs font-black cursor-pointer shrink-0 bg-white text-emerald-700 hover:bg-emerald-50 border-2 border-dashed border-emerald-300 transition-all"
                          title="Add another level to this book — drag the chips afterwards to put it in place"
                        >
                          ＋ Add Level
                        </button>
                      )}
                    </div>
                  )}

                  {activeBook.levelDetails && activeBook.levelDetails.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold -mt-1 px-1">
                      <span className="cursor-help" title="Drag any chip left or right to change the order of the levels.">↔️ Drag the level chips to reorder.</span>
                      <span className="opacity-70">·</span>
                      <span>➕ Add Level creates a new band — then copy the AI prompt and paste its real table of contents.</span>
                    </div>
                  )}

                  {/* 🤖 TOC AI tools — copy prompt for the external AI, then paste & save its JSON */}
                  <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 border border-indigo-200 rounded-2xl p-3">
                    <div className="flex-1 min-w-[220px]">
                      <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>🤖</span> Get the exact Table of Contents from the printed book
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium leading-snug mt-1">
                        {tocDisplayLevelCode ? (
                          <>Copy the prompt, send it to the AI together with the printed contents pages of <strong className="text-indigo-700">{activeBook.coursebook} — {tocDisplayLevelCode}</strong>, then paste the returned JSON here.</>
                        ) : (
                          <>Copy the prompt, send it to the AI together with the printed contents pages of <strong className="text-indigo-700">{activeBook.coursebook}</strong>, then paste the returned JSON here.</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={copyTocAiPrompt}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 border ${
                          tocPromptCopied ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-600 hover:text-white'
                        }`}
                        title="Copy the AI prompt describing the exact TOC JSON we need"
                      >
                        <span>{tocPromptCopied ? '✓' : '📋'}</span> {tocPromptCopied ? 'Prompt Copied!' : 'Copy AI Prompt'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTocPasteOpen(!tocPasteOpen); setTocPasteError(null); }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 border ${
                          tocPasteOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                        title="Paste the JSON the AI returned and save it for this book/level"
                      >
                        <span>{tocPasteOpen ? '▲' : '📥'}</span> {tocPasteOpen ? 'Close' : 'Paste AI JSON & Save'}
                      </button>
                    </div>
                  </div>

                  {tocPasteOpen && (
                    <div className="p-3 bg-white border-2 border-indigo-200 rounded-2xl space-y-2 shadow-sm">
                      <textarea
                        value={tocPasteJson}
                        onChange={(e) => { setTocPasteJson(e.target.value); setTocPasteError(null); }}
                        rows={7}
                        placeholder={`Paste the JSON the AI returned here. It replaces the unit list of ${tocDisplayLevelCode ? 'level ' + tocDisplayLevelCode : 'this book'}.`}
                        className="w-full text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-400 resize-y"
                      />
                      {tocPasteError && <div className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">{tocPasteError}</div>}
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { setTocPasteOpen(false); setTocPasteJson(''); setTocPasteError(null); }}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveTocPastedJson}
                          disabled={!tocPasteJson.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          💾 Save TOC for {tocDisplayLevelCode ? tocDisplayLevelCode : activeBook.coursebook}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TOC Filter Search Bar */}
                  <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                      <input 
                        type="text" 
                        placeholder="Search units, grammar patterns, vocabulary, exam focus..." 
                        value={tocSearch}
                        onChange={(e) => setTocSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <span className="text-xs font-extrabold text-slate-500 shrink-0">
                      Showing {getEnrichedTableOfContents(activeBook, tocDisplayLevelCode).filter(u => 
                        !tocSearch || 
                        u.unitTitle.toLowerCase().includes(tocSearch.toLowerCase()) || 
                        u.grammarFocus.toLowerCase().includes(tocSearch.toLowerCase()) ||
                        u.vocabularyFocus.toLowerCase().includes(tocSearch.toLowerCase()) ||
                        (u.examFocus && u.examFocus.toLowerCase().includes(tocSearch.toLowerCase())) ||
                        (u.skillsFocus && u.skillsFocus.toLowerCase().includes(tocSearch.toLowerCase()))
                      ).length} Units
                    </span>
                  </div>

                  {/* Units List */}
                  <div className="space-y-3">
                    {getEnrichedTableOfContents(activeBook, tocDisplayLevelCode)
                      .filter(u => 
                        !tocSearch || 
                        u.unitTitle.toLowerCase().includes(tocSearch.toLowerCase()) || 
                        u.grammarFocus.toLowerCase().includes(tocSearch.toLowerCase()) ||
                        u.vocabularyFocus.toLowerCase().includes(tocSearch.toLowerCase()) ||
                        (u.examFocus && u.examFocus.toLowerCase().includes(tocSearch.toLowerCase())) ||
                        (u.skillsFocus && u.skillsFocus.toLowerCase().includes(tocSearch.toLowerCase()))
                      )
                      .map((unit) => (
                        <div 
                          key={unit.unitNumber} 
                          className="p-4 bg-slate-50 hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all space-y-2.5 shadow-sm group"
                        >
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2 flex-wrap gap-2">
                            <span className="font-black text-sm text-indigo-900 group-hover:text-indigo-600 transition-colors">
                              {unit.unitTitle}
                            </span>
                            <span className="flex items-center gap-1.5 flex-wrap">
                              {unit.pageRange && (
                                <span className="text-[11px] font-extrabold bg-teal-100 text-teal-800 px-3 py-0.5 rounded-full border border-teal-200">
                                  📄 {unit.pageRange}
                                </span>
                              )}
                              <span className="text-[11px] font-extrabold bg-indigo-100 text-indigo-800 px-3 py-0.5 rounded-full border border-indigo-200">
                                Unit {unit.unitNumber}
                              </span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                              <strong className="text-slate-900 font-bold block mb-0.5 flex items-center gap-1">
                                📐 Grammar Focus
                              </strong>
                              <span className="text-slate-700 font-medium">{unit.grammarFocus}</span>
                            </div>

                            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                              <strong className="text-slate-900 font-bold block mb-0.5 flex items-center gap-1">
                                🔤 Vocabulary Focus
                              </strong>
                              <span className="text-slate-700 font-medium">{unit.vocabularyFocus}</span>
                            </div>
                          </div>

                          {unit.skillsFocus && (
                            <div className="text-xs bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-purple-950 flex items-start gap-2">
                              <span className="shrink-0">🎧</span>
                              <div>
                                <strong className="font-bold">Integrated Skills & Communication:</strong> {unit.skillsFocus}
                              </div>
                            </div>
                          )}

                          {unit.examFocus && (
                            <div className="text-xs bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-950 flex items-start gap-2">
                              <span className="shrink-0">🎓</span>
                              <div>
                                <strong className="font-bold">Exam Task Practice:</strong> {unit.examFocus}
                              </div>
                            </div>
                          )}

                          {unit.realWorldTask && (
                            <div className="text-xs bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 flex items-start gap-2">
                              <span className="shrink-0">🎯</span>
                              <div>
                                <strong className="font-bold">Real-World Speaking Task:</strong> {unit.realWorldTask}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {getEnrichedTableOfContents(activeBook, tocDisplayLevelCode).filter(u =>
                        !tocSearch ||
                        u.unitTitle.toLowerCase().includes(tocSearch.toLowerCase()) ||
                        u.grammarFocus.toLowerCase().includes(tocSearch.toLowerCase()) ||
                        u.vocabularyFocus.toLowerCase().includes(tocSearch.toLowerCase()) ||
                        (u.examFocus && u.examFocus.toLowerCase().includes(tocSearch.toLowerCase())) ||
                        (u.skillsFocus && u.skillsFocus.toLowerCase().includes(tocSearch.toLowerCase()))
                      ).length === 0 && (
                        <div className="text-center py-10 px-6 bg-white border-2 border-dashed border-indigo-200 rounded-2xl">
                          <div className="text-3xl mb-2">📄</div>
                          <h4 className="text-sm font-black text-slate-800 mb-1">
                            No units listed yet for {tocDisplayLevelCode ? 'level ' + tocDisplayLevelCode : 'this book'}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                            Copy the AI prompt above, send it together with the printed contents pages, then paste the returned JSON and press 💾 Save.
                          </p>
                          <button
                            type="button"
                            onClick={() => { setTocPasteOpen(true); }}
                            className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
                          >
                            📥 Paste AI JSON
                          </button>
                        </div>
                      )}
                  </div>

                  {activeBook.contentsNote && (
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium">
                      ℹ️ <strong>Source Note:</strong> {activeBook.contentsNote}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Levels Breakdown */}
              {activeTab === 'levels' && (
                <div className="space-y-4 animate-fade-in text-xs text-slate-700">
                  <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-1">
                    <h4 className="font-extrabold text-sm text-purple-900 flex items-center gap-1.5">
                      🗺️ CEFR Level Coverage & Series Roadmap
                    </h4>
                    <p className="text-purple-800 font-medium">
                      Official level distribution for <strong className="text-purple-950">{activeBook.coursebook}</strong> ({activeBook.levels || activeBook.cefr})
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5">
                    {getEnrichedLevelDetails(activeBook).map((lvl) => (
                      <div key={lvl.levelCode} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md">
                              {lvl.levelCode}
                            </span>
                            <span className="font-extrabold text-sm text-slate-900">{lvl.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">
                              {lvl.unitsCount} Units • {lvl.lessonsCount} Lessons
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTocLevelCode(lvl.levelCode);
                                setActiveTab('toc');
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 cursor-pointer"
                            >
                              Inspect Level TOC →
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-600 font-medium leading-relaxed">
                          {lvl.description}
                        </p>

                        {lvl.contentsSource && (
                          <div className="text-[11px] text-slate-400 italic">
                            Source: {lvl.contentsSource}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <strong className="text-slate-900 font-black block text-xs">
                      🎓 Teacher & Student Benefits:
                    </strong>
                    <ul className="space-y-1.5 text-slate-600 font-medium">
                      <li className="flex items-center gap-2">✓ Structured grammar and vocabulary progression matching international CEFR benchmarks.</li>
                      <li className="flex items-center gap-2">✓ High-frequency functional lexis designed for immediate real-world speaking application.</li>
                      <li className="flex items-center gap-2">✓ Built-in speaking assessments and homework tasks for automated evaluation.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 4: Teacher Pack & Extra Resources (NEW TAB) */}
              {activeTab === 'resources' && (
                <div className="space-y-4 animate-fade-in text-xs text-slate-700">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-purple-950 flex items-center gap-1.5">
                        🎁 Teacher Pack, Digital LMS & Extra Resources ({activeExtraResources.length})
                      </h4>
                      <p className="text-purple-800 font-medium">
                        Supplementary tests, audio, video banks, workbooks, and digital platforms available for {activeBook.coursebook}
                      </p>
                    </div>

                    {activeBook.publisherUrl && (
                      <a 
                        href={activeBook.publisherUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        Publisher Portal ↗
                      </a>
                    )}
                  </div>

                  {/* Filter controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">For Whom:</span>
                      {(['All', 'Teachers', 'Learners', 'Both'] as const).map(whom => (
                        <button
                          key={whom}
                          type="button"
                          onClick={() => setResourceForWhomFilter(whom)}
                          className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                            resourceForWhomFilter === whom
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {whom}
                        </button>
                      ))}
                    </div>

                    <div className="text-slate-500 font-bold text-xs">
                      Showing {filteredExtraResources.length} of {activeExtraResources.length} Resources
                    </div>
                  </div>

                  {/* Resource items grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredExtraResources.map((res, idx) => (
                      <div key={idx} className="p-4 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                              <span>
                                {res.type === 'video' ? '🎥' :
                                 res.type === 'audio' ? '🎵' :
                                 res.type === 'tests' || res.type === 'exam-practice' ? '📝' :
                                 res.type === 'test-generator' ? '⚙️' :
                                 res.type === 'digital-platform' ? '💻' :
                                 res.type === 'teacher-pack' ? '👨‍🏫' :
                                 res.type === 'app' ? '📱' :
                                 res.type === 'workbook' ? '📖' : '📁'}
                              </span>
                              {res.title}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                              res.forWhom === 'Teachers' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              res.forWhom === 'Learners' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                              'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {res.forWhom}
                            </span>
                          </div>

                          <p className="text-slate-600 font-medium leading-relaxed mb-2">
                            {res.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-500 font-semibold truncate" title={res.access}>
                            🔑 {res.access}
                          </span>
                          {res.url && (
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 shrink-0"
                            >
                              Access Link ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredExtraResources.length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                        No resources match the selected filter criteria.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Video & Sample Pages Gallery */}
              {activeTab === 'media' && (
                <div className="space-y-6 animate-fade-in text-xs">
                  
                  {/* YouTube Video Walkthrough Player */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <span>🎥</span> YouTube Video Walkthrough & Audio Preview
                      </h4>
                      {getValidYoutubeVideoId(activeBook) && (
                        <a 
                          href={`https://www.youtube.com/watch?v=${getValidYoutubeVideoId(activeBook)}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          Watch on YouTube ↗
                        </a>
                      )}
                    </div>

                    {getValidYoutubeVideoId(activeBook) ? (
                      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 shadow-lg relative">
                        <iframe 
                          src={`https://www.youtube.com/embed/${getValidYoutubeVideoId(activeBook)}`} 
                          title={activeBook.youtubeTitle || `${activeBook.coursebook} Video Overview`}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center py-8 text-center px-4">
                        <span className="text-3xl mb-2">🎞️</span>
                        <p className="font-bold text-slate-500 text-sm">No official video listed for this title</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 max-w-md">
                          We only attach videos that belong to the exact coursebook, so no unrelated trailers are shown. Check the publisher's channel ({activeBook.publisher || 'official channel'}) for a walkthrough — you can add it later in the data.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sample Pages Album Gallery */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <span>🖼️</span> Sample Pages & Book Album ({getEnrichedAlbumImages(activeBook, coverOverrides).length} Images)
                    </h4>
                    <p className="text-slate-500 font-medium text-xs">
                      Click any sample image below to open full-screen Lightbox inspection:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {getEnrichedAlbumImages(activeBook, coverOverrides).map((imgUrl, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setLightboxImage(imgUrl)}
                          className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all hover:scale-105"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`${activeBook.coursebook} Sample Page ${idx + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                            🔍 Zoom Image
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Learners currently studying this coursebook */}
              {activeTab === 'learners' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-black text-indigo-900 flex items-center gap-2 text-sm">👥 Who is studying this coursebook?</p>
                      <p className="text-[11px] text-indigo-700/70 font-medium mt-0.5">Learners who selected this title in their Course Plan (Profile → Course Plan).</p>
                    </div>
                    <span className="text-xs px-3 py-1.5 rounded-full bg-white border border-indigo-200 font-black text-indigo-800 shadow-sm">
                      {getBookLearners(activeBook).length} learner{getBookLearners(activeBook).length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {getBookLearners(activeBook).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getBookLearners(activeBook).map(l => (
                        <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
                          <img src={getAvatarUrl(l.gender, l.avatarId, l.name)} alt={l.name} className="w-11 h-11 rounded-full border border-indigo-200 bg-indigo-50 object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate">{l.name}</p>
                            <p className="text-[10px] text-slate-500 font-semibold">
                              {(l.coursePlan as any)?.courseName || activeBook.coursebook} • {((l.coursePlan as any)?.level || l.coursePlan?.targetLevel || l.cefrLevel || l.level || 'Level not set')}
                            </p>
                          </div>
                          <span className="ml-auto text-[9px] font-black px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 uppercase">
                            {l.status === 'active' ? 'Active' : l.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <div className="text-3xl mb-2">📭</div>
                      <p className="font-bold text-slate-500 text-sm">No learner is studying this coursebook yet.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Open a learner's Course Plan, search for this coursebook and assign it to start tracking.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detail Modal Footer Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setActiveBook(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                Close Details
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  Click below to assign as student active syllabus:
                </span>
                <button 
                  type="button"
                  onClick={() => handleSelectBookAsCourse(activeBook)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
                >
                  <span>✅</span> Select This Coursebook
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Image Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={lightboxImage} 
              alt="Coursebook Sample Page Full Zoom" 
              className="max-w-full max-h-[88vh] rounded-2xl shadow-2xl object-contain border border-white/20"
            />
            <button 
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white text-slate-900 font-black text-lg flex items-center justify-center shadow-2xl cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursebookManagerModal;
