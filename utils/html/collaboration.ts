export const getCollaborationWidget = (mode: 'presenter' | 'learner' = 'presenter') => {
    if (mode === 'learner') {
        return { html: '', css: '', js: '' };
    }
    const html = `
    <!-- Peer.js Library -->
    <script src="https://unpkg.com/peerjs@1.5.1/dist/peerjs.min.js" defer></script>
    
    <!-- EXPERIMENTAL UI -->
    <div id="collab-master-widget" class="master-widget-container">
        <div class="master-widget-menu" id="collab-master-menu">
            <button class="master-menu-btn" onclick="if(window.toggleAccessibilityWidget){ window.toggleAccessibilityWidget(); } else { const p = document.getElementById('accessibility-panel'); if(p) p.style.display = (p.style.display==='none'||!p.style.display)?'flex':'none'; } window.toggleMasterMenu();" title="Accessibility Tools"><i class="fas fa-universal-access"></i></button>
            <button class="master-menu-btn" onclick="if(window.triggerWalkthrough){ window.triggerWalkthrough(); } else if(window.startInteractiveWalkthroughV2){ window.startInteractiveWalkthroughV2(); } else if(window.startInteractiveWalkthroughV1){ window.startInteractiveWalkthroughV1(); } else { alert('Walkthrough tour not available on this page.'); } window.toggleMasterMenu();" title="Interactive Walkthrough"><i class="fas fa-route"></i></button>
            <button class="master-menu-btn" onclick="window.toggleCollabPanel(); window.toggleMasterMenu();" title="Live Collaboration"><i class="fas fa-users"></i></button>
        </div>
        <button class="master-fab" onclick="window.toggleMasterMenu()" title="Master Tools">
            <i class="fas fa-layer-group" id="master-fab-icon"></i>
        </button>
    </div>

    <!-- COLLABORATION PANEL -->
    <div id="collab-panel" class="collab-panel hidden">
        <div class="collab-header">
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="status-indicator-light" id="collab-indicator"></div>
                <i class="fas fa-satellite-dish animate-pulse" style="color: #6366f1;"></i>
                <h3 style="margin:0; font-size:15px; font-weight:700; font-family:var(--font-sans); letter-spacing:-0.2px;">Live Session Space</h3>
            </div>
            
            <div style="display:flex; gap:8px; align-items:center;">
                <!-- Theme Toggle Button -->
                <button class="icon-toggle-btn" onclick="window.toggleCollabTheme()" id="collab-theme-btn" title="Toggle Light/Dark Theme">
                    <i class="fas fa-sun"></i>
                </button>
                <span id="collab-status" class="status-badge disconnected">Offline</span>
                <span id="collab-host-name" style="font-size:10px; color:var(--collab-text-secondary); font-weight:600; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:none;"></span>
                <button class="icon-toggle-btn" onclick="window.togglePanelSize()" id="resize-panel-btn" title="Toggle Sidebar Mode"><i class="fas fa-expand-alt"></i></button>
                <button class="icon-toggle-btn btn-close-main" onclick="toggleCollabPanel()"><i class="fas fa-times"></i></button>
            </div>
        </div>
        
        <div class="collab-setup" id="collab-setup">
            <div class="setup-illustration">
                <i class="fas fa-users-rays"></i>
            </div>
            <h4 class="setup-title">Join Live Collaboration</h4>
            <p class="setup-subtitle">Synchronize boards, viewports, lessons, and chat in real-time with your peers and tutor.</p>
            
            <div class="setup-card">
                <div class="input-glow-group">
                    <label class="setup-lbl"><i class="far fa-user"></i> Your Screen Name</label>
                    <input type="text" id="collab-name" placeholder="Enter name e.g., Sarah" value="Student">
                </div>
                
                <div class="input-glow-group" style="margin-top: 14px;">
                    <label class="setup-lbl"><i class="fas fa-fingerprint"></i> Room Session ID</label>
                    <div style="display:flex; gap:6px; width:100%;">
                        <input type="text" id="collab-room-id" placeholder="Paste Tutor's Room ID" style="flex:1;">
                        <button class="collab-btn secondary" onclick="var r=document.getElementById('collab-room-id'); if(r.value){navigator.clipboard.writeText(r.value);sysMsg('Room ID copied!');}" style="width:auto; padding:10px 12px; margin:0; font-size:12px;" title="Copy Room ID"><i class="fas fa-copy"></i></button>
                    </div>
                </div>
                
                <button class="collab-btn primary" onclick="joinRoom()"><i class="fas fa-sign-in-alt"></i> Join Interactive Room</button>
                
                <div class="hr-text"><span>OR BECOME THE HOST</span></div>
                
                <button class="collab-btn secondary" onclick="hostRoom()"><i class="fas fa-broadcast-tower"></i> Start as Broadcast Tutor</button>
            </div>
            <p id="collab-error" class="error-text"></p>
        </div>
        
        <div class="collab-active hidden" id="collab-active">
            <div class="collab-tabs">
                <button class="tab-btn active" onclick="switchCollabTab('chat')"><i class="fas fa-comment"></i> Chat</button>
                <button class="tab-btn" onclick="switchCollabTab('tools')"><i class="fas fa-paint-brush"></i> Board</button>
                <button class="tab-btn" onclick="switchCollabTab('media')"><i class="fas fa-film"></i> Media</button>
                <button class="tab-btn" onclick="switchCollabTab('rewards')"><i class="fas fa-trophy"></i> Play</button>
                <button class="tab-btn" onclick="switchCollabTab('users')"><i class="fas fa-users"></i> (<span id="user-count">1</span>)</button>
            </div>
            
            <div class="tab-content active" id="tab-chat">
                <div class="chat-log" id="chat-log"></div>
                
                <!-- Reply Context Visualizer -->
                <div id="chat-reply-preview" class="reply-preview-bar hidden">
                    <div class="reply-preview-content">
                        <span class="reply-preview-sender" id="reply-preview-sender">Sender</span>
                        <p class="reply-preview-text" id="reply-preview-text">text</p>
                    </div>
                    <button class="close-reply-btn" onclick="window.cancelReply()">&times;</button>
                </div>
 
                <!-- Voice Recording Context -->
                <div id="chat-record-preview" class="record-preview-bar hidden">
                    <span class="record-dot"></span>
                    <span id="record-timer">00:00</span>
                    <div class="record-controls-row">
                        <button class="record-act-btn cancel" onclick="window.cancelVoiceRecord()">Cancel</button>
                        <button class="record-act-btn send" onclick="window.stopAndSendVoiceRecord()">Send</button>
                    </div>
                </div>
 
                <div class="chat-actions">
                    <button class="icon-btn" onclick="document.getElementById('file-upload').click()" title="Attach File / Photo"><i class="fas fa-paperclip"></i></button>
                    <input type="file" id="file-upload" class="hidden" onchange="sendFile(this)" style="display:none;">
                    
                    <button class="icon-btn" onclick="window.startVoiceRecord()" id="voice-record-btn" title="Record Voice"><i class="fas fa-microphone"></i></button>
                    <button class="icon-btn trigger-emoji-premium" id="emoji-trigger-btn" onclick="window.toggleEmojiPicker(true)" title="Insert Emojis">😀 Picker</button>
                    <span class="os-emoji-tip">Win + . triggers system picker</span>
                </div>
                
                <div class="chat-input-bar">
                    <textarea id="chat-input" placeholder="Type a message... Shift+Enter for new line" onkeydown="window.handleChatInputKeyDown(event)" rows="1"></textarea>
                    <button onclick="sendChat()" title="Send Message" class="btn-chat-send-icon"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
            
            <div class="tab-content" id="tab-tools">
                <div class="tools-grid">
                    <button class="tool-btn active" onclick="setDrawTool('pointer')"><i class="fas fa-mouse-pointer"></i> Pointer</button>
                    <button class="tool-btn" onclick="setDrawTool('marker')"><i class="fas fa-pen"></i> Pen</button>
                    <button class="tool-btn" onclick="setDrawTool('laser')"><i class="fas fa-magic text-indigo-500 animate-pulse"></i> Laser</button>
                    <button class="tool-btn" id="ink-btn" onclick="setDrawTool('disappearing')"><i class="fas fa-wind-warning text-cyan-500"></i> Auto-Fade</button>
                    <button class="tool-btn" onclick="setDrawTool('eraser')"><i class="fas fa-eraser"></i> Eraser</button>
                    <button class="tool-btn danger" onclick="clearSharedBoard()"><i class="fas fa-trash-alt"></i> Clean Board</button>
                </div>
                <div class="color-picker-deck">
                    <span class="deck-title"><i class="fas fa-palette"></i> Palette</span>
                    <div class="color-picker-control">
                        <div class="color-swatch-wrapper">
                            <input type="color" id="draw-color" value="#ff0000" onchange="window.collabState.color = this.value">
                        </div>
                        <input type="range" id="draw-size" class="premium-slider" min="1" max="25" value="3" onchange="window.collabState.size = this.value">
                        <span class="slider-badge" id="size-badge">3px</span>
                    </div>
                </div>
 
                <div class="sync-controls-panel">
                    <h4 class="control-header"><i class="fas fa-sliders-h"></i> Sync & Screen Coordinates</h4>
                    
                    <div class="control-row">
                        <span class="control-label-desc">
                            <strong>Sync Scroll Mode</strong>
                            <span>Dictates viewport positioning scroll locks</span>
                        </span>
                        <select id="sync-scroll-mode-select" class="premium-select" onchange="window.updateScrollMode(this.value)">
                            <option value="tutor">Tutor Control Only</option>
                            <option value="everyone">Free Collaboration</option>
                            <option value="none">Sync Off</option>
                        </select>
                    </div>
 
                    <div class="control-row">
                        <span class="control-label-desc">
                            <strong>Interactive Click Syncing</strong>
                            <span>Synchronizes click actions & summaries</span>
                        </span>
                        <select id="sync-click-mode-select" class="premium-select" onchange="window.updateInteractMode(this.value)">
                            <option value="tutor">Tutor Syncs to Learners</option>
                            <option value="everyone">Group Co-Editing</option>
                            <option value="none">Disabled</option>
                        </select>
                    </div>
 
                    <div class="control-actions">
                        <button class="collab-btn secondary" onclick="forceSyncEveryone()" style="margin:0;"><i class="fas fa-compass"></i> Align Viewports</button>
                        <button class="collab-btn secondary" onclick="toggleSyncScroll()" style="margin:0;"><i class="fas fa-sync"></i> Toggle Scroll Lock</button>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="tab-media">
                <div class="media-header-note">
                    <i class="fas fa-info-circle text-indigo-500"></i> Open and synchronize local media files or stream links. If you are the Broadcast host, your play/pause/seeks will align with learners in real-time.
                </div>
                
                <div class="media-loader-input-group mt-3" style="text-align: center;">
                    <!-- PC File Picker -->
                    <button class="collab-btn primary" onclick="document.getElementById('media-pc-upload').click()" style="margin-bottom:8px;">
                        <i class="fas fa-file-video"></i> Open Media File from PC
                    </button>
                    <input type="file" id="media-pc-upload" accept="video/*,audio/*" class="hidden" onchange="window.loadPcMediaFile(this)" style="display:none;">
                    
                    <div class="hr-text" style="margin: 8px 0;"><span>OR PLAY WEB URL</span></div>
                    
                    <!-- URL Player -->
                    <div style="display:flex; gap:6px; width:100%;">
                        <input type="text" id="media-url-input" placeholder="Stream Link (.mp4, .webm, .mp3, etc.)" style="flex:1; padding:6px 10px; font-size:12px; border-radius:6px; border:1px solid var(--collab-border-color); background:var(--collab-bg-control-row); color:var(--collab-text-primary); outline:none;">
                        <button class="collab-btn primary" onclick="window.loadCustomMediaUrl()" style="width:auto; padding:6px 12px; font-size:11px; margin:0;"><i class="fas fa-play"></i> Play</button>
                    </div>
                </div>
                
                <div id="media-container" class="media-container mt-2">
                    <p class="empty-media" id="media-empty">No active presentation. Load a file from your PC or enter a URL above to start synchronized playback.</p>
                </div>
                
                <!-- Lesson sync status -->
                <div id="lesson-media-scanner" class="mt-4"></div>
            </div>
            
            <!-- GAMIFIED REWARDS AND POLLS HUBS -->
            <div class="tab-content" id="tab-rewards">
                <!-- POLL SECTION -->
                <div class="rewards-poll-box mb-4">
                    <h4 class="control-header" style="color: #d97706; margin-bottom: 8px;"><i class="fas fa-poll-h"></i> Live Collaborative Quiz check</h4>
                    <div id="active-poll-container">
                        <p style="font-size:11px; color:var(--collab-text-secondary); font-style:italic; text-align:center;">No live poll active now.</p>
                    </div>
                    
                    <!-- Tutor Poll Creator (Only shows if role is host) -->
                    <div id="tutor-poll-creator" class="hidden mt-3" style="background: rgba(0,0,0,0.02); padding:10px; border-radius:10px; border:1px solid var(--collab-border-color); text-align: left;">
                        <span style="font-weight:700; font-size:11px; display:block; margin-bottom:6px; color:var(--collab-text-primary);"><i class="fas fa-plus"></i> Create New Quick Poll</span>
                        <input type="text" id="poll-question" placeholder="E.g., What is the past form of 'run'?" style="width:100%; font-size:11.5px; padding:6px; border-radius:6px; border:1px solid var(--collab-border-color); margin-bottom:6px; background:var(--collab-bg-control-row); color:var(--collab-text-primary); outline:none;">
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:8px;">
                            <input type="text" id="poll-opt1" placeholder="Option A" value="Runned" style="font-size:11.5px; padding:6px; border-radius:6px; border:1px solid var(--collab-border-color); background:var(--collab-bg-control-row); color:var(--collab-text-primary); outline:none;">
                            <input type="text" id="poll-opt2" placeholder="Option B" value="Ran" style="font-size:11.5px; padding:6px; border-radius:6px; border:1px solid var(--collab-border-color); background:var(--collab-bg-control-row); color:var(--collab-text-primary); outline:none;">
                        </div>
                        <button class="collab-btn primary" onclick="window.startTutorPoll()" style="font-size:11px; padding:6px; margin:0;"><i class="fas fa-rocket"></i> Launch Poll to Learners</button>
                    </div>
                </div>
                
                <!-- MY BADGES -->
                <div class="rewards-badges-deck">
                    <h4 class="control-header" style="margin-bottom: 8px;"><i class="fas fa-award text-amber-500"></i> Gamified Achievements</h4>
                    <div class="rewards-points-banner" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; padding: 12px; border-radius: 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);">
                        <div style="font-size: 11px; text-transform: uppercase; font-weight:bold; letter-spacing:0.5px; opacity:0.85;">Total Collaboration Points</div>
                        <div id="rewards-points-count" style="font-size: 28px; font-weight:800; letter-spacing:-1px;">0 XP</div>
                    </div>
                    
                    <div id="badges-grid-container" class="badges-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                        <!-- Populate dynamically -->
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="tab-users">
                <button class="collab-btn secondary alert pulse-slow" onclick="raiseHand()" style="margin-bottom:14px;"><i class="fas fa-hand-paper text-amber-500"></i> Raise Virtual Hand</button>
                
                <!-- Tutor Moderation Tools -->
                <div id="tutor-moderation-box" class="moderation-panel hidden">
                    <div class="mod-pane-header">
                        <i class="fas fa-shield-halved text-amber-500 animate-pulse"></i>
                        <h4 style="margin:0; font-size:12.5px; font-weight:700;">Host Moderation Cab</h4>
                    </div>
                    <div class="mod-pane-body">
                        <label class="custom-chk-label">
                            <input type="checkbox" id="mod-mute-chat" onchange="window.toggleMuteChat(this.checked)">
                            <span>Squelch Chat for Learners</span>
                        </label>
                        <label class="custom-chk-label">
                            <input type="checkbox" id="mod-mute-drawing" onchange="window.toggleMuteDrawing(this.checked)">
                            <span>Deactivate Board Scribbling</span>
                        </label>
                        <button class="collab-btn danger-pity" onclick="window.clearSharedBoard()"><i class="fas fa-ban"></i> Wipe All Sketches</button>
                    </div>
                </div>
 
                <div id="users-list" class="users-list mt-2"></div>
            </div>
            
            <!-- Custom Premium Emoji Picker Popover OUTSIDE the scroll tabs to absolute-pin cleanly -->
            <div id="collab-emoji-picker" class="emoji-picker-container hidden">
                <div class="emoji-picker-premium-wrapper">
                    <div class="emoji-picker-header">
                        <i class="fas fa-search emoji-search-icon"></i>
                        <input type="text" id="emoji-search" placeholder="Search emojis..." oninput="window.filterEmojis()">
                        <button class="emoji-picker-close-btn" onclick="window.toggleEmojiPicker(false)">&times;</button>
                    </div>
                    <div class="emoji-picker-tabs">
                        <span class="picker-tab active" onclick="window.switchEmojiCategory('smileys')" title="Smileys">😀</span>
                        <span class="picker-tab" onclick="window.switchEmojiCategory('gestures')" title="Gestures">👍</span>
                        <span class="picker-tab" onclick="window.switchEmojiCategory('hearts')" title="Hearts">❤️</span>
                        <span class="picker-tab" onclick="window.switchEmojiCategory('nature')" title="Nature">🌲</span>
                        <span class="picker-tab" onclick="window.switchEmojiCategory('food')" title="Food">🍏</span>
                        <span class="picker-tab" onclick="window.switchEmojiCategory('symbols')" title="Symbols">⚠️</span>
                    </div>
                    <div id="emoji-grid" class="emoji-grid"></div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- OVERLAYS -->
    <canvas id="collab-board" class="collab-board"></canvas>
    <div id="collab-cursors" class="collab-cursors"></div>
    
    <!-- Telegram-inspired Context Menu -->
    <div id="chat-context-menu" class="chat-ctx-menu hidden">
        <button class="ctx-menu-item" onclick="window.ctxReply()"><i class="fas fa-reply"></i> Reply</button>
        <button class="ctx-menu-item" onclick="window.ctxCopy()"><i class="fas fa-copy"></i> Copy Text</button>
        <button class="ctx-menu-item" onclick="window.ctxDeleteMe()"><i class="fas fa-trash-alt" style="color:#ef4444;"></i> Delete for Me</button>
        <button class="ctx-menu-item danger" id="btn-delete-both" onclick="window.ctxDeleteBoth()"><i class="fas fa-ban" style="color:#ef4444;"></i> Delete for Everyone</button>
    </div>
    
    <!-- Gamified Achievements Toast -->
    <div id="badge-celebration-toast" class="achievement-toast hidden">
        <div class="achievement-toast-icon">🏆</div>
        <div class="achievement-toast-body">
            <div id="achievement-badge-title" class="achievement-title">Badge Unlocked!</div>
            <div id="achievement-badge-desc" class="achievement-desc">Description</div>
        </div>
    </div>
    `;

    const css = `
    /* CONFIGURABLE THEME COLORS - Light/Pristine is Default */
    .collab-panel {
        --collab-bg-main: #ffffff;
        --collab-bg-header: #f8fafc;
        --collab-border-color: #cbd5e1;
        --collab-text-primary: #1e293b;
        --collab-text-secondary: #64748b;
        --collab-bg-tab-active: #ffffff;
        --collab-bg-tab-inactive: #f1f5f9;
        --collab-bg-setup: radial-gradient(circle at top, #f8fafc, #edf2f7);
        --collab-bg-chat-log: #f8fafc;
        --collab-bg-msg-theirs: #e2e8f0;
        --collab-text-msg-theirs: #0f172a;
        --collab-bg-msg-mine: linear-gradient(135deg, #4f46e5, #4338ca);
        --collab-text-msg-mine: #ffffff;
        --collab-bg-control-row: #ffffff;
        --collab-emoji-bg: #ffffff;
        --collab-emoji-border: #cbd5e1;
        --collab-bg-user-item: #f1f5f9;
        --collab-text-user-name: #0f172a;
        --collab-btn-secondary: #f8fafc;
        --collab-btn-secondary-border: #cbd5e1;
        --collab-btn-secondary-text: #475569;
        --collab-shadow: 0 10px 30px rgba(0,0,0,0.12);
    }
    
    /* Dark Theme override */
    .collab-panel.theme-dark {
        --collab-bg-main: #0f172a;
        --collab-bg-header: #1e293b;
        --collab-border-color: rgba(255, 255, 255, 0.08);
        --collab-text-primary: #f8fafc;
        --collab-text-secondary: #94a3b8;
        --collab-bg-tab-active: rgba(255, 255, 255, 0.08);
        --collab-bg-tab-inactive: #0f172a;
        --collab-bg-setup: radial-gradient(circle at top, #1e1b4b, #0f172a);
        --collab-bg-chat-log: #0b0f19;
        --collab-bg-msg-theirs: #1e293b;
        --collab-text-msg-theirs: #f8fafc;
        --collab-bg-msg-mine: linear-gradient(135deg, #6366f1, #4f46e5);
        --collab-text-msg-mine: #ffffff;
        --collab-bg-control-row: rgba(15, 23, 42, 0.4);
        --collab-emoji-bg: #1e293b;
        --collab-emoji-border: rgba(255, 255, 255, 0.12);
        --collab-bg-user-item: #1e293b;
        --collab-text-user-name: #f8fafc;
        --collab-btn-secondary: rgba(255, 255, 255, 0.05);
        --collab-btn-secondary-border: rgba(255, 255, 255, 0.08);
        --collab-btn-secondary-text: #e2e8f0;
        --collab-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
    }

    /* CORE HIDDEN MASK OVERWRITE - Bulletproof fix for emoji picker toggle state */
    .hidden { display: none !important; }
    .collab-panel.hidden { transform: translateX(-40px); opacity: 0; pointer-events: none; display: none !important; }
    .emoji-picker-container.hidden { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
    .reply-preview-bar.hidden { display: none !important; }
    .record-preview-bar.hidden { display: none !important; }
    .moderation-panel.hidden { display: none !important; }

    /* MASTER FLOATING CORE ACTION BUTTONS */
    .master-widget-container { position: fixed !important; bottom: 24px !important; right: 24px !important; left: auto !important; z-index: 2147483647 !important; display: flex !important; flex-direction: column !important; align-items: flex-end !important; gap: 12px !important; opacity: 1 !important; visibility: visible !important; pointer-events: none !important; }
    .master-widget-menu { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; transform: scale(0); transform-origin: bottom right; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); opacity: 0; pointer-events: none; }
    .master-widget-menu.open { transform: scale(1); opacity: 1 !important; pointer-events: auto !important; }
    .master-menu-btn { width: 46px; height: 46px; border-radius: 50%; background: #ffffff; border: 1px solid #e2e8f0; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 17px; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: auto !important; }
    .master-menu-btn:hover { background: #f8fafc; color: #4338ca; transform: scale(1.1) translateY(-2px); box-shadow: 0 20px 25px -5px rgba(79, 70, 229, 0.2); }
    
    .master-fab { width: 58px !important; height: 58px !important; border-radius: 50% !important; background: linear-gradient(135deg, #4f46e5, #6366f1) !important; color: white !important; border: none !important; font-size: 21px !important; cursor: pointer !important; box-shadow: 0 10px 25px -5px rgba(79,70,229,0.5), 0 8px 10px -6px rgba(79,70,229,0.3) !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex !important; justify-content: center !important; align-items: center !important; z-index: 2147483647 !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
    .master-fab:hover { background: linear-gradient(135deg, #4338ca, #4f46e5) !important; transform: scale(1.06) translateY(-2px); box-shadow: 0 15px 30px -5px rgba(79,70,229,0.6) !important; }
    .master-fab.active { background: #0f172a !important; transform: rotate(135deg); box-shadow: 0 10px 20px rgba(0,0,0,0.3) !important; }

    /* COLLAB PANEL - MODERN DRAWER DESIGN */
    .collab-panel { position: fixed; bottom: 24px; top: 24px; left: 100px; width: 380px; background: var(--collab-bg-main); border-radius: 16px; box-shadow: var(--collab-shadow); display: flex; flex-direction: column; z-index: 19999; border: 1px solid var(--collab-border-color); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: translateX(0); opacity: 1; pointer-events: auto; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
    .collab-panel.expanded { width: 560px; bottom: 0; top: 0; left: 0; border-radius: 0; border: none; border-right: 1px solid var(--collab-border-color); box-shadow: 15px 0 45px rgba(0, 0, 0, 0.4); }
    
    /* COLLAB HEADER */
    .collab-header { padding: 14px 18px; background: var(--collab-bg-header); color: var(--collab-text-primary); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--collab-border-color); }
    .status-badge { font-size: 10px; padding: 2.5px 10px; border-radius: 9999px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; box-shadow: 0 0 10px rgba(0,0,0,0.15); }
    .status-badge.disconnected { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); }
    .status-badge.connected { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    
    .status-indicator-light { width: 8px; height: 8px; border-radius: 50%; background: #f43f5e; box-shadow: 0 0 8px #f43f5e; transition: all 0.3s; }
    .status-indicator-light.connected { background: #10b981; box-shadow: 0 0 8px #10b981; }
    
    .icon-toggle-btn { background: transparent; border: none; color: var(--collab-text-secondary); cursor: pointer; font-size: 13.5px; padding: 6px; border-radius: 8px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
    .icon-toggle-btn:hover { color: var(--collab-text-primary); background: rgba(0, 0, 0, 0.05); }
    .collab-panel.theme-dark .icon-toggle-btn:hover { background: rgba(255, 255, 255, 0.08); }
    .icon-toggle-btn.btn-close-main:hover { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    /* ENTRY SETUP SCREEN */
    .collab-setup { padding: 28px; display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center; justify-content: center; flex: 1; background: var(--collab-bg-setup); color: var(--collab-text-primary); }
    .setup-illustration { font-size: 34px; color: #818cf8; margin-bottom: 8px; text-shadow: 0 0 15px rgba(99, 102, 241, 0.4); animation: heroPulse 3s infinite ease-in-out; }
    @keyframes heroPulse { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
    .setup-title { margin: 0; font-size: 18px; font-weight: 800; color: var(--collab-text-primary); }
    .setup-subtitle { margin: 6px 0 20px 0; font-size: 12.5px; line-height: 1.5; color: var(--collab-text-secondary); max-width: 320px; }
    
    .setup-card { background: var(--collab-bg-control-row); border: 1px solid var(--collab-border-color); border-radius: 14px; padding: 20px; width: 100%; box-shadow: 0 15px 30px rgba(0,0,0,0.06); text-align: left; }
    .setup-lbl { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: #4f46e5; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
    .setup-card input { width: 100%; padding: 10px 12px; border: 1px solid var(--collab-border-color); border-radius: 8px; outline: none; font-size: 13.5px; background: var(--collab-bg-main); color: var(--collab-text-primary); transition: all 0.2s; }
    .setup-card input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
    
    .collab-btn { width: 100%; padding: 11px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; letter-spacing: -0.1px; }
    .collab-btn.primary { background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; margin-top: 18px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
    .collab-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4); }
    .collab-btn.secondary { background: var(--collab-btn-secondary); color: var(--collab-btn-secondary-text); border: 1px solid var(--collab-btn-secondary-border); }
    .collab-btn.secondary:hover { background: rgba(0, 0, 0, 0.04); border-color: var(--collab-text-secondary); color: var(--collab-text-primary); }
    .collab-panel.theme-dark .collab-btn.secondary:hover { background: rgba(255, 255, 255, 0.08); }
    .collab-btn.danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); }
    .collab-btn.danger:hover { background: rgba(239, 68, 68, 0.2); }
    .collab-btn.danger-pity { background: rgba(239, 68, 68, 0.12); color: #ef4444; width: 100%; font-size: 11px; padding: 6px; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 600; margin-top: 6px; }

    .hr-text { width: 100%; text-align: center; color: var(--collab-text-secondary); font-size: 9px; font-weight: 700; text-transform: uppercase; margin: 16px 0; position: relative; letter-spacing: 1px; }
    .hr-text span { background: var(--collab-bg-main); padding: 0 10px; position: relative; z-index: 2; border-radius: 4px; border: 1px solid var(--collab-border-color); }
    .hr-text::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--collab-border-color); z-index: 1; }
    .error-text { color: #f43f5e; font-size: 11.5px; font-weight: 600; margin: 12px 0 0 0; text-shadow: 0 1px 4px rgba(0,0,0,0.1); }

    /* CHAT CORE - PRESET ACTIVE VIEW */
    .collab-active { display: flex; flex-direction: column; flex: 1; overflow: hidden; background: var(--collab-bg-main); }
    .collab-tabs { display: flex; background: var(--collab-bg-tab-inactive); border-bottom: 1px solid var(--collab-border-color); padding: 4px; gap: 4px; }
    .tab-btn { flex: 1; padding: 9px 0; border: none; background: transparent; color: var(--collab-text-secondary); cursor: pointer; font-size: 12.5px; font-weight: 700; border-radius: 8px; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); display: flex; align-items: center; justify-content: center; gap: 6px; }
    .tab-btn.active { color: var(--collab-text-primary); background: var(--collab-bg-tab-active); border: 1px solid var(--collab-border-color); box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
    .tab-btn:hover:not(.active) { color: var(--collab-text-primary); background: rgba(0,0,0,0.03); }
    .collab-panel.theme-dark .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.03); }

    /* TAB REGIONS */
    .tab-content { display: none; flex-direction: column; flex: 1; padding: 14px; overflow-y: auto; background: var(--collab-bg-chat-log); }
    .tab-content.active { display: flex; position: relative; }

    /* PREMIUM CONVERSATIONAL CHAT BUBBLES */
    .chat-log { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 11px; margin-bottom: 8px; padding-right: 4px; background: var(--collab-bg-chat-log); }
    .chat-msg-wrapper { display: flex; flex-direction: column; width: 100%; animation: msgFadeIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; }
    @keyframes msgFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    
    .chat-msg { padding: 9px 13px; border-radius: 12px; max-width: 82%; word-wrap: break-word; position: relative; box-shadow: 0 1.5px 4px rgba(0,0,0,0.1); line-height: 1.45; font-size: 13.5px; cursor: context-menu; transition: background-color 0.2s; }
    .chat-msg.mine { background: var(--collab-bg-msg-mine); color: var(--collab-text-mine); align-self: flex-end; border-bottom-right-radius: 2px; }
    .chat-msg.theirs { background: var(--collab-bg-msg-theirs); color: var(--collab-text-msg-theirs); align-self: flex-start; border-bottom-left-radius: 2px; border: 1px solid var(--collab-border-color); }
    
    .chat-sender { font-size: 10.5px; color: #4f46e5; margin-bottom: 2.5px; font-weight: 700; text-transform: capitalize; display: block; }
    .collab-panel.theme-dark .chat-sender { color: #a5b4fc; }
    .chat-msg.mine .chat-sender { color: #e0e7ff; }
    
    .system-msg { text-align: center; font-size: 10.5px; color: var(--collab-text-secondary); margin: 6px auto; font-weight: 600; padding: 3px 12px; background: rgba(0,0,0,0.04); border-radius: 9999px; border: 1px solid var(--collab-border-color); max-width: 90%; }
    .chat-file { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.05); padding: 8px 10px; border-radius: 8px; margin-top: 5px; font-size: 11.5px; border: 1px solid var(--collab-border-color); }
    .chat-img { max-width: 100%; border-radius: 10px; margin-top: 6px; display: block; border: 1px solid var(--collab-border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

    /* REPLY QUOTES */
    .reply-quote { background: rgba(0, 0, 0, 0.05); border-left: 3px solid #4f46e5; padding: 4px 10px; border-radius: 4px; font-size: 11px; margin-bottom: 6px; cursor: pointer; color: var(--collab-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.15s; }
    .chat-msg.mine .reply-quote { border-left-color: #ffffff; color: #e2e8f0; background: rgba(255, 255, 255, 0.12); }
    .reply-quote:hover { color: var(--collab-text-primary); }

    /* MSG HOVER ACTIONS */
    .msg-actions-hover { display: none; position: absolute; right: 6px; top: -14px; background: var(--collab-emoji-bg); border: 1px solid var(--collab-emoji-border); border-radius: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); padding: 2px 7px; gap: 5px; z-index: 10; }
    .chat-msg-wrapper:hover .msg-actions-hover { display: flex; }
    .chat-msg-wrapper.mine:hover .msg-actions-hover { left: 6px; right: auto; }
    .hover-act-btn { background: transparent; border: none; font-size: 11.5px; color: var(--collab-text-secondary); cursor: pointer; padding: 3px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .hover-act-btn:hover { color: #f43f5e; transform: scale(1.15); }

    /* REACTIONS PILLS */
    .message-reactions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; margin-bottom: -2px; }
    .reaction-pill { background: rgba(0,0,0,0.03); border: 1px solid var(--collab-border-color); padding: 1.5px 8px; border-radius: 9999px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 3.5px; font-weight: 700; color: var(--collab-text-secondary); transition: all 0.15s; }
    .reaction-pill:hover { background: rgba(0,0,0,0.06); color: var(--collab-text-primary); transform: scale(1.05); }
    .collab-panel.theme-dark .reaction-pill { background: rgba(255,255,255,0.03); }
    .reaction-pill.voted { background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.35); color: #4f46e5; }
    .collab-panel.theme-dark .reaction-pill.voted { color: #a5b4fc; }

    /* CONTEXT PREVIEW BARS */
    .reply-preview-bar { background: var(--collab-bg-control-row); border-left: 3px solid #4f46e5; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; margin-bottom: 8px; border-top: 1px solid var(--collab-border-color); border-bottom: 1px solid var(--collab-border-color); border-right: 1px solid var(--collab-border-color); }
    .reply-preview-content { display: flex; flex-direction: column; overflow: hidden; text-overflow: ellipsis; text-align: left; }
    .reply-preview-sender { font-size: 11px; font-weight: 1000; color: #4f46e5; }
    .collab-panel.theme-dark .reply-preview-sender { color: #818cf8; }
    .reply-preview-text { font-size: 11px; color: var(--collab-text-secondary); margin: 2px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .close-reply-btn { background: transparent; border: none; font-size: 16px; color: var(--collab-text-secondary); cursor: pointer; padding: 2px; }
    .close-reply-btn:hover { color: #f43f5e; }

    /* VOICE RECORDER BAR */
    .record-preview-bar { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-radius: 10px; margin-bottom: 8px; }
    .record-dot { width: 9px; height: 9px; background: #ef4444; border-radius: 50%; animation: pulse-record 1.2s infinite alternate; box-shadow: 0 0 6px #ef4444; }
    @keyframes pulse-record { 0% { opacity: 0.3; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1.15); } }
    #record-timer { font-size: 12.5px; font-weight: 700; color: #ef4444; font-family: monospace; letter-spacing: 0.5px; }
    .record-controls-row { display: flex; gap: 6px; }
    .record-act-btn { border: none; border-radius: 6px; padding: 4px 10px; font-weight: 700; font-size: 11px; cursor: pointer; transition: all 0.15s; }
    .record-act-btn.cancel { background: rgba(0, 0, 0, 0.05); color: var(--collab-text-secondary); border: 1px solid var(--collab-border-color); }
    .record-act-btn.cancel:hover { background: rgba(0,0,0,0.08); }
    .record-act-btn.send { background: #ef4444; color: white; }
    .record-act-btn.send:hover { background: #dc2626; transform: translateY(-0.5px); }

    /* LOWER ACTION BUTTONS */
    .chat-actions { display: flex; gap: 6px; padding: 6px 0; align-items: center; margin-bottom: 4px; border-top: 1px solid var(--collab-border-color); }
    .os-emoji-tip { font-size: 9px; color: var(--collab-text-secondary); margin-left: auto; font-style: italic; font-weight: 500; text-align: right; }
    
    .icon-btn { background: var(--collab-btn-secondary); border: 1px solid var(--collab-btn-secondary-border); color: var(--collab-text-secondary); cursor: pointer; font-size: 13.5px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s; }
    .icon-btn:hover { background: rgba(0, 0, 0, 0.04); color: #4f46e5; border-color: var(--collab-text-secondary); }
    .icon-btn.trigger-emoji-premium { width: auto; padding: 0 10px; font-weight: 700; font-size: 11.5px; color: #4f46e5; gap: 4px; }
    .icon-btn.trigger-emoji-premium:hover { color: #6366f1; }

    /* CORE CHAT BAR */
    .chat-input-bar { display: flex; gap: 8px; align-items: flex-end; padding: 4px 0; }
    .chat-input-bar textarea { flex: 1; padding: 8px 12px; border: 1px solid var(--collab-border-color); border-radius: 8px; outline: none; font-size: 13px; background: var(--collab-bg-control-row); color: var(--collab-text-primary); transition: all 0.2s; resize: none; min-height: 36px; max-height: 120px; font-family: var(--font-sans); line-height: 1.4; overflow-y: auto; }
    .chat-input-bar textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
    .btn-chat-send-icon { width: 35px; height: 35px; background: #4f46e5; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 13px; flex-shrink:0; }
    .btn-chat-send-icon:hover { background: #4338ca; transform: scale(1.05) translate(1px, -1px); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }

    /* PREMIUM POP-UP CLASSIC EMOJI PICKER */
    .emoji-picker-container { position: absolute; bottom: 58px; left: 12px; right: 12px; background: var(--collab-emoji-bg); border: 1px solid var(--collab-emoji-border); border-radius: 12px; box-shadow: 0 15px 30px rgba(0,0,0,0.15); z-index: 10000; animation: pickerSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1); max-height: 236px; display: flex; flex-direction: column; overflow: hidden; }
    @keyframes pickerSlide { from { transform: translateY(12px) scale(0.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
    .emoji-picker-premium-wrapper { display: flex; flex-direction: column; flex: 1; padding: 10px; width: 100%; height: 100%; }
    
    .emoji-picker-header { display: flex; gap: 8px; border-bottom: 1px solid var(--collab-border-color); padding-bottom: 8px; align-items: center; position: relative; }
    .emoji-search-icon { position: absolute; left: 8px; font-size: 11px; color: var(--collab-text-secondary); }
    .emoji-picker-header input { flex: 1; padding: 5px 10px 5px 24px; font-size: 11.5px; border: 1px solid var(--collab-border-color); border-radius: 6px; outline: none; background: var(--collab-bg-main); color: var(--collab-text-primary); transition: all 0.2s; }
    .emoji-picker-header input:focus { border-color: #818cf8; }
    .emoji-picker-close-btn { background: transparent; border: none; font-size: 18px; color: var(--collab-text-secondary); cursor: pointer; padding: 2px 6px; border-radius: 6px; line-height: 1; }
    .emoji-picker-close-btn:hover { background: rgba(0,0,0,0.05); color: #f43f5e; }
    
    .emoji-picker-tabs { display: flex; gap: 3px; justify-content: space-around; padding: 6px 0; border-bottom: 1px solid var(--collab-border-color); }
    .picker-tab { cursor: pointer; font-size: 14.5px; padding: 3px 6px; border-radius: 6px; transition: all 0.15s; }
    .picker-tab:hover { background: rgba(0,0,0,0.04); }
    .picker-tab.active { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); }
    
    .emoji-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; overflow-y: auto; padding-top: 8px; flex: 1; min-height: 104px; }
    .emoji-grid::-webkit-scrollbar { width: 4px; }
    .emoji-grid::-webkit-scrollbar-thumb { background: var(--collab-border-color); border-radius: 4px; }
    .emoji-item { font-size: 19px; cursor: pointer; text-align: center; padding: 4px; border-radius: 6px; transition: all 0.12s; display: flex; align-items: center; justify-content: center; }
    .emoji-item:hover { background: rgba(0,0,0,0.04); transform: scale(1.15); }
    .collab-panel.theme-dark .emoji-item:hover { background: rgba(255,255,255,0.08); }

    /* VOICE BULB PLAYER */
    .voice-bubble-player { display: flex; align-items: center; gap: 9px; margin-top: 5px; background: rgba(0,0,0,0.04); padding: 6px 10px; border-radius: 8px; border: 1px solid var(--collab-border-color); min-width: 170px; }
    .voice-play-btn { background: #4f46e5; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; transition: all 0.15s; }
    .voice-play-btn:hover { background: #6366f1; transform: scale(1.05); }
    .chat-msg.mine .voice-play-btn { background: rgba(255,255,255,0.2); }
    .chat-msg.mine .voice-play-btn:hover { background: rgba(255,255,255,0.3); }
    
    .voice-progress-range { flex: 1; height: 4px; background: var(--collab-border-color); cursor: pointer; border-radius: 2px; outline: none; -webkit-appearance: none; }
    .voice-progress-range::-webkit-slider-thumb { -webkit-appearance: none; width: 8px; height: 8px; border-radius: 50%; background: #4f46e5; }
    .chat-msg.mine .voice-progress-range::-webkit-slider-thumb { background: white; }
    .voice-playback-speed { font-size: 8.5px; font-weight: 700; background: rgba(0,0,0,0.05); color: var(--collab-text-secondary); padding: 2px 4px; border-radius: 4px; cursor: pointer; border: 1px solid var(--collab-border-color); }
    .voice-playback-speed:hover { background: rgba(0,0,0,0.1); color: var(--collab-text-primary); }

    /* COOPERATIVE SKETCH BOARD CONTROL DECK */
    .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
    .tool-btn { padding: 9px; border: 1px solid var(--collab-border-color); border-radius: 8px; background: var(--collab-btn-secondary); cursor: pointer; font-size: 11px; font-weight: 700; color: var(--collab-text-secondary); display: flex; flex-direction: column; align-items: center; gap: 5px; transition: all 0.2s; }
    .tool-btn:hover { background: rgba(0,0,0,0.04); color: var(--collab-text-primary); }
    .tool-btn.active { background: rgba(99, 102, 241, 0.1); color: #4f46e5; border-color: rgba(99, 102, 241, 0.3); }
    .collab-panel.theme-dark .tool-btn.active { color: #a5b4fc; }
    
    .color-picker-deck { background: var(--collab-bg-control-row); border: 1px solid var(--collab-border-color); padding: 10px; border-radius: 10px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; text-align: left; }
    .deck-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--collab-text-primary); text-transform: uppercase; letter-spacing: 0.3px; }
    .color-picker-control { display: flex; align-items: center; gap: 10px; width: 100%; }
    .color-swatch-wrapper { border-radius: 50%; overflow: hidden; width: 28px; height: 28px; border: 1px solid var(--collab-border-color); display: flex; justify-content: center; align-items: center; cursor: pointer; flex-shrink: 0; }
    .color-swatch-wrapper input[type="color"] { border: none !important; width: 44px !important; height: 44px !important; cursor: pointer; transform: scale(1.5); background: transparent; padding: 0; }
    
    .premium-slider { flex: 1; -webkit-appearance: none; background: var(--collab-border-color); height: 5px; border-radius: 3px; outline: none; }
    .premium-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #4f46e5; cursor: pointer; box-shadow: 0 0 5px rgba(79, 70, 229, 0.4); }
    .slider-badge { font-size: 10.5px; font-weight: 700; color: #4f46e5; background: rgba(99, 102, 241, 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(99,102,241,0.2); min-width: 38px; text-align: center; font-family: monospace; }
    .collab-panel.theme-dark .slider-badge { color: #a5b4fc; }

    /* PARAMETERS & METADATA COORDINATION */
    .sync-controls-panel { border-top: 1px solid var(--collab-border-color); padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
    .control-header { margin: 0 0 5px 0; font-size: 12px; font-weight: 800; color: var(--collab-text-primary); display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
    .control-row { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; background: var(--collab-bg-control-row); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--collab-border-color); }
    .control-label-desc { display: flex; flex-direction: column; gap: 1px; text-align: left; }
    .control-label-desc strong { color: var(--collab-text-primary); font-size: 12px; }
    .control-label-desc span { color: var(--collab-text-secondary); font-size: 9.5px; font-weight: 500; }
    
    .premium-select { background: var(--collab-bg-main); border: 1px solid var(--collab-border-color); color: var(--collab-text-primary); padding: 4px 8px; border-radius: 6px; font-size: 11px; outline: none; font-weight: 600; cursor: pointer; transition: border-color 0.2s; }
    .premium-select:focus { border-color: #6366f1; }
    .control-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }

    /* STREAM / MEDIA TAB */
    .media-container { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 180px; background: var(--collab-bg-main); border-radius: 8px; padding: 10px; border: 1px solid var(--collab-border-color); }
    .empty-media { color: var(--collab-text-secondary); text-align: center; margin: auto; font-size: 12px; font-style: italic; }
    .media-header-note { background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.15); color: var(--collab-text-primary); padding: 10px; border-radius: 8px; font-size: 11.5px; line-height: 1.5; display: flex; gap: 7px; text-align: left; }
    
    .stream-wrapper { position: relative; background: var(--collab-bg-control-row); border-radius: 6px; padding: 8px; border: 1px solid var(--collab-border-color); display: flex; flex-direction: column; gap: 4px; }
    .stream-label { color: var(--collab-text-primary); font-weight: bold; font-size: 11px; display: block; border-bottom: 1px solid var(--collab-border-color); padding-bottom: 4px; text-align: left; }
    video { width: 100%; border-radius: 6px; background: black; }
    audio { width: 100%; height: 36px; }

    /* ACTIVE ROSTER HANDS MODERATION PANELS */
    .users-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .user-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--collab-bg-user-item); border-radius: 10px; border: 1px solid var(--collab-border-color); }
    .user-left { display: flex; align-items: center; gap: 10px; }
    .user-avatar { width: 28px; height: 28px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; text-transform: uppercase; border: 1.5px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.1); }
    
    .moderation-panel { background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.18); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
    .mod-pane-header { display: flex; align-items: center; gap: 8px; color: #d97706; font-size: 13px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid rgba(245, 158, 11, 0.15); padding-bottom: 6px; }
    .mod-pane-body { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; text-align: left; }
    .custom-chk-label { display: flex; align-items: center; gap: 8px; font-size: 11.5px; cursor: pointer; color: var(--collab-text-primary); font-weight: 500; }
    .custom-chk-label input[type="checkbox"] { width: 14px; height: 14px; accent-color: #f59e0b; border-radius: 4px; cursor: pointer; }

    .pulse-slow { animation: pulseSlow 2s infinite ease-in-out; }
    @keyframes pulseSlow { 0%, 100% { opacity: 0.9; transform: scale(1); } 50% { opacity: 1; transform: scale(1.02); } }

    .collab-board { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 19998; }
    .collab-cursors { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 19999; overflow: hidden; }
    .remote-cursor { position: absolute; pointer-events: none; transition: transform 0.1s linear; display: flex; flex-direction: column; align-items: flex-start; }
    .cursor-arrow { width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #ef4444; transform: rotate(-25deg); filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.2)); }
    .cursor-label { background: #ef4444; color: white; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; white-space: nowrap; margin-top: 4px; margin-left: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.15); font-weight: 700; letter-spacing: -0.1px; }

    /* TELEGRAM CONTEXT MENU STYLING */
    .chat-ctx-menu { position: fixed; width: 170px; background: var(--collab-emoji-bg); border: 1px solid var(--collab-emoji-border); border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,4); z-index: 100005; display: flex; flex-direction: column; overflow: hidden; animation: menuZoomIn 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes menuZoomIn { from { transform: scale(0.95); opacity:0; } to { transform: scale(1); opacity:1; } }
    .ctx-menu-item { background: transparent; border: none; text-align: left; padding: 10px 14px; font-size: 11.5px; font-family: var(--font-sans); color: var(--collab-text-primary); cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s; font-weight: 600; }
    .ctx-menu-item:hover { background: rgba(0,0,0,0.04); }
    .collab-panel.theme-dark .ctx-menu-item:hover { background: rgba(255,255,255,0.06); }
    .ctx-menu-item.danger { border-top: 1px solid var(--collab-border-color); }

    /* GAMIFIED EXTRAS & ACHIEVEMENTS */
    .achievement-toast { position: absolute; top: 70px; left: 16px; right: 16px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border: 2px solid #d97706; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 25px rgba(245, 158, 11, 0.4); z-index: 10002; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); animation: challengeGrow 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); color: #000000; }
    @keyframes challengeGrow { from { transform: scale(0.8) translateY(-20px); opacity:0; } to { transform: scale(1) translateY(0); opacity:1; } }
    .achievement-toast-icon { font-size: 24px; }
    .achievement-title { color: #511201; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; }
    .achievement-desc { color: #78350f; font-size: 11px; font-weight: 600; margin-top: 1px; text-align: left; }
    `;

    const js = `
    // Wait for PeerJS to be available (loaded via MasterWidget)
    function waitForPeerJS(maxRetries) {
        return new Promise(function(resolve, reject) {
            var tries = 0;
            var interval = setInterval(function() {
                tries++;
                if (typeof Peer !== 'undefined') {
                    clearInterval(interval);
                    resolve(Peer);
                } else if (tries >= (maxRetries || 50)) {
                    clearInterval(interval);
                    reject(new Error('PeerJS not loaded after ' + tries + ' retries'));
                }
            }, 200);
        });
    }

    // PeerJS connection config with STUN/TURN for robust P2P
    var peerJSOptions = {
        debug: 1,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                {
                    urls: 'turn:relay1.expressturn.com:3478',
                    username: 'efZ4VGOVT7FWHM5RNC',
                    credential: 'uoaX5K3QJEegQBnO'
                }
            ]
        }
    };

    window.collabState = {
        peer: null,
        connections: {}, // conn.peer -> conn
        role: 'none', // host | learner
        myName: '',
        myId: '',
        room: '',
        tool: 'pointer',
        color: '#ff0000',
        size: 3,
        drawing: false,
        lastPosition: {x:0,y:0},
        syncScroll: true,
        users: {},
        canvasCtx: null,
        localStream: null,
        mediaCalls: {},
        isRemoteChange: false,
        
        // Multi-coordinate Sync
        syncMode: 'tutor', // tutor | everyone | none
        interactMode: 'tutor', // tutor | everyone | none
        replyingTo: null,
        
        // Moderations (applied client side)
        chatMuteEnabled: false,
        drawingMuteEnabled: false,
        
        // Voice message media track
        voiceRecorder: null,
        recordedChunks: [],
        recordTimerInterval: null,
        recordSeconds: 0,

        // Gamification / Classroom Engagement
        xp: 0,
        unlockedBadges: {},
        activePoll: null,

        // Reconnection
        reconnectAttempts: 0,
        maxReconnectAttempts: 10,
        reconnectTimer: null,
        intentionalDisconnect: false,

        // Host info
        hostName: '',
        roomId: ''
    };

    var emojisMap = {
        smileys: '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯',
        gestures: '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 👍 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪',
        hearts: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✨ 🔥 💥 💯',
        nature: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🐮 🦁 🦁 🐗 🐱 🦖 🦖 🐲 🌲 🌳 🌴 🌱 🍀 🌞 ⭐ 🌈',
        food: '🍏 🍎 🍊 🍋 🍌 🍉 🍇 🍓 🍈 🍒 🍑 🍍 🥥 🥝 🥑 🍕 🍔 🍟 🌭 🥪 🍰 🎂 🍩 🍪 ☕ 🍺',
        symbols: '⚠️ 🚫 ⬆️ ➡️ ⬇️ ⬅️ 🔄 🔴 🔵 ⚫ ⚪ ⬛ ⬜ ✅ ❌ ❓ 📢 🔔'
    };

    var badgesDataset = [
        { id: 'first_connect', name: 'First Connection', desc: 'Plugged into live collaborative network.', icon: '🔌', points: 10 },
        { id: 'board_scribble', name: 'Board Scribbler', desc: 'Left your markup on the session board.', icon: '🎨', points: 20 },
        { id: 'quiz_answer', name: 'Quiz Taker', desc: 'Voted on tutor\\\'s live checkpoint check.', icon: '🧠', points: 30 },
        { id: 'voice_note', name: 'Audio Guru', desc: 'Sent a dynamic custom voice message.', icon: '🎙️', points: 25 },
        { id: 'gif_share', name: 'Meme Wizard', desc: 'Sent an animated moving visual layout.', icon: '🌟', points: 15 }
    ];

    window.changeXP = function(amount) {
        window.collabState.xp += amount;
        var el = document.getElementById('rewards-points-count');
        if (el) el.innerText = window.collabState.xp + ' XP';
    };

    window.unlockBadge = function(badgeId, badgeName, badgeDesc) {
        if(window.collabState.unlockedBadges[badgeId]) return;
        window.collabState.unlockedBadges[badgeId] = true;
        
        var b = badgesDataset.find(function(item) { return item.id === badgeId; });
        if (b) {
            window.changeXP(b.points);
        }
        
        var toast = document.getElementById('badge-celebration-toast');
        var tTitle = document.getElementById('achievement-badge-title');
        var tDesc = document.getElementById('achievement-badge-desc');
        if (toast && tTitle && tDesc) {
            tTitle.innerText = 'Unlocked: ' + badgeName;
            tDesc.innerText = badgeDesc + ' (+' + (b ? b.points : 10) + ' XP)';
            toast.classList.remove('hidden');
            setTimeout(function() {
                toast.classList.add('hidden');
            }, 5000);
        }
        renderBadgesList();
    };

    function renderBadgesList() {
        var grid = document.getElementById('badges-grid-container');
        if(!grid) return;
        
        grid.innerHTML = '';
        badgesDataset.forEach(function(b) {
            var unlocked = window.collabState.unlockedBadges[b.id];
            var opacity = unlocked ? 1 : 0.45;
            var border = unlocked ? 'border: 1.5px solid #fbbf24; background: rgba(251, 191, 36, 0.08);' : 'border: 1.5px dashed var(--collab-border-color); background: transparent;';
            grid.innerHTML += '<div style="' + border + ' opacity: ' + opacity + '; padding: 10px; border-radius: 10px; display: flex; align-items: center; gap: 10px; text-align: left; transition: all 0.2s;"><div style="font-size: 24px;">' + b.icon + '</div><div><strong style="font-size: 11.5px; display: block; color: var(--collab-text-primary);">' + b.name + '</strong><span style="font-size: 9.5px; color: var(--collab-text-secondary); display:block; line-height:1.2; margin-top:2px;">' + b.desc + '</span></div></div>';
        });
    }

    // --- UI DRAWER TOGGLES ---
    window.toggleMasterMenu = function() {
        var menu = document.getElementById('collab-master-menu');
        var fab = document.querySelector('.master-fab');
        menu.classList.toggle('open');
        fab.classList.toggle('active');
    };

    window.toggleCollabPanel = function() {
        var panel = document.getElementById('collab-panel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            toggleMasterMenu(); // Close menu
            initCanvas();
            setTimeout(window.scanActivePageMediaElements, 500);
        } else {
            panel.classList.add('hidden');
        }
    };

    window.togglePanelSize = function() {
        var panel = document.getElementById('collab-panel');
        var icon = document.querySelector('#resize-panel-btn i');
        panel.classList.toggle('expanded');
        if(panel.classList.contains('expanded')) {
            icon.className = 'fas fa-compress-alt';
        } else {
            icon.className = 'fas fa-expand-alt';
        }
    };

    window.toggleCollabTheme = function() {
        var panel = document.getElementById('collab-panel');
        var btn = document.getElementById('collab-theme-btn');
        if(!panel || !btn) return;
        
        panel.classList.toggle('theme-dark');
        var isDark = panel.classList.contains('theme-dark');
        btn.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    };

    window.switchCollabTab = function(tabId) {
        window.toggleEmojiPicker(false);
        document.querySelectorAll('.tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
        var btn = document.querySelector('.tab-btn[onclick="switchCollabTab(\\'' + tabId + '\\')"]');
        if (btn) btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(function(tc) { tc.classList.remove('active'); });
        document.getElementById('tab-' + tabId).classList.add('active');
        
        if (tabId === 'media') {
            window.scanActivePageMediaElements();
        }
        if (tabId === 'rewards') {
            renderBadgesList();
        }
    };

    // --- P2P CORE ---
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function sysMsg(msg) {
        document.getElementById('collab-error').innerText = msg;
        var log = document.getElementById('chat-log');
        var el = document.createElement('div');
        el.className = 'system-msg';
        el.innerText = msg;
        log.appendChild(el);
        log.scrollTop = log.scrollHeight;
    }

    window.hostRoom = function() {
        var name = document.getElementById('collab-name').value.trim() || 'Tutor';
        var id = 'room-' + generateId();
        initPeer(id, name, 'host');
    };

    window.joinRoom = function() {
        var name = document.getElementById('collab-name').value.trim() || 'Student';
        var room = document.getElementById('collab-room-id').value.trim();
        if(!room) return sysMsg("Room ID required");
        initPeer(null, name, 'learner', room);
    };

    function initPeer(id, name, role, connectToId) {
        sysMsg("Connecting to Live Classroom peer server...");
        window.collabState.role = role;
        window.collabState.myName = name;
        window.collabState.reconnectAttempts = 0;
        window.collabState.intentionalDisconnect = false;

        doInitPeer(id, role, connectToId);

        function doInitPeer(pid, r, targetId) {
            waitForPeerJS(30).then(function() {
                var peer = new Peer(pid, peerJSOptions);
                window.collabState.peer = peer;

                peer.on('open', function(myId) {
                    window.collabState.myId = myId;
                    window.collabState.reconnectAttempts = 0;
                    document.getElementById('collab-setup').classList.add('hidden');
                    document.getElementById('collab-active').classList.remove('hidden');
                    
                    var indicator = document.getElementById('collab-indicator');
                    if (indicator) indicator.classList.add('connected');
                    var status = document.getElementById('collab-status');
                    status.className = 'status-badge connected';
                    status.innerText = r === 'host' ? 'Hosting' : 'Connected';
                    
                    document.getElementById('collab-error').innerText = '';
                    
                    sysMsg(r === 'host' ? 'Tell students to join this Room ID: ' + myId : 'Connected.');
                    
                    window.unlockBadge('first_connect', 'First Connection', 'Plugged into live collaborative network.');

                    if(r === 'host') {
                        window.collabState.room = myId;
                        document.getElementById('collab-room-id').value = myId;
                        document.getElementById('tutor-moderation-box').classList.remove('hidden');
                        // Broadcast current state to any late joiners
                        setTimeout(window.broadcastCurrentLessonState, 1000);
                    } else {
                        window.collabState.room = targetId;
                        connectToHost(targetId);
                    }
                });

                peer.on('connection', function(conn) {
                    if(r === 'host') {
                        setupConnection(conn);
                    }
                });

                peer.on('error', function(err) {
                    sysMsg('Connection: ' + err.type);
                    if (err.type === 'unavailable-id' || err.type === 'browser-incompatible') {
                        return;
                    }
                    if (err.type === 'peer-unavailable') {
                        // Target peer not found, learner will retry via connectToHost
                    }
                });

                peer.on('disconnected', function() {
                    if (window.collabState.intentionalDisconnect) return;
                    sysMsg('Connection lost. Reconnecting...');
                    var status = document.getElementById('collab-status');
                    status.className = 'status-badge disconnected';
                    status.innerText = 'Reconnecting';
                    var indicator = document.getElementById('collab-indicator');
                    if (indicator) indicator.classList.remove('connected');
                    
                    if (window.collabState.reconnectAttempts < window.collabState.maxReconnectAttempts) {
                        window.collabState.reconnectAttempts++;
                        setTimeout(function() {
                            if (window.collabState.peer && !window.collabState.peer.destroyed) {
                                window.collabState.peer.reconnect();
                            } else {
                                doInitPeer(null, r, targetId);
                            }
                        }, Math.min(1000 * window.collabState.reconnectAttempts, 8000));
                    } else {
                        sysMsg('Could not reconnect after ' + window.collabState.maxReconnectAttempts + ' attempts. Please restart.');
                        status.innerText = 'Disconnected';
                    }
                });
            }).catch(function(err) {
                sysMsg('PeerJS library failed to load. Check your internet connection.');
                console.error(err);
            });
        }
    }

    function connectToHost(hostId, retries) {
        retries = retries || 0;
        if (retries > 5) {
            sysMsg('Could not connect to Tutor after multiple attempts.');
            return;
        }
        sysMsg('Connecting to Tutor' + (retries > 0 ? ' (attempt ' + (retries + 1) + ')...' : '...'));
        var conn = window.collabState.peer.connect(hostId, {
            metadata: { name: window.collabState.myName }
        });

        var timeout = setTimeout(function() {
            if (conn && !conn.open) {
                conn.close();
                connectToHost(hostId, retries + 1);
            }
        }, 5000);

        conn.on('open', function() {
            clearTimeout(timeout);
            setupConnection(conn);
        });

        conn.on('error', function() {
            clearTimeout(timeout);
            connectToHost(hostId, retries + 1);
        });
    }

    function setupConnection(conn) {
        conn.on('open', function() {
            window.collabState.connections[conn.peer] = conn;
            var peerName = conn.metadata?.name || conn.peer;
            sysMsg('Connected to ' + peerName);
            
            if (window.collabState.role === 'learner' && !window.collabState.hostName) {
                window.collabState.hostName = peerName;
                var hostEl = document.getElementById('collab-host-name');
                if (hostEl) {
                    hostEl.style.display = 'inline';
                    hostEl.innerText = 'by ' + peerName;
                }
            }
            
            conn.send({
                type: 'intro',
                id: window.collabState.myId,
                name: window.collabState.myName,
                color: window.collabState.color
            });
        });

        conn.on('data', function(data) { handleData(data, conn.peer); });

        conn.on('close', function() {
            sysMsg('User departed: ' + conn.peer);
            delete window.collabState.connections[conn.peer];
            removeUser(conn.peer);
            if(window.collabState.role === 'host') {
                broadcast({ type: 'user_left', id: conn.peer });
            }
        });
    }

    function broadcast(data, excludePeer) {
        if (!data.senderId) data.senderId = window.collabState.myId;
        Object.values(window.collabState.connections).forEach(function(c) {
            if(c.peer !== excludePeer && c.open) {
                c.send(data);
            }
        });
    }

    function handleData(data, fromPeer) {
        if(window.collabState.role === 'host' && data.type !== 'intro' && data.type !== 'request_state') {
            broadcast(Object.assign({}, data), fromPeer);
        }

        switch(data.type) {
            case 'intro':
                addUser(data.id, data.name, data.color);
                if(window.collabState.role === 'host') {
                    Object.values(window.collabState.users).forEach(function(u) {
                        window.collabState.connections[fromPeer].send({
                            type: 'user_joined', user: u
                        });
                    });
                    broadcast({ type: 'user_joined', user: { id: data.id, name: data.name, color: data.color } }, fromPeer);
                    // Send current lesson state to the new joiner
                    setTimeout(function() {
                        var state = window.captureLessonState();
                        if (state && window.collabState.connections[fromPeer]) {
                            window.collabState.connections[fromPeer].send({
                                type: 'sync_state',
                                state: state
                            });
                        }
                    }, 500);
                }
                break;
            case 'user_joined':
                addUser(data.user.id, data.user.name, data.user.color);
                break;
            case 'user_left':
                removeUser(data.id);
                break;
            case 'delete_msg':
                var mel = document.getElementById('msg-wrap-' + data.msgId);
                if(mel) mel.remove();
                break;
            case 'loaded_media_url':
                var container = document.getElementById('media-container');
                if(container) {
                    var empty = document.getElementById('media-empty');
                    if(empty) empty.style.display = 'none';

                    var wrap = document.createElement('div');
                    wrap.className = 'stream-wrapper';
                    var mTag = document.createElement(data.isAudio ? 'audio' : 'video');
                    mTag.controls = true;
                    mTag.id = data.mediaId;
                    mTag.src = data.url;
                    wrap.innerHTML = '<span class="stream-label">Shared stream by Tutor</span>';
                    wrap.appendChild(mTag);
                    container.appendChild(wrap);
                }
                setTimeout(window.scanActivePageMediaElements, 500);
                break;
            case 'loaded_media_info':
                sysMsg("Tutor loaded a local PC media file: " + data.filename + ". Select or drag yours to synchronize.");
                break;
            case 'poll_launch':
                window.collabState.activePoll = data.poll;
                renderActivePoll(data.poll);
                window.switchCollabTab('rewards');
                break;
            case 'poll_vote':
                var p = window.collabState.activePoll;
                if(p && p.id === data.pollId) {
                    if(!p.votes[data.option].includes(data.voter)) {
                        p.votes[data.option].push(data.voter);
                        renderActivePoll(p);
                    }
                }
                break;
            case 'chat':
                addChat(data.name, data.text, false, data);
                break;
            case 'file':
                addChatFile(data.name, data.filename, data.filedata, data.filetype, false, data);
                break;
            case 'voice':
                addChatVoiceMessage(data.name, data.filedata, data.duration, false, data);
                break;
            case 'react':
                executeMsgReaction(data.msgId, data.emoji, data.senderId, false);
                break;
            case 'cursor':
                updateCursor(data.senderId, data.x, data.y);
                break;
            case 'draw':
                if (window.collabState.drawingMuteEnabled && window.collabState.role !== 'host') break;
                executeDraw(data);
                break;
            case 'scroll':
                if(window.collabState.syncScroll) {
                    executeScroll(data.pct);
                }
                break;
            case 'hand':
                showHand(data.senderId);
                break;
            case 'clear':
                window.collabState.canvasCtx.clearRect(0,0,window.innerWidth, window.innerHeight);
                break;
            case 'dom_interact':
                executeDomInteraction(data);
                break;
            case 'media_sync':
                executeMediaControlSync(data);
                break;
            case 'mute_settings':
                window.collabState.chatMuteEnabled = data.chatMuted;
                window.collabState.drawingMuteEnabled = data.drawingMuted;
                var inp = document.getElementById('chat-input');
                if(data.chatMuted && window.collabState.role !== 'host') {
                    inp.placeholder = "Chat is muted by Tutor.";
                    inp.disabled = true;
                } else {
                    inp.placeholder = "Type messages... Support markdown";
                    inp.disabled = false;
                }
                break;
            case 'scroll_setting':
                if (window.collabState.role !== 'host') {
                    window.collabState.syncMode = data.val;
                    var sel = document.getElementById('sync-scroll-mode-select');
                    if (sel) sel.value = data.val;
                }
                break;
            case 'request_state':
                if (window.collabState.role === 'host') {
                    var curState = window.captureLessonState();
                    if (curState && window.collabState.connections[fromPeer]) {
                        window.collabState.connections[fromPeer].send({
                            type: 'sync_state',
                            state: curState
                        });
                    }
                }
                break;
            case 'sync_state':
                window.restoreLessonState(data.state);
                break;
            case 'accordion_toggle':
                executeAccordionSync(data);
                break;
        }
    }

    // --- USERS ---
    function addUser(id, name, color) {
        if(window.collabState.users[id]) return;
        window.collabState.users[id] = { id, name, color };
        renderUsers();
    }
    function removeUser(id) {
        delete window.collabState.users[id];
        var el = document.getElementById('cursor-wrapper-'+id);
        if(el) el.remove();
        renderUsers();
    }
    function renderUsers() {
        var list = document.getElementById('users-list');
        list.innerHTML = '';
        var all = [{id: window.collabState.myId, name: window.collabState.myName + ' (You)', color: window.collabState.color}].concat(Object.values(window.collabState.users));
        document.getElementById('user-count').innerText = all.length;
        
        all.forEach(function(u) {
            list.innerHTML += '<div class="user-item"><div class="user-left"><div class="user-avatar" style="background:' + u.color + '">' + u.name.substring(0,2) + '</div><span style="font-size:12px; font-weight:700; color:#1e293b;">' + u.name + '</span></div><i id="hand-icon-' + u.id + '" class="fas fa-hand-paper hidden" style="color:#eab308; margin-right:8px;"></i></div>';
        });
    }

    window.raiseHand = function() {
        broadcast({ type: 'hand' });
        showHand(window.collabState.myId);
    };

    function showHand(id) {
        var icon = document.getElementById('hand-icon-'+id);
        if(icon) {
            icon.classList.remove('hidden');
            icon.classList.add('hand-raised');
            setTimeout(function() {
                icon.classList.add('hidden');
            }, 5000);
        }
    }

    // --- TELEGRAM-STYLE CHAT ---
    function parseMarkdown(text) {
        var clean = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // Auto convert image or GIF URLs to img tags
        var imgRegex = /(https?:\\/\\/[^\\s]+(?:\\.gif|\\.png|\\.jpg|\\.jpeg|\\.webp)(?:\\?[^\\s]*)?)/gi;
        clean = clean.replace(imgRegex, '<img src="$1" class="chat-img" referrerpolicy="no-referrer" style="max-width:100%; border-radius:8px; margin-top:4px; display:block;" />');

        clean = clean.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
        clean = clean.replace(/__(.*?)__/g, '<strong>$1</strong>');
        clean = clean.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
        clean = clean.replace(/_(.*?)_/g, '<em>$1</em>');
        clean = clean.replace(/~~(.*?)~~/g, '<del>$1</del>');
        clean = clean.replace(new RegExp('\\\\x60(.*?)\\\\x60', 'g'), '<code class="bg-gray-100 px-1 py-0.5 rounded text-rose-600 font-mono text-xs">$1</code>');
        
        return clean;
    }

    window.addEventListener('paste', function(e) {
        var active = document.activeElement;
        if (active && (active.id === 'chat-input' || active.closest('#collab-panel'))) {
            var items = (e.clipboardData || e.originalEvent.clipboardData).items;
            
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    e.preventDefault();
                    (function(f, mType) {
                        var reader = new FileReader();
                        reader.onload = function(evt) {
                            var dataUrl = evt.target.result;
                            var filename = f.name || 'clipboard_image_' + Date.now() + (mType === 'image/gif' ? '.gif' : '.png');
                            var msgData = {
                                msgId: 'msg-' + generateId(),
                                replyTo: window.collabState.replyingTo
                            };
                            addChatFile('Me', filename, dataUrl, mType, true, msgData);
                            broadcast(Object.assign({
                                type: 'file',
                                name: window.collabState.myName,
                                filename: filename,
                                filedata: dataUrl,
                                filetype: mType
                            }, msgData));
                            window.cancelReply();
                            
                            // Gamification Badge unlock
                            if (mType === 'image/gif' || filename.endsWith('.gif')) {
                                window.unlockBadge('gif_share', 'Meme Wizard', 'Sent an animated moving visual layout.');
                            }
                        };
                        reader.readAsDataURL(f);
                    })(item.getAsFile(), item.type);
                    return;
                }
            }

            var htmlText = e.clipboardData.getData('text/html');
            if (htmlText && htmlText.includes('<table')) {
                e.preventDefault();
                var cleanHtml = htmlText.replace(new RegExp('<' + 'script\\b[^<]*(?:(?!<' + '/script>)<[^<]*)*<' + '/script>', 'gi'), '');
                var msgData = {
                    msgId: 'msg-' + generateId(),
                    replyTo: window.collabState.replyingTo,
                    isRichContent: true
                };
                addChat('Me', cleanHtml, true, msgData);
                broadcast(Object.assign({
                    type: 'chat',
                    name: window.collabState.myName,
                    text: cleanHtml
                }, msgData));
                window.cancelReply();
            }
        }
    });

    window.handleChatInputKeyDown = function(e) {
        var el = e.target;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            window.sendChat();
            el.style.height = 'auto';
        } else {
            setTimeout(function() {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
            }, 0);
        }
    };

    window.sendChat = function() {
        if(window.collabState.chatMuteEnabled && window.collabState.role !== 'host') {
            return alert("The Tutor has temporarily restricted chat inputs.");
        }
        var input = document.getElementById('chat-input');
        var text = input.value.trim();
        if(!text) return;

        var msgData = {
            msgId: 'msg-' + generateId(),
            replyTo: window.collabState.replyingTo
        };

        addChat('Me', text, true, msgData);
        broadcast(Object.assign({ 
            type: 'chat', 
            name: window.collabState.myName, 
            text: text 
        }, msgData));
        
        // Gamification check: if they pasted a link to a GIF
        if (text.toLowerCase().includes('.gif') || text.toLowerCase().includes('giphy.com') || text.toLowerCase().includes('media.tenor.com')) {
            window.unlockBadge('gif_share', 'Meme Wizard', 'Sent an animated moving visual layout.');
        }

        input.value = '';
        input.style.height = 'auto';
        window.cancelReply();
    };

    function addChat(sender, text, isMine, msgMetadata) {
        var log = document.getElementById('chat-log');
        var cls = isMine ? 'mine' : 'theirs';
        var msgId = msgMetadata?.msgId || 'msg-' + generateId();
        
        var wrap = document.createElement('div');
        wrap.className = 'chat-msg-wrapper';
        wrap.id = 'msg-wrap-' + msgId;
        
        var replyHtml = '';
        if(msgMetadata?.replyTo) {
            replyHtml = '<div class="reply-quote" onclick="window.scrollToChatMessage(\\'' + msgMetadata.replyTo.id + '\\')"><strong>Replying to ' + msgMetadata.replyTo.sender + '</strong>: ' + msgMetadata.replyTo.text + '</div>';
        }

        var parsedContent = msgMetadata?.isRichContent ? text : parseMarkdown(text);
        var senderHeader = !isMine ? '<div class="chat-sender">' + sender + '</div>' : '';

        wrap.innerHTML = '<div class="chat-msg ' + cls + '" style="align-self:' + (isMine?'flex-end':'flex-start') + ';"><div class="msg-actions-hover"><button class="hover-act-btn" onclick="window.setReplyTarget(\\'' + msgId + '\\', \\'' + sender + '\\', \\'' + escapeQuotes(text) + '\\')"><i class="fas fa-reply"></i></button><button class="hover-act-btn" onclick="window.toggleEmojiPicker(true, \\'' + msgId + '\\')"><i class="far fa-smile"></i></button></div>' + senderHeader + replyHtml + '<div class="chat-text-inner">' + parsedContent + '</div><div class="message-reactions" id="reactions-' + msgId + '"></div></div>';
        log.appendChild(wrap);
        log.scrollTop = log.scrollHeight;
    }

    function escapeQuotes(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    window.scrollToChatMessage = function(id) {
        var el = document.getElementById('msg-wrap-' + id);
        if(el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.backgroundColor = '#fef08a';
            setTimeout(function() { el.style.backgroundColor = 'transparent'; }, 1500);
        }
    };

    window.setReplyTarget = function(msgId, sender, text) {
        window.collabState.replyingTo = { id: msgId, sender: sender, text: text.substring(0, 40) };
        document.getElementById('reply-preview-sender').innerText = 'Replying to ' + sender;
        document.getElementById('reply-preview-text').innerText = text;
        document.getElementById('chat-reply-preview').classList.remove('hidden');
        document.getElementById('chat-input').focus();
    };

    window.cancelReply = function() {
        window.collabState.replyingTo = null;
        document.getElementById('chat-reply-preview').classList.add('hidden');
    };

    // --- CONTEXT MENU ACTIONS ---
    window.ctxReply = function() {
        var msgId = window.collabState.ctxMsgId;
        var msgEl = window.collabState.ctxMsgEl;
        if (!msgId || !msgEl) return;
        
        var textInner = msgEl.querySelector('.chat-text-inner');
        var text = textInner ? textInner.innerText : 'Media File';
        var senderHeader = msgEl.querySelector('.chat-sender');
        var senderName = senderHeader ? senderHeader.innerText : (window.collabState.ctxIsMine ? window.collabState.myName : 'User');
        
        window.setReplyTarget(msgId, senderName, text);
        
        var menu = document.getElementById('chat-context-menu');
        if (menu) menu.classList.add('hidden');
    };

    window.ctxCopy = function() {
        var msgEl = window.collabState.ctxMsgEl;
        if (!msgEl) return;
        var textInner = msgEl.querySelector('.chat-text-inner');
        var text = textInner ? textInner.innerText : '';
        if (text) {
            navigator.clipboard.writeText(text).then(function() {
                sysMsg("Copied text content to clipboard.");
            }).catch(function(err) {});
        }
        var menu = document.getElementById('chat-context-menu');
        if (menu) menu.classList.add('hidden');
    };

    window.ctxDeleteMe = function() {
        var msgId = window.collabState.ctxMsgId;
        if (msgId) {
            var wrapper = document.getElementById('msg-wrap-' + msgId);
            if (wrapper) wrapper.remove();
        }
        var menu = document.getElementById('chat-context-menu');
        if (menu) menu.classList.add('hidden');
    };

    window.ctxDeleteBoth = function() {
        var msgId = window.collabState.ctxMsgId;
        if (!msgId) return;
        
        var wrapper = document.getElementById('msg-wrap-' + msgId);
        if (wrapper) wrapper.remove();
        
        broadcast({
            type: 'delete_msg',
            msgId: msgId
        });
        
        var menu = document.getElementById('chat-context-menu');
        if (menu) menu.classList.add('hidden');
    };

    // Delay binding of delegator listeners to ensure container rendered
    setTimeout(function() {
        var log = document.getElementById('chat-log');
        if (log) {
            log.addEventListener('contextmenu', function(e) {
                var msgEl = e.target.closest('.chat-msg');
                if (!msgEl) return;
                
                e.preventDefault();
                
                var wrapper = msgEl.closest('.chat-msg-wrapper');
                if (!wrapper) return;
                var msgId = wrapper.id.replace('msg-wrap-', '');
                
                window.collabState.ctxMsgId = msgId;
                window.collabState.ctxMsgEl = msgEl;
                window.collabState.ctxIsMine = msgEl.classList.contains('mine');
                
                var deleteBothBtn = document.getElementById('btn-delete-both');
                if (deleteBothBtn) {
                    if (window.collabState.ctxIsMine || window.collabState.role === 'host') {
                        deleteBothBtn.style.display = 'flex';
                    } else {
                        deleteBothBtn.style.display = 'none';
                    }
                }
                
                var menu = document.getElementById('chat-context-menu');
                if (menu) {
                    menu.classList.remove('hidden');
                    menu.style.left = e.clientX + 'px';
                    menu.style.top = e.clientY + 'px';
                }
            });
        }
        
        document.addEventListener('mousedown', function(e) {
            var menu = document.getElementById('chat-context-menu');
            if (menu && !menu.classList.contains('hidden')) {
                if (!menu.contains(e.target)) {
                    menu.classList.add('hidden');
                }
            }
        });

        var chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('input', function() {
                chatInput.style.height = 'auto';
                chatInput.style.height = chatInput.scrollHeight + 'px';
            });
        }
    }, 1200);

    window.sendReaction = function(msgId, emoji) {
        var voter = window.collabState.myId;
        executeMsgReaction(msgId, emoji, voter, true);
        broadcast({
            type: 'react',
            msgId: msgId,
            emoji: emoji,
            senderId: voter
        });
        window.toggleEmojiPicker(false);
    };

    function executeMsgReaction(msgId, emoji, voterId, isLocal) {
        var box = document.getElementById('reactions-' + msgId);
        if(!box) return;
        
        var pill = box.querySelector('[data-emoji="' + emoji + '"]');
        if(!pill) {
            pill = document.createElement('div');
            pill.className = 'reaction-pill';
            pill.setAttribute('data-emoji', emoji);
            pill.innerHTML = '<span>' + emoji + '</span> <span class="count">0</span>';
            pill.onclick = function() { window.sendReaction(msgId, emoji); };
            box.appendChild(pill);
        }

        var countEl = pill.querySelector('.count');
        var currentCo = parseInt(countEl.innerText);
        
        if (isLocal) {
            pill.classList.toggle('voted');
            if (pill.classList.contains('voted')) {
                countEl.innerText = currentCo + 1;
            } else {
                countEl.innerText = Math.max(0, currentCo - 1);
                if (parseInt(countEl.innerText) === 0) pill.remove();
            }
        } else {
            countEl.innerText = currentCo + 1;
        }
    }

    // --- COOPERATIVE EMOJI PIKCER DRAG ---
    window.toggleEmojiPicker = function(show, targetMsgId) {
        var picker = document.getElementById('collab-emoji-picker');
        if(!picker) return;
        if(!show) {
            picker.classList.add('hidden');
            window.collabState.activeReactMsgId = null;
            return;
        }
        picker.classList.remove('hidden');
        window.collabState.activeReactMsgId = targetMsgId || null;
        window.switchEmojiCategory('smileys');
    };

    // Auto-close on clicking outside the emoji picker
    document.addEventListener('mousedown', function(e) {
        var picker = document.getElementById('collab-emoji-picker');
        if (picker && !picker.classList.contains('hidden')) {
            var triggerBtn = document.getElementById('emoji-trigger-btn');
            var isInsidePicker = picker.contains(e.target);
            var isInsideTrigger = triggerBtn && triggerBtn.contains(e.target);
            var isReactBtn = e.target.closest('.hover-act-btn');
            
            if (!isInsidePicker && !isInsideTrigger && !isReactBtn) {
                window.toggleEmojiPicker(false);
            }
        }
    });

    window.switchEmojiCategory = function(cat) {
        document.querySelectorAll('.picker-tab').forEach(function(t) { t.classList.remove('active'); });
        var el = document.querySelector('.picker-tab[onclick*="' + cat + '"]');
        if (el) el.classList.add('active');
        
        var grid = document.getElementById('emoji-grid');
        grid.innerHTML = '';
        
        var list = emojisMap[cat].split(' ');
        list.forEach(function(e) {
            var span = document.createElement('span');
            span.className = 'emoji-item';
            span.innerText = e;
            span.onclick = function() {
                if (window.collabState.activeReactMsgId) {
                    window.sendReaction(window.collabState.activeReactMsgId, e);
                } else {
                    var input = document.getElementById('chat-input');
                    input.value += e;
                    input.focus();
                }
                window.toggleEmojiPicker(false);
            };
            grid.appendChild(span);
        });
    };

    var emojiKeywords = {
        '😀': 'smile happy laugh grin', '😃': 'smile happy open mouth', '😄': 'smile happy smiling eyes', '😁': 'grin beaming smile',
        '😆': 'smile laugh squinting', '😅': 'sweat smile happy relief cold sweat', '😂': 'tears of joy laugh funny cry happy',
        '🤣': 'rolling laughing funny rotfl rofl', '😊': 'smiling eyes blushing happy smile warm', '😇': 'halo innocent angel blessed',
        '🙂': 'slightly smiling face', '🙃': 'upside down happy silly', '😉': 'wink blinking winking eye', '😌': 'relieved content calm peace',
        '😍': 'heart eyes love admire sparkle romantic', '🥰': 'smiling face with hearts love adoration warm', '😘': 'blow kiss wink kissing romantic',
        '😗': 'kissing face neutral', '😙': 'kissing smiling eyes', '😚': 'kissing closed eyes', '😋': 'yum delicious face tongue hungry',
        '😛': 'tongue out playful wink cheeky', '😝': 'squinting tongue out silly cheeky', '😜': 'winking tongue out playful cheeky',
        '🤪': 'zany face crazy wild silly', '🤨': 'raised eyebrow suspicious skeptical', '🧐': 'monocle smart thinking fancy scholar',
        '🤓': 'nerd geek smart bookworm scholar dork', '😎': 'cool sunglasses confident awesome stylish', '🤩': 'star struck amazed excited wow stellar',
        '🥳': 'partying blower hat celebration birthday party', '😏': 'smirking sly cheeky smug', '😒': 'unamused annoyed bored unimpressed disgruntled',
        '😞': 'disappointed sad downcast', '😔': 'pensive sad sorrow thoughtful', '😟': 'worried anxious concerned',
        '😕': 'confused puzzled unsure bewildered', '🙁': 'slightly frowning sad', '☹️': 'frowning sad upset unhappy',
        '😣': 'persevere struggle hurt pain', '😖': 'confounded frustrated annoyed', '😫': 'tired weary exhausted',
        '😩': 'weary crying upset complaining', '🥺': 'pleading begging eyes simp puppy', '😢': 'crying tear sad upset weep',
        '😭': 'loudly crying sobbing weeping sad distraught', '😤': 'steam triumph angry frustrated huff', '😠': 'angry mad annoyed irritated',
        '😡': 'pouting mad angry fuming enraged', '🤬': 'cursing swearing rage swearing angry', '🤯': 'exploding head mind blown shock amazed',
        '👍': 'thumbs up ok accept approve like yes good', '👎': 'thumbs down decline reject dislike no bad', '👌': 'okay hand signal perfect zero correct fine',
        '✌️': 'victory sign peace two finger', '🤞': 'fingers crossed luck hope wish', '🤟': 'love you gesture heart sign',
        '🤘': 'rock on heavy metal devil horns', '🤙': 'call me phone signal hand gesture', '👈': 'point left finger indicator direction',
        '👉': 'point right finger indicator direction', '👆': 'point up finger indicator direction top', '🖕': 'middle finger insult flip off rude',
        '👇': 'point down finger indicator direction bottom', '👏': 'clapping hands applause kudos celebrate well done', '🙌': 'raising hands high five celebration praise hooray',
        '👐': 'open hands warm welcome gesture', '🤲': 'palms together prayer request offer', '🤝': 'handshake agreement deal partner union trust',
        '🙏': 'folded hands pray thank you please respect', '✍️': 'writing hand pen signing note pencil sketch', '💅': 'nail polish cosmetics beauty manicure pamper',
        '🤳': 'selfie phone camera hand photo portrait', '💪': 'flexed biceps muscle power force strong gym physical athletic training',
        '❤️': 'red heart love passion affection romantic heart', '🧡': 'orange heart love support', '💛': 'yellow heart friendship support love',
        '💚': 'green heart envying support love', '💙': 'blue heart peace trust love', '💜': 'purple heart love support respect loyalty',
        '🖤': 'black heart dark sorrow abstract love', '🤍': 'white heart pure love clean', '🤎': 'brown heart chocolate warmth love',
        '💔': 'broken heart sadness grief breakup heartbreak', '❣️': 'heart exclamation mark warning love', '💕': 'two hearts love floating romance',
        '💞': 'revolving hearts love spinning affection', '💓': 'beating heart pulsing heart rate love excitement', '💗': 'growing heart expanding love',
        '💖': 'sparkling heart shiny love glamour', '💘': 'cupid heart with arrow love struck romance', '💝': 'heart with ribbon gift love box present',
        '💟': 'heart decoration stamp love sign', '☮️': 'peace sign antiwar', '✨': 'sparkles shiny clean new magic glowing glitter',
        '🔥': 'fire hot burn flame lit match expert peak sexy', '💥': 'explosion collision bang crash boom', '💯': 'one hundred percent perfect expert absolute score ace correct success top',
        '🌲': 'evergreen tree pine forest nature timber timber wood', '🌳': 'deciduous tree nature plant foliage', '🌴': 'palm tree tropical summer beach island vacation nature',
        '🌱': 'seedling sprout sprout growing start nature eco', '🍀': 'four leaf clover luck lucky green nature irish charm', '🌞': 'sun with face bright heat day warmth sunny',
        '⭐': 'star glowing gold yellow prize award win rating excellence rating', '🌈': 'rainbow colors colorful sky storm hope lgbt pride',
        '🐶': 'dog puppy pet canine friend bark', '🐱': 'cat kitten feline pet meow paws Purr', '🐭': 'mouse rodent pet squeak whiskers',
        '🐹': 'hamster rodent pet cute cage', '🐰': 'rabbit bunny pet long ears hop jump', '🦊': 'fox clever wild foxy sleek',
        '🐻': 'bear wild huge forest grizzly woolly', '🐼': 'panda cute white black giant bamboo', '🐨': 'koala cute australian eucalyptus marsupial',
        '🐯': 'tiger wild beast tiger stripes predator', '🐮': 'cow farm milking dairy beef horn', '🦁': 'lion wild king beast prey predator roar',
        '🐗': 'boar wild pig hog tusk bristly', '🦖': 't-rex dinosaur prehistoric tyrant tyrannosaurus fossil carnivore', '🐲': 'dragon face mythical fantasy green beast monster fire',
        '🍏': 'green apple fruit sour crisp healthy', '🍎': 'red apple fruit sweet nutritious crispy', '🍊': 'tangerine orange fruit citrus juicy sweet',
        '🍋': 'lemon sour citrus yellow bright acid', '🍌': 'banana yellow fruit sweet potassium potassium peel', '🍉': 'watermelon summer red fruit green striped slice juicy seed',
        '🍇': 'grapes sweet wine fruit vine bunch', '🍓': 'strawberry sweet red berry fruit seed', '🍈': 'melon honeydew sweet fruit slice cantaloupe',
        '🍒': 'cherries sweet red fruit stem pair', '🍑': 'peach fuzzy delicious orange fruit sweet plump skin', '🍍': 'pineapple sweet spike tropical golden crown yellow juice',
        '🥥': 'coconut brown shell coco white water milk tropical palm', '🥝': 'kiwi fuzzy green slice brown exotic sweet juicy juice', '🥑': 'avocado green toast healthy pear creamy pit guacamole seed vegetable',
        '🍕': 'pizza slice cheese pepperoni crust fast food dinner restaurant tasty bake', '🍔': 'hamburger beef burger cheese bun sesame fast food grill diner', '🍟': 'fries french fries fast food crisp potato salt ketchup packet',
        '🌭': 'hotdog sausage bun ketchup mustard snack game day street vendor grill', '🥪': 'sandwich bread lunch toast deli ham cheese healthy picnic', '🍰': 'shortcake slice cake pastry strawberry cream sweet dessert bakery candle birthday celebration',
        '🎂': 'birthday cake party celebration pastry slice sweet frosting candles', '🍩': 'donut delicious ring glaze sprinkle chocolate sweet pastry snack coffee', '🍪': 'cookie chocolate chip baked biscuit snack sweet milk cookie monster bakery',
        '☕': 'coffee hot tea cup mug caffeine morning breakfast brew', '🍺': 'beer draft glass pint foam alcohol bar drink brew tavern salute toast cheers', '⚠️': 'warning caution alert safety hazard sign triangle exclamation',
        '🚫': 'forbidden prohibited not allowed stop no entry red circle banner bar', '⬆️': 'up arrow direction scroll top high', '➡️': 'right arrow direction forward prompt next',
        '⬇️': 'down arrow direction bottom scroll low', '⬅️': 'left arrow direction back previous leftward', '🔄': 'refresh rotate reload swap sync update cycle spinner loops',
        '🔴': 'red circle dot mark game stop status active recording', '🔵': 'blue circle dot mark status waiting bluebird', '⚫': 'black circle dot mark void neutral',
        '⚪': 'white circle dot mark blank neutral', '⬛': 'black large square tile block border', '⬜': 'white large square tile block border',
        '✅': 'checked green tick checkmark correct confirm pass success done approved agree verified', '❌': 'cross red cross mark wrong incorrect close delete cancel multiply remove reject',
        '❓': 'question mark help unknown doubt wonder request unsure query', '📢': 'megaphone speaker announce shout broadcast system alert attention public', '🔔': 'bell ring alert reminder notification chime sound tone'
    };

    window.filterEmojis = function() {
        var q = document.getElementById('emoji-search').value.toLowerCase().trim();
        var grid = document.getElementById('emoji-grid');
        grid.innerHTML = '';
        
        var found = [];
        if (!q) {
            // If empty, default to smileys
            found = emojisMap.smileys.split(' ');
        } else {
            // Find emojis whose description or keys match the search query
            Object.keys(emojiKeywords).forEach(function(emoji) {
                var keywords = emojiKeywords[emoji];
                if (keywords.includes(q)) {
                    found.push(emoji);
                }
            });
            
            // Fallback match: check other lists too
            if (found.length === 0) {
                Object.values(emojisMap).forEach(function(v) {
                    v.split(' ').forEach(function(em) {
                        if (em && em.includes(q)) {
                            found.push(em);
                        }
                    });
                });
            }
        }

        // Display results limit up to 50
        found.slice(0, 50).forEach(function(e) {
            var span = document.createElement('span');
            span.className = 'emoji-item';
            span.innerText = e;
            span.onclick = function() {
                if (window.collabState.activeReactMsgId) {
                    window.sendReaction(window.collabState.activeReactMsgId, e);
                } else {
                    var input = document.getElementById('chat-input');
                    input.value += e;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.focus();
                }
                window.toggleEmojiPicker(false);
            };
            grid.appendChild(span);
        });
    };

    // --- MICROPHONE VOICE RECORDER ---
    window.startVoiceRecord = async function() {
        if(window.collabState.chatMuteEnabled && window.collabState.role !== 'host') return;
        try {
            var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            window.collabState.recordedChunks = [];
            
            var recorder = new MediaRecorder(stream);
            window.collabState.voiceRecorder = recorder;
            
            recorder.ondataavailable = function(e) {
                if (e.data.size > 0) window.collabState.recordedChunks.push(e.data);
            };
            
            recorder.onstop = function() {
                stream.getTracks().forEach(function(t) { t.stop(); });
            };

            recorder.start();
            
            window.collabState.recordSeconds = 0;
            document.getElementById('record-timer').innerText = '00:00';
            document.getElementById('chat-record-preview').classList.remove('hidden');
            
            window.collabState.recordTimerInterval = setInterval(function() {
                window.collabState.recordSeconds++;
                var min = String(Math.floor(window.collabState.recordSeconds / 60)).padStart(2, '0');
                var sec = String(window.collabState.recordSeconds % 60).padStart(2, '0');
                document.getElementById('record-timer').innerText = min + ':' + sec;
            }, 1000);

        } catch (err) {
            alert("Could not access microphone: " + err.message);
        }
    };

    window.cancelVoiceRecord = function() {
        clearInterval(window.collabState.recordTimerInterval);
        if(window.collabState.voiceRecorder && window.collabState.voiceRecorder.state !== 'inactive') {
            window.collabState.voiceRecorder.stop();
        }
        document.getElementById('chat-record-preview').classList.add('hidden');
    };

    window.stopAndSendVoiceRecord = function() {
        if (!window.collabState.voiceRecorder) return;
        clearInterval(window.collabState.recordTimerInterval);
        
        window.collabState.voiceRecorder.onstop = function() {
            var blob = new Blob(window.collabState.recordedChunks, { type: 'audio/webm' });
            var reader = new FileReader();
            reader.onloadend = function() {
                var base64 = reader.result;
                var duration = window.collabState.recordSeconds;
                var msgData = {
                    msgId: 'msg-' + generateId(),
                    replyTo: window.collabState.replyingTo
                };
                addChatVoiceMessage('Me', base64, duration, true, msgData);
                broadcast(Object.assign({
                    type: 'voice',
                    name: window.collabState.myName,
                    filedata: base64,
                    duration: duration
                }, msgData));
                window.cancelReply();
                
                // Unlock voice_note Badge!
                window.unlockBadge('voice_note', 'Audio Guru', 'Sent a dynamic custom voice message.');
            };
            reader.readAsDataURL(blob);
        };
        
        window.collabState.voiceRecorder.stop();
        document.getElementById('chat-record-preview').classList.add('hidden');
    };

    function addChatVoiceMessage(sender, dataUrl, duration, isMine, msgMetadata) {
        var log = document.getElementById('chat-log');
        var cls = isMine ? 'mine' : 'theirs';
        var msgId = msgMetadata?.msgId || 'msg-' + generateId();
        
        var wrap = document.createElement('div');
        wrap.className = 'chat-msg-wrapper';
        wrap.id = 'msg-wrap-' + msgId;
        
        var playerUniqueId = 'voice-player-' + msgId;
        var senderHeader = !isMine ? '<div class="chat-sender">' + sender + '</div>' : '';

        wrap.innerHTML = '<div class="chat-msg ' + cls + '" style="align-self:' + (isMine?'flex-end':'flex-start') + ';"><div class="msg-actions-hover"><button class="hover-act-btn" onclick="window.setReplyTarget(\\'' + msgId + '\\', \\'' + sender + '\\', \\'Voice message (' + duration + 's)\\')"><i class="fas fa-reply"></i></button><button class="hover-act-btn" onclick="window.toggleEmojiPicker(true, \\'' + msgId + '\\')"><i class="far fa-smile"></i></button></div>' + senderHeader + '<div style="font-size:11px; font-weight:700; margin-bottom:2px;"><i class="fas fa-volume-up"></i> Voice Note (' + duration + 's)</div><div class="voice-bubble-player"><button class="voice-play-btn" onclick="window.toggleVoicePlay(\\'' + playerUniqueId + '\\')" id="btn-' + playerUniqueId + '"><i class="fas fa-play"></i></button><input type="range" class="voice-progress-range" id="progress-' + playerUniqueId + '" value="0" min="0" max="100" oninput="window.setVoiceProgress(\\'' + playerUniqueId + '\\', this.value)"><span class="voice-playback-speed" onclick="window.toggleVoiceSpeed(\\'' + playerUniqueId + '\\')" id="speed-' + playerUniqueId + '">1.0x</span></div><audio id="' + playerUniqueId + '" src="' + dataUrl + '" style="display:none;" ontimeupdate="window.updateVoiceDurationUI(\\'' + playerUniqueId + '\\')" onended="window.resetVoicePlayerUI(\\'' + playerUniqueId + '\\')"></audio><div class="message-reactions" id="reactions-' + msgId + '"></div></div>';
        log.appendChild(wrap);
        log.scrollTop = log.scrollHeight;
    }

    window.toggleVoicePlay = function(playerId) {
        var aud = document.getElementById(playerId);
        var btn = document.getElementById('btn-' + playerId);
        if(!aud || !btn) return;

        if (window.collabState.activeAudioElement && window.collabState.activeAudioElement !== aud) {
            window.collabState.activeAudioElement.pause();
            var prevId = window.collabState.activeAudioElement.id;
            var prevBtn = document.getElementById('btn-' + prevId);
            if(prevBtn) prevBtn.innerHTML = '<i class="fas fa-play"></i>';
        }

        if (aud.paused) {
            aud.play();
            btn.innerHTML = '<i class="fas fa-pause"></i>';
            window.collabState.activeAudioElement = aud;
        } else {
            aud.pause();
            btn.innerHTML = '<i class="fas fa-play"></i>';
        }
    };

    window.updateVoiceDurationUI = function(playerId) {
        var aud = document.getElementById(playerId);
        var range = document.getElementById('progress-' + playerId);
        if(aud && range && aud.duration) {
            range.value = (aud.currentTime / aud.duration) * 100;
        }
    };

    window.setVoiceProgress = function(playerId, val) {
         var aud = document.getElementById(playerId);
         if(aud && aud.duration) {
             aud.currentTime = (val / 100) * aud.duration;
         }
    };

    window.toggleVoiceSpeed = function(playerId) {
        var aud = document.getElementById(playerId);
        var sp = document.getElementById('speed-' + playerId);
        if(!aud || !sp) return;
        
        var newRate = 1.0;
        if(aud.playbackRate === 1.0) {
            newRate = 1.5;
        } else if (aud.playbackRate === 1.5) {
            newRate = 2.0;
        } else {
            newRate = 1.0;
        }
        aud.playbackRate = newRate;
        sp.innerText = newRate + 'x';
    };

    window.resetVoicePlayerUI = function(playerId) {
        var btn = document.getElementById('btn-' + playerId);
        var range = document.getElementById('progress-' + playerId);
        if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
        if(range) range.value = 0;
    };

    window.sendFile = function(input) {
        var file = input.files[0];
        if(!file) return;
        if(file.size > 2 * 1024 * 1024) return alert("File too large (>2MB) for WebRTC channels.");

        var reader = new FileReader();
        reader.onload = function(e) {
            var data = e.target.result;
            var msgData = {
                msgId: 'msg-' + generateId(),
                replyTo: window.collabState.replyingTo
            };
            addChatFile('Me', file.name, data, file.type, true, msgData);
            broadcast(Object.assign({ 
                type:'file', 
                name: window.collabState.myName, 
                filename: file.name, 
                filedata: data, 
                filetype: file.type
            }, msgData));
            window.cancelReply();
        };
        reader.readAsDataURL(file);
    };

    function addChatFile(sender, filename, data, type, isMine, msgMetadata) {
        var log = document.getElementById('chat-log');
        var cls = isMine ? 'mine' : 'theirs';
        var msgId = msgMetadata?.msgId || 'msg-' + generateId();
        
        var wrap = document.createElement('div');
        wrap.className = 'chat-msg-wrapper';
        wrap.id = 'msg-wrap-' + msgId;
        
        var mediaHtml = '';
        if(type.startsWith('image/')) {
            mediaHtml = '<img src="' + data + '" class="chat-img" />';
        } else if (type.startsWith('audio/')) {
            mediaHtml = '<audio src="' + data + '" controls style="width:100px; height:24px; margin-top:4px;"></audio>';
        }
        
        var senderHeader = !isMine ? '<div class="chat-sender">' + sender + '</div>' : '';

        wrap.innerHTML = '<div class="chat-msg ' + cls + '" style="align-self:' + (isMine?'flex-end':'flex-start') + ';"><div class="msg-actions-hover"><button class="hover-act-btn" onclick="window.setReplyTarget(\\'' + msgId + '\\', \\'' + sender + '\\', \\'File: ' + filename + '\\')"><i class="fas fa-reply"></i></button><button class="hover-act-btn" onclick="window.toggleEmojiPicker(true, \\'' + msgId + '\\')"><i class="far fa-smile"></i></button></div>' + senderHeader + '<div class="chat-file"><i class="fas fa-file-alt"></i><a href="' + data + '" download="' + filename + '" style="color:inherit;text-decoration:none;font-weight:700;">' + filename + '</a></div>' + mediaHtml + '<div class="message-reactions" id="reactions-' + msgId + '"></div></div>';
        log.appendChild(wrap);
        log.scrollTop = log.scrollHeight;
    }


    // --- DEEP INTERACTION REAL COLLABORATION ---
    function getUniqueSelector(el) {
        if (!el) return null;
        if (el.id) return '#' + el.id;
        
        var path = [];
        while (el && el.nodeType === Node.ELEMENT_NODE) {
            var selector = el.nodeName.toLowerCase();
            if (el.className) {
                var classes = Array.from(el.classList).filter(function(c) {
                    return !c.includes('active') && !c.includes('hover') && !c.includes('focus') && !c.includes('open') && !c.includes('collab-');
                });
                if (classes.length > 0) {
                    selector += '.' + classes.slice(0, 2).join('.');
                }
            }
            var sibIndex = 0;
            var sibCount = 0;
            var siblings = el.parentNode ? el.parentNode.childNodes : [];
            for (var i = 0; i < siblings.length; i++) {
                var s = siblings[i];
                if (s.nodeType === Node.ELEMENT_NODE && s.nodeName === el.nodeName) {
                    if (s === el) {
                        sibIndex = sibCount;
                    }
                    sibCount++;
                }
            }
            if (sibCount > 1) {
                selector += ':nth-of-type(' + (sibIndex + 1) + ')';
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(' > ');
    }

    document.addEventListener('click', function(e) {
        if (window.collabState.isRemoteChange) return;
        
        if (window.collabState.role === 'learner' && window.collabState.interactMode === 'tutor') {
            return;
        }
        if (window.collabState.interactMode === 'none') return;

        var target = e.target.closest('details, summary, button, input, select, textarea, a, .accordion-header, [role="button"], .tab-btn');
        if (!target) return;

        if (target.closest('#collab-panel') || target.closest('#collab-master-widget')) return;

        var selector = getUniqueSelector(target);
        if (!selector) return;

        var detailsOpen = null;
        if (target.tagName === 'SUMMARY' && target.parentNode?.tagName === 'DETAILS') {
            detailsOpen = !target.parentNode.open;
        }

        broadcast({
            type: 'dom_interact',
            action: 'click',
            selector: selector,
            detailsOpen: detailsOpen
        });
    }, true);

    document.addEventListener('change', function(e) {
        if (window.collabState.isRemoteChange) return;
        if (window.collabState.role === 'learner' && window.collabState.interactMode === 'tutor') return;
        if (window.collabState.interactMode === 'none') return;

        var target = e.target;
        if (target.closest('#collab-panel') || target.closest('#collab-master-widget')) return;

        var selector = getUniqueSelector(target);
        if (!selector) return;

        broadcast({
            type: 'dom_interact',
            action: 'input',
            selector: selector,
            value: target.value,
            checked: target.checked
        });
    }, true);

    function executeDomInteraction(data) {
        window.collabState.isRemoteChange = true;
        try {
            var target = document.querySelector(data.selector);
            if (target) {
                if (data.action === 'click') {
                    if (data.detailsOpen !== null && target.parentNode?.tagName === 'DETAILS') {
                        target.parentNode.open = data.detailsOpen;
                    } else {
                        target.click();
                    }
                } else if (data.action === 'input') {
                    if (target.type === 'checkbox' || target.type === 'radio') {
                        target.checked = data.checked;
                    } else {
                        target.value = data.value;
                    }
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        } catch (e) {
            console.warn("Deep sync DOM err:", e);
        }
        setTimeout(function() { window.collabState.isRemoteChange = false; }, 250);
    }

    // --- LESSON SECTION / ACCORDION STATE SYNC ---
    window.captureLessonState = function() {
        var state = {
            scrollPct: 0,
            openDetails: [],
            openAccordions: [],
            mediaStates: []
        };

        // 1. Scroll position
        var max = document.body.scrollHeight - window.innerHeight;
        if (max > 0) state.scrollPct = window.scrollY / max;

        // 2. Native <details> elements
        document.querySelectorAll('details').forEach(function(d) {
            if (d.open) {
                var sel = getUniqueSelector(d);
                if (sel) state.openDetails.push(sel);
            }
        });

        // 3. Custom accordions (elements with .accordion, .accordion-section, [data-accordion], .lesson-section, .collapsible)
        document.querySelectorAll('.accordion.open, .accordion-section.open, .lesson-section.open, .collapsible.open, [data-accordion].open, .section-card.open, [data-expanded="true"]').forEach(function(el) {
            var sel = getUniqueSelector(el);
            if (sel) state.openAccordions.push(sel);
        });

        // 4. Active lesson tab/section indicators
        document.querySelectorAll('[data-section].active, .section-tab.active, .lesson-tab.active').forEach(function(el) {
            var sel = getUniqueSelector(el);
            if (sel) state.openAccordions.push(sel);
        });

        return state;
    };

    window.restoreLessonState = function(state) {
        if (!state) return;
        window.collabState.isRemoteChange = true;

        try {
            // Restore scroll
            if (state.scrollPct > 0) {
                var target = state.scrollPct * (document.body.scrollHeight - window.innerHeight);
                window.scrollTo({ top: target, behavior: 'smooth' });
            }

            // Restore native <details>
            state.openDetails.forEach(function(sel) {
                try {
                    var el = document.querySelector(sel);
                    if (el && el.tagName === 'DETAILS') el.open = true;
                } catch(e) {}
            });

            // Restore custom accordions
            state.openAccordions.forEach(function(sel) {
                try {
                    var el = document.querySelector(sel);
                    if (el) {
                        el.classList.add('open');
                        el.setAttribute('data-expanded', 'true');
                        var content = el.querySelector('.accordion-content, .section-content, .collapse-content');
                        if (content) {
                            content.style.display = 'block';
                            content.style.maxHeight = content.scrollHeight + 'px';
                        }
                        // Try clicking the accordion header to toggle it
                        var header = el.querySelector('.accordion-header, .section-header, .collapse-header, summary');
                        if (header && el.tagName !== 'DETAILS') {
                            el.classList.add('active');
                        }
                    }
                } catch(e) {}
            });
        } catch(e) {
            console.warn('Error restoring lesson state:', e);
        }

        setTimeout(function() { window.collabState.isRemoteChange = false; }, 500);
    };

    window.broadcastCurrentLessonState = function() {
        if (window.collabState.role !== 'host') return;
        var state = window.captureLessonState();
        broadcast({ type: 'sync_state', state: state });
    };

    function executeAccordionSync(data) {
        window.collabState.isRemoteChange = true;
        try {
            var target = document.querySelector(data.selector);
            if (target) {
                if (data.open) {
                    target.classList.add('open');
                    target.setAttribute('data-expanded', 'true');
                    if (data.detailsOpen !== null && target.tagName === 'DETAILS') {
                        target.open = data.detailsOpen;
                    }
                    var content = target.querySelector('.accordion-content, .section-content, .collapse-content, .card-content');
                    if (content) {
                        content.style.display = 'block';
                        content.style.maxHeight = content.scrollHeight + 'px';
                    }
                } else {
                    target.classList.remove('open');
                    target.removeAttribute('data-expanded');
                    if (target.tagName === 'DETAILS') {
                        target.open = false;
                    }
                    var content = target.querySelector('.accordion-content, .section-content, .collapse-content, .card-content');
                    if (content) {
                        content.style.display = 'none';
                        content.style.maxHeight = '0';
                    }
                }
            }
        } catch(e) {
            console.warn('Accordion sync error:', e);
        }
        setTimeout(function() { window.collabState.isRemoteChange = false; }, 250);
    }

    // Watch for accordion toggles to sync them
    document.addEventListener('click', function(e) {
        if (window.collabState.isRemoteChange) return;
        if (window.collabState.role === 'learner' && window.collabState.interactMode === 'tutor') return;
        if (window.collabState.interactMode === 'none') return;

        var accordionEl = e.target.closest('.accordion-header, .section-header, .collapse-header, .accordion > summary, .lesson-section > summary, .card-header');
        if (!accordionEl) return;
        if (accordionEl.closest('#collab-panel') || accordionEl.closest('#collab-master-widget')) return;

        var parentSection = accordionEl.closest('.accordion, .accordion-section, .lesson-section, .collapsible, [data-accordion], .section-card');
        if (!parentSection) return;

        var isNowOpen = !parentSection.classList.contains('open');
        var sel = getUniqueSelector(parentSection);
        if (!sel) return;

        broadcast({
            type: 'accordion_toggle',
            selector: sel,
            open: isNowOpen,
            detailsOpen: parentSection.tagName === 'DETAILS' ? isNowOpen : null
        });
    }, true);

    // --- COOPERATIVE MEDIA SYNCHRONIZER ---
    window.scanActivePageMediaElements = function() {
        var scanBox = document.getElementById('lesson-media-scanner');
        if(!scanBox) return;

        var mediaEls = Array.from(document.querySelectorAll('audio, video')).filter(function(el) {
            return !el.closest('#collab-panel');
        });
        
        if (mediaEls.length === 0) {
            scanBox.innerHTML = '<div style="font-size:11px; color:#64748b; font-style:italic; padding-top:10px; border-top:1px solid #e2e8f0; margin-top:10px;">No media tracks found currently in active English lesson document.</div>';
            return;
        }

        var innerGrid = '<div style="font-size:11px; font-weight:700; color:#475569; margin-top:12px; border-top:1px solid #e2e8f0; padding-top:8px;"><i class="fas fa-play-circle text-indigo-500"></i> Local Lesson Media Files Synchronizer</div><div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">';

        mediaEls.forEach(function(m, idx) {
            var src = m.src || m.querySelector('source')?.src || 'Audio Track ' + (idx + 1);
            var name = src.substring(src.lastIndexOf('/') + 1) || 'Media Piece';
            var selector = getUniqueSelector(m);
            var isPlaying = !m.paused;

            innerGrid += '<div style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px;"><span style="font-size:11px; font-weight:bold; color: #1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">' + name + '</span><div style="display:flex; gap:4px;"><button class="collab-btn primary" style="width:auto; padding:4px 8px; font-size:10px; margin:0;" onclick="window.triggerMediaSyncState(\\'' + selector + '\\', \\'' + (isPlaying ? 'pause':'play') + '\\')"><i class="fas ' + (isPlaying ? 'fa-pause' : 'fa-play') + '"></i> ' + (isPlaying ? 'Hold' : 'Play') + '</button><button class="collab-btn secondary" style="width:auto; padding:4px 8px; font-size:10px; margin:0;" onclick="window.triggerMediaSyncState(\\'' + selector + '\\', \\'seek\\')">Sync currentTime</button></div></div>';
        });
        innerGrid += '</div>';
        scanBox.innerHTML = innerGrid;
    };

    window.triggerMediaSyncState = function(selector, action) {
        var el = document.querySelector(selector);
        if(!el) return;

        if (action === 'play') {
            el.play();
        } else if (action === 'pause') {
            el.pause();
        }

        broadcast({
            type: 'media_sync',
            selector: selector,
            action: action,
            time: el.currentTime
        });
        
        setTimeout(window.scanActivePageMediaElements, 300);
    };

    document.addEventListener('play', function(e) {
        if (window.collabState.isRemoteChange) return;
        var selector = getUniqueSelector(e.target);
        if (!selector || e.target.closest('#collab-panel')) return;
        
        broadcast({
            type: 'media_sync',
            selector: selector,
            action: 'play',
            time: e.target.currentTime
        });
    }, true);

    document.addEventListener('pause', function(e) {
        if (window.collabState.isRemoteChange) return;
        var selector = getUniqueSelector(e.target);
        if (!selector || e.target.closest('#collab-panel')) return;
        
        broadcast({
            type: 'media_sync',
            selector: selector,
            action: 'pause',
            time: e.target.currentTime
        });
    }, true);

    function executeMediaControlSync(data) {
        window.collabState.isRemoteChange = true;
        try {
            var target = document.querySelector(data.selector);
            if(target) {
                if (data.action === 'play') {
                    target.currentTime = data.time;
                    target.play().catch(function() {});
                } else if (data.action === 'pause') {
                    target.pause();
                } else if (data.action === 'seek') {
                    target.currentTime = data.time;
                }
            }
        } catch(err) {}
        setTimeout(function() { window.collabState.isRemoteChange = false; }, 200);
    }

    window.loadCustomMediaUrl = function() {
        var input = document.getElementById('media-url-input');
        var url = input.value.trim();
        if(!url) return alert("Please enter a direct resource play link first.");

        var isAudio = url.toLowerCase().includes('.mp3') || url.toLowerCase().includes('audiotype=audio') || url.toLowerCase().includes('audio');
        
        document.getElementById('media-empty').style.display = 'none';
        var container = document.getElementById('media-container');

        var wrap = document.createElement('div');
        wrap.className = 'stream-wrapper';
        var uniqueMediaId = 'dynamic-shared-' + generateId();
        
        var mediaTag;
        if(isAudio) {
            wrap.innerHTML = '<span class="stream-label">Shared Audio Link</span>';
            mediaTag = document.createElement('audio');
            mediaTag.controls = true;
        } else {
            wrap.innerHTML = '<span class="stream-label">Shared Video Link</span>';
            mediaTag = document.createElement('video');
            mediaTag.controls = true;
        }

        mediaTag.src = url;
        mediaTag.id = uniqueMediaId;
        wrap.appendChild(mediaTag);
        container.appendChild(wrap);
        input.value = '';

        broadcast({
            type: 'loaded_media_url',
            url: url,
            isAudio: isAudio,
            mediaId: uniqueMediaId
        });

        setTimeout(window.scanActivePageMediaElements, 500);
    };

    window.loadPcMediaFile = function(input) {
        var file = input.files[0];
        if(!file) return;

        var objectUrl = URL.createObjectURL(file);
        
        document.getElementById('media-empty').style.display = 'none';
        var container = document.getElementById('media-container');

        var wrap = document.createElement('div');
        wrap.className = 'stream-wrapper';
        var uniqueMediaId = 'dynamic-shared-' + generateId();
        
        var isAudio = file.type.startsWith('audio');
        var mediaTag;
        if(isAudio) {
            wrap.innerHTML = '<span class="stream-label">Local PC Audio: ' + file.name + '</span>';
            mediaTag = document.createElement('audio');
            mediaTag.controls = true;
        } else {
            wrap.innerHTML = '<span class="stream-label">Local PC Video: ' + file.name + '</span>';
            mediaTag = document.createElement('video');
            mediaTag.controls = true;
        }

        mediaTag.src = objectUrl;
        mediaTag.id = uniqueMediaId;
        wrap.appendChild(mediaTag);
        container.appendChild(wrap);
        
        broadcast({
            type: 'loaded_media_info',
            filename: file.name,
            filetype: file.type,
            mediaId: uniqueMediaId
        });

        setTimeout(window.scanActivePageMediaElements, 500);
    };

    window.startTutorPoll = function() {
        var ques = document.getElementById('poll-question').value.trim();
        var opt1 = document.getElementById('poll-opt1').value.trim();
        var opt2 = document.getElementById('poll-opt2').value.trim();
        if(!ques || !opt1 || !opt2) return alert("Please specify question and two options.");

        var pollData = {
            id: 'poll-' + generateId(),
            question: ques,
            answers: { A: opt1, B: opt2 },
            votes: { A: [], B: [] }
        };
        
        window.collabState.activePoll = pollData;
        
        broadcast({
            type: 'poll_launch',
            poll: pollData
        });
        
        renderActivePoll(pollData);
        sysMsg("Launched interactive quiz: " + ques);
        
        document.getElementById('poll-question').value = '';
        document.getElementById('poll-opt1').value = '';
        document.getElementById('poll-opt2').value = '';
    };

    window.votePoll = function(option) {
        var poll = window.collabState.activePoll;
        if(!poll) return;

        var voter = window.collabState.myId;
        if(poll.votes.A.includes(voter) || poll.votes.B.includes(voter)) {
            return alert("You have already answered this checkpoint question!");
        }

        poll.votes[option].push(voter);
        
        window.changeXP(15);
        window.unlockBadge('quiz_answer', 'Quiz Taker', 'Participated in a live session checkpoint.');

        broadcast({
            type: 'poll_vote',
            pollId: poll.id,
            option: option,
            voter: voter
        });

        renderActivePoll(poll);
    };

    function renderActivePoll(poll) {
        var box = document.getElementById('active-poll-container');
        if(!box) return;

        var total = poll.votes.A.length + poll.votes.B.length;
        var pctA = total > 0 ? Math.round((poll.votes.A.length / total) * 100) : 0;
        var pctB = total > 0 ? Math.round((poll.votes.B.length / total) * 100) : 0;

        var myVote = poll.votes.A.includes(window.collabState.myId) || poll.votes.B.includes(window.collabState.myId);

        var html = '<div style="background:var(--collab-bg-control-row); border:1.5px solid var(--collab-border-color); padding:14px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);"><div style="font-weight:850; font-size:12.5px; color:var(--collab-text-primary); margin-bottom:10px;"><i class="fas fa-question-circle text-indigo-500 mr-2"></i>' + poll.question + '</div>';

        if(myVote) {
            html += '<div style="display:flex; flex-direction:column; gap:8px;"><div style="font-size:11.5px; font-weight:700; color:var(--collab-text-secondary);">' + poll.answers.A + ' (' + pctA + '%)</div><div style="background:var(--collab-border-color); height:7px; border-radius:4px; overflow:hidden;"><div style="background:#4f46e5; width:' + pctA + '%; height:100%;"></div></div><div style="font-size:11.5px; font-weight:700; color:var(--collab-text-secondary);">' + poll.answers.B + ' (' + pctB + '%)</div><div style="background:var(--collab-border-color); height:7px; border-radius:4px; overflow:hidden;"><div style="background:#4f46e5; width:' + pctB + '%; height:100%;"></div></div><div style="font-size:10px; color:var(--collab-text-secondary); margin-top:10px; text-align:center; font-weight:600;">Total answers: ' + total + '</div></div>';
        } else {
            html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"><button class="collab-btn secondary" style="margin:0; font-size:11.5px; padding:8px 12px; font-weight:700;" onclick="window.votePoll(\\\'A\\\')">' + poll.answers.A + '</button><button class="collab-btn secondary" style="margin:0; font-size:11.5px; padding:8px 12px; font-weight:700;" onclick="window.votePoll(\\\'B\\\')">' + poll.answers.B + '</button></div>';
        }

        html += '</div>';
        box.innerHTML = html;
    }


    // --- BOARD DRAWING ---
    function initCanvas() {
        var cvs = document.getElementById('collab-board');
        if(!cvs || window.collabState.canvasCtx) return;
        cvs.width = window.innerWidth;
        cvs.height = window.innerHeight;
        window.collabState.canvasCtx = cvs.getContext('2d');
        
        window.addEventListener('resize', function() {
            cvs.width = window.innerWidth;
            cvs.height = window.innerHeight;
        });

        cvs.addEventListener('mousedown', startDraw);
        cvs.addEventListener('mousemove', doDraw);
        cvs.addEventListener('mouseup', endDraw);
        
        cvs.addEventListener('touchstart', function(e) { var t = e.touches[0]; cvs.dispatchEvent(new MouseEvent('mousedown', {clientX: t.clientX, clientY: t.clientY})); });
        cvs.addEventListener('touchmove', function(e) { e.preventDefault(); var t = e.touches[0]; cvs.dispatchEvent(new MouseEvent('mousemove', {clientX: t.clientX, clientY: t.clientY})); });
        cvs.addEventListener('touchend', function(e) { cvs.dispatchEvent(new MouseEvent('mouseup')); });
    }

    window.collabState.mouseThrottler = null;
    window.addEventListener('mousemove', function(e) {
        if(window.collabState.mouseThrottler) return;
        window.collabState.mouseThrottler = setTimeout(function() {
            broadcast({ type:'cursor', x: e.clientX/window.innerWidth, y: e.clientY/window.innerHeight });
            window.collabState.mouseThrottler = null;
        }, 50);
    });

    window.setDrawTool = function(tool) {
        window.collabState.tool = tool;
        document.querySelectorAll('.tool-btn').forEach(function(b) { b.classList.remove('active'); });
        var btn = document.querySelector('.tool-btn[onclick*="setDrawTool(\\'' + tool + '\\')"]');
        if (btn) btn.classList.add('active');
        
        var cvs = document.getElementById('collab-board');
        cvs.style.pointerEvents = tool === 'pointer' ? 'none' : 'auto';

        if(tool === 'laser') {
            window.collabState.color = '#ff0055';
            window.collabState.size = 5;
        }
    };

    window.clearSharedBoard = function() {
        window.collabState.canvasCtx.clearRect(0,0,window.innerWidth, window.innerHeight);
        broadcast({ type:'clear' });
    };

    function startDraw(e) {
        if(window.collabState.drawingMuteEnabled && window.collabState.role !== 'host') return;
        window.collabState.drawing = true;
        window.collabState.lastPosition = {x: e.clientX, y: e.clientY};
    }
    function doDraw(e) {
        if(!window.collabState.drawing || (window.collabState.drawingMuteEnabled && window.collabState.role !== 'host')) return;
        
        // Unlock board scribbler achievement
        window.unlockBadge('board_scribble', 'Board Scribbler', 'Left your markup on the session board.');

        var x = e.clientX, y = e.clientY;
        var msg = {
            type:'draw', 
            tool: window.collabState.tool, 
            c: window.collabState.color, 
            s: window.collabState.size,
            x0: window.collabState.lastPosition.x / window.innerWidth,
            y0: window.collabState.lastPosition.y / window.innerHeight,
            x1: x / window.innerWidth,
            y1: y / window.innerHeight
        };
        executeDraw(msg);
        broadcast(msg);
        window.collabState.lastPosition = {x: x, y: y};
    }
    function endDraw() { window.collabState.drawing = false; }

    function executeDraw(data) {
        var ctx = window.collabState.canvasCtx;
        var w = window.innerWidth, h = window.innerHeight;
        if(!ctx) return;
        
        ctx.beginPath();
        ctx.moveTo(data.x0 * w, data.y0 * h);
        ctx.lineTo(data.x1 * w, data.y1 * h);
        
        if (data.tool === 'laser') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = data.s;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ef4444';
        } else if (data.tool === 'eraser') {
            ctx.strokeStyle = '#000';
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = data.s * 3;
            ctx.shadowBlur = 0;
        } else {
            ctx.strokeStyle = data.c;
            ctx.lineWidth = data.s;
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
        }
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        if(data.tool === 'disappearing' || data.tool === 'laser') {
            setTimeout(function() {
                ctx.beginPath();
                ctx.moveTo(data.x0 * w, data.y0 * h);
                ctx.lineTo(data.x1 * w, data.y1 * h);
                ctx.strokeStyle = '#000';
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = data.s + 2;
                ctx.shadowBlur = 0;
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
            }, 2000);
        }
    }

    function updateCursor(id, xPct, yPct) {
        var wrp = document.getElementById('cursor-wrapper-'+id);
        var user = window.collabState.users[id];
        if(!user) return;
        if(!wrp) {
            wrp = document.createElement('div');
            wrp.id = 'cursor-wrapper-'+id;
            wrp.className = 'remote-cursor';
            wrp.innerHTML = '<div class="cursor-arrow" style="border-bottom-color:' + user.color + '"></div><div class="cursor-label" style="background:' + user.color + '">' + user.name + '</div>';
            document.getElementById('collab-cursors').appendChild(wrp);
        }
        wrp.style.transform = 'translate(' + (xPct * window.innerWidth) + 'px, ' + (yPct * window.innerHeight) + 'px)';
    }


    // --- SYNC SCROLL & COORDINATE MODES ---
    window.updateScrollMode = function(val) {
        window.collabState.syncMode = val;
        if (window.collabState.role === 'host') {
             broadcast({ type: 'scroll_setting', val: val });
        }
    };

    window.updateInteractMode = function(val) {
        window.collabState.interactMode = val;
    };

    window.toggleSyncScroll = function() {
        window.collabState.syncScroll = !window.collabState.syncScroll;
        sysMsg("Sync Scroll is now: " + (window.collabState.syncScroll ? 'Active' : 'Muted'));
    };

    window.collabState.scrollThrottler = null;
    window.addEventListener('scroll', function() {
        if (window.collabState.isRemoteChange) return;
        
        if (window.collabState.role === 'learner' && window.collabState.syncMode === 'tutor') {
            return;
        }
        if (window.collabState.syncMode === 'none') return;
        
        if(window.collabState.scrollThrottler) return;
        window.collabState.scrollThrottler = setTimeout(function() {
            var max = document.body.scrollHeight - window.innerHeight;
            if(max > 0) {
                broadcast({ type: 'scroll', pct: window.scrollY / max });
            }
            window.collabState.scrollThrottler = null;
        }, 80);
    });

    function executeScroll(pct) {
        window.collabState.isRemoteChange = true;
        var target = pct * (document.body.scrollHeight - window.innerHeight);
        window.scrollTo({ top: target, behavior: 'smooth' });
        setTimeout(function() { window.collabState.isRemoteChange = false; }, 400);
    }

    window.forceSyncEveryone = function() {
        var max = document.body.scrollHeight - window.innerHeight;
        if(max <= 0) return;
        var pct = window.scrollY / max;
        sysMsg('Tutor aligned everyone\\\'s display position.');
        broadcast({ type: 'scroll', pct: pct });
    };

    // --- HOST MODERATIONS ---
    window.toggleMuteChat = function(mute) {
        window.collabState.chatMuteEnabled = mute;
        broadcast({
            type: 'mute_settings',
            chatMuted: window.collabState.chatMuteEnabled,
            drawingMuted: window.collabState.drawingMuteEnabled
        });
    };

    window.toggleMuteDrawing = function(mute) {
        window.collabState.drawingMuteEnabled = mute;
        broadcast({
            type: 'mute_settings',
            chatMuted: window.collabState.chatMuteEnabled,
            drawingMuted: window.collabState.drawingMuteEnabled
        });
    };
    `;

    return { html, css, js };
};
