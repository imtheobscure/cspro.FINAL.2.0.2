import type { LessonMediaItem, LessonSettings } from '../types';

/**
 * Shared media injection for every lesson type (Micro Lesson V1/V2, Explainer,
 * Exam Prep, Conversational, Bilingual, Homework, etc.).
 *
 * The Lesson Settings → “Add Media” studio feeds a SINGLE unified media list
 * (images, GIFs, YouTube/Vimeo/MP4 videos, SoundCloud/Spotify/podcast audio and
 * any embed) into `settings.lessonMedia`. Legacy `settings.lessonImages` and
 * `settings.lessonVideos` arrays (produced by older AI JSON) are merged in and
 * de-duplicated by URL so nothing is double-rendered.
 *
 * Each item can carry a `targetSection` (heading number or section title) so it
 * lands in the exact lesson section where the tutor/AI said it belongs. Items
 * without a target are spread evenly across the lesson.
 *
 * Layout is magazine-style: images, GIFs and small audio players FLOAT (body
 * paragraphs wrap tightly around them); videos/embeds render as full-width
 * reportage blocks by default. `align` = left | right | center | full gives the
 * tutor direct control.
 *
 * YouTube embeds are swapped for clickable thumbnails when the HTML is opened
 * directly from a hard drive (file://) and an image lightbox is always present.
 */

export const extractYoutubeId = (url: string): string => {
    const reg = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(reg);
    return match ? match[1] : '';
};

const escapeHtmlAttr = (value: string): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

