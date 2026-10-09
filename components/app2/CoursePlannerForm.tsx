import React, { useState, useMemo } from 'react';
import { CoursePlan, CourseLevel, Session } from '../../types2';
import { CEFR_LEVEL_ORDER, CEFR_LEVEL_LABELS, normalizeCefrLevel } from '../../utils/cefrGrammarDictionary';
import PlacementTest from './tests/PlacementTest';
import FrequencyTest from './tests/FrequencyTest';
import CourseSelectionPopup from './tests/CourseSelectionPopup';
import CoursebookManagerModal from './CoursebookManagerModal';
import { useCoursebookStore } from '../../store/useCoursebookStore';

interface CoursePlannerFormProps {
    plan: CoursePlan;
    onPlanChange: (plan: CoursePlan) => void;
    /** Sessions of the learner (or group) being planned — the progress bar counts attended sessions against the assigned coursebook. */
    sessions?: Session[];
}

const inputClass = "w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue placeholder:text-brand-gray-medium";

const PlannerRadio: React.FC<{
    name: string;
    value: string | number;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    children: React.ReactNode;
}> = ({ name, value, checked, onChange, children }) => (
    <label className={`block p-3 text-center rounded-lg border-2 cursor-pointer transition-all ${checked ? 'bg-blue-50 border-brand-blue text-brand-blue font-bold' : 'bg-gray-50 border-gray-200'}`}>
        <input
            type="radio"
            name={name}
            value={value}
            checked={checked}
            onChange={onChange}
            className="sr-only"
        />
        {children}
    </label>
);

// The exact same 8 CEFR codes offered by Lesson Creation > Lesson Customization,
// so a learner's level always reads identically in every part of the app.
const CEFR_LEVELS = CEFR_LEVEL_ORDER.map(lvl => ({
    value: lvl as string,
    label: CEFR_LEVEL_LABELS[lvl],
}));

// Map the CourseLevel value (e.g. "Beginner") or a raw CEFR code to a base letter used by the catalog levelDetails
const toCefrLetter = (level: string | undefined | null): string => {
    const map: Record<string, string> = {
        'beginner': 'A1', 'novice': 'A1', 'elementary': 'A2',
        'intermediate': 'B1', 'upper-intermediate': 'B2', 'advanced': 'C1',
        'expert': 'C2', 'master': 'C2',
        'a1': 'A1', 'a2': 'A2', 'b1': 'B1', 'b2': 'B2', 'c1': 'C1', 'c2': 'C2', 'a1+': 'A1', 'a2+': 'A2', 'b1+': 'B1', 'b1-': 'B1', 'b2+': 'B2', 'pre-a1': 'A1'
    };
    const v = String(level || '').trim();
    if (!v) return '';
    const direct = map[v.toLowerCase()];
    if (direct) return direct;
    // Strip anything like "(2nd ed.)" already handled; fall back to scanning for a CEFR token
    const m = v.toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/);
    return m ? m[1] : '';
};

