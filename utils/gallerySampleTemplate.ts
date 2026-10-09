// ============================================================
// GALLERY SAMPLE TEMPLATE — type-branded standalone lesson
// Renders {sections, activities} content inside a shell branded
// with the CONTENT TYPE'S OWN name/emoji/color (NOT "Micro
// Lesson"), so every Lesson Gallery tile opens a sample that
// looks like the format it represents.
// ============================================================

export interface SampleSection {
  title: string;
  color?: string;
  studyTime?: string;
  xpReward?: number;
  activities: SampleActivity[];
}

export interface SampleActivity {
  title?: string;
  type: string; // paragraph | multiple_choice | gap_fill | reflection | flashcards | matching | ordering | short_answer | true_false | paragraph_list
  content?: string;
  options?: string[];
  answer?: string;
  pairs?: { a: string; b: string }[];
  items?: string[];
  order?: string[];
  hint?: string;
}

interface RenderOpts {
  name: string;        // e.g. "Test Lab Activity"
  emoji: string;       // e.g. "🧪"
  color: string;       // accent hex
  learnerName?: string;
  subtitle?: string;
}

const esc = (s: unknown): string => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');

// Normalize legacy content: unwrap JSON-stringified {text/blanks}, strip HTML tags.
function norm(s: unknown): string {
  let v = String(s ?? '');
  const t = v.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const j = JSON.parse(t);
      if (j && typeof j === 'object') { v = String(j.text || j.question || j.content || j.prompt || ''); }
    } catch { /* keep as-is */ }
  }
  return v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().replace(/\[([^\]]*)\]/g, '_____');
}

