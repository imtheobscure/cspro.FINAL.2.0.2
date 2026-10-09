  // ===== CONCEALED TEXT (magic-lens reveal with progress) =====
  function initConcealed() {
    document.querySelectorAll('.js-concealed').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const rawText = data.text || data.content || (typeof data === 'string' ? data : '');
      if (!rawText) { container.dataset.init = 'true'; return; }
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));

      // Blur style: wrap every word so each can un-blur as it is revealed,
      // giving a "magic lens" sweep instead of one big flip.
      const wordSpans = rawText.split(/(\s+)/).map(tok => {
        if (/^\s+$/.test(tok) || !tok) return tok;
        return '<span class="ct-word">' + escFn(tok) + '</span>';
      }).join('');

      container.innerHTML =
        '<div class="ct-wrap">' +
          '<div class="ct-stage concealed-text" tabindex="0" role="button" aria-label="Hold or click to reveal hidden text">' +
            '<div class="ct-cover"><div class="ct-lock"><i class="fas fa-eye-slash"></i></div><p><b>Hidden passage</b></p><p style="font-size:0.85rem;">Click to reveal — click again to hide.</p></div>' +
            '<div class="ct-content concealed-content">' + wordSpans + '</div>' +
          '</div>' +
          '<div class="ct-bar">' +
            '<button type="button" class="duo-btn-secondary ct-toggle"><i class="fas fa-eye"></i> Reveal</button>' +
            '<button type="button" class="duo-btn-secondary ct-clear" style="display:none;"><i class="fas fa-broom"></i> Clear a word</button>' +
          '</div>' +
          '<div class="ct-progress"><div class="ct-progress-fill"></div></div>' +
        '</div>';

      const stage = container.querySelector('.ct-stage');
      const toggleBtn = container.querySelector('.ct-toggle');
      const clearBtn = container.querySelector('.ct-clear');
      const fill = container.querySelector('.ct-progress-fill');

      function updateProgress() {
        const words = container.querySelectorAll('.ct-word');
        const shown = container.querySelectorAll('.ct-word.shown');
        const pct = words.length ? Math.round(shown.length / words.length * 100) : 100;
        fill.style.width = pct + '%';
      }

      function setRevealed(on) {
        stage.classList.toggle('revealed', on);
        toggleBtn.innerHTML = on ? '<i class="fas fa-eye-slash"></i> Hide' : '<i class="fas fa-eye"></i> Reveal';
        clearBtn.style.display = on ? '' : 'none';
        if (on) {
          // Stagger the word reveal for a sweep effect
          const words = container.querySelectorAll('.ct-word:not(.shown)');
          words.forEach((w, i) => setTimeout(() => { w.classList.add('shown'); updateProgress(); }, i * 18));
        } else {
          container.querySelectorAll('.ct-word.shown').forEach(w => w.classList.remove('shown'));
          updateProgress();
        }
      }

      stage.addEventListener('click', () => setRevealed(!stage.classList.contains('revealed')));
      stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRevealed(!stage.classList.contains('revealed')); } });
      toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); setRevealed(!stage.classList.contains('revealed')); });
      clearBtn.addEventListener('click', () => {
        // Re-hide one random revealed word — self-quiz the learner
        const shown = container.querySelectorAll('.ct-word.shown');
        if (shown.length) {
          const w = shown[Math.floor(Math.random() * shown.length)];
          w.classList.remove('shown');
          w.classList.add('quiz');
          updateProgress();
        }
      });

      updateProgress();
      container.dataset.init = 'true';
    });
  }
