/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TeacherFeedback, StudentProfile } from '../types';

// Plain text format
export function exportToText(feedback: TeacherFeedback, student: StudentProfile, dateStr: string): string {
  let content = `TUTORLY LESSON INSIGHT - Session Report\n`;
  content += `=========================================\n`;
  content += `Student: ${student.name} (${student.nationality})\n`;
  content += `Target Language (L2): ${student.l2}\n`;
  content += `Native Language (L1): ${student.l1}\n`;
  content += `Session Date: ${dateStr}\n`;
  content += `=========================================\n\n`;
  
  content += `### GENERAL LESSON TOPIC && FOCUS ###\n`;
  content += `${feedback.generalLessonTopic}\n\n`;
  
  content += `### SUBTOPIC TIMELINE CLUSTERING ###\n`;
  feedback.subtopicClustering.forEach((cluster, idx) => {
    content += `${idx + 1}. [🕒 ${cluster.timestamp}] ${cluster.title} - ${cluster.description}\n`;
  });
  content += `\n`;
  
  content += `### KEY TAKEAWAYS ###\n`;
  content += `Wins:\n`;
  feedback.keyTakeaways.wins.forEach(w => content += `- ${w}\n`);
  content += `\nFuture Goals / Focus:\n`;
  feedback.keyTakeaways.futureFocus.forEach(f => content += `- ${f}\n`);
  content += `\n`;

  content += `### VOCABULARY METRICS ###\n`;
  content += `- Total Est. Words Spoken: ${feedback.vocabulary.totalWords}\n`;
  content += `- New Vocabulary Terms: ${feedback.vocabulary.newWordsCount}\n`;
  content += `- Assessed CEFR Grade: ${feedback.cefrLevel.level}\n`;
  content += `- Level target advice: ${feedback.cefrLevel.targetLevelProjection}\n\n`;
  
  content += `Passive Words (receptive skill):\n`;
  feedback.vocabulary.passiveVocab.forEach(v => content += `- ${v}\n`);
  content += `\nActive Word gains (produced correctly):\n`;
  feedback.vocabulary.activeVocab.forEach(v => content += `- ${v}\n`);
  content += `\n`;

  if (feedback.vocabulary.overusedWords && feedback.vocabulary.overusedWords.length > 0) {
    content += `### OVERUSED STYLISTIC TERMS TRIPPED ###\n`;
    feedback.vocabulary.overusedWords.forEach((item) => {
      content += `- "${item.word}" (Tripped ${item.count} times). Try substituting with: ${item.alternatives.join(", ")}\n`;
    });
    content += `\n`;
  }

  content += `### ACCURACY GRAMMAR REPORT ###\n`;
  feedback.grammarInsights.mistakes.forEach((m, idx) => {
    content += `${idx + 1}. [🕒 ${m.timestamp}] Type: ${m.type.toUpperCase()}\n`;
    content += `   Observed Error: "${m.error}"\n`;
    content += `   Correct Grammar: "${m.correction}"\n`;
    content += `   Pedagogical Rule explanation: "${m.explanation}"\n\n`;
  });
  
  content += `### STYLISTIC FORMALITY SYNONYMS ###\n`;
  feedback.synonymSuggestions.forEach((item, idx) => {
    content += `${idx + 1}. Spoken: "${item.studentSpoke}"\n`;
    content += `   Casual phrasing: "${item.casualVersion}"\n`;
    content += `   Formal register alternative: "${item.formalVersion}"\n`;
    content += `   Note: ${item.note}\n\n`;
  });
  
  content += `### ACOUSTICAL SPEAKING RATIOS && ACCENTS ###\n`;
  content += `- Learner Speaking Share: ${feedback.speakingMetrics.speakingTimeRatio.student}%\n`;
  content += `- Tutor Speaking Share: ${feedback.speakingMetrics.speakingTimeRatio.tutor}%\n`;
  content += `- Conversational Balance score: ${feedback.speakingMetrics.turnTakingFairnessScore}/100\n`;
  content += `- Filler Word Density: ${feedback.speakingMetrics.fillerWordDensity.averageDensity} per minute\n\n`;
  
  content += `### PRONUNCIATION RED FLAGGED WORDS ###\n`;
  feedback.pronunciationFeedback.forEach((p) => {
    content += `- Word: "${p.word}" | Recommended Phonetics: ${p.phoneticGuidance} | [Segment Time: ${p.timestamp}]\n`;
  });
  
  return content;
}

// Generate docx content using simple HTML/XML representation
export function exportToDocx(feedback: TeacherFeedback, student: StudentProfile, dateStr: string): Blob {
  const originalHtml = exportToHtml(feedback, student, dateStr);
  
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><title>Tutorly Lesson Insight Report</title><style>
  body { font-family: 'Calibri', sans-serif; line-height: 1.4; color: #333333; }
  h1 { color: #4F46E5; }
  h2 { border-bottom: 2px solid #4F46E5; padding-bottom: 5px; color: #1E3A8A; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
  th, td { border: 1px solid #D1D5DB; padding: 8px; text-align: left; }
  th { background-color: #F3F4F6; font-weight: bold; }
  </style></head>
  <body>${originalHtml}</body></html>`;
  
  return new Blob([header], { type: 'application/msword' });
}

// Generate mistakes list as CSV
export function exportToCsv(feedback: TeacherFeedback): string {
  let rows = [["Timestamp", "Category", "Incorrect Phrasing Flaw", "Accurate Correct Phrasing", "Teacher Rule Explanation", "Persistence Count"]];
  
  feedback.grammarInsights.mistakes.forEach((m) => {
    rows.push([
      m.timestamp,
      m.type,
      `"${m.error.replace(/"/g, '""')}"`,
      `"${m.correction.replace(/"/g, '""')}"`,
      `"${m.explanation.replace(/"/g, '""')}"`,
      m.persistenceCount.toString()
    ]);
  });
  
  return rows.map(r => r.join(",")).join("\n");
}

