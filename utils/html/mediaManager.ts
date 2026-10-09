import { generateClassmateMasterPromptText } from "./promptTexts";
export { generateClassmateMasterPromptText };
import { DEFAULT_APP_CHARACTERS } from '../characters';
// The "Telegram 2026" chat engine. It is intentionally ONE self-contained
// function so it can be serialized into every exported lesson with toString().
import { getClassmateChatHtml } from '../classmateChatEngine';

export interface ClassmateState {
    characterId: string;
    learnerName: string;
    learnerL1: string;
    translationLevel: string;
    learnerInfo: string;
    friendshipLevel: number;
    mode: string;
    lessonText: string;
    isSectionMode: boolean;
    appletHtml: string;
    panelOpen: boolean;
    widgetVisible: boolean;
    isMaximized: boolean;
}

export const DEFAULT_CLASSMATE_STATE: ClassmateState = {
    characterId: 'female1',
    learnerName: 'Alex',
    learnerL1: 'Spanish',
    translationLevel: 'minimal',
    learnerInfo: 'Adult learner, intermediate level',
    friendshipLevel: 25,
    mode: 'explainer',
    lessonText: '',
    isSectionMode: true,
    appletHtml: '',
    panelOpen: false,
    widgetVisible: false,
    isMaximized: false
};

/**
 * Returns the Master AI Prompt for generating the Telegram-Style JSON Chat Scenario.
 */


export function generateClassmateMasterPrompt(targetDoc?: Document) {
    const doc = targetDoc || document;
    const win = (doc && doc.defaultView) ? doc.defaultView : window;

    const state = (window as any).getClassmateState ? (window as any).getClassmateState() : {};
    const charObj = (window as any).getSelectedClassmateChar ? (window as any).getSelectedClassmateChar() : null;
    const fStatus = (window as any).getFriendshipStatus ? (window as any).getFriendshipStatus(state.friendshipLevel !== undefined ? state.friendshipLevel : 25) : { label: 'Classmate', icon: '🤝' };

    const promptText = generateClassmateMasterPromptText(state, charObj, fStatus);

    function updateUI() {
        const copyBtns = doc.querySelectorAll('#cm-copy-prompt-btn, #cm-detach-copy-prompt-btn');
        copyBtns.forEach(btn => {
            const htmlBtn = btn as HTMLElement;
            htmlBtn.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> Copied Master AI!';
            htmlBtn.style.background = '#059669';
            setTimeout(() => {
                htmlBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Master AI';
                htmlBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            }, 2500);
        });
    }

    function fallbackCopyText(text: string, d: Document, w: any) {
        try {
            if (w && w.focus) w.focus();
            const ta = d.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '-9999px';
            d.body.appendChild(ta);
            ta.focus();
            ta.select();
            const successful = d.execCommand('copy');
            d.body.removeChild(ta);
            return successful;
        } catch(e) { return false; }
    }

    if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
        win.navigator.clipboard.writeText(promptText).then(() => {
            updateUI();
        }).catch(() => {
            if (fallbackCopyText(promptText, doc, win)) {
                updateUI();
            } else if (win.prompt) {
                win.prompt("Copy Master AI Prompt:", promptText);
                updateUI();
            }
        });
    } else {
        if (fallbackCopyText(promptText, doc, win)) {
            updateUI();
        } else if (win.prompt) {
            win.prompt("Copy Master AI Prompt:", promptText);
            updateUI();
        }
    }
}

if (typeof globalThis !== 'undefined' && (globalThis as any).window) {
    (globalThis as any).window.generateClassmateMasterPromptText = generateClassmateMasterPromptText;
    (globalThis as any).window.generateClassmateMasterPrompt = generateClassmateMasterPrompt;
}

/**
 * Main export function to return HTML, CSS, and JS for Media Manager & Classmate Widget
 */
