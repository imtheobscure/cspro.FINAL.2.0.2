import React, { useState, useEffect, useRef } from 'react';

// ============================================================
// HELPER COMPONENTS
// ============================================================
const WidgetContainer: React.FC<{ title: string; icon: string; onClose: () => void; children: React.ReactNode; width?: string }> = ({ title, icon, onClose, children, width = 'w-80' }) => (
  <div className={`absolute top-20 left-20 bg-white rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col animate-scale-in border border-gray-100 ${width}`} style={{ minWidth: '300px' }}>
    <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-100 handle cursor-move">
      <h3 className="font-bold text-gray-700 flex items-center gap-2"><i className={`fas ${icon} text-indigo-500`} />{title}</h3>
      <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors"><i className="fas fa-times" /></button>
    </div>
    <div className="p-4 bg-white">
      {children}
    </div>
  </div>
);

// ============================================================
// TIMER WIDGET
// ============================================================
export const TimerWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft(prev => mode === 'timer' ? Math.max(0, prev - 1) : prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <WidgetContainer title={mode === 'timer' ? "Timer" : "Stopwatch"} icon="fa-stopwatch" onClose={onClose}>
      <div className="flex flex-col items-center">
        <div className="text-6xl font-mono font-bold text-gray-800 mb-6 tracking-wider">{formatTime(timeLeft)}</div>
        <div className="flex gap-2 w-full mb-4">
          <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 ${isRunning ? 'bg-red-500' : 'bg-green-500'}`}>
            <i className={`fas ${isRunning ? 'fa-pause' : 'fa-play'} mr-2`} />{isRunning ? 'Pause' : 'Start'}
          </button>
          <button onClick={() => { setIsRunning(false); setTimeLeft(mode === 'timer' ? 300 : 0); }} className="w-12 bg-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-300">
            <i className="fas fa-redo" />
          </button>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => { setMode('timer'); setIsRunning(false); setTimeLeft(300); }} className={`px-4 py-1 rounded-md text-sm font-bold transition-colors ${mode === 'timer' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Timer</button>
          <button onClick={() => { setMode('stopwatch'); setIsRunning(false); setTimeLeft(0); }} className={`px-4 py-1 rounded-md text-sm font-bold transition-colors ${mode === 'stopwatch' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Stopwatch</button>
        </div>
        {mode === 'timer' && (
           <div className="flex gap-2 mt-4">
              {[1, 5, 10, 15].map(m => (
                  <button key={m} onClick={() => { setTimeLeft(m * 60); setIsRunning(false); }} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100">
                      {m}m
                  </button>
              ))}
           </div>
        )}
      </div>
    </WidgetContainer>
  );
};

// ============================================================
// TRAFFIC LIGHT WIDGET
// ============================================================
export const TrafficLightWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeLight, setActiveLight] = useState<'red' | 'yellow' | 'green' | null>(null);

  return (
    <WidgetContainer title="Traffic Light" icon="fa-traffic-light" onClose={onClose} width="w-32">
      <div className="bg-gray-800 p-4 rounded-2xl flex flex-col gap-4 items-center shadow-inner">
        <button onClick={() => setActiveLight(activeLight === 'red' ? null : 'red')} className={`w-16 h-16 rounded-full transition-all duration-300 ${activeLight === 'red' ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-105' : 'bg-red-900/50'}`} />
        <button onClick={() => setActiveLight(activeLight === 'yellow' ? null : 'yellow')} className={`w-16 h-16 rounded-full transition-all duration-300 ${activeLight === 'yellow' ? 'bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)] scale-105' : 'bg-yellow-900/50'}`} />
        <button onClick={() => setActiveLight(activeLight === 'green' ? null : 'green')} className={`w-16 h-16 rounded-full transition-all duration-300 ${activeLight === 'green' ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)] scale-105' : 'bg-green-900/50'}`} />
      </div>
    </WidgetContainer>
  );
};

// ============================================================
// RANDOM WIDGET (DICE)
// ============================================================
export const RandomWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const roll = () => {
    setIsRolling(true);
    setTimeout(() => {
      setResult(Math.floor(Math.random() * 6) + 1);
      setIsRolling(false);
    }, 1000);
  };

  return (
    <WidgetContainer title="Dice Roll" icon="fa-dice" onClose={onClose}>
      <div className="flex flex-col items-center py-4">
        <div 
            onClick={roll}
            className={`w-32 h-32 bg-white border-4 border-indigo-100 rounded-3xl flex items-center justify-center text-6xl text-indigo-600 shadow-xl cursor-pointer transition-all hover:scale-105 hover:border-indigo-300 mb-6 ${isRolling ? 'animate-spin' : ''}`}
        >
          {result ? <i className={`fas fa-dice-${['one','two','three','four','five','six'][result-1]}`} /> : <i className="fas fa-question text-gray-300" />}
        </div>
        <button onClick={roll} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors">
            Roll Dice
        </button>
      </div>
    </WidgetContainer>
  );
};

// ============================================================
// QR WIDGET
// ============================================================
export const QRWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [url, setUrl] = useState('');
  
  return (
    <WidgetContainer title="QR Code" icon="fa-qrcode" onClose={onClose}>
      <div className="space-y-4">
        <input 
            type="text" 
            placeholder="Enter URL..." 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        {url && (
            <div className="flex justify-center p-4 bg-white rounded-xl border border-gray-100 shadow-inner">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`} alt="QR" className="rounded-lg" />
            </div>
        )}
      </div>
    </WidgetContainer>
  );
};

// ============================================================
// DRAW WIDGET
// ============================================================
export const DrawWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState<'pen' | 'marker' | 'eraser'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Use a ResizeObserver with Retina/high-DPI pixel ratio backing buffer alignment
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Retain draw contents on resize by sketching to a temporary offscreen canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      const dpr = window.devicePixelRatio || 1;
      const targetWidth = width || 600;
      const targetHeight = 400;

      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;

      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Copy back previous contents cleanly
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / dpr, tempCanvas.height / dpr, 0, 0, targetWidth, targetHeight);
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, []);

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    ctx.lineWidth = tool === 'marker' ? size * 2 : size;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    if (tool === 'marker') {
        ctx.globalAlpha = 0.5;
    } else {
        ctx.globalAlpha = 1;
    }

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const COLORS = ['#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#6366F1', '#A855F7', '#EC4899'];

  return (
    <WidgetContainer title="Whiteboard" icon="fa-pen" onClose={onClose} width="w-[800px]">
      <div className="flex flex-col gap-4">
        {/* TOOLBAR */}
        <div className="flex items-center justify-between bg-gray-100 p-2 rounded-xl">
            <div className="flex gap-2">
                <button onClick={() => setTool('pen')} className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}><i className="fas fa-pen" /></button>
                <button onClick={() => setTool('marker')} className={`p-2 rounded-lg transition-all ${tool === 'marker' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}><i className="fas fa-highlighter" /></button>
                <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}><i className="fas fa-eraser" /></button>
                <div className="w-px h-8 bg-gray-300 mx-2" />
                <button onClick={clearCanvas} className="p-2 rounded-lg text-red-500 hover:bg-red-50"><i className="fas fa-trash" /></button>
            </div>
            
            <div className="flex gap-1">
                {COLORS.map(c => (
                    <button 
                        key={c} 
                        onClick={() => setColor(c)} 
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            <input 
                type="range" 
                min="1" 
                max="20" 
                value={size} 
                onChange={(e) => setSize(parseInt(e.target.value))} 
                className="w-24"
            />
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden cursor-crosshair shadow-inner bg-white">
            <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full"
            />
        </div>
      </div>
    </WidgetContainer>
  );
};

// ============================================================
// TEXT WIDGET
// ============================================================
export const TextWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <WidgetContainer title="Text Note" icon="fa-font" onClose={onClose}>
      <textarea 
        className="w-full h-48 p-4 bg-yellow-50 border-none rounded-xl resize-none focus:ring-0 text-gray-700 font-handwriting text-xl leading-relaxed"
        placeholder="Type your notes here..."
        style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
      />
    </WidgetContainer>
  );
};

// ============================================================
// WORK SYMBOLS WIDGET
// ============================================================
export const WorkSymbolsWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [active, setActive] = useState<string | null>(null);

  const SYMBOLS = [
      { id: 'silence', icon: 'fa-volume-mute', label: 'Silence', color: 'bg-red-500' },
      { id: 'whisper', icon: 'fa-user-secret', label: 'Whisper', color: 'bg-yellow-500' },
      { id: 'ask', icon: 'fa-users', label: 'Ask Neighbor', color: 'bg-blue-500' },
      { id: 'together', icon: 'fa-hands-helping', label: 'Work Together', color: 'bg-green-500' },
  ];

  return (
    <WidgetContainer title="Work Mode" icon="fa-users" onClose={onClose} width="w-[500px]">
      <div className="grid grid-cols-4 gap-4">
        {SYMBOLS.map(s => (
            <button 
                key={s.id} 
                onClick={() => setActive(s.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${active === s.id ? 'bg-gray-100 scale-105 shadow-md' : 'hover:bg-gray-50'}`}
            >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transition-transform ${s.color} ${active === s.id ? 'scale-110 ring-4 ring-offset-2 ring-gray-200' : 'opacity-80'}`}>
                    <i className={`fas ${s.icon}`} />
                </div>
                <span className={`font-bold text-sm ${active === s.id ? 'text-gray-800' : 'text-gray-500'}`}>{s.label}</span>
            </button>
        ))}
      </div>
    </WidgetContainer>
  );
};

// ============================================================
// POLL WIDGET
// ============================================================
export const PollWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [active, setActive] = useState(false);
    const [votes, setVotes] = useState<number[]>([]);

    const addOption = () => setOptions([...options, '']);
    const startPoll = () => {
        setActive(true);
        setVotes(new Array(options.length).fill(0));
    };
    
    const vote = (index: number) => {
        const newVotes = [...votes];
        newVotes[index]++;
        setVotes(newVotes);
    };

    return (
        <WidgetContainer title="Quick Poll" icon="fa-poll" onClose={onClose}>
            {!active ? (
                <div className="space-y-3">
                    <input 
                        type="text" 
                        placeholder="Ask a question..." 
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl font-bold"
                    />
                    {options.map((opt, i) => (
                        <input 
                            key={i}
                            type="text"
                            placeholder={`Option ${i + 1}`}
                            value={opt}
                            onChange={e => {
                                const newOpts = [...options];
                                newOpts[i] = e.target.value;
                                setOptions(newOpts);
                            }}
                            className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 transition-colors"
                        />
                    ))}
                    <div className="flex gap-2">
                        <button onClick={addOption} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200"><i className="fas fa-plus mr-2"/>Add Option</button>
                        <button onClick={startPoll} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Start Poll</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-center text-gray-800">{question}</h3>
                    <div className="space-y-2">
                        {options.map((opt, i) => (
                            <button key={i} onClick={() => vote(i)} className="w-full relative h-12 bg-gray-100 rounded-xl overflow-hidden text-left group hover:bg-gray-200 transition-colors">
                                <div 
                                    className="absolute top-0 left-0 bottom-0 bg-indigo-100 transition-all duration-500"
                                    style={{ width: `${votes[i] > 0 ? (votes[i] / Math.max(1, votes.reduce((a,b)=>a+b,0))) * 100 : 0}%` }}
                                />
                                <div className="absolute inset-0 flex justify-between items-center px-4">
                                    <span className="font-bold text-gray-700 relative z-10">{opt}</span>
                                    <span className="font-bold text-indigo-600 relative z-10">{votes[i]}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setActive(false)} className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm">End Poll</button>
                </div>
            )}
        </WidgetContainer>
    );
};

// ============================================================
// MEDIA WIDGET
// ============================================================
export const MediaWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [url, setUrl] = useState('');
    const [embedUrl, setEmbedUrl] = useState('');

    const handleEmbed = () => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.split('v=')[1] || url.split('/').pop();
            setEmbedUrl(`https://www.youtube.com/embed/${videoId}`);
        } else {
            setEmbedUrl(url);
        }
    };

    return (
        <WidgetContainer title="Media Embed" icon="fa-image" onClose={onClose} width="w-[600px]">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Paste YouTube or Image URL..." 
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl"
                    />
                    <button onClick={handleEmbed} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Embed</button>
                </div>
                {embedUrl && (
                    <div className="aspect-video bg-black rounded-xl overflow-hidden">
                        <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Media" />
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};

// ============================================================
// SOUND TOOL WIDGET (Moved from ClassroomScreen)
// ============================================================
export const SoundToolWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [level, setLevel] = useState(0);
  const [sensitivity, setSensitivity] = useState(50);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;

        draw();
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    };

    initAudio();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const draw = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length;
    
    const adjustedLevel = Math.min(100, (average / 256) * 100 * (sensitivity / 25));
    
    setLevel(adjustedLevel);

    animationRef.current = requestAnimationFrame(draw);
  };

  return (
    <WidgetContainer title="Sound Level" icon="fa-microphone" onClose={onClose}>
      <div className="h-32 bg-gray-100 rounded-lg relative overflow-hidden mb-4 flex items-end justify-center gap-1 p-2">
         <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden relative">
            <div 
                className={`h-full transition-all duration-100 ${level > 80 ? 'bg-red-500' : level > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                style={{ width: `${level}%` }}
            />
         </div>
         <div className="absolute bottom-8 text-2xl font-bold text-gray-700">{Math.round(level)}%</div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Sensitivity:</span>
        <input 
            type="range" 
            min="1" 
            max="100" 
            value={sensitivity} 
            onChange={(e) => setSensitivity(parseInt(e.target.value))} 
            className="flex-1"
        />
      </div>
    </WidgetContainer>
  );
};
