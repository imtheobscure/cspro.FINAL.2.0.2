/**
 * SPINNER — generic collection spinner tool.
 *
 * Lives in the annotation toolbar cluster. Three views:
 *   1. COLLECTIONS  — drop / browse / paste a JSON file. One file may hold many
 *                     collections; every collection is kept and stays saved.
 *   2. NEW          — copy the ready-made AI prompt (it carries the current file
 *                     and asks the AI to keep it and add more), paste the reply.
 *   3. SPINNER      — a heavy machined wheel: one flat tone, brass rim, index
 *                     ticks, cinematic landing. The drawn item is shown as a
 *                     premium card with a background image, gif / video / still,
 *                     title, instruction, an optional timer and just two
 *                     controls on the card itself: Start and Finish.
 *
 * Media an item can carry (all optional, plain public links):
 *   image / gif / video (mp4, webm, or a YouTube / Vimeo link -> Play button) /
 *   poster / audio (plays once, from Start to Finish) / sfx / resource.
 *
 * Naming stays generic ("items", "collections", "spinner") on purpose so one
 * tool drives a lesson round, a challenge, a warm-up or a forfeit list.
 *
 * NOTE: this source is a template literal that ends up inside a <script> tag in
 * the generated lesson html, so the emitted code never contains a literal
 * closing script tag and never uses backticks.
 */
