export const getAccessibilityWidget = () => {
    const html = `
        <div id="accessibility-widget">
            <button id="accessibility-toggle" title="Accessibility Tools" aria-label="Open Accessibility Tools">
                <i class="fas fa-universal-access"></i>
            </button>
            <div id="accessibility-panel" role="dialog" aria-modal="true" aria-labelledby="accessibility-panel-title" style="display: none;">
                <div id="panel-header">
                    <div class="panel-title-wrapper">
                        <i class="fas fa-universal-access panel-icon"></i>
                        <h3 id="accessibility-panel-title">Accessibility Tools</h3>
                    </div>
                    <div class="header-actions">
                        <button id="panel-reset" data-tool="reset" title="Reset all settings" aria-label="Reset all settings">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button id="panel-close" title="Close" aria-label="Close Accessibility Tools">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div id="panel-tabs">
                    <button class="panel-tab active" data-tab="profiles">
                        <i class="fas fa-users"></i>
                        <span>Profiles</span>
                    </button>
                    <button class="panel-tab" data-tab="display">
                        <i class="fas fa-eye"></i>
                        <span>Display</span>
                    </button>
                    <button class="panel-tab" data-tab="reading">
                        <i class="fas fa-book-reader"></i>
                        <span>Reading</span>
                    </button>
                    <button class="panel-tab" data-tab="navigation">
                        <i class="fas fa-compass"></i>
                        <span>Navigation</span>
                    </button>
                </div>

                <div id="panel-content">
                    <!-- PROFILES TAB -->
                    <div class="tab-content active" data-tab="profiles">
                        <div class="profile-cards">
                            <button class="profile-card" data-profile="seizure">
                                <div class="profile-header">
                                    <i class="fas fa-bolt"></i>
                                    <div class="toggle-indicator"></div>
                                </div>
                                <div class="profile-info">
                                    <h4>Seizure Safe Profile</h4>
                                    <p>Stops animations and reduces color saturation.</p>
                                </div>
                            </button>
                            <button class="profile-card" data-profile="blind">
                                <div class="profile-header">
                                    <i class="fas fa-eye-slash"></i>
                                    <div class="toggle-indicator"></div>
                                </div>
                                <div class="profile-info">
                                    <h4>Blind Profile</h4>
                                    <p>Activates the screen reader for auditory navigation.</p>
                                </div>
                            </button>
                            <button class="profile-card" data-profile="visually-impaired">
                                <div class="profile-header">
                                    <i class="fas fa-low-vision"></i>
                                    <div class="toggle-indicator"></div>
                                </div>
                                <div class="profile-info">
                                    <h4>Visually Impaired Profile</h4>
                                    <p>Enhances contrast and readability for low vision.</p>
                                </div>
                            </button>
                            <button class="profile-card" data-profile="adhd">
                                <div class="profile-header">
                                    <i class="fas fa-info-circle"></i>
                                    <div class="toggle-indicator"></div>
                                </div>
                                <div class="profile-info">
                                    <h4>ADHD Friendly Profile</h4>
                                    <p>Reduces distractions for better focus.</p>
                                </div>
                            </button>
                            <button class="profile-card" data-profile="cognitive">
                                <div class="profile-header">
                                    <i class="fas fa-book-open"></i>
                                    <div class="toggle-indicator"></div>
                                </div>
                                <div class="profile-info">
                                    <h4>Cognitive & Learning Profile</h4>
                                    <p>Helpful tools for reading and comprehension.</p>
                                </div>
                            </button>
                            <button class="profile-card" data-profile="motor">
                                <div class="profile-header">
                                    <i class="fas fa-crosshairs"></i>
                                    <div class="toggle-indicator"></div>
                                </div>
                                <div class="profile-info">
                                    <h4>Motor Impaired Profile</h4>
                                    <p>Optimizes the site for keyboard-only navigation.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <!-- DISPLAY TAB -->
                    <div class="tab-content" data-tab="display">
                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-text-height"></i> Text Size</h4>
                            <div class="slider-control">
                                <button class="control-btn" data-tool="decrease-text" title="Decrease text size">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <div class="slider-wrapper">
                                    <input type="range" id="text-size-slider" min="-10" max="50" value="0" step="2">
                                    <span class="slider-value" id="text-size-value">100%</span>
                                </div>
                                <button class="control-btn" data-tool="increase-text" title="Increase text size">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>

                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-arrows-alt-v"></i> Line Spacing</h4>
                            <div class="slider-control">
                                <button class="control-btn" data-tool="decrease-line-height" title="Decrease line spacing">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <div class="slider-wrapper">
                                    <input type="range" id="line-height-slider" min="-0.5" max="0.8" value="0" step="0.1">
                                    <span class="slider-value" id="line-height-value">Normal</span>
                                </div>
                                <button class="control-btn" data-tool="increase-line-height" title="Increase line spacing">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>

                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-text-width"></i> Letter Spacing</h4>
                            <div class="slider-control">
                                <button class="control-btn" data-tool="decrease-letter-spacing" title="Decrease letter spacing">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <div class="slider-wrapper">
                                    <input type="range" id="letter-spacing-slider" min="0" max="5" value="0" step="0.5">
                                    <span class="slider-value" id="letter-spacing-value">Normal</span>
                                </div>
                                <button class="control-btn" data-tool="increase-letter-spacing" title="Increase letter spacing">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>

                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-palette"></i> Color & Contrast</h4>
                            <div class="toggle-grid">
                                <button class="toggle-btn" data-tool="toggle-dark-mode" title="Switch to dark mode">
                                    <i class="fas fa-moon"></i>
                                    <span>Dark Mode</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-high-contrast" title="Increase contrast">
                                    <i class="fas fa-adjust"></i>
                                    <span>High Contrast</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-grayscale" title="Remove colors">
                                    <i class="fas fa-tint-slash"></i>
                                    <span>Grayscale</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-invert-colors" title="Invert colors">
                                    <i class="fas fa-exchange-alt"></i>
                                    <span>Invert Colors</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                            </div>
                        </div>

                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-fill-drip"></i> Background Color</h4>
                            <div class="color-presets">
                                <button class="color-preset" data-bg="default" title="Default" style="background: linear-gradient(135deg, #fff 50%, #f0f0f0 50%);">
                                    <i class="fas fa-times" style="opacity: 0.3;"></i>
                                </button>
                                <button class="color-preset" data-bg="sepia" title="Sepia" style="background: #fdf5e6;"></button>
                                <button class="color-preset" data-bg="cream" title="Cream" style="background: #fffef0;"></button>
                                <button class="color-preset" data-bg="light-blue" title="Light Blue" style="background: #e8f4fc;"></button>
                                <button class="color-preset" data-bg="light-green" title="Light Green" style="background: #e8fce8;"></button>
                                <button class="color-preset" data-bg="light-pink" title="Light Pink" style="background: #fce8f4;"></button>
                            </div>
                        </div>
                    </div>

                    <!-- READING TAB -->
                    <div class="tab-content" data-tab="reading">
                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-font"></i> Font Style</h4>
                            <div class="font-selector">
                                <button class="font-option" data-font="default">
                                    <span style="font-family: inherit;">Aa</span>
                                    <span>Default</span>
                                </button>
                                <button class="font-option" data-font="dyslexia">
                                    <span style="font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif;">Aa</span>
                                    <span>Dyslexia</span>
                                </button>
                                <button class="font-option" data-font="serif">
                                    <span style="font-family: Georgia, serif;">Aa</span>
                                    <span>Serif</span>
                                </button>
                                <button class="font-option" data-font="mono">
                                    <span style="font-family: 'Courier New', monospace;">Aa</span>
                                    <span>Mono</span>
                                </button>
                            </div>
                        </div>

                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-tools"></i> Reading Aids</h4>
                            <div class="toggle-grid">
                                <button class="toggle-btn" data-tool="toggle-immersive-mode" title="Immersive Mode">
                                    <i class="fas fa-book-reader"></i>
                                    <span>Immersive Mode</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-reading-guide" title="Reading guide line">
                                    <i class="fas fa-ruler-horizontal"></i>
                                    <span>Reading Guide</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-reading-mask" title="Focus mask">
                                    <i class="fas fa-mask"></i>
                                    <span>Focus Mask</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-highlight-links" title="Highlight links">
                                    <i class="fas fa-link"></i>
                                    <span>Highlight Links</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-highlight-titles" title="Highlight titles">
                                    <i class="fas fa-heading"></i>
                                    <span>Highlight Titles</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                            </div>
                        </div>

                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-book-open"></i> Content Options</h4>
                            <div class="toggle-grid">
                                <button class="action-card-btn" data-tool="toggle-google-translate" title="Translate Page">
                                    <i class="fas fa-language"></i>
                                    <span>Translate</span>
                                </button>
                                <button class="action-card-btn" data-tool="open-pdf-reader" title="Read PDFs">
                                    <i class="fas fa-file-pdf"></i>
                                    <span>PDF Reader</span>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-hide-images" title="Hide images">
                                    <i class="fas fa-eye-slash"></i>
                                    <span>Hide Images</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-simplify-layout" title="Simplify layout">
                                    <i class="fas fa-th-large"></i>
                                    <span>Simplify Layout</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-big-cursor" title="Large cursor">
                                    <i class="fas fa-mouse-pointer"></i>
                                    <span>Large Cursor</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                                <button class="toggle-btn" data-tool="toggle-text-to-speech" title="Auto text-to-speech">
                                    <i class="fas fa-volume-up"></i>
                                    <span>Text to Speech</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                            </div>
                        </div>

                        <div class="tool-section" id="tts-settings" style="display: none;">
                            <h4 class="section-title"><i class="fas fa-microphone"></i> Voice Settings</h4>
                            <div class="voice-control">
                                <label>Voice</label>
                                <select id="tts-voice-select"></select>
                            </div>
                            <div class="voice-control">
                                <label>Speed</label>
                                <input type="range" id="tts-rate" min="0.5" max="2" value="1" step="0.1">
                                <span id="tts-rate-value">1x</span>
                            </div>
                            <div class="voice-control">
                                <label>Pitch</label>
                                <input type="range" id="tts-pitch" min="0.5" max="2" value="1" step="0.1">
                                <span id="tts-pitch-value">Normal</span>
                            </div>
                        </div>
                    </div>

                    <!-- NAVIGATION TAB -->
                    <div class="tab-content" data-tab="navigation">
                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-keyboard"></i> Keyboard Navigation</h4>
                            <div class="keyboard-shortcuts">
                                <div class="shortcut-item">
                                    <kbd>Alt</kbd> + <kbd>A</kbd>
                                    <span>Open Panel</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Alt</kbd> + <kbd>+</kbd>
                                    <span>Increase Text</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Alt</kbd> + <kbd>-</kbd>
                                    <span>Decrease Text</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Alt</kbd> + <kbd>D</kbd>
                                    <span>Dark Mode</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Alt</kbd> + <kbd>R</kbd>
                                    <span>Reading Guide</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Esc</kbd>
                                    <span>Close Panel</span>
                                </div>
                            </div>
                        </div>

                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-sitemap"></i> Page Structure</h4>
                            <div class="page-structure" id="page-structure">
                                <p class="loading-text">Analyzing page...</p>
                            </div>
                        </div>

                        <div class="tool-section">
                            <h4 class="section-title"><i class="fas fa-print"></i> Print Options</h4>
                            <div class="toggle-grid">
                                <button class="toggle-btn" data-tool="toggle-print-friendly" title="Print friendly mode">
                                    <i class="fas fa-print"></i>
                                    <span>Print Friendly</span>
                                    <div class="toggle-indicator"></div>
                                </button>
                            </div>
                            <button class="action-btn" onclick="window.print()">
                                <i class="fas fa-print"></i> Print Page
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="reading-guide-line"></div>
        <div id="reading-mask-top"></div>
        <div id="reading-mask-bottom"></div>
        
        <div id="a11y-pdf-reader" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--a11y-bg); z-index: 99998; overflow-y: auto; padding: 40px; box-sizing: border-box; transition: var(--a11y-transition);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; max-width: 800px; margin-left: auto; margin-right: auto; padding-bottom: 10px; border-bottom: 2px solid var(--a11y-border);">
                <h2 style="margin: 0; color: var(--a11y-text);"><i class="fas fa-file-pdf"></i> Accessible PDF Reader</h2>
                <div style="display: flex; gap: 10px;">
                    <button class="footer-btn action-btn bg-gray-200" onclick="document.getElementById('a11y-pdf-reader').classList.toggle('maximized')" title="Maximize">
                        <i class="fas fa-expand"></i> Maximize
                    </button>
                    <button onclick="document.getElementById('a11y-pdf-reader').style.display='none'" class="footer-btn danger action-btn" title="Close PDF">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
            <div id="pdf-reader-status" style="max-width: 800px; margin: 0 auto; margin-bottom: 20px; text-align: center; color: var(--a11y-text);"></div>
            <div id="pdf-reader-content" style="max-width: 800px; margin: 0 auto; color: var(--a11y-text); line-height: 1.6;">
            </div>
        </div>
    `;

    const css = `
        /* ===== ACCESSIBILITY WIDGET VARIABLES ===== */
        :root {
            --a11y-primary: #2563eb;
            --a11y-primary-dark: #1d4ed8;
            --a11y-success: #16a34a;
            --a11y-danger: #dc2626;
            --a11y-warning: #d97706;
            --a11y-bg: #ffffff;
            --a11y-bg-secondary: #f8fafc;
            --a11y-text: #1e293b;
            --a11y-text-muted: #64748b;
            --a11y-border: #e2e8f0;
            --a11y-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            --a11y-radius: 16px;
            --a11y-transition: all 0.2s ease;
            
            --font-size-adjust: 0px;
            --line-height-adjust: 0;
            --letter-spacing-adjust: 0px;
        }

        /* ===== PROFILES CSS ===== */
        .profile-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding-bottom: 20px;
        }

        .profile-card {
            background: white;
            border: 2px solid var(--a11y-border);
            border-radius: 12px;
            padding: 12px;
            text-align: left;
            cursor: pointer;
            transition: var(--a11y-transition);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .profile-card:hover {
            border-color: var(--a11y-primary);
            background: rgba(37, 99, 235, 0.05);
        }

        .profile-card.active {
            border-color: var(--a11y-success);
            background: rgba(22, 163, 74, 0.05);
        }

        .profile-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        .profile-header i {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: var(--a11y-bg-secondary);
            border-radius: 8px;
            font-size: 18px !important;
            color: var(--a11y-text);
            transition: var(--a11y-transition);
        }

        .profile-card.active .profile-header i {
            background: rgba(22, 163, 74, 0.2);
            color: var(--a11y-success);
        }

        .profile-header .toggle-indicator {
            position: relative;
            width: 36px;
            height: 20px;
            background: var(--a11y-border);
            border-radius: 10px;
            transition: var(--a11y-transition);
            top: auto;
            right: auto;
        }

        .profile-header .toggle-indicator::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            transition: var(--a11y-transition);
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .profile-card.active .toggle-indicator {
            background: var(--a11y-success);
        }

        .profile-card.active .toggle-indicator::after {
            transform: translateX(16px);
        }

        .profile-info h4 {
            margin: 0 0 4px 0;
            font-size: 14px !important;
            font-weight: 600;
            color: var(--a11y-text);
            line-height: 1.2 !important;
        }

        .profile-info p {
            margin: 0;
            font-size: 11px !important;
            color: var(--a11y-text-muted);
            line-height: 1.3 !important;
        }

        /* ===== PROFILE CLASSES ===== */
        body.seizure-safe * {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
        }
        body.seizure-safe {
            filter: saturate(60%) !important;
        }

        body.visually-impaired {
            filter: contrast(125%) saturate(120%) !important;
            --font-size-adjust: 2px !important;
        }

        body.adhd-friendly .bg-white {
            border-color: var(--a11y-primary) !important;
            border-width: 2px !important;
        }
        body.adhd-friendly {
            filter: saturate(80%) !important;
        }

        body.cognitive-profile a {
            text-decoration: underline !important;
            text-decoration-thickness: 2px !important;
        }

        body.motor-impaired *:focus {
            outline: 3px solid var(--a11y-primary) !important;
            outline-offset: 2px !important;
        }

        body.dark-mode .profile-card {
            background: #1e293b !important;
            border-color: #334155 !important;
        }
        body.dark-mode .profile-card:hover { border-color: var(--a11y-primary) !important; }
        body.dark-mode .profile-info h4 { color: #e2e8f0 !important; }
        body.dark-mode .profile-header i { background: rgba(255,255,255,0.1) !important; color: #e2e8f0 !important; }

        /* ===== WIDGET CONTAINER ===== */
        #accessibility-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: normal;
            letter-spacing: normal;
        }

        #accessibility-toggle {
            display: none !important;
        }
        
        #accessibility-widget * {
            box-sizing: border-box;
            line-height: normal;
        }

        #a11y-pdf-reader.maximized > div {
            max-width: none !important;
            padding-left: 20px;
            padding-right: 20px;
        }

        /* ===== PANEL ===== */
        #accessibility-panel {
            position: fixed;
            bottom: 88px;
            right: 24px;
            width: 360px;
            max-width: calc(100vw - 32px);
            max-height: calc(100vh - 100px);
            background: var(--a11y-bg);
            border-radius: var(--a11y-radius);
            box-shadow: var(--a11y-shadow);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            z-index: 1000000;
            animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* ===== PANEL HEADER ===== */
        #panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: linear-gradient(135deg, var(--a11y-primary) 0%, var(--a11y-primary-dark) 100%);
            color: white;
        }

        .panel-title-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .panel-icon {
            font-size: 20px;
        }

        #panel-header h3 {
            margin: 0;
            font-size: 18px !important;
            font-weight: 600;
            line-height: 1.2 !important;
            color: white !important;
        }

        .header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        #panel-close, #panel-reset {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--a11y-transition);
        }

        #panel-close:hover, #panel-reset:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        #panel-reset:hover i {
            transform: rotate(-180deg);
            transition: transform 0.3s ease;
        }

        /* ===== TABS ===== */
        #panel-tabs {
            display: flex;
            background: var(--a11y-bg-secondary);
            border-bottom: 1px solid var(--a11y-border);
        }

        .panel-tab {
            flex: 1;
            padding: 12px 8px;
            background: transparent;
            border: none;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: var(--a11y-text-muted);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-weight: 500;
            transition: var(--a11y-transition);
            position: relative;
        }

        .panel-tab i {
            font-size: 18px !important;
        }

        .panel-tab span {
            font-size: 12px !important;
            line-height: normal !important;
        }

        .panel-tab:hover {
            color: var(--a11y-primary);
            background: rgba(37, 99, 235, 0.05);
        }

        .panel-tab.active {
            color: var(--a11y-primary);
            background: white;
        }

        .panel-tab.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 20%;
            right: 20%;
            height: 3px;
            background: var(--a11y-primary);
            border-radius: 3px 3px 0 0;
        }

        /* ===== PANEL CONTENT ===== */
        #panel-content {
            flex: 1 1 auto;
            overflow-y: auto;
            max-height: 60vh;
            padding: 16px;
            overscroll-behavior: contain;
        }
        
        #panel-content::-webkit-scrollbar {
            width: 6px;
        }
        #panel-content::-webkit-scrollbar-track {
            background: var(--a11y-bg-secondary);
        }
        #panel-content::-webkit-scrollbar-thumb {
            background: var(--a11y-border);
            border-radius: 3px;
        }
        #panel-content::-webkit-scrollbar-thumb:hover {
            background: var(--a11y-text-muted);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* ===== TOOL SECTIONS ===== */
        .tool-section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 13px !important;
            font-weight: 600;
            color: var(--a11y-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px !important;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-title i {
            color: var(--a11y-primary);
        }

        /* ===== SLIDER CONTROLS ===== */
        .slider-control {
            display: flex;
            align-items: center;
            gap: 12px;
            background: var(--a11y-bg-secondary);
            padding: 12px;
            border-radius: 12px;
            border: 1px solid var(--a11y-border);
        }

        .control-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: white;
            border: 1px solid var(--a11y-border);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--a11y-transition);
            color: var(--a11y-text);
        }

        .control-btn:hover {
            background: var(--a11y-primary);
            color: white;
            border-color: var(--a11y-primary);
        }

        .control-btn:active {
            transform: scale(0.95);
        }

        .slider-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .slider-wrapper input[type="range"] {
            width: 100%;
            height: 6px;
            -webkit-appearance: none;
            appearance: none;
            background: var(--a11y-border);
            border-radius: 3px;
            cursor: pointer;
        }

        .slider-wrapper input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: var(--a11y-primary);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
            transition: var(--a11y-transition);
        }

        .slider-wrapper input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
        }

        .slider-value {
            font-size: 12px;
            color: var(--a11y-text-muted);
            text-align: center;
        }

        /* ===== TOGGLE GRID ===== */
        .toggle-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .toggle-btn, .action-card-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 16px 12px;
            background: var(--a11y-bg-secondary);
            border: 2px solid var(--a11y-border);
            border-radius: 12px;
            cursor: pointer;
            transition: var(--a11y-transition);
            position: relative;
        }

        .toggle-btn i, .action-card-btn i {
            font-size: 20px;
            color: var(--a11y-text-muted);
            transition: var(--a11y-transition);
        }

        .toggle-btn span, .action-card-btn span {
            font-size: 12px !important;
            font-weight: 500;
            line-height: normal !important;
            color: var(--a11y-text);
        }

        .toggle-indicator {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--a11y-border);
            transition: var(--a11y-transition);
        }

        .toggle-btn:hover, .action-card-btn:hover {
            border-color: var(--a11y-primary);
            background: rgba(37, 99, 235, 0.05);
        }

        .toggle-btn:hover i, .action-card-btn:hover i {
            color: var(--a11y-primary);
        }

        .toggle-btn.active {
            border-color: var(--a11y-success);
            background: rgba(22, 163, 74, 0.1);
        }

        .toggle-btn.active i {
            color: var(--a11y-success);
        }

        .toggle-btn.active .toggle-indicator {
            background: var(--a11y-success);
            box-shadow: 0 0 8px rgba(22, 163, 74, 0.5);
        }

        /* ===== COLOR PRESETS ===== */
        .color-presets {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .color-preset {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            border: 2px solid var(--a11y-border);
            cursor: pointer;
            transition: var(--a11y-transition);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .color-preset:hover {
            transform: scale(1.1);
            border-color: var(--a11y-primary);
        }

        .color-preset.active {
            border-color: var(--a11y-success);
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
        }

        /* ===== FONT SELECTOR ===== */
        .font-selector {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }

        .font-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 12px 8px;
            background: var(--a11y-bg-secondary);
            border: 2px solid var(--a11y-border);
            border-radius: 10px;
            cursor: pointer;
            transition: var(--a11y-transition);
        }

        .font-option span:first-child {
            font-size: 24px;
            line-height: 1;
        }

        .font-option span:last-child {
            font-size: 10px;
            color: var(--a11y-text-muted);
        }

        .font-option:hover {
            border-color: var(--a11y-primary);
        }

        .font-option.active {
            border-color: var(--a11y-success);
            background: rgba(22, 163, 74, 0.1);
        }

        /* ===== VOICE CONTROLS ===== */
        .voice-control {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .voice-control label {
            width: 60px;
            font-size: 12px;
            color: var(--a11y-text-muted);
        }

        .voice-control select {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--a11y-border);
            border-radius: 8px;
            background: white;
            font-size: 13px;
        }

        .voice-control input[type="range"] {
            flex: 1;
        }

        .voice-control span {
            width: 50px;
            font-size: 12px;
            color: var(--a11y-text-muted);
            text-align: right;
        }

        /* ===== KEYBOARD SHORTCUTS ===== */
        .keyboard-shortcuts {
            background: var(--a11y-bg-secondary);
            border-radius: 12px;
            padding: 12px;
            border: 1px solid var(--a11y-border);
        }

        .shortcut-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--a11y-border);
        }

        .shortcut-item:last-child {
            border-bottom: none;
        }

        .shortcut-item kbd {
            background: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
            border: 1px solid var(--a11y-border);
            box-shadow: 0 2px 0 var(--a11y-border);
        }

        .shortcut-item span {
            font-size: 12px;
            color: var(--a11y-text-muted);
        }

        /* ===== PAGE STRUCTURE ===== */
        .page-structure {
            background: var(--a11y-bg-secondary);
            border-radius: 12px;
            padding: 12px;
            border: 1px solid var(--a11y-border);
            max-height: 200px;
            overflow-y: auto;
        }

        .structure-item {
            padding: 8px 12px;
            margin: 4px 0;
            background: white;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: var(--a11y-transition);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .structure-item:hover {
            background: rgba(37, 99, 235, 0.1);
            color: var(--a11y-primary);
        }

        .structure-item i {
            color: var(--a11y-primary);
            width: 16px;
        }

        .loading-text {
            text-align: center;
            color: var(--a11y-text-muted);
            font-size: 13px;
            padding: 20px;
        }

        /* ===== ACTION BUTTON ===== */
        .action-btn {
            width: 100%;
            padding: 12px;
            background: var(--a11y-primary);
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--a11y-transition);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 12px;
        }

        .action-btn:hover {
            background: var(--a11y-primary-dark);
        }

        /* ===== PANEL FOOTER ===== */
        #panel-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: var(--a11y-bg-secondary);
            border-top: 1px solid var(--a11y-border);
        }

        .footer-info {
            font-size: 11px;
            color: var(--a11y-text-muted);
        }

        .footer-actions {
            display: flex;
            gap: 8px;
        }

        .footer-btn {
            padding: 8px 12px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: var(--a11y-transition);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .footer-btn.secondary {
            background: white;
            color: var(--a11y-text);
            border: 1px solid var(--a11y-border);
        }

        .footer-btn.secondary:hover {
            background: var(--a11y-bg-secondary);
        }

        .footer-btn.danger {
            background: var(--a11y-danger);
            color: white;
        }

        .footer-btn.danger:hover {
            background: #b91c1c;
        }

        /* ===== READING GUIDE ===== */
        #reading-guide-line {
            display: none;
            position: fixed;
            left: 0;
            width: 100%;
            height: 40px;
            background: linear-gradient(
                to bottom,
                transparent 0%,
                rgba(37, 99, 235, 0.1) 45%,
                rgba(37, 99, 235, 0.3) 50%,
                rgba(37, 99, 235, 0.1) 55%,
                transparent 100%
            );
            z-index: 99998;
            pointer-events: none;
            border-top: 2px solid rgba(37, 99, 235, 0.5);
            border-bottom: 2px solid rgba(37, 99, 235, 0.5);
        }

        body.reading-guide #reading-guide-line {
            display: block;
        }

        /* ===== READING MASK ===== */
        #reading-mask-top,
        #reading-mask-bottom {
            display: none;
            position: fixed;
            left: 0;
            width: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 99997;
            pointer-events: none;
            transition: height 0.1s ease;
        }

        #reading-mask-top {
            top: 0;
        }

        #reading-mask-bottom {
            bottom: 0;
        }

        body.reading-mask #reading-mask-top,
        body.reading-mask #reading-mask-bottom {
            display: block;
        }

        /* ===== GLOBAL ACCESSIBILITY STYLES ===== */
        .main-content, .lesson-content, .content-section, .activity-container {
            font-size: calc(16px + var(--font-size-adjust, 0px));
            line-height: calc(1.6 + var(--line-height-adjust, 0)) !important;
            letter-spacing: calc(0px + var(--letter-spacing-adjust, 0px)) !important;
        }

        i.fas, i.far, i.fab, .fa, .fas, .far, .fab {
            font-size: inherit;
            letter-spacing: normal !important;
        }

        /* ===== DYSLEXIA MODE ===== */
        body.dyslexia {
            font-family: 'OpenDyslexic', 'Comic Sans MS', 'Verdana', sans-serif !important;
        }

        body.dyslexia * {
            font-family: inherit !important;
        }

        /* ===== SERIF MODE ===== */
        body.font-serif {
            font-family: Georgia, 'Times New Roman', serif !important;
        }

        body.font-serif * {
            font-family: inherit !important;
        }

        /* ===== MONO MODE ===== */
        body.font-mono {
            font-family: 'Courier New', Consolas, monospace !important;
        }

        body.font-mono * {
            font-family: inherit !important;
        }

        /* ===== BACKGROUND COLORS ===== */
        body.bg-sepia {
            background-color: #fdf5e6 !important;
        }

        body.bg-sepia .section-card,
        body.bg-sepia .hw-section,
        body.bg-sepia .card,
        body.bg-sepia .content-box {
            background-color: #fffaf0 !important;
        }

        body.bg-cream {
            background-color: #fffef0 !important;
        }

        body.bg-light-blue {
            background-color: #e8f4fc !important;
        }

        body.bg-light-green {
            background-color: #e8fce8 !important;
        }

        body.bg-light-pink {
            background-color: #fce8f4 !important;
        }

        /* ===== DARK MODE ===== */
        body.dark-mode {
            background-color: #0f172a !important;
            color: #e2e8f0 !important;
        }

        body.dark-mode .section-card,
        body.dark-mode .quiz-container,
        body.dark-mode .hw-section,
        body.dark-mode #fixed-footer,
        body.dark-mode #highlighter-toolbar,
        body.dark-mode .sidebar,
        body.dark-mode .progress-tracker,
        body.dark-mode .text-content,
        body.dark-mode details.content-section,
        body.dark-mode .text-content-box,
        body.dark-mode .activity,
        body.dark-mode .paragraph-content,
        body.dark-mode .card {
            background-color: #1e293b !important;
            border-color: #334155 !important;
            color: #e2e8f0 !important;
        }

        body.dark-mode details.content-section summary {
            background-color: #1e293b !important;
            color: #e2e8f0 !important;
            border-color: #334155 !important;
        }

        body.dark-mode .page-header {
            box-shadow: inset 0 0 0 1000px rgba(0, 0, 0, 0.7) !important;
        }

        body.dark-mode h1,
        body.dark-mode h2,
        body.dark-mode h3,
        body.dark-mode h4,
        body.dark-mode h5,
        body.dark-mode h6,
        body.dark-mode a {
            color: #e2e8f0 !important;
        }

        body.dark-mode #accessibility-panel {
            background-color: #1e293b !important;
            color: #e2e8f0 !important;
        }

        body.dark-mode #panel-tabs {
            background-color: #0f172a !important;
        }

        body.dark-mode .panel-tab {
            color: #94a3b8 !important;
        }

        body.dark-mode .panel-tab.active {
            background-color: #1e293b !important;
            color: #3b82f6 !important;
        }

        body.dark-mode .tool-section,
        body.dark-mode .slider-control,
        body.dark-mode .toggle-btn,
        body.dark-mode .action-card-btn,
        body.dark-mode .font-option,
        body.dark-mode .keyboard-shortcuts,
        body.dark-mode .page-structure {
            background-color: #0f172a !important;
            border-color: #334155 !important;
        }

        body.dark-mode .control-btn,
        body.dark-mode .color-preset,
        body.dark-mode .structure-item {
            background-color: #334155 !important;
            border-color: #475569 !important;
            color: #e2e8f0 !important;
        }

        body.dark-mode #panel-footer {
            background-color: #0f172a !important;
            border-color: #334155 !important;
        }

        body.dark-mode .footer-btn.secondary {
            background-color: #334155 !important;
            color: #e2e8f0 !important;
            border-color: #475569 !important;
        }

        body.dark-mode .sticky-note {
            background-color: #3e3e2b !important;
            color: #f0f0f0 !important;
            border: 1px solid #5a5a42 !important;
        }

        body.dark-mode .section-title {
            color: #94a3b8 !important;
        }

        body.dark-mode .slider-value,
        body.dark-mode .shortcut-item span,
        body.dark-mode .font-option span:last-child,
        body.dark-mode .voice-control label,
        body.dark-mode .footer-info {
            color: #94a3b8 !important;
        }

        /* ===== IMMERSIVE MODE ===== */
        body.immersive-mode {
            background-color: #fdf6e3 !important;
            color: #1a202c !important;
        }
        body.immersive-mode.dark-mode {
            background-color: #0f172a !important;
            color: #e2e8f0 !important;
        }
        body.immersive-mode > *:not(#accessibility-widget):not(#accessibility-widget *) {
            background-color: transparent !important;
            box-shadow: none !important;
            max-width: 900px !important;
            margin-inline: auto !important;
        }

        body.immersive-mode .lesson-sidebar,
        body.immersive-mode .extra-sidebar {
            display: none !important;
        }
        /* ===== HIGH CONTRAST ===== */
        body.high-contrast {
            filter: contrast(125%) saturate(120%);
        }

        /* ===== GRAYSCALE ===== */
        body.grayscale {
            filter: grayscale(100%);
        }

        /* ===== INVERT COLORS ===== */
        body.invert-colors {
            filter: invert(100%);
        }

        body.invert-colors img,
        body.invert-colors video {
            filter: invert(100%);
        }

        /* ===== HIGHLIGHT TITLES ===== */
        body.highlight-titles h1,
        body.highlight-titles h2,
        body.highlight-titles h3,
        body.highlight-titles h4,
        body.highlight-titles h5,
        body.highlight-titles h6 {
            background: linear-gradient(to right, #fef08a, #fde047) !important;
            color: #1e293b !important;
            padding: 4px 8px !important;
            border-radius: 4px !important;
            display: inline-block !important;
        }

        /* ===== HIGHLIGHT LINKS ===== */
        body.highlight-links a {
            background: linear-gradient(to right, #bfdbfe, #93c5fd) !important;
            color: #1e40af !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            text-decoration: underline !important;
            font-weight: 600 !important;
        }

        /* ===== HIDE IMAGES ===== */
        body.hide-images img,
        body.hide-images svg:not(#accessibility-widget svg),
        body.hide-images picture,
        body.hide-images figure img {
            visibility: hidden !important;
        }

        /* ===== SIMPLIFY LAYOUT ===== */
        body.simplify-layout * {
            animation: none !important;
            transition: none !important;
        }

        body.simplify-layout .sidebar,
        body.simplify-layout .ad,
        body.simplify-layout .advertisement,
        body.simplify-layout [class*="sidebar"]:not(.produce-support-left):not(.practice-sidebar) {
            display: none !important;
        }

        /* ===== BIG CURSOR ===== */
        body.big-cursor,
        body.big-cursor * {
            cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M5.5 3.21V20.8l4.86-4.86h5.36L5.5 3.21z'/%3E%3Cpath fill='%23fff' d='M6.5 5.61l8.09 10.03H10.5l-4 4V5.61z'/%3E%3C/svg%3E") 0 0, auto !important;
        }

        /* ===== PRINT FRIENDLY ===== */
        body.print-friendly {
            background: white !important;
            color: black !important;
        }

        body.print-friendly * {
            background: transparent !important;
            color: black !important;
            box-shadow: none !important;
        }

        body.print-friendly details {
            display: block !important;
        }

        body.print-friendly details[open] summary {
            display: none !important;
        }

        body.print-friendly #accessibility-widget,
        body.print-friendly .no-print {
            display: none !important;
        }

        @media print {
            #accessibility-widget {
                display: none !important;
            }
        }

        /* ===== TEXT TO SPEECH HIGHLIGHT ===== */
        .tts-highlight {
            background: linear-gradient(to right, #fef08a, #fde047) !important;
            padding: 2px 4px;
            border-radius: 4px;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 480px) {
            #accessibility-panel {
                width: calc(100vw - 32px);
                right: 16px;
                bottom: 80px;
                height: max-content;
                max-height: calc(100vh - 100px);
            }

            #accessibility-widget {
                right: 16px;
                bottom: 16px;
            }

            #accessibility-toggle {
                width: 48px;
                height: 48px;
                font-size: 20px;
            }

            .toggle-grid {
                grid-template-columns: 1fr;
            }

            .font-selector {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    `;

    const js = `
        (function() {
        const SETTINGS_KEY = 'accessibilitySettings_v5';
        const body = document.body;
        const root = document.documentElement;

        const defaults = {
            fontSize: 0,
            lineHeight: 0,
            letterSpacing: 0,
            dyslexia: false,
            fontSerif: false,
            fontMono: false,
            backgroundColor: 'default',
            darkMode: false,
            highContrast: false,
            grayscale: false,
            invertColors: false,
            readingGuide: false,
            readingMask: false,
            highlightLinks: false,
            highlightTitles: false,
            hideImages: false,
            simplifyLayout: false,
            bigCursor: false,
            textToSpeech: false,
            printFriendly: false,
            immersiveMode: false,
            ttsVoice: '',
            ttsRate: 1,
            ttsPitch: 1,
            profileSeizure: false,
            profileBlind: false,
            profileVision: false,
            profileAdhd: false,
            profileCognitive: false,
            profileMotor: false
        };

        let settings = { ...defaults };

        const panel = document.getElementById('accessibility-panel');
        const toggle = document.getElementById('accessibility-toggle');

        // ===== UTILITY FUNCTIONS =====
        function saveSettings() {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            } catch (e) {}
        }

        function applySettings() {
            // Apply CSS variables
            root.style.setProperty('--font-size-adjust', settings.fontSize + 'px');
            root.style.setProperty('--line-height-adjust', settings.lineHeight);
            root.style.setProperty('--letter-spacing-adjust', settings.letterSpacing + 'px');

            // Update sliders
            const textSlider = document.getElementById('text-size-slider');
            const lineSlider = document.getElementById('line-height-slider');
            const letterSlider = document.getElementById('letter-spacing-slider');

            if (textSlider) {
                textSlider.value = settings.fontSize;
                document.getElementById('text-size-value').textContent = Math.round(100 + (settings.fontSize / 16 * 100)) + '%';
            }
            if (lineSlider) {
                lineSlider.value = settings.lineHeight;
                const lineVal = settings.lineHeight === 0 ? 'Normal' : (settings.lineHeight > 0 ? '+' : '') + (settings.lineHeight * 100).toFixed(0) + '%';
                document.getElementById('line-height-value').textContent = lineVal;
            }
            if (letterSlider) {
                letterSlider.value = settings.letterSpacing;
                document.getElementById('letter-spacing-value').textContent = settings.letterSpacing === 0 ? 'Normal' : '+' + settings.letterSpacing + 'px';
            }

            // Apply boolean classes
            const classMap = {
                dyslexia: 'dyslexia',
                fontSerif: 'font-serif',
                fontMono: 'font-mono',
                darkMode: 'dark-mode',
                highContrast: 'high-contrast',
                grayscale: 'grayscale',
                invertColors: 'invert-colors',
                readingGuide: 'reading-guide',
                readingMask: 'reading-mask',
                highlightLinks: 'highlight-links',
                highlightTitles: 'highlight-titles',
                hideImages: 'hide-images',
                simplifyLayout: 'simplify-layout',
                bigCursor: 'big-cursor',
                printFriendly: 'print-friendly',
                immersiveMode: 'immersive-mode',
                profileSeizure: 'seizure-safe',
                profileVision: 'visually-impaired',
                profileAdhd: 'adhd-friendly',
                profileCognitive: 'cognitive-profile',
                profileMotor: 'motor-impaired'
            };

            Object.entries(classMap).forEach(([key, className]) => {
                body.classList.toggle(className, settings[key]);
            });

            // Apply background color
            const bgClasses = ['bg-sepia', 'bg-cream', 'bg-light-blue', 'bg-light-green', 'bg-light-pink'];
            bgClasses.forEach(cls => body.classList.remove(cls));
            if (settings.backgroundColor !== 'default') {
                body.classList.add('bg-' + settings.backgroundColor);
            }

            // Update profile cards
            document.querySelectorAll('.profile-card').forEach(card => {
                const p = card.dataset.profile;
                let isActive = false;
                if (p === 'seizure') isActive = settings.profileSeizure;
                if (p === 'blind') isActive = settings.profileBlind;
                if (p === 'visually-impaired') isActive = settings.profileVision;
                if (p === 'adhd') isActive = settings.profileAdhd;
                if (p === 'cognitive') isActive = settings.profileCognitive;
                if (p === 'motor') isActive = settings.profileMotor;
                card.classList.toggle('active', isActive);
            });

            // Update toggle buttons
            document.querySelectorAll('.toggle-btn[data-tool]').forEach(btn => {
                const tool = btn.dataset.tool.replace('toggle-', '').replace(/-([a-z])/g, g => g[1].toUpperCase());
                btn.classList.toggle('active', !!settings[tool]);
            });

            // Update font options
            document.querySelectorAll('.font-option').forEach(btn => {
                const font = btn.dataset.font;
                let isActive = false;
                if (font === 'default') isActive = !settings.dyslexia && !settings.fontSerif && !settings.fontMono;
                if (font === 'dyslexia') isActive = settings.dyslexia;
                if (font === 'serif') isActive = settings.fontSerif;
                if (font === 'mono') isActive = settings.fontMono;
                btn.classList.toggle('active', isActive);
            });

            // Update color presets
            document.querySelectorAll('.color-preset').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.bg === settings.backgroundColor);
            });

            // Show/hide TTS settings
            const ttsSettings = document.getElementById('tts-settings');
            if (ttsSettings) {
                ttsSettings.style.display = (settings.textToSpeech || settings.profileBlind) ? 'block' : 'none';
            }

            // Update TTS sliders and dropdown to match settings (useful for reset)
            const ttsRate = document.getElementById('tts-rate');
            if (ttsRate) {
                ttsRate.value = settings.ttsRate;
                const textElem = document.getElementById('tts-rate-value');
                if(textElem) textElem.textContent = settings.ttsRate + 'x';
            }
            const ttsPitch = document.getElementById('tts-pitch');
            if (ttsPitch) {
                ttsPitch.value = settings.ttsPitch;
                const pitchText = settings.ttsPitch < 0.9 ? 'Low' : settings.ttsPitch > 1.1 ? 'High' : 'Normal';
                const textElem = document.getElementById('tts-pitch-value');
                if(textElem) textElem.textContent = pitchText;
            }
            const ttsVoiceSelect = document.getElementById('tts-voice-select');
            if (ttsVoiceSelect) {
                ttsVoiceSelect.value = settings.ttsVoice;
            }

            // Apply print friendly mode
            if (settings.printFriendly) {
                document.querySelectorAll('details').forEach(d => d.open = true);
            }
        }

        function loadSettings() {
            let saved = null;
            try {
                saved = localStorage.getItem(SETTINGS_KEY);
            } catch (e) {}
            if (saved) {
                try {
                    settings = { ...defaults, ...JSON.parse(saved) };
                } catch (e) {
                    console.error('Failed to load accessibility settings:', e);
                }
            }
            applySettings();
            populateVoices();
            analyzePageStructure();
        }

        function handleToolClick(tool) {
            switch (tool) {
                case 'increase-text':
                    settings.fontSize = Math.min(50, settings.fontSize + 2);
                    break;
                case 'decrease-text':
                    settings.fontSize = Math.max(-10, settings.fontSize - 2);
                    break;
                case 'increase-line-height':
                    settings.lineHeight = Math.min(0.8, parseFloat((settings.lineHeight + 0.1).toFixed(2)));
                    break;
                case 'decrease-line-height':
                    settings.lineHeight = Math.max(-0.5, parseFloat((settings.lineHeight - 0.1).toFixed(2)));
                    break;
                case 'increase-letter-spacing':
                    settings.letterSpacing = Math.min(5, parseFloat((settings.letterSpacing + 0.5).toFixed(1)));
                    break;
                case 'decrease-letter-spacing':
                    settings.letterSpacing = Math.max(0, parseFloat((settings.letterSpacing - 0.5).toFixed(1)));
                    break;
                case 'toggle-dyslexia':
                    settings.dyslexia = !settings.dyslexia;
                    if (settings.dyslexia) {
                        settings.fontSerif = false;
                        settings.fontMono = false;
                    }
                    break;
                case 'toggle-dark-mode':
                    settings.darkMode = !settings.darkMode;
                    break;
                case 'toggle-high-contrast':
                    settings.highContrast = !settings.highContrast;
                    break;
                case 'toggle-grayscale':
                    settings.grayscale = !settings.grayscale;
                    break;
                case 'toggle-invert-colors':
                    settings.invertColors = !settings.invertColors;
                    break;
                case 'toggle-reading-guide':
                    settings.readingGuide = !settings.readingGuide;
                    if (settings.readingGuide) settings.readingMask = false;
                    break;
                case 'toggle-reading-mask':
                    settings.readingMask = !settings.readingMask;
                    if (settings.readingMask) settings.readingGuide = false;
                    break;
                case 'toggle-highlight-links':
                    settings.highlightLinks = !settings.highlightLinks;
                    break;
                case 'toggle-highlight-titles':
                    settings.highlightTitles = !settings.highlightTitles;
                    break;
                case 'toggle-hide-images':
                    settings.hideImages = !settings.hideImages;
                    break;
                case 'toggle-simplify-layout':
                    settings.simplifyLayout = !settings.simplifyLayout;
                    break;
                case 'toggle-immersive-mode':
                    settings.immersiveMode = !settings.immersiveMode;
                    break;
                case 'toggle-google-translate': {
                    if (!document.getElementById('google_translate_script')) {
                        const script = document.createElement('script');
                        script.id = 'google_translate_script';
                        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
                        document.body.appendChild(script);
                        window.googleTranslateElementInit = function() {
                            new window.google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element');
                        };
                        const container = document.createElement('div');
                        container.id = 'google_translate_element';
                        container.style.position = 'fixed';
                        container.style.bottom = '20px';
                        container.style.left = '20px';
                        container.style.zIndex = '100000';
                        document.body.appendChild(container);
                    } else {
                        const el = document.getElementById('google_translate_element');
                        if (el) {
                            el.style.display = el.style.display === 'none' ? 'block' : 'none';
                        }
                    }
                    return; // Don't trigger standard visual reload
                }
                case 'open-pdf-reader': {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/pdf';
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const readerWrapper = document.getElementById('a11y-pdf-reader');
                            const readerContent = document.getElementById('pdf-reader-content');
                            const readerStatus = document.getElementById('pdf-reader-status');
                            
                            readerWrapper.style.display = 'block';
                            readerContent.innerHTML = '';
                            readerStatus.textContent = 'Loading PDF engine...';

                            try {
                                if (!window.pdfjsLib) {
                                    const script = document.createElement('script');
                                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                                    document.body.appendChild(script);
                                    await new Promise((resolve, reject) => {
                                        script.onload = () => {
                                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                            resolve();
                                        };
                                        script.onerror = reject;
                                    });
                                }

                                readerStatus.textContent = 'Parsing PDF document...';
                                const arrayBuffer = await file.arrayBuffer();
                                const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
                                const pdf = await loadingTask.promise;
                                
                                readerStatus.textContent = 'Extracting ' + pdf.numPages + ' pages...';
                                
                                let combinedHtml = '';
                                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                                    const page = await pdf.getPage(pageNum);
                                    const textContent = await page.getTextContent();
                                    
                                    let lastY = null;
                                    let pageHtml = '<p style="margin-top: 10px;">';
                                    for (let item of textContent.items) {
                                        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 12) {
                                            pageHtml += '</p><p>';
                                        }
                                        pageHtml += item.str + ' ';
                                        lastY = item.transform[5];
                                    }
                                    pageHtml += '</p>';
                                    
                                    combinedHtml += '<div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px dashed var(--a11y-border);">';
                                    combinedHtml += '<h3 style="font-size: 0.8em; color: var(--a11y-text-muted);">Page ' + pageNum + '</h3>';
                                    combinedHtml += pageHtml + '</div>';
                                    
                                    readerStatus.textContent = 'Extracted page ' + pageNum + ' of ' + pdf.numPages + '...';
                                }
                                
                                readerContent.innerHTML = combinedHtml;
                                readerStatus.textContent = '';
                                
                            } catch (err) {
                                console.error('Error reading PDF:', err);
                                readerStatus.textContent = 'Error parsing PDF: ' + err.message;
                            }
                        }
                    };
                    input.click();
                    return; // Don't trigger visual reload
                }
                case 'toggle-big-cursor':
                    settings.bigCursor = !settings.bigCursor;
                    break;
                case 'toggle-text-to-speech':
                    settings.textToSpeech = !settings.textToSpeech;
                    if (!settings.textToSpeech) {
                        window.speechSynthesis?.cancel();
                    }
                    break;
                case 'toggle-print-friendly':
                    settings.printFriendly = !settings.printFriendly;
                    break;
                case 'reset':
                    if (confirm('Reset all accessibility settings to defaults?')) {
                        settings = { ...defaults };
                    }
                    break;
            }
            saveSettings();
            applySettings();
        }

        function handleFontChange(font) {
            settings.dyslexia = font === 'dyslexia';
            settings.fontSerif = font === 'serif';
            settings.fontMono = font === 'mono';
            saveSettings();
            applySettings();
        }

        function handleBackgroundChange(bg) {
            settings.backgroundColor = bg;
            saveSettings();
            applySettings();
        }

        function populateVoices() {
            const select = document.getElementById('tts-voice-select');
            if (!select) return;

            const updateVoices = () => {
                const voices = window.speechSynthesis?.getVoices() || [];
                select.innerHTML = '<option value="">Default</option>';
                voices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.voiceURI;
                    option.textContent = voice.name + ' (' + voice.lang + ')';
                    select.appendChild(option);
                });
                if (settings.ttsVoice) {
                    select.value = settings.ttsVoice;
                }
            };

            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = updateVoices;
                updateVoices();
            }
        }

        function analyzePageStructure() {
            const container = document.getElementById('page-structure');
            if (!container) return;

            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            if (headings.length === 0) {
                container.innerHTML = '<p class="loading-text">No headings found on this page.</p>';
                return;
            }

            let html = '';
            headings.forEach((h, i) => {
                const level = parseInt(h.tagName[1]);
                const indent = (level - 1) * 12;
                const icon = level === 1 ? 'fa-heading' : 'fa-chevron-right';
                html += \`<div class="structure-item" style="padding-left: \${indent + 12}px;" onclick="document.querySelectorAll('h1,h2,h3,h4,h5,h6')[\${i}].scrollIntoView({behavior:'smooth',block:'center'})">
                    <i class="fas \${icon}"></i>
                    <span>\${h.textContent.slice(0, 40)}\${h.textContent.length > 40 ? '...' : ''}</span>
                </div>\`;
            });
            container.innerHTML = html;
        }

        // ===== EVENT LISTENERS =====

        // Toggle panel
        toggle?.addEventListener('click', () => {
            const willBeOpen = panel.style.display === 'none' || panel.style.display === '';
            panel.style.display = willBeOpen ? 'flex' : 'none';
            document.body.classList.toggle('a11y-panel-open', willBeOpen);
        });

        // Close panel
        document.getElementById('panel-close')?.addEventListener('click', () => {
            panel.style.display = 'none';
            document.body.classList.remove('a11y-panel-open');
        });

        // Tab switching
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.querySelector(\`.tab-content[data-tab="\${tabName}"]\`)?.classList.add('active');
            });
        });

        // Tool clicks
        panel?.addEventListener('click', (e) => {
            const profileCard = e.target.closest('.profile-card');
            if (profileCard) {
                const p = profileCard.dataset.profile;
                if (p === 'seizure') settings.profileSeizure = !settings.profileSeizure;
                else if (p === 'blind') {
                    settings.profileBlind = !settings.profileBlind;
                    settings.textToSpeech = settings.profileBlind;
                }
                else if (p === 'visually-impaired') {
                    settings.profileVision = !settings.profileVision;
                    settings.highContrast = settings.profileVision;
                }
                else if (p === 'adhd') {
                    settings.profileAdhd = !settings.profileAdhd;
                    settings.simplifyLayout = settings.profileAdhd;
                }
                else if (p === 'cognitive') {
                    settings.profileCognitive = !settings.profileCognitive;
                    settings.readingGuide = settings.profileCognitive;
                }
                else if (p === 'motor') {
                    settings.profileMotor = !settings.profileMotor;
                }
                saveSettings();
                applySettings();
                return;
            }

            const toolBtn = e.target.closest('[data-tool]');
            if (toolBtn) {
                handleToolClick(toolBtn.dataset.tool);
            }

            const fontBtn = e.target.closest('.font-option');
            if (fontBtn) {
                handleFontChange(fontBtn.dataset.font);
            }

            const colorBtn = e.target.closest('.color-preset');
            if (colorBtn) {
                handleBackgroundChange(colorBtn.dataset.bg);
            }
        });

        // Slider inputs
        document.getElementById('text-size-slider')?.addEventListener('input', (e) => {
            settings.fontSize = parseInt(e.target.value);
            saveSettings();
            applySettings();
        });

        document.getElementById('line-height-slider')?.addEventListener('input', (e) => {
            settings.lineHeight = parseFloat(e.target.value);
            saveSettings();
            applySettings();
        });

        document.getElementById('letter-spacing-slider')?.addEventListener('input', (e) => {
            settings.letterSpacing = parseFloat(e.target.value);
            saveSettings();
            applySettings();
        });

        // TTS settings
        document.getElementById('tts-voice-select')?.addEventListener('change', (e) => {
            settings.ttsVoice = e.target.value;
            saveSettings();
        });

        document.getElementById('tts-rate')?.addEventListener('input', (e) => {
            settings.ttsRate = parseFloat(e.target.value);
            document.getElementById('tts-rate-value').textContent = settings.ttsRate + 'x';
            saveSettings();
        });

        document.getElementById('tts-pitch')?.addEventListener('input', (e) => {
            settings.ttsPitch = parseFloat(e.target.value);
            const pitchText = settings.ttsPitch < 0.9 ? 'Low' : settings.ttsPitch > 1.1 ? 'High' : 'Normal';
            document.getElementById('tts-pitch-value').textContent = pitchText;
            saveSettings();
        });

        // Reading guide/mask mouse movement
        window.addEventListener('mousemove', (e) => {
            if (settings.readingGuide) {
                const guide = document.getElementById('reading-guide-line');
                if (guide) {
                    guide.style.top = (e.clientY - 20) + 'px';
                }
            }
            if (settings.readingMask) {
                const top = document.getElementById('reading-mask-top');
                const bottom = document.getElementById('reading-mask-bottom');
                const maskHeight = 60;
                if (top && bottom) {
                    top.style.height = Math.max(0, e.clientY - maskHeight) + 'px';
                    bottom.style.height = Math.max(0, window.innerHeight - e.clientY - maskHeight) + 'px';
                }
            }
        });

        // Text-to-speech on selection
        document.addEventListener('mouseup', () => {
            if (!settings.textToSpeech) return;
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            if (text && text.length > 0) {
                window.speechSynthesis?.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = settings.ttsRate;
                utterance.pitch = settings.ttsPitch;
                if (settings.ttsVoice) {
                    const voices = window.speechSynthesis?.getVoices() || [];
                    const voice = voices.find(v => v.voiceURI === settings.ttsVoice);
                    if (voice) utterance.voice = voice;
                }
                window.speechSynthesis?.speak(utterance);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'a':
                        e.preventDefault();
                        toggle?.click();
                        break;
                    case '=':
                    case '+':
                        e.preventDefault();
                        handleToolClick('increase-text');
                        break;
                    case '-':
                        e.preventDefault();
                        handleToolClick('decrease-text');
                        break;
                    case 'd':
                        e.preventDefault();
                        handleToolClick('toggle-dark-mode');
                        break;
                    case 'r':
                        e.preventDefault();
                        handleToolClick('toggle-reading-guide');
                        break;
                }
            }
            if (e.key === 'Escape' && (panel?.style.display === 'flex' || panel?.style.display === 'block')) {
                panel.style.display = 'none';
            }
        });

        // Close panel on outside click
        document.addEventListener('click', (e) => {
            const p = document.getElementById('accessibility-panel');
            const t = document.getElementById('accessibility-toggle');
            if (p && (p.style.display === 'flex' || p.style.display === 'block')) {
                const triggerBtn = e.target.closest('[title="Accessibility Tools"]') || e.target.closest('#accessibility-toggle') || e.target.closest('.a11y-trigger');
                if (!p.contains(e.target) && (!t || !t.contains(e.target)) && !triggerBtn) {
                    p.style.display = 'none';
                    document.body.classList.remove('a11y-panel-open');
                }
            }
        });

        // Blind profile hover read
        let lastReadElement = null;
        document.addEventListener('mouseover', (e) => {
            if (!settings.profileBlind) return;
            const target = e.target;
            if (target === lastReadElement) return;
            lastReadElement = target;

            const text = target.textContent || target.innerText || target.alt || target.ariaLabel;
            if (text && text.trim().length > 0 && text.trim().length < 100) {
                window.speechSynthesis?.cancel();
                const utterance = new SpeechSynthesisUtterance(text.trim());
                utterance.rate = settings.ttsRate;
                utterance.pitch = settings.ttsPitch;
                if (settings.ttsVoice) {
                    const voices = window.speechSynthesis?.getVoices() || [];
                    const voice = voices.find(v => v.voiceURI === settings.ttsVoice);
                    if (voice) utterance.voice = voice;
                }
                window.speechSynthesis?.speak(utterance);
            }
        });

        // Exit print mode button
        document.getElementById('exit-print-mode-btn')?.addEventListener('click', () => {
            settings.printFriendly = false;
            saveSettings();
            applySettings();
        });

        // Expose toggle function for external callers (e.g. annotation tools, Super Widget, Ctrl+/ shortcut)
        window.toggleAccessibilityWidget = function() {
            const p = document.getElementById('accessibility-panel');
            if (p) {
                const willBeOpen = p.style.display === 'none' || p.style.display === '' || getComputedStyle(p).display === 'none';
                p.style.display = willBeOpen ? 'flex' : 'none';
                document.body.classList.toggle('a11y-panel-open', willBeOpen);
            }
        };

        // Initialize
        loadSettings();
        })();
    `;

    return { html, css, js };
};