const normText = (value: string): string =>
    String(value || '')
        .toLowerCase()
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/[\u2018\u2019']/g, "'")
        .replace(/[\u201c\u201d"]/g, '')
        .replace(/[&+]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s\d.\-–—:)\u25b6\u25c0#*]+/, '')
        .trim();

/** Best-effort provider detection — used by both the injector and the studio UI. */
export const detectMediaProvider = (input: { url?: string; type?: string; provider?: string }): string => {
    if (input?.provider) return input.provider;
    const url = String(input?.url || '').toLowerCase();
    if (/(youtube\.com|youtu\.be)/.test(url)) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('dailymotion.com')) return 'dailymotion';
    if (url.includes('soundcloud.com')) return 'soundcloud';
    if (url.includes('open.spotify.com') || url.includes('spotify.com')) return 'spotify';
    if (/\.(mp3|m4a|ogg|wav|aac|opus|flac)(\?|#|$)/i.test(url)) return 'direct-audio';
    if (/\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url)) return 'direct-video';
    if (/(tenor\.com|media\.giphy\.com|giphy\.com)/.test(url)) return 'gif';
    if (/(unsplash|pexels|pixabay|wikimedia|openverse)/.test(url)) return 'image';
    if (url.includes('spotify')) return 'spotify';
    return 'other';
};

const isImageType = (item: any): boolean =>
    item?.type === 'image' || item?.type === 'gif' || (!item?.type && detectMediaProvider(item) !== 'direct-video' && detectMediaProvider(item) !== 'other' && !/youtube|vimeo|soundcloud|spotify/i.test(item?.url || '') && !/\.(mp3|mp4|m4a|ogg|wav|webm|aac)(\?|#|$)/i.test(item?.url || ''));

/** Merge unified media list + legacy arrays into one ordered list (de-dupe by URL). */
export const collectLessonMediaItems = (settings?: LessonSettings): LessonMediaItem[] => {
    const out: LessonMediaItem[] = [];
    const seen = new Set<string>();
    // Entries from the unified lessonMedia list must survive even with an empty URL
    // (they are "draft" cards the tutor is still filling in from the Add Media studio).
    const push = (raw: any, keepDraft = false) => {
        const url = String(raw?.url || '').trim();
        const id = String(raw?.id || '').trim();
        if (!url && !(keepDraft && id)) return;
        const key = url ? url.toLowerCase() : 'draft:' + id;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
            id: raw.id || 'media-' + Math.random().toString(36).slice(2, 10),
            type: raw.type || (raw.type === 'mp4' ? 'video' : raw.type),
            url,
            caption: raw.caption || raw.title || '',
            altText: raw.altText || raw.caption || '',
            sourceUrl: raw.sourceUrl || url,
            title: raw.title || raw.caption || '',
            targetSection: raw.targetSection ?? raw.sectionId ?? raw.section ?? undefined,
            align: raw.align || 'auto',
            width: raw.width || 'md',
        } as LessonMediaItem);
    };
    (settings?.lessonMedia || []).forEach((m) => push(m, true));
    (settings?.lessonImages || []).forEach((img: any) => push({
        id: img.id,
        url: img.url,
        caption: img.caption,
        altText: img.altText,
        sourceUrl: img.sourceUrl,
        type: img.type === 'gif' ? 'gif' : 'image',
    }));
    (settings?.lessonVideos || []).forEach((vid: any) => push({
        id: vid.id,
        url: vid.url,
        caption: vid.caption,
        altText: vid.altText,
        sourceUrl: vid.sourceUrl,
        type: vid.type === 'mp4' ? 'video' : vid.type === 'vimeo' ? 'vimeo' : 'youtube',
    }));
    // Normalize each type via URL detection for ambiguous items
    return out.map((it) => {
        let type = it.type;
        if (!type) {
            const url = String(it.url || '').toLowerCase();
            if (/youtube\.com|youtu\.be/.test(url)) type = 'youtube';
            else if (url.includes('vimeo.com')) type = 'vimeo';
            else if (url.includes('soundcloud.com')) type = 'audio';
            else if (url.includes('spotify.com')) type = 'audio';
            else if (/\.(mp3|m4a|ogg|wav|aac|opus|flac)(\?|#|$)/i.test(url)) type = 'audio';
            else if (/\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url)) type = 'video';
            else if (/\.(gif)(\?|#|$)/i.test(url)) type = 'gif';
            else type = 'image';
        }
        return { ...it, type: type as LessonMediaItem['type'] };
    });
};

export const LESSON_MEDIA_CSS = `<style>
    /* Magazine-style layout: floated media makes body copy wrap tightly around it. */
    .lesson-media-block { font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5; }
    .lesson-media-block.mag-full { margin: 22px 0; }
    .lesson-media-block.mag-center { margin: 22px auto; text-align: center; }
    .lesson-media-block.mag-center .lm-card { display: inline-block; text-align: left; }
    /* A floated block always FILLS its column. Sizing it to the image's own width instead
       left a narrow picture floating in a half-empty column, which reads as a layout bug. */
    .lesson-media-block.mag-left { float: left; margin: 6px 22px 18px 0; width: min(46%, 380px); max-width: 100%; }
    .lesson-media-block.mag-right { float: right; margin: 6px 0 18px 22px; width: min(46%, 380px); max-width: 100%; }
    .lesson-media-block.mag-left.w-sm, .lesson-media-block.mag-right.w-sm { width: min(32%, 270px); }
    .lesson-media-block.mag-left.w-lg, .lesson-media-block.mag-right.w-lg { width: min(60%, 540px); }
    .lesson-media-block.mag-left.w-full, .lesson-media-block.mag-right.w-full { float: none; width: auto; max-width: 100%; margin: 22px 0; }
    /* Audio players are compact "pull-quote" style floats */
    .lesson-media-block.mag-left.mag-audio, .lesson-media-block.mag-right.mag-audio { max-width: min(62%, 460px); }
    h1, h2, h3, h4, h5 { clear: both; }
    .lesson-media-clear { clear: both; height: 0; }
    @media (max-width: 700px) {
      .lesson-media-block.mag-left, .lesson-media-block.mag-right,
      .lesson-media-block.mag-left.mag-audio, .lesson-media-block.mag-right.mag-audio { float: none; max-width: 100%; margin: 18px 0; }
    }
    /* Media chrome follows the lesson theme so it stays readable in light AND dark mode. */
    .lm-card { background: var(--theme-surface, #ffffff); border: 1px solid var(--theme-text-20, #e5e7eb); border-radius: 14px; overflow: hidden; box-shadow: var(--theme-shadow, 0 1px 3px rgba(0,0,0,0.08)); }
    .lm-card .lm-caption { margin: 0; padding: 10px 12px; font-size: 0.8rem; color: var(--theme-text-secondary, #6b7280); line-height: 1.4; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .lm-card .lm-caption span { font-style: italic; }
    .lm-card .lm-caption a { color: var(--theme-info, #3b82f6); text-decoration: none; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
    .lesson-media-img-wrap { position: relative; display: block; background: var(--theme-text-10, #f3f4f6); min-height: 150px; max-height: 260px; overflow: hidden; cursor: zoom-in; outline: none; }
    .lesson-media-img-wrap img { width: 100%; height: 100%; max-height: 260px; object-fit: cover; display: block; }
    /* A full-width block has the whole card to itself, so it is not cropped short. */
    .lesson-media-block.mag-full .lesson-media-img-wrap, .lesson-media-block.mag-full .lesson-media-img-wrap img { max-height: none; }
    .lesson-media-img-wrap::before { content: '🔍'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2rem; background: rgba(15,23,42,0.35); color: #fff; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
    .lesson-media-img-wrap:hover::before, .lesson-media-img-wrap:focus-visible::before { opacity: 1; }
    .lesson-media-img-wrap::after { content: '🖼️ Media unavailable'; display: none; position: absolute; inset: 0; align-items: center; justify-content: center; color: var(--theme-text-secondary, #9ca3af); font-size: 0.82rem; background: var(--theme-text-10, #f3f4f6); }
    .lesson-media-img-wrap.img-failed::after { display: flex; }
    .lesson-media-img-wrap.img-failed img { display: none; }
    .lesson-media-player { position: relative; }
    .lesson-media-player video { width: 100%; display: block; max-height: 420px; background: #000; }
    .lm-openbtn { display: inline-flex; align-items: center; gap: 6px; background: var(--theme-text, #0f172a); color: var(--theme-surface, #ffffff); text-decoration: none; font-size: 0.78rem; font-weight: 800; padding: 7px 12px; border-radius: 8px; white-space: nowrap; }
    .lm-openbtn.red { background: #ff0000; }
    #lesson-media-lightbox { position: fixed; inset: 0; z-index: 2147483647; display: none; align-items: center; justify-content: center; }
    #lesson-media-lightbox.open { display: flex; }
    #lesson-media-lightbox .lml-backdrop { position: absolute; inset: 0; background: rgba(2,6,23,0.92); }
    #lesson-media-lightbox .lml-figure { position: relative; max-width: min(92vw, 1100px); max-height: 88vh; margin: 0; display: flex; flex-direction: column; align-items: center; padding: 0 64px; box-sizing: border-box; }
    #lesson-media-lightbox .lml-img { max-width: 100%; max-height: 74vh; object-fit: contain; border-radius: 12px; box-shadow: 0 25px 60px rgba(0,0,0,0.6); background: var(--theme-surface, #ffffff); }
    #lesson-media-lightbox .lml-caption { color: #e2e8f0; margin: 12px 0 4px; font-size: 0.95rem; text-align: center; }
    #lesson-media-lightbox .lml-source { color: #93c5fd; font-size: 0.85rem; text-decoration: underline; }
    #lesson-media-lightbox .lml-btn { position: absolute; z-index: 2; background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); width: 44px; height: 44px; border-radius: 50%; font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; transition: background 0.2s; }
    #lesson-media-lightbox .lml-btn:hover { background: rgba(255,255,255,0.28); }
    #lesson-media-lightbox .lml-close { top: 18px; right: 18px; }
    #lesson-media-lightbox .lml-prev { left: 16px; top: 50%; transform: translateY(-50%); }
    #lesson-media-lightbox .lml-next { right: 16px; top: 50%; transform: translateY(-50%); }
    @media (max-width: 600px) {
      #lesson-media-lightbox .lml-btn { width: 36px; height: 36px; font-size: 1.1rem; }
      #lesson-media-lightbox .lml-close { top: 10px; right: 10px; }
      #lesson-media-lightbox .lml-prev { left: 6px; }
      #lesson-media-lightbox .lml-next { right: 6px; }
      #lesson-media-lightbox .lml-figure { padding: 0 48px; }
    }
  </style>`;

const MEDIA_SCRIPT = `<script>
    (function () {
      // ── Media lightbox: click any image/GIF to enlarge in place ──
      var overlay = document.getElementById('lesson-media-lightbox');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lesson-media-lightbox';
        overlay.innerHTML =
          '<div class="lml-backdrop"></div>' +
          '<button class="lml-btn lml-close" type="button" title="Close (Esc)" aria-label="Close">✕</button>' +
          '<button class="lml-btn lml-prev" type="button" title="Previous (←)" aria-label="Previous image">‹</button>' +
          '<button class="lml-btn lml-next" type="button" title="Next (→)" aria-label="Next image">›</button>' +
          '<figure class="lml-figure"><img class="lml-img" alt="" /><figcaption class="lml-caption"></figcaption><a class="lml-source" href="#" target="_blank" rel="noopener noreferrer">Open source ↗</a></figure>';
        document.body.appendChild(overlay);
      }
      var imgEl = overlay.querySelector('.lml-img');
      var capEl = overlay.querySelector('.lml-caption');
      var srcEl = overlay.querySelector('.lml-source');
      var items = [];
      var current = -1;

      function collectItems() {
        items = Array.prototype.slice.call(document.querySelectorAll('.lesson-media-img-wrap'));
      }

      function show(index) {
        collectItems();
        if (!items.length) return;
        if (index < 0) index = items.length - 1;
        if (index >= items.length) index = 0;
        current = index;
        var it = items[index];
        imgEl.onload = function () { imgEl.style.display = ''; };
        imgEl.onerror = function () { imgEl.style.display = 'none'; };
        imgEl.src = it.getAttribute('data-lml-url') || '';
        imgEl.alt = it.getAttribute('data-lml-alt') || '';
        capEl.textContent = it.getAttribute('data-lml-caption') || '';
        var src = it.getAttribute('data-lml-source') || it.getAttribute('data-lml-url') || '';
        if (src) { srcEl.href = src; srcEl.style.display = ''; } else { srcEl.style.display = 'none'; }
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      }

      function close() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }

      window.LessonMediaLightbox = {
        open: function (el) {
          collectItems();
          var idx = items.indexOf(el);
          show(idx >= 0 ? idx : 0);
        },
        close: close,
        next: function () { show(current + 1); },
        prev: function () { show(current - 1); }
      };

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target.classList.contains('lml-backdrop')) close();
        else if (e.target.classList.contains('lml-close')) close();
        else if (e.target.classList.contains('lml-prev')) window.LessonMediaLightbox.prev();
        else if (e.target.classList.contains('lml-next')) window.LessonMediaLightbox.next();
      });
      document.addEventListener('keydown', function (e) {
        if (!overlay.classList.contains('open')) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); window.LessonMediaLightbox.next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); window.LessonMediaLightbox.prev(); }
      });
    })();

    (function () {
      function upgradeOfflineMedia() {
        // When the lesson HTML is opened directly from a hard drive (file://),
        // YouTube embeds can be blocked — swap them for a clickable thumbnail
        // that opens the video in a new browser tab.
        var offline = window.location.protocol === 'file:';
        if (!offline) return;
        var players = document.querySelectorAll('.lesson-media-player[data-youtube-id]');
        for (var i = 0; i < players.length; i++) {
          var p = players[i];
          var id = p.getAttribute('data-youtube-id');
          var openUrl = p.getAttribute('data-open-url') || ('https://www.youtube.com/watch?v=' + id);
          var a = document.createElement('a');
          a.href = openUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:var(--theme-text,#0f172a);color:var(--theme-surface,#fff);text-decoration:none;text-align:center;padding:16px;';
          var th = document.createElement('img');
          th.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
          th.alt = '';
          th.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.6;';
          th.onerror = function () { th.style.display = 'none'; };
          var lbl = document.createElement('span');
          lbl.textContent = '▶ Watch on YouTube';
          lbl.style.cssText = 'position:relative;display:inline-flex;align-items:center;gap:8px;background:rgba(255,0,0,0.95);padding:10px 18px;border-radius:12px;font-weight:800;font-size:0.95rem;box-shadow:0 4px 14px rgba(0,0,0,0.35);';
          a.appendChild(th);
          a.appendChild(lbl);
          p.innerHTML = '';
          p.appendChild(a);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', upgradeOfflineMedia);
      } else {
        upgradeOfflineMedia();
      }
    })();
  <\\/script>`;

interface HeadingAnchor { pos: number; text: string; level: number; }

/** A lesson section, as emitted by the lesson generators (`data-section-idx`). */
interface SectionAnchor { idx: number; text: string; openPos: number; pos: number }

const decodeEntities = (value: string): string =>
    String(value ?? '')
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&#0?39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');

/**
 * The lesson's content region. Generated lessons put the page header, the nav, the
 * side panels and every modal OUTSIDE `<main>`, so scoping to it is what keeps media
 * (and heading anchors) out of the lesson header.
 */
const contentWindow = (html: string): { start: number; end: number } => {
    const open = /<main\b[^>]*>/i.exec(html);
    if (open) {
        const start = open.index + open[0].length;
        const end = html.lastIndexOf('</main>');
        if (end > start) return { start, end };
    }
    const body = /<body\b[^>]*>/i.exec(html);
    return { start: body ? body.index + body[0].length : 0, end: html.length };
};

/** Find byte positions right AFTER each <h1>…<h5> heading (skipping headings that live
 *  inside script/style blocks or outside the lesson content container). */
const findHeadingAnchors = (html: string): HeadingAnchor[] => {
    const { start, end } = contentWindow(html);
    const blanked = html
        .slice(start, end)
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, (m) => ' '.repeat(m.length));
    const anchors: HeadingAnchor[] = [];
    const re = /<h([1-5])(?=[^>]*>)[\s\S]*?<\/h\1>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(blanked)) !== null) {
        const text = normText(m[0].replace(/<[^>]*>/g, ' '));
        if (!text) continue;
        anchors.push({ pos: start + m.index + m[0].length, text, level: Number(m[1]) });
    }
    return anchors;
};

/** Class tokens that mean "this is the section's content body". */
const CONTENT_TOKENS = /^(content|lesson-content|section-content|topic-content|activity-content|content-body|content-area|main-content)$/i;

/** Class tokens that mean "this is a header / title / meta wrapper" - never a media target. */
const HEADER_TOKENS = /(header|title|meta|summary|badge|chip|pill|progress)/i;

/**
 * Where media belongs inside one section.
 *
 * The section header must be skipped EXPLICITLY: the Micro Lesson engine wraps its header in
 * `<div class="section-header-content">`, and a naive "first container whose class contains
 * 'content'" search matched THAT (a hyphen is a word boundary), which is exactly how images ended
 * up inside the section headers. Media now goes into the first activity body, so the lesson text
 * wraps tightly around the float the same way the engine's own inline media does.
 */
const sectionContentPos = (html: string, from: number, limit: number): number => {
    const windowEnd = Math.min(limit, from + 40000);
    const window = html.slice(from, windowEnd);

    // 1. Best wrap target: the first activity card body inside this section.
    const cardBody = /<div\b[^>]*\bclass="[^"]*\bduo-card-body\b[^"]*"[^>]*>/i.exec(window);
    if (cardBody) return from + cardBody.index + cardBody[0].length;

    // 2. An explicit content container - but never a header/title/badge wrapper.
    const tagRe = /<([a-z]+)\b[^>]*\bclass="([^"]*)"[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(window)) !== null) {
        const tokens = m[2].split(/\s+/).filter(Boolean);
        if (tokens.some((t) => HEADER_TOKENS.test(t))) continue;
        if (tokens.some((t) => CONTENT_TOKENS.test(t))) return from + m.index + m[0].length;
    }

    // 3. Past the section header (summary / header), then after the first body heading.
    const summaryEnd = /<\/summary>/i.exec(window);
    const headerEnd = /<\/header>/i.exec(window);
    const headerStop = Math.max(
        summaryEnd ? summaryEnd.index + summaryEnd[0].length : 0,
        headerEnd ? headerEnd.index + headerEnd[0].length : 0,
    );
    if (headerStop > 0) {
        const afterHeader = from + headerStop;
        const bodyWindow = html.slice(afterHeader, Math.min(limit, afterHeader + 40000));
        const heading = /<h[1-5]\b[^>]*>[\s\S]*?<\/h[1-5]>/i.exec(bodyWindow);
        return heading ? afterHeader + heading.index + heading[0].length : afterHeader;
    }
    const fallback = /<h[1-5]\b[^>]*>[\s\S]*?<\/h[1-5]>/i.exec(window);
    if (fallback) return from + fallback.index + fallback[0].length;
    return from;
};

