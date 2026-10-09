
import type { SlidePackageOutput, LearnerProfile } from '../../../../types';
import { escapeHtml } from '../../../../utils/textFormatters';

export const handleSaveSlideExplainerAsHtml = (
    pkg: SlidePackageOutput,
    learner: LearnerProfile,
    filename: string,
    returnHtml: boolean = false
) => {
    
    const explainerHtml = pkg.explainer.notes.map(note => `
        <div class="slide-note-section">
            <div class="note-header">
                <h2>Slide ${note.slideNumber} Explainer</h2>
                <button class="copy-btn" onclick="copyContent('note-content-${note.slideNumber}')">
                    <i class="fas fa-copy"></i> Copy Marked Up Text
                </button>
            </div>
            
            <div id="note-content-${note.slideNumber}" class="note-content">
                <div class="section-block context">
                    <h3>Context</h3>
                    <p>${escapeHtml(note.context)}</p>
                </div>

                <div class="section-block warmup">
                    <h3>🔥 Warm-Up Activity</h3>
                    <p>${escapeHtml(note.warmUpActivity)}</p>
                </div>

                <div class="section-block vocab">
                    <h3>🔑 Key Vocabulary & Concepts</h3>
                    <div class="markup-content">${note.keyVocabularyAndConcepts}</div>
                </div>

                <div class="section-block lecture">
                    <h3>🎓 Core Lecture Notes</h3>
                    <div class="markup-content">${note.coreLectureNotes}</div>
                </div>

                <div class="section-block comp">
                    <h3>🧠 Deeper Comprehension</h3>
                    <ul>
                        <li><strong>Short Answer:</strong> ${escapeHtml(note.deeperComprehension.shortAnswer)}</li>
                        <li><strong>Critical Thinking:</strong> ${escapeHtml(note.deeperComprehension.criticalThinking)}</li>
                        <li><strong>Example Gen:</strong> ${escapeHtml(note.deeperComprehension.exampleGeneration)}</li>
                    </ul>
                </div>

                <div class="section-block practical">
                    <h3>🛠️ Practical Application</h3>
                    <p>${escapeHtml(note.practicalApplication)}</p>
                </div>

                <div class="section-block discussion">
                    <h3>💬 Discussion Prompts</h3>
                    <ul>
                        <li><strong>For:</strong> ${escapeHtml(note.discussionPrompts.for)}</li>
                        <li><strong>Against:</strong> ${escapeHtml(note.discussionPrompts.against)}</li>
                    </ul>
                </div>

                <div class="section-block culture">
                    <h3>🌍 Cultural Connection</h3>
                    <p>${escapeHtml(note.culturalConnection)}</p>
                </div>

                <div class="section-block misc">
                    <h3>⚠️ Common Misconceptions</h3>
                    <p>${escapeHtml(note.commonMisconceptions)}</p>
                </div>

                <div class="section-block case">
                    <h3>💼 Case Study</h3>
                    <p>${escapeHtml(note.caseStudyExample)}</p>
                </div>

                <div class="section-block summary">
                    <h3>📝 Summary & Takeaways</h3>
                    <p>${escapeHtml(note.summaryAndTakeaways)}</p>
                </div>
            </div>
        </div>
    `).join('');

    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Slide Explainer: ${escapeHtml(learner.name)}</title>
    
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f9;
        }
        h1 { text-align: center; color: #2c3e50; margin-bottom: 40px; }
        
        .mind-map-box {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin-bottom: 40px;
            border-top: 5px solid #8e44ad;
        }
        .mind-map-box pre {
            white-space: pre-wrap;
            font-family: monospace;
            background: #f8f8f8;
            padding: 15px;
            border-radius: 5px;
        }

        .slide-note-section {
            background: white;
            margin-bottom: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            overflow: hidden;
        }

        .note-header {
            background: #2980b9;
            color: white;
            padding: 15px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .note-header h2 { margin: 0; font-size: 1.5rem; }

        .copy-btn {
            background: rgba(255,255,255,0.2);
            border: 1px solid white;
            color: white;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.2s;
        }
        .copy-btn:hover { background: rgba(255,255,255,0.4); }

        .note-content { padding: 25px; }

        .section-block { margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee; }
        .section-block:last-child { border-bottom: none; }
        
        .section-block h3 {
            color: #2c3e50;
            margin-top: 0;
            border-left: 4px solid #e74c3c;
            padding-left: 10px;
        }

        .markup-content b { color: #c0392b; }
        .markup-content i { color: #27ae60; }

        @media print {
            body { background: white; }
            .slide-note-section { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
            .copy-btn { display: none; }
        }
    </style>
    <script>
        function copyContent(id) {
            const el = document.getElementById(id);
            const range = document.createRange();
            range.selectNode(el);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
            alert('Marked up text copied to clipboard!');
        }
    </script>
</head>
<body>
    <h1>Slide Explainer Document</h1>
    
    <div class="mind-map-box">
        <h2>🗺️ Presentation Mind Map</h2>
        <pre>${escapeHtml(pkg.explainer.mindMap)}</pre>
    </div>

    ${explainerHtml}

</body>
</html>`;

    if (returnHtml) return finalHtml;

    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
