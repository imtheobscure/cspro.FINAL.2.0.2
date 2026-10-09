
import type { PrintableWorksheetOutput, LearnerProfile } from '../types';
import { escapeHtml, convertMarkdownToHtml } from './textFormatters';
import { useAppStore } from '../store/useAppStore';

export const handleSavePrintableWorksheetAsHtml = (
    content: PrintableWorksheetOutput,
    learner: LearnerProfile,
    filename: string,
    returnHtml: boolean = false
) => {
    const sectionsHtml = content.sections.map((section, index) => `
        <div class="worksheet-section">
            <h3 class="section-title"><span class="section-number">${index + 1}</span> ${escapeHtml(section.title)}</h3>
            <p class="section-instruction"><em>${convertMarkdownToHtml(escapeHtml(section.instruction))}</em></p>
            <div class="section-content">${convertMarkdownToHtml(escapeHtml(section.content || '')).replace(/\n/g, '<br>')}</div>
        </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Worksheet: ${escapeHtml(learner.name)}</title>
    <style>
        body { font-family: 'Georgia', serif; line-height: 1.6; max-width: 850px; margin: 0 auto; padding: 40px; color: #333; background: #fff; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .school-name { font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 1.2rem; }
        .worksheet-title { font-size: 2.5rem; margin: 10px 0; }
        .student-info { display: flex; justify-content: space-between; font-style: italic; margin-top: 10px; }
        
        .worksheet-section { margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fafafa; }
        .section-title { margin-top: 0; color: #444; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .section-number { background: #333; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; vertical-align: middle; margin-right: 10px; }
        .section-instruction { color: #666; font-size: 0.95rem; }
        .section-content { margin-top: 15px; }
        
        /* Interactive Input Simulation */
        .section-content input { border: none; border-bottom: 1px solid #333; background: transparent; width: 150px; margin: 0 5px; font-family: inherit; }
        
        .footer { text-align: center; font-size: 0.8rem; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
        
        @media print {
            body { padding: 0; }
            .worksheet-section { page-break-inside: avoid; border: 1px solid #ccc; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="school-name">${useAppStore.getState().appName || 'Tutor Academy'}</div>
        <h1 class="worksheet-title">Official Worksheet</h1>
        <div class="student-info">
            <span>Name: <strong>${escapeHtml(learner.name)}</strong></span>
            <span>Date: ________________</span>
            <span>Level: ${escapeHtml(learner.cefrLevel)}</span>
        </div>
    </div>

    ${sectionsHtml}

    <div class="worksheet-section" style="page-break-before: always;">
        <h3 class="section-title">Answer Key (Teacher Only)</h3>
        <pre style="white-space: pre-wrap; font-family: monospace;">${convertMarkdownToHtml(escapeHtml(content.answerKey))}</pre>
    </div>

    <div class="footer">
        Generated for ${escapeHtml(learner.name)} via Content Crafter.
    </div>
</body>
</html>`;

    if (returnHtml) return html;

    import('./htmlLessonSaver').then(({ saveAndExportHtmlLesson }) => {
        saveAndExportHtmlLesson({
            htmlContent: html,
            fileName: filename,
            learnerName: learner.name,
            type: 'Printable Worksheet',
            title: filename,
            triggerDownload: true
        });
    }).catch(() => {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            try { document.body.removeChild(link); } catch(e) {}
            URL.revokeObjectURL(url);
        }, 1000);
    });
};