/**
 * The sections a lesson is actually made of.
 *
 * The Add Media studio, the AI prompt and the injector all have to agree on what
 * "section 2" means. Every generator marks its section containers — newer ones with
 * `data-section-idx` / `data-section-title`, the classic one with `id="sec-N"` — so
 * anchoring on those is exact. Anchoring on headings matched the page header's <h1>
 * (which put images in the lesson header) and headings inside modals.
 */
const findSectionAnchors = (html: string): SectionAnchor[] => {
    const anchors: SectionAnchor[] = [];
    const re = /<(details|section|article|div)\b[^>]*?\b(?:data-section-idx\s*=\s*"(\d+)"|id="sec-(\d+)")[^>]*>/gi;
    const seen = new Set<number>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
        // The printable one-page digest is a section for layout purposes only: injecting media
        // into it would break the A4 sheet.
        if (/data-digest/i.test(m[0])) continue;
        const idx = m[2] !== undefined ? Number(m[2]) : Number(m[3]);
        if (Number.isNaN(idx) || seen.has(idx)) continue;
        seen.add(idx);
        const afterOpen = m.index + m[0].length;
        const pos = sectionContentPos(html, afterOpen, html.length);
        let title = (m[0].match(/data-section-title\s*=\s*"([^"]*)"/i) || [])[1] || '';
        if (!title) {
            // Classic generator: the section title is the heading that opens the body.
            const slice = html.slice(m.index, Math.min(pos, m.index + 4000));
            title = (slice.match(/<h[1-5]\b[^>]*>([\s\S]*?)<\/h[1-5]>/i) || [])[1] || '';
        }
        anchors.push({ idx, text: normText(decodeEntities(title)), openPos: m.index, pos });
    }
    return anchors;
};

