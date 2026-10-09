import { escapeHtml, cleanTextForSpeech } from "./textFormatters";
import type {
  StructuredOutput,
  LearnerProfile,
  LearningPackage,
  Section,
  Activity,
  WeeklyChallengeOutput,
  LessonSettings,
  LessonImage,
  LessonVideo,
} from "../types";
import { getAccessibilityWidget } from "./html/accessibility";
import { getAnnotationFeatures } from "./html/annotations";
import { buildLessonFileName, getLessonFilePrefill } from "./lessonFileNaming";
import { getSplashScreenWidget } from "./html/splashScreen";
import { getCollaborationWidget } from "./html/collaboration";
import { useAppStore } from "../store/useAppStore";
import { injectMediaHtml } from "./lessonMedia";

export type { LessonSettings, LessonImage, LessonVideo };

export interface SidebarLink {
  id: string;
  title: string;
  icon?: string;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  light: string;
  dark: string;
  emojis: string[];
}

export interface GeneratorOptions {
  relativePaths?: boolean;
  hideInstructionsAndTOC?: boolean;
}

const DEFAULT_DEADLINE_DAYS = 7;

export const getFormattedDate = (isoDate?: string): string => {
  if (!isoDate) return new Date().toLocaleDateString();
  return new Date(isoDate).toLocaleDateString();
};

export const formatDateLocalized = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const getThemeConfig = (color: string): ThemeConfig => {
  const c = color.toLowerCase();
  if (c.includes('emerald') || c.includes('green') || c === '#10b981') {
    return {
      primary: '#059669',
      secondary: '#10b981',
      light: '#ecfdf5',
      dark: '#064e3b',
      emojis: ['🌱', '🌿', '🌳', '🌲', '🍃', '✨'],
    };
  }
  if (c.includes('purple') || c.includes('violet') || c === '#8b5cf6') {
    return {
      primary: '#7c3aed',
      secondary: '#8b5cf6',
      light: '#f5f3ff',
      dark: '#4c1d95',
      emojis: ['🔮', '✨', '🪐', '💜', '⚡'],
    };
  }
  if (c.includes('amber') || c.includes('orange') || c === '#f59e0b') {
    return {
      primary: '#d97706',
      secondary: '#f59e0b',
      light: '#fffbeb',
      dark: '#78350f',
      emojis: ['☀️', '⚡', '🔥', '🍂', '✨'],
    };
  }
  // Default Indigo / Blue
  return {
    primary: '#2563eb',
    secondary: '#3b82f6',
    light: '#eff6ff',
    dark: '#1e3a8a',
    emojis: ['🌟', '💡', '📘', '🚀', '🎯', '✨'],
  };
};

export const extractEmoji = (text: string): string | null => {
  const match = text.match(/[\u{1F300}-\u{1F9FF}]/u);
  return match ? match[0] : null;
};

export const calculateSectionDates = (
  count: number,
  nextClassDate?: string
): string[] => {
  const dates: string[] = [];
  const now = new Date();
  const target = nextClassDate ? new Date(nextClassDate) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const diffTime = Math.max(1, target.getTime() - now.getTime());
  const interval = diffTime / Math.max(1, count);

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getTime() + (i + 1) * interval);
    dates.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  }
  return dates;
};

export const calculateReadingTime = (text: string): number => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 150));
};

export const getHeaderThemeColor = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes('grammar')) return '#8b5cf6';
  if (t.includes('business') || t.includes('professional')) return '#059669';
  if (t.includes('conversation') || t.includes('speaking')) return '#f59e0b';
  if (t.includes('vocabulary') || t.includes('challenge')) return '#0d9488';
  return '#2563eb';
};

export const getAggregateSkillTags = (mainContentHtml: string): string => {
  const tags: string[] = [];
  if (/listening|audio|podcast/i.test(mainContentHtml)) tags.push('<span class="meta-badge"><i class="fas fa-headphones"></i> Listening</span>');
  if (/speaking|pronunciation|dialogue/i.test(mainContentHtml)) tags.push('<span class="meta-badge"><i class="fas fa-microphone"></i> Speaking</span>');
  if (/reading|comprehension|article/i.test(mainContentHtml)) tags.push('<span class="meta-badge"><i class="fas fa-book-open"></i> Reading</span>');
  if (/writing|essay|composition/i.test(mainContentHtml)) tags.push('<span class="meta-badge"><i class="fas fa-pen"></i> Writing</span>');
  if (/grammar|rules|tense/i.test(mainContentHtml)) tags.push('<span class="meta-badge"><i class="fas fa-puzzle-piece"></i> Grammar</span>');
  if (/vocabulary|lexicon|idioms/i.test(mainContentHtml)) tags.push('<span class="meta-badge"><i class="fas fa-spell-check"></i> Vocabulary</span>');
  return tags.join(' ');
};

export const renderRevealableAnswerHtml = (answerHtml: string): string => {
  return `
    <div class="revealable-answer-container" style="margin-top:8px;">
      <button class="reveal-btn" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.innerHTML = this.nextElementSibling.style.display === 'none' ? '<i class=\'fas fa-eye\'></i> Show Answer' : '<i class=\'fas fa-eye-slash\'></i> Hide Answer';" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:600; cursor:pointer;">
        <i class="fas fa-eye"></i> Show Answer
      </button>
      <div class="revealed-content" style="display:none; margin-top:6px; padding:10px 12px; background:#f0fdf4; border-left:3px solid #10b981; border-radius:4px; font-size:13px; color:#166534;">
        ${answerHtml}
      </div>
    </div>
  `;
};

const convertMarkdownToHtml = (md: string): string => {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h3 class="lesson-h3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="lesson-h2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="lesson-h1">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br>');
};

const generateFloatingEmojis = (emojis: string[]): string => {
  return emojis
    .map(
      (e, i) =>
        `<span class="floating-emoji" style="left:${10 + i * 15}%; animation-delay:${i * 0.7}s;">${e}</span>`
    )
    .join('');
};

