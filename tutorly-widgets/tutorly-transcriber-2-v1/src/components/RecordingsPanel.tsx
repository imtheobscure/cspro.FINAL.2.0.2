import React, { useRef, useState } from 'react';
import { cn } from '../utils/cn';
import type { RecordingItem } from '../types';
import { formatFileSize } from '../hooks/useMediaRecorder';
import { X, Play, Pause, Download, Trash2, Video, Mic, Clock } from 'lucide-react';

interface RecordingsPanelProps {
  recordings: RecordingItem[];
  onDelete: (id: string) => void;
  onSave: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  isDark: boolean;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export const RecordingsPanel: React.FC<RecordingsPanelProps> = ({
  recordings,
  onDelete,
  onSave,
  onClear,
  onClose,
  isDark,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handlePlay = (item: RecordingItem) => {
    if (playingId === item.id) {
      // Stop
      if (item.hasVideo && videoRef.current) {
        videoRef.current.pause();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      // Play
      setPlayingId(item.id);
    }
  };

  const handleEnded = () => {
    setPlayingId(null);
  };

  const overlay = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const borderStyle = isDark ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className={cn('fixed right-0 top-0 bottom-0 w-[420px] max-w-full z-40 flex flex-col border-l shadow-2xl', overlay)}>
      {/* Header */}
      <div className={cn('flex items-center gap-3 px-4 py-3 border-b shrink-0', borderStyle)}>
        <Video size={18} className="text-red-500" />
        <h3 className={cn('font-bold text-base', isDark ? 'text-white' : 'text-slate-900')}>
          Recordings ({recordings.length})
        </h3>
        
        {recordings.length > 0 && (
          <button
            onClick={() => { if (window.confirm('Delete all recordings?')) onClear(); }}
            className={cn('text-xs px-2 py-1 rounded-lg', isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50')}
          >
            Clear All
          </button>
        )}
        
        <button
          onClick={onClose}
          className={cn('ml-auto p-2 rounded-xl transition-colors', isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500')}
        >
          <X size={18} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {recordings.length === 0 ? (
          <div className={cn('flex flex-col items-center justify-center h-full gap-3', isDark ? 'text-slate-600' : 'text-slate-400')}>
            <Video size={40} className="opacity-50" />
            <p className="text-sm">No recordings yet</p>
            <p className="text-xs">Press the record button or Alt+R to start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map(item => (
              <div
                key={item.id}
                className={cn(
                  'rounded-xl border p-3',
                  isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
                )}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  {item.hasVideo ? (
                    <Video size={14} className="text-purple-500" />
                  ) : (
                    <Mic size={14} className="text-blue-500" />
                  )}
                  <span className={cn('text-sm font-medium flex-1 truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>
                    {item.filename}
                  </span>
                  <span className={cn('text-xs uppercase px-1.5 py-0.5 rounded', isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600')}>
                    {item.format}
                  </span>
                </div>

                {/* Meta */}
                <div className={cn('flex items-center gap-3 text-xs mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDuration(item.duration)}
                  </span>
                  <span>{formatFileSize(item.size)}</span>
                  <span>{formatTime(item.timestamp)}</span>
                </div>

                {/* Player */}
                {playingId === item.id && (
                  <div className="mb-3">
                    {item.hasVideo ? (
                      <video
                        ref={videoRef}
                        src={item.url}
                        controls
                        autoPlay
                        onEnded={handleEnded}
                        className="w-full rounded-lg max-h-48"
                      />
                    ) : (
                      <audio
                        ref={audioRef}
                        src={item.url}
                        controls
                        autoPlay
                        onEnded={handleEnded}
                        className="w-full"
                      />
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlay(item)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      playingId === item.id
                        ? 'bg-red-600 text-white'
                        : isDark
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    )}
                  >
                    {playingId === item.id ? <Pause size={12} /> : <Play size={12} />}
                    {playingId === item.id ? 'Stop' : 'Play'}
                  </button>

                  <button
                    onClick={() => onSave(item.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isDark
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    )}
                  >
                    <Download size={12} />
                    Save
                  </button>

                  <button
                    onClick={() => onDelete(item.id)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors ml-auto',
                      isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                    )}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn('px-4 py-2 border-t text-xs', borderStyle, isDark ? 'text-slate-500' : 'text-slate-400')}>
        Total: {formatFileSize(recordings.reduce((a, r) => a + r.size, 0))} · Press Escape to close
      </div>
    </div>
  );
};
