  // ===== PARAGRAPH ORGANIZER =====
  function initParagraphOrganizer() {
    document.querySelectorAll('.js-paragraph-organizer').forEach(container => {
      if (container.dataset.init) return;
      const data = safeJson(container.dataset.content);
      if (!data) return;
      const items = data.sentences || data.paragraphs || data.items || [];
      if (!items.length) return;
      const xp = parseInt(container.dataset.xp || '15');

      const correctOrder = items.map((item, i) => ({ text: item.text || item, idx: i }));
      const shuffled = shuffleArray([...correctOrder]);

      let html = '<p style="font-weight:800;margin-bottom:12px;">📝 Arrange these into the correct order:</p>';
      html += '<div id="po-list-' + container.id + '">';
      shuffled.forEach((item, i) => {
        html += '<div class="sequence-item" data-correct-idx="' + item.idx + '"><span class="drag-handle"><i class="fas fa-grip-vertical"></i></span><span class="sequence-num">' + (i + 1) + '</span><span style="flex:1;">' + escHtml(item.text) + '</span><div style="display:flex;gap:4px;"><button class="btn-icon po-up"><i class="fas fa-arrow-up"></i></button><button class="btn-icon po-down"><i class="fas fa-arrow-down"></i></button></div></div>';
      });
      html += '</div><button class="duo-btn po-check-btn" style="margin-top:12px;">Check Order</button>';
      html += '<div id="po-feed-' + container.id + '" style="margin-top:8px;font-weight:800;"></div>';
      container.innerHTML = html;

      const list = document.getElementById('po-list-' + container.id);

      function updateNums() {
        list.querySelectorAll('.sequence-item').forEach((item, i) => { item.querySelector('.sequence-num').textContent = i + 1; });
      }

      list.querySelectorAll('.po-up').forEach(btn => {
        btn.addEventListener('click', function() { const item = this.closest('.sequence-item'); const prev = item.previousElementSibling; if (prev) list.insertBefore(item, prev); updateNums(); });
      });
      list.querySelectorAll('.po-down').forEach(btn => {
        btn.addEventListener('click', function() { const item = this.closest('.sequence-item'); const next = item.nextElementSibling; if (next) list.insertBefore(next, item); updateNums(); });
      });

      container.querySelector('.po-check-btn').addEventListener('click', function() {
        const currentItems = list.querySelectorAll('.sequence-item');
        let allCorrect = true;
        currentItems.forEach((item, i) => {
          if (parseInt(item.dataset.correctIdx) === i) {
            item.style.borderColor = 'var(--theme-success)';
            item.style.background = 'var(--theme-success)08';
          } else {
            item.style.borderColor = 'var(--theme-error)';
            item.style.background = 'var(--theme-error)05';
            allCorrect = false;
          }
        });
        const feed = document.getElementById('po-feed-' + container.id);
        if (allCorrect) {
          if (feed) feed.innerHTML = '<span style="color:var(--theme-success);">✅ Perfect order!</span>';
          addXP(xp, true, null, null, 'writing');
          markActivityComplete(container.id, xp, 100);
        } else {
          if (feed) feed.innerHTML = '<span style="color:var(--theme-error);">❌ Try again</span>';
          addXP(0, false);
        }
      });

      state.activityStartTimes[container.id] = Date.now();
      container.dataset.init = 'true';
    });
  }