const materialLinkParts = (raw: string): { href: string; domain: string } => {
  const text = raw.trim();
  const href = /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, '')}`;
  let domain = '';
  try {
    domain = new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    domain = '';
  }
  return { href, domain };
};

const generateMaterialsSection = (links: string[]): string => {
  const cards = links
    .map((l, idx) => {
      const { href, domain } = materialLinkParts(l);
      return `
          <li>
            <a class="premium-link-card" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
              <span class="plc-index">${idx + 1}</span>
              <span class="plc-icon"><i class="fas fa-external-link-alt"></i></span>
              <span class="plc-text">
                <span class="plc-title">${escapeHtml(l)}</span>
                ${domain ? `<span class="plc-domain"><i class="fas fa-globe"></i> ${escapeHtml(domain)}</span>` : ''}
              </span>
              <span class="plc-arrow"><i class="fas fa-chevron-right"></i></span>
            </a>
          </li>
        `;
    })
    .join('');
  const countLabel = links.length === 1 ? 'resource' : 'resources';
  return `
    <section id="section-materials" class="lesson-card premium-support-card premium-materials-card">
      <div class="section-header premium-sec-head materials-head">
        <div class="premium-sec-icon"><i class="fas fa-link"></i></div>
        <div class="premium-sec-title">
          <span class="premium-sec-kicker">Curated Resources</span>
          <h2>Recommended Materials &amp; Links</h2>
        </div>
        <span class="premium-sec-count">${links.length} ${countLabel}</span>
      </div>
      <div class="section-body">
        <ul class="premium-links-list">${cards}
        </ul>
      </div>
    </section>
  `;
};

const generateFilesSection = (files: any[], relativePaths?: boolean): string => {
  return `
    <section id="section-files" class="lesson-card" style="margin-bottom: 2rem;">
      <div class="section-header">
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #1e293b;"><i class="fas fa-paperclip" style="color:#6366f1; margin-right:8px;"></i> Attached Files & Resources</h2>
      </div>
      <div class="section-body">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
          ${files
            .map((f) => {
              const url = relativePaths && f.path ? f.path : f.url || '#';
              return `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 13px; font-weight: 600; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(f.name || 'Resource File')}</span>
                  <a href="${escapeHtml(url)}" target="_blank" download style="color: #4f46e5; margin-left: 8px;"><i class="fas fa-download"></i></a>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </section>
  `;
};

const renderNoteRichText = (notes: string): string => {
  let html = escapeHtml(notes);
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replace(/\n/g, '<br>');
  return html;
};

const generateTeacherNotesSection = (notes: string): string => {
  return `
    <section id="section-notes" class="lesson-card premium-support-card premium-notes-card">
      <div class="section-header premium-sec-head notes-head">
        <div class="premium-sec-icon"><i class="fas fa-comment-dots"></i></div>
        <div class="premium-sec-title">
          <span class="premium-sec-kicker">Private Guidance</span>
          <h2>Tutor Note &amp; Guidance</h2>
        </div>
      </div>
      <div class="section-body">
        <i class="fas fa-quote-right premium-note-quote" aria-hidden="true"></i>
        <div class="premium-note-text">${renderNoteRichText(notes)}</div>
      </div>
    </section>
  `;
};

const generateChecklistSection = (items: string[]): string => {
  const rows = items
    .map(
      (it, idx) => `
          <label class="premium-check-item" for="chk-item-${idx}">
            <input type="checkbox" id="chk-item-${idx}" class="premium-check-input">
            <span class="premium-check-box"><i class="fas fa-check"></i></span>
            <span class="premium-check-num">${idx + 1}</span>
            <span class="premium-check-text">${escapeHtml(it)}</span>
          </label>
        `
    )
    .join('');
  return `
    <section id="section-checklist" class="lesson-card premium-support-card premium-checklist-card">
      <div class="section-header premium-sec-head checklist-head">
        <div class="premium-sec-icon"><i class="fas fa-tasks"></i></div>
        <div class="premium-sec-title">
          <span class="premium-sec-kicker">Progress Path</span>
          <h2>Lesson Milestones Checklist</h2>
        </div>
        <span class="checklist-progress-chip"><span id="chk-done-count">0</span>/${items.length}</span>
      </div>
      <div class="section-body">
        <div class="checklist-progress-track"><div class="checklist-progress-fill" id="chk-progress-fill"></div></div>
        <div class="premium-checklist-list">${rows}
        </div>
      </div>
      <script>
        (function() {
          var boxes = document.querySelectorAll('#section-checklist .premium-check-input');
          var fill = document.getElementById('chk-progress-fill');
          var doneEl = document.getElementById('chk-done-count');
          var total = boxes.length || 1;
          function syncChecklist() {
            var done = 0;
            boxes.forEach(function(b) { if (b.checked) done++; });
            if (doneEl) doneEl.textContent = String(done);
            if (fill) fill.style.width = Math.round((done / total) * 100) + '%';
          }
          boxes.forEach(function(b) {
            b.addEventListener('change', function() {
              var row = b.closest('.premium-check-item');
              if (row) row.classList.toggle('done', b.checked);
              syncChecklist();
            });
          });
          syncChecklist();
        })();
      </script>
    </section>
  `;
};

const generateGamificationSection = (themeColor: string): string => {
  return `
    <section id="section-gamification" class="lesson-card" style="margin-bottom: 2rem; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0;">
      <div class="section-header">
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #166534;"><i class="fas fa-trophy" style="color:#eab308; margin-right:8px;"></i> Weekly Mastery Quest</h2>
      </div>
      <div class="section-body" style="font-size: 0.95rem; color: #14532d;">
        <p>Complete all tasks, record your speech answers, and submit your responses to cultivate your <strong>Habit Forest</strong> and earn maximum XP!</p>
      </div>
    </section>
  `;
};

const generateSidebarHtml = (
  links: SidebarLink[],
  topContent: string = '',
  hideTOC: boolean = false
): string => {
  return `
    <div class="sidebar-inner" style="position: sticky; top: 20px;">
      ${topContent}
      <div class="sidebar-progress">
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px;">
          <span>Syllabus Progress</span>
          <span id="sidebar-progress-percent">0%</span>
        </div>
        <div style="background: #e2e8f0; height: 8px; border-radius: 99px; overflow: hidden;">
          <div id="sidebar-progress-bar" style="background: linear-gradient(90deg, #10b981, #34d399); width: 0%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>
      ${
        !hideTOC
          ? `
      <nav class="sidebar-nav" id="sidebar-nav" style="display: flex; flex-direction: column; gap: 4px;">
        ${links
          .map(
            (l, idx) => `
          <div class="toc-item" data-target="${l.id}">
            <input type="checkbox" id="chk-${l.id}" title="Mark completed">
            <a href="#${l.id}" class="toc-link">
              <i class="fas ${l.icon || 'fa-bookmark'}"></i>
              <span>${escapeHtml(l.title)}</span>
            </a>
          </div>
        `
          )
          .join('')}
      </nav>
      `
          : ''
      }
    </div>
  `;
};

// --------------------------------------------------------------------------
// SAFE ACTIVITY CONTENT RENDERING
// --------------------------------------------------------------------------
// Activities in sectioned lessons often carry JSON.stringify() content (roleplays,
// quiz questions, speaking games, flashcards…). Injecting that string raw made the
// export show the JSON as visible code. These helpers parse it and render it as
// readable cards — the interactive studio and the modern lesson engine handle the
// same shapes interactively, this is a clean static fallback that NEVER prints code.

const escVal = (v: unknown): string => escapeHtml(v == null ? '' : String(v));

const detailsBlock = (label: string, body: string): string =>
  `<details style="margin:10px 0 4px;"><summary style="cursor:pointer;font-weight:700;color:#2563eb;font-size:0.85rem;">${label}</summary><div style="margin-top:8px;padding:10px 12px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;color:#334155;font-size:0.92rem;line-height:1.6;">${body}</div></details>`;

/** Pull the first complete JSON value out of a string, tolerating trailing text that may
 *  have been appended next to the JSON (legacy exports used to print content raw). */
const extractJsonPrefix = (text: string): string | null => {
  const start = text.search(/[\[\{]/);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
};

const jsonToHtml = (parsed: any): string => {
  const esc = escVal;
  if (Array.isArray(parsed)) {
    // vocabulary_table / word lists
    const vocabish =
      parsed.length > 0 &&
      parsed.every((o: any) => o && typeof o === 'object' && ('word' in o || 'term' in o));
    if (vocabish) {
      return `<div class="vocab-block">${parsed
        .map(
          (o: any, i: number) =>
            `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><strong style="color:#1e293b;">${i + 1}. ${esc(o.word || o.term)}</strong><div style="color:#475569;font-size:0.9rem;">${esc(o.definition || o.meaning || o.translation || '')}</div>${o.example ? `<div style="color:#64748b;font-size:0.85rem;font-style:italic;margin-top:2px;">“${esc(o.example)}”</div>` : ''}</div>`
        )
        .join('')}</div>`;
    }
    // matching pairs / phrase-meaning / flashcards
    if (parsed.length > 0 && parsed.every((o: any) => o && typeof o === 'object')) {
      const items = parsed
        .map((o: any, i: number) => {
          const left = o.left || o.front || o.phrase || o.term || o.prompt || '';
          const right = o.right || o.back || o.meaning || o.definition || o.translation || o.answer || o.match || '';
          if (!left && !right) return '';
          return `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;"><span style="flex:1;font-weight:600;color:#1e293b;">${i + 1}. ${esc(left)}</span><span style="flex:1;color:#475569;">${esc(right)}</span></div>`;
        })
        .filter(Boolean)
        .join('');
      return items ? `<div style="margin:6px 0;">${items}</div>` : '';
    }
    // plain list of strings
    if (parsed.every((o: any) => typeof o === 'string')) {
      return parsed.map((t: any) => `<p style="margin:6px 0;">${esc(t)}</p>`).join('');
    }
  }
  if (parsed && typeof parsed === 'object') {
    // 🎭 Dialogue model / roleplay
    if (Array.isArray(parsed.lines)) {
      const ctx = parsed.context ? `<div style="font-weight:600;color:#0e7490;margin-bottom:8px;">${esc(parsed.context)}</div>` : '';
      const dialogue = parsed.lines
        .map(
          (l: any) =>
            `<div style="display:flex;gap:10px;margin:7px 0;align-items:flex-start;"><span style="flex:0 0 auto;font-weight:800;color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:999px;font-size:0.8rem;">${esc(l.speaker || 'Speaker')}</span><span style="flex:1;color:#1e293b;">${esc(l.text || '')}</span></div>`
        )
        .join('');
      const yourTurn = Array.isArray(parsed.yourTurn) && parsed.yourTurn.length
        ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1;"><div style="font-weight:700;color:#b45309;font-size:0.85rem;">🎤 Your turn</div>${parsed.yourTurn.map((t: any) => `<div style="margin:4px 0;color:#334155;">• ${esc(t)}</div>`).join('')}</div>`
        : '';
      return `${ctx}${dialogue}${yourTurn}`;
    }
    // 🎲 Speaking game rounds
    if (Array.isArray(parsed.rounds)) {
      const head = parsed.game ? `<div style="font-weight:800;color:#7c3aed;margin-bottom:6px;">${esc(parsed.game)}</div>` : '';
      const rounds = parsed.rounds
        .map((r: any, i: number) => {
          const text = r.text || r.question || r.prompt || r.statement || '';
          const tag = r.type ? `<span style="display:inline-block;background:#f3e8ff;color:#6d28d9;border-radius:999px;font-size:0.72rem;font-weight:700;padding:1px 8px;margin-right:6px;">${esc(String(r.type).replace(/_/g, ' '))}</span>` : '';
          return `<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;">${i + 1}. ${tag}${esc(text)}</div>`;
        })
        .join('');
      return `${head}<div style="margin:6px 0;">${rounds}</div>`;
    }
    // Flashcards {cards:[{front,back}]}
    if (Array.isArray(parsed.cards)) {
      return parsed.cards
        .map(
          (c: any, i: number) =>
            `<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;"><strong style="color:#1e293b;">${i + 1}. ${esc(c.front || '')}</strong>${detailsBlock('Show answer', esc(c.back || ''))}</div>`
        )
        .join('');
    }
    // Matching {pairs:[{left,right}]}
    if (Array.isArray(parsed.pairs)) {
      return parsed.pairs
        .map(
          (p: any, i: number) =>
            `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;"><span style="flex:1;font-weight:600;color:#1e293b;">${i + 1}. ${esc(p.left || '')}</span><span style="flex:1;color:#475569;">↔ ${esc(p.right || '')}</span></div>`
        )
        .join('');
    }
    // Sorting {categories, items:[{text,category}]}
    if (Array.isArray(parsed.items)) {
      const cats: string[] = Array.isArray(parsed.categories) ? parsed.categories : [];
      if (cats.length) {
        return cats
          .map((cat) => {
            const kids = parsed.items.filter((it: any) => (it.category || '') === cat);
            return `<div style="margin:6px 0;"><strong style="color:#0f766e;">▸ ${esc(cat)}</strong><div style="margin:2px 0 2px 14px;color:#334155;">${kids.map((it: any) => `• ${esc(it.text || it.label || it.item || '')}`).join('<br/>') || '—'}</div></div>`;
          })
          .join('');
      }
    }
    // Gap-fill / error-correction {sentences:[...]}
    if (Array.isArray(parsed.sentences)) {
      const rows = parsed.sentences
        .map((s: any, i: number) => {
          if (!s) return '';
          const sentence = s.sentence || s.text || '';
          const answer = s.correction || s.correctAnswer || s.answer || s.correctSentence || s.error || '';
          const explanation = s.explanation || '';
          return `<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;"><div style="color:#1e293b;">${i + 1}. ${esc(sentence)}</div>${answer ? detailsBlock('Check', `${explanation ? `<em style="color:#64748b;">${esc(explanation)}</em><br/>` : ''}${esc(answer)}`) : ''}</div>`;
        })
        .filter(Boolean)
        .join('');
      return rows ? `<div style="margin:6px 0;">${rows}</div>` : '';
    }
    // MC / True-False / comprehension {questions:[{question, options, answer}]}
    if (Array.isArray(parsed.questions)) {
      const rows = parsed.questions
        .map((q: any, i: number) => {
          if (!q) return '';
          const opts = Array.isArray(q.options) && q.options.length
            ? `<ul style="margin:6px 0 0 18px;color:#475569;">${q.options.map((o: any) => `<li>${esc(o)}</li>`).join('')}</ul>`
            : '';
          const ans = q.answer || q.correctAnswer || q.correct || '';
          return `<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;"><strong style="color:#1e293b;">${i + 1}. ${esc(q.question || '')}</strong>${opts}${ans ? detailsBlock('Show answer', `${q.explanation ? `<em style="color:#64748b;">${esc(q.explanation)}</em><br/>` : ''}${esc(ans)}`) : ''}</div>`;
        })
        .filter(Boolean)
        .join('');
      return rows ? `<div style="margin:6px 0;">${rows}</div>` : '';
    }
    // Speaking jam {topic, tips/bullets/prompts, duration/minTimeSec}
    if (parsed.topic) {
      const bullets = Array.isArray(parsed.tips) ? parsed.tips : Array.isArray(parsed.bullets) ? parsed.bullets : Array.isArray(parsed.prompts) ? parsed.prompts : [];
      const time = parsed.duration || parsed.minTimeSec || parsed.time || '';
      const head = `${time ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:999px;font-size:0.75rem;font-weight:700;padding:1px 10px;margin-right:6px;">⏱ ${esc(time)}${typeof parsed.minTimeSec === 'number' ? 's' : ''}</span>` : ''}${esc(parsed.topic)}`;
      return `<div style="font-weight:600;color:#1e293b;">${head}</div>${bullets.length ? `<ul style="margin:8px 0 0 18px;color:#475569;">${bullets.map((b: any) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}`;
    }
    // Voice recording / essay {prompt}
    if (parsed.prompt) {
      const extra = parsed.minWords ? `<div style="color:#64748b;font-size:0.85rem;">Minimum ${esc(parsed.minWords)} words</div>` : '';
      return `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 12px;color:#7c2d12;"><div style="font-weight:700;margin-bottom:4px;">📋 Task</div><div>${esc(parsed.prompt)}</div>${extra}</div>`;
    }
  }
  // Generic object: readable definition list — never raw JSON.
  const entries = Object.entries(parsed || {});
  if (entries.length) {
    return `<div style="margin:6px 0;">${entries
      .map(([k, v]) => {
        if (v == null) return '';
        const val = Array.isArray(v) ? v.map((x: any) => (x && typeof x === 'object' ? Object.values(x).filter((y) => y != null).map(escVal).join(' — ') : escVal(x))).join('<br/>') : escVal(v);
        return `<div style="padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="font-weight:700;color:#334155;">${esc(String(k).replace(/_/g, ' '))}:</span> <span style="color:#1e293b;">${val}</span></div>`;
      })
      .filter((s) => s !== '')
      .join('')}</div>`;
  }
  return esc(parsed);
};

const renderActivityContentSafe = (content: unknown): string => {
  const raw = content == null ? '' : String(content).trim();
  if (!raw) return '';
  const jsonCandidate = extractJsonPrefix(raw);
  if (jsonCandidate) {
    try {
      return jsonToHtml(JSON.parse(jsonCandidate));
    } catch {
      // fall through to plain rendering below — never raw-code it
    }
  }
  if (raw.includes('<')) return raw; // already formatted HTML content
  return `<div style="white-space:pre-wrap">${escVal(raw)}</div>`;
};

const generateSectionHtml = (section: any, id: string, goalDate?: string): string => {
  const acts = section.activities || [];
  return `
    <section id="${id}" class="lesson-card section-card" style="margin-bottom: 2.5rem; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
      <div class="section-header" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
          <span style="color: ${section.color || '#2563eb'};">${section.title || 'Lesson Section'}</span>
        </h2>
        <div style="display: flex; align-items: center; gap: 10px;">
          ${goalDate ? `<span style="font-size: 12px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 6px;"><i class="fas fa-calendar-day" style="margin-right:4px;"></i> Goal: ${goalDate}</span>` : ''}
          ${section.studyTime ? `<span style="font-size: 12px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 4px 8px; border-radius: 6px;"><i class="fas fa-stopwatch" style="margin-right:4px;"></i> ${section.studyTime}</span>` : ''}
        </div>
      </div>
      <div class="section-body">
        ${acts
          .map((act: any, aIdx: number) => {
            const actId = `card-${id}-act-${aIdx}`;
            return `
              <div id="${actId}" class="duo-card activity-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
                <div class="duo-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b;">${escapeHtml(act.title || `Activity ${aIdx + 1}`)}</h3>
                  <button class="duo-bookmark-btn" data-bookmark-id="${actId}" onclick="if(window.LessonApp && window.LessonApp.toggleBookmark) window.LessonApp.toggleBookmark('${actId}', '${escapeHtml(act.title || 'Activity')}');" style="background: none; border: none; font-size: 16px; color: #94a3b8; cursor: pointer;" title="Bookmark this activity"><i class="far fa-bookmark"></i></button>
                </div>
                <div class="activity-content" style="font-size: 0.95rem; color: #334155; line-height: 1.6;">
                  ${renderActivityContentSafe(act.content)}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
};

// ============================================================================
// STYLES BUILDERS
// ============================================================================

/**
 * Alpha tints of the theme palette, published as real tokens.
 *
 * CSS cannot concatenate an alpha onto a var() reference: writing a var() token and then gluing two
 * alpha digits after it is an INVALID declaration, and the browser drops the whole declaration -
 * losing the background AND any border declared beside it. Every tint the app needs is therefore
 * emitted as its own token (`--theme-info-14`), built from the base hex plus a two-digit alpha.
 */
export const THEME_TINT_ALPHAS = [
  '02', '03', '05', '06', '08', '10', '12', '14', '15', '16', '18', '20', '22', '25', '30', '40', '50', '55', '60',
];

export const buildThemeTintTokens = (
  bases: Record<string, string>,
  indent = '    ',
): string =>
  Object.entries(bases)
    .flatMap(([name, hex]) => {
      const clean = String(hex || '').trim();
      // Only 6-digit hex bases can carry a two-digit alpha.
      if (!/^#[0-9a-fA-F]{6}$/.test(clean)) return [];
      return THEME_TINT_ALPHAS.map((alpha) => `${indent}--theme-${name}-${alpha}: ${clean}${alpha};`);
    })
    .join('\n');

const generateBaseStyles = (themeColor: string): string => `
  :root {
    --primary-color: ${themeColor || '#2563eb'};
    --primary-light: #eff6ff;
    --primary-dark: #1e3a8a;
    --theme-primary: ${themeColor || '#2563eb'};
    --theme-secondary: #10b981;
    --theme-radius: 12px;
    /* Theme tokens used by the shared Bookmarks & Notes panels — without these
       the panels render with a transparent background (invisible on white). */
    --theme-bg: #f8fafc;
    --theme-surface: #ffffff;
    --theme-text: #1e293b;
    --theme-text-secondary: #64748b;
    --theme-accent: ${themeColor || '#2563eb'};
    --theme-success: #10b981;
    --theme-error: #ef4444;
    --theme-warning: #f59e0b;
    --theme-info: #3b82f6;
${buildThemeTintTokens({
    primary: themeColor || '#2563eb',
    secondary: '#10b981',
    accent: themeColor || '#2563eb',
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    text: '#1e293b',
    'text-secondary': '#64748b',
    bg: '#f8fafc',
    surface: '#ffffff',
  })}
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background-color: #f8fafc;
    line-height: 1.5;
  }
  h1, h2, h3, h4 { color: #0f172a; }
  a { color: var(--primary-color); text-decoration: none; }
`;

const generateLayoutStyles = (): string => `
  .page-container {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 16px 24px;
    box-sizing: border-box;
  }
  .page-header {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 16px;
    padding: 24px 28px;
    color: #ffffff;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
    width: 100%;
    box-sizing: border-box;
  }
  .page-header.has-bg-image {
    background-color: #0f172a;
    background-size: cover;
    background-position: center;
  }
  .page-header .header-content {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
  }
  .page-header .meta-badge {
    background: rgba(15, 23, 42, 0.55);
    border-color: rgba(255, 255, 255, 0.35);
  }
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    position: relative;
    z-index: 2;
  }
  .header-text h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
  }
  .header-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .meta-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
  /* ===== Save Report: the one call to action in the header =====
     Every selector carries BOTH classes on purpose, and the base rule is additionally
     scoped to .page-header. The themed stylesheet appends its own .meta-badge rule later
     in the document; a single-class selector would lose to it, and a bare .meta-badge.save-
     report-cta selector only TIES with .page-header .meta-badge (both 0-2-0), winning by
     source order alone. Scoping it to .page-header makes the base rule 0-3-0, so the
     button's size, colour and gradient can never be flattened back into an ordinary badge. */
  .page-header .meta-badge.save-report-cta {
    position: relative;
    overflow: hidden;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: .015em;
    padding: 10px 20px;
    border-radius: 12px;
    border: 1.5px solid rgba(255, 255, 255, 0.62);
    background-image: linear-gradient(135deg, var(--theme-secondary, #10b981), #0ea5e9 130%);
    color: #ffffff;
    cursor: pointer;
    margin-left: 8px;
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
    animation: save-report-pull 3.4s ease-in-out infinite;
  }
  .meta-badge.save-report-cta i { font-size: 16px; transition: transform 0.2s ease; }
  .meta-badge.save-report-cta::after {
    content: '';
    position: absolute;
    top: 0; bottom: 0; left: -60%;
    width: 55%;
    background: linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.5), rgba(255,255,255,0));
    transform: skewX(-18deg);
    opacity: 0;
    pointer-events: none;
  }
  /* The mouse heading for it: the button lifts, brightens and sweeps a shine across. */
  .meta-badge.save-report-cta:hover, .meta-badge.save-report-cta:focus-visible {
    transform: translateY(-2px) scale(1.07);
    box-shadow: 0 12px 30px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.45);
    filter: saturate(1.15);
    animation-play-state: paused;
  }
  .meta-badge.save-report-cta:hover i, .meta-badge.save-report-cta:focus-visible i { transform: rotate(-12deg) scale(1.15); }
  .meta-badge.save-report-cta:hover::after, .meta-badge.save-report-cta:focus-visible::after { opacity: 1; animation: save-report-shine 0.7s ease-out forwards; }
  .meta-badge.save-report-cta:active { transform: translateY(0) scale(1.02); }
  @keyframes save-report-pull {
    0%, 100% { box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35); }
    50% { box-shadow: 0 9px 26px rgba(16, 185, 129, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.45); }
  }
  @keyframes save-report-shine { from { left: -60%; } to { left: 115%; } }
  /* Reduced motion keeps the size, the colour and the lean-in; only the
     continuous pulse and the shine sweep are dropped. */
  @media (prefers-reduced-motion: reduce) {
    .meta-badge.save-report-cta { animation: none; }
    .meta-badge.save-report-cta:hover::after { animation: none; opacity: 0; }
  }
  @media (max-width: 640px) {
    .meta-badge.save-report-cta { width: 100%; justify-content: center; font-size: 14px; padding: 12px 18px; margin-left: 0; }
  }
  .page-wrapper {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    width: 100%;
    box-sizing: border-box;
  }
  @media (max-width: 992px) {
    .page-wrapper { grid-template-columns: 1fr; }
  }
  .main-content { min-width: 0; width: 100%; padding-bottom: 96px; }
  .floating-emoji {
    position: absolute;
    bottom: -20px;
    font-size: 24px;
    opacity: 0.15;
    animation: floatUp 8s infinite linear;
    pointer-events: none;
  }
  @keyframes floatUp {
    0% { transform: translateY(0) rotate(0deg); opacity: 0.15; }
    50% { opacity: 0.3; }
    100% { transform: translateY(-200px) rotate(360deg); opacity: 0; }
  }
  #exit-print-mode-btn { display: none; }
`;

const generateBatteryStyles = (): string => `
  /* Ultra-Enhanced Cyber Glass Deadline Battery */
  .battery-container {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.65) 100%);
    padding: 12px 18px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.15);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 175px;
    cursor: pointer;
    user-select: none;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
  }
  .battery-container::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    transition: left 0.6s ease;
  }
  .battery-container:hover {
    transform: translateY(-3px) scale(1.02);
    border-color: rgba(52, 211, 153, 0.6);
    box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.5), 0 0 25px rgba(16, 185, 129, 0.35);
  }
  .battery-container:hover::before {
    left: 100%;
  }

  .battery-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 6px;
  }
  .battery-bolt-icon {
    font-size: 13px;
    color: #34d399;
    filter: drop-shadow(0 0 4px #34d399);
    animation: boltFlicker 2.5s infinite;
  }
  @keyframes boltFlicker {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.15); }
  }
  .battery-label-text {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #e2e8f0;
  }
  .battery-status-badge {
    font-size: 9px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 20px;
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
    border: 1px solid rgba(52, 211, 153, 0.3);
    letter-spacing: 0.5px;
  }
  .battery-status-badge.warning {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.3);
  }
  .battery-status-badge.urgent {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border-color: rgba(248, 113, 113, 0.3);
  }

  .battery-body-wrapper {
    display: flex;
    align-items: center;
    margin: 2px 0;
  }
  .battery-body {
    position: relative;
    width: 72px;
    height: 30px;
    border: 2.5px solid rgba(255, 255, 255, 0.85);
    border-radius: 8px;
    padding: 2.5px;
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }
  .battery-terminal-cap {
    width: 4px;
    height: 12px;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 0 3px 3px 0;
    margin-left: 2px;
    box-shadow: 0 0 4px rgba(255,255,255,0.4);
  }

  .battery-fill {
    height: 100%;
    background: linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%);
    border-radius: 4px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.6s ease;
    position: relative;
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
  }
  .battery-fill-glow {
    position: absolute;
    top: 0; right: 0; bottom: 0; width: 8px;
    background: rgba(255, 255, 255, 0.7);
    filter: blur(2px);
  }

  .battery-grid-pips {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    pointer-events: none;
    z-index: 2;
  }
  .battery-grid-pips span {
    width: 1px;
    height: 100%;
    background: rgba(255, 255, 255, 0.15);
  }

  .battery-footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 6px;
    margin-top: 2px;
  }
  .battery-text {
    font-size: 13px;
    font-weight: 800;
    color: #f8fafc;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    letter-spacing: -0.2px;
  }
  .battery-open-hint {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 3px;
    transition: all 0.2s;
  }
  .battery-container:hover .battery-open-hint {
    color: #34d399;
    background: rgba(16, 185, 129, 0.2);
  }

  .battery-pulse { animation: bat-pulse 1.2s infinite ease-in-out; }
  @keyframes bat-pulse {
    0%, 100% { opacity: 1; filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.6)); }
    50% { opacity: 0.55; filter: drop-shadow(0 0 1px rgba(239, 68, 68, 0.2)); }
  }

  /* ========================================================================= */
  /* STUDY HABITS & MILESTONE MODAL STYLING                                    */
  /* ========================================================================= */
  .habits-modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483645;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 16px;
    animation: habitsFadeIn 0.25s ease-out;
  }
  @keyframes habitsFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .habits-modal-card {
    background: #ffffff;
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8);
    max-width: 680px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    animation: habitsSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes habitsSlideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .habits-modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 24px 24px 0 0;
  }
  .habits-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .habits-header-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  .habits-header-title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
  }
  .habits-header-sub {
    margin: 2px 0 0 0;
    font-size: 13px;
    color: #64748b;
  }
  .habits-modal-close {
    background: #e2e8f0;
    border: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    font-size: 18px;
    color: #475569;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .habits-modal-close:hover {
    background: #cbd5e1;
    color: #0f172a;
    transform: rotate(90deg);
  }

  .habits-modal-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Metric KPI Grid */
  .habits-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  @media (max-width: 600px) {
    .habits-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
  .habit-kpi-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }
  .habit-kpi-card:hover {
    background: #ffffff;
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  .habit-kpi-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .habit-kpi-value {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    font-family: 'JetBrains Mono', monospace;
  }
  .habit-kpi-sub {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
  }

  /* Enhanced Habit Forest Card */
  .habit-forest-hub-card {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%);
    border-radius: 18px;
    padding: 20px;
    color: white;
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 25px -5px rgba(6, 78, 59, 0.3);
  }
  .habit-forest-hub-card::after {
    content: '';
    position: absolute;
    top: -50%; right: -20%; width: 250px; height: 250px;
    background: radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, transparent 70%);
    pointer-events: none;
  }
  .habit-forest-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    position: relative;
    z-index: 2;
  }
  .habit-forest-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.15);
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .habit-forest-growth-stage {
    font-size: 12px;
    font-weight: 600;
    color: #a7f3d0;
  }
  .habit-forest-center-visual {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    position: relative;
    z-index: 2;
  }
  .habit-forest-tree-icon {
    font-size: 48px;
    filter: drop-shadow(0 0 12px rgba(167, 243, 208, 0.6));
    animation: gentleSway 4s ease-in-out infinite;
    flex-shrink: 0;
  }
  .habit-forest-tree-icon svg { display: block; }
  @keyframes gentleSway {
    0%, 100% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(4deg) scale(1.05); }
  }
  .habit-forest-tree-details h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: #ffffff;
  }
  .habit-forest-tree-details p {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #d1fae5;
    line-height: 1.4;
  }
  .habit-forest-plant-tip {
    margin: 4px 0 14px 0;
    padding: 8px 12px;
    font-size: 11.5px;
    line-height: 1.45;
    color: #ecfdf5;
    background: rgba(16, 185, 129, 0.18);
    border: 1px solid rgba(52, 211, 153, 0.35);
    border-radius: 10px;
    position: relative;
    z-index: 2;
  }

  /* 7-Day Streak capsules */
  .habit-streak-week-capsules {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    position: relative;
    z-index: 2;
  }
  .habit-capsule {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    padding: 6px 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    transition: all 0.2s;
  }
  .habit-capsule.active-day {
    background: rgba(52, 211, 153, 0.3);
    border-color: #34d399;
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.4);
  }
  .habit-capsule-name {
    font-size: 10px;
    font-weight: 800;
    color: #e2e8f0;
  }
  .habit-capsule-emoji {
    font-size: 16px;
  }
  .habit-capsule-tree svg { display: block; width: 22px; height: 26px; }
  .habit-capsule-time {
    font-size: 9px;
    font-weight: 700;
    color: #a7f3d0;
  }

  /* Section Checklist & Auto-Jump */
  .habits-sections-container {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .habits-sections-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .habits-sections-title {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .habits-sections-count {
    font-size: 12px;
    font-weight: 700;
    color: #3b82f6;
    background: #eff6ff;
    padding: 3px 8px;
    border-radius: 20px;
  }

  .habits-jump-next-banner {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border: 1px solid #bfdbfe;
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .habits-jump-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .habits-jump-icon {
    font-size: 20px;
  }
  .habits-jump-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #1e40af;
  }
  .habits-jump-name {
    font-size: 13px;
    font-weight: 700;
    color: #1e3a8a;
  }
  .habits-jump-btn {
    background: #2563eb;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .habits-jump-btn:hover {
    background: #1d4ed8;
    transform: translateX(2px);
  }

  .habits-sections-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .habits-section-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    transition: all 0.2s;
    cursor: pointer;
  }
  .habits-section-item:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  .habits-section-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    overflow: hidden;
  }
  .habits-section-checkbox {
    width: 18px;
    height: 18px;
    accent-color: #10b981;
    cursor: pointer;
    flex-shrink: 0;
  }
  .habits-section-title-text {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: all 0.2s;
  }
  .habits-section-item.is-completed .habits-section-title-text {
    text-decoration: line-through;
    color: #94a3b8;
    font-style: italic;
  }
  .habits-section-item.is-completed {
    background: #f0fdf4;
    border-color: #dcfce7;
  }
  .habits-section-date-pill {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    background: rgba(0,0,0,0.04);
    padding: 2px 6px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .habits-modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #f1f5f9;
    background: #f8fafc;
    border-radius: 0 0 24px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .habits-footer-btn-primary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }
  .habits-footer-btn-primary:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  .habits-footer-btn-secondary {
    background: #ffffff;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }
  .habits-footer-btn-secondary:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

`;

const generateProgressStyles = (): string => `
  .sidebar-progress {
    margin-bottom: 1.5rem;
    padding: 14px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  }
  .toc-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    transition: all 0.2s;
  }
  .toc-item:hover {
    background: #f1f5f9;
  }
  .toc-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #10b981;
    cursor: pointer;
    flex-shrink: 0;
  }
  .toc-link {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .toc-item input[type="checkbox"]:checked + a span {
    text-decoration: line-through;
    color: #94a3b8;
    font-style: italic;
  }
`;

const generateSectionStyles = (): string => `
  .lesson-card {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .qa-item {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
  }
`;

const generateActivityStyles = (): string => `
  .duo-card {
    transition: border-color 0.2s;
  }
  .duo-card:hover {
    border-color: #cbd5e1;
  }
`;

const generateInteractiveWidgetStyles = (): string => `
  .js-matching-game, .js-scramble-game {
    margin: 16px 0;
  }
`;

const generateMaterialStyles = (): string => ``;
const generateAnswerStyles = (): string => ``;
const generateMiscStyles = (): string => ``;
const generateAnimationStyles = (): string => ``;
const generateTranscriberStyles = (): string => `
  #live-transcriber-overlay { display: none; }
`;
const generateResponsiveStyles = (): string => ``;
const generatePrintStyles = (): string => ``;

// ============================================================================
// SCRIPTS BUILDERS
// ============================================================================

const generateBaseScript = (
  learner: LearnerProfile,
  targetDate: number
): string => `
  const userPreferredVoice = "${learner.readAloudVoice || ""}";
  window.speechRate = 1.0;
  let voices = [];

  function loadVoices() {
    if ('speechSynthesis' in window) {
      try {
        voices = window.speechSynthesis.getVoices();
      } catch(e) {}
    }
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // =========================================================================
  // ACTIVE STUDY HABIT & TIME ENGINE
  // =========================================================================
  window.__SESSION_START_MS = Date.now();
  window.__SESSION_STUDY_SECONDS = 0;
  const LESSON_PAGE_TITLE = window.__LESSON_PAGE_TITLE || document.title || "Lesson";
  const STUDY_TIME_STORAGE_KEY = "tutorly_lesson_study_secs_" + encodeURIComponent(LESSON_PAGE_TITLE);

  function getTodayDateStr() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  window.loadHabitData = function() {
    try {
      return JSON.parse(localStorage.getItem('habit_tracker_data') || '{}');
    } catch(e) {
      return {};
    }
  };

  window.saveHabitData = function(d) {
    try {
      localStorage.setItem('habit_tracker_data', JSON.stringify(d));
    } catch(e) {}
  };

  function getLifetimeStudySeconds() {
    try {
      return parseInt(localStorage.getItem(STUDY_TIME_STORAGE_KEY) || '0', 10);
    } catch(e) {
      return 0;
    }
  }

  function addStudySecond() {
    if (document.visibilityState === 'visible') {
      window.__SESSION_STUDY_SECONDS++;
      const today = getTodayDateStr();
      const habitData = window.loadHabitData();
      habitData[today] = (habitData[today] || 0) + 1;
      window.saveHabitData(habitData);

      try {
        const prevLifetime = getLifetimeStudySeconds();
        localStorage.setItem(STUDY_TIME_STORAGE_KEY, (prevLifetime + 1).toString());
      } catch(e) {}

      const liveSessionEl = document.getElementById('habit-modal-live-session');
      if (liveSessionEl) {
        const m = Math.floor(window.__SESSION_STUDY_SECONDS / 60);
        const s = window.__SESSION_STUDY_SECONDS % 60;
        liveSessionEl.textContent = m + 'm ' + s + 's';
      }
      const liveLifetimeEl = document.getElementById('habit-modal-lifetime');
      if (liveLifetimeEl) {
        const tot = getLifetimeStudySeconds();
        const m = Math.floor(tot / 60);
        liveLifetimeEl.textContent = m + 'm';
      }
    }
  }
  setInterval(addStudySecond, 1000);

  // Hyper-realistic SVG tree art — one tree that grows through 5 stages as study time accumulates.
  function treeArtSvg(stage) {
    const s = Math.max(1, Math.min(5, stage));
    const trunkG = '<linearGradient id="htrunk' + s + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9a6b3f"/><stop offset="60%" stop-color="#6f4a26"/><stop offset="100%" stop-color="#4a2f15"/></linearGradient>';
    const canG = '<radialGradient id="hcan' + s + '" cx="38%" cy="28%" r="72%"><stop offset="0%" stop-color="#92dd6f"/><stop offset="55%" stop-color="#4ca348"/><stop offset="100%" stop-color="#1e6b33"/></radialGradient>';
    const ground = '<ellipse cx="50" cy="113" rx="27" ry="4.5" fill="#3a2413" opacity="0.28"/>';
    const arts = {
      1: '<svg viewBox="0 0 100 120" width="104" height="124" xmlns="http://www.w3.org/2000/svg"><defs>' + canG + '</defs>' + ground +
        '<path d="M50 112 C50 101 50 93 50 85" stroke="#5a8f3d" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M50 87 C41 79 33 75 27 64 C41 64 48 71 50 83 Z" fill="url(#hcan' + s + ')"/>' +
        '<path d="M50 81 C59 73 66 69 72 58 C60 58 53 64 50 77 Z" fill="#57b44c"/></svg>',
      2: '<svg viewBox="0 0 100 120" width="104" height="124" xmlns="http://www.w3.org/2000/svg"><defs>' + canG + '</defs>' + ground +
        '<path d="M50 112 C50 99 50 88 50 76" stroke="#5a8f3d" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<path d="M50 96 C41 88 31 84 23 74 C38 73 46 79 50 91 Z" fill="url(#hcan' + s + ')"/>' +
        '<path d="M50 90 C60 82 69 78 76 68 C62 68 54 74 50 86 Z" fill="#57b44c"/>' +
        '<path d="M50 80 C42 74 36 70 32 61 C44 63 49 69 50 76 Z" fill="#6ec95a"/></svg>',
      3: '<svg viewBox="0 0 100 120" width="108" height="128" xmlns="http://www.w3.org/2000/svg"><defs>' + trunkG + canG + '</defs>' + ground +
        '<path d="M46 112 C46 98 47 90 50 80 L54 80 C57 90 58 98 58 112 Z" fill="url(#htrunk' + s + ')"/>' +
        '<path d="M50 90 C44 85 38 81 32 78" stroke="#6f4a26" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M50 86 C56 81 62 77 68 74" stroke="#6f4a26" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="47" cy="63" r="19" fill="url(#hcan' + s + ')"/>' +
        '<circle cx="62" cy="69" r="14" fill="#57b44c"/>' +
        '<circle cx="36" cy="70" r="13" fill="#2e8b47"/></svg>',
      4: '<svg viewBox="0 0 100 120" width="112" height="132" xmlns="http://www.w3.org/2000/svg"><defs>' + trunkG + canG + '</defs>' + ground +
        '<path d="M43 112 C43 96 45 86 49 74 L55 74 C59 86 61 96 61 112 Z" fill="url(#htrunk' + s + ')"/>' +
        '<path d="M49 88 C40 82 32 79 25 77" stroke="#6f4a26" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M55 84 C63 79 70 75 76 72" stroke="#6f4a26" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<circle cx="46" cy="57" r="22" fill="url(#hcan' + s + ')"/>' +
        '<circle cx="66" cy="62" r="16" fill="#57b44c"/>' +
        '<circle cx="32" cy="63" r="15" fill="#2e8b47"/>' +
        '<circle cx="52" cy="45" r="13" fill="#6ec95a"/></svg>',
      5: '<svg viewBox="0 0 100 120" width="118" height="138" xmlns="http://www.w3.org/2000/svg"><defs>' + trunkG + canG + '</defs>' + ground +
        '<path d="M40 112 C40 94 43 82 48 68 L56 68 C61 82 64 94 64 112 Z" fill="url(#htrunk' + s + ')"/>' +
        '<path d="M48 86 C38 79 29 76 20 74" stroke="#6f4a26" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M56 82 C65 77 73 73 80 70" stroke="#6f4a26" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="45" cy="50" r="24" fill="url(#hcan' + s + ')"/>' +
        '<circle cx="68" cy="56" r="18" fill="#57b44c"/>' +
        '<circle cx="28" cy="57" r="16" fill="#2e8b47"/>' +
        '<circle cx="52" cy="36" r="14" fill="#6ec95a"/>' +
        '<circle cx="73" cy="40" r="10" fill="#8fdc6e"/>' +
        '<circle cx="38" cy="44" r="9" fill="#4ca348"/>' +
        '<circle cx="58" cy="52" r="3" fill="#e2574c"/><circle cx="40" cy="60" r="3" fill="#e2574c"/><circle cx="64" cy="66" r="3" fill="#e2574c"/></svg>',
    };
    return arts[s];
  }

  function getHabitTreeStage(totalSeconds) {
    const m = totalSeconds / 60;
    if (m < 10) return { art: treeArtSvg(1), stage: 'Stage 1: Sprout', name: 'Fresh Sprout', desc: 'You just planted your tree! Every study session waters it — keep going.', minNeeded: 10 };
    if (m < 25) return { art: treeArtSvg(2), stage: 'Stage 2: Seedling', name: 'Growing Seedling', desc: 'Your sapling is taking root. Studying every day builds a real habit.', minNeeded: 25 };
    if (m < 45) return { art: treeArtSvg(3), stage: 'Stage 3: Young Tree', name: 'Young Tree', desc: 'A strong trunk is forming — steady study is growing your tree.', minNeeded: 45 };
    if (m < 75) return { art: treeArtSvg(4), stage: 'Stage 4: Mature Tree', name: 'Mature Tree', desc: 'A full, healthy canopy! Your daily study habit is paying off.', minNeeded: 75 };
    return { art: treeArtSvg(5), stage: 'Stage 5: Forest', name: 'Forest', desc: 'A complete, full-grown forest — built tree by tree with consistent study.', minNeeded: 999 };
  }

  // =========================================================================
  // ENHANCED BATTERY HEADER UPDATER
  // =========================================================================
  function updateBatteryHeader() {
    const targetDate = ${targetDate};
    const now = Date.now();
    const distance = targetDate - now;
    const daysLeft = distance / (1000 * 60 * 60 * 24);
    const maxDays = 7;

    const fillEl = document.getElementById('header-battery-fill');
    const textEl = document.getElementById('header-battery-text');

    if (!fillEl || !textEl) return;

    if (distance <= 0) {
      fillEl.style.width = '0%';
      textEl.innerHTML = "EXPIRED";
      textEl.style.color = "#ef4444";
      fillEl.classList.remove('battery-pulse');
      return;
    }

    const percentage = Math.min(100, Math.max(8, (daysLeft / maxDays) * 100));
    fillEl.style.width = percentage + '%';

    if (daysLeft > 3) {
      fillEl.style.background = 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)';
      fillEl.classList.remove('battery-pulse');
    } else if (daysLeft > 1) {
      fillEl.style.background = 'linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)';
      fillEl.classList.remove('battery-pulse');
    } else {
      fillEl.style.background = 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)';
      fillEl.classList.add('battery-pulse');
    }

    const d = Math.floor(distance / (1000 * 60 * 60 * 24));
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    textEl.innerHTML = d + "d " + h + "h";
  }

  // =========================================================================
  // STUDY HABITS & PROGRESS POPUP MODAL
  // =========================================================================
  window.openStudyHabitsModal = function() {
    const existing = document.getElementById('study-habits-modal');
    if (existing) existing.remove();

    const isPresenter = (window.__LESSON_MODE === 'presenter');
    const habitData = window.loadHabitData();
    const today = getTodayDateStr();
    const todaySecs = habitData[today] || 0;
    const lifetimeSecs = getLifetimeStudySeconds() + window.__SESSION_STUDY_SECONDS;
    const treeInfo = getHabitTreeStage(todaySecs);

    const sidebarNav = document.getElementById('sidebar-nav');
    const checkboxes = sidebarNav ? Array.from(sidebarNav.querySelectorAll('.toc-item[data-target^="sec-"] input[type="checkbox"]')) : [];
    const totalSections = checkboxes.length || 1;
    const checkedCount = checkboxes.filter(c => c.checked).length;
    const completionPct = Math.round((checkedCount / totalSections) * 100);

    let streakDays = 0;
    const checkDate = new Date();
    for (let i = 0; i < 30; i++) {
      const dStr = checkDate.getFullYear() + '-' + (checkDate.getMonth() + 1) + '-' + checkDate.getDate();
      if ((habitData[dStr] || 0) >= 60) {
        streakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    let nextUncompletedSec = null;
    let nextUncompletedId = null;
    if (sidebarNav) {
      for (const cb of checkboxes) {
        if (!cb.checked) {
          const parentItem = cb.closest('.toc-item');
          const titleSpan = parentItem ? parentItem.querySelector('.toc-link span') : null;
          nextUncompletedSec = titleSpan ? titleSpan.textContent : "Next Section";
          nextUncompletedId = parentItem ? parentItem.getAttribute('data-target') : null;
          break;
        }
      }
    }

    const capsules = [];
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const past = new Date(d);
      past.setDate(past.getDate() - i);
      const ds = past.getFullYear() + '-' + (past.getMonth() + 1) + '-' + past.getDate();
      const s = habitData[ds] || 0;
      const m = Math.floor(s / 60);
      const dayName = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][past.getDay()];
      const isAct = m >= 15;
      const tArt = getHabitTreeStage(s).art;
      capsules.push('<div class="habit-capsule ' + (isAct ? 'active-day' : '') + '">' +
        '<span class="habit-capsule-name">' + dayName + '</span>' +
        '<span class="habit-capsule-tree">' + tArt + '</span>' +
        '<span class="habit-capsule-time">' + m + 'm</span>' +
      '</div>');
    }

    const sectionsData = window.__LESSON_SECTIONS_DATA || [];
    const sectionListHtml = sectionsData.map((sec, idx) => {
      const cb = document.getElementById('chk-' + sec.id);
      const isDone = cb ? cb.checked : false;
      return '<div class="habits-section-item ' + (isDone ? 'is-completed' : '') + '" data-secid="' + sec.id + '">' +
        '<div class="habits-section-left">' +
          '<input type="checkbox" class="habits-section-checkbox" ' + (isDone ? 'checked' : '') + '>' +
          '<span class="habits-section-title-text">' + (idx + 1) + '. ' + (sec.title || 'Section') + '</span>' +
        '</div>' +
        '<button type="button" class="habits-section-date-pill" data-jump="' + sec.id + '" title="Jump to section">' +
          '<i class="fas fa-arrow-right"></i>' +
        '</button>' +
      '</div>';
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'study-habits-modal';
    modal.className = 'habits-modal-overlay';
    modal.onclick = function(e) {
      if (e.target === modal) modal.remove();
    };

    let jumpBannerHtml = '';
    if (nextUncompletedSec && nextUncompletedId) {
      jumpBannerHtml = '<div class="habits-jump-next-banner">' +
        '<div class="habits-jump-left">' +
          '<span class="habits-jump-icon">🚀</span>' +
          '<div>' +
            '<div class="habits-jump-label">Next Up</div>' +
            '<div class="habits-jump-name">' + nextUncompletedSec + '</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="habits-jump-btn" id="habits-jump-btn-action" data-jump="' + nextUncompletedId + '">' +
          'Jump to Section <i class="fas fa-chevron-right"></i>' +
        '</button>' +
      '</div>';
    }

    modal.innerHTML = '<div class="habits-modal-card">' +
      '<div class="habits-modal-header">' +
        '<div class="habits-header-left">' +
          '<div class="habits-header-icon">' +
            '<i class="fas ' + (isPresenter ? 'fa-chalkboard-teacher' : 'fa-seedling') + '"></i>' +
          '</div>' +
          '<div>' +
            '<h3 class="habits-header-title">' + (isPresenter ? 'Tutor Pacing & Student Progress' : 'Study Habits & Forest') + '</h3>' +
            '<p class="habits-header-sub">' + (isPresenter ? 'Engagement stats, syllabus checklist & executive overview' : 'Study to plant a tree — every session waters it and grows your forest.') + '</p>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="habits-modal-close" id="habits-modal-close-btn">&times;</button>' +
      '</div>' +
      '<div class="habits-modal-body">' +
        '<div class="habits-kpi-grid">' +
          '<div class="habit-kpi-card">' +
            '<div class="habit-kpi-label"><i class="fas fa-clock" style="color:#2563eb;"></i> Session</div>' +
            '<div class="habit-kpi-value" id="habit-modal-live-session">' + Math.floor(window.__SESSION_STUDY_SECONDS / 60) + 'm ' + (window.__SESSION_STUDY_SECONDS % 60) + 's</div>' +
            '<div class="habit-kpi-sub">Active focus</div>' +
          '</div>' +
          '<div class="habit-kpi-card">' +
            '<div class="habit-kpi-label"><i class="fas fa-history" style="color:#7c3aed;"></i> Total Time</div>' +
            '<div class="habit-kpi-value" id="habit-modal-lifetime">' + Math.floor(lifetimeSecs / 60) + 'm</div>' +
            '<div class="habit-kpi-sub">Lifetime study</div>' +
          '</div>' +
          '<div class="habit-kpi-card">' +
            '<div class="habit-kpi-label"><i class="fas fa-tasks" style="color:#10b981;"></i> Syllabus</div>' +
            '<div class="habit-kpi-value" id="habit-modal-progress-pct">' + completionPct + '%</div>' +
            '<div class="habit-kpi-sub">' + checkedCount + '/' + totalSections + ' Done</div>' +
          '</div>' +
          '<div class="habit-kpi-card">' +
            '<div class="habit-kpi-label"><i class="fas fa-fire" style="color:#f59e0b;"></i> Streak</div>' +
            '<div class="habit-kpi-value">' + streakDays + ' Days</div>' +
            '<div class="habit-kpi-sub">Consistency 🔥</div>' +
          '</div>' +
        '</div>' +
        '<div class="habit-forest-hub-card">' +
          '<div class="habit-forest-top-row">' +
            '<div class="habit-forest-badge">' +
              '<span>Habit Forest</span>' +
              '<span class="habit-forest-growth-stage">' + treeInfo.stage + '</span>' +
            '</div>' +
            '<div style="font-size:12px; font-weight:700; color:#d1fae5;">Today: ' + Math.floor(todaySecs / 60) + 'm</div>' +
          '</div>' +
          '<div class="habit-forest-center-visual">' +
            '<div class="habit-forest-tree-icon">' + treeInfo.art + '</div>' +
            '<div class="habit-forest-tree-details">' +
              '<h4>' + treeInfo.name + '</h4>' +
              '<p>' + treeInfo.desc + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="habit-forest-plant-tip">Study to plant a tree — every session waters it, and a daily habit grows it into your forest.</div>' +
          '<div class="habit-streak-week-capsules">' +
            capsules.join('') +
          '</div>' +
        '</div>' +
        '<div class="habits-sections-container">' +
          '<div class="habits-sections-header">' +
            '<h4 class="habits-sections-title"><i class="fas fa-list-check" style="color:#3b82f6;"></i> Lesson Syllabus Checklist</h4>' +
            '<span class="habits-sections-count" id="habits-sections-count-badge">' + checkedCount + ' of ' + totalSections + ' Completed</span>' +
          '</div>' +
          jumpBannerHtml +
          '<div class="habits-sections-list" id="habits-sections-list">' +
            (sectionListHtml || '<div style="padding:10px; color:#94a3b8; font-size:13px;">No section syllabus defined.</div>') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="habits-modal-footer">' +
        '<button type="button" class="habits-footer-btn-secondary" id="habits-footer-close-btn">' +
          '<i class="fas fa-times"></i> Close Hub' +
        '</button>' +
        '<button type="button" class="habits-footer-btn-primary" id="habits-footer-save-btn">' +
          '<i class="fas fa-file-archive"></i> Save Report' +
        '</button>' +
      '</div>' +
    '</div>';

    document.body.appendChild(modal);

    // Event listeners
    const closeBtn = document.getElementById('habits-modal-close-btn');
    if (closeBtn) closeBtn.onclick = function() { modal.remove(); };

    const footerClose = document.getElementById('habits-footer-close-btn');
    if (footerClose) footerClose.onclick = function() { modal.remove(); };

    const footerSave = document.getElementById('habits-footer-save-btn');
    if (footerSave) footerSave.onclick = function() {
      modal.remove();
      if (window.downloadSessionReport) window.downloadSessionReport();
    };

    const jumpActionBtn = document.getElementById('habits-jump-btn-action');
    if (jumpActionBtn) {
      jumpActionBtn.onclick = function() {
        const tid = jumpActionBtn.getAttribute('data-jump');
        window.scrollToSectionFromModal(tid);
      };
    }

    // Section list clicks. Let the native checkbox toggle itself first; then
    // mirror that value to the sidebar. Do not invert it a second time.
    modal.querySelectorAll('.habits-section-item').forEach(function(item) {
      const secId = item.getAttribute('data-secid');
      const chk = item.querySelector('.habits-section-checkbox');
      if (chk) {
        chk.addEventListener('change', function(e) {
          e.stopPropagation();
          window.setHabitSectionChecked(secId, chk.checked);
        });
      }
      item.addEventListener('click', function(e) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
        window.setHabitSectionChecked(secId, !(chk && chk.checked));
      });
    });

    modal.querySelectorAll('.habits-section-date-pill').forEach(function(pill) {
      pill.onclick = function(e) {
        e.stopPropagation();
        const secId = pill.getAttribute('data-jump');
        window.scrollToSectionFromModal(secId);
      };
    });
  };

  window.setHabitSectionChecked = function(secId, checked) {
    if (!secId) return;
    const isChecked = Boolean(checked);      const sidebarCb = document.getElementById('chk-' + secId);
    if (sidebarCb && sidebarCb.checked !== isChecked) {
      sidebarCb.checked = isChecked;
      sidebarCb.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Direct in-place DOM update so the modal stays rock solid without reloading or flickering
    const modal = document.getElementById('study-habits-modal');
    if (modal) {
      const item = modal.querySelector('.habits-section-item[data-secid="' + secId + '"]');
      if (item) {
        item.classList.toggle('is-completed', isChecked);
        const inp = item.querySelector('.habits-section-checkbox');
        if (inp) inp.checked = isChecked;
      }
      const sidebarNav = document.getElementById('sidebar-nav');
      const checkboxes = sidebarNav ? Array.from(sidebarNav.querySelectorAll('.toc-item[data-target^="sec-"] input[type="checkbox"]')) : [];
      const totalSections = checkboxes.length || 1;
      const checkedCount = checkboxes.filter(c => c.checked).length;
      const completionPct = Math.round((checkedCount / totalSections) * 100);

      const countBadge = document.getElementById('habits-sections-count-badge');
      if (countBadge) countBadge.textContent = checkedCount + ' of ' + totalSections + ' Completed';

      const progressPctEl = document.getElementById('habit-modal-progress-pct');
      if (progressPctEl) {
        progressPctEl.textContent = completionPct + '%';
        const sub = progressPctEl.parentElement ? progressPctEl.parentElement.querySelector('.habit-kpi-sub') : null;
        if (sub) sub.textContent = checkedCount + '/' + totalSections + ' Done';
      }
    }
  };

  window.toggleHabitSection = function(secId, e) {
    if (e) { e.preventDefault?.(); e.stopPropagation?.(); }
    const sidebarCb = secId ? document.getElementById('chk-' + secId) : null;
    window.setHabitSectionChecked(secId, !(sidebarCb && sidebarCb.checked));
  };

  window.scrollToSectionFromModal = function(secId) {
    const modal = document.getElementById('study-habits-modal');
    if (modal) modal.remove();
    if (!secId) return;
    const el = document.getElementById(secId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.style.transition = 'box-shadow 0.4s';
      el.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.4)';
      setTimeout(function() { el.style.boxShadow = ''; }, 2000);
    }
  };

  window.autoScrollToNextSection = function() {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav) return;
    const checkboxes = sidebarNav.querySelectorAll('input[type="checkbox"]');
    for (let i = 0; i < checkboxes.length; i++) {
      const cb = checkboxes[i];
      if (!cb.checked) {
        const parentItem = cb.closest('.toc-item');
        const targetId = parentItem ? parentItem.getAttribute('data-target') : null;
        if (targetId) {
          const el = document.getElementById(targetId);
          if (el) {
            setTimeout(function() {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 600);
          }
        }
        break;
      }
    }
  };
`;


const generateInteractiveWidgetsScript = (): string => `
  function initInteractiveWidgets() {
    // Interactive widgets initialization
  }
`;

const generateGamificationScript = (): string => `
  window.LessonApp = window.LessonApp || {
    state: { bookmarks: new Set(), xp: 0 },
    toggleBookmark: function(id, title) {
      if (this.state.bookmarks.has(id)) {
        this.state.bookmarks.delete(id);
      } else {
        this.state.bookmarks.add(id);
      }
    }
  };
`;

const generateDOMReadyScript = (): string => `
  document.addEventListener('DOMContentLoaded', () => {
    updateBatteryHeader();
    setInterval(updateBatteryHeader, 60000);

    const sidebarProgressBar = document.getElementById('sidebar-progress-bar');
    const sidebarProgressPercent = document.getElementById('sidebar-progress-percent');
    const sidebarNav = document.getElementById('sidebar-nav');

    if (sidebarProgressBar && sidebarNav) {
      const checkboxes = sidebarNav.querySelectorAll('input[type="checkbox"]');
      // Some generated viewers contain nested controls and modal overlays. Use
      // delegated change handling so every syllabus checkbox remains clickable
      // after dynamic UI updates.
      sidebarNav.querySelectorAll('.toc-item').forEach((item) => {
        const cb = item.querySelector('input[type="checkbox"]');
        if (!cb) return;
        cb.addEventListener('click', (event) => event.stopPropagation());
      });
      const total = checkboxes.length > 0 ? checkboxes.length : 1;

      const updateProgress = () => {
        const checkedCount = sidebarNav.querySelectorAll('input:checked').length;
        const percentage = (checkedCount / total) * 100;
        sidebarProgressBar.style.width = percentage + '%';
        sidebarProgressPercent.textContent = Math.round(percentage) + '%';
      };

      sidebarNav.addEventListener('change', (e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
          updateProgress();
          if (window.saveProgressData) window.saveProgressData(true);
        }
      });

      // Keep the syllabus checkbox usable even when a surrounding viewer or
      // delegated navigation handler calls preventDefault on click events.
      sidebarNav.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
        e.stopPropagation();
        window.setTimeout(updateProgress, 0);
      });

      updateProgress();
    }

    // Auto scroll to first uncompleted section on load if not bookmarked
    setTimeout(() => {
      if (window.autoScrollToNextSection) window.autoScrollToNextSection();
    }, 800);
  });
