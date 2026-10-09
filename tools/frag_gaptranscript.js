  // ===== GAP TRANSCRIPT (listen studio: multi-voice audio + fill gaps) =====
  function initGapTranscript() {
    document.querySelectorAll('.js-gap-transcript').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const xp = parseInt(container.dataset.xp || '15', 10);
      const audioText = data.audioText || data.script || '';
      const gappedText = data.gappedText || data.transcript || '';
      const answers = data.answers || [];
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));

      // Pre-parse the gapped text into segments: plain text and gaps
      const segments = [];
      let last = 0;
      const re = /_{3,}|\[GAP\]|\{\{.*?\}\}/g;
      let m;
      while ((m = re.exec(gappedText)) !== null) {
        if (m.index > last) segments.push({ type: 'text', value: gappedText.slice(last, m.index) });
        segments.push({ type: 'gap', answer: answers[segments.filter(s => s.type === 'gap').length] || '' });
        last = m.index + m[0].length;
      }
      if (last < gappedText.length) segments.push({ type: 'text', value: gappedText.slice(last) });
      const gapCount = segments.filter(s => s.type === 'gap').length;
      if (!gapCount) {
        container.innerHTML = '<p style="color:var(--theme-text-secondary);">No gaps found. Content JSON needs {"audioText":"…","gappedText":"The sun is ___ …","answers":["shining"]}.</p>';
        container.dataset.init = 'true';
        return;
      }

      container.innerHTML =
        '<div class="gt2-wrap">' +
          '<div class="gt2-player">' +
            (data.audioUrl
              ? '<audio controls style="width:100%;"><source src="' + escFn(data.audioUrl) + '"></audio>'
              : '<button type="button" class="duo-btn gt2-play"><i class="fas fa-play"></i> Play the audio</button>' +
                '<button type="button" class="duo-btn-secondary gt2-replay" title="Replay" style="display:none;"><i class="fas fa-rotate-right"></i></button>') +
          '</div>' +
          '<div class="gt2-tip"><i class="fas fa-lightbulb"></i> Listen first, then fill each gap. Replay as often as you need.</div>' +
          '<div class="gt2-text" aria-label="Transcript with gaps"></div>' +
          '<div class="gt2-actions"><button type="button" class="duo-btn gt2-check"><i class="fas fa-check"></i> Check answers</button></div>' +
          '<div class="gt2-feedback" role="status" aria-live="polite"></div>' +
        '</div>';

      const textEl = container.querySelector('.gt2-text');
      const feed = container.querySelector('.gt2-feedback');
      const playBtn = container.querySelector('.gt2-play');
      const replayBtn = container.querySelector('.gt2-replay');

      // Build the text DOM
      segments.forEach((seg) => {
        if (seg.type === 'text') {
          textEl.appendChild(document.createTextNode(seg.value));
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'gt2-input';
          input.dataset.answer = seg.answer;
          input.placeholder = '?';
          input.autocomplete = 'off';
          input.setAttribute('aria-label', 'Missing word');
          textEl.appendChild(input);
        }
      });

      if (playBtn) {
        playBtn.addEventListener('click', () => {
          playBtn.style.display = 'none';
          replayBtn.style.display = '';
          speakText(audioText);
        });
        replayBtn.addEventListener('click', () => { try { window.speechSynthesis.cancel(); } catch (e) {} setTimeout(() => speakText(audioText), 80); });
      }

      container.querySelector('.gt2-check').addEventListener('click', function() {
        let correct = 0;
        const inputs = container.querySelectorAll('.gt2-input');
        inputs.forEach(input => {
          if (fuzzyMatch(input.value, input.dataset.answer, 1)) {
            input.classList.remove('wrong'); input.classList.add('ok');
            correct++;
          } else {
            input.classList.remove('ok'); input.classList.add('wrong');
          }
        });
        const accuracy = Math.round(correct / gapCount * 100);
        if (correct === gapCount) {
          feed.innerHTML = '<span style="color:var(--theme-success);">🎉 Perfect transcript! +' + xp + ' XP</span>';
          showToast('🎧 Perfect!', 'success');
          triggerCelebration('🎧');
          addXP(xp, true, null, null, 'listening');
        } else {
          feed.innerHTML = '<span style="color:' + (accuracy >= 60 ? '#f5a623' : 'var(--theme-error)') + ';">' + correct + '/' + gapCount + ' correct (' + accuracy + '%) — green gaps are right, red ones need another listen.</span>';
          addXP(Math.round(xp * correct / gapCount), false, null, null, 'listening');
        }
        markActivityComplete(container.id, Math.round(xp * correct / gapCount), accuracy);
      });

      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
    });
  }