/** Map an item's `targetSection` (1-based number, or a title) onto a section anchor. */
const resolveSectionIndex = (item: LessonMediaItem, sections: SectionAnchor[]): number => {
    const raw = item.targetSection;
    if (raw === undefined || raw === null) return -1;
    const ts = String(raw).trim();
    if (!ts) return -1;
    if (/^\d+$/.test(ts)) {
        const n = parseInt(ts, 10);
        // "0" is tolerated as a legacy 0-based index for the very first section.
        if (n === 0) return 0;
        const byIdx = sections.findIndex((s) => s.idx === n - 1);
        if (byIdx !== -1) return byIdx;
        if (n >= 1 && n <= sections.length) return n - 1;
        return -1;
    }
    const q = normText(ts);
    if (q.length < 2) return -1;
    return sections.findIndex((s) => s.text && (s.text.includes(q) || q.includes(s.text)));
};

/** Even spread of untargeted items across the available anchors. */
const spreadIndex = (i: number, total: number, count: number): number => {
    if (count <= 0) return -1;
    if (total <= 1) return 0;
    return Math.min(count - 1, Math.max(0, Math.round(((i + 1) * (count + 1)) / (total + 1)) - 1));
};

/** Find the byte position right after the first <p> that follows `from`. */
const firstParagraphEndAfter = (html: string, from: number): number => {
    const windowEnd = Math.min(html.length, from + 6000);
    const idx = html.indexOf('</p>', from);
    if (idx !== -1 && idx < windowEnd) return idx + '</p>'.length;
    return from;
};

const resolveAnchorIndex = (item: LessonMediaItem, anchors: HeadingAnchor[]): number => {
    const raw = item.targetSection;
    if (raw === undefined || raw === null) return -1;
    const ts = String(raw).trim();
    if (!ts) return -1;
    if (/^\d+$/.test(ts)) {
        const n = parseInt(ts, 10);
        // Section numbers are 1-based ("1" = the first heading) to match the studio dropdown & AI prompt.
        // "0" is tolerated as a legacy 0-based index for the very first section.
        if (n === 0) return 0;
        if (n >= 1 && n <= anchors.length) return n - 1;
        const as1Based = anchors.findIndex((a) => a.text === ts || a.text.startsWith(ts + ' '));
        if (as1Based !== -1) return as1Based;
        return -1;
    }
    const q = normText(ts);
    if (q.length < 2) return -1;
    const direct = anchors.findIndex((a) => a.text && (a.text.includes(q) || q.includes(a.text)));
    if (direct !== -1) return direct;
    return -1;
};

/** Decide layout for an item. Returns 'left' | 'right' | 'full' | 'center'. */
const resolveLayout = (item: LessonMediaItem, index: number): 'left' | 'right' | 'full' | 'center' => {
    const a = String(item.align || 'auto');
    if (a === 'left' || a === 'right') return a;
    if (a === 'full') return 'full';
    if (a === 'center') return 'center';
    const type = item.type || 'image';
    if (type === 'image' || type === 'gif' || type === 'audio' || type === 'podcast') {
        return index % 2 === 0 ? 'right' : 'left';
    }
    return 'full';
};