`;

const generateZoomScript = (): string => `
  // Ctrl + Mouse Wheel zooms ONLY the lesson content (main content column).
  // Header, sidebar and the annotation toolbar keep a constant size —
  // the browser's own page zoom is suppressed while Ctrl is held.
  (function () {
    var MIN = 50, MAX = 300, STEP = 10;
    var zoom = 100;

    function contentRoot() {
      // Micro Lesson templates wrap the lesson sections in .lesson-zoom-area so
      // floating study widgets (bookmarks / notes buttons and panels) stay fixed.
      return document.querySelector('.lesson-zoom-area') || document.querySelector('.main-content') || document.body;
    }

    function applyZoom() {
      var root = contentRoot();
      if (!root) return;
      var z = zoom / 100;
      root.style.setProperty('zoom', String(z));
      // Keep fixed study widgets (bookmarks / notes / mascot / toasts / panels)
      // at constant size while the lesson content zooms. If a widget still lives
      // inside the zoomed root (legacy templates), counter-scale it so its
      // effective zoom stays 1; if it is outside, zoom:1 is a safe no-op.
      var fixedWidgets = document.querySelectorAll('.bookmarks-toolbar-btn, .notes-toolbar-btn, .notes-panel, .bookmarks-panel, .mascot-container, .toast-container, .announcement-banner, .tooltip-container, .header-action-btn, .fixed-widget-control, .panel-overlay, #zoom-toast-indicator');
      for (var i = 0; i < fixedWidgets.length; i++) {
        var w = fixedWidgets[i];
        w.style.setProperty('zoom', root.contains(w) ? String(1 / z) : '1');
      }
      // Re-layout the fixed annotation toolbar after content size changes
      window.dispatchEvent(new Event('resize'));
    }

    window.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      var step = e.deltaY < 0 ? STEP : -STEP;
      var next = Math.max(MIN, Math.min(MAX, zoom + step));
      if (next === zoom) return;
      zoom = next;
      applyZoom();
    }, { passive: false });

    // Ctrl+0 resets content zoom to 100%
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.key === '0')) {
        e.preventDefault();
        zoom = 100;
        applyZoom();
      }
    });

    // Restore saved zoom across sessions
    try {
      var saved = parseInt(localStorage.getItem('__lesson_content_zoom') || '100', 10);
      if (!isNaN(saved) && saved >= MIN && saved <= MAX && saved !== 100) {
        zoom = saved;
        applyZoom();
      }
    } catch (err) { /* storage unavailable */ }

    var saveTimer = null;
    var origApply = applyZoom;
    applyZoom = function () {
      origApply();
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        try { localStorage.setItem('__lesson_content_zoom', String(zoom)); } catch (err) { /* ignore */ }
      }, 400);
    };
  })();
