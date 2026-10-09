import * as idb from 'idb-keyval';

export interface SaveLessonOptions {
  htmlContent: string;
  fileName: string;
  learnerName?: string;
  tutorName?: string;
  type?: string;
  title?: string;
  triggerDownload?: boolean;
  /** Also download a .zip of the HTML (learner-ready package) next to the .html file. */
  alsoZip?: boolean;
  /**
   * Sidecar files bundled inside the ZIP (e.g. a music lesson's local song or
   * video file). Their `name` must match the relative path the lesson HTML uses.
   */
  extraFiles?: { name: string; data: Blob | ArrayBuffer | string }[];
  /**
   * Write this lesson into the local saved-lessons library ("Manage Saved Files",
   * the learner's saved lessons, offline PWA copies).
   *
   * Defaults to false on purpose: only explicit "Save to Library" / "Save & Overwrite"
   * actions should put a file in the library. Downloading, rendering or exporting a
   * lesson HTML ("Save as Presenter HTML", "Save as Learner HTML", "Render Content",
   * "Download Local", a ZIP package, ...) must leave the library untouched.
   */
  toLibrary?: boolean;
  /**
   * The lesson's standalone one-page A4 digest (see `generateLessonDigestHtml`).
   *
   * It is filed as a `kind: 'digest'` record pointing back at the lesson, so the library shows it
   * *as part of* that lesson instead of as a second, near-identical row — and it is filed exactly
   * when the lesson is (`toLibrary`). On a download it is written beside the lesson file; with
   * `alsoZip` it rides inside the ZIP. Either way the sheet arrives with the lesson it belongs to.
   */
  digestHtml?: string;
  onSuccess?: (urlOrMessage: string) => void;
  onError?: (err: any) => void;
}

export interface SavedHtmlLessonRecord {
  id: string;
  tutor: string;
  learner: string;
  filename: string;
  type: string;
  title: string;
  path: string;
  url: string;
  htmlContent?: string;
  timestamp: string;
  size: number;
  /** `'digest'` marks the one-page A4 sheet cut from a lesson; everything else is a lesson. */
  kind?: 'lesson' | 'digest';
  /** On a digest: the lesson filename it was cut from. */
  parentFilename?: string;
}

const SAVED_LESSONS_IDB_KEY = 'tutorly_saved_html_lessons';
const UPLOAD_FALLBACK_KEY = 'tutorly-upload-fallback-files';

/**
 * The lesson a sheet belongs to, with its audience segment removed.
 *
 * `Alice_Micro-Lesson_Presenter_2026-09-21.html` and `…_Learner_…` are the same lesson taught from
 * two angles, so they share one key — and therefore one cheat sheet. Without this the tutor got two
 * near-identical sheets in the library, one for each audience, which is the clutter this prevents.
 */
export function digestParentKey(lessonFileName: string): string {
  return String(lessonFileName || 'Lesson')
    .replace(/\.html?$/i, '')
    .replace(/_(?:Learner|Presenter)(?=_|$)/gi, '')
    .replace(/_{2,}/g, '_')
    .replace(/_+$/, '');
}

/**
 * `Alice_Micro-Lesson_Presenter_2026-09-21.html` → `Alice_Micro-Lesson_2026-09-21-Digest.html`.
 *
 * Audience-free on purpose: the sheet is neither learner nor presenter material — it is the one
 * page both of them revise from — so saving the lesson for either audience overwrites the same
 * sheet instead of producing a second, near-identical file.
 */
export function digestFileNameFor(lessonFileName: string): string {
  const neutral = digestParentKey(lessonFileName);
  return `${neutral || 'Lesson'}-Digest.html`;
}

/**
 * Files a lesson's digest so the library can show it attached to that lesson.
 *
 * One digest per lesson filename: re-saving a lesson overwrites its sheet rather than stacking
 * copies, which is what keeps the library honest about which lesson a sheet belongs to.
 */
