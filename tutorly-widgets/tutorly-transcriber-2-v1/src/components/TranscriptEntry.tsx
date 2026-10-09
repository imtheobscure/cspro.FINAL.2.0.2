import React, { useState } from 'react';
import { cn } from '../utils/cn';
import type { TranscriptEntry as TEntry, SpeakerConfig, GrammarSuggestion } from '../types';
import { analyzeText, renderAnnotatedText } from '../utils/grammar';
import { Pencil, Trash2, Check, X, Copy } from 'lucide-react';

interface TranscriptEntryProps {
  entry: TEntry;
  speaker: SpeakerConfig;
  isDark: boolean;
  fontSize: number;
  autoCorrect: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export const TranscriptEntryComponent: React.FC<TranscriptEntryProps> = ({
  entry,
  speaker,
  isDark,
  fontSize,
  autoCorrect,
  onDelete,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const [tooltip, setTooltip] = useState<{ visible: boolean; sug: GrammarSuggestion | null; x: number; y: number }>({
    visible: false, sug: null, x: 0, y: 0,
  });
  const [copied, setCopied] = useState(false);

  const suggestions = autoCorrect && !isEditing ? analyzeText(entry.text) : [];
  const parts = renderAnnotatedText(entry.text, suggestions);

  const isTutor = speaker.role === 'tutor';

  const bubbleBg = isTutor
    ? isDark ? 'bg-indigo-800/60' : 'bg-indigo-100'
    : isDark ? 'bg-emerald-800/60' : 'bg-emerald-100';

  const borderColor = isTutor
    ? isDark ? 'border-indigo-600' : 'border-indigo-300'
    : isDark ? 'border-emerald-600' : 'border-emerald-300';

  const labelColor = isTutor
    ? isDark ? 'text-indigo-300' : 'text-indigo-700'
    : isDark ? 'text-emerald-300' : 'text-emerald-700';

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const timeColor = isDark ? 'text-slate-500' : 'text-slate-400';

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleSave = () => {
    if (editText.trim()) {
      onEdit(entry.id, editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={cn('group flex flex-col gap-1 mb-3', isTutor ? 'items-start' : 'items-end')}>
      {/* Speaker label & time */}
      <div className={cn('flex items-center gap-2 px-1', isTutor ? 'flex-row' : 'flex-row-reverse')}>
        <span className={cn('text-xs font-semibold uppercase tracking-wider', labelColor)}>
          {speaker.label}
        </span>
        <span className={cn('text-xs', timeColor)}>
          {formatTime(entry.timestamp)}
        </span>
      </div>

      {/* Bubble */}
      <div className={cn(
        'relative max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm',
        bubbleBg, borderColor,
        isTutor ? 'rounded-tl-sm' : 'rounded-tr-sm'
      )}>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              className={cn(
                'w-full rounded-lg border px-3 py-2 resize-none outline-none focus:ring-2',
                isDark
                  ? 'bg-slate-700 border-slate-500 text-white focus:ring-indigo-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:ring-indigo-400'
              )}
              rows={3}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
                if (e.key === 'Escape') { setIsEditing(false); setEditText(entry.text); }
              }}
              autoFocus
              style={{ fontSize: Math.min(fontSize, 18) }}
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">
                <Check size={12} /> Save
              </button>
              <button onClick={() => { setIsEditing(false); setEditText(entry.text); }}
                className="flex items-center gap-1 px-3 py-1 bg-slate-500 hover:bg-slate-600 text-white text-xs rounded-lg">
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className={cn('leading-relaxed whitespace-pre-wrap break-words', textColor)}
            style={{ fontSize: Math.min(fontSize, 22) }}
          >
            {parts.map((part, i) =>
              part.isError && part.suggestion ? (
                <span
                  key={i}
                  className={cn(
                    'relative cursor-help',
                    part.suggestion.type === 'spelling'
                      ? 'underline decoration-red-400 decoration-wavy'
                      : 'underline decoration-amber-400 decoration-wavy'
                  )}
                  onMouseEnter={e => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({ visible: true, sug: part.suggestion!, x: rect.left, y: rect.bottom + 6 });
                  }}
                  onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                >
                  {part.text}
                </span>
              ) : (
                <span key={i}>{part.text}</span>
              )
            )}
          </p>
        )}
      </div>

      {/* Actions – appear on hover */}
      {!isEditing && (
        <div className={cn(
          'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1',
          isTutor ? 'flex-row' : 'flex-row-reverse'
        )}>
          <button
            onClick={handleCopy}
            className={cn('p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors',
              isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
            )}
            title="Copy"
          >
            <Copy size={12} />
            {copied ? 'Copied!' : ''}
          </button>
          <button
            onClick={() => { setIsEditing(true); setEditText(entry.text); }}
            className={cn('p-1.5 rounded-lg transition-colors',
              isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
            )}
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className={cn('p-1.5 rounded-lg transition-colors',
              isDark ? 'hover:bg-red-900/50 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'
            )}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Grammar tooltip */}
      {tooltip.visible && tooltip.sug && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-xl shadow-2xl px-3 py-2.5 max-w-xs pointer-events-none border border-slate-700"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold mb-1.5 flex items-center gap-1.5">
            {tooltip.sug.type === 'spelling' ? '🔤' : '📝'}
            <span className="capitalize">{tooltip.sug.type}</span> issue
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-300 line-through">"{tooltip.sug.original}"</span>
            <span className="text-slate-400">→</span>
            <span className="text-green-300">"{tooltip.sug.suggestion}"</span>
          </div>
        </div>
      )}
    </div>
  );
};
