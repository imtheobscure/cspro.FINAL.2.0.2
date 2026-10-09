import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from './AppContext';
import { WidgetState } from './types';
import { WidgetWrapper } from './ClassroomScreen';

interface SoundPad {
  id: string;
  name: string;
  url: string | null;
  color: string;
  loopCount: number; // 0 for infinite loop, 1 for single play, 2 for play twice, etc.
  tags?: string[];
}

interface SoundCategory {
  id: string;
  name: string;
  pads: SoundPad[];
}

const WIDGET_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#06b6d4'];

const BUILT_IN_SOUNDS = [
  { name: "Rimshot", url: "https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg" },
  { name: "Applause", url: "https://actions.google.com/sounds/v1/crowds/battle_crowd_celebrate.ogg" },
  { name: "Crickets", url: "https://actions.google.com/sounds/v1/animals/crickets_and_distant_traffic_night.ogg" },
  { name: "Air Horn", url: "https://actions.google.com/sounds/v1/alarms/alarm_clock_bell.ogg" },
  { name: "Swoosh", url: "https://actions.google.com/sounds/v1/cartoon/clown_horn.ogg" },
];

export const SoundBoardWidget: React.FC<{ widget: WidgetState; onClose: () => void }> = ({ widget, onClose }) => {
  const { theme } = useContext(AppContext);
  const [categories, setCategories] = useState<SoundCategory[]>(() => {
    try {
      const saved = localStorage.getItem('classroom-sound-board-v2');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    
    // Default setup
    return [
      {
        id: 'cat-1',
        name: 'General',
        pads: Array.from({length: 12}).map((_, i) => ({
          id: `pad-${Date.now()}-${i}`,
          name: i < BUILT_IN_SOUNDS.length ? BUILT_IN_SOUNDS[i].name : `Pad ${i + 1}`,
          url: i < BUILT_IN_SOUNDS.length ? BUILT_IN_SOUNDS[i].url : null,
          color: WIDGET_COLORS[i % WIDGET_COLORS.length],
          loopCount: 1,
        }))
      }
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(categories[0]?.id);
  const [editMode, setEditMode] = useState(false);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('classroom-sound-board-volume');
      if (saved !== null) return parseFloat(saved);
    } catch(e) {}
    return 0.5;
  });

  // Global Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentPadId, setCurrentPadId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const playCountRef = useRef(0);
  const padRef = useRef<SoundPad | null>(null);

  // Search State
  const [search, setSearch] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [results, setResults] = useState<{name: string, url: string, source: string}[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Edit Pad State
  const [editingPad, setEditingPad] = useState<SoundPad | null>(null);
  const [pendingSound, setPendingSound] = useState<{name: string, url: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('classroom-sound-board-v2', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('classroom-sound-board-volume', volume.toString());
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Audio Player Event Listeners
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      const pad = padRef.current;
      if (!pad) {
        setIsPlaying(false);
        return;
      }
      playCountRef.current += 1;
      if (pad.loopCount === 0 || playCountRef.current < pad.loopCount) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      if (audio) {
        audio.pause();
      }
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []); // Run once

  const playPad = (pad: SoundPad) => {
    if (!pad.url) return;
    
    // If clicking same pad while playing, pause it (toggle behavior)
    if (currentPadId === pad.id && isPlaying) {
      audioRef.current?.pause();
      return;
    }

    // If starting a new sound or resuming
    if (!audioRef.current) return;
    if (currentPadId !== pad.id) {
      audioRef.current.src = pad.url;
      audioRef.current.currentTime = 0;
      setCurrentPadId(pad.id);
      padRef.current = pad;
      playCountRef.current = 0;
    }
    audioRef.current.play().catch(console.error);
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentPadId) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(console.error);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const doSearch = async () => {
    if (!search) {
       setResults(BUILT_IN_SOUNDS.map(s => ({...s, source: 'Built-in'})));
       return;
    }
    setLoadingSearch(true);
    setResults([]);
    try {
      const allResults: {name: string, url: string, source: string}[] = [];
      try {
        let data: any = null;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('.run.app')) {
            try {
               const res = await fetch(`/api/sounds/search?q=${encodeURIComponent(search)}`);
               if (res.ok) data = await res.json();
            } catch (ignore) {}
        }
        if (!data) {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.myinstants.com/api/v1/instants/?format=json&name=${encodeURIComponent(search)}`)}`;
            const res = await fetch(proxyUrl);
            if (res.ok) {
                const proxyData = await res.json();
                if (proxyData.contents) data = JSON.parse(proxyData.contents);
            }
        }
        if (data && data.results) {
           data.results?.filter((r: any) => r.sound).forEach((r: any) => allResults.push({ name: r.name, url: r.sound, source: 'MyInstants' }));
        }
      } catch (e) {
        console.warn("Search proxy failed", e);
      }

      if (allResults.length === 0) {
          allResults.push({ name: "No sounds found", url: "", source: "Try another term" });
      }

      setResults(allResults);
    } finally {
      setLoadingSearch(false);
    }
  };

  const getPreviousTags = () => {
    const allTags = new Set<string>();
    categories.forEach(cat => {
      cat.pads.forEach(p => {
        if (p.tags) {
          p.tags.forEach(t => {
            if (t.trim()) {
              allTags.add(t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`);
            }
          });
        }
      });
    });
    // Ensure some baseline standard helpful tags exist
    ['#happy', '#sad', '#hype', '#funny', '#chill', '#retro', '#fail'].forEach(t => allTags.add(t));
    return Array.from(allTags);
  };

  const getMatchedLocalPads = () => {
    if (!localSearchQuery.trim()) return [];
    const query = localSearchQuery.toLowerCase().trim();
    const matches: { categoryName: string; categoryId: string; pad: SoundPad }[] = [];
    
    categories.forEach(cat => {
      cat.pads.forEach(p => {
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesTag = p.tags && p.tags.some(t => t.toLowerCase().includes(query));
        if (matchesName || matchesTag) {
          matches.push({
            categoryName: cat.name,
            categoryId: cat.id,
            pad: p
          });
        }
      });
    });
    return matches;
  };

  const currentPad = categories.flatMap(c => c.pads).find(p => p.id === currentPadId) || null;

  const activeCategory = categories.find(c => c.id === activeTabId) || categories[0];

  const addTab = () => {
    const newCat = { id: `cat-${Date.now()}`, name: `Tab ${categories.length + 1}`, pads: [] };
    setCategories([...categories, newCat]);
    setActiveTabId(newCat.id);
  };

  const deleteTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (categories.length === 1) return alert("Cannot delete the last tab!");
    if (confirm("Delete this tab and all its pads?")) {
      setCategories(prev => {
        const remaining = prev.filter(c => c.id !== id);
        if (activeTabId === id) setActiveTabId(remaining[0].id);
        return remaining;
      });
    }
  };

  const addPadToActiveTab = () => {
    setCategories(prev => prev.map(c => c.id === activeTabId ? {
      ...c,
      pads: [...c.pads, {
        id: `pad-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: `New Pad`,
        url: null,
        color: WIDGET_COLORS[Math.floor(Math.random() * WIDGET_COLORS.length)],
        loopCount: 1
      }]
    } : c));
  };

  // Drag and drop for reordering pads
  const [draggedPadId, setDraggedPadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, pad: SoundPad) => {
    if (!editMode) return;
    setDraggedPadId(pad.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!editMode || !draggedPadId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetPadId?: string, targetTabId: string = activeTabId) => {
    if (!editMode || !draggedPadId) return;
    e.preventDefault();

    setCategories(prevCats => {
      let sourcePad: SoundPad | null = null;
      let sourceCatId = '';
      const newCats = prevCats.map(cat => {
        const p = cat.pads.find(p => p.id === draggedPadId);
        if (p) {
          sourcePad = p;
          sourceCatId = cat.id;
          return { ...cat, pads: cat.pads.filter(p => p.id !== draggedPadId) };
        }
        return cat;
      });

      if (!sourcePad) return prevCats;

      return newCats.map(cat => {
        if (cat.id === targetTabId) {
          if (!targetPadId) {
            // Drop on empty space at the end
            return { ...cat, pads: [...cat.pads, sourcePad!] };
          } else {
            // Drop on a specific pad
            const targetIdx = cat.pads.findIndex(p => p.id === targetPadId);
            const newPads = [...cat.pads];
            if (targetIdx !== -1) {
              newPads.splice(targetIdx, 0, sourcePad!);
            } else {
              newPads.push(sourcePad!);
            }
            return { ...cat, pads: newPads };
          }
        }
        return cat;
      });
    });
    setDraggedPadId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingPad) {
      const url = URL.createObjectURL(file);
      updateEditingPad({ url, name: editingPad.name === 'New Pad' ? file.name.split('.')[0] : editingPad.name });
    }
  };

  const updateEditingPad = (updates: Partial<SoundPad>) => {
    if (!editingPad) return;
    const updatedPad = { ...editingPad, ...updates };
    setEditingPad(updatedPad);
    setCategories(prev => prev.map(c => c.id === activeTabId ? {
      ...c,
      pads: c.pads.map(p => p.id === updatedPad.id ? updatedPad : p)
    } : c));
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(categories, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sound-board-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const res = JSON.parse(re.target?.result as string);
          if (Array.isArray(res)) {
            // Strict parsing and validation loop of imported pads
            const sanitized = res
              .filter((cat: any) => cat && typeof cat === 'object' && typeof cat.id === 'string' && typeof cat.name === 'string')
              .map((cat: any) => {
                const pads = Array.isArray(cat.pads) ? cat.pads : [];
                return {
                  id: cat.id,
                  name: cat.name,
                  pads: pads
                    .filter((p: any) => p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string')
                    .map((p: any) => ({
                      id: p.id,
                      name: p.name,
                      url: typeof p.url === 'string' ? p.url : null,
                      color: typeof p.color === 'string' ? p.color : '#3b82f6',
                      loopCount: typeof p.loopCount === 'number' ? p.loopCount : 1
                    }))
                };
              });

            if (sanitized.length > 0) {
              setCategories(sanitized);
              setActiveTabId(sanitized[0].id);
            } else {
              alert("No valid Sound Board tabs found in settings.");
            }
          } else alert("Invalid format schema");
        } catch (err) { alert("Import failed: Corrupted Sound Board file."); }
      };
      reader.readAsText(file);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <WidgetWrapper widget={widget} title="Sound Board" icon="fa-drum" onClose={onClose} minWidth={450} minHeight={500}>
      <div className={`flex flex-col h-full relative shadow-inner overflow-hidden ${theme.mode === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
        
        {/* TOP BAR: Controls & Search */}
        <div className={`flex justify-between items-center p-2 border-b shrink-0 shadow-sm z-10 gap-2 overflow-x-auto custom-scrollbar ${theme.mode === 'dark' ? 'bg-slate-800 border-slate-700/60' : 'bg-white border-black/10'}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors border ${editMode ? 'bg-amber-500 text-white border-amber-600' : (theme.mode === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300')}`}
            >
              <i className={`fas ${editMode ? 'fa-check' : 'fa-pen'} mr-1`}></i>
              {editMode ? 'Done' : 'Edit Mode'}
            </button>
            {editMode && (
              <>
                <button 
                  onClick={exportSettings} 
                  className={`px-3 py-1.5 text-xs font-bold rounded-md border shadow-sm transition-all ${theme.mode === 'dark' ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                >
                  <i className="fas fa-file-export mr-1"></i> Export
                </button>
                <label 
                  className={`px-3 py-1.5 text-xs font-bold rounded-md border shadow-sm cursor-pointer whitespace-nowrap transition-all ${theme.mode === 'dark' ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                >
                  <i className="fas fa-file-import mr-1"></i> Import
                  <input type="file" accept=".json" className="hidden" onChange={importSettings} />
                </label>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-sm flex-1 min-w-[200px]">
             <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  placeholder="Search online..."
                  className={`w-full border rounded-md py-1.5 pl-3 pr-8 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${theme.mode === 'dark' ? 'bg-slate-900 text-slate-100 border-slate-700 placeholder-slate-400' : 'bg-slate-100 text-slate-800 border-slate-300 placeholder-slate-500'}`}
                />
               <button onClick={doSearch} disabled={loadingSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500">
                 <i className={`fas ${loadingSearch ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
               </button>
             </div>
          </div>
        </div>

        {/* LOCAL SEARCH BAR */}
        <div className={`px-3 py-2 border-b flex items-center gap-2 shrink-0 transition-all ${theme.mode === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-black/5'}`}>
          <div className="relative flex-1">
            <input
              type="text"
              value={localSearchQuery}
              onChange={e => setLocalSearchQuery(e.target.value)}
              placeholder="🔍 Search among your local pads by name or tags (e.g. #sad, #happy)..."
              className={`w-full border rounded-lg py-1.5 pl-9 pr-8 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${theme.mode === 'dark' ? 'bg-slate-800 text-indigo-100 border-slate-750 placeholder-slate-400' : 'bg-white text-slate-800 border-slate-300 placeholder-slate-500'}`}
            />
            <i className="fas fa-tags absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            {localSearchQuery && (
              <button onClick={() => setLocalSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <i className="fas fa-times-circle text-xs"></i>
              </button>
            )}
          </div>
        </div>

        {/* SEARCH RESULTS PREVIEW */}
        {results.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-2 shrink-0 bg-white dark:bg-slate-800 border-b border-black/10 dark:border-white/10 custom-scrollbar z-10 shadow-sm">
            {results.map((r, i) => (
              <div key={i} className="flex flex-col bg-slate-50 dark:bg-slate-900 rounded-lg p-2 min-w-[130px] max-w-[130px] border border-slate-200 dark:border-slate-700 shrink-0">
                <span className="text-[10px] font-bold truncate mb-1" title={r.name}>{r.name}</span>
                <span className="text-[9px] opacity-70 mb-2 truncate" title={r.source}>{r.source}</span>
                {r.url && (
                  <div className="flex gap-1 mt-auto">
                    <button onClick={() => { const a = new Audio(r.url); a.volume = volume; a.play(); }} className="w-6 h-6 flex items-center justify-center bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-xs transition-colors">
                      <i className="fas fa-play"></i>
                    </button>
                    <button 
                      onClick={() => {
                        if (editingPad) {
                           updateEditingPad({ url: r.url, name: editingPad.name === 'New Pad' || /^Pad \d+$/.test(editingPad.name) ? r.name : editingPad.name });
                        } else {
                           if (pendingSound?.url === r.url) {
                              setPendingSound(null);
                           } else {
                              setPendingSound({ name: r.name, url: r.url });
                           }
                        }
                      }}
                      className={`flex-1 rounded py-1 text-[10px] font-bold transition-colors ${editingPad || pendingSound?.url === r.url ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-700 hover:bg-indigo-500 hover:text-white'}`}
                    >
                      {editingPad ? 'Assign to current' : pendingSound?.url === r.url ? 'Select a Pad below' : 'Add Pad'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TABS */}
        <div className="flex items-center p-2 bg-slate-200 dark:bg-slate-950 border-b border-black/10 dark:border-white/10 shrink-0 gap-1 overflow-x-auto custom-scrollbar">
          {categories.map(cat => (
             <div 
               key={cat.id} 
               className="relative group"
               onDragOver={(e) => {
                 if (editMode && draggedPadId) {
                   e.preventDefault();
                   e.dataTransfer.dropEffect = "move";
                 }
               }}
               onDrop={(e) => handleDrop(e, undefined, cat.id)}
             >
                <button 
                  onClick={() => setActiveTabId(cat.id)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTabId === cat.id ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-300 dark:border-slate-700' : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  {editMode ? (
                     <input
                       value={cat.name}
                       autoFocus
                       onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                       className="bg-transparent outline-none w-20 px-1 border-b border-indigo-500 focus:border-indigo-400"
                       onClick={e => e.stopPropagation()}
                     />
                  ) : cat.name}
                </button>
                {editMode && categories.length > 1 && (
                  <button onClick={(e) => deleteTab(cat.id, e)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity z-10"><i className="fas fa-times"></i></button>
                )}
             </div>
          ))}
          {editMode && (
            <button onClick={addTab} className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <i className="fas fa-plus"></i>
            </button>
          )}
        </div>
        {/* PADS GRID */}
        <div 
          className="flex-1 p-3 overflow-y-auto custom-scrollbar relative"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e)}
        >
          {localSearchQuery.trim() !== "" ? (
            // Local Search Mode Grid
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                  Matched Local Pads ({getMatchedLocalPads().length})
                </span>
                <button onClick={() => setLocalSearchQuery("")} className="text-[10px] text-indigo-500 hover:underline font-bold">
                  Clear search
                </button>
              </div>

              {getMatchedLocalPads().length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-60 text-xs">
                  <i className="fas fa-search-minus text-3xl mb-2 text-slate-400"></i>
                  <p className="font-bold">No pads matched "{localSearchQuery}"</p>
                  <p className="text-[10px] text-slate-400 mt-1">Try searching by #tag (e.g. #sad, #happy) or part of their names.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {getMatchedLocalPads().map(({ categoryName, categoryId, pad }) => {
                    const isPlayingPad = currentPadId === pad.id && isPlaying;
                    return (
                      <div
                        key={pad.id}
                        className={`relative select-none aspect-square flex flex-col items-center justify-center p-2 rounded-2xl transition-transform border border-black/5 dark:border-white/5 cursor-pointer hover:-translate-y-1 shadow-lg active:scale-95
                                    ${isPlayingPad && !pendingSound ? 'ring-4 ring-indigo-500 ring-opacity-50 animate-pulse-slow' : ''}`}
                        style={{
                          backgroundColor: pad.url ? pad.color : theme.mode === 'dark' ? '#334155' : '#cbd5e1',
                          color: pad.url ? 'white' : 'rgba(0,0,0,0.5)',
                        }}
                        onClick={() => {
                          if (editMode) {
                            setEditingPad(pad);
                          } else {
                            playPad(pad);
                          }
                        }}
                      >
                        <i className={`fas ${pad.url ? (isPlayingPad ? 'fa-pause' : 'fa-play') : 'fa-plus'} text-2xl mb-1 
                                     ${pad.url ? 'opacity-90 drop-shadow-md' : 'opacity-40'}`}></i>
                        <span className="text-[11px] font-bold text-center leading-tight truncate w-full px-1 drop-shadow-md">{pad.name}</span>
                        
                        {/* Tab Indicator Badge */}
                        <span className="text-[8px] bg-black/45 text-white/90 font-black px-1.5 py-0.5 rounded-full absolute bottom-1.5 uppercase tracking-wide truncate max-w-[90%]">
                          {categoryName}
                        </span>

                        {pad.loopCount !== 1 && pad.url && !editMode && (
                          <div className="absolute top-1.5 right-1.5 flex items-center justify-center bg-black/30 rounded-full px-1 py-0.2 text-[7px] font-bold" title="Loop count">
                            <i className="fas fa-redo-alt mr-0.5"></i> {pad.loopCount === 0 ? '∞' : pad.loopCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Default Category Tab Grid
            <>
              {activeCategory.pads.length === 0 && !editMode && (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50 text-sm">
                   <i className="fas fa-music text-4xl mb-3"></i>
                   <p>No sounds in this category.</p>
                   <p className="text-xs mt-1">Enable Edit Mode to add some.</p>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                 {activeCategory.pads.map((pad) => {
                   const isPlayingPad = currentPadId === pad.id && isPlaying;
                   return (
                     <div
                       key={pad.id}
                       draggable={editMode}
                       onDragStart={(e) => handleDragStart(e, pad)}
                       onDragOver={handleDragOver}
                       onDrop={(e) => { e.stopPropagation(); handleDrop(e, pad.id); }}
                       className={`relative select-none aspect-square flex flex-col items-center justify-center p-2 rounded-2xl transition-transform border border-black/5 dark:border-white/5 
                                   ${pendingSound ? 'cursor-alias hover:scale-105 shadow-md ring-4 ring-indigo-500/80 animate-pulse' : editMode ? 'cursor-grab active:cursor-grabbing hover:scale-105 shadow-md' : 'cursor-pointer hover:-translate-y-1 shadow-lg active:scale-95'}
                                   ${isPlayingPad && !pendingSound ? 'ring-4 ring-indigo-500 ring-opacity-50 animate-pulse-slow' : ''}`}
                       style={{
                         backgroundColor: pad.url ? pad.color : theme.mode === 'dark' ? '#334155' : '#cbd5e1',
                         color: pad.url ? 'white' : 'rgba(0,0,0,0.5)',
                       }}
                       onClick={() => {
                         if (pendingSound) {
                            setCategories(prev => prev.map(c => c.id === activeTabId ? {
                                ...c,
                                pads: c.pads.map(p => p.id === pad.id ? { ...p, url: pendingSound.url, name: pad.name === 'New Pad' || /^Pad \d+$/.test(pad.name) ? pendingSound.name : pad.name } : p)
                            } : c));
                            setPendingSound(null);
                            return;
                         }
                         if (editMode) {
                            setEditingPad(pad);
                         } else {
                            playPad(pad);
                         }
                       }}
                     >
                       <i className={`fas ${pad.url ? (isPlayingPad ? 'fa-pause' : 'fa-play') : 'fa-plus'} text-2xl mb-2 
                                    ${pad.url ? 'opacity-90 drop-shadow-md' : 'opacity-40'}`}></i>
                       <span className="text-[11px] font-bold text-center leading-tight truncate w-full px-1 drop-shadow-md">{pad.name}</span>
                       
                       {pad.loopCount !== 1 && pad.url && !editMode && (
                         <div className="absolute top-2 right-2 flex items-center justify-center bg-black/30 rounded-full px-1.5 py-0.5 text-[8px] font-bold" title="Loop count">
                           <i className="fas fa-redo-alt mr-1"></i> {pad.loopCount === 0 ? '∞' : pad.loopCount}
                         </div>
                       )}
                       
                       {editMode && (
                         <div className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity gap-2 z-10 backdrop-blur-sm">
                           <span className="text-white text-xs font-bold"><i className="fas fa-pen"></i> Edit</span>
                           <button
                             onMouseDown={(e) => e.stopPropagation()}
                             onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               if(confirm("Delete this pad?")) {
                                 setCategories(prev => prev.map(c => c.id === activeTabId ? { ...c, pads: c.pads.filter(p => p.id !== pad.id) } : c));
                                 if (currentPadId === pad.id) {
                                   stopPlayback();
                                   setCurrentPadId(null);
                                 }
                                 if (editingPad?.id === pad.id) {
                                   setEditingPad(null);
                                 }
                               }
                             }}
                             className="h-6 w-6 bg-red-500 hover:bg-red-650 text-white rounded flex items-center justify-center transition-colors shadow-lg"
                             title="Delete Pad"
                           >
                             <i className="fas fa-trash text-xs"></i>
                           </button>
                         </div>
                       )}
                     </div>
                   );
                 })}
 
                 {editMode && (
                   <button
                     onClick={addPadToActiveTab}
                     className="aspect-square flex flex-col items-center justify-center p-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-500 transition-all cursor-pointer"
                   >
                     <i className="fas fa-plus text-2xl mb-1"></i>
                     <span className="text-xs font-bold">New Pad</span>
                   </button>
                 )}
              </div>
            </>
          )}
        </div>

        {/* PAD EDIT MODAL (when in edit mode and a pad is selected) */}
        {editMode && editingPad && (
          <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-30 flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black"><i className="fas fa-cog text-indigo-500 mr-2"></i>Edit Pad</h3>
              <button onClick={() => setEditingPad(null)} className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Pad Name</label>
                <input
                  type="text"
                  value={editingPad.name}
                  onChange={e => updateEditingPad({ name: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Applause"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Audio Source</label>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      value={editingPad.url || ''}
                      onChange={e => updateEditingPad({ url: e.target.value })}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="https://example.com/sound.mp3"
                    />
                    <div className="flex items-center text-xs font-bold text-slate-400">OR</div>
                    <label className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-4 py-3 rounded-lg text-sm font-bold cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900/80 transition-colors flex items-center justify-center shadow-sm">
                      <i className="fas fa-folder-open mr-2"></i> Browse PC
                      <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400"><i className="fas fa-lightbulb mr-1 text-amber-500"></i> You can also search online at the top and click "Assign to pad" to fill this.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Color</label>
                   <div className="flex flex-wrap gap-2">
                     {WIDGET_COLORS.map(c => (
                       <button
                         key={c}
                         onClick={() => updateEditingPad({ color: c })}
                         className={`w-8 h-8 rounded-full border-4 transition-transform hover:scale-110 shadow-sm ${editingPad.color === c ? 'border-white dark:border-slate-800 scale-110 drop-shadow-md ring-2 ring-indigo-500' : 'border-transparent'}`}
                         style={{ backgroundColor: c }}
                       />
                     ))}
                   </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Loop Settings</label>
                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                       <i className="fas fa-redo text-indigo-500"></i>
                       <div className="flex-1">
                          <div className="text-[10px] mb-1 font-bold">Play Count (0 = Infinite)</div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="range" min="0" max="10" step="1" 
                              value={editingPad.loopCount}
                              onChange={e => updateEditingPad({ loopCount: parseInt(e.target.value) })}
                              className="flex-1 accent-indigo-500"
                            />
                            <span className="font-bold text-sm w-4 text-center">{editingPad.loopCount === 0 ? '∞' : editingPad.loopCount}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

               <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                   <i className="fas fa-tags text-indigo-500"></i> Pad Tags (#sad, #happy...)
                 </label>
                 
                 {/* Assigned tags list */}
                 <div className="flex flex-wrap gap-1.5 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg min-h-[44px] border border-slate-200 dark:border-slate-700/80 mb-3">
                   {editingPad.tags && editingPad.tags.length > 0 ? (
                     editingPad.tags.map((tg, tIdx) => (
                       <span 
                         key={tIdx} 
                         className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-colors" 
                         title="Click to remove tag" 
                         onClick={() => {
                           const updatedTags = editingPad.tags?.filter((_, i) => i !== tIdx) || [];
                           updateEditingPad({ tags: updatedTags });
                         }}
                       >
                         {tg.startsWith('#') ? tg : `#${tg}`}
                         <i className="fas fa-times-circle text-[9px] opacity-75"></i>
                       </span>
                     ))
                   ) : (
                     <span className="text-[10px] text-slate-400 p-1">No tags assigned. Type one below or click pool tags to assign!</span>
                   )}
                 </div>

                 {/* Add Tag Row */}
                 <div className="flex gap-2 mb-4">
                   <input
                     type="text"
                     placeholder="Add new tag (e.g. #happy)..."
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         const val = (e.target as HTMLInputElement).value.trim();
                         if (val) {
                           const cleanVal = val.startsWith('#') ? val : `#${val}`;
                           const currentTags = editingPad.tags || [];
                           if (!currentTags.includes(cleanVal)) {
                             updateEditingPad({ tags: [...currentTags, cleanVal] });
                           }
                           (e.target as HTMLInputElement).value = "";
                         }
                       }
                     }}
                     className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                   <button 
                     onClick={(e) => {
                       const inputEl = (e.currentTarget.previousSibling as HTMLInputElement);
                       const val = inputEl.value.trim();
                       if (val) {
                         const cleanVal = val.startsWith('#') ? val : `#${val}`;
                         const currentTags = editingPad.tags || [];
                         if (!currentTags.includes(cleanVal)) {
                           updateEditingPad({ tags: [...currentTags, cleanVal] });
                         }
                         inputEl.value = "";
                       }
                     }} 
                     className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 transition-all"
                   >
                     Add Tag
                   </button>
                 </div>

                 {/* Available Pools from other pads */}
                 <div>
                   <span className="text-[10px] uppercase font-black text-slate-400 block mb-1.5 tracking-wider">Recently Created Tags Pool:</span>
                   <div className="flex flex-wrap gap-1.5">
                     {getPreviousTags().map(poolTag => {
                       const isAssigned = editingPad.tags?.includes(poolTag);
                       return (
                         <button 
                           key={poolTag}
                           onClick={() => {
                             const currentTags = editingPad.tags || [];
                             if (isAssigned) {
                               updateEditingPad({ tags: currentTags.filter(t => t !== poolTag) });
                             } else {
                               updateEditingPad({ tags: [...currentTags, poolTag] });
                             }
                           }}
                           className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${isAssigned ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'}`}
                         >
                           {isAssigned ? '✓ ' : '+ '}{poolTag}
                         </button>
                       );
                     })}
                   </div>
                 </div>
               </div>
            </div>

            <div className="mt-8 flex justify-end">
               <button onClick={() => setEditingPad(null)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wide rounded-lg shadow-md transition-colors">
                 Save & Close
               </button>
            </div>
          </div>
        )}

        {/* GLOBAL PREMIUM PLAYER (Bottom Bar) */}
        <div className="bg-white dark:bg-slate-950 border-t border-black/10 dark:border-white/10 shrink-0 p-3 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] z-20">
           <div className="flex flex-col gap-2">
             
             {/* Info & Status */}
             <div className="flex justify-between items-center text-xs font-bold px-1">
                <div className="flex items-center gap-2 truncate">
                   {currentPadId && padRef.current ? (
                     <>
                        <div className="flex h-3 items-center gap-0.5">
                           <span className={`w-1 bg-indigo-500 rounded-full h-full transition-all duration-300 ${isPlaying ? 'animate-pulse h-full' : 'h-1'}`}></span>
                           <span className={`w-1 bg-indigo-400 rounded-full h-full transition-all duration-300 delay-75 ${isPlaying ? 'animate-pulse h-full' : 'h-2'}`}></span>
                           <span className={`w-1 bg-indigo-500 rounded-full h-full transition-all duration-300 delay-150 ${isPlaying ? 'animate-pulse h-full' : 'h-1'}`}></span>
                        </div>
                        <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]">{padRef.current.name}</span>
                        {padRef.current.loopCount !== 1 && (
                          <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-500 flex items-center gap-1">
                             <i className="fas fa-redo"></i> {padRef.current.loopCount === 0 ? '∞' : `${playCountRef.current}/${padRef.current.loopCount}`}
                          </span>
                        )}
                     </>
                   ) : <span className="text-slate-400">Ready</span>}
                </div>
                <div className="text-slate-400 tabular-nums">
                   {currentPadId ? `${formatTime(progress)} / ${formatTime(duration || 0)}` : '--:--'}
                </div>
             </div>

             {/* Controls row */}
             <div className="flex items-center gap-4">
                 <button onClick={togglePlayPause} disabled={!currentPadId} className={`h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-white shadow-md transition-all ${currentPadId ? 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95' : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}>
                    <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} ${isPlaying ? '' : 'ml-0.5'} text-sm`}></i>
                 </button>
                 <button onClick={stopPlayback} disabled={!currentPadId} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${currentPadId ? 'bg-slate-200 dark:bg-slate-800 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 active:scale-95 text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`}>
                    <i className="fas fa-stop text-xs"></i>
                 </button>
                 <button 
                   onClick={() => {
                     if (!currentPad) return;
                     const newLoopCount = currentPad.loopCount === 0 ? 1 : 0;
                     setCategories(prev => prev.map(c => ({
                       ...c,
                       pads: c.pads.map(p => {
                         if (p.id === currentPad.id) {
                           const updatedPad = { ...p, 'loopCount': newLoopCount };
                           if (padRef.current?.id === p.id) {
                             padRef.current = updatedPad;
                           }
                           return updatedPad;
                         }
                         return p;
                       })
                     })));
                   }}
                   disabled={!currentPadId} 
                   className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${currentPadId ? (currentPad?.loopCount === 0 ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300') : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'}`}
                   title="Toggle Loop"
                 >
                    🔁
                 </button>

                 <div className="flex-1 flex flex-col group gap-1 justify-center relative cursor-text">
                    {/* Scrub Bar */}
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      step="0.1"
                      value={progress}
                      onChange={handleSeek}
                      disabled={!currentPadId}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                    />
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative pointer-events-none group-hover:h-3 transition-all duration-200">
                       <div 
                         className="absolute top-0 bottom-0 left-0 bg-indigo-500 transition-all duration-75"
                         style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                       ></div>
                    </div>
                 </div>

                 {/* Volume Control - Shortened and integrated */}
                 <div className="flex items-center gap-1 group relative w-20 flex-shrink-0">
                    <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} className="text-slate-400 hover:text-indigo-500 transition-colors w-5 text-center text-xs">
                       <i className={`fas ${volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up'}`}></i>
                    </button>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.01" 
                      value={volume} 
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all" 
                    />
                 </div>
             </div>
           </div>
        </div>
      </div>
    </WidgetWrapper>
  );
};