export const getSpinnerFeatures = (): { html: string; css: string; js: string } => {
    const html = `
        <!-- ===================== SPINNER (generic collections tool) ===================== -->
        <div id="spinner-overlay" style="display:none;">
            <div class="spn-shell" id="spinner-shell">
                <div class="spn-topbar">
                    <div class="spn-brand">
                        <span class="spn-brand-mark" aria-hidden="true">
                            <svg viewBox="0 0 32 32" width="20" height="20"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 3v6M16 23v6M3 16h6M23 16h6M6.8 6.8l4.2 4.2M21 21l4.2 4.2M25.2 6.8L21 11M11 21l-4.2 4.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="16" cy="16" r="3.2" fill="currentColor"/></svg>
                        </span>
                        <span class="spn-brand-name">Spinner</span>
                        <span class="spn-brand-sub" id="spinner-brand-sub">No collection loaded</span>
                    </div>
                    <div class="spn-topbar-actions">
                        <label class="spn-select-wrap">
                            <select id="spinner-collection-select" class="spn-select" title="Switch collection"></select>
                            <span class="spn-select-caret" aria-hidden="true"></span>
                        </label>
                        <button type="button" id="spinner-collections-btn" class="spn-btn spn-btn-ghost">Collections</button>
                        <button type="button" id="spinner-addnew-btn" class="spn-btn spn-btn-ghost">Load JSON</button>
                        <button type="button" id="spinner-close-btn" class="spn-btn-x" title="Close (Esc)">&times;</button>
                    </div>
                </div>

                <!-- ---------- VIEW: COLLECTIONS ---------- -->
                <div class="spn-view" id="spinner-view-collections" style="display:none;">
                    <div class="spn-drop" id="spinner-drop-zone">
                        <div class="spn-drop-icon" aria-hidden="true">
                            <svg viewBox="0 0 48 48" width="34" height="34"><path d="M10 32V16l4-6h20l4 6v16a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 18h28M19 12h10M24 24v10M20 30l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                        </div>
                        <div class="spn-drop-title">Add a JSON file</div>
                        <div class="spn-drop-sub">Drop a <b>.json</b> file here, browse for it, or paste the JSON. One file can hold every collection you own. Loading mirrors the file: the saved list is replaced by exactly what that JSON holds, so nothing from an earlier load is added on top and nothing arrives twice.</div>
                        <div class="spn-drop-actions">
                            <button type="button" id="spinner-browse-btn" class="spn-btn spn-btn-primary">Browse JSON file</button>
                            <button type="button" id="spinner-paste-toggle-btn" class="spn-btn spn-btn-ghost">Paste JSON</button>
                            <button type="button" id="spinner-prompt-btn" class="spn-btn spn-btn-ghost">Copy AI prompt</button>
                        </div>
                        <input type="file" id="spinner-file-input" accept=".json,application/json,text/plain" style="display:none;" multiple>
                    </div>

                    <div class="spn-paste-wrap" id="spinner-paste-wrap" style="display:none;">
                        <textarea id="spinner-paste-area" class="spn-textarea" spellcheck="false" placeholder="Paste the JSON here..."></textarea>
                        <div class="spn-row">
                            <button type="button" id="spinner-paste-load-btn" class="spn-btn spn-btn-primary">Load pasted JSON</button>
                            <button type="button" id="spinner-paste-clear-btn" class="spn-btn spn-btn-ghost">Clear</button>
                            <span class="spn-status" id="spinner-paste-status"></span>
                        </div>
                    </div>

                    <div class="spn-section-head">
                        <span>Saved collections</span>
                        <span class="spn-section-tools">
                            <button type="button" id="spinner-undo-btn" class="spn-btn spn-btn-ghost" style="display:none;" title="Restore the collections that were saved before the last load">Undo last load</button>
                            <span class="spn-count-chip" id="spinner-saved-count">0</span>
                        </span>
                    </div>
                    <div class="spn-saved-list" id="spinner-saved-list"></div>
                </div>

                <!-- ---------- VIEW: NEW (ai prompt + paste) ---------- -->
                <div class="spn-view" id="spinner-view-new" style="display:none;">
                    <div class="spn-new-grid">
                        <div class="spn-new-col">
                            <div class="spn-field">
                                <label class="spn-label" for="spinner-new-theme">Theme of the new collection</label>
                                <input type="text" id="spinner-new-theme" class="spn-input" placeholder="e.g. quick warm-ups for a B1 class" autocomplete="off">
                            </div>
                            <div class="spn-field">
                                <label class="spn-label" for="spinner-new-examples">A few examples you want</label>
                                <input type="text" id="spinner-new-examples" class="spn-input" placeholder="e.g. dance until the song ends, describe the gif out loud" autocomplete="off">
                            </div>
                            <div class="spn-field">
                                <label class="spn-label" for="spinner-new-count">How many items</label>
                                <input type="text" id="spinner-new-count" class="spn-input" placeholder="e.g. 40" autocomplete="off">
                            </div>
                            <div class="spn-field">
                                <label class="spn-label" for="spinner-new-name">Name for a single collection reply</label>
                                <input type="text" id="spinner-new-name" class="spn-input" placeholder="e.g. Round one" autocomplete="off">
                            </div>
                            <div class="spn-prompt-box">
                                <div class="spn-prompt-head">
                                    <span>1 · Send this prompt to an AI</span>
                                    <button type="button" id="spinner-copy-prompt-btn" class="spn-btn spn-btn-primary">Copy AI prompt</button>
                                </div>
                                <textarea id="spinner-prompt-preview" class="spn-textarea spn-textarea-sm" readonly spellcheck="false"></textarea>
                                <div class="spn-row">
                                    <button type="button" id="spinner-download-prompt-btn" class="spn-btn spn-btn-ghost">Download prompt .txt</button>
                                    <span class="spn-status" id="spinner-prompt-status"></span>
                                </div>
                            </div>
                        </div>
                        <div class="spn-new-col">
                            <div class="spn-prompt-head">
                                <span>2 · Paste the AI reply</span>
                                <span class="spn-row">
                                    <button type="button" id="spinner-new-browse-btn" class="spn-btn spn-btn-ghost">Load file</button>
                                    <button type="button" id="spinner-new-save-btn" class="spn-btn spn-btn-primary">Check &amp; save</button>
                                </span>
                            </div>
                            <textarea id="spinner-new-area" class="spn-textarea spn-textarea-tall" spellcheck="false" placeholder="Paste the JSON here..."></textarea>
                            <input type="file" id="spinner-new-file" accept=".json,application/json,text/plain" style="display:none;">
                            <div class="spn-status" id="spinner-new-status"></div>
                            <div class="spn-hint">The prompt already lists every collection you have and tells the AI to keep them and add more. Missing pieces (emoji, image, gif, video, music...) are filled in automatically, text around the JSON is ignored and markdown fences are stripped. Media links are used exactly as written: image, gif, video, poster, background music, sound effect and an optional link.</div>
                        </div>
                    </div>
                    <div class="spn-row spn-row-end">
                        <button type="button" id="spinner-new-back-btn" class="spn-btn spn-btn-ghost">Back</button>
                    </div>
                </div>

                <!-- ---------- VIEW: SPINNER + CARD ---------- -->
                <div class="spn-view spn-view-wheel" id="spinner-view-wheel" style="display:none;">
                    <div class="spn-left">
                        <div class="spn-stage" id="spinner-stage">
                            <div class="spn-halo"></div>
                            <div class="spn-floor"></div>
                            <div class="spn-rim">
                                <div class="spn-rim-ticks"></div>
                                <div class="spn-wheel" id="spinner-wheel">
                                    <div class="spn-wheel-face" id="spinner-wheel-face"></div>
                                    <div class="spn-wheel-band" id="spinner-wheel-band"></div>
                                    <div class="spn-wheel-wedge" id="spinner-wheel-wedge"></div>
                                    <div class="spn-chips" id="spinner-chips"></div>
                                </div>
                                <div class="spn-rim-inner"></div>
                            </div>
                            <div class="spn-pointer"></div>
                            <div class="spn-hub"><span class="spn-hub-emoji" id="spinner-hub-emoji">🎯</span></div>
                            <div class="spn-flash" id="spinner-flash"></div>
                            <div class="spn-countdown" id="spinner-countdown" style="display:none;"><span id="spinner-countdown-num">3</span></div>
                        </div>
                        <div class="spn-controls">
                            <button type="button" id="spinner-spin-btn" class="spn-btn-go">Spin</button>
                        </div>
                        <div class="spn-mini" id="spinner-mini"></div>
                    </div>

                    <aside class="spn-side">
                        <div class="spn-tarot" id="spinner-tarot">
                            <div class="spn-tarot-bg" id="spinner-tarot-bg"></div>
                            <div class="spn-tarot-scrim"></div>
                            <div class="spn-tarot-frame" aria-hidden="true"></div>
                            <div class="spn-tarot-inner">
                                <div class="spn-tarot-emblem">
                                    <span class="spn-tarot-ring" aria-hidden="true"></span>
                                    <span class="spn-tarot-emoji" id="spinner-tarot-emoji">🎯</span>
                                </div>
                                <div class="spn-tarot-stage" id="spinner-tarot-stage">
                                    <div class="spn-tarot-art" id="spinner-tarot-art"></div>
                                    <button type="button" class="spn-tarot-play" id="spinner-tarot-play" hidden>Play</button>
                                </div>
                                <div class="spn-tarot-body">
                                    <div class="spn-tarot-kicker" id="spinner-tarot-kicker">Waiting</div>
                                    <div class="spn-tarot-title" id="spinner-tarot-title">Spin to draw</div>
                                    <div class="spn-tarot-rule" aria-hidden="true"></div>
                                    <div class="spn-tarot-instr" id="spinner-tarot-instr">Load a collection and spin the wheel.</div>
                                    <div class="spn-tarot-timer" id="spinner-tarot-timer" hidden>
                                        <div class="spn-tarot-time" id="spinner-tarot-time">00:00</div>
                                        <div class="spn-tarot-bar"><div class="spn-tarot-fill" id="spinner-tarot-fill"></div></div>
                                    </div>
                                    <div class="spn-tarot-note" id="spinner-tarot-note"></div>
                                    <div class="spn-tarot-tally" id="spinner-tarot-tally"></div>
                                </div>
                                <div class="spn-tarot-actions">
                                    <button type="button" id="spinner-card-start-btn" class="spn-card-start" disabled>Start</button>
                                    <button type="button" id="spinner-card-finish-btn" class="spn-card-finish" disabled>Finish</button>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                <div class="spn-toast" id="spinner-toast"></div>
            </div>
        </div>
    `;

    const css = `
        /* ===================== SPINNER ===================== */
        #spinner-overlay { position: fixed; inset: 0; z-index: 260000; display: none; align-items: center; justify-content: center; background: rgba(4,5,8,0.72); backdrop-filter: blur(16px) saturate(0.85); font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #e8e4da; }
        .spn-shell { position: relative; width: min(1340px, 96vw); height: min(94vh, 950px); display: flex; flex-direction: column; overflow: hidden; color-scheme: dark; color: #e8e4da; border-radius: 20px; border: 1px solid rgba(216,180,90,0.22); background: linear-gradient(168deg, #14161c 0%, #0c0e13 46%, #090a0e 100%); box-shadow: 0 50px 120px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(0,0,0,0.6); }
        .spn-shell::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.3; background-image: url("data:image/svg+xml;charset=utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22140%22 height=%22140%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>"); mix-blend-mode: overlay; }
        .spn-shell, .spn-shell * { box-sizing: border-box; }
        .spn-shell button, .spn-shell input, .spn-shell select, .spn-shell textarea { font-family: inherit; }
        #spinner-overlay * { -webkit-tap-highlight-color: transparent; }
        body.spn-open { overflow: hidden; }

        .spn-topbar { position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 11px 16px; border-bottom: 1px solid rgba(216,180,90,0.16); background: linear-gradient(180deg, rgba(22,25,31,0.92), rgba(10,12,16,0.85)); flex: 0 0 auto; }
        .spn-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .spn-brand-mark { display: flex; color: #d8b45a; filter: drop-shadow(0 0 10px rgba(216,180,90,0.3)); }
        .spn-brand-name { font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, ui-serif, serif; font-size: 1.08rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #f2ecdf; }
        .spn-brand-sub { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; color: #a9a08c; border: 1px solid rgba(216,180,90,0.22); background: rgba(216,180,90,0.07); padding: 3px 10px; border-radius: 999px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .spn-topbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .spn-btn { border: 1px solid rgba(216,180,90,0.24); background: linear-gradient(180deg, rgba(38,42,50,0.9), rgba(20,23,29,0.9)); color: #e9e4d8; border-radius: 10px; padding: 8px 15px; font-size: 0.76rem; font-weight: 600; letter-spacing: 0.05em; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease; white-space: nowrap; }
        .spn-btn:hover { border-color: rgba(216,180,90,0.5); background: linear-gradient(180deg, rgba(48,52,60,0.95), rgba(24,27,34,0.95)); }
        .spn-btn:active { transform: translateY(1px); }
        .spn-btn:disabled { opacity: 0.42; cursor: not-allowed; }
        .spn-btn-primary { background: linear-gradient(180deg, #e8cd8a 0%, #c39c3f 55%, #9b7727 100%); border-color: rgba(255,240,200,0.5); color: #1b1508; font-weight: 800; box-shadow: 0 8px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.5); }
        .spn-btn-primary:hover { background: linear-gradient(180deg, #f2dda5 0%, #cfa848 55%, #a67f2b 100%); }
        .spn-btn-ghost { background: rgba(255,255,255,0.03); }
        .spn-btn-x { width: 34px; height: 34px; padding: 0; font-size: 1.3rem; line-height: 1; border-radius: 10px; border: 1px solid rgba(216,180,90,0.24); background: rgba(255,255,255,0.03); color: #cdc6b6; cursor: pointer; }
        .spn-btn-x:hover { border-color: rgba(216,180,90,0.52); color: #f0e7d2; }

        /* the collection dropdown: explicit dark option colours so no browser paints white on white */
        .spn-select-wrap { position: relative; display: inline-flex; align-items: center; }
        .spn-select { appearance: none; -webkit-appearance: none; color-scheme: dark; background-color: #101319; background-image: linear-gradient(180deg, rgba(32,36,43,0.95), rgba(16,19,24,0.95)); color: #ece7db; border: 1px solid rgba(216,180,90,0.28); border-radius: 10px; padding: 8px 30px 8px 12px; font-size: 0.75rem; font-weight: 600; max-width: 260px; outline: none; cursor: pointer; }
        .spn-select:hover { border-color: rgba(216,180,90,0.55); }
        .spn-select:focus { border-color: rgba(216,180,90,0.7); box-shadow: 0 0 0 3px rgba(216,180,90,0.12); }
        .spn-select option, .spn-select optgroup { background-color: #101319; color: #ece7db; }
        .spn-select-caret { position: absolute; right: 11px; pointer-events: none; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #cbb075; }

        .spn-view { position: relative; z-index: 2; flex: 1 1 auto; min-height: 0; overflow: auto; padding: 16px; }
        .spn-view-wheel { display: flex; gap: 20px; overflow: hidden; }

        /* ---------- collections ---------- */
        .spn-drop { border: 1px dashed rgba(216,180,90,0.3); border-radius: 16px; padding: 22px; text-align: center; background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008)); transition: border-color 0.15s ease, background 0.15s ease; }
        .spn-drop.spn-over { border-color: rgba(216,180,90,0.75); background: rgba(216,180,90,0.08); }
        .spn-drop-icon { color: #cbb075; opacity: 0.9; }
        .spn-drop-title { font-family: 'Iowan Old Style', Palatino, Georgia, serif; font-weight: 600; font-size: 1.12rem; letter-spacing: 0.05em; margin-top: 8px; color: #f2ecdf; }
        .spn-drop-sub { font-size: 0.78rem; color: #a29a89; margin: 7px auto 14px; max-width: 680px; line-height: 1.6; }
        .spn-drop-actions { display: flex; gap: 9px; justify-content: center; flex-wrap: wrap; }
        .spn-paste-wrap { margin-top: 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(216,180,90,0.16); border-radius: 14px; padding: 12px; }
        .spn-textarea { width: 100%; min-height: 118px; background: #07080b; color: #ded8c9; border: 1px solid rgba(216,180,90,0.2); border-radius: 10px; padding: 11px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; line-height: 1.55; resize: vertical; outline: none; }
        .spn-textarea:focus { border-color: rgba(216,180,90,0.55); box-shadow: 0 0 0 3px rgba(216,180,90,0.1); }
        .spn-textarea-sm { min-height: 170px; margin-top: 9px; }
        .spn-textarea-tall { min-height: 250px; }
        .spn-row { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; margin-top: 9px; }
        .spn-row-end { justify-content: flex-end; }
        .spn-section-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 18px 2px 10px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #8d8676; }
        .spn-section-tools { display: flex; align-items: center; gap: 8px; }
        .spn-section-tools .spn-btn { padding: 5px 10px; font-size: 0.64rem; letter-spacing: 0.12em; }
        .spn-count-chip { background: rgba(216,180,90,0.1); border: 1px solid rgba(216,180,90,0.28); color: #e2cf9c; border-radius: 999px; padding: 3px 11px; font-size: 0.7rem; letter-spacing: 0.05em; }
        .spn-saved-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 11px; }
        .spn-card { display: flex; align-items: center; gap: 11px; background: linear-gradient(160deg, rgba(30,34,42,0.7), rgba(11,13,17,0.9)); border: 1px solid rgba(216,180,90,0.14); border-radius: 13px; padding: 11px 12px; transition: border-color 0.15s ease; }
        .spn-card:hover { border-color: rgba(216,180,90,0.34); }
        .spn-card.spn-active { border-color: rgba(216,180,90,0.6); box-shadow: 0 0 0 1px rgba(216,180,90,0.18), 0 14px 30px rgba(0,0,0,0.4); }
        .spn-card-emoji { font-size: 22px; line-height: 1; filter: grayscale(0.15); }
        .spn-card-body { flex: 1 1 auto; min-width: 0; }
        .spn-card-name { font-weight: 600; font-size: 0.84rem; color: #f0ebdf; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .spn-card-meta { font-size: 0.68rem; color: #928b7c; font-weight: 500; margin-top: 3px; letter-spacing: 0.03em; }
        .spn-card-actions { display: flex; gap: 6px; }
        .spn-card-actions .spn-btn { padding: 6px 11px; font-size: 0.7rem; border-radius: 9px; }
        .spn-empty { grid-column: 1 / -1; padding: 22px; text-align: center; color: #8d8676; font-size: 0.8rem; border: 1px dashed rgba(216,180,90,0.2); border-radius: 14px; line-height: 1.7; }

        /* ---------- collection item list (opened from a saved collection card) ---------- */
        .spn-card-open { flex-wrap: wrap; align-items: flex-start; }
        .spn-items { flex: 1 0 100%; margin-top: 4px; padding-top: 8px; border-top: 1px solid rgba(216,180,90,0.12); max-height: 240px; overflow: auto; }
        .spn-item { display: flex; align-items: center; gap: 9px; padding: 5px 8px; border-radius: 8px; font-size: 0.74rem; color: #cfc7b6; cursor: default; }
        .spn-item:hover { background: rgba(255,255,255,0.035); }
        .spn-item-emoji { flex: 0 0 auto; font-size: 0.86rem; line-height: 1; filter: grayscale(0.1); }
        .spn-item-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .spn-item-dot { flex: 0 0 auto; width: 5px; height: 5px; border-radius: 50%; background: rgba(207,199,182,0.22); }

        /* ---------- load json view ---------- */
        .spn-new-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
        .spn-new-col { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
        .spn-field { display: flex; flex-direction: column; gap: 6px; }
        .spn-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #8d8676; }
        .spn-input { background: #07080b; border: 1px solid rgba(216,180,90,0.2); border-radius: 10px; padding: 10px 12px; color: #ece7db; font-size: 0.84rem; outline: none; }
        .spn-input:focus { border-color: rgba(216,180,90,0.55); box-shadow: 0 0 0 3px rgba(216,180,90,0.1); }
        .spn-prompt-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(216,180,90,0.16); border-radius: 14px; padding: 12px; }
        .spn-prompt-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.74rem; font-weight: 600; letter-spacing: 0.04em; color: #cfc2a0; flex-wrap: wrap; }
        .spn-hint { font-size: 0.72rem; color: #8d8676; line-height: 1.65; margin-top: 9px; }
        .spn-status { font-size: 0.74rem; font-weight: 600; color: #9fd8b0; min-height: 16px; }
        .spn-status.spn-err { color: #e8a09a; }

        /* ---------- wheel ---------- */
        .spn-left { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
        .spn-stage { position: relative; width: min(48vh, 430px); height: min(48vh, 430px); flex: 0 0 auto; --spn-size: min(48vh, 430px); --spn-inner: calc(var(--spn-size) - 44px); }
        .spn-stage.spn-spinning { animation: spnShake 0.34s linear infinite; }
        @keyframes spnShake { 0% { transform: translate3d(0,0,0); } 25% { transform: translate3d(-1.5px,1px,0); } 50% { transform: translate3d(1.5px,-1px,0); } 75% { transform: translate3d(-1px,-1.5px,0); } 100% { transform: translate3d(1px,1.5px,0); } }
        .spn-floor { position: absolute; left: 6%; right: 6%; bottom: -7%; height: 16%; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(0,0,0,0.8), rgba(0,0,0,0) 72%); filter: blur(7px); }
        .spn-halo { position: absolute; inset: -6%; border-radius: 50%; background: radial-gradient(circle at 50% 46%, rgba(216,180,90,0.1), rgba(216,180,90,0) 64%); pointer-events: none; }

        .spn-rim { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 205deg, #191c22, #40454f 11%, #14161b 26%, #565c67 44%, #1a1d23 60%, #454b56 76%, #14171c 91%, #191c22); box-shadow: 0 34px 70px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.07), inset 0 2px 4px rgba(255,255,255,0.05), inset 0 -3px 8px rgba(0,0,0,0.85); }
        .spn-rim-ticks { position: absolute; inset: 4px; border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(224,196,120,0.55) 0deg 0.3deg, rgba(0,0,0,0) 0.3deg 2.5deg); -webkit-mask: radial-gradient(circle, rgba(0,0,0,0) 0 43%, #000 44% 48%, rgba(0,0,0,0) 49%); mask: radial-gradient(circle, rgba(0,0,0,0) 0 43%, #000 44% 48%, rgba(0,0,0,0) 49%); opacity: 0.8; }
        .spn-rim-inner { position: absolute; inset: 17px; border-radius: 50%; box-shadow: inset 0 0 0 2px rgba(216,180,90,0.45), inset 0 0 0 5px rgba(0,0,0,0.65), inset 0 0 24px rgba(0,0,0,0.85); pointer-events: none; }
        .spn-wheel { position: absolute; inset: 20px; border-radius: 50%; overflow: hidden; transform: rotate(0deg); will-change: transform; box-shadow: inset 0 0 26px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.8); --spn-r: calc(var(--spn-inner) / 2 - var(--spn-chip, 32px) / 2 - 12px); }
        .spn-wheel-face { position: absolute; inset: 0; border-radius: 50%; background: #1c2028; }
        .spn-wheel-band { position: absolute; inset: 0; border-radius: 50%; }
        .spn-wheel-wedge { position: absolute; inset: 0; border-radius: 50%; opacity: 0; transition: opacity 0.45s ease; pointer-events: none; }
        .spn-wheel-wedge.spn-wedge-on { opacity: 1; }
        .spn-chips { position: absolute; inset: 0; border-radius: 50%; }
        .spn-chip { position: absolute; left: 50%; top: 50%; width: var(--spn-chip, 32px); height: var(--spn-chip, 32px); margin: calc(var(--spn-chip, 32px) / -2) 0 0 calc(var(--spn-chip, 32px) / -2); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: calc(var(--spn-chip, 32px) * 0.52); line-height: 1; background: radial-gradient(circle at 34% 26%, rgba(58,62,72,0.95), rgba(14,16,20,0.98) 76%); box-shadow: inset 0 0 0 1px rgba(216,180,90,0.34), 0 4px 9px rgba(0,0,0,0.5); will-change: transform; }
        .spn-chips-off { display: none; }
        .spn-chip.spn-chip-win { background: radial-gradient(circle at 34% 26%, #fff6dd, #d3ab52 62%, #8a6a1d 100%); box-shadow: inset 0 0 0 2px rgba(255,246,220,0.92), 0 0 24px rgba(255,232,180,0.8), 0 8px 16px rgba(0,0,0,0.55); }
        .spn-pointer { position: absolute; top: -8px; left: 50%; width: 24px; height: 44px; transform: translateX(-50%); z-index: 9; filter: drop-shadow(0 8px 12px rgba(0,0,0,0.7)); }
        .spn-pointer::before { content: ''; position: absolute; inset: 0; clip-path: polygon(50% 100%, 0 20%, 20% 0, 80% 0, 100% 20%); background: linear-gradient(180deg, #fdf3d7 0%, #e0c176 30%, #b08a2e 66%, #6d5416 100%); }
        .spn-pointer::after { content: ''; position: absolute; left: 50%; top: 7px; width: 2px; height: 22px; transform: translateX(-50%); border-radius: 1px; background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0)); }
        .spn-hub { position: absolute; top: 50%; left: 50%; width: 26%; height: 26%; transform: translate(-50%, -50%); border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 7; background: radial-gradient(circle at 33% 25%, #fbf7ec 0%, #d5ccb8 13%, #857c68 36%, #2b2720 66%, #0c0e11 100%); box-shadow: 0 20px 44px rgba(0,0,0,0.8), 0 0 0 6px rgba(216,180,90,0.12), inset 0 -8px 16px rgba(0,0,0,0.65), inset 0 3px 6px rgba(255,255,255,0.2); }
        .spn-hub-emoji { font-size: clamp(24px, 5.2vh, 48px); line-height: 1; filter: drop-shadow(0 7px 12px rgba(0,0,0,0.78)); }
        .spn-hub.spn-hub-hit { animation: spnHubHit 0.75s cubic-bezier(0.22, 1.3, 0.35, 1); }
        @keyframes spnHubHit { 0% { transform: translate(-50%, -50%) scale(1); } 42% { transform: translate(-50%, -50%) scale(1.09); } 100% { transform: translate(-50%, -50%) scale(1); } }
        .spn-flash { position: absolute; inset: -18%; border-radius: 50%; pointer-events: none; z-index: 10; opacity: 0; background: radial-gradient(circle, rgba(255,240,208,0.8), rgba(255,240,208,0) 60%); }
        .spn-flash.spn-flash-on { animation: spnFlash 0.62s ease-out; }
        @keyframes spnFlash { 0% { opacity: 0; transform: scale(0.7); } 16% { opacity: 0.8; } 100% { opacity: 0; transform: scale(1.25); } }
        .spn-countdown { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 11; pointer-events: none; }
        .spn-countdown span { font-family: 'Iowan Old Style', Palatino, Georgia, serif; font-size: clamp(60px, 15vh, 138px); font-weight: 600; color: #fbf4e2; text-shadow: 0 0 40px rgba(216,180,90,0.55), 0 18px 30px rgba(0,0,0,0.75); animation: spnCd 0.44s ease-out; }
        @keyframes spnCd { 0% { transform: scale(0.55); opacity: 0; } 45% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); opacity: 0.9; } }

        .spn-controls { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; justify-content: center; }
        .spn-btn-go { font-size: 0.86rem; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; padding: 14px 46px; border-radius: 11px; cursor: pointer; color: #1b1508; border: 1px solid rgba(255,244,214,0.55); background: linear-gradient(180deg, #f3e0ac 0%, #d3ab52 48%, #a37f29 100%); box-shadow: 0 14px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 6px rgba(0,0,0,0.28); transition: transform 0.12s ease, filter 0.15s ease; }
        .spn-btn-go:hover { filter: brightness(1.06); }
        .spn-btn-go:active { transform: translateY(1px); }
        .spn-btn-go:disabled { opacity: 0.55; cursor: progress; }
        .spn-mini { font-size: 0.7rem; letter-spacing: 0.08em; color: #857e6e; text-align: center; min-height: 16px; }

        /* ---------- the drawn card ---------- */
        .spn-side { flex: 0 0 clamp(310px, 33%, 420px); display: flex; }
        .spn-tarot { position: relative; flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; border-radius: 20px; overflow: hidden; background: linear-gradient(168deg, #171a22 0%, #0b0d12 62%, #08090d 100%); border: 1px solid rgba(216,180,90,0.3); box-shadow: 0 34px 70px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.05); }
        .spn-tarot.spn-hit { animation: spnCardIn 0.75s cubic-bezier(0.22, 1.15, 0.35, 1); }
        @keyframes spnCardIn { 0% { transform: rotateY(-9deg) scale(0.94); opacity: 0.35; } 62% { transform: rotateY(3deg) scale(1.012); opacity: 1; } 100% { transform: rotateY(0) scale(1); } }
        .spn-tarot-bg { position: absolute; inset: 0; background-position: center; background-size: cover; background-repeat: no-repeat; opacity: 0; transform: scale(1.06); filter: saturate(0.9) brightness(0.62) blur(1px); transition: opacity 0.7s ease; z-index: 0; }
        .spn-tarot.spn-has-bg .spn-tarot-bg { opacity: 1; }
        .spn-tarot-scrim { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(6,8,12,0.42) 0%, rgba(6,8,12,0.68) 38%, rgba(4,6,9,0.9) 72%, rgba(3,4,7,0.97) 100%); }
        .spn-tarot-frame { position: absolute; inset: 8px; z-index: 4; border-radius: 14px; border: 1px solid rgba(216,180,90,0.32); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.4); pointer-events: none; }
        .spn-tarot-inner { position: relative; z-index: 3; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 10px; padding: 20px 18px 16px; text-align: center; }

        .spn-tarot-emblem { position: relative; width: clamp(96px, 15vh, 128px); height: clamp(96px, 15vh, 128px); margin: 0 auto; flex: 0 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 36%, rgba(255,244,214,0.12), rgba(10,12,16,0.92) 72%); box-shadow: 0 18px 40px rgba(0,0,0,0.62), inset 0 0 26px rgba(216,180,90,0.14), 0 0 0 1px rgba(216,180,90,0.4); }
        .spn-tarot-ring { position: absolute; inset: -7px; border-radius: 50%; border: 1px solid rgba(216,180,90,0.28); }
        .spn-tarot-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; border: 1px dashed rgba(216,180,90,0.35); }
        .spn-tarot-emoji { position: relative; font-size: clamp(48px, 8vh, 72px); line-height: 1; transform: perspective(820px) rotateX(8deg) rotateY(-6deg); filter: saturate(1.06) contrast(1.05) drop-shadow(0 16px 20px rgba(0,0,0,0.72)) drop-shadow(0 0 30px var(--spn-accent, rgba(216,180,90,0.5))); animation: spnFloat3D 5.4s ease-in-out infinite; }
        @keyframes spnFloat3D { 0%, 100% { transform: perspective(820px) rotateX(8deg) rotateY(-6deg) translateY(0); } 50% { transform: perspective(820px) rotateX(5deg) rotateY(5deg) translateY(-6px); } }

        .spn-tarot-stage { position: relative; flex: 1 1 auto; min-height: 108px; border-radius: 13px; overflow: hidden; border: 1px solid rgba(216,180,90,0.22); background: linear-gradient(180deg, rgba(8,10,14,0.72), rgba(5,6,9,0.9)); box-shadow: inset 0 0 26px rgba(0,0,0,0.6); }
        .spn-tarot-stage.spn-stage-off { display: none; }
        .spn-tarot-art { position: absolute; inset: 0; }
        .spn-tarot-art img, .spn-tarot-art video { display: block; width: 100%; height: 100%; object-fit: cover; }
        .spn-tarot-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: inline-flex; align-items: center; gap: 10px; padding: 12px 22px; border-radius: 999px; border: 1px solid rgba(255,244,214,0.5); background: linear-gradient(180deg, rgba(22,25,31,0.9), rgba(8,10,14,0.92)); color: #f5e8c8; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; backdrop-filter: blur(6px); box-shadow: 0 14px 30px rgba(0,0,0,0.6); }
        .spn-tarot-play:hover { border-color: rgba(255,244,214,0.85); }
        .spn-tarot-play::before { content: ''; width: 0; height: 0; border-left: 11px solid currentColor; border-top: 7px solid rgba(0,0,0,0); border-bottom: 7px solid rgba(0,0,0,0); }
        .spn-tarot-play[hidden] { display: none; }

        .spn-tarot-body { flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px; }
        .spn-tarot-kicker { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: #b39a5f; }
        .spn-tarot-title { font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, ui-serif, serif; font-size: 1.42rem; font-weight: 600; line-height: 1.24; color: #f6f0e3; }
        .spn-tarot-rule { width: 58px; height: 1px; margin: 3px auto 4px; background: linear-gradient(90deg, rgba(216,180,90,0), rgba(216,180,90,0.85), rgba(216,180,90,0)); }
        .spn-tarot-instr { font-size: 0.86rem; line-height: 1.6; color: #c9c3b5; }
        .spn-tarot-note { font-size: 0.72rem; color: #8d8676; }
        .spn-tarot-tally { font-size: 0.64rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #b39a5f; min-height: 14px; }
        .spn-tarot-tally:empty { display: none; }
        .spn-tarot-timer { margin-top: 6px; }
        .spn-tarot-timer[hidden] { display: none; }
        .spn-tarot-time { font-family: 'Iowan Old Style', Palatino, Georgia, serif; font-size: 1.7rem; font-weight: 600; font-variant-numeric: tabular-nums; color: #fdf6e6; }
        .spn-tarot-time.spn-low { color: #f0b1a5; }
        .spn-tarot-bar { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.07); overflow: hidden; margin-top: 6px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.6); }
        .spn-tarot-fill { height: 100%; width: 100%; border-radius: 999px; background: linear-gradient(90deg, #d8b45a, #f3e0ac); transition: width 0.3s linear; }

        .spn-tarot-actions { flex: 0 0 auto; display: flex; gap: 10px; margin-top: 4px; }
        .spn-card-start { flex: 1 1 auto; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; padding: 13px 24px; border-radius: 11px; cursor: pointer; color: #1b1508; border: 1px solid rgba(255,244,214,0.55); background: linear-gradient(180deg, #f3e0ac 0%, #d3ab52 48%, #a37f29 100%); box-shadow: 0 14px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.5); transition: transform 0.12s ease, filter 0.15s ease; }
        .spn-card-start:hover:not(:disabled) { filter: brightness(1.07); }
        .spn-card-start:active:not(:disabled) { transform: translateY(1px); }
        .spn-card-start:disabled { opacity: 0.4; cursor: not-allowed; }
        .spn-card-finish { flex: 0 0 auto; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 13px 22px; border-radius: 11px; cursor: pointer; color: #f0e6cd; border: 1px solid rgba(216,180,90,0.42); background: linear-gradient(180deg, rgba(44,49,58,0.95), rgba(19,22,28,0.95)); transition: transform 0.12s ease, border-color 0.15s ease, opacity 0.15s ease; }
        .spn-card-finish:hover:not(:disabled) { border-color: rgba(216,180,90,0.8); }
        .spn-card-finish:active:not(:disabled) { transform: translateY(1px); }
        .spn-card-finish:disabled { opacity: 0.38; cursor: not-allowed; }

        .spn-dust { position: fixed; z-index: 270000; pointer-events: none; animation: spnDust 2.6s cubic-bezier(0.16, 0.55, 0.3, 1) forwards; }
        @keyframes spnDust { 0% { transform: translate3d(0,0,0) rotate(0deg); opacity: 0.95; } 100% { transform: translate3d(var(--dx), var(--dy), 0) rotate(var(--rot)); opacity: 0; } }
        .spn-toast { position: absolute; z-index: 5; left: 50%; bottom: 16px; transform: translate(-50%, 16px); background: linear-gradient(180deg, rgba(28,31,38,0.97), rgba(10,12,16,0.97)); border: 1px solid rgba(216,180,90,0.34); color: #ece7db; font-size: 0.77rem; font-weight: 600; letter-spacing: 0.03em; padding: 10px 18px; border-radius: 11px; opacity: 0; pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; max-width: 78%; text-align: center; box-shadow: 0 18px 40px rgba(0,0,0,0.6); }
        .spn-toast.spn-toast-on { opacity: 1; transform: translate(-50%, 0); }
        .spn-toast.spn-toast-err { border-color: rgba(214,124,116,0.5); color: #f0cfc9; }

        @media (max-width: 1000px) {
            .spn-view-wheel { flex-direction: column; overflow: auto; }
            .spn-stage { width: min(44vh, 330px); height: min(44vh, 330px); --spn-size: min(44vh, 330px); }
            .spn-side { flex: 0 0 auto; width: 100%; }
            .spn-tarot { min-height: 560px; }
            .spn-new-grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
            .spn-stage.spn-spinning, .spn-halo, .spn-tarot-emoji { animation: none !important; }
        }
    `;

    const js = `
        /* ===================== SPINNER (generic collection spinner) ===================== */
        (function () {
            'use strict';
            if (window.__spinnerLoaded) return;
            window.__spinnerLoaded = true;

            var COLL_KEY = '__spinner_collections_v1';
            var LAST_KEY = '__spinner_last_collection_v1';
            var KEY_KEY = '__spinner_key_v1';
            var UNDO_KEY = '__spinner_undo_v1';
            var UNDO_MAX = 5;
            var FALLBACK_EMOJIS = ['🎯','📌','⭐','🔔','🎬','🎵','🏅','⚡','🧩','🃏','🎤','💫','🏆','🧭','🖋️','📚','🗝️','🎨','🧠','🔍','🗣️','🤝','🥁','🧗','🧘','🔢','🌍','🕰️','🎭','🧪','🥇','🪞','🕯️','🎩','🧳','📷','🛠️','🪄','🗺️','🎟️','🧊','🔮','🧱','⚖️','🎲','🏹'];

            var state = {
                collections: null,
                current: null,
                itemIndex: -1,
                cardItem: null,
                art: null,
                rotation: 0,
                spinning: false,
                playing: false,
                raf: 0,
                watchdog: 0,
                timerId: 0,
                remaining: 0,
                music: null,
                ac: null,
                sfxEl: null,
                toastTimer: 0,
                booted: false,
                armed: false
            };

            /*
             * Which key arms the next spin. Kept in memory + localStorage only:
             * it never appears in a collection file, in an export, in the JSON
             * handed to the AI or anywhere on screen.
             */
            var openItemsId = '';

            var DEFAULT_TRIGGER_KEY = ';';
            function triggerKey() {
                try { return localStorage.getItem(KEY_KEY) || DEFAULT_TRIGGER_KEY; } catch (e) { return DEFAULT_TRIGGER_KEY; }
            }
            function setTriggerKey(key) {
                var k = String(key == null ? '' : key);
                try { localStorage.setItem(KEY_KEY, k); } catch (e) {}
                return k;
            }
            function keyPressed(e) {
                var k = triggerKey();
                if (!k) return false;
                if (e.ctrlKey || e.metaKey || e.altKey) return false;
                return e.key === k || e.code === k || (k.length === 1 && e.key && e.key.toLowerCase() === k.toLowerCase());
            }

            function $(id) { return document.getElementById(id); }

            function esc(v) {
                return String(v == null ? '' : v)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            }

            function num(v) {
                if (typeof v === 'number') return isFinite(v) ? v : 0;
                var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\\-]/g, ''));
                return isFinite(n) ? n : 0;
            }

            function clockToSeconds(v) {
                if (v == null) return 0;
                if (typeof v === 'number') return Math.max(0, Math.round(v));
                var s = String(v).trim();
                if (!s) return 0;
                var clock = s.match(/^([0-9]{1,2}):([0-9]{1,2})(?::([0-9]{1,2}))?$/);
                if (clock) {
                    var a = parseInt(clock[1], 10) || 0;
                    var b = parseInt(clock[2], 10) || 0;
                    var c = clock[3] != null ? (parseInt(clock[3], 10) || 0) : null;
                    return c == null ? a * 60 + b : a * 3600 + b * 60 + c;
                }
                var withUnit = s.match(/([0-9]+)\\s*(hour|hr|h|minute|min|m|second|sec|s)\\b/i);
                if (withUnit) {
                    var q = parseInt(withUnit[1], 10) || 0;
                    var u = withUnit[2].toLowerCase();
                    if (u === 'h' || u.indexOf('hour') === 0 || u === 'hr') return q * 3600;
                    if (u === 'm' || u.indexOf('min') === 0) return q * 60;
                    return q;
                }
                return Math.max(0, Math.round(num(s)));
            }

            function textOf(v, depth) {
                if (v == null) return '';
                if (typeof v === 'string') return v.trim();
                if (typeof v === 'number' || typeof v === 'boolean') return String(v);
                if (Array.isArray(v)) {
                    if ((depth || 0) > 3) return '';
                    var parts = [];
                    for (var i = 0; i < v.length; i++) {
                        var s = textOf(v[i], (depth || 0) + 1);
                        if (s) parts.push(s);
                    }
                    return parts.join(' ');
                }
                if (typeof v === 'object') {
                    if ((depth || 0) > 2) return '';
                    var keys = ['text','title','name','label','instruction','instructions','description','value','content','body','task','step'];
                    for (var k = 0; k < keys.length; k++) {
                        var t = textOf(v[keys[k]], (depth || 0) + 1);
                        if (t) return t;
                    }
                }
                return '';
            }

            function urlOf(v) {
                var s = textOf(v, 0);
                if (!s) return '';
                if (!/^https?:\\/\\//i.test(s)) return '';
                return s.replace(/[),.]+$/, '');
            }

            function isEmbedUrl(u) {
                return !!youtubeId(u) || !!vimeoId(u);
            }

            function youtubeId(u) {
                var m = String(u || '').match(/(?:youtube[.]com\\/(?:watch[?]v=|embed\\/|shorts\\/|live\\/|v\\/)|youtu[.]be\\/)([A-Za-z0-9_-]{6,})/);
                return m ? m[1] : '';
            }

            function vimeoId(u) {
                var m = String(u || '').match(/vimeo[.]com\\/(?:video\\/)?([0-9]{6,})/);
                return m ? m[1] : '';
            }

            function embedSrc(u) {
                var yt = youtubeId(u);
                if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt + '?rel=0&modestbranding=1&playsinline=1&autoplay=1';
                var vi = vimeoId(u);
                if (vi) return 'https://player.vimeo.com/video/' + vi + '?autoplay=1';
                return '';
            }

            function isVideoUrl(u) {
                return /\\.(mp4|webm|ogv|mov|m4v)([?#]|$)/i.test(String(u || ''));
            }

            function isGifUrl(u) {
                return /\\.gif([?#]|$)/i.test(String(u || '')) || /giphy[.]com|tenor[.]com/i.test(String(u || ''));
            }

            function hashStr(s) {
                var h = 2166136261;
                s = String(s == null ? '' : s);
                for (var i = 0; i < s.length; i++) {
                    h ^= s.charCodeAt(i);
                    h = Math.imul(h, 16777619);
                }
                return (h >>> 0).toString(36);
            }

            function autoEmoji(seed) {
                return FALLBACK_EMOJIS[parseInt(hashStr(seed), 36) % FALLBACK_EMOJIS.length];
            }

            /* ---------- normalising whatever the file hands us ---------- */

            var ITEM_KEYS = ['items','options','entries','list','elementos','challenges','rounds','prompts','tasks','cards','steps','forfeits','punishments','dares'];
            var COLLECTION_KEYS = ['collections','collection','sets','decks','packs','groups','categories'];

            function pickItems(raw) {
                if (Array.isArray(raw)) return raw;
                if (!raw || typeof raw !== 'object') return [];
                for (var i = 0; i < ITEM_KEYS.length; i++) {
                    if (Array.isArray(raw[ITEM_KEYS[i]])) return raw[ITEM_KEYS[i]];
                }
                var numeric = [];
                var keys = Object.keys(raw);
                for (var j = 0; j < keys.length; j++) {
                    if (/^[0-9]+$/.test(keys[j])) numeric.push(keys[j]);
                }
                if (numeric.length) {
                    numeric.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
                    var out = [];
                    for (var k = 0; k < numeric.length; k++) out.push(raw[numeric[k]]);
                    return out;
                }
                return [];
            }

            function collectMedia(item) {
                var out = [];
                function push(v) {
                    if (v == null) return;
                    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) push(v[i]); return; }
                    if (typeof v === 'object') { push(v.url || v.src || v.link || v.image || v.gif || v.video); return; }
                    var u = urlOf(v);
                    if (u) out.push(u);
                }
                var keys = ['video','videos','clip','clips','gif','gifs','animation','animations','image','images','picture','pictures','photo','photos','artwork','media','frame','visual'];
                for (var i = 0; i < keys.length; i++) push(item[keys[i]]);
                var seen = {};
                var res = [];
                for (var j = 0; j < out.length; j++) {
                    if (!seen[out[j]]) { seen[out[j]] = 1; res.push(out[j]); }
                }
                return res.slice(0, 8);
            }

            function firstString(item, keys) {
                for (var i = 0; i < keys.length; i++) {
                    var v = item[keys[i]];
                    if (v == null) continue;
                    var s = textOf(v, 0);
                    if (s) return s;
                }
                return '';
            }

            function normalizeItem(raw, index) {
                if (typeof raw === 'string' || typeof raw === 'number') raw = { title: String(raw) };
                if (!raw || typeof raw !== 'object') return null;
                var title = firstString(raw, ['title','name','label','headline','task','option','action']);
                var instruction = firstString(raw, ['instruction','instructions','description','detail','rule','text','prompt','body','how','steps','content']);
                if (!title && instruction) { title = instruction; instruction = ''; }
                if (!title && !instruction) return null;
                var emoji = firstString(raw, ['emoji','icon','symbol','badge']);
                if (!emoji) emoji = autoEmoji(title + '|' + instruction);
                return {
                    id: textOf(raw.id, 0) || ('itm-' + index + '-' + hashStr(title + index)),
                    emoji: emoji.slice(0, 10),
                    title: title.slice(0, 140),
                    instruction: instruction.slice(0, 700),
                    note: firstString(raw, ['note','notes','tip','hint','coach','reminder']),
                    media: collectMedia(raw),
                    poster: urlOf(raw.poster || raw.thumbnail || raw.thumb || raw.preview || raw.cover || raw.background),
                    audio: urlOf(raw.audio || raw.audioUrl || raw.music || raw.backgroundMusic || raw.soundtrack || raw.mp3 || raw.track || raw.theme),
                    sfx: urlOf(raw.sfx || raw.soundEffect || raw.stinger || raw.sting || raw.effect || raw.fx),
                    resource: urlOf(raw.resource || raw.resourceUrl || raw.readMore || raw.article || raw.sourceUrl || raw.link),
                    duration: clockToSeconds(raw.duration != null ? raw.duration : (raw.seconds != null ? raw.seconds : (raw.timer != null ? raw.timer : (raw.time != null ? raw.time : raw.countdown)))),
                    accent: firstString(raw, ['color','colour','accent','theme']) || '',
                    // Optional bias for one item. 0 (or absent) means plain, uniform
                    // chance — a collection that never mentions it behaves exactly as before.
                    weight: num(raw.weight != null ? raw.weight : raw.probability)
                };
            }

            function normalizeCollection(raw, fallbackName) {
                var items = [];
                var list = pickItems(raw);
                for (var i = 0; i < list.length; i++) {
                    var it = normalizeItem(list[i], i);
                    if (it) items.push(it);
                }
                var name = '';
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                    name = textOf(raw.name, 0) || textOf(raw.title, 0) || textOf(raw.collection, 0) || textOf(raw.subject, 0);
                }
                if (!name && fallbackName) name = String(fallbackName).replace(/[.]json$/i, '');
                if (!name) name = 'Collection ' + (saved().length + 1);
                var emoji = '';
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) emoji = textOf(raw.emoji || raw.icon, 0);
                return {
                    id: 'col-' + Date.now().toString(36) + '-' + hashStr(name + items.length),
                    name: name.slice(0, 90) || 'Collection',
                    emoji: (emoji || '🎯').slice(0, 10),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    drawn: {},
                    seen: [],
                    items: items
                };
            }

            function reviveCollection(raw) {
                if (!raw || typeof raw !== 'object') return null;
                var items = [];
                var list = Array.isArray(raw.items) ? raw.items : [];
                for (var i = 0; i < list.length; i++) {
                    var it = list[i] && typeof list[i] === 'object' ? {
                        id: list[i].id || ('itm-' + i),
                        emoji: list[i].emoji || autoEmoji(list[i].title || ''),
                        title: list[i].title || '',
                        instruction: list[i].instruction || '',
                        note: list[i].note || '',
                        media: Array.isArray(list[i].media) ? list[i].media : [],
                        poster: list[i].poster || '',
                        audio: list[i].audio || '',
                        sfx: list[i].sfx || '',
                        resource: list[i].resource || '',
                        duration: num(list[i].duration),
                        accent: list[i].accent || '',
                        weight: num(list[i].weight)
                    } : null;
                    if (it && (it.title || it.instruction)) items.push(it);
                }
                if (!items.length) return null;
                var drawn = (raw.drawn && typeof raw.drawn === 'object') ? raw.drawn : {};
                var seen = Array.isArray(raw.seen) ? raw.seen : [];
                var ids = {};
                for (var s = 0; s < items.length; s++) ids[items[s].id] = 1;
                var keptSeen = [];
                for (var q = 0; q < seen.length; q++) { if (ids[seen[q]]) keptSeen.push(seen[q]); }
                return {
                    id: raw.id || ('col-' + Math.random().toString(36).slice(2, 10)),
                    name: raw.name || 'Collection',
                    emoji: raw.emoji || '🎯',
                    createdAt: raw.createdAt || Date.now(),
                    updatedAt: raw.updatedAt || Date.now(),
                    drawn: drawn,
                    seen: keptSeen,
                    items: items
                };
            }

            /* ---------- storage ---------- */

            function saved() {
                if (!state.collections) loadSaved();
                return state.collections;
            }

            function loadSaved() {
                var out = [];
                try {
                    var raw = localStorage.getItem(COLL_KEY);
                    var list = raw ? JSON.parse(raw) : [];
                    if (Array.isArray(list)) {
                        for (var i = 0; i < list.length; i++) {
                            var col = reviveCollection(list[i]);
                            if (col) out.push(col);
                        }
                    }
                } catch (e) { out = []; }
                state.collections = out;
                return out;
            }

            function persist() {
                try { localStorage.setItem(COLL_KEY, JSON.stringify(saved())); } catch (e) {}
            }

            function lastCollectionId() {
                try { return localStorage.getItem(LAST_KEY) || ''; } catch (e) { return ''; }
            }

            function rememberCollection(id) {
                try { localStorage.setItem(LAST_KEY, id || ''); } catch (e) {}
            }

            /* ---------- undo: the list a replacing load wiped ---------- */

            /*
             * Every load that replaces the saved list first files away the stored
             * list it is about to overwrite, exactly as it was — ids, round state
             * and marks included. That is why the snapshot is the raw stored value
             * instead of a rebuilt export: restoring it is a byte-faithful put-back.
             */
            function undoStack() {
                try {
                    var raw = localStorage.getItem(UNDO_KEY);
                    var list = raw ? JSON.parse(raw) : [];
                    return Array.isArray(list) ? list : [];
                } catch (e) { return []; }
            }

            function saveUndoStack(list) {
                try { localStorage.setItem(UNDO_KEY, JSON.stringify(list.slice(-UNDO_MAX))); } catch (e) {}
            }

            function storedCollections() {
                try { return localStorage.getItem(COLL_KEY) || ''; } catch (e) { return ''; }
            }

            function pushUndo(raw, currentId, label) {
                if (!raw) return;                       // nothing was there to lose
                var stack = undoStack();
                stack.push({ at: Date.now(), label: label || 'the last load', current: currentId || '', raw: raw });
                saveUndoStack(stack);
                renderUndo();
            }

            function undoLoad() {
                var stack = undoStack();
                if (!stack.length) { toast('Nothing to undo yet.', true); return false; }
                var snap = stack.pop();
                saveUndoStack(stack);
                try { localStorage.setItem(COLL_KEY, snap.raw); } catch (e) {
                    toast('Could not put that list back.', true);
                    return false;
                }
                state.collections = null;
                var cols = loadSaved();
                state.current = null;
                var pick = null;
                for (var i = 0; i < cols.length; i++) {
                    if (cols[i].id === snap.current) { pick = cols[i]; break; }
                }
                if (!pick && cols.length) pick = cols[0];
                renderUndo();
                if (pick) {
                    useCollection(pick.id);
                } else {
                    renderWheel();
                    resetCard();
                    renderSaved();
                    showView('collections');
                }
                toast('Restored ' + cols.length + ' collection' + (cols.length === 1 ? '' : 's') + ' from before ' + snap.label);
                return true;
            }

            function renderUndo() {
                var btn = $('spinner-undo-btn');
                if (!btn) return;
                var stack = undoStack();
                if (!stack.length) { btn.style.display = 'none'; return; }
                var last = stack[stack.length - 1];
                btn.style.display = '';
                btn.textContent = stack.length > 1 ? ('Undo last load · ' + stack.length) : 'Undo last load';
                btn.title = 'Restore the collections that were saved before ' + (last.label || 'the last load');
            }

            /* ---------- audio: always on ---------- */

            function audioCtx() {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                if (!state.ac) { try { state.ac = new AC(); } catch (e) { state.ac = null; } }
                if (state.ac && state.ac.state === 'suspended') { try { state.ac.resume(); } catch (e) {} }
                return state.ac;
            }

            function tone(freq, dur, type, vol, delay) {
                var ac = audioCtx();
                if (!ac) return;
                try {
                    var o = ac.createOscillator();
                    var g = ac.createGain();
                    o.type = type || 'sine';
                    o.frequency.value = freq;
                    g.gain.value = 0.0001;
                    o.connect(g);
                    g.connect(ac.destination);
                    var t = ac.currentTime + (delay || 0);
                    g.gain.exponentialRampToValueAtTime(vol == null ? 0.08 : vol, t + 0.012);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
                    o.start(t);
                    o.stop(t + (dur || 0.2) + 0.04);
                } catch (e) {}
            }

            function tickSound(speed) {
                var f = 1180 + Math.min(900, speed * 16);
                tone(f, 0.045, 'triangle', 0.028);
            }

            function whoosh() {
                var ac = audioCtx();
                if (!ac) return;
                try {
                    var buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.7), ac.sampleRate);
                    var data = buf.getChannelData(0);
                    for (var i = 0; i < data.length; i++) {
                        var t = i / data.length;
                        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
                    }
                    var src = ac.createBufferSource();
                    src.buffer = buf;
                    var filter = ac.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.value = 620;
                    filter.Q.value = 0.7;
                    var g = ac.createGain();
                    g.gain.value = 0.16;
                    src.connect(filter);
                    filter.connect(g);
                    g.connect(ac.destination);
                    src.start();
                } catch (e) {}
            }

            function boom() {
                var ac = audioCtx();
                if (!ac) return;
                try {
                    var o = ac.createOscillator();
                    var g = ac.createGain();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(150, ac.currentTime);
                    o.frequency.exponentialRampToValueAtTime(48, ac.currentTime + 0.5);
                    g.gain.setValueAtTime(0.0001, ac.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.24, ac.currentTime + 0.02);
                    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
                    o.connect(g);
                    g.connect(ac.destination);
                    o.start();
                    o.stop(ac.currentTime + 0.65);
                } catch (e) {}
            }

            function chime() {
                tone(392.0, 1.5, 'sine', 0.09, 0);
                tone(587.33, 1.3, 'sine', 0.06, 0.14);
                tone(783.99, 1.15, 'sine', 0.045, 0.28);
                tone(1174.66, 0.9, 'sine', 0.02, 0.42);
            }

            function playSfx(url) {
                if (!url) return;
                try {
                    if (!state.sfxEl) {
                        state.sfxEl = document.createElement('audio');
                        state.sfxEl.id = 'spinner-sfx';
                    }
                    state.sfxEl.src = url;
                    state.sfxEl.volume = 0.5;
                    state.sfxEl.loop = false;
                    var p = state.sfxEl.play();
                    if (p && p.catch) p.catch(function () {});
                } catch (e) {}
            }

            function dust(count) {
                var colors = ['#f6e8c0','#d8b45a','#fffaf0','#b98f2f','#e3d3a4'];
                for (var i = 0; i < count; i++) {
                    var d = document.createElement('div');
                    d.className = 'spn-dust';
                    d.style.left = (randFloat() * 100).toFixed(2) + 'vw';
                    d.style.top = (-4 + randFloat() * 8).toFixed(2) + 'vh';
                    d.style.width = (2 + randFloat() * 4).toFixed(1) + 'px';
                    d.style.height = (7 + randFloat() * 13).toFixed(1) + 'px';
                    d.style.borderRadius = '1px';
                    d.style.background = colors[Math.floor(randFloat() * colors.length)];
                    d.style.setProperty('--dx', ((randFloat() - 0.5) * 320).toFixed(0) + 'px');
                    d.style.setProperty('--dy', (window.innerHeight + 90).toFixed(0) + 'px');
                    d.style.setProperty('--rot', (randFloat() * 900 - 450).toFixed(0) + 'deg');
                    document.body.appendChild(d);
                    (function (node) {
                        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 3200);
                    })(d);
                }
            }

            function randFloat() {
                if (window.crypto && window.crypto.getRandomValues) {
                    var a = new Uint32Array(1);
                    window.crypto.getRandomValues(a);
                    return a[0] / 4294967296;
                }
                return Math.random();
            }

            function randInt(n) {
                return Math.floor(randFloat() * n) % n;
            }

            function pickIndex(items) {
                if (!items || !items.length) return -1;
                return randInt(items.length);
            }

            /* ---------- no repeats until the whole collection is used ---------- */

            function tallyOf(col) {
                if (!col.drawn || typeof col.drawn !== 'object') col.drawn = {};
                if (!Array.isArray(col.seen)) col.seen = [];
                return col;
            }

            function leftThisRound(col) {
                if (!col || !col.items.length) return 0;
                tallyOf(col);
                var left = 0;
                for (var i = 0; i < col.items.length; i++) {
                    if (col.seen.indexOf(col.items[i].id) === -1) left++;
                }
                return left;
            }

            function drawnTimes(col, item) {
                if (!col || !item) return 0;
                tallyOf(col);
                return col.drawn[item.id] || 0;
            }

            function poolOf(col) {
                var out = [];
                if (!col || !col.items.length) return out;
                tallyOf(col);
                for (var i = 0; i < col.items.length; i++) {
                    if (col.seen.indexOf(col.items[i].id) === -1) out.push(i);
                }
                return out;
            }

            /* Draws the next item: random, but nothing comes back until the round is over. */
            /* ---------- the marked item (optional, silent bias) ---------- */
            /*
             * The item carrying the highest weight is the one the next armed spin
             * lands on. Nothing else changes: a normal spin is still uniformly
             * random, and an armed one uses the same animation, the same number of
             * turns, the same ticking, the same sound and the same celebration, so
             * the result cannot be told apart from a lucky draw.
             */
            function markedIndex(col) {
                if (!col || !col.items || !col.items.length) return -1;
                var best = -1;
                var bestW = 0;
                for (var i = 0; i < col.items.length; i++) {
                    var w = num(col.items[i].weight);
                    if (w > bestW) { bestW = w; best = i; }
                }
                return best;
            }

            /* Consume the armed flag and return the index to land on, if any. */
            function takeArmed() {
                if (!state.armed) return undefined;
                state.armed = false;
                var idx = markedIndex(state.current);
                return idx >= 0 ? idx : undefined;
            }

            /* Every user-facing spin goes through here (button, wheel, keys, API). */
            function spinNow() {
                // A spin that cannot start must not eat the armed flag.
                if (state.spinning) { spin(undefined); return; }
                spin(takeArmed());
            }

            /* Mark one item, or clear the mark when the same one is chosen again. */
            function toggleMark(col, idx) {
                if (!col || !col.items || !col.items[idx]) return;
                var wasMarked = markedIndex(col) === idx;
                for (var i = 0; i < col.items.length; i++) col.items[i].weight = 0;
                if (!wasMarked) col.items[idx].weight = 1;
                col.updatedAt = Date.now();
                persist();
                renderItems(col);
                toast(wasMarked ? 'Removed.' : 'Saved.');
            }

            /* Mark by index, by title or by name — used by the console API. */
            function apiMark(target) {
                var col = state.current;
                if (!col || !col.items.length) return false;
                if (typeof target === 'number') {
                    if (target < 0 || target >= col.items.length) return false;
                    toggleMark(col, target);
                    return true;
                }
                var want = String(target == null ? '' : target).trim().toLowerCase();
                if (!want) return false;
                for (var i = 0; i < col.items.length; i++) {
                    if (String(col.items[i].title || '').trim().toLowerCase() === want) {
                        toggleMark(col, i);
                        return true;
                    }
                }
                return false;
            }

            function apiMarked() {
                var col = state.current;
                if (!col) return null;
                var idx = markedIndex(col);
                if (idx < 0) return null;
                return { index: idx, id: col.items[idx].id, title: col.items[idx].title };
            }

            function nextIndex(col, forcedIndex) {
                var t = tallyOf(col);
                var n = col.items.length;
                var idx;
                if (typeof forcedIndex === 'number' && forcedIndex >= 0 && forcedIndex < n) {
                    idx = forcedIndex;
                } else {
                    var pool = poolOf(col);
                    if (!pool.length) { t.seen = []; pool = poolOf(col); }
                    idx = pool[pickIndex(pool)];
                }
                var item = col.items[idx];
                if (item) {
                    t.drawn[item.id] = (t.drawn[item.id] || 0) + 1;
                    if (t.seen.indexOf(item.id) === -1) t.seen.push(item.id);
                }
                col.updatedAt = Date.now();
                persist();
                return idx;
            }

            function renderTally(item) {
                var el = $('spinner-tarot-tally');
                if (!el) return;
                var col = state.current;
                if (!col || !item) { el.textContent = ''; return; }
                var left = leftThisRound(col);
                el.textContent = 'drawn ' + drawnTimes(col, item) + '× · ' + (left ? (left + ' of ' + col.items.length + ' left this round') : 'round complete');
            }

            /* ---------- ui helpers ---------- */

            function toast(msg, isErr) {
                var el = $('spinner-toast');
                if (!el) return;
                el.textContent = msg;
                el.className = 'spn-toast spn-toast-on' + (isErr ? ' spn-toast-err' : '');
                if (state.toastTimer) clearTimeout(state.toastTimer);
                state.toastTimer = setTimeout(function () { el.className = 'spn-toast'; }, 4400);
            }

            function setStatus(id, msg, isErr) {
                var el = $(id);
                if (!el) return;
                el.textContent = msg || '';
                el.className = 'spn-status' + (isErr ? ' spn-err' : '');
            }

            function showView(name) {
                var views = { collections: $('spinner-view-collections'), addnew: $('spinner-view-new'), wheel: $('spinner-view-wheel') };
                for (var k in views) {
                    if (!views[k]) continue;
                    views[k].style.display = (k === name) ? (k === 'wheel' ? 'flex' : 'block') : 'none';
                }
                if (name === 'addnew') refreshPrompt();
            }

            function openTool() {
                var ov = $('spinner-overlay');
                if (!ov) return;
                renderSaved();
                if (!state.current) {
                    var cols = saved();
                    if (cols.length) {
                        var wanted = lastCollectionId();
                        var found = null;
                        for (var i = 0; i < cols.length; i++) { if (cols[i].id === wanted) found = cols[i]; }
                        useCollection((found || cols[cols.length - 1]).id);
                    } else {
                        showView('collections');
                    }
                }
                ov.style.display = 'flex';
                document.body.classList.add('spn-open');
                audioCtx();
            }

            function closeTool() {
                var ov = $('spinner-overlay');
                if (ov) ov.style.display = 'none';
                stopCard(true);
                document.body.classList.remove('spn-open');
            }

            function isOpen() {
                var ov = $('spinner-overlay');
                return !!ov && ov.style.display === 'flex';
            }

            /* ---------- collections ui ---------- */

            function itemsHostId(colId) { return 'spinner-items-' + colId; }

            /*
             * Passive list of one collection's items, opened from its card. A
             * right-click (or a long press on a touch screen) toggles which item
             * the next armed spin lands on. Every row is built identically and the
             * only difference is a faint dot, so an open list reveals nothing.
             */
            function renderItems(col) {
                if (!col) return;
                var host = $(itemsHostId(col.id));
                if (!host) return;
                host.innerHTML = '';
                var marked = markedIndex(col);
                for (var i = 0; i < col.items.length; i++) {
                    (function (idx) {
                        var it = col.items[idx];
                        var row = document.createElement('div');
                        row.className = 'spn-item';
                        var emo = document.createElement('span');
                        emo.className = 'spn-item-emoji';
                        emo.textContent = it.emoji || '';
                        var title = document.createElement('span');
                        title.className = 'spn-item-title';
                        title.textContent = it.title || it.instruction || '';
                        var dot = document.createElement('span');
                        dot.className = 'spn-item-dot';
                        if (idx === marked) dot.style.background = 'rgba(216,180,90,0.55)';
                        row.appendChild(emo);
                        row.appendChild(title);
                        row.appendChild(dot);
                        row.addEventListener('contextmenu', function (e) {
                            e.preventDefault();
                            toggleMark(col, idx);
                        });
                        var press = 0;
                        row.addEventListener('touchstart', function () {
                            press = setTimeout(function () { press = -1; toggleMark(col, idx); }, 550);
                        }, { passive: true });
                        row.addEventListener('touchend', function () { if (press && press !== -1) clearTimeout(press); press = 0; });
                        row.addEventListener('touchmove', function () { if (press && press !== -1) clearTimeout(press); press = 0; });
                        host.appendChild(row);
                    })(i);
                }
            }

            function renderSaved() {
                renderUndo();
                var list = $('spinner-saved-list');
                var cols = saved();
                var countEl = $('spinner-saved-count');
                if (countEl) countEl.textContent = String(cols.length);
                var sel = $('spinner-collection-select');
                if (sel) {
                    var opts = ['<option value="">' + (cols.length ? 'Choose a collection' : 'No collection') + '</option>'];
                    for (var i = 0; i < cols.length; i++) {
                        opts.push('<option value="' + esc(cols[i].id) + '">' + esc(cols[i].emoji + '  ' + cols[i].name + ' · ' + cols[i].items.length) + '</option>');
                    }
                    sel.innerHTML = opts.join('');
                    sel.value = state.current ? state.current.id : '';
                }
                var sub = $('spinner-brand-sub');
                if (sub) sub.textContent = state.current ? (state.current.name + ' · ' + state.current.items.length + ' items') : 'No collection loaded';
                if (!list) return;
                if (!cols.length) {
                    list.innerHTML = '<div class="spn-empty">No collections yet.<br>Drop a JSON file, paste one — or open <b>Load JSON</b> to copy the ready-made AI prompt.</div>';
                    return;
                }
                var ordered = cols.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
                list.innerHTML = '';
                for (var j = 0; j < ordered.length; j++) {
                    (function (col) {
                        var card = document.createElement('div');
                        card.className = 'spn-card' + (state.current && state.current.id === col.id ? ' spn-active' : '');
                        var emo = document.createElement('span');
                        emo.className = 'spn-card-emoji';
                        emo.textContent = col.emoji;
                        var body = document.createElement('div');
                        body.className = 'spn-card-body';
                        var name = document.createElement('div');
                        name.className = 'spn-card-name';
                        name.textContent = col.name;
                        var meta = document.createElement('div');
                        meta.className = 'spn-card-meta';
                        meta.textContent = col.items.length + ' item' + (col.items.length === 1 ? '' : 's');
                        body.appendChild(name);
                        body.appendChild(meta);
                        var actions = document.createElement('div');
                        actions.className = 'spn-card-actions';
                        var useBtn = document.createElement('button');
                        useBtn.type = 'button';
                        useBtn.className = 'spn-btn spn-btn-primary';
                        useBtn.textContent = 'Use';
                        useBtn.onclick = function () { useCollection(col.id); };
                        var expBtn = document.createElement('button');
                        expBtn.type = 'button';
                        expBtn.className = 'spn-btn spn-btn-ghost';
                        expBtn.textContent = 'Export';
                        expBtn.onclick = function () { exportCollection(col); };
                        var renBtn = document.createElement('button');
                        renBtn.type = 'button';
                        renBtn.className = 'spn-btn spn-btn-ghost';
                        renBtn.textContent = 'Rename';
                        renBtn.onclick = function () { renameCollection(col.id); };
                        var delBtn = document.createElement('button');
                        delBtn.type = 'button';
                        delBtn.className = 'spn-btn spn-btn-ghost';
                        delBtn.textContent = 'Delete';
                        delBtn.onclick = function () { deleteCollection(col.id); };
                        var itemsBtn = document.createElement('button');
                        itemsBtn.type = 'button';
                        itemsBtn.className = 'spn-btn spn-btn-ghost';
                        itemsBtn.textContent = 'Items';
                        var itemsBox = document.createElement('div');
                        itemsBox.className = 'spn-items';
                        itemsBox.id = itemsHostId(col.id);
                        var showItems = openItemsId === col.id;
                        itemsBox.style.display = showItems ? 'block' : 'none';
                        if (showItems) card.className += ' spn-card-open';
                        itemsBtn.onclick = function () {
                            var open = openItemsId !== col.id;
                            openItemsId = open ? col.id : '';
                            itemsBox.style.display = open ? 'block' : 'none';
                            card.className = 'spn-card' + (state.current && state.current.id === col.id ? ' spn-active' : '') + (open ? ' spn-card-open' : '');
                            if (open) renderItems(col);
                            else itemsBox.innerHTML = '';
                        };
                        actions.appendChild(useBtn);
                        actions.appendChild(expBtn);
                        actions.appendChild(renBtn);
                        actions.appendChild(itemsBtn);
                        actions.appendChild(delBtn);
                        card.appendChild(emo);
                        card.appendChild(body);
                        card.appendChild(actions);
                        card.appendChild(itemsBox);
                        list.appendChild(card);
                        if (showItems) renderItems(col);
                    })(ordered[j]);
                }
            }

            function renameCollection(id) {
                var cols = saved();
                for (var i = 0; i < cols.length; i++) {
                    if (cols[i].id !== id) continue;
                    var current = cols[i].name;
                    var next = window.prompt('Collection name', current);
                    if (next == null) return;
                    next = String(next).trim();
                    if (!next) return;
                    cols[i].name = next.slice(0, 90);
                    cols[i].updatedAt = Date.now();
                    persist();
                    renderSaved();
                    toast('Renamed to "' + cols[i].name + '"');
                    return;
                }
            }

            function deleteCollection(id) {
                var cols = saved();
                var out = [];
                var removed = null;
                for (var i = 0; i < cols.length; i++) {
                    if (cols[i].id === id) removed = cols[i];
                    else out.push(cols[i]);
                }
                if (!removed) return;
                if (!window.confirm('Delete "' + removed.name + '" (' + removed.items.length + ' items)?')) return;
                state.collections = out;
                persist();
                if (state.current && state.current.id === id) {
                    state.current = null;
                    state.itemIndex = -1;
                    if (out.length) useCollection(out[out.length - 1].id);
                    else { showView('collections'); renderSaved(); }
                } else {
                    renderSaved();
                }
                toast('Deleted "' + removed.name + '"');
            }

            function collectionJson(col) {
                var items = [];
                for (var i = 0; i < col.items.length; i++) {
                    var it = col.items[i];
                    var art = cardArt(it);
                    var entry = {
                        emoji: it.emoji,
                        title: it.title,
                        instruction: it.instruction,
                        duration: Math.round(it.duration || 0),
                        image: art.still,
                        gif: art.gif,
                        video: art.video || art.embed,
                        poster: it.poster,
                        audio: it.audio,
                        sfx: it.sfx,
                        resource: it.resource,
                        color: it.accent
                    };
                    // Only ever written when it is actually set, so exports of an
                    // ordinary collection stay byte-for-byte what they were.
                    if (num(it.weight) > 0) entry.weight = num(it.weight);
                    items.push(entry);
                }
                return { name: col.name, emoji: col.emoji, items: items };
            }

            function allCollectionsJson(pretty) {
                var cols = saved();
                var out = [];
                for (var i = 0; i < cols.length; i++) out.push(collectionJson(cols[i]));
                return JSON.stringify({ collections: out }, null, pretty ? 2 : 1);
            }

            function exportCollection(col) {
                var text = JSON.stringify(collectionJson(col), null, 2);
                downloadText(text, safeName(col.name) + '.json');
            }

            function safeName(name) {
                return (String(name || 'collection').replace(/[^a-z0-9\\-_ ]/gi, '').trim() || 'collection');
            }

            function downloadText(text, filename) {
                downloadPlain(text, filename, 'application/json');
            }

            function downloadPlain(text, filename, mime) {
                try {
                    var blob = new Blob([text], { type: mime || 'text/plain' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
                } catch (e) {
                    toast('Download is not available here.', true);
                }
            }

            function useCollection(id) {
                var cols = saved();
                for (var i = 0; i < cols.length; i++) {
                    if (cols[i].id !== id) continue;
                    state.current = cols[i];
                    state.itemIndex = -1;
                    rememberCollection(id);
                    renderSaved();
                    renderWheel();
                    resetCard();
                    setSpinHint();
                    showView('wheel');
                    return;
                }
            }

            /* ---------- wheel ---------- */

            /* One flat tone for every section: no light streaks, no rainbow. */
            var SEGMENT_TONE = '#1c2028';

            function chipSize(n) {
                if (n <= 8) return 44;
                if (n <= 12) return 38;
                if (n <= 18) return 32;
                if (n <= 24) return 27;
                return 22;
            }

            function segColor() {
                return SEGMENT_TONE;
            }

            function renderWheel() {
                var wheel = $('spinner-wheel');
                var face = $('spinner-wheel-face');
                var band = $('spinner-wheel-band');
                var wedge = $('spinner-wheel-wedge');
                var chips = $('spinner-chips');
                var hub = $('spinner-hub-emoji');
                if (!wheel || !face || !chips) return;
                var col = state.current;
                if (wedge) { wedge.className = 'spn-wheel-wedge'; wedge.style.background = 'none'; wedge.style.boxShadow = 'none'; }
                if (!col || !col.items.length) {
                    face.style.background = SEGMENT_TONE;
                    face.setAttribute('data-segments', '0');
                    if (band) band.style.background = 'none';
                    chips.innerHTML = '';
                    if (hub) hub.textContent = '🎯';
                    wheel.style.transform = 'rotate(0deg)';
                    return;
                }
                var items = col.items;
                var n = items.length;
                var step = 360 / n;
                face.style.background = segColor();
                face.setAttribute('data-segments', String(n));
                if (band) {
                    if (step >= 6) {
                        var line = Math.min(0.5, Math.max(0.18, step * 0.06));
                        band.style.background = 'repeating-conic-gradient(from 0deg, rgba(224,196,120,0.5) 0deg ' + line.toFixed(3) + 'deg, rgba(0,0,0,0) ' + line.toFixed(3) + 'deg ' + step.toFixed(4) + 'deg)';
                    } else {
                        band.style.background = 'none';
                    }
                }
                var size = chipSize(n);
                wheel.style.setProperty('--spn-chip', size + 'px');
                var showChips = n <= 30;
                chips.className = 'spn-chips' + (showChips ? '' : ' spn-chips-off');
                if (!showChips) { chips.innerHTML = ''; return; }
                var out = [];
                for (var j = 0; j < n; j++) {
                    var ang = j * step + step / 2;
                    out.push('<span class="spn-chip" style="transform: rotate(' + ang.toFixed(4) + 'deg) translateY(calc(-1 * var(--spn-r))) rotate(' + (-ang).toFixed(4) + 'deg);">' + esc(items[j].emoji) + '</span>');
                }
                chips.innerHTML = out.join('');
            }

            function markWinningChip(idx) {
                var chips = $('spinner-chips');
                if (!chips) return;
                var all = chips.querySelectorAll('.spn-chip');
                for (var i = 0; i < all.length; i++) {
                    all[i].className = (i === idx) ? 'spn-chip spn-chip-win' : 'spn-chip';
                }
            }

            function markWinningSegment(idx) {
                var wedge = $('spinner-wheel-wedge');
                var col = state.current;
                if (!wedge || !col || !col.items.length) return;
                var n = col.items.length;
                var step = 360 / n;
                var arc = Math.max(step, 2.4);
                var start = idx * step + (step - arc) / 2;
                wedge.style.background = 'conic-gradient(from ' + start.toFixed(4) + 'deg, rgba(255,238,196,0.42) 0deg ' + arc.toFixed(4) + 'deg, rgba(0,0,0,0) ' + arc.toFixed(4) + 'deg 360deg)';
                wedge.style.boxShadow = 'inset 0 0 44px rgba(255,236,190,0.28)';
                wedge.className = 'spn-wheel-wedge spn-wedge-on';
                markWinningChip(idx);
            }

            function clearWinningSegment() {
                var wedge = $('spinner-wheel-wedge');
                if (wedge) { wedge.className = 'spn-wheel-wedge'; wedge.style.boxShadow = 'none'; }
                var chips = $('spinner-chips');
                if (!chips) return;
                var all = chips.querySelectorAll('.spn-chip');
                for (var i = 0; i < all.length; i++) all[i].className = 'spn-chip';
            }

            function setSpinHint() {
                var mini = $('spinner-mini');
                if (!mini) return;
                var col = state.current;
                if (!col || !col.items.length) { mini.textContent = 'Load a collection to start.'; return; }
                var left = leftThisRound(col);
                var round = (left ? left + ' of ' + col.items.length + ' left' : 'new round next spin');
                if (state.itemIndex >= 0) { mini.textContent = col.name + ' · ' + round + ' · press Start on the card'; return; }
                mini.textContent = col.name + ' · ' + col.items.length + ' item' + (col.items.length === 1 ? '' : 's') + ' · ' + round + ' · press Spin';
            }

            function setButtons(spinning) {
                var spinBtn = $('spinner-spin-btn');
                if (spinBtn) { spinBtn.disabled = spinning; spinBtn.textContent = spinning ? 'Spinning' : 'Spin'; }
            }

            function startCountdown(next) {
                var wrap = $('spinner-countdown');
                var numEl = $('spinner-countdown-num');
                if (!wrap || !numEl) { next(); return; }
                var seq = ['3', '2', '1', 'Spin'];
                var i = 0;
                wrap.style.display = 'flex';
                function step() {
                    if (i >= seq.length) {
                        wrap.style.display = 'none';
                        next();
                        return;
                    }
                    numEl.textContent = seq[i];
                    numEl.style.animation = 'none';
                    void numEl.offsetWidth;
                    numEl.style.animation = '';
                    tone(i === seq.length - 1 ? 880 : 480 + i * 90, 0.16, 'sine', 0.07);
                    i++;
                    setTimeout(step, i === seq.length ? 340 : 460);
                }
                step();
            }

            function spin(forcedIndex) {
                var col = state.current;
                if (!col || !col.items.length) {
                    toast('Load a collection first.', true);
                    showView('collections');
                    return;
                }
                if (state.spinning) return;
                if (state.watchdog) { clearTimeout(state.watchdog); state.watchdog = 0; }
                stopCard(false);
                var items = col.items;
                var n = items.length;
                var step = 360 / n;
                var idx = nextIndex(col, forcedIndex);
                state.spinning = true;
                state.itemIndex = idx;
                setButtons(true);
                clearWinningSegment();
                var hub = $('spinner-hub-emoji');
                if (hub) hub.textContent = '·';
                var revealCard = $('spinner-tarot');
                if (revealCard) revealCard.classList.remove('spn-hit');
                var targetMod = (((-(idx * step + step / 2) + (randFloat() - 0.5) * step * 0.3) % 360) + 360) % 360;
                var turns = 5 + Math.floor(randFloat() * 4);
                var from = state.rotation;
                var curMod = ((from % 360) + 360) % 360;
                var delta = ((targetMod - curMod) % 360 + 360) % 360;
                var to = from + turns * 360 + delta;
                var dur = 4200 + Math.min(2600, n * 30);
                startCountdown(function () { runSpin(from, to, dur, step, idx); });
            }

            function runSpin(from, to, dur, step, idx) {
                var wheel = $('spinner-wheel');
                var stage = $('spinner-stage');
                if (!wheel) return;
                if (stage) stage.classList.add('spn-spinning');
                whoosh();
                if (navigator.vibrate) { try { navigator.vibrate([18, 26, 18]); } catch (e) {} }
                if (state.watchdog) { clearTimeout(state.watchdog); state.watchdog = 0; }
                state.watchdog = setTimeout(function () {
                    if (!state.spinning) return;
                    if (state.raf) { try { cancelAnimationFrame(state.raf); } catch (e) {} state.raf = 0; }
                    state.rotation = to;
                    wheel.style.filter = '';
                    wheel.style.transform = 'rotate(' + to.toFixed(3) + 'deg)';
                    endSpin(idx);
                }, dur + 900);
                var t0 = performance.now();
                var last = from;
                var lastTick = from;
                function frame(now) {
                    var t = Math.min(1, (now - t0) / dur);
                    var e = 1 - Math.pow(1 - t, 4.05);
                    var rot = from + (to - from) * e;
                    var speed = rot - last;
                    last = rot;
                    state.rotation = rot;
                    wheel.style.transform = 'rotate(' + rot.toFixed(3) + 'deg)';
                    var blur = speed > 26 ? 3.2 : (speed > 14 ? 1.7 : (speed > 6 ? 0.6 : 0));
                    wheel.style.filter = blur ? 'blur(' + blur.toFixed(1) + 'px)' : '';
                    var passed = Math.floor((rot - lastTick) / step);
                    if (passed > 0) { lastTick += passed * step; tickSound(Math.min(60, speed)); }
                    if (t < 1) { state.raf = requestAnimationFrame(frame); }
                    else {
                        wheel.style.filter = '';
                        if (state.raf) { try { cancelAnimationFrame(state.raf); } catch (e) {} state.raf = 0; }
                        endSpin(idx);
                    }
                }
                if (state.raf) { try { cancelAnimationFrame(state.raf); } catch (e) {} }
                state.raf = requestAnimationFrame(frame);
            }

            function endSpin(idx) {
                state.spinning = false;
                if (state.watchdog) { clearTimeout(state.watchdog); state.watchdog = 0; }
                var stage = $('spinner-stage');
                if (stage) stage.classList.remove('spn-spinning');
                var col = state.current;
                if (!col || !col.items.length) { setButtons(false); return; }
                var item = col.items[Math.max(0, Math.min(col.items.length - 1, idx))];
                state.itemIndex = Math.max(0, Math.min(col.items.length - 1, idx));
                markWinningSegment(state.itemIndex);
                var hub = $('spinner-hub-emoji');
                if (hub) hub.textContent = item.emoji;
                var hubWrap = document.querySelector('.spn-hub');
                if (hubWrap) {
                    hubWrap.classList.remove('spn-hub-hit');
                    void hubWrap.offsetWidth;
                    hubWrap.classList.add('spn-hub-hit');
                }
                var flash = $('spinner-flash');
                if (flash) {
                    flash.classList.remove('spn-flash-on');
                    void flash.offsetWidth;
                    flash.classList.add('spn-flash-on');
                    setTimeout(function () { flash.classList.remove('spn-flash-on'); }, 700);
                }
                boom();
                dust(46);
                playSfx(item.sfx);
                renderCard(item, true);
                setButtons(false);
                setSpinHint();
            }

            /* ---------- the drawn card ---------- */

            function cardArt(item) {
                var out = { still: '', gif: '', video: '', embed: '' };
                if (!item) return out;
                for (var i = 0; i < item.media.length; i++) {
                    var u = item.media[i];
                    if (isEmbedUrl(u)) { if (!out.embed) out.embed = u; }
                    else if (isVideoUrl(u)) { if (!out.video) out.video = u; }
                    else if (isGifUrl(u)) { if (!out.gif) out.gif = u; }
                    else if (!out.still) out.still = u;
                }
                return out;
            }

            function artNode(url) {
                if (!url) return null;
                var node;
                if (isEmbedUrl(url)) {
                    node = document.createElement('iframe');
                    node.src = embedSrc(url);
                    node.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
                    node.setAttribute('allowfullscreen', '');
                    node.setAttribute('frameborder', '0');
                    node.style.cssText = 'width:100%;height:100%;border:0;background:#05070a;';
                    return node;
                }
                if (isVideoUrl(url)) {
                    node = document.createElement('video');
                    node.src = url;
                    node.muted = true;
                    node.loop = true;
                    node.playsInline = true;
                    node.autoplay = true;
                    node.preload = 'metadata';
                    if (state.cardItem && state.cardItem.poster) node.poster = state.cardItem.poster;
                    return node;
                }
                node = document.createElement('img');
                node.src = url;
                node.alt = '';
                node.loading = 'lazy';
                node.onerror = function () { if (this.parentNode) this.parentNode.removeChild(this); };
                return node;
            }

            function setStage(node) {
                var stageEl = $('spinner-tarot-art');
                var stageWrap = $('spinner-tarot-stage');
                if (!stageEl) return;
                stageEl.innerHTML = '';
                if (node) {
                    stageEl.appendChild(node);
                    if (stageWrap) stageWrap.classList.remove('spn-stage-off');
                } else if (stageWrap) {
                    stageWrap.classList.add('spn-stage-off');
                }
            }

            function setCardBg(url) {
                var card = $('spinner-tarot');
                var bg = $('spinner-tarot-bg');
                if (!card || !bg) return;
                if (url) {
                    bg.style.backgroundImage = 'url("' + String(url).replace(/"/g, '%22') + '")';
                    card.classList.add('spn-has-bg');
                } else {
                    bg.style.backgroundImage = 'none';
                    card.classList.remove('spn-has-bg');
                }
            }

            function renderCard(item, isHit) {
                var card = $('spinner-tarot');
                if (!card || !item) return;
                state.cardItem = item;
                state.art = cardArt(item);
                card.style.setProperty('--spn-accent', item.accent || 'rgba(216,180,90,0.5)');
                var emojiEl = $('spinner-tarot-emoji');
                if (emojiEl) emojiEl.textContent = item.emoji;
                var kickerEl = $('spinner-tarot-kicker');
                if (kickerEl) kickerEl.textContent = 'Drawn';
                var titleEl = $('spinner-tarot-title');
                if (titleEl) titleEl.textContent = item.title || '';
                var instrEl = $('spinner-tarot-instr');
                if (instrEl) instrEl.textContent = item.instruction || '';
                var noteEl = $('spinner-tarot-note');
                if (noteEl) noteEl.textContent = item.note || '';
                renderTally(item);
                setCardBg(item.poster || state.art.still || '');
                var still = state.art.gif || state.art.still;
                if (still) setStage(artNode(still));
                else if (state.art.video) setStage(artNode(state.art.video));
                else setStage(null);
                var play = $('spinner-tarot-play');
                if (play) play.hidden = !state.art.embed;
                hideTimer();
                var startBtn = $('spinner-card-start-btn');
                if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start'; }
                var finishBtn = $('spinner-card-finish-btn');
                if (finishBtn) finishBtn.disabled = true;
                if (isHit) {
                    card.classList.remove('spn-hit');
                    void card.offsetWidth;
                    card.classList.add('spn-hit');
                }
            }

            function resetCard() {
                var card = $('spinner-tarot');
                if (card) { card.classList.remove('spn-casting', 'spn-hit'); card.style.removeProperty('--spn-accent'); }
                state.cardItem = null;
                state.art = null;
                setCardBg('');
                setStage(null);
                var play = $('spinner-tarot-play');
                if (play) play.hidden = true;
                var emojiEl = $('spinner-tarot-emoji');
                if (emojiEl) emojiEl.textContent = '🎯';
                var kickerEl = $('spinner-tarot-kicker');
                if (kickerEl) kickerEl.textContent = 'Waiting';
                var titleEl = $('spinner-tarot-title');
                if (titleEl) titleEl.textContent = 'Spin to draw';
                var instrEl = $('spinner-tarot-instr');
                if (instrEl) instrEl.textContent = 'Load a collection and spin the wheel.';
                var noteEl = $('spinner-tarot-note');
                if (noteEl) noteEl.textContent = '';
                var tallyEl = $('spinner-tarot-tally');
                if (tallyEl) tallyEl.textContent = '';
                hideTimer();
                var startBtn = $('spinner-card-start-btn');
                if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Start'; }
                var finishBtn = $('spinner-card-finish-btn');
                if (finishBtn) finishBtn.disabled = true;
            }

            function renderTimer() {
                var wrap = $('spinner-tarot-timer');
                var timeEl = $('spinner-tarot-time');
                var fill = $('spinner-tarot-fill');
                if (!wrap || !timeEl || !fill) return;
                wrap.hidden = false;
                var total = state.cardItem ? Math.round(state.cardItem.duration || 0) : 0;
                var left = Math.max(0, state.remaining);
                var m = Math.floor(left / 60);
                var s = left % 60;
                timeEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
                fill.style.width = (total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0).toFixed(2) + '%';
                timeEl.className = 'spn-tarot-time' + (left <= 10 && left > 0 ? ' spn-low' : '');
            }

            function hideTimer() {
                var wrap = $('spinner-tarot-timer');
                if (wrap) wrap.hidden = true;
            }

            function stopTimer() {
                if (state.timerId) { clearInterval(state.timerId); state.timerId = 0; }
            }

            function stopMusic() {
                if (!state.music) return;
                try { state.music.pause(); state.music.currentTime = 0; } catch (e) {}
                state.music = null;
            }

            function startCard() {
                var item = state.cardItem;
                if (!item || state.playing) return;
                var art = state.art || cardArt(item);
                var card = $('spinner-tarot');
                if (card) card.classList.add('spn-casting');
                state.playing = true;
                if (art.video) setStage(artNode(art.video));
                else if (art.gif) setStage(artNode(art.gif));
                if (art.embed) {
                    var play = $('spinner-tarot-play');
                    if (play) play.hidden = true;
                    setStage(artNode(art.embed));
                }
                if (item.audio) {
                    try {
                        stopMusic();
                        var a = document.createElement('audio');
                        a.src = item.audio;
                        a.loop = false;
                        a.volume = 0.9;
                        a.addEventListener('ended', function () {
                            if (state.playing) completeCard();
                        });
                        state.music = a;
                        var p = a.play();
                        if (p && p.catch) p.catch(function () {});
                    } catch (e) {}
                }
                stopTimer();
                if (item.duration > 0) {
                    state.remaining = Math.round(item.duration);
                    renderTimer();
                    state.timerId = setInterval(function () {
                        if (!state.playing) return;
                        state.remaining--;
                        renderTimer();
                        if (state.remaining > 0 && state.remaining <= 5) tone(660, 0.14, 'sine', 0.08);
                        if (state.remaining <= 0) completeCard();
                    }, 1000);
                } else {
                    state.remaining = 0;
                }
                var startBtn = $('spinner-card-start-btn');
                if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Running'; }
                var finishBtn = $('spinner-card-finish-btn');
                if (finishBtn) finishBtn.disabled = false;
            }

            function completeCard() {
                if (!state.playing) return;
                state.playing = false;
                stopTimer();
                stopMusic();
                var stageEl = $('spinner-tarot-art');
                if (stageEl) {
                    var vids = stageEl.querySelectorAll('video');
                    for (var i = 0; i < vids.length; i++) { try { vids[i].pause(); } catch (e) {} }
                }
                var card = $('spinner-tarot');
                if (card) card.classList.remove('spn-casting');
                chime();
                dust(60);
                var startBtn = $('spinner-card-start-btn');
                if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Replay'; }
                var finishBtn = $('spinner-card-finish-btn');
                if (finishBtn) finishBtn.disabled = false;
            }

            /* Stop whatever is playing and put the card back to its idle face. */
            function stopCard(reset) {
                state.playing = false;
                stopTimer();
                stopMusic();
                if (state.sfxEl) { try { state.sfxEl.pause(); } catch (e) {} }
                var stageEl = $('spinner-tarot-art');
                if (stageEl) {
                    var vids = stageEl.querySelectorAll('video');
                    for (var i = 0; i < vids.length; i++) { try { vids[i].pause(); } catch (e) {} }
                }
                var card = $('spinner-tarot');
                if (card) card.classList.remove('spn-casting');
                if (reset) {
                    resetCard();
                    clearWinningSegment();
                    state.itemIndex = -1;
                    var hub = $('spinner-hub-emoji');
                    if (hub) hub.textContent = '🎯';
                    setSpinHint();
                }
            }

            function finishCard() {
                stopCard(true);
                var startBtn = $('spinner-card-start-btn');
                if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Start'; }
                var finishBtn = $('spinner-card-finish-btn');
                if (finishBtn) finishBtn.disabled = true;
                toast('Back to the wheel.');
            }

            /* ---------- ai prompt ---------- */

            var PROMPT_HEAD = [
                'You are filling ONE JSON file for a spinner tool. Reply with the complete file.',
                '',
                'ABSOLUTE RULES',
                '1. JSON only: no markdown fences, no commentary, no comments, no trailing commas.',
                '2. NEVER leave a media field empty. Every item must carry working, direct links: at least one of gif / video / image, plus a poster image, plus audio when music fits the item.',
                '3. Find and check the links BEFORE you write them. If you can browse, open or HEAD every url and keep only the ones that answer 200. If you cannot browse, use only exact urls you can reproduce character for character from memory, from hosts that serve files directly: upload.wikimedia.org, media.giphy.com, media.tenor.com, archive.org, cdn.pixabay.com, images.pexels.com.',
                '4. Never invent an id or a path, never link a search or gallery page, never use example.com or any placeholder domain, and never send an empty string.',
                '5. This is a FAILED reply. Never send anything like it:',
                '   {"emoji":"👕","title":"Lose One Layer","instruction":"Take off one layer.","duration":30,"image":"","gif":"","video":"","poster":"","audio":"","sfx":"","resource":""}',
                '6. If you cannot find media you trust for an idea, replace the idea with another one you can illustrate. An item without media is not acceptable.',
                '',
                'QUALITY AND QUANTITY',
                '- Write as many items as you can in one reply: 40 or more when the theme allows, never fewer than 20 unless I say otherwise.',
                '- If you reach your output limit, do not quietly shorten the file: stop and say "say continue" so I can ask for the rest.',
                '- Emoji: a DIFFERENT emoji for every item, chosen to match its meaning. Titles short, instructions one clear sentence.',
                '- If THEME, EXAMPLES or HOW MANY ITEMS below are blank, ask me for them in one short message first, then write the file.',
                '- Keep going after this file too: whenever I ask for more, keep the same quality and keep adding, as long as I keep asking.',
                '',
                'SCHEMA (return exactly this shape, only the content changes)',
                '{',
                '  "collections": [',
                '    {',
                '      "name": "Short collection name",',
                '      "emoji": "one emoji for the whole collection",',
                '      "items": [',
                '        {',
                '          "emoji": "one emoji for this item",',
                '          "title": "Short title (max 40 characters)",',
                '          "instruction": "One clear sentence telling the person exactly what to do",',
                '          "duration": 0,',
                '          "image": "direct .jpg or .png link",',
                '          "gif": "direct .gif link",',
                '          "video": "direct .mp4/.webm link, or a YouTube/Vimeo link",',
                '          "poster": "direct .jpg or .png link used as the card backdrop",',
                '          "audio": "direct .mp3/.ogg link, played once from Start to Finish",',
                '          "sfx": "very short .mp3 link for the moment the wheel lands",',
                '          "resource": "optional extra https link",',
                '          "color": "#c9a227"',
                '        }',
                '      ]',
                '    }',
                '  ]',
                '}',
                '',
                'FIELD RULES',
                '- duration: seconds for the on-screen timer (0 = no timer, for example when the item ends by itself because the music stops).',
                '- gif: the best visual for a physical action. video: a direct file plays in the card, a YouTube / Vimeo link gets a Play button.',
                '- audio: pick a track whose length matches the item when the item lasts as long as the music.',
                '- color: a refined accent hex colour per item (muted gold, deep teal, oxblood...).',
                '- Link the media to the meaning of the item: the music should fit the mood, the gif should show the action.',
                '',
                'CONTENT RULES',
                '- Safe, legal, quick, doable in a room. No dangerous, humiliating or illegal content.',
                '- Every item different from all the others. Writing neutral and positive.'
            ].join('\\n');

            var PROMPT_ASK = [
                '',
                'WHAT I WANT THIS TIME',
                '1. Keep every collection and every item that is already in my file exactly as it is - same names, emojis, titles, instructions, media links and order. Do not drop, rename or shorten anything.',
                '2. Add at least one NEW collection on top of mine.',
                'THEME:',
                'EXAMPLES OF THE ITEMS I WANT:',
                'HOW MANY ITEMS:'
            ];

            var KEEP_HEAD = [
                '',
                'MY CURRENT FILE (this is everything I have so far - extend it, never replace it)',
                ''
            ].join('\\n');

            function inputValue(id) {
                var el = $(id);
                return el && el.value ? String(el.value).trim() : '';
            }

            function clip(text, max) {
                if (text.length <= max) return text;
                return text.slice(0, max) + '\\n... (my file continues; keep the rest of my collections intact too)';
            }

            function aiPrompt() {
                var theme = inputValue('spinner-new-theme');
                var examples = inputValue('spinner-new-examples');
                var count = inputValue('spinner-new-count');
                var ask = PROMPT_ASK.slice();
                for (var i = 0; i < ask.length; i++) {
                    if (ask[i].indexOf('THEME:') === 0) ask[i] = '3. THEME: ' + (theme || '(I have not said - ask me)');
                    else if (ask[i].indexOf('EXAMPLES OF THE ITEMS I WANT:') === 0) ask[i] = '4. EXAMPLES OF THE ITEMS I WANT: ' + (examples || '(I have not said - ask me for two or three examples)');
                    else if (ask[i].indexOf('HOW MANY ITEMS:') === 0) ask[i] = '5. HOW MANY ITEMS: ' + (count || '(I have not said - ask me, and if I do not care give me as many as you can)');
                }
                var head = PROMPT_HEAD + '\\n' + ask.join('\\n');
                var cols = saved();
                if (!cols.length) {
                    return head + '\\n' + KEEP_HEAD + '(empty - this is a brand new file, create the collections array from scratch)';
                }
                return head + '\\n' + KEEP_HEAD + clip(allCollectionsJson(true), 400000);
            }

            function refreshPrompt() {
                var ta = $('spinner-prompt-preview');
                if (ta) ta.value = aiPrompt();
            }

            function copyText(text, okMsg) {
                function done() { toast(okMsg || 'Copied'); }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
                } else {
                    legacyCopy(text);
                    done();
                }
            }

            function legacyCopy(text) {
                try {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                } catch (e) {}
            }

            /* ---------- loading ---------- */

            function repairJson(text) {
                var s = String(text == null ? '' : text).trim();
                if (!s) return '';
                s = s.replace(/^\\u0060\\u0060\\u0060(?:json)?/i, '').replace(/\\u0060\\u0060\\u0060\\s*$/, '');
                var first = s.search(/[\\[{]/);
                if (first > 0) s = s.slice(first);
                var lastObj = s.lastIndexOf('}');
                var lastArr = s.lastIndexOf(']');
                var last = Math.max(lastObj, lastArr);
                if (last >= 0) s = s.slice(0, last + 1);
                return s.trim();
            }

            function parseJson(text) {
                var raw = String(text == null ? '' : text);
                try { return JSON.parse(raw); } catch (e) {}
                var fixed = repairJson(raw);
                if (fixed) {
                    try { return JSON.parse(fixed); } catch (e2) {}
                }
                return null;
            }

            /* One file may hold a single collection or many. */
            function parsePayload(text) {
                var raw = parseJson(text);
                if (raw == null) return null;
                if (Array.isArray(raw)) {
                    var allCollections = raw.length > 0;
                    for (var i = 0; i < raw.length; i++) {
                        var el = raw[i];
                        if (!el || typeof el !== 'object' || Array.isArray(el) || !pickItems(el).length) { allCollections = false; break; }
                    }
                    if (allCollections) return { collections: raw };
                    return { collections: [{ items: raw }] };
                }
                if (typeof raw === 'object') {
                    for (var c = 0; c < COLLECTION_KEYS.length; c++) {
                        var inner = raw[COLLECTION_KEYS[c]];
                        if (Array.isArray(inner)) return { collections: inner };
                        if (inner && typeof inner === 'object' && pickItems(inner).length) return { collections: [inner] };
                    }
                    return { collections: [raw] };
                }
                return null;
            }

            function addCollection(raw, fallbackName, silent) {
                var col = normalizeCollection(raw, fallbackName);
                if (!col.items.length) {
                    if (!silent) toast('No usable items found in that JSON.', true);
                    return null;
                }
                var cols = saved();
                var replaced = false;
                for (var i = 0; i < cols.length; i++) {
                    if (cols[i].name.toLowerCase() === col.name.toLowerCase()) {
                        col.id = cols[i].id;
                        col.createdAt = cols[i].createdAt;
                        cols[i] = col;
                        replaced = true;
                        break;
                    }
                }
                if (!replaced) cols.push(col);
                persist();
                renderSaved();
                if (!silent) toast('Loaded ' + col.items.length + ' item' + (col.items.length === 1 ? '' : 's') + ' into "' + col.name + '"');
                useCollection(col.id);
                return col.id;
            }

            /*
             * Reads one JSON payload into the saved list.
             *
             * replaceAll mirrors the payload: the saved list is rebuilt from this
             * file alone, so a file loaded twice — or two files loaded in a row —
             * never stack duplicates on top of each other. Off, it merges by name
             * (the SpinnerTool.add API), which is the only path that adds.
             */
            function ingestPayload(text, filename, silent, replaceAll) {
                var payload = parsePayload(text);
                if (!payload) {
                    var msg = 'That text could not be read as JSON. Check for a missing comma, quote or bracket.';
                    setStatus('spinner-paste-status', msg, true);
                    setStatus('spinner-new-status', msg, true);
                    toast(msg, true);
                    return null;
                }
                var list = payload.collections || [];
                var base = replaceAll ? [] : null;
                var snapshotRaw = replaceAll ? storedCollections() : '';
                var snapshotCurrent = state.current ? state.current.id : '';
                var firstId = null;
                var totalItems = 0;
                var loaded = 0;
                var missing = 0;
                for (var i = 0; i < list.length; i++) {
                    var col = normalizeCollection(list[i], filename || '');
                    if (!col.items.length) continue;
                    var cols = base || saved();
                    var replaced = false;
                    for (var j = 0; j < cols.length; j++) {
                        if (cols[j].name.toLowerCase() === col.name.toLowerCase()) {
                            col.id = cols[j].id;
                            col.createdAt = cols[j].createdAt;
                            cols[j] = col;
                            replaced = true;
                            break;
                        }
                    }
                    if (!replaced) cols.push(col);
                    loaded++;
                    totalItems += col.items.length;
                    for (var m = 0; m < col.items.length; m++) {
                        if (!col.items[m].media.length) missing++;
                    }
                    if (!firstId) firstId = col.id;
                }
                if (!loaded) {
                    var none = 'No usable items found in that JSON.';
                    setStatus('spinner-new-status', none, true);
                    setStatus('spinner-paste-status', none, true);
                    toast(none, true);
                    return null;
                }
                if (base) {
                    pushUndo(snapshotRaw, snapshotCurrent, filename ? ('"' + filename + '"') : 'the pasted JSON');
                    state.collections = base;
                }
                persist();
                renderSaved();
                if (firstId) useCollection(firstId);
                var summary = loaded === 1
                    ? ('Loaded ' + totalItems + ' item' + (totalItems === 1 ? '' : 's'))
                    : ('Loaded ' + loaded + ' collections · ' + totalItems + ' items');
                if (base) summary += ' · saved list replaced (Undo is in Collections)';
                if (missing) {
                    var warn = missing + ' of ' + totalItems + ' item' + (totalItems === 1 ? '' : 's') + ' have no image, gif or video link - the cards will be plain. Ask the AI for working links before you use this file.';
                    summary += ' · ' + missing + ' without media';
                    setStatus('spinner-new-status', warn, true);
                    setStatus('spinner-paste-status', warn, true);
                    if (!silent) toast(summary, true);
                } else {
                    setStatus('spinner-new-status', 'Every item has media. Ready.');
                    setStatus('spinner-paste-status', 'Every item has media. Ready.');
                    if (!silent) toast(summary);
                }
                return firstId;
            }

            function readFile(file, done) {
                try {
                    var fr = new FileReader();
                    fr.onload = function () { done(String(fr.result || ''), file.name); };
                    fr.onerror = function () { done('', file.name); };
                    fr.readAsText(file);
                } catch (e) { done('', file.name || ''); }
            }

            /*
             * Files are read first, then loaded in order: the first one that reads
             * replaces the saved list and any further file of the same drop joins it.
             * Nothing from an earlier load survives, so re-loading a file is a no-op
             * instead of a second copy of every item.
             */
            function handleFiles(files) {
                if (!files || !files.length) return;
                var list = [];
                for (var i = 0; i < files.length; i++) list.push(files[i]);
                var texts = new Array(list.length);
                var pending = list.length;
                var failed = [];
                for (var j = 0; j < list.length; j++) {
                    (function (idx) {
                        readFile(list[idx], function (text, name) {
                            texts[idx] = text;
                            if (!text) failed.push(name || 'that file');
                            pending--;
                            if (pending) return;
                            var replaced = false;
                            for (var k = 0; k < list.length; k++) {
                                if (!texts[k]) continue;
                                var id = ingestPayload(texts[k], list[k].name, false, !replaced);
                                if (id) replaced = true;
                            }
                            if (failed.length && replaced) toast('Could not read ' + failed.join(', '), true);
                        });
                    })(j);
                }
            }

            /* ---------- wiring ---------- */

            function wire() {
                var ov = $('spinner-overlay');
                if (!ov) return;
                function on(id, ev, fn) {
                    var el = $(id);
                    if (el) el.addEventListener(ev, fn);
                }
                on('spinner-close-btn', 'click', function () { closeTool(); });
                on('spinner-collections-btn', 'click', function () { renderSaved(); showView('collections'); });
                on('spinner-undo-btn', 'click', function () { undoLoad(); });
                on('spinner-addnew-btn', 'click', function () {
                    ['spinner-new-name', 'spinner-new-theme', 'spinner-new-examples', 'spinner-new-count'].forEach(function (id) {
                        var el = $(id);
                        if (el) el.value = '';
                    });
                    var area = $('spinner-new-area');
                    if (area) area.value = '';
                    setStatus('spinner-new-status', '');
                    setStatus('spinner-prompt-status', '');
                    showView('addnew');
                });
                on('spinner-new-back-btn', 'click', function () { showView(state.current ? 'wheel' : 'collections'); });
                on('spinner-spin-btn', 'click', function () { spinNow(); });
                on('spinner-card-start-btn', 'click', function () { startCard(); });
                on('spinner-card-finish-btn', 'click', function () { finishCard(); });
                on('spinner-tarot-play', 'click', function () { startCard(); });
                var wheel = $('spinner-wheel');
                if (wheel) wheel.addEventListener('click', function () { spinNow(); });
                // Right-clicking a segment toggles which item the next armed spin draws.
                var chips = $('spinner-chips');
                if (chips) chips.addEventListener('contextmenu', function (e) {
                    var el = e.target && e.target.closest ? e.target.closest('.spn-chip') : null;
                    if (!el) return;
                    e.preventDefault();
                    var all = chips.querySelectorAll('.spn-chip');
                    var idx = -1;
                    for (var i = 0; i < all.length; i++) { if (all[i] === el) { idx = i; break; } }
                    if (idx >= 0) toggleMark(state.current, idx);
                });
                on('spinner-paste-toggle-btn', 'click', function () {
                    var wrap = $('spinner-paste-wrap');
                    if (!wrap) return;
                    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
                });
                on('spinner-paste-clear-btn', 'click', function () {
                    var area = $('spinner-paste-area');
                    if (area) area.value = '';
                    setStatus('spinner-paste-status', '');
                });
                on('spinner-paste-load-btn', 'click', function () {
                    var area = $('spinner-paste-area');
                    if (!area || !area.value.trim()) { setStatus('spinner-paste-status', 'Paste the JSON first.', true); return; }
                    var id = ingestPayload(area.value, '', false, true);
                    if (id) {
                        setStatus('spinner-paste-status', 'Loaded — the saved list now matches this JSON.');
                        showView('wheel');
                    }
                });
                on('spinner-browse-btn', 'click', function () { var f = $('spinner-file-input'); if (f) f.click(); });
                on('spinner-file-input', 'change', function (e) { handleFiles(e.target.files); e.target.value = ''; });
                on('spinner-new-browse-btn', 'click', function () { var f = $('spinner-new-file'); if (f) f.click(); });
                on('spinner-new-file', 'change', function (e) {
                    var file = e.target.files && e.target.files[0];
                    if (!file) return;
                    readFile(file, function (text) {
                        var area = $('spinner-new-area');
                        if (area) area.value = text;
                        setStatus('spinner-new-status', 'File loaded into the box — press Check & save.');
                        var nameEl = $('spinner-new-name');
                        if (nameEl && !nameEl.value) nameEl.value = String(file.name).replace(/[.]json$/i, '');
                    });
                    e.target.value = '';
                });
                on('spinner-new-save-btn', 'click', function () {
                    var area = $('spinner-new-area');
                    if (!area || !area.value.trim()) { setStatus('spinner-new-status', 'Paste the JSON first.', true); return; }
                    var nameEl = $('spinner-new-name');
                    var name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : '';
                    var id = ingestPayload(area.value, name, false, true);
                    if (id) {
                        setStatus('spinner-new-status', 'Saved — the saved list now matches this JSON.');
                        showView('wheel');
                    }
                });
                on('spinner-copy-prompt-btn', 'click', function () { copyText(aiPrompt(), 'AI prompt copied — paste it into any AI'); });
                on('spinner-prompt-btn', 'click', function () { copyText(aiPrompt(), 'AI prompt copied — paste it into any AI'); });
                on('spinner-export-all-btn', 'click', function () {
                    if (!saved().length) { toast('Nothing to copy yet.', true); return; }
                    copyText(allCollectionsJson(true), 'All collections copied as one JSON file');
                });
                on('spinner-download-prompt-btn', 'click', function () { downloadPlain(aiPrompt(), 'spinner-prompt.txt', 'text/plain'); });
                ['spinner-new-theme', 'spinner-new-examples', 'spinner-new-count', 'spinner-new-name'].forEach(function (id) {
                    on(id, 'input', refreshPrompt);
                });
                on('spinner-collection-select', 'change', function (e) {
                    if (e.target.value) useCollection(e.target.value);
                });
                ['dragover', 'dragenter'].forEach(function (evt) {
                    ov.addEventListener(evt, function (e) {
                        e.preventDefault();
                        var zone = $('spinner-drop-zone');
                        if (zone) zone.classList.add('spn-over');
                    });
                });
                ['dragleave', 'dragend'].forEach(function (evt) {
                    ov.addEventListener(evt, function () {
                        var zone = $('spinner-drop-zone');
                        if (zone) zone.classList.remove('spn-over');
                    });
                });
                ov.addEventListener('drop', function (e) {
                    e.preventDefault();
                    var zone = $('spinner-drop-zone');
                    if (zone) zone.classList.remove('spn-over');
                    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
                });
                document.addEventListener('keydown', function (e) {
                    if (!isOpen()) return;
                    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
                    if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
                    if (e.key === 'Escape') { closeTool(); return; }
                    if (e.key === ' ' || e.key === 'Enter') {
                        if (state.playing) { e.preventDefault(); finishCard(); return; }
                        if (state.cardItem) { e.preventDefault(); startCard(); return; }
                        e.preventDefault();
                        spinNow();
                        return;
                    }
                    // Silent arm for the next spin: no toast, no flash, no sound.
                    if (keyPressed(e)) { state.armed = true; }
                });
            }

            function boot() {
                var ov = $('spinner-overlay');
                if (!ov) return;
                if (state.booted) {
                    /*
                     * Re-read storage, but keep pointing at the same collection.
                     * Reloading without re-pointing leaves state.current on a copy
                     * that is no longer saved, so a mark or a round counter set
                     * through the API would be written into a discarded object and
                     * silently lost on the next load.
                     */
                    var wanted = state.current ? state.current.id : '';
                    loadSaved();
                    state.current = null;
                    if (wanted) {
                        var cols = saved();
                        for (var i = 0; i < cols.length; i++) {
                            if (cols[i].id === wanted) { state.current = cols[i]; break; }
                        }
                    }
                    renderSaved();
                    return;
                }
                state.booted = true;
                wire();
                loadSaved();
                renderSaved();
            }

            window.SpinnerTool = {
                open: function () { boot(); openTool(); },
                close: closeTool,
                isOpen: isOpen,
                collections: function () { loadSaved(); return saved(); },
                add: function (raw, name) { boot(); return addCollection(raw, name); },
                loadJson: function (text, name) { boot(); return ingestPayload(text, name, false, true); },
                undoLoad: function () { boot(); return undoLoad(); },
                canUndo: function () { return undoStack().length; },
                use: function (id) { useCollection(id); },
                current: function () { return state.current; },
                items: function () { return state.current ? state.current.items : []; },
                spin: function () { boot(); spinNow(); },
                arm: function () { state.armed = true; },
                armed: function () { return !!state.armed; },
                key: function (k) { return k === undefined ? triggerKey() : setTriggerKey(k); },
                mark: function (target) { boot(); return apiMark(target); },
                marked: function () { return apiMarked(); },
                spinTo: function (i) { boot(); spin(i); },
                item: function () { return state.current && state.itemIndex >= 0 ? state.current.items[state.itemIndex] : null; },
                start: startCard,
                finish: finishCard,
                isPlaying: function () { return state.playing; },
                cardItem: function () { return state.cardItem; },
                remaining: function () { return state.remaining; },
                art: function () { return state.art; },
                prompt: function () { return aiPrompt(); },
                promptHead: function () { return PROMPT_HEAD; },
                tally: function () {
                    var col = state.current;
                    if (!col) return null;
                    return { drawn: col.drawn || {}, seen: (col.seen || []).slice(), left: leftThisRound(col), total: col.items.length };
                },
                all: function () { return allCollectionsJson(true); },
                remove: function (id) { boot(); deleteCollection(id); },
                renderWheel: renderWheel,
                resetCard: resetCard
            };
            window.openSpinnerTool = function () { window.SpinnerTool.open(); };

            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
            else boot();
        })();
    `;

    return { html, css, js };
};
