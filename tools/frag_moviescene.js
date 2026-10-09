  // ===== MOVIE SCENE / CONVERSATION ROLEPLAY (guided scene player) =====
  function initMovieScene() {
    document.querySelectorAll('.js-movie-scene').forEach(el => {
      if (el.dataset.init) return;
      const data = safeJson(el.dataset.content);
      if (!data) return;
      const lines = (data.lines || data.dialogue || []).filter(l => l && (l.text || l.line));
      if (!lines.length) {
        el.innerHTML = '<p style="color:var(--theme-text-secondary);">No scene lines found. Content JSON needs {"lines":[{"speaker":"Maya","text":"…"}]}.</p>';
        el.dataset.init = 'true';
        return;
      }
      const xp = parseInt(el.dataset.xp || '50', 10);
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));
      const isUserLine = (speaker) => /you|learner|student/i.test(String(speaker || ''));
      const recSupported = ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

      let idx = -1;          // -1 = idle
      let playing = false;

      let dotsHtml = '';
      lines.forEach((l, i) => { dotsHtml += '<span class="ms-dot' + (isUserLine(l.speaker) ? ' ms-dot-user' : '') + '" data-i="' + i + '"></span>'; });

      el.innerHTML =
        '<div class="ms-wrap">' +
          (data.setting || data.intro ? '<div class="ms-setting"><i class="fas fa-map-marker-alt"></i> ' + escFn(data.setting || data.intro) + '</div>' : '') +
          '<div class="ms-stage">' +
            '<div class="ms-progress">' + dotsHtml + '</div>' +
            '<div class="ms-beat">' +
              '<div class="ms-empty"><i class="fas fa-clapperboard" style="font-size:2rem;opacity:0.4;"></i><p>Ready to perform! Tap <b>Start scene</b> — you play one of the characters.</p></div>' +
              '<div class="ms-beat-body" style="display:none;">' +
                '<div class="ms-speaker"><span class="ms-avatar"></span><span class="ms-name"></span><span class="ms-mood"></span></div>' +
                '<div class="ms-line"></div>' +
                '<div class="ms-userhelp" style="display:none;"><i class="fas fa-microphone"></i> Your line — read it aloud! Words turn green as you say them.</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="ms-controls">' +
            '<button type="button" class="duo-btn-secondary ms-restart" title="Restart scene" style="display:none;">↺</button>' +
            '<button type="button" class="duo-btn ms-main">🎬 Start scene</button>' +
            '<button type="button" class="duo-btn-secondary ms-next" style="display:none;">Next ⏭</button>' +
          '</div>' +
          '<div class="ms-feedback" role="status" aria-live="polite"></div>' +
        '</div>';

      const q = (sel) => el.querySelector(sel);
      const beatBody = q('.ms-beat-body');
      const emptyState = q('.ms-empty');
      const avatarEl = q('.ms-avatar');
      const nameEl = q('.ms-name');
      const moodEl = q('.ms-mood');
      const lineEl = q('.ms-line');
      const userHelp = q('.ms-userhelp');
      const mainBtn = q('.ms-main');
      const nextBtn = q('.ms-next');
      const restartBtn = q('.ms-restart');
      const feed = q('.ms-feedback');
      const dots = el.querySelectorAll('.ms-dot');

      function renderDots() {
        dots.forEach((d, i) => {
          d.classList.toggle('done', i < idx);
          d.classList.toggle('current', i === idx);
        });
      }

      function renderLine(line) {
        const speaker = line.speaker || line.character || 'Narrator';
        const text = line.text || line.line || '';
        const user = isUserLine(speaker);
        avatarEl.textContent = speaker.trim().charAt(0).toUpperCase() || '?';
        avatarEl.className = 'ms-avatar' + (user ? ' ms-avatar-user' : '');
        nameEl.textContent = user ? speaker + ' (you)' : speaker;
        moodEl.textContent = line.mood ? '• ' + line.mood : '';
        userHelp.style.display = user ? '' : 'none';
        // Render words so speech recognition can light them up
        lineEl.innerHTML = text.split(' ').map(w => '<span class="ms-word">' + escFn(w) + '</span>').join(' ');
      }

      function advance() {
        playing = false;
        idx++;
        if (idx >= lines.length) {
          beatBody.style.display = 'none';
          emptyState.style.display = '';
          emptyState.innerHTML = '<div style="font-size:2.5rem;">🏆</div><p style="font-weight:800;">Scene complete — bravo!</p>';
          mainBtn.textContent = '↺ Play again';
          mainBtn.style.display = '';
          nextBtn.style.display = 'none';
          restartBtn.style.display = 'none';
          feed.innerHTML = '<span style="color:var(--theme-success);">✅ +' + xp + ' XP earned</span>';
          addXP(xp, true, null, null, 'speaking');
          markActivityComplete(el.id, xp, 100);
          triggerCelebration('🎬');
          return;
        }
        renderBeat();
      }

      function renderBeat() {
        const line = lines[idx];
        const user = isUserLine(line.speaker);
        emptyState.style.display = 'none';
        beatBody.style.display = '';
        renderLine(line);
        renderDots();
        restartBtn.style.display = '';
        nextBtn.style.display = '';
        if (user) {
          mainBtn.textContent = recSupported ? '🎙️ Say my line' : '✅ I said it';
          mainBtn.disabled = false;
        } else {
          mainBtn.textContent = '🔊 Listen';
          mainBtn.disabled = false;
        }
      }

      mainBtn.addEventListener('click', function() {
        if (idx === -1) { idx = 0; renderBeat(); return; }
        if (idx >= lines.length) { restartScene(); return; }
        const line = lines[idx];
        const text = line.text || line.line || '';
        if (isUserLine(line.speaker)) {
          if (recSupported) {
            mainBtn.disabled = true;
            mainBtn.textContent = '🎙️ Listening…';
            const lineElLocal = lineEl;
            startSceneRecognition({ querySelectorAll: () => lineElLocal.querySelectorAll('.ms-word') }, () => {
              mainBtn.disabled = false;
              advance();
            });
          } else {
            advance();
          }
        } else {
          mainBtn.disabled = true;
          const speakerTag = String(line.speaker || '').toLowerCase().replace(/\s+/g, '');
          const tagged = /^(male|female|child)\d?$/.test(speakerTag) ? '[' + speakerTag + ']: ' : '';
          speakText(tagged ? tagged + text : text, () => { mainBtn.disabled = false; advance(); });
        }
      });

      nextBtn.addEventListener('click', () => { try { if (sceneRecognition) sceneRecognition.stop(); } catch (e) {} advance(); });
      restartBtn.addEventListener('click', restartScene);

      function restartScene() {
        try { if (sceneRecognition) sceneRecognition.stop(); } catch (e) {}
        try { window.speechSynthesis.cancel(); } catch (e) {}
        idx = -1;
        playing = false;
        feed.textContent = '';
        mainBtn.textContent = '🎬 Start scene';
        mainBtn.disabled = false;
        mainBtn.style.display = '';
        nextBtn.style.display = 'none';
        restartBtn.style.display = 'none';
        emptyState.style.display = '';
        emptyState.innerHTML = '<i class="fas fa-clapperboard" style="font-size:2rem;opacity:0.4;"></i><p>Ready to perform! Tap <b>Start scene</b> — you play one of the characters.</p>';
        beatBody.style.display = 'none';
        dots.forEach(d => d.classList.remove('done', 'current'));
      }

      state.activityStartTimes[el.id] = Date.now();
      el.dataset.init = 'true';
    });
  }