export async function persistLessonDigestToLocalStore(options: {
  lessonFilename: string;
  digestHtml: string;
  learnerName?: string;
  tutorName?: string;
  type?: string;
  title?: string;
}): Promise<SavedHtmlLessonRecord> {
  const lessonFilename = options.lessonFilename;
  const filename = digestFileNameFor(lessonFilename);
  const parentKey = digestParentKey(lessonFilename);
  const learner = options.learnerName || 'Learner';
  const record: SavedHtmlLessonRecord = {
    id: `digest_${parentKey}`,
    tutor: options.tutorName || 'Tutor',
    learner,
    filename,
    type: options.type || 'Lesson Digest',
    title: options.title || filename,
    path: `/Learners/${learner.replace(/\s+/g, '_')}/${filename}`,
    url: `/Learners/${learner.replace(/\s+/g, '_')}/${filename}`,
    htmlContent: options.digestHtml,
    timestamp: new Date().toISOString(),
    size: options.digestHtml.length,
    kind: 'digest',
    parentFilename: lessonFilename,
  };

  try {
    const currentIdb: SavedHtmlLessonRecord[] = (await idb.get(SAVED_LESSONS_IDB_KEY)) || [];
    // One sheet per lesson: a re-save (or the other audience's save) replaces it rather than
    // stacking a second row that claims the same lesson.
    const updatedIdb = [
      record,
      ...currentIdb.filter((r) => r.kind !== 'digest' || (r.filename !== filename && digestParentKey(r.parentFilename || '') !== parentKey)),
    ].slice(0, 100);
    await idb.set(SAVED_LESSONS_IDB_KEY, updatedIdb);
  } catch (err) {
    console.warn('[Storage] Could not file the lesson digest:', err);
  }

  try {
    const currentLs: any[] = JSON.parse(localStorage.getItem(UPLOAD_FALLBACK_KEY) || '[]');
    const metaRecord = {
      tutor: record.tutor,
      learner: record.learner,
      filename: record.filename,
      path: record.path,
      url: record.url,
      timestamp: record.timestamp,
      size: record.size,
    };
    const updatedLs = [metaRecord, ...currentLs.filter((f: any) => f.filename !== filename)].slice(0, 50);
    localStorage.setItem(UPLOAD_FALLBACK_KEY, JSON.stringify(updatedLs));
  } catch (lsErr) {
    console.warn('[Storage] LocalStorage fallback write skipped (quota exceeded handled by IDB):', lsErr);
  }

  return record;
}

/**
 * Universal browser-safe download trigger that works across all environments:
 * - Desktop browsers (Chrome, Edge, Firefox, Safari)
 * - Mobile Safari & iOS PWA Standalone Mode
 * - Android Chrome & PWA Standalone Mode
 * - In-app webviews & iframe embeds
 */
export function triggerUniversalDownload(
  content: string | Blob,
  fileName: string,
  mimeType: string = 'text/html;charset=utf-8'
): boolean {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    // Standard DOM link click with explicit body attachment
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.style.position = 'fixed';
    link.style.left = '-9999px';
    link.style.top = '-9999px';
    link.style.opacity = '0';

    document.body.appendChild(link);
    link.click();

    // Clean up DOM element immediately
    setTimeout(() => {
      try {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      } catch (e) {}
    }, 100);

    // Delay blob URL revocation by 60s so iOS Safari / WebKit finishes downloading
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 60000);

    return true;
  } catch (err) {
    console.error('[Download Helper] Universal download failed:', err);
    return false;
  }
}

/**
 * Stores a saved HTML lesson into IndexedDB and LocalStorage fallback so it's
 * accessible inside the PWA even when completely offline or without a server.
 */
export async function persistLessonToLocalStore(record: SavedHtmlLessonRecord): Promise<void> {
  try {
    // 1. Save in IndexedDB (high capacity for full HTML content)
    const currentIdbList: SavedHtmlLessonRecord[] = (await idb.get(SAVED_LESSONS_IDB_KEY)) || [];
    const updatedIdb = [record, ...currentIdbList.filter((r) => r.id !== record.id && r.filename !== record.filename)].slice(0, 100);
    await idb.set(SAVED_LESSONS_IDB_KEY, updatedIdb);

    // 2. Save metadata in LocalStorage for legacy components
    try {
      const currentLs: any[] = JSON.parse(localStorage.getItem(UPLOAD_FALLBACK_KEY) || '[]');
      const metaRecord = {
        tutor: record.tutor,
        learner: record.learner,
        filename: record.filename,
        path: record.path,
        url: record.url,
        timestamp: record.timestamp,
        size: record.size,
      };
      const updatedLs = [metaRecord, ...currentLs.filter((f: any) => f.filename !== record.filename)].slice(0, 50);
      localStorage.setItem(UPLOAD_FALLBACK_KEY, JSON.stringify(updatedLs));
    } catch (lsErr) {
      console.warn('[Storage] LocalStorage fallback write skipped (quota exceeded handled by IDB):', lsErr);
    }
  } catch (err) {
    console.error('[Storage] Failed to persist lesson record:', err);
  }
}

