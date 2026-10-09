  // ===== AI TRIVIA (quiz show: streaks, timer, explanations) =====
  function initAiTrivia() {
    document.querySelectorAll('.js-ai-trivia').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const questions = data.questions || data.items || (Array.isArray(data) ? data : []);
      if (!questions.length) {
        container.innerHTML = '<p style="color:var(--theme-text-secondary);">No questions found. Content JSON needs {"questions":[{"q":"…","options":["a","b","c","d"],"answer":0,"explanation":"…"}]}.</p>';
        container.dataset.init = 'true';
        return;
      }
      const xp = parseInt(container.dataset.xp || '20', 10);
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));
      let idx = 0, correct = 0, streak = 0, bestStreak = 0;

      container.innerHTML =
        '<div class="qt-wrap">' +
          '<div class="qt-hud"><span class="qt-progress"></span><span class="qt-streak">🔥 0</span></div>' +
          '<div class="qt-stage"></div>' +
        '</div>';
      const progressEl = container.querySelector('.qt-progress');
      const streakEl = container.querySelector('.qt-streak');
      const stage = container.querySelector('.qt-stage');

      function normAnswer(q) {
        const a = q.answer;
        if (typeof a === 'number') return a;
        const opts = q.options || q.choices || [];
        const at = opts.findIndex(o => String(o) === String(a));
        return at >= 0 ? at : 0;
      }

      function render() {
        if (idx >= questions.length) {
          const accuracy = Math.round(correct / questions.length * 100);
          stage.innerHTML =
            '<div class="qt-done"><div class="qt-trophy">🎪</div><h3>Trivia complete!</h3>' +
            '<p>Score: <b>' + correct + '/' + questions.length + '</b> (' + accuracy + '%) · Best streak: <b>' + bestStreak + '</b></p></div>';
          markActivityComplete(container.id, Math.round(xp * correct / questions.length), accuracy);
          if (accuracy >= 80) triggerCelebration('🎪');
          return;
        }
        const q = questions[idx];
        const options = q.options || q.choices || [];
        const right = normAnswer(q);
        progressEl.textContent = (idx + 1) + ' / ' + questions.length;
        streakEl.textContent = '🔥 ' + streak;

        stage.innerHTML =
          '<div class="qt-q">' + escFn(q.q || q.question || '') + '</div>' +
          '<div class="qt-options">' + options.map((o, i) => '<button type="button" class="duo-btn-secondary qt-opt" data-i="' + i + '">' + escFn(o) + '</button>').join('') + '</div>' +
          '<div class="qt-feedback" role="status" aria-live="polite"></div>';

        const feed = stage.querySelector('.qt-feedback');
        stage.querySelectorAll('.qt-opt').forEach(btn => {
          btn.addEventListener('click', function() {
            stage.querySelectorAll('.qt-opt').forEach(b => { b.disabled = true; });
            const picked = parseInt(this.dataset.i, 10);
            const isRight = picked === right;
            stage.querySelectorAll('.qt-opt').forEach((b, i) => { if (i === right) b.classList.add('qt-right'); else if (i === picked) b.classList.add('qt-wrong'); });
            if (isRight) {
              correct++;
              streak++;
              bestStreak = Math.max(bestStreak, streak);
              addXP(Math.ceil(xp / questions.length), true, null, null, 'vocabulary');
            } else {
              streak = 0;
              addXP(0, false);
            }
            streakEl.textContent = '🔥 ' + streak;
            const why = q.explanation ? '<div class="qt-why">' + escFn(q.explanation) + '</div>' : '';
            feed.innerHTML = (isRight ? '<span style="color:var(--theme-success);">✅ Correct!</span>' : '<span style="color:var(--theme-error);">❌ Not quite.</span>') + why +
              '<button type="button" class="duo-btn qt-next">' + (idx + 1 >= questions.length ? 'See results' : 'Next question') + '</button>';
            feed.querySelector('.qt-next').addEventListener('click', () => { idx++; render(); });
          });
        });
      }
      render();
      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
    });
  }

  // ===== PRONUNCIATION / WORD STRESS (listen, record, compare) =====
  function initPronunciation() {
    document.querySelectorAll('.js-pronunciation').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const words = data.words || data.items || (Array.isArray(data) ? data : []);
      if (!words.length) {
        container.innerHTML = '<p style="color:var(--theme-text-secondary);">No words found. Content JSON needs {"words":[{"word":"colonel","phonetic":"/ˈkɜːrnəl/","audioScript":"The colonel gave an order."}]}.</p>';
        container.dataset.init = 'true';
        return;
      }
      const xp = parseInt(container.dataset.xp || '15', 10);
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));
      const recSupported = ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
      let mastered = 0;

      container.innerHTML =
        '<div class="pr-wrap">' +
          '<div class="pr-progress"><span class="pr-count">0 / ' + words.length + ' mastered</span><div class="progress-bar-mini" style="flex:1;"><div class="progress-bar-fill pr-fill" style="width:0%"></div></div></div>' +
          '<div class="pr-list"></div>' +
        '</div>';
      const listEl = container.querySelector('.pr-list');
      const countEl = container.querySelector('.pr-count');
      const fill = container.querySelector('.pr-fill');

      function updateProgress() {
        countEl.textContent = mastered + ' / ' + words.length + ' mastered';
        fill.style.width = (words.length ? Math.round(mastered / words.length * 100) : 100) + '%';
        if (mastered === words.length) {
          addXP(xp, true, null, null, 'speaking');
          markActivityComplete(container.id, xp, 100);
          triggerCelebration('🗣️');
        }
      }

      words.forEach((w, wi) => {
        const word = w.word || w.term || '';
        const phon = w.phonetic || w.ipa || '';
        const sentence = w.audioScript || w.sentence || '';
        const syllables = w.syllables || [];
        const stress = w.stress || '';
        const row = document.createElement('div');
        row.className = 'pr-row';
        row.innerHTML =
          '<div class="pr-head">' +
            '<span class="pr-word">' + escFn(word) + '</span>' +
            (phon ? '<span class="pr-phon">' + escFn(phon) + '</span>' : '') +
            (stress ? '<span class="pr-stress">' + escFn(stress) + '</span>' : '') +
          '</div>' +
          (syllables.length ? '<div class="pr-sylls">' + syllables.map((s, i) => '<button type="button" class="pr-syll' + (String(stress).indexOf(String(i + 1)) === 0 || (stress === 'first' && i === 0) ? ' stressed' : '') + '" data-i="' + i + '">' + escFn(s) + '</button>').join('') + '</div>' : '') +
          '<div class="pr-actions">' +
            '<button type="button" class="duo-btn-secondary pr-listen"><i class="fas fa-volume-up"></i> Listen</button>' +
            '<button type="button" class="duo-btn-secondary pr-slow"><i class="fas fa-snail"></i> Slowly</button>' +
            (recSupported ? '<button type="button" class="duo-btn pr-record"><i class="fas fa-microphone"></i> Try it</button>' : '<span class="pr-selfcheck"><button type="button" class="duo-btn-secondary pr-done">✓ I said it</button></span>') +
          '</div>' +
          (sentence ? '<div class="pr-sentence"><i class="fas fa-quote-left"></i> ' + escFn(sentence) + ' <button type="button" class="pr-sent-play"><i class="fas fa-play"></i></button></div>' : '') +
          '<div class="pr-feedback" role="status" aria-live="polite"></div>';

        const feed = row.querySelector('.pr-feedback');
        row.querySelector('.pr-listen').addEventListener('click', () => { try { window.speechSynthesis.cancel(); } catch (e) {} setTimeout(() => speakText(word), 80); });
        row.querySelector('.pr-slow').addEventListener('click', () => {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          setTimeout(() => {
            const u = new SpeechSynthesisUtterance(word);
            u.rate = 0.55;
            window.speechSynthesis.speak(u);
          }, 80);
        });
        const sentBtn = row.querySelector('.pr-sent-play');
        if (sentBtn) sentBtn.addEventListener('click', () => { try { window.speechSynthesis.cancel(); } catch (e) {} setTimeout(() => speakText(sentence), 80); });
        row.querySelectorAll('.pr-syll').forEach(btn => {
          btn.addEventListener('click', () => { try { window.speechSynthesis.cancel(); } catch (e) {} setTimeout(() => speakText(btn.textContent), 80); });
        });

        const recBtn = row.querySelector('.pr-record');
        if (recBtn) {
          recBtn.addEventListener('click', function() {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-microphone"></i> Listening…';
            // Word-by-word compare: reuse scene recognition over word spans
            const chipWrap = document.createElement('span');
            chipWrap.style.display = 'none';
            chipWrap.innerHTML = word.split(' ').map(x => '<span class="pr-w">' + escFn(x) + '</span>').join(' ');
            row.appendChild(chipWrap);
            startSceneRecognition({ querySelectorAll: () => chipWrap.querySelectorAll('.pr-w') }, () => {
              recBtn.innerHTML = '<i class="fas fa-check"></i> Got it!';
              recBtn.classList.add('pr-good');
              row.classList.add('pr-mastered');
              mastered++;
              updateProgress();
            });
          });
        } else {
          row.querySelector('.pr-done').addEventListener('click', function() {
            this.innerHTML = '✓ Nice!';
            row.classList.add('pr-mastered');
            mastered++;
            updateProgress();
          });
        }
        listEl.appendChild(row);
      });
      updateProgress();
      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
    });
  }