const CoursePlannerForm: React.FC<CoursePlannerFormProps> = ({ plan, onPlanChange, sessions }) => {
    const totalSess = Number(plan.totalSessions) || 0;
    const [isCustomSessions, setIsCustomSessions] = useState(![6, 12, 24, 48].includes(totalSess));
    const [showPlacementTest, setShowPlacementTest] = useState(false);
    const [showFrequencyTest, setShowFrequencyTest] = useState(false);
    const [showCourseSelection, setShowCourseSelection] = useState(false);
    const [showCourseManager, setShowCourseManager] = useState(false);
    const [bookSearch, setBookSearch] = useState('');
    const [bookLevel, setBookLevel] = useState<string>('B1');
    const allCoursebooks = useCoursebookStore(s => s.coursebooks);
    const learnerSessions = sessions || [];

    // ── Coursebook progress: units/lessons completed of the assigned coursebook, updated as sessions are logged ──
    const coursebookProgress = useMemo(() => {
        const book = plan.coursebookInfo;
        if (!book) return null;

        const cefrLetter = toCefrLetter(plan.level || book.cefr);
        const levelDetail = Array.isArray(book.levelDetails)
            ? book.levelDetails.find((d: any) => {
                const code = String(d.levelCode || '').toUpperCase();
                return cefrLetter && (code === cefrLetter || code.startsWith(cefrLetter + '–') || code.startsWith(cefrLetter + '-') || code.startsWith(cefrLetter + '+'));
            })
            : undefined;

        const unitsTotal = Number(levelDetail?.unitsCount) || Number(book.unitsCount) || 0;
        const lessonsTotal = Number(levelDetail?.lessonsCount) || Number(book.lessonsCount) || Math.max(0, unitsTotal * 4);

        // Each attended, completed session counts as one lesson of the coursebook covered.
        const attended = learnerSessions.filter(s => s.attended && s.status !== 'cancelled').length;
        const lessonsDone = Math.min(attended, lessonsTotal);
        const lessonsPerUnit = lessonsTotal > 0 && unitsTotal > 0 ? Math.max(1, Math.ceil(lessonsTotal / unitsTotal)) : 4;
        const currentUnit = lessonsDone > 0 ? Math.min(unitsTotal, Math.floor(lessonsDone / lessonsPerUnit) + 1) : 1;
        const percent = lessonsTotal > 0 ? Math.min(100, Math.round((lessonsDone / lessonsTotal) * 100)) : 0;

        return {
            unitsTotal,
            lessonsTotal,
            lessonsDone,
            lessonsPerUnit,
            currentUnit,
            percent,
            levelLabel: levelDetail?.title || `${book.coursebook} (${cefrLetter || 'all levels'})`,
        };
    }, [plan.coursebookInfo, plan.level, learnerSessions]);

    // Searchable coursebook suggestions from the Coursebook Catalog
    const bookSuggestions = useMemo(() => {
        const q = bookSearch.trim().toLowerCase();
        const base = q
            ? allCoursebooks.filter(b =>
                b.coursebook.toLowerCase().includes(q) ||
                (b.publisher || '').toLowerCase().includes(q) ||
                (b.category || '').toLowerCase().includes(q) ||
                (b.primaryFocus || '').toLowerCase().includes(q) ||
                (b.cefr || '').toLowerCase().includes(q)
              )
            : allCoursebooks;
        return base.slice(0, 6);
    }, [allCoursebooks, bookSearch]);

    const addCoursebookToPlan = (book: typeof allCoursebooks[number]) => {
        onPlanChange({
            ...plan,
            courseName: book.coursebook,
            level: (bookLevel as CourseLevel) || plan.level,
            coursebookInfo: book
        });
        setBookSearch('');
        setShowCourseManager(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let parsedValue: any = ['duration', 'totalSessions'].includes(name) ? parseInt(value) || 0 : value;

        if (name === 'totalSessions' && value === 'custom') {
            setIsCustomSessions(true);
            parsedValue = totalSess > 0 && ![6, 12, 24, 48].includes(totalSess) ? totalSess : 0;
        } else if (name === 'totalSessions') {
            setIsCustomSessions(false);
        }
        
        onPlanChange({
            ...plan,
            [name]: parsedValue
        });
    };
    
    return (
        <div className="space-y-6">
            {/* Searchable Coursebook Catalog picker — search any title and assign it with a level */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50/70 border-2 border-indigo-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div>
                        <h4 className="font-black text-indigo-900 flex items-center gap-2 text-sm">
                            📚 Add a Coursebook from the Catalog
                        </h4>
                        <p className="text-[11px] text-indigo-700/80 font-medium">Search your Coursebook Catalog, pick a title and a starting level — it becomes this learner's active course.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCourseManager(true)}
                        className="text-[11px] font-black px-3 py-2 rounded-xl bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
                    >
                        <span>📂</span> Open Full Catalog
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 text-xs">🔍</span>
                        <input
                            type="text"
                            value={bookSearch}
                            onChange={(e) => setBookSearch(e.target.value)}
                            placeholder="Search coursebooks by title, publisher, category or CEFR…"
                            className="w-full pl-8 pr-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                        />
                    </div>
                    <select
                        value={bookLevel}
                        onChange={(e) => setBookLevel(e.target.value)}
                        className="sm:w-52 bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                    >
                        {CEFR_LEVELS.map(l => <option key={`level-${l.value}`} value={l.value}>Start at: {l.label}</option>)}
                    </select>
                </div>

                {bookSearch.trim() && bookSuggestions.length === 0 && (
                    <p className="mt-2 text-[11px] text-slate-400 font-semibold">No coursebook matches — try another keyword or open the Full Catalog to add your own with ➕ Add Coursebook.</p>
                )}

                {bookSuggestions.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {bookSuggestions.map(b => {
                            const isChosen = (plan.coursebookInfo as any)?.id === b.id || plan.courseName === b.coursebook;
                            return (
                                <button
                                    key={b.id || b.coursebook}
                                    type="button"
                                    onClick={() => addCoursebookToPlan(b)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${isChosen ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm'}`}
                                >
                                    <img src={b.coverImage || ''} alt="" className="w-9 h-12 rounded-md object-cover border border-slate-200 shrink-0" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-extrabold truncate ${isChosen ? 'text-emerald-800' : 'text-slate-800'}`}>{isChosen ? '✓ ' : ''}{b.coursebook}</p>
                                        <p className="text-[10px] text-slate-500 font-semibold truncate">{b.publisher} • {b.cefr} • {b.ageGroupCategory || b.targetAudience} • {b.primaryFocus}</p>
                                    </div>
                                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                        {bookLevel} → add
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block font-semibold flex justify-between items-center mb-1">
                        <span>🎯 Current Level</span>
                        <button type="button" onClick={() => setShowPlacementTest(true)} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">Take Test</button>
                    </label>
                    <select name="level" value={normalizeCefrLevel(plan.level, 'B1')} onChange={handleChange} className={inputClass}>
                        {CEFR_LEVELS.map(l => <option key={`current-${l.value}`} value={l.value}>{l.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-semibold mb-1">🎯 Target Level</label>
                    <select name="targetLevel" value={normalizeCefrLevel(plan.targetLevel, 'B2')} onChange={handleChange} className={inputClass}>
                        {CEFR_LEVELS.map(l => <option key={`target-${l.value}`} value={l.value}>{l.label}</option>)}
                    </select>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block font-semibold mb-1">⚡ Course Name</label>
                    <input type="text" name="courseName" value={plan.courseName} onChange={handleChange} className={inputClass} placeholder="e.g. Empower (2nd ed.) B1" />
                </div>
                <div className="flex flex-col mt-auto pb-[2px]">
                    <label className="block font-semibold mb-1">📖 Current Lesson</label>
                    <input type="text" name="currentLesson" value={plan.currentLesson || ''} onChange={handleChange} className={inputClass} placeholder="e.g., Unit 5" />
                </div>
            </div>

            <div>
                <label className="block font-semibold mb-2">⏳ Duration</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <PlannerRadio name="duration" value={30} checked={plan.duration === 30} onChange={handleChange}>30m ☑️ Quick</PlannerRadio>
                    <PlannerRadio name="duration" value={60} checked={plan.duration === 60} onChange={handleChange}>60m ☑️ Standard</PlannerRadio>
                    <PlannerRadio name="duration" value={90} checked={plan.duration === 90} onChange={handleChange}>90m ☑️ In-Depth</PlannerRadio>
                    <PlannerRadio name="duration" value={120} checked={plan.duration === 120} onChange={handleChange}>120m ☑️ Intensive</PlannerRadio>
                </div>
            </div>

            <div>
                <label className="block font-semibold mb-2 flex items-center justify-between">
                    <span>🔄 Frequency</span>
                    <button type="button" onClick={() => setShowFrequencyTest(true)} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">Quiz: Best Frequency?</button>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <PlannerRadio name="frequency" value="Light" checked={plan.frequency === 'Light'} onChange={handleChange}>1x/wk ☑️ Light</PlannerRadio>
                    <PlannerRadio name="frequency" value="Balanced" checked={plan.frequency === 'Balanced'} onChange={handleChange}>2x/wk ☑️ Balanced</PlannerRadio>
                    <PlannerRadio name="frequency" value="Intensive" checked={plan.frequency === 'Intensive'} onChange={handleChange}>3x/wk ☑️ Intensive</PlannerRadio>
                    <PlannerRadio name="frequency" value="Custom" checked={plan.frequency === 'Custom'} onChange={handleChange}>Flex ☑️ Custom</PlannerRadio>
                </div>
            </div>

            <div>
                <label className="block font-semibold mb-2">🔄 Total Sessions</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <PlannerRadio name="totalSessions" value={6} checked={!isCustomSessions && plan.totalSessions === 6} onChange={handleChange}>6️⃣ Quick</PlannerRadio>
                    <PlannerRadio name="totalSessions" value={12} checked={!isCustomSessions && plan.totalSessions === 12} onChange={handleChange}>1️⃣2️⃣ Basic</PlannerRadio>
                    <PlannerRadio name="totalSessions" value={24} checked={!isCustomSessions && plan.totalSessions === 24} onChange={handleChange}>2️⃣4️⃣ Standard</PlannerRadio>
                    <PlannerRadio name="totalSessions" value={48} checked={!isCustomSessions && plan.totalSessions === 48} onChange={handleChange}>4️⃣8️⃣ Intensive</PlannerRadio>
                    <PlannerRadio name="totalSessions" value="custom" checked={isCustomSessions} onChange={handleChange}>Custom</PlannerRadio>
                </div>
                {isCustomSessions && (
                     <input 
                        type="number"
                        name="totalSessions"
                        value={plan.totalSessions}
                        onChange={handleChange}
                        className={`${inputClass} mt-2 w-48`}
                        placeholder="Custom amount"
                     />
                )}
            </div>
            
            <label className="block font-semibold">✨ Special Features / Notes
                <textarea name="features" value={plan.features || ''} onChange={handleChange} className={inputClass} placeholder="e.g., Focus on business emails, mock interviews..."></textarea>
            </label>

            <PlacementTest 
                isOpen={showPlacementTest} 
                onClose={() => setShowPlacementTest(false)}
                onComplete={(lvl) => {
                    // Store the canonical CEFR code, never the legacy enum name.
                    onPlanChange({...plan, level: normalizeCefrLevel(lvl)});
                    setShowPlacementTest(false);
                }}
            />

            <FrequencyTest 
                isOpen={showFrequencyTest}
                onClose={() => setShowFrequencyTest(false)}
                onComplete={(freq) => {
                    onPlanChange({...plan, frequency: freq});
                    setShowFrequencyTest(false);
                }}
            />
            
            <CourseSelectionPopup 
                isOpen={showCourseSelection}
                onClose={() => setShowCourseSelection(false)}
                onSelect={(course) => {
                    onPlanChange({...plan, courseName: course.coursebook, coursebookInfo: course});
                }}
            />

            <CoursebookManagerModal 
                isOpen={showCourseManager}
                onClose={() => setShowCourseManager(false)}
                onSelectCoursebook={(courseName, courseObj) => {
                    onPlanChange({
                        ...plan, 
                        courseName: courseName, 
                        coursebookInfo: courseObj || plan.coursebookInfo
                    });
                }}
            />

            {plan.coursebookInfo && (
                <div className="bg-indigo-50/80 dark:bg-slate-800/90 p-6 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 mt-6 shadow-sm">
                    <div className="flex flex-wrap justify-between items-start mb-4 border-b border-indigo-100 dark:border-slate-700 pb-4 gap-3">
                        <div className="flex items-center gap-3">
                            {plan.coursebookInfo.coverImage && (
                                <img src={plan.coursebookInfo.coverImage} alt="Cover" className="w-12 h-16 rounded-lg object-cover shadow border border-indigo-300 dark:border-slate-600" />
                            )}
                            <div>
                                <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-200"><i className="fas fa-book mr-2"></i> {plan.coursebookInfo.coursebook}</h3>
                                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">{plan.coursebookInfo.publisher} • {plan.coursebookInfo.targetLanguage || 'English'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-white dark:bg-slate-900 text-indigo-800 dark:text-indigo-300 px-3 py-1 font-bold rounded-lg border border-indigo-200 dark:border-slate-700 shadow-sm text-sm">
                                {plan.coursebookInfo.cefr}
                            </span>
                            <button 
                                type="button"
                                onClick={() => setShowCourseManager(true)}
                                className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 cursor-pointer shadow-sm"
                            >
                                Change
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    onPlanChange({
                                        ...plan,
                                        courseName: '',
                                        coursebookInfo: undefined
                                    });
                                }}
                                className="text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 cursor-pointer shadow-sm"
                                title="Remove coursebook from plan"
                            >
                                🗑️ Remove
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {coursebookProgress && (
                            <div className="col-span-2 md:col-span-4 bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <i className="fas fa-chart-line text-emerald-500"></i> Progress — {coursebookProgress.levelLabel}
                                    </p>
                                    <span className="text-xs font-black text-emerald-600">{coursebookProgress.percent}%</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden border border-gray-200 dark:border-slate-700 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                                        style={{ width: `${coursebookProgress.percent}%` }}
                                    ></div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[10px] font-semibold text-gray-500 dark:text-slate-400">
                                    <span>
                                        📘 {coursebookProgress.lessonsDone} of {coursebookProgress.lessonsTotal} lessons covered
                                        {coursebookProgress.unitsTotal > 0 && (
                                            <span className="ml-2 text-indigo-600 dark:text-indigo-300 font-black">
                                                · Unit {coursebookProgress.currentUnit} of {coursebookProgress.unitsTotal}
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-[9px] font-bold text-emerald-600/80">
                                        <i className="fas fa-sync-alt mr-1"></i>auto-updates as attended sessions are logged
                                    </span>
                                </div>
                                {plan.currentLesson ? (
                                    <p className="text-[9px] text-slate-400 font-semibold mt-1">📌 Tutor marker — current lesson: {plan.currentLesson}</p>
                                ) : null}
                            </div>
                        )}
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm text-center border border-slate-100 dark:border-slate-800">
                            <i className="fas fa-users text-blue-500 mb-1 block"></i>
                            <span className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Target</span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 line-clamp-1">{plan.coursebookInfo.targetAudience}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm text-center border border-slate-100 dark:border-slate-800">
                            <i className="fas fa-bullseye text-red-500 mb-1 block"></i>
                            <span className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Focus</span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 line-clamp-1">{plan.coursebookInfo.primaryFocus}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm text-center border border-slate-100 dark:border-slate-800">
                            <i className="fas fa-brain text-purple-500 mb-1 block"></i>
                            <span className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Vocabulary</span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 line-clamp-1">{plan.coursebookInfo.vocabularyType}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm text-center border border-slate-100 dark:border-slate-800">
                            <i className="fas fa-comments text-green-500 mb-1 block"></i>
                            <span className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Goal</span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 line-clamp-1">{plan.coursebookInfo.communicationGoal}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoursePlannerForm;
