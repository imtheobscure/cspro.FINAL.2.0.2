
import { StructuredOutput, Activity, HomeworkOutput } from "../types";

export const escapeHtml = (unsafe: string): string => {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

export const cleanTextForSpeech = (text: string): string => {
    if (!text) return '';
    
    // Pre-formatting: Replace block tags with newlines to preserve structure before stripping
    let preformatted = text
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<h[1-6]>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]*>/g, '');

    let cleanedText = preformatted;
    if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(preformatted, 'text/html');
        cleanedText = doc.body.textContent || preformatted;
    }
    
    // Remove all HTML entities
    cleanedText = cleanedText.replace(/&[a-zA-Z]+;/g, '');
    cleanedText = cleanedText.replace(/&#\d+;/g, '');
    
    // Remove code-like artifacts: { }, [ ], ( ) with content like JSON, template literals
    cleanedText = cleanedText.replace(/\{[^}]*\}/g, '');
    cleanedText = cleanedText.replace(/\[[^\]]*\]/g, '');
    
    // Remove markdown formatting symbols
    cleanedText = cleanedText.replace(/[*_~`#|\\]/g, '');
    
    // Remove symbols that TTS reads aloud (/ → "slash", | → "bar", etc.)
    cleanedText = cleanedText.replace(/[\/–—•·→←↑↓⇒⇔°′″‹›€£¥÷×±¬¦§¶»«"†‡©®™]/g, '');
    
    // Remove standalone < and > that remain after tag stripping
    cleanedText = cleanedText.replace(/[<>]/g, '');
    
    // Add a space after sentence-ending punctuation or commas if it's followed by a letter
    cleanedText = cleanedText.replace(/([.!?])(\w)/g, '$1 $2');
    cleanedText = cleanedText.replace(/,(\w)/g, ', $1');
    
    // Remove emojis and symbols - comprehensive range
    const withoutEmojis = cleanedText
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\u{2000}-\u{2BFF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{E000}-\u{F8FF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/\u00A9|\u00AE|\u2122|\u2600-\u26FF|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF]/g, '');
    
    // Remove extra spaces, punctuation-only lines, and empty lines
    return withoutEmojis
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^[^a-zA-Z0-9]+$/gm, '')
        .replace(/^\s*[\n\r]/gm, '')
        .trim();
};

export const convertMarkdownToHtml = (text: string): string => {
    if (!text) return '';
    
    // Replace double asterisks with bold
    let html = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    // Replace single asterisks with italic (only if not already matched)
    html = html.replace(/(?<!\*)(\*)(?!\*)([^*]+)\1/g, '<i>$2</i>');
    
    // Replace markdown links [text](url) with <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return html;
};


// --- NEW PLATFORM CONTENT FORMATTERS ---

const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

// Fix: Updated type signature to include 'HTML' format
const formatActivityForPlatform = (activity: Activity, format: 'Markdown' | 'PlainText' | 'HTML'): string => {
    let output = '';
    const title = stripHtml(activity.title);

    if (format === 'Markdown') {
        output += `### ${title}\n\n`;
    } else if (format === 'PlainText') {
        output += `${title}\n-----------------\n`;
    } else if (format === 'HTML') {
        output += `<h3>${activity.title}</h3>\n\n`;
    }

    let content = activity.content;
    if (format === 'PlainText') {
        content = stripHtml(content.replace(/<br>/g, '\n'));
    }

    // Handle lists and questions specifically for markdown
    if (format === 'Markdown' && (activity.type === 'list' || activity.type === 'questions')) {
        const items = content.split('\n').filter(item => item.trim());
        const marker = activity.type === 'list' ? '* ' : '1. ';
        output += items.map(item => `${marker}${stripHtml(item)}`).join('\n') + '\n\n';
    } else {
         output += content + '\n\n';
    }
    return output;
};


// Fix: Updated type signature to include 'HTML' format
export const formatLessonForPlatform = (content: StructuredOutput, format: 'Markdown' | 'PlainText' | 'HTML'): string => {
    let output = '';
    content.sections.forEach(section => {
        const title = stripHtml(section.title);
        if (format === 'Markdown') {
            output += `## ${title}\n\n`;
        } else if (format === 'PlainText') {
            output += `== ${title} ==\n\n`;
        } else if (format === 'HTML') {
            output += `<h2>${section.title}</h2>\n\n`;
        }

        section.activities.forEach(activity => {
            output += formatActivityForPlatform(activity, format);
        });
    });
    return output;
};

