/**
 * Utility functions to calculate rich statistics and outlines for
 * different custom lesson content types dynamically based on their JSON schema.
 */

/**
 * Recursively extracts and counts all words in any string fields within an object/array.
 * Strips HTML tags to count actual text words accurately.
 */
export function countWordsInObject(obj: any): number {
    let wordCount = 0;
    
    function recurse(value: any) {
        if (typeof value === 'string') {
            // Strip HTML tags if present so we don't count tag names as words
            const stripped = value.replace(/<[^>]*>/g, ' ');
            // Replace common punctuation with spaces to avoid joining words
            const cleanText = stripped.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ');
            const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);
            wordCount += words.length;
        } else if (Array.isArray(value)) {
            for (const item of value) {
                recurse(item);
            }
        } else if (value !== null && typeof value === 'object') {
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    recurse(value[key]);
                }
            }
        }
    }
    
    recurse(obj);
    return wordCount;
}

export interface LessonOutlineNode {
    title: string;
    subtitle?: string;
    typeBadge?: string;
    countBadge?: string;
    details?: string[];
}

export interface LessonStats {
    wordCount: number;
    sectionsCount: number;
    partsCount: number;
    duration?: string;
    xpReward?: number;
    activitiesByType: Record<string, number>;
    imagesCount?: number;
    videosCount?: number;
    outline: LessonOutlineNode[];
}

/**
 * Inspects a parsed JSON document and computes structured statistics
 * tailored to the specific schema requirements of the selected content type.
 */
