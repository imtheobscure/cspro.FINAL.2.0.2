  // ===== AUDIO BLOCK (podcast-style player with waveform) =====
  function initAudioBlock() {
    document.querySelectorAll('.js-audio-block').forEach(el => {
      if (el.dataset.init) return;
      const data = safeJson(el.dataset.content) || {};
      const text = data.text || data.script || data.audioText || (typeof data === 'string' ? data : '');
      const title = data.title || data.caption || 'Audio';
      if (data.audioUrl) {
        // Real audio file: styled native player wrapper
        el.innerHTML =
          '<div class="ab2-wrap ab2-file">' +
            '<div class="ab2-head"><span class="ab2-icon"><i class="fas fa-headphones"></i></span><div><div class="ab2-title">' + escHtml(title) + '</div><div class="ab2-sub">Audio clip</div></div></div>' +
            '<audio controls preload="none" style="width:100%;"><source src="' + escHtml(data.audioUrl) + '"></audio>' +
            (text ? '<p class="ab2-caption">' + escHtml(text) + '</p>' : '') +
          '</div>';
        el.dataset.init = 'true';
        return;
      }
      // TTS-backed player: animated waveform + speed control
      const bars = Array.from({ length: 28 }, (_, i) => {
        const h = 20 + Math.round(Math.abs(Math.sin(i * 1.7)) * 60);
        return '<span class="ab2-bar" style="height:' + h + '%;"></span>';
      }).join('');
      el.innerHTML =
        '<div class="ab2-wrap">' +
          '<div class="ab2-head"><span class="ab2-icon"><i class="fas fa-headphones"></i></span><div><div class="ab2-title">' + escHtml(title) + '</div><div class="ab2-sub">Listen & repeat as needed</div></div></div>' +
          '<div class="ab2-wave" aria-hidden="true">' + bars + '</div>' +
          '<div class="ab2-controls">' +
            '<button type="button" class="duo-btn ab2-play" aria-label="Play audio"><i class="fas fa-play"></i></button>' +
            '<button type="button" class="duo-btn-secondary ab2-speed">1×</button>' +
            '<span class="ab2-status">Ready</span>' +
          '</div>' +
          (text && text !== title ? '<p class="ab2-caption">' + escHtml(text) + '</p>' : '') +
        '</div>';

      const playBtn = el.querySelector('.ab2-play');
      const speedBtn = el.querySelector('.ab2-speed');
      const status = el.querySelector('.ab2-status');
      const speeds = [1, 0.75, 1.25];
      let speedIdx = 0;
      let playing = false;

      function stopWave() {
        playing = false;
        el.classList.remove('ab2-playing');
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        status.textContent = 'Ready';
      }

      playBtn.addEventListener('click', () => {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        if (playing) { stopWave(); return; }
        playing = true;
        el.classList.add('ab2-playing');
        playBtn.innerHTML = '<i class="fas fa-stop"></i>';
        status.textContent = 'Playing…';
        const u = new SpeechSynthesisUtterance(text || title);
        u.rate = speeds[speedIdx] * 0.95;
        u.onend = stopWave;
        u.onerror = stopWave;
        window.speechSynthesis.speak(u);
      });

      speedBtn.addEventListener('click', () => {
        speedIdx = (speedIdx + 1) % speeds.length;
        speedBtn.textContent = speeds[speedIdx] + '×';
      });

      el.dataset.init = 'true';
    });
  }
