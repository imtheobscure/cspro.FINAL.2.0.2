
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ai, getProfileContext, generateContentWithRetry } from '../core';
import { ALL_VOICES } from '../../../utils/voices';
import { encode, decode, pcmToWav } from '../../../utils/audioUtils';
import type { LearnerProfile } from '../../../types';

const dailyContentSchema = {
    type: Type.OBJECT,
    properties: {
        lessonTitle: { type: Type.STRING },
        genre: { type: Type.STRING, description: "Genre of audio dialogue." },
        imagePrompt: { type: Type.STRING },
        warmUpQuestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } },
                required: ["question", "answer"]
            }
        },
        audioKeywords: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { word: { type: Type.STRING }, definition: { type: Type.STRING }, example: { type: Type.STRING } },
                required: ["word", "definition", "example"]
            },
            description: "At least 15-20 items including idioms, phrasal verbs, and collocations."
        },
        audioContext: { type: Type.STRING },
        audioDialogue: {
            type: Type.OBJECT,
            properties: {
                script: { type: Type.STRING },
                characters: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { name: { type: Type.STRING }, voice: { type: Type.STRING }, role: { type: Type.STRING } },
                        required: ["name", "voice", "role"]
                    }
                }
            },
            required: ["script", "characters"]
        },
        textContext: { type: Type.STRING },
        article: {
            type: Type.OBJECT,
            properties: {
                basic: { type: Type.STRING, description: "At least 750 words. HTML formatted (<h3>, <p>, <b>, <i>). Paragraphs and subheadings." },
                intermediate: { type: Type.STRING, description: "At least 750 words. HTML formatted (<h3>, <p>, <b>, <i>). Paragraphs and subheadings." },
                advanced: { type: Type.STRING, description: "At least 750 words. HTML formatted (<h3>, <p>, <b>, <i>). Paragraphs and subheadings." },
            },
            required: ["basic", "intermediate", "advanced"]
        },
        languageAnalysisSlides: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    level: { type: Type.STRING, enum: ['Basic', 'Intermediate', 'Advanced'] },
                    title: { type: Type.STRING },
                    grammarPoint: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                    example: { type: Type.STRING },
                    alternative: { type: Type.STRING },
                    commonMistake: { type: Type.STRING }
                },
                required: ["level", "title", "grammarPoint", "meaning", "example", "alternative", "commonMistake"]
            },
            description: "Exactly 9 slides: 3 Basic, 3 Intermediate, 3 Advanced."
        },
        radioDramaScript: { type: Type.STRING, description: "A script for a radio drama with multiple characters and emotions. Do not include character names in the spoken lines, only in the speaker indication." },
        radioDramaCharacters: {
             type: Type.ARRAY,
             items: {
                 type: Type.OBJECT,
                 properties: { name: { type: Type.STRING }, voice: { type: Type.STRING } },
                 required: ["name", "voice"]
             }
        },
        quiz: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must have exactly 4 options." },
                    correctAnswers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The single correct answer string." },
                },
                required: ["question", "choices", "correctAnswers"]
            },
            description: "10 analytical multiple choice questions integrating all steps."
        },
        secretCode: { type: Type.STRING },
        comments: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { characterName: { type: Type.STRING }, comment: { type: Type.STRING } },
                required: ["characterName", "comment"]
            }
        },
        discussionQuestion: { type: Type.STRING },
        discussionAnswer: { type: Type.STRING, description: "The name of the character who gives the correct answer." },
    },
    required: [
        "lessonTitle", "genre", "imagePrompt", "warmUpQuestions", "audioKeywords",
        "audioContext", "audioDialogue", "textContext", "article", "languageAnalysisSlides",
        "radioDramaScript", "radioDramaCharacters", "quiz", "secretCode",
        "comments", "discussionQuestion", "discussionAnswer"
    ]
};


