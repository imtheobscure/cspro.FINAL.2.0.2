
import type { QuizOutput, LearnerProfile } from '../types';
import { escapeHtml } from './textFormatters';
import { buildLessonFileName, getLessonFilePrefill, type LessonAudience } from './lessonFileNaming';

export const handleSaveQuizAsExamHtml = (
    content: QuizOutput,
    learner: LearnerProfile,
    examTitle: string = "Assessment",
    audience: LessonAudience = 'Learner'
) => {
    
    // Parse sections to HTML
    const sectionsHtml = content.sections.map((section, idx) => {
        const activitiesHtml = section.activities.map((act, actIdx) => {
            const actId = `q-${idx}-${actIdx}`;
            
            if (act.type === 'questions') {
                const lines = act.content.split('\n').filter(l => l.trim());
                // Try to detect Q / A pairs or just list
                const pairs = [];
                for(let i=0; i<lines.length; i++) {
                    const line = lines[i].trim();
                    if(!line) continue;
                    // Heuristic: If line ends in ?, it's a question. Next line is answer or option.
                    // Simplified: Just render them as input blocks for "Essay/Short Answer" simulation
                    pairs.push(`
                        <div class="question-block">
                            <p class="q-text">${escapeHtml(line)}</p>
                            <textarea class="q-input" placeholder="Type your answer here..." rows="3"></textarea>
                            <div class="q-feedback" style="display:none;">
                                <strong>Reference Answer:</strong> 
                                <span class="ref-ans">...see Answer Key...</span>
                            </div>
                        </div>
                    `);
                }
                return pairs.join('');
            } else if (act.type === 'list' || act.type === 'paragraph') {
                // Reading text or instructions
                return `
                    <div class="reading-passage">
                        <h4>${escapeHtml(act.title)}</h4>
                        <div class="passage-text">${act.content.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            } else if (act.type === 'interactive_html' || act.type === 'raw_html') {
                // Inject raw HTML for custom exam simulations
                return `
                    <div class="interactive-exam-block">
                        <h4>${escapeHtml(act.title)}</h4>
                        <div class="exam-content-container">
                            ${act.content}
                        </div>
                    </div>
                `;
            }
            return '';
        }).join('');

        return `
            <div class="exam-section" id="section-${idx}">
                <div class="section-header">
                    <h3>${escapeHtml(section.title)}</h3>
                </div>
                <div class="section-body">
                    ${activitiesHtml}
                </div>
            </div>
        `;
    }).join('');

    const answerKeyHtml = escapeHtml(content.answerKey).replace(/\n/g, '<br>');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SECURE EXAM: ${escapeHtml(learner.name)}</title>
    <style>
        :root {
            --bg: #f3f4f6;
            --header: #1f2937;
            --text: #111827;
            --accent: #2563eb;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; user-select: none; }
        
        /* Proctor Header */
        .exam-header { background: var(--header); color: white; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 100; }
        .exam-title { font-weight: 700; font-size: 1.2rem; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
        .exam-meta { display: flex; gap: 30px; font-size: 0.9rem; color: #9ca3af; }
        .exam-timer { font-family: monospace; font-size: 1.5rem; color: var(--warning); font-weight: 700; border: 1px solid #374151; padding: 5px 15px; border-radius: 4px; background: #111827; }

        /* Main Area */
        .exam-body { flex: 1; overflow-y: auto; padding: 40px; max-width: 1000px; margin: 0 auto; width: 100%; box-sizing: border-box; }
        
        .exam-section { background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 40px; overflow: hidden; border: 1px solid #e5e7eb; }
        .section-header { background: #f9fafb; padding: 15px 25px; border-bottom: 1px solid #e5e7eb; }
        .section-header h3 { margin: 0; font-size: 1.1rem; color: #374151; }
        .section-body { padding: 25px; }

        /* Questions */
        .question-block { margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px dashed #e5e7eb; }
        .q-text { font-weight: 600; margin-bottom: 10px; font-size: 1.05rem; }
        .q-input { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-family: inherit; font-size: 1rem; resize: vertical; background: #fff; transition: border 0.2s; }
        .q-input:focus { outline: none; border-color: var(--accent); ring: 2px solid #bfdbfe; }
        
        .reading-passage { background: #eff6ff; border-left: 4px solid var(--accent); padding: 20px; margin-bottom: 30px; border-radius: 4px; }
        .reading-passage h4 { margin-top: 0; color: #1e40af; }
        .passage-text { line-height: 1.7; color: #1e3a8a; }

        /* Footer */
        .exam-footer { background: white; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; }
        .submit-btn { background: var(--success); color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: 700; font-size: 1.1rem; cursor: pointer; text-transform: uppercase; transition: background 0.2s; }
        .submit-btn:hover { background: #059669; }

        /* Overlays */
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; text-align: center; }
        .start-overlay { background: #111827; }
        .warning-box { border: 2px solid var(--danger); padding: 40px; border-radius: 12px; background: rgba(239, 68, 68, 0.1); max-width: 600px; }
        
        /* Result */
        .result-area { display: none; margin-top: 30px; padding: 30px; background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; }
        .rubric-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .rubric-table th, .rubric-table td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
        .rubric-table th { background: white; }
    </style>
</head>
<body>

    <!-- START SCREEN -->
    <div id="start-screen" class="overlay start-overlay">
        <h1>OFFICIAL EXAMINATION SESSION</h1>
        <div class="warning-box">
            <h3>SECURITY PROTOCOLS ACTIVE</h3>
            <ul style="text-align:left; line-height:1.8;">
                <li>Full Screen Mode Required</li>
                <li>Clipboard Disabled (No Copy/Paste)</li>
                <li>Tab Switching is Monitored</li>
                <li>Right-click Context Menu Disabled</li>
            </ul>
            <p>Candidate: <strong>${escapeHtml(learner.name)}</strong></p>
            <button class="submit-btn" onclick="startExam()">BEGIN EXAM</button>
        </div>
    </div>

    <header class="exam-header">
        <div class="exam-title">
            <span>🛡️ PROCTOR ACTIVE</span>
            <span style="font-size:0.8rem; background:#374151; padding:2px 8px; border-radius:4px; margin-left:10px;">ID: ${Date.now().toString().slice(-6)}</span>
        </div>
        <div class="exam-meta">
            <span>Candidate: ${escapeHtml(learner.name)}</span>
            <span>Level: ${escapeHtml(learner.cefrLevel)}</span>
        </div>
        <div class="exam-timer" id="timer">60:00</div>
    </header>

    <div class="exam-body" id="exam-content">
        ${sectionsHtml}
        
        <div class="result-area" id="result-area">
            <h2 style="color:#b45309; margin-top:0;">EXAMINATION REPORT</h2>
            <p><strong>Status:</strong> COMPLETED</p>
            <p><strong>Self-Correction Guide:</strong> Compare your answers below with the official key.</p>
            
            <div style="background:white; padding:20px; border:1px solid #ccc; max-height:400px; overflow-y:auto; font-family:monospace;">
                ${answerKeyHtml}
            </div>

            <h3>Unofficial Band Descriptors (${learner.examPrepDetails || 'General'})</h3>
            <table class="rubric-table">
                <tr>
                    <th>Criteria</th>
                    <th>Target (Band 7+)</th>
                </tr>
                <tr>
                    <td>Fluency & Coherence</td>
                    <td>Speaks at length without noticeable effort or loss of coherence.</td>
                </tr>
                <tr>
                    <td>Lexical Resource</td>
                    <td>Uses vocabulary flexibly to discuss a variety of topics. Uses some less common and idiomatic vocabulary.</td>
                </tr>
                <tr>
                    <td>Grammatical Range</td>
                    <td>Uses a range of complex structures with some flexibility. Frequently produces error-free sentences.</td>
                </tr>
                <tr>
                    <td>Accuracy</td>
                    <td>Good control of grammar and punctuation.</td>
                </tr>
            </table>
        </div>
    </div>

    <footer class="exam-footer" id="exam-footer">
        <button class="submit-btn" onclick="submitExam()">FINISH & SUBMIT</button>
    </footer>

    <script>
        // Security Scripts
        document.addEventListener('contextmenu', event => event.preventDefault());
        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey && (event.key === 'c' || event.key === 'v' || event.key === 'p')) {
                event.preventDefault();
                alert("Security Alert: Clipboard is disabled.");
            }
        });
        
        window.addEventListener('blur', () => {
            document.title = "⚠️ EXAM INTERRUPTED";
            // In a real app, we'd flag this.
        });
        window.addEventListener('focus', () => {
            document.title = "SECURE EXAM: ${escapeHtml(learner.name)}";
        });

        // Timer
        let time = 60 * 60; // 60 mins
        let interval;
        
        function startExam() {
            document.getElementById('start-screen').style.display = 'none';
            document.documentElement.requestFullscreen().catch(e => console.log("Fullscreen denied"));
            
            interval = setInterval(() => {
                time--;
                const m = Math.floor(time / 60).toString().padStart(2, '0');
                const s = (time % 60).toString().padStart(2, '0');
                document.getElementById('timer').innerText = \`\${m}:\${s}\`;
                if(time <= 0) submitExam();
            }, 1000);
        }

        function submitExam() {
            clearInterval(interval);
            if (document.fullscreenElement) document.exitFullscreen();
            
            // Lock inputs
            const inputs = document.querySelectorAll('textarea, input');
            inputs.forEach(i => i.disabled = true);
            
            // Show results
            document.getElementById('result-area').style.display = 'block';
            document.getElementById('exam-footer').style.display = 'none';
            document.getElementById('result-area').scrollIntoView({ behavior: 'smooth' });
            
            alert("Exam Submitted. Please review the Answer Key and Rubrics.");
        }
    </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Shared lesson naming: {learner}_{book}_{unit}_{type}_{Learner|Presenter}_{date}
    a.download = buildLessonFileName({
        learnerName: learner.name,
        lessonLabel: examTitle || 'Assessment',
        audience,
        ...getLessonFilePrefill(learner),
    });
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
