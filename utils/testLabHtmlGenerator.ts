
import type { LearnerProfile } from '../types';
import { getTestingPanelFeatures } from './html/testingPanel';
import { getCustomAvatar } from '../services/customAvatarStore';
import { getAvatarUrl } from '../services/avatarService';
import { useAppStore } from '../store/useAppStore';
import { buildLessonFileName, getLessonFilePrefill, type LessonAudience } from './lessonFileNaming';

export const buildTestLabHtml = (
    jsonContent: any,
    learner: LearnerProfile,
    tutor?: { name?: string; avatar?: string } | any
): string => {
    const tp = getTestingPanelFeatures();
    const safeName = learner.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const safeVoice = (jsonContent?.settings?.readAloudVoice || learner.readAloudVoice || '').replace(/"/g, '\\"');

    // Resolve the learner's real photo (saved on disk / custom avatar store) — never a cartoon.
    let learnerAvatarB64 = '';
    const learnerAvatarId = (learner as any)?.avatar || (learner as any)?.avatarId || (learner as any)?.avatarBase64 || '';
    if (learnerAvatarId && learnerAvatarId.startsWith('data:image')) {
        learnerAvatarB64 = learnerAvatarId;
    } else if (learnerAvatarId) {
        learnerAvatarB64 = getCustomAvatar(learnerAvatarId) || (learner as any)?.avatarBase64 || '';
    }
    if (!learnerAvatarB64) {
        learnerAvatarB64 = getAvatarUrl((learner as any)?.gender || 'Male', learnerAvatarId, learner.name);
    }

    // Resolve the tutor photo: explicit avatar > custom avatar store (from tutor profile) > initials fallback.
    let tutorAvatarB64 = '';
    let tutorName = 'Tutor';
    if (tutor) {
        tutorName = String(tutor.name || 'Tutor');
        const tId = tutor.avatar || tutor.avatarId || tutor.photoUrl || '';
        if (tId && tId.startsWith('data:image')) {
            tutorAvatarB64 = tId;
        } else if (tId) {
            tutorAvatarB64 = getCustomAvatar(tId) || tutor.avatarBase64 || '';
        }
        if (!tutorAvatarB64) {
            try {
                const ti = useAppStore.getState().tutorInfo;
                if (ti?.avatarId) tutorAvatarB64 = getCustomAvatar(ti.avatarId) || '';
                if (!tutorName || tutorName === 'Tutor') tutorName = ti?.name || 'Tutor';
            } catch (e) { /* store unavailable */ }
        }
        if (!tutorAvatarB64) {
            const initial = (tutorName || 'T').charAt(0).toUpperCase();
            tutorAvatarB64 = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#4f46e5"/><text x="50" y="63" font-size="44" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">${initial}</text></svg>`)}`;
        }
    }

    const learnerInitial = (learner.name || 'L').charAt(0).toUpperCase();
    if (!learnerAvatarB64) {
        learnerAvatarB64 = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#059669"/><text x="50" y="63" font-size="44" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">${learnerInitial}</text></svg>`)}`;
    }

    // Startup Script to auto-launch and handle state
    const startupScript = `
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize Test Lab Overlay
            const overlay = document.getElementById('testing-panel-overlay');
            if (overlay) overlay.style.display = 'flex';

            // --- INJECTED PREFERENCES ---
            if (typeof TP_STATE !== 'undefined') {
                TP_STATE.preferredVoice = "${safeVoice}";
                // Learner photo + optional tutor (name & photo) embedded from the tutor's real profile
                TP_STATE.learnerAvatar = ${JSON.stringify(learnerAvatarB64)};
                TP_STATE.tutor = ${JSON.stringify(tutorName && tutorAvatarB64 ? { name: tutorName, avatar: tutorAvatarB64 } : null)};
            }

            // --- FIX: Initialize Audio Elements in TP_STATE ---
            if (typeof TP_STATE !== 'undefined') {
                TP_STATE.bgAudio = document.getElementById('tp-bg-music');
                TP_STATE.sfxAudio = document.getElementById('tp-sfx');
                
                // Initialize voices
                if (typeof populateTpVoices === 'function') {
                    populateTpVoices(); // Will use TP_STATE.preferredVoice
                }
                
                // Setup track listener
                if (TP_STATE.bgAudio) {
                    TP_STATE.bgAudio.addEventListener('ended', window.nextTpTrack);
                }
            }

            // Pre-load JSON Data into Textarea (Source of Truth for new games)
            const textarea = document.getElementById('tp-json-input');
            const data = ${JSON.stringify(jsonContent).replace(/</g, '\\u003c')};
            
            if (textarea) {
                textarea.value = JSON.stringify(data, null, 2);
            }
            
            // --- STATE RESTORATION LOGIC ---
            const SAVE_KEY = 'tp_save_state_${safeName}';
            let restored = false;
            
            if (localStorage.getItem(SAVE_KEY)) {
                if (confirm("Found a previous session for ${learner.name}. Do you want to resume?")) {
                    try {
                        const savedData = JSON.parse(localStorage.getItem(SAVE_KEY));
                        if (savedData && savedData.players && savedData.queue) {
                            TP_STATE.players = savedData.players;
                            TP_STATE.queue = savedData.queue; // Contains 'taken' status
                            TP_STATE.currentIndex = savedData.currentIndex || 0;
                            // Initialize Game Mode UI directly
                            switchTpTab('game');
                            document.getElementById('tp-lobby-screen').style.display = 'none';
                            document.getElementById('tp-game-stage').style.display = 'flex';
                            if(typeof renderTpSettingsRoster === 'function') renderTpSettingsRoster();
                            if(typeof renderTpGrid === 'function') renderTpGrid();
                            if(TP_STATE.players.length > 0) setTpActivePlayer(TP_STATE.players[0].id);
                            
                            restored = true;
                        }
                    } catch(e) {
                        console.error("Failed to restore state", e);
                    }
                }
            }

            if (!restored) {
                // Default Start
                if (typeof TP_STATE !== 'undefined') {
                    // Reset Roster — learner (real photo) first, then optional tutor (name & photo)
                    TP_STATE.players = []; 
                    TP_STATE.players.push({ 
                        id: Date.now(), 
                        name: "${learner.name.replace(/"/g, '\\"')}", 
                        score: 0, 
                        seed: Math.random(),
                        avatar: ${JSON.stringify(learnerAvatarB64)} || ''
                    });
                    if (TP_STATE.tutor && TP_STATE.tutor.name) {
                        TP_STATE.players.push({ 
                            id: Date.now() + 1, 
                            name: TP_STATE.tutor.name, 
                            score: 0, 
                            seed: Math.random(),
                            avatar: TP_STATE.tutor.avatar || ''
                        });
                    }
                    
                    if (typeof renderTpSettingsRoster === 'function') {
                        renderTpSettingsRoster();
                    }
                }

                // Auto-Launch Game from JSON
                if (typeof initTpGame === 'function') {
                    setTimeout(() => {
                        initTpGame();
                    }, 300);
                }
            }
            
            // Setup Auto-Save hook
            // We hook into the global save function exposed by testingPanel.ts
            window.tpSaveHook = () => {
                const stateToSave = {
                    players: TP_STATE.players,
                    queue: TP_STATE.queue,
                    currentIndex: TP_STATE.currentIndex
                };
                try {
                    localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
                } catch (e) {
                    console.warn("Storage quota exceeded, could not save state.");
                }
            };

            // Initialize Accessibility Widget
            setTimeout(() => {
                if (typeof Sienna !== 'undefined' && typeof Sienna.init === 'function') {
                    Sienna.init();
                }
            }, 1000);
        });
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Lab: ${learner.name}</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://website-widgets.pages.dev/dist/sienna.min.js" defer></script>
    <style>
        body { margin: 0; padding: 0; background: #0f172a; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
        /* Testing Panel CSS */
        ${tp.css}
    </style>
</head>
<body>
    <!-- Testing Panel HTML -->
    ${tp.html}

    <script>
        // Testing Panel Logic
        ${tp.js}

        // Auto-Start Logic
        ${startupScript}
    </script>
</body>
</html>`;
};

export const handleSaveTestLabAsHtml = (
    jsonContent: any,
    learner: LearnerProfile,
    tutor?: { name?: string; avatar?: string } | any,
    audience: LessonAudience = 'Learner'
) => {
    const html = buildTestLabHtml(jsonContent, learner, tutor);

    // Shared lesson naming: {learner}_{book}_{unit}_{type}_{Learner|Presenter}_{date}
    const filename = buildLessonFileName({
        learnerName: learner.name,
        lessonLabel: 'Test Lab',
        audience,
        ...getLessonFilePrefill(learner),
    });

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Learner-ready ZIP alongside the plain HTML file
    import('./htmlZip').then(m => m.downloadZipOfHtml(html, filename)).catch(() => {});
};
