import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useNarration } from '../context/NarrationContext';
import { THEME_CONFIG, generateId } from '../utils/helpers';
import { ALL_ROLES } from '../data/roles';
import { playChime } from '../utils/audio';

// Stock photo URLs for battle scenes (pre-selected dark/dramatic)
const SCENE_PHOTOS = [
  'https://images.pexels.com/photos/35171253/pexels-photo-35171253.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/32452311/pexels-photo-32452311.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/11839889/pexels-photo-11839889.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/13396066/pexels-photo-13396066.jpeg?auto=compress&cs=tinysrgb&w=800',
];
const getScenePhoto = (i: number) => SCENE_PHOTOS[i % SCENE_PHOTOS.length];

function buildPrompt(state: ReturnType<typeof import('../context/GameContext').useGame>['state'], chNum: number): string {
  const theme = state.theme === 'mafia' ? 'Mafia Syndicate' : 'Werewolf Pack';
  const alive = state.learners.filter(l => l.isAlive);
  const dead = state.learners.filter(l => !l.isAlive);
  const profiles = alive.map(l => {
    const r = ALL_ROLES.find(ro => ro.id === l.currentRoleId);
    return `${l.emoji} "${l.name}" (ID:"${l.id}") | ${r?.emoji} ${r?.name} (${r?.faction}) | Lv${l.weeklyRoleLevel} CEFR:${l.cefrLevel} | XP:${l.careerXp} ATK+${l.bonusAtk} DEF+${l.bonusDef} | Goals:"${l.goals||'-'}" Lesson:"${l.currentLesson||'-'}" Notes:"${l.tutorNotes||'-'}"`;
  }).join('\n');

  return `
COMBAT ARENA — CHAPTER ${chNum}
Theme: ${theme} | Week ${state.weekNumber} | Subject: ${state.tutorProfile.subject}
Previous chapters: ${state.battleHistory.length}
${dead.length > 0 ? `Eliminated: ${dead.map(l => `${l.emoji}${l.name}`).join(', ')}` : ''}

CHARACTERS:
${profiles}

WRITE Chapter ${chNum} as a B1 graded reader (500-700 words).
- Short paragraphs (3-4 sentences).
- Weave dialogue INTO the story (not separate). Characters speak, explain feelings, reference their goals/lessons.
- Describe WHO fights WHO, WHO kills/saves WHO, and the exact outcome.
- End with a cliffhanger.

Return ONLY valid JSON:
{
  "chapter": {
    "number": ${chNum},
    "title": "Chapter ${chNum}: Title",
    "date": "${new Date().toISOString().split('T')[0]}",
    "pages": [
      "Page 1 text: 100-150 words. Short paragraphs with dialogue woven in. Characters speak and explain feelings.",
      "Page 2 text: 100-150 words. More action. Who fights who. Reference lessons and goals.",
      "Page 3 text: 100-150 words. The outcome. Who fell. Emotions.",
      "Page 4 text: 100-150 words. Aftermath and cliffhanger."
    ],
    "events": [
      {"actor":"id","action":"attacked with role ability","target":"id","result":"Target was eliminated / saved / injured","emoji":"⚔️"}
    ],
    "eliminations": [],
    "winner": null,
    "cliffhanger": "What happens next?"
  }
}

Split the story into EXACTLY 4-5 pages (each 100-150 words).
Include dialogue INSIDE the page text with character names.
Events must say WHO killed/saved WHO and the result.
IDs: ${alive.map(l => `"${l.id}"`).join(', ')}
`.trim();
}

