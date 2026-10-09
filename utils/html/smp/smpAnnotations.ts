export const getSmpAnnotationsJs = (): string => {
    return `
    // ==================== ANNOTATIONS HOOK (MULTI-SURFACE) ==================== //
    const useAnnotations = {
        _canvas: null,
        _ctx: null,
        _laserCanvas: null,
        _laserCtx: null,
        _laserTrail: [],
        _laserTimer: null,
        _tool: 'select',
        _color: '#ef4444',
        _strokeWidth: 4,
        _isDrawing: false,
        _startX: 0,
        _startY: 0,
        _history: [],
        _redoStack: [],
        _snapshot: null,
        _currentStamp: '⭐',

        init(canvasId = 'smp-video-annotation-canvas') {
            this._canvas = document.getElementById(canvasId) || document.getElementById('smp-slide-annotation-canvas') || document.getElementById('smp-doc-annotation-canvas');
            if (!this._canvas) return;
            this._ctx = this._canvas.getContext('2d');
            this._laserCanvas = document.getElementById('smp-laser-canvas');
            if (this._laserCanvas) {
                this._laserCtx = this._laserCanvas.getContext('2d');
            }

            this.resize();
            this._bindEvents();
            this.setTool('select');
        },

        resize() {
            if (!this._canvas) return;
            const parent = this._canvas.parentElement;
            if (!parent) return;

            const w = parent.clientWidth;
            const h = parent.clientHeight;

            if (this._canvas.width !== w || this._canvas.height !== h) {
                // Save current drawing
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this._canvas.width;
                tempCanvas.height = this._canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                if (this._canvas.width > 0 && this._canvas.height > 0) {
                    tempCtx.drawImage(this._canvas, 0, 0);
                }

                this._canvas.width = w;
                this._canvas.height = h;
                if (this._laserCanvas) {
                    this._laserCanvas.width = w;
                    this._laserCanvas.height = h;
                }

                if (tempCanvas.width > 0 && tempCanvas.height > 0) {
                    this._ctx.drawImage(tempCanvas, 0, 0, w, h);
                }
            }
        },

        _bindEvents() {
            if (!this._canvas || this._canvas._hasEvents) return;
            this._canvas._hasEvents = true;

            const getPos = (e) => {
                const rect = this._canvas.getBoundingClientRect();
                return {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            };

            this._canvas.addEventListener('pointerdown', (e) => {
                if (this._tool === 'select') return;
                this._isDrawing = true;
                const pos = getPos(e);
                this._startX = pos.x;
                this._startY = pos.y;

                this._saveState();

                if (this._tool === 'pen' || this._tool === 'highlighter') {
                    this._ctx.beginPath();
                    this._ctx.moveTo(pos.x, pos.y);
                } else if (this._tool === 'stamp') {
                    this._drawStamp(pos.x, pos.y);
                    this._isDrawing = false;
                } else if (this._tool === 'text') {
                    this._promptText(pos.x, pos.y);
                    this._isDrawing = false;
                } else {
                    this._snapshot = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
                }
            });

            window.addEventListener('pointermove', (e) => {
                if (this._tool === 'laser') {
                    const pos = getPos(e);
                    this._addLaserPoint(pos.x, pos.y);
                }
                if (!this._isDrawing) return;
                const pos = getPos(e);

                if (this._tool === 'pen') {
                    this._ctx.strokeStyle = this._color;
                    this._ctx.lineWidth = this._strokeWidth;
                    this._ctx.lineCap = 'round';
                    this._ctx.lineJoin = 'round';
                    this._ctx.lineTo(pos.x, pos.y);
                    this._ctx.stroke();
                } else if (this._tool === 'highlighter') {
                    this._ctx.strokeStyle = this._color + '55'; // 33% opacity
                    this._ctx.lineWidth = this._strokeWidth * 3;
                    this._ctx.lineCap = 'square';
                    this._ctx.lineTo(pos.x, pos.y);
                    this._ctx.stroke();
                } else if (this._tool === 'eraser') {
                    this._ctx.save();
                    this._ctx.globalCompositeOperation = 'destination-out';
                    this._ctx.beginPath();
                    this._ctx.arc(pos.x, pos.y, this._strokeWidth * 3, 0, Math.PI * 2);
                    this._ctx.fill();
                    this._ctx.restore();
                } else if (this._snapshot) {
                    this._ctx.putImageData(this._snapshot, 0, 0);
                    this._ctx.strokeStyle = this._color;
                    this._ctx.lineWidth = this._strokeWidth;

                    if (this._tool === 'rect') {
                        this._ctx.strokeRect(this._startX, this._startY, pos.x - this._startX, pos.y - this._startY);
                    } else if (this._tool === 'circle') {
                        const rx = Math.abs(pos.x - this._startX) / 2;
                        const ry = Math.abs(pos.y - this._startY) / 2;
                        const cx = Math.min(this._startX, pos.x) + rx;
                        const cy = Math.min(this._startY, pos.y) + ry;
                        this._ctx.beginPath();
                        this._ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                        this._ctx.stroke();
                    } else if (this._tool === 'arrow') {
                        this._drawArrow(this._startX, this._startY, pos.x, pos.y);
                    }
                }
            });

            window.addEventListener('pointerup', () => {
                if (this._isDrawing) {
                    this._isDrawing = false;
                    this._snapshot = null;
                }
            });
        },

        _drawArrow(fromX, fromY, toX, toY) {
            const headlen = 14;
            const angle = Math.atan2(toY - fromY, toX - fromX);
            this._ctx.beginPath();
            this._ctx.moveTo(fromX, fromY);
            this._ctx.lineTo(toX, toY);
            this._ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
            this._ctx.moveTo(toX, toY);
            this._ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
            this._ctx.stroke();
        },

        _drawStamp(x, y) {
            this._ctx.font = (this._strokeWidth * 6 + 18) + 'px sans-serif';
            this._ctx.textAlign = 'center';
            this._ctx.textBaseline = 'middle';
            this._ctx.fillText(this._currentStamp, x, y);
        },

        _promptText(x, y) {
            const text = prompt('Enter text note:');
            if (text) {
                this._ctx.font = 'bold ' + (this._strokeWidth * 3 + 14) + 'px sans-serif';
                this._ctx.fillStyle = this._color;
                this._ctx.textAlign = 'left';
                this._ctx.textBaseline = 'top';
                this._ctx.fillText(text, x, y);
            }
        },

        _addLaserPoint(x, y) {
            this._laserTrail.push({ x, y, time: Date.now() });
            if (!this._laserTimer) {
                this._laserTimer = setInterval(() => this._renderLaser(), 30);
            }
        },

        _renderLaser() {
            if (!this._laserCtx) return;
            const now = Date.now();
            this._laserTrail = this._laserTrail.filter(p => now - p.time < 800);

            this._laserCtx.clearRect(0, 0, this._laserCanvas.width, this._laserCanvas.height);
            if (this._laserTrail.length === 0) {
                clearInterval(this._laserTimer);
                this._laserTimer = null;
                return;
            }

            for (let i = 1; i < this._laserTrail.length; i++) {
                const p1 = this._laserTrail[i - 1];
                const p2 = this._laserTrail[i];
                const age = now - p2.time;
                const alpha = Math.max(0, 1 - (age / 800));

                this._laserCtx.beginPath();
                this._laserCtx.strokeStyle = 'rgba(239, 68, 68, ' + alpha + ')';
                this._laserCtx.lineWidth = 6 * alpha;
                this._laserCtx.lineCap = 'round';
                this._laserCtx.moveTo(p1.x, p1.y);
                this._laserCtx.lineTo(p2.x, p2.y);
                this._laserCtx.stroke();
            }
        },

        setTool(tool) {
            if (!this._canvas) {
                this.init();
            }
            this._tool = tool;
            document.querySelectorAll('.smp-anno-btn[data-tool]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tool === tool);
            });

            if (this._canvas) {
                if (tool === 'select') {
                    this._canvas.style.pointerEvents = 'none';
                    if (this._laserCanvas) this._laserCanvas.style.pointerEvents = 'none';
                } else if (tool === 'laser') {
                    this._canvas.style.pointerEvents = 'none';
                    if (this._laserCanvas) this._laserCanvas.style.pointerEvents = 'auto';
                } else {
                    this._canvas.style.pointerEvents = 'auto';
                    if (this._laserCanvas) this._laserCanvas.style.pointerEvents = 'none';
                }
            }
        },

        setColor(color) {
            this._color = color;
            const colorInput = $('smp-anno-color');
            if (colorInput) colorInput.value = color;
            document.querySelectorAll('.smp-cp-dot').forEach(dot => {
                dot.classList.toggle('active', dot.style.background === color);
            });
        },

        setStroke(width) {
            this._strokeWidth = parseInt(width, 10);
            const valEl = $('smp-stroke-val');
            if (valEl) valEl.textContent = width + 'px';
        },

        setStamp(emoji) {
            this._currentStamp = emoji;
            this.setTool('stamp');
            const menu = $('smp-stamp-menu');
            if (menu) menu.style.display = 'none';
            showToast('Stamp set: ' + emoji);
        },

        toggleStampMenu() {
            const menu = $('smp-stamp-menu');
            if (menu) menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
        },

        addSticky() {
            const container = $('smp-screen');
            if (!container) return;

            const note = document.createElement('div');
            note.className = 'smp-sticky-note';
            note.style.left = '50px';
            note.style.top = '50px';

            note.innerHTML = '<div class="smp-sticky-header">' +
                '<span><i class="fas fa-sticky-note"></i> Note</span>' +
                '<button onclick="this.closest(\\'.smp-sticky-note\\').remove()" style="background:none;border:none;cursor:pointer;font-weight:bold;">&times;</button>' +
                '</div>' +
                '<textarea class="smp-sticky-textarea" rows="4" placeholder="Type notes here..."></textarea>';

            // Make sticky note draggable
            let isDragging = false, startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
            const header = note.querySelector('.smp-sticky-header');

            header.addEventListener('pointerdown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialLeft = note.offsetLeft;
                initialTop = note.offsetTop;
                note.setPointerCapture(e.pointerId);
            });

            note.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                note.style.left = Math.max(0, initialLeft + dx) + 'px';
                note.style.top = Math.max(0, initialTop + dy) + 'px';
            });

            note.addEventListener('pointerup', () => { isDragging = false; });

            container.appendChild(note);
            showToast('Sticky note created');
        },

        _saveState() {
            if (!this._ctx || !this._canvas) return;
            this._history.push(this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height));
            if (this._history.length > 25) this._history.shift();
            this._redoStack = [];
        },

        undo() {
            if (!this._history.length || !this._ctx) return;
            this._redoStack.push(this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height));
            const prev = this._history.pop();
            this._ctx.putImageData(prev, 0, 0);
            showToast('Undo');
        },

        redo() {
            if (!this._redoStack.length || !this._ctx) return;
            this._history.push(this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height));
            const next = this._redoStack.pop();
            this._ctx.putImageData(next, 0, 0);
            showToast('Redo');
        },

        clear() {
            if (!this._ctx || !this._canvas) return;
            this._saveState();
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            document.querySelectorAll('.smp-sticky-note').forEach(n => n.remove());
            showToast('Annotations cleared');
        },

        save() {
            if (!this._canvas) return;
            try {
                const dataUrl = this._canvas.toDataURL('image/png');
                try {
                    localStorage.setItem('smp_saved_annotations', dataUrl);
                } catch(e) {
                    sessionStorage.setItem('smp_saved_annotations', dataUrl);
                }
                showToast('Annotations saved to storage');
            } catch(e) {
                showToast('Unable to save annotations to storage');
            }
        },

        load() {
            let dataUrl = null;
            try {
                dataUrl = localStorage.getItem('smp_saved_annotations') || sessionStorage.getItem('smp_saved_annotations');
            } catch(e) {}
            if (!dataUrl || !this._ctx) { showToast('No saved annotations found'); return; }
            const img = new Image();
            img.onload = () => {
                this._saveState();
                this._ctx.drawImage(img, 0, 0);
                showToast('Annotations restored');
            };
            img.src = dataUrl;
        },

        exportSnapshot() {
            if (!this._canvas) return;
            // Create composite canvas with video/slide background + annotations
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = this._canvas.width;
            exportCanvas.height = this._canvas.height;
            const ctx = exportCanvas.getContext('2d');

            const video = $('smp-video-el');
            if (video && video.style.display !== 'none' && video.readyState >= 2) {
                ctx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);
            } else {
                ctx.fillStyle = '#1e1b18';
                ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            }

            ctx.drawImage(this._canvas, 0, 0);

            const a = document.createElement('a');
            a.href = exportCanvas.toDataURL('image/png');
            a.download = 'lesson_snapshot_' + Date.now() + '.png';
            a.click();
            showToast('Snapshot downloaded!');
        },

        close() {
            const toolbar = $('smp-annotation-toolbar');
            if (toolbar) toolbar.style.display = 'none';
            const btn = $('smp-anno-toggle-btn');
            if (btn) btn.classList.remove('active');
            this.setTool('select');
        }
    };
    `;
};
