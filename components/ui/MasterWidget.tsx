import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCollaborationWidget } from '../../utils/html/collaboration';
import { getAccessibilityWidget } from '../../utils/html/accessibility';

const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.1/dist/peerjs.min.js';

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
    });
}

const MasterWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let destroyed = false;

        async function init() {
            // 1. Load PeerJS before anything else (the collaboration JS needs it)
            try {
                await loadScript(PEERJS_CDN);
            } catch (e) {
                console.warn('PeerJS CDN failed, collaboration will be unavailable');
            }

            if (destroyed) return;

            // 2. Inject collaboration widget
            const collab = getCollaborationWidget();
            
            const style = document.createElement('style');
            style.innerHTML = collab.css;
            style.innerHTML += `\n#collab-master-menu button[title="Tutor Dashboard"] { display: none !important; }`;
            document.head.appendChild(style);

            const container = document.createElement('div');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = collab.html;
            
            const panel = tempDiv.querySelector('#collab-panel');
            const board = tempDiv.querySelector('#collab-board');
            const cursors = tempDiv.querySelector('#collab-cursors');
            
            if (panel) container.appendChild(panel);
            if (board) container.appendChild(board);
            if (cursors) container.appendChild(cursors);
            
            document.body.appendChild(container);

            // 3. Inject collaboration JS (PeerJS is already loaded)
            const script = document.createElement('script');
            script.innerHTML = collab.js;
            document.body.appendChild(script);

            // 4. Accessibility Widget
            const access = getAccessibilityWidget();
            const styleAccess = document.createElement('style');
            styleAccess.innerHTML = access.css;
            styleAccess.innerHTML += `\n#accessibility-toggle { display: none !important; }`;
            document.head.appendChild(styleAccess);

            const accessContainer = document.createElement('div');
            const tempAccess = document.createElement('div');
            tempAccess.innerHTML = access.html;
            const rootAccess = tempAccess.querySelector('#accessibility-widget');
            if (rootAccess) accessContainer.appendChild(rootAccess);
            document.body.appendChild(accessContainer);

            const scriptAccess = document.createElement('script');
            scriptAccess.innerHTML = access.js;
            document.body.appendChild(scriptAccess);

            // Store refs for cleanup
            (window as any).__masterWidgetRefs = { style, container, script, styleAccess, accessContainer, scriptAccess };
        }

        init();

        return () => {
            destroyed = true;
            const refs = (window as any).__masterWidgetRefs;
            if (refs) {
                if (refs.style.parentNode) document.head.removeChild(refs.style);
                if (refs.container.parentNode) document.body.removeChild(refs.container);
                if (refs.script.parentNode) document.body.removeChild(refs.script);
                if (refs.styleAccess.parentNode) document.head.removeChild(refs.styleAccess);
                if (refs.accessContainer.parentNode) document.body.removeChild(refs.accessContainer);
                if (refs.scriptAccess.parentNode) document.body.removeChild(refs.scriptAccess);
                delete (window as any).__masterWidgetRefs;
                delete (window as any).collabState;
                delete (window as any).toggleCollabPanel;
                delete (window as any).toggleMasterMenu;
            }
        };
    }, []);

    const toggleCollab = () => {
        setIsOpen(false);
        // @ts-ignore
        if (window.toggleCollabPanel) {
            // @ts-ignore
            window.toggleCollabPanel();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {isOpen && (
                <div className="mb-3 flex flex-col items-end gap-3 transition-all duration-300">
                    {/* Accessibility Tools Button */}
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition-all duration-200 opacity-95">
                            Accessibility Tools
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                if (typeof (window as any).toggleAccessibilityWidget === 'function') {
                                    (window as any).toggleAccessibilityWidget();
                                } else {
                                    const p = document.getElementById('accessibility-panel');
                                    if (p) {
                                        const isHidden = p.style.display === 'none' || !p.style.display;
                                        p.style.display = isHidden ? 'flex' : 'none';
                                    }
                                }
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                            title="Accessibility Tools"
                        >
                            <i className="fas fa-universal-access text-xl"></i>
                        </button>
                    </div>

                    {/* Walkthrough Button */}
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition-all duration-200 opacity-95">
                            Walkthrough
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                if ((window as any).triggerWalkthrough) {
                                    (window as any).triggerWalkthrough();
                                } else if ((window as any).startInteractiveWalkthroughV2) {
                                    (window as any).startInteractiveWalkthroughV2();
                                } else if ((window as any).startInteractiveWalkthroughV1) {
                                    (window as any).startInteractiveWalkthroughV1();
                                } else {
                                    alert('Walkthrough tour not available on this page.');
                                }
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                            title="Interactive Walkthrough"
                        >
                            <span className="text-xl font-extrabold">?</span>
                        </button>
                    </div>

                    {/* Live Collaboration Button */}
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition-all duration-200 opacity-95">
                            Live Collaboration
                        </span>
                        <button
                            onClick={toggleCollab}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                            title="Live Collaboration"
                        >
                            <i className="fas fa-users text-xl"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* Master Fab Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`${
                    isOpen ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200/50' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50'
                } text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 hover:scale-105 active:scale-95`}
                title="Tutor Tools Master Widget"
            >
                <i className={`fas ${isOpen ? 'fa-times' : 'fa-layer-group'} text-2xl transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}></i>
            </button>
        </div>
    );
};

export default MasterWidget;
