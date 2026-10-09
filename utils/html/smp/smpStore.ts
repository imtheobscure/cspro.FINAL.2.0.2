export const getSmpStoreJs = (): string => {
    return `
    // ==================== REACTIVE STORE ==================== //
    const store = {
        _state: {
            currentTime: 0,
            duration: 0,
            isPlaying: false,
            mode: 'subtitle', // 'subtitle' | 'transcript'
            theme: 'light', // 'light' | 'dark'
            activeTranscriptLine: -1,
            cues: [],
            subtitlesLoaded: false,
            subtitleSettings: {
                size: 'medium', // 'small' | 'medium' | 'large'
                position: 'bottom', // 'bottom' | 'top'
                wordClick: true
            },
            activities: null, // Loaded JSON activities
            slides: [],
            currentSlide: 0,
            documentUrl: null,
            speechRate: 1.0,
            selectedVoice: null,
            userProgress: {
                completed: new Set(),
                score: 0,
                total: 0
            }
        },
        _listeners: [],

        get(key) {
            return this._state[key];
        },

        set(key, value) {
            this._state[key] = value;
            this._notify(key, value);
        },

        update(fn) {
            fn(this._state);
            this._notify('*', this._state);
        },

        subscribe(fn) {
            this._listeners.push(fn);
            return () => {
                this._listeners = this._listeners.filter(l => l !== fn);
            };
        },

        _notify(key, value) {
            this._listeners.forEach(fn => fn(key, value));
        }
    };

    // ==================== SUBTITLE PARSER & HOOK ==================== //
    const useSubtitles = {
        _cues: [],

        load(data) {
            if (typeof data === 'string') {
                this._cues = this._parse(data);
            } else if (Array.isArray(data)) {
                this._cues = data.map((c, i) => {
                    const startRaw = c.startTime !== undefined ? c.startTime : c.start;
                    const endRaw = c.endTime !== undefined ? c.endTime : c.end;
                    return {
                        id: c.id || ('cue_' + i),
                        startTime: typeof startRaw === 'number' ? startRaw : this._parseTime(startRaw || '0'),
                        endTime: typeof endRaw === 'number' ? endRaw : this._parseTime(endRaw || '0'),
                        text: c.text || ''
                    };
                });
            }
            store.set('cues', this._cues);
            store.set('subtitlesLoaded', this._cues.length > 0);
            if (typeof renderTranscript === 'function') renderTranscript();
            if (typeof renderTimelineMarkers === 'function') renderTimelineMarkers();
            if (typeof showToast === 'function') showToast('Loaded ' + this._cues.length + ' subtitle cues');
        },

        _parse(text) {
            text = text.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
            if (text.includes('-->')) {
                return this._parseVttOrSrt(text);
            }
            try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    return parsed.map((c, i) => ({
                        id: c.id || ('cue_' + i),
                        startTime: typeof c.startTime === 'number' ? c.startTime : this._parseTime(c.startTime),
                        endTime: typeof c.endTime === 'number' ? c.endTime : this._parseTime(c.endTime),
                        text: c.text || ''
                    }));
                }
            } catch(e) {}
            return [];
        },

        _parseVttOrSrt(content) {
            const lines = content.split('\\n');
            const cues = [];
            let i = 0;
            if (lines[0] && lines[0].includes('WEBVTT')) i = 1;

            while (i < lines.length) {
                let line = lines[i].trim();
                if (!line) { i++; continue; }

                let id = 'cue_' + cues.length;
                if (!line.includes('-->')) {
                    id = line;
                    i++;
                    if (i < lines.length) line = lines[i].trim();
                }

                if (line.includes('-->')) {
                    const parts = line.split('-->');
                    const start = this._parseTime(parts[0].trim().split(' ')[0]);
                    const end = this._parseTime(parts[1].trim().split(' ')[0]);
                    i++;
                    const textLines = [];
                    while (i < lines.length && lines[i].trim() !== '') {
                        textLines.push(lines[i].trim());
                        i++;
                    }
                    const text = textLines.join(' ')
                        .replace(/<[^>]+>/g, '') // remove HTML formatting tags
                        .replace(/\\{\\\\an\\d\\}/g, ''); // remove SSA position tags

                    if (text) {
                        cues.push({ id, startTime: start, endTime: end, text });
                    }
                } else {
                    i++;
                }
            }
            return cues;
        },

        _parseTime(tStr) {
            if (!tStr) return 0;
            tStr = tStr.replace(',', '.');
            const parts = tStr.split(':');
            if (parts.length === 3) {
                return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
            } else if (parts.length === 2) {
                return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
            }
            return parseFloat(tStr) || 0;
        },

        _formatTime(sec, isSrt = false) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = Math.floor(sec % 60);
            const ms = Math.floor((sec % 1) * 1000);
            const pad = (n, z = 2) => String(n).padStart(z, '0');
            const delim = isSrt ? ',' : '.';
            return pad(h) + ':' + pad(m) + ':' + pad(s) + delim + pad(ms, 3);
        },

        getCurrentCue(time) {
            return this._cues.findIndex(c => time >= c.startTime && time <= c.endTime);
        },

        updateSubtitleDisplay(time) {
            const subDisplay = $('smp-subtitle-display');
            const textWrapper = $('smp-sub-text-wrapper');
            const actionBar = $('smp-sub-action-bar');
            if (!subDisplay || !textWrapper) return;

            const cueIdx = this.getCurrentCue(time);
            if (cueIdx >= 0 && this._cues[cueIdx]) {
                const cue = this._cues[cueIdx];
                const settings = store.get('subtitleSettings') || {};
                
                if (settings.wordClick) {
                    const words = cue.text.split(/(\\s+)/);
                    textWrapper.innerHTML = words.map(w => {
                        if (/^\\s+$/.test(w)) return w;
                        const cleanWord = w.replace(/[^a-zA-Z0-9'\\-]/g, '');
                        return '<span class="smp-sub-word" data-word="' + activityRenderers._escHtml(cleanWord) + '" onclick="SMP.subtitles.onWordClick(event, this.dataset.word)">' + activityRenderers._escHtml(w) + '</span>';
                    }).join('');
                } else {
                    textWrapper.textContent = cue.text;
                }

                subDisplay.style.display = 'block';
                if (actionBar) actionBar.style.display = 'flex';
                
                // Show activity icon if cue has activities
                const activities = store.get('activities');
                const activityIcons = $('smp-activity-icons');
                if (activities && activityIcons) {
                    const hasGlossary = (activities.glossary || []).some(g => g.timestamp >= cue.startTime && g.timestamp <= cue.endTime);
                    const hasQuestions = (activities.questions || []).some(q => q.timestamp >= cue.startTime && q.timestamp <= cue.endTime);
                    activityIcons.dataset.cueIdx = cueIdx;
                    activityIcons.style.display = (hasGlossary || hasQuestions) ? 'flex' : 'none';
                    $('smp-icon-flashcard').style.display = hasGlossary ? 'flex' : 'none';
                    $('smp-icon-quiz').style.display = hasQuestions ? 'flex' : 'none';
                }
            } else {
                subDisplay.style.display = 'none';
                if (actionBar) actionBar.style.display = 'none';
                const activityIcons = $('smp-activity-icons');
                if (activityIcons) activityIcons.style.display = 'none';
            }
        },

        export(format = 'srt') {
            const cues = store.get('cues') || [];
            if (!cues.length) { showToast('No subtitles to export'); return; }
            let out = '';
            if (format === 'vtt') {
                out = 'WEBVTT\\n\\n' + cues.map((c, i) => (i + 1) + '\\n' + this._formatTime(c.startTime) + ' --> ' + this._formatTime(c.endTime) + '\\n' + c.text + '\\n').join('\\n');
            } else {
                out = cues.map((c, i) => (i + 1) + '\\n' + this._formatTime(c.startTime, true) + ' --> ' + this._formatTime(c.endTime, true) + '\\n' + c.text + '\\n').join('\\n');
            }
            const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'subtitles_' + Date.now() + '.' + format;
            a.click();
            showToast('Subtitles exported as ' + format.toUpperCase());
        }
    };
    `;
};