`;

const generateCustomReportsScript = () => `
  window.submittedEssays = window.submittedEssays || {};
  window.recordedAudios = window.recordedAudios || {};

  window.downloadSessionReport = async function() {
    window.__sessionReportDownloaded = true;
    if (typeof JSZip === 'undefined') {
       alert("JSZip library is loading. Please try again in a moment.");
       return;
    }
    
    if (!window.__LESSON_OPENED_TIME) {
       window.__LESSON_OPENED_TIME = new Date().toISOString();
    }
    
    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];
    const pageTitle = window.__LESSON_PAGE_TITLE || document.title || "";
    
    const essaysMap = {};
    const textareas = document.querySelectorAll('.essay-textarea');
    textareas.forEach((ta) => {
       const essayId = ta.id || 'essay_unknown';
       const text = ta.value || ta.innerText || ta.textContent || "";
       if (text.trim()) {
           essaysMap[essayId] = text;
           window.submittedEssays[essayId] = text;
       }
    });

    if (window.submittedEssays) {
       Object.keys(window.submittedEssays).forEach(id => {
          if (window.submittedEssays[id]) essaysMap[id] = window.submittedEssays[id];
       });
    }

    const checks = document.querySelectorAll('input[type="checkbox"]:checked');
    const elapsedSeconds = Math.floor((Date.now() - new Date(window.__LESSON_OPENED_TIME).getTime()) / 1000);
    
    const voiceRecordingsMap = {};
    if (window.recordedAudios) {
        Object.keys(window.recordedAudios).forEach((actId) => {
            const dataUrl = window.recordedAudios[actId];
            if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
                if (match) {
                    const base64Data = match[2];
                    const filename = "audio/voice_" + actId + ".mp3";
                    zip.file(filename, base64Data, {base64: true});
                    voiceRecordingsMap[actId] = filename;
                }
            }
        });
    }
    
    const reportData = {
        learnerName: typeof LEARNER_NAME !== 'undefined' ? LEARNER_NAME : 'Learner',
        lessonTitle: pageTitle,
        timeOpened: window.__LESSON_OPENED_TIME,
        studyLog: {
            startedAt: window.__LESSON_OPENED_TIME,
            endedAt: new Date().toISOString(),
            durationSeconds: elapsedSeconds,
            durationReadable: Math.floor(elapsedSeconds / 60) + "m " + (elapsedSeconds % 60) + "s",
            completedCheckboxes: checks.length
        },
        essayAnswers: essaysMap,
        recordedVoices: voiceRecordingsMap,
        deviceInfo: window.navigator.userAgent,
        generatedAt: new Date().toISOString()
    };
    
    zip.file("report.json", JSON.stringify(reportData, null, 2));

    try {
        const content = await zip.generateAsync({type:"blob"});
        const userName = typeof LEARNER_NAME !== 'undefined' ? LEARNER_NAME : 'Learner';
        const fileName = 'LearnerReport_' + userName.replace(/\s/g,'_') + '_' + dateStr + '.zip';
        if (typeof saveAs !== 'undefined') {
            saveAs(content, fileName);
        } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = fileName;
            a.click();
        }
    } catch(e) {
        console.error("Failed to generate report zip", e);
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'report_backup.json';
        a.click();
    }
  };