export function renderTypeSample(sections: SampleSection[], opts: RenderOpts): string {
  const acc = opts.color.replace('#', '');
  const sectionsHtml = sections.map((sec, si) => {
    const acts = (sec.activities || []).map((a, ai) => {
      const id = `a${si}_${ai}`;
      const title = a.title ? `<div class="act-title">${esc(a.title)}</div>` : '';
      switch (a.type) {
        case 'paragraph':
          return `<div class="act act-read" data-id="${id}"><div class="act-head">📖 Read${a.hint ? `<span class="hint">${esc(a.hint)}</span>` : ''}</div>${title}<div class="read-body">${esc(norm(a.content))}</div><button class="done" onclick="markDone('${id}')">✓ Mark as read</button></div>`;
        case 'paragraph_list': {
          const lines = Array.isArray(a.content) ? (a.content as unknown as string[]) : norm(a.content).split('\n');
          return `<div class="act act-read" data-id="${id}"><div class="act-head">📚 Read</div>${title}<div class="read-body">${lines.map((l) => `<p>${esc(norm(l))}</p>`).join('')}</div><button class="done" onclick="markDone('${id}')">✓ Mark as read</button></div>`;
        }
        case 'multiple_choice':
          return `<div class="act" data-id="${id}"><div class="act-head">🎯 Multiple choice</div>${title}<p class="q">${esc(norm(a.content))}</p><div class="opts">${(a.options || []).map((o, oi) => `<button class="opt" onclick="pick('${id}',this,'${esc(norm(o))}','${esc(a.answer || '')}')">${esc(norm(o))}</button>`).join('')}</div><div class="fb"></div></div>`;
        case 'true_false':
          return `<div class="act" data-id="${id}"><div class="act-head">⚖️ True / False</div>${title}<p class="q">${esc(norm(a.content))}</p><div class="opts">${['True', 'False'].map((o) => `<button class="opt" onclick="pick('${id}',this,'${o}','${esc(a.answer || '')}')">${o}</button>`).join('')}</div><div class="fb"></div></div>`;
        case 'gap_fill':
          return `<div class="act" data-id="${id}"><div class="act-head">✏️ Fill in the blanks</div>${title}<p class="q">${esc(norm(a.content))}</p>${a.hint ? `<p class="hint">💡 ${esc(norm(a.hint))}</p>` : ''}<div class="gap-row"><input class="gap" id="${id}_in" placeholder="Type the missing word…"><button class="done" onclick="checkGap('${id}','${esc(a.answer || '')}')">Check</button></div><div class="fb"></div></div>`;
        case 'short_answer':
          return `<div class="act" data-id="${id}"><div class="act-head">💬 Your answer</div>${title}<p class="q">${esc(norm(a.content))}</p><textarea class="gap" id="${id}_in" rows="2" placeholder="Write your answer…"></textarea><div class="gap-row"><button class="done" onclick="markDone('${id}')">✓ Save answer</button></div><div class="fb">✅ Saved — your tutor will review it.</div></div>`;
        case 'reflection':
          return `<div class="act" data-id="${id}"><div class="act-head">🤔 Reflect</div>${title}<p class="q">${esc(norm(a.content))}</p><textarea class="gap" id="${id}_in" rows="2" placeholder="Say one sentence…"></textarea><div class="gap-row"><button class="done" onclick="markDone('${id}')">✓ Save reflection</button></div><div class="fb">✅ Reflection saved.</div></div>`;
        case 'flashcards':
          return `<div class="act" data-id="${id}"><div class="act-head">🃏 Flashcards</div>${title}<div class="cards">${(a.pairs || []).map((p, pi) => `<button class="card" onclick="flipCard(this)"><span class="card-f">${esc(p.a)}</span><span class="card-b">${esc(p.b)}</span></button>`).join('')}</div><button class="done" onclick="markDone('${id}')">✓ I reviewed all cards</button></div>`;
        case 'matching':
          return `<div class="act" data-id="${id}"><div class="act-head">🔗 Matching</div>${title}<div class="match">${(a.pairs || []).map((p, pi) => `<div class="match-row"><button class="opt match-a" onclick="markDone('${id}')">${esc(p.a)}</button><button class="opt match-b" onclick="markDone('${id}')">${esc(p.b)}</button></div>`).join('')}</div><div class="fb">Tap each pair to complete.</div></div>`;
        case 'ordering':
          return `<div class="act" data-id="${id}"><div class="act-head">🔢 Order the steps</div>${title}<div class="order">${(a.items || a.order || []).map((it, oi) => `<div class="order-item">${oi + 1}. ${esc(it)}</div>`).join('')}</div><button class="done" onclick="markDone('${id}')">✓ I know the order</button></div>`;
        default:
          return `<div class="act act-read" data-id="${id}"><div class="act-head">📘 ${esc(String(a.type || 'activity').replace(/_/g, ' '))}</div>${title}<div class="read-body">${esc(norm(a.content))}</div><button class="done" onclick="markDone('${id}')">✓ Mark as done</button></div>`;
      }
    }).join('');
    return `<section class="sec" id="sec${si}"><div class="sec-head" style="border-color:#${acc}55"><span class="sec-num" style="background:#${acc}">${si + 1}</span><div><h3>${esc(sec.title)}</h3><span class="sec-meta">⏱ ${esc(sec.studyTime || '10 mins')} · ⚡ ${sec.xpReward ?? 20} XP</span></div></div><div class="acts">${acts}</div></section>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(opts.emoji)} ${esc(opts.name)} — Sample</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;color:#1e293b;min-height:100vh}
.hdr{background:linear-gradient(135deg,#${acc} 0%,#${acc}cc 60%,#0f172a 160%);color:#fff;padding:22px 26px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.hdr .ico{font-size:44px;background:rgba(255,255,255,.16);border-radius:16px;width:70px;height:70px;display:flex;align-items:center;justify-content:center}
.hdr h1{font-size:24px;font-weight:900;letter-spacing:.3px}
.hdr .sub{font-size:12px;opacity:.85;margin-top:2px}
.hdr .right{margin-left:auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.chip{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);padding:6px 12px;border-radius:999px;font-size:12px;font-weight:800}
.wrap{max-width:860px;margin:24px auto;padding:0 16px 60px}
.sec{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:20px;margin-bottom:20px;box-shadow:0 4px 18px rgba(15,23,42,.06)}
.sec-head{display:flex;align-items:center;gap:12px;border-left:4px solid;padding-left:12px;margin-bottom:14px}
.sec-num{width:30px;height:30px;border-radius:9px;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:14px}
.sec-head h3{font-size:17px;font-weight:800}
.sec-meta{font-size:11px;color:#64748b;font-weight:700}
.acts{display:flex;flex-direction:column;gap:12px}
.act{border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#f8fafc}
.act-head{font-size:10px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#${acc};margin-bottom:8px}
.act-title{font-weight:800;font-size:14px;margin-bottom:6px}
.q{font-size:14px;line-height:1.55;margin-bottom:10px}
.read-body{font-size:13.5px;line-height:1.65;color:#334155;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px;max-height:260px;overflow:auto}
.hint{font-size:11px;color:#64748b;margin:6px 0;font-weight:600}
.opts{display:flex;flex-direction:column;gap:8px}
.opt{text-align:left;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:.15s}
.opt:hover{border-color:#${acc};background:#${acc}0d}
.opt.correct{border-color:#059669;background:#ecfdf5;color:#065f46}
.opt.wrong{border-color:#dc2626;background:#fef2f2;color:#991b1b}
.gap-row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.gap{flex:1;min-width:180px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit}
.done{padding:9px 16px;border:none;border-radius:10px;background:#${acc};color:#fff;font-size:12px;font-weight:800;cursor:pointer;transition:.15s}
.done:hover{filter:brightness(1.1)}
.done.checked{background:#059669}
.fb{font-size:12px;font-weight:700;margin-top:8px;min-height:16px}
.fb.ok{color:#059669}.fb.no{color:#dc2626}
.cards{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.card{width:150px;height:100px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;position:relative;perspective:400px;padding:0}
.card span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;font-size:13px;font-weight:700;border-radius:12px;backface-visibility:hidden;transition:.35s}
.card .card-f{background:#${acc};color:#fff}
.card .card-b{background:#f0fdf4;color:#065f46;transform:rotateY(180deg)}
.card.flipped .card-f{transform:rotateY(180deg)}
.card.flipped .card-b{transform:rotateY(0)}
.match{display:flex;flex-direction:column;gap:8px}
.match-row{display:flex;gap:8px}
.match-a,.match-b{flex:1}
.order{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.order-item{padding:9px 12px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;font-size:13px;font-weight:600}
.xpbar{position:fixed;bottom:16px;right:16px;background:#0f172a;color:#fff;padding:10px 16px;border-radius:999px;font-size:12px;font-weight:800;box-shadow:0 8px 24px rgba(15,23,42,.3);z-index:50}
@media print{.hdr{position:static}.xpbar{display:none}.act{break-inside:avoid}}
@media (max-width:640px){.hdr .right{width:100%}.wrap{padding:0 10px 80px}}
</style></head><body>
<div class="hdr"><div class="ico">${esc(opts.emoji)}</div><div><h1>${esc(opts.name)}</h1><div class="sub">${esc(opts.subtitle || 'Interactive sample with mock data — every activity type included')}</div></div>
<div class="right"><span class="chip">🧑 ${esc(opts.learnerName || 'Learner')}</span><span class="chip">⚡ 0 XP</span><span class="chip">🔥 0 streak</span><button class="done" onclick="window.print()">🖨 Print</button></div></div>
<div class="wrap">${sectionsHtml}</div>
<div class="xpbar">⚡ <span id="xp">0</span> XP · <span id="done">0</span>/${sections.reduce((n, s) => n + (s.activities || []).length, 0)} done</div>
<script>
var xp=0,done=0,total=${sections.reduce((n, s) => n + (s.activities || []).length, 0)};
function markDone(id){var el=document.querySelector('.act[data-id="'+id+'"] .done');if(el&&!el.classList.contains('checked')){el.classList.add('checked');el.textContent='✓ Completed';done++;xp+=10;tick();}}
function tick(){document.getElementById('xp').textContent=xp;document.getElementById('done').textContent=done;}
function pick(id,btn,val,ans){var act=document.querySelector('.act[data-id="'+id+'"]');var fb=act.querySelector('.fb');if(act.dataset.done){return;}var ok=String(val||'').trim().toLowerCase()===String(ans||'').trim().toLowerCase();btn.classList.add(ok?'correct':'wrong');if(ok){act.dataset.done='1';fb.textContent='✅ Correct! +10 XP';fb.className='fb ok';markDone(id);}else{fb.textContent='❌ Not quite — try again.';fb.className='fb no';}}
function checkGap(id,ans){var inp=document.getElementById(id+'_in');var act=document.querySelector('.act[data-id="'+id+'"]');var fb=act.querySelector('.fb');if(act.dataset.done){return;}var ok=inp.value.trim().toLowerCase()===String(ans||'').trim().toLowerCase();if(ok){act.dataset.done='1';fb.textContent='✅ Correct! +10 XP';fb.className='fb ok';inp.style.borderColor='#059669';markDone(id);}else{fb.textContent='❌ Try again — hint: "'+String(ans||'').replace(/_/g,' ? ')+'"';fb.className='fb no';}}
function flipCard(c){c.classList.toggle('flipped');}
</script>
</body></html>`;
}