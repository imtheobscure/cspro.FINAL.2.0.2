export const getSmpJs = (): string => {
    return `
        const container = $('super-media-player');
        if (!container) {
            console.warn('Super Media Player markup is unavailable; skipping player bootstrap.');
            return;
        }

        // Elements
        const videoEl = $('smp-video-el');
        const audioEl = $('smp-audio-el');
        const ytEl = $('smp-yt-el');
        const placeholder = $('smp-placeholder');
        const playBtn = $('smp-play-btn');
        const progressInput = $('smp-progress');
        const timeDisplay = $('smp-current-time');
        const totalTimeDisplay = $('smp-total-time');
        const speedInput = $('smp-speed');
        const speedVal = $('smp-speed-val');
        const volumeInput = $('smp-volume');
        const rightPanel = $('smp-right-panel');

        let activeMedia = null;
        let isYoutube = false;

        // Utility: Throttle
        function throttle(fn, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    fn.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        function formatTime(sec) {
            if (isNaN(sec) || sec === Infinity) return '0:00';
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        // ==================== SPEECH SYNTHESIS & RECOGNITION ==================== //
        const useSpeechSynthesis = {
            _voices: [],
            _selectedVoice: null,

            init() {
                if (!('speechSynthesis' in window)) return;
                const updateVoices = () => {
                    this._voices = window.speechSynthesis.getVoices();
                    const select = $('smp-voice-select');
                    if (select && this._voices.length > 0) {
                        select.innerHTML = '';
                        this._voices.forEach((v, i) => {
                            const opt = document.createElement('option');
                            opt.value = i;
                            opt.textContent = v.name + ' (' + v.lang + ')';
                            if (v.default || v.lang.startsWith('en')) opt.selected = true;
                            select.appendChild(opt);
                        });
                        this._selectedVoice = this._voices[select.value || 0];
                    }
                };
                updateVoices();
                if (window.speechSynthesis.onvoiceschanged !== undefined) {
                    window.speechSynthesis.onvoiceschanged = updateVoices;
                }
            },

            setVoice(idx) {
                if (this._voices[idx]) {
                    this._selectedVoice = this._voices[idx];
                    store.set('selectedVoice', this._selectedVoice);
                }
            },

            speak(text, speed = 1.0) {
                if (!('speechSynthesis' in window) || !text) return;
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(text);
                if (this._selectedVoice) utter.voice = this._selectedVoice;
                utter.rate = speed * (store.get('speechRate') || 1.0);
                window.speechSynthesis.speak(utter);
            }
        };

        const useSpeechRecognition = {
            _recognition: null,
            _isListening: false,

            init() {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) return;
                this._recognition = new SpeechRecognition();
                this._recognition.continuous = false;
                this._recognition.interimResults = true;
                this._recognition.lang = 'en-US';
            },

            start(expectedText, onResult) {
                if (!this._recognition) this.init();
                if (!this._recognition) { showToast('Speech recognition not supported in this browser'); return; }

                this._isListening = true;
                const micAnim = $('smp-mic-animation');
                if (micAnim) micAnim.className = 'smp-mic-listening';
                $('smp-speaking-result').textContent = 'Listening... Speak now!';

                this._recognition.onresult = (e) => {
                    let transcript = '';
                    for (let i = e.resultIndex; i < e.results.length; i++) {
                        transcript += e.results[i][0].transcript;
                    }
                    $('smp-speaking-result').textContent = 'You said: "' + transcript + '"';
                    const similarity = this._calcSimilarity(transcript, expectedText);
                    const pct = Math.round(similarity * 100);
                    $('smp-accuracy-fill').style.width = pct + '%';
                    $('smp-accuracy-label').textContent = pct + '% Match';

                    if (e.results[0].isFinal) {
                        this.stop();
                        if (onResult) onResult({ transcript, similarity: pct });
                    }
                };

                this._recognition.onerror = (e) => {
                    $('smp-speaking-result').textContent = 'Recognition error: ' + e.error;
                    this.stop();
                };

                this._recognition.onend = () => {
                    this.stop();
                };

                this._recognition.start();
            },

            stop() {
                if (this._recognition && this._isListening) {
                    this._recognition.stop();
                }
                this._isListening = false;
                const micAnim = $('smp-mic-animation');
                if (micAnim) micAnim.className = 'smp-mic-idle';
            },

            _calcSimilarity(s1, s2) {
                if (!s1 || !s2) return 0;
                const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\\s+/);
                const w1 = clean(s1);
                const w2 = clean(s2);
                const common = w1.filter(w => w2.includes(w));
                return common.length / Math.max(w1.length, w2.length);
            }
        };

        // ==================== SCREEN SHARE HOOK ==================== //
        const useScreenShare = {
            _stream: null,

            async start() {
                try {
                    this._stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    const video = $('smp-screenshare-video');
                    video.srcObject = this._stream;
                    $('smp-screenshare-overlay').style.display = 'block';
                    this._stream.getVideoTracks()[0].onended = () => this.stop();
                    showToast('Screen sharing started');
                } catch(e) {
                    showToast('Screen share cancelled or failed');
                }
            },

            stop() {
                if (this._stream) {
                    this._stream.getTracks().forEach(t => t.stop());
                    this._stream = null;
                }
                $('smp-screenshare-overlay').style.display = 'none';
            },

            toggleVisibility() {
                const video = $('smp-screenshare-video');
                video.style.display = video.style.display === 'none' ? 'block' : 'none';
            }
        };

        // ==================== TIME UPDATE & TIMESTAMP ACTIVITIES ==================== //
        let _activeTimestampActivity = null;
        let _lastTriggeredTimestampId = null;

        function checkTimestampActivities(ct) {
            const acts = store.get('activities');
            if (!acts) return;
            const banner = $('smp-act-banner');
            if (!banner) return;

            // Gather all timestamped items
            const all = [];
            if (Array.isArray(acts.activities)) all.push(...acts.activities);
            if (Array.isArray(acts.glossary)) all.push(...acts.glossary.map(g => ({ ...g, type: 'flashcard' })));
            if (Array.isArray(acts.questions)) all.push(...acts.questions);
            if (acts.unscramble && typeof acts.unscramble.timestamp === 'number') all.push({ ...acts.unscramble, type: 'unscramble' });
            if (acts.wordMaster && typeof acts.wordMaster.timestamp === 'number') all.push({ ...acts.wordMaster, type: 'wordmaster' });
            if (acts.snowman && typeof acts.snowman.timestamp === 'number') all.push({ ...acts.snowman, type: 'snowman' });
            if (acts.dialogue && typeof acts.dialogue.timestamp === 'number') all.push({ ...acts.dialogue, type: 'dialogue_roleplay' });

            const hit = all.find(a => typeof a.timestamp === 'number' && Math.abs(a.timestamp - ct) < 1.0);
            if (hit) {
                const id = hit.id || (hit.type + '_' + hit.timestamp);
                if (id !== _lastTriggeredTimestampId) {
                    _lastTriggeredTimestampId = id;
                    _activeTimestampActivity = hit;
                    showTimestampActivityBanner(hit);
                }
            }
        }

        function showTimestampActivityBanner(act) {
            const banner = $('smp-act-banner');
            if (!banner) return;
            const titleEl = $('smp-act-banner-title');
            const timeEl = $('smp-act-banner-timestamp');
            const tagEl = $('smp-act-banner-tag');
            const iconBox = $('smp-act-banner-icon-box');

            const def = (typeof activityDefinitions !== 'undefined') ? activityDefinitions.find(d => d.id === act.type || d.id === act.activityType) : null;
            if (def) {
                if (tagEl) tagEl.textContent = def.name;
                if (iconBox) iconBox.innerHTML = '<i class="fas ' + def.icon + '" style="color:' + def.color + '"></i>';
            } else {
                if (tagEl) tagEl.textContent = 'Interactive Activity';
                if (iconBox) iconBox.innerHTML = '<i class="fas fa-sparkles" style="color:var(--smp-accent)"></i>';
            }

            if (titleEl) titleEl.textContent = act.term || act.question || act.targetSentence || act.word || act.title || 'Interactive Learning Checkpoint';
            if (timeEl) timeEl.textContent = formatTime(act.timestamp || 0);

            banner.style.display = 'flex';
            banner.classList.remove('hiding');
            banner.classList.add('showing');

            if (banner._hideTimer) clearTimeout(banner._hideTimer);
            banner._hideTimer = setTimeout(() => {
                SMP.dismissTimestampActivityBanner();
            }, 8500);
        }

        const onTimeUpdate = throttle(function() {
            if (!activeMedia) return;
            const ct = activeMedia.currentTime;
            const dur = activeMedia.duration || 0;

            store._state.currentTime = ct;
            store._state.duration = dur;

            const pct = dur > 0 ? (ct / dur) * 1000 : 0;
            progressInput.value = pct;
            timeDisplay.textContent = formatTime(ct);
            totalTimeDisplay.textContent = formatTime(dur);

            useSubtitles.updateSubtitleDisplay(ct);
            updateTranscriptHighlight(ct);
            checkTimestampActivities(ct);
        }, 100);

        // ==================== TRANSCRIPT HELPERS ==================== //
        function renderTranscript() {
            const list = $('smp-transcript-list');
            if (!list) return;
            list.innerHTML = '';

            const activities = store.get('activities');
            let lines = [];

            if (activities && activities.transcript && activities.transcript.length > 0) {
                lines = activities.transcript;
            } else {
                const cues = store.get('cues') || [];
                lines = cues.map((c, i) => ({ text: c.text, startTime: c.startTime, endTime: c.endTime, id: c.id || i }));
            }

            if (lines.length === 0) {
                list.innerHTML = '<p style="color:var(--smp-text-muted);text-align:center;padding:20px;">No transcript lines. Load media with subtitles or import activities JSON.</p>';
                return;
            }

            lines.forEach((line, idx) => {
                const div = document.createElement('div');
                div.className = 'smp-transcript-line';
                div.dataset.lineIdx = idx;

                const hasGlossary = activities && (activities.glossary || []).some(g => g.lineIndex === idx || Math.abs((g.timestamp || 0) - (line.startTime || 0)) < 4);
                const hasQuiz = activities && (activities.questions || []).some(q => q.lineIndex === idx || Math.abs((q.timestamp || 0) - (line.startTime || 0)) < 4);

                let html = '<span class="smp-line-text">' + activityRenderers._escHtml(line.text) + '</span>';
                html += '<span class="smp-line-icons">';
                html += '<button class="smp-line-icon-btn" data-text="' + activityRenderers._escHtml(line.text) + '" onclick="event.stopPropagation(); SMP.speech.speak(this.dataset.text)" title="Listen (TTS)"><i class="fas fa-volume-up"></i></button>';
                html += '<button class="smp-line-icon-btn" data-text="' + activityRenderers._escHtml(line.text) + '" onclick="event.stopPropagation(); SMP.activities.startSpeaking(this.dataset.text, \\'line_' + idx + '\\', 10)" title="Practice Speaking"><i class="fas fa-microphone"></i></button>';
                if (hasGlossary) {
                    html += '<button class="smp-line-icon-btn" onclick="event.stopPropagation(); SMP.activities.openFlashcardForLine(' + idx + ')" title="Flashcard"><i class="fas fa-clone"></i></button>';
                }
                if (hasQuiz) {
                    html += '<button class="smp-line-icon-btn" onclick="event.stopPropagation(); SMP.activities.openQuizForLine(' + idx + ')" title="Quiz"><i class="fas fa-question-circle"></i></button>';
                }
                html += '</span>';

                div.innerHTML = html;
                div.onclick = () => {
                    if (typeof line.startTime === 'number' && activeMedia) {
                        activeMedia.currentTime = line.startTime;
                    }
                    list.querySelectorAll('.smp-transcript-line').forEach(l => l.classList.remove('active-line'));
                    div.classList.add('active-line');
                    store.set('activeTranscriptLine', idx);
                };

                list.appendChild(div);
            });
        }

        function updateTranscriptHighlight(currentTime) {
            if (store.get('mode') !== 'transcript') return;
            const cueIdx = useSubtitles.getCurrentCue(currentTime);
            const prevIdx = store.get('activeTranscriptLine');
            if (prevIdx === cueIdx) return;

            const list = $('smp-transcript-list');
            if (!list) return;

            if (prevIdx >= 0 && list.children[prevIdx]) {
                list.children[prevIdx].classList.remove('active-line');
            }

            if (cueIdx >= 0 && list.children[cueIdx]) {
                list.children[cueIdx].classList.add('active-line');
                list.children[cueIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                store.set('activeTranscriptLine', cueIdx);
            }
        }

        function renderTimelineMarkers() {
            const markers = $('smp-timeline-markers');
            const duration = store.get('duration') || (activeMedia ? activeMedia.duration : 0);
            if (!markers || !duration) return;
            markers.innerHTML = '';

            const activities = store.get('activities');
            const timestamps = new Set();
            if (activities) {
                (activities.glossary || []).forEach(g => { if (typeof g.timestamp === 'number') timestamps.add(g.timestamp); });
                (activities.questions || []).forEach(q => { if (typeof q.timestamp === 'number') timestamps.add(q.timestamp); });
            }

            timestamps.forEach(ts => {
                const pct = (ts / duration) * 100;
                const m = document.createElement('div');
                m.className = 'smp-timeline-marker';
                m.style.left = pct + '%';
                m.title = 'Activity at ' + formatTime(ts);
                m.onclick = (e) => {
                    e.stopPropagation();
                    if (activeMedia) activeMedia.currentTime = ts;
                };
                markers.appendChild(m);
            });
        }

        function updateProgressUI() {
            const progress = store.get('userProgress');
            const activities = store.get('activities');
            let total = 0;
            if (activities) {
                total = (activities.glossary || []).length + (activities.questions || []).length + (activities.custom || []).length;
            }
            progress.total = total;

            $('smp-stat-completed').textContent = progress.completed.size;
            $('smp-stat-total').textContent = total;
            $('smp-stat-score').textContent = progress.score;

            const list = $('smp-progress-list');
            if (!list) return;
            list.innerHTML = '';

            if (activities) {
                (activities.glossary || []).forEach(g => {
                    const done = progress.completed.has(g.id);
                    const item = document.createElement('div');
                    item.className = 'smp-progress-item';
                    item.innerHTML = '<span class="smp-prog-check ' + (done ? 'done' : '') + '">' + (done ? '✓' : '○') + '</span> ' +
                        '<span>📖 ' + activityRenderers._escHtml(g.term) + '</span>';
                    list.appendChild(item);
                });
                (activities.questions || []).forEach(q => {
                    const done = progress.completed.has(q.id);
                    const item = document.createElement('div');
                    item.className = 'smp-progress-item';
                    item.innerHTML = '<span class="smp-prog-check ' + (done ? 'done' : '') + '">' + (done ? '✓' : '○') + '</span> ' +
                        '<span>❓ ' + activityRenderers._escHtml(q.question).substring(0, 35) + '...</span>';
                    list.appendChild(item);
                });
            }
            renderTimelineMarkers();
        }

        function markCompleted(id, points = 10) {
            const prog = store.get('userProgress');
            if (!prog.completed.has(id)) {
                prog.completed.add(id);
                prog.score += points;
                store.set('userProgress', prog);
                updateProgressUI();
                showToast('+' + points + ' Points earned! ⭐');
            }
        }

        // ==================== SLIDESHOW & DOC CONTROLLER ==================== //
        const slideshowController = {
            init(urls) {
                if (!urls || !urls.length) return;
                store.set('slides', urls);
                store.set('currentSlide', 0);
                this.show();
            },
            show() {
                const slides = store.get('slides');
                if (!slides.length) return;
                $('smp-slideshow').style.display = 'flex';
                $('smp-video-el').style.display = 'none';
                $('smp-audio-el').style.display = 'none';
                $('smp-yt-el').style.display = 'none';
                $('smp-placeholder').style.display = 'none';
                $('smp-doc-viewer').style.display = 'none';
                this._render();
            },
            _render() {
                const slides = store.get('slides');
                const idx = store.get('currentSlide');
                $('smp-slide-img').src = slides[idx];
                $('smp-slide-counter').textContent = (idx + 1) + ' / ' + slides.length;
            },
            next() {
                const slides = store.get('slides');
                let idx = (store.get('currentSlide') + 1) % slides.length;
                store.set('currentSlide', idx);
                this._render();
            },
            prev() {
                const slides = store.get('slides');
                let idx = (store.get('currentSlide') - 1 + slides.length) % slides.length;
                store.set('currentSlide', idx);
                this._render();
            },
            toggleAutoplay() {
                if (this._timer) {
                    clearInterval(this._timer);
                    this._timer = null;
                    $('smp-slide-autoplay').innerHTML = '<i class="fas fa-play"></i>';
                } else {
                    this._timer = setInterval(() => this.next(), 3000);
                    $('smp-slide-autoplay').innerHTML = '<i class="fas fa-pause"></i>';
                }
            },
            fullscreen() {
                $('smp-slideshow').requestFullscreen?.();
            }
        };

        const documentController = {
            loadFile(input) {
                if (!input.files || !input.files[0]) return;
                const file = input.files[0];
                const url = URL.createObjectURL(file);
                $('smp-doc-viewer').style.display = 'block';
                $('smp-video-el').style.display = 'none';
                $('smp-audio-el').style.display = 'none';
                $('smp-placeholder').style.display = 'none';
                $('smp-doc-iframe').src = url;
                SMP.overlays.close('docUpload');
                showToast('Loaded: ' + file.name);
            },
            handleDrop(e) {
                if (e.dataTransfer && e.dataTransfer.files[0]) {
                    this.loadFile({ files: e.dataTransfer.files });
                }
            },
            prevPage() {},
            nextPage() {}
        };

        // ==================== AI PROMPT GENERATOR ==================== //
        function generateAIPrompt(level = 'B1', focus = 'comprehensive', targetLang = 'English') {
            const cues = store.get('cues') || [];
            const transcriptSummary = cues.map(c => '[' + formatTime(c.startTime) + ' - ' + formatTime(c.endTime) + '] ' + c.text).join('\\n');

            return 'You are an elite Language Pedagogy & Curriculum Design AI.\\n' +
                'Analyze the provided video transcript below and generate a rich pedagogical learning pack formatted as strict, valid JSON.\\n\\n' +
                'TARGET LEVEL: CEFR ' + level + '\\n' +
                'FOCUS: ' + focus + '\\n' +
                'EXPLANATION LANGUAGE: ' + targetLang + '\\n\\n' +
                'TRANSCRIPT CUES:\\n' +
                (transcriptSummary || '[No transcript loaded yet. Generate high-quality B1 ESL lesson sample.]') + '\\n\\n' +
                'REQUIREMENTS:\\n' +
                '1. Return ONLY valid JSON matching this exact schema:\\n' +
                '{\\n' +
                '  "glossary": [\\n' +
                '    {\\n' +
                '      "id": "g1",\\n' +
                '      "timestamp": 5.0,\\n' +
                '      "term": "Target Word/Phrase",\\n' +
                '      "ipa": "/ˈtɑːrɡɪt/",\\n' +
                '      "partOfSpeech": "verb/noun/adj",\\n' +
                '      "meaning": "Clear, contextual definition",\\n' +
                '      "examples": ["Example sentence 1", "Example sentence 2"],\\n' +
                '      "conceptCheckingQuestion": "Does this mean X or Y?"\\n' +
                '    }\\n' +
                '  ],\\n' +
                '  "questions": [\\n' +
                '    {\\n' +
                '      "id": "q1",\\n' +
                '      "timestamp": 12.0,\\n' +
                '      "type": "multiple_choice",\\n' +
                '      "question": "Comprehension question about the context?",\\n' +
                '      "options": [\\n' +
                '        { "text": "Option A", "correct": true },\\n' +
                '        { "text": "Option B", "correct": false },\\n' +
                '        { "text": "Option C", "correct": false }\\n' +
                '      ],\\n' +
                '      "feedback": { "correct": "Great job!", "incorrect": "Review the cue at 0:12." },\\n' +
                '      "points": 10\\n' +
                '    },\\n' +
                '    {\\n' +
                '      "id": "q2",\\n' +
                '      "timestamp": 25.0,\\n' +
                '      "type": "fill_blanks",\\n' +
                '      "sentence": "The presenter decided to ___ the results immediately.",\\n' +
                '      "blanks": ["announce"],\\n' +
                '      "points": 10\\n' +
                '    }\\n' +
                '  ],\\n' +
                '  "unscramble": {\\n' +
                '    "targetSentence": "She has been studying English for five years.",\\n' +
                '    "words": ["She", "has", "been", "studying", "English", "for", "five", "years."]\\n' +
                '  },\\n' +
                '  "wordMaster": {\\n' +
                '    "word": "FLUENT",\\n' +
                '    "clue": "Able to express oneself easily and articulately"\\n' +
                '  },\\n' +
                '  "snowman": {\\n' +
                '    "word": "VOCABULARY",\\n' +
                '    "clue": "All the words used in a particular language"\\n' +
                '  },\\n' +
                '  "dialogue": {\\n' +
                '    "title": "Ordering at a Café",\\n' +
                '    "lines": [\\n' +
                '      { "speaker": "Speaker A", "text": "Hi there, what can I get started for you today?" },\\n' +
                '      { "speaker": "Speaker B", "text": "I would love a medium oat milk latte, please." }\\n' +
                '    ]\\n' +
                '  }\\n' +
                '}';
        }

        // ==================== MAIN SMP API (window.SMP) ==================== //
        window.SMP = {
            show() {
                container.style.display = 'flex';
                this.bringToFront();
                useAnnotations.init();
            },

            bringToFront() {
                let maxZ = 10000;
                document.querySelectorAll('.sticky-note, .whiteboard-container, #session-timer-widget').forEach(el => {
                    const z = parseInt(window.getComputedStyle(el).zIndex, 10);
                    if (!isNaN(z) && z >= maxZ) maxZ = z + 1;
                });
                container.style.zIndex = (maxZ + 10).toString();
            },

            centerPlayer() {
                const winW = window.innerWidth;
                const winH = window.innerHeight;
                const w = Math.min(960, Math.round(winW * 0.9));
                const h = Math.min(650, Math.round(winH * 0.88));
                container.style.width = w + 'px';
                container.style.height = h + 'px';
                container.style.left = Math.max(10, Math.round((winW - w) / 2)) + 'px';
                container.style.top = Math.max(10, Math.round((winH - h) / 2)) + 'px';
                container.style.transform = 'none';
                showToast('Player centered');
            },

            toggleFullscreen() {
                container.classList.toggle('fullscreen');
                useAnnotations.resize();
            },

            close() {
                container.style.display = 'none';
                if (videoEl) { videoEl.pause(); videoEl.src = ''; }
                if (audioEl) { audioEl.pause(); audioEl.src = ''; }
                if (ytEl) ytEl.src = '';
                store.set('isPlaying', false);
                useScreenShare.stop();
                useAnnotations.close();
            },

            setMode(mode) {
                store.set('mode', mode);
                applyMode();
                showToast('Mode: ' + (mode === 'subtitle' ? 'Subtitle' : 'Transcript'));
            },

            toggleTheme() {
                const cur = store.get('theme');
                store.set('theme', cur === 'dark' ? 'light' : 'dark');
                applyTheme();
            },

            toggleSubtitleMenu() {
                const pop = $('smp-sub-settings-popover');
                if (pop) pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
            },

            // --- Subtitle Sub-API ---
            subtitles: {
                loadFromFile(input) {
                    if (!input.files || !input.files[0]) return;
                    const file = input.files[0];
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        useSubtitles.load(e.target.result);
                    };
                    reader.readAsText(file);
                },
                setSize(size) {
                    const disp = $('smp-subtitle-display');
                    disp.className = 'smp-sub-' + size + ' smp-sub-' + (store.get('subtitleSettings')?.position || 'bottom');
                    document.querySelectorAll('.smp-sub-size-btn').forEach(b => b.classList.toggle('active', b.dataset.size === size));
                    const s = store.get('subtitleSettings') || {};
                    s.size = size;
                    store.set('subtitleSettings', s);
                },
                setPosition(pos) {
                    const disp = $('smp-subtitle-display');
                    disp.className = 'smp-sub-' + (store.get('subtitleSettings')?.size || 'medium') + ' smp-sub-' + pos;
                    document.querySelectorAll('.smp-sub-pos-btn').forEach(b => b.classList.toggle('active', b.dataset.pos === pos));
                    const s = store.get('subtitleSettings') || {};
                    s.position = pos;
                    store.set('subtitleSettings', s);
                },
                toggleWordClick(enabled) {
                    const s = store.get('subtitleSettings') || {};
                    s.wordClick = enabled;
                    store.set('subtitleSettings', s);
                },
                onWordClick(e, word) {
                    e.stopPropagation();
                    const card = $('smp-word-lookup-card');
                    if (!card) return;
                    $('smp-wl-term').textContent = word;
                    $('smp-wl-meaning').textContent = 'Selected: "' + word + '". Click speak to listen or add to vocabulary deck.';
                    card.style.display = 'block';
                },
                closeWordCard() {
                    const card = $('smp-word-lookup-card');
                    if (card) card.style.display = 'none';
                },
                addWordToFlashcards() {
                    const word = $('smp-wl-term').textContent;
                    const item = {
                        id: 'custom_' + Date.now(),
                        term: word,
                        ipa: '',
                        meaning: 'Saved from subtitle playback.',
                        examples: []
                    };
                    activityRenderers.renderFlashcard(item);
                    this.closeWordCard();
                },
                practiceWord() {
                    const word = $('smp-wl-term').textContent;
                    activityRenderers.renderSpeaking({ text: word, id: 'spk_' + Date.now(), points: 10 });
                    this.closeWordCard();
                },
                repeatCurrentCue() {
                    if (!activeMedia) return;
                    const cueIdx = useSubtitles.getCurrentCue(activeMedia.currentTime);
                    const cues = store.get('cues');
                    if (cueIdx >= 0 && cues[cueIdx]) {
                        activeMedia.currentTime = cues[cueIdx].startTime;
                        activeMedia.play();
                        showToast('Replaying cue');
                    }
                },
                speakCurrentCue() {
                    const cueIdx = useSubtitles.getCurrentCue(activeMedia ? activeMedia.currentTime : 0);
                    const cues = store.get('cues');
                    if (cueIdx >= 0 && cues[cueIdx]) {
                        useSpeechSynthesis.speak(cues[cueIdx].text);
                    }
                },
                practiceCurrentCue() {
                    const cueIdx = useSubtitles.getCurrentCue(activeMedia ? activeMedia.currentTime : 0);
                    const cues = store.get('cues');
                    if (cueIdx >= 0 && cues[cueIdx]) {
                        activityRenderers.renderSpeaking({ text: cues[cueIdx].text, id: 'cue_spk_' + cueIdx, points: 15 });
                    }
                },
                export(fmt) {
                    useSubtitles.export(fmt);
                }
            },

            // --- Playback Controls ---
            togglePlay() {
                if (isYoutube) { showToast('Use YouTube controls'); return; }
                if (!activeMedia) return;
                if (activeMedia.paused) {
                    activeMedia.play().catch(e => console.error(e));
                    store.set('isPlaying', true);
                } else {
                    activeMedia.pause();
                    store.set('isPlaying', false);
                }
                this._updatePlayBtn();
            },

            _updatePlayBtn() {
                const p = store.get('isPlaying');
                playBtn.innerHTML = p ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
            },

            seekRelative(sec) {
                if (activeMedia && activeMedia.duration) {
                    activeMedia.currentTime = Math.max(0, Math.min(activeMedia.duration, activeMedia.currentTime + sec));
                    showToast((sec > 0 ? '+' : '') + sec + 's');
                }
            },

            toggleLoop() {
                if (!activeMedia) return;
                activeMedia.loop = !activeMedia.loop;
                $('smp-loop-btn').classList.toggle('active', activeMedia.loop);
                showToast(activeMedia.loop ? 'Loop: ON' : 'Loop: OFF');
            },

            async togglePip() {
                if (videoEl && videoEl.src) {
                    if (document.pictureInPictureElement) await document.exitPictureInPicture();
                    else await videoEl.requestPictureInPicture();
                }
            },

            toggleMute() {
                if (!activeMedia) return;
                activeMedia.muted = !activeMedia.muted;
                $('smp-vol-icon').className = activeMedia.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
                showToast(activeMedia.muted ? 'Muted' : 'Unmuted');
            },

            promptUrl() {
                const url = prompt('Enter media URL (YouTube / Video / Audio):');
                if (url) this.loadUrl(url);
            },

            loadUrl(url) {
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    let id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('youtu.be/')[1].split('?')[0];
                    if (id) {
                        ytEl.src = 'https://www.youtube.com/embed/' + id + '?enablejsapi=1';
                        ytEl.style.display = 'block';
                        videoEl.style.display = 'none';
                        audioEl.style.display = 'none';
                        placeholder.style.display = 'none';
                        isYoutube = true;
                    }
                } else {
                    const isAudio = /\\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(url);
                    activeMedia = isAudio ? audioEl : videoEl;
                    activeMedia.src = url;
                    activeMedia.style.display = 'block';
                    (isAudio ? videoEl : audioEl).style.display = 'none';
                    ytEl.style.display = 'none';
                    placeholder.style.display = 'none';
                    isYoutube = false;
                    activeMedia.play().catch(e => console.error(e));
                    store.set('isPlaying', true);
                    this._updatePlayBtn();
                }
            },

            loadFile(input) {
                if (!input.files || !input.files[0]) return;
                const file = input.files[0];
                if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) {
                    this.subtitles.loadFromFile(input);
                    return;
                }
                const url = URL.createObjectURL(file);
                this.loadUrl(url);
            },

            // --- Recording ---
            async toggleRecord() {
                const btn = $('smp-rec-btn');
                const saveBtn = $('smp-rec-save');
                if (this._rec && this._rec.state === 'recording') {
                    this._rec.stop();
                    btn.classList.remove('recording');
                    saveBtn.style.display = 'inline-flex';
                } else {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        this._rec = new MediaRecorder(stream);
                        this._chunks = [];
                        this._rec.ondataavailable = e => this._chunks.push(e.data);
                        this._rec.onstop = () => {
                            const blob = new Blob(this._chunks, { type: 'audio/ogg; codecs=opus' });
                            this._recUrl = URL.createObjectURL(blob);
                            showToast('Recording ready to save');
                        };
                        this._rec.start();
                        btn.classList.add('recording');
                        saveBtn.style.display = 'none';
                        showToast('Recording started...');
                    } catch(e) {
                        showToast('Microphone access denied');
                    }
                }
            },

            saveRecording() {
                if (this._recUrl) {
                    const a = document.createElement('a');
                    a.href = this._recUrl;
                    a.download = 'recording_' + Date.now() + '.ogg';
                    a.click();
                    showToast('Recording saved');
                }
            },

            // --- Modals & Panels ---
            openCopyAIPromptModal() {
                if (typeof activityManager !== 'undefined') {
                    activityManager.updatePromptSummary();
                } else {
                    this.updateGeneratedPrompt();
                }
                const modal = $('smp-ai-prompt-modal');
                if (modal) modal.style.display = 'flex';
            },

            updateGeneratedPrompt() {
                if (typeof activityManager !== 'undefined') {
                    activityManager.updatePromptSummary();
                } else {
                    const lvl = $('smp-prompt-level') ? $('smp-prompt-level').value : 'B1';
                    const lang = $('smp-prompt-lang') ? $('smp-prompt-lang').value : 'English';
                    const prompt = generateAIPrompt(lvl, 'comprehensive', lang);
                    const el = $('smp-full-ai-prompt');
                    if (el) el.textContent = prompt;
                }
            },

            copyGeneratedPrompt() {
                const txt = $('smp-full-ai-prompt')?.textContent || '';
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(txt).then(() => showToast('AI Prompt copied to clipboard! ⭐'));
                }
            },

            loadJsonFromAiModal() {
                const jsonStr = $('smp-ai-json-input')?.value || '';
                try {
                    const data = JSON.parse(jsonStr);
                    store.set('activities', data);
                    this.closeModal('smp-ai-prompt-modal');
                    showToast('Activities loaded successfully! 🎉');
                    updateProgressUI();
                    renderTranscript();
                } catch(e) {
                    const err = $('smp-ai-json-error');
                    if (err) {
                        err.textContent = 'Invalid JSON: ' + e.message;
                        err.style.display = 'block';
                    }
                }
            },

            launchActiveTimestampActivity() {
                if (!_activeTimestampActivity) return;
                const act = _activeTimestampActivity;
                this.dismissTimestampActivityBanner();
                this.pause();
                const type = act.type || act.activityType || 'flashcard';
                if (type === 'flashcard' || type === 'flexcard' || type === 'picture_vocab' || type === 'idiom_spotlight') {
                    activityRenderers.renderFlashcard(act);
                } else if (type === 'unscramble' || type === 'tense_transformer' || type === 'summary_ordering') {
                    activityRenderers.renderUnscramble(act);
                } else if (type === 'dictation') {
                    activityRenderers.renderDictation(act);
                } else if (type === 'speaking' || type === 'intonation_curve') {
                    activityRenderers.renderSpeaking({ text: act.text || act.term || act.sentence || 'Hello', id: act.id, points: act.points || 15 });
                } else if (type === 'wordmaster') {
                    activityRenderers.renderWordMaster(act);
                } else if (type === 'snowman') {
                    activityRenderers.renderSnowman(act);
                } else if (type === 'dialogue_roleplay' || type === 'dialogue') {
                    activityRenderers.renderDialogue(act);
                } else {
                    activityRenderers.renderQuiz([act]);
                }
            },

            dismissTimestampActivityBanner() {
                const banner = $('smp-act-banner');
                if (!banner) return;
                banner.classList.remove('showing');
                banner.classList.add('hiding');
                setTimeout(() => {
                    banner.style.display = 'none';
                    banner.classList.remove('hiding');
                }, 300);
            },

            loadDemoSample() {
                const sampleActivities = {
                    glossary: [
                        { id: 'g1', timestamp: 2, term: 'Breathtaking', ipa: '/ˈbreθˌteɪ.kɪŋ/', partOfSpeech: 'adjective', level: 'B2', meaning: 'Extremely exciting, beautiful, or surprising.', examples: ['The view from the top of the mountain was breathtaking.'] },
                        { id: 'g2', timestamp: 8, term: 'Serendipity', ipa: '/ˌser.ənˈdɪp.ə.ti/', partOfSpeech: 'noun', level: 'C1', meaning: 'The occurrence of events by chance in a happy or beneficial way.', examples: ['Finding my lost keys was pure serendipity.'] }
                    ],
                    questions: [
                        { id: 'q1', timestamp: 4, type: 'multiple_choice', question: 'What does "Breathtaking" describe?', options: [{ text: 'Something astonishingly beautiful', correct: true }, { text: 'Something boring', correct: false }, { text: 'Something tiny', correct: false }], points: 10 },
                        { id: 'q2', timestamp: 12, type: 'fill_blanks', sentence: 'We experienced pure ___ when we found our dream house.', blanks: ['serendipity'], points: 10 }
                    ],
                    unscramble: { targetSentence: 'Language learning requires consistent daily practice.', words: ['Language', 'learning', 'requires', 'consistent', 'daily', 'practice.'] },
                    wordMaster: { word: 'LEARN', clue: 'Gain knowledge or skills through experience or study' },
                    snowman: { word: 'FLUENT', clue: 'Able to express oneself easily and articulately' },
                    dialogue: { title: 'Ordering Coffee', lines: [{ speaker: 'Speaker A', text: 'Good morning! What would you like today?' }, { speaker: 'Speaker B', text: 'I would like a double espresso with milk, please.' }] }
                };

                const sampleSubtitles = [
                    { start: 0, end: 4, text: "Welcome to the interactive language learning lab demonstration." },
                    { start: 4, end: 9, text: "The view from the top of the mountain was breathtaking." },
                    { start: 9, end: 15, text: "Finding my lost keys in the old drawer was pure serendipity." },
                    { start: 15, end: 20, text: "Consistent daily practice makes language learning enjoyable and effective." }
                ];

                store.set('activities', sampleActivities);
                useSubtitles.load(sampleSubtitles);
                this.closeModal('smp-ai-prompt-modal');
                this.closeModal('smp-activity-library-modal');
                this.closeModal('smp-activity-prompt-modal');

                this.show();
                const ph = $('smp-placeholder');
                if (ph) ph.style.display = 'none';

                store.set('mode', 'transcript');
                applyMode();
                updateProgressUI();
                renderTranscript();

                showToast('Interactive Demo loaded! Subtitles, timeline markers & activities ready. 🎉');
                setTimeout(() => {
                    this.activities.openFlashcard();
                }, 250);
            },

            openJsonImport() { $('smp-json-modal').style.display = 'flex'; },
            openDocUpload() { $('smp-doc-upload-modal').style.display = 'flex'; },
            toggleAnnotationToolbar() {
                const tb = $('smp-annotation-toolbar');
                if (!tb) return;
                const isVisible = tb.style.display === 'flex' || (tb.style.display !== 'none' && tb.style.display !== '');
                if (isVisible) {
                    useAnnotations.close();
                    showToast('Annotation tools hidden');
                } else {
                    tb.style.display = 'flex';
                    useAnnotations.init();
                    const btn = $('smp-anno-toggle-btn');
                    if (btn) btn.classList.add('active');
                    showToast('Annotation tools active');
                }
            },
            openAnnotationToolbar() {
                this.toggleAnnotationToolbar();
            },

            closeModal(id) {
                const el = $(id);
                if (el) el.style.display = 'none';
            },

            showPanel(p) {
                ['transcript', 'progress', 'voice'].forEach(k => {
                    const el = $('smp-' + k + '-panel');
                    if (el) el.style.display = k === p ? 'block' : 'none';
                });
                document.querySelectorAll('.smp-panel-tab').forEach((t, i) => {
                    t.classList.toggle('active', ['transcript', 'progress', 'voice'][i] === p);
                });
            },

            filterTranscript(query) {
                const list = $('smp-transcript-list');
                if (!list) return;
                const q = query.toLowerCase();
                list.querySelectorAll('.smp-transcript-line').forEach(line => {
                    const match = line.textContent.toLowerCase().includes(q);
                    line.style.display = match ? 'flex' : 'none';
                });
                $('smp-transcript-search-clear').style.display = query ? 'block' : 'none';
            },

            clearTranscriptSearch() {
                const inp = $('smp-transcript-search');
                if (inp) { inp.value = ''; this.filterTranscript(''); }
            },

            exportTranscript(fmt = 'txt') {
                const cues = store.get('cues') || [];
                const txt = cues.map(c => '[' + formatTime(c.startTime) + '] ' + c.text).join('\\n');
                const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'transcript.' + fmt;
                a.click();
                showToast('Transcript exported');
            },

            resetProgress() {
                store.set('userProgress', { completed: new Set(), score: 0, total: 0 });
                updateProgressUI();
                showToast('Progress reset');
            },

            // --- Activities Sub-API ---
            activities: {
                manager: (typeof activityManager !== 'undefined') ? activityManager : null,
                renderers: (typeof activityRenderers !== 'undefined') ? activityRenderers : null,

                openLibrary() {
                    if (typeof activityManager !== 'undefined') {
                        activityManager.renderActivityCards();
                    }
                    const modal = $('smp-activity-library-modal');
                    if (modal) modal.style.display = 'flex';
                },

                selectAllActivities() {
                    if (typeof activityManager !== 'undefined') {
                        activityManager.selectAll();
                    }
                },

                deselectAllActivities() {
                    if (typeof activityManager !== 'undefined') {
                        activityManager.deselectAll();
                    }
                },

                setAllCounts(n) {
                    if (typeof activityManager !== 'undefined' && typeof activityDefinitions !== 'undefined') {
                        activityDefinitions.forEach(def => activityManager.setCount(def.id, n));
                    }
                },

                openAIPromptWithSelected() {
                    SMP.openCopyAIPromptModal();
                },

                openSingleModal(id) {
                    // Fallback to open the full prompt with just this item selected
                    if (typeof activityManager !== 'undefined') {
                         activityManager.deselectAll();
                         activityManager.setCount(id, 5);
                         SMP.openCopyAIPromptModal();
                    }
                },

                playDirectDemo(id) {
                    if (typeof activityManager !== 'undefined') {
                        this.playDemo(id);
                    } else {
                        this.playDemo(id);
                    }
                },

                _legacyOpenLibrary() {
                    const grid = $('smp-activity-grid');
                    grid.innerHTML = '';
                    activityDefinitions.forEach(def => {
                        const card = document.createElement('div');
                        card.className = 'smp-activity-card';
                        card.innerHTML = '<i class="fas ' + def.icon + ' smp-ac-icon" style="color:' + def.color + '"></i>' +
                            '<div class="smp-ac-title">' + def.name + '</div>' +
                            '<div class="smp-ac-desc">' + def.description + '</div>' +
                            '<div class="smp-ac-card-actions">' +
                            '<button class="smp-btn-xs" onclick="event.stopPropagation(); SMP.activities.openSetup(\\'' + def.id + '\\')"><i class="fas fa-code"></i> AI Prompt</button>' +
                            '<button class="smp-btn-xs smp-btn-accent" onclick="event.stopPropagation(); SMP.activities.playDemo(\\'' + def.id + '\\')"><i class="fas fa-play"></i> Play Demo</button>' +
                            '</div>';
                        grid.appendChild(card);
                    });
                    $('smp-activity-library-modal').style.display = 'flex';
                },

                setCategory(cat) {
                    if (typeof activityManager !== 'undefined') {
                        activityManager.setFilter(cat);
                    }
                },

                filterLibrary(q) {
                    if (typeof activityManager !== 'undefined') {
                        activityManager.setSearch(q);
                    }
                },

                _currentSetupId: 'flashcard',

                openSetup(id) {
                    const def = activityDefinitions.find(d => d.id === id);
                    if (!def) return;
                    this._currentSetupId = id;
                    $('smp-apm-title').textContent = def.name + ' Setup';
                    $('smp-apm-prompt').textContent = 'Generate a high-quality ' + def.name + ' JSON activity for CEFR B1/B2 level English learners. Schema: { "type": "' + def.id + '", ... }';
                    $('smp-apm-input').value = '';
                    $('smp-activity-prompt-modal').style.display = 'flex';
                    $('smp-activity-library-modal').style.display = 'none';
                },

                copyPrompt() {
                    const text = $('smp-apm-prompt').textContent;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(() => {
                            showToast('Activity prompt copied to clipboard! 📋');
                        });
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        ta.remove();
                        showToast('Activity prompt copied to clipboard! 📋');
                    }
                },

                loadFromPrompt() {
                    const val = $('smp-apm-input').value.trim();
                    if (!val) {
                        showToast('Please paste valid JSON or click Play Instant Demo');
                        return;
                    }
                    try {
                        let jsonStr = val;
                        if (jsonStr.indexOf('\`\`\`json') !== -1) jsonStr = jsonStr.split('\`\`\`json')[1].split('\`\`\`')[0].trim();
                        else if (jsonStr.indexOf('\`\`\`') !== -1) jsonStr = jsonStr.split('\`\`\`')[1].split('\`\`\`')[0].trim();
                        const json = JSON.parse(jsonStr);
                        const acts = store.get('activities') || {};
                        if (json.type === 'flashcard' || json.glossary) {
                            acts.glossary = acts.glossary || [];
                            if (Array.isArray(json.glossary)) acts.glossary.push(...json.glossary);
                            else if (json.term) acts.glossary.push(json);
                            else if (Array.isArray(json)) acts.glossary.push(...json);
                        } else if (json.type === 'multiple_choice' || json.questions) {
                            acts.questions = acts.questions || [];
                            if (Array.isArray(json.questions)) acts.questions.push(...json.questions);
                            else if (json.question) acts.questions.push(json);
                            else if (Array.isArray(json)) acts.questions.push(...json);
                        } else if (json.unscramble) {
                            acts.unscramble = json.unscramble;
                        } else if (json.wordMaster || json.wordmaster) {
                            acts.wordMaster = json.wordMaster || json.wordmaster;
                        } else if (json.snowman) {
                            acts.snowman = json.snowman;
                        } else if (json.dialogue) {
                            acts.dialogue = json.dialogue;
                        } else {
                            Object.assign(acts, json);
                        }
                        store.set('activities', acts);
                        $('smp-activity-prompt-modal').style.display = 'none';
                        showToast('Activity loaded successfully! 🎉');
                        updateProgressUI();
                        renderTranscript();
                    } catch(e) {
                        alert('Invalid JSON format: ' + e.message);
                    }
                },

                playCurrentDemo() {
                    $('smp-activity-prompt-modal').style.display = 'none';
                    this.playDemo(this._currentSetupId || 'flashcard');
                },

                handleMatchDrop(e, targetEl, qi, targetPi) {
                    e.preventDefault();
                    const sourcePi = parseInt(e.dataTransfer.getData('text'), 10);
                    if (isNaN(sourcePi)) return;
                    if (sourcePi === targetPi) {
                        targetEl.style.background = 'rgba(16, 185, 129, 0.2)';
                        targetEl.style.borderColor = '#10b981';
                        targetEl.innerHTML += ' ✅';
                        showToast('Matched correctly! 🎯');
                    } else {
                        targetEl.style.background = 'rgba(239, 68, 68, 0.2)';
                        targetEl.style.borderColor = '#ef4444';
                        showToast('Not quite, try matching another pair!');
                    }
                },

                playDemo(id) {
                    $('smp-activity-library-modal').style.display = 'none';
                    $('smp-activity-prompt-modal').style.display = 'none';
                    SMP.show();
                    const ph = $('smp-placeholder');
                    if (ph) ph.style.display = 'none';

                    if (id === 'flashcard' || id === 'flexcard' || id === 'picture_vocab') {
                        activityRenderers.renderFlashcard({ term: 'Perseverance', ipa: '/ˌpɜː.sɪˈvɪə.rəns/', form: 'Noun', level: 'CEFR B2', meaning: 'Persistence in doing something despite difficulty or delay in achieving success.', examples: ['Through dedication and perseverance, she achieved English fluency.', 'Perseverance is essential when overcoming language learning challenges.'] });
                    } else if (id === 'idiom_spotlight' || id === 'collocation_wheel') {
                        activityRenderers.renderFlashcard({ term: 'Break the ice', ipa: '/breɪk ði aɪs/', form: 'Idiomatic Expression', level: 'CEFR B1', meaning: 'To make people feel more relaxed and comfortable in a social setting or meeting.', examples: ['He told an amusing story to break the ice at the start of the conference.', 'Icebreaker activities help students feel confident speaking.'] });
                    } else if (id === 'unscramble' || id === 'tense_transformer') {
                        activityRenderers.renderUnscramble({ targetSentence: 'Consistent practice makes language learning enjoyable and effective.', words: ['Consistent', 'practice', 'makes', 'language', 'learning', 'enjoyable', 'and', 'effective.'] });
                    } else if (id === 'dictation') {
                        activityRenderers.renderDictation({ sentence: 'Listening carefully to authentic native speakers dramatically enhances pronunciation.' });
                    } else if (id === 'speaking' || id === 'intonation_curve') {
                        activityRenderers.renderSpeaking({ text: 'Consistency and active practice are the keys to fluency.', id: 'spk_demo', points: 20 });
                    } else if (id === 'minimal_pairs') {
                        activityRenderers.renderQuiz([
                            { id: 'mp_demo_1', type: 'multiple_choice', question: 'Minimal Pairs Audio Challenge: Which word contains the long vowel sound /iː/?', options: [{ text: 'Sheep /ʃiːp/ (long vowel)', correct: true }, { text: 'Ship /ʃɪp/ (short vowel)', correct: false }, { text: 'Chip /tʃɪp/ (short vowel)', correct: false }], points: 10 }
                        ]);
                    } else if (id === 'wordmaster') {
                        activityRenderers.renderWordMaster({ word: 'VOCAB', clue: 'Short for vocabulary; the essential building blocks of spoken and written communication.' });
                    } else if (id === 'snowman') {
                        activityRenderers.renderSnowman({ word: 'GRAMMAR', clue: 'The structural rules and principles governing language expression.' });
                    } else if (id === 'dialogue_roleplay') {
                        activityRenderers.renderDialogue({ title: 'Travel Booking at Airport', lines: [{ speaker: 'Speaker A', text: 'Good morning! Where would you like to travel today?' }, { speaker: 'Speaker B', text: 'I am looking for a direct flight to Tokyo, Japan.' }, { speaker: 'Speaker A', text: 'Window or aisle seat for your flight?' }, { speaker: 'Speaker B', text: 'A window seat near the front would be perfect, thank you!' }] });
                    } else if (id === 'fill_blanks' || id === 'madlibs') {
                        activityRenderers.renderQuiz([
                            { id: 'fb_demo_1', type: 'fill_blanks', sentence: 'Every morning she drinks a cup of ___ before heading to ___.', blanks: ['coffee', 'work'], points: 15 }
                        ]);
                    } else if (id === 'error_detective') {
                        activityRenderers.renderQuiz([
                            { id: 'err_demo_1', type: 'multiple_choice', question: 'Detect the grammatical error: "She have been living in London since five years."', options: [{ text: '"have" should be "has" AND "since" should be "for"', correct: true }, { text: '"living" should be "lived"', correct: false }, { text: '"London" needs an article "the London"', correct: false }], points: 15 }
                        ]);
                    } else if (id === 'matching' || id === 'speed_match') {
                        activityRenderers.renderQuiz([
                            { id: 'match_demo_1', type: 'matching', question: 'Match the English idioms with their correct definitions:', pairs: [{ term: 'Under the weather', definition: 'Feeling slightly sick or unwell' }, { term: 'Hit the sack', definition: 'Go to sleep' }, { term: 'Spill the beans', definition: 'Reveal a secret accidentally' }], points: 20 }
                        ]);
                    } else if (id === 'quiz_show') {
                        activityRenderers.renderQuiz([
                            { id: 'qs_1', type: 'multiple_choice', question: '[Category: Vocabulary • 200 pts] What does "Ubiquitous" mean?', options: [{ text: 'Found or existing everywhere simultaneously', correct: true }, { text: 'Extremely rare and endangered', correct: false }, { text: 'Very quiet and secretive', correct: false }], points: 20 },
                            { id: 'qs_2', type: 'multiple_choice', question: '[Category: Grammar • 300 pts] Which sentence uses the subjunctive mood correctly?', options: [{ text: 'I recommend that she be invited to the conference.', correct: true }, { text: 'I recommend that she is invited to the conference.', correct: false }, { text: 'I recommend that she was invited to the conference.', correct: false }], points: 30 }
                        ]);
                    } else if (id === 'true_false') {
                        activityRenderers.renderQuiz([
                            { id: 'tf_demo_1', type: 'true_false', question: 'Is "Bilingual" a person who can speak two languages fluently and naturally?', options: [{ text: 'True', correct: true }, { text: 'False', correct: false }], points: 10 }
                        ]);
                    } else if (id === 'summary_ordering') {
                        activityRenderers.renderUnscramble({ targetSentence: 'First introduce yourself. Next explain the agenda. Finally summarize action items.', words: ['First introduce yourself.', 'Next explain the agenda.', 'Finally summarize action items.'] });
                    } else {
                        activityRenderers.renderQuiz([
                            { id: 'mc_demo_1', type: 'multiple_choice', question: 'Which word is an accurate synonym for "Delighted"?', options: [{ text: 'Joyful & Thrilled', correct: true }, { text: 'Drowsy & Tired', correct: false }, { text: 'Confused & Lost', correct: false }], points: 10 },
                            { id: 'mc_demo_2', type: 'multiple_choice', question: 'What is the past participle of the verb "Write"?', options: [{ text: 'Written', correct: true }, { text: 'Wrote', correct: false }, { text: 'Writing', correct: false }], points: 10 }
                        ]);
                    }
                },

                openFlashcard() {
                    const acts = store.get('activities');
                    if (acts && acts.glossary && acts.glossary.length) {
                        activityRenderers.renderFlashcard(acts.glossary);
                    } else {
                        this.playDemo('flashcard');
                    }
                },

                openQuiz() {
                    const acts = store.get('activities');
                    if (acts && acts.questions && acts.questions.length) {
                        activityRenderers.renderQuiz(acts.questions);
                    } else {
                        this.playDemo('multiple_choice');
                    }
                },

                openDictation() {
                    this.playDemo('dictation');
                },

                openFlashcardForLine(idx) {
                    const acts = store.get('activities');
                    const item = acts?.glossary?.find(g => g.lineIndex === idx) || acts?.glossary?.[0];
                    if (item) activityRenderers.renderFlashcard(item);
                    else this.playDemo('flashcard');
                },

                openQuizForLine(idx) {
                    const acts = store.get('activities');
                    const q = acts?.questions?.filter(q => q.lineIndex === idx) || acts?.questions;
                    if (q && q.length) activityRenderers.renderQuiz(q);
                    else this.playDemo('multiple_choice');
                },

                flipFlashcard() {
                    $('smp-fc-flip-card').classList.toggle('flipped');
                },

                nextFlashcard() {
                    const total = activityRenderers._currentFlashcards.length;
                    if (total <= 1) return;
                    activityRenderers._currentFlashcardIdx = (activityRenderers._currentFlashcardIdx + 1) % total;
                    activityRenderers._showFlashcardAt(activityRenderers._currentFlashcardIdx);
                },

                prevFlashcard() {
                    const total = activityRenderers._currentFlashcards.length;
                    if (total <= 1) return;
                    activityRenderers._currentFlashcardIdx = (activityRenderers._currentFlashcardIdx - 1 + total) % total;
                    activityRenderers._showFlashcardAt(activityRenderers._currentFlashcardIdx);
                },

                startPractice() {
                    const term = $('smp-fc-term').textContent;
                    const meaning = $('smp-fc-meaning').textContent;
                    SMP.overlays.close('flashcard');
                    activityRenderers.renderQuiz([
                        { id: 'ccq_' + Date.now(), type: 'true_false', question: 'Does "' + term + '" mean "' + meaning + '"?', options: [{ text: 'True', correct: true }, { text: 'False', correct: false }], points: 5 }
                    ]);
                },

                handleQuizChoice(btn, qi, isCorrect, qid, points) {
                    const parent = btn.parentElement;
                    parent.querySelectorAll('.smp-quiz-opt-btn').forEach(b => {
                        b.disabled = true;
                    });
                    btn.classList.add(isCorrect ? 'correct' : 'incorrect');
                    const fb = $('smp-qfb' + qi);
                    fb.className = 'smp-quiz-feedback ' + (isCorrect ? 'correct' : 'incorrect');
                    fb.textContent = isCorrect ? '✓ Correct! Well done.' : '✗ Incorrect. Try reviewing this concept!';
                    fb.style.display = 'block';
                    if (isCorrect) markCompleted(qid, points);
                },

                checkFillBlanks(qi, qid, points) {
                    const inputs = document.querySelectorAll('.smp-fitb-input[data-qi="' + qi + '"]');
                    let allCorrect = true;
                    inputs.forEach(inp => {
                        const expected = (inp.dataset.answer || '').trim().toLowerCase();
                        const val = inp.value.trim().toLowerCase();
                        if (val === expected && val !== '') {
                            inp.style.borderColor = '#10b981';
                            inp.style.background = 'rgba(16, 185, 129, 0.1)';
                        } else {
                            inp.style.borderColor = '#ef4444';
                            inp.style.background = 'rgba(239, 68, 68, 0.1)';
                            allCorrect = false;
                        }
                    });
                    const fb = $('smp-qfb' + qi);
                    fb.className = 'smp-quiz-feedback ' + (allCorrect ? 'correct' : 'incorrect');
                    fb.textContent = allCorrect ? '✓ All blanks correct!' : '✗ Some answers need checking.';
                    fb.style.display = 'block';
                    if (allCorrect) markCompleted(qid, points);
                },

                checkUnscramble() {
                    const targetZone = $('smp-unscramble-target-zone');
                    const words = Array.from(targetZone.children).map(c => c.textContent.trim());
                    const constructed = words.join(' ');
                    const target = activityRenderers._unscrambleData?.targetSentence || '';
                    const isCorrect = constructed.toLowerCase().replace(/[.,!?]/g, '') === target.toLowerCase().replace(/[.,!?]/g, '');

                    const fb = $('smp-unscramble-feedback');
                    fb.className = 'smp-quiz-feedback ' + (isCorrect ? 'correct' : 'incorrect');
                    fb.textContent = isCorrect ? '🎉 Perfect sentence structure!' : '✗ Not quite right. Target: "' + target + '"';
                    fb.style.display = 'block';
                    if (isCorrect) markCompleted('unscramble_' + target, 15);
                },

                resetUnscramble() {
                    if (activityRenderers._unscrambleData) {
                        activityRenderers.renderUnscramble(activityRenderers._unscrambleData);
                    }
                },

                startSpeaking(text, qid, points) {
                    activityRenderers.renderSpeaking({ text, id: qid, points });
                },

                playDictationAudio() {
                    activityRenderers.playDictationAudio(1.0);
                },

                playDictationAudioSlow() {
                    activityRenderers.playDictationAudio(0.75);
                },

                checkDictation() {
                    const input = $('smp-dictation-input').value.trim().toLowerCase();
                    const expected = (activityRenderers._dictationData?.sentence || '').trim().toLowerCase();
                    const clean = s => s.replace(/[^a-z0-9]/g, ' ').replace(/\\s+/g, ' ').trim();
                    const isMatch = clean(input) === clean(expected);

                    const fb = $('smp-dictation-feedback');
                    fb.className = 'smp-quiz-feedback ' + (isMatch ? 'correct' : 'incorrect');
                    fb.textContent = isMatch ? '✓ Excellent spelling & listening precision!' : '✗ Close! Correct: "' + (activityRenderers._dictationData?.sentence || '') + '"';
                    fb.style.display = 'block';
                    if (isMatch) markCompleted('dictation_' + expected, 15);
                },

                submitWordMasterGuess() {
                    const inp = $('smp-wm-input');
                    const guess = inp.value.trim().toUpperCase();
                    const data = activityRenderers._wordMasterData;
                    if (!data || guess.length !== data.word.length) {
                        showToast('Enter a ' + data.word.length + '-letter word');
                        return;
                    }

                    const row = data.attempts;
                    for (let c = 0; c < data.word.length; c++) {
                        const tile = $('wm-tile-' + row + '-' + c);
                        const letter = guess[c];
                        tile.textContent = letter;
                        if (letter === data.word[c]) {
                            tile.style.background = '#10b981';
                            tile.style.color = '#fff';
                        } else if (data.word.includes(letter)) {
                            tile.style.background = '#f59e0b';
                            tile.style.color = '#fff';
                        } else {
                            tile.style.background = '#6b7280';
                            tile.style.color = '#fff';
                        }
                    }

                    data.attempts++;
                    inp.value = '';

                    if (guess === data.word) {
                        const fb = $('smp-wm-feedback');
                        fb.className = 'smp-quiz-feedback correct';
                        fb.textContent = '🎉 Awesome! You guessed the word: ' + data.word;
                        fb.style.display = 'block';
                        markCompleted('wm_' + data.word, 20);
                    } else if (data.attempts >= data.maxAttempts) {
                        const fb = $('smp-wm-feedback');
                        fb.className = 'smp-quiz-feedback incorrect';
                        fb.textContent = 'WordMaster: The word was ' + data.word;
                        fb.style.display = 'block';
                    }
                },

                guessSnowmanLetter(letter, btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.4';
                    const data = activityRenderers._snowmanData;
                    if (!data) return;

                    if (data.word.includes(letter)) {
                        data.guessedLetters.add(letter);
                    } else {
                        data.wrongGuesses++;
                    }
                    activityRenderers._updateSnowmanUI();
                },

                playFullDialogue() {
                    const lines = activityRenderers._dialogueData?.lines || [];
                    let delay = 0;
                    lines.forEach(l => {
                        setTimeout(() => useSpeechSynthesis.speak(l.text), delay);
                        delay += 3500;
                    });
                },

                stepDialogue() {
                    const data = activityRenderers._dialogueData;
                    if (!data || !data.lines.length) return;
                    const line = data.lines[data.currentStep % data.lines.length];
                    useSpeechSynthesis.speak(line.text);
                    data.currentStep++;
                }
            },

            // --- Overlays API ---
            overlays: {
                close(name) {
                    const map = {
                        flashcard: 'smp-flashcard-overlay',
                        quiz: 'smp-quiz-overlay',
                        speaking: 'smp-speaking-overlay',
                        unscramble: 'smp-unscramble-overlay',
                        dictation: 'smp-dictation-overlay',
                        wordmaster: 'smp-wordmaster-overlay',
                        snowman: 'smp-snowman-overlay',
                        dialogue: 'smp-dialogue-overlay',
                        json: 'smp-json-modal',
                        docUpload: 'smp-doc-upload-modal'
                    };
                    const id = map[name];
                    if (id) {
                        const el = $(id);
                        if (el) el.style.display = 'none';
                    }
                    useSpeechRecognition.stop();
                }
            },

            // --- Annotations API ---
            annotations: useAnnotations,
            slides: slideshowController,
            doc: documentController,
            screenShare: useScreenShare,
            speech: {
                speak(text, speed = 1.0) { useSpeechSynthesis.speak(text, speed); },
                setVoice(idx) { useSpeechSynthesis.setVoice(idx); },
                startRecognition() {
                    const target = $('smp-speaking-prompt').textContent;
                    useSpeechRecognition.start(target, (res) => {
                        if (res.similarity >= 70) {
                            markCompleted('speak_' + target, 15);
                        }
                    });
                }
            },

            init(cfg) {
                this.show();
                if (cfg?.src) this.loadUrl(cfg.src);
                if (cfg?.subtitles) useSubtitles.load(cfg.subtitles);
                if (cfg?.slides) slideshowController.init(cfg.slides);
                if (cfg?.activities) {
                    store.set('activities', cfg.activities);
                    updateProgressUI();
                    renderTranscript();
                }
            }
        };

        // ==================== EVENT BINDINGS & DRAGGING ==================== //
        function applyTheme() {
            const th = store.get('theme');
            container.classList.toggle('smp-dark', th === 'dark');
            $('smp-theme-toggle').innerHTML = th === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }

        function applyMode() {
            const m = store.get('mode');
            $('smp-mode-subtitle').classList.toggle('active', m === 'subtitle');
            $('smp-mode-transcript').classList.toggle('active', m === 'transcript');
            rightPanel.style.display = m === 'transcript' ? 'flex' : 'none';
            if (m === 'transcript') renderTranscript();
        }

        function showToast(msg) {
            const t = $('smp-toast');
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2500);
        }

        videoEl?.addEventListener('timeupdate', onTimeUpdate);
        audioEl?.addEventListener('timeupdate', onTimeUpdate);
        videoEl?.addEventListener('ended', () => { store.set('isPlaying', false); SMP._updatePlayBtn(); });
        audioEl?.addEventListener('ended', () => { store.set('isPlaying', false); SMP._updatePlayBtn(); });

        progressInput?.addEventListener('input', (e) => {
            if (activeMedia && activeMedia.duration) {
                activeMedia.currentTime = (e.target.value / 1000) * activeMedia.duration;
            }
        });

        speedInput?.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (activeMedia) activeMedia.playbackRate = v;
            speedVal.textContent = v.toFixed(1) + 'x';
        });

        volumeInput?.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (videoEl) videoEl.volume = v;
            if (audioEl) audioEl.volume = v;
        });

        // Window Dragging
        (function() {
            const header = $('smp-header');
            let isDragging = false, startX, startY, origX, origY;

            header.addEventListener('pointerdown', (e) => {
                if (e.target.closest('button, input, select, textarea, label')) return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                origX = container.offsetLeft;
                origY = container.offsetTop;
                header.setPointerCapture(e.pointerId);
            });

            header.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                container.style.left = (origX + e.clientX - startX) + 'px';
                container.style.top = (origY + e.clientY - startY) + 'px';
            });

            header.addEventListener('pointerup', () => { isDragging = false; });
        })();

        // Window & Edge Resizing
        (function() {
            let isResizing = false;
            let currentDir = 'br';
            let startX, startY, startW, startH, startLeft, startTop;

            const resizers = container.querySelectorAll('.smp-resizer');
            resizers.forEach(resizer => {
                resizer.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isResizing = true;
                    currentDir = resizer.dataset.dir || 'br';
                    startX = e.clientX;
                    startY = e.clientY;
                    startW = container.offsetWidth;
                    startH = container.offsetHeight;
                    startLeft = container.offsetLeft;
                    startTop = container.offsetTop;

                    resizer.setPointerCapture(e.pointerId);
                    document.body.style.userSelect = 'none';
                });

                resizer.addEventListener('pointermove', (e) => {
                    if (!isResizing) return;
                    e.preventDefault();
                    e.stopPropagation();

                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    const minW = 480;
                    const minH = 360;
                    const maxW = window.innerWidth - 20;
                    const maxH = window.innerHeight - 20;

                    if (currentDir.includes('r')) {
                        const newW = Math.min(maxW, Math.max(minW, startW + dx));
                        container.style.width = newW + 'px';
                    }
                    if (currentDir.includes('b')) {
                        const newH = Math.min(maxH, Math.max(minH, startH + dy));
                        container.style.height = newH + 'px';
                    }
                    if (currentDir.includes('l')) {
                        const newW = Math.min(maxW, Math.max(minW, startW - dx));
                        const actualDx = startW - newW;
                        container.style.width = newW + 'px';
                        container.style.left = (startLeft + actualDx) + 'px';
                    }
                    if (currentDir.includes('t')) {
                        const newH = Math.min(maxH, Math.max(minH, startH - dy));
                        const actualDy = startH - newH;
                        container.style.height = newH + 'px';
                        container.style.top = (startTop + actualDy) + 'px';
                    }

                    if (useAnnotations && typeof useAnnotations.resize === 'function') {
                        useAnnotations.resize();
                    }
                });

                const stopResize = () => {
                    if (isResizing) {
                        isResizing = false;
                        document.body.style.userSelect = '';
                        if (useAnnotations && typeof useAnnotations.resize === 'function') {
                            useAnnotations.resize();
                        }
                    }
                };

                resizer.addEventListener('pointerup', stopResize);
                resizer.addEventListener('pointercancel', stopResize);
            });
        })();

        // Global key shortcuts
        container.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === ' ') { e.preventDefault(); SMP.togglePlay(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); SMP.seekRelative(-5); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); SMP.seekRelative(5); }
            else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); SMP.subtitles.repeatCurrentCue(); }
            else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); SMP.toggleLoop(); }
            else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); SMP.toggleFullscreen(); }
            else if (e.key === 'Escape') {
                document.querySelectorAll('.smp-overlay, .smp-modal').forEach(m => m.style.display = 'none');
                useSpeechRecognition.stop();
            }
        });

        // ==================== DRAG TO MOVE (by header) ====================
        (function () {
            const hdr = document.getElementById('smp-header');
            if (!hdr) return;
            let dragState = null;

            hdr.addEventListener('pointerdown', (e) => {
                if (container.classList.contains('fullscreen')) return;
                const t = e.target;
                if (t.closest && t.closest('button, input, select, textarea, .smp-toggle-group, .smp-win-controls, .smp-sub-settings-btn')) return;
                e.preventDefault();
                dragState = {
                    startX: e.clientX, startY: e.clientY,
                    origLeft: container.offsetLeft, origTop: container.offsetTop,
                    moved: false
                };
            });
            hdr.addEventListener('pointermove', (e) => {
                if (!dragState) return;
                e.preventDefault();
                const dx = e.clientX - dragState.startX;
                const dy = e.clientY - dragState.startY;
                if (Math.abs(dx) + Math.abs(dy) > 3) dragState.moved = true;
                const r = container.getBoundingClientRect();
                let left = dragState.origLeft + dx;
                let top = dragState.origTop + dy;
                left = Math.max(-r.width + 80, Math.min(left, window.innerWidth - 40));
                top = Math.max(0, Math.min(top, window.innerHeight - 40));
                container.style.left = left + 'px';
                container.style.top = top + 'px';
                container.style.transform = 'none';
            });
            function endDrag() { dragState = null; }
            hdr.addEventListener('pointerup', endDrag);
            hdr.addEventListener('pointercancel', endDrag);
            hdr.addEventListener('dblclick', () => {
                if (!container.classList.contains('fullscreen')) SMP.centerPlayer();
            });
        })();

        // Global compatibility aliases
        window.openSuperPlayer = (cfg) => SMP.init(cfg);
        window.playInSuperMediaPlayer = (url, title) => { SMP.show(); SMP.loadUrl(url); if (title) showToast('Playing: ' + title); };
        window.closeSmp = () => SMP.close();
        window.toggleSmpPlay = () => SMP.togglePlay();

        // Initial setup
        applyTheme();
        applyMode();
        useSpeechSynthesis.init();
    `;
};
