import type { GameState } from "./types";
import { sanitizeForCanvas } from "./triggers";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- Full session JSON (includes players) ----
export function exportSessionJSON(s: GameState) {
  download(`${slug(s.meta.title)}-session.json`, JSON.stringify(s, null, 2), "application/json");
}

// ---- Universe-only JSON (excludes player data) ----
export function exportUniverses(s: GameState) {
  const payload = { universes: s.universes, effects: s.effects, soundscapes: s.soundscapes, settings: s.settings };
  download(`${slug(s.meta.title)}-universes.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function importJSON(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return reject(new Error("no file"));
      const r = new FileReader();
      r.onload = () => {
        try {
          resolve(JSON.parse(String(r.result)));
        } catch (e) {
          reject(e);
        }
      };
      r.readAsText(f);
    };
    input.click();
  });
}

// ---- Screenplay (plain text) ----
export function exportScreenplay(s: GameState) {    const out: string[] = [`"${s.meta.title}"`, "A StoryCraft Interactive Saga", "", "=".repeat(50), ""];
  s.chapters.forEach((c, i) => {
    out.push(`CHAPTER ${i + 1}: ${c.title.toUpperCase()}`);
    out.push(`(${new Date(c.timestamp).toLocaleString()})`, "");
    if (c.narratorOpening) out.push(`NARRATOR: ${c.narratorOpening}`, "");
    c.decisions.forEach((d) => {
      const e = s.entities.find((x) => x.id === d.entityId);
      out.push(`${(e?.name ?? "PLAYER").toUpperCase()}`);
      out.push(`    ${d.action}`);
      if (d.reasoning) out.push(`    (reasoning: ${d.reasoning})`);
      out.push("");
    });
    out.push("-".repeat(40), "");
  });
  download(`${slug(s.meta.title)}-screenplay.txt`, out.join("\n"), "text/plain");
}

// ---- Interactive Flipbook (HTML with page-turn) ----
export function exportFlipbook(s: GameState) {
  const pages = s.chapters
    .map((c, i) => {
      const { visible } = sanitizeForCanvas(c.html);
      const lb = c.leaderboardSnapshot
        .map((e) => `<li><b style="color:${e.color}">${e.emoji} ${esc(e.name)}</b> — HP ${e.health}/${e.maxHealth} ★${e.score}${e.dead ? " ☠️" : ""}</li>`)
        .join("");
      const decisions = c.decisions
        .map((d) => {
          const e = s.entities.find((x) => x.id === d.entityId);
          return `<p class="dec"><b>${esc(e?.name ?? "")}:</b> ${esc(d.action)} <i>— ${esc(d.reasoning)}</i></p>`;
        })
        .join("");
      return `<section class="page" data-i="${i}">
        <h2>Chapter ${i + 1}: ${esc(c.title)}</h2>
        <p class="open">📜 ${esc(c.narratorOpening)}</p>
        <div class="scene">${visible}</div>
        <h3>Leaderboard</h3><ul>${lb}</ul>
        <h3>Decisions</h3>${decisions || "<p><i>—</i></p>"}
      </section>`;
    })
    .join("");

  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.meta.title)} — Flipbook</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#0b1020;color:#e2e8f0;font-family:Georgia,serif;display:grid;place-items:center;min-height:100vh}
    #book{width:min(900px,94vw);height:88vh;background:#10162e;border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden;position:relative}
    .page{position:absolute;inset:0;padding:36px 48px;overflow:auto;opacity:0;transform:rotateY(-90deg);transform-origin:left;transition:transform .6s,opacity .4s;backface-visibility:hidden}
    .page.active{opacity:1;transform:rotateY(0)}
    h2{color:#c4b5fd;margin-top:0} h3{color:#fca5a5;border-bottom:1px solid #2a3354;padding-bottom:4px}
    .open{font-style:italic;color:#fde68a} .scene{border:1px solid #2a3354;border-radius:10px;padding:14px;margin:14px 0;max-height:320px;overflow:auto}
    .scene img{max-width:100%} .dec{background:#0b1020;border-radius:8px;padding:8px;margin:6px 0}
    ul{list-style:none;padding:0} li{padding:4px 0;border-bottom:1px dashed #2a3354}
    nav{position:fixed;bottom:18px;display:flex;gap:12px}
    button{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:0;border-radius:10px;padding:10px 18px;font-size:15px;cursor:pointer}
    #pg{align-self:center;color:#94a3b8}
  </style></head><body>
  <div id="book">${pages || '<section class="page active"><h2>No chapters recorded.</h2></section>'}</div>
  <nav><button onclick="turn(-1)">◀ Prev</button><span id="pg"></span><button onclick="turn(1)">Next ▶</button></nav>
  <script>
    var pages=[].slice.call(document.querySelectorAll('.page')),cur=0;
    function show(){pages.forEach(function(p,i){p.classList.toggle('active',i===cur)});document.getElementById('pg').textContent=(cur+1)+' / '+pages.length}
    function turn(d){cur=Math.max(0,Math.min(pages.length-1,cur+d));show()}
    show();document.addEventListener('keydown',function(e){if(e.key==='ArrowRight')turn(1);if(e.key==='ArrowLeft')turn(-1)});
  </script></body></html>`;
  download(`${slug(s.meta.title)}-flipbook.html`, doc, "text/html");
}

// ---- EPUB-ish (single XHTML, opens in readers as html) ----
export function exportEpubLike(s: GameState) {
  const body = s.chapters
    .map((c, i) => {
      const decisions = c.decisions
        .map((d) => {
          const e = s.entities.find((x) => x.id === d.entityId);
          return `<p><strong>${esc(e?.name ?? "")}:</strong> ${esc(d.action)} <em>(${esc(d.reasoning)})</em></p>`;
        })
        .join("");
      return `<h1>Chapter ${i + 1}: ${esc(c.title)}</h1><p><em>${esc(c.narratorOpening)}</em></p>${decisions}`;
    })
    .join("<hr/>");
  const doc = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${esc(s.meta.title)}</title></head>
<body><h1>${esc(s.meta.title)}</h1>${body}</body></html>`;
  download(`${slug(s.meta.title)}.epub.xhtml`, doc, "application/xhtml+xml");
}

// ---- PDF via print window ----
export function exportPDF(s: GameState) {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  const body = s.chapters
    .map((c, i) => {
      const decisions = c.decisions
        .map((d) => {
          const e = s.entities.find((x) => x.id === d.entityId);
          return `<p><b>${esc(e?.name ?? "")}:</b> ${esc(d.action)} <i>(${esc(d.reasoning)})</i></p>`;
        })
        .join("");
      return `<h2>Chapter ${i + 1}: ${esc(c.title)}</h2><p><i>${esc(c.narratorOpening)}</i></p>${decisions}`;
    })
    .join("<hr/>");
  w.document.write(`<html><head><title>${esc(s.meta.title)}</title>
    <style>body{font-family:Georgia,serif;padding:40px;line-height:1.6}h1{color:#4f46e5}h2{color:#7c3aed}</style></head>
    <body><h1>${esc(s.meta.title)}</h1>${body}<script>setTimeout(function(){window.print()},400)</script></body></html>`);
  w.document.close();
}

function slug(t: string) {
  return (t || "session").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function esc(t: string) {
  return (t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