export function calculateLessonStats(parsed: any, type: string): LessonStats {
    const stats: LessonStats = {
        wordCount: 0,
        sectionsCount: 0,
        partsCount: 0,
        activitiesByType: {},
        outline: []
    };

    if (!parsed) return stats;

    try {
        stats.wordCount = countWordsInObject(parsed);

        // Extract media assets and durations from generic root settings
        if (parsed.settings) {
            if (Array.isArray(parsed.settings.lessonImages)) {
                stats.imagesCount = parsed.settings.lessonImages.length;
            }
            if (Array.isArray(parsed.settings.lessonVideos)) {
                stats.videosCount = parsed.settings.lessonVideos.length;
            }
            if (parsed.settings.lessonTimeRange) {
                stats.duration = parsed.settings.lessonTimeRange;
            }
        }

        const typeLower = type.toLowerCase();

        // 1. CORE SECTION-BASED LESSONS (Micro Lessons, Bilingual, Homework, Daily)
        if (['englishlesson', 'englishlessonv2', 'bilingualstudylesson', 'dailylesson', 'homework', 'exampreplesson'].includes(typeLower)) {
            const sections = parsed.sections || [];
            stats.sectionsCount = sections.length;
            
            let totalXp = 0;
            let totalParts = 0;
            const outlineList: LessonOutlineNode[] = [];

            sections.forEach((sec: any, sIdx: number) => {
                const title = sec.title || `Section ${sIdx + 1}`;
                const secXp = typeof sec.xpReward === 'number' ? sec.xpReward : parseInt(sec.xpReward, 10) || 0;
                totalXp += secXp;
                
                const activities = sec.activities || [];
                totalParts += activities.length;

                const actTitles: string[] = [];
                activities.forEach((act: any) => {
                    const actType = act.type || 'activity';
                    stats.activitiesByType[actType] = (stats.activitiesByType[actType] || 0) + 1;
                    actTitles.push(`${act.title || 'Untitled Activity'} (${actType})`);
                });

                outlineList.push({
                    title,
                    subtitle: sec.studyTime || 'No duration specified',
                    typeBadge: `XP: ${secXp}`,
                    countBadge: `${activities.length} ${activities.length === 1 ? 'Activity' : 'Activities'}`,
                    details: actTitles
                });
            });

            stats.partsCount = totalParts;
            stats.xpReward = totalXp;
            stats.outline = outlineList;

        // 2. SIMULATIONS / DIALOGUE-BASED AUDIOS
        } else if (typeLower === 'simulations') {
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
                const firstArrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
                if (firstArrayKey) {
                    sims = parsed[firstArrayKey];
                } else {
                    sims = [parsed];
                }
            }

            stats.sectionsCount = sims.length;
            let totalLines = 0;
            const outlineList: LessonOutlineNode[] = [];

            sims.forEach((sim: any, idx: number) => {
                const dialogue = sim.dialogue || sim.lines || sim.script || [];
                totalLines += dialogue.length;
                
                const charNames = sim.characters || sim.participants || sim.speakers || [];
                const charStr = charNames.length > 0 ? `Voices: ${charNames.join(', ')}` : 'No custom voices specified';

                outlineList.push({
                    title: sim.title || sim.name || `Scenario ${idx + 1}`,
                    subtitle: sim.genre || sim.type || 'Audio Scenario',
                    typeBadge: `${dialogue.length} dialogue lines`,
                    countBadge: `${charNames.length} speakers`,
                    details: [
                        `Context: ${sim.scenario || sim.context || sim.description || 'Interactive simulation context'}`,
                        charStr
                    ]
                });
            });

            stats.partsCount = totalLines;
            stats.outline = outlineList;

        // 3. GUESS THE PLACE INTERACTIVE GAME
        } else if (typeLower === 'placegame') {
            const places = parsed.places || [];
            stats.sectionsCount = places.length;

            const outlineList: LessonOutlineNode[] = [];
            let totalFacts = 0;

            places.forEach((p: any, idx: number) => {
                const factsCount = Array.isArray(p.funFacts) ? p.funFacts.length : 0;
                const cultureCount = Array.isArray(p.cultureNotes) ? p.cultureNotes.length : 0;
                const phrasesCount = Array.isArray(p.localPhrases) ? p.localPhrases.length : 0;
                const audioCount = Array.isArray(p.audioScript) ? p.audioScript.length : 0;
                totalFacts += factsCount + cultureCount;

                outlineList.push({
                    title: p.placeName || `Place ${idx + 1}`,
                    subtitle: `Revealed word: "${p.quotationWordRavel || 'N/A'}"`,
                    typeBadge: `${factsCount} Facts & ${cultureCount} Culture Notes`,
                    countBadge: `${audioCount} Dialogue Lines`,
                    details: [
                        `Image prompts count: ${Array.isArray(p.imagePrompts) ? p.imagePrompts.length : 0}`,
                        `Local vocabulary phrases: ${phrasesCount}`,
                        `Dialogue lines in script: ${audioCount}`,
                        `Things to Try/Avoid: ${Array.isArray(p.thingsToTry) ? p.thingsToTry.length : 0} / ${Array.isArray(p.thingsToAvoid) ? p.thingsToAvoid.length : 0}`
                    ]
                });
            });

            stats.partsCount = totalFacts;
            stats.outline = outlineList;

        // 4. SLIDE PRESENTATION SLIDES
        } else if (typeLower === 'slides') {
            const slides = parsed.slides || [];
            stats.sectionsCount = slides.length;
            const outlineList: LessonOutlineNode[] = [];

            slides.forEach((s: any, idx: number) => {
                outlineList.push({
                    title: s.title || `Slide ${idx + 1}`,
                    subtitle: s.type || 'Standard Presentation Slide',
                    typeBadge: s.duration || 'No duration specified',
                    details: [
                        `Content: ${s.content ? s.content.substring(0, 80) + '...' : 'No inline content text'}`,
                        `Visual prompt for teacher: ${s.visualPrompt || 'None'}`
                    ]
                });
            });

            stats.outline = outlineList;

        // 5. ASSIGNMENTS / POP QUIZ
        } else if (typeLower === 'quiz') {
            const qArray = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.quiz || []);
            stats.sectionsCount = qArray.length;
            const outlineList: LessonOutlineNode[] = [];

            qArray.forEach((q: any, idx: number) => {
                const optionsCount = Array.isArray(q.options) ? q.options.length : 0;
                outlineList.push({
                    title: q.question || q.title || `Question ${idx + 1}`,
                    subtitle: q.type || 'Multiple Choice',
                    typeBadge: q.difficulty || 'Normal',
                    details: [
                        optionsCount > 0 ? `Options: ${q.options.join(' | ')}` : 'Open ended response',
                        `Expected Answer: ${q.answer || q.correctAnswer || 'N/A'}`
                    ]
                });
            });

            stats.outline = outlineList;

        // 6. STUDY GUIDE
        } else if (typeLower === 'studyguide') {
            const outlineList: LessonOutlineNode[] = [];
            if (parsed.audioOverview) {
                const scriptLines = Array.isArray(parsed.audioOverview.script) ? parsed.audioOverview.script.length : 1;
                outlineList.push({
                    title: parsed.audioOverview.title || "Audio Overview (Podcast)",
                    subtitle: "Two-host spoken dialogue module",
                    typeBadge: `${scriptLines} speech parts`,
                });
            }
            if (Array.isArray(parsed.slides)) {
                outlineList.push({
                    title: "Visual Summary Slides",
                    subtitle: "Content presentation system",
                    typeBadge: `${parsed.slides.length} slides`,
                });
            }
            if (Array.isArray(parsed.flashcards)) {
                outlineList.push({
                    title: "Review Flashcards",
                    subtitle: "Active review deck",
                    typeBadge: `${parsed.flashcards.length} cards`,
                });
            }
            stats.sectionsCount = outlineList.length;
            stats.outline = outlineList;

        // 7. LESSON PLAN / TEACHER GUIDE / ACCESSIBILITY GUIDE
        } else if (['lessonplan', 'forteachers', 'lessonguide'].includes(typeLower)) {
            const outlineList: LessonOutlineNode[] = [];
            const planText = parsed.plan || (typeof parsed === 'string' ? parsed : '');
            
            // Extract approximate headers/sections in plan text if it's markdown or html
            if (planText) {
                const sectionMatches = planText.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [];
                sectionMatches.forEach((match: string) => {
                    const cleanHeader = match.replace(/<[^>]*>/g, '').trim();
                    outlineList.push({
                        title: cleanHeader,
                        subtitle: "Plan Section"
                    });
                });
                
                if (outlineList.length === 0) {
                    outlineList.push({
                        title: parsed.title || "Lesson Plan content",
                        subtitle: "Detailed markdown/HTML blueprint"
                    });
                }
            }
            stats.sectionsCount = outlineList.length || 1;
            stats.outline = outlineList;

        // 8. WEEKLY CHALLENGE
        } else if (typeLower === 'weeklychallenge') {
            const days = parsed.days || parsed.challenges || [];
            stats.sectionsCount = days.length;
            const outlineList: LessonOutlineNode[] = [];

            days.forEach((d: any, idx: number) => {
                outlineList.push({
                    title: d.title || d.day || `Day ${idx + 1} Challenge`,
                    subtitle: d.theme || 'Vocabulary & Practice',
                    typeBadge: d.points ? `${d.points} Points` : 'Interactive',
                    details: [
                        `Task description: ${d.description || 'Practice activity'}`,
                        `Task question: ${d.question || 'N/A'}`
                    ]
                });
            });

            stats.outline = outlineList;

        // 9. MUSIC LESSON / VIDEO LESSON
        } else if (typeLower === 'musiclesson' || typeLower === 'videolesson') {
            const outlineList: LessonOutlineNode[] = [];
            if (parsed.songTitle || parsed.title) {
                outlineList.push({
                    title: parsed.songTitle || parsed.title || "Multimedia Source",
                    subtitle: parsed.artist || parsed.channel || "Audio / Video Source material"
                });
            }
            if (Array.isArray(parsed.sections)) {
                parsed.sections.forEach((sec: any) => {
                    outlineList.push({
                        title: sec.title || "Lesson Part",
                        subtitle: sec.type || "Exercises"
                    });
                });
            }
            stats.sectionsCount = outlineList.length || 1;
            stats.outline = outlineList;

        // 11. MOCK TEST (EXAM SIMULATOR)
        } else if (typeLower === 'mocktest') {
            const sections = parsed.sections || [];
            stats.sectionsCount = sections.length;
            
            let totalTasks = 0;
            const outlineList: LessonOutlineNode[] = [];

            sections.forEach((sec: any, sIdx: number) => {
                const title = sec.sectionTitle || `Section ${sIdx + 1}`;
                const tasks = sec.tasks || [];
                totalTasks += tasks.length;

                const taskDetails: string[] = [];
                tasks.forEach((task: any, tIdx: number) => {
                    const taskType = task.taskType || 'task';
                    stats.activitiesByType[taskType] = (stats.activitiesByType[taskType] || 0) + 1;
                    taskDetails.push(`Task #${tIdx + 1}: ${task.title || 'Untitled Task'} (${taskType})`);
                });

                outlineList.push({
                    title,
                    subtitle: sec.skillDomain || 'General Domain',
                    typeBadge: `Duration: ${sec.durationMinutes || parsed.examMetadata?.totalDurationMinutes || 15} mins`,
                    countBadge: `${tasks.length} ${tasks.length === 1 ? 'Task' : 'Tasks'}`,
                    details: taskDetails
                });
            });

            stats.partsCount = totalTasks;
            stats.duration = parsed.examMetadata?.totalDurationMinutes ? `${parsed.examMetadata.totalDurationMinutes} mins` : undefined;
            stats.outline = outlineList;

        // 10. GENERAL FALLBACK
        } else {
            stats.outline = [
                {
                    title: parsed.title || parsed.lessonName || parsed.name || "Custom Interactive Content",
                    subtitle: "Schema structure parsed successfully",
                    typeBadge: `${Object.keys(parsed).length} top-level configuration keys`
                }
            ];
            stats.sectionsCount = 1;
        }
    } catch (err) {
        console.error("Error computing lesson outline stats:", err);
    }

    return stats;
}
