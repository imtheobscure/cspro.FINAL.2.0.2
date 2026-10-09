  // ===== TEXT RECONSTRUCTION (tap-to-rebuild paragraph game) =====
  function initTextReconstruction() {
    document.querySelectorAll('.js-text-reconstruction').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const lines = (data.paragraphs || data.sentences || data.items || [])
        .map(item => (typeof item === 'string' ? item : (item && item.text) || ''))
        .filter(Boolean);
      if (lines.length < 2) {
        container.innerHTML = '<p style="color:var(--theme-text-secondary);">Add at least 2 paragraphs in the content JSON ({"paragraphs":["…","…"]}) to play.</p>';
        container.dataset.init = 'true';
        return;
      }
      const xp = parseInt(container.dataset.xp || '15', 10);
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));

      const makePieces = () => {
        const pieces = shuffleArray(lines.map((text, idx) => ({ text: text, idx: idx })));
        // Guarantee the puzzle is actually shuffled
        if (pieces.length > 1 && pieces.every((p, i) => p.idx === i)) {
          const tmp = pieces[0]; pieces[0] = pieces[1]; pieces[1] = tmp;
        }
        return pieces;
      };

      let remaining = makePieces();
      let placed = [];
      let wrongTries = 0;

      container.innerHTML =
        '<div class="tr-wrap">' +
          '<div class="tr-hint"><i class="fas fa-hand-pointer"></i> Tap the pieces in order to rebuild the text</div>' +
          '<div class="tr-sheet"><div class="tr-sheet-empty">Your rebuilt text will appear here…</div></div>' +
          '<div class="tr-pool"></div>' +
          '<div class="tr-actions">' +
            '<button type="button" class="duo-btn tr-check"><i class="fas fa-check"></i> Check</button>' +
            '<button type="button" class="duo-btn-secondary tr-reset"><i class="fas fa-redo"></i> Reset</button>' +
          '</div>' +
          '<div class="tr-feedback" role="status" aria-live="polite"></div>' +
        '</div>';

      const sheet = container.querySelector('.tr-sheet');
      const poolEl = container.querySelector('.tr-pool');
      const feed = container.querySelector('.tr-feedback');
      const hintOn = () => container.classList.contains('tr-hint-on');

      function render() {
        sheet.innerHTML = '';
        if (!placed.length) {
          const e = document.createElement('div');
          e.className = 'tr-sheet-empty';
          e.textContent = 'Your rebuilt text will appear here…';
          sheet.appendChild(e);
        } else {
          placed.forEach((item, i) => {
            const row = document.createElement('div');
            row.className = 'tr-line';
            row.innerHTML = '<span class="tr-line-num">' + (i + 1) + '</span><span class="tr-line-text">' + escFn(item.text) + '</span><button type="button" class="tr-remove" aria-label="Send back"><i class="fas fa-times"></i></button>';
            row.querySelector('.tr-remove').addEventListener('click', () => {
              placed.splice(i, 1);
              remaining.push(item);
              feed.textContent = '';
              render();
            });
            sheet.appendChild(row);
          });
        }
        poolEl.innerHTML = '';
        remaining.forEach((item, i) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'tr-piece';
          chip.innerHTML = (hintOn() ? '<span class="tr-piece-idx">' + (item.idx + 1) + '</span>' : '') + '<span>' + escFn(item.text) + '</span>';
          chip.addEventListener('click', () => {
            remaining.splice(i, 1);
            placed.push(item);
            feed.textContent = '';
            render();
          });
          poolEl.appendChild(chip);
        });
      }

      container.querySelector('.tr-check').addEventListener('click', () => {
        if (placed.length !== lines.length) {
          feed.innerHTML = '<span style="color:#f5a623;">⚠️ Place all ' + lines.length + ' pieces first.</span>';
          return;
        }
        const allCorrect = placed.every((item, i) => item.idx === i);
        if (allCorrect) {
          feed.innerHTML = '<span style="color:var(--theme-success);">✅ Perfect! The text flows correctly.</span>';
          sheet.classList.add('tr-win');
          poolEl.style.display = 'none';
          addXP(xp, true, null, null, 'writing');
          markActivityComplete(container.id, xp, 100);
        } else {
          wrongTries++;
          placed.forEach((item, i) => {
            const row = sheet.children[i];
            if (row && row.classList) {
              row.classList.remove('tr-bad');
              void row.offsetWidth;
              if (item.idx !== i) row.classList.add('tr-bad');
            }
          });
          if (wrongTries >= 2 && !hintOn()) {
            container.classList.add('tr-hint-on');
            render();
            feed.innerHTML = '<span style="color:var(--theme-error);">❌ Still not right. Hint added: each piece now shows its correct position number.</span>';
          } else {
            feed.innerHTML = '<span style="color:var(--theme-error);">❌ The red lines are out of place — tap them to send back.</span>';
          }
          addXP(0, false);
        }
      });

      container.querySelector('.tr-reset').addEventListener('click', () => {
        remaining = makePieces();
        placed = [];
        wrongTries = 0;
        container.classList.remove('tr-hint-on');
        poolEl.style.display = '';
        sheet.classList.remove('tr-win');
        feed.textContent = '';
        render();
      });

      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
      render();
    });
  }
