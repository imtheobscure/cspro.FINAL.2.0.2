import type { Lesson, Activity, WhiteboardState } from '../types';

interface ExportOptions {
  lesson: Lesson;
  learnerName: string;
  learnerAvatar: string;
  whiteboardStates: WhiteboardState[];
  includeVideo: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateActivityHtml(activity: Activity, index: number): string {
  const colorMap: Record<string, string> = {
    gold: '#ffd700',
    teal: '#14b8a6',
    purple: '#a855f7',
    orange: '#f97316',
    green: '#22c55e',
    pink: '#ec4899',
    blue: '#3b82f6',
  };
  const color = colorMap[activity.color] || '#ffd700';

  let contentHtml = '';

  switch (activity.type) {
    case 'flashcard':
      if (activity.content.cards) {
        contentHtml = `
          <div class="flashcard-deck">
            ${activity.content.cards.map((card, i) => `
              <div class="flashcard" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-inner">
                  <div class="flashcard-front">
                    <div class="card-number">${i + 1}/${activity.content.cards!.length}</div>
                    <div class="card-front-text">${escapeHtml(card.front)}</div>
                    ${card.pronunciation ? `<div class="pronunciation">/${escapeHtml(card.pronunciation)}/</div>` : ''}
                    <div class="flip-hint">Click to flip</div>
                  </div>
                  <div class="flashcard-back">
                    <div class="card-back-text">${escapeHtml(card.back)}</div>
                    ${card.translation ? `<div class="translation">🌍 ${escapeHtml(card.translation)}</div>` : ''}
                    ${card.example ? `<div class="example">"${escapeHtml(card.example)}"</div>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>`;
      }
      break;

    case 'multipleChoice':
      contentHtml = `
        <div class="question-text">${escapeHtml(activity.content.question || '')}</div>
        <div class="options-grid" data-correct="${activity.content.options?.find(o => o.isCorrect)?.id || ''}">
          ${activity.content.options?.map(opt => `
            <button class="option-btn" data-id="${opt.id}" onclick="checkAnswer(this, '${opt.id}', ${opt.isCorrect})">
              ${escapeHtml(opt.text)}
            </button>
          `).join('') || ''}
        </div>
        <div class="feedback-area"></div>`;
      break;

    case 'trueFalse':
      contentHtml = `
        <div class="question-text">${escapeHtml(activity.content.question || '')}</div>
        <div class="true-false-btns">
          <button class="tf-btn tf-true" onclick="checkTF(this, ${activity.content.answer === true})">✅ TRUE</button>
          <button class="tf-btn tf-false" onclick="checkTF(this, ${activity.content.answer === false})">❌ FALSE</button>
        </div>
        <div class="feedback-area"></div>`;
      break;

    case 'fillBlanks':
      const parts = (activity.content.sentence || '').split('___');
      const blanks = activity.content.blanks || [];
      contentHtml = `
        <div class="fill-blanks-container">
          <div class="sentence-with-blanks">
            ${parts.map((part, i) => `
              <span>${escapeHtml(part)}</span>
              ${i < blanks.length ? `<input type="text" class="blank-input" data-answer="${escapeHtml(blanks[i])}" placeholder="...">` : ''}
            `).join('')}
          </div>
          <button class="check-btn" onclick="checkFillBlanks(this.parentElement)">Check Answers</button>
          <div class="feedback-area"></div>
        </div>`;
      break;

    case 'matching':
      const pairs = activity.content.pairs || [];
      const shuffledRights = [...pairs].sort(() => Math.random() - 0.5);
      contentHtml = `
        <div class="matching-container">
          <div class="matching-columns">
            <div class="left-column">
              ${pairs.map((p, i) => `<div class="match-item left" data-pair="${i}">${escapeHtml(p.left)}</div>`).join('')}
            </div>
            <div class="right-column">
              ${shuffledRights.map(p => {
                const origIdx = pairs.findIndex(op => op.right === p.right);
                return `<div class="match-item right" data-pair="${origIdx}">${escapeHtml(p.right)}</div>`;
              }).join('')}
            </div>
          </div>
          <button class="check-btn" onclick="checkMatching(this.parentElement)">Check Matches</button>
          <div class="feedback-area"></div>
        </div>`;
      break;

    case 'ordering':
      const items = [...(activity.content.orderedItems || [])].sort(() => Math.random() - 0.5);
      contentHtml = `
        <div class="ordering-container" data-correct='${JSON.stringify(activity.content.orderedItems)}'>
          <p class="instruction">Drag items to put them in the correct order:</p>
          <div class="sortable-list">
            ${items.map((item, i) => `
              <div class="sortable-item" draggable="true" data-text="${escapeHtml(item)}">
                <span class="order-num">${i + 1}</span>
                <span class="item-text">${escapeHtml(item)}</span>
                <span class="drag-handle">⠿</span>
              </div>
            `).join('')}
          </div>
          <button class="check-btn" onclick="checkOrdering(this.parentElement)">Check Order</button>
          <div class="feedback-area"></div>
        </div>`;
      break;

    case 'wordScramble':
      contentHtml = `
        <div class="scramble-container">
          <div class="scrambled-word">${(activity.content.scrambledWord || '').split('').join(' ')}</div>
          <input type="text" class="scramble-input" placeholder="Type the word..." data-answer="${escapeHtml(activity.content.correctWord || '')}">
          <button class="check-btn" onclick="checkScramble(this.parentElement)">Check</button>
          <div class="feedback-area"></div>
        </div>`;
      break;

    case 'speaking':
      contentHtml = `
        <div class="speaking-container">
          <div class="expected-sentence">"${escapeHtml(activity.content.expectedSentence || '')}"</div>
          <button class="speak-btn" onclick="speakText('${escapeHtml(activity.content.expectedSentence || '')}')">🔊 Listen</button>
          <button class="record-btn" onclick="startSpeechRecognition(this)">🎤 Start Speaking</button>
          <div class="transcript-area"></div>
          <div class="feedback-area"></div>
        </div>`;
      break;

    case 'reflection':
    case 'discussion':
    case 'videoPause':
      const prompt = activity.content.reflectionPrompt || activity.content.discussionPrompt || activity.content.videoPausePrompt || activity.content.question || '';
      contentHtml = `
        <div class="reflection-container">
          <div class="prompt-text">${escapeHtml(prompt)}</div>
          <textarea class="reflection-textarea" placeholder="Write your thoughts..." rows="4"></textarea>
          <button class="submit-btn" onclick="submitReflection(this.parentElement)">💾 Save Response</button>
          <div class="feedback-area"></div>
        </div>`;
      break;

    default:
      contentHtml = `<div class="question-text">${escapeHtml(activity.content.question || `Activity: ${activity.type}`)}</div>`;
  }

  // Lesson content section
  let lessonHtml = '';
  if (activity.lessonContent) {
    const lc = activity.lessonContent;
    lessonHtml = `
      <div class="lesson-content">
        ${lc.warmUp ? `<div class="lesson-section"><h4>🌡️ Warm-Up</h4><p>${escapeHtml(lc.warmUp)}</p></div>` : ''}
        ${lc.meaning ? `<div class="lesson-section"><h4>💡 Meaning</h4><p>${escapeHtml(lc.meaning)}</p></div>` : ''}
        ${lc.form ? `<div class="lesson-section"><h4>📝 Form</h4><p class="form-text">${escapeHtml(lc.form)}</p></div>` : ''}
        ${lc.use ? `<div class="lesson-section"><h4>🗣️ Use</h4><p>${escapeHtml(lc.use)}</p></div>` : ''}
        ${lc.personalizedExamples?.length ? `
          <div class="lesson-section">
            <h4>✨ Examples</h4>
            <ul>${lc.personalizedExamples.map(ex => `<li>${escapeHtml(ex)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${lc.lifeApplication ? `<div class="lesson-section highlight"><h4>🌟 In Your Life</h4><p>${escapeHtml(lc.lifeApplication)}</p></div>` : ''}
      </div>`;
  }

  return `
    <div class="activity-card" style="--activity-color: ${color}" id="activity-${index}">
      <div class="activity-header">
        <span class="activity-emoji">${activity.emoji}</span>
        <div class="activity-info">
          <h3 class="activity-title">${escapeHtml(activity.title || activity.type)}</h3>
          <div class="activity-meta">
            <span class="activity-type">${activity.type}</span>
            <span class="activity-points">+${activity.points} XP</span>
            <span class="activity-difficulty">${activity.difficulty}</span>
          </div>
        </div>
      </div>
      ${lessonHtml}
      <div class="activity-content">
        ${contentHtml}
      </div>
    </div>`;
}

export function generateInteractiveHTML(options: ExportOptions): string {
  const { lesson, learnerName, learnerAvatar, whiteboardStates, includeVideo } = options;

  // Generate activities HTML (used in segmentsHtml)
  void lesson.segments.flatMap((seg, segIdx) => 
    seg.activities.map((act, actIdx) => generateActivityHtml(act, segIdx * 100 + actIdx))
  ).join('\n');

  const segmentsNav = lesson.segments.map((seg, i) => 
    `<a href="#segment-${i}" class="segment-link">${i + 1}. ${escapeHtml(seg.title)}</a>`
  ).join('');

  const segmentsHtml = lesson.segments.map((seg, i) => `
    <section class="segment" id="segment-${i}">
      <div class="segment-header">
        <h2>${escapeHtml(seg.title)}</h2>
        <span class="segment-time">${Math.floor(seg.startTime / 60)}:${String(Math.floor(seg.startTime % 60)).padStart(2, '0')} - ${Math.floor(seg.endTime / 60)}:${String(Math.floor(seg.endTime % 60)).padStart(2, '0')}</span>
      </div>
      <div class="segment-activities">
        ${seg.activities.map((act, actIdx) => generateActivityHtml(act, i * 100 + actIdx)).join('\n')}
      </div>
    </section>
  `).join('\n');

  const whiteboardHtml = whiteboardStates.length > 0 ? `
    <section class="whiteboard-notes" id="notes">
      <h2>📝 Class Notes</h2>
      <div class="notes-grid">
        ${whiteboardStates.map((state, i) => `
          <div class="note-card">
            <div class="note-timestamp">⏱️ ${Math.floor(state.timestamp / 60)}:${String(Math.floor(state.timestamp % 60)).padStart(2, '0')}</div>
            ${state.snapshot ? `<img src="${state.snapshot}" alt="Note ${i + 1}" class="note-image">` : '<div class="note-empty">No screenshot</div>'}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(lesson.metadata.title)} - Video Lesson</title>
  <style>
    :root {
      --primary: #667eea;
      --primary-dark: #5a67d8;
      --secondary: #764ba2;
      --success: #22c55e;
      --error: #ef4444;
      --warning: #f59e0b;
      --bg: #0f0c29;
      --bg-card: rgba(255,255,255,0.05);
      --text: #ffffff;
      --text-muted: #9ca3af;
      --border: rgba(255,255,255,0.1);
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, var(--bg) 0%, #302b63 50%, #24243e 100%);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }
    
    .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
    
    /* Header */
    .header {
      text-align: center;
      padding: 3rem 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }
    .header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    .header .subtitle { color: var(--text-muted); font-size: 1.1rem; }
    .learner-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1.5rem;
      padding: 1rem;
      background: var(--bg-card);
      border-radius: 1rem;
      max-width: 300px;
      margin-left: auto;
      margin-right: auto;
    }
    .learner-avatar { font-size: 2.5rem; }
    .learner-name { font-weight: 600; }
    
    /* Navigation */
    .segments-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--bg-card);
      border-radius: 1rem;
      margin-bottom: 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    .segment-link {
      padding: 0.5rem 1rem;
      background: rgba(255,255,255,0.1);
      border-radius: 0.5rem;
      color: var(--text);
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .segment-link:hover { background: var(--primary); }
    
    /* Video */
    .video-container {
      margin-bottom: 2rem;
      border-radius: 1rem;
      overflow: hidden;
      background: #000;
    }
    .video-container video { width: 100%; display: block; }
    
    /* Segments */
    .segment {
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    .segment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--primary);
    }
    .segment-header h2 {
      font-size: 1.5rem;
      color: var(--primary);
    }
    .segment-time {
      background: var(--bg-card);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    
    /* Activity Cards */
    .activity-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-left: 4px solid var(--activity-color);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      transition: transform 0.2s;
    }
    .activity-card:hover { transform: translateX(5px); }
    
    .activity-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .activity-emoji { font-size: 2.5rem; }
    .activity-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--activity-color);
    }
    .activity-meta {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    .activity-meta span {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.1);
    }
    .activity-points { color: var(--warning); font-weight: 600; }
    
