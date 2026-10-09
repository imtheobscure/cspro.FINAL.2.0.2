  // ===== ESCAPE ROOM (mission briefing: locked room, keys, story) =====
  function initEscapeRoom() {
    document.querySelectorAll('.js-escape-room').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const puzzles = data.puzzles || data.stages || data.clues || [];
      if (!puzzles.length) {
        container.innerHTML = '<p style="color:var(--theme-text-secondary);">No puzzles found. Content JSON needs {"story":"…","puzzles":[{"clue":"…","answer":"…","hint":"…"}]}.</p>';
        container.dataset.init = 'true';
        return;
      }
      const xp = parseInt(container.dataset.xp || '50', 10);
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));
      let currentPuzzle = 0;
      let hintUsed = 0;
      const story = data.story || data.intro || '';

      container.innerHTML =
        '<div class="er2-wrap">' +
          (story ? '<div class="er2-story"><i class="fas fa-scroll"></i> ' + escFn(story) + '</div>' : '') +
          '<div class="er2-hud">' +
            '<div class="er2-progress">' + puzzles.map((p, i) => '<span class="er2-key' + (i === 0 ? ' current' : '') + '" data-i="' + i + '">🔑</span>').join('') + '</div>' +
            '<span class="er2-stage">Puzzle <b class="er2-stage-num">1</b> of ' + puzzles.length + '</span>' +
          '</div>' +
          '<div class="er2-room"></div>' +
        '</div>';

      const room = container.querySelector('.er2-room');
      const stageNum = container.querySelector('.er2-stage-num');
      const keys = container.querySelectorAll('.er2-key');

      function renderPuzzle() {
        if (currentPuzzle >= puzzles.length) {
          room.innerHTML =
            '<div class="er2-win">' +
              '<div class="er2-win-icon">🔓</div>' +
              '<h3 style="margin:8px 0;">Escaped!</h3>' +
              '<p>You cracked all ' + puzzles.length + ' puzzles' + (hintUsed ? ' with ' + hintUsed + ' hint' + (hintUsed > 1 ? 's' : '') + '' : ' — no hints needed') + '.</p>' +
              '<div class="er2-confetti">🎉</div>' +
            '</div>';
          addXP(xp, true, null, null, 'game');
          markActivityComplete(container.id, xp, 100);
          triggerCelebration('🔓');
          return;
        }
        const puzzle = puzzles[currentPuzzle];
        const clue = puzzle.clue || puzzle.question || puzzle.text || '';
        const answer = puzzle.answer || puzzle.solution || '';
        const hint = puzzle.hint || '';
        const options = puzzle.options || [];
        stageNum.textContent = currentPuzzle + 1;
        keys.forEach((k, i) => k.classList.toggle('current', i === currentPuzzle));

        let body =
          '<div class="er2-door">' + (currentPuzzle === puzzles.length - 1 ? '🚪' : '🔒') + '</div>' +
          '<p class="er2-clue">' + escFn(clue) + '</p>';
        if (options.length) {
          body += '<div class="er2-options">' + options.map(o => '<button type="button" class="duo-btn-secondary er2-opt">' + escFn(o) + '</button>').join('') + '</div>';
        } else {
          body += '<div class="er2-entry"><input type="text" class="duo-input-lg er2-input" placeholder="Type the secret code…" autocomplete="off"><button type="button" class="duo-btn er2-submit">🔑 Unlock</button></div>';
        }
        body += hint ? '<button type="button" class="er2-hint-btn"><i class="fas fa-lightbulb"></i> Need a hint? (-1 star)</button><div class="er2-hint" style="display:none;">💡 ' + escFn(hint) + '</div>' : '';
        body += '<div class="er2-feedback" role="status" aria-live="polite"></div>';
        room.innerHTML = body;

        const input = room.querySelector('.er2-input');
        const submit = room.querySelector('.er2-submit');
        const feed = room.querySelector('.er2-feedback');

        function tryAnswer(val) {
          if (fuzzyMatch(val, answer, 1)) {
            feed.innerHTML = '<span style="color:var(--theme-success);">🔓 Click! The lock opens…</span>';
            keys[currentPuzzle].classList.remove('current');
            keys[currentPuzzle].classList.add('done');
            addXP(Math.round(xp / puzzles.length), true, null, null, 'game');
            currentPuzzle++;
            setTimeout(renderPuzzle, 1100);
          } else {
            feed.innerHTML = '<span style="color:var(--theme-error);">❌ The lock shakes. Try again!</span>';
            const door = room.querySelector('.er2-door');
            if (door) { door.classList.remove('shake'); void door.offsetWidth; door.classList.add('shake'); }
            addXP(0, false);
          }
        }

        if (submit) submit.addEventListener('click', () => { if (input && input.value.trim()) tryAnswer(input.value); });
        if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) tryAnswer(input.value); });
        room.querySelectorAll('.er2-opt').forEach(btn => btn.addEventListener('click', () => tryAnswer(btn.textContent)));
        const hintBtn = room.querySelector('.er2-hint-btn');
        if (hintBtn) hintBtn.addEventListener('click', () => {
          const h = room.querySelector('.er2-hint');
          h.style.display = h.style.display === 'none' ? '' : 'none';
          if (h.style.display !== 'none' && !hintBtn.dataset.used) { hintUsed++; hintBtn.dataset.used = '1'; hintBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Hint used'; }
        });
      }
      renderPuzzle();
      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
    });
  }
