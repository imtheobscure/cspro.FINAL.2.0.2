// VERBATIM PORT of the full Smart Writeboard from the reference lesson.
// Includes: rich-text toolbar, Mark Error menu, find/replace, text box, link, image,
// file import (PDF/DOCX/PPTX), tables, templates, banners, pages panel, drawing tools,
// page setup, themes, AI prompt library, writing assessor, thesaurus, context menu,
// live mic transcription, save (PDF/Word/HTML/Text), print view, autosave + restore.
export const getWriteboardFeatures = () => {
  const css = `
#whiteboard-overlay{position:fixed;inset:0;background:#4a5568;z-index:9999;display:none;flex-direction:column;font-family:'Segoe UI',system-ui,sans-serif}
#whiteboard-overlay.theme-dark{--wb-bg:#1a202c;--wb-page:#2d3748;--wb-text:#e2e8f0}
#whiteboard-overlay.theme-sepia{--wb-bg:#5d4e37;--wb-page:#faf8f5;--wb-text:#3d3229}
#whiteboard-overlay.theme-light{--wb-bg:#4a5568;--wb-page:#fff;--wb-text:#1a202c}
.wb-toolbar{background:linear-gradient(180deg,#fff,#f7fafc);border-bottom:1px solid #e2e8f0;padding:6px 12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tb-grp{display:flex;gap:3px;align-items:center;padding:0 8px;border-right:1px solid #e2e8f0}.tb-grp:last-child{border:none}
.tb-sep{width:1px;height:20px;background:#e2e8f0}
.tb-btn{background:#fff;border:1px solid #e2e8f0;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#4a5568;font-size:13px}
.tb-btn:hover{background:#edf2f7}
.tb-btn.active{background:#ebf8ff;border-color:#4299e1;color:#2b6cb0}
.tb-sm{width:26px;height:26px;font-size:11px}
.tb-ok{background:#f0fff4;border-color:#68d391;color:#276749}
.tb-no{background:#fff5f5;border-color:#fc8181;color:#c53030}
.tb-sel{padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#fff}
.sz-wrap{display:flex;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.sz-wrap .tb-btn{border:none;border-radius:0;height:28px}
.sz-inp{width:40px;border:none;text-align:center;font-size:12px}.sz-inp::-webkit-inner-spin-button{-webkit-appearance:none}
.clr-wrap{position:relative}.clr-wrap input[type="color"]{position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:20px;height:6px;opacity:0;cursor:pointer}
.clr-bar{position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:14px;height:3px;border-radius:2px;background:#1a202c}.clr-bar.hl{background:#faf089}
.draw-pnl{background:#f7fafc;border-bottom:1px solid #e2e8f0;padding:8px 12px;display:none;gap:12px;flex-wrap:wrap;align-items:center}
.draw-pnl.show{display:flex}
.dp-sec{display:flex;align-items:center;gap:4px}
.dp-lbl{font-size:11px;color:#718096;font-weight:600}
.dp-btn{background:#fff;border:1px solid #e2e8f0;border-radius:6px;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#4a5568;font-size:12px}
.dp-btn:hover{background:#edf2f7}
.dp-btn.active{background:#ebf8ff;border-color:#4299e1;color:#2b6cb0}
.dp-clr{width:30px;height:30px;border:2px solid #e2e8f0;border-radius:6px;padding:2px;cursor:pointer}
.dp-pre{width:20px;height:20px;border-radius:4px;cursor:pointer;border:2px solid transparent}
.dp-pre:hover{transform:scale(1.15)}
.dp-rng{width:80px}
.dp-act{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px}
.dp-del{color:#e53e3e;border-color:#feb2b2}
.wb-main{display:flex;flex:1;overflow:hidden}
.pg-side{width:140px;background:linear-gradient(180deg,#1a202c,#2d3748);display:flex;flex-direction:column;flex-shrink:0;z-index:100}
.ps-header{padding:12px;border-bottom:1px solid #4a5568}
.ps-title{color:#e2e8f0;font-size:12px;font-weight:600;display:block;margin-bottom:8px}
.ps-nav{display:flex;gap:4px}
.ps-jump{width:50px;padding:6px;border:1px solid #4a5568;border-radius:4px;background:#2d3748;color:#e2e8f0;font-size:12px;text-align:center}
.ps-jump::-webkit-inner-spin-button{-webkit-appearance:none}
.ps-go{background:#4299e1;border:none;border-radius:4px;color:#fff;padding:6px 10px;cursor:pointer}
.ps-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;min-height:0}
.ps-th{background:#fff;border-radius:6px;aspect-ratio:210/297;cursor:pointer;border:3px solid transparent;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.3);overflow:hidden;outline:none;}
.ps-th:hover{transform:scale(1.02)}
.ps-th.active, .ps-th.selected, .ps-th:focus{border-color:#4299e1;box-shadow:0 0 0 2px rgba(66,153,225,0.4)}
.ps-th.landscape{aspect-ratio:297/210}
.ps-th-preview{position:absolute;top:0;left:0;right:0;bottom:0;padding:6px;font-size:7px;line-height:1.25;color:#2d3748;overflow:hidden;word-break:break-word;white-space:pre-wrap;opacity:0.85;pointer-events:none;background:#fff;}
.ps-th-n{position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,.8);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;z-index:2;}
.ps-footer{padding:10px;border-top:1px solid #4a5568;display:flex;align-items:center;gap:6px}
.ps-btn{background:#4299e1;border:none;border-radius:6px;color:#fff;padding:8px 12px;cursor:pointer;font-size:12px;flex:1}
.ps-btn-del{background:#e53e3e}
.ps-info{color:#a0aec0;font-size:11px}
.wb-area{flex:1;overflow:auto;background:var(--wb-bg,#4a5568);position:relative;box-sizing:border-box}
.wb-area.panning, .wb-area.panning * { cursor: grab !important; user-select: none !important; -webkit-user-select: none !important; }
.wb-area.panning.dragging, .wb-area.panning.dragging * { cursor: grabbing !important; }
.zoom-container{position:relative;margin:20px auto;box-sizing:border-box;min-width:fit-content}
.zoom-inner{position:absolute;top:0;left:0;display:flex;flex-direction:column;align-items:center;width:fit-content;padding:20px;box-sizing:border-box;transform-origin:top left}
.pg-wrap{position:relative;margin-bottom:30px;background:var(--wb-page,#fff);box-shadow:0 10px 40px rgba(0,0,0,.2);width:210mm;box-sizing:border-box}
.pg-wrap.landscape{width:297mm}
.pg-wrap.border-simple .wb-pg-container{border:2px solid var(--border-clr,#1e3a5f)}
.pg-wrap.border-double .wb-pg-container{border:4px double var(--border-clr,#1e3a5f)}
.pg-wrap.border-elegant .wb-pg-container{border:3px solid var(--border-clr,#1e3a5f);box-shadow:inset 0 0 0 6px var(--wb-page,#fff),inset 0 0 0 8px var(--border-clr,#1e3a5f)}
.pg-wrap.border-professional .wb-pg-container{border:1px solid var(--border-clr,#1e3a5f);box-shadow:inset 0 0 0 3px var(--wb-page,#fff),inset 0 0 0 4px var(--border-clr,#1e3a5f)}
.wb-hdr{display:none;font-family:'Times New Roman',serif}
.wb-hdr.show{display:block}
.wb-hdr.style-professional{background:linear-gradient(180deg,#f8fafc,#edf2f7);padding:16px 25mm;border-bottom:3px solid #1e3a5f}
.wb-hdr.style-professional .hdr-inner{display:flex;justify-content:space-between;align-items:center}
.wb-hdr.style-professional .hdr-title{font-size:14pt;font-weight:700;color:#1e3a5f}
.wb-hdr.style-professional .hdr-meta{font-size:10pt;color:#4a5568}
.wb-hdr.style-modern{background:linear-gradient(90deg,#1e3a5f,#2c5282);padding:16px 25mm}
.wb-hdr.style-modern .hdr-inner{display:flex;justify-content:space-between;align-items:center}
.wb-hdr.style-modern .hdr-title{font-size:14pt;font-weight:700;color:#fff}
.wb-hdr.style-modern .hdr-meta{color:rgba(255,255,255,.9);font-size:10pt}
.wb-hdr.style-classic{padding:16px 25mm;text-align:center;border-bottom:2px solid #1e3a5f}
.wb-hdr.style-classic .hdr-inner::before{content:'';display:block;height:2px;background:linear-gradient(90deg,transparent,#1e3a5f,transparent);margin-bottom:8px}
.wb-hdr.style-classic .hdr-title{font-size:16pt;font-weight:700;color:#1e3a5f}
.wb-hdr.style-classic .hdr-meta{font-size:10pt;color:#4a5568;margin-top:4px}
.wb-hdr.style-minimal{padding:12px 25mm;border-bottom:1px solid #e2e8f0}
.wb-hdr.style-minimal .hdr-inner{display:flex;justify-content:space-between}
.wb-hdr.style-minimal .hdr-title{font-size:11pt;color:#4a5568}
.wb-hdr.style-minimal .hdr-meta{font-size:10pt;color:#718096}
.wb-pg-container{position:relative}
.wb-pg{width:100%;height:297mm;padding:14mm 16mm;background:var(--wb-page,#fff);outline:none;font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;color:var(--wb-text,#1a202c);box-sizing:border-box;cursor:text;overflow:hidden}
.pg-wrap.landscape .wb-pg{height:210mm}
/* A big paste can leave scrollTop>0 on a contenteditable overflow container, which
   visually cuts off the top of the text. autoPaginate() resets that scroll before
   measuring and after flowing; the guards here keep any residual bar invisible. */
.pg-wrap .wb-pg{scrollbar-width:none}
.pg-wrap .wb-pg::-webkit-scrollbar{display:none}
.wb-pg:focus{box-shadow:inset 0 0 0 2px rgba(66,153,225,.2)}
.wb-pg img{max-width:100%;cursor:nwse-resize;display:inline-block}
.wb-pg img.resizing{outline:2px dashed #4299e1}
.wb-pg table{width:100%;border-collapse:collapse;margin:1em 0}
.wb-pg td,.wb-pg th{border:1px solid #4a5568;padding:10px}
.wb-pg th{background:#f7fafc;font-weight:700}
.wb-pg .tc-del{color:#c53030;text-decoration:line-through;background:#fff5f5;font-weight:700;display:inline}
.wb-pg .tc-ins{color:#276749;background:#f0fff4;font-weight:700;display:inline}
.wb-cv{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10}
.wb-cv.active{pointer-events:auto;cursor:crosshair}
.wb-wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);pointer-events:none;white-space:nowrap;font-family:Arial,sans-serif;font-weight:700;text-transform:uppercase;z-index:5;display:none}
.wb-wm.show{display:block}
.wb-ftr{display:none;padding:12px 25mm;border-top:2px solid #cbd5e0;font-family:'Times New Roman',serif;font-size:10pt;color:#4a5568}
.wb-ftr.show{display:flex;justify-content:space-between}
.wb-stat{background:#1a202c;color:#e2e8f0;padding:8px 16px;display:flex;gap:20px;align-items:center;font-size:11px}
.st-off{color:#a0aec0}.st-on{color:#68d391}
#stSave{color:#68d391}
.zm-wrap{margin-left:auto;display:flex;align-items:center;gap:6px;background:#2d3748;padding:4px 8px;border-radius:6px}
.zm-wrap button{background:#4a5568;border:none;color:#fff;width:24px;height:24px;border-radius:4px;cursor:pointer;font-size:14px}
#zmVal{min-width:45px;text-align:center;font-weight:600}
.mdl{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;z-index:10001}
.mdl.show{display:flex}
.mdl-box{background:#fff;border:1px solid #dfe5ee;border-radius:14px;width:420px;max-width:95vw;max-height:90vh;overflow:hidden;box-shadow:0 24px 64px rgba(15,23,42,.28),0 2px 8px rgba(15,23,42,.08);animation:mdlPop .16s cubic-bezier(0,0,0.2,1)}
@keyframes mdlPop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
.mdl-lg{width:720px}.mdl-sm{width:360px}
.mdl-hd{padding:13px 18px;border-bottom:1px solid #e4eaf2;display:flex;justify-content:space-between;align-items:center;background:#f6f8fb;flex-shrink:0}
.mdl-hd span{font-weight:700;font-size:14px;color:#1e293b;display:flex;align-items:center;gap:9px;letter-spacing:.1px}
.mdl-hd span i{font-size:14px;color:#1d4ed8}
.mdl-hd button{background:#fff;border:1px solid #dfe5ee;width:30px;height:30px;border-radius:7px;font-size:15px;line-height:1;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;transition:background .12s,color .12s}
.mdl-hd button:hover{background:#fee2e2;border-color:#fca5a5;color:#dc2626}
.mdl-bd{padding:18px;overflow-y:auto;max-height:75vh}
.mdl-inp{width:100%;padding:9px 12px;border:1.5px solid #dfe5ee;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;background:#fff;color:#1a202c;transition:border-color .12s,box-shadow .12s}
.mdl-inp:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.12)}
.mdl-inp-sm{width:70px;padding:7px;text-align:center}
.mdl-btn{width:100%;padding:10px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:background .12s;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.mdl-btn:hover{background:#1e40af}
.mdl-btn-lg{margin-top:16px;padding:12px;font-size:14px}
.inp-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.inp-row label{font-size:12.5px;font-weight:600;color:#475569}
.or-div{display:flex;align-items:center;margin:16px 0;color:#a0aec0}
.or-div::before,.or-div::after{content:'';flex:1;height:1px;background:#e2e8f0}
.or-div span{padding:0 12px;font-size:11px;font-weight:700;letter-spacing:.06em}
.setup-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:700px){.setup-grid{grid-template-columns:1fr}}
.setup-col{display:flex;flex-direction:column;gap:14px}
.setup-sec{background:#f8fafc;border-radius:12px;padding:14px;border:1px solid #e4eaf2}
.setup-sec h4{margin:0 0 10px;font-size:12px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:.05em}
.setup-sec h4 i{color:#1d4ed8;font-size:13px}
.orient-btns{display:flex;gap:8px}
.orient-btn{flex:1;padding:11px;border:1.5px solid #dfe5ee;border-radius:10px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#475569;transition:border-color .12s,background .12s}
.orient-btn:hover{border-color:#93c5fd}
.orient-btn.active{border-color:#1d4ed8;background:#eff6ff;color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.10)}
.marg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.marg-item{display:flex;flex-direction:column;gap:3px}
.marg-item label{font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
.clr-row{display:flex;align-items:center;gap:10px;margin-top:8px}
.clr-row label{font-size:12px;color:#475569}
.clr-inp{width:50px;height:34px;padding:2px;border:1.5px solid #dfe5ee;border-radius:7px;cursor:pointer;background:#fff}
.hf-checks{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.hf-check{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:#475569}
.hf-check input{width:15px;height:15px;accent-color:#1d4ed8}
.wm-row{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px}
.wm-row label{min-width:50px;color:#64748b}
.wm-row input[type="range"]{flex:1;accent-color:#1d4ed8}
.tpl-cats{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.tpl-cat{padding:6px 14px;border:1.5px solid #dfe5ee;border-radius:16px;background:#fff;cursor:pointer;font-size:11.5px;font-weight:600;color:#475569;transition:border-color .12s,background .12s,color .12s}
.tpl-cat:hover{border-color:#93c5fd;color:#1e3a8a}
.tpl-cat.active{background:#1d4ed8;color:#fff;border-color:#1d4ed8}
.tpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;max-height:400px;overflow-y:auto}
.tpl-card{background:#fff;border:1.5px solid #dfe5ee;border-radius:12px;padding:14px 8px;text-align:center;cursor:pointer;transition:border-color .12s,box-shadow .12s,transform .12s}
.tpl-card:hover{border-color:#1d4ed8;transform:translateY(-2px);box-shadow:0 8px 20px rgba(29,78,216,.12)}
.tpl-card i{font-size:22px;margin-bottom:6px;display:block;color:#1d4ed8}
.tpl-card span{font-size:10px;color:#475569;font-weight:600}
.save-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sv-btn{padding:18px;border:1.5px solid #dfe5ee;border-radius:12px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;transition:border-color .12s,box-shadow .12s,transform .12s}
.sv-btn:hover{border-color:#93c5fd;transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.08)}
.sv-btn i{font-size:26px}.sv-btn span{font-size:12px;color:#475569;font-weight:600}
.sv-pdf i{color:#dc2626}.sv-doc i{color:#1d4ed8}.sv-html i{color:#ea580c}.sv-txt i{color:#64748b}
.upl-box{border:2px dashed #cbd5e1;border-radius:12px;padding:34px;text-align:center;cursor:pointer;transition:border-color .12s,background .12s}
.upl-box:hover{border-color:#1d4ed8;background:#eff6ff}
.upl-box i{font-size:36px;color:#94a3b8;display:block;margin-bottom:10px}
.upl-box:hover i{color:#1d4ed8}
.upl-box span{color:#64748b;font-size:13px;font-weight:600}
.text-box{background:#f8fafc;border:2px dashed #cbd5e1;border-radius:8px;padding:20px;margin:10px 0;min-height:60px}
.text-box:focus{border-color:#1d4ed8;background:#eff6ff}
@media print{@page{size:A4;margin:0}body.wb-printing > *{display:none!important}body.wb-printing #whiteboard-overlay{display:block!important;position:static!important;background:#fff!important}body.wb-printing .wb-toolbar,body.wb-printing .draw-pnl,body.wb-printing .pg-side,body.wb-printing .wb-stat,body.wb-printing .mdl,body.wb-printing .mic-widget,body.wb-printing .thesaurus-pane,body.wb-printing .lib-panel{display:none!important}body.wb-printing .wb-area{padding:0!important;background:#fff!important;overflow:visible!important}body.wb-printing .zoom-container{transform:none!important;padding:0!important}body.wb-printing .pg-wrap{box-shadow:none!important;margin:0!important;page-break-after:always;page-break-inside:avoid;width:210mm!important}body.wb-printing .pg-wrap:last-child{page-break-after:auto!important}body.wb-printing .pg-wrap.landscape{width:297mm!important}body.wb-printing .wb-hdr.show{display:block!important}body.wb-printing .wb-ftr.show{display:flex!important}body.wb-printing .wb-wm.show{display:block!important}}
body.wb-printing .mic-container{display:none!important}
.mic-container{position:fixed;bottom:96px;right:24px;z-index:10100;display:flex;flex-direction:column;align-items:flex-end;user-select:none}
.mic-circle-btn{width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 8px 24px rgba(0,0,0,0.35),0 2px 8px rgba(59,130,246,0.4);transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);outline:none}
.mic-circle-btn:hover{transform:scale(1.08) translateY(-2px);box-shadow:0 12px 28px rgba(0,0,0,0.45),0 4px 12px rgba(59,130,246,0.5)}
.mic-circle-btn.listening{background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 8px 24px rgba(239,68,68,0.5);animation:micCirclePulse 1.5s infinite}
@keyframes micCirclePulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.6),0 8px 24px rgba(239,68,68,0.5)}50%{box-shadow:0 0 0 12px rgba(239,68,68,0),0 12px 32px rgba(239,68,68,0.8)}}
.mic-circle-badge{position:absolute;top:-2px;right:-2px;background:#475569;color:#fff;font-size:9px;font-weight:800;padding:2px 5px;border-radius:8px;border:2px solid #1e293b;letter-spacing:0.5px}
.mic-circle-btn.listening .mic-circle-badge{background:#22c55e}

/* Mic panel: compact, ribbon-styled dropdown (coherent with the rest of the ribbon) */
.mic-settings-panel{position:fixed;width:340px;max-width:calc(100vw - 16px);background:#fff;border:1px solid #dfe5ee;border-radius:12px;box-shadow:0 16px 40px rgba(15,23,42,.22);display:none;flex-direction:column;overflow:hidden;animation:micPanelIn .16s cubic-bezier(0,0,0.2,1);color:#1e293b;z-index:10101}
.mic-settings-panel.show{display:flex}
@keyframes micPanelIn{from{opacity:0;transform:scale(0.96) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
#whiteboard-overlay.theme-dark .mic-settings-panel{background:#1e293b;border-color:#475569;color:#e2e8f0}
#whiteboard-overlay.theme-sepia .mic-settings-panel{background:#faf8f5;border-color:#d8c8ae;color:#3d3229}
.mic-panel-header{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:#f6f8fb;border-bottom:1px solid #e4eaf2}
#whiteboard-overlay.theme-dark .mic-panel-header{background:#0b1220;border-bottom-color:#334155}
#whiteboard-overlay.theme-sepia .mic-panel-header{background:#f3ede2;border-bottom-color:#e2d5c3}
.mic-panel-title{display:flex;align-items:center;gap:8px;font-weight:800;font-size:12.5px;color:#1e4fbf}
.mic-panel-title i{font-size:14px}
#whiteboard-overlay.theme-dark .mic-panel-title{color:#93c5fd}
#whiteboard-overlay.theme-sepia .mic-panel-title{color:#8a6d1f}
.mic-panel-close{background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center}
.mic-panel-close:hover{background:#e2e8f0;color:#334155}
#whiteboard-overlay.theme-dark .mic-panel-close:hover{background:#334155;color:#fff}
.mic-panel-body{padding:10px 12px;display:flex;flex-direction:column;gap:9px}
.mic-status-card{background:#f6f8fb;border:1px solid #e4eaf2;border-radius:9px;padding:7px 11px;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:38px}
#whiteboard-overlay.theme-dark .mic-status-card{background:#0f172a;border-color:#334155}
#whiteboard-overlay.theme-sepia .mic-status-card{background:#f3ede2;border-color:#e2d5c3}
.mic-status-text{font-size:11px;font-weight:800;color:#1e4fbf;text-transform:uppercase;letter-spacing:.5px}
#whiteboard-overlay.theme-dark .mic-status-text{color:#60a5fa}
.mic-toggle-btn{width:100%;padding:9px;border-radius:8px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:800;font-size:12.5px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all .15s}
.mic-toggle-btn:hover{filter:brightness(1.08)}
.mic-toggle-btn.active{background:linear-gradient(135deg,#ef4444,#dc2626)}
.mic-field-group{display:flex;flex-direction:column;gap:3px}
.mic-label{font-size:10.5px;font-weight:700;color:#64748b;display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.4px}
.mic-select{background:#fff;border:1px solid #dde4ee;color:#1e293b;font-size:12px;border-radius:7px;padding:7px 9px;outline:none;width:100%}
.mic-select:focus{border-color:#93c5fd;box-shadow:0 0 0 2px rgba(147,197,253,.25)}
#whiteboard-overlay.theme-dark .mic-select{background:#0f172a;border-color:#475569;color:#e2e8f0}
#whiteboard-overlay.theme-sepia .mic-select{background:#f3ede2;border-color:#d8c8ae;color:#3d3229}
.mic-opts-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}
@media(max-width:480px){.mic-opts-row{grid-template-columns:1fr}}
.mic-opt-check{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:#475569;cursor:pointer;background:#f6f8fb;border:1px solid #e4eaf2;border-radius:8px;padding:6px 9px}
#whiteboard-overlay.theme-dark .mic-opt-check{background:#0f172a;border-color:#334155;color:#cbd5e1}
#whiteboard-overlay.theme-sepia .mic-opt-check{background:#f3ede2;border-color:#e2d5c3;color:#57493a}
.mic-opt-check input{accent-color:#2563eb;width:13px;height:13px;margin:0;flex-shrink:0}
.mic-indicator{display:none;align-items:flex-end;justify-content:center;gap:3px;height:20px}
.mic-indicator.show{display:flex}
.mic-indicator span{width:4px;background:#2563eb;border-radius:4px;animation:micBar .8s ease-in-out infinite alternate}
.mic-indicator span:nth-child(1){height:8px;animation-delay:0s}
.mic-indicator span:nth-child(2){height:16px;animation-delay:.1s}
.mic-indicator span:nth-child(3){height:20px;animation-delay:.2s}
.mic-indicator span:nth-child(4){height:14px;animation-delay:.3s}
.mic-indicator span:nth-child(5){height:8px;animation-delay:.4s}
@keyframes micBar{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
.mic-preview-box{background:#f6f8fb;border:1px solid #e4eaf2;border-radius:9px;padding:8px 10px;min-height:46px;max-height:84px;overflow-y:auto;font-size:12px;color:#1e293b;font-style:italic;line-height:1.5;word-break:break-word}
#whiteboard-overlay.theme-dark .mic-preview-box{background:#0f172a;border-color:#334155;color:#e2e8f0}
#whiteboard-overlay.theme-sepia .mic-preview-box{background:#f3ede2;border-color:#e2d5c3;color:#3d3229}
.mic-preview-placeholder{color:#8b96a5;font-style:normal;font-size:11px}
.lib-panel{width:0;min-width:0;overflow:hidden;background:#fff;border-left:1px solid #e2e8f0;display:flex;flex-direction:column;transition:width .3s ease,min-width .3s ease;flex-shrink:0;z-index:200}
.lib-panel.open{width:360px;min-width:360px}
.lib-header{padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(90deg,#4299e1,#3182ce);color:#fff;flex-shrink:0}
.lib-header span{font-weight:700;font-size:14px;white-space:nowrap}
.lib-close{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}
.lib-search-row{padding:10px 12px;border-bottom:1px solid #e2e8f0;flex-shrink:0}
.lib-search{width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box}
.lib-search:focus{outline:none;border-color:#4299e1}
.lib-tabs{display:flex;border-bottom:2px solid #e2e8f0;flex-shrink:0}
.lib-tab{flex:1;padding:8px 4px;border:none;background:transparent;font-size:11px;font-weight:600;cursor:pointer;color:#718096;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap}
.lib-tab.active{color:#4299e1;border-bottom-color:#4299e1}
.lib-cards{flex:1;overflow-y:auto;padding:10px}
.lib-card{background:#f7fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px}
.lib-card:hover{border-color:#4299e1;background:#ebf8ff}
.lib-card-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px}
.lib-card-icon{font-size:24px;line-height:1;flex-shrink:0}
.lib-card-title{font-weight:700;font-size:13px;color:#2d3748}
.lib-card-desc{font-size:11px;color:#718096;line-height:1.5}
.lib-card-btns{display:flex;gap:6px;margin-top:8px}
.lib-copy-btn{padding:5px 12px;background:#4299e1;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;flex:1}
.lib-copy-btn:hover{background:#3182ce}
.lib-paste-area{padding:10px 12px;border-top:1px solid #e2e8f0;flex-shrink:0}
.lib-paste-inp{width:100%;height:80px;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;resize:vertical;box-sizing:border-box;font-family:monospace}
.lib-paste-inp:focus{outline:none;border-color:#4299e1}
.lib-paste-btn{width:100%;padding:10px;background:#38a169;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;margin-top:6px}
.lib-paste-btn:hover{background:#276749}
.lib-custom-area{padding:8px 12px;border-top:1px solid #e2e8f0;flex-shrink:0}
.lib-custom-add{width:100%;padding:9px;background:#805ad5;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer}
.mark-err-wrap{position:relative}
.mark-err-main-btn{width:auto;padding:0 10px;font-size:11px;font-weight:700;gap:4px;height:32px;white-space:nowrap}
.mark-err-menu{position:absolute;top:36px;left:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:9999;display:none;min-width:170px;padding:4px}
.mark-err-menu.show{display:block}
.mec-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:#2d3748}
.mec-item:hover{background:#ebf8ff}
.mec-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.err-mark{border-radius:3px;padding:1px 4px;font-weight:700;cursor:help;position:relative;display:inline}
.err-tooltip{position:fixed;background:#1a202c;color:#fff;font-size:11px;padding:5px 10px;border-radius:6px;z-index:99999;pointer-events:none;white-space:nowrap;display:none}
.thesaurus-pane{position:fixed;right:-340px;top:60px;width:320px;height:calc(100vh - 120px);background:#fff;border-left:2px solid #e2e8f0;border-radius:12px 0 0 12px;box-shadow:-4px 0 24px rgba(0,0,0,.15);z-index:10050;display:flex;flex-direction:column;transition:right .3s ease;overflow:hidden}
.thesaurus-pane.open{right:0}
.thes-header{padding:14px 16px;background:linear-gradient(90deg,#805ad5,#6b46c1);color:#fff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.thes-header span{font-weight:700;font-size:14px}
.thes-close{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}
.thes-search-row{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid #e2e8f0;flex-shrink:0}
.thes-search{flex:1;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px}
.thes-search:focus{outline:none;border-color:#805ad5}
.thes-go{background:#805ad5;border:none;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}
.thes-results{flex:1;overflow-y:auto;padding:12px}
.thes-word{font-size:18px;font-weight:800;color:#2d3748;margin-bottom:4px}
.thes-phonetic{font-size:12px;color:#718096;margin-bottom:10px}
.thes-pos{font-size:11px;font-weight:700;color:#805ad5;text-transform:uppercase;margin:8px 0 4px}
.thes-def{font-size:12px;color:#4a5568;margin-bottom:6px;padding-left:8px;border-left:3px solid #e2e8f0}
.thes-syn-title{font-size:11px;font-weight:700;color:#2d3748;margin:8px 0 4px}
.thes-syn-list{display:flex;flex-wrap:wrap;gap:4px}
.thes-syn-chip{background:#f0e6ff;color:#6b46c1;border:1px solid #d6bcfa;border-radius:20px;padding:3px 10px;font-size:11px;cursor:pointer;font-weight:600}
.thes-syn-chip:hover{background:#805ad5;color:#fff}
.wb-ctx-menu{position:fixed;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:99999;display:none;min-width:200px;padding:4px}
.wb-ctx-menu.show{display:block}
.ctx-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:13px;color:#2d3748}
.ctx-item:hover{background:#ebf8ff}
.ctx-item i{width:16px;color:#4299e1}
.ctx-sep{height:1px;background:#e2e8f0;margin:4px 0}
.ctx-syn-list{position:absolute;left:100%;top:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);min-width:160px;max-height:200px;overflow-y:auto;padding:4px;display:none}
#ctxSynSub:hover .ctx-syn-list{display:block}
.ctx-syn-item{padding:6px 12px;cursor:pointer;font-size:12px;color:#2d3748;border-radius:4px}
.ctx-syn-item:hover{background:#ebf8ff}
.banner-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;max-height:70vh;overflow-y:auto}
.banner-picker-card{border:2px solid #e2e8f0;border-radius:10px;padding:14px;cursor:pointer;transition:all .2s}
.banner-picker-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1)}
.banner-picker-head{font-weight:700;font-size:13px;margin-bottom:4px}
.banner-picker-desc{font-size:11px;color:#718096}
.wb-banner{position:relative;border-radius:10px;padding:14px 18px 14px 54px;margin:12px 0;cursor:move;box-shadow:4px 6px 16px rgba(0,0,0,.18),inset -6px -6px 0 rgba(0,0,0,.07);min-height:70px;user-select:none;resize:both;overflow:auto;max-width:100%}
.wb-banner::after{content:'';position:absolute;bottom:-8px;right:12px;width:0;height:0;border-left:12px solid transparent;border-top:10px solid rgba(0,0,0,.25)}
.wb-banner .ban-icon{position:absolute;left:14px;top:14px;font-size:24px;line-height:1}
.wb-banner .ban-title{font-weight:800;font-size:13px;margin-bottom:4px}
.wb-banner .ban-body{font-size:12px;line-height:1.6;outline:none;user-select:text}
.wb-banner .ban-close{position:absolute;top:6px;right:8px;background:rgba(0,0,0,.15);border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.6)}
.wb-banner .ban-close:hover{background:rgba(0,0,0,.3)}
.wb-banner .ban-palette{display:none;position:absolute;top:6px;right:34px;background:#1a202c;border-radius:8px;padding:6px;gap:6px;flex-wrap:wrap;z-index:9}
.wb-banner:hover .ban-palette{display:flex}
.ban-clr-dot{width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid transparent}
.ban-clr-dot:hover{transform:scale(1.2);border-color:#fff}
.ai-score-card{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:12px;padding:20px;margin:12px 0}
.ai-score-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-top:10px}
.ai-score-item{background:rgba(255,255,255,.15);border-radius:8px;padding:8px;text-align:center}
.ai-score-item .sc-val{font-size:22px;font-weight:800}
.ai-score-item .sc-lbl{font-size:10px;opacity:.8;text-transform:capitalize}
.ai-err-inline{border-radius:3px;padding:1px 3px;font-weight:600;cursor:help;position:relative;text-decoration:underline wavy}
.ai-correction{background:#f0fff4;border:1px solid #68d391;border-radius:4px;padding:2px 6px;font-size:11px;color:#276749;margin-left:4px;font-style:italic}
.ai-comment{background:#fffbeb;border-left:3px solid #f6ad55;padding:6px 10px;margin:4px 0;font-size:12px;color:#744210;border-radius:0 6px 6px 0}
/* ===== MODERN OFFICE RIBBON — compact Fluent-style ribbon with Quick Access Toolbar ===== */
.wb-ribbon{background:#fff;border-bottom:1px solid #dfe5ee;display:flex;flex-direction:column;flex-shrink:0;z-index:520;box-shadow:0 1px 4px rgba(15,23,42,.07);position:relative;padding:0;font-variant-numeric:tabular-nums}
.wb-ribbon.collapsed .wb-ribbon-pane{display:none!important}
.wb-ribbon.collapsed{border-bottom:none;box-shadow:none}
/* --- Tab strip: QAT (Save · Open · Undo · Redo · Print · Mic) + tabs + search --- */
.wb-ribbon-tabs{display:flex;gap:3px;padding:0 8px 0 6px;background:#f6f8fb;border-bottom:1px solid #e4eaf2;align-items:stretch;height:38px;flex-shrink:0}
.wb-rtab{border:none;background:transparent;padding:0 13px;font-size:12.5px;font-weight:700;color:#475569;cursor:pointer;border-bottom:2.5px solid transparent;display:flex;align-items:center;gap:7px;border-radius:0;transition:background .12s,color .12s}
.wb-rtab small{font-size:12.5px;font-weight:700}
.wb-rtab i{font-size:14px}
.wb-rtab:hover{color:#1e3a8a;background:#e2e8f0}
.wb-rtab.active{color:#1d4ed8;border-bottom-color:#1d4ed8;background:#fff}
/* Quick Access Toolbar — pinned next to the tabs, always visible (even when ribbon is collapsed) */
.wb-qat{display:flex;align-items:center;gap:2px;margin-right:10px;padding-right:10px;border-right:1px solid #e2e8f0}
.wb-qat-btn{border:none;background:transparent;color:#475569;width:32px;height:30px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:background .12s,color .12s}
.wb-qat-btn:hover{background:#e2e8f0;color:#1e3a8a}
.wb-qat-btn.wb-qat-save{color:#15803d}
.wb-qat-btn.wb-qat-save:hover{background:#dcfce7;color:#166534}
.wb-qat-btn.wb-qat-rec{color:#dc2626;animation:qatRecPulse 1.4s infinite}
@keyframes qatRecPulse{0%,100%{background:rgba(220,38,38,.14)}50%{background:rgba(220,38,38,.30)}}
.wb-qat-sep{width:1px;height:20px;background:#e2e8f0;margin:0 5px}
.wb-qat-save-ind{width:8px;height:8px;border-radius:50%;background:#22c55e;margin:0 3px;box-shadow:0 0 0 2px #dcfce7;transition:background .3s}
.wb-qat-save-ind.busy{background:#f59e0b;box-shadow:0 0 0 2px #fef3c7}
/* "Tell me" search box in the tab strip */
.wb-ribbon-search{position:relative;display:flex;align-items:center;margin-left:auto;border:1px solid #e2e8f0;border-radius:16px;background:#fff;padding:0 10px;height:29px;align-self:center;flex-shrink:0;min-width:0}
.wb-ribbon-search:focus-within{border-color:#93c5fd;box-shadow:0 0 0 2px rgba(147,197,253,.25)}
.wb-ribbon-search i{font-size:12px;color:#94a3b8}
.wb-ribbon-search input{border:none;outline:none;font-size:12px;width:160px;background:transparent;padding:0 6px;color:#1a202c}
.wb-ribbon-search input::placeholder{color:#a0aec0}
.wb-ribbon-search-drop{position:absolute;top:calc(100% + 6px);right:0;left:auto;min-width:250px;max-height:340px;overflow-y:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.18);display:none;z-index:9000;padding:5px}
.wb-ribbon-search-drop .rs-item{display:flex;align-items:center;gap:9px;padding:8px 10px;font-size:12px;font-weight:600;color:#334155;cursor:pointer;border-radius:8px}
.wb-ribbon-search-drop .rs-item:hover{background:#eef2ff;color:#1d4ed8}
.wb-ribbon-search-drop .rs-item i{width:17px;text-align:center;font-size:13px;color:#64748b}
.wb-ribbon-search-drop .rs-none{padding:8px 10px;font-size:11.5px;color:#94a3b8}
/* --- Command area: compact, groups wrap to a second row instead of scrolling --- */
.wb-ribbon-pane{display:none;flex-direction:row;flex-wrap:wrap;align-items:stretch;gap:1px;padding:2px 6px;background:#fff;overflow:visible;justify-content:flex-start}
.wb-ribbon-pane.show{display:flex}
.wb-ribbon-pane .tb-grp{position:relative;display:flex;flex-wrap:wrap;align-content:flex-start;align-items:flex-start;gap:2px;padding:3px 9px 16px;border-right:1px solid #e8edf4;min-height:64px;flex:0 1 auto;justify-content:flex-start}
.wb-ribbon-pane .tb-grp:last-child{border-right:none}
.wb-ribbon-pane .tb-grp::after{content:attr(data-name);position:absolute;left:9px;bottom:2px;font-size:9px;font-weight:700;color:#8b96a5;letter-spacing:.5px;text-transform:uppercase}
/* Bigger, friendlier icons: 58px large tiles + 34px icon-only compact buttons */
.wb-ribbon .tb-btn{width:58px;height:52px;flex-direction:column;justify-content:center;gap:2px;font-size:10px;font-weight:700;border-radius:7px;padding:2px 2px;border-color:transparent;background:transparent}
.wb-ribbon .tb-btn:hover{background:#eff4fb;border-color:transparent}
.wb-ribbon .tb-btn i{font-size:17px}
.wb-ribbon .tb-btn.tb-ic{width:34px;height:32px;flex-direction:row;font-size:12px;padding:0}
.wb-ribbon .tb-btn.tb-ic .tb-lbl{display:none}
.wb-ribbon .tb-btn.tb-ic i{font-size:15px}
.wb-ribbon .tb-btn .tb-lbl{line-height:1.15;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:54px;font-size:9.5px;font-weight:700}
.wb-ribbon .tb-sep{width:1px;height:30px;background:#e2e8f0;margin:4px 2px}
.wb-ribbon .tb-sel{width:138px;font-size:12px;padding:6px 8px;border-radius:6px;border:1px solid #dde4ee;background:#fff;cursor:pointer}
.wb-ribbon .sz-wrap{display:flex;align-items:center;background:#fff;border:1px solid #dde4ee;border-radius:6px;overflow:hidden;height:31px}
.wb-ribbon .sz-wrap .tb-btn{width:28px;height:31px;flex-direction:row;border:none;border-radius:0}
.wb-ribbon .sz-wrap .tb-btn i{font-size:12px}
.wb-ribbon .sz-inp{flex:1;width:36px;min-width:0;border:none;text-align:center;font-size:12px}
.wb-font-row{display:flex;gap:4px;align-items:center;flex:0 0 238px;width:238px}
.wb-font-row .tb-sel{flex:1;min-width:0}
.wb-font-row .sz-wrap{flex:0 0 auto}
.wb-font-row2{display:flex;flex-wrap:wrap;gap:2px;align-items:center;flex:0 0 100%;width:100%}
.wb-font-row .wb-style-sel{flex:0 0 104px}
@media(max-width:900px){.wb-font-row .wb-style-sel{flex:0 0 92px}}
@media(max-width:560px){.wb-font-row .wb-style-sel{display:none}}
.wb-mini-lbl{flex:0 0 100%;font-size:8.5px;color:#8b96a5;font-weight:800;text-transform:uppercase;letter-spacing:.4px}
.wb-ribbon .wb-wide{flex-direction:row;height:34px;gap:6px;font-size:11.5px;justify-content:center;width:auto;padding:0 10px}
.wb-ribbon .wb-wide .tb-lbl{max-width:none;font-size:11px}
.wb-ribbon .mark-err-main-btn{flex-direction:row;gap:6px;font-size:11.5px;justify-content:center;height:34px;width:auto;padding:0 12px}
.wb-ribbon .clr-wrap{position:relative}
.wb-ribbon .clr-wrap .tb-btn{width:34px}
.wb-ribbon .clr-wrap input[type="color"]{position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:20px;height:6px;opacity:0;cursor:pointer}
/* Microphone pill — signature gradient accent of the Home tab */
.wb-ribbon #ribbonMicBtn{flex-direction:row;height:34px;gap:6px;background:linear-gradient(135deg,#eef4ff,#e0eaff);border-color:#b6cdf3;color:#1e4fbf;justify-content:center;font-size:11.5px;width:auto;padding:0 12px;border-radius:17px}
.wb-ribbon #ribbonMicBtn:hover{background:linear-gradient(135deg,#e0eaff,#d3e2ff);border-color:#8fb3ec}
.wb-ribbon #ribbonMicBtn i{font-size:14px}
#ribbonMicBadge{font-size:8.5px;font-weight:800;border-radius:8px;padding:1px 6px}
/* Active (toggled-on) states must be visible over the transparent ribbon buttons */
.wb-ribbon .tb-btn.active{background:#dbeafe;border-color:#bfdbfe;color:#1d4ed8}
.wb-ribbon .tb-btn.active i{color:#1d4ed8}
.wb-ribbon .tb-btn.tb-no.active{background:#fff5f5;border-color:#fc8181;color:#c53030}
.wb-ribbon .tb-btn.tb-ok.active{background:#f0fff4;border-color:#68d391;color:#276749}
/* Draw tools shown inline inside the ribbon when Draw is on */
.wb-ribbon .draw-pnl{flex:0 0 100%;width:100%;border:1px solid #dbe2ee;border-radius:10px;background:#f6f8fb;padding:6px 10px;margin-top:2px}
/* Compact mode: everything icon-only (toggle: Window group button or Ctrl+Alt+C) */
.wb-ribbon.compact .tb-btn{width:34px;height:32px;flex-direction:row;gap:0;padding:0}
.wb-ribbon.compact .tb-btn .tb-lbl{display:none}
.wb-ribbon.compact .tb-btn i{font-size:15px}
.wb-ribbon.compact .tb-btn.wb-wide{width:34px;padding:0}
.wb-ribbon.compact #ribbonMicBtn{width:34px;padding:0;border-radius:7px}
.wb-ribbon.compact #ribbonMicBadge{display:none}
.wb-ribbon.compact .tb-grp{min-height:40px;padding-bottom:14px}
/* Responsive: under 1100px groups wrap naturally; the search field yields space but tabs + QAT stay put */
@media(max-width:1100px){.wb-ribbon-search input{width:110px}.wb-ribbon-pane{padding:2px 4px}.wb-ribbon-pane .tb-grp{padding:3px 7px 16px}}
@media(max-width:900px){.wb-rtab{padding:0 10px}.wb-rtab i{font-size:13px}.wb-qat-btn{width:29px}.wb-font-row{flex:0 0 200px;width:200px}.wb-ribbon .tb-btn:not(.tb-ic){width:52px}.wb-ribbon .clr-wrap .tb-btn{width:34px}}
@media(max-width:700px){.wb-ribbon-search input{width:70px}.wb-rtab small{display:none}.wb-rtab i{font-size:14px}.wb-rtab{padding:0 11px}.wb-qat .wb-qat-opt{display:none}.wb-rtab.wb-qat-opt{display:none}.wb-collapse-btn small{display:none}}
@media(max-width:560px){.wb-qat{margin-right:6px;padding-right:6px}.wb-ribbon-search input{width:56px}.wb-ribbon .tb-btn:not(.tb-ic):not(.wb-wide){width:48px;height:50px}.wb-font-row{flex:0 0 178px;width:178px}.wb-ribbon .tb-sel{width:118px}.wb-ribbon-tabs{flex-wrap:wrap;height:auto;min-height:36px;padding-bottom:3px}.wb-rtab[title="Close Writeboard"] small{display:none}}
/* Pages sidebar: thumbnails keep their size, list scrolls */
.ps-th{flex-shrink:0}
/* Ribbon follows Light / Dark / Sepia themes */
#whiteboard-overlay.theme-dark .wb-ribbon{background:#1e293b;border-bottom-color:#334155;box-shadow:0 2px 10px rgba(0,0,0,.35)}
#whiteboard-overlay.theme-dark .wb-ribbon-tabs{background:#0f172a;border-bottom-color:#334155}
#whiteboard-overlay.theme-dark .wb-rtab{color:#94a3b8}
#whiteboard-overlay.theme-dark .wb-rtab:hover{color:#e2e8f0;background:#334155}
#whiteboard-overlay.theme-dark .wb-rtab.active{color:#60a5fa;border-bottom-color:#60a5fa;background:#1e293b}
#whiteboard-overlay.theme-dark .wb-ribbon-pane{background:#1e293b}
#whiteboard-overlay.theme-dark .wb-ribbon-pane .tb-grp{border-right-color:#334155}
#whiteboard-overlay.theme-dark .wb-ribbon-pane .tb-grp::after{color:#64748b}
#whiteboard-overlay.theme-dark .wb-ribbon .tb-btn{color:#cbd5e1}
#whiteboard-overlay.theme-dark .wb-ribbon .tb-btn:hover{background:#334155;border-color:#475569}
#whiteboard-overlay.theme-dark .wb-ribbon .tb-btn.active{background:#1e3a5f;border-color:#3b82f6;color:#93c5fd}
#whiteboard-overlay.theme-dark .wb-ribbon .tb-sel,#whiteboard-overlay.theme-dark .wb-ribbon .sz-wrap{background:#0f172a;color:#e2e8f0;border-color:#475569}
#whiteboard-overlay.theme-dark .wb-ribbon .sz-inp{color:#e2e8f0}
/* Modern dialogs follow the Light / Dark / Sepia themes too */
#whiteboard-overlay.theme-dark .mdl-hd{background:#0b1220;border-bottom-color:#334155}
#whiteboard-overlay.theme-dark .mdl-hd span{color:#e2e8f0}
#whiteboard-overlay.theme-dark .mdl-hd span i{color:#93c5fd}
#whiteboard-overlay.theme-dark .mdl-hd button{background:#1e293b;border-color:#475569;color:#94a3b8}
#whiteboard-overlay.theme-dark .mdl-hd button:hover{background:#7f1d1d;border-color:#dc2626;color:#fecaca}
#whiteboard-overlay.theme-dark .mdl-box{background:#1e293b;border-color:#475569}
#whiteboard-overlay.theme-dark .mdl-bd{color:#e2e8f0}
#whiteboard-overlay.theme-dark .mdl-inp{background:#0f172a;border-color:#475569;color:#e2e8f0}
#whiteboard-overlay.theme-dark .mdl-inp:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.18)}
#whiteboard-overlay.theme-dark .inp-row label,#whiteboard-overlay.theme-dark .setup-sec h4,#whiteboard-overlay.theme-dark .hf-check,#whiteboard-overlay.theme-dark .sv-btn span,#whiteboard-overlay.theme-dark .tpl-card span,#whiteboard-overlay.theme-dark .upl-box span,#whiteboard-overlay.theme-dark .clr-row label,#whiteboard-overlay.theme-dark .wm-row label{color:#cbd5e1}
#whiteboard-overlay.theme-dark .setup-sec{background:#0f172a;border-color:#334155}
#whiteboard-overlay.theme-dark .orient-btn{background:#1e293b;border-color:#475569;color:#cbd5e1}
#whiteboard-overlay.theme-dark .orient-btn.active{background:#1e3a5f;border-color:#3b82f6;color:#93c5fd}
#whiteboard-overlay.theme-dark .clr-inp{background:#0f172a;border-color:#475569}
#whiteboard-overlay.theme-dark .tpl-card{background:#1e293b;border-color:#475569}
#whiteboard-overlay.theme-dark .tpl-card:hover{border-color:#60a5fa}
#whiteboard-overlay.theme-dark .sv-btn{background:#1e293b;border-color:#475569}
#whiteboard-overlay.theme-dark .upl-box{border-color:#475569;background:#0f172a}
#whiteboard-overlay.theme-dark .upl-box:hover{border-color:#60a5fa;background:#1e3a5f}
#whiteboard-overlay.theme-dark .or-div::before,#whiteboard-overlay.theme-dark .or-div::after{background:#334155}
#whiteboard-overlay.theme-sepia .mdl-hd{background:#f3ede2;border-bottom-color:#e2d5c3}
#whiteboard-overlay.theme-sepia .mdl-hd span{color:#3d3229}
#whiteboard-overlay.theme-sepia .mdl-hd span i{color:#a16207}
#whiteboard-overlay.theme-sepia .mdl-box{background:#faf8f5;border-color:#d8c8ae}
#whiteboard-overlay.theme-sepia .mdl-inp{background:#fff;border-color:#d8c8ae;color:#3d3229}
#whiteboard-overlay.theme-sepia .setup-sec{background:#f3ede2;border-color:#e2d5c3}
#whiteboard-overlay.theme-sepia .orient-btn{background:#fff;border-color:#d8c8ae;color:#57493a}
#whiteboard-overlay.theme-sepia .orient-btn.active{background:#fdf3d8;border-color:#d6b25f;color:#92600a}
#whiteboard-overlay.theme-sepia .tpl-card,#whiteboard-overlay.theme-sepia .sv-btn{background:#fff;border-color:#d8c8ae}
#whiteboard-overlay.theme-dark .wb-ribbon .tb-sep{background:#334155}
#whiteboard-overlay.theme-dark .wb-ribbon-search{background:#0f172a;border-color:#475569}
#whiteboard-overlay.theme-dark .wb-ribbon-search input{color:#e2e8f0}
#whiteboard-overlay.theme-dark .wb-ribbon-search-drop{background:#0f172a;border-color:#475569}
#whiteboard-overlay.theme-dark .wb-ribbon-search-drop .rs-item{color:#e2e8f0}
#whiteboard-overlay.theme-dark .wb-ribbon-search-drop .rs-item:hover{background:#1e3a5f;color:#93c5fd}
#whiteboard-overlay.theme-dark .wb-ribbon-tabs{background:#0b1220}
#whiteboard-overlay.theme-dark .wb-qat{border-right-color:#334155}
#whiteboard-overlay.theme-dark .wb-qat-btn{color:#a8b6c9}
#whiteboard-overlay.theme-dark .wb-qat-btn:hover{background:#334155;color:#e2e8f0}
#whiteboard-overlay.theme-dark .wb-qat-btn.wb-qat-save{color:#4ade80}
#whiteboard-overlay.theme-dark .wb-qat-btn.wb-qat-save:hover{background:rgba(34,197,94,.18);color:#86efac}
#whiteboard-overlay.theme-dark .wb-qat-sep{background:#334155}
#whiteboard-overlay.theme-dark .wb-ribbon-pane .tb-grp{border-right-color:#2b3a52}
#whiteboard-overlay.theme-dark .wb-ribbon .tb-btn:hover{background:#2b3a52;border-color:transparent}
#whiteboard-overlay.theme-dark .wb-ribbon #ribbonMicBtn{background:linear-gradient(135deg,#1e2c4d,#1b2745);border-color:#3b82f6;color:#93c5fd}
#whiteboard-overlay.theme-dark .wb-ribbon #ribbonMicBtn:hover{background:linear-gradient(135deg,#24365e,#20305a)}
#whiteboard-overlay.theme-dark .wb-ribbon .draw-pnl{background:#0f172a;border-color:#334155}
#whiteboard-overlay.theme-dark .wb-ribbon .draw-pnl{background:#0f172a;border-color:#334155}
#whiteboard-overlay.theme-dark .wb-ribbon .dp-btn{background:#1e293b;border-color:#475569;color:#cbd5e1}
#whiteboard-overlay.theme-dark .wb-ribbon .dp-btn:hover{background:#334155}
#whiteboard-overlay.theme-dark .wb-ribbon .dp-btn.active{background:#1e3a5f;border-color:#3b82f6;color:#93c5fd}
#whiteboard-overlay.theme-sepia .wb-ribbon{background:#faf8f5;border-bottom-color:#e2d5c3}
#whiteboard-overlay.theme-sepia .wb-ribbon-tabs{background:#f3ede2;border-bottom-color:#e2d5c3}
#whiteboard-overlay.theme-sepia .wb-rtab{color:#7a6a55}
#whiteboard-overlay.theme-sepia .wb-rtab:hover{background:#eee5d3;color:#3d3229}
#whiteboard-overlay.theme-sepia .wb-rtab.active{color:#a16207;border-bottom-color:#a16207;background:#faf8f5}
#whiteboard-overlay.theme-sepia .wb-ribbon-pane{background:#faf8f5}
#whiteboard-overlay.theme-sepia .wb-ribbon-pane .tb-grp{border-right-color:#e2d5c3}
#whiteboard-overlay.theme-sepia .wb-ribbon-pane .tb-grp::after{color:#a8987e}
#whiteboard-overlay.theme-sepia .wb-ribbon .tb-btn{color:#57493a}
#whiteboard-overlay.theme-sepia .wb-ribbon .tb-btn:hover{background:#eee5d3;border-color:#d8c8ae}
#whiteboard-overlay.theme-sepia .wb-ribbon .tb-btn.active{background:#fdf3d8;border-color:#d6b25f;color:#92600a}
#whiteboard-overlay.theme-sepia .wb-ribbon .tb-sel,#whiteboard-overlay.theme-sepia .wb-ribbon .sz-wrap{background:#f3ede2;color:#3d3229;border-color:#d8c8ae}
#whiteboard-overlay.theme-sepia .wb-ribbon .tb-sep{background:#e2d5c3}
#whiteboard-overlay.theme-sepia .wb-ribbon-search{background:#f3ede2;border-color:#d8c8ae}
#whiteboard-overlay.theme-sepia .wb-ribbon .draw-pnl{background:#f3ede2;border-color:#e2d5c3}
#whiteboard-overlay.theme-sepia .wb-qat{border-right-color:#e2d5c3}
#whiteboard-overlay.theme-sepia .wb-qat-btn{color:#7a6a55}
#whiteboard-overlay.theme-sepia .wb-qat-btn:hover{background:#eee5d3;color:#3d3229}
#whiteboard-overlay.theme-sepia .wb-qat-btn.wb-qat-save{color:#15803d}
#whiteboard-overlay.theme-sepia .wb-qat-btn.wb-qat-save:hover{background:#e5ecd8}
#whiteboard-overlay.theme-sepia .wb-qat-sep{background:#e2d5c3}
#whiteboard-overlay.theme-sepia .wb-ribbon-pane .tb-grp{border-right-color:#e8dcc8}
#whiteboard-overlay.theme-sepia .wb-ribbon #ribbonMicBtn{background:linear-gradient(135deg,#f5eeda,#efe6cd);border-color:#cdb98b;color:#8a6d1f}
#whiteboard-overlay.theme-sepia .wb-ribbon .dp-btn{background:#faf8f5;border-color:#d8c8ae;color:#57493a}
#whiteboard-overlay.theme-sepia .wb-ribbon .dp-btn.active{background:#fdf3d8;border-color:#d6b25f;color:#92600a}
/* Pages sidebar collapse */
.pg-side{transition:width .25s ease,min-width .25s ease,opacity .25s ease;overflow:hidden;position:relative}
.pg-side.collapsed{width:0!important;min-width:0;opacity:0;pointer-events:none}
.ps-collapse{position:absolute;top:8px;right:6px;background:#4a5568;border:none;color:#e2e8f0;border-radius:6px;width:22px;height:22px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;z-index:3}
.ps-collapse:hover{background:#3182ce}
.ps-expand-tab{position:absolute;left:0;top:50%;transform:translateY(-50%);background:#1a202c;color:#e2e8f0;border:1px solid #4a5568;border-left:none;border-radius:0 8px 8px 0;width:26px;height:64px;cursor:pointer;font-size:12px;display:none;align-items:center;justify-content:center;z-index:300;box-shadow:2px 2px 8px rgba(0,0,0,.3)}
.ps-expand-tab.show{display:flex}
.ps-expand-tab:hover{background:#3182ce}
/* Review panel — track changes + error marks together */
.review-pane{position:fixed;right:-380px;top:110px;width:360px;max-width:92vw;height:calc(100vh - 140px);background:#fff;border-left:2px solid #e2e8f0;border-radius:12px 0 0 12px;box-shadow:-4px 0 24px rgba(0,0,0,.15);z-index:10060;display:flex;flex-direction:column;transition:right .3s ease;overflow:hidden}
.review-pane.open{right:0}
.review-hdr{padding:11px 13px;background:linear-gradient(90deg,#d69e2e,#b7791f);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0}
.review-hdr>span{font-weight:700;font-size:13px;white-space:nowrap;display:flex;align-items:center;gap:6px}
.review-hdr-btns{display:flex;gap:5px;align-items:center}
.review-hdr-btns button{background:rgba(255,255,255,.22);border:none;color:#fff;border-radius:6px;padding:4px 8px;font-size:10.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.review-hdr-btns button:hover{background:rgba(255,255,255,.38)}
.review-sum{display:flex;gap:6px;padding:9px 12px;background:#fffbeb;border-bottom:1px solid #fef3c7;flex-wrap:wrap;flex-shrink:0}
.review-sum .rchip{font-size:10.5px;font-weight:700;border-radius:12px;padding:3px 9px;background:#fff;border:1px solid #fde68a;color:#92400e}
.review-list{flex:1;overflow-y:auto;padding:10px}
.rev-item{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-bottom:8px;background:#f7fafc;display:flex;flex-direction:column;gap:5px}
.rev-item .rev-quote{font-size:11.5px;color:#1a202c;background:#fff;border-left:3px solid #d69e2e;padding:4px 8px;border-radius:0 4px 4px 0;word-break:break-word;max-height:58px;overflow-y:auto}
.rev-item .rev-meta{font-size:9.5px;font-weight:800;color:#718096;text-transform:uppercase;letter-spacing:.4px}
.rev-item .rev-acts{display:flex;gap:5px}
.rev-item .rev-acts button{flex:1;border:none;border-radius:6px;padding:5px 8px;font-size:10.5px;font-weight:700;cursor:pointer}
.rev-acc{background:#f0fff4;color:#276749;border:1px solid #68d391!important}
.rev-acc:hover{background:#c6f6d5}
.rev-rej{background:#fff5f5;color:#c53030;border:1px solid #fc8181!important}
.rev-rej:hover{background:#fed7d7}
.rev-empty{color:#a0aec0;font-size:12px;text-align:center;padding:30px 10px;line-height:1.7}
/* PDF import: full-bleed pages, no double margins */
.pg-wrap.pdf-mode .wb-pg{padding:0!important}
.pg-wrap.pdf-mode .wb-pg img{width:100%;height:auto;display:block;pointer-events:none}
.pg-wrap.pdf-mode .wb-pg-container{border:none!important}
/* Narrower page surroundings (margins around each page) */
.zoom-inner{padding:10px!important}
.zoom-container{margin:10px auto!important}
.pg-wrap{margin-bottom:16px!important}
/* Responsive banner picker */
.banner-search-row{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.banner-search-row input{flex:1;min-width:140px;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none;box-sizing:border-box}
.banner-search-row input:focus{border-color:#4299e1}
.banner-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
@media(max-width:640px){.banner-grid{grid-template-columns:1fr 1fr}.banner-picker-card{padding:10px}.banner-picker-head{font-size:11px}}
.wb-banner{max-width:100%}
/* Library detach + Assessor inside Library */
.lib-hdr-actions{display:flex;gap:6px;align-items:center}
.lib-detach{background:rgba(255,255,255,.22);border:none;color:#fff;border-radius:6px;padding:5px 10px;font-size:10.5px;font-weight:800;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px}
.lib-detach:hover{background:rgba(255,255,255,.38)}
.assessor-box{display:flex;flex-direction:column;gap:10px;padding:12px;overflow-y:auto;flex:1}
.assessor-box textarea{width:100%;box-sizing:border-box;padding:9px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;resize:vertical;outline:none}
.assessor-box textarea:focus{border-color:#805ad5}
.assessor-copy{background:#805ad5;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700;cursor:pointer}
.assessor-copy:hover{background:#6b46c1}
.assessor-apply{background:#38a169;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700;cursor:pointer}
.assessor-apply:hover{background:#276749}
.assessor-note{font-size:11px;color:#718096;line-height:1.6}
  `;
  const html = `
  <div id="whiteboard-overlay" data-wb-engine="smart" style="display:none;">
<div class="wb-toolbar wb-ribbon" id="wbRibbon">
<div class="wb-ribbon-tabs">
<div class="wb-qat" title="Quick Access Toolbar">
<button class="wb-qat-btn wb-qat-save" onclick="openMdl('mSave')" title="Save / Export (PDF · Word · HTML · Text)"><i class="fas fa-save"></i></button>
<button class="wb-qat-btn" onclick="openMdl('mFile')" title="Open File (PDF / DOCX / PPTX)"><i class="fas fa-folder-open"></i></button>
<span class="wb-qat-sep"></span>
<button class="wb-qat-btn" onclick="wbUndo()" title="Undo (Ctrl+Z)"><i class="fas fa-undo"></i></button>
<button class="wb-qat-btn" onclick="wbRedo()" title="Redo (Ctrl+Y / Ctrl+Shift+Z)"><i class="fas fa-redo"></i></button>
<button class="wb-qat-btn" onclick="savePDF()" title="Print / PDF Preview"><i class="fas fa-print"></i></button>
<span class="wb-qat-sep"></span>
<button class="wb-qat-btn" id="qatMicBtn" onclick="toggleMicSettingsPopover(event)" title="Microphone & Live Transcription"><i class="fas fa-microphone"></i></button>
<span id="qatSaveInd" class="wb-qat-save-ind" title="Autosave status"></span>
</div>
<button class="wb-rtab active" data-rtab="home" onclick="setRibbonTab('home')" title="Home"><i class="fas fa-home"></i><small>Home</small></button>
<button class="wb-rtab" data-rtab="insert" onclick="setRibbonTab('insert')" title="Insert"><i class="fas fa-plus-square"></i><small>Insert</small></button>
<button class="wb-rtab" data-rtab="review" onclick="setRibbonTab('review')" title="Review"><i class="fas fa-user-edit"></i><small>Review</small></button>
<button class="wb-rtab wb-wide wb-qat-opt" onclick="togFs()" title="Fullscreen"><i class="fas fa-expand"></i><small>Fullscreen</small></button>
<div class="wb-ribbon-search"><i class="fas fa-search"></i><input id="ribbonSearch" placeholder="Tell me what to do" oninput="ribbonSearch(this.value)" onfocus="ribbonSearch(this.value)" onkeydown="if(event.key==='Enter'){ribbonSearchExec();}else if(event.key==='Escape'){ribbonSearchHide();}"><div class="wb-ribbon-search-drop" id="ribbonSearchDrop"></div></div>
<button class="wb-rtab wb-collapse-btn" id="ribbonCollapseBtn" onclick="toggleRibbonCollapse()" title="Minimize / expand ribbon (Ctrl+F1)"><i class="fas fa-chevron-up"></i></button>
<button class="wb-rtab" onclick="closeWb()" title="Close Writeboard" style="color:#c53030"><i class="fas fa-times"></i><small>Close</small></button>
</div>
<div class="wb-ribbon-pane show" data-pane="home">
<div class="tb-grp" data-name="Clipboard">
<button class="tb-btn tb-ic" onclick="wbUndo()" title="Undo (Ctrl+Z)"><i class="fas fa-undo"></i><span class="tb-lbl">Undo</span></button>
<button class="tb-btn tb-ic" onclick="wbRedo()" title="Redo (Ctrl+Y / Ctrl+Shift+Z)"><i class="fas fa-redo"></i><span class="tb-lbl">Redo</span></button>
<button class="tb-btn tb-ic" onclick="wbCut()" title="Cut (Ctrl+X)"><i class="fas fa-cut"></i><span class="tb-lbl">Cut</span></button>
<button class="tb-btn tb-ic" onclick="wbCopy()" title="Copy (Ctrl+C)"><i class="fas fa-copy"></i><span class="tb-lbl">Copy</span></button>
<button class="tb-btn tb-ic" onclick="wbPaste()" title="Paste (Ctrl+V)"><i class="fas fa-paste"></i><span class="tb-lbl">Paste</span></button>
<button class="tb-btn wb-wide" onclick="showWordCount()" title="Word &amp; character count"><i class="fas fa-list-ol"></i><span class="tb-lbl">Word Count</span></button>
</div>
<div class="tb-grp" data-name="Font">
<div class="wb-font-row">
<select id="wbStyle" onchange="fmtBlock(this.value)" class="tb-sel wb-style-sel" title="Styles">
<option value="p">Normal text</option>
<option value="h1">Heading 1</option>
<option value="h2">Heading 2</option>
<option value="h3">Heading 3</option>
</select>
<select id="wbFont" onchange="setFont(this.value)" class="tb-sel" title="Font">
<option value="Times New Roman">Times New Roman</option>
<option value="Arial">Arial</option>
<option value="Georgia">Georgia</option>
<option value="Verdana">Verdana</option>
<option value="Courier New">Courier New</option>
</select>
<div class="sz-wrap">
<button class="tb-btn tb-sm" onclick="chgSize(-2)" title="Decrease Size"><i class="fas fa-minus"></i></button>
<input type="number" id="wbSize" value="14" min="8" max="72" class="sz-inp">
<button class="tb-btn tb-sm" onclick="chgSize(2)" title="Increase Size"><i class="fas fa-plus"></i></button>
</div>
</div>
<div class="wb-font-row2">
<button class="tb-btn tb-ic" id="btnB" onclick="fmt('bold')" title="Bold (Ctrl+B)"><i class="fas fa-bold"></i><span class="tb-lbl">Bold</span></button>
<button class="tb-btn tb-ic" id="btnI" onclick="fmt('italic')" title="Italic (Ctrl+I)"><i class="fas fa-italic"></i><span class="tb-lbl">Italic</span></button>
<button class="tb-btn tb-ic" id="btnU" onclick="fmt('underline')" title="Underline (Ctrl+U)"><i class="fas fa-underline"></i><span class="tb-lbl">Underline</span></button>
<button class="tb-btn tb-ic" onclick="fmt('strikeThrough')" title="Strikethrough"><i class="fas fa-strikethrough"></i><span class="tb-lbl">Strike</span></button>
<button class="tb-btn tb-ic" onclick="superscript()" title="Superscript"><i class="fas fa-superscript"></i><span class="tb-lbl">Super</span></button>
<button class="tb-btn tb-ic" onclick="subscript()" title="Subscript"><i class="fas fa-subscript"></i><span class="tb-lbl">Sub</span></button>
<div class="clr-wrap"><button class="tb-btn tb-ic" onclick="document.getElementById('txtClr').click()" title="Text Color"><i class="fas fa-font"></i><span class="tb-lbl">Text Color</span><span class="clr-bar" id="txtBar"></span></button><input type="color" id="txtClr" value="#000000" onchange="setTxtClr(this.value)"></div>
<div class="clr-wrap"><button class="tb-btn tb-ic" onclick="document.getElementById('hlClr').click()" title="Highlight"><i class="fas fa-highlighter"></i><span class="tb-lbl">Highlight</span><span class="clr-bar hl" id="hlBar"></span></button><input type="color" id="hlClr" value="#FFFF00" onchange="setHlClr(this.value)"></div>
</div>
</div>
<div class="tb-grp" data-name="Paragraph">
<div class="wb-font-row2">
<button class="tb-btn tb-ic" onclick="fmt('justifyLeft')" title="Align Left"><i class="fas fa-align-left"></i><span class="tb-lbl">Left</span></button>
<button class="tb-btn tb-ic" onclick="fmt('justifyCenter')" title="Align Center"><i class="fas fa-align-center"></i><span class="tb-lbl">Center</span></button>
<button class="tb-btn tb-ic" onclick="fmt('justifyRight')" title="Align Right"><i class="fas fa-align-right"></i><span class="tb-lbl">Right</span></button>
<button class="tb-btn tb-ic" onclick="fmt('insertUnorderedList')" title="Bullet List"><i class="fas fa-list-ul"></i><span class="tb-lbl">Bullets</span></button>
<button class="tb-btn tb-ic" onclick="fmt('insertOrderedList')" title="Numbered List"><i class="fas fa-list-ol"></i><span class="tb-lbl">Numbers</span></button>
</div>
</div>
<div class="tb-grp" data-name="Editing">
<button class="tb-btn" onclick="openMdl('mFind')" title="Find &amp; Replace"><i class="fas fa-search"></i><span class="tb-lbl">Find</span></button>
<button class="tb-btn" onclick="clearFormatting()" title="Clear Formatting"><i class="fas fa-eraser"></i><span class="tb-lbl">Clear</span></button>
</div>
<div class="tb-grp" data-name="Speech">
<button class="tb-btn" id="ribbonMicBtn" onclick="toggleMicSettingsPopover(event)" title="Microphone & Live Transcription — speak and it types into the document"><i class="fas fa-microphone"></i><span class="tb-lbl">Microphone</span><span id="ribbonMicBadge" style="margin-left:4px;font-size:8.5px;font-weight:800;background:#475569;color:#fff;border-radius:8px;padding:1px 5px">OFF</span></button>
</div>
</div>
<div class="wb-ribbon-pane" data-pane="insert">
<div class="tb-grp" data-name="Insert">
<button class="tb-btn" onclick="insertTextBox()" title="Text Box"><i class="fas fa-text-width"></i><span class="tb-lbl">Text Box</span></button>
<button class="tb-btn" onclick="openMdl('mLink')" title="Link"><i class="fas fa-link"></i><span class="tb-lbl">Link</span></button>
<button class="tb-btn" onclick="openMdl('mImg')" title="Image"><i class="fas fa-image"></i><span class="tb-lbl">Image</span></button>
<button class="tb-btn" onclick="openMdl('mTbl')" title="Table"><i class="fas fa-table"></i><span class="tb-lbl">Table</span></button>
<button class="tb-btn" onclick="openMdl('mFile')" title="Open File (PDF / DOCX / PPTX)"><i class="fas fa-folder-open"></i><span class="tb-lbl">Open File</span></button>
</div>
<div class="tb-grp" data-name="Design">
<button class="tb-btn" onclick="openMdl('mTpl')" title="Templates"><i class="fas fa-file-alt"></i><span class="tb-lbl">Templates</span></button>
<button class="tb-btn" onclick="openMdl('mBanners')" title="Banners"><i class="fas fa-flag" style="color:#e53e3e"></i><span class="tb-lbl">Banners</span></button>
<button class="tb-btn" onclick="addPageBreakAtCursor()" title="Page Break at cursor (Ctrl+Enter)"><i class="fas fa-level-down-alt"></i><span class="tb-lbl">Page Break</span></button>
</div>
<div class="tb-grp" data-name="Draw">
<button class="tb-btn" id="btnHand" onclick="togHand()" title="Hand / Move Canvas (Grab &amp; Drag)"><i class="fas fa-hand-paper"></i><span class="tb-lbl">Hand</span></button>
<button class="tb-btn" id="btnDraw" onclick="togDraw()" title="Draw — shows the drawing tools here in the ribbon"><i class="fas fa-pencil-alt"></i><span class="tb-lbl">Draw</span></button>
<button class="tb-btn tb-ic" onclick="undoDraw()" title="Undo Drawing"><i class="fas fa-undo"></i><span class="tb-lbl">Undo</span></button>
<button class="tb-btn tb-ic" onclick="redoDraw()" title="Redo Drawing"><i class="fas fa-redo"></i><span class="tb-lbl">Redo</span></button>
<button class="tb-btn tb-ic tb-no" onclick="clearDraw()" title="Clear Page Drawings"><i class="fas fa-trash"></i><span class="tb-lbl">Clear</span></button>
</div>
<div id="drawPnl" class="draw-pnl">
<div class="dp-sec"><span class="dp-lbl">Tool:</span>
<button class="dp-btn active" data-tool="pen" onclick="setTool('pen')"><i class="fas fa-pen"></i></button>
<button class="dp-btn" data-tool="pencil" onclick="setTool('pencil')"><i class="fas fa-pencil-alt"></i></button>
<button class="dp-btn" data-tool="brush" onclick="setTool('brush')"><i class="fas fa-paint-brush"></i></button>
<button class="dp-btn" data-tool="marker" onclick="setTool('marker')"><i class="fas fa-marker"></i></button>
<button class="dp-btn" data-tool="highlighter" onclick="setTool('highlighter')"><i class="fas fa-highlighter"></i></button>
<button class="dp-btn" data-tool="eraser" onclick="setTool('eraser')"><i class="fas fa-eraser"></i></button>
</div>
<div class="dp-sec"><span class="dp-lbl">Shape:</span>
<button class="dp-btn" data-tool="line" onclick="setTool('line')"><i class="fas fa-minus"></i></button>
<button class="dp-btn" data-tool="arrow" onclick="setTool('arrow')"><i class="fas fa-long-arrow-alt-right"></i></button>
<button class="dp-btn" data-tool="rect" onclick="setTool('rect')"><i class="far fa-square"></i></button>
<button class="dp-btn" data-tool="fillRect" onclick="setTool('fillRect')"><i class="fas fa-square"></i></button>
<button class="dp-btn" data-tool="circle" onclick="setTool('circle')"><i class="far fa-circle"></i></button>
<button class="dp-btn" data-tool="fillCircle" onclick="setTool('fillCircle')"><i class="fas fa-circle"></i></button>
</div>
<div class="dp-sec"><span class="dp-lbl">Color:</span>
<input type="color" id="drawClr" value="#000000" class="dp-clr">
<span class="dp-pre" style="background:#000" onclick="setDClr('#000')"></span>
<span class="dp-pre" style="background:#dc2626" onclick="setDClr('#dc2626')"></span>
<span class="dp-pre" style="background:#2563eb" onclick="setDClr('#2563eb')"></span>
<span class="dp-pre" style="background:#16a34a" onclick="setDClr('#16a34a')"></span>
</div>
<div class="dp-sec"><span class="dp-lbl">Size:</span>
<input type="range" id="drawSz" min="1" max="30" value="3" class="dp-rng">
<span id="szVal">3px</span>
</div>
<div class="dp-sec">
<button class="dp-act" onclick="undoDraw()"><i class="fas fa-undo"></i></button>
<button class="dp-act" onclick="redoDraw()"><i class="fas fa-redo"></i></button>
<button class="dp-act dp-del" onclick="clearDraw()"><i class="fas fa-trash"></i></button>
</div>
</div>
</div>
<div class="wb-ribbon-pane" data-pane="review">
<div class="tb-grp" data-name="Tracking">
<button class="tb-btn" id="btnTrack" onclick="togTrack()" title="Track Changes"><i class="fas fa-user-edit"></i><span class="tb-lbl">Track</span></button>
<div class="mark-err-wrap" style="width:100%">
<button class="tb-btn mark-err-main-btn" onmousedown="event.preventDefault();toggleMarkErrMenu()" title="Mark Error"><i class="fas fa-exclamation-triangle" style="color:#e53e3e"></i><span class="tb-lbl">Mark Error</span><i class="fas fa-caret-down" style="font-size:10px"></i></button>
<div class="mark-err-menu" id="markErrMenu">
<div class="mec-item" onmousedown="event.preventDefault();markError('Vocabulary','#8b5cf6')"><span class="mec-dot" style="background:#8b5cf6"></span>Vocabulary</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Grammar','#e53e3e')"><span class="mec-dot" style="background:#e53e3e"></span>Grammar</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Spelling','#d97706')"><span class="mec-dot" style="background:#d97706"></span>Spelling</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Tense','#0891b2')"><span class="mec-dot" style="background:#0891b2"></span>Tense</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Word Order','#059669')"><span class="mec-dot" style="background:#059669"></span>Word Order</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Cohesion','#db2777')"><span class="mec-dot" style="background:#db2777"></span>Cohesion</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Coherence','#7c3aed')"><span class="mec-dot" style="background:#7c3aed"></span>Coherence</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Punctuation','#0284c7')"><span class="mec-dot" style="background:#0284c7"></span>Punctuation</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Style','#be185d')"><span class="mec-dot" style="background:#be185d"></span>Style</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Register','#9d174d')"><span class="mec-dot" style="background:#9d174d"></span>Register</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Preposition','#b45309')"><span class="mec-dot" style="background:#b45309"></span>Preposition</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Article','#065f46')"><span class="mec-dot" style="background:#065f46"></span>Article</div>
</div>
</div>
</div>
<div class="tb-grp" data-name="Review">
<button class="tb-btn wb-wide" onclick="openReviewPanel()" title="Review Panel — every track change & error mark in one smart list"><i class="fas fa-clipboard-check"></i><span class="tb-lbl">Review Panel</span><span id="revCountBadge" style="background:#b7791f;color:#fff;border-radius:8px;padding:0 6px;font-size:10px;font-weight:800">0</span></button>
<button class="tb-btn" onclick="openThesaurusFromCtx()" title="Thesaurus / Synonyms"><i class="fas fa-book-open"></i><span class="tb-lbl">Thesaurus</span></button>
</div>
<div class="tb-grp" data-name="Library">
<button class="tb-btn wb-wide" onclick="toggleLibraryPanel()" title="Library — prompts, templates & Writing Assessor"><i class="fas fa-book-open"></i><span class="tb-lbl">Library</span></button>
</div>
<div class="tb-grp" data-name="Layout">
<select id="themeSelect" onchange="setTheme(this.value)" class="tb-sel">
<option value="light">Light</option>
<option value="dark">Dark</option>
<option value="sepia">Sepia</option>
</select>
<button class="tb-btn" id="btnPgSide" onclick="togglePgSide()" title="Show / Hide the Pages sidebar"><i class="fas fa-columns"></i><span class="tb-lbl">Pages</span></button>
<button class="tb-btn" onclick="openMdl('mSetup')" title="Page Setup — margins, header, footer, watermark"><i class="fas fa-cog"></i><span class="tb-lbl">Setup</span></button>
</div>
<div class="tb-grp" data-name="Zoom">
<button class="tb-btn tb-ic" onclick="zmOut(25)" title="Zoom Out"><i class="fas fa-search-minus"></i><span class="tb-lbl">Zoom Out</span></button>
<button class="tb-btn tb-ic" onclick="zoom=100;applyZm()" title="Reset Zoom (Ctrl+0)"><span style="font-size:11px;font-weight:800">100%</span><span class="tb-lbl">Reset</span></button>
<button class="tb-btn tb-ic" onclick="zmIn(25)" title="Zoom In"><i class="fas fa-search-plus"></i><span class="tb-lbl">Zoom In</span></button>
</div>
<div class="tb-grp" data-name="Window">
<button class="tb-btn wb-wide tb-ok" onclick="openMdl('mSave')" title="Save / Export (PDF · Word · HTML · Text)"><i class="fas fa-save"></i><span class="tb-lbl">Save</span></button>
<button class="tb-btn wb-wide wb-qat-opt" onclick="togFs()" title="Fullscreen"><i class="fas fa-expand"></i><span class="tb-lbl">Fullscreen</span></button>
<button class="tb-btn wb-wide" id="btnCompact" onclick="togCompact()" title="Compact ribbon mode — single row of icons (Ctrl+Alt+C)"><i class="fas fa-compress-alt"></i><span class="tb-lbl">Compact</span></button>
</div>
</div>
</div>
<div class="wb-main">
<div class="pg-side" id="pgSide">
<button class="ps-collapse" onclick="togglePgSide()" title="Hide Pages panel">«</button>
<div class="ps-header">
<span class="ps-title">Pages</span>
<div class="ps-nav">
<input type="number" id="pgJump" min="1" value="1" class="ps-jump">
<button onclick="goToPageInput()" class="ps-go"><i class="fas fa-arrow-right"></i></button>
</div>
</div>
<div id="pgList" class="ps-list"></div>
<div class="ps-footer">
<button class="ps-btn" onclick="addPg()"><i class="fas fa-plus"></i></button>
<button class="ps-btn ps-btn-del" onclick="delPg()"><i class="fas fa-trash"></i></button>
<span class="ps-info" id="pgInfo">1/1</span>
</div>
</div>
<div class="wb-area" id="wbArea">
<div class="zoom-container" id="zoomContainer">
<div class="zoom-inner" id="zoomInner">
<div class="pg-wrap" data-pg="1">
<div class="wb-hdr" id="hdr1"></div>
<div class="wb-pg-container">
<div class="wb-pg" id="pg1" contenteditable="true" data-pg="1" spellcheck="true"></div>
<canvas class="wb-cv" id="cv1" data-pg="1"></canvas>
<div class="wb-wm" id="wm1"></div>
</div>
<div class="wb-ftr" id="ftr1"></div>
</div>
</div>
</div>
</div>
<div class="lib-panel" id="libPanel">
<div class="lib-header"><span><i class="fas fa-book-open"></i> Library</span><div class="lib-hdr-actions"><button class="lib-detach" onclick="detachLibrary()" title="Open Library in a separate always-visible window"><i class="fas fa-external-link-alt"></i> Detach</button><button onclick="toggleLibraryPanel()" class="lib-close">&times;</button></div></div>
<div class="lib-search-row"><input type="text" id="libSearch" class="lib-search" placeholder="Search prompts..." oninput="filterLibrary()"></div>
<div class="lib-tabs">
<button class="lib-tab active" data-libtab="doc" onclick="setLibTab('doc',this)">Document</button>
<button class="lib-tab" data-libtab="web" onclick="setLibTab('web',this)">Web Pages</button>
<button class="lib-tab" data-libtab="custom" onclick="setLibTab('custom',this)">My Prompts</button>
<button class="lib-tab" data-libtab="assessor" onclick="setLibTab('assessor',this)">Assessor<span class="lib-tab-badge">AI</span></button>
</div>
<div id="libCards" class="lib-cards"></div>
<div id="libAssessor" class="assessor-box" style="display:none">
<div class="assessor-note"><i class="fas fa-brain" style="color:#805ad5"></i> <b>Writing Assessor</b> — paste learner writing, copy the master prompt, paste it + the writing into an AI chatbot, then paste the JSON result back and apply it to the document.</div>
<textarea id="aiReviewInput" style="height:110px" placeholder="Paste learner writing here..."></textarea>
<button class="assessor-copy" onclick="copyAIMasterPrompt()"><i class="fas fa-copy"></i> Copy Master Prompt</button>
<textarea id="aiReviewJSON" style="height:90px;font-family:monospace;font-size:11px" placeholder="Paste the JSON response here..."></textarea>
<button class="assessor-apply" onclick="applyAIReview()"><i class="fas fa-magic"></i> Apply Review to Document</button>
</div>
<div class="lib-paste-area" id="libPasteArea">
<div style="font-size:11px;color:#718096;margin-bottom:6px;font-weight:600">PASTE AI RESPONSE</div>
<textarea id="libPasteInput" class="lib-paste-inp" placeholder="Paste the AI JSON or HTML response here..."></textarea>
<button class="lib-paste-btn" onclick="applyAIResponse()"><i class="fas fa-magic"></i> Apply AI Response</button>
</div>
<div class="lib-custom-area" id="libCustomArea"><button class="lib-custom-add" onclick="openMdl('mCustomPrompt')"><i class="fas fa-plus"></i> Add Custom Prompt</button></div>
</div>
<div class="thesaurus-pane" id="thesaurusPane">
<div class="thes-header"><span><i class="fas fa-book-open"></i> Thesaurus</span><button onclick="closeThesaurus()" class="thes-close">&times;</button></div>
<div class="thes-search-row">
<input id="thesInput" class="thes-search" placeholder="Search word..." onkeydown="if(event.key==='Enter')lookupThesaurus(document.getElementById('thesInput').value)">
<button onclick="lookupThesaurus(document.getElementById('thesInput').value)" class="thes-go"><i class="fas fa-search"></i></button>
</div>
<div id="thesResults" class="thes-results"><p style="color:#a0aec0;font-size:12px;text-align:center;margin-top:20px">Right-click a word or search above</p></div>
</div>
<button class="ps-expand-tab" id="psExpandTab" onclick="setPgSide(true)" title="Show Pages panel"><i class="fas fa-columns"></i></button>
</div>
<div id="reviewPanel" class="review-pane">
<div class="review-hdr">
<span><i class="fas fa-clipboard-check"></i> Review Panel <span id="revPanelCount" style="background:rgba(255,255,255,.25);border-radius:8px;padding:1px 7px;font-size:10.5px">0</span></span>
<div class="review-hdr-btns">
<button onclick="reviewAcceptAll()" title="Accept all track changes & corrections">✓ Accept All</button>
<button onclick="reviewRemoveAll()" title="Remove all marks">✕ Clear Marks</button>
<button onclick="closeReviewPanel()" title="Close">&times;</button>
</div>
</div>
<div class="review-sum" id="reviewSummary"></div>
<div class="review-list" id="reviewList"></div>
</div>
<div class="wb-stat">
<span id="stWords">Words: 0</span>
<span id="stChars">Chars: 0</span>
<span id="stPg">Page 1/1</span>
<span id="stTrack" class="st-off">Track: Off</span>
<span id="stSave">Ready</span>
<div class="zm-wrap">
<button onclick="zmOut()">-</button>
<span id="zmVal">100%</span>
<button onclick="zmIn()">+</button>
</div>
</div>
<div id="micSettingsPanel" class="mic-settings-panel mic-ribbon">
  <div class="mic-panel-header">
    <div class="mic-panel-title">
      <i class="fas fa-microphone-alt" style="color:#60a5fa"></i>
      <span>Speech & Live Transcription</span>
    </div>
    <button class="mic-panel-close" onclick="closeMicSettingsPopover()">&times;</button>
  </div>
  <div class="mic-panel-body">
    <div class="mic-status-card">
      <div class="mic-status-text" id="micStatusText">READY</div>
      <div class="mic-indicator" id="micIndicator">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>
    <button id="micToggleBtn" class="mic-toggle-btn" onclick="toggleMicActive()">
      <i class="fas fa-power-off"></i>
      <span id="micToggleTxt">Activate Live Transcribe</span>
    </button>
    <div class="mic-field-group">
      <label class="mic-label"><i class="fas fa-sliders-h"></i> Microphone Device</label>
      <select id="micDevSel" class="mic-select" onchange="onMicDeviceChange(this.value)">
        <option value="">Default Microphone</option>
      </select>
    </div>
    <div class="mic-field-group">
      <label class="mic-label"><i class="fas fa-globe"></i> Language</label>
      <select id="micLangSel" class="mic-select" onchange="onMicLanguageChange(this.value)">
        <option value="en-US">English (United States)</option>
        <option value="en-GB">English (United Kingdom)</option>
        <option value="en-AU">English (Australia)</option>
        <option value="es-ES">Spanish (Spain / LatAm)</option>
        <option value="fr-FR">French (France)</option>
        <option value="de-DE">German (Germany)</option>
        <option value="it-IT">Italian (Italy)</option>
        <option value="pt-BR">Portuguese (Brazil)</option>
        <option value="ru-RU">Russian</option>
        <option value="zh-CN">Chinese (Mandarin)</option>
        <option value="ja-JP">Japanese</option>
        <option value="ar-SA">Arabic</option>
      </select>
    </div>
    <div class="mic-opts-row">
      <label class="mic-opt-check">
        <input type="checkbox" id="micAutoPunct" checked onchange="toggleAutoPunct(this.checked)">
        <span>Auto-Punctuation & Capitalization</span>
      </label>
      <label class="mic-opt-check">
        <input type="checkbox" id="micVoiceCmds" checked onchange="toggleVoiceCmds(this.checked)">
        <span>Voice Commands ("new line", "period")</span>
      </label>
    </div>
    <div id="micPreview" class="mic-preview-box">
      <span class="mic-preview-placeholder">Live spoken words will appear here...</span>
    </div>
  </div>
</div>
<div id="wbContextMenu" class="wb-ctx-menu">
<div class="ctx-item" onclick="wbCut();closeCtx()"><i class="fas fa-cut"></i> Cut</div>
<div class="ctx-item" onclick="wbCopy();closeCtx()"><i class="fas fa-copy"></i> Copy</div>
<div class="ctx-item" onclick="wbPaste();closeCtx()"><i class="fas fa-paste"></i> Paste</div>
<div class="ctx-sep"></div>
<div class="ctx-item" onclick="openThesaurusFromCtx();closeCtx()"><i class="fas fa-book-open"></i> Thesaurus / Synonyms</div>
<div class="ctx-item" id="ctxSynSub" style="position:relative"><i class="fas fa-exchange-alt"></i> Synonyms <i class="fas fa-caret-right" style="margin-left:auto"></i><div class="ctx-syn-list" id="ctxSynList">Loading...</div></div>
</div>
<div id="mTpl" class="mdl"><div class="mdl-box mdl-lg"><div class="mdl-hd"><span><i class="fas fa-file-alt"></i>Templates</span><button onclick="closeMdl('mTpl')">&times;</button></div><div class="mdl-bd"><div class="tpl-cats"><button class="tpl-cat active" onclick="filterTpl('all',this)">All</button><button class="tpl-cat" onclick="filterTpl('edu',this)">School</button><button class="tpl-cat" onclick="filterTpl('lang',this)">Language</button><button class="tpl-cat" onclick="filterTpl('work',this)">Work</button><button class="tpl-cat" onclick="filterTpl('plan',this)">Planning</button><button class="tpl-cat" onclick="filterTpl('write',this)">Writing</button><button class="tpl-cat" onclick="filterTpl('life',this)">Life & Reflection</button></div><div id="tplGrid" class="tpl-grid"></div></div></div></div>
<div id="mSave" class="mdl"><div class="mdl-box"><div class="mdl-hd"><span><i class="fas fa-save"></i>Save Document</span><button onclick="closeMdl('mSave')">&times;</button></div><div class="mdl-bd"><input type="text" id="saveName" class="mdl-inp" placeholder="File name"><div class="save-grid"><button class="sv-btn sv-pdf" onclick="savePDF()"><i class="fas fa-file-pdf"></i><span>PDF</span></button><button class="sv-btn sv-doc" onclick="saveDoc()"><i class="fas fa-file-word"></i><span>Word</span></button><button class="sv-btn sv-html" onclick="saveHTML()"><i class="fas fa-file-code"></i><span>HTML</span></button><button class="sv-btn sv-txt" onclick="saveTXT()"><i class="fas fa-file-alt"></i><span>Text</span></button></div></div></div></div>
<div id="mTbl" class="mdl"><div class="mdl-box mdl-sm"><div class="mdl-hd"><span><i class="fas fa-table"></i>Insert Table</span><button onclick="closeMdl('mTbl')">&times;</button></div><div class="mdl-bd"><div class="inp-row"><label>Rows</label><input type="number" id="tblR" value="3" min="1" max="20" class="mdl-inp mdl-inp-sm"></div><div class="inp-row"><label>Columns</label><input type="number" id="tblC" value="3" min="1" max="10" class="mdl-inp mdl-inp-sm"></div><button class="mdl-btn" onclick="doTbl()">Insert</button></div></div></div>
<div id="mLink" class="mdl"><div class="mdl-box mdl-sm"><div class="mdl-hd"><span><i class="fas fa-link"></i>Insert Link</span><button onclick="closeMdl('mLink')">&times;</button></div><div class="mdl-bd"><input type="url" id="linkUrl" class="mdl-inp" placeholder="https://example.com"><input type="text" id="linkTxt" class="mdl-inp" placeholder="Display text"><button class="mdl-btn" onclick="doLink()">Insert</button></div></div></div>
<div id="mImg" class="mdl"><div class="mdl-box"><div class="mdl-hd"><span><i class="fas fa-image"></i>Insert Image</span><button onclick="closeMdl('mImg')">&times;</button></div><div class="mdl-bd"><div class="upl-box" onclick="document.getElementById('imgFile').click()"><i class="fas fa-cloud-upload-alt"></i><span>Click to upload</span><input type="file" id="imgFile" accept="image/*" onchange="handleUpl(this)" hidden></div><div class="or-div"><span>OR</span></div><input type="url" id="imgUrl" class="mdl-inp" placeholder="Image URL"><input type="text" id="imgCaption" class="mdl-inp" placeholder="Image caption (optional)"><button class="mdl-btn" onclick="doImg()">Insert</button></div></div></div>
<div id="mFile" class="mdl"><div class="mdl-box"><div class="mdl-hd"><span><i class="fas fa-folder-open"></i>Open File</span><button onclick="closeMdl('mFile')">&times;</button></div><div class="mdl-bd"><div class="upl-box" onclick="document.getElementById('uplFile').click()"><i class="fas fa-folder-open"></i><span>Click to upload PDF, DOCX, or PPTX</span><input type="file" id="uplFile" accept=".pdf,.docx,.pptx" onchange="handleFileUpload(this)" hidden></div><div id="fileStatus" style="margin-top:10px;text-align:center;color:#718096"></div></div></div></div>
<div id="mSetup" class="mdl"><div class="mdl-box mdl-lg"><div class="mdl-hd"><span><i class="fas fa-cog"></i>Page Setup</span><button onclick="closeMdl('mSetup')">&times;</button></div><div class="mdl-bd"><div class="setup-grid"><div class="setup-col"><div class="setup-sec"><h4><i class="fas fa-file"></i> Orientation</h4><div class="orient-btns"><button class="orient-btn active" id="orientP" onclick="setOrient('portrait')"><i class="fas fa-file-alt"></i><span>Portrait</span></button><button class="orient-btn" id="orientL" onclick="setOrient('landscape')"><i class="fas fa-file-alt fa-rotate-90"></i><span>Landscape</span></button></div></div><div class="setup-sec"><h4><i class="fas fa-arrows-alt"></i> Margins (mm)</h4><div class="marg-grid"><div class="marg-item"><label>Top</label><input type="number" id="margT" value="14" min="2" max="50" class="mdl-inp mdl-inp-sm"></div><div class="marg-item"><label>Bottom</label><input type="number" id="margB" value="14" min="2" max="50" class="mdl-inp mdl-inp-sm"></div><div class="marg-item"><label>Left</label><input type="number" id="margL" value="16" min="2" max="50" class="mdl-inp mdl-inp-sm"></div><div class="marg-item"><label>Right</label><input type="number" id="margR" value="16" min="2" max="50" class="mdl-inp mdl-inp-sm"></div></div></div><div class="setup-sec"><h4><i class="fas fa-border-style"></i> Page Border</h4><select id="borderStyle" class="mdl-inp"><option value="none">No Border</option><option value="simple">Simple Line</option><option value="double">Double Line</option><option value="elegant">Elegant</option><option value="professional">Professional</option></select><div class="clr-row"><label>Color</label><input type="color" id="borderColor" value="#1e3a5f" class="clr-inp"></div></div></div><div class="setup-col"><div class="setup-sec"><h4><i class="fas fa-heading"></i> Header</h4><div class="hf-checks"><label class="hf-check"><input type="checkbox" id="hfName" checked><span>Student Name</span></label><label class="hf-check"><input type="checkbox" id="hfCourse" checked><span>Course Name</span></label><label class="hf-check"><input type="checkbox" id="hfDate" checked><span>Date</span></label></div><input type="text" id="hfCustom" class="mdl-inp" placeholder="Custom header"><select id="hdrStyle" class="mdl-inp"><option value="professional">Professional</option><option value="modern">Modern</option><option value="classic">Classic</option><option value="minimal">Minimal</option></select></div><div class="setup-sec"><h4><i class="fas fa-shoe-prints"></i> Footer</h4><label class="hf-check"><input type="checkbox" id="ftrPage" checked><span>Page Number</span></label><input type="text" id="ftrCustom" class="mdl-inp" placeholder="Custom footer"></div><div class="setup-sec"><h4><i class="fas fa-tint"></i> Watermark</h4><input type="text" id="wmText" class="mdl-inp" placeholder="Watermark text"><div class="wm-row"><label>Opacity</label><input type="range" id="wmOp" min="0.02" max="0.2" step="0.01" value="0.08"><span id="wmOpVal">8%</span></div><div class="wm-row"><label>Size</label><input type="number" id="wmSz" value="80" min="30" max="150" class="mdl-inp mdl-inp-sm">px</div></div></div></div><button class="mdl-btn mdl-btn-lg" onclick="applySetup()"><i class="fas fa-check"></i> Apply</button></div></div></div>
<div id="mFind" class="mdl"><div class="mdl-box mdl-sm"><div class="mdl-hd"><span><i class="fas fa-search"></i>Find &amp; Replace</span><button onclick="closeMdl('mFind')">&times;</button></div><div class="mdl-bd"><input type="text" id="findText" class="mdl-inp" placeholder="Find text"><input type="text" id="replaceText" class="mdl-inp" placeholder="Replace with"><div style="display:flex;gap:10px;margin-top:10px"><button class="mdl-btn" onclick="findText()" style="flex:1">Find</button><button class="mdl-btn" onclick="replaceText()" style="flex:1">Replace</button><button class="mdl-btn" onclick="replaceAllText()" style="flex:1">Replace All</button></div></div></div></div>
<div id="mBanners" class="mdl"><div class="mdl-box mdl-lg"><div class="mdl-hd"><span><i class="fas fa-flag"></i> Insert Banner</span><button onclick="closeMdl('mBanners')">&times;</button></div><div class="mdl-bd"><div class="banner-search-row"><input type="text" id="bannerSearch" placeholder="Search banners..." oninput="renderBannerPicker(this.value)"></div><div class="banner-grid" id="bannerPickerGrid"></div></div></div></div>
<div id="mCustomPrompt" class="mdl"><div class="mdl-box mdl-sm"><div class="mdl-hd"><span><i class="fas fa-plus-circle"></i>Add Custom Prompt</span><button onclick="closeMdl('mCustomPrompt')">&times;</button></div><div class="mdl-bd"><input type="text" id="cpTitle" class="mdl-inp" placeholder="Prompt title"><input type="text" id="cpIcon" class="mdl-inp" placeholder="Emoji icon e.g. 🎯"><select id="cpType" class="mdl-inp"><option value="doc">Document Page</option><option value="web">Web Page</option></select><textarea id="cpPrompt" class="mdl-inp" style="height:120px;resize:vertical" placeholder="Full prompt text..."></textarea><button class="mdl-btn" onclick="saveCustomPrompt()"><i class="fas fa-save"></i> Save Prompt</button></div></div></div>
<div id="mAIReview" class="mdl"><div class="mdl-box mdl-lg" style="width:780px"><div class="mdl-hd"><span><i class="fas fa-brain"></i> Writing Assessor</span><button onclick="closeMdl('mAIReview')">&times;</button></div><div class="mdl-bd"><div style="font-size:13px;color:#4a5568;margin-bottom:12px">Paste learner writing below, copy the master prompt, paste it + the writing into an AI chatbot, then paste the JSON result back here.</div><textarea id="aiReviewInput" class="mdl-inp" style="height:130px;resize:vertical;font-family:inherit" placeholder="Paste learner writing here..."></textarea><div style="display:flex;gap:10px;margin-bottom:10px"><button class="mdl-btn" style="flex:1;background:#805ad5" onclick="copyAIMasterPrompt()"><i class="fas fa-copy"></i> Copy Master Prompt</button></div><div style="font-size:11px;color:#718096;margin-bottom:6px;font-weight:600">PASTE JSON RESPONSE</div><textarea id="aiReviewJSON" class="mdl-inp" style="height:110px;resize:vertical;font-family:monospace;font-size:11px" placeholder="Paste the JSON response here..."></textarea><button class="mdl-btn" onclick="applyAIReview()"><i class="fas fa-magic"></i> Apply Review to Document</button></div></div></div>
</div>
  `;
  const js = `
(function() { (function(){
"use strict";
var LN=(window.LEARNER_NAME||window.__LEARNER_NAME||"Student"),CN=(window.LESSON_COURSE_NAME||"");
var curPg=1,totPg=1,zoom=100,drawOn=false,trackOn=false;
var isHandActive=false,isPanning=false,panStartX=0,panStartY=0,scrollStartX=0,scrollStartY=0;
window.togHand=function(){
  isHandActive=!isHandActive;
  var btn=document.getElementById("btnHand");
  var wa=wbIn("wbArea");
  if(!btn||!wa)return;
  if(isHandActive&&drawOn){
    drawOn=false;
    var btnD=document.getElementById("btnDraw");
    if(btnD)btnD.classList.remove("active");
    var dp=document.getElementById("drawPnl");
    if(dp)dp.classList.remove("show");
    wbQuery(".wb-cv").forEach(function(c){c.classList.remove("active")});
    wbQuery(".wb-pg").forEach(function(p){p.contentEditable="true"});
  }
  if(isHandActive){
    btn.classList.add("active");
    btn.style.background="#fef08a";
    btn.style.color="#854d0e";
    wa.classList.add("panning");
  }else{
    btn.classList.remove("active");
    btn.style.background="";
    btn.style.color="";
    wa.classList.remove("panning","dragging");
  }
};
var tool="pen",dClr="#000000",dSz=3,drawing=false,lx=0,ly=0,sx=0,sy=0;
var resizingImg=null,resizeStart={x:0,y:0,w:0,h:0};
var txtHist=[],txtRedo=[],cvHist={},cvRedo={};
var orient="portrait",theme="light";
var margins={t:14,b:14,l:16,r:16};
var hdrCfg={name:true,course:true,date:true,custom:"",style:"professional"};
var ftrCfg={page:true,custom:""};
var wmCfg={text:"",opacity:0.08,size:80};
var borderCfg={style:"none",color:"#1e3a5f"};
var ov=document.querySelector('#whiteboard-overlay[data-wb-engine="smart"]')||document.getElementById("whiteboard-overlay");
/* Presenter lessons also ship the older writeboard widget, whose pages share ids/classes with
   ours (pg1, .pg-wrap, .wb-pg, .wb-cv, #pgList…). Every page lookup below is scoped to THIS
   engine's overlay so pagination/saving/undo can never reach into the other widget. */
function wbQuery(sel){return Array.prototype.slice.call(ov?ov.querySelectorAll(sel):[]);}
function wbIn(id){return (ov&&ov.querySelector('[id="'+id+'"]'))||document.getElementById(id);}
var area=wbIn("wbArea");
var zoomC=wbIn("zoomContainer");
var pgListEl=wbIn("pgList");
function gPg(n){return document.getElementById("pg"+n)}
function gCv(n){return document.getElementById("cv"+n)}
function gHdr(n){return document.getElementById("hdr"+n)}
function gFtr(n){return document.getElementById("ftr"+n)}
function gWm(n){return document.getElementById("wm"+n)}
function gWrap(n){return document.querySelector('.pg-wrap[data-pg="'+n+'"]')}
function saveTxt(){var d=[];wbQuery(".wb-pg").forEach(function(p){d.push(p.innerHTML)});txtHist.push(JSON.stringify(d));if(txtHist.length>50)txtHist.shift();txtRedo=[]}
function saveCv(n){var cv=gCv(n);if(!cv)return;if(!cvHist[n])cvHist[n]=[];cvHist[n].push(cv.toDataURL());if(cvHist[n].length>30)cvHist[n].shift();cvRedo[n]=[]}
function syncCv(cv){var container=cv.closest(".wb-pg-container");if(!container)return;var w=container.offsetWidth,h=container.offsetHeight;if(w===0||h===0)return;if(cv.width!==w||cv.height!==h){var tmp=cv.toDataURL();cv.width=w;cv.height=h;if(tmp&&tmp!=="data:,"){var img=new Image();img.onload=function(){cv.getContext("2d").drawImage(img,0,0,w,h)};img.src=tmp}}}
function lighten(hex,amount){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);r=Math.round(r+(255-r)*amount);g=Math.round(g+(255-g)*amount);b=Math.round(b+(255-b)*amount);return "#"+r.toString(16).padStart(2,"0")+g.toString(16).padStart(2,"0")+b.toString(16).padStart(2,"0")}
window.wbUndo=function(){if(txtHist.length<2)return;txtRedo.push(txtHist.pop());var d=JSON.parse(txtHist[txtHist.length-1]||"[]");wbQuery(".wb-pg").forEach(function(p,i){if(d[i]!==undefined)p.innerHTML=d[i]});updStats()};
window.wbRedo=function(){if(!txtRedo.length)return;var d=JSON.parse(txtRedo.pop());txtHist.push(JSON.stringify(d));wbQuery(".wb-pg").forEach(function(p,i){if(d[i]!==undefined)p.innerHTML=d[i]});updStats()};
window.undoDraw=function(){var n=curPg;if(!cvHist[n]||cvHist[n].length<1)return;var cv=gCv(n);if(!cv)return;if(!cvRedo[n])cvRedo[n]=[];cvRedo[n].push(cv.toDataURL());cvHist[n].pop();var ctx=cv.getContext("2d");ctx.clearRect(0,0,cv.width,cv.height);if(cvHist[n].length>0){var img=new Image();img.onload=function(){ctx.drawImage(img,0,0,cv.width,cv.height)};img.src=cvHist[n][cvHist[n].length-1]}};
window.redoDraw=function(){var n=curPg;if(!cvRedo[n]||!cvRedo[n].length)return;var cv=gCv(n);if(!cv)return;var d=cvRedo[n].pop();if(!cvHist[n])cvHist[n]=[];cvHist[n].push(d);var img=new Image();img.onload=function(){cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height)};img.src=d};
window.wbCut=function(){document.execCommand("cut");saveTxt()};
window.wbCopy=function(){document.execCommand("copy")};
window.wbPaste=function(){navigator.clipboard.readText().then(function(t){document.execCommand("insertText",false,t);saveTxt();scheduleAutoPaginate(gPg(curPg),60)}).catch(function(){})};
/* own paste entry so the ribbon always uses THIS engine's paginator */
var wbPasteLocal=window.wbPaste;window.wbPasteSmart=wbPasteLocal;
window.fmt=function(c,v){document.execCommand(c,false,v||null);var pg=gPg(curPg);if(pg)pg.focus();updTb();saveTxt()};
window.setFont=function(f){document.execCommand("fontName",false,f)};
window.chgSize=function(d){var inp=document.getElementById("wbSize");var v=(parseInt(inp.value)||14)+d;v=Math.max(8,Math.min(72,v));inp.value=String(v);document.execCommand("fontSize",false,"7");document.querySelectorAll("font[size='7']").forEach(function(f){f.removeAttribute("size");f.style.fontSize=v+"px"})};
window.setTxtClr=function(c){document.execCommand("foreColor",false,c);document.getElementById("txtBar").style.background=c};
window.setHlClr=function(c){document.execCommand("hiliteColor",false,c);document.getElementById("hlBar").style.background=c};
function updTb(){var b=document.getElementById("btnB"),i=document.getElementById("btnI"),u=document.getElementById("btnU");if(b)b.classList.toggle("active",document.queryCommandState("bold"));if(i)i.classList.toggle("active",document.queryCommandState("italic"));if(u)u.classList.toggle("active",document.queryCommandState("underline"))}
window.togTrack=function(){trackOn=!trackOn;document.getElementById("btnTrack").classList.toggle("active",trackOn);var st=document.getElementById("stTrack");st.textContent=trackOn?"Track: On":"Track: Off";st.className=trackOn?"st-on":"st-off"};
window.setTheme=function(t){theme=t;ov.className="theme-"+t};
window.setOrient=function(o){orient=o;document.getElementById("orientP").classList.toggle("active",o==="portrait");document.getElementById("orientL").classList.toggle("active",o==="landscape")};
window.applySetup=function(){hdrCfg.name=document.getElementById("hfName").checked;hdrCfg.course=document.getElementById("hfCourse").checked;hdrCfg.date=document.getElementById("hfDate").checked;hdrCfg.custom=document.getElementById("hfCustom").value;hdrCfg.style=document.getElementById("hdrStyle").value;ftrCfg.page=document.getElementById("ftrPage").checked;ftrCfg.custom=document.getElementById("ftrCustom").value;margins.t=parseInt(document.getElementById("margT").value)||20;margins.b=parseInt(document.getElementById("margB").value)||20;margins.l=parseInt(document.getElementById("margL").value)||25;margins.r=parseInt(document.getElementById("margR").value)||25;wmCfg.text=document.getElementById("wmText").value;wmCfg.opacity=parseFloat(document.getElementById("wmOp").value)||0.08;wmCfg.size=parseInt(document.getElementById("wmSz").value)||80;borderCfg.style=document.getElementById("borderStyle").value;borderCfg.color=document.getElementById("borderColor").value;for(var i=1;i<=totPg;i++)applyPgSetup(i);updTh();closeMdl("mSetup");applyZm();setTimeout(function(){wbQuery(".wb-cv").forEach(syncCv)},100)};
function applyPgSetup(n){var wrap=gWrap(n);if(!wrap)return;wrap.className="pg-wrap";if(orient==="landscape")wrap.classList.add("landscape");if(borderCfg.style!=="none")wrap.classList.add("border-"+borderCfg.style);wrap.style.setProperty("--border-clr",borderCfg.color);var pg=gPg(n);if(pg)pg.style.padding=margins.t+"mm "+margins.r+"mm "+margins.b+"mm "+margins.l+"mm";var hdr=gHdr(n);if(hdr){hdr.className="wb-hdr";var show=hdrCfg.name||hdrCfg.course||hdrCfg.date||hdrCfg.custom;if(show){hdr.classList.add("show","style-"+hdrCfg.style);var title=[],meta=[];if(hdrCfg.name)title.push(LN);if(hdrCfg.course)title.push(CN);if(hdrCfg.date)meta.push(new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}));if(hdrCfg.custom)meta.push(hdrCfg.custom);hdr.innerHTML='<div class="hdr-inner"><div class="hdr-title">'+title.join(" — ")+'</div><div class="hdr-meta">'+meta.join(" | ")+'</div></div>'}else{hdr.innerHTML=""}}var ftr=gFtr(n);if(ftr){ftr.className="wb-ftr";if(ftrCfg.page||ftrCfg.custom){ftr.classList.add("show");ftr.innerHTML='<span>'+(ftrCfg.page?"Page "+n+" of "+totPg:"")+'</span><span>'+(ftrCfg.custom||"")+'</span>'}else{ftr.innerHTML=""}}var wm=gWm(n);if(wm){if(wmCfg.text&&wmCfg.text.trim()!==""){wm.classList.add("show");wm.textContent=wmCfg.text;wm.style.fontSize=wmCfg.size+"px";wm.style.color="rgba(0,0,0,"+wmCfg.opacity+")";wm.style.letterSpacing="4px"}else{wm.classList.remove("show");wm.textContent=""}}}
window.openMdl=function(id){document.getElementById(id).classList.add("show");if(id==="mTpl")renderTpl("all");if(id==="mSetup"){var op=document.getElementById("wmOp");op.oninput=function(){document.getElementById("wmOpVal").textContent=Math.round(op.value*100)+"%"}}if(id==="mBanners")renderBannerPicker()};
window.closeMdl=function(id){document.getElementById(id).classList.remove("show")};
window.doLink=function(){var u=document.getElementById("linkUrl").value,t=document.getElementById("linkTxt").value;if(u)document.execCommand("insertHTML",false,'<a href="'+u+'" target="_blank" style="color:#3182ce">'+(t||u)+'</a>');closeMdl("mLink");saveTxt()};
window.doTbl=function(){var r=parseInt(document.getElementById("tblR").value)||3,c=parseInt(document.getElementById("tblC").value)||3;var h='<table><tbody>';for(var i=0;i<r;i++){h+="<tr>";for(var j=0;j<c;j++)h+=i===0?"<th>Header</th>":"<td>&nbsp;</td>";h+="</tr>"}h+="</tbody></table><p><br></p>";document.execCommand("insertHTML",false,h);closeMdl("mTbl");saveTxt()};
window.handleUpl=function(inp){if(inp.files&&inp.files[0]){var rd=new FileReader();rd.onload=function(e){insImg(e.target.result)};rd.readAsDataURL(inp.files[0])}};
window.doImg=function(){var u=document.getElementById("imgUrl").value,c=document.getElementById("imgCaption").value;if(u)insImg(u,c);closeMdl("mImg")};
window.handleFileUpload=function(inp){if(inp.files&&inp.files[0]){var f=inp.files[0];var ext=f.name.split('.').pop().toLowerCase();if(ext==='pdf'){var rd=new FileReader();rd.onload=function(e){loadPDF(new Uint8Array(e.target.result))};rd.readAsArrayBuffer(f);}else if(ext==='docx'){var rd=new FileReader();rd.onload=function(e){loadDocx(e.target.result)};rd.readAsArrayBuffer(f);}else if(ext==='pptx'){var rd=new FileReader();rd.onload=function(e){loadPptx(e.target.result)};rd.readAsArrayBuffer(f);}else{alert("Unsupported file type.");}}};
async function loadPptx(data){var st=document.getElementById("fileStatus");st.textContent="Processing PPTX...";try{if(!window.JSZip){st.textContent="Loading JSZip...";await new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s)});}var zip=await JSZip.loadAsync(data);var slideFiles=Object.keys(zip.files).filter(function(f){return f.match(/^ppt\\/slides\\/slide\\d+\\.xml$/)});slideFiles.sort(function(a,b){return parseInt(a.match(/slide(\\d+)\\.xml/)[1])-parseInt(b.match(/slide(\\d+)\\.xml/)[1])});for(var i=0;i<slideFiles.length;i++){var xml=await zip.file(slideFiles[i]).async("text");var parser=new DOMParser();var doc=parser.parseFromString(xml,"text/xml");var texts=doc.getElementsByTagName("a:t");var slideText="";for(var j=0;j<texts.length;j++)slideText+="<p>"+texts[j].textContent+"</p>";if(slideText){wbAddPg();var p=gPg(totPg);if(p)p.innerHTML='<div style="border:1px solid #e2e8f0;padding:20px;margin:10px;background:#fff"><h3 style="color:#2b6cb0;border-bottom:1px solid #e2e8f0;padding-bottom:5px">Slide '+(i+1)+'</h3>'+slideText+'</div>';}}st.textContent="";closeMdl("mFile");goToPg(totPg-slideFiles.length+1);saveTxt();}catch(e){st.textContent="Error: "+e.message;}}
async function loadDocx(data){var st=document.getElementById("fileStatus");st.textContent="Converting DOCX...";try{if(!window.mammoth){st.textContent="Loading Mammoth...";await new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s)});}var result=await mammoth.convertToHtml({arrayBuffer:data});var html=result.value;var pg=gPg(curPg);if(pg){if(pg.innerText.trim()==="")pg.innerHTML=html;else{wbAddPg();var p=gPg(totPg);if(p)p.innerHTML=html;goToPg(totPg);}}st.textContent="";closeMdl("mFile");saveTxt();scheduleAutoPaginate(gPg(totPg),200);}catch(e){st.textContent="Error: "+e.message;}}
async function loadPDF(data){var st=document.getElementById("fileStatus");st.textContent="Loading PDF...";try{if(!window.pdfjsLib){st.textContent="Loading PDF.js...";await new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=function(){window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";res()};s.onerror=rej;document.head.appendChild(s)});}var pdf=await pdfjsLib.getDocument(data).promise;st.textContent="Rendering "+pdf.numPages+" pages...";for(var i=1;i<=pdf.numPages;i++){var pg=await pdf.getPage(i);var vp=pg.getViewport({scale:2});var cv=document.createElement("canvas");var ctx=cv.getContext("2d");cv.height=vp.height;cv.width=vp.width;await pg.render({canvasContext:ctx,viewport:vp}).promise;wbAddPg();var p=gPg(totPg);if(p){p.innerHTML='<img src="'+cv.toDataURL()+'" style="width:100%;height:auto;pointer-events:none">';p.style.padding='0';}var pw=gWrap(totPg);if(pw){pw.classList.add('pdf-mode');}setTimeout(function(){var pcv=gCv(totPg);if(pcv)syncCv(pcv);},120);}st.textContent="";closeMdl("mFile");goToPg(totPg-pdf.numPages+1);}catch(e){st.textContent="Error: "+e.message;}}
function insImg(src,caption){var html='<figure style="margin:10px 0;display:inline-block;max-width:100%"><img src="'+src+'" style="max-width:100%;height:auto"><figcaption style="font-size:10pt;color:#718096;margin-top:4px;text-align:center">'+(caption||"")+'</figcaption></figure>';document.execCommand("insertHTML",false,html);saveTxt();closeMdl("mImg")}
window.togDraw=function(){if(!drawOn&&isHandActive){togHand();}drawOn=!drawOn;var b=document.getElementById("btnDraw");if(b)b.classList.toggle("active",drawOn);var dp=document.getElementById("drawPnl");if(dp)dp.classList.toggle("show",drawOn);if(drawOn)window.setRibbonTab("insert");wbQuery(".wb-cv").forEach(function(c){c.classList.toggle("active",drawOn);syncCv(c)});wbQuery(".wb-pg").forEach(function(p){p.contentEditable=drawOn?"false":"true"})};
window.setTool=function(t){tool=t;document.querySelectorAll(".dp-btn").forEach(function(b){b.classList.toggle("active",b.dataset.tool===t)})};
window.setDClr=function(c){dClr=c;document.getElementById("drawClr").value=c};
document.getElementById("drawClr").addEventListener("input",function(e){dClr=e.target.value});
document.getElementById("drawSz").addEventListener("input",function(e){dSz=parseInt(e.target.value);document.getElementById("szVal").textContent=dSz+"px"});
window.clearDraw=function(){var cv=gCv(curPg);if(cv){cv.getContext("2d").clearRect(0,0,cv.width,cv.height);saveCv(curPg)}};
function initCv(cv){syncCv(cv);var ctx=cv.getContext("2d");var n=parseInt(cv.dataset.pg);if(!cvHist[n])cvHist[n]=[];
cv.addEventListener("mousedown",function(e){if(!drawOn)return;drawing=true;var r=cv.getBoundingClientRect();var scX=cv.width/r.width,scY=cv.height/r.height;sx=lx=(e.clientX-r.left)*scX;sy=ly=(e.clientY-r.top)*scY;if(["line","arrow","rect","fillRect","circle","fillCircle"].indexOf(tool)>=0)cv._snap=ctx.getImageData(0,0,cv.width,cv.height)});
cv.addEventListener("mousemove",function(e){if(!drawing||!drawOn)return;var r=cv.getBoundingClientRect();var scX=cv.width/r.width,scY=cv.height/r.height;var x=(e.clientX-r.left)*scX,y=(e.clientY-r.top)*scY;ctx.lineCap="round";ctx.lineJoin="round";if(["line","arrow","rect","fillRect","circle","fillCircle"].indexOf(tool)>=0){if(cv._snap)ctx.putImageData(cv._snap,0,0);drawShape(ctx,sx,sy,x,y)}else{ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(x,y);var w=dSz,c=dClr,a=1;if(tool==="eraser"){c="#ffffff";w=dSz*4}else if(tool==="brush")w=dSz*2;else if(tool==="marker"){w=dSz*3;a=0.7}else if(tool==="highlighter"){w=dSz*5;a=0.3}else if(tool==="pencil")w=Math.max(1,dSz*0.5);ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();ctx.globalAlpha=1;lx=x;ly=y}});
cv.addEventListener("mouseup",function(){if(drawing){drawing=false;delete cv._snap;saveCv(n)}});
cv.addEventListener("mouseleave",function(){if(drawing){drawing=false;delete cv._snap;saveCv(n)}});}
function drawShape(ctx,x1,y1,x2,y2){ctx.strokeStyle=dClr;ctx.fillStyle=dClr;ctx.lineWidth=dSz;ctx.beginPath();if(tool==="line"){ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}else if(tool==="arrow"){ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();var ang=Math.atan2(y2-y1,x2-x1);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-15*Math.cos(ang-Math.PI/6),y2-15*Math.sin(ang-Math.PI/6));ctx.moveTo(x2,y2);ctx.lineTo(x2-15*Math.cos(ang+Math.PI/6),y2-15*Math.sin(ang+Math.PI/6));ctx.stroke()}else if(tool==="rect"){ctx.strokeRect(x1,y1,x2-x1,y2-y1)}else if(tool==="fillRect"){ctx.fillRect(x1,y1,x2-x1,y2-y1)}else if(tool==="circle"||tool==="fillCircle"){var rx=Math.abs(x2-x1)/2,ry=Math.abs(y2-y1)/2;ctx.ellipse(Math.min(x1,x2)+rx,Math.min(y1,y2)+ry,rx,ry,0,0,Math.PI*2);tool==="fillCircle"?ctx.fill():ctx.stroke()}}
function createPg(n){var wrap=document.createElement("div");wrap.className="pg-wrap"+(orient==="landscape"?" landscape":"");if(borderCfg.style!=="none")wrap.classList.add("border-"+borderCfg.style);wrap.style.setProperty("--border-clr",borderCfg.color);wrap.dataset.pg=String(n);var hdr=document.createElement("div");hdr.className="wb-hdr";hdr.id="hdr"+n;var container=document.createElement("div");container.className="wb-pg-container";var pg=document.createElement("div");pg.className="wb-pg";pg.id="pg"+n;pg.contentEditable="true";pg.dataset.pg=String(n);pg.innerHTML="<p><br></p>";pg.style.padding=margins.t+"mm "+margins.r+"mm "+margins.b+"mm "+margins.l+"mm";pg.setAttribute("spellcheck","true");var cv=document.createElement("canvas");cv.className="wb-cv";cv.id="cv"+n;cv.dataset.pg=String(n);if(drawOn)cv.classList.add("active");var wm=document.createElement("div");wm.className="wb-wm";wm.id="wm"+n;container.appendChild(pg);container.appendChild(cv);container.appendChild(wm);var ftr=document.createElement("div");ftr.className="wb-ftr";ftr.id="ftr"+n;wrap.appendChild(hdr);wrap.appendChild(container);wrap.appendChild(ftr);return{wrap:wrap,pg:pg,cv:cv}}
window.addPg=function(){totPg++;var n=totPg;var els=createPg(n);var zi=wbIn("zoomInner")||zoomC;zi.appendChild(els.wrap);initCv(els.cv);setupPgEv(els.pg);applyPgSetup(n);for(var i=1;i<=totPg;i++){var f=gFtr(i);if(f&&ftrCfg.page)f.innerHTML='<span>Page '+i+' of '+totPg+'</span><span>'+(ftrCfg.custom||'')+'</span>'}updTh();goToPg(n);applyZm();saveTxt()};
/* captured locally: the older writeboard engine may shadow window.addPg if its script runs last */
var wbAddPg=window.addPg;
window.delPg=function(){if(totPg<2)return;var sel=gWrap(curPg);if(sel)sel.remove();wbQuery(".pg-wrap").forEach(function(w,i){var n=i+1;w.dataset.pg=String(n);var p=w.querySelector(".wb-pg");if(p){p.id="pg"+n;p.dataset.pg=String(n)}var c=w.querySelector(".wb-cv");if(c){c.id="cv"+n;c.dataset.pg=String(n)}var h=w.querySelector(".wb-hdr");if(h)h.id="hdr"+n;var f=w.querySelector(".wb-ftr");if(f)f.id="ftr"+n;var wm=w.querySelector(".wb-wm");if(wm)wm.id="wm"+n});totPg--;curPg=Math.min(curPg,totPg);for(var i=1;i<=totPg;i++)applyPgSetup(i);updTh();updStats();applyZm();saveTxt()};
/* captured locally: the older writeboard engine may shadow window.delPg if its script runs last */
var wbDelPg=window.delPg;
window.goToPg=function(n){if(n<1||n>totPg)return;curPg=n;var el=gWrap(n);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});updTh();updStats();wbIn("pgJump").value=String(n)};
window.goToPageInput=function(){goToPg(parseInt(wbIn("pgJump").value)||1)};
function updTh(){pgListEl.innerHTML="";for(var i=1;i<=totPg;i++){var d=document.createElement("div");d.className="ps-th"+(i===curPg?" active":"")+(orient==="landscape"?" landscape":"");d.tabIndex=0;d.dataset.pg=String(i);var pageEl=gPg(i);var snippet="";if(pageEl){snippet=(pageEl.innerText||pageEl.textContent||"").trim();}var previewHtml='<div class="ps-th-preview">';if(snippet){previewHtml+=snippet.slice(0,140);}else{previewHtml+='<div style="opacity:0.4;font-style:italic;">Page '+i+' (Empty)</div>';}previewHtml+='</div>';(function(pg,el){el.onclick=function(){goToPg(pg);wbQuery(".ps-th").forEach(function(t){t.classList.remove("selected")});el.classList.add("selected");};el.onkeydown=function(e){if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();e.stopPropagation();goToPg(pg);wbDelPg();}};})(i,d);d.innerHTML=previewHtml+'<div class="ps-th-n">'+i+'</div>';pgListEl.appendChild(d)}wbIn("pgInfo").textContent=curPg+"/"+totPg;wbIn("pgJump").max=String(totPg)}
// Pages Panel Hotkeys: Delete key deletes page, + key adds page when Pages panel or thumbnail is focused
document.addEventListener("keydown",function(e){var active=document.activeElement;if(!active)return;var inPagesPanel=active.closest("#pgList")||active.closest(".ps-panel")||active.classList.contains("ps-th");if(inPagesPanel){if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();wbDelPg();}else if(e.key==="+"||e.key==="="){e.preventDefault();wbAddPg();}}});
function updStats(){var txt="";wbQuery(".wb-pg").forEach(function(p){txt+=p.innerText+" "});var w=txt.trim().split(/\\s+/).filter(function(x){return x}).length;var c=txt.replace(/\\s/g,"").length;wbIn("stWords").textContent="Words: "+w;wbIn("stChars").textContent="Chars: "+c;wbIn("stPg").textContent="Page "+curPg+"/"+totPg}
window.zmIn=function(step){zoom=Math.min(10000,zoom+(step||25));applyZm()};
window.zmOut=function(step){zoom=Math.max(10,zoom-(step||25));applyZm()};
function applyZm(){var zv=wbIn("zmVal");if(zv)zv.textContent=zoom+"%";var zc=wbIn("zoomContainer");var zi=wbIn("zoomInner");if(!zc||!zi)return;var s=zoom/100;var maxPgW=0,totalPgH=0;var pgWraps=zi.querySelectorAll(".pg-wrap");pgWraps.forEach(function(w){var wWidth=w.offsetWidth||(orient==="landscape"?1122:794);var wHeight=w.offsetHeight||(orient==="landscape"?794:1122);if(wWidth>maxPgW)maxPgW=wWidth;totalPgH+=wHeight+30;});var unscaledW=(maxPgW||800)+40;var unscaledH=(totalPgH||1100)+10;var scaledW=Math.ceil(unscaledW*s);var scaledH=Math.ceil(unscaledH*s);zc.style.width=scaledW+"px";zc.style.height=scaledH+"px";zi.style.transform="scale("+s+")";zi.style.transformOrigin="top left";}
/* MOD 5: Ctrl+Scroll zooms infinitely up to 10,000% */
(function(){var wa=wbIn("wbArea");if(!wa)return;wa.addEventListener("wheel",function(e){if(e.ctrlKey||e.metaKey){e.preventDefault();e.stopPropagation();var step = e.deltaY < 0 ? (zoom >= 500 ? 100 : (zoom >= 200 ? 50 : 25)) : (zoom >= 500 ? -100 : (zoom >= 200 ? -50 : -25));zoom=Math.max(10,Math.min(10000,zoom+step));applyZm();}},{passive:false});})();
window.togFs=function(){if(document.fullscreenElement)document.exitFullscreen();else ov.requestFullscreen()};
/* MOD 1: SPEECH TO TEXT & MICROPHONE SETTINGS */
var micRecognition=null,micListening=false,micFinalText="",micInterimText="",micAutoPunct=true,micVoiceCmds=true,micSelectedLang="en-US",micSelectedDevId="";

window.positionMicPanel=function(){
  var panel=document.getElementById("micSettingsPanel");
  if(!panel||!panel.classList.contains("show"))return;
  var anchor=document.getElementById("qatMicBtn")||document.getElementById("ribbonMicBtn");
  if(!anchor)return;
  var r=anchor.getBoundingClientRect();
  var pw=panel.offsetWidth||340,ph=panel.offsetHeight||300;
  var left=Math.min(Math.max(8,r.left),Math.max(8,window.innerWidth-pw-8));
  var top=r.bottom+6;
  if(top+ph>window.innerHeight-8)top=Math.max(8,r.top-ph-6);
  panel.style.left=Math.round(left)+"px";
  panel.style.top=Math.round(top)+"px";
  panel.style.right="auto";
  panel.style.bottom="auto";
};
window.addEventListener("resize",function(){window.positionMicPanel()});
window.toggleMicSettingsPopover=function(e){
  if(e)e.stopPropagation();
  var panel=document.getElementById("micSettingsPanel");
  if(!panel)return;
  var isShowing=panel.classList.contains("show");
  if(isShowing){
    panel.classList.remove("show");
  }else{
    panel.classList.add("show");
    window.positionMicPanel();
    try{var r=loadMicDevices();if(r&&r.catch)r.catch(function(){})}catch(err){}
  }
};

window.closeMicSettingsPopover=function(){
  var panel=document.getElementById("micSettingsPanel");
  if(panel)panel.classList.remove("show");
};

document.addEventListener("click",function(e){
  var panel=document.getElementById("micSettingsPanel");
  var circleBtn=document.getElementById("micCircleBtn")||document.getElementById("ribbonMicBtn");
  if(panel&&panel.classList.contains("show")){
    if(!panel.contains(e.target)&&(!circleBtn||!circleBtn.contains(e.target))){
      panel.classList.remove("show");
    }
  }
});

function updateMicUIState(statusMsg,isError){
  var circleBtn=document.getElementById("micCircleBtn")||document.getElementById("ribbonMicBtn");
  var circleBadge=document.getElementById("ribbonMicBadge")||document.getElementById("micCircleBadge");
  var statusText=document.getElementById("micStatusText");
  var toggleBtn=document.getElementById("micToggleBtn");
  var toggleTxt=document.getElementById("micToggleTxt");
  var indicator=document.getElementById("micIndicator");

  var qatMic=document.getElementById("qatMicBtn");
  if(qatMic)qatMic.classList.toggle("wb-qat-rec",!!micListening);
  if(micListening){
    if(circleBtn)circleBtn.classList.add("listening");
    if(circleBadge){circleBadge.textContent="REC";circleBadge.style.background="#16a34a";}
    if(toggleBtn)toggleBtn.classList.add("active");
    if(toggleTxt)toggleTxt.textContent="Stop Live Transcribe";
    if(indicator)indicator.classList.add("show");
    if(statusText){
      statusText.textContent=statusMsg||"LISTENING...";
      statusText.style.color=isError?"#dc2626":"#1e4fbf";
    }
  }else{
    if(circleBtn)circleBtn.classList.remove("listening");
    if(circleBadge){circleBadge.textContent="OFF";circleBadge.style.background="#475569";}
    if(toggleBtn)toggleBtn.classList.remove("active");
    if(toggleTxt)toggleTxt.textContent="Activate Live Transcribe";
    if(indicator)indicator.classList.remove("show");
    if(statusText){
      statusText.textContent=statusMsg||"READY";
      statusText.style.color=isError?"#f87171":"#94a3b8";
    }
  }
}

function loadMicDevices(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return;
  navigator.mediaDevices.enumerateDevices().then(function(devices){
    var sel=document.getElementById("micDevSel");
    if(!sel)return;
    var currentVal=sel.value||micSelectedDevId;
    sel.innerHTML='<option value="">Default Microphone</option>';
    var audioDevs=devices.filter(function(d){return d.kind==="audioinput";});
    audioDevs.forEach(function(d,idx){
      var opt=document.createElement("option");
      opt.value=d.deviceId;
      opt.textContent=d.label||("Microphone "+(idx+1));
      if(d.deviceId===currentVal)opt.selected=true;
      sel.appendChild(opt);
    });
  }).catch(function(err){
    console.warn("Error enumerating mic devices:",err);
  });
}

window.onMicDeviceChange=function(devId){
  micSelectedDevId=devId;
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&devId){
    navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:devId}}}).then(function(stream){
    }).catch(function(err){
      console.warn("Could not switch audio stream device:",err);
    });
  }
  if(micListening&&micRecognition){
    try{micRecognition.stop();}catch(e){}
    setTimeout(function(){if(micListening)startMicRecognition();},300);
  }
};

window.onMicLanguageChange=function(lang){
  micSelectedLang=lang;
  if(micRecognition){
    micRecognition.lang=lang;
  }
  if(micListening){
    try{micRecognition.stop();}catch(e){}
    setTimeout(function(){if(micListening)startMicRecognition();},300);
  }
};

window.toggleAutoPunct=function(checked){
  micAutoPunct=checked;
};

window.toggleVoiceCmds=function(checked){
  micVoiceCmds=checked;
};

function initMic(){
  var SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRec){
    updateMicUIState("NOT SUPPORTED",true);
    var prev=document.getElementById("micPreview");
    if(prev)prev.innerHTML='<span style="color:#f87171">Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.</span>';
    return false;
  }

  micRecognition=new SpeechRec();
  micRecognition.continuous=true;
  micRecognition.interimResults=true;
  micRecognition.lang=micSelectedLang||"en-US";

  micRecognition.onstart=function(){
    micListening=true;
    updateMicUIState("LISTENING LIVE...");
    var prev=document.getElementById("micPreview");
    if(prev)prev.innerHTML='<span style="color:#38bdf8">🎙️ Listening... speak clearly into your microphone</span>';
  };

  micRecognition.onend=function(){
    if(micListening){
      if(micFinalText.trim()||micInterimText.trim()){
        insertTranscribedText();
      }
      setTimeout(function(){
        if(micListening){
          try{micRecognition.start();}catch(err){console.warn("Restart mic error:",err);}
        }
      },300);
      return;
    }
    updateMicUIState("PAUSED");
  };

  micRecognition.onerror=function(e){
    console.warn("Speech recognition error:",e.error);
    if(e.error==="not-allowed"||e.error==="service-not-allowed"){
      micListening=false;
      updateMicUIState("ACCESS DENIED",true);
      var prev=document.getElementById("micPreview");
      if(prev)prev.innerHTML='<span style="color:#f87171">⚠️ Microphone access denied. Please allow microphone permissions in browser.</span>';
      return;
    }
    if(micListening&&(e.error==="no-speech"||e.error==="network"||e.error==="aborted")){
      setTimeout(function(){
        if(micListening){
          try{micRecognition.start();}catch(err){}
        }
      },400);
    }
  };

  micRecognition.onresult=function(e){
    var interim="",finalChunk="";
    for(var i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal){
        finalChunk+=e.results[i][0].transcript+" ";
      }else{
        interim+=e.results[i][0].transcript;
      }
    }

    if(finalChunk.trim()){
      var processed=processTranscribedChunk(finalChunk.trim());
      if(processed){
        insertTextDirectly(processed+" ");
      }
      micFinalText="";
    }

    micInterimText=interim;
    var prev=document.getElementById("micPreview");
    if(prev){
      if(interim.trim()){
        prev.innerHTML='<span style="color:#38bdf8">🗣️ </span>'+interim;
      }else{
        prev.innerHTML='<span style="color:#4ade80">✓ Transcribed! Keep speaking...</span>';
      }
    }
    updateMicUIState("TRANSCRIBING...");
  };

  return true;
}

function processTranscribedChunk(raw){
  if(!raw)return "";
  var text=raw;

  if(micVoiceCmds){
    text=text.replace(/\\b(new line|next line)\\b/gi,"\\n");
    text=text.replace(/\\b(period|full stop)\\b/gi,".");
    text=text.replace(/\\bcomma\\b/gi,",");
    text=text.replace(/\\bquestion mark\\b/gi,"?");
    text=text.replace(/\\b(exclamation mark|exclamation point)\\b/gi,"!");
  }

  if(micAutoPunct){
    text=autoPunctuate(text);
  }

  return text;
}

function autoPunctuate(t){
  if(!t)return "";
  t=t.trim();
  t=t.charAt(0).toUpperCase()+t.slice(1);
  if(!/[.!?\\n]$/.test(t)){
    if(/^(who|what|where|when|why|how|is|are|can|could|would|do|does|did|will|should)\\b/i.test(t)){
      t+="?";
    }else{
      t+=".";
    }
  }
  t=t.replace(/([.!?])\\s+([a-z])/g,function(m,p,l){return p+" "+l.toUpperCase();});
  return t;
}

function startMicRecognition(){
  if(!micRecognition){
    var ok=initMic();
    if(!ok)return;
  }
  if(micRecognition){
    micRecognition.lang=micSelectedLang||"en-US";
    try{
      micRecognition.start();
    }catch(err){
      console.warn("SpeechRec start error:",err);
    }
  }
}

window.toggleMicActive=function(){
  if(micListening){
    micListening=false;
    if(micRecognition){
      try{micRecognition.stop();}catch(e){}
    }
    updateMicUIState("PAUSED");
  }else{
    micFinalText="";
    micInterimText="";
    micListening=true;
    startMicRecognition();
    loadMicDevices();
  }
};

window.toggleMic=window.toggleMicActive;

function insertTextDirectly(text){
  if(!text)return;
  var pg=gPg(curPg);
  if(pg&&pg.contentEditable==="true"){
    pg.focus();
    var sel=window.getSelection();
    if(sel&&sel.rangeCount){
      var range=sel.getRangeAt(0);
      if(pg.contains(range.commonAncestorContainer)){
        range.deleteContents();
        if(text.indexOf("\\n")!==-1){
          var parts=text.split("\\n");
          for(var p=0;p<parts.length;p++){
            if(p>0)range.insertNode(document.createElement("br"));
            if(parts[p])range.insertNode(document.createTextNode(parts[p]));
          }
        }else{
          var node=document.createTextNode(text);
          range.insertNode(node);
          range.setStartAfter(node);
          range.setEndAfter(node);
        }
        sel.removeAllRanges();
        sel.addRange(range);
      }else{
        document.execCommand("insertText",false,text);
      }
    }else{
      document.execCommand("insertText",false,text);
    }
  }else{
    insertTextBox();
    var pg2=gPg(curPg);
    if(pg2){
      var tb=pg2.querySelector(".text-box:last-child");
      if(tb)tb.textContent=(tb.textContent||"")+" "+text;
    }
  }
  updTh();
  updStats();
  saveTxt();
}

function insertTranscribedText(){
  if(micFinalText.trim()||micInterimText.trim()){
    var raw=(micFinalText+" "+micInterimText).trim();
    var text=processTranscribedChunk(raw);
    insertTextDirectly(text+" ");
    micFinalText="";
    micInterimText="";
  }
}
/* MOD 2: LIBRARY PANEL */
var libTabCurrent="doc";
var LIB_CUSTOM_KEY="wb_lib_custom_"+LN.replace(/\\s/g,"_");
var LIB_DOC_PROMPTS=[{"id":"essay-assessor","icon":"📝","title":"Comprehensive Essay Assessor","desc":"Full grammar, vocabulary, cohesion, and register correction with inline suggestions, error tags, and a detailed score summary.","prompt":"You are an expert English language assessor and tutor. Analyse the writing comprehensively and return ONLY a valid JSON object (no markdown, no prose) matching this exact schema:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Essay Assessment\\",\\"originalText\\":\\"<verbatim>\\",\\"annotatedSegments\\":[{\\"text\\":\\"<error>\\",\\"errorType\\":\\"<Vocabulary|Grammar|Spelling|Tense|Word Order|Cohesion|Coherence|Punctuation|Style|Register|Preposition|Article>\\",\\"correction\\":\\"<corrected>\\",\\"explanation\\":\\"<rule>\\",\\"color\\":\\"<hex>\\"}],\\"scores\\":{\\"overall\\":0,\\"grammar\\":0,\\"vocabulary\\":0,\\"cohesion\\":0,\\"taskAchievement\\":0},\\"generalFeedback\\":\\"<2-3 sentences>\\",\\"commendations\\":[\\"<strength>\\"],\\"improvements\\":[\\"<improvement>\\"]}\\n\\nError color map: Vocabulary=#8b5cf6, Grammar=#e53e3e, Spelling=#d97706, Tense=#0891b2, Word Order=#059669, Cohesion=#db2777, Coherence=#7c3aed, Punctuation=#0284c7, Style=#be185d, Register=#9d174d, Preposition=#b45309, Article=#065f46.\\n\\nNow analyse this writing:\\n[PASTE LEARNER WRITING HERE]"},{"id":"outline-gen","icon":"📋","title":"Writing Outline Generator","desc":"Extracts or creates a rich text essay outline (thesis, topic sentences, evidence) from a given topic or text.","prompt":"You are an expert academic writing coach. Generate a detailed essay outline and return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Essay Outline\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"outlineHTML\\":\\"<full HTML outline with headings, bullets, thesis, topic sentences, evidence slots>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nTopic or text:\\n[PASTE TOPIC OR TEXT HERE]"},{"id":"vocab-enhancer","icon":"🔤","title":"Vocabulary Enhancer","desc":"Suggests synonym upgrades, collocations, and example sentences for every flagged word.","prompt":"You are an expert English vocabulary coach. Identify every word that could be upgraded. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Vocabulary Enhancement Report\\",\\"annotatedSegments\\":[{\\"text\\":\\"<original word>\\",\\"errorType\\":\\"Vocabulary\\",\\"correction\\":\\"<best synonym>\\",\\"explanation\\":\\"Synonyms: [list]. Collocation: [example]. Sentence: [example].\\",\\"color\\":\\"#8b5cf6\\"}],\\"scores\\":{\\"vocabulary\\":0},\\"generalFeedback\\":\\"<overall vocabulary feedback>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nWriting:\\n[PASTE WRITING HERE]"},{"id":"grammar-deep","icon":"📐","title":"Grammar Deep Dive","desc":"Identifies all grammatical errors with rule explanations and practice rewrites.","prompt":"You are a grammar expert and ESL teacher. Analyse for ALL grammatical errors. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Grammar Deep Dive\\",\\"annotatedSegments\\":[{\\"text\\":\\"<error text>\\",\\"errorType\\":\\"Grammar\\",\\"correction\\":\\"<corrected form>\\",\\"explanation\\":\\"<rule name>: <brief explanation>. Rewrite: [corrected sentence].\\",\\"color\\":\\"#e53e3e\\"}],\\"scores\\":{\\"grammar\\":0},\\"generalFeedback\\":\\"<overall grammar analysis>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nWriting:\\n[PASTE WRITING HERE]"},{"id":"exam-rubric","icon":"🏆","title":"Exam Rubric Feedback","desc":"Assesses writing against an IELTS/TOEFL/CEFR rubric, returns band scores and criterion-specific feedback.","prompt":"You are an IELTS/TOEFL/CEFR examiner. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Exam Rubric Assessment\\",\\"annotatedSegments\\":[],\\"scores\\":{\\"overall\\":0,\\"taskAchievement\\":0,\\"coherenceCohesion\\":0,\\"lexicalResource\\":0,\\"grammaticalRange\\":0},\\"bandDescriptors\\":{\\"taskAchievement\\":\\"<descriptor>\\",\\"coherenceCohesion\\":\\"<descriptor>\\",\\"lexicalResource\\":\\"<descriptor>\\",\\"grammaticalRange\\":\\"<descriptor>\\"},\\"generalFeedback\\":\\"<examiner comment>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nWriting:\\n[PASTE WRITING HERE]"},{"id":"exercise-creator","icon":"✏️","title":"Error-Targeted Exercise Creator","desc":"Generates fill-in-the-blanks, rewriting, and consolidation exercises based on errors found.","prompt":"You are an ESL teacher creating targeted practice exercises. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Practice Exercises\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"exercisesHTML\\":\\"<full HTML of: (1) Fill-in-the-Blanks, (2) Sentence Rewriting, (3) Consolidation — all with answer keys>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nWriting:\\n[PASTE WRITING HERE]"},{"id":"speech-analyser","icon":"🗣️","title":"Speech Transcript Analyser","desc":"Analyses a conversation transcript for fluency, pronunciation patterns, fillers, and pragmatic errors.","prompt":"You are a speech and language expert. Analyse for fluency markers, filler words, pronunciation patterns, and pragmatic errors. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Speech Transcript Analysis\\",\\"annotatedSegments\\":[{\\"text\\":\\"<filler/error>\\",\\"errorType\\":\\"Style\\",\\"correction\\":\\"<suggested alternative>\\",\\"explanation\\":\\"<fluency/pragmatics note>\\",\\"color\\":\\"#be185d\\"}],\\"scores\\":{\\"fluency\\":0,\\"pronunciation\\":0,\\"pragmatics\\":0,\\"overall\\":0},\\"generalFeedback\\":\\"<analysis summary>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nTranscript:\\n[PASTE TRANSCRIPT HERE]"},{"id":"roleplay-builder","icon":"🎭","title":"Conversation & Role Play Builder","desc":"From a topic or transcript, creates a follow-up dialogue script and speaking practice questions.","prompt":"You are a speaking skills coach. Create a follow-up dialogue and practice questions. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Conversation & Role Play\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"dialogueHTML\\":\\"<full styled HTML of: (1) Role Play Scenario card, (2) Sample Dialogue with speaker labels, (3) 10 Speaking Practice Questions, (4) Useful Language box>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nTopic/Transcript:\\n[PASTE HERE]"},{"id":"lesson-plan","icon":"📚","title":"Lesson Plan Creator","desc":"Generates a full lesson plan with objectives, stages, timing, and materials.","prompt":"You are an experienced language teacher. Create a full lesson plan. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Lesson Plan\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"lessonHTML\\":\\"<full rich-text HTML lesson plan with: Header (topic, level, duration, aims), Objectives (bulleted), Stages table (Stage|Timing|Activity|Materials|Rationale), Homework, Materials list>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nTopic/Level/Duration:\\n[PASTE HERE]"},{"id":"reading-comp","icon":"📖","title":"Reading Comprehension Generator","desc":"Takes any text and produces multiple-choice and short answer questions with an answer key.","prompt":"You are a reading comprehension specialist. Generate a full comprehension exercise set. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Reading Comprehension\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"exercisesHTML\\":\\"<full HTML with: (1) 6 Multiple-Choice Questions with 4 options each, (2) 5 Short Answer Questions, (3) 2 Extended Response Questions, (4) Full Answer Key — all styled>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nText:\\n[PASTE TEXT HERE]"},{"id":"rubric-builder","icon":"⚖️","title":"Custom Rubric Builder","desc":"Builds a weighted assessment rubric with 3-5 criteria and descriptive levels.","prompt":"You are an assessment design expert. Build a detailed assessment rubric. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Assessment Rubric\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"rubricHTML\\":\\"<full HTML of a professional rubric table: Criteria x Performance Levels (Excellent/Good/Satisfactory/Needs Improvement). Each cell has a descriptor and point value. Include weighting column and total score row.>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nTask/Subject/Criteria:\\n[DESCRIBE HERE]"},{"id":"grammar-drill","icon":"🔧","title":"Grammar Explanation & Drill","desc":"Creates a clear grammar explanation followed by controlled practice exercises.","prompt":"You are a grammar teacher. Explain the grammar point and create practice exercises. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Grammar Focus & Practice\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"grammarHTML\\":\\"<full HTML with: (1) Grammar explanation box with rule, form, and examples table, (2) 8 gap-fill exercises, (3) 6 sentence transformation exercises, (4) 3 free-writing prompts, (5) Answer key>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nGrammar point/Level:\\n[DESCRIBE HERE]"},{"id":"socratic-debate","icon":"⚖️","title":"Socratic Debate Prep","desc":"Structured template for preparing debate positions, claims, evidence, and counter-arguments.","prompt":"You are a debate coach. Generate a detailed socratic debate prep sheet and return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Socratic Debate Prep Sheet\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"outlineHTML\\":\\"<full HTML sheet with sections for: Motion/Topic, Main Stance, Argument 1 (Claim, Evidence, Warrant), Argument 2 (Claim, Evidence, Warrant), Counter-arguments/Rebuttals, and Conclusion>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nTopic:\\n[PASTE TOPIC HERE]"},{"id":"feynman-sheet","icon":"🤔","title":"Feynman Technique Sheet","desc":"Breaks down a highly complex topic into simple terms, identifies knowledge gaps, and uses analogies.","prompt":"You are a learning science expert. Take a complex topic and generate a Feynman learning sheet. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Feynman Technique Sheet\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"outlineHTML\\":\\"<full HTML with: (1) The Concept, (2) Simple Explanation (ELI5), (3) Identified Knowledge Gaps/Friction Points, (4) Analogy Box, (5) Refined/Simplified Summary>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nTopic:\\n[PASTE TOPIC HERE]"},{"id":"language-log","icon":"🗣️","title":"Language Practice Log","desc":"Custom practice logs containing vocabulary, grammar exercises, and correction drills tailored to learner level.","prompt":"You are an ESL curriculum designer. Create a custom Language Practice Log. Return ONLY a valid JSON object:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Language Practice Log\\",\\"annotatedSegments\\":[],\\"scores\\":{},\\"generalFeedback\\":\\"\\",\\"outlineHTML\\":\\"<full HTML with: (1) Vocabulary Focus (3 target words with definitions/sentences), (2) Grammar Rule & Examples Table, (3) 5 Custom Translation Exercises, (4) Free Writing Prompt, (5) Answer Key>\\",\\"commendations\\":[],\\"improvements\\":[]}\\n\\nLanguage Level & Topic:\\n[DESCRIBE HERE]"}];
var LIB_WEB_PROMPTS=[{"id":"resume-cv","icon":"👔","title":"Resume / CV Builder","desc":"Modern, responsive CV with sections, icons, and progress bars.","prompt":"Build a complete, modern, responsive HTML Resume/CV page. Use only inline styles and Font Awesome CDN for icons. Include: hero header with name/title/contact, experience timeline, education section, skills with progress bars, languages section, and a print button.\\n\\nReturn ONLY a valid JSON object:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Resume / CV\\",\\"html\\":\\"<complete standalone HTML page as a single string>\\"}\\n\\nPersonalise for:\\nName: [NAME]\\nTitle: [JOB TITLE]\\nExperience: [EXPERIENCE]\\nSkills: [SKILLS]\\nEducation: [EDUCATION]"},{"id":"infographic","icon":"📊","title":"Data-Driven Infographic","desc":"SVG/CSS charts and statistics; numbers update dynamically when edited.","prompt":"Create a stunning, responsive HTML infographic page with SVG/CSS charts, large statistics numbers, and icons. Include: hero stat cards, SVG bar chart, donut/pie chart, timeline, and key facts section. All numbers in contenteditable spans.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Data Infographic\\",\\"html\\":\\"<complete standalone HTML page>\\"}\\n\\nTopic/Data:\\n[DESCRIBE YOUR DATA OR TOPIC HERE]"},{"id":"newspaper","icon":"📰","title":"Newspaper / Newsletter Page","desc":"Masthead, multi-column layout, placeholder images, fully customisable.","prompt":"Create a fully styled, print-quality HTML newspaper/newsletter page. Include: masthead, multi-column article layout, pull quotes, image placeholders, bylines, and sidebar. Use classic newspaper typography with inline styles.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Newspaper Page\\",\\"html\\":\\"<complete standalone HTML page>\\"}\\n\\nPublication name/Topic/Headlines:\\n[DESCRIBE HERE]"},{"id":"worksheet","icon":"📄","title":"Digital Worksheet","desc":"Interactive HTML worksheet with fillable fields and embedded media placeholders.","prompt":"Create an interactive HTML worksheet for students. Include: styled header, multiple exercise types (gap-fill, matching, multiple choice, short answer), timer, submit/check button with JS validation, and score display.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Interactive Worksheet\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nSubject/Topic/Level:\\n[DESCRIBE HERE]"},{"id":"event-landing","icon":"🎉","title":"Event Landing Page","desc":"School event page with countdown timer, RSVP form, and photo gallery.","prompt":"Create a vibrant, responsive HTML event landing page. Include: full-width hero with event title and date, live countdown timer (JS), event details, schedule/agenda, RSVP form, photo gallery grid, and footer with contact info.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Event Landing Page\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nEvent name/Date/Details:\\n[DESCRIBE HERE]"},{"id":"magazine-spread","icon":"🗞️","title":"Magazine 2-Page Spread","desc":"Full-bleed hero image, headline overlays, article teasers, elegant typography.","prompt":"Create an elegant HTML magazine double-page spread. Include: full-bleed hero with text overlay, large pull quote, multi-column article body with drop cap, sidebar with related articles, image captions, author bio, and page numbers.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Magazine Spread\\",\\"html\\":\\"<complete standalone HTML page>\\"}\\n\\nTopic/Article title/Content:\\n[DESCRIBE HERE]"},{"id":"brochure","icon":"📑","title":"Brochure","desc":"Professional trifold-style layout with services, pricing tables, and testimonials.","prompt":"Create a professional HTML brochure in trifold style (3-column layout). Include: company/school header, services with icons, pricing table with 3 tiers, testimonials with star ratings, contact section, and CTA button.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Brochure\\",\\"html\\":\\"<complete standalone HTML page>\\"}\\n\\nCompany/School name/Services/Pricing:\\n[DESCRIBE HERE]"},{"id":"product-landing","icon":"🛍️","title":"Product / Book Landing Page","desc":"Hero section, features grid, pricing table, review carousel, and call-to-action.","prompt":"Create a compelling product or book landing page in HTML. Include: hero with headline and CTA, features/benefits grid with icons, pricing section, star-rated reviews carousel, FAQ accordion (JS), and footer.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Product Landing Page\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nProduct/Book name/Features/Price:\\n[DESCRIBE HERE]"},{"id":"restaurant-menu","icon":"🍽️","title":"Restaurant / Cafe Menu","desc":"Styled menu with categories, dish descriptions, prices, and allergy icons.","prompt":"Create a beautiful restaurant or cafe menu page in HTML. Include: restaurant header with logo placeholder, menu categories (Starters, Mains, Desserts, Drinks), dish cards with name/description/price/allergy icons, specials banner, and footer.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Restaurant Menu\\",\\"html\\":\\"<complete standalone HTML page>\\"}\\n\\nRestaurant name/Cuisine/Menu items:\\n[DESCRIBE HERE]"},{"id":"ecommerce-pricing","icon":"💰","title":"E-commerce / Pricing Table Page","desc":"Three-tier pricing cards with feature lists, popular badge, and CTA buttons.","prompt":"Create a polished pricing page. Include: 3-tier pricing cards (Basic/Pro/Enterprise) with feature lists, Most Popular badge, toggle for monthly/annual billing (JS), comparison table, and FAQ section.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Pricing Table\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nProduct/Service name/Pricing tiers/Features:\\n[DESCRIBE HERE]"},{"id":"faq-accordion","icon":"❓","title":"FAQ Accordion Page","desc":"Expandable question-and-answer sections with smooth animations.","prompt":"Create a well-designed FAQ page with smooth accordion animations. Include: page header, search bar (JS filter), categorised FAQ sections, each question as animated accordion, contact CTA, and breadcrumb navigation.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"FAQ Page\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nTopic/Questions:\\n[LIST YOUR FAQS OR DESCRIBE THE TOPIC HERE]"},{"id":"photo-album","icon":"📷","title":"Photo Album / Memory Book","desc":"Flip-through gallery with captions, date stamps, and heart reactions.","prompt":"Create a beautiful photo album or memory book page in HTML. Include: decorative cover section, photo grid with placeholder images, captions, date stamps, heart/like reaction buttons (JS toggle), and print button.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Photo Album\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nAlbum title/Theme/Captions:\\n[DESCRIBE HERE]"},{"id":"travel-blog","icon":"✈️","title":"Travel Blog Post","desc":"Destination title, day-by-day timeline, image gallery, tips section, map embed.","prompt":"Create an engaging travel blog post page in HTML. Include: full-width destination hero, author bio, day-by-day itinerary timeline, photo gallery grid, top tips section with icons, Google Maps iframe placeholder, and related posts sidebar.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Travel Blog\\",\\"html\\":\\"<complete standalone HTML page>\\"}\\n\\nDestination/Trip details/Days:\\n[DESCRIBE HERE]"},{"id":"recipe-page","icon":"🍳","title":"Recipe Page","desc":"Ingredients list, step-by-step instructions, cook time, serving size, print button.","prompt":"Create a beautifully designed recipe page in HTML. Include: recipe hero with key info (prep time, cook time, servings, difficulty), ingredients checklist (JS toggle), numbered step-by-step instructions, nutrition table, tips section, print button, and star rating widget.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Recipe Page\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nRecipe name/Ingredients/Steps/Details:\\n[DESCRIBE HERE]"},{"id":"diy-tutorial","icon":"🔨","title":"DIY / Tutorial Guide","desc":"Materials list, numbered steps with images, pro tip banners, embedded video placeholder.","prompt":"Create a comprehensive DIY or tutorial guide page in HTML. Include: project header with difficulty and time estimate, materials checklist, numbered steps with image placeholders, pro tip callout boxes, warning banners, YouTube video placeholder, and printable checklist button.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"DIY Tutorial\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nProject title/Materials/Steps:\\n[DESCRIBE HERE]"},{"id":"book-review","icon":"📚","title":"Book Review Page","desc":"Book cover, star rating, summary, detailed review, similar book carousel.","prompt":"Create a literary book review page in HTML. Include: book cover placeholder with metadata, interactive star rating (JS), synopsis, detailed review with highlighted quotes, pros/cons section, reviewer bio, and Similar Books horizontal scroll carousel.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Book Review\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nBook title/Author/Review content:\\n[DESCRIBE HERE]"},{"id":"job-board","icon":"💼","title":"Job Board Page","desc":"Search bar, job listing cards with filters (location, type, salary), apply link.","prompt":"Create a professional job board page in HTML. Include: search bar with filters (location, job type, salary range — all JS filtering), job listing cards with role/location/salary/type badge/posted date/save button, pagination, and Post a Job CTA.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Job Board\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nCompany/Jobs to list:\\n[DESCRIBE HERE]"},{"id":"real-estate","icon":"🏠","title":"Real Estate Listing Page","desc":"Property gallery, details grid (beds, baths, sqft), map, agent contact form.","prompt":"Create a premium real estate property listing page in HTML. Include: photo gallery with thumbnail navigation (JS), property headline and price, key details grid (beds/baths/sqft/garage/year built), description, features checklist, neighbourhood info, Google Maps embed placeholder, agent profile card with contact form, and similar properties grid.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Property Listing\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nProperty details:\\n[DESCRIBE HERE]"},{"id":"directory","icon":"🗂️","title":"Directory / Resource Library","desc":"Searchable grid of cards with category filters and download/preview links.","prompt":"Create a searchable resource directory or library page in HTML. Include: header with search bar (JS live filter), category filter buttons, card grid (each card: icon/title/description/category badge/download+preview buttons), empty state message, and results count.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Resource Library\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nDirectory name/Categories/Resources:\\n[DESCRIBE HERE]"},{"id":"blog-comments","icon":"✍️","title":"Blog Post with Comments","desc":"Article layout with comment section, related posts sidebar, and social sharing.","prompt":"Create a full blog post article page in HTML. Include: post hero with category tag, title, author/date/reading time, article body with pull quotes/images/subheadings, social share buttons, author bio card, static comment section (styled, pre-populated with 3 sample comments and reply form), related posts grid sidebar, and tags.\\n\\nReturn ONLY:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Blog Post\\",\\"html\\":\\"<complete standalone HTML page>\\"}\\n\\nBlog title/Topic/Author/Content:\\n[DESCRIBE HERE]"},{"id":"product-launch","icon":"🚀","title":"Product Launch Page","desc":"Futuristic landing page with header, specs grid, interactive pricing cards, and a newsletter sign-up.","prompt":"Build an incredibly slick, futuristic product launch landing page. Use Tailwind CSS via inline/embedded styling and beautiful icons. Include a hero section with animated countdown, key specs grid, responsive three-tier pricing cards with hovering effects, a newsletter sign-up form, and social links.\\n\\nReturn ONLY a valid JSON object:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Product Launch Page\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nProduct details:\\n[DESCRIBE HERE]"},{"id":"quiz-deck","icon":"🎮","title":"Interactive Quiz Deck","desc":"Flashcard-style slides with quiz questions, options, explanation reveals, and score keeper.","prompt":"Build an interactive HTML/JS Quiz/Flashcard deck. It should display one slide/question at a time, have click-to-reveal answers/explanations, sound indicator indicators (styled visually), a live score counter, and a progress bar. Include 5-10 high-quality educational questions with beautiful layout design.\\n\\nReturn ONLY a valid JSON object:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Interactive Quiz Deck\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nTopic/Level:\\n[DESCRIBE HERE]"},{"id":"kanban-tracker","icon":"📋","title":"Kanban Project Board","desc":"Interactive Kanban board with drag-to-sort columns (To Do, Doing, Done) and task creation modal.","prompt":"Build a fully interactive, beautifully designed Kanban Project Board page. Include three standard columns (To Do, In Progress, Done) with smooth add-task modals, drag-and-drop or click-to-move card behaviors, priority badges, and simple local storage persistence inside the page.\\n\\nReturn ONLY a valid JSON object:\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"Kanban Board\\",\\"html\\":\\"<complete standalone HTML page with embedded JavaScript>\\"}\\n\\nProject details:\\n[DESCRIBE HERE]"}];
var LIB_MASTER_PROMPT="You are an elite educational content production engine. I will give you a content request and you will return ONLY valid JSON -- no prose, no markdown fences, no explanation -- just the raw JSON object.\\n\\nCONTENT TYPES AND SCHEMAS:\\n\\n1. FOR DOCUMENT PAGES (annotated text with corrections and feedback):\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"<string>\\",\\"originalText\\":\\"<string>\\",\\"annotatedSegments\\":[{\\"text\\":\\"<error text>\\",\\"errorType\\":\\"<Vocabulary|Grammar|Spelling|Tense|Word Order|Cohesion|Coherence|Punctuation|Style|Register|Preposition|Article>\\",\\"correction\\":\\"<corrected form>\\",\\"explanation\\":\\"<rule + example>\\",\\"color\\":\\"<hex>\\"}],\\"scores\\":{\\"overall\\":0,\\"grammar\\":0,\\"vocabulary\\":0,\\"cohesion\\":0,\\"taskAchievement\\":0},\\"generalFeedback\\":\\"<string>\\",\\"commendations\\":[],\\"improvements\\":[],\\"exercisesHTML\\":\\"<optional rich HTML>\\",\\"outlineHTML\\":\\"<optional rich HTML>\\",\\"lessonHTML\\":\\"<optional rich HTML>\\",\\"grammarHTML\\":\\"<optional rich HTML>\\",\\"rubricHTML\\":\\"<optional rich HTML>\\"}\\n\\n2. FOR WEB PAGES (full standalone HTML):\\n{\\"type\\":\\"web_page\\",\\"title\\":\\"<string>\\",\\"html\\":\\"<complete standalone HTML page as a single minified string>\\"}\\n\\n3. FOR WHITEBOARD PAGES (text boxes / visual elements):\\n{\\"type\\":\\"whiteboard\\",\\"title\\":\\"<string>\\",\\"elements\\":[{\\"kind\\":\\"<textbox|banner|image>\\",\\"x\\":0,\\"y\\":0,\\"width\\":300,\\"content\\":\\"<HTML content or image URL>\\",\\"style\\":\\"<inline CSS>\\"}]}\\n\\nNow ask me: What would you like to create? (Tell me the type, topic, and any details.)";
function getCustomPrompts(){try{return JSON.parse(localStorage.getItem(LIB_CUSTOM_KEY)||"[]")}catch(e){return []}}
function saveCustomPrompts(arr){try{localStorage.setItem(LIB_CUSTOM_KEY,JSON.stringify(arr))}catch(e){}}
window.toggleLibraryPanel=function(){var panel=document.getElementById("libPanel");if(!panel)return;panel.classList.toggle("open");if(panel.classList.contains("open")){var cards=document.getElementById("libCards"),ass=document.getElementById("libAssessor");if(libTabCurrent==="assessor"){if(cards)cards.style.display="none";if(ass)ass.style.display="flex";}else{if(ass)ass.style.display="none";if(cards){cards.style.display="";renderLibCards();}}}};
window.setLibTab=function(tab,btn){libTabCurrent=tab;document.querySelectorAll(".lib-tab").forEach(function(b){b.classList.remove("active")});if(btn)btn.classList.add("active");var cards=document.getElementById("libCards"),ass=document.getElementById("libAssessor"),pa=document.getElementById("libPasteArea"),ca=document.getElementById("libCustomArea");if(tab==="assessor"){if(cards)cards.style.display="none";if(pa)pa.style.display="none";if(ca)ca.style.display="none";if(ass)ass.style.display="flex";}else{if(cards){cards.style.display="";renderLibCards();}if(pa)pa.style.display="";if(ca)ca.style.display="";if(ass)ass.style.display="none";}};
window.openLibrary=function(tab){var panel=document.getElementById("libPanel");if(!panel)return;panel.classList.add("open");var btn=document.querySelector('.lib-tab[data-libtab="'+(tab||"doc")+'"]');if(btn)setLibTab(tab||"doc",btn);else setLibTab("doc",document.querySelector('.lib-tab[data-libtab="doc"]'));};
function renderLibCards(){var query=(document.getElementById("libSearch")||{}).value||"";query=query.toLowerCase();var cards=document.getElementById("libCards");if(!cards)return;cards.innerHTML="";var masterCard=buildLibCard({id:"master",icon:"🤖",title:"Master AI Prompt (All Types)",desc:"One prompt that tells the AI all three schemas. The AI will ask what you want and follow the structure for any template.",prompt:LIB_MASTER_PROMPT});cards.appendChild(masterCard);var prompts=libTabCurrent==="doc"?LIB_DOC_PROMPTS:libTabCurrent==="web"?LIB_WEB_PROMPTS:getCustomPrompts();prompts.filter(function(p){if(!query)return true;return (p.title+p.desc).toLowerCase().indexOf(query)>=0;}).forEach(function(p){cards.appendChild(buildLibCard(p));});if(libTabCurrent==="custom"&&getCustomPrompts().length===0){cards.innerHTML='<p style="color:#a0aec0;font-size:12px;text-align:center;margin-top:20px">No custom prompts yet.</p>';}}
function buildLibCard(p){var d=document.createElement("div");d.className="lib-card";d.innerHTML='<div class="lib-card-head"><div class="lib-card-icon">'+p.icon+'</div><div><div class="lib-card-title">'+p.title+'</div></div></div><div class="lib-card-desc">'+p.desc+'</div><div class="lib-card-btns"><button class="lib-copy-btn" data-id="'+p.id+'" onclick="copyLibPrompt(this.dataset.id)"><i class="fas fa-copy"></i> Copy Prompt</button>'+(libTabCurrent==="custom"?'<button class="lib-copy-btn" style="background:#e53e3e" data-id="'+p.id+'" onclick="deleteCustomPrompt(this.dataset.id)"><i class="fas fa-trash"></i></button>':'')+'</div>';return d;}
window.wbCopyText=function(text, successMsg){
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      alert(successMsg || "Copied to clipboard!");
    }).catch(function(err) {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
};
function fallbackCopyText(text, successMsg) {
  var ta=document.createElement("textarea");
  ta.value=text;
  ta.style.position="fixed";
  ta.style.top="0";
  ta.style.left="0";
  ta.style.width="2em";
  ta.style.height="2em";
  ta.style.padding="0";
  ta.style.border="none";
  ta.style.outline="none";
  ta.style.boxShadow="none";
  ta.style.background="transparent";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try{
    var successful = document.execCommand("copy");
    if (successful) alert(successMsg || "Copied to clipboard!");
    else alert("Failed to copy to clipboard.");
  }catch(e){
    alert("Failed to copy: " + e);
  }
  document.body.removeChild(ta);
}
window.copyLibPrompt=function(id){var all=LIB_DOC_PROMPTS.concat(LIB_WEB_PROMPTS).concat(getCustomPrompts());all.push({id:"master",prompt:LIB_MASTER_PROMPT,icon:"",title:"",desc:""});var found=all.find(function(p){return p.id===id});if(!found)return;window.wbCopyText(found.prompt,"Prompt copied!");};
window.filterLibrary=function(){renderLibCards()};
window.saveCustomPrompt=function(){var title=document.getElementById("cpTitle").value.trim();var icon=document.getElementById("cpIcon").value.trim()||"⭐";var prompt=document.getElementById("cpPrompt").value.trim();var type=document.getElementById("cpType").value;if(!title||!prompt){alert("Please fill in title and prompt.");return;}var arr=getCustomPrompts();var id="custom_"+Date.now();arr.push({id:id,icon:icon,title:title,desc:"Custom prompt",prompt:prompt,type:type});saveCustomPrompts(arr);closeMdl("mCustomPrompt");document.getElementById("cpTitle").value="";document.getElementById("cpPrompt").value="";if(libTabCurrent==="custom")renderLibCards();alert("Custom prompt saved!");};
window.deleteCustomPrompt=function(id){if(!confirm("Delete this prompt?"))return;var arr=getCustomPrompts().filter(function(p){return p.id!==id});saveCustomPrompts(arr);renderLibCards();};
window.applyAIResponse=function(){var raw=document.getElementById("libPasteInput").value.trim();if(!raw){alert("Please paste an AI response first.");return;}try{var json=JSON.parse(raw);if(json.type==="doc_annotation")applyDocAnnotation(json);else if(json.type==="web_page")applyWebPage(json);else if(json.type==="whiteboard")applyWhiteboardElements(json);else alert("Unknown response type: "+json.type);document.getElementById("libPasteInput").value="";}catch(e){alert("Invalid JSON. Make sure you copied the full AI response.\\n\\nError: "+e.message);}};
function applyDocAnnotation(json){var pg=gPg(curPg);if(!pg)return;var html="";if(json.title)html+='<h2 style="color:#2d3748;border-bottom:3px solid #4299e1;padding-bottom:8px;margin-bottom:16px">'+json.title+'</h2>';if(json.scores&&Object.keys(json.scores).length){html+='<div class="ai-score-card"><h3 style="margin:0 0 8px;font-size:15px">Assessment Scores</h3><div class="ai-score-grid">';for(var k in json.scores){html+='<div class="ai-score-item"><div class="sc-val">'+json.scores[k]+'</div><div class="sc-lbl">'+k+'</div></div>';}html+='</div></div>';}if(json.generalFeedback)html+='<div class="ai-comment" style="background:#ebf8ff;border-color:#4299e1;color:#2b6cb0;margin-bottom:12px"><strong>Overall Feedback:</strong> '+json.generalFeedback+'</div>';if(json.commendations&&json.commendations.length){html+='<div style="background:#f0fff4;border:1px solid #68d391;border-radius:8px;padding:12px;margin-bottom:10px"><strong>Strengths:</strong><ul style="margin:6px 0 0 16px">';json.commendations.forEach(function(c){html+='<li>'+c+'</li>'});html+='</ul></div>';}if(json.improvements&&json.improvements.length){html+='<div style="background:#fff5f5;border:1px solid #fc8181;border-radius:8px;padding:12px;margin-bottom:10px"><strong>Areas for Improvement:</strong><ul style="margin:6px 0 0 16px">';json.improvements.forEach(function(c){html+='<li>'+c+'</li>'});html+='</ul></div>';}if(json.originalText&&json.annotatedSegments&&json.annotatedSegments.length){html+='<h3 style="color:#2d3748;margin-top:16px">Annotated Writing</h3>';var text=json.originalText;var segs=json.annotatedSegments.slice().sort(function(a,b){return b.text.length-a.text.length});segs.forEach(function(seg){if(!seg.text||!seg.text.trim())return;var clr=seg.color||"#e53e3e";var tip="["+seg.errorType+"]: "+seg.correction+" -- "+seg.explanation;var replacement='<span class="ai-err-inline" style="background:'+lighten(clr,0.85)+';border-bottom:2px solid '+clr+';color:#1a202c" title="'+tip+'">'+seg.text+'<sup style="font-size:8px;color:'+clr+';margin-left:1px">x</sup></span><span class="ai-correction">'+seg.correction+'</span>';text=text.split(seg.text).join(replacement);});html+='<div style="border:1.5px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:8px;line-height:2;font-family:Times New Roman,serif;font-size:12pt">'+text+'</div>';html+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">';var seen={};segs.forEach(function(seg){if(seg.errorType&&!seen[seg.errorType]){seen[seg.errorType]=1;html+='<span style="background:'+lighten(seg.color||"#e53e3e",0.85)+';color:'+( seg.color||"#e53e3e")+';border:1px solid '+( seg.color||"#e53e3e")+';border-radius:12px;padding:2px 10px;font-size:10px;font-weight:700">'+seg.errorType+'</span>';}});html+='</div>';}["outlineHTML","exercisesHTML","lessonHTML","grammarHTML","rubricHTML","dialogueHTML"].forEach(function(k){if(json[k])html+='<div style="margin-top:16px">'+json[k]+'</div>';});if(pg.innerText.trim()===""||pg.innerHTML==="<p><br></p>"){pg.innerHTML=html;}else{wbAddPg();var np=gPg(totPg);if(np)np.innerHTML=html;goToPg(totPg);}saveTxt();alert("AI review applied to document!");}
/* applyDocAnnotation defined above via injection */
function applyWebPage(json){if(!json.html){alert("No HTML found in response.");return;}wbAddPg();var np=gPg(totPg);if(np){np.innerHTML='';var iframe=document.createElement("iframe");iframe.style.cssText="width:100%;height:250mm;border:none;border-radius:4px";iframe.srcdoc=json.html;np.appendChild(iframe);if(json.title){var h=document.createElement("p");h.style.cssText="font-weight:700;color:#2b6cb0;margin-bottom:8px";h.textContent="Web Page: "+json.title;np.insertBefore(h,np.firstChild);}}goToPg(totPg);saveTxt();alert("Web page applied on page "+totPg);}
function applyWhiteboardElements(json){if(!json.elements||!json.elements.length){alert("No elements found.");return;}var pg=gPg(curPg);if(!pg)return;json.elements.forEach(function(el){if(el.kind==="textbox"){var div=document.createElement("div");div.className="text-box";div.contentEditable="true";div.innerHTML=el.content||"";if(el.style)div.style.cssText+=";"+el.style;pg.appendChild(div);}});saveTxt();}
/* MOD 3: MARK ERROR */
window.toggleMarkErrMenu=function(){var m=document.getElementById("markErrMenu");if(!m)return;var btn=m.parentElement.querySelector(".mark-err-main-btn");if(m.classList.contains("show")){m.classList.remove("show");return;}if(btn){var r=btn.getBoundingClientRect();m.style.position="fixed";m.style.left=Math.min(r.left,window.innerWidth-190)+"px";m.style.top=Math.min(r.bottom+4,window.innerHeight-320)+"px";}m.classList.add("show");};
document.addEventListener("click",function(e){var m=document.getElementById("markErrMenu");if(m&&m.classList.contains("show")&&!e.target.closest(".mark-err-wrap"))m.classList.remove("show");});
window.markError=function(cat,color){var sel=window.getSelection();if(!sel||sel.isCollapsed){alert("Please select some text first, then choose an error category.");document.getElementById("markErrMenu").classList.remove("show");return;}if(!sel.rangeCount){document.getElementById("markErrMenu").classList.remove("show");return;}var range=sel.getRangeAt(0);var span=document.createElement("span");span.className="err-mark";span.style.background=lighten(color,0.85);span.style.borderBottom="2px solid "+color;span.style.color="#1a202c";span.dataset.errType=cat;span.title=cat+" error";try{range.surroundContents(span);}catch(ex){var frag=range.extractContents();span.appendChild(frag);range.insertNode(span);}sel.removeAllRanges();document.getElementById("markErrMenu").classList.remove("show");saveTxt();updateRevCountBadge();};
var errTooltip=document.createElement("div");errTooltip.className="err-tooltip";errTooltip.id="errTooltip";ov.appendChild(errTooltip);
document.addEventListener("mouseover",function(e){var t=e.target.closest(".err-mark");if(t){errTooltip.textContent=t.dataset.errType+" Error";errTooltip.style.display="block";errTooltip.style.left=(e.clientX+10)+"px";errTooltip.style.top=(e.clientY-30)+"px";}});
document.addEventListener("mousemove",function(e){if(errTooltip.style.display==="block"&&e.target.closest(".err-mark")){errTooltip.style.left=(e.clientX+10)+"px";errTooltip.style.top=(e.clientY-30)+"px";}});
document.addEventListener("mouseout",function(e){if(!e.target.closest(".err-mark"))errTooltip.style.display="none";});
/* THESAURUS */
window.closeThesaurus=function(){document.getElementById("thesaurusPane").classList.remove("open")};
window.openThesaurusFromCtx=function(){var sel=window.getSelection();var word=sel?sel.toString().trim().split(/\\s+/)[0]:"";var pane=document.getElementById("thesaurusPane");pane.classList.add("open");if(word){document.getElementById("thesInput").value=word;lookupThesaurus(word);}closeCtx();};
window.lookupThesaurus=function(word){if(!word||!word.trim())return;word=word.trim().toLowerCase().split(/\\s+/)[0];var res=document.getElementById("thesResults");res.innerHTML='<p style="text-align:center;color:#a0aec0;font-size:12px;margin-top:30px">Looking up "'+word+'"...</p>';fetch("https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(word)).then(function(r){return r.json()}).then(function(data){if(!Array.isArray(data)||!data.length){res.innerHTML='<p style="text-align:center;color:#e53e3e;font-size:12px;margin-top:20px">No results found for "'+word+'"</p>';return;}var entry=data[0];var html='<div class="thes-word">'+entry.word+'</div>';if(entry.phonetics&&entry.phonetics[0]&&entry.phonetics[0].text)html+='<div class="thes-phonetic">'+entry.phonetics[0].text+'</div>';(entry.meanings||[]).forEach(function(m){html+='<div class="thes-pos">'+m.partOfSpeech+'</div>';(m.definitions||[]).slice(0,2).forEach(function(def){html+='<div class="thes-def">'+def.definition+'</div>';if(def.example)html+='<div style="font-size:11px;color:#718096;font-style:italic;margin-bottom:4px;padding-left:8px">"'+def.example+'"</div>';});if(m.synonyms&&m.synonyms.length){html+='<div class="thes-syn-title">Synonyms</div><div class="thes-syn-list">';m.synonyms.slice(0,12).forEach(function(s){html+='<span class="thes-syn-chip" onclick="replaceWithSynonym(this.textContent)">'+s+'</span>';});html+='</div>';}});res.innerHTML=html;}).catch(function(){res.innerHTML='<p style="text-align:center;color:#e53e3e;font-size:12px;margin-top:20px">Error fetching data. Check internet connection.</p>';});};
window.replaceWithSynonym=function(syn){var sel=window.getSelection();if(sel&&!sel.isCollapsed&&sel.rangeCount){var range=sel.getRangeAt(0);range.deleteContents();range.insertNode(document.createTextNode(syn));range.collapse(false);sel.removeAllRanges();sel.addRange(range);saveTxt();}else{document.execCommand("insertText",false,syn);saveTxt();}};
/* CONTEXT MENU */
window.closeCtx=function(){var m=document.getElementById("wbContextMenu");if(m)m.classList.remove("show")};
ov.addEventListener("contextmenu",function(e){if(drawOn){e.preventDefault();togDraw();closeCtx();return;}var t=e.target.closest(".wb-pg")||e.target.closest(".wb-pg-container");if(!t)return;e.preventDefault();var menu=document.getElementById("wbContextMenu");if(!menu)return;menu.style.left=Math.min(e.clientX,window.innerWidth-220)+"px";menu.style.top=Math.min(e.clientY,window.innerHeight-200)+"px";menu.classList.add("show");var sel=window.getSelection();var word=sel?sel.toString().trim().split(/\\s+/)[0]:"";var synList=document.getElementById("ctxSynList");if(word&&synList){synList.innerHTML='<div class="ctx-syn-item" style="color:#a0aec0;font-style:italic">Loading...</div>';fetch("https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(word)).then(function(r){return r.json()}).then(function(data){if(!Array.isArray(data)||!data.length){synList.innerHTML='<div class="ctx-syn-item" style="color:#a0aec0">No synonyms found</div>';return;}var syns=[];(data[0].meanings||[]).forEach(function(m){if(m.synonyms)syns=syns.concat(m.synonyms)});syns=syns.slice(0,8);if(!syns.length){synList.innerHTML='<div class="ctx-syn-item" style="color:#a0aec0">No synonyms found</div>';return;}synList.innerHTML=syns.map(function(s){return'<div class="ctx-syn-item" onclick="replaceWithSynonym(this.textContent);closeCtx()">'+s+'</div>'}).join("");}).catch(function(){synList.innerHTML='<div class="ctx-syn-item" style="color:#a0aec0">Error</div>';});}});
document.addEventListener("click",function(e){if(!e.target.closest("#wbContextMenu"))closeCtx();});
document.addEventListener("mousedown",function(e){if(e.button===0&&!e.target.closest("#wbContextMenu"))closeCtx();});
/* MOD 4: BANNERS */
var BANNER_DEFS=[
{id:"warning",icon:"⚠️",title:"Warning",color:"#fbbf24",textColor:"#78350f",bg:"#fffbeb",desc:"Yellow/black warning sign with caution background"},
{id:"qa",icon:"💬",title:"Q&A Prompt",color:"#60a5fa",textColor:"#1e3a5f",bg:"#eff6ff",desc:"Speech bubble style Question & Answer"},
{id:"askyourself",icon:"🤔",title:"Ask Yourself...",color:"#a78bfa",textColor:"#4c1d95",bg:"#f5f3ff",desc:"Thought bubble for self-reflection"},
{id:"attention",icon:"👀",title:"Pay Attention!",color:"#f97316",textColor:"#7c2d12",bg:"#fff7ed",desc:"Eye-catching burst shape for urgent notes"},
{id:"important",icon:"📌",title:"Important Note",color:"#94a3b8",textColor:"#1e293b",bg:"#f8fafc",desc:"Folded corner paper style for important notes"},
{id:"keyidea",icon:"💡",title:"Key Idea",color:"#facc15",textColor:"#713f12",bg:"#fefce8",desc:"Lightbulb icon with bright yellow background"},
{id:"didyouknow",icon:"🤷",title:"Did You Know?",color:"#34d399",textColor:"#065f46",bg:"#ecfdf5",desc:"Fun fact style rounded rectangle"},
{id:"example",icon:"📝",title:"Example",color:"#93c5fd",textColor:"#1e3a5f",bg:"#eff6ff",desc:"Tag shape with light blue background"},
{id:"challenge",icon:"⚡",title:"Challenge!",color:"#fb923c",textColor:"#7c2d12",bg:"#fff7ed",desc:"Motivational exclamation design"},
{id:"brainteaser",icon:"🧩",title:"Brain Teaser",color:"#f0abfc",textColor:"#581c87",bg:"#fdf4ff",desc:"Puzzle piece icon with playful colours"},
{id:"steps",icon:"📋",title:"Step by Step",color:"#6ee7b7",textColor:"#065f46",bg:"#ecfdf5",desc:"Numbered list style instructional layout"},
{id:"checklist",icon:"✅",title:"Checklist",color:"#4ade80",textColor:"#14532d",bg:"#f0fdf4",desc:"Check mark icon with pre-formatted checkable items"},
{id:"reflect",icon:"🪞",title:"Reflect...",color:"#c4b5fd",textColor:"#4c1d95",bg:"#f5f3ff",desc:"Mirror icon with soft purple background"},
{id:"thinkpair",icon:"👥",title:"Think-Pair-Share",color:"#7dd3fc",textColor:"#0c4a6e",bg:"#f0f9ff",desc:"Two people icon collaborative activity"},
{id:"success",icon:"🏆",title:"Success Criteria",color:"#fde68a",textColor:"#78350f",bg:"#fffbeb",desc:"Star trophy with green/gold theme"},
{id:"objective",icon:"🎯",title:"Learning Objective",color:"#fca5a5",textColor:"#7f1d1d",bg:"#fef2f2",desc:"Target/bullseye for learning objectives"},
{id:"vocab",icon:"🔍",title:"Vocabulary Spotlight",color:"#a5f3fc",textColor:"#0e7490",bg:"#ecfeff",desc:"Magnifying glass for word definitions"},
{id:"grammar",icon:"📐",title:"Grammar Focus",color:"#fcd34d",textColor:"#92400e",bg:"#fffbeb",desc:"Ruler/pencil with structured rule + example"},
{id:"pronunciation",icon:"🗣️",title:"Pronunciation Tip",color:"#fdba74",textColor:"#7c2d12",bg:"#fff7ed",desc:"Mouth/lips icon with phonetic cue space"},
{id:"commonmistake",icon:"⚠️",title:"Common Mistake",color:"#fca5a5",textColor:"#7f1d1d",bg:"#fef2f2",desc:"Warning circle with correction area"},
{id:"teachernote",icon:"📝",title:"Teacher Note",color:"#d1d5db",textColor:"#1f2937",bg:"#f9fafb",desc:"Traditional memo style personal note"},
{id:"exitticket",icon:"🎟️",title:"Exit Ticket",color:"#86efac",textColor:"#14532d",bg:"#f0fdf4",desc:"Ticket stub shape for end of class reflection"},
{id:"quote",icon:"💬",title:"Quote / Inspiration",color:"#c4b5fd",textColor:"#4c1d95",bg:"#f5f3ff",desc:"Large quotation mark with elegant styling"},
{id:"protip",icon:"⭐",title:"Pro Tip",color:"#fde68a",textColor:"#78350f",bg:"#fffbeb",desc:"Star badge with expert advice format"},
{id:"reminder",icon:"⏰",title:"Reminder",color:"#fed7aa",textColor:"#7c2d12",bg:"#fff7ed",desc:"Alarm clock icon with soft orange background"}
];
function renderBannerPicker(query){var grid=document.getElementById("bannerPickerGrid");if(!grid)return;grid.innerHTML="";var q=(query||"").toLowerCase().trim();BANNER_DEFS.filter(function(b){return !q||(b.title+b.desc).toLowerCase().indexOf(q)>=0;}).forEach(function(b){var card=document.createElement("div");card.className="banner-picker-card";card.style.background=b.bg;card.style.borderColor=b.color;card.innerHTML='<div class="banner-picker-head" style="color:'+b.textColor+'">'+b.icon+' '+b.title+'</div><div class="banner-picker-desc">'+b.desc+'</div>';card.onclick=function(){insertBanner(b);closeMdl("mBanners")};grid.appendChild(card);});if(grid.children.length===0)grid.innerHTML='<p style="color:#a0aec0;font-size:12px;text-align:center;grid-column:1/-1;padding:20px">No banners match "'+(query||"")+'"</p>';}
window.renderBannerPicker=renderBannerPicker;
var BAN_COLORS=["#fbbf24","#f97316","#ef4444","#8b5cf6","#3b82f6","#10b981","#ec4899","#f59e0b","#6366f1","#14b8a6"];
function insertBanner(bDef){var pg=gPg(curPg);if(!pg)return;var ban=document.createElement("div");ban.className="wb-banner";ban.contentEditable="false";ban.style.background=bDef.bg;ban.style.borderLeft="6px solid "+bDef.color;ban.style.borderTop="2px solid "+bDef.color;ban.draggable=true;ban.dataset.banColor=bDef.color;var palette='<div class="ban-palette">';BAN_COLORS.forEach(function(c){palette+='<span class="ban-clr-dot" style="background:'+c+'" onclick="changeBanColor(this,\\''+c+'\\')" title="'+c+'"></span>';});palette+='</div>';var defaultBody="Type your "+bDef.title.toLowerCase()+" here...";ban.innerHTML=palette+'<span class="ban-icon">'+bDef.icon+'</span><div class="ban-title" style="color:'+bDef.textColor+'">'+bDef.title+'</div><div class="ban-body" contenteditable="true" style="color:'+bDef.textColor+'">'+defaultBody+'</div><button class="ban-close" onclick="this.closest(\\'.wb-banner\\').remove();saveTxt()">&times;</button>';ban.addEventListener("dragstart",function(e){e.dataTransfer.effectAllowed="move";});pg.appendChild(ban);var space=document.createElement("p");space.innerHTML="<br>";pg.appendChild(space);saveTxt();}
window.changeBanColor=function(dot,color){var ban=dot.closest(".wb-banner");if(!ban)return;ban.style.borderLeftColor=color;ban.style.borderTopColor=color;var lighter=lighten(color,0.85);ban.style.background=lighter;};
/* MOD 6: AI WRITING ASSESSOR */
var AI_MASTER_PROMPT="You are an elite English language assessor, grammar expert, vocabulary coach, and ESL teacher all in one.\\n\\nI am going to paste a piece of learner writing below.\\n\\nPlease:\\n1. Read the writing carefully.\\n2. Identify EVERY error (Grammar, Vocabulary, Spelling, Tense, Word Order, Cohesion, Coherence, Punctuation, Style, Register, Preposition, Article).\\n3. Suggest improvements, synonyms, collocations, and register upgrades.\\n4. Score the writing on: Overall (0-100), Grammar (0-100), Vocabulary (0-100), Cohesion (0-100), Task Achievement (0-100).\\n5. Write 2-3 commendations (genuine strengths).\\n6. Write 3-5 specific improvements.\\n7. Give detailed general feedback as a professional tutor would.\\n\\nReturn ONLY a valid JSON object (no markdown, no explanation, no preamble) using this exact schema:\\n{\\"type\\":\\"doc_annotation\\",\\"title\\":\\"Writing Assessment\\",\\"originalText\\":\\"<the original text verbatim>\\",\\"annotatedSegments\\":[{\\"text\\":\\"<exact error text from original>\\",\\"errorType\\":\\"<Vocabulary|Grammar|Spelling|Tense|Word Order|Cohesion|Coherence|Punctuation|Style|Register|Preposition|Article>\\",\\"correction\\":\\"<corrected version>\\",\\"explanation\\":\\"<brief rule + why it is wrong>\\",\\"color\\":\\"<hex: Vocabulary=#8b5cf6, Grammar=#e53e3e, Spelling=#d97706, Tense=#0891b2, Word Order=#059669, Cohesion=#db2777, Coherence=#7c3aed, Punctuation=#0284c7, Style=#be185d, Register=#9d174d, Preposition=#b45309, Article=#065f46>\\"}],\\"scores\\":{\\"overall\\":0,\\"grammar\\":0,\\"vocabulary\\":0,\\"cohesion\\":0,\\"taskAchievement\\":0},\\"generalFeedback\\":\\"<2-4 sentences of professional tutor feedback>\\",\\"commendations\\":[\\"<strength 1>\\",\\"<strength 2>\\"],\\"improvements\\":[\\"<improvement 1>\\",\\"<improvement 2>\\",\\"<improvement 3>\\"]}\\n\\nLearner writing to assess:\\n";
window.copyAIMasterPrompt=function(){var learnerText=document.getElementById("aiReviewInput").value.trim();var fullPrompt=AI_MASTER_PROMPT+(learnerText||"[PASTE LEARNER WRITING HERE]");window.wbCopyText(fullPrompt,"Master prompt copied!");};
window.applyAIReview=function(){var raw=document.getElementById("aiReviewJSON").value.trim();if(!raw){alert("Please paste the AI JSON response first.");return;}try{var json=JSON.parse(raw);applyDocAnnotation(json);closeMdl("mAIReview");}catch(e){alert("Invalid JSON. Make sure you copied the complete AI response.\\n\\nError: "+e.message);}};
/* ORIGINAL TEMPLATE DATA */
var TPLS=[
/* EDU & SCHOOL */
{id:"cornell",name:"Cornell Notes",cat:"edu",icon:"fa-sticky-note",html:'<div style="border:2px solid #805ad5;border-radius:8px;overflow:hidden"><table style="width:100%;border-collapse:collapse"><tr><td style="width:30%;border-right:2px solid #805ad5;border-bottom:2px solid #805ad5;padding:12px;background:#faf5ff;vertical-align:top"><b style="color:#805ad5">Cues & Questions</b><br><br></td><td style="border-bottom:2px solid #805ad5;padding:12px;vertical-align:top"><b style="color:#805ad5">Main Lecture Notes</b><br><br></td></tr><tr><td colspan="2" style="padding:12px;background:#faf5ff"><b style="color:#805ad5">Summary (30-second takeaway)</b><br><br></td></tr></table></div><p></p>'},
{id:"studyGuide",name:"Study Guide",cat:"edu",icon:"fa-graduation-cap",html:'<div style="border:2px solid #805ad5;border-radius:8px;padding:16px"><h3 style="color:#805ad5;margin:0 0 12px">📚 Exam Study Guide</h3><p><b>Subject:</b> _____ | <b>Test Date:</b> _____</p><h4>Key Concepts</h4><ol><li></li><li></li></ol><h4>Important Terms</h4><ul><li></li></ul><h4>Review Questions</h4><ol><li></li></ol></div><p></p>'},
{id:"socratic",name:"Socratic Debate",cat:"edu",icon:"fa-balance-scale",html:'<div style="border:2px solid #805ad5;border-radius:8px;padding:16px"><h3 style="color:#805ad5;margin:0 0 12px">⚖️ Socratic Debate Prep</h3><p><b>Motion/Topic:</b> _____</p><table style="width:100%"><tr><td style="width:50%;padding:12px;border:1px solid #805ad5;background:#fefcbf;vertical-align:top"><b>PRO (Affirmative)</b><ol><li></li><li></li></ol></td><td style="padding:12px;border:1px solid #805ad5;background:#ebf8ff;vertical-align:top"><b>CON (Negative)</b><ol><li></li><li></li></ol></td></tr></table><h4>Key Evidence / Quotes</h4><div style="border:1px solid #cbd5e0;padding:10px;min-height:50px"></div><h4>Rebuttals & Responses</h4><ul><li><b>If they say...</b> then I will respond...</li></ul></div><p></p>'},
{id:"feynman",name:"Feynman Technique",cat:"edu",icon:"fa-chalkboard-teacher",html:'<div style="border:2px solid #805ad5;border-radius:8px;padding:16px"><h3 style="color:#805ad5;margin:0 0 12px">💡 Feynman Learning Sheet</h3><p><b>Target Concept:</b> _____</p><div style="background:#faf5ff;border-left:4px solid #805ad5;padding:12px;margin-bottom:12px"><b>1. Explain like I\\'m 5 (ELI5):</b><br><i>(Explain the concept simply in plain language, avoiding jargon)</i></div><div style="background:#fffbeb;border-left:4px solid #d69e2e;padding:12px;margin-bottom:12px"><b>2. Gaps & Friction Points:</b><br><i>(Identify what parts are hard to explain or where you got stuck)</i></div><div style="background:#ebf8ff;border-left:4px solid #3182ce;padding:12px"><b>3. Use an Analogy:</b><br><i>(Connect this concept to a familiar real-world object or scenario)</i></div></div><p></p>'},
{id:"lessonSummary",name:"Lesson Summary",cat:"edu",icon:"fa-bookmark",html:'<div style="border:2px solid #805ad5;border-radius:8px;padding:16px"><h3 style="color:#805ad5;margin:0 0 8px">📖 Lesson Summary & Highlights</h3><p><b>Topic:</b> _____ | <b>Date:</b> _____ | <b>Teacher/Tutor:</b> _____</p><div style="background:#faf5ff;border-left:4px solid #805ad5;padding:10px;margin:8px 0"><b>🎯 Core Learning Objectives:</b><br>1. <br>2. </div><h4>Key Takeaways & Formulae</h4><ul><li><b>Point 1:</b> </li><li><b>Point 2:</b> </li></ul><h4>Homework & Next Steps</h4><p>&#9744; </p></div><p></p>'},

/* LANGUAGE & VOCABULARY */
{id:"vocab",name:"Vocabulary List",cat:"lang",icon:"fa-book",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 12px">📖 Vocabulary Builder</h3><table style="width:100%;border-collapse:collapse"><tr style="background:#3b82f6;color:#fff"><th style="padding:8px;border:1px solid #cbd5e0">Word / Term</th><th style="padding:8px;border:1px solid #cbd5e0">Part of Speech & Meaning</th><th style="padding:8px;border:1px solid #cbd5e0">Example Sentence</th><th style="padding:8px;border:1px solid #cbd5e0">Collocations</th></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"grammarRule",name:"Grammar Formula",cat:"lang",icon:"fa-spell-check",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 10px">🔤 Grammar Focus & Pitfalls</h3><p><b>Grammar Structure:</b> _____</p><div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px;margin-bottom:10px"><b>Formula:</b> <code>Subject + Auxiliary + Verb-ing...</code></div><table style="width:100%;border-collapse:collapse"><tr><th style="background:#fee2e2;color:#991b1b;padding:8px;border:1px solid #cbd5e0">❌ Common Error</th><th style="background:#dcfce7;color:#166534;padding:8px;border:1px solid #cbd5e0">✅ Corrected Version</th><th style="background:#f3f4f6;padding:8px;border:1px solid #cbd5e0">Rule / Explanation</th></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"idiomsLog",name:"Phrasal Verbs & Idioms",cat:"lang",icon:"fa-comments",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 10px">💬 Idioms & Phrasal Verbs</h3><table style="width:100%;border-collapse:collapse"><tr style="background:#3b82f6;color:#fff"><th style="padding:8px;border:1px solid #cbd5e0">Idiom / Phrasal Verb</th><th style="padding:8px;border:1px solid #cbd5e0">Natural Meaning</th><th style="padding:8px;border:1px solid #cbd5e0">Dialogue Example</th><th style="padding:8px;border:1px solid #cbd5e0">Register (Formal/Slang)</th></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"pronounceLog",name:"Pronunciation & Phonetics",cat:"lang",icon:"fa-volume-up",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 10px">🗣️ Pronunciation & Minimal Pairs</h3><p><b>Target Phoneme / Sound:</b> /____/ vs /____/</p><table style="width:100%;border-collapse:collapse"><tr style="background:#3b82f6;color:#fff"><th style="padding:8px;border:1px solid #cbd5e0">Sound A (/ /)</th><th style="padding:8px;border:1px solid #cbd5e0">Sound B (/ /)</th><th style="padding:8px;border:1px solid #cbd5e0">Tongue / Mouth Position</th></tr><tr><td style="padding:8px;border:1px solid #cbd5e0">Ship</td><td style="border:1px solid #cbd5e0">Sheep</td><td style="border:1px solid #cbd5e0">Short vowel vs long tense vowel</td></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"langPractice",name:"Language Practice Log",cat:"lang",icon:"fa-language",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 12px">🌐 Daily Language Practice Log</h3><p><b>Language Focus:</b> _____ | <b>Target Level:</b> _____</p><h4>1. Vocab Focus (Word / Part of Speech / Definition)</h4><table style="width:100%"><tr style="background:#3b82f6;color:#fff"><th style="padding:6px">Word</th><th>Definition</th><th>My Sentence</th></tr><tr><td style="padding:6px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table><h4>2. Grammar Spotting & Corrections</h4><ol><li><b>Incorrect:</b> <span style="text-decoration:line-through;color:#e53e3e"></span><br><b>Corrected:</b> <span style="color:#22c55e;font-weight:bold"></span></li></ol><h4>3. Free Practice / Speaking Draft</h4><div style="border:1px solid #cbd5e0;padding:10px;min-height:50px"></div></div><p></p>'},

/* WORK & CAREER */
{id:"meeting",name:"Meeting Notes",cat:"work",icon:"fa-users",html:'<div style="border:2px solid #dd6b20;border-radius:8px;padding:16px"><h3 style="color:#dd6b20;margin:0 0 12px">📋 Meeting Minutes & Action Tracker</h3><p><b>Date:</b> _____ | <b>Attendees:</b> _____ | <b>Facilitator:</b> _____</p><h4>1. Agenda & Key Topics</h4><ol><li></li><li></li></ol><h4>2. Discussion Summary & Decisions</h4><div style="border:1px solid #e2e8f0;padding:10px;min-height:60px"></div><h4>3. Action Items</h4><table style="width:100%"><tr style="background:#dd6b20;color:#fff"><th style="padding:8px">Task / Deliverable</th><th>Owner</th><th>Due Date</th><th>Status</th></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0">To Do</td></tr></table></div><p></p>'},
{id:"swot",name:"SWOT Analysis",cat:"work",icon:"fa-th-large",html:'<div><h3 style="text-align:center;margin:0 0 12px;color:#2d3748">📊 SWOT Strategic Analysis</h3><table style="width:100%"><tr><td style="width:50%;padding:16px;border:3px solid #38a169;background:#f0fff4;vertical-align:top"><b style="color:#276749">STRENGTHS (Internal)</b><ul><li></li></ul></td><td style="padding:16px;border:3px solid #e53e3e;background:#fff5f5;vertical-align:top"><b style="color:#c53030">WEAKNESSES (Internal)</b><ul><li></li></ul></td></tr><tr><td style="padding:16px;border:3px solid #3182ce;background:#ebf8ff;vertical-align:top"><b style="color:#2b6cb0">OPPORTUNITIES (External)</b><ul><li></li></ul></td><td style="padding:16px;border:3px solid #d69e2e;background:#fffff0;vertical-align:top"><b style="color:#b7791f">THREATS (External)</b><ul><li></li></ul></td></tr></table></div><p></p>'},
{id:"project",name:"Project Charter",cat:"work",icon:"fa-rocket",html:'<div style="border:2px solid #dd6b20;border-radius:8px;padding:16px"><h3 style="color:#dd6b20;margin:0 0 12px">🚀 Project Charter</h3><p><b>Project Name:</b> _____ | <b>Sponsor:</b> _____</p><h4>1. Project Goal & Objectives</h4><div style="border:1px solid #cbd5e0;padding:10px;min-height:40px"></div><h4>2. Scope & Boundaries</h4><table style="width:100%"><tr><td style="width:50%;background:#f0fff4;border:1px solid #cbd5e0;padding:10px"><b>In Scope (What we do)</b><ul><li></li></ul></td><td style="background:#fff5f5;border:1px solid #cbd5e0;padding:10px"><b>Out of Scope (What we don\\'t)</b><ul><li></li></ul></td></tr></table><h4>3. Stakeholders & Roles</h4><ul><li><b>Project Lead:</b> </li><li><b>Core Team:</b> </li></ul></div><p></p>'},
{id:"marketing",name:"Marketing Campaign",cat:"work",icon:"fa-bullhorn",html:'<div style="border:2px solid #dd6b20;border-radius:8px;padding:16px"><h3 style="color:#dd6b20;margin:0 0 12px">📣 Marketing Campaign Planner</h3><p><b>Campaign Name:</b> _____ | <b>Target Audience:</b> _____</p><h4>1. Core Message & Value Proposition</h4><div style="border:1px solid #cbd5e0;padding:10px;min-height:40px"></div><h4>2. Channels & Strategy</h4><table style="width:100%"><tr style="background:#dd6b20;color:#fff"><th style="padding:6px;width:30%">Channel</th><th>Content Strategy / Action</th></tr><tr><td style="padding:6px;border:1px solid #cbd5e0"><b>Social Media</b></td><td style="border:1px solid #cbd5e0"></td></tr><tr><td style="padding:6px;border:1px solid #cbd5e0"><b>Email Newsletter</b></td><td style="border:1px solid #cbd5e0"></td></tr><tr><td style="padding:6px;border:1px solid #cbd5e0"><b>Paid Ads</b></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"starInterview",name:"STAR Interview Prep",cat:"work",icon:"fa-user-tie",html:'<div style="border:2px solid #dd6b20;border-radius:8px;padding:16px"><h3 style="color:#dd6b20;margin:0 0 12px">💼 STAR Interview Method</h3><p><b>Target Role:</b> _____ | <b>Target Competency:</b> _____</p><div style="border-left:4px solid #38a169;padding-left:12px;margin-bottom:12px"><b>Situation (S)</b><br><small style="color:#718096">What was the context or challenge?</small><div style="min-height:30px"></div></div><div style="border-left:4px solid #3182ce;padding-left:12px;margin-bottom:12px"><b>Task (T)</b><br><small style="color:#718096">What was your specific responsibility or goal?</small><div style="min-height:30px"></div></div><div style="border-left:4px solid #d69e2e;padding-left:12px;margin-bottom:12px"><b>Action (A)</b><br><small style="color:#718096">What steps did you take?</small><div style="min-height:30px"></div></div><div style="border-left:4px solid #d53f8c;padding-left:12px"><b>Result (R)</b><br><small style="color:#718096">What was the quantifiable outcome?</small><div style="min-height:30px"></div></div></div><p></p>'},

/* PLANNING & TASKS */
{id:"todo",name:"Prioritized To-Do",cat:"plan",icon:"fa-tasks",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">✅ Action-Item Checklist</h3><h4 style="color:#c53030">🚨 High Priority (Must Do Today)</h4><p>&#9744; </p><p>&#9744; </p><h4 style="color:#d69e2e">⚡ Medium Priority (This Week)</h4><p>&#9744; </p><h4 style="color:#38a169">🌱 Low Priority / Someday</h4><p>&#9744; </p></div><p></p>'},
{id:"weekly",name:"Weekly Planner",cat:"plan",icon:"fa-calendar-week",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">📅 Weekly Time-Block Planner</h3><table style="width:100%"><tr style="background:#d53f8c;color:#fff"><th style="padding:10px">Day</th><th>Morning Focus</th><th>Afternoon Tasks</th><th>Evening Wrap-up</th></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Mon</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Tue</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Wed</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Thu</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Fri</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr></table></div><p></p>'},
{id:"kanban",name:"Kanban Board",cat:"plan",icon:"fa-columns",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">📋 Kanban Task Board</h3><table style="width:100%;border-collapse:separate;border-spacing:8px"><tr><th style="background:#cbd5e0;color:#4a5568;padding:8px;border-radius:4px">Backlog 📥</th><th style="background:#feebc8;color:#c05621;padding:8px;border-radius:4px">In Progress ⚙️</th><th style="background:#c6f6d5;color:#22543d;padding:8px;border-radius:4px">Done ✅</th></tr><tr><td style="border:2px dashed #cbd5e0;border-radius:6px;padding:8px;vertical-align:top;min-height:120px"><div style="background:#fff;border:1px solid #e2e8f0;padding:6px;border-radius:4px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">Task 1</div></td><td style="border:2px dashed #cbd5e0;border-radius:6px;padding:8px;vertical-align:top"><div style="background:#fff;border:1px solid #e2e8f0;padding:6px;border-radius:4px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">Task 2</div></td><td style="border:2px dashed #cbd5e0;border-radius:6px;padding:8px;vertical-align:top"><div style="background:#fff;border:1px solid #e2e8f0;padding:6px;border-radius:4px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">Task 3</div></td></tr></table></div><p></p>'},
{id:"smartGoal",name:"S.M.A.R.T Goal Planner",cat:"plan",icon:"fa-bullseye",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">🎯 S.M.A.R.T. Goal Planner</h3><table style="width:100%"><tr><td style="padding:10px;border-bottom:1px solid #cbd5e0"><b>S - Specific</b><br><small style="color:#718096">What exactly do you want to accomplish?</small></td><td></td></tr><tr><td style="padding:10px;border-bottom:1px solid #cbd5e0"><b>M - Measurable</b><br><small style="color:#718096">How will you measure progress?</small></td><td></td></tr><tr><td style="padding:10px;border-bottom:1px solid #cbd5e0"><b>A - Achievable</b><br><small style="color:#718096">Is this goal realistic?</small></td><td></td></tr><tr><td style="padding:10px;border-bottom:1px solid #cbd5e0"><b>R - Relevant</b><br><small style="color:#718096">Why is this important?</small></td><td></td></tr><tr><td style="padding:10px"><b>T - Time-Bound</b><br><small style="color:#718096">What is the exact deadline?</small></td><td></td></tr></table></div><p></p>'},
{id:"eisenhower",name:"Eisenhower Matrix",cat:"plan",icon:"fa-th",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">⚖️ Eisenhower 2x2 Priority Matrix</h3><table style="width:100%;border-collapse:separate;border-spacing:8px"><tr><td style="width:50%;padding:12px;background:#fee2e2;border:2px solid #ef4444;border-radius:6px;vertical-align:top"><b style="color:#991b1b">🔥 DO FIRST (Urgent & Important)</b><ul><li></li></ul></td><td style="padding:12px;background:#dbeafe;border:2px solid #3b82f6;border-radius:6px;vertical-align:top"><b style="color:#1e40af">📅 SCHEDULE (Not Urgent, Important)</b><ul><li></li></ul></td></tr><tr><td style="padding:12px;background:#fef3c7;border:2px solid #f59e0b;border-radius:6px;vertical-align:top"><b style="color:#92400e">👥 DELEGATE (Urgent, Not Important)</b><ul><li></li></ul></td><td style="padding:12px;background:#f3f4f6;border:2px solid #9ca3af;border-radius:6px;vertical-align:top"><b style="color:#4b5563">🗑️ ELIMINATE (Not Urgent, Not Important)</b><ul><li></li></ul></td></tr></table></div><p></p>'},

/* WRITING & ESSAYS */
{id:"essay",name:"5-Paragraph Essay",cat:"write",icon:"fa-edit",html:'<div style="border-left:4px solid #8b5cf6;padding:16px;background:#faf5ff"><h3 style="color:#8b5cf6;margin:0 0 12px">✍️ 5-Paragraph Essay Outline</h3><h4>I. Introduction</h4><ul><li><b>Hook:</b> </li><li><b>Background Context:</b> </li><li><b>Thesis Statement:</b> </li></ul><h4>II. Body Paragraph 1 (Strongest Argument)</h4><ul><li><b>Topic Sentence:</b> </li><li><b>Evidence & Citation:</b> </li><li><b>Explanation / Analysis:</b> </li></ul><h4>III. Body Paragraph 2 (Second Argument)</h4><ul><li><b>Topic Sentence:</b> </li><li><b>Evidence & Explanation:</b> </li></ul><h4>IV. Body Paragraph 3 (Counterargument & Refutation)</h4><ul><li><b>Counterargument:</b> </li><li><b>Refutation:</b> </li></ul><h4>V. Conclusion</h4><ul><li><b>Restated Thesis:</b> </li><li><b>Synthesis & Final Impact:</b> </li></ul></div><p></p>'},
{id:"storyArc",name:"Story Arc Planner",cat:"write",icon:"fa-feather-alt",html:'<div style="border:2px solid #8b5cf6;border-radius:8px;padding:16px"><h3 style="color:#8b5cf6;margin:0 0 12px">📖 Creative Narrative Story Arc</h3><p><b>Story Title:</b> _____ | <b>Protagonist:</b> _____ | <b>Genre:</b> _____</p><ol><li><b>Exposition (Status Quo & Setting):</b> </li><li><b>Inciting Incident:</b> </li><li><b>Rising Action (Obstacles & Tension):</b> </li><li><b>Climax (Pivotal turning point):</b> </li><li><b>Falling Action:</b> </li><li><b>Resolution / Epilogue:</b> </li></ol></div><p></p>'},
{id:"emailDraft",name:"Formal Email / Letter",cat:"write",icon:"fa-envelope-open-text",html:'<div style="border:2px solid #8b5cf6;border-radius:8px;padding:16px"><h3 style="color:#8b5cf6;margin:0 0 12px">✉️ Professional Email Draft</h3><p><b>To:</b> _____ | <b>Subject:</b> _____</p><div style="border:1px solid #e2e8f0;padding:12px;border-radius:6px;background:#fff"><b>Dear [Name / Title],</b><br><br><b>Opening / Context:</b> I am writing to...<br><br><b>Key Details / Request:</b><br><br><b>Call to Action:</b> Please let me know your availability for...<br><br><b>Sign-off:</b><br>Sincerely,<br><b>[Your Name]</b></div></div><p></p>'},

/* LIFE & REFLECTION */
{id:"journal",name:"Daily Journal",cat:"life",icon:"fa-book-reader",html:'<div style="border:2px solid #10b981;border-radius:8px;padding:16px"><h3 style="color:#10b981;margin:0 0 12px">📔 Daily Reflection Journal</h3><p><b>Date:</b> _____ | <b>Mood / Energy (1-10):</b> _____</p><h4>🌟 3 Things I Am Grateful For</h4><ol><li></li><li></li><li></li></ol><h4>💡 Today\\'s Highlights & Breakthroughs</h4><div style="border:1px solid #e2e8f0;padding:10px;min-height:50px"></div><h4>🌱 Lessons Learned & Tomorrow\\'s Focus</h4><div style="border:1px solid #e2e8f0;padding:10px;min-height:50px"></div></div><p></p>'},
{id:"habit",name:"Habit Tracker",cat:"life",icon:"fa-check-double",html:'<div style="border:2px solid #10b981;border-radius:8px;padding:16px"><h3 style="color:#10b981;margin:0 0 12px">📊 Weekly Habit Tracker</h3><table style="width:100%;font-size:12px"><tr style="background:#10b981;color:#fff"><th style="padding:8px">Target Habit</th><th>M</th><th>T</th><th>W</th><th>T</th><th>F</th><th>S</th><th>S</th><th>Goal</th></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">7/7</td></tr></table></div><p></p>'},
{id:"exitTicket",name:"Exit Ticket / 3-2-1",cat:"life",icon:"fa-clipboard-check",html:'<div style="border:2px solid #10b981;border-radius:8px;padding:16px"><h3 style="color:#10b981;margin:0 0 10px">🎫 3-2-1 Exit Ticket</h3><div style="background:#ecfdf5;border-left:4px solid #10b981;padding:10px;margin-bottom:8px"><b>3 Things I Learned Today:</b><ol><li></li><li></li><li></li></ol></div><div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px;margin-bottom:8px"><b>2 Questions I Still Have:</b><ol><li></li><li></li></ol></div><div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:10px"><b>1 Idea I Will Apply Immediately:</b><p></p></div></div><p></p>'}
];
function renderTpl(filter){var grid=document.getElementById("tplGrid");grid.innerHTML="";TPLS.filter(function(t){return filter==="all"||t.cat===filter}).forEach(function(t){var d=document.createElement("div");d.className="tpl-card";d.innerHTML='<i class="fas '+t.icon+'"></i><span>'+t.name+'</span>';d.onclick=function(){var pg=gPg(curPg);if(pg){pg.focus();document.execCommand("insertHTML",false,t.html);saveTxt()}closeMdl("mTpl")};grid.appendChild(d)})}
window.filterTpl=function(cat,btn){document.querySelectorAll(".tpl-cat").forEach(function(b){b.classList.remove("active")});btn.classList.add("active");renderTpl(cat)};
function getFileName(){return document.getElementById("saveName").value||LN+"_Document"}
window.savePDF=function(){
  closeMdl("mSave");
  var fn = getFileName();
  wbQuery(".wb-cv").forEach(function(cv){if(typeof syncCv==="function")syncCv(cv);});
  var printWin = window.open("","_blank");
  if(!printWin){
    alert("Popup blocked! Please allow popups for this site to open the PDF print view in a new tab.");
    return;
  }
  var pagesHtml = "";
  var wraps = wbQuery(".pg-wrap");
  wraps.forEach(function(wrap, idx){
    var isLandscape = wrap.classList.contains("landscape") || (typeof orient !== "undefined" && orient === "landscape");
    var hdrEl = wrap.querySelector(".wb-hdr");
    var hdrContent = hdrEl ? hdrEl.innerHTML : "";
    var pgEl = wrap.querySelector(".wb-pg");
    var pgContent = pgEl ? pgEl.innerHTML : "";
    var ftrEl = wrap.querySelector(".wb-ftr");
    var ftrContent = ftrEl ? ftrEl.innerHTML : "";
    var wmEl = wrap.querySelector(".wb-wm");
    var wmContent = wmEl ? wmEl.innerHTML : "";
    var cvEl = wrap.querySelector(".wb-cv");
    var cvDataUrl = (cvEl && cvEl.toDataURL) ? cvEl.toDataURL() : "";
    var cvImgTag = (cvDataUrl && cvDataUrl !== "data:,") 
      ? '<img src="' + cvDataUrl + '" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;" />' 
      : '';
    var bStyle = (typeof borderCfg !== "undefined" && borderCfg.style) ? borderCfg.style : "none";
    var bColor = (typeof borderCfg !== "undefined" && borderCfg.color) ? borderCfg.color : "#3182ce";
    var mTop = (typeof margins !== "undefined" && margins.t) ? margins.t : 20;
    var mRight = (typeof margins !== "undefined" && margins.r) ? margins.r : 20;
    var mBottom = (typeof margins !== "undefined" && margins.b) ? margins.b : 20;
    var mLeft = (typeof margins !== "undefined" && margins.l) ? margins.l : 20;

    pagesHtml += '<div class="print-page-wrapper ' + (isLandscape ? 'landscape' : 'portrait') + ' ' + (bStyle !== 'none' ? 'border-' + bStyle : '') + '" style="--border-clr: ' + bColor + '">' +
      (hdrContent ? '<div class="wb-hdr-print">' + hdrContent + '</div>' : '') +
      '<div class="wb-pg-container-print">' +
        '<div class="wb-pg-print" style="padding: ' + mTop + 'mm ' + mRight + 'mm ' + mBottom + 'mm ' + mLeft + 'mm;">' +
          pgContent +
        '</div>' +
        cvImgTag +
        (wmContent ? '<div class="wb-wm-print">' + wmContent + '</div>' : '') +
      '</div>' +
      (ftrContent ? '<div class="wb-ftr-print">' + ftrContent + '</div>' : '') +
    '</div>';
  });

  var docOrient = (typeof orient !== "undefined") ? orient : "portrait";
  var printDocHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + fn + '</title>' +
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,400&family=JetBrains+Mono&display=swap">' +
    '<style>' +
      '* { box-sizing: border-box; }' +
      '@page { size: ' + (docOrient === 'landscape' ? '297mm 210mm' : '210mm 297mm') + '; margin: 0; }' +
      'html, body { margin: 0; padding: 0; background: #4a5568; font-family: "Times New Roman", Times, serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '.no-print-bar { position: sticky; top: 0; z-index: 99999; background: #1a202c; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }' +
      '.no-print-bar button { background: #3182ce; color: #fff; border: none; padding: 8px 18px; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: background 0.2s; }' +
      '.no-print-bar button:hover { background: #2b6cb0; }' +
      '.print-container { display: flex; flex-direction: column; align-items: center; padding: 24px 0; gap: 24px; }' +
      '.print-page-wrapper { position: relative; background: #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.25); box-sizing: border-box; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; overflow: hidden; display: flex; flex-direction: column; }' +
      '.print-page-wrapper.portrait { width: 210mm; min-height: 297mm; height: 297mm; }' +
      '.print-page-wrapper.landscape { width: 297mm; min-height: 210mm; height: 210mm; }' +
      '.print-page-wrapper.border-single { border: 2px solid var(--border-clr, #3182ce); }' +
      '.print-page-wrapper.border-double { border: 6px double var(--border-clr, #3182ce); }' +
      '.print-page-wrapper.border-dashed { border: 2px dashed var(--border-clr, #3182ce); }' +
      '.print-page-wrapper.border-dotted { border: 3px dotted var(--border-clr, #3182ce); }' +
      '.print-page-wrapper.border-fancy { border: 8px ridge var(--border-clr, #3182ce); }' +
      '.wb-hdr-print { padding: 8mm 12mm 4mm 12mm; font-size: 10pt; color: #718096; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; }' +
      '.wb-ftr-print { padding: 4mm 12mm 8mm 12mm; font-size: 10pt; color: #718096; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; margin-top: auto; }' +
      '.wb-pg-container-print { position: relative; flex: 1; display: flex; flex-direction: column; overflow: hidden; }' +
      '.wb-pg-print { width: 100%; height: 100%; box-sizing: border-box; outline: none; word-wrap: break-word; font-size: 12pt; line-height: 1.6; color: #1a202c; }' +
      '.wb-wm-print { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 48pt; font-weight: 800; color: rgba(0,0,0,0.06); pointer-events: none; white-space: nowrap; text-transform: uppercase; z-index: 2; }' +
      '.wb-pg-print table { border-collapse: collapse; width: 100%; margin: 8px 0; }' +
      '.wb-pg-print td, .wb-pg-print th { border: 1px solid #cbd5e0; padding: 6px 10px; }' +
      '.wb-pg-print img { max-width: 100%; height: auto; }' +
      '.wb-pg-print .wb-banner { margin: 12px 0; padding: 12px 16px; border-radius: 6px; position: relative; }' +
      '.wb-pg-print .wb-banner .ban-close, .wb-pg-print .wb-banner .ban-palette { display: none !important; }' +
      '@media print {' +
        '.no-print-bar { display: none !important; }' +
        'html, body { background: #fff !important; }' +
        '.print-container { padding: 0 !important; gap: 0 !important; }' +
        '.print-page-wrapper { box-shadow: none !important; margin: 0 !important; border: none !important; page-break-after: always !important; break-after: page !important; page-break-inside: avoid !important; break-inside: avoid !important; }' +
      '}' +
    '</style>' +
    '</head><body>' +
    '<div class="no-print-bar">' +
      '<div><strong style="font-size:16px;">' + fn + '</strong><span style="margin-left:12px; font-size:13px; opacity:0.8;">Print View (' + wraps.length + ' page' + (wraps.length > 1 ? 's' : '') + ')</span></div>' +
      '<button onclick="window.print();"><i class="fas fa-print"></i> Save / Print PDF</button>' +
    '</div>' +
    '<div class="print-container">' + pagesHtml + '</div>' +
    '<' + 'script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 400); });</' + 'script>' +
    '</body></html>';

  printWin.document.open();
  printWin.document.write(printDocHtml);
  printWin.document.close();
  var stSave = wbIn("stSave");
  if(stSave) stSave.textContent = "PDF View Opened";
};
window.saveDoc=function(){var fn=getFileName(),body="";wbQuery(".pg-wrap").forEach(function(wrap,i){var n=i+1,pg=wrap.querySelector(".wb-pg");body+='<div style="padding:'+margins.t+'mm '+margins.r+'mm '+margins.b+'mm '+margins.l+'mm;min-height:'+(orient==="portrait"?"257mm":"170mm")+';page-break-after:always">';if(pg)body+=pg.innerHTML;body+='</div>'});var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+fn+'</title><style>@page{size:'+(orient==="portrait"?"210mm 297mm":"297mm 210mm")+';margin:0}body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;margin:0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #4a5568;padding:8px}img{max-width:100%}</style></head><body>'+body+'</body></html>';var blob=new Blob(["\\ufeff"+html],{type:"application/msword"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fn+".doc";a.click();closeMdl("mSave")};
window.saveHTML=function(){var fn=getFileName(),body="";wbQuery(".pg-wrap").forEach(function(wrap,i){var pg=wrap.querySelector(".wb-pg");body+='<article style="background:#fff;margin-bottom:20px;padding:'+margins.t+'mm '+margins.r+'mm '+margins.b+'mm '+margins.l+'mm;min-height:'+(orient==="portrait"?"257mm":"170mm")+'">';if(pg)body+=pg.innerHTML;body+='</article>'});var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+fn+'</title><style>body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;background:#e2e8f0;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #4a5568;padding:8px}img{max-width:100%}</style></head><body>'+body+'</body></html>';var blob=new Blob([html],{type:"text/html"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fn+".html";a.click();closeMdl("mSave")};
window.saveTXT=function(){var fn=getFileName(),txt="";wbQuery(".wb-pg").forEach(function(p,i){txt+="=== PAGE "+(i+1)+" ===\\n\\n"+p.innerText+"\\n\\n"});var blob=new Blob([txt],{type:"text/plain"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fn+".txt";a.click();closeMdl("mSave")};
var SAVE_KEY="wb_"+LN.replace(/\\s/g,"_");
function autoSave(){var data={pages:[],canvas:[],orient:orient,margins:margins,hdrCfg:hdrCfg,ftrCfg:ftrCfg,wmCfg:wmCfg,borderCfg:borderCfg,theme:theme};wbQuery(".wb-pg").forEach(function(p){data.pages.push(p.innerHTML)});wbQuery(".wb-cv").forEach(function(cv){syncCv(cv);data.canvas.push(cv.toDataURL())});try{localStorage.setItem(SAVE_KEY,JSON.stringify(data))}catch(e){}wbIn("stSave").textContent="Saved"}
function tryRestore(){var raw;try{raw=localStorage.getItem(SAVE_KEY)}catch(e){return}if(!raw)return;try{var data=JSON.parse(raw);if(data.pages&&data.pages.length&&data.pages[0].length>0){if(data.orient)orient=data.orient;if(data.margins)margins=data.margins;if(data.hdrCfg)hdrCfg=data.hdrCfg;if(data.ftrCfg)ftrCfg=data.ftrCfg;if(data.wmCfg)wmCfg=data.wmCfg;if(data.borderCfg)borderCfg=data.borderCfg;if(data.theme){theme=data.theme;setTheme(theme);wbIn("themeSelect").value=theme}var zi=wbIn("zoomInner")||zoomC;zi.innerHTML="";data.pages.forEach(function(html,i){var n=i+1;var els=createPg(n);els.pg.innerHTML=html;zi.appendChild(els.wrap);initCv(els.cv);setupPgEv(els.pg);if(data.canvas&&data.canvas[i]&&data.canvas[i]!=="data:,"){(function(canvas,src){setTimeout(function(){syncCv(canvas);var img=new Image();img.onload=function(){canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height)};img.src=src},100)})(els.cv,data.canvas[i])}});totPg=data.pages.length;for(var i=1;i<=totPg;i++)applyPgSetup(i);updTh();updStats();applyZm();setTimeout(function(){wbQuery(".wb-pg").forEach(function(p){autoPaginate(p);});},400);}}catch(e){}}
function setupPgEv(pg){
pg.addEventListener("mousedown",function(e){if(e.target.tagName==="IMG"&&!drawOn){resizingImg=e.target;resizingImg.classList.add("resizing");var rect=resizingImg.getBoundingClientRect();resizeStart={x:e.clientX,y:e.clientY,w:rect.width,h:rect.height};e.preventDefault()}});
pg.addEventListener("dblclick",function(e){if(!drawOn){var sel=window.getSelection();if(sel){sel.modify("move","backward","word");sel.modify("extend","forward","word")}}});
pg.addEventListener("keydown",function(e){if(e.key==="Delete"||e.key==="Backspace"){if(trackOn){e.preventDefault();var sel=window.getSelection();if(!sel)return;if(sel.isCollapsed){if(e.key==="Backspace")sel.modify("extend","backward","character");else sel.modify("extend","forward","character")}if(!sel.isCollapsed&&sel.rangeCount){var rng=sel.getRangeAt(0);var sp=document.createElement("span");sp.className="tc-del";sp.appendChild(rng.extractContents());rng.insertNode(sp);rng.setStartAfter(sp);rng.collapse(true);sel.removeAllRanges();sel.addRange(rng);saveTxt()}}else{setTimeout(saveTxt,10)}}});
pg.addEventListener("keypress",function(e){if(trackOn&&e.key!=="Enter"){e.preventDefault();var sel=window.getSelection();if(!sel||!sel.rangeCount)return;var rng=sel.getRangeAt(0);if(!sel.isCollapsed){var del=document.createElement("span");del.className="tc-del";del.appendChild(rng.extractContents());rng.insertNode(del);rng.setStartAfter(del);rng.collapse(true)}var ins=document.createElement("span");ins.className="tc-ins";ins.textContent=e.key;rng.insertNode(ins);rng.setStartAfter(ins);rng.collapse(true);sel.removeAllRanges();sel.addRange(rng);saveTxt()}});
pg.addEventListener("input",function(){updStats();clearTimeout(window._svt);window._svt=setTimeout(autoSave,2000);scheduleTxtSave();scheduleAutoPaginate(pg);scheduleRevBadge();});
pg.addEventListener("paste",function(e){var items=e.clipboardData&&e.clipboardData.items;if(items){for(var i=0;i<items.length;i++){if(items[i].type.indexOf("image")!==-1){e.preventDefault();var blob=items[i].getAsFile();var reader=new FileReader();reader.onload=function(ev){document.execCommand("insertHTML",false,'<img src="'+ev.target.result+'" style="max-width:100%;height:auto">');saveTxt();scheduleAutoPaginate(pg,150)};reader.readAsDataURL(blob);return}}}/* long text pastes overflow the page fast — paginate immediately (default input debounce is too slow and leaves the page scrolled/clipped) */scheduleAutoPaginate(pg,60)})
}
document.addEventListener("mousemove",function(e){if(resizingImg){var dx=e.clientX-resizeStart.x;var newW=Math.max(50,resizeStart.w+dx);resizingImg.style.width=newW+"px";resizingImg.style.height="auto"}});
document.addEventListener("mouseup",function(){if(resizingImg){resizingImg.classList.remove("resizing");resizingImg=null;saveTxt()}});
function initApp(){var pg=gPg(1);if(pg){pg.innerHTML="<p><br></p>";pg.style.padding=margins.t+"mm "+margins.r+"mm "+margins.b+"mm "+margins.l+"mm";setupPgEv(pg);pg.focus()}var cv=gCv(1);if(cv)initCv(cv);applyPgSetup(1);applyZm();updTh();updStats();saveTxt();}
area.addEventListener("scroll",function(){var closest=1,minD=Infinity;wbQuery(".pg-wrap").forEach(function(w){var d=Math.abs(w.getBoundingClientRect().top-area.getBoundingClientRect().top);if(d<minD){minD=d;closest=parseInt(w.dataset.pg)}});if(closest!==curPg){curPg=closest;updTh();updStats();wbIn("pgJump").value=String(curPg)}});
document.addEventListener("keydown",function(e){if(!ov||ov.style.display==="none")return;var ctrl=e.ctrlKey||e.metaKey;var key=e.key.toLowerCase();
if(ctrl){if(key==="b"){e.preventDefault();fmt("bold")}else if(key==="i"){e.preventDefault();fmt("italic")}else if(key==="u"){e.preventDefault();fmt("underline")}else if(key==="z"){if(e.shiftKey){e.preventDefault();drawOn?redoDraw():wbRedo()}else{e.preventDefault();drawOn?undoDraw():wbUndo()}}else if(key==="y"){e.preventDefault();drawOn?redoDraw():wbRedo()}else if(key==="s"){if(e.shiftKey){e.preventDefault();savePDF()}else{e.preventDefault();autoSave()}}else if(key==="k"){e.preventDefault();openMdl("mLink")}else if(key==="t"){e.preventDefault();openMdl("mTpl")}else if(key==="d"){e.preventDefault();togDraw()}else if(key==="="){e.preventDefault();zmIn()}else if(key==="+"){e.preventDefault();zmIn()}else if(key==="-"){e.preventDefault();zmOut()}else if(key==="0"){e.preventDefault();zoom=100;applyZm()}else if(key==="f"){e.preventDefault();openMdl("mFind")}else if(key==="l"){if(e.shiftKey){e.preventDefault();toggleLibraryPanel()}else{e.preventDefault();fmt("justifyLeft")}}else if(key==="n"&&e.shiftKey){e.preventDefault();fmt("insertOrderedList")}else if(key==="e"){if(e.shiftKey){e.preventDefault();togTrack()}else{e.preventDefault();fmt("justifyCenter")}}else if(key==="r"){if(e.shiftKey){e.preventDefault();toggleReviewPanel()}else{e.preventDefault();fmt("justifyRight")}}else if(key==="j"){e.preventDefault();fmt("justifyFull")}else if(key==="x"&&e.shiftKey){e.preventDefault();fmt("strikeThrough")}else if(key==="["){e.preventDefault();chgSize(-2)}else if(key==="]"){e.preventDefault();chgSize(2)}else if(key==="enter"){e.preventDefault();addPageBreakAtCursor()}}
if(e.key==="Escape"){closeMdl("mTpl");closeMdl("mSave");closeMdl("mSetup");closeMdl("mImg");closeMdl("mLink");closeMdl("mTbl");closeMdl("mFind");closeMdl("mBanners");closeMdl("mAIReview");closeMdl("mCustomPrompt");document.getElementById("markErrMenu").classList.remove("show");if(drawOn)togDraw();}
if(e.key==="F11"){e.preventDefault();togFs()}
if(e.key==="Enter"&&e.target.id==="pgJump"){e.preventDefault();goToPageInput()}
if(drawOn&&!ctrl){if(key==="p")setTool("pen");else if(key==="e")setTool("eraser");else if(key==="b")setTool("brush");else if(key==="l")setTool("line");else if(key==="r")setTool("rect");else if(key==="c")setTool("circle")}});
document.addEventListener("selectionchange",updTb);setInterval(autoSave,30000);window.addEventListener("resize",function(){wbQuery(".wb-cv").forEach(syncCv)});
(function(){
  var wa=wbIn("wbArea");
  if(!wa)return;
  wa.addEventListener("mousedown",function(e){
    if(!isHandActive)return;
    e.preventDefault();
    e.stopPropagation();
    isPanning=true;
    wa.classList.add("dragging");
    panStartX=e.clientX;
    panStartY=e.clientY;
    scrollStartX=wa.scrollLeft;
    scrollStartY=wa.scrollTop;
  },true);
  window.addEventListener("mousemove",function(e){
    if(!isHandActive||!isPanning)return;
    e.preventDefault();
    e.stopPropagation();
    var dx=e.clientX-panStartX;
    var dy=e.clientY-panStartY;
    wa.scrollLeft=scrollStartX-dx;
    wa.scrollTop=scrollStartY-dy;
  },true);
  window.addEventListener("mouseup",function(){
    if(isPanning){
      isPanning=false;
      var waEl=wbIn("wbArea");
      if(waEl)waEl.classList.remove("dragging");
    }
  },true);
  wa.addEventListener("touchstart",function(e){
    if(!isHandActive||e.touches.length!==1)return;
    isPanning=true;
    wa.classList.add("dragging");
    panStartX=e.touches[0].clientX;
    panStartY=e.touches[0].clientY;
    scrollStartX=wa.scrollLeft;
    scrollStartY=wa.scrollTop;
  },{passive:true});
  window.addEventListener("touchmove",function(e){
    if(!isHandActive||!isPanning||e.touches.length!==1)return;
    var dx=e.touches[0].clientX-panStartX;
    var dy=e.touches[0].clientY-panStartY;
    wa.scrollLeft=scrollStartX-dx;
    wa.scrollTop=scrollStartY-dy;
  },{passive:true});
  window.addEventListener("touchend",function(){
    if(isPanning){
      isPanning=false;
      var waEl=wbIn("wbArea");
      if(waEl)waEl.classList.remove("dragging");
    }
  });
})();

/* ===== WORD-LIKE RIBBON ===== */
window.setRibbonTab=function(name){var rb=document.getElementById("wbRibbon");if(rb&&rb.classList.contains("collapsed")){rb.classList.remove("collapsed");var cb=document.getElementById("ribbonCollapseBtn");if(cb)cb.innerHTML='<i class="fas fa-chevron-up"></i>';}document.querySelectorAll(".wb-rtab").forEach(function(b){b.classList.toggle("active",b.dataset.rtab===name)});document.querySelectorAll(".wb-ribbon-pane").forEach(function(p){p.classList.toggle("show",p.dataset.pane===name)});};
window.toggleRibbonCollapse=function(){var rb=document.getElementById("wbRibbon");if(!rb)return;rb.classList.toggle("collapsed");var cb=document.getElementById("ribbonCollapseBtn");if(cb)cb.innerHTML=rb.classList.contains("collapsed")?'<i class="fas fa-chevron-down"></i>':'<i class="fas fa-chevron-up"></i>';};
document.addEventListener("keydown",function(e){if(e.ctrlKey&&(e.key==="F1"||e.keyCode===112)){e.preventDefault();window.toggleRibbonCollapse();}});
(function(){var p=document.getElementById("micSettingsPanel");var rb=document.getElementById("wbRibbon");if(p&&rb){var h=rb.querySelector('.wb-ribbon-pane[data-pane="home"]');if(h)h.appendChild(p);}})();
/* ===== RIBBON: COMPACT MODE, QAT SAVE INDICATOR, WORD COUNT, STYLES ===== */
window.togCompact=function(){var rb=document.getElementById("wbRibbon");if(!rb)return;rb.classList.toggle("compact");var b=document.getElementById("btnCompact");if(b)b.classList.toggle("active",rb.classList.contains("compact"));applyZm();};
window.__wbDebug={autoPaginate:autoPaginate,flowPage:flowPage,flowSplit:flowSplit};
document.addEventListener("keydown",function(e){if(e.ctrlKey&&e.altKey&&(e.key==="c"||e.key==="C")){e.preventDefault();window.togCompact();}});
window.showWordCount=function(){updStats();var w=wbIn("stWords"),c=wbIn("stChars"),p=wbIn("stPg");alert("Words: "+(w?w.textContent.replace(/^Words:\\s*/i,""):"0")+"\\nCharacters: "+(c?c.textContent.replace(/^Chars:\\s*/i,""):"0")+"\\n"+(p?p.textContent:"Page 1/1"));};
window.fmtBlock=function(tag){if(tag==="p"){document.execCommand("formatBlock",false,"p");}else{document.execCommand("formatBlock",false,"<"+tag+">");}var pg=gPg(curPg);if(pg)pg.focus();saveTxt();};
(function(){
  var _origAutoSave=autoSave;
  autoSave=function(){
    _origAutoSave();
    var ind=document.getElementById("qatSaveInd");
    if(ind){ind.classList.add("busy");setTimeout(function(){ind.classList.remove("busy")},500);}
  };
})();
var RIBBON_CMDS=[["Undo","wbUndo()","fa-undo"],["Redo","wbRedo()","fa-redo"],["Cut","wbCut()","fa-cut"],["Copy","wbCopy()","fa-copy"],["Paste","wbPasteSmart()","fa-paste"],["Bold","fmt('bold')","fa-bold"],["Italic","fmt('italic')","fa-italic"],["Underline","fmt('underline')","fa-underline"],["Strikethrough","fmt('strikeThrough')","fa-strikethrough"],["Text Color","document.getElementById('txtClr').click()","fa-font"],["Highlight","document.getElementById('hlClr').click()","fa-highlighter"],["Align Left","fmt('justifyLeft')","fa-align-left"],["Align Center","fmt('justifyCenter')","fa-align-center"],["Align Right","fmt('justifyRight')","fa-align-right"],["Bullet List","fmt('insertUnorderedList')","fa-list-ul"],["Numbered List","fmt('insertOrderedList')","fa-list-ol"],["Find & Replace","openMdl('mFind')","fa-search"],["Word Count","showWordCount()","fa-list-ol"],["Microphone & Transcribe","toggleMicSettingsPopover(null)","fa-microphone"],["Text Box","insertTextBox()","fa-text-width"],["Insert Link","openMdl('mLink')","fa-link"],["Insert Image","openMdl('mImg')","fa-image"],["Open File (PDF/DOCX)","openMdl('mFile')","fa-folder-open"],["Insert Table","openMdl('mTbl')","fa-table"],["Templates","openMdl('mTpl')","fa-file-alt"],["Banners","openMdl('mBanners')","fa-flag"],["Page Break","addPageBreakAtCursor()","fa-level-down-alt"],["Hand Tool","togHand()","fa-hand-paper"],["Draw","togDraw()","fa-pencil-alt"],["Track Changes","togTrack()","fa-user-edit"],["Mark Error","toggleMarkErrMenu()","fa-exclamation-triangle"],["Review Panel","openReviewPanel()","fa-clipboard-check"],["Thesaurus","openThesaurusFromCtx()","fa-book-open"],["Library","toggleLibraryPanel()","fa-book"],["Theme","document.getElementById('themeSelect').focus()","fa-palette"],["Pages Sidebar","togglePgSide()","fa-columns"],["Page Setup","openMdl('mSetup')","fa-cog"],["Zoom In","zmIn(25)","fa-search-plus"],["Zoom Out","zmOut(25)","fa-search-minus"],["Save / Export","openMdl('mSave')","fa-save"],["Fullscreen","togFs()","fa-expand"],["Compact Mode","togCompact()","fa-compress-alt"]];
window.ribbonSearch=function(q){var drop=document.getElementById("ribbonSearchDrop");if(!drop)return;q=(q||"").toLowerCase().trim();if(!q){drop.style.display="none";return;}var hits=RIBBON_CMDS.filter(function(c){return c[0].toLowerCase().indexOf(q)>=0});drop.innerHTML="";if(!hits.length){drop.innerHTML='<div class="rs-none">No matching commands</div>';}else{hits.slice(0,9).forEach(function(c){var d=document.createElement("div");d.className="rs-item";d.setAttribute("data-cmd",c[1]);d.innerHTML='<i class="fas '+c[2]+'"></i><span>'+c[0]+'</span>';d.onclick=function(){window.ribbonSearchExec();};drop.appendChild(d);});}drop.style.display="block";};
window.ribbonSearchExec=function(){var drop=document.getElementById("ribbonSearchDrop");var cmd=null;if(drop){var first=drop.querySelector(".rs-item");if(first)cmd=first.getAttribute("data-cmd");}if(!cmd){var inp=document.getElementById("ribbonSearch");var q=(inp?inp.value:"").toLowerCase().trim();var hit=RIBBON_CMDS.filter(function(c){return c[0].toLowerCase().indexOf(q)>=0})[0];if(hit)cmd=hit[1];}window.ribbonSearchHide();if(cmd){try{new Function(cmd)();}catch(e){}}};
window.ribbonSearchHide=function(){var drop=document.getElementById("ribbonSearchDrop");if(drop)drop.style.display="none";};
document.addEventListener("click",function(e){var d=document.getElementById("ribbonSearchDrop");if(d&&d.style.display==="block"&&!d.contains(e.target)&&!e.target.closest(".wb-ribbon-search"))window.ribbonSearchHide();});
/* ===== PAGES SIDEBAR COLLAPSE ===== */
window.togglePgSide=function(){var s=wbIn("pgSide");if(!s)return;setPgSide(s.classList.contains("collapsed"));};
window.setPgSide=function(show){var s=wbIn("pgSide"),t=wbIn("psExpandTab");if(!s)return;if(show){s.classList.remove("collapsed");if(t)t.classList.remove("show");}else{s.classList.add("collapsed");if(t)t.classList.add("show");}var b=wbIn("btnPgSide");if(b)b.classList.toggle("active",!show);applyZm();};
/* ===== UNDO / REDO — one coalesced step per typing burst, works for text + drawings ===== */
var _txtSaveTimer=null;
function scheduleTxtSave(){if(!_txtSaveTimer){saveTxt();_txtSaveTimer=setTimeout(function(){_txtSaveTimer=null;},900);}}
/* ===== AUTO PAGE-BREAK — Word-style flow: overflow flows to the next page (creating one when needed) ===== */
var _autoPgTimer=null,_autoPaginating=false;
function scheduleAutoPaginate(pg,delay){clearTimeout(_autoPgTimer);_autoPgTimer=setTimeout(function(){autoPaginate(pg,0);},delay||700);}
function autoPaginate(pg,depth){
  if(drawOn||!pg||_autoPaginating)return;
  var sel=window.getSelection();
  var anchorNode=sel&&sel.rangeCount?sel.getRangeAt(0).startContainer:null;
  var anchorOff=sel&&sel.rangeCount?sel.getRangeAt(0).startOffset:0;
  _autoPaginating=true;
  try{
  function nextOf(p){var n=parseInt(p.dataset.pg);var r=null;wbQuery(".pg-wrap").forEach(function(w){if(parseInt(w.dataset.pg)===n+1){var q=w.querySelector(".wb-pg");if(q)r=q;}});return r;}
  var guard=0,cur=pg;
  while(cur&&guard<300){
    guard++;
    cur.scrollTop=0; /* a pasted blob can leave residual scroll — measure from the true top */
    var ov=cur.scrollHeight-cur.clientHeight;
    if(ov<2){ /* page fits — advance (flowPage may have created further pages) */
      var nxOk=nextOf(cur);
      if(!nxOk)break;
      cur=nxOk;
      continue;
    }
    var movedTo=flowPage(cur);
    if(!movedTo){
      /* Arithmetic said everything fits, yet the page really overflows (layout
         vs offsetHeight drift). Backstop: split — or, if unsplitable, move — the
         last block using the truly available budget, then re-measure this page. */
      var lastEl=cur.children[cur.children.length-1];
      if(!lastEl)break;
      var cs0=getComputedStyle(cur);
      var budget=Math.max(40,cur.clientHeight-(parseFloat(cs0.paddingTop)||0)-(parseFloat(cs0.paddingBottom)||0)-ov);
      var rem=flowSplit(lastEl,budget);
      if(!rem){
        /* Nothing splittable left (an image/embed taller than a page, a wall of text with no
           break point). Never push it to a fresh page — that empties this one and repeats on
           every page after it (the blank-page flood). Skip to the next page instead so the
           rest of the document still gets paginated. */
        var skipPg=nextOf(cur);
        if(!skipPg)break;
        cur=skipPg;
        continue;
      }
      var nx=nextOf(cur);
      if(!nx){wbAddPg();nx=nextOf(cur);}
      if(!nx)break;
      nx.insertBefore(rem,nx.firstChild);
      continue;
    }
    var ovAfter=cur.scrollHeight-cur.clientHeight;
    if(ovAfter>=ov){
      /* This page cannot be made to fit (e.g. one image/table/word taller than a page) —
         move on to the next page instead of retrying this one forever. */
      var nxtPg=nextOf(cur);
      if(!nxtPg)break;
      cur=nxtPg;
      continue;
    }
    /* stay on this page until it actually fits */
  }
  }finally{_autoPaginating=false;}
  wbQuery(".wb-pg").forEach(function(p){p.scrollTop=0;});
  updTh();updStats();saveTxt();scheduleRevBadge();
  if(anchorNode&&anchorNode.isConnected&&(anchorNode.nodeValue||anchorNode.textContent||"").length){
    try{var r=document.createRange();r.setStart(anchorNode,Math.min(anchorOff,(anchorNode.nodeValue||anchorNode.textContent||"").length));r.collapse(true);var s=window.getSelection();s.removeAllRanges();s.addRange(r);var ap=anchorNode.parentElement;while(ap&&!ap.classList.contains("wb-pg"))ap=ap.parentElement;if(ap&&ap.dataset.pg){curPg=parseInt(ap.dataset.pg);updTh();updStats();}}catch(err){}
  }
}
/* Moves one page's overflow to the top of the next page (creating it if needed). Returns the next page or null. */
function flowPage(pg){
  if(drawOn||!pg)return null;
  var n=parseInt(pg.dataset.pg);
  var next=null;
  wbQuery(".pg-wrap").forEach(function(w){if(parseInt(w.dataset.pg)===n+1){var p=w.querySelector(".wb-pg");if(p)next=p;}});
  if(next){
    /* strip the target's empty placeholder <p><br></p> so it doesn't inflate the page */
    var nk=Array.prototype.slice.call(next.children);
    for(var q=nk.length-1;q>=0;q--){
      var nq=nk[q];
      if(nq.tagName==="P"&&(nq.textContent||"").trim()===""){nq.parentNode.removeChild(nq);}
      else break;
    }
  }
  /* drop the createPg placeholder <p><br></p> so it doesn't push the page over the limit */
  var kids2=Array.prototype.slice.call(pg.children);
  for(var k2=kids2.length-1;k2>=0;k2--){
    var e2=kids2[k2];
    if(e2.tagName==="P"&&(e2.textContent||"").trim()===""){e2.parentNode.removeChild(e2);}
    else break;
  }
  var kids=Array.prototype.slice.call(pg.children).filter(function(k){return k.tagName!=="P"||(k.textContent||"").trim()!=="";});
  if(!kids.length){
    /* pasted content can land as loose text nodes — wrap them in paragraphs so they can flow */
    var tn=[],w=document.createTreeWalker(pg,NodeFilter.SHOW_TEXT),t;
    while((t=w.nextNode())){if((t.nodeValue||"").trim())tn.push(t);}
    if(!tn.length)return null;
    tn.forEach(function(n){var p=document.createElement("p");n.parentNode.insertBefore(p,n);p.appendChild(n);});
    kids=Array.prototype.slice.call(pg.children);
    if(!kids.length)return null;
  }
  /* Exact budget: how much content fits between the paddings. No fudge factors —
     flow() keeps iterating until scrollHeight <= clientHeight, so an over-tight
     budget can only produce extra refinement passes, never clipped text. */
  var cs=getComputedStyle(pg);
  var padT=parseFloat(cs.paddingTop)||0,padB=parseFloat(cs.paddingBottom)||0;
  var limit=Math.max(40,pg.clientHeight-padT-padB);
  var fit=[],rest=[],acc=0;
  for(var i=0;i<kids.length;i++){
    var el=kids[i];
    /* offsetHeight excludes margins, but margins contribute to scrollHeight — add a collapse-aware allowance */
    var mT=parseFloat(getComputedStyle(el).marginTop)||0,mB=parseFloat(getComputedStyle(el).marginBottom)||0;
    var gap=acc===0?Math.max(0,mT):mT;
    var eh=el.offsetHeight+gap+Math.max(0,mB)+1;
    if(acc+eh<=limit){fit.push(el);acc+=eh;}
    else if(acc===0&&eh>limit){
      /* single block that doesn't fit (even after margin allowance) — split it at a word
         boundary. Gate on the EFFECTIVE height: offsetHeight alone can under-report the
         real box contribution and would move the same block page-to-page forever. */
      var rem=flowSplit(el,limit);
      if(rem){rest.push(rem);fit.push(el);}
      else if(scaleToFit(el,limit)){fit.push(el);acc+=eh;}
      else{
        /* Truly unsplittable (a wall of text with no break point, a fixed-size embed...) and
           taller than an empty page. Keep it on this page (the page clips it) — pushing it to
           a new page would empty this one and repeat on every page after it, which is how a
           paste used to pile up ~150 blank pages. Following content still flows normally. */
        fit.push(el);acc+=eh;
      }
    }
    else rest.push(el);
  }
  if(!rest.length)return null;
  rest.forEach(function(el){pg.removeChild(el);});
  _autoPaginating=true;
  try{
    if(!next){wbAddPg();next=gPg(totPg);}
    if(next){for(var ri=rest.length-1;ri>=0;ri--){next.insertBefore(rest[ri],next.firstChild);}}
  }finally{_autoPaginating=false;}
  return next;
}
/* Word-style: an oversized image is scaled down to the printable area instead of being pushed
   from page to page — it has no text to split, so it could otherwise never fit any page. */
function scaleToFit(el,limit){
  var img=el&&el.tagName==="IMG"?el:null;
  if(!img&&el&&el.querySelectorAll){
    /* a figure/paragraph that is just one image (Insert Image path) */
    var imgs=el.querySelectorAll("img");
    if(imgs.length===1&&!(el.textContent||"").trim())img=imgs[0];
  }
  if(!img||img.offsetHeight<=limit)return false;
  var other=Math.max(0,el.offsetHeight-img.offsetHeight); /* caption / wrapper chrome */
  var avail=Math.floor(limit-other-2);
  if(avail<80)return false;
  /* display:block removes the inline baseline gap under the image, -2px absorbs rounding */
  img.style.display="block";
  img.style.maxHeight=avail+"px";
  img.style.height="auto";
  img.style.width="auto";
  img.style.maxWidth="100%";
  return img.offsetHeight<=avail+1;
}
/* Wrap loose inline runs (bare text / inline elements) of a container in zero-margin <div>s, so
   a pasted wrapper that mixes text with paragraphs can still be split at child boundaries.
   Visually identical to the anonymous inline box the browser already renders. */
var WB_INLINE_TAGS={SPAN:1,B:1,I:1,EM:1,STRONG:1,U:1,S:1,STRIKE:1,A:1,BR:1,SUP:1,SUB:1,SMALL:1,MARK:1,CODE:1,LABEL:1,IMG:1,FONT:1,TT:1,BIG:1};
function wrapLooseInline(el){
  var run=null,hasText=false;
  function flush(){
    if(run&&hasText){var box=document.createElement("div");box.style.margin="0";el.insertBefore(box,run[0]);run.forEach(function(n){box.appendChild(n);});}
    run=null;hasText=false;
  }
  var n=el.firstChild;
  while(n){
    var nx=n.nextSibling;
    if(!n.tagName||WB_INLINE_TAGS[n.tagName]){
      if(!run)run=[];
      run.push(n);
      if(n.nodeType===3?(n.nodeValue||"").trim():n.tagName!=="BR")hasText=true;
    }else flush();
    n=nx;
  }
  flush();
}
/* Split a container at the largest child boundary that fits: the tail children move into a
   shallow clone of the container, inserted right after it (so the caller can flow it to the
   next page with structure intact). A single nested child (Google-Docs-style <div><div><p>…
   paste soup) is split recursively and its tail re-wrapped in a clone of the parent so the
   returned remainder is always a direct sibling of el. Returns null when no cut can be made
   (every child fits, or the first child cannot be split either). */
function splitAtChildBoundary(el,kids,limit,depth){
  var ecs=getComputedStyle(el);
  var inner=Math.max(40,limit-((parseFloat(ecs.paddingTop)||0)+(parseFloat(ecs.paddingBottom)||0)+(parseFloat(ecs.borderTopWidth)||0)+(parseFloat(ecs.borderBottomWidth)||0)));
  var acc=0,cut=-1,i;
  for(i=0;i<kids.length;i++){
    var kcs=getComputedStyle(kids[i]);
    var kh=kids[i].offsetHeight+(parseFloat(kcs.marginTop)||0)+(parseFloat(kcs.marginBottom)||0)+1;
    if(acc+kh<=inner){acc+=kh;cut=i;}else break;
  }
  if(cut<0){
    /* the first child alone is already too tall — split inside it and keep its tail with
       everything that follows */
    var innerRem=flowSplit(kids[0],inner,depth+1);
    if(!innerRem)return null;
    var wrap=el.cloneNode(false);wrap.removeAttribute("id");
    kids[0].parentNode.removeChild(innerRem);
    wrap.appendChild(innerRem);
    for(i=1;i<kids.length;i++)wrap.appendChild(kids[i]);
    el.parentNode.insertBefore(wrap,el.nextSibling);
    return wrap;
  }
  if(cut>=kids.length-1)return null; /* every child fits — the overflow is the container box itself */
  var rem=el.cloneNode(false);rem.removeAttribute("id");
  for(i=cut+1;i<kids.length;i++)rem.appendChild(kids[i]);
  el.parentNode.insertBefore(rem,el.nextSibling);
  return rem;
}
/* Split a block taller than the page limit at a word boundary; returns the remainder block (already inserted after el) or null.
   The split point is measured on a CLONE inside an offscreen scratch container:
   live Range heights get CLAMPED by overflow:hidden ancestors (the page, .wb-main),
   so an over-tall block would look like it fits, and the zoom transform distorts
   them anyway. The scratch clone is unclipped, untransformed, and inherits the
   page's exact width, fonts, line-height and padding — prefix heights are exact px.
   All Ranges and the final text-node walk operate on the CLONE/probe tree only. */
function flowSplit(el,limit,depth){
  /* A container block (pasted wrapper <div>, list, table…) is split at a CHILD boundary first,
     so its nested structure survives; the word-boundary split below would flatten paragraphs
     into loose text and, worse, mis-measure them. Loose text mixed into the container is
     wrapped into zero-margin boxes so it can take part in the child-boundary split too. */
  var hasBareText=false;
  for(var bi=0;bi<el.childNodes.length;bi++){
    var bc=el.childNodes[bi];
    if(bc.nodeType===3&&(bc.nodeValue||"").trim()){hasBareText=true;break;}
  }
  if((depth||0)<12&&el.children&&el.children.length){
    if(hasBareText){wrapLooseInline(el);hasBareText=false;}
    var ckids=Array.prototype.slice.call(el.children).filter(function(k){return k.tagName!=="BR";});
    if(ckids.length){
      var crem=splitAtChildBoundary(el,ckids,limit,depth||0);
      if(crem)return crem;
    }
  }
  var probe=el.cloneNode(true);
  (function stripIds(root){
    if(root.removeAttribute)root.removeAttribute("id");
    if(root.querySelectorAll){var all=root.querySelectorAll("[id]");for(var i=0;i<all.length;i++)all[i].removeAttribute("id");}
  })(probe);
  var w=document.createTreeWalker(probe,NodeFilter.SHOW_TEXT);
  var nodes=[];var t;
  while((t=w.nextNode()))nodes.push(t);
  /* Lockstep walk of the LIVE el: text-node structure is identical to the clone, so
     index i in nodes[] maps to liveNodes[i] — the node the split must actually cut. */
  var wl=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  var liveNodes=[];
  while((t=wl.nextNode()))liveNodes.push(t);
  var len=0;nodes.forEach(function(n){len+=(n.nodeValue||"").length;});
  if(!len)return null;
  function pointFromOffset(off){
    for(var i=0;i<nodes.length;i++){
      var l=(nodes[i].nodeValue||"").length;
      if(off<=l)return {i:i,off:off};
      off-=l;
    }
    return {i:nodes.length-1,off:(nodes[nodes.length-1].nodeValue||"").length};
  }
  var hostPg=el.closest?el.closest(".wb-pg"):null;
  var hcs=hostPg?getComputedStyle(hostPg):null;
  var scratch=document.createElement("div");
  scratch.style.cssText="position:absolute;left:-99999px;top:0;visibility:hidden;box-sizing:border-box;overflow:visible;height:auto;margin:0;border:none";
  if(hcs){
    scratch.style.width=Math.max(50,hostPg.clientWidth-(parseFloat(hcs.paddingLeft)||0)-(parseFloat(hcs.paddingRight)||0))+"px";
    scratch.style.padding=hcs.padding;
    scratch.style.fontFamily=hcs.fontFamily;
    scratch.style.fontSize=hcs.fontSize;
    scratch.style.lineHeight=hcs.lineHeight;
  }else{scratch.style.width=(el.offsetWidth||600)+"px";}
  scratch.appendChild(probe);
  document.body.appendChild(scratch);
  /* Measure the prefix height by TRUNCATION: clone the block, cut every text node at
     the given offset, and read the element's offsetHeight. Range.getBoundingClientRect()
     proved unreliable here — Chrome returns a rect union that under-reports multi-line
     text inside hidden/offscreen containers — while element heights are exact layout
     ground truth. One clone per probe is cheap (a handful of iterations per split). */
  function prefixHeight(off){
    var c2=el.cloneNode(true);
    var w2=document.createTreeWalker(c2,NodeFilter.SHOW_TEXT);
    var seen=0,tn2;
    while((tn2=w2.nextNode())){
      var l=(tn2.nodeValue||"").length;
      if(seen+l<=off){seen+=l;continue;}                 /* node ends inside the prefix — keep it whole */
      if(seen>=off){tn2.nodeValue="";continue;}          /* node starts past the cut — drop it */
      tn2.nodeValue=tn2.nodeValue.slice(0,off-seen);     /* node straddles the cut — keep its head */
      seen=off;
    }
    scratch.replaceChild(c2,scratch.firstChild);
    return c2.offsetHeight;
  }
  var lo=0,hi=len;
  while(lo<hi){
    var mid=Math.floor((lo+hi+1)/2); /* +1: mid must always advance — ceil() could overshoot the true fit point and clip a line */
    if(prefixHeight(mid)<=limit)lo=mid;else hi=mid-1;
  }
  if(scratch.parentNode)scratch.parentNode.removeChild(scratch);
  var off=lo;
  if(off<=0||off>=len)return null;
  var txt="",acc=0;
  for(var i=0;i<nodes.length;i++){
    var l=(nodes[i].nodeValue||"").length;
    if(acc+l>=off){txt+=(nodes[i].nodeValue||"").slice(0,off-acc);break;}
    txt+=(nodes[i].nodeValue||"");acc+=l;
  }
  for(var j=txt.length-1;j>=0;j--){if(/[\s\p{P}]/u.test(txt[j])){off-=(txt.length-1-j);break;}}
  if(off<=0)return null;
  var p=pointFromOffset(off);
  var live=liveNodes[p.i];
  if(!live||live.nodeType!==3)return null;
  var tail=null;
  if(p.off>0&&p.off<(live.nodeValue||"").length){tail=live.splitText(p.off);}
  else if(p.off===0){tail=live;}
  else{return null;}
  var rem=el.cloneNode(false);
  rem.removeAttribute("id");
  var node=tail;
  while(node){var nx=node.nextSibling;rem.appendChild(node);node=nx;}
  el.parentNode.insertBefore(rem,el.nextSibling);
  return rem;
}
/* ===== PAGE BREAK AT CURSOR ===== */
window.addPageBreakAtCursor=function(){
  var pg=gPg(curPg);if(!pg)return;
  pg.focus();
  var sel=window.getSelection();
  var rest=[];
  if(sel&&sel.rangeCount&&pg.contains(sel.getRangeAt(0).commonAncestorContainer)){
    var range=sel.getRangeAt(0);
    var node=range.startContainer;
    var pEl=node.nodeType===1?node:node.parentElement;
    var paras=Array.prototype.slice.call(pg.children);
    var idx=paras.indexOf(pEl);
    if(idx>=0){for(var i=idx+1;i<paras.length;i++)rest.push(paras[i]);rest.forEach(function(el){pg.removeChild(el);});}
  }
  wbAddPg();
  var np=gPg(totPg);
  if(np&&rest.length){rest.forEach(function(el){np.appendChild(el);});}
  saveTxt();
};
/* ===== SMART REVIEW PANEL — track changes + error marks together ===== */
function revItems(){var items=[];wbQuery(".wb-pg").forEach(function(pg,n){Array.prototype.slice.call(pg.querySelectorAll(".tc-del,.tc-ins,.err-mark,.ai-err-inline,.ai-correction")).forEach(function(el){items.push({el:el,page:n+1});});});return items;}
window.updateRevCountBadge=function(){var items=revItems();var b=document.getElementById("revCountBadge");if(b)b.textContent=items.length;var pc=document.getElementById("revPanelCount");if(pc)pc.textContent=items.length;};
var _revBadgeTimer=null;
function scheduleRevBadge(){clearTimeout(_revBadgeTimer);_revBadgeTimer=setTimeout(updateRevCountBadge,500);}
window.openReviewPanel=function(){var p=document.getElementById("reviewPanel");if(!p)return;renderReviewPanel();p.classList.add("open");};
window.closeReviewPanel=function(){var p=document.getElementById("reviewPanel");if(p)p.classList.remove("open");};
function renderReviewPanel(){
  var list=document.getElementById("reviewList");var sum=document.getElementById("reviewSummary");
  if(!list)return;
  var items=revItems();
  updateRevCountBadge();
  var counts={};
  items.forEach(function(it){var t=it.el.className.indexOf("tc-del")>=0?"Deleted":it.el.className.indexOf("tc-ins")>=0?"Inserted":it.el.dataset.errType?it.el.dataset.errType:"AI Correction";counts[t]=(counts[t]||0)+1;});
  if(sum)sum.innerHTML=Object.keys(counts).map(function(k){return '<span class="rchip">'+k+': '+counts[k]+'</span>';}).join('')||'<span class="rchip">No marks yet</span>';
  if(!items.length){list.innerHTML='<div class="rev-empty">🎉 Nothing to review.<br>Track changes (Review tab) or mark errors to build a smart list here.</div>';return;}
  list.innerHTML=items.map(function(it,i){
    var cls=it.el.className||"";
    var kind=cls.indexOf("tc-del")>=0?"Deleted":cls.indexOf("tc-ins")>=0?"Inserted":(it.el.dataset.errType||"AI Correction");
    var quote=(it.el.textContent||"").trim().slice(0,80)||"(empty)";
    var corr=it.el.nextElementSibling&&it.el.nextElementSibling.className==="ai-correction"?it.el.nextElementSibling.textContent:"";
    var actions='<div class="rev-acts"><button class="rev-acc" onclick="acceptRevItem('+i+')">✓ Accept</button><button class="rev-rej" onclick="removeRevItem('+i+')">✕ Remove Mark</button></div>';
    return '<div class="rev-item"><div class="rev-meta">Page '+it.page+' · '+kind+(corr?' → '+corr:'')+'</div><div class="rev-quote">'+quote+'</div>'+actions+'</div>';
  }).join('');
  window._revItems=items;
}
window.acceptRevItem=function(i){var items=window._revItems||[];var it=items[i];if(!it||!it.el||!it.el.parentNode)return;var el=it.el;
  if(el.className.indexOf("tc-del")>=0){el.parentNode.removeChild(el);}
  else if(el.className.indexOf("tc-ins")>=0){var frag=document.createDocumentFragment();while(el.firstChild)frag.appendChild(el.firstChild);el.parentNode.replaceChild(frag,el);el.parentNode.normalize();}
  else if(el.nextElementSibling&&el.nextElementSibling.className==="ai-correction"){var c=el.nextElementSibling.textContent;var sp=document.createElement("span");sp.textContent=c;el.parentNode.replaceChild(sp,el);el.parentNode.removeChild(el.nextElementSibling);el.parentNode.normalize();}
  else{el.parentNode.removeChild(el);}
  saveTxt();renderReviewPanel();updTh();};
window.removeRevItem=function(i){var items=window._revItems||[];var it=items[i];if(!it||!it.el||!it.el.parentNode)return;it.el.parentNode.removeChild(it.el);saveTxt();renderReviewPanel();updTh();};
window.reviewAcceptAll=function(){var items=revItems();items.forEach(function(it){var el=it.el;if(!el||!el.parentNode)return;
  if(el.className.indexOf("tc-del")>=0){el.parentNode.removeChild(el);}
  else if(el.className.indexOf("tc-ins")>=0){var frag=document.createDocumentFragment();while(el.firstChild)frag.appendChild(el.firstChild);el.parentNode.replaceChild(frag,el);el.parentNode.normalize();}
  else if(el.nextElementSibling&&el.nextElementSibling.className==="ai-correction"){var c=el.nextElementSibling.textContent;var sp=document.createElement("span");sp.textContent=c;el.parentNode.replaceChild(sp,el);el.parentNode.removeChild(el.nextElementSibling);el.parentNode.normalize();}
  else{el.parentNode.removeChild(el);}});saveTxt();renderReviewPanel();updTh();};
window.reviewRemoveAll=function(){var items=revItems();items.forEach(function(it){if(it.el&&it.el.parentNode)it.el.parentNode.removeChild(it.el);});saveTxt();renderReviewPanel();updTh();};
window.toggleReviewPanel=function(){var p=document.getElementById("reviewPanel");if(!p)return;if(p.classList.contains("open"))closeReviewPanel();else openReviewPanel();};
/* ===== LIBRARY DETACHED WINDOW ===== */
window.detachLibrary=function(){
  var libW=window.open("","LibDetachWin","width=480,height=640,resizable=yes,scrollbars=yes");
  if(!libW){alert("Please allow popups to open the Library in its own window.");return;}
  var data=JSON.stringify({doc:LIB_DOC_PROMPTS,web:LIB_WEB_PROMPTS,custom:getCustomPrompts()});
  var master=JSON.stringify(AI_MASTER_PROMPT);
  var S1='<'+"script";
  var S2='</scr'+'ipt>';
  var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Library — Prompts & Assessor</title>'
  +'<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">'
  +'<style>*{box-sizing:border-box}body{margin:0;font-family:Segoe UI,system-ui,sans-serif;background:#f7fafc;color:#1a202c}.hdr{display:flex;align-items:center;gap:8px;padding:12px 14px;background:linear-gradient(90deg,#3182ce,#2b6cb0);color:#fff;font-weight:800}.tabs{display:flex;background:#fff;border-bottom:1px solid #e2e8f0}.tab{flex:1;padding:9px 4px;border:none;background:transparent;font-size:11px;font-weight:700;color:#718096;cursor:pointer;border-bottom:3px solid transparent}.tab.on{color:#3182ce;border-bottom-color:#3182ce}.search{padding:10px 12px}.search input{width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none}.cards{flex:1;overflow-y:auto;padding:10px}.card{background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px}.card h4{margin:0 0 4px;font-size:13px}.card p{margin:0 0 8px;font-size:11px;color:#718096;line-height:1.5}.card button{width:100%;padding:7px;border:none;border-radius:6px;background:#3182ce;color:#fff;font-size:11px;font-weight:700;cursor:pointer}.assessor{display:none;flex-direction:column;gap:10px;padding:12px}.assessor.show{display:flex}.assessor textarea{width:100%;box-sizing:border-box;padding:9px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;resize:vertical}.assessor button{background:#805ad5;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700;cursor:pointer}.apply{background:#38a169!important}.note{font-size:10.5px;color:#718096;padding:0 12px 10px;line-height:1.6}</style></head>'
  +'<body style="display:flex;flex-direction:column;height:100vh">'
  +'<div class="hdr"><i class="fas fa-book-open"></i> Library <span style="margin-left:auto;font-size:10px;font-weight:600;opacity:.85">Detached window</span></div>'
  +'<div class="tabs"><button class="tab on" id="tDoc">Document</button><button class="tab" id="tWeb">Web Pages</button><button class="tab" id="tCustom">My Prompts</button><button class="tab" id="tAss">Assessor</button></div>'
  +'<div class="search"><input id="q" placeholder="Search prompts..." oninput="render()"></div>'
  +'<div class="cards" id="cards"></div>'
  +'<div class="assessor" id="assBox"><textarea id="aiIn" style="height:110px" placeholder="Paste learner writing here..."></textarea><button onclick="copyMaster()">Copy Master Prompt</button><textarea id="aiJson" style="height:90px;font-family:monospace;font-size:11px" placeholder="Paste the AI JSON response here..."></textarea><button class="apply" onclick="applyReview()">Apply Review to Document</button><div class="note">Copy the master prompt, paste it + the writing into any AI chatbot, then paste the JSON result back and press Apply — it is applied to the document in the lesson window.</div></div>'
  +S1+'>var DATA='+data+';var MASTER='+master+';var tab="doc";'
  +'function allPrompts(){return DATA.doc.concat(DATA.web,DATA.custom,[{id:"master",prompt:MASTER}]);}'
  +'function findP(id){var a=allPrompts();for(var i=0;i<a.length;i++){if(a[i].id===id)return a[i];}return null;}'
  +'function render(){var q=(document.getElementById("q").value||"").toLowerCase();var arr=tab==="doc"?DATA.doc:tab==="web"?DATA.web:DATA.custom;var c=document.getElementById("cards");c.innerHTML="";arr.filter(function(p){return !q||(p.title+" "+p.desc).toLowerCase().indexOf(q)>=0;}).forEach(function(p){var d=document.createElement("div");d.className="card";d.innerHTML="<h4>"+p.icon+" "+p.title+"</h4><p>"+p.desc+"</p>";var b=document.createElement("button");b.textContent="Copy Prompt";b.onclick=function(){var f=findP(p.id);if(!f)return;navigator.clipboard.writeText(f.prompt).then(function(){b.textContent="Copied!";setTimeout(function(){b.textContent="Copy Prompt";},1200);}).catch(function(){prompt("Copy prompt:",f.prompt);});};d.appendChild(b);c.appendChild(d);});if(!c.children.length)c.innerHTML="<p style=\"color:#a0aec0;font-size:12px;text-align:center;padding:20px\">No prompts found.</p>";}'
  +'function setTab(t,b){tab=t;["tDoc","tWeb","tCustom","tAss"].forEach(function(id){var e=document.getElementById(id);if(e)e.classList.remove("on");});b.classList.add("on");var ass=document.getElementById("assBox");var cards=document.getElementById("cards");if(t==="ass"){ass.classList.add("show");cards.style.display="none";}else{ass.classList.remove("show");cards.style.display="";render();}}'
  +'function copyMaster(){var txt=MASTER+(document.getElementById("aiIn").value||"[PASTE LEARNER WRITING HERE]");navigator.clipboard.writeText(txt).then(function(){alert("Master prompt copied!");}).catch(function(){prompt("Copy master prompt:",txt);});}'
  +'function applyReview(){var raw=document.getElementById("aiJson").value.trim();if(!raw){alert("Please paste the AI JSON response first.");return;}try{JSON.parse(raw);}catch(e){alert("Invalid JSON: "+e.message);return;}if(window.opener){window.opener.postMessage({type:"wb-apply-ai",json:raw},"*");alert("Sent to the lesson window — the review is applied to the document there.");}else{alert("The lesson window is not available. Copy the JSON and paste it in the Library panel of the Writeboard instead.");}}'
  +'document.getElementById("tDoc").onclick=function(){setTab("doc",this);};document.getElementById("tWeb").onclick=function(){setTab("web",this);};document.getElementById("tCustom").onclick=function(){setTab("custom",this);};document.getElementById("tAss").onclick=function(){setTab("ass",this);};render();'
  +S2+'</body></html>';
  libW.document.open();libW.document.write(html);libW.document.close();libW.focus();
};
/* Apply AI JSON arriving from the detached Library / Assessor window */
window.addEventListener("message",function(ev){if(!ev.data||ev.data.type!=="wb-apply-ai")return;try{var json=JSON.parse(ev.data.json);if(json.type==="doc_annotation")applyDocAnnotation(json);else if(json.type==="web_page")applyWebPage(json);else if(json.type==="whiteboard")applyWhiteboardElements(json);else alert("Unknown response type: "+json.type);}catch(e){alert("Invalid JSON from Library window: "+e.message);}});
var wbBtn=document.getElementById("whiteboard-btn");
var _wbInitialized=false;
window.openWhiteboard=function(){if(ov.style.display==="none"){ov.style.display="flex";ov.classList.add("theme-"+theme);document.body.style.overflow="hidden";if(!_wbInitialized){initApp();tryRestore();_wbInitialized=true;}}};
/* Own entry point + captured references. Presenter lessons also embed the older writeboard
   widget, whose globals may shadow ours (the later script wins) — nothing inside this engine
   may rely on window.* aliases, or it would drive the other widget's DOM. */
var wbOpen=window.openWhiteboard;
window.openSmartWriteboard=wbOpen;
if(wbBtn&&ov){wbBtn.addEventListener("click",function(){if(ov.style.display==="none")wbOpen();else wbClose()})}
window.closeWb=function(){autoSave();ov.style.display="none";document.body.style.overflow=""};
var wbClose=window.closeWb;
window.superscript=function(){document.execCommand("superscript",false,null);saveTxt()};
window.subscript=function(){document.execCommand("subscript",false,null);saveTxt()};
window.clearFormatting=function(){document.execCommand("removeFormat",false,null);saveTxt()};
window.insertTextBox=function(){document.execCommand("insertHTML",false,'<div class="text-box" contenteditable="true" style="min-height:60px"></div>');saveTxt()};
window.findText=function(){var txt=document.getElementById("findText").value;var pg=gPg(curPg);if(!txt||!pg)return;var content=pg.innerHTML;var regex=new RegExp(txt,"gi");var matches=content.match(regex);if(matches&&matches.length>0){alert("Found "+matches.length+" occurrence(s) of '"+txt+"'")}else{alert("Text not found")}};
window.replaceText=function(){var find=document.getElementById("findText").value;var replace=document.getElementById("replaceText").value;var pg=gPg(curPg);if(!find||!pg)return;var sel=window.getSelection();if(!sel||!sel.rangeCount){alert("Please select text to replace");return}var range=sel.getRangeAt(0);var selectedText=range.toString();if(selectedText.toLowerCase()===find.toLowerCase()){range.deleteContents();var textNode=document.createTextNode(replace);range.insertNode(textNode);saveTxt();closeMdl("mFind")}else{alert("Selected text does not match search term")}};
window.replaceAllText=function(){var find=document.getElementById("findText").value;var replace=document.getElementById("replaceText").value;var pg=gPg(curPg);if(!find||!pg)return;var content=pg.innerHTML;var regex=new RegExp(find,"gi");var newContent=content.replace(regex,replace);pg.innerHTML=newContent;saveTxt();closeMdl("mFind")};
})(); })();
  `;
  return { html, css, js };
};