// Generate a stunning styled HTML Report with interactive tables and CSS
export function exportToHtml(feedback: TeacherFeedback, student: StudentProfile, dateStr: string): string {
  const subtopicsTimeline = (feedback.subtopicClustering || []).map((c, i) => `
    <div class="relative pl-6 pb-6 last:pb-1">
      <div class="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
      <div class="absolute left-1 top-4 bottom-0 w-0.5 bg-slate-250 last:hidden"></div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-bold text-slate-800">${c.title}</span>
        <span class="text-[9.5px] font-mono font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">🕒 ${c.timestamp}</span>
      </div>
      <p class="text-[11px] text-slate-550 mt-1 leading-relaxed">${c.description}</p>
    </div>
  `).join('');

  const winsList = (feedback.keyTakeaways.wins || []).map(w => `
    <li class="flex items-start gap-2 text-emerald-800">
      <span class="text-emerald-500 font-extrabold select-none">✓</span>
      <span class="text-xs font-medium leading-relaxed">${w}</span>
    </li>
  `).join('');

  const focusList = (feedback.keyTakeaways.futureFocus || []).map(f => `
    <li class="flex items-start gap-2 text-indigo-900/80">
      <span class="text-indigo-400 font-extrabold select-none">→</span>
      <span class="text-xs font-semibold leading-relaxed">${f}</span>
    </li>
  `).join('');

  const passiveVocabHtml = (feedback.vocabulary.passiveVocab || []).map(word => {
    const escaped = word.replace(/'/g, "\\'");
    return `
      <span onclick="speakText('${escaped}')" class="group bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-700 border border-slate-200/60 hover:border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs select-none">
        <span>${word}</span>
        <svg class="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
      </span>
    `;
  }).join('');

  const activeVocabHtml = (feedback.vocabulary.activeVocab || []).map(word => {
    const escaped = word.replace(/'/g, "\\'");
    return `
      <span onclick="speakText('${escaped}')" class="group bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-800 border border-indigo-100/50 hover:border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs select-none">
        <span>${word}</span>
        <svg class="h-3 w-3 text-indigo-400 group-hover:text-indigo-600 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
      </span>
    `;
  }).join('');

  const overusedTermsHtml = (feedback.vocabulary.overusedWords || []).map((o) => {
    const alternatives = (o.alternatives || []).map(alt => {
      const escaped = alt.replace(/'/g, "\\'");
      return `
        <span onclick="speakText('${escaped}')" class="bg-white border border-rose-200 hover:border-rose-350 text-rose-700 text-[10.5px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1">
          <span>${alt}</span>
          <svg class="h-2.5 w-2.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        </span>
      `;
    }).join('');

    const escapedWord = o.word.replace(/'/g, "\\'");
    return `
      <div class="bg-rose-50/50 border border-rose-100 rounded-xl p-4 space-y-2">
        <div class="flex justify-between items-center">
          <span onclick="speakText('${escapedWord}')" class="font-extrabold text-xs text-rose-800 cursor-pointer hover:underline flex items-center gap-1">
            “${o.word}”
            <svg class="h-3 w-3 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          </span>
          <span class="text-[9.5px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold font-mono">Spoken ${o.count}x</span>
        </div>
        <div class="flex flex-wrap gap-1 items-center pt-1.5">
          <span class="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wide mr-1 select-none">Substitute:</span>
          ${alternatives || '<span class="text-[10px] text-slate-350 italic">None logged</span>'}
        </div>
      </div>
    `;
  }).join('');

  const falseFriendsHtml = (feedback.vocabulary.falseFriends || []).map((ff) => {
    const escapedWord = ff.word.replace(/'/g, "\\'");
    return `
      <div class="bg-amber-50/50 border border-amber-100 p-4 rounded-xl space-y-2.5">
        <div class="flex justify-between items-center">
          <span onclick="speakText('${escapedWord}')" class="font-extrabold text-xs text-amber-900 cursor-pointer hover:underline flex items-center gap-1.5">
            ⚠️ “${ff.word}”
            <svg class="h-3.5 w-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          </span>
          <span class="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black font-semibold uppercase font-mono">Cognate Risk</span>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed">${ff.warning}</p>
        <div class="grid grid-cols-2 gap-3 text-[11px] bg-white p-2.5 rounded-lg border border-slate-100">
          <div>
            <span class="text-rose-650 font-bold block mb-0.5 select-none">L1 False Inference:</span>
            <span class="italic font-medium">"${ff.l1Meaning}"</span>
          </div>
          <div>
            <span class="text-emerald-700 font-extrabold block mb-0.5 select-none">Target Meaning:</span>
            <span class="italic font-bold">"${ff.actualMeaning}"</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const wordFamilyHtml = (feedback.vocabulary.wordFamilyExpansion || []).map((wf) => {
    const familyPills = (wf.family || []).map(word => {
      const escaped = word.replace(/'/g, "\\'");
      return `
        <span onclick="speakText('${escaped}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-150 text-[10.5px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 select-none">
          <span>${word}</span>
          <svg class="h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        </span>
      `;
    }).join('');

    const escapedBase = wf.base.replace(/'/g, "\\'");
    return `
      <div class="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2.5">
        <div class="flex items-center justify-between">
          <span onclick="speakText('${escapedBase}')" class="text-xs font-black text-indigo-900 cursor-pointer hover:underline flex items-center gap-1.5">
            🔑 Base root: <strong class="font-bold underline">${wf.base}</strong>
            <svg class="h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          </span>
          <span class="text-[9px] bg-indigo-100 text-indigo-850 px-2 py-0.5 rounded font-black font-mono">Lexical family</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${familyPills}
        </div>
      </div>
    `;
  }).join('');

  const formalitySynonymsHtml = (feedback.synonymSuggestions || []).map((item) => {
    const escapedSpoke = item.studentSpoke.replace(/'/g, "\\'");
    const escapedCasual = item.casualVersion.replace(/'/g, "\\'");
    const escapedFormal = item.formalVersion.replace(/'/g, "\\'");
    return `
      <div class="bg-indigo-50/20 border border-indigo-100/55 p-4 rounded-2xl shadow-xs space-y-3">
        <div class="flex items-center justify-between border-b border-indigo-100/30 pb-2">
          <span onclick="speakText('${escapedSpoke}')" class="text-xs font-bold text-indigo-900 cursor-pointer flex items-center gap-1.5 hover:underline select-none">
            🎛️ Spoken: “${item.studentSpoke}”
            <svg class="h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          </span>
          <span class="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black font-semibold font-mono uppercase">Stylistic turn</span>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div class="text-[9.5px] text-emerald-600 font-extrabold uppercase mb-1 select-none">Informal / Spontaneous</div>
            <span onclick="speakText('${escapedCasual}')" class="font-semibold text-emerald-850 hover:underline cursor-pointer flex items-center gap-1 select-none">
              ${item.casualVersion}
            </span>
          </div>
          <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <div class="text-[9.5px] text-indigo-600 font-extrabold uppercase mb-1 select-none">Formal / Academic</div>
            <span onclick="speakText('${escapedFormal}')" class="font-bold text-indigo-850 hover:underline cursor-pointer flex items-center gap-1 select-none">
              ${item.formalVersion}
            </span>
          </div>
        </div>
        <p class="text-[11px] text-slate-500 leading-relaxed italic border-l-2 border-indigo-200 pl-3">
          <strong>Tutor note:</strong> ${item.note}
        </p>
      </div>
    `;
  }).join('');

  const idiomsHtml = (feedback.advancedVocab?.idiomsPhrasalDashboard?.list || []).map(idItem => {
    const escapedIdiom = idItem.idiom.replace(/'/g, "\\'");
    return `
      <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100 text-xs">
        <td class="px-4 py-3 font-semibold text-slate-800">
          <span onclick="speakText('${escapedIdiom}')" class="hover:underline cursor-pointer flex items-center gap-1.5 font-bold text-indigo-950">
            “${idItem.idiom}”
            <svg class="h-3.5 w-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          </span>
        </td>
        <td class="px-4 py-3 italic text-slate-600">${idItem.definition}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded-full uppercase text-[9px] font-black tracking-wide border ${
            idItem.status === 'correct' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : idItem.status === 'attempted' 
              ? 'bg-amber-50 border-amber-100 text-amber-700' 
              : 'bg-indigo-50 border-indigo-150 text-indigo-700'
          }">${idItem.status}</span>
        </td>
      </tr>
    `;
  }).join('');

  const grammarMistakesHtml = (feedback.grammarInsights.mistakes || []).map((m) => {
    const escapedError = m.error.replace(/'/g, "\\'");
    const escapedCorrection = m.correction.replace(/'/g, "\\'");
    return `
      <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100 text-xs">
        <td class="px-4 py-3.5 font-bold font-mono text-slate-400 select-none">${m.timestamp}</td>
        <td class="px-4 py-3.5">
          <span class="px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full border border-rose-100 bg-rose-50 text-rose-700">${m.type}</span>
        </td>
        <td class="px-4 py-3.5">
          <div onclick="speakText('${escapedError}')" class="text-rose-600 line-through font-medium leading-relaxed cursor-pointer hover:underline flex items-center gap-1">
            “${m.error}”
            <svg class="h-3 w-3 text-rose-450 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          </div>
        </td>
        <td class="px-4 py-3.5">
          <div onclick="speakText('${escapedCorrection}')" class="text-emerald-700 font-extrabold leading-relaxed cursor-pointer hover:underline flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg w-fit">
            “${m.correction}”
            <svg class="h-3 w-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          </div>
        </td>
        <td class="px-4 py-3.5 text-slate-650 leading-relaxed italic font-medium">${m.explanation}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-1.5 select-none">
            <span class="text-[10px] font-black ${m.persistenceCount > 1 ? 'text-amber-600' : 'text-slate-400'} font-mono">${m.persistenceCount}x</span>
            <div class="flex gap-0.5">
              ${Array.from({ length: 3 }).map((_, i) => 
                `<div class="w-1.5 h-1.5 rounded-full ${i < m.persistenceCount ? 'bg-amber-500' : 'bg-slate-200'}"></div>`
              ).join('')}
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const ruleBankHtml = (feedback.grammarInsights.ruleBank || []).map((card) => `
    <div class="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
      <div class="flex items-start justify-between">
        <span class="text-xs font-black text-slate-800 uppercase tracking-wider">${card.title}</span>
        <span class="text-[9px] bg-slate-100 text-slate-550 px-2 py-0.5 rounded font-black font-mono select-none">Grammar Rule Index</span>
      </div>
      <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-line">${card.content}</p>
    </div>
  `).join('');

  const positiveReinforcementHtml = (feedback.grammarInsights.positiveReinforcement || []).map((p) => `
    <div class="flex items-start gap-3 bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
      <span class="text-lg p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">⭐</span>
      <div class="space-y-0.5">
        <h5 class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest font-black select-none">Wins & Achievements</h5>
        <p class="text-xs text-slate-650 italic leading-relaxed">“${p}”</p>
      </div>
    </div>
  `).join('');

  const phoneticsHtml = (feedback.pronunciationFeedback || []).map((pf) => {
    const escapedWord = pf.word.replace(/'/g, "\\'");
    return `
      <div class="bg-violet-50/50 border border-violet-100 p-4 rounded-2xl flex flex-col justify-between shadow-xs space-y-2.5">
        <div class="space-y-1.5">
          <div class="flex justify-between items-center">
            <span onclick="speakText('${escapedWord}')" class="font-extrabold text-xs text-violet-900 cursor-pointer hover:underline flex items-center gap-1 select-none">
              🗣️ “${pf.word}”
              <svg class="h-3.5 w-3.5 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            </span>
            <span class="text-[9.5px] bg-violet-100 text-violet-850 px-2 py-0.5 rounded font-black font-mono select-none">🕒 ${pf.timestamp}</span>
          </div>
          <div class="text-[11px] font-mono text-violet-750 bg-white p-2.5 rounded-lg border border-violet-100/50 flex items-center justify-between shadow-xs select-none">
            <span>IPA Target Target:</span>
            <strong class="font-bold underline">${pf.phoneticGuidance}</strong>
          </div>
        </div>
        <div class="border-t border-violet-100/40 pt-2 flex justify-between items-center text-[10px] select-none">
          <span class="text-slate-400">Auditory Track Quality:</span>
          <span class="font-extrabold ${pf.mispronounced ? 'text-amber-600' : 'text-emerald-600'}">
            ${pf.mispronounced ? '⚠️ drilling target' : '✓ accurate pitch'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  const dailyQuizzesHtml = (feedback.connectedFeatures?.dailyExercises || []).map((ex, idx) => {
    const optionsButtonsHtml = (ex.options || []).map(opt => {
      const escapedOpt = opt.replace(/'/g, "\\'");
      const escapedCorrect = ex.correctAnswer.replace(/'/g, "\\'");
      return `
        <button 
          onclick="checkOption(${idx}, '${escapedOpt}', '${escapedCorrect}', ${idx})" 
          data-value="${opt}" 
          class="option-btn w-full text-left p-3.5 text-xs bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all font-semibold text-slate-700 flex items-center justify-between"
        >
          <span>${opt}</span>
          <svg class="h-4 w-4 text-indigo-400 opacity-0 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      `;
    }).join('');

    const escapedCorrectValue = ex.correctAnswer.replace(/'/g, "\\'");
    return `
      <div id="quiz-${idx}" class="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <span class="text-[10px] font-black text-indigo-650 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md select-none">Day ${ex.day} Challenge</span>
          <span class="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black font-mono uppercase select-none">${ex.type}</span>
        </div>
        
        <p class="text-xs font-bold leading-relaxed text-slate-800">
          Q: ${ex.question}
        </p>
        
        ${ex.type === 'multiple-choice' || ex.type === 'drag-drop' ? `
          <div class="grid grid-cols-1 gap-2.5 pt-1">
            ${optionsButtonsHtml}
          </div>
        ` : `
          <div class="space-y-3 pt-1">
            <div class="flex items-center gap-2">
              <input 
                type="text" 
                id="blank-input-${idx}"
                placeholder="Type accurate spelling here..." 
                class="flex-1 text-xs p-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 font-semibold"
              />
              <button 
                onclick="checkBlank(${idx}, '${escapedCorrectValue}', ${idx})"
                class="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                Validate
              </button>
            </div>
            <div id="blank-result-${idx}"></div>
          </div>
        `}

        <div id="explanation-${idx}" class="hidden p-4 bg-emerald-50 border border-emerald-150 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-300">
          <div class="text-emerald-700 font-extrabold text-[9.5px] uppercase tracking-wider select-none">Tutor Insights</div>
          <p class="text-slate-650 leading-relaxed italic">"${ex.explanation}"</p>
        </div>
      </div>
    `;
  }).join('');

  const scenariosHtml = (feedback.connectedFeatures?.scenarios || []).map((sc, idx) => `
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
      <div class="border-b pb-3 flex items-center justify-between">
        <h4 class="text-xs font-black text-slate-850 uppercase tracking-wider">Unit Objective: ${sc.title}</h4>
        <span class="text-[9px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-black uppercase select-none">Practical Scenario</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <!-- Basic Version -->
        <div class="bg-slate-50/50 p-4 border border-slate-200/60 rounded-xl space-y-3 flex flex-col justify-between">
          <div class="space-y-2">
            <span class="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded uppercase select-none font-mono">Starter Tier (A1-A2)</span>
            <p class="text-xs text-slate-600 leading-relaxed font-semibold">${sc.basic.description}</p>
            <div class="space-y-1.5 pt-2 border-t border-slate-200/40">
              <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Target Tasks:</span>
              <ul class="text-[11px] list-disc pl-4 text-slate-500 space-y-1 leading-relaxed">
                ${(sc.basic.tasks || []).map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- Intermediate Version -->
        <div class="bg-indigo-50/15 p-4 border border-indigo-100 rounded-xl space-y-3 flex flex-col justify-between">
          <div class="space-y-2">
            <span class="text-[9px] bg-indigo-100 text-indigo-750 font-extrabold px-2 py-0.5 rounded uppercase select-none font-mono">Independent (B1-B2)</span>
            <p class="text-xs text-slate-650 leading-relaxed font-semibold">${sc.intermediate.description}</p>
            <div class="space-y-1.5 pt-2 border-t border-indigo-100/40">
              <span class="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wide">Target Tasks:</span>
              <ul class="text-[11px] list-disc pl-4 text-indigo-600/80 space-y-1 leading-relaxed">
                ${(sc.intermediate.tasks || []).map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- Advanced Version -->
        <div class="bg-purple-50/15 p-4 border border-purple-100 rounded-xl space-y-3 flex flex-col justify-between">
          <div class="space-y-2">
            <span class="text-[9px] bg-purple-100 text-purple-750 font-extrabold px-2 py-0.5 rounded uppercase select-none font-mono">Proficient Fluent (C1-C2)</span>
            <p class="text-xs text-slate-650 leading-relaxed font-semibold">${sc.advanced.description}</p>
            <div class="space-y-1.5 pt-2 border-t border-purple-100/40">
              <span class="text-[9px] text-purple-400 font-extrabold uppercase tracking-wide">Target Tasks:</span>
              <ul class="text-[11px] list-disc pl-4 text-purple-600/80 space-y-1 leading-relaxed">
                ${(sc.advanced.tasks || []).map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  const randomSessionId = `LS-${Math.floor(Math.random() * 90000 + 10000)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lesson Feedbacks Report - ${student.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: "Inter", sans-serif;
    }
  </style>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            display: ['Space Grotesk', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          }
        }
      }
    }
  </script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">

  <div class="max-w-5xl mx-auto px-4 py-8 space-y-8">
    
    <!-- Header Card -->
    <header class="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      <!-- Minimalist geometric background accent -->
      <div class="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl"></div>
      
      <div class="relative z-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-1.5">
          <span class="text-[10px] bg-white/20 text-indigo-100 font-extrabold tracking-widest uppercase px-3 py-1 rounded-full font-sans">Official Session Record</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold font-display tracking-tight mt-1">Lesson Feedbacks & Insight Report</h1>
          <p class="text-xs text-indigo-200/80 font-medium leading-relaxed max-w-xl">
            Custom-forged analysis structured directly from what <span class="font-extrabold text-white">${student.tutorName || 'Sarah'}</span> discussed in class. Perfected for vocabulary absorption, accents, and structures.
          </p>
        </div>
        
        <div class="bg-white/10 border border-white/20 backdrop-blur-md p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 min-w-[170px]">
          <span class="text-[9px] text-indigo-200 font-extrabold uppercase tracking-widest font-mono">Session ID</span>
          <span class="text-sm font-black font-mono tracking-wider text-white mt-1">${randomSessionId}</span>
          <span class="text-[10px] text-indigo-100 font-semibold bg-indigo-900/40 border border-indigo-500/20 px-2 py-0.5 rounded mt-2 uppercase tracking-wide">${dateStr}</span>
        </div>
      </div>
    </header>

    <!-- Student Metadata -->
    <section class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
      <div class="space-y-0.5">
        <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Learner</span>
        <span class="text-xs font-bold text-slate-800 block">${student.name}</span>
      </div>
      <div class="space-y-0.5">
        <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Target Language (L2)</span>
        <span class="text-xs font-black text-indigo-650 block">${student.l2}</span>
      </div>
      <div class="space-y-0.5">
        <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">L1 Background</span>
        <span class="text-xs font-bold text-slate-800 block">${student.l1} (${student.nationality})</span>
      </div>
      <div class="space-y-0.5">
        <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Assigned Class Tutor</span>
        <span class="text-xs font-bold text-slate-800 block">${student.tutorName || 'Sarah'}</span>
      </div>
    </section>

    <!-- Global TTS Voice Reader Selector -->
    <div class="bg-indigo-50/40 border border-indigo-150 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
      <div class="space-y-0.5 flex-1">
        <h4 class="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 leading-none">
          🗣️ Auditory Read-Aloud Companion
        </h4>
        <p class="text-[11px] text-slate-500 leading-relaxed pt-1 font-medium">
          Choose a browser speaking voice below. Then, click the speaker icon next to any vocabulary pill, idiom, or corrected grammar formulation to hear it read aloud with native accent.
        </p>
      </div>
      <div class="flex items-center gap-2 max-w-full">
        <select id="voice-select" class="text-xs p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-700 min-w-[200px] shadow-sm cursor-pointer">
          <option value="">Default Web Voice</option>
        </select>
        <button onclick="testSelectedVoice()" class="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0">
          Test Voice
        </button>
      </div>
    </div>

    <!-- Navigation Tab Buttons -->
    <div class="flex flex-wrap border-b border-slate-200 overflow-x-auto gap-1">
      <button id="btn-overview" onclick="switchTab('overview')" class="tab-btn px-4 py-3 font-extrabold text-xs tracking-wide rounded-t-2xl transition-all border-b-2 bg-indigo-600 text-white border-indigo-600 shadow-sm cursor-pointer whitespace-nowrap">
        📋 Overview & Timeline
      </button>
      <button id="btn-vocabulary" onclick="switchTab('vocabulary')" class="tab-btn px-4 py-3 font-extrabold text-xs tracking-wide rounded-t-2xl transition-all border-b-2 bg-white hover:bg-slate-50 text-slate-600 border-transparent cursor-pointer whitespace-nowrap">
        📚 Vocabulary Dashboard
      </button>
      <button id="btn-grammar" onclick="switchTab('grammar')" class="tab-btn px-4 py-3 font-extrabold text-xs tracking-wide rounded-t-2xl transition-all border-b-2 bg-white hover:bg-slate-50 text-slate-600 border-transparent cursor-pointer whitespace-nowrap">
        📝 Grammar & Rules
      </button>
      <button id="btn-pronunciation" onclick="switchTab('pronunciation')" class="tab-btn px-4 py-3 font-extrabold text-xs tracking-wide rounded-t-2xl transition-all border-b-2 bg-white hover:bg-slate-50 text-slate-600 border-transparent cursor-pointer whitespace-nowrap">
        🔊 Pronunciation & Speech
      </button>
      <button id="btn-quizzes" onclick="switchTab('quizzes')" class="tab-btn px-4 py-3 font-extrabold text-xs tracking-wide rounded-t-2xl transition-all border-b-2 bg-white hover:bg-slate-50 text-slate-600 border-transparent cursor-pointer whitespace-nowrap">
        🎓 Self-Study Homeworks
      </button>
    </div>

    <!-- TAB 1: OVERVIEW SCREEN -->
    <div id="screen-overview" class="tab-screen space-y-6">
      
      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
          <span class="text-2xl font-mono text-indigo-650 font-black tracking-tight">
            ${feedback.speakingMetrics.speakingTimeRatio.student || 50}% / ${feedback.speakingMetrics.speakingTimeRatio.tutor || 50}%
          </span>
          <span class="text-[9px] text-slate-400 uppercase font-black tracking-wide block">Speaker Share (Student/Tutor)</span>
        </div>
        <div class="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
          <span class="text-2xl font-mono text-indigo-650 font-black tracking-tight">
            ${feedback.speakingMetrics.turnTakingFairnessScore || 100}%
          </span>
          <span class="text-[9px] text-slate-400 uppercase font-black tracking-wide block">Turn Equity Score</span>
        </div>
        <div class="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
          <span class="text-2xl font-mono text-indigo-650 font-black tracking-tight">
            ${feedback.vocabulary.totalWords || 0}
          </span>
          <span class="text-[9px] text-slate-400 uppercase font-black tracking-wide block">Total Words Uttered</span>
        </div>
        <div class="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
          <span class="text-2xl font-mono text-indigo-650 font-black tracking-tight">
            ${feedback.speakingMetrics.fillerWordDensity.averageDensity || 0}/min
          </span>
          <span class="text-[9px] text-slate-400 uppercase font-black tracking-wide block">Filler Density</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- Subtopic Timeline (3 Columns) -->
        <div class="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="border-b pb-2">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">Class Topic Clustering & Progression</h3>
            <span class="text-[10px] text-indigo-600 font-extrabold block mt-1">Core Focus: "${feedback.generalLessonTopic || 'Advanced Conversation Structure'}"</span>
          </div>
          
          <div class="pt-2">
            ${subtopicsTimeline || '<p class="text-xs text-slate-400 italic">No topic timeline segments available.</p>'}
          </div>
        </div>

        <!-- Speaker Split & Standout Phrases (2 Columns) -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Key Wins & Future focus -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 class="text-xs font-black text-slate-850 uppercase tracking-wider border-b pb-2">Performance Assessment</h4>
            <div class="space-y-4 pt-1">
              <div class="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-1.5">
                <span class="text-[9px] font-black text-emerald-800 tracking-wider block uppercase select-none">Wins & Accomplishments</span>
                <ul class="space-y-1 my-0.5">
                  ${winsList || '<li class="text-xs italic text-emerald-600/70">No target wins logged</li>'}
                </ul>
              </div>

              <div class="bg-indigo-50/20 border border-indigo-150 p-4 rounded-xl space-y-1.5">
                <span class="text-[9px] font-black text-indigo-750 tracking-wider block uppercase select-none">Developmental Focus Targets</span>
                <ul class="space-y-1 my-0.5">
                  ${focusList || '<li class="text-xs italic">No focus categories identified</li>'}
                </ul>
              </div>
            </div>
          </div>

          <!-- Standout sentence -->
          ${feedback.speakingMetrics.standoutSentence ? `
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <div class="flex items-center justify-between border-b pb-2">
                <span class="text-xs font-black text-slate-800 uppercase tracking-widest">Master Sentence in Class</span>
                <span class="px-2 py-0.5 rounded text-[9px] font-bold ${feedback.speakingMetrics.standoutSentence.structurallySound ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  ${feedback.speakingMetrics.standoutSentence.structurallySound ? 'Excellent Syntax' : 'Needs Polish'}
                </span>
              </div>
              <p class="text-xs font-extrabold text-slate-800 leading-relaxed italic">
                “${feedback.speakingMetrics.standoutSentence.sentence}”
              </p>
              <div class="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-[11px] text-slate-550 leading-relaxed">
                <strong>Structural evaluation:</strong> ${feedback.speakingMetrics.standoutSentence.analysis}
              </div>
            </div>
          ` : ''}

        </div>
      </div>

    </div>

    <!-- TAB 2: VOCABULARY SCREEN -->
    <div id="screen-vocabulary" class="tab-screen hidden space-y-6">
      
      <!-- CEFR Placement Gauge -->
      <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <div class="text-center md:border-r border-slate-200 p-2 shrink-0">
          <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block select-none">Spoken CEFR Assessment</span>
          <div class="inline-block mt-1 font-display text-4xl font-extrabold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-150">
            ${feedback.cefrLevel.level || 'B2'}
          </div>
        </div>
        <div class="md:col-span-3 space-y-1.5 p-1">
          <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block select-none">Progress Projection & Scope Guidance</span>
          <p class="text-xs text-slate-650 leading-relaxed font-semibold">
            ${feedback.cefrLevel.targetLevelProjection || 'Showing stable communicative skills. Recommended to incorporate more formal verbs to project to next level.'}
          </p>
          ${feedback.cefrLevel.missingWordsList && feedback.cefrLevel.missingWordsList.length > 0 ? `
            <div class="flex flex-wrap items-center gap-1.5 pt-2">
              <span class="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wide mr-1 select-none">Target Grade Terminology:</span>
              ${feedback.cefrLevel.missingWordsList.map(w => `<span class="bg-slate-100 border text-[10px] font-semibold text-slate-600 px-2 py-0.5 rounded-lg">${w}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Vocab Family, False friends, and Overused Terms -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Passive Vocab & Active Vocab Target -->
        <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
          <div class="space-y-1 border-b pb-2">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Acquired Vocab Diagnostics</h3>
            <p class="text-[10px] text-slate-400 font-medium">Click any word formulation pill to trigger natural accent reading</p>
          </div>
          
          <div class="space-y-4">
            <div class="space-y-2">
              <span class="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wide block select-none">Passive Vocabulary (Receptive Recall Words)</span>
              <div class="flex flex-wrap gap-1.5">
                ${passiveVocabHtml || '<span class="text-xs italic text-slate-400">None logged in this class</span>'}
              </div>
            </div>

            <div class="space-y-2 pt-2 border-t border-slate-200/40">
              <span class="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wide block select-none">Active Target Vocabulary (Correctly Structured)</span>
              <div class="flex flex-wrap gap-1.5">
                ${activeVocabHtml || '<span class="text-xs italic text-slate-400">None logged in this class</span>'}
              </div>
            </div>
          </div>
        </div>

        <!-- Overused Terms Tab -->
        <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="space-y-1 border-b pb-2">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Unnecessary Stylistic Terms Blocked</h3>
            <p class="text-[10px] text-slate-400 font-medium">Repetitions that can be substituted for better clarity</p>
          </div>
          
          <div class="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            ${overusedTermsHtml || '<p class="text-xs text-slate-400 italic">No styling repetitions noted.</p>'}
          </div>
        </div>

      </div>

      <!-- Synonyms and false cognates layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Register Synonym Formations -->
        <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="space-y-1 border-b pb-2">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Register & Formality Improvements</h3>
            <p class="text-[10px] text-slate-400 font-medium">Refining vocabulary selection to match correct settings</p>
          </div>
          
          <div class="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            ${formalitySynonymsHtml || '<p class="text-xs text-slate-400 italic">No formal synonyms suggested.</p>'}
          </div>
        </div>

        <!-- Cognate and Word family -->
        <div class="space-y-6">
          
          <!-- Cognates Warnings -->
          <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div class="space-y-1 border-b pb-2">
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">L1 Interference Warnings</h3>
              <p class="text-[10px] text-slate-400 font-medium">Beware of word shapes that look like native language words but differ</p>
            </div>
            
            <div class="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              ${falseFriendsHtml || '<p class="text-xs text-slate-400 italic">No cognate false warnings logged.</p>'}
            </div>
          </div>

          <!-- Word family expansions -->
          <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div class="space-y-1 border-b pb-2">
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Lexical Family Accumulations</h3>
              <p class="text-[10px] text-slate-400 font-medium">Adding prefixes or suffixes to root structures to enrich vocabulary scale</p>
            </div>
            
            <div class="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              ${wordFamilyHtml || '<p class="text-xs text-slate-400 italic">No lexical root family cards logged in session.</p>'}
            </div>
          </div>

        </div>
      </div>

      <!-- Advanced Idioms Track -->
      ${feedback.advancedVocab?.idiomsPhrasalDashboard?.list && feedback.advancedVocab.idiomsPhrasalDashboard.list.length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <div class="space-y-0.5">
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Idioms & Phrasal Verbs Target Dashboard</h3>
              <p class="text-[10px] text-slate-400 font-medium">Click on any idiom structure to hear correct expression read aloud</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10.5px] bg-slate-100 font-bold px-2.5 py-1 rounded border font-mono">Attempted: ${feedback.advancedVocab.idiomsPhrasalDashboard.attempted || 0}</span>
              <span class="text-[10.5px] bg-emerald-50 text-emerald-800 font-black px-2.5 py-1 rounded border border-emerald-100 font-mono">Correct: ${feedback.advancedVocab.idiomsPhrasalDashboard.usedCorrectly || 0}</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 text-[10px] text-slate-400 uppercase font-black tracking-wider border-b">
                  <th class="px-4 py-3">Idiom Phrase</th>
                  <th class="px-4 py-3">Suggested Meaning</th>
                  <th class="px-4 py-3 w-[120px]">Class Status</th>
                </tr>
              </thead>
              <tbody>
                ${idiomsHtml}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

    </div>

    <!-- TAB 3: GRAMMAR SCREEN -->
    <div id="screen-grammar" class="tab-screen hidden space-y-6">
      
      <!-- Grammar Corrections Section -->
      <div class="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100">
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Detailed Syntactic Grammar Feedback</h3>
          <p class="text-[10px] text-slate-400 font-medium mt-1">Review speech error observations paired with structured rules</p>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 text-[10px] text-slate-400 uppercase font-black border-b tracking-wider">
                <th class="px-4 py-3 w-[80px]">Timestamp</th>
                <th class="px-4 py-3 w-[120px]">Error Type</th>
                <th class="px-4 py-3">Observed Inaccuracy</th>
                <th class="px-4 py-3">Suggested Correct Formulation</th>
                <th class="px-4 py-3">Rule/Explanation</th>
                <th class="px-4 py-3 w-[100px]">Persistence</th>
              </tr>
            </thead>
            <tbody>
              ${grammarMistakesHtml || `
                <tr>
                  <td colspan="6" class="p-12 text-center text-xs text-slate-400 italic">No grammar mistakes recorded in this session. Stellar grammatical fidelity!</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Positive reinforcements and rule indexes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Rule Bank Reference Block -->
        <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="space-y-1 border-b pb-2">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Class Syntax Rules References</h3>
            <p class="text-[10px] text-slate-400 font-medium">Core rule outlines mentioned by your tutor in classroom explanations</p>
          </div>
          
          <div class="space-y-3 max-h-[330px] overflow-y-auto pr-1">
            ${ruleBankHtml || '<p class="text-xs text-slate-400 italic">No specific syntax cards added.</p>'}
          </div>
        </div>

        <!-- Positive Reinforcements -->
        <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="space-y-1 border-b pb-2">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">Tutor Observation & Notes</h3>
            <p class="text-[10px] text-slate-400 font-medium">Class comments highlighting successful milestones and structures</p>
          </div>
          
          <div class="space-y-3 max-h-[330px] overflow-y-auto pr-1">
            ${positiveReinforcementHtml || '<p class="text-xs text-slate-400 italic">No specific achievements highlighted yet.</p>'}
          </div>
        </div>
      </div>

    </div>

    <!-- TAB 4: PRONUNCIATION SCREEN -->
    <div id="screen-pronunciation" class="tab-screen hidden space-y-6">
      
      <!-- Auditory Highlights and Accent Scorecards -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
          <span class="text-2xl font-mono text-indigo-650 font-black tracking-tight">
            ${feedback.speakingMetrics.fillerWordDensity.averageDensity || 0}
          </span>
          <span class="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Filler counts per min</span>
        </div>
        <div class="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
          <span class="text-2xl font-mono text-indigo-650 font-black tracking-tight">
            ${feedback.pronunciationFeedback?.length || 0}
          </span>
          <span class="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Mispronunciations Flagged</span>
        </div>
        <div class="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1 col-span-2 lg:col-span-1">
          <span class="text-2xl font-mono text-indigo-650 font-black tracking-tight">
            ${feedback.vocabulary.totalWords > 0 ? (feedback.vocabulary.newWordsCount / feedback.vocabulary.totalWords * 100).toFixed(1) : '0.0'}%
          </span>
          <span class="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Lexical Richness index</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        <!-- Phonetics list (3 columns) -->
        <div class="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="space-y-1 border-b pb-2">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Phonetics Targets Index</h3>
            <p class="text-[10.5px] text-slate-400 font-medium font-semibold">Click on any phonetics word to hear original native audios</p>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1 pt-1">
            ${phoneticsHtml || '<div class="col-span-2 p-12 text-center text-xs text-slate-400 italic">No phonetics words flagged in class speech. Accent parity accomplished!</div>'}
          </div>
        </div>

        <!-- Filler terms counters (2 columns) -->
        <div class="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="space-y-1 border-b pb-2">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Filler Word Density Inventory</h3>
            <p class="text-[10px] text-slate-400 font-medium">Tracking verbal delays to enhance fluid speaking rhythm</p>
          </div>
          
          <div class="space-y-3">
            <div class="bg-indigo-50/20 border border-indigo-100 rounded-xl p-4 flex justify-between items-center text-xs">
              <span class="font-bold text-indigo-900">Total Filler Words Spoken:</span>
              <span class="text-sm font-black text-indigo-750 font-mono">${(feedback.speakingMetrics.fillerWordDensity.fillerWords || []).reduce((acc, f) => acc + f.count, 0)} times</span>
            </div>

            <div class="space-y-2 pt-2">
              <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block select-none">Observed Filler Words</span>
              <div class="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                ${(feedback.speakingMetrics.fillerWordDensity.fillerWords || []).map(fw => `
                  <div class="flex items-center justify-between text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                    <span class="font-bold text-slate-705 font-mono">“${fw.word}”</span>
                    <span class="text-[10.5px] font-mono text-slate-500 font-bold bg-white px-2 py-0.5 border border-slate-150 rounded">${fw.count} occurrences</span>
                  </div>
                `).join('') || '<p class="text-xs text-slate-405 italic">Zero filler delay sounds detected. Eloquent flow pattern!</p>'}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- TAB 5: SELF STUDY HOMEWORK SCREEN -->
    <div id="screen-quizzes" class="tab-screen hidden space-y-6">
      
      <!-- Informative Instructions Box -->
      <div class="bg-emerald-50/50 border border-emerald-150 rounded-3xl p-5 shadow-xs flex items-start gap-4">
        <span class="text-2xl p-2 bg-emerald-500/10 rounded-xl">✍️</span>
        <div class="space-y-1">
          <h4 class="text-xs font-black text-emerald-900 uppercase tracking-wider leading-none select-none">Interactive Post-Session Study Forge</h4>
          <p class="text-[11px] text-slate-600 leading-relaxed pt-1 leading-relaxed">
            These interactive exercises and dialogue mockups are forged to lock in the syntaxes discussed during today's lesson. Click on your choices to validate correct formulations and read grammar commentaries.
          </p>
        </div>
      </div>

      <!-- Quizzes List -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${dailyQuizzesHtml || '<div class="col-span-2 text-center text-xs text-slate-400 italic p-12">No custom study exercises added for this profile.</div>'}
      </div>

      <!-- Interactive Scenarios Roleplay Explorer -->
      ${feedback.connectedFeatures?.scenarios && feedback.connectedFeatures.scenarios.length > 0 ? `
        <div class="space-y-4 pt-4 border-t border-slate-200">
          <div class="space-y-0.5">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Interactive Conversational Roleplays</h3>
            <p class="text-[10px] text-slate-400 font-medium">Simulate practical situations using targeted CEFR goals</p>
          </div>
          <div class="space-y-4">
            ${scenariosHtml}
          </div>
        </div>
      ` : ''}

    </div>

    <!-- Footer Credit -->
    <footer class="text-center pt-8 border-t border-slate-200/60 text-[10px] text-slate-400 space-y-1">
      <p class="font-semibold select-none">Private Student Report Hub. Strictly for internal study purposes. CC Licenses in effect.</p>
      <p class="font-mono">Export Date: ${dateStr} • Compiled under strict tutor supervision</p>
    </footer>

  </div>

  <script>
    // Tab switching engine
    function switchTab(tabId) {
      // Hide all screens
      document.querySelectorAll('.tab-screen').forEach(function(screen) {
        screen.classList.add('hidden');
      });
      // Show selected screen
      document.getElementById('screen-' + tabId).classList.remove('hidden');

      // Update button classes
      document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.className = "tab-btn px-4 py-3 font-extrabold text-xs tracking-wide rounded-t-2xl transition-all border-b-2 bg-white hover:bg-slate-50 text-slate-600 border-transparent cursor-pointer whitespace-nowrap";
      });

      // Highlight selected button
      const selectedBtn = document.getElementById('btn-' + tabId);
      if (selectedBtn) {
        selectedBtn.className = "tab-btn px-4 py-3 font-extrabold text-xs tracking-wide rounded-t-2xl transition-all border-b-2 bg-indigo-600 text-white border-indigo-600 shadow-sm cursor-pointer whitespace-nowrap";
      }
    }

    // TTS Synthesis Engine
    const synth = window.speechSynthesis;
    const targetL2 = "${student.l2 || 'en-US'}";

    function populateVoices() {
      try {
        if (!synth) return;
        const select = document.getElementById('voice-select');
        if (!select) return;
        select.innerHTML = '';

        const voices = synth.getVoices();
        // filter for voices supporting the L2 target language if possible
        let candidates = voices.filter(v => v.lang.toLowerCase().includes(targetL2.toLowerCase().substring(0, 2)));
        if (candidates.length === 0) candidates = voices;

        candidates.forEach(function(v) {
          const opt = document.createElement('option');
          opt.value = v.name;
          opt.textContent = v.name + ' (' + v.lang + ')';
          select.appendChild(opt);
        });

        // Autoselect a good option
        const autoOpt = candidates.find(v => v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('premium')) || candidates[0];
        if (autoOpt) {
          select.value = autoOpt.name;
        }
      } catch (err) {
        console.warn("Could not list voices:", err);
      }
    }

    if (synth) {
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoices;
      }
      populateVoices();
    }

    function speakText(text) {
      try {
        if (!synth) return;
        synth.cancel(); // Stop current playing audios
        
        const select = document.getElementById('voice-select');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetL2;

        if (select && select.value) {
          const selectedVoice = synth.getVoices().find(v => v.name === select.value);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }
        synth.speak(utterance);
      } catch (err) {
        console.error("Reader synthesis error:", err);
      }
    }

    function testSelectedVoice() {
      speakText("Acoustics test. Ready to practice " + targetL2 + " together!");
    }

    // Exercises interactive checking
    function checkOption(questionId, selectedValue, correctValue, explanationId) {
      const parent = document.getElementById('quiz-' + questionId);
      if (!parent) return;

      const buttons = parent.querySelectorAll('.option-btn');
      buttons.forEach(function(btn) {
        btn.disabled = true; // Block further choices
        const val = btn.getAttribute('data-value');

        if (val === correctValue) {
          btn.className = "option-btn w-full text-left p-3.5 text-xs bg-emerald-50 border border-emerald-400 rounded-xl transition-all font-bold text-emerald-800 flex items-center justify-between";
        } else if (val === selectedValue) {
          btn.className = "option-btn w-full text-left p-3.5 text-xs bg-rose-50 border border-rose-400 rounded-xl transition-all font-bold text-rose-800 flex items-center justify-between";
        } else {
          btn.className = "option-btn w-full text-left p-3.5 text-xs bg-slate-50 border border-slate-100 rounded-xl opacity-60 text-slate-400 flex items-center justify-between";
        }
      });

      // Show explanation
      const explanationDiv = document.getElementById('explanation-' + explanationId);
      if (explanationDiv) {
        explanationDiv.classList.remove('hidden');
      }
    }

    function checkBlank(questionId, correctValue, explanationId) {
      const input = document.getElementById('blank-input-' + questionId);
      const resultDiv = document.getElementById('blank-result-' + questionId);
      const explanationDiv = document.getElementById('explanation-' + explanationId);
      if (!input || !resultDiv) return;

      const val = input.value.trim().toLowerCase();
      const ans = correctValue.trim().toLowerCase();

      input.disabled = true;
      if (val === ans) {
        resultDiv.className = "text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1";
        resultDiv.innerHTML = "✨ Correct formulation!";
      } else {
        resultDiv.className = "text-xs font-bold text-rose-600 mt-2 flex items-center gap-1";
        resultDiv.innerHTML = "❌ Needs polish. Intended target spelling is: <strong class='underline'>" + correctValue + "</strong>";
      }

      if (explanationDiv) {
        explanationDiv.classList.remove('hidden');
      }
    }
  </script>

</body>
</html>
  `;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(text: string, filename: string, mime: string = 'text/plain'): void {
  const blob = new Blob([text], { type: mime });
  downloadBlob(blob, filename);
}
