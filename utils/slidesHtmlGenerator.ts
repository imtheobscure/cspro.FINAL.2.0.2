
import type { SlideContent, LearnerProfile } from '../types';
import { escapeHtml, cleanTextForSpeech } from './textFormatters';

export const handleSaveSlidesAsHtml = (
    slides: SlideContent[],
    learner: LearnerProfile,
    filename: string,
    returnHtml: boolean = false
) => {
    
    const slidesHtml = slides.map((slide, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
            <div class="slide-content-wrapper">
                <div class="slide-header">
                    <div class="slide-number">Slide ${index + 1} / ${slides.length}</div>
                    <h2>${escapeHtml(slide.title)}</h2>
                </div>
                
                <div class="slide-body">
                    
                    <!-- Section 1: Keywords -->
                    <details class="section-card keywords-sec" open>
                        <summary>
                            <div class="sec-title"><i class="fas fa-key"></i> ${escapeHtml(slide.keywordsSection.title)}</div>
                            <button class="play-btn-inline" data-text="${escapeHtml(cleanTextForSpeech(slide.keywordsSection.content))}" onclick="playTTS(this, event)"><i class="fas fa-volume-up"></i></button>
                        </summary>
                        <div class="sec-content">
                            ${slide.keywordsSection.content}
                        </div>
                    </details>

                    <!-- Section 2: Examples -->
                    <details class="section-card examples-sec">
                        <summary>
                            <div class="sec-title"><i class="fas fa-user-tag"></i> ${escapeHtml(slide.examplesSection.title)}</div>
                            <button class="play-btn-inline" data-text="${escapeHtml(cleanTextForSpeech(slide.examplesSection.content))}" onclick="playTTS(this, event)"><i class="fas fa-volume-up"></i></button>
                        </summary>
                        <div class="sec-content">
                            ${slide.examplesSection.content}
                        </div>
                    </details>

                    <!-- Section 3: Strategy -->
                    <details class="section-card strategy-sec">
                        <summary>
                            <div class="sec-title"><i class="fas fa-chess"></i> ${escapeHtml(slide.strategySection.title)}</div>
                            <button class="play-btn-inline" data-text="${escapeHtml(cleanTextForSpeech(slide.strategySection.content))}" onclick="playTTS(this, event)"><i class="fas fa-volume-up"></i></button>
                        </summary>
                        <div class="sec-content">
                            ${slide.strategySection.content}
                        </div>
                    </details>

                    <!-- Section 4: Dialogue -->
                    <details class="section-card dialogue-sec">
                        <summary>
                            <div class="sec-title"><i class="fas fa-comments"></i> ${escapeHtml(slide.dialogueSection.title)}</div>
                            <button class="play-btn-inline" data-text="${escapeHtml(cleanTextForSpeech(slide.dialogueSection.content))}" onclick="playTTS(this, event)"><i class="fas fa-volume-up"></i></button>
                        </summary>
                        <div class="sec-content">
                            ${slide.dialogueSection.content}
                        </div>
                    </details>

                    <!-- Section 5: Grammar -->
                    <details class="section-card grammar-sec">
                        <summary>
                            <div class="sec-title"><i class="fas fa-tools"></i> ${escapeHtml(slide.grammarSection.title)}</div>
                            <button class="play-btn-inline" data-text="${escapeHtml(cleanTextForSpeech(slide.grammarSection.content))}" onclick="playTTS(this, event)"><i class="fas fa-volume-up"></i></button>
                        </summary>
                        <div class="sec-content">
                            ${slide.grammarSection.content}
                        </div>
                    </details>

                    <!-- Section 6: Comprehension -->
                    <details class="section-card comp-sec">
                        <summary>
                            <div class="sec-title"><i class="fas fa-brain"></i> ${escapeHtml(slide.comprehensionSection.title)}</div>
                        </summary>
                        <div class="sec-content">
                            <ul class="comp-list">
                                ${slide.comprehensionSection.questions.map(q => `
                                    <li>
                                        <strong>Q:</strong> ${escapeHtml(q.q)}<br>
                                        <details class="ans-reveal">
                                            <summary>Reveal Answer</summary>
                                            <span class="ans-text">${escapeHtml(q.a)}</span>
                                        </details>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </details>

                </div>
            </div>
        </div>
    `).join('');

    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Slides for ${escapeHtml(learner.name)}</title>
    
    <style>
        
        
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            font-family: 'Poppins', sans-serif;
            background-color: #111827;
            color: #1f2937;
            overflow: hidden; 
        }

        /* Carousel Layout */
        .presentation-container {
            width: 100vw;
            height: 100vh;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .slide {
            display: none;
            width: 100%;
            height: 100%;
            justify-content: center;
            padding-top: 20px;
            animation: fadeIn 0.5s;
        }
        
        .slide.active {
            display: flex;
        }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .slide-content-wrapper {
            background: white;
            width: 95vw;
            max-width: 1400px;
            /* CRITICAL FIX: Ensure height accommodates footer but allows internal scrolling */
            height: calc(100vh - 80px); 
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        .slide-header {
            background: #2563eb;
            color: white;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            z-index: 10;
        }

        .slide-header h2 { margin: 0; font-size: 1.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%; }
        .slide-number { background: rgba(0,0,0,0.2); padding: 5px 12px; border-radius: 12px; font-weight: bold; font-size: 0.9rem; white-space: nowrap; }

        .slide-body {
            padding: 20px 40px;
            flex: 1; /* Allow growing */
            overflow-y: auto; /* Enable internal scrolling */
            display: flex;
            flex-direction: column;
            gap: 15px;
            background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
            /* Ensure content is not cut off by footer */
            padding-bottom: 60px; 
        }

        /* Navigation Arrows */
        .nav-arrow {
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.5);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 1.5rem;
            cursor: pointer;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .nav-arrow:hover { background: rgba(255,255,255,0.4); transform: translateY(-50%) scale(1.1); }
        .nav-prev { left: 20px; }
        .nav-next { right: 20px; }
        .nav-arrow.disabled { opacity: 0.3; cursor: default; }

        /* Beautiful Color Coded Sections */
        details.section-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            border-left: 8px solid #ccc;
            transition: all 0.3s ease;
            margin-bottom: 5px;
            flex-shrink: 0; /* Prevent shrinking */
        }

        details.section-card[open] {
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        details.section-card summary {
            padding: 15px 20px;
            font-weight: 700;
            cursor: pointer;
            list-style: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 1.2rem;
            background-color: #fff;
            color: #4b5563;
            border-bottom: 1px solid transparent;
        }
        
        details.section-card[open] summary { border-bottom-color: #f3f4f6; }
        details.section-card summary::-webkit-details-marker { display: none; }
        
        .sec-title { display: flex; align-items: center; gap: 12px; }

        .sec-content {
            padding: 20px 25px;
            line-height: 1.7;
            font-size: 1.05rem;
            background: white;
            color: #374151;
        }
        
        .sec-content table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 0.95rem; }
        .sec-content th { background: #f3f4f6; text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb; }
        .sec-content td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .sec-content tr:last-child td { border-bottom: none; }
        .sec-content ul, .sec-content ol { padding-left: 20px; }
        .sec-content li { margin-bottom: 8px; }

        .keywords-sec { border-left-color: #3b82f6; }
        .keywords-sec summary { color: #1e40af; background: #eff6ff; }
        .examples-sec { border-left-color: #8b5cf6; }
        .examples-sec summary { color: #5b21b6; background: #f5f3ff; }
        .strategy-sec { border-left-color: #f59e0b; }
        .strategy-sec summary { color: #92400e; background: #fffbeb; }
        .dialogue-sec { border-left-color: #ec4899; }
        .dialogue-sec summary { color: #9d174d; background: #fdf2f8; }
        .grammar-sec { border-left-color: #10b981; }
        .grammar-sec summary { color: #065f46; background: #ecfdf5; }
        .comp-sec { border-left-color: #ef4444; }
        .comp-sec summary { color: #991b1b; background: #fef2f2; }

        .comp-list { list-style: none; padding: 0; }
        .comp-list li { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
        .ans-reveal { margin-top: 8px; font-size: 0.95rem; }
        .ans-text { color: #166534; font-weight: bold; background: #dcfce7; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 5px; }

        .play-btn-inline { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.7; transition: opacity 0.2s; font-size: 1.2rem; }
        .play-btn-inline:hover { opacity: 1; transform: scale(1.1); }

        /* --- FULL ANNOTATION TOOLBOX STYLES --- */
        #fixed-footer { position: fixed; bottom: 0; left: 0; width: 100%; background-color: #ffffff; box-shadow: 0 -2px 5px rgba(0,0,0,0.1); z-index: 1000; display: flex; flex-direction: column; align-items: center; padding: 5px 10px; border-top: 1px solid #ddd; box-sizing: border-box; }
        .toolbar-scroll-wrapper { width: 100%; overflow-x: auto; }
        #highlighter-toolbar, #pen-toolbar { display: flex; align-items: center; gap: 8px; width: max-content; margin: 0 auto; padding: 5px; }
        .highlighter-btn, .pen-tool { border: 1px solid #ccc; border-radius: 4px; font-size: 16px; width: 36px; height: 36px; display: flex; justify-content: center; align-items: center; cursor: pointer; flex-shrink: 0; transition: filter 0.2s; }
        .highlighter-btn:hover, .pen-tool:hover { filter: brightness(0.95); }
        .pen-tool.active, .highlighter-btn.active { background-color: #dbeafe; border-color: #93c5fd; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
        .toolbar-divider { width: 1px; height: 24px; background-color: #ccc; margin: 0 4px; }
        
        mark { border-radius: 3px; padding: 0.1em 0; }
        body.drawing-mode { cursor: crosshair; }
        #drawing-canvas { position: absolute; top: 0; left: 0; z-index: 999; pointer-events: none; }
        
        .sticky-note { position: absolute; min-width: 220px; min-height: 220px; width: 250px; height: 250px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); z-index: 1001; display: flex; flex-direction: column; transition: transform 0.2s; resize: both; overflow: hidden; background: #FFFDE7; border: 1px solid #FBC02D; }
        .sticky-note-header { padding: 5px 8px; cursor: move; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.1); background: #FDD835; flex-shrink: 0; }
        .sticky-note-content { flex-grow: 1; padding: 10px; box-sizing: border-box; background: transparent; border: none; resize: none; outline: none; font-family: 'Comic Sans MS', cursive; font-size: 16px; overflow-y: auto; }
        .sticky-note-close { background: none; border: none; font-size: 18px; cursor: pointer; }
        
        #webcam-container { display: none; position: fixed; top: 50px; right: 50px; width: 320px; height: 240px; background: #000; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); z-index: 10000; overflow: hidden; resize: both; transition: box-shadow 0.3s; }
        #webcam-container.active { display: flex; flex-direction: column; }
        #webcam-header { position: absolute; top: 0; left: 0; width: 100%; padding: 8px 12px; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); display: flex; justify-content: space-between; align-items: center; opacity: 0; transition: opacity 0.3s; z-index: 10; cursor: move; }
        #webcam-container:hover #webcam-header { opacity: 1; }
        #webcam-video { width: 100%; height: 100%; object-fit: cover; }
        .webcam-controls button { background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }

        .session-timer { display: none; position: fixed; top: 20px; right: 20px; z-index: 1002; width: 250px; background-color: white; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); border: 1px solid #e5e7eb; }
        .session-timer-header { padding: 8px 12px; background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb; cursor: move; display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
        .session-timer-display { font-size: 3rem; font-weight: 700; text-align: center; padding: 1.5rem 1rem; font-family: monospace; }
        .session-timer-controls { display: flex; gap: 8px; padding: 0 1rem 1rem; }
        .timer-input { width: 60px; text-align: center; border: 1px solid #ccc; border-radius: 4px; }
        
        #emoji-picker { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background-color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 10px; z-index: 1001; margin-bottom: 10px; width: 300px; flex-wrap: wrap; gap: 5px; }
        .emoji-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; }
        .emoji-picker-btn { font-size: 24px; background: none; border: none; cursor: pointer; padding: 5px; }
        #emoji-stamp-cursor { position: absolute; pointer-events: none; z-index: 9999; font-size: 32px; user-select: none; }
        .emoji-stamp { position: absolute; cursor: move; user-select: none; z-index: 1001; }
        body.emoji-stamping { cursor: none !important; }
        
        #search-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.6);z-index:3000;display:none;justify-content:center;align-items:center}
        #search-modal{background-color:white;width:90%;max-width:500px;border-radius:8px;padding:20px;}
        .search-link-button{display:flex;gap:10px;align-items:center;padding:10px;margin-top:10px;color:#fff;text-decoration:none;border-radius:5px;}
        .search-link-button.google { background-color: #4285F4; }
        .search-link-button.wikipedia { background-color: #636466; }
        .search-link-button.translate { background-color: #34A853; }
        
        .masked-text { background-color: #ddd; filter: blur(4px); cursor: pointer; }
        .masked-text.revealed { background-color: transparent; filter: blur(0); }
    </style>
</head>
<body>
    
    <!-- Navigation Arrows -->
    <button class="nav-arrow nav-prev" onclick="changeSlide(-1)"><i class="fas fa-chevron-left"></i></button>
    <button class="nav-arrow nav-next" onclick="changeSlide(1)"><i class="fas fa-chevron-right"></i></button>

    <div class="presentation-container">
        ${slidesHtml}
    </div>

    <!-- COMPLETE FOOTER TOOLBOX -->
    <div id="webcam-container">
        <div id="webcam-header">
            <span style="color:white; font-size:12px; font-weight:bold;"><i class="fas fa-camera"></i> Live Cam</span>
            <div class="webcam-controls">
                <button id="webcam-pause-btn"><i class="fas fa-pause"></i></button>
                <button id="webcam-fullscreen-btn"><i class="fas fa-expand"></i></button>
                <button id="webcam-close-btn"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <video id="webcam-video" autoplay playsinline></video>
    </div>

    <div id="search-modal-overlay">
        <div id="search-modal">
            <div id="search-modal-header" style="display:flex; justify-content:space-between;">
                <span id="search-modal-title">Search</span>
                <button onclick="document.getElementById('search-modal-overlay').style.display='none'">&times;</button>
            </div>
            <div id="search-modal-content"></div>
        </div>
    </div>

    <div id="session-timer-widget" class="session-timer">
        <div id="session-timer-header" class="session-timer-header">
            <span><i class="fas fa-stopwatch"></i> Session Timer</span>
            <button id="session-timer-close">&times;</button>
        </div>
        <div class="session-timer-display" id="timer-display">20:00</div>
        <div class="session-timer-controls">
            <input type="number" id="timer-minutes-input" value="20" class="timer-input">
            <button id="timer-start-btn">Start</button>
            <button id="timer-pause-btn">Pause</button>
            <button id="timer-reset-btn">Reset</button>
        </div>
    </div>

    <div id="fixed-footer">
        <div class="toolbar-scroll-wrapper">
            <div id="highlighter-toolbar">
                <button class="highlighter-btn" id="select-tool-btn" title="Normal Pointer" style="background-color: #f3f4f6;"><i class="fas fa-mouse-pointer"></i></button>
                <div style="display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px; margin-right: 4px;">
                    <input type="color" id="highlight-color-picker" value="#fef08a" style="width: 24px; height: 24px; border: none; cursor: pointer; background: none;">
                    <button class="highlighter-btn" id="highlight-mode-btn" title="Highlighter" style="border: none;"><i class="fas fa-highlighter"></i></button>
                </div>
                <button class="highlighter-btn" id="read-selected-btn" title="Read Selected" style="background-color: #bae6fd;"><i class="fas fa-volume-up"></i></button>
                <div class="toolbar-divider"></div>
                <button class="highlighter-btn" id="undo-btn" title="Undo"><i class="fas fa-undo"></i></button>
                <button class="highlighter-btn" id="redo-btn" title="Redo"><i class="fas fa-redo"></i></button>
                <div class="toolbar-divider"></div>
                <button class="highlighter-btn" id="add-sticky-note-btn" title="Sticky Note" style="background-color: #fef9c3;"><i class="fas fa-sticky-note"></i></button>
                <button class="highlighter-btn" id="emoji-stamp-btn" title="Emoji Stamp" style="background-color: #fbcfe8;"><i class="far fa-laugh-beam"></i></button>
                <button class="highlighter-btn" id="mask-text-btn" title="Mask/Reveal" style="background-color: #d1d5db;"><i class="fas fa-eye-slash"></i></button>
                <button class="highlighter-btn" id="search-btn" title="Search" style="background-color: #bbf7d0;"><i class="fas fa-search"></i></button>
                <button class="highlighter-btn" id="pen-btn" title="Drawing" style="background-color: #fed7aa;"><i class="fas fa-pen"></i></button>
                <button class="highlighter-btn" id="webcam-btn" title="Webcam" style="background-color: #fce7f3;"><i class="fas fa-video"></i></button>
                <div class="toolbar-divider"></div>
                <button class="highlighter-btn" id="timer-btn" title="Timer" style="background-color: #e0f2fe;"><i class="fas fa-stopwatch"></i></button>
            </div>
            
            <div id="pen-toolbar" style="display:none;">
                <button class="highlighter-btn" id="exit-pen-btn"><i class="fas fa-times"></i></button>
                <div class="toolbar-divider"></div>
                <button class="pen-tool active" data-tool="pen"><i class="fas fa-signature"></i></button>
                <input type="color" id="pen-color" value="#FF0000">
                <input type="range" id="pen-width" min="1" max="20" value="3">
                <button class="highlighter-btn" id="pen-clear-btn"><i class="fas fa-trash-alt"></i></button>
            </div>

            <div id="emoji-picker">
                <div class="emoji-grid" id="emoji-grid-positive"></div>
            </div>
        </div>
    </div>
    <canvas id="drawing-canvas"></canvas>
    <div id="emoji-stamp-cursor"></div>

    <script>
        // --- NAVIGATION LOGIC ---
        let currentSlideIndex = 0;
        const slides = document.querySelectorAll('.slide');
        const prevBtn = document.querySelector('.nav-prev');
        const nextBtn = document.querySelector('.nav-next');

        function updateNav() {
            slides.forEach((s, i) => s.classList.toggle('active', i === currentSlideIndex));
            prevBtn.classList.toggle('disabled', currentSlideIndex === 0);
            nextBtn.classList.toggle('disabled', currentSlideIndex === slides.length - 1);
        }

        function changeSlide(dir) {
            const newIndex = currentSlideIndex + dir;
            if (newIndex >= 0 && newIndex < slides.length) {
                currentSlideIndex = newIndex;
                updateNav();
            }
        }
        
        updateNav();

        // --- READ ALOUD LOGIC ---
        function playTTS(btn, e) {
            e.stopPropagation();
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            const text = btn.dataset.text;
            const u = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const prefVoice = voices.find(v => v.voiceURI === "${learner.readAloudVoice || ''}");
            if (prefVoice) u.voice = prefVoice;
            window.speechSynthesis.speak(u);
        }

        // --- COMPLETE TOOLBOX LOGIC (Restored Fully) ---
        // 1. Draggable helper
        function makeDraggable(element, handle) {
            let isDragging = false, offsetX, offsetY;
            handle.onmousedown = (e) => {
                if (e.target.closest('button')) return;
                isDragging = true;
                const rect = element.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                document.onmousemove = (e) => { 
                    if (isDragging) { 
                        element.style.left = (e.clientX - offsetX) + 'px'; 
                        element.style.top = (e.clientY - offsetY) + 'px'; 
                    } 
                };
                document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
            };
        }

        // 2. Undo/Redo Stacks
        const undoStack = [];
        const redoStack = [];
        function pushAction(action) {
            undoStack.push(action);
            redoStack.length = 0;
        }
        function undo() {
            if(undoStack.length===0) return;
            const action = undoStack.pop();
            redoStack.push(action);
            if(action.type === 'dom_add') { action.el.remove(); }
            else if (action.type === 'canvas_draw') {
                const ctx = document.getElementById('drawing-canvas').getContext('2d');
                ctx.putImageData(action.prevSnapshot, 0, 0);
            }
        }
        function redo() {
            if(redoStack.length===0) return;
            const action = redoStack.pop();
            undoStack.push(action);
            if(action.type === 'dom_add') { document.body.appendChild(action.el); }
            else if (action.type === 'canvas_draw') {
                const ctx = document.getElementById('drawing-canvas').getContext('2d');
                ctx.putImageData(action.newSnapshot, 0, 0);
            }
        }
        document.getElementById('undo-btn').onclick = undo;
        document.getElementById('redo-btn').onclick = redo;

        // 3. Sticky Notes
        document.getElementById('add-sticky-note-btn').onclick = (e) => {
            const note = document.createElement('div');
            note.className = 'sticky-note';
            note.style.left = '100px'; note.style.top = '100px';
            note.innerHTML = \`<div class="sticky-note-header"><button class="sticky-note-close" onclick="this.parentElement.parentElement.remove()">&times;</button></div><div class="sticky-note-content" contenteditable="true" placeholder="Type here..."></div>\`;
            document.body.appendChild(note);
            makeDraggable(note, note.querySelector('.sticky-note-header'));
            pushAction({type: 'dom_add', el: note});
        };

        // 4. Webcam
        const webcamContainer = document.getElementById('webcam-container');
        document.getElementById('webcam-btn').onclick = async () => {
            if (webcamContainer.style.display === 'flex') {
                webcamContainer.style.display = 'none';
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                document.getElementById('webcam-video').srcObject = stream;
                webcamContainer.style.display = 'flex';
            } catch(e) { alert("Webcam error"); }
        };
        makeDraggable(webcamContainer, document.getElementById('webcam-header'));
        document.getElementById('webcam-close-btn').onclick = () => webcamContainer.style.display = 'none';

        // 5. Timer
        let totalSeconds = 0, timerInterval = null;
        const timerDisplay = document.getElementById('timer-display');
        function updateTimerDisplay() {
            const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
            const s = (totalSeconds % 60).toString().padStart(2, '0');
            timerDisplay.textContent = m + ":" + s;
        }
        document.getElementById('timer-btn').onclick = () => document.getElementById('session-timer-widget').style.display = 'block';
        document.getElementById('session-timer-close').onclick = () => document.getElementById('session-timer-widget').style.display = 'none';
        document.getElementById('timer-start-btn').onclick = () => {
            if(timerInterval) clearInterval(timerInterval);
            totalSeconds = parseInt(document.getElementById('timer-minutes-input').value) * 60;
            timerInterval = setInterval(() => {
                totalSeconds--;
                updateTimerDisplay();
                if(totalSeconds<=0) clearInterval(timerInterval);
            }, 1000);
        };
        makeDraggable(document.getElementById('session-timer-widget'), document.getElementById('session-timer-header'));

        // 6. Highlighter & Masking
        document.getElementById('highlight-mode-btn').onclick = () => {
            document.body.style.cursor = 'text';
            document.onmouseup = () => {
                const sel = window.getSelection();
                if (sel.toString().length > 0) {
                    const range = sel.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.backgroundColor = document.getElementById('highlight-color-picker').value;
                    try {
                        range.surroundContents(span);
                        pushAction({type: 'dom_add', el: span});
                    } catch(e) { console.log(e); }
                    sel.removeAllRanges();
                }
            };
        };
        document.getElementById('mask-text-btn').onclick = () => {
            const sel = window.getSelection();
            if (sel.toString().length > 0) {
                const range = sel.getRangeAt(0);
                const span = document.createElement('span');
                span.className = 'masked-text';
                span.onclick = function() { this.classList.toggle('revealed'); };
                try {
                    range.surroundContents(span);
                    pushAction({type: 'dom_add', el: span});
                } catch(e) { console.log(e); }
                sel.removeAllRanges();
            }
        };
        document.getElementById('select-tool-btn').onclick = () => {
            document.onmouseup = null;
            document.body.style.cursor = 'auto';
        };

        // 7. Pen
        const canvas = document.getElementById('drawing-canvas');
        const ctx = canvas.getContext('2d');
        let painting = false;
        let snapshot;
        function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        document.getElementById('pen-btn').onclick = () => {
            resizeCanvas();
            document.getElementById('highlighter-toolbar').style.display='none';
            document.getElementById('pen-toolbar').style.display='flex';
            canvas.style.pointerEvents = 'auto';
            document.body.classList.add('drawing-mode');
        };
        document.getElementById('exit-pen-btn').onclick = () => {
            document.getElementById('highlighter-toolbar').style.display='flex';
            document.getElementById('pen-toolbar').style.display='none';
            canvas.style.pointerEvents = 'none';
            document.body.classList.remove('drawing-mode');
        };
        document.getElementById('pen-clear-btn').onclick = () => {
            snapshot = ctx.getImageData(0,0,canvas.width,canvas.height);
            ctx.clearRect(0,0,canvas.width,canvas.height);
            pushAction({type: 'canvas_draw', prevSnapshot: snapshot, newSnapshot: ctx.getImageData(0,0,canvas.width,canvas.height)});
        };
        
        canvas.onmousedown = (e) => { 
            painting = true; 
            snapshot = ctx.getImageData(0,0,canvas.width,canvas.height);
            ctx.beginPath(); 
            ctx.moveTo(e.clientX, e.clientY); 
        };
        canvas.onmousemove = (e) => { 
            if (!painting) return; 
            ctx.lineWidth = document.getElementById('pen-width').value; 
            ctx.strokeStyle = document.getElementById('pen-color').value; 
            ctx.lineTo(e.clientX, e.clientY); 
            ctx.stroke(); 
        };
        canvas.onmouseup = () => { 
            painting = false;
            pushAction({type: 'canvas_draw', prevSnapshot: snapshot, newSnapshot: ctx.getImageData(0,0,canvas.width,canvas.height)});
        };

        // 8. Emojis
        const emojis = ['👍', '❤️', '😂', '😮', '🥳', '⭐', '🔥', '✅', '❌', '❓'];
        const emojiPicker = document.getElementById('emoji-picker');
        const emojiGrid = document.getElementById('emoji-grid-positive');
        emojis.forEach(e => {
            const btn = document.createElement('button');
            btn.className = 'emoji-picker-btn';
            btn.innerText = e;
            btn.onclick = () => {
                document.body.classList.add('emoji-stamping');
                const stampCursor = document.getElementById('emoji-stamp-cursor');
                stampCursor.innerText = e;
                document.onmousemove = (mv) => { stampCursor.style.left = mv.pageX + 'px'; stampCursor.style.top = mv.pageY + 'px'; };
                document.onclick = (clk) => {
                    if (clk.target.closest('#fixed-footer')) return;
                    const stamp = document.createElement('span');
                    stamp.className = 'emoji-stamp';
                    stamp.innerText = e;
                    stamp.style.fontSize = '32px';
                    stamp.style.left = (clk.pageX - 16) + 'px';
                    stamp.style.top = (clk.pageY - 16) + 'px';
                    document.body.appendChild(stamp);
                    makeDraggable(stamp, stamp);
                    pushAction({type: 'dom_add', el: stamp});
                    // Reset
                    document.body.classList.remove('emoji-stamping');
                    document.onclick = null;
                    document.onmousemove = null;
                    emojiPicker.style.display = 'none';
                };
            };
            emojiGrid.appendChild(btn);
        });
        document.getElementById('emoji-stamp-btn').onclick = () => {
            emojiPicker.style.display = emojiPicker.style.display === 'flex' ? 'none' : 'flex';
        };

        // 9. Search
        document.getElementById('search-btn').onclick = () => {
            const text = window.getSelection().toString();
            if(text) {
                const modal = document.getElementById('search-modal-content');
                modal.innerHTML = \`<p>Searching for: <strong>\${text}</strong></p><a href="https://www.google.com/search?q=\${text}" target="_blank" class="search-link-button google">Google</a>\`;
                document.getElementById('search-modal-overlay').style.display='flex';
            } else { alert("Select text first."); }
        };

    </script>
</body>
</html>`;

    if (returnHtml) return finalHtml;

    import('./htmlLessonSaver').then(({ saveAndExportHtmlLesson }) => {
        saveAndExportHtmlLesson({
            htmlContent: finalHtml,
            fileName: filename,
            learnerName: learner.name,
            type: 'Slides',
            title: filename,
            triggerDownload: true
        });
    }).catch(() => {
        const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            try { document.body.removeChild(link); } catch(e) {}
            URL.revokeObjectURL(url);
        }, 1000);
    });
};