const buildImageBlock = (item: LessonMediaItem, layout: string): string => {
    const caption = item.caption || item.title || '';
    const alt = item.altText || caption || 'Lesson media';
    const url = item.url || '';
    const source = item.sourceUrl || url;
    const isGif = item.type === 'gif' || /\.gif(\?|#|$)/i.test(url);
    return (
        '<div class="lesson-media-block mag-' + layout + (item.type === 'gif' ? ' mag-gif' : '') + '">' +
        '<figure style="margin:0;" class="lm-card">' +
        '<div class="lesson-media-img-wrap" role="button" tabindex="0" title="Click to enlarge" aria-label="Enlarge media" onclick="LessonMediaLightbox.open(this)" onkeydown="var k=event.keyCode||event.which;if(k===13||k===32){event.preventDefault();LessonMediaLightbox.open(this)}" data-lml-url="' + escapeHtmlAttr(url) + '" data-lml-alt="' + escapeHtmlAttr(alt) + '" data-lml-caption="' + escapeHtmlAttr(caption) + '" data-lml-source="' + escapeHtmlAttr(source) + '">' +
        '<img src="' + escapeHtmlAttr(url) + '" alt="' + escapeHtmlAttr(alt) + '" loading="lazy"' + (isGif ? ' style="object-fit:contain;"' : '') + ' onerror="this.onerror=null;this.closest(&#39;.lesson-media-img-wrap&#39;).classList.add(&#39;img-failed&#39;)" />' +
        '</div>' +
        (caption || (source && source !== url)
            ? '<figcaption class="lm-caption"><span>' + escapeHtmlAttr(caption || (isGif ? 'Animated GIF' : 'Image')) + '</span>' +
              (source && source !== url ? '<a href="' + escapeHtmlAttr(source) + '" target="_blank" rel="noopener noreferrer">source ↗</a>' : '') +
              '</figcaption>'
            : '') +
        '</figure>' +
        '</div>'
    );
};

const buildVideoInner = (item: LessonMediaItem): { player: string; openLabel: string; openUrl: string } => {
    const url = item.url || '';
    const type = item.type || 'youtube';
    const caption = item.caption || item.title || 'Lesson video';
    const youtubeId = type === 'youtube' || /youtube\.com|youtu\.be/i.test(url) ? extractYoutubeId(url) : '';
    const isVimeo = type === 'vimeo' || /vimeo\.com/i.test(url);
    const isDailymotion = /dailymotion\.com/i.test(url);
    const isDirect = type === 'video' || /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url);
    const idOk = /^[a-zA-Z0-9_-]{11}$/.test(youtubeId);

    let player: string;
    let openLabel = '▶ Open';
    if (idOk) {
        player =
            '<div class="lesson-media-player" data-youtube-id="' + escapeHtmlAttr(youtubeId) + '" data-open-url="' + escapeHtmlAttr(url) + '" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:var(--theme-text,#0f172a);">' +
            '<iframe class="lesson-media-iframe" src="https://www.youtube.com/embed/' + escapeHtmlAttr(youtubeId) + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen loading="lazy" title="' + escapeHtmlAttr(caption) + '"></iframe>' +
            '</div>';
        openLabel = '▶ Open on YouTube';
    } else if (isYoutubeLike(youtubeId, url)) {
        player =
            '<div class="lesson-media-player" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:var(--theme-text,#0f172a);">' +
            '<a href="' + escapeHtmlAttr(url) + '" target="_blank" rel="noopener noreferrer" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--theme-surface,#ffffff);text-decoration:none;font-weight:800;font-size:0.95rem;background:linear-gradient(135deg,#1e293b,#0f172a);gap:8px;text-align:center;padding:12px;">▶ Watch on YouTube ↗</a>' +
            '</div>';
        openLabel = '▶ Watch on YouTube';
    } else if (isVimeo) {
        const vimeoId = (url.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1] || '';
        player =
            '<div class="lesson-media-player" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:var(--theme-text,#0f172a);">' +
            (vimeoId
                ? '<iframe src="https://player.vimeo.com/video/' + escapeHtmlAttr(vimeoId) + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen loading="lazy" title="' + escapeHtmlAttr(caption) + '"></iframe>'
                : '<a href="' + escapeHtmlAttr(url) + '" target="_blank" rel="noopener noreferrer" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--theme-surface,#fff);text-decoration:none;font-weight:800;background:#1b1f24;">▶ Open on Vimeo ↗</a>') +
            '</div>';
        openLabel = '▶ Open on Vimeo';
    } else if (isDailymotion) {
        const dmId = (url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/) || [])[1] || '';
        player =
            '<div class="lesson-media-player" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:var(--theme-text,#0f172a);">' +
            (dmId
                ? '<iframe src="https://www.dailymotion.com/embed/video/' + escapeHtmlAttr(dmId) + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen loading="lazy" title="' + escapeHtmlAttr(caption) + '"></iframe>'
                : '<a href="' + escapeHtmlAttr(url) + '" target="_blank" rel="noopener noreferrer" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--theme-surface,#fff);text-decoration:none;font-weight:800;">▶ Open ↗</a>') +
            '</div>';
        openLabel = '▶ Open on Dailymotion';
    } else if (isDirect) {
        player =
            '<div class="lesson-media-player"><video controls preload="none"><source src="' + escapeHtmlAttr(url) + '" /></video></div>';
        openLabel = '▶ Open video file';
    } else {
        player =
            '<div class="lesson-media-player" style="padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:var(--theme-text,#0f172a);">' +
            '<a href="' + escapeHtmlAttr(url) + '" target="_blank" rel="noopener noreferrer" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--theme-surface,#fff);text-decoration:none;font-weight:800;text-align:center;padding:12px;">▶ Watch video ↗</a>' +
            '</div>';
    }
    return { player, openLabel, openUrl: url };
};

const isYoutubeLike = (id: string, url: string): boolean =>
    Boolean(id) || /youtube\.com|youtu\.be/i.test(url);

const buildVideoBlock = (item: LessonMediaItem, layout: string): string => {
    const { player, openLabel, openUrl } = buildVideoInner(item);
    const caption = item.caption || item.title || '';
    const source = item.sourceUrl || item.url || '';
    return (
        '<div class="lesson-media-block mag-' + layout + '">' +
        '<div class="lm-card" style="padding:10px;">' +
        player +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:8px;">' +
        (caption ? '<p style="margin:0;font-size:0.8rem;color:var(--theme-text-secondary,#6b7280);font-style:italic;flex:1;min-width:120px;">' + escapeHtmlAttr(caption) + '</p>' : '<p style="margin:0;flex:1;"></p>') +
        '<a href="' + escapeHtmlAttr(openUrl || source) + '" target="_blank" rel="noopener noreferrer" class="lm-openbtn red">' + openLabel + ' <span style="font-size:0.7rem;">↗</span></a>' +
        '</div>' +
        '</div>' +
        '</div>'
    );
};