export function getMediaManagerFeatures(learner: any, mode: 'presenter' | 'learner' = 'presenter') {
    const isLearner = mode === 'learner';
    if (isLearner) {
        return { html: '', css: '', js: '' };
    }

    const html = `
        <!-- VISUAL FLASHCARD & MEDIA MANAGER PANEL -->
        <div id="flashcard-canvas-panel" style="display:none; position:fixed; top:120px; left:50%; transform:translateX(-50%); width:820px; max-width:95vw; height:520px; background:#0f172a; color:#fff; border-radius:16px; box-shadow:0 25px 60px rgba(0,0,0,0.5); z-index:8000; flex-direction:column; overflow:hidden; min-width:350px; min-height:400px; border:1px solid rgba(255,255,255,0.12); resize: both;">
            <div id="flashcard-canvas-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:rgba(15,23,42,0.95); cursor:move; border-bottom:1px solid rgba(255,255,255,0.1); user-select:none;">
                <div style="color:#f8fafc; font-weight:800; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-photo-video" style="color:#fbbf24;"></i> Media Manager <span style="font-size:10px; background:rgba(59,130,246,0.2); color:#60a5fa; padding:2px 8px; border-radius:10px;">PRO Studio</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="smp-ctrl" id="flashcard-detach-btn" title="Pop out as Detached Separate Window" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; border-radius:6px; cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; outline:none;"><i class="fas fa-external-link-alt"></i></button>
                    <button class="smp-ctrl" id="flashcard-minimize-btn" title="Minimize" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; border-radius:6px; cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; outline:none;"><i class="fas fa-minus"></i></button>
                    <button class="smp-ctrl" id="flashcard-close-btn" title="Close" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; border-radius:6px; cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; outline:none;"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div style="display:flex; flex:1; overflow:hidden; background:#1e293b; flex-direction:row;" id="fc-split-container">
                <!-- Search Explorer (Left) -->
                <div style="width:350px; display:flex; flex-direction:column; border-right:1px solid rgba(255,255,255,0.1); background:#0f172a; overflow:hidden; flex-shrink:0;" id="fc-left-panel">
                    <div style="padding:12px; display:flex; flex-direction:column; gap:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
                        <div style="position:relative; display:flex; width:100%;">
                            <input type="text" id="fc-search-input" placeholder="Search picture, place or GIF..." style="flex:1; padding:8px 12px; padding-right:32px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#fff; font-size:0.8rem; outline:none; box-sizing:border-box;" />
                            <button id="fc-search-btn" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:transparent; border:none; color:#94a3b8; cursor:pointer; outline:none;"><i class="fas fa-search"></i></button>
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:2px;" id="fc-tabs-container">
                            <button class="fc-tab active" data-source="image" style="flex:1; padding:6px 4px; border-radius:6px; font-size:0.68rem; font-weight:700; background:#3b82f6; border:none; color:white; cursor:pointer; transition:all 0.15s; min-width:60px;">📸 Photos</button>
                            <button class="fc-tab" data-source="video" style="flex:1; padding:6px 4px; border-radius:6px; font-size:0.68rem; font-weight:700; background:rgba(255,255,255,0.06); border:none; color:#94a3b8; cursor:pointer; transition:all 0.15s; min-width:60px;">🎬 Videos</button>
                            <button class="fc-tab" data-source="streetview" style="flex:1; padding:6px 4px; border-radius:6px; font-size:0.68rem; font-weight:700; background:rgba(255,255,255,0.06); border:none; color:#94a3b8; cursor:pointer; transition:all 0.15s; min-width:60px;">📍 Maps</button>
                            <button class="fc-tab" data-source="local" style="flex:1; padding:6px 4px; border-radius:6px; font-size:0.68rem; font-weight:700; background:rgba(255,255,255,0.06); border:none; color:#94a3b8; cursor:pointer; transition:all 0.15s; min-width:60px;">📁 Local</button>
                            <button class="fc-tab" data-source="import" style="flex:1; padding:6px 4px; border-radius:6px; font-size:0.68rem; font-weight:700; background:rgba(255,255,255,0.06); border:none; color:#94a3b8; cursor:pointer; transition:all 0.15s; min-width:65px;">📥 Import</button>
                            <input id="fc-import-file-input" type="file" multiple accept="image/*,video/*,audio/*,.svg,.avif,.mkv,.avi,.mov,.m4v,.ogv,.flac,.opus,.weba,.wma,.mka,.3gp,.3g2,.ts,.mts,.m2ts,.mpeg,.mpg,.wav,.aiff,.aif,.mid,.midi,.amr,.caf,.heic,.heif,.tif,.tiff,.ico" style="display:none;" />
                            <input id="fc-import-folder-input" type="file" multiple webkitdirectory directory accept="image/*,video/*,audio/*,.svg,.avif,.mkv,.avi,.mov,.m4v,.ogv,.flac,.opus,.weba,.wma,.mka,.3gp,.3g2,.ts,.mts,.m2ts,.mpeg,.mpg,.wav,.aiff,.aif,.mid,.midi,.amr,.caf,.heic,.heif,.tif,.tiff,.ico" style="display:none; />
                            <button class="fc-tab" data-source="classmate" style="flex:1; padding:6px 4px; border-radius:6px; font-size:0.68rem; font-weight:700; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; cursor:pointer; transition:all 0.15s; min-width:80px;"><i class="fas fa-user-friends"></i> Classmate</button>
                        </div>
                    </div>
                    <!-- Results Scrolling Pane -->
                    <div id="fc-results-pane" style="flex:1; overflow-y:auto; padding:12px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <div id="fc-import-pane" style="display:none; grid-column:1/span 2; padding:12px 0; color:#cbd5e1;">
                            <div style="border:1px solid rgba(96,165,250,.35); background:linear-gradient(135deg,rgba(59,130,246,.18),rgba(15,23,42,.8)); border-radius:14px; padding:16px; text-align:center;">
                                <div style="font-size:24px; margin-bottom:4px;">💾</div>
                                <strong style="display:block; color:#fff; font-size:14px;">Import media from your hard drive</strong>
                                <span style="display:block; color:#94a3b8; font-size:11px; margin:6px 0 12px; line-height:1.45;">Images, GIFs, SVG, video, audio and common professional formats. Files stay local to this browser session.</span>
                                <div style="display:flex; gap:7px; flex-wrap:wrap; justify-content:center;">
                                    <button id="fc-open-media-btn" type="button" style="background:#2563eb;color:#fff;border:0;border-radius:8px;padding:9px 12px;font-weight:800;font-size:11px;cursor:pointer;">📂 Open Media Files</button>
                                    <button id="fc-open-folder-btn" type="button" style="background:#0f766e;color:#fff;border:0;border-radius:8px;padding:9px 12px;font-weight:800;font-size:11px;cursor:pointer;">📁 Scan Folder</button>
                                    <button id="fc-record-audio-btn" type="button" style="background:#be123c;color:#fff;border:0;border-radius:8px;padding:9px 12px;font-weight:800;font-size:11px;cursor:pointer;">🎙️ Record Audio</button>
                                    <button id="fc-clear-imports-btn" type="button" style="background:#475569;color:#fff;border:0;border-radius:8px;padding:9px 12px;font-weight:800;font-size:11px;cursor:pointer;">🧹 Clear Queue</button>
                                </div>
                                <div id="fc-import-drop-zone" tabindex="0" style="margin-top:12px;border:2px dashed rgba(148,163,184,.5);border-radius:10px;padding:18px 8px;color:#94a3b8;font-size:11px;cursor:pointer;">Drag and drop files here, or click to browse</div>
                                <div id="fc-import-status" style="margin-top:8px;color:#93c5fd;font-size:10px;min-height:14px;"></div>
                            </div>
                            <div id="fc-import-library" style="margin-top:10px;display:flex;flex-direction:column;gap:5px;"></div>
                        </div>
                        <div id="fc-empty-results" style="grid-column:1/span 2; padding:30px 0; text-align:center; color:#64748b;">
                            <i class="fas fa-search" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                            <span>Type query above and select filter</span>
                        </div>
                    </div>
                </div>
                
                <!-- Live Layout Canvas Preview (Right) -->
                <div style="flex:1; display:flex; flex-direction:column; padding:16px; background:#1e293b; overflow:hidden;" id="fc-right-panel">
                    <div style="flex:1; background:#ffffff; border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,0.15); display:flex; flex-direction:column; overflow:hidden; border:1.5px solid #e2e8f0; max-height:100%; position:relative;" id="fc-preview-container">
                        <!-- Content Frame -->
                        <div id="fc-media-view" style="flex:1; background:#f8fafc; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                            <textarea id="fc-paste-catcher" style="position:absolute; width:0; height:0; opacity:0; pointer-events:none;" tabindex="-1" aria-hidden="true"></textarea>
                            <div id="fc-empty-canvas" style="text-align:center; color:#94a3b8; padding:20px; cursor:pointer;">
                                <i class="fas fa-photo-video" style="font-size:3.5rem; color:#cbd5e1; margin-bottom:12px;"></i>
                                <h4 style="font-weight:700; font-size:14px; margin:0 0 4px 0; color:#64748b;">Media Manager Canvas</h4>
                                <p style="font-size:11px; max-width:240px; margin:0 auto; line-height:1.4;">Select or import media below, or <strong>click here and press Ctrl+V</strong> to paste an image/GIF!</p>
                            </div>
                        </div>
                        <div id="fc-word-view" contenteditable="true" style="background:#ffffff; color:#0f172a; padding:16px; font-size:26px; font-weight:800; text-align:center; border-top:1.5px solid #ecf0f3; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2; cursor:text;">
                            No word selected
                        </div>
                        <div id="fc-pic-attrib-bubble" style="position:absolute; top:12px; left:12px; display:none; background:rgba(15,23,42,0.85); color:white; padding:4px 10px; border-radius:30px; font-size:10px; font-weight:600; pointer-events:none;"></div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:8px;">
                        <button id="fc-insert-btn" style="width:100%; flex:1; padding:10px 16px; border-radius:8px; border:none; background:#10b981; color:white; font-size:0.8rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 12px rgba(16,185,129,0.25);" title="Paste media directly onto your dynamic lesson body!"><i class="fas fa-paste"></i> Add to Lesson</button>
                        <button id="fc-tr-insert-btn" style="padding:10px 16px; border-radius:8px; border:none; background:#8b5cf6; color:white; font-size:0.8rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 12px rgba(139,92,246,0.25); white-space:nowrap;" title="Add media card to top-right corner of the lesson body"><i class="fas fa-arrow-right"></i> Top Right</button>
                    </div>
                    <div id="fc-canvas-media-manager" style="display:none; margin-top:8px; padding:8px; background:#0f172a; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="font-size:11px; font-weight:700; color:#94a3b8;"><i class="fas fa-layer-group" style="margin-right:4px;"></i> Canvas Media</span>
                            <button id="fc-cloze-canvas-btn" style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.3); color:#93c5fd; padding:3px 8px; border-radius:4px; font-size:9px; font-weight:700; cursor:pointer;"><i class="fas fa-eraser"></i> Cloze Canvas</button>
                        </div>
                        <div id="fc-canvas-media-list" style="max-height:80px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CLASSMATE CIRCULAR WIDGET & SIDE PANEL -->
        <div id="classmate-circular-widget" style="position:fixed; left:16px; bottom:24px; z-index:7500; display:none; flex-direction:column; align-items:center; gap:4px; cursor:pointer; user-select:none; filter:drop-shadow(0 8px 20px rgba(0,0,0,0.15));" title="Classmate Widget - Click to open interactive classmate companion">
            <div style="position:relative; width:62px; height:62px;">
                <div id="classmate-pulse-ring" style="position:absolute; inset:-4px; border-radius:50%; background:linear-gradient(135deg, #f59e0b, #ec4899, #3b82f6); opacity:0.85;"></div>
                <img id="classmate-widget-avatar" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e2e8f0"/><path d="M50 48a18 18 0 1 0 0-36 18 18 0 0 0 0 36zm0 10c-18 0-36 10-36 28v4h72v-4c0-18-18-28-36-28z" fill="%2394a3b8"/></svg>';" style="position:relative; width:100%; height:100%; border-radius:50%; object-fit:cover; border:2.5px solid #ffffff; background:#f1f5f9; box-sizing:border-box;" />
                <span id="classmate-widget-badge" style="position:absolute; bottom:-2px; right:-2px; font-size:16px; background:#ffffff; border-radius:50%; padding:2px; border:1px solid #cbd5e1; line-height:1; box-shadow:0 2px 6px rgba(0,0,0,0.12);" title="Friendship Level">🤝</span>
            </div>
            <div id="classmate-widget-label" style="background:rgba(255,255,255,0.95); backdrop-filter:blur(8px); color:#0f172a; font-size:10px; font-weight:800; padding:2px 8px; border-radius:10px; border:1px solid #cbd5e1; max-width:85px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.08);">Classmate</div>
        </div>

        <div id="classmate-side-panel" style="position:fixed; left:16px; top:65px; width:580px; max-width:calc(100vw - 32px); height:calc(100vh - 120px); background:#ffffff; color:#0f172a; border-radius:16px; box-shadow:0 20px 50px rgba(0,0,0,0.18); z-index:7800; display:flex; flex-direction:column; overflow:hidden; border:1px solid #cbd5e1; transform:translateX(-120%); transition:transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s ease; resize:both; min-width:380px; min-height:350px;">
            <div id="classmate-panel-header" style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:8px 10px; background:linear-gradient(135deg, #ffffff, #f1f5f9); border-bottom:1px solid #e2e8f0; cursor:move; user-select:none;">
                <img id="classmate-panel-avatar" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e2e8f0"/><path d="M50 48a18 18 0 1 0 0-36 18 18 0 0 0 0 36zm0 10c-18 0-36 10-36 28v4h72v-4c0-18-18-28-36-28z" fill="%2394a3b8"/></svg>';" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:2px solid #f59e0b; flex-shrink:0; background:#e2e8f0;" />
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                        <span id="classmate-panel-name" style="font-weight:800; font-size:14px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Sophia Chen</span>
                        <span id="classmate-panel-mode-badge" style="font-size:9px; font-weight:800; padding:2px 7px; border-radius:8px; background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe; flex-shrink:0;">EXPLAINER</span>
                        <span id="classmate-panel-role-text" style="font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">online · Structured Teacher</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                        <span id="classmate-panel-friendship-label" style="font-size:10px; font-weight:800; color:#60a5fa; white-space:nowrap;">💬 Classmate</span>
                        <div id="classmate-panel-meter-track" style="flex:1; min-width:50px; height:6px; border-radius:99px; background:#eef2f7; overflow:hidden;">
                            <div id="classmate-panel-meter-fill" style="height:100%; width:0%; border-radius:99px; background:linear-gradient(90deg, #f87171, #fbbf24 35%, #34d399 70%, #3b82f6); transition:width .45s cubic-bezier(.2,.9,.2,1);"></div>
                        </div>
                        <span id="classmate-panel-friendship-score" style="font-size:10px; font-weight:900; color:#0f766e;">25</span>
                        <!-- Reactions live in the header beside the friendship meter: one tap
                             moves this meter and the chat's own meter (the engine posts the
                             delta back), and the composer keeps a full row for typing. -->
                        <span class="cm-reacts" title="Tutor reaction — tap to raise or drop the friendship">
                            <button class="cm-react-panel" type="button" data-delta="5" title="Learner answered well (+5 friendship)" aria-label="Learner answered well, plus 5 friendship">👍<b>+5</b></button>
                            <button class="cm-react-panel" type="button" data-delta="15" title="Fallen in love moment (+15 friendship)" aria-label="Fallen in love moment, plus 15 friendship">❤️<b>+15</b></button>
                            <button class="cm-react-panel cm-down" type="button" data-delta="-10" title="Disagreed / offended (-10 friendship)" aria-label="Disagreed or offended, minus 10 friendship">💔<b>-10</b></button>
                        </span>
                    </div>
                </div>
                <div style="display:flex; gap:5px; flex-shrink:0;">
                    <button id="classmate-panel-detach-btn" title="Open Classmate in Detached Separate Window" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; border-radius:6px; width:28px; height:28px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s;"><i class="fas fa-external-link-alt" style="font-size:11px;"></i></button>
                    <button id="classmate-panel-expand-btn" title="Wide view → Full screen" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; border-radius:6px; width:28px; height:28px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s;"><i class="fas fa-expand-alt" style="font-size:11px;"></i></button>
                    <button id="classmate-panel-close-btn" title="Close Panel" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#64748b; border-radius:6px; width:28px; height:28px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s;"><i class="fas fa-times" style="font-size:12px;"></i></button>
                </div>
            </div>

            <div id="classmate-panel-body" style="flex:1; display:flex; flex-direction:column; overflow:hidden; position:relative; background:#ffffff;">
                <div id="classmate-applet-container" style="flex:1; width:100%; height:100%; position:relative; overflow:hidden; background:#0e1621;">
                    <iframe id="classmate-applet-frame" src="about:blank" style="width:100%; height:100%; border:none; background:#0e1621;"></iframe>
                </div>
            </div>

            <!-- Reaction + Section controls live in the chat's reply bar so the panel
                 gives every pixel to the lesson content. -->
        </div>
    `;

    const css = `
        /* Media Manager & Classmate Styles */
        /* Reactions, in the panel header beside the friendship meter. */
        .cm-reacts { display: inline-flex; align-items: center; gap: 2px; flex: 0 1 auto; min-width: 0; margin-left: 4px; background: #f8fafc; border: 1px solid #e6ecf4; border-radius: 99px; padding: 2px; overflow: hidden; }
        .cm-react-panel { display: inline-flex; align-items: center; gap: 2px; background: transparent; border: none; border-radius: 99px; padding: 3px 6px; font-size: 12px; line-height: 1; cursor: pointer; font-family: inherit; transition: background 0.16s ease, transform 0.16s ease; }
        .cm-react-panel b { font-size: 9px; font-weight: 900; color: #0f766e; }
        .cm-react-panel.cm-down b { color: #b91c1c; }
        .cm-react-panel:hover { background: #e8f2ff; }
        .cm-react-panel:active { transform: scale(0.95); }
        @media (max-width: 620px) { .cm-reacts .cm-react-panel b { display: none; } }
        .fc-tab {
            flex: 1;
            padding: 6px 4px;
            border-radius: 6px;
            font-size: 0.68rem;
            font-weight: 700;
            background: rgba(255,255,255,0.06);
            border: none;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.15s;
            min-width: 60px;
        }
        .fc-tab.active {
            background: #3b82f6;
            color: white;
        }
        #fc-import-drop-zone.drag-over { border-color:#60a5fa; background:rgba(37,99,235,.2); color:#fff; }
        .fc-import-item { display:flex; align-items:center; gap:8px; padding:7px; border:1px solid rgba(148,163,184,.2); border-radius:8px; background:rgba(255,255,255,.04); cursor:pointer; }
        .fc-import-item:hover { background:rgba(59,130,246,.18); }
        .fc-import-thumb { width:36px; height:36px; border-radius:6px; object-fit:cover; background:#1e293b; flex:none; }
        .fc-import-meta { min-width:0; flex:1; }
        .fc-import-name { display:block; color:#e2e8f0; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .fc-import-type { color:#94a3b8; font-size:9px; }
        .fc-import-remove { background:transparent; border:0; color:#fca5a5; cursor:pointer; font-size:14px; }
    `;

    const js = `
        // Canvas Media Manager & Detached Window Logic
        window.DEFAULT_CLASSMATE_STATE = ${JSON.stringify(DEFAULT_CLASSMATE_STATE)};

        window.getClassmateState = function() {
            let dynLearnerName = 'Alex';
            let dynLearnerL1 = 'Spanish';
            try {
                if (typeof window !== 'undefined') {
                    if (window.LEARNER_NAME) dynLearnerName = window.LEARNER_NAME;
                    else if (document.getElementById('learner-name')) {
                        const el = document.getElementById('learner-name');
                        if (el && el.textContent && el.textContent.trim()) dynLearnerName = el.textContent.trim();
                    }
                    if (window.LEARNER_L1) dynLearnerL1 = window.LEARNER_L1;
                    else if (document.getElementById('learner-l1-language')) {
                        const el = document.getElementById('learner-l1-language');
                        if (el && el.textContent && el.textContent.trim()) dynLearnerL1 = el.textContent.trim();
                    }
                }
            } catch(e) {}

            const baseDefaults = Object.assign({}, window.DEFAULT_CLASSMATE_STATE, {
                learnerName: dynLearnerName,
                learnerL1: dynLearnerL1
            });

            // ── Session-only memory ─────────────────────────────────────────
            // NOTHING about the Classmate widget is written to storage any more:
            // the pasted scenario, the friendship level and the panel visibility
            // live for THIS page view only, so nothing can load itself from another
            // lesson, another student or an earlier run. The widget also starts
            // dormant — it only appears after the tutor presses "Enable Classmate
            // Widget on Lesson" in the Persona Studio.
            const session = window.__classmateSessionState || {};
            return Object.assign({}, baseDefaults, session, {
                widgetVisible: !!session.widgetVisible,
                panelOpen: !!session.panelOpen
            });
        };

        // Purge the legacy shared key that used to leak one lesson's scenario into
        // every other lesson (the "memory" of a paste that kept coming back).
        try { localStorage.removeItem('classmate_widget_state'); } catch (e) {}

        window.resetClassmateCache = function() {
            try {
                window.__classmateSessionState = {};
                const frame = document.getElementById('classmate-applet-frame');
                if (frame) frame.srcdoc = '';
                if (window.__classmatePopup && !window.__classmatePopup.closed) {
                    const af = window.__classmatePopup.document.getElementById('applet-frame');
                    if (af) af.srcdoc = '';
                }
                window.updateClassmateWidgetUI();
                if (typeof window.renderClassmateManagerPane === 'function') {
                    window.renderClassmateManagerPane();
                }
            } catch(e) {}
        };

        window.saveClassmateState = function(newState) {
            try {
                // Session overrides keep the widget/panel state alive for THIS page view only.
                window.__classmateSessionState = Object.assign({}, window.__classmateSessionState || {}, newState);
                // Nothing is persisted — see the session-only note above.
                const updated = window.getClassmateState();
                window.updateClassmateWidgetUI();
                return updated;
            } catch(e) {}
        };

        
        // Message listener for classmate iframe communication (works seamlessly under file:/// protocol)
        window.addEventListener('message', function(e) {
            try {
                if (e.data && e.data.type === 'classmate_friendship_delta' && typeof window.adjustClassmateFriendship === 'function') {
                    window.adjustClassmateFriendship(e.data.delta);
                }
            } catch(err) {}
        });

        window.getSelectedClassmateChar = function() {
            const state = window.getClassmateState();
            const chars = (window.__APP_CHARACTERS && window.__APP_CHARACTERS.length > 0)
                ? window.__APP_CHARACTERS
                : (window.DEFAULT_APP_CHARACTERS || []);
            return chars.find(c => c.id === state.characterId || c.code === state.characterId) || chars[0] || {
                id: 'female1', name: 'Sophia Chen', nationality: 'American', personality: 'Empathetic ESL partner',
                avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
            };
        };

        // Canonical 8-rung relationship ladder. The chat engine, the Lesson Creator
        // and the master prompt all read the same rungs, so the widget badge, the
        // Media Manager meter and the in-chat meter can never disagree at the same score.
        window.getFriendshipStatus = function(val) {
            if (val <= -60) return { label: 'Arch Nemesis', icon: '😡', color: '#ef4444', desc: 'Hostile and fiercely confrontational' };
            if (val <= -20) return { label: 'Competitive Rival', icon: '😒', color: '#f97316', desc: 'Sarcastic taunts and challenges' };
            if (val < 15) return { label: 'New Acquaintance', icon: '🤝', color: '#94a3b8', desc: 'Polite and neutral classmate' };
            if (val < 40) return { label: 'Classmate', icon: '💬', color: '#60a5fa', desc: 'Collaborative and engaged study buddy' };
            if (val < 65) return { label: 'Study Partner', icon: '😊', color: '#10b981', desc: 'Warm, helpful and encouraging' };
            if (val < 85) return { label: 'Close Friend', icon: '💛', color: '#f59e0b', desc: 'Inside jokes, memes and support' };
            if (val < 98) return { label: 'Best Friend', icon: '💖', color: '#ec4899', desc: 'Deep camaraderie and celebration' };
            return { label: 'Inseparable Duo', icon: '💕', color: '#d946ef', desc: 'An absolute bond of trust and fun' };
        };

        window.updateClassmateWidgetUI = function() {
            const state = window.getClassmateState();
            const charObj = window.getSelectedClassmateChar();
            const fStatus = window.getFriendshipStatus(state.friendshipLevel);

            const widget = document.getElementById('classmate-circular-widget');
            if (widget) widget.style.display = state.widgetVisible ? 'flex' : 'none';

            const avatarImg = document.getElementById('classmate-widget-avatar');
            if (avatarImg && charObj.avatarUrl) avatarImg.src = charObj.avatarUrl;

            const badge = document.getElementById('classmate-widget-badge');
            if (badge) {
                badge.textContent = fStatus.icon;
                badge.title = 'Friendship: ' + fStatus.label + ' (' + state.friendshipLevel + '/100)';
            }

            const label = document.getElementById('classmate-widget-label');
            if (label) label.textContent = charObj.name ? charObj.name.split(' ')[0] : 'Classmate';

            const pAvatar = document.getElementById('classmate-panel-avatar');
            if (pAvatar && charObj.avatarUrl) pAvatar.src = charObj.avatarUrl;

            const pName = document.getElementById('classmate-panel-name');
            if (pName) pName.textContent = charObj.name;

            const pMode = document.getElementById('classmate-panel-mode-badge');
            if (pMode) pMode.textContent = (state.mode || 'EXPLORER').toUpperCase();

            // ONE header: the side panel owns the avatar, name, online role and the
            // graphical relationship meter — no duplicated name, no "53/100" text.
            const pRole = document.getElementById('classmate-panel-role-text');
            if (pRole) pRole.textContent = 'online · ' + (charObj.role || charObj.title || 'ESL Classmate');

            const pFriendLabel = document.getElementById('classmate-panel-friendship-label');
            if (pFriendLabel) { pFriendLabel.textContent = fStatus.icon + ' ' + fStatus.label; pFriendLabel.style.color = fStatus.color; }

            const pFriendScore = document.getElementById('classmate-panel-friendship-score');
            if (pFriendScore) pFriendScore.textContent = String(Math.round(state.friendshipLevel));

            const pFill = document.getElementById('classmate-panel-meter-fill');
            if (pFill) pFill.style.width = Math.round(((Math.max(-100, Math.min(100, state.friendshipLevel)) + 100) / 200) * 100) + '%';

            const panel = document.getElementById('classmate-side-panel');
            if (panel) {
                panel.style.transform = (state.panelOpen && state.widgetVisible) ? 'translateX(0)' : 'translateX(-120%)';
                if (typeof window.applyClassmatePanelSize === 'function') {
                    window.applyClassmatePanelSize(panel, window.classmatePanelSize ? window.classmatePanelSize() : (state.isMaximized ? 'wide' : 'normal'));
                } else {
                    panel.style.width = state.isMaximized ? '900px' : '580px';
                }
                
                const frame = document.getElementById('classmate-applet-frame');
                if (frame && state.widgetVisible && (!frame.srcdoc || frame.srcdoc.trim() === '')) {
                    frame.srcdoc = window.getDefaultClassmateHtml(charObj, Object.assign({}, state, { headerless: true }));
                }
            }
        };

        window.toggleClassmatePanel = function(openState) {
            const current = window.getClassmateState();
            const nextOpen = (openState !== undefined) ? openState : !current.panelOpen;
            window.saveClassmateState({ panelOpen: nextOpen, widgetVisible: nextOpen ? true : current.widgetVisible });
        };

        window.adjustClassmateFriendship = function(delta) {
            const current = window.getClassmateState();
            window.saveClassmateState({ friendshipLevel: Math.max(-100, Math.min(100, current.friendshipLevel + delta)) });
        };

        // Reactions beside the friendship meter, in the panel header. The delta goes
        // INTO the chat engine, which posts it straight back here, so the two meters
        // move together and the value is only ever applied once.
        window.wireClassmateReactions = function() {
            document.querySelectorAll('.cm-react-panel').forEach(function(btn) {
                if (btn.dataset.wired) return;
                btn.dataset.wired = '1';
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const delta = parseInt(btn.getAttribute('data-delta') || '5', 10) || 5;
                    const frame = document.getElementById('classmate-applet-frame');
                    const api = frame && frame.contentWindow && frame.contentWindow.ClassmateChat;
                    if (api && typeof api.adjustFriendship === 'function') {
                        api.adjustFriendship(delta, 'Tutor reaction');
                    } else {
                        window.adjustClassmateFriendship(delta);
                    }
                });
            });
        };

        window.renderClassmateManagerPane = function() {
            const pane = document.getElementById('fc-results-pane');
            if (!pane) return;

            const state = window.getClassmateState();
            const fStatus = window.getFriendshipStatus(state.friendshipLevel);
            const isWidgetVisible = document.getElementById('classmate-circular-widget')?.style.display !== 'none';
            const isPanelOpen = document.getElementById('classmate-side-panel')?.style.transform === 'translateX(0px)';

            pane.style.display = 'flex';
            pane.style.flexDirection = 'column';
            pane.style.gridTemplateColumns = 'none';
            pane.style.gap = '12px';

            pane.innerHTML = 
                '<div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:12px;">' +
                    '<div style="font-size:12px; font-weight:800; color:#fbbf24; display:flex; align-items:center; justify-content:space-between;">' +
                        '<span><i class="fas fa-user-friends"></i> Classmate Companion</span>' +
                        '<span style="font-size:10px; background:rgba(99,102,241,0.25); color:#a5b4fc; padding:2px 8px; border-radius:6px; border:1px solid rgba(99,102,241,0.4);">✨ Studio in Adult Dashboard</span>' +
                    '</div>' +

                    '<div style="background:linear-gradient(135deg,rgba(99,102,241,0.18),rgba(14,165,233,0.12)); border:1px solid rgba(129,140,248,0.35); border-radius:12px; padding:13px; font-size:11.5px; line-height:1.65; color:#e0e7ff;">' +
                        '<strong style="color:#fff; display:block; margin-bottom:5px; font-size:12.5px;"><i class="fas fa-comments" style="color:#818cf8;"></i> Telegram 2026 chat engine · premium companion screen</strong>' +
                        '1 · Generate the scenario: <strong>Adult Dashboard &gt; Lessons &gt; Lesson Creator &gt; 🤝 Classmate</strong> → copy the Master AI prompt → paste the returned JSON. ' +
                        '2 · Paste the JSON (or the exported HTML5 file) into the field below and press <strong>Apply to Widget</strong>. ' +
                        'The chat renders full media (image · GIF · video · YouTube · audio · voice notes · tables · stickers), graded tests (single, multi, true/false, ordering, polls) and the live <strong>relationship meter</strong>.' +
                    '</div>' +

                    '<!-- Relationship meter (drives the in-chat meter) -->' +
                    '<div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px;">' +
                        '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">' +
                            '<span style="font-size:11.5px; font-weight:800; color:#fbbf24;"><i class="fas fa-heart"></i> Relationship meter</span>' +
                            '<span id="cm-friendship-badge" style="font-size:11.5px; font-weight:800; color:' + fStatus.color + ';">' + fStatus.icon + ' ' + state.friendshipLevel + ' / 100 (' + fStatus.label + ')</span>' +
                        '</div>' +
                        '<div style="height:9px; border-radius:99px; background:rgba(255,255,255,0.09); overflow:hidden;">' +
                            '<div id="cm-friendship-bar" style="height:100%; width:' + Math.round(((Math.max(-100, Math.min(100, state.friendshipLevel)) + 100) / 200) * 100) + '%; background:linear-gradient(90deg,#f87171,#facc15 40%,#34d399 72%,#60a5fa); transition:width .4s ease;"></div>' +
                        '</div>' +
                        '<input id="cm-friendship-slider" type="range" min="-100" max="100" value="' + state.friendshipLevel + '" style="width:100%; accent-color:#f59e0b; cursor:pointer;" />' +
                        '<div style="display:flex; flex-wrap:wrap; gap:5px;">' +
                            '<button type="button" class="cm-f-preset" data-val="0" style="background:rgba(148,163,184,0.16); border:1px solid rgba(148,163,184,0.35); color:#cbd5e1; padding:4px 8px; border-radius:7px; font-size:10px; font-weight:800; cursor:pointer;">🤝 Acquaintance 0</button>' +
                            '<button type="button" class="cm-f-preset" data-val="25" style="background:rgba(96,165,250,0.16); border:1px solid rgba(96,165,250,0.35); color:#bfdbfe; padding:4px 8px; border-radius:7px; font-size:10px; font-weight:800; cursor:pointer;">💬 Classmate 25</button>' +
                            '<button type="button" class="cm-f-preset" data-val="50" style="background:rgba(52,211,153,0.16); border:1px solid rgba(52,211,153,0.35); color:#a7f3d0; padding:4px 8px; border-radius:7px; font-size:10px; font-weight:800; cursor:pointer;">😊 Partner 50</button>' +
                            '<button type="button" class="cm-f-preset" data-val="70" style="background:rgba(250,204,21,0.16); border:1px solid rgba(250,204,21,0.35); color:#fde68a; padding:4px 8px; border-radius:7px; font-size:10px; font-weight:800; cursor:pointer;">💛 Close 70</button>' +
                            '<button type="button" class="cm-f-preset" data-val="90" style="background:rgba(244,114,182,0.16); border:1px solid rgba(244,114,182,0.35); color:#fbcfe8; padding:4px 8px; border-radius:7px; font-size:10px; font-weight:800; cursor:pointer;">💖 Best 90</button>' +
                        '</div>' +
                    '</div>' +
                    
                    '<!-- Widget & Panel Display Controls -->' +
                    '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">' +
                        '<button id="cm-toggle-widget-btn" style="background:' + (isWidgetVisible ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)') + '; border:1px solid ' + (isWidgetVisible ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.15)') + '; color:' + (isWidgetVisible ? '#6ee7b7' : '#cbd5e1') + '; padding:8px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">' +
                            '<i class="fas fa-circle-notch"></i> ' + (isWidgetVisible ? 'Hide Circular Widget' : 'Show Circular Widget') +
                        '</button>' +
                        '<button id="cm-toggle-panel-btn" style="background:' + (isPanelOpen ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)') + '; border:1px solid ' + (isPanelOpen ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.15)') + '; color:' + (isPanelOpen ? '#93c5fd' : '#cbd5e1') + '; padding:8px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">' +
                            '<i class="fas fa-columns"></i> ' + (isPanelOpen ? 'Hide Side Panel' : 'Show Side Panel') +
                        '</button>' +
                    '</div>' +

                    '<!-- Quick Load Custom Standalone HTML / Scenario -->' +
                    '<div style="display:flex; flex-direction:column; gap:5px;">' +
                        '<label style="font-size:10.5px; font-weight:700; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;">' +
                            '<span><i class="fas fa-code" style="color:#60a5fa; margin-right:4px;"></i> Inject Custom HTML5 / JSON:</span>' +
                            '<span style="display:flex; gap:4px;">' +
                                '<button type="button" id="cm-paste-clipboard-btn" style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.16); color:#cbd5e1; padding:3px 7px; border-radius:6px; font-size:9.5px; font-weight:800; cursor:pointer;"><i class="fas fa-paste"></i> Paste</button>' +
                                '<button type="button" id="cm-load-sample-btn" style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.16); color:#cbd5e1; padding:3px 7px; border-radius:6px; font-size:9.5px; font-weight:800; cursor:pointer;"><i class="fas fa-wand-magic-sparkles"></i> Sample</button>' +
                                '<button type="button" id="cm-clear-input-btn" style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.16); color:#cbd5e1; padding:3px 7px; border-radius:6px; font-size:9.5px; font-weight:800; cursor:pointer;"><i class="fas fa-eraser"></i> Clear</button>' +
                            '</span>' +
                        '</label>' +
                        '<textarea id="cm-applet-paste-input" rows="4" spellcheck="false" style="width:100%; background:#0f172a; color:#34d399; font-family:monospace; border:1px solid rgba(255,255,255,0.15); padding:8px; border-radius:8px; font-size:10px; box-sizing:border-box; resize:vertical;" placeholder="Paste the Classmate JSON from Lesson Creator (or a full HTML5 document)…"></textarea>' +
                        '<div id="cm-inject-status" style="font-size:10px; font-weight:700; color:#64748b; min-height:13px;">Accepts a whole AI reply — code fences, prose around the JSON and smart quotes are cleaned automatically.</div>' +
                    '</div>' +

                    '<div style="display:flex; gap:6px;">' +
                        '<button id="cm-load-applet-btn" style="flex:2; background:linear-gradient(135deg, #6366f1, #4f46e5); color:#fff; border:none; padding:8px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">' +
                            '<i class="fas fa-play"></i> Apply to Widget' +
                        '</button>' +
                        '<button id="cm-reset-cache-btn" style="flex:1; background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; padding:8px 8px; border-radius:8px; font-size:10.5px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">' +
                            '<i class="fas fa-trash-alt"></i> Reset' +
                        '</button>' +
                    '</div>' +
                '</div>';

            window.setupClassmateManagerEvents();
        };

        window.setupClassmateManagerEvents = function() {
            const toggleWidgetBtn = document.getElementById('cm-toggle-widget-btn');
            if (toggleWidgetBtn) {
                toggleWidgetBtn.onclick = () => {
                    const widget = document.getElementById('classmate-circular-widget');
                    if (widget) {
                        const isHidden = widget.style.display === 'none';
                        widget.style.display = isHidden ? 'flex' : 'none';
                        window.renderClassmateManagerPane();
                    }
                };
            }

            const togglePanelBtn = document.getElementById('cm-toggle-panel-btn');
            if (togglePanelBtn) {
                togglePanelBtn.onclick = () => {
                    window.toggleClassmatePanel();
                    setTimeout(() => {
                        window.renderClassmateManagerPane();
                    }, 350);
                };
            }

            const slider = document.getElementById('cm-friendship-slider');
            const badge = document.getElementById('cm-friendship-badge');
            const meterBar = document.getElementById('cm-friendship-bar');

            // One path for every meter control: badge + bar + saved state + the
            // live chat meter inside the iframe (which owns the in-chat ladder).
            window.applyClassmateFriendship = function(val, syncSlider) {
                const clamped = Math.max(-100, Math.min(100, parseInt(val, 10) || 0));
                const status = window.getFriendshipStatus(clamped);
                if (badge) {
                    badge.innerHTML = status.icon + ' ' + clamped + ' / 100 (' + status.label + ')';
                    badge.style.color = status.color;
                }
                if (meterBar) meterBar.style.width = Math.round(((clamped + 100) / 200) * 100) + '%';
                if (syncSlider && slider) slider.value = String(clamped);
                window.saveClassmateState({ friendshipLevel: clamped });
                try {
                    const frame = document.getElementById('classmate-applet-frame');
                    const api = frame && frame.contentWindow && frame.contentWindow.ClassmateChat;
                    if (api && typeof api.setFriendship === 'function') api.setFriendship(clamped);
                } catch(e) {}
            };

            if (slider) {
                slider.oninput = () => window.applyClassmateFriendship(slider.value, false);
            }

            document.querySelectorAll('.cm-f-preset').forEach(btn => {
                btn.onclick = () => window.applyClassmateFriendship(btn.getAttribute('data-val'), true);
            });

            const injectStatus = document.getElementById('cm-inject-status');
            function setInjectStatus(text, color) {
                if (!injectStatus) return;
                injectStatus.textContent = text;
                injectStatus.style.color = color || '#64748b';
            }

            const pasteBtn = document.getElementById('cm-paste-clipboard-btn');
            if (pasteBtn) {
                pasteBtn.onclick = async () => {
                    try {
                        const text = await navigator.clipboard.readText();
                        const area = document.getElementById('cm-applet-paste-input');
                        if (area && text) { area.value = text; setInjectStatus('Loaded ' + text.length + ' characters from the clipboard — press Apply to Widget.', '#93c5fd'); }
                        else setInjectStatus('Nothing to paste — copy your Classmate JSON first.', '#fca5a5');
                    } catch (e) {
                        setInjectStatus('Clipboard blocked by the browser — paste manually with Ctrl+V.', '#fca5a5');
                    }
                };
            }

            const sampleBtn = document.getElementById('cm-load-sample-btn');
            if (sampleBtn) {
                sampleBtn.onclick = () => {
                    const area = document.getElementById('cm-applet-paste-input');
                    if (area) area.value = '';
                    // No injected scenario ⇒ the engine falls back to its own built-in
                    // demo, which exercises every media type, every graded test type,
                    // the branching roleplay, the poll and the relationship meter.
                    window.saveClassmateState({ appletHtml: '' });
                    const frame = document.getElementById('classmate-applet-frame');
                    if (frame) frame.srcdoc = window.getDefaultClassmateHtml(window.getSelectedClassmateChar(), Object.assign({}, window.getClassmateState(), { headerless: true }));
                    setInjectStatus('Built-in demo scenario loaded. Paste your own JSON above and press Apply to Widget to replace it.', '#93c5fd');
                };
            }

            const clearBtn = document.getElementById('cm-clear-input-btn');
            if (clearBtn) {
                clearBtn.onclick = () => {
                    const area = document.getElementById('cm-applet-paste-input');
                    if (area) area.value = '';
                    setInjectStatus('Field cleared.', '#64748b');
                };
            }

            const loadBtn = document.getElementById('cm-load-applet-btn');
            const appletInp = document.getElementById('cm-applet-paste-input');
            if (loadBtn && appletInp) {
                loadBtn.onclick = () => {
                    const code = appletInp.value.trim();
                    if (!code) {
                        setInjectStatus('Paste the Classmate JSON or HTML5 first (Ctrl+V).', '#fca5a5');
                        return;
                    }
                    if (code.indexOf('{') === -1 && code.indexOf('[') === -1 && code.indexOf('<') === -1) {
                        setInjectStatus('That does not look like scenario JSON or HTML5 — paste the AI reply or the exported .html file contents.', '#fca5a5');
                        return;
                    }
                    window.loadClassmateAppletCode(code);
                    setInjectStatus('Applied — the chat is rendering your scenario now.', '#86efac');
                    const panel = document.getElementById('classmate-side-panel');
                    if (panel && panel.style.transform.indexOf('translateX(-120%)') !== -1) {
                        window.toggleClassmatePanel(true);
                    }
                };
            }

            const resetBtn = document.getElementById('cm-reset-cache-btn');
            if (resetBtn) {
                resetBtn.onclick = () => {
                    if (confirm("Clear memory cache and reset Classmate scenario to initial state?")) {
                        window.resetClassmateCache();
                        if (appletInp) appletInp.value = '';
                        alert("🧹 Classmate memory cache cleared!");
                        window.renderClassmateManagerPane();
                    }
                };
            }
        };

        window.generateClassmateMasterPromptText = ${generateClassmateMasterPromptText.toString()};

        window.generateClassmateMasterPrompt = function(targetDoc) {
            const state = window.getClassmateState();
            const charObj = window.getSelectedClassmateChar();
            const fStatus = window.getFriendshipStatus(state.friendshipLevel);

            if (typeof window.generateClassmateMasterPromptText !== 'function') {
                console.error('generateClassmateMasterPromptText is missing');
                return;
            }

            const promptText = window.generateClassmateMasterPromptText(state, charObj, fStatus);
            const doc = targetDoc || document;
            const win = (targetDoc && targetDoc.defaultView) ? targetDoc.defaultView : window;

            function updateUI() {
                const copyBtns = doc.querySelectorAll('#cm-copy-prompt-btn, #cm-detach-copy-prompt-btn');
                copyBtns.forEach(btn => {
                    btn.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> Copied Master AI!';
                    btn.style.background = '#059669';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fas fa-copy"></i> Copy Master AI';
                        btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                    }, 2500);
                });
            }

            function fallbackCopyText(text, d, w) {
                try {
                    if (w && w.focus) w.focus();
                    const ta = d.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    ta.style.top = '-9999px';
                    d.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    const successful = d.execCommand('copy');
                    d.body.removeChild(ta);
                    return successful;
                } catch(e) { return false; }
            }

            if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
                win.navigator.clipboard.writeText(promptText).then(() => {
                    updateUI();
                }).catch(() => {
                    if (fallbackCopyText(promptText, doc, win)) {
                        updateUI();
                    } else if (win.prompt) {
                        win.prompt("Copy Master AI Prompt:", promptText);
                        updateUI();
                    }
                });
            } else {
                if (fallbackCopyText(promptText, doc, win)) {
                    updateUI();
                } else if (win.prompt) {
                    win.prompt("Copy Master AI Prompt:", promptText);
                    updateUI();
                }
            }
        };

        const DEFAULT_CLASSMATE_STATE = ${JSON.stringify(DEFAULT_CLASSMATE_STATE)};
        // The Classmate chat engine is inlined here with .toString() so the
        // exported lesson never needs a separate runtime bundle. It must stay
        // self-contained (see utils/classmateChatEngine.ts).
        // esbuild preserves function names by injecting name-helper calls into the
        // serialized source. That helper lives in the bundler's module scope, not in
        // the exported lesson, so strip the calls and keep a shim for anything later.
        window.__name = window.__name || function (target) { return target; };
        window.getDefaultClassmateHtml = ${getClassmateChatHtml.toString().replace(/__name\([^)]*\)\s*;?/g, '').replace(/<\/script>/gi, "<\\/script>").replace(/<script>/gi, "<\\script>")};

        window.loadClassmateAppletCode = function(jsonOrHtml) {
            if (!jsonOrHtml || jsonOrHtml.trim() === '') return;

            window.saveClassmateState({ appletHtml: jsonOrHtml, panelOpen: true });

            const charObj = window.getSelectedClassmateChar();
            const state = window.getClassmateState();
            let html = window.getDefaultClassmateHtml(charObj, Object.assign({}, state, { headerless: true }));

            const frame = document.getElementById('classmate-applet-frame');
            if (frame) {
                frame.srcdoc = html;
            }

            try {
                if (window.__classmatePopup && !window.__classmatePopup.closed) {
                    const af = window.__classmatePopup.document.getElementById('applet-frame');
                    if (af) af.srcdoc = html;
                }
            } catch(e) {}
        };

        // Local hard-drive media import queue. Object URLs are revoked when an item is removed.
        window.__fcImportedMedia = window.__fcImportedMedia || [];
        window.__fcSelectedMedia = window.__fcSelectedMedia || null;
        function fcFormatBytes(bytes) {
            if (!bytes) return '0 B';
            const units = ['B','KB','MB','GB']; let i = 0; let n = bytes;
            while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
            return n.toFixed(i ? 1 : 0) + ' ' + units[i];
        }
        function fcMediaKind(file) {
            if (file.type.indexOf('image/') === 0 || /\\.(svg|avif|bmp|heic|heif|tif|tiff|ico)$/i.test(file.name)) return 'image';
            if (file.type.indexOf('video/') === 0 || /\\.(mkv|avi|mov|m4v|ogv|3gp|3g2|ts|mts|m2ts|mpeg|mpg)$/i.test(file.name)) return 'video';
            return 'audio';
        }
        function fcRenderImportLibrary() {
            const lib = document.getElementById('fc-import-library'); if (!lib) return;
            lib.innerHTML = '';
            window.__fcImportedMedia.forEach(function(item, idx) {
                const row = document.createElement('div'); row.className = 'fc-import-item';
                const thumb = document.createElement(item.kind === 'video' ? 'video' : item.kind === 'audio' ? 'audio' : 'img');
                thumb.className = 'fc-import-thumb'; thumb.src = item.url; if (item.kind === 'video' || item.kind === 'audio') thumb.controls = true;
                const meta = document.createElement('div'); meta.className = 'fc-import-meta';
                meta.innerHTML = '<span class="fc-import-name">' + item.file.name.replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}) + '</span><span class="fc-import-type">' + item.kind.toUpperCase() + ' · ' + fcFormatBytes(item.file.size) + '</span>';
                const remove = document.createElement('button'); remove.className = 'fc-import-remove'; remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove';
                remove.onclick = function(e) { e.stopPropagation(); URL.revokeObjectURL(item.url); window.__fcImportedMedia.splice(idx, 1); fcRenderImportLibrary(); };
                row.appendChild(thumb); row.appendChild(meta); row.appendChild(remove);
                row.onclick = function() { window.__fcSelectedMedia = item; if (window.opener && typeof window.opener.postMessage === 'function') window.opener.postMessage({ type: 'fc_media_selected', name: item.file.name, kind: item.kind, url: item.url }, '*'); const view = document.getElementById('fc-media-view'); if (view) { view.innerHTML = ''; const player = document.createElement(item.kind === 'video' ? 'video' : item.kind === 'audio' ? 'audio' : 'img'); player.src = item.url; player.controls = item.kind !== 'image'; player.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;'; view.appendChild(player); } const word = document.getElementById('fc-word-view'); if (word) word.textContent = item.file.name.replace(/\\.[^.]+$/, ''); };
                lib.appendChild(row);
            });
        }
        function fcQueueFiles(fileList) {
            Array.from(fileList || []).forEach(function(file) {
                if (!file || (!file.type && !/\\.(png|jpe?g|gif|webp|svg|avif|bmp|mp4|webm|mov|mkv|avi|m4v|ogv|mp3|wav|ogg|m4a|aac|flac|opus|weba|wma)$/i.test(file.name))) return;
                window.__fcImportedMedia.push({file:file, kind:fcMediaKind(file), url:URL.createObjectURL(file)});
            });
            fcRenderImportLibrary();
            const status = document.getElementById('fc-import-status'); if (status) status.textContent = window.__fcImportedMedia.length + ' media item(s) ready. Select one to preview.';
        }
        function fcSetupImportUi() {
            const pane = document.getElementById('fc-import-pane'); if (!pane || pane.dataset.ready === '1') return; pane.dataset.ready = '1';
            const input = document.getElementById('fc-import-file-input'), folder = document.getElementById('fc-import-folder-input'), drop = document.getElementById('fc-import-drop-zone');
            document.getElementById('fc-open-media-btn')?.addEventListener('click', function(){ input?.click(); });
            document.getElementById('fc-open-folder-btn')?.addEventListener('click', function(){ folder?.click(); });
            drop?.addEventListener('click', function(){ input?.click(); });
            input?.addEventListener('change', function(){ fcQueueFiles(input.files); input.value=''; });
            folder?.addEventListener('change', function(){ fcQueueFiles(folder.files); folder.value=''; });
            ['dragenter','dragover'].forEach(function(ev){ drop?.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('drag-over');}); });
            ['dragleave','drop'].forEach(function(ev){ drop?.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('drag-over'); if(ev==='drop')fcQueueFiles(e.dataTransfer.files);}); });
            document.getElementById('fc-clear-imports-btn')?.addEventListener('click', function(){
                window.__fcImportedMedia.forEach(function(item){ URL.revokeObjectURL(item.url); });
                window.__fcImportedMedia = []; window.__fcSelectedMedia = null; fcRenderImportLibrary();
                const status = document.getElementById('fc-import-status'); if (status) status.textContent = 'Import queue cleared.';
            });
            document.getElementById('fc-record-audio-btn')?.addEventListener('click', async function(){
                if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { alert('Audio recording is not supported by this browser.'); return; }
                try { const stream=await navigator.mediaDevices.getUserMedia({audio:true}); const chunks=[]; const rec=new MediaRecorder(stream); rec.ondataavailable=function(e){if(e.data.size)chunks.push(e.data);}; rec.onstop=function(){stream.getTracks().forEach(function(t){t.stop();});fcQueueFiles([new File(chunks,'recording-'+Date.now()+'.webm',{type:rec.mimeType||'audio/webm'})]);}; rec.start(); setTimeout(function(){if(rec.state==='recording')rec.stop();},10000); alert('Recording started. It will stop automatically after 10 seconds.'); } catch(e) { alert('Microphone permission was not granted.'); }
            });
        }

        // Header reactions (beside the friendship meter) are wired once, guarded, so the
        // lesson runtime and this module can never bind the same button twice.
        setTimeout(() => { try { window.wireClassmateReactions(); } catch (e) {} }, 500);

        // Tab Switcher Handler in Media Manager
        document.addEventListener('click', function(e) {
            const target = e.target;
            const tabBtn = target.closest ? target.closest('.fc-tab') : null;
            if (tabBtn) {
                const source = tabBtn.getAttribute('data-source');
                if (source === 'import') {
                    const pane = document.getElementById('fc-import-pane');
                    const empty = document.getElementById('fc-empty-results');
                    if (pane) pane.style.display = 'block';
                    if (empty) empty.style.display = 'none';
                    fcSetupImportUi();
                } else if (source === 'classmate') {
                    const pane = document.getElementById('fc-import-pane');
                    const empty = document.getElementById('fc-empty-results');
                    if (pane) pane.style.display = 'none';
                    if (empty) empty.style.display = 'none';
                    window.renderClassmateManagerPane();
                } else {
                    const pane = document.getElementById('fc-import-pane');
                    const empty = document.getElementById('fc-empty-results');
                    if (pane) pane.style.display = 'none';
                    if (empty) empty.style.display = 'block';
                }
            }
        });

        // Auto Load Initial Telegram Chat Engine
        setTimeout(() => {
            window.updateClassmateWidgetUI();
        }, 500);
    `;

    return { html, css, js };
}