export const generateChallengePage = async (profile: LearnerProfile, rawText: string): Promise<{htmlContent: string, secretCode: string, lessonTitle: string}> => {
    
    // Get list of available voices to inject into prompt
    const validVoices = ALL_VOICES.map(v => `${v.name} (${v.gender}, ${v.description})`).join(', ');

    // 1. Generate structured content (JSON) and an image prompt
    const contentGenerationPrompt = `
      ${getProfileContext(profile)}

      You are provided with a raw text. Based on this text, generate the complete content for a "Daily English Lesson" following a specific 10-step structure.
      The lesson must be personalized for the learner: ${profile.name}.
      
      Raw Text:
      ---
      ${rawText}
      ---
      
      --- GENERATION INSTRUCTIONS (EXTREME QUALITY & QUANTITY) ---
      
      1. **Genre & Tone**: Select a unique genre for the Audio (e.g. Debate, Gossip, News).
      2. **Step 1: Warm-up**: 3 questions + answers.
      3. **Step 2: Keywords (EXPANDED)**: Generate **at least 15-20 items**. Include advanced words, idioms, phrasal verbs, and collocations found in the text.
      4. **Step 3: Listen**: 2 characters, valid voices [${validVoices}]. Script > 600 words.
      5. **Step 4: Read (MASSIVE TEXT)**: Rewrite the article into 3 levels (Basic, Intermediate, Advanced).
         - **CRITICAL LENGTH**: Each text MUST be **at least 750 words**. Do not shorten.
         - **FORMATTING**: Use HTML tags \`<h3>\` for subheadings, \`<p>\` for paragraphs, \`<b>\` for bold key terms, and \`<i>\` for emphasis. Do NOT produce a single wall of text.
         - **Note**: Do NOT use bracketed definitions in the text. All definitions must be in the Step 2 Keywords table.
      
      6. **Step 5: Language Analysis Slides**: Generate 9 analytical slides (3 Basic, 3 Intermediate, 3 Advanced). Explain grammar form, meaning, alternative, and common mistakes.
      
      7. **Step 6: Radio Drama**: Write a script for a radio drama integrating the concepts. Multiple characters, emotions. Ensure the script format separates speaker names from spoken lines clearly so names are not read aloud.
      
      8. **Step 7: Dictation**: (Handled by app logic using text from Step 4, just ensure text is high quality).
      
      9. **Step 8: Discussion Corner**: 
         - Create a discussion question.
         - Generate 4 character comments (Chad, Brittany, Mr. Worthington, Kevin).
         - **CRITICAL**: Ensure exactly ONE character (specified in \`discussionAnswer\`) gives the correct/insightful answer to the question.
      
      10. **Step 9: Test Your Knowledge**: 10 analytical multiple-choice questions covering ALL previous steps (1-8).
      
      11. **Step 10: Secret Code**: Reveal based on accuracy.
      
      12. **Image Prompt**: Photorealistic, cinematic 8k.
    `;

    // Retry for JSON content too
    const jsonResult = await generateContentWithRetry({
        model: "gemini-2.5-pro",
        contents: contentGenerationPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: dailyContentSchema,
            thinkingConfig: { thinkingBudget: 4096 } // Higher budget for massive text generation
        }
    });

    const content = JSON.parse(jsonResult.text);

    // 2. Generate the image
    const imageResponse = await generateContentWithRetry({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: content.imagePrompt }] },
        config: { responseModalities: [Modality.IMAGE] },
    });
    
    let base64Image = '';
    for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) base64Image = part.inlineData.data;
    }
    const imageUrl = `data:image/png;base64,${base64Image}`;

    // 3. Generate audio for Dialogue and Radio Drama
    const generateMultiSpeakerAudio = async (script: string, characters: any[]) => {
        const speakerConfigs = characters.map((c: any) => {
            const matchedVoice = ALL_VOICES.find(v => v.id === c.voice || v.name === c.voice);
            const voiceId = matchedVoice ? matchedVoice.id : 'Zephyr';
            return {
                speaker: c.name,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } }
            };
        });
        
        return generateContentWithRetry({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `TTS the following conversation. Do not read the names of the speakers, only their lines:\n${script}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: speakerConfigs.length === 2 
                    ? { multiSpeakerVoiceConfig: { speakerVoiceConfigs: speakerConfigs } }
                    : { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } } // Fallback
            }
        });
    };

    const [listenAudioRes, radioDramaAudioRes] = await Promise.all([
        generateMultiSpeakerAudio(content.audioDialogue.script, content.audioDialogue.characters),
        generateMultiSpeakerAudio(content.radioDramaScript, content.radioDramaCharacters)
    ]);

    const getAudioBase64 = (res: any) => {
        const raw = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!raw) return '';
        const pcm = decode(raw);
        return encode(pcmToWav(pcm, 24000));
    };

    const listenAudioBase64 = getAudioBase64(listenAudioRes);
    const radioAudioBase64 = getAudioBase64(radioDramaAudioRes);

    // 4. Construct HTML
    const warmUpHtml = content.warmUpQuestions.map((q: any, index: number) => `
        <div class="warmup-item">
            <p class="question"><strong>Q${index + 1}:</strong> ${q.question}</p>
            <details><summary>Show Answer</summary><p class="answer">${q.answer}</p></details>
        </div>
    `).join('');

    const keywordsHtml = `
        <table class="keywords-table">
            <thead><tr><th>Word/Phrase</th><th>Definition</th><th>Example</th></tr></thead>
            <tbody>${content.audioKeywords.map((k: any) => `<tr><td class="word">${k.word}</td><td>${k.definition}</td><td class="example"><em>"${k.example}"</em></td></tr>`).join('')}</tbody>
        </table>
    `;

    const slidesHtml = content.languageAnalysisSlides.map((s: any, i: number) => `
        <div class="slide-card ${s.level.toLowerCase()}">
            <div class="slide-badge">${s.level}</div>
            <h3>${s.title}</h3>
            <p><strong>Grammar:</strong> <span style="color:#2563eb">${s.grammarPoint}</span></p>
            <p><strong>Meaning:</strong> ${s.meaning}</p>
            <p class="example-box">"${s.example}"</p>
            <p><strong>Alternative:</strong> ${s.alternative}</p>
            <p class="mistake-box">⚠️ <strong>Avoid:</strong> ${s.commonMistake}</p>
        </div>
    `).join('');

    const commentsHtml = content.comments.map((c: any) => `
        <div class="comment" data-character-name="${c.characterName}">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${c.characterName}" alt="${c.characterName}" class="avatar">
            <div class="comment-body"><p class="character-name">${c.characterName}</p><p class="comment-text">${c.comment}</p></div>
        </div>
    `).join('');

    const quizHtml = content.quiz.map((q: any, index: number) => `
        <div class="quiz-question">
            <p class="question-text">${index + 1}. ${q.question}</p>
            <div class="choices">
                ${q.choices.map((choice: string) => `<label class="choice"><input type="radio" name="q${index}" value="${choice.replace(/"/g, '&quot;')}"><span>${choice}</span></label>`).join('')}
            </div>
        </div>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.lessonTitle}</title>
        
        <style>
            :root { --primary: #4f46e5; --bg: #f9fafb; --card: #fff; --text: #1f2937; }
            body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding-bottom: 120px; margin: 0; }
            .container { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
            .card { background: var(--card); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 2rem; margin-bottom: 2rem; }
            h1 { text-align: center; margin: 2rem 0; font-size: 2.5rem; }
            h2 { color: var(--primary); border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; margin-top: 0; }
            h3 { color: #374151; margin-top: 1.5rem; }
            .header-image { width: 100%; height: auto; border-radius: 8px; margin-bottom: 2rem; }
            
            .text-content { line-height: 1.8; font-size: 1.1rem; }
            .text-content p { margin-bottom: 1rem; }
            
            .tabs { display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
            .tab-btn { padding: 10px 20px; border: none; background: none; cursor: pointer; font-weight: 600; color: #6b7280; border-bottom: 3px solid transparent; }
            .tab-btn.active { color: var(--primary); border-color: var(--primary); }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
            
            .karaoke-controls { margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd; text-align: center; }
            .karaoke-stats { font-weight: bold; margin-top: 10px; color: #0369a1; }
            
            /* Karaoke Modal */
            #karaoke-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; justify-content: center; align-items: center; }
            .karaoke-box { background: white; width: 90%; max-width: 700px; height: 80vh; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
            .karaoke-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
            .karaoke-word-area { flex: 1; overflow-y: auto; font-size: 1.5rem; line-height: 2; padding: 20px; text-align: left; }
            .k-word { padding: 2px 5px; border-radius: 4px; transition: background 0.2s, color 0.2s; }
            .k-word.spoken { color: #16a34a; font-weight: bold; }
            .k-word.current { background-color: #fef08a; border-bottom: 2px solid orange; }
            
            .dictation-area { margin-top: 20px; background: #fefce8; padding: 20px; border-radius: 8px; border: 1px solid #fef08a; }
            .dict-feedback { min-height: 30px; font-weight: bold; margin-top: 10px; }
            .correct-word { color: green; margin-right: 5px; }
            .incorrect-word { color: red; text-decoration: line-through; margin-right: 5px; }
            
            .slide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
            .slide-card { padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
            .slide-card.basic { border-left: 4px solid #3b82f6; }
            .slide-card.intermediate { border-left: 4px solid #8b5cf6; }
            .slide-card.advanced { border-left: 4px solid #ef4444; }
            .slide-badge { display: inline-block; padding: 2px 8px; background: #eee; border-radius: 4px; font-size: 0.8rem; margin-bottom: 5px; font-weight: bold; }
            .example-box { background: #f0fdf4; padding: 5px; border-left: 2px solid #22c55e; font-style: italic; }
            .mistake-box { background: #fef2f2; padding: 5px; border-left: 2px solid #ef4444; }

            .comment { display: flex; gap: 1rem; margin-bottom: 1rem; padding: 10px; border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
            .comment:hover { background: #f9fafb; border-color: #d1d5db; }
            .comment.correct { background: #dcfce7; border-color: #16a34a; }
            .comment.incorrect { background: #fee2e2; border-color: #ef4444; }
            .avatar { width: 40px; height: 40px; border-radius: 50%; }
            
            .quiz-question { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
            .choice { display: block; margin: 5px 0; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s; }
            .choice:hover { background: #f3f4f6; }
            .choice input { margin-right: 10px; }
            
            /* PROGRESS FOOTER */
            .fixed-footer { position: fixed; bottom: 0; left: 0; width: 100%; background: #1f2937; color: white; padding: 15px 20px; box-shadow: 0 -4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: space-between; z-index: 9999; box-sizing: border-box; }
            .progress-container { flex-grow: 1; margin: 0 20px; background: #374151; height: 10px; border-radius: 5px; overflow: hidden; }
            .progress-bar { height: 100%; width: 0%; background: #10b981; transition: width 0.5s ease; }
            #secret-reveal-area { display: none; background: #064e3b; padding: 10px 20px; border-radius: 8px; border: 1px solid #10b981; animation: pulse 2s infinite; }
            @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
            
            /* Keywords & Warmup */
            .keywords-table { width: 100%; border-collapse: collapse; }
            .keywords-table th, .keywords-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .keywords-table th { background: #f3f4f6; }
            .warmup-item { background: #f3f4f6; padding: 10px; margin-bottom: 10px; border-radius: 6px; }
            
            button { cursor: pointer; padding: 8px 16px; border-radius: 6px; border: none; font-weight: 600; }
            .btn-primary { background: var(--primary); color: white; }
            .btn-close { background: #ef4444; color: white; }
            .btn-mic { width: 60px; height: 60px; border-radius: 50%; font-size: 24px; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.4); }
            .btn-mic.listening { animation: pulse-red 1.5s infinite; background: #b91c1c; }
            @keyframes pulse-red { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${content.lessonTitle}</h1>
            <img src="${imageUrl}" class="header-image">
            
            <!-- Step 1 -->
            <div class="card">
                <h2>1. Warm-up</h2>
                ${warmUpHtml}
            </div>
            
            <!-- Step 2 -->
            <div class="card">
                <h2>2. Keywords & Phrases</h2>
                <p>Master these expressions before reading.</p>
                ${keywordsHtml}
            </div>
            
            <!-- Step 3 -->
            <div class="card">
                <h2>3. Listen (${content.genre})</h2>
                <p><em>${content.audioContext}</em></p>
                <audio controls src="data:audio/wav;base64,${listenAudioBase64}" style="width:100%"></audio>
            </div>
            
            <!-- Step 4 & 5 -->
            <div class="card">
                <h2>4. Read & 5. Karaoke</h2>
                <div class="tabs">
                    <button class="tab-btn active" onclick="openTab('basic')">Basic</button>
                    <button class="tab-btn" onclick="openTab('intermediate')">Intermediate</button>
                    <button class="tab-btn" onclick="openTab('advanced')">Advanced</button>
                </div>
                
                <div id="basic" class="tab-content active">
                    <div class="text-content" id="text-basic">${content.article.basic}</div>
                </div>
                <div id="intermediate" class="tab-content">
                    <div class="text-content" id="text-intermediate">${content.article.intermediate}</div>
                </div>
                <div id="advanced" class="tab-content">
                    <div class="text-content" id="text-advanced">${content.article.advanced}</div>
                </div>
                
                <div class="karaoke-controls">
                    <h3>🎤 News Reporter Challenge</h3>
                    <p>Click "Start Karaoke" to open the teleprompter. Read aloud to test your speed!</p>
                    <button id="karaoke-btn" class="btn-primary" onclick="openKaraokeModal()"><i class="fas fa-microphone-alt"></i> Start Karaoke</button>
                    <div class="karaoke-stats" id="karaoke-stats">Record: 0 WPM</div>
                </div>
            </div>
            
            <!-- Step 6 -->
            <div class="card">
                <h2>6. Language Analysis</h2>
                <div class="slide-grid">
                    ${slidesHtml}
                </div>
            </div>
            
            <!-- Step 7 -->
            <div class="card">
                <h2>7. Radio Drama</h2>
                <p>Integration of concepts in a dramatic scenario with multiple characters.</p>
                <audio controls src="data:audio/wav;base64,${radioAudioBase64}" style="width:100%"></audio>
            </div>
            
            <!-- Step 8 -->
            <div class="card">
                <h2>8. Dictation Challenge</h2>
                <div class="dictation-area">
                    <p>Listen and type exactly what you hear. Phrases will play automatically.</p>
                    <button id="dictation-start" class="btn-primary" onclick="startDictation()">Start Dictation</button>
                    <input type="text" id="dictation-input" style="width:100%; padding:10px; margin-top:10px; display:none;" placeholder="Type here..." autocomplete="off">
                    <div id="dictation-feedback" class="dict-feedback"></div>
                    <div id="dictation-accuracy"></div>
                </div>
            </div>
            
            <!-- Step 9 -->
            <div class="card">
                <h2>9. Discussion Corner</h2>
                <p style="font-weight:bold; text-align:center;">${content.discussionQuestion}</p>
                <p style="font-size:0.9rem; text-align:center; color:#666;">Click the comment that answers the question correctly.</p>
                ${commentsHtml}
                <div id="discussion-result" style="text-align:center; margin-top:10px; font-weight:bold;"></div>
            </div>
            
            <!-- Step 10 -->
            <div class="card">
                <h2>10. Test Your Knowledge</h2>
                <p>Complete the quiz to reveal the secret code in the footer!</p>
                <div id="quiz-container">${quizHtml}</div>
                <button class="btn-primary" style="width:100%" onclick="checkQuiz()">Submit Answers & Check Progress</button>
                <div id="quiz-score" style="text-align:center; margin-top:10px; font-weight:bold;"></div>
            </div>
        </div>
        
        <!-- PROGRESS FOOTER -->
        <div class="fixed-footer">
            <div style="font-weight:bold;">Progress</div>
            <div class="progress-container">
                <div id="footer-progress-bar" class="progress-bar"></div>
            </div>
            <div id="secret-reveal-area">
                SECRET: <span style="color:white; font-family:monospace; font-size:1.2rem;">${content.secretCode}</span>
            </div>
            <div id="locked-msg" style="color:#9ca3af; font-size:0.9rem;">
                <i class="fas fa-lock"></i> Pass quiz to unlock
            </div>
        </div>

        <!-- KARAOKE MODAL -->
        <div id="karaoke-modal">
            <div class="karaoke-box">
                <div class="karaoke-header">
                    <h3>🎤 Live Teleprompter</h3>
                    <button class="btn-close" onclick="closeKaraokeModal()">X</button>
                </div>
                <div id="karaoke-word-area" class="karaoke-word-area"></div>
                <div style="text-align:center; padding-top:20px; border-top:1px solid #eee;">
                    <button id="karaoke-mic-btn" class="btn-mic" onclick="toggleKaraokeListen()"><i class="fas fa-microphone"></i></button>
                    <p id="karaoke-status">Tap mic to start reading</p>
                </div>
            </div>
        </div>

        <script>
            function openTab(id) {
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.getElementById(id).classList.add('active');
                event.target.classList.add('active');
            }
            
            // --- Karaoke Logic (Webkit Speech) ---
            let recognition = null;
            let isKaraokeListening = false;
            let karaokeWords = [];
            let currentWordIndex = 0;
            let kStartTime = 0;
            
            function openKaraokeModal() {
                // Get active text
                const activeTab = document.querySelector('.tab-content.active .text-content');
                // Strip HTML tags for word extraction
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = activeTab.innerHTML;
                const rawText = tempDiv.textContent || tempDiv.innerText || "";
                
                karaokeWords = rawText.split(/\\s+/).filter(w => w.trim() !== "");
                
                const area = document.getElementById('karaoke-word-area');
                area.innerHTML = karaokeWords.map((w, i) => \`<span id="kw-\${i}" class="k-word">\${w}</span>\`).join(' ');
                
                document.getElementById('karaoke-modal').style.display = 'flex';
                currentWordIndex = 0;
                highlightCurrentWord();
            }
            
            function closeKaraokeModal() {
                if(recognition) recognition.stop();
                isKaraokeListening = false;
                document.getElementById('karaoke-modal').style.display = 'none';
            }
            
            function highlightCurrentWord() {
                document.querySelectorAll('.k-word').forEach(el => el.classList.remove('current'));
                const el = document.getElementById('kw-' + currentWordIndex);
                if(el) {
                    el.classList.add('current');
                    el.scrollIntoView({behavior: "smooth", block: "center"});
                }
            }
            
            function toggleKaraokeListen() {
                if (!('webkitSpeechRecognition' in window)) { alert("Speech API not supported."); return; }
                
                if (isKaraokeListening) {
                    recognition.stop();
                    isKaraokeListening = false;
                    document.getElementById('karaoke-mic-btn').classList.remove('listening');
                    document.getElementById('karaoke-status').innerText = "Paused";
                    return;
                }
                
                recognition = new webkitSpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';
                
                kStartTime = Date.now();
                isKaraokeListening = true;
                document.getElementById('karaoke-mic-btn').classList.add('listening');
                document.getElementById('karaoke-status').innerText = "Listening... Read the yellow word!";
                
                recognition.onresult = (event) => {
                    // Get the latest result
                    const result = event.results[event.results.length - 1];
                    const transcript = result[0].transcript.trim().toLowerCase();
                    const wordsSpoken = transcript.split(/\\s+/);
                    
                    // Check against current target word
                    // We check the last few spoken words to see if they match the target
                    // This allows for some lag or misrecognition of previous words
                    if(currentWordIndex < karaokeWords.length) {
                        const target = karaokeWords[currentWordIndex].toLowerCase().replace(/[^a-z0-9]/g, '');
                        
                        // Check if target appears in recent speech
                        const matchFound = wordsSpoken.some(w => {
                            const spoken = w.replace(/[^a-z0-9]/g, '');
                            return spoken === target || (target.length > 3 && spoken.startsWith(target.substring(0,3))); // Fuzzy match
                        });
                        
                        if(matchFound) {
                            const el = document.getElementById('kw-' + currentWordIndex);
                            el.classList.remove('current');
                            el.classList.add('spoken');
                            currentWordIndex++;
                            highlightCurrentWord();
                            
                            // Calc WPM live
                            const mins = (Date.now() - kStartTime) / 60000;
                            const wpm = Math.round(currentWordIndex / mins);
                            document.getElementById('karaoke-status').innerText = \`Listening... Speed: \${wpm} WPM\`;
                        }
                    }
                };
                
                recognition.onend = () => {
                    if (isKaraokeListening) recognition.start(); // Auto-restart
                };
                
                recognition.start();
            }
            
            // --- Dictation Logic ---
            let dictationPhrases = [];
            let currentPhraseIdx = 0;
            let dictationScore = 0;
            
            function startDictation() {
                const activeText = document.querySelector('.tab-content.active .text-content').innerText;
                // Split by sentence ending punctuation
                dictationPhrases = activeText.match(/[^.!?]+[.!?]+/g) || [activeText];
                currentPhraseIdx = 0;
                dictationScore = 0;
                
                document.getElementById('dictation-start').style.display = 'none';
                const input = document.getElementById('dictation-input');
                input.style.display = 'block';
                input.focus();
                input.onblur = () => input.focus();
                
                playNextPhrase();
                
                input.onkeyup = (e) => {
                    if (e.key === 'Enter') checkPhrase();
                };
            }
            
            function playNextPhrase() {
                if (currentPhraseIdx >= dictationPhrases.length) {
                    finishDictation();
                    return;
                }
                const phrase = dictationPhrases[currentPhraseIdx].trim();
                const u = new SpeechSynthesisUtterance(phrase);
                
                // Use profile voice if possible
                const voices = window.speechSynthesis.getVoices();
                const prefVoice = voices.find(v => v.voiceURI === "${profile.readAloudVoice || ''}");
                if(prefVoice) u.voice = prefVoice;
                
                u.rate = 0.9;
                window.speechSynthesis.speak(u);
                
                document.getElementById('dictation-feedback').innerHTML = 'Listening to phrase ' + (currentPhraseIdx+1) + '/' + dictationPhrases.length + '... (Press Enter to check)';
                document.getElementById('dictation-input').value = '';
            }
            
            function checkPhrase() {
                const input = document.getElementById('dictation-input');
                const userText = input.value.trim();
                const target = dictationPhrases[currentPhraseIdx].trim();
                
                const targetWords = target.split(' ');
                const userWords = userText.split(' ');
                
                let html = '';
                let phraseHits = 0;
                
                targetWords.forEach((w, i) => {
                    const cleanT = w.toLowerCase().replace(/[^a-z]/g, '');
                    const cleanU = (userWords[i] || '').toLowerCase().replace(/[^a-z]/g, '');
                    if (cleanT === cleanU) {
                        html += '<span class="correct-word">' + w + '</span> ';
                        phraseHits++;
                    } else {
                        html += '<span class="incorrect-word">' + (userWords[i] || '_') + '</span> ';
                    }
                });
                
                if (phraseHits >= targetWords.length * 0.8) dictationScore++;
                
                document.getElementById('dictation-feedback').innerHTML = html;
                setTimeout(() => {
                    currentPhraseIdx++;
                    playNextPhrase();
                }, 2000);
            }
            
            function finishDictation() {
                const acc = Math.round((dictationScore / dictationPhrases.length) * 100);
                document.getElementById('dictation-accuracy').innerHTML = '<h3>Accuracy: ' + acc + '%</h3>';
                document.getElementById('dictation-input').style.display = 'none';
                document.getElementById('dictation-feedback').innerHTML = 'Done!';
            }
            
            // --- Discussion Logic ---
            const comments = document.querySelectorAll('.comment');
            const correctAnswer = "${content.discussionAnswer}";
            
            comments.forEach(c => {
                c.onclick = () => {
                    comments.forEach(el => el.classList.remove('correct', 'incorrect'));
                    const name = c.dataset.characterName;
                    const res = document.getElementById('discussion-result');
                    if (name === correctAnswer) {
                        c.classList.add('correct');
                        res.innerHTML = '<span style="color:green">Correct! ' + name + ' has the right idea.</span>';
                    } else {
                        c.classList.add('incorrect');
                        res.innerHTML = '<span style="color:red">Not quite. Analyze the text again.</span>';
                    }
                };
            });
            
            // --- Quiz & Footer Logic ---
            function checkQuiz() {
                let score = 0;
                const total = ${content.quiz.length};
                const data = ${JSON.stringify(content.quiz)};
                
                data.forEach((q, i) => {
                    const selected = document.querySelector('input[name="q'+i+'"]:checked');
                    if (selected && selected.value === q.correctAnswers[0]) score++;
                });
                
                const percent = Math.round((score/total)*100);
                document.getElementById('quiz-score').innerText = 'Score: ' + percent + '%';
                
                // Update Footer
                document.getElementById('footer-progress-bar').style.width = percent + '%';
                
                if (percent >= 80) {
                    document.getElementById('locked-msg').style.display = 'none';
                    document.getElementById('secret-reveal-area').style.display = 'block';
                    window.scrollTo(0, document.body.scrollHeight);
                } else {
                    document.getElementById('locked-msg').innerHTML = '<i class="fas fa-lock"></i> Need 80% to unlock (Current: ' + percent + '%)';
                }
            }
        </script>
    </body>
    </html>
    `;
    return { htmlContent: html, secretCode: content.secretCode, lessonTitle: content.lessonTitle };
};

export const generateDailyEnglishLessonHtml = (content: any, imageUrl: string = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80', listenAudioBase64: string = '', radioAudioBase64: string = ''): string => {
    // 4. Construct HTML
    const warmUpHtml = content.warmUpQuestions.map((q: any, index: number) => `
        <div class="warmup-item">
            <p class="question"><strong>Q${index + 1}:</strong> ${q.question}</p>
            <details><summary>Show Answer</summary><p class="answer">${q.answer}</p></details>
        </div>
    `).join('');

    const keywordsHtml = `
        <table class="keywords-table">
            <thead><tr><th>Word/Phrase</th><th>Definition</th><th>Example</th></tr></thead>
            <tbody>${content.audioKeywords.map((k: any) => `<tr><td class="word">${k.word}</td><td>${k.definition}</td><td class="example"><em>"${k.example}"</em></td></tr>`).join('')}</tbody>
        </table>
    `;

    const slidesHtml = content.languageAnalysisSlides.map((s: any, i: number) => `
        <div class="slide-card ${s.level.toLowerCase()}">
            <div class="slide-badge">${s.level}</div>
            <h3>${s.title}</h3>
            <p><strong>Grammar:</strong> <span style="color:#2563eb">${s.grammarPoint}</span></p>
            <p><strong>Meaning:</strong> ${s.meaning}</p>
            <p class="example-box">"${s.example}"</p>
            <p><strong>Alternative:</strong> ${s.alternative}</p>
            <p class="mistake-box">⚠️ <strong>Avoid:</strong> ${s.commonMistake}</p>
        </div>
    `).join('');

    const commentsHtml = content.comments.map((c: any) => `
        <div class="comment" data-character-name="${c.characterName}">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${c.characterName}" alt="${c.characterName}" class="avatar">
            <div class="comment-body"><p class="character-name">${c.characterName}</p><p class="comment-text">${c.comment}</p></div>
        </div>
    `).join('');

    const quizHtml = content.quiz.map((q: any, index: number) => `
        <div class="quiz-question">
            <p class="question-text">${index + 1}. ${q.question}</p>
            <div class="choices">
                ${q.choices.map((choice: string) => `<label class="choice"><input type="radio" name="q${index}" value="${choice.replace(/"/g, '&quot;')}"><span>${choice}</span></label>`).join('')}
            </div>
        </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.lessonTitle}</title>
        
        <style>
            :root { --primary: #4f46e5; --bg: #f9fafb; --card: #fff; --text: #1f2937; }
            body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding-bottom: 120px; margin: 0; }
            .container { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
            .card { background: var(--card); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 2rem; margin-bottom: 2rem; }
            h1 { text-align: center; margin: 2rem 0; font-size: 2.5rem; }
            h2 { color: var(--primary); border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; margin-top: 0; }
            h3 { color: #374151; margin-top: 1.5rem; }
            .header-image { width: 100%; height: auto; border-radius: 8px; margin-bottom: 2rem; }
            
            .text-content { line-height: 1.8; font-size: 1.1rem; }
            .text-content p { margin-bottom: 1rem; }
            
            .tabs { display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
            .tab-btn { padding: 10px 20px; border: none; background: none; cursor: pointer; font-weight: 600; color: #6b7280; border-bottom: 3px solid transparent; }
            .tab-btn.active { color: var(--primary); border-color: var(--primary); }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
            
            .karaoke-controls { margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd; text-align: center; }
            .karaoke-stats { font-weight: bold; margin-top: 10px; color: #0369a1; }
            
            /* Karaoke Modal */
            #karaoke-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; justify-content: center; align-items: center; }
            .karaoke-box { background: white; width: 90%; max-width: 700px; height: 80vh; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
            .karaoke-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
            .karaoke-word-area { flex: 1; overflow-y: auto; font-size: 1.5rem; line-height: 2; padding: 20px; text-align: left; }
            .k-word { padding: 2px 5px; border-radius: 4px; transition: background 0.2s, color 0.2s; }
            .k-word.spoken { color: #16a34a; font-weight: bold; }
            .k-word.current { background-color: #fef08a; border-bottom: 2px solid orange; }
            
            .dictation-area { margin-top: 20px; background: #fefce8; padding: 20px; border-radius: 8px; border: 1px solid #fef08a; }
            .dict-feedback { min-height: 30px; font-weight: bold; margin-top: 10px; }
            .correct-word { color: green; margin-right: 5px; }
            .incorrect-word { color: red; text-decoration: line-through; margin-right: 5px; }
            
            .slide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
            .slide-card { padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
            .slide-card.basic { border-left: 4px solid #3b82f6; }
            .slide-card.intermediate { border-left: 4px solid #8b5cf6; }
            .slide-card.advanced { border-left: 4px solid #ef4444; }
            .slide-badge { display: inline-block; padding: 2px 8px; background: #eee; border-radius: 4px; font-size: 0.8rem; margin-bottom: 5px; font-weight: bold; }
            .example-box { background: #f0fdf4; padding: 5px; border-left: 2px solid #22c55e; font-style: italic; }
            .mistake-box { background: #fef2f2; padding: 5px; border-left: 2px solid #ef4444; }

            .comment { display: flex; gap: 1rem; margin-bottom: 1rem; padding: 10px; border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
            .comment:hover { background: #f9fafb; border-color: #d1d5db; }
            .comment.correct { background: #dcfce7; border-color: #16a34a; }
            .comment.incorrect { background: #fee2e2; border-color: #ef4444; }
            .avatar { width: 40px; height: 40px; border-radius: 50%; }
            
            .quiz-question { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
            .choice { display: block; margin: 5px 0; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s; }
            .choice:hover { background: #f3f4f6; }
            .choice input { margin-right: 10px; }
            
            /* PROGRESS FOOTER */
            .fixed-footer { position: fixed; bottom: 0; left: 0; width: 100%; background: #1f2937; color: white; padding: 15px 20px; box-shadow: 0 -4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: space-between; z-index: 9999; box-sizing: border-box; }
            .progress-container { flex-grow: 1; margin: 0 20px; background: #374151; height: 10px; border-radius: 5px; overflow: hidden; }
            .progress-bar { height: 100%; width: 0%; background: #10b981; transition: width 0.5s ease; }
            #secret-reveal-area { display: none; background: #064e3b; padding: 10px 20px; border-radius: 8px; border: 1px solid #10b981; animation: pulse 2s infinite; }
            @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
            
            /* Keywords & Warmup */
            .keywords-table { width: 100%; border-collapse: collapse; }
            .keywords-table th, .keywords-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .keywords-table th { background: #f3f4f6; }
            .warmup-item { background: #f3f4f6; padding: 10px; margin-bottom: 10px; border-radius: 6px; }
            
            button { cursor: pointer; padding: 8px 16px; border-radius: 6px; border: none; font-weight: 600; }
            .btn-primary { background: var(--primary); color: white; }
            .btn-close { background: #ef4444; color: white; }
            .btn-mic { width: 60px; height: 60px; border-radius: 50%; font-size: 24px; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.4); }
            .btn-mic.listening { animation: pulse-red 1.5s infinite; background: #b91c1c; }
            @keyframes pulse-red { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>\${content.lessonTitle}</h1>
            <img src="\${imageUrl}" class="header-image">
            
            <!-- Step 1 -->
            <div class="card">
                <h2>1. Warm-up</h2>
                \${warmUpHtml}
            </div>
            
            <!-- Step 2 -->
            <div class="card">
                <h2>2. Keywords & Phrases</h2>
                <p>Master these expressions before reading.</p>
                \${keywordsHtml}
            </div>
            
            <!-- Step 3 -->
            <div class="card">
                <h2>3. Listen (\${content.genre})</h2>
                <p><em>\${content.audioContext}</em></p>
                \${listenAudioBase64 ? \`<audio controls src="data:audio/wav;base64,\${listenAudioBase64}" style="width:100%"></audio>\` : 
                \`<button class="btn-primary" onclick="playFallbackSpeech('\${content.audioDialogue.script.replace(/'/g, "\\\\'")}')">Play Audio</button>\`}
            </div>
            
            <!-- Step 4 & 5 -->
            <div class="card">
                <h2>4. Read & 5. Karaoke</h2>
                <div class="tabs">
                    <button class="tab-btn active" onclick="openTab('basic')">Basic</button>
                    <button class="tab-btn" onclick="openTab('intermediate')">Intermediate</button>
                    <button class="tab-btn" onclick="openTab('advanced')">Advanced</button>
                </div>
                
                <div id="basic" class="tab-content active">
                    <div class="text-content" id="text-basic">\${content.article.basic}</div>
                </div>
                <div id="intermediate" class="tab-content">
                    <div class="text-content" id="text-intermediate">\${content.article.intermediate}</div>
                </div>
                <div id="advanced" class="tab-content">
                    <div class="text-content" id="text-advanced">\${content.article.advanced}</div>
                </div>
                
                <div class="karaoke-controls">
                    <h3>🎤 News Reporter Challenge</h3>
                    <p>Click "Start Karaoke" to open the teleprompter. Read aloud to test your speed!</p>
                    <button id="karaoke-btn" class="btn-primary" onclick="openKaraokeModal()"><i class="fas fa-microphone-alt"></i> Start Karaoke</button>
                    <div class="karaoke-stats" id="karaoke-stats">Record: 0 WPM</div>
                </div>
            </div>
            
            <!-- Step 6 -->
            <div class="card">
                <h2>6. Language Analysis</h2>
                <div class="slide-grid">
                    \${slidesHtml}
                </div>
            </div>
            
            <!-- Step 7 -->
            <div class="card">
                <h2>7. Radio Drama</h2>
                <p>Integration of concepts in a dramatic scenario with multiple characters.</p>
                \${radioAudioBase64 ? \`<audio controls src="data:audio/wav;base64,\${radioAudioBase64}" style="width:100%"></audio>\` : 
                \`<button class="btn-primary" onclick="playFallbackSpeech('\${content.radioDramaScript.replace(/'/g, "\\\\'")}')">Play Radio Drama</button>\`}
            </div>
            
            <!-- Step 8 -->
            <div class="card">
                <h2>8. Dictation Challenge</h2>
                <div class="dictation-area">
                    <p>Listen and type exactly what you hear. Phrases will play automatically.</p>
                    <button id="dictation-start" class="btn-primary" onclick="startDictation()">Start Dictation</button>
                    <input type="text" id="dictation-input" style="width:100%; padding:10px; margin-top:10px; display:none;" placeholder="Type here..." autocomplete="off">
                    <div id="dictation-feedback" class="dict-feedback"></div>
                    <div id="dictation-accuracy"></div>
                </div>
            </div>
            
            <!-- Step 9 -->
            <div class="card">
                <h2>9. Discussion Corner</h2>
                <p style="font-weight:bold; text-align:center;">\${content.discussionQuestion}</p>
                <p style="font-size:0.9rem; text-align:center; color:#666;">Click the comment that answers the question correctly.</p>
                \${commentsHtml}
                <div id="discussion-result" style="text-align:center; margin-top:10px; font-weight:bold;"></div>
            </div>
            
            <!-- Step 10 -->
            <div class="card">
                <h2>10. Test Your Knowledge</h2>
                <p>Complete the quiz to reveal the secret code in the footer!</p>
                <div id="quiz-container">\${quizHtml}</div>
                <button class="btn-primary" style="width:100%" onclick="checkQuiz()">Submit Answers & Check Progress</button>
                <div id="quiz-score" style="text-align:center; margin-top:10px; font-weight:bold;"></div>
            </div>
            
            <!-- FOOTER -->
            <div class="fixed-footer">
                <div style="font-weight:bold; width:100px;">Progress:</div>
                <div class="progress-container"><div class="progress-bar" id="footer-progress-bar"></div></div>
                <div id="locked-msg" style="color:#fca5a5; font-size:0.9rem; white-space:nowrap;"><i class="fas fa-lock"></i> Locked</div>
                <div id="secret-reveal-area">
                    Secret Code unlocked: <b>\${content.secretCode}</b> (Enter this in the main app!)
                </div>
            </div>
            
            <!-- Karaoke Teleprompter Modal -->
            <div id="karaoke-modal">
                <div class="karaoke-box">
                    <div class="karaoke-header">
                        <h2>Teleprompter Live</h2>
                        <button class="btn-close" onclick="closeKaraokeModal()">Close</button>
                    </div>
                    <div id="k-word-area" class="karaoke-word-area"></div>
                    <div style="text-align:center;">
                        <button id="mic-btn" class="btn-mic" onclick="toggleKaraokeMic()"><i class="fas fa-microphone"></i></button>
                    </div>
                </div>
            </div>
        </div>

        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <script>
            // Fallback audio
            function playFallbackSpeech(text) {
                var msg = new SpeechSynthesisUtterance();
                msg.text = text;
                window.speechSynthesis.speak(msg);
            }

            // --- Tabs Logic ---
            let currentTab = 'basic';
            function openTab(tabName) {
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
                document.getElementById(tabName).classList.add('active');
                event.target.classList.add('active');
                currentTab = tabName;
            }

            // --- Karaoke Logic ---
            let recognition = null;
            let isKaraokeActive = false;
            let currentWords = [];
            let wordIndex = 0;
            let sequenceIndexMap = []; // Maps wordIndex to actual words, ignoring punctuation
            let startTime = null;

            if ('webkitSpeechRecognition' in window) {
                recognition = new webkitSpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
            }

            function openKaraokeModal() {
                const text = document.getElementById('text-' + currentTab).innerText;
                const area = document.getElementById('k-word-area');
                
                // Tokenize words
                const rawWords = text.split(/\\s+/);
                currentWords = [];
                sequenceIndexMap = [];
                
                let html = '';
                rawWords.forEach((word, idx) => {
                    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    if(cleanWord) {
                        html += \\\`<span class="k-word" id="kw-\\\${idx}">\\\${word}</span> \\\`;
                        currentWords.push({ clean: cleanWord, original: word, idx: idx, matched: false });
                    }
                });
                
                area.innerHTML = html;
                wordIndex = 0;
                document.getElementById('karaoke-modal').style.display = 'flex';
                
                // Reset styling
                highlightWord(0);
            }

            function closeKaraokeModal() {
                document.getElementById('karaoke-modal').style.display = 'none';
                if (isKaraokeActive) toggleKaraokeMic(); 
            }

            function highlightWord(idx) {
                document.querySelectorAll('.k-word.current').forEach(el => el.classList.remove('current'));
                if (currentWords[idx]) {
                    const el = document.getElementById('kw-' + currentWords[idx].idx);
                    if(el) {
                        el.classList.add('current');
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }

            function markWordSpoken(idx) {
                if (currentWords[idx]) {
                    currentWords[idx].matched = true;
                    const el = document.getElementById('kw-' + currentWords[idx].idx);
                    if(el) el.classList.add('spoken');
                }
            }

            function toggleKaraokeMic() {
                if (!recognition) {
                    alert('Speech recognition is not supported in this browser. Please use Chrome.');
                    return;
                }
                
                const btn = document.getElementById('mic-btn');
                
                if (isKaraokeActive) {
                    recognition.stop();
                    btn.classList.remove('listening');
                    isKaraokeActive = false;
                    
                    // Calc WPM
                    if (startTime && wordIndex > 0) {
                        const elapsedMins = (Date.now() - startTime) / 60000;
                        const wpm = Math.round(wordIndex / elapsedMins);
                        document.getElementById('karaoke-stats').innerText = 'Record: ' + wpm + ' WPM (' + currentTab + ')';
                    }
                } else {
                    startTime = Date.now();
                    try { recognition.start(); } catch(e){}
                    btn.classList.add('listening');
                    isKaraokeActive = true;
                    
                    recognition.onresult = function(event) {
                        let interimTranscript = '';
                        let finalTranscript = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                finalTranscript += event.results[i][0].transcript;
                            } else {
                                interimTranscript += event.results[i][0].transcript;
                            }
                        }
                        
                        const textToProcess = (finalTranscript + ' ' + interimTranscript).toLowerCase();
                        const spokenWords = textToProcess.split(/\\s+/);
                        
                        // Fuzzily match spoken words to current position
                        // Allow skipping a word or two
                        for (const spoken of spokenWords) {
                            if (!spoken) continue;
                            
                            // Check current and next 2 words
                            for(let lookahead = 0; lookahead < 3; lookahead++) {
                                const targetIdx = wordIndex + lookahead;
                                if (targetIdx < currentWords.length && !currentWords[targetIdx].matched) {
                                    if (currentWords[targetIdx].clean === spoken || currentWords[targetIdx].clean.includes(spoken)) {
                                        // Mark all intervening as skipped/read
                                        for(let j = wordIndex; j <= targetIdx; j++) {
                                            markWordSpoken(j);
                                        }
                                        wordIndex = targetIdx + 1;
                                        highlightWord(wordIndex);
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (wordIndex >= currentWords.length) {
                             toggleKaraokeMic(); // Auto stop at end
                             alert("Great job! You finished the text!");
                        }
                    };
                }
            }

            // --- Discussion Logic ---
            document.querySelectorAll('.comment').forEach(c => {
                c.addEventListener('click', function() {
                    const name = this.getAttribute('data-character-name');
                    const isCorrect = name === "\${content.discussionAnswer}";
                    
                    document.querySelectorAll('.comment').forEach(el => el.classList.remove('correct', 'incorrect'));
                    
                    if (isCorrect) {
                        this.classList.add('correct');
                        document.getElementById('discussion-result').innerHTML = '<span style="color:#16a34a">Correct! '+name+' gave the insightful answer.</span>';
                    } else {
                        this.classList.add('incorrect');
                        document.getElementById('discussion-result').innerHTML = '<span style="color:#ef4444">Not quite right. Who had the best insight?</span>';
                    }
                });
            });
            
            // --- Dictation Logic ---
            const dictationSentences = [
                ...document.getElementById('text-basic').innerText.split('.').map(s=>s.trim()).filter(s=>s.length > 20),
                ...document.getElementById('text-intermediate').innerText.split('.').map(s=>s.trim()).filter(s=>s.length > 20)
            ].sort(() => 0.5 - Math.random()).slice(0, 5); // Pick 5 random sentences
            
            let currentDictationIndex = 0;
            
            function startDictation() {
                if (dictationSentences.length === 0) return;
                currentDictationIndex = 0;
                document.getElementById('dictation-start').style.display = 'none';
                document.getElementById('dictation-input').style.display = 'block';
                document.getElementById('dictation-input').focus();
                playCurrentDictation();
            }
            
            function playCurrentDictation() {
                if (currentDictationIndex >= dictationSentences.length) {
                    document.getElementById('dictation-feedback').innerHTML = "Dictation Complete! Great job.";
                    document.getElementById('dictation-input').style.display = 'none';
                    return;
                }
                const text = dictationSentences[currentDictationIndex];
                const u = new SpeechSynthesisUtterance(text);
                // Try to find a good voice
                const voices = window.speechSynthesis.getVoices();
                const engVoice = voices.find(v => v.lang.startsWith('en'));
                if(engVoice) u.voice = engVoice;
                
                window.speechSynthesis.speak(u);
                document.getElementById('dictation-input').value = '';
                document.getElementById('dictation-feedback').innerHTML = "Sentence " + (currentDictationIndex + 1) + " of " + dictationSentences.length;
            }
            
            document.getElementById('dictation-input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const userText = this.value;
                    const targetText = dictationSentences[currentDictationIndex];
                    
                    // Simple Diff
                    const userWords = userText.toLowerCase().replace(/[^a-z0-9\\s]/g,'').split(' ').filter(Boolean);
                    const targetWords = targetText.toLowerCase().replace(/[^a-z0-9\\s]/g,'').split(' ').filter(Boolean);
                    
                    let html = '';
                    let correctCount = 0;
                    
                    targetWords.forEach((word, idx) => {
                        if (userWords[idx] === word) {
                            html += '<span class="correct-word">' + word + '</span>';
                            correctCount++;
                        } else {
                            html += '<span class="incorrect-word">' + word + '</span>';
                        }
                    });
                    
                    const acc = Math.round((correctCount / Math.max(targetWords.length, 1)) * 100);
                    
                    document.getElementById('dictation-accuracy').innerHTML = 
                        \\\`<div style="background:#e5e7eb; padding:10px; margin-top:10px; border-radius:6px;">
                            <strong>Expected:</strong> \\\${targetText}<br/>
                            <strong>Similarity:</strong> \\\${acc}%<br/>
                            <button onclick="currentDictationIndex++; playCurrentDictation()" class="btn-primary" style="margin-top:10px">Next Sentence</button>
                            <button onclick="playCurrentDictation()" style="margin-top:10px; margin-left:10px">Listen Again</button>
                        </div>\\\`;
                }
            });
            
            // --- Quiz & Footer Logic ---
            function checkQuiz() {
                let score = 0;
                const total = \${content.quiz.length};
                const data = \${JSON.stringify(content.quiz)};
                
                data.forEach((q, i) => {
                    const selected = document.querySelector('input[name="q'+i+'"]:checked');
                    if (selected && selected.value === q.correctAnswers[0]) score++;
                });
                
                const percent = Math.round((score/total)*100);
                document.getElementById('quiz-score').innerText = 'Score: ' + percent + '%';
                
                // Update Footer
                document.getElementById('footer-progress-bar').style.width = percent + '%';
                
                if (percent >= 80) {
                    document.getElementById('locked-msg').style.display = 'none';
                    document.getElementById('secret-reveal-area').style.display = 'block';
                    window.scrollTo(0, document.body.scrollHeight);
                } else {
                    document.getElementById('locked-msg').innerHTML = '<i class="fas fa-lock"></i> Need 80% to unlock (Current: ' + percent + '%)';
                }
            }
        </script>
    </body>
    </html>
    `;
};