const isDirectAudioUrl = (url: string): boolean => /\.(mp3|m4a|ogg|wav|aac|opus|flac)(\?|#|$)/i.test(url);

const buildAudioBlock = (item: LessonMediaItem, layout: string): string => {
    const url = item.url || '';
    const caption = item.caption || item.title || '';
    const source = item.sourceUrl || url;
    const provider = detectMediaProvider(item);
    let player: string;
    let openLabel = '▶ Open';

    if (provider === 'soundcloud' || /soundcloud\.com/i.test(url)) {
        const rawUrl = url.replace(/^https?:\/\/(w\.)?soundcloud\.com/, 'https://soundcloud.com');
        player =
            '<div class="lesson-media-player" style="border-radius:10px;overflow:hidden;background:#ff5500;">' +
            '<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" loading="lazy" src="https://w.soundcloud.com/player/?url=' + encodeURIComponent(rawUrl) + '&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true"></iframe>' +
            '</div>';
        openLabel = '🎧 Open on SoundCloud';
    } else if (provider === 'spotify' || /spotify\.com/i.test(url)) {
        let embedUrl = url
            .replace(/^https?:\/\/open\.spotify\.com\//, 'https://open.spotify.com/embed/')
            .replace(/^https?:\/\/play\.spotify\.com\//, 'https://open.spotify.com/embed/');
        if (!embedUrl.includes('/embed/')) embedUrl = embedUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');
        player =
            '<div class="lesson-media-player" style="border-radius:10px;overflow:hidden;background:#121212;">' +
            '<iframe src="' + escapeHtmlAttr(embedUrl) + '" width="100%" height="152" style="border:none;" frameBorder="0" allow="encrypted-media" loading="lazy" title="' + escapeHtmlAttr(caption || 'Spotify audio') + '"></iframe>' +
            '</div>';
        openLabel = '🎧 Open on Spotify';
    } else if (isDirectAudioUrl(url)) {
        player =
            '<div class="lesson-media-player" style="border-radius:10px;background:var(--theme-text-10,#f3f4f6);padding:14px 12px;">' +
            '<audio controls preload="none" style="width:100%;"><source src="' + escapeHtmlAttr(url) + '" /></audio>' +
            '</div>';
        openLabel = '🔊 Open audio';
    } else if (item.type === 'podcast') {
        player =
            '<div class="lesson-media-player" style="border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:16px;color:#fff;display:flex;flex-direction:column;gap:10px;">' +
            '<span style="font-weight:800;font-size:0.95rem;">🎙️ ' + escapeHtmlAttr(caption || 'Podcast episode') + '</span>' +
            '<a href="' + escapeHtmlAttr(url) + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#fff;color:#4f46e5;text-decoration:none;font-size:0.78rem;font-weight:800;padding:8px 14px;border-radius:9px;align-self:flex-start;">▶ Listen to episode ↗</a>' +
            '</div>';
        openLabel = '🎙️ Open podcast';
    } else {
        player =
            '<div class="lesson-media-player" style="border-radius:10px;background:#1f2937;padding:18px 16px;display:flex;flex-direction:column;gap:10px;color:#fff;">' +
            '<span style="font-weight:800;font-size:0.95rem;">🔊 ' + escapeHtmlAttr(caption || 'Audio') + '</span>' +
            '<a href="' + escapeHtmlAttr(url) + '" target="_blank" rel="noopener noreferrer" class="lm-openbtn">▶ Listen ↗</a>' +
            '</div>';
        openLabel = '🔊 Open audio';
    }

    return (
        '<div class="lesson-media-block mag-' + layout + ' mag-audio">' +
        '<div class="lm-card" style="padding:10px;">' +
        player +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
        (caption && (provider !== 'soundcloud' && provider !== 'spotify')
            ? '<p style="margin:0;font-size:0.8rem;color:#6b7280;font-style:italic;flex:1;min-width:100px;">' + escapeHtmlAttr(caption) + '</p>'
            : (caption ? '<p style="margin:0;font-size:0.8rem;color:#6b7280;font-style:italic;flex:1;min-width:100px;">' + escapeHtmlAttr(caption) + '</p>' : '<p style="margin:0;"></p>')) +
        (source && source !== url
            ? '<a href="' + escapeHtmlAttr(source) + '" target="_blank" rel="noopener noreferrer" style="color:#4f46e5;text-decoration:none;font-weight:700;font-size:0.75rem;">source ↗</a>'
            : '') +
        '</div>' +
        '</div>' +
        '</div>'
    );
};

/** Hosts that reliably allow being framed inside a lesson. */
const EMBED_FRIENDLY = /(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|soundcloud\.com|spotify\.com|google\.com\/maps|docs\.google\.com|drive\.google\.com|wordwall\.net|learningapps\.org|h5p\.org|padlet\.com|genially\.com|quizlet\.com|nearpod\.com|baamboozle\.com|gimkit\.com|kahoot\.it|blooket\.com|view\.genial\.ly)/i;

const buildEmbedBlock = (item: LessonMediaItem, layout: string): string => {
    const url = item.url || '';
    const caption = item.caption || item.title || 'Embedded media';
    const source = item.sourceUrl || url;
    // Sites such as BBC Learning English, news outlets and Google-search pages send
    // X-Frame-Options/CSP headers that make an iframe render blank, so those get a
    // visible "open in a new tab" hint next to the frame instead of a silent void.
    const mayBlock = !EMBED_FRIENDLY.test(url);
    let host = '';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { host = url.slice(0, 40); }
    return (
        '<div class="lesson-media-block mag-' + layout + '">' +
        '<div class="lm-card" style="padding:10px;">' +
        '<div class="lesson-media-player" style="border-radius:10px;overflow:hidden;background:#0f172a;">' +
        '<iframe src="' + escapeHtmlAttr(url) + '" style="width:100%;min-height:260px;height:340px;border:none;display:block;" allowfullscreen loading="lazy" title="' + escapeHtmlAttr(caption) + '" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"></iframe>' +
        '</div>' +
        (mayBlock
            ? '<p class="lm-embed-hint" style="margin:8px 0 0;font-size:0.72rem;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 9px;line-height:1.35;">If <b>' + escapeHtmlAttr(host) + '</b> stays blank, that site blocks being embedded — use the button below to open it in a new tab.</p>'
            : '') +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
        (caption ? '<p style="margin:0;font-size:0.8rem;color:var(--theme-text-secondary,#6b7280);font-style:italic;flex:1;min-width:120px;">' + escapeHtmlAttr(caption) + '</p>' : '<p style="margin:0;"></p>') +
        '<a href="' + escapeHtmlAttr(source) + '" target="_blank" rel="noopener noreferrer" class="lm-openbtn">↗ Open source</a>' +
        '</div>' +
        '</div>' +
        '</div>'
    );
};

const buildMediaBlockHtml = (item: LessonMediaItem, layout: string): string => {
    const type = item.type || 'image';
    if (type === 'image' || type === 'gif') return buildImageBlock(item, layout);
    if (type === 'youtube' || type === 'vimeo' || type === 'video') return buildVideoBlock(item, layout);
    if (type === 'audio' || type === 'podcast') return buildAudioBlock(item, layout);
    return buildEmbedBlock(item, layout);
};

/**
 * One media block, exactly as the lesson will render it.
 *
 * Exported for the Add Media studio's placement preview: rendering the preview with
 * this instead of a hand-made thumb means what the tutor sees *is* the block that
 * gets injected, including its float, its size class and its caption chrome.
 */
export const mediaBlockHtml = (item: LessonMediaItem, index: number, layoutOverride?: string): string =>
    buildMediaBlockHtml(item, layoutOverride || resolveLayout(item, index));

/* ========================================================================
 * Placement
 *
 * The Add Media studio has to answer "where will this land?" before the lesson
 * exists — and it must not answer it with a second, drifting copy of the rules the
 * injector uses. So the decision lives here once, over an *outline* (sections, and
 * how many activity bodies each one has), and both callers feed it:
 *
 *   · `injectMediaHtml` builds the outline by reading the generated HTML, then maps
 *     the chosen (section, activity) onto a byte position;
 *   · the studio builds the outline from the lesson's own section/activity list, so
 *     the tutor sees the placement before rendering.
 * ======================================================================== */

export interface MediaOutlineActivity {
    /** 0-based, in document order — what `targetActivity` as a number refers to. */
    index: number;
    title: string;
    /**
     * How much readable copy the activity body carries (HTML stripped).
     *
     * A floated picture needs text to wrap beside it: drop a half-width float into a
     * card with one short line and the other half is dead space. When this is known and
     * too small, the plan demotes the float to a full-width block. `undefined` means
     * "not measured" (the callers that cannot measure yet), which keeps the float.
     */
    textLength?: number;
}

/** Below this many characters of copy, a float leaves a dead column — go full width. */
export const MIN_WRAP_TEXT_LENGTH = 240;

/** Visible text length of a chunk of lesson HTML. */
export const visibleTextLength = (html: string): number =>
    String(html || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim().length;

export interface MediaOutlineSection {
    index: number;
    /** 1-based, as shown to the tutor and as `targetSection` numbers are written. */
    number: number;
    title: string;
    activities: MediaOutlineActivity[];
}

export interface MediaPlacement {
    /** The item's own id, so the studio can match a plan back to a card. */
    id: string;
    index: number;
    layout: 'left' | 'right' | 'full' | 'center';
    width: 'sm' | 'md' | 'lg' | 'full';
    type: string;
    /** -1 when the lesson has no sections at all (the item is appended at the end). */
    sectionIndex: number;
    sectionNumber: number;
    sectionTitle: string;
    /** 0-based within the section, or -1 when the section has no activity bodies. */
    activityIndex: number;
    activityTitle: string;
    activityCount: number;
    /** True when the tutor/AI asked for this section rather than the spread choosing it. */
    targeted: boolean;
}

/** Resolve `targetActivity` against a section's activities. -1 means "not specified/not found". */
const resolveActivityIndex = (item: LessonMediaItem, activities: MediaOutlineActivity[]): number => {
    const raw = item.targetActivity;
    if (raw === undefined || raw === null) return -1;
    if (!activities.length) return -1;
    const ts = String(raw).trim();
    if (!ts) return -1;
    if (/^\d+$/.test(ts)) {
        const n = parseInt(ts, 10);
        // Written 1-based, like section numbers, and in the same order the lesson renders them.
        if (n >= 1 && n <= activities.length) return n - 1;
        return -1;
    }
    const q = normText(ts);
    if (q.length < 2) return -1;
    const exact = activities.findIndex((a) => normText(a.title) === q);
    if (exact !== -1) return exact;
    return activities.findIndex((a) => a.title && (normText(a.title).includes(q) || q.includes(normText(a.title))));
};

/**
 * Decide where every item lands: which section, which activity body inside it, and how
 * it is laid out. Pure — same inputs, same answer, every time.
 */
export const planMediaPlacement = (
    items: LessonMediaItem[],
    outline: MediaOutlineSection[],
): MediaPlacement[] => {
    const count = outline.length;
    // `resolveSectionIndex` speaks in section anchors; the outline is the same shape
    // with the positions left out, so the matching rules stay in one place.
    const alias: SectionAnchor[] = outline.map((s) => ({ idx: s.index, text: normText(s.title), openPos: 0, pos: 0 }));
    // Sections that were explicitly targeted are counted first, so an untargeted item
    // goes to whichever section is still lightest rather than all of them piling into
    // the last one.
    const load = new Array(Math.max(count, 0)).fill(0);
    items.forEach((item) => {
        const si = resolveSectionIndex(item, alias);
        if (si !== -1) load[si] += 1;
    });
    const bodiesUsed = new Array(Math.max(count, 0)).fill(0);

    return items.map((item, i) => {
        const askedLayout = resolveLayout(item, i);
        let sectionIndex = resolveSectionIndex(item, alias);
        const targeted = sectionIndex !== -1;
        if (sectionIndex === -1 && count > 0) sectionIndex = load.indexOf(Math.min(...load));
        if (sectionIndex !== -1 && count > 0) load[sectionIndex] += 1;

        const section = sectionIndex !== -1 ? outline[sectionIndex] : undefined;
        const activities = section?.activities || [];
        let activityIndex = -1;
        if (section) {
            const asked = resolveActivityIndex(item, activities);
            if (asked !== -1) {
                activityIndex = asked;
                bodiesUsed[sectionIndex] = Math.max(bodiesUsed[sectionIndex], asked + 1);
            } else if (activities.length) {
                // Floats sit at the top of an activity body, so the text of that body wraps
                // tightly around them; several items in one section move on to the next body.
                activityIndex = Math.min(bodiesUsed[sectionIndex], activities.length - 1);
                bodiesUsed[sectionIndex] += 1;
            }
        }

        // A float needs body copy beside it. When the chosen card is too short to wrap
        // around one — or has no measurable copy at all, because its body is drawn by
        // JS — the block goes full width instead of leaving a dead half-column.
        const measured = activityIndex >= 0 ? activities[activityIndex]?.textLength : undefined;
        const isFloat = askedLayout === 'left' || askedLayout === 'right';
        const layout = isFloat && measured !== undefined && measured < MIN_WRAP_TEXT_LENGTH ? 'full' : askedLayout;

        return {
            id: item.id,
            index: i,
            layout,
            width: (item.width || 'md') as MediaPlacement['width'],
            type: String(item.type || 'image'),
            sectionIndex,
            sectionNumber: section ? section.number : 0,
            sectionTitle: section ? section.title : '',
            activityIndex,
            activityTitle: activityIndex >= 0 ? activities[activityIndex]?.title || '' : '',
            activityCount: activities.length,
            targeted,
        };
    });
};

/**
 * The outline, read out of a generated lesson's HTML.
 *
 * Activity titles come from each card's own header — `.duo-card-header` is what every
 * activity type renders (see the generator) — and cards are matched to bodies by
 * document order inside the section. The card *opener* is matched on the class token
 * `duo-card`, never on the substring: `duo-card-body` contains `duo-card`, and a
 * substring match there is exactly what put media inside section headers once before.
 */
const sectionActivityAnchors = (html: string, sections: SectionAnchor[]): { pos: number; title: string; textLength: number }[][] =>
    sections.map((sec, i) => {
        const limit = i + 1 < sections.length ? sections[i + 1].openPos : html.length;
        const out: { pos: number; title: string; textLength: number }[] = [];
        const re = /<div\b[^>]*class="([^"]*)"[^>]*>/gi;
        // From the section's own opening tag, NOT from `sec.pos`: the content position
        // is deliberately placed *inside* the first activity body (that is where media
        // goes), so starting there would skip that body entirely — the first activity
        // could never receive media, and the studio would be told a section has one
        // fewer activity than it has. A section header holds no card bodies, so nothing
        // has to be skipped here.
        re.lastIndex = sec.openPos;
        let cardTitle = '';
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null && m.index < limit) {
            const tokens = m[1].split(/\s+/);
            const afterOpen = m.index + m[0].length;
            if (tokens.includes('duo-card')) {
                // A fresh card: read the title out of its header (or its first heading).
                const header = html
                    .slice(afterOpen, Math.min(limit, afterOpen + 2000))
                    .match(/<div\b[^>]*class="[^"]*\bduo-card-header\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
                const source = header ? header[1] : html.slice(afterOpen, Math.min(limit, afterOpen + 600));
                cardTitle = normText(decodeEntities(source.replace(/<[^>]*>/g, ' ')));
            } else if (tokens.includes('duo-card-body')) {
                out.push({ pos: afterOpen, title: cardTitle, textLength: 0 });
            }
        }
        // Measure each body up to the next body (or the end of the section) so the planner
        // knows whether a float would have copy to wrap around.
        out.forEach((body, bi) => {
            const end = bi + 1 < out.length ? out[bi + 1].pos : limit;
            body.textLength = visibleTextLength(html.slice(body.pos, end));
        });
        return out;
    });

export const outlineFromHtml = (html: string): MediaOutlineSection[] => {
    const sections = findSectionAnchors(html);
    const bodies = sections.length ? sectionActivityAnchors(html, sections) : [];
    return sections.map((sec, i) => ({
        index: sec.idx,
        number: i + 1,
        title: sec.text || `Section ${i + 1}`,
        activities: (bodies[i] || []).map((body, ai) => ({ index: ai, title: body.title || `Activity ${ai + 1}`, textLength: body.textLength })),
    }));
};

export const injectMediaHtml = (html: string, lessonSettings?: LessonSettings): string => {
    const items = collectLessonMediaItems(lessonSettings);
    if (!items.length) return html;

    const bodyClose = html.lastIndexOf('</body>');
    const endPos = bodyClose === -1 ? html.length : bodyClose;

    // Section containers are authoritative when the lesson has them (every generated
    // lesson does); plain headings are only the fallback for other formats.
    const sections = findSectionAnchors(html);
    const outline = outlineFromHtml(html);
    const bodyAnchors = (sections.length ? sectionActivityAnchors(html, sections) : []).map((b) => b.map((x) => x.pos));
    const headings = sections.length ? [] : findHeadingAnchors(html);
    const anchorPosOf = (anchor: number) => (sections.length ? sections[anchor].pos : headings[anchor].pos);
    const count = sections.length || headings.length;

    // The decision itself is shared with the Add Media studio's preview: exactly the
    // same function, over the same outline, so the studio cannot promise a placement
    // the renderer will not honour.
    const plan = sections.length ? planMediaPlacement(items, outline) : [];

    const blocks: { pos: number; text: string; layout: string; anchor: number }[] = [];

    items.forEach((item, i) => {
        const placed = plan[i];
        const layout = placed ? placed.layout : resolveLayout(item, i);
        const text = buildMediaBlockHtml(item, layout);
        let anchor = placed ? placed.sectionIndex : resolveAnchorIndex(item, headings);
        if (!sections.length && anchor === -1 && count > 0) anchor = spreadIndex(i, items.length, count);
        if (sections.length && anchor === -1) anchor = -1;

        let pos: number;
        if (anchor !== -1 && count > 0) {
            const anchorPos = anchorPosOf(anchor);
            // Prefer the body of the activity the plan chose; fall back to the old
            // counter when the outline could not name one (a section with no cards).
            const named = placed && placed.activityIndex >= 0 ? (bodyAnchors[anchor] || [])[placed.activityIndex] : undefined;
            // A section with no activity cards at all (a plain `content` block) has no body
            // anchor, so the media sits at the top of the section instead.
            const floatPos = named !== undefined ? named : (bodyAnchors[anchor] || [])[0] ?? anchorPos;
            const isFloat = layout === 'left' || layout === 'right';
            pos = isFloat ? floatPos : firstParagraphEndAfter(html, floatPos);
        } else {
            pos = endPos;
        }
        blocks.push({ pos, text, layout, anchor });
    });

    // Insert clearfixes before whatever follows a floated block, so a tall float
    // can never bleed into the next section.
    const clearfixes: { pos: number; text: string }[] = [];
    const floats = blocks.filter((b) => (b.layout === 'left' || b.layout === 'right') && b.anchor !== -1);
    if (floats.length) {
        const seen = new Set<number>();
        if (sections.length) {
            floats.forEach((b) => {
                const next = sections[b.anchor + 1];
                if (next && !seen.has(next.openPos)) {
                    seen.add(next.openPos);
                    clearfixes.push({ pos: next.openPos, text: '<div class="lesson-media-clear"></div>' });
                }
            });
        } else {
            const floatAnchors = floats.map((b) => b.anchor);
            headings.forEach((a, ai) => {
                if (floatAnchors.some((fa) => ai > fa) && !seen.has(a.pos)) {
                    seen.add(a.pos);
                    clearfixes.push({ pos: a.pos, text: '<div class="lesson-media-clear"></div>' });
                }
            });
        }
    }

    // Bundle all inserts (CSS rides with the earliest media block).
    const inserts: { pos: number; text: string }[] = blocks.map((b) => ({ pos: b.pos, text: b.text }));
    if (inserts.length) {
        inserts[0] = { ...inserts[0], text: LESSON_MEDIA_CSS + inserts[0].text };
    }
    inserts.push({ pos: endPos, text: MEDIA_SCRIPT });
    inserts.push(...clearfixes);

    inserts.sort((a, b) => a.pos - b.pos);
    let out = '';
    let cursor = 0;
    for (const ins of inserts) {
        out += html.slice(cursor, ins.pos);
        out += ins.text;
        cursor = ins.pos;
    }
    out += html.slice(cursor);
    return out;
};
