import React, { useEffect, useRef, useContext, useState } from 'react';
import { WidgetState } from './types';
import { AppContext } from './AppContext';
import { getSuperMediaPlayer } from '../../utils/html/superMediaPlayer';
import { PeerContext } from './PeerContext';

// ============================================================
// SUPER MEDIA PLAYER WIDGET
// ============================================================
export const SuperMediaPlayerWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inject Super Media Player HTML/CSS/JS
    const { html, css, js } = getSuperMediaPlayer();

    // Check if already injected
    if (!document.getElementById('super-media-player-root')) {
      const style = document.createElement('style');
      style.id = 'smp-style';
      style.innerHTML = css;
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.id = 'super-media-player-root';
      div.innerHTML = html;
      document.body.appendChild(div);

      const script = document.createElement('script');
      script.id = 'smp-script';
      script.innerHTML = js;
      document.body.appendChild(script);
    }

    // Show the player
    const player = document.getElementById('super-media-player');
    if (player) {
      player.style.display = 'flex';
    }

    // Override the global close function to handle React state
    (window as any).closeSmp = () => {
        const player = document.getElementById('super-media-player');
        if (player) player.style.display = 'none';
        // Stop video
        const vid = document.getElementById('smp-video-el') as HTMLVideoElement;
        const yt = document.getElementById('smp-yt-el') as HTMLIFrameElement;
        if (vid) { vid.pause(); vid.src = ""; }
        if (yt) { yt.src = ""; }
        
        // Call React onClose to remove widget from state
        if (onCloseRef.current) {
            onCloseRef.current();
        }
    };

    return () => {
      // Cleanup injected elements when widget is unmounted (closed)
      const root = document.getElementById('super-media-player-root');
      if (root) root.remove();
      const style = document.getElementById('smp-style');
      if (style) style.remove();
      const script = document.getElementById('smp-script');
      if (script) script.remove();
      
      // Also ensure global functions are cleaned up if needed, but they are on window
    };
  }, []); // Empty dependency array to prevent re-injection on re-renders

  return <div ref={containerRef} className="hidden" />;
};

// ============================================================
// PEER WIDGET
// ============================================================
export const PeerWidget: React.FC = () => {
    const { 
        peerId, 
        role, 
        connections, 
        connectToTutor, 
        startTutorSession,
        userName,
        setUserName
    } = useContext(PeerContext);
    
    const [targetId, setTargetId] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [localName, setLocalName] = useState(userName);

    const handleConnect = () => {
        if (targetId && localName) {
            setUserName(localName);
            connectToTutor(targetId);
        }
    };

    const handleHost = () => {
        if (localName) {
            setUserName(localName);
            startTutorSession();
        }
    };

    return (
        <div className={`fixed bottom-4 left-4 z-[9999] transition-all duration-300 ${isExpanded ? 'w-80' : 'w-12'} bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden`}>
            {!isExpanded ? (
                <button 
                    onClick={() => setIsExpanded(true)} 
                    className="w-12 h-12 flex items-center justify-center text-indigo-600 hover:bg-indigo-50"
                    title="Collaboration"
                >
                    <i className="fas fa-network-wired" />
                </button>
            ) : (
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <i className="fas fa-network-wired text-indigo-500" />
                            Collaboration
                        </h3>
                        <button onClick={() => setIsExpanded(false)} className="text-gray-400 hover:text-gray-600">
                            <i className="fas fa-times" />
                        </button>
                    </div>

                    {!peerId ? (
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                placeholder="Your Name" 
                                value={localName}
                                onChange={e => setLocalName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={handleHost}
                                    disabled={!localName}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Host
                                </button>
                                <button 
                                    onClick={() => setTargetId('join')} // Toggle join view
                                    disabled={!localName}
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50"
                                >
                                    Join
                                </button>
                            </div>
                            {targetId === 'join' && (
                                <div className="flex gap-2 mt-2">
                                    <input 
                                        type="text" 
                                        placeholder="Host ID" 
                                        onChange={e => setTargetId(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    />
                                    <button 
                                        onClick={() => handleConnect()}
                                        className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600"
                                    >
                                        Go
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-indigo-50 p-3 rounded-lg">
                                <div className="text-xs text-indigo-500 font-bold uppercase mb-1">Your ID</div>
                                <div className="flex justify-between items-center">
                                    <code className="text-sm font-mono font-bold text-indigo-800">{peerId}</code>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(peerId || '')}
                                        className="text-indigo-400 hover:text-indigo-600"
                                    >
                                        <i className="fas fa-copy" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-500 uppercase">Connected Users ({connections.length})</div>
                                {connections.map((conn, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="font-medium text-gray-700">{conn.metadata?.name || conn.peer.substring(0,5)}</span>
                                    </div>
                                ))}
                                {connections.length === 0 && (
                                    <div className="text-xs text-gray-400 italic">No connections yet</div>
                                )}
                            </div>
                            
                            <div className="text-xs text-center text-gray-400">
                                Role: {role === 'tutor' ? 'Tutor (Host)' : 'Learner'}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================
// PEER OVERLAY (Cursors & Annotations)
// ============================================================
export const PeerOverlay: React.FC = () => {
    const { cursors, annotations, addAnnotation, role } = useContext(PeerContext);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Render annotations with dynamic Retina high-DPI and resize alignments
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const render = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            // Draw all annotations
            annotations.forEach(ann => {
                ctx.beginPath();
                ctx.strokeStyle = ann.color;
                ctx.lineWidth = ann.size;
                ctx.lineCap = 'round';
                if (ann.points && ann.points.length > 0) {
                    ctx.moveTo(ann.points[0].x, ann.points[0].y);
                    ann.points.forEach((p: any) => ctx.lineTo(p.x, p.y));
                    ctx.stroke();
                }
            });
        };

        render();
        window.addEventListener('resize', render);
        return () => window.removeEventListener('resize', render);
    }, [annotations]);

    // Handle drawing
    const startDrawing = (e: React.MouseEvent) => {
        if (role === 'learner') { // Only learners annotate? Or both? User said "adding a pen annotation for learners"
             setIsDrawing(true);
        }
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        // Logic to add points to current annotation path
        // This is simplified; usually we'd collect points and then send 'annotation' event on mouse up
        // For real-time, we might send points as they come, but PeerContext expects full annotation object
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        // addAnnotation({ type: 'path', points: collectedPoints, color: 'red', size: 2 });
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-[9998]">
            {/* Cursors */}
            {Object.entries(cursors).map(([id, cursor]: [string, any]) => (
                <div 
                    key={id}
                    className="absolute w-4 h-4 pointer-events-none transition-all duration-75 ease-linear"
                    style={{ 
                        left: cursor.x, 
                        top: cursor.y,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L11.7841 12.3673H5.65376Z" fill={id === 'me' ? '#6366f1' : '#ec4899'} stroke="white"/>
                    </svg>
                    <div className="absolute left-4 top-4 bg-black/50 text-white text-xs px-1 rounded whitespace-nowrap">
                        {cursor.name}
                    </div>
                </div>
            ))}
            
            {/* Annotation Canvas */}
            <canvas 
                ref={canvasRef}
                className="w-full h-full pointer-events-none" // Make it pointer-events-auto if we want to draw
                width={window.innerWidth}
                height={window.innerHeight}
            />
        </div>
    );
};
