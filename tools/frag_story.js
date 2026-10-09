  // ===== INTERACTIVE STORY (turn-taking story game) =====
  function initInteractiveStory() {
    document.querySelectorAll('.js-interactive-story').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const xp = parseInt(container.dataset.xp || '20', 10);
      const scenes = data.scenes || data.nodes || data.story || [];
      if (!scenes.length) {
        container.innerHTML = '<p style="color:var(--theme-text-secondary);">No story scenes found. Content JSON needs {"scenes":[{"id":1,"title":"…","text":"…","choices":[{"text":"…","next":2}]}]}.</p>';
        container.dataset.init = 'true';
        return;
      }
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));
      const sceneList = scenes.map((s, i) => ({
        id: s.id !== undefined ? s.id : i,
        title: s.title || s.name || '',
        text: s.text || s.narrative || s.prompt || '',
        emoji: s.emoji || '',
        choices: (s.choices || s.options || []).map((c, j) => ({
          text: c.text || c.label || ('Choice ' + (j + 1)),
          next: c.next !== undefined ? c.next : (c.nextScene !== undefined ? c.nextScene : j + 1),
          effect: c.effect || c.result || '',
        })),
      }));
      const findScene = (id) => sceneList.find(s => String(s.id) === String(id)) || sceneList[0];
      const visited = [];
      let steps = 0;

      container.innerHTML =
        '<div class="is-wrap">' +
          '<div class="is-topbar">' +
            '<span class="is-chapter">Chapter 1</span>' +
            '<div class="is-trail"></div>' +
          '</div>' +
          '<div class="is-card">' +
            '<div class="is-scene-emoji"></div>' +
            '<div class="is-title"></div>' +
            '<div class="is-text"></div>' +
            '<div class="is-effect"></div>' +
            '<div class="is-choices"></div>' +
            '<div class="is-listen-row"><button type="button" class="duo-btn-secondary is-listen"><i class="fas fa-volume-up"></i> Hear this part</button></div>' +
          '</div>' +
          '<div class="is-feedback" role="status" aria-live="polite"></div>' +
          '<button type="button" class="duo-btn-secondary is-restart" style="display:none;"><i class="fas fa-redo"></i> Play again</button>' +
        '</div>';

      const q = (sel) => container.querySelector(sel);
      const chapterEl = q('.is-chapter');
      const trailEl = q('.is-trail');
      const emojiEl = q('.is-scene-emoji');
      const titleEl = q('.is-title');
      const textEl = q('.is-text');
      const effectEl = q('.is-effect');
      const choicesEl = q('.is-choices');
      const listenRow = q('.is-listen-row');
      const listenBtn = q('.is-listen');
      const restartBtn = q('.is-restart');
      const feed = q('.is-feedback');

      function renderTrail() {
        trailEl.innerHTML = '';
        visited.forEach(v => {
          const d = document.createElement('span');
          d.className = 'is-trail-dot';
          d.textContent = v.emoji || '•';
          d.title = v.title || '';
          trailEl.appendChild(d);
        });
        if (visited.length) {
          const arrow = document.createElement('span');
          arrow.className = 'is-trail-now';
          arrow.innerHTML = '<i class="fas fa-location-dot"></i>';
          trailEl.appendChild(arrow);
        }
      }

      function renderScene(id) {
        const scene = findScene(id);
        visited.push({ emoji: scene.emoji, title: scene.title });
        steps++;
        chapterEl.textContent = 'Chapter ' + steps;
        renderTrail();
        emojiEl.textContent = scene.emoji || '📖';
        titleEl.textContent = scene.title || '';
        titleEl.style.display = scene.title ? '' : 'none';
        textEl.textContent = scene.text;
        effectEl.style.display = 'none';
        feed.textContent = '';
        listenRow.style.display = '';
        restartBtn.style.display = 'none';
        choicesEl.innerHTML = '';

        if (!scene.choices.length) {
          // Ending
          choicesEl.innerHTML = '<div class="is-ending"><span class="is-trophy">🏆</span><p><b>The End!</b></p><p style="font-size:0.9rem;">You shaped the story through ' + steps + ' chapter' + (steps > 1 ? 's' : '') + '.</p></div>';
          listenRow.style.display = 'none';
          restartBtn.style.display = '';
          addXP(xp, true, null, null, 'reading');
          markActivityComplete(container.id, xp, 100);
          triggerCelebration('📖');
          return;
        }

        scene.choices.forEach((choice, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'duo-btn is-choice';
          btn.innerHTML = '<span class="is-choice-key">' + String.fromCharCode(65 + i) + '</span> ' + escFn(choice.text);
          btn.addEventListener('click', () => {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            steps && addXP(2, true, null, null, 'reading');
            renderScene(choice.next);
            // show consequence under the new scene text if defined
            if (choice.effect) {
              effectEl.innerHTML = '<i class="fas fa-arrow-turn-right"></i> ' + escFn(choice.effect);
              effectEl.style.display = '';
            }
          });
          choicesEl.appendChild(btn);
        });
      }

      listenBtn.addEventListener('click', () => {
        const cur = visited[visited.length - 1];
        const scene = sceneList[sceneList.length - 1];
        const text = textEl.textContent || '';
        speakText(text);
      });

      restartBtn.addEventListener('click', () => {
        visited.length = 0;
        steps = 0;
        try { window.speechSynthesis.cancel(); } catch (e) {}
        renderScene(sceneList[0].id);
      });

      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
      renderScene(sceneList[0].id);
    });
  }
