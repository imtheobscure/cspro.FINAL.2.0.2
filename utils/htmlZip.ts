import JSZip from 'jszip';
import { triggerUniversalDownload } from './htmlLessonSaver';

/** A sidecar file bundled next to the lesson HTML inside the ZIP. */
export interface ZipExtraFile {
    /** Path inside the ZIP, e.g. `media/my-song.mp3`. */
    name: string;
    data: Blob | ArrayBuffer | string;
}

/**
 * Packages a self-contained lesson HTML into a ZIP and triggers its download.
 * Tutors send the .zip to learners (the HTML inside opens on any device) while
 * keeping a plain .html copy for themselves. Fire-and-forget: never throws.
 *
 * When a lesson plays a LOCAL media file (song, video), pass it through
 * `extraFiles` so the ZIP is a complete, self-contained package: the lesson HTML
 * references the media by its relative path and the learner just unzips & opens.
 */
export async function downloadZipOfHtml(
    htmlContent: string,
    htmlFileName: string,
    extraFiles: ZipExtraFile[] = []
): Promise<boolean> {
    try {
        const safeBase = String(htmlFileName || 'lesson')
            .replace(/\.html?$/i, '')
            .replace(/[^a-zA-Z0-9_\-]+/g, '_')
            .slice(0, 120);

        const zip = new JSZip();
        const innerName = safeBase.endsWith('.html') ? safeBase : `${safeBase}.html`;
        zip.file(innerName, htmlContent);

        for (const extra of extraFiles) {
            if (!extra || !extra.name) continue;
            zip.file(extra.name, extra.data);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        triggerUniversalDownload(blob, `${safeBase}.zip`, 'application/zip');
        return true;
    } catch (err) {
        console.error('[htmlZip] Failed to create ZIP for ' + htmlFileName, err);
        return false;
    }
}