`;

const generateSaveLoadProgressScript = () => `
  window.APP_SAVE_KEY = 'lesson_progress_' + encodeURIComponent(window.__LESSON_PAGE_TITLE || document.title || 'lesson');
  window.__MEM_SAVED_PROGRESS = null;

  window.saveProgressData = function(autoSave) {
    try {
      const checks = Array.from(document.querySelectorAll('#sidebar-nav input[type="checkbox"]')).map(c => ({ id: c.id, checked: c.checked }));
      let bookmarksList = [];
      try {
        if (window.LessonApp && window.LessonApp.state && window.LessonApp.state.bookmarks) {
          const bms = window.LessonApp.state.bookmarks;
          if (bms instanceof Set || typeof bms.forEach === 'function') {
            bookmarksList = Array.from(bms);
          } else if (Array.isArray(bms)) {
            bookmarksList = bms;
          }
        }
      } catch(bmErr) {
        bookmarksList = [];
      }

      const state = {
        timestamp: new Date().toISOString(),
        checkboxes: checks,
        bookmarks: bookmarksList,
        studySeconds: window.__SESSION_STUDY_SECONDS || 0
      };

      const stateJson = JSON.stringify(state);
      window.__MEM_SAVED_PROGRESS = stateJson;

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(window.APP_SAVE_KEY, stateJson);
        }
      } catch(storageErr) {
        // Gracefully ignore tracking prevention or sandboxed iframe storage blocks
      }

      if (!autoSave) {
        alert("Progress saved to browser cache!");
      }
    } catch(e) {
      console.warn("Notice saving progress:", e);
    }
  };

  window.loadProgressData = function(dataStr) {
    try {
      const parsed = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
      if (parsed && Array.isArray(parsed.checkboxes)) {
        parsed.checkboxes.forEach(c => {
          if (!c || !c.id) return;
          const el = document.getElementById(c.id);
          if (el) el.checked = Boolean(c.checked);
        });
        const sidebarNav = document.getElementById('sidebar-nav');
        if (sidebarNav) {
          sidebarNav.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      if (parsed && Array.isArray(parsed.bookmarks) && window.LessonApp) {
        if (!window.LessonApp.state) {
          window.LessonApp.state = { bookmarks: new Set(), xp: 0 };
        }
        if (!window.LessonApp.state.bookmarks) {
          window.LessonApp.state.bookmarks = new Set();
        }
        parsed.bookmarks.forEach(b => {
          if (window.LessonApp.state.bookmarks.add) {
            window.LessonApp.state.bookmarks.add(b);
          }
        });
      }
    } catch(e) {
      console.warn("Notice restoring progress:", e);
    }
  };

  // =========================================================================
  // MINIMAL CLOSE-PAGE REMINDER (native beforeunload prompt)
  // =========================================================================
  window.__sessionReportDownloaded = false;
  window.addEventListener('beforeunload', function(e) {
    if (window.__sessionReportDownloaded) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  // Auto-save progress every 15s
  setInterval(() => {
    window.saveProgressData(true);
  }, 15000);

  // Elevated Restore Progress Prompt
  function initRestoreProgressPrompt() {
    let savedData = null;
    try {
      if (typeof localStorage !== 'undefined') {
        savedData = localStorage.getItem(window.APP_SAVE_KEY);
      }
    } catch(e) {}
    if (!savedData && window.__MEM_SAVED_PROGRESS) {
      savedData = window.__MEM_SAVED_PROGRESS;
    }

    if (savedData && !document.getElementById('restore-progress-container')) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed && parsed.timestamp) {
          const date = new Date(parsed.timestamp).toLocaleString();
          const loadBox = document.createElement('div');
          loadBox.id = 'restore-progress-container';
          loadBox.style.cssText = "position: fixed; bottom: 100px; right: 24px; background: white; border-radius: 14px; box-shadow: 0 20px 30px -10px rgba(0,0,0,0.2), 0 10px 15px -5px rgba(0,0,0,0.1); padding: 20px; z-index: 2147483647; font-family: 'Inter', sans-serif; border: 1px solid #cbd5e1; max-width: 360px;";

          loadBox.innerHTML = '<button id="btn-restore-close" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer;">&times;</button>' +
             '<div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px;">' +
                 '<div style="background: #e0f2fe; color: #0284c7; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">' +
                     '<i class="fas fa-history" style="font-size: 16px;"></i>' +
                 '</div>' +
                 '<div>' +
                     '<h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #0f172a;">Restore Progress</h3>' +
                     '<p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">We found saved progress from <strong>' + date + '</strong>.</p>' +
                 '</div>' +
             '</div>' +
             '<div style="display: flex; gap: 10px; margin-left: 48px; margin-top: 15px;">' +
                 '<button id="btn-restore-yes" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px;">Yes, Restore</button>' +
                 '<button id="btn-restore-no" style="background: #f1f5f9; color: #475569; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px;">Start Fresh</button>' +
             '</div>';
          document.body.appendChild(loadBox);

          document.getElementById('btn-restore-close').onclick = () => loadBox.remove();
          document.getElementById('btn-restore-yes').onclick = () => {
            window.loadProgressData(savedData);
            loadBox.remove();
            setTimeout(() => {
              if (window.autoScrollToNextSection) window.autoScrollToNextSection();
            }, 300);
          };
          document.getElementById('btn-restore-no').onclick = () => {
            try {
              if (typeof localStorage !== 'undefined') localStorage.removeItem(window.APP_SAVE_KEY);
            } catch(e) {}
            window.__MEM_SAVED_PROGRESS = null;
            loadBox.remove();
          };
        }
      } catch(e) {}
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initRestoreProgressPrompt, 150);
  } else {
    document.addEventListener("DOMContentLoaded", initRestoreProgressPrompt);
    window.addEventListener("load", initRestoreProgressPrompt);
  }
`;


export const generateThemedHtmlPage = (
  pageTitle: string,
  learner: LearnerProfile,
  headerTitle: string,
  headerDescription: string,
  mainContentHtml: string,
  sidebarLinks: SidebarLink[],
  deadlineDays: number = DEFAULT_DEADLINE_DAYS,
  generatedDateIso?: string,
  lessonSettings?: LessonSettings,
  mode: "presenter" | "learner" = "presenter",
  extraCss: string = "",
  extraJs: string = "",
  sidebarTopContent: string = "",
  relativePaths: boolean = false,
  hideInstructionsAndTOC: boolean = false
): string => {
  const shouldInjectAccessibility = lessonSettings?.enableAccessibility !== false;
  const accessibility = shouldInjectAccessibility ? getAccessibilityWidget() : { html: '', css: '', js: '' };
  // includePanels + hostEngine=false: every generated lesson (Explainer, Exam Prep,
  // Bilingual, Assessment, Homework...) ships the FULL Micro Lesson V1 Bookmarks &
  // Notes engine (installs window.LessonApp), so the Annotation Toolbar always opens
  // the complete panels — never a simpler stub. The minimal LessonApp fallback in
  // generateGamificationScript stays as a defensive base if the bundle is absent.
  const annotations = getAnnotationFeatures(learner, mode, true, false);
  const storeState = useAppStore.getState();
  const splashScreen = storeState.tutorInfo.enableSplashScreens !== false ? getSplashScreenWidget({
      text: storeState.tutorInfo.splashScreenText,
      subtext: storeState.tutorInfo.splashScreenSubtext,
      logo: storeState.logoUrl
  }) : { html: '', css: '', js: '' };
  const collabWidgetContent = getCollaborationWidget(mode);

  const allSidebarLinks: SidebarLink[] = [...sidebarLinks];

  const displayHeaderTitle = lessonSettings?.lessonName || headerTitle;
  const courseName = learner.coursePlan?.courseName || "General English";
  const frequency = learner.coursePlan?.classFrequency || 3;

  const themeColor = lessonSettings?.themeColor || getHeaderThemeColor(pageTitle);
  const themeConfig = getThemeConfig(themeColor);

  const genDateObj = generatedDateIso ? new Date(generatedDateIso) : new Date();
  let deadlineDateObj = new Date(genDateObj.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
  if (lessonSettings?.nextClassDate) {
    deadlineDateObj = new Date(lessonSettings.nextClassDate);
  }

  const formattedGenDate = genDateObj.toLocaleDateString();
  const formattedDeadline = deadlineDateObj.toLocaleDateString();
  const targetDate = deadlineDateObj.getTime();

  // Browser/tab title for a saved lesson — no app name or version prefix.
  const browserTitle = `${learner.name}'s ${pageTitle} - Due ${formattedDeadline}`;
  const processedMainContent = mainContentHtml;
  const aggregateSkillTags = getAggregateSkillTags(processedMainContent);

  const extraContentParts: string[] = [];

  if (lessonSettings?.materialLinks?.trim()) {
    const links = lessonSettings.materialLinks.split("\n").filter((l) => l.trim());
    if (links.length > 0) {
      extraContentParts.push(generateMaterialsSection(links));
      allSidebarLinks.push({ id: "section-materials", title: "Resources", icon: "fa-link" });
    }
  }

  if (lessonSettings?.attachedFiles?.length) {
    extraContentParts.push(
      generateFilesSection(lessonSettings.attachedFiles, relativePaths)
    );
    allSidebarLinks.push({ id: "section-files", title: "Files", icon: "fa-paperclip" });
  }

  if (lessonSettings?.teacherNotes?.trim()) {
    extraContentParts.push(generateTeacherNotesSection(lessonSettings.teacherNotes));
    allSidebarLinks.push({ id: "section-notes", title: "Tutor Note", icon: "fa-comment" });
  }

  if (lessonSettings?.homeworkChecklist?.trim()) {
    const items = lessonSettings.homeworkChecklist.split("\n").filter((i) => i.trim());
    if (items.length > 0) {
      extraContentParts.push(generateChecklistSection(items));
      allSidebarLinks.push({ id: "section-checklist", title: "Checklist", icon: "fa-tasks" });
    }
  }

  if (pageTitle.includes("Weekly Challenge")) {
    extraContentParts.push(generateGamificationSection(themeColor));
  }

  const extraContentHtml = extraContentParts.join("");
  const sidebarHtml = generateSidebarHtml(allSidebarLinks, sidebarTopContent, hideInstructionsAndTOC);

  const premiumSupportCss = `
    .premium-support-card { position: relative; isolation: isolate; border-radius: 22px; }
    .premium-support-card::before { content: ''; position: absolute; inset: 0 0 auto; height: 4px; z-index: 2; }
    .premium-materials-card { border: 1px solid #bae6fd; box-shadow: 0 18px 45px rgba(14,165,233,.14); background: linear-gradient(135deg,#e0f2fe 0%,#ffffff 55%,#f8fafc 100%); }
    .premium-materials-card::before { background: linear-gradient(90deg,#38bdf8,#2563eb); }
    .premium-notes-card { border: 1px solid #fcd34d; box-shadow: 0 18px 45px rgba(245,158,11,.15); background: linear-gradient(135deg,#fef3c7 0%,#ffffff 55%,#fff7ed 100%); }
    .premium-notes-card::before { background: linear-gradient(90deg,#fbbf24,#f59e0b); }
    .premium-checklist-card { border: 1px solid #a7f3d0; box-shadow: 0 18px 45px rgba(16,185,129,.15); background: linear-gradient(135deg,#d1fae5 0%,#ffffff 55%,#f0fdf4 100%); }
    .premium-checklist-card::before { background: linear-gradient(90deg,#34d399,#059669); }

    .premium-sec-head { display: flex; align-items: center; gap: 14px; padding: 1.35rem 1.6rem; border-bottom: 1px solid rgba(148,163,184,.28); background: rgba(255,255,255,.6); }
    .premium-sec-icon { width: 46px; height: 46px; border-radius: 15px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.05rem; flex-shrink: 0; box-shadow: 0 10px 22px rgba(15,23,42,.22); }
    .materials-head .premium-sec-icon { background: linear-gradient(135deg,#38bdf8,#2563eb); }
    .notes-head .premium-sec-icon { background: linear-gradient(135deg,#fbbf24,#d97706); }
    .checklist-head .premium-sec-icon { background: linear-gradient(135deg,#34d399,#059669); }
    .premium-sec-title { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .premium-sec-kicker { font-size: .68rem; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
    .materials-head .premium-sec-kicker { color: #0369a1; }
    .notes-head .premium-sec-kicker { color: #b45309; }
    .checklist-head .premium-sec-kicker { color: #047857; }
    .premium-sec-title h2 { margin: 0 !important; font-size: 1.22rem !important; font-weight: 800 !important; letter-spacing: -.01em; color: #0f172a; }
    .premium-sec-count, .checklist-progress-chip { margin-left: auto; padding: .32rem .75rem; border-radius: 999px; font-size: .74rem; font-weight: 800; white-space: nowrap; }
    .premium-sec-count { background: rgba(224,242,254,.9); color: #075985; border: 1px solid #bae6fd; }
    .checklist-progress-chip { background: rgba(236,253,245,.95); color: #047857; border: 1px solid #a7f3d0; }
    .premium-support-card .section-body { padding: 1.5rem 1.6rem 1.6rem; }

    .premium-links-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .premium-link-card { display: flex; align-items: center; gap: 12px; padding: .85rem 1rem; border-radius: 14px; background: rgba(255,255,255,.88); border: 1px solid #bae6fd; text-decoration: none; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
    .premium-link-card:hover { transform: translateY(-2px); border-color: #7dd3fc; box-shadow: 0 12px 26px rgba(14,165,233,.18); }
    .plc-index { width: 26px; height: 26px; border-radius: 8px; background: #e0f2fe; color: #0369a1; font-size: .72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .plc-icon { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg,#38bdf8,#2563eb); color: #fff; font-size: .78rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .plc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .plc-title { font-weight: 700; font-size: .92rem; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .plc-domain { font-size: .72rem; color: #64748b; display: flex; align-items: center; gap: 5px; }
    .plc-arrow { color: #94a3b8; font-size: .8rem; transition: transform .2s ease, color .2s ease; }
    .premium-link-card:hover .plc-arrow { transform: translateX(4px); color: #2563eb; }

    .premium-notes-card .section-body { position: relative; }
    .premium-note-quote { position: absolute; top: 1.2rem; right: 1.5rem; font-size: 2.4rem; color: rgba(245,158,11,.22); pointer-events: none; }
    .premium-note-text { font-size: 1rem; line-height: 1.85; color: #78350f; font-weight: 500; }
    .premium-note-text strong { font-weight: 800; color: #92400e; }
    .premium-note-text em { font-style: italic; }
    .premium-note-text br { content: ''; display: block; margin-bottom: .5rem; }

    .checklist-progress-track { height: 8px; border-radius: 999px; background: rgba(16,185,129,.16); overflow: hidden; margin-bottom: 1rem; }
    .checklist-progress-fill { height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg,#34d399,#059669); transition: width .35s ease; }
    .premium-checklist-list { display: flex; flex-direction: column; gap: 10px; }
    .premium-check-item { position: relative; display: flex; align-items: center; gap: 12px; padding: .85rem 1rem; border-radius: 14px; background: rgba(255,255,255,.88); border: 1px solid #a7f3d0; cursor: pointer; transition: transform .2s ease, box-shadow .2s ease; }
    .premium-check-item:hover { transform: translateX(3px); box-shadow: 0 10px 22px rgba(16,185,129,.15); }
    .premium-check-input { position: absolute; opacity: 0; pointer-events: none; }
    .premium-check-box { width: 24px; height: 24px; border-radius: 8px; border: 2px solid #6ee7b7; background: #fff; color: #fff; font-size: .68rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .2s ease, border-color .2s ease; }
    .premium-check-input:checked + .premium-check-box { background: linear-gradient(135deg,#34d399,#059669); border-color: #059669; }
    .premium-check-num { width: 24px; height: 24px; border-radius: 7px; background: #ecfdf5; color: #047857; font-size: .7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .premium-check-text { flex: 1; min-width: 0; font-size: .95rem; font-weight: 600; color: #334155; }
    .premium-check-item.done .premium-check-text { text-decoration: line-through; color: #94a3b8; }
    .premium-check-item.done { background: rgba(236,253,245,.65); }

    @media (max-width: 640px) {
      .premium-sec-head, .premium-support-card .section-body { padding-left: 1rem; padding-right: 1rem; }
      .premium-sec-count, .checklist-progress-chip { display: none; }
    }
  `;

  const allCss = [
    generateBaseStyles(themeColor),
    premiumSupportCss,
    generateLayoutStyles(),
    generateBatteryStyles(),
    generateProgressStyles(),
    generateSectionStyles(),
    generateActivityStyles(),
    generateInteractiveWidgetStyles(),
    generateMaterialStyles(),
    generateAnswerStyles(),
    generateMiscStyles(),
    generateAnimationStyles(),
    generateTranscriberStyles(),
    generateResponsiveStyles(),
    generatePrintStyles(),
    extraCss,
    accessibility.css,
    annotations.css,
    splashScreen.css,
    collabWidgetContent.css,
  ].join("\n");

  const allJs = [
    generateBaseScript(learner, targetDate),
    generateInteractiveWidgetsScript(),
    generateGamificationScript(),
    generateDOMReadyScript(),
    generateZoomScript(),
    generateCustomReportsScript(),
    generateSaveLoadProgressScript(),
    `window.__LESSON_PAGE_TITLE = ${JSON.stringify(pageTitle)};`,
    `window.__LESSON_MODE = ${JSON.stringify(mode)};`,
    `window.__LESSON_SECTIONS_DATA = ${JSON.stringify(allSidebarLinks)};`,
    `window.__LEARNER_PROFILE = ${JSON.stringify({ name: learner.name, targetDate, formattedDeadline })};`,
    extraJs,
    `(function() { ${accessibility.js} })();`,
    `(function() { ${annotations.js} })();`,
    splashScreen.js,
  ].join("\n;\n");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(browserTitle)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
  <style>${allCss}</style>
</head>
<body>
  <div class="page-container">
    <header class="page-header ${lessonSettings?.headerImage ? 'has-bg-image' : ''}" style="${lessonSettings?.headerImage ? `background-image: url('${lessonSettings.headerImage}');` : ''}">
      ${!hideInstructionsAndTOC ? generateFloatingEmojis(themeConfig.emojis) : ''}
      <div class="header-content">
        <div class="header-text">
          <h1>${escapeHtml(displayHeaderTitle)}</h1>
          <div class="header-meta" style="margin-top: 15px;">
            <span class="meta-badge"><i class="fas fa-book"></i> ${escapeHtml(courseName)}</span>
            <span class="meta-badge"><i class="fas fa-calendar-alt"></i> ${frequency} Sessions/Week</span>
            <span class="meta-badge"><i class="fas fa-pen-nib"></i> Designed: ${formattedGenDate}</span>
            ${lessonSettings?.nextClassDate ? `<span class="meta-badge" style="background:rgba(255,255,255,0.25); border-color:white;"><i class="fas fa-graduation-cap"></i> Next Class: ${new Date(lessonSettings.nextClassDate).toLocaleDateString()}</span>` : ""}
            ${!hideInstructionsAndTOC ? aggregateSkillTags : ''}
            <span class="meta-badge"><i class="fas fa-calendar-check"></i> Deadline: ${formattedDeadline}</span>
            <!-- The one action a tutor needs at the end of a session: visibly bigger than the
                 badges around it, and it leans in and shines as the pointer approaches. -->
            <button class="meta-badge save-report-cta" onclick="if(window.downloadSessionReport) window.downloadSessionReport();" aria-label="Save Report — download the session report"><i class="fas fa-file-archive" style="margin-right: 6px;"></i> Save Report</button>
          </div>
        </div>
        
        <!-- Ultra-Enhanced Cyber Glass Deadline Battery -->
        <div class="battery-container" id="header-deadline-battery" onclick="if(window.openStudyHabitsModal) window.openStudyHabitsModal();" title="Click to see student progress — studying plants a tree in your forest">
          <div class="battery-header">
            <span class="battery-bolt-icon">⚡</span>
            <span class="battery-label-text battery-date-label">${formattedDeadline}</span>
          </div>
          <div class="battery-body-wrapper">
            <div class="battery-body">
              <div class="battery-fill" id="header-battery-fill">
                <div class="battery-fill-glow"></div>
              </div>
              <div class="battery-grid-pips">
                <span></span><span></span><span></span><span></span>
              </div>
            </div>
            <div class="battery-terminal-cap"></div>
          </div>
          <div class="battery-footer-row">
            <span class="battery-text" id="header-battery-text">--d --h</span>
            <span class="battery-open-hint"><i class="fas fa-chart-pie"></i> Progress</span>
          </div>
        </div>
      </div>
    </header>
    
    <div class="page-wrapper">
      <main class="main-content">
        ${processedMainContent}
        ${extraContentHtml}
      </main>
      <aside class="sidebar">
        ${sidebarHtml}
      </aside>
    </div>
  </div>
  
  ${accessibility.html}
  ${annotations.html}
  ${collabWidgetContent.html}
  ${splashScreen.html}
  
  <script>${allJs}</script>
  <script>${collabWidgetContent.js}</script>
</body>
</html>
  `.trim();
};

export const generateStandardLessonHtml = (
  content: StructuredOutput,
  learningPackage: LearningPackage | null,
  learner: LearnerProfile,
  title: string,
  lessonSettings?: LessonSettings,
  mode: "presenter" | "learner" = "presenter",
  relativePaths: boolean = false
): string => {
  const sidebarLinks: SidebarLink[] = content.sections.map((s, i) => ({
    id: `sec-${i}`,
    title: s.title ? s.title.replace(/<[^>]*>?/gm, "") : `Section ${i + 1}`,
    icon: "fa-bookmark",
  }));

  const sectionDates = calculateSectionDates(
    content.sections.length,
    lessonSettings?.nextClassDate
  );

  const mainContentHtml = content.sections
    .map((section, idx) => {
      const sectionId = `sec-${idx}`;
      const goalDate = sectionDates[idx];
      return generateSectionHtml(section, sectionId, goalDate);
    })
    .join("");

  return generateThemedHtmlPage(
    title,
    learner,
    title,
    learner.name,
    mainContentHtml,
    sidebarLinks,
    DEFAULT_DEADLINE_DAYS,
    learningPackage?.generatedAt,
    lessonSettings,
    mode,
    "",
    "",
    "",
    relativePaths
  );
};

export const handleSaveAsHtml = (
  content: StructuredOutput,
  learningPackage: LearningPackage | null,
  learner: LearnerProfile,
  title: string,
  lessonSettings?: LessonSettings,
  mode: "presenter" | "learner" = "presenter"
): void => {
  const html = injectMediaHtml(generateStandardLessonHtml(
    content,
    learningPackage,
    learner,
    title,
    lessonSettings,
    mode,
    false
  ), lessonSettings);

  // Shared lesson naming (this is the fallback for every "other" content type, so
  // it must still say WHAT the file is and WHEN it was made).
  const fileName = buildLessonFileName({
    learnerName: learner.name,
    lessonLabel: title || 'Lesson',
    audience: mode === 'learner' ? 'Learner' : 'Presenter',
    ...getLessonFilePrefill(learner),
  });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch(e) {}
  }, 100);
};

export const handleSaveHomeworkAsHtml = (
  learningPackage: LearningPackage,
  learner: LearnerProfile,
  lessonSettings?: LessonSettings,
  mode: "presenter" | "learner" = "presenter"
): void => {
  if (!learningPackage.homework) {
    alert("No homework content available to save.");
    return;
  }

  const content = learningPackage.homework;
  const sections: Section[] = [];

  if (content.reading) {
    sections.push({
      title: content.reading.title,
      color: "#2563eb",
      studyTime: "20 mins",
      activities: content.reading.tasks.map((t) => ({
        type: "paragraph" as const,
        title: t.title,
        content: `
          ${t.text}
          <br><strong>Questions:</strong>
          ${t.questions
            .map(
              (q) => `
            <div class="qa-item" style="margin-top:10px;">
              <p><strong>Q:</strong> ${escapeHtml(q.question)}</p>
              ${renderRevealableAnswerHtml(escapeHtml(q.answer))}
            </div>
          `
            )
            .join("")}
        `,
      })),
    });
  }

  handleSaveAsHtml({ sections }, learningPackage, learner, "Homework", lessonSettings, mode);
};

export const handleSaveChallengeAsHtml = (
  content: WeeklyChallengeOutput,
  learner: LearnerProfile,
  lessonSettings?: LessonSettings,
  mode: "presenter" | "learner" = "presenter"
): string => {
  const sections: Section[] = (content.days || []).map((d: any, idx: number) => ({
    title: d.title || `Day ${idx + 1}`,
    color: '#0d9488',
    studyTime: '15 mins',
    activities: [
      {
        type: 'paragraph' as const,
        title: d.taskTitle || 'Challenge Activity',
        content: d.taskDescription || '',
      }
    ]
  }));

  const html = generateStandardLessonHtml(
    { sections },
    null,
    learner,
    "Weekly_Challenge",
    lessonSettings,
    mode,
    false
  );

  return html;
};