// Fix: Updated type signature to include 'HTML' format
export const formatHomeworkForPlatform = (content: HomeworkOutput, format: 'Markdown' | 'PlainText' | 'HTML'): string => {
    let output = '';

    const formatSection = (title: string, contentBlock: () => string) => {
        if (format === 'Markdown') {
            output += `## ${title}\n\n`;
        } else if (format === 'PlainText') {
            output += `== ${title} ==\n\n`;
        } else if (format === 'HTML') {
            output += `<h2>${title}</h2>\n\n`;
        }
        output += contentBlock();
    };
    
    // Reading
    formatSection(content.reading.title, () => {
        let readingContent = '';
        content.reading.tasks.forEach(task => {
            if (format === 'Markdown') {
                readingContent += `### ${task.title}\n\n`;
            } else if (format === 'PlainText') {
                readingContent += `${task.title}\n-----------------\n`;
            } else if (format === 'HTML') {
                readingContent += `<h3>${task.title}</h3>\n\n`;
            }
            
            readingContent += (format === 'Markdown' ? stripHtml(task.text) : task.text) + '\n\n**Questions:**\n';
            task.questions.forEach((q, i) => {
                readingContent += `${i + 1}. ${q.question}\n   Answer: ${q.answer}\n`;
            });
            readingContent += '\n';
        });
        return readingContent;
    });

    // Listening
    formatSection(content.listening.title, () => {
        let listeningContent = '';
        const formatListeningTask = (task: any, type: string) => {
            if (format === 'Markdown') {
                listeningContent += `### ${task.title} (${type})\n\n`;
            } else if (format === 'PlainText') {
                listeningContent += `${task.title} (${type})\n-----------------\n`;
            } else if (format === 'HTML') {
                listeningContent += `<h3>${task.title} (${type})</h3>\n\n`;
            }
            
            listeningContent += `**Scenario:** ${task.scenario}\n\n**Script:**\n${task.script}\n\n**Questions:**\n`;
            task.questions.forEach((q: any, i: number) => {
                listeningContent += `${i + 1}. ${q.question}\n   Answer: ${q.answer}\n`;
            });
            listeningContent += '\n';
        };
        formatListeningTask(content.listening.podcast, 'Podcast');
        formatListeningTask(content.listening.conversation, 'Conversation');
        return listeningContent;
    });

    // Other sections
    formatSection(content.speaking.title, () => `**Instruction:** ${content.speaking.instruction}\n**Prompt:** ${content.speaking.prompt}\n**Model Answer:** ${content.speaking.modelAnswer}\n\n`);
    formatSection(content.writing.title, () => `**Instruction:** ${content.writing.instruction}\n**Prompt:** ${content.writing.prompt}\n\n`);
    formatSection(content.grammar.title, () => `**Explanation:** ${content.grammar.explanation}\n\n**Exercises:**\n${content.grammar.exercises}\n\n`);
    formatSection(content.vocabulary.title, () => `**Explanation:** ${content.vocabulary.explanation}\n\n**Exercises:**\n${content.vocabulary.exercises}\n\n`);
    formatSection(content.integratedSkills.title, () => `**Scenario:** ${content.integratedSkills.scenario}\n**Task:** ${content.integratedSkills.task}\n\n`);
    formatSection(content.softSkills.title, () => `**Scenario:** ${content.softSkills.scenario}\n**Task:** ${content.softSkills.task}\n\n`);

    // New Sections
    if (content.dialogue) {
        formatSection(content.dialogue.title, () => `**Context:** ${content.dialogue!.context}\n\n**Script:**\n${content.dialogue!.script}\n\n**Comprehension:**\n${content.dialogue!.comprehensionQuestions.map(q => `- ${q.question} (Ans: ${q.answer})`).join('\n')}\n\n`);
    }
    if (content.fiction) {
        formatSection(content.fiction.title, () => `**Story:**\n${content.fiction!.story}\n\n**Questions:**\n${content.fiction!.questions.map(q => `- ${q.question} (Ans: ${q.answer})`).join('\n')}\n\n**Hypothetical:** ${content.fiction!.hypotheticalQuestion}\n\n`);
    }
    if (content.roleplay) {
        formatSection(content.roleplay.title, () => `**Scenario:** ${content.roleplay!.scenario}\n\n**Option A:** ${content.roleplay!.optionA.description} -> ${content.roleplay!.optionA.outcome}\n\n**Option B:** ${content.roleplay!.optionB.description} -> ${content.roleplay!.optionB.outcome}\n\n**Expert Comment:** ${content.roleplay!.expertComment}\n\n`);
    }
    if (content.practical) {
        formatSection(content.practical.title, () => `**Search Topic:** ${content.practical!.searchTopic}\n**Task:** ${content.practical!.taskInstructions}\n\n`);
    }
    if (content.review) {
        formatSection(content.review.title, () => `**Analysis:** ${content.review!.analysis}\n\n**Questions:**\n${content.review!.questions.map(q => `- ${q.question}`).join('\n')}\n\n`);
    }
    if (content.discussion) {
        formatSection(content.discussion.title, () => `**Intro:** ${content.discussion!.intro}\n\n**Comments:**\n${content.discussion!.comments.map(c => `- ${c.character}: ${c.text}`).join('\n')}\n\n`);
    }

    // Answer Key
    if (format === 'HTML') {
        output += '<h2>Answer Key</h2>\n\n';
    } else {
        output += format === 'Markdown' ? '## Answer Key\n\n' : '== Answer Key ==\n\n';
    }
    output += content.answerKey;

    return output;
};
