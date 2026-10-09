import React, { useState, useEffect } from 'react';
import { ActivityDef } from './types';
import { SFX, exportToHTML } from './utils';

// ============================================================
// TOOLTIP COMPONENT
// ============================================================
export const Tooltip: React.FC<{ text: string; hotkey?: string; children: React.ReactNode }> = ({ text, hotkey, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-[100] shadow-xl pointer-events-none">
          {text}{hotkey && <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{hotkey}</span>}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

// ============================================================
// MODAL COMPONENT
// ============================================================
export const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; icon?: string; color?: string; wide?: boolean; children: React.ReactNode }> = ({ open, onClose, title, icon, color = '#6366f1', wide, children }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] ${wide ? 'w-full max-w-6xl' : 'w-full max-w-2xl'} overflow-hidden`} onClick={e => e.stopPropagation()} style={{ animation: 'modalIn 0.3s ease-out' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)` }}>
          <div className="flex items-center gap-3">
            {icon && <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: color }}><i className={`fas ${icon}`} /></div>}
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"><i className="fas fa-times" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

// ============================================================
// AI IMPORT PANEL (Reused by all activities)
// ============================================================
export const AIImportPanel: React.FC<{ activity: ActivityDef; onImport: (data: Record<string, unknown>) => void }> = ({ activity, onImport }) => {
  const [json, setJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const copyPrompt = () => {
    navigator.clipboard.writeText(activity.aiPrompt).then(() => { setCopied(true); SFX.success(); setTimeout(() => setCopied(false), 2000); });
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(json);
      setError('');
      SFX.success();
      onImport(data);
    } catch {
      setError('Invalid JSON. Please check the format and try again.');
      SFX.error();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-magic text-indigo-500" />
          <h3 className="font-bold text-indigo-900">Step 1: Copy AI Prompt</h3>
        </div>
        <pre className="bg-white rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap border max-h-40 overflow-y-auto font-mono">{activity.aiPrompt}</pre>
        <button onClick={copyPrompt} className={`mt-3 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${copied ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-2`} />{copied ? 'Copied!' : 'Copy Prompt'}
        </button>
      </div>
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-paste text-green-600" />
          <h3 className="font-bold text-green-900">Step 2: Paste JSON Response</h3>
        </div>
        <textarea
          className="w-full h-32 p-4 border border-green-200 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-green-300 focus:border-green-300 transition-all"
          placeholder="Paste the JSON response from your AI chatbot here..."
          value={json}
          onChange={e => setJson(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm mt-1"><i className="fas fa-exclamation-triangle mr-1" />{error}</p>}
        <button onClick={handleImport} disabled={!json.trim()} className="mt-3 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <i className="fas fa-check-circle mr-2" />Import & Launch Activity
        </button>
      </div>
    </div>
  );
};

// ============================================================
// ACTIVITY WRAPPER (handles tabs: Activity / AI Import / Export)
// ============================================================
export const ActivityWrapper: React.FC<{
  activity: ActivityDef;
  data: Record<string, unknown> | null;
  onImport: (d: Record<string, unknown>) => void;
  onClose: () => void;
  children: React.ReactNode;
  exportHTML?: () => string;
}> = ({ activity, data, onImport, onClose, children, exportHTML }) => {
  const [tab, setTab] = useState<'activity' | 'import'>(data ? 'activity' : 'import');
  const handleExport = () => {
    if (exportHTML) {
      exportToHTML(activity.name + ' - Tutor Academy', exportHTML());
      SFX.success();
    }
  };
  return (
    <Modal open title={activity.name} icon={activity.icon} color={activity.color} onClose={onClose} wide>
      <div className="flex items-center gap-2 mb-5 border-b pb-3">
        <button onClick={() => setTab('activity')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'activity' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
          <i className="fas fa-play mr-2" />Activity
        </button>
        <button onClick={() => setTab('import')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'import' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}>
          <i className="fas fa-magic mr-2" />AI Import
        </button>
        {exportHTML && data && (
          <button onClick={handleExport} className="ml-auto px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all">
            <i className="fas fa-download mr-2" />Export HTML
          </button>
        )}
      </div>
      {tab === 'import' ? <AIImportPanel activity={activity} onImport={d => { onImport(d); setTab('activity'); }} /> : (
        data ? children : (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: activity.color + '15', color: activity.color }}>
              <i className={`fas ${activity.icon}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Data Loaded</h3>
            <p className="text-gray-500 mb-6">Import content using the AI Import tab to get started.</p>
            <button onClick={() => setTab('import')} className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105" style={{ background: activity.color }}>
              <i className="fas fa-magic mr-2" />Go to AI Import
            </button>
          </div>
        )
      )}
    </Modal>
  );
};