/**
 * Retrieves all saved lessons for a learner from both IndexedDB and LocalStorage.
 */
export async function getSavedLessonsForLearner(learnerName: string, tutorName?: string): Promise<SavedHtmlLessonRecord[]> {
  try {
    const idbList: SavedHtmlLessonRecord[] = (await idb.get(SAVED_LESSONS_IDB_KEY)) || [];
    const lsList: any[] = JSON.parse(localStorage.getItem(UPLOAD_FALLBACK_KEY) || '[]');

    // Combine and deduplicate
    const combinedMap = new Map<string, SavedHtmlLessonRecord>();

    idbList.forEach((item) => {
      if (item.learner === learnerName && (!tutorName || item.tutor === tutorName)) {
        combinedMap.set(item.filename, item);
      }
    });

    lsList.forEach((item) => {
      if (item.learner === learnerName && (!tutorName || item.tutor === tutorName)) {
        if (!combinedMap.has(item.filename)) {
          combinedMap.set(item.filename, {
            id: `legacy_${item.filename}`,
            tutor: item.tutor || 'Tutor',
            learner: item.learner,
            filename: item.filename,
            type: 'HTML Lesson',
            title: item.filename,
            path: item.path || item.url || '',
            url: item.url || item.path || '',
            timestamp: item.timestamp || new Date().toISOString(),
            size: item.size || 0,
          });
        }
      }
    });

    return Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (err) {
    console.warn('[Storage] Error loading saved lessons:', err);
    return [];
  }
}

/**
 * Groups a flat saved-lesson list into lessons with their digest attached.
 *
 * The library should read as "the lessons you saved", so a digest is never a row of its own next
 * to its lesson — it is a chip on that lesson. A digest whose lesson has since been deleted is
 * returned separately instead of being dropped, because a sheet the tutor filed should never
 * silently vanish.
 */
export interface LessonLibraryEntry {
  lesson: SavedHtmlLessonRecord;
  digest?: SavedHtmlLessonRecord;
}

export interface LessonLibrary {
  entries: LessonLibraryEntry[];
  orphanDigests: SavedHtmlLessonRecord[];
}

export function pairDigestsWithLessons(records: SavedHtmlLessonRecord[]): LessonLibrary {
  const lessons = records.filter((r) => r.kind !== 'digest');
  const digests = records.filter((r) => r.kind === 'digest');

  // Matching is audience-free: a sheet filed from the presenter save still belongs to the learner
  // row of the same lesson, so the tutor never sees an orphan sheet for a lesson they can open.
  const byParent = new Map<string, SavedHtmlLessonRecord>();
  digests.forEach((d) => {
    const key = digestParentKey(d.parentFilename || d.filename);
    if (key && !byParent.has(key)) byParent.set(key, d);
  });

  const attached = new Set<string>();
  const entries = lessons.map((lesson) => {
    const digest = byParent.get(digestParentKey(lesson.filename));
    if (digest) attached.add(digest.filename);
    return { lesson, digest };
  });

  return { entries, orphanDigests: digests.filter((d) => !attached.has(d.filename)) };
}

/**
 * Deletes a saved file and anything derived from it, from both stores.
 *
 * A digest is part of its lesson, so deleting the lesson deletes the sheet too — otherwise the
 * library would accumulate orphans that claim to belong to a lesson nobody can find.
 */
export async function deleteSavedLesson(filename: string): Promise<void> {
  const derived = digestFileNameFor(filename);
  const parentKey = digestParentKey(filename);
  const isDerived = (entry: { filename?: string; parentFilename?: string } | null | undefined) =>
    entry?.filename === derived || digestParentKey(entry?.parentFilename || '') === parentKey;

  try {
    const localFiles: any[] = JSON.parse(localStorage.getItem(UPLOAD_FALLBACK_KEY) || '[]');
    const kept = localFiles.filter(
      (f: any) => f.filename !== filename && f.path !== filename && !isDerived(f),
    );
    localStorage.setItem(UPLOAD_FALLBACK_KEY, JSON.stringify(kept));
  } catch (err) {
    console.warn('[Storage] LocalStorage delete skipped:', err);
  }

  try {
    const list: SavedHtmlLessonRecord[] = (await idb.get(SAVED_LESSONS_IDB_KEY)) || [];
    await idb.set(
      SAVED_LESSONS_IDB_KEY,
      list.filter((r) => r.filename !== filename && !isDerived(r)),
    );
  } catch (err) {
    console.warn('[Storage] IndexedDB delete skipped:', err);
  }
}

/**
 * Universal save and download coordinator:
 * 1. Files the lesson into the local library (IndexedDB & LocalStorage) — only when the
 *    caller passes `toLibrary`, i.e. the action really was "Save to Library".
 * 2. Attempts backend API save (/api/save_file & /api/content).
 * 3. Triggers universal client-side file download.
 */
export async function saveAndExportHtmlLesson(options: SaveLessonOptions): Promise<{ success: boolean; url?: string }> {
  const {
    htmlContent,
    fileName,
    learnerName = 'Learner',
    tutorName = 'Tutor',
    type = 'Interactive Lesson',
    title = fileName,
    triggerDownload = true,
    alsoZip = false,
    extraFiles = [],
    toLibrary = false,
    digestHtml = '',
  } = options;

  const recordId = `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let finalUrl = '';

  // 1. Immediate local persistence in PWA
  const localRecord: SavedHtmlLessonRecord = {
    id: recordId,
    tutor: tutorName,
    learner: learnerName,
    filename: fileName,
    type: type,
    title: title,
    path: `/Learners/${learnerName.replace(/\s+/g, '_')}/${fileName}`,
    url: `/Learners/${learnerName.replace(/\s+/g, '_')}/${fileName}`,
    htmlContent: htmlContent,
    timestamp: new Date().toISOString(),
    size: htmlContent.length,
  };

  if (toLibrary) {
    await persistLessonToLocalStore(localRecord);
  }

  const hasDigest = Boolean(digestHtml && digestHtml.trim());

  // The sheet travels with its lesson, never on its own: filed next to the lesson's library row
  // when the lesson is filed, bundled into the ZIP when one is made, or downloaded beside the
  // lesson file. A digest with no lesson to belong to is exactly the clutter `toLibrary` guards
  // against, so a download never leaves a stray library row behind.
  if (hasDigest && toLibrary) {
    await persistLessonDigestToLocalStore({
      lessonFilename: fileName,
      digestHtml,
      learnerName: learnerName,
      tutorName: tutorName,
      title: `${title} — One-Page Digest`,
    });
  }

  // 2. Try Node Backend API
  try {
    const saveRes = await fetch('/api/save_file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutorName: tutorName,
        learnerName: learnerName,
        lessonStructure: type,
        fileName: fileName,
        htmlContent: htmlContent,
      }),
    });

    if (saveRes.ok) {
      const data = await saveRes.json();
      if (data.url) finalUrl = data.url;

      // Also register in site_content.json metadata
      try {
        await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            learnerName: learnerName,
            contentId: Date.now().toString(),
            type: type,
            title: title,
            html: data.url || `/Learners/${learnerName.replace(/\s+/g, '_')}/${fileName}`,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (metaErr) {}
    }
  } catch (backendErr) {
    console.warn('[Save Helper] Backend /api/save_file unavailable (PWA offline / static host):', backendErr);
  }

  // 3. Trigger Browser Download if requested
  if (triggerDownload) {
    triggerUniversalDownload(htmlContent, fileName);
    // …and the A4 crib sheet right beside it, in the same folder, from the same click.
    if (hasDigest && !alsoZip) {
      triggerUniversalDownload(digestHtml, digestFileNameFor(fileName));
    }
  }

  // 3b. Learner-ready ZIP alongside the plain HTML (Lesson Creator direct-download types).
  // The digest rides in the same package, so "the lesson" always arrives with its crib sheet.
  if (alsoZip) {
    const { downloadZipOfHtml } = await import('./htmlZip');
    const bundleFiles = digestHtml && digestHtml.trim()
      ? [...extraFiles, { name: digestFileNameFor(fileName), data: digestHtml }]
      : extraFiles;
    await downloadZipOfHtml(htmlContent, fileName, bundleFiles);
  }

  return { success: true, url: finalUrl || localRecord.url };
}