export function BattleArena() {
  const { state, dispatch, copyToClipboard } = useGame();
  const { speak } = useNarration();
  const cfg = THEME_CONFIG[state.theme];
  const [json, setJson] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [openCh, setOpenCh] = useState<number | null>(null);
  const [pageIdx, setPageIdx] = useState(0);

  const getName = (id: string) => state.learners.find(l => l.id === id)?.name || id;
  const getEmoji = (id: string) => state.learners.find(l => l.id === id)?.emoji || '❓';
  const nextCh = state.battleHistory.length + 1;

  const chapters = useMemo(() => state.battleHistory.map((r, i) => {
    let p: any = null; try { if (r.story) p = JSON.parse(r.story); } catch {}
    return { record: r, data: p, num: state.battleHistory.length - i };
  }).reverse(), [state.battleHistory]);

  const handleCopy = () => { copyToClipboard(buildPrompt(state, nextCh)); setCopied(true); speak(`Chapter ${nextCh} prompt copied.`); setTimeout(() => setCopied(false), 3000); };

  const handleImport = () => {
    try {
      const raw = JSON.parse(json); const ch = raw.chapter || raw;
      if (!ch.pages?.length && !ch.narrative) throw new Error('No pages/narrative');
      // If no pages array, split narrative into pages
      if (!ch.pages?.length && ch.narrative) { const words = ch.narrative.split(' '); const perPage = Math.ceil(words.length / 4); ch.pages = []; for (let i = 0; i < words.length; i += perPage) ch.pages.push(words.slice(i, i + perPage).join(' ')); }
      const events = (ch.events || []).map((e: any) => ({ timestamp: new Date().toISOString(), actor: e.actor||'', target: e.target, action: e.action||'', result: e.result||'', emoji: e.emoji||'⚔️', xpGained: 20, coinsGained: 10 }));
      dispatch({ type: 'LOG_BATTLE', payload: { id: generateId(), date: new Date().toISOString(), theme: state.theme, events, winner: ch.winner?.learnerId, participants: state.learners.map(l => l.id), story: JSON.stringify({ ...ch, number: ch.number || nextCh }) }});
      events.forEach((e: any) => { if (e.actor) { dispatch({ type: 'GRANT_XP', payload: { learnerId: e.actor, amount: 20 } }); dispatch({ type: 'GRANT_COINS', payload: { learnerId: e.actor, amount: 10 } }); }});
      (ch.eliminations || []).forEach((id: string) => dispatch({ type: 'SET_LEARNER_ALIVE', payload: { learnerId: id, alive: false } }));
      setJson(''); setStatus(`✅ Chapter added!`); setOpenCh(chapters.length); setPageIdx(0); speak(ch.pages?.[0] || 'Chapter added.'); playChime();
    } catch { setStatus('❌ Invalid JSON.'); }
  };

  const exportJson = () => { const b = new Blob([JSON.stringify({ chapters: chapters.map(c => c.data).filter(Boolean) }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `storybook.json`; a.click(); };
  const importBook = (text: string) => { try { const bk = JSON.parse(text); (bk.chapters || []).forEach((ch: any) => dispatch({ type: 'LOG_BATTLE', payload: { id: generateId(), date: ch.date || new Date().toISOString(), theme: state.theme, events: (ch.events||[]).map((e: any) => ({ timestamp: '', actor: e.actor||'', target: e.target, action: e.action||'', result: e.result||'', emoji: '⚔️', xpGained: 0, coinsGained: 0 })), winner: ch.winner?.learnerId, participants: state.learners.map(l => l.id), story: JSON.stringify(ch) }})); speak(`Imported.`); playChime(); } catch { setStatus('❌ Bad file.'); } };

  const exportHtml = () => {
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Battle Chronicle</title><style>*{margin:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#080808;color:#ddd;line-height:1.9}.book{max-width:800px;margin:0 auto}.cover{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;background:linear-gradient(180deg,#100808,#080410)}.cover h1{font-size:2.8em;color:#fbbf24}.cover p{color:#777;font-size:1.2em;margin-top:14px}.ch{padding:40px 30px;border-bottom:1px solid #151515}.ch-head{color:#dc2626;text-transform:uppercase;letter-spacing:.3em;font-size:.75em}.ch h2{color:#fbbf24;font-size:1.5em;margin:6px 0 16px}.pg{font-size:1.08em;line-height:2;margin:20px 0;padding:16px;background:#0a0a0a;border-radius:8px;border-left:3px solid #333}.ev{padding:8px 12px;margin:4px 0;background:#0c0c0c;border-left:3px solid #dc2626;border-radius:0 6px 6px 0;font-size:.95em}.fall{color:#ef4444;padding:10px;margin-top:14px;background:rgba(239,68,68,.05);border:1px solid #7f1d1d;border-radius:6px;text-align:center;font-weight:bold}.cliff{color:#eab308;font-style:italic;margin-top:16px;padding:10px;background:rgba(234,179,8,.03);border:1px solid #92400e;border-radius:6px;text-align:center}.win{text-align:center;padding:40px;margin-top:16px;background:rgba(251,191,36,.05);border-radius:8px}.win h3{color:#fbbf24;font-size:1.4em}.photo{width:100%;height:200px;object-fit:cover;border-radius:8px;margin:12px 0;filter:brightness(0.6)}</style></head><body><div class="book"><div class="cover"><h1>📖 Battle Chronicle</h1><p>${chapters.length} Chapters</p></div>`;
    chapters.forEach((c, ci) => { if (!c.data) return; const d = c.data;
      html += `<div class="ch"><div class="ch-head">Chapter ${d.number||c.num}</div><h2>${d.title||''}</h2>`;
      html += `<img class="photo" src="${getScenePhoto(ci)}" alt="scene">`;
      if (d.pages) d.pages.forEach((pg: string) => html += `<div class="pg">${pg}</div>`);
      else if (d.narrative) html += `<div class="pg">${d.narrative}</div>`;
      if (d.events?.length) d.events.forEach((e: any) => html += `<div class="ev">${e.emoji||'⚔️'} <b>${getName(e.actor)}</b> ${e.action} <b>${getName(e.target||'')}</b> → ${e.result||''}</div>`);
      if (d.eliminations?.length) html += `<div class="fall">💀 Eliminated: ${d.eliminations.map((id: string) => getName(id)).join(', ')}</div>`;
      if (d.cliffhanger) html += `<div class="cliff">⏭️ ${d.cliffhanger}</div>`;
      if (d.winner) html += `<div class="win"><h3>🏆 ${getName(d.winner.learnerId)}</h3><p>${d.winner.narrative||''}</p></div>`;
      html += `</div>`;
    });
    html += `</div></body></html>`;
    const b = new Blob([html], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `storybook.html`; a.click();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28 md:pb-8 relative">
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <img src="./images/battle-bg.jpg" alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.04) saturate(0.3)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,2,2,0.95),rgba(3,1,1,0.98))' }} />
      </div>

      <div><h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider">⚔️ Combat Arena</h2><p className="text-lg text-gray-400">Each battle adds a chapter. Flip through pages.</p></div>

      {/* ═══ STORYBOOK — ALWAYS TOP ═══ */}
      <div className="rounded-3xl overflow-hidden" style={{ border: `2px solid ${cfg.neonColor}15`, background: 'linear-gradient(145deg,rgba(12,8,8,0.98),rgba(16,10,12,0.96))', boxShadow: '0 10px 50px rgba(0,0,0,0.5)' }}>
        <div className="p-5 text-center border-b" style={{ borderColor: `${cfg.neonColor}08`, background: `${cfg.neonColor}03` }}>
          <motion.span className="text-5xl block mb-2" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }}>📖</motion.span>
          <h2 className="text-2xl md:text-3xl font-black text-white">Battle Chronicle</h2>
          <p className="text-base text-gray-400">{chapters.length} chapter{chapters.length !== 1 ? 's' : ''}</p>
          {chapters.length > 0 && (
            <div className="flex justify-center gap-2 mt-3 flex-wrap">
              <button onClick={exportHtml} title="Export HTML with photos" className="px-3 py-1.5 rounded-lg text-xs font-bold border border-yellow-700/30 bg-yellow-900/15 text-yellow-300">📤 HTML</button>
              <button onClick={exportJson} title="Export JSON" className="px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-700/30 bg-blue-900/15 text-blue-300">📄 JSON</button>
            </div>
          )}
        </div>

        {chapters.length === 0 ? (
          <div className="p-8 text-center text-gray-600"><p className="text-lg">No chapters yet.</p></div>
        ) : (
          <>
            {/* Chapter tabs */}
            <div className="flex overflow-x-auto" style={{ background: 'rgba(0,0,0,0.2)' }}>
              {chapters.map((ch, i) => (
                <button key={ch.record.id} onClick={() => { setOpenCh(openCh === i ? null : i); setPageIdx(0); }}
                  className="px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-all"
                  style={{ borderColor: openCh === i ? cfg.neonColor : 'transparent', color: openCh === i ? cfg.neonColor : '#555' }}>
                  Ch.{ch.num}
                </button>
              ))}
            </div>

            {/* Chapter pages with flip */}
            <AnimatePresence mode="wait">
              {openCh !== null && chapters[openCh]?.data && (() => {
                const d = chapters[openCh].data;
                const pages: string[] = d.pages || (d.narrative ? [d.narrative] : []);
                const totalPages = pages.length;
                const isLastPage = pageIdx >= totalPages - 1;

                return (
                  <motion.div key={`${openCh}-${pageIdx}`}
                    initial={{ opacity: 0, rotateY: 50, transformOrigin: 'left center' }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: -50, transformOrigin: 'right center' }}
                    transition={{ duration: 0.45 }}
                    className="p-4 md:p-8" style={{ perspective: '1500px', minHeight: 250 }}>
                    <div className="max-w-3xl mx-auto space-y-4">
                      {/* Chapter + page header */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">Chapter {d.number || chapters[openCh].num} — Page {pageIdx + 1}/{totalPages}</p>
                        {pageIdx === 0 && <h3 className="text-2xl md:text-3xl font-black text-white mt-1">{d.title || 'Untitled'}</h3>}
                        {pageIdx === 0 && d.date && <p className="text-sm text-gray-600 mt-1">📅 {d.date}</p>}
                      </div>

                      {/* Scene photo on first page */}
                      {pageIdx === 0 && (
                        <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                          <img src={getScenePhoto(openCh)} alt="" className="w-full h-40 md:h-56 object-cover" style={{ filter: 'brightness(0.5) saturate(0.7)' }} />
                        </div>
                      )}

                      {/* Page text — the story with dialogue integrated */}
                      <div className="p-5 md:p-6 rounded-xl min-h-[200px]" style={{ background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${cfg.neonColor}20` }}>
                        <div className="text-base md:text-lg text-gray-200 leading-loose space-y-3" style={{ fontFamily: 'Georgia,serif' }}>
                          {(pages[pageIdx] || '').split('\n').filter(Boolean).map((para: string, pi: number) => (
                            <p key={pi}>{para}</p>
                          ))}
                          {/* If single block, still render nicely */}
                          {!(pages[pageIdx] || '').includes('\n') && pages[pageIdx] && (
                            <p>{pages[pageIdx]}</p>
                          )}
                        </div>
                      </div>

                      {/* Events — only on last page (battle results) */}
                      {isLastPage && (d.events || []).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 uppercase tracking-widest">⚔️ Battle Results</p>
                          {d.events.map((ev: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 p-3 rounded-lg text-base" style={{ background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${cfg.neonColor}20` }}>
                              <span className="text-2xl">{getEmoji(ev.actor)}</span>
                              <span className="font-black text-white">{getName(ev.actor)}</span>
                              <span className="text-gray-400 italic">{ev.action}</span>
                              {ev.target && <><span className="text-2xl">{getEmoji(ev.target)}</span><span className="font-black" style={{ color: cfg.neonColor }}>{getName(ev.target)}</span></>}
                              <span className="ml-auto text-sm font-bold" style={{ color: ev.result?.toLowerCase().includes('elimin') || ev.result?.toLowerCase().includes('kill') ? '#ef4444' : ev.result?.toLowerCase().includes('save') ? '#22c55e' : '#999' }}>{ev.result}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {isLastPage && (d.eliminations || []).length > 0 && (
                        <div className="p-4 rounded-xl bg-red-900/10 border border-red-800/25 text-center">
                          <p className="text-base font-bold text-red-400 mb-2">💀 Eliminated This Chapter</p>
                          <div className="flex justify-center gap-3 flex-wrap">{d.eliminations.map((id: string) => <span key={id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/30 text-red-300 text-base font-bold">{getEmoji(id)} {getName(id)}</span>)}</div>
                        </div>
                      )}

                      {isLastPage && d.cliffhanger && <div className="p-4 rounded-xl bg-yellow-900/10 border border-yellow-800/25 text-center"><p className="text-lg text-yellow-300 italic">⏭️ {d.cliffhanger}</p></div>}

                      {isLastPage && d.winner && (
                        <div className="p-6 rounded-xl text-center" style={{ background: 'rgba(251,191,36,0.08)', border: '2px solid rgba(251,191,36,0.2)' }}>
                          <motion.span className="text-6xl block mb-2" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>🏆</motion.span>
                          <h3 className="text-2xl font-black text-white">VICTORY</h3>
                          <p className="text-xl mt-1" style={{ color: cfg.neonColor }}>{getEmoji(d.winner.learnerId)} {getName(d.winner.learnerId)}</p>
                          {d.winner.narrative && <p className="text-base text-gray-300 italic mt-2">"{d.winner.narrative}"</p>}
                        </div>
                      )}

                      {/* Page navigation */}
                      <div className="flex items-center justify-between pt-2">
                        <button onClick={() => { if (pageIdx > 0) setPageIdx(pageIdx - 1); else if (openCh > 0) { setOpenCh(openCh - 1); const prevD = chapters[openCh - 1]?.data; setPageIdx((prevD?.pages?.length || 1) - 1); } }}
                          disabled={pageIdx <= 0 && openCh <= 0}
                          className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-700/50 text-gray-400 disabled:opacity-20 hover:bg-gray-800/30 transition-all">
                          ← Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Ch.{d.number || chapters[openCh].num} · {pageIdx + 1}/{totalPages}
                        </span>
                        <button onClick={() => { if (pageIdx < totalPages - 1) setPageIdx(pageIdx + 1); else if (openCh < chapters.length - 1) { setOpenCh(openCh + 1); setPageIdx(0); } }}
                          disabled={isLastPage && openCh >= chapters.length - 1}
                          className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-700/50 text-gray-400 disabled:opacity-20 hover:bg-gray-800/30 transition-all">
                          Next →
                        </button>
                      </div>

                      <button onClick={() => speak(pages[pageIdx] || '')} title="Read this page aloud"
                        className="w-full py-2 rounded-lg text-sm font-bold border border-blue-700/25 bg-blue-900/10 text-blue-300">🔊 Read Page Aloud</button>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ═══ NEW CHAPTER ═══ */}
      <div className="rounded-2xl border-2 p-5 space-y-3" style={{ borderColor: '#dc262620', background: 'rgba(12,5,5,0.9)' }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">✍️</span>
          <div><h3 className="text-lg font-black text-white">Write Chapter {nextCh}</h3><p className="text-sm text-gray-500">AI generates 4-5 flippable pages per chapter</p></div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCopy}
          title="Copy personalized prompt with learner profiles"
          className="w-full py-3 rounded-xl font-black text-base border-2"
          style={{ borderColor: copied ? '#22c55e' : '#dc2626', color: '#000', background: copied ? '#22c55e' : '#dc2626' }}>
          {copied ? '✅ COPIED!' : `📋 COPY CHAPTER ${nextCh} PROMPT`}
        </motion.button>
        <textarea value={json} onChange={e => setJson(e.target.value)} rows={5} placeholder="Paste AI chapter JSON..."
          className="w-full bg-black/50 border-2 border-gray-700 rounded-xl p-3 text-white text-sm font-mono resize-none" />
        {status && <p className={`text-sm font-bold ${status.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{status}</p>}
        <div className="flex gap-2">
          <button onClick={handleImport} title="Add chapter" className="flex-1 py-2.5 rounded-xl font-bold text-base border-2" style={{ borderColor: '#dc2626', color: '#000', background: '#dc2626' }}>📖 Add Chapter</button>
          <label title="Import storybook JSON" className="py-2.5 px-4 rounded-xl text-sm font-bold border-2 border-gray-700 text-gray-400 cursor-pointer hover:bg-gray-800/50">
            📥 Book
            <input type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => importBook(ev.target?.result as string || ''); r.readAsText(f); }} />
          </label>
        </div>
      </div>
    </div>
  );
}
