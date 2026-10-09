import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '../utils/cn';
import type { TranscriptEntry, SpeakerConfig, SpeakerRole, AppSettings, SessionProfile } from '../types';
import { exportAsTxt, exportAsCsv, copyToClipboard } from '../utils/export';
import { getSessions, loadSessionTranscript, deleteSession, switchSession, getActiveSessionIdSync } from '../utils/storage';
import {
  X, Download, Copy, Trash2, Filter, Search,
  FileText, Table, ChevronDown, BarChart2, Users, FolderOpen, Clock,
} from 'lucide-react';

interface TranscriptHistoryProps {
  entries: TranscriptEntry[];
  speakers: SpeakerConfig[];
  settings: AppSettings;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onClear: () => void;
  onSessionSwitch?: () => void; // reload in-memory transcript after switch
}

export const TranscriptHistory: React.FC<TranscriptHistoryProps> = ({
  entries: currentEntries,
  speakers,
  settings,
  onClose,
  onDelete: _onDelete,
  onEdit: _onEdit,
  onClear,
  onSessionSwitch,
}) => {
  const [filter, setFilter] = useState<SpeakerRole | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [sessions, setSessions] = useState<SessionProfile[]>([]);
  const [viewingSessionId, setViewingSessionId] = useState<string>(getActiveSessionIdSync());
  const [oldSessionEntries, setOldSessionEntries] = useState<TranscriptEntry[] | null>(null);
  const [loadingOld, setLoadingOld] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const isDark = settings.theme === 'dark';

  const isViewingCurrent = viewingSessionId === getActiveSessionIdSync();
  const entries = isViewingCurrent ? currentEntries : (oldSessionEntries ?? []);

  // Load sessions list
  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  // Load old session entries when switching
  useEffect(() => {
    if (isViewingCurrent) {
      setOldSessionEntries(null);
      return;
    }
    setLoadingOld(true);
    loadSessionTranscript(viewingSessionId).then(e => {
      setOldSessionEntries(e);
      setLoadingOld(false);
    });
  }, [viewingSessionId, isViewingCurrent]);

  const speakerMap = useMemo(() => Object.fromEntries(speakers.map(s => [s.role, s])), [speakers]);

  const filtered = useMemo(() => entries.filter(e => {
    if (filter !== 'all' && e.speaker !== filter) return false;
    if (search) return e.text.toLowerCase().includes(search.toLowerCase());
    return true;
  }), [entries, filter, search]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [entries.length, viewingSessionId]);

  const handleCopy = async () => {
    try { await copyToClipboard(filtered, speakers); setCopyDone(true); setTimeout(() => setCopyDone(false), 2000); } catch {}
  };

  const stats = useMemo(() => speakers.map(s => ({
    role: s.role, label: s.label,
    color: s.role === 'tutor' ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600'),
    count: entries.filter(e => e.speaker === s.role).length,
    words: entries.filter(e => e.speaker === s.role).reduce((a, e) => a + e.text.split(/\s+/).filter(Boolean).length, 0),
  })), [entries, speakers, isDark]);

  const totalWords = useMemo(() => entries.reduce((a, e) => a + e.text.split(/\s+/).filter(Boolean).length, 0), [entries]);

  const handleDeleteSession = async (sid: string) => {
    if (!window.confirm('Delete this session and all its transcript data?')) return;
    await deleteSession(sid);
    setSessions(await getSessions());
    if (viewingSessionId === sid) setViewingSessionId(getActiveSessionIdSync());
  };

  const handleSwitchToSession = async (sid: string) => {
    await switchSession(sid);
    onSessionSwitch?.();
    onClose();
  };

  const overlay = isDark ? 'bg-slate-950/95 text-white' : 'bg-white/98 text-slate-900';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputStyle = isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-900';
  const currentSessionProfile = sessions.find(s => s.id === viewingSessionId);

  return (
    <div className={cn('fixed inset-0 z-40 flex', overlay)} role="dialog">
      {/* ── Session sidebar ── */}
      <div className={cn('w-56 shrink-0 border-r flex flex-col', isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200')}>
        <div className={cn('px-3 py-3 border-b text-xs font-bold uppercase tracking-wider flex items-center gap-2', border, isDark ? 'text-slate-400' : 'text-slate-500')}>
          <FolderOpen size={14} /> Sessions
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <div className={cn('p-3 text-xs', isDark ? 'text-slate-600' : 'text-slate-400')}>No sessions yet</div>
          )}
          {sessions.slice().reverse().map(sess => {
            const isCurrent = sess.id === getActiveSessionIdSync();
            const isViewing = sess.id === viewingSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => setViewingSessionId(sess.id)}
                className={cn(
                  'px-3 py-2 border-b cursor-pointer transition-colors',
                  border,
                  isViewing
                    ? (isDark ? 'bg-indigo-900/40' : 'bg-indigo-50')
                    : (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-sm font-medium truncate flex-1', isDark ? 'text-slate-200' : 'text-slate-800')}>
                    {sess.learnerName}
                  </span>
                  {isCurrent && <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-600 text-white">LIVE</span>}
                </div>
                <div className={cn('text-[11px] mt-0.5 flex items-center gap-2', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  <Clock size={10} />
                  {new Date(sess.createdAt).toLocaleDateString()}
                  <span>· {sess.entryCount} entries</span>
                </div>
                <div className="flex gap-1 mt-1">
                  {!isCurrent && (
                    <button
                      onClick={e => { e.stopPropagation(); handleSwitchToSession(sess.id); }}
                      className={cn('text-[10px] px-1.5 py-0.5 rounded', isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')}
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteSession(sess.id); }}
                    className={cn('text-[10px] px-1.5 py-0.5 rounded', isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main transcript area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className={cn('flex items-center gap-3 px-4 py-3 border-b shrink-0 flex-wrap', border)}>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Users size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            {currentSessionProfile?.learnerName ?? 'Transcript'}
            <span className={cn('text-sm font-normal', isDark ? 'text-slate-500' : 'text-slate-400')}>({entries.length})</span>
            {!isViewingCurrent && <span className="text-xs px-2 py-0.5 rounded bg-amber-600 text-white">Past session</span>}
          </h2>

          <div className="flex items-center gap-1.5 ml-2">
            {(['all', 'tutor', 'learner'] as const).map(f => {
              const sp = f !== 'all' ? speakerMap[f] : null;
              const label = sp ? sp.label : 'All';
              const count = f === 'all' ? entries.length : entries.filter(e => e.speaker === f).length;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                    filter === f
                      ? f === 'tutor' ? 'bg-indigo-600 text-white' : f === 'learner' ? 'bg-emerald-600 text-white' : (isDark ? 'bg-slate-600 text-white' : 'bg-slate-700 text-white')
                      : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'))}>
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 max-w-xs ml-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className={cn('w-full pl-8 pr-3 py-1.5 rounded-lg border text-sm outline-none', inputStyle)} />
          </div>

          <button onClick={() => setShowStats(!showStats)}
            className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs',
              showStats ? 'bg-indigo-600 text-white' : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'))}>
            <BarChart2 size={12} /> Stats
          </button>

          <div className="relative">
            <button onClick={() => setShowExport(!showExport)}
              className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs', isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')}>
              <Download size={12} /> Export <ChevronDown size={10} />
            </button>
            {showExport && (
              <div className={cn('absolute right-0 top-full mt-1 rounded-lg shadow-xl border z-50 min-w-[160px]', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}>
                <button onClick={() => { handleCopy(); setShowExport(false); }} className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm', isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50')}>
                  <Copy size={12} /> {copyDone ? '✓ Copied!' : 'Copy'}
                </button>
                <button onClick={() => { exportAsTxt(filtered, speakers); setShowExport(false); }} className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm', isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50')}>
                  <FileText size={12} /> .txt
                </button>
                <button onClick={() => { exportAsCsv(filtered, speakers); setShowExport(false); }} className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm', isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50')}>
                  <Table size={12} /> .csv
                </button>
                {isViewingCurrent && (<>
                  <div className={cn('border-t', border)} />
                  <button onClick={() => { if (window.confirm('Clear current session?')) { onClear(); setShowExport(false); }}} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                    <Trash2 size={12} /> Clear
                  </button>
                </>)}
              </div>
            )}
          </div>

          <button onClick={onClose} className={cn('p-1.5 rounded-lg ml-auto', isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500')}>
            <X size={18} />
          </button>
        </div>

        {showStats && (
          <div className={cn('px-4 py-2 border-b flex gap-4 flex-wrap text-sm', border)}>
            {stats.map(s => (
              <div key={s.role}>
                <span className={cn('text-xs font-semibold uppercase', s.color)}>{s.label}</span>
                <span className={cn('ml-2', isDark ? 'text-white' : 'text-slate-900')}>{s.count} entries · {s.words} words</span>
              </div>
            ))}
            <span className="ml-auto">{totalWords} total words</span>
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
          {loadingOld && <div className={cn('text-center py-8 text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>Loading session…</div>}

          {!loadingOld && filtered.length === 0 ? (
            <div className={cn('flex flex-col items-center justify-center py-16 gap-2', isDark ? 'text-slate-500' : 'text-slate-400')}>
              <Filter size={32} className="opacity-50" />
              <p className="text-sm">{search ? 'No matches' : 'No entries in this session'}</p>
            </div>
          ) : (
            !loadingOld && (
              <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed select-text">
                {filtered.map(entry => {
                  const sp = speakerMap[entry.speaker];
                  if (!sp) return null;
                  const time = new Date(entry.timestamp).toLocaleTimeString();
                  return `[${time}] ${sp.label}: ${entry.text}\n\n`;
                })}
              </div>
            )
          )}
        </div>

        <div className={cn('px-4 py-1.5 border-t text-xs flex items-center gap-2', border, isDark ? 'text-slate-500' : 'text-slate-400')}>
          {filtered.length} entries · Escape to close
        </div>
      </div>
    </div>
  );
};
