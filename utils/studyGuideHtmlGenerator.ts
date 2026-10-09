
import type { StudyGuideOutput, LearnerProfile } from '../types';
import { getCustomAvatar } from '../services/customAvatarStore';
import { VOICE_GROUP_RUNTIME_JS } from './voiceGroups';

export const handleSaveStudyGuideAsInteractiveHtml = (content: StudyGuideOutput, learner: LearnerProfile, filename: string) => {
    
    let avatarBase64 = '';
    const learnerAvatar = (learner as any).avatar || (learner as any).avatarId || '';
    if (learnerAvatar) {
        if (learnerAvatar.startsWith('custom:')) {
            avatarBase64 = getCustomAvatar(learnerAvatar) || '';
        } else if (learnerAvatar.startsWith('data:image/')) {
            avatarBase64 = learnerAvatar;
        }
    }

    // Prepare data payload safe for embedding
    const payload = {
        content,
        learnerName: learner.name,
        learnerVoice: learner.readAloudVoice || '',
        avatarBase64: avatarBase64 || ''
    };
    const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Study Guide: ${learner.name}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <script src="https://website-widgets.pages.dev/dist/sienna.min.js" defer></script>
    <style>
        :root {
            --primary: #58cc02;
            --primary-dark: #46a302;
            --secondary: #1cb0f6;
            --accent: #ff4b4b;
            --gold: #ffc800;
            --bg: #f7f7f7;
            --card: #ffffff;
            --text: #4b4b4b;
            --text-light: #777;
            --border: #e5e5e5;
        }
        body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); padding-bottom: 80px; overflow-x: hidden; }
        * { box-sizing: border-box; }
        
        /* Navigation Fixed Bottom */
        .nav-bar { position: fixed; bottom: 0; width: 100%; background: white; display: flex; justify-content: space-around; padding: 12px; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); z-index: 1000; border-top: 2px solid var(--border); }
        .nav-btn { border: none; background: none; color: #afafaf; font-size: 0.8rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; transition: color 0.2s; }
        .nav-btn.active { color: var(--secondary); }
        .nav-btn i { font-size: 1.4rem; margin-bottom: 2px; }

        /* Views - Full Width Responsive */
        .view { display: none; padding: 20px; width: 100%; max-width: 1200px; margin: 0 auto; animation: fadeIn 0.3s; padding-bottom: 100px; }
        .view.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* HERO AUDIO */
        .hero-audio { background: white; border-radius: 16px; padding: 30px; text-align: center; box-shadow: 0 4px 0 #e5e5e5; border: 2px solid var(--border); margin-bottom: 20px; }
        .hero-icon { width: 80px; height: 80px; background: #eef2ff; color: var(--secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 15px; }
        .audio-title { font-weight: 800; font-size: 1.5rem; margin-bottom: 10px; color: var(--text); }
        .audio-desc { color: var(--text-light); font-size: 1rem; margin-bottom: 30px; }
        .play-btn-lg { background: var(--primary); color: white; border: none; width: 80px; height: 80px; border-radius: 50%; font-size: 2rem; cursor: pointer; box-shadow: 0 6px 0 var(--primary-dark); transition: transform 0.1s; display: inline-flex; align-items: center; justify-content: center; }
        .play-btn-lg:active { transform: translateY(4px); box-shadow: none; }
        .transcript-box { background: #f8fafc; border: 2px solid var(--border); border-radius: 16px; padding: 25px; text-align: left; margin-top: 20px; font-size: 1.1rem; line-height: 1.8; max-height: 500px; overflow-y: auto; color: #334155; }
        .transcript-box p { margin-bottom: 1.2em; }
        .transcript-box b { color: #1e40af; font-weight: 700; background: #dbeafe; padding: 0 4px; border-radius: 4px; }
        .speaker-label { font-weight: bold; color: var(--secondary); font-size: 0.9rem; text-transform: uppercase; margin-right: 5px; display:inline-block; margin-top:10px; }

        /* SLIDES CAROUSEL */
        .slides-carousel-wrapper { position: relative; width: 100%; display: flex; justify-content: center; align-items: flex-start; gap: 20px; min-height: 500px; }
        #slides-container { width: 100%; max-width: 800px; position: relative; }
        .slide-card { display: none; background: white; border-radius: 16px; padding: 0; box-shadow: 0 4px 0 #e5e5e5; border: 2px solid var(--border); overflow: hidden; animation: slideIn 0.3s ease; }
        .slide-card.active { display: block; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        
        .slide-nav-btn { background: white; border: 2px solid var(--border); color: var(--text); width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 4px 0 var(--border); margin-top: 200px; }
        .slide-nav-btn:hover { border-color: var(--secondary); color: var(--secondary); transform: translateY(-2px); }
        .slide-nav-btn:active { transform: translateY(2px); box-shadow: none; }
        .slide-nav-btn:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }

        .slide-header { background: #f0f9ff; padding: 15px 20px; border-bottom: 2px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .slide-title-wrap { display: flex; align-items: center; gap: 10px; }
        .slide-icon { color: var(--secondary); font-size: 1.2rem; }
        .slide-title { font-weight: 800; color: #1e3a8a; font-size: 1.1rem; margin: 0; }
        .slide-count { font-size: 0.8rem; font-weight: bold; color: var(--text-light); background: rgba(255,255,255,0.5); padding: 4px 8px; border-radius: 10px; }
        
        .slide-body { padding: 30px; min-height: 400px; }
        .slide-content { margin-bottom: 20px; font-size: 1.1rem; line-height: 1.7; }
        
        .info-box { background: #fffbeb; border: 2px solid #fde68a; border-radius: 10px; padding: 12px; margin-bottom: 12px; font-size: 0.9rem; }
        .info-label { font-weight: bold; color: #d97706; display: block; margin-bottom: 4px; font-size: 0.8rem; text-transform: uppercase; }
        
        .example-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
        .example-label { font-weight: bold; color: var(--primary-dark); display: block; margin-bottom: 4px; font-size: 0.8rem; text-transform: uppercase; }
        .example-text { font-style: italic; color: #166534; display: block; margin-bottom: 4px; }

        .error-box { background: #fef2f2; border: 2px solid #fecaca; border-radius: 10px; padding: 12px; }
        .error-label { font-weight: bold; color: #dc2626; display: block; margin-bottom: 4px; font-size: 0.8rem; text-transform: uppercase; }

        /* FLASHCARD APP UI - NEW LAYOUT */
        .fc-header { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .mode-card { background: white; border: 2px solid var(--border); border-radius: 12px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 0 var(--border); }
        .mode-card:hover { transform: translateY(-2px); }
        .mode-card:active { transform: translateY(2px); box-shadow: none; }
        .mode-card.active { border-color: var(--secondary); background: #f0f9ff; color: var(--secondary); }
        .mode-icon { font-size: 1.5rem; margin-bottom: 5px; display: block; }
        .mode-label { font-weight: 800; font-size: 0.9rem; }

        /* THE GRID CONTAINER */
        .study-grid { display: grid; grid-template-columns: 260px 1fr 260px; gap: 20px; align-items: start; }
        @media (max-width: 1000px) {
            .study-grid { grid-template-columns: 1fr; }
            .sidebar-col { display: none; }
            .sidebar-col-mobile { display: block; }
            .slides-carousel-wrapper { flex-direction: column; align-items: center; }
            .slide-nav-btn { margin-top: 10px; order: 2; width: 100px; height: 40px; border-radius: 8px; }
            #slides-container { order: 1; }
        }
        @media (min-width: 1001px) {
            .sidebar-col-mobile { display: none; }
        }

        /* ===== PHONE / TOUCH AUDIT (390px) ===== */
        @media (max-width: 480px) {
            button, .btn, .nav-btn, .tab-btn, .slide-nav-btn, .play-btn,
            .speaker-btn, .replay-btn, .record-btn, [role="button"] { min-height: 44px; min-width: 44px; }
            table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
            h1 { font-size: 1.5rem; }
            h2 { font-size: 1.25rem; }
            body { overflow-x: hidden; }
        }
        @media (max-width: 390px) {
            h1 { font-size: 1.35rem; }
        }


        /* SIDEBAR STYLES */
        .profile-card { background: white; border-radius: 16px; padding: 20px; text-align: center; border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); margin-bottom: 20px; }
        .avatar-img { width: 100px; height: 100px; border-radius: 50%; background: #e0f2fe; margin: 0 auto 10px; border: 4px solid var(--secondary); }
        .learner-name { font-weight: 800; font-size: 1.2rem; color: var(--text); margin-bottom: 5px; }
        .xp-badge { display: inline-flex; align-items: center; gap: 6px; background: #fff7ed; color: #d97706; padding: 6px 14px; border-radius: 20px; font-weight: 800; border: 2px solid #fed7aa; }
        
        .stat-card { background: white; border-radius: 16px; padding: 20px; border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;}
        .stat-row { display: flex; justify-content: space-between; align-items: center; }
        .stat-label { font-size: 0.85rem; font-weight: 700; color: var(--text-light); text-transform: uppercase; }
        .stat-val { font-weight: 800; font-size: 1.1rem; color: var(--text); }
        
        .quote-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 15px; text-align: center; color: #166534; font-style: italic; font-weight: 600; font-size: 0.95rem; box-shadow: 0 2px 0 #bbf7d0; }

        /* FLASHCARD CENTER */
        .study-container { background: white; border-radius: 20px; border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); padding: 20px; position: relative; min-height: 600px; display: flex; flex-direction: column; width: 100%; margin: 0 auto; }
        
        /* 3D Card Flip */
        .card-wrapper { flex-grow: 1; perspective: 1000px; position: relative; min-height: 450px; margin-bottom: 20px; cursor: pointer; }
        .flashcard { width: 100%; height: 100%; position: absolute; transform-style: preserve-3d; transition: transform 0.6s; border-radius: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .flashcard.flipped { transform: rotateY(180deg); }
        .face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; border-radius: 16px; background: white; border: 2px solid var(--border); text-align: center; overflow-y: auto; }
        .back { transform: rotateY(180deg); background: #f8fafc; border-color: var(--secondary); }
        
        .fc-labels { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px; }
        .fc-badge { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 12px; border: 1px solid transparent; }
        .badge-pos { background: #e0f2fe; color: #0284c7; border-color: #bae6fd; }
        .badge-reg { background: #f3f4f6; color: #4b5563; border-color: #d1d5db; }

        .fc-term { font-size: 3rem; font-weight: 800; color: var(--text); margin-bottom: 15px; z-index: 2; position: relative; }
        .fc-front-icon { position: absolute; font-size: 8rem; color: rgba(0,0,0,0.04); top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1; pointer-events: none; }
        
        .fc-hint { color: var(--text-light); font-size: 0.9rem; margin-top: auto; }
        .fc-def { font-size: 1.6rem; font-weight: 600; color: #1e3a8a; margin-bottom: 25px; }
        .fc-meta { background: white; border-radius: 10px; padding: 15px; width: 100%; text-align: left; margin-bottom: 10px; border: 1px solid var(--border); font-size: 1rem; }
        .fc-meta strong { color: var(--secondary); display: block; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 4px; }
        
        .audio-icon { position: absolute; top: 15px; right: 15px; color: var(--secondary); font-size: 1.8rem; cursor: pointer; z-index: 10; padding: 5px; }
        
        /* Action Buttons */
        .actions { display: flex; gap: 15px; margin-top: auto; }
        .action-btn { flex: 1; padding: 15px; border-radius: 16px; font-weight: 800; font-size: 1.1rem; cursor: pointer; border: none; box-shadow: 0 4px 0 rgba(0,0,0,0.2); transition: transform 0.1s; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .action-btn:active { transform: translateY(4px); box-shadow: none; }
        .btn-wrong { background: white; color: var(--accent); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); }
        .btn-correct { background: var(--primary); border: 2px solid var(--primary-dark); box-shadow: 0 4px 0 var(--primary-dark); }
        .btn-wrong:hover { background: #fff0f0; }
        .btn-correct:hover { background: #61d30b; }

        /* Mastery UI (Linear) */
        .mastery-container { margin-top: 5px; width: 100%; }
        .mastery-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: bold; color: var(--text-light); text-transform: uppercase; margin-bottom: 5px; }
        .mastery-track { background: var(--border); height: 12px; border-radius: 6px; overflow: hidden; }
        .mastery-fill { background: var(--primary); height: 100%; width: 0%; transition: width 0.5s ease; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.1); }
        
        /* Celebration */
        .celebration-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); background: white; padding: 20px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 100; text-align: center; border: 4px solid var(--gold); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .celebration-popup.show { transform: translate(-50%, -50%) scale(1); }
        .celebration-popup h3 { color: var(--gold); font-size: 2rem; margin: 0; }
        .celebration-popup p { font-size: 1.2rem; font-weight: bold; margin: 10px 0 0; }

        /* Game Modes Overlay */
        .game-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white; border-radius: 18px; z-index: 20; padding: 20px; display: none; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .game-overlay.active { display: flex; }
        
        /* WYR Updated */
        .wyr-option { width: 100%; padding: 15px; margin: 10px 0; border: 2px solid var(--border); border-radius: 12px; font-weight: bold; background: white; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 0 var(--border); font-size: 1rem; }
        .wyr-option:hover { border-color: var(--secondary); background: #f0f9ff; }
        .wyr-option:active { transform: translateY(4px); box-shadow: none; }
        .consequence-box { background: #fffbeb; border: 2px solid #fcd34d; padding: 15px; border-radius: 12px; margin-top: 15px; color: #92400e; font-weight: bold; display: none; width: 100%; animation: popIn 0.3s; }
        @keyframes popIn { 0% { transform: scale(0.9); opacity:0; } 100% { transform: scale(1); opacity:1; } }
        
        /* Speed Match UI */
        .speed-header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-weight: bold; color: var(--text-light); }
        .speed-score { color: var(--primary); font-size: 1.2rem; }
        .timer-bar { width: 100%; height: 10px; background: var(--border); border-radius: 5px; margin-bottom: 30px; overflow: hidden; }
        .timer-fill { height: 100%; background: var(--accent); width: 100%; transition: width 0.1s linear; }
        
        .speed-question-card { background: white; border: 2px solid var(--secondary); color: var(--secondary); border-radius: 12px; padding: 20px; font-size: 1.5rem; font-weight: 800; width: 100%; margin-bottom: 20px; box-shadow: 0 4px 0 #bae6fd; }
        .speed-options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
        .speed-option { background: white; border: 2px solid var(--border); padding: 15px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.1s; box-shadow: 0 4px 0 var(--border); font-size: 0.95rem; display: flex; align-items: center; justify-content: center; min-height: 80px; }
        .speed-option:active { transform: translateY(4px); box-shadow: none; }
        .speed-option.correct { background: #dcfce7; border-color: var(--primary); color: var(--primary-dark); }
        .speed-option.wrong { background: #fee2e2; border-color: var(--accent); color: #991b1b; }

        .instruction-box { background: #f0f9ff; border: 1px solid #bae6fd; padding: 10px; border-radius: 8px; font-size: 0.9rem; color: #0369a1; margin-bottom: 15px; width: 100%; text-align: left; }

        .mic-btn { width: 100px; height: 100px; border-radius: 50%; background: var(--secondary); color: white; font-size: 2.5rem; border: none; cursor: pointer; box-shadow: 0 6px 0 #0284c7; display: flex; align-items: center; justify-content: center; margin: 30px auto; }
        .mic-btn.listening { animation: pulse 1.5s infinite; background: var(--accent); box-shadow: 0 6px 0 #b91c1c; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

    </style>
</head>
<body>

    <!-- Tab Content -->
    <div id="tab-audio" class="view active">
        <div class="hero-audio">
            <div class="hero-icon"><i class="fas fa-podcast"></i></div>
            <div class="audio-title" id="audio-title">Audio Overview</div>
            <div class="audio-desc">Listen to the conversation</div>
            
            <div id="voice-controls-container" class="voice-controls" style="text-align: left; display: none; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid var(--border);">
                <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 0.95rem; color: #334155;">Voice Personalization</h4>
                <div id="voice-controls-list" style="display:flex; flex-direction:column; gap:10px;"></div>
            </div>

            <button class="play-btn-lg" id="play-audio-btn"><i class="fas fa-play"></i></button>
        </div>
        <div class="transcript-box" id="transcript-box"></div>
    </div>

    <div id="tab-slides" class="view">
        <div class="slides-carousel-wrapper">
            <button class="slide-nav-btn" id="prev-slide-btn" onclick="navSlides(-1)"><i class="fas fa-chevron-left"></i></button>
            <div id="slides-container"></div>
            <button class="slide-nav-btn" id="next-slide-btn" onclick="navSlides(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
    </div>

    <div id="tab-flashcards" class="view">
        <div class="fc-header">
            <div class="mode-card active" onclick="setMode('study')">
                <i class="fas fa-book-open mode-icon" style="color:var(--primary);"></i>
                <div class="mode-label">Study</div>
            </div>
            <div class="mode-card" onclick="setMode('voice')">
                <i class="fas fa-microphone mode-icon" style="color:var(--secondary);"></i>
                <div class="mode-label">Voice Match</div>
            </div>
            <div class="mode-card" onclick="setMode('speed')">
                <i class="fas fa-bolt mode-icon" style="color:var(--accent);"></i>
                <div class="mode-label">Speed Match</div>
            </div>
            <div class="mode-card" onclick="setMode('wyr')">
                <i class="fas fa-balance-scale mode-icon" style="color:#f59e0b;"></i>
                <div class="mode-label">Would You Rather?</div>
            </div>
        </div>

        <div class="study-grid">
            
            <!-- Left Profile Sidebar -->
            <div class="sidebar-col">
                <div class="profile-card">
                    <img id="avatar-img" class="avatar-img" src="" alt="Avatar">
                    <div class="learner-name">${learner.name}</div>
                    <div class="xp-badge"><i class="fas fa-gem"></i> <span id="xp-display">0</span> XP</div>
                </div>
            </div>

            <!-- Center Flashcard App -->
            <div class="study-container">
                
                <!-- Standard Study View -->
                <div id="view-study" class="game-view" style="display:flex; flex-direction:column; height:100%;">
                    <div class="instruction-box"><i class="fas fa-info-circle"></i> <strong>How to use:</strong> Tap the card to flip. Rate yourself to track mastery.</div>
                    <div class="card-wrapper" onclick="flipCard()">
                        <div class="flashcard" id="flashcard-el">
                            <div class="face front">
                                <i class="fas fa-volume-up audio-icon" onclick="playTTS(event)"></i>
                                <div class="fc-front-icon" id="fc-front-icon"><i class="fas fa-brain"></i></div>
                                <div class="fc-labels" id="fc-labels"></div>
                                <div class="fc-term" id="fc-term"></div>
                                <div class="fc-hint">Tap to flip</div>
                            </div>
                            <div class="face back">
                                <i class="fas fa-volume-up audio-icon" onclick="playTTS(event, true)"></i>
                                <div class="fc-def" id="fc-def"></div>
                                <div class="fc-meta" id="fc-ex-1"></div>
                                <div class="fc-meta" id="fc-ex-2"></div>
                                <div class="fc-meta" id="fc-ccq-box"></div>
                            </div>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="action-btn btn-wrong" onclick="markResult(false)">
                            <i class="fas fa-times"></i> Still Learning
                        </button>
                        <button class="action-btn btn-correct" onclick="markResult(true)">
                            <i class="fas fa-check"></i> Got it!
                        </button>
                    </div>
                    
                    <div class="celebration-popup" id="celebration-popup">
                        <h3>🎉 Amazing!</h3>
                        <p>Card Mastered +10 XP</p>
                    </div>
                </div>

                <!-- Voice Match View -->
                <div id="view-voice" class="game-overlay">
                    <h2 style="margin-top:0;">Voice Match</h2>
                    <div class="instruction-box" style="text-align:center;"><i class="fas fa-info-circle"></i> Read the definition and say the word aloud.</div>
                    <p>Say the word for:</p>
                    <div class="fc-def" id="voice-def" style="margin-bottom:20px;"></div>
                    <button id="mic-btn" class="mic-btn" onclick="toggleMic()"><i class="fas fa-microphone"></i></button>
                    <div id="voice-feedback" style="font-weight:bold; min-height:24px;">Tap mic to speak</div>
                </div>

                <!-- Speed Match View -->
                <div id="view-speed" class="game-overlay">
                    <div class="speed-header">
                        <span><i class="fas fa-clock"></i> Rapid Fire</span>
                        <span class="speed-score">Score: <span id="speed-score-val">0</span></span>
                    </div>
                    <div class="timer-bar"><div class="timer-fill" id="speed-timer-bar"></div></div>
                    <div class="instruction-box" style="text-align:center;"><i class="fas fa-bolt"></i> Pick the correct definition before time runs out!</div>
                    
                    <div class="speed-question-card" id="speed-question">Term</div>
                    <div class="speed-options-grid" id="speed-options">
                        <!-- Injected Options -->
                    </div>
                    <button id="speed-start-btn" class="action-btn btn-correct" style="margin-top:20px;" onclick="startSpeedGame()">Start Game</button>
                </div>

                <!-- Would You Rather View -->
                <div id="view-wyr" class="game-overlay">
                    <h2 style="color:#f59e0b; margin-top:0;">Would You Rather?</h2>
                    <div class="instruction-box" style="text-align:center;"><i class="fas fa-balance-scale"></i> Choose an option to reveal the consequence!</div>
                    <p style="font-style:italic; margin-bottom:20px; color:#666; font-size:1.2rem;" id="wyr-term-display"></p>
                    <div id="wyr-options-area" style="width:100%">
                        <button class="wyr-option" id="wyr-a" onclick="chooseWYR('A')"></button>
                        <div style="font-weight:bold; color:#ccc;">OR</div>
                        <button class="wyr-option" id="wyr-b" onclick="chooseWYR('B')"></button>
                    </div>
                    <div id="wyr-consequence" class="consequence-box"></div>
                    <button id="wyr-next-btn" class="action-btn btn-correct" style="display:none; margin-top:20px; width:200px; margin-left:auto; margin-right:auto;" onclick="nextWYR()">Next Situation</button>
                </div>

            </div>

            <!-- Right Stats Sidebar -->
            <div class="sidebar-col">
                <div class="stat-card">
                    <div class="stat-row">
                        <span class="stat-label">Mastered</span>
                        <span class="stat-val" id="stat-mastered">0/0</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Accuracy</span>
                        <span class="stat-val" id="stat-accuracy">0%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Time Spent</span>
                        <span class="stat-val" id="stat-time">00:00</span>
                    </div>
                    <div class="mastery-container">
                        <div class="mastery-label"><span>Overall Progress</span><span id="mastery-text">0%</span></div>
                        <div class="mastery-track"><div class="mastery-fill" id="mastery-bar"></div></div>
                    </div>
                </div>
                <div class="quote-box" id="quote-box">
                    "You are improving every minute!"
                </div>
            </div>
            
            <!-- Mobile Stats (Below) -->
            <div class="sidebar-col-mobile" style="margin-top:20px;">
                 <div class="stat-card">
                    <div class="stat-row"><span class="stat-label">Mastered</span><span class="stat-val" id="stat-mastered-m">0</span></div>
                    <div class="stat-row"><span class="stat-label">XP Gained</span><span class="stat-val" id="stat-xp-m">0</span></div>
                 </div>
            </div>

        </div>
    </div>

    <!-- Navigation -->
    <div class="nav-bar">
        <button class="nav-btn active" onclick="switchTab('audio', this)"><i class="fas fa-headphones"></i> Audio</button>
        <button class="nav-btn" onclick="switchTab('slides', this)"><i class="fas fa-layer-group"></i> Slides</button>
        <button class="nav-btn" onclick="switchTab('flashcards', this)"><i class="fas fa-clone"></i> Flashcards</button>
    </div>

    <script>
        ${VOICE_GROUP_RUNTIME_JS}
        // INIT DATA
        const rawPayload = "${encodedPayload}";
        const data = JSON.parse(decodeURIComponent(escape(atob(rawPayload))));
        const content = data.content;
        const learnerName = data.learnerName;
        const learnerVoice = data.learnerVoice;
        const avatarBase64 = data.avatarBase64;

        // --- SETUP SIDEBARS ---
        document.getElementById('avatar-img').src = avatarBase64 || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(learnerName));
        
        let xp = 0;
        let startTime = Date.now();
        let timerInterval = null;
        let totalAttempts = 0;
        let correctAttempts = 0;
        
        const quotes = [
            "You are better than 80% of learners today!",
            "Consistent practice is the key to mastery.",
            "You're building a habit of success!",
            "Every card flipped is a step forward.",
            "Learning looks good on you!",
            "Keep going, you're doing great!"
        ];

        // --- AUDIO PLAYER LOGIC ---
        const playOverviewBtn = document.getElementById('play-audio-btn');
        let overviewAudio = null;
        
        // Custom TTS player variables
        let ttsData = [];
        let ttsActiveIdx = 0;
        let isTtsPlaying = false;
        let speakerVoices = {};

        // Prepare available voices
        let availableVoices = [];
        function initVoices() {
             availableVoices = window.speechSynthesis.getVoices();
             if (availableVoices.length > 0) {
                  renderVoiceSelects();
             }
        }
        if (speechSynthesis.onvoiceschanged !== undefined) {
             speechSynthesis.onvoiceschanged = initVoices;
        }
        initVoices();

        function renderVoiceSelects() {
            if (!document.getElementById('voice-controls-list') || Object.keys(speakerVoices).length === 0) return;
            document.getElementById('voice-controls-container').style.display = 'block';
            let html = '';
            Object.keys(speakerVoices).forEach(speaker => {
                html += \`
                <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
                    <label style="font-weight:bold; color:var(--secondary); font-size:0.9rem; flex-shrink:0;">\${speaker}:</label>
                    <div style="flex-grow:1; display:flex;">
                         <input type="text" class="voice-search" data-speaker="\${speaker}" placeholder="Search voice..." style="width: 40%; padding:8px; border-radius:6px 0 0 6px; border:1px solid #ccc; font-size:0.8rem;">
                         <select onchange="window.updateSpeakerVoice('\${speaker}', this.value)" class="voice-dropdown" data-speaker="\${speaker}" style="flex-grow:1; padding:8px; border-radius:0 6px 6px 0; border:1px solid #ccc; font-size:0.8rem; max-width: 60%;">
                         </select>
                    </div>
                </div>\`;
            });
            document.getElementById('voice-controls-list').innerHTML = html;
            
            // Add listeners for search filters
            document.querySelectorAll('.voice-search').forEach(input => {
                 input.addEventListener('input', (e) => {
                      const speaker = e.target.dataset.speaker;
                      const term = e.target.value.toLowerCase();
                      const select = document.querySelector(\`.voice-dropdown[data-speaker="\${speaker}"]\`);
                      if (select) {
                           const opts = availableVoices.filter(v => v.name.toLowerCase().includes(term) || v.lang.toLowerCase().includes(term));
                           if (window.__populateGroupedVoiceSelect) {
                                window.__populateGroupedVoiceSelect(select, opts, speakerVoices[speaker], false);
                           } else {
                                select.innerHTML = opts.map(v => \`<option value="\${v.voiceURI}" \${speakerVoices[speaker] === v.voiceURI ? 'selected' : ''}>\${v.name} (\${v.lang})</option>\`).join('');
                           }
                      }
                 });
            });
            // Populate every dropdown with accent+gender grouped natural voices (British first, red)
            document.querySelectorAll('.voice-dropdown').forEach(select => {
                 const speaker = select.dataset.speaker;
                 if (window.__populateGroupedVoiceSelect) {
                      window.__populateGroupedVoiceSelect(select, availableVoices, speakerVoices[speaker], false);
                 } else {
                      select.innerHTML = availableVoices.map(v => \`<option value="\${v.voiceURI}" \${speakerVoices[speaker] === v.voiceURI ? 'selected' : ''}>\${v.name} (\${v.lang})</option>\`).join('');
                 }
            });
        }

        window.updateSpeakerVoice = (speaker, voiceURI) => {
            speakerVoices[speaker] = voiceURI;
        };

        // Parse transcript
        let scriptHtml = content.audioOverview.script || "";
        let formattedTranscript = '';
        
        if (Array.isArray(scriptHtml)) {
             scriptHtml.forEach(function(line) {
                  let speaker = line.speaker || 'Narrator';
                  let txt = line.text || '';
                  let voice = line.voice || '';
                  ttsData.push({ speaker: speaker, text: txt, voice: voice });
                  if (!speakerVoices[speaker] && voice) {
                       speakerVoices[speaker] = voice; // Set default voice from JSON
                  } else if (!speakerVoices[speaker]) {
                       speakerVoices[speaker] = '';
                  }
                  formattedTranscript += \`<p><span class="speaker-label">\${speaker}:</span> \${txt}</p>\`;
             });
        } else {
            let rawStr = scriptHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
            const simpleRegex = /([A-Z][a-zA-Z0-9\\s()]+?):\\s*(.+?)(?=(?:[A-Z][a-zA-Z0-9\\s()]+?:)|$)/gs;
            let sMatch;
            
            while ((sMatch = simpleRegex.exec(rawStr)) !== null) {
                let speaker = sMatch[1].trim();
                if (speaker.length < 30) {
                    let txt = sMatch[2].trim();
                    ttsData.push({ speaker: speaker, text: txt });
                    if (!speakerVoices[speaker]) {
                         speakerVoices[speaker] = ''; // default empty
                    }
                    formattedTranscript += \`<p><span class="speaker-label">\${speaker}:</span> \${txt}</p>\`;
                }
            }
        }
        
        if (ttsData.length > 0) {
             document.getElementById('transcript-box').innerHTML = formattedTranscript;
        } else {
             // Fallback single speaker
             let rawStr = typeof scriptHtml === 'string' ? scriptHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ') : '';
             ttsData.push({ speaker: 'Narrator', text: rawStr.trim() });
             speakerVoices['Narrator'] = learnerVoice || '';
             document.getElementById('transcript-box').innerHTML = typeof scriptHtml === 'string' ? scriptHtml : formattedTranscript;
        }

        function playNextTTSChunk() {
             if (!isTtsPlaying || ttsActiveIdx >= ttsData.length) {
                  isTtsPlaying = false;
                  playOverviewBtn.innerHTML = '<i class="fas fa-play"></i>';
                  return;
             }
             
             let chunk = ttsData[ttsActiveIdx];
             let u = new SpeechSynthesisUtterance(chunk.text);
             let chosenVoiceURI = chunk.voice || speakerVoices[chunk.speaker] || learnerVoice;
             let allVoices = window.speechSynthesis.getVoices();
             if (allVoices.length > 0) {
                 availableVoices = allVoices; // ensure up to date
             }
             if (chosenVoiceURI && availableVoices.length > 0) {
                 let v = availableVoices.find(fv => fv.voiceURI === chosenVoiceURI || fv.name === chosenVoiceURI);
                 if (!v) {
                     // try fuzzy match
                     v = availableVoices.find(fv => chosenVoiceURI.includes(fv.name) || fv.name.includes(chosenVoiceURI));
                 }
                 if (v) u.voice = v;
             }
             
             // Optionally highlight paragraph
             const paragraphs = document.querySelectorAll('#transcript-box p');
             paragraphs.forEach(p => p.style.backgroundColor = 'transparent');
             if (paragraphs[ttsActiveIdx]) {
                  paragraphs[ttsActiveIdx].style.backgroundColor = '#fef08a'; // yellow highlight
                  paragraphs[ttsActiveIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
             
             u.onend = () => {
                 if (paragraphs[ttsActiveIdx]) paragraphs[ttsActiveIdx].style.backgroundColor = 'transparent';
                 ttsActiveIdx++;
                 playNextTTSChunk();
             };
             u.onerror = (e) => {
                 console.error('TTS error', e);
                 isTtsPlaying = false;
                 playOverviewBtn.innerHTML = '<i class="fas fa-play"></i>';
             }
             
             window.speechSynthesis.speak(u);
        }

        playOverviewBtn.onclick = () => {
            // Check for High Quality Generated Audio
            if (content.audioOverview.audioBase64) {
                if (!overviewAudio) {
                    overviewAudio = new Audio("data:audio/wav;base64," + content.audioOverview.audioBase64);
                    overviewAudio.onended = () => {
                        playOverviewBtn.innerHTML = '<i class="fas fa-play"></i>';
                    };
                }
                
                if (overviewAudio.paused) {
                    overviewAudio.play();
                    playOverviewBtn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    overviewAudio.pause();
                    playOverviewBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
                return;
            }

            // Fallback to custom sequential TTS
            if (isTtsPlaying) {
                window.speechSynthesis.pause();
                window.speechSynthesis.cancel();
                isTtsPlaying = false;
                playOverviewBtn.innerHTML = '<i class="fas fa-play"></i>';
                const paragraphs = document.querySelectorAll('#transcript-box p');
                paragraphs.forEach(p => p.style.backgroundColor = 'transparent');
            } else {
                window.speechSynthesis.cancel(); // clear queue
                isTtsPlaying = true;
                if (ttsActiveIdx >= ttsData.length) {
                     ttsActiveIdx = 0; // restart
                }
                playOverviewBtn.innerHTML = '<i class="fas fa-pause"></i>';
                playNextTTSChunk(); 
            }
        };
        
        document.getElementById('audio-title').innerText = content.audioOverview.title;


        // --- SLIDES CAROUSEL LOGIC ---
        const slidesContainer = document.getElementById('slides-container');
        content.summarySlides.forEach((slide, idx) => {
            const el = document.createElement('div');
            el.className = 'slide-card' + (idx === 0 ? ' active' : '');
            el.id = 'slide-' + idx;
            el.innerHTML = \`
                <div class="slide-header">
                    <div class="slide-title-wrap">
                        <i class="fas fa-lightbulb slide-icon"></i>
                        <h3 class="slide-title">\${slide.title}</h3>
                    </div>
                    <div class="slide-count">\${idx+1}/\${content.summarySlides.length}</div>
                </div>
                <div class="slide-body">
                    <div class="slide-content">\${slide.content}</div>
                    \${slide.usageNotes ? \`<div class="info-box"><span class="info-label"><i class="fas fa-info-circle"></i> Usage Notes</span>\${slide.usageNotes}</div>\` : ''}
                    \${slide.personalizedExamples && slide.personalizedExamples.length ? 
                        \`<div class="example-box">
                            <span class="example-label"><i class="fas fa-user-check"></i> For \${learnerName}</span>
                            \${slide.personalizedExamples.map(ex => \`<span class="example-text">"\${ex}"</span>\`).join('')}
                        </div>\` : ''
                    }
                    \${slide.commonErrors ? \`<div class="error-box"><span class="error-label"><i class="fas fa-exclamation-triangle"></i> Common Error</span>\${slide.commonErrors}</div>\` : ''}
                    <ul style="padding-left:20px; color:#555; margin-bottom:0;">
                        \${slide.bulletPoints.map(bp => \`<li>\${bp}</li>\`).join('')}
                    </ul>
                </div>
            \`;
            slidesContainer.appendChild(el);
        });
        
        let currentSlideIdx = 0;
        function navSlides(dir) {
            const next = currentSlideIdx + dir;
            if(next >= 0 && next < content.summarySlides.length) {
                document.getElementById('slide-' + currentSlideIdx).classList.remove('active');
                currentSlideIdx = next;
                document.getElementById('slide-' + currentSlideIdx).classList.add('active');
                updateSlideNav();
            }
        }
        
        function updateSlideNav() {
            document.getElementById('prev-slide-btn').disabled = currentSlideIdx === 0;
            document.getElementById('next-slide-btn').disabled = currentSlideIdx === content.summarySlides.length - 1;
        }
        updateSlideNav();


        // --- FLASHCARD & GAME LOGIC ---
        let cards = [...content.flashcards];
        let progress = cards.map(() => 0); // 0=New, 1=Learning, 2=Reviewing, 3=Mastered
        let queue = cards.map((_, i) => i);
        let currentCardIdx = 0;
        let isFlipped = false;
        
        function updateSidebars() {
            // Update XP
            document.getElementById('xp-display').innerText = xp;
            document.getElementById('stat-xp-m').innerText = xp;
            
            // Update Stats
            const masteredCount = progress.filter(p => p === 3).length;
            const total = cards.length;
            document.getElementById('stat-mastered').innerText = masteredCount + ' / ' + total;
            document.getElementById('stat-mastered-m').innerText = masteredCount + ' / ' + total;
            
            const acc = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
            document.getElementById('stat-accuracy').innerText = acc + '%';
            
            // Linear Progress Bar (Based on mastered count only)
            const percent = Math.round((masteredCount / total) * 100);
            document.getElementById('mastery-text').innerText = percent + '%';
            document.getElementById('mastery-bar').style.width = percent + '%';
        }
        
        function updateTimer() {
            const now = Date.now();
            const diff = Math.floor((now - startTime) / 1000);
            const m = Math.floor(diff / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            document.getElementById('stat-time').innerText = m + ':' + s;
        }

        function showCelebration() {
            const popup = document.getElementById('celebration-popup');
            popup.classList.add('show');
            
            // Add Pulse to XP
            const badge = document.querySelector('.xp-badge');
            badge.style.transform = 'scale(1.2)';
            setTimeout(() => badge.style.transform = 'scale(1)', 200);
            
            setTimeout(() => { popup.classList.remove('show'); }, 1500);
        }
        
        function getFrontIcon(term) {
            // Simple deterministic mapping based on string
            const icons = ['fa-brain', 'fa-lightbulb', 'fa-comment-dots', 'fa-puzzle-piece', 'fa-star', 'fa-bolt'];
            let hash = 0;
            for(let i=0; i<term.length; i++) hash += term.charCodeAt(i);
            return icons[hash % icons.length];
        }

        function loadCard() {
            if(queue.length === 0) {
                queue = cards.map((_, i) => i).filter(i => progress[i] < 3);
                if(queue.length === 0) {
                    // Reset review mode
                    progress = cards.map(() => 2);
                    queue = cards.map((_, i) => i);
                }
            }
            
            currentCardIdx = queue[0];
            const card = cards[currentCardIdx];
            
            // Front
            document.getElementById('fc-term').innerText = card.term;
            document.getElementById('fc-front-icon').innerHTML = '<i class="fas '+getFrontIcon(card.term)+'"></i>';
            let labelsHtml = '';
            if(card.partOfSpeech) labelsHtml += \`<span class="fc-badge badge-pos">\${card.partOfSpeech}</span>\`;
            if(card.register) labelsHtml += \`<span class="fc-badge badge-reg">\${card.register}</span>\`;
            document.getElementById('fc-labels').innerHTML = labelsHtml;

            // Back
            document.getElementById('fc-def').innerText = card.definition;
            let exs = Array.isArray(card.examples) ? card.examples : (card.example ? [card.example] : []);
            document.getElementById('fc-ex-1').innerHTML = exs[0] ? \`<strong>Example 1</strong> "\${exs[0]}"\` : '';
            document.getElementById('fc-ex-2').innerHTML = exs[1] ? \`<strong>Example 2</strong> "\${exs[1]}"\` : '';
            
            if(card.ccq) {
                document.getElementById('fc-ccq-box').innerHTML = \`<strong>Check:</strong> \${card.ccq.question}<br><em style="color:#666">Ans: \${card.ccq.answer}</em>\`;
                document.getElementById('fc-ccq-box').style.display = 'block';
            } else {
                document.getElementById('fc-ccq-box').style.display = 'none';
            }
            
            isFlipped = false;
            document.getElementById('flashcard-el').classList.remove('flipped');
            
            // Rotate quote randomly
            if(Math.random() > 0.7) {
                document.getElementById('quote-box').innerText = '"' + quotes[Math.floor(Math.random() * quotes.length)] + '"';
            }
            
            updateSidebars();
        }

        function flipCard() {
            isFlipped = !isFlipped;
            document.getElementById('flashcard-el').classList.toggle('flipped', isFlipped);
        }

        function markResult(correct) {
            const idx = currentCardIdx;
            totalAttempts++;
            
            if (correct) {
                progress[idx]++; 
                correctAttempts++;
                xp += 5;
                if (progress[idx] === 3) {
                    showCelebration();
                    xp += 10; // Bonus for mastery
                }
            } else {
                progress[idx] = 1; 
            }
            
            queue.shift(); 
            if (progress[idx] < 3) {
                const insertPos = correct ? queue.length : 3;
                queue.splice(Math.min(queue.length, insertPos), 0, idx);
            }
            loadCard();
        }

        function playTTS(e, extended) {
            e.stopPropagation();
            const card = cards[currentCardIdx];
            let text = card.term;
            if(extended) {
                const exs = Array.isArray(card.examples) ? card.examples : [card.example];
                text = card.definition + ". " + exs.join(". ");
            }
            const u = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            if(learnerVoice) {
                const v = voices.find(v => v.voiceURI === learnerVoice);
                if(v) u.voice = v;
            }
            window.speechSynthesis.speak(u);
        }

        // --- GAME MODES ---
        function setMode(mode) {
            document.querySelectorAll('.mode-card').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.game-overlay').forEach(el => el.classList.remove('active'));
            document.getElementById('view-study').style.display = 'none';
            
            if(mode === 'study') {
                document.getElementById('view-study').style.display = 'flex';
                // Reset timer for study session
                startTime = Date.now();
                if(timerInterval) clearInterval(timerInterval);
                timerInterval = setInterval(updateTimer, 1000);
                updateSidebars();
            } else {
                if(timerInterval) clearInterval(timerInterval); // Pause main timer in mini-games
            }

            if (mode === 'voice') {
                document.getElementById('view-voice').classList.add('active');
                initVoiceMatch();
            } else if (mode === 'speed') {
                document.getElementById('view-speed').classList.add('active');
                // Reset state to pre-game
                document.getElementById('speed-start-btn').style.display = 'block';
                document.getElementById('speed-options').style.display = 'none';
                document.getElementById('speed-question').style.display = 'none';
            } else if (mode === 'wyr') {
                document.getElementById('view-wyr').classList.add('active');
                initWYR();
            }
        }

        // Voice Match Logic
        let recognition = null;
        function initVoiceMatch() {
            const card = cards[Math.floor(Math.random() * cards.length)];
            document.getElementById('voice-def').innerText = card.definition;
            document.getElementById('voice-def').dataset.term = card.term;
            document.getElementById('voice-feedback').innerText = "Tap mic to speak";
            document.getElementById('mic-btn').classList.remove('listening');
        }
        function toggleMic() {
            if (!('webkitSpeechRecognition' in window)) {
                alert("Speech recognition not supported in this browser.");
                return;
            }
            if(recognition) { recognition.stop(); return; }
            
            recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-US';
            recognition.start();
            document.getElementById('mic-btn').classList.add('listening');
            document.getElementById('voice-feedback').innerText = "Listening...";
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript.toLowerCase();
                const target = document.getElementById('voice-def').dataset.term.toLowerCase();
                
                if(transcript.includes(target) || target.includes(transcript)) {
                    document.getElementById('voice-feedback').innerHTML = '<span style="color:var(--primary);">Correct! It was "'+target+'"</span>';
                    xp += 15;
                    updateSidebars();
                    setTimeout(initVoiceMatch, 1500);
                } else {
                    document.getElementById('voice-feedback').innerHTML = '<span style="color:var(--accent);">Heard: "'+transcript+'". Try again!</span>';
                }
                document.getElementById('mic-btn').classList.remove('listening');
                recognition = null;
            };
            recognition.onerror = function() {
                document.getElementById('mic-btn').classList.remove('listening');
                document.getElementById('voice-feedback').innerText = "Error listening. Try again.";
                recognition = null;
            };
        }

        // --- NEW SPEED MATCH LOGIC (Rapid Fire) ---
        let speedScore = 0;
        let speedTimeLeft = 0;
        let speedTimerInterval = null;
        
        function startSpeedGame() {
            speedScore = 0;
            speedTimeLeft = 60; // 60 seconds total? Or per question? Let's do rapid fire total time.
            document.getElementById('speed-score-val').innerText = speedScore;
            document.getElementById('speed-start-btn').style.display = 'none';
            document.getElementById('speed-options').style.display = 'grid';
            document.getElementById('speed-question').style.display = 'block';
            
            // Start Timer Loop
            if(speedTimerInterval) clearInterval(speedTimerInterval);
            speedTimerInterval = setInterval(() => {
                speedTimeLeft -= 0.1;
                const pct = (speedTimeLeft / 60) * 100;
                document.getElementById('speed-timer-bar').style.width = pct + '%';
                
                if(speedTimeLeft <= 0) {
                    clearInterval(speedTimerInterval);
                    alert("Time's up! Final Score: " + speedScore);
                    xp += speedScore; // Add speed score to XP
                    updateSidebars();
                    document.getElementById('speed-start-btn').style.display = 'block';
                    document.getElementById('speed-start-btn').innerText = "Play Again";
                    document.getElementById('speed-options').style.display = 'none';
                    document.getElementById('speed-question').style.display = 'none';
                }
            }, 100);
            
            nextSpeedQuestion();
        }
        
        function nextSpeedQuestion() {
            // Pick a target card
            const target = cards[Math.floor(Math.random() * cards.length)];
            document.getElementById('speed-question').innerText = target.term;
            
            // Pick 3 distractors
            let options = [target];
            while(options.length < 4) {
                const dist = cards[Math.floor(Math.random() * cards.length)];
                if(!options.find(o => o.term === dist.term)) options.push(dist);
            }
            options.sort(() => Math.random() - 0.5);
            
            const container = document.getElementById('speed-options');
            container.innerHTML = '';
            
            options.forEach(opt => {
                const btn = document.createElement('div');
                btn.className = 'speed-option';
                btn.innerText = opt.definition;
                btn.onclick = () => {
                    if(opt.term === target.term) {
                        // Correct
                        btn.classList.add('correct');
                        speedScore += 10;
                        speedTimeLeft = Math.min(60, speedTimeLeft + 2); // Bonus time
                        document.getElementById('speed-score-val').innerText = speedScore;
                        setTimeout(nextSpeedQuestion, 200);
                    } else {
                        // Wrong
                        btn.classList.add('wrong');
                        speedTimeLeft -= 5; // Penalty
                    }
                };
                container.appendChild(btn);
            });
        }

        // WYR Logic
        let currentWYR = null;
        function initWYR() {
            const candidates = cards.filter(c => c.wouldYouRather);
            if(candidates.length === 0) {
                document.getElementById('view-wyr').innerHTML = '<h3>No scenarios found for these cards.</h3>';
                return;
            }
            currentWYR = candidates[Math.floor(Math.random() * candidates.length)];
            
            document.getElementById('wyr-term-display').innerText = "Concept: " + currentWYR.term;
            document.getElementById('wyr-a').innerText = currentWYR.wouldYouRather.optionA;
            document.getElementById('wyr-b').innerText = currentWYR.wouldYouRather.optionB;
            
            document.getElementById('wyr-options-area').style.display = 'block';
            document.getElementById('wyr-consequence').style.display = 'none';
            document.getElementById('wyr-next-btn').style.display = 'none';
        }
        
        function chooseWYR(choice) {
            const resultText = choice === 'A' ? currentWYR.wouldYouRather.consequenceA : currentWYR.wouldYouRather.consequenceB;
            const resBox = document.getElementById('wyr-consequence');
            resBox.innerHTML = resultText;
            resBox.style.display = 'block';
            xp += 5; // Small XP for participating
            updateSidebars();
            document.getElementById('wyr-options-area').style.display = 'none';
            document.getElementById('wyr-next-btn').style.display = 'block';
        }
        
        function nextWYR() {
            initWYR();
        }

        function switchTab(id, btn) {
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('tab-' + id).classList.add('active');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Initialize timer if entering flashcards for the first time
            if(id === 'flashcards' && !timerInterval) {
               setMode('study'); // Auto start study mode which starts timer
            }
        }

        loadCard();
        updateSidebars(); // Init sidebar values
        window.speechSynthesis.onvoiceschanged = () => {};

    </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
