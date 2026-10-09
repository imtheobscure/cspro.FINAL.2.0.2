  // ===== GUIDED WRITING (step-by-step writing coach) =====
  function initGuidedWriting() {
    document.querySelectorAll('.js-guided-writing').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const xp = parseInt(container.dataset.xp || '20', 10);
      const prompt = data.prompt || data.topic || '';
      const scaffolds = data.scaffolds || data.starters || data.sentenceStarters || [];
      const targetWords = data.targetWords || data.wordCount || 50;
      const rubric = data.rubric || [];
      const stepsData = data.steps || [];
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));

      // Build the step list: explicit steps, or synthesize from prompt + scaffolds
      const steps = stepsData.length ? stepsData.map(s => (typeof s === 'string' ? { goal: s } : { goal: s.goal || s.text || '', starter: s.starter || s.sentenceStarter || '' })) : [{ goal: prompt || 'Write your text.', starter: (scaffolds && scaffolds[0]) || '' }];

      container.innerHTML =
        '<div class="gw2-wrap">' +
          '<div class="gw2-prompt"><span class="gw2-prompt-label"><i class="fas fa-pen-nib"></i> Writing task</span><p>' + prompt + '</p></div>' +
          '<div class="gw2-steps"></div>' +
          '<textarea class="gw2-textarea notes-textarea" placeholder="Start writing here… your progress saves as you type." aria-label="Writing area"></textarea>' +
          '<div class="gw2-tools">' +
            '<div class="gw2-chips"></div>' +
            '<div class="gw2-meter"><span class="gw2-wc">0</span> / ' + targetWords + ' words<div class="progress-bar-mini" style="flex:1;"><div class="progress-bar-fill gw2-fill" style="width:0%"></div></div></div>' +
          '</div>' +
          (rubric.length ? '<details class="gw2-rubric"><summary>📋 What makes great writing here?</summary><div>' + rubric.map(r => '<div><b>' + escFn(r.criterion || r.name || '') + ':</b> ' + escFn(r.description || '') + '</div>').join('') + '</div></details>' : '') +
          '<div class="gw2-actions"><button type="button" class="duo-btn gw2-submit"><i class="fas fa-paper-plane"></i> Submit writing</button></div>' +
          '<div class="gw2-feedback" role="status" aria-live="polite"></div>' +
        '</div>';

      const stepsEl = container.querySelector('.gw2-steps');
      const ta = container.querySelector('.gw2-textarea');
      const chipsEl = container.querySelector('.gw2-chips');
      const wcEl = container.querySelector('.gw2-wc');
      const fill = container.querySelector('.gw2-fill');
      const feed = container.querySelector('.gw2-feedback');
      const submitBtn = container.querySelector('.gw2-submit');
      let doneSteps = [];

      function renderSteps() {
        stepsEl.innerHTML = '';
        steps.forEach((st, i) => {
          const row = document.createElement('div');
          row.className = 'gw2-step' + (doneSteps.indexOf(i) >= 0 ? ' done' : '');
          row.innerHTML =
            '<span class="gw2-step-check">' + (doneSteps.indexOf(i) >= 0 ? '✓' : i + 1) + '</span>' +
            '<div style="flex:1;"><div class="gw2-step-goal">' + escFn(st.goal) + '</div>' +
            (st.starter ? '<button type="button" class="gw2-starter">+ Use starter: “' + escFn(st.starter) + '”</button>' : '') +
            '</div>';
          const stBtn = row.querySelector('.gw2-starter');
          if (stBtn) stBtn.addEventListener('click', () => {
            ta.value += (ta.value && !/\s$/.test(ta.value) ? ' ' : '') + st.starter;
            ta.dispatchEvent(new Event('input'));
            ta.focus();
          });
          const checkBtn = row.querySelector('.gw2-step-check');
          checkBtn.style.cursor = 'pointer';
          checkBtn.title = 'Mark this step done';
          checkBtn.addEventListener('click', () => {
            const at = doneSteps.indexOf(i);
            if (at >= 0) doneSteps.splice(at, 1); else doneSteps.push(i);
            renderSteps();
          });
          stepsEl.appendChild(row);
        });
      }

      chipsEl.innerHTML = (scaffolds || []).map(s => '<button type="button" class="gw2-chip">' + escFn(s) + '</button>').join('');
      container.querySelectorAll('.gw2-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          ta.value += (ta.value && !/\s$/.test(ta.value) ? ' ' : '') + chip.textContent;
          ta.dispatchEvent(new Event('input'));
          ta.focus();
        });
      });

      ta.addEventListener('input', function() {
        const words = this.value.trim().split(/\s+/).filter(w => w).length;
        wcEl.textContent = String(words);
        fill.style.width = Math.min(100, words / targetWords * 100) + '%';
        try { localStorage.setItem('gw2-' + container.id, this.value); } catch (e) {}
      });
      try {
        const saved = localStorage.getItem('gw2-' + container.id);
        if (saved) { ta.value = saved; ta.dispatchEvent(new Event('input')); }
      } catch (e) {}

      submitBtn.addEventListener('click', function() {
        const words = ta.value.trim().split(/\s+/).filter(w => w).length;
        if (words < 5) { showToast('Please write at least a few sentences', 'info'); return; }
        const pct = Math.min(100, Math.round(words / targetWords * 100));
        addXP(xp, true, null, null, 'writing');
        showToast('✍️ Writing submitted! +' + xp + ' XP', 'success');
        markActivityComplete(container.id, xp, pct);
        feed.innerHTML = '<span style="color:var(--theme-success);">✅ Submitted — ' + words + ' words (' + pct + '% of target).</span>';
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-check"></i> Submitted';
      });

      renderSteps();
      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
    });
  }