    /* Lesson Content */
    .lesson-content {
      background: rgba(0,0,0,0.2);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .lesson-section { margin-bottom: 0.75rem; }
    .lesson-section h4 {
      font-size: 0.875rem;
      color: var(--activity-color);
      margin-bottom: 0.25rem;
    }
    .lesson-section p { font-size: 0.9rem; color: var(--text-muted); }
    .lesson-section ul { padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-muted); }
    .lesson-section.highlight {
      background: rgba(var(--primary), 0.1);
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid var(--primary);
    }
    .form-text { font-family: monospace; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.25rem; }
    
    /* Activity Content */
    .activity-content { margin-top: 1rem; }
    .question-text { font-size: 1.1rem; margin-bottom: 1rem; }
    
    /* Flashcards */
    .flashcard-deck { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }
    .flashcard {
      width: 280px;
      height: 180px;
      perspective: 1000px;
      cursor: pointer;
    }
    .flashcard-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }
    .flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }
    .flashcard-front, .flashcard-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      border-radius: 1rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .flashcard-front {
      background: linear-gradient(135deg, var(--activity-color), rgba(0,0,0,0.3));
      border: 2px solid var(--activity-color);
    }
    .flashcard-back {
      background: linear-gradient(135deg, #1f2937, #111827);
      border: 2px solid var(--activity-color);
      transform: rotateY(180deg);
    }
    .card-number { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-bottom: 0.5rem; }
    .card-front-text { font-size: 1.5rem; font-weight: 700; }
    .pronunciation { font-size: 0.875rem; color: rgba(255,255,255,0.7); margin-top: 0.5rem; }
    .flip-hint { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.5rem; }
    .card-back-text { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .translation { font-size: 0.875rem; color: #a855f7; background: rgba(168,85,247,0.1); padding: 0.25rem 0.5rem; border-radius: 0.25rem; margin-bottom: 0.5rem; }
    .example { font-size: 0.875rem; font-style: italic; color: var(--text-muted); }
    
    /* Options */
    .options-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .option-btn {
      padding: 1rem;
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: 0.75rem;
      color: var(--text);
      cursor: pointer;
      text-align: left;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .option-btn:hover { border-color: var(--primary); background: rgba(102,126,234,0.1); }
    .option-btn.correct { border-color: var(--success); background: rgba(34,197,94,0.2); }
    .option-btn.incorrect { border-color: var(--error); background: rgba(239,68,68,0.2); }
    .option-btn.disabled { pointer-events: none; opacity: 0.6; }
    
    /* True/False */
    .true-false-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .tf-btn {
      padding: 2rem;
      font-size: 1.25rem;
      font-weight: 700;
      border: 3px solid var(--border);
      border-radius: 1rem;
      background: var(--bg-card);
      color: var(--text);
      cursor: pointer;
      transition: all 0.2s;
    }
    .tf-true:hover { border-color: var(--success); background: rgba(34,197,94,0.1); }
    .tf-false:hover { border-color: var(--error); background: rgba(239,68,68,0.1); }
    .tf-btn.correct { border-color: var(--success); background: rgba(34,197,94,0.3); }
    .tf-btn.incorrect { border-color: var(--error); background: rgba(239,68,68,0.3); }
    
    /* Fill Blanks */
    .sentence-with-blanks { font-size: 1.1rem; line-height: 2; }
    .blank-input {
      border: none;
      border-bottom: 2px solid var(--primary);
      background: transparent;
      color: var(--primary);
      font-size: 1rem;
      width: 120px;
      padding: 0.25rem;
      margin: 0 0.25rem;
      text-align: center;
      outline: none;
    }
    .blank-input.correct { border-color: var(--success); color: var(--success); }
    .blank-input.incorrect { border-color: var(--error); color: var(--error); }
    
    /* Matching */
    .matching-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .match-item {
      padding: 0.75rem 1rem;
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .match-item.selected { border-color: var(--primary); background: rgba(102,126,234,0.2); }
    .match-item.matched { border-color: var(--success); background: rgba(34,197,94,0.2); }
    
    /* Ordering */
    .sortable-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .sortable-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: 0.5rem;
      cursor: grab;
    }
    .sortable-item:active { cursor: grabbing; }
    .order-num { font-weight: 700; color: var(--primary); width: 1.5rem; }
    .item-text { flex: 1; }
    .drag-handle { color: var(--text-muted); }
    .sortable-item.correct { border-color: var(--success); }
    .sortable-item.incorrect { border-color: var(--error); }
    
    /* Scramble */
    .scramble-container { text-align: center; }
    .scrambled-word {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 0.5rem;
      margin-bottom: 1rem;
      color: var(--activity-color);
    }
    .scramble-input {
      width: 100%;
      max-width: 300px;
      padding: 1rem;
      font-size: 1.5rem;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.25rem;
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: 0.75rem;
      color: var(--text);
      outline: none;
    }
    .scramble-input:focus { border-color: var(--primary); }
    
    /* Speaking */
    .speaking-container { text-align: center; }
    .expected-sentence {
      font-size: 1.25rem;
      font-style: italic;
      margin-bottom: 1.5rem;
      color: var(--activity-color);
    }
    .speak-btn, .record-btn {
      padding: 1rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 0.75rem;
      cursor: pointer;
      margin: 0.5rem;
      transition: all 0.2s;
    }
    .speak-btn { background: var(--primary); color: white; }
    .record-btn { background: var(--secondary); color: white; }
    .speak-btn:hover, .record-btn:hover { transform: scale(1.05); }
    .transcript-area {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--bg-card);
      border-radius: 0.5rem;
      min-height: 3rem;
    }
    
    /* Reflection */
    .prompt-text { font-size: 1.1rem; margin-bottom: 1rem; }
    .reflection-textarea {
      width: 100%;
      padding: 1rem;
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: 0.75rem;
      color: var(--text);
      font-size: 1rem;
      resize: vertical;
      outline: none;
    }
    .reflection-textarea:focus { border-color: var(--primary); }
    
    /* Buttons */
    .check-btn, .submit-btn {
      display: block;
      width: 100%;
      padding: 1rem;
      margin-top: 1rem;
      font-size: 1rem;
      font-weight: 700;
      border: none;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
    }
    .check-btn:hover, .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102,126,234,0.4); }
    
    /* Feedback */
    .feedback-area {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 0.5rem;
      display: none;
    }
    .feedback-area.show { display: block; }
    .feedback-area.success { background: rgba(34,197,94,0.2); border: 1px solid var(--success); }
    .feedback-area.error { background: rgba(239,68,68,0.2); border: 1px solid var(--error); }
    
    /* Whiteboard Notes */
    .whiteboard-notes { margin-top: 3rem; }
    .whiteboard-notes h2 { color: var(--primary); margin-bottom: 1.5rem; }
    .notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .note-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      overflow: hidden;
    }
    .note-timestamp {
      padding: 0.75rem;
      background: rgba(102,126,234,0.1);
      color: var(--primary);
      font-weight: 600;
    }
    .note-image { width: 100%; display: block; }
    .note-empty { padding: 2rem; text-align: center; color: var(--text-muted); }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 2rem;
      margin-top: 3rem;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .header h1 { font-size: 1.75rem; }
      .activity-header { flex-direction: column; text-align: center; }
      .matching-columns { grid-template-columns: 1fr; }
      .true-false-btns { grid-template-columns: 1fr; }
    }
    
    /* Animations */
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    .shake { animation: shake 0.3s ease-in-out; }
    
    @keyframes pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    .pop { animation: pop 0.3s ease-in-out; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>📹 ${escapeHtml(lesson.metadata.title)}</h1>
      <p class="subtitle">${escapeHtml(lesson.metadata.targetLanguage)} • Level ${escapeHtml(lesson.metadata.cefrLevel)}</p>
      <div class="learner-info">
        <span class="learner-avatar">${escapeHtml(learnerAvatar)}</span>
        <span class="learner-name">${escapeHtml(learnerName)}</span>
      </div>
    </header>
    
    <nav class="segments-nav">
      ${segmentsNav}
      ${whiteboardStates.length > 0 ? '<a href="#notes" class="segment-link">📝 Notes</a>' : ''}
    </nav>
    
    ${includeVideo && lesson.metadata.videoUrl ? `
    <div class="video-container">
      <video controls>
        <source src="${escapeHtml(lesson.metadata.videoUrl)}" type="video/mp4">
        Your browser does not support video playback.
      </video>
    </div>
    ` : ''}
    
    <main>
      ${segmentsHtml}
      ${whiteboardHtml}
    </main>
    
    <footer class="footer">
      <p>Created with Video Lesson • ${new Date().toLocaleDateString()}</p>
      <p>Interactive language learning made simple</p>
    </footer>
  </div>
  
  <script>
    // XP tracking
    let totalXP = 0;
    
    function showFeedback(container, success, message) {
      const feedback = container.querySelector('.feedback-area');
      if (feedback) {
        feedback.className = 'feedback-area show ' + (success ? 'success' : 'error');
        feedback.innerHTML = (success ? '✅ ' : '❌ ') + message;
      }
      if (success) {
        container.classList.add('pop');
        setTimeout(() => container.classList.remove('pop'), 300);
      } else {
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 300);
      }
    }
    
    function checkAnswer(btn, id, isCorrect) {
      const container = btn.closest('.activity-card');
      const allBtns = container.querySelectorAll('.option-btn');
      allBtns.forEach(b => {
        b.classList.add('disabled');
        if (b.dataset.id === id && isCorrect) b.classList.add('correct');
        else if (b.dataset.id === id && !isCorrect) b.classList.add('incorrect');
        const correctId = container.querySelector('.options-grid').dataset.correct;
        if (b.dataset.id === correctId) b.classList.add('correct');
      });
      showFeedback(container, isCorrect, isCorrect ? 'Correct! Well done!' : 'Not quite. The correct answer is highlighted.');
    }
    
    function checkTF(btn, isCorrect) {
      const container = btn.closest('.activity-card');
      const allBtns = container.querySelectorAll('.tf-btn');
      allBtns.forEach(b => b.style.pointerEvents = 'none');
      btn.classList.add(isCorrect ? 'correct' : 'incorrect');
      showFeedback(container, isCorrect, isCorrect ? 'Correct!' : 'Not quite right.');
    }
    
    function checkFillBlanks(container) {
      const card = container.closest('.activity-card');
      const inputs = container.querySelectorAll('.blank-input');
      let allCorrect = true;
      inputs.forEach(input => {
        const answer = input.dataset.answer.toLowerCase();
        const value = input.value.trim().toLowerCase();
        if (value === answer) {
          input.classList.add('correct');
        } else {
          input.classList.add('incorrect');
          allCorrect = false;
        }
        input.disabled = true;
      });
      showFeedback(card, allCorrect, allCorrect ? 'Perfect!' : 'Some answers need correction.');
    }
    
    function checkScramble(container) {
      const card = container.closest('.activity-card');
      const input = container.querySelector('.scramble-input');
      const answer = input.dataset.answer.toUpperCase();
      const value = input.value.trim().toUpperCase();
      const isCorrect = value === answer;
      input.style.borderColor = isCorrect ? 'var(--success)' : 'var(--error)';
      input.disabled = true;
      showFeedback(card, isCorrect, isCorrect ? 'Correct! ' + answer : 'The answer was: ' + answer);
    }
    
    function checkOrdering(container) {
      const card = container.closest('.activity-card');
      const correct = JSON.parse(container.dataset.correct);
      const items = container.querySelectorAll('.sortable-item');
      let allCorrect = true;
      items.forEach((item, i) => {
        const text = item.dataset.text;
        if (text === correct[i]) {
          item.classList.add('correct');
        } else {
          item.classList.add('incorrect');
          allCorrect = false;
        }
      });
      showFeedback(card, allCorrect, allCorrect ? 'Perfect order!' : 'Not quite right. Check the order.');
    }
    
    // Matching logic
    let selectedLeft = null;
    document.querySelectorAll('.match-item.left').forEach(item => {
      item.addEventListener('click', function() {
        document.querySelectorAll('.match-item.left').forEach(i => i.classList.remove('selected'));
        this.classList.add('selected');
        selectedLeft = this.dataset.pair;
      });
    });
    document.querySelectorAll('.match-item.right').forEach(item => {
      item.addEventListener('click', function() {
        if (selectedLeft !== null && this.dataset.pair === selectedLeft) {
          this.classList.add('matched');
          document.querySelector('.match-item.left[data-pair="' + selectedLeft + '"]').classList.add('matched');
        }
        selectedLeft = null;
        document.querySelectorAll('.match-item.left').forEach(i => i.classList.remove('selected'));
      });
    });
    
    function checkMatching(container) {
      const card = container.closest('.activity-card');
      const leftItems = container.querySelectorAll('.match-item.left');
      const allMatched = Array.from(leftItems).every(item => item.classList.contains('matched'));
      showFeedback(card, allMatched, allMatched ? 'All matched correctly!' : 'Keep matching the pairs.');
    }
    
    function submitReflection(container) {
      const card = container.closest('.activity-card');
      const textarea = container.querySelector('.reflection-textarea');
      if (textarea.value.trim().length > 10) {
        textarea.disabled = true;
        showFeedback(card, true, 'Response saved! Great reflection.');
      } else {
        showFeedback(card, false, 'Please write a more detailed response.');
      }
    }
    
    function speakText(text) {
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.9;
        speechSynthesis.speak(utter);
      }
    }
    
    function startSpeechRecognition(btn) {
      const container = btn.closest('.speaking-container');
      const card = btn.closest('.activity-card');
      const transcriptArea = container.querySelector('.transcript-area');
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        
        btn.textContent = '🔴 Listening...';
        btn.style.background = 'var(--error)';
        
        recognition.onresult = function(event) {
          const transcript = event.results[0][0].transcript;
          transcriptArea.innerHTML = '<strong>You said:</strong> "' + transcript + '"';
          showFeedback(card, true, 'Great job speaking!');
        };
        
        recognition.onend = function() {
          btn.textContent = '🎤 Start Speaking';
          btn.style.background = 'var(--secondary)';
        };
        
        recognition.start();
      } else {
        transcriptArea.innerHTML = 'Speech recognition not supported in this browser.';
      }
    }
    
    // Drag and drop for ordering
    let draggedItem = null;
    document.querySelectorAll('.sortable-item').forEach(item => {
      item.addEventListener('dragstart', function() {
        draggedItem = this;
        this.style.opacity = '0.5';
      });
      item.addEventListener('dragend', function() {
        this.style.opacity = '1';
        document.querySelectorAll('.sortable-item').forEach((item, i) => {
          item.querySelector('.order-num').textContent = i + 1;
        });
      });
      item.addEventListener('dragover', function(e) {
        e.preventDefault();
      });
      item.addEventListener('drop', function(e) {
        e.preventDefault();
        if (draggedItem !== this) {
          const list = this.parentNode;
          const items = Array.from(list.children);
          const draggedIdx = items.indexOf(draggedItem);
          const targetIdx = items.indexOf(this);
          if (draggedIdx < targetIdx) {
            this.after(draggedItem);
          } else {
            this.before(draggedItem);
          }
        }
      });
    });
  </script>
</body>
</html>`;
}

export function downloadLessonHTML(options: ExportOptions): void {
  const html = generateInteractiveHTML(options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.lesson.metadata.title.replace(/[^a-zA-Z0-9]/g, '-')}-lesson.html`;
  a.click();
  URL.revokeObjectURL(url);
}