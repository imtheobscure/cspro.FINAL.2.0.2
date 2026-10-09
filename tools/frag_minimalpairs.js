  // ===== MINIMAL PAIRS (hear both, choose what you heard) =====
  function initMinimalPairs() {
    document.querySelectorAll('.js-minimal-pairs').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const pairs = data.pairs || data.items || [];
      if (!pairs.length) {
        container.innerHTML = '<p style="color:var(--theme-text-secondary);">No pairs found. Content JSON needs {"pairs":[{"word1":"ship","word2":"sheep","correct":"ship","sentence":"…"}]}.</p>';
        container.dataset.init = 'true';
        return;
      }
      const xp = parseInt(container.dataset.xp || '15', 10);
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));
      let currentIdx = 0, score = 0;

      container.innerHTML =
        '<div class="mp2-wrap">' +
          '<div class="mp2-progress"></div>' +
          '<div class="mp2-stage"></div>' +
        '</div>';
      const progressEl = container.querySelector('.mp2-progress');
      const stage = container.querySelector('.mp2-stage');

      function renderProgress() {
        progressEl.innerHTML = pairs.map((p, i) =>
          '<span class="mp2-dot' + (i < currentIdx ? (p._ok ? ' ok' : ' bad') : (i === currentIdx ? ' now' : '')) + '"></span>'
        ).join('');
      }

      function renderPair() {
        if (currentIdx >= pairs.length) {
          const accuracy = Math.round(score / pairs.length * 100);
          stage.innerHTML =
            '<div class="mp2-done"><div class="mp2-trophy">🏆</div>' +
            '<h3>Great listening!</h3>' +
            '<p>Score: <b>' + score + '/' + pairs.length + '</b> (' + accuracy + '%)</p></div>';
          markActivityComplete(container.id, score * xp, accuracy);
          if (accuracy >= 80) triggerCelebration('🎧');
          renderProgress();
          return;
        }
        const pair = pairs[currentIdx];
        const word1 = pair.word1 || pair.a || '';
        const word2 = pair.word2 || pair.b || '';
        const correct = pair.correct || pair.answer || word1;
        const sentence = pair.sentence || pair.context || '';
        const shuffled = shuffleArray([word1, word2]);

        renderProgress();
        stage.innerHTML =
          '<div class="mp2-count">Word ' + (currentIdx + 1) + ' of ' + pairs.length + '</div>' +
          '<p class="mp2-q">Which word did you hear?</p>' +
          '<button type="button" class="duo-btn mp2-play"><i class="fas fa-volume-up"></i> Play the word</button>' +
          '<div class="mp2-options">' + shuffled.map(opt =>
            '<button type="button" class="duo-btn-secondary mp2-opt" data-word="' + escFn(opt) + '">' + escFn(opt) + '</button>'
          ).join('') + '</div>' +
          '<div class="mp2-hear-both"><button type="button" class="mp2-both"><i class="fas fa-headphones"></i> Hear both words</button></div>' +
          '<div class="mp2-sentence" style="display:none;"></div>';

        const playBtn = stage.querySelector('.mp2-play');
        const sentenceEl = stage.querySelector('.mp2-sentence');

        playBtn.addEventListener('click', () => { try { window.speechSynthesis.cancel(); } catch (e) {} setTimeout(() => speakText(correct), 80); });
        stage.querySelector('.mp2-both').addEventListener('click', () => {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          setTimeout(() => speakText(word1 + '. … ' + word2 + '.'), 80);
        });

        stage.querySelectorAll('.mp2-opt').forEach(btn => {
          btn.addEventListener('click', function() {
            stage.querySelectorAll('.mp2-opt').forEach(b => b.disabled = true);
            const isRight = String(this.dataset.word) === String(correct);
            if (isRight) {
              this.classList.add('mp2-right');
              score++;
              pair._ok = true;
              addXP(xp, true, null, null, 'listening');
            } else {
              this.classList.add('mp2-wrong');
              const rightBtn = stage.querySelector('.mp2-opt[data-word="' + correct.replace(/"/g, '&quot;') + '"]');
              if (rightBtn) rightBtn.classList.add('mp2-right');
              addXP(0, false);
            }
            if (sentence) {
              sentenceEl.innerHTML = '<i class="fas fa-quote-left"></i> ' + escFn(sentence);
              sentenceEl.style.display = '';
            }
            setTimeout(() => { currentIdx++; renderPair(); }, sentence ? 2200 : 900);
          });
        });
      }
      renderPair();
      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
    });
  }
