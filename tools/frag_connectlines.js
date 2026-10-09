  // ===== CONNECT LINES (SVG connection board) =====
  function initConnectLines() {
    document.querySelectorAll('.js-connect-lines').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const pairs = data.pairs || data.items || (Array.isArray(data) ? data : []);
      if (pairs.length < 2) {
        container.innerHTML = '<p style="color:var(--theme-text-secondary);">Need at least 2 pairs. Content JSON needs {"pairs":[{"left":"…","right":"…"}]}.</p>';
        container.dataset.init = 'true';
        return;
      }
      const xp = parseInt(container.dataset.xp || '15', 10);
      const escFn = typeof escHtml === 'function' ? escHtml : (s => String(s));
      const leftCol = pairs.map((p, i) => ({ label: p.left || p.term || p.word || ('Item ' + (i + 1)), id: i }));
      const rightCol = pairs.map((p, i) => ({ label: p.right || p.definition || p.match || ('Match ' + (i + 1)), id: i }))
        .map(v => ({ v: v, k: Math.random() }))
        .sort((a, b) => a.k - b.k)
        .map(o => o.v);

      container.innerHTML =
        '<div class="cl2-wrap">' +
          '<div class="cl2-tip"><i class="fas fa-hand-pointer"></i> Tap a word, then its match — a line will connect them.</div>' +
          '<div class="cl2-board">' +
            '<svg class="cl2-svg" aria-hidden="true"></svg>' +
            '<div class="cl2-col cl2-col-left">' + leftCol.map(l => '<button type="button" class="cl2-item cl2-left" data-id="' + l.id + '">' + escFn(l.label) + '</button>').join('') + '</div>' +
            '<div class="cl2-col cl2-col-right">' + rightCol.map(r => '<button type="button" class="cl2-item cl2-right" data-id="' + r.id + '">' + escFn(r.label) + '</button>').join('') + '</div>' +
          '</div>' +
          '<div class="cl2-status" role="status" aria-live="polite"></div>' +
        '</div>';

      const svg = container.querySelector('.cl2-svg');
      const board = container.querySelector('.cl2-board');
      const status = container.querySelector('.cl2-status');
      let selLeft = null;
      let wrongCount = 0;
      let matchedCount = 0;

      function centerOf(btn) {
        const b = board.getBoundingClientRect();
        const r = btn.getBoundingClientRect();
        return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
      }

      function drawLine(fromBtn, toBtn, color) {
        const a = centerOf(fromBtn), c = centerOf(toBtn);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', c.x); line.setAttribute('y2', c.y);
        line.setAttribute('class', 'cl2-line' + (color ? ' ' + color : ''));
        svg.appendChild(line);
        if (color !== 'bad') {
          // little pop animation via stroke-dash
          const len = Math.sqrt(Math.pow(c.x - a.x, 2) + Math.pow(c.y - a.y, 2));
          line.style.strokeDasharray = len;
          line.style.strokeDashoffset = len;
          requestAnimationFrame(() => { line.style.transition = 'stroke-dashoffset 0.4s ease'; line.style.strokeDashoffset = '0'; });
        }
        return line;
      }

      container.querySelectorAll('.cl2-left').forEach(btn => {
        btn.addEventListener('click', function() {
          if (this.disabled) return;
          container.querySelectorAll('.cl2-left').forEach(b => b.classList.remove('cl2-sel'));
          selLeft = this;
          this.classList.add('cl2-sel');
          status.textContent = 'Now tap the matching item on the right →';
        });
      });
      container.querySelectorAll('.cl2-right').forEach(btn => {
        btn.addEventListener('click', function() {
          if (this.disabled) return;
          if (!selLeft) { status.textContent = '← Pick an item on the left first.'; return; }
          if (String(this.dataset.id) === String(selLeft.dataset.id)) {
            this.classList.add('cl2-match');
            selLeft.classList.add('cl2-match');
            this.disabled = true; selLeft.disabled = true;
            drawLine(selLeft, this, 'good');
            matchedCount++;
            addXP(Math.ceil(xp / pairs.length), true);
            status.innerHTML = '✅ Paired! <b>' + matchedCount + '/' + pairs.length + '</b>';
            if (matchedCount === pairs.length) {
              status.innerHTML = '🎉 All pairs connected! +' + xp + ' XP';
              triggerCelebration('🔗');
              markActivityComplete(container.id, xp, 100);
            }
          } else {
            drawLine(selLeft, this, 'bad');
            wrongCount++;
            status.innerHTML = '<span style="color:var(--theme-error);">❌ Not a match' + (wrongCount >= 3 ? ' — try reading the definitions again' : '') + '</span>';
            setTimeout(() => { const l = svg.querySelector('.cl2-line.bad'); if (l) l.remove(); }, 500);
          }
          selLeft.classList.remove('cl2-sel');
          selLeft = null;
        });
      });

      // Redraw good lines if the layout shifts (fonts loading, resize)
      const redraw = () => {
        svg.innerHTML = '';
        container.querySelectorAll('.cl2-left.cl2-match').forEach(leftBtn => {
          const rightBtn = container.querySelector('.cl2-right[data-id="' + leftBtn.dataset.id + '"]');
          if (rightBtn) drawLine(leftBtn, rightBtn, 'good');
        });
      };
      window.addEventListener('resize', redraw);

      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
    });
  }
