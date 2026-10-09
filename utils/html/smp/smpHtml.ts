export const getSmpHtml = (): string => {
    return `
    <!-- ============================================================== -->
    <!-- SUPER MEDIA PLAYER - Enhanced Interactive Learning Platform    -->
    <!-- Glassy Cream Theme with Dark Mode & Advanced Language Tools    -->
    <!-- ============================================================== -->
    <div id="super-media-player" style="display:none;" role="application" aria-label="Interactive Media Learning Platform">
        <div id="smp-glass-bg"></div>

        <!-- ==================== HEADER ==================== -->
        <div id="smp-header" role="banner" title="Drag to move • Double-click to center">
            <div class="smp-title" title="Drag to move • Double-click to center">
                <span class="smp-drag-grip"><i class="fas fa-grip-vertical"></i></span>
                <i class="fas fa-play-circle smp-brand-icon" aria-hidden="true"></i> 
                <span class="smp-title-text">Super Media Player</span>
                <span class="smp-badge-pro">PRO EDU</span>
            </div>
            <div class="smp-header-center">
                <!-- Mode Toggle -->
                <div id="smp-mode-toggle" class="smp-toggle-group" role="radiogroup" aria-label="Activity Mode">
                    <button id="smp-mode-subtitle" class="smp-toggle-btn active" role="radio" aria-checked="true"
                        onclick="SMP.setMode('subtitle')" title="Subtitle Mode - timestamp-synchronized activities & subtitles">
                        <i class="fas fa-closed-captioning" aria-hidden="true"></i> Subtitle
                    </button>
                    <button id="smp-mode-transcript" class="smp-toggle-btn" role="radio" aria-checked="false"
                        onclick="SMP.setMode('transcript')" title="Transcript Mode - full interactive script with line practice">
                        <i class="fas fa-file-alt" aria-hidden="true"></i> Transcript
                    </button>
                </div>
                <!-- Subtitle Settings Toggle -->
                <button id="smp-sub-settings-btn" class="smp-icon-btn" onclick="SMP.toggleSubtitleMenu()" title="Subtitle Settings & Appearance" aria-label="Subtitle Settings">
                    <i class="fas fa-cog" aria-hidden="true"></i>
                </button>
                <!-- Theme Toggle -->
                <button id="smp-theme-toggle" class="smp-icon-btn" onclick="SMP.toggleTheme()" title="Toggle Dark/Light Theme" aria-label="Toggle theme">
                    <i class="fas fa-moon" aria-hidden="true"></i>
                </button>
            </div>
            <div class="smp-win-controls">
                <button onclick="SMP.centerPlayer()" title="Center / Reset Position" aria-label="Center player"><i class="fas fa-crosshairs"></i></button>
                <button onclick="SMP.toggleFullscreen()" title="Fullscreen Mode" aria-label="Toggle fullscreen"><i class="fas fa-expand"></i></button>
                <button onclick="SMP.close()" title="Close" aria-label="Close player"><i class="fas fa-times"></i></button>
            </div>
        </div>

        <!-- ==================== SUBTITLE SETTINGS POPOVER ==================== -->
        <div id="smp-sub-settings-popover" class="smp-popover" style="display:none;">
            <div class="smp-popover-header">
                <h4><i class="fas fa-closed-captioning"></i> Subtitle Settings</h4>
                <button onclick="SMP.toggleSubtitleMenu()" class="smp-close-sm">&times;</button>
            </div>
            <div class="smp-popover-body">
                <div class="smp-setting-row">
                    <span>Font Size</span>
                    <div class="smp-btn-group-sm">
                        <button onclick="SMP.subtitles.setSize('small')" class="smp-sub-size-btn" data-size="small">Small</button>
                        <button onclick="SMP.subtitles.setSize('medium')" class="smp-sub-size-btn active" data-size="medium">Medium</button>
                        <button onclick="SMP.subtitles.setSize('large')" class="smp-sub-size-btn" data-size="large">Large</button>
                    </div>
                </div>
                <div class="smp-setting-row">
                    <span>Position</span>
                    <div class="smp-btn-group-sm">
                        <button onclick="SMP.subtitles.setPosition('bottom')" class="smp-sub-pos-btn active" data-pos="bottom">Bottom</button>
                        <button onclick="SMP.subtitles.setPosition('top')" class="smp-sub-pos-btn" data-pos="top">Top</button>
                    </div>
                </div>
                <div class="smp-setting-row">
                    <span>Click Word to Define/Speak</span>
                    <input type="checkbox" id="smp-sub-word-click" checked onchange="SMP.subtitles.toggleWordClick(this.checked)">
                </div>
                <div class="smp-setting-actions">
                    <button class="smp-btn-xs" onclick="SMP.subtitles.export('srt')"><i class="fas fa-download"></i> Export SRT</button>
                    <button class="smp-btn-xs" onclick="SMP.subtitles.export('vtt')"><i class="fas fa-download"></i> Export VTT</button>
                    <label class="smp-btn-xs" style="cursor:pointer;">
                        <i class="fas fa-upload"></i> Load Subtitles
                        <input type="file" accept=".srt,.vtt,.ass,.ssa,.json" onchange="SMP.subtitles.loadFromFile(this)" hidden>
                    </label>
                </div>
            </div>
        </div>

        <!-- ==================== MAIN CONTENT AREA ==================== -->
        <div id="smp-main-content">
            <!-- Left: Screen Area -->
            <div id="smp-screen-area">
                <div id="smp-screen" role="region" aria-label="Media display">
                    <!-- Video/Audio Element -->
                    <video id="smp-video-el" style="display:none;" playsinline></video>
                    <audio id="smp-audio-el" style="display:none;"></audio>
                    <iframe id="smp-yt-el" src="about:blank" style="display:none;" frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen title="YouTube video player"></iframe>

                    <!-- Slideshow Container -->
                    <div id="smp-slideshow" style="display:none;" role="region" aria-label="Slideshow">
                        <img id="smp-slide-img" src="" alt="Slide" />
                        <div id="smp-slide-controls">
                            <button onclick="SMP.slides.prev()" aria-label="Previous slide"><i class="fas fa-chevron-left"></i></button>
                            <span id="smp-slide-counter">1 / 1</span>
                            <button onclick="SMP.slides.next()" aria-label="Next slide"><i class="fas fa-chevron-right"></i></button>
                            <button onclick="SMP.slides.toggleAutoplay()" aria-label="Toggle autoplay" id="smp-slide-autoplay"><i class="fas fa-play"></i></button>
                            <button onclick="SMP.slides.fullscreen()" aria-label="Fullscreen slide"><i class="fas fa-expand"></i></button>
                        </div>
                        <canvas id="smp-slide-annotation-canvas"></canvas>
                    </div>

                    <!-- Document Viewer -->
                    <div id="smp-doc-viewer" style="display:none;" role="region" aria-label="Document viewer">
                        <iframe id="smp-doc-iframe" src="about:blank" title="Document viewer"></iframe>
                        <canvas id="smp-pdf-canvas" style="display:none;"></canvas>
                        <div id="smp-doc-page-controls" style="display:none;">
                            <button onclick="SMP.doc.prevPage()" aria-label="Previous page"><i class="fas fa-chevron-left"></i></button>
                            <span id="smp-doc-page-counter">1 / 1</span>
                            <button onclick="SMP.doc.nextPage()" aria-label="Next page"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <canvas id="smp-doc-annotation-canvas"></canvas>
                    </div>

                    <!-- Screen Share Overlay -->
                    <div id="smp-screenshare-overlay" style="display:none;" role="region" aria-label="Screen share">
                        <div id="smp-screenshare-header">
                            <span><i class="fas fa-desktop"></i> Screen Share</span>
                            <div>
                                <button onclick="SMP.screenShare.toggleVisibility()" title="Toggle visibility"><i class="fas fa-eye"></i></button>
                                <button onclick="SMP.screenShare.stop()" title="Stop sharing"><i class="fas fa-times"></i></button>
                            </div>
                        </div>
                        <video id="smp-screenshare-video" autoplay playsinline></video>
                    </div>

                    <!-- Video Annotation Canvas Overlay -->
                    <canvas id="smp-video-annotation-canvas"></canvas>

                    <!-- Laser Pointer Trail Canvas -->
                    <canvas id="smp-laser-canvas"></canvas>

                    <!-- Hotspot Container -->
                    <div id="smp-hotspot-container"></div>

                    <!-- ==================== ON-SCREEN TIMESTAMP ACTIVITY TRIGGER BANNER ==================== -->
                    <div id="smp-video-activity-trigger-banner" class="smp-act-banner" style="display:none;">
                        <div class="smp-act-banner-badge">
                            <span id="smp-act-banner-icon" class="smp-act-banner-icon-box"><i class="fas fa-shapes"></i></span>
                            <div class="smp-act-banner-text-group">
                                <div class="smp-act-banner-headline">
                                    <span class="smp-act-banner-tag">Interactive Activity Alert</span>
                                    <span id="smp-act-banner-time" class="smp-act-banner-timestamp">0:15</span>
                                </div>
                                <div id="smp-act-banner-title" class="smp-act-banner-title-text">Interactive Flashcard: Perseverance</div>
                            </div>
                        </div>
                        <div class="smp-act-banner-btn-group">
                            <button id="smp-act-banner-play-btn" class="smp-btn-accent smp-btn-sm" onclick="SMP.launchActiveTimestampActivity()">
                                <i class="fas fa-gamepad"></i> Play Activity Now
                            </button>
                            <button class="smp-act-banner-dismiss-btn" onclick="SMP.dismissTimestampActivity()" title="Dismiss">&times;</button>
                        </div>
                    </div>

                    <!-- Enhanced Interactive Subtitle Display -->
                    <div id="smp-subtitle-display" class="smp-sub-medium smp-sub-bottom" aria-live="polite" aria-atomic="true">
                        <div id="smp-sub-text-wrapper"></div>
                        <div id="smp-sub-action-bar" style="display:none;">
                            <button onclick="SMP.subtitles.repeatCurrentCue()" title="Repeat this line (R)"><i class="fas fa-redo-alt"></i></button>
                            <button onclick="SMP.subtitles.speakCurrentCue()" title="Pronounce line (TTS)"><i class="fas fa-volume-up"></i></button>
                            <button onclick="SMP.subtitles.practiceCurrentCue()" title="Practice Speaking"><i class="fas fa-microphone"></i></button>
                        </div>
                    </div>

                    <!-- Word Lookup Popover for Subtitles -->
                    <div id="smp-word-lookup-card" class="smp-word-card" style="display:none;">
                        <div class="smp-word-card-header">
                            <span id="smp-wl-term" class="smp-wl-term"></span>
                            <button class="smp-wl-speak" onclick="SMP.speech.speak(document.getElementById('smp-wl-term').textContent)"><i class="fas fa-volume-up"></i></button>
                            <button class="smp-wl-close" onclick="SMP.subtitles.closeWordCard()">&times;</button>
                        </div>
                        <div id="smp-wl-meaning" class="smp-wl-body">Click speak or create flashcard for this word.</div>
                        <div class="smp-word-card-actions">
                            <button class="smp-btn-xs" onclick="SMP.subtitles.addWordToFlashcards()"><i class="fas fa-plus"></i> Save to Flashcards</button>
                            <button class="smp-btn-xs" onclick="SMP.subtitles.practiceWord()"><i class="fas fa-microphone"></i> Practice Pronouncing</button>
                        </div>
                    </div>

                    <!-- Activity Quick Icons (appear when cues have attached activities) -->
                    <div id="smp-activity-icons" style="display:none;" role="group" aria-label="Available activities">
                        <button id="smp-icon-flashcard" class="smp-activity-icon" onclick="SMP.activities.openFlashcard()" 
                            title="Flashcard" aria-label="Open flashcard">
                            <i class="fas fa-clone" aria-hidden="true"></i>
                        </button>
                        <button id="smp-icon-quiz" class="smp-activity-icon" onclick="SMP.activities.openQuiz()" 
                            title="Quiz" aria-label="Open quiz">
                            <i class="fas fa-question-circle" aria-hidden="true"></i>
                        </button>
                        <button id="smp-icon-dictation" class="smp-activity-icon" onclick="SMP.activities.openDictation()" 
                            title="Dictation" aria-label="Open dictation">
                            <i class="fas fa-spell-check" aria-hidden="true"></i>
                        </button>
                    </div>

                    <!-- On-Screen Timestamp Activity Alert Banner -->
                    <div id="smp-act-banner" class="smp-act-banner" style="display:none;" role="alert">
                        <div class="smp-act-banner-badge">
                            <div id="smp-act-banner-icon-box" class="smp-act-banner-icon-box">
                                <i class="fas fa-sparkles"></i>
                            </div>
                            <div class="smp-act-banner-text-group">
                                <div class="smp-act-banner-headline">
                                    <span id="smp-act-banner-tag" class="smp-act-banner-tag">Interactive Activity</span>
                                    <span id="smp-act-banner-timestamp" class="smp-act-banner-timestamp">0:15</span>
                                </div>
                                <span id="smp-act-banner-title" class="smp-act-banner-title-text">Vocabulary Flashcard</span>
                            </div>
                        </div>
                        <div class="smp-act-banner-btn-group">
                            <button id="smp-act-banner-launch-btn" class="smp-btn-accent smp-btn-xs" onclick="SMP.launchActiveTimestampActivity()">
                                <i class="fas fa-play"></i> Launch
                            </button>
                            <button class="smp-icon-btn" onclick="SMP.dismissTimestampActivityBanner()" title="Dismiss" aria-label="Dismiss">
                                &times;
                            </button>
                        </div>
                    </div>

                    <!-- Placeholder -->
                    <div id="smp-placeholder">
                        <div class="smp-placeholder-icon"><i class="fas fa-compact-disc fa-spin-pulse" style="--fa-animation-duration: 6s;"></i></div>
                        <p class="smp-ph-title">Super Media Player & Language Lab</p>
                        <p class="smp-ph-subtitle">Load video, audio, YouTube, or documents with synchronized interactive activities</p>
                        <div class="smp-ph-btns">
                            <button class="smp-btn-glass" onclick="SMP.promptUrl()"><i class="fas fa-link"></i> Paste Media URL</button>
                            <button class="smp-btn-glass" onclick="document.getElementById('smp-file-input').click()"><i class="fas fa-folder-open"></i> Open Local File</button>
                            <button class="smp-btn-glass accent" onclick="SMP.loadDemoSample()"><i class="fas fa-magic"></i> Load Interactive Demo</button>
                        </div>
                    </div>
                </div>

                <!-- ==================== CONTROLS ==================== -->
                <div id="smp-controls" role="toolbar" aria-label="Media controls">
                    <!-- Progress Row with Timeline Markers -->
                    <div class="smp-progress-row">
                        <span id="smp-current-time" aria-label="Current time">0:00</span>
                        <div id="smp-progress-container">
                            <input type="range" id="smp-progress" value="0" min="0" max="1000" step="0.1" 
                                aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                            <div id="smp-timeline-markers"></div>
                            <div id="smp-time-tooltip" class="smp-time-tooltip" style="display:none;">0:00</div>
                        </div>
                        <span id="smp-total-time" aria-label="Total duration">0:00</span>
                    </div>

                    <!-- Button Row -->
                    <div class="smp-btn-row">
                        <button id="smp-play-btn" class="smp-round-btn main" onclick="SMP.togglePlay()" 
                            aria-label="Play/Pause" title="Play/Pause (Space)"><i class="fas fa-play"></i></button>

                        <button class="smp-round-btn smp-btn-sm" onclick="SMP.seekRelative(-5)" title="Rewind 5s (←)" aria-label="Rewind 5s">
                            <i class="fas fa-undo"></i> 5s
                        </button>
                        <button class="smp-round-btn smp-btn-sm" onclick="SMP.seekRelative(5)" title="Forward 5s (→)" aria-label="Forward 5s">
                            5s <i class="fas fa-redo"></i>
                        </button>
                        <button class="smp-round-btn smp-btn-sm" onclick="SMP.subtitles.repeatCurrentCue()" title="Repeat Current Cue (R)" aria-label="Repeat Cue">
                            <i class="fas fa-sync-alt"></i> Cue
                        </button>

                        <div class="smp-divider" aria-hidden="true"></div>

                        <div class="smp-control-group">
                            <i class="fas fa-tachometer-alt smp-icon-label" aria-hidden="true"></i>
                            <input type="range" id="smp-speed" min="0.5" max="2.0" step="0.1" value="1" 
                                aria-label="Playback speed" title="Speed">
                            <span id="smp-speed-val" aria-live="polite">1.0x</span>
                        </div>

                        <div class="smp-divider" aria-hidden="true"></div>

                        <div class="smp-control-group">
                            <button class="smp-icon-mute-btn" onclick="SMP.toggleMute()" title="Mute/Unmute (M)" aria-label="Toggle mute">
                                <i id="smp-vol-icon" class="fas fa-volume-up smp-icon-label" aria-hidden="true"></i>
                            </button>
                            <input type="range" id="smp-volume" min="0" max="1" step="0.05" value="1" 
                                aria-label="Volume" title="Volume">
                        </div>

                        <button id="smp-loop-btn" class="smp-round-btn" onclick="SMP.toggleLoop()" title="Toggle Full Media Loop (L)" aria-label="Toggle loop">
                            <i class="fas fa-repeat"></i>
                        </button>
                        <button id="smp-pip-btn" class="smp-round-btn" onclick="SMP.togglePip()" title="Picture in Picture (P)" aria-label="Picture in Picture">
                            <i class="fas fa-external-link-alt"></i>
                        </button>

                        <div class="smp-spacer"></div>

                        <!-- Tools -->
                        <div class="smp-tools">
                            <button class="smp-round-btn" onclick="SMP.promptUrl()" title="Open URL"><i class="fas fa-link"></i></button>
                            <label class="smp-round-btn" title="Open Local Media / Subtitles" tabindex="0" role="button" aria-label="Open local file"
                                onkeydown="if(event.key==='Enter')this.querySelector('input').click()">
                                <i class="fas fa-folder-open"></i>
                                <input type="file" id="smp-file-input" accept="video/*,audio/*,.srt,.vtt" onchange="SMP.loadFile(this)" hidden>
                            </label>
                            <button class="smp-round-btn" onclick="SMP.openDocUpload()" title="Upload Document / Slides"><i class="fas fa-file-upload"></i></button>
                            <button class="smp-round-btn" onclick="SMP.screenShare.start()" title="Screen Share"><i class="fas fa-desktop"></i></button>
                            <button id="smp-rec-btn" class="smp-round-btn" onclick="SMP.toggleRecord()" title="Record Audio Practice"><i class="fas fa-microphone"></i></button>
                            <button id="smp-rec-save" class="smp-round-btn" onclick="SMP.saveRecording()" style="display:none;" title="Save Recording"><i class="fas fa-save" style="color:#10b981;"></i></button>
                            
                            <button id="smp-anno-toggle-btn" class="smp-round-btn smp-tool-accent" onclick="SMP.openAnnotationToolbar()" title="Annotation Tools (Pen, Highlighter, Laser, Shapes, Sticky, Stamps)">
                                <i class="fas fa-pen-nib"></i>
                            </button>
                            <button class="smp-round-btn smp-tool-accent" onclick="SMP.activities.openLibrary()" title="Activity Library (45+ Language Games & Quizzes)">
                                <i class="fas fa-shapes"></i>
                            </button>
                            <button class="smp-round-btn smp-tool-accent" onclick="SMP.openCopyAIPromptModal()" title="Copy AI Prompt & Generate Learning JSON">
                                <i class="fas fa-robot"></i>
                            </button>
                            <button class="smp-round-btn" onclick="SMP.openJsonImport()" title="Import Activities JSON">
                                <i class="fas fa-file-import"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ==================== RIGHT PANEL (Transcript & Progress) ==================== -->
            <div id="smp-right-panel" style="display:none;">
                <div id="smp-panel-tabs" role="tablist">
                    <button class="smp-panel-tab active" role="tab" aria-selected="true" onclick="SMP.showPanel('transcript')">
                        <i class="fas fa-align-left"></i> Transcript
                    </button>
                    <button class="smp-panel-tab" role="tab" aria-selected="false" onclick="SMP.showPanel('progress')">
                        <i class="fas fa-tasks"></i> Progress
                    </button>
                    <button class="smp-panel-tab" role="tab" aria-selected="false" onclick="SMP.showPanel('voice')">
                        <i class="fas fa-sliders-h"></i> Voice
                    </button>
                </div>

                <!-- Transcript Panel with Search & Filter -->
                <div id="smp-transcript-panel" class="smp-panel-content active" role="tabpanel" aria-label="Transcript">
                    <div class="smp-transcript-toolbar">
                        <div class="smp-search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="smp-transcript-search" placeholder="Search transcript..." oninput="SMP.filterTranscript(this.value)">
                            <button id="smp-transcript-search-clear" onclick="SMP.clearTranscriptSearch()" style="display:none;">&times;</button>
                        </div>
                        <div class="smp-transcript-actions">
                            <button onclick="SMP.exportTranscript('txt')" title="Export as TXT"><i class="fas fa-download"></i> TXT</button>
                            <button onclick="SMP.exportTranscript('md')" title="Export as Markdown"><i class="fab fa-markdown"></i> MD</button>
                        </div>
                    </div>
                    <div id="smp-transcript-list" role="list" aria-label="Transcript lines"></div>
                </div>

                <!-- Progress Panel -->
                <div id="smp-progress-panel" class="smp-panel-content" role="tabpanel" aria-label="Progress" style="display:none;">
                    <div id="smp-progress-summary">
                        <div class="smp-progress-stat">
                            <span class="smp-stat-label">Completed</span>
                            <span id="smp-stat-completed" class="smp-stat-value">0</span>
                        </div>
                        <div class="smp-progress-stat">
                            <span class="smp-stat-label">Total</span>
                            <span id="smp-stat-total" class="smp-stat-value">0</span>
                        </div>
                        <div class="smp-progress-stat">
                            <span class="smp-stat-label">Score</span>
                            <span id="smp-stat-score" class="smp-stat-value">0</span>
                        </div>
                    </div>
                    <div class="smp-progress-header-row">
                        <h4>Learning Checklist</h4>
                        <button class="smp-btn-xs" onclick="SMP.resetProgress()"><i class="fas fa-redo"></i> Reset</button>
                    </div>
                    <div id="smp-progress-list" role="list"></div>
                </div>

                <!-- Voice Panel -->
                <div id="smp-voice-panel" class="smp-panel-content" role="tabpanel" aria-label="Voice settings" style="display:none;">
                    <div class="smp-voice-setting-box">
                        <label for="smp-voice-select" class="smp-label">TTS Pronunciation Voice</label>
                        <select id="smp-voice-select" class="smp-select" aria-label="Select voice" onchange="SMP.speech.setVoice(this.value)"></select>
                        
                        <label for="smp-voice-rate" class="smp-label" style="margin-top:12px;">Speech Rate</label>
                        <div class="smp-slider-with-val">
                            <input type="range" id="smp-voice-rate" min="0.5" max="1.8" step="0.1" value="1" aria-label="Speech rate" oninput="document.getElementById('smp-voice-rate-val').textContent = this.value + 'x'">
                            <span id="smp-voice-rate-val">1.0x</span>
                        </div>

                        <div class="smp-test-voice-box">
                            <button class="smp-btn-primary smp-btn-sm full-width" onclick="SMP.speech.speak('Hello! Welcome to the enhanced Super Media Player language lab.')">
                                <i class="fas fa-play"></i> Test Pronunciation Voice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ==================== ENHANCED ACTIVITY LIBRARY MODAL ==================== -->
        <div id="smp-activity-library-modal" class="smp-modal" style="display:none;">
            <div class="smp-modal-content smp-modal-xl">
                <div class="smp-modal-header">
                    <div class="smp-modal-title-group">
                        <div class="smp-header-icon-circle"><i class="fas fa-shapes"></i></div>
                        <div>
                            <h2>Activity Library & Curriculum Generator</h2>
                            <p class="smp-modal-subtitle">46+ Interactive Language Games, Quizzes & AI Prompts with Timestamp Synchronization</p>
                        </div>
                    </div>
                    <div class="smp-header-right-actions">
                        <button class="smp-btn-outline smp-btn-sm" onclick="SMP.loadDemoSample()"><i class="fas fa-magic"></i> Load Interactive Demo</button>
                        <button class="smp-close-btn" onclick="SMP.closeModal('smp-activity-library-modal')">&times;</button>
                    </div>
                </div>

                <!-- Multi-Selection & Configuration Control Strip -->
                <div class="smp-lib-batch-toolbar">
                    <div class="smp-lib-search-row">
                        <div class="smp-library-search">
                            <i class="fas fa-search"></i>
                            <input type="text" id="smp-lib-search" placeholder="Search 46+ activities by title, grammar focus, or game mechanics..." oninput="SMP.activities.filterLibrary(this.value)">
                        </div>
                        <div class="smp-lib-quick-actions">
                            <button class="smp-btn-secondary smp-btn-xs" onclick="SMP.activities.selectAllActivities()"><i class="fas fa-check-double"></i> Select All</button>
                            <button class="smp-btn-secondary smp-btn-xs" onclick="SMP.activities.deselectAllActivities()"><i class="fas fa-times"></i> Deselect All</button>
                            <span class="smp-batch-divider"></span>
                            <span class="smp-batch-label">Set All Counts:</span>
                            <div class="smp-batch-count-pills">
                                <button class="smp-count-pill" onclick="SMP.activities.setAllCounts(1)">1</button>
                                <button class="smp-count-pill" onclick="SMP.activities.setAllCounts(3)">3</button>
                                <button class="smp-count-pill active" onclick="SMP.activities.setAllCounts(5)">5</button>
                                <button class="smp-count-pill" onclick="SMP.activities.setAllCounts(10)">10</button>
                            </div>
                        </div>
                    </div>

                    <!-- Category Filter Chips -->
                    <div class="smp-category-chips-row">
                        <div class="smp-category-chips">
                            <button class="smp-chip active" data-cat="all" onclick="SMP.activities.setCategory('all')">
                                <i class="fas fa-border-all"></i> All Activities <span class="smp-chip-badge">46</span>
                            </button>
                            <button class="smp-chip" data-cat="vocab" onclick="SMP.activities.setCategory('vocab')">
                                <i class="fas fa-layer-group"></i> Vocabulary & Flashcards <span class="smp-chip-badge">8</span>
                            </button>
                            <button class="smp-chip" data-cat="grammar" onclick="SMP.activities.setCategory('grammar')">
                                <i class="fas fa-pencil-ruler"></i> Grammar & Syntax <span class="smp-chip-badge">8</span>
                            </button>
                            <button class="smp-chip" data-cat="speaking" onclick="SMP.activities.setCategory('speaking')">
                                <i class="fas fa-microphone"></i> Speaking & Pronunciation <span class="smp-chip-badge">8</span>
                            </button>
                            <button class="smp-chip" data-cat="games" onclick="SMP.activities.setCategory('games')">
                                <i class="fas fa-gamepad"></i> Games & Word Puzzles <span class="smp-chip-badge">8</span>
                            </button>
                            <button class="smp-chip" data-cat="comprehension" onclick="SMP.activities.setCategory('comprehension')">
                                <i class="fas fa-graduation-cap"></i> Comprehension & Listening <span class="smp-chip-badge">8</span>
                            </button>
                            <button class="smp-chip" data-cat="writing" onclick="SMP.activities.setCategory('writing')">
                                <i class="fas fa-feather-alt"></i> Writing & Fluency <span class="smp-chip-badge">6</span>
                            </button>
                        </div>
                    </div>

                    <!-- Live Selection Summary Bar -->
                    <div class="smp-lib-summary-bar">
                        <div class="smp-summary-info">
                            <i class="fas fa-check-circle smp-summary-check"></i>
                            <span id="smp-lib-selected-summary"><strong>6 activities selected</strong> • 30 items will be generated by AI</span>
                        </div>
                        <div class="smp-summary-actions">
                            <button id="smp-gen-ai-btn" class="smp-btn-accent smp-btn-sm" onclick="SMP.activities.openAIPromptWithSelected()">
                                <i class="fas fa-sparkles"></i> Generate AI Prompt (<span id="smp-selected-item-count">30</span> Items)
                            </button>
                        </div>
                    </div>
                </div>

                <div class="smp-modal-body">
                    <div id="smp-activity-grid" class="smp-grid-layout"></div>
                </div>
            </div>
        </div>

        <!-- ==================== REDESIGNED COPY AI PROMPT MODAL ==================== -->
        <div id="smp-ai-prompt-modal" class="smp-modal" style="display:none;">
            <div class="smp-modal-content smp-modal-xl">
                <div class="smp-modal-header">
                    <div class="smp-modal-title-group">
                        <div class="smp-header-icon-circle"><i class="fas fa-robot"></i></div>
                        <div>
                            <h2>Copy AI Prompt & Activity Generator</h2>
                            <p class="smp-modal-subtitle">Generate timestamp-synchronized activities with exact quantities tailored to your transcript</p>
                        </div>
                    </div>
                    <button class="smp-close-btn" onclick="SMP.closeModal('smp-ai-prompt-modal')">&times;</button>
                </div>
                <div class="smp-modal-body">
                    <div class="smp-prompt-config-bar">
                        <div class="smp-cfg-item">
                            <label><i class="fas fa-layer-group"></i> CEFR Target Level</label>
                            <select id="smp-prompt-level" class="smp-select" onchange="SMP.updateGeneratedPrompt()">
                                <option value="A1">A1 - Beginner</option>
                                <option value="A2">A2 - Elementary</option>
                                <option value="B1" selected>B1 - Intermediate</option>
                                <option value="B2">B2 - Upper Intermediate</option>
                                <option value="C1">C1 - Advanced</option>
                                <option value="C2">C2 - Mastery / Native</option>
                            </select>
                        </div>
                        <div class="smp-cfg-item">
                            <label><i class="fas fa-globe"></i> Explanation / Support Language</label>
                            <select id="smp-prompt-lang" class="smp-select" onchange="SMP.updateGeneratedPrompt()">
                                <option value="English" selected>English (Direct Monolingual)</option>
                                <option value="Spanish">Spanish (Español)</option>
                                <option value="French">French (Français)</option>
                                <option value="German">German (Deutsch)</option>
                                <option value="Chinese">Chinese (Mandarin / 中文)</option>
                                <option value="Japanese">Japanese (日本語)</option>
                                <option value="Arabic">Arabic (العربية)</option>
                                <option value="Portuguese">Portuguese (Português)</option>
                                <option value="Italian">Italian (Italiano)</option>
                                <option value="Korean">Korean (한국어)</option>
                            </select>
                        </div>
                        <div class="smp-cfg-item smp-cfg-grow">
                            <label><i class="fas fa-list-check"></i> Selected Activities & Target Quantities</label>
                            <div id="smp-prompt-selected-tags" class="smp-selected-tags-display"></div>
                        </div>
                    </div>

                    <div class="smp-prompt-steps-grid">
                        <div class="smp-step-column">
                            <div class="smp-step-header">
                                <div class="smp-step-title-box">
                                    <span class="smp-step-num">Step 1</span>
                                    <h4>Copy AI Prompt</h4>
                                </div>
                                <button class="smp-btn-primary smp-btn-sm" onclick="SMP.copyGeneratedPrompt()">
                                    <i class="fas fa-copy"></i> Copy Prompt
                                </button>
                            </div>
                            <p class="smp-step-hint">Paste this complete prompt into ChatGPT, Claude, Gemini, or your external LLM of choice.</p>
                            <div class="smp-code-block smp-code-large">
                                <pre id="smp-full-ai-prompt"></pre>
                            </div>
                        </div>

                        <div class="smp-step-column">
                            <div class="smp-step-header">
                                <div class="smp-step-title-box">
                                    <span class="smp-step-num">Step 2</span>
                                    <h4>Paste AI Output & Load</h4>
                                </div>
                                <button class="smp-btn-accent smp-btn-sm" onclick="SMP.loadJsonFromAiModal()">
                                    <i class="fas fa-bolt"></i> Load into Player
                                </button>
                            </div>
                            <p class="smp-step-hint">Paste the JSON response from your AI model below to immediately populate video timeline activities.</p>
                            <textarea id="smp-ai-json-input" class="smp-textarea smp-textarea-large" placeholder="Paste generated JSON here... (e.g. { &quot;glossary&quot;: [...], &quot;questions&quot;: [...] })"></textarea>
                            <div class="smp-quick-loader-bar">
                                <button class="smp-btn-outline smp-btn-xs" onclick="SMP.loadDemoSample()"><i class="fas fa-magic"></i> Or Load Pre-made Sample Pack</button>
                                <span id="smp-json-validation-status" class="smp-status-ok" style="display:none;"><i class="fas fa-check"></i> JSON Valid</span>
                            </div>
                            <div id="smp-ai-json-error" class="smp-error" style="display:none;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ==================== ACTIVITY SETUP / SINGLE PROMPT MODAL ==================== -->
        <div id="smp-activity-prompt-modal" class="smp-modal" style="display:none;">
            <div class="smp-modal-content">
                <div class="smp-modal-header">
                    <h2 id="smp-apm-title">Activity Setup</h2>
                    <button class="smp-close-btn" onclick="SMP.closeModal('smp-activity-prompt-modal')">&times;</button>
                </div>
                <div class="smp-modal-body">
                    <p><strong>Step 1:</strong> Copy this activity-tailored prompt to your AI model.</p>
                    <div class="smp-code-block">
                        <pre id="smp-apm-prompt"></pre>
                        <button class="smp-copy-btn" onclick="SMP.activities.copyPrompt()"><i class="fas fa-copy"></i> Copy</button>
                    </div>
                    <p><strong>Step 2:</strong> Paste the generated JSON below or play a live demo.</p>
                    <textarea id="smp-apm-input" class="smp-textarea" placeholder="Paste JSON here..."></textarea>
                    <div class="smp-modal-actions-row">
                        <button class="smp-btn-primary" onclick="SMP.activities.loadFromPrompt()"><i class="fas fa-check"></i> Load Custom JSON</button>
                        <button class="smp-btn-accent" id="smp-apm-play-demo-btn" onclick="SMP.activities.playCurrentDemo()"><i class="fas fa-play"></i> Play Instant Demo</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ==================== HIGH-FIDELITY OVERLAYS ==================== -->

        <!-- 1. Flashcard & Flexcard Overlay -->
        <div id="smp-flashcard-overlay" class="smp-overlay" style="display:none;" role="dialog" aria-label="Flashcard" aria-modal="false">
            <div class="smp-overlay-content smp-flashcard">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('flashcard')" aria-label="Close flashcard">&times;</button>
                
                <div class="smp-card-flip-container" id="smp-fc-flip-card" onclick="SMP.activities.flipFlashcard()">
                    <div class="smp-card-flipper">
                        <!-- Front of Flashcard -->
                        <div class="smp-card-front">
                            <span class="smp-card-hint"><i class="fas fa-sync-alt"></i> Click card to flip</span>
                            <h3 id="smp-fc-term" class="smp-fc-term"></h3>
                            <div class="smp-fc-pronounce-row">
                                <span id="smp-fc-ipa" class="smp-fc-ipa"></span>
                                <button class="smp-icon-btn smp-fc-speak-btn" onclick="event.stopPropagation(); SMP.speech.speak(document.getElementById('smp-fc-term').textContent)" 
                                    aria-label="Pronounce term" title="Listen (TTS)"><i class="fas fa-volume-up"></i></button>
                            </div>
                            <div class="smp-fc-meta">
                                <span id="smp-fc-form" class="smp-tag"></span>
                                <span id="smp-fc-use" class="smp-tag"></span>
                            </div>
                        </div>

                        <!-- Back of Flashcard -->
                        <div class="smp-card-back">
                            <span class="smp-card-hint"><i class="fas fa-sync-alt"></i> Meaning & Context</span>
                            <div id="smp-fc-meaning" class="smp-fc-field"></div>
                            <div id="smp-fc-examples" class="smp-fc-examples"></div>
                        </div>
                    </div>
                </div>

                <div class="smp-fc-nav-bar">
                    <button class="smp-btn-secondary smp-btn-sm" onclick="SMP.activities.prevFlashcard()"><i class="fas fa-chevron-left"></i> Previous</button>
                    <span id="smp-fc-counter" class="smp-counter-text">1 / 1</span>
                    <button class="smp-btn-secondary smp-btn-sm" onclick="SMP.activities.nextFlashcard()">Next <i class="fas fa-chevron-right"></i></button>
                    <button class="smp-btn-accent smp-btn-sm" onclick="SMP.activities.startPractice()" aria-label="Practice with CCQ">
                        <i class="fas fa-brain" aria-hidden="true"></i> Practice (CCQ)
                    </button>
                </div>
            </div>
        </div>

        <!-- 2. Quiz Overlay (Multiple Choice, True/False, Matching, Blanks, Tense Transformer, Error Detective) -->
        <div id="smp-quiz-overlay" class="smp-overlay" style="display:none;" role="dialog" aria-label="Quiz" aria-modal="false">
            <div class="smp-overlay-content smp-quiz">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('quiz')" aria-label="Close quiz">&times;</button>
                <div class="smp-quiz-header">
                    <h3><i class="fas fa-graduation-cap"></i> Interactive Comprehension Quiz</h3>
                    <div id="smp-quiz-score-badge" class="smp-score-badge">0 pts</div>
                </div>
                <div id="smp-quiz-container"></div>
            </div>
        </div>

        <!-- 3. Sentence Unscramble Overlay -->
        <div id="smp-unscramble-overlay" class="smp-overlay" style="display:none;" role="dialog" aria-label="Unscramble Sentence">
            <div class="smp-overlay-content">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('unscramble')">&times;</button>
                <h3><i class="fas fa-random"></i> Sentence Builder & Unscramble</h3>
                <p class="smp-help-text">Click or tap word tiles to reconstruct the grammatically correct sentence.</p>
                <div id="smp-unscramble-target-zone" class="smp-word-bank-target"></div>
                <div id="smp-unscramble-source-zone" class="smp-word-bank-source"></div>
                <div class="smp-action-row-modal">
                    <button class="smp-btn-accent" onclick="SMP.activities.checkUnscramble()"><i class="fas fa-check"></i> Check Sentence</button>
                    <button class="smp-btn-secondary" onclick="SMP.activities.resetUnscramble()"><i class="fas fa-redo"></i> Reset</button>
                </div>
                <div id="smp-unscramble-feedback" class="smp-quiz-feedback" style="display:none;"></div>
            </div>
        </div>

        <!-- 4. Speaking & Pronunciation Overlay -->
        <div id="smp-speaking-overlay" class="smp-overlay" style="display:none;" role="dialog" aria-label="Speaking practice" aria-modal="false">
            <div class="smp-overlay-content">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('speaking')" aria-label="Close">&times;</button>
                <h3><i class="fas fa-microphone" aria-hidden="true"></i> Speaking & Pronunciation Coach</h3>
                <div class="smp-speaking-box">
                    <p class="smp-prompt-label">Target Sentence:</p>
                    <p id="smp-speaking-prompt" class="smp-speaking-prompt"></p>
                    <button class="smp-btn-xs" onclick="SMP.speech.speak(document.getElementById('smp-speaking-prompt').textContent)">
                        <i class="fas fa-volume-up"></i> Listen to Native Audio
                    </button>
                </div>
                <div id="smp-speaking-status">
                    <div id="smp-mic-animation" class="smp-mic-idle">
                        <i class="fas fa-microphone"></i>
                    </div>
                    <p id="smp-speaking-result">Press "Start Speaking" and read aloud.</p>
                    <div id="smp-accuracy-meter">
                        <div id="smp-accuracy-fill"></div>
                    </div>
                    <span id="smp-accuracy-label">0% Match</span>
                </div>
                <button id="smp-speaking-start" class="smp-btn-accent" onclick="SMP.speech.startRecognition()">
                    <i class="fas fa-microphone"></i> Start Speaking
                </button>
            </div>
        </div>

        <!-- 5. Dictation Overlay -->
        <div id="smp-dictation-overlay" class="smp-overlay" style="display:none;" role="dialog" aria-label="Dictation Activity">
            <div class="smp-overlay-content">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('dictation')">&times;</button>
                <h3><i class="fas fa-headphones"></i> Audio Dictation & Transcription Test</h3>
                <p class="smp-help-text">Listen closely to the audio clip and transcribe what you hear.</p>
                <div class="smp-dictation-player">
                    <button class="smp-btn-primary" onclick="SMP.activities.playDictationAudio()"><i class="fas fa-play"></i> Play Audio (1.0x)</button>
                    <button class="smp-btn-secondary" onclick="SMP.activities.playDictationAudioSlow()"><i class="fas fa-tachometer-alt"></i> Slow (0.75x)</button>
                </div>
                <textarea id="smp-dictation-input" class="smp-textarea" rows="3" placeholder="Type what you hear..."></textarea>
                <div class="smp-action-row-modal">
                    <button class="smp-btn-accent" onclick="SMP.activities.checkDictation()"><i class="fas fa-check"></i> Check Dictation</button>
                </div>
                <div id="smp-dictation-feedback" class="smp-quiz-feedback" style="display:none;"></div>
            </div>
        </div>

        <!-- 6. WordMaster / Wordle Language Game Overlay -->
        <div id="smp-wordmaster-overlay" class="smp-overlay" style="display:none;" role="dialog" aria-label="WordMaster Game">
            <div class="smp-overlay-content">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('wordmaster')">&times;</button>
                <h3><i class="fas fa-puzzle-piece"></i> WordMaster - Vocabulary Guessing</h3>
                <p id="smp-wm-clue" class="smp-help-text">Guess the mystery word based on the clue.</p>
                <div id="smp-wm-grid" class="smp-wordle-grid"></div>
                <div class="smp-wm-input-row">
                    <input type="text" id="smp-wm-input" class="smp-input" placeholder="Type your guess..." maxlength="10">
                    <button class="smp-btn-accent" onclick="SMP.activities.submitWordMasterGuess()">Submit Guess</button>
                </div>
                <div id="smp-wm-feedback" class="smp-quiz-feedback" style="display:none;"></div>
            </div>
        </div>

        <!-- 7. Snowman / Hangman Word Guesser Overlay -->
        <div id="smp-snowman-overlay" class="smp-overlay" style="display:none;" role="dialog" aria-label="Snowman Game">
            <div class="smp-overlay-content">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('snowman')">&times;</button>
                <h3><i class="fas fa-snowman"></i> Snowman Vocabulary Challenge</h3>
                <div class="smp-snowman-display">
                    <div id="smp-snowman-figure" class="smp-snowman-art">⛄ ❄️ ❄️</div>
                    <div id="smp-snowman-word" class="smp-letter-blanks">_ _ _ _ _</div>
                    <div id="smp-snowman-clue" class="smp-clue-badge"></div>
                </div>
                <div id="smp-snowman-keyboard" class="smp-virtual-keyboard"></div>
                <div id="smp-snowman-feedback" class="smp-quiz-feedback" style="display:none;"></div>
            </div>
        </div>

        <!-- 8. Dialogue & Roleplay Overlay -->
        <div id="smp-dialogue-overlay" class="smp-overlay" style="display:none;" role="dialog" aria-label="Dialogue Roleplay">
            <div class="smp-overlay-content smp-dialogue-modal">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('dialogue')">&times;</button>
                <h3 id="smp-dialogue-title"><i class="fas fa-comments"></i> Conversational Roleplay</h3>
                <div id="smp-dialogue-chat" class="smp-chat-timeline"></div>
                <div class="smp-dialogue-footer">
                    <button class="smp-btn-primary" onclick="SMP.activities.playFullDialogue()"><i class="fas fa-play"></i> Play All Audio</button>
                    <button class="smp-btn-accent" onclick="SMP.activities.stepDialogue()"><i class="fas fa-step-forward"></i> Next Turn</button>
                </div>
            </div>
        </div>

        <!-- 9. JSON Import Modal -->
        <div id="smp-json-modal" class="smp-overlay" style="display:none;" role="dialog" aria-label="Import JSON" aria-modal="true">
            <div class="smp-overlay-content smp-json-import">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('json')" aria-label="Close">&times;</button>
                <h3><i class="fas fa-file-import" aria-hidden="true"></i> Import Activities JSON</h3>
                <p class="smp-help-text">Paste your validated activities JSON below to render interactive timeline markers and quizzes.</p>
                <textarea id="smp-json-textarea" rows="12" placeholder='{"glossary": [...], "questions": [...]}' aria-label="JSON input" spellcheck="false"></textarea>
                <div id="smp-json-error" class="smp-error" style="display:none;" role="alert"></div>
                <div class="smp-modal-actions">
                    <button class="smp-btn-accent" onclick="SMP.importJson()"><i class="fas fa-check"></i> Import & Load</button>
                    <button class="smp-btn-secondary" onclick="SMP.overlays.close('json')">Cancel</button>
                </div>
            </div>
        </div>

        <!-- 10. Document Upload Modal -->
        <div id="smp-doc-upload-modal" class="smp-overlay" style="display:none;" role="dialog" aria-label="Upload document" aria-modal="true">
            <div class="smp-overlay-content">
                <button class="smp-overlay-close" onclick="SMP.overlays.close('docUpload')" aria-label="Close">&times;</button>
                <h3><i class="fas fa-file-upload" aria-hidden="true"></i> Upload Document or Presentation</h3>
                <p class="smp-help-text">Upload PDF, PowerPoint (PPT/PPTX), Word (DOC/DOCX), or images for interactive whiteboard annotations.</p>
                <label class="smp-upload-zone" tabindex="0" role="button" aria-label="Click or drag to upload"
                    onkeydown="if(event.key==='Enter')this.querySelector('input').click()"
                    ondragover="event.preventDefault();this.classList.add('dragover')" 
                    ondragleave="this.classList.remove('dragover')"
                    ondrop="event.preventDefault();this.classList.remove('dragover');SMP.doc.handleDrop(event)">
                    <i class="fas fa-cloud-upload-alt" style="font-size:2.5rem;opacity:0.6;color:var(--smp-accent);" aria-hidden="true"></i>
                    <span>Click or drag documents here</span>
                    <input type="file" id="smp-doc-file-input" accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp" 
                        onchange="SMP.doc.loadFile(this)" hidden>
                </label>
            </div>
        </div>

        <!-- ==================== ANNOTATION TOOLBAR ==================== -->
        <div id="smp-annotation-toolbar" style="display:none;" role="toolbar" aria-label="Annotation tools">
            <div class="smp-anno-drag-handle" title="Drag annotation bar"><i class="fas fa-grip-vertical"></i></div>
            
            <button class="smp-anno-btn active" data-tool="select" onclick="SMP.annotations.setTool('select')" title="Select / Pointer Mode" aria-label="Select"><i class="fas fa-mouse-pointer"></i></button>
            <button class="smp-anno-btn" data-tool="pen" onclick="SMP.annotations.setTool('pen')" title="Freehand Pen (P)" aria-label="Pen"><i class="fas fa-pen"></i></button>
            <button class="smp-anno-btn" data-tool="highlighter" onclick="SMP.annotations.setTool('highlighter')" title="Highlighter (H)" aria-label="Highlighter"><i class="fas fa-highlighter"></i></button>
            <button class="smp-anno-btn" data-tool="laser" onclick="SMP.annotations.setTool('laser')" title="Laser Pointer (L)" aria-label="Laser Pointer"><i class="fas fa-magic"></i></button>
            <button class="smp-anno-btn" data-tool="arrow" onclick="SMP.annotations.setTool('arrow')" title="Arrow Pointer" aria-label="Arrow"><i class="fas fa-long-arrow-alt-right"></i></button>
            <button class="smp-anno-btn" data-tool="rect" onclick="SMP.annotations.setTool('rect')" title="Rectangle Box" aria-label="Rectangle"><i class="fas fa-square"></i></button>
            <button class="smp-anno-btn" data-tool="circle" onclick="SMP.annotations.setTool('circle')" title="Circle / Ellipse" aria-label="Circle"><i class="fas fa-circle"></i></button>
            <button class="smp-anno-btn" data-tool="text" onclick="SMP.annotations.setTool('text')" title="Text Box" aria-label="Text"><i class="fas fa-font"></i></button>
            
            <!-- Sticky Notes with Color Chooser -->
            <div class="smp-anno-dropdown-wrapper">
                <button class="smp-anno-btn" data-tool="sticky" onclick="SMP.annotations.addSticky()" title="Sticky Note (S)" aria-label="Sticky Note"><i class="fas fa-sticky-note"></i></button>
            </div>

            <!-- Emoji / Teacher Stamps -->
            <div class="smp-anno-dropdown-wrapper">
                <button class="smp-anno-btn" data-tool="stamp" onclick="SMP.annotations.toggleStampMenu()" title="Teacher Stamps & Stickers"><i class="fas fa-star"></i></button>
                <div id="smp-stamp-menu" class="smp-stamp-popover" style="display:none;">
                    <button onclick="SMP.annotations.setStamp('⭐')">⭐</button>
                    <button onclick="SMP.annotations.setStamp('👏')">👏</button>
                    <button onclick="SMP.annotations.setStamp('🎯')">🎯</button>
                    <button onclick="SMP.annotations.setStamp('💡')">💡</button>
                    <button onclick="SMP.annotations.setStamp('✅')">✅</button>
                    <button onclick="SMP.annotations.setStamp('❌')">❌</button>
                    <button onclick="SMP.annotations.setStamp('🏆')">🏆</button>
                    <button onclick="SMP.annotations.setStamp('🔥')">🔥</button>
                </div>
            </div>

            <button class="smp-anno-btn" data-tool="eraser" onclick="SMP.annotations.setTool('eraser')" title="Eraser (E)" aria-label="Eraser"><i class="fas fa-eraser"></i></button>
            
            <div class="smp-anno-separator"></div>

            <!-- Palette Presets -->
            <div class="smp-color-presets">
                <span class="smp-cp-dot active" style="background:#ef4444;" onclick="SMP.annotations.setColor('#ef4444')"></span>
                <span class="smp-cp-dot" style="background:#3b82f6;" onclick="SMP.annotations.setColor('#3b82f6')"></span>
                <span class="smp-cp-dot" style="background:#10b981;" onclick="SMP.annotations.setColor('#10b981')"></span>
                <span class="smp-cp-dot" style="background:#f59e0b;" onclick="SMP.annotations.setColor('#f59e0b')"></span>
                <span class="smp-cp-dot" style="background:#8b5cf6;" onclick="SMP.annotations.setColor('#8b5cf6')"></span>
                <span class="smp-cp-dot" style="background:#ffffff;border:1px solid #ccc;" onclick="SMP.annotations.setColor('#ffffff')"></span>
            </div>

            <input type="color" id="smp-anno-color" value="#ef4444" title="Custom Color" aria-label="Custom Annotation color" onchange="SMP.annotations.setColor(this.value)">
            
            <!-- Stroke Width Slider with live indicator -->
            <div class="smp-stroke-ctrl">
                <input type="range" id="smp-anno-stroke" min="1" max="25" value="4" title="Stroke width" aria-label="Stroke width" oninput="SMP.annotations.setStroke(this.value)">
                <span id="smp-stroke-val">4px</span>
            </div>

            <div class="smp-anno-separator"></div>

            <button class="smp-anno-btn" onclick="SMP.annotations.undo()" title="Undo (Ctrl+Z)" aria-label="Undo"><i class="fas fa-undo"></i></button>
            <button class="smp-anno-btn" onclick="SMP.annotations.redo()" title="Redo (Ctrl+Y)" aria-label="Redo"><i class="fas fa-redo"></i></button>
            <button class="smp-anno-btn" onclick="SMP.annotations.clear()" title="Clear All Annotations" aria-label="Clear all"><i class="fas fa-trash"></i></button>
            <button class="smp-anno-btn" onclick="SMP.annotations.exportSnapshot()" title="Export PNG Snapshot with Annotations" aria-label="Export snapshot"><i class="fas fa-camera"></i></button>
            <button class="smp-anno-btn" onclick="SMP.annotations.save()" title="Save Annotations to Memory" aria-label="Save annotations"><i class="fas fa-save"></i></button>
            <button class="smp-anno-btn" onclick="SMP.annotations.load()" title="Load Annotations" aria-label="Load annotations"><i class="fas fa-download"></i></button>
            <button class="smp-anno-btn" onclick="SMP.annotations.close()" title="Close Toolbar" aria-label="Close toolbar"><i class="fas fa-times"></i></button>
        </div>

        <!-- Toast Notification -->
        <div id="smp-toast" role="status" aria-live="polite"></div>

        <!-- Resizer Handles for Edges and Corners -->
        <div class="smp-resizer smp-resizer-r" data-dir="r" title="Drag edge to resize width"></div>
        <div class="smp-resizer smp-resizer-b" data-dir="b" title="Drag edge to resize height"></div>
        <div class="smp-resizer smp-resizer-l" data-dir="l" title="Drag edge to resize width"></div>
        <div class="smp-resizer smp-resizer-bl" data-dir="bl" title="Drag corner to resize"></div>
        <div class="smp-resizer smp-resizer-tr" data-dir="tr" title="Drag corner to resize"></div>
        <div id="smp-resizer" class="smp-resizer smp-resizer-br" data-dir="br" title="Drag corner to resize">
            <i class="fas fa-grip-lines-diagonal smp-resize-icon"></i>
        </div>
    </div>
    `;
};
