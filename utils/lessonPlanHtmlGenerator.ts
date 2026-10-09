
import type { LearnerProfile } from '../types';

export const saveLessonPlanAsHtml = (htmlContent: string, learner: LearnerProfile, docTitle: string = "Lesson Plan") => {
    // 1. Clean up markdown code blocks if the AI slipped up
    let cleanedContent = htmlContent
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .trim();

    // 2. Generate the full HTML document
    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${docTitle} - ${learner.name}</title>
    <style>
        

        body {
            background-color: #f3f4f6; /* Light gray background */
            margin: 0;
            padding: 40px 20px;
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            line-height: 1.6;
            -webkit-print-color-adjust: exact;
        }

        .page {
            max-width: 900px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 60px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border-radius: 8px;
        }

        /* Metadata Header */
        .meta-header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 30px;
            margin-bottom: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .meta-title {
            font-family: 'Merriweather', serif;
            font-size: 2.5rem;
            font-weight: 700;
            color: #111827;
            margin: 0 0 10px 0;
            letter-spacing: -0.02em;
        }

        .meta-details {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px 20px;
            font-size: 0.95rem;
            color: #4b5563;
        }

        .meta-label {
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
        }

        /* Content Styling */
        h1, h2, h3, h4 {
            font-family: 'Merriweather', serif;
            color: #111827;
            margin-top: 1.5em;
            margin-bottom: 0.75em;
        }

        h3 {
            font-size: 1.5rem;
            border-left: 4px solid #4f46e5;
            padding-left: 15px;
            margin-top: 40px;
        }

        h4 {
            font-size: 1.2rem;
            font-weight: 700;
            color: #374151;
        }

        p, li {
            margin-bottom: 1em;
            font-size: 1.05rem;
        }

        ul {
            padding-left: 20px;
        }

        li {
            padding-left: 5px;
        }

        b, strong {
            font-weight: 600;
            color: #111827;
        }

        i, em {
            font-family: 'Merriweather', serif;
            font-style: italic;
            color: #4b5563;
        }

        /* Specific container styles requested by prompt */
        div[style*="background"] {
            border: 1px solid #bfdbfe !important; /* Force a nice border */
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .page {
                box-shadow: none;
                padding: 0;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <header class="meta-header">
            <div>
                <h1 class="meta-title">${docTitle}</h1>
                <div style="font-family: 'Merriweather', serif; font-style: italic; color: #6b7280;">Prepared for: ${learner.name}</div>
            </div>
            <div class="meta-details">
                <span class="meta-label">Level</span>
                <span>${learner.cefrLevel}</span>
                
                <span class="meta-label">Target</span>
                <span>${learner.targetLanguage || 'English'}</span>
                
                <span class="meta-label">Date</span>
                <span>${new Date().toLocaleDateString()}</span>
            </div>
        </header>

        <main>
            ${cleanedContent}
        </main>
    </div>
</body>
</html>`;

    // 3. Trigger Download
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = learner.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const safeTitle = docTitle.replace(/\s+/g, '_');
    link.download = `${safeName}_${safeTitle}_${dateStr}.html`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
