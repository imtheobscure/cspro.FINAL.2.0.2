import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { parseSubtitles } from '../utils/subtitleParser';
import { DEMO_SUBTITLES } from '../demoLesson';

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function isYouTube(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function getYouTubeId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
  return match?.[1] ?? '';
}

interface SubtitleWordProps {
  word: string;
  onWordClick: (word: string) => void;
}

const SubtitleWord: React.FC<SubtitleWordProps> = ({ word, onWordClick }) => {
  const clean = word.replace(/[^a-zA-Z'-]/g, '');
  if (!clean) return <span>{word} </span>;
  return (
    <span
      className="cursor-pointer hover:text-yellow-300 hover:underline transition-colors px-0.5 rounded"
      onClick={() => onWordClick(clean)}
    >
      {word}{' '}
    </span>
  );
};

export const MediaPlayer: React.FC = () => {
  const {
    mediaUrl, setMediaUrl, mediaType, setMediaType,
    currentTime, setCurrentTime, duration, setDuration,
    isPlaying, setIsPlaying, volume, setVolume,
    playbackRate, setPlaybackRate, isMuted, setIsMuted,
    subtitles, setSubtitles, currentSubtitle, setCurrentSubtitle,
    lesson, appMode, setAppMode,
    setShowDictionary, setDictionaryWord,
    currentActivity, triggeredActivities, markTriggered,
    setPendingActivity, setShowCountdown,
    karaokeMode, setKaraokeMode,
    learner,
    whiteboardActive,
  } = useStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tooltipMarker, setTooltipMarker] = useState<string | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load demo subtitles on mount
  useEffect(() => {
    const cues = parseSubtitles(DEMO_SUBTITLES, 'demo.vtt');
    setSubtitles(cues);
  }, [setSubtitles]);

  // Sync video element
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) vid.play().catch(() => {});
    else vid.pause();
  }, [isPlaying]);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) vid.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      vid.volume = isMuted ? 0 : volume;
      vid.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Time update
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const handleTime = () => {
      setCurrentTime(vid.currentTime);
      // Update current subtitle
      const cue = subtitles.find(c => vid.currentTime >= c.startTime && vid.currentTime <= c.endTime);
      setCurrentSubtitle(cue ?? null);
      // Check for activity triggers
      if (!currentActivity && lesson) {
        for (const seg of lesson.segments) {
          for (const act of seg.activities) {
            if (!triggeredActivities.has(act.id) && !learner.completedActivities.includes(act.id)) {
              if (Math.abs(vid.currentTime - act.timestamp) < 0.8) {
                vid.pause();
                setIsPlaying(false);
                markTriggered(act.id);
                setPendingActivity(act);
                setShowCountdown(true);
                return;
              }
            }
          }
        }
      }
    };
    const handleLoaded = () => {
      setDuration(vid.duration);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    vid.addEventListener('timeupdate', handleTime);
    vid.addEventListener('loadedmetadata', handleLoaded);
    vid.addEventListener('play', handlePlay);
    vid.addEventListener('pause', handlePause);
    return () => {
      vid.removeEventListener('timeupdate', handleTime);
      vid.removeEventListener('loadedmetadata', handleLoaded);
      vid.removeEventListener('play', handlePlay);
      vid.removeEventListener('pause', handlePause);
    };
  }, [subtitles, currentActivity, lesson, triggeredActivities, learner.completedActivities, markTriggered, setPendingActivity, setCurrentSubtitle, setCurrentTime, setDuration, setIsPlaying, setShowCountdown]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (currentActivity) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      const vid = videoRef.current;
      if (!vid) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); setIsPlaying(!isPlaying); break;
        case 'ArrowLeft': vid.currentTime = Math.max(0, vid.currentTime - 5); break;
        case 'ArrowRight': vid.currentTime = Math.min(duration, vid.currentTime + 5); break;
        case 'ArrowUp': e.preventDefault(); setVolume(Math.min(1, volume + 0.1)); break;
        case 'ArrowDown': e.preventDefault(); setVolume(Math.max(0, volume - 0.1)); break;
        case 'KeyM': setIsMuted(!isMuted); break;
        case 'KeyF': toggleFullscreen(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying, volume, isMuted, duration, currentActivity, setIsPlaying, setIsMuted, setVolume, toggleFullscreen]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * duration;
    if (videoRef.current) videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'json') {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const json = JSON.parse(ev.target?.result as string);
            useStore.getState().setLesson(json);
            if (json.metadata?.videoUrl) {
              setMediaUrl(json.metadata.videoUrl);
              setMediaType('video');
            }
          } catch { alert('Invalid lesson JSON'); }
        };
        reader.readAsText(file);
      } else if (['mp4','webm','mov','avi','mkv'].includes(ext ?? '')) {
        const url = URL.createObjectURL(file);
        setMediaUrl(url);
        setMediaType('video');
      } else if (['mp3','wav','ogg','m4a'].includes(ext ?? '')) {
        const url = URL.createObjectURL(file);
        setMediaUrl(url);
        setMediaType('audio');
      } else if (['vtt','srt'].includes(ext ?? '')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const cues = parseSubtitles(ev.target?.result as string, file.name);
          setSubtitles(cues);
        };
        reader.readAsText(file);
      }
    }
  }, [setMediaUrl, setMediaType, setSubtitles]);

  const handleUrlLoad = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    if (isYouTube(url)) {
      setMediaType('youtube');
    } else {
      setMediaType('video');
    }
    setMediaUrl(url);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleWordClick = (word: string) => {
    setDictionaryWord(word);
    setShowDictionary(true);
  };

  // Get all timeline markers
  const markers = lesson?.segments.flatMap(seg =>
    seg.activities.map(act => ({
      id: act.id,
      time: act.timestamp,
      type: act.type,
      color: act.color,
      completed: learner.completedActivities.includes(act.id),
      label: act.title || act.type,
    }))
  ) ?? [];

  const colorMap: Record<string, string> = {
    gold: '#ffd700',
    teal: '#14b8a6',
    purple: '#a855f7',
    orange: '#f97316',
    green: '#22c55e',
    pink: '#ec4899',
    blue: '#3b82f6',
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black rounded-xl overflow-hidden select-none ${dragOver ? 'ring-4 ring-yellow-400' : ''}`}
      style={{ aspectRatio: '16/9', maxHeight: '56vw' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 border-4 border-dashed border-yellow-400 rounded-xl"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📂</div>
              <p className="text-2xl font-bold text-yellow-400">Drop file here!</p>
              <p className="text-gray-300">Video, Audio, Subtitles (VTT/SRT), or Lesson (JSON)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media */}
      {mediaType === 'youtube' ? (
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${getYouTubeId(mediaUrl)}?enablejsapi=1&autoplay=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : mediaType === 'audio' ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <div className="text-center">
            <motion.div className="text-8xl mb-4" animate={{ scale: isPlaying ? [1, 1.1, 1] : 1 }} transition={{ duration: 1, repeat: Infinity }}>🎵</motion.div>
            <p className="text-white text-xl font-bold">{lesson?.metadata.title ?? 'Audio Lesson'}</p>
            <audio ref={videoRef as React.RefObject<HTMLAudioElement>} src={mediaUrl} />
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={mediaUrl}
          onClick={() => !whiteboardActive && setIsPlaying(!isPlaying)}
        />
      )}

      {/* Subtitle display */}
      <AnimatePresence>
        {currentSubtitle && !currentActivity && (
          <motion.div
            key={currentSubtitle.id}
            className="absolute bottom-20 left-0 right-0 flex justify-center px-8 z-20 pointer-events-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="bg-black/80 backdrop-blur-sm text-white text-base md:text-xl font-semibold px-6 py-3 rounded-2xl max-w-3xl text-center leading-relaxed shadow-2xl pointer-events-auto"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
            >
              {currentSubtitle.text.split(' ').map((word, i) => (
                <SubtitleWord key={i} word={word} onWordClick={handleWordClick} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-30"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {/* Timeline with markers */}
            <div className="px-4 pb-1 relative">
              {/* Marker tooltips */}
              <div className="relative h-6 mb-1">
                {duration > 0 && markers.map(m => (
                  <div
                    key={m.id}
                    className="absolute top-0 bottom-0 flex items-center justify-center"
                    style={{ left: `${(m.time / duration) * 100}%`, transform: 'translateX(-50%)' }}
                    onMouseEnter={() => setTooltipMarker(m.id)}
                    onMouseLeave={() => setTooltipMarker(null)}
                  >
                    <AnimatePresence>
                      {tooltipMarker === m.id && (
                        <motion.div
                          className="absolute bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 border border-gray-700 shadow-xl"
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        >
                          {m.label} · {formatTime(m.time)}
                          {m.completed && <span className="ml-1 text-green-400">✓</span>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.button
                      className="w-3 h-3 rounded-full border-2 border-black cursor-pointer flex-shrink-0"
                      style={{ backgroundColor: m.completed ? '#22c55e' : colorMap[m.color] ?? '#ffd700' }}
                      animate={!m.completed ? { scale: [1, 1.3, 1], boxShadow: [`0 0 4px ${colorMap[m.color]}`, `0 0 10px ${colorMap[m.color]}`, `0 0 4px ${colorMap[m.color]}`] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = m.time;
                        setCurrentTime(m.time);
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div
                ref={progressRef}
                className="h-1.5 bg-white/20 rounded-full cursor-pointer relative group"
                onClick={handleProgressClick}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #ffd700, #ff6b35)' }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
                />
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-2 md:gap-3 px-4 pb-3 pt-1">
              {/* Play/Pause */}
              <button
                className="text-white hover:text-yellow-400 transition-colors text-xl w-8 h-8 flex items-center justify-center"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Skip back/forward */}
              <button className="text-white/70 hover:text-white text-sm" onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 10;
              }}>⏮10</button>
              <button className="text-white/70 hover:text-white text-sm" onClick={() => {
                if (videoRef.current) videoRef.current.currentTime += 10;
              }}>10⏭</button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group">
                <button
                  className="text-white/80 hover:text-white text-lg transition-colors"
                  onClick={() => setIsMuted(!isMuted)}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume}
                  onChange={e => { setVolume(+e.target.value); setIsMuted(+e.target.value === 0); }}
                  className="w-16 md:w-20 accent-yellow-400 cursor-pointer"
                />
              </div>

              {/* Time */}
              <span className="text-white/70 text-xs md:text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex-1" />

              {/* Mode toggle */}
              <div className="flex bg-white/10 rounded-lg overflow-hidden text-xs">
                <button
                  onClick={() => setAppMode('subtitle')}
                  className={`px-2 py-1.5 transition-colors font-semibold ${appMode === 'subtitle' ? 'bg-yellow-500 text-black' : 'text-white hover:text-yellow-400'}`}
                >
                  SUB
                </button>
                <button
                  onClick={() => setAppMode('transcript')}
                  className={`px-2 py-1.5 transition-colors font-semibold ${appMode === 'transcript' ? 'bg-yellow-500 text-black' : 'text-white hover:text-yellow-400'}`}
                >
                  TRX
                </button>
              </div>

              {/* Karaoke */}
              <button
                onClick={() => setKaraokeMode(!karaokeMode)}
                className={`text-sm font-bold px-2 py-1.5 rounded-lg transition-colors ${karaokeMode ? 'bg-purple-500 text-white' : 'text-white/70 hover:text-purple-400'}`}
                title="Karaoke Mode"
              >
                🎤
              </button>

              {/* Speed */}
              <select
                value={playbackRate}
                onChange={e => setPlaybackRate(+e.target.value)}
                className="bg-transparent text-white text-xs border border-white/20 rounded px-1 py-1 cursor-pointer"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                  <option key={r} value={r} className="bg-gray-900">{r}x</option>
                ))}
              </select>

              {/* Open URL */}
              <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-white/70 hover:text-white text-sm px-2 py-1 rounded border border-white/20 transition-colors"
                title="Open URL or file"
              >
                🔗
              </button>

              {/* Fullscreen */}
              <button
                className="text-white/70 hover:text-white text-lg transition-colors"
                onClick={toggleFullscreen}
                aria-label="Fullscreen"
              >
                ⛶
              </button>
            </div>

            {/* URL input panel */}
            <AnimatePresence>
              {showUrlInput && (
                <motion.div
                  className="px-4 pb-3 flex gap-2"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                >
                  <input
                    type="text"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="Paste video URL or YouTube link..."
                    className="flex-1 bg-gray-800/90 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-yellow-500"
                    onKeyDown={e => e.key === 'Enter' && handleUrlLoad()}
                  />
                  <button onClick={handleUrlLoad} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors">
                    Load
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play button overlay when paused */}
      <AnimatePresence>
        {!isPlaying && !currentActivity && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-black/40 backdrop-blur-sm border border-white/20"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ▶
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isDragging && <div className="absolute inset-0 z-10" onMouseUp={() => setIsDragging(false)} />}
    </div>
  );
};
