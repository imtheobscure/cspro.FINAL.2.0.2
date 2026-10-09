import React, { useState, useCallback, useMemo } from 'react';
import { Learner, GroupClass, Competency, CompetencyStatus, PersonalSyllabus, CompetencySyllabus, SyllabusChapter } from '../../../types2';
import { useLearnerStore } from '../../../store/useLearnerStore';
import SectionCard from '../SectionCard';
import RadarChartComponent from '../RadarChartComponent';
import CompetencyItem from './CompetencyItem';
import NeedsCompetencyEditor from './NeedsCompetencyEditor';
import { ICONS } from '../../../constants2';
import { TierGatedOverlay } from '../../ui/TierGatedOverlay';

interface CompetencySectionProps {
    learner: Learner | GroupClass;
    onUpdate: (updatedLearner: Learner | GroupClass) => void;
}

const CompetencySection: React.FC<CompetencySectionProps> = ({ learner, onUpdate }) => {
    const addCompetency = useLearnerStore(state => state.addCompetency);
    const updateCompetency = useLearnerStore(state => state.updateCompetency);
    const removeCompetency = useLearnerStore(state => state.removeCompetency);
    
    const [isEditing, setIsEditing] = useState(false);
    const isGroup = !('xp' in learner);

    // --- Personal Syllabus State ---
    const [syllabusJsonInput, setSyllabusJsonInput] = useState('');
    const [copiedSuccess, setCopiedSuccess] = useState(false);
    const [isAddingSyllabus, setIsAddingSyllabus] = useState(false);
    const [syllabusError, setSyllabusError] = useState<string | null>(null);
    
    const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [showAddChapterFor, setShowAddChapterFor] = useState<string | null>(null);
    const [newChapterTitle, setNewChapterTitle] = useState('');
    const [newChapterVocab, setNewChapterVocab] = useState('');
    const [newChapterGrammar, setNewChapterGrammar] = useState('');
    const [newChapterDesc, setNewChapterDesc] = useState('');
    
    const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
    const [editChapterTitle, setEditChapterTitle] = useState('');
    const [editChapterVocab, setEditChapterVocab] = useState('');
    const [editChapterGrammar, setEditChapterGrammar] = useState('');
    const [editChapterDesc, setEditChapterDesc] = useState('');

    // --- Personal Syllabus Handlers ---
    const handleCreateSyllabus = useCallback(() => {
        const competenciesList = (learner.competencies || []).map(c => `- ${c.name} (Current progress: ${c.progress}%)`).join('\n');
        
        const prompt = `You are an elite, world-class curriculum designer and senior English language coach.
Your task is to analyze the learner's profile, occupation, goals, level, interests, and current English language competencies, and design a comprehensive, highly personalized, ultra-detailed Personal Syllabus.

Learner Profile:
- Name: ${learner.name || 'Student'}
- Level: ${'level' in learner ? learner.level : 'Intermediate'} ${'cefrLevel' in learner && learner.cefrLevel ? `(${learner.cefrLevel})` : ''}
- L1 Language: ${'l1Language' in learner ? (learner as any).l1Language || 'Not specified' : 'Not specified'}
- Occupation: ${'occupation' in learner ? (learner as any).occupation || 'Not specified' : 'Not specified'}
- Interests: ${'interests' in learner ? learner.interests || 'Not specified' : 'Not specified'}
- Goals: ${'goals' in learner && learner.goals ? learner.goals.join(', ') : 'Not specified'}
- Situations (where L2 will be used): ${'situations' in learner && (learner as any).situations ? (learner as any).situations : 'Not specified'}
- Lesson Focus (What the lessons should concentrate on): ${'focus' in learner && (learner as any).focus ? (learner as any).focus : 'Not specified'}
- Learning Style: ${'learningStyle' in learner ? (learner as any).learningStyle || 'Not specified' : 'Not specified'}
- Expectations: ${'expectations' in learner ? (learner as any).expectations || 'Not specified' : 'Not specified'}

Competencies to cover:
${competenciesList}

Using your advanced pedagogical knowledge, conduct a 2026 web search and think deeply.
For EACH competency listed above, design an in-depth curriculum containing up to 24 highly structured, progressive sessions/chapters. Each chapter must perfectly align with the learner's level, interests, goals, and professional/personal background, ensuring they have enough repetition and focus on that chapter to master it effectively.

For each session/chapter, define:
1. "title": A descriptive, engaging chapter title specifically tailored to this learner's professional or personal context.
2. "vocabulary": A list of 4-6 recommended keywords, collocations, or key phrases best suited for this chapter.
3. "grammar": The target grammar theme or structure best integrated with this chapter's theme.
4. "description": A 1-2 sentence detailed explanation of what is taught and how.

Format your entire response as a single, valid JSON object with NO markdown boxes (NO \`\`\`json code blocks), NO explanation before or after, just pure raw JSON.
The structure MUST be exactly:
{
  "syllabus": {
    "competencies": [
      {
        "competencyId": "unique-id-of-the-competency",
        "competencyName": "exact-competency-name",
        "chapters": [
          {
            "id": "chap-1",
            "title": "Enter Chapter Title Here",
            "vocabulary": ["vocab1", "vocab2", "vocab3"],
            "grammar": "Enter target grammar structure",
            "description": "Enter session outline and pedagogical focus",
            "status": "pending"
          }
        ]
      }
    ]
  }
}
Ensure that you cover every single competency listed. Make the chapters scalable and comprehensive, following best practices for ESL/EFL learning in 2026. Make it super detailed, premium looking, and highly focused!`;

        navigator.clipboard.writeText(prompt);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
    }, [learner]);

    const handleParseSyllabusJson = useCallback(() => {
        try {
            setSyllabusError(null);
            let cleaned = syllabusJsonInput.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
            }
            
            const parsed = JSON.parse(cleaned);
            if (!parsed.syllabus || !Array.isArray(parsed.syllabus.competencies)) {
                setSyllabusError("Invalid Syllabus JSON structure. It must contain a 'syllabus' object with a 'competencies' array.");
                return;
            }

            const competenciesWithSyllabus = parsed.syllabus.competencies.map((comp: any, idx: number) => {
                const chapters = Array.isArray(comp.chapters) ? comp.chapters.map((ch: any, cidx: number) => ({
                    id: ch.id || `chap-${idx}-${cidx}-${Date.now()}`,
                    title: ch.title || 'Untitled Chapter',
                    vocabulary: Array.isArray(ch.vocabulary) ? ch.vocabulary : [],
                    grammar: ch.grammar || 'General grammar focus',
                    description: ch.description || 'Description of the chapter',
                    status: ch.status === 'completed' ? 'completed' : 'pending'
                })) : [];
                
                return {
                    competencyId: comp.competencyId || `comp-${idx}-${Date.now()}`,
                    competencyName: comp.competencyName || 'Unnamed Competency',
                    chapters
                };
            });

            const updatedSyllabus: PersonalSyllabus = { competencies: competenciesWithSyllabus };
            onUpdate({
                ...learner,
                syllabus: updatedSyllabus
            });
            setSyllabusJsonInput('');
            setIsAddingSyllabus(false);
            setSyllabusError(null);
            alert("Syllabus successfully loaded and visualized!");
        } catch (e: any) {
            setSyllabusError("Error parsing JSON: " + e.message);
        }
    }, [learner, syllabusJsonInput, onUpdate]);

    const handleToggleChapterStatus = useCallback((compName: string, chapterId: string) => {
        if (!learner.syllabus) return;
        
        const updatedCompetencies: CompetencySyllabus[] = learner.syllabus.competencies.map((comp): CompetencySyllabus => {
            if (comp.competencyName === compName) {
                return {
                    ...comp,
                    chapters: comp.chapters.map((ch): SyllabusChapter => {
                        if (ch.id === chapterId) {
                            return {
                                ...ch,
                                status: ch.status === 'completed' ? 'pending' : 'completed'
                            };
                        }
                        return ch;
                    })
                };
            }
            return comp;
        });
        
        onUpdate({
            ...learner,
            syllabus: {
                ...learner.syllabus,
                competencies: updatedCompetencies
            }
        });
    }, [learner, onUpdate]);

    const handleAddChapter = useCallback((compName: string) => {
        if (!learner.syllabus) return;
        if (!newChapterTitle.trim()) {
            alert("Please enter a chapter title.");
            return;
        }
        
        const newChapter: SyllabusChapter = {
            id: `chap-custom-${Date.now()}`,
            title: newChapterTitle.trim(),
            vocabulary: newChapterVocab.split(',').map(v => v.trim()).filter(v => v.length > 0),
            grammar: newChapterGrammar.trim() || 'General grammar focus',
            description: newChapterDesc.trim() || 'Custom added session.',
            status: 'pending'
        };
        
        const updatedCompetencies: CompetencySyllabus[] = learner.syllabus.competencies.map((comp): CompetencySyllabus => {
            if (comp.competencyName === compName) {
                return {
                    ...comp,
                    chapters: [...comp.chapters, newChapter]
                };
            }
            return comp;
        });
        
        onUpdate({
            ...learner,
            syllabus: {
                ...learner.syllabus,
                competencies: updatedCompetencies
            }
        });
        
        setNewChapterTitle('');
        setNewChapterVocab('');
        setNewChapterGrammar('');
        setNewChapterDesc('');
        setShowAddChapterFor(null);
    }, [learner, newChapterTitle, newChapterVocab, newChapterGrammar, newChapterDesc, onUpdate]);

    const handleStartEditing = useCallback((ch: SyllabusChapter) => {
        setEditingChapterId(ch.id);
        setEditChapterTitle(ch.title);
        setEditChapterVocab(ch.vocabulary.join(', '));
        setEditChapterGrammar(ch.grammar);
        setEditChapterDesc(ch.description);
    }, []);
    
    const handleSaveEditChapter = useCallback((compName: string, chapterId: string) => {
        if (!learner.syllabus) return;
        if (!editChapterTitle.trim()) {
            alert("Please enter a chapter title.");
            return;
        }
        
        const updatedCompetencies: CompetencySyllabus[] = learner.syllabus.competencies.map((comp): CompetencySyllabus => {
            if (comp.competencyName === compName) {
                return {
                    ...comp,
                    chapters: comp.chapters.map((ch): SyllabusChapter => {
                        if (ch.id === chapterId) {
                            return {
                                ...ch,
                                title: editChapterTitle.trim(),
                                vocabulary: editChapterVocab.split(',').map(v => v.trim()).filter(v => v.length > 0),
                                grammar: editChapterGrammar.trim(),
                                description: editChapterDesc.trim()
                            };
                        }
                        return ch;
                    })
                };
            }
            return comp;
        });
        
        onUpdate({
            ...learner,
            syllabus: {
                ...learner.syllabus,
                competencies: updatedCompetencies
            }
        });
        
        setEditingChapterId(null);
    }, [learner, editChapterTitle, editChapterVocab, editChapterGrammar, editChapterDesc, onUpdate]);

    const handleDeleteChapter = useCallback((compName: string, chapterId: string) => {
        if (!learner.syllabus) return;
        if (!confirm("Are you sure you want to delete this chapter?")) return;
        
        const updatedCompetencies: CompetencySyllabus[] = learner.syllabus.competencies.map((comp): CompetencySyllabus => {
            if (comp.competencyName === compName) {
                return {
                    ...comp,
                    chapters: comp.chapters.filter(ch => ch.id !== chapterId)
                };
            }
            return comp;
        });
        
        onUpdate({
            ...learner,
            syllabus: {
                ...learner.syllabus,
                competencies: updatedCompetencies
            }
        });
    }, [learner, onUpdate]);

    const needs = learner.needs || [];
    const competencies = learner.competencies || [];

    // Synthesize all competencies by combining explicit competencies and any skills from needs.learningPath
    const allCompetencies = useMemo(() => {
        const compMap = new Map<string, Competency>();
        // Add existing competencies first.
        //
        // Keyed by ID, not name: two competencies can legitimately share a name
        // ("Presentation skills" under two different needs), and keying by name
        // silently MERGED them — which is why pressing "Add New Competency" twice
        // looked like it did nothing at all.
        (competencies || []).forEach((c, idx) => {
            if (c && c.name && c.name.trim()) {
                compMap.set(c.id || `c_${idx}_${c.name.trim().toLowerCase()}`, {
                    ...c,
                    id: c.id || `c_${idx}_${Date.now()}`,
                    rating: typeof c.rating === 'number' ? c.rating : 3,
                    initialProgress: typeof c.initialProgress === 'number' ? c.initialProgress : (c.progress || 0),
                    progress: typeof c.progress === 'number' ? c.progress : 0,
                    status: c.status || (c.progress >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork)
                });
            }
        });

        // Ensure every skill in needs.learningPath is included
        (needs || []).forEach((need, nIdx) => {
            (need.learningPath || []).forEach((skill, sIdx) => {
                if (skill && skill.name && skill.name.trim()) {
                    const key = skill.name.trim().toLowerCase();
                    const already = Array.from(compMap.values()).some(
                        (existing) => existing.name.trim().toLowerCase() === key,
                    );
                    if (!already) {
                        compMap.set(skill.id || `c_synth_${nIdx}_${sIdx}`, {
                            id: skill.id || `c_synth_${nIdx}_${sIdx}`,
                            name: skill.name.trim(),
                            icon: 'target',
                            rating: need.rating || 3,
                            initialProgress: skill.progress || 0,
                            progress: skill.progress || 0,
                            status: (skill.progress || 0) >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork
                        });
                    }
                }
            });
        });

        return Array.from(compMap.values());
    }, [needs, competencies]);

    const handleProgressChange = useCallback((competencyId: string, change: number) => {
        const targetComp = allCompetencies.find(c => c.id === competencyId);
        const targetName = targetComp?.name?.trim()?.toLowerCase();

        const updatedCompetencies = allCompetencies.map(c => {
            if (c.id === competencyId || (targetName && c.name.trim().toLowerCase() === targetName)) {
                const newProgress = Math.max(0, Math.min(100, c.progress + change));
                return {
                    ...c,
                    progress: newProgress,
                    status: newProgress >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork,
                };
            }
            return c;
        });

        // Also update matching skills in needs
        const updatedNeeds = (learner.needs || []).map(n => ({
            ...n,
            learningPath: (n.learningPath || []).map(s => {
                if (s.id === competencyId || (targetName && s.name.trim().toLowerCase() === targetName)) {
                    return { ...s, progress: Math.max(0, Math.min(100, s.progress + change)) };
                }
                return s;
            })
        }));
        
        const updatedData: any = { 
            ...learner, 
            competencies: updatedCompetencies,
            needs: updatedNeeds
        };
        if ('xp' in updatedData) {
            updatedData.xp = (Number(updatedData.xp) || 0) + change;
        }

        onUpdate(updatedData);
    }, [learner, allCompetencies, onUpdate]);

    /**
     * Add a general competency (one that belongs to no need).
     *
     * The name is unique per click — it used to be the literal 'New Competency'
     * every time, so a second one collapsed into the first as soon as the list was
     * deduplicated by name, and the button looked broken.
     */
    const handleAddNewCompetency = () => {
        if (!('id' in learner)) return;
        const taken = new Set(
            [...allCompetencies, ...(learner.competencies || [])].map((c) => c.name.trim().toLowerCase()),
        );
        let name = 'New Competency';
        for (let n = 2; taken.has(name.toLowerCase()); n++) name = `New Competency ${n}`;

        const newComp: Competency = {
            id: `c_${Date.now()}`,
            name,
            icon: 'target',
            rating: 3,
            initialProgress: 0,
            progress: 0,
            status: CompetencyStatus.OnTrack,
        };
        onUpdate({ ...learner, competencies: [...allCompetencies, newComp] });
        addCompetency(learner.id, newComp);
    };

    /**
     * Needs and their competencies are edited together, so they are saved together.
     * `syncCompetenciesFromNeeds` keeps every skill in a need backed by a competency
     * (and drops the ones whose skill was deleted) — see utils/needsCompetencies.ts.
     */
    const handleNeedsChange = useCallback(
        (nextNeeds: any[], nextCompetencies: Competency[]) => {
            onUpdate({
                ...learner,
                needs: nextNeeds,
                competencies: nextCompetencies,
            } as Learner | GroupClass);
        },
        [learner, onUpdate],
    );

    const handleUpdateCompetency = (c: Competency) => {
        if ('id' in learner) {
            const updatedCompetencies = allCompetencies.map(item => item.id === c.id ? c : item);
            const targetName = c.name.trim().toLowerCase();
            const updatedNeeds = (learner.needs || []).map(n => ({
                ...n,
                learningPath: (n.learningPath || []).map(s => {
                    if (s.id === c.id || s.name.trim().toLowerCase() === targetName) {
                        return { ...s, name: c.name, progress: c.progress };
                    }
                    return s;
                })
            }));
            onUpdate({ ...learner, competencies: updatedCompetencies, needs: updatedNeeds });
            updateCompetency(learner.id, c);
        }
    };

    const handleRemoveCompetency = (cId: string) => {
        if ('id' in learner) {
            const target = allCompetencies.find(c => c.id === cId);
            const targetName = target?.name?.trim()?.toLowerCase();
            const updatedCompetencies = allCompetencies.filter(c => c.id !== cId);
            const updatedNeeds = (learner.needs || []).map(n => ({
                ...n,
                learningPath: (n.learningPath || []).filter(s => s.id !== cId && (!targetName || s.name.trim().toLowerCase() !== targetName))
            }));
            onUpdate({ ...learner, competencies: updatedCompetencies, needs: updatedNeeds });
            removeCompetency(learner.id, cId);
        }
    };

    const uncategorizedCompetencies = useMemo(() => {
        const competenciesInNeeds = new Set(needs.flatMap(n => (n.learningPath || []).map(s => s.name.trim().toLowerCase())));
        return allCompetencies.filter(c => !competenciesInNeeds.has(c.name.trim().toLowerCase()));
    }, [needs, allCompetencies]);

    return (
        <SectionCard title="Competency Overview" icon={ICONS.target}>
            <div className="flex justify-end mb-2">
                <button 
                    onClick={() => setIsEditing(!isEditing)} 
                    className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-brand-gray-dark px-4 py-1 rounded-lg transition-colors"
                >
                    {isEditing ? 'Done' : 'Edit'}
                </button>
            </div>

            {/* Edit mode owns the whole structure: needs, and the competencies inside them. */}
            {isEditing && (
                <div className="mb-5 p-4 rounded-xl border-2 border-purple-200 bg-purple-50/40">
                    <div className="mb-3">
                        <div className="text-sm font-black text-brand-purple">Needs &amp; Competencies</div>
                        <div className="text-[11px] text-slate-500">
                            Add as many needs as you need, and as many competencies under each one — exactly like the
                            new-learner form. Percentages set the starting progress.
                        </div>
                    </div>
                    <NeedsCompetencyEditor
                        needs={needs}
                        competencies={competencies}
                        onChange={handleNeedsChange}
                        subject={isGroup ? 'class' : 'learner'}
                    />
                </div>
            )}

            <div className="space-y-6">
                {needs.map(need => {
                    const learningPath = need.learningPath || [];
                    const skillsInNeed = new Set(learningPath.map(s => s.name.trim().toLowerCase()));
                    const competenciesForNeed = allCompetencies.filter(c => skillsInNeed.has(c.name.trim().toLowerCase()));
                    
                    // Fallback to synthesizing items directly from learningPath if needed
                    const displayCompetencies = competenciesForNeed.length > 0 ? competenciesForNeed : learningPath.map((s, sIdx) => ({
                        id: s.id || `comp_need_${need.id}_${sIdx}`,
                        name: s.name,
                        icon: 'target',
                        rating: need.rating || 3,
                        initialProgress: s.progress || 0,
                        progress: s.progress || 0,
                        status: (s.progress || 0) >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork
                    }));

                    if (displayCompetencies.length === 0) return null;

                    return (
                        <div key={need.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                            <h3 className="font-bold text-lg text-brand-purple mb-3 border-b-2 border-purple-200 pb-1 flex items-center justify-between">
                                <span>{need.name}</span>
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-brand-purple">
                                    {displayCompetencies.length} {displayCompetencies.length === 1 ? 'competency' : 'competencies'}
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                {displayCompetencies.map(comp => (
                                    <CompetencyItem 
                                        key={comp.id} 
                                        competency={comp} 
                                        onProgressChange={handleProgressChange}
                                        isEditing={isEditing}
                                        onUpdate={handleUpdateCompetency}
                                        onRemove={handleRemoveCompetency}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {uncategorizedCompetencies.length > 0 && (
                     <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                        <h3 className="font-bold text-lg text-brand-gray-dark mb-3 border-b-2 border-gray-200 pb-1 flex items-center justify-between">
                            <span>General Competencies</span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                {uncategorizedCompetencies.length} competencies
                            </span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {uncategorizedCompetencies.map(comp => (
                                <CompetencyItem 
                                    key={comp.id} 
                                    competency={comp} 
                                    onProgressChange={handleProgressChange}
                                    isEditing={isEditing}
                                    onUpdate={handleUpdateCompetency}
                                    onRemove={handleRemoveCompetency}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {allCompetencies.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                        <div className="w-12 h-12 rounded-full bg-purple-100 text-brand-purple flex items-center justify-center mx-auto mb-3 text-xl">
                            <i className="fas fa-bullseye"></i>
                        </div>
                        <h4 className="font-bold text-slate-800 text-base mb-1">No Competencies Defined Yet</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                            Add measurable skills and target language capabilities for this student to track their ongoing mastery and radar distribution.
                        </p>
                        <button
                            type="button"
                            onClick={handleAddNewCompetency}
                            className="px-4 py-2 bg-brand-purple hover:bg-opacity-90 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
                        >
                            <i className="fas fa-plus"></i> Add First Competency
                        </button>
                    </div>
                )}
            </div>
            
            {isEditing && (
                <button 
                    onClick={handleAddNewCompetency} 
                    title="A competency that belongs to no need (a general skill)"
                    className="mt-4 text-sm font-bold text-brand-blue hover:underline inline-flex items-center gap-1.5"
                >
                    <i className="fas fa-plus"></i> Add Standalone Competency
                </button>
            )}

            <div className="mt-6">
                <RadarChartComponent data={allCompetencies} />
            </div>

            {/* ==================== PERSONAL SYLLABUS SECTION ==================== */}
            <TierGatedOverlay
                requiredTier="pro"
                featureName="Personal Syllabus"
                description="Personal Syllabus is an exclusive feature for Pro and VIP tutors. Generate customized learning roadmaps, chapter objectives, and track mastery milestones."
            >
            <div className="mt-8 pt-8 border-t border-gray-100" id="personal-syllabus-section">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-brand-purple flex items-center gap-2">
                            <i className="fas fa-book-reader text-brand-purple"></i> Personal Syllabus
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleCreateSyllabus}
                            className={`px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 ${
                                copiedSuccess
                                    ? 'bg-emerald-500 text-white animate-pulse'
                                    : 'bg-brand-purple text-white hover:bg-opacity-90'
                            }`}
                        >
                            <i className={copiedSuccess ? "fas fa-check-circle" : "fas fa-copy"}></i>
                            {copiedSuccess ? 'Prompt Copied!' : 'Create Syllabus'}
                        </button>
                        <button
                            onClick={() => setIsAddingSyllabus(!isAddingSyllabus)}
                            className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
                        >
                            <i className="fas fa-file-import mr-1.5"></i>
                            {learner.syllabus ? 'Update JSON' : 'Paste JSON'}
                        </button>
                    </div>
                </div>

                {/* Collapsible JSON Paste Box */}
                {(isAddingSyllabus || !learner.syllabus) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 animate-fade-in">
                        {syllabusError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold mb-3">
                                <i className="fas fa-exclamation-triangle mr-1.5"></i> {syllabusError}
                            </div>
                        )}
                        <textarea
                            value={syllabusJsonInput}
                            onChange={(e) => setSyllabusJsonInput(e.target.value)}
                            placeholder='Paste the raw generated JSON here (e.g. { "syllabus": { ... } })'
                            rows={6}
                            className="w-full p-3 text-xs font-mono border border-slate-300 rounded-lg focus:ring-brand-purple focus:border-brand-purple bg-white mb-3 shadow-inner"
                        />
                        <div className="flex justify-end gap-2">
                            {learner.syllabus && (
                                <button
                                    onClick={() => {
                                        setIsAddingSyllabus(false);
                                        setSyllabusError(null);
                                    }}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleParseSyllabusJson}
                                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                            >
                                <i className="fas fa-play mr-1.5"></i> Load Syllabus
                            </button>
                        </div>
                    </div>
                )}

                {/* Syllabus Dashboard */}
                {learner.syllabus ? (
                    <div className="space-y-6">
                        {/* Search & Status Filters */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                            <div className="relative flex-1">
                                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search syllabus chapters, vocabulary, or grammar..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-purple focus:border-brand-purple focus:outline-none shadow-inner"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                {(['all', 'pending', 'completed'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setStatusFilter(filter)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize border ${
                                            statusFilter === filter
                                                ? 'bg-brand-purple text-white border-brand-purple shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {filter === 'all' && 'All Chapters'}
                                        {filter === 'pending' && 'Pending ⏳'}
                                        {filter === 'completed' && 'Completed ✅'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Competencies List */}
                        <div className="space-y-4">
                            {learner.syllabus.competencies.map((comp) => {
                                // Match filter/search query to determine visible chapters
                                const filteredChapters = comp.chapters.filter((ch) => {
                                    if (statusFilter === 'pending' && ch.status !== 'pending') return false;
                                    if (statusFilter === 'completed' && ch.status !== 'completed') return false;
                                    
                                    if (searchQuery) {
                                        const query = searchQuery.toLowerCase();
                                        const matchesTitle = ch.title.toLowerCase().includes(query);
                                        const matchesGrammar = ch.grammar.toLowerCase().includes(query);
                                        const matchesDesc = ch.description.toLowerCase().includes(query);
                                        const matchesVocab = ch.vocabulary.some(v => v.toLowerCase().includes(query));
                                        return matchesTitle || matchesGrammar || matchesDesc || matchesVocab;
                                    }
                                    return true;
                                });

                                const totalChapters = comp.chapters.length;
                                const completedChapters = comp.chapters.filter(ch => ch.status === 'completed').length;
                                const completionProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
                                const isExpanded = expandedCompetency === comp.competencyName;

                                return (
                                    <div
                                        key={comp.competencyName}
                                        className={`border rounded-xl transition-all shadow-sm overflow-hidden bg-white ${
                                            isExpanded ? 'border-brand-purple ring-1 ring-brand-purple/20' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {/* Competency Header Summary */}
                                        <div
                                            onClick={() => setExpandedCompetency(isExpanded ? null : comp.competencyName)}
                                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                                                    <h3 className="font-extrabold text-slate-800 text-base truncate" title={comp.competencyName}>
                                                        {comp.competencyName}
                                                    </h3>
                                                </div>
                                                {/* Sleek Progress Bar */}
                                                <div className="mt-3 flex items-center gap-3">
                                                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-brand-purple to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                                            style={{ width: `${completionProgress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-600 shrink-0 font-mono">
                                                        {completionProgress}% ({completedChapters}/{totalChapters})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                                    {filteredChapters.length} {filteredChapters.length === 1 ? 'Chapter' : 'Chapters'} Shown
                                                </span>
                                                <button
                                                    type="button"
                                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-slate-800 hover:bg-gray-100 transition-all"
                                                >
                                                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`}></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Chapters List */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 bg-slate-50/45 p-4 sm:p-5 space-y-4">
                                                {filteredChapters.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {filteredChapters.map((ch, idx) => {
                                                            const isEditingChapter = editingChapterId === ch.id;

                                                            return (
                                                                <div
                                                                    key={`${comp.competencyId}-${ch.id}-${idx}`}
                                                                    className={`p-4 rounded-xl border bg-white shadow-sm transition-all relative ${
                                                                        ch.status === 'completed'
                                                                            ? 'border-emerald-200 bg-emerald-50/10'
                                                                            : 'border-slate-250'
                                                                    }`}
                                                                >
                                                                    {isEditingChapter ? (
                                                                        /* EDIT FORM */
                                                                        <div className="space-y-3.5 animate-fade-in">
                                                                            <div>
                                                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Chapter Title</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={editChapterTitle}
                                                                                    onChange={(e) => setEditChapterTitle(e.target.value)}
                                                                                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-brand-purple focus:border-brand-purple"
                                                                                />
                                                                            </div>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                                <div>
                                                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Vocabulary (Comma-separated)</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editChapterVocab}
                                                                                        onChange={(e) => setEditChapterVocab(e.target.value)}
                                                                                        placeholder="e.g. Strategy, Pivot, Synergy"
                                                                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-brand-purple"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Grammar Focus</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editChapterGrammar}
                                                                                        onChange={(e) => setEditChapterGrammar(e.target.value)}
                                                                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-brand-purple"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description / Topic Outline</label>
                                                                                <textarea
                                                                                    value={editChapterDesc}
                                                                                    onChange={(e) => setEditChapterDesc(e.target.value)}
                                                                                    rows={2}
                                                                                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-brand-purple"
                                                                                />
                                                                            </div>
                                                                            <div className="flex justify-end gap-1.5">
                                                                                <button
                                                                                    onClick={() => setEditingChapterId(null)}
                                                                                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleSaveEditChapter(comp.competencyName, ch.id)}
                                                                                    className="px-4 py-1.5 text-xs font-black text-white bg-brand-purple rounded hover:bg-opacity-95 shadow-sm transition-colors"
                                                                                >
                                                                                    Save Chapter
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        /* VIEWING MODE */
                                                                        <div className="flex gap-3">
                                                                            {/* Checkbox to Toggle / Move Pending to Completed */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleChapterStatus(comp.competencyName, ch.id)}
                                                                                className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                                                                    ch.status === 'completed'
                                                                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                                                                        : 'border-slate-320 hover:border-brand-purple text-transparent'
                                                                                }`}
                                                                                title={ch.status === 'completed' ? 'Mark Pending' : 'Mark Completed'}
                                                                            >
                                                                                <i className="fas fa-check text-[11px] font-black"></i>
                                                                            </button>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                                                                    <h4 className={`text-sm font-extrabold text-slate-800 ${ch.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                                                                                        Session {idx + 1}: {ch.title}
                                                                                    </h4>
                                                                                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                                                            ch.status === 'completed'
                                                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                                                : 'bg-amber-100 text-amber-800'
                                                                                        }`}>
                                                                                            {ch.status === 'completed' ? 'Completed ✅' : 'Pending ⏳'}
                                                                                        </span>
                                                                                        <button
                                                                                            onClick={() => handleStartEditing(ch)}
                                                                                            className="text-slate-400 hover:text-brand-blue p-1.5 text-xs transition-colors"
                                                                                            title="Edit chapter text"
                                                                                        >
                                                                                            <i className="fas fa-edit"></i>
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleToggleChapterStatus(comp.competencyName, ch.id)}
                                                                                            className={`p-1.5 text-xs transition-colors ${
                                                                                                ch.status === 'completed'
                                                                                                    ? 'text-amber-500 hover:text-amber-700'
                                                                                                    : 'text-emerald-500 hover:text-emerald-700'
                                                                                            }`}
                                                                                            title={ch.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                                                                                        >
                                                                                            <i className={`fas ${ch.status === 'completed' ? 'fa-undo' : 'fa-check-circle'}`}></i>
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleDeleteChapter(comp.competencyName, ch.id)}
                                                                                            className="text-slate-400 hover:text-red-500 p-1.5 text-xs transition-colors"
                                                                                            title="Delete chapter"
                                                                                        >
                                                                                            <i className="fas fa-trash-alt"></i>
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                {/* Description */}
                                                                                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                                                                    {ch.description}
                                                                                </p>
                                                                                {/* Metadata: Vocab & Grammar */}
                                                                                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                                                                                    {ch.grammar && (
                                                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                                                                                            <i className="fas fa-puzzle-piece text-[10px] text-slate-500 mr-1"></i>
                                                                                            Grammar: {ch.grammar}
                                                                                        </span>
                                                                                    )}
                                                                                    {ch.vocabulary && ch.vocabulary.length > 0 && (
                                                                                        <div className="flex items-center gap-1 flex-wrap">
                                                                                            <span className="text-[10px] font-bold text-slate-500"><i className="fas fa-tags text-[10px] mr-1"></i>Vocab:</span>
                                                                                            {ch.vocabulary.map((vocab) => (
                                                                                                <span key={vocab} className="text-[10px] font-semibold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100/60">
                                                                                                    {vocab}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-8 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs">
                                                        <i className="fas fa-inbox text-slate-300 text-2xl block mb-2"></i>
                                                        No chapters match the selected filter.
                                                    </div>
                                                )}

                                                {/* Add Chapter Form */}
                                                {showAddChapterFor === comp.competencyName ? (
                                                    <div className="p-4 bg-white rounded-xl border border-dashed border-brand-purple mt-4 space-y-3.5 animate-fade-in">
                                                        <h5 className="font-bold text-xs text-brand-purple uppercase tracking-wider"><i className="fas fa-plus-circle mr-1"></i> Add Custom Chapter</h5>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Chapter Title</label>
                                                            <input
                                                                type="text"
                                                                value={newChapterTitle}
                                                                onChange={(e) => setNewChapterTitle(e.target.value)}
                                                                placeholder="e.g. Advanced Negotiations & Strategic Pricing"
                                                                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-brand-purple"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vocabulary (Comma-separated)</label>
                                                                <input
                                                                    type="text"
                                                                    value={newChapterVocab}
                                                                    onChange={(e) => setNewChapterVocab(e.target.value)}
                                                                    placeholder="e.g. leverage, concession, walkaway"
                                                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-brand-purple"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Grammar Focus</label>
                                                                <input
                                                                    type="text"
                                                                    value={newChapterGrammar}
                                                                    onChange={(e) => setNewChapterGrammar(e.target.value)}
                                                                    placeholder="e.g. Mixed Conditionals"
                                                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-brand-purple"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                                                            <textarea
                                                                value={newChapterDesc}
                                                                onChange={(e) => setNewChapterDesc(e.target.value)}
                                                                rows={2}
                                                                placeholder="e.g. Practicing soft communication tactics for business disputes."
                                                                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-brand-purple"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => setShowAddChapterFor(null)}
                                                                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleAddChapter(comp.competencyName)}
                                                                className="px-4 py-1.5 text-xs font-black text-white bg-brand-purple rounded hover:bg-opacity-95 shadow-sm transition-colors"
                                                            >
                                                                Add Session
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : statusFilter !== 'completed' && (
                                                    <button
                                                        onClick={() => {
                                                            setShowAddChapterFor(comp.competencyName);
                                                            setNewChapterTitle('');
                                                            setNewChapterVocab('');
                                                            setNewChapterGrammar('');
                                                            setNewChapterDesc('');
                                                        }}
                                                        className="w-full py-2.5 border border-dashed border-gray-300 hover:border-brand-purple rounded-xl text-xs font-bold text-slate-600 hover:text-brand-purple transition-all bg-white flex items-center justify-center gap-1.5"
                                                    >
                                                        <i className="fas fa-plus"></i> Add New Chapter
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Force Sync button */}
                        <div className="mt-6 pt-5 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => {
                                    if (learner.syllabus) {
                                        onUpdate({
                                            ...learner,
                                            syllabus: { ...learner.syllabus }
                                        });
                                        alert("Syllabus forcefully synchronized to 'Integrate Personal Syllabus Chapters' in the New Lesson generator!");
                                    } else {
                                        alert("No syllabus found to synchronize!");
                                    }
                                }}
                                className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-brand-purple hover:opacity-95 rounded-xl shadow-md transition-all flex items-center gap-2"
                            >
                                <i className="fas fa-sync-alt"></i> Force Sync Syllabus to Lesson Generator
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Initial Placeholder state when no syllabus is loaded */
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                        <div className="w-16 h-16 bg-indigo-50 text-brand-purple rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                            <i className="fas fa-map-signs"></i>
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-lg">No Personal Syllabus Generated Yet</h3>
                        <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                            Generate an ultra-personalized, multi-session curriculum custom tailored around your actual English competencies, occupation, and interests.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <button
                                onClick={handleCreateSyllabus}
                                className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 ${
                                    copiedSuccess
                                        ? 'bg-emerald-500 text-white animate-pulse'
                                        : 'bg-brand-purple text-white hover:bg-opacity-90'
                                }`}
                            >
                                <i className={copiedSuccess ? "fas fa-check-circle" : "fas fa-copy"}></i>
                                {copiedSuccess ? 'Prompt Copied to Clipboard!' : 'Create Syllabus'}
                            </button>
                            <button
                                onClick={() => setIsAddingSyllabus(true)}
                                className="px-5 py-2.5 text-xs font-bold rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 bg-white transition-colors"
                            >
                                <i className="fas fa-paste mr-1.5"></i> Paste Generated JSON
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </TierGatedOverlay>
        </SectionCard>
    );
};

export default CompetencySection;