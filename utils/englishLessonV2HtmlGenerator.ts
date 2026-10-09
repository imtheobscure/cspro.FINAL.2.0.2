import { generateEnglishLessonHtml } from '../tutorly-lessons/englishlesson2/src/englishLessonHtmlGenerator';
import { injectMediaHtml } from './lessonMedia';
import type { LearnerProfile } from '../types';
import { getCustomAvatar } from '../services/customAvatarStore';
import { buildLessonFileName, getLessonFilePrefill } from './lessonFileNaming';

export const handleSaveEnglishLessonV2AsHtml = (
    content: any, 
    learner: LearnerProfile, 
    lessonSettings?: any,
    mode: 'presenter' | 'learner' = 'learner',
    lessonLabel = 'Micro Lesson V2',
) => {
    // We assume content already contains the 'sections' and 'settings'.
    // In our manual builder, content is parsed JSON from the AI.
    
    // We need to map it to LessonPayload and GeneratorConfig required by V2.
    const payload = {
        lessonSummary: content.lessonSummary || "",
        settings: content.settings || { lessonName: 'English Lesson' },
        sections: content.sections || []
    };

    const config: any = {
        themeColor: lessonSettings?.themeColor || '#111827',
        gamificationEnabled: true,
        ttsEnabled: true,
        mascotEnabled: true,
        celebrationIntensity: 'full',
        spiralRepetition: true,
        tutorPasscode: 'teacher123',
        studyModeVoice: learner?.readAloudVoice || content?.settings?.readAloudVoice || 'Microsoft',
        hapticEnabled: true,
        deadlineDate: lessonSettings?.nextClassDate || payload.settings.deadlineIso || '',
        role: mode
    };

    let avatarBase64 = '';
    const learnerAvatar = (learner as any).avatar || (learner as any).avatarId || '';
    if (learnerAvatar) {
        if (learnerAvatar.startsWith('custom:')) {
            avatarBase64 = getCustomAvatar(learnerAvatar) || '';
        } else if (learnerAvatar.startsWith('data:image/')) {
            avatarBase64 = learnerAvatar;
        }
    }

    const learnerParam = {
        name: learner.name,
        level: (learner as any).targetLevel || (learner as any).level || '',
        avatar: avatarBase64 || learnerAvatar || '',
        l1: learner.l1Language || '',
        interests: learner.interests || [],
        cefrLevel: learner.cefrLevel || '',
        classmates: learner.classmates || [],
        // The L2 drives the read-aloud voice and the [male1] / [female1] mapping
        // inside the generated lesson, so it has to ride along with the payload.
        targetLanguage: (learner as any).targetLanguage || (learner as any).targetLang || '',
        readAloudVoice: (learner as any).readAloudVoice || ''
    };
    const htmlString = injectMediaHtml(generateEnglishLessonHtml(payload, learnerParam as any, config), lessonSettings);
    
    const filename = buildLessonFileName({
        learnerName: learner.name,
        lessonLabel,
        audience: mode === 'presenter' ? 'Presenter' : 'Learner',
        ...getLessonFilePrefill(learner),
    });

    import('./htmlLessonSaver').then(({ saveAndExportHtmlLesson }) => {
        saveAndExportHtmlLesson({
            htmlContent: htmlString,
            fileName: filename,
            learnerName: learner.name,
            type: lessonLabel,
            title: filename,
            triggerDownload: true
        });
    }).catch(() => {
        const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            try { document.body.removeChild(a); } catch(e) {}
            URL.revokeObjectURL(url);
        }, 1000);
    });
    
    return htmlString;
};

export const generateEnglishLessonV2HtmlString = (
    content: any, 
    learner: LearnerProfile, 
    lessonSettings?: any,
    mode: 'presenter' | 'learner' = 'presenter'
): string => {
    const payload = {
        lessonSummary: content.lessonSummary || "",
        settings: content.settings || { lessonName: 'English Lesson' },
        sections: content.sections || []
    };

    const config: any = {
        themeColor: lessonSettings?.themeColor || '#111827',
        gamificationEnabled: true,
        ttsEnabled: true,
        mascotEnabled: true,
        celebrationIntensity: 'full',
        spiralRepetition: true,
        tutorPasscode: 'teacher123',
        studyModeVoice: learner?.readAloudVoice || content?.settings?.readAloudVoice || 'Microsoft',
        hapticEnabled: true,
        deadlineDate: lessonSettings?.nextClassDate || payload.settings.deadlineIso || '',
        role: mode
    };

    let avatarBase64 = '';
    const learnerAvatar = (learner as any).avatar || (learner as any).avatarId || '';
    if (learnerAvatar) {
        if (learnerAvatar.startsWith('custom:')) {
            avatarBase64 = getCustomAvatar(learnerAvatar) || '';
        } else if (learnerAvatar.startsWith('data:image/')) {
            avatarBase64 = learnerAvatar;
        }
    }

    const learnerParam = {
        name: learner.name,
        level: (learner as any).targetLevel || (learner as any).level || '',
        avatar: avatarBase64 || learnerAvatar || '',
        l1: learner.l1Language || '',
        interests: learner.interests || [],
        cefrLevel: learner.cefrLevel || '',
        classmates: learner.classmates || [],
        // The L2 drives the read-aloud voice and the [male1] / [female1] mapping
        // inside the generated lesson, so it has to ride along with the payload.
        targetLanguage: (learner as any).targetLanguage || (learner as any).targetLang || '',
        readAloudVoice: (learner as any).readAloudVoice || ''
    };
    return generateEnglishLessonHtml(payload, learnerParam as any, config);
};
