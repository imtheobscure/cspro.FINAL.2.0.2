export const getSmpCss = (): string => {
    return `
    /* ============================================================== */
    /* SUPER MEDIA PLAYER - Professional Glassmorphic Theme CSS      */
    /* Supports High Contrast Light & Dark Mode                      */
    /* ============================================================== */

    :root {
        --smp-bg: #fffdfa;
        --smp-card-bg: rgba(255, 255, 255, 0.85);
        --smp-border: #f0e6d2;
        --smp-border-hover: #d5c39e;
        --smp-text: #2d241e;
        --smp-text-muted: #8c7e72;
        --smp-accent: #f59e0b;
        --smp-accent-hover: #d97706;
        --smp-accent-glow: rgba(245, 158, 11, 0.25);
        --smp-accent-text: #ffffff;
        --smp-primary: #3b82f6;
        --smp-success: #10b981;
        --smp-error: #ef4444;
        --smp-glass-border: rgba(255, 255, 255, 0.5);
        --smp-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.05);
        --smp-shadow-lg: 0 20px 40px rgba(45, 36, 30, 0.15);
        --smp-radius: 16px;
        --smp-radius-sm: 10px;
    }

    #super-media-player.smp-dark {
        --smp-bg: #1e1b18;
        --smp-card-bg: rgba(30, 27, 24, 0.9);
        --smp-border: #3d352e;
        --smp-border-hover: #5c5045;
        --smp-text: #f5f0eb;
        --smp-text-muted: #a89f91;
        --smp-accent: #f59e0b;
        --smp-accent-hover: #fbbf24;
        --smp-accent-glow: rgba(245, 158, 11, 0.3);
        --smp-accent-text: #1e1b18;
        --smp-primary: #60a5fa;
        --smp-success: #34d399;
        --smp-error: #f87171;
        --smp-glass-border: rgba(255, 255, 255, 0.1);
        --smp-shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    #super-media-player {
        position: fixed;
        top: 60px;
        left: 80px;
        width: 960px;
        height: 640px;
        min-width: 480px;
        min-height: 380px;
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: var(--smp-radius);
        box-shadow: var(--smp-shadow-lg);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: var(--smp-text);
        box-sizing: border-box;
        transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }

    #super-media-player * {
        box-sizing: border-box;
    }

    #super-media-player.fullscreen {
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        border-radius: 0 !important;
        border: none !important;
        z-index: 20000 !important;
    }

    /* Header */
    #smp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 18px;
        background: rgba(245, 158, 11, 0.05);
        border-bottom: 1px solid var(--smp-border);
        cursor: move;
        user-select: none;
        flex-shrink: 0;
        gap: 12px;
    }

    .smp-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--smp-text);
    }

    .smp-drag-grip {
        color: var(--smp-text-muted);
        opacity: 0.6;
        cursor: grab;
    }

    .smp-brand-icon {
        color: var(--smp-accent);
        font-size: 1.15rem;
    }

    .smp-badge-pro {
        font-size: 0.65rem;
        font-weight: 800;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 0.5px;
    }

    .smp-header-center {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .smp-toggle-group {
        display: flex;
        background: rgba(0, 0, 0, 0.06);
        padding: 3px;
        border-radius: 20px;
        border: 1px solid var(--smp-border);
    }

    .smp-toggle-btn {
        background: none;
        border: none;
        padding: 5px 12px;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--smp-text-muted);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .smp-toggle-btn.active {
        background: var(--smp-card-bg);
        color: var(--smp-accent);
        box-shadow: var(--smp-shadow-sm);
    }

    .smp-win-controls {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .smp-win-controls button, .smp-icon-btn {
        background: none;
        border: none;
        color: var(--smp-text-muted);
        width: 30px;
        height: 30px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        font-size: 0.85rem;
    }

    .smp-win-controls button:hover, .smp-icon-btn:hover {
        background: rgba(0, 0, 0, 0.08);
        color: var(--smp-text);
    }

    /* Subtitle Settings Popover */
    .smp-popover {
        position: absolute;
        top: 50px;
        left: 360px;
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: var(--smp-radius-sm);
        padding: 14px;
        box-shadow: var(--smp-shadow-lg);
        z-index: 1000;
        width: 280px;
        backdrop-filter: blur(20px);
    }

    .smp-popover-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        font-weight: 700;
    }

    .smp-setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 0.8rem;
    }

    .smp-btn-group-sm {
        display: flex;
        gap: 4px;
    }

    .smp-sub-size-btn, .smp-sub-pos-btn {
        background: rgba(0, 0, 0, 0.05);
        border: 1px solid var(--smp-border);
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 0.75rem;
        cursor: pointer;
        color: var(--smp-text);
    }

    .smp-sub-size-btn.active, .smp-sub-pos-btn.active {
        background: var(--smp-accent);
        color: white;
        border-color: var(--smp-accent);
    }

    .smp-setting-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--smp-border);
    }

    /* Main Content */
    #smp-main-content {
        display: flex;
        flex: 1;
        overflow: hidden;
        position: relative;
    }

    #smp-screen-area {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
        position: relative;
    }

    #smp-screen {
        position: relative;
        flex: 1;
        background: #000;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    #smp-video-el, #smp-yt-el, #smp-slideshow img, #smp-doc-viewer iframe {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    #smp-video-annotation-canvas, #smp-laser-canvas, #smp-slide-annotation-canvas, #smp-doc-annotation-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 5;
        pointer-events: none;
    }

    #smp-laser-canvas {
        z-index: 6;
    }

    /* Interactive Subtitle Display */
    #smp-subtitle-display {
        position: absolute;
        left: 5%;
        right: 5%;
        z-index: 10;
        text-align: center;
        pointer-events: auto;
        transition: all 0.2s ease;
    }

    #smp-subtitle-display.smp-sub-bottom {
        bottom: 18px;
    }

    #smp-subtitle-display.smp-sub-top {
        top: 18px;
    }

    #smp-sub-text-wrapper {
        display: inline-block;
        background: rgba(0, 0, 0, 0.78);
        color: #fff;
        padding: 6px 16px;
        border-radius: 8px;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        line-height: 1.4;
        max-width: 90%;
    }

    #smp-subtitle-display.smp-sub-small #smp-sub-text-wrapper { font-size: 0.85rem; }
    #smp-subtitle-display.smp-sub-medium #smp-sub-text-wrapper { font-size: 1.05rem; }
    #smp-subtitle-display.smp-sub-large #smp-sub-text-wrapper { font-size: 1.3rem; font-weight: 600; }

    .smp-sub-word {
        display: inline-block;
        padding: 0 2px;
        border-radius: 3px;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
    }

    .smp-sub-word:hover {
        background: var(--smp-accent);
        color: #1e1b18;
    }

    #smp-sub-action-bar {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-top: 6px;
    }

    #smp-sub-action-bar button {
        background: rgba(0, 0, 0, 0.65);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 3px 10px;
        font-size: 0.7rem;
        cursor: pointer;
    }

    #smp-sub-action-bar button:hover {
        background: var(--smp-accent);
        color: #000;
    }

    /* Word Card Popover */
    .smp-word-card {
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--smp-card-bg);
        color: var(--smp-text);
        border: 1px solid var(--smp-border);
        border-radius: var(--smp-radius-sm);
        padding: 12px 16px;
        box-shadow: var(--smp-shadow-lg);
        z-index: 100;
        width: 300px;
        backdrop-filter: blur(16px);
    }

    .smp-word-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .smp-wl-term {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--smp-accent);
    }

    .smp-wl-speak {
        background: none;
        border: none;
        color: var(--smp-primary);
        cursor: pointer;
    }

    .smp-wl-close {
        background: none;
        border: none;
        color: var(--smp-text-muted);
        font-size: 1.2rem;
        cursor: pointer;
    }

    .smp-word-card-actions {
        display: flex;
        gap: 6px;
        margin-top: 10px;
    }

    /* Placeholder Screen */
    #smp-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 34px 28px;
        background: radial-gradient(circle at center, rgba(30, 41, 59, 0.94) 0%, rgba(15, 23, 42, 0.98) 100%);
        border: 1.5px solid rgba(255, 255, 255, 0.22);
        border-radius: 22px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08);
        color: #f8fafc;
        max-width: 580px;
        width: 90%;
        margin: auto;
        z-index: 5;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
    }

    .smp-placeholder-icon {
        font-size: 3.8rem;
        color: #fbbf24;
        margin-bottom: 16px;
        opacity: 1;
        filter: drop-shadow(0 4px 18px rgba(245, 158, 11, 0.7));
    }

    .smp-ph-title {
        font-size: 1.45rem;
        font-weight: 800;
        color: #ffffff !important;
        letter-spacing: -0.01em;
        margin: 0 0 10px 0;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
    }

    .smp-ph-subtitle {
        font-size: 0.96rem;
        font-weight: 500;
        color: #e2e8f0 !important;
        max-width: 480px;
        margin: 0 0 24px 0;
        line-height: 1.55;
        text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
    }

    .smp-ph-btns {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
        width: 100%;
    }

    .smp-btn-glass {
        background: rgba(255, 255, 255, 0.22);
        border: 1.5px solid rgba(255, 255, 255, 0.5);
        color: #ffffff !important;
        padding: 10px 20px;
        border-radius: 24px;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .smp-btn-glass:hover {
        background: rgba(255, 255, 255, 0.35);
        border-color: #38bdf8;
        color: #ffffff !important;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
    }

    .smp-btn-glass.accent {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #ffffff !important;
        border: 1.5px solid #fbbf24;
        box-shadow: 0 4px 16px rgba(245, 158, 11, 0.55);
    }

    .smp-btn-glass.accent:hover {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        box-shadow: 0 6px 22px rgba(245, 158, 11, 0.75);
        transform: translateY(-2px);
    }

    /* Controls Bottom Bar */
    #smp-controls {
        background: rgba(245, 158, 11, 0.04);
        border-top: 1px solid var(--smp-border);
        padding: 8px 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-shrink: 0;
    }

    .smp-progress-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.75rem;
        color: var(--smp-text-muted);
        font-weight: 600;
    }

    #smp-progress-container {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
    }

    #smp-progress {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
    }

    #smp-progress::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--smp-accent);
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: transform 0.1s ease;
    }

    #smp-progress::-webkit-slider-thumb:hover {
        transform: scale(1.3);
    }

    #smp-timeline-markers {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .smp-timeline-marker {
        position: absolute;
        top: -3px;
        width: 8px;
        height: 12px;
        background: #3b82f6;
        border-radius: 2px;
        transform: translateX(-50%);
        cursor: pointer;
        pointer-events: auto;
        z-index: 2;
    }

    .smp-timeline-marker.completed {
        background: #10b981;
    }

    .smp-time-tooltip {
        position: absolute;
        top: -24px;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        pointer-events: none;
    }

    .smp-btn-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .smp-round-btn {
        background: rgba(0, 0, 0, 0.05);
        border: 1px solid var(--smp-border);
        color: var(--smp-text);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        transition: all 0.15s ease;
        text-decoration: none;
    }

    .smp-round-btn:hover {
        background: rgba(0, 0, 0, 0.1);
        transform: scale(1.05);
    }

    .smp-round-btn.main {
        width: 38px;
        height: 38px;
        background: var(--smp-accent);
        color: white;
        border-color: var(--smp-accent);
        font-size: 0.95rem;
    }

    .smp-round-btn.main:hover {
        background: var(--smp-accent-hover);
    }

    .smp-round-btn.smp-btn-sm {
        border-radius: 12px;
        width: auto;
        padding: 0 8px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .smp-round-btn.smp-tool-accent {
        background: rgba(245, 158, 11, 0.15);
        color: var(--smp-accent);
        border-color: rgba(245, 158, 11, 0.3);
    }

    .smp-round-btn.smp-tool-accent:hover {
        background: var(--smp-accent);
        color: white;
    }

    #smp-anno-toggle-btn.active, .smp-round-btn.smp-tool-accent.active {
        background: var(--smp-accent);
        color: white;
        border-color: var(--smp-accent);
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
    }

    .smp-control-group {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
    }

    .smp-control-group input[type="range"] {
        width: 60px;
        height: 4px;
        cursor: pointer;
    }

    .smp-divider {
        width: 1px;
        height: 18px;
        background: var(--smp-border);
        margin: 0 4px;
    }

    .smp-spacer {
        flex: 1;
    }

    .smp-tools {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .smp-icon-mute-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--smp-text);
    }

    /* Right Panel (Transcript) */
    #smp-right-panel {
        width: 340px;
        border-left: 1px solid var(--smp-border);
        background: rgba(0, 0, 0, 0.02);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
    }

    #smp-panel-tabs {
        display: flex;
        border-bottom: 1px solid var(--smp-border);
    }

    .smp-panel-tab {
        flex: 1;
        padding: 10px 4px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--smp-text-muted);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .smp-panel-tab.active {
        color: var(--smp-accent);
        border-bottom-color: var(--smp-accent);
        background: rgba(245, 158, 11, 0.05);
    }

    .smp-panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
    }

    .smp-transcript-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
    }

    .smp-search-box {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
    }

    .smp-search-box i {
        position: absolute;
        left: 8px;
        color: var(--smp-text-muted);
        font-size: 0.75rem;
    }

    .smp-search-box input {
        width: 100%;
        padding: 5px 24px 5px 26px;
        border-radius: 12px;
        border: 1px solid var(--smp-border);
        background: var(--smp-card-bg);
        color: var(--smp-text);
        font-size: 0.75rem;
    }

    .smp-transcript-line {
        padding: 8px 10px;
        border-radius: 8px;
        margin-bottom: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.15s ease;
        line-height: 1.4;
    }

    .smp-transcript-line:hover {
        background: rgba(0, 0, 0, 0.04);
    }

    .smp-transcript-line.active-line {
        background: rgba(245, 158, 11, 0.18);
        border-left: 3px solid var(--smp-accent);
        font-weight: 600;
    }

    .smp-line-icons {
        display: flex;
        gap: 4px;
        opacity: 0.7;
    }

    .smp-line-icon-btn {
        background: none;
        border: none;
        color: var(--smp-text-muted);
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 4px;
    }

    .smp-line-icon-btn:hover {
        color: var(--smp-accent);
    }

    /* Modals & Overlays */
    .smp-modal, .smp-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(10px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .smp-modal-content, .smp-overlay-content {
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: var(--smp-radius);
        box-shadow: var(--smp-shadow-lg);
        width: 100%;
        max-width: 620px;
        max-height: 92%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: var(--smp-text);
        position: relative;
    }

    .smp-modal-lg {
        max-width: 880px;
        height: 88%;
    }

    .smp-modal-xl {
        max-width: 1060px;
        height: 92%;
    }

    .smp-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 22px;
        border-bottom: 1px solid var(--smp-border);
        background: rgba(0, 0, 0, 0.02);
    }

    .smp-modal-title-group {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .smp-header-icon-circle {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: rgba(245, 158, 11, 0.15);
        color: var(--smp-accent);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        flex-shrink: 0;
    }

    .smp-modal-title-group h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    .smp-modal-subtitle {
        margin: 2px 0 0 0;
        font-size: 0.75rem;
        color: var(--smp-text-muted);
    }

    .smp-header-right-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .smp-badge-tag {
        background: rgba(245, 158, 11, 0.15);
        color: var(--smp-accent);
        font-size: 0.7rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 12px;
    }

    .smp-close-btn, .smp-overlay-close {
        background: none;
        border: none;
        font-size: 1.4rem;
        color: var(--smp-text-muted);
        cursor: pointer;
        line-height: 1;
        padding: 4px;
        border-radius: 6px;
        transition: color 0.15s ease;
    }

    .smp-close-btn:hover, .smp-overlay-close:hover {
        color: var(--smp-text);
    }

    .smp-modal-body {
        padding: 18px 22px;
        overflow-y: auto;
        flex: 1;
    }

    /* ==================== ACTIVITY LIBRARY BATCH CONTROLS ==================== */
    .smp-lib-batch-toolbar {
        padding: 12px 22px 10px 22px;
        border-bottom: 1px solid var(--smp-border);
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: rgba(0, 0, 0, 0.015);
    }

    .smp-lib-search-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .smp-library-search {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1;
    }

    .smp-library-search i {
        position: absolute;
        left: 12px;
        color: var(--smp-text-muted);
        font-size: 0.85rem;
    }

    .smp-library-search input {
        width: 100%;
        padding: 8px 12px 8px 34px;
        border-radius: 10px;
        border: 1px solid var(--smp-border);
        background: var(--smp-card-bg);
        color: var(--smp-text);
        font-size: 0.82rem;
        transition: border-color 0.2s ease;
    }

    .smp-library-search input:focus {
        border-color: var(--smp-accent);
        outline: none;
    }

    .smp-lib-quick-actions {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .smp-batch-divider {
        width: 1px;
        height: 18px;
        background: var(--smp-border);
        margin: 0 4px;
    }

    .smp-batch-label {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--smp-text-muted);
        white-space: nowrap;
    }

    .smp-batch-count-pills {
        display: flex;
        gap: 3px;
    }

    .smp-count-pill {
        background: rgba(0, 0, 0, 0.05);
        border: 1px solid var(--smp-border);
        color: var(--smp-text);
        padding: 2px 7px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .smp-count-pill:hover, .smp-count-pill.active {
        background: var(--smp-accent);
        color: white;
        border-color: var(--smp-accent);
    }

    .smp-category-chips-row {
        overflow-x: auto;
        padding-bottom: 2px;
    }

    .smp-category-chips {
        display: flex;
        gap: 6px;
    }

    .smp-chip {
        background: rgba(0, 0, 0, 0.04);
        border: 1px solid var(--smp-border);
        color: var(--smp-text);
        padding: 5px 11px;
        border-radius: 16px;
        font-size: 0.74rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
    }

    .smp-chip:hover {
        border-color: var(--smp-accent);
    }

    .smp-chip.active {
        background: var(--smp-accent);
        color: white;
        border-color: var(--smp-accent);
    }

    .smp-chip-badge {
        background: rgba(0, 0, 0, 0.15);
        padding: 1px 5px;
        border-radius: 10px;
        font-size: 0.65rem;
        font-weight: 700;
    }

    .smp-chip.active .smp-chip-badge {
        background: rgba(255, 255, 255, 0.25);
    }

    /* Live Summary Bar */
    .smp-lib-summary-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(245, 158, 11, 0.08);
        border: 1px solid rgba(245, 158, 11, 0.25);
        border-radius: 8px;
    }

    .smp-summary-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.78rem;
        color: var(--smp-text);
    }

    .smp-summary-check {
        color: #10b981;
        font-size: 0.9rem;
    }

    .smp-summary-actions {
        display: flex;
        gap: 8px;
    }

    /* Activity Grid Cards */
    .smp-grid-layout {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 14px;
    }

    .smp-activity-card {
        background: rgba(0, 0, 0, 0.02);
        border: 1px solid var(--smp-border);
        border-radius: 12px;
        padding: 14px;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
    }

    .smp-activity-card:hover {
        border-color: var(--smp-accent);
        box-shadow: var(--smp-shadow-md);
        transform: translateY(-2px);
    }

    .smp-activity-card.selected {
        border-color: var(--smp-accent);
        background: rgba(245, 158, 11, 0.04);
        box-shadow: 0 0 0 1px var(--smp-accent);
    }

    .smp-card-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .smp-card-icon-title {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .smp-ac-icon-wrapper {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        flex-shrink: 0;
    }

    .smp-ac-title {
        font-weight: 700;
        font-size: 0.88rem;
        line-height: 1.2;
        color: var(--smp-text);
    }

    .smp-act-checkbox-wrapper {
        display: flex;
        align-items: center;
    }

    .smp-act-checkbox {
        width: 18px;
        height: 18px;
        accent-color: var(--smp-accent);
        cursor: pointer;
    }

    .smp-card-meta-row {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .smp-cat-tag {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.06);
        color: var(--smp-text-muted);
        text-transform: uppercase;
    }

    .smp-level-tag {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(59, 130, 246, 0.12);
        color: #3b82f6;
    }

    .smp-ac-desc {
        font-size: 0.74rem;
        color: var(--smp-text-muted);
        line-height: 1.35;
        flex: 1;
    }

    .smp-card-footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 8px;
        border-top: 1px solid var(--smp-border);
        margin-top: 4px;
        gap: 6px;
    }

    .smp-item-stepper {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(0, 0, 0, 0.04);
        padding: 2px 4px;
        border-radius: 6px;
        border: 1px solid var(--smp-border);
    }

    .smp-stepper-btn {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: none;
        background: var(--smp-card-bg);
        color: var(--smp-text);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .smp-stepper-btn:hover {
        background: var(--smp-accent);
        color: white;
    }

    .smp-stepper-val {
        font-size: 0.75rem;
        font-weight: 700;
        min-width: 18px;
        text-align: center;
    }

    .smp-card-btn-group {
        display: flex;
        gap: 4px;
    }

    /* ==================== ON-SCREEN TIMESTAMP ACTIVITY TRIGGER BANNER ==================== */
    .smp-act-banner {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(26, 26, 26, 0.92);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(245, 158, 11, 0.5);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(245, 158, 11, 0.25);
        border-radius: 30px;
        padding: 8px 18px;
        display: flex;
        align-items: center;
        gap: 14px;
        z-index: 500;
        animation: smpSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        max-width: 90%;
    }

    @keyframes smpSlideDown {
        from { transform: translateX(-50%) translateY(-30px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }

    .smp-act-banner-badge {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .smp-act-banner-icon-box {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--smp-accent);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
    }

    .smp-act-banner-text-group {
        display: flex;
        flex-direction: column;
    }

    .smp-act-banner-headline {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .smp-act-banner-tag {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--smp-accent);
        letter-spacing: 0.04em;
    }

    .smp-act-banner-timestamp {
        font-size: 0.65rem;
        color: rgba(255, 255, 255, 0.6);
        font-family: monospace;
    }

    .smp-act-banner-title-text {
        font-size: 0.84rem;
        font-weight: 700;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 340px;
    }

    .smp-act-banner-btn-group {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .smp-act-banner-dismiss-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.6);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        line-height: 1;
    }

    .smp-act-banner-dismiss-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
    }

    /* Selected Tags in AI Prompt Modal */
    .smp-selected-tags-display {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        max-height: 52px;
        overflow-y: auto;
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: 6px;
        padding: 4px 6px;
    }

    .smp-sel-tag {
        background: rgba(245, 158, 11, 0.15);
        color: var(--smp-accent);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 4px;
        padding: 1px 6px;
        font-size: 0.68rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .smp-sel-tag-count {
        background: var(--smp-accent);
        color: white;
        border-radius: 3px;
        padding: 0 4px;
        font-size: 0.62rem;
    }

    .smp-step-title-box {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .smp-step-num {
        background: var(--smp-accent);
        color: white;
        font-size: 0.65rem;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
    }

    .smp-step-hint {
        font-size: 0.72rem;
        color: var(--smp-text-muted);
        margin: 2px 0 8px 0;
    }

    .smp-quick-loader-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
    }

    .smp-status-ok {
        font-size: 0.72rem;
        color: #10b981;
        font-weight: 700;
    }

    /* Wordle & Game Environments */
    .smp-wordle-grid {
        display: grid;
        justify-content: center;
        gap: 6px;
        margin: 16px auto;
    }

    .smp-wordle-tile {
        width: 44px;
        height: 44px;
        border: 2px solid var(--smp-border);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--smp-text);
        background: var(--smp-card-bg);
        transition: all 0.25s ease;
    }

    .smp-wordle-tile.correct {
        background: #10b981;
        color: white;
        border-color: #10b981;
    }

    .smp-wordle-tile.present {
        background: #f59e0b;
        color: white;
        border-color: #f59e0b;
    }

    .smp-wordle-tile.absent {
        background: #64748b;
        color: white;
        border-color: #64748b;
    }

    .smp-wm-input-row {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin: 12px 0;
    }

    .smp-snowman-display {
        text-align: center;
        margin: 14px 0;
    }

    .smp-snowman-art {
        font-size: 2rem;
        margin-bottom: 8px;
    }

    .smp-letter-blanks {
        font-size: 1.6rem;
        font-weight: 800;
        letter-spacing: 0.3em;
        font-family: monospace;
        color: var(--smp-accent);
    }

    .smp-clue-badge {
        font-size: 0.8rem;
        color: var(--smp-text-muted);
        margin-top: 6px;
    }

    .smp-virtual-keyboard {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        justify-content: center;
        max-width: 460px;
        margin: 14px auto 6px auto;
    }

    .smp-kb-key {
        width: 32px;
        height: 36px;
        border-radius: 6px;
        border: 1px solid var(--smp-border);
        background: var(--smp-card-bg);
        color: var(--smp-text);
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .smp-kb-key:hover {
        background: var(--smp-accent);
        color: white;
    }

    .smp-kb-key:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .smp-dialogue-modal {
        max-width: 640px;
    }

    .smp-chat-timeline {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 340px;
        overflow-y: auto;
        padding: 10px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 10px;
        margin: 12px 0;
    }

    .smp-dialogue-line {
        display: flex;
        flex-direction: column;
        max-width: 75%;
        position: relative;
    }

    .smp-dialogue-line.left {
        align-self: flex-start;
    }

    .smp-dialogue-line.right {
        align-self: flex-end;
    }

    .smp-speaker-name {
        font-size: 0.68rem;
        font-weight: 700;
        color: var(--smp-text-muted);
        margin-bottom: 2px;
    }

    .smp-speaker-bubble {
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 0.84rem;
        line-height: 1.4;
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        color: var(--smp-text);
    }

    .smp-dialogue-line.right .smp-speaker-bubble {
        background: var(--smp-accent);
        color: white;
        border-color: var(--smp-accent);
    }

    .smp-dialogue-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    }

    /* 3D Flip Flashcard */
    .smp-card-flip-container {
        perspective: 1000px;
        width: 100%;
        min-height: 240px;
        cursor: pointer;
        margin: 12px 0;
    }

    .smp-card-flipper {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        transform-style: preserve-3d;
    }

    .smp-card-flip-container.flipped .smp-card-flipper {
        transform: rotateY(180deg);
    }

    .smp-card-front, .smp-card-back {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        border-radius: var(--smp-radius-sm);
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02));
        border: 1px solid var(--smp-border);
    }

    .smp-card-back {
        transform: rotateY(180deg);
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02));
    }

    .smp-card-hint {
        position: absolute;
        top: 10px;
        right: 12px;
        font-size: 0.7rem;
        color: var(--smp-text-muted);
    }

    .smp-fc-term {
        font-size: 1.8rem;
        font-weight: 800;
        margin: 0;
        color: var(--smp-text);
    }

    .smp-fc-ipa {
        font-size: 1rem;
        color: var(--smp-text-muted);
        font-family: monospace;
    }

    .smp-fc-pronounce-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
    }

    .smp-fc-nav-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid var(--smp-border);
    }

    /* Buttons & Form Controls */
    .smp-btn-primary {
        background: var(--smp-primary);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
    }

    .smp-btn-accent {
        background: var(--smp-accent);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
    }

    .smp-btn-secondary {
        background: rgba(0, 0, 0, 0.06);
        color: var(--smp-text);
        border: 1px solid var(--smp-border);
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
    }

    .smp-btn-sm {
        padding: 5px 12px;
        font-size: 0.75rem;
    }

    .smp-btn-xs {
        padding: 3px 8px;
        font-size: 0.7rem;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.06);
        border: 1px solid var(--smp-border);
        color: var(--smp-text);
        cursor: pointer;
    }

    .smp-textarea {
        width: 100%;
        border-radius: 8px;
        border: 1px solid var(--smp-border);
        background: var(--smp-card-bg);
        color: var(--smp-text);
        padding: 10px;
        font-family: monospace;
        font-size: 0.8rem;
        resize: vertical;
    }

    .smp-textarea-large {
        height: 220px;
    }

    .smp-code-block {
        background: rgba(0, 0, 0, 0.05);
        border: 1px solid var(--smp-border);
        border-radius: 8px;
        padding: 12px;
        overflow: auto;
        position: relative;
    }

    .smp-code-large {
        height: 220px;
    }

    .smp-code-block pre {
        margin: 0;
        font-family: monospace;
        font-size: 0.75rem;
        white-space: pre-wrap;
    }

    .smp-prompt-steps-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-top: 14px;
    }

    .smp-prompt-config-bar {
        display: flex;
        gap: 12px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 8px;
        margin-bottom: 12px;
    }

    .smp-cfg-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .smp-select {
        padding: 6px;
        border-radius: 6px;
        border: 1px solid var(--smp-border);
        background: var(--smp-card-bg);
        color: var(--smp-text);
        font-size: 0.75rem;
    }

    /* Annotation Toolbar */
    #smp-annotation-toolbar {
        position: absolute;
        bottom: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: 30px;
        padding: 6px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: var(--smp-shadow-lg);
        z-index: 1000;
        backdrop-filter: blur(16px);
    }

    .smp-anno-drag-handle {
        color: var(--smp-text-muted);
        cursor: grab;
        padding-right: 4px;
    }

    .smp-anno-btn {
        background: none;
        border: none;
        color: var(--smp-text-muted);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
    }

    .smp-anno-btn:hover {
        background: rgba(0, 0, 0, 0.08);
        color: var(--smp-text);
    }

    .smp-anno-btn.active {
        background: var(--smp-accent);
        color: white;
    }

    .smp-anno-separator {
        width: 1px;
        height: 20px;
        background: var(--smp-border);
    }

    .smp-color-presets {
        display: flex;
        gap: 4px;
    }

    .smp-cp-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s ease;
    }

    .smp-cp-dot:hover, .smp-cp-dot.active {
        transform: scale(1.3);
    }

    .smp-stroke-ctrl {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.7rem;
    }

    .smp-stroke-ctrl input {
        width: 50px;
    }

    /* Sticky Note element */
    .smp-sticky-note {
        position: absolute;
        width: 180px;
        min-height: 120px;
        background: #fef08a;
        color: #1e1b18;
        border-radius: 8px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        padding: 10px;
        z-index: 100;
        cursor: move;
        font-size: 0.85rem;
    }

    .smp-sticky-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 0.7rem;
        opacity: 0.7;
    }

    .smp-sticky-textarea {
        width: 100%;
        background: none;
        border: none;
        resize: none;
        outline: none;
        font-family: inherit;
        font-size: 0.85rem;
    }

    /* Resizer Handles (Edges & Corners) */
    .smp-resizer {
        position: absolute;
        z-index: 10001;
    }

    .smp-resizer-r {
        top: 0;
        right: 0;
        width: 8px;
        height: 100%;
        cursor: ew-resize;
    }

    .smp-resizer-b {
        bottom: 0;
        left: 0;
        width: 100%;
        height: 8px;
        cursor: ns-resize;
    }

    .smp-resizer-l {
        top: 0;
        left: 0;
        width: 8px;
        height: 100%;
        cursor: ew-resize;
    }

    .smp-resizer-bl {
        bottom: 0;
        left: 0;
        width: 16px;
        height: 16px;
        cursor: nesw-resize;
    }

    .smp-resizer-tr {
        top: 0;
        right: 0;
        width: 16px;
        height: 16px;
        cursor: nesw-resize;
    }

    .smp-resizer-br {
        bottom: 0;
        right: 0;
        width: 22px;
        height: 22px;
        cursor: nwse-resize;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 3px;
        color: var(--smp-text-muted);
        opacity: 0.6;
        transition: opacity 0.2s ease, color 0.2s ease;
    }

    .smp-resizer-br:hover {
        opacity: 1;
        color: var(--smp-accent);
    }

    /* Toast */
    #smp-toast {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(50px);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 8px 18px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        opacity: 0;
        pointer-events: none;
        transition: all 0.25s ease;
        z-index: 20000;
    }

    #smp-toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }

    /* Quizzes, Matching & Unscramble */
    .smp-quiz-item {
        background: rgba(0, 0, 0, 0.03);
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 12px;
        border: 1px solid var(--smp-border);
    }

    .smp-quiz-opt-btn {
        width: 100%;
        text-align: left;
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: 8px;
        padding: 8px 12px;
        margin: 6px 0;
        font-size: 0.85rem;
        cursor: pointer;
        color: var(--smp-text);
        transition: all 0.15s ease;
    }

    .smp-quiz-opt-btn:hover {
        border-color: var(--smp-accent);
        background: rgba(245, 158, 11, 0.05);
    }

    .smp-quiz-opt-btn.correct {
        background: rgba(16, 185, 129, 0.15);
        border-color: #10b981;
        color: #10b981;
        font-weight: 700;
    }

    .smp-quiz-opt-btn.incorrect {
        background: rgba(239, 68, 68, 0.15);
        border-color: #ef4444;
        color: #ef4444;
    }

    .smp-quiz-feedback {
        margin-top: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
    }

    .smp-quiz-feedback.correct {
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
    }

    .smp-quiz-feedback.incorrect {
        background: rgba(239, 68, 68, 0.12);
        color: #ef4444;
    }

    /* Word Bank for Unscramble */
    .smp-word-bank-target, .smp-word-bank-source {
        min-height: 50px;
        border: 2px dashed var(--smp-border);
        border-radius: 8px;
        padding: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 10px 0;
    }

    .smp-word-chip {
        background: var(--smp-accent);
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        user-select: none;
        transition: transform 0.1s ease;
    }

    .smp-word-chip:hover {
        transform: scale(1.05);
    }

    /* 3D Flashcards & Flexcard Card Styling */
    .smp-flashcard {
        max-width: 540px;
        padding: 24px;
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: var(--smp-radius);
        box-shadow: var(--smp-shadow-lg);
    }

    .smp-card-flip-container {
        perspective: 1200px;
        width: 100%;
        min-height: 260px;
        cursor: pointer;
        margin: 14px 0;
    }

    .smp-card-flipper {
        position: relative;
        width: 100%;
        min-height: 260px;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        transform-style: preserve-3d;
    }

    .smp-card-flip-container.flipped .smp-card-flipper {
        transform: rotateY(180deg);
    }

    .smp-card-front, .smp-card-back {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        min-height: 260px;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        border-radius: 14px;
        padding: 22px;
        border: 1px solid var(--smp-border);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        background: rgba(245, 158, 11, 0.03);
        box-sizing: border-box;
    }

    .smp-card-back {
        transform: rotateY(180deg);
        background: rgba(59, 130, 246, 0.04);
        align-items: flex-start;
        text-align: left;
        justify-content: flex-start;
        overflow-y: auto;
    }

    .smp-card-hint {
        font-size: 0.72rem;
        color: var(--smp-text-muted);
        margin-bottom: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .smp-fc-term {
        font-size: 2rem;
        font-weight: 800;
        color: var(--smp-accent);
        margin: 4px 0 8px 0;
        letter-spacing: -0.02em;
    }

    .smp-fc-pronounce-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
    }

    .smp-fc-ipa {
        font-family: monospace;
        font-size: 1rem;
        color: var(--smp-text);
        background: rgba(0, 0, 0, 0.04);
        padding: 3px 8px;
        border-radius: 6px;
    }

    .smp-fc-speak-btn {
        background: var(--smp-accent);
        color: white;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.8rem;
        transition: transform 0.15s ease;
    }

    .smp-fc-speak-btn:hover {
        transform: scale(1.15);
    }

    .smp-fc-meta {
        display: flex;
        gap: 6px;
        margin-top: 6px;
    }

    .smp-tag {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.06);
        color: var(--smp-text-muted);
    }

    .smp-fc-field {
        font-size: 1rem;
        line-height: 1.5;
        font-weight: 600;
        color: var(--smp-text);
        margin-bottom: 12px;
    }

    .smp-fc-examples {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .smp-example-text {
        font-size: 0.84rem;
        font-style: italic;
        color: var(--smp-text);
        margin: 0;
        line-height: 1.4;
    }

    .smp-ccq-box {
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(245, 158, 11, 0.1);
        border-left: 3px solid var(--smp-accent);
        border-radius: 4px;
        font-size: 0.78rem;
        color: var(--smp-text);
        line-height: 1.4;
    }

    .smp-fc-nav-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px solid var(--smp-border);
    }

    .smp-counter-text {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--smp-text-muted);
    }

    /* Speaking & Speech Shadowing Environment */
    .smp-speaking-box {
        background: rgba(0, 0, 0, 0.03);
        border: 1px solid var(--smp-border);
        border-radius: 10px;
        padding: 16px;
        margin: 12px 0;
        text-align: center;
    }

    .smp-speaking-prompt {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--smp-text);
        margin: 6px 0 12px 0;
        line-height: 1.4;
    }

    .smp-speaking-status {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin: 14px 0;
    }

    .smp-mic-idle, .smp-mic-active {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        background: rgba(239, 68, 68, 0.12);
        color: #ef4444;
        transition: all 0.3s ease;
    }

    .smp-mic-active {
        background: #ef4444;
        color: white;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
        animation: smpPulse 1.2s infinite;
    }

    @keyframes smpPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }

    .smp-accuracy-meter {
        width: 100%;
        max-width: 280px;
        height: 8px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin: 6px 0;
    }

    .smp-accuracy-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #f59e0b, #10b981);
        transition: width 0.4s ease;
    }

    /* Cloze Fill-in-the-Blanks */
    .smp-fitb-sentence {
        font-size: 1rem;
        line-height: 1.8;
        margin: 12px 0;
        color: var(--smp-text);
    }

    .smp-fitb-input {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 6px;
        border: 2px dashed var(--smp-accent);
        background: var(--smp-card-bg);
        color: var(--smp-text);
        font-weight: 700;
        font-size: 0.95rem;
        width: 120px;
        text-align: center;
    }

    .smp-fitb-input:focus {
        border-style: solid;
        outline: none;
    }

    .smp-fitb-input.correct {
        border-color: #10b981;
        border-style: solid;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }

    .smp-fitb-input.incorrect {
        border-color: #ef4444;
        border-style: solid;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }

    /* Drag & Drop Matching Columns */
    .smp-match-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 14px 0;
    }

    .smp-match-col {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .smp-match-item {
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: grab;
        display: flex;
        align-items: center;
        transition: all 0.15s ease;
    }

    .smp-match-item:hover {
        border-color: var(--smp-accent);
        transform: translateX(3px);
    }

    .smp-match-target {
        background: rgba(0, 0, 0, 0.03);
        border: 2px dashed var(--smp-border);
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 0.82rem;
        min-height: 40px;
        display: flex;
        align-items: center;
        transition: all 0.15s ease;
    }

    .smp-match-target.dragover {
        border-color: var(--smp-accent);
        background: rgba(245, 158, 11, 0.08);
    }

    .smp-match-target.matched {
        border-style: solid;
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        font-weight: 700;
    }

    /* Activity Quick Icons */
    .smp-activity-icon {
        background: var(--smp-card-bg);
        border: 1px solid var(--smp-border);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--smp-text);
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .smp-activity-icon:hover {
        background: var(--smp-accent);
        color: white;
        transform: scale(1.1);
    }
    `;
};
