
import type { HomeworkOutput, LearnerProfile, Section, Activity } from '../types';
import { generateEnglishLessonHtml } from './englishLessonHtmlGenerator';
import type { LessonSettings } from './htmlGenerator';
import { injectMediaHtml } from './lessonMedia';

export const handleSaveHomeworkAsInteractiveHtml = (
    content: HomeworkOutput,
    learner: LearnerProfile,
    lessonSettings?: LessonSettings
) => {
    
    // Map HomeworkOutput to StructuredOutput (Section[])
    const sections: Section[] = [];

    // Helper to create simple activities
    const createAct = (type: string, title: string, content: string): Activity => ({
        type, title, content
    });

    // 1. READING
    if (content.reading) {
        const activities: Activity[] = [];
        content.reading.tasks.forEach(task => {
            activities.push(createAct('paragraph', task.title, task.text || ''));
            // Removed short_answer questions per user request
        });
        sections.push({
            title: content.reading.title || "Reading Practice",
            color: "#2563eb",
            activities,
            studyTime: "20 mins"
        });
    }

    // 2. LISTENING
    if (content.listening) {
        const activities: Activity[] = [];
        
        // Podcast
        if (content.listening.podcast) {
            activities.push(createAct('paragraph', '🎧 Podcast Context', `<em>${content.listening.podcast.scenario}</em>`));
            
            // Big button to listen to the podcast using the TTS engine
            const scriptStr = content.listening.podcast.script || '';
            activities.push(createAct('paragraph', 'Play Podcast', `<div style="text-align: center; margin: 20px 0;"><button class="duo-btn" onclick="LessonApp.speakText(decodeURIComponent('${encodeURIComponent(scriptStr)}'))" style="font-size: 1.2rem; padding: 15px 30px;"><i class="fas fa-play-circle mr-2"></i> Listen to Podcast Track</button></div><br><details><summary style="cursor:pointer; color:var(--theme-primary);">Show Audio Transcript</summary><div style="margin-top:10px; padding:15px; background:var(--theme-surface); border-radius:8px;">${scriptStr.replace(/\n/g, '<br>')}</div></details>`));
            
            // Removed short_answer questions per user request
        }

        // Conversation
        if (content.listening.conversation) {
             activities.push(createAct('paragraph', '🗣️ Conversation Context', `<em>${content.listening.conversation.scenario}</em>`));
             
             let scriptContent = content.listening.conversation.script || '';
             // Render a big button and the dialogue
             activities.push(createAct('paragraph', 'Play Conversation', `<div style="text-align: center; margin: 20px 0;"><button class="duo-btn secondary" onclick="LessonApp.speakText(decodeURIComponent('${encodeURIComponent(scriptContent)}'))" style="font-size: 1.2rem; padding: 15px 30px;"><i class="fas fa-comments mr-2"></i> Listen to Conversation</button></div><details><summary style="cursor:pointer; color:var(--theme-secondary);">Show Dialogue Transcript</summary><div style="margin-top:10px; padding:15px; background:var(--theme-surface); border-radius:8px;">${scriptContent.replace(/\n/g, '<br>')}</div></details>`));

             // Removed short_answer questions per user request
        }

        sections.push({
            title: content.listening.title || "Listening Practice",
            color: "#059669",
            activities,
            studyTime: "20 mins"
        });
    }

    // 3. DIALOGUE (Interactive)
    if (content.dialogue) {
        const activities: Activity[] = [];
        activities.push(createAct('paragraph', 'Context', content.dialogue.context || ''));
        
        let scriptType = 'paragraph';
        let scriptContent = content.dialogue.script || '';
        
        try {
            if (scriptContent.trim().startsWith('{') || scriptContent.trim().startsWith('[')) {
                JSON.parse(scriptContent); 
                scriptType = 'movie_scene'; 
            } else {
                scriptContent = scriptContent.replace(/\n/g, '<br>');
            }
        } catch(e) {
            scriptContent = scriptContent.replace(/\n/g, '<br>');
        }

        activities.push(createAct(scriptType, 'Interactive Dialogue', scriptContent));
        
        // Removed short_answer questions per user request

        sections.push({
            title: content.dialogue.title || "Dialogue Masterclass",
            color: "#db2777",
            activities,
            studyTime: "15 mins"
        });
    }

    // 4. GRAMMAR & VOCABULARY (Try Interactive)
    if (content.grammar || content.vocabulary) {
        const activities: Activity[] = [];
        
        if (content.grammar) {
            activities.push(createAct('grammar_explanation', 'Grammar Guide', JSON.stringify({ explanation: content.grammar.explanation || '' })));
            
            let exType = 'paragraph';
            let exContent = content.grammar.exercises || '';
            try {
                if (exContent.trim().startsWith('[')) {
                    const parsed = JSON.parse(exContent);
                    if (parsed.length > 0 && parsed[0].sentence) {
                        exType = 'scramble'; // Assume scramble
                        if (parsed[0].sentence.includes('_')) {
                            exType = 'gap_fill'; // Actually it's gap fill
                        }
                    }
                }
            } catch(e) {}
            activities.push(createAct(exType, 'Grammar Practice', exContent));
        }

        if (content.vocabulary) {
             activities.push(createAct('paragraph', 'Vocabulary Guide', content.vocabulary.explanation || ''));
             let exType = 'paragraph';
             let exContent = content.vocabulary.exercises || '';
             try {
                if (exContent.trim().startsWith('[')) {
                    const parsed = JSON.parse(exContent);
                    if (parsed.length > 0 && parsed[0].left) exType = 'matching';
                }
            } catch(e) {}
            activities.push(createAct(exType, 'Vocabulary Practice', exContent));
            
            // Add a flashcard version as well if it's matching
            if (exType === 'matching') {
                 try {
                     const parsed = JSON.parse(exContent);
                     const fcData = parsed.map((item: any) => ({ front: item.left, back: item.right }));
                     activities.push(createAct('flashcard', 'Vocabulary Flashcards', JSON.stringify({ cards: fcData })));
                 } catch(e) {}
            }
        }

        sections.push({
            title: "Language Focus",
            color: "#7c3aed",
            activities,
            studyTime: "20 mins"
        });
    }

    // 5. OUTPUT SKILLS (Speaking, Writing, Integrated)
    if (content.speaking || content.writing || content.integratedSkills || content.softSkills) {
        const activities: Activity[] = [];
        
        if (content.speaking) {
            activities.push(createAct('speaking_jam', '🗣️ Speaking Task: ' + (content.speaking.title || ''), JSON.stringify({ prompt: content.speaking.prompt, timeSeconds: 60 })));
            activities.push(createAct('voice_recording', '🎤 Record Speaking Task', JSON.stringify({ prompt: "Record your answer completely.", text: "", type: "voice_recording" })));
            activities.push(createAct('paragraph', 'Model Answer', `<details><summary>Reveal Model Answer</summary>${content.speaking.modelAnswer}</details>`));
        }

        if (content.writing) {
             activities.push(createAct('guided_writing', '✍️ Writing Planning: ' + (content.writing.title || ''), JSON.stringify({ topic: content.writing.prompt, instruction: content.writing.instruction })));
             activities.push(createAct('essay_writing', '✍️ Submit Final Essay', JSON.stringify({ prompt: "Write your final polished response here.", minWords: 100, type: "essay_writing" })));
        }

        if (content.integratedSkills) {
             activities.push(createAct('paragraph', '🔄 Integrated Challenge', 
                `<strong>Scenario:</strong> ${content.integratedSkills.scenario}<br><br><strong>Task:</strong> ${content.integratedSkills.task}`));
        }
        
        if (content.softSkills) {
             activities.push(createAct('paragraph', '🤝 Soft Skills Challenge', 
                `<strong>Scenario:</strong> ${content.softSkills.scenario}<br><br><strong>Task:</strong> ${content.softSkills.task}`));
        }

        sections.push({
            title: "Output & Skills",
            color: "#ea580c",
            activities,
            studyTime: "25 mins"
        });
    }
    
    // 6. FICTION & ROLEPLAY
    if (content.fiction || content.roleplay) {
        const activities: Activity[] = [];
        if (content.fiction) {
            activities.push(createAct('paragraph', 'Fiction Story', `<div class="story-wrapper" style="font-family: var(--theme-font); font-size: 1.1rem; line-height: 1.8;">${content.fiction.story || ''}</div>`));
            activities.push(createAct('paragraph', 'Listen to Story', `<div style="text-align: center; margin: 20px 0;"><button class="duo-btn" onclick="LessonApp.speakText(decodeURIComponent('${encodeURIComponent(content.fiction.story || '')}'))"><i class="fas fa-book-reader mr-2"></i> Read Story Aloud</button></div>`));
            
            // Removed short_answer questions per user request
        }
        if (content.roleplay) {
             activities.push(createAct('paragraph', '🎭 Interactive Roleplay', 
                `<strong>Scenario:</strong> ${content.roleplay.scenario}<br><br><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div class="p-4 bg-red-50 border-l-4 border-red-500 rounded"><h4 class="font-bold text-red-700">Option A: ${content.roleplay.optionA?.description || ''}</h4><p class="mt-2 text-red-900">${content.roleplay.optionA?.outcome || ''}</p></div>
                 <div class="p-4 bg-green-50 border-l-4 border-green-500 rounded"><h4 class="font-bold text-green-700">Option B: ${content.roleplay.optionB?.description || ''}</h4><p class="mt-2 text-green-900">${content.roleplay.optionB?.outcome || ''}</p></div>
                 </div><br><details><summary>Expert Comment</summary><div class="p-3 bg-gray-100 italic">${content.roleplay.expertComment}</div></details>`));
                 
             // Removed short_answer questions per user request
        }
        sections.push({
            title: "Scenarios & Stories",
            color: "#be185d",
            activities,
            studyTime: "20 mins"
        });
    }
    
    // 7. REVIEW & DISCUSSION
     if (content.review || content.discussion || content.practical) {
        const activities: Activity[] = [];
        if (content.review) {
             activities.push(createAct('paragraph', 'Week Review', content.review.analysis || ''));
             // Removed short_answer questions per user request
        }
        if (content.discussion) {
             const comments = content.discussion.comments ? content.discussion.comments.map(c => `<div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200"><b>🧔🏻 ${c.character}:</b> ${c.text}</div>`).join('') : '';
             activities.push(createAct('paragraph', 'Discussion Corner', `<div class="italic text-gray-600 mb-4">${content.discussion.intro}</div>${comments}`));
        }
        if (content.practical) {
             activities.push(createAct('paragraph', '🛠️ Practical Mission', `<strong>Your Search Mission:</strong> ${content.practical.searchTopic}<br><br><strong>Instructions:</strong> ${content.practical.taskInstructions}`));
        }
        sections.push({
            title: "Real World Context",
            color: "#111827",
            activities,
            studyTime: "15 mins"
        });
    }

    // 8. ANSWER KEY (Hidden in details)
    if (content.answerKey) {
        sections.push({
            title: "Answer Key",
            color: "#4b5563",
            activities: [createAct('paragraph', 'Full Key', `<details><summary>Click to Reveal Full Answer Key</summary><pre style="white-space:pre-wrap;">${content.answerKey}</pre></details>`)],
            studyTime: "Reference"
        });
    }

    // 9. SAVE REPORT
    sections.push({
        title: "🏁 Finish",
        color: "#10b981",
        activities: [createAct('save_report', 'Save Session Report', JSON.stringify({text: "Download your completed homework.", type: "save_report"}))],
        studyTime: "Reference"
    });

    // Generate HTML using the English Lesson Generator (which uses the Themed Layout + Duo Gamification)
    // We pass 'false' for relativePaths to use standard embedding
    const html = injectMediaHtml(generateEnglishLessonHtml(
        { sections }, 
        { generatedAt: new Date().toISOString() } as any, 
        learner, 
        lessonSettings, 
        'learner',
        false
    ), lessonSettings);

    return html;
};
